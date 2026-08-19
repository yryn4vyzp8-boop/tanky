// Minimal TANKY service worker.
//
// The HTML document is deliberately NEVER cached: it references a
// content-hashed JS bundle filename (e.g. entry-<hash>.js) that changes on
// every deploy. A stale cached document pointing at a bundle hash the
// server no longer has causes a permanent blank page — the bundle fetch
// 404s, React never mounts, and no error is visible to the user. This bit
// us in production once already; navigations always go straight to the
// network now, no exceptions.
//
// Static assets (the hashed bundle, images, fonts) ARE safe to cache —
// their filename changes whenever their content does, so a cached copy can
// never go stale under a live filename.

const CACHE_NAME = "tanky-shell-v2";

self.addEventListener("install", (event) => {
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

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    // { cache: "no-store" } bypasses the browser's own HTTP cache too, not
    // just this service worker's — GitHub Pages serves index.html with
    // Cache-Control: max-age=600, which a plain fetch() is otherwise free
    // to honor and return without ever touching the network.
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
