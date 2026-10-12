// RideNDine Driver App Service Worker
const CACHE_NAME = 'ridendine-driver-v2';
const STATIC_ASSETS = [
  '/offline.html',
  '/logo-icon.png',
];

// Install: cache static assets only (never cache dynamic authenticated routes)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches (including v1)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API and HTML navigation; cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Non-GET API requests: pass through to the network with clean offline error
  if (event.request.method !== 'GET') {
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(
        fetch(event.request).catch(() => new Response(
          JSON.stringify({ error: 'You appear to be offline. Reconnect and try again.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        ))
      );
    }
    return;
  }

  // Network-first for API calls — never serve stale API data
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(JSON.stringify({ error: 'offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }))
    );
    return;
  }

  // HTML navigation requests: strictly network-first so authentication redirects and
  // live SSR views are never trapped in a stale cache.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const offlineMatch = await caches.match('/offline.html');
        return offlineMatch || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      })
    );
    return;
  }

  // Cache-first strategy for static assets (images, static files, offline.html)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (response.ok && (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/))) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return new Response('', { status: 408 });
        });
    })
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'RideNDine';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/logo-icon.png',
    badge: '/logo-icon.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
