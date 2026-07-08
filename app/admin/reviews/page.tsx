// app/admin/reviews/page.tsx
import { prisma } from "@/lib/prisma";
import { Star, MessageSquare, Inbox, MessageSquareReply, User as UserIcon } from 'lucide-react';
import ReviewReplyForm from "./ReviewReplyForm";
import ReviewDeleteButton from "./ReviewDeleteButton";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminReviewsPage() {
    const reviews = await prisma.review.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            user: { select: { firstName: true, lastName: true } },
            product: { select: { name: true, imageUrl: true } },
        },
    });

    const total = reviews.length;
    const answered = reviews.filter(r => r.adminReply).length;
    const pending = total - answered;
    const avg = total > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : '—';

    const stats = [
        { label: 'Avis totaux', value: total, color: 'bg-blue-500', icon: <MessageSquare size={18} /> },
        { label: 'Note moyenne', value: `${avg} / 5`, color: 'bg-[#f39c12]', icon: <Star size={18} /> },
        { label: 'En attente de réponse', value: pending, color: 'bg-orange-500', icon: <MessageSquareReply size={18} /> },
    ];

    return (
        <div className="space-y-6 p-8 max-w-6xl mx-auto animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <h2 className="text-2xl font-bold text-[#2c3e50]">Avis & Témoignages</h2>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-semibold">
                    Répondez publiquement à vos clients
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                    {stats.map((s, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-gray-50/60 rounded-2xl border border-gray-100">
                            <div className={`p-3 rounded-xl text-white ${s.color}`}>{s.icon}</div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{s.label}</p>
                                <p className="text-xl font-black text-[#2c3e50]">{s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Liste des avis */}
            {reviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-dashed border-gray-100">
                    <div className="p-4 bg-gray-50 rounded-full text-gray-300 mb-4"><Inbox size={48} /></div>
                    <h3 className="text-xl font-bold text-[#2c3e50]">Aucun avis pour le moment</h3>
                    <p className="text-gray-400 mt-2 text-center max-w-xs">
                        Les témoignages laissés par vos clients sur les fiches produits apparaîtront ici.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {reviews.map((rev) => (
                        <div key={rev.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
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
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-[11px] font-bold text-[#28a745] uppercase tracking-wider truncate">
                                                {rev.product?.name || 'Produit supprimé'}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="flex items-center gap-1 text-sm font-bold text-[#2c3e50]">
                                                    <UserIcon size={13} className="text-gray-400" />
                                                    {rev.user
                                                        ? `${rev.user.firstName || ''} ${rev.user.lastName || ''}`.trim() || 'Client Ndanty'
                                                        : 'Client Ndanty'}
                                                </span>
                                                <span className="text-[10px] text-gray-300">
                                                    {new Date(rev.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                        <ReviewDeleteButton reviewId={rev.id} />
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

                                    {/* Réponse boutique (formulaire) */}
                                    <ReviewReplyForm
                                        reviewId={rev.id}
                                        existingReply={rev.adminReply}
                                        existingReplyAt={rev.adminReplyAt ? rev.adminReplyAt.toISOString() : null}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
