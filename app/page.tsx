// app/page.tsx
import { prisma } from "@/lib/prisma"; // Connexion sécurisée à ta base de données MySQL
// Footer fourni globalement par LayoutShell (évite le doublon)
import ShopProductCard from '../components/shop/ShopProductCard'; // Chemin exact validé ensemble
import { Truck, CreditCard, Ruler, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0; // Force la mise à jour immédiate à chaque ajout dans ton espace admin

export default async function Home({
                                       searchParams,
                                   }: {
    searchParams: Promise<{ category?: string }>;
}) {
    // Récupération sécurisée du rayon sélectionné dans l'URL (ex: /?category=Lits)
    const resolvedParams = await searchParams;
    const selectedCategory = resolvedParams.category;

    // Récupération dynamique depuis la base de données MySQL
    const databaseProducts = await prisma.product.findMany({
        take: 6,
        orderBy: { id: 'desc' },
        where: {
            stock: { gte: 1 }, // Uniquement les meubles disponibles à Madagascar
            ...(selectedCategory ? {
                OR: [
                    { category: selectedCategory },
                    { subcategory: selectedCategory }
                ]
            } : {})
        }
    });

    // Ta liste exacte des rayons de l'atelier
    const categories = {
        "Chambre à coucher": ["Armoires", "Commodes & coiffeuses", "Lits", "Tables de chevet"],
        "Enfants & adolescents": ["Armoires enfants", "Chaises & tabourets", "Lits enfants"],
        "Salle à manger": ["Chaises", "Tables à manger"],
        "Salon & séjour": ["Buffets & bahuts", "Canapés", "Étagères", "Tables basses"]
    };

    const lucidaStyle = { fontFamily: '"Lucida Handwriting", "Apple Chancery", cursive' };

    return (
        <div className="min-h-screen bg-[#FDFDFD] flex flex-col items-center" style={lucidaStyle}>
            <div className="w-[80%] bg-white shadow-sm flex flex-col">

                {/* --- SECTION HERO --- */}
                <section className="relative bg-[#2c3e50] py-32 px-12 overflow-hidden flex flex-col items-center text-center">
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-[#28a745] opacity-10 skew-x-12 translate-x-20"></div>
                    <div className="relative z-10 max-w-3xl">
                        <h2 className="text-5xl text-white leading-tight mb-6">
                            Le Savoir-Faire <span className="text-[#28a745]">Ancestral</span>,<br /> Design Moderne.
                        </h2>
                        <p className="text-gray-300 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
                            Découvrez notre collection exclusive de mobilier en bois noble, conçu pour durer et sublimer votre intérieur.
                        </p>
                        <button className="bg-[#28a745] text-white px-12 py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-white hover:text-[#2c3e50] transition-all duration-300 shadow-lg rounded-sm">
                            Explorer le catalogue
                        </button>
                    </div>
                </section>

                {/* --- SECTION PRODUITS & FILTRES --- */}
                <section className="flex flex-col md:flex-row p-12 gap-12 bg-white">

                    {/* Menu Latéral "Rayons" Interactif */}
                    <aside className="w-full md:w-1/4">
                        <div className="flex justify-between items-center border-b-2 border-[#28a745] pb-2 mb-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-[#2c3e50]">Rayons</h3>
                            {selectedCategory && (
                                <Link
                                    href="/"
                                    className="text-xs text-red-500 hover:text-red-700 hover:underline font-sans normal-case transition-colors"
                                >
                                    Tout afficher
                                </Link>
                            )}
                        </div>
                        <div className="space-y-6">
                            {Object.entries(categories).map(([parent, children]) => (
                                <div key={parent}>
                                    <h4 className="text-sm font-bold text-[#28a745] uppercase mb-3">{parent}</h4>
                                    <ul className="space-y-2 border-l border-gray-100 ml-1 pl-4">
                                        {children.map(child => {
                                            const isActive = selectedCategory === child;
                                            return (
                                                <li key={child}>
                                                    <Link
                                                        href={`/?category=${encodeURIComponent(child)}`}
                                                        className={`group flex items-center text-sm cursor-pointer transition-all duration-300 ${
                                                            isActive
                                                                ? 'text-[#28a745] font-bold pl-2'
                                                                : 'text-gray-500 hover:text-[#2c3e50] hover:pl-2'
                                                        }`}
                                                    >
                                                        <ChevronRight className={`w-3 h-3 text-[#28a745] transition-all mr-2 ${
                                                            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 -ml-4 group-hover:ml-0'
                                                        }`} />
                                                        <p>{child}</p>
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </aside>

                    {/* Grille Principale des Meubles */}
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-2xl italic text-gray-800">
                                {selectedCategory ? `Créations : ${selectedCategory}` : "Nos pièces uniques"}
                            </h3>
                            <div className="h-[1px] flex-1 mx-8 bg-gray-100"></div>
                        </div>

                        {databaseProducts.length === 0 ? (
                            <div className="text-center py-20 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 p-8">
                                <p className="text-gray-400 text-sm font-sans mb-4">
                                    Aucun modèle de type "{selectedCategory}" n'est disponible immédiatement à l'atelier.
                                </p>
                                <Link href="/" className="text-xs text-[#28a745] font-sans uppercase tracking-wider font-bold hover:underline">
                                    Voir les autres meubles
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {databaseProducts.map((dbProduct) => {
                                    // Formatage sécurisé pour correspondre aux propriétés attendues par ShopProductCard
                                    const formattedProduct = {
                                        id: dbProduct.id,
                                        name: dbProduct.name,
                                        description: dbProduct.description || "",
                                        price: dbProduct.price,
                                        category: dbProduct.category || "Mobilier",
                                        subcategory: dbProduct.subcategory || null,
                                        stock: dbProduct.stock,
                                        imageUrl: dbProduct.imageUrl || null
                                    };

                                    return (
                                        <div key={formattedProduct.id} className="w-full">
                                            {/* Ta carte premium connectée à ton panier */}
                                            <ShopProductCard product={formattedProduct} />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

                {/* --- SECTION SERVICES --- */}
                <section className="bg-[#fcfcfc] py-28 px-12 border-t border-gray-100">
                    <div className="text-center mb-20">
                        <h3 className="text-4xl text-[#2c3e50] mb-6" style={{ fontFamily: '"Lucida Handwriting", cursive' }}>
                            L'Excellence <span className="text-[#28a745]">Fanaka</span>
                        </h3>
                        <p className="text-gray-400 max-w-2xl mx-auto text-[10px] leading-loose uppercase tracking-[0.4em] font-bold">
                            Qualité • Tradition • Engagement
                        </p>
                        <div className="mt-8 flex justify-center items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-[#28a745]/20"></span>
                            <span className="w-16 h-[3px] rounded-full bg-[#28a745]"></span>
                            <span className="w-2 h-2 rounded-full bg-[#28a745]/20"></span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <ServiceCard
                            icon={<CreditCard className="w-7 h-7" />}
                            title="Paiement Sécurisé"
                            desc="Transactions protégées via Mvola, Airtel Money ou virement pour une tranquillité totale."
                        />
                        <ServiceCard
                            icon={<Truck className="w-7 h-7" />}
                            title="Livraison Premium"
                            desc="Un transport spécialisé qui garantit l'intégrité de vos meubles jusqu'à votre intérieur."
                        />
                        <ServiceCard
                            icon={<Ruler className="w-7 h-7" />}
                            title="Conception Sur Mesure"
                            desc="Chaque pièce est unique, fabriquée selon vos dimensions et vos essences de bois préférées."
                        />
                        <ServiceCard
                            icon={<Clock className="w-7 h-7" />}
                            title="Showroom & Atelier"
                            desc="Venez nous rendre visite pour toucher le bois et discuter de la réalisation de vos rêves."
                        />
                    </div>
                </section>
            </div>
        </div>
    );
}

function ServiceCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="group relative bg-white p-10 rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.02)] hover:shadow-[0_30px_80px_rgba(0,0,0,0.08)] transition-all duration-700 overflow-hidden border border-gray-50 flex flex-col items-start text-left">
            <div className="absolute -right-8 -top-8 w-36 h-36 border-[12px] border-gray-50 rounded-full group-hover:border-[#28a745]/10 group-hover:scale-125 transition-all duration-1000 pointer-events-none"></div>
            <div className="relative w-16 h-16 mb-10 flex items-center justify-center rounded-2xl bg-white shadow-sm border border-gray-100 text-[#28a745] group-hover:bg-[#28a745] group-hover:text-white group-hover:shadow-[0_15px_30px_rgba(40,167,69,0.3)] transition-all duration-500">
                {icon}
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#28a745] rounded-full border-[3px] border-white scale-0 group-hover:scale-100 transition-transform duration-500 delay-300"></span>
            </div>
            <div className="relative z-10">
                <h5 className="text-lg font-bold text-[#2c3e50] mb-4 tracking-tight group-hover:text-[#28a745] transition-colors duration-300">
                    {title}
                </h5>
                <p className="text-gray-400 text-sm leading-relaxed mb-8 group-hover:text-gray-600 transition-colors duration-500">
                    {desc}
                </p>
                <div className="flex items-center text-[#28a745] text-[10px] font-bold uppercase tracking-[0.25em] opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500">
                    Détails <ChevronRight className="w-3 h-3 ml-2" />
                </div>
            </div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-0 bg-[#28a745] group-hover:h-1/3 transition-all duration-700"></div>
        </div>
    );
}