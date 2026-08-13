// app/admin/reviews/actions.ts
'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ensureAdmin } from "@/lib/guards";
import type { ReviewStatusKey } from "@/lib/review-status";
import { recordAudit } from "@/lib/admin/audit";
import { refreshProductRatings } from "@/lib/ratings";

/**
 * Recalcule la note des produits touchés PUIS rafraîchit les écrans concernés.
 *
 * Les deux opérations sont volontairement réunies ici : toute décision de
 * modération change l'ensemble des avis publiés, donc la moyenne affichée sur
 * la boutique. Les séparer, c'est prendre le risque qu'un chemin oublie le
 * recalcul et laisse une note qui ne correspond plus aux avis visibles.
 */
async function syncReviewSurfaces(...productIds: Array<number | null | undefined>) {
    await refreshProductRatings(productIds);

    revalidatePath('/admin/reviews');
    revalidatePath('/admin/products');
    revalidatePath('/shop');
    for (const productId of productIds) {
        if (productId) revalidatePath(`/shop/${productId}`);
    }
}

/** Applique une décision de modération et journalise QUI a tranché, et QUAND. */
async function setReviewStatus(
    id: number,
    status: ReviewStatusKey,
    moderatorEmail: string,
    rejectionReason: string | null,
) {
    const before = await prisma.review.findUnique({
        where: { id },
        select: { status: true, rating: true, product: { select: { name: true } }, user: { select: { email: true } } },
    });

    const updated = await prisma.review.update({
        where: { id },
        data: {
            status,
            moderatedAt: new Date(),
            moderatedBy: moderatorEmail,
            rejectionReason,
        },
        select: { productId: true },
    });

    await recordAudit({
        action: status === 'APPROVED' ? 'review.approve' : 'review.reject',
        entity: 'review',
        entityId: id,
        label: `Avis #${id} — ${before?.product?.name || 'produit supprimé'}`,
        summary: status === 'APPROVED'
            ? `Avis publié (${before?.rating}/5, ${before?.user?.email || 'client'})`
            : `Avis rejeté — motif : ${rejectionReason}`,
        metadata: { from: before?.status, to: status, rating: before?.rating, rejectionReason },
        actorEmail: moderatorEmail,
    });

    await syncReviewSurfaces(updated.productId);
}

/**
 * ACTION : Approuver un avis — il devient immédiatement visible sur la fiche produit.
 */
export async function approveReview(id: number) {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        await setReviewStatus(id, 'APPROVED', guard.session.user?.email || 'admin', null);
        return { success: true };
    } catch (error) {
        console.error("Erreur approbation avis :", error);
        return { success: false, error: "Impossible d'approuver cet avis." };
    }
}

/**
 * ACTION : Rejeter un avis. Il n'est jamais publié mais reste archivé avec son
 * motif — indispensable si le client conteste la décision plus tard.
 */
export async function rejectReview(id: number, reason: string) {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        const motif = (reason || "").trim();
        if (motif.length < 3) {
            return { success: false, error: "Indiquez un motif de rejet (3 caractères minimum)." };
        }

        await setReviewStatus(id, 'REJECTED', guard.session.user?.email || 'admin', motif.slice(0, 500));
        return { success: true };
    } catch (error) {
        console.error("Erreur rejet avis :", error);
        return { success: false, error: "Impossible de rejeter cet avis." };
    }
}

/**
 * ACTION : Remettre un avis en file d'attente (annulation d'une décision).
 * Dépublie l'avis s'il était en ligne.
 */
export async function resetReviewToPending(id: number) {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        const updated = await prisma.review.update({
            where: { id },
            data: {
                status: 'PENDING',
                moderatedAt: null,
                moderatedBy: null,
                rejectionReason: null,
            },
            select: { productId: true },
        });

        await recordAudit({
            action: 'review.restore',
            entity: 'review',
            entityId: id,
            label: `Avis #${id}`,
            summary: 'Décision annulée : avis remis en file de modération (dépublié)',
            actorEmail: guard.session.user?.email,
        });

        await syncReviewSurfaces(updated.productId);
        return { success: true };
    } catch (error) {
        console.error("Erreur remise en attente :", error);
        return { success: false, error: "Impossible de remettre cet avis en attente." };
    }
}

/**
 * ACTION : Vider la file d'attente en approuvant tout ce qui s'y trouve.
 * Réservé aux journées calmes où l'administrateur a relu la liste avant de valider.
 */
export async function approveAllPendingReviews() {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        // On relève les produits concernés AVANT la mise à jour : après, ces avis
        // ne sont plus « en attente » et deviendraient introuvables pour le recalcul.
        const pending = await prisma.review.findMany({
            where: { status: 'PENDING' },
            select: { productId: true },
        });

        const result = await prisma.review.updateMany({
            where: { status: 'PENDING' },
            data: {
                status: 'APPROVED',
                moderatedAt: new Date(),
                moderatedBy: guard.session.user?.email || 'admin',
                rejectionReason: null,
            },
        });

        await recordAudit({
            action: 'review.approve',
            entity: 'review',
            summary: `Approbation groupée : ${result.count} avis publiés d'un coup`,
            metadata: { count: result.count },
            actorEmail: guard.session.user?.email,
        });

        await syncReviewSurfaces(...pending.map((r) => r.productId));
        return { success: true, count: result.count };
    } catch (error) {
        console.error("Erreur approbation groupée :", error);
        return { success: false, error: "Impossible d'approuver la file d'attente." };
    }
}

/**
 * ACTION : La boutique Ndanty répond publiquement à un avis client.
 * La réponse s'affiche sous l'avis sur la fiche produit.
 */
export async function replyToReview(id: number, reply: string) {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        const text = (reply || "").trim();
        if (text.length < 2) {
            return { success: false, error: "La réponse est trop courte." };
        }

        const updated = await prisma.review.update({
            where: { id },
            data: {
                adminReply: text,
                adminReplyAt: new Date(),
            },
            select: { productId: true },
        });

        await recordAudit({
            action: 'review.reply',
            entity: 'review',
            entityId: id,
            label: `Avis #${id}`,
            summary: `Réponse publique de la boutique : « ${text.slice(0, 120)}${text.length > 120 ? '…' : ''} »`,
            actorEmail: guard.session.user?.email,
        });

        await syncReviewSurfaces(updated.productId);
        return { success: true };
    } catch (error) {
        console.error("Erreur réponse avis :", error);
        return { success: false, error: "Impossible d'enregistrer la réponse." };
    }
}

/**
 * ACTION : Supprimer la réponse de la boutique à un avis.
 */
export async function deleteReviewReply(id: number) {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        const updated = await prisma.review.update({
            where: { id },
            data: { adminReply: null, adminReplyAt: null },
            select: { productId: true },
        });
        await syncReviewSurfaces(updated.productId);
        return { success: true };
    } catch (error) {
        console.error("Erreur suppression réponse :", error);
        return { success: false, error: "Impossible de supprimer la réponse." };
    }
}

/**
 * ACTION : Supprimer complètement un avis (modération).
 */
export async function deleteReview(id: number) {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        const deleted = await prisma.review.delete({
            where: { id },
            select: { productId: true, rating: true, comment: true, status: true },
        });

        await recordAudit({
            action: 'review.delete',
            entity: 'review',
            entityId: id,
            label: `Avis #${id}`,
            summary: `Avis supprimé définitivement (${deleted.rating}/5, statut ${deleted.status})`,
            metadata: { rating: deleted.rating, status: deleted.status, comment: deleted.comment.slice(0, 300) },
            actorEmail: guard.session.user?.email,
        });

        await syncReviewSurfaces(deleted.productId);
        return { success: true };
    } catch (error) {
        console.error("Erreur suppression avis :", error);
        return { success: false, error: "Impossible de supprimer cet avis." };
    }
}
