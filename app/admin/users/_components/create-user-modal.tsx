'use client';

// app/admin/users/_components/create-user-modal.tsx
// Ouverture d'un compte depuis le back-office — client ou gestionnaire.
// Remplace le passage obligé par `npm run seed` pour créer un accès administrateur.
// Le mot de passe suit la politique Ndanty et part haché : il n'est affiché ici
// qu'une seule fois, le temps de le transmettre à son destinataire.

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, Copy, Eye, EyeOff, Loader2, RefreshCw, Shield, User, UserPlus } from 'lucide-react';
import DetailModal, { DetailSection } from '@/components/admin/DetailModal';
import PasswordStrength from '@/components/auth/PasswordStrength';
import { validatePassword } from '@/lib/password';
import { createUserAction } from '../actions';

const FIELD =
    'w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-semibold text-[#2c3e50] placeholder:text-gray-300 focus:bg-white focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all';
const LABEL = 'text-[10px] font-bold text-gray-400 uppercase tracking-wider';

/** Mot de passe conforme à la politique, prêt à être transmis au nouveau compte. */
function generatePassword(): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%&*?';
    const all = upper + lower + digits + symbols;
    const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
    const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
    while (chars.length < 14) chars.push(pick(all));
    return chars.sort(() => Math.random() - 0.5).join('');
}

const ROLES = [
    {
        key: 'USER',
        icon: <User size={14} />,
        title: 'Client',
        help: 'Accès à la boutique, au panier et à son espace personnel.',
    },
    {
        key: 'ADMIN',
        icon: <Shield size={14} />,
        title: 'Gestionnaire',
        help: 'Accès complet au back-office : catalogue, commandes, devis, avis, comptes.',
    },
];

export default function CreateUserModal({ onClose }: { onClose: () => void }) {
    const router = useRouter();
    const [form, setForm] = useState({
        firstName: '', lastName: '', email: '', password: '', role: 'USER', address: '', country: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<{ email: string; role: string; password: string } | null>(null);

    const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

    const submit = async () => {
        setError(null);

        if (!form.firstName.trim() || !form.lastName.trim()) {
            setError('Le prénom et le nom sont obligatoires.');
            return;
        }
        const pwCheck = validatePassword(form.password);
        if (!pwCheck.ok) {
            setError(pwCheck.error || 'Mot de passe non conforme.');
            return;
        }

        setPending(true);
        const result = await createUserAction(form);
        setPending(false);

        if (!result.success) {
            setError(result.error || 'Impossible de créer ce compte.');
            return;
        }

        setCreated({ email: form.email.trim().toLowerCase(), role: form.role, password: form.password });
        router.refresh();
    };

    const copyCredentials = async () => {
        if (!created) return;
        await navigator.clipboard.writeText(`Ndanty — accès ${created.role}\nE-mail : ${created.email}\nMot de passe : ${created.password}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    // ─── Écran de confirmation : le mot de passe ne sera plus jamais lisible ───
    if (created) {
        return (
            <DetailModal
                open
                onClose={onClose}
                maxWidth="max-w-lg"
                eyebrow="Compte créé"
                title={created.email}
                subtitle={created.role === 'ADMIN' ? 'Accès gestionnaire au back-office' : 'Compte client'}
                footer={
                    <div className="flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-white bg-[#28a745] hover:bg-[#218838] transition-colors"
                        >
                            Terminer
                        </button>
                    </div>
                }
            >
                <div className="bg-[#28a745]/5 border border-[#28a745]/20 rounded-2xl p-5 text-center">
                    <div className="inline-flex p-3 rounded-full bg-[#28a745] text-white mb-3">
                        <Check size={20} />
                    </div>
                    <p className="text-xs font-bold text-[#2c3e50]">
                        Le compte est actif immédiatement.
                    </p>
                    <p className="text-[11px] font-semibold text-gray-500 mt-1 leading-relaxed">
                        Transmettez ces identifiants à leur titulaire : le mot de passe est haché en base,
                        il ne pourra plus être affiché.
                    </p>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 font-mono text-xs text-[#2c3e50] break-all space-y-1">
                    <p><span className="text-gray-400">E-mail :</span> {created.email}</p>
                    <p><span className="text-gray-400">Mot de passe :</span> {created.password}</p>
                </div>

                <button
                    onClick={copyCredentials}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-[#28a745] bg-[#28a745]/10 hover:bg-[#28a745] hover:text-white transition-colors"
                >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Identifiants copiés' : 'Copier les identifiants'}
                </button>
            </DetailModal>
        );
    }

    // ─── Formulaire de création ───
    return (
        <DetailModal
            open
            onClose={pending ? () => {} : onClose}
            maxWidth="max-w-xl"
            eyebrow="Nouveau compte"
            title="Ouvrir un accès Ndanty"
            subtitle="Client ou gestionnaire du back-office"
            footer={
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={pending}
                        className="px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-[#2c3e50] hover:bg-gray-100 transition-colors disabled:opacity-40"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={submit}
                        disabled={pending}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-white bg-[#28a745] hover:bg-[#218838] transition-colors disabled:opacity-60"
                    >
                        {pending ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                        {pending ? 'Création…' : 'Créer le compte'}
                    </button>
                </div>
            }
        >
            <DetailSection title="Identité">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className={LABEL}>Prénom</label>
                        <input value={form.firstName} onChange={(e) => set({ firstName: e.target.value })} className={FIELD} placeholder="Hery" autoFocus />
                    </div>
                    <div className="space-y-1.5">
                        <label className={LABEL}>Nom</label>
                        <input value={form.lastName} onChange={(e) => set({ lastName: e.target.value })} className={FIELD} placeholder="Rakoto" />
                    </div>
                </div>
                <div className="space-y-1.5 mt-3">
                    <label className={LABEL}>Adresse e-mail (identifiant de connexion)</label>
                    <input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} className={FIELD} placeholder="hery@ndanty.com" />
                </div>
            </DetailSection>

            <DetailSection title="Rôle du compte">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ROLES.map((r) => (
                        <button
                            key={r.key}
                            type="button"
                            onClick={() => set({ role: r.key })}
                            className={`text-left rounded-2xl border p-4 transition-all ${
                                form.role === r.key
                                    ? 'border-[#28a745] bg-[#28a745]/5 ring-1 ring-[#28a745]/30'
                                    : 'border-gray-100 bg-white hover:border-gray-200'
                            }`}
                        >
                            <span className={`flex items-center gap-2 text-xs font-black ${form.role === r.key ? 'text-[#28a745]' : 'text-[#2c3e50]'}`}>
                                {r.icon} {r.title}
                            </span>
                            <span className="block text-[11px] font-medium text-gray-400 mt-1.5 leading-relaxed">{r.help}</span>
                        </button>
                    ))}
                </div>
                {form.role === 'ADMIN' && (
                    <p className="mt-3 flex items-start gap-2 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                        <Shield size={13} className="shrink-0 mt-0.5" />
                        Ce compte pourra modifier le catalogue, les commandes et les autres comptes.
                        N&apos;ouvrez un accès gestionnaire qu&apos;à une personne de confiance.
                    </p>
                )}
            </DetailSection>

            <DetailSection title="Mot de passe">
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => set({ password: e.target.value })}
                        className={`${FIELD} pr-20`}
                        placeholder="8 caractères minimum, lettres et chiffres"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="p-2 text-gray-400 hover:text-[#2c3e50] rounded-lg transition-colors"
                            title={showPassword ? 'Masquer' : 'Afficher'}
                        >
                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                            type="button"
                            onClick={() => { set({ password: generatePassword() }); setShowPassword(true); }}
                            className="p-2 text-gray-400 hover:text-[#28a745] rounded-lg transition-colors"
                            title="Générer un mot de passe fort"
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </div>
                <PasswordStrength password={form.password} />
            </DetailSection>

            <DetailSection title="Livraison (facultatif)">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className={LABEL}>Adresse</label>
                        <input value={form.address} onChange={(e) => set({ address: e.target.value })} className={FIELD} placeholder="Lot II M 12 Antananarivo" />
                    </div>
                    <div className="space-y-1.5">
                        <label className={LABEL}>Pays</label>
                        <input value={form.country} onChange={(e) => set({ country: e.target.value })} className={FIELD} placeholder="Madagascar" />
                    </div>
                </div>
            </DetailSection>

            {error && (
                <p className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    {error}
                </p>
            )}
        </DetailModal>
    );
}
