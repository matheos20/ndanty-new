'use client'

import { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import { AdminNotificationsProvider } from '@/components/admin/AdminNotifications';

/**
 * Coquille cliente de l'administration : gère l'état d'ouverture du menu latéral
 * mobile partagé entre la topbar (bouton hamburger) et la sidebar (tiroir),
 * et diffuse les compteurs de travail en attente à toute l'administration.
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <AdminNotificationsProvider>
            <div className="flex min-h-screen bg-[#F8F9FA]">
                <AdminSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

                <div className="flex-1 flex flex-col min-w-0">
                    <AdminTopbar onMenuClick={() => setMobileOpen(true)} />

                    <main className="p-4 sm:p-6 lg:p-8">
                        {children}
                    </main>
                </div>
            </div>
        </AdminNotificationsProvider>
    );
}
