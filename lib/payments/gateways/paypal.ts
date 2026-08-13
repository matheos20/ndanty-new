// lib/payments/gateways/paypal.ts
// Passerelle PAYPAL simulée — flux par redirection/approbation.
//   1) initiate → renvoie une URL de redirection vers l'écran d'approbation PayPal simulé (REDIRECT)
//   2) confirm  → le retour de l'écran fournit la décision (approve/cancel) → PAID / CANCELLED
//
// 🔌 Migration vers le vrai sandbox PayPal (REST v2) :
//    - `initiate` : POST /v2/checkout/orders (intent=CAPTURE), renvoyer le lien `approve` (HATEOAS).
//    - `confirm`  : POST /v2/checkout/orders/{id}/capture au retour de l'acheteur.
//    - Nécessite un Client ID/Secret sandbox (compte développeur PayPal) et une conversion MGA→USD.

import type { PaymentGateway, InitiateContext, ConfirmContext, GatewayStepResult } from '../types';
import { PAYPAL_SANDBOX_BUYER, mgaToUsd } from '../sandbox';

export const paypalGateway: PaymentGateway = {
    key: 'PAYPAL',
    label: 'PayPal',

    async initiate(ctx: InitiateContext): Promise<GatewayStepResult> {
        const providerRef = `PAYPAL-${ctx.reference}`;
        const usd = mgaToUsd(ctx.amount);

        // Redirection vers notre écran d'approbation PayPal simulé.
        const redirectUrl = `${ctx.appUrl}/paiement/paypal-sandbox?ref=${encodeURIComponent(ctx.reference)}`;

        return {
            outcome: {
                kind: 'REDIRECT',
                providerRef,
                redirectUrl,
                message: 'Redirection vers PayPal pour approuver le paiement.',
            },
            metadata: {
                payerEmail: PAYPAL_SANDBOX_BUYER.email,
                amountUsd: usd,
                conversionNote: `${ctx.amount.toLocaleString('fr-FR')} Ar ≈ ${usd} USD`,
            },
        };
    },

    async confirm(ctx: ConfirmContext): Promise<GatewayStepResult> {
        const providerRef = ctx.providerRef ?? `PAYPAL-${ctx.reference}`;
        const decision = String(ctx.input?.decision || '').toLowerCase();

        if (decision === 'cancel') {
            return { outcome: { kind: 'CANCELLED', providerRef, message: 'Paiement PayPal annulé par l\'acheteur.' } };
        }
        if (decision !== 'approve') {
            return { outcome: { kind: 'FAILED', providerRef, message: 'Décision PayPal invalide.' } };
        }

        return { outcome: { kind: 'PAID', providerRef, message: 'Paiement PayPal approuvé et capturé.' } };
    },
};
