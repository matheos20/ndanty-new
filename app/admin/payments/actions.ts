'use server';

// app/admin/payments/actions.ts
// Simulateur de webhooks du back-office (Projet FANAKA — Ndanty).
//
// Choix d'implémentation important : l'action NE modifie PAS la base directement.
// Elle fabrique un événement, le SIGNE, et appelle le vrai endpoint /api/payments/webhook.
// Le chemin testé depuis l'admin est donc exactement celui qu'empruntera la passerelle
// en production — signature, anti-rejeu et idempotence compris.
import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { ensureAdmin } from '@/lib/guards';
import { logPaymentEvent } from '@/lib/payments/events';
import {
    buildSignatureHeader,
    WEBHOOK_EVENT_TYPES,
    type WebhookEventType,
} from '@/lib/payments/webhook';
import { getAppUrl } from '@/lib/mailer';
import { recordAudit } from '@/lib/admin/audit';

export interface SimulateResult {
    success: boolean;
    error?: string;
    status?: string;
    orderPaymentStatus?: string;
    duplicate?: boolean;
}

/**
 * Envoie un webhook de test signé pour une transaction donnée.
 * Réservé aux administrateurs : déclencher un « payment.succeeded » vaut encaissement.
 */
export async function simulateWebhook(
    reference: string,
    type: WebhookEventType,
    reason?: string,
): Promise<SimulateResult> {
    const guard = await ensureAdmin();
    if (!guard.ok) return { success: false, error: guard.error };

    if (!WEBHOOK_EVENT_TYPES.includes(type)) {
        return { success: false, error: `Scénario inconnu : ${type}.` };
    }

    const payment = await prisma.payment.findUnique({ where: { reference } });
    if (!payment) return { success: false, error: 'Transaction introuvable.' };

    // Trace l'origine humaine du déclenchement : le journal doit distinguer
    // un rappel réel de la passerelle d'une simulation lancée depuis le back-office.
    await logPaymentEvent({
        paymentId: payment.id,
        type: 'WEBHOOK_RECEIVED',
        source: 'ADMIN',
        method: payment.method,
        status: payment.status,
        message: `Simulation déclenchée depuis le back-office : ${type}`,
        payload: { simulatedBy: guard.session?.user?.email ?? 'admin', type },
    });

    const event = {
        id: `evt_${randomBytes(10).toString('hex')}`,
        type,
        created: Math.floor(Date.now() / 1000),
        data: {
            reference,
            providerRef: payment.providerRef || `SBX-${randomBytes(4).toString('hex').toUpperCase()}`,
            amount: payment.amount,
            currency: payment.currency,
            reason: reason?.trim() || undefined,
        },
    };

    const rawBody = JSON.stringify(event);
    const signature = buildSignatureHeader(rawBody, event.created);

    try {
        const response = await fetch(`${getAppUrl()}/api/payments/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-ndanty-signature': signature },
            body: rawBody,
            cache: 'no-store',
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return { success: false, error: data?.error || `Webhook refusé (HTTP ${response.status}).` };
        }

        await recordAudit({
            action: 'payment.simulate',
            entity: 'payment',
            entityId: reference,
            label: `${payment.method} — ${reference}`,
            summary: `Webhook « ${type} » simulé depuis le back-office`
                + (data?.status ? ` · transaction ${data.status}` : '')
                + (data?.duplicate ? ' · événement déjà traité (ignoré)' : ''),
            metadata: { type, reason: reason?.trim() || null, amount: payment.amount, result: data },
            actorEmail: guard.session?.user?.email,
        });

        revalidatePath('/admin/payments');
        revalidatePath('/admin/orders');
        revalidatePath('/admin');
        return {
            success: true,
            status: data?.status,
            orderPaymentStatus: data?.orderPaymentStatus,
            duplicate: Boolean(data?.duplicate),
        };
    } catch (err) {
        console.error('Erreur de simulation de webhook :', err);
        return {
            success: false,
            error:
                "Impossible de joindre l'endpoint webhook. Vérifiez NEXT_PUBLIC_APP_URL " +
                `(actuellement ${getAppUrl()}) et que le serveur répond.`,
        };
    }
}
