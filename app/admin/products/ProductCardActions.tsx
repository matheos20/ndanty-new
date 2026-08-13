// app/admin/products/ProductCardActions.tsx
'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { MoreVertical, Edit2, Trash2, Loader2 } from 'lucide-react';
import { deleteProductAction } from './actions';
import EditProductModal from './EditProductModal';

interface ProductCardActionsProps {
    product: {
        id: number;
        name: string;
        description: string;
        price: number;
        category: string;
        stock: number;
        imageUrl?: string | null;
    };
}

export default function ProductCardActions({ product }: ProductCardActionsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const menuRef = useRef<HTMLDivElement>(null);

    // Fermer le menu si on clique en dehors
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fonction de suppression sécurisée
    const handleDelete = async () => {
        const confirmDelete = confirm(`Voulez-vous vraiment supprimer le produit "${product.name}" ?`);
        if (!confirmDelete) return;

        startTransition(async () => {
            const res = await deleteProductAction(product.id);
            if (!res.success) {
                alert(res.error);
            }
            setIsOpen(false);
        });
    };

    return (
        <div className="absolute right-4 top-4 z-20" ref={menuRef}>
            {/* BOUTON DECLENCHEUR */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={isPending}
                className="p-2 bg-white/90 backdrop-blur-md border border-gray-100 text-gray-400 hover:text-[#2c3e50] rounded-xl shadow-sm transition-all cursor-pointer"
            >
                {isPending ? <Loader2 size={16} className="animate-spin text-[#28a745]" /> : <MoreVertical size={16} />}
            </button>

            {/* MENU DÉROULANT (DROPDOWN) */}
            {isOpen && (
                <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-100 rounded-2xl shadow-xl p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-150">
                    <button
                        type="button"
                        onClick={() => {
                            setIsEditOpen(true);
                            setIsOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-all cursor-pointer text-left"
                    >
                        <Edit2 size={13} className="text-gray-400" /> Modifier
                    </button>

                    <button
                        type="button"
                        onClick={handleDelete}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer text-left"
                    >
                        <Trash2 size={13} className="text-red-400" /> Supprimer
                    </button>
                </div>
            )}
            {/* MODALE D'ÉDITION DU PRODUIT */}
            <EditProductModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                product={product}
            />
        </div>
    );
}