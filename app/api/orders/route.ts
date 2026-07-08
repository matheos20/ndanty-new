// app/api/orders/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOrderRef } from '@/lib/payments';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getDeliveryZone } from '@/lib/delivery';

export async function POST(request: Request) {
    try {
        // 🛡️ Anti-spam : 10 créations de commande max par minute et par IP.
        const limited = enforceRateLimit(request, { name: 'orders', limit: 10, windowMs: 60_000 });
        if (limited) return limited;

        const body = await request.json();
        const { userId, customerName, email, phone, address, items, deliveryZone } = body;

        // 1. Validation de base des champs obligatoires
        if (!customerName || !email || !phone || !address || !items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { error: "Tous les champs de livraison et un panier valide sont obligatoires." },
                { status: 400 }
            );
        }

        // 1b. Barrière de Sécurité : Validation stricte du numéro de téléphone malgache
        // Impose un numéro à 10 chiffres commençant par 032, 033, 034 ou 038
        const phoneRegex = /^03[2348]\d{7}$/;
        if (!phoneRegex.test(phone)) {
            return NextResponse.json(
                { error: "Le format du numéro de téléphone est invalide. Veuillez entrer un numéro valide à 10 chiffres (commençant par 032, 033, 034 ou 038)." },
                { status: 400 }
            );
        }

        // 1c. Zone de livraison : on recalcule les frais côté serveur (anti-triche).
        const zone = getDeliveryZone(deliveryZone);
        if (!zone) {
            return NextResponse.json(
                { error: "Veuillez sélectionner une zone de livraison valide." },
                { status: 400 }
            );
        }
        const deliveryFee = zone.fee;

        // 2. Transaction Prisma : on VALIDE la disponibilité et on calcule le vrai montant côté serveur.
        //    ⚠️ Le stock N'EST PAS décrémenté ici : il ne le sera qu'au paiement réussi
        //    (voir lib/payments/finalize.ts), afin d'éviter toute fuite de stock si le client abandonne.
        const paymentRef = generateOrderRef();

        const newOrder = await prisma.$transaction(async (tx) => {
            let totalAmount = deliveryFee; // On démarre le total avec les frais de livraison
            const itemsToCreate = [];

            for (const item of items) {
                const dbProduct = await tx.product.findUnique({
                    where: { id: Number(item.id) }
                });

                if (!dbProduct) {
                    throw new Error(`Le produit "${item.name}" n'existe plus dans notre catalogue.`);
                }

                if (dbProduct.stock < item.quantity) {
                    throw new Error(`Stock insuffisant pour "${dbProduct.name}". Quantité disponible : ${dbProduct.stock}.`);
                }

                // Calcul du montant basé sur le prix réel en BDD pour éviter la triche côté client
                totalAmount += dbProduct.price * item.quantity;

                itemsToCreate.push({
                    productId: dbProduct.id,
                    name: dbProduct.name,
                    price: dbProduct.price,
                    quantity: item.quantity
                });
            }

            // Création de la commande en attente de paiement.
            return await tx.order.create({
                data: {
                    userId: userId ? Number(userId) : null,
                    customerName,
                    email,
                    phone,
                    address,
                    totalAmount,
                    deliveryZone: zone.id,
                    deliveryFee,
                    status: "EN_ATTENTE",
                    paymentStatus: "PENDING",
                    paymentRef,
                    stockDeducted: false,
                    updatedAt: new Date(),
                    isReadByManager: true, // La notification admin arrivera au paiement, pas avant.
                    orderitem: {
                        create: itemsToCreate
                    }
                },
                include: {
                    orderitem: true
                }
            });
        });

        // On renvoie la référence publique : le client est ensuite redirigé vers /paiement/[paymentRef].
        return NextResponse.json(
            {
                message: "Commande créée. Passez au paiement.",
                orderId: newOrder.id,
                paymentRef: newOrder.paymentRef,
                totalAmount: newOrder.totalAmount,
            },
            { status: 201 }
        );

    } catch (error: any) {
        console.error("Erreur lors de la création de la commande :", error);
        return NextResponse.json(
            { error: error.message || "Une erreur interne est survenue lors de la validation de la commande." },
            { status: 500 }
        );
    }
}
