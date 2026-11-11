/* =========================================================
   Input
   One slot a seat. Slot 0 is fed by touch, the keyboard and (in one player) every controller; in two player the keyboard is
   split in halves and a controller feeds the seat that claimed it. A button is a bitmask of the sources holding it (1 the
   keyboard, 2 touch, 4 << index a controller), so an idle pad can never let go of a key you are holding. The tools write
   aDown / aPressed directly, as they always have.
   ========================================================= */
const KEYDIR = { KeyW:[0,-1], ArrowUp:[0,-1], PadUp:[0,-1], KeyS:[0,1], ArrowDown:[0,1], PadDown:[0,1], KeyA:[-1,0], ArrowLeft:[-1,0], PadLeft:[-1,0], KeyD:[1,0], ArrowRight:[1,0], PadRight:[1,0] };
const zone = $('zone'), stick = $('stick'), knob = $('knob');
const STICK_R = 52;
function makeInput(seat) {
  const inp = {
    seat, jx:0, jy:0, aDown:false, bDown:false, cDown:false, aPressed:false, bPressed:false, cPressed:false, aCancel:false, bCancel:false, cCancel:false,
    keys:new Set(), held:new Set(), flick:0, pre:null,
    src:{ a:0, b:0, c:0 }, latch:false, padStick:false,   // which sources hold each button; a pad stick latched until it comes back to centre
    // a duel re-centres the stick under the thumb, so a held run doesn't read as a step; a held pad stick is latched the same way
    reanchor() {
      if (!this.pre) this.pre = { x:this.jx, y:this.jy };
      if (this.seat === 0) { if (this.stickId !== null) { this.ox = this.px; this.oy = this.py; placeStick(this.ox, this.oy); } knob.style.transform = ''; }
      if (this.padStick) this.latch = true;
      this.jx = this.jy = 0;
    },
    // and afterwards the thumb's spot reads as the pre-duel direction, so the run carries on
    restore() {
      const pre = this.pre || { x:0, y:0 };
      if (this.seat === 0 && this.stickId !== null) {
        this.ox = this.px - pre.x*STICK_R; this.oy = this.py - pre.y*STICK_R; placeStick(this.ox, this.oy);
        this.jx = pre.x; this.jy = pre.y; knob.style.transform = `translate(${pre.x*STICK_R}px,${pre.y*STICK_R}px)`;
      } else { this.jx = this.jy = 0; if (this.seat === 0) knob.style.transform = ''; }
      this.flick = 0; this.held.clear(); this.pre = null; this.latch = false; this.gest = null;   // and a gesture begun before the close-up can't finish after it
    },
    // keys win over the stick: any key for a direction counts once, so two keys for the same direction still read 1
    world() {
      let x = this.jx, y = this.jy;
      let px = 0, nx = 0, py = 0, ny = 0;
      for (const code of this.keys) { const d = KEYDIR[code]; if (!d) continue; if (d[0] > 0) px = 1; else if (d[0] < 0) nx = 1; if (d[1] > 0) py = 1; else if (d[1] < 0) ny = 1; }
      const kx = px - nx, ky = py - ny;
      if (kx || ky) { const m = hyp(kx, ky); x = kx/m; y = ky/m; }
      const t = stickTurn(this.seat); if (t) { const sx = x; x = -y*t; y = sx*t; }   // a behind view: up is toward the opposition's line, across is across the screen
      const mag = hyp(x, y);
      return { x, y, mag };
    },
    keyX() {                                               // the keys' sideways intent, ignoring any held into a close-up
      let px = 0, nx = 0;
      for (const code of this.keys) { const d = KEYDIR[code]; if (!d || this.held.has(code)) continue; if (d[0] > 0) px = 1; else if (d[0] < 0) nx = 1; }
      return px - nx;
    },
    sideX() {                                              // a duel chooser's sideways intent, -1 0 1: fresh keys, else the stick when it isn't latched. A key or stick held into the cut-in is never a choice
      const kx = this.keyX();
      return kx || (!this.latch && Math.abs(this.jx) >= 0.5 ? Math.sign(this.jx) : 0);
    },
  };
  if (seat === 0) Object.assign(inp, { stickId:null, ox:0, oy:0, px:0, py:0, stickType:'', stickAt:0, stickTid:null, stickNo:null, retook:false });   // the touch stick feeds seat 0 only; who holds it (src/input-touch.js, a finger the page lost)
  return inp;
}
const inputs = [makeInput(0), makeInput(1)];
const input = inputs[0];
function btn(inp, k, bit, down) {                          // one source's edge on one button: Pressed only on a rise from nothing held, Down while any source holds it
  const was = inp.src[k], now = down ? (was | bit) : (was & ~bit);
  if (now === was) return;
  inp.src[k] = now;
  if (!was) inp[k + 'Pressed'] = true;
  inp[k + 'Down'] = now !== 0;
}
let lastDev = 'touch';
function setDev(d) {                                       // the last device that acted: the on-screen hints follow it
  if (d === lastDev) return;
  lastDev = d;
  const b = document.body;
  if (b) { b.classList.toggle('dev-kb', d === 'kb'); b.classList.toggle('dev-pad', d === 'pad'); }
  if (typeof pickHint === 'function') pickHint();          // the team screen's hint for the lift: a controller's only (src/ui-menus.js)
}
function platesFloor() {                                   // the Step Left | Step Right plates never go under the hints card (a thumb a little high on a phone put them under Flick on Gold): its bottom while it is up, else the clock line
  const hc = $('hc0'), r = hc && !hc.hidden && typeof hc.getBoundingClientRect === 'function' ? hc.getBoundingClientRect() : null;
  return Math.max(0.07*window.innerHeight + 6, r ? r.bottom + 6 : 0);
}
function safeInsets() {                                   // --sal and the rest are the safe-area env()s. No layout (the tools) reads as 0, which is today's placement
  let read = null;
  try { const cs = getComputedStyle(document.documentElement); if (cs && cs.getPropertyValue) read = k => cs.getPropertyValue(k); } catch (e) { /* no layout */ }
  const n = k => { if (!read) return 0; const x = parseFloat(read(k)); return Number.isFinite(x) ? x : 0; };
  return { t:n('--sat'), r:n('--sar'), b:n('--sab'), l:n('--sal') };
}
function stickRest(W, H, ins) {                            // the ring is 124px. Insets 0 stays at (96, H-118). A notch on the left moves it in until the ring is 8px clear, still left of the buttons
  ins = ins || { t:0, r:0, b:0, l:0 };
  const R = 62, edge = 8;
  const x = clamp(Math.max(96, ins.l + R + edge), R + edge, Math.max(R + edge, 0.52*W - R - edge));
  const y = clamp(H - Math.max(118, ins.b + R + edge), 64 + R + edge, Math.max(64 + R + edge, H - R - edge));
  return { x, y };
}
function tagBox(ins) {                                     // where an on-pitch tag may sit. Insets 0 is the old box (top 76, left 60, 200px clear of the right edge)
  ins = ins || safeInsets();
  return { top:Math.max(76, ins.t + 68), left:Math.max(60, ins.l + 8), right:Math.max(20, ins.r) + 180 };
}
function placeStick(x, y) {
  stick.style.left = x + 'px'; stick.style.top = y + 'px';
  const pl = $('plates');
  if (pl) { const top = y - 102, ins = safeInsets(); pl.style.left = clamp(x - 82, Math.max(8, ins.l), window.innerWidth/2 - 172) + 'px'; pl.style.top = (top < platesFloor() ? y + 72 : top) + 'px'; }
}
function restStick() { const p = stickRest(window.innerWidth, window.innerHeight, safeInsets()); placeStick(p.x, p.y); }
/* ---------- a finger the page lost (2026-11-11)
   The stick and each action belong to one finger until its own lift or cancel. A lift the page never heard used to leave that finger
   holding on for good: the run carried on with no thumb on the glass, every new thumb on the zone was ignored, a Sprint stayed held,
   until a blur, the phone upright or Quit (the owner: "the joystick got jammed/stuck on a recent test game for some reason and we had to
   quit"). An iPhone can drop a touch's end in an interruption (a call, the Home swipe, Control Centre), and a lost capture sends the lift
   wherever the thumb is. So a held finger now also lets go:
   - on its own lift or cancel anywhere on the page: the window hears it first (below);
   - when the zone loses its capture and can't take it back (lostpointercapture);
   - when the page is hidden, as a blur already did (src/ui-menus.js);
   - at any new press, anywhere, when the stick or the button no longer holds its finger's capture (the browser saw it end), or the new
     press has the old finger's own id: the new finger, if it pressed that stick or button, takes over at once;
   - at every touchstart, touchend and touchcancel, when the touch's own list of the fingers on the glass doesn't have it (below), and
     when that list is empty nothing touch holds stays held.
   A finger still on the glass is none of these, so a second finger never takes a stick or a button from a live one: a palm on the zone
   is ignored, as before. A stale press is let go as cancelled, never fired as a kick. */
let touchGen = 0;                                          // touchstarts heard so far: a hold made since the last one belongs to the next (a touch's pointerdown comes before its touchstart, in the same task)
const touchy = type => type !== 'mouse' && type !== 'pen'; // a hold the glass's count speaks for (a test's events carry no type)
const TOUCH_NEAR = 24;                                     // a pointerdown and its own touch share one spot (0px apart in Chromium); two fingertips never land this close
function fingerGone(el, id, e) {                           // at a new press, is el's finger (the zone's, or a button's) plainly off the glass?
  if (e.pointerId === id) return true;                     // one pointer can't go down twice: the old one ended unheard
  try { return typeof el.hasPointerCapture === 'function' && !el.hasPointerCapture(id); } catch (err) { return false; }   // the browser saw it end and let the capture go
}
const tidOf = e => (e && e.tid != null ? e.tid : null);   // the touch identifier a hold carries over from a finger turned away (a real event has none: its touchstart names it)
const fingerOf = e => ({ pointerId:e.pointerId, pointerType:e.pointerType, clientX:e.clientX, clientY:e.clientY, gen:touchGen, tid:tidOf(e) });   // a press turned away, kept in case its own touchstart shows the holder gone
const freed = { by:null, keys:new Set() };                // the buttons the latest press let go of, stale, before it reached its own target
function grabStick(e) {                                    // a finger takes the stick: the ring under it, the pointer captured by the zone
  input.stickId = e.pointerId; input.stickType = e.pointerType || ''; input.stickAt = touchGen; input.stickTid = tidOf(e); input.stickNo = null; input.retook = false;
  input.ox = input.px = e.clientX; input.oy = input.py = e.clientY; input.latPeak = null;
  try { zone.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  placeStick(e.clientX, e.clientY); stick.classList.add('on');
}
zone.addEventListener('pointerdown', e => {
  if (demoOn()) return;                                    // Watch How: the pilot has the stick
  if (M && M.cut && ((M.cut.duel && M.cut.after) || (M.cut.kind === 'goal' && (M.cut.after || M.cut.g.watch)))) input.aPressed = true;   // tap to skip the verdict, or a CPU kick
  setDev('touch');
  if (input.stickId !== null && fingerGone(zone, input.stickId, e)) endStick({ pointerId:input.stickId });   // the old thumb is off the glass: this one takes over
  if (input.stickId !== null) { input.stickNo = fingerOf(e); return; }   // a second finger on the zone, the first still down: ignored
  e.preventDefault();
  grabStick(e);
  ac();
});
function notePeak(samples) {                               // the largest sideways deflection in this move, from the origin as it was. The run still follows the last sample
  if (!samples || !samples.length) return;
  let best = input.latPeak || 0;
  for (const p of samples) {
    const dx = p.clientX - input.ox, dy = p.clientY - input.oy, m = hyp(dx, dy);
    if (m < 1e-6) continue;
    const t = stickTurn(0), uy = (t ? dx*t : dy)/m*Math.min(1, m/STICK_R);
    if (Math.abs(uy) > Math.abs(best)) best = uy;
  }
  if (Math.abs(best) >= 0.12) input.latPeak = best;
}
function onStickMove(e) {
  if (e.pointerId !== input.stickId) return;
  if (e.getCoalescedEvents) notePeak(e.getCoalescedEvents());
  input.px = e.clientX; input.py = e.clientY;
  let dx = e.clientX - input.ox, dy = e.clientY - input.oy;
  const m = hyp(dx, dy);
  if (m > STICK_R) {
    const ex = m - STICK_R;
    input.ox += dx/m*ex; input.oy += dy/m*ex; placeStick(input.ox, input.oy);
    dx = dx/m*STICK_R; dy = dy/m*STICK_R;
  }
  input.jx = dx/STICK_R; input.jy = dy/STICK_R; input.padStick = false;
  if (hyp(input.jx, input.jy) < 0.12) { input.jx = 0; input.jy = 0; }
  knob.style.transform = `translate(${dx}px,${dy}px)`;
}
zone.addEventListener('pointermove', onStickMove);
zone.addEventListener('pointerrawupdate', onStickMove);   // Chromium delivers this a frame ahead of pointermove. Where it doesn't exist, nothing calls it
const endStick = e => {
  if (!e || e.pointerId !== input.stickId) return;
  input.stickId = null; input.stickTid = null; input.jx = input.jy = 0; input.gest = null; input.latPeak = null; input.retook = false;   // a lifted thumb clears the gesture history
  knob.style.transform = ''; stick.classList.remove('on'); restStick();
};
zone.addEventListener('pointerup', endStick);
zone.addEventListener('pointercancel', endStick);
zone.addEventListener('lostpointercapture', e => {         // the capture gone with the thumb still down (Chromium never does it to the zone; another browser may): take it back once, else let go, since its lift could land anywhere
  if (e.pointerId !== input.stickId) return;
  let kept = false;
  if (!input.retook) { input.retook = true; try { zone.setPointerCapture(e.pointerId); kept = zone.hasPointerCapture(e.pointerId); } catch (err) { /* the pointer is gone */ } }
  if (!kept) endStick(e);
});
const ACTS = [['btnA', 'a'], ['btnB', 'b'], ['btnC', 'c']];
const HIT_SLOP = 12;                                       // a miss in the 17px gap between B and Sprint lands within this of one circle
function nearestAct(x, y) {                                // the button whose circle, grown by HIT_SLOP, contains the point and whose centre is nearest. Hidden or unlaid-out buttons are not there
  let best = null, bd = Infinity;
  for (const [id, key] of ACTS) {
    const el = $(id);
    if (!el || el.hidden) continue;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0)) continue;
    const cx = r.left + r.width/2, cy = r.top + r.height/2, d = hyp(x - cx, y - cy);
    if (d <= r.width/2 + HIT_SLOP && d < bd) { bd = d; best = { el, key, d }; }
  }
  return best;
}
function beginAct(el, key, e) {
  if (demoOn()) return;
  if (el._held && e && e.pointerId != null && fingerGone(el, el._pointerId, e)) endAct(el, key, false, { pointerId:el._pointerId });   // its old finger is off the glass: let go (the frame sees this press, never a release) and this one takes it
  if (el._held) { if (e && e.pointerId != null) el._no = fingerOf(e); return; } // one finger owns an action until its own release or cancellation
  if (e && e.preventDefault) e.preventDefault();
  try { if (e && e.pointerId != null) el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  el._held = true; el._pointerId = e && e.pointerId != null ? e.pointerId : null; el._type = (e && e.pointerType) || ''; el._at = touchGen; el._no = null; el.classList.add('press');
  el._tid = tidOf(e); el._x = e ? +e.clientX || 0 : 0; el._y = e ? +e.clientY || 0 : 0;   // where it went down: its touch is named by that (the glass's own list, below)
  setDev('touch'); btn(input, key, 2, true);
  if (e && freed.by === e.pointerId && freed.keys.delete(key)) input[key + 'Cancel'] = false;   // this press let go of the button's stale hold on its way here: a fresh press, never a cancel
  ac();
}
function endAct(el, key, cancel, e) {
  if (!el._held || (el._pointerId != null && (!e || e.pointerId !== el._pointerId))) return;
  el._held = false; el._pointerId = null; el._tid = null; el.classList.remove('press'); btn(input, key, 2, false);
  if (cancel && !input[key + 'Down']) input[key + 'Cancel'] = true; // cancel this action only when no other source still holds it
}
function bindAct(el, key) {
  el.addEventListener('pointerdown', e => beginAct(el, key, e));
  el.addEventListener('pointerup', e => endAct(el, key, false, e));
  el.addEventListener('pointercancel', e => endAct(el, key, true, e));
  el.addEventListener('contextmenu', e => e.preventDefault());
}
for (const [id, key] of ACTS) bindAct($(id), key);
cv.addEventListener('pointerdown', e => {                 // a tap in the gap falls through to the pitch. If it is within HIT_SLOP of a button, that button takes it
  if (!playing() || $('controls').hidden || demoOn()) return;
  const hit = nearestAct(e.clientX, e.clientY);
  if (hit) beginAct(hit.el, hit.key, e);
});
const endActs = (cancel, e) => { for (const [id, key] of ACTS) endAct($(id), key, cancel, e); };
cv.addEventListener('pointerup', e => endActs(false, e));    // capture sends the release to the button; if it could not, the pitch still lets go
cv.addEventListener('pointercancel', e => endActs(true, e));
for (const type of ['pointerup', 'pointercancel']) window.addEventListener(type, e => {   // a lift or cancel anywhere on the page: the window hears it before the zone or a button could miss it (their capture gone)
  endStick(e); endActs(type === 'pointercancel', e);
  if (input.stickNo && input.stickNo.pointerId === e.pointerId) input.stickNo = null;   // a finger turned away and lifted is no longer waiting
  for (const [id] of ACTS) { const el = $(id); if (el._no && el._no.pointerId === e.pointerId) el._no = null; }
}, true);
window.addEventListener('pointerdown', e => {              // any new press, before its own target hears it: a hold whose capture the browser has let go of saw its finger end, so it lets go, a button as cancelled (a stale Kick is never a kick). A press on that same stick or button then takes it fresh
  freed.by = e.pointerId; freed.keys.clear();
  if (input.stickId !== null && fingerGone(zone, input.stickId, e)) endStick({ pointerId:input.stickId });
  for (const [id, key] of ACTS) {
    const el = $(id);
    if (!el._held || el._pointerId == null || !fingerGone(el, el._pointerId, e)) continue;
    const was = input[key + 'Cancel'];
    endAct(el, key, true, { pointerId:el._pointerId });
    if (!was && input[key + 'Cancel']) freed.keys.add(key);
  }
}, true);
/* The glass's own list. Each touch event lists the fingers on the glass (e.touches), whatever the page heard before, so every touchstart,
   touchend and touchcancel checks each touch hold against it: a hold whose finger isn't listed lets go, a button as cancelled (a stale
   Kick is never a kick), and with no finger listed nothing touch holds stays held. A finger that this touchstart's own press turned away
   from that stick or button takes its place. A pointer's id is not its touch's identifier (in WebKit or in Chromium), so a hold is named
   by where it went down: a touch's pointerdown and its touchstart share one spot (0px apart in Chromium), two fingertips never land within
   TOUCH_NEAR of each other, and the touchstart that comes with a press (after its pointerdown, in the same task) names it. A browser that
   sent the touchstart first has the hold named at the next touch event, by where its finger is then. A hold still unnamed (no touch heard
   at its spot) lets go only when the list is empty, or at a touchstart whose fingers are all new. A mouse's or a pen's hold is not the
   glass's to judge, nor are the keys or a pad. */
function nameHolds(all) {                                  // each unnamed touch hold, and each finger turned away, takes the identifier of the touch at its spot
  const named = new Set(), want = [];
  const note = (type, tid, x, y, put) => { if (!touchy(type)) return; if (tid != null) named.add(tid); else want.push({ x, y, put, done:false }); };
  if (input.stickId !== null) note(input.stickType, input.stickTid, input.px, input.py, t => { input.stickTid = t; });
  const sn = input.stickNo; if (sn) note(sn.pointerType, sn.tid, sn.clientX, sn.clientY, t => { sn.tid = t; });
  for (const [id] of ACTS) {
    const el = $(id), n = el._no;
    if (el._held) note(el._type, el._tid, el._x, el._y, t => { el._tid = t; });
    if (n) note(n.pointerType, n.tid, n.clientX, n.clientY, t => { n.tid = t; });
  }
  if (!want.length) return;
  const pairs = [];
  for (const w of want) for (const t of all) { const d = hyp(t.clientX - w.x, t.clientY - w.y); if (!named.has(t.identifier) && d <= TOUCH_NEAR) pairs.push({ w, t, d }); }
  pairs.sort((a, b) => a.d - b.d);                         // the nearest first: two fingers landing in one touchstart each get their own
  for (const { w, t } of pairs) if (!w.done && !named.has(t.identifier)) { w.done = true; named.add(t.identifier); w.put(t.identifier); }
}
function onGlass(e, start) {
  const all = Array.from(e.touches || []), fresh = start ? Array.from(e.changedTouches || []) : [];
  nameHolds(all);
  const on = new Set(all.map(t => t.identifier));
  const allNew = start && fresh.length > 0 && all.length <= fresh.length;   // no finger from before on the glass
  const off = (tid, at) => (tid != null ? !on.has(tid) : !all.length || (allNew && at !== touchGen));   // named: not listed. Unnamed: the glass empty, or all new and the hold older than this touch
  const mine = no => (start && no && touchy(no.pointerType) && no.gen === touchGen && (no.tid == null || on.has(no.tid)) ? no : null);   // a finger this touch's own press turned away, on the glass
  if (input.stickId !== null && touchy(input.stickType) && off(input.stickTid, input.stickAt)) {
    const no = mine(input.stickNo);
    endStick({ pointerId:input.stickId });
    if (no) grabStick(no);
  }
  for (const [id, key] of ACTS) {
    const el = $(id);
    if (!el._held || !touchy(el._type) || !off(el._tid, el._at)) continue;
    const no = mine(el._no);
    endAct(el, key, !no, { pointerId:el._pointerId });
    if (no) beginAct(el, key, no);
  }
  const lifted = no => !!no && (!all.length || (no.tid != null && !on.has(no.tid)));   // a finger turned away and off the glass is no longer waiting
  if (lifted(input.stickNo)) input.stickNo = null;
  for (const [id] of ACTS) { const el = $(id); if (lifted(el._no)) el._no = null; }
  if (start) touchGen++;
}
for (const type of ['touchstart', 'touchend', 'touchcancel']) window.addEventListener(type, e => onGlass(e, type === 'touchstart'), { capture:true, passive:true });
function releaseTouch() {                                  // the phone turned, the page hidden, or the stick has to come up: the ring goes home and no button stays pressed
  input.stickId = null; input.stickTid = null; input.jx = input.jy = 0; input.gest = null; input.latPeak = null; input.stickNo = null; input.retook = false;
  knob.style.transform = ''; stick.classList.remove('on'); restStick();
  for (const [id, key] of ACTS) { const el = $(id); el._held = false; el._pointerId = null; el._tid = null; el._no = null; el.classList.remove('press'); }
  for (const inp of inputs) {
    inp.jx = inp.jy = 0; inp.latPeak = null; inp.gest = null;
    inp.src.a = inp.src.b = inp.src.c = 0;
    inp.aDown = inp.bDown = inp.cDown = false;
    inp.aPressed = inp.bPressed = inp.cPressed = false;
    inp.aCancel = inp.bCancel = inp.cCancel = false;
  }
}

/* ---------- a card's button under a second finger (2026-11-11)
   A browser makes a click from a tap only when no other finger is on the glass, and every card and the Pause button act on a click. So
   with a thumb on the stick, or on Sprint, a tap on the tutorial card's Next, Skip or Play, on Pause or Resume, on the penalty card, on
   Second Half or Continue did nothing until every other finger lifted. The tutorial card holds the match still, and on a new phone the
   first scrum, lineout, maul, duel and kick each bring one up mid-run, so the stick and the game looked jammed. Now a finger lifted on a
   button in play clicks it whatever else is down: inside the button (a tap's slop) and near where it went down (a scroll is no tap).
   preventDefault on the touch's end stops the browser's own click, so a tap acts once. Chromium makes a touch's end uncancelable once
   another finger in the same touches has moved (the thumb steering): then the lift clicks only if another finger was down during it,
   when the browser makes no click of its own. A browser's click that comes anyway, before the next touch and at the tap, is eaten. The
   tutorial card's tap anywhere is the card's own click. A mouse, the keys and a controller click as before; a menu outside play is
   untouched. */
const TAP = { layers:'#m-tut, #m-pen, #m-break, #m-pause, #m-practice, #b-pause, .hc, #demo-skip', slop:12, move:16, near:48, gap:500, from:new Map(), eat:false, x:0, y:0, at:0 };
function tapTarget(start) {                                // what a touch begun on start clicks when it lifts: a shown, enabled button in play, or the tutorial card itself
  const layer = start && typeof start.closest === 'function' ? start.closest(TAP.layers) : null;
  if (!layer || layer.closest('[hidden]')) return null;
  const b = start.closest('button');
  if (b && layer.contains(b)) return b.disabled || b.closest('[hidden]') ? null : b;
  return layer.id === 'm-tut' ? layer : null;
}
function tapLift(e) {                                      // a touch's end: the touch that began on a target and lifted on it clicks it
  const el = tapTarget(e.target), r = el ? el.getBoundingClientRect() : null;
  let hit = null, many = false;
  for (const t of e.changedTouches || []) {
    const s = TAP.from.get(t.identifier); TAP.from.delete(t.identifier);
    if (!r || !s || hit) continue;
    const inside = t.clientX >= r.left - TAP.slop && t.clientX <= r.right + TAP.slop && t.clientY >= r.top - TAP.slop && t.clientY <= r.bottom + TAP.slop;
    if (inside && hyp(t.clientX - s.x, t.clientY - s.y) <= TAP.move) { hit = t; many = s.many; }
  }
  if (!hit || e.defaultPrevented) return;
  if (e.cancelable === false) { if (!many) return; }       // the browser's own click can't be stopped: only a tap it won't click, one made beside another finger
  else if (e.preventDefault) e.preventDefault();
  el.click();
  TAP.eat = true; TAP.x = hit.clientX; TAP.y = hit.clientY; TAP.at = performance.now();
}
document.addEventListener('touchstart', e => {             // where each touch began, and whether another finger was down beside it (then the browser makes no click of it)
  TAP.eat = false;
  const fresh = e.changedTouches || [], many = (e.touches ? e.touches.length : fresh.length) > 1;
  if (fresh.length) for (const s of TAP.from.values()) s.many = true;
  for (const t of fresh) TAP.from.set(t.identifier, { x:t.clientX, y:t.clientY, many });
}, { capture:true, passive:true });
document.addEventListener('touchcancel', e => { for (const t of e.changedTouches || []) TAP.from.delete(t.identifier); }, { capture:true, passive:true });
document.addEventListener('touchend', tapLift, { passive:false });
document.addEventListener('click', e => {                  // the browser's own click from a tap already clicked: eaten once, if it comes before the next touch, at the tap, within the gap
  if (!TAP.eat || !e.isTrusted || !(e.detail > 0)) return;
  TAP.eat = false;
  if (performance.now() - TAP.at > TAP.gap || hyp((+e.clientX || 0) - TAP.x, (+e.clientY || 0) - TAP.y) > TAP.near) return;
  if (e.preventDefault) e.preventDefault();
  e.stopImmediatePropagation();
}, true);
