import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { buildLanAllowedDevOrigins } from "../shared/next-lan-dev-origins";
import packageJson from "./package.json";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
loadEnvConfig(appRoot);

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  /** Evita que Turbopack use un lockfile padre (p. ej. ~/dev) y agote RAM en dev. */
  turbopack: {
    root: appRoot,
  },
  allowedDevOrigins: buildLanAllowedDevOrigins(),
  env: {
    // URL pública para el navegador (imágenes). No usar BACKEND_API_URL interno (127.0.0.1).
    NEXT_PUBLIC_BACKEND_API_URL:
      process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.BACKEND_API_URL || "",
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  async redirects() {
    return [
      {
        source: "/e-shop/:slug",
        destination: "/",
        permanent: false,
      },
      {
        source: "/e-shop/:slug/:path*",
        destination: "/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
