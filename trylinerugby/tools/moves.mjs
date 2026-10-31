// The open-play moves (2026-10-17): the Side Step (one sideways flick near a tackler) and the Dummy (pull back and push on). Staged
// carries run headless through the real update path, from both teams, on the stick, the keys and a pad. Exits 1 on any failure.
// node tools/moves.mjs            (SEED=5 unless set)
process.env.SEED ??= '5';
import fs from 'fs';
const { T, inputs, padStub, fire, rndCalls, reseed } = await import('./harness.mjs');
const C = T.contact, S = T.sides, D = T.debug, STEP = T.STEP, M = () => T.M, K = C.MOVES;
const hyp = Math.hypot, near = (a, b, e) => Math.abs(a - b) <= e;
let failed = 0, passed = 0, group = '';
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', group + ':', msg); } };
const done = name => { console.log(`${name.padEnd(24)} ${failed ? 'FAIL so far ' + failed : 'ok'} (${passed} passed)`); };
const begin = name => { group = name; };
const guard = fn => { try { fn(); } catch (e) { ok(false, `threw ${e && e.message}`); } };
const steps = M => M.stats.steps || 0, tags = M => M.tags.map(t => t.text);
const clearSlots = () => { for (const inp of inputs) { inp.keys.clear(); inp.held.clear(); inp.src.a = inp.src.b = inp.src.c = 0; inp.aDown = inp.bDown = inp.cDown = false; inp.aPressed = inp.bPressed = inp.cPressed = false; inp.flick = 0; inp.jx = inp.jy = 0; inp.latch = false; inp.padStick = false; inp.gest = null; } };
const ev = code => ({ code, repeat:false, preventDefault() {} });
const down = code => T.onKey(ev(code), true), up = code => T.onKey(ev(code), false);
// a staged carry: `team`'s man 3 (or 10) on the ball at (60, 35) running upfield at 8 m/s, one defender `gap` m straight ahead who can't
// tackle (tcd) so only the detector is tested, a teammate 6m back and 6m to his right as the ring's receiver, everyone else 40m+ away.
// o.two: both sides human; o.humans overrides. Half a second of a straight run first, the men held in place
function stage(team = 0, gap = 3, o = {}) {
  T.newMatch(0, 1, { halfLen:240, diff:o.diff ?? 1, headless:true, duels:o.duels || 'off', humans:o.humans || (o.two ? [true, true] : team ? [false, true] : [true, false]), levels:o.levels });
  D.setMode('match'); if (o.two) D.setTwo(true); else D.setTwo(false);
  clearSlots();
  const m = M(), d = team ? -1 : 1, c = m.players[team ? 10 : 3], q = m.players[team ? 3 : 10], r = m.players[team ? 11 : 4];
  for (const p of m.players) { p.x = team ? 110 : 10; p.y = 5 + (p.n*7) % 60; p.vx = p.vy = 0; p.down = 0; p.tcd = 9; p.side = -1; p.wf = 0; p.bite = 0; p.biteTo = null; p.hold = 2; }
  c.x = 60; c.y = 35; c.vx = 8*d; c.vy = 0; c.hold = 1;
  q.x = 60 + gap*d; q.y = o.qy ?? 35; q.tcd = 9;
  r.x = 60 - 6*d; r.y = 41; r.vx = 6*d;
  m.phase = 'play'; m.set = null; m.cut = null; m.ball.state = 'held'; m.ball.carrier = c; m.ball.f = null; m.ball.last = team; m.clock = 20; m.dclock = 50; m.poss = team;
  S.setCtrl(team, c); if (o.two) S.setCtrl(1 - team, q);
  for (const s of m.side) { s.ctrlPrev = s.ctrl; s.ctrlT = 1; }
  const inp = S.inputOf(team);
  for (let i = 0; i < 30; i++) { inp.jx = d; inp.jy = 0; c.x = 60; q.x = 60 + gap*d; r.x = 60 - 6*d; T.update(STEP); }
  return { m, c, q, r, inp, d, team, gap };
}
const held = (s, n, fn) => { for (let i = 0; i < n; i++) { if (fn) fn(i); s.c.x = 60; s.q.x = 60 + s.gap*s.d; s.r.x = 60 - 6*s.d; T.update(STEP); } };   // n steps with the men held in place (the AI defender would otherwise close in), fn(i) before each
// frames with the defender put back s.gap m straight ahead of whoever carries, every step: a 'does not fire' test then fails only by the rule under test,
// never because the AI defender closed inside the range or ran past (which is how three of them once passed with the rule deleted)
const heldRun = (s, frames) => { for (const f of frames) { s.inp.jx = f[0]; s.inp.jy = f[1]; const car = s.m.ball.carrier; s.q.x = car.x + s.gap*s.d; s.q.y = car.y; T.update(STEP); } };
const keysOnly = s => { s.inp.jx = s.inp.jy = 0; };   // a keyboard player's stick reads 0
const run = (s, frames) => { for (const f of frames) { s.inp.jx = f[0]; s.inp.jy = f[1]; T.update(STEP); } };
const flick = (d, side, n = 4) => Array.from({ length:n }, (_, i) => { const L = side*0.65*(i + 1)/n; return [d*Math.sqrt(1 - L*L), L]; });
const backOn = d => [[d*0.6, 0], [d*0.2, 0], [d*0.1, 0], [d*0.1, 0], [d*0.5, 0], [d*0.9, 0]];

// 1. the Side Step fires: a sideways flick in 4 steps with a tackler 3m off, from each team, each way
begin('side step');
guard(() => {
  for (const team of [0, 1]) for (const side of [-1, 1]) {
    const s = stage(team, 3), s0 = steps(s.m), vy0 = s.c.vy; run(s, flick(s.d, side));
    ok(steps(s.m) === s0 + 1 && (s.m.stats['steps' + team] || 0) === 1, `team ${team}: a ${side < 0 ? 'screen-up' : 'screen-down'} flick in 4 steps with a tackler at 3m is one Side Step (${steps(s.m) - s0})`);
    ok(tags(s.m).includes('Side Step'), `team ${team}: it tags Side Step (${tags(s.m)})`);
    ok(s.c.side > 0.25 && s.c.side <= K.step.side && Math.sign(s.c.vy - vy0) === side && Math.abs(s.c.vy) > 2, `team ${team}: he is stepping (side ${s.c.side.toFixed(2)}) toward the flick (vy ${s.c.vy.toFixed(2)})`);
    ok(C.tackleChance(s.q, s.c, 'ai') < C.tackleChance(s.q, s.c, 'ai', false) && near(C.tackleChance(s.q, s.c, 'ai')/C.tackleChance(s.q, s.c, 'ai', false), K.step.odds, 0.02), `team ${team}: a tackle on him is x${K.step.odds} while he steps`);
  }
  // the dart is MOVES.step.push along the stick
  // the dart: the same flick with MOVES.step.push at 0 is steering alone; the shipped push adds about push x L across
  { const push0 = K.step.push; K.step.push = 0; const a = stage(0, 3); run(a, flick(1, 1)); const vyA = a.c.vy; K.step.push = push0; const b = stage(0, 3); run(b, flick(1, 1)); const dart = b.c.vy - vyA;
    ok(steps(a.m) === 1 && steps(b.m) === 1 && dart > 0.49*K.step.push*0.75 && dart < 0.65*K.step.push*1.1, `the dart adds about ${K.step.push} m/s along the stick (${dart.toFixed(2)} across a step later, on a flick that fired at L 0.49)`); }
});
done('1 side step fires');

// 2. the Side Step does not fire
begin('side step does not');
guard(() => {
  { const s = stage(0, 5), s0 = steps(s.m); run(s, flick(1, 1)); ok(steps(s.m) === s0 && !tags(s.m).includes('Side Step'), `no opponent inside ${K.step.range}m: a flick is steering, not a Side Step`); }
  { const s = stage(0, 3), s0 = steps(s.m); run(s, flick(1, 1, 24)); ok(steps(s.m) === s0, 'the same swerve spread over 0.4s is steering'); }
  { const s = stage(0, 3); run(s, flick(1, 1)); const s1 = steps(s.m); run(s, [[1, 0], [1, 0], [1, 0]]); run(s, flick(1, -1)); ok(steps(s.m) === s1, 'a second flick inside 1.25s does nothing (the cooldown)'); }
  // in his first 0.10s with the ball: a man handed the ball with the stick already across does not step, nor does one who flicks at once
  { const s = stage(0, 3); const r = s.r; r.x = 58; r.y = 35.5; r.vx = 8; s.m.ball.carrier = r; S.setCtrl(0, r); r.hold = 0; s.inp.jx = 0.7; s.inp.jy = 0.7; const s0 = steps(s.m); for (let i = 0; i < 5; i++) { r.x = 58; s.q.x = 60.5; T.update(STEP); } ok(steps(s.m) === s0, `a man handed the ball with the stick already across does not step (hold ${r.hold.toFixed(2)})`); }
  // the same with the tackler held 2.5m off every step (inside the range throughout), and its control: the same flick once he has held the ball 0.10s
  { const handed = () => { const s = stage(0, 2.5); const r = s.r; r.x = 58; r.y = 35.5; r.vx = 8; s.m.ball.carrier = r; S.setCtrl(0, r); r.hold = 0; return s; };
    const s = handed(); heldRun(s, flick(1, 1)); ok(steps(s.m) === 0 && s.r.hold < K.step.since, `a flick in his first ${K.step.since}s with the ball, the tackler held 2.5m off, does not step (${steps(s.m)}; hold ${s.r.hold.toFixed(3)})`);
    const s2 = handed(); heldRun(s2, Array.from({ length:9 }, () => [1, 0])); heldRun(s2, flick(1, 1)); ok(steps(s2.m) === 1 && s2.r.hold >= K.step.since, `the same flick once he has held it ${K.step.since}s is a Side Step (${steps(s2.m)}; hold ${s2.r.hold.toFixed(3)})`); }
  // the armed and re-arm rule: a flick is spent when it fires and when it is steering, and the stick must come back inside |L| < rearm before the next
  { const s = stage(0, 6); heldRun(s, [[0.9, 0.2], [0.8, 0.45], [0.75, 0.6], [0.7, 0.65]]); ok(steps(s.m) === 0 && s.inp.gest && !s.inp.gest.armed, `a flick at 6m is steering (out of range) and still spends the flick (armed ${s.inp.gest && s.inp.gest.armed})`);
    s.gap = 3; heldRun(s, Array.from({ length:6 }, () => [0.85, 0.5])); heldRun(s, [[0.6, 0.8], [0.35, 0.94], [0.2, 0.98]]); ok(steps(s.m) === 0, `then at 3m a further rise from 0.5 to 0.98 that never passes under ${K.step.rearm} is no Side Step (${steps(s.m)})`); }
  { const s = stage(0, 3); heldRun(s, flick(1, 1)); ok(steps(s.m) === 1, 'one Side Step'); s.c.side = -1; heldRun(s, Array.from({ length:4 }, () => [0.86, 0.5])); heldRun(s, [[0.6, 0.8], [0.35, 0.94], [0.2, 0.98]]); ok(steps(s.m) === 1, `after it, the cooldown cleared, a second rise from 0.5 that never passes under ${K.step.rearm} does nothing (${steps(s.m)})`);
    s.c.side = -1; heldRun(s, [[0.86, 0.5], [1, 0], [1, 0]]); heldRun(s, [[0.6, 0.8], [0.35, 0.94], [0.2, 0.98]]); ok(steps(s.m) === 2, `the same rise after the stick came back through the centre is a second Side Step (${steps(s.m)})`); }
  { const s = stage(0, 3); heldRun(s, flick(1, 1)); s.c.side = -1; heldRun(s, [[0.7, 0.7], [0.7, 0.7]]); heldRun(s, [[0.7, -0.7]]); ok(steps(s.m) === 1, `a stick that jumps from L 0.7 straight to -0.7 in one step does not fire again (${steps(s.m)})`);
    const s2 = stage(0, 3); heldRun(s2, flick(1, 1)); s2.c.side = -1; heldRun(s2, [[0.7, 0.7], [0.7, 0.7], [1, 0]]); heldRun(s2, [[0.7, -0.7]]); ok(steps(s2.m) === 2, `the same move through |L| < ${K.step.rearm} does (${steps(s2.m)})`); }
  // a receiver whose stick swung during the pass flight does not step at the catch: the history is cleared while the ball is in the air
  { const s = stage(0, 3); const { c, r, q } = s; r.x = 54; r.y = 41; r.vx = 2; c.hold = 1; q.x = 51; q.y = 41; C.doPass(c, r, {}); let n = 0; const s0 = steps(s.m);
    while (s.m.ball.state === 'air' && n++ < 200) { const L = Math.sin(n*0.9)*0.9; s.inp.jx = Math.sqrt(1 - L*L); s.inp.jy = L; q.x = r.x + 3; q.y = r.y; T.update(STEP); }
    ok(s.m.ball.carrier === r && steps(s.m) === s0, `a receiver whose stick swung through the flight does not step at the catch (${steps(s.m) - s0})`);
    for (let i = 0; i < 2; i++) { q.x = r.x + 3; q.y = r.y; T.update(STEP); }
    ok(steps(s.m) === s0, 'nor on the two steps after it'); }
  // a gap in his carry (a close-up: update runs, gestureStep does not) resets the history, so a flick begun before a cut can't finish after it
  { const a = stage(0, 3); run(a, flick(1, 1, 5).slice(0, 2)); a.inp.gest.n -= 1; run(a, flick(1, 1, 5).slice(2)); ok(steps(a.m) === 0, `a 5-step flick split by a missed step does not fire (${steps(a.m)})`);
    const b = stage(0, 3); run(b, flick(1, 1, 5)); ok(steps(b.m) === 1, `the same flick unbroken does (${steps(b.m)})`); }
  // after a duel: the stick's restore (the pre-duel direction put back in one step) is not a flick
  { T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'live' }); D.setMode('match'); D.setTwo(false); clearSlots();
    const st = D.stage('past'); T.input.jx = 0.6; T.input.jy = 0.8; T.update(STEP);
    const c = M().cut; ok(c && c.kind === 'past', 'a Get Past staged with the stick across');
    let n = 0; while (M().phase === 'cut' && !c.res && n++ < 600) { if (c.t >= c.centre && !c.res) T.input.flick = c.open; T.update(STEP); }
    n = 0; while (M().phase === 'cut' && n++ < 600) T.update(STEP);
    const s0 = steps(M()), U = c.U; U.side = -1;                     // the break's own side flag is cleared so only the gesture detector could step him
    for (const p of M().players) if (p.team !== 0) { p.x = U.x + 2.5; p.y = U.y; p.down = 0; p.tcd = 9; }
    for (let i = 0; i < 6; i++) T.update(STEP);
    ok(steps(M()) === s0, `the stick restored after a duel is not a flick (${steps(M()) - s0} steps)`); }
  // inside projectHold (a drop goal's look-ahead) nothing fires: steps and tags unchanged
  { const s = stage(0, 3); run(s, flick(1, 1, 3).slice(0, 3)); const s0 = steps(s.m), t0 = s.m.tags.length; s.inp.jx = Math.sqrt(1 - 0.65*0.65); s.inp.jy = 0.65; T.kick.projectHold(s.c, 0.3); ok(steps(s.m) === s0 && s.m.tags.length === t0, 'a drop goal\'s projection fires no step and pushes no tag'); }
  // with Kick held, or a long Pass charging, the stick aims: no Side Step
  { const s = stage(0, 3), s0 = steps(s.m); s.inp.bDown = true; s.inp.bPressed = true; run(s, [[1, 0]]); run(s, flick(1, 1)); ok(steps(s.m) === s0 && S.side(0).charging, 'with Kick held, a flick is the kick\'s aim, not a Side Step'); s.inp.bDown = false; }
  { const s = stage(0, 3), s0 = steps(s.m); s.inp.aDown = true; s.inp.aPressed = true; run(s, [[1, 0]]); run(s, flick(1, 1)); ok(steps(s.m) === s0 && (S.side(0).pass || s.m.ball.state === 'air'), 'with Pass held, a flick picks the long pass\'s side, not a Side Step'); s.inp.aDown = false; }
  // a Pass pressed inside 0.15s of a step: the tag comes off (that flick was an aim)
  { const s = stage(0, 3); run(s, flick(1, 1)); ok(tags(s.m).includes('Side Step'), 'the step tagged'); s.inp.aPressed = true; T.update(STEP); ok(!tags(s.m).includes('Side Step'), `a Pass inside 0.15s of the flick drops the Side Step tag (${tags(s.m)})`); }
});
done('2 side step does not');

// 3. the keys: a fresh across key is a flick; up then down is a cut-back step; Player 2's arrows
begin('keys');
guard(() => {
  { const s = stage(0, 3), s0 = steps(s.m); keysOnly(s); down('KeyD'); held(s, 6); down('KeyS'); held(s, 1); ok(steps(s.m) === s0 + 1, 'a fresh S with D held near a tackler is a Side Step'); up('KeyS'); up('KeyD'); }
  { const s = stage(0, 3), s0 = steps(s.m); keysOnly(s); down('KeyD'); held(s, 6); down('KeyW'); held(s, 1); ok(steps(s.m) === s0 + 1, 'a fresh W is a Side Step the other way'); up('KeyW');
    s.c.side = -1; held(s, 3); down('KeyS'); held(s, 1); ok(steps(s.m) === s0 + 2, 'W to S straight after is a cut-back step once the cooldown is cleared'); up('KeyS'); up('KeyD'); }
  { const s = stage(0, 3), s0 = steps(s.m); keysOnly(s); down('KeyS'); held(s, 1); ok(steps(s.m) === s0 + 1, 'a tap across with no forward key held is a flick too'); up('KeyS'); }
  // from a centred stick, a jump to the side is a flick
  { const s = stage(0, 3), s0 = steps(s.m); run(s, [[0, 0], [0, 0], [0.8, 0.6], [0.8, 0.6]]); ok(steps(s.m) === s0 + 1, 'from a centred stick, a jump to the side is a flick'); }
  // two player: Player 2 on the arrows attacks left; Up and Down step him, Right (his back) with Left held is his Dummy
  { const s = stage(1, 3, { two:true }), s0 = steps(s.m); keysOnly(s); down('ArrowLeft'); held(s, 6); down('ArrowDown'); held(s, 1); ok(steps(s.m) === s0 + 1 && (s.m.stats.steps1 || 0) === 1, 'Player 2 on the arrows: a fresh Down with Left held is his Side Step'); up('ArrowDown'); up('ArrowLeft'); }
  { const s = stage(1, 5, { two:true }); keysOnly(s); S.setCtrl(0, s.m.players[0]);   // Player 1's ring on a far man: his ringed man can never be sold (see 6)
    down('ArrowLeft'); held(s, 20); down('ArrowRight'); held(s, 4); up('ArrowRight'); held(s, 3);
    ok((s.m.stats.dummies1 || 0) === 1, `Player 2 taps Right (his back key) with Left held: a Dummy (${s.m.stats.dummies1 || 0})`); up('ArrowLeft'); }
  { const s = stage(0, 5); keysOnly(s); down('KeyD'); held(s, 20); down('KeyA'); held(s, 4); up('KeyA'); held(s, 3);
    ok((s.m.stats.dummies0 || 0) === 1, `Player 1 taps A with D held: a Dummy (${s.m.stats.dummies0 || 0})`); up('KeyD'); }
  { const s = stage(0, 5); keysOnly(s); down('KeyD'); held(s, 20); up('KeyD'); held(s, 4); down('KeyD'); held(s, 3);
    ok(!(s.m.stats.dummies0), 'on keys, forward let go and pressed again is not a Dummy'); up('KeyD'); }
});
done('3 keys');

// 4. the Dummy fires: back and on with a man 5m ahead and the ring on a teammate, from each team; sold or Not Fooled by the bite draw
begin('dummy');
guard(() => {
  const bite0 = K.dummy.bite.slice();
  for (const team of [0, 1]) {
    K.dummy.bite = [1, 1, 1];
    const s = stage(team, 5), d = s.d, wf0 = s.q.wf, v0 = { x:s.c.vx, y:s.c.vy };
    s.q.tcd = 0;                                            // he could tackle (the 5m gap keeps him outside the dive's reach), so the 'no tackle for a moment' effect is his tcd being set, not the stage's 9
    run(s, backOn(d));
    ok((s.m.stats['dummies' + team] || 0) === 1 && (s.m.stats['sold' + team] || 0) === 1, `team ${team}: back and on with a man 5m ahead is one Dummy, sold (${s.m.stats['dummies' + team] || 0}/${s.m.stats['sold' + team] || 0})`);
    ok(tags(s.m).includes('Dummy'), `team ${team}: it tags Dummy (${tags(s.m)})`);
    ok(s.q.wf > 0.3 && wf0 === 0 && s.q.tcd >= K.dummy.tcd - 1.5*STEP && Math.sign(s.q.vy) === Math.sign(s.r.y - s.q.y), `team ${team}: he bites: wrong-footed (${s.q.wf.toFixed(2)}), no tackle for ${K.dummy.tcd}s (tcd ${s.q.tcd.toFixed(2)} from 0), shoved toward the receiver (vy ${s.q.vy.toFixed(2)})`);
    ok(s.q.bite > 0.5 && s.q.biteTo === s.r, `team ${team}: he runs at the ring's man for ${K.dummy.drift}s (${s.q.bite.toFixed(2)})`);
    const tq = C.computeTargets().get(s.q);
    ok(tq && tq.pursue && near(tq.x, s.r.x + s.r.vx*0.3, 1e-9) && near(tq.y, s.r.y + s.r.vy*0.3, 1e-9), `team ${team}: his computeTargets target is the receiver`);
    ok(Math.abs(s.c.vx) >= Math.abs(v0.x) - 0.5, `team ${team}: the carrier keeps the pace he had before the pull (${Math.abs(s.c.vx).toFixed(2)} v ${Math.abs(v0.x).toFixed(2)})`);
    held(s, 40);
    { const t2 = C.computeTargets().get(s.q); ok(s.q.bite <= 0 && !(t2 && near(t2.x, s.r.x + s.r.vx*0.3, 1e-9) && near(t2.y, s.r.y + s.r.vy*0.3, 1e-9)), `team ${team}: 0.6s on he is back on his own job`); }
    K.dummy.bite = [0, 0, 0];
    const s2 = stage(team, 5); s2.q.tcd = 0; run(s2, backOn(s2.d));
    ok((s2.m.stats['dummies' + team] || 0) === 1 && !(s2.m.stats['sold' + team]) && tags(s2.m).includes('Not Fooled') && s2.q.wf === 0 && s2.q.tcd === 0, `team ${team}: not bought: tagged Not Fooled, the defender untouched (${tags(s2.m)}; tcd ${s2.q.tcd})`);
  }
  K.dummy.bite = bite0;
  // the bite chance is the carrier's level: an Easy carrier sells almost every one, a Hard one fewer
  const rate = diff => { let sold = 0; for (let i = 0; i < 60; i++) { const s = stage(0, 5, { diff }); run(s, backOn(1)); sold += s.m.stats.sold0 || 0; } return sold/60; };
  const e = rate(0), h = rate(2);
  ok(e > h && near(e, K.dummy.bite[0], 0.15) && near(h, K.dummy.bite[2], 0.15), `the bite is by the carrier's level: Easy ${(100*e).toFixed(0)}% v Hard ${(100*h).toFixed(0)}% (levers ${K.dummy.bite[0]} / ${K.dummy.bite[2]})`);
});
done('4 dummy fires');

// 5. the Dummy does not fire
begin('dummy does not');
guard(() => {
  // the defender held 5m off throughout, so only the rule can stop each one; each 'no' has its 'yes' beside it
  { const s = stage(0, 5); heldRun(s, [[0.6, 0], ...Array.from({ length:21 }, () => [0.1, 0]), [0.9, 0]]); ok(!(s.m.stats.dummies0), `held back for over ${K.dummy.ret}s, then on: no Dummy (he stopped)`);
    const s2 = stage(0, 5); heldRun(s2, [[0.6, 0], ...Array.from({ length:8 }, () => [0.1, 0]), [0.9, 0]]); ok((s2.m.stats.dummies0 || 0) === 1, `held back 0.13s, then on: one (${s2.m.stats.dummies0 || 0})`); }
  { const s = stage(0, 5); heldRun(s, [...Array.from({ length:24 }, (_, i) => [1 - 0.8*(i + 1)/24, 0]), [0.5, 0], [0.9, 0]]); ok(!(s.m.stats.dummies0), `a thumb eased back over 0.4s (slowing down), then pushed on: no Dummy (the pull must come within ${K.dummy.drop}s of the run's end)`);
    const s2 = stage(0, 5); heldRun(s2, [...Array.from({ length:6 }, (_, i) => [1 - 0.8*(i + 1)/6, 0]), [0.5, 0], [0.9, 0]]); ok((s2.m.stats.dummies0 || 0) === 1, `the same pull over 0.1s is one (${s2.m.stats.dummies0 || 0})`); }
  { const s = stage(0, 5); run(s, Array.from({ length:8 }, (_, i) => [Math.cos(i*0.3), Math.sin(i*0.3)])); ok(!(s.m.stats.dummies0), 'a sideways swerve is never a Dummy'); }
  { const s = stage(0, 5); run(s, [[1, 0.7], [1, -0.7], [1, 0.7], [1, -0.7], [1, 0]]); ok(!(s.m.stats.dummies0), 'a waggle is never a Dummy'); }
  { const s = stage(0, 12); run(s, backOn(1)); ok(!(s.m.stats.dummies0), `no defender inside ${K.dummy.range[1]}m: no Dummy`); }
  { const s = stage(0, 5); s.r.x = 10; s.r.y = 5; for (const p of s.m.players) if (p.team === 0 && p !== s.c) { p.x = 10; } run(s, backOn(1)); ok(!(s.m.stats.dummies0), 'no receiver in the ring: no Dummy'); }
  { const s = stage(0, 5); heldRun(s, backOn(1)); heldRun(s, Array.from({ length:15 }, () => [1, 0])); heldRun(s, backOn(1)); ok((s.m.stats.dummies0 || 0) === 1, `a second back-and-on 0.35s after the first does nothing: the ${K.dummy.cd}s cooldown (${s.m.stats.dummies0 || 0})`);
    const s2 = stage(0, 5); heldRun(s2, backOn(1)); heldRun(s2, Array.from({ length:Math.round(K.dummy.cd/STEP) + 2 }, () => [1, 0])); heldRun(s2, backOn(1)); ok((s2.m.stats.dummies0 || 0) === 2, `and ${K.dummy.cd}s on, a second Dummy (${s2.m.stats.dummies0 || 0})`); }
  // the cooldown is the carrier's, on the match clock: a lifted thumb (pointerup on the zone, which clears the gesture history), a re-touch through the
  // real listeners, 0.25s of running on and a second back-and-on inside 2.5s is still one Dummy (it was one every 0.3-0.5s with a lift between)
  { const s = stage(0, 5); heldRun(s, backOn(1)); ok((s.m.stats.dummies0 || 0) === 1 && s.c.dumAt === s.m.dclock, 'one Dummy, stamped on the carrier at the match clock');
    const zone = document.getElementById('zone'); s.inp.stickId = 7; zone.fire('pointerup', { pointerId:7 }); zone.fire('pointerdown', { pointerId:8, clientX:100, clientY:300 }); zone.fire('pointermove', { pointerId:8, clientX:152, clientY:300 });
    ok(s.inp.gest == null && s.inp.stickId === 8, 'the thumb lifted and put back');
    heldRun(s, Array.from({ length:15 }, () => [1, 0])); heldRun(s, backOn(1)); ok((s.m.stats.dummies0 || 0) === 1, `run on 0.25s and back-and-on again inside ${K.dummy.cd}s: still one Dummy (${s.m.stats.dummies0 || 0})`); zone.fire('pointerup', { pointerId:8 }); }
  // a lift and re-touch through the zone's own pointer listeners clears the history: the push on after it is no Dummy
  { const s = stage(0, 5); run(s, [[0.6, 0], [0.2, 0]]); const zone = document.getElementById('zone'); s.inp.stickId = 7; zone.fire('pointerup', { pointerId:7 });
    ok(s.inp.gest == null && s.inp.jx === 0 && s.inp.stickId === null, 'a lifted thumb (pointerup on the zone) clears the gesture history and the stick');
    zone.fire('pointerdown', { pointerId:8, clientX:100, clientY:300 }); zone.fire('pointermove', { pointerId:8, clientX:152, clientY:300 });
    ok(near(s.inp.jx, 1, 1e-9) && s.inp.jy === 0, `re-touched and pushed on through the real listeners (jx ${s.inp.jx.toFixed(2)})`);
    for (let i = 0; i < 3; i++) T.update(STEP);
    ok(!(s.m.stats.dummies0), 'and that push on is not a Dummy'); zone.fire('pointerup', { pointerId:8 }); }
  // the stick held back then on with a tackler inside 2.5s of the carry's start, but the run under 0.20s: no Dummy
  { const s = stage(0, 5); s.inp.gest = null; run(s, [[0.9, 0], [0.9, 0], [0.9, 0], [0.2, 0], [0.1, 0], [0.9, 0]]); ok(!(s.m.stats.dummies0), 'a run held under 0.20s before the pull is not a Dummy'); }
});
done('5 dummy does not');

// 6. two player and the CPU: the defending human's ringed man is never sold, the next AI man is; the CPU dummies on Hard only, never the
// human's ringed man, and draws nothing in AI v AI
begin('two player and cpu');
guard(() => {
  const bite0 = K.dummy.bite.slice(); K.dummy.bite = [1, 1, 1];
  { const s = stage(0, 5, { two:true }); const q2 = s.m.players[11]; q2.x = 66; q2.y = 36; q2.tcd = 9; q2.down = 0;   // the chooser's ring is on q (5m off); q2 is a second AI man just behind him
    run(s, backOn(1));
    ok((s.m.stats.dummies0 || 0) === 1 && s.q.wf === 0 && q2.wf > 0 && q2.biteTo === s.r, `two player: Player 2's ringed man is never sold; the AI man beside him is (${q2.wf.toFixed(2)})`); }
  K.dummy.bite = bite0;
  // the CPU's dummy: a Hard CPU carrier 5m from a human's AI defender dummies at cpu[2] a think, never the ringed man; Easy and Normal never
  const cpuDummies = diff => { let n = 0, soldRinged = 0; for (let i = 0; i < 60; i++) {
    T.newMatch(0, 1, { halfLen:240, diff, headless:true, duels:'off' }); D.setMode('match'); clearSlots();
    const m = M(), c = m.players[10], q = m.players[2], q2 = m.players[3], r = m.players[11];
    for (const p of m.players) { p.x = p.team ? 110 : 10; p.y = 5 + (p.n*7) % 60; p.vx = p.vy = 0; p.down = 0; p.tcd = 9; p.side = -1; p.wf = 0; p.hold = 2; }
    c.x = 60; c.y = 35; c.vx = -8; c.hold = 1; q.x = 55; q.y = 35; q2.x = 54; q2.y = 36; r.x = 66; r.y = 41; r.vx = -6;
    m.phase = 'play'; m.set = null; m.ball.state = 'held'; m.ball.carrier = c; m.ball.f = null; m.ball.last = 1; m.clock = 20; m.dclock = 50 + i; m.poss = 1; S.setCtrl(0, q2);
    for (let k = 0; k < 30; k++) { c.x = 60; q.x = 55; q2.x = 54; r.x = 66; T.update(STEP); }
    n += m.stats.dummies1 || 0; if (q2.wf > 0 || q2.bite > 0) soldRinged++;
  } return { n, soldRinged }; };
  const e = cpuDummies(0), nn = cpuDummies(1), h = cpuDummies(2);
  ok(e.n === 0 && nn.n === 0, `the CPU never dummies on Easy or Normal (${e.n} / ${nn.n} in 60 staged carries each)`);
  ok(h.n >= 1 && h.soldRinged === 0, `a Hard CPU carrier dummies (${h.n} in 60 staged carries of half a second) and never sells the human's ringed man`);
  // AI v AI: the CPU dummy draws no random number (sim.mjs stays byte-identical): the same stretch from the same seed, with the lever at 0 and at
  // 0.5, draws the same count and lands every man and the ball on the same spot. The lever and the human gate are read before any rnd()
  { const cpu0 = K.dummy.cpu.slice();
    const stretch = cpu => { K.dummy.cpu = cpu; reseed(77); T.newMatch(0, 1, { halfLen:240, diff:2, headless:true, auto:true }); const m = M(), c = m.players[10], q = m.players[2], r = m.players[11];
      for (const p of m.players) { p.x = p.team ? 110 : 10; p.y = 5 + (p.n*7) % 60; p.vx = p.vy = 0; p.down = 0; p.tcd = 9; p.side = -1; p.hold = 2; }
      c.x = 60; c.y = 35; c.vx = -8; c.hold = 1; q.x = 55; q.y = 35; r.x = 66; r.y = 41; r.vx = -6;
      m.phase = 'play'; m.set = null; m.ball.state = 'held'; m.ball.carrier = c; m.ball.f = null; m.ball.last = 1; m.clock = 20; m.dclock = 50; m.poss = 1;
      const r0 = rndCalls(); for (let k = 0; k < 18; k++) { c.x = 60; q.x = 55; r.x = 66; T.update(STEP); }
      return { dum:m.stats.dummies1 || 0, rnd:rndCalls() - r0, pos:JSON.stringify([m.ball.x, m.ball.y, m.ball.state, ...m.players.map(p => [p.x, p.y, p.vx, p.vy])]) }; };
    const a = stretch([0, 0, 0]), b = stretch([0.5, 0.5, 0.5]); K.dummy.cpu = cpu0;
    ok(b.dum === 0 && a.rnd === b.rnd && a.pos === b.pos, `AI v AI: a Hard carrier 5m from a defender never dummies at cpu 0.5 (${b.dum}), and 18 steps draw the same ${b.rnd} random numbers as at cpu 0 (${a.rnd}) with every man on the same spot`); }
});
done('6 two player and cpu');

// 7. pads: the d-pad works like the keys, an analog flick through padStub like touch
begin('pads');
guard(() => {
  const gamepad = (index, mapping = 'standard') => ({ index, mapping, connected:true, buttons:Array.from({ length:17 }, () => ({ pressed:false, value:0 })), axes:[0, 0, 0, 0] });
  const g0 = gamepad(0); padStub([g0]); fire('gamepadconnected', { gamepad:g0 });
  { const s = stage(0, 3), s0 = steps(s.m); g0.buttons[15].pressed = true; T.pollPads(); for (let i = 0; i < 6; i++) { T.pollPads(); T.update(STEP); } g0.buttons[13].pressed = true; T.pollPads(); T.update(STEP);
    ok(steps(s.m) === s0 + 1, `d-pad: a fresh Down with Right held is a Side Step (${steps(s.m) - s0})`); g0.buttons[13].pressed = false; g0.buttons[15].pressed = false; T.pollPads(); }
  { const s = stage(0, 3), s0 = steps(s.m); for (let i = 0; i < 4; i++) { const L = 0.65*(i + 1)/4; g0.axes[0] = Math.sqrt(1 - L*L); g0.axes[1] = L; T.pollPads(); T.update(STEP); }
    ok(steps(s.m) === s0 + 1, `an analog flick on a pad's stick is a Side Step (${steps(s.m) - s0})`); g0.axes[0] = g0.axes[1] = 0; T.pollPads(); }
  { const s = stage(0, 5); const xs = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.2, 0.1, 0.5, 0.9]; held(s, xs.length, i => { g0.axes[0] = xs[i]; g0.axes[1] = 0; T.pollPads(); });
    ok((s.m.stats.dummies0 || 0) === 1, `an analog pull back and on is a Dummy (${s.m.stats.dummies0 || 0})`); g0.axes[0] = 0; T.pollPads(); }
  padStub([]);
});
done('7 pads');

// 8. the words: every open-play tag is Title Case, the Help names both moves, and no page says to hold the stick at a scrum
begin('words');
guard(() => {
  const html = fs.readFileSync(new URL(process.env.GAME || '../index.html', import.meta.url), 'utf8'), js = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const texts = [...js.matchAll(/\btag\('([^']+)'/g)].map(m => m[1]);
  const small = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'on', 'to', 'in', 'for', 'as', 'at', 'by']);
  const title = s => s.split(' ').every((w, i) => (i > 0 && small.has(w)) || /^[A-Z0-9]/.test(w));
  ok(texts.length >= 3 && ['Side Step', 'Dummy', 'Not Fooled'].every(t => texts.includes(t)) && texts.every(title), `every on-pitch tag is Title Case and the three moves are among them (${[...new Set(texts)].join(', ')})`);
  const stick = (html.match(/<dt>Stick<\/dt><dd>([\s\S]*?)<\/dd>/) || [])[1] || '', keys = (html.match(/<dt>Keyboard<\/dt><dd>([\s\S]*?)<\/dd>/) || [])[1] || '', pad = (html.match(/<dt class="desk-only">Controller<\/dt><dd class="desk-only">([\s\S]*?)<\/dd>/) || [])[1] || '';
  ok(/Side Step/.test(stick) && /Dummy/.test(stick) && /Side Step/.test(keys) && /Dummy/.test(keys) && /Side Step/.test(pad) && /Dummy/.test(pad), 'the Help page names Side Step and Dummy for the stick, the keyboard and a controller');
  ok(!/\bstep<\/b> him|to step him/.test(stick), 'the old "flick it sideways to step him" line is gone');
  ok(!/p\.lastA\s*=|p\.turn\s*=|lastA:0|turn:0/.test(js) && !/'turn'|'lastA'/.test(js), 'the old turn-rate step (p.turn, p.lastA) is gone from the engine');
});
done('8 words');

// 9. a Side Step flick that Chrome coalesces into one pointermove: the last sample is back near the centre, the peak across the run is what counts.
// The same move with no intermediate samples is a dead-zone twitch and does not step.
begin('coalesced flick');
guard(() => {
  const zone = document.getElementById('zone');
  const flick = (id, samples) => {
    const s = stage(0, 3), s0 = steps(s.m);
    zone.fire('pointerdown', { pointerId:id, clientX:120, clientY:250 });
    zone.fire('pointermove', { pointerId:id, clientX:120, clientY:246, getCoalescedEvents: samples ? () => samples : undefined });
    return { s, s0, peak:s.inp.latPeak, jy:s.inp.jy };
  };
  const peak = [{ clientX:120, clientY:250 }, { clientX:120, clientY:204 }, { clientX:120, clientY:246 }];
  const a = flick(3, peak);
  ok(a.jy === 0 && a.peak < -0.7, `the thumb is back in the dead zone (${a.jy}) and the peak across the run is kept (${a.peak == null ? 'none' : a.peak.toFixed(2)})`);
  a.s.c.x = 60; a.s.q.x = 60 + a.s.gap; T.update(STEP);
  ok(steps(a.s.m) === a.s0 + 1 && a.s.inp.latPeak == null, `that one move is a Side Step, and the peak is spent (${steps(a.s.m) - a.s0})`);
  zone.fire('pointerup', { pointerId:3 });
  const b = flick(4, null);
  ok(b.jy === 0 && b.peak == null, 'the same endpoint with no intermediate samples is nothing');
  b.s.c.x = 60; b.s.q.x = 60 + b.s.gap; T.update(STEP);
  ok(steps(b.s.m) === b.s0, 'and it does not step');
  zone.fire('pointerup', { pointerId:4 });
});
done('9 coalesced flick');

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
