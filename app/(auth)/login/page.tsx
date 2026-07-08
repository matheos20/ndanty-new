'use client'

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, AlertCircle, ShieldCheck } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (result?.error) {
            setError("Identifiants incorrects. Accès refusé.");
            setLoading(false);
        } else {
            router.push("/admin");
            router.refresh();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fdfdfd] p-4 relative">
            {/* Éléments décoratifs discrets */}
            <div className="absolute top-0 left-0 w-full h-1 bg-[#28a745]/20"></div>

            <div className="w-full max-w-[400px]">
                <div className="text-center mb-8">
                    <div className="inline-flex p-3 bg-[#28a745]/10 rounded-2xl mb-4">
                        <ShieldCheck className="text-[#28a745]" size={32} />
                    </div>
                    <h1 className="text-2xl font-black text-[#2c3e50] tracking-tight">Ndanty Admin</h1>
                    <p className="text-gray-400 text-sm mt-1 font-medium">Veuillez vous identifier</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 space-y-6">
                    {error && (
                        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl text-red-600 text-xs font-bold border border-red-100 animate-in fade-in slide-in-from-top-1">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Email Professionnel</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#28a745]/30 focus:ring-4 focus:ring-[#28a745]/5 transition-all outline-none text-[#2c3e50]"
                                placeholder="admin@ndanty.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Mot de passe</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#28a745]/30 focus:ring-4 focus:ring-[#28a745]/5 transition-all outline-none text-[#2c3e50]"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#28a745] hover:bg-[#218838] text-white py-4 rounded-xl font-bold text-sm shadow-lg shadow-[#28a745]/20 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : "Connexion sécurisée"}
                    </button>
                </form>

                <p className="text-center mt-8 text-gray-300 text-[10px] uppercase tracking-widest font-bold">
                    &copy; 2026 Ndanty Dashboard v1.0
                </p>
            </div>
        </div>
    );
}