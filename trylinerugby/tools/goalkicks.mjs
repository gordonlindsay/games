// Goal kicks: the closed-form flight, the judge, the band, the wind, the live
// close-up driven through the real input path, the CPU's kicks, the rate
// table and a render smoke test. Exits 1 on any failure.
// node tools/goalkicks.mjs [--rates N]   (N kicks per cell, default 1200; SEED=11 unless set)
process.env.SEED ??= '11';
const { T, kickBot, rndCalls, reseed } = await import('./harness.mjs');

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
T.debug.settings().kickSeen = true;   // the aids follow the difficulty; the first-kick onboarding is checked on its own

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
  T.debug.settings().kickSeen = false; fresh(1); const g = K.makeGoal(0, 88, 35, 'penalty', null);
  ok(g.aid === 'path' && g.aim !== 0, 'the first kick ever gets the Easy path on Normal');
  T.debug.settings().kickSeen = true; fresh(1); const g2 = K.makeGoal(0, 88, 35, 'penalty', null);
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

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
