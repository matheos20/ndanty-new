// lib/payments/types.ts
// Contrats communs de la couche « passerelle de paiement » du Projet FANAKA (Ndanty).
// Chaque passerelle (Monegasy, Visa, Mastercard, PayPal, COD) implémente PaymentGateway.
// Objectif : brancher un vrai SDK plus tard = remplacer UN fichier d'adaptateur, sans toucher au reste.

export type PaymentMethodKey = 'MONEGASY' | 'VISA' | 'MASTERCARD' | 'PAYPAL' | 'COD';

// Statuts persistés dans la table `payment`
export type PaymentStatus =
    | 'PENDING'
    | 'REQUIRES_ACTION'
    | 'PROCESSING'
    | 'PAID'
    | 'FAILED'
    | 'CANCELLED';

// Résultat d'une étape de passerelle (initiate ou confirm).
// C'est la « machine à états » que le tunnel de paiement interprète.
export type GatewayOutcome =
    // Paiement encaissé avec succès (carte validée, OTP correct, PayPal approuvé…)
    | { kind: 'PAID'; providerRef: string; message?: string }
    // Une action supplémentaire du client est requise (ex : saisir l'OTP Mobile Money)
    | { kind: 'REQUIRES_ACTION'; providerRef: string; action: 'OTP'; message: string }
    // Redirection vers une page d'approbation externe (ex : PayPal)
    | { kind: 'REDIRECT'; providerRef: string; redirectUrl: string; message?: string }
    // Paiement à la livraison confirmé — aucun encaissement en ligne
    | { kind: 'COD'; providerRef: string; message: string }
    // Échec (carte refusée, OTP erroné, fonds insuffisants, annulation…)
    | { kind: 'FAILED'; providerRef?: string; message: string }
    | { kind: 'CANCELLED'; providerRef?: string; message: string };

export interface InitiateContext {
    reference: string; // payment.reference (NDT-...)
    orderId: number;
    amount: number;
    currency: string;
    customerName: string;
    email: string;
    phone: string;
    appUrl: string; // Base URL pour construire les redirections (ex : http://localhost:3001)
    details: Record<string, any>; // Données saisies par le client, propres à la méthode
}

export interface ConfirmContext {
    reference: string;
    orderId: number;
    amount: number;
    providerRef: string | null;
    metadata: Record<string, any>; // Métadonnées mémorisées lors de l'initiate
    input: Record<string, any>; // OTP, décision PayPal (approve/cancel), etc.
}

export interface GatewayStepResult {
    outcome: GatewayOutcome;
    metadata?: Record<string, any>; // Fusionné dans payment.metadata (carte masquée, MSISDN…)
}

export interface PaymentGateway {
    key: PaymentMethodKey;
    label: string;
    /** Démarre la transaction auprès de la passerelle (simulée). */
    initiate(ctx: InitiateContext): Promise<GatewayStepResult>;
    /** Finalise une transaction en attente (OTP Mobile Money, retour PayPal…). Absent = paiement synchrone. */
    confirm?(ctx: ConfirmContext): Promise<GatewayStepResult>;
}
