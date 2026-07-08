import { prisma } from "@/lib/prisma";
import UsersTable from "./_components/users-table";
import TablePagination from "./_components/table-pagination";
import SearchBar from "./_components/search-bar";
import { Users, UserCheck } from "lucide-react";

interface PageProps {
    searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
    const resolvedParams = await searchParams;
    const currentPage = parseInt(resolvedParams.page || "1");
    const querySearch = resolvedParams.search || "";

    const ITEMS_PER_PAGE = 7;

    // Filtre Prisma dynamique si une recherche est active
    const whereClause = querySearch ? {
        OR: [
            { firstName: { contains: querySearch } },
            { lastName: { contains: querySearch } },
            { email: { contains: querySearch } },
        ]
    } : {};

    // Exécution simultanée des requêtes SQL filtrées
    const [users, totalUsersFiltered, totalUsersGlobal] = await Promise.all([
        prisma.user.findMany({
            where: whereClause,
            skip: (currentPage - 1) * ITEMS_PER_PAGE,
            take: ITEMS_PER_PAGE,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                address: true,
                country: true,
                createdAt: true,
                image: true
            }
        }),
        prisma.user.count({ where: whereClause }),
        prisma.user.count()
    ]);

    const totalPages = Math.ceil(totalUsersFiltered / ITEMS_PER_PAGE);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight flex items-center gap-3">
                        <Users className="text-[#28a745]" size={28} /> Gestion des Utilisateurs
                    </h1>
                    <p className="text-gray-400 text-sm mt-1 font-medium">
                        Visualisez, filtrez et gérez l'ensemble des comptes inscrits sur Ndanty.
                    </p>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 flex items-center gap-3 self-start sm:self-center">
                    <div className="p-2 bg-[#28a745]/10 text-[#28a745] rounded-xl">
                        <UserCheck size={20} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Inscrits</span>
                        <span className="text-lg font-extrabold text-gray-800 leading-none">{totalUsersGlobal}</span>
                    </div>
                </div>
            </div>

            {/* Barre de Recherche et Outils */}
            <div className="flex items-center justify-between bg-white rounded-2xl">
                <SearchBar />
            </div>

            {/* Corps */}
            {users.length > 0 ? (
                <div className="flex flex-col">
                    <UsersTable users={users} />
                    <TablePagination totalPages={totalPages} currentPage={currentPage} />
                </div>
            ) : (
                <div className="text-center py-16 border border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
                    <Users className="mx-auto text-gray-300 mb-3" size={40} />
                    <p className="text-gray-500 text-sm font-semibold">
                        {querySearch ? "Aucun utilisateur ne correspond à votre recherche." : "Aucun utilisateur inscrit pour le moment."}
                    </p>
                </div>
            )}
        </div>
    );
}