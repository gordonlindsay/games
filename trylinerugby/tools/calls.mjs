// Possession calls and the interception rules (src/calls.js; README.md, Possession calls): each path's call, its colour and its sound
// (your side's own loose ball Picked Up, an interception, a ruck turnover, a pressure turnover, a silent offload in Pro Mode), the
// banners in the winner's colour, On Fire waiting for its moment's banner, the Line Break held after a turnover, the call's place in the
// two-tag cap, no interception out of the passer's hands, nobody down, retiring or offside intercepting, taking a missed pass or picking
// up a loose ball, Kids and Minis without the beat, AI v AI and the demo silent, reduced motion without the flash, where the call stands
// (chosen once, never jumping, never on the other player's man, waiting for a man off the frame), your own kick's ring on a man who may
// play it, every side's colour readable on the plate, and CALLS off playing exactly as b4a25d5, the build before, draw for draw.
// node tools/calls.mjs              (SEED=23 unless set; VERBOSE=1 lists every check; SHOTS=<dir> moves the screenshots; NO_BROWSER=1 skips them)
// node tools/calls.mjs --pins       prints this build's fingerprints with CALLS (and CHASE) off; GAME=<b4a25d5>/index.html node tools/calls.mjs --pins pinned BASE
// node tools/calls.mjs --balance [ai|bot|casual|all]   README.md's before-and-after interception tables: seeded matches with CALLS off and
//                                   on (minutes; never in check.mjs; JOBS, CL_AI, CL_BOT, CL_CASUAL for the matches, CL_DIFFS='1' for one level)
process.env.SEED ??= process.argv.includes('--balance') ? '7' : '23';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { T, reseed, rndCalls, bot } = await import('./harness.mjs');
const X = T.teams, D = T.debug, CL = T.calls, E = T.edge, STEP = T.STEP, M = () => T.M;
const args = process.argv.slice(2);
let passed = 0, failed = 0, group = '';
const ok = (cond, msg) => { if (cond) passed++; else failed++; if (!cond || process.env.VERBOSE) console.log(cond ? 'ok  ' : 'FAIL', group + ':', msg); };
const begin = name => { group = name; }, done = () => console.log(`${group.padEnd(34)} ${failed ? 'FAIL so far ' + failed : 'ok'} (${passed} passed)`);
const json = v => JSON.stringify(v), near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
const self = fileURLToPath(import.meta.url), run = !!process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

/* ---------- the measurements: every interception of a match, by side and by where the ball was, through globalThis.__knockSpy (src/match.js), which draws nothing ---------- */
function tally() {
  const side = () => ({ ic:0, icClean:0, near:0, retiring:0, calls:{} });
  const t = { s:[side(), side()] };
  globalThis.__knockSpy = (what, p, o) => {
    if (what !== 'catch' || o.kind !== 'intercept') return;
    const b = M().ball, f = b.f, S = t.s[p.team];
    S.ic++; if (o.r >= o.pk) S.icClean++;
    if (f && Math.hypot(b.x - f.x0, b.y - f.y0) < 1.5) S.near++;   // out of the passer's hands, by CALLS.release
    if (p.offside > 0) S.retiring++;
  };
  return t;
}
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
  delete globalThis.__knockSpy;
  const s = M().stats;
  for (const k of Object.keys(s)) if (k.startsWith('call_')) t.s[+k.slice(-1)].calls[k.slice(5, -1)] = s[k];
  return { ...res, s:t.s, turn:s.turnovers || 0, toRuck:s.toRuck || 0, pressTurn:s.pressTurn || 0 };
}
if (run && args[0] === '--job') {
  const o = JSON.parse(args[1]), out = [];
  for (let i = o.lo; i < o.hi; i++) out.push(await oneMatch(o, +process.env.SEED*100000 + i));
  await new Promise(done => process.stdout.write(json(out), done)); process.exit(0);   // exit once it is written: an exit straight after can cut the answer short
}
function fan(spec, n, env) {                               // matches 0..n-1 over JOBS processes, in order, with env on top (CALLS off, say)
  const jobs = +process.env.JOBS || Math.min(8, os.cpus().length), per = Math.ceil(n/jobs), parts = [];
  for (let lo = 0; lo < n; lo += per) parts.push({ ...spec, lo, hi:Math.min(n, lo + per) });
  return Promise.all(parts.map(o => new Promise((good, bad) => {
    const p = spawn(process.execPath, [self, '--job', json(o)], { env:{ ...process.env, ...env }, stdio:['ignore', 'pipe', 'inherit'] });
    let s = ''; p.stdout.on('data', d => { s += d; }); p.on('close', code => (code ? bad(new Error('job failed')) : good(JSON.parse(s))));
  }))).then(r => r.flat());
}
const OFF = { CALLS:'{"on":false}' };
async function balance() {
  const what = args[1] || 'all', rows = [];
  const N = { ai:+process.env.CL_AI || 120, bot:+process.env.CL_BOT || 80, casual:+process.env.CL_CASUAL || 100 };
  if (what === 'ai' || what === 'all') rows.push({ label:'AI v AI, Normal, 4-minute halves', spec:{ kind:'ai', diff:1, half:240 }, n:N.ai, sides:['Home', 'Away'] });
  if (what === 'bot' || what === 'all') for (const diff of (process.env.CL_DIFFS || '0,1,2').split(',').map(Number)) rows.push({ label:`Bot v CPU as played, ${['Easy', 'Normal', 'Hard'][diff]}, 2-minute halves`, spec:{ kind:'bot', diff, half:120 }, n:N.bot, sides:['You', 'CPU'] });
  if (what === 'casual' || what === 'all') rows.push({ label:'Casual adult v CPU as played, Easy, 2-minute halves', spec:{ kind:'casual', diff:0, half:120 }, n:N.casual, sides:['You', 'CPU'] });
  for (const row of rows) {
    const before = await fan(row.spec, row.n, OFF), after = await fan(row.spec, row.n, {});
    report(row, before, after);
  }
}
const mean = (res, f) => res.reduce((a, m) => a + f(m), 0)/res.length;
const f2 = v => v.toFixed(2);
function report(row, B, A) {
  const n = B.length, [y, c] = row.sides, cell = (res, f) => `${f2(mean(res, m => f(m.s[0])))} / ${f2(mean(res, m => f(m.s[1])))}`;
  console.log(`\n${row.label}: ${n} seeded matches (SEED ${process.env.SEED}), CALLS off (b4a25d5) then on. ${y} / ${c}, a match`);
  console.log('| | Before | After |');
  console.log('|---|---|---|');
  console.log(`| Interceptions (knocked on or clean) | ${cell(B, S => S.ic)} (${f2(mean(B, m => m.s[0].ic + m.s[1].ic))}) | ${cell(A, S => S.ic)} (${f2(mean(A, m => m.s[0].ic + m.s[1].ic))}) |`);
  console.log(`| Clean interceptions | ${cell(B, S => S.icClean)} | ${cell(A, S => S.icClean)} |`);
  console.log(`| Inside 1.5m of the release | ${cell(B, S => S.near)} | ${cell(A, S => S.near)} |`);
  console.log(`| By a man retiring | ${cell(B, S => S.retiring)} | ${cell(A, S => S.retiring)} |`);
  console.log(`| Turnovers (ruck, a loose ball won) | ${f2(mean(B, m => m.turn))} (${f2(mean(B, m => m.toRuck))}, ${f2(mean(B, m => m.turn - m.toRuck))}) | ${f2(mean(A, m => m.turn))} (${f2(mean(A, m => m.toRuck))}, ${f2(mean(A, m => m.turn - m.toRuck))}) |`);
  const calls = ['PickedUp', 'Intercepted', 'Turnover', 'Offload'];
  console.log(`| Calls: ${calls.join(', ')} | | ${calls.map(k => f2(mean(A, m => m.s[0].calls[k] || 0))).join(', ')} |`);
  const won = res => res.filter(m => m.score[0] > m.score[1]).length/res.length, se = p => Math.sqrt(p*(1 - p)/n);
  console.log(`| Won, score, tries (${y.toLowerCase()} first) | ${(100*won(B)).toFixed(0)} ± ${(100*se(won(B))).toFixed(0)}%, ${mean(B, m => m.score[0]).toFixed(1)}-${mean(B, m => m.score[1]).toFixed(1)}, ${f2(mean(B, m => m.tries[0]))}-${f2(mean(B, m => m.tries[1]))} | ${(100*won(A)).toFixed(0)} ± ${(100*se(won(A))).toFixed(0)}%, ${mean(A, m => m.score[0]).toFixed(1)}-${mean(A, m => m.score[1]).toFixed(1)}, ${f2(mean(A, m => m.tries[0]))}-${f2(mean(A, m => m.tries[1]))} |`);
}
if (run && args[0] === '--balance') { await balance(); process.exit(0); }

/* ---------- the checks ---------- */
const memory = {};
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; } };
const said = []; document.createTextNode = t => { said.push(String(t)); return {}; };   // every banner the game says
const made = [], mk = document.createElement; document.createElement = t => { const e = mk(t); made.push(e); return e; };   // and its parts: the colour is the message's --k
const heard = []; globalThis.__sfxSpy = k => { heard.push(k); };                         // every sound it asks for
const settings = D.settings();
const ready = (diff = 1) => { settings.played = 99; settings.diff = diff; settings.kids = false; settings.half = 0; };
const lastMsg = () => made.filter(e => /^msg/.test(e.className)).pop();
const bannerCol = () => { const e = lastMsg(); return e ? e.style.getPropertyValue('--k') : null; };
const calls = () => M().tags.filter(t => t.call);
const CC = CL ? CL.CALLS : null, C0 = CC ? { ...CC } : null, setC = o => Object.assign(CC, C0, o), resetC = () => Object.assign(CC, C0);
const KN = T.knock && T.knock.KNOCK;

/* 0. CALLS off is b4a25d5, draw for draw: AI v AI, the demo, a tool's balance match (the bot, no arcade), the bot's arcade Quick Match on
   Easy, Normal and Hard, a Kids match at its ceiling and Two Player, with their random draws. CALLS on moves every one: the interception
   rules act everywhere, and the calls count their tags. BASE: GAME=<b4a25d5>/index.html node tools/calls.mjs --pins */
const BASE = '7v2oz 1up177z 1luwyz1 jn1hak 1nn3ygy 1645i86 1obpoq6 rpe3ql rey759';   // GAME=<b4a25d5>/index.html node tools/calls.mjs --pins (2026-11-13), and this build with CALLS off
const ON = 'tm442c 1jf7qng 1isduw e2nt7f nplown 1a1o3mj 8kx00t 1eocqcd 13sy72b';   // the same with CALLS as README.md gives it (2026-11-13), the kick chase off: wt/calls' pins (a032b3a); re-pin only from a change to the calls or the interception rules, on purpose
// The kick chase (CHASE, src/chase.js, 2026-11-13, merged at 1.6) acts on every open-play kick: BASE and ON are run with it off (BASE b4a25d5
// exactly, ON the calls alone as wt/calls pinned them), and SHIPS is the game as it ships at 1.6, both on (2026-11-14): re-pin only from a
// change to the calls, the interception rules or the chase, on purpose
const CS = T.chase && T.chase.CHASE, CS0 = !!(CS && CS.on);
const SHIPS = 'j2z3up 1jf7qng 1isduw e2nt7f 1ad2kpp 1a1o3mj 8kx00t 1eocqcd 1su0y3m';
const play = (seed, a, b, o, two) => { reseed(seed); T.newMatch(a, b, { halfLen:60, headless:true, humans:two ? [true, true] : [true, false], ...o }); let n = 0; while (!M().over && n < 200000) { bot(0); if (two) bot(1); T.update(STEP); n++; } return json([M().score, M().tries, M().stats, n]); };
function pins() {
  const out = [], r0 = rndCalls();
  reseed(81); out.push(json(T.simulate(2, 60, 1).map(r => [r.teams, r.score, r.tries, r.stats, r.steps])));
  reseed(82); T.newMatch(X.NATIONS[2], X.NATIONS[1], { halfLen:1e9, diff:1, auto:true, demo:true });
  for (let i = 0; i < 9000; i++) T.update(STEP);
  out.push(json([M().score, M().stats, M().players.map(p => [p.x.toFixed(5), p.y.toFixed(5)])]));
  out.push(play(83, X.CLUBS[0], X.CLUBS[1], { diff:1, duels:'live' }));
  out.push(play(84, X.NATIONS[0], X.NATIONS[3], { diff:0, duels:'live', arcade:true }));
  out.push(play(85, X.NATIONS[1], X.NATIONS[4], { diff:1, duels:'live', arcade:true }));
  out.push(play(86, X.NATIONS[5], X.NATIONS[2], { diff:2, duels:'live', arcade:true }));
  out.push(play(87, X.CLUBS[0], X.CLUBS[11], { diff:0, duels:'live', arcade:true, kids:true, kidsR:1 }));
  out.push(play(88, X.CLUBS[0], X.CLUBS[11], { duels:'off', arcade:true, levels:[1, 1] }, true));
  out.push(String(rndCalls() - r0));
  return out.map(fnv).join(' ');
}
if (run && args[0] === '--pins') { if (CL) CL.CALLS.on = false; if (CS) CS.on = false; console.log(pins()); process.exit(0); }
if (!run) { /* imported */ }

begin('0 CALLS off is b4a25d5');
{
  if (CS) CS.on = false;                                  // the calls' own proof with the kick chase off: b4a25d5 with both off, wt/calls' pins with the calls alone
  setC({ on:false }); const off = pins(); resetC(); const on = pins();
  if (CS) CS.on = CS0; const ships = pins();
  ok(off === BASE, `CALLS off (and the kick chase): AI v AI, the demo, a tool's match, Easy, Normal and Hard as played, Kids at its ceiling and Two Player play as b4a25d5, with the same draws (${off}, pinned ${BASE})`);
  ok(on.split(' ').slice(0, 8).every((h, i) => h !== BASE.split(' ')[i]), `CALLS on moves every one of them, on purpose: the interception rules act everywhere (${on})`);
  ok(on === ON, `and plays them as pinned, the kick chase off, as wt/calls (a032b3a) (${on}, pinned ${ON})`);
  ok(ships === SHIPS, `and with the kick chase too, as the game ships at 1.6 (${ships}, pinned ${SHIPS})`);
}
done();

begin('1 the table');
{
  ok(json(CC) === json({ on:true, call:true, life:0.9, hold:1.0, flash:0.4, beat:80, colour:true, fire:true, lbGap:1.0, release:1.5, fit:true, kicks:true }), `CALLS as README.md gives it (${json(CC)})`);
  ok(json(CL.CALLS_OFF) === json({ call:false, life:0, hold:0, flash:0, beat:0, colour:false, fire:false, lbGap:0, release:0, fit:false, kicks:false }), 'off, every lever reads b4a25d5\'s value: nothing');
  const keys = Object.keys(CL.CALLS_OFF);
  ok(keys.every(k => CL.lv(k) === CC[k]), 'callsLv reads the table while it is on');
  setC({ on:false }); ok(keys.every(k => CL.lv(k) === CL.CALLS_OFF[k]), 'and b4a25d5\'s values while it is off, whatever the table says'); resetC();
  const src = fs.readFileSync(new URL('../src/calls.js', import.meta.url), 'utf8');
  ok(/^const CALLS = \{[^\n]*\};\n\/\/ CALLS_TUNE\n/m.test(src), 'the table, then the harness\'s marker (CALLS=\'{"on":false}\' deep-merges into it)');
  const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8'), bare = game.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
  const reads = new Set([...bare.matchAll(/callsLv\('([a-zA-Z]+)'\)/g)].map(m => m[1]));
  ok(keys.every(k => reads.has(k)) && [...reads].every(k => keys.includes(k)), `every lever is read through callsLv (${[...reads].sort().join(', ')})`);
  ok(!/CALLS\.(?:call|life|hold|flash|beat|colour|fire|lbGap|release|fit|kicks)\b/.test(bare), 'and never straight from the table');
  ok(fs.readFileSync(new URL('./harness.mjs', import.meta.url), 'utf8').includes("js.replace('// CALLS_TUNE'"), 'the harness takes CALLS=');
  const man = JSON.parse(fs.readFileSync(new URL('../src/manifest.json', import.meta.url), 'utf8'));
  ok(man.indexOf('calls.js') > man.indexOf('knock.js') && man.indexOf('calls.js') < man.indexOf('ball.js'), 'src/calls.js is in the bundle, after the knock-ons and before the ball');
}
done();

/* A staged scene: your side and theirs far apart, nobody down or bound, the ball wherever the check puts it */
const scene = (o = {}) => {
  T.newMatch(o.a || X.NATIONS[0], o.b || X.NATIONS[1], { halfLen:600, headless:false, humans:o.humans || [true, false], duels:'off', diff:o.diff ?? 1, ...o });
  D.setMode('match');
  const m = M(); m.phase = 'play'; m.set = null; m.clock = 30; m.cut = null; m.contact = null; m.tags = []; m.stop = 0; m.shake = 0; m.flash = null;
  for (const p of m.players) { p.x = p.team ? 90 + p.n : 25 + p.n; p.y = 5 + p.n*8; p.vx = p.vy = 0; p.down = 0; p.bind = null; p.offside = 0; p.tcd = 0; p.drawFrom = null; }
  said.length = 0; heard.length = 0; made.length = 0;
  return m;
};
const loose = (m, x, y, last, o = {}) => { const b = m.ball; Object.assign(b, { state:'loose', carrier:null, f:null, x, y, z:0, vx:0, vy:0, vz:0, last, kickInfo:o.kick ? { team:last, ownHalf:false } : null, egg:null, tumble:null }); if (b.off) b.off = null; return b; };
const ctrl = t => T.sides.ctrlOf(t);
const CAMS = ['Top', 'Low', 'Mid', 'High'];                // settings.cam's order (src/render-behind.js); a new player starts on Mid (2)
const seedFor = (f, from = 100) => { for (let s = from; s < from + 400; s++) { reseed(s); if (f()) return s; } return null; };   // a seed under which a staged roll comes out as the check needs

begin('2 each path: its call, its colour, its sound');
{
  // Picked Up: your own ball loose, your man gathers it
  let m = scene(); const p = m.players[4]; T.sides.setCtrl(0, m.players[1]);
  p.x = 60; p.y = 35; loose(m, 60.3, 35, 0);
  let r0 = rndCalls(); CL.updateLoose(STEP);
  let c = calls()[0];
  ok(m.ball.carrier === p && ctrl(0) === p, 'your own loose ball: your man nearest it gathers it, and the ring goes to him');
  ok(c && c.text === 'Picked Up' && c.p === p && c.k === CL.callInk(0) && m.tags.length === 1, `called over him: ${c && c.text}, in your colour (${c && c.k})`);
  ok(heard.join() === 'catch,gather', `the catch, then the Gather sound (${heard.join(', ')})`);
  ok(m.flash && m.flash.p === p && m.flash.t === 0, 'his ring flashes');
  ok(m.stop === 0 && !said.length, 'no beat and no banner: the ball was yours already');
  ok(rndCalls() === r0 && (m.stats.call_PickedUp0 || 0) === 1, 'it draws no random number, and is counted');
  // a kick is anyone's: gathered, it is Picked Up, whoever kicked it
  m = scene(); const k = m.players[5]; k.x = 50; k.y = 30; loose(m, 50.2, 30, 1, { kick:true });
  CL.updateLoose(STEP); c = calls()[0];
  ok(m.ball.carrier === k && c && c.text === 'Picked Up' && m.stop === 0 && !said.length, 'the CPU\'s kick, bounced and gathered: Picked Up, no beat, no Turnover (a kick is anyone\'s)');
  // a kick-off and a drop-out are kicks too: the CPU's, bounced and gathered by yours, is Picked Up with no beat, and no Turnover
  const restart = (kind, on = true) => {
    if (!on) setC({ on:false });
    const m = scene(), g = m.players[5]; g.x = 47; g.y = 35;
    CL.kickBall(1, 60, 35, 47.3, 35, 2.2, 11, 'restart');
    Object.assign(m.ball, { state:'loose', f:null, x:47.3, y:35, z:0, vx:0, vy:0, vz:0 });   // down off its bounce, as updateBallAir leaves it
    said.length = 0; heard.length = 0; CL.updateLoose(STEP);
    const r = { m, g, c:calls()[0], said:said.join(), heard:heard.join() };
    if (!on) resetC();
    return r;
  };
  let R = restart();
  ok(R.m.ball.carrier === R.g && R.c && R.c.text === 'Picked Up' && R.m.stop === 0 && !R.said && !R.m.stats.turnovers && R.heard === 'catch,gather', `the CPU's kick-off off the bounce, gathered by yours: Picked Up, no beat, no Turnover banner or count (${R.c && R.c.text}, ${R.heard})`);
  R = restart('restart', false);
  ok(R.m.ball.carrier === R.g && !R.c && R.said === 'Turnover' && R.m.stats.turnovers === 1, 'CALLS off: a Turnover, as b4a25d5 counted it');
  // Intercepted
  m = scene(); const q = m.players[5], f = { kind:'pass', team:1, x0:66, y0:35, x1:56, y1:35, t:0.2, T:0.6, H:0.5, z0:1.1, z1:1.1, rolled:new Set(), onside:null, target:m.players[9], sure:false, boost:null, long:false };
  q.x = 62; q.y = 35;
  const seed = seedFor(() => { scene(); Object.assign(M().ball, { state:'air', f:{ ...f, rolled:new Set() }, x:62.2, y:35, z:1 }); Object.assign(M().players[5], { x:62, y:35 }); CL.catchBall(M().players[5], 'intercept'); return M().ball.carrier === M().players[5]; });
  m = M(); c = calls()[0];
  ok(seed != null && m.stats.intercepts === 1 && ctrl(0) === m.players[5], `your man intercepts the CPU's pass and the ring has him (seed ${seed})`);
  ok(said.join() === 'Intercepted' && bannerCol() === CL.callInk(0), `Intercepted in your colour (${said.join()}, ${bannerCol()}; it was the yellow for either side)`);
  ok(c && c.text === 'Intercepted' && c.p === m.players[5] && c.k === CL.callInk(0), 'called over him');
  ok(heard.includes('gather') && m.flash && near(m.stop, CC.beat/1000) && !(m.shake > 0), `the Gather sound, the flash and a ${CC.beat}ms beat with no shake: the ball came your way`);
  // the CPU intercepting yours: its banner in its colour is all
  seedFor(() => { scene(); Object.assign(M().ball, { state:'air', f:{ ...f, team:0, rolled:new Set(), target:M().players[2] }, x:62.2, y:35, z:1 }); Object.assign(M().players[9], { x:62, y:35 }); CL.catchBall(M().players[9], 'intercept'); return M().ball.carrier === M().players[9]; });
  m = M();
  ok(said.join() === 'Intercepted' && bannerCol() === CL.callInk(1) && !calls().length && !heard.includes('gather') && !m.flash && m.stop === 0, `the CPU intercepts yours: Intercepted in its colour (${bannerCol()}), and no call, sound, flash or beat`);
  // a ruck turnover: your side wins the CPU's ruck
  const ruck = (att, o = {}) => seedFor(() => { const m = scene(o); m.players[3].x = 61; m.players[3].y = 36; m.players[10].x = 59; m.players[10].y = 34; m.phase = 'play'; CL.resolveRuck({ team:att, x:60, y:35, dom:true, domP:0.4 }); return M().ball.carrier && M().ball.carrier.team !== att; });
  ok(ruck(1) != null, 'your side turns over the CPU\'s ruck');
  m = M(); c = calls()[0];
  ok(said.join() === 'Turnover' && bannerCol() === CL.callInk(0), `Turnover in your colour (${bannerCol()})`);
  ok(c && c.text === 'Turnover' && c.p === m.ball.carrier && ctrl(0) === c.p && c.k === CL.callInk(0), 'called over the man the ring goes to');
  ok(heard.includes('gather') && m.flash && near(m.stop, CC.beat/1000), 'the Gather sound, the flash and the beat');
  ruck(0);
  ok(said.join() === 'Turnover' && bannerCol() === CL.callInk(1) && !calls().length && M().stop === 0, `the CPU turns over yours: Turnover in its colour (${bannerCol()}), nothing else`);
  // a pressure turnover: the CPU's carrier spills under pressure and your man gathers the egg
  m = scene(); const g = m.players[6]; g.x = 70; g.y = 40; const b = loose(m, 70.2, 40, 1); T.press.eggStart(b, 1, true, 7); b.egg.rolling = true; b.z = 0;
  r0 = rndCalls(); CL.updateLoose(STEP); c = calls()[0];
  ok(m.ball.carrier === g && said.join() === 'Turnover' && bannerCol() === CL.callInk(0) && (m.stats.pressTurn || 0) === 1, 'the CPU\'s pressure spill gathered by yours: Turnover in your colour, and the surge');
  ok(c && c.text === 'Turnover' && c.p === g && heard.includes('gather') && m.flash && near(m.stop, CC.beat/1000) && rndCalls() === r0, 'called over him, heard, the flash and the beat, and no random number');
}
done();

begin('2b the silent offload in Pro Mode');
{
  ready();
  const stageOff = (toMe, user) => {
    const cr = T.career.create({ pos:'B', num:5, club:X.CLUBS[0], proMode:!user }); T.career.set(cr); T.career.play();
    const m = M(); m.phase = 'play'; m.set = null; m.cut = null; m.tags = []; m.stop = 0; m.flash = null;
    for (const p of m.players) { p.x = p.team ? 95 : 15 + p.n; p.y = 5 + p.n*8; p.vx = p.vy = 0; p.down = 0; p.bind = null; p.offside = 0; p.tcd = 0; }
    const me = m.careerP || m.players[4], c = m.players.find(p => p.team === 0 && p !== me), mate = m.players.find(p => p.team === 0 && p !== me && p !== c), q = m.players[10];
    c.x = 60; c.y = 35; c.fx = 1; c.fy = 0; q.x = 61; q.y = 35;
    const to = toMe ? me : mate; to.x = 56; to.y = 39;
    if (user) T.sides.setCtrl(0, c);
    const k = { c, q, q2:null, mode:'ai', tier:'wrap', t:0.2, T:0.25, v0:{ x:0, y:0 }, front:true, aiOff:null, offloaded:false, margin:0, margin0:0, hit:false, dp:0, cSprint:false };
    c.bind = k; q.bind = k; m.contact = k; Object.assign(m.ball, { state:'held', carrier:c, f:null });
    said.length = 0; heard.length = 0; made.length = 0;
    CL.offload(k, !!user);
    const f = m.ball.f;
    if (!f || f.kind !== 'pass') return null;
    const r = f.target; r.x = f.x1; r.y = f.y1; f.t = f.T; m.ball.x = f.x1; m.ball.y = f.y1; m.ball.z = 1.1;
    CL.resolvePass();
    return { m, me, c, r, f };
  };
  const want = (toMe, user) => { let S = null; seedFor(() => { S = stageOff(toMe, user); return !!(S && S.m.ball.carrier === S.r && S.r === (toMe ? S.me : S.r)); }); return S; };
  let S = want(true);
  let c = calls()[0];
  ok(S && T.careerPro && S.m.careerPro && S.f.call === 'Offload' && S.r === S.me && S.m.ball.carrier === S.me, 'Pro Mode: a teammate the computer runs offloads to your player, who takes it');
  ok(c && c.text === 'Offload' && c.p === S.me && c.k === CL.callInk(0) && calls().length === 1, 'called over your player: Offload, in your colour');
  ok(heard.includes('gather') && S.m.flash && S.m.stop === 0 && !said.length, 'the Gather sound and the flash; no beat and no banner (it never left your side)');
  ok(!S.m.tags.some(t => !t.call && t.text === 'Offload'), 'and no tag over the teammate who threw it: the call is over the man the ring is on');
  T.debug.exitMatch(); T.career.set(null);
  S = want(false);
  ok(S && S.r !== S.me && S.m.ball.carrier === S.r && !calls().length && !heard.includes('gather'), 'his offload to another teammate: the ring stays on your player, so no call');
  T.debug.exitMatch(); T.career.set(null);
  S = want(false, true);
  ok(S && !S.m.careerPro && S.m.ball.carrier === S.r && !calls().length && S.m.tags.some(t => t.text === 'Offload' && !t.call), 'a Whole Team career: your own offload keeps its tag over the passer, and its catch is no call (your own pass)');
  T.debug.exitMatch(); T.career.set(null);
}
done();

begin('3 On Fire after its moment');
{
  // a turnover lights On Fire: Turnover shows, On Fire follows when its 0.9s are up, instead of replacing it in the same step
  const lit = () => { const m = scene({ arcade:true }); m.fire[0].heat = T.arcade.ARCADE.fire.need - 1; const g = m.players[6]; g.x = 70; g.y = 40; loose(m, 70.2, 40, 1); CL.updateLoose(STEP); return m; };
  const roars = () => heard.filter(k => k === 'roar').length;
  let m = lit();
  ok(T.arcade.onFire(0) && said.join() === 'Turnover' && m.fireQ && m.fireQ.t === 0 && m.fireQ.at === m.stepN + Math.round(0.9/STEP), `lit by a turnover: Turnover is said, and On Fire waits ${Math.round(0.9/STEP)} steps (${said.join(', ')})`);
  ok(!roars(), 'and its roar waits with it: none as it is lit');
  m.stepN += Math.round(0.9/STEP) - 1; CL.callsTick();
  ok(said.join() === 'Turnover' && !roars(), 'not yet, a step before');
  m.stepN++; CL.callsTick();
  ok(said.join() === 'Turnover,On Fire' && /big fire/.test(lastMsg().className) && bannerCol() === X.showCol(0) && !m.fireQ, `then On Fire, after it (${said.join(', ')})`);
  m.stepN++; CL.callsTick();
  ok(roars() === 1, 'its roar with its banner (the step after, once nothing in its own step sent it on)');
  setC({ on:false }); m = lit();
  ok(said.join() === 'Turnover,On Fire' && !m.fireQ && roars() === 1, 'CALLS off: On Fire replaces Turnover in the same step, roaring as it is lit, as b4a25d5 did'); resetC();
  // another banner while it waits holds it for that one's time too; and it waits for open play
  m = lit(); CL.say('Dropped', 'small'); ok(m.fireQ.at === m.stepN + Math.round(0.9/STEP), 'a banner said while it waits: it waits that one\'s time too');
  m.stepN = m.fireQ.at; m.phase = 'set'; m.set = { kind:'scrum', t:1 }; CL.callsTick(); ok(m.fireQ && said.join() === 'Turnover,Dropped', 'and while a set piece is on, it waits for play');
  m.phase = 'play'; m.set = null; m.cut = { kind:'duel' }; CL.callsTick(); ok(m.fireQ, 'and under a close-up'); m.cut = null;
  CL.callsTick(); ok(!m.fireQ && said.join() === 'Turnover,Dropped,On Fire', 'then shows in open play');
  // an interception lights it: the same
  m = scene({ arcade:true }); m.fire[0].heat = T.arcade.ARCADE.fire.need - 1;
  seedFor(() => { const m = scene({ arcade:true }); m.fire[0].heat = T.arcade.ARCADE.fire.need - 1; Object.assign(m.ball, { state:'air', f:{ kind:'pass', team:1, x0:66, y0:35, x1:56, y1:35, t:0.2, T:0.6, H:0.5, z0:1.1, z1:1.1, rolled:new Set(), onside:null, target:m.players[9], sure:false, long:false }, x:62.2, y:35, z:1 }); Object.assign(m.players[5], { x:62, y:35 }); CL.catchBall(m.players[5], 'intercept'); return M().ball.carrier === m.players[5]; });
  m = M();
  ok(said.join() === 'Intercepted' && m.fireQ && T.arcade.onFire(0), 'lit by an interception: Intercepted, and On Fire queued after it');
  // a Big Hit and a try light it before their banners are said: On Fire is sent on after them
  m = scene({ arcade:true }); m.fire[0].heat = T.arcade.ARCADE.fire.need - 1;
  CL.heat(0, 'hit'); CL.say('Big Hit', 'big hit', 0);
  ok(said.join() === 'On Fire,Big Hit' && m.fireQ && m.fireQ.at === m.stepN + Math.round(1.3/STEP), `a Big Hit: On Fire said first, then sent on ${Math.round(1.3/STEP)} steps by the Big Hit's banner (${said.join(', ')})`);
  m.stepN = m.fireQ.at; CL.callsTick(); ok(said.join() === 'On Fire,Big Hit,On Fire', 'and shown when the Big Hit has had its time');
  m = scene({ arcade:true }); m.fire[0].heat = T.arcade.ARCADE.fire.need - 1;
  CL.heat(0, 'try'); CL.say('Try', 'big', 0);
  ok(m.fireQ && m.fireQ.at === m.stepN + Math.round(1.7/STEP), 'a try: after the Try banner\'s 1.7s');
  // a real try that lights it: the Try banner, the conversion's close-up, the kick-off; On Fire shows once play is on again, and
  // stands its 1.3s with nothing clearing it (it used to show 0.22s before the conversion's close-up wiped it)
  const tryFire = on => {
    if (!on) setC({ on:false });
    settings.tut = D.TUT_IDS.slice(); settings.tips = D.COACH_IDS.slice();
    const m = scene({ arcade:true }); m.fire[0].heat = T.arcade.ARCADE.fire.need - 2;
    const el = document.getElementById('banner'); let html = '', blank = 0;
    Object.defineProperty(el, 'innerHTML', { configurable:true, get:() => html, set:v => { html = String(v); if (!html) blank++; } });
    const p = m.players[3]; p.x = 111; p.y = 35; CL.scoreTry(p);
    const r = { lit:said.join(), roar0:roars(), shown:null, cleared:false, cuts:0 };
    const fires = () => said.filter(w => w === 'On Fire').length, f0 = fires();
    for (let n = 0; n < 9000 && r.shown == null && !M().over; n++) {
      bot(0); T.update(STEP); if (M().cut) r.cuts++;
      if (fires() > f0) r.shown = { n, phase:M().phase, cut:!!M().cut, set:M().set && M().set.kind, said:said.length, blank, roar:roars() };
    }
    if (r.shown) {
      for (let i = 0; i < Math.round(1.3/STEP); i++) { bot(0); T.update(STEP); if (M().cut) r.cleared = true; }
      r.cleared = r.cleared || blank - r.shown.blank !== said.length - r.shown.said;   // say() blanks the banner before writing it: any other blank is clearBanner
      r.after = said.slice(r.shown.said); r.roar = roars();
    }
    delete el.innerHTML; if (!on) resetC();
    return r;
  };
  let F = tryFire(true);
  ok(F.lit === 'On Fire,Try' && F.roar0 === 1, `a try lights it: On Fire, then Try over it in the same step, and only the try's own roar (${F.lit}, ${F.roar0})`);
  ok(F.shown && F.cuts > 0 && F.shown.phase === 'play' && !F.shown.cut, `On Fire shows once the conversion's close-up is over and play is on again (${F.shown ? F.shown.n + ' steps on, ' + F.shown.phase : 'never'}, ${F.cuts} close-up steps before it)`);
  ok(F.shown && !F.cleared && !F.after.length, `and stands its 1.3s: no close-up, no clearing, no banner over it (${F.after ? F.after.join() || 'none' : '?'})`);
  ok(F.shown && F.roar === F.roar0 + 1, 'its roar with it');
  F = tryFire(false);
  ok(F.lit === 'On Fire,Try' && F.roar0 === 2 && !F.shown, 'CALLS off: Try replaces On Fire in the same step and it is never seen, as b4a25d5 did');
  // a Line Break's word over it still shows at once
  m = scene({ arcade:true, diff:0 }); m.fire[0].heat = E.fireNeed(0) - 1; CL.say('Line Break', 'small', 0); made.length = 0; CL.heat(0, 'line', 'Line Break');
  const grade = made.find(e => e.className === 'grade');
  ok(said.join() === 'Line Break,On Fire' && !m.fireQ && grade && grade.textContent === 'Line Break', 'a Line Break lights it: On Fire with Line Break over it at once, as before');
  // gone out before its turn: never shown
  m = lit(); T.arcade.fireOut(0); m.stepN = m.fireQ.at; CL.callsTick();
  ok(said.join() === 'Turnover' && !m.fireQ, 'put out before its turn (a try conceded): never shown');
  // nothing waits in AI v AI, the demo or a headless match: no banner is said there
  ok(CL.bannerLife('small') === 0.9 && CL.bannerLife('big') === 1.7 && CL.bannerLife('big fire') === 1.3 && CL.bannerLife('coach') === 1.6, 'the waits are the banners\' own lives (say): small 0.9s, big 1.7s, the rest 1.3s');
}
done();

begin('4 the Line Break after a turnover');
{
  const lb = () => {   // edge.mjs's scene: your 4 running at 8 m/s from x 60 along y 35 on Easy, their 11 in front of him, then past him
    const m = scene({ arcade:true, diff:0 }); const c = m.players[3], q = m.players[10];
    for (const p of m.players) { p.x = p.team ? 20 + p.n : 15 + p.n; p.y = 4 + p.n*4; }
    c.x = 60; c.y = 35; c.vx = 8; c.vy = 0; q.x = 66; q.y = 35;
    Object.assign(m.ball, { state:'held', carrier:c, f:null }); c.hold = 0.5; T.sides.setCtrl(0, c);
    E.line(c); q.x = 56; q.y = 33; c.hold = 0.6;
    said.length = 0; heard.length = 0;
    return { m, c, q };
  };
  let { m, c } = lb(); CL.callWon(c);
  ok(E.line(c) === false && !said.includes('Line Break') && !m.stats.lineBreak0 && !m.lb.fired && m.fire[0].heat === 0, 'clear of his man, but he has just won the ball: no Line Break, no heat point, and the carry can still have one');
  m.dclock += CC.lbGap - 0.02; ok(E.line(c) === false, `nor ${CC.lbGap - 0.02}s later`);
  m.dclock += 0.03; ok(E.line(c) === true && said.includes('Line Break') && m.stats.lineBreak0 === 1, `${CC.lbGap}s after it, still clear: Line Break`);
  ({ m, c } = lb()); CL.callWon(m.players[5]);
  ok(E.line(c) === true, 'another man\'s turnover does not hold this carrier\'s');
  setC({ on:false }); ({ m, c } = lb()); CL.callWon(c); ok(E.line(c) === true && said.includes('Line Break'), 'CALLS off: called at once, as b4a25d5 did'); resetC();
  // On Fire's banner is up: the call goes over it
  ({ m, c } = lb()); m.fire[0].t = 5; CL.say('On Fire', 'big fire', 0); said.length = 0; made.length = 0;
  ok(CL.fireShowing(0) === 'up' && E.line(c) === true && said.join() === 'On Fire' && made.some(e => e.className === 'grade' && e.textContent === 'Line Break'), 'On Fire\'s banner showing: Line Break goes over it rather than replacing it');
  ({ m, c } = lb()); m.fire[0].t = 5; CL.say('On Fire', 'big fire', 0); m.stepN += Math.round(1.3/STEP); said.length = 0;
  ok(CL.fireShowing(0) === null && E.line(c) === true && said.join() === 'Line Break', 'once it has gone: the small banner, as ever');
  // the order in a real interception: Intercepted, On Fire after it, then the Line Break once the second is up. Their 10 is in front of
  // him at the catch and beaten a step later, so the carry has had a man to break
  const s = seedFor(() => { const S = lb(); S.m.fire[0].heat = E.fireNeed(0) - 1; Object.assign(S.m.players[9], { x:45, y:35 }); Object.assign(S.m.ball, { state:'air', carrier:null, f:{ kind:'pass', team:1, x0:70, y0:35, x1:58, y1:35, t:0.3, T:0.6, H:0.5, z0:1.1, z1:1.1, rolled:new Set(), onside:null, target:S.m.players[9], sure:false, long:false }, x:60.1, y:35 }); CL.catchBall(S.c, 'intercept'); return M().ball.carrier === S.c; });
  m = M(); c = m.ball.carrier; const q = m.players[10]; q.x = 66; q.y = 35; made.length = 0;
  const seq = [];
  for (let i = 1; i <= Math.round(1.6/STEP); i++) {
    m.stepN++; m.dclock += STEP; c.hold += STEP; CL.callsTick(); E.line(c); if (i === 1) { q.x = 56; q.y = 33; }
    if (said.length > seq.length) seq.push(...said.slice(seq.length).map(w => w + (seq.length ? '@' + (i*STEP).toFixed(2) : '@0')));
  }
  const tOf = k => (seq[k] ? +seq[k].split('@')[1] : NaN);
  ok(s != null && said[0] === 'Intercepted' && said.slice(1).join() === 'On Fire,On Fire' && made.some(e => e.className === 'grade' && e.textContent === 'Line Break') && m.stats.lineBreak0 === 1, `an interception that lights On Fire and runs clear: Intercepted, On Fire, then Line Break over On Fire (${seq.join(', ')})`);
  ok(near(tOf(1), 0.9, 0.02) && tOf(2) >= CC.lbGap && tOf(2) < CC.lbGap + 0.05, `On Fire when Intercepted has had its 0.9s, the Line Break when the second is up (${tOf(1)}s, ${tOf(2)}s)`);
}
done();

begin('5 the call in the two-tag cap');
{
  const m = scene(); const p = m.players[4]; p.x = 60; p.y = 35;
  CL.tag('Loose Ball', 50, 30); loose(m, 60.2, 35, 0); CL.updateLoose(STEP);
  ok(m.tags.map(t => t.text).join() === 'Loose Ball,Picked Up', 'a call joins the tag before it');
  CL.tag('Fend', 61, 35);
  ok(m.tags.map(t => t.text).join() === 'Picked Up,Fend' && m.tags[0].call, 'a third tag drops the oldest plain tag, never the call');
  CL.tag('Knock-On', 62, 35);
  ok(m.tags.map(t => t.text).join() === 'Picked Up,Knock-On', 'and again');
  m.tags = [m.tags[0], { ...m.tags[0], text:'Turnover' }]; CL.tag('Tripped', 62, 35);
  ok(m.tags.map(t => t.text).join() === 'Picked Up,Turnover', 'two calls: a new plain tag is the one dropped');
  CL.tag('Offload', 60, 35, { k:'#fff', call:true, p });
  ok(m.tags.map(t => t.text).join() === 'Turnover,Offload', 'three calls: the oldest call goes');
  m.stepN += Math.round(CC.life/STEP); CL.tag('Fend', 0, 0);
  ok(m.tags.map(t => t.text).join() === 'Offload,Fend', `a call past its ${CC.life}s (no drawing ended it: a headless match) makes way as any tag does`);
  setC({ on:false }); m.tags = [{ text:'A', t:0 }, { text:'B', t:0 }]; CL.tag('C', 0, 0); ok(m.tags.map(t => t.text).join() === 'B,C', 'CALLS off (no calls): the oldest goes, as b4a25d5 did'); resetC();
}
done();

begin('6 no interception out of his hands');
{
  // their 10 passes from (66, 35) towards (52, 35); your 6 stands at his hands, 0.6m off the line of it
  const stage = (o = {}) => {
    const m = scene(); const q = m.players[5]; q.x = o.qx ?? 65.2; q.y = 35.6; T.sides.setCtrl(0, m.players[1]);
    const f = { kind:'pass', team:1, x0:66, y0:35, x1:52, y1:35, t:0, T:0.8, H:0.5, z0:1.1, z1:1.1, rolled:new Set(), onside:null, target:m.players[8], sure:false, boost:null, long:!!o.long };
    m.players[8].x = 52; m.players[8].y = 35;
    Object.assign(m.ball, { state:'air', carrier:null, f, x:66, y:35, z:1.1 });
    return { m, q, f };
  };
  const fly = (m, f, q) => { const r0 = rndCalls(); let first = null, draws = null; for (let i = 0; i < 40 && m.ball.state === 'air'; i++) { const was = Math.hypot(m.ball.x - f.x0, m.ball.y - f.y0); CL.updateBallAir(STEP); const now = Math.hypot(m.ball.x - f.x0, m.ball.y - f.y0); if (draws == null && rndCalls() !== r0) draws = now; if (first == null && f.rolled.has(q)) first = [was, now]; } return { first, draws }; };
  let { m, q, f } = stage(), F = fly(m, f, q);
  ok(!F.first && (F.draws == null || F.draws >= CC.release), `your man at the passer's hands never rolls for it: by the time it is ${CC.release}m out it is past his reach (${F.draws == null ? 'no draw' : 'the first draw ' + F.draws.toFixed(2) + 'm out'})`);
  ({ m, q, f } = stage({ qx:63.8 })); F = fly(m, f, q);
  ok(F.first && F.first[0] < CC.release && F.first[1] >= CC.release, `a man 2.2m down the line rolls at the first step the ball is ${CC.release}m out (${F.first ? F.first.map(v => v.toFixed(2)).join(' to ') : 'never'})`);
  setC({ on:false }); ({ m, q, f } = stage({ qx:63.8 })); F = fly(m, f, q); resetC();
  ok(F.first && F.first[1] < CC.release, `CALLS off: he rolls earlier, ${F.first ? F.first[1].toFixed(2) : '?'}m out, as b4a25d5 did`);
  setC({ on:false }); ({ m, q, f } = stage()); CL.updateBallAir(STEP); ok(f.rolled.has(q), 'CALLS off: he rolls in the very first step, out of the hands, as b4a25d5 did'); resetC();
  ({ m, q, f } = stage({ long:true })); for (let i = 0; i < 3; i++) CL.updateBallAir(STEP);
  ok(!f.rolled.has(q) && Math.hypot(m.ball.x - f.x0, m.ball.y - f.y0) < CC.release, 'a long pass the same at its start');
  // a missed pass landing within the release of the hands: none of theirs takes it
  ({ m, q, f } = stage()); Object.assign(f, { x1:65, y1:35, t:0.8 }); m.ball.x = 65; m.ball.y = 35; m.players[8].x = 30; q.x = 65.5; q.y = 35.3;
  CL.resolvePass(); ok(m.ball.state === 'loose' && m.stats.intercepts === 0, 'a pass that comes down 1m from his hands with only your man by it: dropped, not intercepted');
}
done();

begin('7 down, retiring, offside');
{
  const kn0 = { ...KN }; KN.base = 0; KN.intercept = 0;  // the staged catches never knock on here: who takes the ball is what is looked at
  // the interception: a man retiring from a ruck by the ball 3m out
  const air = (m, o = {}) => { const f = { kind:'pass', team:1, x0:66, y0:35, x1:52, y1:35, t:0.17, T:0.8, H:0.5, z0:1.1, z1:1.1, rolled:new Set(), onside:null, target:m.players[8], sure:false, boost:null, long:false, ...o }; m.players[8].x = 52; m.players[8].y = 35; Object.assign(m.ball, { state:'air', carrier:null, f, x:63, y:35, z:1.1 }); return f; };
  let m = scene(), q = m.players[5]; q.x = 62.9; q.y = 35.3; q.offside = 0.5; let f = air(m);
  CL.updateBallAir(STEP); ok(!f.rolled.has(q), 'a man retiring from a ruck (p.offside) never rolls for an interception');
  q.offside = 0; CL.updateBallAir(STEP); ok(f.rolled.has(q), 'and does once he has retired');
  m = scene(); q = m.players[5]; q.x = 62.9; q.y = 35.3; q.down = 0.4; f = air(m); CL.updateBallAir(STEP); ok(!f.rolled.has(q), 'a man down never does, as before');
  setC({ on:false }); m = scene(); q = m.players[5]; q.x = 62.9; q.y = 35.3; q.offside = 0.5; f = air(m); CL.updateBallAir(STEP); ok(f.rolled.has(q), 'CALLS off: the retiring man rolls, as in b4a25d5'); resetC();
  // the missed pass: the nearest man may not take it, so the next one does
  const missed = (setup) => { const m = scene(); const f = air(m, { t:0.8 }); m.ball.x = 52; m.ball.y = 35; m.players[8].x = 30; m.players[8].y = 60; setup(m); CL.resolvePass(); return m; };
  m = missed(m => { Object.assign(m.players[5], { x:52.2, y:35, offside:0.4 }); Object.assign(m.players[6], { x:53.2, y:35 }); });
  ok(m.ball.carrier === m.players[6], `a missed pass: not to your retiring man by it, but your next man (${m.ball.carrier ? m.ball.carrier.n : m.ball.state})`);
  setC({ on:false }); m = missed(m => { Object.assign(m.players[5], { x:52.2, y:35, offside:0.4 }); Object.assign(m.players[6], { x:53.2, y:35 }); }); resetC();
  ok(m.ball.carrier === m.players[5], 'CALLS off: the retiring man takes it, as in b4a25d5');
  let wasOff = null;
  m = missed(m => { Object.assign(m.players[12], { x:52.2, y:35 }); Object.assign(m.players[6], { x:53.4, y:35 }); CL.offMark(1, 66); wasOff = CL.offsideMan(m.players[12]); });
  ok(wasOff && m.players[12].team === 1 && m.ball.carrier !== m.players[12], 'a missed pass: never to the passer\'s own man 14m in front of where he threw it (offside)');
  ok(m.ball.carrier === m.players[6], `it goes to the man who may take it (${m.ball.carrier ? m.ball.carrier.team + ':' + m.ball.carrier.n : m.ball.state})`);
  // the loose ball
  const pick = (setup, o) => { const m = scene(o); loose(m, 60, 35, 1); setup(m); CL.updateLoose(STEP); return m; };
  m = pick(m => { Object.assign(m.players[5], { x:60.2, y:35, offside:0.3 }); Object.assign(m.players[6], { x:60.9, y:35 }); });
  ok(m.ball.carrier === m.players[6], 'a loose ball: never your retiring man by it; your next man has it');
  m = pick(m => { Object.assign(m.players[5], { x:60.2, y:35, down:0.3 }); Object.assign(m.players[6], { x:60.9, y:35 }); });
  ok(m.ball.carrier === m.players[6], 'nor a man down, as before');
  // offside at a spill: their carrier 11 at x 64 spills it; their 12 is 3m in front of him (they attack towards x 0), by the ball
  m = scene(); const sp = m.players[10], off = m.players[11], mine = m.players[5]; sp.x = 64; sp.y = 35; sp.fx = -1; off.x = 60.4; off.y = 35.2; mine.x = 61; mine.y = 35.2;
  Object.assign(m.ball, { state:'held', carrier:sp, f:null }); CL.looseInContact(sp); sp.down = 1;
  Object.assign(m.ball, { x:60.3, y:35, z:0, vx:0, vy:0, vz:0 }); if (m.ball.egg) m.ball.egg = null;
  ok(CL.offsideMan(off) && !CL.offsideMan(mine) && !CL.offsideMan(sp), 'their carrier spills it: his man 3.6m in front of him is offside; yours never is');
  CL.updateLoose(STEP); ok(m.ball.carrier === mine, `the offside man by the ball does not gather it; yours does (${m.ball.carrier ? m.ball.carrier.team + ':' + m.ball.carrier.n : m.ball.state})`);
  m = scene(); const sp2 = m.players[10], off2 = m.players[11]; sp2.x = 64; sp2.y = 35; sp2.fx = -1; off2.x = 60.4; off2.y = 35.2;
  Object.assign(m.ball, { state:'held', carrier:sp2, f:null }); CL.looseInContact(sp2); sp2.down = 1; Object.assign(m.ball, { x:60.3, y:35, z:0, vx:0, vy:0, vz:0, egg:null });
  CL.updateLoose(STEP); ok(m.ball.state === 'loose', 'with nobody else near, it lies there');
  off2.x = 64.2; CL.callsTick(); off2.x = 60.4; CL.updateLoose(STEP);
  ok(m.ball.carrier === off2, 'once he has been back behind the line he is onside again, and gathers it');
  // the kick: a man in front of the kicker stays offside for its bounce until he is back behind it
  m = scene(); const kk = m.players[2], ahead = m.players[4]; kk.x = 40; kk.y = 35; ahead.x = 55; ahead.y = 35;
  CL.kickBall(0, 40, 35, 56, 35, 1.5, 8, 'kick');
  ok(CL.offsideMan(ahead) && !CL.offsideMan(kk), 'a kick: his man 15m in front of him is offside for it');
  Object.assign(m.ball, { state:'loose', f:null, x:55.3, y:35, z:0, vx:0, vy:0, vz:0 }); CL.updateLoose(STEP);
  ok(m.ball.state === 'loose', 'and does not gather its bounce at his feet');
  // the chase: the AI does not send a man who may not play it
  m = scene({ humans:[false, false], auto:true }); loose(m, 60, 35, 0);
  for (const p of m.players) if (p.team === 1) { p.x = 70 + p.n; p.y = 10 + p.n*6; }
  Object.assign(m.players[10], { x:61, y:35, offside:0.4 }); Object.assign(m.players[11], { x:62, y:36 }); Object.assign(m.players[12], { x:63, y:37 });
  let tg = CL.matchTargets(); const chase = p => { const g = tg.get(p); return g && Math.hypot(g.x - 60, g.y - 35) < 0.5; };
  ok(!chase(m.players[10]) && chase(m.players[11]) && chase(m.players[12]), 'a loose ball: the two nearest who may play it chase it, not the man retiring by it');
  setC({ on:false }); tg = CL.matchTargets(); ok(chase(m.players[10]), 'CALLS off: he chases it, as in b4a25d5'); resetC();
  Object.assign(KN, kn0);
}
done();

begin('8 Kids and Minis without the beat');
{
  for (const [label, o] of [['Kids', { diff:0, kids:true, kidsR:1 }], ['Minis', { a:{ ...X.CLUBS[2], id:'MNI', cat:'minis' }, b:{ ...X.CLUBS[4], cat:'minis' } }], ['Easy', { diff:0 }], ['Hard', { diff:2 }]]) {
    const m = scene(o), g = m.players[6]; g.x = 70; g.y = 40; loose(m, 70.2, 40, 1); CL.updateLoose(STEP);
    const mild = label === 'Kids' || label === 'Minis', c = calls()[0];
    ok(c && c.text === 'Turnover' && heard.includes('gather') && m.flash && (mild ? m.stop === 0 : near(m.stop, CC.beat/1000)) && CL.matchMild() === mild, `${label}: the call, the sound and the flash, ${mild ? 'and no beat' : 'and the beat'}`);
  }
}
done();

begin('9 AI v AI, the demo, a drill');
{
  const watch = o => {
    reseed(o.seed); T.newMatch(X.NATIONS[o.a], X.NATIONS[o.b], { halfLen:o.half, diff:1, auto:true, demo:!!o.demo, headless:false });
    heard.length = 0; let n = 0, tags = 0, stop = 0, flash = 0;
    while (!M().over && n < o.steps) { T.update(STEP); n++; tags += M().tags.filter(t => t.call).length; if (M().stop > 0) stop++; if (M().flash) flash++; }
    const s = M().stats, keys = Object.keys(s).filter(k => k.startsWith('call_'));
    return { n, tags, stop, flash, gather:heard.filter(k => k === 'gather').length, keys, won:(s.intercepts || 0) + (s.turnovers || 0) };
  };
  let w = watch({ seed:31, a:0, b:3, half:120, steps:60000 });
  ok(w.won > 0 && !w.tags && !w.stop && !w.flash && !w.gather && !w.keys.length, `AI v AI: ${w.won} interceptions and turnovers, and no call, beat, flash or Gather`);
  w = watch({ seed:32, a:2, b:1, half:1e9, steps:9000, demo:true });
  ok(w.won > 0 && !w.tags && !w.stop && !w.flash && !w.gather && !w.keys.length, `the demo, 150 seconds: ${w.won} won balls, and nothing`);
  // Two Player: both sides are people's, each called in its own colour, and every change of side is a beat
  const m = scene({ humans:[true, true] }), g = m.players[12]; g.x = 40; g.y = 30; loose(m, 39.8, 30, 0); CL.updateLoose(STEP);
  const c = calls()[0];
  ok(c && c.p === g && c.k === T.behind.ringCol(1) && c.k === '#ff5fd2' && bannerCol() === CL.callInk(1) && near(m.stop, CC.beat/1000), 'Two Player: the away side\'s turnover is called over its man, its plate in Player 2\'s pink as his ring and seat mark are, its banner in its side\'s colour, with the beat');
  // a drill has none: possCall stays out of practice
  T.practice.start('pass'); const P = M(); const dp = P.players.find(p => p.team === 0);
  ok(CL.possCall(dp, 'Picked Up', true) === false && !P.tags.some(t => t.call), 'a drill: no call');
  T.practice.leave();
}
done();

begin('10 reduced motion');
{
  const m = scene(); const p = m.players[4]; p.x = 60; p.y = 35; loose(m, 60.2, 35, 0); CL.updateLoose(STEP);
  const rings = [], draw = (q, u) => rings.push(u);
  CL.setRM(false); CL.callFlash(0.1, draw);
  ok(rings.length === 1 && near(rings[0], 0.1/CC.flash), `the flash: his ring going out, a quarter of the way at 0.1s (${rings[0]})`);
  CL.setRM(true); CL.callFlash(0.1, draw);
  ok(rings.length === 1 && m.flash && near(m.flash.at, 0.2), 'reduced motion: no flash, though its clock runs');
  CL.callFlash(0.25, draw); ok(!m.flash, 'and is over at 0.4s');
  // the call itself under reduced motion holds still; otherwise it rises a little
  const ys = rm => { CL.setRM(rm); const out = []; globalThis.__ctxSpy = (k, a) => { if (k === 'fillText') out.push(a[2]); }; m.tags = [{ text:'Picked Up', x:60, y:35, t:0, k:'#fff', call:true, p }];
    CL.drawCalls(0.1, () => ({ x:400, top:200, foot:260 })); CL.drawCalls(0.5, () => ({ x:400, top:200, foot:260 })); delete globalThis.__ctxSpy; return out; };
  D.view(844, 390);
  const still = ys(true), moving = ys(false);
  ok(still.length === 2 && still[0] === still[1], `reduced motion: the call holds still (${still.join(', ')})`);
  ok(moving.length === 2 && moving[1] < moving[0], `otherwise it rises a little (${moving.map(v => v.toFixed(1)).join(', ')})`);
  CL.setRM(false);
  // a whole frame on every camera (settings.cam: 0 Top, 1 Low, 2 Mid, the one a new player starts on, 3 High) draws the call and the flash with no error
  for (const cam of [0, 1, 2, 3]) {
    settings.cam = cam; const m2 = scene(); const q = m2.players[4]; q.x = 60; q.y = 35; loose(m2, 60.2, 35, 0); CL.updateLoose(STEP); m2.cam.x = 60; m2.cam.y = 35;
    let texts = []; globalThis.__ctxSpy = (k, a) => { if (k === 'fillText') texts.push(a[0]); };
    let err = null; try { D.render(1/60); D.render(1/60); } catch (e) { err = e; }
    delete globalThis.__ctxSpy;
    ok(!err && texts.includes('PICKED UP'), `${CAMS[cam]}: a frame draws the call (${err ? err.message : texts.filter(t => t === 'PICKED UP').length + ' times'})`);
  }
  settings.cam = 0;
}
done();

begin('11 the words');
{
  const src = fs.readFileSync(new URL('../src/calls.js', import.meta.url), 'utf8');
  const words = ['Picked Up', 'Intercepted', 'Turnover', 'Offload'], title = w => w.split(' ').every(x => /^[A-Z][a-z]+$/.test(x));
  ok(words.every(title) && T.sound.NAMES.gather === 'Gather' && T.sound.SYNTH.includes('gather'), 'the calls and the sound\'s name are Title Case; Gather is a synth recipe');
  const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
  for (const w of words) ok(game.includes(`'${w}'`), `${w} is in the game`);
  ok(!/[←-⇿—]/.test(src), 'no arrow or em dash in src/calls.js');
  const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8'), checks = fs.readFileSync(new URL('./CHECKS.md', import.meta.url), 'utf8'), gate = fs.readFileSync(new URL('./check.mjs', import.meta.url), 'utf8');
  ok(/^### Possession calls/m.test(readme) && readme.includes('CALLS'), 'README.md has the section');
  ok(checks.includes('node tools/calls.mjs') && /'calls'/.test(gate), 'CHECKS.md describes this gate, and check.mjs runs it');
  const sec = readme.slice(readme.indexOf('### Possession calls'), readme.indexOf('\n### ', readme.indexOf('### Possession calls') + 5));
  ok(!/[←-⇿—]/.test(sec), 'no arrow or em dash in it');
}
done();

begin('12 where the call stands');
{
  D.view(844, 390);
  const el = document.getElementById('banner'), msg = { offsetLeft:302, offsetTop:0, offsetWidth:240, offsetHeight:40 };
  const banner = on => { el.firstElementChild = on ? msg : null; el.rect = on ? { left:0, top:117, right:844, bottom:157, width:844, height:40 } : null; };
  const m = scene(), p = m.players[4]; T.sides.setCtrl(0, p);
  const call = () => ({ text:'Intercepted', x:0, y:0, t:0, k:'#fff', call:true, p, n:m.stepN });
  const drawn = (at, n = 1, dt = 1/60) => { const ys = []; globalThis.__ctxSpy = (k, a) => { if (k === 'fillText' && a[0] === 'INTERCEPTED') ys.push([a[1], a[2]]); }; for (let i = 0; i < n; i++) CL.drawCalls(dt, at); delete globalThis.__ctxSpy; return ys; };
  // the banner (laid out at 117 to 157, 302 to 542) over the man's pointer: the call goes under his ring at once, and stays there
  banner(true); m.tags = [call()];
  let pt = { x:420, top:150, foot:205, half:14 }, ys = drawn(() => pt);
  ok(m.tags[0].place === 'under' && ys.length === 1 && ys[0][1] > pt.foot, `the banner over his pointer: under his ring from the first frame (${m.tags[0].place}, y ${ys[0] && ys[0][1].toFixed(0)})`);
  pt = { x:700, top:150, foot:205, half:14 }; ys = drawn(() => pt);
  ok(m.tags[0].place === 'under' && ys[0][1] > pt.foot, 'and stays there when he runs clear of it: chosen once, it never jumps');
  m.tags = [call()]; pt = { x:420, top:230, foot:290, half:14 }; ys = drawn(() => pt);
  ok(m.tags[0].place === 'over' && ys[0][1] < pt.top, 'clear of the banner: over his pointer, as before');
  m.tags = [call()]; pt = { x:420, top:186, foot:240, half:14 }; ys = drawn(() => pt);
  ok(m.tags[0].place === 'under', `the plate over him would touch the banner's laid-out box (not the box its pop is still growing): under (${m.tags[0].place})`);
  banner(false); m.tags = [call()]; ys = drawn(() => pt);
  ok(m.tags[0].place === 'over', 'no banner: over');
  m.tags = [call()]; ys = drawn(() => ({ x:700, top:230, foot:290, half:14 }));
  ok(m.tags[0].place === 'over' && ys[0][0] < 700, `by the buttons: still over him, kept inside the tags' box as a tag is (x ${ys[0] && ys[0][0].toFixed(0)})`);
  // over a whole life the call moves only with him and its 6px rise
  banner(true); m.tags = [call()]; let x = 420; ys = drawn(() => ({ x:(x += 1.5), top:150, foot:205, half:14 }), Math.round(CC.life*60) - 1);
  const jump = Math.max(...ys.slice(1).map((v, i) => Math.abs(v[1] - ys[i][1])));
  ok(ys.length >= 50 && jump < 1, `drawn a whole life with the banner up and him running across it: no jump (${ys.length} frames, the most it moved in a frame ${jump.toFixed(2)}px)`);
  // off the frame: its clock waits for him (CALLS.hold), so it is there when the camera finds him
  banner(false); m.tags = [call()];
  drawn(() => null, 30); ok(m.tags[0].t === 0 && near(m.tags[0].hid, 0.5, 1e-6), 'off the frame for half a second: its clock waits');
  ys = drawn(() => ({ x:400, top:230, foot:290, half:14 }));
  ok(ys.length === 1 && m.tags[0].t > 0 && m.tags[0].t < 0.05, 'and it is drawn, fresh, when he comes into the frame');
  m.tags = [call()]; drawn(() => null, 90); ok(m.tags[0].t > 0.45 && m.tags[0].t < 0.55, `not for ever: past ${CC.hold}s off the frame its clock runs again (${m.tags[0].t.toFixed(2)}s)`);
  ok(CL.lv('hold') === CC.hold, 'CALLS.hold');
  // Two Player: never on the other person's man; beside him, away from that man, where over and under are both taken
  const two = scene({ humans:[true, true] }), me = two.players[4], other = two.players[11];
  T.sides.setCtrl(0, me); T.sides.setCtrl(1, other);
  const where = { [me.n + ':' + me.team]:{ x:420, top:150, foot:220, half:20 }, [other.n + ':' + other.team]:{ x:430, top:225, foot:300, half:20 } };
  const at2 = t => where[t.p.n + ':' + t.p.team];
  banner(true); two.tags = [{ ...call(), p:me, k:T.behind.ringCol(0) }]; ys = drawn(at2);
  ok(two.tags[0].place === 'left' && ys[0][0] < 420 - 20, `Two Player: the banner over him and the other person's man under him: beside him, on the side away from that man (${two.tags[0].place})`);
  where[other.n + ':' + other.team] = { x:640, top:225, foot:300, half:20 }; two.tags = [{ ...call(), p:me, k:T.behind.ringCol(0) }]; drawn(at2);
  ok(two.tags[0].place === 'under', 'the other man well clear: under, as on your own');
  banner(false); where[other.n + ':' + other.team] = { x:420, top:60, foot:140, half:20 }; two.tags = [{ ...call(), p:me, k:T.behind.ringCol(0) }]; drawn(at2);
  ok(two.tags[0].place === 'under', 'the other man just above him: under, never on him');
  // never on that man in any frame of its life, its rise included: each plate as drawCalls draws it (its rounded rect), a whole life long,
  // against his marks (at()'s box in Two Player: seat mark, ring and cue) and against the banner's laid-out box
  const plates = (at, n) => { const out = []; globalThis.__ctxSpy = (k, a) => { if (k === 'roundRect' && a[3] === 26) out.push({ left:a[0], top:a[1], right:a[0] + a[2], bottom:a[1] + a[3] }); }; for (let i = 0; i < n; i++) CL.drawCalls(1/60, at); delete globalThis.__ctxSpy; return out; };
  const on = (ps, o, pad = 0) => Math.max(0, ...ps.map(p => Math.max(0, Math.min(p.right, o.right + pad) - Math.max(p.left, o.left - pad))*Math.max(0, Math.min(p.bottom, o.bottom + pad) - Math.max(p.top, o.top - pad))));
  const box = o => ({ left:o.x - o.half, right:o.x + o.half, top:o.top, bottom:o.foot }), BAN = { left:302, top:117, right:542, bottom:157 };
  const life = Math.round(CC.life*60) - 1, r1 = 10.29, seat = (x, y) => ({ x, top:y - r1*2.4 - 18, foot:y + r1*2.1 + 13, half:r1*1.55 + 5 });   // render-match.js's at() in Two Player
  // the review's case, as the real match staged it on Top at 844x390 when the check failed: the banner over Player 2's man and Player 1's
  // man a metre under him, so no place is clear. It once fell back to under, onto Player 1's man (his cue and the foot of his ring)
  banner(true); where[me.n + ':' + me.team] = seat(455, 174.3); where[other.n + ':' + other.team] = seat(451.75, 185.1);
  two.tags = [{ ...call(), p:me, k:T.behind.ringCol(0) }]; let ps = plates(at2, life);
  const him1 = box(where[other.n + ':' + other.team]);
  ok(two.tags[0].place !== 'under' && ps.length === life && on(ps, him1) === 0 && on(ps, BAN, 6) > 0, `nothing clear (the banner over him, the other person's man under him): never under onto that man, and on him in no frame of its life, its rise included; it is the banner's box that gives (${two.tags[0].place}, ${ps.length} frames, on him ${on(ps, him1).toFixed(0)} px2)`);
  // its rise: over him clear where it starts (3px of air above it, past the 2px pad) and on the other man by the top of its 6px rise
  banner(false); where[me.n + ':' + me.team] = { x:420, top:200, foot:270, half:20 }; where[other.n + ':' + other.team] = { x:430, top:90, foot:171, half:20 };
  const him2 = box(where[other.n + ':' + other.team]);
  two.tags = [{ ...call(), p:me, k:T.behind.ringCol(0) }]; ps = plates(at2, life);
  ok(two.tags[0].place === 'under' && ps.length === life && on(ps, him2) === 0, `the other man just above where the plate over him would start: clear there but on him by the top of its rise, so under (${two.tags[0].place}, on him ${on(ps, him2).toFixed(0)} px2)`);
  CL.setRM(true); two.tags = [{ ...call(), p:me, k:T.behind.ringCol(0) }]; ps = plates(at2, life); CL.setRM(false);
  ok(two.tags[0].place === 'over' && on(ps, him2) === 0, `under reduced motion it holds still, so over him is clear and is taken (${two.tags[0].place})`);
  banner(false); D.view(844, 390);
}
done();

begin('13 your own kick: the ring on a man who may play it');
{
  // the kicker kicks from x 40 to x 56; one teammate stands 15m in front of him by where it lands (offside for it), another a metre behind him
  const kick = on => {
    if (!on) setC({ on:false });
    const m = scene(), k = m.players[2], ahead = m.players[4], back = m.players[5];
    T.sides.setCtrl(0, k); k.x = 40; k.y = 35; ahead.x = 55; ahead.y = 36; back.x = 39; back.y = 40;
    for (const p of m.players) if (p.team === 0 && p !== k && p !== ahead && p !== back) { p.x = 20; p.y = 5 + p.n*8; }
    CL.kickBall(0, 40, 35, 56, 36, 1.5, 8, 'kick');
    const r = { ring:ctrl(0), k, ahead, back, offAhead:CL.offsideMan(ahead), their:ctrl(1) };
    if (!on) resetC();
    return r;
  };
  let r = kick(true);
  ok(r.offAhead && r.ring !== r.ahead && CL.canPlay(r.ring), `your own kick: the ring goes to the nearest man who may play its bounce (${r.ring === r.k ? 'the kicker' : 'the man behind him'}), not the man in front of the kicker by where it lands, who may not`);
  ok(r.ring === r.k || r.ring === r.back, 'one level with or behind the kicker');
  r = kick(false);
  ok(r.ring === r.ahead, 'CALLS off: the nearest man to where it lands, offside or not, as b4a25d5 did');
  // nobody onside to be had: as before
  const m = scene(); T.sides.setCtrl(0, m.players[2]); for (const p of m.players) if (p.team === 0) { p.x = 70; p.y = 35 + p.n; } m.players[2].x = 40;
  m.players[2].down = 1; CL.kickBall(0, 40, 35, 72, 36, 1.5, 8, 'kick');
  ok(ctrl(0) && ctrl(0).team === 0 && !CL.canPlay(ctrl(0)), 'with no man who may play it, the nearest one, as before');
  // the CPU's kick: your ring goes to your man nearest the landing, as before (nobody of yours is offside for it)
  const n = scene(); n.players[4].x = 60; n.players[4].y = 35; CL.kickBall(1, 80, 35, 61, 35, 1.5, 8, 'kick');
  ok(ctrl(0) === n.players[4], 'the CPU\'s kick: your nearest man, as ever');
}
done();

begin('14 the colour on the plate');
{
  const all = [...X.NATIONS, ...X.CLUBS], low = [], kept = [];
  for (const t of all) {
    T.newMatch(t, all.find(o => o !== t && o.cat === t.cat) || all[0], { halfLen:60, headless:true, humans:[true, false] });
    for (const s of [0, 1]) {
      const ink = CL.callInk(s), show = X.showCol(s), r = CL.contrastOf(ink, CL.CALL_PLATE);
      if (r < 3) low.push(`${M().nat[s].id} ${ink} ${r.toFixed(2)}`);
      if (CL.contrastOf(show, CL.CALL_PLATE) >= 3 ? ink !== show : ink === show) kept.push(M().nat[s].id);
    }
  }
  ok(!low.length, `every side's call and banner stand out on the dark plate, 3:1 or more (${all.length} sides, both kits: ${low.join(', ') || 'none under'})`);
  ok(!kept.length, `its own shown colour where that does, lightened only where it does not (${kept.join(', ') || 'every side'})`);
  const m = scene({ a:X.NATIONS.find(n => n.id === 'SCO'), b:X.NATIONS.find(n => n.id === 'ENG') }), ink = CL.callInk(0), show = X.showCol(0);
  ok(CL.contrastOf(ink, CL.CALL_PLATE) >= 3 && CL.contrastOf(ink, CL.CALL_PLATE) < 3.6, `lightened just enough to read (${m.nat[0].id}: ${show} ${CL.contrastOf(show, CL.CALL_PLATE).toFixed(2)} to ${ink} ${CL.contrastOf(ink, CL.CALL_PLATE).toFixed(2)})`);
  ok(CL.bannerInk('Turnover', 0) === ink && CL.bannerInk('Intercepted', 0) === ink && CL.bannerInk('Line Break', 0) === show, 'the Intercepted and Turnover banners in it; other banners as they were');
  setC({ on:false }); ok(CL.bannerInk('Turnover', 0) === show, 'CALLS off: the side\'s shown colour, as b4a25d5 drew it (and the banner itself the old yellow)'); resetC();
}
done();

await browserChecks();
console.log(`Calls: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;

function chromium() {
  const require = createRequire(import.meta.url);
  for (const from of [() => require('playwright'), () => require(path.join(execFileSync('npm', ['root', '-g'], { stdio:['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright'))]) {
    try { return from().chromium; } catch (e) { /* not here */ }
  }
  return null;
}
/* 15. In Chromium, a real match at 844x390 and 667x375 on the camera a new player starts on (Mid), and at 844x390 on Low and on Top:
      each call staged where the ball is, with the game's own frames drawing it. The call drawn over his pointer, the flash, no page
      error; SHOTS=<dir> keeps a picture of each (calls-<call>-<width>-<camera>.png: mid, low or top) */
async function browserChecks() {
  if (process.env.GAME || process.env.NO_BROWSER) { console.log('skip the browser checks (GAME or NO_BROWSER set)'); return; }
  const chrome = chromium();
  if (!chrome) { console.log('skip the browser checks: Playwright is not installed (npm i -g playwright && npx playwright install chromium)'); return; }
  let browser;
  try { browser = await chrome.launch(); } catch (e) { console.log('skip the browser checks: Chromium would not start (' + e.message.split('\n')[0] + ')'); return; }
  const dir = fileURLToPath(new URL('../', import.meta.url)), shots = process.env.SHOTS || null;
  if (shots) fs.mkdirSync(shots, { recursive:true });
  const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.json':'application/json', '.webmanifest':'application/manifest+json', '.m4a':'audio/mp4' };
  const server = http.createServer((req, res) => {
    const file = path.resolve(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type':TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(+process.env.PORT || 0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`, wait = ms => new Promise(r => setTimeout(r, ms));
  const B = (cond, msg) => ok(cond, 'browser: ' + msg);
  group = '15 browser';
  try {
    for (const [W, H] of [[844, 390], [667, 375]]) for (const cam of [2, 1, 0]) {   // settings.cam: 2 Mid, 1 Low, 0 Top
      if (cam !== 2 && W !== 844) continue;                // Low and Top once, at the larger size
      const kinds = ['picked-up', 'intercepted', 'turnover', 'turnover-pressure', 'offload', 'cpu-intercept'].concat(cam ? [] : ['turnover-two']);   // Two Player plays on Top only (behindOn)
      for (const kind of kinds.filter(k => !process.env.CALLS_ONLY || process.env.CALLS_ONLY.split(',').includes(k))) {   // CALLS_ONLY=turnover,offload: those alone
        const ctx = await browser.newContext({ viewport:{ width:W, height:H }, deviceScaleFactor:2, isMobile:true, hasTouch:true, serviceWorkers:'block' });
        const page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
        await page.goto(base + 'index.html', { waitUntil:'load' });
        await page.waitForFunction(() => window.__tryline && window.__tryline.debug);
        const started = await page.evaluate(({ kind, cam }) => {
          const T = window.__tryline, D = T.debug, S = D.settings(), X = T.teams;
          S.tut = D.TUT_IDS.slice(); S.tips = D.COACH_IDS.slice(); S.hints = false; S.cam = cam; S.camPick = true; S.played = 99; S.diff = 1; S.kids = false; S.finished = 99;
          const nat = id => X.NATIONS.find(n => n.id === id);
          if (kind === 'offload') { const cr = T.career.create({ pos:'B', num:5, club:X.CLUBS[0], proMode:true }); T.career.set(cr); T.career.play(); }
          else if (kind === 'cpu-intercept') D.startMatch(nat('ENG'), nat('SCO'), false);   // a dark kit (Scotland's navy, 1.4:1 on the plate): its banner lightened to read
          else if (kind === 'turnover-two') D.startMatch(nat('ENG'), nat('FRA'), false, { two:true, levels:[1, 1] });
          else D.startMatch(X.CLUBS[0], X.CLUBS[1], false);
          const drawn = window.__drawn = [], at = window.__at = [];
          const ft = CanvasRenderingContext2D.prototype.fillText;
          const manY = () => {                                // the screen y his body is drawn at (drawPos, src/render-pitch.js): the call's offset from it is what must not jump
            const c = T.M.tags.find(q => q.call), p = c && c.p; if (!p) return null;
            const f = p.drawFrom, u = f && f.t > 0 ? Math.min(1, Math.max(0, f.t/f.T)) : 0;
            return T.behind.toS(p.x + (u ? (f.x - p.x)*u : 0), p.y + (u ? (f.y - p.y)*u : 0))[1];
          };
          CanvasRenderingContext2D.prototype.fillText = function (t, x, y, ...a) { drawn.push(String(t)); at.push([String(t), x, y, String(this.strokeStyle), manY()]); return ft.call(this, t, x, y, ...a); };
          return !!T.M;
        }, { kind, cam });
        for (let i = 0; i < 120; i++) { if (await page.evaluate(() => { const M = window.__tryline.M; return M.phase === 'play' && !M.cut && !M.tut && !M.paused && M.clock > 3; })) break; await wait(50); }
        const r = await page.evaluate(kind => {
          const T = window.__tryline, M = T.M, CL = T.calls, b = M.ball, K = T.knock.KNOCK, R = T.contact.RUCK;
          const k0 = { base:K.base, intercept:K.intercept }, pen = R.pen;
          K.base = 0; K.intercept = 0; R.pen = 0;               // the staged catches hold and the staged ruck is never a penalty: the call is what is looked at
          const ref = T.sides.ctrlOf(0) || (b.state === 'held' ? b.carrier : b);   // where the camera already is: it follows the ring's man
          const bx = Math.max(25, Math.min(95, ref.x)), by = Math.max(15, Math.min(55, ref.y));
          const free = () => { M.contact = null; for (const p of M.players) { p.bind = null; p.down = 0; p.offside = 0; p.tcd = 1; p.vx = p.vy = 0; } };
          const mine = M.careerP || M.players[4], theirs = M.players[10];
          let tries = 0, okNow = false;
          while (!okNow && tries++ < 40) {
            free(); M.phase = 'play'; M.set = null; M.cut = null; M.tags = [];
            for (const p of M.players) if (p !== mine && p !== theirs && Math.hypot(p.x - bx, p.y - by) < 6) p.y = by + (p.y >= by ? 7 : -7);
            if (kind === 'picked-up' || kind === 'turnover-pressure') {
              mine.x = bx; mine.y = by; mine.fx = 1; mine.fy = 0;
              Object.assign(b, { state:'loose', carrier:null, f:null, x:bx + 0.3, y:by, z:0, vx:0, vy:0, vz:0, last:kind === 'picked-up' ? 0 : 1, kickInfo:null, egg:null, tumble:null, off:null });
              if (kind === 'turnover-pressure') { T.press.eggStart(b, 1, true, 7); b.egg.rolling = true; }
              CL.updateLoose(T.STEP);
              okNow = b.carrier === mine;
            } else if (kind === 'intercepted') {
              mine.x = bx; mine.y = by; theirs.x = bx + 5; theirs.y = by;
              Object.assign(b, { state:'air', carrier:null, x:bx + 0.2, y:by, z:1.1, off:null, f:{ kind:'pass', team:1, x0:bx + 5, y0:by, x1:bx - 8, y1:by, t:0.2, T:0.8, H:0.5, z0:1.1, z1:1.1, rolled:new Set(), onside:null, target:M.players[9], sure:false, long:false } });
              CL.catchBall(mine, 'intercept');
              okNow = b.carrier === mine;
            } else if (kind === 'turnover') {
              mine.x = bx + 0.6; mine.y = by + 1; theirs.x = bx - 0.6; theirs.y = by - 1;
              CL.resolveRuck({ team:1, x:bx, y:by, dom:true, domP:0.4 });
              okNow = !!(b.carrier && b.carrier.team === 0);
            } else if (kind === 'cpu-intercept') {               // the CPU intercepts your pass: its banner in its colour, and no call for anyone
              theirs.x = bx; theirs.y = by; mine.x = bx - 5; mine.y = by;
              Object.assign(b, { state:'air', carrier:null, x:bx - 0.2, y:by, z:1.1, off:null, f:{ kind:'pass', team:0, x0:bx - 5, y0:by, x1:bx + 8, y1:by, t:0.2, T:0.8, H:0.5, z0:1.1, z1:1.1, rolled:new Set(), onside:null, target:M.players[2], sure:false, long:false } });
              CL.catchBall(theirs, 'intercept');
              okNow = b.carrier === theirs;
            } else if (kind === 'turnover-two') {                // Player 2 wins Player 1's ruck, with Player 1's ringed man right by it (the review's case)
              const p1 = M.players.find(p => p.team === 0 && p !== mine);
              mine.x = bx - 0.6; mine.y = by - 1; theirs.x = bx + 0.6; theirs.y = by + 1.2; p1.x = bx + 0.3; p1.y = by + 2.2; T.sides.setCtrl(0, p1);
              CL.resolveRuck({ team:0, x:bx, y:by, dom:true, domP:0.4 });
              okNow = !!(b.carrier && b.carrier.team === 1);
            } else {
              const c = M.players.find(p => p.team === 0 && p !== mine); c.x = bx; c.y = by; c.fx = 1; c.fy = 0; theirs.x = bx + 1; theirs.y = by;
              c.x = bx + 4; c.y = by - 3; theirs.x = bx + 5; mine.x = bx; mine.y = by;
              for (const p of M.players) if (p.team === 0 && p !== c && p !== mine && Math.hypot(p.x - bx, p.y - by) < 10) p.y = by > 35 ? 5 : 65;
              const k = { c, q:theirs, q2:null, mode:'ai', tier:'wrap', t:0.2, T:0.25, v0:{ x:0, y:0 }, front:true, aiOff:null, offloaded:false, margin:0, margin0:0, hit:false, dp:0, cSprint:false };
              c.bind = k; theirs.bind = k; M.contact = k; Object.assign(b, { state:'held', carrier:c, f:null, off:null });
              CL.offload(k, false);
              const f = b.f;
              if (f && f.kind === 'pass' && f.target === mine) { mine.x = f.x1; mine.y = f.y1; f.t = f.T; b.x = f.x1; b.y = f.y1; CL.resolvePass(); }
              okNow = b.carrier === mine;
            }
          }
          K.base = k0.base; K.intercept = k0.intercept; R.pen = pen;
          const call = M.tags.find(t => t.call), side = kind === 'turnover-two' ? 1 : 0;
          window.__drawn.length = 0; window.__at.length = 0;
          const k = document.querySelector('#banner .msg'), ink = k ? k.style.getPropertyValue('--k') : null;
          return { okNow, tries, call:call ? call.text : null, k:call ? call.k : null, ring:T.sides.ctrlOf(side) === b.carrier, flash:!!M.flash, stop:M.stop, ink, want:CL.callInk(kind === 'cpu-intercept' ? 1 : side), ringCol:T.behind.ringCol(side), show1:T.teams.showCol(1) };
        }, kind);
        await wait(260);
        if (shots) await page.screenshot({ path:path.join(shots, `calls-${kind}-${W}-${CAMS[cam].toLowerCase()}.png`) });
        const two = kind === 'turnover-two' ? await page.evaluate(() => {   // where the call stands against Player 1's ring and seat mark, a frame in
          const T = window.__tryline, M = T.M, t = M.tags.find(q => q.call), p1 = T.sides.ctrlOf(0), [cx, cy] = T.behind.toS(p1.x, p1.y), s = T.behind.toS(p1.x + 1, p1.y)[0] - cx, r = Math.max(8, 0.95*s);
          const last = window.__at.filter(a => a[0] === 'TURNOVER').pop(), w = last ? document.getElementById('cv').getContext('2d').measureText('TURNOVER').width + 22 : 0;
          if (!t || !last) return null;
          const plate = { left:last[1] - w/2, right:last[1] + w/2, top:last[2] - 14, bottom:last[2] + 12 }, man = { left:cx - r*1.55 - 5, right:cx + r*1.55 + 5, top:cy - r*2.4 - 16, bottom:cy + r*1.55 + 5 };
          const hit = plate.left < man.right && plate.right > man.left && plate.top < man.bottom && plate.bottom > man.top;
          return { place:t.place, hit, edge:last[3], plate, man };
        }) : null;
        await wait(900);
        const drawn = await page.evaluate(() => window.__drawn.slice()), at = await page.evaluate(() => window.__at.slice());
        const word = { 'picked-up':'PICKED UP', intercepted:'INTERCEPTED', turnover:'TURNOVER', 'turnover-pressure':'TURNOVER', offload:'OFFLOAD', 'cpu-intercept':null, 'turnover-two':'TURNOVER' }[kind];
        const label = `${kind} at ${W}x${H} on ${CAMS[cam]}`;
        if (kind === 'cpu-intercept') {
          B(r.okNow && !r.call && r.ink === r.want && r.ink !== r.show1, `${label}: the CPU's interception, no call; its banner in Scotland's navy lightened to read (${r.ink}, 3:1 on the plate)`);
        } else {
          const ys = at.filter(a => a[0] === word && a[3].toLowerCase() === String(r.k).toLowerCase() && a[4] != null).map(a => a[2] - a[4]), jump = ys.length > 1 ? Math.max(...ys.slice(1).map((y, i) => Math.abs(y - ys[i]))) : 0;
          B(r.okNow && r.ring && r.flash && r.call && r.call.toUpperCase() === word, `${label}: staged in a real match (${r.tries} ${r.tries === 1 ? 'try' : 'tries'}), the ring on the new carrier, the call ${r.call}, the flash`);
          B(drawn.includes(word), `${label}: the game's own frames draw it (${drawn.filter(t => t === word).length} frames)`);
          if (process.env.VERBOSE) console.log(label, at.filter(a => a[0] === word).map(a => a[2].toFixed(1) + '/' + (a[4] == null ? '-' : a[4].toFixed(1))).join(' '));
          B(ys.length > 20 && jump < 12, `${label}: it goes with him for its life and never jumps: its place against his body moves at most ${jump.toFixed(1)}px a frame (${ys.length} frames; from over him to under him is 60px or more, and the jump it once made was 115px)`);
          if (/^(intercepted|turnover)$/.test(kind)) B(r.ink === r.want && r.k === r.want, `${label}: the banner and the call's plate in your colour on the plate (${r.ink})`);
          if (two) B(r.k === r.ringCol && /ff5fd2/i.test(r.k) && two.edge.toLowerCase() === r.k.toLowerCase() && !two.hit, `${label}: Two Player, Player 2's call edged in his pink, ${/^(left|right)$/.test(two.place) ? 'beside him, on his ' + two.place : two.place + ' him'}, clear of Player 1's ring and seat mark (${JSON.stringify(two.plate)} v ${JSON.stringify(two.man)})`);
        }
        B(!errors.length, `${label}: no page errors (${errors.join('; ')})`);
        await ctx.close();
      }
    }
    done();
  } finally { await browser.close(); server.close(); }
}
