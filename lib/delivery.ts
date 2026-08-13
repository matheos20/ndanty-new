// lib/delivery.ts
// Source unique des zones et frais de livraison Ndanty (Antananarivo par quartiers + régions de Madagascar).
// Importable côté client (affichage du sélecteur) ET côté serveur (recalcul/validation du montant).
// ⚠️ Le montant final est TOUJOURS recalculé côté serveur à partir de cet ID de zone : le client
//    ne peut donc pas falsifier les frais de livraison.

export interface DeliveryZone {
    id: string;
    label: string;
    group: "Antananarivo" | "Régions de Madagascar";
    /** Frais de livraison en Ariary (MGA). */
    fee: number;
    /** Délai indicatif affiché au client. */
    eta: string;
}

export const DELIVERY_ZONES: DeliveryZone[] = [
    // --- Antananarivo (quartiers) ---
    { id: "tana-centre", label: "Analakely / Antaninarenina (Centre-ville)", group: "Antananarivo", fee: 5000, eta: "1–2 jours" },
    { id: "tana-antanimena", label: "Antanimena / Behoririka", group: "Antananarivo", fee: 5000, eta: "1–2 jours" },
    { id: "tana-67ha", label: "67 Ha / Andavamamba", group: "Antananarivo", fee: 6000, eta: "1–2 jours" },
    { id: "tana-ankorondrano", label: "Ankorondrano / Ivandry", group: "Antananarivo", fee: 7000, eta: "1–2 jours" },
    { id: "tana-andraharo", label: "Andraharo / Ankadimbahoaka", group: "Antananarivo", fee: 6000, eta: "1–2 jours" },
    { id: "tana-ambohipo", label: "Ambohipo / Ankatso (Université)", group: "Antananarivo", fee: 7000, eta: "1–2 jours" },
    { id: "tana-analamahitsy", label: "Analamahitsy / Ivandry", group: "Antananarivo", fee: 8000, eta: "2 jours" },
    { id: "tana-itaosy", label: "Itaosy / Ampitatafika", group: "Antananarivo", fee: 9000, eta: "2 jours" },
    { id: "tana-ambohibao", label: "Ambohibao / Ivato (Périphérie)", group: "Antananarivo", fee: 10000, eta: "2–3 jours" },
    { id: "tana-tanjombato", label: "Tanjombato / Anosizato", group: "Antananarivo", fee: 8000, eta: "2 jours" },

    // --- Régions de Madagascar ---
    { id: "reg-antsirabe", label: "Antsirabe (Vakinankaratra)", group: "Régions de Madagascar", fee: 25000, eta: "3–5 jours" },
    { id: "reg-fianarantsoa", label: "Fianarantsoa (Haute Matsiatra)", group: "Régions de Madagascar", fee: 45000, eta: "4–6 jours" },
    { id: "reg-toamasina", label: "Toamasina (Atsinanana)", group: "Régions de Madagascar", fee: 40000, eta: "4–6 jours" },
    { id: "reg-mahajanga", label: "Mahajanga (Boeny)", group: "Régions de Madagascar", fee: 50000, eta: "5–7 jours" },
    { id: "reg-morondava", label: "Morondava (Menabe)", group: "Régions de Madagascar", fee: 60000, eta: "5–8 jours" },
    { id: "reg-toliara", label: "Toliara (Atsimo-Andrefana)", group: "Régions de Madagascar", fee: 70000, eta: "6–9 jours" },
    { id: "reg-antsiranana", label: "Antsiranana / Diego (Diana)", group: "Régions de Madagascar", fee: 80000, eta: "6–9 jours" },
    { id: "reg-nosybe", label: "Nosy Be", group: "Régions de Madagascar", fee: 85000, eta: "7–10 jours" },
    { id: "reg-taolagnaro", label: "Taolagnaro / Fort-Dauphin (Anosy)", group: "Régions de Madagascar", fee: 90000, eta: "7–10 jours" },
];

const ZONE_MAP: Record<string, DeliveryZone> = Object.fromEntries(
    DELIVERY_ZONES.map((z) => [z.id, z])
);

export function getDeliveryZone(id: string | null | undefined): DeliveryZone | undefined {
    if (!id) return undefined;
    return ZONE_MAP[id];
}

/**
 * Frais de livraison pour une zone. Renvoie null si la zone est inconnue
 * (le serveur doit alors refuser la commande plutôt que d'appliquer 0).
 */
export function getDeliveryFee(id: string | null | undefined): number | null {
    const zone = getDeliveryZone(id);
    return zone ? zone.fee : null;
}

/** Zones groupées pour construire un <select> avec <optgroup>. */
export function getGroupedZones(): { group: string; zones: DeliveryZone[] }[] {
    const groups = ["Antananarivo", "Régions de Madagascar"] as const;
    return groups.map((group) => ({
        group,
        zones: DELIVERY_ZONES.filter((z) => z.group === group),
    }));
}
