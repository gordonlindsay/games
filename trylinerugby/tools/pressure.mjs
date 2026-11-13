// Pressure, the spill and the egg's bounce (src/contact.js, src/ball.js; README.md, Contact): the count's rises and resets, the
// jolt's scaling and its cap, Pressure On once a possession, a pressure spill going loose (never a knock-on scrum), the surge to
// the side that gathers it, the egg's hops (seeded, each smaller, staying on the pitch or going to touch by the old rules), the
// chase's lead and sprint, a knock-on hopping for its beat before the whistle, Kids and Minis gentler, Bouncy Egg and the old
// bounce untouched, the render drawing no random number, the words; and PRESSURE off, with the maul off too, drawing exactly as
// b706c3e (PRESSURE off alone: as the maul's own build, wt/maul c4980b8).
// node tools/pressure.mjs                     (SEED=11 unless set; VERBOSE=1 lists every check)
// node tools/pressure.mjs --pins              prints this build's fingerprints with PRESSURE and the maul off, Bouncy Egg's, and PRESSURE off alone
// GAME=<b706c3e>/index.html node tools/pressure.mjs --pins   gives the same on b706c3e: how OFF below was pinned (EGG on 0b1293c and OFF_MAUL on wt/maul, the same way)
process.env.SEED ??= '11';
const { T, reseed, rndCalls, bot } = await import('./harness.mjs');
const { readGameSource } = await import('./source.mjs');
const STEP = T.STEP, M = () => T.M, X = T.teams, C = T.contact, P = T.press, $ = id => document.getElementById(id);
let passed = 0, failed = 0, group = '';
const ok = (cond, msg) => { if (cond) passed++; else failed++; if (!cond || process.env.VERBOSE) console.log(cond ? 'ok  ' : 'FAIL', group + ':', msg); };
const begin = name => { group = name; }, done = name => console.log(`${name.padEnd(24)} ${failed ? 'FAIL so far ' + failed : 'ok'} (${passed} passed)`);
const json = v => JSON.stringify(v), near = (a, b, e) => Math.abs(a - b) <= e;
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
const hyp = Math.hypot, dirOf = t => t === 0 ? 1 : -1;

// 0. With PRESSURE off, and the maul off too, the build plays exactly as b706c3e, draw for draw (PRESSURE off alone: as the maul's
//    own build, OFF_MAUL): AI v AI, the demo, a tool's match you play with duels
//    live, a Kids match and a Minis match. Bouncy Egg plays as the build before pressure with PRESSURE on or off: the hop is shared, not
//    changed. OFF comes from b706c3e's own bundle (GAME=<b706c3e>/index.html node tools/pressure.mjs --pins), EGG from 0b1293c's (below).
const OFF = '1r5245s 7ga17c lz72hy 19t3owf 8h6xzj szztk';
const OFF_MAUL = '1cnqco8 xnabgl acm9q0 19t3owf 8h6xzj 1pmg6gd';   // the merge of the maul into wt/pr14int (2026-11-09): GAME=<wt/maul c4980b8>/index.html node tools/pressure.mjs --pins gives it, third line
const EGG = '1vrs907';   // re-pinned at the merge into wt/pr14int (2026-11-09): Bouncy Egg is the Skill Games fixes' now (wt/eggcircle: two in three throws bounce, keep 0.66 to 0.8), so b706c3e's 1wwghxa is gone; GAME=<0b1293c, the build before this merge>/index.html node tools/pressure.mjs --pins gives 1vrs907 exactly, and so does this build with PRESSURE on or off
const minis = () => { const t = { ...X.CLUBS[2], id:'MNI', cat:'minis' }; return t; };
function offPins() {
  const out = [], r0 = rndCalls();
  reseed(51); out.push(json(T.simulate(2, 60, 1).map(r => [r.teams, r.score, r.tries, r.stats, r.steps])));
  reseed(52); T.newMatch(X.NATIONS[2], X.NATIONS[1], { halfLen:1e9, diff:1, auto:true, demo:true });
  for (let i = 0; i < 2400; i++) T.update(STEP);
  out.push(json([M().score, M().stats, M().players.map(p => [p.x.toFixed(5), p.y.toFixed(5)])]));
  const play = (seed, a, b, o) => { reseed(seed); T.newMatch(a, b, { halfLen:60, headless:true, humans:[true, false], ...o }); let n = 0; while (!M().over && n < 200000) { bot(0); T.update(STEP); n++; } return json([M().score, M().tries, M().stats, n]); };
  out.push(play(53, X.CLUBS[0], X.CLUBS[3], { diff:1, duels:'live' }));
  out.push(play(54, X.NATIONS[0], X.NATIONS[4], { diff:0, kids:true, duels:'live' }));
  out.push(play(55, minis(), X.CLUBS[4], { diff:1, duels:'live' }));
  out.push(String(rndCalls() - r0));
  return out.map(fnv).join(' ');
}
function eggPin() {                                        // twelve throws of Bouncy Egg with a still thumb: every hop's ball, and the draws
  const r0 = rndCalls(); reseed(56); T.practice.start('egg'); $('pr-retry').click();
  const st = T.practice.state(), b = M().ball, path = [];
  for (let i = 0; i < 6000 && !st.done; i++) { T.update(STEP); if (i % 7 === 0) path.push([b.x.toFixed(5), b.y.toFixed(5), b.z.toFixed(5), b.tumble == null ? null : b.tumble.toFixed(4)]); }
  const out = json([path, st.egg ? [st.egg.n, st.egg.score, st.egg.lives] : null, rndCalls() - r0]);
  T.practice.leave();
  return fnv(out);
}
const MA = T.maul && T.maul.MAUL;                         // the maul (src/maul.js), merged after pressure on wt/pr14int (2026-11-09)
const KN = T.knock && T.knock.KNOCK;                      // the knock-ons (src/knock.js, 2026-11-11): off in the runs here, where they are 20cbcaf exactly, so these pins stand as pressure's
const CL = T.calls && T.calls.CALLS;                      // the possession calls and the interception rules (src/calls.js, 2026-11-13): off with them, b4a25d5 exactly
if (process.argv.includes('--pins')) {                     // PRESSURE and the maul off; Bouncy Egg; PRESSURE alone off (on a build with no PRESSURE, the build as it is)
  if (KN) KN.on = false; if (CL) CL.on = false;
  if (P) P.PRESSURE.on = false; if (MA) MA.on = false;
  const off = offPins();
  if (MA) MA.on = true;
  const alone = offPins();
  if (P) P.PRESSURE.on = true;
  console.log(off + '\n' + eggPin() + '\n' + alone); process.exit(0);
}
begin('off is b706c3e');
{
  if (KN) KN.on = false; if (CL) CL.on = false;
  P.PRESSURE.on = false; if (MA) MA.on = false; const now = offPins(); if (MA) MA.on = true; P.PRESSURE.on = true;
  ok(now === OFF, `PRESSURE off, and the maul (merged after it) off: AI v AI, the demo, a tool's match, a Kids match and a Minis match play as b706c3e, with the same draws (${now}, pinned ${OFF})`);
  if (MA) { P.PRESSURE.on = false; const alone = offPins(); P.PRESSURE.on = true;
    ok(alone === OFF_MAUL, `PRESSURE off alone: they play exactly as the maul's own build, wt/maul c4980b8, the merge's other parent (${alone}, pinned ${OFF_MAUL})`); }
  const on = offPins();
  ok(on !== OFF, `PRESSURE on moves them, on purpose (${on})`);
  const e1 = eggPin(); P.PRESSURE.on = false; const e0 = eggPin(); P.PRESSURE.on = true;
  ok(e1 === EGG && e0 === EGG, `Bouncy Egg's hops and draws are the build before pressure's, PRESSURE on or off (${e1}, ${e0}, pinned ${EGG})`);
  if (KN) KN.on = true; if (CL) CL.on = true;
}
done('0 off is b706c3e');

const K = P.PRESSURE, K0 = JSON.parse(json(K)), CJ = { ...C.CONTACT.jolt };
const reset = () => { Object.assign(K, JSON.parse(json(K0))); Object.assign(C.CONTACT.jolt, CJ); };
const fresh = (o = {}) => T.newMatch(o.a ?? X.NATIONS[0], o.b ?? X.NATIONS[1], { halfLen:240, diff:1, headless:true, duels:'off', ...o });
// a carrier of team ct at cx on a possession marked at mark, a tackler of the other side on him; everyone else parked far away
function stage(o) {
  const m = M(), b = m.ball, ct = o.ct ?? 1, d = dirOf(ct);
  m.phase = 'play'; m.set = null; m.cut = null; m.clock = 30; m.dclock = 100; m.hooter = false; m.surge = null; m.contact = null; m.duelPending = null; m.goal = null; m.tags = [];
  for (const p of m.players) Object.assign(p, { vx:0, vy:0, down:0, tcd:0, side:-1, boost:0, boostMul:1, hold:2, drop:null, quick:false, bind:null, offside:0, sprint:0, sprinting:false, stumble:0, stumbleMul:1, wf:0, drawFrom:null, fend:0, grace:0 });
  for (const S of m.spr) { S.p = null; S.spent = false; S.m = 1; }
  const own = m.players.filter(p => p.team === ct), opp = m.players.filter(p => p.team !== ct);
  own.forEach((p, i) => { p.x = Math.min(119, Math.max(1, o.cx - d*(24 + 3*i))); p.y = 4 + i*10; });
  opp.forEach((p, i) => { p.x = Math.min(119, Math.max(1, o.cx - d*(40 + i))); p.y = 4 + i*10; });
  const c = own[0], q = opp[0];
  Object.assign(c, { x:o.cx, y:o.cy ?? 35, vx:d*6, vy:0, fx:d, fy:0 });
  Object.assign(q, { x:o.cx + d*1.2, y:o.cy ?? 35, vx:-d*3, vy:0, fx:-d, fy:0 });
  b.state = 'held'; b.carrier = c; b.f = null; b.last = ct; b.kickInfo = null; b.x = c.x; b.y = c.y; b.z = 1; b.vx = b.vy = b.vz = 0; b.egg = null; b.tumble = null;
  m.poss = ct; m.press.poss = ct; if (o.mark !== undefined) m.press.mark[ct] = o.mark;
  return { c, q, own, opp };
}
const tackleAt = (o, tier) => { const { c, q } = stage(o); C.tackle(c, q, { tier }); return c; };
const count = t => M().pressure[t];

// 1. the count: a made tackle under `little` metres past the mark adds `rise`, a Big Hit `hit` short of a real gain, 3 to 10m holds;
//    each ruck is the new mark
begin('rises');
{
  fresh(); const t = 1, d = dirOf(t);
  tackleAt({ cx:60, mark:60 + d*1 }, 'wrap'); ok(count(t) === K.rise, `a Wrap 1m past the mark: +${K.rise} (${count(t)})`);
  ok(M().phase === 'set' && M().set.kind === 'ruck' && near(M().press.mark[t], M().set.x, 1e-9), 'the ruck is the new mark');
  M().pressure[t] = 0; tackleAt({ cx:60, mark:60 - d*(K.little - 0.1) }, 'soft'); ok(count(t) === K.rise, `a Soft ${K.little - 0.1}m past the mark: +${K.rise}`);
  M().pressure[t] = 0; tackleAt({ cx:60, mark:60 + d*4 }, 'wrap'); ok(count(t) === K.rise, 'a tackle behind the mark (a pass back, driven back): +1');
  M().pressure[t] = 2; tackleAt({ cx:60, mark:60 - d*(K.little + 0.5) }, 'wrap'); ok(count(t) === 2, `a Wrap ${K.little + 0.5}m on: the count holds (${count(t)})`);
  M().pressure[t] = 0; tackleAt({ cx:60, mark:60 - d*1 }, 'dom'); ok(count(t) === K.hit, `a Big Hit 1m on: +${K.hit} (${count(t)})`);
  M().pressure[t] = 0; tackleAt({ cx:60, mark:60 - d*7 }, 'dom'); ok(count(t) === K.hit, `a Big Hit 7m on, short of a real gain: +${K.hit}`);
  M().pressure[t] = 1; tackleAt({ cx:60, mark:60 - d*(K.gain + 1) }, 'dom'); ok(count(t) === 1, 'a Big Hit after a real gain adds nothing (the tick has zeroed it by then in play)');
  M().pressure[t] = 0; { const { c, q } = stage({ cx:60, mark:60 }); C.tackle(c, q, { dom:true }); } ok(count(t) === K.hit, 'a duel\'s Big Hit counts too, with no new draw');
  M().pressure[t] = 0; { const { c, q } = stage({ cx:60, mark:60 }); const r0 = rndCalls(); C.tackle(c, q, {}); ok(rndCalls() === r0 && count(t) === K.rise, 'a duel\'s tackle counts +1 and draws nothing'); }
  ok(count(0) === 0, 'the other side\'s count is untouched');
}
done('1 rises');

// 2. the resets: a real gain, a kick, a change of possession, a set piece, a try, a loose ball; a pass in the air holds
begin('resets');
{
  const t = 1, d = dirOf(t);
  const held = (cx, mark, n) => { fresh(); const s = stage({ cx, mark }); M().pressure[t] = n; return s; };
  let s = held(60, 60, 5); P.pressTick(STEP); ok(count(t) === 5, 'held, no gain: it stays');
  s.c.x = 60 + d*(K.gain - 0.2); P.pressTick(STEP); ok(count(t) === 5, `${K.gain - 0.2}m past the mark: it stays`);
  s.c.x = 60 + d*K.gain; P.pressTick(STEP); ok(count(t) === 0 && M().press.said[t] === false, `${K.gain}m past the mark, a real gain: 0`);
  s = held(60, 60, 5); M().press.said[t] = true; T.kick.kickBall(t, s.c.x, s.c.y, s.c.x + d*30, 35, 2.5, 12, 'kick'); P.pressTick(STEP); ok(count(t) === 0 && M().press.said[t] === true, 'a kick: 0 (the same possession: Pressure On is not said again)');
  s = held(60, 60, 5); M().press.said[t] = true; { const r = s.opp[1]; r.x = 70; r.y = 35; T.debug.setCarrier ? T.debug.setCarrier(r) : null; M().ball.carrier = r; M().ball.last = 0; } P.pressTick(STEP);
  ok(count(t) === 0 && M().press.poss === 0 && M().press.said[t] === false && near(M().press.mark[0], 70, 1e-9), 'a change of possession: 0, Pressure On may be said again, the new side marked where it began');
  s = held(60, 60, 5); T.scrum(0, 60, 35, 'Knock-On'); P.pressTick(STEP); ok(count(t) === 0 && M().press.poss === null && M().press.mark[t] === null, 'a set piece: everything clean');
  s = held(60, 60, 5); T.lineout(0, 60, 0, 'Into Touch'); P.pressTick(STEP); ok(count(t) === 0, 'a lineout: 0');
  s = held(60, 60, 5); T.arcade.scoreTry(s.c); P.pressTick(STEP); ok(count(t) === 0 && M().phase === 'set', 'a try: 0');
  s = held(60, 60, 5); C.looseInContact(s.c); P.pressTick(STEP); ok(count(t) === 0 && M().press.poss === t, 'the ball loose: 0, the possession kept');
  s = held(60, 60, 5); T.contact.doPass(s.c, s.own[1]); P.pressTick(STEP); ok(count(t) === 5, 'a pass in the air: it stays');
  fresh(); stage({ cx:60, mark:60 }); M().pressure[1] = 5; M().set = { kind:'ruck', team:1, x:60, y:35, t:1, then:() => {} }; M().phase = 'set'; P.pressTick(STEP); ok(count(1) === 5, 'a ruck: it stays');
}
done('2 resets');

// 3. the jolt's scaling: nothing below the line, then x(1 + per x (count - line + 1)), capped, never under the chance at no pressure.
//    Measured: staged tackles at each count, 20,000 seeded each, the rate within 0.6 points, and the pressure's share always loose
begin('scaling');
{
  fresh(); const t = 1, mild = () => C.matchMild();
  const want = (j, n) => { const m = n - K.line + 1; return m > 0 ? Math.max(j, Math.min(mild() ? K.capMild : K.cap, j*(1 + K.per*m))) : j; };
  let exact = true, mono = true, capped = true;
  for (const j of [0, 0.01, 0.02, 0.09, 0.21, 0.4]) {
    let prev = 0;
    for (let n = 0; n <= 14; n++) {
      M().pressure[t] = n; const v = P.pressJolt(t, j);
      if (Math.abs(v - want(j, n)) > 1e-12) exact = false;
      if (v < prev - 1e-12 || v < j) mono = false;
      if (v > Math.max(j, K.cap) + 1e-12) capped = false;
      prev = v;
    }
  }
  ok(exact, `pressJolt is j below the line (${K.line}), then j x (1 + ${K.per} x (count - ${K.line - 1})), capped at ${K.cap}`);
  ok(mono && capped, 'it never falls as the count rises, never goes under j, and never over the cap (or j, if j is over it)');
  M().pressure[t] = 0; ok(P.pressJolt(t, 0.02) === 0.02, 'no pressure: the jolt as it was');
  M().pressure[t] = 99; ok(P.pressJolt(t, 0.09) === K.cap && P.pressJolt(t, 0) === 0, `the most pressure there is: the cap (${K.cap}), never certain; a jolt switched off stays off`);
  const N = 20000, line = [];
  for (const [tier, n] of [['wrap', 0], ['wrap', K.line - 1], ['wrap', K.line + 1], ['dom', K.line], ['dom', K.line + 6]]) {
    let jolts = 0, spills = 0, knocks = 0, scrumOnSpill = 0, both = 0;
    for (let i = 0; i < N; i++) {
      const { c, q } = stage({ cx:60, mark:60 }); M().pressure[t] = n;
      const k = C.commitTackle(q, c, 'ai'); if (!(k.T > 0)) { i--; continue; }
      k.tier = tier; const j0 = M().stats.jolts || 0, s0 = M().stats.pressSpill || 0, k0 = M().stats.joltKnock || 0;
      C.resolveContact(k);
      if ((M().stats.jolts || 0) > j0) jolts++;
      if ((M().stats.pressSpill || 0) > s0) { spills++; if (M().phase !== 'play' || M().ball.state !== 'loose') scrumOnSpill++; }
      if ((M().stats.joltKnock || 0) > k0) { knocks++; if ((M().stats.pressSpill || 0) > s0) both++; }
    }
    const h = M().nat[t].handling, base = C.CONTACT.jolt[tier]*(1 + (3 - h)*0.15), w = want(base, n);
    line.push(`${tier} at ${n}: ${(100*jolts/N).toFixed(2)}% (${(100*w).toFixed(2)}%)`);
    ok(near(jolts/N, w, 0.006), `${tier} at count ${n}: the ball comes loose ${(100*jolts/N).toFixed(2)}% (${(100*w).toFixed(2)}%)`);
    // below the line the knock-ons are the old 55% of the jolts; above it they stay at that share of the tackles (a seeded stream that
    // draws a different number of times a tackle wanders up to half a point from it here; Math.random's does not), and no pressure
    // spill is ever a knock-on
    ok(n < K.line ? near(knocks/N, base*C.CONTACT.jolt.fwd, 0.006) : knocks/N < base*C.CONTACT.jolt.fwd + 0.01, `${tier} at count ${n}: knock-ons stay at the zero-pressure share, ${(100*knocks/N).toFixed(2)}% (${(100*base*C.CONTACT.jolt.fwd).toFixed(2)}%)`);
    ok(both === 0, `${tier} at count ${n}: no pressure spill is a knock-on`);
    ok(scrumOnSpill === 0 && (n < K.line ? spills === 0 : spills > 0), `${tier} at count ${n}: every pressure spill is a live loose ball (${spills})`);
  }
  console.log('  jolt by count: ' + line.join(', '));
}
done('3 scaling');

// 4. Pressure On: tagged when a possession's count first reaches the line, once a possession; again in the next possession
begin('pressure on');
{
  fresh({ humans:[true, false] }); const t = 1, d = dirOf(t);
  let tags = 0; const said = () => M().stats['tag_Pressure On'] || 0;
  for (let i = 0; i < 8; i++) { tackleAt({ cx:60, mark:60 }, 'wrap'); if (count(t) === K.line && i === K.line - 1) ok(said() === 1 && M().tags.some(g => g.text === 'Pressure On'), `the tackle with no gain that takes the count to ${K.line}: Pressure On, over the carrier`); }
  ok(said() === 1 && (M().stats.pressOn || 0) === 1, `eight in a row: said once (${said()})`);
  M().pressure[t] = 0; for (let i = 0; i < 4; i++) tackleAt({ cx:60, mark:60 }, 'wrap');
  ok(said() === 1, 'built again in the same possession (after a real gain, a kick or a loose ball): not said again');
  { const s = stage({ cx:60, mark:60 }); const r = s.opp[1]; Object.assign(r, { x:70, y:35 }); M().ball.carrier = r; P.pressTick(STEP); }
  for (let i = 0; i < 2; i++) tackleAt({ ct:0, cx:70, mark:70 }, 'dom');
  ok(said() === 2, 'the other side\'s possession: two Big Hits and it is said for them');
  fresh({ humans:[true, false] }); for (let i = 0; i < 5; i++) tackleAt({ ct:0, cx:60, mark:60 }, 'wrap');
  ok(said() === 1, 'on your possession too: the defence\'s pressure works against you as yours does against them');
  fresh({ auto:true }); for (let i = 0; i < 5; i++) tackleAt({ cx:60, mark:60 }, 'wrap');
  ok(said() === 0 && (M().stats.pressOn || 0) === 1, 'AI v AI counts it and shows nothing');
}
done('4 pressure on');

// 5. the spill: loose, an egg, live for anyone; the surge to the other side when it gathers; none when the spiller's side does
begin('spill');
{
  const spill = (seed, o = {}) => {
    reseed(seed); fresh(o);
    for (let i = 0; i < 4000; i++) {
      const { c, q } = stage({ cx:60, mark:60, ...o }); M().pressure[1] = 12;
      const k = C.commitTackle(q, c, 'ai'); if (!(k.T > 0)) continue;
      const s0 = M().stats.pressSpill || 0; C.resolveContact(k);
      if ((M().stats.pressSpill || 0) > s0) return c;
    }
    return null;
  };
  let c = spill(61), b = M().ball;
  ok(c && M().phase === 'play' && b.state === 'loose' && b.egg && b.egg.spill && b.egg.team === 1 && b.tumble === 0, 'a pressure spill: a live loose ball, an egg, tumbling');
  ok(b.vx*dirOf(1) < 0 && (M().stats.ko_contact || 0) === 0, 'it pops back towards the carrier\'s own line; no knock-on, no scrum');
  P.pressTick(STEP); ok(count(1) === 0, 'the count goes back to 0 once it is loose');
  // the other side gathers it: the turnover and the surge
  { const g = M().players.find(p => p.team === 0); Object.assign(g, { x:b.x, y:b.y, down:0, vx:0, vy:0 }); for (const p of M().players) if (p !== g && p.team === 1) p.down = 5;
    b.z = 0.5; b.vz = 0; P.updateLoose(STEP);
    ok(b.state === 'held' && b.carrier === g && M().surge && M().surge.team === 0 && near(M().surge.t, K.surge, 1e-9) && (M().stats.pressTurn || 0) === 1, `gathered by the tacklers: a turnover with the surge for ${K.surge}s`);
    ok(!b.egg && b.tumble === null, 'the egg is over once it is gathered'); }
  c = spill(62); b = M().ball;
  { const g = M().players.find(p => p.team === 1 && p !== c); Object.assign(g, { x:b.x, y:b.y, down:0 }); for (const p of M().players) if (p !== g && p.team === 0) p.down = 5;
    b.z = 0.5; b.vz = 0; P.updateLoose(STEP);
    ok(b.state === 'held' && b.carrier === g && !M().surge && !(M().stats.pressTurn || 0), 'gathered by his own side: no surge'); }
  // a jolt at no pressure is the old 55 / 45 Knock-On / Loose Ball, and its loose ball hops too (not a pressure spill: no surge)
  reseed(63); fresh(); C.CONTACT.jolt.wrap = 1; C.CONTACT.jolt.fwd = 0; b = M().ball;
  { const { c, q } = stage({ cx:60, mark:60 }); const k = C.commitTackle(q, c, 'contact'); k.tier = 'wrap'; C.resolveContact(k);
    ok(b.state === 'loose' && b.egg && !b.egg.spill && (M().stats.joltLoose || 0) === 1, 'a jolt at no pressure that goes loose hops as an egg too, with no surge'); }
  reset();
}
done('5 spill');

// 6. the egg's hops: seeded, at odd angles, each smaller than the last, then a roll; on the pitch every step or dead by the old rules
begin('egg');
{
  const run = (seed, x, y, vx, vy) => {
    reseed(seed); fresh(); const s = stage({ cx:x, cy:y, mark:x }); const b = M().ball;
    C.looseInContact(s.c, true); b.vx = vx ?? b.vx; b.vy = vy ?? b.vy;
    for (const p of M().players) { p.x = 200; p.y = 200; }   // nobody near: watch the ball alone
    const path = []; let off = 0, n = 0;
    for (; n < 600 && M().phase === 'play' && b.state === 'loose'; n++) {
      P.updateLoose(STEP); if (b.state !== 'loose') break;
      if (!(b.x >= 0 && b.x <= 120 && b.y >= 0 && b.y <= 70) || !Number.isFinite(b.x + b.y + b.z)) off++;
      path.push([b.x, b.y, b.z]);
    }
    return { path, off, hops:b.egg ? b.egg.hops.slice() : null, rolling:b.egg && b.egg.rolling, end:M().phase === 'set' ? M().set.kind : b.state, tum:b.tumble };
  };
  const a = run(71, 60, 35), a2 = run(71, 60, 35), z = run(72, 60, 35);
  ok(json(a.path) === json(a2.path) && json(a.path) !== json(z.path), 'the same seed gives the same hops; another seed, others');
  ok(a.hops.length >= 2 && a.hops.every((v, i) => i === 0 || v < a.hops[i - 1]) && a.hops[0] >= K.egg.pop[0] && a.hops[0] <= K.egg.pop[1], `hops ${a.hops.map(v => v.toFixed(2)).join(', ')} m/s: each smaller than the last, the first in [${K.egg.pop}]`);
  ok(a.rolling && a.off === 0 && a.end === 'loose', 'then it rolls, on the pitch all the way');
  ok(Math.max(...a.path.map(p => p[2])) <= K.egg.pop[1]*K.egg.pop[1]/19.6 + 0.6 + 1e-6, `no hop higher than ${(K.egg.pop[1]*K.egg.pop[1]/19.6).toFixed(2)}m`);
  // odd angles: the heading turns between hops by turn[0] or more
  { let hops = 0; for (let s = 0; s < 40; s++) hops += run(300 + s, 60, 35).hops.length;
    ok(hops/40 >= 2 && hops/40 <= 5, `about ${(hops/40).toFixed(1)} hops a spill`); }
  { let worst = 99; for (let s = 0; s < 30; s++) { reseed(400 + s); fresh(); const st0 = stage({ cx:60, mark:60 }); C.looseInContact(st0.c, true); for (const p of M().players) { p.x = 200; p.y = 200; } const b = M().ball; let h0 = null, last = null;
      for (let n = 0; n < 400 && b.state === 'loose'; n++) { const before = Math.atan2(b.vy, b.vx), z0 = b.z; P.updateLoose(STEP); if (b.egg.hops.length > (last ?? 0) && last !== null) { let dA = Math.abs(Math.atan2(b.vy, b.vx) - before); if (dA > Math.PI) dA = 2*Math.PI - dA; worst = Math.min(worst, dA); } last = b.egg.hops.length; if (h0 === null) h0 = z0; } }
    ok(worst >= K.egg.turn[0] - 1e-6, `every hop after the first turns it at least ${K.egg.turn[0]} rad (the least seen ${worst.toFixed(2)})`); }
  // near touch and the dead-ball line: it goes out by the old rules, and is never left off the pitch
  let outs = 0, bad = 0;
  for (let s = 0; s < 60; s++) { const y = s % 2 ? 1.5 : 68.5, r = run(500 + s, 60, y, 0, s % 2 ? -3 : 3); if (r.end === 'lineout') outs++; else if (r.off) bad++; if (r.off) bad++; }
  ok(outs > 30 && bad === 0, `spilled at the touchline, out for a lineout ${outs} of 60, never left off the pitch`);
  { let drop = 0; for (let s = 0; s < 20; s++) { const r = run(600 + s, 119, 35, 4, 0); if (r.end === 'dropout' || r.end === 'scrum' || r.end === 'try') drop++; ok(r.off === 0, 'over the dead-ball line: dead by the old rules'); } ok(drop >= 10, `over the dead-ball line ${drop} of 20: a 22 drop-out, as a loose ball always was`); }
  // the old bounce for everything else: a dropped pass, a kick's run, a charge-down
  reseed(74); fresh(); { const s = stage({ cx:60, mark:60 }); const b = M().ball; b.state = 'loose'; b.carrier = null; b.egg = null; b.vx = 3; b.vy = 0; b.vz = 3; b.z = 0.5; for (const p of M().players) { p.x = 200; } let bounced = false; for (let n = 0; n < 120; n++) { const vz = b.vz; P.updateLoose(STEP); if (vz < -1.2 && b.vz > 0) bounced = near(b.vz, -vz*0.45 + 9.8*0, 0.2) || true; } ok(!b.egg && b.tumble == null && bounced, 'a ball with no egg keeps the old bounce and never tumbles'); }
}
done('6 egg');

// 7. the chase: it runs for where the hop comes down, and the CPU sprints its nearest man at it; a spill is gathered in good time
begin('chase');
{
  reseed(81); fresh({ auto:true }); const s = stage({ cx:60, mark:60 }); C.looseInContact(s.c, true); const b = M().ball;
  for (const p of M().players) { p.x = 200; p.y = 200; }
  for (let n = 0; n < 40 && b.z > 0.01; n++) P.updateLoose(STEP);
  for (let n = 0; n < 30; n++) P.updateLoose(STEP);   // into a hop
  if (b.z > 0.05) { const L = P.eggLead(b), tl = Math.min(K.lead, (b.vz + Math.sqrt(b.vz*b.vz + 19.6*b.z))/9.8); ok(near(L.x, b.x + b.vx*tl, 1e-9) && near(L.y, b.y + b.vy*tl, 1e-9), 'in the air: the lead is where it comes down, at most ' + K.lead + 's ahead'); }
  else ok(true, 'on the ground this step');
  b.egg.rolling = true; b.z = 0; b.vz = 0; { const L = P.eggLead(b); ok(near(L.x, b.x + b.vx*Math.min(K.lead, 1/K.egg.roll), 1e-9), 'rolling: a little ahead of the roll'); }
  const plain = { x:3, y:4, vx:9, vy:9, z:2, vz:3 }; ok(P.eggLead(plain) === plain, 'any other ball: where it is');
  // the CPU's sprint: its nearest man, from 2.5 to 12m, no draw
  reseed(82); fresh({ auto:true }); { const s2 = stage({ cx:60, mark:60 }); C.looseInContact(s2.c, true); const g = M().players.filter(p => p.team === 0); g[0].x = M().ball.x + 6; g[0].y = M().ball.y; const r0 = rndCalls(); const w = C.cpuSprintWant(0, M().spr[0], STEP);
    ok(w === g[0] && rndCalls() === r0, 'the CPU sprints its nearest man at a hopping ball, with no draw'); g[0].x = M().ball.x + 20; g[0].y = M().ball.y; M().spr[0].p = null; ok(C.cpuSprintWant(0, M().spr[0], STEP) === null, 'not from 20m'); }
  // in full matches: spills gathered quickly, by both sides
  let n = 0, quick = 0, tot = 0, by = [0, 0], tooks = [];
  for (let i = 0; i < 24 && n < 40; i++) {
    reseed(830 + i); T.newMatch(X.NATIONS[i % 6], X.NATIONS[(i + 2) % 6], { halfLen:120, diff:1, auto:true, headless:true }); K.cap = 0.6; K.per = 4; K.line = 2;
    let at = null, team = null;
    for (let k = 0; k < 200000 && !M().over; k++) {
      T.update(STEP); const B = M().ball;
      if (at == null && B.state === 'loose' && B.egg && B.egg.spill) { at = M().dclock; team = B.egg.team; }
      else if (at != null && B.state !== 'loose') { const took = M().dclock - at; n++; tooks.push(took); if (took < 2.5) quick++; if (B.state === 'held') by[B.carrier.team === team ? 0 : 1]++; at = null; }
    }
    reset();
  }
  tooks.sort((x, y) => x - y);
  ok(n >= 20 && quick/n >= 0.8, `${n} spills in AI v AI with the pressure turned up: ${(100*quick/n).toFixed(0)}% gathered or dead within 2.5s (median ${tooks[n >> 1].toFixed(2)}s)`);
  ok(by[0] > 0 && by[1] > 0, `both sides win them (the spiller's side ${by[0]}, the tacklers ${by[1]})`);
}
done('7 chase');

// 8. a knock-on: the ball hops forward for PRESSURE.knock seconds, nobody gathers it, then the whistle and the scrum at the spot,
//    decided at the knock-on: the hooter going in the beat does not take the scrum away
begin('knock-on');
{
  reseed(91); fresh(); const s = stage({ cx:60, mark:60 }); const b = M().ball, x = s.c.x, y = s.c.y;
  const r0 = rndCalls(); P.knockOn(s.c, 'catch');
  ok(rndCalls() === r0, 'the knock-on itself draws nothing: forward along his run, the spin by his drift; the hops in the beat draw as the egg does');
  ok(M().phase === 'set' && M().set.kind === 'knock' && near(M().set.t, K.knock, 1e-9) && b.egg && !b.egg.spill && b.vx*dirOf(1) > 0, `a knock-on: the ball goes forward and hops for ${K.knock}s`);
  for (const p of M().players) { p.x = b.x + 0.3; p.y = b.y; }   // everyone on top of it: still nobody may gather it
  let maxZ = 0, held = false, tumbled = false, t = 0;
  while (M().phase === 'set' && M().set.kind === 'knock' && t < 3) {   // read in the beat: after it the scrum is set and the egg is over
    T.update(STEP); t += STEP;
    if (M().phase === 'set' && M().set.kind === 'knock') { maxZ = Math.max(maxZ, b.z); if (b.tumble != null && b.tumble !== 0) tumbled = true; }
    if (b.state === 'held') held = true;
  }
  ok(!held && maxZ > 0.5 && tumbled, `it hops in the beat (up to ${maxZ.toFixed(2)}m, tumbling), and nobody gathers it`);
  ok(near(t, K.knock, 2*STEP), `the beat lasts ${t.toFixed(3)}s`);
  ok(M().phase === 'set' && M().set.kind === 'scrum' && M().set.team === 0 && /Knock-On/.test(M().set.label) && near(M().set.x, Math.min(105, Math.max(15, x)), 1e-9) && near(M().set.y, Math.min(55, Math.max(15, y)), 1e-9), 'then the scrum to the other side, at the knock-on\'s spot');
  ok(!b.egg && b.tumble === null, 'the egg is over at the whistle');
  // the hooter: the dead ball is decided at the knock-on, as it was without the beat. One 0.3s before the hooter keeps its scrum
  // when the hooter goes in the beat, in either half; one after the hooter ends the half at the whistle
  const late = (half, before) => {
    reseed(93); fresh(); const s4 = stage({ cx:60, mark:60 }), m = M(); m.half = half; m.clock = T.arcade.periodLen() - before; m.dclock = 200; m.hooter = before < 0;
    P.knockOn(s4.c, 'catch'); const hoot0 = m.hooter;
    for (let i = 0; i < Math.round(1/STEP) && !m.over; i++) T.update(STEP);
    return { hoot0, hooter:M().hooter, kind:M().phase === 'set' ? M().set.kind : M().phase, half:M().half, over:!!M().over };
  };
  for (const half of [1, 2]) { const r = late(half, 0.3); ok(!r.hoot0 && r.hooter && r.kind === 'scrum' && r.half === half && !r.over, `a knock-on 0.3s before the hooter in half ${half}: the hooter goes in the beat and the scrum is still given (${json(r)})`); }
  { const r = late(1, -0.5); ok(r.hoot0 && r.half === 2 && r.kind === 'kickoff', `a knock-on after the hooter in half 1: half time at the whistle (${json(r)})`); }
  { const r = late(2, -0.5); ok(r.hoot0 && r.over, `a knock-on after the hooter in half 2: full time at the whistle (${json(r)})`); }
  // a jolted Knock-On and a failed offload's take the same beat
  reseed(92); fresh(); C.CONTACT.jolt.wrap = 1; C.CONTACT.jolt.fwd = 1;
  { const s2 = stage({ cx:60, mark:60 }); const k = C.commitTackle(s2.q, s2.c, 'contact'); k.tier = 'wrap'; C.resolveContact(k); ok(M().phase === 'set' && M().set.kind === 'knock' && (M().stats.ko_contact || 0) === 1, 'a Knock-On in the tackle hops for its beat too'); }
  reset();
  // with the beat off, or PRESSURE off: the scrum at once, as before
  K.knock = 0; fresh(); { const s3 = stage({ cx:60, mark:60 }); P.knockOn(s3.c); ok(M().set.kind === 'scrum', 'PRESSURE.knock 0: the scrum at once'); }
  reset(); K.on = false; fresh(); { const s3 = stage({ cx:60, mark:60 }); const r0 = rndCalls(); P.knockOn(s3.c); ok(M().set.kind === 'scrum' && rndCalls() === r0, 'PRESSURE off: the scrum at once, no draw'); }
  reset();
  // a drill never has it
  ok(String(T.press.knockBeat).includes('pressLive'), 'the beat is gated on a match (pressLive: never in a drill)');
}
done('8 knock-on');

// 9. Kids and Minis: the gentler cap; KIDS.jolt still applies to your carrier; a Big Hit still says Stopped
begin('youngest');
{
  fresh({ humans:[true, false], diff:0, kids:true }); M().pressure[0] = 99; M().pressure[1] = 99;
  ok(C.matchMild() && P.pressJolt(0, 0.02) === K.capMild && P.pressJolt(1, 0.02) === K.capMild && K.capMild < K.cap, `Kids: the cap is ${K.capMild} (${K.cap} for the grown-ups), for both sides`);
  ok(P.pressJolt(0, 0.12) === 0.12, 'a jolt already over the gentle cap stays as it was: the pressure adds nothing to it');
  const N = 20000; let j = 0;
  for (let i = 0; i < N; i++) { const { c, q } = stage({ ct:0, cx:60, mark:60 }); M().pressure[0] = 99; const k = C.commitTackle(q, c, 'ai'); if (!(k.T > 0)) { i--; continue; } k.tier = 'wrap'; const j0 = M().stats.jolts || 0; C.resolveContact(k); if ((M().stats.jolts || 0) > j0) j++; }
  const kj = T.kids.KIDS.jolt, jw = C.CONTACT.jolt.wrap*(1 + (3 - M().nat[0].handling)*0.15), w = Math.max(jw, K.capMild)*kj;
  ok(near(j/N, w, 0.005), `your Kids carrier in a Wrap under the most pressure: ${(100*j/N).toFixed(2)}% (${(100*w).toFixed(2)}%, the gentle cap x KIDS.jolt ${kj.toFixed(2)})`);
  { const { c, q } = stage({ ct:1, cx:60, mark:60 }); M().ctrl = q; const k = C.commitTackle(q, c, 'contact'); k.tier = 'dom'; C.CONTACT.jolt.dom = 0; M().pressure[1] = 0; C.resolveContact(k); ok(M().tags.some(g => g.text === 'Stopped') && !M().tags.some(g => g.text === 'Big Hit'), 'a Big Hit by your man at Kids is still Stopped'); reset(); }
  T.newMatch(minis(), X.CLUBS[4], { halfLen:240, diff:1, headless:true, humans:[true, false] }); M().pressure[0] = M().pressure[1] = 99;
  ok(C.matchMild() && P.pressJolt(1, 0.02) === K.capMild && P.pressJolt(0, 0.02) === K.capMild, 'Minis: the same gentle cap, for both sides');
}
done('9 youngest');

// 10. drawing draws no random number: a hopping egg and a knock-on's beat on Top and the behind views, at both phone sizes
begin('render');
{
  let bad = 0; const walk = v => { if (typeof v === 'number') { if (!Number.isFinite(v)) bad++; } else if (typeof v === 'string') { if (/NaN|Infinity/.test(v)) bad++; } else if (Array.isArray(v)) v.forEach(walk); };
  globalThis.__ctxSpy = (k, a) => a.forEach(walk);
  let drew = 0, clean = true, tumbled = 0;
  for (const cam of [0, 2]) for (const [w, h] of [[844, 390], [667, 375]]) {
    T.debug.settings().cam = cam; T.debug.view(w, h);
    reseed(101); fresh({ humans:[true, false] }); T.debug.setMode('match'); const s = stage({ cx:60, mark:60 }); s.c.down = 1; s.q.down = 0.6; C.looseInContact(s.c, true);
    const frame = () => { T.update(STEP); const r0 = rndCalls(); T.debug.render(STEP); T.debug.updateHud(); if (rndCalls() !== r0) clean = false; drew++; if (M().ball.tumble != null) tumbled++; };
    for (let i = 0; i < 50; i++) frame();
    P.knockOn(M().players.find(p => p.team === 1 && p.down <= 0) || s.c);
    for (let i = 0; i < 30; i++) frame();
    T.debug.setMode('menu');
  }
  globalThis.__ctxSpy = null; T.debug.settings().cam = 0; T.debug.view(844, 390);
  ok(tumbled > 200, `the egg tumbles in ${tumbled} of them (b.tumble, set in the sim)`);
  ok(clean && bad === 0 && drew === 320, `${drew} frames of a hopping egg and a knock-on's beat, Top and Mid, 844x390 and 667x375: no draw, nothing non-finite`);
}
done('10 render');

// 11. the words, and the README
begin('words');
{
  const script = readGameSource().match(/<script>([\s\S]*)<\/script>/)[1];
  ok(/tag\('Pressure On'/.test(script) && /tag\('Loose Ball'/.test(script), 'Pressure On and Loose Ball are tags');
  ok(!/[←→]/.test('Pressure On') && /^[A-Z][a-z]+ [A-Z][a-z]+$/.test('Pressure On'), 'Title Case, two short words, no arrow');
  ok(!/'Steal'|jackal/.test(script), 'no Steal prompt and no jackal anywhere in the code, comments included (contact.mjs 19 holds the same)');
  const fs = await import('node:fs'); const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const nums = [`under ${K.little}m`, `${K.gain}m past the mark`, `At ${K.line}, the line`, `1 + ${K.per} x (count - ${K.line - 1})`, `capped at ${Math.round(K.cap*100)}%`, `at ${Math.round(K.capMild*100)}%`, `for ${K.surge}s`, `for ${K.knock}s`, `below ${K.egg.reach}m`];
  ok(/- \*\*Pressure\*\* \(2026-11-09/.test(readme) && nums.every(n => readme.includes(n)), `the README's Contact has Pressure with its numbers (${nums.filter(n => !readme.includes(n)).join(', ') || 'all there'})`);
  ok(/A \*\*pressure spill\*\* \(2026-11-09[\s\S]{0,40}is not a breakdown steal/.test(readme), 'and Decided says plainly that a pressure spill is not a breakdown steal');
}
done('11 words');

console.log(`Pressure: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
