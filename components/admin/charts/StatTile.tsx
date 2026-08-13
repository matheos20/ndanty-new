// components/admin/charts/StatTile.tsx
// Tuile d'indicateur : libellé · valeur · variation signée face à la période
// précédente. Le chiffre est la forme correcte ici — pas un graphique à une barre.

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { delta as formatDelta } from './viz';

export default function StatTile({
    label,
    value,
    change,
    comparison,
    icon,
    accent = 'bg-[#28a745]',
    hero = false,
}: {
    label: string;
    value: string;
    /** Variation en % (`null` : pas de base de comparaison). `undefined` : aucune variation à afficher. */
    change?: number | null;
    comparison?: string;
    icon: React.ReactNode;
    accent?: string;
    /** Met la valeur en avant (chiffre phare du tableau de bord). */
    hero?: boolean;
}) {
    const neutral = change === null || change === undefined || Math.abs(change) < 0.05;
    const positive = !neutral && (change as number) > 0;

    return (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className={`p-2.5 rounded-xl text-white ${accent}`}>{icon}</div>

                {change !== undefined && (
                    <span
                        className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full whitespace-nowrap ${
                            neutral
                                ? 'bg-gray-50 text-gray-400'
                                : positive
                                    ? 'bg-green-50 text-[#1e7e34]'
                                    : 'bg-red-50 text-[#d03b3b]'
                        }`}
                    >
                        {neutral ? <Minus size={11} /> : positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                        {formatDelta(change ?? null)}
                    </span>
                )}
            </div>

            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{label}</p>
            <p className={`font-black text-[#2c3e50] mt-1 ${hero ? 'text-3xl sm:text-4xl' : 'text-2xl'}`}>{value}</p>

            {comparison && <p className="text-[10px] font-semibold text-gray-400 mt-1.5">{comparison}</p>}
        </div>
    );
}
