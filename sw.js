// A simple Service Worker to pass the mobile PWA requirements

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// THIS IS THE CRITICAL PART FOR MOBILE
self.addEventListener('fetch', (event) => {
    // Just pass the request through to the network normally
    event.respondWith(fetch(event.request));
});