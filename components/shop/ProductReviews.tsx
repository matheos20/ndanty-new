// components/shop/ProductReviews.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Star, MessageSquare, Send, Loader2, User } from 'lucide-react';
import EmojiPicker from '@/components/EmojiPicker';

interface ReviewWithUser {
    id: number;
    rating: number;
    comment: string;
    createdAt: string;
    adminReply: string | null;
    adminReplyAt: string | null;
    user: {
        firstName: string | null;
        lastName: string | null;
        image: string | null;
    };
}

interface ProductReviewsProps {
    productId: number;
    currentUserId?: number | null; // Passer l'ID si l'utilisateur est connecté via ta session (ex: NextAuth ou cookie)
}

export default function ProductReviews({ productId, currentUserId }: ProductReviewsProps) {
    const [reviews, setReviews] = useState<ReviewWithUser[]>([]);
    const [rating, setRating] = useState<number>(5);
    const [hoverRating, setHoverRating] = useState<number | null>(null);
    const [comment, setComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    // Insère un emoji à la position du curseur dans le commentaire
    const insertEmoji = (emoji: string) => {
        const el = textareaRef.current;
        if (!el) { setComment((c) => c + emoji); return; }
        const start = el.selectionStart ?? comment.length;
        const end = el.selectionEnd ?? comment.length;
        const next = comment.slice(0, start) + emoji + comment.slice(end);
        setComment(next);
        requestAnimationFrame(() => {
            el.focus();
            el.selectionStart = el.selectionEnd = start + emoji.length;
        });
    };

    // Charger les avis depuis notre API
    const fetchReviews = useCallback(async () => {
        try {
            const res = await fetch(`/api/shop/${productId}/reviews`);
            if (!res.ok) throw new Error('Impossible de charger les avis');
            const data = await res.json();
            setReviews(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    // Soumettre un nouvel avis
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim() || comment.trim().length < 3) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch(`/api/shop/${productId}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rating,
                    comment,
                    userId: currentUserId || 1 // Valeur de secours ou de test si pas encore connecté
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Une erreur est survenue');
            }

            // Réinitialiser le formulaire et recharger la liste
            setComment('');
            setRating(5);
            fetchReviews();
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Une erreur inattendue est survenue.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mt-16 pt-12 border-t border-gray-100 max-w-4xl mx-auto w-full">
            <h3 className="text-2xl font-normal text-[#2c3e50] italic font-serif mb-8 flex items-center gap-3">
                <MessageSquare className="text-[#28a745]" size={22} />
                Témoignages & Avis Clients
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">

                {/* ✍️ COLONNE GAUCHE : FORMULAIRE DE SAISIE */}
                <div className="md:col-span-1 bg-gray-50 border border-gray-100 p-6 rounded-2xl shadow-sm">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 font-sans">
                        Partager votre expérience
                    </h4>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Choix des étoiles */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 font-sans">Votre note :</label>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => {
                                    const activeRating = hoverRating ?? rating;
                                    return (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(null)}
                                            className="transition-transform duration-100 active:scale-90"
                                        >
                                            <Star
                                                size={20}
                                                className={`transition-colors duration-150 ${
                                                    star <= activeRating
                                                        ? 'fill-[#f39c12] text-[#f39c12]'
                                                        : 'text-gray-200 fill-gray-50'
                                                }`}
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Commentaire texte */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 font-sans">Votre commentaire :</label>
                            <div className="relative">
                                <textarea
                                    ref={textareaRef}
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    rows={4}
                                    placeholder="Racontez-nous ce que vous pensez de ce meuble..."
                                    className="w-full text-sm p-3 pr-10 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#28a745] transition-colors resize-none placeholder:text-gray-300 font-sans"
                                    required
                                />
                                <div className="absolute bottom-2 right-2">
                                    <EmojiPicker onSelect={insertEmoji} />
                                </div>
                            </div>
                        </div>

                        {error && <p className="text-xs text-red-500 font-medium font-sans">{error}</p>}

                        {/* Bouton de soumission vert Ndanty */}
                        <button
                            type="submit"
                            disabled={isSubmitting || !comment.trim()}
                            className="w-full py-2.5 px-4 bg-[#28a745] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#218838] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-sans shadow-sm"
                        >
                            {isSubmitting ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <>
                                    <Send size={12} />
                                    Publier l'avis
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* 💬 COLONNE DROITE : LISTE DES AVIS */}
                <div className="md:col-span-2 space-y-6">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="animate-spin text-[#28a745]" size={24} />
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-gray-100 rounded-2xl bg-white">
                            <p className="text-gray-400 text-sm font-serif italic">
                                Aucun avis n'a encore été laissé pour ce meuble. Soyez le premier !
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50 max-h-[450px] overflow-y-auto pr-2 space-y-4">
                            {reviews.map((rev) => (
                                <div key={rev.id} className="pt-4 first:pt-0 flex gap-4 items-start animate-in fade-in duration-200">
                                    {/* Avatar temporaire ou utilisateur */}
                                    <div className="p-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 shrink-0">
                                        <User size={18} />
                                    </div>

                                    {/* Contenu de l'avis */}
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center justify-between gap-4">
                                            <h5 className="text-sm font-bold text-[#2c3e50] font-sans">
                                                {rev.user.firstName || rev.user.lastName
                                                    ? `${rev.user.firstName || ''} ${rev.user.lastName || ''}`.trim()
                                                    : 'Client Ndanty'}
                                            </h5>
                                            <span className="text-[10px] text-gray-300 font-sans">
                                                {new Date(rev.createdAt).toLocaleDateString('fr-FR', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>

                                        {/* Étoiles fixes de l'avis */}
                                        <div className="flex items-center gap-0.5">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    size={12}
                                                    className={star <= rev.rating ? 'fill-[#f39c12] text-[#f39c12]' : 'text-gray-200'}
                                                />
                                            ))}
                                        </div>

                                        {/* Texte du commentaire */}
                                        <p className="text-gray-600 text-sm font-sans leading-relaxed pt-1 whitespace-pre-line">
                                            {rev.comment}
                                        </p>

                                        {/* Réponse publique de la boutique Ndanty */}
                                        {rev.adminReply && (
                                            <div className="mt-3 ml-1 pl-4 py-3 pr-4 border-l-2 border-[#28a745]/40 bg-[#28a745]/5 rounded-r-xl">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="w-5 h-5 rounded-full bg-[#28a745] text-white flex items-center justify-center text-[9px] font-black shrink-0">
                                                        N
                                                    </div>
                                                    <span className="text-[11px] font-black text-[#28a745] font-sans">
                                                        Réponse de Ndanty
                                                    </span>
                                                    {rev.adminReplyAt && (
                                                        <span className="text-[10px] text-gray-300 font-sans">
                                                            {new Date(rev.adminReplyAt).toLocaleDateString('fr-FR')}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-gray-600 text-sm font-sans leading-relaxed whitespace-pre-line">
                                                    {rev.adminReply}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}