import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';

export default function AdminLayout({
                                        children,
                                    }: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-[#F8F9FA]">
            {/* Barre latérale fixe */}
            <AdminSidebar />

            <div className="flex-1 flex flex-col">
                {/* Barre du haut (Profil, Notifications) */}
                <AdminTopbar />

                {/* Contenu de la page */}
                <main className="p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}