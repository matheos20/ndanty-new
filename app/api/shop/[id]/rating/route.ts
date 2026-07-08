// app/api/shop/[id]/rating/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Version asynchrone conforme aux standards Next.js récents
) {
    try {
        // Dans les versions récentes de Next.js, on attend les params
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id);

        if (isNaN(id)) {
            return NextResponse.json({ error: "ID produit invalide" }, { status: 400 });
        }

        const body = await request.json();
        const { rating } = body;

        // Validation stricte du format de la note (entre 0 et 5)
        if (typeof rating !== "number" || rating < 0 || rating > 5) {
            return NextResponse.json(
                { error: "La note doit être un nombre compris entre 0 et 5" },
                { status: 400 }
            );
        }

        // Mise à jour de la note "Éditoriale" dans la table product
        const updatedProduct = await prisma.product.update({
            where: { id },
            data: { rating: rating },
        });

        return NextResponse.json({
            message: "Note éditoriale mise à jour avec succès",
            product: {
                id: updatedProduct.id,
                name: updatedProduct.name,
                rating: Number(updatedProduct.rating),
            },
        });
    } catch (error) {
        console.error("Erreur API Shop Rating:", error);
        return NextResponse.json(
            { error: "Une erreur est survenue lors de la mise à jour de la note" },
            { status: 500 }
        );
    }
}