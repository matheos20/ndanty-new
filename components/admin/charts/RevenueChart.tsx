'use client';

import { useMemo, useState } from 'react';
import { TrendingUp, ShoppingBag } from 'lucide-react';
import { VIZ, ar, compact, nf, niceMax } from './viz';
import { useMeasure } from './useMeasure';

interface Point {
    label: string;
    fullLabel: string;
    revenue: number;
    orders: number;
}

type Metric = 'revenue' | 'orders';

const HEIGHT = 300;
const PAD = { top: 26, right: 24, bottom: 30, left: 62 };
const TICKS = 4;

/** Plafond entier divisible par 4 : les graduations restent des nombres entiers. */
function niceIntMax(value: number): number {
    return Math.max(4, Math.ceil(value / 4) * 4);
}

export default function RevenueChart({ points, rangeLabel }: { points: Point[]; rangeLabel: string }) {
    const [metric, setMetric] = useState<Metric>('revenue');
    const [hover, setHover] = useState<number | null>(null);
    const { ref, width } = useMeasure<HTMLDivElement>();

    const values = useMemo(() => points.map((p) => (metric === 'revenue' ? p.revenue : p.orders)), [points, metric]);
    const total = values.reduce((s, v) => s + v, 0);
    const peakIndex = values.reduce((best, v, i) => (v > values[best] ? i : best), 0);
    const hasPoints = points.length > 0;

    const max = Math.max(...values, 0);
    const yMax = metric === 'revenue' ? niceMax(max) : niceIntMax(max);

    const plotWidth = Math.max(width - PAD.left - PAD.right, 10);
    const plotHeight = HEIGHT - PAD.top - PAD.bottom;
    const step = points.length > 1 ? plotWidth / (points.length - 1) : 0;

    const x = (i: number) => PAD.left + (points.length > 1 ? i * step : plotWidth / 2);
    const y = (v: number) => PAD.top + plotHeight - (v / yMax) * plotHeight;

    const linePath = points.map((_, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(2)} ${y(values[i]).toFixed(2)}`).join(' ');
    const areaPath = width
        ? `${linePath} L ${x(points.length - 1).toFixed(2)} ${(PAD.top + plotHeight).toFixed(2)} L ${x(0).toFixed(2)} ${(PAD.top + plotHeight).toFixed(2)} Z`
        : '';

    // Une étiquette d'abscisse sur N pour éviter tout chevauchement.
    const labelEvery = Math.max(1, Math.ceil(points.length / (width > 720 ? 10 : 6)));

    const format = (v: number) => (metric === 'revenue' ? ar(v) : `${nf(v)} commande${v > 1 ? 's' : ''}`);
    const active = hover ?? null;

    const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
        if (!step && points.length > 1) return;
        const box = event.currentTarget.getBoundingClientRect();
        const local = event.clientX - box.left - PAD.left;
        const index = points.length > 1 ? Math.round(local / step) : 0;
        setHover(Math.min(points.length - 1, Math.max(0, index)));
    };

    return (
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6">
            {/* En-tête : titre + bascule d'indicateur (un seul axe à la fois) */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                <div>
                    <h3 className="text-base font-black text-[#2c3e50]">
                        {metric === 'revenue' ? "Évolution du chiffre d'affaires" : 'Évolution des commandes'}
                    </h3>
                    <p className="text-[11px] font-semibold text-gray-400 mt-0.5">
                        Commandes réglées · {rangeLabel} ·{' '}
                        <span className="text-[#28a745]">
                            {metric === 'revenue' ? ar(total) : `${nf(total)} commande${total > 1 ? 's' : ''}`} au total
                        </span>
                    </p>
                </div>

                <div className="inline-flex bg-gray-50 border border-gray-100 rounded-full p-1 self-start">
                    {([
                        { key: 'revenue', label: "Chiffre d'affaires", icon: <TrendingUp size={12} /> },
                        { key: 'orders', label: 'Commandes', icon: <ShoppingBag size={12} /> },
                    ] as { key: Metric; label: string; icon: React.ReactNode }[]).map((option) => (
                        <button
                            key={option.key}
                            onClick={() => setMetric(option.key)}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                                metric === option.key ? 'bg-[#28a745] text-white shadow-sm' : 'text-gray-500 hover:text-[#2c3e50]'
                            }`}
                        >
                            {option.icon}
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div ref={ref} className="relative w-full" style={{ minHeight: HEIGHT }}>
                {width > 0 && hasPoints && (
                    <svg
                        width={width}
                        height={HEIGHT}
                        className="block touch-none"
                        onPointerMove={handleMove}
                        onPointerLeave={() => setHover(null)}
                        role="img"
                        aria-label={`Courbe : ${metric === 'revenue' ? "chiffre d'affaires" : 'commandes'} sur ${rangeLabel}`}
                    >
                        <defs>
                            <linearGradient id="ndanty-area" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={VIZ.brand} stopOpacity="0.14" />
                                <stop offset="100%" stopColor={VIZ.brand} stopOpacity="0" />
                            </linearGradient>
                        </defs>

                        {/* Grille + graduations (filet d'un pas au-dessus de la surface, jamais en pointillés) */}
                        {Array.from({ length: TICKS + 1 }, (_, i) => {
                            const value = (yMax / TICKS) * i;
                            const yPos = y(value);
                            return (
                                <g key={i}>
                                    <line
                                        x1={PAD.left}
                                        x2={PAD.left + plotWidth}
                                        y1={yPos}
                                        y2={yPos}
                                        stroke={i === 0 ? VIZ.axis : VIZ.grid}
                                        strokeWidth="1"
                                    />
                                    <text
                                        x={PAD.left - 10}
                                        y={yPos + 3.5}
                                        textAnchor="end"
                                        fontSize="10"
                                        fill={VIZ.muted}
                                        style={{ fontVariantNumeric: 'tabular-nums' }}
                                    >
                                        {metric === 'revenue' ? compact(value) : nf(value)}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Aire (lavis à ~10 %) + courbe 2px */}
                        <path d={areaPath} fill="url(#ndanty-area)" />
                        <path d={linePath} fill="none" stroke={VIZ.brand} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

                        {/* Étiquettes d'abscisse */}
                        {points.map((p, i) =>
                            i % labelEvery === 0 || i === points.length - 1 ? (
                                <text
                                    key={p.label + i}
                                    x={x(i)}
                                    y={HEIGHT - 10}
                                    textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
                                    fontSize="10"
                                    fill={VIZ.muted}
                                    style={{ fontVariantNumeric: 'tabular-nums' }}
                                >
                                    {p.label}
                                </text>
                            ) : null
                        )}

                        {/* Étiquette directe du pic — remplacée par l'infobulle au survol */}
                        {active === null && total > 0 && (
                            <>
                                <circle cx={x(peakIndex)} cy={y(values[peakIndex])} r="4.5" fill={VIZ.brand} stroke={VIZ.surface} strokeWidth="2" />
                                <text
                                    x={x(peakIndex)}
                                    y={y(values[peakIndex]) - 12}
                                    textAnchor={peakIndex === 0 ? 'start' : peakIndex === points.length - 1 ? 'end' : 'middle'}
                                    fontSize="10.5"
                                    fontWeight="800"
                                    fill={VIZ.ink}
                                >
                                    {metric === 'revenue' ? compact(values[peakIndex]) : nf(values[peakIndex])}
                                </text>
                            </>
                        )}

                        {/* Réticule de survol */}
                        {active !== null && (
                            <>
                                <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotHeight} stroke={VIZ.axis} strokeWidth="1" />
                                <circle cx={x(active)} cy={y(values[active])} r="5" fill={VIZ.brand} stroke={VIZ.surface} strokeWidth="2" />
                            </>
                        )}
                    </svg>
                )}

                {/* Infobulle */}
                {active !== null && width > 0 && (
                    <div
                        className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full"
                        style={{
                            // Marge de garde pour que l'infobulle ne déborde jamais de la carte,
                            // y compris sur les petits écrans où la moitié de sa largeur dépasse.
                            left: (() => {
                                const guard = Math.min(110, width / 2);
                                return Math.min(Math.max(x(active), guard), width - guard);
                            })(),
                            top: Math.max(y(values[active]) - 14, 26),
                        }}
                    >
                        <div className="bg-[#2c3e50] text-white rounded-xl px-3 py-2 shadow-lg whitespace-nowrap">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-white/60">{points[active].fullLabel}</p>
                            <p className="text-xs font-black mt-0.5">{format(values[active])}</p>
                            <p className="text-[10px] font-semibold text-white/70">
                                {metric === 'revenue'
                                    ? `${nf(points[active].orders)} commande${points[active].orders > 1 ? 's' : ''}`
                                    : ar(points[active].revenue)}
                            </p>
                        </div>
                    </div>
                )}

                {total === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-300 bg-white/80 px-4 py-2 rounded-full">
                            Aucune vente réglée sur cette période
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
