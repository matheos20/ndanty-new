// app/admin/orders/OrdersListClient.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { ShoppingBag, Calendar, Phone, MapPin, User, DollarSign, Eye, Search, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { ORDER_STATUSES, normalizeStatus, getStatusDef } from '@/lib/order-status';

const ITEMS_PER_PAGE = 5; // Nombre de commandes par page

// Libellés d'affichage des moyens de paiement
const METHOD_LABELS: Record<string, string> = {
    MONEGASY: 'Monegasy', VISA: 'Visa', MASTERCARD: 'Mastercard', PAYPAL: 'PayPal', COD: 'À la livraison',
};

// Badge de statut de paiement (charte Ndanty)
function PaymentBadge({ status, method }: { status?: string; method?: string | null }) {
    const map: Record<string, { label: string; cls: string }> = {
        PAID: { label: 'Payé', cls: 'bg-green-100 text-green-700 border-green-200' },
        A_LA_LIVRAISON: { label: 'À la livraison', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
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

// Une commande est « réglée » : paiement validé ou fixé à la livraison.
function isSettled(order: any): boolean {
    const ps = (order.paymentStatus || 'PENDING').toUpperCase();
    return ps === 'PAID' || ps === 'A_LA_LIVRAISON';
}

type PaymentFilter = 'REGLEES' | 'ATTENTE' | 'TOUTES';

export default function OrdersListClient({ initialOrders }: { initialOrders: any[] }) {
    const [orders, setOrders] = useState(initialOrders);
    const [selectedItems, setSelectedItems] = useState<any[] | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    // Par défaut on masque les commandes non payées / abandonnées
    const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('REGLEES');

    // Compteurs par catégorie de paiement
    const settledCount = useMemo(() => orders.filter(isSettled).length, [orders]);
    const pendingCount = orders.length - settledCount;

    // 1. GESTION DES FILTRES (recherche + statut de paiement)
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            // Filtre par statut de paiement
            if (paymentFilter === 'REGLEES' && !isSettled(order)) return false;
            if (paymentFilter === 'ATTENTE' && isSettled(order)) return false;

            const query = searchQuery.toLowerCase();
            return (
                order.customerName?.toLowerCase().includes(query) ||
                order.phone?.includes(query) ||
                order.id.toString().includes(query)
            );
        });
    }, [orders, searchQuery, paymentFilter]);

    // 2. GESTION DE LA PAGINATION
    const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) || 1;

    // Réinitialiser la page si la recherche ou le filtre élimine des résultats
    useMemo(() => {
        setCurrentPage(1);
    }, [searchQuery, paymentFilter]);

    const paginatedOrders = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredOrders, currentPage]);

    // Changement de statut de traitement (sélection explicite du nouveau statut du pipeline)
    const handleStatusChange = async (orderId: number, nextStatus: string) => {
        // Sauvegarde optimiste (interface immédiate)
        const previousOrders = [...orders];
        setOrders(orders.map(order =>
            order.id === orderId ? { ...order, status: nextStatus, isReadByManager: true } : order
        ));

        try {
            // 3. Envoi de la modification réelle à la base de données via notre API
            const response = await fetch(`/api/orders/${orderId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    status: nextStatus,
                    isReadByManager: true
                }),
            });

            if (!response.ok) {
                throw new Error("Impossible de mettre à jour le statut en base de données.");
            }
        } catch (error) {
            console.error("Erreur lors de la synchronisation Prisma :", error);
            alert("Erreur réseau : Le statut n'a pas pu être enregistré. Restauration de l'ancien état.");
            // En cas d'échec réseau, on remet les anciennes valeurs pour ne pas tromper l'admin
            setOrders(previousOrders);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">

            {/* EN-TÊTE ET COMPTEUR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-[#2c3e50] font-serif">Gestion des Commandes</h1>
                    <p className="text-xs text-gray-400 mt-0.5">Suivi en temps réel et validation humaine des livraisons Ndanty</p>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl py-2 px-5 flex items-center gap-3 shadow-sm self-start">
                    <div className="p-2 bg-green-50 text-[#28a745] rounded-xl">
                        <ShoppingBag size={18} />
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Commandes</span>
                        <span className="text-sm font-black text-[#2c3e50]">{filteredOrders.length}</span>
                    </div>
                </div>
            </div>

            {/* FILTRES PAR STATUT DE PAIEMENT + RECHERCHE */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                <div className="inline-flex bg-white border border-gray-100 rounded-full p-1 shadow-sm self-start">
                    {([
                        { key: 'REGLEES', label: 'Réglées', count: settledCount },
                        { key: 'ATTENTE', label: 'En attente / Abandon', count: pendingCount },
                        { key: 'TOUTES', label: 'Toutes', count: orders.length },
                    ] as { key: PaymentFilter; label: string; count: number }[]).map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setPaymentFilter(f.key)}
                            className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                paymentFilter === f.key ? 'bg-[#28a745] text-white shadow-sm' : 'text-gray-500 hover:text-[#2c3e50]'
                            }`}
                        >
                            {f.label}
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${paymentFilter === f.key ? 'bg-white/25' : 'bg-gray-100 text-gray-500'}`}>
                                {f.count}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:max-w-xs">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher par nom, téléphone ou n°..."
                        className="w-full bg-white border border-gray-100 rounded-full py-2.5 pl-11 pr-4 text-xs font-medium text-gray-600 focus:outline-none focus:border-[#28a745] transition-all shadow-sm"
                    />
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
            </div>

            {/* LISTE DES CARTES DE COMMANDES */}
            <div className="space-y-4">
                {paginatedOrders.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center text-gray-400 text-xs font-bold uppercase tracking-wider">
                        Aucune commande ne correspond à votre recherche.
                    </div>
                ) : (
                    paginatedOrders.map((order) => (
                        <div
                            key={order.id}
                            className={`bg-white border rounded-3xl p-6 shadow-sm transition-all ${
                                !order.isReadByManager ? 'border-[#28a745] ring-1 ring-[#28a745]/20' : 'border-gray-100'
                            }`}
                        >
                            {/* Ligne Supérieure */}
                            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-50 pb-4 mb-4">
                                <div className="flex items-center gap-3">
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

                                <div className="flex items-center gap-4 text-[11px] font-bold text-gray-400">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={13} />
                                        {new Date(order.createdAt || new Date()).toLocaleDateString('fr-FR', {
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

                                    <select
                                        value={normalizeStatus(order.status)}
                                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                        title="Modifier le statut de traitement"
                                        className={`text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-full border cursor-pointer outline-none focus:ring-1 focus:ring-[#28a745] ${getStatusDef(order.status).badge}`}
                                    >
                                        {ORDER_STATUSES.map((s) => (
                                            <option key={s.key} value={s.key} className="bg-white text-gray-700">
                                                {s.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

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
                                        onClick={() => setSelectedItems(order.items)}
                                        className="text-left w-full group focus:outline-none"
                                    >
                                        <span className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1 group-hover:text-[#28a745] transition-colors">
                                            Articles Commandés (Cliquez pour inspecter)
                                        </span>
                                        <div className="bg-gray-50/50 group-hover:bg-green-50/50 p-3 rounded-2xl border border-gray-100 group-hover:border-[#28a745]/30 transition-all space-y-1">
                                            {order.items.map((item: any) => (
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
                                        <span className="text-xl font-black tracking-tight text-[#28a745] mt-0.5">
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
                    ))
                )}
            </div>

            {/* 3. BLOC DE PAGINATION PROFESSIONNEL */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-4">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Page {currentPage} sur {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-xl border border-gray-100 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-xl border border-gray-100 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* MODALE DÉTAILLÉE AVEC IMAGES DES MEUBLES */}
            {selectedItems && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 use-animate fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] max-w-md w-full p-6 space-y-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#2c3e50]">Détails du Panier d'Artisan</h3>
                            <button
                                onClick={() => setSelectedItems(null)}
                                className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
                            >
                                Fermer
                            </button>
                        </div>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                            {selectedItems.map((item: any) => (
                                <div key={item.id} className="flex gap-4 items-center bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                    {/* CONTENEUR DE L'IMAGE DU PRODUIT */}
                                    <div className="w-14 h-14 rounded-xl bg-white border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner">
                                        {item.image || item.product?.image ? (
                                            <img
                                                src={item.image || item.product?.image}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <ShoppingBag size={18} className="text-gray-300" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-[#2c3e50] truncate">{item.name}</p>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mt-0.5">
                                            Quantité : {item.quantity}
                                        </span>
                                    </div>
                                    <span className="text-xs font-black text-[#28a745] whitespace-nowrap">
                                        {(item.price * item.quantity).toLocaleString('fr-FR')} Ar
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}