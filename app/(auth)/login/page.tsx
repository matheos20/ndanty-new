'use client'

import { signIn } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, Loader2, AlertCircle, ShieldCheck, ArrowLeft, KeyRound, Smartphone } from "lucide-react";
import OtpInput from "@/components/auth/OtpInput";
import { TWO_FACTOR_REQUIRED, TWO_FACTOR_INVALID_PREFIX } from "@/lib/auth-errors";

const inputCls =
    "w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#28a745]/30 focus:ring-4 focus:ring-[#28a745]/5 transition-all outline-none text-[#2c3e50]";

function LoginPageInner() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    // Étape 2 : le mot de passe est validé, le second facteur est attendu.
    const [needsCode, setNeedsCode] = useState(false);
    const [code, setCode] = useState("");
    const [useRecovery, setUseRecovery] = useState(false);
    const [recoveryCode, setRecoveryCode] = useState("");
    const router = useRouter();
    const searchParams = useSearchParams();

    // Un compte protégé par 2FA ne peut pas entrer par Google : on l'explique ici.
    useEffect(() => {
        if (searchParams.get("error") === "2fa-required-password") {
            setError("Ce compte est protégé par une double authentification : connectez-vous avec votre mot de passe.");
        }
    }, [searchParams]);

    /**
     * Un seul appel pour les deux étapes : NextAuth revérifie systématiquement le
     * mot de passe avec le code. Le second facteur n'est donc jamais isolable.
     */
    const attempt = async (submittedCode: string) => {
        setLoading(true);
        setError("");

        const result = await signIn("credentials", {
            email,
            password,
            code: submittedCode,
            redirect: false,
        });

        if (!result?.error) {
            router.push("/admin");
            router.refresh();
            return;
        }

        if (result.error === TWO_FACTOR_REQUIRED) {
            setNeedsCode(true);
            setCode("");
            setLoading(false);
            return;
        }

        if (result.error.startsWith(TWO_FACTOR_INVALID_PREFIX)) {
            setError(result.error.slice(TWO_FACTOR_INVALID_PREFIX.length));
            setCode("");
            setRecoveryCode("");
            setLoading(false);
            return;
        }

        // Message serveur exploitable (compte suspendu, trop de tentatives…),
        // sinon formulation neutre pour ne pas révéler l'existence du compte.
        setError(
            result.error.includes(" ") ? result.error : "Identifiants incorrects. Accès refusé."
        );
        setLoading(false);
    };

    const backToCredentials = () => {
        setNeedsCode(false);
        setCode("");
        setRecoveryCode("");
        setUseRecovery(false);
        setError("");
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
                    <p className="text-gray-400 text-sm mt-1 font-medium">
                        {needsCode ? "Vérification en deux étapes" : "Veuillez vous identifier"}
                    </p>
                </div>

                {/* ---------- ÉTAPE 1 : IDENTIFIANTS ---------- */}
                {!needsCode ? (
                    <form
                        onSubmit={(e) => { e.preventDefault(); attempt(""); }}
                        className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 space-y-6"
                    >
                        {error && (
                            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl text-red-600 text-xs font-bold border border-red-100 animate-in fade-in slide-in-from-top-1">
                                <AlertCircle size={16} className="shrink-0 mt-px" />
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
                                    className={inputCls}
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
                                    className={inputCls}
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
                ) : (
                    /* ---------- ÉTAPE 2 : SECOND FACTEUR ---------- */
                    <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                        <div className="text-center space-y-1">
                            <div className="inline-flex p-2.5 bg-[#28a745]/10 rounded-2xl text-[#28a745] mb-1">
                                {useRecovery ? <KeyRound size={20} /> : <Smartphone size={20} />}
                            </div>
                            <p className="text-sm font-black text-[#2c3e50]">
                                {useRecovery ? "Code de secours" : "Code de votre application"}
                            </p>
                            <p className="text-xs text-gray-400 font-medium leading-relaxed">
                                {useRecovery
                                    ? "Saisissez l'un des codes remis lors de l'activation. Il ne servira qu'une fois."
                                    : "Ouvrez votre application d'authentification et saisissez le code à 6 chiffres."}
                            </p>
                        </div>

                        {error && (
                            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl text-red-600 text-xs font-bold border border-red-100 animate-in fade-in slide-in-from-top-1">
                                <AlertCircle size={16} className="shrink-0 mt-px" />
                                {error}
                            </div>
                        )}

                        {useRecovery ? (
                            <form onSubmit={(e) => { e.preventDefault(); attempt(recoveryCode); }} className="space-y-4">
                                <input
                                    type="text"
                                    autoFocus
                                    autoComplete="one-time-code"
                                    value={recoveryCode}
                                    onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                                    placeholder="XXXXX-XXXXX"
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-4 text-center text-sm font-black tracking-[0.2em] text-[#2c3e50] outline-none focus:bg-white focus:border-[#28a745] focus:ring-4 focus:ring-[#28a745]/5 transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={loading || recoveryCode.trim().length < 8}
                                    className="w-full bg-[#28a745] hover:bg-[#218838] text-white py-4 rounded-xl font-bold text-sm shadow-lg shadow-[#28a745]/20 transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : "Valider le code de secours"}
                                </button>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <OtpInput
                                    value={code}
                                    onChange={setCode}
                                    onComplete={attempt}
                                    disabled={loading}
                                    autoFocus
                                />
                                <button
                                    onClick={() => attempt(code)}
                                    disabled={loading || code.length !== 6}
                                    className="w-full bg-[#28a745] hover:bg-[#218838] text-white py-4 rounded-xl font-bold text-sm shadow-lg shadow-[#28a745]/20 transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : "Vérifier et continuer"}
                                </button>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                            <button
                                onClick={backToCredentials}
                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-[#2c3e50] transition-colors pt-4"
                            >
                                <ArrowLeft size={12} /> Retour
                            </button>
                            <button
                                onClick={() => { setUseRecovery((v) => !v); setError(""); setCode(""); setRecoveryCode(""); }}
                                className="text-[10px] font-bold uppercase tracking-wider text-[#28a745] hover:underline pt-4"
                            >
                                {useRecovery ? "Utiliser l'application" : "Téléphone perdu ?"}
                            </button>
                        </div>
                    </div>
                )}

                <p className="text-center mt-8 text-gray-300 text-[10px] uppercase tracking-widest font-bold">
                    &copy; 2026 Ndanty Dashboard v1.0
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    // useSearchParams impose une frontière Suspense côté App Router.
    return (
        <Suspense fallback={null}>
            <LoginPageInner />
        </Suspense>
    );
}
