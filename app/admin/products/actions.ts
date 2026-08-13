// app/admin/products/actions.ts
'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ensureAdmin } from "@/lib/guards";
import { saveUploadedImage } from "@/lib/uploads";

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

        await prisma.product.create({
            data: { name, description, price, stock, category, subcategory, imageUrl, updatedAt: new Date() }
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

        await prisma.product.delete({ where: { id: productId } });
        revalidatePath("/admin/products");
        return { success: true };
    } catch (error) {
        console.error("Erreur suppression produit:", error);
        return { success: false, error: "❌ Impossible de supprimer ce produit." };
    }
}