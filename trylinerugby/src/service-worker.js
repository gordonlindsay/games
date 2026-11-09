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
// The game's own page, wherever a window has it open (the scope or index.html, with any query or hash). The folder's other
// pages (privacy, support) run no game and take only the typefaces and the icon from a worker, so a switch can't break them.
const GAME_PAGES = new Set([SCOPE.pathname, new URL('index.html', SCOPE).pathname]);
async function gameWindows() {
  const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  return all.filter(client => { try { const url = new URL(client.url); return url.origin === SCOPE.origin && GAME_PAGES.has(url.pathname); } catch (_) { return false; } });
}
self.addEventListener('activate', event => {
  // Activation happens once old clients close, when the game's only window asks from its quiet home menu (offline-client.js),
  // or after a tap on an older page's Update Game. Do not claim clients: first installation must not interrupt a running match.
  event.waitUntil((async () => {
    // An older page's Update Game can switch a second game window still playing under the previous worker: retain its
    // generation then. With one game window at most (the one switching, which reloads into this generation) it goes.
    if ((await gameWindows()).length > 1) return;
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
  // The home menu's two steps (offline-client.js), which every later worker must keep answering, as pages already open send them:
  // GAME_WINDOWS wakes this worker and counts the game's windows, switching nothing; SKIP_WAITING with alone, sent once the home
  // is still quiet, counts again and takes over only for the game's only window, so no window in a match has its files switched
  // under it, and answers whether it did. A page from before asks SKIP_WAITING without alone, after a tap on Update Game.
  const port = event.ports && event.ports[0];
  if (event.data && event.data.type === 'GAME_WINDOWS' && port) {
    event.waitUntil((async () => { port.postMessage({ type: 'GAME_WINDOWS', count: (await gameWindows()).length }); })());
  }
  if (event.data && event.data.type === 'SKIP_WAITING') {
    if (!event.data.alone) event.waitUntil(self.skipWaiting());
    else if (port) event.waitUntil((async () => {
      const applied = (await gameWindows()).length <= 1;
      port.postMessage({ type: 'SKIP_WAITING', applied });
      if (applied) await self.skipWaiting();
    })());
  }
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
