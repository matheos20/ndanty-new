'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, X, Send, Loader2, CheckCircle2, AlertTriangle, Pencil } from 'lucide-react';
import { sendQuoteProposal } from './actions';

interface SendProposalButtonProps {
    quote: {
        id: number;
        customerName: string;
        email: string;
        details: string;
        proposedPrice?: number | null;
        adminResponse?: string | null;
    };
}

export default function SendProposalButton({ quote }: SendProposalButtonProps) {
    const router = useRouter();
    const alreadyProposed = quote.proposedPrice != null;

    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(false);
    const [done, setDone] = useState(false);
    const [warning, setWarning] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [price, setPrice] = useState<string>(alreadyProposed ? String(quote.proposedPrice) : '');
    const [message, setMessage] = useState<string>(quote.adminResponse || '');

    const closeModal = () => {
        setOpen(false);
        setError(null);
        setWarning(null);
        setDone(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        setWarning(null);

        const res = await sendQuoteProposal(quote.id, {
            proposedPrice: Number(price),
            adminResponse: message,
        });

        setPending(false);

        if (!res.success) {
            setError(res.error || "Une erreur est survenue.");
            return;
        }

        setDone(true);
        setWarning(res.warning || null);
        router.refresh(); // Rafraîchit la liste pour refléter le nouveau statut
    };

    return (
        <>
            {alreadyProposed ? (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    title="Modifier l'offre envoyée"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#28a745]/10 text-[#28a745] text-[10px] font-bold uppercase tracking-wider hover:bg-[#28a745]/20 transition-all"
                >
                    <Pencil size={11} /> {Number(quote.proposedPrice).toLocaleString('fr-FR')} Ar
                </button>
            ) : (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#28a745] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-[#218838] shadow-sm transition-all"
                >
                    <Tag size={11} /> Proposer
                </button>
            )}

            {open && (
                <div className="fixed inset-0 bg-[#2c3e50]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 text-left overflow-y-auto">
                    <div className="bg-white rounded-[2rem] border border-gray-100 w-full max-w-md p-8 shadow-2xl relative my-8 animate-in zoom-in-95 duration-150">
                        <button type="button" onClick={closeModal} className="absolute right-6 top-6 p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-all">
                            <X size={18} />
                        </button>

                        {done ? (
                            <div className="text-center py-6 space-y-4">
                                <div className="w-16 h-16 bg-[#28a745]/10 text-[#28a745] rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle2 size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-[#2c3e50]">Proposition envoyée !</h3>
                                <p className="text-sm text-gray-500">
                                    Le devis de <strong>{Number(price).toLocaleString('fr-FR')} Ar</strong> a été enregistré
                                    {warning ? '.' : ` et envoyé à ${quote.email}.`}
                                </p>
                                {warning && (
                                    <div className="flex items-start gap-2 text-left p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-700 font-semibold">
                                        <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {warning}
                                    </div>
                                )}
                                <button onClick={closeModal} className="mt-2 px-8 py-3 bg-[#28a745] text-white text-xs font-bold uppercase tracking-widest rounded-full hover:bg-black transition-all">
                                    Fermer
                                </button>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-xl font-bold text-[#2c3e50] mb-1">
                                    {alreadyProposed ? "Modifier l'offre" : "Proposer un prix"}
                                </h3>
                                <p className="text-xs text-gray-400 font-medium mb-6">
                                    Devis pour <strong className="text-[#2c3e50]">{quote.customerName}</strong> — un email sera envoyé à {quote.email}
                                </p>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {error && (
                                        <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl">
                                            ⚠️ {error}
                                        </div>
                                    )}

                                    <div className="p-3 bg-gray-50 rounded-xl text-[11px] text-gray-500 border border-gray-100 line-clamp-3">
                                        <span className="font-bold text-gray-600">Demande : </span>{quote.details}
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Prix proposé (Ariary)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min={1}
                                                required
                                                value={price}
                                                onChange={(e) => setPrice(e.target.value)}
                                                placeholder="Ex: 850000"
                                                className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-4 pr-12 py-3 text-sm font-bold text-[#2c3e50] focus:bg-white focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Ar</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Message au client (optionnel)</label>
                                        <textarea
                                            rows={4}
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Ex: Délai de fabrication estimé à 3 semaines, bois de palissandre inclus…"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-medium focus:bg-white focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all resize-none"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button type="button" onClick={closeModal} className="flex-1 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-gray-600 rounded-xl py-3 text-xs font-bold transition-all">
                                            Annuler
                                        </button>
                                        <button type="submit" disabled={pending} className="flex-1 bg-[#28a745] hover:bg-[#218838] text-white rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                                            {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                            {pending ? "Envoi…" : "Envoyer au client"}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
