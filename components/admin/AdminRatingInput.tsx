// components/admin/AdminRatingInput.tsx
'use client';

import { useState } from 'react';
import { Star, Check, Loader2 } from 'lucide-react';

interface AdminRatingInputProps {
    productId: number;
    initialRating: number;
}

export default function AdminRatingInput({ productId, initialRating }: AdminRatingInputProps) {
    // On utilise un Math.round pour l'état visuel des étoiles interactives (1 à 5)
    const [rating, setRating] = useState<number>(Math.round(initialRating));
    // Un état dédié pour afficher la note textuelle exacte (ex: 3.5, 4.5, 5.0)
    const [exactRating, setExactRating] = useState<number>(initialRating);

    const [hoverRating, setHoverRating] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async (selectedRating: number) => {
        setIsSaving(true);
        setSaved(false);

        try {
            const response = await fetch(`/api/shop/${productId}/rating`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ rating: selectedRating }),
            });

            if (!response.ok) throw new Error('Erreur lors de la sauvegarde');

            // Mise à jour synchrone des deux états après succès
            setRating(selectedRating);
            setExactRating(selectedRating);
            setSaved(true);

            // Petit effet visuel de succès
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error(error);
            alert('Impossible de mettre à jour la note.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 px-4 py-2 rounded-2xl w-max shadow-inner">
            {/* Label discret style Ndanty */}
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider font-sans">
                Note Éditoriale :
            </span>

            {/* Étoiles interactives */}
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => {
                    const activeRating = hoverRating ?? rating;
                    const isSelected = star <= activeRating;

                    return (
                        <button
                            key={star}
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleSave(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(null)}
                            className={`transition-all duration-150 active:scale-75 ${
                                isSaving ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'
                            }`}
                        >
                            <Star
                                size={13}
                                className={`transition-all duration-200 ${
                                    isSelected
                                        ? 'fill-[#f39c12] text-[#f39c12] drop-shadow-[0_1px_3px_rgba(243,156,18,0.2)]'
                                        : 'text-gray-200 fill-gray-100'
                                }`}
                            />
                        </button>
                    );
                })}
            </div>

            {/* Indicateurs d'état avec couleur Ndanty (#28a745) */}
            <div className="w-6 h-5 flex items-center justify-center border-l border-gray-200 pl-2">
                {isSaving ? (
                    <Loader2 size={12} className="animate-spin text-[#28a745]" />
                ) : saved ? (
                    <Check size={13} className="text-[#28a745] stroke-[3px] animate-in zoom-in duration-200" />
                ) : (
                    <span className="text-[11px] font-bold text-gray-500 font-sans">
                        {exactRating.toFixed(1)}
                    </span>
                )}
            </div>
        </div>
    );
}