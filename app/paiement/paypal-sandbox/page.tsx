// app/paiement/paypal-sandbox/page.tsx
// Écran d'approbation PayPal SIMULÉ (sandbox). Reproduit la redirection réelle de PayPal :
// l'acheteur approuve ou annule, puis revient sur la boutique.
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { mgaToUsd, PAYPAL_SANDBOX_BUYER } from '@/lib/payments/sandbox';
import PaypalSandboxClient from './PaypalSandboxClient';

export const dynamic = 'force-dynamic';

export default async function PaypalSandboxPage({
    searchParams,
}: {
    searchParams: Promise<{ ref?: string }>;
}) {
    const { ref } = await searchParams;
    if (!ref) notFound();

    const payment = await prisma.payment.findUnique({
        where: { reference: ref },
        include: { order: true },
    });
    if (!payment || payment.method !== 'PAYPAL' || !payment.order.paymentRef) notFound();

    const data = {
        reference: payment.reference,
        orderRef: payment.order.paymentRef,
        amountMga: payment.amount,
        amountUsd: mgaToUsd(payment.amount),
        buyerEmail: PAYPAL_SANDBOX_BUYER.email,
        merchant: 'Ndanty — Meubles & Maison',
        alreadyPaid: payment.status === 'PAID',
    };

    return <PaypalSandboxClient data={data} />;
}
