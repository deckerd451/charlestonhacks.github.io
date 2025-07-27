// ✅ service-worker.js — CharlestonHacks Safe Caching

const cacheName = 'charlestonhacks-v61'; // 🔁 Update this on each deploy

const assetsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/main.js',
  '/index.js',
  '/ho-script.js',
  '/favicon.ico',
  '/manifest.json',
  '/images/bubbleh.png',
  '/images/bubbleh512.png',
  '/h-favicon-01.png',
  // HTML pages
  '/2card.html',
  '/Poster.html',
  '/cardmatchgame.html',
  '/docs.html',
  '/hacknights24.html',
  '/hackops.html',
  '/harborhack23.html',
  '/harborhack24.html',
  '/innovationengine.html',
  '/meetupmashup.html',
  '/news.html',
  '/profiles.html',
  '/subscribe.html',
  '/summerhack.html',
  '/swag.html',
  '/techweek.html'
];

// ✅ On install: Cache all core assets
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(cacheName).then(cache => {
      return Promise.all(
        assetsToCache.map(asset =>
          fetch(asset).then(response => {
            if (!response.ok) throw new Error(`❌ Failed to cache ${asset}`);
            return cache.put(asset, response.clone());
          }).catch(err => {
            console.warn('⚠️ Skipped caching:', asset, err.message);
          })
        )
      );
    })
  );
});

// ✅ On activate: Clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== cacheName).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ✅ On fetch: Stale-while-revalidate strategy
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const cloned = networkResponse.clone();
          caches.open(cacheName).then(cache => {
            cache.put(event.request, cloned);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
