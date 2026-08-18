// Minimal TANKY service worker.
//
// Deliberately network-first: this repo is under active development, so the
// last thing we want is a stale cached bundle masking real edits. This is
// just enough to satisfy PWA "installable" criteria (an active SW + a valid
// manifest) and give a basic offline fallback. A production export should
// layer on Workbox precaching (see docs/pwa.md) for real offline support.

const CACHE_NAME = "tanky-shell-v1";

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
