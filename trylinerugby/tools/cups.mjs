// Silverware: the European Cup, the World Cup, the Home Nations Tour and the Triple Crown (src/cups.js), Championship mode's
// competition row, cup hub, European Cup offer and Trophy Cabinet kinds (src/ui-cups.js), the cup save and the Golden Try in a
// cup's knockouts. node tools/cups.mjs   Exits 1 on any failure.
// GAME=/path/to/index.html CUPS_PRINT=1 node tools/cups.mjs prints section 0's fingerprint for that build and stops: how BASE was pinned.
process.env.SEED ??= '41';
const { T, reseed, bot } = await import('./harness.mjs');
const fs = await import('node:fs');
const X = T.teams, D = T.debug, $ = id => document.getElementById(id);
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const json = v => JSON.stringify(v);
const copy = v => JSON.parse(JSON.stringify(v));
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };

// 0. Nothing moves outside a cup: AI v AI, a Quick Match you play (arcade, with a level finish into the Golden Try), a championship
//    match (a league keeps its draw) and the demo, seeded, against the build before the cups (ed37be5). Run first, so nothing
//    earlier in this file can move them.
const BASE = 'lhsdx3 ywg8pq 1cp7bss 1igh5kz u8g5a0';   // re-pinned at the PR #14 merge for its calmer passing (PASS_FLIGHT: the ball hangs longer and a catcher gets a moment): with PASS_FLIGHT='{"match":1,"kids":1,"grace":[0,0,0],"graceKids":0}' this build gives the old pin exactly, 1o2r2g2 nj712u ck53ci 4n8zwk 1bk4uie. Before that: pinned from ed37be5 (GAME=<its index.html> CUPS_PRINT=1); this build gives the same
function fingerprint() {
  const out = [];
  reseed(23);
  out.push(json(T.simulate(2, 60, 1).map(r => [r.teams, r.score, r.tries, r.steps])));
  const play = (o, level) => {
    T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:1, headless:true, humans:[true, false], duels:'live', ...o });
    let n = 0, forced = false;
    while (!T.M.over && n < 200000) {
      if (level && !forced && T.M.half === 2 && T.M.clock > T.M.halfLen - 1) { T.M.score = [7, 7]; forced = true; }   // level as the hooter goes
      bot(0); T.update(T.STEP); n++;
    }
    return json([T.M.score, T.M.tries, T.M.stats, n, !!T.M.golden]);
  };
  reseed(100); out.push(play({ arcade:true }));
  reseed(101); out.push(play({ arcade:true }, true));
  reseed(102); out.push(play({ arcade:true, champ:true }, true));
  reseed(103);
  T.newMatch(X.NATIONS[0], X.NATIONS[1], { halfLen:60, diff:1, demo:true });
  for (let n = 0; n < 60*90; n++) T.update(T.STEP);
  out.push(json([T.M.score, T.M.tries, T.M.ball.x.toFixed(4), T.M.ball.y.toFixed(4)]));
  return out.map(fnv).join(' ');
}
{
  const now = fingerprint();
  if (process.env.CUPS_PRINT) { console.log(now); process.exit(0); }
  ok(now === BASE, `AI v AI, a Quick Match (its Golden Try included), a championship match and the demo play exactly as before the cups (seeded fingerprint ${now}, pinned ${BASE})`);
}

const K = T.cups;
const memory = {};
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; } };
const saved = () => JSON.parse(memory['tryline.v1']);
const locker = T.locker.heard;                           // the Locker's own log of the events it heard (src/locker.js), emptied before each case
// the harness answers querySelectorAll('.screen') with its own list; the cup hub joins it here, so showScreen toggles it
{ const qsa = document.querySelectorAll; document.querySelectorAll = sel => (sel === '.screen' ? qsa(sel).concat([$('s-cup')]) : qsa(sel)); }
const shown = () => ['s-home', 's-teams', 's-hub', 's-cup'].find(id => !$(id).hidden);
const noteText = () => $('champ-note').innerHTML.replace(/<[^>]*>/g, '');   // homeNote writes the team's name in a span of its own
const men = X.natList('men'), women = X.natList('women'), nat = (id, cat = 'men') => X.natList(cat).find(t => t.id === id);
const userRes = (c, us, them, ut = 4, tt = 1) => { const f = K.cupFixture(c), home = f.home === c.user; return home ? { score:[us, them], tries:[ut, tt] } : { score:[them, us], tries:[tt, ut] }; };
const win = (c, us = 30, them = 10) => K.cupRecord(c, userRes(c, us, them));
const lose = c => K.cupRecord(c, userRes(c, 5, 30, 1, 4));
const mine = c => c.results.flat().filter(m => m.h === c.user || m.a === c.user);
const koOk = m => (m.hs !== m.as ? m.w === (m.hs > m.as ? m.h : m.a) && !m.by : m.ht !== m.at ? m.by === 'tries' && m.w === (m.ht > m.at ? m.h : m.a) : m.by === 'toss' && (m.w === m.h || m.w === m.a));
const listKey = t => X.TEAM_LISTS.find(l => l.tier === 1 && l.teams.some(s => s.id === t.id))?.key;

// 1. the competitions
{
  ok(json(Object.keys(K.CUPS)) === '["euro","world","tour"]' && K.CUPS.euro.name === 'European Cup' && K.CUPS.world.name === 'World Cup' && K.CUPS.tour.name === 'Home Nations Tour' && K.CUP_TRIPLE.name === 'Triple Crown', 'European Cup, World Cup, Home Nations Tour and the Triple Crown, in Title Case');
  ok(json(K.CUPS.euro.lists) === '["eng","fra","cel","rsa"]' && K.CUPS.euro.lists.every(k => X.TEAM_LISTS.some(l => l.key === k && l.tier === 1)), 'the European Cup is for the winners of England, France, Celtic and Italy and South Africa');
  ok(K.CUPS.tour.tests === 3 && json(K.CUPS.tour.hosts) === '["NZL","RSA","AUS"]' && json(K.CUPS.tour.from) === '["ENG","IRE","SCO","WAL"]' && json(K.CUP_TRIPLE.nations) === json(K.CUPS.tour.from), 'the tour: three Tests, New Zealand, South Africa and Australia in turn, from the four home nations');
  ok(['men', 'women'].every(cat => [...K.CUPS.tour.hosts, ...K.CUPS.tour.from].every(id => nat(id, cat))), 'every host and every home nation is on both the men\'s and the women\'s twelve');
  ok(!/Lions/i.test(fs.readFileSync(new URL('../src/cups.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../src/ui-cups.js', import.meta.url), 'utf8')), 'the tour never borrows the Lions\' name (a registered trademark)');
}

// 2. the European Cup
{
  const BTH = X.ENGLAND[0], c = K.cupNew('euro', { user:BTH });
  ok(c && c.id === 'euro' && c.user === 0 && c.teams.length === 4 && c.teams[0].id === 'BTH' && c.cat === 'men', 'four sides, the user\'s first');
  ok(json(c.teams.slice(1).map(listKey).sort()) === '["cel","fra","rsa"]', `the other three are one from each other European league, never his own (${c.teams.slice(1).map(t => t.name).join(', ')})`);
  ok(c.fixtures.length === 1 && c.fixtures[0].length === 2 && new Set(c.fixtures[0].flat()).size === 4, 'two Semi-Finals, every side in one');
  const rate = t => X.rateOf(t);
  ok(c.fixtures[0].every(([h, a]) => rate(c.teams[h]) > rate(c.teams[a]) || (rate(c.teams[h]) === rate(c.teams[a]) && h < a)), 'the higher-rated side is at home (level: the better seed)');
  const f = K.cupFixture(c);
  ok(f && f.label === 'Semi-Final' && f.ko && (f.home === 0 || f.away === 0) && K.cupLabel(c) === 'Semi-Final' && !K.cupDone(c) && K.cupWinner(c) === -1 && !K.cupUserOut(c), 'your next match is a Semi-Final, a knockout');
  locker.length = 0;
  ok(win(c) && c.round === 1 && c.results[0].length === 2 && c.results[0].every(koOk), 'a win records the round, the other Semi-Final simulated, and neither left level');
  const fin = c.fixtures[1];
  ok(fin && fin.length === 1 && fin[0].includes(0) && fin[0].includes(c.results[0].find(m => m.h !== 0 && m.a !== 0).w) && K.cupFixture(c).label === 'Final' && K.cupLabel(c) === 'Final', 'the Final is the two winners');
  ok(rate(c.teams[fin[0][0]]) >= rate(c.teams[fin[0][1]]), 'and the higher-rated side is at home in it');
  ok(locker.length === 0, 'nothing for the Locker yet');
  win(c);
  ok(K.cupDone(c) && K.cupWinner(c) === 0 && K.cupLabel(c) === 'Winners' && K.cupFixture(c) === null && !K.cupUserOut(c), 'win the Final: the cup is done and yours, Winners');
  ok(json(locker) === '["euro"]', `the Locker hears once, 'euro' (${json(locker)})`);
  ok(!K.cupRecord(c, { score:[10, 0], tries:[2, 0] }) && c.results.length === 2 && json(locker) === '["euro"]', 'a finished cup records nothing more, and tells the Locker nothing more');
  // out in the Semi-Final: the rest is played for him, and someone else wins
  const o = K.cupNew('euro', { user:BTH }); locker.length = 0;
  lose(o);
  ok(K.cupUserOut(o) && K.cupDone(o) && K.cupWinner(o) > 0 && K.cupFixture(o) === null && K.cupLabel(o) === 'Semi-Finalists' && o.results.length === 2 && o.results.flat().every(koOk), `beaten in the Semi-Final: out, the Final played without him (${K.cupLabel(o)})`);
  ok(locker.length === 0, 'and the Locker hears nothing');
  const r = K.cupNew('euro', { user:BTH }); win(r); lose(r);
  ok(K.cupLabel(r) === 'Runners-Up' && K.cupUserOut(r), 'beaten in the Final: Runners-Up');
  // categories, lists, Legends
  const w = K.cupNew('euro', { user:X.catSide(BTH, 'women'), cat:'women' });
  ok(w.cat === 'women' && w.teams.every(t => t.cat === 'women' && / Women$/.test(t.name)) && w.teams[0].name === 'Bath Women', `Women: every side named for it (${w.teams.map(t => t.name).join(', ')})`);
  const m = K.cupNew('euro', { user:X.catSide(BTH, 'minis'), cat:'minis' });
  ok(m.teams.every(t => / Minis$/.test(t.name)) && X.rateOf(m.teams[1]) === X.rateOf(X.TEAM_LISTS.flatMap(l => l.teams).find(t => t.id === m.teams[1].id)), 'Minis: named for it, the clubs\' own ratings');
  ok([0, 1, 2, 3, 4].every(() => !K.cupNew('euro', { user:BTH, list:'fra' }).teams.slice(1).some(t => listKey(t) === 'fra')), 'a list handed in is the one never drawn');
  const mineT = { id:'MYT', name:'My Town', kit:'#c8102e', trim:'#f2efe6', custom:true, key:'my1', pace:4, power:4, handling:3, kicking:3, stamina:3 };
  const u = K.cupNew('euro', { user:mineT });
  ok(u.teams[0].custom && new Set(u.teams.slice(1).map(listKey)).size === 3 && u.teams.slice(1).every(t => K.CUPS.euro.lists.includes(listKey(t))), 'a side from no European league meets three of the four leagues\' winners');
  // weighted by rating: France's winner over 4000 draws against the weights (rating - 12) squared
  const counts = {}, N = 4000;
  for (let i = 0; i < N; i++) { const t = K.cupNew('euro', { user:BTH }).teams.find(s => listKey(s) === 'fra'); counts[t.id] = (counts[t.id] || 0) + 1; }
  const wt = t => Math.max(1, X.rateOf(t) - 12) ** 2, total = X.FRANCE.reduce((a, t) => a + wt(t), 0);
  const worst = Math.max(...X.FRANCE.map(t => Math.abs((counts[t.id] || 0)/N - wt(t)/total)));
  const top = X.FRANCE.reduce((a, b) => (X.rateOf(b) > X.rateOf(a) ? b : a)), low = X.FRANCE.reduce((a, b) => (X.rateOf(b) < X.rateOf(a) ? b : a));
  ok(worst < 0.025 && (counts[top.id] || 0) > 2*(counts[low.id] || 0), `league winners are drawn weighted by rating (largest gap from the weights ${worst.toFixed(3)}; ${top.name} ${counts[top.id]}, ${low.name} ${counts[low.id] || 0})`);
  X.FRANCE.push({ id:'LGF', name:'Legend', kit:'#ffffff', trim:'#000000', pace:5, power:5, handling:5, kicking:5, stamina:5, legend:true });
  let drew = 0;
  for (let i = 0; i < 400; i++) if (K.cupNew('euro', { user:BTH }).teams.some(t => t.id === 'LGF')) drew++;
  X.FRANCE.pop();
  ok(drew === 0, 'a Legends side is never drawn into a cup');
}

// 3. never a level knockout
{
  const c = K.cupNew('euro', { user:X.ENGLAND[0] }), f = K.cupFixture(c);
  K.cupRecord(c, { score:[17, 17], tries:f.home === 0 ? [3, 1] : [1, 3] });
  const m = c.results[0].find(x => x.h === 0 || x.a === 0);
  ok(m.hs === 17 && m.as === 17 && m.w === 0 && m.by === 'tries', 'level on points, the side with more tries goes through');
  const seen = new Set();
  for (let s = 0; s < 40; s++) {
    reseed(900 + s);
    const t = K.cupNew('tour', { user:K.cupTourSide('men') });
    K.cupRecord(t, { score:[12, 12], tries:[2, 2] });
    const x = t.results[0][0];
    ok(x.by === 'toss' && (x.w === 0 || x.w === 1), 'level on points and tries: the toss');
    seen.add(x.w);
  }
  ok(seen.size === 2, 'and the toss goes either way');
  let ko = 0, by = { tries:0, toss:0 }, bad = 0, levelPool = 0;
  for (let s = 0; s < 300; s++) {
    const w = K.cupNew('world', { user:men[s % 12] });
    while (K.cupFixture(w)) lose(w);
    const e = K.cupNew('euro', { user:X.CELTIC[s % 12] });
    lose(e);
    for (const cc of [w, e]) cc.results.forEach((rd, k) => rd.forEach(x => {
      if (!K.cupKO(cc, k)) { if (x.hs === x.as) levelPool++; return; }
      ko++; if (!koOk(x)) bad++; if (x.by) by[x.by]++;
    }));
  }
  ok(bad === 0 && ko > 2000, `${ko} simulated knockouts, none left level (${by.tries} on tries, ${by.toss} on the toss)`);
  ok(by.tries > 0 && levelPool > 0, `level simulated knockouts happen and are settled; pool draws stand (${levelPool})`);
}

// 4. the World Cup
{
  const SCO = nat('SCO'), c = K.cupNew('world', { user:SCO });
  ok(c.teams.length === 12 && json(c.teams.map(t => t.id)) === json(men.map(t => t.id)) && c.teams[c.user].id === 'SCO', 'the men\'s twelve in table order, Scotland among them');
  ok(!c.teams.some(t => t.id === 'CDN' || t.id === 'USA'), 'never Canada or the USA on Men');
  ok(c.pools.length === 4 && c.pools.every(p => p.length === 3 && p.every((i, b) => Math.floor(i/4) === b)) && new Set(c.pools.flat()).size === 12, 'four pools of three, one side from each band of four in the rankings');
  const p = c.pools.findIndex(x => x.includes(c.user)), letter = K.CUP_POOL[p];
  ok(K.cupFixture(c).label === 'Pool ' + letter && !K.cupFixture(c).ko && K.cupLabel(c) === 'Pool ' + letter, `the pool matches are labelled by pool (${K.cupLabel(c)}), and a pool keeps its draws`);
  ok(c.fixtures.slice(0, 3).every(rd => rd.length === 4) && c.fixtures[0].some(x => x.includes(c.user)) && c.fixtures[1].some(x => x.includes(c.user)) && !c.fixtures[2].some(x => x.includes(c.user)), 'three pool rounds, one match a pool each; you play the first two and sit out the third');
  K.cupRecord(c, userRes(c, 12, 12, 2, 2));
  ok(c.round === 1 && mine(c)[0].hs === mine(c)[0].as && !('w' in mine(c)[0]), 'a pool match can end level, and has no winner');
  win(c);
  ok(c.results.length === 3 && c.fixtures.length === 4 && c.fixtures[3].length === 4, 'after your second match the third round is played for you and the Quarter-Finals drawn');
  const t = [0, 1, 2, 3].map(q => K.cupPoolRows(c, q).map(r => r.i));
  const want = [[t[0][0], t[1][1]], [t[2][0], t[3][1]], [t[1][0], t[0][1]], [t[3][0], t[2][1]]].map(x => x.slice().sort().join());
  ok(json(c.fixtures[3].map(x => x.slice().sort().join())) === json(want), 'Quarter-Finals: A1 v B2, C1 v D2, B1 v A2, D1 v C2');
  const place = t[p].indexOf(c.user);
  ok(place < 2 ? K.cupFixture(c).label === 'Quarter-Final' && K.cupFixture(c).ko : K.cupUserOut(c), `top two go through (${place + 1} in Pool ${letter})`);
  // win everything: five matches, never more
  locker.length = 0;
  const all = K.cupNew('world', { user:nat('WAL') });
  while (K.cupFixture(all)) win(all, 40, 0);
  ok(K.cupDone(all) && K.cupWinner(all) === all.user && K.cupLabel(all) === 'Winners' && mine(all).length === 5 && json(locker) === '["world"]', `a finalist plays five: two in the pool, then the Quarter-Final, Semi-Final and Final (${mine(all).length}); the Locker hears 'world' once`);
  ok(all.results.slice(3).every(rd => rd.every(koOk)) && all.fixtures[4].length === 2 && all.fixtures[5].length === 1, 'the knockouts: four, two, one, never level');
  ok(K.cupStage(all, 3) === 'Quarter-Final' && K.cupStage(all, 4) === 'Semi-Final' && K.cupStage(all, 5) === 'Final', 'each stage named');
  // lose both pool matches: out at the pool stage
  const out = K.cupNew('world', { user:nat('JPN') });
  lose(out); lose(out);
  ok(K.cupUserOut(out) && K.cupDone(out) && K.cupLabel(out) === 'Pool Stage' && K.cupWinner(out) !== out.user, 'two pool defeats: out, Pool Stage, the rest played for him');
  // the women's twelve
  const wc = K.cupNew('world', { user:nat('CDN', 'women'), cat:'women' });
  ok(json(wc.teams.map(t => t.id)) === json(women.map(t => t.id)) && wc.teams.every(t => / Women$/.test(t.name) && t.cat === 'women') && wc.teams[wc.user].id === 'CDN', 'Women: the women\'s twelve, at their ratings, named for it');
  ok(wc.teams.every(t => X.rateOf(t) === X.rateOf(women.find(n => n.id === t.id))), 'each at the women\'s table\'s rating');
  const mt = K.cupNew('world', { user:{ id:'MYT', name:'My Town', kit:'#c8102e', trim:'#f2efe6', custom:true, pace:3, power:3, handling:3, kicking:3, stamina:3 } });
  ok(mt.user === 11 && mt.teams[11].custom && mt.teams.slice(0, 11).every((s, i) => s.id === men[i].id), 'a side not on the list takes the twelfth place');
  men.unshift({ ...men[0], id:'LGW', name:'Legend', legend:true });
  const lg = K.cupNew('world', { user:nat('ENG') });
  men.shift();
  ok(!lg.teams.some(t => t.id === 'LGW') && lg.teams.length === 12, 'a Legends side in the International list never joins the World Cup');
}

// 5. the Home Nations Tour
{
  for (const cat of ['men', 'women']) {
    const s = K.cupTourSide(cat), four = ['ENG', 'IRE', 'SCO', 'WAL'].map(id => nat(id, cat));
    ok(T.stamina.ABILITIES.every(([k]) => s[k] === Math.min(5, Math.max(...four.map(n => n[k])))), `${cat}: each ability the best of the four home nations' (${T.stamina.ABILITIES.map(([k]) => s[k]).join(' ')})`);
    ok(s.name === (cat === 'women' ? 'Home Nations Women' : 'Home Nations') && s.kit === '#c41e3a' && (cat === 'men' ? !('cat' in s) : s.cat === 'women'), `${cat}: named for it, in red`);
  }
  ok(!X.ALL_TEAMS.concat(X.NATIONS).some(t => t.id === K.cupTourSide('men').id), 'the touring side\'s code is no club\'s or nation\'s');
  ok([0, 1, 2, 3, 4, 5].map(n => K.cupNew('tour', { user:K.cupTourSide('men'), n }).teams[1].id).join() === 'NZL,RSA,AUS,NZL,RSA,AUS', 'the hosts in turn from the caller\'s count');
  ok(K.cupNew('tour', { user:K.cupTourSide('men'), n:0, host:'AUS' }).teams[1].id === 'AUS', 'or the host asked for');
  const eng = K.cupNew('tour', { user:nat('ENG'), n:2 });
  ok(eng.user === 0 && eng.teams[0].id === 'HNS' && eng.teams[1].id === 'AUS', 'a home nation\'s player is the touring side');
  const host = K.cupNew('tour', { user:nat('NZL') });
  ok(host.user === 1 && host.teams[1].id === 'NZL' && host.teams[0].id === 'HNS', 'a host\'s own side plays the host');
  const wt = K.cupNew('tour', { user:K.cupTourSide('women'), cat:'women', n:1 });
  ok(wt.teams[1].name === 'South Africa Women' && X.rateOf(wt.teams[1]) === X.rateOf(nat('RSA', 'women')), 'Women: the host is the women\'s side, at its rating');
  const c = K.cupNew('tour', { user:K.cupTourSide('men'), n:0 });
  ok(K.cupFixture(c).label === 'Test 1 of 3' && K.cupFixture(c).home === 1 && K.cupFixture(c).ko, 'Test 1 of 3, at the host\'s');
  locker.length = 0;
  win(c);
  ok(K.cupFixture(c).label === 'Test 2 of 3' && json(c.fixtures[1]) === '[[1,0]]' && json(K.cupSeries(c)) === '[1,0]', 'Test 2 of 3, the series 1 – 0');
  win(c);
  ok(K.cupDone(c) && K.cupWinner(c) === 0 && c.fixtures.length === 2 && K.cupLabel(c) === 'Series Won' && json(locker) === '["tour"]', 'two Tests won: the series is over, no third Test, Series Won, the Locker hears \'tour\'');
  const d = K.cupNew('tour', { user:K.cupTourSide('men') });
  win(d); lose(d);
  ok(K.cupFixture(d).label === 'Test 3 of 3' && !K.cupDone(d) && !K.cupUserOut(d), 'one each: the third Test decides it, and a lost Test is not out');
  lose(d);
  ok(K.cupDone(d) && K.cupWinner(d) === 1 && K.cupLabel(d) === 'Series Lost' && K.cupUserOut(d), 'lost 1 – 2: Series Lost');
  ok(d.results.flat().every(koOk), 'no Test is ever left level');
}

// 6. the Triple Crown
{
  const season = (id, cat, beat) => {   // a nation's own six, every result decided: the user beats the sides in beat, loses to the rest; others draw
    const teams = X.natGroup(id, cat).map(t => ({ ...t })), user = teams.findIndex(t => t.id === id);
    const results = [[], [], [], [], []];
    let r = 0;
    for (let o = 0; o < 6; o++) if (o !== user) { const won = beat.includes(teams[o].id); results[r++].push(r % 2 ? { h:user, a:o, hs:won ? 20 : 5, as:won ? 5 : 20, ht:3, at:1 } : { h:o, a:user, hs:won ? 5 : 20, as:won ? 20 : 5, ht:1, at:3 }); }
    return { user, teams, results, round:5, fixtures:[] };
  };
  ok(K.cupTriple(season('ENG', 'men', ['IRE', 'SCO', 'WAL'])), 'England beat Ireland, Scotland and Wales: the Triple Crown');
  ok(!K.cupTriple(season('ENG', 'men', ['IRE', 'SCO', 'FRA', 'ITA'])), 'beaten by Wales: no Triple Crown, whatever else');
  ok(K.cupTriple(season('WAL', 'women', ['ENG', 'IRE', 'SCO'])), 'Women too');
  ok(!K.cupTriple(season('FRA', 'men', ['ENG', 'IRE', 'SCO', 'WAL', 'ITA'])), 'France is not a home nation: never');
  ok(!K.cupTriple(season('NZL', 'men', ['AUS', 'RSA', 'ARG', 'FIJ', 'JPN'])) && !K.cupTriple({ user:0, teams:X.CLUBS.slice(0, 6), results:[] }) && !K.cupTriple(null), 'nor the other six, a club league, or nothing');
  const drawn = season('SCO', 'men', ['ENG', 'IRE']);
  drawn.results.flat().find(m => drawn.teams[m.h].id === 'WAL' || drawn.teams[m.a].id === 'WAL').hs = drawn.results.flat().find(m => drawn.teams[m.h].id === 'WAL' || drawn.teams[m.a].id === 'WAL').as;
  ok(!K.cupTriple(drawn), 'a draw with one of them is not a win');
  // in a season under way, and the Locker told once, in the round that completed it
  const s = season('IRE', 'men', ['ENG', 'SCO', 'WAL']), full = s.results;
  locker.length = 0;
  const done = [];
  for (let k = 1; k <= 5; k++) { s.results = full.slice(0, k); done.push(K.cupTripleAfter(s)); }
  const when = full.findIndex((rd, k) => K.cupTriple({ ...s, results:full.slice(0, k + 1) }));
  ok(done.filter(Boolean).length === 1 && done[when] === true && json(locker) === '["triple"]', `cupTripleAfter: true once, in round ${when + 1}, and the Locker hears 'triple' once`);
  // the real path: a Championship as England, through the team screen, its matches through full time
  X.setChamp(null); K.set(null);
  D.openTeams('champ'); X.poolPick('int'); D.pickTeam(nat('ENG'));
  const ch = X.champ(); locker.length = 0;
  ok(ch && ch.teams[ch.user].id === 'ENG' && ch.teams.length === 6, 'a Championship as England is the Six Nations');
  for (let r = 0; r < 5; r++) {
    const { opp } = (() => { const p = ch.fixtures[ch.round].find(x => x.includes(ch.user)); return { opp:p[0] === ch.user ? p[1] : p[0] }; })();
    const home = K.CUP_TRIPLE.nations.includes(ch.teams[opp].id);
    D.startMatch(ch.teams[ch.user], ch.teams[opp], true);
    T.M.half = 2; T.M.score = home ? [24, 10] : [3, 30]; T.M.tries = home ? [4, 1] : [0, 4]; T.arcade.endHalf(); D.exitMatch();
  }
  const hon = X.honours(ch, X.standings(ch)).filter(h => h[1] === ch.user).map(h => h[0]);
  ok(ch.round === 5 && K.cupTriple(ch) && hon.includes('Triple Crown') && json(locker) === '["triple"]', `England's Championship: the Triple Crown in honours and from cupTriple, the Locker told once (${json(locker)})`);
  X.setChamp(null);
}

// 7. the save
{
  const cups = [K.cupNew('euro', { user:X.FRANCE[2] }), K.cupNew('world', { user:nat('ARG') }), K.cupNew('tour', { user:K.cupTourSide('women'), cat:'women', year:6 })];
  ok(cups.every(c => json(K.cleanCup(copy(c))) === json(c)), 'a new cup passes its own validator unchanged');
  for (const c of cups) { win(c); lose(c); }
  ok(cups.every(c => json(K.cleanCup(copy(c))) === json(c)), 'and after its rounds, out or not');
  const done = K.cupNew('world', { user:nat('IRE') }); while (K.cupFixture(done)) win(done);
  ok(json(K.cleanCup(copy(done))) === json(done) && K.cupDone(K.cleanCup(copy(done))), 'a finished World Cup round-trips');
  ok(cups[2].year === 6 && K.cleanCup(copy(cups[2])).year === 6 && K.cleanCup({ ...copy(cups[2]), year:-1 }).year === undefined, 'a year is kept when valid');
  const e = K.cupNew('euro', { user:X.ENGLAND[1] }); win(e);
  const bad = [
    ['not an object', 'cup'], ['an unknown cup', { ...copy(e), id:'lions' }], ['three sides', { ...copy(e), teams:copy(e.teams).slice(0, 3) }],
    ['the user out of range', { ...copy(e), user:4 }], ['a side with no name', { ...copy(e), teams:[{ ...copy(e.teams[0]), name:'' }, ...copy(e.teams).slice(1)] }],
    ['round and results disagree', { ...copy(e), round:0 }], ['a Final that is not the winners', (() => { const x = copy(e); const lost = x.results[0].map(m => (m.w === m.h ? m.a : m.h)); x.fixtures[1] = [[lost[0], lost[1]]]; return x; })()],
    ['a Semi-Final with the lower-rated side at home', (() => { const x = copy(e); x.fixtures[0][0] = x.fixtures[0][0].slice().reverse(); return x; })()],
    ['a knockout with no winner', (() => { const x = copy(e); delete x.results[0][0].w; return x; })()],
    ['a knockout won by the loser', (() => { const x = copy(e); const m = x.results[0][0]; m.w = m.w === m.h ? m.a : m.h; return x; })()],
    ['a level knockout with no reason', (() => { const x = copy(e); const m = x.results[0][0]; m.as = m.hs; m.at = m.ht; delete m.by; return x; })()],
    ['a score off the scale', (() => { const x = copy(e); x.results[0][0].hs = 1000; return x; })()],   // ptsOf allows to 999 now (PTS_MAX, PR #14: a level 90 side passed the old 200); 999 was this case's number
    ['a Test after the series is won', (() => { const t = K.cupNew('tour', { user:K.cupTourSide('men') }); win(t); win(t); const x = copy(t); x.fixtures.push([[1, 0]]); return x; })()],
    ['pools with a side twice', (() => { const x = copy(cups[1]); x.pools[0][0] = x.pools[1][0]; return x; })()],
    ['a pool with two from one band', (() => { const x = copy(cups[1]); [x.pools[0][1], x.pools[0][2]] = [x.pools[0][2], x.pools[0][1]]; return x; })()],
    ['a pool round that is not the pools\'', (() => { const x = copy(cups[1]); x.fixtures[0][0] = x.fixtures[0][0].slice().reverse(); return x; })()],
    ['the pool round he sits out, not played', (() => { const w = K.cupNew('world', { user:nat('SCO') }); win(w); win(w); const x = copy(w); x.results = x.results.slice(0, 2); x.round = 2; x.fixtures = x.fixtures.slice(0, 3); return x; })()],
    ['out in the Semi-Final, the Final not played', (() => { const o = K.cupNew('euro', { user:X.ENGLAND[0] }); lose(o); const x = copy(o); x.results = x.results.slice(0, 1); x.round = 1; x.fixtures = x.fixtures.slice(0, 1); return x; })()],
    ['out in the Quarter-Final, the rest not played', (() => { const w = K.cupNew('world', { user:nat('NZL') }); win(w, 60, 0); win(w, 60, 0); lose(w); const x = copy(w); x.results = x.results.slice(0, 4); x.round = 4; x.fixtures = x.fixtures.slice(0, 5); return x; })()],
  ];
  for (const [what, v] of bad) ok(K.cleanCup(v) === null, 'refused: ' + what);
  const level = copy(e), lm = level.results[0][0]; lm.as = lm.hs; lm.at = lm.ht; lm.by = 'toss';
  ok(K.cleanCup(level) && K.cleanCup(level).results[0][0].by === 'toss', 'a level knockout settled on the toss is kept');
  const gap = copy(e); gap.fixtures.pop();
  ok(json(K.cleanCup(gap).fixtures) === json(e.fixtures), 'a next round missing from a save follows from the results');
  const live = K.cleanCup(copy(e)), fx = K.cupFixture(live);
  ok(fx && fx.label === 'Final' && live.fixtures[live.round].some(p => p.includes(live.user)), 'a cup under way is kept: its next round is his');
  const anon = copy(e); delete anon.uid;
  ok(/^cup-[a-z0-9]+$/.test(K.cleanCup(anon).uid) && K.cleanCup(anon).uid === K.cleanCup(copy(anon)).uid, 'a cup saved without an id gets a stable one from its data');
  // the browser save: the field, partial restores, old saves
  K.set(null); K.setTurn(0); X.setChamp(null); X.save();
  const before = Object.keys(saved());
  ok(!('cup' in saved()) && !('cupTurn' in saved()) && before.filter(k => k !== 'locker').join() === 'settings,champ,custom,champHistory,seasonSerial,career,importLeague',   // the Locker's field is there once a medal counted (src/locker.js)
     `no cup, no field: a save has the fields it had (${before.join(', ')})`);
  K.set(e); K.setTurn(2); X.save();
  ok(json(saved().cup) === json(e) && saved().cupTurn === 2, 'a cup under way is saved, and the tour count');
  const snap = copy(saved());
  K.set(null); K.setTurn(0); X.restore(snap);
  ok(json(K.get()) === json(e) && K.turn() === 2, 'and comes back');
  X.restore({ settings:{ sound:true } });
  ok(json(K.get()) === json(e) && K.turn() === 2, 'a partial restore leaves it alone');
  X.restore({ cup:{ id:'euro', teams:'x' }, cupTurn:'many' });
  ok(K.get() === null && K.turn() === 0, 'a broken one is dropped, and the rest of the save kept');
  K.set(e); X.restore({ cup:null });
  ok(K.get() === null, 'null clears it');
  const old = { settings:{ half:1, diff:2, sound:false, pool:'fra' }, champ:null, custom:[], champHistory:[], seasonSerial:3 };
  K.set(null); X.restore(copy(old));
  ok(K.get() === null && D.settings().half === 1 && D.settings().pool === 'fra', 'a save from before the cups loads as it did');
}

// 8. the Trophy Cabinet
{
  K.set(null); K.setHistory([]); X.setChamp(null);
  const league = (() => { X.newChamp(X.ENGLAND[0], X.ENGLAND.slice(1, 6)); const c = X.champ(); c.results = c.fixtures.map(rd => rd.map(([h, a]) => ({ h, a, hs:h === c.user ? 30 : 10, as:a === c.user ? 30 : 10, ht:4, at:1 }))); c.round = 5; X.save(); X.setChamp(null); return c; })();
  ok(K.history().length === 1 && K.cabinetKind(K.history()[0]) === 'league' && !('kind' in K.history()[0]), 'a league season goes in as it always has, no kind: a League');
  const won = K.cupNew('euro', { user:X.ENGLAND[0] }); win(won); win(won);
  const lost = K.cupNew('world', { user:nat('SCO') }); lose(lost); lose(lost);
  const live = K.cupNew('tour', { user:K.cupTourSide('men') });
  ok(K.retain(won) && !K.retain(won) && K.retain(lost) && !K.retain(live), 'a finished cup goes in once; one under way never');
  const h = K.history();
  ok(h.length === 3 && h[1].kind === 'euro' && h[1].id === won.uid && json(h[1].cup) === json(K.cleanCup(copy(won))) && h[2].kind === 'world', 'as { kind, id, cup }, after the league season');
  const hon = K.savedHonours();
  ok(hon.seasons === 1 && hon.champions === 1 && hon.cups === 2 && hon.euro === 1 && hon.world === 0 && hon.tour === 0, `counted by kind: one title, one European Cup, the World Cup lost (${json(hon)})`);
  K.renderCabinet('home-history');
  const html = $('home-history').innerHTML;
  ok(/data-kind="league" data-metal="silver" data-won>League</.test(html) && /data-kind="euro" data-metal="gold" data-won>European Cup</.test(html) && /data-kind="world" data-metal="gold">World Cup</.test(html), 'each entry shows its kind in words, in its metal, the old ones League; a trophy beside the league and the cup won, none beside the World Cup lost');
  ok(/data-kind="euro" data-metal="gold" data-won>1 European Cup</.test(html) && /data-kind="league" data-metal="silver" data-won>1 Title</.test(html) && /data-kind="triple" data-metal="silver">0 Triple Crowns</.test(html) && !/World Cups?</.test(html.match(/cabinet-tally">([\s\S]*?)<\/p>/)[1]), 'the tally counts each kind won, a cup kind once one is won, each in its metal, a trophy only beside a count held (none beside 0 Triple Crowns)');
  // real silverware: one map of each kind's metal, gold or silver, read by every trophy; the tones read on the dark panel
  const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  ok(json(K.TROPHY_METAL) === json({ league:'silver', euro:'gold', world:'gold', tour:'gold', triple:'silver', fan:'gold' }) && T.career.KINDS.every(k => K.trophyMetal(k) === K.TROPHY_METAL[k]) && K.trophyMetal('lions') === 'silver' && K.trophyMetal(undefined) === 'silver',
    'TROPHY_METAL: gold for the European Cup, the World Cup, the Home Nations Tour and the Super Fan trophy, silver for a title and the Triple Crown; anything else a League\'s silver');
  const tags = [...html.matchAll(/class="(?:cup-kind|ck)" data-kind="(\w+)" data-metal="(\w+)"(?: data-won)?>/g)];
  ok(tags.length >= 5 && tags.every(([, k, m]) => m === K.trophyMetal(k)) && !/class="(?:cup-kind|ck)" data-kind="\w+">/.test(html), `every tag and tally carries its kind's metal from the map (${tags.map(t => t[1] + ' ' + t[2]).join(', ')})`);
  const tone = n => (css.match(new RegExp(`--${n}:(#[0-9a-f]{6})`)) || [])[1];
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)/255).map(v => (v <= 0.03928 ? v/12.92 : ((v + 0.055)/1.055)**2.4)); return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05)/(Math.min(x, y) + 0.05); };
  const metals = ['gold', 'silver'].map(tone), grounds = ['panel', 'panel-hi', 'night'].map(tone);
  ok(metals.every(Boolean) && grounds.every(Boolean) && metals.every(m => grounds.every(g => ratio(m, g) >= 4.5)) && !metals.includes(tone('flood')) && !metals.includes(tone('chalk')),
    `gold ${metals[0]} and silver ${metals[1]}: each text drawn in them reads at 4.5:1 or more on the panel and the night (${metals.map(m => grounds.map(g => ratio(m, g).toFixed(1)).join('/')).join(', ')}), neither the floodlight nor the chalk`);
  ok(/\[data-metal="gold"\]\{--kc:var\(--gold\)/.test(css) && /\[data-metal="silver"\]\{--kc:var\(--silver\)/.test(css) && !/\[data-kind(="\w+")?\]\{--kc/.test(css) && !/#6f9cff|#ff5a6e/.test(css),
    'the tones are the metals\' alone: no colour by kind left (the old blue and red gone; green is a pool\'s Through mark only)');
  // each kind's shape (the owner, 2026-11-09: "different shapes"): one map beside the metals, a silhouette of its own for every kind (the
  // Super Fan's 'fan' ready for its kind), made into the page's rules, and every trophy drawn through them, in its metal
  const SH = K.TROPHY_SHAPE, kinds = [...new Set([...T.career.KINDS, ...Object.keys(K.TROPHY_METAL), 'fan'])];
  ok(json(Object.fromEntries(Object.entries(SH).map(([k, v]) => [k, v.name]))) === json({ league:'shield', euro:'cup with big handles', world:'cup with a ball on top', tour:'plate', triple:'crown', fan:'rosette' }),
    'TROPHY_SHAPE: a title a shield, the European Cup a cup with big handles, the World Cup a cup with a ball on top, the Home Nations Tour a plate, the Triple Crown a crown, the Super Fan\'s trophy a rosette');
  ok(kinds.every(k => SH[k] && /^M[0-9MmLlHhVvCcSsQqAaZz .-]+$/.test(SH[k].d) && /z$/i.test(SH[k].d)) && new Set(kinds.map(k => SH[k].d)).size === kinds.length && new Set(kinds.map(k => SH[k].name)).size === kinds.length && Object.keys(SH).length === kinds.length,
    `every kind has a shape (${kinds.join(', ')}), a filled path, and no two kinds share one`);
  ok(K.trophyShape('lions') === SH.league && K.trophyShape(undefined) === SH.league && kinds.every(k => K.trophyShape(k) === SH[k]), 'an unknown kind is a League\'s shield, as its metal is a League\'s silver');
  {
    const rules = K.trophyShapeCss().split('\n'), svg = k => `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='${SH[k].d}'/></svg>`;
    const inner = r => decodeURIComponent((r.match(/\{--trophy:url\("data:image\/svg\+xml,([^"]+)"\)\}$/) || [])[1] || '');
    ok(rules.length === kinds.length + 1 && rules[0].startsWith(':root{--trophy:') && inner(rules[0]) === svg('league') && Object.keys(SH).every((k, i) => rules[i + 1].startsWith(`[data-kind="${k}"]{--trophy:`) && inner(rules[i + 1]) === svg(k) && K.trophyMask(k) === rules[i + 1].slice(rules[i + 1].indexOf(':') + 1, -1)),
      'the page\'s rules come from the map: --trophy for each data-kind, its mask exactly that kind\'s path, a League\'s shield by default');
    const ui = fs.readFileSync(new URL('../src/ui-cups.js', import.meta.url), 'utf8');
    ok(/^trophyShapesOn\(\);$/m.test(ui) && /el\.id = 'trophy-shapes'; el\.textContent = trophyShapeCss\(\);/.test(ui) && K.shapesOn() === false, 'ui-cups.js puts them on the page once, as the game loads (none here: the stand-in DOM has no head)');
  }
  const rule = sel => (css.match(new RegExp('(?:^|\\n|\\})' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}')) || [])[1] || '';
  const drawn = { cabinet:rule('.cup-kind[data-won]::before,.ck[data-won]::before'), row:rule('.cr-cup i'), cup:rule('.cup-trophy') };
  ok(Object.values(drawn).every(r => /-webkit-mask:var\(--trophy\) center\/contain no-repeat;/.test(r) && /;mask:var\(--trophy\) center\/contain no-repeat/.test(r) && /background:linear-gradient\(150deg,var\(--kc-hi\),var\(--kc\) 55%,var\(--kc-lo\)\)/.test(r) && !/url\(|clip-path/.test(r)),
    'every trophy, the cabinet\'s, the career row\'s and every cup\'s own, is its kind\'s shape (--trophy) in its kind\'s metal with the sheen: no one cup for every kind');
  ok(!/--cup-shape/.test(css) && !/cup with two handles/.test(css), 'the one small cup for every kind is gone');
  {
    const srcs = ['src/ui-career.js', 'src/ui-menus.js', 'src/ui-cups.js'].map(f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8')).join('\n');
    const marks = [...srcs.matchAll(/class="(cup-trophy|cr-cup|cup-kind|ck|cup-win)(\$\{[^}]*\})?"([^>]*)>/g)];
    ok(marks.length >= 8 && marks.every(m => /^ data-kind="(\$\{[^}]+\}|euro|league|world|tour|triple)"/.test(m[3])) && marks.some(m => m[1] === 'cup-win'), `every trophy written anywhere carries its kind first, so its shape follows it (${marks.length} places)`);
  }
  const kindMark = (css.match(/\.cup-kind::before\{([^}]*)\}/) || [])[1] || '';
  ok(/border-radius:50%/.test(kindMark) && !/clip-path/.test(kindMark) && !/\.ck::before\{/.test(css) && /\.ck\[data-won\]\{color:var\(--kc\)\}/.test(css) && !/\.ck\{[^}]*color:/.test(css),
    'nothing won, no trophy: an entry not won keeps a dot in its kind\'s metal, a count of 0 no mark and the tally\'s quiet colour');
  // a cabinet with nothing won: a league season lost (the Wooden Spoon), a cup out in its pool, a tour's series lost; every count 0
  {
    const keep = K.history(), flip = c => ({ ...copy(c), id:'lost-' + c.id, results:c.results.map(rd => rd.map(r => ({ ...r, hs:r.as, as:r.hs, ht:r.at, at:r.ht }))) });
    const tourLost = K.cupNew('tour', { user:K.cupTourSide('men') }); while (!K.cupDone(tourLost)) lose(tourLost);
    K.setHistory([flip(keep[0]), keep[2], { kind:'tour', id:tourLost.uid, cup:K.cleanCup(copy(tourLost)) }]);
    K.renderCabinet('home-history');
    const none = $('home-history').innerHTML, ws = K.savedHonours();
    ok(ws.champions === 0 && ws.grandSlams === 0 && ws.tripleCrowns === 0 && ws.world === 0 && ws.tour === 0 && ws.woodenSpoons === 1 && !/data-won/.test(none) && /data-kind="league" data-metal="silver">League</.test(none) && /data-kind="world" data-metal="gold">World Cup</.test(none) && /data-kind="tour" data-metal="gold">Home Nations Tour</.test(none) && /Wooden Spoon/.test(none) && /Series Lost/.test(none) && /0 Titles/.test(none),
      `nothing won, no trophy anywhere: the lost season, the pool exit and the series lost each a dot in its metal, every count 0 unmarked (${(none.match(/cabinet-tally">([\s\S]*?)<\/p>/) || [])[1]})`);
    K.setHistory(keep);
  }
  ok(/Bath · Winners/.test(html) && /Scotland · Pool Stage/.test(html) && /Won by /.test(html), 'a cup\'s entry: your side, how far, and who won it');
  X.save();
  const back = copy(saved().champHistory);
  K.setHistory([]); X.restore({ champHistory:[null, { kind:'euro', cup:{} }, { kind:'tour', cup:copy(live) }, { kind:'lions', cup:copy(won) }, ...back, back[1]] });
  ok(json(K.history()) === json(back), 'a saved cabinet comes back; broken, unfinished, unknown and repeated entries are dropped');
  X.restore({ champHistory:back.map(e => (e.kind ? e : { ...e, kind:'league' })) });
  ok(K.history().length === 3 && !('kind' in K.history()[0]), 'an entry marked league is a league season');
  const many = [];
  for (let i = 0; i < 12; i++) many.push({ ...copy(league), id:'L' + i }, { kind:'euro', id:'C' + i, cup:{ ...copy(won), uid:'C' + i } });
  X.restore({ champHistory:many });
  const kept = K.history().map(e => e.id);
  ok(kept.length === 20 && kept.join() === many.slice(4).map(e => e.id).join(), 'it keeps the last ten league seasons and the last ten cups, in order');
  ok(K.savedHonours().seasons === 10 && K.savedHonours().cups === 10 && K.savedHonours().euro === 10, 'and counts them');
  // practice never archives
  K.setHistory([]); D.settings();
  const p = T.practice;
  ok(typeof p.state === 'function', 'practice is there');
  K.setHistory([]);
}

// 9. the engine: M.cup and the Golden Try
{
  const quick = o => { T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:1, headless:true, humans:[true, false], arcade:true, ...o }); return T.M; };
  ok(quick({}).cup === null && T.M.cupKO === false && T.arcade.goldenOn(), 'a Quick Match: no cup, the Golden Try');
  ok(quick({ champ:true }).cup === null && !T.arcade.goldenOn(), 'a championship match keeps its draw');
  ok(quick({ cup:'euro', cupKO:true }).cup === 'euro' && T.M.cupKO && T.arcade.goldenOn(), 'a cup knockout: M.cup is the cup, and the Golden Try');
  ok(quick({ cup:'world', cupKO:false }).cup === 'world' && !T.M.cupKO && !T.arcade.goldenOn(), 'a pool match keeps its draw');
  quick({ cup:'tour', cupKO:true }); T.M.career = true;
  ok(T.arcade.goldenOn(), 'a cup knockout in a career has it too');
  ok(quick({ cupKO:true }).cupKO === false && !T.M.cup, 'cupKO means nothing without a cup');
  T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:1, headless:true, auto:true, cup:'euro', cupKO:true });
  ok(!T.arcade.goldenOn(), 'never AI v AI');
  quick({ cup:'euro', cupKO:true }); T.M.half = 2; T.M.score = [7, 7]; T.arcade.endHalf();
  ok(T.M.golden && T.M.half === 3 && !T.M.over, 'level at full time in a knockout: extra time');
  quick({ cup:'world', cupKO:false }); T.M.half = 2; T.M.score = [7, 7]; T.arcade.endHalf();
  ok(T.M.over && !T.M.golden, 'level in a pool: the draw stands');
  const src = f => fs.readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');
  const engine = JSON.parse(src('manifest.json')).filter(f => !/^ui-|^cups\.js$|^match\.js$|^arcade\.js$|^boot\.js$/.test(f));
  const golden = src('arcade.js').split('\n').filter(l => /\bM\.cup/.test(l) && !/^\s*(\/\*|\*|\/\/)/.test(l.trim()) && !/^\s*\(M\.cupKO/.test(l));
  ok(engine.every(f => !/\bM\.cup/.test(src(f))) && golden.length === 1 && /^const goldenOn = /.test(golden[0]), 'nothing in the engine reads M.cup but the Golden Try (goldenOn)');
}

// 10. Championship mode: the competitions on the home, the World Cup, the tour, the European Cup offer, the hub
{
  const H = T.home;
  K.set(null); X.setChamp(null); K.setHistory([]); K.setTurn(0); D.settings().cat = 'men';
  H.setTier(2); H.select('champ'); H.champPick('sur');
  ok(K.comp() === 'league' && $('t-tier').hidden && $('t-nat').hidden && $('t-loc').hidden && X.teamPool() === 'sur' && $('t-title').textContent === 'Pick Your Team' && /Create Team/.test($('t-grid').innerHTML), 'a league picked on the home (Local · Surrey): the team screen with its sides, and no lists to wander off to');
  D.goHome(); H.setTier(0); H.champ();
  ok(/data-comp="int"><span>Championship<\/span><\/button><button class="btn hc-comp" id="hc-world" data-comp="world"><span>World Cup<\/span><\/button><button class="btn hc-comp" id="hc-tour" data-comp="tour"><span>Home Nations Tour<\/span><\/button>/.test($('hc-comps').innerHTML), 'International: Championship | World Cup | Home Nations Tour');
  D.openTeams('quick');
  ok(!$('t-tier').hidden, 'Quick Match keeps the lists');
  H.champPick('world');
  ok($('t-title').textContent === 'Pick Your Nation' && $('t-tier').hidden && $('t-nat').hidden && $('t-loc').hidden && !/Create Team|Import/.test($('t-grid').innerHTML), 'World Cup: Pick Your Nation, no lists, no Create Team or Import');
  ok((($('t-grid').innerHTML.match(/class="team/g)) || []).length === 12 && /South Africa/.test($('t-grid').innerHTML), 'the twelve nations');
  D.settings().cat = 'women'; D.renderTeams();
  ok(/Canada/.test($('t-grid').innerHTML) && !/Argentina/.test($('t-grid').innerHTML), 'the women\'s twelve on Women');
  D.pickTeam(nat('CDN', 'women'));
  let c = K.get();
  ok(c && c.id === 'world' && c.cat === 'women' && c.teams[c.user].name === 'Canada Women' && shown() === 's-cup', 'picking Canada starts a women\'s World Cup and opens the cup hub');
  ok(/^Pool [ABCD]$/.test($('cup-title').textContent) && $('cup-eyebrow').textContent === 'World Cup · Canada Women' && /id="cup-play"/.test($('cup-next').innerHTML) && /cup-pools/.test($('cup-draw').innerHTML), `the hub: the stage, your fixture, Play, the pools (${$('cup-title').textContent})`);
  ok(saved().cup && saved().cup.uid === c.uid, 'and is saved');
  K.play();
  ok(T.M.cup === 'world' && !T.M.cupKO && !T.M.champ && T.M.nat[0].id === 'CDN', 'Play Match: a pool match, your side');
  T.M.half = 2; T.M.score = [28, 7]; T.M.tries = [4, 1]; T.arcade.endHalf();
  ok(c.round === 1 && /^\+5 Table Points/.test($('br-pts').textContent) && !$('br-pts').hidden, `full time: the result is in the cup, the card says what it earned (${$('br-pts').textContent})`);
  D.exitMatch();
  ok(shown() === 's-cup' && /cup-last/.test($('cup-last').innerHTML) && /28 – 7|7 – 28/.test($('cup-last').innerHTML), 'back to the cup hub, the result card on it');
  D.goHome();
  ok($('b-champ').textContent === 'Continue Championship' && /^Canada Women · World Cup · Pool [ABCD]$/.test(noteText()) && /<span class="rn-name">Canada Women · <\/span>/.test($('champ-note').innerHTML) && !$('champ-note').hidden, `home: Continue Championship, the cup in its note, the name in its span (${noteText()})`);
  $('b-champ').click();
  ok(shown() === 's-cup', 'which goes back to the cup hub');
  K.play(); T.M.half = 2; T.M.score = [40, 0]; T.M.tries = [6, 0]; T.arcade.endHalf(); D.exitMatch();
  c = K.get();
  const f = K.cupFixture(c);
  if (f) {
    K.play();
    ok(T.M.cupKO && T.M.cup === 'world', 'a Quarter-Final is a knockout match');
    T.M.half = 2; T.M.score = [10, 10]; T.M.tries = [2, 2]; T.arcade.endHalf();
    ok(T.M.golden && !T.M.over, 'level at full time: the Golden Try');
    T.M.score = [15, 10]; T.M.tries = [3, 2]; T.arcade.endHalf();
    ok(T.M.over && /Through to the Semi-Finals/.test($('br-pts').textContent), `the try wins it: Through to the Semi-Finals (${$('br-pts').textContent})`);
    D.exitMatch();
  } else ok(false, 'Canada top their pool after two big wins');
  while (K.cupFixture(K.get())) { K.play(); T.M.half = 2; T.M.score = [30, 3]; T.M.tries = [5, 0]; T.arcade.endHalf(); D.exitMatch(); }
  c = K.get();
  ok(K.cupDone(c) && K.cupWinner(c) === c.user && $('cup-title').textContent === 'Winners' && $('cup-title').classList.contains('gold') && /cup-win/.test($('cup-next').innerHTML) && /id="cup-new"/.test($('cup-next').innerHTML), 'the winner\'s card, gold, and New Championship');
  ok(K.history().length === 1 && K.history()[0].kind === 'world' && K.history()[0].id === c.uid, 'and the cup is in the Trophy Cabinet');
  ok(/id="cup-new"[^>]*>New Championship<\/button>/.test($('cup-next').innerHTML), 'the hub\'s button is cup-new, New Championship');
  { // the panel's builders, for another screen (Career's): its own ids and its own words, so a hidden hub's old panel never answers $() for it
    const e2 = K.cupNew('euro', { user:X.ENGLAND[0] }), fx2 = K.cupFixture(e2), play = K.fixtureHtml(e2, fx2, 'cc'), end = K.winHtml(c, 'cc', 'Next Season');
    ok(/id="cc-play"[^>]*>Play Match<\/button>/.test(play) && /id="cc-new"[^>]*>Next Season<\/button>/.test(end) && !/id="cup-/.test(play + end) && !/New Championship/.test(end), 'the fixture and winner\'s cards take a prefix for their ids and a label for the button');
  }
  D.goHome();
  ok($('b-champ').textContent === 'Final Result' && / · Winners$/.test(noteText()), `home: Final Result (${noteText()})`);
  $('b-champ').click(); $('cup-new').click();
  ok(K.get() === null && shown() === 's-home' && D.settings().hl === 'champ' && !$('hc-new').hidden && $('hc-go').hidden && K.history().length === 1, 'New Championship: the cup put away once, the home\'s Championship with its competitions');
  // the Home Nations Tour, in turn
  D.settings().cat = 'men'; H.champPick('tour');
  ok($('t-title').textContent === 'Pick the Host' && $('t-default').textContent === 'Tour New Zealand' && !$('t-default').hidden && !$('t-yours').hidden && $('t-change').hidden && /Home Nations/.test($('t-mine').innerHTML), 'Home Nations Tour: your side is the Home Nations, Tour New Zealand first');
  ok(/New Zealand[\s\S]*South Africa[\s\S]*Australia/.test($('t-grid').innerHTML) && (($('t-grid').innerHTML.match(/class="team/g)) || []).length === 3, 'the three hosts, the one in turn first');
  $('t-default').click();
  c = K.get();
  ok(c && c.id === 'tour' && c.teams[1].id === 'NZL' && c.user === 0 && K.turn() === 1 && $('cup-eyebrow').textContent === 'Tour of New Zealand' && $('cup-title').textContent === 'Test 1 of 3', 'a tour of New Zealand, Test 1 of 3');
  $('cup-reset').click(); $('cup-reset').click();
  ok(K.get() === null && shown() === 's-home' && K.history().length === 1, 'Start Fresh, two taps: the tour gone, nothing unfinished in the cabinet');
  H.champPick('tour');
  ok($('t-default').textContent === 'Tour South Africa', 'next time the host in turn is South Africa');
  D.pickTeam(nat('AUS'));
  ok(K.get().teams[1].id === 'AUS' && K.turn() === 3, 'or pick the host: Australia, and New Zealand is next');
  K.set(null);
  H.champPick('eng');
  ok(K.comp() === 'league' && X.teamPool() === 'eng' && $('t-tier').hidden && $('t-eyebrow').textContent === 'Championship · England', 'after a cup, a league from the home is a league again: England\'s sides');
  // the European Cup offer after a league won with a side from a European league
  const finish = (c, place) => {   // every game won by the higher-ranked side, the user ranked place
    const order = [1, 2, 3, 4, 5]; order.splice(place - 1, 0, c.user);
    const rk = i => order.indexOf(i);
    c.results = c.fixtures.map(rd => rd.map(([h, a]) => (rk(h) < rk(a) ? { h, a, hs:20, as:0, ht:4, at:0 } : { h, a, hs:0, as:20, ht:0, at:4 })));
    c.round = 5;
  };
  K.setHistory([]);
  X.poolPick('eng'); D.pickTeam(X.ENGLAND[0]);
  finish(X.champ(), 1); D.renderHub();
  ok(/id="hub-euro"[^>]*>[\s\S]*Play European Cup/.test($('hub-next').innerHTML) && /id="hub-later"[^>]*>Not Now/.test($('hub-next').innerHTML), 'Bath win their league: Play European Cup, or Not Now');
  $('hub-later').click();
  ok(/id="hub-new"/.test($('hub-next').innerHTML) && X.champ().round === 5, 'Not Now: the final table and New Championship, as before');
  D.goHome(); X.setChamp(null);
  D.openTeams('champ'); X.poolPick('eng'); D.pickTeam(X.ENGLAND[0]); finish(X.champ(), 1); D.renderHub();
  const ch = X.champ();
  $('hub-euro').click();
  c = K.get();
  ok(X.champ() === null && K.history().filter(e => e.id === ch.id).length === 1 && K.history().at(-1).id === ch.id, 'Play European Cup: the league season in the cabinet, once');
  ok(c && c.id === 'euro' && c.teams[c.user].id === 'BTH' && !c.teams.some((t, i) => i !== c.user && listKey(t) === 'eng') && shown() === 's-cup' && $('cup-title').textContent === 'Semi-Final', 'then the European Cup as Bath, against the other three leagues\' winners');
  K.set(null);
  D.openTeams('champ'); X.poolPick('eng'); D.pickTeam(X.ENGLAND[0]); finish(X.champ(), 2); D.renderHub();
  ok(!/hub-euro/.test($('hub-next').innerHTML), 'second place: no offer');
  X.setChamp(null); D.openTeams('champ'); X.poolPick('sur'); D.pickTeam(X.CLUBS[0]); finish(X.champ(), 1); D.renderHub();
  ok(!/hub-euro/.test($('hub-next').innerHTML), 'Farnham win Surrey: no offer, Surrey is not a European league');
  X.setChamp(null); D.openTeams('champ'); X.poolPick('aus'); D.pickTeam(X.AUSTRALIA[0]); finish(X.champ(), 1); D.renderHub();
  ok(!/hub-euro/.test($('hub-next').innerHTML), 'nor Australia');
  X.setChamp(null); D.settings().cat = 'women'; D.openTeams('champ'); X.poolPick('rsa'); D.pickTeam(X.SOUTH_AFRICA[0]); finish(X.champ(), 1); D.renderHub(); $('hub-euro').click();
  c = K.get();
  ok(c.cat === 'women' && c.teams.every(t => / Women$/.test(t.name)), 'a women\'s league winner\'s European Cup is a women\'s');
  K.set(null); X.setChamp(null); D.settings().cat = 'men';
  // the Full Game gate: a cup under way stays saved, only locked
  const S = T.store;
  K.set(K.cupNew('tour', { user:K.cupTourSide('men') })); X.save();
  const kept = json(K.get());
  S.setTier('free'); D.goHome();
  $('b-champ').click();
  ok(!$('m-store').hidden && S.ui().feature === 'champ' && $('s-cup').hidden && json(K.get()) === kept, 'locked: Championship opens the Unlock card, and the cup stays saved');
  S.close(); S.setTier(null); D.goHome(); $('b-champ').click();
  ok($('m-store').hidden && shown() === 's-cup', 'unlocked, it goes back to the cup');
  K.set(null);
}

// 11. the shared files
{
  const src = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
  const order = JSON.parse(src('src/manifest.json'));
  ok(order.indexOf('cups.js') === order.indexOf('championship.js') + 1 && order.indexOf('ui-cups.js') === order.indexOf('ui-menus.js') + 1, 'cups.js after championship.js, ui-cups.js after ui-menus.js');
  ok(/^  cups:\{ CUPS, /m.test(src('src/boot.js')), 'the tests\' namespace, cups, on its own line in window.__tryline');
  ok(!/id="t-comp"/.test(src('index.html')) && /<div class="seg" id="hc-tier"><\/div>\s*<div class="hc-comps" id="hc-comps"><\/div>/.test(src('index.html')) && /<section class="screen" id="s-cup" hidden>/.test(src('index.html')), 'index.html: the competitions on the home (the team screen\'s row gone), and the cup hub');
  ok(/\/\* ===== cups ===== \*\//.test(src('styles.css')), 'styles.css: one block, under its heading');
  ok(!/#t-comp/.test(src('styles.css')) && /\.hc-comps\.n8\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)\}/.test(src('styles.css')), 'no competition row left on the team screen; the home\'s national leagues in two rows of four');
  ok(/^## Silverware$/m.test(src('README.md')), 'README: a Silverware section');
  const copyText = src('src/cups.js') + src('src/ui-cups.js');
  ok(!/\u2014/.test(copyText), 'no em dashes');
}

// 12. each kind's trophy shape where a cup draws one: the home's note for a cup under way, and the winner's card, each in its kind
//     (last, so its draws move nothing above; section 8 has the map, the page's rules and the stylesheet)
{
  K.setHistory([]); X.setChamp(null);
  const marks = [];
  for (const id of ['euro', 'world', 'tour']) {
    const c = K.cupNew(id, { user:id === 'tour' ? K.cupTourSide('men') : id === 'euro' ? X.ENGLAND[0] : nat('NZL') });
    K.set(c); D.settings().hl = 'champ'; D.goHome();
    const note = $('champ-note').innerHTML;
    for (let n = 0; n < 12 && !K.cupDone(c); n++) win(c);
    const card = K.winHtml(c, 'cc', 'New Championship');
    marks.push([id, note.startsWith(`<span class="cup-trophy" data-kind="${id}" data-metal="${K.trophyMetal(id)}" aria-hidden="true"></span>`),
      K.cupDone(c) && new RegExp(`<div class="cup-win mine" data-kind="${id}" data-metal="${K.trophyMetal(id)}">\\s*<span class="cup-trophy" data-kind="${id}" data-metal="${K.trophyMetal(id)}" aria-hidden="true"></span>`).test(card)]);
  }
  K.set(null); K.setHistory([]); D.settings().hl = 'game'; D.goHome();
  ok(marks.every(([, note, card]) => note && card), `the home's note and the winner's card each draw the cup's own trophy, by its kind, in its metal, hidden from a screen reader as before (${json(marks)})`);
}

await browserChecks();

console.log(`Cups: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;

// The trophies' shapes in a browser (Chromium, where Playwright is installed), at 844x390 and 667x375: the page's rules from the map;
// every kind's silhouette apart from every other's where it is drawn smallest (8.5px on the career's row with five kinds in two figures
// at 667x375, 10px in the Trophy Cabinet); each place drawing its kind's shape in its kind's metal (the career's row, the cabinet's
// tags and tally, the home's note for each cup under way, each cup's winner's card, the European Cup's trophy on the home's leagues and
// on Play European Cup); a trophy only for silverware held (a dot for an entry not won); and the career's row and the cabinet fitting
// (one line, nothing off the side, no taller with a trophy than without). SHOTS=<dir> writes shapes-*.png; NO_BROWSER=1 skips it.
async function browserChecks() {
  if (process.env.GAME || process.env.NO_BROWSER) { console.log('skip the browser checks (GAME or NO_BROWSER set)'); return; }
  const { createRequire } = await import('node:module'), { execFileSync } = await import('node:child_process'), { fileURLToPath } = await import('node:url');
  const http = await import('node:http'), path = await import('node:path');
  const require = createRequire(import.meta.url);
  let chrome = null;
  for (const from of [() => require('playwright'), () => require(path.join(execFileSync('npm', ['root', '-g'], { stdio:['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright'))]) {
    try { chrome = from().chromium; break; } catch (e) { /* not here */ }
  }
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
  const shots = process.env.SHOTS ? path.resolve(process.env.SHOTS) : null;
  if (shots) fs.mkdirSync(shots, { recursive:true });
  const frames = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  try {
    for (const [w, h] of [[844, 390], [667, 375]]) {
      const ctx = await browser.newContext({ viewport:{ width:w, height:h }, deviceScaleFactor:shots ? 3 : 1, isMobile:true, hasTouch:true, serviceWorkers:'block' });
      const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(s => { try { localStorage.setItem('tryline.v1', JSON.stringify(s)); } catch (e) { /* blocked */ } }, SAVE);
      await page.goto(base + 'index.html', { waitUntil:'load' }); await page.evaluate(() => document.fonts.ready);
      await page.evaluate(`window.__frames = ${frames.toString()}`);
      // the page's rules, once, from the map
      const css = await page.evaluate(() => { const s = document.querySelectorAll('style#trophy-shapes'); return { n:s.length, same:s.length === 1 && s[0].textContent === window.__tryline.cups.trophyShapeCss(), again:window.__tryline.cups.shapesOn() }; });
      ok(css.n === 1 && css.same && css.again === false, `${w}x${h}: the shapes' rules are on the page once, made from TROPHY_SHAPE (${json(css)})`);
      // every silhouette apart from every other, drawn at the sizes the screens use (8.5px at the career row's floor, 10px in the cabinet, 13px
      // on the home's note): of the pixels either covers, at least a quarter differ for every pair of kinds
      if (w === 844) {
        const apart = await page.evaluate(() => {
          const S = window.__tryline.cups.TROPHY_SHAPE, kinds = Object.keys(S), out = { worst:1, pair:'' };
          for (const px of [8.5, 10, 13]) {
            const n = Math.ceil(px), cover = {};
            for (const k of kinds) {
              const cv = document.createElement('canvas'); cv.width = cv.height = n; const g = cv.getContext('2d');
              g.scale(px / 24, px / 24); g.fill(new Path2D(S[k].d)); cover[k] = [...g.getImageData(0, 0, n, n).data].filter((v, i) => i % 4 === 3).map(a => a >= 128);
            }
            for (let i = 0; i < kinds.length; i++) for (let j = i + 1; j < kinds.length; j++) {
              const a = cover[kinds[i]], b = cover[kinds[j]]; let or = 0, xor = 0;
              for (let p = 0; p < a.length; p++) { if (a[p] || b[p]) or++; if (a[p] !== b[p]) xor++; }
              if (xor / or < out.worst) { out.worst = xor / or; out.pair = `${kinds[i]} and ${kinds[j]} at ${px}px`; }
            }
          }
          return out;
        });
        ok(apart.worst >= 0.25, `every kind's silhouette apart from every other's at 8.5, 10 and 13px (the closest pair, ${apart.pair}, differs in ${Math.round(apart.worst * 100)}% of its pixels)`);
      }
      // the career's row: five kinds in two figures, each its kind's shape in its metal, on one line
      const row = await page.evaluate(async () => {
        const T = window.__tryline, C = T.career, X = T.teams, K = T.cups;
        const cr = C.create({ name:'Alfie', pos:'B', num:7, club:X.NATIONAL.flat().find(t => t.id === 'BTH') }); C.set(cr); cr.year = 9;
        cr.trophies = [].concat(...C.KINDS.map(k => Array.from({ length:12 }, (_, i) => ({ kind:k, year:i + 1, name:'Bath' }))));
        C.open(); await window.__frames();
        const cab = document.querySelector('#cr-card .cr-cab'), cups = [...cab.querySelectorAll('.cr-cup')];
        return { kinds:cups.map(c => c.dataset.kind).join(), shape:cups.every(c => getComputedStyle(c.querySelector('i')).webkitMaskImage === K.trophyMask(c.dataset.kind) && getComputedStyle(c.querySelector('i')).maskImage === K.trophyMask(c.dataset.kind)),
          metal:cups.every(c => c.dataset.metal === K.trophyMetal(c.dataset.kind) && /linear-gradient/.test(getComputedStyle(c.querySelector('i')).backgroundImage)),
          labels:cups.map(c => c.getAttribute('aria-label')).join(' | '), fits:cab.scrollWidth <= cab.clientWidth + 0.5 && new Set(cups.map(c => Math.round(c.getBoundingClientRect().top))).size === 1,
          icon:Math.min(...cups.map(c => c.querySelector('i').getBoundingClientRect().width)), font:getComputedStyle(cab).fontSize, scroll:document.getElementById('s-career').scrollHeight - document.getElementById('s-career').clientHeight };
      });
      ok(row.kinds === 'league,euro,world,tour,triple' && row.shape && row.metal, `${w}x${h}: the career's row draws each kind's own shape in its metal (${row.kinds})`);
      ok(row.labels === 'League, 12 | European Cup, 12 | World Cup, 12 | Home Nations Tour, 12 | Triple Crown, 12', `${w}x${h}: each trophy's label as it was (${row.labels})`);
      ok(row.fits && row.icon >= 8.4 && row.scroll <= 1, `${w}x${h}: the row with five kinds in two figures fits on one line, the hub unscrolled, each trophy ${row.icon.toFixed(1)}px at ${row.font}`);
      if (shots) {
        await page.screenshot({ path:path.join(shots, `shapes-career-${w}x${h}.png`) });
        const b = await page.evaluate(() => { const r = document.querySelector('#cr-card .cr-cab').getBoundingClientRect(); return { x:Math.max(0, r.x - 8), y:Math.max(0, r.y - 8), width:r.width + 16, height:r.height + 16 }; });
        await page.screenshot({ path:path.join(shots, `shapes-career-row-${w}x${h}.png`), clip:b });
      }
      // the Trophy Cabinet: a Six Nations won (its title, Grand Slam and Triple Crown), each cup won, a World Cup and a league lost
      const cab = await page.evaluate(async () => {
        const T = window.__tryline, X = T.teams, K = T.cups;
        T.career.set(null); K.set(null); K.setHistory([]);
        const season = won => { X.newChamp(X.NATIONS[0], X.NATIONS.slice(1)); const c = X.champ(); for (let i = 0; i < 5; i++) { c.results.push(c.fixtures[i].map(([h, a]) => ({ h, a, hs:h === c.user ? (won ? 30 : 5) : 10, as:a === c.user ? (won ? 30 : 5) : 10, ht:2, at:2 }))); c.round++; } X.setChamp(c); X.save(); X.load(); X.setChamp(null); };
        const play = (c, won) => { for (let n = 0; n < 12 && !K.cupDone(c); n++) { const f = K.cupFixture(c); if (!f) break; const home = f.home === c.user, us = won ? 30 : 5, them = won ? 10 : 30; K.cupRecord(c, home ? { score:[us, them], tries:[4, 1] } : { score:[them, us], tries:[1, 4] }); } return c; };
        const nat = id => X.natList('men').find(t => t.id === id);
        season(false); season(true);
        K.retain(play(K.cupNew('euro', { user:X.ENGLAND[0] }), true));
        K.retain(play(K.cupNew('world', { user:nat('NZL') }), true));
        K.retain(play(K.cupNew('tour', { user:K.cupTourSide('men') }), true));
        K.retain(play(K.cupNew('world', { user:nat('SCO') }), false));
        T.debug.settings().hl = 'champ'; T.debug.goHome(); document.getElementById('b-cabinet').click(); await window.__frames();
        const s = document.getElementById('s-cabinet'), panel = document.getElementById('home-history'), pb = panel.getBoundingClientRect();
        const tags = [...s.querySelectorAll('.cup-kind, .ck')].map(e => { const b = getComputedStyle(e, '::before'), r = e.getBoundingClientRect(); return { cls:e.className, kind:e.dataset.kind, won:e.hasAttribute('data-won'), mask:b.webkitMaskImage, mask2:b.maskImage, content:b.content, round:b.borderRadius, h:r.height, top:r.top, right:r.right, left:r.left, metal:e.dataset.metal }; });
        const kinds = new Set(tags.filter(t => t.won).map(t => t.kind));
        return { shown:!s.hidden, over:s.scrollWidth - s.clientWidth, panelOver:panel.scrollWidth - panel.clientWidth, kinds:[...kinds].sort().join(),
          shape:tags.filter(t => t.won).every(t => t.mask === K.trophyMask(t.kind) && t.mask2 === K.trophyMask(t.kind) && t.metal === K.trophyMetal(t.kind)),
          dots:tags.filter(t => t.cls === 'cup-kind' && !t.won).map(t => t.kind + ' ' + (t.mask === 'none' && t.round === '50%' ? 'dot' : 'trophy')).join(),
          lost:tags.filter(t => !t.won).length,
          height:['cup-kind', 'ck'].map(c => tags.filter(t => t.cls === c)).every(g => g.every(t => Math.abs(t.h - g[0].h) < 0.5)),
          inside:tags.every(t => t.left >= pb.left - 0.5 && t.right <= pb.right + 0.5), tally:document.querySelector('#home-history .cabinet-tally').textContent };
      });
      ok(cab.shown && cab.kinds === 'euro,league,tour,triple,world' && cab.shape, `${w}x${h}: the Trophy Cabinet draws each kind won in its own shape and metal, the tags and the tally (${cab.kinds}; ${cab.tally})`);
      ok(cab.dots === 'world dot,league dot', `${w}x${h}: and only for silverware held: the World Cup and the league lost keep a dot (${cab.dots})`);
      ok(cab.over <= 0 && cab.panelOver <= 0 && cab.inside && cab.height, `${w}x${h}: the cabinet fits its width, every tag and count inside the panel, a tag no taller with its trophy than a dot's (${json([cab.over, cab.panelOver, cab.inside, cab.height])})`);
      if (shots) await page.screenshot({ path:path.join(shots, `shapes-cabinet-${w}x${h}.png`) });
      // the home's note for each cup under way, each cup's winner's card, and the European Cup's trophy on the leagues and its offer
      const cups = await page.evaluate(async () => {
        const T = window.__tryline, X = T.teams, K = T.cups, D = T.debug, out = [];
        const mask = el => (el ? getComputedStyle(el).webkitMaskImage : 'missing'), on = el => { const r = el.getBoundingClientRect(); return r.width >= 12 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; };
        const nat = id => X.natList('men').find(t => t.id === id);
        for (const id of ['euro', 'world', 'tour']) {
          const c = K.cupNew(id, { user:id === 'tour' ? K.cupTourSide('men') : id === 'euro' ? X.ENGLAND[0] : nat('NZL') });
          K.set(c); D.settings().hl = 'champ'; D.goHome(); await window.__frames();
          const n = document.querySelector('#champ-note .cup-trophy');
          out.push([id + ' note', mask(n) === K.trophyMask(id) && n.dataset.metal === K.trophyMetal(id) && on(n)]);
          for (let k = 0; k < 12 && !K.cupDone(c); k++) { const f = K.cupFixture(c); if (!f) break; const home = f.home === c.user; K.cupRecord(c, home ? { score:[30, 10], tries:[4, 1] } : { score:[10, 30], tries:[1, 4] }); }
          D.goHome(); document.getElementById('b-champ').click(); await window.__frames();
          const cw = document.querySelector('#cup-next .cup-win .cup-trophy');
          out.push([id + ' winner', !!cw && mask(cw) === K.trophyMask(id) && cw.dataset.metal === K.trophyMetal(id) && on(cw)]);
          K.set(null); K.setHistory([]);
        }
        T.home.setTier(1); D.settings().hl = 'champ'; D.goHome(); await window.__frames();   // National: each country's league
        const lg = document.querySelector('#hc-eng .cup-trophy');
        out.push(['league button', !!lg && mask(lg) === K.trophyMask('euro') && lg.getAttribute('aria-label') === 'European Cup' && on(lg)]);
        D.openTeams('champ'); X.poolPick('eng'); D.pickTeam(X.ENGLAND[0]);
        const c = X.champ(); c.results = c.fixtures.map(rd => rd.map(([h, a]) => ({ h, a, hs:h === c.user ? 30 : 10, as:a === c.user ? 30 : 10, ht:4, at:1 }))); c.round = 5; D.renderHub(); await window.__frames();
        const of = document.querySelector('#hub-euro .cup-trophy');
        out.push(['offer', !!of && mask(of) === K.trophyMask('euro')]);
        X.setChamp(null); K.setHistory([]); D.settings().hl = 'game'; D.goHome();
        return out;
      });
      ok(cups.length === 8 && cups.every(([, good]) => good), `${w}x${h}: each cup's own trophy in its shape and metal: the home's note, the winner's card, the leagues' European Cup and Play European Cup (${cups.filter(c => !c[1]).map(c => c[0]).join(', ') || 'all eight'})`);
      ok(!errors.length, `${w}x${h}: no page errors (${errors.join('; ')})`);
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
}
