// app/admin/categories/page.tsx
import { getCategoryTree } from "@/lib/categories";
import { FolderTree, Layers, Package } from "lucide-react";
import CategoryManager from "./CategoryManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CategoriesPage() {
    const tree = await getCategoryTree();

    const totalCategories = tree.length;
    const totalSubcategories = tree.reduce((acc, c) => acc + c.subcategories.length, 0);
    const totalClassed = tree.reduce((acc, c) => acc + c.productCount, 0);

    const stats = [
        { label: "Catégories", value: totalCategories, icon: <FolderTree size={22} />, css: "bg-green-50 text-[#28a745]" },
        { label: "Sous-catégories", value: totalSubcategories, icon: <Layers size={22} />, css: "bg-blue-50 text-blue-600" },
        { label: "Produits classés", value: totalClassed, icon: <Package size={22} />, css: "bg-orange-50 text-orange-600" },
    ];

    return (
        <div className="space-y-6 p-5 sm:p-8 max-w-7xl mx-auto animate-in fade-in duration-300">
            {/* EN-TÊTE */}
            <div>
                <h2 className="text-2xl font-bold text-[#2c3e50]">Gestion des Catégories</h2>
                <p className="text-sm text-gray-500">
                    Pilotez l'arborescence officielle du catalogue Ndanty. Toute modification se répercute
                    sur la boutique et les fiches produits.
                </p>
            </div>

            {/* STATISTIQUES */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                {stats.map((s) => (
                    <div key={s.label} className="p-4 flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${s.css}`}>{s.icon}</div>
                        <div>
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</h4>
                            <p className="text-xl font-black text-[#2c3e50]">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* GESTIONNAIRE INTERACTIF */}
            <CategoryManager categories={tree} />
        </div>
    );
}
