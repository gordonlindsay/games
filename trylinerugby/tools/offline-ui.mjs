#!/usr/bin/env node
// The page's side of offline play and updates (src/offline-client.js), under stubbed browser APIs and a clock the test turns by
// hand; then, where Playwright is installed, the same in Chromium with a real service worker and new builds served one by one.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../src/offline-client.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const eventTarget = () => {
  const events = new Map();
  return { addEventListener(type, cb) { const list = events.get(type) || []; list.push(cb); events.set(type, list); }, emit(type, value = {}) { for (const cb of events.get(type) || []) cb(value); } };
};
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const MODALS = ['m-gate', 'm-store', 'm-wall', 'm-import', 'm-pause', 'm-practice'];
// The waiting worker's two answers: count, to GAME_WINDOWS (the first step, which switches nothing), and answer, to SKIP_WAITING alone
// (the second): each 'now', 'later' (t.countNow() and t.answerNow() send them) or 'never'. windows: the game windows it counts, as it answers
function setup({ secure = true, support = true, fail = false, syncFail = false, ready = true, noChannel = false, waiting = true, controlled = true } = {}) {
  let reloads = 0, registrations = 0, installs = 0, updates = 0, clock = 1e6, timerId = 0, reads = 0;
  const timers = [];
  const elements = Object.fromEntries(['app-tools', 'b-install', 'offline-update', 'offline-status', 'pr-grownups', ...MODALS].map(id => [id, { ...eventTarget(), id, hidden:true, disabled:false }]));
  let t = null;                                           // the handle below; the worker reads its windows, count and answer as the test sets them
  const worker = () => ({ ...eventTarget(), messages:[], state:'activated', cacheReady:ready, postMessage(message, ports) {
    this.messages.push(message.type + (message.alone ? ' alone' : ''));
    if (message.type === 'OFFLINE_STATUS' && ports) ports[0].send({ type:'OFFLINE_READY', ready:this.cacheReady });
    const step = (mode, queue, data) => { const reply = () => ports[0].send(data()); if (mode === 'now') reply(); else if (mode === 'later') queue.push(reply); };
    if (message.type === 'GAME_WINDOWS' && ports) step(t.count, t.counts, () => ({ type:'GAME_WINDOWS', count:t.windows }));
    if (message.type === 'SKIP_WAITING' && message.alone && ports) step(t.answer, t.replies, () => ({ type:'SKIP_WAITING', applied:t.windows <= 1 }));
  } });
  const active = worker(), next = worker();
  const registration = { ...eventTarget(), active, waiting:waiting ? next : null, installing:null, update() { updates++; return Promise.resolve(); } };
  const serviceWorker = { ...eventTarget(), controller:controlled ? active : null, register(url) { assert.equal(url, './sw.js'); registrations++; if (syncFail) throw Error('blocked'); return fail ? Promise.reject(Error('blocked')) : Promise.resolve(registration); } };
  class Channel {
    constructor() { const port1 = { closed:false, close() { this.closed = true; } }; this.port1 = port1; this.port2 = { send:data => { if (!port1.closed) port1.onmessage?.({ data }); } }; }
  }
  const window = { ...eventTarget(), isSecureContext:secure, location:{ reload:() => reloads++ } };
  const document = { ...eventTarget(), hidden:false, activeElement:null, querySelectorAll:sel => (sel === '.modal' ? MODALS.map(id => elements[id]) : []) };
  const setTimeout = (fn, ms) => { const id = ++timerId; timers.push({ id, fn, at:clock + (ms || 0) }); return id; };
  const clearTimeout = id => { const i = timers.findIndex(x => x.id === id); if (i >= 0) timers.splice(i, 1); };
  const context = vm.createContext({ window, document, navigator:support ? { serviceWorker } : {}, MessageChannel:noChannel ? undefined : Channel, setTimeout, clearTimeout, Date:{ now:() => (reads++, clock) }, $:id => elements[id], Promise });
  vm.runInContext(source + '\nthis.offline = { start:offlineStart, screen:offlineScreen, input:offlineInput, app:offlineApp, OFFLINE };', context);
  context.offline.screen('s-home'); context.offline.start();
  t = { windows:1, count:'now', answer:'now', counts:[], replies:[], context, window, document, elements, worker, registration, serviceWorker, offline:context.offline, next,
    // the clock forward by ms, running every timer that falls due on the way, in order
    advance(ms) { const end = clock + ms; for (;;) { timers.sort((a, b) => a.at - b.at || a.id - b.id); const due = timers[0]; if (!due || due.at > end) break; timers.shift(); clock = due.at; due.fn(); } clock = end; },
    countNow() { for (const r of t.counts.splice(0)) r(); },
    answerNow() { for (const r of t.replies.splice(0)) r(); },
    // the switch: the waiting worker takes over, as the browser does after skipWaiting
    switchTo(w = next) { registration.waiting = null; registration.active = w; serviceWorker.controller = w; serviceWorker.emit('controllerchange'); },
    // the first step (GAME_WINDOWS: the worker woken and the windows counted) and the second (SKIP_WAITING alone: the switch)
    counted:() => next.messages.filter(m => m === 'GAME_WINDOWS').length,
    asked:() => next.messages.filter(m => m === 'SKIP_WAITING alone').length,
    get updating() { return !elements['offline-update'].hidden && !elements['app-tools'].hidden; },
    get timers() { return timers.length; },
    get reloads() { return reloads; }, get reads() { return reads; }, get registrations() { return registrations; }, get updates() { return updates; },
    // a press and its release, as the browser sends them: a mouse (pointer 1), a finger (a pointer of its own and the touch count), a key
    down(id = 1, type = 'mouse') { window.emit('pointerdown', { pointerId:id, pointerType:type, isPrimary:true, buttons:1 }); if (type === 'touch') window.emit('touchstart', { touches:[{}] }); },
    up(id = 1, type = 'mouse') { window.emit('pointerup', { pointerId:id, pointerType:type, isPrimary:true, buttons:0 }); if (type === 'touch') window.emit('touchend', { touches:[] }); },
    tap(id, type) { t.down(id, type); t.up(id, type); },
    installEvent:() => ({ preventDefault() {}, prompt() { installs++; return Promise.resolve(); }, userChoice:Promise.resolve({ outcome:'dismissed' }) }), get installs() { return installs; } };
  return t;
}
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };
const IDLE = 1500;
// the markup: Updating is a status where Update Game was, not a button; the Install button and Offline Ready stay
{
  const tools = html.match(/<div class="app-tools" id="app-tools" hidden>([\s\S]*?)<\/div>/)[1];
  ok(/<span id="offline-status" role="status" hidden>Offline Ready<\/span>\s*<button class="app-action" id="b-install" hidden>Install Game<\/button>\s*<span id="offline-update" role="status" hidden>Updating<\/span>\s*$/.test(tools), 'Offline Ready, Install Game, then Updating as a status');
  ok(!/b-update|Update Game/.test(html.replace(/<dd class="web-only">[\s\S]*?<\/dd>/g, '')), 'no Update Game button left outside How to Play');
  const s = setup(); ok(s.offline.OFFLINE.idle === IDLE, 'the home waits 1.5 s of quiet');
}
for (const options of [{ secure:false }, { support:false }, { fail:true }, { syncFail:true }, { ready:false }, { noChannel:true }]) {
  const t = setup(options); await tick();
  ok(t.elements['offline-status'].hidden === true, 'no Offline Ready: ' + JSON.stringify(options));
  t.advance(IDLE + 300); const shown = t.updating;
  t.advance(10000);
  ok(t.reloads === 0 && shown === (options.ready === false), 'nothing reloads, and only a working worker updates: ' + JSON.stringify(options));
  if (options.secure === false || options.support === false) {
    // no worker to update the game (and the app, which never starts one): the clock is never read, so the tools' seeded runs that
    // move their clock on every read (career-season.mjs) play the same with this file in the bundle as without it
    t.offline.screen(null); t.offline.screen('s-home'); t.offline.input(); t.window.emit('pointerdown'); t.advance(10000);
    ok(t.reads === 0, 'no worker: the clock is never read: ' + JSON.stringify(options));
  }
}
{
  const t = setup({ waiting:false }); await tick();
  ok(t.elements['offline-status'].hidden === false, 'Offline Ready shows');
  ok(t.elements['b-install'].hidden === true, 'no Install before the browser offers it');
  const prompt = t.installEvent(); t.window.emit('beforeinstallprompt', prompt);
  ok(t.elements['b-install'].hidden === false, 'Install Game once offered');
  t.elements['b-install'].emit('click'); await tick();
  ok(t.installs === 1 && t.elements['b-install'].hidden === true, 'Install Game opens the prompt once');
  t.window.emit('beforeinstallprompt', t.installEvent()); t.window.emit('appinstalled');
  ok(t.elements['b-install'].hidden === true, 'installed: gone');
  t.offline.start(); ok(t.registrations === 1, 'one registration');
  t.advance(60000); ok(t.timers === 0, 'nothing waiting: no timer runs on the home');
}
// 1. a waiting worker applies on the home after the idle wait: SKIP_WAITING asked alone, Updating, and the reload on the switch
{
  const t = setup(); await tick();
  t.advance(IDLE - 100); ok(t.counted() === 0 && t.asked() === 0 && !t.updating, 'not before 1.5 s of quiet');
  t.advance(300); ok(t.counted() === 1 && t.asked() === 1, 'after it, the waiting worker is woken and counts the windows, then, the home still quiet, SKIP_WAITING alone');
  ok(t.next.messages.filter(m => m !== 'OFFLINE_STATUS').join() === 'GAME_WINDOWS,SKIP_WAITING alone', 'in that order, and nothing else (' + t.next.messages.join() + ')');
  ok(t.updating && t.elements['app-tools'].hidden === false, 'Updating shows where Update Game was');
  ok(t.reloads === 0, 'no reload before the switch');
  t.switchTo(); ok(t.reloads === 1, 'the switch: the game reloads on the new version');
  t.serviceWorker.emit('controllerchange'); t.offline.screen('s-home'); t.advance(10000);
  ok(t.reloads === 1 && t.asked() === 1 && t.counted() === 1, 'once');
}
{
  // An unrelated controller change (the same worker) never reloads; the version arriving later is applied after its own wait.
  const t = setup({ waiting:false }); await tick();
  t.serviceWorker.emit('controllerchange'); t.advance(5000); ok(t.reloads === 0, 'an unrelated controller change never reloads');
  t.registration.installing = t.next; t.registration.emit('updatefound');
  t.registration.waiting = t.next; t.registration.installing = null; t.next.state = 'installed'; t.next.emit('statechange');
  t.advance(IDLE + 300); ok(t.asked() === 1, 'a version arriving on a quiet home applies after the wait');
}
{
  // A page the network served (no controller: a hard reload) has nothing old to replace: no ask, no timer.
  const t = setup({ controlled:false }); await tick();
  t.advance(10000); ok(t.asked() === 0 && t.reloads === 0 && t.timers === 0, 'an uncontrolled page leaves the waiting worker alone');
}
// 2. not while a match, a drill or any other screen is up: it waits, and applies the next time the home shows, after its wait
for (const screen of [null, 's-practice', 's-teams', 's-hub', 's-cup', 's-career', 's-locker', 's-build', 's-help', 's-cabinet']) {
  const t = setup({ waiting:false }); await tick();
  t.advance(200); t.offline.screen(screen);                // Play pressed, or a drill, a picker, a championship
  t.registration.installing = t.next; t.registration.emit('updatefound');   // the version arrives meanwhile
  t.registration.waiting = t.next; t.registration.installing = null; t.next.state = 'installed'; t.next.emit('statechange');
  t.advance(60000); ok(t.asked() === 0 && t.reloads === 0 && t.timers === 0 && !t.updating, `${screen || 'a match'}: it waits, with no timer running`);
  t.offline.screen('s-home');
  t.advance(IDLE - 100); ok(t.asked() === 0, `${screen || 'a match'}: back on the home, not at once`);
  t.advance(300); ok(t.asked() === 1 && t.updating, `${screen || 'a match'}: back on the home, after the wait`);
  t.switchTo(); ok(t.reloads === 1, `${screen || 'a match'}: and the reload`);
}
{
  // Play pressed inside the second step's round trip (one message to a worker already awake): the answer and the switch land off the
  // home. Nothing shows there, and the reload waits for the home's own quiet, as for a switch another window made
  const t = setup(); t.answer = 'later'; await tick();
  t.advance(IDLE + 100); ok(t.asked() === 1 && !t.updating, 'asked, no answer yet');
  t.offline.screen(null); t.answerNow(); t.switchTo();
  ok(t.reloads === 0 && !t.updating, 'the answer and the switch mid-match: no reload, nothing shown');
  t.advance(60000); ok(t.reloads === 0, 'not all match');
  t.offline.screen('s-home'); ok(t.reloads === 0, 'back on the home: not at once');
  t.advance(IDLE - 100); ok(t.reloads === 0, 'nor before its quiet');
  t.advance(300); ok(t.reloads === 1 && t.updating, 'then the reload, Updating showing');
}
{
  // the answer on the home (Updating), then Play before the switch: Updating goes with the home, and the reload waits for its quiet
  const t = setup(); t.answer = 'later'; await tick();
  t.advance(IDLE + 100); t.answerNow(); ok(t.updating && t.reloads === 0, 'the answer: Updating, the switch on its way');
  t.offline.screen(null); ok(!t.updating, 'Play before the switch: Updating goes with the home');
  t.switchTo(); t.advance(60000); ok(t.reloads === 0, 'the switch mid-match: no reload');
  t.offline.screen('s-home'); t.advance(IDLE - 100); ok(t.reloads === 0, 'the home: not at once');
  t.advance(300); ok(t.reloads === 1, 'after its quiet');
}
{
  // the first step's round trip (an idle worker is stopped, and starting it takes a moment): Play pressed meanwhile asks no switch at all
  const t = setup(); t.count = 'later'; await tick();
  t.advance(IDLE + 100); ok(t.counted() === 1 && t.asked() === 0, 'the worker woken, the windows being counted');
  t.offline.screen(null); t.countNow();
  ok(t.asked() === 0, 'Play pressed meanwhile: the count comes back to no home, and no switch is asked');
  t.advance(60000); ok(t.asked() === 0 && t.reloads === 0, 'nor in the match');
  t.count = 'now'; t.offline.screen('s-home'); t.advance(IDLE - 100); ok(t.counted() === 1, 'the home: not at once');
  t.advance(300); ok(t.counted() === 2 && t.asked() === 1 && t.updating, 'after its quiet, both steps again');
}
{
  // a press made inside the first step's round trip and still held as the count comes back: no switch; it goes 1.5 s after the release
  const t = setup(); t.count = 'later'; await tick();
  t.advance(IDLE + 100); t.down(); t.countNow();
  ok(t.asked() === 0, 'a press down as the count comes back: no switch');
  t.advance(10000); ok(t.counted() === 1 && t.asked() === 0, 'held 10 s: nothing more');
  t.count = 'now'; t.up(); t.advance(IDLE - 100); ok(t.asked() === 0, 'let go: not before 1.5 s');
  t.advance(300); ok(t.counted() === 2 && t.asked() === 1, 'then it applies');
}
{
  // the worker says it switched but no switch comes (a newer version replaced it meanwhile): Updating goes, and the home asks again
  const t = setup(); await tick();
  t.advance(IDLE + 100); ok(t.updating, 'Updating');
  t.advance(t.offline.OFFLINE.answer + 100); ok(!t.updating && t.reloads === 0, 'no switch: Updating goes');
  t.advance(t.offline.OFFLINE.again + 300); ok(t.asked() === 2 && t.updating, 'and it asks again');
}
{
  // The guards behind the screen: a match being played or a drill under way never applies, whatever the screen says
  const t = setup(); await tick();
  t.context.playing = () => true; t.advance(10000); ok(t.asked() === 0, 'playing(): never');
  t.context.playing = () => false; t.context.practice = { id:'tag' }; t.advance(10000); ok(t.asked() === 0, 'a drill under way: never');
  t.context.practice = null; t.advance(300); ok(t.asked() === 1, 'neither: it applies');
}
// 3. not while anything is open over the home: a card (the grown-up check, the store and Grown-Ups, the Supporters' Wall, Add Your
//    Team and its confirm), the For Grown-Ups panel, the browser's install prompt, or a text field taking typing
for (const id of [...MODALS, 'pr-grownups']) {
  const t = setup(); await tick();
  t.elements[id].hidden = false; t.advance(30000); ok(t.asked() === 0, `${id} open: it waits`);
  t.elements[id].hidden = true; t.advance(300); ok(t.asked() === 1, `${id} shut: it applies`);
}
{
  const t = setup(); await tick();
  t.elements['pr-grownups'].hidden = false; t.elements['pr-grownups'].closest = () => ({});   // left open under another headline: not showing
  t.advance(IDLE + 100); ok(t.asked() === 1, 'For Grown-Ups inside a hidden headline does not hold it back');
}
{
  const t = setup(); await tick();
  t.document.activeElement = { tagName:'INPUT' }; t.advance(30000); ok(t.asked() === 0, 'a text field in use: it waits');
  t.document.activeElement = { tagName:'BUTTON' }; t.advance(300); ok(t.asked() === 1, 'a button focused: it applies');
}
{
  const t = setup(); await tick();
  let finish; const prompt = { preventDefault() {}, prompt() { return new Promise(r => { finish = r; }); }, userChoice:Promise.resolve({ outcome:'dismissed' }) };
  t.window.emit('beforeinstallprompt', prompt); t.advance(200);
  t.elements['b-install'].emit('click'); await tick();
  t.advance(30000); ok(t.asked() === 0, 'the browser\'s install prompt is up: it waits');
  finish(); await tick();
  t.advance(IDLE - 100); ok(t.asked() === 0, 'the prompt answered: a fresh wait');
  t.advance(300); ok(t.asked() === 1, 'then it applies');
}
// 4. never mid-input: a tap, a key, a scroll or a controller in the last 1.5 s holds it back, and the wait starts again from it
for (const [name, fire] of [['a tap', t => t.tap()], ['a finger lifting', t => t.window.emit('pointerup', { pointerId:1 })], ['the pointer moving', t => t.window.emit('pointermove', { pointerId:1, buttons:0 })], ['a touch', t => t.tap(7, 'touch')],
  ['a key', t => { t.window.emit('keydown', { code:'Space' }); t.window.emit('keyup', { code:'Space' }); }], ['a key let go', t => t.window.emit('keyup', { code:'Space' })], ['a scroll', t => t.window.emit('wheel')], ['a panel scrolling', t => t.window.emit('scroll')], ['a controller (pollPads)', t => t.offline.input()],
  ['the game coming back to the front', t => t.document.emit('visibilitychange')], ['the window focused', t => t.window.emit('focus')]]) {
  const t = setup(); await tick();
  t.advance(1000); fire(t);
  t.advance(1000); ok(t.asked() === 0, `${name} at 1.0 s: nothing at 2.0 s`);
  t.advance(400); ok(t.asked() === 0, `${name}: nothing at 2.4 s`);
  t.advance(200); ok(t.asked() === 1, `${name}: 1.5 s after it, it applies`);
}
{
  // input every second never lets it apply; quiet does
  const t = setup(); await tick();
  for (let i = 0; i < 20; i++) { t.advance(1000); t.window.emit('pointermove'); }
  ok(t.asked() === 0, 'input every second for 20 s: never');
  t.advance(IDLE + 300); ok(t.asked() === 1, 'then quiet: it applies');
}
// 4b. never mid-press: a press still held is input however still it is, and nothing applies until 1.5 s after its release
for (const [name, press, release] of [
  ['the mouse button held on Play', t => t.down(1, 'mouse'), t => t.up(1, 'mouse')],
  ['a finger held still', t => t.down(9, 'touch'), t => t.up(9, 'touch')],
  ['a finger held still, touch events only', t => t.window.emit('touchstart', { touches:[{}] }), t => t.window.emit('touchend', { touches:[] })],
  ['two fingers, lifted one at a time', t => { t.down(3, 'touch'); t.window.emit('pointerdown', { pointerId:4, pointerType:'touch', isPrimary:false }); t.window.emit('touchstart', { touches:[{}, {}] }); },
    t => { t.window.emit('pointerup', { pointerId:3, pointerType:'touch' }); t.window.emit('touchend', { touches:[{}] }); t.advance(5000); ok(t.counted() === 0, 'two fingers: one still down holds it'); t.up(4, 'touch'); }],
  ['a key held with its repeat off', t => t.window.emit('keydown', { code:'Enter' }), t => t.window.emit('keyup', { code:'Enter' })],
]) {
  const t = setup(); await tick();
  t.advance(1000); press(t);
  t.advance(10000); ok(t.counted() === 0 && t.asked() === 0, `${name} for 10 s: nothing`);
  release(t);
  t.advance(IDLE - 100); ok(t.counted() === 0, `${name}, let go: not before 1.5 s`);
  t.advance(300); ok(t.asked() === 1, `${name}: 1.5 s after the release, it applies`);
}
// 4c. a release that never arrives can't hold an update back for ever: each way a press is known to be over
for (const [name, press, mend] of [
  ['a mouse let go outside the window, then moved with no button down', t => t.down(1, 'mouse'), t => t.window.emit('pointermove', { pointerId:1, pointerType:'mouse', buttons:0 })],
  ['a finger whose pointerup went missing, then a touch count of 0', t => t.window.emit('pointerdown', { pointerId:5, pointerType:'touch', isPrimary:true }), t => t.window.emit('touchend', { touches:[] })],
  ['the same, then the next tap (a primary touch: no other finger is down)', t => t.window.emit('pointerdown', { pointerId:5, pointerType:'touch', isPrimary:true }),
    t => { t.window.emit('pointerdown', { pointerId:6, pointerType:'touch', isPrimary:true }); t.window.emit('pointerup', { pointerId:6, pointerType:'touch' }); }],
  ['a key pressed with Command (macOS sends no keyup for it), then Command let go', t => { t.window.emit('keydown', { code:'MetaLeft' }); t.window.emit('keydown', { code:'KeyS' }); }, t => t.window.emit('keyup', { code:'MetaLeft' })],
  ['everything held as the window loses the focus', t => { t.down(); t.window.emit('keydown', { code:'Space' }); t.window.emit('touchstart', { touches:[{}] }); }, t => t.window.emit('blur')],
  ['everything held as the game goes to the back, and back', t => { t.down(); t.window.emit('keydown', { code:'Space' }); }, t => { t.document.hidden = true; t.document.emit('visibilitychange'); t.document.hidden = false; t.document.emit('visibilitychange'); }],
]) {
  const t = setup(); await tick();
  t.advance(1000); press(t);
  t.advance(10000); ok(t.counted() === 0, `${name}: held, nothing`);
  mend(t);
  t.advance(IDLE - 100); ok(t.counted() === 0, `${name}: not before 1.5 s`);
  t.advance(300); ok(t.asked() === 1, `${name}: no longer held, it applies after the quiet`);
}
{
  // a controller: the real pollPads (input-devices.js), run here a frame at a time beside the offline client, reports a button held and
  // the stick off centre on every poll, so a press held still holds the update back and the quiet counts from the release
  const pads = fs.readFileSync(new URL('../src/input-devices.js', import.meta.url), 'utf8');
  const poll = pads.slice(pads.indexOf('const PADS = new Map();'), pads.indexOf('function padNav('));
  for (const [name, press, release] of [
    ['a controller button held (a shoulder, which does nothing on a menu)', gp => { gp.buttons[4] = { pressed:true, value:1 }; }, gp => { gp.buttons[4] = { pressed:false, value:0 }; }],
    ['a controller\'s stick held off centre', gp => { gp.axes[0] = 0.8; }, gp => { gp.axes[0] = 0; }],
  ]) {
    const t = setup(); await tick();
    const gp = { index:0, mapping:'standard', connected:true, buttons:Array.from({ length:17 }, () => ({ pressed:false, value:0 })), axes:[0, 0, 0, 0] };
    Object.assign(t.context, { two:{ on:false }, M:null, playing:() => false, demoOn:() => false, inputs:[{ keys:new Set(), held:new Set() }], hyp:Math.hypot, KEYDIR:{},
      setDev() {}, navPress() {}, navBack() {}, navMove() {}, btn() {}, resume() {}, padStart() {}, lightPad() {}, padNav() {}, demoPad() {}, twoClaim() {} });
    t.context.navigator.getGamepads = () => [gp];
    vm.runInContext(poll + '\npadsOn = true;', t.context);
    const frames = ms => { for (let i = 0; i < ms / 16; i++) { t.advance(16); t.context.pollPads(); } };
    frames(1000); press(gp);
    frames(10000); ok(t.counted() === 0, `${name} for 10 s: nothing`);
    release(gp);
    frames(IDLE - 100); ok(t.counted() === 0, `${name}, let go: not before 1.5 s`);
    frames(400); ok(t.asked() === 1, `${name}: 1.5 s after the release, it applies`);   // the home looks every 250 ms
  }
}
// 5. several windows: the worker takes over only for the game's only window (sw.js counts them). Told no, nothing shows and it asks
//    again 5 s later, still only from a quiet home
{
  const t = setup(); t.windows = 2; await tick();
  t.advance(IDLE + 100); ok(t.counted() === 1 && t.asked() === 0 && !t.updating && t.reloads === 0, 'another game window open: counted, no switch asked, nothing shown');
  t.advance(4500); ok(t.counted() === 1, 'not counted again within 5 s');
  t.advance(1000); ok(t.counted() === 2, 'counted again after');
  t.offline.screen(null); t.advance(60000); ok(t.counted() === 2, 'not from a match');
  t.windows = 1; t.offline.screen('s-home'); t.advance(IDLE + 100);
  ok(t.counted() === 3 && t.asked() === 1 && t.updating, 'the other window shut: from the quiet home it applies');
  t.switchTo(); ok(t.reloads === 1, 'and reloads');
}
{
  // a second window opening between the two steps: the worker counts again at the switch, and does not switch
  const t = setup(); t.answer = 'later'; await tick();
  t.advance(IDLE + 100); ok(t.asked() === 1, 'one window counted: the switch asked');
  t.windows = 2; t.answerNow(); ok(!t.updating && t.reloads === 0, 'a second window opened meanwhile: no switch, nothing shown');
  t.answer = 'now'; t.advance(t.offline.OFFLINE.again + 300); ok(t.counted() === 2 && t.asked() === 1, 'counted again 5 s later: two, so no switch asked');
  t.windows = 1; t.advance(t.offline.OFFLINE.again + 300); ok(t.asked() === 2 && t.updating, 'the second shut: it applies');
}
for (const step of ['count', 'answer']) {
  // no answer to either step (a worker busy or gone): asked again later, and an answer that comes too late is not heard
  const t = setup(); t[step] = 'later'; await tick();
  t.advance(IDLE + 100); ok(t.counted() === 1, `${step}: asked`);
  t.advance(t.offline.OFFLINE.answer + 100); ok(!t.updating && t.reloads === 0, `no answer to the ${step === 'count' ? 'first' : 'second'} step: nothing`);
  t.countNow(); t.answerNow(); ok(!t.updating && t.asked() === (step === 'count' ? 0 : 1), `${step}: the late answer is not heard`);
  t[step] = 'now'; t.advance(t.offline.OFFLINE.again + 300); ok(t.counted() === 2 && t.updating, `${step}: asked again, and this time it applies`);
}
{
  // the switch beats the worker's answer: Updating and the reload at once, and the late answer changes nothing
  const t = setup(); t.answer = 'later'; await tick();
  t.advance(IDLE + 100); t.switchTo(); ok(t.reloads === 1, 'the switch first: the reload');
  t.answerNow(); t.advance(10000); ok(t.reloads === 1, 'the late answer: nothing more');
}
{
  // a switch this page never asked for (another window's, or an older page's Update Game): on a quiet home it reloads after the
  // wait; in a match it waits, and reloads on the home after the wait, never mid-match
  const t = setup(); t.answer = 'never'; await tick();
  t.offline.screen(null); t.switchTo();
  t.advance(60000); ok(t.reloads === 0 && t.asked() === 0, 'another window\'s switch, mid-match: nothing');
  t.offline.screen('s-home'); t.advance(IDLE - 100); ok(t.reloads === 0, 'the home: not at once');
  t.tap(); t.advance(IDLE - 100); ok(t.reloads === 0, 'nor mid-input');
  t.down(); t.advance(10000); ok(t.reloads === 0, 'nor with a press held still'); t.up();
  t.elements['m-gate'].hidden = false; t.advance(30000); ok(t.reloads === 0, 'nor with the grown-up check open');
  t.elements['m-gate'].hidden = true; t.advance(300); ok(t.reloads === 1 && t.asked() === 0 && t.counted() === 0, 'then it reloads, with nothing to ask');
}
// a game left open hears of a new version from the home: at most once an hour
{
  const t = setup({ waiting:false }); await tick();
  t.offline.screen(null); t.offline.screen('s-home'); ok(t.updates === 0, 'registering has just checked');
  t.advance(3600e3); t.offline.screen(null); ok(t.updates === 0, 'not from a match');
  t.offline.screen('s-home'); ok(t.updates === 1, 'an hour on, the home checks');
  t.offline.screen(null); t.offline.screen('s-home'); t.document.emit('visibilitychange'); ok(t.updates === 1, 'not again within the hour');
  t.advance(3600e3); t.document.hidden = true; t.document.emit('visibilitychange'); ok(t.updates === 1, 'not as the game goes to the back');
  t.document.hidden = false; t.document.emit('visibilitychange'); ok(t.updates === 2, 'coming back to the front on the home, it checks');
}
{
  const t = setup(); await tick();
  ok(t.elements['offline-status'].hidden === false, 'ready');
  t.registration.active.cacheReady = false;
  t.serviceWorker.emit('controllerchange');
  ok(t.elements['offline-status'].hidden === true, 'explicit negative readiness clears a previously ready status');
}
// Run the production pad navigation with the real button classes and live UI state: Install is a pad target, Updating never is.
{
  const t = setup({ waiting:false }); await tick();
  const input = fs.readFileSync(new URL('../src/input-devices.js', import.meta.url), 'utf8');
  const navSource = input.slice(input.indexOf('let focusEl = null;'), input.indexOf('function navBack('));
  const quick = { hidden:false, disabled:false };
  const candidates = [quick, t.elements['b-install'], t.elements['offline-update']];
  candidates.forEach((el, i) => {
    const id = ['b-quick', 'b-install', 'offline-update'][i];
    const tag = html.match(new RegExp('<(?:button|span)[^>]*id="' + id + '"[^>]*>'))[0];
    const classes = (tag.match(/class="([^"]+)"/) || [0, ''])[1].split(/\s+/);
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
  t.elements['offline-update'].hidden = false;             // as while Updating shows
  ok(Array.from(nav.navCands(layer)).length === 1 && nav.navCands(layer)[0] === quick, 'hidden install is not a pad candidate, nor is Updating');
  t.window.emit('beforeinstallprompt', t.installEvent());
  ok(Array.from(nav.navCands(layer)).length === 2 && nav.navCands(layer)[1] === t.elements['b-install'], 'visible install uses the production selector');
  ok(nav.navMove(0, 0, 0) === quick, 'the ring starts on Play');
  ok(nav.navMove(0, 0, 1) === t.elements['b-install'], 'down to Install Game');
  ok(nav.navPress(0) === true, 'pressed'); await tick();
  ok(t.installs === 1, 'pad confirm invokes the real install handler');
  ok(nav.navMove(0, 0, 0) === quick && Array.from(nav.navCands(layer)).length === 1, 'consumed install prompt loses pad eligibility');
  t.offline.screen(null);
  ok(Array.from(nav.navCands(layer)).length === 1, 'hidden app-tools excludes its child controls');
}
console.log(`Offline UI: ${checks} checks passed (install, readiness, failures, updates on a quiet home only, never in a match or a drill, under a card, mid-input or mid-press, one window only, in two steps)`);

await browserChecks();

// ---------- in Chromium, a real service worker ----------
// The game is served as build one, then two to five: each the real page with its name in a meta tag and the real sw.js with that
// page's digest and a version of its own, so each is a new generation to the browser. Nothing is ever clicked once a version waits
// (but Play, once, to leave the home): the page goes from one build to the next by itself, on the home. A press held still (a mouse
// button, a finger, a controller button) holds each back until 1.5 s after its release. A championship and a career mid-way, and a
// setting changed, are on the save throughout and must come through every reload as they were.
function chromium() {
  const require = createRequire(import.meta.url);
  for (const from of [() => require('playwright'), () => require(path.join(execFileSync('npm', ['root', '-g'], { stdio:['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright'))]) {
    try { return from().chromium; } catch (e) { /* not here */ }
  }
  return null;
}
async function browserChecks() {
  if (process.env.GAME || process.env.NO_BROWSER) { console.log('Offline UI in Chromium: skipped (GAME or NO_BROWSER set)'); return; }
  const chrome = chromium();
  if (!chrome) { console.log('Offline UI in Chromium: skipped, Playwright is not installed (npm i -g playwright && npx playwright install chromium)'); return; }
  let browser;
  try { browser = await chrome.launch(); } catch (e) { console.log('Offline UI in Chromium: skipped, Chromium would not start (' + e.message.split('\n')[0] + ')'); return; }
  const root = fileURLToPath(new URL('../', import.meta.url));
  const page0 = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), sw0 = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const sha = text => createHash('sha256').update(text).digest('hex');
  const version0 = sw0.match(/const VERSION = '([0-9a-f]+)';/)[1];
  assert.equal(sw0.split(sha(page0)).length, 2, 'sw.js names index.html\'s digest once (run node tools/build.mjs)');
  const build = name => {
    const page = page0.replace('<head>\n', `<head>\n<meta name="tryline-build" content="${name}">\n`);
    return { name, page, sw:sw0.replace(sha(page0), sha(page)).replace(`const VERSION = '${version0}';`, `const VERSION = '${sha(version0 + name).slice(0, 24)}';`) };
  };
  let live = build('one');
  const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.webmanifest':'application/manifest+json' };
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const send = (type, body) => { res.writeHead(200, { 'content-type':type, 'cache-control':'no-store' }); res.end(body); };
    if (p === '/' || p === '/index.html') { send(TYPES['.html'], live.page); return; }
    if (p === '/sw.js') { send(TYPES['.js'], live.sw); return; }
    const file = path.resolve(root, p.replace(/^\/+/, ''));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    send(TYPES[path.extname(file)] || 'application/octet-stream', fs.readFileSync(file));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  let passed = 0;
  const check = (cond, msg) => { assert.ok(cond, 'Chromium: ' + msg); passed++; };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // a page mid-reload has no context to evaluate in: try again until it has
  const read = async (pg, fn, arg) => { for (let i = 0; ; i++) { try { return await pg.evaluate(fn, arg); } catch (e) { if (i > 100) throw e; await wait(100); } } };
  const until = async (pg, fn, ms, arg) => { const end = Date.now() + ms; while (Date.now() < end) { try { if (await pg.evaluate(fn, arg)) return true; } catch (e) { /* mid-reload */ } await wait(100); } return false; };
  const buildOf = pg => read(pg, () => (document.querySelector('meta[name="tryline-build"]') || {}).content || null);
  const loads = pg => read(pg, () => +sessionStorage.getItem('tl-loads'));
  const shown = pg => read(pg, () => +sessionStorage.getItem('tl-updating'));
  const waiting = pg => until(pg, () => navigator.serviceWorker.getRegistration().then(r => !!(r && r.waiting)), 20000);
  const update = pg => read(pg, () => navigator.serviceWorker.getRegistration().then(r => r.update()).then(() => true, () => false));
  const becomes = (pg, name, ms) => until(pg, name => (document.querySelector('meta[name="tryline-build"]') || {}).content === name && !!window.__tryline, ms, name);
  // what the player has: the save as stored, and what the game made of it (the championship's round, the career's matches, the
  // setting and the home's notes). A switch must leave the stored save exactly as it found it, and the game reading it the same
  const state = pg => read(pg, () => {
    const T = window.__tryline, c = T.teams.champ(), cr = T.career.get(), $ = id => document.getElementById(id);
    return { save:localStorage.getItem('tryline.v1'), seen:JSON.stringify({ round:c && c.round, results:c && c.results.length, year:cr && cr.year, played:cr && cr.season && cr.season.round, sound:T.debug.settings().sound,
      notes:[$('b-champ').textContent, $('champ-note').textContent, $('b-career').textContent, $('career-note').textContent] }) };
  });
  const same = (a, b) => a.save === b.save && a.seen === b.seen;
  try {
    const context = await browser.newContext({ viewport:{ width:844, height:390 } });
    // every load of a tab counted, and every time Updating shows, in the tab's sessionStorage, which a reload keeps
    await context.addInitScript(() => {
      const bump = k => { try { sessionStorage.setItem(k, String(+(sessionStorage.getItem(k) || 0) + 1)); } catch (e) { /* none */ } };
      bump('tl-loads');
      // what the page says to its workers, in order, and a hook for the moment it says it (section 4)
      const post = ServiceWorker.prototype.postMessage;
      ServiceWorker.prototype.postMessage = function (m, ...rest) {
        if (m && m.type !== 'OFFLINE_STATUS') { try { sessionStorage.setItem('tl-said', (sessionStorage.getItem('tl-said') || '') + m.type + (m.alone ? ' alone' : '') + ','); } catch (e) { /* none */ } if (window.__onSay) window.__onSay(m); }
        return post.call(this, m, ...rest);
      };
      new MutationObserver(list => { for (const m of list) if (m.target.id === 'offline-update' && !m.target.hidden && !m.target.closest('[hidden]')) bump('tl-updating'); })
        .observe(document, { attributes:true, attributeFilter:['hidden'], subtree:true });
    });
    const page = await context.newPage();
    await page.goto(base);
    check(await until(page, () => navigator.serviceWorker.getRegistration().then(r => !!(r && r.active && r.active.state === 'activated')), 20000), 'build one\'s worker installs and activates');
    await page.reload();
    check(await read(page, () => !!navigator.serviceWorker.controller) && await buildOf(page) === 'one', 'reloaded, build one controls the page');
    check(await until(page, () => !document.getElementById('offline-status').hidden, 10000), 'Offline Ready shows');
    // the player's progress: Sound Off by its button, a championship two rounds in, a career one match in through Play Match to full time
    await read(page, () => {
      const T = window.__tryline, X = T.teams, C = T.career, D = T.debug;
      document.getElementById('hl-settings').click(); document.querySelector('.seg[data-key="sound"]').children[1].click();
      X.newChamp(X.NATIONS[0], X.NATIONS.slice(1, 6)); const c = X.champ();
      for (let i = 0; i < 2; i++) { c.results.push(c.fixtures[i].map(p => ({ h:p[0], a:p[1], hs:20, as:10, ht:3, at:1 }))); c.round++; }
      X.save();
      C.start({ name:'Sam', pos:'B', num:7, club:X.CLUBS[0] });
      C.play(); T.M.half = 2; T.M.score = [21, 7]; T.M.tries = [3, 1]; T.arcade.endHalf(); D.exitMatch();
      D.goHome();
      return true;
    });
    const before = await state(page), was = JSON.parse(before.seen);
    check(was.round === 2 && was.results === 2 && was.played === 1 && was.sound === false && /Continue Championship/.test(was.notes[0]) && /Continue Career/.test(was.notes[2]), `a championship and a career mid-way, Sound Off (${was.round}, ${was.played})`);

    // 1. the owner's case: build two is published and the page reloaded: it opens on build one, the new worker waits, and with the
    //    pointer moving nothing happens; once the home is quiet it becomes build two with no tap
    live = build('two');
    let moving = true, x = 0;
    const wiggle = (async () => { while (moving) { x = (x + 37) % 600; try { await page.mouse.move(100 + x, 100 + (x % 150)); } catch (e) { /* mid-load */ } await wait(200); } })();
    await page.reload({ waitUntil:'domcontentloaded' });
    check(await buildOf(page) === 'one', 'reloaded, it still opens on build one (the old worker serves it)');
    let held = await state(page);
    check(held.seen === before.seen, 'and the game reads the save as before');
    check(await waiting(page), 'build two installs and waits');
    const loads1 = await loads(page);
    await wait(3000);
    check(await buildOf(page) === 'one' && await loads(page) === loads1, 'the pointer moving on the home: build two waits');
    moving = false; await wiggle;
    // the mouse button held still on the wordmark (a tap there does nothing) for 3 s: still build one, and not until 1.5 s after the release
    const mark = await page.locator('#s-home .word').boundingBox();
    await page.mouse.move(mark.x + mark.width / 2, mark.y + mark.height / 2);
    await page.mouse.down();
    await wait(3000);
    check(await buildOf(page) === 'one' && await loads(page) === loads1, 'the mouse button held still on the home for 3 s: build two waits');
    await page.mouse.up(); let upAt = Date.now();
    await wait(1000);
    check(await buildOf(page) === 'one' && await loads(page) === loads1, 'the button let go: not within 1 s');
    check(await becomes(page, 'two', 8000), 'the home quiet: it becomes build two by itself');
    check(Date.now() - upAt >= 1500, `not before 1.5 s after the release (${Date.now() - upAt} ms)`);
    check(/^GAME_WINDOWS,SKIP_WAITING alone,$/.test(await read(page, () => sessionStorage.getItem('tl-said'))), 'in two steps: the windows counted, then the switch (' + await read(page, () => sessionStorage.getItem('tl-said')) + ')');
    check(await loads(page) === loads1 + 1 && await shown(page) >= 1, `one reload, with Updating shown first (${await shown(page)})`);
    check(same(await state(page), held), 'the championship, the career and the setting come through the reload');

    // 2. build three arrives during a match, then during a drill: it waits through both, and applies once the home is back and quiet
    live = build('three');
    await read(page, () => { window.__stay = 1; const T = window.__tryline, N = T.teams.NATIONS; T.debug.startMatch(N[0], N[1], false); return true; });
    await update(page);
    check(await waiting(page), 'build three installs and waits during the match');
    await wait(3000);
    check(await buildOf(page) === 'two' && await read(page, () => window.__stay === 1 && document.getElementById('s-home').hidden && !!window.__tryline.M && !window.__tryline.M.demo), 'mid-match: no reload');
    await read(page, () => { const T = window.__tryline; T.debug.exitMatch(); T.practice.start('tag'); return true; });   // off the pitch and straight into a drill
    await wait(3000);
    check(await buildOf(page) === 'two' && await read(page, () => window.__stay === 1 && !!window.__tryline.practice.state()), 'mid-drill: no reload');
    await read(page, () => { window.__tryline.practice.choose(); return true; });
    await wait(1000);
    check(await buildOf(page) === 'two' && await read(page, () => window.__stay === 1 && !document.getElementById('s-home').hidden), 'back on the home: not at once');
    held = await state(page);
    // a finger held still on the wordmark for 3 s (touch through the DevTools protocol: pointer and touch events, as a phone sends them)
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled:true, maxTouchPoints:5 });
    const finger = await page.locator('#s-home .word').boundingBox(), at = { x:finger.x + finger.width / 2, y:finger.y + finger.height / 2 };
    await read(page, () => { window.__touch = []; for (const k of ['pointerdown', 'touchstart', 'pointerup', 'touchend']) window.addEventListener(k, e => window.__touch.push(e.type + (e.pointerType ? ':' + e.pointerType : ''))); return true; });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[at] });
    await wait(3000);
    check(await buildOf(page) === 'two' && await read(page, () => window.__stay === 1), 'a finger held still on the home for 3 s: build three waits');
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] }); upAt = Date.now();
    const touched = await read(page, () => window.__touch.join());
    check(touched === 'pointerdown:touch,touchstart,pointerup:touch,touchend', 'as a phone sends it (' + touched + ')');
    await wait(1000);
    check(await buildOf(page) === 'two' && await read(page, () => window.__stay === 1), 'the finger lifted: not within 1 s');
    check(await becomes(page, 'three', 8000), 'then, quiet, it becomes build three');
    check(Date.now() - upAt >= 1500, `not before 1.5 s after the finger lifted (${Date.now() - upAt} ms)`);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled:false });
    check(same(await state(page), held) && held.seen === before.seen, 'and the save is as it was');

    // 3. build four with a second window of the game open: neither switches while both are open; the second shut, the first does
    live = build('four');
    const other = await context.newPage();
    await other.goto(base);
    check(await buildOf(other) === 'three', 'a second window opens on build three');
    await update(page);
    check(await waiting(page), 'build four installs and waits');
    await wait(5000);
    check(await buildOf(page) === 'three' && await buildOf(other) === 'three', 'two windows, both quiet on the home: neither switches');
    check(await shown(page) === 2, 'and the first never showed Updating for it');
    held = await state(page);
    // a controller plugged in, with a shoulder button (nothing on a menu) held: the second window shut, it still waits; let go, it goes
    await read(page, () => {
      const gp = { index:0, id:'stub', mapping:'standard', connected:true, timestamp:0, buttons:Array.from({ length:17 }, () => ({ pressed:false, touched:false, value:0 })), axes:[0, 0, 0, 0] };
      gp.buttons[4] = { pressed:true, touched:true, value:1 }; window.__pad = gp; navigator.getGamepads = () => [gp];
      const e = new Event('gamepadconnected'); Object.defineProperty(e, 'gamepad', { value:gp }); window.dispatchEvent(e);
      return true;
    });
    await other.close();
    await wait(8000);
    check(await buildOf(page) === 'three' && await read(page, () => !!window.__pad), 'the second window shut, but a controller button held: it waits');
    await read(page, () => { window.__pad.buttons[4] = { pressed:false, touched:false, value:0 }; return true; }); upAt = Date.now();
    check(await becomes(page, 'four', 15000), 'the button let go: the first becomes build four by itself');
    check(Date.now() - upAt >= 1500, `not before 1.5 s after the release (${Date.now() - upAt} ms)`);
    check(same(await state(page), held) && held.seen === before.seen, 'the save is still as it was');

    // 4. build five, and Play pressed the moment the page asks the stopped worker to count the windows (starting a stopped worker
    //    takes a moment): no switch at all, so the team picker stays on build four's worker; back on the home, after its quiet, five
    live = build('five');
    await update(page);
    check(await waiting(page), 'build five installs and waits');
    await read(page, () => { sessionStorage.removeItem('tl-said'); window.__ctl = navigator.serviceWorker.controller; return true; });
    const sw = await context.newCDPSession(page);
    await sw.send('ServiceWorker.enable'); await sw.send('ServiceWorker.stopAllWorkers');
    await read(page, () => { window.__onSay = m => { if (m.type !== 'GAME_WINDOWS') return; window.__onSay = null; document.getElementById('b-quick').click(); }; return true; });
    check(await until(page, () => !document.getElementById('s-teams').hidden, 15000), 'Play pressed as the page asks for the count');
    await wait(3000);
    const off = await read(page, () => ({ said:sessionStorage.getItem('tl-said'), same:navigator.serviceWorker.controller === window.__ctl, home:!document.getElementById('s-home').hidden }));
    check(off.said === 'GAME_WINDOWS,' && off.same && !off.home && await buildOf(page) === 'four', `off the home: no switch asked, the picker still under build four's worker (${off.said})`);
    held = await state(page);
    await read(page, () => { window.__tryline.debug.goHome(); return true; });
    check(await becomes(page, 'five', 10000), 'back on the home, quiet: it becomes build five');
    check(same(await state(page), held) && held.seen === before.seen, 'and the save is as it was');
    const shells = await read(page, () => caches.keys().then(k => k.filter(n => n.startsWith('tryline-shell-')).length));
    check(shells === 1, `old generations do not pile up (${shells} shell cache)`);
    await context.close();
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`Offline UI in Chromium: ${passed} checks passed (builds one to five with a real worker: the home applies each by itself, never mid-input, with a mouse button, a finger or a controller button held, mid-match, mid-drill, beside another window or after Play pressed while the worker woke; the save kept)`);
}
