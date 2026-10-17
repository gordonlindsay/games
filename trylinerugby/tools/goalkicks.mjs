// Goal kicks: the closed-form flight, the judge, the band, the wind, the live
// close-up driven through the real input path, the CPU's kicks, the rate
// table and a render smoke test. Exits 1 on any failure.
// node tools/goalkicks.mjs [--rates N]   (N kicks per cell, default 1200; SEED=11 unless set)
process.env.SEED ??= '11';
import fs from 'fs';
const { T, kickBot, dropBot, rndCalls, reseed } = await import('./harness.mjs');

const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(k); return i >= 0 ? +args[i + 1] || d : d; };
const RATE_N = flag('--rates', 1200);
const K = T.kick, KICK = K.KICK, STEP = T.STEP, M = () => T.M, inp = T.input;
const D2R = Math.PI/180, MPH = 0.44704;
let failed = 0, passed = 0, group = '';
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', group + ':', msg); } };
const done = name => { console.log(`${name.padEnd(22)} ${failed ? 'FAIL so far ' + failed : 'ok'} (${passed} passed)`); };
const begin = name => { group = name; };

const teamK = k => T.teams.cleanTeam({ name:'Kick ' + k, kit:'#2050b0', trim:'#f2efe6', pace:1, power:1, handling:1, kicking:k }, 0);
const fresh = (diff = 1, kicking = 3, opts = {}) => T.newMatch(teamK(kicking), teamK(kicking), { halfLen:240, diff, headless:true, duels:'off', ...opts });
const world = (team, s) => K.toWorld(team, s.x, s.y);
const stage = (team, s, kind) => { const w = world(team, s); T.debug.goalKick(team, w.x, w.y, kind); return M().goal; };
const calm = g => { g.W = { x:0, y:0, mph:0 }; K.bandOf(g); return g; };
const calmGoal = (team, s, kind, diff = 1, kicking = 3) => { fresh(diff, kicking); const w = world(team, s); return calm(K.makeGoal(team, w.x, w.y, kind, null)); };
const run = (pred, max = 2000, drive) => { for (let i = 0; i < max && !pred(); i++) { if (drive) drive(); T.update(STEP); } return pred(); };
const steps = (n, drive) => { for (let i = 0; i < n; i++) { if (drive) drive(); T.update(STEP); } };
const conv = y => ({ x:110 - (11 + Math.abs(y - 35)*0.2), y });
const SPOTS = [
  ['Conversion, in front', conv(35), 'conversion'],
  ['Conversion, on the 15m line', conv(15), 'conversion'],
  ['Conversion, touchline', conv(4), 'conversion'],
  ['Penalty 22m, in front', { x:88, y:35 }, 'penalty'],
  ['Penalty 30m, 15m off centre', { x:110 - Math.sqrt(900 - 225), y:20 }, 'penalty'],
  ['Penalty on the 15m line, 30m out', { x:80, y:15 }, 'penalty'],
  ['Penalty touchline, 22m out', { x:88, y:5 }, 'penalty'],
  ['Penalty 40m, in front', { x:70, y:35 }, 'penalty'],
  ['Penalty 45m, 10m off centre', { x:110 - Math.sqrt(2025 - 100), y:25 }, 'penalty'],
];
// The rate table (Easy / Normal / Hard): you through the live cut, the CPU through strikeGoal.
// YOU and CPU are what this build measures, averaged over `--rates 4000` at SEED 11, 42 and 3
// (12,000 kicks a cell, so each is good to about half a point; a single 4,000 run left one cell
// 3 standard errors out). The _SPEC tables are the build spec's columns, from a prototype bot with
// no step quantising and the Easy band at aim 0. Easy sits about 5pp above the spec on wide kicks
// because its band is derived at the preset aim, so the arrow it hands you scores (test 8). Test 14
// pins each cell to the measured table within the sampling noise, and holds each spec table to 3.5pp rms.
const YOU      = [[100,100,100],[80,62,53],[55,41,34],[89,83,75],[79,64,54],[67,54,46],[57,44,37],[76,61,47],[64,50,43]];
const YOU_SPEC = [[100,100,100],[76,62,53],[48,41,34],[89,83,75],[75,65,54],[66,52,47],[53,45,36],[73,60,49],[64,50,42]];
const CPU      = [[100,100,100],[56,63,66],[37,44,45],[76,81,84],[57,65,68],[48,56,57],[39,46,49],[54,61,65],[45,51,55]];
const CPU_SPEC = [[100,100,100],[55,63,67],[37,42,44],[76,83,84],[55,65,67],[47,53,57],[39,47,49],[55,62,64],[45,52,55]];
const PIN_N = 12000;   // kicks behind each pinned cell
T.debug.settings().tut = T.debug.TUT_IDS.slice();   // the aids follow the difficulty (every tutorial moment seen, as the harness sets); the first-kick onboarding is checked on its own

// 1. the closed form agrees with a 1ms Euler integration
begin('closed form');
{
  const g = calmGoal(0, SPOTS[4][1], 'penalty');
  for (const [wx, wy, curl] of [[0, 0, 0], [3, 0, 0], [0, -4, 2], [-2, 2, -3], [4, 4, -1]]) {
    g.W = { x:wx, y:wy, mph:9 };
    const L = K.launchOf(g, 0.7, 0.05, curl), p = { ...L.p0 }, v = { ...L.v0 }, dt = 0.001;
    for (let i = 0; i < 2000; i++) for (const a of ['x', 'y', 'h']) { p[a] += v[a]*dt; v[a] += (L.A[a] - KICK.kd*v[a])*dt; }
    const q = K.posAt(L, 2);
    ok(Math.hypot(p.x - q.x, p.y - q.y, p.h - q.h) < 0.02, `posAt within 2cm of Euler at 2s (wind ${wx},${wy} curl ${curl}: ${Math.hypot(p.x - q.x, p.y - q.y, p.h - q.h).toFixed(4)})`);
  }
}
done('1 closed form');

// 2. judge fixtures, in the frame
begin('judge');
for (const [y, h, want] of [[35, 4, 'goal'], [32.3, 4, 'postIn'], [32.3, 2, 'post'], [32.1, 4, 'post'], [37.7, 4, 'postIn'], [37.9, 4, 'post'], [35, 3.1, 'barIn'], [35, 2.9, 'bar'], [35, 2.5, 'short'], [31.9, 5, 'wideL'], [38.1, 5, 'wideR'], [32.3, 12, 'goal'], [32.1, 12, 'wideL']]) {
  const got = K.judgeCross({ land:false, x:110, y, h, t:1 });
  ok(got === want, `y ${y} h ${h} is ${want} (got ${got})`);
}
ok(K.judgeCross({ land:true, x:100, y:35, h:0, t:1 }) === 'short', 'a ball that lands first is short');
ok(K.scores('goal') && K.scores('postIn') && K.scores('barIn') && !K.scores('post') && !K.scores('bar') && !K.scores('short'), 'scores() is true for goal, postIn and barIn only');
done('2 judge fixtures');

// 3. the mirror: a team 1 kick built from the mirrored world spot gives the same frame result
begin('mirror');
{
  const s = SPOTS[4][1], W = { x:2, y:1, mph:5 };
  const g0 = calmGoal(0, s, 'penalty'), g1 = calmGoal(1, s, 'penalty');
  ok(Math.abs(g1.x - s.x) < 1e-9 && Math.abs(g1.y - s.y) < 1e-9, `team 1 is mirrored into the frame (${g1.x.toFixed(2)}, ${g1.y.toFixed(2)})`);
  g0.W = W; g1.W = W; K.bandOf(g0); K.bandOf(g1);
  K.strikeGoal(g0, 0.6, 0.02); K.strikeGoal(g1, 0.6, 0.02);
  ok(g0.res === g1.res && Math.abs(g0.X.y - g1.X.y) < 1e-9 && Math.abs(g0.X.h - g1.X.h) < 1e-9, `same res and frame crossing both ways (${g0.res} / ${g1.res})`);
  const w = K.toWorld(1, g1.X.x, g1.X.y);
  ok(Math.abs(w.x - 10) < 0.05, `team 1 crosses the world line at x 10 (${w.x.toFixed(3)})`);
  K.strikeGoal(g1, g1.hi + 0.12, 0);
  const wl = K.toWorld(1, g1.X.x, g1.X.y);
  ok(g1.res === 'wideL' && wl.y > 35, `a team 1 wideL has world y > 35 (${g1.res}, y ${wl.y.toFixed(1)})`);
  const v = K.frameVec(1, { x:1, y:2 });
  ok(v.x === -1 && v.y === -2, 'frameVec mirrors a vector for team 1');
}
done('3 mirror');

// 4. pure strikes score
begin('pure strikes');
for (let kk = 1; kk <= 5; kk++) for (const [name, s, kind] of SPOTS) {
  const g = calmGoal(0, s, kind, 1, kk);
  if (g.mClear > KICK.range) continue;
  K.strikeGoal(g, g.ctr, 0);
  ok(g.ok, `${name}, kicking ${kk}: a calm band-centre strike at aim 0 scores (${g.res}, h ${g.X.h.toFixed(2)})`);
}
done('4 pure strikes');

// 5. band honesty
begin('band');
for (const [name, s, kind] of SPOTS) {
  const g = calmGoal(0, s, kind);
  if (g.mClear > 1) continue;
  const lo = K.crossOf(K.launchOf(g, g.mClear - 0.02, 0, 0)), hi = K.crossOf(K.launchOf(g, g.mClear + 0.01, 0, 0));
  ok(lo.land || lo.h < KICK.bar + KICK.clear, `${name}: mClear - 0.02 doesn't clear 3.3m (h ${lo.h.toFixed(2)})`);
  ok(!hi.land && hi.h >= KICK.bar + KICK.clear, `${name}: mClear + 0.01 clears 3.3m (h ${hi.h.toFixed(2)})`);
  ok(g.lo >= 0.28 && g.hi <= 1.1 && g.ctr >= KICK.floor && g.ctr <= KICK.ceil, `${name}: the band sits between the floor and the ceiling (${g.lo.toFixed(2)}-${g.hi.toFixed(2)})`);
}
done('5 band honesty');

// 6. curl: over hooks left, under fades right and drops
begin('curl');
for (const team of [0, 1]) {
  const g = calmGoal(team, SPOTS[4][1], 'penalty');
  const Xc = { ...K.strikeGoal(g, g.ctr, 0).X }, Xo = { ...K.strikeGoal(g, g.hi + 0.05, 0).X }, Xu = { ...K.strikeGoal(g, g.lo - 0.05, 0).X };
  ok(Xo.y < Xc.y, `team ${team}: m = hi + 0.05 crosses at a smaller frame y (${Xo.y.toFixed(2)} < ${Xc.y.toFixed(2)})`);
  ok(Xu.y > Xc.y && Xu.h < Xc.h, `team ${team}: m = lo - 0.05 crosses at a larger y and lower (${Xu.y.toFixed(2)} > ${Xc.y.toFixed(2)}, h ${Xu.h.toFixed(2)} < ${Xc.h.toFixed(2)})`);
  if (team === 1) {
    const wo = K.toWorld(1, Xo.x, Xo.y), wc = K.toWorld(1, Xc.x, Xc.y);
    ok(wo.y > wc.y, `team 1's hook goes to world +y (${wo.y.toFixed(2)} > ${wc.y.toFixed(2)})`);
  }
}
done('6 curl');

// 7. wind
begin('wind');
{
  const s = SPOTS[4][1];
  const g0 = calmGoal(0, s, 'penalty'), y0 = K.strikeGoal(g0, g0.ctr, 0).X.y;
  const gc = calmGoal(0, s, 'penalty'); gc.W = { x:0, y:10*MPH, mph:10 }; K.bandOf(gc);
  const dy = K.strikeGoal(gc, gc.ctr, 0).X.y - y0;
  ok(dy >= 2.0 && dy <= 2.6, `a 10 mph +y crosswind moves the 30m crossing by +2.0 to +2.6m (${dy.toFixed(2)})`);
  const gh = calmGoal(0, s, 'penalty'); gh.W = { x:-10*MPH*Math.cos(gh.beta), y:-10*MPH*Math.sin(gh.beta), mph:10 }; K.bandOf(gh);
  const gt = calmGoal(0, s, 'penalty'); gt.W = { x:10*MPH*Math.cos(gt.beta), y:10*MPH*Math.sin(gt.beta), mph:10 }; K.bandOf(gt);
  ok(gh.mClear > g0.mClear && gt.mClear < g0.mClear, `a headwind raises mClear and a tailwind lowers it (${gh.mClear.toFixed(3)} > ${g0.mClear.toFixed(3)} > ${gt.mClear.toFixed(3)})`);
  const g1 = calmGoal(0, s, 'penalty', 1, 1), g5 = calmGoal(0, s, 'penalty', 1, 5);
  ok(g5.mClear < g1.mClear, `kicking 5 has a lower mClear than kicking 1 (${g5.mClear.toFixed(3)} < ${g1.mClear.toFixed(3)})`);
  fresh(1); M().wind.mph = 1;
  let zero = true; for (let i = 0; i < 50; i++) { const w = K.kickWind(0); if (w.x || w.y || w.mph) zero = false; }
  ok(zero, 'below 2 mph the kick wind is exactly (0, 0)');
  fresh(1); M().wind.mph = 12; M().wind.a = 0;
  const w0 = K.kickWind(0), w1 = K.kickWind(1);
  ok(w0.x > 0 && w1.x < 0, `the same world wind is mirrored into team 1's frame (${w0.x.toFixed(2)} / ${w1.x.toFixed(2)})`);
}
done('7 wind');

// 8. the Easy aid is correct: the preset aim scores in any wind
begin('easy aid');
for (const [name, s, kind] of SPOTS) {
  const D = Math.hypot(110 - s.x, 35 - s.y); if (D > 37.3) continue;
  let n = 0;
  for (let i = 0; i < 200; i++) { fresh(0); const g = K.makeGoal(0, s.x, s.y, kind, null); if (K.strikeGoal(g, g.ctr, K.aimFor(g, g.ctr)).ok) n++; }
  ok(n >= 196, `${name}: aim = aimFor(g, ctr) at m = ctr scores at least 98% across match winds (${n/2}%)`);
}
{
  T.debug.settings().tut = T.debug.TUT_IDS.filter(id => id !== 'goal'); fresh(1); const g = K.makeGoal(0, 88, 35, 'penalty', null);
  ok(g.aid === 'path' && g.aim !== 0, 'the first kick ever (the tutorial\'s goal moment unseen) gets the Easy path on Normal');
  T.debug.tutMark('goal'); fresh(1); const g2 = K.makeGoal(0, 88, 35, 'penalty', null);
  ok(g2.aid === 'line' && g2.aim === 0, 'after it, Normal starts on the posts with the line');
  fresh(0); const g3 = K.makeGoal(0, 88, 35, 'penalty', null);
  ok(g3.aid === 'path', 'Easy always draws the path');
}
done('8 easy aid');

// 9. the flow of a live kick in a headless user match
begin('flow');
{
  fresh(1); const g = stage(0, conv(35), 'conversion');
  ok(M().phase === 'cut' && M().cut.kind === 'goal' && M().cut.g === g, 'goalKick for team 0 opens a goal cut');
  const snap = () => JSON.stringify({ p:M().players.map(p => [p.x, p.y, p.vx, p.vy]), b:[M().ball.x, M().ball.y, M().ball.state], clock:M().clock });
  const a = snap(); steps(60);
  ok(snap() === a && M().phase === 'cut', 'players, ball and clock are frozen under the close-up');
  const c = M().cut;
  ok(run(() => M().phase !== 'cut', 2000, () => kickBot(c)), 'kickBot completes the kick');
  ok(g.ok && M().score[0] === 2 && M().phase === 'set' && M().set.kind === 'score', `a goal adds 2 and is followed by a score set (${g.res}, score ${M().score}, ${M().phase}/${M().set && M().set.kind})`);
  ok(run(() => M().phase === 'set' && M().set.kind === 'kickoff', 200), 'then a kickoff');
  ok(M().set.team === 1, 'by team 1');
  ok(M().stats.gk.att[0] === 1 && M().stats.gk.made[0] === 1, 'the attempt and the goal are counted');
  fresh(1); const g2 = stage(0, { x:88, y:35 }, 'penalty'); const c2 = M().cut;
  run(() => M().phase !== 'cut', 2000, () => kickBot(c2, { m:1, aim:0 }));
  ok(!g2.ok && g2.m >= 0.99 && g2.grade === 'Overcooked', `a full-power penalty is overcooked and misses (${g2.res}, m ${g2.m.toFixed(2)}, ${g2.grade})`);
  ok(run(() => M().phase === 'set' && M().set.kind === 'dropout', 200) && M().set.team === 1, 'a missed penalty goal ends in a 22 drop-out by team 1');
}
done('9 flow');

// 10. input guards
begin('input guards');
{
  fresh(1); const g = stage(0, { x:88, y:35 }, 'penalty'), c = M().cut;
  inp.aDown = true; steps(16);
  inp.aPressed = true; T.update(STEP);
  ok(g.stage === 'aim', 'a finger already down when the cut-in ends does not start Power');
  inp.aDown = false; T.update(STEP);
  inp.aPressed = true; inp.aDown = true; T.update(STEP);
  ok(g.stage === 'power', 'lifting and pressing again does');
  T.update(STEP); inp.aDown = false; T.update(STEP);
  ok(g.stage === 'aim' && !g.L, `a release under 12% returns to Aim with no strike (m ${g.m.toFixed(3)})`);
  steps(14);
  inp.aPressed = true; inp.aDown = true; steps(20);
  ok(g.stage === 'power' && g.m > 0.2, 'power builds while held');
  inp.aCancel = true; T.update(STEP);
  ok(g.stage === 'aim' && !g.L && !inp.aCancel, 'pointercancel during Power returns to Aim with no strike');
  inp.aDown = false; steps(14);
  inp.aPressed = true; inp.aDown = true; steps(20);
  M().paused = true; T.debug.resume();
  ok(g.stage === 'aim' && g.m === 0 && !inp.aDown && M().phase === 'cut', 'pause then resume during Power returns to Aim with m = 0');
  steps(2); inp.aPressed = true; inp.aDown = true; T.update(STEP);
  ok(g.stage === 'power' && g.m < 0.03, 'a fresh press after the resume starts the meter from empty');
  inp.aDown = false;
}
done('10 input guards');

// 11. determinism: nothing random between the release and the verdict
begin('determinism');
{
  fresh(1); const g = stage(0, SPOTS[4][1], 'penalty'), c = M().cut;
  steps(16); inp.aPressed = true; inp.aDown = true; steps(30); inp.aDown = false; T.update(STEP);
  ok(g.stage === 'runup' && g.res != null, 'the result is known at the release');
  const n0 = rndCalls();
  run(() => g.judged, 600);
  ok(g.judged && rndCalls() === n0, `rnd() is not called between the release and the verdict (${rndCalls() - n0} calls)`);
  const g2 = { ...g, L:null, X:null, res:null, grade:null }, g3 = { ...g, L:null, X:null, res:null, grade:null };
  K.strikeGoal(g2, g.m, g.aim); K.strikeGoal(g3, g.m, g.aim);
  ok(JSON.stringify(g2.X) === JSON.stringify(g3.X) && g2.res === g3.res && g2.res === g.res, 'the same g, m and aim give an identical X and res twice');
  inp.aDown = false;
}
done('11 determinism');

// 12. CPU kicks: the watch cut, Skip, and the instant path
begin('cpu kicks');
{
  fresh(1, 3, { headless:false }); const g = stage(1, { x:88, y:35 }, 'penalty'), c = M().cut;
  ok(M().phase === 'cut' && c.kind === 'goal' && g.watch && g.res != null, 'an interactive match opens a watch cut with the result already fixed');
  ok(K.goalLabels(c)[0] === 'Skip' && K.goalLabels(c)[1] == null, 'the A label is Skip and B is hidden');
  const runCpu = (skipAt) => {
    reseed(123); fresh(1, 3, { headless:false }); const g = stage(1, { x:84, y:20 }, 'penalty'), c = M().cut;
    run(() => M().phase !== 'cut', 2000, () => { if (skipAt != null && c.t >= skipAt && !g.judged) inp.aPressed = true; });
    return { res:g.res, score:M().score.slice(), skipped:g.skipped, t:c.t };
  };
  const a = runCpu(0.35), b = runCpu(null);
  ok(a.skipped && !b.skipped, `the skip registered (${a.skipped}) and the other run watched it through (${!b.skipped})`);
  ok(a.res === b.res && a.score.join() === b.score.join(), `a run skipped at 0.35s and an unskipped run end with the same res and score (${a.res}/${b.res}, ${a.score}/${b.score})`);
  ok(a.t < b.t, `skipping is quicker (${a.t.toFixed(2)}s v ${b.t.toFixed(2)}s)`);
  reseed(+process.env.SEED);   // back to this run's own sequence
  // the instant path: a headless CPU kick, then both teams under the menu demo's own flags (auto and demo, not headless), where a cut would hang the demo
  const instant = (team, opts, n) => {
    fresh(1, 3, opts); let cuts = 0, worst = 0, sets = 0, goal = 0;
    for (let i = 0; i < n; i++) {
      const g = stage(team, conv(35), 'conversion'); if (M().cut) cuts++; if (M().phase === 'goal') goal++;
      const w = K.toWorld(team, g.X.x, g.X.y); let best = 1e9;
      run(() => M().phase !== 'goal', 400, () => { best = Math.min(best, Math.hypot(M().ball.x - w.x, M().ball.y - w.y)); });
      worst = Math.max(worst, best);
      if (M().phase === 'set' && M().set.kind === 'score' && M().set.team === team) sets++;
    }
    return { cuts, worst, sets, goal, att:M().stats.gk.att[team] };
  };
  const h = instant(1, { auto:true }, 100);
  ok(h.cuts === 0 && h.goal === 100, `no cut starts for a headless CPU kick under M.auto (${h.cuts} cuts, phase goal ${h.goal}/100)`);
  ok(h.worst <= 0.05, `the top-down ball passes within 0.05m of toWorld(X) (worst ${h.worst.toFixed(3)})`);
  ok(h.sets === 100 && h.att === 100, `every instant kick ends in a score set and is counted (${h.sets} sets, ${h.att} attempts)`);
  for (const team of [0, 1]) {
    const d = instant(team, { auto:true, demo:true, headless:false }, 20);
    ok(d.cuts === 0 && d.goal === 20 && d.sets === 20 && d.worst <= 0.05, `the menu demo flies team ${team}'s kick instantly: no cut, phase goal, then a score set (${d.cuts} cuts, ${d.goal}, ${d.sets}, worst ${d.worst.toFixed(3)})`);
  }
}
done('12 cpu kicks');

// 13. instant equals live: the same inputs through the live cut and through goalKick's instant path (team 0 under auto, with
// g.cpu set to the live m and aim) give the same res, X, score and restart, a missed penalty's drop-out included
begin('instant = live');
{
  const restart = () => { run(() => M().phase === 'set' && M().set.kind !== 'score', 600); return M().set.kind + ' by ' + M().set.team; };
  const CASES = [['40m penalty, steered', SPOTS[7][1], 'penalty', null], ['22m penalty at full power', { x:88, y:35 }, 'penalty', { m:1, aim:0 }], ['conversion in front', conv(35), 'conversion', { m:0.4, aim:0 }]];
  const seen = new Set();
  for (const [name, s, kind, o] of CASES) {
    fresh(1); const g = stage(0, s, kind), c = M().cut;
    if (!o) { steps(16); inp.jx = 0.5; steps(10); inp.jx = 0; inp.aPressed = true; inp.aDown = true; steps(44); inp.aDown = false; T.update(STEP); }
    run(() => M().phase !== 'cut', 2000, () => { if (o) kickBot(c, o); });
    const live = { res:g.res, X:JSON.stringify(g.X), score:M().score.join('-'), made:M().stats.gk.made[0], restart:restart() };
    fresh(1, 3, { auto:true }); const w = world(0, s), g2 = K.makeGoal(0, w.x, w.y, kind, null);
    g2.W = g.W; K.bandOf(g2); g2.cpu = { m:g.m, aim:g.aim };
    T.debug.goalKick(0, w.x, w.y, kind, g2);
    ok(M().phase === 'goal' && !M().cut && g2.stage === 'fly', `${name}: team 0 under auto flies it instantly, with no cut`);
    run(() => M().phase !== 'goal', 600);
    const inst = { res:g2.res, X:JSON.stringify(g2.X), score:M().score.join('-'), made:M().stats.gk.made[0], restart:restart() };
    seen.add(live.res + (g.ok ? '+' : '-'));
    ok(live.res === inst.res && live.X === inst.X && live.res != null, `${name}: the same res and X both ways (${live.res} / ${inst.res}, m ${g.m.toFixed(3)}, aim ${(g.aim/D2R).toFixed(2)}°)`);
    ok(live.score === inst.score && live.made === inst.made, `${name}: the same score and count (${live.score} / ${inst.score})`);
    ok(live.restart === inst.restart, `${name}: the same restart (${live.restart} / ${inst.restart})`);
    if (name === '22m penalty at full power') ok(!g.ok && live.restart === 'dropout by 1', `${name}: a miss, and a 22 drop-out by team 1 (${live.restart})`);
    if (name === 'conversion in front') ok(g.ok && live.restart === 'kickoff by 1', `${name}: a goal, and a kickoff by team 1 (${live.restart})`);
  }
  ok([...seen].some(r => r.endsWith('+')) && [...seen].some(r => r.endsWith('-')), `the cases cover a score and a miss (${[...seen].join(', ')})`);
}
done('13 instant = live');

// 14. the rate table
begin('rates');
{
  reseed(+process.env.SEED);   // the table's sequence starts here, so it reproduces whatever the earlier tests draw
  const you = [], cpu = [];
  const youRate = (si, di, kk = 3) => {
    const [, s, kind] = SPOTS[si]; let n = 0;
    for (let i = 0; i < RATE_N; i++) { fresh(di, kk); const g = stage(0, s, kind), c = M().cut; run(() => g.res != null, 400, () => kickBot(c)); if (g.ok) n++; }
    return 100*n/RATE_N;
  };
  const cpuRate = (si, di) => {
    const [, s, kind] = SPOTS[si]; let n = 0;
    for (let i = 0; i < RATE_N; i++) { fresh(di, 3); const w = world(1, s), g = K.makeGoal(1, w.x, w.y, kind, null); if (K.strikeGoal(g, g.cpu.m, g.cpu.aim).ok) n++; }
    return 100*n/RATE_N;
  };
  console.log('spot'.padEnd(34), 'you E/N/H (measured)             cpu E/N/H (measured)');
  const f = (a, t) => a.map((v, i) => v.toFixed(1).padStart(5) + '/' + String(t[i]).padStart(3)).join(' ');
  // each cell is pinned to this build's measured table within 4 standard errors of the two samples (never under 6pp), so a
  // run at any seed passes unless the balance really moved; the build spec's tables are held by one rms figure each
  const tol = p => Math.max(6, 4*Math.sqrt(p*(100 - p)/RATE_N + p*(100 - p)/PIN_N));
  const DN = ['Easy', 'Normal', 'Hard'];
  let sq = 0, sqC = 0, sqS = 0, sqCS = 0;
  for (let si = 0; si < SPOTS.length; si++) {
    const y = [0, 1, 2].map(di => youRate(si, di)), c = [0, 1, 2].map(di => cpuRate(si, di));
    you.push(y); cpu.push(c);
    console.log(SPOTS[si][0].padEnd(34), f(y, YOU[si]), '   ', f(c, CPU[si]));
    for (let di = 0; di < 3; di++) {
      sq += (y[di] - YOU[si][di])**2; sqC += (c[di] - CPU[si][di])**2; sqS += (y[di] - YOU_SPEC[si][di])**2; sqCS += (c[di] - CPU_SPEC[si][di])**2;
      ok(Math.abs(y[di] - YOU[si][di]) <= tol(YOU[si][di]), `${SPOTS[si][0]} you ${DN[di]} within ${tol(YOU[si][di]).toFixed(1)}pp of ${YOU[si][di]} (${y[di].toFixed(1)})`);
      ok(Math.abs(c[di] - CPU[si][di]) <= tol(CPU[si][di]), `${SPOTS[si][0]} CPU ${DN[di]} within ${tol(CPU[si][di]).toFixed(1)}pp of ${CPU[si][di]} (${c[di].toFixed(1)})`);
    }
    ok(y[0] >= y[1] - 2 && y[1] >= y[2] - 2, `${SPOTS[si][0]}: Easy >= Normal - 2 and Normal >= Hard - 2 (${y.map(v => v.toFixed(0))})`);
  }
  const d = (a, t) => a.map((v, i) => (v - t[i] >= 0 ? '+' : '') + (v - t[i]).toFixed(1)).join('/');
  console.log('you minus the spec, E/N/H:', SPOTS.map((s, si) => s[0].split(',')[0].replace('Penalty ', '').replace('Conversion', 'conv') + ' ' + d(you[si], YOU_SPEC[si])).join('; '));
  const rmsS = Math.sqrt(sqS/27), rmsCS = Math.sqrt(sqCS/27);
  console.log(`rms you v measured ${Math.sqrt(sq/27).toFixed(1)}pp, v spec ${rmsS.toFixed(1)}pp; cpu v measured ${Math.sqrt(sqC/27).toFixed(1)}pp, v spec ${rmsCS.toFixed(1)}pp`);
  ok(rmsS <= 3.5, `you are within 3.5pp rms of the spec's bot column (${rmsS.toFixed(2)})`);
  ok(rmsCS <= 3.5, `the CPU is within 3.5pp rms of the spec's CPU column (${rmsCS.toFixed(2)})`);
  for (let di = 0; di < 3; di++) {
    ok(you[3][di] >= you[6][di], `22m in front >= touchline 22m out on ${['Easy', 'Normal', 'Hard'][di]}`);
    ok(you[7][di] >= you[8][di], `40m in front >= 45m off centre on ${['Easy', 'Normal', 'Hard'][di]}`);
  }
  for (const si of [3, 4, 7]) {
    const k1 = youRate(si, 1, 1), k5 = youRate(si, 1, 5);
    ok(k5 >= k1, `${SPOTS[si][0]}: kicking 5 >= kicking 1 on Normal (${k5.toFixed(0)} v ${k1.toFixed(0)})`);
  }
}
done('14 rate table');

// 15. wind state
begin('wind state');
{
  let maxM = 0, maxK = 0;
  for (let i = 0; i < 500; i++) { fresh(1); maxM = Math.max(maxM, M().wind.mph); for (let j = 0; j < 3; j++) maxK = Math.max(maxK, K.kickWind(j & 1).mph); }
  ok(maxM <= 18, `the match mph is at most 18 over 500 matches (${maxM.toFixed(1)})`);
  ok(maxK <= 22, `the gusted mph is at most 22 (${maxK.toFixed(1)})`);
  fresh(1); const a0 = M().wind.a; M().phase = 'play'; M().hooter = true; M().clock = M().halfLen + 46; T.update(STEP);
  ok(M().half === 2 && Math.abs(M().wind.a - a0 - Math.PI) < 1e-9, 'secondHalf turns the wind by pi');
  fresh(1, 3, { duels:'off' }); stage(0, conv(35), 'conversion');
  ok(M().phase === 'cut' && M().cut.kind === 'goal', 'goal cuts open with duels off');
}
done('15 wind state');

// 16. labels and the penalty card
begin('labels');
{
  fresh(1); const g = stage(0, conv(35), 'conversion'), c = M().cut;
  steps(16);
  let L = K.goalLabels(c);
  ok(L[0] === 'Kick' && L[1] == null && L[2] === true, `Aim: A reads Kick with a cue, B hidden (${L})`);
  inp.aPressed = true; inp.aDown = true; T.update(STEP); L = K.goalLabels(c);
  ok(g.stage === 'power' && L[0] === 'Kick' && L[2] === false, `Power: Kick with no cue (${L})`);
  inp.aDown = false;
  ok(K.cutTitle(c) === 'Conversion · 11m', `cutTitle gives "Conversion · 11m" (${K.cutTitle(c)})`);
  fresh(1); M().headless = false; T.debug.openPenalty(76, 35, 34); M().headless = true;
  const meta = document.getElementById('p-meta').textContent;
  ok(/^\d+m to the Posts[ \u00a0]· (Wind \d+ MPH|Calm)$/.test(meta), `the penalty meta reads like "34m to the Posts · Wind 9 MPH" (${meta})`);
  ok(document.getElementById('p-goal').disabled === false, 'Kick at Goal is enabled at 34m');
  fresh(1, 1); M().headless = false; T.debug.openPenalty(50, 35, 60); M().headless = true;
  ok(document.getElementById('p-goal').disabled === true, 'Kick at Goal is disabled for kicking 1 at 60m in front');
  fresh(1); T.debug.openPenalty(106, 35, 4);
  ok(M().phase === 'cut' && M().cut.g.x === 100 && M().ball.x === 100, `a penalty mark 4m out is kicked from 10m out (x ${M().cut.g.x})`);
  fresh(1, 3, { headless:false }); T.debug.goalKick(1, 50, 35, 'penalty');
  ok(M().cut && M().cut.g.watch && K.cutTitle(M().cut) === 'Penalty Goal · 40m', `a CPU penalty is titled Penalty Goal · 40m (${K.cutTitle(M().cut)})`);
}
done('16 labels and card');

// 17. render smoke test: no NaN reaches the canvas (method arguments, arrays and property sets alike), both aids and every
// difficulty are drawn, reduced motion too, and the framing holds at four sizes
begin('render');
{
  const bad = new Map(), sets = new Map();
  const mark = k => bad.set(k, (bad.get(k) || 0) + 1);
  const walk = (k, v) => { if (typeof v === 'number') { if (!Number.isFinite(v)) mark(k); } else if (typeof v === 'string') { if (/NaN|Infinity/.test(v)) mark(k); } else if (Array.isArray(v)) for (const x of v) walk(k, x); };
  globalThis.__ctxSpy = (k, a) => { if (a.length === 1 && typeof k === 'string' && /^(font|lineWidth|fillStyle|strokeStyle|globalAlpha)$/.test(k)) sets.set(k, (sets.get(k) || 0) + 1); for (const v of a) walk(k, v); };
  const draw = () => { const n = [...bad.values()].reduce((x, y) => x + y, 0); T.debug.drawCut(); return [...bad.values()].reduce((x, y) => x + y, 0) - n; };
  let frames = 0, layoutFails = 0, pathRun = 0, pathStale = 0; const aid = { path:0, line:0 };
  const flight = (g, c) => {                                                       // mid-flight, then after the verdict
    g.stage = 'flight'; g.tStrike = c.t; c.t += KICK.hitStop + g.X.t/2; frames += draw() === 0 ? 1 : 0;
    c.t = g.tStrike + KICK.hitStop + g.X.t + 0.3; g.judged = true; c.after = () => {}; c.hold = 1; frames += draw() === 0 ? 1 : 0;
    // the maximum tilt: an 18 mph tailwind at full power, sampled through the flight
    c.after = null; g.judged = false; g.W = { x:18*MPH*Math.cos(g.beta), y:18*MPH*Math.sin(g.beta), mph:18 }; K.bandOf(g); K.strikeGoal(g, 1, 0); g.cam = null;
    for (const u of [0.25, 0.5, 0.75, 1]) { c.t = g.tStrike + KICK.hitStop + g.X.t*u; frames += draw() === 0 ? 1 : 0; }
  };
  for (const [W, H] of [[844, 390], [667, 375], [932, 430], [740, 360]]) {
    T.debug.view(W, H);
    const A = { x:W - 108, y:H - 114, w:88, h:88 }, B = { x:W - 188, y:H - 144, w:68, h:68 }, pause = { x:W - 54, y:6, w:44, h:44 };
    const clear = (a, b) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
    for (const [name, s, kind] of SPOTS) {
      for (const [team, di] of [[0, 0], [0, 1], [0, 2], [1, 1]]) {                  // team 0 on every difficulty: the Easy path and the Normal/Hard line
        fresh(di, 3, { headless:team === 1 });
        if (team) M().headless = false;
        const g = stage(team, s, kind), c = M().cut;
        if (!team) aid[g.aid]++;
        const ly = K.layoutOf(c);
        const okL = ly.gapPx >= 38 && ly.ballY >= 0.78*H && ly.ballY <= 0.82*H && ly.topsY >= Math.max(44, 0.125*H) && ly.meter.x >= 0.52*W && clear(ly.meter, A) && clear(ly.meter, B) && ly.chip.x + ly.chip.w < W/2 - 100 && clear(ly.chip, pause);
        if (!okL) { layoutFails++; console.log('  layout', W + 'x' + H, name, 'team', team, JSON.stringify(ly)); }
        steps(20); frames += draw() === 0 ? 1 : 0;                                   // aim, or the CPU's settle
        if (!team) { g.stage = 'power'; g.m = 0.5; g.pt = 0.5*g.fill; frames += draw() === 0 ? 1 : 0; }
        if (!team) {                                                           // the run-up, with the aid at the released power
          g.stage = 'runup'; g.st = 0.2; g.m = g.hi + 0.1; K.strikeGoal(g, g.m, 0.02); frames += draw() === 0 ? 1 : 0;
          if (g.aid === 'path') { pathRun++; if (g.pathKey !== Math.round(g.aim*1000) + '|' + Math.round(g.m*200)) pathStale++; }
        }
        if (!team) K.strikeGoal(g, g.ctr, 0.02);
        flight(g, c);
      }
    }
  }
  T.debug.view(844, 390);
  T.debug.setRM(true);                                                             // reduced motion: no zoom, shake or trail, the fixed tilt, the cuts fade
  for (const [name, s, kind] of [SPOTS[0], SPOTS[7]]) {
    fresh(1); const g = stage(0, s, kind), c = M().cut;
    steps(20); frames += draw() === 0 ? 1 : 0;
    K.strikeGoal(g, g.ctr, 0); flight(g, c);
  }
  T.debug.setRM(false);
  globalThis.__ctxSpy = null;
  ok(bad.size === 0, `no non-finite number reaches the canvas (${[...bad.entries()].map(([k, v]) => k + ' x' + v).join(', ')})`);
  ok(sets.get('font') > 0 && sets.get('lineWidth') > 0 && sets.get('globalAlpha') > 0, `the spy sees property sets (font x${sets.get('font')}, lineWidth x${sets.get('lineWidth')}, globalAlpha x${sets.get('globalAlpha')})`);
  ok(aid.path === 4*SPOTS.length && aid.line === 8*SPOTS.length, `the Easy path and the Normal/Hard line are both drawn (${aid.path} path, ${aid.line} line kicks)`);
  ok(layoutFails === 0, `the framing holds at every size and spot (${layoutFails} failures)`);
  ok(pathRun > 0 && pathStale === 0, `in the run-up the Easy path is drawn at the released power, not the band centre (${pathStale} of ${pathRun} stale)`);
  console.log(`  ${frames} frames drawn clean`);
}
done('17 render smoke');

// 18. woodwork: the drawn ball 0.5s after a contact reads the way the verdict does. On screen it is between the uprights and
// beyond the goal line exactly when the kick scores; a post miss comes back into play on the far side of its upright
begin('woodwork');
{
  T.debug.view(844, 390);
  const counts = { post:0, postIn:0, bar:0, barIn:0 }; let wrong = 0, inside = 0, back = 0, out = 0, outTotal = 0;
  for (const [name, s, kind] of SPOTS) {
    for (const [wx, wy] of [[0, 0], [0, 5*MPH], [-4*MPH, -6*MPH]]) {
      const g = calmGoal(0, s, kind); g.W = { x:wx, y:wy, mph:Math.hypot(wx, wy)/MPH }; K.bandOf(g);
      const cam = K.kickCam(g), l = K.pr(cam, 110, KICK.upL, 3), r = K.pr(cam, 110, KICK.upR, 3), x0 = Math.min(l.sx, r.sx), x1 = Math.max(l.sx, r.sx);
      for (let m = g.lo - 0.1; m <= g.hi + 0.15; m += 0.01) for (let a = -6; a <= 6; a += 0.25) {
        K.strikeGoal(g, m, a*D2R);
        if (!(g.res in counts)) continue;
        counts[g.res]++;
        const p = K.ballAt(g, g.X.t + 0.5), sc = K.pr(cam, p.x, p.y, p.h);
        const between = !!sc && sc.sx > x0 && sc.sx < x1, beyond = p.x > 110;
        if ((between && beyond) !== g.ok) { wrong++; if (wrong <= 3) console.log('  woodwork', name, g.res, `X.y ${g.X.y.toFixed(2)} h ${g.X.h.toFixed(2)} -> x ${p.x.toFixed(1)} y ${p.y.toFixed(1)} sx ${sc && sc.sx.toFixed(0)} (posts ${x0.toFixed(0)}-${x1.toFixed(0)})`); }
        if (g.ok && between && beyond) inside++;
        if (!g.ok) { if (p.x < 110) back++; else if (wrong <= 3) console.log('  woodwork miss not back', name, g.res); }
        if (g.res === 'post' && (g.X.y < KICK.upL || g.X.y > KICK.upR)) { outTotal++; if (sc && (g.X.y < KICK.upL ? sc.sx < x0 : sc.sx > x1)) out++; }
      }
    }
  }
  const n = Object.values(counts).reduce((a, b) => a + b, 0), outside = counts.post;
  ok(counts.post > 50 && counts.postIn > 50 && counts.bar > 20 && counts.barIn > 20, `the sweep hits every kind of woodwork (${JSON.stringify(counts)})`);
  ok(wrong === 0, `between the uprights and beyond the line on screen exactly when it scores, on ${n} contacts (${wrong} wrong)`);
  ok(back === counts.post + counts.bar, `every post or bar miss is back in the field of play 0.5s later (${back}/${counts.post + counts.bar})`);
  ok(outTotal > 50 && out === outTotal, `a post miss from outside an upright is drawn going back outside it (${out} of ${outTotal})`);
  console.log(`  ${inside} scoring contacts carried on between the posts`);
  const g = calmGoal(0, SPOTS[3][1], 'penalty'); K.strikeGoal(g, g.ctr, 0);
  const t5 = K.ballAt(g, g.X.t + 0.5), t9 = K.ballAt(g, g.X.t + 0.9);
  ok(Math.hypot(t9.x - t5.x, t9.y - t5.y) < 1e-9 || !/post|bar/.test(g.res), 'a rebound stops after 0.5s');
  for (const res of ['post', 'bar']) {   // force the result on a band-centre strike: the horizontal motion is capped at 0.5s, the ball still drops
    const h = { ...g, res, ok:false }; const a = K.ballAt(h, h.X.t + 0.5), b = K.ballAt(h, h.X.t + 1.0);
    ok(Math.abs(b.x - a.x) < 1e-9 && Math.abs(b.y - a.y) < 1e-9 && b.h <= a.h, `${res}: the rebound's horizontal motion is capped at 0.5s (${a.x.toFixed(2)},${a.y.toFixed(2)} h ${a.h.toFixed(2)} -> ${b.x.toFixed(2)},${b.y.toFixed(2)} h ${b.h.toFixed(2)})`);
  }
}
done('18 woodwork');

// 19. the held ball: beside the kicker and drawn over him through Aim and Power, with no jump when he lets it go
begin('held ball');
{
  T.debug.view(844, 390);
  for (const [name, s, kind] of SPOTS) {
    const g = calmGoal(0, s, kind), cam = K.kickCam(g);
    const P = K.kickPose(g, -1, -1), pk = K.pr(cam, P.kx, P.ky, 0), pb = K.pr(cam, P.bx, P.by, P.bh);
    ok(P.held && pb.sx - pk.sx >= 0.12*pk.k && pb.sy < pk.sy - 0.8*pk.k && pb.sy > pk.sy - 1.4*pk.k, `${name}: the held ball sits to his right at hip height (${((pb.sx - pk.sx)/pk.k).toFixed(2)}m across, ${((pk.sy - pb.sy)/pk.k).toFixed(2)}m up)`);
    const a = K.kickPose(g, 0.12 - 1e-9, -1), b = K.kickPose(g, 0.12, -1);
    ok(Math.hypot(a.bx - b.bx, a.by - b.by, a.bh - b.bh) < 1e-6 && a.held && !b.held, `${name}: no jump at the drop (${Math.hypot(a.bx - b.bx, a.by - b.by, a.bh - b.bh).toExponential(1)}m)`);
    const e = K.kickPose(g, KICK.runup - 1e-9, -1);
    ok(Math.hypot(e.bx - g.x, e.by - g.y) < 1e-3 && Math.abs(e.bh - KICK.h0) < 1e-3, `${name}: the ball meets the mark as the boot arrives`);
  }
}
done('19 held ball');

// 20. the flight zoom ramps: under 0.08 per 1/60s step on an in-front conversion, and it never jumps anywhere
begin('zoom');
{
  T.debug.view(844, 390);
  let worst = 0, worstName = '';
  for (const [name, s, kind] of [...SPOTS, ['Penalty 12m, in front', { x:98, y:35 }, 'penalty']]) {
    const g = calmGoal(0, s, kind); K.strikeGoal(g, g.ctr, 0);
    const cam = K.kickCam(g); let Z0 = 1, dZ = 0, Zmax = 1;
    for (let tf = 0; tf <= g.X.t + 0.5; tf += STEP) { const p = K.ballAt(g, tf), v = K.kickView(g, cam, tf, p.x, p.y, p.h); dZ = Math.max(dZ, Math.abs(v.Z - Z0)); Z0 = v.Z; Zmax = Math.max(Zmax, v.Z); }
    if (dZ > worst) { worst = dZ; worstName = name; }
    if (name === 'Conversion, in front' || name === 'Penalty 12m, in front') ok(dZ < 0.08 && Zmax > 1.3, `${name}: the zoom changes by under 0.08 a step and reaches ${Zmax.toFixed(2)} (max step ${dZ.toFixed(3)})`);
  }
  ok(worst < 0.1, `no spot's zoom jumps more than 0.1 a step (worst ${worst.toFixed(3)} at ${worstName})`);
}
done('20 zoom');

// 21. the verdict banner: under the crossbar while the ball is up at the posts, up top when it has dropped short, clear of the ball either way and of the A button
begin('banner');
{
  const box = (W, H, low) => ({ x:W/2 - 160, y:low ? 0.62*H : 66, w:320, h:86 });   // the widest verdict ("Penalty Goal" at 46px) with its grade line
  const clear = (a, b) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
  for (const [W, H] of [[844, 390], [667, 375]]) {
    T.debug.view(W, H);
    const A = { x:W - 108, y:H - 114, w:88, h:88 };
    let lows = 0, highs = 0;
    for (const [name, s, kind] of SPOTS) for (const m of ['ctr', 'short']) {
      const g = calmGoal(0, s, kind); K.strikeGoal(g, m === 'ctr' ? g.ctr : g.lo - 0.15, 0); if (m === 'short' && g.res !== 'short') continue;
      const cam = K.kickCam(g), p = K.ballAt(g, g.X.t), sy = K.kickView(g, cam, g.X.t, p.x, p.y, p.h).sy, low = K.verdictLow(g), b = box(W, H, low);
      if (low) lows++; else highs++;
      ok(low === (sy < 0.55*H), `${W}x${H} ${name} ${m}: the banner goes low exactly when the ball is up at the posts (ball at ${(sy/H).toFixed(2)}H, ${low ? 'low' : 'high'})`);
      ok(low ? sy + 10 <= b.y : sy - 10 >= b.y + b.h, `${W}x${H} ${name} ${m}: the ball at the verdict is clear of the banner (ball ${sy.toFixed(0)}px, banner ${b.y.toFixed(0)}-${(b.y + b.h).toFixed(0)}px)`);
      ok(clear(b, A), `${W}x${H} ${name} ${m}: the banner is clear of the A button`);
    }
    ok(lows > 0 && highs > 0, `${W}x${H}: both positions are exercised (${lows} low, ${highs} high)`);
  }
  fresh(1); const g = stage(0, conv(35), 'conversion'), c = M().cut;
  run(() => M().phase !== 'cut', 2000, () => kickBot(c, { m:g.ctr, aim:0 }));
  ok(K.goalLabels(c)[1] == null, 'B stays hidden through the verdict hold, so only A can meet the banner');
}
done('21 banner');

// 22. the bot strikes on the step nearest its plan: a full step late (as it once was) moves the rate table by up to 4pp
begin('bot timing');
{
  let sum = 0, worst = 0, n = 0;
  for (let i = 0; i < 240; i++) {
    fresh(i % 3); const [x, y] = [[88, 35], [80, 15], [70, 35], [95, 20]][i % 4];
    T.debug.goalKick(0, x, y, 'penalty'); const c = M().cut, g = c.g, om = 0.3 + 0.6*((i*0.618034) % 1);
    run(() => g.res != null, 2000, () => kickBot(c, { m:om }));
    const d = g.m*g.fill - om*g.fill; sum += d; worst = Math.max(worst, Math.abs(d)); n++;
    inp.aDown = false;
  }
  ok(Math.abs(sum/n) < STEP/4 && worst <= STEP/2 + 1e-6, `strike minus plan: mean ${(sum/n*1000).toFixed(2)}ms, worst ${(worst*1000).toFixed(1)}ms (a step is ${(STEP*1000).toFixed(1)}ms)`);
}
done('22 bot timing');

/* ---------- Phase 2: drop goals ---------- */
// a pace-3 side, so the chargers run at the spec's 8.35 m/s: the drop tables depend on their speed where the placed-kick tables do not
const teamD = k => T.teams.cleanTeam({ name:'Drop ' + k, kit:'#2050b0', trim:'#f2efe6', pace:3, power:1, handling:1, kicking:k }, 0);
const freshD = (diff = 1, opts = {}) => T.newMatch(teamD(3), teamD(3), { halfLen:240, diff, headless:true, duels:'off', ...opts });
const DROPS = [['Drop 20m, in front', { x:90, y:35 }], ['Drop 30m, 10m off centre', { x:110 - Math.sqrt(900 - 100), y:25 }], ['Drop 35m, in front', { x:75, y:35 }]];
// the spec's Balance table for drops with no charger (Easy / Normal / Hard), and this build's measured rates: 2,000 drops a cell at each of SEED 11, 42 and 3
const DROP_SPEC = [[86, 79, 71], [71, 56, 42], [68, 56, 39]];
const DROP_YOU = [[87, 81, 72], [70, 56, 44], [70, 54, 41]];
const DROP_PIN_N = 6000;
// one drop through the real path: the carrier presses B with the stick forward, the world runs the 0.20s hold, the cut opens with the thumb still down, and dropBot plays it
const tryDrop = (spot, di, chargers, o) => {
  freshD(di); const c = K.stageDrop(spot, chargers || []);
  inp.bPressed = true; inp.bDown = true;
  if (!run(() => M().phase === 'cut', 30)) { inp.bDown = false; return { off:false, c }; }
  const cut = M().cut, g = cut.g;
  run(() => g.out || g.stage === 'flight', 3000, () => dropBot(cut, o));
  inp.bDown = false;
  return { off:true, c, cut, g };
};
const settle = () => run(() => M().phase !== 'cut', 400);   // the verdict hold and the cut-out

// 23. range and the label: the carrier is offered a drop goal in the zone, and not out of it, across it, early, or with the stick at touch or back; the chargers
// do not enter the label (2026-10-17): a man close in front leaves it on, and the cut then judges him
begin('drop zone');
{
  freshD(1); let c = K.stageDrop({ x:85, y:35 }, []);
  ok(K.dropZone(c).ok === true, 'dropZone is on for a carrier at (85, 35) with everyone 20m away');
  ok(K.cutTitle({ kind:'goal', g:K.goalOf(0, 85, 35, 'drop', c, K.windNow(0)) }) === 'Drop Goal · 25m', 'the cut tag reads "Drop Goal · 25m"');
  freshD(1); c = K.stageDrop({ x:60, y:35 }, []);
  ok(!K.dropZone(c).ok, 'off at 50m out');
  freshD(1); c = K.stageDrop({ x:96, y:52 }, []);
  ok(!K.dropZone(c).ok, `off at a 50° bearing (${(Math.atan2(35 - 52, 110 - 96)/D2R).toFixed(0)}°)`);
  freshD(1); c = K.stageDrop({ x:85, y:35 }, []); c.hold = 0.2;
  ok(!K.dropZone(c).ok, 'off with the ball held under 0.3s');
  c.hold = 2; inp.jx = 0; inp.jy = 0.8;
  ok(!K.dropZone(c).ok, 'off with the stick at touch (world y 0.8): B reads Kick');
  inp.jx = -0.5; inp.jy = 0;
  ok(!K.dropZone(c).ok, 'off with the stick back (x -0.5)');
  inp.jx = 1; c.hold += 0.3;
  ok(K.dropZone(c).ok, 'and on again with the stick forward');
  freshD(1); c = K.stageDrop({ x:85, y:35 }, []); M().phase = 'set';
  ok(!K.dropZone(c).ok, 'off outside open play'); M().phase = 'play';
  // the chargers do not enter the label: a standing man brought in from 14m to 2m in front, or one 6m off at full tilt, leaves it on (the old offer went off
  // once a late release was blocked, about 9m)
  freshD(1); c = K.stageDrop({ x:90, y:35 }, []); const q = M().players.find(p => p.team === 1);
  ok(K.dropZone(c).ok, 'on with the charger far away');
  let onAll = true, offAt = null;
  for (let d = 14; d >= 2; d -= 0.5) { q.x = c.x + d; q.y = c.y; q.vx = q.vy = 0; c.hold += 0.3; if (!K.dropZone(c).ok) { onAll = false; if (offAt == null) offAt = d; } }
  ok(onAll, `and on with a standing charger at every distance from 14m down to 2m in front${offAt != null ? ' (off at ' + offAt + 'm)' : ''}`);
  q.x = c.x + 6; q.y = c.y; q.vx = -9; q.vy = 0; c.hold += 0.3;
  ok(K.dropZone(c).ok, 'and with one 6m off at full tilt');
  ok(M().dropSeen[0] && M().dropSeen[0].has(q), 'the label notes him as a charger the cut will judge');
  // and the cut judges him: offered with a man standing 3m in front, the press opens the close-up, he is a charger in it and he stops the kick
  freshD(1); c = K.stageDrop({ x:90, y:35 }, [{ x:93, y:35 }]); const q3 = M().players.filter(p => p.team === 1)[0];   // stageDrop gives the first opponent the first charger's spot
  ok(K.dropZone(c).ok && K.kickLabel(0) === 'Drop Goal', 'offered, and B reads Drop Goal, with a man standing 3m in front');
  inp.bPressed = inp.bDown = true; run(() => M().phase === 'cut', 30); let cut = M().cut, g = cut && cut.g;
  ok(g && g.type === 'drop' && g.rush.length >= 1 && g.rush[0].q === q3, `the press opens the close-up with him charging (${g ? g.rush.length : '-'} chargers, ${g && g.rush[0] ? g.rush[0].d0.toFixed(2) : '-'}m off)`);
  if (g) { run(() => g.out || g.stage === 'flight', 3000, () => dropBot(cut, { m:g.ctr, aim:0 })); ok(g.out === 'smothered' || g.out === 'charged', `and he stops the kick (${g.out || 'clear'})`); }
  inp.bDown = false; settle();
  inp.jx = 0;
}
done('23 drop zone');

// 24. the trigger: a B tap is a chip, a 0.20s hold opens the close-up with the thumb still down, and a thumb that lifted during the cut-in waits for a fresh press
begin('drop trigger');
{
  freshD(1); let c = K.stageDrop({ x:85, y:35 }, []);
  inp.bPressed = true; inp.bDown = true; steps(11); inp.bDown = false; T.update(STEP);
  ok(!M().cut && M().ball.state === 'air' && M().ball.f.kind === 'kick', `a B tap held under 0.20s is a kick (${M().ball.state}, ${M().ball.f && M().ball.f.kind}, cut ${!!M().cut})`);
  freshD(1); c = K.stageDrop({ x:85, y:35 }, []);
  inp.bPressed = true; inp.bDown = true; steps(11);
  ok(M().phase === 'play' && M().charging, 'after 11 steps it is still charging a kick');
  T.update(STEP);
  const cut = M().cut, g = cut && cut.g;
  ok(M().phase === 'cut' && cut.kind === 'goal' && g.type === 'drop' && g.kind === 'drop', `held 0.20s it opens a goal cut with g.type drop (${M().phase}, ${cut && cut.kind}, ${g && g.type})`);
  ok(!M().charging && M().stats.dg.att[0] === 1 && M().goal === g, 'the charge is cleared and the attempt counted');
  ok(K.cutTitle(cut) === 'Drop Goal · 25m', `the tag reads Drop Goal · 25m (${K.cutTitle(cut)})`);
  ok(JSON.stringify(K.goalLabels(cut)) === JSON.stringify([null, 'Kick', false, false]), `A is hidden and B reads Kick through the cut-in (${K.goalLabels(cut)})`);
  steps(14);
  ok(g.stage === 'hold' && g.pt > 0 && g.m > 0, `the press carries over the cut-in: the meter is filling (${g.stage}, m ${g.m.toFixed(3)})`);
  inp.bDown = false; T.update(STEP);
  ok(g.stage === 'wait' && g.m === 0 && !g.L, 'a release under 12% returns to Wait with the meter empty and no strike');
  ok(K.goalLabels(cut)[3] === true, 'B pulses in Wait');
  steps(10); ok(g.stage === 'wait', 'and waits');
  inp.bPressed = true; inp.bDown = true; T.update(STEP);
  ok(g.stage === 'hold' && g.m < 0.03, `a fresh press starts the meter from empty (${g.stage}, m ${g.m.toFixed(3)})`);
  steps(30); inp.bCancel = true; T.update(STEP);
  ok(g.stage === 'wait' && !g.L, 'pointercancel during the hold returns to Wait with no kick');
  inp.bDown = false;
  // released during the cut-in
  freshD(1); c = K.stageDrop({ x:85, y:35 }, []);
  inp.bPressed = true; inp.bDown = true; steps(12); const c2 = M().cut, g2 = c2.g;
  inp.bDown = false; steps(14);
  ok(g2.stage === 'wait' && g2.m === 0, `B released during the cut-in leaves the cut in Wait (${g2.stage})`);
  inp.bPressed = true; inp.bDown = true; steps(20);
  ok(g2.stage === 'hold' && g2.m > 0.3, `a fresh press starts the meter (${g2.stage}, m ${g2.m.toFixed(2)})`);
  // pause during the hold: back to Wait, meter empty, chargers back where they stood
  M().paused = true; T.debug.resume();
  ok(g2.stage === 'wait' && g2.m === 0 && c2.t === 0.22 && !inp.bDown, `pause then resume during a drop returns to Wait with the meter empty and the chargers reset (${g2.stage}, t ${c2.t})`);
  inp.bDown = false;
}
done('24 drop trigger');

// 25. charging geometry: a standing charger 12m off never gets there, a full-tilt one 6m off charges a band-centre strike down, no release is Smothered,
// and with a standing charger at each distance the label reads Drop Goal every time while the live outcome turns over once, from blocked to clear
begin('charging');
{
  freshD(1); let c = K.stageDrop({ x:90, y:35 }, [{ x:102, y:35 }]); inp.bDown = true; K.startDropCut(c); let cut = M().cut, g = cut.g;
  ok(g.rush.length === 1 && Math.abs(g.rush[0].d0 - 12) < 1e-9 && g.rush[0].v0 === 0, `one charger, frozen 12m away and standing (${g.rush.map(r => r.d0.toFixed(2))})`);
  run(() => g.out || g.stage === 'flight', 3000, () => dropBot(cut, { m:g.ctr, aim:0 })); inp.bDown = false;
  ok(!g.out && g.stage === 'flight', `a band-centre release gets away from a standing charger 12m off (${g.out || 'clear'})`);
  settle();
  freshD(1); c = K.stageDrop({ x:90, y:35 }, [{ x:96, y:35, vx:-9, vy:0 }]); inp.bDown = true; K.startDropCut(c); cut = M().cut; g = cut.g;
  ok(Math.abs(g.rush[0].v0 - 8.35) < 1e-9, `a charger running at 9 m/s is frozen at his top speed, 8.35 (${g.rush[0].v0.toFixed(2)})`);
  run(() => g.out || g.stage === 'flight', 3000, () => dropBot(cut, { m:g.ctr, aim:0 })); inp.bDown = false;
  ok(g.out === 'charged' && g.L && M().stats.dg.charged[0] === 1, `a charger 6m away at full tilt: Charged Down (${g.out}, hit at +${g.hitT.toFixed(2)}s)`);
  settle();
  const kk = g.kicker, q = g.outQ;
  ok(M().phase === 'play' && M().ball.state === 'loose' && Math.abs(q.x - kk.x - 1.2) < 0.05 && Math.abs(q.y - kk.y) < 0.05, `a loose ball, with the charger 1.2m in front of the kicker (${(q.x - kk.x).toFixed(2)}, ${(q.y - kk.y).toFixed(2)})`);
  freshD(1); c = K.stageDrop({ x:90, y:35 }, [{ x:98, y:35, vx:-6, vy:0 }]); inp.bDown = false; K.startDropCut(c); cut = M().cut; g = cut.g;
  run(() => g.out, 3000);
  ok(g.out === 'smothered' && g.stage === 'wait' && !g.L, `no release at all: Smothered (${g.out}, stage ${g.stage}, at ${cut.t.toFixed(2)}s)`);
  settle();
  ok(M().phase === 'set' && M().set.kind === 'ruck' && g.kicker.down > 0 && Math.abs(g.outQ.x - g.kicker.x - 0.5) < 0.05, `then a tackle and a ruck, with the charger 0.5m in front (${M().phase}/${M().set && M().set.kind})`);
  // the label and the outcome are separate (2026-10-17): a standing charger at each distance leaves the label on every time; a pure strike released 0.1s
  // late (what the old offer judged) is blocked close in and gets away further out, turning over once
  const LATE = 0.10;
  let total = 0, offered = 0, blocked = 0, clear = 0, flips = 0, last = null, bound = null;
  for (let d = 4; d <= 14; d += 1) {
    freshD(1); c = K.stageDrop({ x:90, y:35 }, [{ x:90 + d, y:35 }]);
    if (K.dropZone(c).ok) offered++;
    inp.bDown = true; K.startDropCut(c); cut = M().cut; g = cut.g;
    const m = Math.min(1, g.ctr + LATE/g.fill);
    run(() => g.out || g.stage === 'flight', 3000, () => dropBot(cut, { m, aim:0 })); inp.bDown = false;
    const got = !g.out;
    total++; if (got) clear++; else blocked++;
    if (last != null && got !== last) { flips++; bound = d; } last = got;
    settle();
  }
  ok(offered === total && blocked > 0 && clear > 0 && flips === 1, `offered at ${offered} of ${total} distances; the late strike is blocked at ${blocked} and clear at ${clear}, turning over ${flips} time${flips === 1 ? '' : 's'}${bound ? ' at ' + bound + 'm' : ''}`);
}
done('25 charging');

// 26. hand-back: a goal is 3 points and a kickoff, wide is their 22, short leaves a live g3d ball that chasers run to, a post is a loose ball
begin('drop hand-back');
{
  let r = tryDrop({ x:90, y:35 }, 1, [], { m:null, aim:null });
  // the bot's own aim and release at 20m in front scores most of the time; take the first that does
  for (let i = 0; i < 20 && !r.g.ok; i++) r = tryDrop({ x:90, y:35 }, 1, []);
  let g = r.g;
  ok(g.ok && g.res === 'goal', `a drop from 20m in front scores (${g.res})`);
  settle();
  ok(M().score[0] === 3 && M().phase === 'set' && M().set.kind === 'score', `3 points and a score set (${M().score}, ${M().set && M().set.kind})`);
  ok(run(() => M().phase === 'set' && M().set.kind === 'kickoff', 200) && M().set.team === 1, 'then a kickoff by team 1');
  ok(M().stats.dg.att[0] === 1 && M().stats.dg.made[0] === 1, 'counted in M.stats.dg');
  r = tryDrop({ x:90, y:35 }, 1, [], { m:0.9, aim:-25*D2R }); g = r.g;   // the arrow swings left at 18°/s while the meter fills: well off by the release, and overcooked hooks it further left
  ok(/^wide/.test(g.res), `aimed well off and overcooked it is wide (${g.res}, aim ${(g.aim/D2R).toFixed(1)}°)`); settle();
  ok(run(() => M().phase === 'set' && M().set.kind === 'dropout', 200) && M().set.team === 1, `wide leads to a 22 drop-out by team 1 (${M().set && M().set.kind} by ${M().set && M().set.team})`);
  r = tryDrop({ x:75, y:35 }, 1, [], { m:0.2, aim:0 }); g = r.g;
  ok(g.res === 'short' && g.X.land, `a feeble drop from 35m falls short (${g.res}, lands at ${g.X.x.toFixed(1)})`);
  const tStrike = r.cut.t; settle();
  const b = M().ball, f = b.f;
  ok(M().phase === 'play' && b.state === 'air' && f && f.kind === 'g3d', `the cut ends with the ball live in the air as g3d (${b.state}, ${f && f.kind})`);
  ok(Math.abs(r.cut.t - tStrike - 0.6 - 0.07 - 0.25) < 0.05, `0.6s after the strike plus the hit-stop and the cut-out (${(r.cut.t - tStrike).toFixed(2)}s)`);
  ok(f && Number.isFinite(f.x1) && Number.isFinite(f.y1) && f.x1 > 0 && f.x1 < 120 && f.y1 > 0 && f.y1 < 70, `x1, y1 are finite and on the pitch (${f && f.x1.toFixed(1)}, ${f && f.y1.toFixed(1)})`);
  const w = K.toWorld(0, g.X.x, g.X.y);
  ok(f && Math.abs(f.x1 - w.x) < 1e-9 && Math.abs(f.y1 - w.y) < 1e-9 && Math.abs(f.t - 0.6) < 1e-9 && f.T === g.X.t, 'they are the world landing point, with the flight 0.6s in');
  const near = () => Math.min(...M().players.map(p => Math.hypot(p.x - f.x1, p.y - f.y1)));
  const d0 = near(); let caught = false;
  for (let i = 0; i < 60 && b.state === 'air'; i++) T.update(STEP);
  if (b.state !== 'air') caught = true;
  ok(caught || near() < d0 - 2, `over 60 steps a chaser closes on (x1, y1) (${d0.toFixed(1)}m to ${near().toFixed(1)}m${caught ? ', ball down' : ''})`);
  // a post: open the cut, calm its wind, search its own g for an aim that hits the woodwork at band centre, then let the bot release there
  freshD(1); const cst = K.stageDrop({ x:88, y:35 }, []); inp.bPressed = inp.bDown = true; run(() => M().phase === 'cut', 30);
  const cutP = M().cut, gp = cutP.g; gp.W = { x:0, y:0, mph:0 }; K.bandOf(gp);
  let aimP = null, resP = null;
  for (let a = -8; a <= 8 && aimP == null; a += 0.02) { K.strikeGoal(gp, gp.ctr, a*D2R); if (gp.res === 'post' || gp.res === 'bar') { aimP = a*D2R; resP = gp.res; } }
  gp.L = gp.X = gp.res = null;
  ok(aimP != null, `an aim exists that hits the woodwork from 22m (${resP} at ${aimP != null && (aimP/D2R).toFixed(2)}°)`);
  if (aimP != null) {
    gp.aim = aimP;   // the bot would steer there at 18°/s; set the arrow so the release is not waited on
    run(() => gp.out || gp.stage === 'flight', 3000, () => dropBot(cutP, { m:gp.ctr, aim:aimP })); inp.bDown = false;
    settle();
    ok(gp.res === resP && M().ball.state === 'loose' && Math.abs(M().ball.x - 109) < 1e-6 && M().ball.vx < 0, `a ${resP} miss leaves a loose ball 1m in front of the goal line bouncing back (${gp.res}, ${M().ball.state} at x ${M().ball.x.toFixed(1)}, vx ${M().ball.vx.toFixed(1)})`);
  }
  inp.bDown = false;
}
done('26 drop hand-back');

// 27. the CPU's drop: offered by the same rule from his side, no close-up while you defend, your man 2m in front blocks it, and a clear one scores only through judgeCross
begin('cpu drop');
{
  freshD(1, { headless:false }); inp.jx = inp.jy = 0;
  let p = K.stageDrop({ x:85, y:35 }, [{ x:87, y:35 }], 1);
  ok(M().ctrl.team === 0 && Math.abs(M().ctrl.x - 33) < 1e-9, `the staged team-0 player 2m in front is yours (at ${M().ctrl.x})`);
  ok(!K.cpuDropOffer(p), 'the CPU is not offered a drop with a man 2m in front');
  K.cpuDrop(p);
  ok(p.drop && p.drop.t === KICK.dropT && p.drop.g.cpu, 'cpuDrop sets the wind-up with the inputs drawn now');
  run(() => !p.drop, 40);
  ok(!p.drop && M().ball.state === 'loose' && M().stats.dg.att[1] === 1 && M().stats.dg.charged[1] === 1 && !M().cut, `your man 2m in front blocks it: a loose ball, counted as charged down, with no close-up (${M().ball.state})`);
  ok(Math.abs(M().ctrl.x - (p.x - 1.2)) < 0.3, `the blocker lands 1.2m in front of the kicker (${(p.x - M().ctrl.x).toFixed(2)}m)`);
  freshD(1, { headless:false }); p = K.stageDrop({ x:85, y:35 }, [], 1);
  ok(K.cpuDropOffer(p), 'with no team-0 player within 15m the drop is offered');
  K.cpuDrop(p); p.vx = -6; steps(6);
  ok(Math.hypot(p.vx, p.vy) < 5 && p.drop, `he checks his run at 12 m/s² during the wind-up (${Math.hypot(p.vx, p.vy).toFixed(1)} m/s after 0.1s from 6)`);
  freshD(1, { headless:false }); p = K.stageDrop({ x:85, y:35 }, [], 1);
  K.cpuDrop(p); const g = p.drop.g; g.cpu = { m:g.ctr, aim:K.aimFor(g, g.ctr) };   // a band-centre, wind-corrected strike
  run(() => !p.drop, 40);
  const b = M().ball;
  ok(b.state === 'air' && b.f.kind === 'g3d' && b.f.team === 1 && !M().cut, `it flies as a g3d ball in the top-down view with no close-up (${b.state}, ${b.f && b.f.kind})`);
  const w1 = { x:b.f.x1, y:b.f.y1 };
  ok(Math.abs(w1.x - 10) < 0.05 && w1.y > 32.2 && w1.y < 37.8, `its x1, y1 is the world crossing point at their posts (${w1.x.toFixed(2)}, ${w1.y.toFixed(1)})`);
  let maxZ = 0; run(() => b.state !== 'air', 600, () => { maxZ = Math.max(maxZ, b.z); });
  ok(M().score[1] === 3 && M().stats.dg.made[1] === 1 && M().phase === 'set' && M().set.kind === 'score', `it scores through judgeCross at the crossing: 3 points and a score set (${M().score}, ${M().phase}/${M().set && M().set.kind}, apex ${maxZ.toFixed(1)}m)`);
  freshD(1, { headless:false }); p = K.stageDrop({ x:85, y:35 }, [], 1);
  K.cpuDrop(p); const g2 = p.drop.g; g2.cpu = { m:g2.ctr, aim:15*D2R }; run(() => !p.drop, 40);
  run(() => M().ball.state !== 'air', 600);
  ok(M().score[1] === 0 && run(() => M().phase === 'set' && M().set.kind === 'dropout', 300) && M().set.team === 0, `a wide CPU drop is a 22 drop-out by team 0 (${M().set && M().set.kind} by ${M().set && M().set.team})`);
  ok(M().stats.drops === 1 && M().stats.dg.att[1] === 1, 'M.stats.drops still counts his attempts');
  // the AI carrier takes the real trigger: in the zone with the offer, a 7% roll each think while he runs at the line
  let dropped = 0;
  for (let k = 0; k < 20; k++) {
    freshD(1); p = K.stageDrop({ x:85, y:35 }, [], 1); M().phaseCount = 2;
    for (let i = 0; i < 200; i++) { T.update(STEP); if (p.drop || (M().ball.f && M().ball.f.kind === 'g3d')) { dropped++; break; } if (M().ball.carrier !== p) break; }
  }
  ok(dropped >= 3, `left alone in the zone, the AI carrier drops at goal (${dropped} of 20 runs)`);
}
done('27 cpu drop');

// 28. one posts rule: an ordinary kick crossing the line at y 35, z 3.1 is a drop goal; one crossing at y 32.25, z 2 is not, and its flight is unchanged
begin('one posts rule');
{
  // a 'kick' flight from (100, y) to (120, y) over 1s crosses x = 110 at u = 0.5 with z = 0.2 + H
  const cross = (y, z) => { freshD(1); K.stageDrop({ x:40, y:35 }, []); K.kickBall(0, 100, y, 120, y, 1, z - 0.2, 'kick'); const f = M().ball.f; run(() => M().ball.x >= 110 || M().ball.state !== 'air' || M().phase !== 'play', 80); return { f, score:M().score[0], phase:M().phase, same:M().ball.f === f, state:M().ball.state }; };
  let r = cross(35, 3.1);
  ok(r.score === 3 && r.phase === 'set' && M().set.kind === 'score', `a kick crossing at y 35, z 3.1 scores a drop goal (${r.score}, ${r.phase})`);
  r = cross(32.25, 2);
  ok(r.score === 0 && r.phase === 'play' && r.same && r.state === 'air', `one crossing at y 32.25, z 2 does not, and flies on unchanged (${r.score}, ${r.phase}, ${r.state})`);
  r = cross(35, 2.9);
  ok(r.score === 0 && r.phase === 'play' && r.same, `one under the bar at z 2.9 does not (${r.score})`);
  r = cross(37.7, 3.5);
  ok(r.score === 3, `one off the inside of the far upright above the bar does (${r.score})`);
  r = cross(38.1, 6);
  ok(r.score === 0 && r.phase === 'play', `one just outside the upright does not (${r.score})`);
}
done('28 one posts rule');

// 29. drop rates: no charger, through the real path, within the sampling noise of this build's measured table and ±6pp of the spec's; and with a
// full-tilt charger 12m away as the meter starts (staged 13.8m, since the hold runs 0.2s) the offered drops are charged down at most 12% on Normal
begin('drop rates');
{
  reseed(+process.env.SEED);
  const DN = ['Easy', 'Normal', 'Hard'], N = Math.max(100, Math.round(RATE_N/2));
  const tol = p => Math.max(6, 4*Math.sqrt(p*(100 - p)/N + p*(100 - p)/DROP_PIN_N));
  let sq = 0, sqS = 0;
  console.log('drop'.padEnd(28), 'you E/N/H (measured / spec)');
  for (let si = 0; si < DROPS.length; si++) {
    const [name, s] = DROPS[si], row = [];
    for (let di = 0; di < 3; di++) {
      let made = 0, off = 0;
      for (let i = 0; i < N; i++) { const r = tryDrop(s, di, []); if (!r.off) continue; off++; if (r.g.ok && !r.g.out) made++; }
      const pct = 100*made/Math.max(1, off); row.push(pct);
      ok(off === N, `${name} ${DN[di]}: offered every time with nobody near (${off}/${N})`);
      ok(Math.abs(pct - DROP_YOU[si][di]) <= tol(DROP_YOU[si][di]), `${name} ${DN[di]} within ${tol(DROP_YOU[si][di]).toFixed(1)}pp of ${DROP_YOU[si][di]} (${pct.toFixed(1)})`);
      ok(Math.abs(pct - DROP_SPEC[si][di]) <= 6 + 2*Math.sqrt(pct*(100 - pct)/N), `${name} ${DN[di]} within ±6pp (plus two standard errors) of the spec's ${DROP_SPEC[si][di]} (${pct.toFixed(1)})`);
      sq += (pct - DROP_YOU[si][di])**2; sqS += (pct - DROP_SPEC[si][di])**2;
    }
    console.log(name.padEnd(28), row.map((v, di) => v.toFixed(1).padStart(5) + '/' + String(DROP_YOU[si][di]).padStart(3) + '/' + String(DROP_SPEC[si][di]).padStart(3)).join(' '));
    ok(row[0] >= row[1] - 2 && row[1] >= row[2] - 2, `${name}: Easy >= Normal - 2 and Normal >= Hard - 2`);
  }
  console.log(`rms you v measured ${Math.sqrt(sq/9).toFixed(1)}pp, v spec ${Math.sqrt(sqS/9).toFixed(1)}pp`);
  for (const [name, s] of DROPS) {
    let off = 0, cd = 0, made = 0;
    for (let i = 0; i < N; i++) { const r = tryDrop(s, 1, [{ x:s.x + 13.8, y:s.y, vx:-9, vy:0 }]); if (!r.off) continue; off++; if (r.g.out === 'charged') cd++; else if (r.g.ok) made++; }
    const rate = off ? 100*cd/off : 0;
    console.log(`${name.padEnd(28)} full tilt 12m, Normal: offered ${(100*off/N).toFixed(0)}%, made ${off ? (100*made/off).toFixed(0) : 0}%, charged down ${rate.toFixed(1)}%`);
    ok(off > 0.5*N, `${name}: a full-tilt charger 12m away is offered on Normal (${off}/${N})`);
    ok(rate <= 12, `${name}: offered drops are charged down at most 12% on Normal (${rate.toFixed(1)}%)`);
  }
}
done('29 drop rates');

// 30. render smoke for the drop close-up: every stage with two chargers, at the widest and the smallest size, and the hand-back outcomes, with no non-finite number on the canvas
begin('drop render');
{
  const bad = new Map();
  const walk = (k, v) => { if (typeof v === 'number') { if (!Number.isFinite(v)) bad.set(k, (bad.get(k) || 0) + 1); } else if (typeof v === 'string') { if (/NaN|Infinity/.test(v)) bad.set(k, (bad.get(k) || 0) + 1); } else if (Array.isArray(v)) for (const x of v) walk(k, x); };
  globalThis.__ctxSpy = (k, a) => { for (const v of a) walk(k, v); };
  let frames = 0; const draw = () => { const n = [...bad.values()].reduce((x, y) => x + y, 0); T.debug.drawCut(); frames += [...bad.values()].reduce((x, y) => x + y, 0) === n ? 1 : 0; };
  for (const [W, H] of [[844, 390], [568, 320], [740, 360]]) {
    T.debug.view(W, H);
    for (const [, s] of DROPS) {
      for (const di of [0, 1]) {
        freshD(di); const c = K.stageDrop(s, [{ x:s.x + 12, y:s.y, vx:-8, vy:0 }, { x:s.x + 9, y:s.y + 4, vx:-3, vy:-2 }]); inp.bDown = false; K.startDropCut(c); const cut = M().cut, g = cut.g;
        const ly = K.layoutOf(cut);
        ok(ly.gapPx >= 38 && ly.ballY >= 0.78*H && ly.ballY <= 0.82*H && ly.meter.x >= 0.52*W, `${W}x${H} drop at (${s.x.toFixed(0)}, ${s.y}): the framing holds (gap ${ly.gapPx.toFixed(0)}px, ball ${(ly.ballY/H).toFixed(2)}H)`);
        steps(20); draw();                                                           // wait, pulsing, chargers closing
        inp.bPressed = inp.bDown = true; steps(20); draw();                          // hold, the meter half full, the aid at the live power
        inp.jx = 0.6; steps(5); inp.jx = 0; draw();
        inp.bDown = false; T.update(STEP); draw(); steps(8); draw();                 // the drop
        run(() => g.out || g.stage === 'flight', 60);
        if (g.stage === 'flight') { cut.t = g.tStrike + KICK.hitStop + g.X.t/2; draw(); cut.t = g.tStrike + KICK.hitStop + g.X.t + 0.3; g.judged = true; cut.after = () => {}; cut.hold = 1; draw(); }
        else draw();
        settle();
      }
    }
  }
  T.debug.view(844, 390);
  // a charge-down and a smother on screen
  freshD(1); let c = K.stageDrop({ x:90, y:35 }, [{ x:96, y:35, vx:-9, vy:0 }]); inp.bDown = true; K.startDropCut(c); let cut = M().cut, g = cut.g;
  run(() => g.out, 3000, () => dropBot(cut, { m:g.ctr, aim:0 })); inp.bDown = false;
  ok(g.out === 'charged', 'the charge-down scene is staged');
  for (const dt of [0, 0.1, 0.3, 0.6]) { cut.t = g.tStrike + KICK.hitStop + dt; draw(); }
  freshD(1); c = K.stageDrop({ x:90, y:35 }, [{ x:97, y:35, vx:-6, vy:0 }]); inp.bDown = false; K.startDropCut(c); cut = M().cut; g = cut.g;
  run(() => g.out, 3000); ok(g.out === 'smothered', 'the smother scene is staged');
  draw(); cut.t += 0.4; draw();
  T.debug.setRM(true); draw(); T.debug.setRM(false);
  globalThis.__ctxSpy = null;
  ok(bad.size === 0, `no non-finite number reaches the canvas in a drop close-up (${[...bad.entries()].map(([k, v]) => k + ' x' + v).join(', ')})`);
  console.log(`  ${frames} drop frames drawn clean`);
}
done('30 drop render');

// 31. the press decides: what the small button says when B goes down is what the hold gives. A Drop Goal press opens the close-up on the
// 0.20s step whatever moved in the meantime (the stick to touch, a charger arriving); the label stays what it was for the whole hold; a Kick
// press stays a kick though the zone comes good during it; a flick to touch costs nothing once the stick is back; and range and bearing are
// judged where the hold will leave him, so a label that reads Drop Goal opens a cut inside the zone
begin('press decides');
{
  const finish = (cut, o) => { const g = cut.g; run(() => g.out || g.stage === 'flight', 3000, () => dropBot(cut, o)); inp.bDown = false; settle(); };
  const holdSteps = Math.round(KICK.hold/STEP);
  // (a) armed, then the stick swings to touch 3 steps in: the cut still opens on the 12th step, and the label never wavered
  freshD(1); let c = K.stageDrop({ x:85, y:35 }, []);
  ok(K.kickLabel(0) === 'Drop Goal', 'B reads Drop Goal before the press');
  inp.bPressed = inp.bDown = true;
  let n = 0, labels = new Set();
  while (M().phase !== 'cut' && n < 40) { if (n === 3) { inp.jx = 0; inp.jy = 0.9; } labels.add(K.kickLabel(0)); T.update(STEP); n++; }
  let cutA = M().cut;
  ok(n === holdSteps && cutA && cutA.g.type === 'drop', `a Drop Goal press opens the close-up on step ${holdSteps} though the stick went to touch on step 4 (${n} steps, ${M().phase})`);
  ok(labels.size === 1 && labels.has('Drop Goal'), `and the label read Drop Goal for the whole hold (${[...labels]})`);
  inp.jx = 1; inp.jy = 0;
  if (cutA) { ok(!K.dropZone(c).ok && cutA.g.rush.length === 0, 'the zone itself is off in a cut, and nobody is charging'); finish(cutA); } else { inp.bDown = false; T.update(STEP); }
  // (b) armed, then a charger lands 3m in front during the hold: the cut opens on the 0.20s step and he is a charger in it
  freshD(1); c = K.stageDrop({ x:85, y:35 }, []); const q = M().players.find(p => p.team === 1);
  inp.bPressed = inp.bDown = true; steps(5); q.x = c.x + 3; q.y = c.y; q.vx = q.vy = 0;
  ok(run(() => M().phase === 'cut', holdSteps), `the press promised a drop: the cut opens (${M().phase})`);
  cutA = M().cut; let g = cutA && cutA.g;
  ok(g && g.rush.length === 1 && g.rush[0].q === q && g.rush[0].d0 < 3, `and he is in it as a charger, ${g && g.rush.length ? g.rush[0].d0.toFixed(2) : '-'}m off`);
  if (cutA) { finish(cutA, { m:g.ctr, aim:0 }); ok(g.out === 'smothered' || g.out === 'charged', `who stops the kick (${g.out})`); } else { inp.bDown = false; T.update(STEP); }
  // (c) a Kick press stays a kick: B pressed with the ball held 0.15s reads Kick, and keeps reading Kick though the zone comes good at 0.3s
  freshD(1); c = K.stageDrop({ x:85, y:35 }, []); c.hold = 0.15;
  ok(K.kickLabel(0) === 'Kick', 'B reads Kick with the ball held under 0.3s');
  inp.bPressed = inp.bDown = true; labels = new Set();
  for (let i = 0; i < 30; i++) { labels.add(K.kickLabel(0)); T.update(STEP); }
  ok(M().phase === 'play' && M().charging && !M().cut, `held 0.5s on a Kick press: still charging a kick, no close-up (${M().phase}, charging ${M().charging})`);
  ok(labels.size === 1 && labels.has('Kick'), `and the label read Kick throughout, though the zone came good at 0.3s (${[...labels]})`);
  inp.bDown = false; T.update(STEP);
  ok(M().ball.state === 'air' && M().ball.f.kind === 'kick', `the release is a kick (${M().ball.state}, ${M().ball.f && M().ball.f.kind})`);
  ok(K.kickLabel(0) === 'Kick', 'with the ball gone, B reads Kick');
  // (d) a flick to touch: off while it points there, on again the step the stick comes back
  freshD(1); c = K.stageDrop({ x:85, y:35 }, []);
  ok(K.dropZone(c).ok, 'on with the stick forward');
  inp.jx = 0; inp.jy = 0.9; steps(3, () => K.dropZone(c));
  ok(!K.dropZone(c).ok, 'off while the stick points at touch');
  inp.jx = 1; inp.jy = 0; T.update(STEP);
  ok(K.dropZone(c).ok, 'and on again as soon as it is forward: no cache to wait out');
  // (e) the zone is judged where the hold leaves him: at (98, 26) running at 8 m/s the kick would be taken past 40°, so B reads Kick; standing there it reads Drop Goal and the cut opens
  freshD(1); c = K.stageDrop({ x:98, y:26 }, []); c.vx = 8; c.vy = 0;
  const pj = K.projectHold(c, K.holdLead()), bearing = Math.atan2(35 - pj.y, 110 - pj.x)/D2R, now = Math.atan2(35 - c.y, 110 - c.x)/D2R;
  ok(now < 40 && bearing > 40 && !K.dropZone(c).ok, `at (98, 26) running at 8 m/s he is at ${now.toFixed(1)}° now but the hold ends at ${bearing.toFixed(1)}°: B reads Kick`);
  freshD(1); c = K.stageDrop({ x:98, y:26 }, []);
  ok(K.dropZone(c).ok, 'standing there it reads Drop Goal');
  inp.bPressed = inp.bDown = true;
  cutA = run(() => M().phase === 'cut', holdSteps) ? M().cut : null;
  ok(cutA && Math.abs(Math.atan2(35 - cutA.g.y, 110 - cutA.g.x)/D2R) <= 40, `and the press opens a cut inside the zone (${cutA ? (Math.atan2(35 - cutA.g.y, 110 - cutA.g.x)/D2R).toFixed(1) + '°' : 'no cut'})`);
  if (cutA) finish(cutA); else { inp.bDown = false; T.update(STEP); }
}
done('31 press decides');

// 32. the label projects the hold as it will really run: the kicker on his stick, the AI's chaser turning in, and the chargers as the hold will leave
// them, a man on his shoulder included. The label reads Drop Goal whatever they do (2026-10-17); through the real press path a late pure strike is
// blocked close in and clear further out, a man on the shoulder stops it, and a chaser deeper behind is out of the cut
begin('label projection');
{
  const finish = (cut, o) => { const g = cut.g; run(() => g.out || g.stage === 'flight', 3000, () => dropBot(cut, o)); inp.bDown = false; settle(); };
  const holdSteps = Math.round(KICK.hold/STEP);
  // the projection draws nothing random and leaves the world exactly as it found it
  freshD(1); let c = K.stageDrop({ x:85, y:35 }, [{ x:92, y:36, vx:-3, vy:1 }, { x:88, y:30 }]); c.vx = 6;
  const before = M().players.map(p => [p.x, p.y, p.vx, p.vy, p.fx, p.fy, p.down, p.tcd, p.side, p.hold, p.turn, p.lastA, p.boost].join(',')).join('|'), r0n = rndCalls();
  let pj = K.projectHold(c, K.holdLead()); K.dropZone(c);
  ok(M().players.map(p => [p.x, p.y, p.vx, p.vy, p.fx, p.fy, p.down, p.tcd, p.side, p.hold, p.turn, p.lastA, p.boost].join(',')).join('|') === before && rndCalls() === r0n && pj.x > c.x + 0.9, `projectHold and dropZone leave every player where he was and draw no random number (${rndCalls() - r0n} drawn)`);
  // the kicker's own run: standing with the stick forward he is 0.37m further on at the freeze, with the stick let go at 8 m/s he brakes; the projection says both
  freshD(1); c = K.stageDrop({ x:85, y:35 }, []);
  pj = K.projectHold(c, K.holdLead()); inp.bPressed = inp.bDown = true; run(() => M().phase === 'cut', holdSteps);
  ok(Math.abs(pj.x - c.x) < 1e-9 && Math.abs(pj.y - c.y) < 1e-9 && c.x - 85 > 0.3, `the projected kick spot is where the hold really left him: ${pj.x.toFixed(3)} v ${c.x.toFixed(3)}, ${(c.x - 85).toFixed(2)}m on from a standing start`);
  finish(M().cut);
  freshD(1); c = K.stageDrop({ x:85, y:35 }, []); c.vx = 8; inp.jx = 0; inp.jy = 0;
  pj = K.projectHold(c, K.holdLead()); inp.bPressed = inp.bDown = true; run(() => M().phase === 'cut', holdSteps);
  ok(Math.abs(pj.x - c.x) < 1e-9 && c.x - 85 < 8*K.holdLead() - 0.3, `with the stick let go he brakes, and the projection has him at ${pj.x.toFixed(3)} v ${c.x.toFixed(3)} (not ${(85 + 8*K.holdLead()).toFixed(2)})`);
  finish(M().cut); inp.jx = 1;
  // the chaser's run: a man standing 10m ahead is the AI's chaser, so he is moving and nearer at the freeze; the projected charger is the frozen one
  freshD(1); c = K.stageDrop({ x:90, y:35 }, [{ x:100, y:35 }]);
  pj = K.projectHold(c, K.holdLead()); let g0 = K.goalOf(0, pj.x, pj.y, 'drop', c, K.windNow(0)), r0 = K.rushersOf(c, g0, pj)[0];
  inp.bPressed = inp.bDown = true; run(() => M().phase === 'cut', holdSteps); let g = M().cut && M().cut.g, r1 = g && g.rush[0];
  ok(r0 && r1 && Math.abs(r0.d0 - r1.d0) < 1e-9 && Math.abs(r0.v0 - r1.v0) < 1e-9 && r1.v0 > 2 && r1.d0 < 9.5, `the projected charger is the frozen one: d0 ${r0.d0.toFixed(2)} v ${r1.d0.toFixed(2)}, v0 ${r0.v0.toFixed(2)} v ${r1.v0.toFixed(2)} (he has turned in during the hold)`);
  if (g) finish(M().cut, { m:g.ctr, aim:0 }); else { inp.bDown = false; T.update(STEP); }
  // the label and the live late strike through the real press path: a standing charger at 31 distances in a calm wind, the kicker standing with the stick
  // forward. The label reads Drop Goal at every one (the old offer refused 13 of them); a pure strike released 0.1s late is blocked close in and gets away
  // further out, turning over once
  const LATE = 0.10;
  let total = 0, offered = 0, clear = 0, flips = 0, last = null, bound = null, bad = [];
  for (let d = 7; d <= 10.001; d += 0.1) {
    freshD(1); M().wind = { a:0, mph:0 }; c = K.stageDrop({ x:110 - Math.sqrt(800), y:25 }, [{ x:110 - Math.sqrt(800) + d, y:25 }]);
    if (K.dropZone(c).ok) offered++; else bad.push(`not offered at ${d.toFixed(1)}m`);
    inp.bPressed = inp.bDown = true;
    if (!run(() => M().phase === 'cut', holdSteps)) { inp.bDown = false; bad.push(`no cut at ${d.toFixed(1)}m`); continue; }
    g = M().cut.g; total++;
    finish(M().cut, { m:Math.min(1, g.ctr + LATE/g.fill), aim:0 });
    const got = !g.out; if (got) clear++;
    if (last != null && got !== last) { flips++; bound = d; } last = got;
  }
  ok(offered === 31 && total === 31 && clear > 0 && clear < 31 && flips === 1, `offered at ${offered} of 31 distances; the late strike is blocked at ${total - clear} and clear at ${clear}, turning over ${flips} time${flips === 1 ? '' : 's'}${bound ? ' at ' + bound.toFixed(1) + 'm' : ''}${bad.length ? ' (' + bad.join('; ') + ')' : ''}`);
  console.log(`  standing charger 7-10m, calm: offered at ${offered} of 31 distances, the late pure strike blocked at ${total - clear} and clear at ${clear}${bound ? ', the boundary at ' + bound.toFixed(1) + 'm' : ''}`);
  // a man on the shoulder: 1.5m behind and 1m to the side, running with the carrier at 8 m/s. The label stays on (the old offer refused him). With the stick
  // forward he is the charger in the cut and stops a band-centre strike; with the stick let go the kicker brakes and the chaser reaches him during the
  // hold, but nobody tackles a man in a Drop Goal hold (dropHolding): the close-up still opens, he is its charger, and he stops the strike there
  freshD(1); c = K.stageDrop({ x:85, y:35 }, [{ x:83.5, y:36, vx:8, vy:0 }]); c.vx = 8; let qs = M().players.filter(p => p.team === 1)[0];
  ok(K.dropZone(c).ok && M().dropSeen[0].has(qs), 'a chaser on his shoulder at 8 m/s, the stick forward: offered, and in the label\'s set');
  inp.bPressed = inp.bDown = true; run(() => M().phase === 'cut', holdSteps); g = M().cut && M().cut.g;
  ok(g && g.rush.length === 1 && g.rush[0].q === qs && g.rush[0].d0 < 4, `and he is the charger in the cut (${g ? g.rush.map(r => r.d0.toFixed(2) + 'm').join(', ') : 'no cut'})`);
  if (g) { finish(M().cut, { m:g.ctr, aim:0 }); ok(g.out === 'smothered' || g.out === 'charged', `who stops a band-centre strike (${g.out || 'clear'})`); } else { inp.bDown = false; T.update(STEP); }
  freshD(1); c = K.stageDrop({ x:85, y:35 }, [{ x:83.5, y:36, vx:8, vy:0 }]); c.vx = 8; qs = M().players.filter(p => p.team === 1)[0]; inp.jx = 0; inp.jy = 0;
  ok(K.dropZone(c).ok && M().dropSeen[0].has(qs), 'with the stick let go: offered, and in the label\'s set');
  inp.bPressed = inp.bDown = true; run(() => M().phase === 'cut', holdSteps); g = M().cut && M().cut.g;
  ok(g && qs.down <= 0 && g.rush.some(r => r.q === qs), `the chaser reaches the braking kicker during the hold, but no tackle lands in it: the close-up opens with him as a charger (${g ? g.rush.map(r => r.d0.toFixed(2) + 'm').join(', ') : 'no cut, phase ' + M().phase})`);
  if (g) { finish(M().cut, { m:g.ctr, aim:0 }); ok(g.out === 'smothered' || g.out === 'charged', `and he stops a band-centre strike there (${g.out || 'clear'})`); } else { inp.bDown = false; T.update(STEP); }
  // a man standing 1.5m in front: the label reads Drop Goal, the press always reaches the close-up, and he smothers it there
  { let cut = 0, stopped = 0;
    for (let i = 0; i < 12; i++) {
      freshD(i % 3); c = K.stageDrop({ x:85, y:35 }, [{ x:86.5, y:35.3 }]); inp.jx = 1; inp.jy = 0;
      if (!K.dropZone(c).ok) continue;
      inp.bPressed = inp.bDown = true; run(() => M().phase === 'cut', holdSteps); const g2 = M().cut && M().cut.g;
      if (g2 && g2.type === 'drop') { cut++; finish(M().cut, { m:g2.ctr, aim:0 }); if (g2.out) stopped++; } else { inp.bDown = false; T.update(STEP); }
    }
    ok(cut === 12 && stopped === 12, `a man 1.5m in front: every Drop Goal press opens the close-up (${cut}/12) and he stops it there (${stopped}/12)`); }
  inp.jx = 1; inp.jy = 0;
  freshD(1); c = K.stageDrop({ x:85, y:35 }, [{ x:81, y:35, vx:8, vy:0 }]); c.vx = 8;
  ok(K.dropZone(c).ok && K.rushersOf(c, K.goalOf(0, 85, 35, 'drop', c, K.windNow(0)), null).length === 1, 'one 4m behind at full tilt: offered, and a charger');
  // the shoulder radius: behind the kick spot a chaser counts only within KICK.shoulder (4m), in the label's set and in the cut alike; deeper behind he is out of both
  freshD(1); c = K.stageDrop({ x:85, y:35 }, [{ x:80, y:35, vx:8, vy:0 }]); c.vx = 8;
  ok(K.dropZone(c).ok, 'one 5m behind at full tilt is outside the shoulder radius: offered');
  ok(K.rushersOf(c, K.goalOf(0, 85, 35, 'drop', c, K.windNow(0)), null).length === 0, 'and rushersOf leaves him out');
  const sh0 = KICK.shoulder; KICK.shoulder = 6;
  ok(K.dropZone(c).ok && K.rushersOf(c, K.goalOf(0, 85, 35, 'drop', c, K.windNow(0)), null).length === 1, 'with the lever at 6m he is counted as a charger, and the label stays on');
  KICK.shoulder = sh0;
  freshD(1); c = K.stageDrop({ x:85, y:35 }, [{ x:81.5, y:35, vx:8, vy:0 }]); c.vx = 8;
  ok(K.dropZone(c).ok && K.rushersOf(c, K.goalOf(0, 85, 35, 'drop', c, K.windNow(0)), null).length === 1, 'one 3.5m behind at full tilt is on the shoulder: offered, and a charger');
  freshD(1); c = K.stageDrop({ x:85, y:35 }, [{ x:90, y:35, vx:-8, vy:0 }]); c.vx = 8;
  ok(K.rushersOf(c, K.goalOf(0, 85, 35, 'drop', c, K.windNow(0)), null).length === 1, 'the radius applies behind only: a man 5m in front is a charger');
  freshD(1); c = K.stageDrop({ x:85, y:35 }, [{ x:76, y:35, vx:8, vy:0 }]); c.vx = 8;
  ok(K.dropZone(c).ok, 'one 9m behind at full tilt: offered');
  inp.bPressed = inp.bDown = true; run(() => M().phase === 'cut', holdSteps); g = M().cut && M().cut.g;
  ok(g && g.rush.length === 0, `and he is not a charger in the cut either (${g ? g.rush.length : '-'} chargers)`);
  if (!g) { inp.bDown = false; T.update(STEP); } else { finish(M().cut, { m:g.ctr, aim:0 }); ok(!g.out && g.stage === 'flight', `a band-centre strike gets away (${g.out || 'clear'})`); }
}
done('32 offer projection');

// 33. the CPU's drop on one clock: the offer projects the world through his 0.25s wind-up and judges a strike then, with your players given
// 0.30s to react, so a drop he is offered is one you can block by moving, and one you are already set to block he does not take
begin('cpu one clock');
{
  freshD(1, { headless:false }); inp.jx = inp.jy = 0;
  let p = K.stageDrop({ x:85, y:35 }, [{ x:90, y:35 }], 1);
  const u = M().ctrl;
  ok(u.team === 0 && Math.abs(K.toFrame(1, u.x, u.y).x - 90) < 1e-9, 'your man stands 5m in front of their carrier');
  const rn = rndCalls(), off5 = K.cpuDropOffer(p);
  ok(off5 && rndCalls() === rn, `standing still, he does not stop the offer: the CPU is offered the drop, with nothing random drawn (${rndCalls() - rn})`);
  K.cpuDrop(p);
  run(() => !p.drop, 40, () => { const dx = p.x - u.x, dy = p.y - u.y, m = Math.hypot(dx, dy) || 1; inp.jx = dx/m; inp.jy = dy/m; });   // you sprint at him the moment he winds up
  inp.jx = inp.jy = 0;
  ok(!p.drop && M().stats.dg.charged[1] === 1 && M().ball.state === 'loose', `you sprint at him through the wind-up and charge it down (${M().ball.state}, charged ${M().stats.dg.charged[1]})`);
  ok(Math.abs(M().ctrl.x - (p.x - 1.2)) < 0.3 && M().ball.kickInfo && M().ball.kickInfo.team === 1, 'the blocker lands 1.2m in front, and the loose ball is still a kicked ball');
  freshD(1, { headless:false }); inp.jx = inp.jy = 0;
  p = K.stageDrop({ x:85, y:35 }, [{ x:88, y:35 }], 1);
  ok(!K.cpuDropOffer(p), 'your man standing 3m in front: not offered');
  freshD(1, { headless:false }); inp.jx = inp.jy = 0;
  p = K.stageDrop({ x:85, y:35 }, [{ x:92, y:35, vx:-8, vy:0 }], 1); inp.jx = 1;   // running at him at 8 m/s with the stick held toward him
  ok(!K.cpuDropOffer(p), 'your man 7m in front and sprinting at him: not offered, he would be on the ball');
  inp.jx = 0;
  freshD(1, { headless:false }); inp.jx = inp.jy = 0;
  p = K.stageDrop({ x:85, y:35 }, [{ x:93, y:35, vx:-8, vy:0 }], 1); inp.jx = 1;
  ok(!K.cpuDropOffer(p), '8m in front and sprinting: not offered either, which is the 0.30s reaction margin (he would be clear of the ball at the strike itself)');
  freshD(1, { headless:false }); inp.jx = inp.jy = 0;
  p = K.stageDrop({ x:85, y:35 }, [{ x:97, y:35, vx:-8, vy:0 }], 1); inp.jx = 1;
  ok(K.cpuDropOffer(p), '12m in front and sprinting: offered');
  K.cpuDrop(p); run(() => !p.drop, 40); inp.jx = 0;
  ok(!p.drop && M().ball.state === 'air' && M().ball.f.kind === 'g3d' && M().stats.dg.charged[1] === 0, `and he gets it away (${M().ball.state}, ${M().ball.f && M().ball.f.kind})`);
  run(() => M().ball.state !== 'air', 600);
}
done('33 cpu one clock');

// 34. hand-backs are not turnovers, and a tactical kick's charge-down is as it was: a charged-down drop regathered by the kicking side, a drop off the post
// gathered by the defence and a short drop picked up by the defence all leave the turnover count alone; a charged-down tactical kick leaves the
// defender where he stood (no 1.2m placement) and is a kicked ball too
begin('hand-back possession');
{
  // a charge-down, the ball bouncing back to two support runners 2.5m behind the kicker
  freshD(1); let c = K.stageDrop({ x:90, y:35 }, [{ x:96, y:35, vx:-9, vy:0 }]); inp.jx = inp.jy = 0;
  const mates = M().players.filter(p => p.team === 0 && p !== c).slice(0, 2); mates[0].x = c.x - 2.5; mates[0].y = c.y - 1.5; mates[1].x = c.x - 2.5; mates[1].y = c.y + 1.5;
  inp.bDown = true; K.startDropCut(c); let cut = M().cut, g = cut.g;
  run(() => g.out || g.stage === 'flight', 3000, () => dropBot(cut, { m:g.ctr, aim:0 })); inp.bDown = false; settle();
  ok(g.out === 'charged' && M().ball.state === 'loose' && M().ball.kickInfo && M().ball.kickInfo.team === 0 && M().poss === 0, `charged down: a loose kicked ball, possession still ours (${g.out}, kickInfo ${JSON.stringify(M().ball.kickInfo)})`);
  g.outQ.x = 5; g.outQ.vx = g.outQ.vy = 0;                                       // the charger out of it: who regathers is the point
  run(() => M().ball.state === 'held' || M().phase !== 'play', 600);
  ok(M().ball.state === 'held' && M().ball.carrier.team === 0 && M().stats.turnovers === 0, `a support runner regathers it: no Turnover (${M().ball.state} by team ${M().ball.carrier && M().ball.carrier.team}, turnovers ${M().stats.turnovers})`);
  // off the post, gathered by a defender
  freshD(1); c = K.stageDrop({ x:88, y:35 }, []); inp.bPressed = inp.bDown = true; run(() => M().phase === 'cut', 30);
  cut = M().cut; g = cut.g; g.W = { x:0, y:0, mph:0 }; K.bandOf(g);
  let aimP = null;
  for (let a = -8; a <= 8 && aimP == null; a += 0.02) { K.strikeGoal(g, g.ctr, a*D2R); if (g.res === 'post' || g.res === 'bar') aimP = a*D2R; }
  g.L = g.X = g.res = null; g.aim = aimP;
  run(() => g.out || g.stage === 'flight', 3000, () => dropBot(cut, { m:g.ctr, aim:aimP })); inp.bDown = false; settle();
  ok(M().ball.state === 'loose' && M().ball.kickInfo && M().ball.kickInfo.team === 0, `off the woodwork: a loose kicked ball (${g.res}, kickInfo ${JSON.stringify(M().ball.kickInfo)})`);
  run(() => M().ball.z < 0.9 && M().ball.vz <= 0, 300);
  let d1 = M().players.find(p => p.team === 1 && p.down <= 0); d1.x = M().ball.x; d1.y = M().ball.y; d1.vx = d1.vy = 0;
  run(() => M().ball.state === 'held' || M().phase !== 'play', 300);
  ok(M().ball.state === 'held' && M().ball.carrier.team === 1 && M().stats.turnovers === 0, `a defender gathers it: no Turnover, as for any kick (team ${M().ball.carrier && M().ball.carrier.team}, turnovers ${M().stats.turnovers})`);
  // short, landing loose, picked up by a defender
  let r = tryDrop({ x:75, y:35 }, 1, [], { m:0.2, aim:0 }); g = r.g; settle();
  for (const p of M().players) if (p.team === 1) { p.x = 5; p.vx = p.vy = 0; }   // nobody under it: it lands
  ok(g.res === 'short' && M().ball.state === 'air' && M().ball.f.kind === 'g3d' && M().ball.kickInfo && M().ball.kickInfo.team === 0, `short: a live kicked ball (${M().ball.state}, kickInfo ${JSON.stringify(M().ball.kickInfo)})`);
  run(() => M().ball.state !== 'air', 400);
  ok(M().ball.state === 'loose', `it lands loose (${M().ball.state})`);
  d1 = M().players.find(p => p.team === 1 && p.down <= 0); d1.x = M().ball.x; d1.y = M().ball.y; d1.vx = d1.vy = 0;
  run(() => M().ball.state === 'held' || M().phase !== 'play', 300);
  ok(M().ball.state === 'held' && M().ball.carrier.team === 1 && M().stats.turnovers === 0, `a defender picks it up: no Turnover (team ${M().ball.carrier && M().ball.carrier.team}, turnovers ${M().stats.turnovers})`);
  // a tactical kick's charge-down: the 30% roll with a defender 1.5m behind the kicker. He stays where he is, and the ball is a kicked ball
  let charged = null, tries = 0;
  while (!charged && tries++ < 60) {
    freshD(1); c = K.stageDrop({ x:60, y:35 }, [{ x:58.5, y:35 }]); const q = M().players.find(p => p.team === 1);
    ok(K.kickLabel(0) === 'Kick', tries === 1 ? 'at 50m out B reads Kick' : 'kick');
    inp.bPressed = inp.bDown = true; T.update(STEP);
    if (M().ball.carrier !== c) continue;                                        // tackled on the press step: try again
    const qx = q.x, qy = q.y; inp.bDown = false; T.update(STEP);
    if (M().ball.state === 'loose' && M().ball.last === 1) { charged = { q, qx, qy, c, dx:q.x - c.x, dy:q.y - c.y }; q.x = 5; q.vx = q.vy = 0; }   // then out of it, so only the kicking side can gather
  }
  ok(!!charged, `a tactical kick with a defender 1.5m behind is charged down within ${tries} tries`);
  if (charged) {
    const { q, qx, qy, c:kk, dx, dy } = charged;
    ok(dx < 0 && Math.abs(kk.x + dx - qx) < 0.3 && Math.abs(kk.y + dy - qy) < 0.3, `the defender stays where he stood, behind the kicker (${dx.toFixed(2)}, ${dy.toFixed(2)} from him), not 1.2m in front`);
    ok(M().ball.kickInfo && M().ball.kickInfo.team === 0 && !M().ball.kickInfo.ownHalf, 'and the loose ball is a kicked ball');
    inp.jx = inp.jy = 0;
    const mate = M().players.find(p => p.team === 0 && p !== kk);
    run(() => M().ball.z < 0.9, 120); mate.x = M().ball.x; mate.y = M().ball.y; mate.vx = mate.vy = 0;
    run(() => M().ball.state === 'held' || M().phase !== 'play', 300);
    ok(M().ball.state === 'held' && M().stats.turnovers === 0, `regathered by team ${M().ball.carrier && M().ball.carrier.team}: no Turnover (turnovers ${M().stats.turnovers})`);
  }
  inp.jx = 1;
}
done('34 hand-back possession');

// 35. the first drop goal on this device gets the first-kick aids, and its cut-in marks the tutorial's drop moment seen
begin('first drop aids');
{
  T.debug.settings().tut = T.debug.TUT_IDS.filter(id => id !== 'drop');
  const r = tryDrop({ x:90, y:35 }, 1, []);
  ok(r.off && r.g.aid === 'path', `the first drop ever gets the Easy aids on Normal (${r.g.aid})`);
  ok(T.debug.tutSeen('drop'), `the drop's cut-in marks the drop moment seen (${JSON.stringify(T.debug.settings().tut)})`);
  settle();
  const r2 = tryDrop({ x:90, y:35 }, 1, []);
  ok(r2.g.aid === 'line', `and the next drop on Normal has the line (${r2.g.aid})`);
  settle();
  T.debug.settings().tut = T.debug.TUT_IDS.slice();
}
done('35 first drop aids');

// 36. one step count: the B press opens the cut on holdSteps() (the ceiling of hold/STEP, the press step the first) and holdLead() projects exactly the
// world steps that run before it, so the offer's kick spot and chargers are the cut's to the bit at holds on and off the 1/60 grid
// (GKTUNE='{"hold":0.205}' tries one from the shell; 0.20 is the lever as shipped)
begin('hold steps');
{
  const finish = (cut, o) => { const g = cut.g; run(() => g.out || g.stage === 'flight', 3000, () => dropBot(cut, o)); inp.bDown = false; settle(); };
  const h0 = KICK.hold;
  for (const h of [0.20, 0.205, 0.22, 0.25]) {
    KICK.hold = h;
    const want = Math.ceil(h/STEP - 1e-9);
    freshD(1); const c = K.stageDrop({ x:85, y:35 }, [{ x:97, y:35 }]); c.vx = 6;
    const pj = K.projectHold(c, K.holdLead()), r0 = K.rushersOf(c, K.goalOf(0, pj.x, pj.y, 'drop', c, K.windNow(0)), pj)[0];
    inp.bPressed = inp.bDown = true; let n = 0; while (M().phase !== 'cut' && n < 40) { T.update(STEP); n++; }
    const g = M().cut && M().cut.g, r1 = g && g.rush[0];
    ok(K.holdSteps() === want && n === want, `hold ${h}: the cut opens on step ${n} (holdSteps ${K.holdSteps()}, ceil ${want})`);
    ok(Math.abs(K.holdLead() - (n - 1)*STEP) < 1e-12, `and holdLead is ${n - 1} steps (${(K.holdLead()/STEP).toFixed(3)})`);
    ok(g && Math.abs(g.kicker.x - pj.x) < 1e-9 && Math.abs(g.kicker.y - pj.y) < 1e-9, `the projected kick spot is the cut's (${g ? (g.kicker.x - pj.x).toExponential(1) : 'no cut'}m off)`);
    ok(r0 && r1 && Math.abs(r0.d0 - r1.d0) < 1e-9 && Math.abs(r0.v0 - r1.v0) < 1e-9, `and the projected charger is the frozen one (d0 ${r0 && r0.d0.toFixed(3)} v ${r1 && r1.d0.toFixed(3)})`);
    if (g) finish(M().cut, { m:g.ctr, aim:0 }); else { inp.bDown = false; T.update(STEP); }
  }
  KICK.hold = h0;
  ok(KICK.hold === 0.20 && K.holdSteps() === 12 && Math.abs(K.holdLead() - 11*STEP) < 1e-12, 'as shipped: 12 steps to the cut, 11 of world');
}
done('36 hold steps');

// 37. chargers and the lens: the kicker, the ball and the chargers are drawn in one list by depth, so a charger closing from behind or beside the kicker
// goes over him; none is drawn until 2m in front of the lens, he fades in over the next 2m, none stands taller than 0.6H, no non-finite number reaches
// the canvas, and one who stops the kick lands on the side he came from
begin('charger depth');
{
  const H = 390; T.debug.view(844, H);
  // a charger 10m behind (staged with the shoulder lever widened, so rushersOf takes him) and one level, 3.5m to the side
  const sh0 = KICK.shoulder; KICK.shoulder = 15;
  freshD(1); let c = K.stageDrop({ x:85, y:35 }, [{ x:75, y:35.5, vx:8, vy:0 }, { x:85, y:38.5 }]); inp.bDown = true; K.startDropCut(c); let cut = M().cut, g = cut.g;
  KICK.shoulder = sh0;
  ok(g.rush.length === 2 && g.rush.some(r => r.ux > 0.9) && g.rush.some(r => Math.abs(r.ux) < 0.1), `two chargers, one from behind and one from the side (ux ${g.rush.map(r => r.ux.toFixed(2))})`);
  const cam = K.kickCam(g), nan = new Map(), order = [];
  const walk = (k, v) => { if (typeof v === 'number') { if (!Number.isFinite(v)) nan.set(k, (nan.get(k) || 0) + 1); } else if (typeof v === 'string') { if (/NaN|Infinity/.test(v)) nan.set(k, (nan.get(k) || 0) + 1); } else if (Array.isArray(v)) for (const x of v) walk(k, x); };
  globalThis.__ctxSpy = (k, a) => { for (const v of a) walk(k, v); if (k === 'translate') order.push(a.slice()); };
  let frames = 0, sorted = true, overKicker = true, tall = 0, early = 0, drawn = 0, faded = 0, behindDrawn = 0, orderOk = true, ordered = 0, zMin = 99;
  for (let i = 0; i < 90 && !g.out; i++) {
    const tau = cut.t - 0.22, P = K.kickPose(g, -1, -1), scene = K.kickScene(cam, g, P, tau, -1), ki = scene.findIndex(it => it.kind === 'kicker');
    for (let j = 1; j < scene.length; j++) if (scene[j].z > scene[j - 1].z + 1e-9) sorted = false;
    for (const [j, it] of scene.entries()) if (it.kind === 'charger') {
      drawn++; zMin = Math.min(zMin, it.z);
      if (it.k*1.85 > 0.6*H + 1e-6) tall++; if (it.z <= 2) early++; if (it.alpha < 1) faded++; if (it.r.ux > 0.9) behindDrawn++;
      if (ki >= 0 && it.z < scene[ki].z && j < ki) overKicker = false;
    }
    order.length = 0; T.debug.drawCut(); frames++;
    if (order.length) {                                                          // the frame drew (the first, at t 0, is the cut-in's blank): each figure starts with a translate to his feet
      const feet = scene.filter(it => it.kind !== 'ball').map(it => [it.sx, it.sy]);
      let at = 0; for (const [x, y] of order) if (at < feet.length && Math.abs(x - feet[at][0]) < 1e-6 && Math.abs(y - feet[at][1]) < 1e-6) at++;
      if (at !== feet.length) orderOk = false; else ordered++;
    }
    T.update(STEP);
  }
  globalThis.__ctxSpy = null;
  ok(frames >= 30 && nan.size === 0, `${frames} frames drawn with chargers from behind and beside, no non-finite number on the canvas (${[...nan.keys()]})`);
  ok(sorted && overKicker && drawn > 0 && behindDrawn > 0, `the scene is far to near every frame, and a charger nearer the lens than the kicker is drawn after him (${drawn} charger draws, ${behindDrawn} from behind)`);
  ok(orderOk && ordered >= 30, `the figures reach the canvas in that order on every frame that draws (${ordered})`);
  ok(tall === 0 && early === 0 && faded > 0 && zMin > 2, `no charger taller than 0.6H (${tall}), none within 2m of the lens (${early}, nearest ${zMin.toFixed(2)}m), ${faded} draws fading in`);
  ok(g.out === 'smothered', `the cut ends in a smother (${g.out})`);
  inp.bDown = false; settle();
  // one who stops the kick lands on his own side: a man 3m behind who smothers is put 0.5m behind the kicker, one who charges the strike down from 3.5m behind 1.2m behind
  freshD(1); c = K.stageDrop({ x:85, y:35 }, [{ x:82, y:35.3 }]); inp.bDown = false; K.startDropCut(c); cut = M().cut; g = cut.g;
  ok(g.rush.length === 1 && g.rush[0].ux > 0.99, 'a man 3m behind is on the shoulder: a charger in the cut');
  run(() => g.out, 3000); settle();
  let q = g.outQ, kk = g.kicker, want = q && K.stopSpot(g, q, 0.5);
  ok(g.out === 'smothered' && q.x < kk.x && Math.abs(q.x - want.x) < 0.05 && Math.abs(q.y - want.y) < 0.05, `smothered from behind: he lands behind the kicker (${q && (q.x - kk.x).toFixed(2)}, ${q && (q.y - kk.y).toFixed(2)}), not in front`);
  freshD(1); c = K.stageDrop({ x:85, y:35 }, [{ x:81.5, y:35.3, vx:3, vy:0 }]); inp.bDown = true; K.startDropCut(c); cut = M().cut; g = cut.g;
  run(() => g.out || g.stage === 'flight', 3000, () => dropBot(cut, { m:g.ctr, aim:0 })); inp.bDown = false; settle();
  q = g.outQ; kk = g.kicker; want = q && K.stopSpot(g, q, 1.2);
  ok(g.out === 'charged' && q.x < kk.x && Math.abs(q.x - want.x) < 0.05 && Math.abs(q.y - want.y) < 0.05, `charged down from behind: he lands 1.2m behind the kicker (${g.out || 'clear'}${q ? ', ' + (q.x - kk.x).toFixed(2) : ''})`);
  ok(M().ball.state === 'loose' && M().ball.kickInfo && M().ball.kickInfo.team === 0, 'and the ball is loose, a kicked ball');
  // a placed kick's scene is as it was: the kicker, then the ball over him
  freshD(1); const gp = stage(0, conv(35), 'conversion'); const cp = M().cut, Pp = K.kickPose(gp, -1, -1), sp = K.kickScene(K.kickCam(gp), gp, Pp, 0, -1);
  ok(sp.length === 2 && sp[0].kind === 'kicker' && sp[1].kind === 'ball', `a conversion's scene is the kicker then the ball (${sp.map(it => it.kind)})`);
  if (cp) { cp.after = () => {}; cp.hold = 0; } settle();
}
done('37 charger depth');

// 38. the label is per seat: kickLabel(t) reads that side's controlled player, and updateHud passes its own
begin('label per seat');
{
  freshD(1); K.stageDrop({ x:85, y:35 }, []);
  ok(K.kickLabel(0) === 'Drop Goal' && K.kickLabel(1) === 'Kick', `team 0's carrier in the zone: kickLabel(0) Drop Goal, kickLabel(1) Kick (${K.kickLabel(0)}, ${K.kickLabel(1)})`);
  inp.bPressed = inp.bDown = true; steps(3);
  ok(K.kickLabel(0) === 'Drop Goal' && K.kickLabel(1) === 'Kick' && M().dropArmed[0], 'and through the hold');
  inp.bDown = false; steps(14);
  const src = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  ok(!/kickLabel\(\)/.test(src) && /kickLabel\(M\.ctrl\.team\)/.test(src), 'updateHud passes its team to kickLabel');
}
done('38 label per seat');

// 39. the thumb: what the label showed is what the press gives, even if the stick is let go on the press frame or during the hold, and the cut
// judges the chargers behind him that the offer judged, so a chaser who crosses into the shoulder radius as the kicker brakes stays out. A drop
// charged down from behind bounces away from the man who blocked it, not straight back into his hands
begin('the thumb');
{
  const stageRun = () => { const c = K.stageDrop({ x:84, y:35 }, [{ x:79.8, y:35.4, vx:8.5, vy:0 }]); c.vx = 7.5; inp.jx = 1; inp.jy = 0; return c; };
  for (const L of [0, 1, 3]) {                                       // L: the step after the press on which the stick is let go (0: the press frame itself)
    freshD(1); const c = stageRun();
    const shown = K.kickLabel(0);                                    // the HUD reads the label the frame before the press
    if (L === 0) { inp.jx = 0; inp.jy = 0; }
    inp.bPressed = inp.bDown = true; let n = 0;
    while (M().phase !== 'cut' && n < 40) { if (n === L && L > 0) { inp.jx = 0; inp.jy = 0; } T.update(STEP); n++; }
    const cut = M().cut, g = cut && cut.g;
    ok(shown === 'Drop Goal' && g && g.type === 'drop', `stick let go ${L ? L + ' steps after' : 'on'} the press: the label read ${shown} and the close-up opened (${M().phase})`);
    if (!g) { inp.bDown = false; T.update(STEP); continue; }
    ok(g.rush.every(r => r.x <= g.x), `and the chaser who closed to ${(84 - 79.8).toFixed(1)}m behind is not a charger (${g.rush.map(r => r.d0.toFixed(2) + 'm').join(', ') || 'none'})`);
    run(() => g.out || g.stage === 'flight', 3000, () => dropBot(cut, { m:g.ctr, aim:0 })); inp.bDown = false;
    ok(!g.out, `an on-time strike gets away (${g.out || 'clear'})`);
    settle();
  }
  // a drop charged down by a man from behind: the ball comes off his hands forward, away from him
  let tried = 0, found = null;
  for (const [gap, lat] of [[3.9, 0.6], [3.5, 1.5], [3.7, 0.6], [3.7, 1.0]]) for (const w of [5, 6]) {   // a jogging chaser just inside the radius gets there after the release
    if (found) break;
    freshD(1); const c = K.stageDrop({ x:84, y:35 }, [{ x:84 - gap, y:35 + lat, vx:w, vy:0 }]); c.vx = 6;
    K.startDropCut(c); const cut = M().cut, g = cut && cut.g; tried++;
    if (!g || !g.rush.length) { M().cut = null; continue; }
    run(() => g.out || g.stage === 'flight', 3000, () => dropBot(cut, { m:g.ctr, aim:0 })); inp.bDown = false;
    if (g.out !== 'charged') { settle(); continue; }
    const q = g.rush[0].q; settle();
    const b = M().ball; found = { gap, w, q, away:(b.x - q.x)*b.vx + (b.y - q.y)*b.vy, state:b.state };
  }
  ok(found && found.state === 'loose' && found.away > 0, found ? `charged down from ${found.gap.toFixed(1)}m behind at ${found.w} m/s: the ball comes off his hands away from him (${found.away.toFixed(1)})` : `no charge-down from behind in ${tried} staged drops`);
}
done('39 the thumb');

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
