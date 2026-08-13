// app/api/orders/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/guards";
import { ORDER_STATUS_KEYS, getStatusDef, type OrderStatusKey } from "@/lib/order-status";
import { recordAudit } from "@/lib/admin/audit";
import { changeOrderStatus } from "@/lib/orders/lifecycle";
import { sendOrderStatusEmail, type NotifiableStatus } from "@/lib/mailer";

// Statuts de commande autorisés (évite d'écrire n'importe quoi en base)
const ALLOWED_STATUSES: string[] = ORDER_STATUS_KEYS;

/** Étapes pour lesquelles le client est prévenu par email. */
const NOTIFIABLE: NotifiableStatus[] = ["EN_PREPARATION", "EXPEDIEE", "LIVREE"];

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 🔒 Sécurité : seul un administrateur peut modifier une commande.
        const session = await requireAdmin();

        const resolvedParams = await params;
        const orderId = parseInt(resolvedParams.id);
        if (isNaN(orderId)) {
            return NextResponse.json({ message: "ID invalide" }, { status: 400 });
        }

        const body = await request.json();
        const { status, isReadByManager, notify } = body;

        // Validation du statut s'il est fourni
        if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
            return NextResponse.json(
                { message: `Statut invalide. Valeurs autorisées : ${ALLOWED_STATUSES.join(", ")}` },
                { status: 400 }
            );
        }

        // L'annulation exige un motif et une décision sur le stock : elle ne passe
        // que par la Server Action dédiée du back-office, jamais par cette route.
        if (status === "ANNULEE") {
            return NextResponse.json(
                { message: "L'annulation d'une commande passe par l'action dédiée du back-office (motif, stock, remboursement)." },
                { status: 400 }
            );
        }

        if (status === undefined && isReadByManager === undefined) {
            return NextResponse.json({ message: "Aucune donnée à mettre à jour" }, { status: 400 });
        }

        // Simple accusé de lecture, sans changement d'étape.
        if (status === undefined) {
            const updated = await prisma.order.update({
                where: { id: orderId },
                data: { isReadByManager: Boolean(isReadByManager) },
            });
            return NextResponse.json(updated, { status: 200 });
        }

        // Changement d'étape : la règle métier vit dans lib/orders/lifecycle.ts.
        const result = await changeOrderStatus(orderId, status as OrderStatusKey, {
            markRead: isReadByManager === undefined ? undefined : Boolean(isReadByManager),
        });

        // Notification client (activée par défaut, désactivable avec `notify: false`).
        if (notify !== false && result.changed && NOTIFIABLE.includes(status as NotifiableStatus)) {
            await sendOrderStatusEmail(result.order, status as NotifiableStatus);
        }

        if (result.changed) {
            await recordAudit({
                action: "order.status",
                entity: "order",
                entityId: orderId,
                label: `CMD #${orderId} — ${result.order.customerName}`,
                summary: `Suivi : ${getStatusDef(result.previousStatus).label} → ${getStatusDef(status).label}`,
                metadata: { from: result.previousStatus, to: status, via: "api" },
                actorEmail: session?.user?.email,
            });
        }

        return NextResponse.json({ ...result.order, status }, { status: 200 });
    } catch (error: any) {
        if (error instanceof AuthError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        console.error("Erreur API Order:", error);
        return NextResponse.json({ message: "Erreur serveur", error: error.message }, { status: 500 });
    }
}
