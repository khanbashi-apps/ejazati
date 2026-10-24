const CACHE = 'ejazati-v1.2.0';
const FILES = ['./', 'index.html', 'app.js', 'qr.js', 'manifest.webmanifest', 'thmanyahsans-Regular.woff2', 'thmanyahsans-Bold.woff2',
  'icon-192.png', 'icon-512.png', 'maskable-512.png', 'apple-touch-icon.png', 'favicon-64.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // Admin updates file and admin panel: always straight from the network
  if (url.pathname.endsWith('/updates.json') || url.pathname.includes('/admin')) return;
  const isPage = req.mode === 'navigate' || /\/$|\.html$|\.js$|\.webmanifest$/.test(url.pathname);
  if (isPage) {
    // Network first: always get the latest version when online, cache as offline fallback
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
    return;
  }
  // Fonts and icons: cache first
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(res => {
    if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return res;
  })));
});
