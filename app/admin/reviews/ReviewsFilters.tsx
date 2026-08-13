'use client';

// app/admin/reviews/ReviewsFilters.tsx
// Barre de pilotage de la file de modération. L'état vit dans l'URL (comme le
// carnet de commandes) : le filtre est partageable, survit au rafraîchissement,
// et c'est la base qui filtre — jamais le navigateur.

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CheckCheck, Loader2, RotateCcw, Search } from 'lucide-react';
import { REVIEW_STATUSES, type ReviewStatusKey } from '@/lib/review-status';
import { useAdminNotifications } from '@/components/admin/AdminNotifications';
import { approveAllPendingReviews } from './actions';

export interface ReviewsCounts {
    PENDING: number;
    APPROVED: number;
    REJECTED: number;
    ALL: number;
}

export default function ReviewsFilters({
    status,
    search,
    counts,
}: {
    status: ReviewStatusKey | 'ALL';
    search: string;
    counts: ReviewsCounts;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const { refresh: refreshNotifications } = useAdminNotifications();
    const [term, setTerm] = useState(search);
    const [bulkPending, setBulkPending] = useState(false);

    const applyParams = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(updates)) {
            if (!value) params.delete(key);
            else params.set(key, value);
        }
        startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
    };

    // Recherche différée : on n'interroge la base qu'une fois la frappe terminée.
    useEffect(() => {
        const timer = setTimeout(() => {
            if (term.trim() !== search) applyParams({ q: term.trim() || null });
        }, 400);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [term]);

    const approveAll = async () => {
        if (!confirm(
            `Publier les ${counts.PENDING} avis en attente ?\n\n` +
            'Ils deviendront tous visibles immédiatement sur les fiches produits.'
        )) return;

        setBulkPending(true);
        const result = await approveAllPendingReviews();
        setBulkPending(false);

        if (!result.success) {
            alert(result.error || 'Approbation groupée impossible.');
            return;
        }
        router.refresh();
        refreshNotifications();
    };

    const tabs: { key: ReviewStatusKey | 'ALL'; label: string }[] = [
        ...REVIEW_STATUSES.map((s) => ({ key: s.key as ReviewStatusKey | 'ALL', label: s.tab })),
        { key: 'ALL', label: 'Tous' },
    ];

    const hasFilters = status !== 'PENDING' || Boolean(search);

    return (
        <div className={`space-y-3 transition-opacity ${isPending ? 'opacity-60' : ''}`}>
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                <div className="inline-flex max-w-full overflow-x-auto bg-white border border-gray-100 rounded-full p-1 shadow-sm self-start">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => applyParams({ statut: tab.key === 'PENDING' ? null : tab.key })}
                            className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                status === tab.key ? 'bg-[#28a745] text-white shadow-sm' : 'text-gray-500 hover:text-[#2c3e50]'
                            }`}
                        >
                            {tab.label}
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full tabular-nums ${
                                status === tab.key ? 'bg-white/25' : 'bg-gray-100 text-gray-500'
                            }`}>
                                {counts[tab.key]}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:max-w-xs">
                    <input
                        type="text"
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        placeholder="Rechercher un client, un produit, un mot…"
                        className="w-full bg-white border border-gray-100 rounded-full py-2.5 pl-11 pr-4 text-xs font-medium text-gray-600 focus:outline-none focus:border-[#28a745] transition-all shadow-sm"
                    />
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
            </div>

            {(counts.PENDING > 0 || hasFilters) && (
                <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
                    {counts.PENDING > 0 && (
                        <>
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                {counts.PENDING} avis attend{counts.PENDING > 1 ? 'ent' : ''} votre décision
                            </span>
                            <button
                                onClick={approveAll}
                                disabled={bulkPending}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#28a745]/10 text-[#28a745] text-[10px] font-black uppercase tracking-wider hover:bg-[#28a745] hover:text-white transition-colors disabled:opacity-50"
                            >
                                {bulkPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
                                Tout approuver
                            </button>
                        </>
                    )}

                    {hasFilters && (
                        <button
                            onClick={() => { setTerm(''); startTransition(() => router.push(pathname, { scroll: false })); }}
                            className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-[#28a745] transition-colors"
                        >
                            <RotateCcw size={12} /> Revenir à la file d&apos;attente
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
