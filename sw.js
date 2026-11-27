/* Service worker: jaringan dulu, cadangan cache (bisa main solo saat offline) */
const CACHE = 'btd-v5.0.0';
const CORE = ['./', 'index.html', 'css/style.css', 'manifest.webmanifest', 'icons/icon-192.png',
  ...['shared', 'config', 'storage', 'audio', 'game', 'render', 'chars', 'skills', 'skills', 'ui', 'menu', 'dev', 'pwa', 'online', 'main'].map(f => `js/${f}.js`)];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.pathname.startsWith('/api') || (u.origin !== location.origin && !u.hostname.includes('fonts.g'))) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
