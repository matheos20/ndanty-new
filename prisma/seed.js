// prisma/seed.js
// Crée / met à jour le compte administrateur Ndanty en base, avec un mot de passe HACHÉ (bcrypt).
// Le mot de passe en clair n'est utilisé qu'ICI, une seule fois, au seed — jamais au runtime.
//
// Utilisation :
//   npx prisma db seed
//   (lit ADMIN_EMAIL / ADMIN_PASSWORD depuis .env ; si ADMIN_PASSWORD absent, un mot de passe
//    fort est généré et affiché une seule fois.)
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { randomBytes } = require("crypto");

const prisma = new PrismaClient();

function generateStrongPassword() {
    return randomBytes(14).toString("base64url"); // ~18 caractères URL-safe
}

async function main() {
    const email = (process.env.ADMIN_EMAIL || "admin@ndanty.com").trim().toLowerCase();

    let plainPassword = process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim();
    let generated = false;
    if (!plainPassword) {
        plainPassword = generateStrongPassword();
        generated = true;
    }

    const hashed = await bcrypt.hash(plainPassword, 12);
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
        await prisma.user.update({
            where: { email },
            data: {
                role: "ADMIN",
                // On ne réécrit le mot de passe QUE si un ADMIN_PASSWORD explicite est fourni.
                ...(process.env.ADMIN_PASSWORD ? { password: hashed } : {}),
            },
        });
        console.log(`✅ Compte admin existant : rôle ADMIN garanti (${email})`);
    } else {
        await prisma.user.create({
            data: {
                email,
                firstName: "Administrateur",
                lastName: "Ndanty",
                password: hashed,
                role: "ADMIN",
            },
        });
        console.log(`✅ Compte admin créé : ${email}`);
    }

    if (generated) {
        console.log("\n============================================================");
        console.log("🔐 MOT DE PASSE ADMIN GÉNÉRÉ (affiché une seule fois) :");
        console.log(`   ${plainPassword}`);
        console.log("   Notez-le, puis changez-le après connexion.");
        console.log("============================================================\n");
    }
}

main()
    .catch((e) => {
        console.error("❌ Erreur de seed :", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
