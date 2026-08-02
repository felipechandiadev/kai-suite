// Service worker Waiter — shell L2 + push nativo + click → /salon
const CACHE_NAME = "kai-waiter-v1";
const CORE_ASSETS = [
  "/",
  "/login",
  "/salon",
  "/logo.png",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
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
    event.respondWith(
      fetch(req).catch(() =>
        caches.match("/").then((c) => c || caches.match("/login")),
      ),
    );
    return;
  }

  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});

self.addEventListener("push", (event) => {
  let title = "KaiFood Mesero";
  let body = "";
  let data = { url: "/salon" };
  try {
    const raw = event.data ? event.data.text() : "";
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.title === "string" && parsed.title.trim()) {
          title = parsed.title.trim();
        }
        if (typeof parsed.body === "string") body = parsed.body;
        if (parsed.data && typeof parsed.data === "object") {
          data = { ...data, ...parsed.data };
        }
      }
    }
  } catch {
    // ignore
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data,
      icon: "/android-chrome-192x192.png",
      badge: "/android-chrome-192x192.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl =
    event.notification?.data && typeof event.notification.data.url === "string"
      ? event.notification.data.url
      : "/salon";
  const target = rawUrl.startsWith("/") ? rawUrl : "/salon";

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of all) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client && typeof client.navigate === "function") {
            try {
              await client.navigate(target);
            } catch {
              // ignore
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(target);
      }
    })(),
  );
});
