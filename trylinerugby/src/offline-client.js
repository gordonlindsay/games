/* Optional browser installation and cached play. A new version applies by itself, on the home menu only: once the home has
   been quiet for OFFLINE.idle (no pointer, key or controller input, and nothing still held down) with nothing open over it,
   and this is the game's only window, the waiting worker takes over and the page reloads on the new version ('Updating'
   shows meanwhile). A match, a drill or any other screen never reloads: the version waits for the next home. Saves are
   written before the home shows. */
const OFFLINE = { idle:1500, tick:250, again:5000, check:3600e3, answer:4000 };   // ms: the quiet a home needs; how often it looks while a version waits; the wait after another window held it back; between checks for a new version; for the worker's answer
const offlineApp = { started:false, live:false, home:false, ready:false, readinessRequest:0, prompt:null, prompting:false, waiting:null, asking:null, requested:false, changed:false, reloaded:false,
  controller:null, registration:null, homeAt:0, inputAt:0, retryAt:0, checkedAt:0, timer:0, held:new Map(), touches:0 };
const offlineNow = () => Date.now();
function offlineRender() {
  const bar = $('app-tools'), install = $('b-install'), updating = $('offline-update'), status = $('offline-status');
  if (!bar || !install || !updating || !status) return;
  install.hidden = !offlineApp.prompt;
  updating.hidden = !offlineApp.requested;
  status.hidden = !offlineApp.ready;
  bar.hidden = !offlineApp.home || (install.hidden && updating.hidden && status.hidden);
}
/* The page is now under a newer worker than the one that served it: it reloads into it from a quiet home, never anywhere else,
   whoever made the switch (this page, another window, or an older page's Update Game). Updating shows as it goes. */
function offlineReload() {
  if (!offlineApp.home || !offlineApp.changed || offlineApp.reloaded) return;
  if (!offlineQuiet()) { offlineSoon(); return; }
  offlineApp.requested = offlineApp.reloaded = true;
  offlineRender();
  window.location.reload();
}
/* Anything input does: input-devices.js calls this for a controller (polled, so no event reaches the window), on every poll while
   a button is held or the stick is off centre. The clock is read only where a worker can update the game: the app and the tools'
   seeded runs (career-season.mjs moves its clock on every read) never read it. */
function offlineInput() { if (offlineApp.live) offlineApp.inputAt = offlineNow(); }
/* What is held down now: pointers by id, keys by code, and fingers by the browser's own count. A press still down is input however
   still it is held, so the quiet starts at its release. Each entry also clears itself where an up event could go missing: a mouse
   moving with no button down, a primary touch (no other finger is down), a touch event's count of 0, the Command key let go (macOS
   sends no keyup for keys pressed with it), and the game losing the focus or going to the back (blur, visibilitychange). */
function offlineEvent(type, e) {
  offlineInput();
  if (!offlineApp.live) return;
  const held = offlineApp.held, drop = kind => { for (const [k, v] of held) if (v === kind) held.delete(k); };
  const id = e && e.pointerId, kind = (e && e.pointerType) || 'mouse', key = e && (e.code || e.key);
  if (type === 'pointerdown') { if (kind === 'touch' && e.isPrimary) drop('touch'); held.set('p' + id, kind); }
  else if (type === 'pointerup' || type === 'pointercancel') held.delete('p' + id);
  else if (type === 'pointermove') { if (e && e.buttons === 0) held.delete('p' + id); }
  else if (type === 'touchstart' || type === 'touchend' || type === 'touchcancel') { offlineApp.touches = (e && e.touches && e.touches.length) || 0; if (!offlineApp.touches) drop('touch'); }
  else if (type === 'keydown') { if (key) held.set('k' + key, 'key'); }
  else if (type === 'keyup') { if (/^(Meta|OS)/.test(key || '')) drop('key'); else held.delete('k' + key); }
  else if (type === 'blur' || type === 'hidden') { held.clear(); offlineApp.touches = 0; }
}
const offlineHeld = () => offlineApp.held.size > 0 || offlineApp.touches > 0;
/* Nothing open over the home: no card (the grown-up check, the store and Grown-Ups, the Supporters' Wall, Add Your Team and its
   confirm, any .modal), not the For Grown-Ups panel, not the browser's install prompt, and no text field taking typing. */
function offlineClear() {
  if (offlineApp.prompting) return false;
  if (typeof document === 'undefined') return true;
  const shown = el => !!el && !el.hidden && !(el.closest && el.closest('[hidden]'));
  for (const m of document.querySelectorAll('.modal')) if (shown(m)) return false;
  if (shown($('pr-grownups'))) return false;
  const a = document.activeElement;
  return !(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName || ''));
}
function offlineControlled() { return typeof navigator !== 'undefined' && !!navigator.serviceWorker && !!navigator.serviceWorker.controller; }
/* Work for the home: a version waiting (on a page a worker controls: one loaded from the network has nothing old to replace),
   or a switch already made that this page has to reload into. */
function offlinePending() {
  if (offlineApp.reloaded || offlineApp.asking) return false;
  return offlineApp.changed || (!offlineApp.requested && !!offlineApp.waiting && offlineControlled());
}
function offlineSoon() {
  if (offlineApp.timer || !offlineApp.home || !offlinePending()) return;
  offlineApp.timer = setTimeout(offlineTick, OFFLINE.tick);
}
function offlineStop() { if (offlineApp.timer) { clearTimeout(offlineApp.timer); offlineApp.timer = 0; } }
/* The home's quiet: nothing held down, OFFLINE.idle since its last input and since it showed, nothing over it, and not in a match
   or a drill. A press still held moves the last input on, so the wait counts from its release even if the release is never heard. */
function offlineQuiet() {
  const now = offlineNow();
  if (!offlineApp.home) return false;
  if (offlineHeld()) { offlineApp.inputAt = now; return false; }
  if (now - Math.max(offlineApp.inputAt, offlineApp.homeAt) < OFFLINE.idle) return false;
  if (typeof playing === 'function' && playing()) return false;
  if (typeof practice !== 'undefined' && practice) return false;
  return offlineClear();
}
function offlineTick() {
  offlineApp.timer = 0;
  if (!offlineApp.home || !offlinePending()) return;
  if (offlineApp.changed) { offlineReload(); return; }
  if (!offlineQuiet() || offlineNow() < offlineApp.retryAt) { offlineSoon(); return; }
  offlineApply();
}
/* One question to a worker, answered on a channel of its own: then(data), or then(null) if no answer comes in OFFLINE.answer.
   An answer that comes after the switch (or after this page stopped asking) is not heard. */
function offlineAsk(worker, message, then) {
  const channel = new MessageChannel();
  let timer = 0, over = false;
  const done = data => { if (over) return; over = true; clearTimeout(timer); channel.port1.close(); if (offlineApp.asking === worker) then(data); };
  timer = setTimeout(() => done(null), OFFLINE.answer);
  channel.port1.onmessage = event => done(event.data);
  try { worker.postMessage(message, [channel.port2]); } catch (e) { done(null); }
}
/* The waiting worker takes over only if this is the game's only window (sw.js counts them): a tab in a match must never have its
   files switched under it, as a worker serves only its own generation. Two steps, so that what switches is a home quiet a moment
   ago, not one the player left while the worker woke up (an idle one is stopped: asked in one step, the switch landed up to 400 ms
   after the ask in Chromium). GAME_WINDOWS wakes the worker and counts the windows, switching nothing; then this page looks at its
   home again and, still quiet, sends SKIP_WAITING alone to the worker now awake, which counts again (a window may have opened) and
   takes over. What is left is one round trip to a running worker (3 to 6 ms in Chromium). A tap inside it that leaves the home
   lands under the new generation; that page reloads into it from its next quiet home, like a switch another window made. With
   others open it waits and asks again later. */
function offlineApply() {
  const worker = offlineApp.waiting;
  if (!worker || typeof MessageChannel === 'undefined') return;
  offlineApp.asking = worker;
  const stop = () => { offlineApp.asking = null; };
  const later = () => { stop(); offlineApp.retryAt = offlineNow() + OFFLINE.again; offlineSoon(); };
  offlineAsk(worker, { type:'GAME_WINDOWS' }, data => {
    if (!data || data.type !== 'GAME_WINDOWS' || typeof data.count !== 'number' || data.count > 1) { later(); return; }
    if (offlineApp.waiting !== worker || !offlineQuiet()) { stop(); offlineSoon(); return; }   // the player moved, or left the home, while it woke
    offlineAsk(worker, { type:'SKIP_WAITING', alone:true }, data => {
      if (!data || data.type !== 'SKIP_WAITING' || data.applied !== true) { later(); return; }
      stop();
      if (!offlineApp.home) return;                         // off the home already: it reloads from the next quiet home (offlineReload)
      offlineApp.requested = true; offlineRender(); offlineReload();
      // the switch normally follows at once (controllerchange); if it never does (a newer version replaced this one meanwhile), Updating goes and the home asks again
      setTimeout(() => { if (!offlineApp.changed && !offlineApp.reloaded && offlineApp.requested) { offlineApp.requested = false; offlineRender(); later(); } }, OFFLINE.answer);
    });
  });
}
function offlineScreen(id) {
  const home = id === 's-home';
  if (home && !offlineApp.home && offlineApp.live) offlineApp.homeAt = offlineNow();   // the home's quiet starts as it shows
  offlineApp.home = home;
  if (!home) { offlineStop(); if (!offlineApp.reloaded) offlineApp.requested = false; }   // a match, a drill, a picker or any other screen: the version waits for the home, and a fresh quiet there
  offlineRender();
  offlineReload();
  if (home) { offlineSoon(); offlineCheck(); }
}
/* A game left open (a home-screen app back from the background has not loaded again) still hears of a new version: at most
   once an hour, from the home. */
function offlineCheck() {
  const r = offlineApp.registration;
  if (!r || typeof r.update !== 'function') return;
  const now = offlineNow();
  if (now - offlineApp.checkedAt < OFFLINE.check) return;
  offlineApp.checkedAt = now;
  try { Promise.resolve(r.update()).catch(() => {}); } catch (e) { /* offline: the next check */ }
}
function offlineReady(worker) {
  if (!worker || typeof MessageChannel === 'undefined') return;
  const request = ++offlineApp.readinessRequest;
  const channel = new MessageChannel();
  const timer = setTimeout(() => { channel.port1.close(); }, OFFLINE.answer);
  channel.port1.onmessage = event => {
    clearTimeout(timer); channel.port1.close();
    if (request === offlineApp.readinessRequest && event.data && event.data.type === 'OFFLINE_READY' && typeof event.data.ready === 'boolean') {
      offlineApp.ready = event.data.ready; offlineRender();
    }
  };
  try { worker.postMessage({ type:'OFFLINE_STATUS' }, [channel.port2]); }
  catch (e) { clearTimeout(timer); channel.port1.close(); }
}
function offlineRegistration(registration) {
  offlineApp.registration = registration; offlineApp.checkedAt = offlineNow();   // registering has just checked
  const refresh = () => {
    offlineApp.waiting = registration.waiting || null;
    offlineRender();
    offlineReady(registration.active);
    offlineSoon();
  };
  const watch = worker => {
    if (!worker || typeof worker.addEventListener !== 'function') return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' || worker.state === 'activated') refresh();
    });
  };
  refresh(); watch(registration.installing); watch(registration.waiting);
  registration.addEventListener('updatefound', () => watch(registration.installing));
}
function offlineStart() {
  if (offlineApp.started) return;
  offlineApp.started = true;
  if (typeof nativeOn === 'function' && nativeOn()) return;   // the Try Line app carries its own files: no worker, and Install, Updating and Offline Ready stay hidden (native.js)
  const install = $('b-install');
  if (install) install.addEventListener('click', () => {
    const go = async () => {
      const prompt = offlineApp.prompt;
      if (!prompt) return;
      offlineApp.prompt = null; offlineApp.prompting = true; offlineRender();   // the browser's prompt is over the home: no update meanwhile
      try { await prompt.prompt(); await prompt.userChoice; } catch (e) { /* browser dismissed or unavailable */ }
      offlineApp.prompting = false; offlineInput(); offlineSoon();
    };
    if (typeof parentGate === 'function') parentGate(go); else go();   // a grown-up check first (kids.js): installing hands over to the browser
  });
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('beforeinstallprompt', event => {
      if (typeof event.preventDefault !== 'function' || typeof event.prompt !== 'function') return;
      event.preventDefault(); offlineApp.prompt = event; offlineRender();
    });
    window.addEventListener('appinstalled', () => { offlineApp.prompt = null; offlineRender(); });
  }
  if (!window.isSecureContext || typeof navigator === 'undefined' || !navigator.serviceWorker || typeof navigator.serviceWorker.register !== 'function') return;
  const workers = navigator.serviceWorker;
  offlineApp.live = true;
  if (offlineApp.home) offlineApp.homeAt = offlineNow();   // the home showed before this started (boot.js): its quiet starts now
  offlineApp.controller = workers.controller || null;      // the generation that served this page
  // Input on the home holds an update back: a tap, a key, a scroll or a press still held, in the last OFFLINE.idle (a controller:
  // offlineInput, from pollPads). Scroll is caught on its way down, as an element's scroll does not bubble.
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart', 'touchend', 'touchcancel', 'keydown', 'keyup', 'wheel', 'scroll']) window.addEventListener(type, e => offlineEvent(type, e), { capture:true, passive:true });
  window.addEventListener('focus', () => offlineInput());
  window.addEventListener('blur', () => offlineEvent('blur'));
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') document.addEventListener('visibilitychange', () => {
    if (document.hidden) { offlineEvent('hidden'); return; }   // whatever was held down is let go out of the game's sight
    offlineInput();                                        // back to the game: whoever came back may be about to tap
    if (offlineApp.home) { offlineCheck(); offlineSoon(); }
  });
  workers.addEventListener('controllerchange', () => {
    const now = workers.controller;
    if (now && now !== offlineApp.controller) {
      offlineApp.changed = true;
      if (offlineApp.asking === now) offlineApp.asking = null;   // the switch came before the worker's answer: that answer changes nothing now
      offlineRender(); offlineReload(); offlineSoon();
    }
    offlineReady(now);
  });
  try {
    Promise.resolve(workers.register('./sw.js')).then(offlineRegistration).catch(() => {});
  } catch (e) { /* online play remains available */ }
}
