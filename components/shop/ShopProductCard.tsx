// components/shop/ShopProductCard.tsx
'use client';

import { ShoppingCart, Layers, Heart, Star, StarHalf } from 'lucide-react'; // 👈 1. Ajout de StarHalf
import Link from 'next/link';
import { useCart } from '@/app/context/CartContext';
import { useFavorites } from '@/app/context/FavoritesContext';

interface ShopProductCardProps {
    product: {
        id: number;
        name: string;
        description: string;
        price: number;
        category: string;
        subcategory?: string | null;
        stock: number;
        imageUrl?: string | null;
        rating?: number; // 👈 2. Ajout de la note dynamique optionnelle
    };
}

export default function ShopProductCard({ product }: ShopProductCardProps) {
    const { addToCart } = useCart();
    const { isFavorite, toggleFavorite } = useFavorites();

    const isLiked = isFavorite(product.id);
    const isOutOfStock = product.stock === 0;

    // 3. Note par défaut (4.5) si le produit n'a pas de note en BDD
    const productRating = product.rating ?? 4.5;

    // 4. Fonction magique pour générer le tableau d'étoiles (pleines, demies, vides)
    const renderStars = (rating: number) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                // Étoile pleine dorée
                stars.push(<Star key={i} size={12} className="fill-[#f39c12] text-[#f39c12]" />);
            } else if (i - 0.5 <= rating) {
                // Demi-étoile dorée
                stars.push(<StarHalf key={i} size={12} className="fill-[#f39c12] text-[#f39c12]" />);
            } else {
                // Étoile vide grise
                stars.push(<Star key={i} size={12} className="text-gray-200 fill-gray-100" />);
            }
        }
        return stars;
    };

    return (
        <div className="rainbow-card relative rounded-[2rem] bg-white transition-all duration-500 hover:-translate-y-2 group h-full flex flex-col overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.05)] font-sans">

            <style jsx global>{`
                .rainbow-card { position: relative; z-index: 0; overflow: hidden; }
                .rainbow-card::before {
                    content: ''; position: absolute; z-index: -2; left: -60%; top: -60%; width: 220%; height: 220%;
                    background-color: #28a745; background-repeat: no-repeat; background-size: 50% 50%, 50% 50%;
                    background-position: 0 0, 100% 0, 100% 100%, 0 100%;
                    background-image: linear-gradient(#28a745, #28a745), linear-gradient(#a3e635, #a3e635), linear-gradient(#f59e0b, #f59e0b), linear-gradient(#10b981, #10b981);
                    animation: rotateBorder 4s linear infinite;
                }
                .rainbow-card::after {
                    content: ''; position: absolute; z-index: -1; left: 4px; top: 4px; width: calc(100% - 8px); height: calc(100% - 8px);
                    background: white; border-radius: calc(2rem - 4px);
                }
                @keyframes rotateBorder { 100% { transform: rotate(1turn); } }
            `}</style>

            <div className="relative rounded-[1.95rem] p-4 text-[#2c3e50] flex flex-col flex-grow z-10 bg-transparent">

                {/* BADGES SUPÉRIEURS */}
                <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                    {isOutOfStock ? (
                        <span className="bg-red-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm font-sans">Rupture</span>
                    ) : product.stock <= 5 ? (
                        <span className="bg-orange-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm animate-pulse font-sans">Série Limitée</span>
                    ) : (
                        <span className="bg-[#28a745] text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm font-sans">Nouveau</span>
                    )}
                </div>

                {/* BOUTON FAVORIS */}
                <button
                    onClick={() => toggleFavorite(product.id)}
                    className={`absolute top-4 right-4 z-20 p-2.5 rounded-full transition-all duration-300 shadow-sm group/heart cursor-pointer ${
                        isLiked
                            ? 'bg-[#28a745] text-white'
                            : 'bg-gray-50 text-gray-400 hover:bg-[#28a745] hover:text-white'
                    }`}
                    title={isLiked ? "Retirer des favoris" : "Ajouter aux favoris"}
                >
                    <Heart
                        size={14}
                        className={`transition-transform duration-300 group-hover/heart:scale-110 ${isLiked ? 'fill-white text-white' : ''}`}
                    />
                </button>

                {/* ZONE IMAGE */}
                <Link
                    href={`/shop/${product.id}`}
                    className="relative w-full h-52 bg-white rounded-[1.5rem] overflow-hidden flex items-center justify-center p-4 block cursor-pointer"
                >
                    <div className="absolute w-[100px] h-[100px] bg-[#28a745]/10 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="max-w-full max-h-full object-contain transform group-hover:scale-105 transition-transform duration-500 filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.06)]" />
                    ) : (
                        <span className="text-xs font-bold text-gray-300 uppercase tracking-widest font-sans">Aucune Image</span>
                    )}
                </Link>

                {/* CONTENU TEXTE */}
                <div className="mt-4 flex flex-col flex-grow justify-between gap-4">
                    <div className="space-y-2">
                        {/* FIL D'ARIANE */}
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full w-max max-w-full border border-gray-100 font-sans">
                            <Layers size={10} className="text-[#28a745] shrink-0" />
                            <span className="truncate uppercase tracking-wider text-[9px]">{product.category}</span>
                            {product.subcategory && (
                                <>
                                    <span className="text-gray-300 font-normal">&gt;</span>
                                    <span className="text-[#28a745] truncate uppercase tracking-wider text-[9px]">{product.subcategory}</span>
                                </>
                            )}
                        </div>

                        {/* TITRE */}
                        <Link href={`/shop/${product.id}`} className="block group/title">
                            <h3 className="text-base font-bold text-[#2c3e50] group-hover/title:text-[#28a745] transition-colors duration-300 line-clamp-1 italic font-serif cursor-pointer">
                                {product.name}
                            </h3>
                        </Link>

                        {/* 🌟 ZONE RATING DYNAMIQUE CORRIGÉE */}
                        <div className="flex items-center gap-1">
                            <div className="flex items-center gap-0.5">
                                {renderStars(productRating)}
                            </div>
                            <span className="text-xs font-bold text-gray-400 ml-1 font-sans">
                                {productRating.toFixed(1)}
                            </span>
                        </div>

                        {/* DESCRIPTION */}
                        <p className="text-gray-400 text-xs font-normal line-clamp-2 leading-relaxed font-sans pt-1">
                            {product.description || "Splendide création artisanale Ndanty façonnée avec soin."}
                        </p>
                    </div>

                    {/* PRIX & BOUTON D'AJOUT */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider font-sans">Prix Unique</span>
                            <span className="text-lg font-black text-[#28a745] font-sans">
                                {product.price.toLocaleString('fr-FR')} Ar
                            </span>
                        </div>

                        <button
                            disabled={isOutOfStock}
                            onClick={() => addToCart(product)}
                            className="bg-[#28a745] hover:bg-[#218838] disabled:bg-gray-200 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all duration-300 shadow-sm font-sans shrink-0 active:scale-95 cursor-pointer"
                        >
                            <ShoppingCart size={14} />
                            <span>Prendre</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}