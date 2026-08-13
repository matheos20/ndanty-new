'use client';

// app/admin/payments/PaymentsJournalClient.tsx
// Journal des transactions des 4 passerelles + console de webhooks de test.
import React, { useMemo, useState, useTransition } from 'react';
import {
    CreditCard, Search, CheckCircle2, XCircle, Clock, Ban, Percent, Wallet,
    Radio, ChevronLeft, ChevronRight, Smartphone, Truck, ShieldCheck, AlertTriangle, ScrollText, Undo2,
} from 'lucide-react';
import DetailModal, { DetailSection, DetailRow } from '@/components/admin/DetailModal';
import { simulateWebhook } from './actions';
import type { WebhookEventType } from '@/lib/payments/webhook';

const PER_PAGE = 8;

// ─── Référentiels d'affichage ────────────────────────────────────────────────

const METHODS = [
    { key: 'MONEGASY', label: 'Monegasy', icon: <Smartphone size={13} /> },
    { key: 'VISA', label: 'Visa', icon: <CreditCard size={13} /> },
    { key: 'MASTERCARD', label: 'Mastercard', icon: <CreditCard size={13} /> },
    { key: 'PAYPAL', label: 'PayPal', icon: <Wallet size={13} /> },
    { key: 'COD', label: 'À la livraison', icon: <Truck size={13} /> },
] as const;

const METHOD_LABELS: Record<string, string> = Object.fromEntries(METHODS.map((m) => [m.key, m.label]));

/** Onglets de filtrage : « Toutes » + une entrée par passerelle. */
const METHOD_FILTERS: { key: string; label: string; icon: React.ReactNode }[] = [
    { key: 'TOUTES', label: 'Toutes', icon: null },
    ...METHODS.map((m) => ({ key: m.key as string, label: m.label, icon: m.icon })),
];

const STATUS_STYLES: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    PAID: { label: 'Encaissé', cls: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle2 size={12} /> },
    PENDING: { label: 'En attente', cls: 'bg-gray-100 text-gray-500 border-gray-200', icon: <Clock size={12} /> },
    PROCESSING: { label: 'En cours', cls: 'bg-blue-50 text-blue-600 border-blue-200', icon: <Clock size={12} /> },
    REQUIRES_ACTION: { label: 'Action requise', cls: 'bg-amber-50 text-amber-600 border-amber-200', icon: <AlertTriangle size={12} /> },
    FAILED: { label: 'Échec', cls: 'bg-red-50 text-red-600 border-red-200', icon: <XCircle size={12} /> },
    CANCELLED: { label: 'Annulé', cls: 'bg-orange-50 text-orange-600 border-orange-200', icon: <Ban size={12} /> },
    REFUNDED: { label: 'Remboursé', cls: 'bg-purple-50 text-purple-600 border-purple-200', icon: <Undo2 size={12} /> },
};

const EVENT_LABELS: Record<string, string> = {
    INITIATED: 'Transaction initiée',
    REQUIRES_ACTION: 'Action client requise (OTP)',
    REDIRECTED: 'Redirection vers la passerelle',
    CONFIRMED: 'Confirmation soumise',
    PAID: 'Paiement encaissé',
    COD: 'Règlement à la livraison confirmé',
    FAILED: 'Paiement refusé',
    CANCELLED: 'Paiement annulé',
    REFUNDED: 'Remboursement enregistré',
    WEBHOOK_RECEIVED: 'Webhook reçu et appliqué',
    WEBHOOK_REJECTED: 'Webhook rejeté',
};

const SOURCE_STYLES: Record<string, string> = {
    SYSTEM: 'bg-gray-100 text-gray-500',
    WEBHOOK: 'bg-blue-50 text-blue-600',
    ADMIN: 'bg-purple-50 text-purple-600',
};

const WEBHOOK_SCENARIOS: { type: WebhookEventType; label: string; help: string; cls: string }[] = [
    { type: 'payment.succeeded', label: 'Succès', help: 'Encaisse la transaction et décrémente le stock.', cls: 'bg-[#28a745] hover:bg-[#1f8a37] text-white' },
    { type: 'payment.failed', label: 'Échec / refus', help: 'Marque la commande en échec de paiement.', cls: 'bg-red-500 hover:bg-red-600 text-white' },
    { type: 'payment.cancelled', label: 'Annulation', help: 'Repasse la commande en attente pour une nouvelle tentative.', cls: 'bg-orange-500 hover:bg-orange-600 text-white' },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface PaymentEventRow {
    id: number; type: string; source: string; method: string; status: string;
    message: string | null; payload: string | null; createdAt: string;
}

interface PaymentRow {
    id: number; reference: string; method: string; status: string; amount: number; currency: string;
    providerRef: string | null; isSandbox: boolean; errorMessage: string | null; metadata: string | null;
    attempts: number; createdAt: string; updatedAt: string; paidAt: string | null;
    order: {
        id: number; customerName: string; email: string; phone: string; address: string;
        status: string; paymentStatus: string; deliveryZone: string | null; deliveryFee: number;
        totalAmount: number; items: { id: number; name: string; price: number; quantity: number }[];
    } | null;
    events: PaymentEventRow[];
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

const fmtAmount = (n: number) => n.toLocaleString('fr-FR');
const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function StatusBadge({ status }: { status: string }) {
    const s = STATUS_STYLES[status] || STATUS_STYLES.PENDING;
    return (
        <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest py-1 px-2.5 rounded-full border ${s.cls}`}>
            {s.icon} {s.label}
        </span>
    );
}

function prettyJson(raw: string | null): string | null {
    if (!raw) return null;
    try {
        return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
        return raw;
    }
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function PaymentsJournalClient({ rows }: { rows: PaymentRow[] }) {
    const [methodFilter, setMethodFilter] = useState<string>('TOUTES');
    const [statusFilter, setStatusFilter] = useState<string>('TOUS');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<PaymentRow | null>(null);

    // ── Indicateurs (calculés sur l'ensemble, pas sur la page affichée) ──
    const kpis = useMemo(() => {
        const paid = rows.filter((r) => r.status === 'PAID');
        const failed = rows.filter((r) => r.status === 'FAILED' || r.status === 'CANCELLED');
        const encaisse = paid.reduce((s, r) => s + r.amount, 0);
        // Taux de réussite : sur les transactions ABOUTIES uniquement — inclure celles
        // encore en cours ferait mécaniquement chuter le taux sans rien signifier.
        const settled = paid.length + failed.length;
        const rate = settled > 0 ? Math.round((paid.length / settled) * 100) : 0;
        return { total: rows.length, encaisse, paidCount: paid.length, failedCount: failed.length, rate };
    }, [rows]);

    // ── Filtres ──
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return rows.filter((r) => {
            if (methodFilter !== 'TOUTES' && r.method !== methodFilter) return false;
            if (statusFilter !== 'TOUS' && r.status !== statusFilter) return false;
            if (!q) return true;
            return (
                r.reference.toLowerCase().includes(q) ||
                (r.providerRef || '').toLowerCase().includes(q) ||
                (r.order?.customerName || '').toLowerCase().includes(q) ||
                (r.order?.email || '').toLowerCase().includes(q) ||
                String(r.order?.id ?? '').includes(q)
            );
        });
    }, [rows, methodFilter, statusFilter, query]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

    const resetPage = <T,>(setter: (v: T) => void) => (value: T) => {
        setter(value);
        setPage(1);
    };

    // La fiche ouverte doit refléter les données rafraîchies après un webhook.
    const selectedLive = selected ? rows.find((r) => r.id === selected.id) ?? selected : null;

    return (
        <div className="space-y-6 p-5 sm:p-8 max-w-7xl mx-auto animate-in fade-in duration-300 pb-16">

            {/* EN-TÊTE */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-[#2c3e50] font-serif">Transactions & Passerelles</h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Journal d&apos;audit des paiements et console de webhooks de test
                    </p>
                </div>
                <span className="inline-flex items-center gap-2 self-start bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-full">
                    <ShieldCheck size={13} /> Environnement Sandbox
                </span>
            </div>

            {/* INDICATEURS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total encaissé', value: `${fmtAmount(kpis.encaisse)} Ar`, icon: <Wallet size={18} />, color: 'bg-[#28a745]' },
                    { label: 'Transactions', value: kpis.total, icon: <CreditCard size={18} />, color: 'bg-[#2c3e50]' },
                    { label: 'Taux de réussite', value: `${kpis.rate} %`, icon: <Percent size={18} />, color: 'bg-blue-500' },
                    { label: 'Échecs / annulations', value: kpis.failedCount, icon: <XCircle size={18} />, color: 'bg-red-500' },
                ].map((k, i) => (
                    <div key={i} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm flex items-center gap-4">
                        <div className={`p-3 rounded-2xl text-white ${k.color}`}>{k.icon}</div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{k.label}</p>
                            <p className="text-lg font-black text-[#2c3e50] truncate">{k.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* FILTRES */}
            <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
                    <div className="inline-flex max-w-full overflow-x-auto bg-gray-50 rounded-full p-1">
                        {METHOD_FILTERS.map((m) => (
                            <button
                                key={m.key}
                                onClick={() => resetPage(setMethodFilter)(m.key)}
                                className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                    methodFilter === m.key ? 'bg-[#28a745] text-white shadow-sm' : 'text-gray-500 hover:text-[#2c3e50]'
                                }`}
                            >
                                {m.icon} {m.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full lg:max-w-xs">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => resetPage(setQuery)(e.target.value)}
                            placeholder="Référence, client, n° commande…"
                            className="w-full bg-gray-50 border border-gray-100 rounded-full py-2.5 pl-11 pr-4 text-xs font-medium text-gray-600 focus:outline-none focus:border-[#28a745] transition-all"
                        />
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {['TOUS', 'PAID', 'PROCESSING', 'REQUIRES_ACTION', 'PENDING', 'FAILED', 'CANCELLED', 'REFUNDED'].map((s) => (
                        <button
                            key={s}
                            onClick={() => resetPage(setStatusFilter)(s)}
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                                statusFilter === s
                                    ? 'bg-[#2c3e50] text-white border-[#2c3e50]'
                                    : 'bg-white text-gray-400 border-gray-200 hover:text-[#2c3e50]'
                            }`}
                        >
                            {s === 'TOUS' ? 'Tous statuts' : STATUS_STYLES[s]?.label ?? s}
                        </button>
                    ))}
                </div>
            </div>

            {/* LISTE */}
            <div className="space-y-3">
                {paginated.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center text-gray-400 text-xs font-bold uppercase tracking-wider">
                        Aucune transaction ne correspond à ces critères.
                    </div>
                ) : (
                    paginated.map((row) => (
                        <button
                            key={row.id}
                            onClick={() => setSelected(row)}
                            className="w-full text-left bg-white border border-gray-100 hover:border-[#28a745]/40 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all group"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2.5 rounded-2xl bg-gray-50 text-[#2c3e50] group-hover:bg-green-50 group-hover:text-[#28a745] transition-colors">
                                        <CreditCard size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-[#2c3e50] font-mono truncate">{row.reference}</p>
                                        <p className="text-[11px] text-gray-400 font-medium truncate">
                                            {row.order ? `CMD #${row.order.id} · ${row.order.customerName}` : 'Commande supprimée'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-600 py-1 px-2.5 rounded-full">
                                        {METHOD_LABELS[row.method] || row.method}
                                    </span>
                                    <StatusBadge status={row.status} />
                                    {row.events.length > 0 && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 py-1 px-2.5 rounded-full">
                                            <ScrollText size={11} /> {row.events.length}
                                        </span>
                                    )}
                                </div>

                                <div className="text-right">
                                    <p className="text-base font-black text-[#28a745]">
                                        {fmtAmount(row.amount)} <span className="text-[10px] text-[#2c3e50]">{row.currency}</span>
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-bold">{fmtDateTime(row.createdAt)}</p>
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 pt-6">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Page {safePage} sur {totalPages} · {filtered.length} transaction{filtered.length > 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(p - 1, 1))}
                            disabled={safePage === 1}
                            className="p-2 rounded-xl border border-gray-100 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                            disabled={safePage === totalPages}
                            className="p-2 rounded-xl border border-gray-100 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* FICHE DE DÉTAIL */}
            {selectedLive && (
                <TransactionDetail row={selectedLive} onClose={() => setSelected(null)} />
            )}
        </div>
    );
}

// ─── Fiche de détail d'une transaction ───────────────────────────────────────

function TransactionDetail({ row, onClose }: { row: PaymentRow; onClose: () => void }) {
    const [pending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
    const [reason, setReason] = useState('');

    const metadata = prettyJson(row.metadata);

    const trigger = (type: WebhookEventType) => {
        setFeedback(null);
        startTransition(async () => {
            const res = await simulateWebhook(row.reference, type, reason);
            if (!res.success) {
                setFeedback({ ok: false, text: res.error || 'Échec de la simulation.' });
                return;
            }
            setFeedback({
                ok: true,
                text: res.duplicate
                    ? 'Événement déjà traité — aucune action rejouée (idempotence vérifiée).'
                    : `Webhook appliqué. Transaction : ${res.status} · Commande : ${res.orderPaymentStatus}.`,
            });
        });
    };

    return (
        <DetailModal
            open
            onClose={onClose}
            eyebrow={`Transaction ${row.isSandbox ? '· Sandbox' : ''}`}
            title={row.reference}
            subtitle={row.order ? `Commande #CMD-${row.order.id} — ${row.order.customerName}` : 'Commande supprimée'}
            badges={
                <>
                    <StatusBadge status={row.status} />
                    <span className="text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-600 py-1 px-2.5 rounded-full">
                        {METHOD_LABELS[row.method] || row.method}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-600 py-1 px-2.5 rounded-full">
                        {row.attempts} tentative{row.attempts > 1 ? 's' : ''}
                    </span>
                </>
            }
        >
            {/* Montant */}
            <div className="bg-gradient-to-br from-[#28a745] to-[#1f8a37] rounded-3xl p-6 text-white">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Montant de la transaction</p>
                <p className="text-3xl font-black mt-1">
                    {fmtAmount(row.amount)} <span className="text-base font-bold opacity-80">{row.currency}</span>
                </p>
                {row.paidAt && (
                    <p className="text-[11px] font-bold opacity-90 mt-2">Encaissé le {fmtDateTime(row.paidAt)}</p>
                )}
            </div>

            {row.errorMessage && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl p-4">
                    <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-red-600 leading-relaxed">{row.errorMessage}</p>
                </div>
            )}

            {/* Informations techniques */}
            <DetailSection title="Identifiants de transaction" icon={<CreditCard size={12} />}>
                <div className="bg-gray-50/60 rounded-2xl px-4 py-2 border border-gray-100">
                    <DetailRow label="Référence interne" value={row.reference} mono />
                    <DetailRow label="Réf. passerelle" value={row.providerRef || '—'} mono />
                    <DetailRow label="Créée le" value={fmtDateTime(row.createdAt)} />
                    <DetailRow label="Dernière mise à jour" value={fmtDateTime(row.updatedAt)} />
                    <DetailRow label="Environnement" value={row.isSandbox ? 'Sandbox (test)' : 'Production'} />
                </div>
            </DetailSection>

            {/* Commande rattachée */}
            {row.order && (
                <DetailSection title="Commande rattachée" icon={<Truck size={12} />}>
                    <div className="bg-gray-50/60 rounded-2xl px-4 py-2 border border-gray-100">
                        <DetailRow label="Client" value={row.order.customerName} />
                        <DetailRow label="Contact" value={`${row.order.email} · ${row.order.phone}`} />
                        <DetailRow label="Adresse" value={row.order.address} />
                        <DetailRow label="Frais de livraison" value={`${fmtAmount(row.order.deliveryFee)} Ar`} />
                        <DetailRow label="Statut du paiement" value={row.order.paymentStatus} />
                    </div>

                    <div className="mt-3 space-y-2">
                        {row.order.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-2.5">
                                <span className="text-xs font-bold text-[#2c3e50] truncate">
                                    {item.name} <span className="text-gray-400 font-normal">×{item.quantity}</span>
                                </span>
                                <span className="text-xs font-black text-[#28a745] whitespace-nowrap">
                                    {fmtAmount(item.price * item.quantity)} Ar
                                </span>
                            </div>
                        ))}
                    </div>
                </DetailSection>
            )}

            {/* Journal d'audit */}
            <DetailSection title={`Journal d'audit (${row.events.length})`} icon={<ScrollText size={12} />}>
                {row.events.length === 0 ? (
                    <p className="text-xs text-gray-400 font-medium bg-gray-50/60 rounded-2xl p-4 border border-gray-100">
                        Aucun événement enregistré. Les transactions créées avant la mise en service du journal
                        n&apos;ont pas d&apos;historique.
                    </p>
                ) : (
                    <ol className="relative border-l-2 border-gray-100 ml-2 space-y-4">
                        {row.events.map((e) => (
                            <li key={e.id} className="ml-5">
                                <span className="absolute -left-[7px] w-3 h-3 rounded-full bg-[#28a745] ring-4 ring-white" />
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-xs font-black text-[#2c3e50]">{EVENT_LABELS[e.type] || e.type}</p>
                                    <span className={`text-[8px] font-black uppercase tracking-widest py-0.5 px-2 rounded-full ${SOURCE_STYLES[e.source] || SOURCE_STYLES.SYSTEM}`}>
                                        {e.source}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-bold">{fmtDateTime(e.createdAt)}</span>
                                </div>
                                {e.message && <p className="text-[11px] text-gray-500 font-medium mt-1">{e.message}</p>}
                                {e.payload && (
                                    <details className="mt-1.5">
                                        <summary className="text-[10px] font-black uppercase tracking-widest text-gray-400 cursor-pointer hover:text-[#28a745]">
                                            Charge utile
                                        </summary>
                                        <pre className="mt-1.5 bg-[#2c3e50] text-green-300 text-[10px] leading-relaxed p-3 rounded-xl overflow-x-auto">
                                            {prettyJson(e.payload)}
                                        </pre>
                                    </details>
                                )}
                            </li>
                        ))}
                    </ol>
                )}
            </DetailSection>

            {metadata && (
                <DetailSection title="Métadonnées de la passerelle" icon={<CreditCard size={12} />}>
                    <pre className="bg-[#2c3e50] text-green-300 text-[10px] leading-relaxed p-4 rounded-2xl overflow-x-auto">
                        {metadata}
                    </pre>
                </DetailSection>
            )}

            {/* Console de webhooks */}
            <DetailSection title="Simuler un webhook de la passerelle" icon={<Radio size={12} />}>
                <p className="text-[11px] text-gray-500 font-medium mb-3 leading-relaxed">
                    L&apos;événement est <strong>signé (HMAC-SHA256)</strong> puis envoyé au véritable endpoint
                    <code className="mx-1 px-1.5 py-0.5 bg-gray-100 rounded font-mono text-[10px]">/api/payments/webhook</code>
                    : c&apos;est exactement le chemin qu&apos;empruntera la passerelle en production.
                </p>

                <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Motif (optionnel) — ex : fonds insuffisants"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-2.5 px-4 text-xs font-medium text-gray-600 focus:outline-none focus:border-[#28a745] transition-all mb-3"
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {WEBHOOK_SCENARIOS.map((s) => (
                        <button
                            key={s.type}
                            onClick={() => trigger(s.type)}
                            disabled={pending}
                            title={s.help}
                            className={`px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed ${s.cls}`}
                        >
                            {pending ? '…' : s.label}
                        </button>
                    ))}
                </div>

                {feedback && (
                    <div className={`mt-3 flex items-start gap-2 rounded-2xl p-3.5 border ${
                        feedback.ok ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                    }`}>
                        {feedback.ok ? (
                            <CheckCircle2 size={15} className="text-[#28a745] shrink-0 mt-0.5" />
                        ) : (
                            <XCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                        )}
                        <p className={`text-[11px] font-bold leading-relaxed ${feedback.ok ? 'text-green-700' : 'text-red-600'}`}>
                            {feedback.text}
                            {feedback.ok && (
                                <span className="block font-medium text-green-600 mt-1">
                                    Rechargez la page pour voir le nouvel événement dans le journal.
                                </span>
                            )}
                        </p>
                    </div>
                )}
            </DetailSection>
        </DetailModal>
    );
}
