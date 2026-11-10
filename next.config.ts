import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // GitHub raw content (fallback cuando no hay NEXT_PUBLIC_ASSETS_BASE_URL)
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/Ian9Franco/Elseframe-comic-v1/**",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/Ian9Franco/theboyz-comic-v1/**",
      },
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
        pathname: "/gh/Ian9Franco/Elseframe-comic-v1/**",
      },
      // GitHub Pages del repo de imágenes (el sitio viejo theboyz-comic-v1 ya no existe)
      {
        protocol: "https",
        hostname: "ian9franco.github.io",
        pathname: "/Elseframe-comic-v1/**",
      },
      {
        protocol: "https",
        hostname: "ian9franco.github.io",
        pathname: "/theboyz-comic-v1/**",
      },
    ],
  },
};

export default nextConfig;
