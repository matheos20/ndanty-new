// app/admin/categories/actions.ts
'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ensureAdmin } from "@/lib/guards";
import { getCategoryTree, getCategoryDictionary } from "@/lib/categories";
import { recordAudit } from "@/lib/admin/audit";

type ActionResult = { success: boolean; error?: string };

const MAX_LEN = 60;

function cleanName(raw: unknown): string {
    return typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
}

function validateName(name: string): string | null {
    if (!name) return "Le nom ne peut pas être vide.";
    if (name.length > MAX_LEN) return `Le nom ne doit pas dépasser ${MAX_LEN} caractères.`;
    return null;
}

// Rafraîchit toutes les surfaces qui affichent la taxonomie.
function revalidateAll() {
    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
    revalidatePath("/shop");
}

/* ------------------------------------------------------------------ */
/*  LECTURE (utilisée par les formulaires produit côté client)         */
/* ------------------------------------------------------------------ */

export async function getCategoryDictionaryAction(): Promise<Record<string, string[]>> {
    return getCategoryDictionary();
}

/* ------------------------------------------------------------------ */
/*  CATÉGORIES                                                          */
/* ------------------------------------------------------------------ */

// ➕ Créer une catégorie
export async function createCategoryAction(formData: FormData): Promise<ActionResult> {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        const name = cleanName(formData.get("name"));
        const invalid = validateName(name);
        if (invalid) return { success: false, error: invalid };

        const exists = await prisma.category.findUnique({ where: { name } });
        if (exists) return { success: false, error: "Cette catégorie existe déjà." };

        const created = await prisma.category.create({ data: { name } });
        await recordAudit({
            action: "category.create", entity: "category", entityId: created.id, label: name,
            summary: `Catégorie « ${name} » ajoutée à l'arborescence`,
            actorEmail: guard.session.user?.email,
        });
        revalidateAll();
        return { success: true };
    } catch (error) {
        console.error("createCategoryAction:", error);
        return { success: false, error: "Erreur serveur lors de la création." };
    }
}

// 🔄 Renommer une catégorie (répercute le nom sur les produits rattachés)
export async function renameCategoryAction(id: number, formData: FormData): Promise<ActionResult> {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        const name = cleanName(formData.get("name"));
        const invalid = validateName(name);
        if (invalid) return { success: false, error: invalid };

        const current = await prisma.category.findUnique({ where: { id } });
        if (!current) return { success: false, error: "Catégorie introuvable." };
        if (current.name === name) return { success: true };

        const clash = await prisma.category.findUnique({ where: { name } });
        if (clash) return { success: false, error: "Une catégorie porte déjà ce nom." };

        // Transaction : renommage + répercussion sur les produits (stockés par nom).
        await prisma.$transaction([
            prisma.category.update({ where: { id }, data: { name } }),
            prisma.product.updateMany({
                where: { category: current.name },
                data: { category: name },
            }),
        ]);

        await recordAudit({
            action: "category.update", entity: "category", entityId: id, label: name,
            summary: `Catégorie renommée : ${current.name} → ${name} (produits rattachés mis à jour)`,
            metadata: { before: current.name, after: name },
            actorEmail: guard.session.user?.email,
        });

        revalidateAll();
        return { success: true };
    } catch (error) {
        console.error("renameCategoryAction:", error);
        return { success: false, error: "Erreur serveur lors du renommage." };
    }
}

// 🗑️ Supprimer une catégorie (bloqué si des produits l'utilisent encore)
export async function deleteCategoryAction(id: number): Promise<ActionResult> {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        const current = await prisma.category.findUnique({ where: { id } });
        if (!current) return { success: false, error: "Catégorie introuvable." };

        const used = await prisma.product.count({ where: { category: current.name } });
        if (used > 0) {
            return {
                success: false,
                error: `Impossible : ${used} produit(s) utilisent encore cette catégorie. Réaffectez-les d'abord.`,
            };
        }

        // Les sous-catégories sont supprimées en cascade (FK onDelete: Cascade).
        await prisma.category.delete({ where: { id } });
        await recordAudit({
            action: "category.delete", entity: "category", entityId: id, label: current.name,
            summary: `Catégorie « ${current.name} » supprimée (sous-catégories comprises)`,
            actorEmail: guard.session.user?.email,
        });
        revalidateAll();
        return { success: true };
    } catch (error) {
        console.error("deleteCategoryAction:", error);
        return { success: false, error: "Erreur serveur lors de la suppression." };
    }
}

/* ------------------------------------------------------------------ */
/*  SOUS-CATÉGORIES                                                     */
/* ------------------------------------------------------------------ */

// ➕ Créer une sous-catégorie
export async function createSubcategoryAction(categoryId: number, formData: FormData): Promise<ActionResult> {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        const name = cleanName(formData.get("name"));
        const invalid = validateName(name);
        if (invalid) return { success: false, error: invalid };

        const parent = await prisma.category.findUnique({ where: { id: categoryId } });
        if (!parent) return { success: false, error: "Catégorie parente introuvable." };

        const clash = await prisma.subcategory.findFirst({ where: { categoryId, name } });
        if (clash) return { success: false, error: "Cette sous-catégorie existe déjà ici." };

        const createdSub = await prisma.subcategory.create({ data: { name, categoryId } });
        await recordAudit({
            action: "category.create", entity: "category", entityId: createdSub.id,
            label: `${parent.name} / ${name}`,
            summary: `Sous-catégorie « ${name} » ajoutée sous « ${parent.name} »`,
            actorEmail: guard.session.user?.email,
        });
        revalidateAll();
        return { success: true };
    } catch (error) {
        console.error("createSubcategoryAction:", error);
        return { success: false, error: "Erreur serveur lors de la création." };
    }
}

// 🔄 Renommer une sous-catégorie (répercute sur les produits rattachés)
export async function renameSubcategoryAction(id: number, formData: FormData): Promise<ActionResult> {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        const name = cleanName(formData.get("name"));
        const invalid = validateName(name);
        if (invalid) return { success: false, error: invalid };

        const current = await prisma.subcategory.findUnique({
            where: { id },
            include: { category: true },
        });
        if (!current) return { success: false, error: "Sous-catégorie introuvable." };
        if (current.name === name) return { success: true };

        const clash = await prisma.subcategory.findFirst({
            where: { categoryId: current.categoryId, name },
        });
        if (clash) return { success: false, error: "Une sous-catégorie porte déjà ce nom ici." };

        await prisma.$transaction([
            prisma.subcategory.update({ where: { id }, data: { name } }),
            prisma.product.updateMany({
                where: { category: current.category.name, subcategory: current.name },
                data: { subcategory: name },
            }),
        ]);

        await recordAudit({
            action: "category.update", entity: "category", entityId: id,
            label: `${current.category.name} / ${name}`,
            summary: `Sous-catégorie renommée : ${current.name} → ${name} (produits rattachés mis à jour)`,
            metadata: { parent: current.category.name, before: current.name, after: name },
            actorEmail: guard.session.user?.email,
        });

        revalidateAll();
        return { success: true };
    } catch (error) {
        console.error("renameSubcategoryAction:", error);
        return { success: false, error: "Erreur serveur lors du renommage." };
    }
}

// 🗑️ Supprimer une sous-catégorie (bloqué si des produits l'utilisent)
export async function deleteSubcategoryAction(id: number): Promise<ActionResult> {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        const current = await prisma.subcategory.findUnique({
            where: { id },
            include: { category: true },
        });
        if (!current) return { success: false, error: "Sous-catégorie introuvable." };

        const used = await prisma.product.count({
            where: { category: current.category.name, subcategory: current.name },
        });
        if (used > 0) {
            return {
                success: false,
                error: `Impossible : ${used} produit(s) utilisent encore cette sous-catégorie.`,
            };
        }

        await prisma.subcategory.delete({ where: { id } });
        await recordAudit({
            action: "category.delete", entity: "category", entityId: id,
            label: `${current.category.name} / ${current.name}`,
            summary: `Sous-catégorie « ${current.name} » supprimée de « ${current.category.name} »`,
            actorEmail: guard.session.user?.email,
        });
        revalidateAll();
        return { success: true };
    } catch (error) {
        console.error("deleteSubcategoryAction:", error);
        return { success: false, error: "Erreur serveur lors de la suppression." };
    }
}
