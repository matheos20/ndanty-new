// lib/password.ts
// Politique de mot de passe partagée (client + serveur). Source unique de vérité.

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // bcrypt tronque au-delà de 72 octets

/**
 * Valide un mot de passe selon la politique Ndanty :
 * au moins 8 caractères, au moins une lettre ET au moins un chiffre.
 */
export function validatePassword(password: string): { ok: boolean; error?: string } {
    const pw = password ?? "";
    if (pw.length < PASSWORD_MIN_LENGTH) {
        return { ok: false, error: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.` };
    }
    if (pw.length > PASSWORD_MAX_LENGTH) {
        return { ok: false, error: `Le mot de passe ne doit pas dépasser ${PASSWORD_MAX_LENGTH} caractères.` };
    }
    if (!/[a-zA-Z]/.test(pw)) {
        return { ok: false, error: "Le mot de passe doit contenir au moins une lettre." };
    }
    if (!/[0-9]/.test(pw)) {
        return { ok: false, error: "Le mot de passe doit contenir au moins un chiffre." };
    }
    return { ok: true };
}

export interface PasswordStrength {
    score: 0 | 1 | 2 | 3 | 4;
    label: string;
    color: string;
}

/**
 * Estime la force d'un mot de passe (0 à 4) pour l'indicateur visuel.
 * Purement indicatif : la validation stricte reste validatePassword().
 */
export function getPasswordStrength(password: string): PasswordStrength {
    const pw = password ?? "";
    let score = 0;
    if (pw.length >= PASSWORD_MIN_LENGTH) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;

    // On plafonne à 4 niveaux d'affichage
    const capped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
    const map: Record<number, { label: string; color: string }> = {
        0: { label: "Très faible", color: "#dc2626" },
        1: { label: "Faible", color: "#f59e0b" },
        2: { label: "Moyen", color: "#eab308" },
        3: { label: "Bon", color: "#84cc16" },
        4: { label: "Excellent", color: "#28a745" },
    };
    return { score: capped, label: map[capped].label, color: map[capped].color };
}
