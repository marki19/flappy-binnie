const CACHE_NAME = 'binnie-cache-v1';

// These are the files the phone will download to play offline
const ASSETS = [
  './',
  './index.html',
  './game.js',
  './config.js',
  './assets.js',
  './sprites.js'
];

// Install the service worker and cache the files
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Intercept network requests and serve from cache if offline
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});