'use client';

// components/admin/DetailModal.tsx
// Coquille unique des « fiches de détails au clic » du back-office.
// Objectif du cahier des charges : que la consultation d'une commande, d'une transaction
// ou d'un devis se présente TOUJOURS de la même façon, avec le langage visuel du front
// (grands arrondis, vert #28a745, majuscules espacées).
//
// Comportements attendus d'une modale accessible, centralisés ici une seule fois :
// fermeture par Échap, clic sur le fond, verrouillage du défilement de l'arrière-plan.
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface DetailModalProps {
    open: boolean;
    onClose: () => void;
    /** Petite étiquette au-dessus du titre (ex : « CMD #42 »). */
    eyebrow?: React.ReactNode;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    /** Badges de statut affichés dans l'en-tête. */
    badges?: React.ReactNode;
    /** Barre d'actions collée en bas de la fiche. */
    footer?: React.ReactNode;
    children: React.ReactNode;
    maxWidth?: string;
}

export default function DetailModal({
    open, onClose, eyebrow, title, subtitle, badges, footer, children, maxWidth = 'max-w-3xl',
}: DetailModalProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);

        // Empêche la page derrière la modale de défiler, puis restaure la valeur d'origine
        // (et non "auto" en dur, qui écraserait un style existant).
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        panelRef.current?.focus();

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
            onMouseDown={(e) => {
                // onMouseDown sur la cible exacte : un glisser-déposer terminé sur le fond
                // ne doit pas fermer la fiche par erreur.
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                ref={panelRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                className={`bg-white w-full ${maxWidth} rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] sm:max-h-[88vh] outline-none animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200`}
            >
                {/* En-tête */}
                <div className="flex items-start justify-between gap-4 p-6 sm:p-7 border-b border-gray-50">
                    <div className="min-w-0">
                        {eyebrow && (
                            <span className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                                {eyebrow}
                            </span>
                        )}
                        <h3 className="text-lg sm:text-xl font-black text-[#2c3e50] font-serif truncate">{title}</h3>
                        {subtitle && <p className="text-xs text-gray-400 font-medium mt-1">{subtitle}</p>}
                        {badges && <div className="flex flex-wrap items-center gap-2 mt-3">{badges}</div>}
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Fermer la fiche"
                        className="shrink-0 p-2 rounded-full text-gray-400 hover:text-[#2c3e50] hover:bg-gray-50 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Corps défilant */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6">{children}</div>

                {footer && (
                    <div className="border-t border-gray-50 p-5 sm:p-6 bg-gray-50/50 rounded-b-[2.5rem]">{footer}</div>
                )}
            </div>
        </div>
    );
}

/** Bloc de section titré, pour garder le même rythme visuel dans toutes les fiches. */
export function DetailSection({
    title, icon, children, action,
}: {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    action?: React.ReactNode;
}) {
    return (
        <section>
            <div className="flex items-center justify-between gap-3 mb-3">
                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {icon}
                    {title}
                </h4>
                {action}
            </div>
            {children}
        </section>
    );
}

/** Ligne « libellé → valeur », alignée de la même manière partout. */
export function DetailRow({
    label, value, mono = false,
}: {
    label: string;
    value: React.ReactNode;
    mono?: boolean;
}) {
    return (
        <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
            <span className="text-xs font-bold text-gray-400 shrink-0">{label}</span>
            <span className={`text-xs font-bold text-[#2c3e50] text-right break-all ${mono ? 'font-mono' : ''}`}>
                {value}
            </span>
        </div>
    );
}
