'use client';

// app/admin/reviews/ReviewModerationActions.tsx
// Barre de décision de la file de modération. Une seule règle guide l'UI :
// l'administrateur doit toujours voir l'état COURANT de l'avis et n'avoir sous les
// yeux que les décisions qui ont encore un sens (on ne « publie » pas deux fois).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, RotateCcw, ShieldX } from 'lucide-react';
import DetailModal, { DetailSection } from '@/components/admin/DetailModal';
import { useAdminNotifications } from '@/components/admin/AdminNotifications';
import { approveReview, rejectReview, resetReviewToPending } from './actions';
import { getReviewStatusDef, type ReviewStatusKey } from '@/lib/review-status';

/** Motifs récurrents : un clic suffit, le champ libre reste disponible. */
const QUICK_REASONS = [
    'Contenu insultant ou inapproprié',
    'Spam ou publicité',
    'Hors sujet : ne concerne pas ce produit',
    'Avis suspect (client non identifié)',
    'Contient des données personnelles',
];

interface Props {
    reviewId: number;
    status: ReviewStatusKey;
    customerName: string;
    productName: string;
    rating: number;
    comment: string;
}

export default function ReviewModerationActions({
    reviewId, status, customerName, productName, rating, comment,
}: Props) {
    const router = useRouter();
    const { refresh: refreshNotifications } = useAdminNotifications();
    const [pending, setPending] = useState<null | 'approve' | 'reject' | 'reset'>(null);
    const [error, setError] = useState<string | null>(null);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [reason, setReason] = useState('');

    const done = (result: { success: boolean; error?: string }) => {
        setPending(null);
        if (!result.success) {
            setError(result.error || 'Action impossible.');
            return false;
        }
        setError(null);
        router.refresh();
        refreshNotifications();
        return true;
    };

    const handleApprove = async () => {
        setPending('approve');
        done(await approveReview(reviewId));
    };

    const handleReset = async () => {
        setPending('reset');
        done(await resetReviewToPending(reviewId));
    };

    const handleReject = async () => {
        setPending('reject');
        const result = await rejectReview(reviewId, reason);
        if (done(result)) {
            setRejectOpen(false);
            setReason('');
        }
    };

    const busy = pending !== null;
    const def = getReviewStatusDef(status);

    return (
        <>
            <div className="flex flex-wrap items-center gap-2">
                {/* Publier : proposé tant que l'avis n'est pas déjà en ligne. */}
                {status !== 'APPROVED' && (
                    <button
                        onClick={handleApprove}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#28a745] text-white text-[10px] font-black uppercase tracking-wider rounded-full hover:bg-[#218838] transition-colors disabled:opacity-50 shadow-sm"
                    >
                        {pending === 'approve' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        {status === 'REJECTED' ? 'Publier finalement' : 'Approuver'}
                    </button>
                )}

                {/* Rejeter : proposé tant que l'avis n'est pas déjà écarté. */}
                {status !== 'REJECTED' && (
                    <button
                        onClick={() => { setError(null); setRejectOpen(true); }}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-100 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-wider rounded-full hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                        <ShieldX size={12} />
                        {status === 'APPROVED' ? 'Dépublier' : 'Rejeter'}
                    </button>
                )}

                {/* Retour en file d'attente : uniquement après une décision. */}
                {status !== 'PENDING' && (
                    <button
                        onClick={handleReset}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-gray-400 text-[10px] font-black uppercase tracking-wider rounded-full hover:text-[#2c3e50] hover:bg-gray-100 transition-colors disabled:opacity-50"
                        title="Annuler la décision et remettre cet avis en file d'attente"
                    >
                        <RotateCcw size={12} /> En attente
                    </button>
                )}

                <span className="text-[10px] font-semibold text-gray-300 hidden lg:block">{def.hint}</span>
            </div>

            {error && <p className="text-[11px] font-bold text-red-600 mt-2">{error}</p>}

            {rejectOpen && (
                <DetailModal
                    open
                    onClose={busy ? () => {} : () => setRejectOpen(false)}
                    maxWidth="max-w-lg"
                    eyebrow={status === 'APPROVED' ? 'Dépublication d’un avis' : 'Rejet d’un avis'}
                    title={`Avis de ${customerName}`}
                    subtitle={`${productName} — ${rating}/5`}
                    footer={
                        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
                            <button
                                onClick={() => setRejectOpen(false)}
                                disabled={busy}
                                className="px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-[#2c3e50] hover:bg-gray-100 transition-colors disabled:opacity-40"
                            >
                                Revenir
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={busy}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-60"
                            >
                                {pending === 'reject' ? <Loader2 size={13} className="animate-spin" /> : <ShieldX size={13} />}
                                {status === 'APPROVED' ? 'Dépublier l’avis' : 'Rejeter l’avis'}
                            </button>
                        </div>
                    }
                >
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                            Avis concerné
                        </p>
                        <p className="text-xs font-medium text-gray-600 leading-relaxed whitespace-pre-line line-clamp-6">
                            {comment}
                        </p>
                    </div>

                    <DetailSection title="Motif du refus">
                        <div className="flex flex-wrap gap-2 mb-3">
                            {QUICK_REASONS.map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setReason(r)}
                                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-colors ${
                                        reason === r
                                            ? 'bg-[#2c3e50] text-white border-[#2c3e50]'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-[#2c3e50]'
                                    }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            autoFocus
                            placeholder="Précisez la raison du refus…"
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-xs font-medium text-[#2c3e50] placeholder:text-gray-300 focus:bg-white focus:border-[#28a745] focus:ring-1 focus:ring-[#28a745] outline-none transition-all resize-none"
                        />
                        <p className="text-[10px] font-semibold text-gray-400 mt-2">
                            Note interne : elle n&apos;est jamais montrée au client, mais reste attachée à l&apos;avis
                            si la décision doit être justifiée plus tard.
                        </p>
                    </DetailSection>

                    {error && (
                        <p className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                            {error}
                        </p>
                    )}
                </DetailModal>
            )}
        </>
    );
}
