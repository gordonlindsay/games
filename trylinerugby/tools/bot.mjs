// Scripted average player v the CPU on each difficulty. The headline check
// after any change to speed, tackling, AI or duels.
// node tools/bot.mjs [matchesPerDifficulty=18] [halfSeconds=240] [--duels live|instant|off] [--arcade]
// HABITS=0 gives the old bot (no Sprint, no offloads, Pass mashed in a tackle); NOSPRINT=1, NOSPRINTBALL=1 and NODIVE=1 turn single habits off.
// --arcade plays Quick Match's rules (On Fire, the Golden Try, and on Easy the edge: src/edge.js); without it a match is a tool's
// balance match, as it always was, and the edge never acts in it.
//
// PROFILE=casual plays a casual adult instead of the scripted bot (below), on Easy, with Quick Match's rules and 2-minute halves,
// each match seeded on its own (SEED, default 7, then its number), split over JOBS processes (default: the cores, at most 8):
//   PROFILE=casual node tools/bot.mjs [matches=120] [halfSeconds=120] [--diff 0]
// PROFILE=bot plays the scripted bot the same way, for a like-for-like line. Each reports wins, the scoreline, tries, Line Breaks a
// match (counted by the rule in src/edge.js, watched from outside, so a build before the edge counts them too; and the game's own
// count where it has one), broken tackles, Fends, On Fire, Side Steps and Dummies.
process.env.PROFILE && (process.env.SEED ??= '7');
const { T, bot, reseed, kickBot, dropBot, scrumBot, lineBot, maulBot } = await import('./harness.mjs');
import { spawn } from 'node:child_process';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && args[i - 1] !== '--arcade'));
const arcade = args.includes('--arcade');
const CONTACT_KEYS = ['tackles', 'broken', 'rucks', 'ruck_quick', 'ruck_normal', 'ruck_slow', 'dom0', 'dom1', 'second', 'turnovers', 'toRuck', 'intercepts', 'offAtt', 'offloads', 'off0', 'off1', 'offHeld', 'long', 'long0', 'long1',
  'fends', 'fend0', 'fend1', 'jolts', 'joltKnock', 'joltLoose', 'ankleTry', 'ankle0', 'trip', 'sprints', 'sprintSecs', 'sprintPick', 'cpuSprints', 'cpuSprintSecs', 'pens', 'knocks', 'ko_catch', 'ko_contact', 'ko_offload', 'wfMen', 'ignored',
  'steps', 'steps0', 'steps1', 'dummies0', 'sold0', 'dummies1', 'sold1'];

/* ---------- the casual adult ----------
   Built from tools/kidbots.mjs's children (kidStep): the same thumb, as numbers, with a grown-up's. He reacts about 0.3s late to a
   change of possession; defends nine tenths of the time (re-decided every 1 to 3s; in a lapse he lets go of the stick, or a third of
   the time keeps pushing at the try line); chases with a little wander, presses Tackle on 12% of the steps a carrier is in reach,
   sprints after a clean break on 40% of them and presses Switch now and then when the ball is far off. With the ball: a light weave,
   a step away from the man in front on half his carries (the other half he runs into contact), Sprint into space on half, a pass
   when a tackler is on him now and then, a Dummy on a fifth of carries, an offload on 30% of the cues. In a close-up he presses 95%
   of the time, about the gold's centre with a 0.12s spread (the scripted bot's 0.095), the right way four times in five. Goal kicks
   and drop goals are the harness's average kicker's; a maul, his taps. */
export const PROFILES = {
  casual:{ name:'casual adult', def:0.9, astray:0.3, react:0.3, wob:0.5, pass:0.002, chip:0.0005, under:0.3, swerve:0.5, sprint:0.5, chase:0.4, off:0.3, dive:0.12, sw:0.02, dummy:0.2,
    duel:{ press:0.95, sd:0.12, flick:0.85, right:0.8 }, scrum:[5, 0.5], line:0.15, maul:5 },
};
const R = () => Math.random();
const gauss = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
function adultDuel(c, P) {
  const inp = T.input, D = P.duel;
  if (!c.adult) { const centre = (c.win[0] + c.win[1])/2; c.adult = { press:R() < D.press, at:centre + gauss()*D.sd, flick:R() < D.flick, right:R() < D.right, done:false }; }
  const b = c.adult;
  if (b.done || !b.press || c.res || c.t < 0.3 || c.t < b.at) return;
  b.done = true;
  if (c.kind === 'past') { if (b.flick) inp.flick = b.right ? c.open : -c.open; else inp.aPressed = true; }
  else if (c.kind === 'pass') { const want = c.drift ? 'dummy' : 'pass', act = b.right ? want : (want === 'pass' ? 'dummy' : 'pass'); if (act === 'dummy') inp.bPressed = true; else inp.aPressed = true; }
  else inp.aPressed = true;
}
export function casualStep(P, S) {
  const M = T.M, inp = T.input, cut = M.phase === 'cut' && M.cut;
  inp.jx = 0; inp.jy = 0;
  if (cut) {
    if (cut.duel) adultDuel(cut, P);
    else if (cut.kind === 'goal') (cut.g.type === 'drop' ? dropBot : kickBot)(cut);
    else if (cut.kind === 'scrum') scrumBot(0, P.scrum[0], P.scrum[1]);
    else if (cut.kind === 'lineout') lineBot(0, P.line);
    else if (cut.kind === 'maul') maulBot(0, P.maul);
    return;
  }
  const c = T.sides.ctrlOf(0), b = M.ball;
  if (!c || M.phase !== 'play') { inp.cDown = false; S.sit = null; S.g = null; return; }
  const sit = b.state === 'held' ? (b.carrier.team === 0 ? 'att' : 'def') : b.state === 'air' && b.f.kind === 'pass' ? (b.f.team === 0 ? 'att' : 'def') : 'loose';
  if (S.sit !== sit) { if (S.sit) S.lag = P.react*(0.6 + 0.8*R()); S.sit = sit; S.g = null; }
  if (S.lag > 0) { S.lag -= T.STEP; inp.jx = S.jx || 0; inp.jy = S.jy || 0; return; }   // his thumb is still doing what it was
  if ((S.wobT -= T.STEP) <= 0) { S.wobT = 0.4 + R()*0.6; S.wob = (R() - 0.5)*P.wob; }
  if ((S.defT -= T.STEP) <= 0) { S.defT = 1 + R()*2; S.def = R() < P.def; S.away = R() < P.astray; S.chase = R() < P.chase; }
  let jx = 0, jy = 0, sprint = false;
  if (b.state === 'held' && b.carrier === c) {
    let near = 99, ny = 0, ahead = 99;
    for (const q of M.players) { if (q.team !== 1 || q.down > 0) continue; const d = Math.hypot(q.x - c.x, q.y - c.y); if (q.x > c.x - 1 && d < near) { near = d; ny = q.y - c.y; } if (q.x > c.x + 0.5) ahead = Math.min(ahead, d); }
    if (S.carry !== c) { S.carry = c; S.swerve = R() < P.swerve; S.sprint = R() < P.sprint; S.dummy = R() < P.dummy; S.g = null; }
    jx = 1; jy = S.wob + (S.swerve && near < 5 ? (ny > 0 ? -0.7 : 0.7) : 0) + (c.y < 6 ? 0.4 : c.y > 64 ? -0.4 : 0);
    const k = M.contact;
    if (k && k.c === c) { if (k.adOff == null) k.adOff = T.contact.canOffload(k) && R() < P.off; if (k.adOff && k.t >= 0.12) { inp.aPressed = true; k.adOff = false; } }
    else {
      if (S.dummy && !S.g && ahead >= 3.5 && ahead <= 7 && T.contact.pickReceiver(c, jy)) { S.dummy = false; S.g = { k:0, L:jy }; }   // the Dummy: the run held, pulled back, pushed on (src/movement.js, gestureStep)
      if (S.g) { const g = S.g, n = g.k++; if (n >= 9) S.g = null; else { jx = n < 3 ? 1 - 1.3*(n + 1)/3 : n < 5 ? -0.3 : -0.3 + 1.3*(n - 4)/4; jy = g.L*0.5; } }
      else if (R() < P.pass || (near < 2.6 && c.hold > 0.4 && R() < P.under)) inp.aPressed = true;
      if (!S.g && R() < P.chip) { inp.bPressed = true; inp.bDown = false; }
      sprint = S.sprint && near > 6 && !S.g;
    }
  } else if (S.def) {
    const t = b.state === 'held' ? b.carrier : null, tx = t ? t.x : b.state === 'air' ? b.f.x1 : b.x, ty = t ? t.y : b.state === 'air' ? b.f.y1 : b.y;
    const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy) || 1;
    if (d > 0.5) { jx = dx/d + (R() - 0.5)*0.3; jy = dy/d + (R() - 0.5)*0.3; }
    if (t && d < 2.4 && R() < P.dive) inp.aPressed = true;
    if (t && S.chase && d > 2.5 && d < 12 && T.contact.ahead(t, 0) === 0) sprint = true;   // run down a clean break
    if (sit !== 'att' && d > 12 && R() < P.sw) inp.bPressed = true;                     // Switch, now and then
  } else if (S.away) { jx = 1; jy = S.wob; }               // still pushing at the try line; otherwise the stick is let go
  const m = Math.hypot(jx, jy);
  if (m > 1) { jx /= m; jy /= m; }
  inp.jx = S.jx = jx; inp.jy = S.jy = jy;
  if (sprint && !inp.cDown) inp.cPressed = true;
  inp.cDown = sprint;
}

/* The Line Break as src/edge.js calls it, watched from outside the game so a build without it counts the same moments: side 0's
   carrier, on his feet and running forward at 2.5 m/s or more, 5m or more out, with no standing defender ahead of him inside a window
   15m across beside him that widens a metre for every metre ahead (so the deep cover man counts while he is placed to come across),
   having had one there earlier in the same carry, and none within 3m of him at all; or a Get Past close-up won the right way, whose
   verdict is Line Break in every build. Once a carry. LB is EDGE.brk's rule, and tools/edge.mjs holds the two together. */
export const LB = { lane:15, cone:1, clear:3, fwd:2.5, line:5 };
export function lbWatch(W) {
  const M = T.M, b = M.ball, k = M.cut;
  if (k && k.duel && k.kind === 'past' && k.out === 'break' && k.own === 0 && W.cut !== k) {   // the close-up's own Line Break: the carry's
    W.cut = k;
    if (W.c !== k.U || W.hold > k.U.hold) { W.c = k.U; W.fired = false; }
    W.hold = k.U.hold; W.had = true;
    if (!W.fired) { W.fired = true; W.n++; }
    return;
  }
  if (M.phase !== 'play' || b.state !== 'held' || b.carrier.team !== 0) return;
  const c = b.carrier;
  if (W.c !== c || W.hold > c.hold) { W.c = c; W.had = false; W.fired = false; }   // a new carry: the carrier changed, or his time on the ball began again
  W.hold = c.hold;
  if (W.fired || c.bind || c.down > 0) return;
  let near = 99;
  for (const q of M.players) {
    if (q.team !== 1 || q.down > 0 || q.bind) continue;
    const ahead = q.x - c.x;
    if (ahead > 0 && Math.abs(q.y - c.y) < LB.lane + LB.cone*ahead) { W.had = true; return; }
    near = Math.min(near, Math.hypot(q.x - c.x, q.y - c.y));
  }
  if (W.had && near >= LB.clear && c.vx >= LB.fwd && 110 - c.x >= LB.line) { W.fired = true; W.n++; }
}

export function profileMatch(who, diff, half, seed, arc) {
  reseed(seed);
  const i = seed % 30, a = i % 6, b = (a + 1 + (i % 5)) % 6, P = PROFILES[who];
  T.newMatch(a, b, { halfLen:half, diff, headless:true, duels:'live', arcade:arc });
  const S = { wobT:0, defT:0, lag:0 }, W = { c:null, n:0, hold:0 };
  let n = 0;
  while (!T.M.over && n < 400000) { if (P) casualStep(P, S); else bot(0); T.update(T.STEP); lbWatch(W); n++; }
  for (const inp of T.inputs) { inp.jx = inp.jy = 0; inp.aPressed = inp.bPressed = inp.cPressed = false; inp.aDown = inp.bDown = inp.cDown = false; inp.flick = 0; }
  const M = T.M, s = M.stats;
  return { score:M.score.slice(), tries:M.tries.slice(), lb:W.n, lbGame:s.lineBreak0 == null ? null : s.lineBreak0, broken:s.broken0 || 0, brokenThem:s.broken1 || 0, fend:s.fend0 || 0, fire:s.fire0 || 0, fireThem:s.fire1 || 0,
    steps:s.steps0 || 0, dum:s.dummies0 || 0, sold:s.sold0 || 0, gain:s.gain[0], done:M.over };
}

const self = fileURLToPath(import.meta.url), run = !!process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;   // run, not imported (an analysis can import the casual adult)
if (run && args[0] === '--job') { const o = JSON.parse(args[1]); const out = []; for (let i = o.lo; i < o.hi; i++) out.push(profileMatch(o.who, o.diff, o.half, +process.env.SEED*100000 + i, o.arcade)); process.stdout.write(JSON.stringify(out)); process.exit(0); }
function fan(jobs, n, spec) {                              // the matches 0..n-1 over `jobs` processes, in order
  const per = Math.ceil(n/jobs), parts = [];
  for (let lo = 0; lo < n; lo += per) parts.push(spec(lo, Math.min(n, lo + per)));
  return Promise.all(parts.map(o => new Promise((ok, bad) => {
    const p = spawn(process.execPath, [self, '--job', JSON.stringify(o)], { env:process.env, stdio:['ignore', 'pipe', 'inherit'] });
    let s = ''; p.stdout.on('data', d => { s += d; }); p.on('close', code => (code ? bad(new Error('job failed')) : ok(JSON.parse(s))));
  }))).then(r => r.flat());
}
function report(label, res) {
  const n = res.length, f = k => res.reduce((a, m) => a + k(m), 0)/n, pc = v => (100*v).toFixed(0);
  const w = res.filter(m => m.score[0] > m.score[1]).length, l = res.filter(m => m.score[0] < m.score[1]).length;
  const mg = res.map(m => m.tries[0] - m.tries[1]), mm = mg.reduce((a, b) => a + b, 0)/n, sd = Math.sqrt(mg.reduce((a, x) => a + (x - mm)**2, 0)/Math.max(1, n - 1));
  const seW = Math.sqrt((w/n)*(1 - w/n)/n), game = res[0].lbGame == null ? '' : ` (the game's own ${f(m => m.lbGame).toFixed(2)})`;
  console.log(`${label.padEnd(30)} won ${pc(w/n)} ± ${pc(seW)}% (W${w} D${n - w - l} L${l})  ${f(m => m.score[0]).toFixed(1)}-${f(m => m.score[1]).toFixed(1)}  tries ${f(m => m.tries[0]).toFixed(2)}-${f(m => m.tries[1]).toFixed(2)}  margin ${mm.toFixed(2)} ± ${(sd/Math.sqrt(n)).toFixed(2)}`);
  console.log(`${''.padEnd(30)} Line Breaks ${f(m => m.lb).toFixed(2)}${game}  broken tackles ${f(m => m.broken).toFixed(2)} (theirs ${f(m => m.brokenThem).toFixed(2)})  Fends ${f(m => m.fend).toFixed(2)}  On Fire ${f(m => m.fire).toFixed(2)} (theirs ${f(m => m.fireThem).toFixed(2)})  Side Steps ${f(m => m.steps).toFixed(2)}  Dummies ${f(m => m.dum).toFixed(2)} sold ${f(m => m.sold).toFixed(2)}  metres ${f(m => m.gain).toFixed(0)}  n=${n}`);
}

if (!run) { /* imported: the profiles and the watcher only */ }
else if (process.env.PROFILE) {
  const who = process.env.PROFILE;
  if (who !== 'bot' && !PROFILES[who]) { console.error(`PROFILE is ${Object.keys(PROFILES).join(' or ')}, or bot`); process.exit(2); }
  const n = +pos[0] || 120, half = +pos[1] || 120, diffs = flag('--diff', '0').split(',').map(Number), jobs = +process.env.JOBS || Math.min(8, os.cpus().length);
  for (const diff of diffs) {
    const res = await fan(jobs, n, (lo, hi) => ({ who, diff, half, arcade:true, lo, hi }));
    report(`${who === 'bot' ? 'scripted bot' : PROFILES[who].name} on ${['Easy', 'Normal', 'Hard'][diff]}`, res);
  }
} else {
const n = +pos[0] || 18, half = +pos[1] || 240, duels = flag('--duels', 'live');
for (const diff of [0, 1, 2]) {
  let us = 0, them = 0, tu = 0, tt = 0, w = 0, d = 0, l = 0, du = 0, dw = 0, dp = 0, frozen = 0;
  const gk = { att: [0, 0], made: [0, 0] };
  const kinds = { past: 0, pass: 0, tackle: 0, block: 0 };
  const S = {}; for (const k of CONTACT_KEYS) S[k] = 0;
  const tags = {};
  for (let i = 0; i < n; i++) {
    const a = i % 6, b = (a + 1 + (i % 5)) % 6;
    T.newMatch(a, b, { halfLen: half, diff, headless: true, duels, ...(arcade ? { arcade: true } : {}) });
    let steps = 0;
    while (!T.M.over && steps < 500000) { bot(); T.update(T.STEP); steps++; if (T.M.phase === 'cut' && T.M.cut && T.M.cut.duel) frozen += T.STEP; }
    const M = T.M;
    us += M.score[0]; them += M.score[1]; tu += M.tries[0]; tt += M.tries[1];
    if (M.score[0] > M.score[1]) w++; else if (M.score[0] < M.score[1]) l++; else d++;
    du += M.stats.duels; dw += M.stats.duelsWon; dp += M.stats.duelsPerfect;
    for (const t of [0, 1]) { gk.att[t] += M.stats.gk.att[t]; gk.made[t] += M.stats.gk.made[t]; }
    for (const k of Object.keys(kinds)) kinds[k] += M.stats['d_' + k] || 0;
    for (const k of CONTACT_KEYS) S[k] += M.stats[k] || 0;
    for (const [k, v] of Object.entries(M.stats)) if (k.startsWith('tag_')) tags[k.slice(4)] = (tags[k.slice(4)] || 0) + v;
  }
  const name = ['Easy', 'Normal', 'Hard'][diff];
  const pct = t => gk.att[t] ? Math.round(100 * gk.made[t] / gk.att[t]) : 0;
  let line = `${name.padEnd(6)}  avg ${(us / n).toFixed(1)}-${(them / n).toFixed(1)}  tries ${(tu / n).toFixed(1)}-${(tt / n).toFixed(1)}  W${w} D${d} L${l}  kicks us ${pct(0)}% (${gk.att[0]}) them ${pct(1)}% (${gk.att[1]})`;
  if (duels !== 'off') line += `  | duels ${(du / n).toFixed(2)}/match (${Object.entries(kinds).map(([k, v]) => k + ' ' + (v / n).toFixed(2)).join(', ')}) won ${du ? Math.round(100 * dw / du) : 0}% perfect ${du ? Math.round(100 * dp / du) : 0}% frozen ${(frozen / n).toFixed(1)}s`;
  console.log(line);
  const f = v => (v / n).toFixed(1), f2 = v => (v / n).toFixed(2);
  if (T.contact) {
    console.log(`  contact: tackles ${f(S.tackles)} broken ${f(S.broken)} rucks ${f(S.rucks)} (quick ${f(S.ruck_quick)} normal ${f(S.ruck_normal)} slow ${f(S.ruck_slow)}) big hits us ${f2(S.dom0)} them ${f2(S.dom1)} second man ${f(S.second)}`);
    console.log(`  turnovers ${f2(S.turnovers)} (ruck ${f2(S.toRuck)}, loose ${f2(S.turnovers - S.toRuck)}) intercepts ${f2(S.intercepts)}  offloads us ${f2(S.off0)} them ${f2(S.off1)} of ${f2(S.offAtt)} (held ${f2(S.offHeld)})  fends us ${f2(S.fend0)} them ${f2(S.fend1)}  jolts ${f2(S.jolts)} (knock ${f2(S.joltKnock)} loose ${f2(S.joltLoose)})  ankle taps ${f2(S.ankle0)} of ${f2(S.ankleTry)} tripped ${f2(S.trip)}`);
    console.log(`  sprints us ${f2(S.sprints)} (${f(S.sprintSecs)}s, ring moved ${f2(S.sprintPick)}) cpu ${f2(S.cpuSprints)} (${f(S.cpuSprintSecs)}s)  pens ${f2(S.pens)}  knock-ons ${f2(S.knocks)} (catch ${f2(S.ko_catch)} contact ${f2(S.ko_contact)} offload ${f2(S.ko_offload)})  long passes us ${f2(S.long0)} them ${f2(S.long1)}  wrong-footed men ${f(S.wfMen)}  tackle presses ignored ${f2(S.ignored)}`);
    console.log(`  side steps us ${f2(S.steps0)} them ${f2(S.steps1)}  dummies us ${f2(S.dummies0)} (sold ${f2(S.sold0)}) them ${f2(S.dummies1)} (sold ${f2(S.sold1)})`);
    const tg = Object.entries(tags).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${f2(v)}`).join(', ');
    if (tg) console.log(`  tags/match: ${tg}`);
  }
}
}
