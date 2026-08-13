// lib/admin/customer.ts
// Vue « 360° » d'un client : tout ce que la maison sait de lui, rassemblé en une
// seule lecture — commandes, devis sur mesure, avis déposés, favoris et valeur cumulée.
//
// Règle de rattachement : les commandes et les avis sont liés par `userId`, les devis
// sur mesure le sont par ADRESSE E-MAIL (le formulaire « sur mesure » est ouvert aux
// visiteurs non connectés, la table `quote` ne porte donc pas d'identifiant client).

import { prisma } from '@/lib/prisma';
import { normalizeStatus, getStatusDef } from '@/lib/order-status';
import { getReviewStatusDef } from '@/lib/review-status';

/** Statuts de paiement considérés comme encaissés — même règle que le tableau de bord. */
const SETTLED_PAYMENTS = new Set(['PAID', 'A_LA_LIVRAISON']);

/** Une commande alimente le chiffre d'affaires si elle est réglée ET non annulée. */
function countsAsRevenue(o: { paymentStatus: string | null; status: string }): boolean {
    return SETTLED_PAYMENTS.has((o.paymentStatus || '').toUpperCase()) && normalizeStatus(o.status) !== 'ANNULEE';
}

export interface CustomerOrderLine {
    id: number;
    createdAt: string;
    totalAmount: number;
    status: string;
    statusLabel: string;
    statusBadge: string;
    paymentStatus: string | null;
    paymentMethod: string | null;
    itemCount: number;
    /** Les 3 premiers articles, pour reconnaître la commande d'un coup d'œil. */
    preview: string[];
    countsAsRevenue: boolean;
}

export interface CustomerQuoteLine {
    id: number;
    createdAt: string;
    status: string;
    details: string;
    proposedPrice: number | null;
    clientDecision: string | null;
}

export interface CustomerReviewLine {
    id: number;
    createdAt: string;
    rating: number;
    comment: string;
    productName: string;
    statusKey: string;
    statusLabel: string;
    statusBadge: string;
}

export interface CustomerProfile {
    identity: {
        id: number;
        firstName: string | null;
        lastName: string | null;
        fullName: string;
        email: string;
        phone: string | null;
        address: string | null;
        country: string | null;
        role: string;
        provider: string;
        image: string | null;
        createdAt: string;
        twoFactorEnabled: boolean;
    };
    metrics: {
        /** Chiffre d'affaires encaissé, annulations exclues. */
        revenue: number;
        /** Commandes ayant réellement généré du chiffre d'affaires. */
        settledOrders: number;
        /** Toutes commandes confondues, y compris paniers abandonnés. */
        totalOrders: number;
        activeOrders: number;
        cancelledOrders: number;
        averageBasket: number;
        firstOrderAt: string | null;
        lastOrderAt: string | null;
        favorites: number;
        quotes: number;
        reviews: number;
        pendingReviews: number;
    };
    orders: CustomerOrderLine[];
    quotes: CustomerQuoteLine[];
    reviews: CustomerReviewLine[];
    /** Noms des produits mis en favori, limités à 8. */
    favorites: string[];
}

/**
 * Assemble la fiche client. Retourne `null` si le compte n'existe plus.
 */
export async function getCustomerProfile(userId: number): Promise<CustomerProfile | null> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const [orders, quotes, reviews, favorites, favoritesCount] = await Promise.all([
        prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, createdAt: true, totalAmount: true, status: true,
                paymentStatus: true, paymentMethod: true, phone: true,
                orderitem: { select: { name: true, quantity: true } },
            },
        }),
        // Devis rattachés par e-mail : le tunnel « sur mesure » n'exige pas de compte.
        prisma.quote.findMany({
            where: { email: user.email },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, createdAt: true, status: true, details: true,
                proposedPrice: true, clientDecision: true,
            },
        }),
        prisma.review.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, createdAt: true, rating: true, comment: true, status: true,
                product: { select: { name: true } },
            },
        }),
        prisma.favorite.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: { product: { select: { name: true } } },
        }),
        prisma.favorite.count({ where: { userId } }),
    ]);

    const revenueOrders = orders.filter(countsAsRevenue);
    const revenue = revenueOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const settledDates = revenueOrders.map((o) => o.createdAt.getTime());

    return {
        identity: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Client Ndanty',
            email: user.email,
            // Le téléphone n'est pas stocké sur le compte : on reprend celui de la
            // dernière commande, seule source fiable pour rappeler le client.
            phone: orders.find((o) => o.phone)?.phone || null,
            address: user.address,
            country: user.country,
            role: user.role,
            provider: user.provider,
            image: user.image,
            createdAt: user.createdAt.toISOString(),
            twoFactorEnabled: user.twoFactorEnabled,
        },
        metrics: {
            revenue: Math.round(revenue),
            settledOrders: revenueOrders.length,
            totalOrders: orders.length,
            activeOrders: orders.filter(
                (o) => countsAsRevenue(o) && ['EN_ATTENTE', 'EN_PREPARATION', 'EXPEDIEE'].includes(normalizeStatus(o.status)),
            ).length,
            cancelledOrders: orders.filter((o) => normalizeStatus(o.status) === 'ANNULEE').length,
            averageBasket: revenueOrders.length ? Math.round(revenue / revenueOrders.length) : 0,
            firstOrderAt: settledDates.length ? new Date(Math.min(...settledDates)).toISOString() : null,
            lastOrderAt: settledDates.length ? new Date(Math.max(...settledDates)).toISOString() : null,
            favorites: favoritesCount,
            quotes: quotes.length,
            reviews: reviews.length,
            pendingReviews: reviews.filter((r) => getReviewStatusDef(r.status).key === 'PENDING').length,
        },
        orders: orders.map((o) => {
            const def = getStatusDef(o.status);
            return {
                id: o.id,
                createdAt: o.createdAt.toISOString(),
                totalAmount: o.totalAmount,
                status: def.key,
                statusLabel: def.label,
                statusBadge: def.badge,
                paymentStatus: o.paymentStatus,
                paymentMethod: o.paymentMethod,
                itemCount: o.orderitem.reduce((s, i) => s + i.quantity, 0),
                preview: o.orderitem.slice(0, 3).map((i) => i.name),
                countsAsRevenue: countsAsRevenue(o),
            };
        }),
        quotes: quotes.map((q) => ({
            id: q.id,
            createdAt: q.createdAt.toISOString(),
            status: q.status,
            details: q.details.length > 160 ? `${q.details.slice(0, 160)}…` : q.details,
            proposedPrice: q.proposedPrice,
            clientDecision: q.clientDecision,
        })),
        reviews: reviews.map((r) => {
            const def = getReviewStatusDef(r.status);
            return {
                id: r.id,
                createdAt: r.createdAt.toISOString(),
                rating: r.rating,
                comment: r.comment.length > 200 ? `${r.comment.slice(0, 200)}…` : r.comment,
                productName: r.product?.name || 'Produit supprimé',
                statusKey: def.key,
                statusLabel: def.label,
                statusBadge: def.badge,
            };
        }),
        favorites: favorites.map((f) => f.product?.name).filter((n): n is string => Boolean(n)),
    };
}
