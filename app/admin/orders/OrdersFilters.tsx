'use client';

// app/admin/orders/OrdersFilters.tsx
// Barre de filtres du carnet de commandes. Tout l'état vit dans l'URL : le filtre
// est partageable, survit au rafraîchissement, et c'est le serveur qui interroge
// la base — l'écran ne charge jamais la totalité des commandes.

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarRange, Download, RotateCcw, Search } from 'lucide-react';
import { ORDER_STATUSES } from '@/lib/order-status';

export interface OrdersFilterState {
    search: string;
    payment: string;
    status: string;
    from: string;
    to: string;
}

export interface OrdersCounts {
    settled: number;
    pending: number;
    refunded: number;
    all: number;
    filtered: number;
}

const PAYMENT_TABS: { key: string; label: string; countKey: keyof OrdersCounts }[] = [
    { key: 'REGLEES', label: 'Réglées', countKey: 'settled' },
    { key: 'ATTENTE', label: 'En attente / Abandon', countKey: 'pending' },
    { key: 'REMBOURSEES', label: 'Remboursées', countKey: 'refunded' },
    { key: 'TOUTES', label: 'Toutes', countKey: 'all' },
];

export default function OrdersFilters({ filters, counts }: { filters: OrdersFilterState; counts: OrdersCounts }) {
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
        // Tout changement de filtre ramène à la première page : rester en page 7
        // d'un résultat qui n'en compte plus que 2 afficherait un écran vide.
        params.delete('page');
        startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
    };

    // Recherche différée : on n'interroge la base qu'une fois la frappe terminée.
    useEffect(() => {
        const timer = setTimeout(() => {
            if (term.trim() !== filters.search) applyParams({ q: term.trim() || null });
        }, 400);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [term]);

    const hasFilters =
        Boolean(filters.search || filters.from || filters.to) ||
        filters.status !== 'TOUS' ||
        filters.payment !== 'REGLEES';

    const reset = () => {
        setTerm('');
        startTransition(() => router.push(pathname, { scroll: false }));
    };

    return (
        <div className={`space-y-3 transition-opacity ${isPending ? 'opacity-60' : ''}`}>

            {/* Onglets de statut de paiement */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                <div className="inline-flex max-w-full overflow-x-auto bg-white border border-gray-100 rounded-full p-1 shadow-sm self-start">
                    {PAYMENT_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => applyParams({ paiement: tab.key })}
                            className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                filters.payment === tab.key ? 'bg-[#28a745] text-white shadow-sm' : 'text-gray-500 hover:text-[#2c3e50]'
                            }`}
                        >
                            {tab.label}
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${filters.payment === tab.key ? 'bg-white/25' : 'bg-gray-100 text-gray-500'}`}>
                                {counts[tab.countKey]}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:max-w-xs">
                    <input
                        type="text"
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        placeholder="Rechercher par nom, email, téléphone ou n°..."
                        className="w-full bg-white border border-gray-100 rounded-full py-2.5 pl-11 pr-4 text-xs font-medium text-gray-600 focus:outline-none focus:border-[#28a745] transition-all shadow-sm"
                    />
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
            </div>

            {/* Étape de traitement + période */}
            <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Traitement</span>
                    <select
                        value={filters.status}
                        onChange={(e) => applyParams({ statut: e.target.value === 'TOUS' ? null : e.target.value })}
                        className="text-[11px] font-bold text-[#2c3e50] bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5 outline-none focus:ring-1 focus:ring-[#28a745] cursor-pointer"
                    >
                        <option value="TOUS">Toutes les étapes</option>
                        {ORDER_STATUSES.map((status) => (
                            <option key={status.key} value={status.key}>
                                {status.label}
                            </option>
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

                <div className="ml-auto flex items-center gap-3">
                    {/* Export CSV de la PÉRIODE affichée. La recherche libre et l'étape de
                        traitement ne sont pas transmises : l'export comptable se raisonne
                        en période et en périmètre d'encaissement, pas en filtre d'écran. */}
                    <a
                        href={`/api/admin/export/ventes?${new URLSearchParams({
                            ...(filters.from ? { du: filters.from } : {}),
                            ...(filters.to ? { au: filters.to } : {}),
                            perimetre: filters.payment === 'REGLEES' ? 'REGLEES' : 'TOUTES',
                        }).toString()}`}
                        download
                        title="Télécharger les ventes de la période au format CSV (Excel)"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#28a745]/10 text-[#28a745] text-[10px] font-black uppercase tracking-wider hover:bg-[#28a745] hover:text-white transition-colors"
                    >
                        <Download size={12} /> Exporter (CSV)
                    </a>

                    {hasFilters && (
                        <button
                            onClick={reset}
                            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-[#28a745] transition-colors"
                        >
                            <RotateCcw size={12} /> Réinitialiser
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
