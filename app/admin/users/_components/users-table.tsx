'use client';

import { useState, useEffect, useRef } from 'react';
import { User, MapPin, Shield, Calendar, MoreVertical, Edit2, Trash2, Ban, X, Check } from 'lucide-react';
import { deleteUserAction, toggleSuspendUserAction, updateUserAction } from '../actions';

interface UserData {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
    address: string | null;
    country: string | null;
    createdAt: Date;
    image: string | null;
}

interface UsersTableProps {
    users: UserData[];
}

export default function UsersTable({ users }: UsersTableProps) {
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [isPending, setIsPending] = useState(false);

    // États pour la modale d'édition
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', role: '' });

    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- LOGIQUE DYNAMIQUE DES ACTIONS ---

    // Ouvrir la modale de modification
    const handleOpenEditModal = (user: UserData) => {
        setOpenMenuId(null);
        setEditingUser(user);
        setEditForm({
            firstName: user.firstName ?? '',
            lastName: user.lastName ?? '',
            email: user.email,
            role: user.role
        });
    };

    // Soumettre la modification en BDD
    const handleConfirmEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setIsPending(true);

        const res = await updateUserAction(editingUser.id, editForm);
        setIsPending(false);

        if (res.success) {
            setEditingUser(null);
        } else {
            alert(res.error);
        }
    };

    // Suspendre dynamiquement
    const handleSuspend = async (id: number, currentRole: string) => {
        setOpenMenuId(null);
        const actionText = currentRole === 'SUSPENDED' ? 'réactiver' : 'suspendre';
        if (confirm(`Êtes-vous sûr de vouloir ${actionText} cet utilisateur ?`)) {
            setIsPending(true);
            const res = await toggleSuspendUserAction(id, currentRole);
            setIsPending(false);
            if (!res.success) alert(res.error);
        }
    };

    // Supprimer dynamiquement
    const handleDelete = async (id: number) => {
        setOpenMenuId(null);
        if (confirm(`⚠️ Attention : Voulez-vous vraiment supprimer définitivement ce compte de la base de données Ndanty ?`)) {
            setIsPending(true);
            const res = await deleteUserAction(id);
            setIsPending(false);
            if (!res.success) alert(res.error);
        }
    };

    return (
        <div className={`w-full overflow-hidden bg-white rounded-t-2xl border border-gray-100 shadow-sm transition-opacity ${isPending ? 'opacity-60 pointer-events-none' : ''}`}>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                    <tr className="bg-gray-50/70 border-b border-gray-100">
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Utilisateur</th>
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rôle</th>
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Localisation</th>
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date d'inscription</th>
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                    {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="p-5 flex items-center gap-4">
                                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shadow-sm shrink-0">
                                    {user.image ? (
                                        <img src={user.image} alt={user.firstName ?? ''} className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={18} className="text-gray-400" />
                                    )}
                                </div>
                                <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-800 group-hover:text-[#28a745] transition-colors">
                                            {user.firstName} {user.lastName}
                                        </span>
                                    <span className="text-xs text-gray-400 font-medium">{user.email}</span>
                                </div>
                            </td>

                            <td className="p-5">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                                        user.role === 'ADMIN' ? 'bg-red-50 text-red-600 border border-red-100' :
                                            user.role === 'SUSPENDED' ? 'bg-gray-100 text-gray-500 border border-gray-200 line-through' :
                                                'bg-green-50 text-[#28a745] border border-green-100'
                                    }`}>
                                        {user.role === 'ADMIN' && <Shield size={10} />}
                                        {user.role}
                                    </span>
                            </td>

                            <td className="p-5 text-xs font-semibold text-gray-600">
                                <div className="flex items-center gap-1.5">
                                    <MapPin size={14} className="text-gray-300" />
                                    <div className="flex flex-col">
                                        <span>{user.address || 'Non spécifiée'}</span>
                                        <span className="text-[10px] text-gray-400 font-medium">{user.country || '-'}</span>
                                    </div>
                                </div>
                            </td>

                            <td className="p-5 text-xs font-semibold text-gray-500">
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={14} className="text-gray-300" />
                                    {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </div>
                            </td>

                            <td className="p-5 text-right relative">
                                <div className="inline-block text-left">
                                    <button
                                        onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                                        className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-all"
                                    >
                                        <MoreVertical size={16} />
                                    </button>

                                    {openMenuId === user.id && (
                                        <div ref={menuRef} className="absolute right-5 mt-1 w-44 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 py-2 divide-y divide-gray-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                            <div className="py-1">
                                                <button onClick={() => handleOpenEditModal(user)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-[#28a745] transition-colors">
                                                    <Edit2 size={14} className="text-gray-400" /> Modifier
                                                </button>
                                                <button onClick={() => handleSuspend(user.id, user.role)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-orange-500 transition-colors">
                                                    <Ban size={14} className="text-gray-400" />
                                                    {user.role === 'SUSPENDED' ? 'Réactiver' : 'Suspendre'}
                                                </button>
                                            </div>
                                            <div className="py-1">
                                                <button onClick={() => handleDelete(user.id)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors">
                                                    <Trash2 size={14} className="text-red-400" /> Supprimer
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* --- MODALE D'ÉDITION PROFESSIONNELLE INTEGRÉE --- */}
            {editingUser && (
                <div className="fixed inset-0 bg-[#2c3e50]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] border border-gray-100 w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200 relative">
                        <button onClick={() => setEditingUser(null)} className="absolute right-6 top-6 p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-all">
                            <X size={18} />
                        </button>

                        <h3 className="text-xl font-bold text-[#2c3e50] mb-2">Modifier l'utilisateur</h3>
                        <p className="text-xs text-gray-400 font-medium mb-6">Mettez à jour les privilèges ou coordonnées d'inscription.</p>

                        <form onSubmit={handleConfirmEdit} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Prénom</label>
                                    <input type="text" required value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nom</label>
                                    <input type="text" required value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Adresse Email</label>
                                <input type="email" required value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all" />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rôle système</label>
                                <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:bg-white focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all">
                                    <option value="USER">USER (Client Ndanty)</option>
                                    <option value="ADMIN">ADMIN (Gestionnaire)</option>
                                    <option value="SUSPENDED">SUSPENDED (Bloqué)</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-gray-600 rounded-xl py-3 text-xs font-bold transition-all">
                                    Annuler
                                </button>
                                <button type="submit" className="flex-1 bg-[#28a745] hover:bg-[#218838] text-white rounded-xl py-3 text-xs font-bold shadow-md shadow-[#28a745]/10 flex items-center justify-center gap-2 transition-all">
                                    <Check size={14} /> Sauvegarder
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}