// scripts/migrate-images.js
// Migration ponctuelle : sort les images base64 (data:...) de MySQL vers /public/uploads,
// et remplace le champ par l'URL du fichier. Idempotent : ignore ce qui est déjà une URL.
//   node scripts/migrate-images.js
const { PrismaClient } = require("@prisma/client");
const { writeFile, mkdir } = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");

const prisma = new PrismaClient();

async function base64ToFile(dataUrl, subdir) {
    const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl || "");
    if (!match) return null;
    const mime = match[1];
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length === 0) return null;
    let ext = mime.split("/")[1]?.replace(/[^a-z0-9]/g, "") || "png";
    if (ext === "jpeg") ext = "jpg";
    const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", subdir);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, fileName), bytes);
    return `/uploads/${subdir}/${fileName}`;
}

async function main() {
    let migratedProducts = 0;
    let migratedUsers = 0;

    const products = await prisma.product.findMany({ where: { imageUrl: { startsWith: "data:" } } });
    for (const p of products) {
        const url = await base64ToFile(p.imageUrl, "products");
        if (url) {
            await prisma.product.update({ where: { id: p.id }, data: { imageUrl: url } });
            migratedProducts++;
            console.log(`Produit #${p.id} → ${url}`);
        } else {
            console.warn(`Produit #${p.id} : image base64 illisible, ignoré.`);
        }
    }

    const users = await prisma.user.findMany({ where: { image: { startsWith: "data:" } } });
    for (const u of users) {
        const url = await base64ToFile(u.image, "avatars");
        if (url) {
            await prisma.user.update({ where: { id: u.id }, data: { image: url } });
            migratedUsers++;
            console.log(`Utilisateur #${u.id} → ${url}`);
        } else {
            console.warn(`Utilisateur #${u.id} : image base64 illisible, ignoré.`);
        }
    }

    console.log(`\n✅ Migration terminée : ${migratedProducts} produit(s), ${migratedUsers} utilisateur(s).`);
}

main()
    .catch((e) => { console.error("❌ Erreur migration images :", e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
