'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TablePaginationProps {
    totalPages: number;
    currentPage: number;
}

export default function TablePagination({ totalPages, currentPage }: TablePaginationProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', page.toString());
        router.push(`?${params.toString()}`);
    };

    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between border-t border-gray-100 bg-white px-6 py-4 rounded-b-2xl shadow-sm">
            <div className="flex flex-1 justify-between sm:hidden">
                <button
                    disabled={currentPage <= 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 disabled:opacity-50"
                >
                    Précédent
                </button>
                <button
                    disabled={currentPage >= totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="ml-3 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 disabled:opacity-50"
                >
                    Suivant
                </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs text-gray-500 font-medium">
                        Page <span className="font-bold text-gray-900">{currentPage}</span> sur{' '}
                        <span className="font-bold text-gray-900">{totalPages}</span>
                    </p>
                </div>
                <div>
                    <nav className="isolate inline-flex gap-1.5" aria-label="Pagination">
                        <button
                            disabled={currentPage <= 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                            className="p-2 text-gray-400 hover:bg-gray-50 border border-gray-100 rounded-xl disabled:opacity-30 transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                                    page === currentPage
                                        ? 'bg-[#28a745] text-white shadow-md shadow-[#28a745]/10'
                                        : 'text-gray-600 hover:bg-gray-50 border border-gray-100'
                                }`}
                            >
                                {page}
                            </button>
                        ))}

                        <button
                            disabled={currentPage >= totalPages}
                            onClick={() => handlePageChange(currentPage + 1)}
                            className="p-2 text-gray-400 hover:bg-gray-50 border border-gray-100 rounded-xl disabled:opacity-30 transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
}