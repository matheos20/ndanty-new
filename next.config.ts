import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // --- Test sur un vrai téléphone, via le réseau local ---
  // En développement, Next.js ne sert ses ressources internes (/_next/*, HMR)
  // qu'aux origines déclarées. Ouvert depuis http://192.168.2.44:3001, le
  // navigateur du téléphone se voyait refuser ces ressources : le HTML
  // s'affichait, mais React n'hydratait jamais la page. Résultat, AUCUN élément
  // interactif ne répondait — menu mobile, panier, favoris, modales de connexion.
  //
  // Cette restriction n'existe qu'en développement : `next start` sert le site
  // à n'importe quelle origine. On déclare donc ici le réseau local privé.
  allowedDevOrigins: [
    "192.168.2.44",
    // Plages d'adresses privées : couvre un changement d'IP du poste (DHCP)
    // et le test depuis un autre appareil du même réseau.
    "192.168.*.*",
    "10.*.*.*",
    "172.16.*.*",
  ],

  experimental: {
    serverActions: {
      // Autorise l'upload d'images "sur mesure" jusqu'à ~5 Mo (défaut = 1 Mo).
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
