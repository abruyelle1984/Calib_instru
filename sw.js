// TS Check service worker: offline-first app shell.
// Bump VERSION on every release so phones pick up the new files.
const VERSION = "ts-check-v1";
const FILES = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png",
  "./fonts/archivo-latin-400-normal.woff2", "./fonts/archivo-latin-500-normal.woff2",
  "./fonts/archivo-latin-600-normal.woff2", "./fonts/archivo-latin-700-normal.woff2",
  "./fonts/archivo-narrow-latin-500-normal.woff2", "./fonts/archivo-narrow-latin-600-normal.woff2",
  "./fonts/archivo-narrow-latin-700-normal.woff2"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  // Pages: network first (fresh when online), cache when offline.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put("./index.html", copy)); return r; })
      .catch(() => caches.match("./index.html")));
    return;
  }
  // Static files: cache first.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
