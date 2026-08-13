'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';

export default function AuthClientPage() {
    const [isLogin, setIsLogin] = useState(true);
    const router = useRouter();

    // Les formulaires partagés gèrent la soumission ; ici on redirige après succès.
    const goDashboard = () => {
        router.push('/dashboard');
        router.refresh();
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
            {/* Carte blanche centrée — même style que la modale */}
            <div className={`w-full ${isLogin ? 'max-w-md' : 'max-w-lg'} bg-white rounded-[2rem] shadow-2xl shadow-gray-200/50 border border-gray-50 p-8 transition-all`}>

                {/* Logo */}
                <div className="text-center mb-6">
                    <div className="text-2xl font-black tracking-tighter text-[#2c3e50]">
                        Ndan<span className="text-[#28a745]">ty.</span>
                    </div>
                </div>

                {/* Onglets Connexion / Inscription */}
                <div className="flex gap-8 justify-center mb-8 border-b border-gray-100 pb-4">
                    <button
                        type="button"
                        onClick={() => setIsLogin(true)}
                        className={`text-sm font-bold uppercase tracking-widest transition-all ${isLogin ? 'text-[#28a745] border-b-2 border-[#28a745] pb-4 -mb-[18px]' : 'text-gray-400'}`}
                    >
                        Connexion
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsLogin(false)}
                        className={`text-sm font-bold uppercase tracking-widest transition-all ${!isLogin ? 'text-[#28a745] border-b-2 border-[#28a745] pb-4 -mb-[18px]' : 'text-gray-400'}`}
                    >
                        Inscription
                    </button>
                </div>

                {isLogin ? <LoginForm onSuccess={goDashboard} /> : <RegisterForm onSuccess={goDashboard} />}

                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-400">
                        {isLogin ? "Pas encore de compte ?" : "Déjà membre ?"}
                        <button
                            type="button"
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-[#28a745] font-bold ml-1 hover:underline"
                        >
                            {isLogin ? "Inscrivez-vous" : "Connectez-vous"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
