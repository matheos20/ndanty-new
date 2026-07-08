# 💳 Module de Paiement — Guide Sandbox (Projet FANAKA / Ndanty)

> **Mode actuel : SANDBOX 100 % simulé.** Aucune transaction réelle, aucun échange d'argent.
> Toutes les passerelles reproduisent fidèlement le cycle de vie d'un vrai paiement afin de
> tester le tunnel d'achat de bout en bout, sans compte de production.

---

## 1. Vue d'ensemble

| Moyen de paiement | Type | Comportement simulé |
|---|---|---|
| **Monegasy** *(défaut)* | Mobile Money (MVola / Orange / Airtel) | Envoi d'un « push » → confirmation par code **OTP** |
| **Visa** | Carte bancaire | Validation carte synchrone (format + décision) |
| **Mastercard** | Carte bancaire | Validation carte synchrone (format + décision) |
| **PayPal** | Portefeuille | **Redirection** vers un écran d'approbation → capture |
| **Paiement à la livraison** | Espèces | Confirmation sans encaissement en ligne |

Le **stock n'est décrémenté qu'au paiement réussi** (ou à la confirmation COD), ce qui évite toute
fuite de stock si le client abandonne au moment de payer.

---

## 2. 🔑 Identifiants de test

### Monegasy (Mobile Money)
| Champ | Valeur de test |
|---|---|
| Numéro (succès) | N'importe quel numéro malgache valide, ex. `0340000000`, `0320000000`, `0330000000` |
| **Code OTP** | **`123456`** |
| Numéro (échec) | `0340000001` *(compte non enregistré)* |
| OTP incorrect | Tout code ≠ `123456` → échec |

L'opérateur (MVola / Orange / Airtel) est **détecté automatiquement** selon le préfixe
(`034/038` = MVola, `032` = Orange, `033` = Airtel).

### Visa
| Scénario | Numéro de carte |
|---|---|
| ✅ Paiement accepté | `4242 4242 4242 4242` |
| ❌ Carte refusée | `4000 0000 0000 0002` |
| ❌ Fonds insuffisants | `4000 0000 0000 9995` |

### Mastercard
| Scénario | Numéro de carte |
|---|---|
| ✅ Paiement accepté | `5454 5454 5454 5454` |
| ❌ Carte refusée | `5105 1051 0510 5100` |

> Pour les cartes : **date d'expiration future** (ex. `12/30`) et **CVC** à 3 chiffres (ex. `123`).
> Le titulaire est obligatoire. La marque du numéro doit correspondre au moyen choisi
> (un numéro Visa sur l'onglet Mastercard est refusé).

### PayPal
| Champ | Valeur de test |
|---|---|
| Compte acheteur | `acheteur-test@ndanty.mg` |
| Mot de passe | `sandbox123` |
| Approbation | Bouton **« Approuver et payer »** sur l'écran PayPal simulé |
| Annulation | Bouton **« Annuler »** → retour à la boutique, commande non réglée |

> Les montants en **Ariary (MGA)** sont convertis en **USD** pour l'affichage PayPal
> (taux indicatif figé : `1 USD ≈ 4 500 Ar`, voir `MGA_TO_USD_RATE`).

### Paiement à la livraison (COD)
Aucun identifiant : la commande est confirmée immédiatement, le règlement se fait en espèces
à la réception. Statut de commande = `À la livraison`.

---

## 3. 🧪 Simuler un achat (parcours client)

1. Ajouter un produit au panier → **Passer la commande**.
2. Renseigner les informations de livraison → **Continuer vers le paiement**.
3. Sur l'écran `/paiement/[référence]`, choisir un moyen de paiement (Monegasy sélectionné par défaut).
4. Saisir les identifiants de test ci-dessus et valider.
5. En cas de succès : écran de confirmation + statut de la commande mis à jour.
   En cas d'échec : message clair, possibilité de **réessayer** ou de **changer de moyen**.

**Suivi côté admin** (`/admin/orders`) : chaque commande affiche un badge de statut de paiement
(`Payé`, `À la livraison`, `Échec paiement`, `En attente de paiement`) + le moyen utilisé.
Des onglets de filtre permettent de se concentrer sur les commandes **Réglées** (payées ou à la
livraison), les commandes **En attente / Abandon** (non payées ou échouées), ou **Toutes**.
Par défaut, les commandes abandonnées sont masquées.

**Suivi côté client** (`/dashboard` → *Mes Commandes*) : chaque commande affiche son statut de
paiement, et un bouton **« Régler »** permet de **reprendre un paiement** abandonné ou échoué
(redirection vers l'écran de paiement de la commande).

---

## 4. 🏗️ Architecture technique

```
lib/payments/
├── types.ts          # Contrats communs (PaymentGateway, GatewayOutcome…)
├── catalog.ts        # Données d'affichage des 5 moyens (client-safe)
├── sandbox.ts        # Identifiants de test + validateurs (Luhn, MSISDN, OTP…)
├── index.ts          # Registre + références + décrément de stock atomique
├── finalize.ts       # Application du résultat en BDD (payment + order + stock)
└── gateways/
    ├── monegasy.ts   # Mobile Money : initiate (push) → confirm (OTP)
    ├── card.ts       # Visa & Mastercard : validation synchrone
    ├── paypal.ts     # Redirection → capture
    └── cod.ts        # Paiement à la livraison

app/api/payments/
├── route.ts                       # POST — initier un paiement
└── [reference]/confirm/route.ts   # POST — confirmer (OTP / retour PayPal)

app/paiement/
├── [reference]/                   # Écran de paiement (sélection + saisie)
└── paypal-sandbox/                # Écran d'approbation PayPal simulé
```

**Cycle de vie d'une transaction :**

```
Commande créée (PENDING, stock réservé mais non déduit)
        │
        ▼
POST /api/payments  ──► gateway.initiate()
        │
        ├─ Carte / COD : résultat immédiat ─────────────► PAID / A_LA_LIVRAISON
        ├─ Monegasy    : REQUIRES_ACTION (OTP) ─┐
        └─ PayPal      : REDIRECT ──────────────┤
                                                ▼
                          POST /api/payments/[ref]/confirm ──► gateway.confirm()
                                                ▼
                                         PAID / FAILED / CANCELLED
                                                │
                                                ▼
                    finalize.ts : décrément de stock (1 seule fois) + maj statuts
```

**Statuts `payment.status` :** `PENDING · REQUIRES_ACTION · PROCESSING · PAID · FAILED · CANCELLED`
**Statuts `order.paymentStatus` :** `PENDING · PAID · A_LA_LIVRAISON · FAILED`

---

## 5. 🔌 Passage aux vraies passerelles (production)

L'architecture en **adaptateurs** permet de brancher un vrai SDK **sans toucher** au tunnel ni à l'UI :
il suffit de remplacer le corps d'`initiate()` / `confirm()` dans le fichier de la passerelle concernée.

| Passerelle | À faire pour la production |
|---|---|
| **Carte (Visa/MC)** | Créer un compte **Stripe** (mode test gratuit). Dans `gateways/card.ts`, remplacer la validation locale par `stripe.paymentIntents.create()` ; gérer le 3-D Secure via `REQUIRES_ACTION`. Les numéros de test (`4242…`) sont déjà ceux de Stripe. |
| **PayPal** | Créer une app **PayPal Developer** (sandbox gratuit). Dans `gateways/paypal.ts` : `initiate` → `POST /v2/checkout/orders`, renvoyer le lien `approve` ; `confirm` → `POST /v2/checkout/orders/{id}/capture`. Fournir `Client ID` + `Secret` sandbox en variables d'environnement. |
| **Monegasy** | Obtenir un compte marchand + la doc API Monegasy. Dans `gateways/monegasy.ts` : `initiate` → création de transaction avec le MSISDN, `confirm` → vérification OTP **ou** branchement du **webhook de callback** de l'agrégateur. |
| **COD** | Aucun changement (pas d'encaissement en ligne). |

**Variables d'environnement à prévoir** (non requises en sandbox) :
```
# Stripe
STRIPE_SECRET_KEY=sk_test_...
# PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_ENV=sandbox
# Monegasy
MONEGASY_API_KEY=...
MONEGASY_MERCHANT_ID=...
# Base URL (déjà utilisée pour les redirections)
NEXT_PUBLIC_APP_URL=https://www.ndanty.mg
```

---

## 6. ✅ Couverture de test (vérifiée end-to-end)

- Réservation de stock (non décrémenté à la création de commande)
- Visa/Mastercard : succès · refus · fonds insuffisants · mauvaise marque
- Monegasy : push OTP · OTP correct · OTP incorrect
- PayPal : redirection · approbation · annulation
- Paiement à la livraison
- Nouvelle tentative après échec sur la même commande
- Décrément de stock **idempotent** (une seule fois)
- Montant calculé **côté serveur** (anti-triche sur les prix)
