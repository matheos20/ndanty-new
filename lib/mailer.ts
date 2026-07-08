// lib/mailer.ts
// Envois d'emails transactionnels liés aux commandes.
// ⚠️ Non bloquant : toute erreur est journalisée mais n'interrompt jamais le flux de paiement.
// En attendant un domaine vérifié en production, l'expéditeur reste onboarding@resend.dev
// (le service n'enverra réellement qu'aux adresses autorisées par le compte Resend de test).
import type { ReactElement } from "react";
import { resend } from "@/lib/resend";
import { OrderConfirmationEmail } from "@/emails/OrderConfirmationEmail";
import { ReceiptEmail } from "@/emails/ReceiptEmail";
import { getDeliveryZone } from "@/lib/delivery";

const METHOD_LABELS: Record<string, string> = {
    MONEGASY: "Monegasy", VISA: "Visa", MASTERCARD: "Mastercard", PAYPAL: "PayPal", COD: "Paiement à la livraison",
};

interface OrderForEmail {
    id: number;
    email: string;
    customerName: string;
    totalAmount: number;
    deliveryFee?: number | null;
    deliveryZone?: string | null;
    paymentRef?: string | null;
    orderitem: { name: string; price: number; quantity: number }[];
}

/**
 * Envoie la confirmation de commande et le reçu de paiement.
 * `paid` = true pour un encaissement (reçu), false pour COD (confirmation seule).
 */
export async function sendOrderEmails(order: OrderForEmail, method: string, paid: boolean): Promise<void> {
    try {
        const deliveryFee = order.deliveryFee ?? 0;
        const subtotal = order.totalAmount - deliveryFee;
        const zone = getDeliveryZone(order.deliveryZone);
        const methodLabel = METHOD_LABELS[method] || method;

        await resend.emails.send({
            from: "Ndanty <onboarding@resend.dev>",
            to: order.email,
            subject: `Confirmation de votre commande #CMD-${order.id} — Ndanty`,
            react: OrderConfirmationEmail({
                customerName: order.customerName,
                orderId: order.id,
                items: order.orderitem,
                subtotal,
                deliveryFee,
                total: order.totalAmount,
                deliveryZoneLabel: zone?.label,
            }) as ReactElement,
        });

        if (paid) {
            await resend.emails.send({
                from: "Ndanty <onboarding@resend.dev>",
                to: order.email,
                subject: `Reçu de paiement #CMD-${order.id} — Ndanty`,
                react: ReceiptEmail({
                    customerName: order.customerName,
                    orderId: order.id,
                    total: order.totalAmount,
                    method: methodLabel,
                    paymentRef: order.paymentRef || "—",
                    date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
                }) as ReactElement,
            });
        }
    } catch (err) {
        // On ne casse jamais le paiement pour un échec d'email.
        console.error("Erreur d'envoi des emails de commande :", err);
    }
}
