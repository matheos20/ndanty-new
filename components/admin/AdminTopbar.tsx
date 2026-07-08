'use client'
import { Bell, User, Search, Settings } from 'lucide-react';

export default function AdminTopbar() {
    return (
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm">

            {/* 1. Recherche rapide interne (Admin) */}
            <div className="relative w-96 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4 group-focus-within:text-[#28a745] transition-colors" />
                <input
                    type="text"
                    placeholder="Rechercher un devis, un produit..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-10 text-xs focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all"
                />
            </div>

            {/* 2. Actions de Profil & Notifications */}
            <div className="flex items-center gap-6">

                {/* Notifications */}
                <button className="relative p-2 text-gray-400 hover:text-[#28a745] hover:bg-gray-50 rounded-full transition-all">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

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