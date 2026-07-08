// middleware.ts (À la racine de ton projet)
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");

        // Sécurité supplémentaire : Si l'utilisateur est connecté mais n'est pas ADMIN,
        // on l'empêche d'accéder aux pages d'administration.
        if (isAdminRoute && token?.role !== "ADMIN") {
            return NextResponse.redirect(new URL("/login", req.url));
        }
    },
    {
        callbacks: {
            // Laisse NextAuth vérifier la présence du token tout seul sur les routes du matcher.
            // On s'assure juste que l'accès n'est pas bloqué inutilement lors du processus de login.
            authorized: ({ token, req }) => {
                // Si l'utilisateur essaie d'aller sur l'admin, il doit avoir un token
                if (req.nextUrl.pathname.startsWith("/admin")) {
                    return !!token;
                }
                return true;
            },
        },
    }
);

export const config = {
    matcher: [
        /*
         * Protéger uniquement le dossier admin et ses sous-routes
         */
        "/admin/:path*",
    ],
};