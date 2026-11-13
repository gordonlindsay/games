// Generated as sw.js by tools/build.mjs; keep this source out of the game bundle.
'use strict';
const VERSION = 'b45b7d9c9f3eeabaa7b1fe08';
const ASSETS = ["index.html","game.js","styles.css","practice.css","manifest.webmanifest","icons/icon.svg","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","icons/apple-touch-icon.png","assets/players/players-0.cd4825db31.webp","assets/players/players-1.36905aae7b.webp","assets/players/players-2.36d2507ae7.webp","assets/players/players-3.da342ce000.webp","assets/players/players.json","assets/sounds/bed-0.b9dedf3a3c.m4a","assets/sounds/bounce-0.c8f19a6d27.m4a","assets/sounds/bounce-1.bb9ee801f9.m4a","assets/sounds/bounce-2.cc6b8ddeb1.m4a","assets/sounds/catch-0.346604bd67.m4a","assets/sounds/catch-1.5eccddc419.m4a","assets/sounds/catch-2.c43b8d2ef3.m4a","assets/sounds/cheer-0.5c6640c3af.m4a","assets/sounds/cheer-1.73a6b9be23.m4a","assets/sounds/fumble-0.f004113141.m4a","assets/sounds/fumble-1.f7b3380943.m4a","assets/sounds/groan-0.952fdad619.m4a","assets/sounds/groan-1.b4d6f98d12.m4a","assets/sounds/hit-0.7c02e02f4d.m4a","assets/sounds/hit-1.76444026bb.m4a","assets/sounds/kick-0.9a118871ed.m4a","assets/sounds/kick-1.706e4e8a8c.m4a","assets/sounds/kick-2.47e47014a3.m4a","assets/sounds/pass-0.eda535ea0d.m4a","assets/sounds/pass-1.7d682e84aa.m4a","assets/sounds/pass-2.db65b252be.m4a","assets/sounds/post-0.533a9c8f66.m4a","assets/sounds/post-1.fc3534fe13.m4a","assets/sounds/roar-0.ca12be3a02.m4a","assets/sounds/roar-1.6000d56367.m4a","assets/sounds/strike-0.ef07d6d4dc.m4a","assets/sounds/strike-1.4335da66d0.m4a","assets/sounds/tackle-0.3630d97b0e.m4a","assets/sounds/tackle-1.2b7e735d9b.m4a","assets/sounds/tackle-2.a1516b3697.m4a","assets/sounds/tackle-3.260731cb99.m4a","assets/sounds/whiff-0.5f1336e665.m4a","assets/sounds/whiff-1.33f1aa3c5a.m4a","assets/sounds/whoosh-0.95de910210.m4a","assets/sounds/whoosh-1.a734fa8a5b.m4a","assets/sounds/whoosh-2.ff9a60a1b9.m4a","fonts/fonts.css","fonts/atkinson-hyperlegible-latin-ext-400-normal.woff2","fonts/atkinson-hyperlegible-latin-400-normal.woff2","fonts/atkinson-hyperlegible-latin-ext-700-normal.woff2","fonts/atkinson-hyperlegible-latin-700-normal.woff2","fonts/big-shoulders-display-vietnamese-wght-normal.woff2","fonts/big-shoulders-display-latin-ext-wght-normal.woff2","fonts/big-shoulders-display-latin-wght-normal.woff2"];
const DIGESTS = {"index.html":"8e4df52e577b93112754b721c7fc8009a909134a95a16497f55bf7fd4f662111","game.js":"4bdd503f6b6145f9f02ee9446af99fcc43601383f7de65b8c2e46cde03af6ecd","styles.css":"86e319746ed380778195dbdb76d1940475b65aabdd63009113625a12f0f5f370","practice.css":"40d0b3c888be72f2d9b1943fa8321c88d857ed8fb016cb822a3ec4585312b052","manifest.webmanifest":"b0b30b90335b484d0d7dd76b5aa89da997627ca40ab32e1296f151325340629b","icons/icon.svg":"cf70ae48fbc2c3a06b1a38da75fbf59aaec4afcad9561177d8a5229173770359","icons/icon-192.png":"3f08faaf205f4123cf5b081e912aee51513327198cf25b7fdf7e9927597d645b","icons/icon-512.png":"2564980f92eead7610185ef93fb39a5812bbff390e6205acd931848da6fd7cb9","icons/maskable-512.png":"2564980f92eead7610185ef93fb39a5812bbff390e6205acd931848da6fd7cb9","icons/apple-touch-icon.png":"b83e2b4fc37db89a3f5702a140f1ef9f2e3a00bbb40baae7bda2b1aaadf53d78","assets/players/players-0.cd4825db31.webp":"cd4825db3179042a1692888a056b7adc481a5be0774bf7763075f60670097492","assets/players/players-1.36905aae7b.webp":"36905aae7bd89360af5979451e2ae131755580e28078682cbf3538105035fa7a","assets/players/players-2.36d2507ae7.webp":"36d2507ae703998e751a9512949bfa9508626f8ecf9773cc7a4bb1d53cd0b524","assets/players/players-3.da342ce000.webp":"da342ce0005055bae8d5be733cedeb7767d910ed16788a33260a6fea38aafe59","assets/players/players.json":"c53d205c0feb0791e282860c2136d9f4af32e12c053d30ca4ad972f6b55cb5c4","assets/sounds/bed-0.b9dedf3a3c.m4a":"b9dedf3a3ceded7d7fa2a1583cd696f00d552ddd139ec3363d2bcdadc13d6d28","assets/sounds/bounce-0.c8f19a6d27.m4a":"c8f19a6d27a53ac89f1f92c91d2f286a407f9c37690f3fb9d35566a534405fd3","assets/sounds/bounce-1.bb9ee801f9.m4a":"bb9ee801f99b4ae8b7693e9e9f171161c0407e5edb66efd5f1ead561b10b95c2","assets/sounds/bounce-2.cc6b8ddeb1.m4a":"cc6b8ddeb1ba39b7d85fab842b3752138b9230fa27982435be022c3d6db0e467","assets/sounds/catch-0.346604bd67.m4a":"346604bd67a27b6946cc0248c6c102eac61c66d74f86bb7f37dcc42738de2957","assets/sounds/catch-1.5eccddc419.m4a":"5eccddc4194899457892b3ec370587762cc1cda2ad678f653323bb2335ac2530","assets/sounds/catch-2.c43b8d2ef3.m4a":"c43b8d2ef3ada52a06b79742232cdc58d0bf62d9d52a02aa835b382402a1ec46","assets/sounds/cheer-0.5c6640c3af.m4a":"5c6640c3af51fde47e50e19bf251c43fcaa843c2c09ad77062dc7d0bec089ca7","assets/sounds/cheer-1.73a6b9be23.m4a":"73a6b9be237ab03969b7b90445cadb205cbccdf918b14f98ea4d28183acb56cc","assets/sounds/fumble-0.f004113141.m4a":"f0041131411b6be5bb3e5479ab7903ad91a3706876e9991ee775a31a00f29d4b","assets/sounds/fumble-1.f7b3380943.m4a":"f7b3380943dc06d0099eadb82b88ca5bf9feb36b7c237eed82e25c5d59c767a3","assets/sounds/groan-0.952fdad619.m4a":"952fdad6192dacc9ea9f29cb7b73872769b1e88502558f65a72ca036412e8f09","assets/sounds/groan-1.b4d6f98d12.m4a":"b4d6f98d1296cbd51e32ebd2100bbe5182bbc96508d725dd0c7d5444d9cf561e","assets/sounds/hit-0.7c02e02f4d.m4a":"7c02e02f4d61723996e6b5c2f0112f8467c89688912a44ff6af3dbbf525f3d61","assets/sounds/hit-1.76444026bb.m4a":"76444026bb458690eecf76113d963e6b7f8976670c25c8e10d7240b5cc8739a5","assets/sounds/kick-0.9a118871ed.m4a":"9a118871ed8b6f154058deeab55c1847ce08d94ce50584d1e738f0ea3d6bd445","assets/sounds/kick-1.706e4e8a8c.m4a":"706e4e8a8c34301c40163fc7ac1e4da73467c8018abb191a4d81ff096e0ac2ce","assets/sounds/kick-2.47e47014a3.m4a":"47e47014a320d7343d13845fa888ce1e90aba49c1f067be13af11b39a83824d0","assets/sounds/pass-0.eda535ea0d.m4a":"eda535ea0dcd64e6189b3a4b5077c5469cf151546273b9fa1fb609dd7537de25","assets/sounds/pass-1.7d682e84aa.m4a":"7d682e84aa0284ffc601dbc29feac806d479e786384c45050be2a452b8c6de17","assets/sounds/pass-2.db65b252be.m4a":"db65b252be4cbe567e7f7d338694987d71726046364e86cf05bc8acfd5c0bacc","assets/sounds/post-0.533a9c8f66.m4a":"533a9c8f6639d824fd589828dc380d2ac36549b6d8543e0b273c2e3929780b62","assets/sounds/post-1.fc3534fe13.m4a":"fc3534fe13ab3ca33863f0982b2176f128c998d04b70f5cb4a0d2c591552c036","assets/sounds/roar-0.ca12be3a02.m4a":"ca12be3a024f491205efc543e0113dcc3e03424287a4e1f78e54e93c796fb2ec","assets/sounds/roar-1.6000d56367.m4a":"6000d56367d9665803b5a42853c6af1b111237844a83d7b36f6969f9530e3c44","assets/sounds/strike-0.ef07d6d4dc.m4a":"ef07d6d4dc4a07b5b9310ad08753d625d607cb5421d4c56d141251ce9a91fac3","assets/sounds/strike-1.4335da66d0.m4a":"4335da66d00a5e0b0f0cea0258da3ba588869f2dfb8f87488761c399182f4e45","assets/sounds/tackle-0.3630d97b0e.m4a":"3630d97b0e04c13c2a5a7274b27c7e58f1ff99b4736796c12e4bc3dc2235d911","assets/sounds/tackle-1.2b7e735d9b.m4a":"2b7e735d9bb3eb464b136d2d79f8b65d814947b0d053e1c89066490ab6e4c946","assets/sounds/tackle-2.a1516b3697.m4a":"a1516b36973d9f8ad5b2dd5651a43f590e7868852c5ca7c5d13cc9cb97f5bd64","assets/sounds/tackle-3.260731cb99.m4a":"260731cb99e21aa70cf8b9cc2d49a2de6e064ab83cec48cc95a773e8742ef2b8","assets/sounds/whiff-0.5f1336e665.m4a":"5f1336e66575c4db2aac51044153b3dc6a1708ac7d205bfd45a8475f400d2c18","assets/sounds/whiff-1.33f1aa3c5a.m4a":"33f1aa3c5ac21d5c8db6964b359ea543e832317abecec5dc78cb24bcf6af0a4b","assets/sounds/whoosh-0.95de910210.m4a":"95de9102108e083d64abdd593e6c0cd187cbfdbd46270b5d3889cdaa0cc4c164","assets/sounds/whoosh-1.a734fa8a5b.m4a":"a734fa8a5b4b71899ba48a524daa5ea0a6a001eb3ed94fbf05805b911e3e507a","assets/sounds/whoosh-2.ff9a60a1b9.m4a":"ff9a60a1b9b2474dd0586e505afe918d9783a85ec7989768e599297646067042","fonts/fonts.css":"8982e03c9ed2d2d762cde2cf3093cfa914d37550efb8c3d548eba94bdd7473a1","fonts/atkinson-hyperlegible-latin-ext-400-normal.woff2":"61eeb0eb8b881a84d069e67be1723f5b353b0b9b866ad8e7ad9dba66cdc4dabd","fonts/atkinson-hyperlegible-latin-400-normal.woff2":"d64ba838ef5472bba248620ec4fd8b5aa7cf0db2908e0bb230600caf279ba7bc","fonts/atkinson-hyperlegible-latin-ext-700-normal.woff2":"840ced16f975d8abc2594b436d0206649e0c2a7327e36750ff849d3d37c3c02e","fonts/atkinson-hyperlegible-latin-700-normal.woff2":"140e2bd25a7315c8a062508391426b0d8c3297400c947b8d847be28f73a199f0","fonts/big-shoulders-display-vietnamese-wght-normal.woff2":"de12a95e68bdf3c0d4d33cbc79d458af8d9db3d405372ceb523846df5ca609ce","fonts/big-shoulders-display-latin-ext-wght-normal.woff2":"4671cb6e9e9036e92a4a4e8c9506c6bcfbfb4a10687f0033fae3c2abc37ad916","fonts/big-shoulders-display-latin-wght-normal.woff2":"075292b13a638821b34726b33e49b3b711c4b9bee9b42f2bb68fa3b6ec888f2b"};
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
