// app/dashboard/factures/[id]/page.tsx
// Facture / reçu imprimable (téléchargeable en PDF via l'impression navigateur).
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getDeliveryZone } from "@/lib/delivery";
import InvoiceActions from "@/components/dashboard/InvoiceActions";

export const dynamic = "force-dynamic";

const METHOD_LABELS: Record<string, string> = {
    MONEGASY: "Monegasy", VISA: "Visa", MASTERCARD: "Mastercard", PAYPAL: "PayPal", COD: "Paiement à la livraison",
};

function fmt(n: number) {
    return n.toLocaleString("fr-FR");
}

export default async function InvoicePage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ print?: string }>;
}) {
    const { id } = await params;
    const { print } = await searchParams;
    const orderId = parseInt(id);
    if (isNaN(orderId)) notFound();

    // 🔒 Authentification obligatoire
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        redirect("/auth-client");
    }

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { orderitem: true },
    });
    if (!order) notFound();

    // 🔒 Contrôle d'accès : le client ne voit QUE sa propre facture (l'admin voit tout).
    const isOwner = order.email === session.user.email;
    const isAdmin = (session.user as any).role === "ADMIN";
    if (!isOwner && !isAdmin) {
        notFound();
    }

    const deliveryFee = order.deliveryFee ?? 0;
    const subtotal = order.totalAmount - deliveryFee;
    const zone = getDeliveryZone(order.deliveryZone);
    const paid = (order.paymentStatus || "").toUpperCase() === "PAID";
    const methodLabel = order.paymentMethod ? METHOD_LABELS[order.paymentMethod] || order.paymentMethod : "—";
    const dateStr = new Date(order.createdAt).toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric",
    });

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:py-0 font-sans text-gray-900">
            <div className="max-w-3xl mx-auto">
                <InvoiceActions autoPrint={print === "1"} />

                {/* Feuille A4 */}
                <div className="invoice-sheet bg-white rounded-2xl shadow-sm border border-gray-100 p-10 print:shadow-none print:border-0 print:rounded-none print:p-0">
                    {/* En-tête */}
                    <div className="flex justify-between items-start border-b-2 border-[#28a745] pb-6 mb-8">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-extrabold tracking-tighter">
                                    Ndan<span className="text-[#28a745]">ty</span>
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Mobilier & articles de maison — Madagascar</p>
                        </div>
                        <div className="text-right">
                            <h1 className="text-lg font-black uppercase tracking-widest text-[#2c3e50]">
                                {paid ? "Facture" : "Reçu de commande"}
                            </h1>
                            <p className="text-xs text-gray-500 mt-1 font-mono">N° CMD-{order.id}</p>
                            <p className="text-xs text-gray-500">Date : {dateStr}</p>
                            <span className={`inline-block mt-2 px-3 py-1 text-[10px] font-bold rounded-full ${paid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                {paid ? "PAYÉE" : "EN ATTENTE DE PAIEMENT"}
                            </span>
                        </div>
                    </div>

                    {/* Coordonnées client */}
                    <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Facturé à</p>
                            <p className="font-bold text-[#2c3e50]">{order.customerName}</p>
                            <p className="text-gray-500 text-xs">{order.email}</p>
                            <p className="text-gray-500 text-xs">{order.phone}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Livraison</p>
                            <p className="text-gray-600 text-xs">{order.address}</p>
                            {zone && <p className="text-gray-500 text-xs mt-1">Zone : {zone.label}</p>}
                        </div>
                    </div>

                    {/* Tableau des articles */}
                    <table className="w-full text-sm mb-6">
                        <thead>
                            <tr className="border-b border-gray-200 text-left text-[10px] uppercase tracking-widest text-gray-400">
                                <th className="py-2">Article</th>
                                <th className="py-2 text-center">Qté</th>
                                <th className="py-2 text-right">Prix unit.</th>
                                <th className="py-2 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.orderitem.map((it) => (
                                <tr key={it.id} className="border-b border-gray-50">
                                    <td className="py-2 font-medium text-[#2c3e50]">{it.name}</td>
                                    <td className="py-2 text-center text-gray-500">{it.quantity}</td>
                                    <td className="py-2 text-right text-gray-500">{fmt(it.price)} Ar</td>
                                    <td className="py-2 text-right font-bold text-[#2c3e50]">{fmt(it.price * it.quantity)} Ar</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totaux */}
                    <div className="flex justify-end">
                        <div className="w-full max-w-xs space-y-2 text-sm">
                            <div className="flex justify-between text-gray-500">
                                <span>Sous-total produits</span>
                                <span>{fmt(subtotal)} Ar</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                                <span>Frais de livraison</span>
                                <span>{fmt(deliveryFee)} Ar</span>
                            </div>
                            <div className="flex justify-between border-t-2 border-[#28a745] pt-2 mt-1">
                                <span className="font-black uppercase text-xs tracking-widest text-[#2c3e50]">Total</span>
                                <span className="font-black text-lg text-[#28a745]">{fmt(order.totalAmount)} Ar</span>
                            </div>
                            <p className="text-[10px] text-gray-400 text-right">Mode de paiement : {methodLabel}</p>
                        </div>
                    </div>

                    {/* Pied de page */}
                    <div className="mt-10 pt-6 border-t border-gray-100 text-center text-[10px] text-gray-400">
                        Merci de votre confiance. — Ndanty · Antananarivo, Madagascar
                        <br />Ce document tient lieu de {paid ? "facture" : "reçu de commande"} et a été généré automatiquement.
                    </div>
                </div>
            </div>
        </div>
    );
}
