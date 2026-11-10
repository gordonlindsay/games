// The maul (src/maul.js, src/render-maul.js; README, The maul): the trigger and every gate, the CPU's call and its rates, each result,
// the wheel moving the restart across the pitch, the maul driven in the world with nobody in it (seeded, drawing as stated), two player,
// the hint and tutorial cards and TUT_IDS, MAUL off drawing exactly as the build before it, the drawing, and (where Playwright and
// Chromium are installed) the close-up's fit at 844x390 and 667x375, one player and two. Exits 1 on any failure.
// node tools/maul.mjs                    (SEED=5 unless set)
// node tools/maul.mjs --pins             prints this build's fingerprint (GAME=<b706c3e>/index.html node tools/maul.mjs --pins pinned BASE_OFF)
// node tools/maul.mjs --balance [ai|bot|ibot|cut] [n]   the README's tables: seeded AI v AI with the maul off and on, the bot against the CPU
//                                         headless and in matches you play, and the close-up by tap rate. Minutes; never in check.mjs
// SHOTS=<dir> node tools/maul.mjs        also writes the close-up's screenshots (Bind and mid-Drive, attacking and defending, both sizes)
process.env.SEED ??= '5';
import { spawnSync, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { T, inputs, rndCalls, reseed, bot, maulBot, fire, padStub } = await import('./harness.mjs');
const D = T.debug, X = T.teams, C = T.contact, K = T.kick, STEP = T.STEP, M = () => T.M, inp = inputs[0], $ = id => document.getElementById(id);
const L = T.maul, MAUL = L ? L.MAUL : null;
const hyp = Math.hypot, clamp = (v, a, b) => v < a ? a : v > b ? b : v, dirOf = t => t === 0 ? 1 : -1, near = (a, b, e) => Math.abs(a - b) <= e;
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const json = v => JSON.stringify(v, (k, x) => (typeof x === 'number' ? +x.toFixed(6) : x));
const args = process.argv.slice(2);

// a match you play, played out by the bot through the real path: the half-time card's Second Half, a penalty card's choice
function playOut(step, limit = 400000) {
  const Mm = T.M; let n = 0;
  while (!Mm.over && n < limit) {
    if (Mm.phase === 'break') { document.getElementById('br-go').click(); continue; }
    if (Mm.phase === 'menu' && !document.getElementById('m-pen').hidden) { (document.getElementById('p-goal').disabled ? document.getElementById('p-tap') : document.getElementById('p-goal')).click(); continue; }
    step(); T.update(STEP); n++;
  }
  return n;
}
// The fingerprint: AI v AI, a tool's headless match the bot plays, an arcade Quick Match the bot plays with its close-ups, and the demo.
// Nothing in it reads the maul's own API, so an older build runs it as it is.
function pins() {
  const out = [];
  reseed(41); out.push(json(T.simulate(3, 120, 1).map(r => [r.teams, r.score, r.tries, r.stats, r.steps])));
  for (const [seed, o] of [[42, { headless:true, duels:'live' }], [43, { headless:false, duels:'live', arcade:true }], [44, { headless:false, duels:'off', diff:2 }]]) {
    reseed(seed);
    T.newMatch(X.NATIONS[2], X.NATIONS[5], { halfLen:120, diff:o.diff ?? 1, ...o }); D.setMode('match');
    const n = playOut(() => bot(0), 200000);
    out.push(json([T.M.score, T.M.tries, T.M.stats, n]));
  }
  reseed(45); T.newMatch(0, 3, { halfLen:1e9, diff:1, auto:true, demo:true }); for (let i = 0; i < 9000; i++) T.update(STEP);
  out.push(json([T.M.score, T.M.stats, T.M.players.map(p => [p.x, p.y])]));
  D.setMode('menu');
  return out.map(fnv).join(' ');
}
// b706c3e, the build before the maul (GAME=<its index.html> node tools/maul.mjs --pins). MAUL off must give it exactly. Since the merge
// into wt/pr14int (2026-11-09) pressure (src/contact.js, PRESSURE) came first: MAUL off with PRESSURE off gives BASE_OFF (0b1293c gives it
// too), and MAUL off alone gives BASE_PRESS, the build before the maul there (GAME=<ca3f3b7's index.html> node tools/maul.mjs --pins)
const BASE_OFF = process.env.MAUL_BASE_OFF || 'pt9pzk m09bmi 1hdomeb doemap w86b6m';
const BASE_PRESS = process.env.MAUL_BASE_PRESS || 'h5lqva 1udjipg 1oob89n qn0hye 9f3ch1';
if (args[0] === '--pins') { console.log(pins()); process.exit(0); }
if (!L) { console.log('FAIL maul: the engine has no maul (T.maul)'); console.log('0 passed, 1 failed'); process.exit(1); }

let failed = 0, passed = 0, group = '';
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', group + ':', msg); } };
const done = name => { console.log(`${name.padEnd(26)} ${failed ? 'FAIL so far ' + failed : 'ok'} (${passed} passed)`); };
const begin = name => { group = name; };
const snap = o => JSON.parse(JSON.stringify(o)), M0 = snap(MAUL), reset = () => { for (const k of Object.keys(MAUL)) delete MAUL[k]; Object.assign(MAUL, snap(M0)); };
const said = []; document.createTextNode = t => { said.push(String(t)); return {}; };   // every banner the game says (say() writes its words through createTextNode)

const fresh = (o = {}) => {
  T.newMatch(o.a ?? 0, o.b ?? 1, { halfLen:240, diff:1, headless:false, duels:'off', ...o }); D.setMode('match'); D.setTwo(!!(o.humans && o.humans[0] && o.humans[1]));
  for (const i of inputs) { i.keys.clear(); i.jx = i.jy = 0; i.aPressed = i.bPressed = i.cPressed = false; i.aDown = i.bDown = i.cDown = false; }
};
const quiet = () => { for (const i of inputs) { i.jx = i.jy = 0; i.aPressed = i.bPressed = i.cPressed = false; i.aDown = i.bDown = i.cDown = false; i.keys.clear(); } };
// a carrier of side ct at (cx, cy) running at the line, a tackler 1.2m in front, a teammate `mate` metres behind him (or none), everyone else far off
function stage(o) {
  const m = M(), P = m.players, b = m.ball, ct = o.ct ?? 0, d = dirOf(ct);
  m.phase = 'play'; m.set = null; m.cut = null; m.clock = 30; m.dclock = 100; m.hooter = false; m.surge = null; m.contact = null; m.duelPending = null; m.goal = null; m.tags = []; m.fx = [];
  for (const p of P) Object.assign(p, { vx:0, vy:0, down:0, tcd:0, side:-1, boost:0, boostMul:1, hold:2, drop:null, quick:false, bind:null, offside:0, sprint:0, sprinting:false, stumble:0, stumbleMul:1, wf:0, drawFrom:null, fend:0, think:0, grace:0 });
  for (const S of m.spr) { S.p = null; S.spent = false; S.m = 1; }
  const own = P.filter(p => p.team === ct), opp = P.filter(p => p.team !== ct);
  own.forEach((p, i) => { p.x = clamp(o.cx - d*(24 + 3*i), 1, 119); p.y = 4 + i*10; p.fx = d; p.fy = 0; });
  opp.forEach((p, i) => { p.x = clamp(o.cx - d*(40 + i), 1, 119); p.y = 4 + i*10; p.fx = -d; p.fy = 0; });
  const c = own.find(p => p.n === (o.n ?? 2)), q = opp[0], mate = own.find(p => p !== c && p.n !== 4);
  Object.assign(c, { x:o.cx, y:o.cy, vx:d*6, vy:0, fx:d, fy:0 });
  Object.assign(q, { x:o.cx + d*1.2, y:o.cy, vx:-d*3, vy:0, fx:-d, fy:0 });
  if (o.mate != null) Object.assign(mate, { x:o.cx - d*o.mate, y:o.cy + 0.6 });
  b.state = 'held'; b.carrier = c; b.f = null; b.last = ct; b.kickInfo = null; b.x = c.x; b.y = c.y; b.z = 1; b.vx = b.vy = b.vz = 0;
  m.poss = ct; m.phaseCount = 2;
  for (const t of [0, 1]) if (T.sides.isHuman(t)) T.sides.side(t).ctrl = t === ct ? c : opp.find(p => p !== q) || q;
  if (m.careerPro) T.sides.side(0).ctrl = m.careerP;
  quiet();
  return { c, q, mate, own, opp };
}
// stage, then commit until the tackle sticks; the tier is then set as asked and the CPU's offload plan dropped
function bind(o, tier = 'wrap') {
  for (let i = 0; i < 400; i++) {
    const s = stage(o), k = C.commitTackle(s.q, s.c, 'ai');
    if (k.T > 0) { k.tier = tier; k.aiOff = null; return { ...s, k }; }
  }
  return null;
}
const steps = (n, drive) => { for (let i = 0; i < n; i++) { if (drive) drive(); T.update(STEP); } };
const run = (pred, max = 2000, drive) => { for (let i = 0; i < max && !pred(); i++) { if (drive) drive(); T.update(STEP); } return pred(); };
// a human press of B while bound, then the join: returns the close-up (or null)
function call(s, seat = 0) { inputs[seat].bPressed = true; T.update(STEP); run(() => M().phase === 'cut', 40); return M().cut && M().cut.kind === 'maul' ? M().cut : null; }
// play a close-up out: each human side taps at rate[t] a second (0 for none) with its stick at stick[t]; returns the cut once it is over
function playCut(cut, rate = [6, 0], stick = [0, 0]) {
  const next = [MAUL.set + 0.02, MAUL.set + 0.05];
  let n = 0;
  while (M().cut === cut && n++ < 3000) {
    for (const t of [0, 1]) { const i = T.sides.inputOf(t); if (!i) continue; i.jy = stick[t]; if (rate[t] > 0 && cut.t >= next[t] && !cut.result) { i.aPressed = true; next[t] = cut.t + 1/rate[t]; } }
    T.update(STEP);
  }
  quiet();
  return cut;
}

if (args[0] === '--balance') { await balance(args[1] || 'all', +args[2] || 0); process.exit(0); }
C.CONTACT.jolt.dom = C.CONTACT.jolt.wrap = C.CONTACT.jolt.soft = 0;   // a staged bind that must end in a ruck: the 9 / 2 / 1% jolt would make it a scrum or a loose ball on some seeds (as contact.mjs's noJolt)

// 0. the levers and the gate
begin('levers');
{
  ok(MAUL.on === true && MAUL.r === 4 && MAUL.join === 0.3, `on, a teammate within ${MAUL.r}m, a ${MAUL.join}s join`);
  ok(MAUL.set === 1.0 && MAUL.drive === 3.0 && MAUL.use === 1.0 && MAUL.strong === 3.0 && MAUL.back === 1.5, `Bind ${MAUL.set}s, Drive ${MAUL.drive}s; Use It from ${MAUL.use}m, a surge from ${MAUL.strong}m, Held Up at ${MAUL.back}m back`);
  const P = MAUL.cpu;
  ok(P.base === 0.05 && P.fwd === 0.05 && P.near === 0.10 && P.nearM === 15 && P.pow === 0.03 && P.max === 0.35, `the CPU's call: ${P.base} + ${P.fwd} a forward + ${P.near} within ${P.nearM}m of the line + ${P.pow} a Power point of edge, at most ${P.max}`);
  ok(D.TUT_IDS.join() === 'past,pass,tackle,block,scrum,lineout,goal,drop,maul', `TUT_IDS has the maul appended (${D.TUT_IDS.join(', ')})`);
}
done('0 levers');

// 1. the trigger: your carrier held in a Wrap or a Soft with a man within 4m. B reads Maul and pulses; the press binds him on, says
//    Maul, and the close-up opens after the join
begin('trigger');
for (const tier of ['wrap', 'soft']) {
  fresh(); const s = bind({ cx:60, cy:35, mate:2.5 }, tier), { c, k, mate } = s;
  D.updateHud();
  ok($('lb').textContent === 'Maul' && $('btnB').classList.contains('cue') && !$('btnB').classList.contains('idle') && !$('btnB').hidden, `${tier}: B reads Maul, lit and pulsing (${$('lb').textContent})`);
  ok($('la').textContent === 'Offload' && D.cueOf(0) === 'Offload', `${tier}: with him also in reach of an offload, Pass still reads Offload, and the two-player cue word is the Offload (${$('la').textContent}, ${D.cueOf(0)})`);
  said.length = 0; const r0 = rndCalls();
  inputs[0].bPressed = true; T.update(STEP);
  ok(k.maul && k.mate === mate && mate.bind === k && M().contact === k && rndCalls() === r0, `${tier}: the press calls it: the nearest teammate binds on, the bind holds, no random number drawn`);
  ok(said.includes('Maul'), `${tier}: Maul is called (${said.join(', ')})`);
  ok(!C.canOffload(k), `${tier}: no offload once it is called`);
  const t0 = M().stepN; run(() => M().phase === 'cut', 60);
  const cut = M().cut, n = M().stepN - t0;
  ok(cut && cut.kind === 'maul' && cut.team === 0 && cut.k === k && M().contact == null && !c.bind && !mate.bind, `${tier}: then the close-up opens with the bind handed to it (${cut && cut.kind})`);
  ok(Math.abs(n*STEP - MAUL.join) <= 2*STEP, `${tier}: after the ${MAUL.join}s join (${(n*STEP).toFixed(3)}s)`);
  ok(K.cutTitle(cut) === 'Maul · ENG Ball' && D.cutCues(cut).length === 1 && D.cutCues(cut)[0][0] === 0, `${tier}: its title (${K.cutTitle(cut)}), and a cue for the one seat in it`);
  D.updateHud(); ok($('la').textContent === 'Push' && $('btnB').hidden && $('btnC').hidden, `${tier}: the close-up's button is Push, alone (${$('la').textContent})`);
  playCut(cut, [6, 0]); run(() => M().phase === 'play', 400);
}
{ // a man 1.2m behind is too close for an offload but binds on: the cue word is the Maul's
  fresh(); bind({ cx:60, cy:35, mate:1.2 }, 'wrap'); D.updateHud();
  ok($('lb').textContent === 'Maul' && $('la').textContent === 'Pass' && D.cueOf(0) === 'Maul', `no Offload lit: the cue word is Maul (${D.cueOf(0)})`);
}
{ // a late press: after the bind has ended, B is a kick again (no maul)
  fresh(); const { k } = bind({ cx:60, cy:35, mate:2.5 }, 'wrap'); run(() => M().contact !== k, 40);
  ok(M().phase === 'set' && M().set.kind === 'ruck' && !k.maul, 'with no press the tackle ends in its ruck as before');
}
done('1 trigger');

// 2. every gate: nobody near, a Big Hit, a broken tackle, Kids, Minis, a Pro Mode back, a drill, and MAUL off
begin('gates');
const noMaul = (label, s, o = {}) => {
  D.updateHud();
  const lb = $('lb').textContent; inputs[0].bPressed = true; T.update(STEP);
  ok(lb !== 'Maul' && !s.k.maul && !(M().cut && M().cut.kind === 'maul'), `${label}: B is not Maul (${lb}) and a press calls nothing`);
  if (!o.keep) run(() => M().contact !== s.k, 60);
  return lb;
};
{ fresh(); noMaul('nobody within 4m (5m back)', bind({ cx:60, cy:35, mate:5 }, 'wrap')); ok(M().phase === 'set' && M().set.kind === 'ruck', 'nobody near: the ruck, as ever'); }
{ // his own in-goal: a maul never forms there, and the tackle is Held in Goal as ever; the CPU never calls one there either
  fresh(); const s = bind({ cx:7, cy:35, mate:2.5 }, 'wrap');
  ok(s.c.x < 10 && L.mate(s.c) === s.mate && !L.can(s.k), `held in his own in-goal (x ${s.c.x.toFixed(1)}) with a man behind him: no maul`);
  noMaul('his own in-goal', s);
  ok(M().set && M().set.kind === 'scrum' && /^Held in Goal/.test(M().set.label), `the tackle is Held in Goal (${M().set && M().set.label})`);
  MAUL.cpu.base = 1; MAUL.cpu.max = 1; fresh(); const s2 = bind({ ct:1, cx:113, cy:35, mate:2.5 }, 'soft'); run(() => M().contact !== s2.k, 60);
  ok(!s2.k.maul && M().phase !== 'cut', 'the CPU in its own in-goal: none, whatever its rate'); reset();
  fresh(); const s3 = bind({ cx:10.5, cy:35, mate:2.5 }, 'wrap'); ok(L.can(s3.k), 'on his own line, in the field of play: the Maul is there'); C.releaseBind(s3.k);
}
{ // a man in front of the ball is offside: never the one who binds on (supportFor's 0.3m margin)
  fresh(); let s = bind({ cx:60, cy:35, mate:-3 }, 'wrap');
  ok(L.mate(s.c) == null && !L.can(s.k), 'the only man near is 3m in front of the ball: no maul'); noMaul('a man in front', s);
  fresh(); s = bind({ cx:60, cy:35, mate:-1.5 }, 'wrap'); const back = s.own.find(p => p !== s.c && p !== s.mate && p.n !== 4); Object.assign(back, { x:57, y:35.6 });
  ok(L.mate(s.c) === back, `a man 1.5m in front and one 3m behind: the one behind binds on (number ${L.mate(s.c) && L.mate(s.c).n})`); C.releaseBind(s.k);
  fresh(); s = bind({ cx:60, cy:35, mate:-0.2 }, 'wrap'); ok(L.mate(s.c) === s.mate && L.can(s.k), 'a man level with him (0.2m up) binds on'); C.releaseBind(s.k);
}
{ fresh(); const s = bind({ cx:60, cy:35, mate:2.5 }, 'dom'); ok(!L.can(s.k), 'a Big Hit: no maul (L.can false)'); noMaul('a Big Hit', s); }
{ fresh(); let br = null; for (let i = 0; i < 400 && !br; i++) { const s = stage({ cx:60, cy:35, mate:2.5 }), k = C.commitTackle(s.q, s.c, 'ai'); if (k.tier === 'broken') br = k; else C.releaseBind(k); }
  ok(br && !M().contact && !br.maul && D.cueOf(0) !== 'Maul', 'a broken tackle: no bind, so nothing to maul'); }
{ fresh({ diff:0, kids:true }); ok(M().kids, 'a Kids match'); const s = bind({ cx:60, cy:35, mate:2.5 }, 'wrap'); ok(!L.can(s.k) && C.matchMild(), 'Kids: no maul'); noMaul('Kids', s); }
{ const mini = X.natList('minis'); fresh({ a:mini[0], b:mini[1] }); const s = bind({ cx:60, cy:35, mate:2.5 }, 'wrap'); ok(!L.can(s.k) && C.matchMild(), `Minis (${M().nat[0].id} v ${M().nat[1].id}): no maul`); noMaul('Minis', s); }
{ // a CPU carrier in a Kids or a Minis match never calls one either
  MAUL.cpu.base = 1; MAUL.cpu.max = 1;
  for (const o of [{ diff:0, kids:true }, { a:X.natList('minis')[0], b:X.natList('minis')[1] }]) { fresh(o); const s = bind({ ct:1, cx:60, cy:35, mate:2.5 }, 'soft'); run(() => M().contact !== s.k, 60); ok(!s.k.maul && M().phase !== 'cut', `${o.kids ? 'Kids' : 'Minis'}: the CPU never calls one, whatever its rate`); }
  reset();
}
{ // Pro Mode as a back: no Maul on his B; a CPU teammate's maul and the other side's are driven in the world, never a close-up
  fresh(); const m = M(); m.career = false; m.careerPro = true; m.careerP = m.players.find(p => p.team === 0 && p.n === 6); T.sides.side(0).ctrl = m.careerP;
  const s = bind({ cx:60, cy:35, mate:2.5, n:6 }, 'wrap');
  ok(s.c === m.careerP && T.careerPro.skip(), 'Pro Mode: his own player, a back, is the carrier');
  noMaul('Pro Mode a back', s);
  MAUL.cpu.base = 1; MAUL.cpu.max = 1;
  const s2 = bind({ cx:60, cy:35, mate:2.5, n:2 }, 'soft'); T.sides.side(0).ctrl = m.careerP;
  run(() => !!s2.k.maul, 30); run(() => s2.k.maul && s2.k.maul.live, 40);
  ok(s2.k.maul && s2.k.maul.live && !s2.k.maul.cut && M().phase === 'play' && s2.k.mate !== m.careerP, 'a CPU teammate of his calls one: driven in the world, no close-up, and never with him bound into it');
  const s3 = bind({ ct:1, cx:60, cy:35, mate:2.5 }, 'soft'); T.sides.side(0).ctrl = m.careerP;
  run(() => !!s3.k.maul, 30); run(() => M().contact !== s3.k || M().phase === 'cut', 400);
  ok(s3.k.maul && !s3.k.maul.cut && M().phase !== 'cut', 'the other side\'s maul in his match: driven in the world too');
  // his own player made the tackle: let go as it forms, rolling away and retiring as from a ruck, and his Tackle never joins it
  const P5 = m.careerP, R = C.RUCK; let k5 = null;
  for (let i = 0; i < 400 && !k5; i++) { const s = stage({ ct:1, cx:60, cy:35, mate:2.5 }); s.q.x = 20; Object.assign(P5, { x:58.8, y:35, vx:3, vy:0, tcd:0, down:0, offside:0, bind:null }); const kk = C.commitTackle(P5, s.c, 'contact'); if (kk.T > 0) { kk.tier = 'soft'; kk.aiOff = null; k5 = kk; } else C.releaseBind(kk); }
  ok(k5 && k5.q === P5, 'Pro Mode: his own player, a back, tackles their carrier');
  run(() => k5.maul && k5.maul.live, 60);
  ok(k5.maul && k5.maul.live && !k5.maul.cut && !P5.bind && k5.q == null && !k5.maul.C.men.includes(P5), 'their maul forms in the world without him: he is let go, never bound into it');
  ok(near(P5.down, R.t.normal + 0.25, 0.02) && near(P5.offside, R.t.normal + 0.25 + R.retire, 0.02) && P5.tcd === P5.offside, `he rolls away and retires as from a ruck (down ${P5.down.toFixed(2)}s, retiring ${P5.offside.toFixed(2)}s, against the maul's ${MAUL.drive}s)`);
  Object.assign(P5, { x:k5.c.x - 1, y:k5.c.y, down:0, tcd:0, offside:0, vx:0, vy:0 });
  ok(!C.canDive(P5), 'up again beside it, his Tackle cannot join it');
  inputs[0].aPressed = true; T.update(STEP); ok(!P5.bind && k5.q2 !== P5 && M().contact === k5, 'and a press leaves the maul as it is');
  run(() => M().contact !== k5, 400); ok(k5.maul.C.result, `the maul ends without him (${k5.maul.C.result})`);
  reset();
  // a forward in Pro Mode: his B is the Maul, and the close-up is his
  fresh(); const f = M(); f.careerPro = true; f.careerP = f.players.find(p => p.team === 0 && p.n === 2);
  const s4 = bind({ cx:60, cy:35, mate:2.5, n:2 }, 'wrap');
  ok(!T.careerPro.skip() && L.can(s4.k), 'Pro Mode as a forward: the Maul is there');
  const cut = call(s4); ok(cut && cut.team === 0, 'and the close-up is his'); if (cut) playCut(cut);
}
{ fresh(); MAUL.on = false; const s = bind({ cx:60, cy:35, mate:2.5 }, 'wrap'); const r0 = rndCalls(); const lb = noMaul('MAUL off', s, { keep:true }); ok(lb === 'Kick', `MAUL off: B reads Kick as before (${lb})`);
  MAUL.cpu.base = 1; MAUL.cpu.max = 1; const s2 = bind({ ct:1, cx:60, cy:35, mate:2.5 }, 'soft'); const r1 = rndCalls(); steps(9); ok(!s2.k.maul && rndCalls() === r1, 'MAUL off: the CPU calls none and its roll draws nothing'); reset(); }
{ // a drill never mauls: the same held carrier is open to a maul in a match and closed in a drill
  const held = () => { const m = M(), c = m.players.find(p => p.team === 0), k = { c, q:null, tier:'wrap', t:0, T:0.25 }; m.phase = 'play'; m.contact = k; m.ball.state = 'held'; m.ball.carrier = c; return k; };
  fresh(); const inMatch = L.open(held());
  T.practice.start('tackle'); const inDrill = L.open(held()); T.practice.leave();
  ok(inMatch && !inDrill, `a drill never mauls (a match ${inMatch}, the Tackling drill ${inDrill})`);
}
done('2 gates');

// 3. the CPU's call: its rates, the closed form against 6000 staged binds a case, and you defend it in the close-up
begin('cpu call');
{
  fresh();
  const rateFor = (n, cx) => { stage({ ct:1, cx, cy:35, n }); return L.cpuRate(M().players.find(p => p.team === 1 && p.n === n)); };
  ok(near(rateFor(5, 60), 0.05, 1e-9) && near(rateFor(2, 60), 0.10, 1e-9) && near(rateFor(2, 22), 0.20, 1e-9) && near(rateFor(5, 24), 0.15, 1e-9), `a back mid-field 5%, a forward 10%, a forward within 15m of your line 20%, a back there 15% (${[rateFor(5, 60), rateFor(2, 60), rateFor(2, 22), rateFor(5, 24)].join(', ')})`);
  T.newMatch(X.NATIONS[0], X.NATIONS[11], { halfLen:240, diff:1, headless:false, duels:'off' });
  const edge = M().nat[1].power - M().nat[0].power; stage({ ct:0, cx:60, cy:35 }); const c0 = M().ball.carrier;
  ok(edge !== 0 && near(L.cpuRate(c0), clamp(0.10 + Math.max(0, -edge)*0.03, 0, 0.35), 1e-9), `a Power edge adds 3% a point (${M().nat[0].id} ${M().nat[0].power} v ${M().nat[1].id} ${M().nat[1].power}: ${L.cpuRate(c0).toFixed(3)})`);
  // the call is rolled once a bind, at 0.12s, only with a man near and no offload planned
  T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'off' });
  for (const [n, cx, want] of [[2, 60, 0.10], [5, 60, 0.05], [2, 22 + 98*0, 0.20]]) {
    let calls = 0, N = 6000;
    for (let i = 0; i < N; i++) { const s = bind({ ct:1, cx, cy:35, mate:2.5, n }, 'wrap'); steps(9); if (s.k.maul) calls++; C.releaseBind(s.k); }
    ok(near(calls/N, want, 0.015), `${n <= 3 ? 'a forward' : 'a back'} ${cx === 60 ? 'mid-field' : 'near your line'}: ${(100*calls/N).toFixed(1)}% of binds (${(100*want).toFixed(0)}%)`);
  }
  { let draws = 0; const s = bind({ ct:1, cx:60, cy:35, mate:2.5, n:2 }, 'wrap'); const r0 = rndCalls(); steps(9); draws = rndCalls() - r0; ok(draws === 1 || (s.k.maul && draws >= 1), `the call draws one random number (${draws})`); C.releaseBind(s.k); }
  { const s = bind({ ct:1, cx:60, cy:35, mate:9, n:2 }, 'wrap'); const r0 = rndCalls(); steps(9); ok(!s.k.maul && rndCalls() === r0, 'with nobody near it draws nothing'); C.releaseBind(s.k); }
  { MAUL.cpu.base = 1; MAUL.cpu.max = 1; const s = bind({ ct:1, cx:60, cy:35, mate:2.5 }, 'wrap'); s.k.aiOff = 0.2; steps(9); ok(!s.k.maul, 'an offload planned first is tried first'); C.releaseBind(s.k); reset(); }
  // interactive: the CPU's maul is yours to defend
  fresh(); MAUL.cpu.base = 1; MAUL.cpu.max = 1; said.length = 0;
  const s = bind({ ct:1, cx:60, cy:35, mate:2.5 }, 'soft');
  run(() => M().phase === 'cut', 60);
  const cut = M().cut;
  ok(cut && cut.kind === 'maul' && cut.team === 1 && said.includes('Maul') && K.cutTitle(cut) === 'Maul · FRA Ball', `the CPU calls it and the close-up opens: you defend (${cut && K.cutTitle(cut)})`);
  if (cut) { cut.base[1] = 0.72; playCut(cut, [7, 0]); ok(cut.result === 'held', `tap 7 a second against an average pack (Normal's 0.72, as section 4) and it is held up (${cut.result}, ${cut.fwd.toFixed(2)}m)`); }   // the pack's drawn x0.75 to 1.25 set at its middle, so what ran before it cannot decide this
  reset();
}
done('3 cpu call');

// 4. the results: a maul try near the line, Use It and its quick ball, Held Up and the scrum; attacking and defending
begin('results');
{
  // a try: 1.5m out, a strong drive
  fresh(); said.length = 0;
  let cut = call(bind({ cx:107.6, cy:30, mate:2.5 }, 'wrap'));
  playCut(cut, [7, 0]);
  ok(cut.result === 'try' && said.includes('Maul Try'), `1.5m out, 7 taps a second: a maul try (${cut.result}, ${cut.fwd.toFixed(2)}m)`);
  run(() => M().phase === 'set', 60);
  ok(M().score[0] === 5 && M().tries[0] === 1 && M().set && M().set.kind === 'try', `the try is scored (${M().score.join('-')})`);
  ok((M().stats.maul_try || 0) === 1, 'and counted');
  // Use It: mid-field, a good drive
  fresh(); said.length = 0;
  cut = call(bind({ cx:50, cy:35, mate:2.5 }, 'wrap'));
  playCut(cut, [6.5, 0]);
  ok(cut.result === 'use' && cut.fwd >= MAUL.use && said.includes('Use It'), `mid-field, 6.5 taps a second: Use It (${cut.fwd.toFixed(2)}m)`);
  const g0 = M().stats.gain[0];
  run(() => M().phase !== 'cut', 200);
  ok(M().phase === 'set' && M().set.kind === 'ruck' && M().set.maul && M().set.team === 0 && near(M().set.t, MAUL.useT, 0.02), `after it: a ${MAUL.useT}s ruck, your ball`);
  ok(near(M().set.x, cut.x + cut.fwd - 0.4, 0.01) && near(M().set.y, cut.y + cut.lat, 0.01), `at the metres driven and the wheel (${M().set.x.toFixed(2)}, ${M().set.y.toFixed(2)})`);
  run(() => M().phase === 'play', 120);
  const cr = M().ball.carrier;
  ok(M().ball.state === 'held' && cr && cr.team === 0 && cr.quick && cr.n !== 2, `then the ball is back to the scrum-half, quick (number ${cr && cr.n})`);
  ok(g0 >= cut.fwd - 1e-9, `the metres count as carried (${g0.toFixed(2)})`);
  ok((cut.fwd >= MAUL.strong) === !!(M().surge && M().surge.team === 0), `a surge only past ${MAUL.strong}m (${cut.fwd.toFixed(2)}m, ${M().surge ? 'surge' : 'none'})`);
  // a strong drive surges
  fresh(); cut = call(bind({ cx:40, cy:35, mate:2.5 }, 'wrap')); cut.base[1] = 0.3; playCut(cut, [7, 0]); run(() => M().phase === 'play', 200);
  ok(cut.result === 'use' && cut.fwd >= MAUL.strong && M().surge && M().surge.team === 0, `a strong one (${cut.fwd.toFixed(2)}m) and the attack surges`);
  // Held Up: no taps, driven back
  fresh(); said.length = 0;
  cut = call(bind({ cx:60, cy:35, mate:2.5 }, 'wrap'));
  playCut(cut, [0, 0]);
  ok(cut.result === 'held' && cut.fwd <= 0 && said.includes('Held Up'), `no taps: driven back and held up (${cut.fwd.toFixed(2)}m)`);
  run(() => M().phase === 'set', 200);
  ok(M().set && M().set.kind === 'scrum' && M().set.team === 1 && /^Held Up · Scrum FRA$/.test(M().set.label), `a scrum to the defence (${M().set && M().set.label})`);
  ok(M().stats.pens === 0, 'and no penalty');
  // defending: no taps against the CPU and it goes; fast taps and it stops
  for (const [rate, want] of [[0, 'use'], [7.5, 'held']]) {
    fresh(); MAUL.cpu.base = 1; MAUL.cpu.max = 1;
    bind({ ct:1, cx:70, cy:35, mate:2.5 }, 'wrap'); run(() => M().phase === 'cut', 60); const c2 = M().cut; reset();
    c2.base[1] = 0.72; playCut(c2, [rate, 0]);
    ok(c2.result === want, `defending at ${rate} taps a second: ${c2.result} (${c2.fwd.toFixed(2)}m)`);
  }
  // a timed first shove
  fresh(); cut = call(bind({ cx:60, cy:35, mate:2.5 }, 'wrap'));
  run(() => cut.t >= MAUL.set, 200); said.length = 0; const f0 = cut.fwd; inputs[0].aPressed = true; T.update(STEP);
  ok(cut.hit[0] && near(cut.fwd - f0, MAUL.hit, 0.15) && said.includes('Good Timing'), `a press on Drive: Good Timing, ${MAUL.hit}m (${(cut.fwd - f0).toFixed(2)})`);
  playCut(cut);
  fresh(); cut = call(bind({ cx:60, cy:35, mate:2.5 }, 'wrap'));
  run(() => cut.t >= 0.5, 200); said.length = 0; inputs[0].aPressed = true; T.update(STEP); run(() => cut.t >= MAUL.set + 0.05, 100); inputs[0].aPressed = true; T.update(STEP);
  ok(cut.early[0] && !cut.hit[0] && said.includes('Early'), 'a press in the Bind call is Early and forfeits it, nothing more');
  playCut(cut);
}
done('4 results');

// 5. the wheel: the stick's up and down turns the maul, and the restart moves across the pitch with it
begin('wheel');
{
  const ends = {};
  for (const [name, jy] of [['up', -1], ['level', 0], ['down', 1]]) {
    reseed(77); fresh(); const cut = call(bind({ cx:50, cy:35, mate:2.5 }, 'wrap'));
    playCut(cut, [6, 0], [jy, 0]);
    run(() => M().phase === 'set' || M().phase === 'play', 200);
    ends[name] = { ang:cut.ang, lat:cut.lat, y:M().set ? M().set.y : M().ball.y, res:cut.result };
  }
  ok(ends.up.ang < -0.3 && ends.down.ang > 0.3 && near(ends.level.ang, 0, 0.35), `the maul's angle follows the stick (${ends.up.ang.toFixed(2)}, ${ends.level.ang.toFixed(2)}, ${ends.down.ang.toFixed(2)} rad)`);
  ok(ends.up.y < ends.level.y - 1.5 && ends.down.y > ends.level.y + 1.5, `and the restart moves across the pitch (${ends.up.y.toFixed(1)}, ${ends.level.y.toFixed(1)}, ${ends.down.y.toFixed(1)})`);
  ok(Math.abs(ends.up.ang) <= MAUL.ang + 1e-9 && Math.abs(ends.down.ang) <= MAUL.ang + 1e-9, `never past ${MAUL.ang} rad`);
  // a key or a stick held into the close-up is never a steer (as a duel's and a kick's cut-in: src/duels.js, src/goal-kicks.js): the
  // angle stays 0 through the Drive, and a fresh press steers
  const tapTo = (cut, until, drive) => { let next = MAUL.set + 0.02; run(() => cut.t >= until || !!cut.result, 600, () => { if (drive) drive(); if (cut.t >= next) { inputs[0].aPressed = true; next = cut.t + 1/6; } }); };
  { reseed(77); fresh(); const s = bind({ cx:50, cy:35, mate:2.5 }, 'wrap'); T.onKey({ code:'KeyW' }, true);
    const cut = call(s); tapTo(cut, MAUL.set + 1.2);
    ok(cut.ang === 0 && cut.lat === 0 && L.steer(inputs[0]) === 0, `W held from the run into it: no wheel (${cut.ang.toFixed(2)} rad, ${cut.lat.toFixed(2)}m)`);
    T.onKey({ code:'KeyW' }, false); T.onKey({ code:'KeyW' }, true); tapTo(cut, MAUL.set + 2.0);
    ok(cut.ang < -0.3, `W pressed again: it wheels (${cut.ang.toFixed(2)} rad)`); T.onKey({ code:'KeyW' }, false); playCut(cut); run(() => M().phase !== 'cut', 200); }
  { reseed(77); fresh(); const s = bind({ cx:50, cy:35, mate:2.5 }, 'wrap'), zone = $('zone');
    zone.fire('pointerdown', { pointerId:7, clientX:100, clientY:300 }); zone.fire('pointermove', { pointerId:7, clientX:100 + 0.8*52, clientY:300 - 0.6*52 });
    const j0 = inputs[0].jy, cut = call(s); tapTo(cut, MAUL.set + 1.2);
    ok(j0 < -0.5 && cut.ang === 0, `the touch stick held up from the run (${j0.toFixed(2)}): re-centred under the thumb, no wheel (${cut.ang.toFixed(2)} rad)`);
    zone.fire('pointermove', { pointerId:7, clientX:100 + 0.8*52, clientY:300 - 1.4*52 }); tapTo(cut, MAUL.set + 2.0);
    ok(cut.ang < -0.3, `the thumb moved up from there: it wheels (${cut.ang.toFixed(2)} rad)`); zone.fire('pointerup', { pointerId:7 }); playCut(cut); run(() => M().phase !== 'cut', 200); }
  { const pad = { index:0, mapping:'standard', connected:true, buttons:Array.from({ length:17 }, () => ({ pressed:false, value:0 })), axes:[0.8, -0.6, 0, 0] };
    padStub([pad]); fire('gamepadconnected', { gamepad:pad });
    reseed(77); fresh(); const s = bind({ cx:50, cy:35, mate:2.5 }, 'wrap'); T.pollPads(); const j0 = inputs[0].jy;
    inputs[0].bPressed = true; T.update(STEP); run(() => M().phase === 'cut', 40, () => T.pollPads()); const cut = M().cut;
    tapTo(cut, MAUL.set + 1.2, () => T.pollPads());
    ok(j0 < -0.3 && inputs[0].latch && cut.ang === 0, `a pad stick held up from the run (${j0.toFixed(2)}): latched, no wheel (${cut.ang.toFixed(2)} rad)`);
    pad.axes = [0, 0, 0, 0]; T.pollPads(); pad.axes = [0, -1, 0, 0]; tapTo(cut, MAUL.set + 2.0, () => T.pollPads());
    ok(!inputs[0].latch && cut.ang < -0.3, `back to the centre and pushed up again: it wheels (${cut.ang.toFixed(2)} rad)`);
    pad.axes = [0, 0, 0, 0]; T.pollPads(); fire('gamepaddisconnected', { gamepad:pad }); padStub([]); playCut(cut); run(() => M().phase !== 'cut', 200); D.setDev('touch'); }
  { // defending their maul with W held from the chase: your stick adds nothing until a fresh press
    fresh(); MAUL.cpu.base = 1; MAUL.cpu.max = 1; const s = bind({ ct:1, cx:60, cy:35, mate:2.5 }, 'soft');
    run(() => s.k.maul && s.k.maul.t >= MAUL.join - 2*STEP, 60); T.onKey({ code:'KeyW' }, true); run(() => M().phase === 'cut', 10); reset();
    const cut = M().cut; let worst = 0; tapTo(cut, MAUL.set + 1.0, () => { worst = Math.max(worst, Math.abs(L.steer(inputs[0]))); });
    ok(cut && cut.team === 1 && worst === 0, `W held into their close-up: your steer reads nothing (${worst})`);
    T.onKey({ code:'KeyW' }, false); T.onKey({ code:'KeyW' }, true); ok(L.steer(inputs[0]) === -1, 'pressed again, it steers'); T.onKey({ code:'KeyW' }, false); playCut(cut); run(() => M().phase !== 'cut', 200); }
  // near touch it never goes over: a maul 4m in, wheeled at touch
  fresh(); const cut = call(bind({ cx:50, cy:4, mate:2.5 }, 'wrap')); playCut(cut, [6, 0], [-1, 0]);
  ok(cut.y + cut.lat >= Math.min(4, MAUL.edgeY) - 1e-9 && M().phase !== 'cut', `wheeled at touch from 4m in, it stays in (${(cut.y + cut.lat).toFixed(2)}m)`);
}
done('5 wheel');

// 6. with nobody in it: driven in the world, seeded, drawing as stated
begin('auto');
{
  T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'off' }); MAUL.cpu.base = 1; MAUL.cpu.max = 1;
  const s = bind({ ct:1, cx:60, cy:35, mate:2.5 }, 'soft');
  const draws = []; let n = 0, x0 = null;
  while (M().contact === s.k && n++ < 600) { const r = rndCalls(); T.update(STEP); if (rndCalls() !== r) draws.push([n, rndCalls() - r, !!(s.k.maul && s.k.maul.live)]); if (s.k.maul && s.k.maul.live && x0 == null) x0 = s.c.x; }
  ok(draws.length === 2 && draws[0][1] === 1 && draws[1][1] === 3 && draws[1][2], `one draw for the call, three when it forms (two packs and the wave), none while it drives (${JSON.stringify(draws)})`);
  ok(M().phase !== 'cut' && (M().stats.mauls || 0) === 1, 'no close-up: it is driven in the world');
  const C2 = s.k.maul.C;
  ok(C2.result && (C2.d >= MAUL.drive - 1e-9 || C2.result !== 'use'), `it runs the Drive's ${MAUL.drive}s (or ends early) and gives a verdict: ${C2.result} at ${C2.fwd.toFixed(2)}m after ${C2.d.toFixed(2)}s`);
  ok(near((x0 - s.c.x)*1, C2.fwd, 0.5) || C2.result === 'held', `the carrier walks the model's ground (${(x0 - s.c.x).toFixed(2)}m against ${C2.fwd.toFixed(2)}m)`);
  ok(M().tags.some(t => t.text === 'Maul') && M().tags.some(t => t.text === (C2.result === 'use' ? 'Use It' : 'Held Up')) || C2.result === 'try', `its tags on the pitch (${M().tags.map(t => t.text).join(', ')})`);
  reset();
  // the same seed gives the same maul; AI v AI has them and never opens a close-up
  const run1 = () => { reseed(901); const r = T.simulate(2, 240, 1); return json(r.map(x => [x.score, x.stats])); };
  ok(run1() === run1(), 'seeded AI v AI repeats exactly');
  reseed(902); let cuts = 0, mauls = 0;
  for (let i = 0; i < 6; i++) { T.newMatch(i % 6, (i + 2) % 6, { halfLen:240, diff:1, auto:true, headless:true }); let m = 0; while (!T.M.over && m++ < 200000) { T.update(STEP); if (T.M.phase === 'cut' && T.M.cut.kind === 'maul') cuts++; } mauls += T.M.stats.mauls || 0; }
  ok(mauls >= 6 && cuts === 0, `six AI v AI matches: ${mauls} mauls, no close-up`);
  // the demo too
  T.newMatch(0, 3, { halfLen:1e9, diff:1, auto:true, demo:true }); MAUL.cpu.base = 1; MAUL.cpu.max = 1; let dc = 0; for (let i = 0; i < 6000; i++) { T.update(STEP); if (T.M.cut && T.M.cut.kind === 'maul') dc++; } ok((T.M.stats.mauls || 0) > 0 && dc === 0, `the demo: ${T.M.stats.mauls} mauls, no close-up`); reset();
  // the auto model's verdicts over 4000 seeded CPU v CPU mauls mid-field, Normal, equal packs (README, The maul)
  T.newMatch(X.NATIONS[0], X.NATIONS[1], { halfLen:240, diff:1, headless:true, duels:'off' });
  const tally = { try:0, use:0, held:0 }; let metres = 0;
  for (let i = 0; i < 4000; i++) {
    const s2 = bind({ ct:0, cx:50, cy:35, mate:2.5 }, 'wrap'); s2.k.maul = { t:0, live:false, cut:false, C:null }; s2.k.mate = s2.mate; s2.mate.bind = s2.k; L.form(s2.k);
    const Cm = s2.k.maul.C; let g = 0; while (!Cm.result && g++ < 400) { L.drive(Cm, STEP, [0, 1].map(t => Cm.base[t]*(1 + 0.22*Math.sin(Cm.d*2.4 + Cm.wave + t*1.7)))); const r = L.over(Cm); if (r) Cm.result = r; }
    tally[Cm.result]++; metres += Cm.fwd; C.releaseBind(s2.k);
  }
  const pc = k => (100*tally[k]/4000).toFixed(1);
  console.log(`  auto, mid-field, Normal, equal packs: Use It ${pc('use')}%, Held Up ${pc('held')}%, try ${pc('try')}%, ${(metres/4000).toFixed(2)}m on average`);
  ok(tally.use > 4000*0.55 && tally.use < 4000*0.8 && tally.try === 0, `equal packs: Use It ${pc('use')}% (55 to 80), Held Up ${pc('held')}%`);
}
done('6 auto');

// 7. two player: either seat's carrier calls it with its own Kick key; each pack is its seat; the cues name each seat's keys
begin('two player');
{
  fresh({ humans:[true, true], levels:[1, 1] });
  let s = bind({ cx:60, cy:35, mate:1.2 }, 'wrap');
  ok(D.cueOf(0) === 'Maul', `Player 1's carrier held with a man near and no offload: his cue is Maul (${D.cueOf(0)})`);
  const cut = call(s, 0);
  ok(cut && cut.team === 0, 'Player 1 calls it with his own Kick key');
  const cues = D.cutCues(cut).map(c => c.join(':'));
  ok(cues.join(' | ') === '0:F · Push · W S · Steer | 1:/ · Push · Arrows · Steer', `each seat's cue names its keys (${cues.join(' | ')})`);
  playCut(cut, [5, 7]);
  ok(cut.result === 'held', `Player 2 tapping faster holds it up (${cut.result}, ${cut.fwd.toFixed(2)}m)`);
  run(() => M().phase !== 'cut', 200);
  fresh({ humans:[true, true], levels:[1, 1] });
  s = bind({ cx:60, cy:35, mate:2.5 }, 'wrap'); const cut2 = call(s, 0);
  playCut(cut2, [7, 4]);
  ok(cut2.result === 'use' || cut2.result === 'try', `Player 1 tapping faster drives it on (${cut2.result}, ${cut2.fwd.toFixed(2)}m)`);
  run(() => M().phase !== 'cut', 200);
  // Player 2's carrier, with his own key
  fresh({ humans:[true, true], levels:[1, 1] });
  s = bind({ ct:1, cx:60, cy:35, mate:1.2 }, 'wrap');
  ok(D.cueOf(1) === 'Maul', `Player 2's carrier: his cue is Maul (${D.cueOf(1)})`);
  const cut3 = call(s, 1);
  ok(cut3 && cut3.team === 1, 'and Player 2 calls it');
  // the steer: Player 2's arrows turn it
  if (cut3) { run(() => cut3.t >= MAUL.set + 0.05, 200); T.onKey({ code:'ArrowDown' }, true); steps(40); T.onKey({ code:'ArrowDown' }, false); ok(cut3.ang > 0.3, `Player 2's Down arrow wheels it (${cut3.ang.toFixed(2)} rad)`); playCut(cut3, [5, 5]); }
  D.setTwo(false);
}
done('7 two player');

// 8. the cards: the hint card, the tutorial's two cards on every device, TUT_IDS and a save
begin('cards');
{
  D.settings().hints = true; fresh();
  let cut = call(bind({ cx:60, cy:35, mate:2.5 }, 'wrap'));
  const rows = h => h.rows.map(r => r.chips.map(c => c.act + ':' + c.label).join('+') + ' ' + r.text).join(' / ');
  D.setDev('touch'); let h = D.hintFor(0);
  ok(h && h.title === 'Maul' && h.rule === 'Your Ball' && rows(h) === 'v:Stick Steer With the Stick / a:Push Tap Push to Drive', `your maul, touch: ${h && h.title} · ${h && h.rule} · ${h && rows(h)}`);
  D.setDev('kb'); h = D.hintFor(0); ok(h && rows(h) === 'v:Stick Steer / a:Push Tap Push to Drive', `on a keyboard the chip wears W S: ${h && rows(h)}`);
  const html = D.chipHtml(0, h.rows[0].chips[0]); ok(/<kbd class="kc">W<\/kbd><kbd class="kc">S<\/kbd>/.test(html), 'the steer chip\'s keycaps are W and S');
  D.setDev('touch'); playCut(cut); run(() => M().phase !== 'cut', 200);
  ok(D.hintFor(0) == null || D.hintFor(0).title !== 'Maul', 'no card once it is over');
  fresh(); MAUL.cpu.base = 1; MAUL.cpu.max = 1; bind({ ct:1, cx:60, cy:35, mate:2.5 }, 'soft'); run(() => M().phase === 'cut', 60); reset();
  h = D.hintFor(0); ok(h && h.title === 'Maul' && h.rule === 'Hold Them Up', `their maul: ${h && h.rule}`);
  playCut(M().cut, [6, 0]); run(() => M().phase !== 'cut', 200);
  const small = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'on', 'to', 'in', 'for', 'as', 'at', 'by']);
  const titled = s => String(s).split(/[\s,.]+/).filter(Boolean).every((w, i) => (i && small.has(w)) || !/^[a-z]/.test(w));
  const tc = dev => { D.setDev(dev); const c = D.tutCards('maul', 0); D.setDev('touch'); return c; };
  ok(JSON.stringify(tc('touch')) === JSON.stringify([['Maul', 'Steer With the Stick'], ['Maul', 'Tap Push to Drive']]), `the tutorial, touch: ${tc('touch').map(c => c.join(' · ')).join(' | ')}`);
  ok(JSON.stringify(tc('kb')) === JSON.stringify([['Maul', 'Steer With {KeyW} and {KeyS}'], ['Maul', 'Tap {KeyJ} to Drive']]), `a keyboard: ${tc('kb').map(c => c.join(' · ')).join(' | ')}`);
  ok(JSON.stringify(tc('pad')) === JSON.stringify([['Maul', 'Steer With the Stick'], ['Maul', 'Tap the Bottom Button to Drive']]), `a controller: ${tc('pad').map(c => c.join(' · ')).join(' | ')}`);
  ok(['touch', 'kb', 'pad'].every(dev => tc(dev).every(([a, b]) => titled(a) && titled(b) && !/[←-↙⇐-⇙]/.test(a + b))), 'every card Title Case, no arrow');
  fresh({ humans:[true, true], levels:[1, 1] }); D.setDev('kb');
  ok(D.tutCards('maul', 0)[0][1] === 'Steer With {KeyW} and {KeyS}' && D.tutCards('maul', 1)[0][1] === 'Steer With the Arrows' && D.tutCards('maul', 1)[1][1] === 'Tap {Slash} to Drive', `two player: each seat's keys (${D.tutCards('maul', 1).map(c => c[1]).join(' | ')})`);
  D.setDev('touch'); D.setTwo(false);
  // the first maul opens the tutorial card, on the attacking player's seat; then it is remembered
  D.settings().tut = D.TUT_IDS.filter(id => id !== 'maul'); D.settings().hints = true; fresh();
  cut = call(bind({ cx:60, cy:35, mate:2.5 }, 'wrap'));
  const tu = D.tut();
  ok(tu && tu.id === 'maul' && tu.seat === 0 && D.tutMoment(cut) === 'maul' && D.tutSeatOf(cut) === 0 && $('tu-title').textContent === 'Maul', 'the first maul: the tutorial card');
  ok(D.settings().tut.includes('maul'), 'remembered at once');
  run(() => cut.t >= D.CUT_IN, 30); const t0 = cut.t; steps(60); ok(cut.t === t0 && !cut.engaged, 'the close-up holds under the card');
  $('tu-next').click(); $('tu-play').click(); ok(D.tut() == null, 'Next, then Play');
  playCut(cut); run(() => M().phase !== 'cut', 200);
  fresh(); cut = call(bind({ cx:60, cy:35, mate:2.5 }, 'wrap')); ok(D.tut() == null, 'the second maul: no card'); playCut(cut);
  // defending the first time: the card is the defender's
  D.settings().tut = D.TUT_IDS.filter(id => id !== 'maul'); fresh(); MAUL.cpu.base = 1; MAUL.cpu.max = 1; bind({ ct:1, cx:60, cy:35, mate:2.5 }, 'soft'); run(() => M().phase === 'cut', 60); reset();
  ok(D.tut() && D.tut().id === 'maul' && D.tut().seat === 0, 'their maul first: the card is yours, defending'); $('tu-skip').click(); playCut(M().cut, [6, 0]);
  D.settings().tut = D.TUT_IDS.slice();
  // a save: the maul kept in TUT_IDS's order, an unknown id dropped
  process.env.SAVE = JSON.stringify({ settings:{ tut:['maul', 'past', 'nope', 'scrum'] } }); X.load(); const kept = D.settings().tut.slice(); delete process.env.SAVE;
  ok(kept.join() === 'past,scrum,maul', `a save's tutorial list keeps the maul, in order (${kept.join(', ')})`);
  D.settings().tut = D.TUT_IDS.slice();
  // resume before the Drive gives the thumb a moment, as the scrum's
  fresh(); cut = call(bind({ cx:60, cy:35, mate:2.5 }, 'wrap')); run(() => cut.t >= 0.9, 200); D.pause(); D.resume();
  ok(near(cut.t, Math.max(D.CUT_IN, 0.9 - 0.6), 0.02), `resume in the Bind call steps back 0.6s (${cut.t.toFixed(2)})`); playCut(cut);
}
done('8 cards');

// 9. MAUL off draws exactly as the build before it (with PRESSURE off too, b706c3e; alone, the pressure merge on wt/pr14int); on, it moves AI v AI on purpose
begin('off');
{
  const child = env => spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--pins'], { env:{ ...process.env, ...env }, encoding:'utf8', maxBuffer:8 << 20 });
  const off = child({ MAUL:'{"on":false}', PRESSURE:'{"on":false}' }), alone = child({ MAUL:'{"on":false}' }), on = child({});
  const a = (off.stdout || '').trim(), m = (alone.stdout || '').trim(), b = (on.stdout || '').trim();
  ok(off.status === 0 && a === BASE_OFF, `MAUL and PRESSURE off: AI v AI, a tool's match, a played Quick Match, a Hard match and the demo play exactly as at b706c3e (${a}, pinned ${BASE_OFF})${off.stderr ? ' ' + off.stderr.slice(0, 300) : ''}`);
  ok(alone.status === 0 && m === BASE_PRESS, `MAUL off alone: they play exactly as the build before the maul on wt/pr14int, pressure in (${m}, pinned ${BASE_PRESS})${alone.stderr ? ' ' + alone.stderr.slice(0, 300) : ''}`);
  const pa = m.split(' '), pb = b.split(' ');
  ok(on.status === 0 && pb.length === 5 && pb[0] !== pa[0] && pb[4] !== pa[4], `MAUL on: AI v AI and the demo move, on purpose (${b})`);
}
done('9 off');

// 10. the drawing: Bind and Drive, both sides, three sizes, reduced motion; nothing non-finite and no random number drawn
begin('render');
{
  const bad = new Map(), mark = k => bad.set(k, (bad.get(k) || 0) + 1);
  const walk = (k, v) => { if (typeof v === 'number') { if (!Number.isFinite(v)) mark(k); } else if (typeof v === 'string') { if (/NaN|Infinity/.test(v)) mark(k); } else if (Array.isArray(v)) for (const x of v) walk(k, x); };
  const texts = new Set(); globalThis.__ctxSpy = (k, a) => { for (const v of a) walk(k, v); if (k === 'fillText') texts.add(String(a[0])); };
  let frames = 0, rndIn = 0;
  for (const [W, H, rm] of [[667, 375, false], [844, 390, false], [932, 430, false], [844, 390, true]]) {
    D.view(W, H); D.setRM(rm);
    for (const ct of [0, 1]) {
      fresh(); MAUL.cpu.base = 1; MAUL.cpu.max = 1;
      const s = bind({ ct, cx:60, cy:20, mate:2.5 }, 'wrap'); if (ct === 0) { inputs[0].bPressed = true; T.update(STEP); }
      run(() => M().phase === 'cut', 60); reset();
      const cut = M().cut; let n = 0;
      while (M().cut === cut && n++ < 600) { inputs[0].jy = ct ? -1 : 1; if (n % 9 === 0) inputs[0].aPressed = true; T.update(STEP); const r = rndCalls(); D.render(STEP); D.updateHud(); if (rndCalls() !== r) rndIn++; frames++; }
      quiet();
    }
  }
  globalThis.__ctxSpy = null; D.setRM(false); D.view(844, 390);
  { // at match pace (0.88, a frame with no step) the picture blends the maul's metres, slide and wheel a step behind, as the scrum's shove (PACE_CUT in src/boot.js)
    const Y = T.clarity, G = L.geom(844, 390, { t:0, r:0, b:0, l:0 }, false), B = G.bar;
    fresh(); const cut = call(bind({ cx:50, cy:35, mate:2.5 }, 'wrap'));
    let next = MAUL.set + 0.02; run(() => cut.t >= MAUL.set + 0.35, 400, () => { inputs[0].jy = -1; if (cut.t >= next) { inputs[0].aPressed = true; next = cut.t + 1/6; } });
    const barOf = draw => { const rects = []; globalThis.__ctxSpy = (k, a) => { if (k === 'fillRect' && a[1] === B.y && a[3] === B.h) rects.push(+a[2].toFixed(4)); }; draw(); globalThis.__ctxSpy = null; return rects.join(); };
    const before = barOf(() => D.render(STEP)), was = [cut.fwd, cut.lat, cut.ang];
    Y.paceKeep(); inputs[0].jy = -1; inputs[0].aPressed = true; T.update(STEP);
    const now = [cut.fwd, cut.lat, cut.ang], plain = barOf(() => D.render(STEP)), paced = barOf(() => Y.renderPaced(STEP));
    ok(Y.matchPace() < 1 && now.every((v, i) => v !== was[i]) && plain !== before, `a step moves the metres, the slide and the wheel (${was.map(v => v.toFixed(3))} to ${now.map(v => v.toFixed(3))})`);
    ok(paced === before && [cut.fwd, cut.lat, cut.ang].every((v, i) => v === now[i]), `drawn blended (a frame with no step draws the step before: ${paced} against ${before}), then put back`);
    quiet(); playCut(cut); run(() => M().phase !== 'cut', 200);
  }
  ok(bad.size === 0, `nothing non-finite reaches the canvas over ${frames} frames (${[...bad.entries()].map(([k, v]) => k + ' x' + v).join(', ')})`);
  ok(rndIn === 0, `drawing draws no random number (${rndIn} frames did)`);
  ok(['BIND', 'DRIVE', 'MAUL · ENG BALL', 'MAUL · FRA BALL'].every(t => texts.has(t)) && texts.has('ENG') && texts.has('FRA'), `the calls, the title and the bar's codes are drawn (${[...texts].filter(t => /BIND|DRIVE|MAUL/.test(t)).join(', ')})`);
  for (const [W, H] of [[844, 390], [667, 375]]) {
    const G = L.geom(W, H), B = G.bar, S = G.strip;
    ok(B.x > 158 + 8 && B.x + B.w < W - 108 - 8 && B.y + B.h < H, `${W}x${H}: the bar sits between the stick's ring and Push (${B.x.toFixed(0)} to ${(B.x + B.w).toFixed(0)})`);
    ok(S.x + S.w <= W - 16 && S.y >= 120 && S.y + S.h < H - 114 - 8, `${W}x${H}: the strip sits right, under Pause and above Push (${S.x.toFixed(0)},${S.y.toFixed(0)} ${S.w.toFixed(0)}x${S.h.toFixed(0)})`);
  }
}
done('10 render');

// 11. the words: every label, tag and banner the maul uses is Title Case, on contact.mjs's fixed lists
begin('words');
{
  const src = fs.readFileSync(new URL('../src/maul.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../src/render-maul.js', import.meta.url), 'utf8');
  const small = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'on', 'to', 'in', 'for', 'as', 'at', 'by']);
  const title = s => s.split(' ').every((w, i) => (i > 0 && small.has(w)) || /^[A-Z0-9][A-Za-z0-9:'-]*$/.test(w));
  const tags = [...src.matchAll(/tag\('([^']+)'/g)].map(m => m[1]);
  const sayW = ['Maul', 'Maul Try', 'Use It', 'Held Up', 'Early', 'Good Timing', 'Bind', 'Drive', 'Push', 'Steer'];
  ok(tags.join() === 'Maul,Use It,Held Up', `the tags: ${tags.join(', ')}`);
  ok([...tags, ...sayW].every(title), 'Title Case');
  ok(!/[←→↑↓⇐⇒➜»›—]/.test(src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')), 'no arrow glyph and no em dash in the code');
  const contact = fs.readFileSync(new URL('./contact.mjs', import.meta.url), 'utf8');
  ok(['Maul', 'Use It', 'Held Up'].every(t => new RegExp(`fixedTags = \\[[^\\]]*'${t}'`).test(contact) && new RegExp(`allowed = new Set\\(\\[[^\\]]*'${t}'`).test(contact)), 'contact.mjs\'s fixed tags and census list carry them, on purpose');
  ok(!/Steal|jackal|Sin Bin|Yellow/.test(src), 'no steal, no jackal, no new penalty');
}
done('11 words');

// 12. the close-up in Chromium: no scroll at 844x390 and 667x375, the bar and calls clear of the stick, Push and the hints cards,
//     the strip clear of Pause and the cards; SHOTS=<dir> also writes the screenshots
begin('browser');
await browserPart();
done('12 browser');

console.log(`Maul: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

async function browserPart() {
  const require = createRequire(import.meta.url);
  let pw = null;
  for (const from of [() => require('playwright'), () => require(path.join(execFileSync('npm', ['root', '-g'], { stdio:['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright'))]) { try { pw = from(); break; } catch (e) { /* not here */ } }
  if (!pw || process.env.NO_BROWSER) { console.log('  the browser part is skipped: Playwright is not installed (npm i -g playwright && npx playwright install chromium)'); return; }
  const root = fileURLToPath(new URL('../', import.meta.url));
  const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.webp':'image/webp', '.png':'image/png', '.svg':'image/svg+xml', '.webmanifest':'application/json', '.woff2':'font/woff2' };
  const server = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html')); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type':TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control':'no-store' }); r.end(fs.readFileSync(f)); });
  await new Promise(res => server.listen(0, '127.0.0.1', res));
  let browser;
  try { browser = await pw.chromium.launch(); } catch (e) { console.log('  the browser part is skipped: no Chromium (npx playwright install chromium)'); server.close(); return; }
  const shots = process.env.SHOTS;
  if (shots) fs.mkdirSync(shots, { recursive:true });
  try {
    for (const [w, h] of [[844, 390], [667, 375]]) for (const touch of [true, false]) for (const role of ['attack', 'defend']) {
      const ctx = await browser.newContext({ viewport:{ width:w, height:h }, deviceScaleFactor:2, hasTouch:touch, isMobile:touch });
      const page = await ctx.newPage();
      await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
      await page.addInitScript(() => { try { localStorage.setItem('tryline.v1', JSON.stringify({ settings:{ tut:['past', 'pass', 'tackle', 'block', 'scrum', 'lineout', 'goal', 'drop', 'maul'], coach:false, played:5, hints:true } })); } catch (e) {} });
      await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
      await page.waitForFunction(() => window.__tryline && window.__tryline.M, null, { timeout:15000 });
      await page.evaluate(() => document.fonts && document.fonts.ready.then(() => true));   // the canvas's words in the game's own faces
      const name = `${w}x${h} ${touch ? 'touch' : 'desk'} ${role}`;
      const setUp = await page.evaluate(([role]) => {
        const T = window.__tryline, D = T.debug, S = D.settings(), N = T.teams.NATIONS, L = T.maul;
        S.tut = D.TUT_IDS.slice(); S.hints = true; S.coach = false; S.cam = 0;
        D.startMatch(N[0], N[1], false);
        const M = T.M, P = M.players, ct = role === 'attack' ? 0 : 1, d = ct === 0 ? 1 : -1, b = M.ball;
        M.phase = 'play'; M.set = null; M.cut = null; M.duelPending = null; M.contact = null; M.clock = 40;
        for (const p of P) Object.assign(p, { vx:0, vy:0, down:0, tcd:0, bind:null, offside:0, sprint:0, sprinting:false, drawFrom:null });
        const own = P.filter(p => p.team === ct), opp = P.filter(p => p.team !== ct);
        own.forEach((p, i) => { p.x = 60 - d*(20 + 3*i); p.y = 5 + i*10; }); opp.forEach((p, i) => { p.x = 60 - d*(40 + i); p.y = 5 + i*10; });
        const c = own.find(p => p.n === 2), q = opp[0], mate = own.find(p => p.n === 1);
        Object.assign(c, { x:60, y:30, vx:d*6, fx:d }); Object.assign(q, { x:60 + d*1.2, y:30, vx:-d*3 }); Object.assign(mate, { x:60 - d*2.5, y:30.6 });
        b.state = 'held'; b.carrier = c; b.f = null; b.last = ct; M.poss = ct;
        T.sides.side(0).ctrl = ct === 0 ? c : opp[2];
        L.MAUL.cpu.base = 1; L.MAUL.cpu.max = 1;
        let k = null; for (let i = 0; i < 400 && !k; i++) { Object.assign(c, { x:60, y:30, vx:d*6 }); Object.assign(q, { x:60 + d*1.2, y:30, vx:-d*3, tcd:0, down:0, bind:null }); c.bind = null; M.contact = null; b.state = 'held'; b.carrier = c; const kk = T.contact.commitTackle(q, c, 'ai'); if (kk.T > 0) { kk.tier = 'wrap'; kk.aiOff = null; k = kk; } else T.contact.releaseBind(kk); }
        if (!k) return 'no bind';
        if (ct === 0) L.press(0);
        for (let i = 0; i < 40 && M.phase !== 'cut'; i++) T.update(T.STEP);
        return M.cut && M.cut.kind === 'maul' ? 'ok' : 'no cut ' + M.phase;
      }, [role]);
      ok(setUp === 'ok', `${name}: the close-up opens (${setUp})`);
      if (setUp !== 'ok') { await ctx.close(); continue; }
      // the Bind call
      await page.evaluate(() => { const T = window.__tryline, M = T.M; for (let i = 0; i < 40; i++) T.update(T.STEP); M.paused = true; T.debug.render(T.STEP); T.debug.updateHud(); });
      const measure = () => page.evaluate(() => {
        const T = window.__tryline, D = T.debug, $ = i => document.getElementById(i), R = e => { const r = e.getBoundingClientRect(); return { l:r.left, t:r.top, r:r.right, b:r.bottom, on:!!e.offsetParent && !e.hidden && r.width > 0 }; };
        const stick = R($('stick')), A = R($('btnA')), hc0 = R($('hc0')), hc1 = R($('hc1')), pause = R($('b-pause')), bug = R(document.querySelector('.bug'));
        const G = T.maul.geom(innerWidth, innerHeight, D.safeInsets());
        const de = document.documentElement;
        return { W:innerWidth, H:innerHeight, sw:de.scrollWidth, sh:de.scrollHeight, stick, A, hc0, hc1, pause, bug, bar:G.bar, strip:G.strip, call:G.call, la:$('la').textContent, hint:$('hc0-t').textContent, cut:T.M.cut && T.M.cut.kind };
      });
      const meet = (a, b) => a.on !== false && b.on !== false && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
      const box = r => ({ l:r.x - 4, t:r.y - 4, r:r.x + r.w + 4, b:r.y + r.h + 4 });
      for (const moment of ['bind', 'drive']) {
        if (moment === 'drive') await page.evaluate(() => { const T = window.__tryline, M = T.M, inp = T.inputs[0]; M.paused = false; let n = 0; while (M.cut && M.cut.t < 2.4 && n++ < 400) { if (n % 9 === 0 && M.cut.t > 1) inp.aPressed = true; inp.jy = M.cut.team === 0 ? 0.8 : -0.6; T.update(T.STEP); } inp.jy = 0; M.paused = true; T.debug.render(T.STEP); T.debug.updateHud(); });   // held still (no pause card) for the measure and the picture: the page's own frame loop would play on
        const m = await measure();
        ok(m.cut === 'maul', `${name} ${moment}: still in the close-up`);
        ok(m.sw <= m.W && m.sh <= m.H, `${name} ${moment}: nothing scrolls (${m.sw}x${m.sh} in ${m.W}x${m.H})`);
        const bar = box(m.bar), strip = box(m.strip), callBox = { l:m.W*0.5 - 120, r:m.W*0.5 + 120, t:m.call.y - m.call.size*0.5, b:m.call.y + m.call.size*0.5 };
        ok(!meet(bar, m.stick) && !meet(bar, m.A), `${name} ${moment}: the bar clears the stick and Push`);
        ok(!meet(callBox, m.stick) && !meet(callBox, m.A) && !meet(callBox, m.hc0) && !meet(callBox, m.bug), `${name} ${moment}: the call clears the stick, Push, the hints card and the scorebug`);
        ok(!meet(strip, m.stick) && !meet(strip, m.A) && !meet(strip, m.pause) && !meet(strip, m.hc0) && !meet(strip, m.hc1) && !meet(strip, m.bug), `${name} ${moment}: the strip clears Pause, Push, the stick, the hints card and the scorebug`);
        ok(m.la === 'Push' && m.hint === 'Maul', `${name} ${moment}: Push, and the hints card names the Maul (${m.la}, ${m.hint})`);
        if (shots && touch) await page.screenshot({ path:path.join(shots, `maul-${w}x${h}-${role}-${moment}.png`) });
      }
      await ctx.close();
    }
    // two player: both hints cards up, no touch controls; the strip goes bottom right, clear of Player 2's card, the bar and its codes
    for (const [w, h] of [[844, 390], [667, 375]]) {
      const ctx = await browser.newContext({ viewport:{ width:w, height:h }, deviceScaleFactor:2 });
      const page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
      await page.waitForFunction(() => window.__tryline && window.__tryline.M, null, { timeout:15000 });
      await page.evaluate(() => document.fonts && document.fonts.ready.then(() => true));
      const m = await page.evaluate(() => {
        const T = window.__tryline, D = T.debug, S = D.settings(), N = T.teams.NATIONS, L = T.maul, $ = i => document.getElementById(i);
        S.tut = D.TUT_IDS.slice(); S.twoHints = [true, true]; S.coach = false; S.cam = 0;
        D.setTwo(true); D.startMatch(N[0], N[1], false, { two:true, levels:[1, 1] });
        const M = T.M, P = M.players, b = M.ball;
        M.phase = 'play'; M.set = null; M.cut = null; M.contact = null; M.clock = 40;
        for (const p of P) Object.assign(p, { vx:0, vy:0, down:0, tcd:0, bind:null, offside:0 });
        const own = P.filter(p => p.team === 0), opp = P.filter(p => p.team === 1);
        own.forEach((p, i) => { p.x = 40 + i; p.y = 5 + i*10; }); opp.forEach((p, i) => { p.x = 20 + i; p.y = 5 + i*10; });
        const c = own.find(p => p.n === 2), q = opp[0], mate = own.find(p => p.n === 1); Object.assign(mate, { x:57.5, y:30.6 });
        let k = null; for (let i = 0; i < 400 && !k; i++) { Object.assign(c, { x:60, y:30, vx:6, bind:null }); Object.assign(q, { x:61.2, y:30, vx:-3, tcd:0, down:0, bind:null }); M.contact = null; b.state = 'held'; b.carrier = c; M.poss = 0; T.sides.side(0).ctrl = c; const kk = T.contact.commitTackle(q, c, 'ai'); if (kk.T > 0) { kk.tier = 'wrap'; kk.aiOff = null; k = kk; } else T.contact.releaseBind(kk); }
        L.press(0); for (let i = 0; i < 40 && M.phase !== 'cut'; i++) T.update(T.STEP);
        let n = 0; while (M.cut && M.cut.t < 1.12 && n++ < 400) { if (M.cut.t > 1.0 && !M.cut.hit[0]) T.inputs[0].aPressed = true; T.update(T.STEP); }
        M.paused = true; D.render(T.STEP); D.updateHud();
        const R = e => { const r = e.getBoundingClientRect(); return { l:r.left, t:r.top, r:r.right, b:r.bottom, on:!e.hidden && r.width > 0 }; };
        const G = L.geom(innerWidth, innerHeight, D.safeInsets(), true), de = document.documentElement;
        return { W:innerWidth, H:innerHeight, sw:de.scrollWidth, sh:de.scrollHeight, hc0:R($('hc0')), hc1:R($('hc1')), pause:R($('b-pause')), bug:R(document.querySelector('.bug')), bar:G.bar, strip:G.strip, cut:M.cut && M.cut.kind, hint:[$('hc0-t').textContent, $('hc1-t').textContent] };
      });
      const meet = (a, b) => a.on !== false && b.on !== false && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
      const strip = { l:m.strip.x - 4, t:m.strip.y - 4, r:m.strip.x + m.strip.w + 4, b:m.strip.y + m.strip.h + 4 }, barRow = { l:m.bar.x - 60, t:m.bar.y - 8, r:m.bar.x + m.bar.w + 60, b:m.bar.y + m.bar.h + 8 };
      ok(m.cut === 'maul' && m.hint.join() === 'Maul,Maul' && m.hc0.on && m.hc1.on, `two player ${w}x${h}: the close-up with both hints cards up (${m.hint.join(', ')})`);
      ok(m.sw <= m.W && m.sh <= m.H, `two player ${w}x${h}: nothing scrolls`);
      ok(!meet(strip, m.hc0) && !meet(strip, m.hc1) && !meet(strip, m.pause) && !meet(strip, m.bug) && !meet(strip, barRow) && strip.b < m.H*0.93, `two player ${w}x${h}: the strip clears both hints cards, Pause, the scorebug, the bar and its codes, and the cue line (${m.strip.x.toFixed(0)},${m.strip.y.toFixed(0)})`);
      if (shots) await page.screenshot({ path:path.join(shots, `maul-${w}x${h}-two-drive.png`) });
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
}

// --balance: the README's tables (The maul). ai: seeded AI v AI, the same seeds with the maul off and on; bot: the harness's ordinary
// player against the CPU on each level, off and on (its matches are headless, so every maul is driven in the world); cut: the close-up
// by tap rate, attacking and defending, mid-field and 5m out, each level, equal packs
async function balance(part, n) {
  const KEYS = ['tries', 'points', 'turnovers', 'jolts', 'maulCall', 'mauls', 'maul_try', 'maul_use', 'maul_held', 'maulM', 'scrums', 'rucks', 'knocks', 'pens', 'offloads'];
  const row = (label, S, m) => console.log(label.padEnd(16) + KEYS.map(k => `${k} ${(S[k]/m).toFixed(2)}`).join('  '));
  const add = (S, st, score, tries) => { S.tries += tries[0] + tries[1]; S.points += score[0] + score[1]; for (const k of KEYS.slice(2)) S[k] += st[k] || 0; };
  const zero = () => Object.fromEntries(KEYS.map(k => [k, 0]));
  if (part === 'ai' || part === 'all') {
    const N = n || 300;
    console.log(`AI v AI, ${N} matches, 4-minute halves, Normal, seeds 5000 to ${5000 + N - 1}, the same seeds off and on (per match)`);
    for (const on of [false, true]) {
      MAUL.on = on; const S = zero();
      for (let i = 0; i < N; i++) { reseed(5000 + i); const a = i % 12, b = (a + 1 + (i % 11)) % 12; T.newMatch(X.NATIONS[a], X.NATIONS[b], { halfLen:240, diff:1, auto:true, headless:true }); let s = 0; while (!T.M.over && s++ < 400000) T.update(STEP); add(S, T.M.stats, T.M.score, T.M.tries); }
      row(on ? 'maul on' : 'maul off', S, N);
    }
    MAUL.on = true;
  }
  if (part === 'bot' || part === 'all') {
    const N = n || 60;
    console.log(`\nthe bot against the CPU, ${N} matches a level, 4-minute halves, duels live, seeds 7000 on (per match: for-against)`);
    for (const diff of [0, 1, 2]) for (const on of [false, true]) {
      MAUL.on = on; let w = 0, d = 0, pf = 0, pa = 0, tf = 0, ta = 0, m0 = 0, m1 = 0, mt0 = 0, mt1 = 0;
      for (let i = 0; i < N; i++) {
        reseed(7000 + diff*1000 + i); const a = i % 6, b = (a + 1 + (i % 5)) % 6;
        T.newMatch(a, b, { halfLen:240, diff, headless:true, duels:'live' }); let s = 0; while (!T.M.over && s++ < 500000) { bot(); T.update(STEP); }
        const Mm = T.M; pf += Mm.score[0]; pa += Mm.score[1]; tf += Mm.tries[0]; ta += Mm.tries[1]; if (Mm.score[0] > Mm.score[1]) w++; else if (Mm.score[0] === Mm.score[1]) d++;
        m0 += Mm.stats.maul0 || 0; m1 += Mm.stats.maul1 || 0;
      }
      console.log(`${['Easy', 'Normal', 'Hard'][diff].padEnd(7)} ${on ? 'on ' : 'off'}  won ${(100*w/N).toFixed(1)}% drawn ${(100*d/N).toFixed(1)}%  points ${(pf/N).toFixed(1)}-${(pa/N).toFixed(1)}  tries ${(tf/N).toFixed(2)}-${(ta/N).toFixed(2)}  mauls the CPU's ${(m1/N).toFixed(2)} (the bot never calls one)`);
    }
    MAUL.on = true;
  }
  if (part === 'ibot' || part === 'all') {
    const N = n || 30;
    console.log(`\nthe bot against the CPU in matches you play (close-ups open: the bot taps 5.5 a second in a maul, MAUL_RATE to change), ${N} a level, 4-minute halves, duels live, seeds 8000 on (per match: for-against)`);
    for (const diff of [0, 1, 2]) for (const on of [false, true]) {
      MAUL.on = on; let w = 0, d = 0, pf = 0, pa = 0, tf = 0, ta = 0, m1 = 0, held = 0, mt = 0;
      for (let i = 0; i < N; i++) {
        reseed(8000 + diff*1000 + i); const a = i % 6, b = (a + 1 + (i % 5)) % 6;
        T.newMatch(a, b, { halfLen:240, diff, headless:false, duels:'live', arcade:true }); D.setMode('match'); playOut(() => bot(0));
        const Mm = T.M; pf += Mm.score[0]; pa += Mm.score[1]; tf += Mm.tries[0]; ta += Mm.tries[1]; if (Mm.score[0] > Mm.score[1]) w++; else if (Mm.score[0] === Mm.score[1]) d++;
        m1 += Mm.stats.maul1 || 0; held += Mm.stats.maul_held || 0; mt += Mm.stats.maul_try || 0;
      }
      D.setMode('menu');
      console.log(`${['Easy', 'Normal', 'Hard'][diff].padEnd(7)} ${on ? 'on ' : 'off'}  won ${(100*w/N).toFixed(1)}% drawn ${(100*d/N).toFixed(1)}%  points ${(pf/N).toFixed(1)}-${(pa/N).toFixed(1)}  tries ${(tf/N).toFixed(2)}-${(ta/N).toFixed(2)}  the CPU's mauls ${(m1/N).toFixed(2)} (held up ${(held/N).toFixed(2)}, tries ${(mt/N).toFixed(2)})`);
    }
    MAUL.on = true;
  }
  if (part === 'cut' || part === 'all') {
    const N = n || 200;
    console.log(`\nthe close-up, ${N} a cell, ENG v FRA (equal Power), taps jittered 18%, the stick left alone: try / Use It / Held Up, and metres`);
    for (const [label, ct, cx] of [['attacking, mid-field', 0, 60], ['attacking, 5m out', 0, 104.7], ['defending, mid-field', 1, 60], ['defending, 5m out', 1, 15.3]]) {
      console.log(label);
      for (const rate of [0, 4, 5, 6, 7]) {
        const cells = [];
        for (const diff of [0, 1, 2]) {
          T.newMatch(X.NATIONS[0], X.NATIONS[1], { halfLen:240, diff, headless:false, duels:'off' }); D.setMode('match');
          const t = { try:0, use:0, held:0 }; let metres = 0;
          for (let i = 0; i < N; i++) {
            reseed(9000 + diff*1000 + i);
            const s = bind({ ct, cx, cy:35, mate:2.5 }, 'wrap'); let cut = null;
            if (ct === 0) { inputs[0].bPressed = true; T.update(STEP); run(() => M().phase === 'cut', 40); cut = M().cut; }
            else { s.k.maul = null; L.call(s.k, s.mate); run(() => M().phase === 'cut', 40); cut = M().cut; }
            if (!cut || cut.kind !== 'maul') continue;
            let next = MAUL.set + Math.random()*0.12, g = 0;
            while (M().cut === cut && !cut.result && g++ < 2000) { if (rate > 0 && cut.t >= next) { inputs[0].aPressed = true; next = cut.t + Math.max(0.05, (1/rate)*(1 + 0.18*gauss())); } T.update(STEP); }
            t[cut.result]++; metres += cut.fwd; quiet();
            while (M().phase === 'cut' && g++ < 4000) T.update(STEP);
            if (M().over || M().score[0] + M().score[1] > 60) { T.newMatch(X.NATIONS[0], X.NATIONS[1], { halfLen:240, diff, headless:false, duels:'off' }); D.setMode('match'); }
          }
          const p = k => String(Math.round(100*t[k]/N)).padStart(3);
          cells.push(`${['Easy', 'Normal', 'Hard'][diff]} ${p('try')} /${p('use')} /${p('held')}  ${(metres/N).toFixed(1)}m`);
        }
        console.log(`  ${(rate ? rate + '/s' : 'no taps').padEnd(8)} ${cells.join('    ')}`);
      }
    }
  }
}
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
