// lib/payments/index.ts
// Registre des passerelles + utilitaires serveur (référence, résolution, finalisation transactionnelle).
// ⚠️ Fichier SERVEUR uniquement (accès Prisma). Ne pas importer côté client.

import { randomBytes } from 'crypto';
import type { Prisma } from '@prisma/client';
import type { PaymentGateway, PaymentMethodKey } from './types';
import { visaGateway, mastercardGateway } from './gateways/card';
import { monegasyGateway } from './gateways/monegasy';
import { paypalGateway } from './gateways/paypal';
import { codGateway } from './gateways/cod';

const GATEWAYS: Record<PaymentMethodKey, PaymentGateway> = {
    MONEGASY: monegasyGateway,
    VISA: visaGateway,
    MASTERCARD: mastercardGateway,
    PAYPAL: paypalGateway,
    COD: codGateway,
};

export function isSupportedMethod(method: string): method is PaymentMethodKey {
    return method in GATEWAYS;
}

export function getGateway(method: PaymentMethodKey): PaymentGateway {
    return GATEWAYS[method];
}

/** Référence publique d'une commande, sert de jeton d'URL de la page de paiement. */
export function generateOrderRef(): string {
    return `ORD-${randomBytes(9).toString('hex').toUpperCase()}`;
}

/** Référence interne unique d'une transaction de paiement. */
export function generatePaymentRef(): string {
    return `NDT-${randomBytes(9).toString('hex').toUpperCase()}`;
}

// ─────────────────────────────────────────────────────────────
// FINALISATION — décrément de stock atomique + mise à jour des statuts
// ─────────────────────────────────────────────────────────────

type OrderWithItems = {
    id: number;
    stockDeducted: boolean;
    orderitem: { productId: number | null; name: string; quantity: number }[];
};

/**
 * Décrémente le stock des produits de la commande, une seule fois (garde-fou stockDeducted).
 * À appeler DANS une transaction Prisma. Lève une erreur si le stock est devenu insuffisant.
 */
export async function deductStock(tx: Prisma.TransactionClient, order: OrderWithItems): Promise<void> {
    if (order.stockDeducted) return; // Déjà décrémenté → idempotent

    for (const item of order.orderitem) {
        if (item.productId == null) continue;
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
            throw new Error(`Le produit "${item.name}" n'existe plus dans notre catalogue.`);
        }
        if (product.stock < item.quantity) {
            throw new Error(`Stock insuffisant pour "${product.name}". Quantité disponible : ${product.stock}.`);
        }
        await tx.product.update({
            where: { id: product.id },
            data: { stock: product.stock - item.quantity },
        });
    }

    await tx.order.update({ where: { id: order.id }, data: { stockDeducted: true } });
}
