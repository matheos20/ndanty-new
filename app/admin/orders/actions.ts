'use server';

// app/admin/orders/actions.ts
// Actions du back-office sur le cycle de vie d'une commande.
// La logique métier vit dans lib/orders/lifecycle.ts ; ces actions n'ajoutent que
// l'autorisation, la notification client et l'invalidation du cache.

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { ensureAdmin } from '@/lib/guards';
import { cancelOrder, changeOrderStatus } from '@/lib/orders/lifecycle';
import { ORDER_STATUS_KEYS, getStatusDef, type OrderStatusKey } from '@/lib/order-status';
import { sendOrderCancelledEmail, sendOrderStatusEmail, type NotifiableStatus } from '@/lib/mailer';
import { recordAudit } from '@/lib/admin/audit';

export interface OrderActionResult {
    success: boolean;
    error?: string;
    /** Message de confirmation détaillé, affiché à l'administrateur. */
    message?: string;
    /** Un email a réellement été adressé au client. */
    notified?: boolean;
}

/** Étapes pour lesquelles le client est prévenu par email. */
const NOTIFIABLE: NotifiableStatus[] = ['EN_PREPARATION', 'EXPEDIEE', 'LIVREE'];

function revalidateOrderViews() {
    revalidatePath('/admin/orders');
    revalidatePath('/admin/payments');
    revalidatePath('/admin');
    revalidatePath('/dashboard');
}

/**
 * Fait avancer une commande dans le tunnel de suivi et prévient le client.
 * L'annulation passe obligatoirement par `cancelOrderAction`.
 */
export async function updateOrderStatusAction(
    orderId: number,
    status: string,
    notify = true,
): Promise<OrderActionResult> {
    const guard = await ensureAdmin();
    if (!guard.ok) return { success: false, error: guard.error };

    if (!ORDER_STATUS_KEYS.includes(status as OrderStatusKey)) {
        return { success: false, error: `Statut invalide : ${status}.` };
    }
    if (status === 'ANNULEE') {
        return { success: false, error: "Passez par l'annulation dédiée pour renseigner un motif et le sort du stock." };
    }

    try {
        const result = await changeOrderStatus(orderId, status as OrderStatusKey, { markRead: true });

        let notified = false;
        if (notify && result.changed && NOTIFIABLE.includes(status as NotifiableStatus)) {
            await sendOrderStatusEmail(result.order, status as NotifiableStatus);
            notified = true;
        }

        // Seul un changement RÉEL d'étape mérite une ligne de journal : réenregistrer
        // le même statut ne raconte rien.
        if (result.changed) {
            await recordAudit({
                action: 'order.status',
                entity: 'order',
                entityId: orderId,
                label: `CMD #${orderId} — ${result.order.customerName}`,
                summary: `Suivi : ${getStatusDef(result.previousStatus).label} → ${getStatusDef(status).label}`
                    + (notified ? ` · client prévenu (${result.order.email})` : ''),
                metadata: { from: result.previousStatus, to: status, notified, amount: result.order.totalAmount },
                actorEmail: guard.session.user?.email,
            });
        }

        revalidateOrderViews();
        return {
            success: true,
            notified,
            message: notified ? `Client prévenu par email (${result.order.email}).` : undefined,
        };
    } catch (err: any) {
        console.error('Erreur de changement de statut de commande :', err);
        return { success: false, error: err?.message || 'Le statut n’a pas pu être enregistré.' };
    }
}

/**
 * Marque une commande comme consultée. Appelée à l'ouverture de sa fiche : c'est
 * ce qui vide la pastille « nouvelles commandes » de la barre latérale.
 */
export async function markOrderReadAction(orderId: number): Promise<OrderActionResult> {
    const guard = await ensureAdmin();
    if (!guard.ok) return { success: false, error: guard.error };

    try {
        await prisma.order.update({ where: { id: orderId }, data: { isReadByManager: true } });
        revalidatePath('/admin/orders');
        revalidatePath('/admin');
        return { success: true };
    } catch (err: any) {
        console.error('Erreur de marquage de commande comme lue :', err);
        return { success: false, error: err?.message || 'Commande introuvable.' };
    }
}

export interface CancelOrderActionInput {
    reason: string;
    refund: boolean;
    restock: boolean;
    notify: boolean;
}

/**
 * Annule une commande : remise en stock, remboursement de la transaction encaissée,
 * traçabilité du motif, puis notification du client.
 */
export async function cancelOrderAction(
    orderId: number,
    input: CancelOrderActionInput,
): Promise<OrderActionResult> {
    const guard = await ensureAdmin();
    if (!guard.ok) return { success: false, error: guard.error };

    const reason = (input.reason || '').trim();
    if (reason.length < 5) {
        return { success: false, error: "Merci d'indiquer un motif d'annulation (5 caractères minimum)." };
    }

    try {
        const result = await cancelOrder(orderId, {
            reason,
            refund: input.refund,
            restock: input.restock,
            actor: guard.session?.user?.email ?? 'admin',
        });

        if (result.alreadyCancelled) {
            revalidateOrderViews();
            return { success: true, message: 'Cette commande était déjà annulée : aucune opération rejouée.' };
        }

        let notified = false;
        if (input.notify) {
            await sendOrderCancelledEmail(result.order, {
                reason,
                refunded: result.refunded,
                refundAmount: result.refundAmount,
            });
            notified = true;
        }

        // Compte rendu explicite : l'administrateur doit savoir ce qui a réellement été fait.
        const parts: string[] = ['Commande annulée.'];
        if (result.restocked > 0) parts.push(`${result.restocked} article(s) remis en stock.`);
        if (result.refunded) parts.push(`Remboursement de ${result.refundAmount.toLocaleString('fr-FR')} Ar enregistré.`);
        else if (input.refund) parts.push('Aucun encaissement à rembourser.');
        if (notified) parts.push('Client prévenu par email.');

        await recordAudit({
            action: 'order.cancel',
            entity: 'order',
            entityId: orderId,
            label: `CMD #${orderId} — ${result.order.customerName}`,
            summary: `Commande annulée — motif : ${reason}`
                + (result.restocked > 0 ? ` · ${result.restocked} article(s) remis en stock` : '')
                + (result.refunded ? ` · remboursement de ${result.refundAmount.toLocaleString('fr-FR')} Ar` : ''),
            metadata: {
                reason,
                restocked: result.restocked,
                refunded: result.refunded,
                refundAmount: result.refundAmount,
                notified,
                amount: result.order.totalAmount,
            },
            actorEmail: guard.session.user?.email,
        });

        revalidateOrderViews();
        return { success: true, notified, message: parts.join(' ') };
    } catch (err: any) {
        console.error("Erreur d'annulation de commande :", err);
        return { success: false, error: err?.message || "La commande n’a pas pu être annulée." };
    }
}
