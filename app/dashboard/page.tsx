// app/dashboard/page.tsx
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import OrderHistoryTable from "@/components/dashboard/OrderHistoryTable";
import DevisHistoryTable from "@/components/dashboard/DevisHistoryTable";
import ProfileForm from "@/components/dashboard/ProfileForm"; // 👈 Nouvelle importation du formulaire client
import { User, History, Settings, ShoppingBag, FileText, LogOut } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface DashboardProps {
    searchParams: Promise<{
        tab?: string;
    }>;
}

export default async function ClientDashboardPage({ searchParams }: DashboardProps) {
    const resolvedParams = await searchParams;
    const activeTab = resolvedParams.tab || "profile";

    // 1. PROTECTION DE LA PAGE & SESSION
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        redirect("/auth-client");
    }

    const clientEmail = session.user.email;

    // 2. RÉCUPÉRATION DES DONNÉES PRISMA (CÔTÉ SERVEUR COOLS ET SÉCURISÉS)
    const userDb = await prisma.user.findUnique({
        where: { email: clientEmail }
    });

    const ordersRaw = await prisma.order.findMany({
        where: { email: clientEmail },
        orderBy: { id: "desc" },
        include: { orderitem: true },
    });

    // On sérialise proprement pour le composant client (dates en ISO, articles renommés)
    const orders = ordersRaw.map((o) => ({
        id: o.id,
        totalAmount: o.totalAmount,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        paymentRef: o.paymentRef,
        customerName: o.customerName,
        phone: o.phone,
        address: o.address,
        createdAt: o.createdAt ? o.createdAt.toISOString() : null,
        items: o.orderitem.map((it) => ({ id: it.id, name: it.name, price: it.price, quantity: it.quantity })),
    }));

    const devisRequests = await prisma.quote.findMany({
        where: { email: clientEmail },
        orderBy: { id: "desc" },
    });

    const lucidaStyle = { fontFamily: '"Lucida Handwriting", "Apple Chancery", cursive' };

    // Liens de la barre latérale
    const sidebarItems = [
        { id: "profile", label: "Mon Profil", icon: User },
        { id: "orders", label: "Mes Commandes", icon: ShoppingBag, count: orders.length },
        { id: "devis", label: "Demandes Sur Mesure", icon: FileText, count: devisRequests.length },
    ];

    return (
        <div className="min-h-screen bg-[#FDFDFD] flex text-gray-600 font-sans">

            {/* 🖥️ BARRE LATÉRALE (SIDEBAR) */}
            <div className="w-[280px] bg-white border-r border-gray-100 p-6 flex flex-col justify-between hidden md:flex flex-shrink-0">
                <div className="space-y-8">
                    {/* Infos rapides de l'utilisateur connecté */}
                    <div className="flex items-center gap-3 p-2 bg-gray-50/50 rounded-2xl border border-gray-100">
                        <div className="w-10 h-10 rounded-full bg-[#28a745]/10 text-[#28a745] flex items-center justify-center font-bold text-sm border border-[#28a745]/20 overflow-hidden">
                            {userDb?.image ? (
                                <img src={userDb.image} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User size={18} />
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-black text-[#2c3e50] truncate">
                                {userDb?.firstName} {userDb?.lastName || "Client"}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">{clientEmail}</p>
                        </div>
                    </div>

                    {/* Liens de Navigation */}
                    <nav className="space-y-1">
                        <span className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 ml-2">Espace Personnel</span>
                        {sidebarItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <Link
                                    key={item.id}
                                    href={`/dashboard?tab=${item.id}`}
                                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                                        isActive
                                            ? "bg-[#28a745]/10 text-[#28a745] shadow-sm"
                                            : "text-gray-500 hover:bg-gray-50 hover:text-[#2c3e50]"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon size={16} className={isActive ? "text-[#28a745]" : "text-gray-400"} />
                                        {item.label}
                                    </div>
                                    {item.count !== undefined && item.count > 0 && (
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                            isActive ? "bg-[#28a745] text-white" : "bg-gray-100 text-gray-500"
                                        }`}>
                                            {item.count}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Bouton de déconnexion en bas */}
                <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-all">
                    <LogOut size={16} />
                    Retour à l'accueil
                </Link>
            </div>

            {/* 📦 ZONE DE CONTENU PRINCIPALE */}
            <div className="flex-1 p-6 md:p-12 overflow-y-auto max-w-5xl mx-auto w-full">

                {/* 1. ONGLET PROFILE : Modification du Compte */}
                {activeTab === "profile" && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div>
                            <h1 className="text-2xl font-black text-[#2c3e50] tracking-tight">Mon Profil Ndanty</h1>
                            <p className="text-xs text-gray-400 mt-1">Gérez vos informations de livraison et vos coordonnées personnelles.</p>
                        </div>

                        {/* Injection du composant client avec les données serveurs */}
                        <ProfileForm
                            initialData={{
                                firstName: userDb?.firstName || null,
                                lastName: userDb?.lastName || null,
                                address: userDb?.address || null,
                                country: userDb?.country || null
                            }}
                            clientEmail={clientEmail}
                        />
                    </div>
                )}

                {/* 2. ONGLET ORDERS : Historique des commandes de meubles boutique */}
                {activeTab === "orders" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div>
                            <h1 className="text-2xl font-black text-[#2c3e50] font-serif italic" style={lucidaStyle}>Mes Commandes</h1>
                            <p className="text-xs text-gray-400 mt-1">Historique complet de vos achats de pièces uniques au catalogue.</p>
                        </div>
                        <OrderHistoryTable orders={orders} />
                    </div>
                )}

                {/* 3. ONGLET DEVIS : Demandes de création sur-mesure */}
                {activeTab === "devis" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div>
                            <h1 className="text-2xl font-black text-[#2c3e50] font-serif italic" style={lucidaStyle}>Mes Projets Sur Mesure</h1>
                            <p className="text-xs text-gray-400 mt-1">Suivez l'étude et la validation de vos meubles sur mesure en atelier.</p>
                        </div>
                        <DevisHistoryTable
                            devisRequests={devisRequests.map(d => ({
                                id: d.id,
                                title: d.details,
                                status: d.status,
                                createdAt: d.createdAt,
                                proposedPrice: d.proposedPrice,
                                adminResponse: d.adminResponse,
                                clientDecision: d.clientDecision,
                                clientResponse: d.clientResponse
                            }))}
                        />
                    </div>
                )}

            </div>
        </div>
    );
}