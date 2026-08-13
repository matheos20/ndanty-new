'use client';

// components/admin/charts/PaymentSplit.tsx
// Part-à-tout des encaissements par passerelle : barre empilée horizontale
// (séparateurs de 2px en couleur de surface) + légende toujours présente.
// La légende porte les montants : c'est elle qui rattrape le contraste faible
// du jaune « À la livraison » sur fond blanc.

import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { ar, percent, seriesColor } from './viz';

interface Slice {
    key: string;
    label: string;
    value: number;
    count: number;
}

/** Texte lisible à l'intérieur d'un aplat : blanc ou encre selon sa luminance. */
function inkOn(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 0.6 ? '#2c3e50' : '#ffffff';
}

export default function PaymentSplit({ slices, rangeLabel }: { slices: Slice[]; rangeLabel: string }) {
    const [hover, setHover] = useState<string | null>(null);
    const total = slices.reduce((s, x) => s + x.value, 0);

    return (
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 h-full flex flex-col">
            <div className="mb-5">
                <h3 className="text-base font-black text-[#2c3e50] flex items-center gap-2">
                    <CreditCard size={16} className="text-[#28a745]" />
                    Répartition des encaissements
                </h3>
                <p className="text-[11px] font-semibold text-gray-400 mt-0.5">Par passerelle · {rangeLabel}</p>
            </div>

            {total === 0 ? (
                <div className="flex-1 flex items-center justify-center py-10">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-300 text-center">
                        Aucun encaissement sur cette période
                    </p>
                </div>
            ) : (
                <>
                    {/* Barre empilée : l'écart de 2px en blanc sépare les segments (jamais un contour) */}
                    <div className="flex gap-[2px] h-8 rounded-full overflow-hidden mb-5">
                        {slices.map((slice, index) => {
                            const share = (slice.value / total) * 100;
                            const color = seriesColor(slice.key, index);
                            const dimmed = hover !== null && hover !== slice.key;
                            return (
                                <div
                                    key={slice.key}
                                    onMouseEnter={() => setHover(slice.key)}
                                    onMouseLeave={() => setHover(null)}
                                    title={`${slice.label} — ${ar(slice.value)}`}
                                    className="flex items-center justify-center transition-opacity duration-200 cursor-default"
                                    style={{
                                        width: `${share}%`,
                                        backgroundColor: color,
                                        opacity: dimmed ? 0.35 : 1,
                                    }}
                                >
                                    {/* Étiquette interne uniquement si elle tient confortablement */}
                                    {share >= 14 && (
                                        <span className="text-[10px] font-black tabular-nums" style={{ color: inkOn(color) }}>
                                            {percent(share)}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Légende — canal d'identité fiable, jamais la couleur seule */}
                    <ul className="space-y-2.5">
                        {slices.map((slice, index) => {
                            const share = (slice.value / total) * 100;
                            const highlighted = hover === slice.key;
                            return (
                                <li
                                    key={slice.key}
                                    onMouseEnter={() => setHover(slice.key)}
                                    onMouseLeave={() => setHover(null)}
                                    className={`flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 -mx-2 transition-colors ${
                                        highlighted ? 'bg-gray-50' : ''
                                    }`}
                                >
                                    <span className="flex items-center gap-2.5 min-w-0">
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seriesColor(slice.key, index) }} />
                                        <span className="text-xs font-bold text-[#2c3e50] truncate">{slice.label}</span>
                                        <span className="text-[10px] font-semibold text-gray-400 whitespace-nowrap">
                                            {slice.count} cmd
                                        </span>
                                    </span>
                                    <span className="text-right whitespace-nowrap">
                                        <span className="block text-xs font-black text-[#2c3e50] tabular-nums">{ar(slice.value)}</span>
                                        <span className="block text-[10px] font-bold text-gray-400 tabular-nums">{percent(share, 1)}</span>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </section>
    );
}
