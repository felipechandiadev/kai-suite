import type { MetadataRoute } from "next";
import { resolveKaiProductId } from "@/config/product-brand.config";

function productShortPrefix(): "KS" | "KF" | "KV" {
  const id = resolveKaiProductId(process.env.NEXT_PUBLIC_KAI_PRODUCT);
  if (id === "kaifood") return "KF";
  if (id === "kaiservices") return "KV";
  return "KS";
}

function productAdminName(): string {
  const id = resolveKaiProductId(process.env.NEXT_PUBLIC_KAI_PRODUCT);
  if (id === "kaifood") return "KaiFood Administración";
  if (id === "kaiservices") return "Kai Services Administración";
  if (id === "kaisuite") return "Kai Administración";
  return "KaiStore Administración";
}

/** Manifest PWA: `id` estable; `short_name` según producto de build. */
export default function manifest(): MetadataRoute.Manifest {
  const prefix = productShortPrefix();
  return {
    id: "kai-admin",
    name: productAdminName(),
    short_name: `${prefix} Admin`,
    description: "Panel de administración Kai",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#002B59",
    lang: "es-CL",
    icons: [
      { src: "/favicon-16x16.png", sizes: "16x16", type: "image/png", purpose: "any" },
      { src: "/favicon-32x32.png", sizes: "32x32", type: "image/png", purpose: "any" },
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/android-chrome-192x192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/android-chrome-512x512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/logo-app.png", sizes: "1024x1024", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      {
        name: "Panel",
        short_name: "Panel",
        description: "Ir al panel principal",
        url: "/dashboard",
        icons: [{ src: "/icons/shortcut-dashboard.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Productos",
        short_name: "Productos",
        description: "Catálogo de productos",
        url: "/catalog/products",
        icons: [{ src: "/icons/shortcut-dashboard.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
