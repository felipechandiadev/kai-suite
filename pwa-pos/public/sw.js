// Cache básico para el POS (PWA) — shell offline IF-02
const CACHE_SHELL = "flow-pos-shell-v3";
const CACHE_STATIC = "flow-pos-static-v3";
const CACHE_RSC = "flow-pos-rsc-v3";

const SHELL_PATHS = [
  "/",
  "/pos",
  "/pos/payment",
  "/settings",
  "/settings/local-printing",
  "/offline-fallback.html",
  "/manifest.json",
  "/logo.png",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/favicon-32x32.png",
];

const NAV_TIMEOUT_MS = 3000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_SHELL)
      .then((cache) => cache.addAll(SHELL_PATHS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => ![CACHE_SHELL, CACHE_STATIC, CACHE_RSC].includes(k))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheName, timeoutMs = NAV_TIMEOUT_MS) {
  const cache = await caches.open(cacheName);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("offline");
  }
}

/**
 * Sirve desde cache al instante pero revalida en segundo plano y actualiza la
 * cache. Evita servir chunks obsoletos de `/_next/static/` para siempre (lo que
 * antes provocaba errores de hidratación al editar en desarrollo).
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(req));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    // Archivos de HMR de desarrollo: nunca cachear (siempre red).
    if (url.pathname.includes(".hot-update.")) {
      event.respondWith(fetch(req));
      return;
    }
    event.respondWith(
      staleWhileRevalidate(req, CACHE_STATIC).catch(() => caches.match(req)),
    );
    return;
  }

  if (url.search.includes("_rsc=")) {
    event.respondWith(
      networkFirst(req, CACHE_RSC, NAV_TIMEOUT_MS).catch(
        () => caches.match(req) || caches.match("/offline-fallback.html"),
      ),
    );
    return;
  }

  const isNavigation =
    req.mode === "navigate" || req.destination === "document";
  if (isNavigation) {
    event.respondWith(
      networkFirst(req, CACHE_SHELL, NAV_TIMEOUT_MS)
        .catch(async () => {
          const shell =
            (await caches.match(req.url)) ||
            (await caches.match(url.pathname)) ||
            (await caches.match("/pos")) ||
            (await caches.match("/offline-fallback.html"));
          if (shell) return shell;
          return caches.match("/offline-fallback.html");
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req)),
  );
});
