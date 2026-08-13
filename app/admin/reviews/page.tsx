// app/admin/reviews/page.tsx
// File d'attente de modération des avis clients.
// Aucun témoignage n'atteint la vitrine sans une décision humaine : la page s'ouvre
// donc par défaut sur les avis « À modérer », pas sur l'historique complet.

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { ensureAdmin } from '@/lib/guards';
import {
    Star, MessageSquare, Inbox, MessageSquareReply, User as UserIcon,
    ShieldCheck, Clock, ShieldX, Lock,
} from 'lucide-react';
import { getReviewStatusDef, REVIEW_STATUS_KEYS, type ReviewStatusKey } from '@/lib/review-status';
import ReviewReplyForm from './ReviewReplyForm';
import ReviewDeleteButton from './ReviewDeleteButton';
import ReviewModerationActions from './ReviewModerationActions';
import ReviewsFilters from './ReviewsFilters';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
    searchParams: Promise<{ statut?: string; q?: string }>;
}

/** Onglet demandé ; par défaut la file d'attente, seul écran qui réclame une action. */
function parseStatusFilter(raw?: string): ReviewStatusKey | 'ALL' {
    if (raw === 'ALL') return 'ALL';
    return REVIEW_STATUS_KEYS.includes(raw as ReviewStatusKey) ? (raw as ReviewStatusKey) : 'PENDING';
}

function fullName(user: { firstName: string | null; lastName: string | null } | null) {
    if (!user) return 'Client Ndanty';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Client Ndanty';
}

export default async function AdminReviewsPage({ searchParams }: PageProps) {
    // La modération engage l'image publique de la marque : accès administrateur only.
    const guard = await ensureAdmin();
    if (!guard.ok) redirect('/login');

    const params = await searchParams;
    const status = parseStatusFilter(params.statut);
    const search = (params.q || '').trim();

    // La recherche s'applique aussi bien au texte de l'avis qu'au client ou au produit.
    const searchFilter: Prisma.reviewWhereInput | undefined = search
        ? {
            OR: [
                { comment: { contains: search } },
                { product: { name: { contains: search } } },
                { user: { firstName: { contains: search } } },
                { user: { lastName: { contains: search } } },
                { user: { email: { contains: search } } },
            ],
        }
        : undefined;

    const where: Prisma.reviewWhereInput = {
        ...(status === 'ALL' ? {} : { status }),
        ...(searchFilter || {}),
    };

    // Compteurs d'onglets calculés sur le MÊME périmètre de recherche que la liste,
    // sinon un onglet annoncerait 12 avis pour n'en afficher que 3.
    const countScope = searchFilter || {};

    const [reviews, pendingCount, approvedCount, rejectedCount, allCount, unansweredCount, ratingAgg] =
        await Promise.all([
            prisma.review.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: 100,
                include: {
                    user: { select: { firstName: true, lastName: true, email: true } },
                    product: { select: { id: true, name: true, imageUrl: true } },
                },
            }),
            prisma.review.count({ where: { ...countScope, status: 'PENDING' } }),
            prisma.review.count({ where: { ...countScope, status: 'APPROVED' } }),
            prisma.review.count({ where: { ...countScope, status: 'REJECTED' } }),
            prisma.review.count({ where: countScope }),
            prisma.review.count({ where: { status: 'APPROVED', adminReply: null } }),
            prisma.review.aggregate({ where: { status: 'APPROVED' }, _avg: { rating: true } }),
        ]);

    const avg = ratingAgg._avg.rating ? ratingAgg._avg.rating.toFixed(1) : '—';

    const stats = [
        {
            label: 'En attente de validation',
            value: pendingCount,
            color: pendingCount > 0 ? 'bg-amber-500' : 'bg-gray-300',
            icon: <Clock size={18} />,
        },
        { label: 'Avis publiés', value: approvedCount, color: 'bg-[#28a745]', icon: <ShieldCheck size={18} /> },
        { label: 'Note moyenne publiée', value: `${avg} / 5`, color: 'bg-[#f39c12]', icon: <Star size={18} /> },
        { label: 'Publiés sans réponse', value: unansweredCount, color: 'bg-blue-500', icon: <MessageSquareReply size={18} /> },
    ];

    const emptyMessage: Record<ReviewStatusKey | 'ALL', { title: string; text: string }> = {
        PENDING: {
            title: 'File d’attente vide',
            text: 'Tous les avis reçus ont été traités. Les nouveaux témoignages arriveront ici avant publication.',
        },
        APPROVED: {
            title: 'Aucun avis publié',
            text: 'Approuvez un avis de la file d’attente pour le rendre visible sur la fiche produit.',
        },
        REJECTED: {
            title: 'Aucun avis rejeté',
            text: 'Les témoignages écartés sont archivés ici, avec leur motif de refus.',
        },
        ALL: {
            title: 'Aucun avis pour le moment',
            text: 'Les témoignages laissés par vos clients sur les fiches produits apparaîtront ici.',
        },
    };

    return (
        <div className="space-y-6 p-5 sm:p-8 max-w-6xl mx-auto animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-white p-5 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
                <h2 className="text-2xl font-bold text-[#2c3e50]">Modération des avis</h2>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-semibold">
                    Validez les témoignages avant publication, puis répondez à vos clients
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
                    {stats.map((s, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-gray-50/60 rounded-2xl border border-gray-100">
                            <div className={`p-3 rounded-xl text-white ${s.color}`}>{s.icon}</div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{s.label}</p>
                                <p className="text-xl font-black text-[#2c3e50]">{s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <ReviewsFilters
                status={status}
                search={search}
                counts={{ PENDING: pendingCount, APPROVED: approvedCount, REJECTED: rejectedCount, ALL: allCount }}
            />

            {/* Liste des avis */}
            {reviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-dashed border-gray-100">
                    <div className="p-4 bg-gray-50 rounded-full text-gray-300 mb-4">
                        {status === 'PENDING' && !search ? <ShieldCheck size={48} /> : <Inbox size={48} />}
                    </div>
                    <h3 className="text-xl font-bold text-[#2c3e50]">
                        {search ? 'Aucun résultat' : emptyMessage[status].title}
                    </h3>
                    <p className="text-gray-400 mt-2 text-center max-w-sm text-sm">
                        {search
                            ? `Aucun avis ne correspond à « ${search} » dans cet onglet.`
                            : emptyMessage[status].text}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {reviews.map((rev) => {
                        const def = getReviewStatusDef(rev.status);
                        const isPending = def.key === 'PENDING';
                        const isRejected = def.key === 'REJECTED';

                        return (
                            <div
                                key={rev.id}
                                className={`bg-white rounded-3xl border shadow-sm p-6 transition-colors ${
                                    isPending ? 'border-amber-200 ring-1 ring-amber-100' : 'border-gray-100'
                                } ${isRejected ? 'opacity-75' : ''}`}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Produit */}
                                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                                        {rev.product?.imageUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={rev.product.imageUrl} alt={rev.product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300"><MessageSquare size={20} /></div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-bold text-[#28a745] uppercase tracking-wider truncate">
                                                    {rev.product?.name || 'Produit supprimé'}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    <span className="flex items-center gap-1 text-sm font-bold text-[#2c3e50]">
                                                        <UserIcon size={13} className="text-gray-400" />
                                                        {fullName(rev.user)}
                                                    </span>
                                                    <span className="text-[10px] text-gray-300">
                                                        {new Date(rev.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                {/* Badge de statut de modération */}
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${def.badge}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${def.dot}`} />
                                                    {def.label}
                                                </span>
                                                <ReviewDeleteButton reviewId={rev.id} />
                                            </div>
                                        </div>

                                        {/* Étoiles */}
                                        <div className="flex items-center gap-0.5 mt-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star key={star} size={14} className={star <= rev.rating ? 'fill-[#f39c12] text-[#f39c12]' : 'text-gray-200'} />
                                            ))}
                                        </div>

                                        {/* Commentaire */}
                                        <p className="text-gray-600 text-sm leading-relaxed mt-2 whitespace-pre-line">
                                            {rev.comment}
                                        </p>

                                        {/* Motif de refus (note interne) */}
                                        {isRejected && rev.rejectionReason && (
                                            <div className="mt-3 flex items-start gap-2 bg-red-50/70 border border-red-100 rounded-2xl px-4 py-3">
                                                <ShieldX size={13} className="text-red-500 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Motif du refus</p>
                                                    <p className="text-xs font-semibold text-red-700 mt-0.5">{rev.rejectionReason}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Traçabilité de la décision */}
                                        {rev.moderatedAt && (
                                            <p className="text-[10px] font-semibold text-gray-300 mt-2">
                                                Décision du {new Date(rev.moderatedAt).toLocaleDateString('fr-FR')} à{' '}
                                                {new Date(rev.moderatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                {rev.moderatedBy ? ` — ${rev.moderatedBy}` : ''}
                                            </p>
                                        )}

                                        {/* Décisions de modération */}
                                        <div className="mt-4 pt-4 border-t border-gray-50">
                                            <ReviewModerationActions
                                                reviewId={rev.id}
                                                status={def.key}
                                                customerName={fullName(rev.user)}
                                                productName={rev.product?.name || 'Produit supprimé'}
                                                rating={rev.rating}
                                                comment={rev.comment}
                                            />
                                        </div>

                                        {/* Réponse boutique : uniquement sur un avis réellement publié —
                                            répondre à un avis invisible n'aurait aucun destinataire. */}
                                        {def.key === 'APPROVED' ? (
                                            <ReviewReplyForm
                                                reviewId={rev.id}
                                                existingReply={rev.adminReply}
                                                existingReplyAt={rev.adminReplyAt ? rev.adminReplyAt.toISOString() : null}
                                            />
                                        ) : (
                                            <p className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5">
                                                <Lock size={12} className="text-gray-300" />
                                                La réponse publique s&apos;ouvrira une fois cet avis approuvé.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {reviews.length === 100 && (
                <p className="text-center text-[11px] font-semibold text-gray-400">
                    100 avis affichés — affinez la recherche pour voir les plus anciens.
                </p>
            )}
        </div>
    );
}
