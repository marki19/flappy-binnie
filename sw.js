// A simple service worker just to pass the PWA requirements
self.addEventListener('install', (e) => {
    console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
    // Just passes requests through normally
});