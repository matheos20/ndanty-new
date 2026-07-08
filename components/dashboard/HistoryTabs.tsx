// components/dashboard/HistoryTabs.tsx
import Link from "next/link";
import { ShoppingBag, Ruler } from "lucide-react";

interface HistoryTabsProps {
    activeTab: string;
    clientEmail: string;
    ordersCount: number;
    devisCount: number;
}

export default function HistoryTabs({ activeTab, clientEmail, ordersCount, devisCount }: HistoryTabsProps) {
    return (
        <div className="flex border-b border-gray-100 mb-8 gap-4">
            {/* Onglet Achats Boutique */}
            <Link
                href={`/dashboard/history?tab=orders&email=${encodeURIComponent(clientEmail)}`}
                className={`pb-4 text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
                    activeTab === "orders"
                        ? "border-[#28a745] text-[#28a745]"
                        : "border-transparent text-gray-400 hover:text-[#2c3e50]"
                }`}
            >
                <ShoppingBag size={16} />
                Mes Achats ({ordersCount})
            </Link>

            {/* Onglet Demandes Sur Mesure */}
            <Link
                href={`/dashboard/history?tab=devis&email=${encodeURIComponent(clientEmail)}`}
                className={`pb-4 text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
                    activeTab === "devis"
                        ? "border-[#28a745] text-[#28a745]"
                        : "border-transparent text-gray-400 hover:text-[#2c3e50]"
                }`}
            >
                <Ruler size={16} />
                Demandes Sur Mesure ({devisCount})
            </Link>
        </div>
    );
}