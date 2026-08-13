// prisma/seed-demo.js
// Jeu de FAUSSES DONNÉES de démonstration pour le développement local (Projet FANAKA / Ndanty).
//
//   npm run seed:demo
//
// ⚠️ Ce script est DESTRUCTIF : il purge les données de démo existantes (produits, commandes,
//    paiements, avis, favoris, devis, et tous les comptes NON-ADMIN) avant de réinsérer un jeu
//    complet et cohérent. Le ou les comptes ADMIN sont toujours préservés.
//    À n'utiliser QUE sur la base locale `ndanty_db` — jamais en production.
//
// Les données sont générées avec un PRNG à graine fixe : deux exécutions produisent
// exactement le même jeu (montants, dates, notes), ce qui rend les tests reproductibles.
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// --- Mot de passe commun à tous les comptes clients de démo ---
const DEMO_PASSWORD = "Client1234!";

// --- PRNG déterministe (mulberry32) : pas de Math.random, jeu reproductible ---
let _seed = 20260723;
function rnd() {
    _seed |= 0;
    _seed = (_seed + 0x6d2b79f5) | 0;
    let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const between = (min, max) => min + Math.floor(rnd() * (max - min + 1));

/** Date à N jours dans le passé (heure pseudo-aléatoire mais déterministe). */
function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(between(8, 19), between(0, 59), 0, 0);
    return d;
}

// --- Arborescence officielle Ndanty ---
const CATEGORIES = {
    "Chambre à coucher": ["Armoires", "Commodes & coiffeuses", "Lits", "Tables de chevet"],
    "Enfants & adolescents": ["Armoires enfants", "Chaises & tabourets enfants", "Lits enfants"],
    "Salle à manger": ["Chaises", "Tables à manger"],
    "Salon & séjour": ["Buffets & bahuts", "Canapés", "Étagères murales", "Tables basses"],
};

// --- Visuels ---
// PHOTO_* : les 10 photos réelles déjà présentes dans public/uploads/products, identifiées
//           une à une et affectées au produit dont elles montrent VRAIMENT le meuble.
// Les autres types de meubles (lits, chevets, commode, tabouret…) n'avaient aucune photo :
// ils utilisent des illustrations vectorielles générées dans public/uploads/products/demo/,
// dessinées pour correspondre au titre du produit.
const P = "/uploads/products/";
const PHOTO = {
    armoire3Portes: `${P}1783502476591-7b49926a-043c-4156-91a4-aa8e0e30ea33.jpg`,
    armoireColonne: `${P}1783502476607-bbbd2fe5-20a2-4091-960d-07d019183530.jpg`,
    coiffeuse: `${P}1783502476616-a32ee0a7-a223-478c-a724-c16b379158a4.png`,
    chaiseEnfant: `${P}1783502476626-4d71b8f5-957b-4732-bb62-1ee861cb27e9.png`,
    chaiseRepas: `${P}1783502476638-c975d0ac-6819-4e41-89c7-40979f863f78.jpg`,
    tableRepas: `${P}1783502476651-41e74d42-526f-494d-8d18-739bb716ce54.png`,
    canape: `${P}1783502476669-da9a687b-af62-44f1-b692-bfcfccb4e215.jpg`,
    etagereMurale: `${P}1783502476682-5eb1ba23-e2d8-44df-8489-b6ccb3234bde.webp`,
    tableBasse: `${P}1783502476693-b4cddb4d-7381-42b1-a327-b947cdc37fe6.jpg`,
    vaisselier: `${P}1783502476702-b9b1bd8d-3c7a-472d-9f4c-a4d8010385fe.jpg`,
};
const DRAW = (n) => `${P}demo/${n}.svg`;

// --- Catalogue : prix en Ariary (MGA), stocks volontairement variés (dont stock faible) ---
// Chaque produit porte SON visuel : le meuble affiché correspond au titre.
const PRODUCTS = [
    // Chambre à coucher
    { name: "Armoire Ambatolampy 3 portes", category: "Chambre à coucher", subcategory: "Armoires", price: 1850000, stock: 6, image: PHOTO.armoire3Portes,
      description: "Armoire en palissandre massif à trois portes battantes, penderie et quatre étagères réglables. Finition huilée mate. Dimensions : L 180 × P 60 × H 210 cm." },
    { name: "Armoire Vohitra 2 portes coulissantes", category: "Chambre à coucher", subcategory: "Armoires", price: 2200000, stock: 3, image: DRAW("armoire-coulissante"),
      description: "Portes coulissantes sur rail silencieux avec miroir pleine hauteur. Structure en bois de manguier. Dimensions : L 200 × P 62 × H 220 cm." },
    { name: "Commode Antsahavola 6 tiroirs", category: "Chambre à coucher", subcategory: "Commodes & coiffeuses", price: 780000, stock: 11, image: DRAW("commode"),
      description: "Six tiroirs sur glissières métalliques, poignées laiton brossé. Idéale en complément d'une armoire. Dimensions : L 120 × P 45 × H 85 cm." },
    { name: "Coiffeuse Ravinala avec miroir", category: "Chambre à coucher", subcategory: "Commodes & coiffeuses", price: 950000, stock: 4, image: PHOTO.coiffeuse,
      description: "Coiffeuse en bois clair avec grand miroir, tiroir compartimenté et tabouret assorti inclus. Dimensions : L 100 × P 40 × H 145 cm." },
    { name: "Lit Andasibe 160×200", category: "Chambre à coucher", subcategory: "Lits", price: 2400000, stock: 5, image: DRAW("lit-double"),
      description: "Lit double en palissandre avec tête de lit capitonnée lin beige et sommier à lattes massives. Matelas non inclus. Dimensions : L 175 × P 210 × H 110 cm." },
    { name: "Lit Nosy Be 140×190", category: "Chambre à coucher", subcategory: "Lits", price: 1750000, stock: 2, image: DRAW("lit-double-clair"),
      description: "Lit deux places au design épuré, pieds fuselés et sommier à lattes intégré. Bois de manguier huilé. Dimensions : L 152 × P 200 × H 95 cm." },
    { name: "Table de chevet Isalo", category: "Chambre à coucher", subcategory: "Tables de chevet", price: 285000, stock: 24, image: DRAW("chevet"),
      description: "Chevet compact à un tiroir et une niche ouverte. Se marie avec toute la collection Isalo. Dimensions : L 45 × P 38 × H 55 cm." },
    { name: "Table de chevet Tsara suspendue", category: "Chambre à coucher", subcategory: "Tables de chevet", price: 340000, stock: 9, image: DRAW("chevet-suspendu"),
      description: "Chevet mural flottant, un tiroir push-to-open, libère l'espace au sol. Dimensions : L 50 × P 35 × H 22 cm." },

    // Enfants & adolescents
    { name: "Armoire enfant Kintana 2 portes", category: "Enfants & adolescents", subcategory: "Armoires enfants", price: 890000, stock: 7, image: DRAW("armoire-enfant"),
      description: "Armoire à hauteur d'enfant, deux portes et bac à jouets accessible. Peinture sans solvant, certifiée sans danger. Dimensions : L 100 × P 50 × H 160 cm." },
    { name: "Armoire colonne Soa", category: "Enfants & adolescents", subcategory: "Armoires enfants", price: 1150000, stock: 3, image: PHOTO.armoireColonne,
      description: "Armoire colonne peu encombrante : une porte pleine, penderie haute et deux tiroirs en partie basse. Idéale pour une chambre d'adolescent. Dimensions : L 60 × P 55 × H 200 cm." },
    { name: "Chaise enfant Vola", category: "Enfants & adolescents", subcategory: "Chaises & tabourets enfants", price: 145000, stock: 32, image: PHOTO.chaiseEnfant,
      description: "Chaise en pin massif, assise ergonomique adaptée aux 3–8 ans. Empilable. Dimensions : L 32 × P 34 × H 58 cm." },
    { name: "Tabouret enfant Faniry", category: "Enfants & adolescents", subcategory: "Chaises & tabourets enfants", price: 98000, stock: 41, image: DRAW("tabouret-enfant"),
      description: "Tabouret trois pieds ultra-léger, verni non toxique. Parfait comme marchepied. Dimensions : Ø 30 × H 32 cm." },
    { name: "Lit enfant Zaza 90×190", category: "Enfants & adolescents", subcategory: "Lits enfants", price: 980000, stock: 8, image: DRAW("lit-enfant"),
      description: "Lit simple avec barrière de sécurité amovible et sommier à lattes. Bois de pin massif. Dimensions : L 100 × P 200 × H 75 cm." },
    { name: "Lit superposé Mitsinjo", category: "Enfants & adolescents", subcategory: "Lits enfants", price: 1650000, stock: 2, image: DRAW("lit-superpose"),
      description: "Lit superposé deux couchages 90×190 avec échelle inclinée et garde-corps renforcé. Charge max 90 kg par couchage. Dimensions : L 200 × P 100 × H 165 cm." },

    // Salle à manger
    { name: "Chaise Antananarivo dossier haut", category: "Salle à manger", subcategory: "Chaises", price: 320000, stock: 48, image: PHOTO.chaiseRepas,
      description: "Chaise à dossier haut galbé, structure et assise en bois massif teinté noyer. Vendue à l'unité. Dimensions : L 45 × P 50 × H 108 cm." },
    { name: "Chaise Betsileo rembourrée", category: "Salle à manger", subcategory: "Chaises", price: 395000, stock: 26, image: DRAW("chaise-rembourree"),
      description: "Assise et dossier rembourrés, revêtement tissu déperlant anthracite. Vendue à l'unité. Dimensions : L 47 × P 52 × H 90 cm." },
    { name: "Table à manger Mahajanga 6 places", category: "Salle à manger", subcategory: "Tables à manger", price: 1950000, stock: 4, image: PHOTO.tableRepas,
      description: "Table 6 places en bois massif avec insert vitré central. Les six chaises assorties sont incluses. Dimensions : L 180 × P 90 × H 76 cm." },
    { name: "Table à manger Toliara extensible", category: "Salle à manger", subcategory: "Tables à manger", price: 2450000, stock: 2, image: DRAW("table-extensible"),
      description: "Table extensible de 6 à 10 couverts grâce à une allonge centrale escamotable. Dimensions : L 160→220 × P 95 × H 76 cm." },
    { name: "Table à manger ronde Sakalava", category: "Salle à manger", subcategory: "Tables à manger", price: 1450000, stock: 5, image: DRAW("table-ronde"),
      description: "Table ronde 4 places, pied central tulipe en bois tourné. Convivialité maximale dans les petits espaces. Dimensions : Ø 120 × H 75 cm." },

    // Salon & séjour
    { name: "Buffet Analakely 4 portes", category: "Salon & séjour", subcategory: "Buffets & bahuts", price: 1680000, stock: 5, image: DRAW("buffet-bas"),
      description: "Buffet bas quatre portes avec deux tiroirs à couverts feutrés. Façades à moulures fines. Dimensions : L 180 × P 45 × H 80 cm." },
    { name: "Bahut Ambohimanga vitré", category: "Salon & séjour", subcategory: "Buffets & bahuts", price: 2100000, stock: 3, image: PHOTO.vaisselier,
      description: "Vaisselier haut à portes vitrées, niche centrale ouverte et poignées laiton. Finition laquée noire. Dimensions : L 140 × P 42 × H 195 cm." },
    { name: "Canapé Ampefy 3 places", category: "Salon & séjour", subcategory: "Canapés", price: 3200000, stock: 3, image: PHOTO.canape,
      description: "Canapé trois places, mousse haute densité 35 kg/m³, revêtement lin lavable déhoussable. Structure et accoudoirs en bois massif. Dimensions : L 210 × P 92 × H 85 cm." },
    { name: "Canapé d'angle Manakara", category: "Salon & séjour", subcategory: "Canapés", price: 4850000, stock: 1, image: DRAW("canape-angle"),
      description: "Angle réversible cinq places avec méridienne et coffre de rangement sous assise. Tissu velours côtelé vert forêt. Dimensions : L 270 × P 175 × H 88 cm." },
    { name: "Fauteuil Ranomafana", category: "Salon & séjour", subcategory: "Canapés", price: 1250000, stock: 9, image: DRAW("fauteuil"),
      description: "Fauteuil enveloppant à oreilles, assise profonde et coussin lombaire fourni. Dimensions : L 78 × P 85 × H 100 cm." },
    { name: "Étagère murale Ankarana 4 niveaux", category: "Salon & séjour", subcategory: "Étagères murales", price: 460000, stock: 18, image: PHOTO.etagereMurale,
      description: "Ensemble d'étagères murales en U, fixations invisibles fournies. Charge max 15 kg par niveau. Dimensions : L 100 × P 25 × H 120 cm." },
    { name: "Étagère échelle Tsingy", category: "Salon & séjour", subcategory: "Étagères murales", price: 520000, stock: 12, image: DRAW("etagere-echelle"),
      description: "Étagère inclinée style échelle, cinq plateaux dégressifs. Se pose simplement contre le mur. Dimensions : L 60 × P 40 × H 180 cm." },
    { name: "Table basse Andringitra", category: "Salon & séjour", subcategory: "Tables basses", price: 720000, stock: 14, image: PHOTO.tableBasse,
      description: "Table basse rectangulaire à plateau relevable et rangement intérieur. Finition bois clair et anthracite. Dimensions : L 110 × P 60 × H 42 cm." },
    { name: "Table basse ronde Mangoro", category: "Salon & séjour", subcategory: "Tables basses", price: 640000, stock: 2, image: DRAW("table-basse-ronde"),
      description: "Plateau rond en bois de manguier veiné, piètement trépied scandinave. Dimensions : Ø 80 × H 40 cm." },
];

// --- Clients de démonstration ---
const CUSTOMERS = [
    { firstName: "Hery", lastName: "Rakotomalala", email: "hery.rakoto@example.mg", address: "Lot II M 45 bis, Analamahitsy" },
    { firstName: "Mialy", lastName: "Randrianasolo", email: "mialy.randria@example.mg", address: "Villa Soa, Ankorondrano Est" },
    { firstName: "Tojo", lastName: "Rabemananjara", email: "tojo.rabe@example.mg", address: "Lot IVK 12, Ambohipo" },
    { firstName: "Fanja", lastName: "Andriamihaja", email: "fanja.andria@example.mg", address: "Immeuble Fitiavana, Antanimena" },
    { firstName: "Naina", lastName: "Ratsimbazafy", email: "naina.ratsimba@example.mg", address: "Lot 07 A, Tanjombato" },
    { firstName: "Lova", lastName: "Rasoanaivo", email: "lova.rasoa@example.mg", address: "Rue Ratsimilaho, Antaninarenina" },
    { firstName: "Tiana", lastName: "Razafindrakoto", email: "tiana.razaf@example.mg", address: "Lot II F 88, Itaosy" },
    { firstName: "Miora", lastName: "Andrianarisoa", email: "miora.andria@example.mg", address: "Cité Planton, Antsirabe" },
];

// --- Zones de livraison (ids alignés sur lib/delivery.ts) ---
const ZONES = [
    { id: "tana-centre", fee: 5000 },
    { id: "tana-ankorondrano", fee: 7000 },
    { id: "tana-analamahitsy", fee: 8000 },
    { id: "tana-ambohipo", fee: 7000 },
    { id: "tana-itaosy", fee: 9000 },
    { id: "tana-tanjombato", fee: 8000 },
    { id: "reg-antsirabe", fee: 25000 },
    { id: "reg-toamasina", fee: 40000 },
    { id: "reg-mahajanga", fee: 50000 },
];

const PAYMENT_METHODS = ["MONEGASY", "VISA", "MASTERCARD", "PAYPAL", "COD"];

const REVIEW_COMMENTS = [
    ["Superbe finition, le bois est magnifique et l'odeur du palissandre embaume la pièce. Livraison à Tana en deux jours comme annoncé.", 5],
    ["Très satisfaite de mon achat. Le montage était simple, la notice claire. Un tout petit défaut de vernis sur un angle, rien de grave.", 4],
    ["Qualité au rendez-vous pour le prix. Je recommande sans hésiter, l'équipe Ndanty a été de bon conseil au téléphone.", 5],
    ["Conforme aux dimensions annoncées. La couleur est un peu plus foncée que sur les photos mais cela reste très joli.", 4],
    ["Livraison en région un peu longue (une semaine), mais le produit est arrivé parfaitement emballé et sans aucune rayure.", 4],
    ["Solide et bien pensé. Utilisé tous les jours depuis trois mois, aucun jeu dans les assemblages.", 5],
    ["Correct dans l'ensemble, mais je m'attendais à un rembourrage plus ferme. À voir dans la durée.", 3],
    ["Exactement ce que je cherchais pour ma chambre. Le rapport qualité-prix est imbattable à Madagascar.", 5],
    ["Bel objet mais un tiroir coulissait mal à la réception. Le SAV est passé le régler rapidement, donc pas de souci final.", 4],
];

const QUOTES = [
    { customerName: "Herizo Rakotoarisoa", email: "herizo.rakoto@example.mg", phone: "+261 34 12 345 67",
      details: "Je souhaite une bibliothèque sur mesure pour un mur de 3,20 m de large et 2,60 m de haut, en palissandre, avec une échelle coulissante et deux caissons fermés en partie basse.",
      dimensions: "320 × 40 × 260 cm", status: "EN_ATTENTE" },
    { customerName: "Vonjy Andrianina", email: "vonjy.andria@example.mg", phone: "+261 33 88 221 04",
      details: "Table de salle à manger pour 12 personnes, plateau d'un seul tenant si possible, piètement métal noir. Pour une salle de réception à Ivato.",
      dimensions: "300 × 110 × 76 cm", status: "PROPOSE", proposedPrice: 4850000,
      adminResponse: "Bonjour, merci pour votre demande. Un plateau d'un seul tenant de 3 m est réalisable en palissandre (délai 5 semaines). Le devis inclut le piètement acier thermolaqué noir et la livraison à Ivato." },
    { customerName: "Sitraka Ramanandraibe", email: "sitraka.raman@example.mg", phone: "+261 32 45 678 90",
      details: "Dressing d'angle sur mesure pour une chambre parentale, avec portes coulissantes miroir, penderie double et 8 tiroirs.",
      dimensions: "240 × 180 × 250 cm (angle)", status: "PROPOSE", proposedPrice: 6200000,
      adminResponse: "Bonjour, voici notre proposition pour le dressing d'angle avec façades miroir. Le prix comprend la pose sur site à Antananarivo et une garantie de 2 ans sur les rails." },
    { customerName: "Nirina Razanamalala", email: "nirina.razana@example.mg", phone: "+261 34 55 903 12",
      details: "Lit d'enfant en forme de cabane avec toit en bois et petite étagère intégrée sur le côté. Peinture blanche non toxique.",
      dimensions: "90 × 190 cm (couchage), hauteur 160 cm", status: "ACCEPTE", proposedPrice: 1420000,
      adminResponse: "Bonjour, le lit cabane est réalisable avec une peinture à l'eau certifiée jouet (norme EN 71-3). Délai 3 semaines.",
      clientDecision: "ACCEPTE", clientResponse: "Parfait, je valide la proposition. Merci de me confirmer la date de livraison." },
    { customerName: "Fetra Rakotondrabe", email: "fetra.rakoton@example.mg", phone: "+261 33 21 445 78",
      details: "Comptoir de bar en bois massif pour un espace professionnel, avec passe-plat et rangement bouteilles à l'arrière.",
      dimensions: "260 × 70 × 110 cm", status: "REFUSE", proposedPrice: 5300000,
      adminResponse: "Bonjour, voici notre chiffrage pour le comptoir de bar avec rangement intégré et plan de travail traité hydrofuge.",
      clientDecision: "REFUSE", clientResponse: "Merci pour votre retour, le budget dépasse malheureusement ce que nous avions prévu pour ce poste." },
    { customerName: "Antsa Rabearison", email: "antsa.rabea@example.mg", phone: "+261 34 77 012 39",
      details: "Ensemble de 6 chaises assorties à une table existante en bois de rose, dossier cannage. Merci de me dire si vous pouvez matcher la teinte à partir d'une photo.",
      dimensions: "Assise standard 45 cm", status: "EN_ATTENTE" },
];

async function purge() {
    // Ordre de suppression : enfants d'abord (les FK sont en Cascade, mais on reste explicite).
    await prisma.paymentevent.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.orderitem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.review.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.product.deleteMany();
    await prisma.subcategory.deleteMany();
    await prisma.category.deleteMany();
    // On préserve systématiquement les comptes administrateurs.
    const removed = await prisma.user.deleteMany({ where: { role: { not: "ADMIN" } } });
    console.log(`🧹 Purge terminée (${removed.count} compte(s) client supprimé(s), admins préservés).`);
}

async function main() {
    console.log("🌱 Génération des données de démonstration Ndanty…\n");
    await purge();

    // --- 1. Taxonomie ---
    for (const [name, subs] of Object.entries(CATEGORIES)) {
        await prisma.category.create({
            data: { name, subcategory: { create: subs.map((s) => ({ name: s })) } },
        });
    }
    console.log(`📁 ${Object.keys(CATEGORIES).length} catégories et ${Object.values(CATEGORIES).flat().length} sous-catégories créées.`);

    // --- 2. Produits ---
    const products = [];
    for (const { image, ...p } of PRODUCTS) {
        products.push(
            await prisma.product.create({
                data: {
                    ...p,
                    imageUrl: image,
                    rating: Number((3.5 + rnd() * 1.5).toFixed(1)),
                    createdAt: daysAgo(between(30, 240)),
                },
            }),
        );
    }
    console.log(`📦 ${products.length} produits créés (dont ${products.filter((p) => p.stock <= 3).length} en stock faible).`);

    // --- 3. Clients ---
    const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);
    const users = [];
    for (const c of CUSTOMERS) {
        users.push(
            await prisma.user.create({
                data: { ...c, password: hashed, role: "USER", country: "Madagascar", createdAt: daysAgo(between(60, 300)) },
            }),
        );
    }
    console.log(`👤 ${users.length} comptes clients créés (mot de passe commun : ${DEMO_PASSWORD}).`);

    // --- 4. Commandes + lignes + paiements ---
    // Répartition des statuts pensée pour alimenter le dashboard admin :
    // de l'historique livré, des commandes en cours, un échec et une annulation.
    const ORDER_PLAN = [
        { status: "LIVREE", paymentStatus: "PAID", days: 172 },
        { status: "LIVREE", paymentStatus: "PAID", days: 151 },
        { status: "LIVREE", paymentStatus: "PAID", days: 133 },
        { status: "LIVREE", paymentStatus: "PAID", days: 118 },
        { status: "LIVREE", paymentStatus: "PAID", days: 96 },
        { status: "LIVREE", paymentStatus: "PAID", days: 84 },
        { status: "LIVREE", paymentStatus: "PAID", days: 67 },
        { status: "LIVREE", paymentStatus: "PAID", days: 55 },
        { status: "LIVREE", paymentStatus: "PAID", days: 41 },
        { status: "EXPEDIEE", paymentStatus: "PAID", days: 12 },
        { status: "EXPEDIEE", paymentStatus: "PAID", days: 9 },
        { status: "EN_PREPARATION", paymentStatus: "PAID", days: 6 },
        { status: "EN_PREPARATION", paymentStatus: "A_LA_LIVRAISON", days: 4, method: "COD" },
        { status: "EN_ATTENTE", paymentStatus: "PENDING", days: 2 },
        { status: "EN_ATTENTE", paymentStatus: "PENDING", days: 1 },
        { status: "ANNULEE", paymentStatus: "FAILED", days: 21 },
        { status: "ANNULEE", paymentStatus: "FAILED", days: 8 },
    ];

    let orderCount = 0;
    let eventCount = 0;
    for (let i = 0; i < ORDER_PLAN.length; i++) {
        const plan = ORDER_PLAN[i];
        const user = users[i % users.length];
        const zone = pick(ZONES);
        const method = plan.method || pick(PAYMENT_METHODS.filter((m) => m !== "COD"));
        const createdAt = daysAgo(plan.days);

        // 1 à 3 lignes distinctes par commande.
        const lineCount = between(1, 3);
        const chosen = [];
        while (chosen.length < lineCount) {
            const p = pick(products);
            if (!chosen.some((c) => c.id === p.id)) chosen.push(p);
        }
        const items = chosen.map((p) => ({
            productId: p.id,
            name: p.name,
            price: p.price,
            quantity: p.price > 1500000 ? 1 : between(1, 4),
        }));
        const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
        const totalAmount = subtotal + zone.fee;
        const ref = `NDT-${String(1000 + i)}-${String(createdAt.getFullYear()).slice(2)}`;

        const order = await prisma.order.create({
            data: {
                userId: user.id,
                customerName: `${user.firstName} ${user.lastName}`,
                email: user.email,
                phone: `+261 3${between(2, 4)} ${between(10, 99)} ${between(100, 999)} ${between(10, 99)}`,
                address: user.address,
                totalAmount,
                deliveryZone: zone.id,
                deliveryFee: zone.fee,
                status: plan.status,
                paymentStatus: plan.paymentStatus,
                paymentMethod: method,
                paymentRef: ref,
                stockDeducted: plan.paymentStatus === "PAID" || plan.paymentStatus === "A_LA_LIVRAISON",
                isReadByManager: plan.days > 7,
                createdAt,
                updatedAt: createdAt,
                orderitem: { create: items },
            },
        });

        // Paiement associé (sandbox), sauf pour les commandes encore en attente de choix.
        if (plan.paymentStatus !== "PENDING") {
            const paid = plan.paymentStatus === "PAID";
            const failed = plan.paymentStatus === "FAILED";
            const payment = await prisma.payment.create({
                data: {
                    orderId: order.id,
                    method,
                    status: paid ? "PAID" : failed ? "FAILED" : "PENDING",
                    amount: totalAmount,
                    currency: "MGA",
                    reference: `${ref}-PAY`,
                    providerRef: paid ? `SBX-${between(100000, 999999)}` : null,
                    isSandbox: true,
                    errorMessage: failed ? "Sandbox : paiement refusé par l'émetteur (fonds insuffisants)." : null,
                    metadata: JSON.stringify(
                        method === "MONEGASY"
                            ? { operateur: "Mvola", msisdn: `034****${between(10, 99)}` }
                            : method === "PAYPAL"
                                ? { paypalEmail: user.email }
                                : method === "COD"
                                    ? { note: "Règlement à la livraison" }
                                    : { card: `**** **** **** ${between(1000, 9999)}` },
                    ),
                    attempts: failed ? 2 : 1,
                    createdAt,
                    updatedAt: createdAt,
                    paidAt: paid ? createdAt : null,
                },
            });

            // Journal d'audit : reconstitue le parcours réel de la transaction
            // (initiation, éventuelle action client, dénouement, et un webhook sur les
            // paiements en ligne encaissés) pour que /admin/payments soit démonstrable.
            const events = [
                {
                    type: "INITIATED",
                    source: "SYSTEM",
                    status: "PROCESSING",
                    message: `Tentative n°1 — ${totalAmount.toLocaleString("fr-FR")} Ar`,
                    offsetMs: 0,
                },
            ];
            if (method === "MONEGASY") {
                events.push({
                    type: "REQUIRES_ACTION",
                    source: "SYSTEM",
                    status: "REQUIRES_ACTION",
                    message: "Code de confirmation envoyé par SMS au client.",
                    offsetMs: 4000,
                });
                events.push({
                    type: "CONFIRMED",
                    source: "SYSTEM",
                    status: "PROCESSING",
                    message: "Confirmation soumise par le client.",
                    offsetMs: 42000,
                });
            } else if (method === "PAYPAL") {
                events.push({
                    type: "REDIRECTED",
                    source: "SYSTEM",
                    status: "PROCESSING",
                    message: "Client redirigé vers la page d'approbation PayPal.",
                    offsetMs: 3000,
                });
            }

            if (paid) {
                events.push({
                    type: "PAID",
                    source: "SYSTEM",
                    status: "PAID",
                    message: "Paiement encaissé.",
                    offsetMs: 60000,
                });
                events.push({
                    type: "WEBHOOK_RECEIVED",
                    source: "WEBHOOK",
                    status: "PAID",
                    message: "payment.succeeded — Encaissement confirmé par la passerelle (webhook).",
                    payload: { eventId: `evt_demo_${i}`, type: "payment.succeeded" },
                    offsetMs: 63000,
                });
            } else if (failed) {
                events.push({
                    type: "FAILED",
                    source: "SYSTEM",
                    status: "FAILED",
                    message: "Sandbox : paiement refusé par l'émetteur (fonds insuffisants).",
                    offsetMs: 52000,
                });
            } else {
                events.push({
                    type: "COD",
                    source: "SYSTEM",
                    status: "PENDING",
                    message: "Règlement à la livraison confirmé.",
                    offsetMs: 2000,
                });
            }

            for (const e of events) {
                await prisma.paymentevent.create({
                    data: {
                        paymentId: payment.id,
                        type: e.type,
                        source: e.source,
                        method,
                        status: e.status,
                        message: e.message,
                        payload: e.payload ? JSON.stringify(e.payload) : null,
                        createdAt: new Date(createdAt.getTime() + e.offsetMs),
                    },
                });
                eventCount++;
            }
        }
        orderCount++;
    }
    console.log(`🛒 ${orderCount} commandes créées avec leurs lignes et paiements sandbox.`);
    console.log(`📜 ${eventCount} événements écrits dans le journal des transactions.`);

    // --- 5. Avis clients (couples produit/client uniques) ---
    let reviewCount = 0;
    const usedPairs = new Set();
    for (let i = 0; i < 22; i++) {
        const product = pick(products);
        const user = pick(users);
        const key = `${product.id}-${user.id}`;
        if (usedPairs.has(key)) continue;
        usedPairs.add(key);

        const [comment, rating] = pick(REVIEW_COMMENTS);
        const createdAt = daysAgo(between(3, 120));
        const withReply = rnd() < 0.35;
        await prisma.review.create({
            data: {
                productId: product.id,
                userId: user.id,
                rating,
                comment,
                createdAt,
                adminReply: withReply
                    ? "Merci beaucoup pour votre retour ! Toute l'équipe Ndanty vous remercie de votre confiance et reste à votre disposition."
                    : null,
                adminReplyAt: withReply ? new Date(createdAt.getTime() + 86400000) : null,
            },
        });
        reviewCount++;
    }
    console.log(`⭐ ${reviewCount} avis clients créés.`);

    // --- 6. Favoris ---
    let favCount = 0;
    const usedFavs = new Set();
    for (let i = 0; i < 20; i++) {
        const product = pick(products);
        const user = pick(users);
        const key = `${product.id}-${user.id}`;
        if (usedFavs.has(key)) continue;
        usedFavs.add(key);
        await prisma.favorite.create({
            data: { productId: product.id, userId: user.id, createdAt: daysAgo(between(1, 90)) },
        });
        favCount++;
    }
    console.log(`❤️  ${favCount} favoris créés.`);

    // --- 7. Devis sur mesure ---
    for (let i = 0; i < QUOTES.length; i++) {
        const q = QUOTES[i];
        const createdAt = daysAgo(between(2, 75));
        const proposed = q.proposedPrice != null;
        await prisma.quote.create({
            data: {
                customerName: q.customerName,
                email: q.email,
                phone: q.phone,
                details: q.details,
                dimensions: q.dimensions,
                status: q.status,
                createdAt,
                proposedPrice: q.proposedPrice ?? null,
                adminResponse: q.adminResponse ?? null,
                proposedAt: proposed ? new Date(createdAt.getTime() + 2 * 86400000) : null,
                clientDecision: q.clientDecision ?? null,
                clientResponse: q.clientResponse ?? null,
                clientRespondedAt: q.clientDecision ? new Date(createdAt.getTime() + 4 * 86400000) : null,
                responseToken: proposed ? `demo-token-${i}-${between(100000, 999999)}` : null,
            },
        });
    }
    console.log(`📝 ${QUOTES.length} demandes de devis sur mesure créées.`);

    // --- Récapitulatif ---
    const revenue = await prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { paymentStatus: { in: ["PAID", "A_LA_LIVRAISON"] } },
    });
    console.log("\n============================================================");
    console.log("✅ Jeu de démonstration prêt.");
    console.log(`   Chiffre d'affaires encaissé simulé : ${Math.round(revenue._sum.totalAmount || 0).toLocaleString("fr-FR")} MGA`);
    console.log(`   Connexion client de test : ${CUSTOMERS[0].email} / ${DEMO_PASSWORD}`);
    console.log("============================================================\n");
}

main()
    .catch((e) => {
        console.error("❌ Erreur de seed démo :", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
