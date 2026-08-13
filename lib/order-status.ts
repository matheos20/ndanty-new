// lib/order-status.ts
// Vocabulaire UNIFIÉ des statuts de traitement d'une commande (client + admin).
// Pipeline de suivi : En attente → En préparation → Expédiée → Livrée (+ Annulée).

export type OrderStatusKey =
    | "EN_ATTENTE"
    | "EN_PREPARATION"
    | "EXPEDIEE"
    | "LIVREE"
    | "ANNULEE";

export interface OrderStatusDef {
    key: OrderStatusKey;
    label: string;
    /** Position dans le tunnel de suivi (0 = début, 3 = livré). -1 = hors pipeline (annulée). */
    step: number;
    /** Classes Tailwind pour le badge. */
    badge: string;
}

export const ORDER_STATUSES: OrderStatusDef[] = [
    { key: "EN_ATTENTE", label: "En attente", step: 0, badge: "bg-gray-100 text-gray-500" },
    { key: "EN_PREPARATION", label: "En préparation", step: 1, badge: "bg-amber-50 text-amber-600" },
    { key: "EXPEDIEE", label: "Expédiée", step: 2, badge: "bg-blue-50 text-blue-600" },
    { key: "LIVREE", label: "Livrée", step: 3, badge: "bg-green-50 text-green-600" },
    { key: "ANNULEE", label: "Annulée", step: -1, badge: "bg-red-50 text-red-600" },
];

/** Les étapes visibles dans la frise de suivi client. */
export const TRACKING_STEPS = ORDER_STATUSES.filter((s) => s.step >= 1);

// Correspondance des anciennes valeurs stockées en base → vocabulaire unifié.
const LEGACY_MAP: Record<string, OrderStatusKey> = {
    CONFIRMED: "EN_PREPARATION",
    VALIDE: "EN_PREPARATION",
    PREPARATION: "EN_PREPARATION",
    EXPEDIE: "EXPEDIEE",
    "EXPÉDIÉE": "EXPEDIEE",
    SHIPPED: "EXPEDIEE",
    LIVRE: "LIVREE",
    "LIVRÉ": "LIVREE",
    "LIVRÉE": "LIVREE",
    DELIVERED: "LIVREE",
    CANCELLED: "ANNULEE",
    ANNULE: "ANNULEE",
    "ANNULÉ": "ANNULEE",
    "ANNULÉE": "ANNULEE",
};

/** Normalise n'importe quelle valeur de statut (ancienne ou nouvelle) vers une clé canonique. */
export function normalizeStatus(raw: string | null | undefined): OrderStatusKey {
    const s = (raw || "").toUpperCase().trim();
    if (ORDER_STATUSES.some((o) => o.key === s)) return s as OrderStatusKey;
    return LEGACY_MAP[s] || "EN_ATTENTE";
}

export function getStatusDef(raw: string | null | undefined): OrderStatusDef {
    const key = normalizeStatus(raw);
    return ORDER_STATUSES.find((o) => o.key === key)!;
}

/** Liste des clés valides (pour la validation côté API). */
export const ORDER_STATUS_KEYS: OrderStatusKey[] = ORDER_STATUSES.map((s) => s.key);
