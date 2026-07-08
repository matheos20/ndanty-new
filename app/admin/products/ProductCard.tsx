// app/admin/products/ProductCard.tsx
'use client';

import { Layers, Box } from 'lucide-react';
import ProductCardActions from "./ProductCardActions";

interface ProductCardProps {
    product: {
        id: number;
        name: string;
        description: string;
        price: number;
        category: string;
        subcategory?: string | null; // ✨ Ajout sécurisé de la sous-catégorie
        stock: number;
        imageUrl?: string | null;
    };
}

export default function ProductCard({ product }: ProductCardProps) {
    // 🎨 Gestion dynamique de la couleur du badge de stock
    const getStockBadge = (stock: number) => {
        if (stock === 0) {
            return { text: "Rupture", css: "bg-red-50 text-red-600 border-red-100" };
        }
        if (stock <= 5) {
            return { text: `${stock} restants`, css: "bg-orange-50 text-orange-600 border-orange-100" };
        }
        return { text: `En stock (${stock})`, css: "bg-green-50 text-green-600 border-green-100" };
    };

    const stockBadge = getStockBadge(product.stock);

    // Fonction pour ouvrir proprement l'image (qu'elle soit en Base64 ou lien standard)
    const handleImagePreview = () => {
        if (!product.imageUrl) return;
        const isBase64 = product.imageUrl.startsWith('data:');
        const finalUrl = isBase64 ? product.imageUrl : `${window.location.origin}${product.imageUrl}`;

        if (isBase64) {
            const newWindow = window.open();
            if (newWindow) {
                newWindow.document.write(`
                    <html>
                        <head>
                            <title>${product.name} - Ndanty</title>
                            <style>
                                body { margin: 0; background: #0e1726; display: flex; justify-content: center; align-items: center; height: 100vh; }
                                img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                            </style>
                        </head>
                        <body>
                            <img src="${finalUrl}" alt="${product.name}" />
                        </body>
                    </html>
                `);
                newWindow.document.close();
            }
        } else {
            window.open(finalUrl, '_blank');
        }
    };

    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col h-full relative">

            {/* MENU D'ACTIONS INTERACTIF (MODIFIER / SUPPRIMER) */}
            <ProductCardActions product={product} />

            {/* ZONE IMAGE */}
            <div className="relative w-full h-48 bg-gray-50 overflow-hidden border-b border-gray-50">
                {product.imageUrl ? (
                    <img
                        src={product.imageUrl}
                        alt={product.name}
                        onClick={handleImagePreview}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                        <Box size={32} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Aucune image</span>
                    </div>
                )}
            </div>

            {/* CONTENU TEXTE */}
            <div className="p-5 flex flex-col flex-grow justify-between gap-4">
                <div className="space-y-1.5">
                    {/* Catégorie & Badge Stock */}
                    <div className="flex items-center justify-between gap-2">
                        {/* ✨ Affichage dynamique combiné : Catégorie > Sous-catégorie */}
                        <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 uppercase tracking-wider flex items-center gap-1 max-w-[70%] truncate">
                            <Layers size={10} className="shrink-0" />
                            <span className="truncate">{product.category}</span>
                            {product.subcategory && (
                                <>
                                    <span className="text-gray-300 font-normal mx-0.5">&gt;</span>
                                    <span className="text-gray-500 font-bold truncate">{product.subcategory}</span>
                                </>
                            )}
                        </span>

                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider shrink-0 ${stockBadge.css}`}>
                            {stockBadge.text}
                        </span>
                    </div>

                    {/* Nom & Description */}
                    <h3 className="font-bold text-[#2c3e50] text-sm group-hover:text-[#28a745] transition-colors line-clamp-1">
                        {product.name}
                    </h3>
                    <p className="text-gray-400 text-[11px] font-medium line-clamp-2 leading-relaxed">
                        {product.description || "Aucune description fournie pour cet article."}
                    </p>
                </div>

                {/* ZONE PRIX */}
                <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Prix de vente</span>
                    <span className="text-base font-black text-[#2c3e50]">
                        {product.price.toLocaleString('fr-FR')} FCFA
                    </span>
                </div>
            </div>
        </div>
    );
}