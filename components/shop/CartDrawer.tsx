// components/shop/CartDrawer.tsx
'use client';

import { useState } from 'react';
import { X, Trash2, ShoppingBag, Plus, Minus } from 'lucide-react';
import { useCart } from '@/app/context/CartContext';
import CheckoutModal from './CheckoutModal'; // Importation de la modale de checkout

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
    const { cartItems, removeFromCart, updateQuantity, cartTotal } = useCart();

    // État pour gérer l'ouverture de la modale de finalisation de commande
    const [isCheckoutOpen, setCheckoutOpen] = useState(false);

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 overflow-hidden font-sans">
                {/* L'arrière-plan sombre flouté */}
                <div
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />

                <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
                    <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full rounded-l-[2rem]">

                        {/* EN-TÊTE */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShoppingBag className="text-[#28a745] w-5 h-5" />
                                <h2 className="text-lg font-black text-[#2c3e50] uppercase tracking-wider">Mon Panier</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* LISTE DES PRODUITS */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {cartItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-3">
                                    <ShoppingBag size={48} className="stroke-1 text-gray-300 animate-pulse" />
                                    <p className="text-sm font-medium">Votre panier est encore vide.</p>
                                </div>
                            ) : (
                                cartItems.map((item) => (
                                    <div key={item.id} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        {/* Image miniature */}
                                        <div className="w-16 h-16 bg-white rounded-xl overflow-hidden p-2 border border-gray-100 flex items-center justify-center shrink-0">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt={item.name} className="max-w-full max-h-full object-contain" />
                                            ) : (
                                                <ShoppingBag size={20} className="text-gray-300" />
                                            )}
                                        </div>

                                        {/* Infos Prooduit */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-[#2c3e50] truncate italic font-serif">{item.name}</h4>
                                            <p className="text-xs font-black text-[#28a745] mt-1">
                                                {item.price.toLocaleString('fr-FR')} Ar
                                            </p>

                                            {/* Actions Quantité */}
                                            <div className="flex items-center gap-2 mt-2">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="p-1 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <span className="text-xs font-bold text-[#2c3e50] w-4 text-center">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="p-1 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Bouton Supprimer */}
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* TOTAL & BOUTON D'ACTION */}
                        {cartItems.length > 0 && (
                            <div className="p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-[2rem]">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sous-total</span>
                                    <span className="text-xl font-black text-[#2c3e50]">
                                        {cartTotal.toLocaleString('fr-FR')} Ar
                                    </span>
                                </div>
                                <button
                                    onClick={() => setCheckoutOpen(true)}
                                    className="w-full py-4 bg-[#2c3e50] hover:bg-[#28a745] text-white font-bold text-xs uppercase tracking-widest rounded-full transition-all duration-300 shadow-md hover:shadow-lg active:scale-[0.98]"
                                >
                                    Passer la commande
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Injection de la modale de validation de commande */}
            <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setCheckoutOpen(false)} />
        </>
    );
}