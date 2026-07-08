// lib/payments/finalize.ts
// Applique le résultat d'une passerelle à la base de données, de façon atomique et idempotente.
// Centralise la logique métier commune à `initiate` (paiement synchrone) et `confirm` (OTP / retour PayPal).

import { prisma } from '@/lib/prisma';
import { deductStock } from './index';
import type { GatewayOutcome, PaymentMethodKey } from './types';

export interface FinalizeResult {
    paymentStatus: string; // Statut de la table payment après application
    orderPaymentStatus: string; // order.paymentStatus après application
}

/**
 * Traduit un GatewayOutcome en écritures BDD (payment + order + stock).
 * - PAID  : encaissé → stock décrémenté, order.paymentStatus = PAID
 * - COD   : confirmé sans encaissement → stock décrémenté, order.paymentStatus = A_LA_LIVRAISON
 * - FAILED: order.paymentStatus = FAILED (stock inchangé)
 * - CANCELLED : retour à PENDING pour permettre une nouvelle tentative
 */
export async function finalizePayment(
    paymentId: number,
    method: PaymentMethodKey,
    outcome: GatewayOutcome,
    extraMetadata?: Record<string, any>,
): Promise<FinalizeResult> {
    return prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({
            where: { id: paymentId },
            include: { order: { include: { orderitem: true } } },
        });
        if (!payment) throw new Error('Transaction de paiement introuvable.');

        // Idempotence : si déjà encaissé, on ne rejoue rien.
        if (payment.status === 'PAID') {
            return { paymentStatus: 'PAID', orderPaymentStatus: payment.order.paymentStatus };
        }

        const mergedMetadata = {
            ...(payment.metadata ? safeParse(payment.metadata) : {}),
            ...(extraMetadata || {}),
        };
        const providerRef = 'providerRef' in outcome ? outcome.providerRef ?? payment.providerRef : payment.providerRef;

        if (outcome.kind === 'PAID') {
            await deductStock(tx, payment.order);
            await tx.payment.update({
                where: { id: paymentId },
                data: {
                    status: 'PAID',
                    paidAt: new Date(),
                    providerRef,
                    errorMessage: null,
                    metadata: JSON.stringify(mergedMetadata),
                },
            });
            await tx.order.update({
                where: { id: payment.orderId },
                data: { paymentStatus: 'PAID', paymentMethod: method, isReadByManager: false },
            });
            return { paymentStatus: 'PAID', orderPaymentStatus: 'PAID' };
        }

        if (outcome.kind === 'COD') {
            await deductStock(tx, payment.order);
            await tx.payment.update({
                where: { id: paymentId },
                data: { status: 'PENDING', providerRef, errorMessage: null, metadata: JSON.stringify(mergedMetadata) },
            });
            await tx.order.update({
                where: { id: payment.orderId },
                data: { paymentStatus: 'A_LA_LIVRAISON', paymentMethod: 'COD', isReadByManager: false },
            });
            return { paymentStatus: 'PENDING', orderPaymentStatus: 'A_LA_LIVRAISON' };
        }

        if (outcome.kind === 'CANCELLED') {
            await tx.payment.update({
                where: { id: paymentId },
                data: { status: 'CANCELLED', providerRef, errorMessage: outcome.message },
            });
            await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'PENDING' } });
            return { paymentStatus: 'CANCELLED', orderPaymentStatus: 'PENDING' };
        }

        // FAILED
        const message = 'message' in outcome ? outcome.message : 'Paiement échoué.';
        await tx.payment.update({
            where: { id: paymentId },
            data: { status: 'FAILED', providerRef, errorMessage: message },
        });
        await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'FAILED', paymentMethod: method } });
        return { paymentStatus: 'FAILED', orderPaymentStatus: 'FAILED' };
    });
}

function safeParse(json: string): Record<string, any> {
    try {
        return JSON.parse(json);
    } catch {
        return {};
    }
}
