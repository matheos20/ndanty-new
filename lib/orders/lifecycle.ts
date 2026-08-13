// lib/orders/lifecycle.ts
// Cycle de vie d'une commande : changement d'étape, annulation, remboursement.
//
// Toute écriture passe par ce module — l'API `/api/orders/[id]` comme les Server
// Actions du back-office — afin qu'une règle métier (remise en stock, journal des
// transactions, horodatage) ne puisse jamais être contournée par un chemin d'appel.

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { logPaymentEvent } from '@/lib/payments/events';
import { normalizeStatus, type OrderStatusKey } from '@/lib/order-status';

/** Vue minimale d'une commande nécessaire aux mouvements de stock. */
interface OrderStockView {
    id: number;
    stockDeducted: boolean;
    orderitem: { productId: number | null; quantity: number }[];
}

/**
 * Remet en stock les articles d'une commande — opération inverse de `deductStock`.
 * Idempotente : sans décrément préalable, il n'y a rien à restituer.
 * `updateMany` plutôt que `update` : un produit retiré du catalogue entre-temps
 * ne doit pas faire échouer l'annulation de la commande.
 */
export async function restoreStock(tx: Prisma.TransactionClient, order: OrderStockView): Promise<number> {
    if (!order.stockDeducted) return 0;

    let restored = 0;
    for (const item of order.orderitem) {
        if (item.productId == null) continue;
        const result = await tx.product.updateMany({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
        });
        if (result.count > 0) restored += item.quantity;
    }

    await tx.order.update({ where: { id: order.id }, data: { stockDeducted: false } });
    return restored;
}

// ─── Changement d'étape du pipeline ──────────────────────────────────────────

export interface OrderForNotification {
    id: number;
    email: string;
    customerName: string;
    totalAmount: number;
    deliveryFee: number | null;
    deliveryZone: string | null;
    paymentRef: string | null;
    paymentMethod: string | null;
    orderitem: { name: string; price: number; quantity: number }[];
}

export interface StatusChangeResult {
    /** `true` si l'étape a réellement changé (sinon rien à notifier). */
    changed: boolean;
    previousStatus: OrderStatusKey;
    order: OrderForNotification;
}

/**
 * Fait avancer une commande dans le tunnel de suivi.
 * L'annulation n'est PAS acceptée ici : elle exige un motif et une décision sur
 * le stock et le remboursement — voir `cancelOrder`.
 */
export async function changeOrderStatus(
    orderId: number,
    status: OrderStatusKey,
    options: { markRead?: boolean } = {},
): Promise<StatusChangeResult> {
    if (status === 'ANNULEE') {
        throw new Error("Utilisez l'annulation dédiée : un motif et le sort du stock doivent être décidés.");
    }

    const existing = await prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true },
    });
    if (!existing) throw new Error('Commande introuvable.');

    const previousStatus = normalizeStatus(existing.status);
    if (previousStatus === 'ANNULEE') {
        throw new Error('Cette commande est annulée : son suivi ne peut plus être modifié.');
    }

    const order = await prisma.order.update({
        where: { id: orderId },
        data: {
            status,
            ...(options.markRead === undefined ? {} : { isReadByManager: options.markRead }),
        },
        select: {
            id: true,
            email: true,
            customerName: true,
            totalAmount: true,
            deliveryFee: true,
            deliveryZone: true,
            paymentRef: true,
            paymentMethod: true,
            orderitem: { select: { name: true, price: true, quantity: true } },
        },
    });

    return { changed: previousStatus !== status, previousStatus, order };
}

// ─── Annulation / remboursement ──────────────────────────────────────────────

export interface CancelOrderInput {
    /** Motif obligatoire : il est tracé en base et repris dans l'email au client. */
    reason: string;
    /** Rembourser le paiement encaissé (sans effet si rien n'a été encaissé). */
    refund: boolean;
    /** Remettre les articles en stock (à décocher si la marchandise est perdue/abîmée). */
    restock: boolean;
    /** Email de l'administrateur, tracé dans le journal des transactions. */
    actor?: string;
}

export interface CancelOrderResult {
    alreadyCancelled: boolean;
    /** Nombre d'articles réellement remis en stock. */
    restocked: number;
    refunded: boolean;
    refundAmount: number;
    order: OrderForNotification;
}

/**
 * Annule une commande de bout en bout, en une seule transaction :
 * remise en stock, remboursement de la transaction, horodatage et motif.
 * Idempotente : une commande déjà annulée n'est jamais retraitée (pas de double
 * réapprovisionnement ni de second remboursement).
 */
export async function cancelOrder(orderId: number, input: CancelOrderInput): Promise<CancelOrderResult> {
    const reason = input.reason.trim();
    if (!reason) throw new Error("Le motif d'annulation est obligatoire.");

    return prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
            where: { id: orderId },
            include: { orderitem: true, payment: true },
        });
        if (!order) throw new Error('Commande introuvable.');

        const notification: OrderForNotification = {
            id: order.id,
            email: order.email,
            customerName: order.customerName,
            totalAmount: order.totalAmount,
            deliveryFee: order.deliveryFee,
            deliveryZone: order.deliveryZone,
            paymentRef: order.paymentRef,
            paymentMethod: order.paymentMethod,
            orderitem: order.orderitem.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity })),
        };

        // Idempotence : ne jamais rejouer une annulation déjà appliquée.
        if (normalizeStatus(order.status) === 'ANNULEE') {
            return {
                alreadyCancelled: true,
                restocked: 0,
                refunded: order.payment?.status === 'REFUNDED',
                refundAmount: 0,
                order: notification,
            };
        }

        const restocked = input.restock ? await restoreStock(tx, order) : 0;

        // Remboursement : uniquement si de l'argent a réellement été encaissé.
        const payment = order.payment;
        const refundable = Boolean(payment && payment.status === 'PAID');
        const refunded = input.refund && refundable;

        if (refunded && payment) {
            const metadata = {
                ...safeParse(payment.metadata),
                refund: {
                    reason,
                    amount: payment.amount,
                    at: new Date().toISOString(),
                    by: input.actor ?? 'admin',
                },
            };

            await tx.payment.update({
                where: { id: payment.id },
                data: { status: 'REFUNDED', errorMessage: null, metadata: JSON.stringify(metadata) },
            });

            await logPaymentEvent(
                {
                    paymentId: payment.id,
                    type: 'REFUNDED',
                    source: 'ADMIN',
                    method: payment.method,
                    status: 'REFUNDED',
                    message: `Remboursement enregistré depuis le back-office. Motif : ${reason}`,
                    payload: { orderId: order.id, amount: payment.amount, by: input.actor ?? 'admin' },
                },
                tx,
            );
        }

        await tx.order.update({
            where: { id: orderId },
            data: {
                status: 'ANNULEE',
                isReadByManager: true,
                cancelReason: reason,
                cancelledAt: new Date(),
                // Une commande remboursée sort du chiffre d'affaires ET des commandes réglées.
                ...(refunded ? { paymentStatus: 'REFUNDED' } : {}),
            },
        });

        return {
            alreadyCancelled: false,
            restocked,
            refunded,
            refundAmount: refunded && payment ? payment.amount : 0,
            order: notification,
        };
    });
}

function safeParse(json: string | null): Record<string, unknown> {
    if (!json) return {};
    try {
        return JSON.parse(json);
    } catch {
        return {};
    }
}
