/* SkyShree Realty — minimal service worker for installability + offline shell.
   Uses NETWORK-FIRST so the latest files always load when online; the cache is
   only an offline fallback. Bump CACHE_VERSION to clear old caches. */
const CACHE_VERSION = "skyshree-v1";
const CORE_ASSETS = [
  "./",
  "index.html",
  "style.css",
  "script.js",
  "images/logo.svg",
  "images/logo.jpeg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Only handle same-origin GET; never touch the Google Sheet API or POSTs.
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // Network-first: always try the live file, fall back to cache only when offline.
  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request))
  );
});
