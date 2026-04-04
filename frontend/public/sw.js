// Service Worker di base per PWA
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
});

self.addEventListener('fetch', (event) => {
  // Cache-first strategy per risorse statiche
  if (event.request.url.includes('/icona.png') ||
      event.request.url.includes('/favicon.svg') ||
      event.request.url.includes('/manifest.json')) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
  }
});