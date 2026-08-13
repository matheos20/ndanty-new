'use client'

import Link from 'next/link';
// Ajout de l'icône ShoppingBag pour les commandes
import { LayoutDashboard, ClipboardList, ShoppingBag, Box, FolderTree, Users, LogOut, MessageSquare, Heart, X, CreditCard, ScrollText, ShieldCheck } from 'lucide-react';
import { usePathname } from 'next/navigation';
// 1. IMPORTATION DE SIGNOUT
import { signOut } from "next-auth/react";
import { NotificationBadge, useAdminNotifications, type AdminNotificationCounts } from '@/components/admin/AdminNotifications';

/** `badge` désigne le compteur de travail en attente rattaché à l'entrée de menu. */
const menuItems: { name: string; icon: React.ReactNode; path: string; badge?: keyof AdminNotificationCounts }[] = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/admin' },
    { name: 'Devis Client', icon: <ClipboardList size={20} />, path: '/admin/quotes', badge: 'quotes' },
    // NOUVEAU MENU INJECTÉ ICI
    { name: 'Commandes', icon: <ShoppingBag size={20} />, path: '/admin/orders', badge: 'orders' },
    { name: 'Transactions', icon: <CreditCard size={20} />, path: '/admin/payments' },
    { name: 'Produits', icon: <Box size={20} />, path: '/admin/products' },
    { name: 'Catégories', icon: <FolderTree size={20} />, path: '/admin/categories' },
    { name: 'Avis clients', icon: <MessageSquare size={20} />, path: '/admin/reviews', badge: 'reviews' },
    { name: 'Favoris', icon: <Heart size={20} />, path: '/admin/favorites' },
    { name: 'Utilisateurs', icon: <Users size={20} />, path: '/admin/users' },
    { name: 'Journal & exports', icon: <ScrollText size={20} />, path: '/admin/journal' },
    { name: 'Sécurité', icon: <ShieldCheck size={20} />, path: '/admin/securite' },
];

// Contenu réutilisable de la barre latérale (desktop + tiroir mobile)
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname();
    const { counts } = useAdminNotifications();

    return (
        <>
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                <h1 className="text-xl font-bold tracking-tighter">
                    Ndanty<span className="text-[#28a745]">Admin</span>
                </h1>
                {onNavigate && (
                    <button
                        onClick={onNavigate}
                        aria-label="Fermer le menu"
                        className="lg:hidden p-1 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={22} />
                    </button>
                )}
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {menuItems.map((item) => {
                    const active = pathname === item.path;
                    const pending = item.badge ? counts[item.badge] : 0;

                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            onClick={onNavigate}
                            className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all ${
                                active
                                    ? 'bg-[#28a745] text-white shadow-lg shadow-[#28a745]/20'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            }`}
                        >
                            {item.icon}
                            <span className="text-sm font-medium flex-1">{item.name}</span>
                            {/* Sur l'entrée active (déjà verte), la pastille s'inverse pour rester lisible. */}
                            <NotificationBadge count={pending} variant={active ? 'inverse' : 'accent'} />
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-700">
                {/* 2. CONFIGURATION DU BOUTON DÉCONNEXION */}
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex items-center gap-4 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/5 rounded-lg transition-all w-full cursor-pointer"
                >
                    <LogOut size={20} />
                    <span className="text-sm font-medium">Déconnexion</span>
                </button>
            </div>
        </>
    );
}

export default function AdminSidebar({
    mobileOpen = false,
    onClose,
}: {
    mobileOpen?: boolean;
    onClose?: () => void;
}) {
    return (
        <>
            {/* Barre latérale fixe (Desktop) */}
            <aside className="hidden lg:flex w-64 bg-[#2c3e50] text-white flex-col shadow-xl h-screen sticky top-0">
                <SidebarContent />
            </aside>

            {/* Tiroir mobile */}
            <div
                onClick={onClose}
                className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
                    mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
            />
            <aside
                className={`fixed top-0 left-0 z-[70] h-full w-64 max-w-[80%] bg-[#2c3e50] text-white flex flex-col shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
                    mobileOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <SidebarContent onNavigate={onClose} />
            </aside>
        </>
    );
}
