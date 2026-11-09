// County cups: each Local club's level and county (src/competitions.js), the 'county' kind in the cups engine (src/cups.js: eight
// sides, Quarter-Finals to a Final, the cup named for its county and level), its screens' lines (src/ui-cups.js), the save, and the
// county phase of a Local club's career year (src/career.js). The research is docs/grassroots-competitions.md.
// node tools/county.mjs   Exits 1 on any failure.
process.env.SEED ??= '53';
const { T, reseed, rndCalls } = await import('./harness.mjs');
const C = T.career, X = T.teams, D = T.debug, K = T.cups, P = T.comp, $ = id => document.getElementById(id);
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const json = v => JSON.stringify(v);
const copy = v => JSON.parse(JSON.stringify(v));
const memory = {};
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; } };
const SCREENS = ['s-career-new', 's-career-club', 's-career', 's-career-train', 's-career-table', 's-career-end'];
{ const qsa = document.querySelectorAll;
  document.querySelectorAll = sel => (sel === '.screen' ? qsa(sel).concat(SCREENS.map(id => $(id))) : qsa(sel)); }
const club = id => X.CLUBS.find(t => t.id === id);
function finish(cr, place) {                          // the league finished, the user `place`, every game to the higher-placed side
  const c = cr.season, order = [1, 2, 3, 4, 5]; order.splice(place - 1, 0, c.user);
  const rk = i => order.indexOf(i);
  c.results = c.fixtures.map(rd => rd.map(([h, a]) => (rk(h) < rk(a) ? { h, a, hs:20, as:0, ht:4, at:0 } : { h, a, hs:0, as:20, ht:0, at:4 })));
  c.round = 5;
}
const full = (us, them) => { C.play(); T.M.half = 2; T.M.score = [us, them]; T.M.tries = [Math.floor(us/5), Math.floor(them/5)]; T.arcade.endHalf(); D.exitMatch(); };
// one of his ties, won (or lost) by 20 to 5, through the cup's own record: home side first, as cupRecord takes it
const tie = (c, win) => { const f = K.cupFixture(c), home = f.home === c.user, us = win ? 20 : 5, them = win ? 5 : 20; return K.cupRecord(c, home ? { score:[us, them], tries:[4, 1] } : { score:[them, us], tries:[1, 4] }); };

// 1. the clubs: a level and a county for every Local club, as the brief has them
{
  const want = { FAR:5, WIM:5, GUI:6, IRO:6, COB:7, WEY:7, ORU:7, HAS:9, KIN:9, ALD:9, GDN:11, QUI:11 };
  ok(X.CLUBS.every(t => P.CLUB_LEVEL[t.id] && P.CLUB_COUNTY[t.id]) && json(P.CLUB_LEVEL) === json(want), 'every Local club has its 2025-26 level (5 Regional 1 to 11 Counties 5) and a county');
  ok(X.CLUBS.filter(t => P.CLUB_COUNTY[t.id] === 'HAM').map(t => t.id).join() === 'ALD', 'Aldershot are Hampshire\'s; the rest Surrey\'s');
  const cups = Object.fromEntries(X.CLUBS.map(t => [t.id, P.cupFor(t).name]));
  ok(cups.FAR === 'Surrey Cup' && cups.WIM === 'Surrey Cup' && cups.GUI === 'Surrey Trophy' && cups.COB === 'Surrey Trophy' && cups.HAS === 'Surrey Shield' && cups.GDN === 'Surrey Bowl' && cups.QUI === 'Surrey Bowl' && cups.ALD === 'Hampshire Bowl',
    `each club's cup by its county and level (${Object.entries(cups).map(([k, v]) => k + ' ' + v).join(', ')})`);
  const made = { id:'ABC', name:'My Club', custom:true, kit:'#123456', trim:'#ffffff', pace:3, power:3, handling:3, kicking:3, stamina:3 };
  ok(P.countyOf(made) === null && /^County (Cup|Trophy|Shield|Bowl)$/.test(P.cupFor(made).name) && Number.isInteger(P.levelOf(made)), `a made club: no county, the plain table (${P.cupFor(made).name}), the level of the Local club nearest its rating`);
  ok(P.COUNTY_CUP_NAMES.every(n => !/Beaumont|Bill|Senior Vase|Twickenham/i.test(n)), 'plain cup names, never a person\'s or a sponsor\'s');
}

// 2. the cup: eight sides, his club first, three rounds
{
  reseed(11);
  const r0 = rndCalls(), far = K.cupNew('county', { user:club('FAR'), cat:'men', year:1 });
  ok(rndCalls() > r0, 'the draw is made in cupNew');
  ok(far && far.id === 'county' && far.name === 'Surrey Cup' && far.user === 0 && far.teams.length === 8 && far.teams[0].id === 'FAR', 'cupNew(\'county\'): Farnham in the Surrey Cup, first of eight');
  ok(new Set(far.teams.map(t => t.id)).size === 8 && far.teams.slice(1).every(t => X.CLUBS.some(k => k.id === t.id)), 'seven other Local clubs, none twice');
  const lv = far.teams.slice(1).map(t => P.CLUB_LEVEL[t.id]).sort((a, b) => a - b);
  ok(lv.join() === '5,6,6,7,7,7,9', `the seven nearest Farnham's level (${lv})`);
  ok(far.fixtures.length === 1 && far.fixtures[0].length === 4 && new Set(far.fixtures[0].flat()).size === 8, 'four Quarter-Final ties, each side once');
  const f = K.cupFixture(far);
  ok(f && f.label === 'Quarter-Final' && f.ko === true && K.cupLabel(far) === 'Quarter-Final', 'his first match: a Quarter-Final knockout');
  ok(K.cupTitle(far) === 'Surrey Cup' && K.line(far) === 'Win to reach the Semi-Finals', `the cup by its own name, the line under the title (${K.line(far)})`);
  const gdn = K.cupNew('county', { user:club('GDN'), cat:'women', year:2 });
  ok(gdn.name === 'Surrey Bowl' && gdn.teams.slice(1).every(t => / Women$/.test(t.name) && t.cat === 'women') && gdn.cat === 'women', 'Guildfordians Women: the Surrey Bowl, every other side named for the category (his own comes named, as every cup\'s does)');
  const ald = K.cupNew('county', { user:club('ALD'), cat:'men', year:1 });
  ok(ald.name === 'Hampshire Bowl', 'Aldershot: the Hampshire Bowl');
  // won through: Quarter-Final, Semi-Final, Final
  ok(tie(far, true) && K.cupFixture(far).label === 'Semi-Final' && far.fixtures[1].length === 2, 'through to the Semi-Finals: two ties, drawn from the winners');
  ok(K.verdict(far, 0).text === 'Through to the Semi-Finals', 'the result card: Through to the Semi-Finals');
  tie(far, true);
  ok(K.cupFixture(far).label === 'Final' && K.line(far) === 'Win the Surrey Cup', 'the Final: Win the Surrey Cup');
  tie(far, true);
  ok(K.cupDone(far) && K.cupWinner(far) === 0 && K.cupFinish(far) === 'Winners' && K.verdict(far, 2).text === 'Surrey Cup Winners', 'won: Surrey Cup Winners');
  ok(/data-kind="county" data-metal="silver"/.test(K.winHtml(far, 'x', 'Go')) && K.trophyMetal('county') === 'silver', 'the winner\'s card: a county cup\'s silver tankard');
  // out in the Quarter-Final: the rest of the cup is played for him
  const out = K.cupNew('county', { user:club('HAS'), cat:'men', year:1 });
  tie(out, false);
  ok(K.cupDone(out) && K.cupWinner(out) !== 0 && K.cupFixture(out) === null && K.cupFinish(out) === 'Quarter-Finalists', 'out in the Quarter-Final: the cup played out for him, Quarter-Finalists');
  ok(out.results.length === 3 && out.results.every(rd => rd.every(m => m.w === m.h || m.w === m.a)), 'every tie of the three rounds has a winner');
}

// 3. the save: kept at every stage, a name only from the cups' own list, a bad draw dropped
{
  reseed(12);
  const c = K.cupNew('county', { user:club('KIN'), cat:'men', year:3 });
  for (let k = 0; k < 4; k++) {
    const back = K.cleanCup(copy(c));
    ok(back && json(back) === json(c), `a county cup saves and loads, ${k} rounds played`);
    if (K.cupFixture(c)) tie(c, true);
  }
  ok(K.cleanCup({ ...copy(c), name:'Bill Beaumont Cup' }).name === 'County Cup', 'a name not on the list: the plain County Cup');
  const bad = copy(K.cupNew('county', { user:club('KIN'), cat:'men', year:3 })); bad.fixtures[0][1] = bad.fixtures[0][0].slice();
  ok(K.cleanCup(bad) === null, 'a side drawn twice: dropped');
  const short = copy(K.cupNew('county', { user:club('KIN'), cat:'men', year:3 })); short.teams.pop();
  ok(K.cleanCup(short) === null, 'seven sides: dropped');
  ok(K.cleanCupEntry({ kind:'county', cup:copy(c) }) && K.cleanCupEntry({ kind:'county', cup:copy(c) }).kind === 'county', 'a finished county cup is a Trophy Cabinet entry too');
}

// 4. a Local club's year: the league, then its county cup, then the window
{
  reseed(13); C.setCups(null);
  const cr = C.create({ pos:'B', num:5, club:club('FAR') }); C.set(cr);
  finish(cr, 2);
  let out = C.outcome(cr);
  ok(json(out.next) === json({ phase:'county', kind:'county' }), 'Farnham\'s league over: the county cup next');
  C.renderEnd();
  ok(/Surrey Cup/.test($('ce-body').innerHTML + $('ce-act').innerHTML), 'the screen between phases names it: Next, Surrey Cup');
  C.advance();
  ok(cr.phase === 'county' && cr.season === null && cr.cup && cr.cup.id === 'county' && cr.cup.name === 'Surrey Cup' && cr.cup.teams[0].id === 'FAR', 'Continue: Farnham in the Surrey Cup');
  ok(C.eyebrow(cr) === 'Surrey Cup · Quarter-Final' && C.ahead(cr).ko === true && C.drills(cr).length > 0, `the hub: ${C.eyebrow(cr)}, training before it`);
  ok(json(C.matchOpts(cr, C.ahead(cr))) === json({ cup:'county', cupKO:true }), 'a county cup match is the cups engine\'s knockout');
  const saved = C.clean(copy(cr));
  ok(saved.phase === 'county' && json(saved.cup) === json(cr.cup), 'saved in the county phase: loads with its cup');
  C.play();
  ok(T.M.career === true && T.M.cup === 'county' && T.M.cupKO === true && T.arcade.goldenOn(), 'Play Match: a knockout, the Golden Try if it ends level');
  T.M.half = 2; T.M.score = [25, 10]; T.M.tries = [5, 2]; T.arcade.endHalf();
  const card = $('br-pts').hidden ? '' : $('br-pts').textContent;
  ok(card === 'Through to the Semi-Finals', `the full-time card is the cup's line (${card})`);
  D.exitMatch();
  ok(C.ahead(cr).label === 'Semi-Final' && cr.totals.matches === 1, 'the Semi-Final next; the match counted');
  full(20, 5); full(20, 5);
  out = C.outcome(cr);
  ok(out.kind === 'county' && out.won && out.next.phase === 'transfer', 'Surrey Cup won; not rated for the window');
  C.renderEnd();
  ok($('ce-title').textContent === 'Winners' && /^Surrey Cup · /.test($('ce-eyebrow').textContent), `the screen: Winners, ${$('ce-eyebrow').textContent}`);
  C.advance();
  ok(cr.phase === 'transfer' && json(cr.trophies.map(t => [t.kind, t.name])) === json([['county', 'Surrey Cup']]), 'the Surrey Cup in his cabinet, by its name');
  C.sign(null); C.render();
  ok(/data-kind="county"[^>]*aria-label="County Cup, 1"/.test($('cr-card').innerHTML), 'the player card\'s row: a County Cup, 1');
  // a club out early, and a professional club
  const has = C.create({ pos:'F', num:2, club:club('HAS') }); C.set(has); finish(has, 5); C.advance();
  ok(has.cup.name === 'Surrey Shield', 'Haslemere: the Surrey Shield');
  full(5, 20);
  out = C.outcome(has);
  ok(out && !out.won && C.ahead(has) === null, 'out in the Quarter-Final');
  C.renderEnd(); ok($('ce-title').textContent === 'Quarter-Finalists', `the screen: ${$('ce-title').textContent}`);
  C.advance(); ok(has.trophies.length === 0 && has.phase === 'transfer', 'nothing banked, on to the window');
  const bath = C.create({ pos:'B', num:7, club:X.ENGLAND[0] }); C.set(bath); finish(bath, 3);
  ok(C.outcome(bath).next.phase !== 'county', 'Bath, a professional club: no county cup');
  // signed by a professional club: no county cup the next year
  const mover = C.create({ pos:'B', num:5, club:club('GUI') }); C.set(mover); finish(mover, 4); C.advance();
  while (C.ahead(mover)) full(5, 20);
  C.advance();
  ok(mover.phase === 'transfer' && mover.offers.length >= 2, 'Guildford: the cup, then the window');
  C.sign(mover.offers[0]); finish(mover, 3);
  ok(C.league(mover) !== 'sur' && C.outcome(mover).next.phase !== 'county', `signed for ${mover.club.name}: no county cup now`);
  // a save in the county phase whose cup cannot be kept: on to the window
  const lost = copy(cr); lost.phase = 'county'; lost.cup = { id:'county', teams:[] };
  const back = C.clean(lost);
  ok(back.phase === 'transfer' && back.cup === null, 'a county phase whose cup is broken: on to the window');
  C.set(null);
}

console.log(`County cups: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
