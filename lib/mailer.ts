// lib/mailer.ts
// Envois d'emails transactionnels liés aux commandes.
// ⚠️ Non bloquant : toute erreur est journalisée mais n'interrompt jamais le flux de paiement.
// En attendant un domaine vérifié en production, l'expéditeur reste onboarding@resend.dev
// (le service n'enverra réellement qu'aux adresses autorisées par le compte Resend de test).
import type { ReactElement } from "react";
import { resend } from "@/lib/resend";
import { OrderConfirmationEmail } from "@/emails/OrderConfirmationEmail";
import { ReceiptEmail } from "@/emails/ReceiptEmail";
import { AdminNewOrderEmail } from "@/emails/AdminNewOrderEmail";
import { AdminEmail } from "@/emails/AdminQuoteEmail";
import { OrderStatusEmail } from "@/emails/OrderStatusEmail";
import { OrderCancelledEmail } from "@/emails/OrderCancelledEmail";
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

/** Destinataire des alertes back-office. */
export function getAdminEmail(): string | null {
    const raw = process.env.ADMIN_EMAIL?.trim();
    // Le gabarit livré par défaut ne doit jamais devenir un vrai destinataire.
    if (!raw || raw === "votre-email@exemple.com") return null;
    return raw;
}

/** Base URL utilisée pour construire les liens cliquables des emails. */
export function getAppUrl(): string {
    return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
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

/** Étapes du tunnel donnant lieu à une notification client. */
export type NotifiableStatus = "EN_PREPARATION" | "EXPEDIEE" | "LIVREE";

const STATUS_SUBJECTS: Record<NotifiableStatus, string> = {
    EN_PREPARATION: "Votre commande #CMD-%d est en préparation — Ndanty",
    EXPEDIEE: "Votre commande #CMD-%d est en route 🚚 — Ndanty",
    LIVREE: "Votre commande #CMD-%d a été livrée ✅ — Ndanty",
};

/**
 * Prévient le client que sa commande a changé d'étape (préparation, expédition, livraison).
 * Silencieux et non bloquant : un échec d'envoi ne doit jamais empêcher
 * l'administrateur de faire avancer une commande dans le back-office.
 */
export async function sendOrderStatusEmail(
    order: OrderForEmail,
    status: NotifiableStatus,
): Promise<void> {
    try {
        const zone = getDeliveryZone(order.deliveryZone);

        await resend.emails.send({
            from: "Ndanty <onboarding@resend.dev>",
            to: order.email,
            subject: STATUS_SUBJECTS[status].replace("%d", String(order.id)),
            react: OrderStatusEmail({
                customerName: order.customerName,
                orderId: order.id,
                status,
                items: order.orderitem,
                total: order.totalAmount,
                deliveryZoneLabel: zone?.label,
                appUrl: getAppUrl(),
            }) as ReactElement,
        });
    } catch (err) {
        console.error("Erreur d'envoi de l'email de suivi de commande :", err);
    }
}

/** Prévient le client de l'annulation de sa commande, remboursement compris. */
export async function sendOrderCancelledEmail(
    order: OrderForEmail & { paymentMethod?: string | null },
    details: { reason: string; refunded: boolean; refundAmount: number },
): Promise<void> {
    try {
        await resend.emails.send({
            from: "Ndanty <onboarding@resend.dev>",
            to: order.email,
            subject: `Annulation de votre commande #CMD-${order.id} — Ndanty`,
            react: OrderCancelledEmail({
                customerName: order.customerName,
                orderId: order.id,
                reason: details.reason,
                refunded: details.refunded,
                refundAmount: details.refundAmount,
                methodLabel: order.paymentMethod ? METHOD_LABELS[order.paymentMethod] || order.paymentMethod : null,
                paymentRef: order.paymentRef,
                appUrl: getAppUrl(),
            }) as ReactElement,
        });
    } catch (err) {
        console.error("Erreur d'envoi de l'email d'annulation :", err);
    }
}

interface OrderForAdminAlert extends OrderForEmail {
    phone: string;
    address: string;
}

/**
 * Alerte l'administrateur qu'une commande vient d'être réglée.
 * Silencieuse si ADMIN_EMAIL n'est pas configuré : en local, l'absence de destinataire
 * ne doit pas polluer les logs à chaque paiement.
 */
export async function sendAdminOrderAlert(
    order: OrderForAdminAlert,
    method: string,
    paymentStatus: string,
): Promise<void> {
    const to = getAdminEmail();
    if (!to) return;

    try {
        const deliveryFee = order.deliveryFee ?? 0;
        const zone = getDeliveryZone(order.deliveryZone);

        await resend.emails.send({
            from: "Système Ndanty <onboarding@resend.dev>",
            to,
            subject: `🛒 Nouvelle commande #CMD-${order.id} — ${order.totalAmount.toLocaleString("fr-FR")} Ar`,
            react: AdminNewOrderEmail({
                orderId: order.id,
                customerName: order.customerName,
                email: order.email,
                phone: order.phone,
                address: order.address,
                items: order.orderitem,
                subtotal: order.totalAmount - deliveryFee,
                deliveryFee,
                total: order.totalAmount,
                deliveryZoneLabel: zone?.label,
                methodLabel: METHOD_LABELS[method] || method,
                paymentStatus,
                paymentRef: order.paymentRef,
                appUrl: getAppUrl(),
            }) as ReactElement,
        });
    } catch (err) {
        console.error("Erreur d'envoi de l'alerte admin (commande) :", err);
    }
}

/** Alerte l'administrateur qu'une nouvelle demande de devis sur mesure est arrivée. */
export async function sendAdminQuoteAlert(quote: {
    id: number;
    customerName: string;
    email: string;
    phone?: string | null;
    details: string;
    dimensions?: string | null;
}): Promise<void> {
    const to = getAdminEmail();
    if (!to) return;

    try {
        await resend.emails.send({
            from: "Système Ndanty <onboarding@resend.dev>",
            to,
            subject: `📐 Nouveau devis sur mesure #DEV-${quote.id} — ${quote.customerName}`,
            react: AdminEmail({
                customerName: quote.customerName,
                email: quote.email,
                details: quote.details,
                phone: quote.phone,
                dimensions: quote.dimensions,
                quoteId: quote.id,
                appUrl: getAppUrl(),
            }) as ReactElement,
        });
    } catch (err) {
        console.error("Erreur d'envoi de l'alerte admin (devis) :", err);
    }
}
