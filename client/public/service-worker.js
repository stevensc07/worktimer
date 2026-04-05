const APP_CACHE = 'work-timer-cache-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/icons/icon-192.svg', '/icons/icon-512.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== APP_CACHE).map((key) => caches.delete(key)))
      )
  );

  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const isGet = request.method === 'GET';
  const isHttp = request.url.startsWith('http');
  // No cacheamos API para evitar inconsistencias con datos dinámicos de jornada.
  const isApiCall = request.url.includes('/api/');

  if (!isGet || !isHttp || isApiCall) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();

          caches.open(APP_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });

          return networkResponse;
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});
