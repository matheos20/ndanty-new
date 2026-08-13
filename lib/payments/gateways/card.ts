// lib/payments/gateways/card.ts
// Passerelle CARTE BANCAIRE simulée (Visa & Mastercard).
// Comportement synchrone : la carte est validée immédiatement lors de l'initiate.
//
// 🔌 Migration vers un vrai PSP (ex : Stripe test mode) :
//    - Remplacer le corps de `initiate` par un appel `stripe.paymentIntents.create({ ... })`
//      avec la clé secrète de test, puis renvoyer { kind: 'REQUIRES_ACTION' } si 3-D Secure.
//    - Les numéros de test Stripe (4242…, 4000…0002) correspondent déjà à TEST_CARDS.

import type { PaymentGateway, InitiateContext, GatewayStepResult } from '../types';
import {
    normalizeCardNumber,
    detectCardBrand,
    isValidLuhn,
    isValidExpiry,
    isValidCvc,
    resolveCardOutcome,
    maskCard,
    type CardBrand,
} from '../sandbox';

function makeCardGateway(key: 'VISA' | 'MASTERCARD', expectedBrand: CardBrand, label: string): PaymentGateway {
    return {
        key,
        label,
        async initiate(ctx: InitiateContext): Promise<GatewayStepResult> {
            const providerRef = `CARD-${ctx.reference}`;
            const { cardNumber, cardName, expMonth, expYear, cvc } = ctx.details || {};

            const number = normalizeCardNumber(cardNumber || '');

            // 1. Validation du format
            if (!cardName || String(cardName).trim().length < 2) {
                return { outcome: { kind: 'FAILED', providerRef, message: 'Nom du titulaire de la carte requis.' } };
            }
            if (!isValidLuhn(number)) {
                return { outcome: { kind: 'FAILED', providerRef, message: 'Numéro de carte invalide.' } };
            }
            if (!isValidExpiry(String(expMonth || ''), String(expYear || ''), new Date())) {
                return { outcome: { kind: 'FAILED', providerRef, message: 'Date d\'expiration invalide ou carte expirée.' } };
            }
            if (!isValidCvc(String(cvc || ''))) {
                return { outcome: { kind: 'FAILED', providerRef, message: 'Cryptogramme (CVC) invalide.' } };
            }

            // 2. Cohérence de la marque avec le moyen choisi
            const brand = detectCardBrand(number);
            if (brand !== expectedBrand) {
                return {
                    outcome: {
                        kind: 'FAILED',
                        providerRef,
                        message: `Ce numéro n'est pas une carte ${label}. Veuillez utiliser une carte ${label} ou changer de moyen de paiement.`,
                    },
                };
            }

            const metadata = {
                brand,
                cardMasked: maskCard(number),
                cardHolder: String(cardName).trim(),
                expiry: `${String(expMonth).padStart(2, '0')}/${expYear}`,
            };

            // 3. Décision simulée selon le numéro de test
            const outcome = resolveCardOutcome(number);
            if (outcome === 'DECLINED') {
                return { outcome: { kind: 'FAILED', providerRef, message: 'Carte refusée par la banque émettrice.' }, metadata };
            }
            if (outcome === 'INSUFFICIENT_FUNDS') {
                return { outcome: { kind: 'FAILED', providerRef, message: 'Provision insuffisante sur la carte.' }, metadata };
            }

            return {
                outcome: { kind: 'PAID', providerRef, message: `Paiement ${label} accepté.` },
                metadata,
            };
        },
    };
}

export const visaGateway = makeCardGateway('VISA', 'VISA', 'Visa');
export const mastercardGateway = makeCardGateway('MASTERCARD', 'MASTERCARD', 'Mastercard');
