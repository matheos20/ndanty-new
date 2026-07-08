// app/admin/favorites/page.tsx
import { prisma } from "@/lib/prisma";
import { Heart, Inbox, Users, Package, TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminFavoritesPage() {
    // Tous les favoris avec le produit et le client qui l'a ajouté
    const favorites = await prisma.favorite.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            product: { select: { id: true, name: true, imageUrl: true, category: true, price: true } },
            user: { select: { firstName: true, lastName: true, email: true } },
        },
    });

    // Regroupement par produit
    const map = new Map<number, {
        product: (typeof favorites)[number]['product'];
        users: { name: string; email: string }[];
    }>();

    for (const fav of favorites) {
        if (!fav.product) continue;
        if (!map.has(fav.product.id)) {
            map.set(fav.product.id, { product: fav.product, users: [] });
        }
        map.get(fav.product.id)!.users.push({
            name: `${fav.user?.firstName || ''} ${fav.user?.lastName || ''}`.trim() || 'Client Ndanty',
            email: fav.user?.email || '',
        });
    }

    const grouped = Array.from(map.values()).sort((a, b) => b.users.length - a.users.length);

    const totalFavorites = favorites.length;
    const distinctProducts = grouped.length;
    const distinctUsers = new Set(favorites.map(f => f.userId)).size;

    const stats = [
        { label: 'Favoris au total', value: totalFavorites, color: 'bg-pink-500', icon: <Heart size={18} /> },
        { label: 'Produits favorisés', value: distinctProducts, color: 'bg-[#28a745]', icon: <Package size={18} /> },
        { label: 'Clients concernés', value: distinctUsers, color: 'bg-blue-500', icon: <Users size={18} /> },
    ];

    return (
        <div className="space-y-6 p-8 max-w-6xl mx-auto animate-in fade-in duration-300">
            {/* Header + stats */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <h2 className="text-2xl font-bold text-[#2c3e50]">Produits Favoris</h2>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-semibold">
                    Ce que vos clients aiment le plus
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                    {stats.map((s, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-gray-50/60 rounded-2xl border border-gray-100">
                            <div className={`p-3 rounded-xl text-white ${s.color}`}>{s.icon}</div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{s.label}</p>
                                <p className="text-xl font-black text-[#2c3e50]">{s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Classement des favoris */}
            {grouped.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-dashed border-gray-100">
                    <div className="p-4 bg-gray-50 rounded-full text-gray-300 mb-4"><Inbox size={48} /></div>
                    <h3 className="text-xl font-bold text-[#2c3e50]">Aucun favori pour l'instant</h3>
                    <p className="text-gray-400 mt-2 text-center max-w-xs">
                        Dès que vos clients ajouteront des produits à leurs favoris, ils apparaîtront ici classés par popularité.
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">#</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Produit</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Popularité</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Clients qui l'ont aimé</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {grouped.map((row, i) => (
                                    <tr key={row.product!.id} className="hover:bg-gray-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-black ${
                                                i === 0 ? 'bg-[#f39c12] text-white' : i < 3 ? 'bg-[#28a745]/15 text-[#28a745]' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                {i + 1}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                                                    {row.product!.imageUrl ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={row.product!.imageUrl} alt={row.product!.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={18} /></div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-[#2c3e50] text-sm truncate max-w-[220px]">{row.product!.name}</p>
                                                    <p className="text-[11px] text-gray-400">
                                                        {row.product!.category} · {row.product!.price.toLocaleString('fr-FR')} Ar
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-50 text-pink-600 text-xs font-black">
                                                <Heart size={12} className="fill-pink-500 text-pink-500" /> {row.users.length}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1.5 max-w-[320px]">
                                                {row.users.slice(0, 6).map((u, idx) => (
                                                    <span key={idx} title={u.email} className="text-[11px] bg-gray-50 border border-gray-100 text-gray-600 px-2 py-1 rounded-lg font-medium">
                                                        {u.name}
                                                    </span>
                                                ))}
                                                {row.users.length > 6 && (
                                                    <span className="text-[11px] text-gray-400 px-2 py-1 font-bold">
                                                        +{row.users.length - 6}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
