'use client'
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, User, Search, Menu, ShoppingBag, ClipboardList, MessageSquare, CheckCircle2 } from 'lucide-react';
import { NotificationBadge, useAdminNotifications, type AdminNotificationCounts } from '@/components/admin/AdminNotifications';

/** Files de travail présentées dans le volet de la cloche. */
const QUEUES: { key: keyof AdminNotificationCounts; label: string; help: string; href: string; icon: React.ReactNode }[] = [
    {
        key: 'orders',
        label: 'Nouvelles commandes',
        help: 'Commandes réglées pas encore ouvertes',
        href: '/admin/orders',
        icon: <ShoppingBag size={15} />,
    },
    {
        key: 'quotes',
        label: 'Devis en attente',
        help: 'Demandes sur mesure sans proposition',
        href: '/admin/quotes',
        icon: <ClipboardList size={15} />,
    },
    {
        key: 'reviews',
        label: 'Avis sans réponse',
        help: 'Commentaires clients publiés',
        href: '/admin/reviews',
        icon: <MessageSquare size={15} />,
    },
];

export default function AdminTopbar({ onMenuClick }: { onMenuClick?: () => void }) {
    const { counts } = useAdminNotifications();
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Fermeture au clic extérieur et à la touche Échap.
    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    return (
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30 shadow-sm">

            {/* Bouton menu (mobile) + Recherche rapide interne (Admin) */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                    onClick={onMenuClick}
                    aria-label="Ouvrir le menu"
                    className="lg:hidden p-2 -ml-1 text-gray-500 hover:text-[#28a745] transition-colors shrink-0"
                >
                    <Menu size={22} />
                </button>
                <div className="relative w-full max-w-md group hidden sm:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4 group-focus-within:text-[#28a745] transition-colors" />
                    <input
                        type="text"
                        placeholder="Rechercher un devis, un produit..."
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-10 text-xs focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all"
                    />
                </div>
            </div>

            {/* 2. Actions de Profil & Notifications */}
            <div className="flex items-center gap-4 sm:gap-6">

                {/* Notifications */}
                <div className="relative" ref={panelRef}>
                    <button
                        onClick={() => setOpen((v) => !v)}
                        aria-label={counts.total > 0 ? `${counts.total} élément(s) en attente` : 'Aucune notification'}
                        aria-expanded={open}
                        className={`relative p-2 rounded-full transition-all ${
                            open ? 'text-[#28a745] bg-green-50' : 'text-gray-400 hover:text-[#28a745] hover:bg-gray-50'
                        }`}
                    >
                        <Bell size={20} />
                        {counts.total > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#28a745] text-white text-[9px] font-black tabular-nums border-2 border-white">
                                {counts.total > 99 ? '99+' : counts.total}
                            </span>
                        )}
                    </button>

                    {open && (
                        <div className="absolute right-0 mt-3 w-[19rem] max-w-[calc(100vw-2rem)] bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                            <div className="px-5 py-4 border-b border-gray-50">
                                <p className="text-sm font-black text-[#2c3e50]">Travail en attente</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">
                                    {counts.total > 0 ? `${counts.total} élément(s) à traiter` : 'Rien à traiter'}
                                </p>
                            </div>

                            {counts.total === 0 ? (
                                <div className="px-5 py-8 text-center">
                                    <CheckCircle2 size={26} className="mx-auto text-[#28a745] mb-2" />
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                        Tout est à jour
                                    </p>
                                </div>
                            ) : (
                                <ul className="p-2">
                                    {QUEUES.filter((queue) => counts[queue.key] > 0).map((queue) => (
                                        <li key={queue.key}>
                                            <Link
                                                href={queue.href}
                                                onClick={() => setOpen(false)}
                                                className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-gray-50 transition-colors"
                                            >
                                                <span className="p-2 rounded-xl bg-green-50 text-[#28a745] shrink-0">{queue.icon}</span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-xs font-black text-[#2c3e50] truncate">{queue.label}</span>
                                                    <span className="block text-[10px] font-semibold text-gray-400 truncate">{queue.help}</span>
                                                </span>
                                                <NotificationBadge count={counts[queue.key]} />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                {/* Separateur */}
                <div className="h-8 w-[1px] bg-gray-100"></div>

                {/* Profil Administrateur */}
                <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-bold text-[#2c3e50] group-hover:text-[#28a745] transition-colors">Admin Ndanty</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Super Administrateur</p>
                    </div>
                    <div className="w-10 h-10 bg-[#28a745] rounded-lg flex items-center justify-center text-white shadow-lg shadow-[#28a745]/20 group-hover:rotate-6 transition-transform">
                        <User size={20} />
                    </div>
                </div>

            </div>
        </header>
    );
}
