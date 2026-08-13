// components/admin/charts/RankedBars.tsx
// Classement horizontal (meilleures ventes, répartition par catégorie).
// Catégories nominales : une seule teinte pour toutes les barres — la longueur
// porte la valeur, la couleur n'a pas à la ré-encoder. Chaque barre est
// directement étiquetée, donc aucune infobulle n'est nécessaire.

import Link from 'next/link';
import { ar } from './viz';

export interface RankedBarsItem {
    name: string;
    value: number;
    detail: string;
}

export default function RankedBars({
    title,
    subtitle,
    icon,
    items,
    emptyLabel,
    action,
}: {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    items: RankedBarsItem[];
    emptyLabel: string;
    action?: { label: string; href: string };
}) {
    const max = Math.max(...items.map((i) => i.value), 1);

    return (
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 h-full flex flex-col">
            <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                    <h3 className="text-base font-black text-[#2c3e50] flex items-center gap-2">
                        <span className="text-[#28a745]">{icon}</span>
                        {title}
                    </h3>
                    <p className="text-[11px] font-semibold text-gray-400 mt-0.5">{subtitle}</p>
                </div>
                {action && (
                    <Link href={action.href} className="text-[10px] font-black uppercase tracking-wider text-[#28a745] hover:text-[#2c3e50] transition-colors whitespace-nowrap">
                        {action.label} →
                    </Link>
                )}
            </div>

            {items.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-10">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-300 text-center">{emptyLabel}</p>
                </div>
            ) : (
                <ol className="space-y-4">
                    {items.map((item, index) => (
                        <li key={item.name} className="group">
                            <div className="flex items-baseline justify-between gap-4 mb-1.5">
                                <span className="text-xs font-bold text-[#2c3e50] truncate flex items-center gap-2 min-w-0">
                                    <span className="text-[9px] font-black text-gray-300 tabular-nums w-3 shrink-0">{index + 1}</span>
                                    <span className="truncate">{item.name}</span>
                                </span>
                                <span className="text-xs font-black text-[#2c3e50] whitespace-nowrap tabular-nums">{ar(item.value)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-2.5 flex-1 rounded-full bg-[#f1f3f5] overflow-hidden">
                                    <div
                                        className="h-full bg-[#28a745] rounded-r-[4px] transition-all duration-500 group-hover:bg-[#1e7e34]"
                                        style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
                                    />
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap w-20 text-right">{item.detail}</span>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
