// app/admin/products/actions.ts
'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ensureAdmin } from "@/lib/guards";
import { saveUploadedImage } from "@/lib/uploads";
import { recordAudit, describeChange } from "@/lib/admin/audit";

// ➕ ACTION DE CRÉATION
export async function createProductAction(formData: FormData) {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const priceInput = formData.get("price");
        const stockInput = formData.get("stock");
        const category = formData.get("category") as string;
        const subcategory = formData.get("subcategory") as string; // ✨ Nouveau
        const imageFile = formData.get("image") as File | null;

        if (!name || !priceInput || !category || !subcategory) {
            return { success: false, error: "❌ Tous les champs obligatoires doivent être remplis." };
        }

        const price = parseFloat(priceInput as string);
        const stock = parseInt(stockInput as string) || 0;
        let imageUrl: string | null = null;

        if (imageFile && imageFile.size > 0) {
            const saved = await saveUploadedImage(imageFile, "products");
            if (saved.error) return { success: false, error: `❌ ${saved.error}` };
            imageUrl = saved.url ?? null;
        }

        const created = await prisma.product.create({
            data: { name, description, price, stock, category, subcategory, imageUrl, updatedAt: new Date() }
        });

        await recordAudit({
            action: "product.create",
            entity: "product",
            entityId: created.id,
            label: created.name,
            summary: `Nouveau produit au catalogue — ${price.toLocaleString("fr-FR")} Ar, stock ${stock}, ${category} / ${subcategory}`,
            metadata: { price, stock, category, subcategory, hasImage: Boolean(imageUrl) },
            actorEmail: guard.session.user?.email,
        });

        revalidatePath("/admin/products");
        return { success: true };
    } catch (error) {
        console.error("Erreur création produit:", error);
        return { success: false, error: "❌ Erreur serveur lors de la création." };
    }
}

// 🔄 ACTION DE MODIFICATION
export async function updateProductAction(productId: number, formData: FormData) {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const priceInput = formData.get("price");
        const stockInput = formData.get("stock");
        const category = formData.get("category") as string;
        const subcategory = formData.get("subcategory") as string; // ✨ Nouveau
        const imageFile = formData.get("image") as File | null;

        if (!name || !priceInput || !category || !subcategory) {
            return { success: false, error: "❌ Tous les champs obligatoires doivent être remplis." };
        }

        const price = parseFloat(priceInput as string);
        const stock = parseInt(stockInput as string) || 0;

        // Photographie de l'état AVANT modification : sans elle, le journal ne pourrait
        // pas dire ce qui a changé, seulement qu'une modification a eu lieu.
        const before = await prisma.product.findUnique({
            where: { id: productId },
            select: { name: true, price: true, stock: true, category: true, subcategory: true },
        });

        const updateData: any = { name, description, price, stock, category, subcategory, updatedAt: new Date() };

        if (imageFile && imageFile.size > 0) {
            const saved = await saveUploadedImage(imageFile, "products");
            if (saved.error) return { success: false, error: `❌ ${saved.error}` };
            updateData.imageUrl = saved.url; // Fichier sur disque, plus de base64 en base
        }

        await prisma.product.update({
            where: { id: productId },
            data: updateData
        });

        const changes = [
            describeChange("Nom", before?.name, name),
            describeChange("Prix", before?.price, price),
            describeChange("Stock", before?.stock, stock),
            describeChange("Catégorie", before?.category, category),
            describeChange("Sous-catégorie", before?.subcategory, subcategory),
            updateData.imageUrl ? "Photo remplacée" : null,
        ].filter(Boolean) as string[];

        await recordAudit({
            action: "product.update",
            entity: "product",
            entityId: productId,
            label: name,
            summary: changes.length ? changes.join(" · ") : "Fiche enregistrée sans modification de valeur",
            metadata: { before, after: { name, price, stock, category, subcategory } },
            actorEmail: guard.session.user?.email,
        });

        revalidatePath("/admin/products");
        return { success: true };
    } catch (error) {
        console.error("Erreur modification produit:", error);
        return { success: false, error: "❌ Erreur serveur lors de la modification." };
    }
}

// 🗑️ ACTION DE SUPPRESSION
export async function deleteProductAction(productId: number) {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        const deleted = await prisma.product.delete({ where: { id: productId } });

        await recordAudit({
            action: "product.delete",
            entity: "product",
            entityId: productId,
            label: deleted.name,
            summary: `Produit retiré du catalogue (${deleted.price.toLocaleString("fr-FR")} Ar, stock restant ${deleted.stock})`,
            metadata: { price: deleted.price, stock: deleted.stock, category: deleted.category, subcategory: deleted.subcategory },
            actorEmail: guard.session.user?.email,
        });

        revalidatePath("/admin/products");
        return { success: true };
    } catch (error) {
        console.error("Erreur suppression produit:", error);
        return { success: false, error: "❌ Impossible de supprimer ce produit." };
    }
}