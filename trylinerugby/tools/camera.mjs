// The behind views (Low, Mid, High): the gate, the stick's turn, engine parity with Top, drawing safety, framing, looks and the saved setting.
process.env.SEED ??= '11';
const { T, inputs, bot, reseed, rndCalls, camStart, segOf } = await import('./harness.mjs');
import { readGameSource } from './source.mjs';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { shellAssets } from './build.mjs';
const D = T.debug, B = T.behind, S = D.settings(), $ = id => document.getElementById(id), STEP = T.STEP;
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
// TOP_HASH=1 [GAME=<another build's index.html>] node tools/camera.mjs prints the Top view's canvas output, hashed call by call (every
// name and argument) over seeded scenarios, and stops. Run it here and on a snapshot of the build before: every line must match, which
// proves a change to the behind views left Top exactly as it was.
if (process.env.TOP_HASH) { topHash(); process.exit(0); }
function topHash() {
  const X = T.teams, C = T.career, P = T.careerPro, L = T.locker.state(), keep = { ball:L.ball, boots:L.boots };
  S.cam = 0;
  const fnv = (h, s) => { for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const arg = v => (typeof v === 'number' ? (Object.is(v, -0) ? '-0' : String(v)) : typeof v === 'string' ? v : v && typeof v === 'object' ? (v.width != null ? 'canvas' + v.width + 'x' + v.height : 'obj') : String(v));
  const run = (name, setup, frames, step) => {
    let h = 2166136261, calls = 0;
    globalThis.__ctxSpy = (k, a) => { calls++; h = fnv(h, k + '(' + a.map(arg).join(',') + ')'); };
    try { setup(); for (let i = 0; i < frames; i++) { step(); T.update(STEP); D.render(STEP); D.updateHud(); } } finally { globalThis.__ctxSpy = null; }
    console.log(name.padEnd(44), h.toString(36).padStart(8), String(calls).padStart(9), 'calls');
    if (T.M && !T.M.demo) D.exitMatch();
    D.setMode('menu');
  };
  const quick = o => () => { T.newMatch(0, 1, { halfLen:240, diff:1, ...o }); D.setMode('match'); D.setTwo(false); };
  const played = step => () => { if (T.M.phase === 'break') { $('br-go').click(); return; } step(); };
  Object.assign(S, { played:99, diff:1, kids:false, half:0 });
  D.view(844, 390); reseed(11); run('844x390, close-ups off', quick({ headless:true, duels:'off' }), 600, () => bot(0));
  reseed(11); run('844x390, close-ups live', quick({ duels:'live' }), 3000, () => bot(0));
  D.view(667, 375); reseed(11); run('667x375, close-ups off', quick({ headless:true, duels:'off' }), 600, () => bot(0));
  D.view(844, 390);
  reseed(12); run('star sides, Rainbow ball and boots, On Fire', () => { L.ball = 'rainbow'; L.boots = 'rainbow'; T.newMatch(X.NATIONS.find(n => n.id === 'RSA'), X.NATIONS.find(n => n.id === 'NZL'), { halfLen:240, diff:1, duels:'live', arcade:true }); D.setMode('match'); D.setTwo(false); }, 3000, () => { bot(0); if (T.M.rt > 5 && T.M.rt < 12) T.M.fire[0].t = 5; });
  reseed(13); run('Gold ball and Neon boots', () => { L.ball = 'gold'; L.boots = 'neon'; quick({ headless:true, duels:'off', arcade:true })(); }, 1500, () => bot(0));
  reseed(14); run('a career in Pro Mode, calling for the ball', () => { L.boots = 'neon'; C.set(C.create({ pos:'B', num:5, club:X.CLUBS[1], proMode:true, look:{ skin:4, hair:5, style:9, b:1.12 } })); C.play(); }, 3000, played(() => { bot(0); if (P.canCall() && Math.random() < 0.02) inputs[0].aPressed = true; }));
  C.set(null);
  reseed(15); run('a women\'s career on Kids, Whole Team', () => { S.kids = true; S.diff = 0; C.set(C.create({ pos:'F', num:2, club:X.CLUBS[3], cat:'women', look:{ style:10 } })); C.play(); }, 3000, played(() => bot(0)));
  C.set(null); S.kids = false; S.diff = 1;
  reseed(16); run('AI v AI', () => { T.newMatch(2, 3, { halfLen:240, diff:1, humans:[false, false], headless:true, duels:'off' }); D.setMode('match'); }, 1500, () => {});
  Object.assign(L, keep);
}
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const hexOf = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
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
  D.render(STEP); ok(B.BV.on === true && !B.behindOn() && T.drills.DV.cam && T.drills.DV.cam.id === 'pass', 'a Practice frame draws through the Training Ground view, not the match camera');
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
  // the real boot: a new game and a save with no cam open on Mid, a save holding a cam keeps it, a bad one falls back to Mid
  ok(camStart === 2, `a new game opens on Mid (cam ${camStart})`);
  const bootCam = save => { const r = spawnSync(process.execPath, ['--input-type=module', '-e', `const { camStart } = await import(${JSON.stringify(new URL('./harness.mjs', import.meta.url).href)}); console.log(camStart);`], { env:{ ...process.env, SEED:'11', SAVE:JSON.stringify(save) }, encoding:'utf8' }); return r.stdout.trim(); };
  ok(bootCam({ settings:{ diff:1 } }) === '2', 'a save with no cam opens on Mid');
  for (const c of [1, 2, 3]) ok(bootCam({ settings:{ cam:c } }) === String(c), `a save holding cam ${c} keeps it`);
  ok(bootCam({ settings:{ cam:0 } }) === '2', 'a save holding the last build\'s default Top, chosen by nobody, opens on Mid');
  ok(bootCam({ settings:{ cam:0, camPick:true } }) === '0', 'a Top chosen on the camera button stays Top');
  { // the button sets the mark, and the mark and the choice come back
    let kept = null; const was = localStorage.setItem; localStorage.setItem = (k, v) => { kept = v; };
    S.camPick = false; S.cam = 3;
    segOf('cam', 0).children[0].click(); ok(S.cam === 0 && S.camPick === true && JSON.parse(kept).settings.camPick === true, 'pressing Top on the Settings camera row marks it as chosen, and saves'); S.cam = 2; S.camPick = false; T.teams.restore(JSON.parse(kept)); ok(S.cam === 0 && S.camPick === true, 'and it comes back'); S.cam = 2; S.camPick = false;
    localStorage.setItem = was;
  }
  ok(bootCam({ settings:{ cam:9 } }) === '2', 'a save with a broken cam opens on Mid');
  const html = readGameSource(), home = html.slice(html.indexOf('id="s-home"'), html.indexOf('id="s-teams"'));
  const pauseCard = html.slice(html.indexOf('id="m-pause"'), html.indexOf('id="m-gate"'));
  // the camera row: main's place for it (Settings, and the pause card), where PR #14 had icon buttons by the logo and on the pause card
  ok(/<div class="hs-panel hp-settings settings" id="hp-settings"[^>]*>[\s\S]*<div class="set set-cam" id="set-cam"><span class="lbl">Camera<\/span><div class="seg" data-key="cam"><button>Top<\/button><button>Low<\/button><button>Mid<\/button><button>High<\/button><\/div><\/div>/.test(home), 'home: Camera is a row in Settings, Top | Low | Mid | High');
  ok(/<div class="set set-half"><span class="lbl">Half Length<\/span><div class="seg" data-key="half">/.test(home) && !/id="b-cam"|id="b-half"|ico-btn/.test(html), 'and Half Length a row there too: no icon buttons');
  ok(/<div class="set" id="pz-cam" hidden><span class="lbl">Camera<\/span><div class="seg" data-key="cam"><button>Top<\/button><button>Low<\/button><button>Mid<\/button><button>High<\/button><\/div><\/div>/.test(pauseCard) && /<p class="pz-cam-note" id="pz-cam-note" hidden>The Camera Changes After This Close-Up<\/p>\s*<button class="btn warn" id="pz-quit">/.test(pauseCard), 'the pause card has the Camera row, and the close-up note over Quit Match');
  ok(!/data-key="half"|Half Length/.test(pauseCard), 'and no Half Length: the home\'s only');
  ok(home.indexOf('id="set-cam"') > 0 && !/\p{Extended_Pictographic}/u.test(home.slice(home.indexOf('id="set-cam"'), home.indexOf('</section>'))), 'no emoji in the row');   // to the foot of Settings: Grown-Ups is no longer after it (the Settings fit)
  ok(!/id="b-more"|id="set-more"|more-btn|More Settings|Fewer Settings/.test(html), 'More Settings is gone');
  // pressing a camera: the choice, the mark and the save
  { let kept = null; const was = localStorage.setItem; localStorage.setItem = (k, v) => { kept = v; };
    S.cam = 2; S.camPick = false; T.teams.renderHome(); ok(S.camPick === false, 'drawing the row chooses nothing');
    const seen = []; for (const i of [3, 0, 1, 2]) { segOf('cam', 0).children[i].click(); seen.push(S.cam + '' + JSON.parse(kept).settings.cam); }
    ok(seen.join() === '33,00,11,22', `each button picks its camera, and saves (${seen})`);
    ok(S.camPick === true && JSON.parse(kept).settings.camPick === true, 'with the mark set and saved');
    // the half length: in Settings, used by the next match
    segOf('half', 0).children[1].click(); D.startMatch(T.teams.NATIONS[0], T.teams.NATIONS[1], false); ok(T.M.halfLen === 240, 'the next match plays the length chosen'); D.exitMatch(); S.half = 0;
    // paused in a match: the change takes effect in that match
    const m = fresh(2); inPlay(); for (let i = 0; i < 4; i++) D.render(STEP); const men = m.players[3];
    D.pause(); ok(m.paused && S.cam === 2, 'paused on Mid');
    ok(B.BV.cam.ch === 10, 'on Mid'); segOf('cam', 1).children[3].click(); D.render(STEP); ok(T.M === m && S.cam === 3 && B.BV.cam.ch === 13 && B.behindOn(), 'a press on the pause card moves that match to High there and then');
    segOf('cam', 1).children[0].click(); D.render(STEP); ok(T.M === m && S.cam === 0 && !B.behindOn() && B.stickTurn(0) === 0 && S.camPick === true, 'Top, and the stick with it');
    ok(m.players[3] === men && T.M.paused, 'and it is still the same match, still paused'); D.resume();
    S.cam = 2; S.camPick = false; localStorage.setItem = was;
  }
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
    const { T, camStart, segOf } = await import(${JSON.stringify(harness)});
    const D = T.debug, S = D.settings(), out = { booted:camStart };
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

/* ---------- the demo and the pause card in the real frame loop ---------- */
{
  const harness = new URL('./harness.mjs', import.meta.url).href;
  const script = `
    const mq = { matches:false, addEventListener() {}, addListener() {} };
    Object.defineProperty(globalThis, 'matchMedia', { configurable:true, get:() => () => mq, set() {} });
    let loop = null; Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable:true, get:() => f => { loop = f; }, set() {} });
    const { T, segOf } = await import(${JSON.stringify(harness)});
    const D = T.debug, S = D.settings(), out = {};
    let t = performance.now() + 100;
    const tick = n => { for (let i = 0; i < n; i++) { t += 1000/60; loop(t); } };
    const rts = n => { let draws = 0; for (let i = 0; i < n; i++) { const a = T.M.rt; tick(1); if (T.M.rt !== a) draws++; } return draws; };
    S.cam = 0; tick(2);
    out.dpr = document.getElementById('cv').width/innerWidth; out.demo = T.M.demo; out.on = T.behind.BV.on;
    out.demoDraws = rts(120); { const a = T.M.clock; tick(60); out.demoSim = +(T.M.clock - a).toFixed(2); }
    { const a = T.M.rt; tick(60); out.demoClock = +(T.M.rt - a).toFixed(2); }
    mq.matches = true; { const a = T.M.clock, b = T.M.rt; tick(60); out.coveredSim = T.M.clock - a; out.coveredDraws = T.M.rt - b; } mq.matches = false;
    const demoM = T.M; S.cam = 2; D.startMatch(T.teams.NATIONS[0], T.teams.NATIONS[1], false); const m = T.M; m.phase = 'play'; m.set = null; m.cut = null;
    out.real = !m.demo && m !== demoM; { const a = demoM.clock, b = demoM.rt; tick(30); out.oldDemoSim = demoM.clock - a; out.oldDemoDraws = demoM.rt - b; out.matchDraws = rts(30); }
    D.pause(); { const c = m.clock; out.pausedFirst = rts(25); out.pausedLater = rts(120); out.pausedSim = m.clock - c; }
    segOf('cam', 1).children[3].click(); out.camChange = rts(25); out.camSettled = rts(60); out.camNow = T.behind.BV.cam.ch; out.sameMatch = T.M === m;
    innerWidth = 667; tick(1); out.resizeDraws = rts(25); out.resizeSettled = rts(30); innerWidth = 844; tick(30);
    D.resume(); out.resumed = rts(30);
    D.exitMatch(); tick(2); out.backDemo = !!T.M.demo && T.M !== demoM; out.backOn = T.behind.BV.on;
    console.log(JSON.stringify(out));
  `;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], { env:{ ...process.env, SEED:'11' }, encoding:'utf8' });
  let w = {}; try { w = JSON.parse(r.stdout.trim().split('\n').pop()); } catch (e) { console.log(r.stdout, r.stderr); }
  ok(w.demo === true && w.on === true && w.dpr === 1.5, `the demo draws in the behind view at 1.5x, with Top saved (${w.dpr})`);
  ok(w.demoDraws >= 55 && w.demoDraws <= 65, `at about 30 a second on a 60Hz screen (${w.demoDraws} of 120)`);
  { const pace = T.clarity.MATCH_PACE.match; ok(w.demoSim > pace - 0.05 && w.demoSim < pace + 0.05, `the sim runs at the match's pace, as a match does (${w.demoSim}s in 1s, MATCH_PACE ${pace})`);
    ok(w.demoClock > pace - 0.05 && w.demoClock < pace + 0.05, `and so do its strides, for all the frames skipped (${w.demoClock}s in 1s)`); }
  ok(w.coveredSim === 0 && w.coveredDraws === 0, 'under Turn Your Phone Sideways it neither plays nor draws');
  ok(w.real && w.oldDemoSim === 0 && w.oldDemoDraws === 0, 'behind a real match the old demo neither plays nor draws');
  ok(w.matchDraws === 30, `the real match draws every frame (${w.matchDraws} of 30)`);
  ok(w.pausedFirst > 0 && w.pausedFirst <= 20 && w.pausedLater === 0 && w.pausedSim === 0, `behind the pause card the picture stands: ${w.pausedFirst} frames to settle, then none in 120`);
  ok(w.camChange > 0 && w.camChange <= 20 && w.camSettled === 0 && w.camNow === 13 && w.sameMatch, `a press of the camera there draws the new view (${w.camChange} frames), then rests, in the same match`);
  ok(w.resizeDraws > 0 && w.resizeDraws <= 20 && w.resizeSettled === 0, `a resize blanks the canvas, so it draws again (${w.resizeDraws}), then rests`);
  ok(w.resumed === 30, 'resumed, every frame draws');
  ok(w.backDemo && w.backOn, 'back on the menus a new demo draws');
  // art at boot in every case: a save on Top loads it for the demo
  const boot = `
    const asked = []; globalThis.Image = class {}; globalThis.fetch = async u => { asked.push(String(u)); throw new Error('offline'); };
    const { T, segOf } = await import(${JSON.stringify(harness)});
    await new Promise(res => setTimeout(res, 20));
    console.log(JSON.stringify({ asked:asked.filter(u => u.includes('players')), state:T.behind.ART.state }));
  `;
  const r2 = spawnSync(process.execPath, ['--input-type=module', '-e', boot], { env:{ ...process.env, SEED:'11', SAVE:JSON.stringify({ settings:{ cam:0, camPick:true } }) }, encoding:'utf8' });
  let b2 = {}; try { b2 = JSON.parse(r2.stdout.trim().split('\n').pop()); } catch (e) { console.log(r2.stdout, r2.stderr); }
  ok((b2.asked || []).length === 1 && b2.state === 'off', `a save on Top still loads the art at boot, and a failed load settles (${JSON.stringify(b2)})`);
}

{ // a career match keeps your player's star and own kicking in the behind views; the ring is who you control, and his own is gone (tools/clarity.mjs)
  fresh(2); inPlay();
  const m = T.M, lineTos = () => { let n = 0; globalThis.__ctxSpy = k => { if (k === 'lineTo') n++; }; try { D.render(STEP); } finally { globalThis.__ctxSpy = null; } return n; };
  for (let i = 0; i < 8; i++) D.render(STEP);
  const you = T.sides.ctrlOf(0), plain = lineTos();   // the ring's man: on the frame, so no edge arrow here
  m.career = true; m.careerP = you; m.careerNat = { ...m.nat[0], kicking:5 };
  const marked = lineTos();
  ok(marked - plain === 10, `the career star is drawn in Behind (${marked - plain} extra points)`);
  const log = frameLog();
  ok(log.length > 0 && !log.some(e => (e.args || e.a || []).some(v => typeof v === 'number' && !Number.isFinite(v))), 'and it stays finite');
  m.careerP = null;
  ok(lineTos() === plain, 'no career player, no star');
  m.career = false; delete m.careerNat;
}

/* ---------- main's marks, in a behind view (the career builder, 2026-11-09) ---------- */
// What Top draws for main's features (render-match.js, render-pitch.js) and the behind views did not: each star player's gold star
// (traitMarks), Pro Mode's call ring and No sign (proMark), and the Locker's boots on the art and on every code-drawn man (lockerBoots)
// and its ball in the carrier's marker and laces (lockerBall). On Fire, the sprint's streaks and the career star are checked above; the
// trait's call-out is a tag (drawTags), the Sprint and stamina meters are the page's own buttons, and the Kids aids draw nothing.
{
  const L = T.locker.state(), keep = { ball:L.ball, boots:L.boots }, starLog = log => log.filter(e => e.k === 'drawImage' && e.a[0] === B.BV.star);
  const starAt = p => { const at = atOf(p), Lp = B.lookOf(p), sc = Lp.h/1.8, kk = at.k, x = at.sx + 0.34*kk*Lp.b*sc, y = at.sy - (p.down > 0 ? 0.6 : 1.62)*kk*sc, h = Math.max(4, 0.3*kk)*B.BV_STAR.px/2/B.BV_STAR.r; return [x - h, y - h, 2*h, 2*h]; };
  const onFrame = p => { const q = atOf(p); return q && q.sx > 0 && q.sx < 844 && q.sy > 60 && q.sy < 390 && B.BV.men.get(p).z > T.kick.CAM.fadeZ + T.kick.CAM.fadeW; };
  // star players: a gold star on each one's shoulder, at his own depth, after him and under anyone nearer
  let st = stage(2, { arcade:true, a:T.teams.NATIONS.find(n => n.id === 'RSA'), b:T.teams.NATIONS.find(n => n.id === 'NZL') }), log = frameLog();
  const stars = st.m.players.filter(p => p.tr && onFrame(p)), drawn = starLog(log);
  ok(stars.length >= 2 && st.m.players.some(p => !p.tr && onFrame(p)), `star players and plain ones on the frame (${stars.length} stars)`);
  ok(drawn.length === stars.length && stars.every(p => drawn.some(e => e.a.slice(1).every((v, i) => near(v, starAt(p)[i], 1e-6)))), `each star player has his gold star on his shoulder, and no one else (${drawn.length} drawn)`);
  const byDepth = st.m.players.slice().sort((a, b) => B.BV.men.get(b).z - B.BV.men.get(a).z), at = p => log.findIndex(e => e.k === 'drawImage' && e.a[0] === B.BV.star && near(e.a[1], starAt(p)[0], 1e-6));
  ok(stars.every(p => { const i = at(p), j = byDepth.indexOf(p), next = byDepth.slice(j + 1).map(q => placeOf(log, q)).filter(n => n >= 0); return i > placeOf(log, p) && next.every(n => n > i); }), 'drawn after his own man, under every nearer man');
  const baked = B.BV.star; frameLog(); ok(B.BV.star === baked && starLog(frameLog()).length === stars.length, 'the star is baked once and drawn from its cell after that');
  st.m.career = true; st.m.careerP = stars[0]; log = frameLog();
  ok(starLog(log).length === stars.length - 1 && !starLog(log).some(e => near(e.a[1], starAt(stars[0])[0], 1e-6)), 'your career player has his own star instead');
  st.m.career = false; st.m.careerP = null;
  st = stage(2); st.mine[2].tr = { burst:true }; ok(!starLog(frameLog()).length, 'no star outside a match you play');
  // Pro Mode: the call's ring going out from your player on the grass, under the men; the No sign at the top of the carrier's stack
  const PRO = T.careerPro.PRO, tint = T.contact.SUPPORT.tint;
  st = stage(2); const m = st.m, you = st.mine[2], carrier = st.c;
  Object.assign(m, { arcade:true, career:true, careerPro:true, careerP:you, careerNat:{ ...m.nat[0] } }); T.sides.setCtrl(0, you);   // Pro Mode: the ring stays on him
  const callRing = (u, lg) => { const e = ringAt(lg, you.x, you.y, RING*(1.5 + 1.4*u)), i = lg.indexOf(e); return e && e.stroke === B.ringCol(0) && lg.slice(0, i).reverse().find(x => x.k === 'globalAlpha').a[0] === 1 - u ? i : -1; };
  m.proCue = { p:you, at:m.dclock }; log = frameLog();
  let ci = callRing(0, log);
  ok(ci >= 0, 'Pro Mode: a call puts its ring round him on the grass, in the ring colour');
  ok(ci >= 0 && m.players.every(p => placeOf(log, p) < 0 || placeOf(log, p) > ci), 'under every man, as the ring is');
  m.proCue.at = m.dclock - PRO.callT*0.5; ok(callRing(0.5, frameLog()) >= 0, 'halfway through, wider and half faded');
  m.proCue.at = m.dclock - PRO.callT - 0.01; log = frameLog(); ok(![0, 0.5, 0.99].some(u => ringAt(log, you.x, you.y, RING*(1.5 + 1.4*u))), 'and gone after it');
  m.proNo = { p:carrier, at:m.dclock }; log = frameLog();
  const q = atOf(carrier), R = Math.max(7, 0.4*q.k), S0 = B.bvStack(q.sy - (B.lookOf(carrier).h + 0.2)*q.k, { carry:true, no:R + 3, floor:Math.abs(q.sx - 422) < 130 ? 72 : 0 });
  const noAt = log.findIndex(e => e.k === 'arc' && near(e.a[0], q.sx, 1e-6) && near(e.a[1], S0.no, 1e-6) && near(e.a[2], R, 1e-6) && e.stroke === tint);
  const bubble = log.findIndex(e => e.k === 'moveTo' && near(e.a[0], q.sx - 5, 1e-6) && near(e.a[1], S0.carry - 5.5, 1e-6));   // the marker's tail
  ok(noAt > 0 && log.some(e => e.k === 'moveTo' && near(e.a[0], q.sx - R*0.7, 1e-6) && near(e.a[1], S0.no - R*0.7, 1e-6)), 'a call not answered: the No sign, a slashed circle over the carrier\'s head');
  ok(bubble > 0 && S0.no + R + 3 <= S0.carry - 17 - 5 && noAt > bubble, `over the ball's marker, never on it (${S0.no.toFixed(1)}, marker top ${(S0.carry - 22).toFixed(1)})`);
  m.proNo.at = m.dclock - PRO.noT - 0.01; ok(!frameLog().some(e => e.k === 'arc' && near(e.a[2], R, 1e-6) && e.stroke === tint), 'and gone after its time');
  m.careerPro = false; m.proCue = { p:you, at:m.dclock }; m.proNo = { p:carrier, at:m.dclock }; log = frameLog();
  ok(!ringAt(log, you.x, you.y, RING*1.5) && !log.some(e => e.k === 'arc' && e.stroke === tint), 'neither in a Whole Team career match');
  ok(B.bvStack(100, { pointer:true, carry:true, star:9 }).star === B.bvStack(100, { pointer:true, carry:true, star:9, no:0 }).star && B.bvStack(100, { carry:true }).no === undefined, 'with no No sign the stack is as it was');
  // the Locker: your side's boots on every code-drawn man of it, Rainbow's by shirt, his alone in a career
  const boots = (p, k = 64, view = 0) => { const R0 = recorder(); B.paintMan(R0.g, p, { k, view, face:1, frame:0, arms:'run' }); return R0.log.filter((e, i) => e.k === 'fillRect' && R0.log[i - 1] && R0.log[i - 1].k === 'fillStyle').map(e => R0.log[R0.log.indexOf(e) - 1].a[0]); };
  const side = () => { st = stage(2, { arcade:true }); return st; };
  const RB = T.locker.RAINBOW, rb = p => RB[p.n % RB.length];
  L.boots = 'neon'; side();
  ok(st.mine.every(p => boots(p).filter(c => c === '#7dff3d').length === 2) && st.opp.every(p => boots(p).filter(c => c === '#111').length === 2), 'the Locker\'s Neon Green boots on your side, black on theirs');
  L.boots = 'rainbow'; side();
  ok(st.mine.every(p => boots(p).filter(c => c === rb(p)).length === 2) && new Set(st.mine.map(p => boots(p)[0])).size > 1, 'Rainbow boots: a colour a shirt, as on Top');
  ok(boots(st.mine[1], 64, 2).filter(c => c === rb(st.mine[1])).length === 2, 'and in the side view too');
  st.m.career = true; st.m.careerP = st.mine[2];
  ok(boots(st.mine[2]).filter(c => c === rb(st.mine[2])).length === 2 && st.mine.filter(p => p !== st.mine[2]).every(p => boots(p).filter(c => c === '#111').length === 2), 'a career match: his boots only');
  st.m.career = false; st.m.careerP = null;
  L.boots = 'black'; side(); ok(st.mine.every(p => boots(p).filter(c => c === '#111').length === 2), 'the default Black: black boots, as before');
  // the ball: in his hands and loose (cutBall), and now the marker and the laces too
  L.ball = 'pink'; side(); log = frameLog();
  const cq = atOf(st.c), Lc = B.lookOf(st.c), bx = cq.sx + 0.18*cq.k, by = cq.sy - 1.15*cq.k*Lc.h/1.8, bi = log.findIndex(e => e.k === 'translate' && near(e.a[0], bx, 1e-6) && near(e.a[1], by, 1e-6));
  ok(bi > 0 && log.slice(bi, bi + 12).some(e => e.k === 'fill' && e.fill === '#ff7eb6' && e.stroke === '#6e1a44'), 'the Locker\'s Pink ball in his hands');
  ok(log.some(e => e.k === 'ellipse' && e.a[2] === 9 && e.a[3] === 5.6 && e.fill === '#ff7eb6' && e.stroke === '#6e1a44') && !log.some(e => e.k === 'ellipse' && e.a[2] === 9 && e.fill === '#fffdf6'), 'and in the ball\'s marker over his head');
  ok(log.some(e => e.k === 'lineTo' && e.stroke === '#6e1a44') && !log.some(e => e.stroke === '#3b2f22'), 'laced in its own line colour');
  Object.assign(st.m.ball, { state:'loose', carrier:null, x:st.c.x + 2, y:30, z:0, vx:0, vy:0 }); log = frameLog();
  const lq = prNow(st.c.x + 2, 30), li = log.findIndex(e => e.k === 'translate' && near(e.a[0], lq.sx, 1e-6) && near(e.a[1], lq.sy, 1e-6));
  ok(li > 0 && log.slice(li, li + 12).some(e => e.k === 'fill' && e.fill === '#ff7eb6'), 'and loose on the grass');
  L.ball = 'classic'; side(); log = frameLog();
  ok(log.some(e => e.k === 'ellipse' && e.a[2] === 9 && e.fill === '#fffdf6') && log.some(e => e.stroke === '#3b2f22') && !log.some(e => e.fill === '#ff7eb6'), 'the Classic ball as it was, marker and laces too');
  // the trait's call-out is a tag, drawn by drawTags at its own place in a behind view as on Top
  st = stage(2, { arcade:true, a:T.teams.NATIONS.find(n => n.id === 'RSA'), b:T.teams.NATIONS.find(n => n.id === 'NZL') });
  const caller = st.m.players.find(p => p.tr), id = Object.keys(caller.tr)[0];
  caller.trAt = null; T.traits.call(caller, id); log = frameLog();
  const callName = T.traits.TRAITS.find(t => t.id === id).name;
  ok(st.m.tags.length === 1 && log.some(e => e.k === 'fillText' && e.a[0] === callName.toUpperCase()), `a star's call-out shows, as its tag does on Top (${callName})`);
  Object.assign(L, keep); D.setMode('menu');
}

/* ---------- the career player's look (PR #14's player builder) ---------- */
{
  const X = T.teams, C = T.career, look = { g:1, skin:4, hair:4, style:10, b:0.92 };
  S.cam = 2; S.diff = 1; S.kids = false;
  C.set(C.create({ pos:'B', num:5, club:X.CLUBS[3], cat:'women', look })); C.play(); D.setMode('match');
  const me = T.M.careerP, L = B.lookOf(me), season = C.get().season;
  ok(me.n === 5 && L.g === 1 && L.skin === 4 && L.hair === 4 && L.style === 10 && L.b === 0.92 && Number.isFinite(L.h), `your player in the match has your look, at his shirt's height (${JSON.stringify(L)})`);
  ok(T.M.players.filter(p => p.team === 0 && p !== me).every(p => B.lookOf(p).g === 1), 'among a women\'s side');
  ok(!season.teams.some(t => 'squad' in t) && T.M.nat[0].squad.length === 1 && T.M.nat[0].name === season.teams[season.user].name, 'his look rides on his squad entry for the match only: the season\'s side is untouched');
  for (let i = 0; i < 8; i++) D.render(STEP);
  const R0 = recorder(); B.paintMan(R0.g, me, { k:64, view:1, face:1, frame:0, arms:'run' });
  ok(R0.log.some(e => e.k === 'fillStyle' && e.a[0] === B.LOOK_SKIN[4]) && R0.log.some(e => e.k === 'fillStyle' && e.a[0] === B.LOOK_HAIR[4]), 'the code-drawn man has his skin and hair');
  D.exitMatch(); C.set(null);
  C.set(C.create({ pos:'F', num:2, club:X.CLUBS[3] })); C.play();
  ok(JSON.stringify(C.get().look) === JSON.stringify(C.LOOK) && B.lookOf(T.M.careerP).style === 0 && B.lookOf(T.M.careerP).g === 0, 'a career with no look picked: the default, on a male body');
  D.exitMatch(); C.set(null);
  // Top draws nothing of it: the same seeded career match on Top with two looks is the same canvas, call for call (TOP_HASH has the rest)
  const topLog = lk => { S.cam = 0; reseed(21); C.set(C.create({ pos:'B', num:5, club:X.CLUBS[1], look:lk })); C.play(); D.setMode('match'); let h = 2166136261;
    globalThis.__ctxSpy = (k, a) => { const t = k + '(' + a.map(v => (v && typeof v === 'object' ? 'o' : String(v))).join(',') + ')'; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619); };
    try { for (let i = 0; i < 400; i++) { bot(0); T.update(STEP); D.render(STEP); } } finally { globalThis.__ctxSpy = null; }
    D.exitMatch(); C.set(null); return h >>> 0; };
  ok(topLog({ skin:0, hair:0, style:0, b:0.92 }) === topLog({ skin:5, hair:5, style:11, b:1.12 }), 'Top draws the same match the same whatever his look');
  S.cam = 0; D.setMode('menu');
}

/* ---------- the rendered player art ---------- */
// The real manifest, on synthetic pixels: Node can't decode WebP, and the art's pixels are looked at in a browser, not here. Nothing here needs Blender
{
  const A = B.ART, gameDir = new URL('../', import.meta.url), artDir = new URL('assets/players/', gameDir), man = JSON.parse(fs.readFileSync(new URL('players.json', artDir), 'utf8'));
  const BODIES = ['slim.m', 'slim.f', 'medium.m', 'medium.f', 'stocky.m', 'stocky.f'], SHAPE = { idle:2, carryidle:1, run:8, sprint:8, carry:8, pass:3, sidestep:6, tackle:3, fall:3, lying:1, getup:3 };
  // what shipped
  ok(BODIES.every(b => man.sprites[b]), 'all six bodies are in the atlas: every build, male and female');
  for (const [clip, n] of Object.entries(SHAPE)) {
    ok(man.clips[clip] && man.clips[clip].n === n, `${clip} has ${n} pictures`);
    const dirs = man.clips[clip].dirs.length;
    ok(dirs === (clip === 'pass' || clip === 'sidestep' ? 8 : 5), `${clip} has its facings (${dirs})`);
    ok(BODIES.every(b => man.sprites[b][clip].length === n*dirs && man.sprites[b][clip].every(r => r[0] < man.pages.length && r[3] <= 256 && r[4] <= 256)), `${clip}: every body has every picture, each fitting the tint's scratch`);
  }
  ok(man.styles.length === 12 && man.styles.every(st => man.hair[st] && man.hair[st].every(Boolean)), 'all twelve hair styles are in the atlas, at every head turn');
  ok(man.parts.length <= 15, 'the part ids fit the green channel');
  const bytes = man.pages.reduce((n, f) => n + fs.statSync(new URL(f, artDir)).size, fs.statSync(new URL('players.json', artDir)).size);
  ok(bytes < 8*1048576, `the sprites are under the hard stop (${(bytes/1048576).toFixed(2)} MB)`);
  const shell = new Set(shellAssets), sw = fs.readFileSync(new URL('sw.js', gameDir), 'utf8');
  ok(['players.json', ...man.pages].every(f => shell.has('assets/players/' + f) && sw.includes('assets/players/' + f)), 'every sprite file is in the service worker precache');

  // the load: any failure leaves the code-drawn men, and a harness with no Image never starts
  const keep = { Image:globalThis.Image, fetch:globalThis.fetch, create:document.createElement };
  const tryLoad = async (fetcher, img) => { B.artOff(); A.state = 'idle'; globalThis.fetch = fetcher; globalThis.Image = img; await B.artLoad('assets/players/'); return A.state; };
  const goodJson = async () => ({ ok:true, json:async () => ({ ...man, pages:[man.pages[0]] }) });
  class Fine { set src(v) { this.naturalWidth = 8; this.naturalHeight = 8; setTimeout(() => this.onload(), 0); } }
  class Broken { set src(v) { setTimeout(() => this.onerror(), 0); } }
  const page = (g = 16) => { const d = new Uint8ClampedArray(8*8*4); for (let i = 0; i < d.length; i += 4) { d[i] = 180; d[i + 1] = g; d[i + 2] = 255; d[i + 3] = 255; } return d; };
  const fakeCanvas = data => () => ({ width:0, height:0, getContext:() => ({ drawImage() {}, getImageData:() => ({ data }) }) });
  ok(await tryLoad(async () => { throw new Error('offline'); }, Fine) === 'off', 'a manifest that fails falls back');
  ok(await tryLoad(async () => ({ ok:false }), Fine) === 'off', 'a 404 falls back');
  ok(await tryLoad(goodJson, Broken) === 'off', 'an atlas that fails falls back');
  document.createElement = fakeCanvas(page(17));
  ok(await tryLoad(goodJson, Fine) === 'off', 'an atlas whose ids a browser altered falls back');
  document.createElement = fakeCanvas(page());
  ok(await tryLoad(goodJson, Fine) === 'ready', 'a good atlas installs, off the main path');
  ok(typeof A.loadMs === 'number' && A.pages.length === 1, 'and notes how long it took');
  document.createElement = keep.create; globalThis.fetch = keep.fetch; if (keep.Image) globalThis.Image = keep.Image; else delete globalThis.Image;
  B.artOff();
  { const st = stage(2); const log = frameLog(); ok(!B.artReady() && st.m.players.every(p => placeOf(log, p) >= 0 || !atOf(p)), 'art off: no crash and every man still drawn in code'); }

  // synthetic pages big enough for the real rows: every pixel a shirt at 180 of light, whole coverage
  const pages = man.pages.map(() => { const w = 2048, h = 2048, data = new Uint8ClampedArray(w*h*4); for (let i = 0; i < data.length; i += 4) { data[i] = 180; data[i + 1] = 16; data[i + 2] = 255; } return { w, h, data }; });
  const install = () => { B.artInstall(man, pages); A.img = { data:new Uint8ClampedArray(256*256*4) }; A.scratch = { width:256, height:256 }; A.sg = { putImageData() {} }; };
  install();
  const slotImage = e => e.k === 'drawImage' && A.map.size && [...A.map.values()].some(sl => sl.cv === e.a[0]);
  let st = stage(2);
  for (let i = 0; i < 12; i++) D.render(STEP);
  ok(B.artReady() && A.baked > 0, `art in: pictures are tinted (${A.baked})`);
  const seen = frameLog().filter(slotImage).length;
  ok(seen >= st.m.players.filter(p => { const q = atOf(p); return q && q.sx > -q.k*1.5 && q.sx < 844 + q.k*1.5; }).length - 1, `art in: the men are drawn from the sheets (${seen} on this frame)`);
  ok(!frameLog().some(e => e.k === 'getImageData'), 'and nothing is read back on a frame');
  { const before = A.baked; frameLog(); frameLog(); ok(A.baked === before, 'a still picture costs no more tints'); }
  { const L = A.img.data, kit = T.M.kit[0], cut = B.artLut(kit.fill); ok(L.some(v => v > 0), 'the tint writes pixels'); ok(cut[180*3] === Math.min(255, Math.round(hexOf(kit.fill)[0]*Math.min(180/255/0.70, 1.06) + (180/255 - 0.46)*62)), 'the shade is the colour at its own light'); }
  { const dark = B.artLut('#1a1a1a'); ok(dark[255*3] > dark[120*3] + 10, 'even a black shirt keeps its folds'); }
  const r0 = rndCalls(); for (let i = 0; i < 30; i++) D.render(STEP); ok(rndCalls() === r0, 'art draws no random number');
  ok(!/^art|^aid|^dl$/.test(Object.keys(T.M.players[0]).join(' ')) && !Object.keys(T.M.players[0]).some(k => /art|pose|clip/i.test(k)), 'and adds nothing to the players');
  { // the Locker's boots on the art (they were on the code-drawn men only), and the career player's look in his tints
    const LK = T.locker.state(), keep = { boots:LK.boots }, bootsAt = man.parts.indexOf('boots') + 1, skinAt = man.parts.indexOf('skin') + 1, hairAt = man.parts.indexOf('hair') + 1, RB = T.locker.RAINBOW;
    LK.boots = 'neon'; st = stage(2, { arcade:true });
    ok(st.mine.every(p => B.artPalette(p)[bootsAt] === B.artLut('#7dff3d')) && st.opp.every(p => B.artPalette(p)[bootsAt] === B.artLut('#22252b')), 'the art: Neon Green boots on your side, the art\'s own dark ones on theirs');
    LK.boots = 'rainbow'; st = stage(2, { arcade:true });
    ok(st.mine.every(p => B.artPalette(p)[bootsAt] === B.artLut(RB[p.n % RB.length])), 'Rainbow by shirt');
    st.m.career = true; st.m.careerP = st.mine[2];
    ok(B.artPalette(st.mine[2])[bootsAt] === B.artLut(RB[st.mine[2].n % RB.length]) && st.mine.filter(p => p !== st.mine[2]).every(p => B.artPalette(p)[bootsAt] === B.artLut('#22252b')), 'a career match: his alone');
    LK.boots = 'black'; st = stage(2, { arcade:true }); ok(st.mine.every(p => B.artPalette(p)[bootsAt] === B.artLut('#22252b')), 'the default Black: the art\'s own boots, as before');
    LK.boots = 'neon'; st = stage(2); ok(st.mine.every(p => B.artPalette(p)[bootsAt] === B.artLut('#22252b')), 'and none outside a match you play');
    Object.assign(LK, keep);
    const X = T.teams, C = T.career, look = { g:1, skin:5, hair:4, style:11, b:1.12 };
    C.set(C.create({ pos:'B', num:6, club:X.CLUBS[2], cat:'women', look })); C.play(); D.setMode('match'); for (let i = 0; i < 4; i++) D.render(STEP);
    const me = T.M.careerP, pal = B.artPalette(me), pose = B.artSprite('run', 0, 0, false, B.lookOf(me));
    ok(pal[skinAt] === B.artLut(B.LOOK_SKIN[5]) && pal[hairAt] === B.artLut(B.artHairOf(look, { shirt:T.M.kit[0].fill }, B.LOOK_SKIN[5])), 'his skin and hair in the art\'s tints');
    ok(pose.build === 'stocky' && pose.row === man.sprites['stocky.f'].run[0], 'his build and body pick the art\'s own sprite (Big, female)');
    ok([...A.map.values()].some(sl => sl.key >= 0) && B.BV.men.get(me) && B.BV.men.get(me).artSlot, 'and he is drawn from it');
    D.exitMatch(); C.set(null);
  }

  // poses
  const poseOf = (p, o = {}) => { const s = B.BV.men.get(p), k = o.k || null, tackler = !!(k && p !== k.c); return B.artPose(camNow(), p, s, k, tackler, !!o.carrier, o.sp ?? Math.hypot(p.vx, p.vy), o.spr || 0); };
  st = stage(2); const man0 = st.opp[2], c0 = st.c;
  Object.assign(man0, { vx:0, vy:0 }); ok(poseOf(man0).clip === 'idle', 'standing still: idle');
  ok(poseOf(man0, { carrier:true }).clip === 'carryidle', 'standing with the ball: the ball held in both arms');
  ok(poseOf(man0, { sp:5 }).clip === 'run', 'moving: run'); ok(poseOf(man0, { sp:5, spr:1 }).clip === 'sprint', 'sprinting: the sprint lean'); ok(poseOf(man0, { sp:5, carrier:true }).clip === 'carry', 'with the ball: the carry');
  { // the stride follows ground: one cycle of the art's own stride walks all eight pictures, in order, and backward running reverses them
    const s = B.BV.men.get(man0), L = man.stride.run*B.lookOf(man0).h/1.8, got = [];
    s.ph = 0; s.dl = s.dist;
    for (let i = 0; i < 8; i++) { got.push(poseOf(man0, { sp:5 }).frame); s.dist += L/8; }
    ok(new Set(got).size === 8 && got.every((f, i) => i === 0 || f === ((got[i - 1] + 1) & 7)), `a stride of ${L.toFixed(2)}m walks the eight frames (${got})`);
    const f0 = poseOf(man0, { sp:5 }).frame; s.dist += 0; Object.assign(man0, { vx:-man0.fx*5, vy:-man0.fy*5 }); s.dist += L/8; const f1 = poseOf(man0, { sp:5 }).frame; Object.assign(man0, { vx:0, vy:0 });
    ok(f1 === ((f0 - 1) & 7), 'running backward runs the cycle backward');
    const same = poseOf(man0, { sp:5 }).frame; ok(poseOf(man0, { sp:5 }).frame === same, 'and with no ground covered the feet stay');
  }
  { // going down, lying, getting up, on his own clock
    const s = B.BV.men.get(man0); man0.down = 1; s.dn = false;
    ok(poseOf(man0).clip === 'fall', 'going down'); T.M.rt += 0.3; man0.down = 0.7; ok(poseOf(man0).clip === 'lying', 'lying'); man0.down = 0.1; ok(poseOf(man0).clip === 'getup', 'getting up'); man0.down = 0; ok(poseOf(man0).clip === 'idle', 'and up');
  }
  { // the tackle
    const k = { c:c0, q:man0, t:0, T:0.3, mode:'ai', tier:'wrap' }, s = B.BV.men.get(man0);
    ok(poseOf(man0, { k }).clip === 'tackle' && poseOf(man0, { k }).frame === 0, 'the tackler lunges'); k.t = 0.25; ok(poseOf(man0, { k }).frame === 1, 'and wraps');
    k.mode = 'dive'; ok(poseOf(man0, { k }).frame === 2, 'a dive is a dive');
    s.wx = c0.x; s.wy = c0.y + 2; const facing = poseOf(man0, { k }); ok(facing.clip === 'tackle' && Number.isInteger(facing.dir), 'he faces the man he is on'); s.wx = man0.x; s.wy = man0.y;
  }
  { // the Side Step, both ways, is the same picture mirrored, on render-only state
    const s = B.BV.men.get(c0), keys = Object.keys(c0).join(), snap = JSON.stringify([c0.x, c0.y, c0.vx, c0.vy, c0.side]);
    Object.assign(c0, { fx:T.M.ball ? dirOf(st.team) : 1, fy:0, vx:0, vy:0 });
    s.d8 = null;
    B.artStepped(c0, 1); const R = { ...poseOf(c0, { carrier:true, sp:5 }) };
    ok(R.clip === 'sidestep' && R.frame === 0, 'the Side Step opens on the feint');
    ok(Object.keys(c0).join() === keys && JSON.stringify([c0.x, c0.y, c0.vx, c0.vy, c0.side]) !== 'x', 'and leaves the man alone');
    B.artStepped(c0, -1); const Lf = { ...poseOf(c0, { carrier:true, sp:5 }) };
    ok(R.mirror !== Lf.mirror && R.clip === Lf.clip, 'the other way is its mirror');
    const frames = []; for (let u = 0; u < 0.36; u += 0.06) { B.ART_STEP.get(c0).at = T.M.rt - u - 0.001; frames.push(poseOf(c0, { carrier:true, sp:5 }).frame); }
    ok(frames.join() === '0,1,2,3,4,5', `the six pictures play in order (${frames})`);
    B.ART_STEP.get(c0).at = T.M.rt - 0.4; ok(poseOf(c0, { carrier:true, sp:5 }).clip === 'carry', 'then the carry again');
    B.ART_STEP.get(c0).at = T.M.rt; ok(poseOf(c0, { sp:5 }).clip !== 'sidestep', 'a man without the ball has no Side Step to show');
    // the real trigger
    const J = { x:0, y:1 }, OPEN = T.contact;
    B.ART_STEP.delete(c0); const r1 = rndCalls(); OPEN.sideStep(c0, J, 1); if (B.ART_STEP.get(c0)) ok(B.ART_STEP.get(c0).s === 1 && rndCalls() === r1, 'sideStep itself sets it off and draws nothing'); else failed++, console.log('FAIL sideStep did not reach the art');
  }
  { // pass follow-through
    const s = B.BV.men.get(man0); s.passAt = T.M.rt; s.passSide = 1; const P = { ...poseOf(man0, { sp:0 }) }; ok(P.clip === 'pass' && P.mirror, 'the follow-through, thrown to the right, is the left one mirrored'); s.passSide = -1; ok(!poseOf(man0, { sp:0 }).mirror, 'and to the left it is not'); s.passAt = null;
  }
  // male and female, per player
  {
    const c = B.cleanLook({ g:1 }), bad = [B.cleanLook({ g:2 }), B.cleanLook({ g:'1' }), B.cleanLook({ g:0.5 }), B.cleanLook({ g:null })];
    ok(c.g === 1 && B.cleanLook({ g:0 }).g === 0, 'cleanLook keeps g'); ok(bad.every(l => !('g' in l)), 'and drops anything else');
    ok(B.cleanLook({ style:7 }).style === 7 && B.cleanLook({ style:9 }).style === 9 && B.cleanLook({ style:11 }).style === 11 && B.cleanLook({ style:12 }).style === 11, 'and the twelve styles');
    const nat = T.teams.NATIONS[0];
    nat.squad = [{ n:2, look:{ g:1 } }, { n:3, look:{ g:1, style:6 } }, { n:5, look:{ g:1, style:7, b:1.16 } }, { n:6, look:{ g:0, b:0.9 } }];
    const m = fresh(2);
    const of = n => m.players.find(p => p.team === 0 && p.n === n), Lk = n => B.lookOf(of(n));
    ok(Lk(2).g === 1 && Lk(4).g === 0, 'g works per player, and the default is 0');
    ok(Lk(3).style === 6 && Lk(5).style === 7, 'a ponytail and a plait can be asked for');
    const r2 = rndCalls(), a = JSON.stringify(Lk(2)); ok(rndCalls() === r2 && a === JSON.stringify(Lk(2)), 'looks stay deterministic');
    ok(B.artSprite('run', 0, 0, false, Lk(5)).row === man.sprites['stocky.f'].run[0], 'a stocky female uses her own mesh');
    ok(B.artSprite('run', 0, 0, false, Lk(6)).row === man.sprites['slim.m'].run[0], 'a slim male his');
    ok(man.sprites['stocky.f'].run[0] !== man.sprites['stocky.m'].run[0] && man.sprites['stocky.m'].idle[0][3] > man.sprites['slim.m'].idle[0][3], 'the meshes differ, and a stocky man is wider than a slim one');
    delete nat.squad;
    inPlay(); for (let i = 0; i < 20; i++) D.render(STEP);
    ok(frameLog().filter(slotImage).length > 0, 'a mixed team renders from the sheets');
  }
  // the bound: thousands of pictures fit fixed sheets
  {
    fresh(2); inPlay(); install();
    const p = T.M.players[0], s = {}, C = B.artClass('stand', 0);
    for (let i = 0; i < 3000; i++) { const sl = B.artSlot(C); sl.key = i + 1; sl.t = i; A.map.set(i + 1, sl); }
    const cap = C.cap, per = C.slots.length/C.canvases.length;
    ok(C.canvases.length === cap, `a shape's sheets stop at its cap (${C.canvases.length})`);
    ok(A.map.size === C.slots.length && A.map.size === cap*per, `old pictures go, so the cache holds what the sheets hold (${A.map.size})`);
    ok(A.sheets <= 7, `no more than seven sheets (28MB) at the very most (${A.sheets})`);
    const oldest = [...A.map.values()].reduce((a, b) => (b.t < a.t ? b : a));
    const taken = B.artSlot(C); ok(taken === oldest, 'the slot reused is the one unseen for longest');
    // the per-frame budget
    fresh(2); inPlay(); install();
    let most = 0; for (let i = 0; i < 6; i++) { B.BV.bakes = 0; D.render(STEP); most = Math.max(most, B.BV.bakes); }
    ok(most > 0 && most <= 7, `tints per frame stay in budget (${most}, the man you run may add one)`);
  }
  // Top and Two Player are untouched by the art being in, and a close-up still draws in code
  {
    const logOf = fn => JSON.stringify(capture(fn).map(e => [e.k, e.a.map(v => (typeof v === 'object' ? 0 : v))]));
    const run = (cam, two) => { reseed(5); fresh(cam); if (two) T.M.two = true; inPlay(); for (let i = 0; i < 10; i++) D.render(STEP); return logOf(() => D.render(STEP)); };
    B.artOff(); const top0 = run(0, false), two0 = run(2, true);
    install(); const top1 = run(0, false), two1 = run(2, true);
    ok(top0 === top1, 'Top issues the same canvas calls with the art in');
    T.M.two = true; ok(two0 === two1 && !B.behindOn(), 'and so does Two Player, which stays on its own view');
    install(); fresh(2); inPlay();
  }
  // the art's memory goes when a match or a drill is played without it, and comes back with the next behind view
  {
    const held = () => A.pages.length > 0 && A.sheets > 0, gone = () => A.state === 'idle' && !A.pages.length && !A.sheets && !Object.keys(A.classes).length && !A.map.size;
    stage(2); ok(held(), 'a behind match holds the pages and the sheets');
    S.cam = 0; for (let i = 0; i < 3; i++) D.render(STEP); ok(held(), 'a flip to Top in the same match keeps them, for the flip back'); S.cam = 2;
    fresh(0); inPlay(); D.render(STEP); ok(gone(), 'a new match on Top frees the sheets and the pages');
    install(); stage(2); ok(held(), 'and again'); fresh(2, { humans:[true, true], levels:[1, 1] }); D.setTwo(true); inPlay(); D.render(STEP); ok(gone(), 'a Two Player match frees them too'); D.setTwo(false);
    install(); stage(2); S.cam = 2; T.practice.start('cones'); D.render(STEP); ok(held() && !B.behindOn(), 'a drill keeps them: every Training Ground game draws with them'); T.practice.leave();
    fresh(0); inPlay(); D.render(STEP); ok(gone(), 'and a Top match after a drill frees them');
    install(); fresh(0); inPlay(); T.practice.start('egg'); ok(A.state === 'ready', 'a drill after a Top match keeps art already in'); T.practice.leave(); B.artFree();
    { // with the art in, no Skill Game draws a code-drawn man on any frame: anyone with no picture to hold is tinted at once, past the per-frame
      // budget, as in the demo (render-art.js owed). A code-drawn man paints his skin in one of the looks' tones, which the art never sets as a fill.
      // Whether a frame runs out of tints on its own turns on the draws, not the screen: without owed, the kick's close-up overflows on seeds 7 and 8
      // and not on 1 to 6, at 844x390 and 667x375 alike, and Driving's on every seed. So each drill plays on seed 7 at both phone sizes, and then once
      // more with every frame's tints spent before a man is drawn, which leaves owed the only way in for anyone new on any seed
      const seen = S.drillSeen, skin = new Set(B.LOOK_SKIN), ids = T.drills.DRILLS.map(d => d.id); S.drillSeen = ids;
      const play = (W, H, spent) => {
        D.view(W, H); B.artFree(); install(); S.cam = 2; const code = {};
        if (spent) Object.defineProperty(B.BV, 'bakes', { configurable:true, get:() => Infinity, set:() => {} });
        try {
          for (const id of ids) {
            reseed(7); T.practice.start(id); $(id === 'circle' ? 'pr-runner' : 'pr-retry').click(); code[id] = 0;
            globalThis.__ctxSpy = (k, a) => { if (k === 'fillStyle' && skin.has(a[0])) code[id]++; };
            try { for (let i = 0; i < 400 && T.practice.state() && !T.practice.state().done; i++) { if (i % 7 === 0) T.input.aPressed = true; T.update(STEP); D.render(STEP); } } finally { globalThis.__ctxSpy = null; }
            T.practice.leave();
          }
        } finally { if (spent) { delete B.BV.bakes; B.BV.bakes = 0; } }
        return code;
      };
      const show = code => Object.entries(code).map(([k, n]) => k + ' ' + n).join(', '), none = code => Object.values(code).every(n => n === 0);
      for (const [W, H] of [[844, 390], [667, 375]]) { const code = play(W, H, false); ok(none(code), `with the art in, every Skill Game draws every man from the art from his first frame at ${W}x${H}, the close-ups' packs and kickers included (${show(code)})`); }
      { const code = play(844, 390, true); ok(none(code), `and with every frame's tints already spent, anyone with no picture to hold still gets his, in every Skill Game (${show(code)})`); }
      B.artFree(); S.drillSeen = seen; D.view(844, 390); }
    install(); stage(2); B.artFree();
    const live = { Image:globalThis.Image, fetch:globalThis.fetch, create:document.createElement };
    document.createElement = fakeCanvas(page()); globalThis.Image = Fine; globalThis.fetch = goodJson;
    const n0 = A.gen, p0 = B.artLoad('assets/players/'); ok(A.state === 'loading', 'a load under way');
    fresh(0); inPlay(); D.render(STEP); await p0; ok(gone() && A.gen > n0, 'a match without the art drops a load under way too, and it installs nothing');
    document.createElement = live.create; fresh(2); inPlay(); D.render(STEP); ok(A.state === 'loading', 'the next behind view loads them again');
    document.createElement = fakeCanvas(page()); await A.promise; ok(A.state === 'ready' && A.pages.length === 1, 'and they are back');
    B.artFree(); document.createElement = live.create; T.practice.start('egg'); D.render(STEP); ok(A.state === 'loading', 'a drill loads them when they are not in'); document.createElement = fakeCanvas(page()); await A.promise; ok(A.state === 'ready', 'and has them'); T.practice.leave();
    document.createElement = live.create; fresh(0); inPlay(); D.render(STEP); ok(gone(), 'and they go again with the next Top match');
    document.createElement = live.create; globalThis.fetch = live.fetch; if (live.Image) globalThis.Image = live.Image; else delete globalThis.Image;
    B.artOff(); fresh(0); inPlay(); D.render(STEP); ok(A.state === 'off', 'art that failed stays off: no retry on every Top frame');
    install(); fresh(2); inPlay();
  }
  /* ---------- the demo behind the menus ---------- */
  {
    const demoMatch = (o = {}) => { D.setMode('menu'); D.setTwo(false); T.newMatch(o.a ?? 2, o.b ?? 4, { halfLen:1e9, diff:1, auto:true, demo:true }); return T.M; };
    const step = (n, draw = true) => { for (let i = 0; i < n; i++) { T.update(STEP); if (draw) D.render(STEP); } };
    const men = () => T.M.players.filter(p => { const q = atOf(p); return q && q.sx > -q.k*1.5 && q.sx < 844 + q.k*1.5 && q.sy > -q.k*0.5 && q.sy < 390 + q.k*2.5 && B.BV.men.get(p).z > 1; });
    // Mid always, whatever camera is chosen, and the saved settings never move
    let saves = 0; const was = localStorage.setItem; localStorage.setItem = () => { saves++; };
    B.BV.peekUntil = 0;                                     // an earlier check's press on Camera has had its moment
    for (const cam of [0, 1, 2, 3]) {
      S.cam = cam; S.camPick = true; install(); demoMatch(); const before = JSON.stringify(S);
      step(20);
      ok(B.menuDemo() && B.BV.on && B.BV.cam.ch === 10 && B.BV.cam.back === 22 && B.BV.cam.key.split('x')[2] === '2', `the camera chosen is ${cam}: the demo is on Mid`);
      ok(S.cam === cam && JSON.stringify(S) === before && saves === 0, 'and the settings are as they were, with nothing saved');
      ok(!B.behindOn() && B.stickTurn(0) === 0, 'the stick knows nothing about it');
      ok(frameLog().some(slotImage), 'and the men are the art');
    }
    localStorage.setItem = was; S.cam = 0; S.camPick = false;
    // a phone held sideways: Mid's height and distance, framed in the gap between the home's columns, and a match's own Mid is untouched
    { install(); demoMatch(); D.view(844, 390); step(3); const c = B.BV.cam; ok(c.ch === 10 && c.back === 22 && Math.abs(c.cx - B.BV_DEMO_AT.x*844) < 1, 'the demo is framed in the gap the home leaves (ball at ' + Math.round(c.cx) + ' px across)');
      const q = D.pr(c, T.M.ball.x, T.M.ball.y, 0); ok(q && q.sy < 390*0.6, 'and up the screen, clear of the settings (' + Math.round(q.sy) + ' px)');
      S.cam = 2; S.camPick = true; fresh(2); inPlay(); D.view(844, 390); D.render(STEP); ok(B.BV.cam.cx === 422 && !/d$/.test(B.BV.cam.key), 'a match on Mid is centred as ever'); S.cam = 0; S.camPick = false;
      const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8'), al = (css.match(/\.hp-settings\.settings\{[^}]*background:rgba\(16,27,20,([\d.]+)\)/) || [])[1];
      ok(al && +al <= 0.75, 'the home\'s Settings panel lets the men show through (' + al + '; PR #14\'s lighter home dim is not in the merged game, whose home is main\'s)'); }
    // pressing Camera on the home: the demo shows that height for a moment, then goes back to Mid, and Top's look draws too
    { install(); demoMatch(); D.view(844, 390); step(2);
      const CAM_WORDS = ['Top', 'Low', 'Mid', 'High'];
      for (const [cam, ch] of [[1, 7.5], [3, 13], [0, 34], [2, 10]]) { S.cam = (cam + 3) % 4; segOf('cam', 0).children[cam].click(); ok(S.cam === cam, 'Camera moves to ' + CAM_WORDS[cam]); let threw = null; try { step(2); } catch (e) { threw = e; } ok(!threw && B.menuDemo() && B.BV.cam.ch === ch, 'and the demo shows it straight away (' + B.BV.cam.ch + ')' + (threw ? ' ' + threw.message : '')); }
      B.BV.peekUntil = 1; step(2); ok(B.BV.cam.ch === 10, 'then it goes back to Mid'); S.cam = 0; S.camPick = false; }
    // pressing Camera on the pause card in a close-up says why the picture has not moved
    { S.cam = 2; S.camPick = true; fresh(2); inPlay(); D.pause(); ok($('pz-cam-note').hidden, 'pause in open play: no note'); segOf('cam', 1).children[3].click(); ok($('pz-cam-note').hidden && S.cam === 3, 'and a press there changes the view at once, with no note'); D.resume && D.resume(); T.M.paused = false; $('m-pause').hidden = true;
      T.stamina.startScrum({ team:0, x:60, y:35 }); D.pause(); ok($('pz-cam-note').hidden, 'pause in a close-up: nothing yet'); segOf('cam', 1).children[0].click(); ok(!$('pz-cam-note').hidden, 'a press in a close-up says the camera changes after it'); T.M.paused = false; $('m-pause').hidden = true; $('pz-cam-note').hidden = true; S.cam = 0; S.camPick = false; }
    // it draws no random number, with the art or without, and a seeded game is the same whether it ran first or not
    install(); demoMatch(); step(5); { const r0 = rndCalls(); for (let i = 0; i < 300; i++) D.render(STEP); ok(rndCalls() === r0, 'drawing the demo draws no random number, art in'); }
    B.artOff(); demoMatch(); step(5); { const r0 = rndCalls(); for (let i = 0; i < 300; i++) D.render(STEP); ok(rndCalls() === r0, 'nor with the art off'); }
    const seeded = () => { T.newMatch(1, 3, { halfLen:60, diff:1, auto:true, headless:true }); let n = 0; while (!T.M.over && n++ < 100000) T.update(STEP); return JSON.stringify([T.M.score, T.M.tries, T.M.stats]); };
    reseed(4242); const plain = seeded();
    install(); demoMatch(); reseed(777); step(120, false); const r1 = rndCalls(); for (let i = 0; i < 200; i++) D.render(STEP); ok(rndCalls() === r1, 'still none'); reseed(4242);
    ok(seeded() === plain, 'a seeded match after the demo has drawn plays as one with no demo before it');
    const demoRun = draw => { install(); reseed(77); demoMatch(); step(600, draw); return JSON.stringify(T.M.players.map(p => [p.x, p.y])) + T.M.score; };
    ok(demoRun(false) === demoRun(true), 'and the demo itself plays the same drawn or not');
    // a real match after it starts as if the demo had never been: the same canvas calls, on the camera chosen
    const realFrame = cam => { reseed(9); const st = stage(cam); return JSON.stringify(capture(() => D.render(STEP)).map(e => [e.k, e.a.map(v => (typeof v === 'object' ? 0 : v))])) + st.m.score; };
    B.artOff(); const lowPlain = realFrame(1), midPlain = realFrame(2);
    S.cam = 1; demoMatch(); step(40); ok(realFrame(1) === lowPlain && B.BV.cam.ch === 7.5 && B.BV.M === T.M, 'after the demo, a Low match draws what it would have, with the Low camera');
    S.cam = 2; demoMatch(); step(40); ok(realFrame(2) === midPlain, 'and so does a Mid match');
    ok(B.BV.fade === 1, 'with no fade left over'); S.cam = 0;
    // the first frames: a calm pitch while the art loads, then the men fade in, all of them the art from the first frame
    B.artOff(); A.state = 'loading'; demoMatch(); B.BV.baked = 0;
    let log = capture(() => D.render(STEP));
    ok(B.BV.fade === 0 && !log.some(e => e.k === 'drawImage') && B.BV.baked === 0 && !log.some(e => e.k === 'translate'), 'loading: an empty pitch, with no code-drawn men to flash');
    ok(!B.BV.cells.length, 'and nothing baked for them');
    A.state = 'ready'; B.artInstall(man, pages); A.img = { data:new Uint8ClampedArray(256*256*4) }; A.scratch = { width:256, height:256 }; A.sg = { putImageData() {} };
    T.M.players.forEach((p, i) => { p.x = 60 + (i % 7)*2; p.y = 18 + i*2.6; p.vx = p.vy = 0; p.down = 0; });
    const cells0 = B.BV.cells.length, baked0 = A.baked; D.render(1/30);
    ok(B.BV.fade > 0 && B.BV.fade < 0.1, `the art in: the fade starts (${B.BV.fade.toFixed(3)})`);
    ok(A.baked - baked0 >= men().length && men().length > 6, `every man on the frame has his picture at once, past the budget, so none shows a hole (${A.baked - baked0} tints, ${men().length} men)`);
    ok(B.BV.cells.length === cells0, 'and no code-drawn man is baked');
    for (let i = 0; i < 40; i++) D.render(1/30); ok(B.BV.fade === 1, 'then the fade is done');
    for (let i = 0; i < 400; i++) { T.update(STEP); T.update(STEP); D.render(1/30); } ok(B.BV.cells.length === cells0, 'playing on, every frame is the art, never a code-drawn man');
    // art that fails: the same fade, then the code-drawn men, at the smaller size only
    B.artOff(); A.state = 'loading'; demoMatch(); D.render(1/30); A.state = 'off'; D.render(1/30); ok(B.BV.fade > 0 && B.BV.fade < 0.1, 'art off: the code-drawn men fade in the same way');
    for (let i = 0; i < 30; i++) D.render(1/30);
    ok(B.BV.fade === 1 && B.BV.cells.length > 0 && B.BV.cells.every(c => c.width <= 40), `in the smaller cells (${B.BV.cells.length})`);
    { D.setRM(true); A.state = 'loading'; demoMatch(); D.render(1/30); const none = B.BV.fade; A.state = 'off'; D.render(1/30); ok(none === 0 && B.BV.fade === 1, 'reduced motion: no fade, the men are simply there'); D.setRM(false); B.artOff(); }
    // the art's memory on the menus: one sheet a shape, the smaller tier, however long it runs
    B.artFree(); install(); demoMatch(); for (let i = 0; i < 3000; i++) { const C = B.artClass('stand', 0), sl = B.artSlot(C); sl.key = 1e6 + i; sl.t = i; A.map.set(sl.key, sl); }
    ok(B.artClass('stand', 0).canvases.length === 1 && A.sheets === 1, `the demo keeps to one sheet (${A.sheets})`);
    for (let i = 0; i < 300; i++) { T.update(STEP); T.update(STEP); D.render(1/30); }
    ok(!Object.keys(A.classes).some(k => k.endsWith('1')) && A.sheets <= 2, `two at the most, both the smaller tier: 8MB (${Object.keys(A.classes)})`);
    // a match may use all its sheets, and they go when the menus come back
    { const m = fresh(2); inPlay(); for (const [shape, tier] of [['stand', 0], ['stand', 1]]) { const C = B.artClass(shape, tier); for (let i = 0; i < 2000; i++) { const sl = B.artSlot(C); sl.key = 2e6 + i + tier*5000; sl.t = i; A.map.set(sl.key, sl); } } D.render(STEP); const held = A.sheets; demoMatch(); D.render(1/30);
      const C0 = B.artClass('stand', 0), slotsOk = C0.slots.every(sl => sl.cv === C0.canvases[0]);
      ok(m.players && held >= 5 && A.sheets <= 2 && C0.canvases.length === 1 && slotsOk && !A.classes.stand1?.canvases.length, `a match's sheets go back to one on the menus (${held} to ${A.sheets})`);
      const again = fresh(2); inPlay(); for (let i = 0; i < 20; i++) D.render(STEP); ok(again && frameLog().some(slotImage), 'and the next match has what it needs'); demoMatch(); }
    // a hold on a sheet that has gone can't throw
    B.artFree(); install(); D.render(1/30); ok(true, 'freeing the art under a demo man holding a picture draws on'); B.artOff();
    ok(!Object.keys(T.M.players[0]).some(k => /art|pose|clip|fade/i.test(k)), 'and it adds nothing to the players');
    D.setMode('menu'); S.cam = 2;
  }
  // a new match forgets the old one's pictures, and keeps the sheets
  {
    const s0 = A.sheets; fresh(2); inPlay(); D.render(STEP); fresh(2); inPlay(); D.render(STEP);
    ok(A.sheets >= s0 && A.sheets <= 7 && [...A.map.keys()].length <= 12, `a new match starts clean (${A.map.size} pictures)`);
  }
  B.artOff();
}

D.setMode('menu');
console.log(`Camera: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
