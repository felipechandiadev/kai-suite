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
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: turbopackRoot,
    ...(isDev ? { resolveAlias: kaiResolveAlias } : {}),
  },
  allowedDevOrigins: buildLanAllowedDevOrigins(),
  transpilePackages: ["@kai/barcode-scanner", "@kai/ui"],
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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Permissions-Policy", value: "camera=(self)" }],
      },
    ];
  },
  env: {
    NEXT_PUBLIC_BACKEND_API_URL:
      process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || "",
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
};

export default nextConfig;
