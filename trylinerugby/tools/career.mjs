// Career: club seasons. A rookie at any club, the year's phases (his club's league, the European Cup, the international window and
// the World Cup, the Home Nations Tour, the transfer window), call-ups, transfers and trophies, training and match deeds, the
// engine's career gate, championship isolation, the save (careers from before club seasons included) and the screens.
// The cup phases are the cups engine's (src/cups.js): without it they are skipped, which is checked here; with it they are
// checked against a stand-in that keeps to its contract (stubCups, through careerCups' hook), so this file needs no cups.
// node tools/career.mjs   Exits 1 on any failure.
process.env.SEED ??= '29';
const { T, reseed, rndCalls, bot } = await import('./harness.mjs');
const { readGameSource } = await import('./source.mjs');
const C = T.career, X = T.teams, D = T.debug, L = T.careerLife, $ = id => document.getElementById(id);
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const json = v => JSON.stringify(v);
const json2 = v => JSON.parse(JSON.stringify(v));   // a plain copy, as a save reads back
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };

// 0. Non-career matches are unchanged. The fingerprint below is these seeded matches on the commit before the career
//    (bc8fabf): two AI v AI matches, an arcade match you play and a plain one, both played by the harness's bot. Run first,
//    so nothing earlier in this file can move them. If another change moves non-career play on purpose, re-pin it from
//    that change's bundle without the career sources.
const BASE = '1o2r2g2 1uombq7 12cy4qs';   // re-pinned at the Stamina merge (the arcade match moved: Stamina acts in arcade matches), and again when the nations were rated on the XV hierarchy: England and Italy, in the two AI v AI matches, have new ratings; with their old ones put back the value is the earlier 1vg5qro, so the career still changes no non-career play
// re-pinned at the official XV tables: England, France and Italy (the AI v AI matches) re-rated; with the XV hierarchy's ratings put back the value is that commit's 18qgoe5
function fingerprint() {
  const out = [];
  reseed(23);
  out.push(json(T.simulate(2, 60, 1).map(r => [r.teams, r.score, r.tries, r.steps])));
  for (const [i, o] of [[0, { arcade:true, duels:'live' }], [1, { duels:'off' }]]) {
    reseed(100 + i);
    T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:1, headless:true, humans:[true, false], ...o });
    let n = 0; while (!T.M.over && n < 200000) { bot(0); T.update(T.STEP); n++; }
    out.push(json([T.M.score, T.M.tries, T.M.stats, n]));
  }
  return out.map(fnv).join(' ');
}
{ const now = fingerprint(); ok(now === BASE, `non-career matches play exactly as they did before the career (seeded fingerprint ${now}, pinned ${BASE})`); }

// the browser save, counted
const memory = {}; let writes = 0;
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; writes++; } };
const saved = () => JSON.parse(memory['tryline.v1']);
// the harness answers querySelectorAll('.screen') with its own list; the career's screens join it here, so showScreen toggles them
const SCREENS = ['s-career-new', 's-career-club', 's-career', 's-career-train', 's-career-table', 's-career-end'];
{ const qsa = document.querySelectorAll;
  document.querySelectorAll = sel => (sel === '.screen' ? qsa(sel).concat(SCREENS.map(id => $(id))) : qsa(sel)); }
const shown = () => ['s-home', ...SCREENS].find(id => !$(id).hidden);
const keys = C.skills().map(([k]) => k);
const ids = l => l.map(t => t.id).join();
// every game won by the higher-ranked side, the user ranked `place`: a finished season with a known table
function finish(cr, place) {
  const c = cr.season, order = [1, 2, 3, 4, 5]; order.splice(place - 1, 0, c.user);
  finishOrder(cr, order);
}
function finishOrder(cr, order) {                    // the season's six in finishing order, each beating everyone below it
  const c = cr.season, rk = i => order.indexOf(i);
  c.results = c.fixtures.map(rd => rd.map(([h, a]) => (rk(h) < rk(a) ? { h, a, hs:20, as:0, ht:4, at:0 } : { h, a, hs:0, as:20, ht:0, at:4 })));
  c.round = 5;
}
// a career match to full time through the real path: Play Match, then the hooter at the end of the second half
function playOut(us, them, deeds) {
  ok(C.play(), 'Play Match starts a career match');
  T.M.half = 2; T.M.score = [us, them]; T.M.tries = [Math.floor(us/5), Math.floor(them/5)];
  if (deeds) T.M.careerDeeds = { tries:0, tackles:0, goals:0, ...deeds };
  T.arcade.endHalf();
  D.exitMatch();
}
const skillsTo = (cr, v) => { for (const k of keys) cr.skills[k] = v; };
const overallAt = ovr => Math.ceil(1 + (ovr - 40.5)*98/59);   // the smallest skill (all five alike) that gives this overall, as careerOverall rounds it
// A stand-in for the cups engine, by its contract (career3-spec, Contracts 1): plain serialisable objects, his side at cup.user,
// his matches in order (cupFixture's home and away alternate, so a result is checked in the fixture's order), a knockout lost
// is the end, a tour goes to whoever wins two. log records every cupNew and cupRecord.
function stubCups() {
  const log = [];
  const S = {
    log,
    cupNew(id, o) {
      log.push(['new', id, o]);
      const labels = id === 'euro' ? ['Semi-Final', 'Final'] : id === 'world' ? ['Pool B', 'Pool B', 'Quarter-Final', 'Semi-Final', 'Final'] : ['Test 1 of 3', 'Test 2 of 3', 'Test 3 of 3'];
      const user = id === 'tour' ? { id:'HNT', name:'Home Nations', kit:'#c8102e', trim:'#f2efe6', pace:5, power:5, handling:5, kicking:5, stamina:3 } : o.user;
      const opps = id === 'euro' ? [X.FRANCE[0], X.CELTIC[0], X.SOUTH_AFRICA[0]] : id === 'tour' ? [X.natList(o.cat).find(t => t.id === 'NZL')] : X.natList(o.cat).filter(t => t.id !== o.user.id).slice(0, 4);
      return { id, user:0, teams:[user, ...opps].map(t => ({ ...t })), labels, results:[], won:0, lost:0 };
    },
    done:c => (c.id === 'tour' ? c.won >= 2 || c.lost >= 2 : c.lost > 0 || c.results.length >= c.labels.length),
    cupFixture(c) { if (S.done(c)) return null; const k = c.results.length, opp = 1 + (k % (c.teams.length - 1)), ko = !/^Pool/.test(c.labels[k]); return k % 2 ? { home:opp, away:c.user, label:c.labels[k], ko } : { home:c.user, away:opp, label:c.labels[k], ko }; },   // ko: a knockout or a Test, never a pool match
    cupRecord(c, r) { log.push(['record', c.id, r]); const f = S.cupFixture(c), h = f.home === c.user, us = h ? r.score[0] : r.score[1], them = h ? r.score[1] : r.score[0]; c.results.push([us, them]); if (us > them) c.won++; else c.lost++; },
    cupWinner:c => (S.done(c) ? ((c.id === 'tour' ? c.won >= 2 : c.lost === 0) ? c.user : 1) : -1),
    cupLabel(c) { const f = S.cupFixture(c); return f ? f.label : ''; },
    cleanCup:c => (c && typeof c === 'object' && Array.isArray(c.teams) && ['euro', 'world', 'tour'].includes(c.id) ? json2(c) : null),
    cupTriple:null,
  };
  return S;
}
// the Locker's medals: its own lockerEvent once it is in the build, else a stand-in here that counts them
const LOCKER = /function lockerEvent\b/.test(readGameSource()), medals = [];
const CUPS_ENGINE = /function cupNew\b/.test(readGameSource());   // the real cups engine (src/cups.js) in this build: section 3c plays it
if (!LOCKER) globalThis.lockerEvent = id => medals.push(id);
C.setCups(false);                                    // no cups unless a section brings its stand-in

// 1. a new player
{
  ok(keys.includes('stamina') && keys.slice(0, 4).join() === 'pace,power,handling,kicking', `the player's skills are the team abilities plus Stamina (${keys})`);
  ok(C.create({ pos:'B', num:4 }) === null, 'a player needs a club');
  const a = C.create({ name:'  Alfie<script>123 ', pos:'F', num:2, club:X.CLUBS[0] });
  ok(a && a.name === 'Alfiescript' && a.pos === 'F' && a.num === 2, `the name keeps letters only (${a && a.name})`);
  ok(C.create({ name:'Maximilianotheodore', pos:'B', num:5, club:X.CLUBS[0] }).name.length === 12, 'a name is at most 12 letters');
  ok(C.create({ name:'', pos:'B', num:7, club:X.CLUBS[0] }).name === '', 'the name is optional');
  ok(C.create({ pos:'F', num:5, club:X.CLUBS[0] }).num === 1 && C.create({ pos:'B', num:2, club:X.CLUBS[0] }).num === 4, 'forwards wear 1 to 3, backs 4 to 7');
  ok(C.create({ pos:'Prop', num:9, club:X.CLUBS[0] }).pos === 'B', 'an unknown position is a back');
  ok(keys.every(k => Number.isInteger(a.skills[k]) && a.skills[k] >= 1 && a.skills[k] <= 99), 'every skill is 1 to 99');
  const o = C.overall(a.skills);
  ok(o >= 58 && o <= 64, `a new player is a rookie, about 61 overall (${o})`);
  ok(C.overall(Object.fromEntries(keys.map(k => [k, 1]))) === 40 && C.overall(Object.fromEntries(keys.map(k => [k, 99]))) === 99, 'the overall runs 40 to 99, like the team cards');
  const mine = { id:'MYT', name:'My Town', kit:'#c8102e', trim:'#f2efe6', custom:true, key:'my1', pace:5, power:5, handling:3, kicking:1 };
  const rookies = [X.CLUBS[0], X.ENGLAND[0], X.SCOTLAND[9], X.FRANCE[0], mine].map(club => C.create({ pos:'B', num:5, club }));
  ok(rookies.every(r => json(r.skills) === json(rookies[0].skills)), 'a rookie whatever the club: Farnham, Bath, Selkirk, Toulouse and a team you made all start with the same skills');
  const c = a.season;
  ok(a.year === 1 && a.phase === 'league' && c && c.round === 0 && c.user === 0 && c.teams.length === 6 && c.fixtures.length === 5, 'a career starts in year 1 at its club\'s league: six sides, five rounds');
  ok(c.fixtures.every(rd => rd.length === 3 && rd.filter(p => p.includes(0)).length === 1), 'your side plays once a round');
  ok(new Set(c.fixtures.map(rd => rd.find(p => p.includes(0)).find(i => i))).size === 5, 'and everyone else once');
  ok(a.cup === null && a.offers === null && a.country === null && json(a.trophies) === '[]' && json(a.history) === '[]', 'no cup, no offers, no country and no trophies yet');
  ok(json(C.clean(a)) === json(a), 'a new career passes its own validator unchanged');
  ok(C.PHASES.join() === 'league,cup,intl,tour,transfer', 'a year\'s phases, in order: the league, the European Cup, the international window, the tour, the transfer window');
}

// 2. his club's league, and his country's six
{
  const same = (t, base) => ['pace', 'power', 'handling', 'kicking', 'stamina'].every(k => t[k] === base[k]) && t.id === base.id && t.name === base.name;
  const FAR = X.CLUBS[0], cr = C.create({ pos:'B', num:4, club:FAR });
  ok(cr.league === 'sur' && C.league(cr) === 'sur' && same(C.teamFor(cr), FAR), 'Farnham: his club at full strength, in Local · Surrey');
  const opp = cr.season.teams.slice(1);
  ok(opp.length === 5 && opp.every(t => same(t, X.CLUBS.find(k => k.id === t.id))) && !opp.some(t => t.id === 'FAR'), 'against five other Local clubs, at full strength');
  for (const [id, list, key] of [['BTH', X.ENGLAND, 'eng'], ['GLA', X.CELTIC, 'cel'], ['AYR', X.SCOTLAND, 'sco'], ['AKL', X.NEW_ZEALAND, 'nzl'], ['KOB', X.JAPAN, 'jpn'], ['TLS', X.FRANCE, 'fra'], ['ADL', X.AUSTRALIA, 'aus'], ['PRE', X.SOUTH_AFRICA, 'rsa']]) {
    const p = C.create({ pos:'B', num:5, club:list.find(t => t.id === id), league:'sur' }), five = p.season.teams.slice(1);
    ok(p.league === key && C.teamFor(p).id === id && five.length === 5 && five.every(t => list.some(a => a.id === t.id && same(t, a)) && t.id !== id), `${id}: a year in its own league (${key}), against five others from it, whatever list it says it was picked on`);
  }
  // a team you made: the list it was picked on is its league; anything else is Local
  const made = { id:'MYT', name:'My Town', kit:'#c8102e', trim:'#f2efe6', custom:true, key:'my1', pace:5, power:5, handling:3, kicking:1, stamina:3 };
  const onFra = C.create({ pos:'F', num:3, club:made, league:'fra' });
  ok(onFra.league === 'fra' && onFra.season.teams[0].name === 'My Town' && onFra.season.teams[0].kicking === 1 && onFra.season.teams.slice(1).every(t => X.FRANCE.some(f => f.id === t.id)), 'a team you made, picked on National · France, plays the Top 14');
  ok(['sur', undefined, 'int', 'nope'].every(k => C.create({ pos:'F', num:3, club:made, league:k }).league === 'sur'), 'picked on Local, or on no list it can play (International, a bad key): Local · Surrey');
  // My League: an imported club plays its own league's sides, while the league is saved
  const league = { teams:[0, 1, 2, 3, 4, 5].map(i => ({ id:'IM' + 'ABCDEF'[i], name:'Import ' + 'ABCDEF'[i], kit:'#123456', trim:'#abcdef', pace:3, power:3, handling:3, kicking:3, stamina:3 })) };
  T.importer.setLeague(league);
  const imp = C.create({ pos:'B', num:5, club:{ ...league.teams[0], custom:true, key:'my0' }, league:'my' });
  ok(imp.league === 'my' && C.league(imp) === 'my' && imp.season.teams.slice(1).every(t => /^Import [B-F]$/.test(t.name)), `an imported club on My League plays the rest of it (${imp.season.teams.slice(1).map(t => t.name).join(', ')})`);
  T.importer.setLeague(null);
  ok(C.league(imp) === 'sur' && C.opponents(imp).every(t => X.CLUBS.some(k => k.id === t.id)), 'with the league removed, Local');
  // International: his country's six in the category's twelve
  ok(C.teamFor({ ...cr, country:'WAL' }, 'intl').name === 'Wales' && ids(C.opponents({ ...cr, country:'WAL' }, 'intl')) === 'IRE,FRA,ENG,SCO,ITA', 'International: Wales against the other five of the Six Nations, in the table\'s order');
  ok(ids(C.opponents({ ...cr, country:'NZL' }, 'intl')) === 'RSA,AUS,ARG,FIJ,JPN', 'New Zealand against the other five of the second six');
  const all = [...X.NATIONAL.flat().map(club => C.create({ pos:'B', num:5, club })).flatMap(p => p.season.teams), ...X.NAT_MEN.flatMap(id => [C.teamFor({ ...cr, country:id }, 'intl'), ...C.opponents({ ...cr, country:id }, 'intl')])];
  ok(all.every(t => ['pace', 'power', 'handling', 'kicking', 'stamina'].every(k => Number.isInteger(t[k]) && t[k] >= 1 && t[k] <= 5)), 'every side in every league and every six keeps whole abilities from 1 to 5');
  // a Legends side in the list (the Locker's, once unlocked) is never his country or an opponent he did not pick
  const men = X.natList('men'); men.push({ id:'LGD', name:'Legends', kit:'#111111', trim:'#ffffff', pace:5, power:5, handling:5, kicking:5, stamina:5, legend:true });
  ok(!C.nations('men').some(t => t.legend) && C.nations('men').length === 12 && !C.opponents({ ...cr, country:'NZL' }, 'intl').some(t => t.legend), 'a Legends side is never in the call-up\'s twelve or a country\'s six');
  men.pop();
}

// 2b. Men | Women
{
  const FAR = X.CLUBS[0], men = C.create({ pos:'B', num:4, club:FAR }), women = C.create({ pos:'B', num:4, club:FAR, cat:'women' });
  ok(men.cat === 'men' && C.create({ pos:'B', num:4, club:FAR, cat:'minis' }).cat === 'men' && C.create({ pos:'B', num:4, club:FAR, cat:'x' }).cat === 'men', 'Men unless Women is picked: Career has no Minis');
  ok(women.cat === 'women' && women.season.teams.every(t => t.cat === 'women' && / Women$/.test(t.name)) && women.season.teams[0].name === 'Farnham Women', `a women's career names every side for it (${women.season.teams.map(t => t.name).join(', ')})`);
  ok(men.season.teams.every(t => !('cat' in t) && !/ Women$/.test(t.name)), 'a men\'s career is named as before');
  const R = ['pace', 'power', 'handling', 'kicking', 'stamina'], same = (a, b) => R.every(k => a[k] === b[k]) && a.id === b.id && a.kit === b.kit;
  ok(X.NATIONAL.flat().every(club => same(C.teamFor({ ...women, club }, 'league'), C.teamFor({ ...men, club }, 'league'))), 'clubs are rated the same for Men and Women: ratings, codes and kits are the men\'s');
  const engW = X.natList('women').find(t => t.id === 'ENG'), wNat = C.teamFor({ ...women, country:'ENG' }, 'intl');
  ok(same(wNat, engW) && wNat.name === 'England Women' && !same(wNat, C.teamFor({ ...men, country:'ENG' }, 'intl')) && C.opponents({ ...women, country:'ENG' }, 'intl').every(t => { const o = X.natList('women').find(n => n.id === t.id); return o && same(t, o) && t.cat === 'women'; }), 'International on Women: England Women and the other five at the women\'s ratings, not the men\'s');
  ok(C.teamFor({ ...women, country:'FIJ' }, 'intl').name === 'Fiji Women', 'the nations too');
  ok(C.clean({ ...json2(men), cat:undefined }).cat === 'men' && C.clean(json2(women)).cat === 'women' && C.clean({ ...json2(women), cat:'minis' }).cat === 'men', 'the save keeps Women; a career from before it, or a bad value, is Men');
  ok(C.clean(json2(women)).season.teams[0].cat === 'women', 'a saved season keeps its names and category');
  ok(ids(C.opponents({ ...women, country:'NZL' }, 'intl')) === 'CDN,USA,AUS,RSA,FIJ' && ids(C.opponents({ ...women, country:'WAL' }, 'intl')) === 'ENG,FRA,IRE,ITA,SCO', 'Women: New Zealand plays Canada, the USA, Australia, South Africa and Fiji; Wales the Six Nations');
  const intl = (cr, country) => C.clean({ ...json2(cr), phase:'intl', season:null, country }).country;
  ok(intl(women, 'CDN') === 'CDN' && intl(men, 'CDN') === 'ENG' && intl(women, 'JPN') === 'ENG' && intl(men, 'JPN') === 'JPN', 'Canada is a women\'s country only, Japan a men\'s; in the window a bad one is England');
  const call = (cat, pick) => { const p = C.create({ pos:'B', num:6, club:FAR, cat }); C.set(p); skillsTo(p, overallAt(C.CALL.bar)); finish(p, 3); C.advance(pick); return p; };
  const cw = call('women', 'USA');
  ok(cw.phase === 'intl' && cw.country === 'USA' && cw.season.teams[0].name === 'USA Women' && ids(cw.season.teams.slice().sort((a, b) => (a.id < b.id ? -1 : 1))) === 'AUS,CDN,FIJ,NZL,RSA,USA', 'a women\'s call-up to the USA: the USA against New Zealand, Canada, Australia, South Africa and Fiji');
  const cm = call('men', 'USA');
  ok(cm.phase === 'intl' && cm.country === 'ENG', 'a men\'s call-up cannot be the USA: England');
  const ca = call('men', 'ARG');
  ok(ca.country === 'ARG' && ca.season.teams[0].name === 'Argentina' && ca.season.teams.length === 6, 'picking Argentina starts the window as Argentina');
  C.set(null);
}

// 3. the year, without the cups engine: the league, the international window, the transfer window
{
  medals.length = 0;
  const FAR = X.CLUBS[0], cr = C.create({ pos:'B', num:6, club:FAR }); C.set(cr);
  ok(C.ahead(cr).label === 'Round 1 of 5' && C.outcome(cr) === null && !C.advance() && !C.sign('BTH'), 'mid-season there is no outcome, nothing to advance and no window');
  finish(cr, 3);
  let out = C.outcome(cr);
  ok(C.ahead(cr) === null && out.kind === 'league' && out.place === 3 && !out.won && out.next.phase === 'transfer', `third, a rookie: the transfer window next (${json(out.next)})`);
  const firstId = cr.season.id, w0 = writes;
  ok(C.advance() && cr.phase === 'transfer' && cr.season === null && cr.cup === null && writes > w0, 'Continue: the transfer window, saved');
  ok(cr.history.length === 1 && json(cr.history[0]) === json({ year:1, kind:'league', name:'Farnham', place:3, w:3, d:0, l:2 }) && json(cr.trophies) === '[]', 'the year\'s league into his history; third wins nothing');
  ok(Array.isArray(cr.offers) && cr.offers.length >= 2 && cr.offers.length <= 3 && cr.offers.every(id => X.NATIONAL.flat().some(t => t.id === id)) && new Set(cr.offers).size === cr.offers.length, `two or three offers, every one a club from the national lists (${cr.offers})`);
  ok(!C.advance() && C.outcome(cr) === null, 'the window is not Continue: an offer or Stay');
  // Stay
  ok(C.sign(null) && cr.year === 2 && cr.phase === 'league' && cr.club.id === 'FAR' && cr.league === 'sur' && cr.offers === null && cr.season.round === 0 && cr.season.id !== firstId && cr.season.teams[0].id === 'FAR', 'Stay: year 2 at Farnham, a new league season');
  ok(!C.sign(null) && cr.year === 2, 'and only in the window');
  // a title
  finish(cr, 1); out = C.outcome(cr);
  ok(out.won && out.place === 1 && out.next.phase === 'transfer', 'Farnham win the league: Surrey has no European Cup, and he is not rated for a call-up');
  C.advance();
  ok(json(cr.trophies) === json([{ kind:'league', year:2, name:'Farnham' }]), 'the title is his first trophy');
  // a transfer
  const offer = cr.offers[0], to = X.NATIONAL.flat().find(t => t.id === offer), list = X.TEAM_LISTS.find(l => l.teams.includes(to));
  ok(C.sign(offer) && cr.year === 3 && cr.club.id === offer && cr.league === list.key && cr.season.teams[0].id === offer && cr.season.teams.slice(1).every(t => list.teams.some(o => o.id === t.id && o.id !== offer)), `an offer taken: year 3 at ${to.name}, in its own league (${list.key})`);
  ok(LOCKER || medals.join() === 'transfer', `the Locker hears of the transfer (${medals})`);
  finish(cr, 4); C.advance();
  const mine = cr.club.id;
  ok(C.sign('ZZZ') && cr.club.id === mine && cr.year === 4, 'an id that was not offered is Stay');
  // the call-up: the overall at the bar at the end of the league
  medals.length = 0;
  skillsTo(cr, overallAt(C.CALL.bar));
  finish(cr, 2); out = C.outcome(cr);
  ok(C.CALL.bar === 80 && C.overall(cr.skills) === 80 && out.next.phase === 'intl' && out.next.kind === 'six' && out.next.first, `at overall ${C.CALL.bar}: called up, his first (${json(out.next)})`);
  ok(C.advance('WAL') && cr.phase === 'intl' && cr.country === 'WAL' && cr.season.teams[0].name === 'Wales' && ids(cr.season.teams.slice(1)) === 'IRE,FRA,ENG,SCO,ITA' && cr.club.id === mine, 'picking Wales: the window is Wales\'s Six Nations, a year 4 with no World Cup in the build (no cups engine), his club kept');
  ok(LOCKER || medals.join() === 'callup', `the Locker hears of his first call-up (${medals})`);
  ok(C.ahead(cr).label === 'Round 1 of 5' && C.drills(cr).length > 0 && !cr.trained, 'a full international season: five rounds, training as in the league');
  finish(cr, 1); out = C.outcome(cr);
  ok(out.kind === 'intl' && out.won && out.next.phase === 'transfer', 'the Six Nations won; no tour in a year 4, and none without the cups engine');
  C.advance();
  ok(cr.history.length === 5 && cr.history[4].kind === 'intl' && cr.history[4].name === 'Wales' && cr.trophies.filter(t => t.kind === 'league').length === 2 && cr.trophies.at(-1).name === 'Wales', 'the window into his history; his country\'s title a trophy');
  C.sign(null);
  // the next year: the same country, no picker; a Triple Crown
  medals.length = 0;
  finish(cr, 5); out = C.outcome(cr);
  ok(cr.year === 5 && out.next.phase === 'intl' && !out.next.first, 'year 5, still rated: called up again, no picker');
  C.advance('FRA');
  ok(cr.country === 'WAL' && medals.length === 0, 'his country is kept, and a later call-up is no medal');
  const T6 = cr.season.teams, at = id => T6.findIndex(t => t.id === id);
  finishOrder(cr, [at('FRA'), 0, at('IRE'), at('ENG'), at('SCO'), at('ITA')]);   // France first; Wales second, beating Ireland, England and Scotland
  out = C.outcome(cr);
  ok(out.place === 2 && out.triple && !out.won, 'second, but Wales beat the other three home nations: the Triple Crown');
  C.renderEnd();
  ok($('ce-title').textContent === 'Triple Crown' && $('ce-title').classList.contains('gold'), 'the screen says so');
  C.advance();
  ok(cr.trophies.at(-1).kind === 'triple' && cr.trophies.at(-1).name === 'Wales' && cr.trophies.at(-1).year === 5, 'and it is in his cabinet');
  ok(LOCKER || medals.join() === 'triple', `and the Locker hears of it, once, as it is banked (${medals})`);
  // the transfer offers, measured
  const target = C.target;
  ok(target(61) === 61 && target(99) === 75 && target(40) === 61 && Math.abs(target(80) - 68) < 1e-9 && Math.abs(target(70) - (61 + 9*14/38)) < 1e-9, 'his overall 61 to 99 maps onto the clubs\' 61 to 75, linearly and capped');
  const near = [], counts = new Set();
  let leaguesMixed = 0, draws = 0, own = 0, sorted = true;
  for (const ovr of [61, 66, 72, 80, 88, 95, 99]) for (const club of [X.CLUBS[0], X.ENGLAND[0], X.SCOTLAND[0]]) for (let i = 0; i < 20; i++) {
    const p = C.create({ pos:'B', num:5, club }); skillsTo(p, overallAt(ovr));
    const got = C.offers(p).map(id => X.NATIONAL.flat().find(t => t.id === id));
    draws++; counts.add(got.length);
    if (got.some(t => t.id === club.id)) own++;
    near.push(Math.max(...got.map(t => Math.abs(X.overallOf(t) - target(C.overall(p.skills))))));
    const far = Math.max(...got.map(t => Math.abs(X.overallOf(t) - target(C.overall(p.skills))))), lists = t => X.TEAM_LISTS.find(l => l.teams.includes(t)).key;
    const could = new Set(X.NATIONAL.flat().filter(t => t.id !== club.id && Math.abs(X.overallOf(t) - target(C.overall(p.skills))) <= far).map(lists)).size;
    if (new Set(got.map(lists)).size === Math.min(got.length, could)) leaguesMixed++;   // as many leagues as the band holds
    if (got.some((t, j) => j && X.overallOf(t) > X.overallOf(got[j - 1]))) sorted = false;
  }
  ok(own === 0 && [...counts].sort().join() === '2,3', `two or three offers (${[...counts]}), never his own club (${own} of ${draws})`);
  ok(Math.max(...near) <= 3, `every offer within the band of his target, widened until there are two (furthest ${Math.max(...near).toFixed(2)})`);
  ok(leaguesMixed === draws && sorted, `from different leagues wherever the band has them (${leaguesMixed} of ${draws} draws), best first`);
  const r0 = rndCalls(); C.offers(cr); ok(rndCalls() > r0, 'the offers are a draw, made as the window opens');
  C.set(null);
}

// 3b. the year with the cups engine (a stand-in by its contract): the European Cup, the World Cup and the Home Nations Tour
{
  const S = stubCups(); C.setCups(S); medals.length = 0;
  const bath = C.create({ pos:'B', num:7, club:X.ENGLAND[0] }); C.set(bath); bath.year = 2;
  finish(bath, 1); let out = C.outcome(bath);
  ok(out.won && json(out.next) === json({ phase:'cup', kind:'euro' }), 'Bath win England: the European Cup next');
  C.advance();
  const made = S.log.at(-1);
  ok(bath.phase === 'cup' && bath.season === null && bath.cup && bath.cup.id === 'euro' && made[1] === 'euro' && made[2].user.id === 'BTH' && made[2].cat === 'men' && made[2].list === 'eng' && made[2].year === 2, `cupNew('euro', { user:Bath, cat, list:'eng', year })`);
  ok(bath.trophies.length === 1 && bath.trophies[0].kind === 'league', 'the league title banked first');
  ok(C.ahead(bath).label === 'Semi-Final' && C.eyebrow(bath) === 'European Cup · Semi-Final' && !L.dilemma(bath) && C.drills(bath).length > 0 && !bath.trained, 'the hub: European Cup · Semi-Final, training before it, no dilemma');
  ok(C.ahead(bath).ko === true && json(C.matchOpts(bath, C.ahead(bath))) === json({ cup:'euro', cupKO:true }), 'a cup match hands startMatch the cup and that it is a knockout (cupKO), as Championship mode\'s cup matches do');
  ok(C.play() && T.M.career === true && T.M.nat[0].id === 'BTH' && T.M.nat[1].id === 'TLS' && (CUPS_ENGINE ? T.M.cup === 'euro' && T.M.cupKO === true : !('cup' in T.M)), `Play Match: a career match; the cup's id and cupKO on it are newMatch's (the cups engine's), never set by the career (${CUPS_ENGINE ? 'cups in the build' : 'no cups in the build'})`);
  T.M.half = 2; T.M.score = [17, 5]; T.M.tries = [3, 1]; T.M.careerDeeds = { tries:1, tackles:0, goals:0 }; T.arcade.endHalf();
  const cardIn = T.M.cupResultDone === true; D.exitMatch();
  ok(json(S.log.at(-1)) === json(['record', 'euro', { score:[17, 5], tries:[3, 1] }]) && bath.cup.results.length === 1 && bath.totals.matches === 1 && C.last().gains.pace === 1, 'full time: into the cup in the fixture\'s order (his side at home), the deeds into his skills');
  ok(cardIn, 'and the result is in for the full-time card (M.cupResultDone), which reads the cup\'s line in place of table points');
  ok(C.ahead(bath).label === 'Final' && C.ahead(bath).home !== 0, 'the Final, away');
  C.play(); T.M.half = 2; T.M.score = [22, 12]; T.M.tries = [4, 2]; T.arcade.endHalf(); D.exitMatch();
  ok(json(S.log.at(-1)[2]) === json({ score:[12, 22], tries:[2, 4] }) && bath.cup.won === 2, 'away: the result handed over home side first');
  out = C.outcome(bath);
  ok(out.kind === 'euro' && out.won && out.next.phase === 'transfer', 'European Cup won; not rated for the window');
  C.renderEnd();
  ok($('ce-title').textContent === 'Winners' && $('ce-eyebrow').textContent === 'European Cup · Year 2', 'the screen: Winners');
  C.advance();
  ok(bath.trophies.map(t => t.kind).join() === 'league,euro' && bath.phase === 'transfer', 'and the European Cup is in his cabinet');
  ok(LOCKER || medals.length === 0, `its medal is the cups engine's (cupRecord), never the career's too (${medals})`);
  // a European Cup lost, and a league outside Europe
  const lost = C.create({ pos:'B', num:7, club:X.FRANCE[0] }); C.set(lost); finish(lost, 1); C.advance();
  C.play(); T.M.half = 2; T.M.score = [3, 20]; T.M.tries = [0, 4]; T.arcade.endHalf(); D.exitMatch();
  out = C.outcome(lost);
  ok(lost.phase === 'cup' && out && !out.won && C.ahead(lost) === null, 'Toulouse go out in the Semi-Final');
  C.renderEnd(); ok($('ce-title').textContent === 'Knocked Out', 'Knocked Out');
  C.advance(); ok(lost.trophies.map(t => t.kind).join() === 'league', 'nothing more banked');
  for (const club of [X.AUSTRALIA[0], X.SCOTLAND[0], X.JAPAN[0], X.NEW_ZEALAND[0], X.CLUBS[0]]) {
    const p = C.create({ pos:'B', num:7, club }); C.set(p); finish(p, 1);
    ok(C.outcome(p).next.phase === 'transfer', `${club.name}: no European Cup (${C.league(p)})`);
  }
  ok(C.EURO.join() === 'eng,fra,cel,rsa', 'the European leagues: England, France, Celtic and Italy, South Africa');
  // the World Cup: years 4, 8, 12, his country
  const wc = C.create({ pos:'B', num:7, club:X.CLUBS[0], cat:'women' }); C.set(wc); wc.year = 4; wc.country = 'NZL'; skillsTo(wc, overallAt(C.CALL.bar));
  finish(wc, 2); out = C.outcome(wc);
  ok(json(out.next) === json({ phase:'intl', kind:'world', first:false }), 'year 4, rated: the World Cup');
  C.advance();
  ok(wc.phase === 'intl' && wc.season === null && wc.cup.id === 'world' && S.log.at(-1)[2].user.name === 'New Zealand Women' && S.log.at(-1)[2].cat === 'women', 'the World Cup, as New Zealand Women');
  ok(C.eyebrow(wc) === 'World Cup · Pool B' && C.teamFor(wc).id === 'NZL', 'World Cup · Pool B');
  for (const y of [8, 12]) { const p = C.create({ pos:'B', num:7, club:X.CLUBS[0] }); p.year = y; p.country = 'ENG'; skillsTo(p, 85); finish(p, 3); ok(C.outcome(p).next.kind === 'world', `a World Cup in year ${y}`); }
  for (const y of [3, 5, 6, 7]) { const p = C.create({ pos:'B', num:7, club:X.CLUBS[0] }); p.year = y; p.country = 'ENG'; skillsTo(p, 85); finish(p, 3); ok(C.outcome(p).next.kind === 'six', `his country's six in year ${y}`); }
  // the Home Nations Tour: years 2, 6, 10, after the window, for a home-nation player rated CALL.tour
  const lose = p => { while (C.ahead(p)) { C.play(); T.M.half = 2; T.M.score = [0, 10]; T.M.tries = [0, 2]; T.arcade.endHalf(); D.exitMatch(); } };   // a cup played out, lost
  const tour = (year, country, ovr) => { const p = C.create({ pos:'F', num:2, club:X.CELTIC[3] }); C.set(p); p.year = year; p.country = country; skillsTo(p, overallAt(ovr)); finish(p, 4); C.advance(); if (p.season) finish(p, 3); else lose(p); ok(C.overall(p.skills) === ovr, `overall ${ovr}`); return p; };
  let p = tour(6, 'IRE', C.CALL.tour);
  ok(C.CALL.tour === 88 && json(C.outcome(p).next) === json({ phase:'tour', kind:'tour' }), 'year 6, Ireland, overall 88: the window, then the Home Nations Tour');
  C.advance();
  ok(p.phase === 'tour' && p.cup.id === 'tour' && S.log.at(-1)[2].user.id === 'IRE' && S.log.at(-1)[2].n === 1 && C.eyebrow(p) === 'Home Nations Tour · Test 1 of 3' && C.teamFor(p).id === 'IRE', 'cupNew(\'tour\', { user:Ireland, n:1 }): Home Nations Tour · Test 1 of 3');
  for (const [y, n] of [[2, 0], [10, 2]]) { p = tour(y, 'SCO', 95); C.advance(); ok(p.phase === 'tour' && S.log.at(-1)[2].n === n, `year ${y}: the hosts' turn ${n}`); }
  for (const [y, c, o, why] of [[6, 'FRA', 95, 'not a home nation'], [6, 'WAL', 87, 'rated under 88'], [4, 'ENG', 95, 'a World Cup year'], [7, 'ENG', 95, 'year 7']]) { p = tour(y, c, o); ok(C.outcome(p).next.phase === 'transfer', `no tour: ${why}`); }
  p = tour(6, 'ENG', 95); C.advance();
  for (const [us, them] of [[20, 10], [5, 30], [25, 7]]) { C.play(); T.M.half = 2; T.M.score = [us, them]; T.M.tries = [3, 1]; T.arcade.endHalf(); D.exitMatch(); }
  out = C.outcome(p);
  ok(out.kind === 'tour' && out.won && out.next.phase === 'transfer', 'two Tests of three won: the series');
  C.renderEnd(); ok($('ce-title').textContent === 'Series Won', 'Series Won');
  medals.length = 0;
  C.advance(); ok(p.trophies.at(-1).kind === 'tour' && p.trophies.at(-1).name === 'Home Nations' && (LOCKER || medals.length === 0), `the tour in his cabinet, its medal the cups engine's (${medals})`);
  // the save: a cup is kept through cleanCup; a build without the cups moves on to the window
  const e = C.create({ pos:'B', num:7, club:X.ENGLAND[0] }); C.set(e); finish(e, 1); C.advance();
  const back = C.clean(json2(e));
  ok(back.phase === 'cup' && json(back.cup) === json(e.cup) && back.season === null, 'a career in the European Cup saves and loads with its cup');
  C.setCups(false);
  const none = C.clean(json2(e));
  ok(none.phase === 'transfer' && none.cup === null && none.offers === null, 'loaded in a build without the cups: on to the transfer window');
  C.set(none); C.open();
  ok(shown() === 's-career-end' && none.offers && none.offers.length >= 2, 'whose offers are drawn as the hub opens');
  C.set(null);
}

// 3c. calibration: a scripted player is first called up in year 3 or 4. Each round he takes a dilemma's training option when there
//     is one, trains the drill for his lowest skill, and plays a match won 20-10 with five deed points (three tackles and two goals,
//     what the harness's bot averaged in 24 two-minute career matches: 5.0 points a match); at two stars a session he is first called
//     up at the end of year 3, at one star year 4. Seasons' ids are fixed, so the dilemmas are the same every run.
{
  const DRILL = { pace:'cones', power:'tackle', handling:'egg', kicking:'kick', stamina:'circle' };
  const script = stars => {
    reseed(77);
    const cr = C.create({ pos:'B', num:5, club:X.CLUBS[0] }); C.set(cr);
    for (let guard = 0; guard < 120 && cr.year <= 6; guard++) {
      if (cr.season && cr.season.round === 0 && !/^career-script/.test(cr.season.id)) cr.season.id = 'career-script-' + cr.year + '-' + cr.phase;
      if (!C.ahead(cr)) {
        if (cr.phase === 'transfer') { C.sign(null); continue; }
        const out = C.outcome(cr);
        if (out.next.phase === 'intl' && out.next.first) { C.set(null); return cr.year; }
        C.advance(); continue;
      }
      const d = L.dilemma(cr);
      if (d) { const j = d.opts.findIndex(o => keys.some(k => o.fx[k] > 0)); L.choose(j >= 0 ? j : 0); }
      const low = keys.reduce((a, k) => (cr.skills[k] < cr.skills[a] ? k : a), keys[0]);
      cr.trained = false; C.trainDone({ id:DRILL[low], stars, success:true, skill:low });
      C.play(); T.M.half = 2; T.M.score = [20, 10]; T.M.tries = [4, 2]; T.M.careerDeeds = { tries:0, tackles:3, goals:2 }; T.arcade.endHalf(); D.exitMatch();
    }
    C.set(null);
    return null;
  };
  const two = script(2), one = script(1);
  ok(two === 3 && one === 4, `a scripted player is first called up in year 3 (two stars a session) or year 4 (one star): ${two} and ${one}`);
}

// 3d. the real cups engine, once the build has it (src/cups.js): a career cup match is the cups engine's match (M.cup and M.cupKO,
//     from newMatch), its full-time card is the cup's own line and never table points, a level knockout goes to the Golden Try, a
//     pool match keeps its draw, and a cup won tells the Locker once (cupRecord), the career adding nothing. Without the engine,
//     careerCups() is null and every cup phase is skipped (section 3); section 3b covers the career's side of the contract.
{
  C.setCups(null);                                   // the build's own cups engine, if it has one
  if (!CUPS_ENGINE) ok(C.cups() === null, 'no cups engine in this build: none for the career (this section plays the real one once src/cups.js is in)');
  else {
    const card = () => ($('br-pts').hidden ? '' : $('br-pts').textContent);
    const full = (us, them, tu, tt) => { T.M.half = 2; T.M.score = [us, them]; T.M.tries = [tu, tt]; T.arcade.endHalf(); };
    medals.length = 0;
    const bath = C.create({ pos:'B', num:7, club:X.ENGLAND.find(t => t.id === 'BTH') }); C.set(bath); bath.year = 2;
    finish(bath, 1); C.advance();
    ok(bath.phase === 'cup' && bath.cup && bath.cup.id === 'euro' && C.ahead(bath).label === 'Semi-Final' && C.ahead(bath).ko === true && C.eyebrow(bath) === 'European Cup · Semi-Final', 'Bath win England: the European Cup, a Semi-Final, a knockout');
    C.play();
    ok(T.M.career === true && T.M.cup === 'euro' && T.M.cupKO === true && T.arcade.goldenOn(), 'Play Match: the cup\'s knockout (M.cup, M.cupKO), with the Golden Try');
    full(10, 10, 2, 2);
    ok(T.M.golden && !T.M.over && bath.cup.results.length === 0, 'level at full time: the Golden Try, nothing recorded yet');
    T.M.score = [15, 10]; T.M.tries = [3, 2]; T.arcade.endHalf();
    ok(T.M.over && T.M.cupResultDone === true && card() === 'Through to the Final', `the try wins it: the full-time card is the cup's line (${card()})`);
    D.exitMatch();
    ok(shown() === 's-career' && C.ahead(bath).label === 'Final', 'back to the hub: the Final next');
    C.play(); full(30, 0, 6, 0);
    ok(card() === 'European Cup Winners' && !/Table Point/.test(card()), `the Final won: European Cup Winners, no table points (${card()})`);
    D.exitMatch();
    ok(C.outcome(bath).won, 'European Cup won');
    C.advance();
    ok(bath.trophies.map(t => t.kind).join() === 'league,euro' && (LOCKER || medals.join() === 'euro'), `in his cabinet, and its medal told once, by the cups engine (${medals})`);
    // the Home Nations Tour: Test 1 of 3
    const p = C.create({ pos:'F', num:2, club:X.CELTIC[3] }); C.set(p); p.year = 6; p.country = 'IRE'; skillsTo(p, overallAt(95));
    finish(p, 4); C.advance(); finish(p, 3); C.advance();
    ok(p.phase === 'tour' && p.cup.id === 'tour' && C.ahead(p).label === 'Test 1 of 3' && C.ahead(p).ko === true, 'Ireland, year 6: the Home Nations Tour, Test 1 of 3');
    C.play();
    ok(T.M.cup === 'tour' && T.M.cupKO === true && T.arcade.goldenOn(), 'a Test cannot end level: the Golden Try');
    full(20, 10, 3, 1);
    ok(card() === 'Test Won · Series 1 – 0', `the card: Test Won · Series 1 – 0 (${card()})`);
    D.exitMatch();
    // the World Cup: a pool match keeps its draw
    const w = C.create({ pos:'B', num:7, club:X.CLUBS[0] }); C.set(w); w.year = 4; w.country = 'ENG'; skillsTo(w, overallAt(85));
    finish(w, 3); C.advance();
    ok(w.phase === 'intl' && w.cup && w.cup.id === 'world' && /^Pool [ABCD]$/.test(C.ahead(w).label) && C.ahead(w).ko === false, `England, year 4: the World Cup, ${C.ahead(w).label}, no knockout`);
    C.play();
    ok(T.M.cup === 'world' && T.M.cupKO === false && !T.arcade.goldenOn(), 'a pool match: no Golden Try');
    full(10, 10, 2, 2);
    ok(T.M.over && !T.M.golden && T.M.cupResultDone === true && card() === '+2 Table Points · Draw', `level: the draw stands, the cup's pool line (${card()})`);
    D.exitMatch();
  }
  C.setCups(false); C.set(null);
}

// 4. training: stars into skills
{
  const cr = C.create({ pos:'F', num:1, club:X.CLUBS[0] }); C.set(cr);
  const before = { ...cr.skills };
  let r = C.trainDone({ id:'egg', stars:3, success:true });
  ok(r && cr.skills.handling === before.handling + C.TRAIN[3] && cr.trained, `three stars of Bouncy Egg: +${C.TRAIN[3]} Handling`);
  ok(C.trainDone({ id:'kick', stars:3, success:true }) === null && cr.skills.kicking === before.kicking, 'one session a round');
  ok(!C.train('defend'), 'Train is closed until the next match');
  playOut(10, 12);
  ok(!cr.trained, 'a match opens training again');
  const map = C.DRILL_SKILL;
  ok(map.egg === 'handling' && map.pass === 'handling' && map.tackle === 'power' && map.scrum === 'power' && map.cones === 'pace' && map.defend === 'pace' && map.kick === 'kicking', 'each drill trains its skill');
  const gain = (res, skill) => { cr.trained = false; const b = cr.skills[skill]; C.trainDone(res); return cr.skills[skill] - b; };
  ok(gain({ id:'circle', stars:2, success:true, role:'runner', skill:'stamina' }, 'stamina') === C.TRAIN[2], 'Pass Around the Circle as the Runner trains Stamina');
  ok(gain({ id:'circle', stars:1, success:true, role:'passer', skill:'handling' }, 'handling') === C.TRAIN[1], 'and as the Passer, Handling');
  ok(gain({ id:'cones', stars:2, success:true, skill:'pace' }, 'pace') === C.TRAIN[2], 'a result that names its skill wins');
  ok(gain({ id:'tackle', stars:2, skill:'speed' }, 'power') === C.TRAIN[2], 'an unknown skill falls back to the drill\'s own');
  ok(gain({ id:'tackle', stars:0, success:false }, 'power') === C.TRAIN[0] && C.TRAIN[0] > 0, 'no stars still counts for a little');
  ok(gain({ id:'kick', stars:9 }, 'kicking') === C.TRAIN[3] && gain({ id:'kick', stars:-2 }, 'kicking') === C.TRAIN[0] && gain({ id:'kick', stars:'2' }, 'kicking') === C.TRAIN[2], 'stars are held to 0 to 3');
  cr.trained = false; const snap = json(cr.skills);
  ok(C.trainDone({ id:'mystery', stars:3 }) === null && json(cr.skills) === snap && !cr.trained, 'an unknown drill gives nothing and keeps the session');
  ok(C.trainDone(null) === null && C.trainDone('3') === null && !cr.trained, 'a missing result gives nothing');
  { const w = writes;   // a drill left before it finished (the ready card's leave button, Pause then Quit, Back): the session is still there
    ok(C.trainDone({ id:'egg', stars:0, success:false, skill:'handling', quit:true }) === null && json(cr.skills) === snap && !cr.trained && writes === w && shown() === 's-career' && !$('cr-train').disabled, 'a drill left before it finished gives nothing and keeps the session');
    ok(C.trainDone({ id:'egg', stars:3, success:true, quit:true }) === null && json(cr.skills) === snap && !cr.trained, 'even one that claims stars'); }
  { const src = readGameSource(); ok(/practiceStart\(id, \{ onDone:careerTrainDone, leaveLabel:'Back to Career' \}\)/.test(src), 'a career drill\'s leave button reads Back to Career'); }
  cr.skills.handling = 97; ok(gain({ id:'egg', stars:3 }, 'handling') === 2 && cr.skills.handling === 99, 'skills stop at 99');
  ok(C.TRAIN.every((v, i, a) => !i || v > a[i - 1]), 'more stars, more points');
  // the drill list: every drill that exists, Driving from the first year (no stage hides it now)
  const have = C.drillIds();
  ok(C.drills(cr).every(d => have.includes(d.id)) && C.drills(cr).length === have.filter(id => id in map).length, `the training list is the drills that exist (${C.drills(cr).map(d => d.id)})`);
  if (have.includes('scrum')) ok(cr.year === 1 && C.drills(cr).some(d => d.id === 'scrum'), 'Driving in the first year');
  if (have.includes('circle')) ok(json(C.drills(cr).find(d => d.id === 'circle').skills) === '["stamina","handling"]', 'the circle shows both skills');
  cr.trained = false;
  ok(!C.train('nothing-here'), 'a drill that does not exist cannot start');
  finish(cr, 2);
  ok(!C.train('egg') && C.trainDone({ id:'egg', stars:3 }) === null, 'no session once the season is over');
  cr.season.round = 4; cr.season.results.pop();
  // whichever way the drill hands back, its match is gone and the hub shows
  T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:0, humans:[true, false] }); D.setMode('match'); $('hud').hidden = false;
  cr.trained = false; C.trainDone({ id:'defend', stars:2, success:true });
  ok(T.M.demo && $('hud').hidden && shown() === 's-career', 'a session handed back mid-match leaves the drill\'s match for the hub');
  cr.trained = false;
  // practice writes nothing: a result arriving while a drill is still set is ignored
  T.practice.start('pass');
  const w0 = writes, s0 = json(cr.skills);
  ok(C.trainDone({ id:'pass', stars:3 }) === null && writes === w0 && json(cr.skills) === s0, 'a result arriving mid-drill changes and writes nothing');
  T.practice.leave();
  C.set(null);
}

// 5. match deeds
{
  ok(json(C.deedGains({ tries:1 })) === '{"pace":1,"handling":1}', 'a try: a point of Pace and one of Handling');
  ok(json(C.deedGains({ tackles:3 })) === '{"power":3}' && json(C.deedGains({ goals:2 })) === '{"kicking":2}', 'a tackle a point of Power, a goal a point of Kicking');
  const big = C.deedGains({ tries:3, goals:3, tackles:5 });
  ok(Object.values(big).reduce((a, b) => a + b, 0) === C.DEED_CAP, `at most ${C.DEED_CAP} points a match`);
  ok(json(C.deedGains({ tries:-2, goals:'x' })) === '{}', 'nonsense deeds give nothing');
  const cr = C.create({ pos:'B', num:5, club:X.CLUBS[0] }); C.set(cr);
  C.play();
  const me = T.M.careerP, mate = T.M.players.find(p => p.team === 0 && p !== me), foe = T.M.players.find(p => p.team === 1);
  ok(me.n === 5 && me.team === 0, 'your player wears your number');
  ok(!T.M.cup, 'a league match is no cup\'s');
  T.arcade.scoreTry(mate);
  ok(T.M.careerDeeds.tries === 0, 'a teammate\'s try is not yours');
  T.arcade.scoreTry(me);
  ok(T.M.careerDeeds.tries === 1, 'your try is counted');
  T.M.phase = 'play'; T.M.set = null; T.M.cut = null;
  T.contact.tackle(foe, me, { tier:'wrap' });
  T.contact.tackle(foe, mate, { tier:'wrap' });
  ok(T.M.careerDeeds.tackles === 1, 'your tackle is counted, a teammate\'s is not');
  D.goalKick(0, 96, 35, 'conversion');
  ok(T.M.goal.kicker === me, 'you take your side\'s goal kicks');
  ok(Math.abs(T.M.goal.kicking - T.M.careerNat.kicking) < 1e-12, 'with your own kicking');
  T.M.cut = null; T.M.goal.ok = true; C.scoreGoal(T.M.goal);
  ok(T.M.careerDeeds.goals === 1, 'a goal you kick is counted');
  const s0 = { ...cr.skills }, t0 = { ...cr.totals };
  T.M.half = 2; T.M.score = [12, 7]; T.M.tries = [2, 1];
  T.arcade.endHalf();
  ok(cr.season.round === 1 && cr.totals.matches === t0.matches + 1 && cr.totals.tries === 1 && cr.totals.tackles === 1 && cr.totals.goals === 1, 'full time records the result and the deeds');
  ok(cr.skills.pace === s0.pace + 1 && cr.skills.handling === s0.handling + 1 && cr.skills.power === s0.power + 1 && cr.skills.kicking === s0.kicking + 1, 'and the deeds go into the skills');
  ok(json(C.last().gains) === json({ pace:1, handling:1, kicking:1, power:1 }), 'the hub is told what the match gave');
  const mine = cr.season.results[0].find(r => r.h === 0 || r.a === 0);
  ok((mine.h === 0 ? mine.hs : mine.as) === 12 && (mine.h === 0 ? mine.ht : mine.at) === 2, 'the score follows your side home or away');
  ok(cr.season.results[0].length === 3, 'the other two games are drawn');
  ok(!C.record() && cr.season.round === 1, 'a second full time records nothing');
  ok(!T.M.cupResultDone && /^\+4 Table Points · Win$/.test($('br-pts').textContent) && !$('br-pts').hidden, `a league match's full-time card: its table points, no cup's line (${$('br-pts').textContent})`);
  D.exitMatch();
  ok(shown() === 's-career', 'Continue goes back to the career hub');
  C.set(null);
}

// 6. the engine's career gate
{
  const cr = C.create({ pos:'B', num:6, club:X.CLUBS[0] }); C.set(cr);
  for (const k of keys) cr.skills[k] = 99;
  C.play();
  const M = T.M, me = M.careerP, mate = M.players.find(p => p.team === 0 && p !== me), foe = M.players.find(p => p.team === 1);
  ok(M.career === true && D.settings() && M.champ === false, 'a career match is flagged, and is not a championship match');
  ok(T.sides.ctrlOf(0) === me, 'the ring starts on your player');
  const nat = M.careerNat, team = M.nat[0];
  ok(['pace', 'power', 'handling', 'kicking'].every(k => Math.abs(nat[k] - (team[k] + (5 - team[k])*C.SHADE)) < 1e-9), 'a 99 player is half way from the team to 5 in each ability');
  ok(C.natOf(mate) === team && C.natOf(foe) === M.nat[1] && C.natOf(me) === nat, 'only your player reads his own abilities');
  for (const p of [me, mate]) { p.boost = 0; p.sprint = 0; p.stumble = 0; p.wf = 0; }
  M.surge = null;
  ok(Math.abs(T.contact.maxSpeed(me)/T.contact.maxSpeed(mate) - (7.6 + nat.pace*0.25)/(7.6 + team.pace*0.25)) < 1e-9, 'his speed follows his pace');
  const tk = (q, c) => T.contact.tackleChance(q, c, 'contact', false);
  ok(tk(me, foe) > tk(mate, foe) && Math.abs(tk(me, foe) - tk(mate, foe) - (nat.power - team.power)*0.05) < 1e-9, 'his tackling follows his power');
  ok(Math.abs(C.ability(me, 'power') - C.ability(mate, 'power') - (nat.power - team.power)) < 1e-9 && C.ability(foe, 'power') === C.ability(T.M.players.find(p => p.team === 1 && p !== foe), 'power'), 'his power is the side\'s plus his own pull, and only his');
  M.clock = 0;
  ok(C.fade(me) === 1 && C.fade(mate) === 1, 'no fade at the start of a half');
  M.clock = M.halfLen;
  ok(C.fade(me) > 1 && C.fade(mate) === 1 && Math.abs(C.fade(me) - (1 + (nat.stamina - (team.stamina || 3))*0.02)) < 1e-9, 'a fit player holds his pace late in the half');
  ok(C.sprintDrain(me) < 1 && C.sprintDrain(mate) === 1, 'and his sprint lasts longer');
  for (const k of keys) cr.skills[k] = 1;
  M.careerNat = C.natFor(team, cr.skills);
  ok(C.fade(me) < 1 && C.sprintDrain(me) > 1 && T.contact.maxSpeed(me) < T.contact.maxSpeed(mate), 'and a weak one is slower and tires sooner');
  M.clock = 0;
  // the ring at every kick-off
  T.sides.setCtrl(0, mate);
  M.headless = true; M.half = 1; T.arcade.endHalf(); M.headless = false;
  ok(M.half === 2 && T.sides.ctrlOf(0) === me, 'the second-half kick-off puts the ring back on him');
  // the mark on the pitch: drawn in a career match only
  let calls = 0; globalThis.__ctxSpy = () => { calls++; };
  D.view(844, 390); D.render(0.016); const withMark = calls;
  M.career = false; calls = 0; D.render(0.016); const without = calls; M.career = true;
  globalThis.__ctxSpy = null;
  ok(withMark > without, `the ring and star are drawn in a career match only (${withMark} > ${without} draw calls)`);
  // a league keeps its draws
  M.half = 2; M.score = [7, 7]; T.arcade.endHalf();
  ok(M.over && !M.golden, 'a career match level at full time is a draw, no Golden Try');
  D.exitMatch();
  // a plain match is a plain match
  T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:1, headless:true, humans:[true, false] });
  const p6 = T.M.players.find(p => p.team === 0 && p.n === 6);
  ok(!T.M.career && C.natOf(p6) === T.M.nat[0] && C.fade(p6) === 1 && C.sprintDrain(p6) === 1, 'outside a career match every hook gives the team\'s own value');
  T.arcade.scoreTry(p6);
  ok(T.M.careerDeeds === undefined, 'and counts no deeds');
  ok(fingerprint() === BASE, 'with a career under way, non-career matches still play exactly as before');
  C.set(null);
}

// 7. the championship and the career never touch
{
  X.setChamp(null);
  X.newChamp(X.NATIONS[0], X.NATIONS.slice(1));
  for (let i = 0; i < 2; i++) {
    const c = X.champ(), pair = c.fixtures[c.round].find(p => p.includes(c.user)), opp = pair.find(i => i !== c.user);
    T.newMatch(c.teams[c.user], c.teams[opp], { champ:true, headless:true }); T.M.score = [17, 10]; T.M.tries = [3, 1];
    X.recordChampResult();
  }
  const champBefore = json(X.champ()), histBefore = json(saved().champHistory), serial = saved().seasonSerial;
  const cr = C.create({ pos:'F', num:3, club:X.CLUBS[2] }); C.set(cr); X.save();
  for (let i = 0; i < 5; i++) { cr.trained = false; C.trainDone({ id:'pass', stars:2 }); playOut(20, 3, { tries:1 }); X.recordChampResult(); }
  C.advance(); C.sign(null);
  ok(json(X.champ()) === champBefore && json(saved().champ) === champBefore, 'a whole career season and its transfer window leave a running championship as it was');
  ok(json(saved().champHistory) === histBefore && saved().seasonSerial === serial, 'and its history and season count');
  ok(cr.history.length === 1 && cr.year === 2 && cr.phase === 'league', 'while the career moved on');
  const careerBefore = json(C.get());
  while (X.champ().round < 5) {
    const c = X.champ(), pair = c.fixtures[c.round].find(p => p.includes(c.user)), opp = pair.find(i => i !== c.user);
    T.newMatch(c.teams[c.user], c.teams[opp], { champ:true, headless:true }); T.M.score = [3, 10]; T.M.tries = [0, 1];
    ok(!C.record(), 'a championship match records nothing in the career');
    X.recordChampResult();
  }
  X.renderHub(); X.save();
  ok(json(C.get()) === careerBefore && json(saved().career) === careerBefore, 'a championship played to the end leaves the career as it was');
  ok(saved().champHistory.length === JSON.parse(histBefore).length + 1, 'the championship archived its season, and only its own');
  ok(!saved().champHistory.some(c => /^career-/.test(c.id)), 'no career season ever reaches the trophy cabinet');
  X.setChamp(null); X.save();
}


// 8. the save
{
  const cr = C.create({ name:'Isla', pos:'B', num:7, club:X.CLUBS[3] }); C.set(cr);
  playOut(15, 5, { tries:1, tackles:2 });
  cr.trained = false; C.trainDone({ id:'kick', stars:1 });
  X.save();
  const disk = saved().career;
  ok(json(disk) === json(cr), 'the career is saved whole');
  C.set(null); X.load();
  ok(json(C.get()) === json(cr), 'and loads back exactly');
  const good = json2(cr);                            // a career in its league, for the broken saves below
  C.set(cr); finish(cr, 1); C.advance(); X.save(); C.set(null); X.load();
  ok(json(C.get()) === json(cr) && C.get().phase === 'transfer' && C.get().offers.length >= 2 && C.get().trophies.length === 1, 'a transfer window, its offers and the trophies too');
  // saves from before the career
  const old = { settings:{ half:1, diff:2, sound:false }, champ:null, custom:[{ name:'Old Club', id:'OLD', kit:'#123456', trim:'#abcdef', pace:2, power:2, handling:2, kicking:2 }], champHistory:[], seasonSerial:4 };
  C.set(null); X.restore(JSON.parse(json(old)));
  ok(C.get() === null && D.settings().diff === 2 && X.custom()[0].name === 'Old Club', 'a save from before the career loads as it did, with no career');
  C.set(cr); X.restore({ settings:{ sound:true } });
  ok(C.get() === cr, 'a partial restore leaves the career alone');
  X.restore({ career:null });
  ok(C.get() === null, 'a saved null is no career');
  // careers from before club seasons: Minis, Juniors, County, Pro Club and International
  const ALD = X.CLUBS[3], TLS = X.FRANCE[0], SYD = X.AUSTRALIA[0];
  const skills = { pace:61, power:57, handling:70, kicking:48, stamina:52 }, life = { energy:44, morale:71, spirit:63, done:'' }, totals = { matches:31, tries:9, tackles:40, goals:12 };
  const hist = [{ stage:0, name:'Aldershot', place:1, up:true, w:5, d:0, l:0 }, { stage:1, name:'Aldershot', place:4, up:false, w:2, d:0, l:3 }, { stage:1, name:'Aldershot', place:2, up:true, w:3, d:1, l:1 }];
  const was = (stage, o = {}) => json2({ name:'Isla', pos:'B', num:7, club:ALD, cat:'men', proMode:false, pro:null, country:null, skills, stage, seasons:hist.length + 1, season:C.create({ pos:'B', num:7, club:ALD }).season, trained:false, history:hist, totals, life, ...o });
  for (const [stage, name] of [[0, 'Minis'], [1, 'Juniors'], [2, 'County']]) {
    X.restore({ career:was(stage) });
    const k = C.get();
    ok(k && k.club.id === 'ALD' && k.league === 'sur' && k.phase === 'league' && k.year === 4 && k.season === null && k.country === null, `a ${name} career: a league year at its club, its Minis-style season dropped (year ${k && k.year})`);
    ok(json(k.skills) === json(skills) && json(k.totals) === json(totals) && json(k.life) === json(life) && k.name === 'Isla' && k.num === 7, 'its skills, totals, life and name kept');
    ok(json(k.history) === json([{ year:1, kind:'league', name:'Aldershot', place:1, w:5, d:0, l:0 }, { year:2, kind:'league', name:'Aldershot', place:4, w:2, d:0, l:3 }, { year:3, kind:'league', name:'Aldershot', place:2, w:3, d:1, l:1 }]), 'its history in the new shape');
    ok(json(k.trophies) === json([{ kind:'league', year:1, name:'Aldershot' }]), 'its titles are its first trophies');
    ok(!('stage' in k) && !('pro' in k) && json(Object.keys(k)) === json(Object.keys(C.create({ pos:'B', num:7, club:ALD }))), 'and nothing of the old shape is left');
  }
  C.open();
  ok(shown() === 's-career' && C.get().season && C.get().season.teams[0].id === 'ALD' && C.get().season.teams[0].pace === ALD.pace && C.get().phase === 'league', 'the hub draws its league season, Aldershot at full strength');
  // one whose season he had finished (its end screen seen, Continue not pressed): banked as Continue would have, the year after it next
  const doneSeason = place => { const p = C.create({ pos:'B', num:7, club:ALD }); finish(p, place); return json2(p.season); };
  for (const [stage, name, place] of [[0, 'Minis', 2], [1, 'Juniors', 6], [2, 'County', 1]]) {
    X.restore({ career:was(stage, { season:doneSeason(place) }) });
    const k = C.get();
    ok(k && k.phase === 'league' && k.season === null && k.year === 5 && k.history.length === 4 && json(k.history[3]) === json({ year:4, kind:'league', name:'Aldershot', place, w:6 - place, d:0, l:place - 1 }), `a finished ${name} season (place ${place}): into his history as year 4, and year 5 next (year ${k && k.year}, ${json(k && k.history.at(-1))})`);
    ok(json(k.trophies) === json([{ kind:'league', year:1, name:'Aldershot' }, ...(place === 1 ? [{ kind:'league', year:4, name:'Aldershot' }] : [])]), `${place === 1 ? 'its title a trophy' : 'no title, no trophy'} (${json(k.trophies)})`);
  }
  const unfinished = was(2, { season:(() => { const p = C.create({ pos:'B', num:7, club:ALD }); finish(p, 1); p.season.round = 4; p.season.results.pop(); return json2(p.season); })() });
  X.restore({ career:unfinished });
  ok(C.get().year === 4 && C.get().history.length === 3 && C.get().trophies.length === 1, 'one he had not finished is dropped, banked nowhere');
  X.restore({ career:was(2, { season:doneSeason(1), history:[], seasons:0 }) });
  ok(C.get().year === 2 && json(C.get().history) === json([{ year:1, kind:'league', name:'Aldershot', place:1, w:5, d:0, l:0 }]) && C.get().trophies.length === 1, 'with no history or season count: year 1 banked, year 2 next');
  const proSeason = C.create({ pos:'B', num:7, club:TLS }).season;
  X.restore({ career:was(3, { pro:'TLS', season:proSeason }) });
  let k = C.get();
  ok(k.club.id === 'TLS' && k.league === 'fra' && k.phase === 'league' && json(k.season) === json(proSeason), 'a Pro Club career: that side is his club, its season kept');
  X.restore({ career:was(3, { pro:'NOPE' }) });
  ok(C.get().club.id === 'ALD', 'a Pro Club side that does not exist: his own club');
  const six = (() => { const p = C.create({ pos:'B', num:7, club:SYD }); p.country = 'IRE'; p.phase = 'intl'; C.newSeason(p); return p.season; })();
  X.restore({ career:was(4, { pro:'SYD', country:'IRE', season:six }) });
  k = C.get();
  ok(k.club.id === 'SYD' && k.league === 'aus' && k.country === 'IRE' && k.phase === 'intl' && json(k.season) === json(six) && k.season.teams[0].name === 'Ireland', 'an International career: his Pro Club side, his country, in the window with its season');
  X.restore({ career:was(4, { country:'XYZ', season:{ ...six, fixtures:[] } }) });
  k = C.get();
  ok(k.club.id === 'ALD' && k.country === 'ENG' && k.phase === 'intl' && k.season === null, 'one with no Pro Club side, a bad country and a broken season: his club, England, the window');
  C.open();
  ok(shown() === 's-career' && k.season && k.season.teams[0].name === 'England' && k.season.round === 0, 'and the hub draws England\'s six');
  X.restore({ career:was(9) }); ok(C.get() && C.get().phase === 'league' && C.get().club.id === 'ALD', 'a stage that never existed: a league year at its club, never a dropped career');
  // a broken career: only a club and skills are needed
  X.restore({ champ:null, career:{ ...good, club:null } });
  ok(C.get() === null, 'no club: the career is dropped');
  X.newChamp(X.NATIONS[0], X.NATIONS.slice(1)); const champ0 = json(X.champ());
  for (const bad of [{ ...good, skills:null }, { ...good, skills:[] }, [], 'x', 7]) { X.restore({ career:bad }); ok(C.get() === null && json(X.champ()) === champ0, `no skills, or no career at all (${json(bad).slice(0, 20)}): dropped, the championship kept`); }
  X.restore({ career:{ ...good, pos:'Hooker', num:2, junk:'<b>', phase:'nope', year:-4 } });
  k = C.get();
  ok(k && k.pos === 'B' && k.num === 4 && !('junk' in k) && k.phase === 'league' && k.year === 1, 'a bad position is a back, a bad phase the league, a bad year 1, an unknown field dropped: the career kept');
  X.restore({ career:{ ...good, season:{ ...good.season, fixtures:[] } } });
  const kept = C.get();
  ok(kept && kept.season === null && kept.name === 'Isla' && json(kept.skills) === json(good.skills), 'a broken season drops the season, never the player');
  C.open();
  ok(good.phase === 'league' && kept.season && kept.season.round === 0 && kept.phase === 'league' && shown() === 's-career', 'and the hub draws a new one for the same phase');
  X.restore({ career:{ ...good, phase:'transfer', season:null, offers:['BTH', 'BTH', 'XXX', 7, 'ALD', 'TLS', 'DUB', 'PRE'] } });
  ok(json(C.get().offers) === json(['BTH', 'TLS', 'DUB']), `the window's offers: national clubs only, each once, never his own, three at most (${C.get().offers})`);
  X.restore({ career:{ ...good, phase:'transfer', season:null, offers:['ALD'] } });
  ok(C.get().offers === null, 'none left: drawn again as the hub opens');
  X.restore({ career:{ ...good, trophies:[{ kind:'league', year:2, name:'  Bath   City ' }, { kind:'lions', year:2, name:'X' }, { kind:'euro', name:'Bath' }, { kind:'world', year:4, name:'' }, ...Array(80).fill({ kind:'tour', year:6, name:'Home Nations' })] } });
  k = C.get();
  ok(k.trophies.length === 60 && k.trophies.every(t => t.kind === 'tour'), 'trophies: at most the latest 60');
  X.restore({ career:{ ...good, trophies:[{ kind:'league', year:2, name:'  Bath   City ' }, { kind:'lions', year:2, name:'X' }, { kind:'euro', name:'Bath' }, { kind:'world', year:4, name:'' }] } });
  ok(json(C.get().trophies) === json([{ kind:'league', year:2, name:'Bath City' }]), 'a kind that is not one, or no year or name, is dropped');
  X.restore({ career:{ ...good, skills:{ pace:150, power:-3, handling:'x', kicking:42.6 }, num:2, name:'<b>Bo</b>', trained:'yes', totals:{ matches:-1, tries:2.5, tackles:3 } } });
  k = C.get();
  ok(k.skills.pace === 99 && k.skills.power === 1 && k.skills.handling === 38 && k.skills.kicking === 43 && k.skills.stamina === 34, `skills are held to 1 to 99, a missing one takes the start value (${json(k.skills)})`);
  ok(k.num === 4 && k.name === 'bBob' && k.trained === false && k.totals.matches === 0 && k.totals.tries === 0 && k.totals.tackles === 3 && k.totals.goals === 0, 'the number, name, session and totals are put right');
  X.restore({ career:{ ...good, history:[{ stage:0, name:'Farnham', place:2, up:true, w:4, d:0, l:1 }, { stage:7 }, null, 'x', ...Array(60).fill({ year:3, kind:'league', name:'Farnham', place:4, w:2, d:0, l:3 })] } });
  ok(C.get().history.length === 40 && C.get().history.every(h => h.kind === 'league' && h.place === 4), 'history keeps the latest 40 good entries');
  X.restore({ career:{ ...good, country:'XYZ', league:'zzz' } });
  ok(C.get().country === null && C.get().league === 'sur', 'an unknown country or league is put right');
  // the save consumes no RNG and practice never writes it
  C.set(cr); X.save();
  const r0 = rndCalls(); X.save(); X.renderHome(); C.renderHome();
  ok(rndCalls() === r0, 'saving and the home screen draw no random numbers with a career under way');
  const w0 = writes, m0 = memory['tryline.v1'];
  T.practice.start('defend'); X.save(); C.record(); C.trainDone({ id:'defend', stars:3 }); C.sign(null); C.advance(); T.practice.leave();
  ok(writes === w0 && memory['tryline.v1'] === m0, 'practice cannot write or change the career');
  X.setChamp(null); C.set(null); X.save();
}

// 9. the screens
{
  const src = readGameSource(), html = src.slice(src.indexOf('<body>'), src.indexOf('<script>'));
  const small = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'on', 'to', 'in', 'for', 'as', 'at', 'by']);
  const titled = s => s.split(/[\s·]+/).filter(Boolean).every((w, i) => (i && small.has(w)) || !/^[a-z]/.test(w));
  const career = html.slice(html.indexOf('id="s-career-new"'), html.indexOf('id="s-help"'));
  const text = s => s.replace(/<[^>]+>/g, '').trim();
  const labels = [...career.matchAll(/<button[^>]*>([^<]+)<\/button>/g), ...career.matchAll(/<p class="eyebrow[^"]*"[^>]*>([^<]+)<\/p>/g), ...career.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g), ...career.matchAll(/<span class="lbl">([^<]+)<\/span>/g)].map(m => text(m[1])).filter(Boolean);
  ok(labels.length >= 18 && labels.every(titled), `every career label is Title Case (${labels.filter(l => !titled(l)).join(', ') || labels.length + ' labels'})`);
  const words = ['Transfer Window', 'Continue', 'Called Up', 'Pick Your Country', 'Winners', 'Knocked Out', 'Series Won', 'Series Lost', 'Transfers', 'Stay', 'Start New Career', 'Change Club', 'Pick Your Club', 'Back to New Player', 'European Cup', 'World Cup', 'Home Nations Tour', 'Triple Crown'];
  ok(words.every(titled) && words.every(w => src.includes(w)), 'and the ones the screens write: Transfer Window, Called Up, Stay, Winners, Series Won and the rest');
  ok(!/Hall of Fame|to Go Up|One More Season|CAREER_STAGES|CAREER_COUNTIES|CAREER_CUT/.test(src), 'no stages left: no Hall of Fame, no "to Go Up", no counties');
  const panel = (src.match(/<div class="hl-panel hp-career" id="hp-career"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '';
  ok(/<button class="btn primary" id="b-career">New Career<\/button>\s*<p class="resume-note" id="career-note" hidden><\/p>/.test(panel) && /<button class="btn hl" id="hl-career" data-hl="career"[^>]*>[\s\S]*?<span class="hl-name">Career<\/span><\/button>/.test(src), 'Career is a headline on the home\'s bar: its panel is New Career (or Continue Career) with its note under it');
  ok(/\.hl-panel \.btn\.primary\{min-height:72px;/.test(src) && /\.hl-bar\{grid-area:bar;display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\);/.test(src), 'the button big, the headlines in five equal parts');
  ok(!/[←-↙⇐-⇙]/.test(career), 'no arrow glyph on the career screens');
  for (const id of SCREENS) ok(new RegExp(`id="${id}"[\\s\\S]*?data-back>Back to (Menu|Career|New Player)<`).test(html), `${id} has a Back button`);
  ok(/id="cr-play">Play Match</.test(career) && /<div class="row2" id="cr-trow"><button class="btn" id="cr-train">Train<\/button><button class="btn" id="cr-table">Table<\/button><\/div>/.test(career), 'the hub: Play Match on its own, Train and Table as equal halves');
  ok(/<div class="row2"><button class="btn" id="ce-back" data-back>Back to Menu<\/button><button class="btn warn" id="ce-new">Start New Career<\/button><\/div>/.test(career), 'between phases: Back to Menu and Start New Career as equal halves, as the hub\'s Back to Menu and Start Fresh');
  // home
  C.set(null); C.renderHome();
  ok($('b-career').textContent === 'New Career' && $('career-note').hidden, 'home: New Career, with no note before a career starts');
  const cr = C.create({ name:'Isla', pos:'B', num:7, club:{ id:'XSS', name:'<img src=x>', kit:'#123456', trim:'#abcdef', custom:true, pace:3, power:3, handling:3, kicking:3 } });
  C.set(cr); X.renderHome();
  ok($('b-career').textContent === 'Continue Career' && !$('career-note').hidden && $('career-note').innerHTML === 'Year 1 · <span class="rn-name">&lt;img src=x&gt; · </span>Round 1 of 5', 'with one: Continue Career, the year, the club (escaped, in a span a phone held sideways leaves out) and the round');
  // the new player screen, and his club
  C.set(null); C.newOpen();
  const d = C.draft();
  ok(shown() === 's-career-new' && d.club.id === 'FAR' && d.league === 'sur' && /Farnham/.test($('cn-mine').innerHTML) && />Surrey</.test($('cn-mine').innerHTML) && /<b>7<\/b>/.test($('cn-mine').innerHTML) === false && /<b>4<\/b>/.test($('cn-mine').innerHTML), 'New Player: Farnham of Surrey to start, his shirt with a back\'s first number');
  ok(/data-n="4"/.test($('cn-num').innerHTML) && !/data-n="3"/.test($('cn-num').innerHTML), 'and a back\'s numbers');
  ok(/<span class="lbl">Your Club<\/span><div class="yours cr-yours"><span class="cr-mineline" id="cn-mine"><\/span><button class="btn" id="cn-change">Change Club<\/button><\/div>/.test(html), 'Your Club: the club and Change Club in one row');
  const left = html.slice(html.indexOf('class="cr-left"'), html.indexOf('class="cr-form"')), right = html.slice(html.indexOf('class="cr-form"'), html.indexOf('id="s-career-club"'));
  ok(['cn-mine', 'cn-cat', 'cn-mode'].every(id => left.includes(id)) && ['cn-name', 'cn-pos', 'cn-num', 'cn-go'].every(id => right.includes(id)) && left.indexOf('cn-mine') < left.indexOf('cn-cat') && left.indexOf('cn-cat') < left.indexOf('cn-mode'), 'Your Club, Team and Play as on the left; First Name, Position, Shirt Number and Start Career on the right, so Start Career is in view');
  ok(d.cat === 'men' && /<div class="field"><span class="lbl">Team<\/span><div class="seg" id="cn-cat"><button>Men<\/button><button>Women<\/button><\/div><\/div>/.test(html), 'Team is Men | Women, two equal buttons, Men first and picked');
  C.clubOpen();
  ok(shown() === 's-career-club' && !$('cc-loc').hidden && $('cc-nat').hidden && $('cc-league').hidden && /class="team cr-club picked" data-i="0" aria-pressed="true">[\s\S]*?Farnham/.test($('cc-grid').innerHTML) && X.CLUBS.every(t => $('cc-grid').innerHTML.includes('>' + t.name + '<')), 'Change Club: Local · Surrey, its clubs, Farnham picked; no My League without an import');
  ok(X.CLUBS.every(t => $('cc-grid').innerHTML.includes(`aria-label="Overall ${X.overallOf(t)}">${X.overallOf(t)}<`)), 'each club with its rating');
  C.tierPick(1);
  ok(!$('cc-nat').hidden && $('cc-loc').hidden && C.draft().pool === 'eng' && X.ENGLAND.every(t => $('cc-grid').innerHTML.includes('>' + t.name + '<')), 'National: England\'s Premiership first');
  C.poolPick('fra');
  ok(X.FRANCE.every(t => $('cc-grid').innerHTML.includes('>' + t.name + '<')) && !$('cc-grid').innerHTML.includes('>Bath<'), 'France: the Top 14');
  C.clubPick(X.FRANCE[0]);
  ok(shown() === 's-career-new' && C.draft().club.id === 'TLS' && C.draft().league === 'fra' && />Toulouse</.test($('cn-mine').innerHTML) && />France</.test($('cn-mine').innerHTML), 'Toulouse picked: back to New Player, Toulouse of France');
  C.clubOpen();
  ok(C.draft().pool === 'fra' && !$('cc-nat').hidden, 'Change Club again opens on France');
  C.catPick(1);
  ok(C.draft().cat === 'women', 'Women picks it');
  $('cn-go').click();
  ok(C.get() && C.get().cat === 'women' && C.get().club.id === 'TLS' && C.get().league === 'fra' && C.get().season.teams[0].name === 'Toulouse Women' && saved().career.cat === 'women', 'Start Career: a women\'s career at Toulouse, in the Top 14, saved');
  C.set(null); C.newOpen();
  ok(C.draft().cat === 'men' && C.draft().club.id === 'FAR', 'a new player starts on Men at Farnham again');
  // a team you made follows every list, and plays the league it was picked on; My League with an import
  X.restore({ custom:[{ key:'my0', name:'My Town', id:'MYT', kit:'#123456', trim:'#abcdef', pace:3, power:3, handling:3, kicking:3, stamina:3 }] });
  C.clubOpen(); C.tierPick(1); C.poolPick('sco');
  ok($('cc-grid').innerHTML.includes('>My Town<') && C.clubList('sco').at(-1).custom, 'a team you made follows the list on screen');
  C.clubPick(C.clubList('sco').at(-1));
  ok(C.draft().club.name === 'My Town' && C.draft().league === 'sco' && />Scotland</.test($('cn-mine').innerHTML), 'picked on Scotland: Scotland\'s Premiership is its league');
  C.clubOpen(); C.poolPick('my');
  ok(C.draft().pool === 'sco', 'no My League to pick without an import');
  T.importer.setLeague({ teams:[0, 1, 2].map(i => ({ id:'IM' + 'ABC'[i], name:'Import ' + 'ABC'[i], kit:'#123456', trim:'#abcdef', pace:3, power:3, handling:3, kicking:3, stamina:3 })) });
  C.tierPick(2); C.poolPick('my');
  ok(!$('cc-league').hidden && C.draft().pool === 'my' && $('cc-grid').innerHTML.includes('>Import A<'), 'with one: My League, its clubs');
  T.importer.setLeague(null); X.restore({ custom:[] });
  // the hub
  C.set(cr); C.open();
  const card = $('cr-card').innerHTML;
  ok(shown() === 's-career' && C.skills().every(([, l]) => card.includes(`>${l}<`)) && card.includes(`>${C.overall(cr.skills)}<`), 'the hub: the player card, his overall and a bar for every skill');
  ok(!card.includes('<img') && $('cr-next').innerHTML.includes('&lt;img src=x&gt;'), 'names are escaped');
  ok($('cr-title').textContent === 'Round 1 of 5' && $('cr-eyebrow').textContent === '<img src=x> · Year 1' && $('cr-line').hidden && !$('cr-table').hidden && !$('cr-trow').classList.contains('one'), 'the club, the year and the round; no line before a match');
  ok(!card.includes('cr-cab'), 'no trophies, no trophy row');
  cr.trained = false; C.trainDone({ id:'defend', stars:3 });
  ok(shown() === 's-career' && $('cr-train').disabled && $('cr-train').textContent === 'Trained' && $('cr-gain').textContent === `+${C.TRAIN[3]} Pace` && !$('cr-gain').hidden, 'after a session: Trained, and what it gave');
  playOut(20, 3); if (L.dilemma(cr)) L.choose(0); C.open();   // a dilemma waiting hides the line (career-life.js): answered first
  ok($('cr-line').textContent === X.standings(cr.season).findIndex(r => r.i === 0) + 1 + ['st', 'nd', 'rd', 'th', 'th', 'th'][X.standings(cr.season).findIndex(r => r.i === 0)] && !$('cr-line').hidden, `after a match: his place (${$('cr-line').textContent})`);
  C.renderTrain();
  ok(C.drills(cr).every(d => $('ct-list').innerHTML.includes(`data-drill="${d.id}"`)), 'the training screen lists the drills');
  C.renderTable();
  ok(($('cl-table').innerHTML.match(/<tr/g) || []).length === 6 && $('cl-eyebrow').textContent === '<img src=x> · Year 1' && !/class="[^"]*up/.test($('cl-table').innerHTML), 'the table has six rows, and no promotion places');
  // the trophy row: a cup a kind, counted, only what he has won
  cr.trophies = [{ kind:'league', year:1, name:'A' }, { kind:'league', year:2, name:'A' }, { kind:'world', year:4, name:'England' }, { kind:'triple', year:5, name:'England' }];
  C.render();
  const cab = ($('cr-card').innerHTML.match(/<p class="cr-cab"[^>]*>[\s\S]*?<\/p>/) || [''])[0];
  ok(/aria-label="Trophies: League 2, World Cup 1, Triple Crown 1"/.test(cab) && (cab.match(/class="cr-cup"/g) || []).length === 3 && /<b>2<\/b>/.test(cab) && $('cr-card').innerHTML.indexOf('cr-cab') < $('cr-card').innerHTML.indexOf('cr-skills'), 'the trophy row under his name: League 2, World Cup 1, Triple Crown 1, in the card\'s header');
  ok(/\.cr-cab\{[^}]*flex-wrap:nowrap[^}]*\}/.test(src) && /data-fit aria-label="Trophies/.test($('cr-card').innerHTML), 'one line, stepped down by careerFit where the card is narrow (it fits 667x375: README)');
  // between phases
  finish(cr, 1); C.open();
  ok(shown() === 's-career-end' && $('ce-title').textContent === 'Grand Slam' && $('ce-title').classList.contains('gold') && /id="ce-go">Continue</.test($('ce-act').innerHTML) && $('ce-body').innerHTML.includes('>Transfers<'), 'a season won: Grand Slam, the next phase (Transfers) and Continue');
  ok($('ce-eyebrow').textContent === '<img src=x> · Year 1' && $('ce-line').textContent === '<img src=x> finish 1st', 'with the club and its place');
  skillsTo(cr, 80); C.renderEnd();
  const picks = () => ($('ce-body').innerHTML.match(/data-n="([A-Z]{3})"/g) || []).map(m => m.slice(8, 11)).join();
  ok($('ce-title').textContent === 'Called Up' && picks() === X.NAT_MEN.join() && $('ce-act').innerHTML === '' && !$('ce-body').innerHTML.includes('cr-tiles'), `called up: all twelve countries are the choice, the men's in table order, with nothing else on the screen (${picks()})`);
  cr.cat = 'women'; C.renderEnd();
  ok(picks() === Object.keys(X.NAT_WOMEN).join() && $('ce-body').innerHTML.includes('>Canada<') && !$('ce-body').innerHTML.includes(' Women<'), `a women's career picks from the women's twelve, by the nation's name (${picks()})`);
  cr.cat = 'men'; skillsTo(cr, 50);
  C.advance(); C.open();
  const body = $('ce-body').innerHTML;
  ok(shown() === 's-career-end' && $('ce-title').textContent === 'Transfer Window' && $('ce-line').textContent === 'Overall ' + C.overall(cr.skills) && $('ce-act').innerHTML === '', 'the transfer window: its title and his overall');
  ok(cr.offers.every(id => body.includes(`data-sign="${id}"`)) && (body.match(/class="team cr-offer"/g) || []).length === cr.offers.length && /class="team cr-offer stay" data-sign="">[\s\S]*?>Stay</.test(body) && body.includes(`style="--n:${cr.offers.length + 1}"`), 'each offer a club\'s card, and his own club\'s to Stay, in equal parts');
  ok(cr.offers.every(id => { const t = X.NATIONAL.flat().find(o => o.id === id); return body.includes('>' + t.name + '<') && body.includes(`>${X.overallOf(t)}<`); }), 'each with its name and rating');
  ok(/'s-career-end':\(\) => \$\('ce-go'\) \|\| \$\('ce-body'\)\.querySelector\('\.stay'\)/.test(src), 'a controller\'s first press in the window lands on Stay');
  C.sign(cr.offers[0]); C.open();
  ok(shown() === 's-career' && cr.year === 2 && $('cr-eyebrow').textContent === cr.club.name + ' · Year 2', 'an offer taken: the hub, year 2 at the new club');
  // a cup on the hub: no table, Train takes the row
  C.setCups(stubCups());
  const b = C.create({ pos:'B', num:7, club:X.ENGLAND[0] }); C.set(b); finish(b, 1); C.advance(); C.open();
  ok(shown() === 's-career' && $('cr-eyebrow').textContent === 'European Cup · Semi-Final' && $('cr-title').textContent === 'Year 1' && $('cr-table').hidden && $('cr-trow').classList.contains('one') && $('cr-line').hidden, 'the European Cup on the hub: its stage, the year, Train across the row');
  C.setCups(false);
  // Start Fresh, and Start New Career between phases: a second tap, after a beat
  C.end();
  ok(C.get() === null && saved().career === null, 'Start Fresh ends the career');
  const realNow = Date.now; let now = 1e12; Date.now = () => now; D.CONFIRM.gap = 500;
  const mash = C.create({ pos:'B', num:4, club:X.CLUBS[0] }); C.set(mash); X.save(); C.open();
  ok(shown() === 's-career' && $('cr-reset').textContent === 'Start Fresh', 'a career under way opens on its hub, with Start Fresh');
  $('cr-reset').click(); now += 120; $('cr-reset').click();
  ok(C.get() === mash && saved().career && shown() === 's-career' && $('cr-reset').textContent === 'Tap Again to Start Fresh', 'Start Fresh tapped twice 120 ms apart only asks: the career stays, saved');
  now += 600; $('cr-reset').click();
  ok(C.get() === null && saved().career === null && shown() === 's-home', 'a second tap after a beat ends it');
  const end = C.create({ pos:'B', num:4, club:X.CLUBS[0] }); C.set(end); X.save(); finish(end, 2); C.open();
  ok(shown() === 's-career-end' && $('ce-new').textContent === 'Start New Career', 'between phases: Start New Career');
  ok(C.restart() === false && C.get() === end && saved().career && $('ce-new').textContent === 'Tap Again to Start New Career' && shown() === 's-career-end', 'one tap only asks again');
  C.renderEnd();
  ok($('ce-new').textContent === 'Start New Career' && C.restart() === false && C.get() === end, 'and drawing the screen again asks again');
  ok((now += 120, C.restart() === false) && C.get() === end, 'tapped twice 120 ms apart it only asks');
  now += 600;
  ok(C.restart() === true && C.get() === null && saved().career === null && shown() === 's-career-new', 'the second tap after a beat ends the career and opens New Player');
  Date.now = realNow; D.CONFIRM.gap = 0;
}

console.log(`Career: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
