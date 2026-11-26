// Golden's Guzzlers, the app shell. The board always comes from the network. This worker only lets
// the page open when the connection is slow or gone, and lets a phone keep the page as an app.
const SHELL = 'goldens-guzzlers-shell-v2';
const FILES = ['./', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('goldens-guzzlers-') && k !== SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // The board, its live connection, and anything from another site go straight to the network.
  if (url.origin !== self.location.origin || url.pathname.includes('/api/')) return;
  if (req.mode === 'navigate') {
    // The newest page when the network answers, the last one kept when it does not. A fresh address
    // skips the browser's own copy, which can be ten minutes old.
    const fresh = req.url + (req.url.includes('?') ? '&' : '?') + 'sw=' + Date.now();
    event.respondWith(fetch(fresh, { cache: 'no-store' }).then(res => (res.redirected || !res.ok ? fetch(req) : res)).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(SHELL).then(cache => cache.put('./', copy));
      }
      return res;
    }).catch(() => caches.match('./')));
    return;
  }
  event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
