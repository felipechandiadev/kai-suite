import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { buildLanAllowedDevOrigins } from "../shared/next-lan-dev-origins";

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
  transpilePackages: ["@flowstore/print-service-client"],
  env: {
    NEXT_PUBLIC_BACKEND_API_URL:
      process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || "",
  },
  // (sin configuración experimental por ahora)
};

export default nextConfig;
