import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { buildLanAllowedDevOrigins } from "../shared/next-lan-dev-origins";
import packageJson from "./package.json";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
loadEnvConfig(appRoot);

const nextConfig: NextConfig = {
  turbopack: {
    root: appRoot,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: buildLanAllowedDevOrigins(),
  transpilePackages: ["@kai/print-service-client", "@kai/fiscal-ted"],
  env: {
    NEXT_PUBLIC_BACKEND_API_URL:
      process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || "",
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  // (sin configuración experimental por ahora)
};

export default nextConfig;
