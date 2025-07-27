const cacheName = 'charlestonhacks-v60'; // Increment this for each deploy

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

// Install: cache everything immediately
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(cacheName).then(cache => cache.addAll(assetsToCache))
  );
});

// Activate: clean up old caches
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

// Fetch: stale-while-revalidate strategy
self.addEventListener('fetch', event => {
  // Skip non-GET or Supabase magic link requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/auth/v1/magiclink')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          // Only cache same-origin, successful, unconsumed responses
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const cloned = networkResponse.clone();
            caches.open(cacheName).then(cache => cache.put(event.request, cloned));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse); // Use cache if offline

      return cachedResponse || fetchPromise;
    })
  );
});
