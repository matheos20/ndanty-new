// app/api/orders/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/guards";
import { ORDER_STATUS_KEYS } from "@/lib/order-status";

// Statuts de commande autorisés (évite d'écrire n'importe quoi en base)
const ALLOWED_STATUSES: string[] = ORDER_STATUS_KEYS;

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 🔒 Sécurité : seul un administrateur peut modifier une commande.
        await requireAdmin();

        const resolvedParams = await params;
        const orderId = parseInt(resolvedParams.id);
        if (isNaN(orderId)) {
            return NextResponse.json({ message: "ID invalide" }, { status: 400 });
        }

        const body = await request.json();
        const { status, isReadByManager } = body;

        // Validation du statut s'il est fourni
        if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
            return NextResponse.json(
                { message: `Statut invalide. Valeurs autorisées : ${ALLOWED_STATUSES.join(", ")}` },
                { status: 400 }
            );
        }

        // On ne met à jour que les champs réellement fournis
        const data: { status?: string; isReadByManager?: boolean } = {};
        if (status !== undefined) data.status = status;
        if (isReadByManager !== undefined) data.isReadByManager = isReadByManager;
        if (Object.keys(data).length === 0) {
            return NextResponse.json({ message: "Aucune donnée à mettre à jour" }, { status: 400 });
        }

        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data,
        });

        return NextResponse.json(updatedOrder, { status: 200 });
    } catch (error: any) {
        if (error instanceof AuthError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        console.error("Erreur API Order:", error);
        return NextResponse.json({ message: "Erreur serveur", error: error.message }, { status: 500 });
    }
}
