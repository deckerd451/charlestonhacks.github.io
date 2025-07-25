const cacheName = 'charlestonhacks-v40'; // update this on each deploy
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

// On install, cache everything and skip waiting to activate immediately.
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(cacheName).then(cache => cache.addAll(assetsToCache))
  );
});

// On activate, remove old caches and claim clients immediately.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== cacheName)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Stale-while-revalidate fetch strategy for GET requests only
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return; // skip non-GET requests

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Try to fetch from network in background and update cache
      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          // Only cache valid responses
          if (networkResponse && networkResponse.status === 200) {
            caches.open(cacheName).then(cache => cache.put(event.request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse); // fallback to cache if offline

      // Return cached response immediately, or wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
