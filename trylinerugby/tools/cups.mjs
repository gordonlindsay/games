// County cups: where a club sits (src/competitions.js), the knockout and its Plate, a cup through a career, and the save.
// node tools/cups.mjs   Exits 1 on any failure.
process.env.SEED ??= '31';
const { T, reseed } = await import('./harness.mjs');
const C = T.career, X = T.teams, K = T.comp, D = T.debug, $ = id => document.getElementById(id);
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const json = v => JSON.stringify(v);
const memory = {};
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; } };
{ const qsa = document.querySelectorAll, mine = ['s-career-new', 's-career', 's-career-train', 's-career-table', 's-career-end'];
  document.querySelectorAll = sel => (sel === '.screen' ? qsa(sel).concat(mine.map(id => $(id))) : qsa(sel)); }
const club = id => [...X.CLUBS, ...X.COUNTIES].find(t => t.id === id);

// 1. every grassroots club's level, county and cup, against the brief's table
const TABLE = { FAR:[5, 'SUR', 'Surrey Cup'], WIM:[5, 'SUR', 'Surrey Cup'], GUI:[6, 'SUR', 'Surrey Trophy'], IRO:[6, 'SUR', 'Surrey Trophy'], COB:[7, 'SUR', 'Surrey Trophy'], WEY:[7, 'SUR', 'Surrey Trophy'], ORU:[7, 'SUR', 'Surrey Trophy'],
  HAS:[9, 'SUR', 'Surrey Shield'], KIN:[9, 'SUR', 'Surrey Shield'], EFF:[9, 'SUR', 'Surrey Shield'], ALD:[9, 'HAM', 'Hampshire Bowl'], GDN:[11, 'SUR', 'Surrey Bowl'], WAN:[11, 'SUR', 'Surrey Bowl'], EGH:[11, 'SUR', 'Surrey Bowl'], MER:[11, 'SUR', 'Surrey Bowl'], MIT:[11, 'SUR', 'Surrey Bowl'], FEL:[11, 'SUR', 'Surrey Bowl'] };
for (const [id, [level, county, cup]] of Object.entries(TABLE)) {
  const t = club(id);
  ok(K.levelOf(t) === level, `${id} is level ${level} (${K.levelOf(t)})`);
  ok(K.countyOf(t) === county, `${id} is in ${county} (${K.countyOf(t)})`);
  ok(K.cupFor(t).name === cup, `${id} enters the ${cup} (${K.cupFor(t).name})`);
}
ok(Object.keys(K.CLUB_COUNTY).sort().join() === Object.keys(TABLE).sort().join(), 'every club with a county is in the table');
ok(K.levelOf(club('HAR')) === 1 && K.cupFor(club('HAR')).name === 'County Cup', 'the top-flight side has no county here, and plays the plain table\'s top cup');
ok(K.levelOf(X.ENGLAND_TWO[0]) === 2, 'the second tier is level 2');
{ const made = { id:'ABC', name:'Mine', custom:true, kit:'#112233', trim:'#ffffff', pace:1, power:1, handling:1, kicking:1, stamina:1 };
  ok(K.countyOf(made) === null && K.levelOf(made) === 11 && K.cupFor(made).name === 'County Bowl', 'a team you made has no county, and its rating gives its level');
  const strong = { ...made, pace:4, power:4, handling:4, kicking:3, stamina:3 };
  ok(K.levelOf(strong) === 5 && K.cupFor(strong).name === 'County Cup', 'a strong team you made plays the top county cup'); }
for (const list of Object.values(K.COUNTY_CUPS)) ok(list[list.length - 1].to >= 11 && list.every((c, i) => !i || c.to > list[i - 1].to) && new Set(list.flatMap(c => [c.name, c.plate])).size === list.length*2, 'a county\'s cups run in order to the foot, with no name twice');

// 2. a draw: seven rivals, nearest your level, never you or the professional game
for (const id of Object.keys(TABLE)) {
  const t = club(id), r = K.rivals(t), ids = r.map(o => o.id);
  ok(r.length === 7 && new Set(ids).size === 7 && !ids.includes(id) && r.every(o => K.levelOf(o) > 2), `${id} draws seven grassroots rivals (${ids})`);
}
{ const r = K.rivals(club('GDN')), near = r.filter(o => K.levelOf(o) === 11).length;
  ok(near === 5, `Guildfordians meet the other five at their level first (${near})`); }

// 3. the knockout, by the tie-break and through every route
ok(K.cupWinner({ h:1, a:2, hs:10, as:5, ht:1, at:1 }) === 1 && K.cupWinner({ h:1, a:2, hs:5, as:10, ht:1, at:1 }) === 2, 'more points win');
ok(K.cupWinner({ h:1, a:2, hs:10, as:10, ht:2, at:1 }) === 1 && K.cupWinner({ h:1, a:2, hs:10, as:10, ht:1, at:2 }) === 2, 'level, more tries win');
ok(K.cupWinner({ h:1, a:2, hs:10, as:10, ht:1, at:1 }) === 2 && K.cupLoser({ h:1, a:2, hs:10, as:10, ht:1, at:1 }) === 1, 'level on those too, the away side goes through');
const sides = () => [club('GDN'), ...K.rivals(club('GDN'))].map(t => ({ ...t }));
const newCup = () => K.cupNew(K.cupFor(club('GDN')), sides());
const mineWith = (cup, win) => { const t = K.cupUserTie(cup), home = t.pair[0] === cup.user, [us, them] = win ? [20, 5] : [5, 20];
  return { t, r:{ h:t.pair[0], a:t.pair[1], hs:home ? us : them, as:home ? them : us, ht:home ? (win ? 4 : 1) : (win ? 1 : 4), at:home ? (win ? 1 : 4) : (win ? 4 : 1) } }; };
function run(plan) {            // plan: true to win each of your ties, false to lose; returns the cup and every line said
  const cup = newCup(), lines = [];
  for (const win of plan) { const { t, r } = mineWith(cup, win); K.cupPlayTie(cup, r); lines.push(K.cupTieLine(cup, r, t.plate)); }
  while (cup.tie < 3) { ok(!K.cupUserTie(cup), 'nobody plays on for you once you are out'); K.cupPlayTie(cup, null); }
  return { cup, lines };
}
for (let seed = 0; seed < 40; seed++) {
  reseed(seed + 400);
  const { cup } = run([true, true, true]);
  ok(cup.main.map(r => r.length).join() === '4,2,1' && cup.low.map(r => r.length).join() === '2,1', 'four, two and one, with two and one in the Plate');
  const all = cup.main[0].flatMap(r => [r.h, r.a]);
  ok(new Set(all).size === 8, 'all eight sides are in the first tie');
  ok(cup.low[0].flatMap(r => [r.h, r.a]).sort().join() === cup.main[0].map(K.cupLoser).sort().join(), 'the Plate is the four who lost the first tie');
  ok(cup.main[1].flatMap(r => [r.h, r.a]).every(i => cup.main[0].map(K.cupWinner).includes(i)), 'only winners go on');
  ok(json(K.cleanCup(JSON.parse(json(cup))).main) === json(cup.main), 'a finished cup survives its validator');
}
const ROUTES = [
  [[true, true, true], 'Winners', 'Surrey Bowl Winners', 'Surrey Bowl'],
  [[true, true, false], 'Final', 'Surrey Bowl Runners-Up', null],
  [[true, false], 'Semi-Final', 'Out of the Surrey Bowl', null],
  [[false, true, true], 'Plate Winners', 'Surrey Bowl Plate Winners', 'Surrey Bowl Plate'],
  [[false, true, false], 'Plate Final', 'Surrey Bowl Plate Runners-Up', null],
  [[false, false], 'Plate Semi-Final', 'Out of the Surrey Bowl Plate', null],
];
for (const [plan, result, last, trophy] of ROUTES) {
  const { cup, lines } = run(plan), end = lines[lines.length - 1];
  ok(K.cupResult(cup) === result, `route ${plan}: ${result} (${K.cupResult(cup)})`);
  ok(end.line === last && (end.trophy || null) === trophy, `route ${plan} ends "${last}" (${end.line})`);
}
ok(run([false, true, true]).lines[0].line === 'Into the Surrey Bowl Plate', 'losing the first tie says where you go');
{ const cup = newCup(), t = K.cupUserTie(cup), r = { h:t.pair[0], a:t.pair[1], hs:10, as:10, ht:1, at:1 };
  K.cupPlayTie(cup, r);
  ok(/^Level, Away Side Through · /.test(K.cupTieLine(cup, r, false).line), 'a tie settled by the away rule says so');
  const c2 = newCup(), t2 = K.cupUserTie(c2), home = t2.pair[0] === c2.user, r2 = { h:t2.pair[0], a:t2.pair[1], hs:10, as:10, ht:home ? 2 : 1, at:home ? 1 : 2 };
  K.cupPlayTie(c2, r2);
  ok(/^Level, Decided on Tries · Through/.test(K.cupTieLine(c2, r2, false).line), 'and one settled on tries says so'); }

// 4. the validator
{ const good = run([true, true, true]).cup, back = () => JSON.parse(json(good));
  const bad = [c => { c.teams.pop(); }, c => { c.tie = 2; }, c => { c.tie = 9; }, c => { c.draw[0] = c.draw[1]; }, c => { c.user = 1; }, c => { c.name = ''; }, c => { c.main[1][0].h = 99; }, c => { c.main[0][0].hs = -1; }, c => { c.low = []; }, c => { const r = c.main[0][0]; [r.h, r.a] = [r.a, r.h]; }, c => { c.main[2][0].h = c.main[0][0].h === c.main[2][0].h ? c.main[0][0].a : c.main[2][0].a; }];
  bad.forEach((f, i) => { const c = back(); f(c); ok(K.cleanCup(c) === null, `a broken cup is dropped (${i})`); });
  for (const v of [null, 3, [], 'x', {}]) ok(K.cleanCup(v) === null, `not a cup: ${json(v)}`); }

// 5. through a career
function atClub(id = 'GDN') { const cr = C.create({ name:'Sam', pos:'B', num:4, club:club(id), look:{ g:0 } }); cr.stage = 2; C.newSeason(cr); C.set(cr); return cr; }
function playOut(us, them, tries) {
  ok(C.play(), 'Play Match starts a match');
  const cupTie = !!T.M.careerCup;
  T.M.half = 2; T.M.score = [us, them]; T.M.tries = tries || [Math.floor(us/5), Math.floor(them/5)];
  if (us === them) { ok(cupTie === T.arcade.goldenOn(), 'sudden death is on for a cup tie and off for the league'); }
  T.M.golden = false;
  if (us === them && cupTie) { T.M.half = 3; }       // full time after extra time, still level
  T.arcade.endHalf();
  D.exitMatch();
  return cupTie;
}
{ const a = C.create({ name:'', pos:'B', num:4, club:club('GDN') });
  ok(!a.cup, 'Minis has no cup');
  C.set(a); a.season.round = 1;
  ok(!K.cupDue(a), 'and no tie falls due');
  a.stage = 1; C.newSeason(a); ok(!a.cup, 'nor do the Juniors'); }
{ const cr = atClub();
  ok(cr.cup && cr.cup.name === 'Surrey Bowl' && cr.cup.teams.length === 8 && cr.cup.teams[0].name === 'Guildfordians', 'Club at Guildfordians enters the Surrey Bowl');
  ok(cr.cup.teams.every(t => { const o = X.overallOf(t); return o >= 58 && o <= 64; }), 'every side in it is on the Club scale');
  ok(json(C.clean(JSON.parse(json(cr))).cup.teams) === json(cr.cup.teams), 'the sides survive the save');
  ok(!K.cupDue(cr), 'no tie before the first league round');
  const skills = json(cr.skills), order = [];
  for (let i = 0; i < 8; i++) { const before = cr.season.round, tie = playOut(40, 0, [8, 0]); order.push(tie ? 'cup' : 'league'); ok(tie ? cr.season.round === before : cr.season.round === before + 1, 'a cup tie leaves the league round alone'); if (tie) ok(C.last().kind === 'cup' && json(C.last().gains) === '{}', 'and gives no skill points'); }
  ok(order.join() === 'league,cup,league,league,cup,league,cup,league', `the order is league first, with ties after rounds 1, 3 and 4 (${order})`);
  ok(cr.cup.tie === 3 && K.cupResult(cr.cup) === 'Winners', 'win all three and the cup is yours');
  ok(cr.trophies && cr.trophies.length === 1 && cr.trophies[0].name === 'Surrey Bowl', 'and it goes in the trophies');
  ok(cr.totals.matches === 8, 'all eight count in the totals');
  ok(cr.season.round === 5 && C.outcome(cr).place >= 1, 'the season ends as a league season does');
  ok(json(C.clean(JSON.parse(json(cr))).trophies) === json(cr.trophies), 'trophies survive the save');
  const gained = C.overall(cr.skills) - C.overall(JSON.parse(skills));
  ok(gained >= 0, 'league deeds still count');
  C.renderEnd();
  ok(/Surrey Bowl: Winners/.test($('ce-body').innerHTML), 'the season\'s end says how the cup went');
  C.advance();
  ok(cr.stage === 3 && !cr.cup, 'Pro Club has no cup, and the old one is gone');
  ok(cr.trophies.length === 1, 'the trophy stays');
  cr.stage = 4; cr.country = 'ENG'; C.newSeason(cr); cr.season.round = 5;
  const c = cr.season; c.results = c.fixtures.map(rd => rd.map(([h, a]) => ({ h, a, hs:h === 0 ? 20 : 0, as:a === 0 ? 20 : 0, ht:0, at:0 })));
  C.renderEnd();
  ok(/Cups: Surrey Bowl/.test($('ce-body').innerHTML), 'the Hall of Fame lists it'); }
{ const cr = atClub('ALD');
  ok(cr.cup.name === 'Hampshire Bowl', 'Aldershot play for the Hampshire Bowl'); }
{ // lose the first tie, lose in the Plate: the draw finishes without you, and the league never waits
  const cr = atClub(), said = [];
  playOut(20, 0); playOut(0, 40, [0, 8]); said.push(C.last().line);
  ok(said[0] === 'Into the Surrey Bowl Plate' && K.cupUserTie(cr.cup).plate, 'lose the first tie and you are in the Plate');
  C.render();
  playOut(20, 0); playOut(20, 0);
  C.render();
  ok(/Plate Semi-Final$/.test($('cr-title').textContent), `the hub names the Plate tie (${$('cr-title').textContent})`);
  playOut(0, 40, [0, 8]); said.push(C.last().line);
  ok(said[1] === 'Out of the Surrey Bowl Plate' && !K.cupUserTie(cr.cup), 'lose again and you are out');
  playOut(20, 0);
  ok(cr.cup.tie === 3, `the rest of the draw has played by the last league round (${cr.cup.tie})`);
  playOut(20, 0);
  ok(cr.season.round === 5 && !cr.trophies, 'no trophy, and the season finishes');
  ok(K.cupResult(cr.cup) === 'Plate Semi-Final', 'and the cup says how far you got');
  C.render && C.renderTable(); ok(!$('cl-cup').hidden && /Surrey Bowl Final/.test($('cl-cup').innerHTML) && /Surrey Bowl Plate Final/.test($('cl-cup').innerHTML), 'the table screen shows both draws'); }
{ // a level tie through the real break card
  const cr = atClub();
  playOut(20, 0);
  const due = K.cupDue(cr), home = due.pair[0] === 0;
  playOut(10, 10, [1, 1]);
  ok(cr.cup.tie === 1, 'a level tie still has a winner');
  ok(C.last().line.startsWith('Level, Away Side Through'), `the line says how it was settled (${C.last().line})`);
  ok((K.cupUserTie(cr.cup).plate) === home, 'and the away rule decides it: at home you drop to the Plate, away you go through');
  ok($('br-pts').textContent === C.last().line && !$('br-pts').hidden, 'the full-time card says it, in place of table points'); }
{ // level at the hooter of a cup tie: sudden death, in the real path
  const cr = atClub();
  playOut(20, 0);
  ok(C.play() && T.M.careerCup, 'the tie starts');
  T.M.half = 2; T.M.score = [7, 7]; T.M.tries = [1, 1]; T.arcade.endHalf();
  ok(T.M.golden && T.M.half === 3 && !T.M.over, 'level at the hooter goes to sudden death');
  T.M.hooter = false; T.M.score = [12, 7]; T.M.tries = [2, 1]; T.arcade.endHalf();
  ok(T.M.over && cr.cup.tie === 1, 'and the end of it finishes the tie');
  D.exitMatch(); }
{ // a league match keeps its points on the card, and an old save with no cup plays on
  const cr = atClub();
  playOut(20, 0);
  ok(/Table Point/.test($('br-pts').textContent), 'a league match still shows its table points');
  const old = JSON.parse(json(cr)); delete old.cup; delete old.trophies;
  const back = C.clean(old);
  ok(back && !back.cup && !('trophies' in back), 'a save from before cups gains nothing');
  C.set(back);
  ok(!K.cupDue(back), 'and that season has no tie');
  const broken = C.clean({ ...JSON.parse(json(cr)), cup:{ name:'x' } });
  ok(broken && !broken.cup && broken.season, 'a broken cup is dropped, and the career is kept');
  ok(C.clean({ ...JSON.parse(json(cr)), trophies:[{ name:'<b>', season:1 }, { name:'', season:1 }, 3] }).trophies.length === 1, 'trophies are checked on the way in');
  const minis = C.create({ pos:'B', num:4, club:club('GDN') });
  ok(!C.clean({ ...JSON.parse(json(minis)), cup:cr.cup }).cup, 'a stage with no cup can\'t be given one by a save'); }
{ const esc = atClub(); C.set(esc); playOut(20, 0); esc.cup.teams[1].name = '<img>'; esc.cup.teams.forEach((t, i) => { if (i) t.name = '<img>'; }); playOut(20, 0); C.renderTable();
  ok(!/<img>/.test($('cl-cup').innerHTML), 'a side\'s name is escaped in the cup draw'); }

console.log(`Cups: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
