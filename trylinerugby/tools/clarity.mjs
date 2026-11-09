// Can you see what is going on? The pace of a match, the ball's marks in the behind views, the Your Ball sign under the clock, and the star and the ring in a career.
// The look and the layout need a browser: tools/browser.mjs measures the sign against the scorebug at the phone sizes. Whether it is calmer needs a person.
// node tools/clarity.mjs      (SEED=2 unless set)
process.env.SEED ??= '2';
import { spawnSync } from 'node:child_process';
const { T, inputs, rndCalls } = await import('./harness.mjs');
const D = T.debug, X = T.clarity, B = T.behind, S = T.sides, C = T.career, STEP = T.STEP, settings = () => D.settings(), $ = id => document.getElementById(id);
let failed = 0, passed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const say = msg => console.log(msg);
const fresh = (o = {}) => {
  T.newMatch(0, 1, { halfLen:240, diff:1, headless:false, duels:'live', ...o }); D.setMode('match'); D.setTwo(!!(o.humans && o.humans[0] && o.humans[1]));
  for (const inp of inputs) { inp.aPressed = inp.bPressed = inp.cPressed = false; inp.jx = inp.jy = 0; }
  return T.M;
};
const inPlay = m => { m.phase = 'play'; m.set = null; m.cut = null; return m; };
const hold = (m, p) => { const b = m.ball; b.state = 'held'; b.carrier = p; b.f = null; m.poss = p.team; };
const near = (m, p, dx, dy, t) => { const q = m.players.find(r => r.team === t && r !== p && !(m.ball.carrier === r)); q.x = p.x + dx; q.y = p.y + dy; return q; };
const log = fn => { const calls = []; globalThis.__ctxSpy = (k, a) => calls.push([k, a]); try { fn(); } finally { globalThis.__ctxSpy = null; } return calls; };
const count = (calls, k) => calls.filter(c => c[0] === k).length;
const setsTo = (calls, k, v) => calls.some(c => c[0] === k && c[1][0] === v);
const draw = (dt = STEP) => log(() => D.render(dt));
const settle = (n = 8) => { for (let i = 0; i < n; i++) D.render(STEP); };   // the behind camera arrives and the view is cut to it
const keep = settings();
const restoreHints = () => { keep.hints = true; keep.finished = 0; keep.kids = false; keep.diff = 1; keep.cam = 0; };

/* ---------- the pace: one lever, and the engine doesn't know ---------- */
ok(X.MATCH_PACE.match === 0.88 && X.MATCH_PACE.kids === 0.75, `the lever reads match ${X.MATCH_PACE.match}, kids ${X.MATCH_PACE.kids}`);
ok(STEP === 1/60, 'a step is still 1/60 of a simulated second');
{
  fresh(); ok(X.matchPace() === X.MATCH_PACE.match, 'a one-player match runs at match');
  fresh({ humans:[true, true] }); ok(X.matchPace() === X.MATCH_PACE.match, 'Two Player the same'); D.setTwo(false);
  fresh({ diff:0, kids:true }); ok(T.M.kids && X.matchPace() === X.MATCH_PACE.kids, 'the Kids level runs at kids');
  fresh({ demo:true, auto:true, halfLen:1e9 }); ok(T.M.demo && X.matchPace() === X.MATCH_PACE.match, 'the menu demo at match');
  fresh(); T.practice.start('cones'); ok(X.matchPace() === 1, 'a drill is 1 here: it keeps its own pace, drillRate'); T.practice.leave();
}
{ // the real frame loop, each in a process of its own
  const harness = new URL('./harness.mjs', import.meta.url).href;
  const run = (body, env = {}) => {
    const script = `
      let loop = null; Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable:true, get:() => f => { loop = f; }, set() {} });
      const { T, reseed, rndCalls, inputs } = await import(${JSON.stringify(harness)});
      const D = T.debug, X = T.clarity, out = {};
      let t = performance.now() + 100;
      const tick = n => { for (let i = 0; i < n; i++) { t += 1000/60; loop(t); } };
      const snap = () => JSON.stringify({ P:T.M.players.map(p => [p.x, p.y, p.vx, p.vy, p.down, p.fx, p.fy]), b:[T.M.ball.state, T.M.ball.x, T.M.ball.y, T.M.ball.z], score:T.M.score, clock:T.M.clock, n:T.M.stepN, rnd:rndCalls() });
      ${body}
      console.log(JSON.stringify(out));`;
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], { env:{ ...process.env, SEED:'11', ...env }, encoding:'utf8', maxBuffer:64*1024*1024 });
    try { return JSON.parse(r.stdout.trim().split('\n').pop()); } catch (e) { console.log(r.stdout, r.stderr); return {}; }
  };
  // seeded results per simulated second: the same steps through the slowed loop, drawing and blending, as straight calls of update(STEP)
  const start = `reseed(5); T.newMatch(0, 1, { halfLen:240, diff:1, auto:true, headless:true }); D.setMode('match');`;
  const looped = run(`${start} tick(1); while (T.M.stepN < 3000) tick(1); out.s = snap(); out.pace = X.matchPace();`);
  const direct = run(`${start} while (T.M.stepN < 3000) T.update(T.STEP); out.s = snap();`);
  ok(looped.s && looped.s === direct.s, '3000 steps through the slowed frame loop, drawn and blended, match 3000 plain update(STEP) calls exactly: players, ball, score, clock and random draws');
  ok(looped.pace === X.MATCH_PACE.match, 'and that loop was at the match pace');
  // real time
  const rates = run(`
    const clockIn = (frames) => { const a = T.M.clock, b = T.M.rt, n = T.M.stepN; tick(frames); return { clock:T.M.clock - a, rt:T.M.rt - b, steps:T.M.stepN - n }; };
    const play = o => { T.newMatch(0, 1, { halfLen:240, diff:1, duels:'off', headless:true, ...o }); D.setMode('match'); T.M.phase = 'play'; T.M.set = null; D.setTwo(!!(o && o.humans)); };
    play(); out.match = clockIn(600);
    play({ humans:[true, true] }); out.two = clockIn(600); D.setTwo(false);
    play({ diff:0, kids:true }); out.kids = clockIn(600);
    T.newMatch(0, 1, { halfLen:120, diff:1, duels:'off', headless:true }); D.setMode('match'); T.M.phase = 'play'; T.M.set = null; { let f = 0; while (T.M.clock < 60 && f < 9000) { tick(1); f++; } out.halfFrames = f; }
    play(); T.M.stop = 0.1; { let f = 0; const n = T.M.stepN; while (T.M.stop > 0 && f < 60) { tick(1); f++; } out.stopFrames = f; out.stopSteps = T.M.stepN - n; }
    play(); T.M.paused = true; { const a = T.M.clock; tick(30); out.paused = T.M.clock - a; } T.M.paused = false;
    T.practice.start('cones'); { const a = T.M.rt; tick(600); out.drillRt = T.M.rt - a; out.drillRate = T.drills.rate(); } T.practice.leave();
  `);
  const near2 = (a, b, tol) => Math.abs(a - b) <= tol;
  ok(near2(rates.match.steps, 600*0.88, 2) && near2(rates.match.clock, 10*0.88, 0.05) && near2(rates.match.rt, 10*0.88, 0.05), `a match: ${rates.match.steps} steps in 10s, its clock and its drawing clock together (${rates.match.clock.toFixed(2)}s, ${rates.match.rt.toFixed(2)}s)`);
  ok(near2(rates.two.steps, 600*0.88, 2), `Two Player the same (${rates.two.steps})`);
  ok(near2(rates.kids.steps, 600*0.75, 2) && near2(rates.kids.rt, 10*0.75, 0.05), `Kids: ${rates.kids.steps} steps in 10s, drawing ${rates.kids.rt.toFixed(2)}s`);
  say(`a minute on the clock takes ${(rates.halfFrames/60).toFixed(1)}s of real time at 0.88 (a 2 minute half about 2:16 before stoppages)`);
  ok(near2(rates.halfFrames/60, 60/0.88, 0.3), 'the real length of a half widens by 1/0.88');
  ok(rates.stopFrames <= 7 && rates.stopSteps <= 1, `the Big Hit's hit-stop stays in real time (${rates.stopFrames} frames for 0.1s)`);
  ok(rates.paused === 0, 'paused, nothing runs');
  ok(near2(rates.drillRt, 10*rates.drillRate, 0.05), `a drill's drawing keeps its own pace, not this one (${rates.drillRt.toFixed(2)}s in 10s at ${rates.drillRate})`);
  // no hitch: the man on the stick moves on the screen every frame, though a frame in eight has no step
  const blend = run(`
    T.newMatch(0, 1, { halfLen:240, diff:1, duels:'off', headless:true }); D.setMode('match'); const m = T.M; m.phase = 'play'; m.set = null; for (const p of m.players) if (p.team === 1) p.x = 118;
    inputs[0].jx = 1; tick(10);
    const man = m.ctrl; let seen = null, still = 0, moved = 0, noStep = 0, simOut = 0;
    globalThis.__ctxSpy = () => { if (seen === null) seen = man.x; };
    let last = null;
    for (let i = 0; i < 240; i++) { seen = null; const n = m.stepN; tick(1); if (m.stepN === n) noStep++; if (last !== null) { if (seen > last) moved++; else still++; } last = seen; if (Math.abs(seen - man.x) > 0.5) simOut++; }
    globalThis.__ctxSpy = null; out.still = still; out.moved = moved; out.noStep = noStep; out.simOut = simOut;
    // kept and restored: straight after a frame the player holds the sim's own numbers
    const before = man.x, a = m.stepN; tick(1); out.restored = man.x !== undefined && (m.stepN > a ? man.x !== before : man.x === before);
  `);
  ok(blend.noStep >= 20 && blend.noStep <= 40, `at 0.88 about one frame in eight has no step (${blend.noStep} of 240)`);
  ok(blend.still === 0 && blend.moved === 239, `and the man is still drawn moving on every frame (${blend.moved} moved, ${blend.still} held)`);
  ok(blend.simOut === 0, 'never more than a step behind the sim');
  ok(blend.restored, 'and the sim keeps its own numbers after the frame');
  // the Side Step's window is real time: a slower match must not turn a slower thumb into a flick. Through the real loop, from eight frame phases
  const flick = run(`
    const inp = inputs[0], fired = (pace, ramp, phase) => {
      X.MATCH_PACE.match = pace;
      T.newMatch(0, 1, { halfLen:240, diff:1, headless:false, duels:'live' }); D.setMode('match'); D.setTwo(false);
      const m = T.M; m.phase = 'play'; m.set = null; m.cut = null;
      for (const i of inputs) { i.aPressed = i.bPressed = i.cPressed = false; i.jx = i.jy = 0; i.gest = null; i.latPeak = null; }
      const c = m.players[3], q = m.players.find(p => p.team === 1);
      for (const p of m.players) Object.assign(p, { x:p.team ? 115 : 5, y:5, vx:0, vy:0, down:0, tcd:9, think:9 });
      Object.assign(c, { x:40, y:35, fx:1, fy:0, side:-1, hold:2 }); Object.assign(q, { x:42.5, y:35 });
      m.ball.state = 'held'; m.ball.carrier = c; m.ball.f = null; m.poss = 0; T.sides.setCtrl(0, c);
      const s0 = m.stats.steps || 0;
      inp.jx = 0.75; inp.jy = 0; for (let i = 0; i < 6 + phase; i++) { tick(1); c.x = 40; q.x = 42.5; }
      for (let i = 1; i <= 40 && m.phase === 'play'; i++) { inp.jy = 0.65*Math.min(1, i*(1000/60)/ramp); tick(1); if ((m.stats.steps || 0) > s0) return true; }
      return false;
    };
    tick(1); out.t = {};
    for (const pace of [1, 0.88, 0.75]) { out.t[pace] = {}; for (const ramp of [60, 80, 100, 110, 120, 140]) { let n = 0; for (let ph = 0; ph < 8; ph++) if (fired(pace, ramp, ph)) n++; out.t[pace][ramp] = n; } }
    X.MATCH_PACE.match = 0.88;
  `);
  for (const pace of [0.88, 0.75]) {
    ok(JSON.stringify(flick.t[pace]) === JSON.stringify(flick.t[1]), `at ${pace} the same thumb speeds fire a Side Step as at full pace (${JSON.stringify(flick.t[pace])}, ${JSON.stringify(flick.t[1])})`);
    ok(flick.t[pace][60] === 8 && flick.t[pace][110] === 0, `at ${pace} a real flick fires and a 110ms steer doesn't (${flick.t[pace][60]}, ${flick.t[pace][110]})`);
  }
  // a close-up moves on every frame, as open play does, and what is judged keeps the sim's own numbers
  const cut = (setup, read) => run(`
    D.settings().tut = D.TUT_IDS.slice();
    const go = o => {
      T.newMatch(0, 1, { halfLen:240, diff:1, headless:false, duels:'live', ...o }); D.setMode('match'); D.setTwo(false);
      ${setup}
      tick(8);                                              // past the frame it opens on
      const c = T.M.cut; let seen = null, last = null, moved = 0, still = 0, noStep = 0, far = 0, sim = c.t;
      globalThis.__ctxSpy = () => { if (seen === null && T.M.cut) seen = ${read}; };
      for (let i = 0; i < 40 && T.M.cut === c; i++) {
        seen = null; const n = T.M.stepN, before = c.t; tick(1);
        if (T.M.stepN === n) { noStep++; if (c.t !== before) far++; }
        if (last !== null && seen !== null) { if (seen > last) moved++; else still++; }
        last = seen;
      }
      globalThis.__ctxSpy = null;
      return { moved, still, noStep, far };
    };
    out.match = go({}); out.kids = go({ diff:0, kids:true });
  `);
  const shown = { 'a CPU goal kick': cut(`D.goalKick(1, 30, 25, 'conversion');`, 'T.M.cut.t'), 'a duel\'s slow run-in': cut(`T.M.phase = 'play'; T.M.set = null; D.stage('tackle');`, 'T.M.cut.t + (T.M.cut.acc || 0)') };
  for (const [name, r] of Object.entries(shown)) for (const k of ['match', 'kids']) {
    ok(r[k] && r[k].noStep >= (k === 'kids' ? 7 : 3), `${name} at ${k}: some frames have no step (${r[k] && r[k].noStep})`);
    ok(r[k] && r[k].still === 0 && r[k].moved > 20, `${name} at ${k}: its clock moves on every drawn frame (${r[k] && r[k].moved} moved, ${r[k] && r[k].still} held)`);
    ok(r[k] && r[k].far === 0, `${name} at ${k}: and the judged clock goes back after the draw`);
  }
}
{ // real-time clocks: the banner goes with the play, a coach line stays for reading
  const realST = globalThis.setTimeout, asked = [];
  globalThis.setTimeout = (fn, ms) => { asked.push(ms); return 0; };
  const ask = (...a) => { asked.length = 0; X.say(...a); return asked[0]; };
  fresh();
  ok(Math.abs(ask('Try') - 1300/0.88) < 1 && Math.abs(ask('Big', 'big') - 1700/0.88) < 1 && Math.abs(ask('Small', 'small') - 900/0.88) < 1, 'a banner lasts as long against the play');
  ok(ask('Line', 'coach') === 1600, 'a coach line stays in real time, for reading');
  fresh({ diff:0, kids:true }); ok(Math.abs(ask('Try') - 1300/0.75) < 1, 'at the Kids pace too');
  globalThis.setTimeout = realST;
}

/* ---------- the sign: Your Ball, Stop Them, Get the Ball ---------- */
{
  restoreHints();
  const words = Object.values(X.BALL_STATUS).map(s => s.word);
  ok(JSON.stringify(words) === JSON.stringify(['Your Ball', 'Stop Them', 'Get the Ball']), `the words: ${words.join(', ')}`);
  ok(new Set(Object.values(X.BALL_STATUS).map(s => s.icon)).size === 3 && Object.values(X.BALL_STATUS).every(s => s.icon.startsWith('<svg')), 'each has its own shape, so it is not colour alone');
  const m = inPlay(fresh()), me = T.sides.ctrlOf(0), foe = m.players.find(p => p.team === 1), b = m.ball;
  const shown = () => { D.updateHud(); return $('h-stat').hidden ? null : $('h-stat-w').textContent; };
  hold(m, me); ok(X.statusOf() === 'ours' && shown() === 'Your Ball', 'your carrier: Your Ball');
  ok($('h-stat-i').innerHTML === X.BALL_STATUS.ours.icon && $('h-stat').className === 'bstat ours', 'with its own icon and class');
  hold(m, foe); ok(X.statusOf() === 'stop' && shown() === 'Stop Them', 'theirs: Stop Them');
  b.state = 'air'; b.carrier = null; b.f = { kind:'pass', team:0, x1:60, y1:35 }; ok(shown() === 'Your Ball', 'your pass in the air is still Your Ball');
  b.f = { kind:'pass', team:1, x1:60, y1:35 }; ok(shown() === 'Stop Them', 'and theirs is Stop Them');
  b.f = { kind:'kick', team:0, x1:60, y1:35 }; ok(shown() === 'Get the Ball', 'a kick in the air is Get the Ball');
  b.f = { kind:'restart', team:1, x1:60, y1:35 }; ok(shown() === 'Get the Ball', 'and so is a kick-off');
  b.f = null; b.state = 'loose'; ok(X.statusOf() === 'loose' && shown() === 'Get the Ball', 'a loose ball: Get the Ball');
  ok($('h-stat').className === 'bstat loose', 'with its class');
  b.state = 'dead'; ok(shown() === null, 'a dead ball says nothing');
  m.phase = 'set'; m.set = { kind:'ruck', team:0, x:60, y:35, t:1 }; ok(shown() === 'Your Ball', 'your ruck: Your Ball');
  m.set = { kind:'ruck', team:1, x:60, y:35, t:1 }; ok(shown() === 'Stop Them', 'their ruck: Stop Them');
  for (const kind of ['kickoff', 'scrum', 'lineout', 'penalty', 'try', 'dropout']) { m.set = { kind, team:0, x:60, y:35, t:1 }; ok(shown() === null, `nothing at a ${kind}`); }
  inPlay(m); hold(m, me); ok(shown() === 'Your Ball', 'and back');

  // who sees it
  keep.finished = X.STATUS_MATCHES - 1; ok(shown() === 'Your Ball', `in the player's ${X.STATUS_MATCHES}th finished match, still`);
  keep.finished = X.STATUS_MATCHES; ok(shown() === null, 'gone after that');
  keep.finished = 99; ok(!X.statusWanted(), 'for good');
  keep.finished = 0; keep.hints = false; ok(shown() === null, 'Match Help off: gone');
  keep.hints = true;
  const k = inPlay(fresh({ diff:0, kids:true })); hold(k, S.ctrlOf(0)); keep.finished = 99; ok(k.kids && shown() === 'Your Ball', 'always at the Kids level, whatever the count');
  keep.hints = false; ok(shown() === 'Your Ball', 'and whatever Match Help says');
  restoreHints();
  { const t = inPlay(fresh({ humans:[true, true] })); hold(t, S.ctrlOf(0)); ok(X.statusOf() === null && shown() === null, 'hidden in Two Player'); D.setTwo(false); }
  { const a = inPlay(fresh({ auto:true })); hold(a, a.players[0]); ok(X.statusOf() === null, 'hidden with no human playing'); }
  { fresh({ demo:true, auto:true, halfLen:1e9 }); D.setMode('menu'); ok(X.statusOf() === null, 'hidden in the menu demo'); D.setMode('match'); }
  { fresh(); T.practice.start('cones'); ok(X.statusOf() === null && shown() === null, 'hidden in a drill'); T.practice.leave(); D.setMode('match'); }
  const c = inPlay(fresh()); hold(c, S.ctrlOf(0));
  c.cut = { kind:'scrum', t:0 }; c.phase = 'cut'; ok(X.statusOf() === null, 'hidden in a scrum close-up');
  c.cut = { kind:'lineout', t:0 }; ok(X.statusOf() === null, 'a lineout');
  c.cut = { kind:'goal', t:0, g:{ stage:'aim' } }; ok(X.statusOf() === null, 'a goal kick');
  c.cut = { kind:'past', duel:true, t:0 }; ok(X.statusOf() === null, 'a duel');
  inPlay(c); c.paused = true; ok(X.statusOf() === null, 'paused'); c.paused = false;
  c.phase = 'break'; ok(X.statusOf() === null, 'at half time');
  inPlay(c); c.over = true; ok(X.statusOf() === null, 'at full time'); c.over = false;
  keep.cam = 2; ok(X.statusOf() === 'ours', 'on Mid'); keep.cam = 0; ok(X.statusOf() === 'ours', 'and on Top: it sits under the clock, whatever the camera');
  // an away-side human
  { const a = inPlay(fresh({ humans:[false, true] })); hold(a, a.players[0]); ok(X.statusOf() === 'stop', 'a human on the away side reads their own side'); }
}
/* ---------- the count ---------- */
{
  restoreHints();
  const load = v => { keep.finished = 7; T.teams.restore({ settings:{ finished:v } }); return keep.finished; };
  ok(load(3) === 3 && load(0) === 0 && load(99) === 99, 'a count from 0 to 99 loads');
  for (const bad of [-1, 100, 2.5, '3', null, true, {}, [], NaN]) ok(load(bad) === 7, `and ${JSON.stringify(bad)} leaves the count alone`);
  keep.finished = 0; T.teams.restore({ settings:{ half:1, diff:2, played:9, sound:false } });
  ok(keep.finished === 0 && keep.half === 1 && keep.diff === 2 && keep.played === 9 && keep.sound === false, 'an old save with no count loads as it was, at nought');
  keep.half = 0; keep.diff = 1; keep.sound = true;
  const end = m => { m.half = 2; m.score = [5, 0]; m.golden = false; m.phase = 'play'; m.over = false; T.arcade.endHalf(); };
  keep.finished = 2; end(inPlay(fresh())); ok(keep.finished === 3, 'a one-player match played to full time counts');
  ok(T.M.over === true, 'at its real end');
  keep.finished = 2; fresh(); D.exitMatch(); ok(keep.finished === 2, 'quitting does not'); D.setMode('match');
  keep.finished = 2; end(inPlay(fresh({ humans:[true, true] }))); ok(keep.finished === 2, 'Two Player does not'); D.setTwo(false);
  keep.finished = 99; end(inPlay(fresh())); ok(keep.finished === 99, 'it stops at 99');
  { const before = JSON.stringify(keep); fresh(); T.practice.start('cones'); T.practice.leave(); ok(JSON.stringify(keep) === before, 'a drill leaves it alone'); }
  $('m-break').hidden = true; D.setMode('match'); restoreHints();
}

/* ---------- the ball's marks ---------- */
const hasBubble = calls => setsTo(calls, 'fillStyle', X.BV_CARRY.ball);
const hasPatch = calls => setsTo(calls, 'fillStyle', X.BV_LOOSE.patch);
const hasTag = calls => setsTo(calls, 'fillStyle', X.BV_TAG.disc);
{
  // the stack
  for (const pointer of [false, true]) for (const carry of [false, true]) for (const star of [0, 8, 12]) for (const tip of [300, 60, 14, -40]) {
    const s = X.bvStack(tip, { pointer, carry, star }), K = X.BV_CARRY;
    const parts = [];
    if (pointer) parts.push([s.pointer - 8, s.pointer]);
    if (carry) parts.push([s.carry - K.h - K.tail, s.carry]);
    if (star) parts.push([s.star - star, s.star + star]);
    const name = `tip ${tip}, pointer ${pointer}, carry ${carry}, star ${star}`;
    ok(parts.every((p, i) => !i || p[1] <= parts[i - 1][0]), `${name}: stacked, nothing on anything else`);
    ok(!parts.length || parts.at(-1)[0] >= 6, `${name}: all on the screen`);
    if (tip === 300 && parts.length) ok(parts[0][1] === 300, `${name}: starts at the head`);
  }
  ok(X.bvStack(100, { pointer:true }).pointer === 100 && X.bvStack(3, { pointer:true }).pointer === 14, 'the pointer alone stays where it always was, 14 at the top of the frame');

  for (const cam of [1, 2, 3]) {
    keep.cam = cam;
    const m = inPlay(fresh({ duels:'off' })), me = S.ctrlOf(0), foe = near(m, me, 6, 2, 1);
    settle();
    hold(m, me); settle(2); ok(hasBubble(draw()), `cam ${cam}: over your carrier`);
    hold(m, foe); settle(2); ok(hasBubble(draw()), `cam ${cam}: and over theirs`);
    m.ball.state = 'loose'; m.ball.carrier = null; ok(!hasBubble(draw()), `cam ${cam}: nobody holding it, no marker`);
    // never a stray one
    hold(m, me); m.phase = 'set'; m.set = { kind:'scrum', team:0, x:60, y:35, t:1 }; ok(!hasBubble(draw()), `cam ${cam}: none at a set piece`);
    inPlay(m); m.phase = 'cut'; m.cut = { kind:'scrum', t:0, hit:[0, 0] }; const during = log(() => { try { D.render(0); } catch (e) { /* a staged close-up may be short of fields: the marks come first */ } }); ok(!hasBubble(during), `cam ${cam}: none in a close-up`);
    inPlay(m);
  }
  keep.cam = 0;
  { const m = inPlay(fresh()), me = S.ctrlOf(0); hold(m, me); settle(); ok(!hasBubble(draw()), 'none on Top'); m.ball.state = 'loose'; m.ball.carrier = null; ok(!hasPatch(draw()), 'and no burst on Top'); }
  { const m = inPlay(fresh({ humans:[true, true] })); hold(m, S.ctrlOf(0)); settle(); ok(!hasBubble(draw()), 'none in Two Player'); D.setTwo(false); }
  keep.cam = 2;
  { fresh({ demo:true, auto:true, halfLen:1e9 }); D.setMode('menu'); const m = T.M; inPlay(m); hold(m, m.players[0]); ok(B.menuDemo() && !hasBubble(draw()) && !hasTag(draw()), 'none in the menu demo'); m.ball.state = 'loose'; m.ball.carrier = null; ok(!hasPatch(draw()), 'and no burst'); D.setMode('match'); }
  { fresh(); T.practice.start('cones'); const calls = draw(); ok(!hasBubble(calls) && !hasTag(calls) && !hasPatch(calls), 'none in a drill'); T.practice.leave(); D.setMode('match'); }

  // loose: a size that can be seen, and a mark on the grass
  const m = inPlay(fresh({ duels:'off' })), me = S.ctrlOf(0), b = m.ball; settle();
  const ballRx = calls => Math.max(0, ...calls.filter(c => c[0] === 'ellipse' && c[1][0] === 0 && c[1][1] === 0).map(c => c[1][2]));
  b.state = 'loose'; b.carrier = null; b.f = null; b.vx = b.vy = b.vz = 0; b.z = 0; b.x = me.x + 45; b.y = me.y; settle(2);
  let calls = draw(); ok(hasPatch(calls), 'a loose ball has its mark on the grass');
  ok(ballRx(calls) >= X.BV_LOOSE.rx, `and far off it is never under the minimum (half-length ${ballRx(calls).toFixed(1)}px, was 5)`);
  b.x = me.x + 6; settle(2); calls = draw(); ok(ballRx(calls) >= X.BV_LOOSE.rx, `near it is at least that (${ballRx(calls).toFixed(1)}px)`);
  ok(hasPatch(calls) && count(calls, 'ellipse') > 0, 'and its mark is a patch and rays, not a ring: nothing dashes it');
  m.phase = 'set'; m.set = { kind:'scrum', team:0, x:60, y:35, t:1 }; ok(!hasPatch(draw()), 'no mark at a set piece'); inPlay(m);
  const laced = (calls, rx) => calls.some(c => c[0] === 'moveTo' && c[1][1] === 0 && Math.abs(c[1][0] + rx*0.42) < 1e-6);
  b.state = 'loose'; b.z = 0; calls = draw(); ok(laced(calls, ballRx(calls)), 'a loose ball has its laces, so at that size it is a ball and not a plate');
  b.state = 'dead'; calls = draw(); ok(!hasPatch(calls), 'none for a dead ball');
  ok(ballRx(calls) < X.BV_LOOSE.rx, `and a dead ball among the men at a kick-off or a ruck keeps its old size (${ballRx(calls).toFixed(1)}px half-length)`);
  b.state = 'air'; b.f = { kind:'pass', team:0, x0:b.x, y0:b.y, x1:b.x + 5, y1:b.y, t:0, T:1 }; calls = draw(); ok(!hasPatch(calls) && ballRx(calls) >= X.BV_LOOSE.air, 'a pass in the air has the minimum and no mark');

  // the edge arrow
  b.state = 'held'; b.carrier = me; b.f = null; settle(2); ok(!hasTag(draw()), 'the ball on the frame needs no arrow');
  const foe = m.players.find(p => p.team === 1); hold(m, foe); foe.x = me.x + 4; foe.y = me.y < 35 ? 69 : 1; settle(2);
  calls = draw(); ok(hasTag(calls), 'a carrier off the frame gets the arrow'); ok(!hasBubble(calls), 'and no marker off the frame');
  b.state = 'loose'; b.carrier = null; b.x = me.x + 4; b.y = me.y < 35 ? 69 : 1; settle(2); ok(hasTag(draw()), 'so does a loose ball');
  { // a high ball: its ground point is on the frame, but the ball is not, or the page is over it
    const cam = B.BV.cam, x = cam.Cx + 22*cam.u.x, y = 35, g = D.pr(cam, x, y, 0);
    b.x = x; b.y = y; b.vx = b.vy = 0; b.state = 'air'; b.f = { kind:'kick', team:0, x0:x, y0:y, x1:x, y1:y, t:0, T:1, h:1 };
    const zAt = sy => { let lo = 0, hi = 60; for (let i = 0; i < 40; i++) { const mid = (lo + hi)/2; if (D.pr(cam, x, y, mid).sy > sy) lo = mid; else hi = mid; } return lo; };
    const tagAt = sy => { b.z = zAt(sy); const calls = log(() => { B.BV.edges.length = 0; D.render(0); }); return hasTag(calls); };
    ok(g && g.sx >= 0 && g.sx <= 844 && g.sy >= 0 && g.sy <= 390, 'staged: the ball\'s ground point is on the frame');
    ok(tagAt(-30), 'a kick above the frame has the arrow, though its shadow is on the frame');
    const px = D.pr(cam, x, y, zAt(30)).sx;
    if (Math.abs(px - 422) < 96) ok(tagAt(30), `behind the scorebug it has the arrow too (x ${px.toFixed(0)})`); else ok(false, `staged off the scorebug (x ${px.toFixed(0)})`);
    ok(!tagAt(180), 'in plain sight it needs none');
    b.z = 0; b.state = 'loose'; b.f = null; b.x = me.x + 4; b.y = me.y < 35 ? 69 : 1; settle(2);
  }
  m.phase = 'set'; m.set = { kind:'scrum', team:0, x:b.x, y:b.y, t:1 }; ok(!hasTag(draw()), 'none at a set piece');
  m.set = { kind:'ruck', team:0, x:b.x, y:b.y, t:1 }; b.state = 'dead'; ok(hasTag(draw()), 'but a ruck off the frame has it');
  inPlay(m); m.phase = 'cut'; m.cut = { kind:'scrum', t:0, hit:[0, 0] }; { const during = log(() => { try { D.render(0); } catch (e) { /* as above */ } }); ok(!hasTag(during), 'none in a close-up'); }
  inPlay(m); keep.cam = 0;

  // kit colours: the marker carries its own contrast
  const K = X.BV_CARRY, kits = [...T.teams.KIT_COLOURS.map(k => k[1]), ...T.teams.ALL_TEAMS.flatMap(t => [t.kit, t.trim])].filter(c => /^#[0-9a-f]{6}$/i.test(c));
  ok(kits.length > 20, `checked against ${kits.length} kit colours`);
  const dist = T.teams.colorDist;
  const low = kits.filter(c => Math.max(dist(c, K.fill), dist(c, K.edge)) < 150);
  ok(!low.length, `the bubble's chalk or its dark edge stands off every kit (${low.join(', ') || 'all clear'})`);
  ok(dist(K.fill, B.C.grassA) > 200 && dist(K.fill, B.C.grassB) > 200, 'and off the grass');
  ok(dist(K.lace, K.ball) > 150, 'the laced ball in it reads against the bubble');
  ok(K.ball !== '#7a4a24' && dist(K.ball, '#f6f3ea') < 20, 'and it is the same white ball as on the grass and the edge tag');
  ok(K.fill !== B.C.ctrl && dist(K.fill, B.C.ctrl) > 100 && dist(K.fill, B.C.p2) > 100, 'and it is not the ring\'s gold or pink');

  // the tag keeps clear of the corners a phone has
  for (const [W, H] of [[844, 390], [667, 375]]) for (const ins of [{ t:0, r:0, b:0, l:0 }, { t:0, r:47, b:21, l:47 }, { t:0, r:59, b:21, l:59 }]) {
    D.view(W, H);
    const r = X.BV_TAG.tip + 1, bad = [];
    for (let i = 0; i < 64; i++) {
      const a = i*Math.PI/32, [x, y] = X.edgeTagAt(W/2 + Math.cos(a)*2000, H/2 + Math.sin(a)*2000, ins);
      const clear = x - r >= ins.l - 1 && x + r <= W - ins.r + 1 && y - r >= -1 && y + r <= H + 1;
      const onBug = y - X.BV_TAG.r < 72 && Math.abs(x - W/2) < 150;
      const onPause = y - X.BV_TAG.r < 54 && x + X.BV_TAG.r > W - 54 - ins.r;
      const inA = x + X.BV_TAG.r > W - 108 - ins.r && y + X.BV_TAG.r > H - 114 - ins.b;
      const st = D.stickRest(W, H, ins), onStick = Math.hypot(x - st.x, y - st.y) < 62 + X.BV_TAG.r;
      if (!clear || onBug || onPause || inA || onStick) bad.push([x, y].map(Math.round).join(','));
    }
    ok(!bad.length, `${W}x${H} insets ${ins.l}: a tag in any direction is clear of the notch, the scorebug, pause, Pass and the stick's ring (${bad.slice(0, 3).join(' ') || 'ok'})`);
  }
  D.view(844, 390);
}

/* ---------- a career: the ring is who you control, the star is your player ---------- */
{
  restoreHints();
  const cr = C.create({ pos:'B', num:6, club:{ id:'TST', name:'Testers', kit:'#123456', trim:'#abcdef', pace:4, power:3, handling:4, kicking:3, stamina:3 } }); C.set(cr);
  const play = () => { keep.tut = D.TUT_IDS.slice(); C.play(); const m = T.M; inPlay(m); return m; };
  for (const cam of [0, 1, 2, 3]) {
    keep.cam = cam;
    const m = play(), you = m.careerP; hold(m, you); near(m, you, 25, 0, 1); S.setCtrl(0, you);
    you.x = 50; you.y = 35; m.cam.x = you.x; m.cam.y = you.y; settle();
    const on = draw(); m.career = false; const off = draw(); m.career = true;
    ok(count(on, 'lineTo') - count(off, 'lineTo') === 10, `cam ${cam}: the star is drawn (${count(on, 'lineTo') - count(off, 'lineTo')} points)`);
    ok(count(on, 'ellipse') === count(off, 'ellipse') && count(on, 'arc') === count(off, 'arc'), `cam ${cam}: and no ring goes with it`);
    // with the ring on someone else: still one star and no second ring, and the ring's man keeps his
    const mate = m.players.find(p => p.team === 0 && p !== you); hold(m, mate); S.setCtrl(0, mate); mate.x = you.x + 2; mate.y = you.y + 2; m.cam.x = mate.x; m.cam.y = mate.y; settle(2);
    const on2 = draw(); m.career = false; const off2 = draw(); m.career = true;
    ok(count(on2, 'ellipse') === count(off2, 'ellipse') && count(on2, 'arc') === count(off2, 'arc') && count(on2, 'lineTo') - count(off2, 'lineTo') === 10, `cam ${cam}: the ring moved to a teammate, the star stays on you and adds no ring`);
    ok(S.ctrlOf(0) === mate && m.careerP === you, `cam ${cam}: team control as it was: the ring is on the teammate`);
    // off the frame
    you.x = mate.x; you.y = 69; settle(2);
    const away = draw();
    ok(setsTo(away, 'fillStyle', X.careerEdgeCol()) && hasTag(away), `cam ${cam}: off the frame, a star-tinted arrow`);
    you.x = mate.x + 3; you.y = mate.y + 1; settle(2);
    if (cam) ok(!hasTag(draw()), `cam ${cam}: back on it, no arrow`);
    m.phase = 'cut'; m.cut = { kind:'scrum', t:0, hit:[0, 0] }; { const during = log(() => { try { D.render(0); } catch (e) { /* as above */ } }); ok(!hasTag(during), `cam ${cam}: nothing of it in a close-up`); }
    D.exitMatch();
  }
  keep.cam = 2;
  { const m = play(); C.arm(); ok(S.ctrlOf(0) === m.careerP, 'the ring still starts on your player at the kick-off'); D.exitMatch(); }
  // the arrow's colour stands on its dark disc
  { const m = play(), dark = { fill:'#101010', trim:'#000000', hoops:false }; const kit0 = m.kit[0]; m.kit[0] = dark; ok(T.teams.colorDist(X.careerEdgeCol(), '#08110b') >= 90, 'a near-black kit gets a chalk arrow'); m.kit[0] = kit0; D.exitMatch(); }
  // the caption
  const capShown = () => { D.updateHud(); return !$('h-cap').hidden; };
  const m1 = play();
  ok(X.CAREER_CAP.matches === 3 && X.careerCaption() && capShown(), 'the kick-off caption shows in a player\'s first career matches');
  m1.cut = { kind:'scrum', t:0 }; m1.phase = 'cut'; ok(!X.careerCaption(), 'not over a close-up'); inPlay(m1);
  m1.paused = true; ok(!X.careerCaption(), 'nor paused'); m1.paused = false;
  const step0 = m1.stepN; T.update(STEP); ok(m1.stepN === step0 + 1, 'and play runs under it');
  { // one thing to read: the coach line and the opening card wait for it, and a tag keeps off it
    const keepTips = keep.tips, keepCoach = keep.coach, was = m1.capUntil, me = m1.ctrl; keep.tips = []; keep.coach = true;
    const b1 = m1.ball; b1.state = 'held'; b1.carrier = m1.players.find(p => p.team === 1); b1.f = null; me.x = b1.carrier.x - 12; me.y = b1.carrier.y; m1.tags.length = 0; $('banner').innerHTML = '';
    const coachDue = () => { D.coachClear(); $('banner').innerHTML = ''; const a = keep.tips.length; D.coachTick(); return keep.tips.length > a; };
    ok(!coachDue(), 'a coach line waits for the caption');
    const H = D.hintOpen()[0]; H.cur = null; H.last = -99; H.shown.clear(); D.syncHints('Offload', ''); ok(H.cur === null, 'and so does the opening hints card');
    m1.capUntil = 0; ok(coachDue(), 'and the line comes once it has gone'); D.syncHints('Offload', ''); ok(H.cur === 'offload', 'and so does the card');
    m1.capUntil = was; H.cur = null; H.shown.clear(); keep.tips = keepTips; keep.coach = keepCoach; $('banner').innerHTML = ''; inPlay(m1);
    for (const [W, HH] of [[844, 390], [667, 375]]) for (const ins of [{ t:0, r:0, b:0, l:0 }, { t:0, r:47, b:21, l:47 }, { t:0, r:59, b:21, l:59 }]) {
      D.view(W, HH); const bad = [];
      for (let i = 0; i < 64; i++) { const a = i*Math.PI/32, [x, y] = X.edgeTagAt(W/2 + Math.cos(a)*2000, HH/2 + Math.sin(a)*2000, ins); if (Math.abs(x - W/2) < 146 + X.BV_TAG.tip && y + X.BV_TAG.tip > HH - 42 - ins.b) bad.push([x, y].map(Math.round).join(',')); }
      ok(!bad.length, `${W}x${HH} insets ${ins.l}: a tag stays off the caption at the foot of the screen (${bad.slice(0, 3).join(' ') || 'ok'})`);
    }
    D.view(844, 390);
  }
  m1.rt += X.CAREER_CAP.secs + 0.01; ok(!X.careerCaption() && !capShown(), `gone after ${X.CAREER_CAP.secs}s`);
  D.exitMatch();
  cr.totals.matches = X.CAREER_CAP.matches - 1; { const m = play(); ok(capShown(), 'in the last of them, still'); D.exitMatch(); }
  cr.totals.matches = X.CAREER_CAP.matches; { const m = play(); ok(!X.careerCaption() && !capShown(), 'and after that no more'); D.exitMatch(); }
  cr.totals.matches = 0; keep.hints = false; { const m = play(); ok(!X.careerCaption(), 'Match Help off: none'); D.exitMatch(); } keep.hints = true;
  { fresh(); ok(!X.careerCaption(), 'a match that is not a career has none'); }
  C.set(null);
}
{ // the words, as the page has them: Title Case, no he or his, and short
  const { readGameSource } = await import('./source.mjs'), html = readGameSource();
  const cap = html.match(/<div class="bcap"[^>]*>([\s\S]*?)<\/div>/)[1].replace(/<[^>]+>/g, '').trim();
  ok(cap === 'Star: Your Player. Ring: Who You Control.', `the caption reads "${cap}"`);
  const small = new Set(['the']), titled = s => s.split(/\s+/).every(w => small.has(w) || /^[A-Z]/.test(w));
  ok(cap.split(/[.:]\s*/).filter(Boolean).every(titled) && Object.values(X.BALL_STATUS).every(s => titled(s.word)), 'Title Case');
  ok(![cap, ...Object.values(X.BALL_STATUS).map(s => s.word)].some(s => /\b(he|his|him|she|her)\b/i.test(s)), 'no he or his');
  ok(/id="h-stat"[^>]*hidden/.test(html) && /id="h-cap"[^>]*hidden/.test(html), 'both start hidden');
  const hud = html.match(/<div id="hud"[\s\S]*?<button class="pause"/)[0];
  ok(hud.includes('h-stat') && hud.includes('h-cap'), 'and live in the HUD, so they go when it goes');
  ok(/\.bcap\{position:fixed/.test(html), 'the caption has its own place out of the column, so the sign can\'t move it (tools/browser.mjs measures it)');
}
console.log(failed ? `Clarity: ${passed} passed, ${failed} failed` : `Clarity: ${passed} passed, 0 failed`);
process.exit(failed ? 1 : 0);
