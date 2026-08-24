const CACHE_NAME = "mehfile-meem-shell-v1";
const PRECACHE_URLS = [
  "/offline",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/mehfile-meem-icon.png",
  "/mehfile-meem-logo-gold.png",
];

// Only ever cache same-origin static assets (images/fonts/CSS/JS) — never
// HTML navigations or API/data requests, so admins can't be served stale
// program/score data while offline. Navigation failures fall back to a
// dedicated /offline page instead.
function isCacheableAsset(request) {
  if (new URL(request.url).origin !== self.location.origin) return false;
  return ["image", "font", "style", "script"].includes(request.destination);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline").then((res) => res ?? Response.error())),
    );
    return;
  }

  if (isCacheableAsset(request)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          }),
      ),
    );
  }
});
