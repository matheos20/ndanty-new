// app/shop/page.tsx
import { prisma } from "@/lib/prisma";
import ShopProductCard from "@/components/shop/ShopProductCard";
import { Layers } from "lucide-react";
import Link from "next/link";
// Footer fourni globalement par LayoutShell (évite le doublon)

export const revalidate = 0;

interface ShopPageProps {
    searchParams: Promise<{
        category?: string;
        subcategory?: string;
        q?: string;
    }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
    // 1. Extraction des filtres actifs de l'URL
    const { category, subcategory, q } = await searchParams;
    const query = (q || "").trim();

    // Est-ce qu'on est en train de tout regarder ?
    const isViewingAll = !category && !subcategory && !query;

    // 2. Récupération de tous les produits pour construire la structure du menu
    const allProducts = await prisma.product.findMany();

    // 3. Construction dynamique de l'arborescence Rayons -> Sous-catégories
    const menuStructure: { [key: string]: Set<string> } = {};
    allProducts.forEach((product) => {
        if (!menuStructure[product.category]) {
            menuStructure[product.category] = new Set<string>();
        }
        if (product.subcategory) {
            menuStructure[product.category].add(product.subcategory);
        }
    });

    // 4. Récupération des produits filtrés correspondants.
    //    La recherche "q" balaie le nom, la catégorie et la sous-catégorie (insensible à la casse).
    const filteredProducts = await prisma.product.findMany({
        where: {
            ...(category ? { category: category } : {}),
            ...(subcategory ? { subcategory: subcategory } : {}),
            ...(query
                ? {
                      OR: [
                          { name: { contains: query } },
                          { description: { contains: query } },
                          { category: { contains: query } },
                          { subcategory: { contains: query } },
                      ],
                  }
                : {}),
        },
        orderBy: {
            id: "desc",
        },
    });

    return (
        /* Le fond de la page (extérieur du cadre) */
        <div className="min-h-screen bg-[#FDFDFD] flex flex-col items-center pt-4 pb-12 font-sans">

            {/* 📦 LE CADRE CENTRAL */}
            <div className="w-[80%] bg-white shadow-sm border-x border-gray-100 flex flex-col p-12">

                {/* EN-TÊTE DE LA BOUTIQUE */}
                <div className="mb-12 text-center space-y-3">
                    <h1 className="text-3xl font-normal text-[#2c3e50] sm:text-4xl italic font-serif">
                        {query ? "Résultats de recherche" : "Notre Catalogue Exclusif"}
                    </h1>
                    {query ? (
                        <p className="text-gray-500 text-sm max-w-xl mx-auto leading-relaxed font-sans">
                            {filteredProducts.length} résultat{filteredProducts.length > 1 ? "s" : ""} pour «&nbsp;
                            <span className="text-[#28a745] font-semibold not-italic">{query}</span>&nbsp;»
                            <Link href="/shop" className="ml-2 text-xs text-gray-400 underline hover:text-[#28a745]">effacer</Link>
                        </p>
                    ) : (
                        <p className="text-gray-500 text-sm max-w-xl mx-auto leading-relaxed font-sans">
                            Découvrez nos pièces uniques en bois noble, conçues avec passion et façonnées à la main pour sublimer votre intérieur.
                        </p>
                    )}
                </div>

                {/* GRILLE PRINCIPALE */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 items-start">

                    {/* 🧭 BARRE LATÉRALE : LES RAYONS */}
                    <aside className="lg:col-span-1 bg-white space-y-6">
                        <div>
                            <h2 className="text-xs font-bold text-gray-300 uppercase tracking-widest border-b-2 border-[#28a745] pb-2 flex items-center gap-2 italic font-serif">
                                <Layers size={12} className="text-[#28a745] not-italic" />
                                Rayons
                            </h2>
                        </div>

                        <nav className="flex flex-col gap-4">

                            {/* INTEGRATION DU BOUTON "Tout les produits" */}
                            <div className="border-b border-gray-100 pb-2">
                                <Link
                                    href="/shop"
                                    className={`block text-sm font-bold px-2 py-1 uppercase tracking-wider italic font-serif transition-colors ${
                                        isViewingAll
                                            ? 'text-[#28a745] underline font-black'
                                            : 'text-gray-400 hover:text-[#28a745]'
                                    }`}
                                >
                                    Tout les produits
                                </Link>
                            </div>

                            {/* STRUCTURE DES RAYONS DYNAMIQUES */}
                            {Object.keys(menuStructure).length === 0 ? (
                                <span className="text-xs text-gray-400 italic px-2">Aucun rayon disponible</span>
                            ) : (
                                Object.keys(menuStructure).map((catName) => {
                                    const isCatActive = category === catName && !subcategory;

                                    return (
                                        <div key={catName} className="space-y-1">

                                            {/* Catégorie Principale */}
                                            <Link
                                                href={`/shop?category=${encodeURIComponent(catName)}`}
                                                className={`block text-sm font-bold px-2 py-1 uppercase tracking-wider italic font-serif transition-colors ${
                                                    isCatActive ? 'text-[#28a745] underline' : 'text-gray-700 hover:text-[#28a745]'
                                                }`}
                                            >
                                                {catName}
                                            </Link>

                                            {/* Sous-catégories */}
                                            {menuStructure[catName].size > 0 && (
                                                <div className="pl-4 pt-1 flex flex-col gap-1.5 ml-1 border-l border-gray-100">
                                                    {Array.from(menuStructure[catName]).map((subcatName) => {
                                                        const isSubcatActive = subcategory === subcatName;

                                                        return (
                                                            <Link
                                                                key={subcatName}
                                                                href={`/shop?category=${encodeURIComponent(catName)}&subcategory=${encodeURIComponent(subcatName)}`}
                                                                className={`text-left text-sm font-medium py-0.5 rounded-lg transition-all italic font-serif ${
                                                                    isSubcatActive ? 'text-[#28a745] font-bold' : 'text-gray-400 hover:text-[#28a745]'
                                                                }`}
                                                            >
                                                                {subcatName}
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </nav>
                    </aside>

                    {/* 🛒 GRILLE DES PRODUITS */}
                    <main className="lg:col-span-3">
                        {filteredProducts.length === 0 ? (
                            <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                                <p className="text-gray-400 text-sm font-medium">
                                    {query
                                        ? `Aucun meuble ne correspond à « ${query} ».`
                                        : "Aucun meuble ne correspond à ce rayon pour le moment."}
                                </p>
                                <Link href="/shop" className="text-xs text-[#28a745] font-bold underline mt-2 inline-block">
                                    Retourner au catalogue complet
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredProducts.map((product) => (
                                    <ShopProductCard
                                        key={product.id}
                                        product={{
                                            id: product.id,
                                            name: product.name,
                                            description: product.description,
                                            price: product.price,
                                            category: product.category,
                                            subcategory: product.subcategory,
                                            stock: product.stock,
                                            imageUrl: product.imageUrl,
                                            // Force la conversion de l'objet Decimal Prisma en vrai nombre JavaScript
                                            rating: product.rating ? Number(product.rating) : 4.5
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </main>

                </div>
            </div>
        </div>
    );
}