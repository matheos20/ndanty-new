// lib/payments/catalog.ts
// Catalogue d'affichage des moyens de paiement (client-safe, aucune logique serveur).
// Sert de source unique pour le sélecteur du tunnel de paiement et l'admin.

import type { PaymentMethodKey } from './types';
import { TEST_CARDS, MONEGASY_TEST_OTP, PAYPAL_SANDBOX_BUYER } from './sandbox';

export interface PaymentMethodInfo {
    key: PaymentMethodKey;
    label: string;
    tagline: string; // Sous-titre affiché sous le nom
    kind: 'MOBILE_MONEY' | 'CARD' | 'WALLET' | 'CASH';
    isDefault?: boolean;
    /** Astuce d'identifiants de test affichée quand la méthode est sélectionnée. */
    testHint: string;
}

export const PAYMENT_METHODS: PaymentMethodInfo[] = [
    {
        key: 'MONEGASY',
        label: 'Monegasy',
        tagline: 'Mobile Money — MVola, Orange & Airtel',
        kind: 'MOBILE_MONEY',
        isDefault: true,
        testHint: `Numéro de test : n'importe quel 034/032/033/038 valide (ex : 0340000000). Code OTP : ${MONEGASY_TEST_OTP}. Pour simuler un échec, utilisez 0340000001.`,
    },
    {
        key: 'VISA',
        label: 'Visa',
        tagline: 'Carte bancaire Visa',
        kind: 'CARD',
        testHint: `Carte acceptée : ${TEST_CARDS.find((c) => c.brand === 'VISA' && c.outcome === 'SUCCESS')?.number}. Carte refusée : 4000 0000 0000 0002. Expiration future, CVC 3 chiffres.`,
    },
    {
        key: 'MASTERCARD',
        label: 'Mastercard',
        tagline: 'Carte bancaire Mastercard',
        kind: 'CARD',
        testHint: `Carte acceptée : ${TEST_CARDS.find((c) => c.brand === 'MASTERCARD' && c.outcome === 'SUCCESS')?.number}. Carte refusée : 5105 1051 0510 5100. Expiration future, CVC 3 chiffres.`,
    },
    {
        key: 'PAYPAL',
        label: 'PayPal',
        tagline: 'Portefeuille PayPal',
        kind: 'WALLET',
        testHint: `Compte acheteur sandbox : ${PAYPAL_SANDBOX_BUYER.email} / ${PAYPAL_SANDBOX_BUYER.password}. Approuvez sur l'écran PayPal simulé pour finaliser.`,
    },
    {
        key: 'COD',
        label: 'Paiement à la livraison',
        tagline: 'Réglez en espèces à la réception',
        kind: 'CASH',
        testHint: "Aucun paiement en ligne : la commande est confirmée et vous réglez à la livraison.",
    },
];

export function getMethodInfo(key: string): PaymentMethodInfo | undefined {
    return PAYMENT_METHODS.find((m) => m.key === key);
}

export const DEFAULT_METHOD: PaymentMethodKey = 'MONEGASY';
