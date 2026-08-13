// lib/analytics.ts
// Couche d'agrégation du tableau de bord administrateur (Projet FANAKA).
// Toutes les statistiques du back-office sont calculées ICI, à partir de MySQL,
// afin que la page /admin reste un simple composant de présentation.

import { prisma } from "@/lib/prisma";
import { normalizeStatus, type OrderStatusKey } from "@/lib/order-status";

/** Seuil d'alerte « stock faible » (produits à réapprovisionner). */
export const LOW_STOCK_THRESHOLD = 5;

// ─── Périodes d'analyse ──────────────────────────────────────────────────────

export type RangeKey = "7j" | "30j" | "12m";

export interface RangeDef {
    key: RangeKey;
    /** Libellé long, utilisé dans les sous-titres. */
    label: string;
    /** Libellé court, utilisé dans le sélecteur. */
    short: string;
    /** Libellé de la période de comparaison (affiché sous les variations). */
    comparison: string;
}

export const RANGES: RangeDef[] = [
    { key: "7j", label: "7 derniers jours", short: "7 jours", comparison: "vs 7 jours précédents" },
    { key: "30j", label: "30 derniers jours", short: "30 jours", comparison: "vs 30 jours précédents" },
    { key: "12m", label: "12 derniers mois", short: "12 mois", comparison: "vs 12 mois précédents" },
];

/** Sécurise le paramètre d'URL `?periode=` (valeur par défaut : 30 jours). */
export function parseRange(raw?: string | null): RangeKey {
    return RANGES.some((r) => r.key === raw) ? (raw as RangeKey) : "30j";
}

export function getRangeDef(key: RangeKey): RangeDef {
    return RANGES.find((r) => r.key === key)!;
}

// ─── Utilitaires de dates (heure locale du serveur) ──────────────────────────

function startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}
function addDays(d: Date, n: number): Date {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
}
function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number): Date {
    return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
/** Clé de regroupement locale (jamais toISOString : le fuseau décalerait le jour). */
function dayKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function monthKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface Bucket {
    key: string;
    /** Libellé court porté par l'axe des abscisses. */
    label: string;
    /** Libellé complet affiché dans l'infobulle. */
    fullLabel: string;
}

interface AnalyticsWindow {
    buckets: Bucket[];
    /** Début de la période analysée. */
    start: Date;
    /** Début de la période de comparaison (de même longueur, juste avant). */
    prevStart: Date;
    granularity: "day" | "month";
}

function buildWindow(range: RangeKey): AnalyticsWindow {
    const now = new Date();

    if (range === "12m") {
        const first = addMonths(startOfMonth(now), -11);
        const buckets = Array.from({ length: 12 }, (_, i) => {
            const start = addMonths(first, i);
            return {
                key: monthKey(start),
                label: start.toLocaleDateString("fr-FR", { month: "short" }),
                fullLabel: start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
            };
        });
        return { buckets, start: first, prevStart: addMonths(first, -12), granularity: "month" };
    }

    const days = range === "7j" ? 7 : 30;
    const first = addDays(startOfDay(now), -(days - 1));
    const buckets = Array.from({ length: days }, (_, i) => {
        const start = addDays(first, i);
        return {
            key: dayKey(start),
            label: start.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
            fullLabel: start.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
        };
    });
    return { buckets, start: first, prevStart: addDays(first, -days), granularity: "day" };
}

// ─── Règles métier ───────────────────────────────────────────────────────────

/** Statuts de paiement considérés comme « encaissables ». */
const SETTLED_PAYMENTS = new Set(["PAID", "A_LA_LIVRAISON"]);

/** Étapes du pipeline correspondant à une commande encore en cours de traitement. */
const ACTIVE_STEPS: OrderStatusKey[] = ["EN_ATTENTE", "EN_PREPARATION", "EXPEDIEE"];

/** Libellés d'affichage des moyens de paiement. */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
    MONEGASY: "Monegasy",
    VISA: "Visa",
    MASTERCARD: "Mastercard",
    PAYPAL: "PayPal",
    COD: "À la livraison",
};

/** Ordre d'affichage figé : la couleur suit le moyen de paiement, jamais son rang. */
export const PAYMENT_METHOD_ORDER = ["MONEGASY", "VISA", "MASTERCARD", "PAYPAL", "COD"];

interface RevenueOrder {
    createdAt: Date;
    totalAmount: number;
    paymentStatus: string | null;
    paymentMethod: string | null;
    status: string;
    orderitem: {
        name: string;
        price: number;
        quantity: number;
        product: { category: string } | null;
    }[];
}

/** Une commande alimente le chiffre d'affaires si elle est réglée ET non annulée. */
function countsAsRevenue(o: { paymentStatus: string | null; status: string }): boolean {
    return (
        SETTLED_PAYMENTS.has((o.paymentStatus || "").toUpperCase()) &&
        normalizeStatus(o.status) !== "ANNULEE"
    );
}

/** Variation en pourcentage ; `null` lorsque la période précédente est vide (pas de base de comparaison). */
function variation(current: number, previous: number): number | null {
    if (previous <= 0) return null;
    return ((current - previous) / previous) * 100;
}

// ─── Types exposés à la page ─────────────────────────────────────────────────

export interface SeriesPoint {
    label: string;
    fullLabel: string;
    revenue: number;
    orders: number;
}

export interface RankedItem {
    name: string;
    value: number;
    /** Information secondaire (quantité vendue, nombre de commandes...). */
    detail: string;
}

export interface SplitItem {
    key: string;
    label: string;
    value: number;
    count: number;
}

export interface DashboardData {
    range: RangeKey;
    series: SeriesPoint[];
    kpi: {
        revenue: number;
        revenueDelta: number | null;
        orders: number;
        ordersDelta: number | null;
        averageBasket: number;
        averageBasketDelta: number | null;
        newCustomers: number;
        newCustomersDelta: number | null;
    };
    pipeline: { key: OrderStatusKey; label: string; count: number }[];
    activeOrders: number;
    topProducts: RankedItem[];
    categories: RankedItem[];
    paymentSplit: SplitItem[];
    quotes: { total: number; accepted: number; refused: number; pending: number; conversion: number };
    lowStock: { id: number; name: string; stock: number; category: string }[];
    totals: { products: number; customers: number };
}

// ─── Agrégation principale ───────────────────────────────────────────────────

export async function getDashboardData(range: RangeKey): Promise<DashboardData> {
    const { buckets, start, prevStart, granularity } = buildWindow(range);

    const [orders, quotes, statusGroups, lowStock, totalProducts, totalCustomers, prevCustomers, newCustomers] =
        await Promise.all([
            // Commandes de la période analysée ET de la période de comparaison, en une seule requête.
            prisma.order.findMany({
                where: { createdAt: { gte: prevStart } },
                select: {
                    createdAt: true,
                    totalAmount: true,
                    paymentStatus: true,
                    paymentMethod: true,
                    status: true,
                    orderitem: {
                        select: {
                            name: true,
                            price: true,
                            quantity: true,
                            product: { select: { category: true } },
                        },
                    },
                },
            }),
            prisma.quote.findMany({
                where: { createdAt: { gte: start } },
                select: { clientDecision: true },
            }),
            // Répartition du pipeline sur l'ensemble du carnet (charge de travail réelle).
            prisma.order.groupBy({
                by: ["status", "paymentStatus"],
                _count: { _all: true },
            }),
            prisma.product.findMany({
                where: { stock: { lte: LOW_STOCK_THRESHOLD } },
                orderBy: { stock: "asc" },
                select: { id: true, name: true, stock: true, category: true },
            }),
            prisma.product.count(),
            prisma.user.count({ where: { role: { not: "ADMIN" } } }),
            prisma.user.count({ where: { role: { not: "ADMIN" }, createdAt: { gte: prevStart, lt: start } } }),
            prisma.user.count({ where: { role: { not: "ADMIN" }, createdAt: { gte: start } } }),
        ]);

    const revenueOrders = (orders as RevenueOrder[]).filter(countsAsRevenue);
    const current = revenueOrders.filter((o) => o.createdAt >= start);
    const previous = revenueOrders.filter((o) => o.createdAt < start);

    // 1. Série temporelle (chiffre d'affaires + nombre de commandes par intervalle)
    const byBucket = new Map<string, { revenue: number; orders: number }>();
    for (const b of buckets) byBucket.set(b.key, { revenue: 0, orders: 0 });
    for (const o of current) {
        const key = granularity === "month" ? monthKey(o.createdAt) : dayKey(o.createdAt);
        const slot = byBucket.get(key);
        if (!slot) continue; // commande hors fenêtre (sécurité)
        slot.revenue += o.totalAmount;
        slot.orders += 1;
    }
    const series: SeriesPoint[] = buckets.map((b) => ({
        label: b.label,
        fullLabel: b.fullLabel,
        revenue: Math.round(byBucket.get(b.key)!.revenue),
        orders: byBucket.get(b.key)!.orders,
    }));

    // 2. Indicateurs clés + variations
    const revenue = current.reduce((s, o) => s + o.totalAmount, 0);
    const prevRevenue = previous.reduce((s, o) => s + o.totalAmount, 0);
    const basket = current.length ? revenue / current.length : 0;
    const prevBasket = previous.length ? prevRevenue / previous.length : 0;

    // 3. Pipeline de traitement (commandes réglées uniquement : le vrai travail à faire)
    const pipelineCounts = new Map<OrderStatusKey, number>();
    for (const g of statusGroups) {
        if (!SETTLED_PAYMENTS.has((g.paymentStatus || "").toUpperCase())) continue;
        const key = normalizeStatus(g.status);
        pipelineCounts.set(key, (pipelineCounts.get(key) || 0) + g._count._all);
    }
    const pipeline = ACTIVE_STEPS.map((key) => ({
        key,
        label: key === "EN_ATTENTE" ? "En attente" : key === "EN_PREPARATION" ? "En préparation" : "Expédiées",
        count: pipelineCounts.get(key) || 0,
    }));
    const activeOrders = pipeline.reduce((s, p) => s + p.count, 0);

    // 4. Meilleures ventes et répartition par catégorie (sur la période, commandes réglées)
    const productAgg = new Map<string, { revenue: number; qty: number }>();
    const categoryAgg = new Map<string, { revenue: number; qty: number }>();
    for (const o of current) {
        for (const item of o.orderitem) {
            const line = item.price * item.quantity;

            const p = productAgg.get(item.name) || { revenue: 0, qty: 0 };
            p.revenue += line;
            p.qty += item.quantity;
            productAgg.set(item.name, p);

            const catName = item.product?.category || "Non catégorisé";
            const c = categoryAgg.get(catName) || { revenue: 0, qty: 0 };
            c.revenue += line;
            c.qty += item.quantity;
            categoryAgg.set(catName, c);
        }
    }
    const topProducts: RankedItem[] = [...productAgg.entries()]
        .map(([name, v]) => ({ name, value: Math.round(v.revenue), detail: `${v.qty} vendu${v.qty > 1 ? "s" : ""}` }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    const categoryTotal = [...categoryAgg.values()].reduce((s, c) => s + c.revenue, 0);
    const categories: RankedItem[] = [...categoryAgg.entries()]
        .map(([name, v]) => ({
            name,
            value: Math.round(v.revenue),
            detail: categoryTotal > 0 ? `${Math.round((v.revenue / categoryTotal) * 100)} % du CA` : "—",
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

    // 5. Répartition des encaissements par passerelle
    const methodAgg = new Map<string, { value: number; count: number }>();
    for (const o of current) {
        const key = (o.paymentMethod || "COD").toUpperCase();
        const m = methodAgg.get(key) || { value: 0, count: 0 };
        m.value += o.totalAmount;
        m.count += 1;
        methodAgg.set(key, m);
    }
    const paymentSplit: SplitItem[] = PAYMENT_METHOD_ORDER.filter((k) => methodAgg.has(k))
        .map((key) => ({
            key,
            label: PAYMENT_METHOD_LABELS[key] || key,
            value: Math.round(methodAgg.get(key)!.value),
            count: methodAgg.get(key)!.count,
        }))
        // Les moyens inconnus (données historiques) sont conservés en fin de liste.
        .concat(
            [...methodAgg.entries()]
                .filter(([k]) => !PAYMENT_METHOD_ORDER.includes(k))
                .map(([key, v]) => ({ key, label: PAYMENT_METHOD_LABELS[key] || key, value: Math.round(v.value), count: v.count }))
        );

    // 6. Conversion des devis « sur mesure »
    const accepted = quotes.filter((q) => q.clientDecision === "ACCEPTE").length;
    const refused = quotes.filter((q) => q.clientDecision === "REFUSE").length;

    return {
        range,
        series,
        kpi: {
            revenue: Math.round(revenue),
            revenueDelta: variation(revenue, prevRevenue),
            orders: current.length,
            ordersDelta: variation(current.length, previous.length),
            averageBasket: Math.round(basket),
            averageBasketDelta: variation(basket, prevBasket),
            newCustomers,
            newCustomersDelta: variation(newCustomers, prevCustomers),
        },
        pipeline,
        activeOrders,
        topProducts,
        categories,
        paymentSplit,
        quotes: {
            total: quotes.length,
            accepted,
            refused,
            pending: quotes.length - accepted - refused,
            conversion: quotes.length ? (accepted / quotes.length) * 100 : 0,
        },
        lowStock,
        totals: { products: totalProducts, customers: totalCustomers },
    };
}
