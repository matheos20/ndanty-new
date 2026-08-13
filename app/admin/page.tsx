// app/admin/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ClipboardList, Users, Box, TrendingUp, AlertTriangle, PackageX } from 'lucide-react';
import AddQuoteModal from '@/components/admin/AddQuoteModal';

// Seuil d'alerte "stock faible" (produits à réapprovisionner)
const LOW_STOCK_THRESHOLD = 5;

export default async function AdminDashboard() {
    // 1. Récupération des vraies données dynamiques en temps réel depuis MySQL
    const [totalUsers, totalQuotes, totalProducts, revenueAgg, lowStockProducts] = await Promise.all([
        prisma.user.count(),
        prisma.quote.count(),
        prisma.product.count(),
        // Chiffre d'affaires réel : somme des commandes RÉGLÉES (paiement validé ou à la livraison)
        prisma.order.aggregate({
            _sum: { totalAmount: true },
            where: { paymentStatus: { in: ["PAID", "A_LA_LIVRAISON"] } },
        }),
        // Produits en stock faible ou en rupture (alerte de réapprovisionnement)
        prisma.product.findMany({
            where: { stock: { lte: LOW_STOCK_THRESHOLD } },
            orderBy: { stock: "asc" },
            select: { id: true, name: true, stock: true, category: true },
        }),
    ]);

    const totalRevenue = revenueAgg._sum.totalAmount ?? 0;

    // 2. Statistiques réelles
    const stats = [
        { label: 'Devis Totaux', value: totalQuotes.toString(), icon: <ClipboardList />, color: 'bg-blue-500' },
        { label: 'Nouveaux Clients', value: totalUsers.toString(), icon: <Users />, color: 'bg-[#28a745]' },
        { label: 'Produits Actifs', value: totalProducts.toString(), icon: <Box />, color: 'bg-orange-500' },
        { label: "Chiffre d'affaires", value: `${totalRevenue.toLocaleString('fr-FR')} Ar`, icon: <TrendingUp />, color: 'bg-purple-500' },
    ];

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header du Dashboard avec le bouton d'ajout */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#2c3e50]">Tableau de Bord</h2>
                    <p className="text-sm text-gray-500">Bienvenue sur votre espace de gestion Ndanty.</p>
                </div>

                {/* --- LE BOUTON D'INSERTION RAPIDE --- */}
                <AddQuoteModal />
            </div>

            {/* Grille de Statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl text-white ${stat.color} shadow-lg shadow-opacity-20`}>
                                {stat.icon}
                            </div>
                        </div>
                        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{stat.label}</p>
                        <h3 className="text-3xl font-bold text-[#2c3e50] mt-1">{stat.value}</h3>
                    </div>
                ))}
            </div>

            {/* Alerte Stock Faible */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[#2c3e50] flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-500" />
                        Alertes de stock
                    </h3>
                    <Link href="/admin/products" className="text-xs font-bold text-[#28a745] hover:underline">
                        Gérer les produits →
                    </Link>
                </div>

                {lowStockProducts.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <Box size={28} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-sm font-medium">Tous les stocks sont sains (au-dessus de {LOW_STOCK_THRESHOLD} unités).</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <p className="text-xs text-gray-400 mb-3">
                            {lowStockProducts.length} produit(s) à réapprovisionner (seuil : {LOW_STOCK_THRESHOLD}).
                        </p>
                        {lowStockProducts.map((p) => {
                            const isOut = p.stock <= 0;
                            return (
                                <div
                                    key={p.id}
                                    className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 border ${isOut ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"}`}
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-[#2c3e50] truncate">{p.name}</p>
                                        <p className="text-[11px] text-gray-400">{p.category}</p>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full whitespace-nowrap ${isOut ? "bg-red-600 text-white" : "bg-amber-500 text-white"}`}>
                                        {isOut ? <><PackageX size={12} /> Rupture</> : <><AlertTriangle size={12} /> {p.stock} restant{p.stock > 1 ? "s" : ""}</>}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}