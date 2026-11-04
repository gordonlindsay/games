#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../src/offline-client.js', import.meta.url), 'utf8');
const eventTarget = () => {
  const events = new Map();
  return { addEventListener(type, cb) { const list = events.get(type) || []; list.push(cb); events.set(type, list); }, emit(type, value = {}) { for (const cb of events.get(type) || []) cb(value); } };
};
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function setup({ secure = true, support = true, fail = false, syncFail = false, ready = true, noChannel = false } = {}) {
  let reloads = 0, registrations = 0, installs = 0;
  const elements = Object.fromEntries(['app-tools', 'b-install', 'b-update', 'offline-status'].map(id => [id, { ...eventTarget(), hidden:true, disabled:false }]));
  const worker = () => ({ ...eventTarget(), messages:[], state:'activated', cacheReady:ready, postMessage(message, ports) {
    this.messages.push(message.type);
    if (message.type === 'OFFLINE_STATUS' && ports) ports[0].send({ type:'OFFLINE_READY', ready:this.cacheReady });
  } });
  const active = worker(), waiting = worker();
  const registration = { ...eventTarget(), active, waiting, installing:null };
  const serviceWorker = { ...eventTarget(), controller:active, register(url) { assert.equal(url, './sw.js'); registrations++; if (syncFail) throw Error('blocked'); return fail ? Promise.reject(Error('blocked')) : Promise.resolve(registration); } };
  class Channel {
    constructor() { this.port1 = { close() {} }; this.port2 = { send:data => this.port1.onmessage?.({ data }) }; }
  }
  const window = { ...eventTarget(), isSecureContext:secure, location:{ reload:() => reloads++ } };
  const context = vm.createContext({ window, navigator:support ? { serviceWorker } : {}, MessageChannel:noChannel ? undefined : Channel, setTimeout:() => 1, clearTimeout() {}, $:id => elements[id] });
  vm.runInContext(source + '\nthis.offline = { start:offlineStart, screen:offlineScreen };', context);
  context.offline.screen('s-home'); context.offline.start();
  return { context, window, elements, worker, registration, serviceWorker, offline:context.offline, get reloads() { return reloads; }, get registrations() { return registrations; }, installEvent:() => ({ preventDefault() {}, prompt() { installs++; return Promise.resolve(); }, userChoice:Promise.resolve({ outcome:'dismissed' }) }), get installs() { return installs; } };
}
for (const options of [{ secure:false }, { support:false }, { fail:true }, { syncFail:true }, { ready:false }, { noChannel:true }]) {
  const t = setup(options); await tick();
  assert.equal(t.elements['offline-status'].hidden, true, JSON.stringify(options));
  assert.equal(t.reloads, 0);
}
{
  const t = setup(); await tick();
  assert.equal(t.elements['offline-status'].hidden, false);
  assert.equal(t.elements['b-install'].hidden, true);
  const prompt = t.installEvent(); t.window.emit('beforeinstallprompt', prompt);
  assert.equal(t.elements['b-install'].hidden, false);
  t.elements['b-install'].emit('click'); await tick();
  assert.equal(t.installs, 1); assert.equal(t.elements['b-install'].hidden, true);
  t.window.emit('beforeinstallprompt', t.installEvent()); t.window.emit('appinstalled');
  assert.equal(t.elements['b-install'].hidden, true);
  t.offline.start(); assert.equal(t.registrations, 1);
}
{
  const t = setup(); await tick();
  // An unrelated controller change never reloads the game.
  t.serviceWorker.emit('controllerchange'); assert.equal(t.reloads, 0);
  t.offline.screen(null); t.elements['b-update'].emit('click');
  assert.equal(t.registration.waiting.messages.includes('SKIP_WAITING'), false);
  t.offline.screen('s-home'); t.elements['b-update'].emit('click'); t.elements['b-update'].emit('click');
  assert.deepEqual(t.registration.waiting.messages, ['SKIP_WAITING']);
  t.serviceWorker.emit('controllerchange'); assert.equal(t.reloads, 0);
  t.offline.screen(null); // Match or practice starts before activation finishes.
  t.serviceWorker.controller = t.registration.waiting;
  t.serviceWorker.emit('controllerchange'); assert.equal(t.reloads, 0);
  t.offline.screen('s-practice'); assert.equal(t.reloads, 0);
  t.offline.screen('s-home'); assert.equal(t.reloads, 1);
  t.serviceWorker.emit('controllerchange'); t.offline.screen('s-home'); assert.equal(t.reloads, 1);
}
{
  const t = setup(); await tick();
  t.elements['b-update'].emit('click'); t.serviceWorker.controller = t.registration.waiting;
  t.serviceWorker.emit('controllerchange'); t.serviceWorker.emit('controllerchange');
  assert.equal(t.reloads, 1);
}
{
  const t = setup(); await tick();
  t.registration.waiting = null; t.registration.installing = t.worker();
  t.registration.emit('updatefound'); t.registration.waiting = t.registration.installing;
  t.registration.installing.state = 'installed'; t.registration.installing.emit('statechange');
  assert.equal(t.elements['b-update'].hidden, false);
}
{
  const t = setup(); await tick();
  const waiting = t.registration.waiting;
  t.registration.waiting = null; t.registration.active = waiting;
  waiting.state = 'activated'; waiting.emit('statechange');
  assert.equal(t.elements['b-update'].hidden, true);
  t.serviceWorker.controller = waiting; t.serviceWorker.emit('controllerchange');
  assert.equal(t.reloads, 0); // Another tab applied this update.
}
{
  const t = setup(); await tick();
  assert.equal(t.elements['offline-status'].hidden, false);
  t.registration.active.cacheReady = false;
  t.serviceWorker.emit('controllerchange');
  assert.equal(t.elements['offline-status'].hidden, true, 'explicit negative readiness clears a previously ready status');
}
// Run the production pad navigation with the real button classes and live UI state.
{
  const t = setup(); await tick();
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const input = fs.readFileSync(new URL('../src/input-devices.js', import.meta.url), 'utf8');
  const navSource = input.slice(input.indexOf('let focusEl = null;'), input.indexOf('function navBack('));
  const quick = { hidden:false, disabled:false };
  const candidates = [quick, t.elements['b-install'], t.elements['b-update']];
  candidates.forEach((el, i) => {
    const id = ['b-quick', 'b-install', 'b-update'][i];
    const tag = html.match(new RegExp('<button[^>]*id="' + id + '"[^>]*>'))[0];
    const classes = tag.match(/class="([^"]+)"/)[1].split(/\s+/);
    el.matches = selector => selector.startsWith('.') && classes.includes(selector.slice(1));
    el.classList = { add() {}, remove() {} };
    el.getAttribute = () => null;
    el.closest = () => i && t.elements['app-tools'].hidden ? {} : null;
    el.getBoundingClientRect = () => ({ left:0, top:i * 50, width:160, height:30 });
    el.click = () => el.emit?.('click');
  });
  const layer = { id:'s-home', hidden:false, querySelectorAll(selector) {
    const selectors = selector.split(',').map(value => value.trim());
    return candidates.filter(el => selectors.some(value => el.matches(value)));
  } };
  t.context.M = null;
  t.context.document = { querySelectorAll:selector => selector === '.screen' ? [layer] : [] };
  t.context.$ = id => id === 'b-quick' ? quick : t.elements[id];
  vm.runInContext(navSource, t.context);
  const nav = t.context;
  assert.deepEqual(Array.from(nav.navCands(layer)), [quick, t.elements['b-update']], 'hidden install is not a pad candidate');
  t.window.emit('beforeinstallprompt', t.installEvent());
  assert.deepEqual(Array.from(nav.navCands(layer)), candidates, 'visible install and update use the production selector');
  assert.equal(nav.navMove(0, 0, 0), quick);
  assert.equal(nav.navMove(0, 0, 1), t.elements['b-install']);
  assert.equal(nav.navPress(0), true); await tick();
  assert.equal(t.installs, 1, 'pad confirm invokes the real install handler');
  assert.equal(nav.navMove(0, 0, 0), quick, 'consumed install prompt loses pad eligibility');
  assert.equal(nav.navMove(0, 0, 1), t.elements['b-update']);
  assert.equal(nav.navPress(0), true);
  assert.deepEqual(t.registration.waiting.messages, ['SKIP_WAITING'], 'pad confirm invokes the real update handler');
  assert.equal(t.elements['b-update'].disabled, true);
  assert.deepEqual(Array.from(nav.navCands(layer)), [quick], 'pending update cannot be confirmed again');
  assert.equal(nav.navPress(0), false);
  t.offline.screen(null);
  assert.deepEqual(Array.from(nav.navCands(layer)), [quick], 'hidden app-tools excludes its child controls');
}
console.log('Offline UI: install, readiness, failure and safe update event tests passed.');
