// components/shop/CheckoutModal.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/app/context/CartContext';
import { useSession } from 'next-auth/react';
import { X, Loader2, MapPin, Phone, User, Mail, CreditCard, Truck } from 'lucide-react';
import { getGroupedZones, getDeliveryZone } from '@/lib/delivery';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
    const { cartItems, cartTotal, clearCart } = useCart();
    const { data: session } = useSession();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deliveryZone, setDeliveryZone] = useState('');

    // Champs du formulaire (pré-remplis si l'utilisateur est connecté, vides sinon)
    const [formData, setFormData] = useState({
        customerName: session?.user ? `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() || session.user.name || '' : '',
        email: session?.user?.email || '',
        phone: '',
        address: session?.user?.address || '',
    });

    // Frais de livraison dérivés de la zone choisie (l'affichage est indicatif :
    // le montant fait toujours foi côté serveur).
    const groupedZones = getGroupedZones();
    const selectedZone = getDeliveryZone(deliveryZone);
    const deliveryFee = selectedZone?.fee ?? 0;
    const grandTotal = cartTotal + deliveryFee;

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedZone) {
            setError("Veuillez sélectionner votre zone de livraison.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: session?.user?.id || null, // Reste null si non connecté
                    ...formData,
                    deliveryZone,
                    items: cartItems,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Une erreur est survenue.");
            }

            // La commande est créée (en attente de paiement). On vide le panier local
            // et on redirige vers l'écran de paiement sécurisé.
            clearCart();
            router.push(`/paiement/${data.paymentRef}`);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-sans antialiased text-gray-900 animate-fadeIn">
            <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 relative max-h-[90vh] flex flex-col">

                {/* Header (Harmonisé aux couleurs Ndanty) */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-lg font-black text-gray-900 uppercase tracking-wider">
                            Finaliser ma <span className="text-[#28a745]">commande</span>
                        </h2>
                        <p className="text-xs text-gray-500 font-medium">Vos informations pour la livraison à Madagascar</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                        <X size={18} />
                    </button>
                </div>

                {/* Contenu défilant */}
                <div className="p-6 overflow-y-auto flex-1">
                    <form onSubmit={handleSubmit} className="space-y-5">

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl">
                                    ⚠️ {error}
                                </div>
                            )}

                            {/* Récapitulatif du montant : sous-total + livraison + total */}
                            <div className="p-4 bg-[#28a745]/5 border border-[#28a745]/10 rounded-xl space-y-2">
                                <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                                    <span>Sous-total produits</span>
                                    <span className="text-gray-700">{cartTotal.toLocaleString('fr-FR')} Ar</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                                    <span>Frais de livraison</span>
                                    <span className="text-gray-700">
                                        {selectedZone ? `${deliveryFee.toLocaleString('fr-FR')} Ar` : '—'}
                                    </span>
                                </div>
                                <div className="border-t border-[#28a745]/15 pt-2 flex justify-between items-center">
                                    <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Total à régler :</span>
                                    <span className="text-lg font-black text-[#28a745]">{grandTotal.toLocaleString('fr-FR')} Ar</span>
                                </div>
                            </div>

                            {/* Champ Nom */}
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Nom complet</label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        required
                                        value={formData.customerName}
                                        onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                                        placeholder="Ex: Rakoto Jean"
                                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl py-3 px-10 text-xs focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] focus:bg-white outline-none font-medium transition-all"
                                    />
                                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#28a745] transition-colors" />
                                </div>
                            </div>

                            {/* Champ Email */}
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Adresse Email</label>
                                <div className="relative group">
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        placeholder="Ex: jean@gmail.com"
                                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl py-3 px-10 text-xs focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] focus:bg-white outline-none font-medium transition-all"
                                    />
                                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#28a745] transition-colors" />
                                </div>
                            </div>

                            {/* Champ Téléphone */}
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    Numéro de téléphone (Malagasy)
                                </label>
                                <div className="relative group">
                                    <input
                                        type="tel"
                                        required
                                        pattern="^03[2348]\d{7}$" // Impose : commence par 032, 033, 034, 038 et fait 10 chiffres
                                        maxLength={10}
                                        value={formData.phone}
                                        onChange={(e) => {
                                            // Permet uniquement de taper des chiffres
                                            const value = e.target.value.replace(/\D/g, '');
                                            setFormData({...formData, phone: value});
                                        }}
                                        placeholder="Ex: 0340000000"
                                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl py-3 px-10 text-xs focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] focus:bg-white outline-none font-medium transition-all"
                                    />
                                    <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#28a745] transition-colors" />
                                </div>
                                <p className="text-[9px] text-gray-400 font-medium">Doit contenir 10 chiffres (ex: 034...) pour la confirmation.</p>
                            </div>

                            {/* Champ Adresse */}
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Adresse exacte de livraison</label>
                                <div className="relative group">
                                    <textarea
                                        required
                                        rows={2}
                                        value={formData.address}
                                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                                        placeholder="Lot, Quartier, Ville (Ex: Lot IVG 25, Antanimena, Antananarivo)"
                                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl py-3 px-10 text-xs focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] focus:bg-white outline-none font-medium resize-none transition-all"
                                    />
                                    <MapPin size={14} className="absolute left-3.5 top-4 text-gray-400 group-focus-within:text-[#28a745] transition-colors" />
                                </div>
                            </div>

                            {/* Champ Zone de livraison */}
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Zone de livraison</label>
                                <div className="relative group">
                                    <select
                                        required
                                        value={deliveryZone}
                                        onChange={(e) => setDeliveryZone(e.target.value)}
                                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl py-3 px-10 text-xs focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] focus:bg-white outline-none font-medium transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="" disabled>Sélectionnez votre zone…</option>
                                        {groupedZones.map((g) => (
                                            <optgroup key={g.group} label={g.group}>
                                                {g.zones.map((z) => (
                                                    <option key={z.id} value={z.id}>
                                                        {z.label} — {z.fee.toLocaleString('fr-FR')} Ar
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <Truck size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#28a745] transition-colors" />
                                </div>
                                {selectedZone && (
                                    <p className="text-[9px] text-gray-400 font-medium">
                                        Livraison estimée : {selectedZone.eta}.
                                    </p>
                                )}
                            </div>

                            {/* Bouton de soumission Vert Ndanty et interactif */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#28a745] hover:bg-black text-white py-4 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-md hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 mt-2 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Traitement en cours...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard size={14} />
                                        Continuer vers le paiement
                                    </>
                                )}
                            </button>
                        </form>
                </div>
            </div>
        </div>
    );
}