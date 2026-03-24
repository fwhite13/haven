const CACHE_NAME = 'haven-v5';
const CONTENT_CACHE = 'haven-content-v5';

const APP_SHELL = [
  '/',
  '/index.html',
  '/app.js',
  '/style.css',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

const CONTENT_FILES = [
  '/content/itinerary.json',
  '/content/gf-guide.json',
  '/content/ports.json',
  '/content/spa.json',
  '/content/entertainment.json',
  '/content/tips.json',
  '/content/navigation.json',
  // Deck plan images
  '/content/deck-plans/Luna-Deck-06-021726.webp',
  '/content/deck-plans/Luna-Deck-07-021726.webp',
  '/content/deck-plans/Luna_Deck_08_12182025.webp',
  '/content/deck-plans/Luna_Deck_09_01202026.webp',
  '/content/deck-plans/Luna_Deck_10_01202026.webp',
  '/content/deck-plans/Luna_Deck_11_01202026.webp',
  '/content/deck-plans/Luna_Deck_12_01202026.webp',
  '/content/deck-plans/Luna_Deck_13_01202026.webp',
  '/content/deck-plans/Luna_Deck_14_01202026.webp',
  '/content/deck-plans/Luna_Deck_15_01202026.webp',
  '/content/deck-plans/Luna_Deck_16_01202026.webp',
  '/content/deck-plans/Luna-Deck-17-022426.webp',
  '/content/deck-plans/Norwegian_Luna_Deck_18_012926.webp',
  '/content/deck-plans/Norwegian_Luna_Deck_19_012926.webp',
  '/content/deck-plans/Luna_Deck_20_01202026.webp',
];

self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)),
      caches.open(CONTENT_CACHE).then(cache => cache.addAll(CONTENT_FILES)),
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== CONTENT_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
     .then(() => self.clients.matchAll().then(clients =>
       clients.forEach(c => c.postMessage({ type: 'CONTENT_UPDATED' }))
     ))
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Stale-while-revalidate for content JSON — serve cached immediately, fetch fresh in background
  if (url.pathname.startsWith('/content/')) {
    event.respondWith(
      caches.open(CONTENT_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          // Fire background fetch to update cache
          const fetchAndUpdate = fetch(event.request).then(res => {
            if (res.ok) cache.put(event.request, res.clone());
            return res;
          });
          // Serve cached version immediately if available, else wait for fetch
          return cached || fetchAndUpdate;
        })
      )
    );
    return;
  }

  // Cache-first for static assets (icons, fonts cached by browser)
  if (url.pathname.startsWith('/icons/') || url.pathname.match(/\.(svg|png|ico)$/)) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // Network-first for app shell
  event.respondWith(
    fetch(event.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match('/index.html')))
  );
});

// ─── Background Sync via message ─────────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SYNC_CONTENT') {
    event.waitUntil(
      caches.open(CONTENT_CACHE).then(cache =>
        Promise.allSettled(
          CONTENT_FILES.map(url =>
            fetch(url, { cache: 'no-store' }).then(res => {
              if (res.ok) cache.put(url, res);
            }).catch(() => {}) // silent fail — offline
          )
        )
      )
    );
  }
});
