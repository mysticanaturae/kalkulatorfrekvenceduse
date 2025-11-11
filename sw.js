// Tvoji obstoječi static in dynamic cache imeni
const STATIC_CACHE = "static-v2"; // 🔥 povečaš verzijo ob vsaki objavi
const DYNAMIC_CACHE = "dynamic-v2";
const DYNAMIC_CACHE_LIMIT = 50;

// Funkcija za omejevanje velikosti cache-a
function limitCacheSize(name, size) {
  caches.open(name).then(cache => {
    cache.keys().then(keys => {
      if (keys.length > size) {
        cache.delete(keys[0]).then(limitCacheSize(name, size));
      }
    });
  });
}

// ✅ INSTALL
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll([
        "./",
        "./index.html",
        "./manifest.json",
        "./style.css",
        "./script.js",
        "./icon-192.png",
        "./icon-512.png"
      ]);
    })
  );
  self.skipWaiting(); // 🔥 DODANO – nova verzija se aktivira TAKOJ
});

// ✅ ACTIVATE
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim()) // 🔥 DODANO – nova verzija prevzame nadzor
  );
});

// ✅ FETCH
self.addEventListener("fetch", event => {
  const request = event.request;

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;

      return fetch(request)
        .then(networkResponse => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse;
          }

          if (request.destination === "image" || request.url.endsWith(".mp3")) {
            const responseClone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(request, responseClone);
              limitCacheSize(DYNAMIC_CACHE, DYNAMIC_CACHE_LIMIT);
            });
          }

          return networkResponse;
        })
        .catch(() => {
          if (request.destination === "document") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
