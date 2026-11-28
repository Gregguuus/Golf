// Service worker : l'app fonctionne même avec un réseau faible sur le parcours.
const CACHE = 'mongolf-v4';
const SHELL = ['./', 'index.html', 'style.css', 'icons.js', 'app.js', 'lib/maplibre-gl.js', 'lib/maplibre-gl.css', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'courses/index.json'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const tile = u.hostname === 'server.arcgisonline.com';
  const own = u.origin === location.origin && !u.pathname.includes('/signets/');
  if (!own && !tile) return;
  if (tile) { // tuiles satellite : cache d'abord (le plan reste visible si le réseau faiblit)
    e.respondWith(caches.open('mongolf-tiles').then(async (c) => (await c.match(e.request)) || fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; })));
    return;
  }
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
