// app/dashboard/favorites/page.tsx
'use client';

import { useFavorites } from "@/app/context/FavoritesContext";
import ShopProductCard from "@/components/shop/ShopProductCard";
import { Heart, ArrowLeft, ShoppingBag } from "lucide-react";
import Link from "next/link";

export default function FavoritesPage() {
    const { favorites, loading } = useFavorites();

    // 1. Écran de chargement professionnel pendant la récupération depuis MySQL
    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 bg-[#FDFDFD]">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-[#28a745] rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-gray-500 font-sans">Chargement de vos coups de cœur...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFDFD] flex flex-col items-center pt-4 pb-12 font-sans">

            {/* 📦 LE CADRE CENTRAL (Même structure w-[80%] que le catalogue Shop) */}
            <div className="w-[80%] bg-white shadow-sm border-x border-gray-100 flex flex-col p-12 min-h-[75vh]">

                {/* FIL D'ARIANE / RETOUR */}
                <div className="mb-6">
                    <Link
                        href="/shop"
                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-[#28a745] transition-colors group"
                    >
                        <ArrowLeft size={14} className="transform group-hover:-translate-x-1 transition-transform" />
                        Retour au catalogue
                    </Link>
                </div>

                {/* EN-TÊTE */}
                <div className="border-b border-gray-100 pb-6 mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-normal text-[#2c3e50] italic font-serif flex items-center gap-3">
                            <Heart className="text-[#28a745] fill-[#28a745]" size={28} />
                            Mes Coups de Cœur
                        </h1>
                        <p className="text-gray-400 text-xs font-medium">
                            Retrouvez ici toutes les pièces artisanales Ndanty qui vous ont fait craquer.
                        </p>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 px-4 py-2 rounded-2xl w-max">
                        <span className="text-xs font-bold text-gray-500">
                            {favorites.length} {favorites.length > 1 ? 'meubles sauvegardés' : 'meuble sauvegardé'}
                        </span>
                    </div>
                </div>

                {/* 🛒 GRILLE DES FAVORIS */}
                {favorites.length === 0 ? (
                    /* ÉCRAN VIDE PROFESSIONNEL */
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200 my-auto">
                        <div className="w-16 h-16 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-sm text-gray-300 mb-4">
                            <Heart size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-[#2c3e50] font-serif italic">Aucun favori pour le moment</h3>
                        <p className="text-gray-400 text-xs max-w-sm mx-auto mt-2 leading-relaxed font-sans">
                            Parcourez notre catalogue exclusif et cliquez sur le petit cœur de vos créations en bois noble préférées pour les retrouver ici.
                        </p>
                        <Link
                            href="/shop"
                            className="mt-6 px-6 py-3 bg-[#28a745] hover:bg-[#218838] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm hover:shadow active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <ShoppingBag size={14} />
                            Découvrir la boutique
                        </Link>
                    </div>
                ) : (
                    /* LISTE DES PRODUITS RETROUVÉS */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {favorites.map((product) => (
                            // On passe l'objet produit formaté exactement comme l'attend ton ShopProductCard
                            <ShopProductCard
                                key={product.id}
                                product={{
                                    id: product.id,
                                    name: product.name,
                                    description: product.description || "",
                                    price: product.price,
                                    category: product.category,
                                    subcategory: product.subcategory,
                                    stock: product.stock ?? 1, // Valeur par défaut si non définie
                                    imageUrl: product.imageUrl
                                }}
                            />
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
}