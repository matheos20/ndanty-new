// app/robots.ts — génère /robots.txt
import type { MetadataRoute } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                // On n'indexe pas l'admin, l'espace client ni les API.
                disallow: ["/admin", "/dashboard", "/api", "/paiement"],
            },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}
