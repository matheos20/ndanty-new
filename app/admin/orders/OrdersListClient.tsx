// app/admin/orders/OrdersListClient.tsx
'use client';

import React, { useState } from 'react';
import {
    ShoppingBag, Calendar, Phone, MapPin, User, DollarSign, Eye, FileText, CreditCard, Truck, Package,
    Ban, CheckCircle2, Loader2, XCircle, PackagePlus,
} from 'lucide-react';
import { ORDER_STATUSES, normalizeStatus, getStatusDef, TRACKING_STEPS } from '@/lib/order-status';
import { getDeliveryZone } from '@/lib/delivery';
import DetailModal, { DetailSection, DetailRow } from '@/components/admin/DetailModal';
import Pagination from '@/components/admin/Pagination';
import { useAdminNotifications } from '@/components/admin/AdminNotifications';
import OrdersFilters, { type OrdersCounts, type OrdersFilterState } from './OrdersFilters';
import CancelOrderModal from './CancelOrderModal';
import { markOrderReadAction, updateOrderStatusAction } from './actions';

// Libellés d'affichage des moyens de paiement
const METHOD_LABELS: Record<string, string> = {
    MONEGASY: 'Monegasy', VISA: 'Visa', MASTERCARD: 'Mastercard', PAYPAL: 'PayPal', COD: 'À la livraison',
};

/** Étapes proposées dans le sélecteur : l'annulation a son propre parcours (motif + stock + remboursement). */
const PIPELINE_STATUSES = ORDER_STATUSES.filter((s) => s.key !== 'ANNULEE');

// Badge de statut de paiement (charte Ndanty)
function PaymentBadge({ status, method }: { status?: string | null; method?: string | null }) {
    const map: Record<string, { label: string; cls: string }> = {
        PAID: { label: 'Payé', cls: 'bg-green-100 text-green-700 border-green-200' },
        A_LA_LIVRAISON: { label: 'À la livraison', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
        REFUNDED: { label: 'Remboursé', cls: 'bg-purple-50 text-purple-600 border-purple-100' },
        FAILED: { label: 'Échec paiement', cls: 'bg-red-50 text-red-600 border-red-100' },
        PENDING: { label: 'En attente de paiement', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
    };
    const s = map[status || 'PENDING'] || map.PENDING;
    const methodLabel = method ? METHOD_LABELS[method] || method : null;
    return (
        <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest py-1 px-2.5 rounded-full border ${s.cls}`}>
            💳 {s.label}{methodLabel ? ` · ${methodLabel}` : ''}
        </span>
    );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminOrderItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
    image?: string | null;
}

export interface AdminOrder {
    id: number;
    customerName: string;
    email: string;
    phone: string;
    address: string;
    createdAt: string;
    status: string;
    paymentStatus?: string | null;
    paymentMethod?: string | null;
    deliveryZone?: string | null;
    deliveryFee?: number | null;
    totalAmount: number;
    userId?: number | null;
    stockDeducted: boolean;
    isReadByManager: boolean;
    cancelReason?: string | null;
    cancelledAt?: string | null;
    payment?: { reference: string; status?: string | null; providerRef?: string | null; attempts?: number } | null;
    items: AdminOrderItem[];
}

interface Feedback {
    kind: 'success' | 'error';
    text: string;
}

export default function OrdersListClient({
    orders,
    counts,
    page,
    totalPages,
    pageSize,
    filters,
}: {
    orders: AdminOrder[];
    counts: OrdersCounts;
    page: number;
    totalPages: number;
    pageSize: number;
    filters: OrdersFilterState;
}) {
    const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
    const [cancelTarget, setCancelTarget] = useState<AdminOrder | null>(null);
    const [pendingId, setPendingId] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const { refresh: refreshNotifications } = useAdminNotifications();
    // Notification client des changements d'étape — activée par défaut, mais
    // débrayable pour rattraper un historique sans inonder les boîtes mail.
    const [notifyCustomer, setNotifyCustomer] = useState(true);

    const firstIndex = (page - 1) * pageSize + 1;
    const lastIndex = Math.min(page * pageSize, counts.filtered);

    /** Ouvrir la fiche vaut prise de connaissance : la commande sort de la file « nouvelles ». */
    const openOrder = async (order: AdminOrder) => {
        setSelectedOrder(order);
        if (order.isReadByManager) return;

        const result = await markOrderReadAction(order.id);
        if (result.success) refreshNotifications();
    };

    const handleStatusChange = async (order: AdminOrder, nextStatus: string) => {
        setPendingId(order.id);
        setFeedback(null);

        const result = await updateOrderStatusAction(order.id, nextStatus, notifyCustomer);
        setPendingId(null);

        if (!result.success) {
            setFeedback({ kind: 'error', text: result.error || "Le statut n'a pas pu être enregistré." });
            return;
        }

        const label = ORDER_STATUSES.find((s) => s.key === nextStatus)?.label ?? nextStatus;
        setFeedback({
            kind: 'success',
            text: `Commande #${order.id} — ${label}.${result.message ? ` ${result.message}` : ''}`,
        });
        refreshNotifications();
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">

            {/* EN-TÊTE ET COMPTEUR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-[#2c3e50] font-serif">Gestion des Commandes</h1>
                    <p className="text-xs text-gray-400 mt-0.5">Suivi en temps réel et validation humaine des livraisons Ndanty</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 bg-white border border-gray-100 rounded-full py-2 px-4 shadow-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={notifyCustomer}
                            onChange={(e) => setNotifyCustomer(e.target.checked)}
                            className="w-3.5 h-3.5 accent-[#28a745]"
                        />
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                            Prévenir le client
                        </span>
                    </label>

                    <div className="bg-white border border-gray-100 rounded-2xl py-2 px-5 flex items-center gap-3 shadow-sm">
                        <div className="p-2 bg-green-50 text-[#28a745] rounded-xl">
                            <ShoppingBag size={18} />
                        </div>
                        <div>
                            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Résultats</span>
                            <span className="text-sm font-black text-[#2c3e50]">{counts.filtered}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* FILTRES (serveur : recherche, paiement, étape, période) */}
            <OrdersFilters filters={filters} counts={counts} />

            {/* COMPTE RENDU DE LA DERNIÈRE ACTION */}
            {feedback && (
                <div
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${
                        feedback.kind === 'success'
                            ? 'bg-green-50 border-green-100 text-[#1e7e34]'
                            : 'bg-red-50 border-red-100 text-red-600'
                    }`}
                >
                    {feedback.kind === 'success' ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <XCircle size={15} className="mt-0.5 shrink-0" />}
                    <p className="text-[11px] font-bold leading-relaxed flex-1">{feedback.text}</p>
                    <button
                        onClick={() => setFeedback(null)}
                        className="text-[10px] font-black uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity"
                    >
                        Fermer
                    </button>
                </div>
            )}

            {/* LISTE DES CARTES DE COMMANDES */}
            <div className="space-y-4">
                {orders.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-8 lg:p-12 text-center text-gray-400 text-xs font-bold uppercase tracking-wider">
                        Aucune commande ne correspond à ces filtres.
                    </div>
                ) : (
                    orders.map((order) => {
                        const cancelled = normalizeStatus(order.status) === 'ANNULEE';
                        const busy = pendingId === order.id;

                        return (
                            <div
                                key={order.id}
                                className={`bg-white border rounded-3xl p-6 shadow-sm transition-all ${busy ? 'opacity-60' : ''} ${
                                    !order.isReadByManager ? 'border-[#28a745] ring-1 ring-[#28a745]/20' : 'border-gray-100'
                                }`}
                            >
                                {/* Ligne Supérieure */}
                                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-50 pb-4 mb-4">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-xs font-black bg-gray-100 py-1 px-3 rounded-md text-gray-600">
                                            CMD #{order.id}
                                        </span>
                                        {!order.isReadByManager && (
                                            <span className="text-[9px] font-black uppercase tracking-widest bg-[#28a745] text-white py-1 px-2.5 rounded-full">
                                                Nouveau
                                            </span>
                                        )}
                                        <PaymentBadge status={order.paymentStatus} method={order.paymentMethod} />
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold text-gray-400">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={13} />
                                            {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </div>

                                        {order.userId ? (
                                            <span className="text-[9px] font-black bg-blue-50 text-blue-600 py-1 px-2.5 rounded-full border border-blue-100">
                                                👤 CLIENT CONNECTÉ
                                            </span>
                                        ) : (
                                            <span className="text-[9px] font-black bg-orange-50 text-orange-600 py-1 px-2.5 rounded-full border border-orange-100">
                                                🔸 INVITÉ
                                            </span>
                                        )}

                                        {cancelled ? (
                                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-full ${getStatusDef(order.status).badge}`}>
                                                <Ban size={11} /> Annulée
                                            </span>
                                        ) : (
                                            <>
                                                <select
                                                    value={normalizeStatus(order.status)}
                                                    disabled={busy}
                                                    onChange={(e) => handleStatusChange(order, e.target.value)}
                                                    title="Modifier le statut de traitement"
                                                    className={`text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-full border cursor-pointer outline-none focus:ring-1 focus:ring-[#28a745] disabled:cursor-wait ${getStatusDef(order.status).badge}`}
                                                >
                                                    {PIPELINE_STATUSES.map((s) => (
                                                        <option key={s.key} value={s.key} className="bg-white text-gray-700">
                                                            {s.label}
                                                        </option>
                                                    ))}
                                                </select>

                                                <button
                                                    onClick={() => setCancelTarget(order)}
                                                    disabled={busy}
                                                    title="Annuler la commande (motif, stock, remboursement)"
                                                    className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-full border border-red-100 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all disabled:opacity-40"
                                                >
                                                    {busy ? <Loader2 size={11} className="animate-spin" /> : <Ban size={11} />}
                                                    Annuler
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Motif d'annulation, mis en évidence */}
                                {cancelled && order.cancelReason && (
                                    <div className="mb-4 rounded-2xl border border-red-100 bg-red-50/60 px-4 py-3">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-red-500">
                                            Motif de l'annulation
                                            {order.cancelledAt && ` · ${new Date(order.cancelledAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                                        </span>
                                        <p className="text-xs font-semibold text-red-700 mt-1 leading-relaxed">{order.cancelReason}</p>
                                    </div>
                                )}

                                {/* Contenu de la Carte */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">

                                    {/* Coordonnées Client */}
                                    <div className="lg:col-span-4 space-y-2 text-xs text-gray-600 font-medium">
                                        <div className="flex items-center gap-2.5">
                                            <User size={13} className="text-gray-400" />
                                            <span className="text-[#2c3e50] font-extrabold">{order.customerName}</span>
                                            <span className="text-[10px] text-gray-400">({order.email})</span>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <Phone size={13} className="text-[#28a745]" />
                                            <span className="text-[#2c3e50] font-bold tracking-wide">{order.phone}</span>
                                        </div>
                                        <div className="flex items-start gap-2.5">
                                            <MapPin size={13} className="text-gray-400 mt-0.5" />
                                            <span className="leading-relaxed text-gray-400">{order.address}</span>
                                        </div>
                                    </div>

                                    {/* Zone des Articles Cliquable */}
                                    <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-x border-gray-50 pt-4 lg:pt-0 lg:px-8">
                                        <button
                                            onClick={() => openOrder(order)}
                                            className="text-left w-full group focus:outline-none"
                                        >
                                            <span className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1 group-hover:text-[#28a745] transition-colors">
                                                Articles Commandés (Cliquez pour ouvrir la fiche)
                                            </span>
                                            <div className="bg-gray-50/50 group-hover:bg-green-50/50 p-3 rounded-2xl border border-gray-100 group-hover:border-[#28a745]/30 transition-all space-y-1">
                                                {order.items.map((item) => (
                                                    <p key={item.id} className="text-xs font-bold text-[#2c3e50] truncate flex items-center justify-between">
                                                        <span>{item.name} <span className="text-gray-400 font-normal">x{item.quantity}</span></span>
                                                        <Eye size={12} className="opacity-0 group-hover:opacity-100 text-[#28a745] transition-opacity ml-2" />
                                                    </p>
                                                ))}
                                            </div>
                                        </button>
                                    </div>

                                    {/* Prix de la Commande + Facture PDF */}
                                    <div className="lg:col-span-3 text-right flex flex-col justify-center items-end h-full gap-2">
                                        <div>
                                            <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1 justify-end">
                                                <DollarSign size={10} className="text-[#28a745]" />
                                                Total à percevoir
                                            </span>
                                            <span className={`text-xl font-black tracking-tight mt-0.5 ${cancelled ? 'text-gray-300 line-through' : 'text-[#28a745]'}`}>
                                                {order.totalAmount.toLocaleString('fr-FR')} <span className="text-xs font-bold text-[#2c3e50]">Ar</span>
                                            </span>
                                        </div>
                                        <a
                                            href={`/api/invoices/${order.id}`}
                                            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white bg-[#28a745] hover:bg-black px-3 py-1.5 rounded-full transition-all"
                                            title="Télécharger la facture PDF de cette commande"
                                        >
                                            <FileText size={12} /> Facture PDF
                                        </a>
                                    </div>

                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* PAGINATION SERVEUR */}
            {counts.filtered > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Commandes {firstIndex} à {lastIndex} sur {counts.filtered}
                    </div>
                    <Pagination totalPages={totalPages} currentPage={page} />
                </div>
            )}

            {/* FICHE DE DÉTAIL DE LA COMMANDE (coquille partagée avec les transactions) */}
            {selectedOrder && (
                <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} />
            )}

            {/* ANNULATION / REMBOURSEMENT */}
            {cancelTarget && (
                <CancelOrderModal
                    order={{
                        id: cancelTarget.id,
                        customerName: cancelTarget.customerName,
                        email: cancelTarget.email,
                        totalAmount: cancelTarget.totalAmount,
                        stockDeducted: cancelTarget.stockDeducted,
                        paymentState: cancelTarget.payment?.status ?? null,
                        itemCount: cancelTarget.items.length,
                    }}
                    onClose={() => setCancelTarget(null)}
                    onDone={(message) => {
                        setCancelTarget(null);
                        setSelectedOrder(null);
                        setFeedback({ kind: 'success', text: message });
                        refreshNotifications();
                    }}
                />
            )}
        </div>
    );
}

// ─── Fiche de détail d'une commande ──────────────────────────────────────────

function OrderDetail({ order, onClose }: { order: AdminOrder; onClose: () => void }) {
    const zone = getDeliveryZone(order.deliveryZone);
    const deliveryFee = order.deliveryFee ?? 0;
    const subtotal = order.totalAmount - deliveryFee;
    const currentStep = getStatusDef(order.status).step;
    const cancelled = normalizeStatus(order.status) === 'ANNULEE';

    return (
        <DetailModal
            open
            onClose={onClose}
            eyebrow={`Commande · ${new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
            title={`CMD #${order.id}`}
            subtitle={`${order.customerName} — ${order.email}`}
            badges={
                <>
                    <PaymentBadge status={order.paymentStatus} method={order.paymentMethod} />
                    <span className={`inline-flex items-center text-[9px] font-black uppercase tracking-widest py-1 px-2.5 rounded-full ${getStatusDef(order.status).badge}`}>
                        {getStatusDef(order.status).label}
                    </span>
                </>
            }
            footer={
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <span className="block text-[9px] font-black uppercase tracking-widest text-gray-400">Total à percevoir</span>
                        <span className={`text-xl font-black ${cancelled ? 'text-gray-300 line-through' : 'text-[#28a745]'}`}>
                            {order.totalAmount.toLocaleString('fr-FR')} <span className="text-xs text-[#2c3e50]">Ar</span>
                        </span>
                    </div>
                    <a
                        href={`/api/invoices/${order.id}`}
                        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white bg-[#28a745] hover:bg-black px-5 py-3 rounded-full transition-all"
                    >
                        <FileText size={13} /> Facture PDF
                    </a>
                </div>
            }
        >
            {/* Suivi de la commande */}
            <DetailSection title="Suivi de la commande" icon={<Truck size={12} />}>
                {cancelled ? (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                        <p className="text-xs font-black text-red-600 flex items-center gap-2">
                            <Ban size={13} /> Commande annulée
                            {order.cancelledAt && (
                                <span className="font-bold text-red-400">
                                    le {new Date(order.cancelledAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                            )}
                        </p>
                        {order.cancelReason && (
                            <p className="text-[11px] font-semibold text-red-700 mt-2 leading-relaxed italic">« {order.cancelReason} »</p>
                        )}
                        <p className="text-[10px] font-bold text-red-400 mt-2 flex items-center gap-1.5">
                            <PackagePlus size={11} />
                            {order.stockDeducted
                                ? 'Les articles sont toujours décomptés du stock.'
                                : 'Les articles ont été remis en stock.'}
                        </p>
                    </div>
                ) : (
                    <div className="flex items-center gap-1">
                        {TRACKING_STEPS.map((step, i) => {
                            const reached = currentStep >= step.step;
                            return (
                                <React.Fragment key={step.key}>
                                    {i > 0 && (
                                        <div className={`h-1 flex-1 rounded-full ${reached ? 'bg-[#28a745]' : 'bg-gray-100'}`} />
                                    )}
                                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                                        <div className={`w-3.5 h-3.5 rounded-full ring-4 ring-white ${reached ? 'bg-[#28a745]' : 'bg-gray-200'}`} />
                                        <span className={`text-[9px] font-black uppercase tracking-wider text-center ${reached ? 'text-[#2c3e50]' : 'text-gray-300'}`}>
                                            {step.label}
                                        </span>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}
            </DetailSection>

            {/* Client & livraison */}
            <DetailSection title="Client & livraison" icon={<User size={12} />}>
                <div className="bg-gray-50/60 rounded-2xl px-4 py-2 border border-gray-100">
                    <DetailRow label="Client" value={order.customerName} />
                    <DetailRow label="Email" value={order.email} />
                    <DetailRow label="Téléphone" value={order.phone} />
                    <DetailRow label="Adresse" value={order.address} />
                    <DetailRow label="Zone de livraison" value={zone ? `${zone.label} · ${zone.eta}` : '—'} />
                    <DetailRow label="Type de compte" value={order.userId ? 'Client connecté' : 'Commande invité'} />
                </div>
            </DetailSection>

            {/* Paiement */}
            <DetailSection title="Paiement" icon={<CreditCard size={12} />}>
                <div className="bg-gray-50/60 rounded-2xl px-4 py-2 border border-gray-100">
                    <DetailRow label="Moyen" value={order.paymentMethod ? METHOD_LABELS[order.paymentMethod] || order.paymentMethod : 'Non choisi'} />
                    <DetailRow label="Statut" value={order.paymentStatus || 'PENDING'} />
                    <DetailRow label="Réf. transaction" value={order.payment?.reference || '—'} mono />
                    {order.payment?.providerRef && (
                        <DetailRow label="Réf. passerelle" value={order.payment.providerRef} mono />
                    )}
                    {order.payment?.attempts != null && (
                        <DetailRow label="Tentatives" value={order.payment.attempts} />
                    )}
                    <DetailRow label="Stock décrémenté" value={order.stockDeducted ? 'Oui' : 'Non'} />
                </div>
                {order.payment?.reference && (
                    <a
                        href="/admin/payments"
                        className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-black uppercase tracking-widest text-[#28a745] hover:text-[#2c3e50] transition-colors"
                    >
                        <CreditCard size={12} /> Ouvrir le journal des transactions
                    </a>
                )}
            </DetailSection>

            {/* Articles */}
            <DetailSection title={`Articles (${order.items.length})`} icon={<Package size={12} />}>
                <div className="space-y-2">
                    {order.items.map((item) => (
                        <div key={item.id} className="flex gap-4 items-center bg-white border border-gray-100 p-3 rounded-2xl">
                            <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                                {item.image ? (
                                    <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                ) : (
                                    <ShoppingBag size={18} className="text-gray-300" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-[#2c3e50] truncate">{item.name}</p>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mt-0.5">
                                    {item.price.toLocaleString('fr-FR')} Ar × {item.quantity}
                                </span>
                            </div>
                            <span className="text-xs font-black text-[#28a745] whitespace-nowrap">
                                {(item.price * item.quantity).toLocaleString('fr-FR')} Ar
                            </span>
                        </div>
                    ))}
                </div>

                <div className="mt-3 bg-gray-50/60 rounded-2xl px-4 py-2 border border-gray-100">
                    <DetailRow label="Sous-total" value={`${subtotal.toLocaleString('fr-FR')} Ar`} />
                    <DetailRow label="Frais de livraison" value={`${deliveryFee.toLocaleString('fr-FR')} Ar`} />
                </div>
            </DetailSection>
        </DetailModal>
    );
}
