'use client'

import { useState } from 'react';
import { createQuote } from '@/app/actions';
import { Upload, Send, CheckCircle2, Loader2, Ruler, MessageSquare, User, Mail, Phone } from 'lucide-react';

export default function SurMesurePage() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError(null);
        try {
            const res = await createQuote(formData);
            if (res.success) {
                setSuccess(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                setError(res.error || "Une erreur est survenue lors de l'envoi.");
            }
        } catch (error) {
            setError("L'image est peut-être trop lourde (max 5 Mo) ou une erreur réseau est survenue.");
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-xl text-center border border-gray-100">
                    <div className="inline-flex p-4 bg-[#28a745]/10 rounded-full mb-6">
                        <CheckCircle2 className="text-[#28a745]" size={48} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Demande reçue !</h2>
                    <p className="text-gray-500 mb-8">
                        Merci de votre confiance. Un email de confirmation vient de vous être envoyé. Notre équipe vous contactera sous peu.
                    </p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="w-full py-4 bg-[#2c3e50] text-white rounded-2xl font-bold hover:bg-black transition-all"
                    >
                        Retour à l'accueil
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fcfcfc] py-16 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <span className="text-[#28a745] font-bold text-sm uppercase tracking-[0.2em]">Service Premium</span>
                    <h1 className="text-4xl md:text-5xl font-black text-[#2c3e50] mt-2 mb-4">Projet Sur Mesure</h1>
                    <p className="text-gray-500 max-w-lg mx-auto">
                        Décrivez votre projet et téléchargez vos plans. Nous vous enverrons un devis précis sous 24h.
                    </p>
                </div>

                <form action={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl shadow-gray-200/50 border border-gray-50">

                    {/* Colonne Gauche : Infos Perso */}
                    <div className="space-y-6">
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            <User size={18} className="text-[#28a745]" /> Vos Coordonnées
                        </h3>

                        <div className="space-y-4">
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input name="name" required placeholder="Nom complet" className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-[#28a745]/20 outline-none transition-all" />
                            </div>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input name="email" type="email" required placeholder="Adresse email" className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-[#28a745]/20 outline-none transition-all" />
                            </div>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input name="phone" required placeholder="Téléphone" className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-[#28a745]/20 outline-none transition-all" />
                            </div>
                        </div>
                    </div>

                    {/* Colonne Droite : Détails Projet */}
                    <div className="space-y-6">
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            <Ruler size={18} className="text-[#28a745]" /> Détails Techniques
                        </h3>

                        <div className="space-y-4">
                            <div className="relative">
                                <Ruler className="absolute left-4 top-4 text-gray-400" size={18} />
                                <input name="dimensions" placeholder="Dimensions (ex: 200x150cm)" className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-[#28a745]/20 outline-none transition-all" />
                            </div>
                            <div className="relative">
                                <MessageSquare className="absolute left-4 top-4 text-gray-400" size={18} />
                                <textarea name="details" required rows={4} placeholder="Décrivez votre besoin..." className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-[#28a745]/20 outline-none transition-all resize-none"></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Zone d'Upload (Pleine largeur) */}
                    <div className="md:col-span-2 space-y-4">
                        <label className="block p-8 border-2 border-dashed border-gray-100 rounded-[2rem] hover:border-[#28a745]/30 transition-all cursor-pointer bg-gray-50/50 text-center group">
                            <input type="file" name="image" className="hidden" accept="image/*" />
                            <div className="inline-flex p-4 bg-white rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                <Upload className="text-[#28a745]" />
                            </div>
                            <p className="text-sm font-bold text-gray-600">Cliquez pour ajouter un plan ou une photo</p>
                            <p className="text-xs text-gray-400 mt-1">Format JPG, PNG (Max 5MB)</p>
                        </label>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-2xl text-center">
                                ⚠️ {error}
                            </div>
                        )}

                        <button
                            disabled={loading}
                            className="w-full py-5 bg-[#28a745] text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-[#28a745]/20 hover:bg-[#218838] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <><Send size={20} /> Envoyer ma demande</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}