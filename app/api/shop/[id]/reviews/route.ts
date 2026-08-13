// app/api/shop/[id]/reviews/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/guards";

/** Identifiant de l'utilisateur connecté, ou null. La session fait foi — jamais le corps de la requête. */
async function currentUserId(): Promise<number | null> {
    const session = await getSession();
    const email = session?.user?.email;
    if (!email) return null;
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    return user?.id ?? null;
}

// 👤 1. GET : Récupérer les avis PUBLIÉS d'un produit
// Un visiteur ne voit que les avis approuvés par la modération. Seule exception :
// l'auteur connecté voit son propre avis en attente, pour ne pas croire qu'il s'est perdu.
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

        const userId = await currentUserId();

        const reviews = await prisma.review.findMany({
            where: {
                productId,
                OR: [
                    { status: "APPROVED" },
                    ...(userId ? [{ userId, status: { in: ["PENDING", "REJECTED"] } }] : []),
                ],
            },
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

        // On expose le statut et la propriété de l'avis : l'interface peut alors
        // marquer « en attente de validation » sans jamais deviner.
        const payload = reviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt,
            adminReply: r.adminReply,
            adminReplyAt: r.adminReplyAt,
            status: r.status,
            isMine: userId !== null && r.userId === userId,
            user: r.user,
        }));

        return NextResponse.json(payload);
    } catch (error) {
        console.error("Erreur GET Reviews:", error);
        return NextResponse.json(
            { error: "Impossible de récupérer les avis clients." },
            { status: 500 }
        );
    }
}

// ✍️ 2. POST : Déposer un avis — il entre en file de modération, il n'est PAS publié
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

        // L'auteur est déterminé par la session : impossible de publier au nom d'autrui.
        const userId = await currentUserId();
        if (!userId) {
            return NextResponse.json({ error: "Vous devez être connecté pour laisser un avis" }, { status: 401 });
        }

        const body = await request.json();
        const { rating, comment } = body;

        // Validations de sécurité strictes
        if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
            return NextResponse.json({ error: "La note doit être comprise entre 1 et 5 étoiles" }, { status: 400 });
        }
        if (typeof comment !== "string" || comment.trim().length < 3) {
            return NextResponse.json({ error: "Le commentaire doit faire au moins 3 caractères" }, { status: 400 });
        }

        const productExists = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
        if (!productExists) {
            return NextResponse.json({ error: "Ce produit n'existe plus." }, { status: 404 });
        }

        // Anti-spam simple : un avis déjà en file d'attente pour ce produit suffit.
        const alreadyPending = await prisma.review.findFirst({
            where: { productId, userId, status: "PENDING" },
            select: { id: true },
        });
        if (alreadyPending) {
            return NextResponse.json(
                { error: "Votre précédent avis sur ce meuble est encore en cours de validation." },
                { status: 409 }
            );
        }

        // Création en file d'attente : la publication dépend d'une validation humaine.
        const newReview = await prisma.review.create({
            data: {
                rating,
                comment: comment.trim().slice(0, 2000),
                productId,
                userId,
                status: "PENDING",
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
            message: "Merci ! Votre avis a bien été reçu : il sera publié après validation par notre équipe.",
            pendingModeration: true,
            review: { ...newReview, isMine: true }
        }, { status: 201 });

    } catch (error) {
        console.error("Erreur POST Review:", error);
        return NextResponse.json(
            { error: "Une erreur est survenue lors de l'envoi de votre avis." },
            { status: 500 }
        );
    }
}
