// lib/invoice-pdf.tsx
// Génère un vrai fichier PDF de facture (côté serveur, sans navigateur) avec @react-pdf/renderer.
import React from "react";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { getDeliveryZone } from "@/lib/delivery";

const GREEN = "#28a745";
const DARK = "#2c3e50";
const GRAY = "#888888";

const METHOD_LABELS: Record<string, string> = {
    MONEGASY: "Monegasy", VISA: "Visa", MASTERCARD: "Mastercard", PAYPAL: "PayPal", COD: "Paiement à la livraison",
};

const fmt = (n: number) => n.toLocaleString("fr-FR");

const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 10, color: "#333", fontFamily: "Helvetica" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: GREEN, paddingBottom: 16, marginBottom: 20 },
    brand: { fontSize: 22, fontFamily: "Helvetica-Bold", color: DARK },
    brandGreen: { color: GREEN },
    sub: { fontSize: 8, color: GRAY, marginTop: 3 },
    docTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: DARK, textAlign: "right" },
    meta: { fontSize: 8, color: GRAY, textAlign: "right", marginTop: 3 },
    badge: { marginTop: 6, fontSize: 8, fontFamily: "Helvetica-Bold", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8, textAlign: "center" },
    cols: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
    col: { width: "48%" },
    label: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GRAY, marginBottom: 3, textTransform: "uppercase" },
    strong: { fontFamily: "Helvetica-Bold", color: DARK },
    tableHead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ddd", paddingBottom: 5, marginBottom: 4 },
    th: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GRAY, textTransform: "uppercase" },
    row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f2f2f2", paddingVertical: 5 },
    cName: { width: "50%" },
    cQty: { width: "15%", textAlign: "center" },
    cUnit: { width: "17%", textAlign: "right" },
    cTot: { width: "18%", textAlign: "right" },
    totals: { marginTop: 14, alignSelf: "flex-end", width: "45%" },
    totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4, color: GRAY },
    grandRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 2, borderTopColor: GREEN, paddingTop: 6, marginTop: 2 },
    grandLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: DARK, textTransform: "uppercase" },
    grandValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: GREEN },
    payNote: { fontSize: 8, color: GRAY, textAlign: "right", marginTop: 4 },
    footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#aaa", borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 10 },
});

export interface InvoiceData {
    id: number;
    customerName: string;
    email: string;
    phone: string;
    address: string;
    totalAmount: number;
    deliveryFee?: number | null;
    deliveryZone?: string | null;
    paymentStatus?: string | null;
    paymentMethod?: string | null;
    createdAt: Date;
    items: { name: string; price: number; quantity: number }[];
}

function InvoiceDocument({ order }: { order: InvoiceData }) {
    const deliveryFee = order.deliveryFee ?? 0;
    const subtotal = order.totalAmount - deliveryFee;
    const zone = getDeliveryZone(order.deliveryZone);
    const paid = (order.paymentStatus || "").toUpperCase() === "PAID";
    const methodLabel = order.paymentMethod ? METHOD_LABELS[order.paymentMethod] || order.paymentMethod : "—";
    const dateStr = new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* En-tête */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.brand}>Ndan<Text style={styles.brandGreen}>ty</Text></Text>
                        <Text style={styles.sub}>Mobilier & articles de maison — Madagascar</Text>
                    </View>
                    <View>
                        <Text style={styles.docTitle}>{paid ? "FACTURE" : "REÇU DE COMMANDE"}</Text>
                        <Text style={styles.meta}>N° CMD-{order.id}</Text>
                        <Text style={styles.meta}>Date : {dateStr}</Text>
                        <Text style={[styles.badge, paid ? { backgroundColor: "#d4f4dd", color: "#1a7a34" } : { backgroundColor: "#fdf0d5", color: "#b8860b" }]}>
                            {paid ? "PAYÉE" : "EN ATTENTE DE PAIEMENT"}
                        </Text>
                    </View>
                </View>

                {/* Coordonnées */}
                <View style={styles.cols}>
                    <View style={styles.col}>
                        <Text style={styles.label}>Facturé à</Text>
                        <Text style={styles.strong}>{order.customerName}</Text>
                        <Text>{order.email}</Text>
                        <Text>{order.phone}</Text>
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.label}>Livraison</Text>
                        <Text>{order.address}</Text>
                        {zone ? <Text>Zone : {zone.label}</Text> : null}
                    </View>
                </View>

                {/* Tableau */}
                <View style={styles.tableHead}>
                    <Text style={[styles.th, styles.cName]}>Article</Text>
                    <Text style={[styles.th, styles.cQty]}>Qté</Text>
                    <Text style={[styles.th, styles.cUnit]}>Prix unit.</Text>
                    <Text style={[styles.th, styles.cTot]}>Total</Text>
                </View>
                {order.items.map((it, i) => (
                    <View style={styles.row} key={i}>
                        <Text style={[styles.cName, styles.strong]}>{it.name}</Text>
                        <Text style={styles.cQty}>{it.quantity}</Text>
                        <Text style={styles.cUnit}>{fmt(it.price)} Ar</Text>
                        <Text style={[styles.cTot, styles.strong]}>{fmt(it.price * it.quantity)} Ar</Text>
                    </View>
                ))}

                {/* Totaux */}
                <View style={styles.totals}>
                    <View style={styles.totalRow}>
                        <Text>Sous-total produits</Text>
                        <Text>{fmt(subtotal)} Ar</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text>Frais de livraison</Text>
                        <Text>{fmt(deliveryFee)} Ar</Text>
                    </View>
                    <View style={styles.grandRow}>
                        <Text style={styles.grandLabel}>Total</Text>
                        <Text style={styles.grandValue}>{fmt(order.totalAmount)} Ar</Text>
                    </View>
                    <Text style={styles.payNote}>Mode de paiement : {methodLabel}</Text>
                </View>

                <Text style={styles.footer}>
                    Merci de votre confiance. — Ndanty · Antananarivo, Madagascar{"\n"}
                    Ce document tient lieu de {paid ? "facture" : "reçu de commande"} et a été généré automatiquement.
                </Text>
            </Page>
        </Document>
    );
}

/** Rend la facture en Buffer PDF prêt à être renvoyé en téléchargement. */
export async function renderInvoicePdf(order: InvoiceData): Promise<Buffer> {
    return renderToBuffer(<InvoiceDocument order={order} />);
}
