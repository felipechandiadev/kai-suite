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
  "@kai/ui$": path.join(packagesRoot, "ui", "src", "index.ts"),
  "@kai/barcode-scanner$": path.join(
    packagesRoot,
    "barcode-scanner",
    "src",
    "index.ts",
  ),
  "@kai/barcode-scanner/camera$": path.join(
    packagesRoot,
    "barcode-scanner",
    "src",
    "camera.ts",
  ),
  "@kai/chile-catalogs": path.join(packagesRoot, "chile-catalogs", "src", "index.ts"),
  "@kai/customer-display-client": path.join(
    packagesRoot,
    "customer-display-client",
    "src",
    "index.ts",
  ),
  "@kai/document-print": path.join(packagesRoot, "document-print", "src", "index.ts"),
  "@kai/print-service-client": path.join(
    packagesRoot,
    "print-service-client",
    "src",
    "index.ts",
  ),
  "@kai/fiscal-ted": path.join(packagesRoot, "fiscal-ted", "src", "index.ts"),
  "@undecaf/zbar-wasm$": path.join(
    monorepoRoot,
    "node_modules/@undecaf/zbar-wasm/dist/inlined/index.mjs",
  ),
  ...monorepoReactAliases(appRoot),
  ...monorepoNextAuthAliases(appRoot),
};

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
  transpilePackages: [
    "@kai/barcode-scanner",
    "@kai/chile-catalogs",
    "@kai/customer-display-client",
    "@kai/document-print",
    "@kai/print-service-client",
    "@kai/fiscal-ted",
    "@kai/ui",
  ],
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@kai/ui$": path.join(packagesRoot, "ui", "src", "index.ts"),
      "@kai/barcode-scanner$": path.join(
        packagesRoot,
        "barcode-scanner",
        "src",
        "index.ts",
      ),
      "@kai/barcode-scanner/camera$": path.join(
        packagesRoot,
        "barcode-scanner",
        "src",
        "camera.ts",
      ),
      // Browser inlined build — avoids Node `import('module')` in main.mjs
      "@undecaf/zbar-wasm$": path.join(
        monorepoRoot,
        "node_modules/@undecaf/zbar-wasm/dist/inlined/index.mjs",
      ),
      ...monorepoReactAliases(appRoot),
      ...monorepoNextAuthAliases(appRoot),
    };
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        module: false,
        fs: false,
        path: false,
      };
    }
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
  env: {
    NEXT_PUBLIC_BACKEND_API_URL:
      process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || "",
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
};

export default nextConfig;
