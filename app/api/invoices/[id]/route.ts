// app/api/invoices/[id]/route.ts
// Téléchargement DIRECT d'un vrai fichier PDF de facture (sans boîte d'impression navigateur).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { renderInvoicePdf } from "@/lib/invoice-pdf";

// @react-pdf/renderer nécessite le runtime Node (pas Edge).
export const runtime = "nodejs";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const orderId = parseInt(id);
        if (isNaN(orderId)) {
            return NextResponse.json({ message: "ID invalide" }, { status: 400 });
        }

        // 🔒 Authentification obligatoire
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { orderitem: true },
        });
        if (!order) {
            return NextResponse.json({ message: "Commande introuvable" }, { status: 404 });
        }

        // 🔒 Le client ne télécharge QUE sa propre facture ; l'admin, toutes.
        const isOwner = order.email === session.user.email;
        const isAdmin = (session.user as any).role === "ADMIN";
        if (!isOwner && !isAdmin) {
            return NextResponse.json({ message: "Accès refusé" }, { status: 403 });
        }

        const pdf = await renderInvoicePdf({
            id: order.id,
            customerName: order.customerName,
            email: order.email,
            phone: order.phone,
            address: order.address,
            totalAmount: order.totalAmount,
            deliveryFee: order.deliveryFee,
            deliveryZone: order.deliveryZone,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            createdAt: order.createdAt,
            items: order.orderitem.map((it) => ({ name: it.name, price: it.price, quantity: it.quantity })),
        });

        return new NextResponse(new Uint8Array(pdf), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="facture-CMD-${order.id}.pdf"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error: any) {
        console.error("Erreur génération PDF facture :", error);
        return NextResponse.json({ message: "Erreur lors de la génération du PDF", error: error.message }, { status: 500 });
    }
}
