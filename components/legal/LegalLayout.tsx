// components/legal/LegalLayout.tsx
// Mise en page commune des pages légales (server-safe, aucune interactivité).
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LegalLayout({
    title,
    updatedAt,
    children,
}: {
    title: string;
    updatedAt: string;
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#FDFDFD] py-12 px-4">
            <div className="max-w-3xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#28a745] transition-colors mb-8">
                    <ArrowLeft size={14} /> Retour à l'accueil
                </Link>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 md:p-12">
                    <h1 className="text-2xl md:text-3xl font-black text-[#2c3e50] mb-1">{title}</h1>
                    <p className="text-xs text-gray-400 mb-8">Dernière mise à jour : {updatedAt}</p>
                    <div className="prose-legal space-y-6 text-sm text-gray-600 leading-relaxed [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-[#2c3e50] [&_h2]:mt-8 [&_h2]:mb-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-[#28a745] [&_a]:underline">
                        {children}
                    </div>
                    <p className="mt-10 pt-6 border-t border-gray-100 text-[11px] text-amber-600 bg-amber-50 rounded-xl p-3">
                        ⚠️ Modèle à compléter : renseignez les informations légales réelles de l'entreprise
                        (raison sociale, NIF/STAT, adresse du siège, hébergeur) avant toute mise en production.
                    </p>
                </div>
            </div>
        </div>
    );
}
