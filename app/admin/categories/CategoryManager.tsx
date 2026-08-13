'use client';

import { useState, useTransition } from 'react';
import {
    Plus, X, Check, Loader2, Pencil, Trash2, FolderTree, Layers,
    CornerDownRight, CheckCircle, AlertTriangle,
} from 'lucide-react';
import {
    createCategoryAction, renameCategoryAction, deleteCategoryAction,
    createSubcategoryAction, renameSubcategoryAction, deleteSubcategoryAction,
} from './actions';

interface SubNode { id: number; name: string; productCount: number; }
interface CatNode { id: number; name: string; productCount: number; subcategories: SubNode[]; }

type Toast = { type: 'success' | 'error'; msg: string } | null;

/* =============================================================== */
/*  MODALE DE SAISIE DE NOM (création / renommage)                 */
/* =============================================================== */
function NameModal({
    open, title, subtitle, initial, submitLabel, onSubmit, onClose,
}: {
    open: boolean;
    title: string;
    subtitle: string;
    initial?: string;
    submitLabel: string;
    onSubmit: (fd: FormData) => Promise<{ success: boolean; error?: string }>;
    onClose: () => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    if (!open) return null;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
            const res = await onSubmit(fd);
            if (res.success) onClose();
            else setError(res.error || 'Une erreur est survenue.');
        });
    };

    return (
        <div className="fixed inset-0 bg-[#2c3e50]/40 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
            <div className="bg-white rounded-[2rem] border border-gray-100 w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95 duration-150">
                <button type="button" onClick={onClose} className="absolute right-6 top-6 p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-all">
                    <X size={18} />
                </button>
                <h3 className="text-xl font-bold text-[#2c3e50] mb-1">{title}</h3>
                <p className="text-xs text-gray-400 font-medium mb-6">{subtitle}</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nom</label>
                        <input
                            type="text"
                            name="name"
                            required
                            autoFocus
                            defaultValue={initial || ''}
                            maxLength={60}
                            placeholder="Ex: Chambre à coucher"
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-[#2c3e50] focus:bg-white focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all"
                        />
                    </div>

                    {error && (
                        <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 flex items-center gap-2">
                            <AlertTriangle size={14} className="shrink-0" /> {error}
                        </p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} disabled={isPending} className="flex-1 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-gray-600 rounded-xl py-3 text-xs font-bold transition-all disabled:opacity-50">
                            Annuler
                        </button>
                        <button type="submit" disabled={isPending} className="flex-1 bg-[#28a745] hover:bg-[#218838] text-white rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {submitLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* =============================================================== */
/*  CARTE D'UNE CATÉGORIE                                          */
/* =============================================================== */
function CategoryCard({
    cat, onToast,
}: {
    cat: CatNode;
    onToast: (t: Toast) => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [renameOpen, setRenameOpen] = useState(false);
    const [addSubOpen, setAddSubOpen] = useState(false);
    const [renameSub, setRenameSub] = useState<SubNode | null>(null);

    const run = (fn: () => Promise<{ success: boolean; error?: string }>, okMsg: string) => {
        startTransition(async () => {
            const res = await fn();
            onToast(res.success ? { type: 'success', msg: okMsg } : { type: 'error', msg: res.error || 'Erreur.' });
        });
    };

    const handleDeleteCat = () => {
        if (!confirm(`Supprimer la catégorie « ${cat.name} » et ses sous-catégories ?`)) return;
        run(() => deleteCategoryAction(cat.id), 'Catégorie supprimée.');
    };

    const handleDeleteSub = (sub: SubNode) => {
        if (!confirm(`Supprimer la sous-catégorie « ${sub.name} » ?`)) return;
        run(() => deleteSubcategoryAction(sub.id), 'Sous-catégorie supprimée.');
    };

    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            {/* EN-TÊTE DE LA CATÉGORIE */}
            <div className="p-5 flex items-start justify-between gap-3 border-b border-gray-50 bg-gradient-to-br from-[#28a745]/[0.04] to-transparent">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-[#28a745]/10 text-[#28a745] rounded-2xl shrink-0">
                        <FolderTree size={20} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-[#2c3e50] text-base truncate">{cat.name}</h3>
                        <p className="text-[11px] font-semibold text-gray-400">
                            {cat.subcategories.length} sous-catégorie{cat.subcategories.length > 1 ? 's' : ''} ·{' '}
                            <span className={cat.productCount > 0 ? 'text-[#28a745]' : 'text-gray-400'}>
                                {cat.productCount} produit{cat.productCount > 1 ? 's' : ''}
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {isPending && <Loader2 size={14} className="animate-spin text-[#28a745] mr-1" />}
                    <button onClick={() => setRenameOpen(true)} title="Renommer" className="p-2 text-gray-400 hover:text-[#2c3e50] hover:bg-gray-50 rounded-xl transition-all">
                        <Pencil size={15} />
                    </button>
                    <button onClick={handleDeleteCat} title="Supprimer" className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            {/* SOUS-CATÉGORIES */}
            <div className="p-5 space-y-2 flex-grow">
                {cat.subcategories.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">Aucune sous-catégorie pour le moment.</p>
                ) : (
                    cat.subcategories.map((sub) => (
                        <div key={sub.id} className="group flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                            <CornerDownRight size={14} className="text-gray-300 shrink-0" />
                            <span className="text-xs font-bold text-[#2c3e50] truncate flex-grow">{sub.name}</span>
                            <span className="text-[10px] font-bold text-gray-400 bg-white border border-gray-100 px-2 py-0.5 rounded-md shrink-0">
                                {sub.productCount}
                            </span>
                            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setRenameSub(sub)} title="Renommer" className="p-1.5 text-gray-400 hover:text-[#2c3e50] hover:bg-white rounded-lg transition-all">
                                    <Pencil size={13} />
                                </button>
                                <button onClick={() => handleDeleteSub(sub)} title="Supprimer" className="p-1.5 text-red-400 hover:text-red-600 hover:bg-white rounded-lg transition-all">
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* PIED : AJOUTER UNE SOUS-CATÉGORIE */}
            <div className="p-4 border-t border-gray-50">
                <button
                    onClick={() => setAddSubOpen(true)}
                    className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-[#28a745]/10 text-gray-500 hover:text-[#28a745] border border-dashed border-gray-200 hover:border-[#28a745]/40 rounded-xl py-2.5 text-xs font-bold transition-all"
                >
                    <Plus size={14} /> Sous-catégorie
                </button>
            </div>

            {/* MODALES */}
            <NameModal
                open={renameOpen}
                title="Renommer la catégorie"
                subtitle="Le nouveau nom sera appliqué à tous les produits rattachés."
                initial={cat.name}
                submitLabel="Renommer"
                onClose={() => setRenameOpen(false)}
                onSubmit={(fd) => renameCategoryAction(cat.id, fd)}
            />
            <NameModal
                open={addSubOpen}
                title="Nouvelle sous-catégorie"
                subtitle={`Ajout dans « ${cat.name} ».`}
                submitLabel="Ajouter"
                onClose={() => setAddSubOpen(false)}
                onSubmit={(fd) => createSubcategoryAction(cat.id, fd)}
            />
            {renameSub && (
                <NameModal
                    open={!!renameSub}
                    title="Renommer la sous-catégorie"
                    subtitle="Le nouveau nom sera appliqué aux produits rattachés."
                    initial={renameSub.name}
                    submitLabel="Renommer"
                    onClose={() => setRenameSub(null)}
                    onSubmit={(fd) => renameSubcategoryAction(renameSub.id, fd)}
                />
            )}
        </div>
    );
}

/* =============================================================== */
/*  GESTIONNAIRE PRINCIPAL                                          */
/* =============================================================== */
export default function CategoryManager({ categories }: { categories: CatNode[] }) {
    const [addOpen, setAddOpen] = useState(false);
    const [toast, setToast] = useState<Toast>(null);

    // Affiche le toast puis le masque automatiquement.
    const showToast = (t: Toast) => {
        setToast(t);
        if (t) setTimeout(() => setToast(null), 3500);
    };

    return (
        <div className="space-y-6">
            {/* TOAST */}
            {toast && (
                <div className="fixed top-24 right-6 z-[100] animate-in slide-in-from-right fade-in duration-300">
                    <div className={`text-white p-4 pr-5 rounded-2xl shadow-xl flex items-center gap-3 border ${
                        toast.type === 'success'
                            ? 'bg-[#28a745] border-[#218838] shadow-[#28a745]/30'
                            : 'bg-red-600 border-red-700 shadow-red-600/30'
                    }`}>
                        {toast.type === 'success' ? <CheckCircle size={22} /> : <AlertTriangle size={22} />}
                        <p className="text-sm font-bold max-w-xs">{toast.msg}</p>
                        <button onClick={() => setToast(null)} className="text-white/70 hover:text-white">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* BARRE D'ACTION */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-gray-400">
                    <Layers size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Arborescence du catalogue</span>
                </div>
                <button
                    onClick={() => setAddOpen(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#28a745] hover:bg-[#218838] text-white px-6 py-3 rounded-2xl text-xs font-bold transition-all shadow-md shadow-green-100"
                >
                    <Plus size={16} /> Nouvelle catégorie
                </button>
            </div>

            {/* GRILLE DES CATÉGORIES */}
            {categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-dashed border-gray-100 shadow-sm">
                    <div className="p-4 bg-gray-50 rounded-full text-gray-300 mb-4">
                        <FolderTree size={48} />
                    </div>
                    <h3 className="text-xl font-bold text-[#2c3e50]">Aucune catégorie</h3>
                    <p className="text-gray-400 mt-2 text-center max-w-xs text-xs">
                        Créez votre première catégorie pour structurer le catalogue Ndanty.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {categories.map((cat) => (
                        <CategoryCard key={cat.id} cat={cat} onToast={showToast} />
                    ))}
                </div>
            )}

            {/* MODALE DE CRÉATION DE CATÉGORIE */}
            <NameModal
                open={addOpen}
                title="Nouvelle catégorie"
                subtitle="Créez un nouveau rayon principal du catalogue."
                submitLabel="Créer"
                onClose={() => setAddOpen(false)}
                onSubmit={createCategoryAction}
            />
        </div>
    );
}
