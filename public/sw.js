const CACHE_NAME = "fiestify-shell-v1";
const PRECACHE_URLS = [
  "/offline",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/fiestify-mark.png",
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
    // Network-first, falling back to cache only when the network is
    // unavailable — a pure cache-first strategy here would (and did) serve a
    // stale JS/CSS bundle forever once cached, since this cache's key never
    // changes on its own between deploys. Matches the navigate-mode strategy
    // above: always prefer the live version, cache is purely the offline
    // fallback.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((res) => res ?? Response.error())),
    );
  }
});
