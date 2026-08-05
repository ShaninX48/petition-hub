// Minimal service worker. Petition Hub's content changes often (new
// petitions, live signature counts, status changes), so this intentionally
// does NOT cache API/data responses — it only exists to satisfy PWA
// installability requirements and provide a basic offline fallback for the
// app shell itself.

const CACHE_NAME = "petition-hub-shell-v1";
const SHELL_URLS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Network-first: always try the real network so petition data stays
  // live. Only fall back to the cached shell if the network is unreachable
  // (e.g. briefly offline while on the go).
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
