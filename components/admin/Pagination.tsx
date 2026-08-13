// components/admin/Pagination.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    totalPages: number;
    currentPage: number;
}

export default function Pagination({ totalPages, currentPage }: PaginationProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const goToPage = (page: number) => {
        // 1. On récupère les paramètres actuels de l'URL (ex: search, filtres...)
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', page.toString());

        // 2. CORRECTION DYNAMIQUE : On récupère la page actuelle (ex: /admin/quotes ou /admin/users)
        const currentPath = window.location.pathname;

        // 3. On pousse la nouvelle page sur l'adresse actuelle
        router.push(`${currentPath}?${params.toString()}`);
    };

    // Si une seule page ou 0, on masque proprement la pagination
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 border-t border-gray-100">
            {/* Texte de gauche */}
            <div className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                Affichage page {currentPage} sur {totalPages}
            </div>

            {/* Boutons à droite */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
                >
                    <ChevronLeft size={16} className="text-[#2c3e50]" />
                </button>

                <span className="text-sm font-bold px-3 text-[#2c3e50]">{currentPage}</span>

                <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
                >
                    <ChevronRight size={16} className="text-[#2c3e50]" />
                </button>
            </div>
        </div>
    );
}