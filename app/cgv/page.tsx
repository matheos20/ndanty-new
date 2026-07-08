import type { Metadata } from "next";
import LegalLayout from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
    title: "Conditions Générales de Vente",
    description: "Conditions Générales de Vente de Ndanty — commandes, prix, livraison, paiement et retours.",
};

export default function CgvPage() {
    return (
        <LegalLayout title="Conditions Générales de Vente" updatedAt="8 juillet 2026">
            <p>
                Les présentes Conditions Générales de Vente (CGV) régissent les ventes de produits proposés par
                <strong> Ndanty</strong> sur son site. Toute commande implique l'acceptation sans réserve des présentes CGV.
            </p>

            <h2>1. Produits</h2>
            <p>
                Les produits proposés sont ceux figurant au catalogue, dans la limite des stocks disponibles. Chaque
                produit est présenté avec un descriptif reprenant ses caractéristiques essentielles (dimensions,
                matériaux, prix). Les commandes « sur mesure » font l'objet d'un devis spécifique.
            </p>

            <h2>2. Prix</h2>
            <p>
                Les prix sont indiqués en Ariary (Ar), toutes taxes comprises. Ndanty se réserve le droit de modifier
                ses prix à tout moment, étant entendu que le prix applicable est celui en vigueur au moment de la commande.
                Des <strong>frais de livraison</strong> s'ajoutent au montant des produits, calculés selon la zone de
                livraison sélectionnée (quartiers d'Antananarivo ou régions de Madagascar).
            </p>

            <h2>3. Commande</h2>
            <p>
                La commande est validée après confirmation du panier, saisie des informations de livraison et choix du
                moyen de paiement. Un récapitulatif détaillé (sous-total, livraison, total) est présenté avant paiement.
            </p>

            <h2>4. Paiement</h2>
            <p>Le paiement s'effectue au choix parmi les moyens proposés :</p>
            <ul>
                <li>Mobile Money via Monegasy (MVola, Orange Money, Airtel Money)</li>
                <li>Carte bancaire Visa ou Mastercard</li>
                <li>PayPal</li>
                <li>Paiement à la livraison (selon éligibilité de la zone)</li>
            </ul>
            <p>
                La commande n'est considérée comme définitive qu'après validation effective du paiement, sauf pour le
                paiement à la livraison.
            </p>

            <h2>5. Livraison</h2>
            <p>
                Les délais de livraison indiqués sont donnés à titre indicatif et varient selon la zone (de 1 à 2 jours
                à Antananarivo, jusqu'à 7 à 10 jours pour certaines régions). Ndanty ne saurait être tenu responsable
                des retards indépendants de sa volonté.
            </p>

            <h2>6. Droit de rétractation et retours</h2>
            <p>
                Le client peut demander le retour d'un produit standard non conforme ou endommagé dans un délai
                raisonnable après réception. Les produits sur mesure, réalisés selon les spécifications du client, ne
                sont ni repris ni échangés, sauf défaut de fabrication.
            </p>

            <h2>7. Service client</h2>
            <p>
                Pour toute réclamation, contactez-nous à <a href="mailto:contact@ndanty.mg">contact@ndanty.mg</a>.
            </p>
        </LegalLayout>
    );
}
