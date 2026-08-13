// app/admin/quotes/QuoteRowActions.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { MoreVertical, Edit2, Trash2, X, Check, Image as ImageIcon } from 'lucide-react';
import { deleteQuoteAction, updateQuoteAction } from './actions';

interface QuoteRowActionsProps {
    quote: {
        id: number;
        customerName: string;
        email: string;
        phone: string | null;
        details: string;
        dimensions: string | null;
        imageUrl?: string | null;
    };
}

export default function QuoteRowActions({ quote }: QuoteRowActionsProps) {
    const [open, setOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isPending, setIsPending] = useState(false);

    // États du formulaire
    const [form, setForm] = useState({
        customerName: quote.customerName,
        email: quote.email,
        phone: quote.phone || '',
        details: quote.details,
        dimensions: quote.dimensions || ''
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(quote.imageUrl || null);

    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Gérer le changement d'image et sa prévisualisation
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file)); // Crée un lien temporaire pour afficher l'image sur l'écran
        }
    };

    const handleDelete = async () => {
        setOpen(false);
        if (confirm("⚠️ Souhaitez-vous vraiment détruire cette demande de devis sur Ndanty ?")) {
            setIsPending(true);
            const res = await deleteQuoteAction(quote.id);
            setIsPending(false);
            if (!res.success) alert(res.error);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsPending(true);

        // updateQuoteAction attend un objet typé (les champs texte du devis).
        const res = await updateQuoteAction(quote.id, {
            customerName: form.customerName,
            email: form.email,
            phone: form.phone,
            details: form.details,
            dimensions: form.dimensions,
        });
        setIsPending(false);

        if (res.success) {
            setIsEditing(false);
            setSelectedFile(null);
        } else {
            alert(res.error);
        }
    };

    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="p-2.5 hover:bg-gray-50 hover:shadow-sm rounded-xl text-gray-400 hover:text-[#2c3e50] transition-all border border-transparent hover:border-gray-100"
            >
                <MoreVertical size={18} />
            </button>

            {open && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 py-2 divide-y divide-gray-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="py-1">
                        <button
                            type="button"
                            onClick={() => { setOpen(false); setIsEditing(true); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-[#28a745] transition-colors"
                        >
                            <Edit2 size={14} className="text-gray-400" /> Modifier
                        </button>
                    </div>
                    <div className="py-1">
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <Trash2 size={14} className="text-red-400" /> Supprimer
                        </button>
                    </div>
                </div>
            )}

            {/* --- MODALE D'ÉDITION DU DEVIS AVEC IMAGE --- */}
            {isEditing && (
                <div className="fixed inset-0 bg-[#2c3e50]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 text-left overflow-y-auto">
                    <div className="bg-white rounded-[2rem] border border-gray-100 w-full max-w-lg p-8 shadow-2xl relative my-8 animate-in zoom-in-95 duration-150">
                        <button type="button" onClick={() => setIsEditing(false)} className="absolute right-6 top-6 p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-all">
                            <X size={18} />
                        </button>

                        <h3 className="text-xl font-bold text-[#2c3e50] mb-1">Éditer le devis</h3>
                        <p className="text-xs text-gray-400 font-medium mb-6">Ajustez les détails et changez l'aperçu visuel du projet.</p>

                        <form onSubmit={handleUpdate} className="space-y-4">

                            {/* --- CORRECTION ULTIME POUR LE BLOCKAGE DES ONGLETS BASE64 --- */}
                            {quote.imageUrl && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        Croquis / Photo du projet client
                                    </label>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();

                                            const isBase64 = quote.imageUrl!.startsWith('data:');
                                            const finalUrl = isBase64
                                                ? quote.imageUrl!
                                                : `${window.location.origin}${quote.imageUrl}`;

                                            if (isBase64) {
                                                // 🌟 ASTUCE PRO : On ouvre un onglet vide et on y écrit le HTML contenant l'image
                                                const newWindow = window.open();
                                                if (newWindow) {
                                                    newWindow.document.write(`
                                            <html>
                                                <head>
                                                    <title>Aperçu du Devis - Ndanty</title>
                                                    <style>
                                                        body { margin: 0; background: #0e1726; display: flex; justify-content: center; align-items: center; height: 100vh; }
                                                        img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                                                    </style>
                                                </head>
                                                <body>
                                                    <img src="${finalUrl}" alt="Croquis Client" />
                                                </body>
                                            </html>
                                        `);
                                                    newWindow.document.close();
                                                }
                                            } else {
                                                // Si c'est un fichier standard (ex: /uploads/...), window.open fonctionne normalement
                                                window.open(finalUrl, '_blank');
                                            }
                                        }}
                                        className="relative w-full h-40 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 group block focus:outline-none focus:ring-2 focus:ring-[#28a745]"
                                    >
                                        <img
                                            src={quote.imageUrl}
                                            alt="Projet Client"
                                            className="w-full h-full object-contain bg-white cursor-pointer group-hover:scale-105 transition-transform"
                                        />
                                        <div className="absolute bottom-2 right-2 bg-[#2c3e50]/70 text-white text-[9px] px-2 py-1 rounded-md font-semibold group-hover:bg-[#28a745] transition-colors">
                                            Cliquez pour agrandir
                                        </div>
                                    </button>
                                </div>
                            )}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nom du Client</label>
                                <input type="text" required value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email</label>
                                    <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Téléphone</label>
                                    <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dimensions du meuble</label>
                                <input type="text" value={form.dimensions} onChange={e => setForm({...form, dimensions: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Détails du Projet</label>
                                <textarea rows={3} required value={form.details} onChange={e => setForm({...form, details: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all resize-none" />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-gray-600 rounded-xl py-3 text-xs font-bold transition-all">
                                    Annuler
                                </button>
                                <button type="submit" disabled={isPending} className="flex-1 bg-[#28a745] hover:bg-[#218838] text-white rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                                    <Check size={14} /> Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}