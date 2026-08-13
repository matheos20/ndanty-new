'use client';

import { useState } from 'react';
import { Camera, AlertCircle, Loader2, User, Mail, MapPin, Globe } from 'lucide-react';
import { registerUser } from '@/app/actions/auth';
import { signIn } from 'next-auth/react';
import PasswordField from './PasswordField';
import PasswordStrength from './PasswordStrength';

const inputCls = "w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-[#2c3e50] outline-none focus:border-[#28a745] transition-all";

interface Props {
    /** Appelé après une inscription + connexion réussies. */
    onSuccess: () => void;
}

/** Formulaire d'inscription réutilisable (modale ET page /auth-client) — mêmes champs partout. */
export default function RegisterForm({ onSuccess }: Props) {
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [fieldErrors, setFieldErrors] = useState<{ [k: string]: string }>({});
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageError, setImageError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setImageError(null);
        if (file) {
            if (file.size > 102400) {
                setImageError('Image trop lourde (Max 100 Ko).');
                setImagePreview(null);
                setFileName(null);
                e.target.value = '';
                return;
            }
            setFileName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setFieldErrors({});

        const fd = new FormData(e.currentTarget);
        const data: any = Object.fromEntries(fd);
        if (imagePreview) data.image = imagePreview;

        if (data.password !== data.confirmPassword) {
            setFieldErrors({ confirmPassword: 'Les mots de passe ne sont pas identiques.' });
            setLoading(false);
            return;
        }

        const res = await registerUser(data);
        if (res?.error) {
            setFieldErrors({ general: res.error });
            setLoading(false);
            return;
        }

        // Connexion automatique après inscription
        const result = await signIn('credentials', { redirect: false, email: data.email, password: data.password });
        if (result?.error) {
            setFieldErrors({ general: 'Compte créé, mais connexion impossible. Connectez-vous.' });
            setLoading(false);
            return;
        }
        onSuccess();
    };

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            {fieldErrors.general && (
                <div className="col-span-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold text-center">
                    {fieldErrors.general}
                </div>
            )}

            {/* Photo (optionnelle) — bouton personnalisé pour éviter le débordement de l'input natif */}
            <div className="col-span-2 flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <div className="relative w-14 h-14 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                    {imagePreview ? <img src={imagePreview} alt="" className="w-full h-full object-cover" /> : <Camera className="text-gray-300" size={22} />}
                </div>
                <div className="flex-grow min-w-0">
                    <p className="text-[10px] font-bold text-[#28a745] uppercase tracking-wide mb-1.5">Photo de profil <span className="text-gray-400 normal-case">(optionnelle, max 100 Ko)</span></p>
                    <label className="inline-flex items-center gap-2 cursor-pointer max-w-full">
                        <span className="text-[10px] font-bold bg-[#28a745] text-white px-3 py-1.5 rounded-full hover:bg-[#218838] transition-colors shrink-0 whitespace-nowrap">
                            Choisir…
                        </span>
                        <span className="text-[10px] text-gray-400 truncate min-w-0">
                            {fileName || 'Aucun fichier'}
                        </span>
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                    {imageError && <p className="text-red-500 text-[9px] font-bold mt-1 flex items-center gap-1"><AlertCircle size={11} /> {imageError}</p>}
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#28a745] uppercase tracking-widest ml-1">Prénom</label>
                <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={15} />
                    <input name="firstName" required type="text" className={inputCls.replace('px-4', 'pl-10 pr-4')} placeholder="Jean" />
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#28a745] uppercase tracking-widest ml-1">Nom</label>
                <input name="lastName" required type="text" className={inputCls} placeholder="Dupont" />
            </div>

            <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-[#28a745] uppercase tracking-widest ml-1">Email</label>
                <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={15} />
                    <input name="email" required type="email" className={inputCls.replace('px-4', 'pl-10 pr-4')} placeholder="jean@exemple.com" />
                </div>
            </div>

            <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-[#28a745] uppercase tracking-widest ml-1">Adresse de livraison</label>
                <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={15} />
                    <input name="address" required type="text" className={inputCls.replace('px-4', 'pl-10 pr-4')} placeholder="Lot, Quartier, Ville" />
                </div>
            </div>

            <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-[#28a745] uppercase tracking-widest ml-1">Pays</label>
                <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={15} />
                    <input name="country" required type="text" className={inputCls.replace('px-4', 'pl-10 pr-4')} placeholder="Madagascar" />
                </div>
            </div>

            <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-[#28a745] uppercase tracking-widest ml-1">Mot de passe</label>
                <PasswordField
                    name="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    withIcon={false}
                    className={inputCls.replace('px-4', 'px-4 pr-10')}
                    placeholder="Min. 8 caractères, une lettre et un chiffre"
                />
                <PasswordStrength password={password} />
            </div>

            <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-[#28a745] uppercase tracking-widest ml-1">Confirmer le mot de passe</label>
                <PasswordField
                    name="confirmPassword"
                    required
                    withIcon={false}
                    className={`${inputCls.replace('px-4', 'px-4 pr-10')} ${fieldErrors.confirmPassword ? 'border-red-500' : ''}`}
                    placeholder="••••••••"
                />
                {fieldErrors.confirmPassword && <p className="text-[9px] text-red-500 font-bold ml-1">{fieldErrors.confirmPassword}</p>}
            </div>

            <button disabled={loading} className="col-span-2 bg-[#28a745] text-white py-4 rounded-xl font-bold hover:bg-[#218838] transition-all mt-2 flex justify-center items-center gap-2 shadow-lg shadow-[#28a745]/20 disabled:opacity-75">
                {loading ? <Loader2 className="animate-spin" size={20} /> : "Créer mon compte"}
            </button>
        </form>
    );
}
