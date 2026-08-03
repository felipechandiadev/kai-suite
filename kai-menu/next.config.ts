import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { buildLanAllowedDevOrigins } from "../shared/next-lan-dev-origins";
import { monorepoReactAliases } from "../shared/next-monorepo-resolve";
import packageJson from "./package.json";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(appRoot, "..");
const packagesRoot = path.join(monorepoRoot, "packages");
loadEnvConfig(appRoot);

const kaiResolveAlias = {
  "@kai/ui$": path.join(packagesRoot, "ui", "src", "index.ts"),
  ...monorepoReactAliases(appRoot),
};

const isDev = process.env.NODE_ENV === "development";
const turbopackRoot = isDev ? appRoot : monorepoRoot;

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: turbopackRoot,
    ...(isDev ? { resolveAlias: kaiResolveAlias } : {}),
  },
  typescript: { ignoreBuildErrors: true },
  allowedDevOrigins: buildLanAllowedDevOrigins(),
  transpilePackages: ["@kai/ui"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@kai/ui$": path.join(packagesRoot, "ui", "src", "index.ts"),
      ...monorepoReactAliases(appRoot),
    };
    return config;
  },
  env: {
    NEXT_PUBLIC_BACKEND_API_URL:
      process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || "",
    NEXT_PUBLIC_MENU_STORE_SLUG:
      process.env.NEXT_PUBLIC_MENU_STORE_SLUG || process.env.MENU_STORE_SLUG || "kai-food",
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_KAI_PRODUCT: "kaifood",
  },
};

export default nextConfig;
