const SHELL_CACHE_NAME = 'spendmic-shell-v6';
const VOICE_CACHE_NAME = 'pocket-tracker-voice-v1';

const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-icon.png',
  '/logo-full.png',
  '/favicon.png',
  '/favicon.svg',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
];

const VOICE_MODEL_ASSETS = [
  '/lib/transformers.min.js',
  '/lib/ort-wasm-simd.wasm',
  '/lib/ort-wasm.wasm',
  '/models/whisper-tiny.en/config.json',
  '/models/whisper-tiny.en/generation_config.json',
  '/models/whisper-tiny.en/preprocessor_config.json',
  '/models/whisper-tiny.en/tokenizer.json',
  '/models/whisper-tiny.en/tokenizer_config.json',
  '/models/whisper-tiny.en/onnx/encoder_model_quantized.onnx',
  '/models/whisper-tiny.en/onnx/decoder_model_merged_quantized.onnx',
];

// Vite gives production JS/CSS files content-hashed names. Cache the names from
// the deployed index page at install time so a successful first online visit can
// reopen offline without guessing those filenames in source code.
async function cacheBuiltAppShell(cache) {
  const response = await fetch('/index.html', { cache: 'no-cache' });
  if (!response.ok) throw new Error('Unable to cache application index.');
  const html = await response.text();
  await cache.put('/index.html', new Response(html, { headers: { 'Content-Type': 'text/html' } }));

  const assetPaths = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+(?:\?[^"#]*)?)"/g)].map((match) => match[1]);
  await Promise.all(assetPaths.map(async (assetPath) => {
    const asset = await fetch(assetPath, { cache: 'no-cache' });
    if (asset.ok) await cache.put(assetPath, asset);
  }));
}

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing offline app shell & voice cache...');
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE_NAME).then(async (cache) => {
        await cache.addAll(APP_SHELL_ASSETS.filter((asset) => asset !== '/index.html'));
        await cacheBuiltAppShell(cache);
      }),
      // Precache voice model assets in background cache
      caches.open(VOICE_CACHE_NAME).then((cache) => {
        return Promise.allSettled(
          VOICE_MODEL_ASSETS.map((url) =>
            fetch(url)
              .then((resp) => {
                if (resp.ok) return cache.put(url, resp);
              })
              .catch((err) => {
                console.warn('[Service Worker] Model asset cache deferred:', url, err);
              })
          )
        );
      }),
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...');
  const expectedCaches = [SHELL_CACHE_NAME, VOICE_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!expectedCaches.includes(cacheName) && !cacheName.includes('transformers')) {
            console.log('[Service Worker] Deleting stale cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never cache or intercept licensing API calls
  if (url.pathname.startsWith('/api/')) return;

  // Cache-first for offline voice models and WebAssembly binaries
  if (url.pathname.startsWith('/models/') || url.pathname.startsWith('/lib/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(VOICE_CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => {
            // Return cached version from any cache if available
            return caches.match(event.request);
          });
      })
    );
    return;
  }

  // App Shell & dynamic assets: Cache with network background update
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(SHELL_CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(SHELL_CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        });
    })
  );
});
