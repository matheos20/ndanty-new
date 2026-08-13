'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { resetPassword } from '@/app/actions/auth';
import PasswordField from '@/components/auth/PasswordField';
import PasswordStrength from '@/components/auth/PasswordStrength';

export default function ResetPasswordForm({ token }: { token: string }) {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirm) {
            setError('Les mots de passe ne sont pas identiques.');
            return;
        }

        setLoading(true);
        const res = await resetPassword(token, password, confirm);
        setLoading(false);

        if (res.success) {
            setDone(true);
            setTimeout(() => router.push('/auth-client'), 2500);
        } else {
            setError(res.error || 'Une erreur est survenue.');
        }
    };

    if (done) {
        return (
            <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-green-700 text-sm flex items-start gap-2">
                <CheckCircle size={18} className="shrink-0 mt-0.5" />
                <span>Mot de passe réinitialisé ! Redirection vers la connexion…</span>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold">{error}</div>
            )}

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nouveau mot de passe</label>
                <PasswordField
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 caractères, une lettre et un chiffre"
                    className="w-full pl-11 pr-10 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#28a745]/10 text-[#2c3e50]"
                />
                <PasswordStrength password={password} />
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Confirmer le mot de passe</label>
                <PasswordField
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-10 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#28a745]/10 text-[#2c3e50]"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#28a745] text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-[#28a745]/20 hover:bg-[#218838] transition-all flex items-center justify-center gap-2 group disabled:opacity-75"
            >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <>Réinitialiser <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>}
            </button>

            <p className="text-center">
                <Link href="/auth-client" className="text-[11px] font-bold text-gray-400 hover:text-[#28a745]">Retour à la connexion</Link>
            </p>
        </form>
    );
}
