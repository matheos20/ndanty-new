import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Autorise l'upload d'images "sur mesure" jusqu'à ~5 Mo (défaut = 1 Mo).
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
