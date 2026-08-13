// app/dashboard/actions.ts
'use server';

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * ACTION : Le client accepte ou refuse la proposition de devis reçue.
 * Sécurisé : le devis doit appartenir à l'email du client connecté.
 */
export async function respondToQuote(
    quoteId: number,
    decision: 'ACCEPTE' | 'REFUSE',
    message?: string
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return { success: false, error: "Vous devez être connecté pour répondre." };
        }

        if (decision !== 'ACCEPTE' && decision !== 'REFUSE') {
            return { success: false, error: "Décision invalide." };
        }

        const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
        if (!quote) {
            return { success: false, error: "Devis introuvable." };
        }
        // Barrière de sécurité : on ne répond qu'à SON propre devis
        if (quote.email !== session.user.email) {
            return { success: false, error: "Ce devis ne vous appartient pas." };
        }
        if (quote.proposedPrice == null) {
            return { success: false, error: "Aucune proposition de prix n'a encore été envoyée pour ce devis." };
        }

        await prisma.quote.update({
            where: { id: quoteId },
            data: {
                clientDecision: decision,
                clientResponse: message?.trim() || null,
                clientRespondedAt: new Date(),
                // On aligne le statut global : accepté = validé, refusé = refusé
                status: decision === 'ACCEPTE' ? 'VALIDE' : 'REFUSE',
            },
        });

        revalidatePath('/dashboard');
        revalidatePath('/admin/quotes');
        return { success: true };
    } catch (error) {
        console.error("Erreur réponse client au devis :", error);
        return { success: false, error: "Une erreur est survenue. Réessayez." };
    }
}
