// lib/totp.ts
// Implémentation TOTP conforme aux RFC 4226 (HOTP) et RFC 6238 (TOTP),
// compatible avec Google Authenticator, Microsoft Authenticator, Authy, 1Password…
//
// Aucune dépendance externe : uniquement `node:crypto`. Le format retenu est celui
// que TOUS les lecteurs d'authentification supportent par défaut :
//   algorithme SHA-1, 6 chiffres, pas de temps de 30 secondes.
// Changer ces valeurs casserait la compatibilité avec les applications mobiles :
// elles sont donc figées ici et exportées en lecture seule.

import crypto from "crypto";

export const TOTP_DIGITS = 6;
export const TOTP_PERIOD = 30; // secondes
export const TOTP_ALGORITHM = "sha1";

/** Tolérance de dérive d'horloge : ±1 pas, soit ±30 s autour du code courant. */
export const TOTP_WINDOW = 1;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/* ------------------------------------------------------------------ */
/*  BASE32 (RFC 4648, sans remplissage) — format attendu par les apps  */
/* ------------------------------------------------------------------ */

export function base32Encode(buffer: Buffer): string {
    let bits = 0;
    let value = 0;
    let output = "";

    for (const byte of buffer) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) {
        output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }
    return output;
}

export function base32Decode(input: string): Buffer {
    // On tolère les espaces de mise en forme, les minuscules et le padding « = ».
    const clean = input.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");

    let bits = 0;
    let value = 0;
    const bytes: number[] = [];

    for (const char of clean) {
        const index = BASE32_ALPHABET.indexOf(char);
        if (index === -1) throw new Error("Secret TOTP invalide (caractère hors Base32).");
        value = (value << 5) | index;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return Buffer.from(bytes);
}

/* ------------------------------------------------------------------ */
/*  GÉNÉRATION DU SECRET                                               */
/* ------------------------------------------------------------------ */

/**
 * Nouveau secret partagé, en Base32. 20 octets (160 bits) = taille recommandée
 * par la RFC 4226 pour HMAC-SHA1.
 */
export function generateTotpSecret(): string {
    return base32Encode(crypto.randomBytes(20));
}

/**
 * URI `otpauth://` à encoder dans le QR code. `issuer` apparaît comme nom du
 * compte dans l'application d'authentification, `account` permet de distinguer
 * plusieurs comptes du même service.
 */
export function buildOtpAuthUrl({
    secret,
    account,
    issuer,
}: {
    secret: string;
    account: string;
    issuer: string;
}): string {
    // L'étiquette canonique est « Émetteur:compte », l'émetteur étant répété en
    // paramètre : c'est ce que réclament Google Authenticator et 1Password.
    const label = encodeURIComponent(`${issuer}:${account}`);
    const params = new URLSearchParams({
        secret,
        issuer,
        algorithm: TOTP_ALGORITHM.toUpperCase(),
        digits: String(TOTP_DIGITS),
        period: String(TOTP_PERIOD),
    });
    return `otpauth://totp/${label}?${params.toString()}`;
}

/* ------------------------------------------------------------------ */
/*  CALCUL ET VÉRIFICATION DES CODES                                   */
/* ------------------------------------------------------------------ */

/** Pas de temps courant : nombre de tranches de 30 s écoulées depuis l'epoch. */
export function currentTimeStep(now: number = Date.now()): number {
    return Math.floor(now / 1000 / TOTP_PERIOD);
}

/** Code à 6 chiffres correspondant à un pas de temps donné (HOTP tronqué). */
export function generateTotpCode(secret: string, step: number): string {
    const key = base32Decode(secret);

    // Compteur sur 8 octets, gros-boutiste (RFC 4226 §5.1).
    const counter = Buffer.alloc(8);
    counter.writeUInt32BE(Math.floor(step / 0x100000000), 0);
    counter.writeUInt32BE(step >>> 0, 4);

    const hmac = crypto.createHmac(TOTP_ALGORITHM, key).update(counter).digest();

    // Troncature dynamique : les 4 bits de poids faible désignent l'offset.
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

    return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

/** Comparaison à temps constant : ne renseigne pas un attaquant par sa durée. */
function safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

/** Ne garde que les chiffres : l'utilisateur peut coller « 123 456 ». */
export function normalizeCode(raw: unknown): string {
    return String(raw ?? "").replace(/\D/g, "");
}

export interface TotpVerification {
    ok: boolean;
    /** Pas de temps ayant validé le code — à mémoriser pour interdire le rejeu. */
    step?: number;
}

/**
 * Vérifie un code sur la fenêtre de tolérance. `minStep` (exclusif) rejette tout
 * code déjà consommé : sans lui, un code intercepté resterait rejouable 30 s.
 */
export function verifyTotpCode(
    secret: string,
    code: string,
    options: { now?: number; window?: number; minStep?: number | null } = {}
): TotpVerification {
    const digits = normalizeCode(code);
    if (digits.length !== TOTP_DIGITS) return { ok: false };

    const window = options.window ?? TOTP_WINDOW;
    const center = currentTimeStep(options.now ?? Date.now());

    for (let drift = -window; drift <= window; drift++) {
        const step = center + drift;
        if (options.minStep != null && step <= options.minStep) continue; // déjà utilisé
        if (safeEqual(generateTotpCode(secret, step), digits)) {
            return { ok: true, step };
        }
    }
    return { ok: false };
}
