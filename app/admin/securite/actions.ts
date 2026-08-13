// app/admin/securite/actions.ts
'use server';

import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ensureAdmin } from "@/lib/guards";
import { recordAudit } from "@/lib/admin/audit";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { buildOtpAuthUrl, verifyTotpCode, normalizeCode, TOTP_DIGITS } from "@/lib/totp";
import {
    TWO_FACTOR_ISSUER,
    createPendingSecret,
    decryptSecret,
    encryptSecret,
    formatSecretForDisplay,
    generateRecoveryCodes,
    countRecoveryCodes,
    verifyTwoFactorForUser,
} from "@/lib/two-factor";

/**
 * Toutes les opérations de cet écran touchent au facteur qui protège le compte :
 * elles exigent d'être administrateur ET de reprouver son identité (mot de passe
 * ou code en cours de validité). Un onglet resté ouvert ne doit jamais suffire.
 */

type ActionResult<T = unknown> = ({ success: true } & T) | { success: false; error: string };

// Anti-force brute sur la confirmation d'appairage et sur les actions sensibles.
const SETUP_LIMIT = { name: "2fa-setup", limit: 8, windowMs: 10 * 60 * 1000 } as const;

/** Charge l'administrateur connecté avec les champs de double authentification. */
async function loadAdmin() {
    const guard = await ensureAdmin();
    if (!guard.ok) return { ok: false as const, error: guard.error };

    const email = String(guard.session.user?.email || "").toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { ok: false as const, error: "Compte introuvable." };

    return { ok: true as const, user };
}

/* ------------------------------------------------------------------ */
/*  LECTURE DE L'ÉTAT                                                   */
/* ------------------------------------------------------------------ */

export interface TwoFactorStatus {
    enabled: boolean;
    enabledAt: string | null;
    recoveryRemaining: number;
    recoveryTotal: number;
    /** Un compte Google sans mot de passe local ne peut pas confirmer son identité ici. */
    canManage: boolean;
    email: string;
}

export async function getTwoFactorStatusAction(): Promise<TwoFactorStatus | null> {
    const admin = await loadAdmin();
    if (!admin.ok) return null;

    const { remaining, total } = countRecoveryCodes(admin.user.twoFactorRecoveryCodes);
    return {
        enabled: admin.user.twoFactorEnabled,
        enabledAt: admin.user.twoFactorEnabledAt?.toISOString() ?? null,
        recoveryRemaining: remaining,
        recoveryTotal: total,
        canManage: Boolean(admin.user.password),
        email: admin.user.email,
    };
}

/* ------------------------------------------------------------------ */
/*  1. DÉMARRER L'APPAIRAGE                                             */
/* ------------------------------------------------------------------ */

export interface SetupPayload {
    /** Image PNG en data-URL, à afficher directement dans un <img>. */
    qrCode: string;
    /** Secret en Base32 formaté, pour la saisie manuelle si le QR est illisible. */
    secretDisplay: string;
    account: string;
}

/**
 * Génère un nouveau secret, le stocke comme « appairage en attente » et renvoie
 * le QR code. Tant qu'aucun code valide n'a confirmé l'appairage, la double
 * authentification reste inactive : recommencer l'opération est sans risque.
 */
export async function startTwoFactorSetupAction(password: string): Promise<ActionResult<SetupPayload>> {
    try {
        const admin = await loadAdmin();
        if (!admin.ok) return { success: false, error: admin.error };
        const { user } = admin;

        if (user.twoFactorEnabled) {
            return { success: false, error: "La double authentification est déjà active sur ce compte." };
        }
        if (!user.password) {
            return {
                success: false,
                error: "Ce compte se connecte via Google : définissez d'abord un mot de passe local.",
            };
        }

        const limit = rateLimit(user.email, SETUP_LIMIT);
        if (!limit.ok) {
            return { success: false, error: `Trop de tentatives. Réessayez dans ${Math.ceil(limit.retryAfter / 60)} minute(s).` };
        }

        // Reprouver l'identité : sans cela, un poste laissé ouvert permettrait
        // à un tiers d'appairer SON téléphone sur le compte.
        const passwordOk = await bcrypt.compare(String(password || ""), user.password);
        if (!passwordOk) {
            return { success: false, error: "Mot de passe incorrect." };
        }
        resetRateLimit(SETUP_LIMIT.name, user.email);

        const { secret, encrypted } = createPendingSecret();
        await prisma.user.update({
            where: { id: user.id },
            data: { twoFactorPendingSecret: encrypted },
        });

        const otpauth = buildOtpAuthUrl({ secret, account: user.email, issuer: TWO_FACTOR_ISSUER });
        const qrCode = await QRCode.toDataURL(otpauth, {
            width: 320,
            margin: 1,
            errorCorrectionLevel: "M",
            color: { dark: "#2c3e50", light: "#ffffff" },
        });

        return {
            success: true,
            qrCode,
            secretDisplay: formatSecretForDisplay(secret),
            account: user.email,
        };
    } catch (error) {
        console.error("startTwoFactorSetupAction:", error);
        return { success: false, error: "Erreur serveur lors de la préparation de l'appairage." };
    }
}

/** Abandonne un appairage en cours (bouton « Annuler »). */
export async function cancelTwoFactorSetupAction(): Promise<ActionResult> {
    try {
        const admin = await loadAdmin();
        if (!admin.ok) return { success: false, error: admin.error };

        await prisma.user.update({
            where: { id: admin.user.id },
            data: { twoFactorPendingSecret: null },
        });
        return { success: true };
    } catch (error) {
        console.error("cancelTwoFactorSetupAction:", error);
        return { success: false, error: "Erreur serveur." };
    }
}

/* ------------------------------------------------------------------ */
/*  2. CONFIRMER L'APPAIRAGE ET ACTIVER                                 */
/* ------------------------------------------------------------------ */

/**
 * Valide un premier code produit par l'application mobile, puis active la
 * protection et délivre les codes de secours. Ces codes ne seront plus jamais
 * affichés : seule leur empreinte est conservée.
 */
export async function confirmTwoFactorSetupAction(
    code: string
): Promise<ActionResult<{ recoveryCodes: string[] }>> {
    try {
        const admin = await loadAdmin();
        if (!admin.ok) return { success: false, error: admin.error };
        const { user } = admin;

        if (user.twoFactorEnabled) {
            return { success: false, error: "La double authentification est déjà active." };
        }

        const secret = decryptSecret(user.twoFactorPendingSecret);
        if (!secret) {
            return { success: false, error: "Aucun appairage en cours. Relancez l'activation." };
        }

        const limit = rateLimit(user.email, SETUP_LIMIT);
        if (!limit.ok) {
            return { success: false, error: `Trop de codes erronés. Réessayez dans ${Math.ceil(limit.retryAfter / 60)} minute(s).` };
        }

        const digits = normalizeCode(code);
        if (digits.length !== TOTP_DIGITS) {
            return { success: false, error: `Le code doit contenir ${TOTP_DIGITS} chiffres.` };
        }

        const check = verifyTotpCode(secret, digits);
        if (!check.ok) {
            return {
                success: false,
                error: "Code refusé. Vérifiez l'heure de votre téléphone puis saisissez le code affiché actuellement.",
            };
        }
        resetRateLimit(SETUP_LIMIT.name, user.email);

        const { codes, stored } = await generateRecoveryCodes();
        await prisma.user.update({
            where: { id: user.id },
            data: {
                twoFactorEnabled: true,
                twoFactorSecret: encryptSecret(secret),
                twoFactorPendingSecret: null,
                twoFactorRecoveryCodes: stored,
                twoFactorEnabledAt: new Date(),
                // Le code qui vient de servir ne pourra pas être rejoué à la connexion.
                twoFactorLastStep: check.step ?? null,
            },
        });

        await recordAudit({
            action: "user.2fa_enable",
            entity: "user",
            entityId: user.id,
            label: user.email,
            summary: `Double authentification activée sur le compte ${user.email}`,
            metadata: { recoveryCodes: codes.length },
            actorEmail: user.email,
        });

        revalidatePath("/admin/securite");
        return { success: true, recoveryCodes: codes };
    } catch (error) {
        console.error("confirmTwoFactorSetupAction:", error);
        return { success: false, error: "Erreur serveur lors de l'activation." };
    }
}

/* ------------------------------------------------------------------ */
/*  3. REGÉNÉRER LES CODES DE SECOURS                                   */
/* ------------------------------------------------------------------ */

export async function regenerateRecoveryCodesAction(
    code: string
): Promise<ActionResult<{ recoveryCodes: string[] }>> {
    try {
        const admin = await loadAdmin();
        if (!admin.ok) return { success: false, error: admin.error };
        const { user } = admin;

        if (!user.twoFactorEnabled) {
            return { success: false, error: "La double authentification n'est pas active." };
        }

        const limit = rateLimit(user.email, SETUP_LIMIT);
        if (!limit.ok) {
            return { success: false, error: `Trop de tentatives. Réessayez dans ${Math.ceil(limit.retryAfter / 60)} minute(s).` };
        }

        const check = await verifyTwoFactorForUser(user, code);
        if (!check.ok) return { success: false, error: check.error || "Code invalide." };
        resetRateLimit(SETUP_LIMIT.name, user.email);

        const { codes, stored } = await generateRecoveryCodes();
        await prisma.user.update({
            where: { id: user.id },
            data: { twoFactorRecoveryCodes: stored },
        });

        await recordAudit({
            action: "user.2fa_recovery",
            entity: "user",
            entityId: user.id,
            label: user.email,
            summary: `Nouveaux codes de secours générés (les précédents sont annulés)`,
            actorEmail: user.email,
        });

        revalidatePath("/admin/securite");
        return { success: true, recoveryCodes: codes };
    } catch (error) {
        console.error("regenerateRecoveryCodesAction:", error);
        return { success: false, error: "Erreur serveur lors de la génération des codes." };
    }
}

/* ------------------------------------------------------------------ */
/*  4. DÉSACTIVER                                                       */
/* ------------------------------------------------------------------ */

/**
 * Désactivation : mot de passe ET code valide sont exigés simultanément.
 * Retirer une protection doit être au moins aussi difficile que de la franchir.
 */
export async function disableTwoFactorAction(
    password: string,
    code: string
): Promise<ActionResult> {
    try {
        const admin = await loadAdmin();
        if (!admin.ok) return { success: false, error: admin.error };
        const { user } = admin;

        if (!user.twoFactorEnabled) return { success: true };
        if (!user.password) return { success: false, error: "Compte sans mot de passe local." };

        const limit = rateLimit(user.email, SETUP_LIMIT);
        if (!limit.ok) {
            return { success: false, error: `Trop de tentatives. Réessayez dans ${Math.ceil(limit.retryAfter / 60)} minute(s).` };
        }

        const passwordOk = await bcrypt.compare(String(password || ""), user.password);
        if (!passwordOk) return { success: false, error: "Mot de passe incorrect." };

        const check = await verifyTwoFactorForUser(user, code);
        if (!check.ok) return { success: false, error: check.error || "Code invalide." };
        resetRateLimit(SETUP_LIMIT.name, user.email);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
                twoFactorPendingSecret: null,
                twoFactorRecoveryCodes: null,
                twoFactorEnabledAt: null,
                twoFactorLastStep: null,
            },
        });

        await recordAudit({
            action: "user.2fa_disable",
            entity: "user",
            entityId: user.id,
            label: user.email,
            summary: `Double authentification désactivée sur le compte ${user.email}`,
            actorEmail: user.email,
        });

        revalidatePath("/admin/securite");
        return { success: true };
    } catch (error) {
        console.error("disableTwoFactorAction:", error);
        return { success: false, error: "Erreur serveur lors de la désactivation." };
    }
}
