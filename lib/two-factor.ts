// lib/two-factor.ts
// Couche métier de la double authentification : stockage chiffré du secret,
// codes de secours à usage unique, et vérification unique partagée par
// l'écran de connexion (NextAuth) et le back-office.
//
// Règles de sécurité tenues par ce fichier :
//  1. Le secret TOTP n'existe en clair NULLE PART en base : il est chiffré en
//     AES-256-GCM avec une clé dérivée de NEXTAUTH_SECRET.
//  2. Les codes de secours ne sont affichés qu'UNE fois, à la génération ;
//     seule leur empreinte bcrypt est conservée.
//  3. Un code TOTP déjà accepté ne peut pas être rejoué (twoFactorLastStep).

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
    generateTotpSecret,
    verifyTotpCode,
    normalizeCode,
    TOTP_DIGITS,
} from "@/lib/totp";

export const RECOVERY_CODE_COUNT = 8;
/** Nom affiché dans l'application d'authentification du téléphone. */
export const TWO_FACTOR_ISSUER = "Ndanty";

/* ------------------------------------------------------------------ */
/*  CHIFFREMENT DU SECRET AU REPOS (AES-256-GCM)                       */
/* ------------------------------------------------------------------ */

/**
 * Clé de chiffrement dérivée de NEXTAUTH_SECRET. Le sel est fixe : la dérivation
 * doit être reproductible d'un démarrage à l'autre, et le secret d'origine est
 * déjà une valeur aléatoire longue.
 */
function encryptionKey(): Buffer {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
        throw new Error(
            "NEXTAUTH_SECRET est requis pour chiffrer les secrets de double authentification."
        );
    }
    return crypto.scryptSync(secret, "ndanty-2fa-v1", 32);
}

/** Format stocké : « iv:tag:données », le tout en hexadécimal. */
export function encryptSecret(plain: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    return [iv.toString("hex"), cipher.getAuthTag().toString("hex"), encrypted.toString("hex")].join(":");
}

/**
 * Déchiffre un secret stocké. Renvoie `null` si la valeur est illisible
 * (NEXTAUTH_SECRET modifié, donnée corrompue) : l'appelant doit alors refuser
 * l'accès plutôt que de contourner la double authentification.
 */
export function decryptSecret(stored: string | null | undefined): string | null {
    if (!stored) return null;
    try {
        const [ivHex, tagHex, dataHex] = stored.split(":");
        if (!ivHex || !tagHex || !dataHex) return null;
        const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivHex, "hex"));
        decipher.setAuthTag(Buffer.from(tagHex, "hex"));
        return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
    } catch {
        return null;
    }
}

/* ------------------------------------------------------------------ */
/*  CODES DE SECOURS                                                    */
/* ------------------------------------------------------------------ */

/** Entrée stockée : `h` = empreinte bcrypt, `u` = date d'utilisation (ISO) ou null. */
interface RecoveryEntry {
    h: string;
    u: string | null;
}

/** Alphabet sans caractères ambigus (0/O, 1/I) : ces codes sont recopiés à la main. */
const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomRecoveryCode(): string {
    const pick = () =>
        Array.from(crypto.randomBytes(5))
            .map((byte) => RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length])
            .join("");
    return `${pick()}-${pick()}`;
}

/** Génère les codes en clair (à montrer une seule fois) + leurs empreintes à stocker. */
export async function generateRecoveryCodes(): Promise<{ codes: string[]; stored: string }> {
    const codes = Array.from({ length: RECOVERY_CODE_COUNT }, randomRecoveryCode);
    const entries: RecoveryEntry[] = await Promise.all(
        codes.map(async (code) => ({ h: await bcrypt.hash(normalizeRecoveryCode(code), 10), u: null }))
    );
    return { codes, stored: JSON.stringify(entries) };
}

/** Normalise la saisie : majuscules, sans tiret ni espace. */
export function normalizeRecoveryCode(raw: unknown): string {
    return String(raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function parseRecoveryEntries(stored: string | null | undefined): RecoveryEntry[] {
    if (!stored) return [];
    try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/** Compteurs affichés dans le back-office (« 6 codes sur 8 encore valides »). */
export function countRecoveryCodes(stored: string | null | undefined): { remaining: number; total: number } {
    const entries = parseRecoveryEntries(stored);
    return { remaining: entries.filter((e) => !e.u).length, total: entries.length };
}

/* ------------------------------------------------------------------ */
/*  VÉRIFICATION D'UN CODE                                              */
/* ------------------------------------------------------------------ */

export type TwoFactorMethod = "totp" | "recovery";

export interface TwoFactorCheck {
    ok: boolean;
    method?: TwoFactorMethod;
    /** Codes de secours encore valides après consommation (méthode « recovery »). */
    remainingRecoveryCodes?: number;
    error?: string;
}

/** Ce que la vérification a besoin de connaître du compte, sans dépendre de Prisma. */
export interface TwoFactorSubject {
    id: number;
    twoFactorSecret: string | null;
    twoFactorRecoveryCodes: string | null;
    twoFactorLastStep: number | null;
}

/**
 * Vérifie un code de double authentification et enregistre sa consommation.
 *
 * Accepte indifféremment un code à 6 chiffres de l'application mobile ou un code
 * de secours. Dans les deux cas le code est invalidé après usage : un code TOTP
 * par mémorisation du pas de temps, un code de secours par marquage définitif.
 */
export async function verifyTwoFactorForUser(
    user: TwoFactorSubject,
    rawCode: string
): Promise<TwoFactorCheck> {
    const secret = decryptSecret(user.twoFactorSecret);
    if (!secret) {
        return {
            ok: false,
            error:
                "La configuration de double authentification de ce compte est illisible. Contactez un administrateur.",
        };
    }

    const digits = normalizeCode(rawCode);

    // 1) Code à 6 chiffres de l'application d'authentification.
    if (digits.length === TOTP_DIGITS) {
        const result = verifyTotpCode(secret, digits, { minStep: user.twoFactorLastStep });
        if (result.ok) {
            await prisma.user.update({
                where: { id: user.id },
                data: { twoFactorLastStep: result.step },
            });
            return { ok: true, method: "totp" };
        }
        return { ok: false, error: "Code de vérification invalide ou expiré." };
    }

    // 2) Code de secours (usage unique).
    const candidate = normalizeRecoveryCode(rawCode);
    if (candidate.length >= 8) {
        const entries = parseRecoveryEntries(user.twoFactorRecoveryCodes);
        for (const entry of entries) {
            if (entry.u) continue; // déjà consommé
            if (await bcrypt.compare(candidate, entry.h)) {
                entry.u = new Date().toISOString();
                await prisma.user.update({
                    where: { id: user.id },
                    data: { twoFactorRecoveryCodes: JSON.stringify(entries) },
                });
                return {
                    ok: true,
                    method: "recovery",
                    remainingRecoveryCodes: entries.filter((e) => !e.u).length,
                };
            }
        }
    }

    return { ok: false, error: "Code de vérification invalide ou expiré." };
}

/* ------------------------------------------------------------------ */
/*  APPAIRAGE                                                           */
/* ------------------------------------------------------------------ */

/** Nouveau secret prêt à être stocké comme « appairage en attente ». */
export function createPendingSecret(): { secret: string; encrypted: string } {
    const secret = generateTotpSecret();
    return { secret, encrypted: encryptSecret(secret) };
}

/** Découpe le secret en blocs de 4 pour la saisie manuelle (sans QR code). */
export function formatSecretForDisplay(secret: string): string {
    return secret.replace(/(.{4})/g, "$1 ").trim();
}
