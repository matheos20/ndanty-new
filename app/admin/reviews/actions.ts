// app/admin/reviews/actions.ts
'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ensureAdmin } from "@/lib/guards";

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

        await prisma.review.update({
            where: { id },
            data: {
                adminReply: text,
                adminReplyAt: new Date(),
            },
        });

        revalidatePath('/admin/reviews');
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

        await prisma.review.update({
            where: { id },
            data: { adminReply: null, adminReplyAt: null },
        });
        revalidatePath('/admin/reviews');
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

        await prisma.review.delete({ where: { id } });
        revalidatePath('/admin/reviews');
        return { success: true };
    } catch (error) {
        console.error("Erreur suppression avis :", error);
        return { success: false, error: "Impossible de supprimer cet avis." };
    }
}
