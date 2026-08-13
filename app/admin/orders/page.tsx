// app/admin/orders/page.tsx
// Liste des commandes : filtrage, recherche et pagination effectués CÔTÉ SERVEUR.
// La page ne charge jamais plus d'un écran de commandes, quel que soit le volume du carnet.

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { ensureAdmin } from '@/lib/guards';
import { ORDER_STATUS_KEYS, statusDbValues, type OrderStatusKey } from '@/lib/order-status';
import OrdersListClient from './OrdersListClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Nombre de commandes affichées par page. */
const PAGE_SIZE = 10;

export type PaymentFilter = 'REGLEES' | 'ATTENTE' | 'REMBOURSEES' | 'TOUTES';

/** Traduction de chaque onglet de paiement en condition SQL. */
const PAYMENT_CONDITIONS: Record<Exclude<PaymentFilter, 'TOUTES'>, Prisma.orderWhereInput> = {
    REGLEES: { paymentStatus: { in: ['PAID', 'A_LA_LIVRAISON'] } },
    ATTENTE: { paymentStatus: { in: ['PENDING', 'FAILED'] } },
    REMBOURSEES: { paymentStatus: 'REFUNDED' },
};

interface PageProps {
    searchParams: Promise<{
        page?: string;
        q?: string;
        paiement?: string;
        statut?: string;
        du?: string;
        au?: string;
    }>;
}

function parsePaymentFilter(raw?: string): PaymentFilter {
    return raw === 'ATTENTE' || raw === 'REMBOURSEES' || raw === 'TOUTES' ? raw : 'REGLEES';
}

function parseStatusFilter(raw?: string): OrderStatusKey | 'TOUS' {
    return ORDER_STATUS_KEYS.includes(raw as OrderStatusKey) ? (raw as OrderStatusKey) : 'TOUS';
}

/** Borne de date issue d'un `<input type="date">` ; `null` si la saisie est invalide. */
function parseDate(raw: string | undefined, endOfDay: boolean): Date | null {
    if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    const [year, month, day] = raw.split('-').map(Number);
    const date = new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    return Number.isNaN(date.getTime()) ? null : date;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
    // Le carnet expose les coordonnées des clients : accès strictement administrateur.
    const guard = await ensureAdmin();
    if (!guard.ok) redirect('/login');

    const params = await searchParams;
    const search = (params.q || '').trim();
    const paymentFilter = parsePaymentFilter(params.paiement);
    const statusFilter = parseStatusFilter(params.statut);
    const from = parseDate(params.du, false);
    const to = parseDate(params.au, true);

    // ─── Construction du filtre SQL ──────────────────────────────────────────
    // `baseFilters` exclut volontairement l'onglet de paiement : il sert aussi à
    // calculer les compteurs de chaque onglet sur le même périmètre.
    const baseFilters: Prisma.orderWhereInput[] = [];

    if (search) {
        const digits = search.replace(/\D/g, '');
        const or: Prisma.orderWhereInput[] = [
            { customerName: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
        ];
        if (digits) or.push({ id: Number(digits) });
        baseFilters.push({ OR: or });
    }

    if (statusFilter !== 'TOUS') {
        baseFilters.push({ status: { in: statusDbValues(statusFilter) } });
    }

    if (from || to) {
        baseFilters.push({
            createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
            },
        });
    }

    const baseWhere: Prisma.orderWhereInput = baseFilters.length ? { AND: baseFilters } : {};
    const where: Prisma.orderWhereInput =
        paymentFilter === 'TOUTES'
            ? baseWhere
            : { AND: [...baseFilters, PAYMENT_CONDITIONS[paymentFilter]] };

    // ─── Compteurs d'onglets + total filtré ──────────────────────────────────
    const [total, settledCount, pendingCount, refundedCount, allCount] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.count({ where: { AND: [...baseFilters, PAYMENT_CONDITIONS.REGLEES] } }),
        prisma.order.count({ where: { AND: [...baseFilters, PAYMENT_CONDITIONS.ATTENTE] } }),
        prisma.order.count({ where: { AND: [...baseFilters, PAYMENT_CONDITIONS.REMBOURSEES] } }),
        prisma.order.count({ where: baseWhere }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    // Une page hors bornes (filtre resserré depuis un lien) retombe sur la première.
    const requestedPage = Number(params.page) || 1;
    const currentPage = requestedPage < 1 || requestedPage > totalPages ? 1 : requestedPage;

    const dbOrders = await prisma.order.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (currentPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
            orderitem: {
                include: { product: { select: { imageUrl: true } } },
            },
            payment: {
                select: { reference: true, status: true, providerRef: true, attempts: true, paidAt: true },
            },
        },
    });

    // Transformation pour garder la compatibilité avec le composant client :
    // le visuel d'une ligne de commande vient du produit lié.
    const orders = dbOrders.map((order) => {
        const { orderitem, ...rest } = order;
        return {
            ...rest,
            createdAt: order.createdAt.toISOString(),
            cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
            items: orderitem.map((item) => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: item.product?.imageUrl ?? null,
            })),
        };
    });

    return (
        <OrdersListClient
            orders={orders}
            counts={{
                settled: settledCount,
                pending: pendingCount,
                refunded: refundedCount,
                all: allCount,
                filtered: total,
            }}
            page={currentPage}
            totalPages={totalPages}
            pageSize={PAGE_SIZE}
            filters={{
                search,
                payment: paymentFilter,
                status: statusFilter,
                from: params.du || '',
                to: params.au || '',
            }}
        />
    );
}
