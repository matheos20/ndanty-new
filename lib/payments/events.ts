// lib/payments/events.ts
// Journal des transactions : écriture d'une piste d'audit horodatée pour chaque étape
// du cycle de vie d'un paiement (Projet FANAKA — Ndanty).
//
// Principes :
//  - JAMAIS bloquant : une écriture de journal qui échoue ne doit pas casser un paiement.
//  - JAMAIS de donnée sensible : le PAN complet et le CVC ne sont jamais persistés (voir maskPayload).
//  - Utilisable dans une transaction Prisma (passer `tx`) ou hors transaction (client global).
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { GatewayOutcome, PaymentMethodKey } from './types';

export type PaymentEventType =
    | 'INITIATED'          // Transaction créée, passerelle appelée
    | 'REQUIRES_ACTION'    // OTP Mobile Money attendu
    | 'REDIRECTED'         // Redirection vers une page d'approbation (PayPal)
    | 'CONFIRMED'          // Le client a soumis l'OTP / est revenu de la redirection
    | 'PAID'               // Encaissement validé
    | 'COD'                // Paiement à la livraison confirmé
    | 'FAILED'             // Refus, fonds insuffisants, OTP erroné…
    | 'CANCELLED'          // Abandon par le client
    | 'REFUNDED'           // Remboursement enregistré depuis le back-office
    | 'WEBHOOK_RECEIVED'   // Rappel de la passerelle accepté et appliqué
    | 'WEBHOOK_REJECTED';  // Rappel refusé (signature invalide, transaction inconnue, rejeu…)

export type PaymentEventSource = 'SYSTEM' | 'WEBHOOK' | 'ADMIN';

export interface LogEventInput {
    paymentId: number;
    type: PaymentEventType;
    method: PaymentMethodKey | string;
    /** Statut de la transaction APRÈS application de l'événement. */
    status: string;
    source?: PaymentEventSource;
    message?: string | null;
    payload?: Record<string, unknown> | null;
}

/** Champs à ne jamais persister dans le journal, quelle que soit leur profondeur. */
const FORBIDDEN_KEYS = ['cvc', 'cvv', 'password', 'otp', 'secret', 'signature'];
/** Champs à conserver mais sous forme masquée. */
const MASKED_KEYS = ['cardnumber', 'number', 'pan', 'msisdn', 'phone'];

/**
 * Nettoie une charge utile avant journalisation : supprime les secrets,
 * masque les identifiants (n° de carte, numéro de téléphone), tronque le volume.
 */
export function maskPayload(input: unknown, depth = 0): unknown {
    if (input == null || depth > 4) return input ?? null;
    if (Array.isArray(input)) return input.slice(0, 20).map((v) => maskPayload(v, depth + 1));
    if (typeof input !== 'object') return input;

    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
        const k = key.toLowerCase();
        if (FORBIDDEN_KEYS.some((f) => k.includes(f))) continue;
        if (MASKED_KEYS.some((m) => k.includes(m)) && typeof value === 'string') {
            const digits = value.replace(/\D/g, '');
            out[key] = digits.length > 4 ? `••••${digits.slice(-4)}` : value;
            continue;
        }
        out[key] = typeof value === 'object' ? maskPayload(value, depth + 1) : value;
    }
    return out;
}

/**
 * Écrit une entrée du journal. Ne lève jamais : un défaut d'audit ne doit pas
 * faire échouer un encaissement déjà accepté par la passerelle.
 */
export async function logPaymentEvent(
    input: LogEventInput,
    tx?: Prisma.TransactionClient,
): Promise<void> {
    const client = tx ?? prisma;
    try {
        const masked = input.payload ? maskPayload(input.payload) : null;
        const serialized = masked ? JSON.stringify(masked) : null;
        await client.paymentevent.create({
            data: {
                paymentId: input.paymentId,
                type: input.type,
                source: input.source ?? 'SYSTEM',
                method: input.method,
                status: input.status,
                message: input.message?.slice(0, 1000) ?? null,
                // Garde-fou volume : le journal ne doit pas devenir un dépotoir.
                payload: serialized && serialized.length > 4000 ? serialized.slice(0, 4000) : serialized,
            },
        });
    } catch (err) {
        console.error('[journal paiement] écriture impossible :', err);
    }
}

/** Traduit un GatewayOutcome en type d'événement du journal. */
export function outcomeToEventType(outcome: GatewayOutcome): PaymentEventType {
    switch (outcome.kind) {
        case 'PAID': return 'PAID';
        case 'COD': return 'COD';
        case 'REQUIRES_ACTION': return 'REQUIRES_ACTION';
        case 'REDIRECT': return 'REDIRECTED';
        case 'CANCELLED': return 'CANCELLED';
        default: return 'FAILED';
    }
}

/** Libellés français des types d'événement, partagés par le back-office. */
export const EVENT_LABELS: Record<PaymentEventType, string> = {
    INITIATED: 'Transaction initiée',
    REQUIRES_ACTION: 'Action client requise (OTP)',
    REDIRECTED: 'Redirection vers la passerelle',
    CONFIRMED: 'Confirmation soumise',
    PAID: 'Paiement encaissé',
    COD: 'Paiement à la livraison confirmé',
    FAILED: 'Paiement refusé',
    CANCELLED: 'Paiement annulé',
    REFUNDED: 'Remboursement enregistré',
    WEBHOOK_RECEIVED: 'Webhook reçu et appliqué',
    WEBHOOK_REJECTED: 'Webhook rejeté',
};
