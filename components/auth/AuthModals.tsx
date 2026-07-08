'use client'

import { useState } from 'react';
import { Mail, Lock, User, Globe, X, ArrowRight, Camera, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { registerUser } from '@/app/actions/auth';
import { signIn } from 'next-auth/react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// --- MODAL DE CONNEXION ---
export function LoginModal({ isOpen, onClose }: ModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        const result = await signIn('credentials', {
            redirect: false,
            email,
            password,
        });

        if (result?.error) {
            setError("Identifiants invalides ou erreur de connexion.");
            setLoading(false);
        } else {
            window.location.reload();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="p-8">
                    <div className="relative flex items-center justify-center mb-8">
                        <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">Connexion</h2>
                        <button onClick={onClose} className="absolute right-0 p-2 hover:bg-gray-100 rounded-full transition-all duration-200">
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-[10px] font-bold uppercase tracking-wider">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#28a745] uppercase tracking-widest ml-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                <input name="email" required type="email" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 outline-none focus:border-[#28a745] transition-all" placeholder="votre@email.com" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#28a745] uppercase tracking-widest ml-1">Mot de passe</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                <input name="password" required type="password" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 outline-none focus:border-[#28a745] transition-all" placeholder="••••••••" />
                            </div>
                        </div>
                        <button disabled={loading} className="w-full bg-[#28a745] text-white py-4 rounded-xl font-bold text-sm hover:bg-[#218838] transition-all shadow-lg shadow-[#28a745]/20 flex items-center justify-center gap-2 group">
                            {loading ? <Loader2 className="animate-spin" size={18} /> : "Se connecter"} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

// --- MODAL D'INSCRIPTION ---
export function RegisterModal({ isOpen, onClose }: ModalProps) {
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageError, setImageError] = useState<string | null>(null);

    if (!isOpen) return null;

    // Gestion de la prévisualisation de l'image avec validation de taille
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setImageError(null);

        if (file) {
            // Limite à 100 Ko pour éviter l'erreur 431 de NextAuth Session
            if (file.size > 102400) {
                setImageError("Image trop lourde (Max 100 Ko).");
                setImagePreview(null);
                e.target.value = ""; // Reset l'input
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setFieldErrors({});

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData);

        // On ajoute l'image en Base64 à l'objet data
        if (imagePreview) {
            data.image = imagePreview;
        }

        if (data.password !== data.confirmPassword) {
            setFieldErrors({ confirmPassword: "Les mots de passe ne sont pas identiques." });
            setLoading(false);
            return;
        }

        const result = await registerUser(data);

        if (result.error) {
            setFieldErrors({ general: result.error });
            setLoading(false);
        } else {
            alert("Bienvenue chez Ndanty ! Votre compte est créé.");
            onClose();
            setLoading(false);
            window.location.reload(); // Recharger pour rafraîchir l'état de session
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 max-h-[95vh] overflow-y-auto">
                <div className="p-10">
                    <div className="relative flex flex-col items-center justify-center mb-10">
                        <div className="text-center">
                            <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">S'inscrire</h2>
                            <p className="text-gray-400 text-sm mt-1 font-medium">Rejoignez l'univers Ndanty</p>
                        </div>
                        <button onClick={onClose} className="absolute right-0 top-0 p-2 hover:bg-gray-100 rounded-full transition-all duration-200">
                            <X size={24} className="text-gray-400 hover:text-red-500" />
                        </button>
                    </div>

                    {fieldErrors.general && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-bold text-center uppercase tracking-widest">
                            {fieldErrors.general}
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="grid grid-cols-2 gap-5">
                        {/* Section Photo avec Validation */}
                        <div className="col-span-2 flex flex-col gap-2 p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 mb-2">
                            <div className="flex items-center gap-6">
                                <div className="relative w-20 h-20 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera className="text-gray-300" size={28} />
                                    )}
                                </div>
                                <div className="flex-grow">
                                    <label className="text-[10px] font-bold text-[#28a745] uppercase tracking-widest block mb-2">Photo de profil (Max 100 Ko)</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="text-[10px] text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-[#28a745] file:text-white hover:file:bg-[#218838] cursor-pointer transition-all"
                                    />
                                </div>
                            </div>
                            {imageError && (
                                <p className="text-red-500 text-[9px] font-bold uppercase mt-1 flex items-center gap-1">
                                    <AlertCircle size={12} /> {imageError}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#28a745] uppercase tracking-widest ml-1">Prénom</label>
                            <input name="firstName" required type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 outline-none focus:border-[#28a745]" placeholder="Jean" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#28a745] uppercase tracking-widest ml-1">Nom</label>
                            <input name="lastName" required type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 outline-none focus:border-[#28a745]" placeholder="Dupont" />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-[#28a745] uppercase tracking-widest ml-1">Email professionnel</label>
                            <input name="email" required type="email" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 outline-none focus:border-[#28a745]" placeholder="jean@exemple.com" />
                        </div>

                        <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-[#28a745] uppercase tracking-widest ml-1">Adresse de livraison</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                <input name="address" required type="text" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 outline-none focus:border-[#28a745]" placeholder="Lot 123, Ville, Code Postal" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#28a745] uppercase tracking-widest ml-1">Pays</label>
                            <input name="country" required type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 outline-none focus:border-[#28a745]" placeholder="Madagascar" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#28a745] uppercase tracking-widest ml-1">Mot de passe</label>
                            <input name="password" required type="password" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 outline-none focus:border-[#28a745]" placeholder="••••••••" />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-[#28a745] uppercase tracking-widest ml-1">Confirmer le mot de passe</label>
                            <input name="confirmPassword" required type="password" className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm text-gray-700 outline-none ${fieldErrors.confirmPassword ? 'border-red-500' : 'border-gray-100 focus:border-[#28a745]'}`} placeholder="••••••••" />
                            {fieldErrors.confirmPassword && <p className="text-[9px] text-red-500 font-bold ml-1 uppercase">{fieldErrors.confirmPassword}</p>}
                        </div>

                        <button disabled={loading} className="col-span-2 bg-[#28a745] text-white py-4 rounded-xl font-bold hover:bg-[#218838] transition-all mt-4 flex justify-center items-center gap-2 shadow-lg shadow-[#28a745]/20">
                            {loading ? <Loader2 className="animate-spin" size={20} /> : "Confirmer l'inscription"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}