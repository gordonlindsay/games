// The behind views (Low, Mid, High): the gate, the stick's turn, engine parity with Top, drawing safety, framing, looks and the saved setting.
process.env.SEED ??= '11';
const { T, inputs, bot, reseed, rndCalls } = await import('./harness.mjs');
import { readGameSource } from './source.mjs';
import { spawnSync } from 'node:child_process';
const D = T.debug, B = T.behind, S = D.settings(), $ = id => document.getElementById(id), STEP = T.STEP;
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const dirOf = t => (t === 0 ? 1 : -1);
const clearInput = () => { for (const inp of inputs) { inp.keys.clear(); inp.jx = inp.jy = 0; inp.latPeak = null; inp.aPressed = inp.bPressed = inp.cPressed = false; inp.aDown = inp.bDown = inp.cDown = false; inp.gest = null; } };
function fresh(cam, o = {}) {
  S.cam = cam;
  T.newMatch(o.a ?? 0, o.b ?? 1, { halfLen:240, diff:1, headless:true, duels:'off', ...o });
  D.setMode('match'); D.setTwo(false); clearInput();
  return T.M;
}
const inPlay = () => { const m = T.M; m.phase = 'play'; m.set = null; m.cut = null; return m; };
// the bot plays in world directions; in a behind view the same run is a different thumb position: rawX = y*d, rawY = -x*d
function drive(team = 0) {
  bot(team);
  const inp = T.sides.inputOf(team);
  if (S.cam > 0 && !T.M.cut) { const d = dirOf(team), x = inp.jx, y = inp.jy; inp.jx = y*d; inp.jy = -x*d; }
}

// one frame's ctx calls, each with the fill, stroke and dash in force when it ran
function capture(fn) {
  const log = []; let fill = null, stroke = null, dash = [];
  globalThis.__ctxSpy = (k, a) => { if (k === 'fillStyle') fill = a[0]; else if (k === 'strokeStyle') stroke = a[0]; else if (k === 'setLineDash') dash = a[0]; log.push({ k, a, fill, stroke, dash }); };
  try { fn(); } finally { globalThis.__ctxSpy = null; }
  return log;
}
// a canvas of its own, so a sprite cell can be told from the main canvas: the harness gives every canvas the same one
function recorder() {
  const log = [];
  const g = new Proxy({}, { get: (t, k) => (k === 'globalAlpha' ? 1 : k === 'measureText' ? () => ({ width:10 }) : (...a) => { log.push({ k, a }); }), set: (t, k, v) => { log.push({ k, a:[v] }); return true; } });
  return { g, log };
}
// a known picture: the human carrier mid-frame, mates behind him, opponents ahead, everyone standing on the screen at his own depth, sprites baked
function stage(cam, o = {}) {
  const team = o.team ?? 0, d = dirOf(team), m = (fresh(cam, o), inPlay()), mine = m.players.filter(p => p.team === team), opp = m.players.filter(p => p.team !== team), c = mine[3];
  mine.forEach((p, i) => Object.assign(p, { x:60 + (i - 3)*0.9*d, y:26 + i*3 }));
  opp.forEach((p, i) => Object.assign(p, { x:60 + (7 + i*2)*d, y:20 + i*5 }));
  for (const p of m.players) Object.assign(p, { vx:0, vy:0, fx:d, fy:0, down:0, tcd:9, think:9, drawFrom:null, bind:null, fend:0, stumble:0 });
  Object.assign(c, { y:35 });
  m.ball.state = 'held'; m.ball.carrier = c; m.ball.x = c.x; m.ball.y = c.y; m.ball.z = 0; m.ball.f = null; T.sides.setCtrl(team, c);
  for (let i = 0; i < 8; i++) D.render(STEP);
  return { m, c, mine, opp, team, d };
}
const camNow = () => B.BV.cam, prNow = (x, y, h = 0) => T.kick.pr(camNow(), x, y, h);
const atOf = p => { const s = B.BV.men.get(p); return prNow(s.wx, s.wy); };
const placeOf = (log, p) => { const at = atOf(p); return at ? log.findIndex((e, i) => e.k === 'translate' && near(e.a[0], at.sx, 1e-6) && near(e.a[1], at.sy, 1e-6) && log[i + 1] && log[i + 1].k === 'scale') : -1; };
const ringAt = (log, x, y, radius) => { const q = prNow(x, y); if (!q) return null; const rx = Math.max(6, radius*q.k); return log.find(e => e.k === 'ellipse' && near(e.a[0], q.sx, 1e-6) && near(e.a[1], q.sy, 1e-6) && near(e.a[2], rx, 1e-6)) || null; };
const RING = 0.6, WHITE = 'rgba(244,241,232,.95)', frameLog = () => capture(() => D.render(STEP));

/* ---------- the gate ---------- */
{
  fresh(0); ok(!B.behindOn() && B.stickTurn(0) === 0, 'Top: no behind view, no turn');
  ok(B.dprMax() === 2, 'Top keeps the sharper canvas');
  D.render(STEP); ok(B.BV.on === false, 'Top frame leaves BV.on false');
  for (const c of [1, 2, 3]) { fresh(c); ok(B.behindOn() && B.stickTurn(0) === 1, `cam ${c}: on in a headless test match`); }
  ok(B.dprMax() === 1.5, 'the behind view caps the canvas at 1.5');
  fresh(2, { humans:[true, true], levels:[1, 1] }); D.setTwo(true); ok(!B.behindOn() && B.stickTurn(0) === 0 && B.stickTurn(1) === 0, 'off in Two Player'); D.setTwo(false);
  fresh(2, { auto:true }); ok(!B.behindOn(), 'off under M.auto (simulate)');
  fresh(2); T.M.demo = true; ok(!B.behindOn() && B.stickTurn(0) === 0, 'off for the menu demo'); T.M.demo = false;
  fresh(2); D.setMode('menu'); ok(!B.behindOn(), 'off outside a match'); D.setMode('match');
  S.cam = 2; T.practice.start('pass'); ok(T.practice.state() && !B.behindOn() && B.stickTurn(0) === 0, 'off in Practice');
  D.render(STEP); ok(B.BV.on === false, 'a Practice frame runs the Top path');
  T.practice.leave(); ok(S.cam === 2, 'and the saved choice survives Practice');
  fresh(2, { humans:[false, true] }); ok(B.stickTurn(0) === -1 && B.stickTurn(1) === 0, 'the away side: seat 0 plays team 1, seat 1 is nobody');
  S.cam = 0;
}

/* ---------- the stick ---------- */
{
  const table = [[[0, -1], 'up'], [[0, 1], 'down'], [[1, 0], 'right'], [[-1, 0], 'left'], [[0.6, -0.8], 'diag']];
  for (const [team, o] of [[0, {}], [1, { humans:[false, true] }]]) {
    const d = dirOf(team);
    fresh(2, o); const inp = inputs[0];
    for (const [[jx, jy], name] of table) {
      inp.jx = jx; inp.jy = jy;
      const w = inp.world();
      ok(near(w.x, -jy*d) && near(w.y, jx*d) && near(w.mag, Math.hypot(jx, jy)), `team ${team} ${name}: world (${w.x}, ${w.y})`);
      // and it inverts the bot's conversion
      ok(near(w.y*d, jx) && near(-w.x*d, jy), `team ${team} ${name}: rawX = y*d, rawY = -x*d`);
    }
    inp.jx = inp.jy = 0;
    // keys: up is forward for either team
    inp.keys.add('KeyW'); let w = inp.world(); ok(near(w.x, d) && near(w.y, 0), `team ${team}: W runs at their line`); inp.keys.clear();
    inp.keys.add('KeyD'); w = inp.world(); ok(near(w.x, 0) && near(w.y, d), `team ${team}: D runs screen right`); inp.keys.clear();
    // stick truth, on the camera: sideways leaves the screen's y alone and moves x the way the thumb went; up always climbs the screen
    inPlay(); D.render(STEP);
    const cam = B.BV.cam, c = T.sides.ctrlOf(team);
    for (const [px, py] of [[20, 5], [60, 35], [100, 65], [c.x, c.y]]) {
      const at = T.kick.pr(cam, px, py, 0); if (!at) continue;
      inp.jx = 1; inp.jy = 0; w = inp.world();
      const side = T.kick.pr(cam, px + w.x, py + w.y, 0);
      ok(near(side.sy, at.sy, 1e-6) && side.sx > at.sx, `team ${team}: stick right at (${px}, ${py}) is pure screen right`);
      inp.jx = 0; inp.jy = -1; w = inp.world();
      const up = T.kick.pr(cam, px + w.x, py + w.y, 0);
      ok(up.sy < at.sy, `team ${team}: stick up at (${px}, ${py}) climbs the screen`);
    }
    inp.jx = inp.jy = 0;
    // the drawn run, through the engine: up closes on their line
    const m = inPlay(); for (const p of m.players) Object.assign(p, { x:p.team === team ? 60 : 60 + d*50, y:p.team === team ? 35 : 5, vx:0, vy:0, down:0 });
    m.ball.state = 'held'; m.ball.carrier = c; T.sides.setCtrl(team, c);
    const x0 = c.x; inp.jx = 0; inp.jy = -1; for (let i = 0; i < 30; i++) T.update(STEP); inp.jx = inp.jy = 0;
    ok((c.x - x0)*d > 1, `team ${team}: stick up carries him toward their line (${(c.x - x0).toFixed(2)})`);
  }
  // identity when off, for every direction and key
  fresh(0); const inp = inputs[0];
  for (const [[jx, jy]] of table) { inp.jx = jx; inp.jy = jy; const w = inp.world(); ok(w.x === jx && w.y === jy, `Top: world is the stick (${jx}, ${jy})`); }
  inp.jx = inp.jy = 0;
  ok(B.keyFwd(inp, [1, 0]) === 1 && B.keyFwd(inp, [0, -1]) === 0, 'Top: keyFwd is the key\'s x');
  for (const code of ['KeyS', 'KeyA']) { inp.keys.clear(); inp.keys.add(code); ok(B.dirKeyHeld(inp, 1) === (code === 'KeyA') && B.dirKeyHeld(inp) === true, `Top: ${code} back rule unchanged`); }
  inp.keys.clear();
  // back keys
  fresh(2); inp.keys.add('KeyS'); ok(B.dirKeyHeld(inp, 1) === true, 'behind: S is the back key'); inp.keys.clear();
  inp.keys.add('KeyA'); ok(B.dirKeyHeld(inp, 1) === false, 'behind: A is not'); inp.keys.clear();
  fresh(2, { humans:[false, true] }); inp.keys.add('ArrowDown'); ok(B.dirKeyHeld(inp, -1) === true, 'behind, away side: Down is the back key'); inp.keys.clear();
  // keycaps
  fresh(2);
  ok(/>A<.*>D</.test(D.keycapsFor(0, 'v')), `behind: Side Step shows A D (${D.keycapsFor(0, 'v')})`);
  ok(/>S</.test(D.keycapsFor(0, 'back')), `behind: Dummy shows S (${D.keycapsFor(0, 'back')})`);
  ok(/>A<.*>D</.test(D.keycapsFor(0, 'x')), 'behind: the duel\'s across keys stay A D');
  fresh(0);
  ok(/>W<.*>S</.test(D.keycapsFor(0, 'v')), 'Top: Side Step shows W S');
  ok(/>A</.test(D.keycapsFor(0, 'back')), 'Top: Dummy shows A');
  // the coalesced peak through the zone's own listener: sideways in a behind view, up and down on Top
  const zone = $('zone'), peak = (dx, dy) => {
    inp.latPeak = null;
    zone.fire('pointerdown', { pointerId:1, clientX:100, clientY:280 });
    zone.fire('pointermove', { pointerId:1, clientX:100 + dx, clientY:280 + dy, getCoalescedEvents:() => [{ clientX:100 + dx, clientY:280 + dy }] });
    const v = inp.latPeak;
    zone.fire('pointerup', { pointerId:1, clientX:100 + dx, clientY:280 + dy });
    return v;
  };
  fresh(0); ok(peak(0, 40) > 0.5 && peak(40, 0) == null, 'Top: the peak reads up and down');
  fresh(2); ok(peak(40, 0) > 0.5 && peak(0, -40) == null, 'behind: the peak reads across, right is +y for team 0');
  fresh(2, { humans:[false, true] }); ok(peak(40, 0) < -0.5, 'behind, away side: right is -y');
  // the gestures: a forward push fires no Side Step, a sideways flick does
  const gesture = (flick) => {
    const m = inPlay(); clearInput();
    const c = m.players[3], q = m.players[10];
    for (const p of m.players) Object.assign(p, { x:p.team ? 115 : 5, y:5, vx:0, vy:0, down:0, tcd:9, think:9 });
    Object.assign(c, { x:40, y:35, fx:1, fy:0, side:-1, hold:2 }); Object.assign(q, { x:43, y:35 });
    m.ball.state = 'held'; m.ball.carrier = c; T.sides.setCtrl(0, c);
    const tags0 = T.M.tags.length; let stepped = false;
    inp.jx = 0; inp.jy = -1; T.update(STEP); T.update(STEP);
    for (let i = 0; i < 6; i++) {
      if (flick) { inp.jx = Math.min(0.9, 0.3*(i + 1)); inp.jy = -0.3; } else { inp.jx = 0; inp.jy = -1; }
      c.hold = 2; T.update(STEP);
      if (T.M.tags.slice(tags0).some(t => /step/i.test(t.text))) stepped = true;
    }
    clearInput();
    return stepped;
  };
  fresh(2); ok(!gesture(false), 'behind: a forward push fires no Side Step');
  fresh(2); ok(gesture(true), 'behind: a sideways flick does');
  S.cam = 0;
}

/* ---------- engine parity ---------- */
{
  const runIt = (cam, seed, frames, o, team = 0) => {
    S.cam = cam; reseed(seed); const r0 = rndCalls();
    T.newMatch(0, 1, { halfLen:240, diff:1, ...o }); D.setMode('match'); clearInput();
    let behind = 0;
    for (let i = 0; i < frames; i++) { drive(team); T.update(STEP); D.render(STEP); if (B.BV.on) behind++; }
    ok(behind === (cam ? frames : 0), `cam ${cam} really drew ${cam ? 'behind' : 'Top'} every frame (${behind})`);
    const m = T.M;
    clearInput();
    const out = { players:m.players.map(p => [p.x, p.y, p.vx, p.vy, p.fx, p.fy, p.down]), ball:[m.ball.state, m.ball.x, m.ball.y, m.ball.z], score:m.score, tries:m.tries, stats:m.stats, clock:m.clock, rnd:rndCalls() - r0 };
    D.setMode('menu');
    return JSON.stringify(out);
  };
  const cases = [['headless, duels off', 11, 3000, { headless:true, duels:'off' }, 0], ['the away side', 12, 3000, { headless:true, duels:'off', humans:[false, true] }, 1], ['live, close-ups on', 13, 3000, { duels:'live' }, 0], ['arcade', 14, 3000, { headless:true, duels:'off', arcade:true }, 0], ['arcade, away', 15, 3000, { headless:true, duels:'off', arcade:true, humans:[false, true] }, 1]];
  for (const [name, seed, frames, o, team] of cases) {
    const a = runIt(0, seed, frames, o, team), b = runIt(2, seed, frames, o, team);
    ok(a === b, `parity, ${name}: cam 0 and cam 2 give the same players, ball, score, stats and draws`);
    if (a !== b) { const A = JSON.parse(a), Bb = JSON.parse(b); for (const k of Object.keys(A)) if (JSON.stringify(A[k]) !== JSON.stringify(Bb[k])) console.log('  differs:', k, JSON.stringify(A[k]).slice(0, 160), 'v', JSON.stringify(Bb[k]).slice(0, 160)); }
  }
  S.cam = 0;
}

/* ---------- drawing ---------- */
{
  const bad = new Map(), mark = k => bad.set(k, (bad.get(k) || 0) + 1);
  const walk = (k, v) => { if (typeof v === 'number') { if (!Number.isFinite(v)) mark(k); } else if (typeof v === 'string') { if (/NaN|Infinity/.test(v)) mark(k); } else if (Array.isArray(v)) for (const x of v) walk(k, x); };
  let frames = 0, rndIn = 0, images = 0, maxWarm = 0, warmN = 0, warmOver = 0, ops = 0, worst = '';
  globalThis.__ctxSpy = (k, a) => { ops++; if (k === 'drawImage') images++; for (const v of a) walk(k, v); };
  // the sizes, reduced motion and the other presets for a short run; then Mid at 844x390 for whole matches over many seeds, because a pile-up is rare
  const runs = [[667, 375, false, 2, 600, 969], [844, 390, false, 2, 600, 1146], [932, 430, false, 2, 600, 1234], [844, 390, true, 2, 600, 1146], [844, 390, false, 1, 600, 1145], [844, 390, false, 3, 600, 1147], [667, 375, false, 2, 600, 970, { arcade:true }, 0], [844, 390, false, 1, 600, 971, { arcade:true }, 0]];
  for (const seed of [13, 26, 39, 52, 65, 78, 91, 104, 117, 130, 247]) runs.push([844, 390, false, 2, 5400, seed]);
  for (const seed of [13, 26, 39, 91]) { runs.push([844, 390, false, 2, 5400, seed, { arcade:true }, 0]); runs.push([844, 390, false, 2, 5400, seed, { arcade:true, humans:[false, true] }, 1]); }
  for (const [W, H, rm, cam, len, seed, o, team] of runs) {
    D.view(W, H); D.setRM(rm);
    reseed(seed); fresh(cam, o || {});
    for (let n = 0; n < len; n++) {
      drive(team || 0); T.update(STEP);
      const r1 = rndCalls(), b0 = B.BV.baked; ops = 0;
      D.render(STEP); D.updateHud();
      if (rndCalls() !== r1) rndIn++;
      frames++;
      if (B.BV.baked === b0 && !T.M.cut && W === 844 && !rm && cam === 2) { warmN++; if (ops > maxWarm) { maxWarm = ops; worst = `seed ${seed}${o ? ' arcade' : ''} frame ${n}, ${T.M.players.filter(p => p.down > 0 || p.bind).length} men down or bound`; } if (ops > 847) warmOver++; }
    }
    D.setMode('menu');
  }
  ok(bad.size === 0, `no non-finite value reaches the canvas over ${frames} frames (${[...bad.entries()].map(([k, v]) => k + ' x' + v).join(', ')})`);
  ok(rndIn === 0, `render and the HUD draw no random number (${rndIn} frames did)`);
  ok(images > frames, `the men are sprites (${images} drawImage calls over ${frames} frames)`);
  ok(warmN > 50000, `warm frames measured (${warmN})`);
  ok(warmOver === 0 && maxWarm > 0, `a warm frame at 844x390 stays at or under 847 ops (worst ${maxWarm}, ${worst}, ${warmOver} over)`);
  console.log(`  warm frame ops at 844x390, Mid: worst ${maxWarm} over ${warmN} frames`);
  D.setRM(false); D.view(844, 390);

  // the render-only clocks keep running in a behind view
  fresh(2); let m = inPlay();
  m.tags = [{ text:'Test', x:60, y:35, t:0 }]; m.fx = [{ x:60, y:35, t:0 }]; const p0 = m.players[0]; p0.drawFrom = { t:0.2, T:0.2, x:p0.x + 1, y:p0.y, spin:0 }; p0.fend = 0.1; p0.fendA = 0.5;
  for (let i = 0; i < 60; i++) { D.render(STEP); }
  ok(m.tags.length === 0 && m.fx.length === 0 && p0.drawFrom === null && p0.fend <= 0, 'tags, impact rings, drawFrom and the fend all expire');
  // shake is spent too, though a behind view doesn't shake
  m.shake = 0.1; m.shakeT = 0.12; for (let i = 0; i < 10; i++) D.render(STEP); ok(m.shake <= 0, 'the Big Hit clock runs down');

  // a close-up paints over the whole frame, last
  fresh(2, { headless:false, duels:'off' }); T.scrum(0, 40, 35); let guard = 0;
  while (!T.M.cut && guard++ < 200) T.update(STEP);
  ok(!!T.M.cut, 'a scrum close-up has started');
  if (T.M.cut) {
    for (let i = 0; i < 30; i++) T.update(STEP);
    const log = []; globalThis.__ctxSpy = k => log.push(k); D.render(STEP); globalThis.__ctxSpy = null;
    const clip = log.indexOf('clip'), lastImage = log.lastIndexOf('drawImage'), pitch = log.indexOf('setTransform');
    ok(clip > 0 && lastImage < clip && pitch < clip, `drawCut paints after everything else (clip at ${clip}, last sprite at ${lastImage})`);
    ok(B.BV.on === true, 'and the behind view is still the frame under it');
  }
  D.setMode('menu');

  // men past the lens and behind it
  fresh(2); m = inPlay(); D.render(STEP);
  const cam = B.BV.cam, behind = B.toS(cam.Cx - 5, 35);
  ok(behind[0] === 844/2 && behind[1] === 390 + 999, `a point behind the lens is off the bottom edge (${behind})`);
  m.players.forEach((p, i) => { p.x = cam.Cx + 1 + i*0.25; p.y = 35 + i*0.2; });
  globalThis.__ctxSpy = (k, a) => { for (const v of a) walk(k, v); }; for (let i = 0; i < 4; i++) D.render(STEP); globalThis.__ctxSpy = null;
  ok(bad.size === 0, 'men on the lens draw nothing non-finite');

  // the moments a bot rarely reaches, under the same no-random and no-NaN watch: On Fire, the kick aim, the gold ring and a man fading at the lens
  {
    const watch = fn => { const r0 = rndCalls(), log = capture(() => { const spy = globalThis.__ctxSpy; globalThis.__ctxSpy = (k, a) => { for (const v of a) walk(k, v); spy(k, a); }; fn(); }); ok(rndCalls() === r0, 'a forced moment draws no random number'); return log; };
    let st = stage(2, { arcade:true }); st.m.fire[0].t = 5; st.mine[1].vx = 6; st.mine[1].x += 0.1;
    let log = watch(() => D.render(STEP));
    ok(T.arcade.onFire(0) && log.some(e => e.k === 'ellipse' && /^rgba\(255,110,30/.test(e.fill)), 'On Fire glows in a behind view');
    ok(log.filter(e => e.k === 'ellipse' && e.fill === 'rgba(255,110,30,.6)').length >= 2, 'and a running man leaves the fire trail');
    st = stage(2); Object.assign(T.sides.side(0), { charging:true, charge:0.5 });
    log = watch(() => D.render(STEP));
    const len = 10 + 0.5*(36 + T.M.nat[0].kicking*3), wx = st.c.x + len, q = prNow(wx, st.c.y), hw = Math.max(5, 0.32*q.k), hh = hw*Math.min(0.6, Math.max(0.18, camNow().ch/q.z));
    ok(ringAt(log, wx, st.c.y, RING*1.2) && log.some(e => e.k === 'moveTo' && near(e.a[0], q.sx - hw, 1e-6) && near(e.a[1], q.sy - hh, 1e-6)), 'the kick aim is a ring and a cross where the kick would land');
    T.sides.side(0).charging = false;
    st = stage(2); Object.assign(st.mine[0], { x:st.c.x - 8, y:st.c.y - 14 }); T.sides.side(0).pass = { mode:'hold', t:T.contact.LONG.arm + 0.05 };
    const shown = T.contact.shownPass(st.c);
    log = watch(() => D.render(STEP));
    const goldRing = shown.to && ringAt(log, shown.to.x, shown.to.y, RING*1.6);
    ok(shown.gold && goldRing && goldRing.dash.length > 0, `a long hold rings the far man, dashed (gold ${shown.gold})`);
    T.sides.side(0).pass = null;
    D.view(390, 844); st = stage(1); const lens = st.opp[0]; lens.x = camNow().Cx + 3.5; lens.y = camNow().Cy;   // only an upright screen shows a man this close: a landscape frame culls him first
    log = watch(() => D.render(STEP));
    const fade = (B.BV.men.get(lens).z - T.kick.CAM.fadeZ)/T.kick.CAM.fadeW;
    ok(fade > 0 && fade < 1 && log.some(e => e.k === 'globalAlpha' && near(e.a[0], fade, 1e-9)), `a man at the lens fades (${fade.toFixed(2)})`);
    D.view(844, 390); D.setMode('menu');
    ok(bad.size === 0, `no forced moment reaches the canvas with a non-finite value (${[...bad.keys()].join()})`);
  }

  // what a frame shows, read from the calls that drew it
  {
    let st = stage(2), c = st.c, log = frameLog();
    const gA = log.filter(e => e.k === 'fill' && e.fill === B.C.grassA).length, gB = log.filter(e => e.k === 'fill' && e.fill === B.C.grassB).length;
    ok(gA >= 2 && gB >= 2, `the grass is drawn in its bands (${gA} and ${gB})`);
    const ring = ringAt(log, c.x, c.y, RING*1.55);
    ok(ring && ring.stroke === B.ringCol(0) && ring.dash.length === 0, 'the ring man has a solid ring in the ring colour');
    const to = T.contact.shownPass(c).to, tr = to && ringAt(log, to.x, to.y, RING*1.6);
    ok(tr && (tr.stroke === WHITE || tr.stroke === T.contact.SUPPORT.tint) && tr.dash.length > 0, 'the pass target has its dashed ring');
    // far to near, each man scaled by his own height and build, sprites sized by his own depth
    const byDepth = st.m.players.slice().sort((a, b) => B.BV.men.get(b).z - B.BV.men.get(a).z), places = byDepth.map(p => placeOf(log, p));
    ok(places.every(i => i >= 0), 'every man on the screen is placed');
    ok(places.every((v, i) => !i || v > places[i - 1]), 'the men are painted far to near');
    ok(st.m.players.every(p => { const i = placeOf(log, p), L = B.lookOf(p), sc = L.h/1.8, e = log[i + 1]; return near(e.a[0], L.b*sc, 1e-9) && near(e.a[1], sc, 1e-9); }), 'each man is drawn at his own height and build');
    const shapeOk = (p, shape) => { const i = placeOf(log, p), kk = atOf(p).k, j = log.findIndex((e, n) => n > i && e.k === 'drawImage'), e = log[j]; return e && near(e.a[1], -shape.ox*kk, 1e-6) && near(e.a[2], -shape.oy*kk, 1e-6) && near(e.a[3], shape.w*kk, 1e-6) && near(e.a[4], shape.h*kk, 1e-6) ? e : null; };
    ok(st.m.players.filter(p => p !== c).every(p => shapeOk(p, B.BV_CELL.stand)), 'a sprite stands on his feet in the cell it was baked in');
    // the man you run is painted fresh, in his own skin, and the ball follows him before anyone nearer
    const ci = placeOf(log, c), at = atOf(c), kk = at.k, Lc = B.lookOf(c), bx = at.sx + 0.18*kk, by = at.sy - 1.15*kk*Lc.h/1.8;
    const bi = log.findIndex(e => e.k === 'translate' && near(e.a[0], bx, 1e-6) && near(e.a[1], by, 1e-6));
    const between = log.slice(ci, bi);
    ok(ci >= 0 && bi > ci && !between.some(e => e.k === 'drawImage') && between.some(e => e.k === 'fill' && e.fill === B.LOOK_SKIN[Lc.skin]), 'the ring man is drawn live, in his own skin');
    ok(byDepth.every(p => p === c || (B.BV.men.get(p).z > B.BV.men.get(c).z ? placeOf(log, p) < bi : placeOf(log, p) > bi)), 'the held ball comes straight after its carrier, under anyone nearer');
    // the pointer over his head
    const tip = Math.max(14, at.sy - (Lc.h + 0.2)*kk);
    ok(log.some(e => e.k === 'moveTo' && near(e.a[0], at.sx - 6, 1e-6) && near(e.a[1], tip - 8, 1e-6) && e.fill === B.ringCol(0)), 'the pointer sits over his head');
    // a CPU carrier stays a sprite, with the ball after him
    const carrier = st.opp[0]; st.m.ball.carrier = carrier; st.m.ball.x = carrier.x; st.m.ball.y = carrier.y; log = frameLog();
    const ca = atOf(carrier), L2 = B.lookOf(carrier), bi2 = log.findIndex(e => e.k === 'translate' && near(e.a[0], ca.sx + 0.18*ca.k*(B.BV.men.get(carrier).view === 2 ? B.BV.men.get(carrier).face : 1), 1e-6) && near(e.a[1], ca.sy - 1.15*ca.k*L2.h/1.8, 1e-6));
    ok(bi2 > placeOf(log, carrier), 'a CPU carrier\'s ball follows his sprite');
    // defending: the Switch ring
    const sw = T.contact.switchTarget(0), swr = sw && ringAt(log, sw.x, sw.y, RING*1.45);
    ok(sw && swr && swr.stroke === B.ringCol(0) && swr.dash.length > 0, 'the Switch target has its dashed ring');
    // a free ball after the men, a kick's landing mark
    st = stage(2); c = st.c; Object.assign(st.m.ball, { state:'loose', carrier:null, x:c.x + 2, y:30, z:0, vx:0, vy:0 }); log = frameLog();
    let qb = prNow(c.x + 2, 30), iBall = log.findIndex(e => e.k === 'translate' && near(e.a[0], qb.sx, 1e-6) && near(e.a[1], qb.sy, 1e-6));
    ok(iBall > Math.max(...st.m.players.map(p => placeOf(log, p))), 'a free ball is drawn after the men');
    Object.assign(st.m.ball, { state:'air', z:4, f:{ kind:'kick', team:1, x1:c.x - 4, y1:40 } }); for (let i = 0; i < 4; i++) D.render(STEP); log = frameLog();
    qb = prNow(st.m.ball.x, st.m.ball.y, 4);
    const land = ringAt(log, c.x - 4, 40, RING*1.3);
    ok(land && land.dash.length > 0 && log.some(e => e.k === 'translate' && near(e.a[0], qb.sx, 1e-6) && near(e.a[1], qb.sy, 1e-6)), 'a ball in the air flies at its height, with a mark where it lands');
    // an off-frame target: a chevron on the edge
    st = stage(2); c = st.c; st.mine[0].x = st.mine[1].x = c.x + 8; Object.assign(st.mine[2], { x:c.x - 5, y:c.y - 20 }); for (let i = 0; i < 3; i++) D.render(STEP); log = frameLog();
    const far = T.contact.shownPass(c).to, [fx, fy] = far ? B.toS(far.x, far.y) : [0, 0], ang = Math.atan2(fy - 390/2, fx - 844/2);
    ok(far === st.mine[2] && (fx < 0 || fx > 844), `the target is off the frame for the chevron test (${fx})`);
    ok(log.some(e => e.k === 'moveTo' && e.fill === WHITE && near(e.a[0], Math.max(14, Math.min(830, fx)) + Math.cos(ang)*9, 1e-6) && near(e.a[1], Math.max(14, Math.min(376, fy)) + Math.sin(ang)*9, 1e-6)), 'an off-frame pass target gets a chevron on the edge');
    // where he is drawn is where the teleport's smoothing says, and the way he faces picks the picture
    st = stage(2); const r = st.mine[1]; r.drawFrom = { t:0.2, T:0.2, x:r.x + 1.5, y:r.y, spin:0 }; D.render(STEP);
    const sm = B.BV.men.get(r), [dx, dy] = T.contact.drawPos(r);
    ok(near(sm.wx, dx, 0.2) && Math.abs(sm.wx - r.x) > 0.3 && near(sm.wy, dy, 1e-9), `a man mid-teleport is drawn at his smoothed place (${sm.wx.toFixed(2)} v ${r.x.toFixed(2)})`);
    r.drawFrom = null;
    st = stage(2); const v = st.opp[2];
    for (const [fx2, fy2, view] of [[1, 0, 0], [-1, 0, 1], [0, 1, 2]]) {
      v.fx = fx2; v.fy = fy2; for (let i = 0; i < 2; i++) D.render(STEP); log = frameLog();
      const sv = B.BV.men.get(v), i = placeOf(log, v), e = log.slice(i).find(x => x.k === 'drawImage');
      ok(sv.view === view && e && Object.keys(sv.cells).some(key => Math.floor((+key % 100)/10) === view && sv.cells[key] === e.a[0]), `facing (${fx2}, ${fy2}) draws view ${view}'s own sprite`);
    }
    v.fy = -1; v.fx = 0; for (let i = 0; i < 2; i++) D.render(STEP); log = frameLog();
    ok(B.BV.men.get(v).face === -1 && log.slice(placeOf(log, v)).some(e => e.k === 'scale' && e.a[0] === -1 && e.a[1] === 1), 'a side view facing the other way is flipped');
    // a man on the floor is a sprite too, or a pile-up blows the frame's budget
    st = stage(2); const dn = st.opp[1]; dn.down = 2; for (let i = 0; i < 4; i++) D.render(STEP); log = frameLog();
    const di = placeOf(log, dn), de = log.slice(di).find(e => e.k === 'drawImage'), dk = atOf(dn).k, sh = B.BV_CELL.lying;
    ok(di >= 0 && de && near(de.a[3], sh.w*dk, 1e-6) && near(de.a[4], sh.h*dk, 1e-6) && B.BV.men.get(dn).frame === 0, 'a man on the floor is drawn from his lying sprite');
    D.setMode('menu');
  }

  // the heads fit the cells, a low-contrast trim doesn't lose one, and looks reach the paint
  {
    const st = stage(2), p = st.mine[2], L = B.lookOf(p), keep = { style:L.style, skin:L.skin, hair:L.hair }, trim0 = T.M.kit[0].trim;
    let top = 0;
    for (let style = 0; style < 6; style++) for (const view of [0, 1, 2]) {
      L.style = style; const R = recorder(); B.paintMan(R.g, p, { k:64, view, face:1, frame:0, arms:'run' });
      for (const e of R.log) if (e.k === 'arc') top = Math.min(top, (e.a[1] - e.a[2])/64);
    }
    ok(top >= -B.BV_CELL.stand.oy && top < -1.9, `the tallest head fits the sprite cell (${top.toFixed(3)}T against ${B.BV_CELL.stand.oy}T)`);
    L.style = 3; T.M.kit[0].trim = '#0f5a32';
    for (const view of [0, 1]) {
      const R = recorder(); B.paintMan(R.g, p, { k:64, view, face:1, frame:0, arms:'run' });
      const head = R.log.slice(R.log.findLastIndex(e => e.k === 'fillStyle' && e.a[0] === B.LOOK_SKIN[L.skin]));
      ok(!head.some(e => (e.k === 'fillStyle' || e.k === 'strokeStyle') && e.a[0] === '#0f5a32') && head.some(e => e.k === 'fillStyle' && e.a[0] === '#f1eee4'), `view ${view}: a grass-green trim's scrum cap goes to chalk`);
      const capAt = head.findIndex(e => e.k === 'fillStyle' && e.a[0] === '#f1eee4'), fillAt = head.findIndex((e, i) => i > capAt && e.k === 'fill');
      ok(fillAt > 0 && head[fillAt + 1] && head[fillAt + 1].k === 'stroke', `view ${view}: and the cap keeps the head's outline`);
    }
    T.M.kit[0].trim = '#d0102a'; { const R = recorder(); B.paintMan(R.g, p, { k:64, view:0, face:1, frame:0, arms:'run' }); ok(R.log.some(e => e.k === 'fillStyle' && e.a[0] === '#d0102a'), 'a trim that shows keeps its colour'); }
    T.M.kit[0].trim = trim0; Object.assign(L, keep);
    for (const q of st.m.players) {
      const Lq = B.lookOf(q), R = recorder(); B.paintMan(R.g, q, { k:64, view:1, face:1, frame:0, arms:'run' });
      ok(R.log.some(e => e.k === 'fillStyle' && e.a[0] === B.LOOK_SKIN[Lq.skin]), `shirt ${q.n}: painted in his own skin`);
      if (Lq.style !== 3) ok(R.log.some(e => e.k === 'fillStyle' && e.a[0] === B.LOOK_HAIR[Lq.hair]), `shirt ${q.n}: and his own hair`);
    }
    D.setMode('menu');
  }

  // the sprites go with their match
  {
    stage(2); const cells = B.BV.cells.slice();
    ok(cells.length > 0 && cells.every(c => c.width > 0), 'a behind match holds sprites');
    S.cam = 0; T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'off' }); D.setMode('match'); D.render(STEP);
    ok(B.BV.cells.length === 0 && cells.every(c => c.width === 0) && B.BV.M === null, 'a new Top match releases them and the old match');
    D.setMode('menu');
  }

  // the channel marks are on the pitch, not on the lens: they sit on the 5m grid from x=10 wherever the camera goes
  for (const [team, o, xs] of [[0, {}, [51.3, 53.7, 57.2]], [1, { humans:[false, true] }, [68.7, 66.1]]]) {
    const st = stage(2, { ...o, team }), d = dirOf(team);
    for (const x of xs) {
      st.c.x = x; st.m.ball.x = x; for (let i = 0; i < 300; i++) D.render(STEP);
      const log = frameLog(), cm = camNow(), starts = log.filter(e => e.k === 'moveTo');
      let want = 0, hit = 0;
      for (let gx = 15; gx <= 105; gx += 5) { const z = (gx - cm.Cx)*d; if (z < 8 || z >= 29) continue; const q = prNow(gx, 5); want++; if (starts.some(e => near(e.a[0], q.sx, 1e-3) && near(e.a[1], q.sy, 1e-3))) hit++; }
      ok(want >= 3 && hit === want, `team ${team}, ball at ${x}: the 5m channel's marks start on the grid (${hit} of ${want})`);
    }
    D.setMode('menu');
  }

  // sprites are a function of the man, and a throw leaves the shared painter state as it was
  fresh(2); const pm = T.M.players[0], before = B.paintState();
  const boom = new Proxy({}, { get: () => () => { throw new Error('boom'); }, set: () => true });
  let threw = false;
  try { B.paintMan(boom, pm, { k:30, view:0, face:1, frame:0, arms:'run' }); } catch (e) { threw = true; }
  const after = B.paintState();
  ok(threw && after.ctx === before.ctx && after.SKIN === before.SKIN && after.HAIR === before.HAIR, 'a throw inside paintMan restores ctx, SKIN and HAIR');
  const same = (x, y) => x.ctx === y.ctx && x.SKIN === y.SKIN && x.HAIR === y.HAIR, quiet = recorder();
  B.paintMan(quiet.g, pm, { k:30, view:0, face:1, frame:0, arms:'run' });
  ok(quiet.log.length > 20 && same(B.paintState(), before), 'so does a normal paint, on a canvas of its own');
  fresh(2); inPlay(); const baked0 = B.BV.baked, st0 = B.paintState(); D.render(STEP);
  ok(B.BV.baked > baked0 && same(B.paintState(), st0), 'and a frame that bakes sprites');
  S.cam = 0;
}

/* ---------- the camera ---------- */
{
  // the presets' arithmetic at 844x390
  const want = { 1:[25.66, 41.6], 2:[22.16, 4.6], 3:[19.5, -27.3] };
  for (const c of [1, 2, 3]) { D.view(844, 390); fresh(c); D.render(STEP); const cm = B.BV.cam, k = cm.F/cm.back; ok(near(k, want[c][0], 0.05) && near(cm.hz, want[c][1], 0.1), `cam ${c}: k ${k.toFixed(2)}, horizon ${cm.hz.toFixed(1)}`); }
  // follow: capped speed, a hard cut on a long jump, clamps, reset on a flip
  fresh(2); let m = inPlay(), c = m.players[3]; m.ball.state = 'held'; m.ball.carrier = c; T.sides.setCtrl(0, c);
  for (const p of m.players) { p.x = 60; p.y = 35; }
  D.render(STEP); let cm = B.BV.cam, x0 = cm.Cx;
  c.x = 80; m.ball.x = 80; D.render(STEP); ok(Math.abs(cm.Cx - x0) <= 14*STEP + 1e-9, `a 20m move pans at the capped speed (${(cm.Cx - x0).toFixed(3)}m)`);
  x0 = cm.Cx; c.x = 115; m.ball.x = 115; D.render(STEP); ok(near(cm.Cx, 115 - cm.back, 1e-9), `a move over 25m is a cut (${cm.Cx})`);
  c.y = 0; m.ball.y = 0; for (let i = 0; i < 400; i++) D.render(STEP); ok(cm.Cy >= 6 && near(cm.Cy, 35*0.25, 1.01), `lateral settles at the eased target, inside its dead band (${cm.Cy.toFixed(2)})`);
  const y0 = cm.Cy; c.y += 0.5; for (let i = 0; i < 60; i++) D.render(STEP); ok(cm.Cy === y0, 'a small steer inside the dead band leaves the camera alone');
  fresh(2, { humans:[false, true] }); D.render(STEP); cm = B.BV.cam; ok(cm.u.x === -1 && cm.r.y === -1, 'the away side looks the other way');
  ok(cm.Cx >= -24 && cm.Cx <= 144, 'and stays inside the camera\'s range');
  // the flip back from Top snaps rather than glides
  fresh(2); m = inPlay(); c = m.players[3]; c.x = 40; m.ball.state = 'held'; m.ball.carrier = c; m.ball.x = 40; T.sides.setCtrl(0, c); D.render(STEP); D.render(STEP);
  S.cam = 0; c.x = 60; m.ball.x = 60; for (let i = 0; i < 5; i++) D.render(STEP); S.cam = 2; D.render(STEP); cm = B.BV.cam; ok(near(cm.Cx, 60 - cm.back, 1e-9), 'coming back from Top is a cut, not a pan');
  // the depth anchor: the rearmost of the ring man, the ball and where an opposition kick comes down
  const settle = () => { for (let i = 0; i < 400; i++) D.render(STEP); return B.BV.cam.Cx + B.BV.cam.back; };
  let st = stage(2); Object.assign(st.m.ball, { state:'loose', carrier:null, x:st.c.x + 10, y:st.c.y }); ok(near(settle(), st.c.x, 0.05), 'the ring man behind the ball holds the depth');
  st = stage(2); Object.assign(st.m.ball, { state:'loose', carrier:null, x:st.c.x - 10, y:st.c.y }); ok(near(settle(), st.c.x - 10, 0.05), 'the ball behind the ring man holds the depth');
  st = stage(2); Object.assign(st.m.ball, { state:'air', carrier:null, x:st.c.x, y:st.c.y, z:4, f:{ kind:'kick', team:1, x1:st.c.x - 15, y1:st.c.y } }); ok(near(settle(), st.c.x - 15, 0.05), 'an opposition kick\'s landing point is kept in frame');
  st = stage(2); Object.assign(st.m.ball, { state:'air', carrier:null, x:st.c.x, y:st.c.y, z:4, f:{ kind:'kick', team:0, x1:st.c.x - 15, y1:st.c.y } }); ok(near(settle(), st.c.x, 0.05), 'our own kick is not');
  // the clamps, at the ends of each range: High is the preset whose camera reaches them
  const pin = (o, x, y) => { const s0 = stage(3, o); s0.c.x = x; s0.c.y = y; s0.m.ball.x = x; s0.m.ball.y = y; D.render(STEP); return B.BV.cam; };
  ok(pin({}, 0, 35).Cx === -24, `Cx stops at -24 (${B.BV.cam.Cx})`);
  ok(pin({ team:1, humans:[false, true] }, 120, 35).Cx === 144, `Cx stops at 144 (${B.BV.cam.Cx})`);
  ok(pin({}, 60, -10).Cy === 6, `Cy stops at 6 (${B.BV.cam.Cy})`);
  ok(pin({}, 60, 80).Cy === 64, `Cy stops at 64 (${B.BV.cam.Cy})`);
  // the stride is the frame drawManBehind really uses: about six changes a second at 5 m/s however the speed wobbles, and a diagonal still strides
  const strideRun = (vx, vy, wobble = 0) => {
    const s0 = stage(2), r = s0.mine[1]; s0.m.rt = 100; D.render(STEP); let changes = 0, last = null, seen = new Set();
    for (let i = 0; i < 60; i++) { const w = 1 + wobble*Math.sin(i*2.1); r.vx = vx*w; r.vy = vy*w; r.x += vx*STEP; r.y += vy*STEP; D.render(STEP); const f = B.BV.men.get(r).frame; seen.add(f); if (last != null && f !== last) changes++; last = f; }
    return { changes, seen, s0, r };
  };
  const run = strideRun(5, 0); ok(run.changes >= 4 && run.changes <= 8 && run.seen.size === 4, `5 m/s is ${run.changes} frame changes a second, through all four frames`);
  const wob = strideRun(5, 0, 0.2); ok(wob.changes >= 4 && wob.changes <= 8, `and it doesn't flicker when his speed wobbles (${wob.changes})`);
  const diag = strideRun(3.54, -3.54); ok(diag.changes >= 4 && diag.changes <= 8, `x up and y down at once still strides (${diag.changes})`);
  const slow = strideRun(0.3, 0); ok(slow.changes === 0 && [...slow.seen].join() === '0', 'under 0.6 m/s he stands on frame 0');
  S.cam = 0;
}

/* ---------- framing, on the seeded bot ---------- */
{
  D.view(844, 390);
  let ringIn = 0, ringN = 0, passIn = 0, passN = 0;
  const on = (q, cam) => { const s = T.kick.pr(cam, q.x, q.y, 0); return !!s && s.sx >= 0 && s.sx <= 844 && s.sy >= 0 && s.sy <= 390; };
  for (const seed of [41, 42, 43, 44]) {
    reseed(seed); fresh(2);
    for (let n = 0; n < 5400; n++) {
      drive(); T.update(STEP); D.render(STEP);
      const m = T.M, cam = B.BV.cam, ctrl = T.sides.ctrlOf(0);
      if (m.phase !== 'play' || m.cut || !ctrl) continue;
      ringN++; if (on(ctrl, cam)) ringIn++;
      if (m.ball.state === 'held' && m.ball.carrier === ctrl && !ctrl.bind) { const to = T.contact.shownPass(ctrl).to; if (to) { passN++; if (on(to, cam)) passIn++; } }
    }
    D.setMode('menu');
  }
  const ringPct = 100*ringIn/ringN, passPct = 100*passIn/passN;
  console.log(`  framing at Mid, 844x390: ring man ${ringPct.toFixed(1)}% of ${ringN} frames, pass target ${passPct.toFixed(1)}% of ${passN}`);
  ok(ringPct >= 95, `ring man on screen at least 95% (${ringPct.toFixed(1)}%)`);
  ok(passPct >= 85, `pass target on screen at least 85% (${passPct.toFixed(1)}%)`);
  S.cam = 0;
}

/* ---------- looks ---------- */
{
  const look = (a, b, t, n) => { T.newMatch(a, b, { halfLen:240, diff:1, headless:true, duels:'off' }); return B.lookOf(T.M.players.find(p => p.team === t && p.n === n)); };
  const L1 = JSON.stringify(look(0, 1, 0, 4));
  T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'off' });
  const r2 = rndCalls();
  for (const p of T.M.players) B.lookOf(p);
  ok(rndCalls() === r2, 'looks draw no random number');
  const keys = Object.keys(T.M.players[0]).join();
  ok(!/look|skin|hair|style/.test(keys), 'no new field on the players');
  ok(JSON.stringify(look(0, 1, 0, 4)) === L1, 'the same team and shirt look the same');
  ok(JSON.stringify(look(0, 2, 0, 4)) === L1, 'whoever they play');
  // the same team looks the same even when newMatch rewrites its id for one match
  const eng = T.teams.NATIONS[0], engL = JSON.stringify((T.newMatch(1, 0, { halfLen:240, diff:1, headless:true, duels:'off' }), B.lookOf(T.M.players.find(p => p.team === 1 && p.n === 4))));
  T.newMatch(T.teams.cleanTeam({ name:'Enfield', id:eng.id, key:'myabc', kit:'#1c1c1c', trim:'#ffffff' }, 0), 0, { halfLen:240, diff:1, headless:true, duels:'off' });
  ok(T.M.nat[1].id !== eng.id && JSON.stringify(B.lookOf(T.M.players.find(p => p.team === 1 && p.n === 4))) === engL, `a clashing id leaves the team's looks alone (${T.M.nat[1].id})`);
  // every shipped team has a real spread, by construction
  const all = T.teams.ALL_TEAMS;
  ok(all.length >= 45, `every team is checked (${all.length})`);
  for (let a = 0; a < all.length; a++) {
    T.newMatch(all[a], all[(a + 1) % all.length], { halfLen:240, diff:1, headless:true, duels:'off' });
    const L = T.M.players.filter(p => p.team === 0).map(B.lookOf), spread = k => Math.max(...L.map(l => l[k])) - Math.min(...L.map(l => l[k])), kinds = k => new Set(L.map(l => l[k])).size, id = T.M.nat[0].id;
    ok(L.every(l => l.h >= 1.62 && l.h <= 2.02 && l.b >= 0.88 && l.b <= 1.16 && [l.skin, l.hair, l.style].every(v => Number.isInteger(v) && v >= 0 && v <= 5)), `${id}: every look in range`);
    ok(spread('h') >= 0.2 && spread('b') >= 0.14, `${id}: height and build spread (${spread('h').toFixed(2)}, ${spread('b').toFixed(2)})`);
    ok(kinds('style') >= 5, `${id}: head styles spread (${kinds('style')})`);
    ok(kinds('skin') === 6 && kinds('hair') === 6, `${id}: skin and hair spread (${kinds('skin')}, ${kinds('hair')})`);
  }
  const clean = B.cleanLook({ h:9, b:0.1, skin:9, hair:-3, style:2.5, extra:1 });
  ok(clean.h === 2.02 && clean.b === 0.88 && clean.skin === 5 && clean.hair === 0 && !('style' in clean) && !('extra' in clean), `cleanLook clamps and drops (${JSON.stringify(clean)})`);
  ok(Object.keys(B.cleanLook(null)).length === 0 && Object.keys(B.cleanLook('x')).length === 0, 'cleanLook takes rubbish');
  const nat = T.teams.NATIONS[0];
  nat.squad = [{ n:5, look:{ h:1.7, style:3, skin:99 } }];
  T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'off' });
  const custom = B.lookOf(T.M.players.find(p => p.team === 0 && p.n === 5));
  ok(custom.h === 1.7 && custom.style === 3 && custom.skin === 5 && Number.isFinite(custom.b), `a squad look overrides the seed, clamped (${JSON.stringify(custom)})`);
  delete nat.squad;
}

/* ---------- the setting ---------- */
{
  let saved = null;
  const keep = localStorage.setItem; localStorage.setItem = (k, v) => { saved = v; };
  S.cam = 3; T.teams.save(); localStorage.setItem = keep;
  ok(JSON.parse(saved).settings.cam === 3, 'the camera is saved');
  S.cam = 0; T.teams.restore(JSON.parse(saved)); ok(S.cam === 3, 'and comes back');
  for (const v of [4, -1, 1.5, '2', null, true, []]) { S.cam = 1; T.teams.restore({ settings:{ cam:v } }); ok(S.cam === 1, `a saved cam of ${JSON.stringify(v)} is ignored`); }
  S.cam = 0; T.teams.restore({ settings:{ diff:1 } }); ok(S.cam === 0, 'an old save opens on Top');
  const html = readGameSource(), home = html.slice(html.indexOf('id="s-home"'), html.indexOf('id="s-teams"'));
  ok(/<div class="set more" id="set-cam" hidden><span class="lbl">Camera<\/span><div class="seg" data-key="cam"><button>Top<\/button><button>Low<\/button><button>Mid<\/button><button>High<\/button>/.test(home), 'More Settings has the Camera row, hidden until asked for');
  const pauseCard = html.slice(html.indexOf('id="m-pause"'), html.indexOf('id="pz-quit"'));
  ok(/<div class="set" id="pz-cam" hidden><span class="lbl">Camera<\/span><div class="seg" data-key="cam">/.test(pauseCard), 'the pause card has one too');
  ok(/max-height:420px\)\{[^@]*#set-cam\{grid-column:1\/-1\}/.test(html), 'on a small phone the home Camera row takes the whole width, so its four buttons stay 44px');
  // More Settings opens both rows together
  $('set-cam').hidden = $('set-more').hidden = true; $('b-more').setAttribute = () => {}; $('b-more').click();
  ok($('set-cam').hidden === false && $('set-more').hidden === false, 'More Settings shows Camera with Half Length'); $('b-more').click();
  ok($('set-cam').hidden === true, 'and Fewer Settings hides it');
  // the generic row handler sets and saves it
  const segs = document.querySelectorAll('.seg[data-key]').filter(s => s.dataset.key === 'cam');
  ok(segs.length === 2, 'two Camera rows are wired');
  S.cam = 0; segs[0].children[1].click(); ok(S.cam === 1, 'pressing Low sets cam 1'); segs[1].children[0].click(); ok(S.cam === 0, 'pressing Top on the pause card sets cam 0');
  // the pause row: one player only, not Practice or Two Player
  fresh(2); D.pause(); ok($('pz-cam').hidden === false, 'one player: Camera on the pause card'); D.resume();
  T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'off', humans:[true, true], levels:[1, 1] }); D.setMode('match'); D.setTwo(true); D.pause(); ok($('pz-cam').hidden === true, 'Two Player: hidden'); D.resume(); D.setTwo(false);
  S.cam = 0; T.practice.start('pass'); D.renderHintSwitches(); ok($('pz-cam').hidden === true, 'Practice: hidden'); T.practice.leave();
  // a card already up redraws when the camera changes under it: its keys have moved
  for (const [cur, topKeys, behindKeys] of [['step', />W<.*>S</, />A<.*>D</], ['dummy', />A</, />S</]]) {
    const card = () => { D.updateHud(); return $('hc0-b').innerHTML; };
    fresh(0); inPlay(); D.setDev('kb'); const H = D.hintOpen()[0]; H.cur = cur; H.until = T.M.dclock + 3;
    ok(topKeys.test(card()), `${cur} on Top shows its keys`);
    D.pause(); S.cam = 2; D.resume(); ok(behindKeys.test(card()), `${cur}: Top to Mid redraws the keys (${$('hc0-b').innerHTML.replace(/<[^k][^>]*>/g, '').slice(0, 60)})`);
    D.pause(); S.cam = 0; D.resume(); ok(topKeys.test(card()), `${cur}: Mid to Top does too`);
    D.setDev('touch'); D.setMode('menu');
  }
  // wording no longer assumes a side of the screen
  ok(!/right-hand/.test(html) && !/up or down to pick a side/.test(html), 'the help and drill wording is neutral');
  S.cam = 0;
}

/* ---------- the wiring, in a fresh page ---------- */
// a real boot with a save already in storage, and the real frame loop: the canvas cap lives in resize and frame, the saved camera in start
{
  const harness = new URL('./harness.mjs', import.meta.url).href;
  const script = `
    Object.defineProperty(globalThis, 'localStorage', { configurable:true, get:() => ({ getItem:() => JSON.stringify({ settings:{ cam:2 } }), setItem() {} }), set() {} });
    let loop = null; Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable:true, get:() => f => { loop = f; }, set() {} });
    const { T } = await import(${JSON.stringify(harness)});
    const D = T.debug, S = D.settings(), out = { booted:S.cam };
    const dpr = () => { loop(performance.now() + 16); return document.getElementById('cv').width/innerWidth; };
    const match = () => { T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'off' }); D.setMode('match'); T.M.phase = 'play'; T.M.set = null; T.M.cut = null; };
    S.cam = 0; match(); out.top = dpr();
    S.cam = 2; out.behind = dpr();
    S.cam = 0; out.back = dpr();
    console.log(JSON.stringify(out));
  `;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], { env:{ ...process.env, SEED:'11' }, encoding:'utf8' });
  let w = {}; try { w = JSON.parse(r.stdout.trim().split('\n').pop()); } catch (e) { console.log(r.stdout, r.stderr); }
  ok(w.booted === 2, `a saved Camera survives a reload (${w.booted})`);
  ok(w.top === 2, `the frame loop keeps Top at 2x (${w.top})`);
  ok(w.behind === 1.5, `and caps a behind view at 1.5x (${w.behind})`);
  ok(w.back === 2, `and Top gets its 2x back (${w.back})`);
}

{ // a career match keeps your player's ring, star and own kicking in the behind views
  fresh(2); inPlay();
  const m = T.M, lineTos = () => { let n = 0; globalThis.__ctxSpy = k => { if (k === 'lineTo') n++; }; try { D.render(STEP); } finally { globalThis.__ctxSpy = null; } return n; };
  for (let i = 0; i < 8; i++) D.render(STEP);
  const you = m.players.find(p => p.team === 0), plain = lineTos();
  m.career = true; m.careerP = you; m.careerNat = { ...m.nat[0], kicking:5 };
  const marked = lineTos();
  ok(marked - plain === 10, `the career star is drawn in Behind (${marked - plain} extra points)`);
  const log = frameLog();
  ok(log.length > 0 && !log.some(e => (e.args || e.a || []).some(v => typeof v === 'number' && !Number.isFinite(v))), 'and it stays finite');
  m.careerP = null;
  ok(lineTos() === plain, 'no career player, no star');
  m.career = false; delete m.careerNat;
}

D.setMode('menu');
console.log(`Camera: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
