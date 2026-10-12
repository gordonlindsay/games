// Forced duel scenarios with asserts. Exits 1 on any failure.
// node tools/duels.mjs
import { T } from './harness.mjs';

const STEP = T.STEP;
let failed = 0, passed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const fresh = (duels = 'live', diff = 1) => T.newMatch(0, 1, { halfLen: 240, diff, headless: true, duels });
const runUntil = (pred, max = 600) => { for (let i = 0; i < max && !pred(); i++) T.update(STEP); return pred(); };
const M = () => T.M;
// play a live duel to the end with an input at time `at` (null = no input)
function play(c, act, at) {
  runUntil(() => c.res || c.t >= (at ?? 99), 400);
  if (!c.res && at != null) {
    if (c.kind === 'past') T.input.flick = act; else T.input.aPressed = true;
    T.update(STEP);
  }
  runUntil(() => M().phase !== 'cut', 600);
}

// 1. each attacking and tackle duel fires through update(); none with the stick pointing away
for (const kind of ['past', 'pass', 'tackle']) {
  fresh(); const s = T.debug.stage(kind);
  T.update(STEP);
  ok(M().phase === 'cut' && M().cut.kind === kind, `${kind} fires from its staged position (phase ${M().phase}, kind ${M().cut && M().cut.kind})`);
  fresh(); T.debug.stage(kind); T.input.jx = -1; T.input.jy = 0;
  T.update(STEP);
  ok(M().phase !== 'cut', `${kind} does not fire when steering away`);
}
// block: the spec check accepts the staged pass across your man
{
  fresh(); const s = T.debug.stage('block');
  ok(!!T.forceDuel && M(), 'block can be forced');
}

// 2. the world is frozen during a close-up
{
  fresh(); T.debug.stage('past'); T.update(STEP);
  const snap = () => JSON.stringify({ p: M().players.map(p => [p.x, p.y, p.vx, p.vy, p.down]), b: [M().ball.x, M().ball.y, M().ball.state], clock: M().clock });
  const a = snap();
  for (let i = 0; i < 40; i++) T.update(STEP);
  ok(M().phase === 'cut' && snap() === a, 'players, ball and clock are frozen during a duel');
}

// 3. success with a centred input, and the Step Left / Step Right direction pin
for (const dir of [-1, 1]) {
  fresh(); T.debug.stage('past'); T.update(STEP);
  const c = M().cut; c.open = dir; c.open0 = dir; c.feintAt = null;
  play(c, dir, c.centre);
  const U = c.U, O = c.O;
  ok(c.out === 'break', `past with a centred flick to the open side breaks (got ${c.out}, res ${c.res})`);
  ok(O.down > 0 && U.boost > 0 && M().ball.carrier === U, 'past win: defender down, carrier boosted and still carrying');
  ok(dir < 0 ? U.y < c.K.y : U.y > c.K.y, `Step ${dir < 0 ? 'Left' : 'Right'} lands world ${dir < 0 ? '-y' : '+y'} (y ${U.y.toFixed(2)} vs contact ${c.K.y.toFixed(2)})`);
}
{
  fresh(); const st = T.debug.stage('pass'); T.update(STEP);
  const c = M().cut;
  ok(c && c.kind === 'pass', 'pass duel staged');
  play(c, 1, c.centre);
  ok(c.out === 'drawn', `pass with a centred press draws (got ${c.out})`);
  const b = M().ball;
  ok(b.state === 'air' && b.f.sure && b.f.target === st.R, 'the sure pass goes to the runner the scene showed');
  runUntil(() => M().ball.state !== 'air', 200);
  ok(M().ball.carrier === st.R && st.R.boost > 0, 'the runner catches with a burst');
}
{
  fresh(); T.debug.stage('tackle'); T.update(STEP);
  const c = M().cut; c.stepDir = 0; c.stepAt = null;
  play(c, 1, c.centre);
  ok(c.out === 'bighit', `tackle with a centred press is a Big Hit (got ${c.out})`);
  ok(M().phase === 'set' && M().set.kind === 'ruck' && M().set.dom && Math.abs(M().set.t - 1.6) < 1e-9, 'Big Hit gives a dominant 1.6s ruck');
}
for (const [label, offset, want] of [['inner', 0, 'intercept'], ['outer', 0.42, 'knock']]) {
  fresh(); const st = T.debug.stage('block'); const c = T.forceDuel('block');
  const at = c.centre + offset*c.wid;
  play(c, 1, at);
  ok(c.out === want, `block ${label} gives ${want} (got ${c.out})`);
  if (want === 'intercept') ok(M().ball.carrier === c.U && Math.hypot(c.U.x - c.L.x, c.U.y - c.L.y) < 0.6, 'interceptor carries from the lane point');
  else ok(M().ball.state === 'loose' && M().ball.vx < 0, 'a knock-down goes backwards for us');
}

// 3b. a won Key Pass bursts upfield even when the runner is wide and catching across his body
{
  let fwd = 0, n = 0;
  for (let i = 0; i < 20; i++) {
    fresh(); const st = T.debug.stage('pass'); st.R.y = 46; st.R.vy = 3; T.update(STEP);
    const c = M().cut; if (!c || c.kind !== 'pass') continue;
    play(c, 1, c.centre);
    runUntil(() => M().ball.state !== 'air', 200);
    if (M().ball.carrier !== st.R) continue;
    n++; const v = Math.hypot(st.R.vx, st.R.vy); if (st.R.vx > 0.8*v) fwd++;
  }
  ok(n > 0 && fwd === n, `Key Pass burst runs upfield (${fwd} of ${n})`);
}
// 3c. scrums release at the mark, whoever wins; ignoring a scrum never concedes worse than the ball
{
  let far = 0, n = 0, dom = 0;
  for (let i = 0; i < 40; i++) {
    T.newMatch(0, 1, { halfLen: 240, diff: 1, headless: false, duels: 'off' });
    for (let k = 0; k < 120; k++) T.update(STEP);
    T.scrum(i % 2, 60, 35, '');
    runUntil(() => M().phase === 'cut', 400);
    const c = M().cut;
    runUntil(() => M().phase !== 'cut', 900);
    if (c.result === 'dom1' || c.result === 'dom0') { dom++; continue; }
    const b = M().ball; if (b.state !== 'held') continue;
    n++; if (Math.hypot(b.carrier.x - (c.x + c.pos), b.carrier.y - c.y) > 2.5) far++;
  }
  ok(n > 0 && far === 0, `scrum ball released at the mark (${far} of ${n} far away)`);
  ok(dom === 0, `a scrum with no pushing never ends in a penalty or pushover (${dom} did)`);
}
// 4. no input falls back to the open game's odds
{
  let rucks = 0, frees = 0;
  for (let i = 0; i < 40; i++) {
    fresh(); T.debug.stage('past'); T.update(STEP);
    const c = M().cut; play(c, null, null);
    if (M().phase === 'set' && M().set.kind === 'ruck') rucks++;
    else if (M().ball.carrier === c.U && c.O.down > 0 && c.U.boost === 0) frees++;
  }
  ok(rucks + frees === 40 && rucks > 0 && frees > 0, `past with no input ends in a ruck or a broken tackle without a burst (${rucks} rucks, ${frees} breaks)`);
}
{
  fresh(); T.debug.stage('block'); const c = T.forceDuel('block');
  play(c, null, null);
  const b = M().ball;
  ok(b.state === 'air' && b.f.kind === 'pass' && b.f.rolled.has(c.U), 'block with no input completes the pass, and your man gets no second intercept roll');
}

// 5. the gate
{
  fresh('live'); T.debug.stage('past');
  ok(T.debug.duelGate('past') === 'normal', 'gate open in open play');
  M().charging = true; ok(!T.debug.duelGate('past'), 'gate shut while charging a kick'); M().charging = false;
  M().phase = 'set'; ok(!T.debug.duelGate('past'), 'gate shut during a set piece'); M().phase = 'play';
  M().clock = 10; ok(!T.debug.duelGate('past'), 'gate shut in the first 15s of a half'); M().clock = 30;
  M().duelLog.last = M().dclock - 10; ok(!T.debug.duelGate('tackle'), 'gate shut within 30s of the last duel');
  M().duelLog.last = -99; M().duelLog.lastKind = 'past'; ok(!T.debug.duelGate('past') && T.debug.duelGate('tackle'), 'never the same kind twice running');
  M().duelLog.lastKind = null; M().duelLog.half[0] = 99; ok(!T.debug.duelGate('tackle'), 'per-half cap holds');
  M().hooter = true; M().duelLog.last = M().dclock - 10; ok(T.debug.duelGate('tackle') === 'bonus', 'one Last Play bonus after the hooter');
  M().duelLog.bonus[0] = true; ok(!T.debug.duelGate('tackle'), 'only one bonus a half');
  T.newMatch(0, 1, { halfLen: 240, diff: 1, auto: true, headless: true, duels: 'live' });
  ok(M().duels === 'off', 'AI v AI forces duels off');
}

// 6. instant mode resolves at the trigger with no close-up
{
  const outs = new Set();
  for (let i = 0; i < 60; i++) {
    fresh('instant'); const kind = ['past', 'pass', 'tackle'][i % 3]; T.debug.stage(kind); T.update(STEP);
    ok(M().phase !== 'cut' && !M().cut, `instant ${kind} sets no close-up`);
    outs.add(kind);
  }
}

// 7. AI v AI never duels
{
  const res = T.simulate(3, 120, 1);
  ok(res.every(r => !r.stats.duels), 'simulate() runs with no duels');
}

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
