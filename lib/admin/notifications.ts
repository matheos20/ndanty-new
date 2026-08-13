// lib/admin/notifications.ts
// Compteurs de « travail en attente » du back-office, affichés en pastilles dans
// la barre latérale et la cloche de la topbar.
//
// Règle de comptage : une pastille ne signale QUE ce qui appelle une action humaine.
// Une commande abandonnée avant paiement n'est pas du travail — elle ne compte pas.

import { prisma } from '@/lib/prisma';

export interface AdminNotificationCounts {
    /** Commandes réglées que l'administrateur n'a pas encore ouvertes. */
    orders: number;
    /** Devis sur mesure en attente d'une proposition. */
    quotes: number;
    /** Avis en file de modération, plus les avis publiés restés sans réponse. */
    reviews: number;
    total: number;
}

export async function getAdminNotifications(): Promise<AdminNotificationCounts> {
    const [orders, quotes, reviews] = await Promise.all([
        prisma.order.count({
            where: {
                isReadByManager: false,
                // Même périmètre que l'onglet « Réglées » du carnet de commandes.
                paymentStatus: { in: ['PAID', 'A_LA_LIVRAISON'] },
            },
        }),
        prisma.quote.count({ where: { status: 'EN_ATTENTE' } }),
        // Deux natures de travail sur les avis : ceux qui bloquent une publication
        // (file de modération) et ceux, déjà en ligne, qui méritent une réponse.
        prisma.review.count({
            where: {
                OR: [
                    { status: 'PENDING' },
                    { status: 'APPROVED', adminReply: null },
                ],
            },
        }),
    ]);

    return { orders, quotes, reviews, total: orders + quotes + reviews };
}
