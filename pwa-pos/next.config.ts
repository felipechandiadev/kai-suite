import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { buildLanAllowedDevOrigins } from "../shared/next-lan-dev-origins";
import packageJson from "./package.json";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(appRoot, "..");
const packagesRoot = path.join(monorepoRoot, "packages");
loadEnvConfig(appRoot);

const kaiResolveAlias = {
  "@kai/ui": path.join(packagesRoot, "ui", "src", "index.ts"),
  "@kai/print-service-client": path.join(
    packagesRoot,
    "print-service-client",
    "src",
    "index.ts",
  ),
  "@kai/fiscal-ted": path.join(packagesRoot, "fiscal-ted", "src", "index.ts"),
  "next-auth": path.join(appRoot, "node_modules/next-auth"),
  "next-auth/react": path.join(appRoot, "node_modules/next-auth/react"),
};

const isDev = process.env.NODE_ENV === "development";
const turbopackRoot = isDev ? appRoot : monorepoRoot;

const nextConfig: NextConfig = {
  turbopack: {
    root: turbopackRoot,
    ...(isDev ? { resolveAlias: kaiResolveAlias } : {}),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: buildLanAllowedDevOrigins(),
  transpilePackages: ["@kai/print-service-client", "@kai/fiscal-ted", "@kai/ui"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "next-auth": path.join(appRoot, "node_modules/next-auth"),
      "next-auth/react": path.join(appRoot, "node_modules/next-auth/react"),
    };
    return config;
  },
  env: {
    NEXT_PUBLIC_BACKEND_API_URL:
      process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || "",
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  // (sin configuración experimental por ahora)
};

export default nextConfig;
