// Generated as sw.js by tools/build.mjs; keep this source out of the game bundle.
'use strict';
const VERSION = '__SHELL_VERSION__';
const ASSETS = __SHELL_ASSETS__;
const DIGESTS = __SHELL_DIGESTS__;
const SCOPE = new URL(self.registration.scope);
const CACHE_PREFIX = 'tryline-shell-' + encodeURIComponent(SCOPE.pathname) + '-';
const CACHE_NAME = CACHE_PREFIX + VERSION;
const URLS = ASSETS.map(asset => new URL(asset, SCOPE).href);
const ALLOWED = new Set(URLS);
const INDEX = new URL('index.html', SCOPE).href;
// The ratings file is data, not shell: never precached or checked against a digest, and it outlives every shell generation.
const RATINGS = new URL('ratings.json', SCOPE).href;
const RATINGS_CACHE = 'tryline-ratings-' + encodeURIComponent(SCOPE.pathname);
// A host's fallback page, or a broken publish, can answer 200: only something shaped like the file may replace a good copy. The page checks it fully (ratingsClean).
async function ratingsShaped(response) {
  if (/html/i.test(response.headers.get('content-type') || '')) return false;
  try {
    const v = await response.clone().json(), table = t => !!t && typeof t === 'object' && !Array.isArray(t) && Object.keys(t).length > 0 && Object.values(t).every(o => Number.isInteger(o) && o >= 40 && o <= 99);
    return !!v && typeof v === 'object' && !Array.isArray(v) && typeof v.date === 'string' && table(v.men) && table(v.women);
  } catch (_) { return false; }
}
async function ratingsResponse() {
  const cache = await caches.open(RATINGS_CACHE);
  try {
    const response = await fetch(new Request(RATINGS, { cache: 'no-cache', credentials: 'same-origin' }));
    if (response.ok && !response.redirected && await ratingsShaped(response)) {
      try { await cache.put(RATINGS, response.clone()); } catch (_) { /* Still usable online when storage is full. */ }
      return response;
    }
  } catch (_) { /* Offline: the copy below, if there is one. */ }
  return (await cache.match(RATINGS)) || Response.error();
}
async function verifiedResponse(url, asset) {
  const response = await fetch(new Request(url, { cache: 'reload', credentials: 'same-origin' }));
  if (!response.ok || response.redirected || (response.type && !['basic', 'default'].includes(response.type))) throw new Error('Shell asset unavailable: ' + url);
  const digest = await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer());
  const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  if (hex !== DIGESTS[asset]) throw new Error('Shell version mismatch: ' + url);
  return response;
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const existed = (await caches.keys()).includes(CACHE_NAME);
    try {
      // Fetch the whole generation before exposing any of it to a fetch handler.
      const responses = await Promise.all(URLS.map((url, index) => verifiedResponse(url, ASSETS[index])));
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(URLS.map((url, index) => cache.put(url, responses[index])));
    } catch (error) {
      if (!existed) await caches.delete(CACHE_NAME);
      throw error;
    }
  })());
});
self.addEventListener('activate', event => {
  // Activation happens once old clients close, or after an explicit user request.
  // Do not claim clients: first installation must not interrupt a running match.
  event.waitUntil((async () => {
    // Another tab may still be playing under the previous worker after an explicit
    // update in this tab. Retain its immutable generation until an activation
    // with no open game clients, so its in-flight shell requests remain coherent.
    if ((await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).length) return;
    for (const name of await caches.keys()) {
      if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) await caches.delete(name);
    }
  })());
});
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'OFFLINE_STATUS' && event.ports && event.ports[0]) {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      const ready = (await Promise.all(URLS.map(url => cache.match(url)))).every(Boolean);
      event.ports[0].postMessage({ type: 'OFFLINE_READY', ready });
    })());
  }
  if (event.data && event.data.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== SCOPE.origin || url.search || url.hash) return;
  if (url.href === RATINGS) { event.respondWith(ratingsResponse()); return; }
  const ownNavigation = event.request.mode === 'navigate' && (url.href === SCOPE.href || url.href === INDEX);
  if (!ownNavigation && !ALLOWED.has(url.href)) return;
  // A generation always serves its own HTML and scripts, even while online.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const target = ownNavigation ? INDEX : url.href;
    const cached = await cache.match(target);
    if (cached) return cached;
    // Storage may be evicted independently of the worker. Recover only exact
    // bytes belonging to this generation; never mix a newer server deployment.
    try {
      const response = await verifiedResponse(target, ASSETS[URLS.indexOf(target)]);
      try { await cache.put(target, response.clone()); } catch (_) { /* Still usable online when storage is full. */ }
      return response;
    } catch (_) { return Response.error(); }
  })());
});
