// lib/categories.ts
// Lecture de la taxonomie du catalogue (catégories + sous-catégories) depuis MySQL.
// Auto-amorçage : au premier accès, on peuple la base à partir de l'arborescence
// officielle codée dans app/admin/products/categories.ts ET des catégories déjà
// présentes sur les produits existants, afin qu'aucune donnée ne soit perdue.
import { prisma } from "@/lib/prisma";
import { PRODUCT_CATEGORIES } from "@/app/admin/products/categories";

export interface SubcategoryNode {
    id: number;
    name: string;
    productCount: number;
}

export interface CategoryNode {
    id: number;
    name: string;
    createdAt: Date;
    productCount: number;
    subcategories: SubcategoryNode[];
}

/**
 * Peuple la table `category`/`subcategory` si elle est vide.
 * Idempotent : ne fait rien si au moins une catégorie existe déjà.
 */
export async function ensureCategoriesSeeded(): Promise<void> {
    const existing = await prisma.category.count();
    if (existing > 0) return;

    // 1. Structure de base : dictionnaire officiel Ndanty.
    const tree: Record<string, Set<string>> = {};
    for (const [cat, subs] of Object.entries(PRODUCT_CATEGORIES)) {
        tree[cat] = new Set(subs);
    }

    // 2. Complément : catégories/sous-catégories réellement utilisées par les produits.
    const usedRaw = await prisma.product.findMany({
        select: { category: true, subcategory: true },
    });
    for (const p of usedRaw) {
        if (!p.category) continue;
        if (!tree[p.category]) tree[p.category] = new Set<string>();
        if (p.subcategory) tree[p.category].add(p.subcategory);
    }

    // 3. Insertion.
    for (const [cat, subs] of Object.entries(tree)) {
        await prisma.category.create({
            data: {
                name: cat,
                subcategory: { create: Array.from(subs).map((name) => ({ name })) },
            },
        });
    }
}

/**
 * Renvoie l'arborescence complète avec le nombre de produits rattachés
 * à chaque catégorie et sous-catégorie (comptage par nom, cohérent avec
 * le stockage String des produits).
 */
export async function getCategoryTree(): Promise<CategoryNode[]> {
    await ensureCategoriesSeeded();

    const [categories, products] = await Promise.all([
        prisma.category.findMany({
            orderBy: { name: "asc" },
            include: { subcategory: { orderBy: { name: "asc" } } },
        }),
        prisma.product.findMany({ select: { category: true, subcategory: true } }),
    ]);

    return categories.map((c) => ({
        id: c.id,
        name: c.name,
        createdAt: c.createdAt,
        productCount: products.filter((p) => p.category === c.name).length,
        subcategories: c.subcategory.map((s) => ({
            id: s.id,
            name: s.name,
            productCount: products.filter(
                (p) => p.category === c.name && p.subcategory === s.name,
            ).length,
        })),
    }));
}

/**
 * Version "dictionnaire" ({ "Catégorie": ["Sous-cat", ...] }) attendue par
 * les formulaires produit. Repli sur le dictionnaire statique en cas de souci.
 */
export async function getCategoryDictionary(): Promise<Record<string, string[]>> {
    try {
        const tree = await getCategoryTree();
        if (tree.length === 0) return PRODUCT_CATEGORIES;
        const dict: Record<string, string[]> = {};
        for (const c of tree) dict[c.name] = c.subcategories.map((s) => s.name);
        return dict;
    } catch {
        return PRODUCT_CATEGORIES;
    }
}
