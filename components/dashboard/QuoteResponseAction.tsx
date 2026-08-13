'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Loader2, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { respondToQuote } from '@/app/dashboard/actions';

interface QuoteResponseActionProps {
    quoteId: number;
    proposedPrice: number | null;
    status: string;
    clientDecision: string | null;
    clientResponse: string | null;
}

export default function QuoteResponseAction({
    quoteId,
    proposedPrice,
    status,
    clientDecision,
    clientResponse,
}: QuoteResponseActionProps) {
    const router = useRouter();
    const [modal, setModal] = useState<null | 'ACCEPTE' | 'REFUSE'>(null);
    const [message, setMessage] = useState('');
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Déjà répondu : on affiche la décision + le message
    if (clientDecision) {
        const accepted = clientDecision === 'ACCEPTE';
        return (
            <div className="space-y-1">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold w-fit ${
                    accepted ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                }`}>
                    {accepted ? <ThumbsUp size={11} /> : <ThumbsDown size={11} />}
                    {accepted ? 'Vous avez accepté' : 'Vous avez refusé'}
                </span>
                {clientResponse && (
                    <p className="text-[11px] text-gray-400 italic max-w-[220px]">« {clientResponse} »</p>
                )}
            </div>
        );
    }

    // Pas encore de proposition de prix → rien à valider
    if (proposedPrice == null || status !== 'DEVIS_ENVOYE') {
        return <span className="text-[11px] text-gray-300">—</span>;
    }

    const submit = async () => {
        if (!modal) return;
        setPending(true);
        setError(null);
        const res = await respondToQuote(quoteId, modal, message);
        setPending(false);
        if (res.success) {
            setModal(null);
            router.refresh();
        } else {
            setError(res.error || 'Erreur');
        }
    };

    return (
        <>
            <div className="flex gap-2">
                <button
                    onClick={() => { setModal('ACCEPTE'); setMessage(''); setError(null); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#28a745] text-white text-[11px] font-bold hover:bg-[#218838] transition-colors"
                >
                    <Check size={12} /> Accepter
                </button>
                <button
                    onClick={() => { setModal('REFUSE'); setMessage(''); setError(null); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-[11px] font-bold hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                    <X size={12} /> Refuser
                </button>
            </div>

            {modal && (
                <div className="fixed inset-0 bg-[#2c3e50]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2rem] border border-gray-100 w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95 duration-150">
                        <button onClick={() => setModal(null)} className="absolute right-6 top-6 p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-all">
                            <X size={18} />
                        </button>

                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
                            modal === 'ACCEPTE' ? 'bg-[#28a745]/10 text-[#28a745]' : 'bg-red-50 text-red-500'
                        }`}>
                            {modal === 'ACCEPTE' ? <ThumbsUp size={26} /> : <ThumbsDown size={26} />}
                        </div>

                        <h3 className="text-lg font-bold text-[#2c3e50] text-center">
                            {modal === 'ACCEPTE' ? 'Accepter cette proposition ?' : 'Refuser cette proposition ?'}
                        </h3>
                        <p className="text-xs text-gray-400 text-center mt-1 mb-5">
                            Montant proposé : <strong className="text-[#28a745]">{proposedPrice.toLocaleString('fr-FR')} Ar</strong>
                            {modal === 'ACCEPTE'
                                ? ' — notre équipe vous recontactera pour finaliser.'
                                : ' — dites-nous ce qui ne convient pas si vous le souhaitez.'}
                        </p>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <MessageSquare size={11} /> Message (optionnel)
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={3}
                                placeholder={modal === 'ACCEPTE' ? 'Ex: Parfait, je confirme !' : 'Ex: Le budget dépasse un peu…'}
                                className="w-full text-sm p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#28a745] focus:bg-white transition-colors resize-none"
                            />
                        </div>

                        {error && <p className="text-xs text-red-500 mt-2 font-medium text-center">{error}</p>}

                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setModal(null)} className="flex-1 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-gray-600 rounded-xl py-3 text-xs font-bold transition-all">
                                Annuler
                            </button>
                            <button
                                onClick={submit}
                                disabled={pending}
                                className={`flex-1 text-white rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                                    modal === 'ACCEPTE' ? 'bg-[#28a745] hover:bg-[#218838]' : 'bg-red-500 hover:bg-red-600'
                                }`}
                            >
                                {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                Confirmer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
