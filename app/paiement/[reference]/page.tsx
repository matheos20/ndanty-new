// app/paiement/[reference]/page.tsx
// Écran de paiement sécurisé (sandbox) — chargé via la référence publique de la commande.
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PaymentClient from './PaymentClient';

export const dynamic = 'force-dynamic';

export default async function PaiementPage({
    params,
}: {
    params: Promise<{ reference: string }>;
}) {
    const { reference } = await params;

    const order = await prisma.order.findUnique({
        where: { paymentRef: reference },
        include: { orderitem: true, payment: true },
    });

    if (!order) notFound();

    // Données sérialisables passées au composant client
    const orderData = {
        paymentRef: order.paymentRef!,
        totalAmount: order.totalAmount,
        customerName: order.customerName,
        email: order.email,
        phone: order.phone,
        address: order.address,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        items: order.orderitem.map((it) => ({
            id: it.id,
            name: it.name,
            price: it.price,
            quantity: it.quantity,
        })),
        payment: order.payment
            ? { reference: order.payment.reference, status: order.payment.status, method: order.payment.method }
            : null,
    };

    return <PaymentClient order={orderData} />;
}
