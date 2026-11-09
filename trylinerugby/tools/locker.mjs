// The Locker: medals for feats, the balls and boots they unlock, and the Legends. The tables, each feat counted from real played
// matches (seeded, through Quick Match, Two Player, Kids, a career and a championship to full time), tiers at 1, 3 and 10, one count a
// match, the unlocks, the Legends' order and ratings, lockerEvent, nothing counted in AI v AI, the demo, a drill's match or a tool's,
// Star Pupil's one save after a game and its Gold over the games the player can see (ten, or seven at Kids or Minis), the save, the full-time card, the home button, the Locker screen, the team screen's hook, the
// render hooks, and AI v AI, the demo and the balance tools pinned to d6192ad, the build before the Locker. Last, in a real browser
// when Playwright is installed: the home rows in every state at 844x390 and 667x375 (and with a Trophy Cabinet, the Locker adding no
// height), the Locker's tabs at both sizes, its keyboard and controller reach, Continue on the full-time card with medals on it, and
// full time in Quick Match, Two Player, a Championship and a career never taller with medals than without. The Super Fan trophy too:
// first on the Medals tab, gold with the club's kit colours, never a medal; and in the browser the tab with it, the Supporters' Wall
// card at both steps, the Grown-Ups panel with Join the Supporters' Wall beside the club's name (plain, with the Kids buttons and a
// message, after a real Restore Purchases), two clubs' trophies sharing the row (names never broken inside a word) and the Grown-Ups
// panel beside a second club on offer, and the Trophy Cabinet with the trophy first, at both sizes.
// node tools/locker.mjs            (SEED=37 unless set; VERBOSE=1 lists every check)
// node tools/locker.mjs --pins     prints this build's fingerprints; GAME=<d6192ad>/index.html node tools/locker.mjs --pins re-pins BASE
process.env.SEED ??= '37';
const { T, reseed, rndCalls, bot, kickBot } = await import('./harness.mjs');
const { readGameSource } = await import('./source.mjs');
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const D = T.debug, X = T.teams, $ = id => document.getElementById(id);
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else failed++; if (!cond || process.env.VERBOSE) console.log(cond ? 'ok  ' : 'FAIL', msg); };
const json = v => JSON.stringify(v);
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };

// a match played to full time through the real path: the half-time card's Second Half (the half-time score noted on the way, for
// Comeback, read off the card's own moment rather than the Locker's), and a penalty card's choice
let htSeen = null;
function playOut(step, limit = 400000) {
  const M = T.M; let n = 0; htSeen = null;
  while (!M.over && n < limit) {
    if (M.phase === 'break') { if (!htSeen) htSeen = M.score.slice(); $('br-go').click(); continue; }
    if (M.phase === 'menu' && !$('m-pen').hidden) { ($('p-goal').disabled ? $('p-tap') : $('p-goal')).click(); continue; }
    step(); T.update(T.STEP); n++;
  }
  return n;
}
// at Kids the aim is set for you (src/kids.js), so the goal-kick bot takes the aim it is given rather than steering to its own
const kidStep = () => { const M = T.M; if (M.phase === 'cut' && M.cut && M.cut.kind === 'goal' && M.cut.g.type !== 'drop') kickBot(M.cut, { aim:M.cut.g.aim }); else bot(0); };
// the harness's average player, who also goes for a drop goal whenever the small button reads Drop Goal (holding it the 0.2 s the
// cut needs; the drop's close-up is then the harness's dropBot)
let holdN = 0;
function dropper() {
  bot(0);
  const M = T.M, inp = T.input, c = T.sides.ctrlOf(0);
  if (holdN > 0) { holdN--; inp.bDown = true; if (!holdN && M.phase === 'play') inp.bDown = false; }
  else if (M.phase === 'play' && M.ball.state === 'held' && M.ball.carrier === c && T.kick.kickLabel(0) === 'Drop Goal') { inp.bPressed = inp.bDown = true; holdN = 16; }
}

// 0. AI v AI, the demo, a balance tool's CPU v CPU arcade match, a tool's headless match you play, a real Quick Match played to full
//    time (drop goals and duels included, so every Locker counter runs) and a drill play exactly as on d6192ad, the build before the
//    Locker, drawing the same random numbers. Run first, so nothing below can move them. The same runs on d6192ad's bundle gave BASE.
// Re-pinned at the merge with the team hierarchy and XV rankings (ed37be5): the nations were re-rated and leagues added, which moves
// AI v AI, the balance tool's match and the drill; ed37be5's own bundle (GAME=…, before the Locker) gives exactly these.
const BASE = '10zzk73 8b7zl6 11u5ozs il31ym 11qgilk 1supghy 1cvtc63';   // re-pinned at the real order (src/ratings.js, CLUB_RATED, 2026-11-09): Farnham v Aldershot, the tool's match and the played Quick Match, are 61 v 46 (were 75 v 64), so those two and the count of random draws moved; with CLUB_RATED=band this build gives the pin before it exactly, 10zzk73 8b7zl6 11u5ozs 1jkynuv 1uh5grx 1supghy grh2qa. Before that: re-pinned at PR #14's club table (src/ratings.js, CLUB_RATED): Aldershot, Farnham's opponent in the tool's match and the played Quick Match, is 64 (13), was 72 (16), so those two and the count of random draws moved; with CLUB_RATED=off this build gives the pin before it exactly, 10zzk73 8b7zl6 11u5ozs 1jd47ou 1kocfio 1supghy xxh75. Before that: re-pinned at the PR #14 merge for its calmer passing (PASS_FLIGHT: the ball hangs longer and a catcher gets a moment): with PASS_FLIGHT='{"match":1,"kids":1,"grace":[0,0,0],"graceKids":0}' and the drill's own pace and sides set back as well (DRILL_PACE.live 1, and Farnham v Haslemere at their list ratings in place of DRILL_SUMS: PR #14's Training Ground), this build gives the old pin exactly, 1fast3u lxxgtn wqrpcq ukcalr 7j5dfk itv0j6 12qe5us
function pins() {
  const out = [], r0 = rndCalls();
  reseed(23); out.push(json(T.simulate(2, 60, 1).map(r => [r.teams, r.score, r.tries, r.stats, r.steps])));
  reseed(42); T.newMatch(X.NATIONS[2], X.NATIONS[1], { halfLen:1e9, diff:1, auto:true, demo:true });
  for (let i = 0; i < 2400; i++) T.update(T.STEP);
  out.push(json([T.M.score, T.M.stats, T.M.players.map(p => [p.x.toFixed(5), p.y.toFixed(5)])]));
  reseed(43); T.newMatch(X.NATIONS[1], X.NATIONS[2], { halfLen:60, diff:1, auto:true, headless:true, arcade:true });
  { let n = 0; while (!T.M.over && n < 200000) { T.update(T.STEP); n++; } out.push(json([T.M.score, T.M.tries, T.M.stats, n])); }
  reseed(44); T.newMatch(X.CLUBS[0], X.CLUBS[3], { halfLen:60, diff:1, headless:true, humans:[true, false], arcade:true, duels:'live' });
  { let n = 0; holdN = 0; while (!T.M.over && n < 200000) { dropper(); T.update(T.STEP); n++; } out.push(json([T.M.score, T.M.tries, T.M.stats, n])); }
  reseed(45); holdN = 0; D.startMatch(X.CLUBS[0], X.CLUBS[3], false);
  { const n = playOut(dropper); out.push(json([T.M.score, T.M.tries, T.M.stats, n])); D.exitMatch(); }
  reseed(46); T.practice.start('defend'); $('pr-retry').click();
  for (let i = 0; i < 1500; i++) { bot(0); T.update(T.STEP); }
  out.push(json([T.M.players.map(p => [p.x.toFixed(5), p.y.toFixed(5)]), T.M.ball.x.toFixed(6), T.M.ball.y.toFixed(6)])); T.practice.leave();
  out.push(String(rndCalls() - r0));
  return out.map(fnv).join(' ');
}
if (process.argv.includes('--pins')) { console.log(pins()); process.exit(0); }
{ const now = pins(); ok(now === BASE, `AI v AI, the demo, a balance tool's match, a tool's match, a played Quick Match and a drill play as at d6192ad, with the same random draws (seeded fingerprint ${now}, pinned ${BASE})`); }

const L = T.locker, C = T.career, P = T.practice;
// the browser save, counted; the Locker's screen joins the harness's list so showScreen toggles it
const memory = {}; let writes = 0;
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; writes++; } };
const saved = () => JSON.parse(memory['tryline.v1']);
{ const qsa = document.querySelectorAll; document.querySelectorAll = sel => (sel === '.screen' ? qsa(sel).concat([$('s-locker')]) : qsa(sel)); }
const fresh = () => { L.set(L.fresh()); };
const counts = () => Object.fromEntries(L.FEATS.map(f => [f.id, L.count(f.id)]));
const html = readGameSource();
const src = ['locker.js', 'ui-locker.js'].map(f => fs.readFileSync(new URL('../src/' + f, import.meta.url), 'utf8')).join('\n');
const css = (s => s.slice(s.indexOf('/* ===== locker ===== */')))(fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8'));
const isTitle = s => s.split(' ').every((w, i) => (i > 0 && ['a', 'an', 'the', 'and', 'or', 'of', 'on', 'to', 'in', 'for', 'as', 'at', 'by'].includes(w)) || /^[A-Z0-9]/.test(w));

// 1. the tables
{
  const ids = L.FEATS.map(f => f.id);
  ok(ids.length === 12 && new Set(ids).size === 12, 'twelve feats, each its own id');
  ok(L.FEATS.every(f => isTitle(f.name) && f.name.split('-').every(p => /^[A-Z]/.test(p))), 'every feat name is Title Case');
  ok(L.FEATS.every(f => /^[A-Z][^.]*\.$/.test(f.line) && f.line.length <= 32), 'every feat line is one short sentence');
  ok(['Hat-Trick', 'Sharpshooter', 'Big Hitter', 'Clean Sheet', 'Golden Try', 'Comeback', 'Drop Goal', 'On Fire Twice', 'Champions', 'Star Pupil', 'Silverware', 'Call-Up'].every(n => L.FEATS.some(f => f.name === n)), 'the feats asked for are all there');
  ok(json(L.TIERS) === '[1,3,10]' && json(L.tiers('hat')) === '[1,3,10]' && json(L.tiers('star')) === json([1, 3, T.drills.DRILLS.length]) && T.drills.DRILLS.length <= 10, `Bronze, Silver and Gold at 1, 3 and 10; Star Pupil's Gold is every drill (${T.drills.DRILLS.length})`);
  const items = L.FEATS.flatMap(f => f.unlock);
  ok(L.FEATS.every(f => f.unlock.length === 2) && new Set(items).size === 24, 'every Bronze and every Silver unlocks its own ball or boots');
  const all = [...L.BALLS.slice(1).map(b => 'ball:' + b.id), ...L.BOOTS.slice(1).map(b => 'boots:' + b.id)];
  ok(all.length === 24 && all.every(i => items.includes(i)) && items.every(i => all.includes(i)), 'every ball and boots but the defaults is unlocked by exactly one medal');
  ok(L.BALLS[0].id === 'classic' && L.BALLS[0].fill === '#f6f3ea' && L.BALLS[0].line === '#3b2f22' && L.BOOTS[0].id === 'black' && !L.source('ball', 'classic') && !L.source('boots', 'black'), 'Classic and Black are the defaults, the ball as it always was, unlocked from the start');
  ok([...L.BALLS, ...L.BOOTS].every(b => isTitle(b.name)) && L.BOOTS.some(b => b.name === 'Neon Green') && L.BALLS.some(b => b.id === 'rainbow') && L.BALLS.some(b => b.id === 'gold') && L.BOOTS.some(b => b.id === 'gold'), 'colourways named in Title Case, Rainbow and Gold among them');
  ok(!/tartan/i.test(src) && !/tartan/i.test(json([L.BALLS, L.BOOTS])), 'no tartan');
  ok(json(L.EVENTS) === json({ champ:'champ', euro:'silver', world:'silver', tour:'silver', triple:'silver', callup:'callup' }), "lockerEvent's ids: champ to Champions, euro, world, tour and triple to Silverware, callup to Call-Up");
}

// 2. the Legends: World Cup winners by nation and year (checked 2026-11-08: men 1987 to 2023, women 1991 to 2025, the 2021 women's
//    World Cup played in 2022), ratings at the top of the scale, the nation's kit, codes unique across every list
{
  const G = L.LEGENDS, men = G.filter(t => t.cat === 'men'), women = G.filter(t => t.cat === 'women');
  const MEN = [['New Zealand', 1987], ['Australia', 1991], ['South Africa', 1995], ['Australia', 1999], ['England', 2003], ['South Africa', 2007], ['New Zealand', 2011], ['New Zealand', 2015], ['South Africa', 2019], ['South Africa', 2023]];
  const WOMEN = [['USA', 1991], ['England', 1994], ['New Zealand', 1998], ['New Zealand', 2002], ['New Zealand', 2006], ['New Zealand', 2010], ['England', 2014], ['New Zealand', 2017], ['New Zealand', 2021], ['England', 2025]];
  ok(G.length === 20 && json(men.map(t => [t.nation, t.year])) === json(MEN) && json(women.map(t => [t.nation, t.year])) === json(WOMEN), 'ten men\'s and ten women\'s World Cup winners, in date order');
  ok(men.every(t => t.name === t.nation + ' ' + t.year) && women.every(t => t.name === t.nation + ' ' + t.year + ' Women'), "named by nation and year only; a women's side says Women");
  ok(G.every(t => /^(?:New Zealand|Australia|South Africa|England|USA) (?:19|20)\d\d(?: Women)?$/.test(t.name)), 'no name but a nation and a year: no player, likeness or nickname');
  const ids = G.map(t => t.id), others = X.ALL_TEAMS.map(t => t.id);
  ok(new Set(ids).size === 20 && ids.every(id => !others.includes(id)) && men.every(t => t.id === 'L' + String(t.year).slice(2)) && women.every(t => t.id === 'W' + String(t.year).slice(2)), 'codes unique across every list: L87 to L23, W91 to W25');
  const ab = T.stamina.ABILITIES.map(([k]) => k), sum = t => ab.reduce((a, k) => a + t[k], 0);
  ok(G.every(t => X.overallOf(t) >= 96 && X.overallOf(t) <= 99 && sum(t) >= 24 && sum(t) <= 25 && ab.every(k => t[k] >= 4 && t[k] <= 5)), 'every Legend rated 96 to 99, its five abilities summing 24 or 25');
  ok(G.every(t => ab.includes(t.style) && t[t.style] === 5), "each has a style, one of its 5s (England 2003's is kicking)");
  ok(G.find(t => t.id === 'L03').style === 'kicking' && G.filter(t => X.overallOf(t) === 99).length === 4, 'England 2003 kicks; four sides rated 99, the rest 96');
  const HEX = /^#[0-9a-f]{6}$/i;
  ok(G.every(t => HEX.test(t.kit) && HEX.test(t.trim) && HEX.test(t.alt) && HEX.test(t.altTrim)) && G.filter(t => t.nation === 'New Zealand').every(t => t.kit === '#1c1c1c') && G.filter(t => t.nation === 'England').every(t => t.kit === '#f2efe6'), "the nation's kit colours, with a change kit for a clash");
  ok(women.every(t => t.cat === 'women') && men.every(t => t.cat === 'men'), "a women's side carries cat 'women', so Men | Women | Minis leaves its name alone");
  ok(!X.POOLS.flat().some(t => ids.includes(t.id)) && !X.ALL_TEAMS.some(t => ids.includes(t.id)), 'no Legend in any built-in list: never in the demo, a championship draw or a career (they come only from the International hook)');
}

// the README's two tables say what the code does
{
  const md = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8'), sec = md.slice(md.indexOf('## Locker'), md.indexOf('\n## ', md.indexOf('## Locker') + 3));
  const row = f => sec.split('\n').find(l => l.startsWith('| ' + f.name + ' |'));
  const name = u => { const [k, id] = u.split(':'), it = (k === 'ball' ? L.BALLS : L.BOOTS).find(x => x.id === id); return it.name + (k === 'ball' ? ' Ball' : ' Boots'); };
  ok(L.FEATS.every(f => { const r = row(f); return r && r.endsWith('| ' + name(f.unlock[0]) + ' | ' + name(f.unlock[1]) + ' |'); }), "the README's medal table names each feat's Bronze and Silver unlocks");
  const men = L.LEGENDS.filter(t => t.cat === 'men'), women = L.LEGENDS.filter(t => t.cat === 'women'), cap = s => s[0].toUpperCase() + s.slice(1);
  ok(men.every((m, i) => { const w = women[i]; return sec.includes(`| ${i + 1} | ${m.name} | ${m.id} | ${cap(m.style)} | ${X.overallOf(m)} | ${w.name} | ${w.id} | ${cap(w.style)} | ${X.overallOf(w)} |`); }), "the README's Legends table: each Gold's two sides, codes, styles and ratings");
}

// 3. which Legends are unlocked: the nth Gold, the nth side of each list
{
  fresh();
  ok(L.legends('men').length === 0 && L.legends('women').length === 0, 'no Gold, no Legends');
  const golds = n => { fresh(); L.FEATS.filter(f => f.id !== 'star').slice(0, n).forEach(f => { L.state().n[f.id] = 10; }); };
  let good = true;
  for (let g = 1; g <= 10; g++) {
    golds(g);
    const m = L.legends('men'), w = L.legends('women');
    if (L.golds() !== g || json(m.map(t => t.id)) !== json(L.LEGENDS.filter(t => t.cat === 'men').slice(0, g).map(t => t.id)) || json(w.map(t => t.id)) !== json(L.LEGENDS.filter(t => t.cat === 'women').slice(0, g).map(t => t.id))) good = false;
  }
  ok(good, 'each Gold unlocks the next side of each list, in date order');
  golds(1); ok(json(L.legends('minis')) === json(L.legends('men')) && L.legends('men')[0].id === 'L87' && L.legends('women')[0].id === 'W91', 'the first Gold: New Zealand 1987 and USA 1991 Women; Minis play the men\'s');
  fresh(); for (const f of L.FEATS) if (f.id !== 'star') L.state().n[f.id] = 10; L.state().drills = T.drills.DRILLS.map(d => d.id);
  ok(L.golds() === 12 && L.legends('men').length === 10 && L.legends('women').length === 10, 'twelve Golds: all twenty Legends, and nothing beyond');
}

// 4. each feat counted from real played matches, through the real path to the full-time card. Each match's feats are read off the
//    match's own facts (score arithmetic for drop goals, the Tackle duels won for Big Hits, the half-time card's score for Comeback),
//    so a counter that missed a moment would show. Pinned seeds cover every feat; after an engine change moves them, more are played.
const won = { hat:0, sharp:0, hit:0, clean:0, golden:0, comeback:0, drop:0, fire:0 };
function facts(me) {
  const M = T.M, S = M.stats, op = 1 - me, drops = (M.score[me] - 5*M.tries[me] - 2*S.conv.made[me] - 3*S.pen.made[me])/3;
  const two = M.two, hits = (S['dom' + me] || 0) + (two ? (M.lk ? M.lk.hits[me] : 0) : (S.w_tackle || 0)), win = M.score[me] > M.score[op];
  return { drops, hits, set:{ hat:M.tries[me] >= 3, sharp:S.conv.made[me] + S.pen.made[me] + drops >= 3, hit:hits >= 3, clean:win && M.tries[op] === 0, golden:win && !!M.golden,
    comeback:win && !!htSeen && htSeen[me] < htSeen[op], drop:drops >= 1, fire:(S['fire' + me] || 0) >= 2 } };
}
function played(seed, a, b, o = {}) {
  const s = D.settings(); s.diff = o.diff ?? 1; s.half = 0; s.kids = !!o.kids;
  const before = counts();
  reseed(seed); holdN = 0;
  if (o.career) { const cr = C.create({ pos:'B', num:5, club:a }); C.set(cr); C.play(); }
  else D.startMatch(a, b, false, o.two ? { two:true, levels:[1, 1] } : undefined);
  const live = L.counts(), M = T.M;
  const t0 = Object.fromEntries(L.FEATS.map(f => [f.id, L.tier(f.id)]));
  playOut(o.drop ? dropper : o.kids ? kidStep : () => bot(0));
  const f = facts(0), after = counts(), want = Object.keys(f.set).filter(k => f.set[k]);
  const diff = Object.keys(after).filter(k => after[k] !== before[k]);
  const exact = json(diff.sort()) === json(want.slice().sort()) && want.every(k => after[k] === before[k] + 1);
  const again = L.match(), still = json(counts()) === json(after);
  for (const k of want) won[k]++;
  const crossed = L.FEATS.filter(f => L.tier(f.id) > t0[f.id]), card = $('br-medals').innerHTML;
  const shown = !$('br-medals').hidden === crossed.length > 0 && crossed.every(f => card.includes(f.name)) && L.FEATS.filter(f => !crossed.includes(f)).every(f => !card.includes('<b>' + f.name + '</b>'));
  const r = { M, live, exact, still, again, want, diff, f, shown, kids:!!M.kids, career:!!M.career };
  if (o.career) C.set(null);
  D.exitMatch();
  return r;
}
{
  fresh(); writes = 0;
  const runs = [
    played(12, X.CLUBS[0], X.CLUBS[1]),                          // Farnham v Haslemere on Normal: tries, goals, Big Hits, a clean sheet, On Fire
    played(43, X.CLUBS[0], X.CLUBS[3], { drop:true }),            // Farnham v Aldershot, going for drop goals: behind at half time, level at the hooter, a Golden Try
    played(37, X.CLUBS[0], X.CLUBS[3], { drop:true }),
  ];
  for (let s = 100; s < 160 && Object.values(won).some(v => !v); s++) runs.push(played(s, X.CLUBS[0], X.CLUBS[11], { drop:true }));   // only after an engine change. Re-pinned at the real order (2026-11-09): Farnham v Wimbledon (61 v 58, both Regional 1), since Aldershot (46) is too far under Farnham (61) for a match level at the hooter, so no Golden Try came in 60 seeds; main had them 75 v 72, as close
  ok(runs.every(r => r.live), 'a Quick Match you play is one the Locker counts');
  ok(runs.every(r => r.exact), 'each played match counts exactly the feats it had, once each (' + runs.map(r => r.want.join('+') || 'none').join(' | ') + ')' + runs.filter(r => !r.exact).map(r => ' MISMATCH want ' + r.want + ' got ' + r.diff).join(''));
  ok(runs.every(r => r.f.drops === Math.round(r.f.drops) && r.f.drops >= 0), 'every point is a try, a conversion, a penalty goal or a drop goal: the drop goals are read off the score');
  ok(runs.every(r => r.still && Array.isArray(r.again) && !r.again.length), 'full time counts once: a second call adds nothing');
  ok(Object.values(won).every(v => v > 0), 'between them the played matches did every match feat: ' + json(won));
  ok(runs.some(r => r.f.drops > 0 && r.M.lk && r.M.lk.drops[0] === r.f.drops), 'drop goals, open-play and close-up alike, counted as the score has them');
  ok(runs.every(r => r.shown), 'the full-time card names exactly the medals each match won, and shows no row when none was');
}
// a match you play in Kids, a career match and Two Player (Player 1's side) count too
{
  const kids = played(21, X.CLUBS[0], X.CLUBS[1], { diff:0, kids:true });
  ok(kids.kids && kids.live && kids.exact, 'a Kids match counts its feats (' + kids.want.join('+') + ')' + (kids.exact ? '' : ' MISMATCH ' + json([kids.kids, kids.live, kids.diff, kids.f])));
  const car = played(301, X.CLUBS[0], null, { career:true });
  ok(car.career && car.live && car.exact, 'a career match counts its feats (' + car.want.join('+') + ')');
  const before = counts();
  reseed(61); D.settings().diff = 1; D.startMatch(X.CLUBS[0], X.CLUBS[1], false, { two:true, levels:[1, 1] });
  ok(L.counts() && L.side() === 0 && T.M.two, 'Two Player counts, for Player 1 (side 0)');
  playOut(() => { bot(0); bot(1); });
  const f = facts(0), after = counts(), want = Object.keys(f.set).filter(k => f.set[k]);
  ok(json(Object.keys(after).filter(k => after[k] !== before[k]).sort()) === json(want.sort()), "Two Player counts Player 1's feats, read off side 0 (" + want.join('+') + ')');
  D.exitMatch(); D.settings().kids = false;
}

// 5. tiers, one count a match, the events
{
  fresh();
  const tiers = []; for (let n = 0; n <= 12; n++) { L.state().n.hat = n; tiers.push(L.tier('hat')); }
  ok(json(tiers) === '[0,1,1,2,2,2,2,2,2,2,3,3,3]', 'Bronze at 1, Silver at 3, Gold at 10');
  L.state().n.hat = 2; ok(L.next('hat') === 3 && (L.state().n.hat = 9, L.next('hat') === 10) && (L.state().n.hat = 10, L.next('hat') === null), 'the count the next medal needs: 3, 10, then none');
  fresh(); L.state().drills = ['egg', 'cones', 'kick']; ok(L.count('star') === 3 && L.tier('star') === 2 && L.next('star') === T.drills.DRILLS.length, 'Star Pupil counts the games: three is Silver, every game Gold');
  fresh(); writes = 0;
  ok(L.event('euro') && L.event('world') && L.event('tour') && L.event('triple') && L.count('silver') === 4 && writes === 4, 'between matches each Silverware call counts, and saves');
  ok(L.event('callup') && L.count('callup') === 1 && L.event('champ') && L.count('champ') === 1, 'callup counts toward Call-Up, champ toward Champions');
  ok(L.event('transfer') === false && L.event('nonsense') === false && L.event() === false && json(counts()) === json({ ...Object.fromEntries(L.FEATS.map(f => [f.id, 0])), silver:4, callup:1, champ:1 }), 'transfer has no medal yet, and nothing else counts');
  D.startMatch(X.CLUBS[0], X.CLUBS[1], false);
  ok(L.event('euro') && !L.event('world') && !L.event('euro') && L.event('callup') && !L.event('callup') && L.count('silver') === 5 && L.count('callup') === 2, 'in a match you play, one medal counts once a match, however many of its events come');
  D.exitMatch();
  P.start('egg'); ok(L.event('euro') === false && L.count('silver') === 5, 'nothing counts from inside a drill'); P.leave();
}

// 6. a championship won counts Champions, once; one not won does not
function champAt4(userWins) {
  X.newChamp(X.NATIONS[0], X.NATIONS.slice(1));
  const c = X.champ();
  for (let r = 0; r < 4; r++) {
    c.results.push(c.fixtures[r].map(([h, a]) => {
      const mine = h === c.user || a === c.user;
      if (!mine) return { h, a, hs:10, as:10, ht:1, at:1 };
      const uh = h === c.user, us = userWins ? 40 : 0, them = userWins ? 0 : 40;
      return { h, a, hs:uh ? us : them, as:uh ? them : us, ht:uh ? us/5|0 : them/5|0, at:uh ? them/5|0 : us/5|0 };
    }));
    c.round++;
  }
  return c;
}
{
  fresh();
  champAt4(true); D.renderHub(); reseed(71); $('hub-play').click();
  ok(T.M.champ && L.counts(), 'the last round, from the hub');
  playOut(() => bot(0));
  ok(X.champ().round === 5 && X.standings(X.champ())[0].i === X.champ().user && L.count('champ') === 1, 'a Championship won counts toward Champions');
  ok(L.match().length === 0 && L.count('champ') === 1, 'and only once');
  D.exitMatch();
  champAt4(false); D.renderHub(); reseed(72); $('hub-play').click(); playOut(() => bot(0));
  ok(X.champ().round === 5 && X.standings(X.champ())[0].i !== X.champ().user && L.count('champ') === 1, 'a Championship not won counts nothing');
  D.exitMatch(); X.setChamp(null);
}

// 7. nothing counted in AI v AI, the demo, a drill's match, a tool's headless match, or a match left before full time
{
  fresh(); const before = json(L.state());
  T.simulate(2, 60, 1); ok(json(L.state()) === before, 'AI v AI counts nothing');
  D.exitMatch(); for (let i = 0; i < 3000; i++) T.update(T.STEP);
  ok(T.M.demo && !L.counts() && !T.M.lk && json(L.state()) === before, 'the demo counts nothing');
  P.start('defend'); $('pr-retry').click(); for (let i = 0; i < 600; i++) { bot(0); T.update(T.STEP); }
  ok(!L.counts() && !T.M.lk, "a drill's match counts nothing"); P.leave();
  reseed(5); T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:1, headless:true, humans:[true, false], arcade:true, duels:'live' });
  { let n = 0; while (!T.M.over && n < 200000) { dropper(); T.update(T.STEP); n++; } }
  ok(T.M.over && json(L.state()) === before, "a tool's headless match never reaches full time's count");
  reseed(6); D.startMatch(X.CLUBS[0], X.CLUBS[1], false); for (let i = 0; i < 60*100; i++) { bot(0); T.update(T.STEP); if (T.M.phase === 'break') break; }
  D.exitMatch(); ok(json(L.state()) === before, 'a match quit before full time counts nothing');
  T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:1, auto:true, headless:true, arcade:true });
  L.tally('drops', 0); L.half(); ok(!T.M.lk && !L.counts(), 'the engine hooks do nothing in AI v AI');
}

// 8. Star Pupil: three stars in a drill counts it once; the save waits for the drill to end, with the settings back as they were
{
  fresh(); writes = 0; X.save(); writes = 0;
  const settingsBefore = json(D.settings());
  P.start('cones'); $('pr-retry').click(); P.finish(true, 'Done', 3);
  ok(L.count('star') === 1 && L.dirty() && writes === 0, 'three stars count, and nothing is written while the drill is up');
  P.leave();
  ok(writes === 1 && !L.dirty() && json(saved().settings) === settingsBefore && json(saved().locker.drills) === '["cones"]', "leaving writes the save once, with the player's own settings and the drill counted");
  writes = 0; P.start('cones'); $('pr-retry').click(); P.finish(true, 'Done', 3); P.leave();
  ok(L.count('star') === 1 && writes === 0, 'the same drill again counts nothing and writes nothing');
  P.start('egg'); $('pr-retry').click(); P.finish(true, 'Done', 2); P.leave();
  ok(L.count('star') === 1 && writes === 0, 'two stars count nothing');
  P.start('kick'); $('pr-retry').click(); P.finish(true, 'Done', 3); $('pr-retry').click();
  ok(L.count('star') === 2 && writes === 1 && json(saved().settings) === settingsBefore && json(saved().locker.drills) === '["cones","kick"]', 'Try Again after three stars saves them too, in the drills\' order');
  P.leave();
}

// 8b. Star Pupil over the Skills Mini Games (the skills builder, at the PR #14 merge): Bronze and Silver are any 1 and any 3 games at
//     three stars; Gold is every game the player can see, all ten, or the seven at the Kids level or with Minis picked (the three
//     contact games hidden, practiceBarred), and a Gold once won is kept, so moving up to all ten never takes it away
{
  const S = D.settings(), was = { kids:S.kids, diff:S.diff, cat:S.cat, drillSeen:S.drillSeen.slice() };
  const ALL = T.drills.DRILLS.map(d => d.id), OPEN = T.drills.DRILLS.filter(d => !d.contact).map(d => d.id), CONTACT = ALL.filter(id => !OPEN.includes(id));
  const at = (kids, cat) => { S.kids = kids; S.diff = kids ? 0 : 1; S.cat = cat; };
  const three = id => { P.start(id); $(P.state().roles ? 'pr-runner' : 'pr-retry').click(); P.finish(true, 'Done', 3); P.leave(); };   // a game's three stars, through practiceFinish, then left
  S.drillSeen = ALL.slice();                                // no Watch How on the way in: a first open plays it, and records nothing
  ok(ALL.length === 10 && json(OPEN) === json(['tag', 'egg', 'circle', 'cones', 'pass', 'kick', 'defend']) && json(CONTACT) === json(['tackle', 'scrum', 'back']), `ten games: seven for everyone and the three contact games (${OPEN} | ${CONTACT})`);
  fresh(); at(false, 'men');
  const t = []; for (const [kids, cat] of [[false, 'men'], [false, 'women'], [true, 'men'], [false, 'minis'], [true, 'women']]) { at(kids, cat); t.push(L.tiers('star')[2]); }
  ok(json(t) === '[10,10,7,7,7]', `Gold is every game the player can see: ten on Men or Women, seven at the Kids level or with Minis picked (${t})`);
  fresh(); writes = 0; at(true, 'men'); X.save(); writes = 0;
  for (const id of OPEN.slice(0, 6)) three(id);
  ok(L.count('star') === 6 && L.tier('star') === 2 && L.next('star') === 7 && writes === 6 && !L.state().pupil, `the Kids level: six of its seven games is Silver, 6/7, each saved as its game is left (${L.count('star')}/${L.next('star')}, ${writes} writes)`);
  three(OPEN[6]);
  ok(L.tier('star') === 3 && L.next('star') === null && L.count('star') === 7 && L.state().pupil === true && saved().locker.pupil === true && json(saved().locker.drills) === json(OPEN), 'the seventh is Gold, saved as kept (pupil), the seven games in the Skills Mini Games\' order');
  at(false, 'men');
  ok(L.tier('star') === 3 && L.golds() === 1 && L.legends('men').length === 1 && L.legends('women').length === 1, 'moved up to Normal, the Gold stays, and so do the Legends it unlocked');
  ok(L.count('star') === 7 && L.next('star') === null, 'its count is the games starred, 7, with nothing left to reach');
  three('tackle'); ok(L.count('star') === 8 && L.tier('star') === 3, 'a contact game at three stars still counts, once the player can see it');
  fresh(); at(false, 'men'); L.state().drills = OPEN.slice();
  ok(L.tier('star') === 2 && L.count('star') === 7 && L.next('star') === 10 && !L.state().pupil, 'Normal: the seven open games are Silver, 7/10');
  at(false, 'minis'); ok(L.tier('star') === 3 && L.isNew(), 'Minis picked: every game it sees has three stars, so the Gold shows, new');
  X.save(); ok(saved().locker.pupil === true, 'and is kept as the save is written');
  at(false, 'men'); ok(L.tier('star') === 3, 'back on Men it stays');
  fresh(); at(false, 'men'); L.state().drills = CONTACT.slice();
  ok(L.tier('star') === 2 && L.count('star') === 3 && L.next('star') === 10, 'three contact games: Silver, 3/10');
  at(true, 'men'); ok(L.tier('star') === 2 && L.count('star') === 0 && L.next('star') === 7, 'at the Kids level the Silver stays (any three games), and the way to Gold counts the seven it sees: 0/7');
  L.state().drills = ALL.filter(id => id !== 'defend'); ok(L.tier('star') === 2 && L.count('star') === 6, 'six of the seven, with the three it cannot see: still Silver, 6/7');
  fresh(); at(false, 'men'); L.state().drills = ALL.slice(); ok(L.tier('star') === 3 && L.count('star') === 10, 'Normal: all ten is Gold, 10');
  ok(L.clean({ drills:OPEN, pupil:true }).pupil === true && !('pupil' in L.clean({ drills:OPEN.slice(1), pupil:true })) && !('pupil' in L.clean({ drills:ALL, pupil:1 })) && !('pupil' in L.clean({ drills:ALL, pupil:false })) && !('pupil' in L.clean({ drills:OPEN })), 'a kept Gold reads back only with true and the seven open games starred (or main\'s eight, 8c)');
  { L.set(L.clean({ drills:OPEN, pupil:true, seen:{ star:3 } })); at(false, 'men'); ok(L.tier('star') === 3 && L.seen('star') === 3, 'and it shows as Gold, seen, on Men'); }
  fresh(); writes = 0; S.kids = was.kids; S.diff = was.diff; S.cat = was.cat; S.drillSeen = was.drillSeen;
}

// 8c. A Star Pupil Gold won on the live game before PR #14 (main, f20adc4: Gold was three stars in all eight of its drills, and its
//     saves carry no pupil key) is kept on every level, with the Legends it unlocked, through the first save and the next launch. A
//     save written here with those eight starred and no Gold says so (pupil:false), so a reload never turns 8/10 into a Gold
{
  const S = D.settings(), was = { kids:S.kids, diff:S.diff, cat:S.cat, drillSeen:S.drillSeen.slice() };
  const ALL = T.drills.DRILLS.map(d => d.id), MAIN8 = ['egg', 'circle', 'cones', 'tackle', 'kick', 'scrum', 'defend', 'pass'];
  const at = (kids, cat) => { S.kids = kids; S.diff = kids ? 0 : 1; S.cat = cat; };
  const three = id => { P.start(id); $(P.state().roles ? 'pr-runner' : 'pr-retry').click(); P.finish(true, 'Done', 3); P.leave(); };
  const load = v => { L.set(L.clean(JSON.parse(json(v)))); };
  const gold = () => L.tier('star') === 3 && L.golds() === 1 && json(L.legends('men').map(t => t.name)) === '["New Zealand 1987"]' && L.legends('women').length === 1 && L.seen('star') === 3;
  S.drillSeen = ALL.slice();
  ok(MAIN8.every(id => ALL.includes(id)), 'main\'s eight drills are all still games here');
  const old = { n:{ hat:2 }, drills:MAIN8, ball:'classic', boots:'black', seen:{ hat:1, star:3 } };   // as f20adc4 wrote a Star Pupil Gold
  for (const [kids, cat, name] of [[false, 'men', 'Men'], [false, 'women', 'Women'], [true, 'men', 'the Kids level'], [false, 'minis', 'Minis']]) {
    at(kids, cat); load(old);
    const first = gold();
    writes = 0; X.save(); const w = saved().locker;
    load(w);
    ok(first && writes === 1 && w.pupil === true && gold(), `a Gold from main's eight drills stays Gold on ${name}, seen, with New Zealand 1987, saved as kept and Gold again at the next launch`);
  }
  ok(!('pupil' in L.clean({ drills:MAIN8.slice(1) })) && !('pupil' in L.clean({ drills:MAIN8, pupil:false })) && !('pupil' in L.clean({ drills:MAIN8, pupil:1 })), 'seven of main\'s eight is no Gold, and nor is a save marked pupil:false or a broken pupil');
  fresh(); at(false, 'men'); L.state().drills = MAIN8.filter(id => id !== 'pass'); writes = 0;
  three('pass');
  ok(L.tier('star') === 2 && L.count('star') === 8 && L.next('star') === 10 && writes === 1 && saved().locker.pupil === false, 'main\'s eight starred here on Men: Silver, 8/10, saved with pupil:false');
  load(saved().locker); ok(L.tier('star') === 2 && L.count('star') === 8 && !L.state().pupil, 'and read back the same, never main\'s Gold');
  at(true, 'men'); load(saved().locker); ok(L.tier('star') === 2 && L.count('star') === 6 && L.next('star') === 7, 'at the Kids level too: Silver, 6/7, Tag Chase still to get');
  at(false, 'men'); three('tag'); three('back');
  ok(L.tier('star') === 3 && saved().locker.pupil === true, 'Tag Chase and Ball Back make all ten, a Gold saved as kept');
  fresh(); writes = 0; S.kids = was.kids; S.diff = was.diff; S.cat = was.cat; S.drillSeen = was.drillSeen;
}

// 9. the unlocks and the picks
{
  fresh(); writes = 0;
  ok(L.has('ball', 'classic') && L.has('boots', 'black') && !L.has('ball', 'white') && !L.has('ball', 'nonsense'), 'only the defaults to start');
  ok(!L.pick('ball', 'white') && L.state().ball === 'classic' && writes === 0, 'a locked ball cannot be picked');
  let good = true;
  for (const f of L.FEATS) for (const t of [1, 2]) {
    const [kind, id] = f.unlock[t - 1].split(':');
    fresh();
    const set = n => { if (f.id === 'star') L.state().drills = T.drills.DRILLS.map(d => d.id).slice(0, n); else L.state().n[f.id] = n; };
    set(L.TIERS[t - 1] - 1); if (L.has(kind, id)) good = false;
    set(L.TIERS[t - 1]); if (!L.has(kind, id) || L.source(kind, id).feat.id !== f.id || L.source(kind, id).tier !== t) good = false;
  }
  ok(good, "each feat's Bronze and Silver unlock its ball or boots, and not a count sooner");
  fresh(); L.state().n.hat = 3;
  ok(L.pick('ball', 'white') && L.pick('boots', 'red') && saved().locker.ball === 'white' && saved().locker.boots === 'red', 'an unlocked ball and boots are picked, and saved');
  ok(L.pick('ball', 'classic') && saved().locker.ball === 'classic', 'and the classic ball put back');
}

// 10. the save
{
  fresh(); X.save();
  ok(!('locker' in saved()), 'nothing in the Locker: the save is as it was, with no locker field');
  L.set(L.clean({ n:{ hat:4, drop:12, champ:1 }, drills:['kick', 'egg'], ball:'white', boots:'red', seen:{ hat:2, drop:3 } })); X.save();
  const s0 = saved().locker;
  ok(json(s0) === json({ n:{ hat:4, drop:12, champ:1 }, drills:['egg', 'kick'], ball:'white', boots:'red', seen:{ hat:2, drop:3 } }), 'the save keeps the counts, the drills, the ball, the boots and what has been seen');
  fresh(); X.load(); ok(json(L.saved()) === json(s0), 'and reads it back');
  const n0 = json(saved());
  ok(!/name|email|@/i.test(json(s0)), 'no names, no personal data');
  fresh(); X.restore({ settings:{ sound:true } }); ok(json(L.saved()) === json(undefined), 'a save from before the Locker loads with nothing earned');
  L.set(L.clean(s0)); X.restore({ settings:{ sound:true } }); ok(json(L.saved()) === json(s0), 'a partial restore keeps the Locker');
  const junk = L.clean({ n:{ hat:-1, xyz:5, sharp:1.5, hit:999999, star:4 }, drills:['nope', 'egg', 'egg', 7], ball:'gold', boots:'unknown', seen:{ hat:3, hit:9, zz:1 } });
  ok(json(junk) === json({ n:{ hit:9999 }, drills:['egg'], ball:'classic', boots:'black', seen:{ hit:3 } }), 'a broken Locker is put right: unknown and bad counts dropped, counts capped, a ball not unlocked back to Classic, seen no higher than won');
  ok(['x', 7, null, [], { n:'x', drills:'x', seen:[] }].every(v => json(L.clean(v)) === json(L.fresh())), 'anything unreadable is an empty Locker, never an error');
  memory['tryline.v1'] = '{"settings":{},"locker":{"n":{"hat":3},"ball":"white"}}'; fresh(); X.load();
  ok(L.count('hat') === 3 && L.state().ball === 'white', 'a save with a Locker loads it');
  memory['tryline.v1'] = n0; X.load();
}

// 11. the full-time card, the home dot and the Locker screen
{
  fresh(); L.state().n.hat = 9; L.state().seen.hat = 2;
  D.startMatch(X.CLUBS[0], X.CLUBS[1], false);
  const M = T.M; M.half = 2; M.score = [24, 0]; M.tries = [4, 0]; M.phase = 'break'; M.over = true;
  L.finishMatch();
  const card = $('br-medals').innerHTML;
  ok(!$('br-medals').hidden && $('m-break').classList.contains('lk-on') && /<b>Hat-Trick<\/b>(?!<span class="lk-got">)/.test(card) && /<b>Clean Sheet<\/b><span class="lk-got">[\s\S]*?Sky Blue Boots/.test(card) && !/White/.test(card), 'full time: a row for each medal won, with what it unlocked; a Gold\'s row has none (' + card.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() + ')');
  ok(/New Legends/.test(card) && /New Zealand 1987/.test(card) && /USA 1991 Women/.test(card), "a Gold's new Legends get a line of their own");
  ok(!L.isNew(), 'and are seen from then on');
  D.showBreak('half'); ok($('br-medals').hidden && !$('m-break').classList.contains('lk-on'), 'half time shows no medals');
  D.showBreak('full'); ok($('br-medals').hidden, 'a full-time card with nothing new shows no medal row');
  ok(!/lk-who/.test(card), "a one-player card carries no seat tag");
  D.exitMatch();
  // only what the match won: a medal won between matches (Star Pupil from a drill, an event) is not on the next match's card, won or
  // lost, and keeps the home's dot; an event inside the match is on its card with the match's own medals
  const keep = L.state();
  fresh(); P.start('cones'); $('pr-retry').click(); P.finish(true, 'Done', 3); P.leave(); L.event('callup');
  ok(L.tier('star') === 1 && L.tier('callup') === 1 && L.isNew(), 'a drill at three stars and a call-up between matches: two Bronzes, waiting');
  D.startMatch(X.CLUBS[0], X.CLUBS[1], false);
  { const M = T.M; M.half = 2; M.score = [0, 10]; M.tries = [0, 2]; M.phase = 'break'; M.over = true; }
  L.finishMatch();
  ok($('br-medals').hidden && !$('m-break').classList.contains('lk-on') && L.seen('star') === 0 && L.seen('callup') === 0 && L.isNew(), "a match lost with nothing done shows no medal row for them, and they keep the home's dot");
  D.exitMatch();
  D.startMatch(X.CLUBS[0], X.CLUBS[1], false);
  { const M = T.M; M.half = 2; M.score = [24, 0]; M.tries = [4, 0]; ok(L.event('euro'), 'an event inside the match counts'); M.phase = 'break'; M.over = true; }
  L.finishMatch();
  const won = $('br-medals').innerHTML;
  ok(/<b>Hat-Trick<\/b>/.test(won) && /<b>Clean Sheet<\/b>/.test(won) && /<b>Silverware<\/b>/.test(won) && !/Star Pupil|Call-Up/.test(won) && L.seen('hat') === 1 && L.seen('silver') === 1, 'a match won shows its own medals and the event inside it, and nothing from before it');
  ok(L.seen('star') === 0 && L.seen('callup') === 0 && L.isNew(), 'the earlier two still wait for the Locker');
  D.exitMatch(); L.open(0); ok(!L.isNew(), 'and the Locker shows them'); $('lk-back').click();
  // Two Player: the medals are Player 1's, so they carry his seat tag (the score row's), Player 2's win or not
  fresh(); D.startMatch(X.CLUBS[0], X.CLUBS[1], false, { two:true, levels:[1, 1] });
  { const M = T.M; M.half = 2; M.score = [15, 20]; M.tries = [3, 4]; M.phase = 'break'; M.over = true; }
  L.finishMatch();
  ok(/^<p class="lk-who"><i class="stag s0"[^>]*>1<\/i>Player 1<\/p><p class="lk-won/.test($('br-medals').innerHTML) && /<b>Hat-Trick<\/b>/.test($('br-medals').innerHTML) && $('br-tries').textContent.startsWith('Player 2 Wins'), "Two Player: Player 1's medals under his seat tag, when Player 2 wins too");
  D.exitMatch();
  L.set(keep);
  L.state().n.sharp = 1; X.renderHome(); ok($('b-locker').classList.contains('note'), 'a new medal puts a dot on the home Locker button');
  L.open(0); ok(!$('s-locker').hidden && !$('b-locker').classList.contains('note'), 'opening the Locker shows it and clears the dot');
  ok(L.tab() === 0 && (L.setTab(2), L.tab() === 2) && (L.setTab(9), L.tab() === 3), 'the tabs: Medals, Ball, Boots, Legends');
  L.open(0); const med = $('lk-body').innerHTML;
  ok((med.match(/class="lk-feat/g) || []).length === 12, 'twelve medal tiles');
  ok(L.FEATS.every(f => med.includes(f.name) && med.includes(f.line)) && /lk-pip t1 on/.test(med) && /1\/3/.test(med), 'each tile: the feat, its line, three pips and the count to the next');
  L.open(1); const balls = $('lk-body').innerHTML;
  ok((balls.match(/class="btn lk-item/g) || []).length === 13 && (balls.match(/ disabled/g) || []).length === 13 - L.BALLS.filter(b => L.has('ball', b.id)).length, 'Ball: thirteen swatches, the locked ones disabled');
  ok(/lk-off[^>]*data-id="red"[\s\S]*?lk-why[\s\S]*?Big Hitter/.test(balls) && /aria-pressed="true"[^>]*aria-label="Classic"/.test(balls), 'a locked ball is dimmed with the medal that unlocks it; the picked one is pressed');
  L.open(3); const leg = $('lk-body').innerHTML;
  ok(/New Zealand/.test(leg) && /1987/.test(leg) && (leg.match(/lk-leg lk-off/g) || []).length === 18 && /lk-padlock/.test(leg) && /lk-need[^<]*<i class="lk-pip t3 on"[^>]*><\/i>2</.test(leg), 'Legends: the unlocked sides, the rest a padlock and the Gold count each needs');
  { const R = T.ratings, won = (leg.match(/class="lk-leg" data-legend/g) || []).length, nz = L.LEGENDS.find(t => t.cat === 'men' && t.year === 1987);
    ok(won === 2 && (leg.match(/class="lk-yr">\d+<\/b><svg class="rstars"/g) || []).length === won && leg.includes('>1987</b>' + R.starsHtml(R.starsOf(nz)) + '</span></div>') && R.starsHtml(R.starsOf(nz)).includes('aria-label="' + R.starsWords(R.starsOf(nz)) + '"'), `each won Legend shows its stars beside its year, under its name, with their words, as every listed side has beside its overall (${won})`); }
  $('lk-back').click(); ok(!$('s-home').hidden && $('s-locker').hidden, 'Back to Menu goes home');
  ok(/<div class="home-top" id="home-top">\s*<button class="btn my-home" id="b-my"[^>]*>[\s\S]*?<\/button>\s*<button class="btn lk-home" id="b-locker">[\s\S]*?Locker<\/button>\s*<button class="btn im-home" id="b-import" hidden>Add Your Team<\/button>\s*<\/div>/.test(html), 'the home button reads Locker, at the top beside My Team and Add Your Team (the home\'s headlines, ui-menus.js)');
  ok(/id="lk-back" data-back>Back to Menu</.test(html) && /<div class="seg lk-tabs" id="lk-tabs"><button>Medals<\/button><button>Ball<\/button><button>Boots<\/button><button>Legends<\/button><\/div>/.test(html), 'Back to Menu is the Back button (a pad\'s B, Android\'s Back); the tabs are Title Case');
  ok(![src, css].some(s => /[\u2014\u2190-\u21ff]/.test(s)), 'no em dash and no arrow in the Locker\'s code or styles');
}

// 12. the team screen: the Legends unlocked so far join International, after the nations; nowhere else, and never as an opponent
{
  fresh();
  D.openTeams('quick'); D.settings().pool = 0; D.renderTeams();
  ok(!/New Zealand 1987/.test($('t-grid').innerHTML), 'no Gold: no Legends on International');
  L.state().n.hat = 10; L.state().n.drop = 10; D.renderTeams(); const g = $('t-grid').innerHTML;
  const lastNat = X.natList('men').at(-1).name;   // International is the category's twelve in ranking order (natList): the Legends follow the last
  ok(/New Zealand 1987/.test(g) && /Australia 1991/.test(g) && !/South Africa 1995/.test(g) && !/Women/.test(g) && g.indexOf(lastNat) < g.indexOf('New Zealand 1987'), 'two Golds, Men: two men\'s Legends, after the nations');
  D.settings().cat = 'women'; D.renderTeams(); const gw = $('t-grid').innerHTML;
  ok(/>USA 1991</.test(gw) && />England 1994</.test(gw) && !/New Zealand 1987/.test(gw) && gw.indexOf('>' + X.natList('women').at(-1).name.replace(/ Women$/, '') + '<') < gw.indexOf('>USA 1991<'), 'two Golds, Women: two women\'s Legends, after the women\'s twelve (cards show the plain name, as the nations\' do)');
  D.settings().cat = 'men';
  D.settings().pool = 1; D.renderTeams(); ok(!/1987/.test($('t-grid').innerHTML), 'not on any other list');
  D.openTeams('champ'); D.settings().pool = 0; D.renderTeams(); D.pickTeam(L.LEGENDS[0]);
  const c = X.champ();
  ok(c.teams[0].id === 'L87' && c.teams.slice(1).every(t => X.NATIONS.some(n => n.id === t.id)), 'a Legend picked for a championship plays it; its five opponents are nations');
  X.save(); X.load(); ok(X.champ().teams[0].id === 'L87' && X.champ().teams[0].name === 'New Zealand 1987', 'a saved championship keeps the Legend\'s code (cleanSide)');
  X.setChamp(null); X.save();
}

// 13. the render hooks: the chosen ball and boots in a match you play, and only there
{
  fresh(); for (const f of L.FEATS) if (f.id !== 'star') L.state().n[f.id] = 3; L.state().drills = ['egg', 'cones', 'kick'];
  L.pick('ball', 'pink'); L.pick('boots', 'red');
  D.exitMatch(); ok(T.M.demo && L.ball() === null && L.boots(0, T.M.players[0]) === null, 'the demo draws the classic ball and no boots');
  T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:1, auto:true, headless:true }); ok(L.ball() === null && L.boots(0, T.M.players[0]) === null, 'so does AI v AI');
  P.start('egg'); ok(L.ball() === null && L.boots(0, T.M.players[0]) === null, 'and a drill'); P.leave();
  D.startMatch(X.CLUBS[0], X.CLUBS[1], false);
  const M = T.M, me = M.players.find(p => p.team === 0), them = M.players.find(p => p.team === 1);
  ok(L.ball() && L.ball().fill === '#ff7eb6' && L.boots(0, me) === '#ec3440' && L.boots(1, them) === null, 'a match you play: the pink ball, and red boots on your side only');
  const fills = []; globalThis.__ctxSpy = (k, a) => { if (k === 'fillStyle') fills.push(a[0]); };
  D.view(844, 390); D.render(0.016); globalThis.__ctxSpy = null;
  ok(fills.includes('#ff7eb6') && fills.includes('#ec3440') && !fills.includes('#f6f3ea'), 'the top view draws them: the ball and the toes of the boots');
  L.pick('ball', 'classic'); L.pick('boots', 'black');
  ok(L.ball() === null && L.boots(0, me) === null, 'Classic and Black draw as today');
  D.exitMatch();
  L.pick('boots', 'red'); const cr = C.create({ pos:'B', num:5, club:X.CLUBS[0] }); C.set(cr); C.play();
  const his = T.M.careerP, mate = T.M.players.find(p => p.team === 0 && p !== his);
  ok(L.boots(0, his) === '#ec3440' && L.boots(0, mate) === null && L.boots(0, null) === null, 'a career match: his boots only');
  ok(L.kit(0, his).boots === '#ec3440' && L.kit(0, mate).boots === null && L.kit(0).boots === null, "and a close-up of him wears them (kitOf(team, p)), one of a teammate or of no one in particular does not");
  D.exitMatch(); C.set(null);
  D.startMatch(X.CLUBS[0], X.CLUBS[1], false, { two:true, levels:[1, 1] });
  ok(L.boots(0, T.M.players[0]) === '#ec3440' && L.boots(1, T.M.players[8]) === null, "Two Player: Player 1's side");
  D.exitMatch();
  ok(/const look = lockerBall\(\);[^\n]*\n\s*ctx\.fillStyle = look \? lockerBallFill\(look, rx\*sc\) : '#f6f3ea'/.test(html) && /const boots = lockerBoots\(p\.team, p\); if \(boots\) lockerFeet\(boots, r, p\);/.test(html) && /function kitOf\(team, p = null\)[^\n]*boots:lockerBoots\(team, p\)/.test(html), "the renderer's hooks are the two calls, lockerBall() and lockerBoots(team, p)");
  ok(/figFB\(it\.sx, it\.sy, it\.k, g\.team, \{ back:true, kit:kitOf\(g\.team, g\.kicker\)/.test(html) && /const add = \(a, man, back, extra\) => \{ if \(a\) actors\.push\(\{ a, team:man\.team, back, o:\{ kit:kitOf\(man\.team, man\), \.\.\.extra \} \}\); \};/.test(html), 'the close-ups that know the man pass him to kitOf: the goal kick its kicker, a duel its men');
}

// 13b. the Super Fan trophy (awarded by the store: tools/store.mjs): in the Medals tab first, gold with the club's kit colours, never a
// medal; saved only once there is one, seen once, and a Locker with none exactly as it was
{
  const S = T.store;
  fresh(); L.render();
  ok(!/lk-fan/.test($('lk-body').innerHTML) && L.fanClubs().length === 0 && json(L.fresh()) === json({ n:{}, drills:[], ball:'classic', boots:'black', seen:{} }), 'no trophy: no Super Fan row, and the Locker\'s record as it was');
  L.set(L.clean({ n:{ hat:3 }, fan:['farnham'] })); X.save();
  ok(json(saved().locker) === json({ n:{ hat:3 }, drills:[], ball:'classic', boots:'black', seen:{}, fan:['farnham'], fanSeen:0 }), 'a trophy is saved as the club\'s key, with how many have been seen');
  fresh(); X.load(); ok(json(L.state().fan) === '["farnham"]' && L.state().fanSeen === 0, 'and reads back');
  ok(L.isNew() && L.golds() === 0 && L.FEATS.every(f => L.tier(f.id) === (f.id === 'hat' ? 2 : 0)) && L.legends('men').length === 0, 'new, never a medal: no tier moves and no Legends side unlocks');
  X.renderHome(); ok($('b-locker').classList.contains('note'), 'a new trophy puts the dot on the home\'s Locker button');
  L.open(0); const med = $('lk-body').innerHTML;
  ok(/^<div class="lk-fanrow"><div class="lk-fan new" role="group" aria-label="Super Fan Trophy, Farnham RUFC"><svg class="lk-cup" viewBox="0 0 48 48" aria-hidden="true">/.test(med) && (med.match(/class="lk-feat/g) || []).length === 12, 'the Medals tab: the Super Fan trophy first, then the twelve medals');
  ok(/fill="#1a1a1a"/.test(med) && /stroke="#f2efe6"/.test(med) && (med.match(/fill="#ffcf3d"/g) || []).length >= 2 && /<b>Super Fan<\/b><span>Farnham RUFC<\/span><\/span><\/div><\/div>/.test(med), 'a gold cup, Farnham\'s black and white on it, and the club\'s name: nothing more on the web, where no unlock is owned (no Join the Supporters\' Wall)');
  ok(!L.isNew() && saved().locker.fanSeen === 1 && !$('b-locker').classList.contains('note'), 'seen once the Locker opens');
  ok(isTitle('Super Fan') && isTitle('Super Fan Trophy') && /Super Fan Trophy, /.test(src), 'its label is Title Case');
  S.FAN_CLUBS.push({ key:'guildford', name:'Guildford RFC', product:'tryline.fan.guildford', share:50, agreed:true, team:'GUI', crest:null });
  L.set(L.clean({ fan:['guildford', 'farnham'], fanSeen:2 })); L.render(); const two = $('lk-body').innerHTML;
  ok((two.match(/class="lk-fan"/g) || []).length === 2 && two.indexOf('Guildford RFC') < two.indexOf('Farnham RUFC') && /fill="#1a1e4f"/.test(two) && /stroke="#ffc014"/.test(two), 'two clubs: two trophies in one row, in the order awarded, each in its own colours');
  ok(/^<div class="lk-fanrow many">/.test(two) && /^<div class="lk-fanrow">/.test(med), 'two or more: the row is marked many (two a row, compact on a narrow phone, a third wrapping under them); one is not');
  ok(!/\.lk-fan[^{]*\{[^}]*overflow-wrap:anywhere/.test(css) && /\.lk-fanname\{[^}]*\}/.test(css) && !/\.lk-fanname\{[^}]*min-width:0/.test(css), 'a club\'s name breaks only between words: no overflow-wrap:anywhere, and the name never narrower than its longest word');
  S.FAN_CLUBS.length = 1;
  ok(json(L.clean({ fan:['guildford', 'farnham'] }).fan) === '["farnham"]', 'a club the game no longer has drops out');
  ok(/\.lk-fanrow\{grid-column:1\/-1;/.test(css), 'the row spans the Medals grid');
  fresh(); X.save(); ok(!('locker' in saved()), 'nothing in the Locker: still no locker field');
}

// 14. a browser: the home rows in every state at both sizes (and with a Trophy Cabinet), the Locker's tabs, its keyboard and controller
// reach, full time's Continue, and full time in every mode
await browserChecks();

console.log(failed ? `Locker: ${passed} passed, ${failed} failed` : `Locker: ${passed} passed, 0 failed`);
process.exitCode = failed ? 1 : 0;

function chromium() {
  const require = createRequire(import.meta.url);
  for (const from of [() => require('playwright'), () => require(path.join(execFileSync('npm', ['root', '-g'], { stdio:['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright'))]) {
    try { return from().chromium; } catch (e) { /* not here */ }
  }
  return null;
}
async function browserChecks() {
  if (process.env.GAME || process.env.NO_BROWSER) { console.log('skip the browser checks (GAME or NO_BROWSER set)'); return; }
  const chrome = chromium();
  if (!chrome) { console.log('skip the browser checks: Playwright is not installed (npm i -g playwright && npx playwright install chromium)'); return; }
  let browser;
  try { browser = await chrome.launch(); } catch (e) { console.log('skip the browser checks: Chromium would not start (' + e.message.split('\n')[0] + ')'); return; }
  const dir = fileURLToPath(new URL('../', import.meta.url));
  const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.png':'image/png', '.webmanifest':'application/manifest+json' };
  const server = http.createServer((req, res) => {
    const file = path.resolve(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type':TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const SAVE = { settings:{ tut:['past', 'pass', 'tackle', 'block', 'scrum', 'lineout', 'goal', 'drop'], coach:false, played:5 } };
  try {
    for (const [w, h] of [[844, 390], [667, 375]]) {
      const ctx = await browser.newContext({ viewport:{ width:w, height:h }, deviceScaleFactor:1, isMobile:true, hasTouch:true, serviceWorkers:'block' });
      const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(s => { try { localStorage.setItem('tryline.v1', JSON.stringify(s)); } catch (e) { /* blocked */ } }, SAVE);
      await page.goto(base + 'index.html', { waitUntil:'load' }); await page.evaluate(() => document.fonts.ready);
      // the home: desk or not, the app or the web (Grown-Ups, Add Your Team), and a championship and a career under way, on every
      // headline: the Locker sits in the top row beside My Team, on screen, at least 44px, touching no other button, and the home fits
      const rows = await page.evaluate(() => {
        const T = window.__tryline, X = T.teams, out = [];
        const box = el => el.getBoundingClientRect(), vis = el => !!el && !el.hidden && box(el).width > 0;
        for (const desk of [false, true]) for (const app of [false, true]) for (const busy of [false, true]) for (const hl of T.home.HL) {
          T.store.setNative(app); T.store.setStarted(app); if (app) T.store.setBought(['tryline.full']);
          if (busy) { X.newChamp(X.NATIONS[0], X.NATIONS.slice(1)); T.career.start({ name:'Sam', pos:'B', num:7, club:X.CLUBS[0] }); } else { X.setChamp(null); T.career.set(null); }
          document.body.classList.toggle('desk', desk); T.debug.settings().hl = hl; T.debug.goHome();
          const s = document.getElementById('s-home'), lk = document.getElementById('b-locker'), r = box(lk), top = box(document.getElementById('home-top'));
          const others = [...s.querySelectorAll('button')].filter(b => b !== lk && vis(b));
          const overlap = others.some(b => { const q = box(b); return q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top; });
          const bar = [...document.querySelectorAll('#hl-bar .hl')].map(box), panel = box(document.getElementById('hp-' + hl));
          out.push({ state:(desk ? 'desk' : 'phone') + (app ? '+app' : '') + (busy ? '+busy' : '') + '+' + hl, fits:s.scrollHeight <= s.clientHeight + 1 && s.scrollWidth <= s.clientWidth, lk:vis(lk) && r.height >= 44 && r.width >= 44 && r.bottom <= innerHeight && r.left >= 0 && r.top >= top.top - 1 && r.bottom <= top.bottom + 1, overlap,
            rows:bar.length === 5 && bar.every(q => Math.abs(q.width - bar[0].width) < 1.5 && Math.abs(q.top - bar[0].top) < 1 && q.height >= 44) && (hl !== 'game' || Math.abs(box(document.getElementById('b-quick')).width - panel.width) < 1) });
        }
        X.setChamp(null); T.career.set(null); document.body.classList.remove('desk'); T.store.setNative(false); T.store.setStarted(false); T.debug.settings().hl = 'game'; T.debug.goHome();
        return out;
      });
      ok(rows.length === 40 && rows.every(r => r.fits), `${w}x${h}: the home fits without a scroll in every state, on every headline (${rows.filter(r => !r.fits).map(r => r.state).join(', ') || 'all forty'})`);
      ok(rows.every(r => r.lk && !r.overlap), `${w}x${h}: Locker is in the top row, on screen, at least 44px, touching no other button, in every state (${rows.filter(r => !r.lk || r.overlap).map(r => r.state).join(', ') || 'all'})`);
      ok(rows.every(r => r.rows), `${w}x${h}: the five headlines are equal and level, 44px at least, and Quick Match's Play takes its row, in every state (${rows.filter(r => !r.rows).map(r => r.state).join(', ') || 'all'})`);
      // the Locker: each tab with nothing, some and everything earned
      const tabs = await page.evaluate(() => {
        const L = window.__tryline.locker, out = [];
        const states = [null, { n:{ hat:4, sharp:1, hit:2, clean:3, golden:1, drop:10, fire:1 }, drills:['egg', 'cones'], ball:'pink', boots:'red' },
          { n:{ hat:12, sharp:10, hit:10, clean:10, golden:10, comeback:10, drop:10, fire:10, champ:10, silver:10, callup:10 }, drills:window.__tryline.drills.DRILLS.map(d => d.id), ball:'rainbow', boots:'gold' }];
        for (const v of states) for (let t = 0; t < 4; t++) {
          L.set(L.clean(v)); L.open(t);
          const s = document.getElementById('s-locker');
          const small = [...s.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 0).filter(b => { const r = b.getBoundingClientRect(); return r.height < 44 || r.width < 44; });
          const clipped = [...s.querySelectorAll('.lk-name, .lk-iname, .lk-why, .lk-nat, .lk-yr')].filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).textOverflow !== 'ellipsis');
          out.push({ t, fits:s.scrollHeight <= s.clientHeight + 1 && s.scrollWidth <= s.clientWidth, small:small.length, clipped:clipped.length });
        }
        return out;
      });
      ok(tabs.every(r => r.fits), `${w}x${h}: every tab of the Locker fits without a scroll, nothing, some or everything earned`);
      ok(tabs.every(r => !r.small && !r.clipped), `${w}x${h}: every control at least 44px, and no label cut off`);
      // a Super Fan in the app: the Medals tab with the trophy and Join the Supporters' Wall still fits, nothing, some or everything earned;
      // the Supporters' Wall card fits at both its steps; the Grown-Ups panel with it fits; the Trophy Cabinet shows the trophy first
      const fan = await page.evaluate(async () => {
        const T = window.__tryline, L = T.locker, S = T.store, out = { tabs:[] }, box = el => el.getBoundingClientRect();
        S.setNative(true); S.setStarted(true); S.setBought(['tryline.fan.farnham']);
        const fit = el => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth;
        const small = root => [...root.querySelectorAll('button')].filter(b => !b.closest('[hidden]') && box(b).width > 0).filter(b => box(b).height < 44 || box(b).width < 44).map(b => b.id || b.textContent.trim());
        for (const v of [{}, { n:{ hat:4, sharp:1, hit:2, clean:3 } }, { n:{ hat:12, sharp:10, hit:10, clean:10, golden:10, comeback:10, drop:10, fire:10, champ:10, silver:10, callup:10 }, drills:T.drills.DRILLS.map(d => d.id) }]) {
          L.set(L.clean(v)); L.fanAward(); L.open(0);   // the store awards it (lockerFanAward) for the unlock this device owns
          const s = document.getElementById('s-locker'), tile = s.querySelector('.lk-fan'), btn = tile && tile.querySelector('.lk-wall'), cup = tile && tile.querySelector('.lk-cup');
          const clipped = [...s.querySelectorAll('.lk-name, .lk-fanname b, .lk-fanname span, .lk-wall')].filter(e => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1).map(e => e.textContent);
          out.tabs.push({ fits:fit(s), small:small(s), clipped, tile:!!tile && s.querySelector('#lk-body').firstElementChild.classList.contains('lk-fanrow'), btn:!!btn && box(btn).height >= 44 && box(btn).right <= box(tile).right + 0.5,
            cup:!!cup && box(cup).width >= 30 && /#1a1a1a/.test(cup.innerHTML) && /#ffcf3d/.test(cup.innerHTML), onScreen:!!tile && box(tile).top >= 0 && box(tile).bottom <= innerHeight });
        }
        // the Supporters' Wall card, from the Locker: the grown-up check, then each step
        document.querySelector('#s-locker [data-wall]').click();
        const g = T.kids.gate(); for (const d of g.answer) T.kids.type(d);
        const card = () => { const m = document.getElementById('m-wall'), c = m.querySelector('.card'), r = box(c), halves = [...m.querySelectorAll('.wl-step:not([hidden]) .row2 .btn')].map(b => box(b));
          return { open:!m.hidden, fits:r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth && fit(m), small:small(m), halves:halves.length === 2 && Math.abs(halves[0].width - halves[1].width) < 1 && Math.abs(halves[0].top - halves[1].top) < 1 && Math.abs(halves[0].height - halves[1].height) < 1,
            clipped:[...m.querySelectorAll('.btn, h3, .wl-q, .lbl')].filter(e => !e.closest('[hidden]') && (e.scrollWidth > e.clientWidth + 1)).map(e => e.textContent) }; };
        out.age = card();
        document.getElementById('wl-yes').click(); const inp = document.getElementById('wl-input'); inp.value = 'Alexandra, Godalming'; inp.dispatchEvent(new Event('input'));
        out.name = { ...card(), go:!document.getElementById('wl-go').disabled, field:box(inp).height >= 44 };
        T.store.wallClose(); out.closed = document.getElementById('m-wall').hidden && inp.value === '' && !document.getElementById('s-locker').hidden;
        // the Grown-Ups panel, with Join the Supporters' Wall beside the club's name on its line: plain, and with Reset Kids Level, and
        // with Move Up to Easy beside it, each with a message showing (the store's longest, and Purchases are up to date from a real
        // Restore Purchases through the grown-up check); a row of its own once pushed the card off both phones in these
        const st = T.debug.settings(), was = { kids:st.kids, diff:st.diff, kidsR:st.kidsR, kidsTop:st.kidsTop };
        const grown = label => {
          const m = document.getElementById('m-store'), c = m.querySelector('.card'), r = box(c), j = m.querySelector('[data-wall]'), own = m.querySelector('.st-fanown'), nm = own && own.querySelector('.st-ownname');
          return { label, open:!m.hidden, fits:r.top >= 0 && r.bottom <= innerHeight && fit(m), small:small(m), msg:document.getElementById('st-msg').hidden ? '' : document.getElementById('st-msg').textContent,
            kids:['st-reset', 'st-easy'].filter(id => !document.getElementById(id).hidden), join:!!j && !!nm && j.parentElement === own && box(j).height >= 44 && box(j).top < box(nm).bottom && box(nm).top < box(j).bottom && box(j).left >= box(nm).right && box(j).right <= box(c).right,
            clipped:[...m.querySelectorAll('.btn, .st-ownname')].filter(e => !e.closest('[hidden]') && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)).map(e => e.textContent) };
        };
        out.grown = [];
        for (const [label, kidsR, kidsTop, msg] of [['plain', 0, 0, ''], ['Reset Kids Level', 3, 0, S.MSG.store], ['Reset Kids Level | Move Up to Easy', 3, 6, S.MSG.store]]) {
          Object.assign(st, { kids:true, diff:0, kidsR, kidsTop }); T.debug.goHome(); S.open({ mode:'grown' }); S.ui().msg = msg; S.cardRender();
          out.grown.push(grown(label)); S.close();
        }
        Object.assign(st, { kids:true, diff:0, kidsR:3, kidsTop:6 }); T.debug.goHome(); S.open({ mode:'grown' });
        S.setBackend({ restore:async () => ({ ok:true, ids:['tryline.fan.farnham'] }), purchases:async () => ({ ok:true, owned:['tryline.fan.farnham'] }), prices:async () => ({ ok:true, prices:{} }) });
        S.restoreAsk(); const rg = T.kids.gate(); for (const d of rg.answer) T.kids.type(d);
        for (let i = 0; i < 50 && (i < 1 || S.ui().busy); i++) await new Promise(r => setTimeout(r, 10));   // the restore answers
        out.grown.push(grown('Restore Purchases, Reset Kids Level | Move Up to Easy')); S.close(); S.setBackend(null); Object.assign(st, was);
        // the Trophy Cabinet: the trophy first
        T.debug.settings().hl = 'champ'; T.debug.goHome(); document.getElementById('b-cabinet').click();
        const first = document.querySelector('#home-history > *'), cup = first && first.querySelector('.lk-cup');
        out.cab = { shown:!document.getElementById('s-cabinet').hidden, first:!!first && first.classList.contains('fan-entry') && /Farnham RUFC/.test(first.textContent), cup:!!cup && box(cup).width >= 30, gold:!!first && getComputedStyle(first.querySelector('.cup-kind')).color === 'rgb(220, 171, 66)' };
        document.getElementById('cab-back').click();
        S.setNative(false); S.setStarted(false); S.setBought([]); L.set(L.fresh()); T.debug.settings().hl = 'game'; T.debug.goHome();
        return out;
      });
      ok(fan.tabs.length === 3 && fan.tabs.every(r => r.fits && r.tile && r.onScreen), `${w}x${h}: a Super Fan's Medals tab, the trophy first, fits without a scroll, nothing, some or everything earned (${json(fan.tabs.map(r => [r.fits, r.tile, r.onScreen]))})`);
      ok(fan.tabs.every(r => !r.small.length && !r.clipped.length && r.btn && r.cup), `${w}x${h}: the trophy drawn in gold with the kit's colours, Join the Supporters' Wall 44px and inside its tile, nothing cut off (${json(fan.tabs.map(r => [r.small, r.clipped, r.btn, r.cup]))})`);
      ok(fan.age.open && fan.age.fits && fan.age.halves && !fan.age.small.length && !fan.age.clipped.length, `${w}x${h}: the Supporters' Wall card's first step fits, Yes, I'm 18 or Over | Cancel in equal halves, 44px (${json(fan.age)})`);
      ok(fan.name.open && fan.name.fits && fan.name.halves && fan.name.go && fan.name.field && !fan.name.small.length && !fan.name.clipped.length && fan.closed, `${w}x${h}: and its second, How Your Name Appears and Continue | Cancel; closed, its field empty, back on the Locker (${json(fan.name)})`);
      ok(fan.grown.length === 4 && fan.grown.every(r => r.open && r.fits && r.join && !r.small.length && !r.clipped.length), `${w}x${h}: the Grown-Ups panel with Join the Supporters' Wall beside the club's name fits, every button 44px and nothing cut off: plain, with Reset Kids Level, with Move Up to Easy beside it, a message showing (${json(fan.grown.filter(r => !(r.open && r.fits && r.join && !r.small.length && !r.clipped.length)))})`);
      ok(json(fan.grown.map(r => [r.kids.length, r.msg])) === json([[0, ''], [1, 'Could not reach the store. Try again later.'], [2, 'Could not reach the store. Try again later.'], [2, 'Purchases are up to date.']]), `${w}x${h}: and those were the states measured: the Kids buttons and the message each showing (${json(fan.grown.map(r => [r.label, r.kids, r.msg]))})`);
      ok(fan.cab.shown && fan.cab.first && fan.cab.cup && fan.cab.gold, `${w}x${h}: the Trophy Cabinet opens with the Super Fan trophy first, its kind in gold (${json(fan.cab)})`);
      // a second partner club (Guildford RFC, a stand-in): both owned, the Medals tab's two trophies share the row and the tab still fits,
      // nothing, some or everything earned, each name whole (never broken inside a word) and each Join the Supporters' Wall 44px inside
      // its tile; then only Farnham owned and Guildford on offer, the Grown-Ups panel in two columns, plain and with both Kids buttons
      // and a message
      const two = await page.evaluate(() => {
        const T = window.__tryline, L = T.locker, S = T.store, out = { tabs:[], grown:[] }, box = el => el.getBoundingClientRect();
        const fit = el => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth;
        const small = root => [...root.querySelectorAll('button')].filter(b => !b.closest('[hidden]') && box(b).width > 0).filter(b => box(b).height < 44 || box(b).width < 44).map(b => b.id || b.textContent.trim());
        const broken = root => {                   // a word's own boxes, split at spaces, on more than one line
          const cut = [], walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), range = document.createRange();
          for (let n = walk.nextNode(); n; n = walk.nextNode()) for (const m of n.data.matchAll(/[^\s]+/g)) {
            range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length);
            if (new Set([...range.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top))).size > 1) cut.push(m[0]);
          }
          return cut;
        };
        S.FAN_CLUBS.push({ key:'guildford', name:'Guildford RFC', product:'tryline.fan.guildford', share:50, agreed:true, team:'GUI', crest:null });
        const agreed = S.FAN_CLUBS[0].agreed; S.FAN_CLUBS[0].agreed = true;
        S.setNative(true); S.setStarted(true); S.setBought(['tryline.fan.farnham', 'tryline.fan.guildford']);
        for (const v of [{}, { n:{ hat:4, sharp:1, hit:2, clean:3 } }, { n:{ hat:12, sharp:10, hit:10, clean:10, golden:10, comeback:10, drop:10, fire:10, champ:10, silver:10, callup:10 }, drills:T.drills.DRILLS.map(d => d.id) }]) {
          L.set(L.clean(v)); L.fanAward(); L.open(0);
          const s = document.getElementById('s-locker'), row = s.querySelector('.lk-fanrow'), tiles = [...s.querySelectorAll('.lk-fan')];
          out.tabs.push({ fits:fit(s), many:!!row && row.classList.contains('many'), tiles:tiles.length, level:tiles.length === 2 && Math.abs(box(tiles[0]).top - box(tiles[1]).top) < 1 && Math.abs(box(tiles[0]).width - box(tiles[1]).width) < 1,
            names:tiles.map(t => t.querySelector('.lk-fanname span').textContent), small:small(s), broken:row ? broken(row) : ['no row'],
            clipped:[...s.querySelectorAll('.lk-fanname b, .lk-fanname span, .lk-wall')].filter(e => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1).map(e => e.textContent),
            inside:tiles.every(t => { const b = t.querySelector('.lk-wall'), q = b && box(b), r = box(t), nm = box(t.querySelector('.lk-fanname')); return !!b && q.height >= 44 && q.left >= nm.right && q.right <= r.right + 0.5 && q.top >= r.top && q.bottom <= r.bottom + 0.5; }) });
        }
        S.setBought(['tryline.fan.farnham']); L.set(L.fresh()); L.fanAward();
        const st = T.debug.settings(), was = { kids:st.kids, diff:st.diff, kidsR:st.kidsR, kidsTop:st.kidsTop };
        for (const [kidsR, kidsTop, msg] of [[0, 0, ''], [3, 6, S.MSG.store]]) {
          Object.assign(st, { kids:true, diff:0, kidsR, kidsTop }); T.debug.goHome(); S.open({ mode:'grown' }); S.ui().msg = msg; S.cardRender();
          const m = document.getElementById('m-store'), c = m.querySelector('.card'), r = box(c), j = m.querySelector('[data-wall]'), nm = m.querySelector('.st-ownname');
          out.grown.push({ card:[Math.round(r.top), Math.round(r.bottom)], msg:document.getElementById('st-msg').textContent, kids:['st-reset', 'st-easy'].filter(id => !document.getElementById(id).hidden).length, two:!c.classList.contains('solo') && /Guildford RFC/.test(document.getElementById('st-offers').textContent), fits:r.top >= 0 && r.bottom <= innerHeight && fit(m), small:small(m), broken:broken(m.querySelector('.st-have')),
            join:!!j && !!nm && box(j).height >= 44 && box(j).top < box(nm).bottom && box(nm).top < box(j).bottom && box(j).left >= box(nm).right,
            clipped:[...m.querySelectorAll('.btn, .st-ownname, .st-share')].filter(e => !e.closest('[hidden]') && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)).map(e => e.textContent) });
          S.close();
        }
        Object.assign(st, was); S.FAN_CLUBS.length = 1; S.FAN_CLUBS[0].agreed = agreed;
        S.setNative(false); S.setStarted(false); S.setBought([]); L.set(L.fresh()); T.debug.goHome();
        return out;
      });
      ok(two.tabs.length === 3 && two.tabs.every(r => r.fits && r.many && r.tiles === 2 && r.level), `${w}x${h}: two clubs' Super Fan trophies share the Medals tab's row, equal and level, and the tab still fits without a scroll, nothing, some or everything earned (${json(two.tabs.map(r => [r.fits, r.many, r.tiles, r.level]))})`);
      ok(two.tabs.every(r => !r.small.length && !r.broken.length && !r.clipped.length && r.inside && json(r.names) === '["Farnham RUFC","Guildford RFC"]'), `${w}x${h}: and each club's name whole, never broken inside a word, with its Join the Supporters' Wall 44px beside it in its tile (${json(two.tabs.map(r => [r.small, r.broken, r.clipped, r.inside]))})`);
      ok(two.grown.length === 2 && two.grown.every(r => r.two && r.fits && r.join && !r.small.length && !r.broken.length && !r.clipped.length) && json(two.grown.map(r => [r.kids, r.msg])) === json([[0, ''], [2, 'Could not reach the store. Try again later.']]), `${w}x${h}: the Grown-Ups panel beside a second club on offer, in two columns, fits with Join the Supporters' Wall beside the club's name, plain and with Reset Kids Level | Move Up to Easy and the store's longest message (${json(two.grown)})`);
      // the keyboard: Tab reaches the tabs and the swatches, Enter presses, Escape goes home
      await page.evaluate(() => { const L = window.__tryline.locker; L.set(L.clean({ n:{ hat:3, sharp:1 } })); L.open(0); document.activeElement && document.activeElement.blur(); });
      await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
      const kb1 = await page.evaluate(() => window.__tryline.locker.tab());
      for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
      const onSwatch = await page.evaluate(() => document.activeElement && document.activeElement.dataset.id);
      await page.keyboard.press('Enter');
      const kb2 = await page.evaluate(() => [window.__tryline.locker.state().ball, document.activeElement && document.activeElement.dataset.id]);
      for (let i = 0; i < 20 && await page.evaluate(() => document.activeElement && document.activeElement.id) !== 'lk-back'; i++) await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      const kb3 = await page.evaluate(() => !document.getElementById('s-home').hidden);
      ok(kb1 === 1 && onSwatch === 'white' && kb2[0] === 'white' && kb2[1] === 'white' && kb3, `${w}x${h}: the keyboard (Tab and Enter, as every menu) reaches the tabs and an unlocked ball, picks it, keeps its focus, and reaches Back to Menu (${json([kb1, onSwatch, kb2, kb3])})`);
      // a controller: the ring starts on Medals, moves down the tabs and across to a swatch, presses, and B goes home
      const pad = await page.evaluate(() => {
        const T = window.__tryline, L = T.locker; L.set(L.clean({ n:{ hat:3, sharp:1 } })); L.open(0);
        const label = () => { const f = T.debug.focus(); return f ? (f.dataset.id || f.textContent.trim()) : null; };
        const out = [];
        T.navMove(0, 0, 0); out.push(label());
        T.navMove(0, 0, 1); out.push(label()); T.navPress(0); out.push(L.tab());
        T.navMove(0, 1, 0); out.push(label()); T.navMove(0, 1, 0); out.push(label()); T.navPress(0); out.push(L.state().ball);
        T.navBack(0); out.push(!document.getElementById('s-home').hidden);
        return out;
      });
      ok(json(pad) === json(['Medals', 'Ball', 1, 'classic', 'white', 'white', true]), `${w}x${h}: a controller reaches the tabs and the swatches, picks a ball, and Back goes home (${json(pad)})`);
      // full time with four medals and two new Legends: Continue on the screen without a scroll
      const ft = await page.evaluate(() => {
        const T = window.__tryline, L = T.locker, X = T.teams;
        L.set(L.clean({ n:{ hat:2, drop:9 }, seen:{ hat:1, drop:2 } }));
        T.debug.startMatch(X.CLUBS[0], X.CLUBS[1], false);
        const M = T.M; M.score = [24, 5]; M.tries = [4, 1]; M.half = 2; M.stats.conv.made[0] = 2; M.lk = { drops:[1, 0], hits:[0, 0], ht:[3, 5] };
        M.phase = 'break'; M.over = true; L.finishMatch();
        const go = document.getElementById('br-go').getBoundingClientRect(), m = document.getElementById('m-break');
        const out = { rows:document.querySelectorAll('#br-medals .lk-won').length, go:go.bottom <= innerHeight && go.top >= 0 && go.height >= 44, scroll:m.scrollHeight <= m.clientHeight + 1 };
        T.debug.exitMatch();
        return out;
      });
      ok(ft.rows === 5 && ft.go && ft.scroll, `${w}x${h}: full time with four medals and the new Legends keeps Continue on the screen (${json(ft)})`);
      // full time in every mode, with six medals and the new Legends against the same card with none: Quick Match, Two Player (its series
      // row and Change Teams | Back to Menu), a Championship's and a career's table points. The medals never make the card taller, so
      // one that fitted still fits (Two Player with its series already scrolled at both sizes before the Locker)
      const modes = await page.evaluate(async () => {
        const T = window.__tryline, L = T.locker, X = T.teams, out = [];
        const none = Object.fromEntries(['hat', 'sharp', 'hit', 'clean', 'golden', 'comeback', 'drop', 'fire'].map(id => [id, 1]));   // one each: this match crosses no tier
        for (const mode of ['quick', 'two', 'champ', 'career']) for (const medals of [false, true]) {
          L.set(L.clean(medals ? { n:{ hat:2, drop:9 }, seen:{ hat:1, drop:2 } } : { n:none, seen:none }));
          if (mode === 'two') { T.debug.series().w = [1, 0]; T.debug.series().d = 0; T.debug.startMatch(X.CLUBS[0], X.CLUBS[1], false, { two:true, levels:[1, 1] }); }
          else if (mode === 'champ') { X.newChamp(X.NATIONS[0], X.NATIONS.slice(1)); T.debug.startMatch(X.NATIONS[0], X.NATIONS[1], true); }
          else if (mode === 'career') { T.career.set(T.career.create({ pos:'B', num:5, club:X.CLUBS[0] })); T.career.play(); }
          else T.debug.startMatch(X.CLUBS[0], X.CLUBS[1], false);
          const M = T.M; M.half = 2; M.score = [31, 3]; M.tries = [5, 0]; M.stats.conv.made[0] = 3; M.stats.fire0 = 2; M.lk = { drops:[1, 0], hits:[0, 0], ht:[3, 5] };
          M.phase = 'break'; M.over = true; L.finishMatch();
          const m = document.getElementById('m-break'); void m.scrollHeight; await document.fonts.ready;   // any face the card first uses, loaded
          out.push({ mode, medals, rows:document.querySelectorAll('#br-medals .lk-won').length, over:m.scrollHeight - m.clientHeight, extra:['br-series', 'br-pts', 'br-row'].filter(id => !document.getElementById(id).hidden).join('+') });
          m.hidden = true; T.debug.exitMatch(); T.career.set(null); X.setChamp(null);
        }
        return out;
      });
      const pair = mode => [modes.find(r => r.mode === mode && !r.medals), modes.find(r => r.mode === mode && r.medals)];
      ok(modes.length === 8 && modes.every(r => r.rows === (r.medals ? 7 : 0)) && pair('two').every(r => r.extra === 'br-series+br-row') && ['champ', 'career'].every(m => pair(m).every(r => r.extra === 'br-pts')), `${w}x${h}: each mode's card, with no medal row and with six medals and the new Legends (${json(modes.map(r => [r.mode, r.rows, r.extra]))})`);
      ok(['quick', 'two', 'champ', 'career'].every(m => { const [a, b] = pair(m); return b.over <= Math.max(0, a.over); }), `${w}x${h}: the medals never make the full-time card taller, in any mode (scroll without and with: ${json(['quick', 'two', 'champ', 'career'].map(m => [m, ...pair(m).map(r => r.over)]))})`);
      // the Trophy Cabinet (a championship finished; last, since it stays): a button in Championship's panel now, so the Locker beside it
      // adds no height in any of the eight states
      const cab = await page.evaluate(() => {
        const T = window.__tryline, X = T.teams, out = [];
        const box = el => el.getBoundingClientRect(), vis = el => !!el && !el.hidden && box(el).width > 0;
        X.newChamp(X.NATIONS[0], X.NATIONS.slice(1)); const c = X.champ();
        for (let i = 0; i < 5; i++) { c.results.push(c.fixtures[i].map(p => ({ h:p[0], a:p[1], hs:20, as:10, ht:3, at:1 }))); c.round++; }
        X.setChamp(c); X.save(); X.load();
        for (const desk of [false, true]) for (const app of [false, true]) for (const busy of [false, true]) {
          T.store.setNative(app); T.store.setStarted(app); if (app) T.store.setBought(['tryline.full']);
          if (busy) { X.newChamp(X.NATIONS[0], X.NATIONS.slice(1)); T.career.start({ name:'Sam', pos:'B', num:7, club:X.CLUBS[0] }); } else { X.setChamp(null); T.career.set(null); }
          document.body.classList.toggle('desk', desk); T.debug.settings().hl = 'champ'; T.debug.goHome();
          const s = document.getElementById('s-home'), lk = document.getElementById('b-locker'), r = box(lk);
          const others = [...s.querySelectorAll('button')].filter(b => b !== lk && vis(b));
          const overlap = others.some(b => { const q = box(b); return q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top; });
          const withIt = s.scrollHeight; lk.style.display = 'none'; const without = s.scrollHeight; lk.style.display = '';
          out.push({ state:(desk ? 'desk' : 'phone') + (app ? '+app' : '') + (busy ? '+busy' : ''), cab:vis(document.getElementById('b-cabinet')), grow:withIt - without, scroll:withIt - s.clientHeight,
            lk:vis(lk) && r.height >= 44 && r.width >= 44 && r.bottom <= innerHeight && r.left >= 0, overlap });
        }
        X.setChamp(null); T.career.set(null); document.body.classList.remove('desk'); T.store.setNative(false); T.store.setStarted(false); T.debug.settings().hl = 'game'; T.debug.goHome();
        return out;
      });
      ok(cab.length === 8 && cab.every(r => r.cab && r.grow <= 0 && r.scroll <= 0), `${w}x${h}: with a Trophy Cabinet the Locker adds no height and the home does not scroll, in every state (${json(cab.map(r => [r.state, r.grow, r.scroll]))})`);
      ok(cab.every(r => r.lk && !r.overlap), `${w}x${h}: and Locker is on screen, at least 44px, touching no other button`);
      ok(!errors.length, `${w}x${h}: no page errors (${errors.join('; ')})`);
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
}
