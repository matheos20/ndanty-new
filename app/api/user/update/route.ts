// app/api/user/update/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs"; // Ou "bcrypt" selon ce que tu utilises pour l'inscription
import { validatePassword } from "@/lib/password";

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const body = await request.json();
        const { firstName, lastName, address, country, oldPassword, newPassword } = body;

        // 1. Récupérer l'utilisateur actuel en base de données pour avoir son mot de passe actuel
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!currentUser) {
            return NextResponse.json({ message: "Utilisateur introuvable" }, { status: 404 });
        }

        // Préparer les données de mise à jour de base
        const updateData: any = {
            firstName,
            lastName,
            address,
            country
        };

        // 2. Si l'utilisateur essaie de modifier son mot de passe
        if (oldPassword || newPassword) {
            if (!oldPassword || !newPassword) {
                return NextResponse.json({ message: "Veuillez remplir l'ancien et le nouveau mot de passe." }, { status: 400 });
            }

            // Vérifier si l'ancien mot de passe saisi correspond à celui en BDD
            const isPasswordValid = await bcrypt.compare(oldPassword, currentUser.password);
            if (!isPasswordValid) {
                return NextResponse.json({ message: "L'ancien mot de passe est incorrect." }, { status: 400 });
            }

            // Politique de mot de passe (min 8 caractères, lettre + chiffre)
            const pwCheck = validatePassword(newPassword);
            if (!pwCheck.ok) {
                return NextResponse.json({ message: pwCheck.error }, { status: 400 });
            }

            // Hasher (crypter) le nouveau mot de passe avant de l'enregistrer
            const hashedPassword = await bcrypt.hash(newPassword, 12);
            updateData.password = hashedPassword;
        }

        // 3. Mise à jour dans MySQL via Prisma
        const updatedUser = await prisma.user.update({
            where: { email: session.user.email },
            data: updateData,
        });

        return NextResponse.json({ message: "Profil et mot de passe mis à jour !" }, { status: 200 });
    } catch (error: any) {
        console.error("Erreur mise à jour profil :", error);
        return NextResponse.json({ message: "Erreur serveur", error: error.message }, { status: 500 });
    }
}