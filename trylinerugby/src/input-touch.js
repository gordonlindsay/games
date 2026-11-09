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
  if (seat === 0) Object.assign(inp, { stickId:null, ox:0, oy:0, px:0, py:0 });   // the touch stick feeds seat 0 only
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
zone.addEventListener('pointerdown', e => {
  if (M && M.cut && ((M.cut.duel && M.cut.after) || (M.cut.kind === 'goal' && (M.cut.after || M.cut.g.watch)))) input.aPressed = true;   // tap to skip the verdict, or a CPU kick
  setDev('touch');
  if (input.stickId !== null) return;
  e.preventDefault();
  input.stickId = e.pointerId; input.ox = input.px = e.clientX; input.oy = input.py = e.clientY; input.latPeak = null;
  try { zone.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  placeStick(e.clientX, e.clientY); stick.classList.add('on');
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
  input.stickId = null; input.jx = input.jy = 0; input.gest = null; input.latPeak = null;   // a lifted thumb clears the gesture history
  knob.style.transform = ''; stick.classList.remove('on'); restStick();
};
zone.addEventListener('pointerup', endStick);
zone.addEventListener('pointercancel', endStick);
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
  if (el._held) return; // one finger owns an action until its own release or cancellation
  if (e && e.preventDefault) e.preventDefault();
  try { if (e && e.pointerId != null) el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  el._held = true; el._pointerId = e && e.pointerId != null ? e.pointerId : null; el.classList.add('press');
  setDev('touch'); btn(input, key, 2, true);
  ac();
}
function endAct(el, key, cancel, e) {
  if (!el._held || (el._pointerId != null && (!e || e.pointerId !== el._pointerId))) return;
  el._held = false; el._pointerId = null; el.classList.remove('press'); btn(input, key, 2, false);
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
  if (!playing() || $('controls').hidden) return;
  const hit = nearestAct(e.clientX, e.clientY);
  if (hit) beginAct(hit.el, hit.key, e);
});
const endActs = (cancel, e) => { for (const [id, key] of ACTS) endAct($(id), key, cancel, e); };
cv.addEventListener('pointerup', e => endActs(false, e));    // capture sends the release to the button; if it could not, the pitch still lets go
cv.addEventListener('pointercancel', e => endActs(true, e));
function releaseTouch() {                                  // the phone turned, or the stick has to come up: the ring goes home and no button stays pressed
  input.stickId = null; input.jx = input.jy = 0; input.gest = null; input.latPeak = null;
  knob.style.transform = ''; stick.classList.remove('on'); restStick();
  for (const [id, key] of ACTS) { const el = $(id); el._held = false; el._pointerId = null; el.classList.remove('press'); }
  for (const inp of inputs) {
    inp.jx = inp.jy = 0; inp.latPeak = null; inp.gest = null;
    inp.src.a = inp.src.b = inp.src.c = 0;
    inp.aDown = inp.bDown = inp.cDown = false;
    inp.aPressed = inp.bPressed = inp.cPressed = false;
    inp.aCancel = inp.bCancel = inp.cCancel = false;
  }
}

