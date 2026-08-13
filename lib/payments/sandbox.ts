// lib/payments/sandbox.ts
// Identifiants de test et validateurs des passerelles simulées (Projet FANAKA — Ndanty).
// ⚠️ MODE SANDBOX : aucune transaction réelle, aucun échange d'argent.
// Ce fichier ne contient QUE des données de test destinées à être affichées au client.
// Il est volontairement « client-safe » (fonctions pures, pas de secret de production).

// ─────────────────────────────────────────────────────────────
// 1. CARTES BANCAIRES DE TEST (Visa / Mastercard)
// ─────────────────────────────────────────────────────────────

export type CardBrand = 'VISA' | 'MASTERCARD' | 'UNKNOWN';
export type CardOutcome = 'SUCCESS' | 'DECLINED' | 'INSUFFICIENT_FUNDS';

interface TestCard {
    number: string;
    brand: CardBrand;
    outcome: CardOutcome;
    label: string;
}

// Numéros de test déterministes (mêmes préfixes que les vrais bancs d'essai Visa/Mastercard).
export const TEST_CARDS: TestCard[] = [
    { number: '4242424242424242', brand: 'VISA', outcome: 'SUCCESS', label: 'Visa — paiement accepté' },
    { number: '4000000000000002', brand: 'VISA', outcome: 'DECLINED', label: 'Visa — carte refusée' },
    { number: '4000000000009995', brand: 'VISA', outcome: 'INSUFFICIENT_FUNDS', label: 'Visa — fonds insuffisants' },
    { number: '5454545454545454', brand: 'MASTERCARD', outcome: 'SUCCESS', label: 'Mastercard — paiement accepté' },
    { number: '5105105105105100', brand: 'MASTERCARD', outcome: 'DECLINED', label: 'Mastercard — carte refusée' },
];

/** Retire les espaces d'un numéro de carte. */
export function normalizeCardNumber(input: string): string {
    return (input || '').replace(/\D/g, '');
}

/** Détecte la marque d'une carte à partir de son préfixe. */
export function detectCardBrand(number: string): CardBrand {
    const n = normalizeCardNumber(number);
    if (/^4\d{12,18}$/.test(n)) return 'VISA';
    // Mastercard : 51–55 ou plages 2221–2720
    if (/^5[1-5]\d{14}$/.test(n) || /^2(2[2-9]\d|[3-6]\d\d|7[01]\d|720)\d{12}$/.test(n)) return 'MASTERCARD';
    return 'UNKNOWN';
}

/** Algorithme de Luhn : validation du format d'un numéro de carte. */
export function isValidLuhn(number: string): boolean {
    const n = normalizeCardNumber(number);
    if (n.length < 13 || n.length > 19) return false;
    let sum = 0;
    let alt = false;
    for (let i = n.length - 1; i >= 0; i--) {
        let d = parseInt(n[i], 10);
        if (alt) {
            d *= 2;
            if (d > 9) d -= 9;
        }
        sum += d;
        alt = !alt;
    }
    return sum % 10 === 0;
}

/** Renvoie le comportement simulé associé à un numéro de carte de test (ou SUCCESS par défaut si Luhn OK). */
export function resolveCardOutcome(number: string): CardOutcome {
    const n = normalizeCardNumber(number);
    const known = TEST_CARDS.find((c) => c.number === n);
    if (known) return known.outcome;
    // Toute autre carte au format valide (Luhn) est acceptée en sandbox.
    return 'SUCCESS';
}

/** Validation MM/AA : mois 01–12 et date non expirée (référence passée en paramètre pour rester testable). */
export function isValidExpiry(mm: string, yy: string, now: Date): boolean {
    const month = parseInt(mm, 10);
    const year = parseInt(yy, 10);
    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) return false;
    const fullYear = 2000 + year;
    const expiry = new Date(fullYear, month, 1); // 1er jour du mois SUIVANT
    return expiry > now;
}

export function isValidCvc(cvc: string): boolean {
    return /^\d{3,4}$/.test((cvc || '').trim());
}

/** Masque un numéro de carte pour le stockage (•••• 4242). */
export function maskCard(number: string): string {
    const n = normalizeCardNumber(number);
    return `•••• ${n.slice(-4)}`;
}

// ─────────────────────────────────────────────────────────────
// 2. MONEGASY — MOBILE MONEY (MVola / Orange Money / Airtel Money)
// ─────────────────────────────────────────────────────────────

export const MONEGASY_OPERATORS = [
    { key: 'MVOLA', label: 'MVola (Telma)', prefixes: ['034', '038'] },
    { key: 'ORANGE', label: 'Orange Money', prefixes: ['032'] },
    { key: 'AIRTEL', label: 'Airtel Money', prefixes: ['033'] },
] as const;

// OTP de test accepté par la passerelle Monegasy simulée.
export const MONEGASY_TEST_OTP = '123456';

// Numéros spéciaux déclenchant un scénario d'échec (compte non enregistré).
export const MONEGASY_FAIL_MSISDN = ['0340000001'];

/** Valide un numéro malgache : 10 chiffres commençant par 032/033/034/038. */
export function isValidMsisdn(msisdn: string): boolean {
    return /^03[2348]\d{7}$/.test((msisdn || '').replace(/\D/g, ''));
}

/** Déduit l'opérateur à partir du préfixe (retourne null si inconnu). */
export function detectOperator(msisdn: string): string | null {
    const n = (msisdn || '').replace(/\D/g, '');
    const prefix = n.slice(0, 3);
    const op = MONEGASY_OPERATORS.find((o) => (o.prefixes as readonly string[]).includes(prefix));
    return op ? op.key : null;
}

// ─────────────────────────────────────────────────────────────
// 3. PAYPAL — COMPTE ACHETEUR SANDBOX
// ─────────────────────────────────────────────────────────────

export const PAYPAL_SANDBOX_BUYER = {
    email: 'acheteur-test@ndanty.mg',
    password: 'sandbox123',
};

// ─────────────────────────────────────────────────────────────
// 4. TAUX DE CONVERSION (MGA → devise passerelle)
// ─────────────────────────────────────────────────────────────
// PayPal / cartes internationales ne gèrent pas l'Ariary : on convertit pour l'affichage.
// Taux indicatif figé pour le sandbox (à remplacer par un service de change réel en prod).
export const MGA_TO_USD_RATE = 4500; // 1 USD ≈ 4500 Ar

export function mgaToUsd(amountMga: number): number {
    return Math.round((amountMga / MGA_TO_USD_RATE) * 100) / 100;
}
