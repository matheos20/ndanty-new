'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2, Check, Trash2, MessageSquareReply } from 'lucide-react';
import EmojiPicker from '@/components/EmojiPicker';
import { replyToReview, deleteReviewReply } from './actions';

interface ReviewReplyFormProps {
    reviewId: number;
    existingReply: string | null;
    existingReplyAt: string | null;
}

export default function ReviewReplyForm({ reviewId, existingReply, existingReplyAt }: ReviewReplyFormProps) {
    const router = useRouter();
    const [reply, setReply] = useState(existingReply || '');
    const [pending, setPending] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const insertEmoji = (emoji: string) => {
        const el = textareaRef.current;
        if (!el) { setReply((r) => r + emoji); return; }
        const start = el.selectionStart ?? reply.length;
        const end = el.selectionEnd ?? reply.length;
        const next = reply.slice(0, start) + emoji + reply.slice(end);
        setReply(next);
        requestAnimationFrame(() => {
            el.focus();
            el.selectionStart = el.selectionEnd = start + emoji.length;
        });
    };

    const handleSave = async () => {
        setPending(true);
        setError(null);
        const res = await replyToReview(reviewId, reply);
        setPending(false);
        if (res.success) {
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
            router.refresh();
        } else {
            setError(res.error || 'Erreur');
        }
    };

    const handleDelete = async () => {
        if (!confirm('Supprimer votre réponse à cet avis ?')) return;
        setPending(true);
        await deleteReviewReply(reviewId);
        setReply('');
        setPending(false);
        router.refresh();
    };

    return (
        <div className="mt-3 pl-4 border-l-2 border-[#28a745]/30">
            <div className="flex items-center gap-2 mb-2">
                <MessageSquareReply size={13} className="text-[#28a745]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Réponse de la boutique
                </span>
                {existingReplyAt && (
                    <span className="text-[10px] text-gray-300">
                        · {new Date(existingReplyAt).toLocaleDateString('fr-FR')}
                    </span>
                )}
            </div>

            <div className="relative">
                <textarea
                    ref={textareaRef}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={2}
                    placeholder="Répondez publiquement à ce client (merci, précisions, emoji…)"
                    className="w-full text-sm p-3 pr-10 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#28a745] focus:bg-white transition-colors resize-none"
                />
                <div className="absolute bottom-2 right-2">
                    <EmojiPicker onSelect={insertEmoji} />
                </div>
            </div>

            {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}

            <div className="flex items-center gap-2 mt-2">
                <button
                    onClick={handleSave}
                    disabled={pending || !reply.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#28a745] text-white text-[11px] font-bold rounded-lg hover:bg-[#218838] transition-colors disabled:opacity-50"
                >
                    {pending ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : <Send size={12} />}
                    {saved ? 'Enregistré' : existingReply ? 'Mettre à jour' : 'Publier la réponse'}
                </button>
                {existingReply && (
                    <button
                        onClick={handleDelete}
                        disabled={pending}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-red-500 text-[11px] font-bold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                        <Trash2 size={12} /> Retirer
                    </button>
                )}
            </div>
        </div>
    );
}
