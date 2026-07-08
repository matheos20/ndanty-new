'use client'
import { useState, useRef } from 'react'
import { Plus, X, Loader2, Phone, Maximize, MessageSquare, User, Mail, Image as ImageIcon, CheckCircle, UploadCloud } from 'lucide-react'
import { createQuote } from '@/app/actions'

export default function AddQuoteModal() {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [showNotification, setShowNotification] = useState(false) // Pour la notification
    const [fileName, setFileName] = useState<string | null>(null); // Pour le nom du fichier image
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Gestion de la soumission du formulaire
    async function handleSubmit(formData: FormData) {
        setLoading(true)
        try {
            await createQuote(formData)
            setIsOpen(false)
            setShowNotification(true) // Affiche la notification

            // Cache la notification après 4 secondes
            setTimeout(() => setShowNotification(false), 4000);

            // On reset le formulaire et l'image
            (document.getElementById('form-ndanty-admin') as HTMLFormElement).reset();
            setFileName(null);

        } catch (error) {
            alert("Erreur lors de l'ajout. Vérifiez la connexion.")
        } finally {
            setLoading(false)
        }
    }

    // Pour afficher le nom de l'image sélectionnée
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setFileName(event.target.files[0].name);
        } else {
            setFileName(null);
        }
    };

    return (
        <>
            {/* NOTIFICATION PROFESSIONNELLE (TOAST) */}
            {showNotification && (
                <div className="fixed top-24 right-8 z-[100] animate-in slide-in-from-right fade-in duration-300">
                    <div className="bg-[#28a745] text-white p-5 rounded-2xl shadow-xl shadow-[#28a745]/30 flex items-center gap-4 border border-[#218838]">
                        <CheckCircle size={28} className="text-white" />
                        <div>
                            <p className="font-bold">Devis enregistré !</p>
                            <p className="text-sm opacity-90">La demande est maintenant visible dans la liste.</p>
                        </div>
                        <button onClick={() => setShowNotification(false)} className="text-white/70 hover:text-white ml-2">
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* BOUTON D'OUVERTURE AVEC CURSEUR CORRIGÉ */}
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2.5 bg-[#28a745] text-white px-5 py-3 rounded-xl font-bold hover:bg-[#218838] transition-all shadow-lg shadow-[#28a745]/20 cursor-pointer"
            >
                <Plus size={20} /> Nouveau Devis
            </button>

            {/* OVERLAY & MODAL */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-xl font-bold text-[#2c3e50]">Créer une nouvelle fiche</h3>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 cursor-pointer transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form id="form-ndanty-admin" action={handleSubmit} className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Colonne Gauche : Infos Client */}
                                <div className="space-y-5">
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Client</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-3.5 text-gray-300" size={18} />
                                            {/* CORRECTION TEXTE GRIS : On utilise text-[#2c3e50] */}
                                            <input name="name" required placeholder="Ex: M. Matheos" className="w-full p-3.5 pl-11 bg-white border border-gray-100 rounded-xl outline-none focus:border-[#28a745] focus:ring-1 focus:ring-[#28a745]/10 text-sm text-[#2c3e50]" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3.5 text-gray-300" size={18} />
                                            <input name="email" type="email" required placeholder="matheos@gmail.com" className="w-full p-3.5 pl-11 bg-white border border-gray-100 rounded-xl outline-none focus:border-[#28a745] text-sm text-[#2c3e50]" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Téléphone</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-3.5 text-gray-300" size={18} />
                                            <input name="phone" placeholder="032 71 229 13" className="w-full p-3.5 pl-11 bg-white border border-gray-100 rounded-xl outline-none focus:border-[#28a745] text-sm text-[#2c3e50]" />
                                        </div>
                                    </div>
                                </div>

                                {/* Colonne Droite : Infos Projet */}
                                <div className="space-y-5">
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Dimensions</label>
                                        <div className="relative">
                                            <Maximize className="absolute left-3 top-3.5 text-gray-300" size={18} />
                                            <input name="dimensions" placeholder="Ex: 120x50" className="w-full p-3.5 pl-11 bg-white border border-gray-100 rounded-xl outline-none focus:border-[#28a745] text-sm text-[#2c3e50]" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Détails / Message</label>
                                        <div className="relative">
                                            <MessageSquare className="absolute left-3 top-3.5 text-gray-300" size={18} />
                                            <textarea name="details" placeholder="Lit superposé..." className="w-full p-3.5 pl-11 bg-white border border-gray-100 rounded-xl outline-none focus:border-[#28a745] text-sm text-[#2c3e50] h-[120px] resize-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION IMAGE - CORRECTION : Ajout de la gestion d'image */}
                            <div className="mt-8 pt-8 border-t border-gray-100">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Joindre une image / Schéma (Client)</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full p-6 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#28a745]/30 hover:bg-[#28a745]/5 transition-all"
                                >
                                    <UploadCloud className="text-[#28a745]" size={32} />
                                    {fileName ? (
                                        <p className="text-sm font-medium text-[#28a745] line-clamp-1">{fileName}</p>
                                    ) : (
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-[#2c3e50]">Cliquez ou glissez une image</p>
                                            <p className="text-xs text-gray-400">PNG, JPG ou WEBP (Max 5Mo)</p>
                                        </div>
                                    )}
                                    {/* Champ input caché */}
                                    <input type="file" ref={fileInputRef} name="image" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} className="hidden" />
                                </div>
                            </div>

                            {/* BOUTONS D'ACTION */}
                            <div className="mt-10 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 px-6 py-4 border border-gray-100 rounded-xl font-bold text-gray-500 hover:bg-gray-100 cursor-pointer transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] bg-[#2c3e50] text-white py-4 rounded-xl font-bold hover:bg-black disabled:bg-gray-300 cursor-pointer transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : 'Enregistrer définitivement'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}