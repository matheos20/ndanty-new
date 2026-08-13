// app/api/shop/[id]/reviews/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 👤 1. GET : Récupérer les avis d'un produit
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const productId = parseInt(resolvedParams.id);

        if (isNaN(productId)) {
            return NextResponse.json({ error: "ID produit invalide" }, { status: 400 });
        }

        // Extraction des avis avec le profil de l'auteur (Nom / Prénom)
        const reviews = await prisma.review.findMany({
            where: { productId },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        image: true,
                    }
                }
            },
            orderBy: { createdAt: "desc" } // Les plus récents en premier
        });

        return NextResponse.json(reviews);
    } catch (error) {
        console.error("Erreur GET Reviews:", error);
        return NextResponse.json(
            { error: "Impossible de récupérer les avis clients." },
            { status: 500 }
        );
    }
}

// ✍️ 2. POST : Enregistrer un nouvel avis client
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const productId = parseInt(resolvedParams.id);

        if (isNaN(productId)) {
            return NextResponse.json({ error: "ID produit invalide" }, { status: 400 });
        }

        const body = await request.json();
        const { rating, comment, userId } = body; // Idéalement, l'userId proviendra de ta session d'authentification plus tard

        // Validations de sécurité strictes
        if (!userId) {
            return NextResponse.json({ error: "Vous devez être connecté pour laisser un avis" }, { status: 401 });
        }
        if (typeof rating !== "number" || rating < 1 || rating > 5) {
            return NextResponse.json({ error: "La note doit être comprise entre 1 et 5 étoiles" }, { status: 400 });
        }
        if (!comment || comment.trim().length < 3) {
            return NextResponse.json({ error: "Le commentaire doit faire au moins 3 caractères" }, { status: 400 });
        }

        // Création de l'avis dans MySQL
        const newReview = await prisma.review.create({
            data: {
                rating,
                comment: comment.trim(),
                productId,
                userId
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        image: true
                    }
                }
            }
        });

        return NextResponse.json({
            message: "Votre avis a été publié avec succès !",
            review: newReview
        }, { status: 201 });

    } catch (error) {
        console.error("Erreur POST Review:", error);
        return NextResponse.json(
            { error: "Une erreur est survenue lors de l'envoi de votre avis." },
            { status: 500 }
        );
    }
}