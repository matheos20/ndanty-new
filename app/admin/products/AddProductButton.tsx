// app/admin/products/AddProductButton.tsx
'use client';

import { useState } from 'react';
import AddProductModal from './AddProductModal';

export default function AddProductButton() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="w-full sm:w-auto bg-[#28a745] hover:bg-[#218838] text-white px-6 py-3 rounded-2xl text-xs font-bold transition-all shadow-md shadow-green-100 cursor-pointer"
            >
                + Nouveau Produit
            </button>

            {/* Inclusion de la modale gérée par l'état local */}
            <AddProductModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
}