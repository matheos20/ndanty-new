// lib/auth.ts
// Source unique de configuration NextAuth pour tout le projet Ndanty.
// L'authentification se fait EXCLUSIVEMENT via la base de données (mot de passe haché bcrypt).
// Il n'y a plus de mot de passe administrateur en clair comparé au runtime : le compte admin
// est un utilisateur en base avec le rôle "ADMIN" (voir prisma/seed.ts).
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { peekRateLimit, rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { verifyTwoFactorForUser } from "@/lib/two-factor";

// Anti-brute-force : 8 tentatives échouées max par email sur 15 minutes.
const LOGIN_LIMIT = { name: "login", limit: 8, windowMs: 15 * 60 * 1000 } as const;

// Second facteur : un code à 6 chiffres n'offre qu'un million de possibilités.
// Sans limite stricte, il serait devinable par force brute une fois le mot de
// passe connu. 6 essais par 10 minutes referment cette porte.
const TWO_FACTOR_LIMIT = { name: "login-2fa", limit: 6, windowMs: 10 * 60 * 1000 } as const;

// Signaux renvoyés par `authorize()` à l'écran de connexion lorsque le mot de
// passe est bon mais que le second facteur manque ou ne convient pas. Ils vivent
// dans un module sans dépendance (lib/auth-errors) pour rester importables côté
// client, et sont ré-exportés ici par commodité.
export { TWO_FACTOR_REQUIRED, TWO_FACTOR_INVALID_PREFIX } from "@/lib/auth-errors";
import { TWO_FACTOR_REQUIRED, TWO_FACTOR_INVALID_PREFIX } from "@/lib/auth-errors";

// Connexion Google activée uniquement si les identifiants OAuth sont présents dans .env.
// Cela évite un provider cassé (et une page /api/auth en erreur) tant que la config
// Google Cloud n'a pas été renseignée. Le bouton côté client se masque en conséquence.
export const isGoogleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

/**
 * Crée ou fusionne le compte client correspondant à une connexion OAuth (Google).
 * Retourne `false` si l'accès doit être refusé (email manquant, compte suspendu).
 * Logique isolée ici pour être testable indépendamment du flux NextAuth.
 */
export async function upsertGoogleUser(input: { email?: string | null; name?: string | null }): Promise<boolean> {
    const email = String(input.email || "").trim().toLowerCase();
    if (!email) return false; // Google n'a pas fourni d'email : on refuse.

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
        // Compte suspendu : accès bloqué comme pour la connexion classique.
        if (existing.role === "SUSPENDED") return false;
        // Compte existant (créé par mot de passe) : on le marque comme aussi
        // connectable via Google, sans écraser ses données.
        if (existing.provider !== "google") {
            await prisma.user.update({
                where: { id: existing.id },
                data: { provider: "google" },
            });
        }
        return true;
    }

    // Nouveau client Google : on découpe le nom complet en prénom / nom.
    const fullName = String(input.name || "").trim();
    const [firstName, ...rest] = fullName.split(/\s+/);
    await prisma.user.create({
        data: {
            email,
            firstName: firstName || null,
            lastName: rest.join(" ") || null,
            password: null, // pas de mot de passe local pour un compte Google
            provider: "google",
            role: "USER",
        },
    });
    return true;
}

export const authOptions: NextAuthOptions = {
    providers: [
        ...(isGoogleEnabled
            ? [
                  GoogleProvider({
                      clientId: process.env.GOOGLE_CLIENT_ID as string,
                      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
                      // On demande explicitement le profil + l'email (comportement par défaut).
                      authorization: {
                          params: { prompt: "select_account" },
                      },
                  }),
              ]
            : []),
        CredentialsProvider({
            name: "Connexion",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Mot de passe", type: "password" },
                // Second facteur : code à 6 chiffres de l'application d'authentification
                // OU code de secours. Vide au premier envoi du formulaire.
                code: { label: "Code de vérification", type: "text" },
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

                // ---- Second facteur (TOTP) ----------------------------------
                // Le mot de passe est bon : on n'incrémente plus le compteur de
                // connexion, mais l'accès n'est accordé qu'après le code.
                if (user.twoFactorEnabled) {
                    const submittedCode = String(credentials.code || "").trim();

                    if (!submittedCode) {
                        // Signal au client : afficher l'étape « code de vérification ».
                        throw new Error(TWO_FACTOR_REQUIRED);
                    }

                    const codePeek = peekRateLimit(email, TWO_FACTOR_LIMIT);
                    if (!codePeek.ok) {
                        throw new Error(
                            `${TWO_FACTOR_INVALID_PREFIX}Trop de codes erronés. Réessayez dans ${Math.ceil(codePeek.retryAfter / 60)} minute(s).`
                        );
                    }

                    const check = await verifyTwoFactorForUser(user, submittedCode);
                    if (!check.ok) {
                        rateLimit(email, TWO_FACTOR_LIMIT);
                        throw new Error(
                            `${TWO_FACTOR_INVALID_PREFIX}${check.error || "Code de vérification invalide."}`
                        );
                    }

                    resetRateLimit(TWO_FACTOR_LIMIT.name, email);
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
        // Connexion via Google : on crée le compte client s'il n'existe pas encore,
        // ou on autorise l'accès au compte existant (fusion par email).
        async signIn({ user, account, profile }: any) {
            if (account?.provider !== "google") return true; // credentials : déjà validé dans authorize()

            // Un compte protégé par un second facteur ne doit pas pouvoir être
            // ouvert par un chemin qui ne le réclame pas. On renvoie l'utilisateur
            // vers la connexion par mot de passe, seul flux qui exige le code.
            const email = String(user?.email || "").trim().toLowerCase();
            if (email) {
                const existing = await prisma.user.findUnique({
                    where: { email },
                    select: { twoFactorEnabled: true },
                });
                if (existing?.twoFactorEnabled) {
                    return "/login?error=2fa-required-password";
                }
            }

            return upsertGoogleUser({ email: user?.email, name: profile?.name || user?.name });
        },
        async jwt({ token, user, account }: any) {
            // Connexion par identifiants : `user` contient déjà id/role/firstName.
            if (user && account?.provider !== "google") {
                token.id = user.id;
                token.role = user.role;
                token.firstName = user.firstName;
            }
            // Connexion Google : on recharge le compte en base pour récupérer
            // l'id interne, le rôle et le prénom (non fournis par le profil OAuth).
            if (account?.provider === "google" && token.email) {
                const dbUser = await prisma.user.findUnique({
                    where: { email: String(token.email).toLowerCase() },
                });
                if (dbUser) {
                    token.id = dbUser.id.toString();
                    token.role = dbUser.role;
                    token.firstName = dbUser.firstName ?? undefined;
                }
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
