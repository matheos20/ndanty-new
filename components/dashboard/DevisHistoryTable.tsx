// components/dashboard/DevisHistoryTable.tsx
import { CheckCircle, Clock, AlertCircle, Tag } from "lucide-react";
import QuoteResponseAction from "./QuoteResponseAction";

// On définit proprement la structure d'un devis pour TypeScript
interface Devis {
    id: number;
    title?: string; // Ajuste selon le nom exact dans ton schéma (ex: meubleType)
    status: string;
    createdAt?: Date;
    proposedPrice?: number | null;
    adminResponse?: string | null;
    clientDecision?: string | null;
    clientResponse?: string | null;
}

interface DevisHistoryTableProps {
    devisRequests: Devis[];
}

export default function DevisHistoryTable({ devisRequests }: DevisHistoryTableProps) {

    // Gestionnaire des badges de statut
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "VALIDE":
            case "TERMINE":
                return (
                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-50 text-green-600 flex items-center gap-1 w-fit">
                        <CheckCircle size={12} /> Validé
                    </span>
                );
            case "DEVIS_ENVOYE":
                return (
                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-600 flex items-center gap-1 w-fit">
                        <Tag size={12} /> Devis reçu
                    </span>
                );
            case "REFUSE":
                return (
                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-50 text-red-600 flex items-center gap-1 w-fit">
                        <AlertCircle size={12} /> Refusé
                    </span>
                );
            case "EN_ATTENTE":
            case "NOUVEAU":
                return (
                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-600 flex items-center gap-1 w-fit">
                        <Clock size={12} /> En attente
                    </span>
                );
            default:
                return (
                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-gray-50 text-gray-600 flex items-center gap-1 w-fit">
                        <AlertCircle size={12} /> {status}
                    </span>
                );
        }
    };

    if (devisRequests.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-400 text-sm">
                    Vous n'avez pas encore envoyé de projet de fabrication sur mesure.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden border border-gray-100 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.01)]">
            <table className="w-full text-left border-collapse bg-white text-sm">
                <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-bold tracking-wider border-b border-gray-100">
                <tr>
                    <th className="p-4">N° Projet</th>
                    <th className="p-4">Type de Meuble</th>
                    <th className="p-4">Prix proposé</th>
                    <th className="p-4">Statut du Devis</th>
                    <th className="p-4">Votre réponse</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-600">
                {devisRequests.map((devis) => (
                    <tr key={devis.id} className="hover:bg-gray-50/50 transition-colors align-top">
                        <td className="p-4 font-mono font-bold text-gray-900">#DVS-{devis.id}</td>
                        <td className="p-4 font-medium text-gray-700 max-w-[260px]">
                            <div className="line-clamp-2">{devis.title || "Mobilier Sur Mesure"}</div>
                            {devis.adminResponse && (
                                <p className="mt-1.5 text-[11px] text-gray-400 italic border-l-2 border-[#28a745]/30 pl-2 line-clamp-2">
                                    « {devis.adminResponse} »
                                </p>
                            )}
                        </td>
                        <td className="p-4">
                            {devis.proposedPrice != null ? (
                                <span className="font-black text-[#28a745] whitespace-nowrap">
                                    {Number(devis.proposedPrice).toLocaleString("fr-FR")} Ar
                                </span>
                            ) : (
                                <span className="text-gray-300 text-xs font-medium">En cours d'étude…</span>
                            )}
                        </td>
                        <td className="p-4">{getStatusBadge(devis.status)}</td>
                        <td className="p-4">
                            <QuoteResponseAction
                                quoteId={devis.id}
                                proposedPrice={devis.proposedPrice ?? null}
                                status={devis.status}
                                clientDecision={devis.clientDecision ?? null}
                                clientResponse={devis.clientResponse ?? null}
                            />
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}