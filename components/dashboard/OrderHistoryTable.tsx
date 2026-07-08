// components/dashboard/OrderHistoryTable.tsx
'use client';

import { useState } from "react";
import Link from "next/link";
import {
    CheckCircle, Clock, AlertCircle, CreditCard, Truck, XCircle,
    ArrowRight, ChevronRight, X, MapPin, Phone, Calendar, Package, User, FileText,
} from "lucide-react";
import { normalizeStatus, getStatusDef, TRACKING_STEPS } from "@/lib/order-status";

interface OrderItem { id: number; name: string; price: number; quantity: number; }
interface Order {
    id: number;
    totalAmount: number;
    status: string;
    paymentStatus?: string;
    paymentMethod?: string | null;
    paymentRef?: string | null;
    customerName?: string;
    phone?: string;
    address?: string;
    createdAt?: string | null;
    items?: OrderItem[];
}

const METHOD_LABELS: Record<string, string> = {
    MONEGASY: "Monegasy", VISA: "Visa", MASTERCARD: "Mastercard", PAYPAL: "PayPal", COD: "Paiement à la livraison",
};

// État UNIQUE et lisible de la commande (combine paiement + traitement unifié)
function getOrderState(o: Order): { label: string; cls: string; Icon: any; needsPayment: boolean; settled: boolean } {
    const ps = (o.paymentStatus || "PENDING").toUpperCase();
    const st = normalizeStatus(o.status);

    if (st === "ANNULEE")
        return { label: "Annulée", cls: "bg-red-50 text-red-600", Icon: XCircle, needsPayment: false, settled: false };

    if (ps === "PAID" || ps === "A_LA_LIVRAISON") {
        const def = getStatusDef(o.status);
        const Icon = st === "LIVREE" ? CheckCircle : st === "EXPEDIEE" ? Truck : Clock;
        const paidLabel = ps === "A_LA_LIVRAISON" ? "Confirmée (à la livraison)" : "Payée";
        return { label: `${paidLabel} · ${def.label}`, cls: def.badge, Icon, needsPayment: false, settled: true };
    }
    if (ps === "FAILED")
        return { label: "Paiement échoué", cls: "bg-red-50 text-red-600", Icon: XCircle, needsPayment: !!o.paymentRef, settled: false };
    if (o.paymentRef)
        return { label: "Paiement à finaliser", cls: "bg-amber-50 text-amber-600", Icon: Clock, needsPayment: true, settled: false };
    return { label: "En attente de traitement", cls: "bg-gray-100 text-gray-500", Icon: Clock, needsPayment: false, settled: false };
}

// Frise de suivi : Préparation → Expédiée → Livrée
function OrderTracker({ status }: { status?: string }) {
    const current = getStatusDef(status);
    return (
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Suivi de la commande</p>
            <div className="flex items-center">
                {TRACKING_STEPS.map((step, i) => {
                    const reached = current.step >= step.step;
                    const isCurrent = current.step === step.step;
                    return (
                        <div key={step.key} className="flex items-center flex-1 last:flex-none">
                            <div className="flex flex-col items-center">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-colors ${reached ? "bg-[#28a745] text-white" : "bg-gray-100 text-gray-400"} ${isCurrent ? "ring-4 ring-[#28a745]/15" : ""}`}>
                                    {reached ? "✓" : step.step}
                                </div>
                                <span className={`text-[9px] font-bold mt-1 whitespace-nowrap ${reached ? "text-[#2c3e50]" : "text-gray-400"}`}>{step.label}</span>
                            </div>
                            {i < TRACKING_STEPS.length - 1 && (
                                <div className={`h-0.5 flex-1 mx-1 -mt-4 ${current.step > step.step ? "bg-[#28a745]" : "bg-gray-100"}`} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function paymentLabel(o: Order): string {
    const ps = (o.paymentStatus || "PENDING").toUpperCase();
    const method = o.paymentMethod ? METHOD_LABELS[o.paymentMethod] || o.paymentMethod : null;
    if (ps === "PAID") return `Payé${method ? ` · ${method}` : ""}`;
    if (ps === "A_LA_LIVRAISON") return "À régler à la livraison";
    if (ps === "FAILED") return "Échoué — à réessayer";
    if (ps === "PENDING") return o.paymentRef ? "En attente (non finalisé)" : "—";
    return "—";
}

function formatDate(iso?: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function OrderHistoryTable({ orders }: { orders: Order[] }) {
    const [selected, setSelected] = useState<Order | null>(null);

    if (orders.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <Package size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">Vous n'avez pas encore effectué d'achat dans notre boutique.</p>
                <Link href="/shop" className="inline-block mt-4 text-xs font-bold text-[#28a745] hover:underline">Découvrir le catalogue →</Link>
            </div>
        );
    }

    return (
        <>
            {/* Aide de lecture */}
            <p className="text-[11px] text-gray-400 -mt-2 mb-3">
                Cliquez sur une commande pour voir le détail. Une commande <span className="font-bold text-amber-600">« à finaliser »</span> peut être réglée à tout moment.
            </p>

            <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.01)]">
                <table className="w-full text-left border-collapse bg-white text-sm">
                    <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-bold tracking-wider border-b border-gray-100">
                        <tr>
                            <th className="p-4">N° Commande</th>
                            <th className="p-4 hidden sm:table-cell">Date</th>
                            <th className="p-4">Montant</th>
                            <th className="p-4">État de la commande</th>
                            <th className="p-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-600">
                        {orders.map((order) => {
                            const state = getOrderState(order);
                            return (
                                <tr
                                    key={order.id}
                                    onClick={() => setSelected(order)}
                                    className="hover:bg-gray-50/70 transition-colors cursor-pointer group"
                                >
                                    <td className="p-4 font-mono font-bold text-gray-900 whitespace-nowrap">#CMD-{order.id}</td>
                                    <td className="p-4 text-xs text-gray-400 whitespace-nowrap hidden sm:table-cell">{formatDate(order.createdAt)}</td>
                                    <td className="p-4 font-bold text-[#2c3e50] whitespace-nowrap">{order.totalAmount.toLocaleString()} Ar</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1.5 w-fit ${state.cls}`}>
                                            <state.Icon size={12} /> {state.label}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        {state.needsPayment && order.paymentRef ? (
                                            <Link
                                                href={`/paiement/${order.paymentRef}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#28a745] hover:bg-black px-3 py-1.5 rounded-full transition-all whitespace-nowrap"
                                            >
                                                Régler <ArrowRight size={12} />
                                            </Link>
                                        ) : (
                                            <ChevronRight size={16} className="text-gray-300 group-hover:text-[#28a745] transition-colors inline" />
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* MODALE DE DÉTAIL */}
            {selected && (
                <OrderDetailModal order={selected} onClose={() => setSelected(null)} />
            )}
        </>
    );
}

function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
    const state = getOrderState(order);
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* En-tête */}
                <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gray-50">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Commande</p>
                        <h3 className="text-lg font-black text-[#2c3e50] font-mono">#CMD-{order.id}</h3>
                        <span className={`mt-2 px-3 py-1 text-xs font-bold rounded-full inline-flex items-center gap-1.5 ${state.cls}`}>
                            <state.Icon size={12} /> {state.label}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-5">
                    {/* Frise de suivi (uniquement si la commande est réglée et non annulée) */}
                    {state.settled && (
                        <div className="bg-gray-50 rounded-2xl p-4">
                            <OrderTracker status={order.status} />
                        </div>
                    )}

                    {/* Paiement */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#28a745]/10 text-[#28a745] flex items-center justify-center shrink-0">
                            <CreditCard size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Paiement</p>
                            <p className="text-sm font-bold text-[#2c3e50]">{paymentLabel(order)}</p>
                        </div>
                    </div>

                    {/* Articles */}
                    {order.items && order.items.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Articles</p>
                            <div className="space-y-2">
                                {order.items.map((it) => (
                                    <div key={it.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-3 py-2">
                                        <span className="text-xs font-bold text-[#2c3e50] truncate">
                                            {it.name} <span className="text-gray-400 font-normal">× {it.quantity}</span>
                                        </span>
                                        <span className="text-xs font-black text-[#2c3e50] whitespace-nowrap">
                                            {(it.price * it.quantity).toLocaleString("fr-FR")} Ar
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Total */}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total</span>
                        <span className="text-xl font-black text-[#28a745]">{order.totalAmount.toLocaleString("fr-FR")} Ar</span>
                    </div>

                    {/* Livraison */}
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-xs text-gray-500 font-medium">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Livraison</p>
                        {order.customerName && <p className="flex items-center gap-2"><User size={13} className="text-gray-400" /> {order.customerName}</p>}
                        {order.phone && <p className="flex items-center gap-2"><Phone size={13} className="text-[#28a745]" /> {order.phone}</p>}
                        {order.address && <p className="flex items-start gap-2"><MapPin size={13} className="text-gray-400 mt-0.5" /> {order.address}</p>}
                        <p className="flex items-center gap-2"><Calendar size={13} className="text-gray-400" /> {formatDate(order.createdAt)}</p>
                    </div>
                </div>

                {/* Actions : facture (toujours) + paiement si nécessaire */}
                <div className="p-5 border-t border-gray-100 bg-white space-y-3">
                    <a
                        href={`/api/invoices/${order.id}`}
                        className="w-full py-3 bg-[#28a745] hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-full transition-all flex items-center justify-center gap-2"
                    >
                        <FileText size={14} /> Télécharger la facture (PDF)
                    </a>
                    <Link
                        href={`/dashboard/factures/${order.id}`}
                        target="_blank"
                        className="w-full py-2.5 border border-gray-200 text-gray-500 hover:border-[#28a745] hover:text-[#28a745] text-[11px] font-bold uppercase tracking-widest rounded-full transition-all flex items-center justify-center gap-2"
                    >
                        Aperçu à l'écran
                    </Link>
                    {state.needsPayment && order.paymentRef && (
                        <Link
                            href={`/paiement/${order.paymentRef}`}
                            className="w-full py-3.5 bg-[#28a745] hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-full transition-all flex items-center justify-center gap-2"
                        >
                            Finaliser le paiement <ArrowRight size={14} />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
