'use client'

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation'; // 👈 Nettoyé et configuré sur l'import unique officiel Next.js
import { Mail, Lock, User, ArrowRight, Loader2, Globe, AlertCircle } from 'lucide-react';

export default function AuthClientPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    // États pour les champs du formulaire
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [country, setCountry] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (isLogin) {
            // --- LOGIQUE DE CONNEXION CLIENT ---
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("Email ou mot de passe incorrect.");
                setLoading(false);
            } else {
                // ✅ CORRIGÉ : Redirection vers la bonne page racine du dashboard
                router.push("/dashboard");
                router.refresh();
            }
        } else {
            // --- LOGIQUE D'INSCRIPTION CLIENT ---
            try {
                const response = await fetch("/api/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ firstName, lastName, country, email, password }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || "Une erreur est survenue.");
                }

                // Si l'inscription réussit, on le connecte automatiquement
                const result = await signIn("credentials", {
                    email,
                    password,
                    redirect: false,
                });

                // ✅ CORRIGÉ : Redirection vers la bonne page racine du dashboard
                router.push("/dashboard");
                router.refresh();
            } catch (err: any) {
                setError(err.message);
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 w-full">
            <div className="w-full max-w-[1000px] bg-white rounded-[3rem] shadow-2xl shadow-gray-200/50 flex overflow-hidden border border-gray-50">

                {/* PARTIE GAUCHE : Visuel & Branding */}
                <div className="hidden lg:flex w-1/2 bg-[#28a745] p-12 flex-col justify-between text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="text-3xl font-black tracking-tighter mb-2">Ndanty.</div>
                        <p className="text-[#e1f5e6] text-lg">L'artisanat d'exception, sur mesure.</p>
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-4xl font-bold leading-tight mb-4">
                            {isLogin ? "Heureux de vous revoir !" : "Rejoignez l'univers Ndanty"}
                        </h2>
                        <p className="text-sm text-[#c3e6cb] max-w-sm">
                            Accédez à vos devis personnalisés, suivez vos commandes et gerez vos inspirations en un seul endroit.
                        </p>
                    </div>
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                </div>

                {/* PARTIE DROITE : Formulaire */}
                <div className="w-full lg:w-1/2 p-8 md:p-16">
                    <div className="flex gap-8 mb-10 border-b border-gray-100 pb-4">
                        <button
                            type="button"
                            onClick={() => { setIsLogin(true); setError(""); }}
                            className={`text-sm font-bold uppercase tracking-widest transition-all ${isLogin ? 'text-[#28a745] border-b-2 border-[#28a745] pb-4 -mb-[18px]' : 'text-gray-400'}`}
                        >
                            Connexion
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsLogin(false); setError(""); }}
                            className={`text-sm font-bold uppercase tracking-widest transition-all ${!isLogin ? 'text-[#28a745] border-b-2 border-[#28a745] pb-4 -mb-[18px]' : 'text-gray-400'}`}
                        >
                            Inscription
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl text-red-600 text-xs font-bold border border-red-100">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        {!isLogin && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Prénom</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                            <input
                                                type="text"
                                                required
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                placeholder="Jean"
                                                className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#28a745]/10 text-[#2c3e50]"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nom</label>
                                        <input
                                            type="text"
                                            required
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Dupont"
                                            className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#28a745]/10 text-[#2c3e50]"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Pays</label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                        <input
                                            type="text"
                                            required
                                            value={country}
                                            onChange={(e) => setCountry(e.target.value)}
                                            placeholder="Madagascar"
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#28a745]/10 text-[#2c3e50]"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Email</label>
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

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Mot de passe</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#28a745]/10 text-[#2c3e50]"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#28a745] text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-[#28a745]/20 hover:bg-[#218838] transition-all flex items-center justify-center gap-2 group mt-6 disabled:opacity-75"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={18} />
                            ) : (
                                <>
                                    {isLogin ? "Se connecter" : "Créer mon compte"}
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-gray-400">
                            {isLogin ? "Pas encore de compte ?" : "Déjà membre ?"}
                            <button
                                type="button"
                                onClick={() => { setIsLogin(!isLogin); setError(""); }}
                                className="text-[#28a745] font-bold ml-1 hover:underline"
                            >
                                {isLogin ? "Inscrivez-vous" : "Connectez-vous"}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}