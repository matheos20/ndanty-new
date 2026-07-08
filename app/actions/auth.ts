'use server'

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { saveBase64Image } from "@/lib/uploads";

export async function registerUser(formData: any) {
    try {
        const { firstName, lastName, email, password, confirmPassword, country, address, image } = formData;

        // 1. Validation des champs vides
        if (!firstName || !lastName || !email || !password) {
            return { error: "Veuillez remplir tous les champs obligatoires." };
        }

        // 2. Vérification de la correspondance des mots de passe
        if (password !== confirmPassword) {
            return { error: "Les mots de passe ne sont pas identiques." };
        }

        // 3. Vérification du format d'email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { error: "Le format de l'adresse email est invalide." };
        }

        // 4. Vérification si l'utilisateur existe déjà
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return { error: "Cette adresse email est déjà enregistrée chez Ndanty." };
        }

        // 5. Image de profil : si le client envoie du base64, on l'écrit sur disque
        //    (URL en base) au lieu de stocker le base64 dans MySQL.
        let imageUrl: string | null = null;
        if (typeof image === "string" && image.startsWith("data:")) {
            imageUrl = await saveBase64Image(image, "avatars");
        } else if (typeof image === "string" && image.startsWith("/uploads/")) {
            imageUrl = image;
        }

        // 6. Cryptage et Création
        const hashedPassword = await bcrypt.hash(password, 12);
        await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                password: hashedPassword,
                country,
                address,
                image: imageUrl,
                role: "USER"
            }
        });

        return { success: "Votre compte a été créé avec succès !" };
    } catch (error) {
        return { error: "Une erreur technique est survenue. Veuillez réessayer." };
    }
}