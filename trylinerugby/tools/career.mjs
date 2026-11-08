// Career: one player from the minis to the national team. Creation, stages and promotion, training and match deeds,
// the engine's career gate, championship isolation, the save and the screens.
// node tools/career.mjs   Exits 1 on any failure.
process.env.SEED ??= '29';
const { T, reseed, rndCalls, bot } = await import('./harness.mjs');
const { readGameSource } = await import('./source.mjs');
const C = T.career, X = T.teams, D = T.debug, $ = id => document.getElementById(id);
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const json = v => JSON.stringify(v);
const json2 = v => JSON.parse(JSON.stringify(v));   // a plain copy, as a save reads back
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };

// 0. Non-career matches are unchanged. The fingerprint below is these seeded matches on the commit before the career
//    (bc8fabf): two AI v AI matches, an arcade match you play and a plain one, both played by the harness's bot. Run first,
//    so nothing earlier in this file can move them. If another change moves non-career play on purpose, re-pin it from
//    that change's bundle without the career sources.
const BASE = '1vg5qro 1uombq7 12cy4qs';   // re-pinned at the Stamina merge: the arcade match moved because Stamina acts in arcade matches; the Stamina-only build (30e61ad) gives the same value, so the career still changes no non-career play
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
{ const qsa = document.querySelectorAll, mine = ['s-career-new', 's-career', 's-career-train', 's-career-table', 's-career-end'];
  document.querySelectorAll = sel => (sel === '.screen' ? qsa(sel).concat(mine.map(id => $(id))) : qsa(sel)); }
const shown = () => ['s-home', 's-career-new', 's-career', 's-career-train', 's-career-table', 's-career-end'].find(id => !$(id).hidden);
const keys = C.skills().map(([k]) => k);
// every game won by the higher-ranked side, the user ranked `place`: a finished season with a known table
function finish(cr, place) {
  const c = cr.season, order = [1, 2, 3, 4, 5]; order.splice(place - 1, 0, c.user);
  const rk = i => order.indexOf(i);
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
  ok(o >= 55 && o <= 66, `a new player is about the Minis sides' overall (${o})`);
  ok(C.overall(Object.fromEntries(keys.map(k => [k, 1]))) === 40 && C.overall(Object.fromEntries(keys.map(k => [k, 99]))) === 99, 'the overall runs 40 to 99, like the team cards');
  const c = a.season;
  ok(a.stage === 0 && c && c.round === 0 && c.user === 0 && c.teams.length === 6 && c.fixtures.length === 5, 'a career starts with a Minis season of six sides and five rounds');
  ok(c.fixtures.every(rd => rd.length === 3 && rd.filter(p => p.includes(0)).length === 1), 'your side plays once a round');
  ok(new Set(c.fixtures.map(rd => rd.find(p => p.includes(0)).find(i => i))).size === 5, 'and everyone else once');
  ok(json(C.clean(a)) === json(a), 'a new career passes its own validator unchanged');
}

// 2. the stages' sides
{
  const FAR = X.CLUBS[0], cr = C.create({ pos:'B', num:4, club:FAR });
  const minis = C.teamFor(cr, 0), juniors = C.teamFor(cr, 1);
  ok(minis.name === 'Farnham' && ['pace', 'power', 'handling', 'kicking'].every(k => minis[k] === Math.max(1, FAR[k] - 1)), 'Minis: your club, one off every ability');
  ok(juniors.pace === FAR.pace - 1 && juniors.power === FAR.power - 1 && juniors.handling === FAR.handling && juniors.kicking === FAR.kicking, 'Juniors: one off Pace and Power');
  const opp = cr.season.teams.slice(1);
  ok(opp.every(t => X.CLUBS.some(k => k.id === t.id && t.pace === Math.max(1, k.pace - 1))) && !opp.some(t => t.id === 'FAR'), 'Minis opponents are five other Local clubs, lowered too');
  const ratings = [0, 1, 2, 3, 4].flatMap(s => [C.teamFor({ ...cr, pro:'TLS', country:'SCO' }, s), ...C.opponents({ ...cr, pro:'TLS', country:'SCO' }, s)]);
  ok(ratings.every(t => ['pace', 'power', 'handling', 'kicking'].every(k => Number.isInteger(t[k]) && t[k] >= 1 && t[k] <= 5)), 'every side at every stage keeps whole abilities from 1 to 5');
  const county = C.teamFor(cr, 2), counties = C.opponents(cr, 2);
  ok(county.name === 'Surrey' && counties.map(t => t.id).join() === 'KEN,SSX,HAM,MDX,BRK', 'County: Surrey against the five invented county sides');
  const four = t => t.pace + t.power + t.handling + t.kicking;
  ok(C.COUNTIES.every(t => !X.ALL_TEAMS.some(o => o.id === t.id) && four(t) >= 11 && four(t) <= 14), 'county codes are new to the scoreboard, and rated like the Local clubs');
  const pro = C.teamFor({ ...cr, pro:'SYD' }, 3), pros = C.opponents({ ...cr, pro:'SYD' }, 3);
  ok(pro.name === 'Sydney' && pros.length === 5 && pros.every(t => X.AUSTRALIA.some(a => a.id === t.id) && t.id !== 'SYD'), 'Pro Club: your city side against five others from its list');
  const nat = C.teamFor({ ...cr, country:'WAL' }, 4), nats = C.opponents({ ...cr, country:'WAL' }, 4);
  ok(nat.name === 'Wales' && X.rateOf(nat) === X.rateOf(X.NATIONS[5]) && nats.map(t => t.id).join() === 'ENG,FRA,IRE,ITA,SCO', 'International: your country against the other five, at full strength');
  const mine = { id:'MYT', name:'My Town Minis', kit:'#c8102e', trim:'#f2efe6', custom:true, key:'my1', pace:5, power:5, handling:3, kicking:1 };
  const own = C.create({ pos:'F', num:3, club:mine });
  ok(own.season.teams[0].name === 'My Town Minis' && own.season.teams[0].kicking === 1 && own.season.teams[0].pace === 4, 'a team you made (or imported) can be the club');
}

// 2b. Men | Women, the national leagues and the twelve nations
{
  const FAR = X.CLUBS[0], men = C.create({ pos:'B', num:4, club:FAR }), women = C.create({ pos:'B', num:4, club:FAR, cat:'women' });
  ok(men.cat === 'men' && C.create({ pos:'B', num:4, club:FAR, cat:'minis' }).cat === 'men' && C.create({ pos:'B', num:4, club:FAR, cat:'x' }).cat === 'men', 'Men unless Women is picked: Career has no Minis');
  ok(women.cat === 'women' && women.season.teams.every(t => t.cat === 'women' && / Women$/.test(t.name)) && women.season.teams[0].name === 'Farnham Women', `a women's career names every side for it (${women.season.teams.map(t => t.name).join(', ')})`);
  ok(men.season.teams.every(t => !('cat' in t) && !/ Women$/.test(t.name)), 'a men\'s career is named as before');
  const R = ['pace', 'power', 'handling', 'kicking', 'stamina'], same = (a, b) => R.every(k => a[k] === b[k]) && a.id === b.id && a.kit === b.kit;
  ok([0, 1, 2, 3, 4].every(st => same(C.teamFor({ ...women, pro:'TLS', country:'NZL' }, st), C.teamFor({ ...men, pro:'TLS', country:'NZL' }, st))), 'and changes nothing else: ratings, codes and kits are the men\'s at every stage');
  ok(C.teamFor({ ...women, country:'FIJ' }, 4).name === 'Fiji Women' && C.opponents({ ...women, stage:2 }, 2).every(t => / Women$/.test(t.name)), 'the County sides and the nations too');
  ok(C.clean({ ...json2(men), cat:undefined }).cat === 'men' && C.clean({ ...json2(women) }).cat === 'women' && C.clean({ ...json2(women), cat:'minis' }).cat === 'men', 'the save keeps Women; a career from before it, or a bad value, is Men');
  ok(C.clean(json2(women)).season.teams[0].cat === 'women', 'a saved season keeps its names and category');
  // Pro Club: every national league
  ok(X.NATIONAL.length === 8 && [X.ENGLAND, X.FRANCE, X.CELTIC, X.SCOTLAND, X.SOUTH_AFRICA, X.AUSTRALIA, X.NEW_ZEALAND, X.JAPAN].every(l => X.NATIONAL.includes(l)), 'the national leagues are England, France, Celtic and Italy, Scotland, South Africa, Australia, New Zealand and Japan');
  const signed = new Set();
  for (let i = 0; i < 400; i++) { const p = C.create({ pos:'B', num:5, club:FAR }); p.stage = 2; C.newSeason(p); finish(p, 1); C.set(p); C.advance(); signed.add(X.NATIONAL.findIndex(l => l.some(t => t.id === p.pro))); }
  ok(signed.size === 8 && !signed.has(-1), `going up signs a side from any national league, Scotland's included (${[...signed].sort().join(' ')})`);
  for (const [id, list] of [['BTH', X.ENGLAND], ['GLA', X.CELTIC], ['AYR', X.SCOTLAND], ['AKL', X.NEW_ZEALAND], ['KOB', X.JAPAN], ['TLS', X.FRANCE], ['ADL', X.AUSTRALIA]]) {
    const pros = C.opponents({ ...men, pro:id }, 3);
    ok(C.teamFor({ ...men, pro:id }, 3).id === id && pros.length === 5 && pros.every(t => list.some(a => a.id === t.id) && t.id !== id), `Pro Club at ${id}: five others from its own league`);
  }
  ok(C.clean({ ...json2(men), stage:3, pro:'LNO' }).pro === 'LNO' && C.clean({ ...json2(men), stage:3, pro:'SYD' }).pro === 'SYD' && C.clean({ ...json2(men), stage:3, pro:'KEL' }).pro === 'KEL', 'a new league\'s side, and an old one, are kept in the save');
  // International: twelve to pick from, a season against the other five of its six
  const nz = C.opponents({ ...men, country:'NZL' }, 4);
  ok(nz.map(t => t.id).join() === 'RSA,AUS,ARG,FIJ,JPN', `New Zealand plays the other five of the second six (${nz.map(t => t.id).join()})`);
  ok(C.opponents({ ...men, country:'ENG' }, 4).map(t => t.id).join() === 'FRA,IRE,ITA,SCO,WAL', 'England still plays the Six Nations');
  ok(C.clean({ ...json2(men), stage:4, country:'JPN' }).country === 'JPN', 'a call-up to a new nation is kept');
  const cr = C.create({ pos:'B', num:6, club:FAR }); C.set(cr); cr.stage = 3; C.newSeason(cr); finish(cr, 1); C.advance('ARG');
  ok(cr.stage === 4 && cr.country === 'ARG' && cr.season.teams[0].name === 'Argentina' && cr.season.teams.length === 6, 'picking Argentina starts an International season as Argentina');
  C.set(null);
}

// 3. promotion
{
  const cr = C.create({ pos:'B', num:6, club:X.CLUBS[1] }); C.set(cr);
  finish(cr, 2);
  let out = C.outcome(cr);
  ok(out.place === 2 && out.top && !out.bar && out.promoted && !out.final, 'second place goes up');
  const firstId = cr.season.id;
  ok(C.advance() && cr.stage === 1 && cr.season.round === 0 && cr.season.id !== firstId && cr.history.length === 1 && cr.history[0].up && cr.history[0].place === 2, 'Next Season: Juniors, with the Minis season in the history');
  finish(cr, 3);
  out = C.outcome(cr);
  ok(out.place === 3 && !out.promoted, `third with an overall under the bar (${out.ovr} < ${C.STAGES[1].bar}) plays the stage again`);
  C.advance();
  ok(cr.stage === 1 && cr.history.length === 2 && !cr.history[1].up && cr.season.teams[0].name === 'Haslemere', 'a repeat is a new Juniors season for the same club');
  for (const k of keys) cr.skills[k] = 80;
  finish(cr, 6);
  out = C.outcome(cr);
  ok(out.place === 6 && out.bar && out.promoted, 'last, but with the overall at the bar: up anyway');
  C.advance();
  ok(cr.stage === 2 && cr.season.teams[0].name === 'Surrey', 'County: Surrey');
  // County to Pro Club through real matches: the last game signs you, so the season's end can name the club
  finish(cr, 1); cr.season.round = 4; cr.season.results.pop();
  for (const k of keys) cr.skills[k] = 50;
  playOut(30, 0);
  ok(cr.season.round === 5 && C.outcome(cr).place === 1 && C.outcome(cr).promoted && /^[A-Z]{3}$/.test(cr.pro), `winning the County signs a Pro Club side (${cr.pro})`);
  const pro = cr.pro;
  C.advance();
  ok(cr.stage === 3 && cr.season.teams[0].id === pro, 'Pro Club: the side you signed for');
  finish(cr, 2);
  C.advance('IRE');
  ok(cr.stage === 4 && cr.country === 'IRE' && cr.season.teams[0].name === 'Ireland' && cr.season.teams.slice(1).every(t => X.NATIONS.some(n => n.id === t.id)), 'called up: the country you pick, against the other nations');
  finish(cr, 6);
  out = C.outcome(cr);
  ok(out.final && !out.promoted, 'the International season is the last');
  ok(!C.advance() && cr.stage === 4 && cr.season.round === 5, 'and nothing comes after it');
  // a call-up with no country picked is England; a bad pick too
  const b = C.create({ pos:'B', num:5, club:X.CLUBS[0] }); C.set(b); b.stage = 3; C.newSeason(b); finish(b, 1);
  C.advance('XYZ');
  ok(b.stage === 4 && b.country === 'ENG', 'a call-up with no valid pick is England');
  const p = C.create({ pos:'B', num:5, club:X.CLUBS[0] }); C.set(p); p.stage = 2; C.newSeason(p); finish(p, 1);
  C.open();
  const shownPro = p.pro;
  ok(/^[A-Z]{3}$/.test(shownPro) && $('ce-body').innerHTML.includes(C.teamFor(p, 3).name), `a season's end going up to Pro Club names the side you sign for (${shownPro})`);
  C.advance();
  ok(p.stage === 3 && p.pro === shownPro && p.season.teams[0].id === shownPro, 'and that is the side you play for');
  C.set(null);
  ok(C.STAGES.length === 5 && C.STAGES.slice(0, 4).every((s, i, a) => !i || s.bar > a[i - 1].bar) && C.STAGES[4].bar == null, 'five stages, the bar rising, none after International');
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
  // the drill list: only drills that exist, never Driving in the Minis
  const have = C.drillIds();
  ok(C.drills(cr).every(d => have.includes(d.id)) && C.drills(cr).length === have.filter(id => id in map).length - (cr.stage === 0 && have.includes('scrum') ? 1 : 0), `the training list is the drills that exist (${C.drills(cr).map(d => d.id)})`);
  ok(!C.drills({ stage:0 }).some(d => d.id === 'scrum'), 'no Driving in the Minis');
  if (have.includes('scrum')) ok(C.drills({ stage:1 }).some(d => d.id === 'scrum'), 'Driving from the Juniors on');
  if (have.includes('circle')) ok(json(C.drills(cr).find(d => d.id === 'circle').skills) === '["stamina","handling"]', 'the circle shows both skills');
  cr.trained = false;
  ok(!C.train('nothing-here'), 'a drill that does not exist cannot start');
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
  C.advance();
  ok(json(X.champ()) === champBefore && json(saved().champ) === champBefore, 'a whole career season leaves a running championship as it was');
  ok(json(saved().champHistory) === histBefore && saved().seasonSerial === serial, 'and its history and season count');
  ok(cr.history.length === 1 && cr.stage === 1, 'while the career moved on');
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
  // old saves
  const old = { settings:{ half:1, diff:2, sound:false }, champ:null, custom:[{ name:'Old Club', id:'OLD', kit:'#123456', trim:'#abcdef', pace:2, power:2, handling:2, kicking:2 }], champHistory:[], seasonSerial:4 };
  C.set(null); X.restore(JSON.parse(json(old)));
  ok(C.get() === null && D.settings().diff === 2 && X.custom()[0].name === 'Old Club', 'a save from before the career loads as it did, with no career');
  C.set(cr); X.restore({ settings:{ sound:true } });
  ok(C.get() === cr, 'a partial restore leaves the career alone');
  X.restore({ career:null });
  ok(C.get() === null, 'a saved null is no career');
  const good = JSON.parse(json(cr));
  X.restore({ champ:null, career:{ ...good, pos:'Hooker' } });
  ok(C.get() === null, 'a broken career is dropped');
  X.newChamp(X.NATIONS[0], X.NATIONS.slice(1)); const champ0 = json(X.champ());
  X.restore({ career:{ ...good, club:null } });
  ok(C.get() === null && json(X.champ()) === champ0, 'and the championship is kept');
  X.restore({ career:{ ...good, stage:9 } }); ok(C.get() === null, 'a stage that does not exist is dropped');
  X.restore({ career:[] }); ok(C.get() === null, 'so is a list');
  X.restore({ career:{ ...good, season:{ ...good.season, fixtures:[] } } });
  const kept = C.get();
  ok(kept && kept.season === null && kept.name === 'Isla' && json(kept.skills) === json(cr.skills), 'a broken season drops the season, never the player');
  C.open();
  ok(kept.season && kept.season.round === 0 && kept.stage === good.stage && shown() === 's-career', 'and the hub draws a new one for the same stage');
  X.restore({ career:{ ...good, skills:{ pace:150, power:-3, handling:'x', kicking:42.6 }, num:2, name:'<b>Bo</b>', trained:'yes', totals:{ matches:-1, tries:2.5, tackles:3 } } });
  const k = C.get();
  ok(k.skills.pace === 99 && k.skills.power === 1 && k.skills.handling === 38 && k.skills.kicking === 43 && k.skills.stamina === 34, `skills are held to 1 to 99, a missing one takes the start value (${json(k.skills)})`);
  ok(k.num === 4 && k.name === 'bBob' && k.trained === false && k.totals.matches === 0 && k.totals.tries === 0 && k.totals.tackles === 3 && k.totals.goals === 0, 'the number, name, session and totals are put right');
  X.restore({ career:{ ...good, history:[{ stage:0, name:'Farnham', place:2, up:true, w:4, d:0, l:1 }, { stage:7 }, null, 'x', ...Array(60).fill({ stage:1, name:'Farnham', place:4, up:false, w:2, d:0, l:3 })] } });
  ok(C.get().history.length === 40 && C.get().history.every(h => h.stage === 1), 'history keeps the latest 40 good entries');
  X.restore({ career:{ ...good, stage:4, country:'XYZ', pro:'NOPE' } });
  ok(C.get().country === 'ENG' && C.get().pro === null, 'an unknown country or club is put right');
  // the save consumes no RNG and practice never writes it
  C.set(cr); X.save();
  const r0 = rndCalls(); X.save(); X.renderHome(); C.renderHome();
  ok(rndCalls() === r0, 'saving and the home screen draw no random numbers with a career under way');
  const w0 = writes, m0 = memory['tryline.v1'];
  T.practice.start('defend'); X.save(); C.record(); C.trainDone({ id:'defend', stars:3 }); T.practice.leave();
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
  ok(labels.length >= 15 && labels.every(titled), `every career label is Title Case (${labels.filter(l => !titled(l)).join(', ') || labels.length + ' labels'})`);
  const row = src.match(/<div class="row2 home-row">([\s\S]*?)<div class="row2 learn-row">/);
  const at = id => row[1].indexOf('id="' + id + '"');
  ok(row && at('b-champ') >= 0 && at('b-champ') < at('b-career') && at('b-career') < at('b-two') && !/career-row/.test(src), 'Career sits beside Championship in the home row, Two Player after them (the orchestrator\'s layout at merge)');
  ok(/\.home-row \.col\{display:flex;/.test(src) && !/\.home-row \.col\{grid-column:1\/-1/.test(src) && /body\.desk \.home-row\{grid-template-columns:1fr 1fr 1fr\}/.test(src), 'equal halves on a phone, thirds with Two Player on a desk');
  ok(!/[\u2190-\u2199\u21d0-\u21d9]/.test(career), 'no arrow glyph on the career screens');
  for (const id of ['s-career-new', 's-career', 's-career-train', 's-career-table', 's-career-end'])
    ok(new RegExp(`id="${id}"[\\s\\S]*?data-back>Back to (Menu|Career)<`).test(html), `${id} has a Back to Menu or Back to Career button`);
  ok(/id="cr-play">Play Match</.test(career) && /<div class="row2"><button class="btn" id="cr-train">Train<\/button><button class="btn" id="cr-table">Table<\/button><\/div>/.test(career), 'the hub: Play Match on its own, Train and Table as equal halves');
  // home
  C.set(null); C.renderHome();
  ok($('b-career').textContent === 'Career' && $('career-note').hidden, 'home: Career, with no note before a career starts');
  const cr = C.create({ name:'Isla', pos:'B', num:7, club:{ id:'XSS', name:'<img src=x>', kit:'#123456', trim:'#abcdef', custom:true, pace:3, power:3, handling:3, kicking:3 } });
  C.set(cr); X.renderHome();
  ok($('b-career').textContent === 'Continue Career' && !$('career-note').hidden && $('career-note').innerHTML === 'Minis · <span class="rn-name">&lt;img src=x&gt; · </span>Round 1 of 5', 'with one: Continue Career, the stage, the club (escaped, in a span a phone held sideways leaves out) and the round');
  // the new player screen
  C.set(null); C.newOpen();
  ok(shown() === 's-career-new' && /Farnham/.test($('cn-clubs').innerHTML) && /data-n="4"/.test($('cn-num').innerHTML) && !/data-n="3"/.test($('cn-num').innerHTML), 'New Player: the clubs, and a back\'s numbers to start');
  ok(C.draft().cat === 'men' && /<div class="field"><span class="lbl">Team<\/span><div class="seg" id="cn-cat"><button>Men<\/button><button>Women<\/button><\/div><\/div>/.test(html), 'Team is Men | Women, two equal buttons, Men first and picked');
  C.catPick(1);
  ok(C.draft().cat === 'women', 'Women picks it');
  $('cn-go').click();
  ok(C.get() && C.get().cat === 'women' && C.get().season.teams[0].name === 'Farnham Women' && saved().career.cat === 'women', 'Start Career starts a women\'s career, and saves it');
  C.set(null); C.newOpen();
  ok(C.draft().cat === 'men', 'a new player starts on Men again');
  // the hub
  C.set(cr); C.open();
  const card = $('cr-card').innerHTML;
  ok(shown() === 's-career' && C.skills().every(([, l]) => card.includes(`>${l}<`)) && card.includes(`>${C.overall(cr.skills)}<`), 'the hub: the player card, his overall and a bar for every skill');
  ok(!card.includes('<img') && $('cr-next').innerHTML.includes('&lt;img src=x&gt;'), 'names are escaped');
  ok($('cr-title').textContent === 'Round 1 of 5' && $('cr-eyebrow').textContent === 'Minis · Season 1' && $('cr-line').textContent === 'Top Two or Overall 64 to Go Up', 'the stage, the round and what it takes to go up');
  cr.trained = false; C.trainDone({ id:'defend', stars:3 });
  ok(shown() === 's-career' && $('cr-train').disabled && $('cr-train').textContent === 'Trained' && $('cr-gain').textContent === `+${C.TRAIN[3]} Pace` && !$('cr-gain').hidden, 'after a session: Trained, and what it gave');
  C.renderTrain();
  ok(C.drills(cr).every(d => $('ct-list').innerHTML.includes(`data-drill="${d.id}"`)), 'the training screen lists the drills');
  C.renderTable();
  ok(($('cl-table').innerHTML.match(/<tr/g) || []).length === 6, 'the table has six rows');
  // the season's end
  finish(cr, 1); C.open();
  ok(shown() === 's-career-end' && $('ce-title').textContent === 'Champions' && /Next Season/.test($('ce-act').innerHTML), 'a won season: Champions and Next Season');
  cr.stage = 3; C.newSeason(cr); finish(cr, 2); C.renderEnd();
  ok($('ce-title').textContent === 'Called Up' && ($('ce-body').innerHTML.match(/data-n="/g) || []).length === 12 && $('ce-act').innerHTML === '', 'called up: all twelve countries are the choice');
  cr.stage = 4; cr.country = 'ENG'; C.newSeason(cr); finish(cr, 4); C.renderEnd();
  ok($('ce-title').textContent === 'Hall of Fame' && /Start New Career/.test($('ce-act').innerHTML), 'the end of the career: Hall of Fame and Start New Career');
  cr.stage = 1; C.newSeason(cr); finish(cr, 5); C.renderEnd();
  ok($('ce-title').textContent === 'One More Season' && /Again/.test($('ce-body').innerHTML), 'a season that does not go up: One More Season');
  C.end();
  ok(C.get() === null && saved().career === null, 'Start Fresh ends the career');
  // Start New Career on the Hall of Fame wipes the honours, so it takes a second tap
  const hof = C.create({ pos:'B', num:4, club:X.CLUBS[0] }); C.set(hof); X.save();
  hof.stage = 4; hof.country = 'ENG'; C.newSeason(hof); finish(hof, 1); C.open();
  ok(shown() === 's-career-end' && $('ce-title').textContent === 'Hall of Fame', 'a finished career opens on the Hall of Fame');
  ok(C.restart() === false && C.get() === hof && saved().career && $('ce-go').textContent === 'Tap Again to Start New Career' && shown() === 's-career-end', 'one tap of Start New Career only asks again');
  C.renderEnd();
  ok(C.restart() === false && C.get() === hof, 'and drawing the Hall of Fame again asks again');
  ok(C.restart() === true && C.get() === null && saved().career === null && shown() === 's-career-new', 'the second tap ends the career and opens New Player');
  // a quick double tap (a child mashing the button, or one tap read twice) only asks: the second tap counts once CONFIRM.gap has passed
  const realNow = Date.now; let now = 1e12; Date.now = () => now; D.CONFIRM.gap = 500;
  const mash = C.create({ pos:'B', num:4, club:X.CLUBS[0] }); C.set(mash); X.save(); C.open();
  ok(shown() === 's-career' && $('cr-reset').textContent === 'Start Fresh', 'a career under way opens on its hub, with Start Fresh');
  $('cr-reset').click(); now += 120; $('cr-reset').click();
  ok(C.get() === mash && saved().career && shown() === 's-career' && $('cr-reset').textContent === 'Tap Again to Start Fresh', 'Start Fresh tapped twice 120 ms apart only asks: the career stays, saved');
  now += 600; $('cr-reset').click();
  ok(C.get() === null && saved().career === null && shown() === 's-home', 'a second tap after a beat ends it');
  const hof2 = C.create({ pos:'B', num:4, club:X.CLUBS[0] }); C.set(hof2); X.save();
  hof2.stage = 4; hof2.country = 'ENG'; C.newSeason(hof2); finish(hof2, 1); C.open();
  ok(C.restart() === false && (now += 120, C.restart() === false) && C.get() === hof2, 'Start New Career tapped twice 120 ms apart only asks');
  now += 600;
  ok(C.restart() === true && C.get() === null, 'and after a beat it starts again');
  Date.now = realNow; D.CONFIRM.gap = 0;
}

console.log(`Career: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
