'use client'

import Link from 'next/link';
// Ajout de l'icône ShoppingBag pour les commandes
import { LayoutDashboard, ClipboardList, ShoppingBag, Box, Users, LogOut, MessageSquare, Heart } from 'lucide-react';
import { usePathname } from 'next/navigation';
// 1. IMPORTATION DE SIGNOUT
import { signOut } from "next-auth/react";

export default function AdminSidebar() {
    const pathname = usePathname();

    const menuItems = [
        { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/admin' },
        { name: 'Devis Client', icon: <ClipboardList size={20} />, path: '/admin/quotes' },
        // NOUVEAU MENU INJECTÉ ICI
        { name: 'Commandes', icon: <ShoppingBag size={20} />, path: '/admin/orders' },
        { name: 'Produits', icon: <Box size={20} />, path: '/admin/products' },
        { name: 'Avis clients', icon: <MessageSquare size={20} />, path: '/admin/reviews' },
        { name: 'Favoris', icon: <Heart size={20} />, path: '/admin/favorites' },
        { name: 'Utilisateurs', icon: <Users size={20} />, path: '/admin/users' },
    ];

    return (
        <aside className="w-64 bg-[#2c3e50] text-white flex flex-col shadow-xl h-screen sticky top-0">
            <div className="p-6 border-b border-gray-700">
                <h1 className="text-xl font-bold tracking-tighter">
                    Ndanty<span className="text-[#28a745]">Admin</span>
                </h1>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {menuItems.map((item) => (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all ${
                            pathname === item.path
                                ? 'bg-[#28a745] text-white shadow-lg shadow-[#28a745]/20'
                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        }`}
                    >
                        {item.icon}
                        <span className="text-sm font-medium">{item.name}</span>
                    </Link>
                ))}
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
        </aside>
    );
}