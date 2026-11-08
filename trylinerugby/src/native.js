/* =========================================================
   The Try Line app. What the game does differently inside the iOS and Android app (Capacitor, app/ at the repo root):
   - no service worker, and no Install Game, Update Game or Offline Ready: the app carries its own files (offlineStart asks
     nativeOn first). How to Play leaves out its web install entry (.web-only).
   - landscape only, with the status bar (and Android's navigation bar) hidden, through the plugins when present; a match
     skips the web's fullscreen and orientation request (lockLandscape asks nativeOn first).
   - safe areas: the env(safe-area-inset-*) the CSS already uses, under viewport-fit=cover. SystemBars in
     capacitor.config.json keeps Android's right.
   - buzz() through Haptics, a light, medium or heavy tap: WKWebView has no navigator.vibrate.
   - the save (tryline.v1) copied into Preferences after every save, and put back at start when localStorage is empty:
     iOS can clear a web view's storage when the phone runs short of space, and Preferences lives in the app's own data.
   - Android's Back drives the game's own: Pause and Resume in play, else the open card's or screen's Back, and on the home
     menu the app goes to the background with the game as it was.
   Every plugin is optional: one missing, or one that fails, leaves the web behaviour in its place. In a browser nativeOn()
   is false and none of this runs, so the web build behaves as before. tools/native.mjs checks it under a stubbed Capacitor.
   ========================================================= */
const nativeApp = { started:false, ready:false, restored:false, queued:false, mirrored:null, wait:2000 };   // wait: ms the start gives Preferences before going on without it
/* True only inside the app: Capacitor's bridge says it is native. A browser has no window.Capacitor, and Capacitor's own
   web runtime answers false. Others ask it as typeof nativeOn === 'function' && nativeOn(). */
function nativeOn() {
  try { return !!(typeof window !== 'undefined' && window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()); }
  catch (e) { return false; }
}
/* A native plugin's methods, which the app's bridge puts on Capacitor.Plugins by name. null on the web, or when the app lacks it. */
function nativePlugin(name) {
  if (!nativeOn()) return null;
  const p = window.Capacitor.Plugins && window.Capacitor.Plugins[name];
  return p && typeof p === 'object' ? p : null;
}
/* A plugin call that never throws: its result, or null when the plugin or the method is missing or the call fails. */
function nativeCall(name, method, options) {
  const p = nativePlugin(name);
  if (!p || typeof p[method] !== 'function') return Promise.resolve(null);
  try { return Promise.resolve(p[method](options)).catch(() => null); } catch (e) { return Promise.resolve(null); }
}

/* ---------- start ---------- */
/* boot.js starts the game through this. In a browser go() runs at once, exactly as before. In the app the plugins are set
   up first, then the save is put back if the web view lost it, then the game starts, and its save is copied once.
   Preferences that never answers costs nativeApp.wait at most, and an answer that comes later is ignored, never
   written over a game already running. */
function nativeBoot(go) {
  if (!nativeOn()) { go(); return; }
  nativeStart();
  let done = false;
  const finish = saved => {
    if (done) return;
    done = true;
    if (typeof saved === 'string') { try { localStorage.setItem(STORE, saved); nativeApp.restored = true; nativeApp.mirrored = saved; } catch (e) { /* storage refused: a fresh game */ } }   // mirrored: the copy is that text already
    nativeApp.ready = true;
    go();
    nativeMirror();
  };
  setTimeout(() => finish(null), nativeApp.wait);
  nativeSaved().then(finish, () => finish(null));
}
function nativeStart() {
  if (nativeApp.started || !nativeOn()) return;
  nativeApp.started = true;
  nativeWebOnly();
  nativeCall('ScreenOrientation', 'lock', { orientation:'landscape' });
  nativeBars();
  // Coming back from the background, or a keyboard closing after a team name or a link, can bring the bars back.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) nativeBars(); });
  document.addEventListener('focusout', e => { if (e && e.target && e.target.tagName === 'INPUT') setTimeout(nativeBars, 300); });
  const app = nativePlugin('App');
  if (app && typeof app.addListener === 'function') { try { app.addListener('backButton', nativeBack); } catch (e) { /* Back keeps the platform's own */ } }
}
function nativeWebOnly() {                                 // How to Play's Install & Offline: Safari, Add to Home Screen and Update Game mean nothing in the app
  for (const el of document.querySelectorAll('.web-only')) el.hidden = true;
}
function nativeBars() {
  nativeCall('StatusBar', 'hide');
  nativeCall('SystemBars', 'hide');                        // Capacitor's own (8 and later): every bar, Android's navigation bar included; on iOS the home indicator fades
}

/* ---------- the save ---------- */
/* The copy in Preferences, when the web view has lost the save: its text if it reads as a save, else null. A save still in
   localStorage is never replaced. */
function nativeSaved() {
  let have = null;
  try { have = localStorage.getItem(STORE); } catch (e) { have = null; }
  if (have) return Promise.resolve(null);
  return nativeCall('Preferences', 'get', { key:STORE }).then(r => {
    const text = r && typeof r.value === 'string' ? r.value : '';
    if (!text) return null;
    try { const s = JSON.parse(text); return s && typeof s === 'object' && !Array.isArray(s) ? text : null; } catch (e) { return null; }
  });
}
/* save() calls this: once the save is written, its exact text goes to Preferences. Saves in one turn of the event loop make
   one copy, an unchanged save none, and nothing is copied before the start has had its chance to put a save back. */
function nativeMirror() {
  if (!nativeApp.ready || nativeApp.queued) return;
  const prefs = nativePlugin('Preferences');
  if (!prefs || typeof prefs.set !== 'function') return;
  nativeApp.queued = true;
  Promise.resolve().then(() => {
    nativeApp.queued = false;
    let text = null;
    try { text = localStorage.getItem(STORE); } catch (e) { text = null; }
    if (typeof text !== 'string' || !text || text === nativeApp.mirrored) return;
    try { Promise.resolve(prefs.set({ key:STORE, value:text })).then(() => { nativeApp.mirrored = text; }, () => {}); } catch (e) { /* tried again at the next save */ }
  });
}

/* ---------- haptics ---------- */
/* buzz() asks this first. True when the app's haptics took it: a light tap for the duel window and a step (15ms and less),
   a medium one for a catch or a tackle (to 30ms), a heavy one for a Big Hit, the posts or a try. False leaves buzz() to
   navigator.vibrate, as on the web. The phone's own haptics setting still applies. */
function nativeBuzz(ms) {
  const h = nativePlugin('Haptics');
  if (!h || typeof h.impact !== 'function') return false;
  try { Promise.resolve(h.impact({ style:ms <= 15 ? 'LIGHT' : ms <= 30 ? 'MEDIUM' : 'HEAVY' })).catch(() => {}); } catch (e) { /* no tap */ }
  return true;
}

/* ---------- Android's Back ---------- */
/* The App plugin's backButton (iOS has none). In play it is Escape: Pause, then Resume from the pause card. Otherwise it is the
   Back of the top card or screen (navBack: the grown-up check's Cancel, Back to Menu, a drill card's choice). On the home
   menu the app goes to the background, as the home button would, rather than closing. */
function nativeBack() {
  const gate = $('m-gate'), pz = $('m-pause');
  if (!(gate && !gate.hidden) && playing() && !(practice && (practice.done || practice.ready))) {
    if (!M.paused) { pause(); if (M.paused) return; }
    else if (pz && !pz.hidden) { resume(); return; }
  }
  if (navBack(0)) return;
  const home = $('s-home');
  if (home && !home.hidden && navLayer() === home) nativeCall('App', 'minimizeApp');
}
