// lib/uploads.ts
// Enregistrement des images sur le disque (dossier /public/uploads) plutôt qu'en base64 dans MySQL.
// Objectif (Priorité 3) : alléger la base, éviter max_allowed_packet, préparer un CDN (Cloudinary/S3).
// 🔌 Migration CDN : remplacer writeFile par un upload S3/Cloudinary et renvoyer l'URL distante.
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo

function safeExt(name: string, fallback = "png"): string {
    return (name.split(".").pop() || fallback).toLowerCase().replace(/[^a-z0-9]/g, "") || fallback;
}

async function writeToUploads(subdir: string, fileName: string, bytes: Buffer): Promise<string> {
    const uploadDir = path.join(process.cwd(), "public", "uploads", subdir);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), bytes);
    return `/uploads/${subdir}/${fileName}`;
}

/**
 * Enregistre un File (issu d'un FormData) et renvoie son URL publique.
 * Renvoie { error } si le fichier est invalide.
 */
export async function saveUploadedImage(
    file: File,
    subdir: string
): Promise<{ url?: string; error?: string }> {
    if (!file.type.startsWith("image/")) {
        return { error: "Le fichier envoyé doit être une image (JPG, PNG…)." };
    }
    if (file.size > MAX_SIZE) {
        return { error: "L'image ne doit pas dépasser 5 Mo." };
    }
    try {
        const bytes = Buffer.from(await file.arrayBuffer());
        const fileName = `${Date.now()}-${randomUUID()}.${safeExt(file.name)}`;
        const url = await writeToUploads(subdir, fileName, bytes);
        return { url };
    } catch (e) {
        console.error("Erreur d'enregistrement de l'image :", e);
        return { error: "Impossible d'enregistrer l'image. Réessayez." };
    }
}

/**
 * Décode une data-URL base64 ("data:image/png;base64,....") et l'écrit sur disque.
 * Renvoie l'URL publique, ou null si l'entrée n'est pas une data-URL exploitable.
 * Sert à la migration des anciennes images et aux flux qui reçoivent encore du base64.
 */
export async function saveBase64Image(dataUrl: string, subdir: string): Promise<string | null> {
    const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl || "");
    if (!match) return null;
    try {
        const mime = match[1];
        const bytes = Buffer.from(match[2], "base64");
        if (bytes.length === 0 || bytes.length > MAX_SIZE) return null;
        const ext = mime.split("/")[1]?.replace(/[^a-z0-9]/g, "") || "png";
        const fileName = `${Date.now()}-${randomUUID()}.${ext === "jpeg" ? "jpg" : ext}`;
        return await writeToUploads(subdir, fileName, bytes);
    } catch (e) {
        console.error("Erreur de conversion base64 → fichier :", e);
        return null;
    }
}
