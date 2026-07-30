// Cache shell Kai Delivery (L1)
const CACHE_NAME = "kai-delivery-v1";
const CORE_ASSETS = [
  "/",
  "/repartos",
  "/login",
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

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname === "/manifest.json" || url.pathname === "/manifest.webmanifest") {
    event.respondWith(fetch(req));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(req));
    return;
  }

  const isNavigation = req.mode === "navigate" || req.destination === "document";
  if (isNavigation) {
    event.respondWith(fetch(req).catch(() => caches.match("/repartos")));
    return;
  }

  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});
