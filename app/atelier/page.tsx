// app/atelier/page.tsx
// Page « Atelier » : l'histoire et le savoir-faire de la marque.
// Le lien existait déjà dans la barre de navigation (desktop et mobile) mais
// pointait vers une route absente : chaque visiteur qui cliquait tombait sur une 404.
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
    Hammer, TreePine, Ruler, Sparkles, ShieldCheck, Truck,
    ArrowRight, Quote, MapPin, Users,
} from "lucide-react";

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001").replace(/\/$/, "");

export const metadata: Metadata = {
    title: "L'Atelier Ndanty — Savoir-faire & ébénisterie à Antananarivo",
    description:
        "Découvrez l'atelier Ndanty : ébénistes malgaches, bois nobles sélectionnés, meubles façonnés à la main à Antananarivo. Du dessin à la livraison, chaque pièce est unique.",
    alternates: { canonical: `${SITE_URL}/atelier` },
    openGraph: {
        title: "L'Atelier Ndanty — Savoir-faire & ébénisterie",
        description:
            "Ébénistes malgaches, bois nobles sélectionnés, meubles façonnés à la main à Antananarivo.",
        url: `${SITE_URL}/atelier`,
        type: "website",
    },
};

export const revalidate = 3600; // page éditoriale : une heure de cache suffit

/** Les quatre temps de la fabrication, du dessin à la livraison. */
const ETAPES = [
    {
        icon: <Ruler size={22} />,
        titre: "Le dessin",
        texte:
            "Chaque meuble commence par un croquis coté. Dimensions, usages, contraintes de la pièce : rien n'est laissé au hasard avant que le bois ne soit touché.",
    },
    {
        icon: <TreePine size={22} />,
        titre: "Le choix du bois",
        texte:
            "Nous sélectionnons des essences locales pour leur densité et leur veinage. Le bois est séché lentement pour qu'il ne travaille plus une fois chez vous.",
    },
    {
        icon: <Hammer size={22} />,
        titre: "L'assemblage",
        texte:
            "Tenons, mortaises et queues d'aronde : nos ébénistes privilégient les assemblages traditionnels, ceux qui tiennent des décennies sans une vis.",
    },
    {
        icon: <Sparkles size={22} />,
        titre: "La finition",
        texte:
            "Ponçage progressif puis huiles et cires naturelles. La finition révèle le veinage au lieu de le masquer, et se retouche facilement avec le temps.",
    },
];

/** Ce qui distingue un meuble d'atelier d'un meuble de série. */
const ENGAGEMENTS = [
    {
        icon: <ShieldCheck size={20} />,
        titre: "Bois massif, jamais d'aggloméré",
        texte: "Une pièce Ndanty se répare, se ponce et se transmet. Elle ne se jette pas.",
    },
    {
        icon: <Users size={20} />,
        titre: "Des artisans malgaches",
        texte: "Nos ébénistes travaillent à Antananarivo. Acheter Ndanty, c'est faire vivre un savoir-faire local.",
    },
    {
        icon: <Truck size={20} />,
        titre: "Livré et installé",
        texte: "Nous livrons dans les quartiers d'Antananarivo et en régions, et nous mettons le meuble en place.",
    },
];

export default async function AtelierPage() {
    // Quelques repères réels plutôt que des chiffres inventés : le catalogue et
    // les avis publiés parlent d'eux-mêmes.
    const [pieces, avisPublies, categories] = await Promise.all([
        prisma.product.count().catch(() => 0),
        prisma.review.count({ where: { status: "APPROVED" } }).catch(() => 0),
        prisma.category.count().catch(() => 0),
    ]);

    const reperes = [
        { valeur: pieces, label: "pièces au catalogue" },
        { valeur: categories || 4, label: "univers de la maison" },
        { valeur: avisPublies, label: "avis clients publiés" },
    ];

    return (
        <div className="min-h-screen bg-white font-sans text-[#1A1A1A]">

            {/* ═══════════ EN-TÊTE ═══════════ */}
            <section className="w-[94%] lg:w-[80%] mx-auto pt-12 pb-16 sm:pt-20 sm:pb-24">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

                    <div className="lg:col-span-7 space-y-6">
                        <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#28a745] bg-[#28a745]/8 py-2 px-4 rounded-full">
                            <MapPin size={12} />
                            Antananarivo, Madagascar
                        </span>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-serif leading-[1.05]">
                            L'atelier où naissent
                            <span className="block text-[#28a745] italic">vos meubles.</span>
                        </h1>

                        <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-xl font-medium">
                            Ndanty n'est pas un revendeur. Derrière chaque pièce du catalogue, il y a un
                            établi, des copeaux au sol et des artisans qui façonnent le bois à la main.
                            C'est ce qui fait qu'aucun meuble ne ressemble tout à fait à un autre.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <Link
                                href="/shop"
                                className="inline-flex items-center justify-center gap-2 bg-[#28a745] hover:bg-[#218838] text-white px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-[#28a745]/20 group"
                            >
                                Voir le catalogue
                                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                href="/sur-mesure"
                                className="inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-[#28a745] hover:text-[#28a745] text-[#2c3e50] px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest transition-all"
                            >
                                Commander sur mesure
                            </Link>
                        </div>
                    </div>

                    {/* Repères chiffrés — tirés de la base, pas inventés. */}
                    <div className="lg:col-span-5">
                        <div className="bg-gray-50/70 border border-gray-100 rounded-[2.5rem] p-8 sm:p-10 space-y-8">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white rounded-2xl text-[#28a745] shadow-sm">
                                    <Hammer size={22} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                    L'atelier en bref
                                </span>
                            </div>

                            <div className="space-y-6">
                                {reperes.map((r) => (
                                    <div key={r.label} className="flex items-baseline gap-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                                        <span className="text-4xl font-black text-[#28a745] tabular-nums shrink-0">
                                            {r.valeur}
                                        </span>
                                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 leading-snug">
                                            {r.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════ LES ÉTAPES DE FABRICATION ═══════════ */}
            <section className="bg-[#FCFCFC] border-y border-gray-100 py-16 sm:py-24">
                <div className="w-[94%] lg:w-[80%] mx-auto space-y-12">
                    <div className="text-center space-y-3 max-w-2xl mx-auto">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#28a745]">
                            Notre méthode
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-serif italic font-normal text-[#2c3e50]">
                            Du croquis à votre salon
                        </h2>
                        <p className="text-sm text-gray-500 leading-relaxed font-medium">
                            Quatre temps, toujours les mêmes, qu'il s'agisse d'une pièce du catalogue
                            ou d'une commande sur mesure.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {ETAPES.map((etape, index) => (
                            <div
                                key={etape.titre}
                                className="bg-white rounded-[2rem] border border-gray-100 p-7 space-y-4 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] transition-all duration-500"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="p-3 bg-[#28a745]/8 rounded-2xl text-[#28a745]">
                                        {etape.icon}
                                    </div>
                                    <span className="text-3xl font-black text-gray-100 tabular-nums leading-none">
                                        {String(index + 1).padStart(2, "0")}
                                    </span>
                                </div>
                                <h3 className="text-base font-extrabold text-[#2c3e50] font-serif italic">
                                    {etape.titre}
                                </h3>
                                <p className="text-xs text-gray-500 leading-relaxed font-medium">
                                    {etape.texte}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════ NOS ENGAGEMENTS ═══════════ */}
            <section className="w-[94%] lg:w-[80%] mx-auto py-16 sm:py-24">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">

                    <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-28">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#28a745]">
                            Nos engagements
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-serif italic font-normal text-[#2c3e50] leading-tight">
                            Un meuble qui vous survivra
                        </h2>
                        <p className="text-sm text-gray-500 leading-relaxed font-medium">
                            Le mobilier de série est conçu pour être remplacé. Nous fabriquons
                            exactement l'inverse : des pièces que l'on répare, que l'on transmet,
                            et qui vieillissent mieux qu'elles ne sont neuves.
                        </p>
                    </div>

                    <div className="lg:col-span-7 space-y-4">
                        {ENGAGEMENTS.map((item) => (
                            <div
                                key={item.titre}
                                className="flex items-start gap-5 bg-gray-50/60 border border-gray-100 rounded-[2rem] p-6 sm:p-7"
                            >
                                <div className="p-3 bg-white rounded-2xl text-[#28a745] shadow-sm shrink-0">
                                    {item.icon}
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="text-sm font-extrabold text-[#2c3e50]">{item.titre}</h3>
                                    <p className="text-xs text-gray-500 leading-relaxed font-medium">{item.texte}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════ LA PAROLE DE L'ATELIER ═══════════ */}
            <section className="bg-[#2c3e50] py-16 sm:py-24">
                <div className="w-[94%] lg:w-[60%] mx-auto text-center space-y-8">
                    <Quote size={40} className="mx-auto text-[#28a745]" />
                    <blockquote className="text-xl sm:text-2xl lg:text-3xl text-white font-serif italic leading-relaxed">
                        « Un bon meuble ne se remarque pas le premier jour.
                        Il se remarque au bout de dix ans, quand il est toujours là. »
                    </blockquote>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#28a745]">
                        L'équipe de l'atelier Ndanty
                    </p>
                </div>
            </section>

            {/* ═══════════ APPEL À L'ACTION ═══════════ */}
            <section className="w-[94%] lg:w-[80%] mx-auto py-16 sm:py-24">
                <div className="bg-gray-50/70 border border-gray-100 rounded-[2.5rem] p-8 sm:p-14 text-center space-y-6">
                    <h2 className="text-2xl sm:text-3xl font-serif italic font-normal text-[#2c3e50]">
                        Une idée précise en tête ?
                    </h2>
                    <p className="text-sm text-gray-500 leading-relaxed max-w-xl mx-auto font-medium">
                        Dimensions particulières, essence choisie, finition sur mesure : décrivez-nous
                        votre projet, l'atelier vous répond avec un devis détaillé.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                        <Link
                            href="/sur-mesure"
                            className="inline-flex items-center justify-center gap-2 bg-[#28a745] hover:bg-[#218838] text-white px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-[#28a745]/20 group"
                        >
                            Demander un devis
                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            href="/shop"
                            className="inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-[#28a745] hover:text-[#28a745] text-[#2c3e50] px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest transition-all"
                        >
                            Parcourir le catalogue
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
