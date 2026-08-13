// components/admin/charts/PeriodFilter.tsx
// Sélecteur de période du tableau de bord. Rendu côté serveur via l'URL
// (`?periode=`) : l'état est partageable et l'agrégation reste sur le serveur.

import Link from 'next/link';
import { RANGES, type RangeKey } from '@/lib/analytics';

export default function PeriodFilter({ active }: { active: RangeKey }) {
    return (
        <div className="inline-flex bg-white border border-gray-100 rounded-full p-1 shadow-sm self-start">
            {RANGES.map((range) => (
                <Link
                    key={range.key}
                    href={`/admin?periode=${range.key}`}
                    scroll={false}
                    aria-current={active === range.key ? 'page' : undefined}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                        active === range.key ? 'bg-[#28a745] text-white shadow-sm' : 'text-gray-500 hover:text-[#2c3e50]'
                    }`}
                >
                    {range.short}
                </Link>
            ))}
        </div>
    );
}
