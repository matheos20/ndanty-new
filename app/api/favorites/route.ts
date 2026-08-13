// app/api/favorites/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// 1. RÉCUPÉRER LES FAVORIS DE L'UTILISATEUR CONNECTÉ
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json([], { status: 200 }); // Retourne une liste vide si non connecté
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) return NextResponse.json({ message: "Utilisateur non trouvé" }, { status: 404 });

        // On récupère les favoris en incluant les détails du produit
        const favorites = await prisma.favorite.findMany({
            where: { userId: user.id },
            include: { product: true }
        });

        // On extrait proprement la liste des produits pour le front-end
        const favoriteProducts = favorites.map(fav => fav.product);
        return NextResponse.json(favoriteProducts, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ message: "Erreur serveur", error: error.message }, { status: 500 });
    }
}

// 2. AJOUTER UN PRODUIT AUX FAVORIS
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ message: "Veuillez vous connecter pour ajouter des favoris." }, { status: 401 });
        }

        const { productId } = await request.json();
        if (!productId) return NextResponse.json({ message: "ID du produit manquant" }, { status: 400 });

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) return NextResponse.json({ message: "Utilisateur non trouvé" }, { status: 404 });

        // Upsert ou create avec gestion d'existence pour éviter les doublons
        const favorite = await prisma.favorite.create({
            data: {
                userId: user.id,
                productId: Number(productId)
            }
        });

        return NextResponse.json({ message: "Ajouté aux favoris", favorite }, { status: 201 });
    } catch (error: any) {
        // Code d'erreur Prisma pour contrainte unique violée (déjà en favori)
        if (error.code === 'P2002') {
            return NextResponse.json({ message: "Déjà dans vos favoris" }, { status: 400 });
        }
        return NextResponse.json({ message: "Erreur serveur", error: error.message }, { status: 500 });
    }
}

// 3. RETIRER UN PRODUIT DES FAVORIS
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const { productId } = await request.json();

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) return NextResponse.json({ message: "Utilisateur non trouvé" }, { status: 404 });

        await prisma.favorite.deleteMany({
            where: {
                userId: user.id,
                productId: Number(productId)
            }
        });

        return NextResponse.json({ message: "Retiré des favoris" }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ message: "Erreur serveur", error: error.message }, { status: 500 });
    }
}