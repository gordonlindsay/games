// Generated as sw.js by tools/build.mjs; keep this source out of the game bundle.
'use strict';
const VERSION = 'a571b99867d30b27f1c889e6';
const ASSETS = ["index.html","game.js","styles.css","practice.css","manifest.webmanifest","icons/icon.svg","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","icons/apple-touch-icon.png","assets/players/players-0.cd4825db31.webp","assets/players/players-1.36905aae7b.webp","assets/players/players-2.36d2507ae7.webp","assets/players/players-3.da342ce000.webp","assets/players/players.json","fonts/fonts.css","fonts/atkinson-hyperlegible-latin-ext-400-normal.woff2","fonts/atkinson-hyperlegible-latin-400-normal.woff2","fonts/atkinson-hyperlegible-latin-ext-700-normal.woff2","fonts/atkinson-hyperlegible-latin-700-normal.woff2","fonts/big-shoulders-display-vietnamese-wght-normal.woff2","fonts/big-shoulders-display-latin-ext-wght-normal.woff2","fonts/big-shoulders-display-latin-wght-normal.woff2"];
const DIGESTS = {"index.html":"448dc2590b3ffeaa0d69f6faf02649a610eb16e888fa602748fb5c7db14edb9a","game.js":"e1c45159228601d53abd0fa72443e3a1d84b85493cfe41aed80095eb9205fa61","styles.css":"9dabc13889a2b641eac66009c4185593eca98eff91f0030eaa3e4a6daad2c4e1","practice.css":"bb65199da014c3c11ea72e2736a4d86ae81773582d82b171cc1d61963091ff57","manifest.webmanifest":"b0b30b90335b484d0d7dd76b5aa89da997627ca40ab32e1296f151325340629b","icons/icon.svg":"cf70ae48fbc2c3a06b1a38da75fbf59aaec4afcad9561177d8a5229173770359","icons/icon-192.png":"3f08faaf205f4123cf5b081e912aee51513327198cf25b7fdf7e9927597d645b","icons/icon-512.png":"2564980f92eead7610185ef93fb39a5812bbff390e6205acd931848da6fd7cb9","icons/maskable-512.png":"2564980f92eead7610185ef93fb39a5812bbff390e6205acd931848da6fd7cb9","icons/apple-touch-icon.png":"b83e2b4fc37db89a3f5702a140f1ef9f2e3a00bbb40baae7bda2b1aaadf53d78","assets/players/players-0.cd4825db31.webp":"cd4825db3179042a1692888a056b7adc481a5be0774bf7763075f60670097492","assets/players/players-1.36905aae7b.webp":"36905aae7bd89360af5979451e2ae131755580e28078682cbf3538105035fa7a","assets/players/players-2.36d2507ae7.webp":"36d2507ae703998e751a9512949bfa9508626f8ecf9773cc7a4bb1d53cd0b524","assets/players/players-3.da342ce000.webp":"da342ce0005055bae8d5be733cedeb7767d910ed16788a33260a6fea38aafe59","assets/players/players.json":"c53d205c0feb0791e282860c2136d9f4af32e12c053d30ca4ad972f6b55cb5c4","fonts/fonts.css":"8982e03c9ed2d2d762cde2cf3093cfa914d37550efb8c3d548eba94bdd7473a1","fonts/atkinson-hyperlegible-latin-ext-400-normal.woff2":"61eeb0eb8b881a84d069e67be1723f5b353b0b9b866ad8e7ad9dba66cdc4dabd","fonts/atkinson-hyperlegible-latin-400-normal.woff2":"d64ba838ef5472bba248620ec4fd8b5aa7cf0db2908e0bb230600caf279ba7bc","fonts/atkinson-hyperlegible-latin-ext-700-normal.woff2":"840ced16f975d8abc2594b436d0206649e0c2a7327e36750ff849d3d37c3c02e","fonts/atkinson-hyperlegible-latin-700-normal.woff2":"140e2bd25a7315c8a062508391426b0d8c3297400c947b8d847be28f73a199f0","fonts/big-shoulders-display-vietnamese-wght-normal.woff2":"de12a95e68bdf3c0d4d33cbc79d458af8d9db3d405372ceb523846df5ca609ce","fonts/big-shoulders-display-latin-ext-wght-normal.woff2":"4671cb6e9e9036e92a4a4e8c9506c6bcfbfb4a10687f0033fae3c2abc37ad916","fonts/big-shoulders-display-latin-wght-normal.woff2":"075292b13a638821b34726b33e49b3b711c4b9bee9b42f2bb68fa3b6ec888f2b"};
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
