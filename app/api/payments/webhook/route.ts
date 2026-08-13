// app/api/payments/webhook/route.ts
// Réception des rappels (webhooks) des 4 passerelles en environnement de test.
// Scénarios couverts : succès du paiement, échec/refus, annulation par l'utilisateur.
//
// Sécurité appliquée, identique à ce qu'exigera la production :
//   - signature HMAC-SHA256 du corps BRUT (jamais du corps re-sérialisé) ;
//   - fenêtre d'horodatage de 5 min (anti-rejeu) ;
//   - idempotence par `event.id` : un même événement rejoué n'est appliqué qu'une fois ;
//   - rate-limiting ;
//   - toute tentative refusée est tracée dans le journal quand la transaction est identifiable.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isSupportedMethod } from '@/lib/payments';
import { finalizePayment } from '@/lib/payments/finalize';
import { logPaymentEvent } from '@/lib/payments/events';
import { verifySignature, parseEvent, eventToOutcome } from '@/lib/payments/webhook';
import { enforceRateLimit } from '@/lib/rate-limit';
import { sendOrderEmails, sendAdminOrderAlert } from '@/lib/mailer';

export async function POST(request: Request) {
    // 🛡️ Un webhook légitime est rare : 30/min/IP suffit largement et coupe court aux abus.
    const limited = enforceRateLimit(request, { name: 'payment-webhook', limit: 30, windowMs: 60_000 });
    if (limited) return limited;

    // Le corps BRUT est indispensable : re-sérialiser du JSON changerait les octets signés.
    const rawBody = await request.text();

    try {
        // 1. Authentifier l'appel AVANT toute interprétation du contenu.
        const signature = verifySignature(rawBody, request.headers.get('x-ndanty-signature'));
        if (!signature.ok) {
            await traceRejection(rawBody, signature.reason);
            return NextResponse.json({ error: `Webhook refusé : ${signature.reason}` }, { status: 401 });
        }

        // 2. Valider la forme de l'événement.
        let body: unknown;
        try {
            body = JSON.parse(rawBody);
        } catch {
            return NextResponse.json({ error: 'Webhook refusé : corps JSON illisible.' }, { status: 400 });
        }
        const parsed = parseEvent(body);
        if (!parsed.ok) {
            await traceRejection(rawBody, parsed.reason);
            return NextResponse.json({ error: `Webhook refusé : ${parsed.reason}` }, { status: 400 });
        }
        const event = parsed.event;

        // 3. Retrouver la transaction visée.
        const payment = await prisma.payment.findUnique({
            where: { reference: event.data.reference },
            include: { order: { include: { orderitem: true } } },
        });
        if (!payment) {
            return NextResponse.json({ error: 'Transaction introuvable pour cette référence.' }, { status: 404 });
        }
        if (!isSupportedMethod(payment.method)) {
            return NextResponse.json({ error: 'Moyen de paiement inconnu.' }, { status: 400 });
        }

        // 4. Idempotence : le même `event.id` ne doit produire qu'un seul effet,
        //    car les passerelles réelles réémettent tant qu'elles n'ont pas reçu un 2xx.
        const already = await prisma.paymentevent.findFirst({
            where: { paymentId: payment.id, type: 'WEBHOOK_RECEIVED', payload: { contains: `"${event.id}"` } },
        });
        if (already) {
            return NextResponse.json({
                received: true,
                duplicate: true,
                reference: payment.reference,
                status: payment.status,
                message: 'Événement déjà traité — aucune action rejouée.',
            });
        }

        // 5. Appliquer le résultat (transactionnel + idempotent côté finalizePayment).
        const outcome = eventToOutcome(event);
        let result;
        try {
            result = await finalizePayment(payment.id, payment.method, outcome, undefined, 'WEBHOOK');
        } catch (applyError) {
            // Cas métier réel : le stock est devenu insuffisant entre la commande et
            // l'encaissement. Répondre 5xx ferait retenter la passerelle en boucle alors
            // que le problème ne se résoudra pas tout seul → on répond 409 (définitif)
            // et on laisse une trace exploitable par le back-office.
            const reason =
                applyError instanceof Error ? applyError.message : 'Application du webhook impossible.';
            await logPaymentEvent({
                paymentId: payment.id,
                type: 'WEBHOOK_REJECTED',
                source: 'WEBHOOK',
                method: payment.method,
                status: payment.status,
                message: `Événement authentique mais inapplicable : ${reason}`,
                payload: { eventId: event.id, type: event.type },
            });
            return NextResponse.json(
                { error: reason, applied: false, reference: payment.reference },
                { status: 409 },
            );
        }

        // 6. Tracer la réception dans le journal (payload conservé pour l'audit et l'idempotence).
        await logPaymentEvent({
            paymentId: payment.id,
            type: 'WEBHOOK_RECEIVED',
            source: 'WEBHOOK',
            method: payment.method,
            status: result.paymentStatus,
            message: `${event.type} — ${'message' in outcome ? outcome.message : ''}`,
            payload: { eventId: event.id, type: event.type, data: event.data },
        });

        // 7. Un encaissement arrivé par webhook doit déclencher les mêmes emails
        //    qu'un encaissement synchrone (le client ne doit pas voir de différence).
        if (outcome.kind === 'PAID' && payment.order) {
            await sendOrderEmails(payment.order, payment.method, true);
            await sendAdminOrderAlert(payment.order, payment.method, result.orderPaymentStatus);
        }

        return NextResponse.json({
            received: true,
            reference: payment.reference,
            status: result.paymentStatus,
            orderPaymentStatus: result.orderPaymentStatus,
        });
    } catch (error) {
        console.error('Erreur de traitement du webhook :', error);
        const message = error instanceof Error ? error.message : 'Erreur interne du webhook.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * Trace un rejet dans le journal LORSQUE la transaction est identifiable.
 * Un appel non signé reste refusé quoi qu'il arrive : cette trace sert à diagnostiquer
 * une passerelle mal configurée, pas à valider quoi que ce soit.
 */
async function traceRejection(rawBody: string, reason: string): Promise<void> {
    try {
        const parsed = JSON.parse(rawBody);
        const reference = parsed?.data?.reference;
        if (!reference || typeof reference !== 'string') return;
        const payment = await prisma.payment.findUnique({ where: { reference } });
        if (!payment) return;
        await logPaymentEvent({
            paymentId: payment.id,
            type: 'WEBHOOK_REJECTED',
            source: 'WEBHOOK',
            method: payment.method,
            status: payment.status,
            message: reason,
            payload: { type: parsed?.type ?? null, eventId: parsed?.id ?? null },
        });
    } catch {
        // Corps illisible ou transaction inconnue : rien à tracer.
    }
}
