'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, Loader2, AlertCircle, ShieldCheck, ArrowLeft, KeyRound, Smartphone } from 'lucide-react';
import { signIn } from 'next-auth/react';
import PasswordField from './PasswordField';
import GoogleButton from './GoogleButton';
import OtpInput from './OtpInput';
import { TWO_FACTOR_REQUIRED, TWO_FACTOR_INVALID_PREFIX } from '@/lib/auth-errors';

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
    // Identifiants mémorisés pour rejouer la connexion avec le second facteur.
    const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
    const [code, setCode] = useState('');
    const [useRecovery, setUseRecovery] = useState(false);
    const [recoveryCode, setRecoveryCode] = useState('');

    /**
     * Une seule requête pour les deux étapes : le mot de passe est revérifié en
     * même temps que le code, le second facteur n'est donc jamais isolable.
     */
    const attempt = async (creds: { email: string; password: string }, submittedCode: string) => {
        setLoading(true);
        setError('');

        const result = await signIn('credentials', {
            redirect: false,
            email: creds.email,
            password: creds.password,
            code: submittedCode,
        });

        if (!result?.error) {
            onSuccess();
            return;
        }

        if (result.error === TWO_FACTOR_REQUIRED) {
            setCredentials(creds);
            setCode('');
            setLoading(false);
            return;
        }

        if (result.error.startsWith(TWO_FACTOR_INVALID_PREFIX)) {
            setError(result.error.slice(TWO_FACTOR_INVALID_PREFIX.length));
            setCode('');
            setRecoveryCode('');
            setLoading(false);
            return;
        }

        setError('Email ou mot de passe incorrect.');
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        await attempt(
            { email: String(fd.get('email') || ''), password: String(fd.get('password') || '') },
            ''
        );
    };

    const errorBox = error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-600 text-xs font-bold">
            <AlertCircle size={14} className="shrink-0 mt-px" /> {error}
        </div>
    );

    /* ---------- ÉTAPE 2 : SECOND FACTEUR ---------- */
    if (credentials) {
        return (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="text-center space-y-1">
                    <div className="inline-flex p-2.5 bg-[#28a745]/10 rounded-2xl text-[#28a745]">
                        {useRecovery ? <KeyRound size={20} /> : <Smartphone size={20} />}
                    </div>
                    <p className="text-sm font-black text-[#2c3e50]">
                        {useRecovery ? 'Code de secours' : 'Vérification en deux étapes'}
                    </p>
                    <p className="text-xs text-gray-400 font-medium leading-relaxed">
                        {useRecovery
                            ? "Saisissez l'un des codes remis lors de l'activation. Il ne servira qu'une fois."
                            : 'Saisissez le code à 6 chiffres affiché par votre application d\'authentification.'}
                    </p>
                </div>

                {errorBox}

                {useRecovery ? (
                    <form
                        onSubmit={(e) => { e.preventDefault(); attempt(credentials, recoveryCode); }}
                        className="space-y-4"
                    >
                        <input
                            type="text"
                            autoFocus
                            autoComplete="one-time-code"
                            value={recoveryCode}
                            onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                            placeholder="XXXXX-XXXXX"
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-center text-sm font-black tracking-[0.2em] text-[#2c3e50] outline-none focus:border-[#28a745] transition-all"
                        />
                        <button
                            disabled={loading || recoveryCode.trim().length < 8}
                            className="w-full bg-[#28a745] text-white py-4 rounded-xl font-bold text-sm hover:bg-[#218838] transition-all shadow-lg shadow-[#28a745]/20 flex items-center justify-center gap-2 disabled:opacity-40"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Valider le code de secours'}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <OtpInput
                            value={code}
                            onChange={setCode}
                            onComplete={(value) => attempt(credentials, value)}
                            disabled={loading}
                            autoFocus
                        />
                        <button
                            onClick={() => attempt(credentials, code)}
                            disabled={loading || code.length !== 6}
                            className="w-full bg-[#28a745] text-white py-4 rounded-xl font-bold text-sm hover:bg-[#218838] transition-all shadow-lg shadow-[#28a745]/20 flex items-center justify-center gap-2 disabled:opacity-40"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <><ShieldCheck size={16} /> Vérifier et continuer</>}
                        </button>
                    </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <button
                        onClick={() => { setCredentials(null); setCode(''); setRecoveryCode(''); setUseRecovery(false); setError(''); }}
                        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-[#2c3e50] transition-colors"
                    >
                        <ArrowLeft size={12} /> Retour
                    </button>
                    <button
                        onClick={() => { setUseRecovery((v) => !v); setError(''); setCode(''); setRecoveryCode(''); }}
                        className="text-[10px] font-bold uppercase tracking-wider text-[#28a745] hover:underline"
                    >
                        {useRecovery ? "Utiliser l'application" : 'Téléphone perdu ?'}
                    </button>
                </div>
            </div>
        );
    }

    /* ---------- ÉTAPE 1 : IDENTIFIANTS ---------- */
    return (
        <div className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
            {errorBox}

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

        {/* Connexion via Google (se masque si non configuré) */}
        <GoogleButton callbackUrl="/dashboard" />
        </div>
    );
}
