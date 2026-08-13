// app/admin/journal/page.tsx
// Journal d'audit du back-office + exports comptables.
//
// Le journal répond à une seule question, mais elle est décisive quand un produit
// disparaît ou qu'un statut change tout seul : QUI a fait QUOI, et QUAND.

import { redirect } from 'next/navigation';
import { ensureAdmin } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { listAuditLogs, listAuditActors, getEntityDef, getActionTone, AUDIT_ENTITIES } from '@/lib/admin/audit';
import { Activity, ScrollText, ShieldCheck, UserCog, Inbox } from 'lucide-react';
import JournalFilters from './JournalFilters';
import ExportPanel from './ExportPanel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE_SIZE = 25;

interface PageProps {
    searchParams: Promise<{ objet?: string; auteur?: string; q?: string; du?: string; au?: string; page?: string }>;
}

/** Borne de date issue d'un `<input type="date">` ; `null` si la saisie est invalide. */
function parseDate(raw: string | undefined, endOfDay: boolean): Date | null {
    if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    const [year, month, day] = raw.split('-').map(Number);
    const date = new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    return Number.isNaN(date.getTime()) ? null : date;
}

/** Rend lisible le détail structuré stocké en JSON. */
function formatMetadata(raw: string | null): [string, string][] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        return Object.entries(parsed).map(([k, v]) => [
            k,
            v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v),
        ]);
    } catch {
        return [['détail', raw]];
    }
}

export default async function AdminJournalPage({ searchParams }: PageProps) {
    // Le journal expose l'activité de tous les gestionnaires : accès administrateur.
    const guard = await ensureAdmin();
    if (!guard.ok) redirect('/login');

    const params = await searchParams;
    const entity = params.objet && AUDIT_ENTITIES.some((e) => e.key === params.objet) ? params.objet : 'TOUS';
    const actor = params.auteur || '';
    const search = (params.q || '').trim();
    const from = parseDate(params.du, false);
    const to = parseDate(params.au, true);
    const page = Math.max(1, Number.parseInt(params.page || '1', 10) || 1);

    const since = new Date();
    since.setDate(since.getDate() - 7);

    const [{ entries, total }, actors, totalAll, last7Days, distinctActors] = await Promise.all([
        listAuditLogs({ entity, actor, search, from, to, page, pageSize: PAGE_SIZE }),
        listAuditActors(),
        prisma.auditlog.count(),
        prisma.auditlog.count({ where: { createdAt: { gte: since } } }),
        prisma.auditlog.groupBy({ by: ['actorEmail'] }),
    ]);

    const stats = [
        { label: 'Actions tracées', value: totalAll, color: 'bg-[#2c3e50]', icon: <ScrollText size={18} /> },
        { label: 'Ces 7 derniers jours', value: last7Days, color: 'bg-[#28a745]', icon: <Activity size={18} /> },
        { label: 'Gestionnaires actifs', value: distinctActors.length, color: 'bg-blue-500', icon: <UserCog size={18} /> },
    ];

    return (
        <div className="space-y-6 p-5 sm:p-8 max-w-6xl mx-auto animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-white p-5 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
                <h2 className="text-2xl font-bold text-[#2c3e50]">Journal &amp; exports</h2>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-semibold">
                    Qui a fait quoi dans le back-office, et extraction comptable des ventes
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                    {stats.map((s, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-gray-50/60 rounded-2xl border border-gray-100">
                            <div className={`p-3 rounded-xl text-white ${s.color}`}>{s.icon}</div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{s.label}</p>
                                <p className="text-xl font-black text-[#2c3e50]">{s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <ExportPanel />

            {/* Journal */}
            <div className="space-y-4">
                <JournalFilters
                    filters={{ entity, actor, search, from: params.du || '', to: params.au || '' }}
                    actors={actors}
                    total={total}
                    page={page}
                    pageSize={PAGE_SIZE}
                />

                {entries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-16 bg-white rounded-3xl border border-dashed border-gray-100">
                        <div className="p-4 bg-gray-50 rounded-full text-gray-300 mb-4">
                            {totalAll === 0 ? <ShieldCheck size={44} /> : <Inbox size={44} />}
                        </div>
                        <h3 className="text-lg font-bold text-[#2c3e50]">
                            {totalAll === 0 ? 'Le journal démarre maintenant' : 'Aucune action ne correspond'}
                        </h3>
                        <p className="text-gray-400 mt-2 text-center max-w-md text-sm">
                            {totalAll === 0
                                ? 'Chaque modification du catalogue, des commandes, des devis, des avis ou des comptes viendra désormais s’inscrire ici, avec son auteur.'
                                : 'Élargissez la période ou changez d’objet pour retrouver l’action recherchée.'}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
                        {entries.map((e) => {
                            const entityDef = getEntityDef(e.entity);
                            const tone = getActionTone(e.action);
                            const meta = formatMetadata(e.metadata);

                            return (
                                <div key={e.id} className="p-5 hover:bg-gray-50/40 transition-colors">
                                    <div className="flex items-start justify-between gap-4 flex-wrap">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${entityDef.badge}`}>
                                                    {entityDef.label}
                                                </span>
                                                <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${tone.className}`}>
                                                    {e.action}
                                                </span>
                                                {e.label && (
                                                    <span className="text-xs font-black text-[#2c3e50] truncate">{e.label}</span>
                                                )}
                                            </div>

                                            {e.summary && (
                                                <p className="text-[13px] text-gray-600 font-medium mt-1.5 leading-relaxed">{e.summary}</p>
                                            )}

                                            {meta.length > 0 && (
                                                <details className="mt-2 group">
                                                    <summary className="cursor-pointer text-[10px] font-black uppercase tracking-wider text-gray-300 hover:text-[#28a745] transition-colors list-none">
                                                        Détail technique
                                                    </summary>
                                                    <div className="mt-2 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 space-y-1">
                                                        {meta.map(([k, v]) => (
                                                            <p key={k} className="text-[11px] font-mono text-gray-500 break-all">
                                                                <span className="text-gray-400">{k} :</span> {v}
                                                            </p>
                                                        ))}
                                                    </div>
                                                </details>
                                            )}
                                        </div>

                                        <div className="text-right shrink-0">
                                            <p className="text-[11px] font-black text-[#2c3e50]">{e.actorEmail}</p>
                                            <p className="text-[10px] font-semibold text-gray-400 mt-0.5">
                                                {new Date(e.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                {' à '}
                                                {new Date(e.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
