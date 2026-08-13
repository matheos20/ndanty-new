'use client';

import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

/**
 * Boutons d'action de la facture. La génération PDF s'appuie sur l'impression
 * navigateur ("Enregistrer au format PDF"), sans dépendance externe.
 * `autoPrint` déclenche la boîte d'impression au chargement (lien ?print=1).
 */
export default function InvoiceActions({ autoPrint = false }: { autoPrint?: boolean }) {
    useEffect(() => {
        if (autoPrint) {
            // Laisse le temps au rendu avant d'ouvrir la boîte d'impression
            const t = setTimeout(() => window.print(), 400);
            return () => clearTimeout(t);
        }
    }, [autoPrint]);

    return (
        <div className="flex items-center justify-between gap-3 mb-6 print:hidden">
            <Link
                href="/dashboard?tab=orders"
                className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#28a745] transition-colors"
            >
                <ArrowLeft size={14} /> Retour à mes commandes
            </Link>
            <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 bg-[#28a745] hover:bg-black text-white text-xs font-bold uppercase tracking-widest px-5 py-3 rounded-full transition-all"
            >
                <Printer size={14} /> Télécharger / Imprimer (PDF)
            </button>
        </div>
    );
}
