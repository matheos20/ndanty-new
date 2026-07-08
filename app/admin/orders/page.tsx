// app/admin/orders/page.tsx
import { prisma } from "@/lib/prisma";
import OrdersListClient from "./OrdersListClient";

export const revalidate = 0;

export default async function AdminOrdersPage() {
    // 1. Récupération avec le vrai nom de la relation Prisma (orderitem)
    const dbOrders = await prisma.order.findMany({
        orderBy: { id: 'desc' },
        include: {
            orderitem: true // 👈 Utilisation du champ exact du schema.prisma
        }
    });

    // 2. Transformation pour garder la compatibilité avec ton composant client
    const orders = dbOrders.map((order) => {
        const { orderitem, ...rest } = order;
        return {
            ...rest,
            items: orderitem // 👈 On renomme "orderitem" en "items" pour le composant
        };
    });

    return <OrdersListClient initialOrders={orders} />;
}