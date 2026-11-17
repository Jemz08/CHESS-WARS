/* eslint-disable no-restricted-globals */
/**
 * Wizard Chess 3D — Service Worker (Asset Caching & Live Version Checker)
 * - Caches 3D models (.glb, .gltf, .obj, .mtl), audio SFX, textures, UI icons, and fonts
 *   using Stale-While-Revalidate for fast loads and offline resilience.
 * - Uses Network-First with Cache Fallback for HTML/JS/CSS shell files.
 * - Checks /api/version on load & on demand, notifying clients with NEW_VERSION_AVAILABLE
 *   so players can refresh game state in-place without a manual APK update.
 */

const SHELL_CACHE_NAME = 'wizard-chess-shell-v3';
const ASSET_CACHE_NAME = 'wizard-chess-assets-v3';
const FONT_CACHE_NAME = 'wizard-chess-fonts-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icon-192.svg',
  '/assets/icon-512.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png'
];

function isGameStaticAsset(url) {
  const p = url.pathname.toLowerCase();
  return (
    p.startsWith('/assets/') ||
    p.startsWith('/sfx/') ||
    p.endsWith('.glb') ||
    p.endsWith('.gltf') ||
    p.endsWith('.bin') ||
    p.endsWith('.obj') ||
    p.endsWith('.mtl') ||
    p.endsWith('.mp3') ||
    p.endsWith('.wav') ||
    p.endsWith('.ogg') ||
    p.endsWith('.png') ||
    p.endsWith('.jpg') ||
    p.endsWith('.jpeg') ||
    p.endsWith('.webp') ||
    p.endsWith('.svg') ||
    p.endsWith('.woff2') ||
    p.endsWith('.woff')
  );
}

function isFontRequest(url) {
  return (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  );
}

function isBypassRequest(url, request) {
  if (request.method !== 'GET') return true;
  const p = url.pathname.toLowerCase();
  if (
    p.startsWith('/api/') ||
    p.startsWith('/ws') ||
    p.includes('hot-update') ||
    p.includes('@vite') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com')
  ) {
    return true;
  }
  return false;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          PRECACHE_URLS.map((u) =>
            fetch(u, { cache: 'reload' }).then((res) => {
              if (res && res.ok) {
                return cache.put(u, res);
              }
              return undefined;
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

const IS_CAPACITOR_LOCAL =
  (self.location.hostname === 'localhost' ||
    self.location.hostname.endsWith('.localhost')) &&
  self.location.port === '';

self.addEventListener('activate', (event) => {
  if (IS_CAPACITOR_LOCAL) {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.registration.unregister())
    );
    return;
  }
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (
              key !== SHELL_CACHE_NAME &&
              key !== ASSET_CACHE_NAME &&
              key !== FONT_CACHE_NAME
            ) {
              return caches.delete(key);
            }
            return undefined;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (IS_CAPACITOR_LOCAL) {
    return;
  }

  const { request } = event;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (isBypassRequest(url, request)) {
    return;
  }

  // 1. Google Fonts: Cache-First for fast typography rendering
  if (isFontRequest(url)) {
    event.respondWith(
      caches.open(FONT_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response && (response.ok || response.type === 'opaque')) {
            cache.put(request, response.clone());
          }
          return response;
        } catch (err) {
          if (cached) return cached;
          throw err;
        }
      })
    );
    return;
  }

  // Only handle same-origin requests beyond this point
  if (url.origin !== self.location.origin) {
    return;
  }

  // 2. 3D Models, Audio SFX, Textures & Icons: Stale-While-Revalidate in ASSET_CACHE_NAME
  if (isGameStaticAsset(url)) {
    event.respondWith(
      caches.open(ASSET_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((networkRes) => {
            if (networkRes && networkRes.ok && networkRes.status === 200) {
              cache.put(request, networkRes.clone());
            }
            return networkRes;
          })
          .catch(() => null);

        if (cached) {
          return cached;
        }
        const netRes = await networkPromise;
        if (netRes) return netRes;
        return new Response('Offline asset unavailable', { status: 503 });
      })
    );
    return;
  }

  // 3. App Shell, Navigation, & JS/CSS Bundles: Network-First with Cache Fallback (never return 404 on navigation)
  event.respondWith(
    caches.open(SHELL_CACHE_NAME).then(async (cache) => {
      try {
        const fetchTarget =
          request.mode === 'navigate' && url.pathname === '/'
            ? '/index.html'
            : request;
        const networkRes = await fetch(fetchTarget);
        if (networkRes && networkRes.ok && networkRes.status === 200) {
          cache.put(request, networkRes.clone());
          return networkRes;
        }
        const cached = await cache.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const fallbackIndex =
            (await cache.match('/index.html')) || (await cache.match('/'));
          if (fallbackIndex) return fallbackIndex;
        }
        return networkRes;
      } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const fallbackIndex =
            (await cache.match('/index.html')) || (await cache.match('/'));
          if (fallbackIndex) return fallbackIndex;
        }
        return new Response('Offline — please reconnect to load Wizard Chess.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })
  );
});

async function checkServerVersionAndNotify(knownBuildId, sourceClient) {
  try {
    const res = await fetch(`/api/version?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!res.ok) return;
    const data = await res.json();
    const remoteBuildId = data && data.buildId ? String(data.buildId) : '';
    if (!remoteBuildId) return;

    const isNewer = Boolean(knownBuildId && knownBuildId !== remoteBuildId);
    const payload = {
      type: isNewer ? 'NEW_VERSION_AVAILABLE' : 'VERSION_UP_TO_DATE',
      buildId: remoteBuildId,
      previousBuildId: knownBuildId || remoteBuildId
    };

    if (sourceClient && typeof sourceClient.postMessage === 'function') {
      sourceClient.postMessage(payload);
    }

    if (isNewer) {
      const allClients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: 'window'
      });
      for (const client of allClients) {
        if (client !== sourceClient) {
          client.postMessage(payload);
        }
      }
    }
  } catch {
    // Offline or transient network error — keep serving cached assets
  }
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data.type !== 'string') return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (data.type === 'CHECK_FOR_VERSION_UPDATE') {
    event.waitUntil(
      checkServerVersionAndNotify(data.currentBuildId || '', event.source)
    );
  } else if (data.type === 'PURGE_SHELL_CACHE') {
    event.waitUntil(
      caches
        .delete(SHELL_CACHE_NAME)
        .then(() => self.skipWaiting())
        .then(() => {
          if (event.source && typeof event.source.postMessage === 'function') {
            event.source.postMessage({
              type: 'SHELL_CACHE_PURGED',
              buildId: data.buildId || ''
            });
          }
        })
    );
  }
});
