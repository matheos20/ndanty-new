import type { Metadata } from "next";
import LegalLayout from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
    title: "Politique de confidentialité",
    description: "Politique de confidentialité de Ndanty — données collectées, finalités et droits des utilisateurs.",
};

export default function ConfidentialitePage() {
    return (
        <LegalLayout title="Politique de confidentialité" updatedAt="8 juillet 2026">
            <p>
                Ndanty accorde une grande importance à la protection de vos données personnelles. La présente politique
                décrit les données collectées, leur utilisation et vos droits.
            </p>

            <h2>1. Données collectées</h2>
            <ul>
                <li>Identité et contact : nom, prénom, adresse e-mail, numéro de téléphone.</li>
                <li>Livraison : adresse et zone de livraison.</li>
                <li>Commandes : historique d'achats, montants, statuts de paiement.</li>
                <li>Compte : mot de passe (stocké de façon <strong>chiffrée / haché</strong>, jamais en clair).</li>
            </ul>

            <h2>2. Finalités</h2>
            <p>Vos données sont utilisées pour :</p>
            <ul>
                <li>traiter et livrer vos commandes ;</li>
                <li>gérer votre compte client et votre historique ;</li>
                <li>répondre à vos demandes de devis « sur mesure » ;</li>
                <li>vous informer sur l'état de vos commandes.</li>
            </ul>

            <h2>3. Paiements</h2>
            <p>
                Les informations de paiement sont traitées par les prestataires de paiement (Monegasy, Visa/Mastercard,
                PayPal). Ndanty ne stocke pas les numéros complets de carte bancaire ; seules des données masquées
                (ex. •••• 4242) peuvent être conservées à des fins de suivi de transaction.
            </p>

            <h2>4. Conservation</h2>
            <p>
                Les données sont conservées le temps nécessaire aux finalités décrites, puis archivées ou supprimées
                conformément aux obligations légales applicables.
            </p>

            <h2>5. Cookies</h2>
            <p>
                Le site utilise des cookies strictement nécessaires à son fonctionnement (session de connexion, panier).
                Aucun cookie publicitaire tiers n'est déposé sans votre consentement.
            </p>

            <h2>6. Vos droits</h2>
            <p>
                Vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Pour exercer ces
                droits, écrivez-nous à <a href="mailto:contact@ndanty.mg">contact@ndanty.mg</a>.
            </p>
        </LegalLayout>
    );
}
