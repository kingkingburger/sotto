// Sotto Service Worker — minimal caching (last menu + viewed recipes)
const CACHE_NAME = 'sotto-v2';
const CACHED_PATHS = ['/api/recommend', '/api/grocery'];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache recipe detail pages (GET only)
  if (url.pathname.startsWith('/recipe/') && request.method === 'GET') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cache.match(request))
      )
    );
    return;
  }

  // Cache API responses (POST — stale-while-revalidate pattern)
  if (CACHED_PATHS.some((p) => url.pathname === p) && request.method === 'POST') {
    const cacheKey = new Request(url.pathname, { method: 'GET' });
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        fetch(request)
          .then((response) => {
            if (response.ok) cache.put(cacheKey, response.clone());
            return response;
          })
          .catch(() => cache.match(cacheKey))
      )
    );
    return;
  }
});
