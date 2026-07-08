import type { Metadata } from "next";
import LegalLayout from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
    title: "Mentions légales",
    description: "Mentions légales du site Ndanty — éditeur, hébergement et propriété intellectuelle.",
};

export default function MentionsLegalesPage() {
    return (
        <LegalLayout title="Mentions légales" updatedAt="8 juillet 2026">
            <h2>1. Éditeur du site</h2>
            <p>
                Le présent site est édité par <strong>Ndanty</strong>, entreprise spécialisée dans la vente de
                mobilier et d'articles de maison, dont le siège est situé à Antananarivo, Madagascar.
            </p>
            <ul>
                <li>Raison sociale : Ndanty [à compléter]</li>
                <li>NIF / STAT : [à compléter]</li>
                <li>Adresse : Antananarivo, Madagascar [à compléter]</li>
                <li>Contact : <a href="mailto:contact@ndanty.mg">contact@ndanty.mg</a></li>
            </ul>

            <h2>2. Directeur de la publication</h2>
            <p>Le directeur de la publication est le représentant légal de Ndanty. [à compléter]</p>

            <h2>3. Hébergement</h2>
            <p>
                Le site est hébergé par un prestataire d'hébergement web. [Nom et adresse de l'hébergeur à compléter
                lors de la mise en production.]
            </p>

            <h2>4. Propriété intellectuelle</h2>
            <p>
                L'ensemble des éléments du site (textes, photographies, logos, charte graphique) est la propriété
                exclusive de Ndanty, sauf mention contraire. Toute reproduction ou représentation, totale ou partielle,
                sans autorisation écrite préalable est interdite.
            </p>

            <h2>5. Responsabilité</h2>
            <p>
                Ndanty s'efforce d'assurer l'exactitude des informations diffusées sur le site. Les visuels des
                produits sont fournis à titre indicatif et peuvent légèrement différer du produit livré, notamment
                pour les pièces façonnées à la main.
            </p>

            <h2>6. Contact</h2>
            <p>
                Pour toute question relative au site, vous pouvez nous écrire à
                {" "}<a href="mailto:contact@ndanty.mg">contact@ndanty.mg</a>.
            </p>
        </LegalLayout>
    );
}
