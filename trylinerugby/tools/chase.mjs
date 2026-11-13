// The kick chase (src/chase.js; README.md, Kicking and the chase): the gate (an open-play kick by either side, never a restart, a
// drop goal or a charge-down), the chasers (the kicking side's men onside at the kick, the human's ringed man among them only when
// he is onside), the pace and its easing and end, the catching side's late start (as it ships, react 0, pace alone: idle, and a build
// without it plays the same; kept and tunable, for the men the computer runs and never for a person's own input), no new draw, CHASE
// off playing exactly as b4a25d5, the build before, draw for draw, and the measured win-back rates in bands.
// node tools/chase.mjs              (SEED=29 unless set; VERBOSE=1 lists every check)
// node tools/chase.mjs --pins       prints this build's fingerprints with CHASE off; GAME=<b4a25d5>/index.html node tools/chase.mjs --pins pinned BASE
// node tools/chase.mjs --pins on    the same with the chase as it ships (CHASE='{"react":0.2}' tries a lever; CHASE_LATE=off cuts the late start)
// node tools/chase.mjs --balance [staged|ai|casual|chaser|all]   README.md's before-and-after tables: staged kicks from set spots, AI
//                                   v AI, the casual adult and the kick-chaser on Easy, each kick sorted by its kind and how it ended,
//                                   CHASE off then on (minutes; never in check.mjs; JOBS, CH_STAGED, CH_AI, CH_CASUAL, CH_CHASER for
//                                   the counts, CH_DIFF=1 for the casual adult and the kick-chaser on Normal; CHASE='{"pace":1.1}' measures
//                                   other levers as after)
// node tools/chase.mjs --balance band   the owner's target as a check: the casual adult's chips on Normal won back more often, and by at
//                                   most 20 points, CHASE off then on (CH_BAND matches, 400 unless set; SEED 7 unless set; minutes, so
//                                   never in check.mjs; exits 1 outside the band)
process.env.SEED ??= process.argv.includes('--balance') ? '7' : '29';   // the balance tables: tools/bot.mjs's PROFILE seed
import { spawn } from 'node:child_process';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { T, reseed, rndCalls, bot } = await import('./harness.mjs');
const STEP = T.STEP, M = () => T.M, X = T.teams, CH = T.chase;
const args = process.argv.slice(2);
let passed = 0, failed = 0, group = '';
const ok = (cond, msg) => { if (cond) passed++; else failed++; if (!cond || process.env.VERBOSE) console.log(cond ? 'ok  ' : 'FAIL', group + ':', msg); };
const begin = name => { group = name; }, done = name => console.log(`${name.padEnd(34)} ${failed ? 'FAIL so far ' + failed : 'ok'} (${passed} passed)`);
const json = v => JSON.stringify(v), near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
const dirOf = t => (t === 0 ? 1 : -1);

/* ---------- the watch: every open-play kick of a match, its kind and how it ended ----------
   Watched from outside the game after each step, so a build before the chase (b4a25d5) counts the same moments the same way and
   nothing in the game moves for it. A kick is an open-play kick in the air (kickBall's kind 'kick'): a chip under 20m wherever it
   is struck, a clearance (20m or more from inside the kicker's own 22, as ball.js reads own22) or a long kick (any other). It ends
   the first step the ball is held (won back if by the kicking side, lost if by the other; caught if it never touched the ground,
   gathered if it did), grounded for a try (won back), or dead (touch, a knock-on, dead ball, a drop goal through the posts). A lost
   kick is run back when the catching side, in the possession that took it (its carries, passes and rucks), carries it RUN metres or
   more past where the kick was aimed to come down. A try is put down to the latest kick within 20 match seconds before it: the
   kicking side's (after) or the other side's (against). */
export const KINDS = ['chip', 'long', 'clear'];
export const KIND_NAMES = { chip:'Chip (under 20m)', long:'Long kick', clear:'Clearance (own 22)' };
export const RUN = 10, TRY_SECS = 20;
export function kickWatch() {
  const W = { kicks:[], open:null, seen:null, run:null, last:null, tries:null };
  W.step = () => {
    const m = M(), b = m.ball, tries = m.tries.slice(), was = W.tries || tries;
    W.tries = tries;
    const k = W.open;
    if (k) {                                               // the kick in play: how it ends
      if (b.state === 'loose') k.landed = true;
      if (tries[k.team] > was[k.team]) end(k, 'won', 'try');
      else if (b.state === 'held' && b.carrier) end(k, b.carrier.team === k.team ? 'won' : 'lost', k.landed ? 'gathered' : 'caught');
      else if (m.phase !== 'play' && m.phase !== 'cut') end(k, 'dead', m.set ? m.set.kind : m.phase);
      else if (m.dclock - k.at > 30) end(k, 'dead', 'long');
    }
    const r = W.run;                                       // a lost kick: how far the catching side carries it back
    if (r) {
      const t = r.team, mine = (b.state === 'held' && b.carrier && b.carrier.team === t) || (b.state === 'air' && b.f && b.f.kind === 'pass' && b.f.team === t)
        || (m.phase === 'set' && m.set && m.set.kind === 'ruck' && m.set.team === t) || m.phase === 'cut';
      if (mine && m.dclock - r.k.at <= 60) r.k.back = Math.max(r.k.back, (b.x - r.k.x1)*dirOf(t)); else W.run = null;
    }
    for (const t of [0, 1]) if (tries[t] > was[t] && W.last && m.dclock - W.last.at <= TRY_SECS) { if (t === W.last.team) W.last.tryFor++; else W.last.tryAgainst++; }
    if (b.state === 'air' && b.f && b.f.kind === 'kick' && W.seen !== b.f) {   // a new kick
      const f = b.f, len = Math.hypot(f.x1 - f.x0, f.y1 - f.y0), own22 = f.team === 0 ? f.x0 <= 32 : f.x0 >= 88;
      if (W.open) end(W.open, 'dead', 'kick');
      W.seen = f;
      W.open = W.last = { team:f.team, kind:len < 20 ? 'chip' : own22 ? 'clear' : 'long', len, x0:f.x0, x1:f.x1, y1:f.y1, at:m.dclock, landed:false, res:null, how:null, back:-99, tryFor:0, tryAgainst:0 };
      W.kicks.push(W.open);
    }
  };
  function end(k, res, how) {
    k.res = res; k.how = how; W.open = null;
    if (res === 'lost') { W.run = { team:1 - k.team, k }; k.back = (M().ball.x - k.x1)*dirOf(1 - k.team); }
  }
  W.list = () => W.kicks.map(k => ({ team:k.team, kind:k.kind, res:k.res || 'dead', how:k.how || 'open', back:k.back, tryFor:k.tryFor, tryAgainst:k.tryAgainst, len:+k.len.toFixed(2) }));
  return W;
}

/* ---------- staged kicks from set spots ----------
   Two even sides (3 in every ability), AI v AI on Normal; the kicker has the ball in open play at a set spot.
   - A chip is the chip and chase over the last man: the kicker 45m out, through the line and running at 5 to 7 m/s, the other side's
     sweeper 8 to 12m ahead of him coming up, its six beaten men 1 to 10m behind or beside him turning to chase (4 to 7 m/s), his six
     teammates on the game's support shelf behind him (supportSlots: 2.6m back and 1.3m more for each 6.5m out) at 4 to 7 m/s. The
     kick is doKick at 0.02 to 0.12 of full power (a tap is about 0.02) and up to 0.3 either way: 11 to 15m, as a person's are, so it
     comes down 0 to 6m behind the sweeper.
   - A long kick (aiKick's territory kick, from the kicker's own 40) and a clearance (its clear, from 12m out) are struck into a set
     defence: the kicker's teammates on the same shelf, the other side where the game itself sends it against a carrier there
     (matchTargets: its line on the marks, its sweeper 18m back, its chasers coming at him at 3 to 6 m/s from 2.2 to 4m, just outside
     a charge-down's reach).
   The staging's jitter comes from its own numbers, never the game's stream, so CHASE off and on start every seed from exactly the
   same place. */
const even = id => ({ id, name:id, kit:id === 'AAA' ? '#1d3a8f' : '#b3261e', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:3, stamina:3 });
let rs = 1;
const r01 = () => { rs = rs + 0x6D2B79F5 | 0; let t = Math.imul(rs ^ rs >>> 15, 1 | rs); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; };
const jit = (a, b) => a + (b - a)*r01();
export function stage(kind, team, seed, o = {}) {
  rs = (seed*2654435761) ^ 0x5bd1e995;
  reseed(seed);
  T.newMatch(even('AAA'), even('BBB'), { halfLen:900, diff:1, auto:true, headless:true, ...(o.match || {}) });
  const m = M(), b = m.ball, d = dirOf(team), own = team === 0 ? 10 : 110, clamp = (v, a, z) => Math.max(a, Math.min(z, v));
  m.phase = 'play'; m.set = null; m.cut = null; m.contact = null; m.hooter = false; m.clock = 60; m.dclock = 60;
  for (const p of m.players) Object.assign(p, { down:0, bind:null, vx:0, vy:0, offside:0, tcd:0, sprint:0, sprinting:false, boost:0, stumble:0, wf:0, bite:0, biteTo:null, hold:1, think:5, fromKick:false, drop:null, side:-1 });
  const from = kind === 'chip' ? 55 : kind === 'long' ? 40 : 12, fx = own + d*from, fy = kind === 'clear' ? jit(14, 56) : jit(22, 48);
  const A = m.players.filter(p => p.team === team), D = m.players.filter(p => p.team !== team), kicker = A[3];
  const put = (p, x, y, vx, vy) => { p.x = clamp(x, 1, 119); p.y = clamp(y, 2, 68); p.vx = vx; p.vy = vy; p.fx = vx ? Math.sign(vx) : dirOf(p.team); p.fy = 0; };
  const chip = kind === 'chip';
  put(kicker, fx, fy, d*(chip ? jit(5, 7) : jit(1, 3)), 0);
  const ks = [1, -1, 2, -2, 3, -3];
  A.filter(p => p !== kicker).forEach((p, i) => { const k = ks[i]; put(p, fx - d*(2.6 + 1.3*Math.abs(k) + jit(-0.8, 0.8)), fy + k*6.5 + jit(-1, 1), d*(chip ? jit(4, 7) : jit(2, 5)), 0); });
  b.state = 'held'; b.carrier = kicker; b.f = null; b.last = team; b.kickInfo = null; b.x = kicker.x + d*0.55; b.y = kicker.y; b.z = 1;
  if (chip) {                                              // through the line: the sweeper ahead, the rest beaten and turning
    put(D[0], fx + d*jit(8, 12), fy + jit(-4, 4), -d*jit(1, 3), 0);
    const ls = [1, -1, 2, -2, 3, -3];
    D.slice(1).forEach((p, i) => { const back = jit(-1, 10), y = fy + ls[i]*jit(2.5, 5); put(p, fx - d*back, y, d*jit(4, 7), 0); });
  } else {
    const ls = [0, 1, -1, 2, -2, 3, -3];
    D.forEach((p, i) => put(p, fx + d*jit(5, 7), fy + ls[i]*7 + jit(-1, 1), 0, 0));   // a rough line first: the game's shape below settles it
    for (let i = 0; i < 2; i++) {                          // the other side where the game sends it against him (its sweeper is the man nearest that spot, so twice)
      const tg = CH.matchTargets();
      for (const p of D) {
        const t = tg.get(p);
        if (t && t.pursue) put(p, kicker.x + d*jit(2.2, 4), kicker.y + jit(-2, 2), -d*jit(3, 6), 0);
        else if (t) put(p, t.x + jit(-1, 1), t.y + jit(-1, 1), -d*jit(0, 2), 0);
      }
    }
  }
  m.poss = team; m.phaseCount = 3;
  if (o.before) o.before(m, kicker);
  if (o.noKick) return { kicker, draws:0 };
  const r0 = rndCalls();
  if (kind === 'chip') CH.doKick(kicker, jit(0.02, 0.12), jit(-0.3, 0.3));
  else CH.aiKick(kicker, kind === 'long' ? 'territory' : 'clear');
  return { kicker, draws:rndCalls() - r0 };
}
export function stagedKick(kind, team, seed, o = {}) {     // a staged kick played out to its end: the watch's record of it
  const W = kickWatch();
  stage(kind, team, seed, o);
  W.step();
  const t0 = M().dclock, more = () => W.open || (o.tries && M().dclock - t0 <= TRY_SECS) || (o.back !== false && W.run);   // o.tries: on to 20s after it, for the tries
  let n = 0; while (n < 60*40 && more() && !M().over) { if (o.each) o.each(n); T.update(STEP); W.step(); n++; }
  const k = W.list()[0];
  return k ? { ...k, steps:n } : null;
}

/* ---------- the matches the tables are made of ---------- */
async function oneMatch(o, seed) {
  const W = kickWatch();
  let res;
  if (o.kind === 'staged') {
    const out = [];
    for (const team of [0, 1]) out.push(stagedKick(o.what, team, seed*2 + team, { tries:true }));
    return { kicks:out.filter(Boolean) };
  }
  if (o.kind === 'ai') {                                   // AI v AI as T.simulate pairs the six nations
    reseed(seed); const i = seed % 30, a = i % 6, b = (i + 1 + (i % 5)) % 6 === a ? (a + 1) % 6 : (i + 1 + (i % 5)) % 6;
    T.newMatch(a, b, { halfLen:o.half, diff:o.diff, auto:true, headless:true });
    let n = 0; while (!M().over && n < 400000) { T.update(STEP); W.step(); n++; }
  } else {                                                 // the casual adult or the kick-chaser as played (Quick Match's rules), as tools/bot.mjs's PROFILE runs
    const { PROFILES, casualStep } = await import('./bot.mjs');
    const P = o.kind === 'chaser' ? CHASER(PROFILES.casual) : PROFILES.casual;
    reseed(seed);
    const i = seed % 30, a = i % 6, b = (a + 1 + (i % 5)) % 6;
    T.newMatch(a, b, { halfLen:o.half, diff:o.diff, headless:true, duels:'live', arcade:true });
    const S = { wobT:0, defT:0, lag:0 };
    let n = 0; while (!M().over && n < 400000) { casualStep(P, S); T.update(STEP); W.step(); n++; }
    for (const inp of T.inputs) { inp.jx = inp.jy = 0; inp.aPressed = inp.bPressed = inp.cPressed = false; inp.aDown = inp.bDown = inp.cDown = false; inp.flick = 0; }
  }
  res = { score:M().score.slice(), tries:M().tries.slice(), kicks:W.list() };
  return res;
}
// the kick-chaser: the casual adult (tools/bot.mjs) who chips ten times as often. He chases his own chip as the casual adult chases any
// kick: the ring jumps to his man nearest where it will come down (kickBall), and after his 0.3s or so he runs that man at it
export const CHASER = P => ({ ...P, name:'kick-chaser', chip:0.005 });
const self = fileURLToPath(import.meta.url), run = !!process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (run && args[0] === '--job') {
  const o = JSON.parse(args[1]), out = [];
  for (let i = o.lo; i < o.hi; i++) out.push(await oneMatch(o, +process.env.SEED*100000 + i));
  process.stdout.write(json(out)); process.exit(0);
}
function fan(spec, n, env) {                               // matches 0..n-1 over JOBS processes, in order, with env on top (CHASE off, say)
  const jobs = +process.env.JOBS || Math.min(8, os.cpus().length), per = Math.ceil(n/jobs), parts = [];
  for (let lo = 0; lo < n; lo += per) parts.push({ ...spec, lo, hi:Math.min(n, lo + per) });
  return Promise.all(parts.map(o => new Promise((good, bad) => {
    const p = spawn(process.execPath, [self, '--job', json(o)], { env:{ ...process.env, ...env }, stdio:['ignore', 'pipe', 'inherit'] });
    let s = ''; p.stdout.on('data', d => { s += d; }); p.on('close', code => (code ? bad(new Error('job failed')) : good(JSON.parse(s))));
  }))).then(r => r.flat());
}
const OFF = { CHASE:'{"on":false}' };
/* the sums for a list of kicks: won back (caught, gathered), lost (caught, gathered, run back), dead, tries after and against */
export function sums(kicks) {
  const s = { n:kicks.length, won:0, wonCaught:0, wonGathered:0, wonTry:0, lost:0, lostCaught:0, lostGathered:0, back:0, dead:0, touch:0, tryFor:0, tryAgainst:0 };
  for (const k of kicks) {
    if (k.res === 'won') { s.won++; if (k.how === 'caught') s.wonCaught++; else if (k.how === 'try') s.wonTry++; else s.wonGathered++; }
    else if (k.res === 'lost') { s.lost++; if (k.how === 'caught') s.lostCaught++; else s.lostGathered++; if (k.back >= RUN) s.back++; }
    else { s.dead++; if (k.how === 'lineout') s.touch++; }
    s.tryFor += k.tryFor; s.tryAgainst += k.tryAgainst;
  }
  return s;
}
const pc = (a, n) => (n ? (100*a/n).toFixed(0) + '%' : '-');
const se = (a, n) => (n ? (100*Math.sqrt((a/n)*(1 - a/n)/n)).toFixed(0) : '-');
function table(label, B, A, by) {                          // B, A: kick lists before (CHASE off) and after; by: the rows (a kind, or a side)
  console.log(`\n${label}`);
  console.log(`| Kicks | n | Won back (caught, gathered) | Lost (run back ${RUN}m+) | Dead (touch) | Tries after, against (${TRY_SECS}s) |`);
  console.log('|---|---|---|---|---|---|');
  for (const [name, f] of by) for (const [when, L] of [['before', B], ['after', A]]) {
    const s = sums(L.filter(f));
    console.log(`| ${name}, ${when} | ${s.n} | ${pc(s.won, s.n)} ± ${se(s.won, s.n)} (${pc(s.wonCaught, s.n)}, ${pc(s.wonGathered + s.wonTry, s.n)}) | ${pc(s.lost, s.n)} (${pc(s.back, s.n)}) | ${pc(s.dead, s.n)} (${pc(s.touch, s.n)}) | ${s.tryFor}, ${s.tryAgainst} |`);
  }
}
function results(label, B, A, sides) {                     // the matches: won, score, tries, kicks a match
  const n = B.length, won = res => res.filter(m => m.score[0] > m.score[1]).length/res.length, mean = (res, f) => res.reduce((a, m) => a + f(m), 0)/res.length;
  const line = (res, when) => `| ${when} | ${(100*won(res)).toFixed(0)} ± ${(100*Math.sqrt(won(res)*(1 - won(res))/n)).toFixed(0)}% | ${mean(res, m => m.score[0]).toFixed(1)}-${mean(res, m => m.score[1]).toFixed(1)} | ${mean(res, m => m.tries[0]).toFixed(2)}-${mean(res, m => m.tries[1]).toFixed(2)} | ${mean(res, m => m.kicks.filter(k => k.team === 0).length).toFixed(2)}-${mean(res, m => m.kicks.filter(k => k.team === 1).length).toFixed(2)} |`;
  console.log(`\n${label}: ${n} seeded matches (SEED ${process.env.SEED}), ${sides[0]} first`);
  console.log(`| | ${sides[0]} won | Score | Tries | Open-play kicks |`);
  console.log('|---|---|---|---|---|');
  console.log(line(B, 'Before')); console.log(line(A, 'After'));
}
async function balance() {
  const what = args[1] || 'all';
  const N = { staged:+process.env.CH_STAGED || 240, ai:+process.env.CH_AI || 120, casual:+process.env.CH_CASUAL || 100, chaser:+process.env.CH_CHASER || 100 };
  const kinds = KINDS.map(k => [KIND_NAMES[k], q => q.kind === k]);
  if (what === 'staged' || what === 'all') for (const kind of KINDS) {
    const spec = { kind:'staged', what:kind }, B = (await fan(spec, N.staged, OFF)).flatMap(m => m.kicks), A = (await fan(spec, N.staged, {})).flatMap(m => m.kicks);
    table(`Staged ${KIND_NAMES[kind].toLowerCase()}: ${N.staged} seeds a side (SEED ${process.env.SEED}), both sides kicking, CHASE off (b4a25d5) then on`, B, A, [['Home kicks', q => q.team === 0], ['Away kicks', q => q.team === 1], ['Both', () => true]]);
  }
  const rows = [];
  if (what === 'ai' || what === 'all') rows.push({ label:'AI v AI, Normal, 4-minute halves', spec:{ kind:'ai', diff:1, half:240 }, n:N.ai, sides:['Home', 'Away'] });
  const dl = +(process.env.CH_DIFF || 0), dn = ['Easy', 'Normal', 'Hard'][dl];   // CH_DIFF=1: the casual adult and the kick-chaser on Normal
  if (what === 'casual' || what === 'all') rows.push({ label:`Casual adult v CPU as played, ${dn}, 2-minute halves`, spec:{ kind:'casual', diff:dl, half:120 }, n:N.casual, sides:['You', 'CPU'] });
  if (what === 'chaser' || what === 'all') rows.push({ label:`Kick-chaser v CPU as played, ${dn}, 2-minute halves`, spec:{ kind:'chaser', diff:dl, half:120 }, n:N.chaser, sides:['You', 'CPU'] });
  for (const row of rows) {
    const B = await fan(row.spec, row.n, OFF), A = await fan(row.spec, row.n, {});
    const kb = B.flatMap(m => m.kicks), ka = A.flatMap(m => m.kicks);
    table(`${row.label}: every open-play kick of ${row.n} seeded matches (SEED ${process.env.SEED}), CHASE off (b4a25d5) then on`, kb, ka, [...kinds, [`${row.sides[0]}'s kicks`, q => q.team === 0], [`${row.sides[1]}'s kicks`, q => q.team === 1], ['All', () => true]]);
    results(row.label, B, A, row.sides);
  }
}
/* the owner's target as a check (2026-11-13: pace alone, a person's chips won back about 11 to 16 points more, no walkover). The casual
   adult (tools/bot.mjs's PROFILE=casual) against the CPU on Normal as played, CH_BAND seeded matches (400 unless set, at least 300 of his
   chips a run), CHASE off then on: his chips must be won back more often with the chase, and by at most 20 points more */
async function band() {
  const n = +process.env.CH_BAND || 400, spec = { kind:'casual', diff:1, half:120 }, chips = L => sums(L.flatMap(m => m.kicks).filter(k => k.team === 0 && k.kind === 'chip'));
  const B = chips(await fan(spec, n, OFF)), A = chips(await fan(spec, n, {}));
  const b = 100*B.won/B.n, a = 100*A.won/A.n, gain = a - b, good = B.n >= 300 && A.n >= 300 && gain > 0 && gain <= 20;
  console.log(`${good ? 'ok  ' : 'FAIL'} band: the casual adult's chips on Normal, ${n} seeded matches (SEED ${process.env.SEED}), CHASE off then on: won back ${b.toFixed(1)}% to ${a.toFixed(1)}% (${B.won} of ${B.n}, ${A.won} of ${A.n}; at least 300 a run), ${gain < 0 ? '' : '+'}${gain.toFixed(1)} points (the band: above 0, at most 20)`);
  return good;
}
if (run && args[0] === '--balance' && args[1] === 'band') process.exit(await band() ? 0 : 1);
if (run && args[0] === '--balance') { await balance(); process.exit(0); }
if (!run) { /* imported: the watch and the staging only */ }

/* ---------- the checks ---------- */
const CT = CH ? CH.CHASE : {}, C0 = { ...CT }, setC = o => Object.assign(CT, C0, o), reset = () => Object.assign(CT, C0);

/* 0. CHASE off is b4a25d5, draw for draw: AI v AI, the demo, a tool's balance match (the bot, no arcade), the bot's arcade Quick
   Match on Easy, Normal and Hard, a Kids match at its ceiling and Two Player, with their random draws. The harness's bot never
   kicks, so a match it plays moves only where the CPU kicks. BASE: GAME=<b4a25d5>/index.html node tools/chase.mjs --pins */
const BASE = 'd0efoc 1fq8pyd as6lyd 1cc96uv hcpa8a 8r239s 1sd5i3k 15ar9nd pwk786';   // GAME=<b4a25d5>/index.html node tools/chase.mjs --pins (2026-11-13), and this build with CHASE off
const ON = '8iyx7a pemluk 1ah3zah 1cc96uv 1phqv xgmaru 1sd5i3k 15ar9nd l3cni7';       // the same with the chase as it ships, pace alone (react 0, the owner's choice, 2026-11-13): re-pin only from a change to the chase, on purpose
const ON_REACT = '1707leb fsophx 7ww4dr 1cc96uv j9umex 1c7w2p5 1sd5i3k 15ar9nd b35tqu';   // CHASE='{"react":0.2}': 98e11c8's ON, the late start it shipped with, the proof that the path is kept and still tunable
const play = (seed, a, b, o, two) => { reseed(seed); T.newMatch(a, b, { halfLen:120, headless:true, humans:two ? [true, true] : [true, false], ...o }); let n = 0; while (!M().over && n < 200000) { bot(0); if (two) bot(1); T.update(STEP); n++; } return json([M().score, M().tries, M().stats, n]); };
function pins() {
  const out = [], r0 = rndCalls();
  reseed(91); out.push(json(T.simulate(2, 240, 1).map(r => [r.teams, r.score, r.tries, r.stats, r.steps])));
  reseed(92); T.newMatch(X.NATIONS[2], X.NATIONS[1], { halfLen:1e9, diff:1, auto:true, demo:true });
  for (let i = 0; i < 30000; i++) T.update(STEP);
  out.push(json([M().score, M().stats, M().players.map(p => [p.x.toFixed(5), p.y.toFixed(5)])]));
  out.push(play(93, X.CLUBS[0], X.CLUBS[1], { diff:1, duels:'live' }));
  out.push(play(94, X.NATIONS[0], X.NATIONS[3], { diff:0, duels:'live', arcade:true }));
  out.push(play(95, X.NATIONS[1], X.NATIONS[4], { diff:1, duels:'live', arcade:true }));
  out.push(play(96, X.NATIONS[5], X.NATIONS[2], { diff:2, duels:'live', arcade:true }));
  out.push(play(97, X.CLUBS[0], X.CLUBS[11], { diff:0, duels:'live', arcade:true, kids:true, kidsR:1 }));
  out.push(play(98, X.CLUBS[0], X.CLUBS[11], { duels:'off', arcade:true, levels:[1, 1] }, true));
  out.push(String(rndCalls() - r0));
  return out.map(fnv).join(' ');
}
if (run && args[0] === '--pins') { if (CH && args[1] !== 'on') CH.CHASE.on = false; console.log(pins()); process.exit(0); }
if (run && !args.length) {
begin('0 CHASE off is b4a25d5');
{
  // the late start at react 0 is a no-op: a build with its line cut (CHASE_LATE=off in the harness) as the chase ships, and at react 0.2;
  // each a --pins on run of its own, beside the three here (a pins run reads nothing the run before it leaves: --pins on gives ON too)
  const child = env => new Promise(good => {
    const p = spawn(process.execPath, [self, '--pins', 'on'], { env:{ ...process.env, ...env }, stdio:['ignore', 'pipe', 'pipe'] });
    let s = '', e = ''; p.stdout.on('data', d => { s += d; }); p.stderr.on('data', d => { e += d; });
    p.on('close', code => good(code ? 'failed: ' + e.trim().split('\n').pop() : s.trim()));
  });
  const cut = Promise.all([child({ CHASE_LATE:'off' }), child({ CHASE_LATE:'off', CHASE:'{"react":0.2}' })]);
  setC({ on:false }); const off = pins(); reset(); const on = pins(); setC({ react:0.2 }); const react = pins(); reset();
  ok(off === BASE, `CHASE off: AI v AI, the demo, a tool's match, Easy, Normal and Hard as played, Kids at its ceiling and Two Player play as b4a25d5, with the same draws (${off}, pinned ${BASE})`);
  const moved = on.split(' ').filter((h, i) => h !== BASE.split(' ')[i]).length;
  ok(on.split(' ')[0] !== BASE.split(' ')[0] && on.split(' ')[1] !== BASE.split(' ')[1] && moved >= 4, `CHASE on moves AI v AI, the demo and the matches where a kick fell (${moved} of 9 moved: ${on})`);
  ok(on === ON, `and plays them as pinned with the chase as it ships, pace alone (${on}, pinned ${ON})`);
  const [cut0, cut2] = await cut;
  ok(CT.react === 0 && cut0 === on, `react 0: a build without the catching side's late start (CHASE_LATE=off, matchTargets' chaseLate line cut) plays all nine exactly as the chase ships, with the same draws (${cut0})`);
  ok(react === ON_REACT, `the late start is kept and tunable: CHASE.react 0.2 plays them as 98e11c8 shipped it (${react}, pinned ${ON_REACT})`);
  ok(cut2 === on && cut2 !== react, `and cut from that build it plays as react 0 (${cut2}): the line is the whole of the late start, live at 0.2 and idle at 0`);
}
done('0 CHASE off is b4a25d5');

begin('1 the table');
{
  ok(CT.on === true && CT.pace === 1.08 && CT.secs === 1.5 && CT.react === 0 && Object.keys(CT).length === 4, `CHASE: on, pace 1.08, secs 1.5, react 0: pace alone, the owner's choice (${json(CT)})`);
  ok(json(CH.CHASE_OFF) === json({ pace:1, secs:0, react:0 }), `off, every lever reads b4a25d5's: no chase (${json(CH.CHASE_OFF)})`);
  ok(['pace', 'secs', 'react'].every(k => CH.lv(k) === CT[k]), 'chaseLv reads the table while it is on');
  setC({ on:false }); ok(['pace', 'secs', 'react'].every(k => CH.lv(k) === CH.CHASE_OFF[k]), 'and b4a25d5\'s values while it is off, whatever the table says'); reset();
  const fs = await import('node:fs'), src = fs.readFileSync(new URL('../src/chase.js', import.meta.url), 'utf8');
  ok(/^const CHASE = \{[^\n]*\};\n\/\/ CHASE_TUNE\n/m.test(src), 'the table, then the harness\'s marker (CHASE=\'{"on":false}\' deep-merges into it)');
  const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8'), code = game.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
  const reads = [...code.matchAll(/chaseLv\('([a-z]+)'\)/g)].map(m => m[1]);
  ok(json([...new Set(reads)].sort()) === json(['pace', 'react', 'secs']), `every lever is read through chaseLv (${reads.join(', ')})`);
  ok(!/CHASE\.(?:pace|secs|react)\b/.test(code), 'and never straight from the table');
  ok(!/rnd\(|Math\.random/.test(src.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')), 'src/chase.js draws no number');
}
done('1 the table');

// a staged kick's first steps: the kick, then n steps, calling f(step) after each (the watch is not needed)
const SECS = CT.secs, PACE = CT.pace, STEPS = Math.round(SECS/STEP);
const REACT = 0.2, LATE = Math.round(REACT/STEP);           // the late start as it stays tunable (98e11c8's react), tried in section 5 with CHASE.react set to it
function steps(n, f) { for (let i = 1; i <= n; i++) { T.update(STEP); if (f && f(i) === false) return i; } return n; }

begin('2 the gate');
{
  for (const team of [0, 1]) {
    stage('chip', team, 300 + team);
    ok(M().chase && M().chase.team === team && M().ball.f.kind === 'kick', `side ${team}'s chip starts the chase, his side's`);
    stage('long', team, 310 + team); ok(M().chase && M().chase.team === team, `side ${team}'s long kick (aiKick's territory kick) too`);
    stage('clear', team, 320 + team); ok(M().chase && M().chase.team === team, `and its clearance (aiKick's clear)`);
  }
  // a kick in a played match: the CPU's, and yours (userKick: Kick tapped with the ball, a chip)
  { reseed(41); T.newMatch(X.NATIONS[0], X.NATIONS[3], { halfLen:240, diff:1, headless:true, duels:'off', humans:[true, false] });
    let cpu = null; for (let n = 0; n < 200000 && !M().over && !cpu; n++) { bot(0); T.update(STEP); const b = M().ball; if (b.state === 'air' && b.f.kind === 'kick' && b.f.team === 1) cpu = M().chase && M().chase.team; }
    ok(cpu === 1, 'the CPU\'s kick in a match you play starts its chase');
    const { kicker:k } = stage('chip', 0, 330, { match:{ humans:[true, false], auto:false }, noKick:true });
    const inp = T.input; inp.bPressed = true; inp.bDown = false; T.update(STEP); inp.bPressed = false;   // a tap of Kick with the ball: a chip (userKick)
    const f = M().ball.f;
    ok(T.sides.ctrlOf(0) !== null && f && f.kind === 'kick' && f.team === 0 && Math.hypot(f.x1 - f.x0, f.y1 - f.y0) < 20 && f.onside.has(k) && M().chase && M().chase.team === 0, 'your tap of Kick, a chip, starts yours'); }
  // never a restart: the kick-off and the 22 drop-out
  { reseed(42); T.newMatch(X.NATIONS[0], X.NATIONS[3], { halfLen:240, diff:1, auto:true, headless:true });
    let seen = 0, chased = 0; for (let n = 0; n < 2000; n++) { T.update(STEP); const b = M().ball; if (b.state === 'air' && b.f.kind === 'restart') { seen++; if (M().chase || M().players.some(p => p.chase > 0)) chased++; } }
    ok(seen > 0 && chased === 0, `the kick-off: no chase (${seen} steps in the air)`);
    CH.placeBall(12, 35); CH.restart('groundedInGoal', 0);
    seen = 0; chased = 0; for (let n = 0; n < 2000; n++) { T.update(STEP); const b = M().ball; if (b.state === 'air' && b.f && b.f.kind === 'restart') { seen++; if (M().chase || M().players.some(p => p.chase > 0)) chased++; } }
    ok(seen > 0 && chased === 0, `the 22 drop-out: none (${seen} steps in the air)`); }
  // never a drop goal: the CPU's drop (aiKick 'drop': a wind-up, then the strike's own flight, g3d)
  { let seen = 0, chased = 0;
    for (let s = 0; s < 4; s++) {
      const team = s % 2, { kicker:k } = stage('long', team, 340 + s, { noKick:true, before:(m, c) => { c.x = team === 0 ? 85 : 35; c.y = 35; c.vx = 0; for (const p of m.players) if (p.team !== team) { p.x = c.x + dirOf(team)*12; p.y = 5 + p.n*8; p.vx = p.vy = 0; } } });
      CH.aiKick(k, 'drop');
      steps(150, () => { const m = M(), b = m.ball; if (b.state === 'air' && b.f && b.f.kind === 'g3d') { seen++; if (m.chase || m.players.some(p => p.chase > 0)) chased++; } });
    }
    ok(seen > 0 && chased === 0, `a drop goal: none (${seen} steps of its flight)`); }
  // never a charge-down: a man on top of the kicker blocks it 30% of the time, and doKick stops before kickBall
  { let blocked = 0, kicked = 0, wrong = 0;
    for (let s = 0; s < 40; s++) {
      stage('chip', s % 2, 400 + s, { before:(m, k) => { const q = m.players.find(p => p.team !== k.team); q.x = k.x + dirOf(k.team)*1.2; q.y = k.y; } });
      const b = M().ball, f = b.f;
      if (b.state === 'loose' && !f) { blocked++; if (M().chase || M().players.some(p => p.chase > 0)) wrong++; } else if (f && f.kind === 'kick') { kicked++; if (!M().chase) wrong++; }
    }
    ok(blocked > 0 && kicked > 0 && wrong === 0, `a charge-down: none (${blocked} charged down, ${kicked} got away and chased)`); }
  // never in a drill
  { T.practice.start('defend'); const m = M(); m.paused = false;
    const k = m.players.find(p => p.team === 1); CH.setCarrier(k); CH.kickBall(1, k.x, k.y, k.x - 15, k.y, 1.3, 6, 'kick');
    ok(m.ball.f.kind === 'kick' && !m.chase && !m.players.some(p => p.chase > 0), 'a drill: none'); T.practice.leave(); }
}
done('2 the gate');

begin('3 the chasers');
{
  let good = 0, all = 0, kicker = 0, offs = 0;
  for (let s = 0; s < 20; s++) {
    const team = s % 2, d = dirOf(team);
    const { kicker:k } = (() => { let kk; stage('chip', team, 500 + s, { before:(m, c) => { kk = c; const mates = m.players.filter(p => p.team === team && p !== c); mates[0].x = c.x + d*3; mates[1].x = c.x + d*0.8; mates[2].x = c.x + d*0.4; } }); return { kicker:kk }; })();
    const m = M(), f = m.ball.f;
    for (const p of m.players) { all++; const want = p.team === team && f.onside.has(p) ? SECS : 0; if (p.chase === want) good++; }
    if (k.chase === SECS) kicker++;
    const mates = m.players.filter(p => p.team === team && p !== k);
    if (mates[0].chase === 0 && mates[1].chase === 0 && mates[2].chase === SECS) offs++;
  }
  ok(good === all, `the kicking side's men onside at the kick (f.onside: level with or behind him) chase for ${SECS}s, nobody else (${good} of ${all})`);
  ok(kicker === 20, 'the kicker among them');
  ok(offs === 20, 'a man 3m in front of him and one 0.8m in front do not; one 0.4m in front, level by kickBall\'s half-metre, does');
  // your ringed chaser: Kick tapped, the ring jumps to your man nearest where it comes down (kickBall); onside, he chases with the rest
  { let ringed = 0, n = 0;
    for (let s = 0; s < 10; s++) {
      stage('chip', 0, 600 + s, { match:{ humans:[true, false], auto:false }, before:(m, c) => { const q = m.players.find(p => p.team === 0 && p !== c); q.x = c.x - 0.3; q.y = c.y + 1.5; for (const p of m.players) if (p.team === 0 && p !== c && p !== q) p.x = c.x - 15; } });
      const r = T.sides.ctrlOf(0); n++;
      if (r && r.chase === SECS && M().ball.f.onside.has(r)) ringed++;
    }
    ok(ringed === n, `your ringed man, onside, chases at the pace too (${ringed} of ${n})`); }
  // and offside, he does not: the ring jumps to your man nearest where it comes down wherever he stands, and a man in front of the
  // kicker is offside (after a person's chip in play, about a third of the time): his own pace, no trail, his onside teammates chasing
  { let off = 0, n = 0;
    for (let s = 0; s < 10; s++) {
      let q = null;
      stage('chip', 0, 650 + s, { match:{ humans:[true, false], auto:false }, before:(m, c) => { q = m.players.find(p => p.team === 0 && p !== c); q.x = c.x + 4; q.y = c.y; for (const p of m.players) if (p.team === 0 && p !== c && p !== q) p.x = c.x - 15; } });
      const m = M(), f = m.ball.f;
      if (!f || f.kind !== 'kick') continue;               // charged down: no kick to chase
      const r = T.sides.ctrlOf(0), mates = m.players.filter(p => p.team === 0 && p !== r && f.onside.has(p)); n++;
      if (r === q && !f.onside.has(r) && r.chase === 0 && CH.mul(r) === 1 && mates.length > 0 && mates.every(p => p.chase === SECS)) off++;
    }
    ok(n >= 8 && off === n, `your ringed man in front of the kicker, offside, does not: his own pace and no trail, his onside teammates chasing (${off} of ${n})`); }
}
done('3 the chasers');

begin('4 the pace');
{
  // his top speed over the chase against the same man with no chase, step by step: pace for the first two thirds, then back to 1 by its end
  stage('long', 0, 700);
  const m = M(), k = m.players.find(p => p.team === 0 && p.chase > 0), mul = () => { const c = k.chase; k.chase = 0; const s0 = CH.maxSpeed(k); k.chase = c; return CH.maxSpeed(k)/s0; };
  const seen = [];
  steps(STEPS + 5, i => { seen.push([i, k.chase, mul()]); });
  const at = i => seen[i - 1];
  ok(near(at(1)[2], PACE, 1e-9) && near(at(59)[2], PACE, 1e-9), `x${PACE} from the kick (${at(1)[2].toFixed(4)} the step after, ${at(59)[2].toFixed(4)} 0.98s on)`);
  const ease = i => 1 + (PACE - 1)*Math.min(1, (SECS - i*STEP)/(SECS/3));   // his seconds left over the last third's
  ok(near(at(75)[2], ease(75), 1e-9) && near(at(75)[2], 1 + (PACE - 1)/2, 1e-9) && near(at(83)[2], ease(83), 1e-9), `easing out over the last third: x${at(75)[2].toFixed(4)} at 1.25s, x${at(83)[2].toFixed(4)} at 1.38s`);
  const last = seen.filter(v => v[1] > 0).length, after = seen.slice(last);
  ok(last === STEPS - 1 && after.every(v => v[1] === 0 && v[2] === 1) && !m.chase, `over after ${last + 1} steps (${SECS}s with the kick's own step): every man back to 1, and M.chase gone`);
  // with Sprint the bigger of the two applies, never both
  stage('long', 0, 701);
  { const k2 = M().players.find(p => p.team === 0 && p.chase > 0 && p !== M().ball.carrier); k2.sprint = 1; k2.sprinting = true;
    const s1 = CH.maxSpeed(k2), c = k2.chase; k2.chase = 0; const s0 = CH.maxSpeed(k2); k2.chase = c;
    ok(near(s1, s0, 1e-9), `under a full Sprint the chase adds nothing (${s1.toFixed(3)} m/s either way): the bigger applies`); }
  // it ends early: the other side catches it, the ball goes dead; it runs on while his own side has it
  let lostOk = 0, lostN = 0, deadOk = 0, deadN = 0, wonOk = 0, wonN = 0;
  for (let s = 0; s < 120; s++) {
    stage(s % 3 === 2 ? 'clear' : 'chip', s % 2, 800 + s);
    const m = M(), team = s % 2; let state = null;
    const at = steps(STEPS - 2, () => {
      const b = m.ball;
      if (b.state === 'held' && b.carrier) { state = b.carrier.team === team ? 'won' : 'lost'; return false; }
      if (m.phase !== 'play' && m.phase !== 'cut') { state = 'dead'; return false; }
    });
    if (!state) continue;
    const any = m.players.some(p => p.chase > 0);
    if (state === 'lost') { lostN++; if (!m.chase && !any) lostOk++; }
    else if (state === 'dead') { deadN++; if (!m.chase && !any) deadOk++; }
    else { wonN++; if (m.chase && any && near(m.chase.t, at*STEP, 1e-9)) { steps(STEPS - at); if (!m.chase && !m.players.some(p => p.chase > 0)) wonOk++; } }
  }
  ok(lostN > 10 && lostOk === lostN, `the other side takes it inside the 1.5s: over that step (${lostOk} of ${lostN})`);
  ok(deadN > 5 && deadOk === deadN, `the ball dead inside it (touch, mostly): over that step (${deadOk} of ${deadN})`);
  ok(wonN > 3 && wonOk === wonN, `his own side takes it: it runs on to its 1.5s, and ends there (${wonOk} of ${wonN})`);
}
done('4 the pace');

begin('5 the catching side');
{
  // as it ships (react 0, pace alone): nobody is late. Neither side at the kick or at any step of the chase, and the catching side's two
  // nearest go for where it comes down from the first step after it (section 0: a build without the late start plays the same)
  { let never = 0, first = 0;
    for (let s = 0; s < 10; s++) {
      const team = s % 2; stage('chip', team, 900 + s);
      const m = M(), f = m.ball.f; let late = CH.late(0) || CH.late(1);
      steps(STEPS, i => {
        if (CH.late(0) || CH.late(1)) late = true;
        if (i === 1) { const tg = CH.computeTargets(), them = m.players.filter(p => p.team !== team && p.down <= 0 && !p.bind); if (them.filter(p => { const t = tg.get(p); return t && t.x === f.x1 && t.y === f.y1; }).length === 2) first++; }
      });
      if (!late) never++;
    }
    ok(CT.react === 0 && never === 10, `as it ships (react 0) neither side is ever late: at the kick and every step of its ${SECS}s (${never} of 10)`);
    ok(first === 10, `the catching side's two nearest go for where it comes down from the first step after the kick (${first} of 10)`); }
  // the late start, kept and tunable: at CHASE.react 0.2 (98e11c8's) for that long after the kick the catching side's men the computer
  // runs on as they were (edgeHold); then the two nearest go for it
  setC({ react:REACT });
  let held = 0, heldN = 0, freed = 0;
  for (let s = 0; s < 10; s++) {
    const team = s % 2; stage('chip', team, 900 + s);
    const m = M(), f = m.ball.f;
    steps(LATE + 2, i => {
      const tg = CH.computeTargets(), them = m.players.filter(p => p.team !== team && p.down <= 0 && !p.bind);
      const late = them.every(p => { const t = tg.get(p), e = CH.edgeHold(p, 16); return t && near(t.x, e.x) && near(t.y, e.y) && near(t.s, e.s) && t.a === 16; });
      if (i < LATE) { heldN++; if (late && CH.late(1 - team)) held++; }
      else if (i === LATE) { const two = them.filter(p => { const t = tg.get(p); return t && t.x === f.x1 && t.y === f.y1; }); if (!CH.late(1 - team) && two.length === 2) freed++; }
    });
  }
  ok(held === heldN && heldN === 10*(LATE - 1), `the catching side's men run on as they were for ${REACT}s after the kick (${held} of ${heldN} steps; the kick's own makes ${LATE})`);
  ok(freed === 10, 'then its two nearest go for where it comes down, as before');
  ok(!CH.late(0) || !CH.late(1), 'and the kicking side is never late');
  reset();
  // your man under the ring is never late: the ring jumps to your man nearest where it comes down, and the stick drives him from the next
  // step. At react 0.2 his teammates the computer runs are late; as it ships (react 0) he runs as with no chase all the same
  const yours = react => { let same = 0, mates = 0;
    for (let s = 0; s < 8; s++) {
      const path = on => {
        setC(on ? { react } : { on:false });
        stage('chip', 1, 1000 + s, { match:{ humans:[true, false], auto:false } });
        const r = T.sides.ctrlOf(0), f = M().ball.f, inp = T.input, out = [], others = [];
        for (let i = 0; i < LATE; i++) {
          const dx = f.x1 - r.x, dy = f.y1 - r.y, m = Math.hypot(dx, dy) || 1; inp.jx = dx/m; inp.jy = dy/m;
          T.update(STEP); out.push([r.x, r.y]); others.push(M().players.filter(p => p.team === 0 && p !== r).map(p => [p.x, p.y]));
        }
        inp.jx = inp.jy = 0; reset();
        return { r:json(out), o:json(others) };
      };
      const a = path(true), b = path(false);
      if (a.r === b.r) same++;
      if (a.o !== b.o) mates++;
    }
    return { same, mates }; };
  { const { same, mates } = yours(REACT);
    ok(same === 8, `your ringed man runs for it from the next step, exactly as with no chase (${same} of 8)`);
    ok(mates === 8, `while his teammates the computer runs are late (${mates} of 8)`); }
  { const { same } = yours(0); ok(same === 8, `and as it ships, react 0: his run over those ${LATE} steps exactly as with no chase (${same} of 8)`); }
  // Kids: the child's let-go chase (kidsChase) goes at once too, at react 0.2 and as it ships
  for (const react of [REACT, 0]) { let same = 0;
    for (let s = 0; s < 6; s++) {
      const path = on => {
        setC(on ? { react } : { on:false });
        stage('chip', 1, 1100 + s, { match:{ humans:[true, false], auto:false, diff:0, kids:true, kidsR:0.5 } });
        const r = T.sides.ctrlOf(0), out = [];
        steps(LATE, () => { out.push([r.x, r.y]); });
        reset(); return json(out);
      };
      if (path(true) === path(false)) same++;
    }
    ok(same === 6, `Kids: the child who lets go of the stick still chases at once (kidsChase), as before, at react ${react} (${same} of 6)`); }
}
done('5 the catching side');

begin('6 no draw');
{
  stage('chip', 0, 1200); const r0 = rndCalls(), m = M(), k = m.players.find(p => p.chase > 0);
  CH.mul(k); CH.late(1); CH.maxSpeed(k); CH.matchTargets(); CH.start(0, m.ball.f.onside); CH.tick(STEP);
  ok(rndCalls() === r0, 'the chase\'s start, pace, lateness and clock draw nothing');
  let same = 0;
  for (let s = 0; s < 30; s++) { const a = stage(['chip', 'long', 'clear'][s % 3], s % 2, 1300 + s).draws; setC({ on:false }); const b = stage(['chip', 'long', 'clear'][s % 3], s % 2, 1300 + s).draws; reset(); if (a === b) same++; }
  ok(same === 30, `every staged kick draws the same numbers with CHASE on and off up to the kick (${same} of 30)`);
}
done('6 no draw');

begin('7 measured');
{
  // README.md's staged chip and long kick, fewer seeds: the kicking side wins back clearly more chips, long kicks no fewer, both sides alike
  const N = 200, rate = (kind, team, on) => { if (!on) setC({ on:false }); let w = 0; for (let s = 0; s < N; s++) { const k = stagedKick(kind, team, (+process.env.SEED)*100000 + s*2 + team, { back:false }); if (k && k.res === 'won') w++; } reset(); return w/N; };
  const rows = [];
  for (const team of [0, 1]) { const b = rate('chip', team, false), a = rate('chip', team, true); rows.push([team, b, a]); }
  const gain = rows.map(([, b, a]) => 100*(a - b));
  ok(gain.every(g => g >= 4 && g <= 22), `chips won back: ${rows.map(([t, b, a]) => `side ${t} ${(100*b).toFixed(0)}% to ${(100*a).toFixed(0)}%`).join(', ')} (+${gain.map(g => g.toFixed(0)).join(', +')} points, the band 4 to 22)`);
  const avg = (gain[0] + gain[1])/2;
  ok(avg >= 7 && avg <= 18, `both sides together +${avg.toFixed(1)} points (README.md: about +10 to 15, the band 7 to 18)`);
  const lb = rate('long', 0, false), la = rate('long', 0, true);
  ok(la >= lb && la - lb <= 0.1, `long kicks no fewer, and not many more (${(100*lb).toFixed(0)}% to ${(100*la).toFixed(0)}%)`);
}
done('7 measured');

begin('8 everywhere');
{
  // AI v AI, the demo, Two Player, Kids and a career match: a kick starts the chase in each
  const first = o => { reseed(77); T.newMatch(X.NATIONS[0], X.NATIONS[3], { halfLen:240, diff:1, headless:true, ...o }); let got = null; for (let n = 0; n < 200000 && !M().over && got == null; n++) { if (o.humans) { bot(0); if (o.humans[1]) bot(1); } T.update(STEP); const b = M().ball; if (b.state === 'air' && b.f && b.f.kind === 'kick') got = !!M().chase && M().chase.team === b.f.team; } return got; };
  ok(first({ auto:true }) === true, 'AI v AI');
  ok(first({ auto:true, demo:true, halfLen:1e9 }) === true, 'the demo');
  stage('chip', 1, 1400, { match:{ humans:[true, true], levels:[1, 1], arcade:true, auto:false } }); ok(M().two && M().chase && M().chase.team === 1, 'Two Player (the harness\'s bot never kicks, so a staged chip)');
  ok(first({ humans:[true, false], diff:0, kids:true, kidsR:1, arcade:true }) === true, 'Kids');
  ok(first({ humans:[true, false], diff:1, arcade:true, duels:'live' }) === true, 'a Quick Match');
}
done('8 everywhere');

begin('9 the words and the files');
{
  const fs = await import('node:fs'), read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
  const readme = read('README.md');
  ok(/^### Kicking and the chase$/m.test(readme) && readme.includes('`CHASE`') && readme.includes('CHASE=\'{"on":false}\''), 'README: Kicking and the chase, with the table and CHASE off');
  const sec = (readme.split(/^### Kicking and the chase$/m)[1] || '').split(/^### /m)[0];
  const row = k => ((sec.match(new RegExp('^\\| `' + k + '` \\| ([^|]+) \\|', 'm')) || [])[1] || '').trim();
  ok(row('on') === String(CT.on) && ['pace', 'secs', 'react'].every(k => row(k) !== '' && +row(k) === CT[k]), `README's table gives CHASE as it ships (on ${row('on')}, pace ${row('pace')}, secs ${row('secs')}, react ${row('react')})`);
  ok(/node tools\/chase\.mjs --balance band/.test(readme) && /node tools\/chase\.mjs --balance band/.test(read('tools/CHECKS.md')), 'README and CHECKS.md say what --balance band checks');
  ok(/\['chase', \['tools\/chase\.mjs'\]\]/.test(read('tools/check.mjs')) && /tools\/chase\.mjs/.test(read('tools/CHECKS.md')), 'in the default gate, and in CHECKS.md');
  ok(/"knock\.js",\s*"chase\.js",/.test(read('src/manifest.json')), 'src/chase.js is built after src/knock.js');
  ok(/CHASE_TUNE/.test(read('tools/harness.mjs')), 'the harness\'s CHASE marker');
  ok(!(read('src/chase.js') + read('tools/chase.mjs')).includes(String.fromCharCode(0x2014)), 'no em dashes');
}
done('9 the words and the files');

console.log(`\nKick chase: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
}
