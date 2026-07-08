// app/api/payments/route.ts
// Démarre une transaction de paiement pour une commande existante (identifiée par son paymentRef public).
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getGateway, isSupportedMethod, generatePaymentRef } from '@/lib/payments';
import { finalizePayment } from '@/lib/payments/finalize';
import type { InitiateContext } from '@/lib/payments/types';
import { enforceRateLimit } from '@/lib/rate-limit';
import { sendOrderEmails } from '@/lib/mailer';

function resolveAppUrl(request: Request): string {
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
    return new URL(request.url).origin;
}

export async function POST(request: Request) {
    try {
        // 🛡️ Anti-spam / anti-brute-force sur les tentatives de paiement (15/min/IP).
        const limited = enforceRateLimit(request, { name: 'payments', limit: 15, windowMs: 60_000 });
        if (limited) return limited;

        const body = await request.json();
        const { paymentRef, method, details } = body;

        if (!paymentRef || !method) {
            return NextResponse.json({ error: 'Référence de commande et moyen de paiement requis.' }, { status: 400 });
        }
        if (!isSupportedMethod(method)) {
            return NextResponse.json({ error: `Moyen de paiement non pris en charge : ${method}.` }, { status: 400 });
        }

        // 1. Charger la commande via sa référence publique
        const order = await prisma.order.findUnique({
            where: { paymentRef },
            include: { orderitem: true, payment: true },
        });
        if (!order) {
            return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 });
        }
        if (order.paymentStatus === 'PAID' || order.paymentStatus === 'A_LA_LIVRAISON') {
            return NextResponse.json({ error: 'Cette commande est déjà réglée.' }, { status: 409 });
        }

        // 2. Créer ou réinitialiser (nouvelle tentative) la ligne de paiement pour cette commande
        const reference = order.payment?.reference ?? generatePaymentRef();
        const payment = await prisma.payment.upsert({
            where: { orderId: order.id },
            create: {
                orderId: order.id,
                method,
                status: 'PROCESSING',
                amount: order.totalAmount,
                currency: 'MGA',
                reference,
                isSandbox: true,
                attempts: 1,
            },
            update: {
                method,
                status: 'PROCESSING',
                errorMessage: null,
                providerRef: null,
                attempts: { increment: 1 },
            },
        });

        // Mémoriser le moyen choisi sur la commande dès l'initiation
        await prisma.order.update({ where: { id: order.id }, data: { paymentMethod: method } });

        // 3. Appeler la passerelle (simulée)
        const gateway = getGateway(method);
        const ctx: InitiateContext = {
            reference,
            orderId: order.id,
            amount: order.totalAmount,
            currency: 'MGA',
            customerName: order.customerName,
            email: order.email,
            phone: order.phone,
            appUrl: resolveAppUrl(request),
            details: details || {},
        };
        const { outcome, metadata } = await gateway.initiate(ctx);

        // 4. Appliquer le résultat
        if (outcome.kind === 'PAID' || outcome.kind === 'COD') {
            const result = await finalizePayment(payment.id, method, outcome, metadata);
            // Emails transactionnels (non bloquant) : confirmation + reçu si encaissé.
            await sendOrderEmails(order, method, outcome.kind === 'PAID');
            return NextResponse.json({
                status: outcome.kind,
                reference,
                orderPaymentStatus: result.orderPaymentStatus,
                message: outcome.message,
            });
        }

        if (outcome.kind === 'REQUIRES_ACTION') {
            await prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'REQUIRES_ACTION',
                    providerRef: outcome.providerRef,
                    metadata: metadata ? JSON.stringify(metadata) : undefined,
                },
            });
            return NextResponse.json({
                status: 'REQUIRES_ACTION',
                action: outcome.action,
                reference,
                message: outcome.message,
            });
        }

        if (outcome.kind === 'REDIRECT') {
            await prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'PROCESSING',
                    providerRef: outcome.providerRef,
                    metadata: metadata ? JSON.stringify(metadata) : undefined,
                },
            });
            return NextResponse.json({ status: 'REDIRECT', redirectUrl: outcome.redirectUrl, reference });
        }

        // FAILED / CANCELLED
        const result = await finalizePayment(payment.id, method, outcome, metadata);
        return NextResponse.json({
            status: outcome.kind,
            reference,
            orderPaymentStatus: result.orderPaymentStatus,
            message: 'message' in outcome ? outcome.message : 'Paiement échoué.',
        });
    } catch (error: any) {
        console.error('Erreur initiation paiement :', error);
        return NextResponse.json({ error: error.message || 'Erreur interne du paiement.' }, { status: 500 });
    }
}
