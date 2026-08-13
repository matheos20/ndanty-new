// lib/admin/export.ts
// Exports CSV du back-office — ventes, lignes de vente, transactions, clients, journal.
//
// Format retenu : séparateur « ; », virgule décimale et BOM UTF-8. C'est ce
// qu'attend Excel en configuration française : un fichier séparé par des virgules
// s'ouvrirait sur une seule colonne et des montants illisibles.

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { getStatusDef, normalizeStatus } from '@/lib/order-status';
import { buildAuditWhere } from '@/lib/admin/audit';

/** Statuts de paiement considérés comme encaissés — même règle que le tableau de bord. */
const SETTLED_PAYMENTS = new Set(['PAID', 'A_LA_LIVRAISON']);

export const EXPORT_DATASETS = [
    { key: 'ventes', label: 'Ventes', help: 'Une ligne par commande : client, montants, livraison, statuts, paiement.' },
    { key: 'lignes', label: 'Lignes de vente', help: 'Une ligne par article vendu — base du journal comptable et des marges.' },
    { key: 'transactions', label: 'Transactions', help: 'Journal des encaissements : passerelle, référence, statut, date de règlement.' },
    { key: 'clients', label: 'Clients', help: 'Fichier clients avec chiffre d’affaires cumulé et dernière commande.' },
    { key: 'journal', label: 'Journal d’audit', help: 'Toutes les actions d’administration tracées, avec leur auteur.' },
] as const;

export type ExportDataset = typeof EXPORT_DATASETS[number]['key'];

export function isExportDataset(value: string): value is ExportDataset {
    return EXPORT_DATASETS.some((d) => d.key === value);
}

// ─── Formatage ───────────────────────────────────────────────────────────────

/** Échappe une cellule : guillemets doublés, et toujours entre guillemets si besoin. */
function cell(value: unknown): string {
    if (value === null || value === undefined) return '';
    const text = String(value);
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Montant en Ariary : virgule décimale, sans séparateur de milliers (Excel s'en charge). */
function amount(value: number | null | undefined): string {
    if (value === null || value === undefined) return '';
    return value.toFixed(2).replace('.', ',');
}

/** Date lisible ET triable : « 06/08/2026 14:32 ». */
function dateTime(d: Date | null | undefined): string {
    if (!d) return '';
    return `${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

function dateOnly(d: Date | null | undefined): string {
    return d ? d.toLocaleDateString('fr-FR') : '';
}

/** Assemble un CSV complet, BOM compris. */
export function toCsv(headers: string[], rows: unknown[][]): string {
    const lines = [headers.map(cell).join(';'), ...rows.map((r) => r.map(cell).join(';'))];
    // BOM explicite : sans lui, Excel affiche des accents illisibles dans les en-tetes.
    return `\uFEFF${lines.join('\r\n')}\r\n`;
}

/** Nom de fichier horodaté et lisible : ndanty_ventes_2026-08-06.csv */
export function exportFilename(dataset: string, from?: Date | null, to?: Date | null): string {
    const stamp = (d: Date) => d.toISOString().slice(0, 10);
    const period = from || to
        ? `_${from ? stamp(from) : 'debut'}_${to ? stamp(to) : 'fin'}`
        : `_${stamp(new Date())}`;
    return `ndanty_${dataset}${period}.csv`;
}

// ─── Filtres partagés ────────────────────────────────────────────────────────

export interface ExportFilters {
    from?: Date | null;
    to?: Date | null;
    /** Périmètre de paiement : REGLEES (défaut) | TOUTES */
    scope?: 'REGLEES' | 'TOUTES';
    /** Filtres propres au journal d'audit. */
    entity?: string;
    actor?: string;
    search?: string;
}

function orderWhere(filters: ExportFilters): Prisma.orderWhereInput {
    const where: Prisma.orderWhereInput = {};
    if (filters.from || filters.to) {
        where.createdAt = {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
        };
    }
    // Par défaut on n'exporte que ce qui est réellement encaissé : un export
    // comptable ne doit pas contenir de paniers abandonnés.
    if (filters.scope !== 'TOUTES') {
        where.paymentStatus = { in: [...SETTLED_PAYMENTS] };
    }
    return where;
}

// ─── Jeux de données ─────────────────────────────────────────────────────────

async function buildSales(filters: ExportFilters) {
    const orders = await prisma.order.findMany({
        where: orderWhere(filters),
        orderBy: { createdAt: 'asc' },
        include: {
            orderitem: { select: { quantity: true } },
            payment: { select: { reference: true, status: true, paidAt: true, providerRef: true } },
        },
    });

    const headers = [
        'N° commande', 'Date', 'Client', 'E-mail', 'Téléphone', 'Zone de livraison',
        'Montant articles (Ar)', 'Frais de livraison (Ar)', 'Montant total (Ar)',
        'Étape de traitement', 'Statut du paiement', 'Moyen de paiement',
        'Référence transaction', 'Encaissé le', 'Nb articles', 'Compte dans le CA',
    ];

    const rows = orders.map((o) => {
        const fee = o.deliveryFee || 0;
        const settled = SETTLED_PAYMENTS.has((o.paymentStatus || '').toUpperCase())
            && normalizeStatus(o.status) !== 'ANNULEE';
        return [
            o.id,
            dateTime(o.createdAt),
            o.customerName,
            o.email,
            o.phone,
            o.deliveryZone || '',
            amount(o.totalAmount - fee),
            amount(fee),
            amount(o.totalAmount),
            getStatusDef(o.status).label,
            o.paymentStatus || '',
            o.paymentMethod || '',
            o.payment?.reference || o.paymentRef || '',
            dateTime(o.payment?.paidAt),
            o.orderitem.reduce((s, i) => s + i.quantity, 0),
            settled ? 'Oui' : 'Non',
        ];
    });

    // Ligne de totaux : un export comptable doit se recouper d'un coup d'œil.
    const revenue = orders
        .filter((o) => SETTLED_PAYMENTS.has((o.paymentStatus || '').toUpperCase()) && normalizeStatus(o.status) !== 'ANNULEE')
        .reduce((s, o) => s + o.totalAmount, 0);
    rows.push([
        'TOTAL', '', `${orders.length} commande(s)`, '', '', '',
        '', '', amount(revenue), '', '', '', '', '', '', 'CA encaissé',
    ]);

    return { headers, rows };
}

async function buildSalesLines(filters: ExportFilters) {
    const items = await prisma.orderitem.findMany({
        where: { order: orderWhere(filters) },
        orderBy: { orderId: 'asc' },
        include: {
            order: { select: { id: true, createdAt: true, customerName: true, paymentStatus: true, paymentMethod: true, status: true } },
            product: { select: { category: true, subcategory: true } },
        },
    });

    const headers = [
        'N° commande', 'Date', 'Client', 'Produit', 'Catégorie', 'Sous-catégorie',
        'Quantité', 'Prix unitaire (Ar)', 'Total ligne (Ar)', 'Moyen de paiement', 'Étape de traitement',
    ];

    const rows = items.map((i) => [
        i.order.id,
        dateTime(i.order.createdAt),
        i.order.customerName,
        i.name,
        i.product?.category || '',
        i.product?.subcategory || '',
        i.quantity,
        amount(i.price),
        amount(i.price * i.quantity),
        i.order.paymentMethod || '',
        getStatusDef(i.order.status).label,
    ]);

    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    rows.push(['TOTAL', '', '', `${items.length} ligne(s)`, '', '', items.reduce((s, i) => s + i.quantity, 0), '', amount(total), '', '']);

    return { headers, rows };
}

async function buildPayments(filters: ExportFilters) {
    const where: Prisma.paymentWhereInput = {};
    if (filters.from || filters.to) {
        where.createdAt = {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
        };
    }
    if (filters.scope !== 'TOUTES') where.status = 'PAID';

    const payments = await prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        include: { order: { select: { customerName: true, email: true } } },
    });

    const headers = [
        'Référence', 'N° commande', 'Client', 'E-mail', 'Passerelle', 'Statut',
        'Montant', 'Devise', 'Créée le', 'Encaissée le', 'Référence passerelle', 'Tentatives', 'Environnement',
    ];

    const rows = payments.map((p) => [
        p.reference,
        p.orderId,
        p.order?.customerName || '',
        p.order?.email || '',
        p.method,
        p.status,
        amount(p.amount),
        p.currency,
        dateTime(p.createdAt),
        dateTime(p.paidAt),
        p.providerRef || '',
        p.attempts,
        p.isSandbox ? 'Sandbox' : 'Production',
    ]);

    const encaisse = payments.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
    rows.push(['TOTAL', '', `${payments.length} transaction(s)`, '', '', 'PAID', amount(encaisse), 'MGA', '', '', '', '', '']);

    return { headers, rows };
}

async function buildCustomers(filters: ExportFilters) {
    const users = await prisma.user.findMany({
        where: { role: { not: 'ADMIN' } },
        orderBy: { createdAt: 'asc' },
        select: {
            id: true, firstName: true, lastName: true, email: true, address: true,
            country: true, role: true, createdAt: true, provider: true,
            order: {
                where: filters.from || filters.to
                    ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
                    : undefined,
                select: { totalAmount: true, paymentStatus: true, status: true, createdAt: true },
            },
        },
    });

    const headers = [
        'ID', 'Prénom', 'Nom', 'E-mail', 'Adresse', 'Pays', 'Statut du compte',
        'Mode de connexion', 'Inscrit le', 'Commandes réglées', 'CA cumulé (Ar)', 'Dernière commande',
    ];

    const rows = users.map((u) => {
        const settled = u.order.filter(
            (o) => SETTLED_PAYMENTS.has((o.paymentStatus || '').toUpperCase()) && normalizeStatus(o.status) !== 'ANNULEE',
        );
        const revenue = settled.reduce((s, o) => s + o.totalAmount, 0);
        const last = settled.length ? new Date(Math.max(...settled.map((o) => o.createdAt.getTime()))) : null;
        return [
            u.id, u.firstName || '', u.lastName || '', u.email, u.address || '', u.country || '',
            u.role, u.provider === 'google' ? 'Google' : 'Mot de passe',
            dateOnly(u.createdAt), settled.length, amount(revenue), dateOnly(last),
        ];
    });

    return { headers, rows };
}

async function buildAudit(filters: ExportFilters) {
    const entries = await prisma.auditlog.findMany({
        where: buildAuditWhere({
            entity: filters.entity,
            actor: filters.actor,
            search: filters.search,
            from: filters.from,
            to: filters.to,
        }),
        orderBy: { createdAt: 'desc' },
        take: 5000,
    });

    const headers = ['Date', 'Auteur', 'Action', 'Objet', 'Identifiant', 'Cible', 'Détail'];
    const rows = entries.map((e) => [
        dateTime(e.createdAt), e.actorEmail, e.action, e.entity, e.entityId || '', e.label || '', e.summary || '',
    ]);
    return { headers, rows };
}

/** Fabrique le CSV d'un jeu de données. */
export async function buildExport(dataset: ExportDataset, filters: ExportFilters): Promise<string> {
    const builders = {
        ventes: buildSales,
        lignes: buildSalesLines,
        transactions: buildPayments,
        clients: buildCustomers,
        journal: buildAudit,
    } as const;

    const { headers, rows } = await builders[dataset](filters);
    return toCsv(headers, rows);
}
