// app/api/payments/[reference]/confirm/route.ts
// Finalise une transaction en attente : OTP Mobile Money (Monegasy) ou retour d'approbation PayPal.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getGateway, isSupportedMethod } from '@/lib/payments';
import { finalizePayment } from '@/lib/payments/finalize';
import type { ConfirmContext } from '@/lib/payments/types';
import { enforceRateLimit } from '@/lib/rate-limit';
import { sendOrderEmails } from '@/lib/mailer';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ reference: string }> }
) {
    try {
        // 🛡️ Anti-brute-force sur l'OTP / la confirmation (20/min/IP).
        const limited = enforceRateLimit(request, { name: 'payment-confirm', limit: 20, windowMs: 60_000 });
        if (limited) return limited;

        const { reference } = await params;
        const body = await request.json().catch(() => ({}));
        const input = body?.input ?? body ?? {};

        const payment = await prisma.payment.findUnique({ where: { reference } });
        if (!payment) {
            return NextResponse.json({ error: 'Transaction introuvable.' }, { status: 404 });
        }
        if (payment.status === 'PAID') {
            return NextResponse.json({ status: 'PAID', reference, message: 'Paiement déjà confirmé.' });
        }
        if (!isSupportedMethod(payment.method)) {
            return NextResponse.json({ error: 'Moyen de paiement inconnu.' }, { status: 400 });
        }

        const gateway = getGateway(payment.method);
        if (!gateway.confirm) {
            return NextResponse.json({ error: 'Cette méthode ne nécessite pas de confirmation.' }, { status: 400 });
        }

        const ctx: ConfirmContext = {
            reference,
            orderId: payment.orderId,
            amount: payment.amount,
            providerRef: payment.providerRef,
            metadata: payment.metadata ? JSON.parse(payment.metadata) : {},
            input,
        };
        const { outcome, metadata } = await gateway.confirm(ctx);

        const result = await finalizePayment(payment.id, payment.method, outcome, metadata);

        // Email transactionnel (non bloquant) après confirmation OTP encaissée.
        if (outcome.kind === 'PAID') {
            const order = await prisma.order.findUnique({
                where: { id: payment.orderId },
                include: { orderitem: true },
            });
            if (order) await sendOrderEmails(order, payment.method, true);
        }

        return NextResponse.json({
            status: outcome.kind,
            reference,
            orderPaymentStatus: result.orderPaymentStatus,
            message: 'message' in outcome ? outcome.message : undefined,
        });
    } catch (error: any) {
        console.error('Erreur confirmation paiement :', error);
        return NextResponse.json({ error: error.message || 'Erreur interne du paiement.' }, { status: 500 });
    }
}
