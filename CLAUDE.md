# 🛋️ Projet FANAKA — Cahier des Charges Technique & Fonctionnel

Bienvenue dans le dépôt du **Projet FANAKA**, une plateforme e-commerce complète (Web et Mobile) développée pour la marque **Ndanty**. Ce document sert de guide de référence pour l'implémentation technique, le suivi des fonctionnalités et les phases de correctifs.

---

## 🎯 1. Présentation & Objectifs

L'objectif principal est de concevoir une expérience omnicanale (navigateur et smartphone) pour la vente de mobilier et d'articles de maison de la marque **Ndanty**.

* **Vente directe** via un catalogue dynamique de produits standards.
* **Commandes sur mesure** via un tunnel spécifique de demande de devis personnalisé.

### 🎨 Charte Graphique
* **Vert Principal :** `#28a745` (Couleur d'accentuation, boutons d'action primaires)
* **Couleurs Secondaires :** Blanc et Noir

---

## 🛠️ 2. Pile Technologique (Écosystème Full JavaScript)

Pour assurer la performance, l'évolutivité et la réutilisation de la logique métier, l'architecture suivante est retenue :

* **Architecture Web (Front & API) :** `Next.js (React)` — Idéal pour le SEO et l'unification des routes.
* **Application Mobile :** `React Native` — Pour compiler nativement sur iOS et Android en réutilisant le code JavaScript.
* **Base de Données :** `MySQL`.
* **ORM :** `Prisma` — Pour une communication sécurisée et typée entre le code et MySQL.
* **Design / Styles :** `Tailwind CSS` — Pour intégrer rapidement la charte graphique verte.

❌ **Contraintes de l'environnement actuel :** Pas de serveur de production, pas de nom de domaine ou serveur mail d'entreprise, et aucun compte de paiement de production. Le développement et les correctifs se concentrent exclusivement sur des fonctionnalités autonomes et testables en local.

---

## 📑 3. Spécifications Fonctionnelles & Correctifs Locaux

### A. Espace Client (Front-end Web & Mobile)
* **Catalogue Dynamique :** Filtrage des produits selon l'arborescence officielle.
* **Barre de Recherche :** Implémentation d'une recherche produit fonctionnelle permettant de filtrer le catalogue par nom et par catégorie directement via Prisma.
* **Fiche Produit :** Galerie photos, descriptions détaillées, dimensions et action d'ajout au panier.
* **Module "Sur Mesure" :** Formulaire interactif et dynamique en React (dimensions, matériaux, options) générant une demande de devis.
* **Panier & Commande :** Gestion du tunnel d'achat classique et suivi des stocks en temps réel. Intégration du calcul des frais de livraison dynamiques basés sur les quartiers de **Antananarivo** et ses régions dans le calcul du montant total (`totalAmount`).
* **Compte Client & Suivi :** Profil, historique des commandes passées, téléchargement des reçus/factures au format PDF (générés avec `@react-email`), et interface visuelle de suivi de commande (*Préparation ➔ Expédiée ➔ Livrée*).

### B. Espace Administration (Back-office)
* **Gestion du Catalogue :** CRUD complet sur les produits et les catégories.
* **Gestion des Devis :** Interface de consultation des demandes "sur mesure", édition des prix et renvoi des propositions aux clients.
* **Suivi des Ventes & Dashboard :** Tableau de bord financier affichant les revenus théoriques, les commandes actives, les statistiques de vente (graphes de chiffre d'affaires, top produits) et des alertes visuelles en cas de "Stock faible".
* **Cohérence UI :** Harmonisation graphique du back-office avec l'espace client (fiches de détails au clic, statuts unifiés utilisant le vert `#28a745`).

### 💳 C. Passerelles de Paiement & Simulation
Le module de paiement doit intégrer 4 solutions distinctes dans un environnement de test local :

1. **Choix des passerelles :**
   * 🇲🇬 **Monegasy** : Solution de paiement par défaut (Mobile Money et cartes locales).
   * 💳 **Visa** : Option alternative.
   * 💳 **Mastercard** : Option alternative.
   * 🅿️ **PayPal** : Option alternative.
2. **Gestion des Comptes & Tests :**
   * L'ensemble des intégrations se fait en créant des **comptes développeurs gratuits (environnements Sandbox / Testnet)**.
   * Simulation complète des scénarios locaux : Succès du paiement, Échec/Refus de carte, et Annulation par l'utilisateur, déclenchant les Webhooks de test pour mettre à jour la table `Orders`.
3. **Interface Utilisateur (UI/UX) :**
   * Formulaire de sélection clair, épuré et hautement professionnel appliquant la charte graphique **Ndanty** (`#28a745`).

---

## 🔒 4. Sécurité Critique & Dette Technique (Priorités Immédiates)

### 🔴 Sécurité
* **Contrôle d'accès des commandes :** Correction immédiate de la route `app/api/orders/[id]/route.ts`. Réactivation et sécurisation du contrôle d'accès administrateur sur la méthode `PATCH` pour empêcher les modifications anonymes ou non autorisées des statuts de commande.
* **Authentification Admin Robuste :** Remplacement du mot de passe en clair du fichier `.env`. Migration vers une gestion stricte des comptes en base de données via le rôle `ADMIN` avec mot de passe haché (ex: bcrypt). Préparer la structure pour l'intégration future du 2FA.
* **Server Actions & Anti-Spam :** Protection systématique de toutes les Server Actions sensibles (CRUD produits, devis, avis). Ajout d'un système de *rate-limiting* basique côté code sur les routes `/api/orders` et `/api/payments` pour contrer les spams de robots.

### 🔵 Dette Technique & Performance
* **Migration du stockage des Images (Haute Priorité) :** Extraction des images encodées en *LongText (base64)* de la base de données MySQL (`product.imageUrl` et `user.image`) qui surchargent les requêtes. Restructuration du code pour utiliser des chemins d'URL classiques (fichiers locaux ou stockage externe temporaire), en vue d'une future migration vers un CDN (S3, Cloudinary, UploadThing) lors de la mise en production.

### 🟡 Flux Mails, Contenu & SEO (Préparations locales)
* **E-mails transactionnels :** En l'absence de serveur mail de production, concevoir et tester localement l'affichage des templates de mails avec `@react-email` (Confirmation de commande, reçu de paiement, alertes admin, réinitialisation de mot de passe oublié et lien de vérification d'inscription client) afin qu'ils soient prêts à être connectés à un service de routage (ex: Resend) le moment venu.
* **Pages Légales & Footer :** Décommenter le Footer dans `layout.tsx` et préparer l'intégration des pages de contenu obligatoires (CGV, mentions légales, politique de confidentialité, politique de retour).
* **SEO :** Préparer l'intégration des métadonnées par page, du fichier `sitemap.xml`, du `robots.txt` et des données structurées Schema.org pour les produits.

---

## 🗄️ 5. Architecture de la Base de Données (Prisma / MySQL)

Voici les entités principales modélisées dans le fichier `schema.prisma` :

* 👤 **Users** : Données des clients et des administrateurs (Authentification, Rôles: `USER`, `ADMIN`).
* 📁 **Categories** : Les 4 grandes catégories de l'arborescence.
* 📦 **Products** : Catalogue des articles (nom, prix, images sous forme d'URL, stock disponible).
* 🛒 **Orders** : Historique, détails des transactions, adresses/zones de livraison et statut de validation du paiement (`PENDING`, `PAID`, `FAILED`).
* 📝 **Quotes** : Enregistrement des demandes de formulaires personnalisés "sur mesure".

### 🌳 Arborescence des Catégories & Produits
1.  **Chambre à coucher :** *Armoires, Commode & coiffeuses, Lits, Tables de chevet*
2.  **Enfants & adolescents :** *Armoires, Chaises, Lits enfants*
3.  **Salle à manger :** *Chaises, Tables*
4.  **Salon & séjour :** *Buffets, Canapés, Étagères, Tables basses*