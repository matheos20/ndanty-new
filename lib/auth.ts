// lib/auth.ts
// Source unique de configuration NextAuth pour tout le projet Ndanty.
// L'authentification se fait EXCLUSIVEMENT via la base de données (mot de passe haché bcrypt).
// Il n'y a plus de mot de passe administrateur en clair comparé au runtime : le compte admin
// est un utilisateur en base avec le rôle "ADMIN" (voir prisma/seed.ts).
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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

                // Recherche de l'utilisateur en base (admin comme client)
                const user = await prisma.user.findUnique({
                    where: { email },
                });

                if (!user || !user.password) {
                    // Message générique volontaire (ne pas révéler si l'email existe)
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
                    throw new Error("Email ou mot de passe incorrect");
                }

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
