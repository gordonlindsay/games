/* ---------- keyboard ----------
   By e.code, so the physical positions hold on any layout. One player (and the lone keyboard seat in two player) has the
   solo map; two seats on one keyboard take a half each: Player 1 on W A S D with F G H, Player 2 on the arrows with / . ,
   (or Numpad 1 2 3). Ctrl, Cmd and Alt are never bound. */
const KB = {
  solo:  { m:['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'], a:['KeyJ', 'Space'], b:['KeyK', 'ShiftLeft', 'ShiftRight'], c:['KeyL'] },
  left:  { m:['KeyW', 'KeyA', 'KeyS', 'KeyD'], a:['KeyF'], b:['KeyG'], c:['KeyH'] },
  right: { m:['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'], a:['Slash', 'Numpad1'], b:['Period', 'Numpad2'], c:['Comma', 'Numpad3'] },
};
// the seats: who sits where. Both start on the keyboard, so a keyboard-only pair has nothing to set up; a controller claims a seat with one press
const two = { on:false, lost:[], swapped:false, seats:[{ dev:'kb', half:'left', pad:null }, { dev:'kb', half:'right', pad:null }] };   // lost: the seat whose pad went, waiting to be claimed back; swapped: Swap Players has put Player 1 on the right half
function seatScheme(s) {
  if (!two.on) return s === 0 ? 'solo' : null;
  const seat = two.seats[s];
  if (seat.dev !== 'kb') return null;
  return two.seats[1 - s].dev === 'kb' ? seat.half : 'solo';   // the lone keyboard seat keeps the keys it already knows
}
const ROUTES = new Map();
function rebuildRoutes() {
  ROUTES.clear();
  for (const s of [0, 1]) { const sch = seatScheme(s); if (!sch) continue; for (const act of ['m', 'a', 'b', 'c']) for (const code of KB[sch][act]) ROUTES.set(code, [s, act]); }
  for (const code of ['KeyP', 'Escape']) ROUTES.set(code, [null, 'pause']);
}
const keyRoute = code => ROUTES.get(code) || null;         // [seat, act] with act one of m a b c pause, or null for an unbound key
function releaseAll() {                                    // a scheme change, or the window losing focus: nothing held can stick
  releaseTouch(); // a lost pointer release must not leave a button owned by an old finger
  for (const inp of inputs) { inp.keys.clear(); inp.held.clear(); inp.src.a = inp.src.b = inp.src.c = 0; inp.aDown = inp.bDown = inp.cDown = false; inp.gest = null; }
  rebuildRoutes();
}
rebuildRoutes();
function setTwo(on) { two.on = !!on; if (!on) two.lost = []; releaseAll(); }
function lightKey(code, on) {                              // the join screen's legend: a keycap lights while its key is held (so it is also the rollover test)
  if ($('s-join').hidden) return;
  for (const el of document.querySelectorAll('#s-join [data-code="' + code + '"]')) el.classList.toggle('on', on);
}
function lightPad(seat, which, on) { for (const el of document.querySelectorAll('#s-join .seat.s' + seat + ' [data-pad="' + which + '"]')) el.classList.toggle('on', on); }
function onKey(e, down) {
  const code = e.code, r = keyRoute(code);
  if (practice && (practice.done || practice.ready) && down && code === 'Escape') { if (e.preventDefault) e.preventDefault(); practiceChoose(); return; }
  if (e.target && e.target.tagName === 'INPUT') return;    // typing a team name
  if (two.on && r && r[0] != null) lightKey(code, down);
  if (!down) {
    for (const inp of inputs) { inp.keys.delete(code); inp.held.delete(code); }
    if (r && r[0] != null && r[1] !== 'm') btn(inputs[r[0]], r[1], 1, false);
    return;
  }
  if (r) setDev('kb');
  if (!playing()) { if (two.on && r && !e.repeat) navKey(r, e); return; }   // one player keeps the browser's own Tab, Enter and Space on the menus
  if (M.paused && !two.on) { if (!e.repeat && r && r[1] === 'pause') { if (e.preventDefault) e.preventDefault(); resume(); } return; }   // one player: the browser's own Space and Enter on the pause card, as before
  if (r || (two.on && code === 'Quote')) { if (e.preventDefault) e.preventDefault(); }   // Quote opens Firefox's Quick Find
  if (M.paused) { if (!e.repeat && r && r[1] === 'pause') resume(); else if (two.on && r && !e.repeat) navKey(r, e); return; }
  if (two.on && (M.phase === 'menu' || M.phase === 'break')) { if (r && !e.repeat) navKey(r, e); return; }   // the penalty card and the half-time and full-time cards: the keys drive the card, as a pad's buttons do, and never reach the slots
  if (!r) return;
  const [s, act] = r;
  if (act === 'pause') { if (!e.repeat) pause(); return; }
  const inp = inputs[s];
  if (act === 'm') {
    if (M.cut && M.cut.duel && !e.repeat && !inp.held.has(code)) { const d = KEYDIR[code]; if (d[0]) inp.flick = d[0]; }   // a step is a fresh sideways key during a duel
    inp.keys.add(code);
    return;
  }
  if (e.repeat) return;                                    // a repeat never presses
  btn(inp, act, 1, true);
}
function navKey(r, e) {                                    // two player only: the routed keys drive the menus and cards
  const [s, act] = r;
  if (act === 'm') { const d = KEYDIR[e.code]; navMove(s, d[0], d[1]); }
  else if (act === 'a') navPress(s);
  else if (act === 'b' || act === 'pause') navBack(s);
  if (e.preventDefault) e.preventDefault();
}
window.addEventListener('keydown', e => onKey(e, true));
window.addEventListener('keyup', e => onKey(e, false));

/* ---------- controllers ----------
   Nothing runs until the first gamepadconnected, so phones pay nothing. Pads are polled once a frame, before the step loop.
   Buttons are mapped by position (0 bottom, 1 right, 4-7 the shoulders and triggers, 9 Start, 12-15 the d-pad), never by
   letter. In one player every pad drives slot 0; in two player a pad drives the seat it claimed. */
const PADS = new Map();                                    // by gp.index: { b:[], stick, owner, used, std, act, navT, navDir }
let padsOn = false;
const BMAP = { big:0, small:1, start:9, dpad:{ 12:'PadUp', 13:'PadDown', 14:'PadLeft', 15:'PadRight' } };
const isShoulder = i => i >= 4 && i <= 7;
function padOf(gp) {
  let P = PADS.get(gp.index);
  if (!P) { P = { index:gp.index, b:[], stick:false, owner:null, used:false, std:gp.mapping === 'standard', act:null, navT:0, navDir:'' }; PADS.set(gp.index, P); }
  return P;
}
const padSeat = P => (two.on ? P.owner : 0);
const onMenu = () => !playing() || M.paused || M.phase === 'menu' || M.phase === 'break';
function padDown(b, i, was) {                              // triggers count as down at 0.35 and up below 0.25, so a resting trigger never flickers
  const v = b.value != null ? b.value : (b.pressed ? 1 : 0);
  return isShoulder(i) ? (was ? v >= 0.25 : v >= 0.35) : !!(b.pressed || v > 0.5);
}
function padRise(gp, P) {                                  // an unowned pad in two player: any press on 0-7 or 9 claims a seat, and nothing else reaches the game
  let rise = false;
  for (let i = 0; i < Math.min(gp.buttons.length, 10); i++) { const was = !!P.b[i], now = padDown(gp.buttons[i], i, was); P.b[i] = now; if (now && !was && i !== 8) rise = true; }
  return rise;
}
function pollPads() {
  if (!padsOn) return;
  let gps;
  try { gps = navigator.getGamepads ? navigator.getGamepads() : null; } catch (e) { return; }   // Chrome throws on an insecure origin
  if (!gps) return;
  for (const gp of gps) {
    if (!gp || gp.connected === false) continue;
    const P = padOf(gp), bit = 4 << gp.index, menu = onMenu();
    P.act = gp.vibrationActuator || null;
    if (two.on && P.owner == null) { if (padRise(gp, P)) twoClaim(P); continue; }
    const seat = padSeat(P), inp = inputs[seat], join = two.on && !$('s-join').hidden;
    const n = P.std ? Math.min(gp.buttons.length, 16) : Math.min(gp.buttons.length, 2);   // a pad with no standard mapping: axes 0/1 and buttons 0/1 only, best effort
    for (let i = 0; i < n; i++) {
      const was = !!P.b[i], now = padDown(gp.buttons[i], i, was);
      if (now === was) continue;
      P.b[i] = now;
      if (now) { setDev('pad'); if (playing()) P.used = true; }
      // on a menu or a card a rise navigates, and a release still reaches the slot: a button let go there can't stay held into play
      if (i === BMAP.big) { if (now && menu) navPress(seat); else btn(inp, 'a', bit, now); }
      else if (i === BMAP.small) { if (now && menu) { if (M && M.paused) resume(); else navBack(seat); } else btn(inp, 'b', bit, now); }
      else if (isShoulder(i)) { if (!menu || !now) btn(inp, 'c', bit, now); }
      else if (i === BMAP.start) { if (now) padStart(); }
      else if (BMAP.dpad[i]) {
        const code = BMAP.dpad[i], d = KEYDIR[code];
        if (!now) { inp.keys.delete(code); inp.held.delete(code); }
        else if (menu) navMove(seat, d[0], d[1]);
        else { if (M.cut && M.cut.duel && !inp.held.has(code)) { if (d[0]) inp.flick = d[0]; } inp.keys.add(code); }
      }
      if (join) { if (i === BMAP.big) lightPad(seat, 'big', now); else if (i === BMAP.small) lightPad(seat, 'small', now); else if (isShoulder(i)) lightPad(seat, 'sh', now); }
    }
    // the left stick: a 0.20 radial dead zone, rescaled to 0..1; a latched stick writes nothing until it is back inside 0.25
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, m = hyp(ax, ay);
    if (inp.latch && m < 0.25) inp.latch = false;
    if (m >= 0.20 && !inp.latch) { const k = Math.min(1, (m - 0.20)/0.80)/m; inp.jx = ax*k; inp.jy = ay*k; inp.padStick = true; P.stick = true; if (m >= 0.5) setDev('pad'); }
    else if (m < 0.20 && P.stick) { P.stick = false; if (inp.padStick) { inp.jx = inp.jy = 0; inp.padStick = false; } }   // zeroed once, and only if the stick was the last writer
    if (join && (m >= 0.5) !== !!P.stickLit) { P.stickLit = m >= 0.5; lightPad(seat, 'stick', P.stickLit); }
    if (menu) padNav(P, seat, ax, ay, m);
  }
}
function padNav(P, seat, ax, ay, m) {                      // the stick on a menu: a move, then repeats after 400ms and every 150ms while held
  const dir = m < 0.5 ? '' : Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 'r' : 'l') : (ay > 0 ? 'd' : 'u');
  if (!dir) { P.navDir = ''; return; }
  const now = performance.now();
  if (dir !== P.navDir) { P.navDir = dir; P.navT = now + 400; }
  else if (now < P.navT) return;
  else P.navT = now + 150;
  setDev('pad');
  navMove(seat, dir === 'r' ? 1 : dir === 'l' ? -1 : 0, dir === 'd' ? 1 : dir === 'u' ? -1 : 0);
}
function padStart() {
  if (practice && (practice.done || practice.ready)) return;                                      // Start: pause and resume, and Second Half on the break card
  if (!playing()) return;
  if (M.paused) resume();
  else if (M.phase === 'break') { const go = $('br-go'); if (!$('m-break').hidden && go.click) go.click(); }
  else if (M.phase !== 'menu') pause();
}
function twoClaim(P) {                                     // an unowned pad's first press. Once a seat has lost its pad (two.lost) the press takes that seat back, in any phase; otherwise only the join screen seats a pad: seat 0 if it isn't on one, else seat 1, else nothing (a third pad)
  let s = null;
  if (two.lost.length) { s = two.lost.shift(); if (two.lost.length) seatLost(two.lost[0]); else seatFound(); }   // the seats that lost their pads, in the order they went
  else if (!$('s-join').hidden) s = two.seats[0].dev !== 'pad' ? 0 : two.seats[1].dev !== 'pad' ? 1 : null;
  if (s == null) return;
  const old = two.seats[s].pad != null ? PADS.get(two.seats[s].pad) : null; if (old) old.owner = null;
  two.seats[s] = { dev:'pad', half:two.seats[s].half, pad:P.index }; P.owner = s;
  releaseAll(); seatsChanged();
}
function twoRelease(s) {                                   // back to the keyboard. With both seats on it the halves go by seat, Player 1 on the left (the other way round after Swap Players), whatever a solo spell left stored; a lone keyboard seat keeps its own side
  const o = two.seats[1 - s], left = two.swapped ? 1 : 0, half = s === left ? 'left' : 'right';
  const P = two.seats[s].pad != null ? PADS.get(two.seats[s].pad) : null; if (P) P.owner = null;
  two.seats[s] = { dev:'kb', half, pad:null };
  if (o.dev === 'kb') o.half = half === 'left' ? 'right' : 'left';
  releaseAll(); seatsChanged();
}
function twoSwap() { two.seats.reverse(); two.swapped = !two.swapped; for (const P of PADS.values()) if (P.owner != null) P.owner = 1 - P.owner; releaseAll(); seatsChanged(); }
function resetSeats() { two.seats = [{ dev:'kb', half:'left', pad:null }, { dev:'kb', half:'right', pad:null }]; two.lost = []; two.swapped = false; for (const P of PADS.values()) P.owner = null; }   // a fresh visit to the join screen: the halves in order, every pad back to Press Any Button
function padGone(index) {
  const P = PADS.get(index); if (!P) return;
  const seat = padSeat(P), bit = 4 << index;
  if (seat != null) {
    const inp = inputs[seat];
    for (const k of ['a', 'b', 'c']) btn(inp, k, bit, false);
    if (P.stick && inp.padStick) { inp.jx = inp.jy = 0; inp.padStick = false; }
    for (const code of Object.values(BMAP.dpad)) { inp.keys.delete(code); inp.held.delete(code); }
  }
  PADS.delete(index);
  setDesk();                                               // the home's Two Player button follows the pads actually connected
  if (two.on && P.owner != null) { if (!two.lost.includes(P.owner)) two.lost.push(P.owner); twoRelease(P.owner); if (playing()) { pause(); seatLost(two.lost[0]); } }   // the seat falls back to the keyboard and is held for the next pad press, on the pause card, the half-time card or in play
  else if (P.used && playing()) pause();                   // one player: a pad that was never used this match (one that slept over half time) can't interrupt
}
function seatLost(s) { for (const id of ['pz-seat', 'br-seat']) { const el = $(id); if (el) { el.textContent = 'Player ' + (s + 1) + ' · Press Any Button'; el.hidden = false; el.classList.toggle('s1', s === 1); } } }   // on the pause card and the half-time card alike
function seatFound() { for (const id of ['pz-seat', 'br-seat']) { const el = $(id); if (el) el.hidden = true; } }
function padConnected(gp) {
  padsOn = true;
  if (gp) padOf(gp);
  setDesk();
}
window.addEventListener('gamepadconnected', e => padConnected(e.gamepad));
window.addEventListener('gamepaddisconnected', e => padGone(e.gamepad.index));
function rumble(seat, ms) {                                // Chrome and Edge only; feature-checked, so anywhere else it is a no-op
  if (!padsOn || seat == null) return;
  for (const P of PADS.values()) {
    if (padSeat(P) !== seat || !P.act || !P.act.playEffect) continue;
    try { P.act.playEffect('dual-rumble', { duration:ms, strongMagnitude:0.6, weakMagnitude:0.3 }); } catch (e) { /* unsupported */ }
  }
}

/* ---------- menus and cards from a controller ----------
   A chalk ring (.padfocus) on the current button, moved spatially; the real DOM focus never moves, so a native Enter can't
   double-fire. In one player the keyboard keeps its native Tab, Enter and Space, so nothing changes for today's keyboard players. */
let focusEl = null;
const navLog = [];                                         // the tools read who tried to navigate and whether the layer was his: [fn, seat, owned]
const logNav = (fn, seat) => { navLog.push([fn, seat, navOwner(seat)]); if (navLog.length > 40) navLog.shift(); };
function navLayer() {                                      // the top layer: the pause card over anything (it can sit over the penalty card), then an open card, then the visible screen
  const pg = $('m-gate'); if (pg && !pg.hidden) return pg;   // the grown-up check (kids.js) sits over everything, another card included
  const pz = $('m-pause'); if (pz && !pz.hidden) return pz;
  for (const m of document.querySelectorAll('.modal')) if (!m.hidden) return m;
  for (const s of document.querySelectorAll('.screen')) if (!s.hidden) return s;
  return null;
}
function navCands(layer) {
  const out = [];
  for (const el of layer.querySelectorAll('.btn, .team, .seg button, .sw, .step, summary, .app-action')) {
    if (el.disabled || el.hidden || el.getAttribute('aria-disabled') === 'true' || (el.closest && el.closest('[hidden]'))) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    out.push(el);
  }
  return out;
}
function setFocus(el) {
  if (focusEl && focusEl !== el) focusEl.classList.remove('padfocus');
  focusEl = el || null;
  if (focusEl) { focusEl.classList.add('padfocus'); if (focusEl.scrollIntoView) focusEl.scrollIntoView({ block:'nearest' }); }
}
const DEFAULT_FOCUS = { 's-home':() => $('b-quick'), 's-join':() => $('j-go'), 'm-pen':() => ($('p-goal').disabled ? $('p-touch') : $('p-goal')), 'm-break':() => $('br-go'), 'm-pause':() => $('pz-resume') };
let navOnly = null;                                        // two player: the one seat that may act on the top layer (the team pick, the penalty card), or null for either
function navOwner(seat) { return (M && M.paused) || navOnly == null || seat == null || seat === navOnly; }   // the pause card is anyone's, whatever card it covers
function navSide(seat) {                                   // the one button a restricted seat may still press: Player 1's Change Team while Player 2 picks
  if (seat === 0 && pickMode === 'two' && twoSel.picking === 1 && !$('s-teams').hidden && !$('t-yours').hidden) return $('t-change');
  return null;
}
function navMove(seat, dx, dy) {                           // the nearest candidate within 60 degrees of the direction: the distance along it plus twice the sideways offset
  logNav('move', seat);
  if (!navOwner(seat)) return null;
  const layer = navLayer(); if (!layer) return null;
  const cands = navCands(layer); if (!cands.length) return null;
  if (!focusEl || !cands.includes(focusEl)) { const d = DEFAULT_FOCUS[layer.id], el = d && d(); setFocus(el && cands.includes(el) ? el : cands[0]); return focusEl; }   // the first press puts the ring on the default button
  if (!dx && !dy) return focusEl;
  const r0 = focusEl.getBoundingClientRect(), cx = r0.left + r0.width/2, cy = r0.top + r0.height/2;
  let best = null, bs = 1e9;
  for (const el of cands) {
    if (el === focusEl) continue;
    const r = el.getBoundingClientRect(), ex = r.left + r.width/2 - cx, ey = r.top + r.height/2 - cy;
    const along = ex*dx + ey*dy, side = Math.abs(ex*dy - ey*dx);
    if (along <= 0 || side > along*1.732) continue;
    const s = along + 2*side;
    if (s < bs) { bs = s; best = el; }
  }
  if (best && typeof best.closest === 'function' && best.getAttribute('role') === 'tab') {   // into a tablist from outside it (the home's bar): on its chosen tab, as Tab lands, never the nearest one
    const list = best.closest('[role="tablist"]'), sel = list && !list.contains(focusEl) && list.querySelector('[role="tab"][aria-selected="true"]');
    if (sel && cands.includes(sel)) best = sel;
  }
  if (best) setFocus(best);
  return best;
}
function navPress(seat) {
  logNav('press', seat);
  if (!navOwner(seat)) { const el = navSide(seat); if (el && el.click) { el.click(); return true; } return false; }
  const layer = navLayer(); if (!layer) return false;
  if (!focusEl || !navCands(layer).includes(focusEl)) { navMove(seat, 0, 0); return false; }
  if (focusEl.click) focusEl.click();
  return true;
}
function navBack(seat) {
  if (practice && (practice.done || practice.ready)) { practiceChoose(); return true; }
  logNav('back', seat);
  if (!navOwner(seat)) return false;
  const layer = navLayer(); if (!layer) return false;
  for (const el of layer.querySelectorAll('[data-back]')) if (!el.hidden && !(el.closest && el.closest('[hidden]'))) { if (el.click) el.click(); return true; }
  return false;
}

/* ---------- housekeeping ---------- */
document.addEventListener('pointerdown', () => ac(), true);   // a controller press is not a user activation, so it can't start sound; any key or click can
document.addEventListener('keydown', () => ac(), true);
window.addEventListener('blur', () => { releaseAll(); pause(); });   // a run can't stick after Cmd-Tab
const deskQuery = (() => { try { return matchMedia('(hover: hover) and (pointer: fine)'); } catch (e) { return null; } })();   // the primary pointer, on purpose: any-* would put the button on hybrid tablets
function setDesk() { const b = document.body; if (b) b.classList.toggle('desk', PADS.size > 0 || !!(deskQuery && deskQuery.matches)); }   // a computer, or a controller connected right now: a phone that had a pad goes back to its own layout when it is unplugged
const isDesk = () => !!(document.body && document.body.classList.contains('desk'));
if (deskQuery) { if (deskQuery.addEventListener) deskQuery.addEventListener('change', setDesk); else if (deskQuery.addListener) deskQuery.addListener(setDesk); }

