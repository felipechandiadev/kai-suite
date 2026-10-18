// Cache shell admin (L1) — kai-admin-v2 invalida kai-admin-v1 y flow-admin-*
const CACHE_NAME = "kai-admin-v2";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/logo.png",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/favicon-32x32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || PRECACHE_URLS.includes(url.pathname);
}

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
      }
      return response;
    });
  });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation = request.mode === "navigate" || request.destination === "document";
  if (isNavigation) {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((offline) => offline || Response.error()),
      ),
    );
    return;
  }

  // RSC, API, manifest y demás GET dinámicos van directo a la red sin pasar por el SW.
  if (!isStaticAsset(url)) return;

  event.respondWith(cacheFirst(request).catch(() => Response.error()));
});
