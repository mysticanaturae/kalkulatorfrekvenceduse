const STATIC_CACHE = 'frekvenca-duse-static-v1';
const DYNAMIC_CACHE = 'frekvenca-duse-dynamic-v1';
const DYNAMIC_CACHE_LIMIT = 30; // največ 30 datotek (slik/mp3)

const staticAssets = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Funkcija za omejitev velikosti cache
const limitCacheSize = async (cacheName, maxItems) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    limitCacheSize(cacheName, maxItems); // rekurzivno dokler ni pod limitom
  }
};

// INSTALL - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(staticAssets))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE - clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// FETCH - static first, potem dynamic za slike/MP3 z omejitvijo
self.addEventListener('fetch', event => {
  const request = event.request;

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Only cache images and mp3 dynamically
        if (request.destination === 'image' || request.url.endsWith('.mp3')) {
          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, responseClone);
            limitCacheSize(DYNAMIC_CACHE, DYNAMIC_CACHE_LIMIT);
          });
        }

        return networkResponse;
      }).catch(() => {
        // Offline fallback for documents
        if (request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});


