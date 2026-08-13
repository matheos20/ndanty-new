// lib/admin/audit.ts
// Journal d'audit du back-office : qui a fait quoi, sur quoi, et quand.
//
// Deux principes tiennent tout le fichier :
//  1. Une écriture d'audit ne doit JAMAIS faire échouer l'action métier qu'elle
//     accompagne. `recordAudit` avale ses erreurs et se contente de les tracer.
//  2. On journalise ce qui MODIFIE la boutique. Les consultations ne laissent pas
//     de trace : un journal noyé sous les lectures ne se relit plus.

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/guards';

/** Familles d'objets suivies par le journal. */
export const AUDIT_ENTITIES = [
    { key: 'product', label: 'Produits', badge: 'bg-blue-50 text-blue-600' },
    { key: 'category', label: 'Catégories', badge: 'bg-indigo-50 text-indigo-600' },
    { key: 'order', label: 'Commandes', badge: 'bg-[#28a745]/10 text-[#28a745]' },
    { key: 'payment', label: 'Paiements', badge: 'bg-purple-50 text-purple-600' },
    { key: 'quote', label: 'Devis', badge: 'bg-amber-50 text-amber-600' },
    { key: 'review', label: 'Avis', badge: 'bg-pink-50 text-pink-600' },
    { key: 'user', label: 'Comptes', badge: 'bg-red-50 text-red-600' },
] as const;

export type AuditEntity = typeof AUDIT_ENTITIES[number]['key'];

export function getEntityDef(entity: string) {
    return AUDIT_ENTITIES.find((e) => e.key === entity)
        || { key: entity, label: entity, badge: 'bg-gray-100 text-gray-500' };
}

/**
 * Nature de l'action, déduite du suffixe de la clé. Sert à colorer le journal :
 * une suppression ne doit pas se lire comme une création.
 */
export function getActionTone(action: string): { label: string; className: string } {
    const verb = action.split('.').pop() || '';
    if (['delete', 'cancel', 'reject', 'suspend'].includes(verb)) {
        return { label: 'Suppression / retrait', className: 'bg-red-50 text-red-600 border-red-100' };
    }
    if (['create', 'approve', 'restore'].includes(verb)) {
        return { label: 'Création / validation', className: 'bg-[#28a745]/10 text-[#28a745] border-[#28a745]/20' };
    }
    return { label: 'Modification', className: 'bg-amber-50 text-amber-600 border-amber-100' };
}

export interface AuditInput {
    /** Clé canonique « entité.verbe », ex. « product.delete ». */
    action: string;
    entity: AuditEntity;
    entityId?: number | string | null;
    /** Désignation lisible de la cible (nom du produit, « CMD #42 »…). */
    label?: string | null;
    /** Phrase décrivant ce qui a changé, affichée telle quelle. */
    summary?: string | null;
    /** Détail structuré : valeurs avant/après, motif, options. */
    metadata?: Record<string, unknown> | null;
    /** Auteur, si l'appelant l'a déjà sous la main (évite une relecture de session). */
    actorEmail?: string | null;
}

/**
 * Enregistre une entrée d'audit. À appeler APRÈS la réussite de l'action métier :
 * le journal ne relate que des faits accomplis.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
    try {
        let actorEmail = input.actorEmail || null;
        let actorId: number | null = null;

        if (!actorEmail) {
            const session = await getSession();
            actorEmail = session?.user?.email || null;
        }
        if (actorEmail) {
            const actor = await prisma.user.findUnique({ where: { email: actorEmail }, select: { id: true } });
            actorId = actor?.id ?? null;
        }

        await prisma.auditlog.create({
            data: {
                actorEmail: actorEmail || 'système',
                actorId,
                action: input.action,
                entity: input.entity,
                entityId: input.entityId != null ? String(input.entityId) : null,
                label: input.label ?? null,
                summary: input.summary ?? null,
                metadata: input.metadata ? JSON.stringify(input.metadata) : null,
            },
        });
    } catch (error) {
        // Un journal indisponible ne doit jamais annuler une vente ni bloquer un écran.
        console.error('[audit] Écriture du journal impossible :', error);
    }
}

/** Décrit en une phrase le passage d'une valeur à une autre. */
export function describeChange(field: string, before: unknown, after: unknown): string | null {
    if (String(before ?? '') === String(after ?? '')) return null;
    const fmt = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v));
    return `${field} : ${fmt(before)} → ${fmt(after)}`;
}

export interface AuditFilters {
    entity?: string;
    actor?: string;
    search?: string;
    from?: Date | null;
    to?: Date | null;
    page?: number;
    pageSize?: number;
}

export interface AuditEntry {
    id: number;
    createdAt: Date;
    actorEmail: string;
    action: string;
    entity: string;
    entityId: string | null;
    label: string | null;
    summary: string | null;
    metadata: string | null;
}

/** Construit le filtre Prisma partagé par l'écran du journal et son export CSV. */
export function buildAuditWhere(filters: AuditFilters) {
    const where: Record<string, unknown> = {};
    const and: Record<string, unknown>[] = [];

    if (filters.entity && filters.entity !== 'TOUS') and.push({ entity: filters.entity });
    if (filters.actor) and.push({ actorEmail: filters.actor });
    if (filters.search) {
        and.push({
            OR: [
                { label: { contains: filters.search } },
                { summary: { contains: filters.search } },
                { action: { contains: filters.search } },
                { actorEmail: { contains: filters.search } },
            ],
        });
    }
    if (filters.from || filters.to) {
        and.push({
            createdAt: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
            },
        });
    }
    if (and.length) where.AND = and;
    return where;
}

/** Page du journal + total, pour la pagination serveur. */
export async function listAuditLogs(filters: AuditFilters): Promise<{ entries: AuditEntry[]; total: number }> {
    const pageSize = filters.pageSize ?? 25;
    const page = Math.max(1, filters.page ?? 1);
    const where = buildAuditWhere(filters);

    const [entries, total] = await Promise.all([
        prisma.auditlog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.auditlog.count({ where }),
    ]);

    return { entries, total };
}

/** Liste des administrateurs ayant écrit dans le journal (pour le filtre « auteur »). */
export async function listAuditActors(): Promise<string[]> {
    const rows = await prisma.auditlog.groupBy({ by: ['actorEmail'], orderBy: { actorEmail: 'asc' } });
    return rows.map((r) => r.actorEmail);
}
