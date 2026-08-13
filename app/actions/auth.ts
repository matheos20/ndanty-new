'use server'

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "crypto";
import { saveBase64Image } from "@/lib/uploads";
import { validatePassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { resend } from "@/lib/resend";
import { PasswordResetEmail } from "@/emails/PasswordResetEmail";
import type { ReactElement } from "react";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure

function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

export async function registerUser(formData: any) {
    try {
        const { firstName, lastName, email, password, confirmPassword, country, address, image } = formData;

        // 1. Validation des champs vides
        if (!firstName || !lastName || !email || !password) {
            return { error: "Veuillez remplir tous les champs obligatoires." };
        }

        // 2. Correspondance des mots de passe (confirmPassword optionnel selon le formulaire)
        if (confirmPassword !== undefined && password !== confirmPassword) {
            return { error: "Les mots de passe ne sont pas identiques." };
        }

        // 3. Politique de mot de passe (min 8 caractères, lettre + chiffre)
        const pwCheck = validatePassword(password);
        if (!pwCheck.ok) {
            return { error: pwCheck.error };
        }

        // 4. Format d'email + normalisation (minuscules, sans espaces)
        const normalizedEmail = String(email).trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return { error: "Le format de l'adresse email est invalide." };
        }

        // 5. Vérification si l'utilisateur existe déjà
        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        });

        if (existingUser) {
            return { error: "Cette adresse email est déjà enregistrée chez Ndanty." };
        }

        // 5. Image de profil : si le client envoie du base64, on l'écrit sur disque
        //    (URL en base) au lieu de stocker le base64 dans MySQL.
        let imageUrl: string | null = null;
        if (typeof image === "string" && image.startsWith("data:")) {
            imageUrl = await saveBase64Image(image, "avatars");
        } else if (typeof image === "string" && image.startsWith("/uploads/")) {
            imageUrl = image;
        }

        // 6. Cryptage et Création
        const hashedPassword = await bcrypt.hash(password, 12);
        await prisma.user.create({
            data: {
                firstName,
                lastName,
                email: normalizedEmail,
                password: hashedPassword,
                country,
                address,
                image: imageUrl,
                role: "USER"
            }
        });

        return { success: "Votre compte a été créé avec succès !" };
    } catch (error) {
        return { error: "Une erreur technique est survenue. Veuillez réessayer." };
    }
}

/**
 * ÉTAPE 1 — Demande de réinitialisation : génère un jeton, l'enregistre (haché) et envoie l'email.
 * Anti-énumération : renvoie TOUJOURS le même message, que l'email existe ou non.
 * En développement, renvoie aussi le lien (devLink) pour tester sans serveur mail.
 */
type ResetRequestResult =
    | { success: true; message: string; devLink?: string }
    | { success: false; error: string };

export async function requestPasswordReset(email: string): Promise<ResetRequestResult> {
    const genericSuccess: { success: true; message: string; devLink?: string } = {
        success: true,
        message: "Si un compte est associé à cette adresse, un lien de réinitialisation vient d'être envoyé.",
    };

    try {
        const normalizedEmail = String(email || "").trim().toLowerCase();
        if (!normalizedEmail) {
            return { success: false, error: "Veuillez saisir votre adresse email." };
        }

        // Anti-abus : 5 demandes max / 15 min pour une même adresse.
        const limit = rateLimit(`reset:${normalizedEmail}`, { name: "password-reset", limit: 5, windowMs: 15 * 60 * 1000 });
        if (!limit.ok) {
            return { success: false, error: "Trop de demandes. Réessayez dans quelques minutes." };
        }

        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        // On ne révèle pas si l'email existe : on ne génère un jeton que s'il existe,
        // mais la réponse reste identique dans tous les cas.
        if (user) {
            const rawToken = randomBytes(32).toString("hex");
            const tokenHash = hashToken(rawToken);
            await prisma.user.update({
                where: { id: user.id },
                data: { resetToken: tokenHash, resetTokenExpiry: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
            });

            const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3001").replace(/\/$/, "");
            const resetUrl = `${baseUrl}/reinitialiser/${rawToken}`;

            // Envoi email (non bloquant : n'échoue pas la demande si le mail ne part pas).
            try {
                await resend.emails.send({
                    from: "Ndanty <onboarding@resend.dev>",
                    to: normalizedEmail,
                    subject: "Réinitialisation de votre mot de passe - Ndanty",
                    react: PasswordResetEmail({
                        customerName: user.firstName || undefined,
                        resetUrl,
                        expiresInMinutes: 60,
                    }) as ReactElement,
                });
            } catch (mailError) {
                console.error("Erreur d'envoi de l'email de réinitialisation :", mailError);
            }

            // En dev (pas de vrai serveur mail), on renvoie le lien pour pouvoir tester.
            if (process.env.NODE_ENV !== "production") {
                genericSuccess.devLink = resetUrl;
            }
        }

        return genericSuccess;
    } catch (error) {
        console.error("Erreur requestPasswordReset :", error);
        // Même en cas d'erreur interne, on renvoie le message générique (anti-énumération).
        return genericSuccess;
    }
}

/** Vérifie qu'un jeton de réinitialisation est valide et non expiré (pour l'affichage de la page). */
export async function verifyResetToken(token: string): Promise<{ valid: boolean }> {
    try {
        if (!token) return { valid: false };
        const tokenHash = hashToken(token);
        const user = await prisma.user.findFirst({
            where: { resetToken: tokenHash, resetTokenExpiry: { gt: new Date() } },
            select: { id: true },
        });
        return { valid: !!user };
    } catch {
        return { valid: false };
    }
}

/**
 * ÉTAPE 2 — Réinitialisation effective : valide le jeton + la politique, met à jour le mot de passe haché.
 */
export async function resetPassword(token: string, newPassword: string, confirmPassword?: string) {
    try {
        if (!token) return { success: false, error: "Lien invalide ou expiré." };

        if (confirmPassword !== undefined && newPassword !== confirmPassword) {
            return { success: false, error: "Les mots de passe ne sont pas identiques." };
        }

        const pwCheck = validatePassword(newPassword);
        if (!pwCheck.ok) {
            return { success: false, error: pwCheck.error };
        }

        const tokenHash = hashToken(token);
        const user = await prisma.user.findFirst({
            where: { resetToken: tokenHash, resetTokenExpiry: { gt: new Date() } },
        });
        if (!user) {
            return { success: false, error: "Ce lien de réinitialisation est invalide ou a expiré. Refaites une demande." };
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword, resetToken: null, resetTokenExpiry: null },
        });

        return { success: true, message: "Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter." };
    } catch (error) {
        console.error("Erreur resetPassword :", error);
        return { success: false, error: "Une erreur est survenue. Réessayez." };
    }
}