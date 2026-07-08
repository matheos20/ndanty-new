'use client'
import { useState } from 'react';
import { X, Maximize2 } from 'lucide-react';

export default function QuoteImage({ src }: { src: string | null }) {
    const [isFull, setIsFull] = useState(false);

    if (!src) return <div className="text-[10px] text-gray-300 italic">Pas d'image</div>;

    return (
        <>
            <div
                onClick={() => setIsFull(true)}
                className="relative group w-12 h-12 rounded-lg overflow-hidden border border-gray-100 cursor-pointer hover:ring-2 hover:ring-[#28a745] transition-all"
            >
                <img src={src} alt="Devis" className="w-full h-full object-cover shadow-sm" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Maximize2 size={12} className="text-white" />
                </div>
            </div>

            {/* Modal Plein Écran */}
            {isFull && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
                    <button onClick={() => setIsFull(false)} className="absolute top-6 right-6 text-white/70 hover:text-white cursor-pointer">
                        <X size={32} />
                    </button>
                    <img src={src} className="max-w-full max-h-full rounded-xl shadow-2xl object-contain animate-in zoom-in duration-300" alt="Vue complète" />
                </div>
            )}
        </>
    );
}