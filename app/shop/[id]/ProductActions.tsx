// app/shop/[id]/ProductActions.tsx
'use client';

import { ShoppingCart, Check } from 'lucide-react';
import { useCart } from '@/app/context/CartContext';
import { useState } from 'react';

export default function ProductActions({ product }: { product: any }) {
    const { addToCart } = useCart();
    const [added, setAdded] = useState(false);

    const handleTake = () => {
        addToCart(product);
        setAdded(true);
        // Petit effet visuel de succès pendant 2 secondes
        setTimeout(() => setAdded(false), 2000);
    };

    return (
        <div className="pt-4">
            <button
                onClick={handleTake}
                disabled={product.stock <= 0}
                className={`w-full py-5 rounded-full font-bold text-xs uppercase tracking-widest transition-all duration-300 shadow-md hover:shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] ${
                    product.stock <= 0
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                        : added
                        ? 'bg-[#28a745] text-white brightness-95'
                        : 'bg-[#28a745] hover:bg-black text-white'
                }`}
            >
                {added ? (
                    <>
                        <Check size={16} className="animate-scaleUp" />
                        Ajouté au Panier !
                    </>
                ) : (
                    <>
                        <ShoppingCart size={16} />
                        {product.stock <= 0 ? 'Rupture de stock' : 'Prendre ce meuble'}
                    </>
                )}
            </button>
        </div>
    );
}