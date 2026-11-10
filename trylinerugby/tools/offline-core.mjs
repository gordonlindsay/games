import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { assembleWorker, shellAssets } from './build.mjs';
const root = new URL('../', import.meta.url);
const scope = 'https://example.test/games/rugby/';
let source = assembleWorker().worker;
function harness({ fail, badBytes, putFailure, clients = [], fetchFor = {} } = {}) {
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
    fetch: async request => { const asset = request.url.slice(scope.length); if (fetchFor[asset]) return fetchFor[asset](); if (asset === fail) throw Error('Offline'); return new Response(badBytes === asset ? 'mixed deployment' : fs.readFileSync(new URL(asset, root))); }
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
// ratings.json: network first, the cached copy offline, never part of the shell, and outliving a shell generation
{
  const url = scope + 'ratings.json', ratingsCache = 'tryline-ratings-%2Fgames%2Frugby%2F';
  assert(!shellAssets.includes('ratings.json'), 'ratings.json is data, not shell');
  const file = date => JSON.stringify({ date, men:{ ENG:84 }, women:{ ENG:96 } });   // the worker now refuses to keep anything not shaped like the file
  let body = file('one'), online = true;
  const net = async () => { if (!online) throw Error('Offline'); return new Response(body); };
  const local = harness({ fetchFor: { 'ratings.json': net } });
  await local.lifecycle('install'); await local.lifecycle('activate');
  assert.equal(await (await local.get(url)).text(), file('one'), 'online: from the network');
  assert.equal(await (await local.stores.get(ratingsCache).get(url)).text(), file('one'), 'and kept');
  body = file('two');
  assert.equal(await (await local.get(url)).text(), file('two'), 'network first, not the cached copy');
  online = false;
  assert.equal(await (await local.get(url)).text(), file('two'), 'offline: the cached copy');
  await local.lifecycle('activate');
  assert(local.stores.has(ratingsCache), 'a new shell generation keeps it');
  // a 200 that is not the file never replaces a good copy: a host's fallback page, or one broken publish
  online = true;
  for (const [name, bad, type] of [['an HTML page', '<!doctype html><title>Not here</title>', 'text/html'], ['HTML with no type', '<!doctype html><title>Not here</title>', ''], ['text that is not JSON', 'oops', ''], ['JSON with no women', '{"date":"x","men":{"ENG":84}}', ''], ['a rating off the scale', '{"date":"x","men":{"ENG":1000},"women":{"ENG":96}}', ''], ['empty tables', '{"date":"x","men":{},"women":{}}', ''], ['a list', '[]', ''], ['null', 'null', ''], ['a date that is no string', '{"date":7,"men":{"ENG":84},"women":{"ENG":96}}', 'application/json']]) {
    body = bad;
    const sent = () => new Response(body, type ? { headers:{ 'content-type':type } } : undefined), keep = harness({ fetchFor: { 'ratings.json': async () => sent() } });
    await keep.lifecycle('install');
    keep.stores.set(ratingsCache, new Map([[url, new Response(file('good'))]]));
    assert.equal(await (await keep.get(url)).text(), file('good'), `${name}: the good copy is served`);
    assert.equal(await (await keep.stores.get(ratingsCache).get(url)).text(), file('good'), `${name}: and stays in the cache`);
    keep.stores.delete(ratingsCache);
    assert.equal((await keep.get(url)).type, 'error', `${name}: with no copy, an error the game falls back from`);
    assert.equal(keep.stores.get(ratingsCache).get(url), undefined, `${name}: and nothing is kept`);
  }
  const failing = harness({ fetchFor: { 'ratings.json': async () => new Response('gone', { status:404 }) } });
  await failing.lifecycle('install');
  assert.equal((await failing.get(url)).type, 'error', 'a 404 with nothing cached is an error the game falls back from');
  failing.stores.set(ratingsCache, new Map([[url, new Response(file('kept'))]]));
  assert.equal(await (await failing.get(url)).text(), file('kept'), 'a 404 with a cached copy serves the copy');
  assert.equal(await failing.get(url + '?v=2'), null, 'only the plain address');
}
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
await h.lifecycle('message',{data:{type:'SKIP_WAITING'}}); assert.equal(h.skipped(),1, 'an older page\'s Update Game still switches');
// The home menu asks with alone: the waiting worker takes over only when the game has one window at most, and answers either way
{
  const ask = async clients => {
    const w = harness({ clients:clients.map(url => ({ url })) }); let answer = null;
    await w.lifecycle('message', { data:{ type:'SKIP_WAITING', alone:true }, ports:[{ postMessage:value => answer = value }] });
    return { answer, skipped:w.skipped() };
  };
  for (const [name, clients, applied] of [
    ['the asking window alone', [scope], true],
    ['no window counted (asked from an uncounted page)', [], true],
    ['alone with the privacy page, the support page and another game open', [scope, scope + 'privacy.html', scope + 'support.html', 'https://example.test/games/other/', 'https://elsewhere.test/games/rugby/'], true],
    ['a second game window', [scope, scope + 'index.html'], false],
    ['a second game window with a query or a hash', [scope, scope + '?from=home#x'], false],
    ['three game windows', [scope, scope, scope + 'index.html'], false],
  ]) {
    const { answer, skipped } = await ask(clients);
    assert.equal(JSON.stringify(answer), JSON.stringify({ type:'SKIP_WAITING', applied }), name + ': the answer');
    assert.equal(skipped, applied ? 1 : 0, name + (applied ? ': it takes over' : ': it waits'));
  }
  const noPort = harness({ clients:[{ url:scope }] });
  await noPort.lifecycle('message', { data:{ type:'SKIP_WAITING', alone:true } });
  assert.equal(noPort.skipped(), 0, 'asked alone with nowhere to answer: nothing');
  // The first step, GAME_WINDOWS, wakes the worker and counts the game's windows the same way, and never switches
  for (const [name, clients, count] of [['one game window', [scope], 1], ['none', [], 0], ['one with the privacy page and another game', [scope, scope + 'privacy.html', 'https://example.test/games/other/'], 1], ['two', [scope, scope + 'index.html?x'], 2]]) {
    const w = harness({ clients:clients.map(url => ({ url })) }); let answer = null;
    await w.lifecycle('message', { data:{ type:'GAME_WINDOWS' }, ports:[{ postMessage:value => answer = value }] });
    assert.equal(JSON.stringify(answer), JSON.stringify({ type:'GAME_WINDOWS', count }), name + ': counted');
    assert.equal(w.skipped(), 0, name + ': counting switches nothing');
  }
  const quiet = harness({ clients:[{ url:scope }] });
  await quiet.lifecycle('message', { data:{ type:'GAME_WINDOWS' } });
  assert.equal(quiet.skipped(), 0, 'counted with nowhere to answer: nothing');
}
for (const options of [{fail:'game.js'}, {badBytes:'styles.css'}, {putFailure:true}]) {
 const failed=harness(options); failed.stores.set('working-old-cache',new Map());
 await assert.rejects(failed.lifecycle('install')); assert.deepEqual([...failed.stores.keys()], ['working-old-cache']);
}
// An older page's Update Game can switch a second game window still playing: its generation is kept. One game window (the one
// switching, which reloads into the new generation) or other pages only: the old generation goes, so updates never pile up.
for (const [name, clients, kept] of [['two game windows', [scope, scope + 'index.html'], true], ['the one game window', [scope], false], ['one game window and the privacy page', [scope, scope + 'privacy.html'], false], ['no window', [], false]]) {
  const tabs = harness({ clients:clients.map(url => ({ url })) });
  tabs.stores.set('tryline-shell-%2Fgames%2Frugby%2F-old',new Map());
  await tabs.lifecycle('install'); await tabs.lifecycle('activate');
  assert.equal(tabs.stores.has('tryline-shell-%2Fgames%2Frugby%2F-old'), kept, name + (kept ? ': the older generation is kept' : ': the older generation goes'));
}
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
console.log('Offline core: atomic install, byte verification, immutable shell, navigation, exclusions, cache isolation, readiness, an update only for a lone game window (counted first, switching nothing), content drift and the ratings file passed.');
