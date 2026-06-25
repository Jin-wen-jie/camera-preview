// Service Worker — 语音花雨
// Cache static assets for offline use and faster loading

const CACHE_NAME = 'voice-flower-rain-v1';

// Assets to pre-cache on install
const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './src/app.js',
  './src/camera.js',
  './src/captions.js',
  './src/commands.js',
  './src/effects.js',
  './src/utils.js',
  './src/voice-commands.js',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg',
  './assets/og-image.svg'
];

// Install: pre-cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Fetch: cache-first for static assets, network-first for other requests
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip non-HTTP(S) URLs like chrome-extension://
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Cache hit — return cached version
        return cachedResponse;
      }

      // Cache miss — fetch from network
      return fetch(event.request).then((networkResponse) => {
        // Don't cache non-ok responses or opaque responses
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // Clone the response (can only consume a Response once)
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    }).catch(() => {
      // Network failure — return a fallback for navigation requests
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
      return new Response('Offline', { status: 503 });
    })
  );
});
