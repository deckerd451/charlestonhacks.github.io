const cacheName = 'charlestonhacks-v1';
const assetsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/images/bubbleh.png',
  '/images/bubbleh512.png',
  // Add any other files you want cached here
];

// Install event: cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll(assetsToCache);
    })
  );
});

// Fetch event: serve from cache if offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
