'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import {
    ShieldCheck, ShieldAlert, Smartphone, QrCode, KeyRound, Copy, Check,
    Loader2, AlertTriangle, Download, RefreshCw, Lock, X, ArrowRight, Eye, EyeOff,
} from 'lucide-react';
import OtpInput from '@/components/auth/OtpInput';
import {
    startTwoFactorSetupAction,
    confirmTwoFactorSetupAction,
    cancelTwoFactorSetupAction,
    regenerateRecoveryCodesAction,
    disableTwoFactorAction,
    type TwoFactorStatus,
} from './actions';

/* =============================================================== */
/*  BRIQUES D'INTERFACE                                            */
/* =============================================================== */

function Alert({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
    const styles = tone === 'error'
        ? 'bg-red-50 border-red-100 text-red-600'
        : 'bg-[#28a745]/5 border-[#28a745]/20 text-[#28a745]';
    return (
        <p className={`text-xs font-bold border rounded-xl px-4 py-3 flex items-start gap-2 ${styles}`}>
            {tone === 'error' ? <AlertTriangle size={14} className="shrink-0 mt-px" /> : <Check size={14} className="shrink-0 mt-px" />}
            <span>{children}</span>
        </p>
    );
}

function PasswordField({
    value, onChange, placeholder = 'Votre mot de passe', disabled,
}: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
            <input
                type={visible ? 'text' : 'password'}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoComplete="current-password"
                className="w-full pl-11 pr-11 py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-[#2c3e50] outline-none focus:bg-white focus:border-[#28a745] focus:ring-4 focus:ring-[#28a745]/5 transition-all disabled:opacity-50"
            />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-300 hover:text-[#28a745] transition-colors"
            >
                {visible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    );
}

/** Affichage unique des codes de secours : copie, téléchargement, accusé de lecture. */
function RecoveryCodesCard({ codes, email, onDone }: { codes: string[]; email: string; onDone: () => void }) {
    const [copied, setCopied] = useState(false);
    const [acknowledged, setAcknowledged] = useState(false);

    const asText = [
        'Codes de secours — Ndanty Administration',
        `Compte : ${email}`,
        'Chaque code ne peut servir qu\'une seule fois.',
        '',
        ...codes.map((c, i) => `${String(i + 1).padStart(2, '0')}.  ${c}`),
    ].join('\n');

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(codes.join('\n'));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* Le presse-papiers peut être refusé : les codes restent lisibles à l'écran. */
        }
    };

    const download = () => {
        const url = URL.createObjectURL(new Blob([asText], { type: 'text/plain;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ndanty-codes-de-secours.txt';
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-white rounded-[2rem] border border-amber-200 shadow-sm overflow-hidden">
            <div className="bg-amber-50 border-b border-amber-100 px-6 sm:px-8 py-5 flex items-start gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-600 shrink-0"><KeyRound size={20} /></div>
                <div>
                    <h3 className="text-base font-black text-[#2c3e50]">Vos codes de secours</h3>
                    <p className="text-xs font-semibold text-amber-700 mt-0.5">
                        Conservez-les hors de ce navigateur. Ils ne seront plus jamais affichés.
                    </p>
                </div>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {codes.map((code, index) => (
                        <div
                            key={code}
                            className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-3 text-center"
                        >
                            <span className="block text-[9px] font-black text-gray-300 tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                            <span className="block text-sm font-black tracking-wider text-[#2c3e50] tabular-nums">{code}</span>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={copy} className="flex-1 flex items-center justify-center gap-2 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-[#2c3e50] rounded-xl py-3 text-xs font-bold transition-all">
                        {copied ? <Check size={14} className="text-[#28a745]" /> : <Copy size={14} />}
                        {copied ? 'Copié' : 'Copier les codes'}
                    </button>
                    <button onClick={download} className="flex-1 flex items-center justify-center gap-2 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-[#2c3e50] rounded-xl py-3 text-xs font-bold transition-all">
                        <Download size={14} /> Télécharger (.txt)
                    </button>
                </div>

                <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
                    <input
                        type="checkbox"
                        checked={acknowledged}
                        onChange={(e) => setAcknowledged(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-[#28a745] cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-gray-500">
                        J'ai mis ces codes en lieu sûr. Sans mon téléphone, ils sont le seul moyen d'accéder au back-office.
                    </span>
                </label>

                <button
                    onClick={onDone}
                    disabled={!acknowledged}
                    className="w-full bg-[#28a745] hover:bg-[#218838] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-3.5 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#28a745]/20"
                >
                    Terminer <ArrowRight size={14} />
                </button>
            </div>
        </div>
    );
}

/* =============================================================== */
/*  PANNEAU PRINCIPAL                                              */
/* =============================================================== */

type Stage = 'idle' | 'password' | 'pairing' | 'codes';

export default function TwoFactorPanel({ status: initialStatus }: { status: TwoFactorStatus }) {
    const [status, setStatus] = useState(initialStatus);
    const [stage, setStage] = useState<Stage>('idle');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    // Appairage
    const [password, setPassword] = useState('');
    const [qr, setQr] = useState<{ qrCode: string; secretDisplay: string } | null>(null);
    const [showSecret, setShowSecret] = useState(false);
    const [code, setCode] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

    // Modales de gestion (compte déjà protégé)
    const [modal, setModal] = useState<null | 'regenerate' | 'disable'>(null);
    const [modalCode, setModalCode] = useState('');
    const [modalPassword, setModalPassword] = useState('');

    const reset = () => {
        setStage('idle');
        setPassword(''); setQr(null); setCode(''); setRecoveryCodes([]);
        setError(null); setShowSecret(false);
    };

    /* ---- Étape 1 : mot de passe → QR code ---- */
    const beginSetup = () => {
        setError(null);
        startTransition(async () => {
            const res = await startTwoFactorSetupAction(password);
            if (!res.success) { setError(res.error); return; }
            setQr({ qrCode: res.qrCode, secretDisplay: res.secretDisplay });
            setStage('pairing');
        });
    };

    /* ---- Étape 2 : code de confirmation → activation ---- */
    const confirmSetup = (submitted: string) => {
        setError(null);
        startTransition(async () => {
            const res = await confirmTwoFactorSetupAction(submitted);
            if (!res.success) { setError(res.error); setCode(''); return; }
            setRecoveryCodes(res.recoveryCodes);
            setStatus((s) => ({
                ...s,
                enabled: true,
                enabledAt: new Date().toISOString(),
                recoveryRemaining: res.recoveryCodes.length,
                recoveryTotal: res.recoveryCodes.length,
            }));
            setStage('codes');
        });
    };

    const abortSetup = () => {
        startTransition(async () => {
            await cancelTwoFactorSetupAction();
            reset();
        });
    };

    /* ---- Gestion d'un compte déjà protégé ---- */
    const regenerate = () => {
        setError(null);
        startTransition(async () => {
            const res = await regenerateRecoveryCodesAction(modalCode);
            if (!res.success) { setError(res.error); return; }
            setRecoveryCodes(res.recoveryCodes);
            setStatus((s) => ({ ...s, recoveryRemaining: res.recoveryCodes.length, recoveryTotal: res.recoveryCodes.length }));
            setModal(null); setModalCode('');
            setStage('codes');
        });
    };

    const disable = () => {
        setError(null);
        startTransition(async () => {
            const res = await disableTwoFactorAction(modalPassword, modalCode);
            if (!res.success) { setError(res.error); return; }
            setStatus((s) => ({ ...s, enabled: false, enabledAt: null, recoveryRemaining: 0, recoveryTotal: 0 }));
            setModal(null); setModalCode(''); setModalPassword('');
            setNotice('Double authentification désactivée. Votre compte n\'est plus protégé que par son mot de passe.');
        });
    };

    /* ---- Affichage des codes de secours (activation ou régénération) ---- */
    if (stage === 'codes' && recoveryCodes.length > 0) {
        return (
            <div className="space-y-5">
                <Alert tone="success">
                    Double authentification active. Un code sera désormais demandé à chaque connexion.
                </Alert>
                <RecoveryCodesCard codes={recoveryCodes} email={status.email} onDone={reset} />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {notice && <Alert tone="success">{notice}</Alert>}

            {/* ---------- CARTE D'ÉTAT ---------- */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
                    <div
                        className={`p-4 rounded-3xl shrink-0 w-fit ${
                            status.enabled ? 'bg-[#28a745]/10 text-[#28a745]' : 'bg-amber-50 text-amber-500'
                        }`}
                    >
                        {status.enabled ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-lg font-black text-[#2c3e50]">Authentification à deux facteurs</h3>
                            <span
                                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                                    status.enabled
                                        ? 'bg-[#28a745]/10 text-[#28a745] border-[#28a745]/20'
                                        : 'bg-amber-50 text-amber-600 border-amber-100'
                                }`}
                            >
                                {status.enabled ? 'Activée' : 'Inactive'}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                            {status.enabled
                                ? 'Un code temporaire est exigé à chaque connexion, en plus du mot de passe.'
                                : 'Votre compte n\'est protégé que par son mot de passe. Un mot de passe dérobé suffirait à ouvrir le back-office.'}
                        </p>
                        <p className="text-[11px] font-bold text-gray-400 mt-2 truncate">{status.email}</p>
                    </div>

                    {status.enabled && stage === 'idle' && (
                        <div className="text-left sm:text-right shrink-0">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Codes de secours</p>
                            <p className="text-2xl font-black text-[#2c3e50] tabular-nums">
                                {status.recoveryRemaining}
                                <span className="text-sm text-gray-300">/{status.recoveryTotal}</span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Bandeau d'alerte quand la réserve de codes s'épuise. */}
                {status.enabled && status.recoveryRemaining <= 2 && (
                    <div className="px-6 sm:px-8 py-4 bg-amber-50 border-t border-amber-100 flex items-center gap-2 text-xs font-bold text-amber-700">
                        <AlertTriangle size={14} className="shrink-0" />
                        Il ne reste que {status.recoveryRemaining} code(s) de secours. Générez-en de nouveaux.
                    </div>
                )}

                {/* ---------- ACTIONS ---------- */}
                <div className="border-t border-gray-50 p-6 sm:p-8 space-y-5">
                    {error && <Alert tone="error">{error}</Alert>}

                    {!status.canManage && (
                        <Alert tone="error">
                            Ce compte se connecte via Google et n'a pas de mot de passe local :
                            la double authentification ne peut pas y être activée.
                        </Alert>
                    )}

                    {/* — Compte protégé : gestion — */}
                    {status.enabled && stage === 'idle' && (
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => { setModal('regenerate'); setError(null); setModalCode(''); }}
                                className="flex-1 flex items-center justify-center gap-2 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-[#2c3e50] rounded-xl py-3.5 text-xs font-bold transition-all"
                            >
                                <RefreshCw size={14} /> Regénérer les codes de secours
                            </button>
                            <button
                                onClick={() => { setModal('disable'); setError(null); setModalCode(''); setModalPassword(''); }}
                                className="flex-1 flex items-center justify-center gap-2 bg-white border border-red-100 hover:bg-red-50 text-red-600 rounded-xl py-3.5 text-xs font-bold transition-all"
                            >
                                <ShieldAlert size={14} /> Désactiver la protection
                            </button>
                        </div>
                    )}

                    {/* — Compte non protégé : démarrage — */}
                    {!status.enabled && stage === 'idle' && status.canManage && (
                        <button
                            onClick={() => { setStage('password'); setError(null); setNotice(null); }}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#28a745] hover:bg-[#218838] text-white rounded-xl px-8 py-3.5 text-xs font-bold transition-all shadow-lg shadow-[#28a745]/20"
                        >
                            <ShieldCheck size={15} /> Activer la double authentification
                        </button>
                    )}

                    {/* — Étape 1 : confirmation d'identité — */}
                    {stage === 'password' && (
                        <div className="max-w-md space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#28a745] ml-1">
                                    Confirmez votre mot de passe
                                </label>
                                <p className="text-xs text-gray-400 font-medium mt-1 mb-2 ml-1">
                                    Étape de sécurité : elle empêche qu'un poste laissé ouvert serve à appairer un autre téléphone.
                                </p>
                            </div>
                            <form onSubmit={(e) => { e.preventDefault(); beginSetup(); }} className="space-y-4">
                                <PasswordField value={password} onChange={setPassword} disabled={isPending} />
                                <div className="flex gap-3">
                                    <button type="button" onClick={reset} disabled={isPending} className="flex-1 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-gray-600 rounded-xl py-3 text-xs font-bold transition-all disabled:opacity-50">
                                        Annuler
                                    </button>
                                    <button type="submit" disabled={isPending || !password} className="flex-1 bg-[#28a745] hover:bg-[#218838] text-white rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40">
                                        {isPending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />} Continuer
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* ---------- ÉTAPE 2 : APPAIRAGE ---------- */}
            {stage === 'pairing' && qr && (
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="px-6 sm:px-8 py-5 border-b border-gray-50 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-2xl bg-[#28a745]/10 text-[#28a745]"><QrCode size={20} /></div>
                            <div>
                                <h3 className="text-base font-black text-[#2c3e50]">Appairez votre application</h3>
                                <p className="text-xs font-semibold text-gray-400">Google Authenticator, Microsoft Authenticator, Authy…</p>
                            </div>
                        </div>
                        <button onClick={abortSetup} disabled={isPending} aria-label="Annuler l'appairage" className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all shrink-0">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Colonne gauche : QR + saisie manuelle */}
                        <div className="space-y-5">
                            <div className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-[#28a745] text-white text-[11px] font-black flex items-center justify-center shrink-0">1</span>
                                <p className="text-sm font-semibold text-[#2c3e50] leading-relaxed">
                                    Ouvrez votre application d'authentification et scannez ce QR code.
                                </p>
                            </div>

                            <div className="flex justify-center">
                                <div className="p-4 bg-white border-2 border-gray-100 rounded-3xl">
                                    <Image
                                        src={qr.qrCode}
                                        alt="QR code d'appairage de la double authentification"
                                        width={220}
                                        height={220}
                                        unoptimized
                                        className="w-[200px] h-[200px] sm:w-[220px] sm:h-[220px]"
                                    />
                                </div>
                            </div>

                            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                        Impossible de scanner ?
                                    </p>
                                    <button
                                        onClick={() => setShowSecret((v) => !v)}
                                        className="text-[10px] font-black uppercase tracking-wider text-[#28a745] hover:underline"
                                    >
                                        {showSecret ? 'Masquer' : 'Saisie manuelle'}
                                    </button>
                                </div>
                                {showSecret && (
                                    <div className="space-y-2 animate-in fade-in duration-150">
                                        <p className="text-xs text-gray-500 font-medium">
                                            Saisissez cette clé dans votre application (type : « basé sur le temps ») :
                                        </p>
                                        <code className="block bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-xs font-black tracking-[0.15em] text-[#2c3e50] break-all">
                                            {qr.secretDisplay}
                                        </code>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Colonne droite : confirmation */}
                        <div className="space-y-5 lg:border-l lg:border-gray-50 lg:pl-8">
                            <div className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-[#28a745] text-white text-[11px] font-black flex items-center justify-center shrink-0">2</span>
                                <p className="text-sm font-semibold text-[#2c3e50] leading-relaxed">
                                    Saisissez le code à 6 chiffres affiché par l'application pour confirmer l'appairage.
                                </p>
                            </div>

                            <OtpInput
                                value={code}
                                onChange={setCode}
                                onComplete={confirmSetup}
                                disabled={isPending}
                                autoFocus
                            />

                            {error && <Alert tone="error">{error}</Alert>}

                            <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-gray-400">
                                <Smartphone size={13} />
                                Le code change toutes les 30 secondes.
                            </div>

                            <button
                                onClick={() => confirmSetup(code)}
                                disabled={isPending || code.length !== 6}
                                className="w-full bg-[#28a745] hover:bg-[#218838] text-white rounded-xl py-3.5 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#28a745]/20 disabled:opacity-40 disabled:shadow-none"
                            >
                                {isPending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                                Vérifier et activer
                            </button>

                            <p className="text-[11px] text-gray-400 font-medium text-center leading-relaxed">
                                La protection ne sera active qu'une fois ce code validé.
                                Vous recevrez ensuite 8 codes de secours.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ---------- MODALES DE GESTION ---------- */}
            {modal && (
                <div className="fixed inset-0 bg-[#2c3e50]/40 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
                    <div className="bg-white rounded-[2rem] border border-gray-100 w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95 duration-150">
                        <button
                            onClick={() => { setModal(null); setError(null); }}
                            className="absolute right-6 top-6 p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-all"
                            aria-label="Fermer"
                        >
                            <X size={18} />
                        </button>

                        <div className={`p-3 rounded-2xl w-fit mb-4 ${modal === 'disable' ? 'bg-red-50 text-red-500' : 'bg-[#28a745]/10 text-[#28a745]'}`}>
                            {modal === 'disable' ? <ShieldAlert size={22} /> : <RefreshCw size={22} />}
                        </div>

                        <h3 className="text-xl font-black text-[#2c3e50] mb-1">
                            {modal === 'disable' ? 'Désactiver la protection' : 'Nouveaux codes de secours'}
                        </h3>
                        <p className="text-xs text-gray-400 font-medium mb-6 leading-relaxed">
                            {modal === 'disable'
                                ? 'Le compte ne sera plus protégé que par son mot de passe. Confirmez avec votre mot de passe ET un code valide.'
                                : 'Les 8 anciens codes seront immédiatement annulés et remplacés. Confirmez avec un code de votre application.'}
                        </p>

                        <form
                            onSubmit={(e) => { e.preventDefault(); modal === 'disable' ? disable() : regenerate(); }}
                            className="space-y-4"
                        >
                            {modal === 'disable' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Mot de passe</label>
                                    <PasswordField value={modalPassword} onChange={setModalPassword} disabled={isPending} />
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 block">
                                    Code de vérification
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    value={modalCode}
                                    disabled={isPending}
                                    onChange={(e) => setModalCode(e.target.value)}
                                    placeholder="123456 ou code de secours"
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-black tracking-wider text-center text-[#2c3e50] outline-none focus:bg-white focus:border-[#28a745] focus:ring-4 focus:ring-[#28a745]/5 transition-all disabled:opacity-50"
                                />
                            </div>

                            {error && <Alert tone="error">{error}</Alert>}

                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => { setModal(null); setError(null); }} disabled={isPending} className="flex-1 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-gray-600 rounded-xl py-3 text-xs font-bold transition-all disabled:opacity-50">
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending || !modalCode || (modal === 'disable' && !modalPassword)}
                                    className={`flex-1 rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all text-white disabled:opacity-40 ${
                                        modal === 'disable' ? 'bg-red-500 hover:bg-red-600' : 'bg-[#28a745] hover:bg-[#218838]'
                                    }`}
                                >
                                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                    {modal === 'disable' ? 'Désactiver' : 'Générer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
