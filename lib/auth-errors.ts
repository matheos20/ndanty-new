// lib/auth-errors.ts
// Codes d'erreur échangés entre `authorize()` (NextAuth, serveur) et les écrans
// de connexion (client). Isolés dans ce module sans dépendance pour qu'un
// composant client puisse les importer sans entraîner Prisma ni bcrypt.

/** Mot de passe correct, mais le second facteur n'a pas encore été fourni. */
export const TWO_FACTOR_REQUIRED = "2FA_REQUIRED";

/** Préfixe d'un refus du second facteur ; le message lisible suit le préfixe. */
export const TWO_FACTOR_INVALID_PREFIX = "2FA_INVALID:";
