import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { buildLanAllowedDevOrigins } from "../shared/next-lan-dev-origins";
import {
  monorepoNextAuthAliases,
  monorepoReactAliases,
} from "../shared/next-monorepo-resolve";
import packageJson from "./package.json";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(appRoot, "..");
const packagesRoot = path.join(monorepoRoot, "packages");

loadEnvConfig(appRoot);

const kaiResolveAlias = {
  "@kai/chile-catalogs": path.join(packagesRoot, "chile-catalogs", "src", "index.ts"),
  "@kai/document-print": path.join(packagesRoot, "document-print", "src", "index.ts"),
  "@kai/print-service-client": path.join(
    packagesRoot,
    "print-service-client",
    "src",
    "index.ts",
  ),
  "@kai/scale-service-client": path.join(
    packagesRoot,
    "scale-service-client",
    "src",
    "index.ts",
  ),
  "@kai/ui$": path.join(packagesRoot, "ui", "src", "index.ts"),
  ...monorepoReactAliases(appRoot),
  ...monorepoNextAuthAliases(appRoot),
};

// Dev: root acotado a la app + alias (menos RAM/watchers). Build: root del monorepo.
const isDev = process.env.NODE_ENV === "development";
const turbopackRoot = isDev ? appRoot : monorepoRoot;

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: turbopackRoot,
    ...(isDev ? { resolveAlias: kaiResolveAlias } : {}),
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
    "@kai/chile-catalogs",
    "@kai/document-print",
    "@kai/print-service-client",
    "@kai/scale-service-client",
    "@kai/ui",
  ],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@kai/ui$": path.join(packagesRoot, "ui", "src", "index.ts"),
      ...monorepoReactAliases(appRoot),
      ...monorepoNextAuthAliases(appRoot),
    };
    return config;
  },
  env: {
    NEXT_PUBLIC_BACKEND_API_URL:
      process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || "",
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  async redirects() {
    return [
      { source: '/ui-components/color-scheme', destination: '/design-system/foundations/colors', permanent: true },
      { source: '/ui-components/card', destination: '/design-system/components/cards', permanent: true },
      { source: '/ui-components', destination: '/design-system/components', permanent: true },
      { source: '/ui-components/:path*', destination: '/design-system/components/:path*', permanent: true },
      { source: '/inventory/products', destination: '/catalog/products', permanent: true },
      { source: '/inventory/products/:path*', destination: '/catalog/products/:path*', permanent: true },
      { source: '/inventory/categories', destination: '/catalog/categories', permanent: true },
      { source: '/inventory/categories/:path*', destination: '/catalog/categories/:path*', permanent: true },
      { source: '/inventory/attributes', destination: '/catalog/attributes', permanent: true },
      { source: '/inventory/attributes/:path*', destination: '/catalog/attributes/:path*', permanent: true },
      { source: '/e-shop/fulfillment/operacion', destination: '/reparto/repartos', permanent: true },
      { source: '/e-shop/fulfillment/calendario', destination: '/reparto/calendario', permanent: true },
      { source: '/e-shop/fulfillment/zonas', destination: '/reparto/zonas', permanent: true },
      { source: '/e-shop/fulfillment/cobertura', destination: '/reparto/cobertura', permanent: true },
      { source: '/e-shop/fulfillment/configuracion', destination: '/reparto/configuracion', permanent: true },
      { source: '/e-shop/fulfillment/reparto', destination: '/reparto/configuracion', permanent: true },
      { source: '/hr/jornada', destination: '/hcm/work-schedules', permanent: true },
      { source: '/hr/jornada/:path*', destination: '/hcm/work-schedules/:path*', permanent: true },
      { source: '/hr/:path*', destination: '/hcm/:path*', permanent: true },
      {
        source: '/hcm/work-schedules/settings',
        destination: '/hcm/settings/jornada',
        permanent: false,
      },
      {
        source: '/hcm/organizational-units',
        destination: '/hcm/settings/organizational-units',
        permanent: true,
      },
      {
        source: '/settings/hcm',
        destination: '/hcm/settings',
        permanent: true,
      },
      {
        source: '/settings/hcm/:path*',
        destination: '/hcm/settings/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
