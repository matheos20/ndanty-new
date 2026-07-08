// app/admin/quotes/actions.ts
'use server';

import type { ReactElement } from "react";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { resend } from "@/lib/resend";
import { ProposalQuoteEmail } from "@/emails/ProposalQuoteEmail";
import { randomUUID } from "crypto";
import { ensureAdmin } from "@/lib/guards";

/**
 * ACTION : Envoyer une proposition de prix au client pour un devis "sur mesure".
 * Enregistre le prix + le message, passe le statut à DEVIS_ENVOYE, et notifie le client par email.
 */
export async function sendQuoteProposal(
    id: number,
    data: { proposedPrice: number; adminResponse?: string }
) {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        // 1. Validation du prix
        const price = Number(data.proposedPrice);
        if (!price || isNaN(price) || price <= 0) {
            return { success: false, error: "Veuillez saisir un prix valide (supérieur à 0)." };
        }

        // 2. On récupère le devis pour disposer du nom et de l'email du client
        const quote = await prisma.quote.findUnique({ where: { id } });
        if (!quote) {
            return { success: false, error: "Ce devis est introuvable." };
        }

        // 3. Jeton unique pour les liens de réponse par email (conservé s'il existe déjà)
        const token = quote.responseToken || randomUUID();

        // 4. Enregistrement de la proposition
        const updated = await prisma.quote.update({
            where: { id },
            data: {
                proposedPrice: price,
                adminResponse: data.adminResponse?.trim() || null,
                proposedAt: new Date(),
                status: "DEVIS_ENVOYE",
                responseToken: token,
                // On réinitialise une éventuelle ancienne réponse si l'admin renvoie une nouvelle offre
                clientDecision: null,
                clientResponse: null,
                clientRespondedAt: null,
            },
        });

        // 5. Liens d'acceptation / refus (un clic depuis l'email)
        const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3001").replace(/\/$/, "");
        const acceptUrl = `${baseUrl}/devis/repondre/${token}?decision=ACCEPTE`;
        const refuseUrl = `${baseUrl}/devis/repondre/${token}?decision=REFUSE`;

        // 6. Notification email au client (non bloquant : on ne casse pas l'enregistrement en cas d'échec mail)
        let emailWarning: string | undefined;
        try {
            await resend.emails.send({
                from: 'Ndanty <onboarding@resend.dev>',
                to: quote.email,
                subject: `Votre devis Ndanty : ${price.toLocaleString('fr-FR')} Ar`,
                react: ProposalQuoteEmail({
                    customerName: quote.customerName,
                    proposedPrice: price,
                    adminResponse: data.adminResponse,
                    details: quote.details,
                    acceptUrl,
                    refuseUrl,
                }) as ReactElement,
            });
        } catch (mailError) {
            console.error("Erreur d'envoi de l'email de proposition :", mailError);
            emailWarning = "La proposition est enregistrée, mais l'email n'a pas pu être envoyé au client.";
        }

        revalidatePath('/admin/quotes');
        return { success: true, warning: emailWarning, proposedPrice: updated.proposedPrice };
    } catch (error) {
        console.error("Erreur envoi proposition :", error);
        return { success: false, error: "Erreur lors de l'envoi de la proposition." };
    }
}

// Action pour supprimer définitivement un devis
// À modifier dans app/admin/quotes/actions.ts

export async function deleteQuoteAction(id: number) {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        await prisma.quote.delete({ // <-- Remplacé booking par quote
            where: { id }
        });
        revalidatePath('/admin/quotes');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Impossible de supprimer ce devis." };
    }
}

export async function updateQuoteAction(id: number, data: { customerName: string; email: string; phone?: string; details: string; dimensions?: string }) {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        await prisma.quote.update({ // <-- Remplacé booking par quote
            where: { id },
            data: {
                customerName: data.customerName,
                email: data.email,
                phone: data.phone,
                details: data.details,
                dimensions: data.dimensions,
            }
        });
        revalidatePath('/admin/quotes');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Erreur lors de la mise à jour du devis." };
    }
}