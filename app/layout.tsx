// app/layout.tsx  (Server Component — permet l'API metadata / SEO)
import type { Metadata } from "next";
import "@/app/globals.css";
import LayoutShell from "@/components/LayoutShell";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: "Ndanty — Mobilier & articles de maison à Madagascar",
        template: "%s | Ndanty",
    },
    description:
        "Ndanty : mobilier et articles de maison de qualité à Madagascar. Catalogue de meubles (chambre, salon, salle à manger) et commandes sur mesure, livraison à Antananarivo et en régions.",
    keywords: ["mobilier", "meubles", "Madagascar", "Antananarivo", "Ndanty", "sur mesure", "décoration", "maison"],
    authors: [{ name: "Ndanty" }],
    openGraph: {
        type: "website",
        locale: "fr_FR",
        siteName: "Ndanty",
        title: "Ndanty — Mobilier & articles de maison à Madagascar",
        description:
            "Catalogue de meubles et commandes sur mesure. Livraison à Antananarivo et dans toute l'île.",
        url: SITE_URL,
    },
    twitter: {
        card: "summary_large_image",
        title: "Ndanty — Mobilier & articles de maison à Madagascar",
        description: "Catalogue de meubles et commandes sur mesure à Madagascar.",
    },
    robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="fr" suppressHydrationWarning>
            <body className="antialiased bg-white text-gray-900" suppressHydrationWarning>
                <LayoutShell>{children}</LayoutShell>
            </body>
        </html>
    );
}
