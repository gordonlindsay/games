// Tag Chase's reps getting harder (src/training.js, DRILL_TAG.ramp; README.md, Skill Games). The owner, 14 Nov 2026, playing 1.6: "Tag
// chase game is a bit too easy". Each rep plays at a level, its share of the climb (ramp.rep) times how steep the Difficulty makes it
// (ramp.diff), and each ramped lever goes that share of the way to its top. The youngest (the Kids level, or Minis) and Watch How play
// every rep at level 0: the game as it was. On a ramped rep the Pull's carrier starts ramp.lane off the middle, on the side drawn, and
// weaves towards the middle first, so the lane drawn decides nothing. Two seeded players measure it: a sharp one with near-perfect
// timing and a casual adult.
// node tools/tagchase.mjs              the default gate (check.mjs, a few seconds): the table, each rep's level and levers at every
//                                      Difficulty, the youngest, Watch How and the ramp off playing exactly as b9fa00d (fingerprints
//                                      pinned from that build), no new draw, the stars, a ramped Pull the same rep from either side and
//                                      no Pull to a run at the carrier with Pull Tag hammered, the Keep's timing window and the gap that
//                                      wins it at every level, and a short band check
// node tools/tagchase.mjs --balance    README.md's tables: before (the ramp off, b9fa00d's game, proved the same by the gate) and after,
//                                      for both players on Easy, Normal and Hard over TC_RUNS (200) seeded runs each, the youngest, the
//                                      casual adult leading the carrier, the late Pulls by the side the carrier starts, and the sharp
//                                      player slowed, so the climb is seen to be one of timing. Seconds, not minutes
// node tools/tagchase.mjs --pin        prints this build's fingerprints; GAME=<b9fa00d>/index.html node tools/tagchase.mjs --pin made PIN
// TC_RAMP='{"keep":{"trigger":7}}' tries other levers (deep-merged into DRILL_TAG.ramp); TC_BASE moves the block of seeds; TC_HOW=1
// adds how each rep ended; VERBOSE=1 lists every check
process.env.SEED ??= '17';
const H = await import('./harness.mjs');
const { T } = H;
const P = T.practice, X = T.drills, D = T.debug, $ = id => document.getElementById(id), inp = T.input, STEP = T.STEP;
const args = process.argv.slice(2);
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else failed++; if (!cond || process.env.VERBOSE) console.log(cond ? 'ok  ' : 'FAIL', msg); };
D.settings().drillSeen = X.DRILLS.map(d => d.id);   // no Watch How on a first open: every run here is a real one
const deep = (a, b) => { for (const [k, v] of Object.entries(b)) a[k] = v && typeof v === 'object' && !Array.isArray(v) ? deep(a[k] || {}, v) : v; return a; };
if (process.env.TC_RAMP && X.TAG.ramp) deep(X.TAG.ramp, JSON.parse(process.env.TC_RAMP));

// b9fa00d (Tryline Rugby 1.6, the build before the ramp), measured with --pin under GAME: one fingerprint for every Difficulty,
// since nothing in that build read it, and the same at the Kids level and with Minis picked
const PIN = { casual:'15d1r6o', sharp:'3ft88c', draws:5 };

const stick = (x, y) => { const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } const t = T.behind.stickTurn(0); if (t) { const sx = y*t, sy = -x*t; x = sx; y = sy; } inp.jx = x; inp.jy = y; };
const toward = (me, x, y, near = 0.15) => { const dx = x - me.x, dy = y - me.y, m = Math.hypot(dx, dy); if (m > near) stick(dx/m*Math.min(1, m/0.6), dy/m*Math.min(1, m/0.6)); else stick(0, 0); };
const letGo = () => { stick(0, 0); inp.aPressed = false; inp.keys.clear(); };
const frames = sec => Math.max(0, Math.round(sec/STEP));   // real seconds, as a person's reaction is: the drill's own clock runs at X.PACE.live of it
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };

// the players' own dice, seeded per run and kept apart from the game's, so a player's noise never moves the game's draws
const dice = seed => { let s = seed >>> 0; const u = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; };
  const g = () => { let a = 0, b = 0; while (!a) a = u(); while (!b) b = u(); return Math.sqrt(-2*Math.log(a))*Math.cos(2*Math.PI*b); };
  return { u, g, pick:p => u() < p, range:(a, b) => a + (b - a)*u(), norm:(m, sd, lo, hi) => Math.min(hi, Math.max(lo, m + sd*g())) }; };

/* The two players. Each sees the pitch one reaction late (its own, drawn each rep) and acts on what it saw, as tools/training.mjs's tagBot does.
   sharp: near-perfect timing. A 0.15 s reaction (sd 0.03, 0.08 to 0.25). Keep: runs straight at the tagger and changes direction the
     moment they go, away from the side they are on. Pull: reads the carrier's run, allowing for its own reaction, gets beside them at a
     hip and taps the moment it is in reach.
   casual: a casual adult. A 0.3 s reaction (sd 0.08, 0.15 to 0.6), later by a further 0.2 to 0.4 s one rep in six. Keep: runs at the
     tagger with a little drift, changes direction less sharply and either way, and one rep in six goes 0.15 to 0.5 s before the
     tagger does. Pull: heads for a hip where the carrier was, with no allowance for its own reaction; one rep in four comes at the
     front until close, and one in five taps once from the front. Taps when it sees the hip in reach, no more than four times a second. */
const MODELS = {
  sharp:{ react:[0.15, 0.03, 0.08, 0.25], late:0, early:0, drift:0, cut:[0.45, 0.9], front:0, frontTap:0, lead:true },
  casual:{ react:[0.3, 0.08, 0.15, 0.6], late:1/6, lateBy:[0.2, 0.4], early:1/6, earlyBy:[0.15, 0.5], drift:0.18, cut:[0.6, 0.75], front:1/4, frontTap:1/5, lead:false },
};
const slowed = r => ({ ...MODELS.sharp, react:[r, 0.03, Math.max(0.05, r - 0.1), r + 0.1] });   // the sharp player at a slower reaction, nothing else changed
function player(o, R) {
  let rep = 0, seen = [], side = 0, plan = null, tapGap = 0, f = 0;
  return st => {
    const G = st.tag, me = G.me, th = G.them;
    if (G.rep !== rep) {
      rep = G.rep; seen = []; side = 0; tapGap = 0; f = 0;
      const lag = R.norm(...o.react) + (o.late && R.pick(o.late) ? R.range(...o.lateBy) : 0);
      plan = { n:frames(lag), lag, early:o.early && R.pick(o.early) ? R.range(...o.earlyBy) : 0, front:o.front && R.pick(o.front), frontTap:o.frontTap && R.pick(o.frontTap), wob:R.range(0, 6.28), way:R.pick(0.5) ? 1 : -1 };
    }
    f++;
    seen.push({ l:!!G.lunge, x:th.x, y:th.y, vx:th.vx, vy:th.vy, can:X.tagCanPull(G), mx:me.x, my:me.y });
    const s = seen[Math.max(0, seen.length - 1 - plan.n)];
    if (G.stage !== 'play') { stick(0, 0); return; }
    if (G.rep % 2 === 1) {                                 // Keep
      if (th.x <= me.x) { side = 0; stick(1, 0); return; }   // past them: for the line
      const gap = Math.hypot(s.x - s.mx, s.y - s.my), soon = plan.early*1.25*T.contact.maxSpeed(me)*X.PACE.live;   // going early: this many metres before the gap the tagger goes at, at the closing speed
      if (!side && (s.l || (plan.early && gap < (G.Q || X.TAG.keep).trigger + soon))) side = o.drift ? plan.way : Math.abs(me.y - th.y) > 0.3 ? Math.sign(me.y - th.y) : me.y >= 35 ? -1 : 1;
      if (side) { stick(o.cut[0], side*o.cut[1]); return; }
      stick(1, o.drift*Math.sin(plan.wob + f*STEP*2.2));
      return;
    }
    const sd = me.y >= s.y ? 1 : -1, lead = 0.3 + (o.lead ? plan.lag*X.PACE.live : 0), d = Math.hypot(me.x - s.x, me.y - s.y);   // Pull
    toward(me, s.x + s.vx*lead, s.y + s.vy*lead + sd*(plan.front && d > 2.5 ? 0.6 : 1.2), 0.2);
    if (tapGap > 0) { tapGap--; return; }
    if (s.can || (plan.frontTap && d < 2.4)) { inp.aPressed = true; tapGap = frames(0.25); if (!s.can) plan.frontTap = false; }
  };
}

// one run: the game reseeded, the player's dice seeded alike, at a Difficulty (Easy 0, Normal 1, Hard 2), the Kids level or Minis or neither.
// trace: every step's positions, hashed, with the reps' words and the stars (the fingerprint); flip: each Pull played from the other side
function runOnce(model, seed, diff, o = {}) {
  const S = D.settings(), was = { diff:S.diff, kids:S.kids, cat:S.cat };
  S.diff = diff; S.kids = !!o.kids; if (o.minis) S.cat = 'minis';
  H.reseed(seed); P.start('tag'); $('pr-retry').click();
  const bot = player(typeof model === 'string' ? MODELS[model] : model, dice(seed*2654435761)), words = [], levels = [], sides = [], trail = [];
  let n = 0, last = 0, r0 = H.rndCalls(), lv = -1;
  while (P.state() && !P.state().done && n < 20000) {
    const G = P.state().tag;
    if (G.rep !== lv) { lv = G.rep; levels.push(G.lv); const mid = X.TAG.pull.them[1]; if (o.flip && G.rep % 2 === 0) { G.them.y = 2*mid - G.them.y; G.wv = -G.wv; } sides.push(G.them.y < mid ? -1 : 1); }   // flip: each Pull's carrier moved to the other side
    bot(P.state()); T.update(STEP); n++;
    if (G.results.length > last) { last = G.results.length; words.push(G.word); }
    if (o.trace) trail.push(G.me.x.toFixed(5), G.me.y.toFixed(5), G.them.x.toFixed(5), G.them.y.toFixed(5));
  }
  letGo();
  const st = P.state(), G = st.tag, out = { results:G.results.slice(), won:G.won, stars:st.stars, words, levels, sides, draws:H.rndCalls() - r0 };
  if (o.trace) out.print = fnv(trail.join() + '|' + words.join() + '|' + st.stars);
  P.leave(); S.diff = was.diff; S.kids = was.kids; S.cat = was.cat;
  return out;
}
function measure(model, diff, runs, o = {}, base = +process.env.TC_BASE || 1) {
  const perRep = [0, 0, 0, 0, 0, 0], starN = [0, 0, 0, 0], how = {}, side = { '-1':[0, 0], '1':[0, 0] }; let won = 0;
  for (let r = 0; r < runs; r++) { const x = runOnce(model, (base + r)*7919, diff, o); won += x.won; starN[x.stars]++; x.results.forEach((w, i) => { perRep[i] += w ? 1 : 0; }); x.words.forEach(w => { how[w] = (how[w] || 0) + 1; });
    for (const i of [3, 5]) { side[x.sides[i]][0] += x.results[i] ? 1 : 0; side[x.sides[i]][1]++; } }   // the late Pulls, reps 4 and 6, by the side the carrier started
  const pc = k => Math.round(k/runs*100);
  return { model, diff, runs, how, mean:won/runs, starN, stars:starN.map(pc), rep:perRep.map(pc), keep:pc((perRep[0] + perRep[2] + perRep[4])/3), pull:pc((perRep[1] + perRep[3] + perRep[5])/3),
    side:[side['-1'][0]/(side['-1'][1] || 1)*100, side['1'][0]/(side['1'][1] || 1)*100] };
}
const DIFF = ['Easy', 'Normal', 'Hard'];
const row = (m, label) => `| ${label} | ${m.mean.toFixed(2)} | ${m.stars.join(' / ')} | ${m.rep.join(' ')} | ${m.keep} | ${m.pull} |` + (process.env.TC_HOW ? ' ' + Object.entries(m.how).map(([k, v]) => k + ' ' + v).join(', ') : '');
const prints = () => ({ casual:runOnce('casual', 4242, 1, { trace:true }), sharp:runOnce('sharp', 4243, 1, { trace:true }) });
// with the ramp off: every rep at level 0, the game as b9fa00d played it (the gate proves it, print for print)
function rampOff(fn) { const R = X.TAG.ramp, was = R.diff; R.diff = [0, 0, 0]; try { return fn(); } finally { R.diff = was; } }

if (args[0] === '--pin') {                                // every Difficulty, the Kids level and Minis on each: one line each
  for (const [name, o, d] of [['Easy', {}, 0], ['Normal', {}, 1], ['Hard', {}, 2], ['Kids', { kids:true }, 0], ['Minis Easy', { minis:true }, 0], ['Minis Normal', { minis:true }, 1], ['Minis Hard', { minis:true }, 2]]) {
    const c = runOnce('casual', 4242, d, { ...o, trace:true }), s = runOnce('sharp', 4243, d, { ...o, trace:true });
    console.log(name.padEnd(13), JSON.stringify({ casual:c.print, sharp:s.print, draws:c.draws }));
  }
  process.exit(0);
}

if (args[0] === '--balance') {
  const runs = +process.env.TC_RUNS || 200, head = '| Player, Difficulty | Reps won (of 6) | Stars 0 / 1 / 2 / 3 (% of runs) | Won by rep 1 to 6 (%) | Keep (%) | Pull (%) |\n|---|---|---|---|---|---|';
  console.log(`Tag Chase, ${runs} seeded runs each (seeds ${(+process.env.TC_BASE || 1)*7919} on, step 7919). Keep is reps 1, 3 and 5, Pull 2, 4 and 6.`);
  console.log('\nBefore (the ramp off: b9fa00d, the same on every Difficulty)\n' + head);
  const was = {}, now = {}, leads = { ...MODELS.casual, lead:true };   // the casual adult, but allowing for its own reaction in the Pull as the sharp player does
  for (const model of ['sharp', 'casual']) console.log(row(was[model] = rampOff(() => measure(model, 1, runs)), model + ', any'));
  console.log('\nAfter\n' + head);
  for (const model of ['sharp', 'casual']) for (const diff of [0, 1, 2]) console.log(row(now[model + diff] = measure(model, diff, runs), model + ', ' + DIFF[diff]));
  for (const diff of [0, 1, 2]) console.log(row(measure(leads, diff, runs), 'casual leading the carrier, ' + DIFF[diff]));
  for (const model of ['sharp', 'casual']) console.log(row(measure(model, 0, runs, { kids:true }), model + ', Kids level (as before)'));   // a flag on Easy (kids.js)
  for (const model of ['sharp', 'casual']) console.log(row(measure(model, 2, runs, { minis:true }), model + ', Minis on Hard (as before)'));
  const sd = m => m.side.map(v => Math.round(v)).join(' / ');
  console.log('\nThe late Pulls (reps 4 and 6) won by the casual adult (%), the carrier starting below the middle / above it\n| Before | Easy | Normal | Hard |\n|---|---|---|---|');
  console.log(`| ${sd(was.casual)} | ${[0, 1, 2].map(d => sd(now['casual' + d])).join(' | ')} |`);
  console.log('\nThe sharp player slowed, nothing else changed\n| Reaction | Reps won before | Easy | Normal | Hard |\n|---|---|---|---|---|');
  for (const r of [0.15, 0.2, 0.25, 0.3, 0.35, 0.4]) { const m = slowed(r); console.log(`| ${r.toFixed(2)} s | ${rampOff(() => measure(m, 1, runs)).mean.toFixed(2)} | ${[0, 1, 2].map(d => measure(m, d, runs).mean.toFixed(2)).join(' | ')} |`); }
  process.exit(0);
}

/* ---------- 1. the table ---------- */
const R = X.TAG.ramp, KEEP = X.TAG.keep, PULL = X.TAG.pull;
const harder = { trigger:-1, track:1, read:-1, pace:1, step:1, reach:-1 };   // the way each lever makes a rep harder
ok(R.rep.length === X.TAG.reps && R.rep[0] === 0 && R.rep[R.rep.length - 1] === 1 && R.rep.every((v, i) => !i || v > R.rep[i - 1]), 'the climb: rep 1 at none of it, rep 6 at all of it, every rep further up than the one before (' + R.rep.join(', ') + ')');
ok(R.diff.length === 3 && R.diff.every((v, i) => v > 0 && v <= 1 && (!i || v > R.diff[i - 1])), 'Easy, Normal and Hard each climb, each steeper than the one before, Hard to the top (' + R.diff.join(', ') + ')');
ok(JSON.stringify(Object.keys(R.keep)) === '["trigger","track","read"]' && JSON.stringify(Object.keys(R.pull)) === '["pace","step","reach"]', 'the levers: Keep trigger, track and read; Pull pace, step and reach');
ok(Object.entries({ ...R.keep }).every(([k, v]) => k in KEEP && Math.sign(v - KEEP[k]) === harder[k]) && Object.entries(R.pull).every(([k, v]) => k in PULL && Math.sign(v - PULL[k]) === harder[k]), 'each lever\'s top is the harder way from the mode\'s own value: later, harder leaning, sooner read; quicker, bigger steps, a closer hip');
ok(R.lane > 0 && R.lane < PULL.lane, `a ramped Pull's carrier starts ${R.lane} m off the middle, inside the ${PULL.lane} m either side the youngest's is drawn from`);
ok(R.keep.trigger >= 6 && R.pull.pace <= 0.75 && R.pull.reach >= 1.3, `the top stays in the drill's shape: they still go from ${R.keep.trigger} m, run at ${R.pull.pace} of your pace, a hip in reach at ${R.pull.reach} m`);

/* ---------- 2. each rep's level and levers, at every Difficulty ---------- */
{
  const S = D.settings(), was = { diff:S.diff, kids:S.kids, cat:S.cat }, lerp = (a, b, u) => a + (b - a)*u;
  for (const d of [0, 1, 2]) {
    S.diff = d; S.kids = false; S.cat = 'men';
    const want = R.rep.map(u => u*R.diff[d]), got = R.rep.map((u, i) => X.tagLevel(i + 1));
    ok(JSON.stringify(got) === JSON.stringify(want), DIFF[d] + ': rep levels ' + got.map(v => v.toFixed(2)).join(', '));
    const o = runOnce('sharp', 31, d);
    ok(JSON.stringify(o.levels) === JSON.stringify(want), DIFF[d] + ': a run plays each rep at its level');
    P.start('tag'); $('pr-retry').click(); const G = P.state().tag;
    ok(G.lv === 0 && G.Q === KEEP, DIFF[d] + ': rep 1 is the game as it was, the Keep\'s own levers');
    let all = true, lanes = true;
    for (let r = 2; r <= 6; r++) {
      G.stage = 'show'; G.t = 99; inp.aPressed = false; T.update(STEP);   // straight to the next rep
      const mode = r % 2 ? 'keep' : 'pull', base = mode === 'keep' ? KEEP : PULL, top = R[mode], lv = want[r - 1];
      all = all && G.rep === r && G.lv === lv && Object.keys(base).every(k => G.Q[k] === (k in top ? lerp(base[k], top[k], lv) : base[k]));
      if (mode === 'pull') lanes = lanes && Math.abs(G.them.y - PULL.them[1]) === R.lane && G.wv === -Math.sign(G.them.y - PULL.them[1]);
    }
    ok(all, DIFF[d] + ': reps 2 to 6 each take every ramped lever its level\'s share of the way to the top, and leave the rest as they were');
    ok(lanes, DIFF[d] + ': each Pull\'s carrier starts ' + R.lane + ' m off the middle and weaves towards it first');
    P.leave();
  }
  S.diff = 1; S.kids = false; S.cat = 'men';
  P.start('tag'); $('pr-retry').click(); { const G = P.state().tag; for (let r = 2; r <= 6; r++) { G.stage = 'show'; G.t = 99; T.update(STEP); }
    ok(G.rep === 6 && G.Q.pace === lerp(PULL.pace, R.pull.pace, R.diff[1]) && G.Q.reach === lerp(PULL.reach, R.pull.reach, R.diff[1]), 'Normal\'s last rep, a Pull, at Normal\'s share of the top (pace ' + G.Q.pace.toFixed(3) + ', reach ' + G.Q.reach.toFixed(2) + ' m)');
    G.me.x = G.them.x; G.me.y = G.them.y + (G.Q.reach + PULL.reach)/2; G.them.vx = -5; G.them.vy = 0;
    ok(!X.tagCanPull(G), 'beside them, a hip in reach before the ramp is out of reach now: Pull Tag reads the rep\'s own reach');
    G.me.y = G.them.y + G.Q.reach - 0.05; ok(X.tagCanPull(G), 'and just inside it, in reach'); }
  P.leave();
  Object.assign(S, was);
}

/* ---------- 3. the youngest, Watch How and the ramp off: the game as b9fa00d played it ---------- */
{
  const S = D.settings(), was = { diff:S.diff, kids:S.kids, cat:S.cat };
  const young = [['the Kids level', { kids:true }, 0], ...[0, 1, 2].map(d => ['Minis on ' + DIFF[d], { minis:true }, d])];
  for (const [name, o, d] of young) {
    S.diff = d; S.kids = !!o.kids; S.cat = o.minis ? 'minis' : 'men';
    ok(R.rep.every((u, i) => X.tagLevel(i + 1) === 0), name + ': every rep at level 0');
    S.cat = was.cat; S.kids = was.kids;
    const c = runOnce('casual', 4242, d, { ...o, trace:true }), s = runOnce('sharp', 4243, d, { ...o, trace:true });
    ok(c.print === PIN.casual && s.print === PIN.sharp && c.levels.every(v => v === 0), name + ': the same seed and the same play give the same run as b9fa00d, step for step (' + c.print + ', ' + s.print + ')');
  }
  { S.diff = 1; S.kids = false; S.cat = 'minis'; P.start('tag'); $('pr-retry').click(); const G = P.state().tag; let same = G.Q === KEEP;
    for (let r = 2; r <= 6; r++) { G.stage = 'show'; G.t = 99; T.update(STEP); same = same && G.Q === (r % 2 ? KEEP : PULL); }
    ok(same, 'Minis: every rep plays the mode\'s own levers, the very same objects'); P.leave(); S.cat = was.cat; }
  const off = rampOff(() => prints());
  ok(off.casual.print === PIN.casual && off.sharp.print === PIN.sharp, 'the ramp off (every Difficulty at none of the climb) plays as b9fa00d, step for step: the before tables are that build');
  const on = prints();
  ok(on.casual.print !== PIN.casual, 'and on Normal with the ramp it does not');
  ok(on.casual.draws === PIN.draws && off.casual.draws === PIN.draws && runOnce('casual', 4242, 2).draws === PIN.draws, 'no new draw: a run draws ' + PIN.draws + ' random numbers, as b9fa00d did, on any Difficulty');
  { S.diff = 2; S.kids = false; P.start('tag'); X.demoStart(); const st = P.state(), G = st.tag, lv = [];
    for (let i = 0; i < 9000 && P.state() && P.state().demo && G.rep <= 2; i++) { if (!lv.includes(G.rep)) lv.push(G.rep); if (G.lv !== 0) lv.push('level ' + G.lv); T.update(STEP); }
    ok(lv.join() === '1,2,3' || lv.join() === '1,2', 'Watch How on Hard plays its Keep and its Pull at level 0, as it always did (' + lv.join() + ')'); P.leave(); }
  Object.assign(S, was);
}

/* ---------- 4. a ramped Pull is the same rep from either side: the lane drawn decides nothing ---------- */
// The review (14 Nov 2026): the weave always set off one way, so a carrier starting on the other side came into you, and one starting
// near the middle came straight at you; the late Pulls turned on the lane drawn (the casual adult on Normal's rep 6: 13% from one side,
// 35% from the other). A player who plays the same way, seeing late by a set lag, now traces the mirror image of its run from the other side
function pullSide(d, r, lag, lead) {                     // rep r on Difficulty d from each side: its word and its path, mirrored about the middle
  const S = D.settings(), out = {};
  S.diff = d; S.kids = false; S.cat = 'men';
  for (let seed = 1; seed < 60 && Object.keys(out).length < 2; seed++) {
    H.reseed(seed*911); P.start('tag'); $('pr-retry').click(); const G = P.state().tag;
    while (G.rep < r) { G.stage = 'show'; G.t = 99; inp.aPressed = false; T.update(STEP); }
    const side = G.them.y < PULL.them[1] ? -1 : 1, n = frames(lag), seen = [], path = []; let gap = 0;
    if (!out[side]) {
      for (let i = 0; i < 3000 && G.stage === 'play' && G.rep === r; i++) {
        const me = G.me, th = G.them; seen.push({ x:th.x, y:th.y, vx:th.vx, vy:th.vy, can:X.tagCanPull(G) });
        const o = seen[Math.max(0, seen.length - 1 - n)], sd = me.y >= o.y ? 1 : -1, ahead = 0.3 + lead*lag*X.PACE.live;
        toward(me, o.x + o.vx*ahead, o.y + o.vy*ahead + sd*1.2, 0.2);
        if (gap > 0) gap--; else if (o.can) { inp.aPressed = true; gap = frames(0.25); }
        path.push(me.x.toFixed(4) + ',' + ((me.y - PULL.them[1])*side).toFixed(4));
        T.update(STEP);
      }
      out[side] = { word:G.word, path:path.join(';') };
    }
    letGo(); P.leave();
  }
  return out;
}
{
  const S = D.settings(), was = { diff:S.diff, kids:S.kids, cat:S.cat }, words = new Set(); let same = 0, n = 0;
  for (const [d, r] of [[0, 2], [1, 4], [1, 6], [2, 6]]) for (const lag of [0.15, 0.3, 0.45]) for (const lead of [0, 1]) {
    const o = pullSide(d, r, lag, lead); n++; if (o[-1] && o[1] && o[-1].word === o[1].word && o[-1].path === o[1].path) same++; if (o[1]) words.add(o[1].word);
  }
  ok(same === n && words.size > 1, `the same play from either side gives the mirror image of the same run, step for step and word for word (${same} of ${n}, ${[...words].join(', ')})`);
  Object.assign(S, was);
  // and the casual adult, its own dice the same, with every Pull's carrier moved to the other side: the same reps won and lost, so the
  // late Pulls' win rates from either side are one rate (on 65fdb42 its rep 6 on Normal was 13% from one side, 35% from the other)
  let pairs = 0, agree = 0, late = 0;
  for (const d of [1, 2]) for (let r = 1; r <= 15; r++) { const a = runOnce('casual', r*7919, d), b = runOnce('casual', r*7919, d, { flip:true });
    pairs++; if (JSON.stringify(a.results) === JSON.stringify(b.results) && a.sides.every((v, i) => i % 2 === 0 || v === -b.sides[i])) agree++; late += a.results[3] + a.results[5]; }
  ok(agree === pairs && late > 0 && late < 2*pairs, `the casual adult with every Pull from the other side wins and loses the very same reps (${agree} of ${pairs} runs on Normal and Hard; late Pulls won ${late} of ${2*pairs})`);
  // towards the middle, not away: tools/training.mjs's directed spam (straight at the carrier, Pull Tag pressed every step) wins no
  // ramped Pull; with the weave sent away from the middle on both sides it would win every one
  const spam = (d, away) => { let won = 0, n = 0; S.diff = d; S.kids = false; S.cat = 'men';
    for (let r = 1; r <= 8; r++) { H.reseed(r*7919); P.start('tag'); $('pr-retry').click(); let rep = 0;
      for (let i = 0; i < 20000 && P.state() && !P.state().done; i++) { const G = P.state().tag;
        if (G.rep !== rep) { rep = G.rep; if (away && rep % 2 === 0) G.wv = -G.wv; }
        if (G.stage !== 'play') stick(0, 0); else if (G.rep % 2) stick(1, 0); else { toward(G.me, G.them.x, G.them.y); inp.aPressed = true; }
        T.update(STEP); }
      const G = P.state().tag; for (const k of [1, 3, 5]) { won += G.results[k] ? 1 : 0; n++; } letGo(); P.leave(); }
    return [won, n]; };
  const sp = [0, 1, 2].map(d => spam(d)), away = [0, 1, 2].map(d => spam(d, true));
  ok(sp.every(([w]) => w === 0) && away.every(([w, n]) => w === n), `running straight at the carrier and hammering Pull Tag wins no Pull on any Difficulty (${sp.map(([w, n]) => w + ' of ' + n).join(', ')}); sent away from the middle it would win every one (${away.map(([w, n]) => w + ' of ' + n).join(', ')})`);
  Object.assign(S, was);
}

/* ---------- 5. the stars ---------- */
ok(JSON.stringify(X.TAG.stars) === '[2,4,6]' && X.TAG.reps === 6, 'stars at 2, 4 and 6 reps won, of 6, as before');
{ const runs = [1, 2, 3, 4, 5, 6, 7, 8].map(s => runOnce(s % 2 ? 'casual' : 'sharp', s*313, s % 3));
  ok(runs.every(o => o.stars === X.starsOf(o.won, X.TAG.stars) && o.results.length === 6 && o.won === o.results.filter(Boolean).length), 'a run\'s stars are its reps won against 2, 4 and 6 (' + runs.map(o => o.won + ':' + o.stars).join(' ') + ')'); }

/* ---------- 6. the Keep's timing window: change direction this long after they go (before, if negative) ---------- */
function keepRep(lv, delta, seed, atGap) {               // atGap: change direction as they close to that many metres instead, whenever they go
  H.reseed(seed); P.start('tag'); $('pr-retry').click(); const G = P.state().tag; G.Q = X.tagLevers('keep', lv);
  const close = 1.25*T.contact.maxSpeed(G.me)*X.PACE.live; let at = null, side = 0, f = 0;
  for (let i = 0; i < 2000 && G.rep === 1 && G.stage === 'play'; i++) {
    f++; const gap = Math.hypot(G.me.x - G.them.x, G.me.y - G.them.y);
    if (G.lunge && at == null) at = f;
    const go = atGap != null ? gap < atGap : (delta < 0 && gap < G.Q.trigger - close*delta) || (delta >= 0 && at != null && f - at >= frames(delta));
    if (!side && go) side = G.me.y >= 35 ? -1 : 1;
    if (G.them.x <= G.me.x || !side) stick(1, 0); else stick(0.45, side*0.9);
    T.update(STEP);
  }
  const won = G.results[0] === true; P.leave(); return won;
}
const keeps = (lv, delta, atGap) => [1, 2, 3, 4, 5, 6].filter(s => keepRep(lv, delta, s*101, atGap)).length;
{
  const top = R.rep[4]*R.diff[2];                          // Hard's last Keep, rep 5
  ok(keeps(0, 0.8) === 6, 'level 0, rep 1 as it always was: a change of direction 0.8 s after they go still keeps the tags');
  ok(keeps(top, 0.15) === 6 && keeps(top, 0.35) === 0, `Hard's last Keep (level ${top}): 0.15 s after they go keeps the tags, 0.35 s loses them`);
  ok([0, 0.5, top, 1].every(lv => keeps(lv, -0.6) === 0), 'at every level a move 0.6 s before they go is followed and pulled: going early is no way round their going later');
  const was = { ...R.keep }; R.keep.track = KEEP.track; R.keep.read = KEEP.read;
  const bare = keeps(top, -0.6); Object.assign(R.keep, was);
  ok(bare === 6, 'without track and read it would get through (' + bare + ' of 6 kept): those two hold the early side of the window while trigger closes the late one');
  // the review: Hard's last Keep wants a reaction of 0.2 s, about the quickest a person manages on a phone. So it is not a test of reaction
  // alone: reading the gap wins it. Changing direction as they close to 7 or 8 m keeps the tags on every Keep at every Difficulty
  const levels = [...new Set([0, 1, 2].flatMap(d => [0, 2, 4].map(i => R.rep[i]*R.diff[d])))];
  ok([7, 8].every(g => levels.every(lv => keeps(lv, 0, g) === 6)), 'reading the gap wins every Keep: changing direction as they close to 7 or 8 m keeps the tags at every level (' + levels.map(v => +v.toFixed(2)).join(', ') + ')');
}

/* ---------- 7. a short band check: the owner's aim, measured (tools/tagchase.mjs --balance has the full tables) ---------- */
{
  const n = 60, m = (model, d) => measure(model, d, n), cE = m('casual', 0), cN = m('casual', 1), cH = m('casual', 2), sN = m('sharp', 1), sH = m('sharp', 2), flat = rampOff(() => measure('casual', 1, n));
  const show = x => x.mean.toFixed(2) + ' won, stars ' + x.stars.join('/') + '%';
  ok(cE.mean < flat.mean - 0.15 && cE.starN[2] + cE.starN[3] >= 0.85*n, `Easy is a little harder than before (${show(cE)}, before ${show(flat)}), and a casual adult still takes two stars most runs`);
  ok(cN.mean >= 3.2 && cN.mean <= 4.4 && cN.starN[2] === Math.max(...cN.starN) && cN.starN[1] >= 0.15*n && cN.starN[3] <= 0.12*n, `Normal: a casual adult wins about 3 or 4 of 6, often 2 stars, sometimes 1, rarely 3 (${show(cN)})`);
  ok(sN.starN[3] >= 0.95*n, `Normal: a sharp player still wins all 6 (${show(sN)})`);
  ok(cH.mean < cN.mean && cH.starN[3] <= 0.06*n && sH.starN[3] >= 0.9*n, `Hard: the hardest, and three stars need a sharp player (casual ${show(cH)}; sharp ${show(sH)})`);
  ok(cN.rep[0] >= 95 && cN.rep[0] >= flat.rep[0] - 2 && cN.rep[4] < cN.rep[2] && cN.rep[5] < cN.rep[3] && cN.rep[3] < cN.rep[1], `Normal, rep by rep: the first as before (${cN.rep[0]}%, before ${flat.rep[0]}%), each Keep and each Pull harder than the last (${cN.rep.join(' ')}%)`);
}

/* ---------- 8. the README and CHECKS.md say what the table is ---------- */
{
  const fs = await import('node:fs'), read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'), readme = read('README.md'), checks = read('tools/CHECKS.md');
  const list = a => a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const says = [`\`DRILL_TAG.ramp.rep\`: ${list(R.rep)}`, `Easy ${R.diff[0]}, Normal ${R.diff[1]}, Hard ${R.diff[2]}`, `(\`trigger\`, ${KEEP.trigger} m to ${R.keep.trigger} m)`, `(\`track\`, ${KEEP.track} to ${R.keep.track} m/s)`, `(\`read\`, ${KEEP.read} s to ${R.keep.read} s)`,
    `(\`pace\`, ${PULL.pace} to ${R.pull.pace} of your pace)`, `(\`step\`, ${PULL.step} to ${R.pull.step} m/s)`, `(\`reach\`, ${PULL.reach} m to ${R.pull.reach} m)`, `${R.lane} m off the middle (\`ramp.lane\`)`,
    '"Tag chase game is a bit too easy"', 'node tools/tagchase.mjs --balance'];
  const missing = says.filter(t => !readme.includes(t));
  ok(!missing.length, 'README.md\'s Skill Games gives the table as it is, the owner\'s words and the balance run' + (missing.length ? ' (missing: ' + missing.join('; ') + ')' : ''));
  ok(checks.includes('node tools/tagchase.mjs') && checks.includes('--balance'), 'tools/CHECKS.md says what this checks');
}

console.log(`Tag Chase ramp: ${passed} checks passed` + (failed ? `, ${failed} failed` : ''));
process.exit(failed ? 1 : 0);
