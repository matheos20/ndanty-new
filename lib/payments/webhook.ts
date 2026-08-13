// lib/payments/webhook.ts
// Webhooks de test des passerelles (Projet FANAKA — Ndanty).
//
// Reproduit fidèlement le protocole des vrais fournisseurs (Stripe, PayPal, Monegasy) :
//   1. la passerelle POSTe un événement JSON ;
//   2. l'en-tête `x-ndanty-signature: t=<horodatage>,v1=<hmac>` authentifie le corps EXACT ;
//   3. le récepteur rejette signature invalide, horodatage périmé (anti-rejeu) et doublons.
//
// ⚠️ Sandbox : aucun encaissement réel. Mais la vérification de signature est faite « pour de vrai »,
//    afin que le passage en production ne consiste qu'à changer le secret et l'URL.
import { createHmac, timingSafeEqual } from 'crypto';
import type { GatewayOutcome } from './types';

/** Types d'événement acceptés — un par scénario exigé au cahier des charges. */
export type WebhookEventType =
    | 'payment.succeeded'
    | 'payment.failed'
    | 'payment.cancelled';

export const WEBHOOK_EVENT_TYPES: WebhookEventType[] = [
    'payment.succeeded',
    'payment.failed',
    'payment.cancelled',
];

export interface WebhookEvent {
    /** Identifiant unique de l'événement — sert de clé d'idempotence. */
    id: string;
    type: WebhookEventType;
    /** Horodatage d'émission (secondes epoch). */
    created: number;
    data: {
        /** Référence interne de la transaction (payment.reference, NDT-…). */
        reference: string;
        /** Identifiant de transaction côté passerelle. */
        providerRef?: string;
        amount?: number;
        currency?: string;
        /** Motif d'échec ou d'annulation. */
        reason?: string;
    };
}

/** Fenêtre de tolérance de l'horodatage : au-delà, l'événement est considéré comme rejoué. */
export const WEBHOOK_TOLERANCE_SECONDS = 300; // 5 minutes

/**
 * Secret de signature. En sandbox local, un secret par défaut permet de tester
 * immédiatement ; en production, PAYMENTS_WEBHOOK_SECRET est obligatoire.
 */
export function getWebhookSecret(): string {
    const fromEnv = process.env.PAYMENTS_WEBHOOK_SECRET?.trim();
    if (fromEnv) return fromEnv;
    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            'PAYMENTS_WEBHOOK_SECRET est obligatoire en production : refus de vérifier une signature avec un secret par défaut.',
        );
    }
    return 'ndanty_sandbox_webhook_secret';
}

/** Calcule la signature d'un corps brut pour un horodatage donné. */
export function computeSignature(rawBody: string, timestamp: number, secret = getWebhookSecret()): string {
    return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

/** Construit la valeur complète de l'en-tête `x-ndanty-signature`. */
export function buildSignatureHeader(rawBody: string, timestamp: number, secret?: string): string {
    return `t=${timestamp},v1=${computeSignature(rawBody, timestamp, secret)}`;
}

export type SignatureCheck =
    | { ok: true }
    | { ok: false; reason: string };

/**
 * Vérifie l'en-tête de signature contre le corps brut reçu.
 * Comparaison à temps constant : ne divulgue pas la signature attendue par un canal temporel.
 */
export function verifySignature(
    rawBody: string,
    header: string | null,
    now: Date = new Date(),
): SignatureCheck {
    if (!header) return { ok: false, reason: 'En-tête de signature absent.' };

    const parts = Object.fromEntries(
        header.split(',').map((p) => {
            const [k, ...rest] = p.trim().split('=');
            return [k, rest.join('=')];
        }),
    ) as Record<string, string>;

    const timestamp = parseInt(parts.t, 10);
    const received = parts.v1;
    if (!timestamp || !received) return { ok: false, reason: 'Signature malformée (t/v1 manquants).' };

    // Anti-rejeu : un événement trop ancien est refusé même si sa signature est valide.
    const ageSeconds = Math.abs(Math.floor(now.getTime() / 1000) - timestamp);
    if (ageSeconds > WEBHOOK_TOLERANCE_SECONDS) {
        return { ok: false, reason: `Horodatage hors tolérance (${ageSeconds}s > ${WEBHOOK_TOLERANCE_SECONDS}s).` };
    }

    let expected: string;
    try {
        expected = computeSignature(rawBody, timestamp);
    } catch (err) {
        // Secret absent en production : on refuse plutôt que de valider à l'aveugle.
        return { ok: false, reason: err instanceof Error ? err.message : 'Secret de signature indisponible.' };
    }

    const a = Buffer.from(received, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
        return { ok: false, reason: 'Signature invalide.' };
    }
    return { ok: true };
}

/** Valide la forme de l'événement reçu. */
export function parseEvent(body: unknown): { ok: true; event: WebhookEvent } | { ok: false; reason: string } {
    const e = body as WebhookEvent;
    if (!e || typeof e !== 'object') return { ok: false, reason: 'Corps JSON invalide.' };
    if (!e.id || typeof e.id !== 'string') return { ok: false, reason: 'Champ `id` manquant.' };
    if (!WEBHOOK_EVENT_TYPES.includes(e.type)) {
        return { ok: false, reason: `Type d'événement non pris en charge : ${e.type}.` };
    }
    if (!e.data?.reference) return { ok: false, reason: 'Champ `data.reference` manquant.' };
    return { ok: true, event: e };
}

/**
 * Traduit un événement de passerelle en résultat interprétable par finalizePayment.
 * C'est le SEUL point de correspondance entre le vocabulaire du fournisseur et le nôtre.
 */
export function eventToOutcome(event: WebhookEvent): GatewayOutcome {
    const providerRef = event.data.providerRef || `WH-${event.id}`;
    switch (event.type) {
        case 'payment.succeeded':
            return { kind: 'PAID', providerRef, message: 'Encaissement confirmé par la passerelle (webhook).' };
        case 'payment.failed':
            return {
                kind: 'FAILED',
                providerRef,
                message: event.data.reason || 'Paiement refusé par la passerelle (webhook).',
            };
        case 'payment.cancelled':
            return {
                kind: 'CANCELLED',
                providerRef,
                message: event.data.reason || 'Paiement annulé par le client (webhook).',
            };
    }
}

/** Libellés français des scénarios, partagés par le back-office. */
export const WEBHOOK_EVENT_LABELS: Record<WebhookEventType, string> = {
    'payment.succeeded': 'Succès du paiement',
    'payment.failed': 'Échec / refus',
    'payment.cancelled': 'Annulation par le client',
};
