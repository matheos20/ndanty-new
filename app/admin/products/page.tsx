// app/admin/products/page.tsx
import { prisma } from "@/lib/prisma";
import { Inbox, Package, Layers, AlertTriangle } from 'lucide-react';
import SearchBar from "@/app/admin/users/_components/search-bar"; // On réutilise notre barre de recherche propre !
import Pagination from "@/components/admin/Pagination"; // On réutilise notre pagination générique !
import ProductCard from "./ProductCard";
import AddProductButton from "./AddProductButton";
import ProductRatingBadge from "@/components/admin/ProductRatingBadge";
import { getRatingSummaries, EMPTY_RATING } from "@/lib/ratings";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
    searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const querySearch = params.search || "";
    const limit = 6; // On affiche 6 produits par page (idéal pour une grille visuelle)

    // 1. Clause de filtrage dynamique pour MySQL (recherche par nom ou catégorie)
    const whereClause = querySearch ? {
        OR: [
            { name: { contains: querySearch } },
            { category: { contains: querySearch } },
        ]
    } : {};

    // 2. Requêtes simultanées pour récupérer les totaux et sécuriser la pagination
    const [totalItemsFiltered, totalItemsGlobal, totalOutOfStock] = await Promise.all([
        prisma.product.count({ where: whereClause }),
        prisma.product.count(),
        prisma.product.count({ where: { stock: 0 } }) // Stats pratiques pour le manager !
    ]);

    // 3. Calcul des pages et sécurité anti-crash
    const totalPages = Math.ceil(totalItemsFiltered / limit) || 1;
    const requestedPage = Number(params.page) || 1;
    const currentPage = requestedPage > totalPages ? 1 : requestedPage;

    // 4. Extraction des produits correspondants
    const products = await prisma.product.findMany({
        where: whereClause,
        skip: (currentPage - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
    });

    // 5. Notes réelles des produits affichés, en une seule requête (moyenne + nombre d'avis).
    const ratings = await getRatingSummaries(products.map((p) => p.id));

    return (
        <div className="space-y-6 p-5 sm:p-8 max-w-7xl mx-auto animate-in fade-in duration-300">

            {/* EN-TÊTE : Statistiques du catalogue */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                        <Package size={24} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider text-[10px]">Total Produits</h4>
                        <p className="text-xl font-black text-[#2c3e50]">{totalItemsGlobal}</p>
                    </div>
                </div>

                <div className="p-4 flex items-center gap-4 border-t md:border-t-0 md:border-x border-gray-100">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                        <Layers size={24} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider text-[10px]">Résultats Filtre</h4>
                        <p className="text-xl font-black text-[#2c3e50]">{totalItemsFiltered}</p>
                    </div>
                </div>

                <div className="p-4 flex items-center gap-4 border-t md:border-t-0 border-gray-100">
                    <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider text-[10px]">Ruptures de Stock</h4>
                        <p className="text-xl font-black text-red-600">{totalOutOfStock}</p>
                    </div>
                </div>
            </div>

            {/* ACTION BAR : Recherche et bouton d'action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <SearchBar />
                {/* Remplacement du bouton fixe par notre bouton interactif */}
                <AddProductButton />
            </div>

            {/* CONTENU principal (Grille ou message vide) */}
            {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-dashed border-gray-100 shadow-sm">
                    <div className="p-4 bg-gray-50 rounded-full text-gray-300 mb-4">
                        <Inbox size={48} />
                    </div>
                    <h3 className="text-xl font-bold text-[#2c3e50]">Aucun produit disponible</h3>
                    <p className="text-gray-400 mt-2 text-center max-w-xs text-xs">
                        {querySearch ? "Aucun article ne correspond à votre recherche." : "Votre catalogue est vide pour le moment."}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* 🌟 GRILLE DE PRODUITS PROFESSIONNELLE */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.map((product) => {
                            const rating = ratings.get(product.id) ?? EMPTY_RATING;

                            // On crée un objet propre pour le Client Component en convertissant le Decimal de Prisma
                            const safeProduct = {
                                ...product,
                                rating: rating.average ?? undefined,
                            };

                            return (
                                <div key={product.id} className="flex flex-col bg-white rounded-3xl border border-gray-100 shadow-sm p-4 gap-4">
                                    {/* Affichage de la carte produit avec l'objet nettoyé */}
                                    <ProductCard product={safeProduct} />

                                    {/* ⭐ NOTE RÉELLE (lecture seule) — se pilote depuis la file de modération */}
                                    <div className="pt-2 border-t border-gray-50 flex justify-center">
                                        <ProductRatingBadge
                                            average={rating.average}
                                            count={rating.count}
                                            productName={product.name}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Zone de Pagination */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <Pagination totalPages={totalPages} currentPage={currentPage} />
                    </div>
                </div>
            )}
        </div>
    );
}