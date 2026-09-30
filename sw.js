// TS Check service worker: offline-first app shell.
// Bump VERSION on every release so phones pick up the new files,
// and set the same value in APP_VERSION at the top of app.js (shown in the app).
const VERSION = "ts-check-v5";
const FILES = [
  "./", "./index.html", "./app.js", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png",
  "./fonts/archivo-latin-400-normal.woff2", "./fonts/archivo-latin-500-normal.woff2",
  "./fonts/archivo-latin-600-normal.woff2", "./fonts/archivo-latin-700-normal.woff2",
  "./fonts/archivo-narrow-latin-500-normal.woff2", "./fonts/archivo-narrow-latin-600-normal.woff2",
  "./fonts/archivo-narrow-latin-700-normal.woff2"
];
self.addEventListener("install", e => {
  // cache:"reload" bypasses the browser HTTP cache (GitHub Pages caches files ~10 min),
  // so a new version never gets installed with stale files.
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
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
    e.respondWith(fetch(req.url, { cache: "no-cache" }).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put("./index.html", copy)); return r; })
      .catch(() => caches.match("./index.html")));
    return;
  }
  // Static files: cache first.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});

self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });
