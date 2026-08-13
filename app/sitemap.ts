// app/sitemap.ts — génère /sitemap.xml (pages statiques + fiches produits dynamiques).
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticRoutes: MetadataRoute.Sitemap = [
        { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
        { url: `${SITE_URL}/shop`, changeFrequency: "daily", priority: 0.9 },
        { url: `${SITE_URL}/sur-mesure`, changeFrequency: "monthly", priority: 0.7 },
        { url: `${SITE_URL}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
        { url: `${SITE_URL}/cgv`, changeFrequency: "yearly", priority: 0.2 },
        { url: `${SITE_URL}/confidentialite`, changeFrequency: "yearly", priority: 0.2 },
    ];

    let productRoutes: MetadataRoute.Sitemap = [];
    try {
        const products = await prisma.product.findMany({ select: { id: true, updatedAt: true } });
        productRoutes = products.map((p) => ({
            url: `${SITE_URL}/shop/${p.id}`,
            lastModified: p.updatedAt,
            changeFrequency: "weekly",
            priority: 0.8,
        }));
    } catch {
        // Base indisponible au build : on renvoie au moins les routes statiques.
    }

    return [...staticRoutes, ...productRoutes];
}
