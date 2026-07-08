'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, Lock, Loader2, ShieldCheck } from 'lucide-react';

interface Data {
    reference: string;
    orderRef: string;
    amountMga: number;
    amountUsd: number;
    buyerEmail: string;
    merchant: string;
    alreadyPaid: boolean;
}

export default function PaypalSandboxClient({ data }: { data: Data }) {
    const router = useRouter();
    const [loading, setLoading] = useState<'approve' | 'cancel' | null>(null);
    const [error, setError] = useState<string | null>(null);

    const decide = async (decision: 'approve' | 'cancel') => {
        setLoading(decision);
        setError(null);
        try {
            const res = await fetch(`/api/payments/${data.reference}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input: { decision } }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Erreur PayPal.');
            // Retour à l'écran de paiement de la commande (qui reflète le nouveau statut).
            router.push(`/paiement/${data.orderRef}`);
        } catch (e: any) {
            setError(e.message);
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center py-12 px-4 font-sans antialiased">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                {/* Bandeau PayPal simulé */}
                <div className="bg-[#003087] px-6 py-5 flex items-center gap-2">
                    <Wallet className="text-white" size={22} />
                    <span className="text-white font-black text-lg tracking-tight">Pay<span className="text-[#009cde]">Pal</span></span>
                    <span className="ml-auto text-[9px] font-black uppercase tracking-widest bg-white/15 text-white px-2 py-1 rounded-full">Sandbox</span>
                </div>

                <div className="p-7 space-y-6">
                    <div className="text-center space-y-1">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Paiement à</p>
                        <p className="text-sm font-black text-[#2c3e50]">{data.merchant}</p>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-5 text-center">
                        <p className="text-3xl font-black text-[#2c3e50]">${data.amountUsd.toFixed(2)} <span className="text-sm text-gray-400">USD</span></p>
                        <p className="text-[11px] text-gray-400 font-medium mt-1">≈ {data.amountMga.toLocaleString('fr-FR')} Ar</p>
                    </div>

                    <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3">
                        <div className="w-9 h-9 rounded-full bg-[#003087]/10 text-[#003087] flex items-center justify-center font-black text-sm">
                            {data.buyerEmail[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Compte connecté</p>
                            <p className="text-xs font-bold text-[#2c3e50] truncate">{data.buyerEmail}</p>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl">{error}</div>
                    )}

                    {data.alreadyPaid ? (
                        <div className="text-center text-xs font-bold text-[#28a745] bg-[#28a745]/10 rounded-xl py-3">
                            Ce paiement a déjà été approuvé.
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            <button
                                onClick={() => decide('approve')}
                                disabled={loading !== null}
                                className="w-full py-3.5 bg-[#0070ba] hover:bg-[#003087] text-white text-sm font-black rounded-full transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {loading === 'approve' ? <><Loader2 size={16} className="animate-spin" /> Traitement…</> : <><Lock size={14} /> Approuver et payer</>}
                            </button>
                            <button
                                onClick={() => decide('cancel')}
                                disabled={loading !== null}
                                className="w-full py-3 text-gray-500 hover:text-gray-800 text-xs font-bold transition-colors disabled:opacity-60"
                            >
                                {loading === 'cancel' ? 'Annulation…' : 'Annuler et revenir à la boutique'}
                            </button>
                        </div>
                    )}

                    <p className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 font-medium pt-1">
                        <ShieldCheck size={12} className="text-[#28a745]" /> Simulation — aucun débit réel.
                    </p>
                </div>
            </div>
        </div>
    );
}
