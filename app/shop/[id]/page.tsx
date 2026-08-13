// app/shop/[id]/page.tsx
import type { Metadata } from 'next';
import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import { ArrowLeft, ShieldCheck, Truck, Hammer, Layers, Tag, Star, StarHalf } from 'lucide-react';
import Link from 'next/link';
import ProductActions from './ProductActions';
import ProductReviews from "@/components/shop/ProductReviews"; // 👈 Importation du bloc avis pro !
import { getRatingSummary } from "@/lib/ratings";

const prisma = new PrismaClient();

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001").replace(/\/$/, "");

interface PageProps {
    params: Promise<{ id: string }>;
}

// SEO : métadonnées dynamiques par produit (titre, description, Open Graph)
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const productId = parseInt(id, 10);
    if (isNaN(productId)) return { title: "Produit introuvable" };

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return { title: "Produit introuvable" };

    const description = (product.description || `${product.name} — ${product.category}, disponible chez Ndanty.`)
        .replace(/\s+/g, " ")
        .slice(0, 160);
    const image = product.imageUrl && product.imageUrl.startsWith("/") ? `${SITE_URL}${product.imageUrl}` : undefined;

    return {
        title: product.name,
        description,
        alternates: { canonical: `${SITE_URL}/shop/${product.id}` },
        openGraph: {
            title: `${product.name} | Ndanty`,
            description,
            url: `${SITE_URL}/shop/${product.id}`,
            type: "website",
            images: image ? [{ url: image }] : undefined,
        },
    };
}

export default async function ProductDetailPage({ params }: PageProps) {
    const { id } = await params;
    const productId = parseInt(id, 10);

    if (isNaN(productId)) {
        notFound();
    }

    const product = await prisma.product.findUnique({
        where: { id: productId },
    });

    if (!product) {
        notFound();
    }

    // Note réelle du meuble : moyenne des avis publiés, `null` s'il n'y en a aucun.
    const rating = await getRatingSummary(product.id);

    // Schema.org — données structurées produit (rich results Google)
    const productImage = product.imageUrl && product.imageUrl.startsWith("/") ? `${SITE_URL}${product.imageUrl}` : undefined;
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: (product.description || "").replace(/\s+/g, " ").slice(0, 500),
        image: productImage ? [productImage] : undefined,
        category: [product.category, product.subcategory].filter(Boolean).join(" / "),
        brand: { "@type": "Brand", name: "Ndanty" },
        // AggregateRating n'est déclaré que s'il repose sur de vrais avis publiés :
        // annoncer une note sans avis derrière expose à une pénalité Google et,
        // surtout, ce serait faux.
        ...(rating.average !== null && rating.count > 0
            ? {
                  aggregateRating: {
                      "@type": "AggregateRating",
                      ratingValue: rating.average,
                      bestRating: 5,
                      ratingCount: rating.count,
                  },
              }
            : {}),
        offers: {
            "@type": "Offer",
            priceCurrency: "MGA",
            price: product.price,
            availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: `${SITE_URL}/shop/${product.id}`,
        },
    };

    return (
        <div className="min-h-screen bg-white font-sans antialiased text-[#1A1A1A] pb-24">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-10">

                {/* Bouton Retour au Catalogue - Plus discret et élégant */}
                <Link
                    href="/shop"
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-[#28a745] transition-all duration-300 mb-10 group"
                >
                    <ArrowLeft size={14} className="group-hover:-translate-x-1.5 transition-transform duration-300" />
                    Retour au catalogue
                </Link>

                {/* Grille Principale rééquilibrée */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">

                    {/* COLONNE GAUCHE (7/12) : ÉCRIN DE L'IMAGE ARTISANALE */}
                    <div className="lg:col-span-7 bg-gray-50/60 rounded-[2.5rem] p-6 sm:p-10 border border-gray-100 flex items-center justify-center min-h-[520px] shadow-sm relative overflow-hidden group transition-all duration-500 hover:shadow-md">

                        {/* Badge Artisanat Vert Ndanty - z-10 ajouté pour passer devant l'image */}
                        <div className="absolute top-6 left-6 bg-black text-white text-[9px] font-black uppercase tracking-[0.2em] py-2 px-4 rounded-full flex items-center gap-2 shadow-sm z-10 pointer-events-none">
                            <Hammer size={11} className="text-[#28a745]" />
                            Pièce Unique Atelier
                        </div>

                        {product.imageUrl ? (
                            <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="max-w-full max-h-[460px] object-contain rounded-2xl drop-shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]"
                            />
                        ) : (
                            <div className="text-gray-300 flex flex-col items-center gap-3">
                                <Hammer size={40} className="stroke-1 text-[#28a745]" />
                                <span className="text-xs font-semibold uppercase tracking-wider">Création en cours d'image</span>
                            </div>
                        )}
                    </div>

                    {/* COLONNE DROITE (5/12) : FICHE TECHNIQUE & HAUTE ÉBÉNISTERIE */}
                    <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-28">

                        {/* En-tête produit */}
                        <div className="space-y-3">
                            <span className="inline-block text-[10px] font-black uppercase tracking-[0.25em] text-[#28a745] bg-[#28a745]/8 py-1.5 px-4 rounded-full">
                                Collection Haute Ébénisterie
                            </span>
                            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#1A1A1A] font-serif leading-tight">
                                {product.name}
                            </h1>

                            {/* Note issue des avis publiés — ou rien du tout s'il n'y en a pas encore */}
                            {rating.average !== null ? (
                                <a href="#avis" className="inline-flex items-center gap-2 group/note w-max">
                                    <span className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map((star) => {
                                            if (star <= rating.average!) {
                                                return <Star key={star} size={14} className="fill-[#f39c12] text-[#f39c12]" />;
                                            }
                                            if (star - 0.5 <= rating.average!) {
                                                return <StarHalf key={star} size={14} className="fill-[#f39c12] text-[#f39c12]" />;
                                            }
                                            return <Star key={star} size={14} className="text-gray-200 fill-gray-100" />;
                                        })}
                                    </span>
                                    <span className="text-sm font-black text-[#1A1A1A] tabular-nums">
                                        {rating.average.toFixed(1)}
                                    </span>
                                    <span className="text-[11px] font-bold text-gray-400 underline underline-offset-2 group-hover/note:text-[#28a745] transition-colors">
                                        {rating.count} avis client{rating.count > 1 ? "s" : ""}
                                    </span>
                                </a>
                            ) : (
                                <a href="#avis" className="inline-block text-[11px] font-bold text-gray-400 italic underline underline-offset-2 hover:text-[#28a745] transition-colors">
                                    Aucun avis pour le moment — soyez le premier
                                </a>
                            )}
                        </div>

                        {/* Zone Prix & Devise Exclusive */}
                        <div className="border-y border-gray-100 py-6 flex flex-col gap-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl md:text-4xl font-black tracking-tight text-[#28a745]">
                                    {product.price.toLocaleString('fr-FR')}
                                </span>
                                <span className="text-xl font-extrabold text-[#1A1A1A]">Ar</span>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Valeur certifiée MGA · Paiement à la livraison
                            </span>
                        </div>

                        {/* Description textuelle léchée */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-black uppercase tracking-[0.15em] text-gray-400 flex items-center gap-2">
                                <Tag size={12} className="text-[#28a745]" />
                                L'esprit de la pièce
                            </h3>
                            <p className="text-sm text-gray-600 leading-relaxed font-medium">
                                {product.description || "Ce meuble d'exception, façonné à la main dans notre atelier, sublime les lignes naturelles du bois noble pour en faire une œuvre unique destinée à magnifier votre intérieur."}
                            </p>
                        </div>

                        {/* Caractéristiques Techniques Design Minimaliste */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-100/80 flex items-center gap-3.5">
                                <div className="p-2.5 bg-white rounded-xl text-[#28a745] shadow-sm">
                                    <Layers size={16} />
                                </div>
                                <div>
                                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Essence / Matériau</span>
                                    <span className="text-xs font-extrabold text-[#1A1A1A]">{product.category || "Bois Noble Massif"}</span>
                                </div>
                            </div>

                            <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-100/80 flex items-center gap-3.5">
                                <div className="p-2.5 bg-white rounded-xl text-[#28a745] shadow-sm">
                                    <div className={`w-2 h-2 rounded-full ${product.stock > 0 ? 'bg-[#28a745]' : 'bg-red-500'} animate-pulse`} />
                                </div>
                                <div>
                                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Statut Stock</span>
                                    <span className={`text-xs font-extrabold ${product.stock > 0 ? 'text-[#28a745]' : 'text-red-500'}`}>
                                        {product.stock > 0 ? 'Disponible' : 'Sur commande'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* LE BOUTON COMMANDE (COMPOSANT CLIENT) */}
                        <div className="pt-2">
                            <ProductActions product={product} />
                        </div>

                        {/* Ligne de confiance et réassurance épurée */}
                        <div className="pt-6 border-t border-gray-100 grid grid-cols-2 gap-6">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-gray-50 rounded-xl text-[#28a745] shrink-0">
                                    <ShieldCheck size={16} />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-wider text-[#1A1A1A]">Garantie Ndanty</h4>
                                    <p className="text-[11px] text-gray-500 font-medium mt-0.5">Authenticité & bois certifié durable.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-gray-50 rounded-xl text-[#28a745] shrink-0">
                                    <Truck size={16} />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-wider text-[#1A1A1A]">Livraison Sur-Mesure</h4>
                                    <p className="text-[11px] text-gray-500 font-medium mt-0.5">Partout à Madagascar en toute sécurité.</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* 🌟 3. SECTIONS TEMOIGNAGES ET AVIS CLIENTS (Intégration Pro) */}
                <ProductReviews
                    productId={product.id}
                    average={rating.average}
                    reviewCount={rating.count}
                />

            </div>
        </div>
    );
}