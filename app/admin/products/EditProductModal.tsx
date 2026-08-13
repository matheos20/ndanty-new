// app/admin/products/EditProductModal.tsx
'use client';

import { useState, useTransition } from 'react';
import { X, Check, Image as ImageIcon, Loader2 } from 'lucide-react';
import { updateProductAction } from './actions';
import { PRODUCT_CATEGORIES } from './categories';

interface EditProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: {
        id: number;
        name: string;
        description: string;
        price: number;
        category: string;
        subcategory?: string | null;
        stock: number;
        imageUrl?: string | null;
    };
}

export default function EditProductModal({ isOpen, onClose, product }: EditProductModalProps) {
    const [isPending, startTransition] = useTransition();
    const [previewUrl, setPreviewUrl] = useState<string | null>(product.imageUrl || null);

    // États pré-remplis avec les valeurs actuelles du produit
    const [selectedCategory, setSelectedCategory] = useState<string>(product.category || "");

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const res = await updateProductAction(product.id, formData);
            if (res.success) {
                onClose();
            } else {
                alert(res.error);
            }
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    return (
        <div className="fixed inset-0 bg-[#2c3e50]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-[2rem] border border-gray-100 w-full max-w-lg p-8 shadow-2xl relative my-8 animate-in zoom-in-95 duration-150 text-left">

                <button type="button" onClick={onClose} className="absolute right-6 top-6 p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-all">
                    <X size={18} />
                </button>

                <h3 className="text-xl font-bold text-[#2c3e50] mb-1">Modifier le Produit</h3>
                <p className="text-xs text-gray-400 font-medium mb-6">Mettez à jour les informations, la catégorie principale ou la sous-catégorie.</p>

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* ENTRÉE IMAGE */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Image du produit</label>
                        <label className="relative w-full h-32 rounded-2xl border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-100/50 transition-all overflow-hidden group">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain bg-white" />
                            ) : (
                                <>
                                    <div className="p-2.5 bg-white rounded-xl text-gray-400 shadow-sm group-hover:scale-105 transition-transform">
                                        <ImageIcon size={18} />
                                    </div>
                                    <span className="text-[11px] font-bold text-gray-500">Glissez ou sélectionnez une photo</span>
                                </>
                            )}
                            <input type="file" name="image" accept="image/*" onChange={handleFileChange} className="hidden" />
                        </label>
                    </div>

                    {/* NOM */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nom de l'article</label>
                        <input type="text" name="name" required defaultValue={product.name} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all" />
                    </div>

                    {/* BLOC CATÉGORIES DYNAMIQUES */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* CATÉGORIE PRINCIPALE */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Catégorie Principale</label>
                            <select
                                name="category"
                                required
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Choisir...</option>
                                {Object.keys(PRODUCT_CATEGORIES).map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* SOUS-CATÉGORIE */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sous-Catégorie</label>
                            <select
                                name="subcategory"
                                required
                                defaultValue={product.subcategory || ""}
                                disabled={!selectedCategory}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="">Choisir...</option>
                                {selectedCategory && PRODUCT_CATEGORIES[selectedCategory].map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* PRIX */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Prix (FCFA)</label>
                            <input type="number" name="price" required min="0" defaultValue={product.price} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all" />
                        </div>
                        {/* STOCK */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quantité en stock</label>
                            <input type="number" name="stock" defaultValue={product.stock} min="0" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all" />
                        </div>
                    </div>

                    {/* DESCRIPTION */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description de l'article</label>
                        <textarea name="description" rows={3} defaultValue={product.description} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all resize-none" />
                    </div>

                    {/* ACTIONS */}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} disabled={isPending} className="flex-1 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-gray-600 rounded-xl py-3 text-xs font-bold transition-all disabled:opacity-50">
                            Annuler
                        </button>
                        <button type="submit" disabled={isPending} className="flex-1 bg-[#28a745] hover:bg-[#218838] text-white rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Enregistrer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}