'use server'

import type { ReactElement } from "react";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resend } from "@/lib/resend";
import { ClientQuoteEmail } from "@/emails/ClientQuoteEmail";
import { AdminEmail } from "@/emails/AdminQuoteEmail";
import { ensureAdmin } from "@/lib/guards";
import { saveUploadedImage } from "@/lib/uploads";

/**
 * ACTION : Créer un devis avec notifications Email
 */
export async function createQuote(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const details = formData.get('details') as string;
    const dimensions = formData.get('dimensions') as string;

    const imageFile = formData.get('image') as File | null;
    let imageUrl: string | null = null;

    if (imageFile && imageFile.size > 0 && imageFile.name !== 'undefined') {
        // On enregistre l'image sur le disque (et non en base64 dans MySQL) :
        // évite le dépassement de max_allowed_packet et allège fortement la base.
        const saved = await saveUploadedImage(imageFile, 'quotes');
        if (saved.error) return { success: false, error: saved.error };
        imageUrl = saved.url ?? null;
    }

    try {
        // 1. Création en base de données
        const newQuote = await prisma.quote.create({
            data: {
                customerName: name,
                email: email,
                phone: phone,
                details: details,
                dimensions: dimensions,
                status: "EN_ATTENTE",
                imageUrl: imageUrl,
            },
        });

        // 2. Envoi des Emails si la création a réussi
        if (newQuote) {
            try {
                // Email au Client
                await resend.emails.send({
                    from: 'Ndanty <onboarding@resend.dev>',
                    to: email,
                    subject: 'Confirmation de votre demande - Ndanty',
                    react: ClientQuoteEmail({ customerName: name }) as ReactElement,
                });

                // Email à l'Admin (Vous)
                const adminDest = process.env.ADMIN_EMAIL || "votre-email@exemple.com";
                await resend.emails.send({
                    from: 'Système Ndanty <onboarding@resend.dev>',
                    to: adminDest,
                    subject: '🚨 Nouveau Devis à traiter !',
                    react: AdminEmail({
                        customerName: name,
                        email: email,
                        details: details
                    }) as ReactElement,
                });
            } catch (mailError) {
                // On log l'erreur mail mais on ne bloque pas le succès de la DB
                console.error("Erreur d'envoi d'email :", mailError);
            }
        }

        revalidatePath('/admin');
        revalidatePath('/admin/quotes');

        return { success: true };
    } catch (error: any) {
        console.error("Erreur Prisma détaillée :", error.message);
        return { success: false, error: "Impossible de créer le devis." };
    }
}

/**
 * ACTION : Le client répond à la proposition via le lien reçu par email (jeton unique).
 * Ne nécessite pas de connexion : le jeton fait office d'autorisation.
 */
export async function respondToQuoteByToken(
    token: string,
    decision: 'ACCEPTE' | 'REFUSE',
    message?: string
) {
    try {
        if (!token) return { success: false, error: "Lien invalide." };
        if (decision !== 'ACCEPTE' && decision !== 'REFUSE') {
            return { success: false, error: "Décision invalide." };
        }

        const quote = await prisma.quote.findUnique({ where: { responseToken: token } });
        if (!quote) {
            return { success: false, error: "Ce lien de réponse est invalide ou expiré." };
        }
        if (quote.proposedPrice == null) {
            return { success: false, error: "Aucune proposition de prix n'est associée à ce devis." };
        }

        await prisma.quote.update({
            where: { id: quote.id },
            data: {
                clientDecision: decision,
                clientResponse: message?.trim() || null,
                clientRespondedAt: new Date(),
                status: decision === 'ACCEPTE' ? 'VALIDE' : 'REFUSE',
            },
        });

        revalidatePath('/admin/quotes');
        revalidatePath('/dashboard');
        return {
            success: true,
            decision,
            customerName: quote.customerName,
            proposedPrice: quote.proposedPrice,
        };
    } catch (error) {
        console.error("Erreur réponse devis par jeton :", error);
        return { success: false, error: "Une erreur est survenue. Réessayez." };
    }
}

/**
 * ACTION (formulaire) : réponse du client via le lien email, SANS dépendre du JavaScript.
 * Fonctionne par amélioration progressive (form action), puis redirige vers la page
 * qui affiche la confirmation côté serveur.
 */
export async function respondToQuoteFormAction(formData: FormData) {
    const token = (formData.get('token') as string) || '';
    const decision = (formData.get('decision') as string) || '';
    const message = ((formData.get('message') as string) || '').trim();

    if (decision === 'ACCEPTE' || decision === 'REFUSE') {
        const quote = await prisma.quote.findUnique({ where: { responseToken: token } });
        if (quote && quote.proposedPrice != null) {
            await prisma.quote.update({
                where: { id: quote.id },
                data: {
                    clientDecision: decision,
                    clientResponse: message || null,
                    clientRespondedAt: new Date(),
                    status: decision === 'ACCEPTE' ? 'VALIDE' : 'REFUSE',
                },
            });
            revalidatePath('/admin/quotes');
            revalidatePath('/dashboard');
        }
    }

    // Redirection hors du bloc try : recharge la page qui montrera la confirmation
    redirect(`/devis/repondre/${token}`);
}

/**
 * ACTION : Récupérer tous les devis avec pagination
 */
export async function getQuotes(page: number = 1, limit: number = 10) {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) {
            return { quotes: [], totalPages: 0, currentPage: 1, totalItems: 0, error: guard.error };
        }

        const skip = (page - 1) * limit;

        const [quotes, total] = await prisma.$transaction([
            prisma.quote.findMany({
                skip: skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.quote.count(),
        ]);

        return {
            quotes,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalItems: total
        };
    } catch (error) {
        console.error("Erreur pagination:", error);
        return { quotes: [], totalPages: 0, currentPage: 1, totalItems: 0 };
    }
}

/**
 * ACTION : Mettre à jour le statut
 */
export async function updateQuoteStatus(id: number, newStatus: string) {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        await prisma.quote.update({
            where: { id },
            data: { status: newStatus },
        });

        revalidatePath('/admin/quotes');
        return { success: true };
    } catch (error) {
        console.error("Erreur de mise à jour statut:", error);
        return { success: false };
    }
}