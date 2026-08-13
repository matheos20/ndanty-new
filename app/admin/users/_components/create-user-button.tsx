'use client';

// app/admin/users/_components/create-user-button.tsx
// Point d'entrée de la création de compte depuis le back-office (la page reste un
// composant serveur : seul ce bouton et sa modale vivent côté client).

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import CreateUserModal from './create-user-modal';

export default function CreateUserButton() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#28a745] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#218838] transition-colors shadow-sm shadow-[#28a745]/20"
            >
                <UserPlus size={14} /> Nouveau compte
            </button>

            {open && <CreateUserModal onClose={() => setOpen(false)} />}
        </>
    );
}
