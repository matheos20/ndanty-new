// components/admin/charts/ConversionMeter.tsx
// Ratio unique face à un total : un compteur, pas un camembert à deux parts.
// Le fond non rempli est un pas clair de la MÊME rampe verte, pour que l'état
// se lise sur toute la largeur de la barre.

import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { percent } from './viz';

export default function ConversionMeter({
    total,
    accepted,
    refused,
    pending,
    conversion,
    rangeLabel,
}: {
    total: number;
    accepted: number;
    refused: number;
    pending: number;
    conversion: number;
    rangeLabel: string;
}) {
    return (
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 h-full flex flex-col">
            <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                    <h3 className="text-base font-black text-[#2c3e50] flex items-center gap-2">
                        <ClipboardList size={16} className="text-[#28a745]" />
                        Conversion des devis
                    </h3>
                    <p className="text-[11px] font-semibold text-gray-400 mt-0.5">Sur mesure · {rangeLabel}</p>
                </div>
                <Link href="/admin/quotes" className="text-[10px] font-black uppercase tracking-wider text-[#28a745] hover:text-[#2c3e50] transition-colors whitespace-nowrap">
                    Voir →
                </Link>
            </div>

            {total === 0 ? (
                <div className="flex-1 flex items-center justify-center py-10">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-300 text-center">
                        Aucune demande sur cette période
                    </p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col justify-between gap-5">
                    <div>
                        <p className="text-3xl font-black text-[#2c3e50]">{percent(conversion, 1)}</p>
                        <p className="text-[11px] font-semibold text-gray-400 mt-0.5">
                            {accepted} devis accepté{accepted > 1 ? 's' : ''} sur {total} demande{total > 1 ? 's' : ''}
                        </p>

                        <div className="h-2.5 rounded-full bg-[#e4f4ea] overflow-hidden mt-4">
                            <div
                                className="h-full bg-[#28a745] rounded-r-[4px] transition-all duration-500"
                                style={{ width: `${Math.min(Math.max(conversion, 0), 100)}%` }}
                            />
                        </div>
                    </div>

                    <ul className="grid grid-cols-3 gap-2 text-center">
                        {[
                            { label: 'Acceptés', value: accepted, text: 'text-[#1e7e34]', surface: 'bg-green-50' },
                            { label: 'En attente', value: pending, text: 'text-gray-500', surface: 'bg-gray-50' },
                            { label: 'Refusés', value: refused, text: 'text-[#d03b3b]', surface: 'bg-red-50' },
                        ].map((cell) => (
                            <li key={cell.label} className={`rounded-2xl py-2.5 ${cell.surface}`}>
                                <span className={`block text-lg font-black ${cell.text}`}>{cell.value}</span>
                                <span className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mt-0.5">{cell.label}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
