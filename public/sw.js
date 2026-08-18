// कैशे (Cache) का नया नाम और वर्ज़न
const CACHE_NAME = 'pragyasuchi-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './images/brand/favicon.svg',
  './images/brand/logo-192.svg',
  './images/brand/logo-512.svg',
  './images/brand/google-mark.svg',
  './images/categories/vegetables.svg',
  './images/categories/grains.svg',
  './images/categories/pulses.svg',
  './images/categories/dairy.svg',
  './images/categories/household.svg',
  './images/og/og-image.svg'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // नया अपडेट आते ही तुरंत लागू करें
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// पुरानी डिज़ाइन (अन्नपूर्णा वाले कैशे) को डिलीट करने का कोड
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('पुराना कैशे डिलीट किया गया:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request).then(networkResponse => {
        if (event.request.method === 'GET' && networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
        }
        return networkResponse;
      }).catch(() => caches.match('./'));
    })
  );
});