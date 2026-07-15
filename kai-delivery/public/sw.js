// Cache básico para Kai Delivery (PWA)
const CACHE_NAME = "kai-delivery-v1";
const CORE_ASSETS = [
  "/",
  "/repartos",
  "/login",
  "/manifest.json",
  "/logo.png",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/favicon-32x32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// Estrategia simple:
// - Navegación (HTML): network-first con fallback a '/repartos'
// - Otros: cache-first con fallback a network
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation = req.mode === "navigate" || req.destination === "document";
  if (isNavigation) {
    event.respondWith(fetch(req).catch(() => caches.match("/repartos")));
    return;
  }

  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});
