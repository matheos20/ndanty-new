// lib/ratings.ts
// Note d'un produit — source unique de vérité.
//
// La note affichée sur la boutique est la MOYENNE DES AVIS APPROUVÉS, et rien
// d'autre. Elle n'est jamais saisie à la main : un catalogue où chaque meuble
// affiche la même note par défaut décrédibilise les avis réels qui existent.
//
// La colonne `product.rating` reste utilisée, mais uniquement comme copie
// dénormalisée de cette moyenne : elle évite une jointure sur la boutique et
// est recalculée à chaque décision de modération. `null` signifie « aucun avis
// publié » — surtout pas « 4,5 ».

import { prisma } from "@/lib/prisma";

export interface RatingSummary {
    /** Moyenne des avis approuvés, arrondie au dixième. `null` si aucun avis. */
    average: number | null;
    /** Nombre d'avis approuvés ayant servi au calcul. */
    count: number;
}

export const EMPTY_RATING: RatingSummary = { average: null, count: 0 };

/** Arrondi au dixième — la précision qu'un client sait lire (4,3 et non 4,3333). */
function round1(value: number): number {
    return Math.round(value * 10) / 10;
}

/**
 * Notes de plusieurs produits en une seule requête.
 * Utilisé par le catalogue : évite N requêtes pour N cartes affichées.
 */
export async function getRatingSummaries(productIds: number[]): Promise<Map<number, RatingSummary>> {
    const summaries = new Map<number, RatingSummary>();
    if (productIds.length === 0) return summaries;

    const rows = await prisma.review.groupBy({
        by: ["productId"],
        where: { productId: { in: productIds }, status: "APPROVED" },
        _avg: { rating: true },
        _count: { _all: true },
    });

    for (const row of rows) {
        const average = row._avg.rating;
        summaries.set(row.productId, {
            average: average != null ? round1(average) : null,
            count: row._count._all,
        });
    }

    // Un produit sans aucun avis approuvé n'apparaît pas dans le groupBy :
    // on lui associe explicitement « aucun avis » plutôt que `undefined`.
    for (const id of productIds) {
        if (!summaries.has(id)) summaries.set(id, EMPTY_RATING);
    }

    return summaries;
}

/** Note d'un seul produit (fiche produit, données structurées Schema.org). */
export async function getRatingSummary(productId: number): Promise<RatingSummary> {
    const result = await prisma.review.aggregate({
        where: { productId, status: "APPROVED" },
        _avg: { rating: true },
        _count: { _all: true },
    });

    const average = result._avg.rating;
    return {
        average: average != null ? round1(average) : null,
        count: result._count._all,
    };
}

/**
 * Recalcule la note d'un produit et met à jour la copie dénormalisée.
 * À appeler après TOUTE décision de modération (publication, rejet, suppression) :
 * c'est le seul moment où la moyenne peut changer.
 *
 * N'interrompt jamais l'action métier appelante : une note non rafraîchie est un
 * désagrément, pas une raison d'annuler une modération réussie.
 */
export async function refreshProductRating(productId: number | null | undefined): Promise<RatingSummary> {
    if (!productId) return EMPTY_RATING;

    try {
        const summary = await getRatingSummary(productId);
        await prisma.product.update({
            where: { id: productId },
            data: { rating: summary.average },
        });
        return summary;
    } catch (error) {
        console.error("[ratings] Recalcul impossible pour le produit", productId, error);
        return EMPTY_RATING;
    }
}

/** Recalcule plusieurs produits d'un coup (modération en lot). */
export async function refreshProductRatings(productIds: Array<number | null | undefined>): Promise<void> {
    const unique = [...new Set(productIds.filter((id): id is number => typeof id === "number"))];
    await Promise.all(unique.map((id) => refreshProductRating(id)));
}

/**
 * Remet TOUT le catalogue en cohérence avec les avis publiés.
 * Sert à la reprise initiale des données (produits dont la note était saisie à la
 * main) et reste utile après un import.
 */
export async function resyncAllProductRatings(): Promise<{ updated: number }> {
    const products = await prisma.product.findMany({ select: { id: true } });
    const summaries = await getRatingSummaries(products.map((p) => p.id));

    let updated = 0;
    for (const [productId, summary] of summaries) {
        await prisma.product.update({
            where: { id: productId },
            data: { rating: summary.average },
        });
        updated += 1;
    }
    return { updated };
}
