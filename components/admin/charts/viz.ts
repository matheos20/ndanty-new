// components/admin/charts/viz.ts
// Jetons graphiques partagés par tous les graphiques du back-office Ndanty.
// Module pur (aucun hook) : importable aussi bien côté serveur que client.

/**
 * Palette catégorielle — ordre FIGÉ : la couleur suit le moyen de paiement,
 * jamais son classement. Validée sur surface blanche en mode clair :
 * bande de luminosité OK, chroma OK, séparation daltonisme ΔE 24.7 (seuil 8),
 * vision normale ΔE 28.2 (seuil 15). Seul le jaune (#eda100, « À la livraison »)
 * passe sous 3:1 de contraste : il est TOUJOURS accompagné d'un libellé chiffré.
 */
export const VIZ = {
    /** Vert Ndanty — couleur d'accentuation de la marque. */
    brand: "#28a745",
    surface: "#ffffff",
    ink: "#2c3e50",
    muted: "#9ca3af",
    grid: "#eef1f4",
    axis: "#e2e6ea",
    track: "#f1f3f5",
    positive: "#1e7e34",
    negative: "#d03b3b",
} as const;

/** Emplacements catégoriels, assignés dans l'ordre et jamais recyclés. */
export const SERIES_COLORS = ["#28a745", "#2a78d6", "#eb6834", "#4a3aa7", "#eda100"] as const;

/** Couleur d'un moyen de paiement (emplacement figé par clé). */
export const PAYMENT_COLORS: Record<string, string> = {
    MONEGASY: SERIES_COLORS[0],
    VISA: SERIES_COLORS[1],
    MASTERCARD: SERIES_COLORS[2],
    PAYPAL: SERIES_COLORS[3],
    COD: SERIES_COLORS[4],
};

export function seriesColor(key: string, index: number): string {
    return PAYMENT_COLORS[key] || SERIES_COLORS[index % SERIES_COLORS.length];
}

// ─── Formatage des nombres ───────────────────────────────────────────────────

export function nf(n: number): string {
    return Math.round(n).toLocaleString("fr-FR");
}

/** Montant complet, pour les valeurs mises en avant et les infobulles. */
export function ar(n: number): string {
    return `${nf(n)} Ar`;
}

/** Montant compact, pour les graduations d'axe et les étiquettes serrées. */
export function compact(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
    if (n >= 1_000) return `${(n / 1_000).toLocaleString("fr-FR", { maximumFractionDigits: n >= 10_000 ? 0 : 1 })} k`;
    return nf(n);
}

export function percent(n: number, digits = 0): string {
    return `${n.toLocaleString("fr-FR", { maximumFractionDigits: digits })} %`;
}

/** Variation signée (`null` = pas de base de comparaison). */
export function delta(v: number | null): string {
    if (v === null) return "Nouveau";
    const sign = v > 0 ? "+" : "";
    return `${sign}${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

/** Plafond « rond » d'un axe des ordonnées (0 / 1 000 / 2 500 ...). */
export function niceMax(value: number): number {
    if (value <= 0) return 10;
    const exponent = Math.floor(Math.log10(value));
    const base = Math.pow(10, exponent);
    for (const step of [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
        if (value <= step * base) return step * base;
    }
    return 10 * base;
}
