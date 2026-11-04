import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { assembleWorker, shellAssets } from './build.mjs';
const root = new URL('../', import.meta.url);
const scope = 'https://example.test/games/rugby/';
let source = assembleWorker().worker;
function harness({ fail, badBytes, putFailure, clients = [] } = {}) {
  const stores = new Map(); const events = {}; let skipped = 0;
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async key => stores.delete(key),
    open: async key => {
      if (!stores.has(key)) stores.set(key, new Map());
      const store = stores.get(key);
      return { match: async url => store.get(url)?.clone(), put: async (url, response) => { if (putFailure) throw Error('Quota'); store.set(url, response.clone()); } };
    }
  };
  const context = { self: { clients: { matchAll: async () => clients }, registration: { scope }, addEventListener: (name, fn) => events[name] = fn, skipWaiting: async () => { skipped++; } }, caches, URL, Request, Response, Set, Uint8Array, crypto: webcrypto,
    fetch: async request => { const asset = request.url.slice(scope.length); if (asset === fail) throw Error('Offline'); return new Response(badBytes === asset ? 'mixed deployment' : fs.readFileSync(new URL(asset, root))); }
  };
  vm.runInNewContext(source, context);
  async function lifecycle(type, extra = {}) { const promises = []; events[type]({ waitUntil: promise => promises.push(promise), ...extra }); await Promise.all(promises); }
  async function get(url, mode = 'cors', method = 'GET') { let response; events.fetch({ request: { url, mode, method }, respondWith: promise => response = promise }); return response ? await response : null; }
  return { stores, lifecycle, get, skipped: () => skipped };
}
const h = harness();
h.stores.set('other-game-shell', new Map());
h.stores.set('tryline-shell-%2Fgames%2Frugby%2F-old', new Map());
await h.lifecycle('install');
assert.equal(h.skipped(), 0, 'install must wait');
assert.equal([...h.stores.values()].at(-1).size, shellAssets.length);
await h.lifecycle('activate');
assert(h.stores.has('other-game-shell')); assert.equal(h.stores.size, 2);
assert.equal(await (await h.get(scope, 'navigate')).text(), fs.readFileSync(new URL('index.html', root), 'utf8'));
assert((await h.get(scope + 'game.js')).ok);
for (const [url, mode, method] of [[scope+'game.js?v=2','cors','GET'], [scope+'saves.json','cors','GET'], ['https://example.test/games/other/','navigate','GET'], [scope+'api/score','cors','GET'], [scope+'game.js','cors','POST'], ['https://elsewhere.test/game.js','cors','GET']]) assert.equal(await h.get(url,mode,method), null, url);
let status;
await h.lifecycle('message', {data:{type:'OFFLINE_STATUS'}, ports:[{postMessage:value=>status=value}]});
assert.equal(status.ready,true);
const currentStore = [...h.stores.entries()].find(([name]) => name.startsWith('tryline-shell-'))[1];
const cachedScript = currentStore.get(scope + 'game.js');
currentStore.delete(scope + 'game.js');
await h.lifecycle('message', {data:{type:'OFFLINE_STATUS'}, ports:[{postMessage:value=>status=value}]});
assert.equal(status.ready,false, 'readiness requires every shell entry');
currentStore.set(scope + 'game.js', cachedScript);
await h.lifecycle('message',{data:{type:'other'}}); assert.equal(h.skipped(),0);
await h.lifecycle('message',{data:{type:'SKIP_WAITING'}}); assert.equal(h.skipped(),1);
for (const options of [{fail:'game.js'}, {badBytes:'styles.css'}, {putFailure:true}]) {
 const failed=harness(options); failed.stores.set('working-old-cache',new Map());
 await assert.rejects(failed.lifecycle('install')); assert.deepEqual([...failed.stores.keys()], ['working-old-cache']);
}
const tabs = harness({clients:[{url:scope}]});
tabs.stores.set('tryline-shell-%2Fgames%2Frugby%2F-old',new Map());
await tabs.lifecycle('install'); await tabs.lifecycle('activate');
assert(tabs.stores.has('tryline-shell-%2Fgames%2Frugby%2F-old'), 'open older tabs retain their generation');
const evicted = harness(); await evicted.lifecycle('install'); evicted.stores.clear();
assert((await evicted.get(scope, 'navigate')).ok);
assert((await evicted.get(scope+'game.js')).ok);
assert.equal([...evicted.stores.values()][0].size,2);
const missing = harness({fail:'game.js'});
assert.equal((await missing.get(scope+'game.js')).type,'error');
const mixed = harness({badBytes:'game.js'});
assert.equal((await mixed.get(scope+'game.js')).type,'error');
const expected = assembleWorker().version;
const css = new URL('practice.css',root); const bytes=fs.readFileSync(css);
try { fs.appendFileSync(css,'\n/* drift probe */\n'); assert.notEqual(assembleWorker().version,expected); }
finally { fs.writeFileSync(css,bytes); }
console.log('Offline core: atomic install, byte verification, immutable shell, navigation, exclusions, cache isolation, readiness, explicit update and content drift passed.');
