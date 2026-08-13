// app/admin/payments/page.tsx
// Journal des transactions des 4 passerelles (Monegasy, Visa, Mastercard, PayPal)
// + point d'entrée du simulateur de webhooks de test.
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { ensureAdmin } from '@/lib/guards';
import PaymentsJournalClient from './PaymentsJournalClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminPaymentsPage() {
    // Le journal expose des références de transaction : accès strictement administrateur.
    const guard = await ensureAdmin();
    if (!guard.ok) redirect('/login');

    const payments = await prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
            order: {
                select: {
                    id: true,
                    customerName: true,
                    email: true,
                    phone: true,
                    address: true,
                    status: true,
                    paymentStatus: true,
                    deliveryZone: true,
                    deliveryFee: true,
                    totalAmount: true,
                    orderitem: { select: { id: true, name: true, price: true, quantity: true } },
                },
            },
            event: { orderBy: { createdAt: 'asc' } },
        },
    });

    // Sérialisation défensive : les Decimal/Date traversent mal la frontière serveur → client.
    const rows = payments.map((p) => ({
        id: p.id,
        reference: p.reference,
        method: p.method,
        status: p.status,
        amount: p.amount,
        currency: p.currency,
        providerRef: p.providerRef,
        isSandbox: p.isSandbox,
        errorMessage: p.errorMessage,
        metadata: p.metadata,
        attempts: p.attempts,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
        order: p.order
            ? {
                  ...p.order,
                  items: p.order.orderitem,
              }
            : null,
        events: p.event.map((e) => ({
            id: e.id,
            type: e.type,
            source: e.source,
            method: e.method,
            status: e.status,
            message: e.message,
            payload: e.payload,
            createdAt: e.createdAt.toISOString(),
        })),
    }));

    return <PaymentsJournalClient rows={rows} />;
}
