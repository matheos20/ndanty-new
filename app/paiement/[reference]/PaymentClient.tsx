'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Smartphone, CreditCard, Wallet, Truck, Lock, ShieldCheck,
    CheckCircle2, XCircle, ArrowRight, Info, Loader2, ChevronLeft, Banknote,
} from 'lucide-react';
import { PAYMENT_METHODS, DEFAULT_METHOD, getMethodInfo } from '@/lib/payments/catalog';
import { MONEGASY_OPERATORS, detectOperator } from '@/lib/payments/sandbox';
import type { PaymentMethodKey } from '@/lib/payments/types';

interface OrderItem { id: number; name: string; price: number; quantity: number; }
interface OrderData {
    paymentRef: string;
    totalAmount: number;
    customerName: string;
    email: string;
    phone: string;
    address: string;
    paymentStatus: string;
    paymentMethod: string | null;
    items: OrderItem[];
    payment: { reference: string; status: string; method: string } | null;
}

const METHOD_ICONS: Record<PaymentMethodKey, any> = {
    MONEGASY: Smartphone,
    VISA: CreditCard,
    MASTERCARD: CreditCard,
    PAYPAL: Wallet,
    COD: Truck,
};

export default function PaymentClient({ order }: { order: OrderData }) {
    const router = useRouter();

    const alreadyDone =
        order.paymentStatus === 'PAID' ? 'PAID' : order.paymentStatus === 'A_LA_LIVRAISON' ? 'COD' : null;

    const [finalized, setFinalized] = useState<'PAID' | 'COD' | null>(alreadyDone);
    const [method, setMethod] = useState<PaymentMethodKey>(
        (order.paymentMethod as PaymentMethodKey) || DEFAULT_METHOD
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Étape OTP (Monegasy)
    const [otpStep, setOtpStep] = useState(false);
    const [otp, setOtp] = useState('');
    const [txReference, setTxReference] = useState<string | null>(order.payment?.reference ?? null);
    const [otpMessage, setOtpMessage] = useState<string | null>(null);

    // Champs formulaires
    const [msisdn, setMsisdn] = useState('');
    const [card, setCard] = useState({ number: '', name: '', expiry: '', cvc: '' });

    const info = getMethodInfo(method);
    const amountFmt = order.totalAmount.toLocaleString('fr-FR');

    // ── Handlers ────────────────────────────────────────────────
    const buildDetails = () => {
        if (method === 'MONEGASY') return { msisdn };
        if (method === 'VISA' || method === 'MASTERCARD') {
            const [mm, yy] = card.expiry.split('/').map((s) => s.trim());
            return {
                cardNumber: card.number,
                cardName: card.name,
                expMonth: mm,
                expYear: yy,
                cvc: card.cvc,
            };
        }
        return {};
    };

    const handlePay = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentRef: order.paymentRef, method, details: buildDetails() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Le paiement a échoué.');

            if (data.reference) setTxReference(data.reference);

            switch (data.status) {
                case 'PAID':
                    setFinalized('PAID');
                    break;
                case 'COD':
                    setFinalized('COD');
                    break;
                case 'REQUIRES_ACTION':
                    setOtpStep(true);
                    setOtpMessage(data.message || null);
                    break;
                case 'REDIRECT':
                    window.location.href = data.redirectUrl;
                    return;
                default:
                    setError(data.message || 'Le paiement n\'a pas abouti. Vous pouvez réessayer.');
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmOtp = async () => {
        if (!txReference) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/payments/${txReference}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input: { otp } }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'La confirmation a échoué.');

            if (data.status === 'PAID') {
                setFinalized('PAID');
            } else {
                setError(data.message || 'Code incorrect. Réessayez.');
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Écran de succès ─────────────────────────────────────────
    if (finalized) {
        return <SuccessScreen kind={finalized} order={order} method={method} />;
    }

    // ── Écran de paiement ───────────────────────────────────────
    const canSubmit = () => {
        if (loading) return false;
        if (method === 'MONEGASY') return /^\d{10}$/.test(msisdn);
        if (method === 'VISA' || method === 'MASTERCARD') {
            return card.number.replace(/\s/g, '').length >= 13 && !!card.name && /^\d{2}\/\d{2}$/.test(card.expiry) && card.cvc.length >= 3;
        }
        return true; // PayPal / COD
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 px-4 font-sans antialiased">
            <div className="max-w-5xl mx-auto">

                {/* Fil d'ariane / retour */}
                <div className="flex items-center justify-between mb-6">
                    <Link href="/shop" className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-[#28a745] transition-colors">
                        <ChevronLeft size={15} /> Retour à la boutique
                    </Link>
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#28a745] bg-[#28a745]/10 px-3 py-1.5 rounded-full">
                        <Lock size={11} /> Paiement sécurisé · Sandbox
                    </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-6">

                    {/* ─── Colonne principale : sélection + saisie ─── */}
                    <div className="lg:col-span-7 space-y-5">
                        <div>
                            <h1 className="text-2xl font-black text-[#2c3e50] font-serif">Finaliser le paiement</h1>
                            <p className="text-xs text-gray-400 mt-1 font-medium">Choisissez votre moyen de paiement préféré.</p>
                        </div>

                        {/* Sélecteur de méthodes */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {PAYMENT_METHODS.map((m) => {
                                const Icon = METHOD_ICONS[m.key];
                                const active = method === m.key;
                                return (
                                    <button
                                        key={m.key}
                                        type="button"
                                        onClick={() => { setMethod(m.key); setError(null); setOtpStep(false); }}
                                        className={`relative text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3 group ${
                                            active
                                                ? 'border-[#28a745] bg-[#28a745]/5 shadow-sm'
                                                : 'border-gray-100 bg-white hover:border-gray-200'
                                        }`}
                                    >
                                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                            active ? 'bg-[#28a745] text-white' : 'bg-gray-100 text-gray-400 group-hover:text-gray-600'
                                        }`}>
                                            <Icon size={18} />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="flex items-center gap-1.5">
                                                <span className="text-sm font-black text-[#2c3e50] truncate">{m.label}</span>
                                                {m.isDefault && (
                                                    <span className="text-[8px] font-black uppercase tracking-wider bg-[#28a745] text-white px-1.5 py-0.5 rounded-full">Défaut</span>
                                                )}
                                            </span>
                                            <span className="block text-[10px] text-gray-400 font-medium truncate">{m.tagline}</span>
                                        </span>
                                        {active && (
                                            <CheckCircle2 size={16} className="absolute top-3 right-3 text-[#28a745]" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Panneau de saisie de la méthode active */}
                        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-5">
                            {error && (
                                <div className="p-3.5 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl flex items-start gap-2">
                                    <XCircle size={15} className="shrink-0 mt-0.5" /> <span>{error}</span>
                                </div>
                            )}

                            {/* Astuce identifiants de test */}
                            {info && (
                                <div className="p-3 bg-blue-50/60 border border-blue-100 text-blue-700 text-[11px] font-medium rounded-xl flex items-start gap-2 leading-relaxed">
                                    <Info size={14} className="shrink-0 mt-0.5" />
                                    <span><b className="font-black">Test :</b> {info.testHint}</span>
                                </div>
                            )}

                            {/* ── OTP Monegasy ── */}
                            {otpStep && method === 'MONEGASY' ? (
                                <div className="space-y-4">
                                    {otpMessage && <p className="text-xs text-gray-500 font-medium leading-relaxed">{otpMessage}</p>}
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Code de confirmation (OTP)</label>
                                        <input
                                            inputMode="numeric"
                                            maxLength={6}
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                            placeholder="6 chiffres"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-center text-lg font-black tracking-[0.4em] focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] focus:bg-white outline-none transition-all"
                                        />
                                    </div>
                                    <button onClick={handleConfirmOtp} disabled={loading || otp.length !== 6} className={payBtnClass(loading || otp.length !== 6)}>
                                        {loading ? <><Loader2 size={15} className="animate-spin" /> Vérification…</> : <>Valider le code <ArrowRight size={15} /></>}
                                    </button>
                                    <button onClick={() => { setOtpStep(false); setOtp(''); setError(null); }} className="w-full text-[11px] font-bold text-gray-400 hover:text-gray-600 transition-colors">
                                        ← Modifier le numéro
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* ── Formulaire Monegasy ── */}
                                    {method === 'MONEGASY' && (
                                        <MonegasyForm msisdn={msisdn} setMsisdn={setMsisdn} />
                                    )}

                                    {/* ── Formulaire Carte ── */}
                                    {(method === 'VISA' || method === 'MASTERCARD') && (
                                        <CardForm card={card} setCard={setCard} brand={method} />
                                    )}

                                    {/* ── PayPal ── */}
                                    {method === 'PAYPAL' && (
                                        <div className="flex items-start gap-3 text-xs text-gray-500 font-medium bg-gray-50 rounded-xl p-4 leading-relaxed">
                                            <Wallet size={18} className="text-[#28a745] shrink-0 mt-0.5" />
                                            Vous serez redirigé vers une page d'approbation PayPal (sandbox) pour confirmer votre paiement, puis ramené automatiquement à la boutique.
                                        </div>
                                    )}

                                    {/* ── COD ── */}
                                    {method === 'COD' && (
                                        <div className="flex items-start gap-3 text-xs text-gray-500 font-medium bg-gray-50 rounded-xl p-4 leading-relaxed">
                                            <Banknote size={18} className="text-[#28a745] shrink-0 mt-0.5" />
                                            Aucun paiement en ligne : vous réglez <b className="text-[#2c3e50]">{amountFmt} Ar</b> en espèces à la livraison. Le manager vous contactera pour organiser la remise.
                                        </div>
                                    )}

                                    <button onClick={handlePay} disabled={!canSubmit()} className={payBtnClass(!canSubmit())}>
                                        {loading ? (
                                            <><Loader2 size={15} className="animate-spin" /> Traitement…</>
                                        ) : method === 'COD' ? (
                                            <>Confirmer la commande <ArrowRight size={15} /></>
                                        ) : method === 'PAYPAL' ? (
                                            <>Continuer avec PayPal <ArrowRight size={15} /></>
                                        ) : (
                                            <><Lock size={14} /> Payer {amountFmt} Ar</>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>

                        <p className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 font-medium">
                            <ShieldCheck size={13} className="text-[#28a745]" />
                            Environnement de test — aucune somme réelle ne sera débitée.
                        </p>
                    </div>

                    {/* ─── Colonne récap commande ─── */}
                    <div className="lg:col-span-5">
                        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm lg:sticky lg:top-6 space-y-5">
                            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Récapitulatif</h2>

                            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                {order.items.map((it) => (
                                    <div key={it.id} className="flex items-center justify-between gap-3 text-xs">
                                        <span className="text-[#2c3e50] font-bold truncate">
                                            {it.name} <span className="text-gray-400 font-normal">× {it.quantity}</span>
                                        </span>
                                        <span className="font-black text-[#2c3e50] whitespace-nowrap">
                                            {(it.price * it.quantity).toLocaleString('fr-FR')} Ar
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total</span>
                                <span className="text-2xl font-black text-[#28a745]">{amountFmt} <span className="text-sm text-[#2c3e50]">Ar</span></span>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-4 space-y-1.5 text-[11px] text-gray-500 font-medium">
                                <p className="font-black text-[#2c3e50] text-xs">{order.customerName}</p>
                                <p>{order.phone} · {order.email}</p>
                                <p className="leading-relaxed">{order.address}</p>
                            </div>

                            <p className="text-[10px] text-gray-300 font-mono">Réf. {order.paymentRef}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Sous-composants ─────────────────────────────────────────────

function payBtnClass(disabled: boolean) {
    return `w-full py-4 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-md flex items-center justify-center gap-2 ${
        disabled
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-[#28a745] text-white hover:bg-black hover:shadow-xl active:scale-[0.98]'
    }`;
}

function MonegasyForm({ msisdn, setMsisdn }: { msisdn: string; setMsisdn: (v: string) => void }) {
    const opKey = detectOperator(msisdn);
    const op = MONEGASY_OPERATORS.find((o) => o.key === opKey);
    return (
        <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Numéro Mobile Money</label>
            <div className="relative">
                <input
                    inputMode="numeric"
                    maxLength={10}
                    value={msisdn}
                    onChange={(e) => setMsisdn(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex : 0340000000"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-11 pr-24 text-sm font-bold tracking-wide focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] focus:bg-white outline-none transition-all"
                />
                <Smartphone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                {op && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-wider bg-[#28a745]/10 text-[#28a745] px-2 py-1 rounded-full">
                        {op.label.split(' ')[0]}
                    </span>
                )}
            </div>
            <p className="text-[9px] text-gray-400 font-medium">10 chiffres, opérateur détecté automatiquement.</p>
        </div>
    );
}

function CardForm({ card, setCard, brand }: { card: any; setCard: (c: any) => void; brand: string }) {
    const formatNumber = (v: string) => v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
    const formatExpiry = (v: string) => {
        const d = v.replace(/\D/g, '').slice(0, 4);
        return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    };
    return (
        <div className="space-y-4">
            <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Numéro de carte {brand === 'VISA' ? 'Visa' : 'Mastercard'}</label>
                <div className="relative">
                    <input
                        inputMode="numeric"
                        value={card.number}
                        onChange={(e) => setCard({ ...card, number: formatNumber(e.target.value) })}
                        placeholder="0000 0000 0000 0000"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-11 pr-4 text-sm font-bold tracking-widest focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] focus:bg-white outline-none transition-all"
                    />
                    <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
            </div>
            <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Titulaire de la carte</label>
                <input
                    value={card.name}
                    onChange={(e) => setCard({ ...card, name: e.target.value })}
                    placeholder="Ex : RAKOTO JEAN"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-sm font-bold uppercase focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] focus:bg-white outline-none transition-all"
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Expiration</label>
                    <input
                        inputMode="numeric"
                        value={card.expiry}
                        onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                        placeholder="MM/AA"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-sm font-bold text-center focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] focus:bg-white outline-none transition-all"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">CVC</label>
                    <input
                        inputMode="numeric"
                        maxLength={4}
                        value={card.cvc}
                        onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '') })}
                        placeholder="123"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-sm font-bold text-center tracking-widest focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] focus:bg-white outline-none transition-all"
                    />
                </div>
            </div>
        </div>
    );
}

function SuccessScreen({ kind, order, method }: { kind: 'PAID' | 'COD'; order: OrderData; method: PaymentMethodKey }) {
    const info = getMethodInfo(order.paymentMethod || method);
    const isCod = kind === 'COD';
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center py-12 px-4 font-sans antialiased">
            <div className="max-w-md w-full bg-white border border-gray-100 rounded-[2.5rem] shadow-xl p-8 text-center space-y-5">
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${isCod ? 'bg-amber-50 text-amber-500' : 'bg-[#28a745]/10 text-[#28a745]'}`}>
                    {isCod ? <Truck size={40} /> : <CheckCircle2 size={40} />}
                </div>
                <div>
                    <h1 className="text-2xl font-black text-[#2c3e50] font-serif italic">Misaotra betsaka !</h1>
                    <p className="text-sm text-gray-500 font-medium mt-2 leading-relaxed">
                        {isCod
                            ? 'Votre commande est confirmée. Vous réglerez en espèces à la livraison. Le manager vous contactera très vite.'
                            : 'Votre paiement a été accepté et votre commande est confirmée. Un grand merci pour votre confiance !'}
                    </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-xs text-left">
                    <div className="flex justify-between"><span className="text-gray-400 font-bold">Montant</span><span className="font-black text-[#2c3e50]">{order.totalAmount.toLocaleString('fr-FR')} Ar</span></div>
                    <div className="flex justify-between"><span className="text-gray-400 font-bold">Moyen</span><span className="font-black text-[#2c3e50]">{info?.label ?? method}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400 font-bold">Statut</span>
                        <span className={`font-black ${isCod ? 'text-amber-600' : 'text-[#28a745]'}`}>{isCod ? 'À la livraison' : 'Payé'}</span>
                    </div>
                    <div className="flex justify-between"><span className="text-gray-400 font-bold">Référence</span><span className="font-mono text-[10px] text-gray-500">{order.paymentRef}</span></div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                    <Link href="/dashboard" className="w-full py-3.5 bg-[#28a745] text-white text-xs font-bold uppercase tracking-widest rounded-full hover:bg-black transition-all">
                        Voir mes commandes
                    </Link>
                    <Link href="/shop" className="w-full py-3.5 bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-widest rounded-full hover:bg-gray-200 transition-all">
                        Continuer mes achats
                    </Link>
                </div>
            </div>
        </div>
    );
}
