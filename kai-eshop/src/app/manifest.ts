import type { MetadataRoute } from "next";

/** Manifest PWA eShop — instalable en dock / pantalla de inicio. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "kai-eshop",
    name: "KaiStore eShop",
    short_name: "KS Shop",
    description: "Tienda en línea KaiStore",
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
        name: "Inicio",
        short_name: "Inicio",
        description: "Ir al inicio de la tienda",
        url: "/",
        icons: [{ src: "/icons/shortcut-productos.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Productos",
        short_name: "Productos",
        description: "Ver catálogo",
        url: "/productos",
        icons: [{ src: "/icons/shortcut-productos.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
