// Scripted children for the Kids rating (src/kids.js): a 6 year old, a 7 to 8 year old, a sharp 10 year old and a stick masher, each
// playing one-player Kids matches through the real input path, with 2-minute halves and Quick Match's rules (arcade on: On Fire, the Golden Try).
//   node tools/kidbots.mjs at [r=0,1] [matches=200]                  scorelines for each child at fixed ratings (easy: plain Easy, for comparison)
//   node tools/kidbots.mjs settle [runs=16] [matches=150] [skip=60]  each child from r = 0, the rating moved after every match by kidsAdapt's
//                                                                  rule; settled is each run after its first `skip` matches
// Add a profile name (six, eight, ten, or masher, who runs only when named) to run one child only. Every match is seeded on its own (SEED,
// then its run and number), so a line is the same whatever else runs. JOBS=n splits the matches over n processes (default: the machine's
// cores, at most 8). SIDES=FAR,HAS plays one pairing instead of the six nations in turn (below). A ± is a standard error. Where r settles has it across the runs; a settled margin and win share have it counting each
// match on its own, and across the runs in brackets (the rating's feedback holds a run's results together, so the matches are not independent).
// Not part of check.mjs: it is a calibration tool, tens of minutes long. tools/kids.mjs checks the rule and the scale themselves.
import { spawn } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
process.env.SEED ??= '7';
const { T, reseed, kickBot, dropBot, scrumBot, lineBot, bot } = await import('./harness.mjs');
const K = T.kids, STEP = T.STEP;
// KIDS_SCALE='{"save":[1,0.3],"diff":{"cpuSpeed":[0.92,0.965]}}' tries other start and ceiling values without an edit
if (process.env.KIDS_SCALE) for (const [k, v] of Object.entries(JSON.parse(process.env.KIDS_SCALE))) { if (Array.isArray(v)) K.KIDS_SCALE[k] = v; else Object.assign(K.KIDS_SCALE[k], v); }
// KIDS_ADAPT='{"lose":-0.08}' tries another update rule the same way
if (process.env.KIDS_ADAPT) Object.assign(K.KIDS_ADAPT, JSON.parse(process.env.KIDS_ADAPT));
const R = () => Math.random();
const gauss = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };

/* Each child, as numbers. def: the share of the time he is trying to defend (re-decided every 1 to 3s); astray: when he is not, how
   often he keeps the stick pushed at the try line instead of letting go (letting go hands his man to the Kids chase); react: seconds
   before a change of possession reaches his thumb; wob: how much his run weaves; pass/chip: a stray press a step while carrying;
   under: a pass when a tackler is on him; swerve: his chance of stepping away from the man in front; sprint: his chance of holding
   Sprint in space; off: offloads on the cue; dive: a Tackle press a step in reach; duel: { press, sd, flick, right } his chance of
   pressing at all, his timing spread about the gold's centre (null: any time at all), how often he flicks rather than pressing a
   button, and how often a flick or a Pass/Dummy choice is the right one; kick: his release spread at a goal kick (s); scrum and
   line: the harness's set-piece bots' settings. ten is the harness's own average player, his goal kick's aim left to Kids. */
export const KID_BOTS = {
  six:  { name:'6 year old', def:0.25, astray:0.4, react:0.9, wob:1.6, pass:0.003, chip:0.002, under:0, swerve:0, sprint:0, off:0.05, dive:0.02,
    duel:{ press:0.6, sd:null, flick:0.3, right:0.5 }, kick:0.25, scrum:[2, 0.1], line:0.35 },
  eight:{ name:'7 to 8 year old', def:0.6, astray:0.25, react:0.5, wob:0.9, pass:0.001, chip:0.001, under:0.05, swerve:0.4, sprint:0.3, off:0.2, dive:0.06,
    duel:{ press:0.9, sd:0.2, flick:0.6, right:0.75 }, kick:0.12, scrum:[4, 0.35], line:0.22 },
  ten:  { name:'sharp 10 year old', harness:true },
  masher:{ name:'stick masher', extra:true, def:0, astray:0.7, react:0.9, wob:1.6, pass:0.003, chip:0.002, under:0, swerve:0, sprint:0, off:0.05, dive:0,
    duel:{ press:1, sd:null, flick:0.3, right:0.5 }, kick:0.25, scrum:[2, 0.1], line:0.35 },   // never defends, 70% of the time still pushing at the try line; run only when named
};

function kidGoal(c, P) {                                   // the aim is set on Kids; he holds Kick and lets go about the gold's centre
  const g = c.g;
  if (g.watch) return;
  if (g.kb == null) g.kb = P.harness ? null : g.ctr + (P.kick*(P.kick > 0.2 ? 2*R() - 1 : gauss()))/g.fill;   // a wide spread is a flat one: he has no sense of the centre yet
  T.input.jx = 0;
  (g.type === 'drop' ? dropBot : kickBot)(c, g.kb == null ? { aim:g.aim } : { aim:g.aim, m:g.kb });
}
function kidDuel(c, P) {
  const inp = T.input, D = P.duel;
  if (!c.kid) {
    const centre = (c.win[0] + c.win[1])/2;
    c.kid = { press:R() < D.press, at:D.sd == null ? 0.3 + R()*(c.win[1] + 0.3) : centre + gauss()*D.sd, flick:R() < D.flick, right:R() < D.right, done:false };
  }
  const b = c.kid;
  if (b.done || !b.press || c.res || c.t < 0.3 || c.t < b.at) return;
  b.done = true;
  if (c.kind === 'past') { if (b.flick) inp.flick = b.right ? c.open : -c.open; else inp.aPressed = true; }
  else if (c.kind === 'pass') { const want = c.drift ? 'dummy' : 'pass', act = b.right ? want : (want === 'pass' ? 'dummy' : 'pass'); if (act === 'dummy') inp.bPressed = true; else inp.aPressed = true; }
  else inp.aPressed = true;
}
/* One step of one child. S is his memory between steps: the stick he is holding, his weave, his defending spell, his reaction lag. */
export function kidStep(P, S) {
  const M = T.M, inp = T.input, cut = M.phase === 'cut' && M.cut;
  if (P.harness) {
    if (cut && cut.kind === 'goal') { kidGoal(cut, P); return; }
    bot(0); return;
  }
  inp.jx = 0; inp.jy = 0;
  if (cut) {
    if (cut.duel) kidDuel(cut, P);
    else if (cut.kind === 'goal') kidGoal(cut, P);
    else if (cut.kind === 'scrum') scrumBot(0, P.scrum[0], P.scrum[1]);
    else if (cut.kind === 'lineout') lineBot(0, P.line);
    return;
  }
  const c = T.sides.ctrlOf(0), b = M.ball;
  if (!c || M.phase !== 'play') { inp.cDown = false; S.sit = null; return; }
  const sit = b.state === 'held' ? (b.carrier.team === 0 ? 'att' : 'def') : b.state === 'air' && b.f.kind === 'pass' ? (b.f.team === 0 ? 'att' : 'def') : 'loose';
  if (S.sit !== sit) { if (S.sit) S.lag = P.react*(0.6 + 0.8*R()); S.sit = sit; }
  if (S.lag > 0) { S.lag -= STEP; inp.jx = S.jx || 0; inp.jy = S.jy || 0; return; }   // his thumb is still doing what it was
  if ((S.wobT -= STEP) <= 0) { S.wobT = 0.4 + R()*0.6; S.wob = (R() - 0.5)*P.wob; }
  if ((S.defT -= STEP) <= 0) { S.defT = 1 + R()*2; S.def = R() < P.def; S.away = R() < P.astray; }
  let jx = 0, jy = 0, sprint = false;
  if (b.state === 'held' && b.carrier === c) {
    let near = 99, ny = 0;
    for (const q of M.players) { if (q.team !== 1 || q.down > 0) continue; const d = Math.hypot(q.x - c.x, q.y - c.y); if (q.x > c.x - 1 && d < near) { near = d; ny = q.y - c.y; } }
    if (S.carry !== c) { S.carry = c; S.swerve = R() < P.swerve; S.sprint = R() < P.sprint; }
    jx = 1; jy = S.wob + (S.swerve && near < 5 ? (ny > 0 ? -0.7 : 0.7) : 0) + (c.y < 6 ? 0.4 : c.y > 64 ? -0.4 : 0);
    const k = M.contact;
    if (k && k.c === c) { if (k.kidOff == null) k.kidOff = T.contact.canOffload(k) && R() < P.off; if (k.kidOff && k.t >= 0.12) { inp.aPressed = true; k.kidOff = false; } }
    else {
      if (R() < P.pass || (near < 2.6 && c.hold > 0.4 && R() < P.under)) inp.aPressed = true;
      if (R() < P.chip) { inp.bPressed = true; inp.bDown = false; }
      sprint = S.sprint && near > 6;
    }
  } else if (S.def) {
    const t = b.state === 'held' ? b.carrier : null, tx = t ? t.x : b.state === 'air' ? b.f.x1 : b.x, ty = t ? t.y : b.state === 'air' ? b.f.y1 : b.y;
    const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy) || 1;
    if (d > 0.5) { jx = dx/d + (R() - 0.5)*0.5; jy = dy/d + (R() - 0.5)*0.5; }
    if (t && d < 2.4 && R() < P.dive) inp.aPressed = true;
  } else if (S.away) { jx = 1; jy = S.wob; }               // still running at the try line; otherwise the stick is let go
  const m = Math.hypot(jx, jy);
  if (m > 1) { jx /= m; jy /= m; }
  inp.jx = S.jx = jx; inp.jy = S.jy = jy;
  if (sprint && !inp.cDown) inp.cPressed = true;
  inp.cDown = sprint;
}

/* One seeded Kids match for child `who` at rating r: Quick Match's terms, 2-minute halves, the teams rotated by its number. The six nations
   play at the ratings the calibration in README.md was measured with: the XV ratings (2026-11-08) moved England, Italy, Scotland and Wales.
   SIDES=FAR,HAS plays that one pairing instead, the child's side first, at its list's ratings as the game has them (CLUB_RATED=band: the
   ratings before the real order), for a pairing the team screen offers: Quick Match's first two cards are Farnham and Haslemere. */
const CALIBRATED = { ENG:[4, 5, 3, 4, 4], ITA:[4, 3, 3, 3, 3], SCO:[5, 3, 4, 3, 4], WAL:[3, 4, 3, 3, 4] };
const sixAt = i => { const t = T.teams.NATIONS[i], v = CALIBRATED[t.id]; return v ? { ...t, pace:v[0], power:v[1], handling:v[2], kicking:v[3], stamina:v[4] } : t; };
const PAIR = process.env.SIDES ? process.env.SIDES.split(',').map(id => T.teams.ALL_TEAMS.find(t => t.id === id)) : null;
if (PAIR && (PAIR.length !== 2 || !PAIR.every(Boolean))) throw new Error('SIDES names two sides by code, e.g. SIDES=FAR,HAS');
export function kidsMatch(who, r, seed) {
  reseed(seed);
  const P = KID_BOTS[who], i = seed % 30, a = i % 6, b = (a + 1 + (i % 5)) % 6;
  T.newMatch(PAIR ? PAIR[0] : sixAt(a), PAIR ? PAIR[1] : sixAt(b), { halfLen:120, diff:0, headless:true, duels:'live', arcade:true, kids:r >= 0, kidsR:r });   // r < 0: plain Easy, for comparison
  const S = { wobT:0, defT:0, lag:0 };
  let n = 0;
  while (!T.M.over && n < 400000) { kidStep(P, S); T.update(STEP); n++; }
  for (const inp of T.inputs) { inp.jx = inp.jy = 0; inp.aPressed = inp.bPressed = inp.cPressed = false; inp.aDown = inp.bDown = inp.cDown = false; inp.flick = 0; }
  const M = T.M;
  return { score:M.score.slice(), tries:M.tries.slice(), r:M.kidsR, done:M.over };
}

/* ---------- the command line ---------- */
const self = fileURLToPath(import.meta.url);
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main();   // run, not imported

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--job') { job(JSON.parse(args[1])); return; }
  const cmd = args[0] || 'at', who = args.filter(a => KID_BOTS[a]), nums = args.slice(1).filter(a => !KID_BOTS[a]);
  const kids = who.length ? who : Object.keys(KID_BOTS).filter(k => !KID_BOTS[k].extra);
  const jobs = +process.env.JOBS || Math.min(8, os.cpus().length);
  if (cmd === 'at') {
    const rs = (nums[0] || '0,1').split(',').map(v => (v === 'easy' ? -1 : +v)), n = +nums[1] || 200;
    for (const k of kids) for (const r of rs) {
      const res = await fan(jobs, n, (lo, hi) => ({ kind:'at', who:k, r, lo, hi }));
      if (process.env.DUMP) fs.appendFileSync(process.env.DUMP, JSON.stringify({ who:k, r, res }) + '\n');   // DUMP=file keeps every result, a line a child and rating
      console.log(line(`${KID_BOTS[k].name} ${r < 0 ? 'on Easy' : 'at r=' + r.toFixed(2)}`, res));
    }
  } else if (cmd === 'settle') {
    const runs = +nums[0] || 16, n = +nums[1] || 150, skip = Math.min(n - 1, nums[2] != null ? +nums[2] : 60);
    for (const k of kids) {
      const seqs = await fan(jobs, runs, (lo, hi) => ({ kind:'settle', who:k, n, lo, hi }));   // one array of n matches a run
      if (process.env.DUMP) fs.appendFileSync(process.env.DUMP, JSON.stringify({ who:k, seqs }) + '\n');
      const late = seqs.map(s => s.slice(skip));                  // each run after its first `skip` matches: settled
      const runMeans = late.map(s => s.reduce((a, m) => a + m.r, 0)/s.length), [mean, seR, sdRuns] = meanSe(runMeans);
      const curve = [0, 10, 20, 30, 40, 60, 80, 100, n - 1].filter((i, j, a) => i < n && a.indexOf(i) === j).map(i => `${i + 1}:${(seqs.reduce((a, s) => a + s[i].r, 0)/seqs.length).toFixed(3)}`).join(' ');
      const jumps = Math.max(...seqs.flatMap(s => s.map(m => Math.abs(m.next - m.r))));
      console.log(`${KID_BOTS[k].name}: r settles at ${mean.toFixed(3)} ± ${seR.toFixed(3)} (runs' spread ${sdRuns.toFixed(3)}; the runs' mean rating before match ${curve}; largest step ${jumps.toFixed(3)})`);
      console.log('  ' + line(`settled (from match ${skip + 1})`, late.flat(), late));
    }
  } else { console.error('Usage: node tools/kidbots.mjs at [r,r] [matches] | settle [runs] [matches] [skip] [six|eight|ten|masher]'); process.exitCode = 2; }
}
function job(o) {
  const out = [];
  if (o.kind === 'at') for (let i = o.lo; i < o.hi; i++) out.push(kidsMatch(o.who, o.r, +process.env.SEED*100000 + i));
  else for (let j = o.lo; j < o.hi; j++) {
    let r = 0; const seq = [];
    for (let i = 0; i < o.n; i++) { const m = kidsMatch(o.who, r, +process.env.SEED*100000 + 1000*(j + 1) + i); m.next = K.next(r, m.score, m.tries); seq.push(m); r = m.next; }
    out.push(seq);
  }
  process.stdout.write(JSON.stringify(out));
}
function fan(jobs, n, spec) {                              // the items 0..n-1 over `jobs` processes, in order
  const per = Math.ceil(n/jobs), parts = [];
  for (let lo = 0; lo < n; lo += per) parts.push(spec(lo, Math.min(n, lo + per)));
  return Promise.all(parts.map(o => new Promise((ok, bad) => {
    const p = spawn(process.execPath, [self, '--job', JSON.stringify(o)], { env:process.env, stdio:['ignore', 'pipe', 'inherit'] });
    let s = ''; p.stdout.on('data', d => { s += d; }); p.on('close', code => (code ? bad(new Error('job failed')) : ok(JSON.parse(s))));
  }))).then(r => r.flat());
}
function meanSe(v) { const n = v.length, m = v.reduce((a, b) => a + b, 0)/n, sd = Math.sqrt(v.reduce((a, x) => a + (x - m)**2, 0)/Math.max(1, n - 1)); return [m, sd/Math.sqrt(n), sd]; }   // mean, its standard error, the spread
function line(label, res, runs) {                          // mean scoreline and tries, the try margin (mean ± its standard error, median), wins by how much, tries conceded; runs: the same errors across them too
  const n = res.length, f = k => res.reduce((a, m) => a + k(m), 0)/n, share = (k, of = res) => of.filter(k).length/of.length, pc = v => (100*v).toFixed(0);
  const mg = m => m.tries[0] - m.tries[1], won = m => m.score[0] > m.score[1], lost = m => m.score[0] < m.score[1];
  const marg = res.map(mg).sort((a, b) => a - b), med = n % 2 ? marg[(n - 1)/2] : (marg[n/2 - 1] + marg[n/2])/2;
  const [mm, seM, sd] = meanSe(marg), seW = Math.sqrt(share(won)*(1 - share(won))/n);
  const runSe = runs ? ` (across the runs ± ${meanSe(runs.map(s => s.reduce((a, m) => a + mg(m), 0)/s.length))[1].toFixed(2)}, ± ${pc(meanSe(runs.map(s => share(won, s)))[1])}%)` : '';   // the rating's feedback holds a run's results together, so this one is usually the smaller
  const w = res.filter(won).length, l = res.filter(lost).length;
  return `${label.padEnd(26)} ${f(m => m.score[0]).toFixed(1)}-${f(m => m.score[1]).toFixed(1)}  tries ${f(m => m.tries[0]).toFixed(2)}-${f(m => m.tries[1]).toFixed(2)}  margin ${mm.toFixed(2)} ± ${seM.toFixed(2)} (sd ${sd.toFixed(2)}, median ${med})  ` +
    `won ${pc(w/n)} ± ${pc(seW)}% (W${w} D${n - w - l} L${l})${runSe}  wins by 4+ ${pc(share(m => won(m) && mg(m) >= 4))}%, 2-3 ${pc(share(m => won(m) && mg(m) >= 2 && mg(m) <= 3))}%, 1 or less ${pc(share(m => won(m) && mg(m) <= 1))}%  ` +
    `conceded a try ${pc(share(m => m.tries[1] > 0))}% (2+ ${pc(share(m => m.tries[1] > 1))}%)  n=${n}`;
}
