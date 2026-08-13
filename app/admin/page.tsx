// app/admin/page.tsx
// Tableau de bord analytique du back-office Ndanty.
// Les chiffres proviennent tous de lib/analytics.ts (agrégation MySQL/Prisma) :
// cette page ne fait que composer les tuiles et les graphiques.

import Link from 'next/link';
import {
    AlertTriangle,
    Box,
    ClipboardList,
    PackageX,
    ShoppingBag,
    TrendingUp,
    Truck,
    Users,
    Wallet,
} from 'lucide-react';
import AddQuoteModal from '@/components/admin/AddQuoteModal';
import PeriodFilter from '@/components/admin/charts/PeriodFilter';
import StatTile from '@/components/admin/charts/StatTile';
import RevenueChart from '@/components/admin/charts/RevenueChart';
import RankedBars from '@/components/admin/charts/RankedBars';
import PaymentSplit from '@/components/admin/charts/PaymentSplit';
import ConversionMeter from '@/components/admin/charts/ConversionMeter';
import { ar, nf } from '@/components/admin/charts/viz';
import { LOW_STOCK_THRESHOLD, getDashboardData, getRangeDef, parseRange } from '@/lib/analytics';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Rampe ordinale (une seule teinte, luminosité décroissante) : l'ordre du
 *  pipeline se lit dans la couleur. Validée : ΔL suffisant, extrémité claire à 2,12:1. */
const PIPELINE_RAMP = ['#6ac492', '#38a566', '#1e7e34'];

interface PageProps {
    searchParams: Promise<{ periode?: string }>;
}

export default async function AdminDashboard({ searchParams }: PageProps) {
    const params = await searchParams;
    const range = parseRange(params.periode);
    const rangeDef = getRangeDef(range);
    const data = await getDashboardData(range);

    const { kpi, pipeline, activeOrders, lowStock } = data;
    const pipelineMax = Math.max(...pipeline.map((p) => p.count), 1);

    return (
        <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">

            {/* EN-TÊTE : titre, période analysée, insertion rapide */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-[#2c3e50]">Tableau de Bord</h2>
                    <p className="text-xs text-gray-400 mt-0.5 font-semibold">
                        Performance commerciale Ndanty · {rangeDef.label}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <PeriodFilter active={range} />
                    <AddQuoteModal />
                </div>
            </div>

            {/* INDICATEURS CLÉS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                <StatTile
                    label="Chiffre d'affaires"
                    value={ar(kpi.revenue)}
                    change={kpi.revenueDelta}
                    comparison={rangeDef.comparison}
                    icon={<TrendingUp size={20} />}
                    accent="bg-[#28a745]"
                    hero
                />
                <StatTile
                    label="Commandes réglées"
                    value={nf(kpi.orders)}
                    change={kpi.ordersDelta}
                    comparison={rangeDef.comparison}
                    icon={<ShoppingBag size={20} />}
                    accent="bg-[#2c3e50]"
                />
                <StatTile
                    label="Panier moyen"
                    value={ar(kpi.averageBasket)}
                    change={kpi.averageBasketDelta}
                    comparison={rangeDef.comparison}
                    icon={<Wallet size={20} />}
                    accent="bg-[#2a78d6]"
                />
                <StatTile
                    label="Nouveaux clients"
                    value={nf(kpi.newCustomers)}
                    change={kpi.newCustomersDelta}
                    comparison={rangeDef.comparison}
                    icon={<Users size={20} />}
                    accent="bg-[#4a3aa7]"
                />
            </div>

            {/* COURBE PRINCIPALE + RÉPARTITION DES ENCAISSEMENTS */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                    <RevenueChart points={data.series} rangeLabel={rangeDef.label} />
                </div>
                <PaymentSplit slices={data.paymentSplit} rangeLabel={rangeDef.label} />
            </div>

            {/* CLASSEMENTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RankedBars
                    title="Meilleures ventes"
                    subtitle={`Top 5 des produits · ${rangeDef.label}`}
                    icon={<TrendingUp size={16} />}
                    items={data.topProducts}
                    emptyLabel="Aucune vente réglée sur cette période"
                    action={{ label: 'Produits', href: '/admin/products' }}
                />
                <RankedBars
                    title="Ventes par catégorie"
                    subtitle={`Arborescence du catalogue · ${rangeDef.label}`}
                    icon={<Box size={16} />}
                    items={data.categories}
                    emptyLabel="Aucune vente réglée sur cette période"
                    action={{ label: 'Catégories', href: '/admin/categories' }}
                />
            </div>

            {/* OPÉRATIONS : pipeline, devis, stocks */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Commandes en cours de traitement */}
                <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 flex flex-col">
                    <div className="flex items-start justify-between gap-4 mb-5">
                        <div>
                            <h3 className="text-base font-black text-[#2c3e50] flex items-center gap-2">
                                <Truck size={16} className="text-[#28a745]" />
                                Commandes actives
                            </h3>
                            <p className="text-[11px] font-semibold text-gray-400 mt-0.5">
                                {nf(activeOrders)} commande{activeOrders > 1 ? 's' : ''} à traiter
                            </p>
                        </div>
                        <Link href="/admin/orders" className="text-[10px] font-black uppercase tracking-wider text-[#28a745] hover:text-[#2c3e50] transition-colors whitespace-nowrap">
                            Traiter →
                        </Link>
                    </div>

                    {activeOrders === 0 ? (
                        <div className="flex-1 flex items-center justify-center py-10">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-300 text-center">
                                Toutes les commandes réglées sont livrées
                            </p>
                        </div>
                    ) : (
                        <ol className="space-y-4">
                            {pipeline.map((stage, index) => (
                                <li key={stage.key}>
                                    <div className="flex items-baseline justify-between gap-3 mb-1.5">
                                        <span className="flex items-center gap-2 text-xs font-bold text-[#2c3e50]">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIPELINE_RAMP[index] }} />
                                            {stage.label}
                                        </span>
                                        <span className="text-xs font-black text-[#2c3e50] tabular-nums">{nf(stage.count)}</span>
                                    </div>
                                    <div className="h-2.5 rounded-full bg-[#f1f3f5] overflow-hidden">
                                        <div
                                            className="h-full rounded-r-[4px] transition-all duration-500"
                                            style={{
                                                width: `${Math.max((stage.count / pipelineMax) * 100, stage.count > 0 ? 3 : 0)}%`,
                                                backgroundColor: PIPELINE_RAMP[index],
                                            }}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>

                {/* Conversion des devis sur mesure */}
                <ConversionMeter
                    total={data.quotes.total}
                    accepted={data.quotes.accepted}
                    refused={data.quotes.refused}
                    pending={data.quotes.pending}
                    conversion={data.quotes.conversion}
                    rangeLabel={rangeDef.label}
                />

                {/* Alertes de réapprovisionnement */}
                <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 flex flex-col">
                    <div className="flex items-start justify-between gap-4 mb-5">
                        <div>
                            <h3 className="text-base font-black text-[#2c3e50] flex items-center gap-2">
                                <AlertTriangle size={16} className="text-amber-500" />
                                Alertes de stock
                            </h3>
                            <p className="text-[11px] font-semibold text-gray-400 mt-0.5">
                                Seuil : {LOW_STOCK_THRESHOLD} unités · {data.totals.products} produits au catalogue
                            </p>
                        </div>
                        <Link href="/admin/products" className="text-[10px] font-black uppercase tracking-wider text-[#28a745] hover:text-[#2c3e50] transition-colors whitespace-nowrap">
                            Gérer →
                        </Link>
                    </div>

                    {lowStock.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                            <Box size={26} className="text-gray-200 mb-2" />
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-300">
                                Tous les stocks sont sains
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[268px] overflow-y-auto pr-1">
                            {lowStock.map((product) => {
                                const isOut = product.stock <= 0;
                                return (
                                    <div
                                        key={product.id}
                                        className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 border ${
                                            isOut ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-[#2c3e50] truncate">{product.name}</p>
                                            <p className="text-[10px] font-semibold text-gray-400 truncate">{product.category}</p>
                                        </div>
                                        <span
                                            className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-full whitespace-nowrap ${
                                                isOut ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                                            }`}
                                        >
                                            {isOut ? (
                                                <>
                                                    <PackageX size={12} /> Rupture
                                                </>
                                            ) : (
                                                <>
                                                    <AlertTriangle size={12} /> {product.stock} restant{product.stock > 1 ? 's' : ''}
                                                </>
                                            )}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            {/* SYNTHÈSE DU CARNET (chiffres de référence, hors période) */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Produits au catalogue', value: nf(data.totals.products), icon: <Box size={14} />, href: '/admin/products' },
                        { label: 'Clients enregistrés', value: nf(data.totals.customers), icon: <Users size={14} />, href: '/admin/users' },
                        { label: 'Devis sur la période', value: nf(data.quotes.total), icon: <ClipboardList size={14} />, href: '/admin/quotes' },
                        { label: 'Commandes actives', value: nf(activeOrders), icon: <ShoppingBag size={14} />, href: '/admin/orders' },
                    ].map((cell) => (
                        <Link
                            key={cell.label}
                            href={cell.href}
                            className="flex items-center gap-3 rounded-2xl px-3 py-2 -mx-3 hover:bg-gray-50 transition-colors"
                        >
                            <span className="p-2 rounded-xl bg-green-50 text-[#28a745] shrink-0">{cell.icon}</span>
                            <span className="min-w-0">
                                <span className="block text-lg font-black text-[#2c3e50] leading-tight">{cell.value}</span>
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 truncate">{cell.label}</span>
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
