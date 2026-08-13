'use client';

// app/admin/journal/ExportPanel.tsx
// Panneau d'export comptable. Une seule période et un seul périmètre pilotent tous
// les fichiers : ventes, lignes de vente, transactions, clients et journal se
// recoupent donc forcément entre eux, ce qui est la première chose que vérifie
// un comptable.

import { useState } from 'react';
import { Download, FileSpreadsheet, Info } from 'lucide-react';
import { EXPORT_DATASETS } from '@/lib/admin/export';

/** Bornes rapides : le comptable raisonne en mois, pas en dates saisies à la main. */
function monthBounds(offset: number): { from: string; to: string } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    const iso = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { from: iso(start), to: iso(end) };
}

function yearBounds(): { from: string; to: string } {
    const y = new Date().getFullYear();
    return { from: `${y}-01-01`, to: `${y}-12-31` };
}

export default function ExportPanel() {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [scope, setScope] = useState<'REGLEES' | 'TOUTES'>('REGLEES');

    const buildUrl = (dataset: string) => {
        const params = new URLSearchParams();
        if (from) params.set('du', from);
        if (to) params.set('au', to);
        params.set('perimetre', scope);
        return `/api/admin/export/${dataset}?${params.toString()}`;
    };

    const presets = [
        { label: 'Ce mois-ci', bounds: monthBounds(0) },
        { label: 'Mois dernier', bounds: monthBounds(-1) },
        { label: 'Année en cours', bounds: yearBounds() },
    ];

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-7 space-y-5">
            <div className="flex items-start gap-3">
                <div className="p-3 rounded-2xl bg-[#28a745]/10 text-[#28a745] shrink-0">
                    <FileSpreadsheet size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-[#2c3e50]">Exports comptables</h3>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                        Fichiers CSV prêts pour Excel — séparateur « ; », virgule décimale, encodage UTF-8.
                    </p>
                </div>
            </div>

            {/* Période et périmètre */}
            <div className="flex flex-wrap items-center gap-3 bg-gray-50/70 border border-gray-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Période</span>
                    <input
                        type="date"
                        value={from}
                        max={to || undefined}
                        onChange={(e) => setFrom(e.target.value)}
                        className="text-[11px] font-bold text-[#2c3e50] bg-white border border-gray-100 rounded-full px-3 py-1.5 outline-none focus:ring-1 focus:ring-[#28a745]"
                        aria-label="Date de début de l'export"
                    />
                    <span className="text-[10px] font-bold text-gray-300">→</span>
                    <input
                        type="date"
                        value={to}
                        min={from || undefined}
                        onChange={(e) => setTo(e.target.value)}
                        className="text-[11px] font-bold text-[#2c3e50] bg-white border border-gray-100 rounded-full px-3 py-1.5 outline-none focus:ring-1 focus:ring-[#28a745]"
                        aria-label="Date de fin de l'export"
                    />
                </div>

                <div className="flex items-center gap-1.5">
                    {presets.map((p) => (
                        <button
                            key={p.label}
                            onClick={() => { setFrom(p.bounds.from); setTo(p.bounds.to); }}
                            className="px-3 py-1.5 rounded-full bg-white border border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-500 hover:text-[#28a745] hover:border-[#28a745]/40 transition-colors"
                        >
                            {p.label}
                        </button>
                    ))}
                    {(from || to) && (
                        <button
                            onClick={() => { setFrom(''); setTo(''); }}
                            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-[#2c3e50] transition-colors"
                        >
                            Tout l&apos;historique
                        </button>
                    )}
                </div>

                <span className="hidden lg:block w-px h-5 bg-gray-200" />

                <div className="inline-flex bg-white border border-gray-100 rounded-full p-1">
                    {([
                        { key: 'REGLEES', label: 'Encaissé' },
                        { key: 'TOUTES', label: 'Tout, paniers compris' },
                    ] as const).map((s) => (
                        <button
                            key={s.key}
                            onClick={() => setScope(s.key)}
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                                scope === s.key ? 'bg-[#28a745] text-white' : 'text-gray-500 hover:text-[#2c3e50]'
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            <p className="flex items-start gap-2 text-[11px] font-semibold text-gray-400">
                <Info size={13} className="shrink-0 mt-0.5 text-gray-300" />
                {scope === 'REGLEES'
                    ? 'Périmètre comptable : seules les commandes réglées (payées ou à la livraison) sont exportées, ligne de totaux comprise.'
                    : 'Périmètre complet : les paniers abandonnés et les paiements refusés sont inclus. À réserver à l’analyse, pas à la comptabilité.'}
            </p>

            {/* Jeux de données */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {EXPORT_DATASETS.map((d) => (
                    <a
                        key={d.key}
                        href={buildUrl(d.key)}
                        download
                        className="group flex flex-col justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 hover:border-[#28a745]/40 hover:shadow-sm transition-all"
                    >
                        <div>
                            <p className="text-xs font-black text-[#2c3e50] group-hover:text-[#28a745] transition-colors">
                                {d.label}
                            </p>
                            <p className="text-[11px] font-medium text-gray-400 mt-1 leading-relaxed">{d.help}</p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#28a745]">
                            <Download size={12} /> Télécharger le CSV
                        </span>
                    </a>
                ))}
            </div>
        </div>
    );
}
