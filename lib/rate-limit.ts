// lib/rate-limit.ts
// Rate-limiting basique en mémoire (fenêtre fixe), pensé pour l'environnement local /
// mono-instance. Bloque les rafales de robots sur les routes sensibles (commandes, paiements).
// ⚠️ En production multi-instances, remplacer par un store partagé (Redis / Upstash).

type Bucket = { count: number; resetAt: number };

// Un store par nom de limiteur pour éviter que /orders et /payments se partagent le compteur.
const stores = new Map<string, Map<string, Bucket>>();

function getStore(name: string): Map<string, Bucket> {
    let store = stores.get(name);
    if (!store) {
        store = new Map();
        stores.set(name, store);
    }
    return store;
}

export interface RateLimitOptions {
    /** Nom logique du limiteur (ex: "orders", "payments"). */
    name: string;
    /** Nombre de requêtes autorisées par fenêtre. */
    limit: number;
    /** Durée de la fenêtre en millisecondes. */
    windowMs: number;
}

export interface RateLimitResult {
    ok: boolean;
    remaining: number;
    /** Secondes avant réinitialisation (utile pour l'en-tête Retry-After). */
    retryAfter: number;
}

/**
 * Extrait une clé d'identification du client (IP) à partir des en-têtes.
 * En local, x-forwarded-for est souvent absent : on retombe sur une clé fixe.
 */
export function clientKey(request: Request): string {
    const fwd = request.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return request.headers.get("x-real-ip") || "local";
}

/**
 * Consomme un jeton pour la clé donnée. `now` est injectable pour les tests.
 */
export function rateLimit(
    key: string,
    { name, limit, windowMs }: RateLimitOptions,
    now: number = Date.now()
): RateLimitResult {
    const store = getStore(name);
    const bucket = store.get(key);

    if (!bucket || now >= bucket.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { ok: true, remaining: limit - 1, retryAfter: 0 };
    }

    if (bucket.count >= limit) {
        return {
            ok: false,
            remaining: 0,
            retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
        };
    }

    bucket.count += 1;
    return { ok: true, remaining: limit - bucket.count, retryAfter: 0 };
}

/**
 * Consulte l'état du compteur SANS l'incrémenter (utile pour bloquer une connexion
 * avant même de vérifier le mot de passe).
 */
export function peekRateLimit(
    key: string,
    { name, limit, windowMs }: RateLimitOptions,
    now: number = Date.now()
): RateLimitResult {
    const bucket = getStore(name).get(key);
    if (!bucket || now >= bucket.resetAt) {
        return { ok: true, remaining: limit, retryAfter: 0 };
    }
    if (bucket.count >= limit) {
        return { ok: false, remaining: 0, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
    }
    return { ok: true, remaining: limit - bucket.count, retryAfter: 0 };
}

/** Réinitialise le compteur d'une clé (ex : connexion réussie → on efface les échecs). */
export function resetRateLimit(name: string, key: string): void {
    getStore(name).delete(key);
}

/**
 * Applique le rate-limit à une requête et renvoie null si OK,
 * ou une Response 429 prête à renvoyer si la limite est dépassée.
 */
export function enforceRateLimit(request: Request, options: RateLimitOptions): Response | null {
    const result = rateLimit(clientKey(request), options);
    if (result.ok) return null;
    return new Response(
        JSON.stringify({
            error: "Trop de requêtes. Veuillez patienter quelques instants avant de réessayer.",
        }),
        {
            status: 429,
            headers: {
                "Content-Type": "application/json",
                "Retry-After": String(result.retryAfter),
            },
        }
    );
}
