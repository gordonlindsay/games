// Knock-ons (src/knock.js; README.md, Catching and knock-ons): each lever's size (the unforced base halved, the interception's
// term, the Big Hit's spill only for a person's tackler: yours, the CPU's, Two Player, AI v AI), the Knock-On tag, one draw a catch
// whatever its chance and one a jolt whatever its size, and KNOCK off playing exactly as 20cbcaf, the build before, draw for draw.
// node tools/knock.mjs              (SEED=19 unless set; VERBOSE=1 lists every check)
// node tools/knock.mjs --pins       prints this build's fingerprints with KNOCK off; GAME=<20cbcaf>/index.html node tools/knock.mjs --pins pinned BASE
// node tools/knock.mjs --balance [ai|bot|casual|all]   README.md's before-and-after tables: seeded matches with KNOCK off and on, each
//                                   knock-on sorted by its cause and side (minutes; never in check.mjs; JOBS, KN_AI, KN_BOT, KN_CASUAL
//                                   for the matches, KN_DIFFS='1' for one level; KNOCK='{"intercept":0.12}' measures other levers as after)
process.env.SEED ??= process.argv.includes('--balance') ? '7' : '19';   // the balance tables: tools/bot.mjs's PROFILE seed
import { spawn } from 'node:child_process';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { T, reseed, rndCalls, bot } = await import('./harness.mjs');
const STEP = T.STEP, M = () => T.M, X = T.teams, K = T.knock, $ = id => document.getElementById(id);
const args = process.argv.slice(2);
let passed = 0, failed = 0, group = '';
const ok = (cond, msg) => { if (cond) passed++; else failed++; if (!cond || process.env.VERBOSE) console.log(cond ? 'ok  ' : 'FAIL', group + ':', msg); };
const begin = name => { group = name; }, done = name => console.log(`${name.padEnd(30)} ${failed ? 'FAIL so far ' + failed : 'ok'} (${passed} passed)`);
const json = v => JSON.stringify(v), near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };

/* ---------- the tally: every catch, jolt and knock-on of a match, sorted by its cause and side ----------
   The game tells the tools through globalThis.__knockSpy (src/match.js, src/contact.js), which draws nothing and changes nothing.
   A catch knocked on is unforced (a pass with nobody of the other side within 1.8m, not long), marked (one within 1.8m), long, a
   kick's or an interception's; a jolt knocked on is the tackle's tier, and a Big Hit's is the arcade spill's when only its 0.12
   made it (the draw between the chance without it and with it). exp is the chance each term of a catch's sum adds, after its
   multipliers (On Fire, Kids, Team Spirit, Safe Hands): what the term is worth in knock-ons, whatever order the terms are read in. */
export const SOURCES = ['unforced', 'marked', 'long', 'kick', 'intercept', 'spill', 'dom', 'wrap', 'soft', 'offload'];
export const SOURCE_NAMES = { unforced:'Unforced catch', marked:'Marked catch', long:'Long pass', kick:'Kick catch', intercept:'Interception', spill:'Big Hit: the arcade spill', dom:'Big Hit', wrap:'Wrap', soft:'Soft', offload:'Failed offload' };
export function tally() {
  const side = () => ({ ko:Object.fromEntries(SOURCES.map(s => [s, 0])), exp:{ base:0, marked:0, long:0, kick:0, intercept:0 }, catches:0, icAtt:0, icClean:0, icKnock:0, jolts:0, spillJolts:0 });
  const t = { s:[side(), side()], knocks:0 };
  let jolt = null;
  globalThis.__knockSpy = (what, p, o) => {
    const S = t.s[p.team];
    if (what === 'catch') {
      const ic = o.kind === 'intercept' ? K.lv('intercept') : 0, kick = o.kind === 'kick' ? 0.05 : 0, mk = o.marked ? 0.04 : 0, lg = o.long ? T.contact.LONG.knock : 0;
      const raw = o.base + kick + ic + mk + lg, m = raw > 0 ? o.pk/raw : 0;
      S.catches++; S.exp.base += o.base*m; S.exp.kick += kick*m; S.exp.intercept += ic*m; S.exp.marked += mk*m; S.exp.long += lg*m;
      if (o.kind === 'intercept') { S.icAtt++; if (o.r < o.pk) S.icKnock++; else S.icClean++; }
      if (o.r < o.pk) S.ko[o.kind === 'intercept' ? 'intercept' : o.kind === 'kick' ? 'kick' : o.long ? 'long' : o.marked ? 'marked' : 'unforced']++;
    } else if (what === 'jolt') {
      jolt = o;
      if (o.rj < o.jolt*o.kj) { S.jolts++; if (o.rj >= (o.jolt - o.spill)*o.kj) S.spillJolts++; }
    } else if (what === 'knock') {
      t.knocks++;
      if (o.why === 'offload') S.ko.offload++;
      else if (o.why === 'contact') S.ko[jolt.tier === 'dom' && jolt.spill > 0 && jolt.rj >= (jolt.jolt - jolt.spill)*jolt.kj ? 'spill' : jolt.tier]++;
    }
  };
  return t;
}
const untally = () => { delete globalThis.__knockSpy; };

/* ---------- the matches the tables are made of ---------- */
async function oneMatch(o, seed) {
  const t = tally();
  let res;
  if (o.kind === 'ai') {                                   // AI v AI as T.simulate pairs the six nations
    reseed(seed); const i = seed % 30, a = i % 6, b = (i + 1 + (i % 5)) % 6 === a ? (a + 1) % 6 : (i + 1 + (i % 5)) % 6;
    T.newMatch(a, b, { halfLen:o.half, diff:o.diff, auto:true, headless:true });
    let n = 0; while (!M().over && n < 400000) { T.update(STEP); n++; }
    res = { score:M().score.slice(), tries:M().tries.slice() };
  } else {                                                 // the scripted bot or the casual adult as played (Quick Match's rules), as tools/bot.mjs's PROFILE runs
    const { profileMatch } = await import('./bot.mjs');
    const r = profileMatch(o.kind === 'casual' ? 'casual' : 'bot', o.diff, o.half, seed, true);
    res = { score:r.score, tries:r.tries };
  }
  untally();
  if (t.knocks !== M().stats.knocks) throw new Error(`the tally missed a knock-on (${t.knocks} of ${M().stats.knocks})`);
  return { ...res, s:t.s, icStat:M().stats.intercepts || 0 };
}
const self = fileURLToPath(import.meta.url), run = !!process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (run && args[0] === '--job') {
  const o = JSON.parse(args[1]), out = [];
  for (let i = o.lo; i < o.hi; i++) out.push(await oneMatch(o, +process.env.SEED*100000 + i));
  process.stdout.write(json(out)); process.exit(0);
}
function fan(spec, n, env) {                               // matches 0..n-1 over JOBS processes, in order, with env on top (KNOCK off, say)
  const jobs = +process.env.JOBS || Math.min(8, os.cpus().length), per = Math.ceil(n/jobs), parts = [];
  for (let lo = 0; lo < n; lo += per) parts.push({ ...spec, lo, hi:Math.min(n, lo + per) });
  return Promise.all(parts.map(o => new Promise((good, bad) => {
    const p = spawn(process.execPath, [self, '--job', json(o)], { env:{ ...process.env, ...env }, stdio:['ignore', 'pipe', 'inherit'] });
    let s = ''; p.stdout.on('data', d => { s += d; }); p.on('close', code => (code ? bad(new Error('job failed')) : good(JSON.parse(s))));
  }))).then(r => r.flat());
}
const OFF = { KNOCK:'{"on":false}' };
async function balance() {
  const what = args[1] || 'all', rows = [];
  const N = { ai:+process.env.KN_AI || 120, bot:+process.env.KN_BOT || 80, casual:+process.env.KN_CASUAL || 100 };
  if (what === 'ai' || what === 'all') rows.push({ label:'AI v AI, Normal, 4-minute halves', spec:{ kind:'ai', diff:1, half:240 }, n:N.ai, sides:['Home', 'Away'] });
  if (what === 'bot' || what === 'all') for (const diff of (process.env.KN_DIFFS || '0,1,2').split(',').map(Number)) rows.push({ label:`Bot v CPU as played, ${['Easy', 'Normal', 'Hard'][diff]}, 2-minute halves`, spec:{ kind:'bot', diff, half:120 }, n:N.bot, sides:['You', 'CPU'] });
  if (what === 'casual' || what === 'all') rows.push({ label:'Casual adult v CPU as played, Easy, 2-minute halves', spec:{ kind:'casual', diff:0, half:120 }, n:N.casual, sides:['You', 'CPU'] });
  for (const row of rows) {
    const before = await fan(row.spec, row.n, OFF), after = await fan(row.spec, row.n, {});
    report(row, before, after);
  }
}
const mean = (res, f) => res.reduce((a, m) => a + f(m), 0)/res.length;
const f2 = v => v.toFixed(2);
function report(row, B, A) {
  const n = B.length, [y, c] = row.sides, both = (res, f) => [0, 1].map(t => mean(res, m => f(m.s[t]))), all = S => SOURCES.reduce((a, k) => a + S.ko[k], 0);
  const cell = (res, f) => { const [a, b] = both(res, f); return `${f2(a)} / ${f2(b)}`; };
  console.log(`\n${row.label}: ${n} seeded matches (SEED ${process.env.SEED}), KNOCK off (20cbcaf) then on. ${y} / ${c}, a match`);
  console.log(`| Source | Before | After |`);
  console.log(`|---|---|---|`);
  for (const k of SOURCES) console.log(`| ${SOURCE_NAMES[k]} | ${cell(B, S => S.ko[k])} | ${cell(A, S => S.ko[k])} |`);
  console.log(`| **All knock-ons** | ${cell(B, all)} (${f2(mean(B, m => all(m.s[0]) + all(m.s[1])))}) | ${cell(A, all)} (${f2(mean(A, m => all(m.s[0]) + all(m.s[1])))}) |`);
  // the spill on your carrier is the CPU's Big Hit (the bug), unexplained; on the CPU's it is your Big Hit, earned. AI v AI has none (no arcade)
  const unex = (res, t) => mean(res, m => m.s[t].ko.unforced + m.s[t].ko.intercept + (t === 0 ? m.s[t].ko.spill : 0)), earn = (res, t) => mean(res, m => { const k = m.s[t].ko; return k.marked + k.long + k.kick + k.dom + k.wrap + k.soft + k.offload + (t === 1 ? k.spill : 0); });
  const pair = (res, f) => `${f2(f(res, 0))} / ${f2(f(res, 1))}`;
  console.log(`| Unexplained (unforced, interception, the spill on ${y === 'You' ? 'you' : 'the home side'}) | ${pair(B, unex)} | ${pair(A, unex)} |`);
  console.log(`| Earned (marked, long, kick, Big Hit, Wrap, Soft, offload${y === 'You' ? ', your spill' : ''}) | ${pair(B, earn)} | ${pair(A, earn)} |`);
  console.log(`| Catches | ${cell(B, S => S.catches)} | ${cell(A, S => S.catches)} |`);
  console.log(`| Interceptions tried: clean, knocked on | ${cell(B, S => S.icClean)}, ${cell(B, S => S.icKnock)} | ${cell(A, S => S.icClean)}, ${cell(A, S => S.icKnock)} |`);
  console.log(`| Jolted loose (the spill's share) | ${cell(B, S => S.jolts)} (${cell(B, S => S.spillJolts)}) | ${cell(A, S => S.jolts)} (${cell(A, S => S.spillJolts)}) |`);
  console.log(`| Terms, in knock-ons: base, marked, long, kick, interception | ${['base', 'marked', 'long', 'kick', 'intercept'].map(k => cell(B, S => S.exp[k])).join(', ')} | ${['base', 'marked', 'long', 'kick', 'intercept'].map(k => cell(A, S => S.exp[k])).join(', ')} |`);
  const won = res => res.filter(m => m.score[0] > m.score[1]).length/res.length, se = p => Math.sqrt(p*(1 - p)/n);
  console.log(`| Won, score, tries (${y.toLowerCase()} first) | ${(100*won(B)).toFixed(0)} ± ${(100*se(won(B))).toFixed(0)}%, ${mean(B, m => m.score[0]).toFixed(1)}-${mean(B, m => m.score[1]).toFixed(1)}, ${f2(mean(B, m => m.tries[0]))}-${f2(mean(B, m => m.tries[1]))} | ${(100*won(A)).toFixed(0)} ± ${(100*se(won(A))).toFixed(0)}%, ${mean(A, m => m.score[0]).toFixed(1)}-${mean(A, m => m.score[1]).toFixed(1)}, ${f2(mean(A, m => m.tries[0]))}-${f2(mean(A, m => m.tries[1]))} |`);
}
if (run && args[0] === '--balance') { await balance(); process.exit(0); }
if (!run) { /* imported: the tally only */ }

/* ---------- the checks ---------- */
const KN = K ? K.KNOCK : {}, K0 = { ...KN }, setK = o => Object.assign(KN, K0, o), reset = () => Object.assign(KN, K0);

/* 0. KNOCK off is 20cbcaf, draw for draw: AI v AI, the demo, a tool's balance match (the bot, no arcade), the bot's arcade Quick
   Match on Easy, Normal and Hard, a Kids match at its ceiling and Two Player, with their random draws. KNOCK on moves every one
   of them, on purpose: the levers act everywhere (the demo over its first 150 seconds). BASE: GAME=<20cbcaf>/index.html node tools/knock.mjs --pins */
const BASE = 'gfkiiv af2q5q 1682150 xc3q2t 1sgvx41 3whr8x vurlvh i0ho1o 4dor6m';   // GAME=<20cbcaf>/index.html node tools/knock.mjs --pins (2026-11-11), and this build with KNOCK off
const ON = '3mv681 e4k4jm n80rro 1oy4gdg ksahst ot75uq ndxogl wdn3mx oavuie';   // the same with the levers as README.md gives them (2026-11-11): re-pin only from a change to the knock-ons, on purpose
const play = (seed, a, b, o, two) => { reseed(seed); T.newMatch(a, b, { halfLen:60, headless:true, humans:two ? [true, true] : [true, false], ...o }); let n = 0; while (!M().over && n < 200000) { bot(0); if (two) bot(1); T.update(STEP); n++; } return json([M().score, M().tries, M().stats, n]); };
function pins() {
  const out = [], r0 = rndCalls();
  reseed(91); out.push(json(T.simulate(2, 60, 1).map(r => [r.teams, r.score, r.tries, r.stats, r.steps])));
  reseed(92); T.newMatch(X.NATIONS[2], X.NATIONS[1], { halfLen:1e9, diff:1, auto:true, demo:true });
  for (let i = 0; i < 9000; i++) T.update(STEP);
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
if (run && args[0] === '--pins') { if (K) K.KNOCK.on = false; console.log(pins()); process.exit(0); }
if (run && !args.length) {
begin('0 KNOCK off is 20cbcaf');
{
  setK({ on:false }); const off = pins(); reset(); const on = pins();
  ok(off === BASE, `KNOCK off: AI v AI, the demo, a tool's match, Easy, Normal and Hard as played, Kids at its ceiling and Two Player play as 20cbcaf, with the same draws (${off}, pinned ${BASE})`);
  ok(on.split(' ').slice(0, 8).every((h, i) => h !== BASE.split(' ')[i]), `KNOCK on moves every one of them, on purpose: the levers act everywhere (${on})`);
  ok(on === ON, `and plays them as pinned with the levers (${on}, pinned ${ON})`);
}
done('0 KNOCK off is 20cbcaf');

// a staged catch: p of team t takes a ball of `kind` with the other side's nearest man `mark` metres off (99: nobody near); f: the flight's extras
const others = (p, mark) => { for (const q of M().players) if (q.team !== p.team) { q.x = p.x + (q.team === 0 ? -1 : 1)*(30 + q.n); q.y = 5 + q.n*8; q.down = 0; } if (mark < 99) { const q = M().players.find(q => q.team !== p.team); q.x = p.x + mark; q.y = p.y; } };
function catchOne(p, kind, o = {}) {
  const m = M(), b = m.ball;
  m.phase = 'play'; m.set = null; m.cut = null; m.hooter = false; m.contact = null; m.tags = [];
  for (const q of m.players) Object.assign(q, { down:0, bind:null, vx:0, vy:0 });
  p.x = 60; p.y = 35; others(p, o.mark ?? 99);
  b.state = 'air'; b.carrier = null; b.f = { kind:kind === 'kick' ? 'kick' : 'pass', team:kind === 'intercept' ? 1 - p.team : p.team, target:p, long:!!o.long, ...(o.f || {}) };
  let seen = null, pre = null; const spy = globalThis.__knockSpy;
  const k0 = m.stats.knocks, r0 = rndCalls();
  globalThis.__knockSpy = (what, q, v) => { if (what === 'catch') { seen = v; pre = rndCalls() - r0; } };
  K.catchBall(p, kind);
  const draws = rndCalls() - r0;
  globalThis.__knockSpy = spy;
  return { ...seen, knocked:m.stats.knocks > k0, draws, pre };
}
const even = (h, id = 'EVN') => ({ id, name:id, kit:'#1d3a8f', trim:'#f2efe6', pace:3, power:3, handling:h, kicking:3, stamina:3 });
const quick = (o = {}) => T.newMatch(o.a ?? even(o.h ?? 3, 'AAA'), o.b ?? even(o.hb ?? 3, 'BBB'), { halfLen:240, diff:1, headless:true, duels:'off', ...o });

begin('1 the table');
{
  ok(KN.on === true && KN.base === 0.5 && KN.intercept === 0.07 && KN.hit === true && KN.tag === true, `KNOCK: on, base 0.5, intercept 0.07, hit and tag on (${json(KN)})`);
  ok(json(K.KNOCK_OFF) === json({ base:1, intercept:0.2, hit:false, tag:false }), `off, every lever reads 20cbcaf's value (${json(K.KNOCK_OFF)})`);
  ok(['base', 'intercept', 'hit', 'tag'].every(k => K.lv(k) === KN[k]), 'knockLv reads the table while it is on');
  setK({ on:false }); ok(['base', 'intercept', 'hit', 'tag'].every(k => K.lv(k) === K.KNOCK_OFF[k]), 'and 20cbcaf\'s values while it is off, whatever the table says'); reset();
  const src = (await import('node:fs')).readFileSync(new URL('../src/knock.js', import.meta.url), 'utf8');
  ok(/^const KNOCK = \{[^\n]*\};\n\/\/ KNOCK_TUNE\n/m.test(src), 'the table, then the harness\'s marker (KNOCK=\'{"on":false}\' deep-merges into it)');
  const game = (await import('node:fs')).readFileSync(new URL('../game.js', import.meta.url), 'utf8');
  const reads = [...game.matchAll(/knockLv\('([a-z]+)'\)/g)].map(m => m[1]).sort();
  ok(json(reads) === json(['base', 'hit', 'intercept', 'tag']), `each lever is read once, through knockLv (${reads.join(', ')})`);
  ok(!/KNOCK\.(?:base|intercept|hit|tag)\b/.test(game.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')), 'and never straight from the table');
}
done('1 the table');

begin('2 the catch');
{
  for (const h of [1, 3, 5]) {
    quick({ h }); const p = M().players[3], base0 = 0.015 + (5 - h)*0.01;
    const plain = catchOne(p, 'pass'), marked = catchOne(p, 'pass', { mark:1.2 }), long = catchOne(p, 'pass', { long:true }), kick = catchOne(p, 'kick'), ic = catchOne(p, 'intercept');
    ok(plain.pk === base0*0.5 && !plain.marked, `handling ${h}: an unforced catch knocks on ${(100*plain.pk).toFixed(2)}%, half of ${(100*base0).toFixed(2)}%`);
    ok(near(marked.pk, base0*0.5 + 0.04) && marked.marked, `a marked catch keeps its 0.04 (${(100*marked.pk).toFixed(2)}%)`);
    ok(near(long.pk, base0*0.5 + T.contact.LONG.knock) && long.long, `a long pass keeps LONG.knock (${(100*long.pk).toFixed(2)}%)`);
    ok(near(kick.pk, base0*0.5 + 0.05), `a kick keeps its 0.05 (${(100*kick.pk).toFixed(2)}%)`);
    ok(near(ic.pk, base0*0.5 + 0.07), `an interception's term is 0.07 (${(100*ic.pk).toFixed(2)}%)`);
    setK({ on:false });
    const o = [catchOne(p, 'pass'), catchOne(p, 'pass', { mark:1.2 }), catchOne(p, 'pass', { long:true }), catchOne(p, 'kick'), catchOne(p, 'intercept')];
    ok(o[0].pk === base0 && near(o[1].pk, base0 + 0.04) && near(o[2].pk, base0 + T.contact.LONG.knock) && near(o[3].pk, base0 + 0.05) && near(o[4].pk, base0 + 0.2), `KNOCK off: 20cbcaf's ${o.map(v => (100*v.pk).toFixed(2) + '%').join(', ')}`);
    reset();
  }
  // a measured rate, not only the sum: 20000 unforced catches at handling 3 knock on near 1.75%, 3.5% before
  quick({ h:3 }); const p = M().players[3]; reseed(1234);
  let n = 0; for (let i = 0; i < 20000; i++) if (catchOne(p, 'pass').knocked) n++;
  setK({ on:false }); reseed(1234); let n0 = 0; for (let i = 0; i < 20000; i++) if (catchOne(p, 'pass').knocked) n0++; reset();
  ok(near(n/20000, 0.0175, 0.003) && near(n0/20000, 0.035, 0.004) && n < n0, `20000 staged unforced catches (handling 3): ${n} knocked on, ${n0} with KNOCK off`);
  // the multipliers still act on the whole chance: On Fire, Safe Hands, Kids, Team Spirit
  quick({ h:3, arcade:true, humans:[true, false] }); const q = M().players[3];
  M().fire[0].t = 5; const fire = catchOne(q, 'pass'); M().fire[0].t = 0;
  ok(near(fire.pk, 0.035*0.5*T.arcade.ARCADE.fire.hands), `On Fire halves what is left (${(100*fire.pk).toFixed(3)}%)`);
  q.tr = { safe:true }; const safe = catchOne(q, 'pass', { mark:1.2 }); q.tr = null;
  ok(near(safe.pk, (0.035*0.5 + 0.04)*T.traits.TRAIT.safe.hands), `Safe Hands a tenth of it (${(100*safe.pk).toFixed(3)}%)`);
  T.newMatch(even(3, 'AAA'), even(3, 'BBB'), { halfLen:240, diff:0, headless:true, duels:'off', kids:true, kidsR:1 });
  const kid = catchOne(M().players[3], 'kick'), cpuKid = catchOne(M().players[10], 'kick');
  ok(near(kid.pk, (0.035*0.5 + 0.05)*T.kids.KIDS.hands) && near(cpuKid.pk, 0.035*0.5 + 0.05), `Kids: your side's ${(100*kid.pk).toFixed(2)}%, the CPU's ${(100*cpuKid.pk).toFixed(2)}%`);
}
done('2 the catch');

begin('3 one draw a catch');
{
  // every catch draws one number, knocked on or not, whatever its chance; with KNOCK on and off the same seed draws the same number,
  // and the outcome differs only where that number falls between the two chances
  let bad = 0, moved = 0, wrong = 0, drawsBad = 0, N = 0;
  for (const kind of ['pass', 'kick', 'intercept']) for (const mark of [99, 1.2]) for (const h of [1, 3, 5]) {
    quick({ h }); const p = M().players[4];
    for (let i = 0; i < 300; i++) {
      reseed(5000 + i); const on = catchOne(p, kind, { mark });
      setK({ on:false }); reseed(5000 + i); const off = catchOne(p, kind, { mark }); reset();
      N++;
      if (on.r !== off.r) bad++;
      if (on.draws !== off.draws && on.knocked === off.knocked) drawsBad++;
      if (on.knocked !== off.knocked) { moved++; if (!(on.r >= on.pk && on.r < off.pk)) wrong++; }
    }
  }
  ok(bad === 0, `the same seed draws the same number with KNOCK on and off (${N - bad} of ${N})`);
  ok(drawsBad === 0, 'and the same count of draws through the catch, whenever the outcome is the same');
  ok(moved > 0 && wrong === 0, `only the outcome moves: ${moved} of ${N} catches held now that were knocked on, every one with its number between the two chances`);
  // catchBall itself draws one number before it decides, whatever the chance, held or knocked on
  { let n = 0, one = 0, held = 0, dropped = 0;
    for (const on of [true, false]) { if (!on) setK({ on:false }); for (const h of [1, 5]) { quick({ h }); const p = M().players[4]; for (let i = 0; i < 300; i++) { reseed(9000 + i); const o = catchOne(p, ['pass', 'kick', 'intercept'][i % 3], { mark:i % 2 ? 1.2 : 99 }); n++; if (o.pre === 1) one++; if (o.knocked) dropped++; else held++; } } reset(); }
    ok(one === n && held > 0 && dropped > 0, `every catch draws exactly one number before it decides (${one} of ${n}: ${held} held, ${dropped} knocked on, KNOCK on and off)`); }
  // a full match: up to the first catch whose outcome differs, every catch sees the same draw at the same point in the stream
  const trace = () => { const out = []; globalThis.__knockSpy = (w, q, v) => { if (w === 'catch') out.push([rndCalls(), v.r, v.r < v.pk]); }; play(77, X.NATIONS[0], X.NATIONS[3], { diff:1, duels:'live', arcade:true }); delete globalThis.__knockSpy; return out; };
  const a = trace(); setK({ on:false }); const b = trace(); reset();
  const first = a.findIndex((v, i) => !b[i] || v[2] !== b[i][2]);
  ok(first > 0 && a.slice(0, first + 1).every((v, i) => v[0] - a[0][0] === b[i][0] - b[0][0] && v[1] === b[i][1]), `a played match: its first ${first + 1} catches draw the same numbers at the same points, KNOCK on or off, up to the first one it holds that it dropped before`);
}
done('3 one draw a catch');

// a made tackle of tier `tier` by q on c, ended at once (resolveContact): what the jolt saw
function jolt(c, q, tier = 'dom') {
  const m = M(), b = m.ball;
  m.phase = 'play'; m.set = null; m.cut = null; m.hooter = false; m.contact = null; m.tags = []; m.pressure[0] = m.pressure[1] = 0;
  for (const p of m.players) Object.assign(p, { down:0, bind:null, vx:0, vy:0, tcd:0 });
  for (const p of m.players) if (p !== c && p !== q) { p.x = 60 + (p.team ? 30 : -30); p.y = 5 + p.n*8; }
  c.x = 60; c.y = 35; q.x = 61; q.y = 35;
  b.state = 'held'; b.carrier = c; b.f = null; m.poss = c.team;
  const k = { c, q, q2:null, mode:'ai', tier, t:0, T:0.25, v0:{ x:0, y:0 }, front:true, aiOff:null, offloaded:false, margin:-0.5, margin0:-0.5, hit:false, dp:0, cSprint:false };
  c.bind = k; q.bind = k; m.contact = k;
  let seen = null; globalThis.__knockSpy = (w, p, v) => { if (w === 'jolt') seen = v; };
  const r0 = rndCalls(); K.resolveContact(k); const draws = rndCalls() - r0;
  delete globalThis.__knockSpy;
  return { ...seen, draws, jolted:!!seen && seen.rj < seen.jolt*seen.kj };
}
const AR = T.arcade.ARCADE;

begin('4 the Big Hit\'s spill');
{
  const spills = (o, ct) => { quick({ arcade:true, ...o }); const c = M().players.find(p => p.team === ct), q = M().players.find(p => p.team !== ct); return jolt(c, q).spill; };
  ok(spills({ humans:[true, false] }, 1) === AR.hit.jolt, `your Big Hit on the CPU's carrier spills ${AR.hit.jolt} more`);
  ok(spills({ humans:[true, false] }, 0) === 0, 'the CPU\'s Big Hit on yours: nothing more (it was 0.12)');
  ok(spills({ humans:[false, true] }, 0) === AR.hit.jolt && spills({ humans:[false, true] }, 1) === 0, 'and the same playing as the away side');
  ok(spills({ humans:[true, true], levels:[1, 1] }, 0) === AR.hit.jolt && spills({ humans:[true, true], levels:[1, 1] }, 1) === AR.hit.jolt, 'Two Player: both sides are a person\'s, so both keep it');
  ok(spills({ auto:true }, 0) === 0 && spills({ auto:true }, 1) === 0 && !M().arcade, 'AI v AI: no arcade, nothing, asked for it or not');
  ok(spills({ humans:[true, false], arcade:false }, 0) === 0 && spills({ humans:[true, false], arcade:false }, 1) === 0, 'a tool\'s balance match (no arcade): nothing');
  quick({ arcade:true, humans:[true, false] }); { const c = M().players.find(p => p.team === 1), q = M().players.find(p => p.team === 0), w = jolt(c, q, 'wrap'); ok(w.spill === 0, 'a Wrap: nothing'); }
  setK({ on:false });
  ok(spills({ humans:[true, false] }, 0) === AR.hit.jolt && spills({ humans:[true, false] }, 1) === AR.hit.jolt, 'KNOCK off: any Big Hit in a match you play, as 20cbcaf');
  reset();
  // the rate: 6000 Big Hits each way at handling 3, the jolt 9% plus your spill, and one draw for it whatever its size
  const rate = (ct, off) => {
    if (off) setK({ on:false });
    quick({ arcade:true, humans:[true, false] }); const c = M().players.find(p => p.team === ct), q = M().players.find(p => p.team !== ct);
    let j = 0; const rs = [];
    for (let i = 0; i < 6000; i++) { reseed(777 + i); const o = jolt(c, q); if (o.jolted) j++; rs.push(o.rj); }
    reset(); return { j:j/6000, rs };
  };
  const mine = rate(1), theirs = rate(0), theirs0 = rate(0, true);
  ok(near(mine.j, 0.09 + AR.hit.jolt, 0.012), `your Big Hit jolts the ball loose ${(100*mine.j).toFixed(1)}% (9 + 12)`);
  ok(near(theirs.j, 0.09, 0.01) && near(theirs0.j, 0.09 + AR.hit.jolt, 0.012), `the CPU's on you ${(100*theirs.j).toFixed(1)}%, ${(100*theirs0.j).toFixed(1)}% before`);
  ok(theirs.rs.every((r, i) => r === theirs0.rs[i]), 'the same draws with the spill or without it: only the outcome moves');
}
done('4 the Big Hit\'s spill');

begin('5 the interception');
{
  // an interception a CPU pass runs into: the roll pI is as it was, and the catch after it knocks on at the base plus 0.07
  quick({ h:3, humans:[true, false] }); const p = M().players[4];
  const ic = catchOne(p, 'intercept'), icM = catchOne(p, 'intercept', { mark:1.2 });
  ok(near(ic.pk, 0.0175 + 0.07) && near(icM.pk, 0.0175 + 0.07 + 0.04), `yours: ${(100*ic.pk).toFixed(2)}% clear, ${(100*icM.pk).toFixed(2)}% marked (23.5% and 27.5% before)`);
  const cpu = catchOne(M().players[10], 'intercept');
  ok(near(cpu.pk, ic.pk), `the CPU's the same (${(100*cpu.pk).toFixed(2)}%): the lever is the catch's, everywhere`);
  ok(/const pI = ringed\(q\) \? 0\.4 : /.test((await import('node:fs')).readFileSync(new URL('../src/ball.js', import.meta.url), 'utf8')), 'the roll for the interception itself is untouched (src/ball.js)');
}
done('5 the interception');

begin('6 the tag');
{
  quick({ h:3, humans:[true, false], arcade:true }); const p = M().players[4];
  let o; for (let i = 0; i < 200 && !(o && o.knocked); i++) { reseed(300 + i); o = catchOne(p, 'pass', { mark:1.2 }); }
  const t = M().tags.find(t => t.text === 'Knock-On');
  ok(o.knocked && t && t.x === p.x && t.y === p.y && M().tags.filter(t => t.text === 'Knock-On').length === 1, 'a knock-on at the catch: Knock-On over the man who dropped it, once');
  ok(M().stats['tag_Knock-On'] === 1, 'counted as the other tags are');
  ok(/^[A-Z][a-z]+-[A-Z][a-z]+$/.test('Knock-On') && !/[←→]/.test(t.text), 'Title Case, no arrow');
  // the jolt's and the offload's knock-ons say it too
  quick({ h:3, humans:[true, false], arcade:true }); { const c = M().players.find(p => p.team === 1), q = M().players.find(p => p.team === 0); let w; for (let i = 0; i < 400; i++) { reseed(600 + i); const k0 = M().stats.joltKnock || 0; w = jolt(c, q); if ((M().stats.joltKnock || 0) > k0) break; } ok(M().tags.some(t => t.text === 'Knock-On' && t.x === c.x), 'a ball jolted forward in the tackle: Knock-On over the carrier'); }
  // drawing only: a match with the tag and without it is the same match, draw for draw, but for the count of the tag
  const one = tag => { setK({ tag }); reseed(41); T.newMatch(X.NATIONS[0], X.NATIONS[3], { halfLen:60, headless:true, humans:[true, false], diff:1, duels:'live', arcade:true }); const r0 = rndCalls(); let n = 0; while (!M().over && n < 200000) { bot(0); T.update(STEP); n++; } const s = { ...M().stats }, tags = s['tag_Knock-On'] || 0; delete s['tag_Knock-On']; reset(); return { j:json([M().score, M().tries, s, n, rndCalls() - r0]), tags, knocks:M().stats.knocks }; };
  const a = one(true), b = one(false);
  ok(a.j === b.j && a.tags === a.knocks && a.knocks > 0 && b.tags === 0, `the tag draws nothing and moves nothing: the same match with it or without it (${a.tags} tags for ${a.knocks} knock-ons)`);
  T.newMatch(0, 1, { halfLen:60, diff:1, auto:true, headless:true }); { const q = M().players[4]; let w; for (let i = 0; i < 400 && !(w && w.knocked); i++) { reseed(700 + i); w = catchOne(q, 'pass', { mark:1.2 }); } ok(w.knocked && !M().tags.length, 'AI v AI and the demo tag nothing, as ever (tag, src/contact.js)'); }
  setK({ on:false }); quick({ h:3, humans:[true, false], arcade:true }); { const q = M().players[4]; let w; for (let i = 0; i < 400 && !(w && w.knocked); i++) { reseed(800 + i); w = catchOne(q, 'pass', { mark:1.2 }); } ok(w.knocked && !M().tags.length && !M().stats['tag_Knock-On'], 'KNOCK off: no tag, as 20cbcaf'); } reset();
}
done('6 the tag');

begin('7 everywhere');
{
  // the same levers in AI v AI, the demo and Two Player, so the game reads the same to watch as to play
  const at = o => { T.newMatch(even(3, 'AAA'), even(3, 'BBB'), { halfLen:240, diff:1, headless:true, duels:'off', ...o }); return [catchOne(M().players[4], 'pass').pk, catchOne(M().players[10], 'intercept').pk]; };
  const want = json([0.0175, 0.0875]);
  ok(json(at({ auto:true }).map(v => +v.toFixed(6))) === want, 'AI v AI');
  ok(json(at({ auto:true, demo:true, halfLen:1e9 }).map(v => +v.toFixed(6))) === want, 'the demo');
  ok(json(at({ humans:[true, true], levels:[1, 1], arcade:true }).map(v => +v.toFixed(6))) === want, 'Two Player');
  ok(json(at({ humans:[true, false] }).map(v => +v.toFixed(6))) === want, 'a tool\'s balance match');
}
done('7 everywhere');

begin('8 the words and the files');
{
  const fs = await import('node:fs'), read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
  const readme = read('README.md'), big = readme.split('\n').find(l => l.startsWith('- **Big Hit.**'));
  ok(big && /CPU's Big Hit on yours/.test(big) && /12 points/.test(big), 'README: the Big Hit spills more only when it is yours, as the code has it');
  ok(/^### Catching and knock-ons$/m.test(readme) && readme.includes('`KNOCK`') && readme.includes('KNOCK=\'{"on":false}\''), 'README: Catching and knock-ons, with the table and KNOCK off');
  ok(/\['knock', \['tools\/knock\.mjs'\]\]/.test(read('tools/check.mjs')) && /tools\/knock\.mjs/.test(read('tools/CHECKS.md')), 'in the default gate, and in CHECKS.md');
  ok(/"edge\.js",\s*"knock\.js",/.test(read('src/manifest.json')), 'src/knock.js is built after src/edge.js');
}
done('8 the words and the files');

console.log(`\nKnock-ons: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
}
