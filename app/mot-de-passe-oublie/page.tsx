'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { requestPasswordReset } from '@/app/actions/auth';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [devLink, setDevLink] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        setDevLink('');

        const res = await requestPasswordReset(email);
        setLoading(false);

        if (!res.success) {
            setError(res.error || 'Une erreur est survenue.');
        } else {
            setMessage(res.message);
            if (res.devLink) setDevLink(res.devLink);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-50 p-10">
                <Link href="/auth-client" className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-[#28a745] transition-colors mb-8">
                    <ArrowLeft size={14} /> Retour à la connexion
                </Link>

                <h1 className="text-2xl font-extrabold text-[#2c3e50] mb-2">Mot de passe oublié ?</h1>
                <p className="text-sm text-gray-500 mb-8">
                    Saisissez votre adresse email : nous vous enverrons un lien pour réinitialiser votre mot de passe.
                </p>

                {message ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-green-700 text-sm flex items-start gap-2">
                            <CheckCircle size={18} className="shrink-0 mt-0.5" />
                            <span>{message}</span>
                        </div>
                        {devLink && (
                            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-700 break-all">
                                <strong>Mode développement</strong> (pas de serveur mail) — lien de test :<br />
                                <Link href={devLink.replace(/^https?:\/\/[^/]+/, '')} className="text-[#28a745] underline font-bold">
                                    {devLink}
                                </Link>
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold">
                                {error}
                            </div>
                        )}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Adresse email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nom@exemple.com"
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#28a745]/10 text-[#2c3e50]"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#28a745] text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-[#28a745]/20 hover:bg-[#218838] transition-all flex items-center justify-center gap-2 group disabled:opacity-75"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <>Envoyer le lien <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
