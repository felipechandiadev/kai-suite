import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { buildLanAllowedDevOrigins } from "../shared/next-lan-dev-origins";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(appRoot, "..");
const packagesRoot = path.join(monorepoRoot, "packages");

const flowstoreResolveAlias = {
  "@flowstore/document-print": path.join(packagesRoot, "document-print", "src", "index.ts"),
  "@flowstore/print-service-client": path.join(
    packagesRoot,
    "print-service-client",
    "src",
    "index.ts",
  ),
  "@flowstore/scale-service-client": path.join(
    packagesRoot,
    "scale-service-client",
    "src",
    "index.ts",
  ),
};

// Dev: root acotado a la app + alias (menos RAM/watchers). Build: root del monorepo.
const isDev = process.env.NODE_ENV === "development";
const turbopackRoot = isDev ? appRoot : monorepoRoot;

const nextConfig: NextConfig = {
  turbopack: {
    root: turbopackRoot,
    ...(isDev ? { resolveAlias: flowstoreResolveAlias } : {}),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: buildLanAllowedDevOrigins(),
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  transpilePackages: [
    "@flowstore/document-print",
    "@flowstore/print-service-client",
    "@flowstore/scale-service-client",
  ],
  env: {
    NEXT_PUBLIC_BACKEND_API_URL:
      process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || "",
  },
  // experimental: { appDir: true },
  async redirects() {
    return [
      { source: '/ui-components/card', destination: '/ui-components/cards', permanent: true },
      { source: '/inventory/products', destination: '/catalog/products', permanent: true },
      { source: '/inventory/products/:path*', destination: '/catalog/products/:path*', permanent: true },
      { source: '/inventory/categories', destination: '/catalog/categories', permanent: true },
      { source: '/inventory/categories/:path*', destination: '/catalog/categories/:path*', permanent: true },
      { source: '/inventory/attributes', destination: '/catalog/attributes', permanent: true },
      { source: '/inventory/attributes/:path*', destination: '/catalog/attributes/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
