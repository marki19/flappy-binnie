const CACHE_NAME = 'flappy-binnie-v2';

self.addEventListener('install', (e) => {
    self.skipWaiting(); // Instantly activate the new service worker
});

self.addEventListener('activate', (e) => {
    // Delete old caches when a new version is released
    e.waitUntil(caches.keys().then(keys => Promise.all(
        keys.map(key => {
            if (key !== CACHE_NAME) return caches.delete(key);
        })
    )));
});

self.addEventListener('fetch', (e) => {
    // Ignore database calls
    if (e.request.method !== 'GET' || e.request.url.includes('firestore.googleapis.com')) return;

    e.respondWith(
        // 1. ALWAYS try the network first so you get the newest updates!
        fetch(e.request).then(networkResponse => {
            // If the internet works, save a fresh copy to the offline cache
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
            return networkResponse;
        }).catch(() => {
            // 2. If the internet is down (or local server is off), load the offline save!
            return caches.match(e.request);
        })
    );
});