// lib/payments/gateways/cod.ts
// « Passerelle » PAIEMENT À LA LIVRAISON (Cash On Delivery).
// Aucun encaissement en ligne : la commande est simplement confirmée, le règlement se fait à la réception.

import type { PaymentGateway, InitiateContext, GatewayStepResult } from '../types';

export const codGateway: PaymentGateway = {
    key: 'COD',
    label: 'Paiement à la livraison',

    async initiate(ctx: InitiateContext): Promise<GatewayStepResult> {
        const providerRef = `COD-${ctx.reference}`;
        return {
            outcome: {
                kind: 'COD',
                providerRef,
                message: 'Commande confirmée. Vous réglerez en espèces à la livraison.',
            },
        };
    },
};
