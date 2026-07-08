// lib/auth.ts
// Source unique de configuration NextAuth pour tout le projet Ndanty.
// L'authentification se fait EXCLUSIVEMENT via la base de données (mot de passe haché bcrypt).
// Il n'y a plus de mot de passe administrateur en clair comparé au runtime : le compte admin
// est un utilisateur en base avec le rôle "ADMIN" (voir prisma/seed.ts).
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { peekRateLimit, rateLimit, resetRateLimit } from "@/lib/rate-limit";

// Anti-brute-force : 8 tentatives échouées max par email sur 15 minutes.
const LOGIN_LIMIT = { name: "login", limit: 8, windowMs: 15 * 60 * 1000 } as const;

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Connexion",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Mot de passe", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Identifiants requis");
                }

                const email = credentials.email.trim().toLowerCase();

                // Anti-brute-force : si trop de tentatives échouées récentes, on bloque
                // AVANT même de vérifier le mot de passe.
                const peek = peekRateLimit(email, LOGIN_LIMIT);
                if (!peek.ok) {
                    throw new Error(`Trop de tentatives de connexion. Réessayez dans ${Math.ceil(peek.retryAfter / 60)} minute(s).`);
                }

                // Recherche de l'utilisateur en base (admin comme client)
                const user = await prisma.user.findUnique({
                    where: { email },
                });

                if (!user || !user.password) {
                    // On compte l'échec (protège aussi contre l'énumération d'emails)
                    rateLimit(email, LOGIN_LIMIT);
                    throw new Error("Email ou mot de passe incorrect");
                }

                // Compte suspendu : accès bloqué
                if (user.role === "SUSPENDED") {
                    throw new Error("Ce compte est suspendu. Contactez l'administrateur.");
                }

                const isPasswordCorrect = await bcrypt.compare(
                    credentials.password,
                    user.password
                );
                if (!isPasswordCorrect) {
                    rateLimit(email, LOGIN_LIMIT);
                    throw new Error("Email ou mot de passe incorrect");
                }

                // Connexion réussie : on efface le compteur d'échecs.
                resetRateLimit(LOGIN_LIMIT.name, email);

                // On ne renvoie JAMAIS l'image Base64 ici (anti-overflow du cookie JWT)
                return {
                    id: user.id.toString(),
                    name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email,
                    email: user.email,
                    firstName: user.firstName ?? undefined,
                    role: user.role,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }: any) {
            // On ne stocke que le strict minimum vital dans le cookie
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.firstName = user.firstName;
            }
            // Sécurité anti-overflow : on nettoie toute clé image parasite
            if (token.picture) delete token.picture;
            if (token.image) delete token.image;
            return token;
        },
        async session({ session, token }: any) {
            if (session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
                session.user.firstName = token.firstName;
                session.user.image = undefined;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
