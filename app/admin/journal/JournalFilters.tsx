'use client';

// app/admin/journal/JournalFilters.tsx
// Filtres du journal d'audit. Comme ailleurs dans le back-office, l'état vit dans
// l'URL : une recherche « qui a supprimé ce produit le 3 août » se partage par
// simple copier-coller du lien.

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarRange, ChevronLeft, ChevronRight, RotateCcw, Search } from 'lucide-react';
import { AUDIT_ENTITIES } from '@/lib/admin/audit';

export interface JournalFilterState {
    entity: string;
    actor: string;
    search: string;
    from: string;
    to: string;
}

export default function JournalFilters({
    filters, actors, total, page, pageSize,
}: {
    filters: JournalFilterState;
    actors: string[];
    total: number;
    page: number;
    pageSize: number;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [term, setTerm] = useState(filters.search);

    const applyParams = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(updates)) {
            if (!value) params.delete(key);
            else params.set(key, value);
        }
        // Tout changement de filtre ramène à la première page.
        if (!('page' in updates)) params.delete('page');
        startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (term.trim() !== filters.search) applyParams({ q: term.trim() || null });
        }, 400);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [term]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const hasFilters = Boolean(filters.search || filters.from || filters.to || filters.actor) || filters.entity !== 'TOUS';

    const tabs = [{ key: 'TOUS', label: 'Tout' }, ...AUDIT_ENTITIES.map((e) => ({ key: e.key, label: e.label }))];

    return (
        <div className={`space-y-3 transition-opacity ${isPending ? 'opacity-60' : ''}`}>
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                <div className="inline-flex max-w-full overflow-x-auto bg-white border border-gray-100 rounded-full p-1 shadow-sm self-start">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => applyParams({ objet: tab.key === 'TOUS' ? null : tab.key })}
                            className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all ${
                                filters.entity === tab.key ? 'bg-[#28a745] text-white shadow-sm' : 'text-gray-500 hover:text-[#2c3e50]'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:max-w-xs">
                    <input
                        type="text"
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        placeholder="Rechercher une cible, un détail, une action…"
                        className="w-full bg-white border border-gray-100 rounded-full py-2.5 pl-11 pr-4 text-xs font-medium text-gray-600 focus:outline-none focus:border-[#28a745] transition-all shadow-sm"
                    />
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Auteur</span>
                    <select
                        value={filters.actor}
                        onChange={(e) => applyParams({ auteur: e.target.value || null })}
                        className="text-[11px] font-bold text-[#2c3e50] bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5 outline-none focus:ring-1 focus:ring-[#28a745] cursor-pointer max-w-[220px]"
                    >
                        <option value="">Tous les administrateurs</option>
                        {actors.map((a) => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                </div>

                <span className="hidden sm:block w-px h-5 bg-gray-100" />

                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <CalendarRange size={13} /> Période
                    </span>
                    <input
                        type="date"
                        value={filters.from}
                        max={filters.to || undefined}
                        onChange={(e) => applyParams({ du: e.target.value || null })}
                        className="text-[11px] font-bold text-[#2c3e50] bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5 outline-none focus:ring-1 focus:ring-[#28a745]"
                        aria-label="Date de début"
                    />
                    <span className="text-[10px] font-bold text-gray-300">→</span>
                    <input
                        type="date"
                        value={filters.to}
                        min={filters.from || undefined}
                        onChange={(e) => applyParams({ au: e.target.value || null })}
                        className="text-[11px] font-bold text-[#2c3e50] bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5 outline-none focus:ring-1 focus:ring-[#28a745]"
                        aria-label="Date de fin"
                    />
                </div>

                {hasFilters && (
                    <button
                        onClick={() => { setTerm(''); startTransition(() => router.push(pathname, { scroll: false })); }}
                        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-[#28a745] transition-colors"
                    >
                        <RotateCcw size={12} /> Réinitialiser
                    </button>
                )}

                <div className="ml-auto flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 tabular-nums">
                        {total} action{total > 1 ? 's' : ''} · page {page}/{totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            disabled={page <= 1}
                            onClick={() => applyParams({ page: String(page - 1) })}
                            className="p-1.5 text-gray-400 hover:bg-gray-50 border border-gray-100 rounded-lg disabled:opacity-30 transition-all"
                            aria-label="Page précédente"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => applyParams({ page: String(page + 1) })}
                            className="p-1.5 text-gray-400 hover:bg-gray-50 border border-gray-100 rounded-lg disabled:opacity-30 transition-all"
                            aria-label="Page suivante"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
