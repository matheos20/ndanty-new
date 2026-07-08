// app/admin/quotes/page.tsx
import { prisma } from "@/lib/prisma";
import { Mail, Phone, Calendar, Inbox } from 'lucide-react';
import QuoteImage from "@/components/admin/QuoteImage";
import StatusSelect from "@/components/admin/StatusSelect";
import Pagination from "@/components/admin/Pagination";
import SearchBar from "@/app/admin/users/_components/search-bar"; // Import de ta barre de recherche réutilisable
import QuoteRowActions from "./QuoteRowActions";
import SendProposalButton from "./SendProposalButton";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
    searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function QuotesPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const querySearch = params.search || "";
    const limit = 4;

    // Clause de filtrage MySQL dynamique pour les devis
    const whereClause = querySearch ? {
        OR: [
            { customerName: { contains: querySearch } },
            { email: { contains: querySearch } },
            { details: { contains: querySearch } },
        ]
    } : {};

    // 1. Récupération préalable des totaux pour sécuriser l'indexation des pages
    const [totalItemsFiltered, totalItemsGlobal] = await Promise.all([
        prisma.quote.count({ where: whereClause }),
        prisma.quote.count()
    ]);

    // 2. Calcul du nombre total de pages réelles selon le filtre actuel
    const totalPages = Math.ceil(totalItemsFiltered / limit) || 1;

    // 3. Sécurité : Si le paramètre de page dépasse le total possible, on force le retour à la page 1
    const requestedPage = Number(params.page) || 1;
    const currentPage = requestedPage > totalPages ? 1 : requestedPage;

    // 4. Extraction des devis correspondants avec la page définitive calculée
    const quotes = await prisma.quote.findMany({
        where: whereClause,
        skip: (currentPage - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="space-y-6 p-8 max-w-7xl mx-auto animate-in fade-in duration-300">
            {/* HEADER : Stats à droite */}
            <div className="flex justify-between items-center bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-[#2c3e50]">Gestion des Devis</h2>
                    <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-semibold">Flux de travail Ndanty</p>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Page {currentPage} / {totalPages}
                        </span>
                        <div className="bg-[#28a745] text-white px-5 py-2 rounded-full text-xs font-bold shadow-lg shadow-green-100">
                            {totalItemsGlobal} DEMANDE(S)
                        </div>
                    </div>
                </div>
            </div>

            {/* BARRE DE RECHERCHE DYNAMIQUE */}
            <div className="flex items-center justify-between">
                <SearchBar />
            </div>

            {/* TABLEAU OU COMPOSANT VIDE */}
            {quotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-dashed border-gray-100 shadow-sm">
                    <div className="p-4 bg-gray-50 rounded-full text-gray-300 mb-4">
                        <Inbox size={48} />
                    </div>
                    <h3 className="text-xl font-bold text-[#2c3e50]">Aucun devis trouvé</h3>
                    <p className="text-gray-400 mt-2 text-center max-w-xs">
                        {querySearch ? "Aucun devis ne correspond à cette recherche." : "Les demandes apparaîtront ici dès qu'elles seront soumises."}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aperçu</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client & Contact</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Projet & Taille</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Statut</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                            {quotes.map((quote) => (
                                <tr key={quote.id} className="hover:bg-gray-50/30 transition-all group">
                                    <td className="px-6 py-4">
                                        <QuoteImage src={quote.imageUrl} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-[#2c3e50]">{quote.customerName}</div>
                                        <div className="flex flex-col gap-0.5 mt-1 text-[11px] text-gray-400">
                                            <div className="flex items-center gap-2">
                                                <Mail size={10} /> {quote.email}
                                            </div>
                                            {quote.phone && (
                                                <div className="flex items-center gap-2 text-[#28a745] font-semibold">
                                                    <Phone size={10} /> {quote.phone}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-[#2c3e50] font-medium line-clamp-1 max-w-[200px]">
                                            {quote.details}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span className="text-[9px] font-black text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 uppercase">
                                                {quote.dimensions || 'Standard'}
                                            </span>
                                            <span className="text-[10px] text-gray-300 flex items-center gap-1 font-medium">
                                                <Calendar size={10} /> {new Date(quote.createdAt).toLocaleDateString('fr-FR')}
                                            </span>
                                        </div>

                                        {/* Réponse du client à la proposition — bien mise en évidence */}
                                        {quote.clientDecision && (
                                            <div className={`mt-2.5 max-w-[260px] rounded-xl border p-2.5 ${
                                                quote.clientDecision === 'ACCEPTE'
                                                    ? 'bg-green-50/70 border-green-100'
                                                    : 'bg-red-50/70 border-red-100'
                                            }`}>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
                                                        quote.clientDecision === 'ACCEPTE' ? 'bg-[#28a745] text-white' : 'bg-red-500 text-white'
                                                    }`}>
                                                        {quote.clientDecision === 'ACCEPTE' ? '✅ Devis accepté' : '❌ Devis refusé'}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase">par le client</span>
                                                </div>
                                                {quote.clientResponse && (
                                                    <p className="text-[11px] text-gray-600 italic mt-1.5 leading-relaxed">
                                                        « {quote.clientResponse} »
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusSelect quoteId={quote.id} currentStatus={quote.status} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <SendProposalButton quote={quote} />
                                            <QuoteRowActions quote={quote} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t border-gray-50">
                        <Pagination totalPages={totalPages} currentPage={currentPage} />
                    </div>
                </div>
            )}
        </div>
    );
}