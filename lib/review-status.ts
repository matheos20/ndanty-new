// lib/review-status.ts
// Vocabulaire UNIFIÉ de la modération des avis clients (API publique + back-office).
//
// Règle d'or : un avis n'est visible sur la fiche produit QUE s'il est APPROVED.
// Tout avis déposé entre dans la file d'attente (PENDING) et attend une décision
// humaine — c'est ce qui empêche un spam ou une insulte d'atterrir en vitrine.

export type ReviewStatusKey = "PENDING" | "APPROVED" | "REJECTED";

export interface ReviewStatusDef {
    key: ReviewStatusKey;
    /** Libellé affiché dans le back-office. */
    label: string;
    /** Libellé court pour les onglets de la file d'attente. */
    tab: string;
    /** Classes Tailwind du badge de statut. */
    badge: string;
    /** Classe de la pastille colorée (point). */
    dot: string;
    /** Phrase explicative affichée au survol / sous la carte. */
    hint: string;
}

export const REVIEW_STATUSES: ReviewStatusDef[] = [
    {
        key: "PENDING",
        label: "En attente de validation",
        tab: "À modérer",
        badge: "bg-amber-50 text-amber-600 border-amber-100",
        dot: "bg-amber-500",
        hint: "Cet avis n'est pas encore visible par les visiteurs.",
    },
    {
        key: "APPROVED",
        label: "Publié",
        tab: "Publiés",
        badge: "bg-[#28a745]/10 text-[#28a745] border-[#28a745]/20",
        dot: "bg-[#28a745]",
        hint: "Cet avis est visible publiquement sur la fiche produit.",
    },
    {
        key: "REJECTED",
        label: "Rejeté",
        tab: "Rejetés",
        badge: "bg-red-50 text-red-600 border-red-100",
        dot: "bg-red-500",
        hint: "Cet avis a été écarté : il reste archivé mais jamais publié.",
    },
];

export const REVIEW_STATUS_KEYS: ReviewStatusKey[] = REVIEW_STATUSES.map((s) => s.key);

/**
 * Normalise une valeur de statut lue en base. Toute valeur inconnue retombe sur
 * PENDING : en modération, le doute ne publie jamais — il met en file d'attente.
 */
export function normalizeReviewStatus(raw: string | null | undefined): ReviewStatusKey {
    const s = (raw || "").toUpperCase().trim();
    if (REVIEW_STATUS_KEYS.includes(s as ReviewStatusKey)) return s as ReviewStatusKey;
    return "PENDING";
}

export function getReviewStatusDef(raw: string | null | undefined): ReviewStatusDef {
    const key = normalizeReviewStatus(raw);
    return REVIEW_STATUSES.find((s) => s.key === key)!;
}

/** Filtre Prisma des avis réellement publiables (statut absent = héritage publié). */
export const PUBLIC_REVIEW_WHERE = { status: "APPROVED" } as const;
