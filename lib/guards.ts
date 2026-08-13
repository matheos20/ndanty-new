// lib/guards.ts
// Helpers d'autorisation partagés (Server Actions + Route Handlers).
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export type GuardOk = { ok: true; session: any };
export type GuardFail = { ok: false; error: string; status: number };
export type GuardResult = GuardOk | GuardFail;

/**
 * Récupère la session en appliquant TOUJOURS authOptions,
 * sinon les champs personnalisés (role, id) ne sont pas peuplés.
 */
export async function getSession() {
    return getServerSession(authOptions);
}

/**
 * Exige un administrateur. Renvoie un résultat exploitable par les Server Actions
 * (qui retournent { success, error }) sans lever d'exception.
 */
export async function ensureAdmin(): Promise<GuardResult> {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return { ok: false, error: "Vous devez être connecté.", status: 401 };
    }
    if ((session.user as any).role !== "ADMIN") {
        return { ok: false, error: "Accès refusé : action réservée aux administrateurs.", status: 403 };
    }
    return { ok: true, session };
}

/**
 * Exige un utilisateur connecté (client ou admin).
 */
export async function ensureUser(): Promise<GuardResult> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return { ok: false, error: "Vous devez être connecté.", status: 401 };
    }
    return { ok: true, session };
}

/**
 * Variante "throw" pratique dans les Route Handlers try/catch.
 * Lève une AuthError typée que le handler transforme en réponse HTTP.
 */
export class AuthError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = "AuthError";
        this.status = status;
    }
}

export async function requireAdmin() {
    const guard = await ensureAdmin();
    if (!guard.ok) throw new AuthError(guard.error, guard.status);
    return guard.session;
}
