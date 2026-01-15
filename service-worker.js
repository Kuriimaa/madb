const CACHE_NAME = 'madb-v1.0.0';
const STATIC_CACHE = 'madb-static-v1.0.0';
const DYNAMIC_CACHE = 'madb-dynamic-v1.0.0';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/css/main.css',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[Service Worker] Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE)
            .map(cacheName => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip caching for external analytics, etc.
  if (url.hostname !== location.hostname && !url.href.includes('cdn.jsdelivr.net')) {
    return;
  }

  // Cache-first strategy for static assets
  if (STATIC_ASSETS.some(asset => request.url.includes(asset))) {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(request)
            .then(response => {
              // Don't cache if not a valid response
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              const responseClone = response.clone();
              caches.open(STATIC_CACHE)
                .then(cache => cache.put(request, responseClone));
              return response;
            })
            .catch(() => {
              // Return offline fallback for HTML pages
              if (request.headers.get('accept').includes('text/html')) {
                return caches.match('/welcome.html');
              }
            });
        })
    );
    return;
  }

  // Network-first strategy for dynamic content (HTML pages)
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then(cache => cache.put(request, responseClone));
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then(response => {
              if (response) {
                return response;
              }
              // Fallback to welcome page if no cached version
              return caches.match('/welcome.html');
            });
        })
    );
    return;
  }

  // Stale-while-revalidate for other resources
  event.respondWith(
    caches.match(request)
      .then(response => {
        const fetchPromise = fetch(request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              const networkResponseClone = networkResponse.clone();
              caches.open(DYNAMIC_CACHE)
                .then(cache => cache.put(request, networkResponseClone));
            }
            return networkResponse;
          })
          .catch(() => {
            // Return cached version if network fails
            return response;
          });

        return response || fetchPromise;
      })
  );
});

// Handle background sync for offline data
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background sync triggered:', event.tag);

  if (event.tag === 'sync-farm-data') {
    event.waitUntil(syncFarmData());
  }
});

// Background sync function (placeholder for future offline data sync)
async function syncFarmData() {
  try {
    console.log('[Service Worker] Syncing farm data...');
    // This could be used to sync IndexedDB data when back online
    // For now, just log the sync attempt
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}

// Handle push notifications (placeholder for future features)
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received:', event);

  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      vibrate: [100, 50, 100],
      data: data.data
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification clicked:', event);
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/dashboard.html')
  );
});
