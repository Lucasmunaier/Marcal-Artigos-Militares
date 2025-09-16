// sw.js

const CACHE_NAME = 'marcal-artigos-cache-v1';
const APP_SHELL_URLS = [
    '/',
    '/index.html',
    '/index.css',
    '/index.tsx', // This will be the JS bundle in a real build
    'https://icqaffyqnwuetfnslcif.supabase.co/storage/v1/object/public/site-assets/icon.png'
];

// Install event: Pre-cache the application shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Opened cache and caching app shell');
            return cache.addAll(APP_SHELL_URLS).catch(error => {
                console.error('Failed to cache app shell:', error);
            });
        })
    );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Fetch event: Serve from cache or network
self.addEventListener('fetch', event => {
    const { request } = event;

    // Strategy 1: Network First for navigation requests (HTML pages)
    // Ensures the user always gets the latest version of the app shell if online.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // If the fetch is successful, cache it and return it.
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseToCache);
                    });
                    return response;
                })
                .catch(() => {
                    // If the network fails, serve the cached index.html.
                    return caches.match('/');
                })
        );
        return;
    }

    // Strategy 2: Stale-While-Revalidate for assets (images, fonts, etc.)
    // This provides a fast response from the cache while updating it in the background.
    if (request.destination === 'image' || request.destination === 'font') {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(request).then(cachedResponse => {
                    const fetchPromise = fetch(request).then(networkResponse => {
                        // If the fetch is successful, update the cache.
                        cache.put(request, networkResponse.clone());
                        return networkResponse;
                    });

                    // Return the cached response immediately if available, otherwise wait for the network.
                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }
    
    // Default: Just fetch from the network for other requests (e.g., Supabase API calls)
    event.respondWith(fetch(request));
});
