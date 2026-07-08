// components/dashboard/ProfileForm.tsx
'use client';

import { MapPin, Globe, Lock } from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation"; // 👈 On importe le routeur Next.js

interface ProfileFormProps {
    initialData: {
        firstName: string | null;
        lastName: string | null;
        address: string | null;
        country: string | null;
    };
    clientEmail: string;
}

export default function ProfileForm({ initialData, clientEmail }: ProfileFormProps) {
    const router = useRouter(); // 👈 On initialise le routeur

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const oldPassword = formData.get("oldPassword") as string;
        const newPassword = formData.get("newPassword") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        // Validation sécurité côté client
        if ((oldPassword || newPassword) && newPassword !== confirmPassword) {
            alert("❌ Le nouveau mot de passe et la confirmation ne correspondent pas.");
            return;
        }

        const isChangingPassword = !!(oldPassword || newPassword);

        const profileData = {
            firstName: formData.get("firstName"),
            lastName: formData.get("lastName"),
            address: formData.get("address"),
            country: formData.get("country"),
            oldPassword: oldPassword || null,
            newPassword: newPassword || null,
        };

        try {
            const response = await fetch("/api/user/update", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(profileData),
            });

            const data = await response.json();

            if (response.ok) {
                if (isChangingPassword) {
                    alert("✨ Mot de passe modifié avec succès ! Pour votre sécurité, veuillez vous reconnecter.");

                    // 👈 ANNIHILATION DU BUG 404 :
                    // On dit à NextAuth de déconnecter SANS faire de redirection automatique (redirect: false).
                    // C'est nous qui contrôlons la suite en nettoyant l'URL manuellement.
                    await signOut({ redirect: false });

                    // On pousse l'utilisateur vers la page d'authentification de force
                    router.push("/auth-client");
                } else {
                    alert("✨ Profil mis à jour avec succès !");
                    window.location.reload();
                }
            } else {
                alert(`❌ ${data.message || "Erreur lors de la modification."}`);
            }
        } catch (error) {
            console.error(error);
            alert("Erreur réseau lors de la communication avec le serveur.");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">

            {/* SECTION 1 : INFORMATIONS PERSONNELLES */}
            <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm space-y-6">
                <span className="block text-[10px] font-black uppercase tracking-widest text-[#28a745]">Informations Générales</span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1">Prénom</label>
                        <input type="text" name="firstName" defaultValue={initialData?.firstName || ""} className="w-full px-4 py-3.5 bg-gray-50 border border-transparent rounded-xl text-xs font-bold text-[#2c3e50] outline-none focus:bg-white focus:border-[#28a745]/30 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1">Nom</label>
                        <input type="text" name="lastName" defaultValue={initialData?.lastName || ""} className="w-full px-4 py-3.5 bg-gray-50 border border-transparent rounded-xl text-xs font-bold text-[#2c3e50] outline-none focus:bg-white focus:border-[#28a745]/30 transition-all" />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1">Adresse Email (Non modifiable)</label>
                    <input type="email" disabled defaultValue={clientEmail} className="w-full px-4 py-3.5 bg-gray-100 border border-transparent rounded-xl text-xs font-bold text-gray-400 cursor-not-allowed outline-none" />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1">Adresse Complète de Livraison</label>
                    <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                        <input type="text" name="address" defaultValue={initialData?.address || ""} placeholder="Ex: Lot IVG 25 Antananarivo, Madagascar" className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-xl text-xs font-bold text-[#2c3e50] outline-none focus:bg-white focus:border-[#28a745]/30 transition-all" />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1">Pays</label>
                    <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                        <input type="text" name="country" defaultValue={initialData?.country || ""} placeholder="Madagascar" className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-xl text-xs font-bold text-[#2c3e50] outline-none focus:bg-white focus:border-[#28a745]/30 transition-all" />
                    </div>
                </div>
            </div>

            {/* SECTION 2 : SÉCURITÉ DU COMPTE (MOT DE PASSE) */}
            <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm space-y-6">
                <div>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-amber-500">Sécurité du compte</span>
                    <p className="text-[11px] text-gray-400 mt-0.5">Laissez ces champs vides si vous ne souhaitez pas modifier votre mot de passe.</p>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1">Ancien mot de passe</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                        <input type="password" name="oldPassword" placeholder="Saisissez votre mot de passe actuel" className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-xl text-xs font-bold text-[#2c3e50] outline-none focus:bg-white focus:border-amber-500/30 transition-all" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1">Nouveau mot de passe</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                            <input type="password" name="newPassword" placeholder="Nouveau mot de passe" className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-xl text-xs font-bold text-[#2c3e50] outline-none focus:bg-white focus:border-[#28a745]/30 transition-all" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1">Confirmer le nouveau mot de passe</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                            <input type="password" name="confirmPassword" placeholder="Confirmez le mot de passe" className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-xl text-xs font-bold text-[#2c3e50] outline-none focus:bg-white focus:border-[#28a745]/30 transition-all" />
                        </div>
                    </div>
                </div>
            </div>

            {/* BOUTON UNIQUE DE SAUVEGARDE GLOBALE */}
            <div className="flex justify-end">
                <button type="submit" className="bg-[#28a745] hover:bg-[#218838] text-white px-8 py-4 rounded-xl text-xs font-black shadow-lg shadow-[#28a745]/10 transition-all cursor-pointer">
                    Sauvegarder l'ensemble du profil
                </button>
            </div>
        </form>
    );
}