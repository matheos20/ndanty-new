// app/devis/repondre/[token]/page.tsx
import { prisma } from "@/lib/prisma";
import { AlertTriangle, CheckCircle2, ThumbsUp, ThumbsDown, MessageSquare, Check } from "lucide-react";
import { respondToQuoteFormAction } from "@/app/actions";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ token: string }>;
    searchParams: Promise<{ decision?: string }>;
}

export default async function RepondreDevisPage({ params, searchParams }: PageProps) {
    const { token } = await params;
    const { decision } = await searchParams;

    const quote = token
        ? await prisma.quote.findUnique({ where: { responseToken: token } })
        : null;

    const preselect = decision === "ACCEPTE" || decision === "REFUSE" ? decision : undefined;

    return (
        <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 md:p-10">

                {/* Cas 1 : lien invalide */}
                {(!quote || quote.proposedPrice == null) ? (
                    <div className="text-center py-6 space-y-4">
                        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
                            <AlertTriangle size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-[#2c3e50]">Lien invalide ou expiré</h2>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            Ce lien de réponse n'est plus valable. Vous pouvez retrouver vos propositions
                            dans votre espace personnel, ou nous contacter directement.
                        </p>
                        <a href="/" className="inline-block mt-2 px-8 py-3 bg-[#28a745] text-white text-xs font-bold uppercase tracking-widest rounded-full hover:bg-black transition-all">
                            Retour à l'accueil
                        </a>
                    </div>

                /* Cas 2 : déjà répondu → confirmation */
                ) : quote.clientDecision ? (
                    <div className="text-center py-6 space-y-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                            quote.clientDecision === 'ACCEPTE' ? 'bg-[#28a745]/10 text-[#28a745]' : 'bg-gray-100 text-gray-500'
                        }`}>
                            {quote.clientDecision === 'ACCEPTE' ? <CheckCircle2 size={34} /> : <ThumbsDown size={30} />}
                        </div>
                        <h2 className="text-xl font-black text-[#2c3e50]">
                            {quote.clientDecision === 'ACCEPTE' ? 'Merci, proposition acceptée !' : 'Réponse bien enregistrée'}
                        </h2>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                            {quote.clientDecision === 'ACCEPTE'
                                ? `Nous vous remercions, ${quote.customerName}. Notre équipe va vous recontacter très rapidement pour finaliser votre projet sur mesure.`
                                : `Merci pour votre retour, ${quote.customerName}. N'hésitez pas à nous contacter si vous souhaitez ajuster votre projet.`}
                        </p>
                        {quote.clientResponse && (
                            <p className="text-xs text-gray-400 italic">« {quote.clientResponse} »</p>
                        )}
                        <a href="/" className="inline-block mt-2 px-8 py-3 bg-[#28a745] text-white text-xs font-bold uppercase tracking-widest rounded-full hover:bg-black transition-all">
                            Retour à l'accueil
                        </a>
                    </div>

                /* Cas 3 : formulaire de réponse (fonctionne sans JavaScript) */
                ) : (
                    <form action={respondToQuoteFormAction} className="space-y-6">
                        <input type="hidden" name="token" value={token} />

                        <div className="text-center">
                            <span className="text-[#28a745] font-bold text-xs uppercase tracking-[0.2em]">Votre devis sur mesure</span>
                            <h1 className="text-2xl font-black text-[#2c3e50] mt-1">Bonjour {quote.customerName}</h1>
                            <p className="text-sm text-gray-500 mt-1">Voici la proposition de notre atelier.</p>
                        </div>

                        {/* Récap projet */}
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm text-gray-600">
                            <span className="font-bold text-gray-700">Votre projet : </span>{quote.details}
                            {quote.adminResponse && (
                                <p className="mt-2 pt-2 border-t border-gray-100 text-gray-500 italic">« {quote.adminResponse} »</p>
                            )}
                        </div>

                        {/* Prix */}
                        <div className="flex items-center justify-between bg-[#28a745]/5 border border-[#28a745]/15 rounded-2xl px-5 py-4">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Montant proposé</span>
                            <span className="text-xl font-black text-[#28a745]">{quote.proposedPrice.toLocaleString('fr-FR')} Ar</span>
                        </div>

                        {/* Choix (boutons radio — pas besoin de JavaScript) */}
                        <div className="grid grid-cols-2 gap-3">
                            <label className="cursor-pointer">
                                <input type="radio" name="decision" value="ACCEPTE" defaultChecked={preselect === 'ACCEPTE'} required className="peer sr-only" />
                                <span className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold border-2 bg-white text-[#28a745] border-[#28a745]/30 transition-all peer-checked:bg-[#28a745] peer-checked:text-white peer-checked:border-[#28a745] peer-checked:shadow-lg peer-checked:shadow-[#28a745]/20 hover:border-[#28a745]">
                                    <ThumbsUp size={16} /> J'accepte
                                </span>
                            </label>
                            <label className="cursor-pointer">
                                <input type="radio" name="decision" value="REFUSE" defaultChecked={preselect === 'REFUSE'} required className="peer sr-only" />
                                <span className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold border-2 bg-white text-gray-500 border-gray-200 transition-all peer-checked:bg-red-500 peer-checked:text-white peer-checked:border-red-500 peer-checked:shadow-lg peer-checked:shadow-red-500/20 hover:border-red-300 hover:text-red-500">
                                    <ThumbsDown size={16} /> Je décline
                                </span>
                            </label>
                        </div>

                        {/* Message optionnel */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <MessageSquare size={11} /> Un message pour notre équipe (optionnel)
                            </label>
                            <textarea
                                name="message"
                                rows={3}
                                placeholder="Ex: Parfait, je confirme ! / Le budget dépasse un peu…"
                                className="w-full text-sm p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#28a745] focus:bg-white transition-colors resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-[#28a745] text-white rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
                        >
                            <Check size={16} /> Confirmer ma réponse
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
