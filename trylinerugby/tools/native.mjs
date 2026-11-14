// The Try Line app (src/native.js, ../app): native detection stays off on the web and the web build behaves as before;
// under a stubbed window.Capacitor every in-app change applies (no service worker or install buttons, the app's own
// entries for the browser's, How to Play the same picture in both, no orientation lock, no bars, haptics, Android's Back); the save goes to Preferences and comes back; the typefaces are the game's own files, with
// Google Fonts gone; and the app's scripts copy the right files and set the native projects.
// node tools/native.mjs   Exits 1 on any failure.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const game = fileURLToPath(new URL('../', import.meta.url));
const appDir = fileURLToPath(new URL('../../app/', import.meta.url));
const read = f => fs.readFileSync(path.join(game, f), 'utf8');
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise(r => setImmediate(r)); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const STORE = 'tryline.v1';

// ---------- 1. on the web: native.js alone, in browsers with and without Capacitor's web runtime ----------
{
  const native = read('src/native.js');
  const web = Capacitor => {
    const calls = [], doc = { listeners:[], addEventListener:t => doc.listeners.push(t), querySelectorAll:() => [{ hidden:false }] };
    const window = Capacitor === undefined ? {} : { Capacitor };
    const ctx = vm.createContext({ window, document:doc, localStorage:{ getItem:() => null, setItem:() => calls.push('setItem') }, STORE, setTimeout, Promise, calls });
    vm.runInContext(native + '\nthis.N = { nativeOn, nativePlugin, nativeCall, nativeBoot, nativeStart, nativeBuzz, nativeMirror, nativeSaved, nativeApp };', ctx);
    return { N:ctx.N, calls, doc };
  };
  const plugins = calls => ({ Haptics:{ impact:() => { calls.push('impact'); return Promise.resolve(); } }, Preferences:{ get:() => { calls.push('get'); return Promise.resolve({ value:'{}' }); }, set:() => calls.push('set') }, StatusBar:{ hide:() => calls.push('hide') }, ScreenOrientation:{ lock:() => calls.push('lock') } });
  const cases = [['no Capacitor', undefined], ['Capacitor\'s web runtime', { isNativePlatform:() => false }], ['a broken bridge', { isNativePlatform:() => { throw Error('x'); } }], ['no isNativePlatform', {}], ['null', null]];
  for (const [label, cap] of cases) {
    const shared = [];
    if (cap) cap.Plugins = plugins(shared);
    const { N, calls, doc } = web(cap);
    ok(N.nativeOn() === false, `web (${label}): nativeOn() is false`);
    ok(N.nativePlugin('Haptics') === null && N.nativeBuzz(30) === false, `web (${label}): no plugin, and buzz() keeps navigator.vibrate`);
    let went = 0; N.nativeBoot(() => went++);
    ok(went === 1, `web (${label}): the game starts at once, in the same turn, as before`);
    N.nativeStart(); N.nativeMirror(); await N.nativeCall('StatusBar', 'hide'); await flush();
    ok(!shared.length && !calls.length && !doc.listeners.length && !N.nativeApp.started && !N.nativeApp.ready, `web (${label}): no plugin is called, no listener added, nothing written`);
  }
}

// ---------- 2. offline-client.js: the app registers no worker and shows no Install or Updating; the web is unchanged ----------
{
  const client = read('src/offline-client.js'), native = read('src/native.js');
  const run = (prefix, extra) => {
    let registrations = 0; const winEvents = [];
    const elements = Object.fromEntries(['app-tools', 'b-install', 'offline-update', 'offline-status'].map(id => [id, { hidden:true, disabled:false, addEventListener() {} }]));
    const window = { isSecureContext:true, addEventListener:t => winEvents.push(t), location:{ reload() {} }, ...extra };
    const serviceWorker = { controller:null, addEventListener() {}, register() { registrations++; return Promise.resolve({ addEventListener() {}, active:null, waiting:null, installing:null }); } };
    const ctx = vm.createContext({ window, navigator:{ serviceWorker }, MessageChannel:undefined, setTimeout, clearTimeout, $:id => elements[id], STORE, Promise });
    vm.runInContext(prefix + client + '\nthis.O = { start:offlineStart, screen:offlineScreen };', ctx);
    ctx.O.screen('s-home'); ctx.O.start();
    return { registrations, winEvents, elements };
  };
  const app = run(native, { Capacitor:{ isNativePlatform:() => true, Plugins:{} } });
  ok(app.registrations === 0, 'in the app no service worker is registered');
  ok(!app.winEvents.includes('beforeinstallprompt') && Object.values(app.elements).every(e => e.hidden), 'in the app Install Game, Updating and Offline Ready stay hidden, and no install prompt is taken');
  ok(!app.winEvents.length, 'and no input is watched for an update: the app has none to apply');
  const browser = run(native, {});
  ok(browser.registrations === 1 && browser.winEvents.includes('beforeinstallprompt'), 'in a browser the worker and the install prompt are as before');
  const bare = run('', {});
  ok(bare.registrations === 1, 'offline-client.js alone (no native.js) still registers, as offline-ui.mjs runs it');
}

// ---------- 3. the whole game under a stubbed Capacitor app ----------
const log = [];                                            // every plugin call: [plugin, method, options]
const prefs = new Map();
let getHold = deferred();                                  // the first Preferences.get waits for the test: the start must wait for it
const appListeners = {};
const stub = (name, methods) => Object.fromEntries(Object.entries(methods).map(([m, fn]) => [m, (...a) => { log.push([name, m, a[0]]); return fn(...a); }]));
const Plugins = {
  Preferences:stub('Preferences', { get:o => getHold ? getHold.promise : Promise.resolve({ value:prefs.has(o.key) ? prefs.get(o.key) : null }), set:o => { prefs.set(o.key, o.value); return Promise.resolve(); } }),
  Haptics:stub('Haptics', { impact:() => Promise.resolve() }),
  StatusBar:stub('StatusBar', { hide:() => Promise.resolve() }),
  SystemBars:stub('SystemBars', { hide:() => Promise.resolve() }),
  ScreenOrientation:stub('ScreenOrientation', { lock:() => Promise.resolve(), unlock:() => Promise.resolve() }),   // not shipped: here so a call would show
  App:stub('App', { addListener:(event, fn) => { appListeners[event] = fn; return Promise.resolve({ remove() {} }); }, minimizeApp:() => Promise.resolve() }),
};
let isNative = true;
globalThis.Capacitor = { isNativePlatform:() => isNative, getPlatform:() => 'android', Plugins };
const vibes = []; navigator.vibrate = ms => { vibes.push(ms); return true; };
// The harness builds its stand-in document when it loads. Wrapped as it is set, so the test can fire document events and
// find the web-only and app-only entries, which the stand-in does not model.
const docEvents = {}, webOnly = [{ hidden:false }, { hidden:false }, { hidden:false }, { hidden:false }], appOnly = [{ hidden:true }, { hidden:true }];
let theDoc = null;
Object.defineProperty(globalThis, 'document', { configurable:true, get:() => theDoc, set:d => {
  const all = d.querySelectorAll;
  theDoc = Object.assign(d, { addEventListener:(t, fn) => { (docEvents[t] ||= []).push(fn); }, querySelectorAll:sel => sel === '.web-only' ? webOnly : sel === '.app-only' ? appOnly : all(sel) });
} });
const fireDoc = (t, ev = {}) => { for (const fn of docEvents[t] || []) fn(ev); };
const calls = (plugin, method) => log.filter(([p, m]) => p === plugin && m === method);

const { T } = await import('./harness.mjs');
const N = T.native, D = T.debug, X = T.teams, $ = id => document.getElementById(id);
const store = new Map();                                    // the web view's localStorage, from here on
globalThis.localStorage = { getItem:k => store.has(k) ? store.get(k) : null, setItem:(k, v) => { store.set(k, String(v)); }, removeItem:k => { store.delete(k); } };

// 3a. the start: plugins first, and the game waits for Preferences
ok(N.on() === true, 'nativeOn() is true inside the app');
ok(!log.some(([p]) => p === 'ScreenOrientation'), 'the app never locks the orientation: a lock pins one side, and the native projects already allow landscape either way up');
ok(calls('StatusBar', 'hide').length === 1 && calls('SystemBars', 'hide').length === 1, 'the status bar (StatusBar) and the system bars (SystemBars) are hidden at start');
ok(typeof appListeners.backButton === 'function', 'Android\'s Back is taken by the game');
ok(webOnly.every(e => e.hidden) && appOnly.every(e => !e.hidden), 'the browser\'s entries (.web-only) are hidden in the app, and the app\'s (.app-only) shown');
ok(calls('Preferences', 'get').length === 1 && calls('Preferences', 'get')[0][2].key === STORE, 'with the web view\'s save gone, the start asks Preferences for tryline.v1');
ok(!N.state().ready, 'the game does not start before Preferences answers');

// 3b. the save comes back from Preferences
const kept = { settings:{ half:1, diff:2, sound:false, hints:false, tut:['pass'], played:7 }, champ:null, custom:[{ key:'my0', name:'Farnham Minis', id:'FAN', kit:'#123456', trim:'#abcdef', pace:3, power:3, handling:3, kicking:3, stamina:3 }], champHistory:[], seasonSerial:4, career:null, importLeague:null, store:{ owned:['tryline.full'] } };
getHold.resolve({ value:JSON.stringify(kept) }); getHold = null;
await flush();
ok(N.state().ready && N.state().restored, 'the start goes on once Preferences answers, with the save put back');
ok(D.settings().diff === 2 && D.settings().sound === false && D.settings().half === 1 && X.custom().some(t => t.name === 'Farnham Minis') && D.settings().played === 7, 'the game starts with the kept settings and the team made');
ok(JSON.parse(store.get(STORE)).seasonSerial === 4, 'the save is back in the web view\'s storage');

// 3c. every save is copied, once a turn, only when it changes, and never from practice
{
  const before = calls('Preferences', 'set').length;
  D.settings().diff = 0; X.save(); D.settings().sound = true; X.save();
  ok(calls('Preferences', 'set').length === before, 'the copy waits until the save is written');
  await flush();
  const sets = calls('Preferences', 'set').slice(before);
  ok(sets.length === 1 && sets[0][2].key === STORE && sets[0][2].value === store.get(STORE), 'two saves in one turn make one copy, the exact text in storage');
  ok(JSON.parse(prefs.get(STORE)).settings.diff === 0 && JSON.parse(prefs.get(STORE)).settings.sound === true, 'the copy holds the latest settings');
  X.save(); await flush();
  ok(calls('Preferences', 'set').length === before + 1, 'an unchanged save is not copied again');
  T.practice.start('defend'); D.settings().diff = 2; X.save(); await flush();
  ok(T.practice.state() && calls('Preferences', 'set').length === before + 1, 'practice never writes, so nothing is copied');
  T.practice.leave(); await flush();
  ok(!T.practice.state() && D.settings().diff === 0, 'leaving the drill puts the settings back');
}

// 3d. a later launch whose web view lost its storage gets the last copy back
{
  const copy = prefs.get(STORE), sets = calls('Preferences', 'set').length;
  store.clear(); D.settings().diff = 1;
  let went = 0;
  N.boot(() => { went++; X.load(); });
  ok(went === 0, 'the start waits for Preferences');
  await flush();
  ok(went === 1 && store.get(STORE) === copy && D.settings().diff === 0, 'the last copy comes back into storage and into the game');
  ok(calls('Preferences', 'set').length === sets, 'putting a copy back does not write it again');
}

// 3e. a save still in the web view is never replaced, and a copy that is not a save is ignored
{
  store.set(STORE, '{"settings":{"diff":2}}'); prefs.set(STORE, JSON.stringify(kept));
  const gets = calls('Preferences', 'get').length;
  ok(await N.saved() === null && calls('Preferences', 'get').length === gets, 'a save in the web view: Preferences is not even asked');
  store.clear();
  for (const bad of ['not json', '[1,2]', '"text"', '', 'null']) { prefs.set(STORE, bad); ok(await N.saved() === null, `a copy reading ${JSON.stringify(bad)} is not put back`); }
  prefs.delete(STORE); ok(await N.saved() === null, 'no copy: nothing to put back');
}

// 3f. Preferences that never answers: the game starts after the wait, copies nothing over Preferences meanwhile, and a late
// answer's copy goes back (at once on the menus, at the next home after a match or a drill), a purchase made meanwhile kept
{
  const copy = JSON.stringify(kept);
  store.clear(); prefs.set(STORE, copy); D.goHome();
  const late = deferred(); getHold = late;
  const keep = N.state().wait; N.state().wait = 40;
  let went = 0; N.boot(() => went++);
  await flush();
  ok(went === 0, 'the start waits while Preferences is silent');
  await wait(60);
  ok(went === 1, 'after the wait the game starts without it');
  const sets = calls('Preferences', 'set').length;
  D.settings().diff = 1; D.settings().played = 0; X.save(); await flush();
  ok(store.has(STORE) && calls('Preferences', 'set').length === sets && prefs.get(STORE) === copy, 'the fresh game saves, but nothing is copied over Preferences before it answers');
  late.resolve({ value:copy }); await flush();
  ok(went === 1 && store.get(STORE) === copy && D.settings().diff === 2 && D.settings().played === 7 && X.custom().some(t => t.name === 'Farnham Minis') && !$('s-home').hidden, 'on the menus, a late answer\'s copy goes back into storage and into the game, on the home');
  ok(calls('Preferences', 'set').length === sets && N.state().restored, 'and is not copied again');
  D.settings().diff = 0; X.save(); await flush();
  ok(calls('Preferences', 'set').length === sets + 1 && JSON.parse(prefs.get(STORE)).settings.diff === 0, 'from then on each save is copied as before');
  // a late answer during a drill: held until the next home, with a purchase made meanwhile kept
  prefs.set(STORE, copy); store.clear();
  const late2 = deferred(); getHold = late2;
  N.boot(() => {}); await wait(60);
  T.store.setBought(['tryline.fan.farnham']); X.save(); await flush();
  T.practice.start('defend');
  late2.resolve({ value:copy }); await flush();
  ok(T.practice.state() && prefs.get(STORE) === copy && N.state().late === copy, 'in a drill the copy waits, and Preferences still holds it');
  T.practice.leave(); D.goHome(); await flush();
  const back = JSON.parse(store.get(STORE));
  ok(back.seasonSerial === 4 && back.custom.some(t => t.name === 'Farnham Minis') && back.store.owned.join() === 'tryline.full,tryline.fan.farnham' && !N.state().late, 'at the next home it goes back, with the Super Fan bought meanwhile kept');
  ok(JSON.parse(prefs.get(STORE)).store.owned.join() === 'tryline.full,tryline.fan.farnham', 'and Preferences gets the two together');
  // no copy in Preferences after all: copying starts with the answer
  prefs.delete(STORE); store.clear();
  const late3 = deferred(); getHold = late3;
  N.boot(() => {}); await wait(60);
  X.save(); await flush();
  ok(!prefs.has(STORE), 'still silent: nothing copied');
  late3.resolve({ value:null }); await flush();
  ok(prefs.get(STORE) === store.get(STORE), 'it answers with no copy: the game\'s save is copied at once');
  getHold = null; N.state().wait = keep; T.store.setBought([]);
}

// 3l. a save in the web view that does not read as one (cut short) counts as lost, and is never copied
{
  store.set(STORE, '{"settings":{"half":0'); prefs.set(STORE, JSON.stringify(kept));
  const gets = calls('Preferences', 'get').length, sets = calls('Preferences', 'set').length;
  ok(await N.saved() === JSON.stringify(kept) && calls('Preferences', 'get').length === gets + 1, 'Preferences is asked, and its copy is the one to put back');
  N.mirror(); await flush();
  ok(calls('Preferences', 'set').length === sets && prefs.get(STORE) === JSON.stringify(kept), 'the cut-short text is never copied over it');
  store.clear(); X.save(); await flush();
}

// 3g. plugins missing or failing leave the web behaviour, and never throw
{
  const saved = { ...Plugins };
  Plugins.Preferences = { get:() => Promise.reject(Error('gone')), set:() => { throw Error('gone'); } };
  store.clear();
  ok(await N.saved() === null, 'a failing Preferences.get: nothing put back');
  let threw = false; try { D.settings().diff = 2; X.save(); await flush(); } catch (e) { threw = true; }
  ok(!threw && store.has(STORE), 'a failing Preferences.set: the save still goes to storage');
  delete Plugins.Preferences; delete Plugins.Haptics; delete Plugins.StatusBar;
  threw = false; try { X.save(); N.bars(); await flush(); } catch (e) { threw = true; }
  ok(!threw && N.buzz(30) === false, 'missing plugins: nothing throws, and buzz() falls back to navigator.vibrate');
  Object.assign(Plugins, saved);
  D.settings().diff = 0; X.save(); await flush();
}

// 3h. haptics: buzz() in a match taps through Haptics, never navigator.vibrate
{
  const styles = [12, 15, 16, 30, 31, 60].map(ms => { const n = log.length; N.buzz(ms); return log.slice(n).find(([p]) => p === 'Haptics')[2].style; });
  ok(JSON.stringify(styles) === JSON.stringify(['LIGHT', 'LIGHT', 'MEDIUM', 'MEDIUM', 'HEAVY', 'HEAVY']), `a light tap to 15ms, medium to 30, heavy above (${styles.join(' ')})`);
  D.startMatch(X.NATIONS[0], X.NATIONS[1], false);
  const taps = calls('Haptics', 'impact').length;
  vibes.length = 0;
  const step = () => { T.M.stepN++; T.calls.callsTick(); };      // On Fire's roar and buzz go with its banner, a step after it is said (src/calls.js)
  for (let i = 0; i < 3; i++) T.arcade.heat(0, 'hit');            // three Big Hits light On Fire: buzz(50)
  step();
  ok(T.arcade.onFire(0) && calls('Haptics', 'impact').length === taps + 1 && calls('Haptics', 'impact').at(-1)[2].style === 'HEAVY' && vibes.length === 0, 'On Fire in a match: one heavy tap, and no navigator.vibrate');
  T.arcade.fireOut(0);
  const h = Plugins.Haptics; delete Plugins.Haptics;
  for (let i = 0; i < 3; i++) T.arcade.heat(0, 'hit');
  step();
  ok(vibes.length === 1 && vibes[0] === 50, 'an app without Haptics vibrates as the web does');
  Plugins.Haptics = h; T.arcade.fireOut(0);
}

// 3i. Android's Back: Escape in play, a card's or screen's own Back, and away to the background from the home menu
{
  const back = appListeners.backButton;
  ok(D.paused() === false, 'a match under way');
  back();
  ok(D.paused() === true && !$('m-pause').hidden, 'Back in play pauses');
  back();
  ok(D.paused() === false && $('m-pause').hidden, 'Back on the pause card resumes');
  let cancelled = 0;
  $('m-gate').querySelectorAll = sel => sel.includes('[data-back]') ? [$('pg-cancel')] : [];   // the stand-in elements hold no children: the check's Cancel is its Back, as in index.html
  T.kids.parentGate(() => {}, () => cancelled++);
  back();
  ok(cancelled === 1 && $('m-gate').hidden && D.paused() === false, 'Back with the grown-up check open is its Cancel, and the match is left alone');
  D.exitMatch(); D.goHome();
  let clicks = 0;
  $('s-help').querySelectorAll = sel => sel.includes('[data-back]') ? [{ hidden:false, click:() => clicks++ }] : [];
  $('b-help').click();
  ok(!$('s-help').hidden, 'How to Play is open');
  back();
  ok(clicks === 1, 'Back on a screen presses its own Back to Menu');
  D.goHome();
  const mins = calls('App', 'minimizeApp').length;
  back();
  ok(calls('App', 'minimizeApp').length === mins + 1, 'Back on the home menu puts the app in the background, the game kept');
  T.practice.start('defend');
  ok(T.practice.state() && T.practice.state().ready, 'a drill waiting for Start');
  back();
  ok(!T.practice.state(), 'Back on a drill\'s card goes back to the drills, as Escape does');
  D.goHome();
}

// 3j. the bars come back after the background or a keyboard, and are hidden again
{
  const n = calls('StatusBar', 'hide').length, sys = calls('SystemBars', 'hide').length;
  document.hidden = true; fireDoc('visibilitychange'); document.hidden = false;
  ok(calls('StatusBar', 'hide').length === n, 'going to the background asks nothing');
  fireDoc('visibilitychange');
  ok(calls('StatusBar', 'hide').length === n + 1 && calls('SystemBars', 'hide').length === sys + 1, 'coming back hides the bars again');
  fireDoc('focusout', { target:{ tagName:'BUTTON' } }); fireDoc('focusout', { target:{ tagName:'INPUT' } });
  await wait(350);
  ok(calls('StatusBar', 'hide').length === n + 2, 'a text box losing focus (the keyboard closing) hides them again; a button does not');
}

// 3k. the web's fullscreen and orientation request is left to the app
{
  let fsCalls = 0;
  const mm = globalThis.matchMedia; globalThis.matchMedia = q => ({ matches:/coarse/.test(q), addEventListener() {}, addListener() {} });
  document.documentElement = { requestFullscreen:() => { fsCalls++; return Promise.resolve(); } };
  D.startMatch(X.NATIONS[0], X.NATIONS[1], false);
  ok(fsCalls === 0 && !log.some(([p]) => p === 'ScreenOrientation'), 'in the app a match asks for no fullscreen and locks no orientation (landscape and no bars already)');
  D.exitMatch(); isNative = false;
  D.startMatch(X.NATIONS[0], X.NATIONS[1], false);
  ok(fsCalls === 1, 'on a touch browser it still does, as before');
  D.exitMatch(); isNative = true; globalThis.matchMedia = mm; delete document.documentElement; D.goHome();
}

// ---------- 4. the typefaces are the game's own ----------
const html = read('index.html');
{
  ok(!/fonts\.googleapis|fonts\.gstatic|preconnect/.test(html), 'index.html no longer calls Google Fonts');
  const links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]);
  ok(links[0] === 'fonts/fonts.css' && links.includes('styles.css'), `fonts/fonts.css loads before the game's stylesheets (${links.join(', ')})`);
  const css = read('fonts/fonts.css');
  const faces = [...css.matchAll(/@font-face\{([^}]*)\}/g)].map(m => ({ family:m[1].match(/font-family:'([^']+)'/)[1], weight:+m[1].match(/font-weight:(\d+)/)[1], file:m[1].match(/url\(([^)]+)\)/)[1], swap:/font-display:swap/.test(m[1]) }));
  const weights = fam => [...new Set(faces.filter(f => f.family === fam).map(f => f.weight))].sort();
  ok(JSON.stringify(weights('Big Shoulders Display')) === '[700,800,900]' && JSON.stringify(weights('Atkinson Hyperlegible')) === '[400,700]' && faces.every(f => ['Big Shoulders Display', 'Atkinson Hyperlegible'].includes(f.family)), 'the same families and weights as the old Google Fonts link: Big Shoulders Display 700 800 900, Atkinson Hyperlegible 400 700');
  ok(faces.every(f => f.swap) && faces.length === 13, 'every face swaps in as Google\'s did (font-display: swap), latin, latin-ext and Big Shoulders\' vietnamese');
  ok(new Set(faces.filter(f => f.family === 'Big Shoulders Display').map(f => f.file)).size === 3, 'Big Shoulders Display is its variable font, one file a character range for all three weights, as Google serves it');
  ok(faces.every(f => { const b = fs.readFileSync(path.join(game, 'fonts', f.file)); return b.length > 1000 && b.toString('latin1', 0, 4) === 'wOF2'; }), 'every file it names is a WOFF2 font beside it');
  const styles = read('styles.css') + read('practice.css'), src = fs.readdirSync(path.join(game, 'src')).filter(f => f.endsWith('.js')).map(f => read('src/' + f)).join('\n');
  const usedDisplay = new Set([...styles.matchAll(/font:(\d00) [^;}]*var\(--display\)/g), ...src.matchAll(/(\d00) [^'`]*'Big Shoulders Display'/g)].map(m => +m[1]));
  ok([...usedDisplay].every(w => weights('Big Shoulders Display').includes(w)) && usedDisplay.size >= 2, `every Big Shoulders weight the game asks for is shipped (${[...usedDisplay].join(', ')})`);
  ok(/--display:'Big Shoulders Display'/.test(styles) && /--body:'Atkinson Hyperlegible'/.test(styles), 'the stylesheets still name the same families');
  for (const [file, holder] of [['OFL-BigShouldersDisplay.txt', 'The Big Shoulders Project Authors'], ['OFL-AtkinsonHyperlegible.txt', 'Braille Institute of America']]) {
    const t = read('fonts/' + file);
    ok(t.includes('SIL OPEN FONT LICENSE Version 1.1') && t.split('\n')[0].includes(holder), `fonts/${file}: the Open Font License with ${holder}'s copyright`);
  }
  const { shellAssets, fontAssets, assembleWorker } = await import('./build.mjs');
  ok(fontAssets().every(f => shellAssets.includes(f)) && shellAssets.includes('fonts/fonts.css'), 'the fonts are in the service worker\'s shell, so offline play keeps them');
  const sw = read('sw.js');
  ok(sw === assembleWorker().worker && faces.every(f => sw.includes('"fonts/' + f.file + '"')), 'sw.js lists and hashes every font file');
  const priv = read('PRIVACY.md');
  ok(!/loads its two typefaces from Google/i.test(priv) && /typefaces come with the game/i.test(priv) && !/as Google does/i.test(priv), 'PRIVACY.md says the typefaces come with the game and Google gets no request');
  ok(/## Going online\n\n[^\n]*The app has its files built in/.test(priv), 'PRIVACY.md says the app has its files built in, rather than fetching them');
}

// ---------- 4b. How to Play: the same picture in a browser and in the app ----------
// re-pinned 2026-11-09: its Saving (the browser's and the app's) and Install & Offline entries went with the prose, so nothing on it is the web's or the app's alone
{
  const entries = [...html.matchAll(/<(dt|dd)(?: class="([^"]*)")?( hidden)?>([\s\S]*?)<\/\1>/g)].map(m => ({ tag:m[1], cls:(m[2] || '').split(' '), hidden:!!m[3], text:m[4] }));
  const help = html.slice(html.indexOf('id="s-help"'), html.indexOf('</section>', html.indexOf('id="s-help"')));
  ok(help.includes('id="h-pic"') && !/web-only|app-only|Saving|Install|Safari|browser/i.test(help), 'How to Play has no browser or app entry: no Saving, no Install & Offline');
  ok(entries.filter(e => e.cls.includes('app-only')).every(e => e.hidden) && /\[hidden\]\{display:none!important\}/.test(read('styles.css')), 'every app-only entry starts hidden, so a browser never shows one');
  ok(!entries.some(e => !e.cls.includes('web-only') && !e.cls.includes('app-only') && e.text === 'Saving'), 'no Saving entry is shown to both');
}

// ---------- 5. safe areas ----------
{
  ok(/viewport-fit=cover/.test(html), 'the page reaches the screen edges (viewport-fit=cover), so the safe-area insets are real');
  const styles = read('styles.css');
  ok(['left', 'right', 'top', 'bottom'].every(s => styles.includes('env(safe-area-inset-' + s)), 'the controls, the HUD and the screens keep inside every safe-area inset');
  const cfg = JSON.parse(fs.readFileSync(path.join(appDir, 'capacitor.config.json'), 'utf8'));
  ok(cfg.ios && cfg.ios.contentInset === 'never' && cfg.plugins.SystemBars.insetsHandling === 'css' && cfg.plugins.SystemBars.hidden === true, 'iOS leaves the insets to the page, and Android\'s SystemBars passes them through with the bars hidden');
}

// ---------- 6. the app project ----------
{
  const pkg = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8'));
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  ok(Object.values(all).every(v => /^\d+\.\d+\.\d+$/.test(v)), 'every package is pinned to an exact version');
  const need = ['@capacitor/core', '@capacitor/cli', '@capacitor/ios', '@capacitor/android', '@capacitor/haptics', '@capacitor/preferences', '@capacitor/status-bar', '@capacitor/app'];
  ok(need.every(p => all[p]), 'Capacitor and every plugin the game calls are in package.json');
  ok(!all['@capacitor/screen-orientation'] && !/ScreenOrientation/.test(read('src/native.js').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')), 'no orientation plugin: the app is never pinned to one landscape side');
  ok(new Set(['core', 'cli', 'ios', 'android'].map(p => all['@capacitor/' + p])).size === 1 && need.every(p => all[p].split('.')[0] === all['@capacitor/core'].split('.')[0]), `Capacitor's packages share one version and the plugins its major (${all['@capacitor/core']})`);
  const lock = JSON.parse(fs.readFileSync(path.join(appDir, 'package-lock.json'), 'utf8'));
  ok(JSON.stringify(lock.packages[''].dependencies) === JSON.stringify(pkg.dependencies) && JSON.stringify(lock.packages[''].devDependencies) === JSON.stringify(pkg.devDependencies), 'package-lock.json matches package.json');
  const cfg = JSON.parse(fs.readFileSync(path.join(appDir, 'capacitor.config.json'), 'utf8'));
  ok(cfg.appId === 'ai.signcheck.tryline' && cfg.appName === 'Tryline Rugby' && cfg.webDir === 'www', `capacitor.config.json: SignCheck Ltd's app id ai.signcheck.tryline, Tryline Rugby, www (${cfg.appId}, ${cfg.appName})`);
  ok(cfg.backgroundColor === read('styles.css').match(/--night:(#[0-9a-f]{6})/)[1], 'the web view\'s background is the game\'s night ground, so nothing flashes white');
  ok(cfg.plugins.CapacitorHttp.enabled === false, 'fetch and XMLHttpRequest stay the web view\'s own; Import calls CapacitorHttp directly');
  ok(/(^|\n)www\/(\n|$)/.test(fs.readFileSync(path.join(appDir, '.gitignore'), 'utf8')) && /node_modules\//.test(fs.readFileSync(path.join(appDir, '.gitignore'), 'utf8')), 'app/www and node_modules are never committed');
  const png = f => { const b = fs.readFileSync(path.join(appDir, 'assets', f)); return { w:b.readUInt32BE(16), h:b.readUInt32BE(20), type:b[25], sig:b.toString('latin1', 1, 4) }; };
  for (const [f, size, alpha] of [['icon-only.png', 1024, false], ['icon-background.png', 1024, false], ['icon-foreground.png', 1024, true], ['splash.png', 2732, false], ['splash-dark.png', 2732, false]]) {
    const p = png(f);
    ok(p.sig === 'PNG' && p.w === size && p.h === size && (p.type === 6) === alpha, `assets/${f}: ${size} square, ${alpha ? 'transparent' : 'opaque, no alpha'} (${p.w}x${p.h}, colour type ${p.type})`);
  }
  const { iconArt, sources } = await import('../../app/scripts/make-assets.mjs');
  ok(sources(iconArt(read('icons/icon.svg')))['icon-only.png'].svg.includes('#092b24'), 'the icon sources are drawn from icons/icon.svg');
}

// ---------- 7. copy-www.mjs copies exactly the shipping files ----------
{
  const { copyWww, wwwFiles, localRefs } = await import('../../app/scripts/copy-www.mjs');
  const { shellAssets } = await import('./build.mjs');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'tryline-www-'));
  try {
    copyWww(out);
    const walk = d => fs.readdirSync(d, { withFileTypes:true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)).map(f => e.name + '/' + f) : [e.name]);
    const copied = walk(out).sort();
    ok(JSON.stringify(copied) === JSON.stringify(wwwFiles().sort()) && shellAssets.every(f => copied.includes(f)), `the copy is the shell plus the font licences (${copied.length} files)`);
    ok(!copied.some(f => /^(src|tools)\//.test(f) || f === 'sw.js' || f.endsWith('.md') || f.startsWith('.')), 'no sw.js, src/, tools/, docs or dot files');
    ok(copied.every(f => fs.readFileSync(path.join(out, f)).equals(fs.readFileSync(path.join(game, f)))), 'every file copied byte for byte');
    ok(localRefs().every(r => copied.includes(r)) && localRefs().includes('fonts/fonts.css') && localRefs().includes('game.js'), 'everything the page and its stylesheets name is in the copy');
    let refused = false; try { copyWww(game); } catch (e) { refused = true; }
    ok(refused && fs.existsSync(path.join(game, 'index.html')), 'it refuses to replace the game folder');
  } finally { fs.rmSync(out, { recursive:true, force:true }); }
}

// ---------- 8. native-config.mjs sets the native projects (on Capacitor's own template files) ----------
{
  const { patchInfoPlist, patchXcodeProject, patchDeviceFamily, patchAndroidManifest } = await import('../../app/scripts/native-config.mjs');
  const fx = f => fs.readFileSync(path.join(game, 'tools/fixtures/native', f), 'utf8');
  const plist = patchInfoPlist(fx('Info.plist'));
  const val = key => { const m = plist.match(new RegExp('<key>' + key.replace(/[~]/g, '\\$&') + '</key>\\s*(<array>[\\s\\S]*?</array>|<true/>|<false/>)')); return m && m[1].replace(/\s+/g, ''); };
  const land = '<array><string>UIInterfaceOrientationLandscapeLeft</string><string>UIInterfaceOrientationLandscapeRight</string></array>';
  ok(val('UISupportedInterfaceOrientations') === land && val('UISupportedInterfaceOrientations~ipad') === land, 'iOS: landscape only, either way up, on iPhone and iPad');
  ok(val('UIRequiresFullScreen') === '<true/>' && val('UIStatusBarHidden') === '<true/>' && val('UIViewControllerBasedStatusBarAppearance') === '<true/>', 'iOS: full screen, no status bar from launch, and the StatusBar plugin still in charge');
  ok(val('ITSAppUsesNonExemptEncryption') === '<false/>', 'iOS: export compliance answered (only the system\'s HTTPS)');
  ok(patchInfoPlist(plist) === plist && (plist.match(/<key>/g) || []).length === (fx('Info.plist').match(/<key>/g) || []).length + 3, 'iOS: run twice, nothing changes; three keys added, none doubled');
  const pbx = patchXcodeProject(fx('project.pbxproj'));
  ok(pbx && (pbx.match(/PrivacyInfo\.xcprivacy/g) || []).length === 6 && patchXcodeProject(pbx) === pbx, 'iOS: the privacy manifest joins the App target\'s resources, once');
  ok(patchXcodeProject(fx('project.pbxproj').replace('/* capacitor.config.json in Resources */,', '')) === null, 'iOS: a project changed by hand is left alone (the README says how to add it in Xcode)');
  const fam = patchDeviceFamily(fx('project.pbxproj'));
  ok(fam && !/TARGETED_DEVICE_FAMILY = "1,2";/.test(fam) && (fam.match(/TARGETED_DEVICE_FAMILY = 1;/g) || []).length === 2 && patchDeviceFamily(fam) === fam, 'iOS: iPhone only, in both the Debug and Release builds, once (the owner\'s choice for the first version)');
  ok(patchDeviceFamily(fx('project.pbxproj').replace(/TARGETED_DEVICE_FAMILY = "1,2";/g, '')) === null, 'iOS: a project with no device family line is reported, not guessed at');
  const privacy = fs.readFileSync(path.join(appDir, 'native/PrivacyInfo.xcprivacy'), 'utf8');
  ok(/<key>NSPrivacyTracking<\/key>\s*<false\/>/.test(privacy) && /<key>NSPrivacyCollectedDataTypes<\/key>\s*<array\/>/.test(privacy) && /NSPrivacyAccessedAPICategoryUserDefaults[\s\S]*CA92\.1/.test(privacy), 'the privacy manifest: no tracking, no data collected, UserDefaults for the app\'s own data (Preferences)');
  const am = patchAndroidManifest(fx('AndroidManifest.xml'));
  ok(/<activity\b[^>]*android:screenOrientation="sensorLandscape"[^>]*android:name="\.MainActivity"/.test(am), 'Android: the game\'s activity is landscape, either way up');
  ok(/<uses-permission android:name="com\.google\.android\.gms\.permission\.AD_ID" tools:node="remove" \/>/.test(am) && /xmlns:tools=/.test(am), 'Android: no advertising ID permission, whatever a library asks (Families policy)');
  ok(/android:allowBackup="true"/.test(fx('AndroidManifest.xml')) && /<application\b[^>]*android:allowBackup="false"/.test(am) && (am.match(/allowBackup/g) || []).length === 1, 'Android: no cloud backup of the save (the template\'s allowBackup true set to false), so deleting the app removes it, as PRIVACY.md says');
  const bare = patchAndroidManifest(fx('AndroidManifest.xml').replace(/\s*android:allowBackup="true"/, ''));
  ok(/<application\b[^>]*android:allowBackup="false"/.test(bare) && patchAndroidManifest(bare) === bare, 'Android: a manifest without allowBackup gets it, once');
  ok(patchAndroidManifest(am) === am && (am.match(/screenOrientation/g) || []).length === 1, 'Android: run twice, nothing changes');
}

console.log(`Native: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
