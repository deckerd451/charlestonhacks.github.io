const cacheName = 'charlestonhacks-v4'; // <-- update version when you deploy
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
  '/teambuilder.html',
  '/techweek.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName).then(cache => cache.addAll(assetsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== cacheName)
            .map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
