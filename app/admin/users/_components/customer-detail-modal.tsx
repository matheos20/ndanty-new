'use client';

// app/admin/users/_components/customer-detail-modal.tsx
// Fiche client 360° : identité, valeur cumulée, commandes, devis sur mesure, avis
// et favoris — tout ce qu'il faut pour traiter un appel client sans changer d'écran.
// Les données sont chargées à l'OUVERTURE seulement : la liste paginée reste légère.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    AlertTriangle, Calendar, Heart, Loader2, Mail, MapPin, MessageSquare,
    Package, Phone, Ruler, ShieldCheck, Star, TrendingUp, Wallet,
} from 'lucide-react';
import DetailModal, { DetailRow, DetailSection } from '@/components/admin/DetailModal';
import type { CustomerProfile } from '@/lib/admin/customer';

const ariary = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} Ar`;
const shortDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

/** Libellés des statuts de devis, alignés sur l'écran « Sur mesure ». */
const QUOTE_LABELS: Record<string, { label: string; badge: string }> = {
    EN_ATTENTE: { label: 'En attente de proposition', badge: 'bg-amber-50 text-amber-600' },
    DEVIS_ENVOYE: { label: 'Proposition envoyée', badge: 'bg-blue-50 text-blue-600' },
};

/** Étiquette de fidélité déduite du chiffre d'affaires — repère immédiat au téléphone. */
function loyaltyTier(revenue: number, orders: number): { label: string; className: string } {
    if (orders === 0) return { label: 'Aucun achat', className: 'bg-gray-100 text-gray-500' };
    if (revenue >= 3_000_000) return { label: 'Client privilégié', className: 'bg-[#28a745] text-white' };
    if (revenue >= 500_000) return { label: 'Client fidèle', className: 'bg-[#28a745]/10 text-[#28a745]' };
    return { label: 'Nouveau client', className: 'bg-blue-50 text-blue-600' };
}

function StatTile({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
    return (
        <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400">
                {icon}
                {label}
            </div>
            <p className="text-lg font-black text-[#2c3e50] mt-1.5 leading-none">{value}</p>
            {hint && <p className="text-[10px] font-semibold text-gray-400 mt-1.5">{hint}</p>}
        </div>
    );
}

export default function CustomerDetailModal({ userId, onClose }: { userId: number; onClose: () => void }) {
    const [profile, setProfile] = useState<CustomerProfile | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/admin/users/${userId}`, { cache: 'no-store' });
                const data = await res.json();
                if (cancelled) return;
                if (!res.ok) throw new Error(data.message || 'Fiche indisponible.');
                setProfile(data);
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Fiche indisponible.');
            }
        })();
        return () => { cancelled = true; };
    }, [userId]);

    const tier = profile ? loyaltyTier(profile.metrics.revenue, profile.metrics.settledOrders) : null;

    return (
        <DetailModal
            open
            onClose={onClose}
            maxWidth="max-w-3xl"
            eyebrow={`Fiche client #${userId}`}
            title={profile?.identity.fullName || 'Chargement…'}
            subtitle={profile?.identity.email}
            badges={
                profile ? (
                    <>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            profile.identity.role === 'ADMIN' ? 'bg-red-50 text-red-600'
                                : profile.identity.role === 'SUSPENDED' ? 'bg-gray-100 text-gray-500 line-through'
                                    : 'bg-green-50 text-[#28a745]'
                        }`}>
                            {profile.identity.role}
                        </span>
                        {tier && (
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${tier.className}`}>
                                {tier.label}
                            </span>
                        )}
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-500">
                            Inscrit le {shortDate(profile.identity.createdAt)}
                        </span>
                    </>
                ) : null
            }
            footer={
                profile ? (
                    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href={`/admin/orders?q=${encodeURIComponent(profile.identity.email)}&paiement=TOUTES`}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest text-[#28a745] bg-[#28a745]/10 hover:bg-[#28a745] hover:text-white transition-colors"
                            >
                                <Package size={12} /> Ses commandes
                            </Link>
                            <a
                                href={`mailto:${profile.identity.email}`}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-[#2c3e50] hover:bg-gray-100 transition-colors"
                            >
                                <Mail size={12} /> Écrire
                            </a>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white bg-[#2c3e50] hover:bg-[#1a252f] transition-colors"
                        >
                            Fermer
                        </button>
                    </div>
                ) : null
            }
        >
            {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl p-4">
                    <AlertTriangle size={16} className="text-red-600 shrink-0" />
                    <p className="text-[11px] font-bold text-red-700">{error}</p>
                </div>
            )}

            {!profile && !error && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="animate-spin text-[#28a745]" size={26} />
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                        Reconstitution de l&apos;historique…
                    </p>
                </div>
            )}

            {profile && (
                <>
                    {/* Valeur du client */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatTile
                            icon={<Wallet size={11} />}
                            label="CA cumulé"
                            value={ariary(profile.metrics.revenue)}
                            hint="Commandes réglées, annulations exclues"
                        />
                        <StatTile
                            icon={<Package size={11} />}
                            label="Commandes réglées"
                            value={String(profile.metrics.settledOrders)}
                            hint={`${profile.metrics.totalOrders} au total · ${profile.metrics.activeOrders} en cours`}
                        />
                        <StatTile
                            icon={<TrendingUp size={11} />}
                            label="Panier moyen"
                            value={ariary(profile.metrics.averageBasket)}
                        />
                        <StatTile
                            icon={<Calendar size={11} />}
                            label="Dernier achat"
                            value={profile.metrics.lastOrderAt ? shortDate(profile.metrics.lastOrderAt) : '—'}
                            hint={profile.metrics.firstOrderAt ? `Premier : ${shortDate(profile.metrics.firstOrderAt)}` : undefined}
                        />
                    </div>

                    {/* Coordonnées */}
                    <DetailSection title="Coordonnées" icon={<MapPin size={12} />}>
                        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-2">
                            <DetailRow label="E-mail" value={profile.identity.email} />
                            <DetailRow
                                label="Téléphone"
                                value={profile.identity.phone
                                    ? <span className="inline-flex items-center gap-1.5"><Phone size={11} className="text-gray-300" />{profile.identity.phone}</span>
                                    : <span className="text-gray-300">Non communiqué</span>}
                            />
                            <DetailRow label="Adresse" value={profile.identity.address || <span className="text-gray-300">Non renseignée</span>} />
                            <DetailRow label="Pays" value={profile.identity.country || <span className="text-gray-300">—</span>} />
                            <DetailRow
                                label="Connexion"
                                value={profile.identity.provider === 'google' ? 'Compte Google' : 'E-mail et mot de passe'}
                            />
                            <DetailRow
                                label="Double authentification"
                                value={profile.identity.twoFactorEnabled
                                    ? <span className="inline-flex items-center gap-1.5 text-[#28a745]"><ShieldCheck size={11} /> Activée</span>
                                    : <span className="text-gray-300">Désactivée</span>}
                            />
                        </div>
                    </DetailSection>

                    {/* Commandes */}
                    <DetailSection
                        title={`Commandes (${profile.orders.length})`}
                        icon={<Package size={12} />}
                    >
                        {profile.orders.length === 0 ? (
                            <p className="text-[11px] font-semibold text-gray-400 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-center">
                                Ce client n&apos;a encore passé aucune commande.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {profile.orders.map((o) => (
                                    <div key={o.id} className="flex items-start justify-between gap-4 bg-white border border-gray-100 rounded-2xl px-4 py-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-black text-[#2c3e50]">CMD #{o.id}</span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${o.statusBadge}`}>
                                                    {o.statusLabel}
                                                </span>
                                                {!o.countsAsRevenue && (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gray-100 text-gray-400">
                                                        Hors CA
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-semibold text-gray-400 mt-1 truncate">
                                                {shortDate(o.createdAt)} · {o.itemCount} article{o.itemCount > 1 ? 's' : ''}
                                                {o.preview.length > 0 && ` · ${o.preview.join(', ')}`}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs font-black text-[#2c3e50]">{ariary(o.totalAmount)}</p>
                                            <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mt-0.5">
                                                {o.paymentMethod || o.paymentStatus || '—'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </DetailSection>

                    {/* Devis sur mesure */}
                    <DetailSection
                        title={`Devis sur mesure (${profile.quotes.length})`}
                        icon={<Ruler size={12} />}
                        action={
                            profile.quotes.length > 0 ? (
                                <Link href="/admin/quotes" className="text-[10px] font-black uppercase tracking-wider text-[#28a745] hover:underline">
                                    Ouvrir l&apos;atelier
                                </Link>
                            ) : null
                        }
                    >
                        {profile.quotes.length === 0 ? (
                            <p className="text-[11px] font-semibold text-gray-400 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-center">
                                Aucune demande sur mesure à cette adresse e-mail.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {profile.quotes.map((q) => {
                                    const def = QUOTE_LABELS[q.status] || { label: q.status, badge: 'bg-gray-100 text-gray-500' };
                                    return (
                                        <div key={q.id} className="bg-white border border-gray-100 rounded-2xl px-4 py-3">
                                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-[#2c3e50]">DEVIS #{q.id}</span>
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${def.badge}`}>
                                                        {def.label}
                                                    </span>
                                                    {q.clientDecision && (
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                            q.clientDecision === 'ACCEPTE' ? 'bg-[#28a745] text-white' : 'bg-red-500 text-white'
                                                        }`}>
                                                            {q.clientDecision === 'ACCEPTE' ? 'Accepté' : 'Refusé'}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs font-black text-[#2c3e50]">
                                                    {q.proposedPrice ? ariary(q.proposedPrice) : <span className="text-gray-300">Non chiffré</span>}
                                                </span>
                                            </div>
                                            <p className="text-[10px] font-semibold text-gray-400 mt-1">{shortDate(q.createdAt)}</p>
                                            <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">{q.details}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </DetailSection>

                    {/* Avis déposés */}
                    <DetailSection
                        title={`Avis déposés (${profile.reviews.length})`}
                        icon={<MessageSquare size={12} />}
                        action={
                            profile.metrics.pendingReviews > 0 ? (
                                <Link href="/admin/reviews" className="text-[10px] font-black uppercase tracking-wider text-amber-600 hover:underline">
                                    {profile.metrics.pendingReviews} à modérer
                                </Link>
                            ) : null
                        }
                    >
                        {profile.reviews.length === 0 ? (
                            <p className="text-[11px] font-semibold text-gray-400 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-center">
                                Ce client n&apos;a laissé aucun témoignage.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {profile.reviews.map((r) => (
                                    <div key={r.id} className="bg-white border border-gray-100 rounded-2xl px-4 py-3">
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <span className="text-[11px] font-black text-[#28a745] uppercase tracking-wider truncate">
                                                {r.productName}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="flex items-center gap-0.5">
                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                        <Star key={s} size={11} className={s <= r.rating ? 'fill-[#f39c12] text-[#f39c12]' : 'text-gray-200'} />
                                                    ))}
                                                </span>
                                                <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${r.statusBadge}`}>
                                                    {r.statusLabel}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed whitespace-pre-line">{r.comment}</p>
                                        <p className="text-[10px] font-semibold text-gray-300 mt-1">{shortDate(r.createdAt)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </DetailSection>

                    {/* Favoris */}
                    <DetailSection title={`Favoris (${profile.metrics.favorites})`} icon={<Heart size={12} />}>
                        {profile.favorites.length === 0 ? (
                            <p className="text-[11px] font-semibold text-gray-400 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-center">
                                Aucun meuble mis de côté.
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {profile.favorites.map((name) => (
                                    <span key={name} className="px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-[10px] font-bold text-gray-600">
                                        {name}
                                    </span>
                                ))}
                                {profile.metrics.favorites > profile.favorites.length && (
                                    <span className="px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-[10px] font-bold text-gray-400">
                                        +{profile.metrics.favorites - profile.favorites.length}
                                    </span>
                                )}
                            </div>
                        )}
                    </DetailSection>
                </>
            )}
        </DetailModal>
    );
}
