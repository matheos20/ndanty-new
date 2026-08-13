// app/admin/users/_components/search-bar.tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export default function SearchBar() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    // On utilise une référence pour stocker la fonction replace et le pathname sans lever de fausses dépendances
    const routerRef = useRef({ replace, pathname });

    // Garder la valeur initiale pour éviter de lire searchParams directement dans le useEffect
    const initialSearch = searchParams.get('search') || '';
    const [text, setText] = useState(initialSearch);

    // Mettre à jour l'état si l'URL change depuis l'extérieur (ex: changement de page ou reset externe)
    useEffect(() => {
        setText(searchParams.get('search') || '');
    }, [searchParams]);

    useEffect(() => {
        // Si le texte n'a pas bougé par rapport à la valeur actuelle de l'URL, on ne fait rien
        if (text === (new URLSearchParams(window.location.search).get('search') || '')) {
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            const params = new URLSearchParams(window.location.search);

            // Quand on effectue une recherche, on remet toujours à la page 1
            params.set('page', '1');

            if (text) {
                params.set('search', text);
            } else {
                params.delete('search');
            }

            routerRef.current.replace(`${routerRef.current.pathname}?${params.toString()}`);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [text]); // 🌟 Seul "text" contrôle le déclenchement du debounce maintenant !

    return (
        <div className="relative w-full sm:max-w-xs group">
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Rechercher par nom ou email..."
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-11 pr-10 text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all duration-300 group-hover:shadow-sm"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-[#28a745] transition-colors" />

            {text && (
                <button
                    type="button"
                    onClick={() => setText('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-all"
                >
                    <X size={12} />
                </button>
            )}
        </div>
    );
}