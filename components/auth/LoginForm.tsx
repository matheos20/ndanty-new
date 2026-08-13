'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { signIn } from 'next-auth/react';
import PasswordField from './PasswordField';

const inputCls = "w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-[#2c3e50] outline-none focus:border-[#28a745] transition-all";

interface Props {
    /** Appelé après une connexion réussie (ex : recharger la page, ou rediriger). */
    onSuccess: () => void;
    /** Appelé quand on quitte vers une autre page (ex : fermer la modale). */
    onNavigateAway?: () => void;
}

/** Formulaire de connexion réutilisable (modale ET page /auth-client). */
export default function LoginForm({ onSuccess, onNavigateAway }: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const fd = new FormData(e.currentTarget);
        const result = await signIn('credentials', {
            redirect: false,
            email: fd.get('email') as string,
            password: fd.get('password') as string,
        });
        if (result?.error) {
            setError('Email ou mot de passe incorrect.');
            setLoading(false);
        } else {
            onSuccess();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold">
                    <AlertCircle size={14} /> {error}
                </div>
            )}

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#28a745] uppercase tracking-widest ml-1">Email</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input name="email" required type="email" className={inputCls} placeholder="nom@exemple.com" />
                </div>
            </div>

            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-[#28a745] uppercase tracking-widest ml-1">Mot de passe</label>
                    <Link href="/mot-de-passe-oublie" onClick={onNavigateAway} className="text-[10px] font-bold text-gray-400 hover:text-[#28a745] transition-colors">
                        Mot de passe oublié ?
                    </Link>
                </div>
                <PasswordField name="password" required className={inputCls.replace('pr-4', 'pr-10')} placeholder="••••••••" />
            </div>

            <button
                disabled={loading}
                className="w-full bg-[#28a745] text-white py-4 rounded-xl font-bold text-sm hover:bg-[#218838] transition-all shadow-lg shadow-[#28a745]/20 flex items-center justify-center gap-2 group disabled:opacity-75"
            >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <>Se connecter <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>}
            </button>
        </form>
    );
}
