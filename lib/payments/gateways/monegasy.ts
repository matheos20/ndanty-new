// lib/payments/gateways/monegasy.ts
// Passerelle MONEGASY simulée — Mobile Money malgache (MVola / Orange Money / Airtel Money).
// Flux en deux temps, fidèle au réel :
//   1) initiate  → « push » envoyé sur le téléphone, on attend l'OTP  (REQUIRES_ACTION)
//   2) confirm   → vérification de l'OTP → PAID ou FAILED
//
// 🔌 Migration vers la vraie API Monegasy :
//    - `initiate` : POST /transaction avec le montant + MSISDN, mémoriser l'ID transaction dans providerRef.
//    - `confirm`  : soit vérifier l'OTP via leur endpoint, soit s'appuyer sur leur webhook de callback.

import type { PaymentGateway, InitiateContext, ConfirmContext, GatewayStepResult } from '../types';
import {
    isValidMsisdn,
    detectOperator,
    MONEGASY_TEST_OTP,
    MONEGASY_FAIL_MSISDN,
    MONEGASY_OPERATORS,
} from '../sandbox';

export const monegasyGateway: PaymentGateway = {
    key: 'MONEGASY',
    label: 'Monegasy',

    async initiate(ctx: InitiateContext): Promise<GatewayStepResult> {
        const providerRef = `MNG-${ctx.reference}`;
        const msisdn = String(ctx.details?.msisdn || '').replace(/\D/g, '');

        if (!isValidMsisdn(msisdn)) {
            return {
                outcome: { kind: 'FAILED', providerRef, message: 'Numéro Mobile Money invalide (attendu : 10 chiffres, ex : 0340000000).' },
            };
        }

        const operatorKey = detectOperator(msisdn);
        const operator = MONEGASY_OPERATORS.find((o) => o.key === operatorKey);
        const metadata = { msisdn, operator: operatorKey, operatorLabel: operator?.label ?? null };

        // Scénario d'échec déterministe (compte non enregistré chez l'opérateur)
        if (MONEGASY_FAIL_MSISDN.includes(msisdn)) {
            return {
                outcome: { kind: 'FAILED', providerRef, message: 'Ce numéro n\'est associé à aucun compte Mobile Money actif.' },
                metadata,
            };
        }

        // « Push » envoyé → on attend la validation par code OTP
        return {
            outcome: {
                kind: 'REQUIRES_ACTION',
                action: 'OTP',
                providerRef,
                message: `Une demande de paiement a été envoyée au ${msisdn} (${operator?.label ?? 'Mobile Money'}). Saisissez le code de confirmation reçu par SMS.`,
            },
            metadata,
        };
    },

    async confirm(ctx: ConfirmContext): Promise<GatewayStepResult> {
        const providerRef = ctx.providerRef ?? `MNG-${ctx.reference}`;
        const otp = String(ctx.input?.otp || '').trim();

        if (!/^\d{6}$/.test(otp)) {
            return { outcome: { kind: 'FAILED', providerRef, message: 'Le code de confirmation doit contenir 6 chiffres.' } };
        }
        if (otp !== MONEGASY_TEST_OTP) {
            return { outcome: { kind: 'FAILED', providerRef, message: 'Code de confirmation incorrect.' } };
        }

        return {
            outcome: { kind: 'PAID', providerRef, message: 'Paiement Mobile Money confirmé.' },
        };
    },
};
