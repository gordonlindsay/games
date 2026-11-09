/* =========================================================
   Silverware: the European Cup, the World Cup, the Home Nations Tour and the Triple Crown (README, Silverware).
   A cup is a plain object that saves as it is: its sides, its rounds of fixtures and the results played so far.
   Every random draw happens in cupNew (the draw) or cupRecord (the other matches of a round, and a level knockout's
   toss), never in a render, a save or cleanCup. Championship mode keeps one in `cup` (persistence.js, ui-cups.js);
   Career keeps its own in career.cup. Both play through the same functions.
     cup = { id:'euro'|'world'|'tour', uid, cat, year?, user, teams:[sides], pools?:[[i,j,k] x4],
             fixtures:[[[home, away], ...] a round], results:[[{ h, a, hs, as, ht, at, w?, by? }, ...] a round], round }
   A round's results are in its fixtures' order. A knockout or Test result carries its winner, w; level on points it
   goes to the side with more tries (by:'tries'), then to the toss (by:'toss'). The match you play has the Golden Try
   first (M.cupKO, src/arcade.js), so the toss is rare. Pool matches keep their draws.
   ========================================================= */
const CUPS = {
  euro:{ id:'euro', name:'European Cup', lists:['eng', 'fra', 'cel', 'rsa'] },
  world:{ id:'world', name:'World Cup' },
  tour:{ id:'tour', name:'Home Nations Tour', tests:3, hosts:['NZL', 'RSA', 'AUS'], from:['ENG', 'IRE', 'SCO', 'WAL'] },
};
const CUP_TRIPLE = { name:'Triple Crown', nations:['ENG', 'IRE', 'SCO', 'WAL'] };
/* Each trophy's metal: real silverware, gold or silver, and nothing else. Gold for the three cups; silver for a title (a league, the
   Championship's or a career's, or an international championship) and the Triple Crown. The one map: the Trophy Cabinet's trophies,
   tags and tallies, the career's trophy row and every cup's trophy read it (data-metal, whose tones are styles.css's --gold and
   --silver), and each still names its kind in words. */
const TROPHY_METAL = { league:'silver', euro:'gold', world:'gold', tour:'gold', triple:'silver' };
function trophyMetal(kind) { return TROPHY_METAL[kind] || 'silver'; }   // a declaration: a typeof guard works wherever its file sits. An unknown kind (an entry from before the cups) is a League
/* Each trophy's shape, so the kinds tell apart at a glance in the same metal (the owner, 2026-11-09, shown three gold cups alike on the
   career's row: "different shapes"). A filled silhouette in a 24 by 24 box, read at 10px on the career's row and the Trophy Cabinet's
   tags: a title (a league, the Championship's or a career's, or an international championship, its Grand Slam with it) a shield; the
   European Cup a cup with big handles; the World Cup a cup with a ball on top; the Home Nations Tour a plate on its stand (never a
   plain disc: that is the cabinet's dot for an entry not won); the Triple Crown a crown; the Super Fan's trophy (its kind, 'fan') a
   rosette. The one map: trophyShapeCss makes it a mask for each kind (data-kind), and the
   career's row, the Trophy Cabinet's trophies and tallies, the home's cup notes and a cup's trophy all draw through it, each in its
   kind's metal. A hole is drawn the other way round (the fill is nonzero), so the parts of a shape can overlap. */
const TROPHY_SHAPE = {
  league:{ name:'shield', d:'M2.5 1.5h19v9.6c0 6.4-4.3 9.9-9.5 11.9-5.2-2-9.5-5.5-9.5-11.9z' },
  euro:{ name:'cup with big handles', d:'M7.5 1.5h9c0 5.6-1.3 9.4-3.4 11v5h-2.2v-5c-2.1-1.6-3.4-5.4-3.4-11zM8 18h8l1.6 4.5H6.4zM0.2 6.6a4.4 5.4 0 1 1 8.8 0a4.4 5.4 0 1 1-8.8 0zM2.6 6.6a2 3 0 1 0 4 0a2 3 0 1 0-4 0zM15 6.6a4.4 5.4 0 1 1 8.8 0a4.4 5.4 0 1 1-8.8 0zM17.4 6.6a2 3 0 1 0 4 0a2 3 0 1 0-4 0z' },
  world:{ name:'cup with a ball on top', d:'M5.5 7.2C6 2.1 14.5-1.4 18.5 2C18 7.1 9.5 10.6 5.5 7.2zM5 10h14c0 4.4-2.3 7.1-5.5 7.9v1.8H17v2.8H7v-2.8h3.5v-1.8C7.3 17.1 5 14.4 5 10z' },
  tour:{ name:'plate', d:'M2.4 10a9.6 9.6 0 1 1 19.2 0a9.6 9.6 0 1 1-19.2 0zM4.8 10a7.2 7.2 0 1 0 14.4 0a7.2 7.2 0 1 0-14.4 0zM6 10a6 6 0 1 1 12 0a6 6 0 1 1-12 0zM10.6 19h2.8v1.6h3.1l1.5 2.4H6l1.5-2.4h3.1z' },
  triple:{ name:'crown', d:'M1.5 7.5l5.5 4.8L12 4.5l5 7.8 5.5-4.8-2 11.5h-17zM3.5 20h17v2.5h-17zM0 6.4a1.8 1.8 0 1 1 3.6 0a1.8 1.8 0 1 1-3.6 0zM10 3a2 2 0 1 1 4 0a2 2 0 1 1-4 0zM20.4 6.4a1.8 1.8 0 1 1 3.6 0a1.8 1.8 0 1 1-3.6 0z' },
  fan:{ name:'rosette', d:'M8.6 13.5h3.4L9.2 23.3l-1.9-2.2-2.7 1zM12 13.5h3.4l4 8.8-2.7-1-1.9 2.2zM12 2A1.8 1.8 0 0 1 16.2 3.4A1.8 1.8 0 0 1 18.8 7A1.8 1.8 0 0 1 18.8 11.4A1.8 1.8 0 0 1 16.2 15A1.8 1.8 0 0 1 12 16.4A1.8 1.8 0 0 1 7.8 15A1.8 1.8 0 0 1 5.2 11.4A1.8 1.8 0 0 1 5.2 7A1.8 1.8 0 0 1 7.8 3.4A1.8 1.8 0 0 1 12 2zM7.8 9.2a4.2 4.2 0 1 0 8.4 0a4.2 4.2 0 1 0-8.4 0zM9 9.2a3 3 0 1 1 6 0a3 3 0 1 1-6 0z' },
};
function trophyShape(kind) { return TROPHY_SHAPE[kind] || TROPHY_SHAPE.league; }   // an unknown kind is a League, as its metal is
const trophyMask = kind => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='${trophyShape(kind).d}'/></svg>`)}")`;
/* The page's rules: --trophy, each kind's mask, on everything carrying its data-kind (styles.css draws every trophy through it), a
   League's shield where no kind says otherwise. Put on the page once, by src/ui-cups.js. */
function trophyShapeCss() {
  return `:root{--trophy:${trophyMask('league')}}\n` + Object.keys(TROPHY_SHAPE).map(k => `[data-kind="${k}"]{--trophy:${trophyMask(k)}}`).join('\n');
}
const CUP_SIZE = { euro:4, world:12, tour:2 };             // sides in each
const CUP_MADE = { euro:1, world:3, tour:1 };              // rounds drawn at the start; the rest follow from the results
const CUP_POOL = ['A', 'B', 'C', 'D'];
const CUP_TOUR_SIDE = { id:'HNS', name:'Home Nations', kit:'#c41e3a', trim:'#f2efe6', alt:'#1b2747', altTrim:'#c41e3a' };   // the touring side: red, a code no club or nation has
let cupSerial = 0;                                         // with the time, a cup's uid (the Trophy Cabinet keeps each one once)

const cupFree = list => list.filter(t => t && !t.legend);  // Legends sides (the Locker) never join a draw the player did not pick
const cupTwelve = cat => cupFree(natList(cat)).slice(0, 12);   // the category's twelve, in its table's order
function cupNation(id, cat) { return cupTwelve(cat).find(t => t.id === id) || null; }
function cupListOf(t) {                                    // the European league a side comes from: a built-in side's own list, else none
  if (!t || t.custom) return null;
  const l = TEAM_LISTS.find(x => CUPS.euro.lists.includes(x.key) && x.teams.some(s => s.id === t.id));
  return l ? l.key : null;
}
/* The touring side: each ability the best of the four home nations' on the category's list, capped at 5, in red. */
function cupTourSide(cat) {
  const four = CUPS.tour.from.map(id => cupNation(id, cat)).filter(Boolean);
  const t = { ...CUP_TOUR_SIDE };
  for (const [k] of ABILITIES) t[k] = Math.min(5, Math.max(1, ...four.map(n => abilityOf(n, k))));
  return catSide(t, cat);
}
/* The tour's host: the one asked for, else the next in turn from the caller's counter (New Zealand, South Africa, Australia). */
function cupTourHost(o) {
  const hosts = CUPS.tour.hosts;
  if (hosts.includes(o.host)) return o.host;
  const n = Number.isInteger(o.n) && o.n >= 0 ? o.n : 0;
  return hosts[n % hosts.length];
}
/* A league winner drawn from a list, weighted by rating: a 17 (75) is six times as likely as a 14 (67). */
function cupWeighted(list) {
  const w = list.map(t => Math.max(1, rateOf(t) - 12) ** 2);
  let r = rnd()*w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) { r -= w[i]; if (r < 0) return list[i]; }
  return list[list.length - 1];
}
/* The higher-rated side is at home; level, the better seed (the lower index). A tour's Tests are all at the host's. */
function cupHome(c, x, y) {
  if (c.id === 'tour') return [1, 0];
  const rx = rateOf(c.teams[x]), ry = rateOf(c.teams[y]);
  return rx > ry || (rx === ry && x < y) ? [x, y] : [y, x];
}
/* The World Cup's three pool rounds, from the pools: in yours, the weaker of the other two first and the stronger second,
   so the round you sit out is the last (played for you); in the others the strongest meet last. */
function cupPoolRounds(c) {
  const rounds = [[], [], []];
  for (const [s1, s2, s3] of c.pools) {
    const mine = [s1, s2, s3].includes(c.user), [x, y] = [s1, s2, s3].filter(i => i !== c.user);
    const games = mine ? [[c.user, y], [c.user, x], [x, y]] : [[s2, s3], [s1, s3], [s1, s2]];
    games.forEach((g, r) => rounds[r].push(cupHome(c, g[0], g[1])));
  }
  return rounds;
}

/* A new cup. opts: user (the user's side, already named for its category), cat ('men' | 'women' | 'minis'), year, and for
   the European Cup list (the user's league; else the list his side comes from), for the tour host or n (the caller's count
   of tours, for the host in turn). */
function cupNew(id, opts) {
  const def = CUPS[id], o = opts || {};
  if (!def || !o.user || typeof o.user !== 'object') return null;
  const cat = TEAM_CATS.some(x => x.id === o.cat) ? o.cat : 'men';
  const side = t => cleanSide(t);
  const c = { id, uid:'cup-' + Date.now().toString(36) + '-' + (++cupSerial).toString(36), cat };
  if (Number.isInteger(o.year) && o.year >= 0 && o.year <= 9999) c.year = o.year;
  const me = side(o.user);
  if (!me) return null;
  if (id === 'euro') {
    const mine = def.lists.includes(o.list) ? o.list : cupListOf(o.user);
    let lists = def.lists.filter(k => k !== mine);
    if (lists.length > 3) lists = shuffle(lists.slice()).slice(0, 3);   // a side from no European league: three of the four
    const drawn = lists.map(k => cupWeighted(cupFree(TEAM_LISTS.find(l => l.key === k).teams)));
    Object.assign(c, { user:0, teams:[me, ...drawn.map(t => side(catTeam(t, cat)))] });
    const order = shuffle([0, 1, 2, 3]);
    c.fixtures = [[cupHome(c, order[0], order[1]), cupHome(c, order[2], order[3])]];
  } else if (id === 'world') {
    const list = cupTwelve(cat).map(side);
    let at = list.findIndex(t => t.id === me.id && !me.custom);
    if (at < 0) { list.splice(11, 1, me); at = 11; } else list[at] = me;   // a side not on the list takes the twelfth place
    Object.assign(c, { user:at, teams:list });
    const bands = [0, 4, 8].map(b => shuffle([b, b + 1, b + 2, b + 3]));
    c.pools = CUP_POOL.map((_, p) => [bands[0][p], bands[1][p], bands[2][p]]);
    c.fixtures = cupPoolRounds(c);
  } else {
    const own = !me.custom && CUPS.tour.hosts.includes(me.id);   // a host's own side plays the host; anyone else is on tour
    const hostId = own ? me.id : cupTourHost(o);
    const host = own ? me : side(cupNation(hostId, cat) || natList('men').find(t => t.id === hostId));
    const tourer = !own && me.id === CUP_TOUR_SIDE.id ? me : side(cupTourSide(cat));
    Object.assign(c, { user:own ? 1 : 0, teams:[tourer, host] });   // teams[0] the touring side, teams[1] the host, at home in every Test
    c.fixtures = [[[1, 0]]];
  }
  c.results = []; c.round = 0;
  cupSettle(c);
  return c;
}

const cupKO = (c, k) => c.id !== 'world' || k >= 3;       // every round but the World Cup's pools is a knockout (or a Test)
const cupW = (c, k, i) => c.results[k][i].w;
function cupSeries(c, k = c.results.length) {              // Tests won by each side, [tourer, host], from the first k
  const w = [0, 0];
  for (let r = 0; r < k; r++) for (const m of c.results[r]) w[m.w]++;
  return w;
}
/* Round k's fixtures, from the results of rounds 0 to k-1, for a round made as the cup goes; null when there is none. */
function cupNext(c, k) {
  if (k < CUP_MADE[c.id]) return c.fixtures[k] || null;
  if (c.id === 'euro') return k === 1 ? [cupHome(c, cupW(c, 0, 0), cupW(c, 0, 1))] : null;
  if (c.id === 'tour') { const s = cupSeries(c, k); return k < CUPS.tour.tests && Math.max(...s) < 2 ? [[1, 0]] : null; }
  if (k === 3) {                                           // the Quarter-Finals: A1 v B2, C1 v D2, B1 v A2, D1 v C2
    const t = [0, 1, 2, 3].map(p => cupPoolRows(c, p, 3).map(r => r.i));
    return [[t[0][0], t[1][1]], [t[2][0], t[3][1]], [t[1][0], t[0][1]], [t[3][0], t[2][1]]].map(([x, y]) => cupHome(c, x, y));
  }
  if (k === 4) return [cupHome(c, cupW(c, 3, 0), cupW(c, 3, 1)), cupHome(c, cupW(c, 3, 2), cupW(c, 3, 3))];
  if (k === 5) return [cupHome(c, cupW(c, 4, 0), cupW(c, 4, 1))];
  return null;
}
/* A pool's table over its first k rounds (standings, the league's own points), its three sides only, best first. */
function cupPoolRows(c, p, k = Math.min(3, c.results.length)) {
  const own = c.pools[p], res = [];
  for (let r = 0; r < Math.min(k, 3, c.results.length); r++) res.push(c.results[r].filter(m => own.includes(m.h)));
  return standings({ teams:c.teams, results:res }).filter(r => own.includes(r.i));
}
/* A knockout result: the winner on points, else on tries, else on the toss. */
function cupDecide(m) {
  if (m.hs !== m.as) return { ...m, w:m.hs > m.as ? m.h : m.a };
  if (m.ht !== m.at) return { ...m, w:m.ht > m.at ? m.h : m.a, by:'tries' };
  return { ...m, w:rnd() < 0.5 ? m.h : m.a, by:'toss' };
}
/* Make the next round when the last is done, and play every round the user has no part in: the round of his pool he sits
   out, or the rest of the cup once he is out. */
function cupSettle(c) {
  for (let guard = 0; guard < 8; guard++) {
    if (c.fixtures.length === c.results.length) { const nx = cupNext(c, c.results.length); if (!nx) break; c.fixtures.push(nx); }
    const k = c.results.length, pairs = c.fixtures[k];
    if (pairs.some(p => p.includes(c.user))) break;
    c.results.push(pairs.map(([h, a]) => { const m = simMatch(c, h, a); return cupKO(c, k) ? cupDecide(m) : m; }));
    c.round = c.results.length;
  }
}
function cupStage(c, k) {
  if (c.id === 'euro') return k === 0 ? 'Semi-Final' : 'Final';
  if (c.id === 'tour') return 'Test ' + (k + 1) + ' of ' + CUPS.tour.tests;
  if (k < 3) return 'Pool ' + CUP_POOL[c.pools.findIndex(p => p.includes(c.user))];
  return ['Quarter-Final', 'Semi-Final', 'Final'][k - 3];
}
/* The user's next match, or null when he is out or the cup is over. */
function cupFixture(c) {
  if (!c || !Array.isArray(c.fixtures) || c.round >= c.fixtures.length) return null;
  const k = c.round, pair = c.fixtures[k].find(p => p.includes(c.user));
  if (!pair) return null;
  return { home:pair[0], away:pair[1], opp:pair[0] === c.user ? pair[1] : pair[0], label:cupStage(c, k), ko:cupKO(c, k), round:k };
}
/* The user's match: r = { score:[home, away], tries:[home, away] } in the fixture's order. The rest of the round is simulated,
   the cup moves on, and a cup the user wins tells the Locker once. False when there is nothing to record. */
function cupRecord(c, r) {
  const fx = cupFixture(c);
  if (!fx || !r || !Array.isArray(r.score) || !Array.isArray(r.tries)) return false;
  const hs = ptsOf(r.score[0]), as = ptsOf(r.score[1]), ht = ptsOf(r.tries[0]), at = ptsOf(r.tries[1]);
  if (hs == null || as == null || ht == null || at == null) return false;
  const k = fx.round, ko = fx.ko;
  c.results.push(c.fixtures[k].map(([h, a]) => {
    const m = h === fx.home && a === fx.away ? { h, a, hs, as, ht, at } : simMatch(c, h, a);
    return ko ? cupDecide(m) : m;
  }));
  c.round = c.results.length;
  cupSettle(c);
  if (cupDone(c) && cupWinner(c) === c.user && typeof lockerEvent === 'function') lockerEvent(c.id);
  return true;
}
function cupDone(c) { return !!c && c.results.length === c.fixtures.length && !cupNext(c, c.results.length); }
function cupWinner(c) {
  if (!cupDone(c)) return -1;
  if (c.id === 'tour') { const s = cupSeries(c); return s[0] > s[1] ? 0 : 1; }
  return c.results[c.results.length - 1][0].w;
}
/* Out: beaten in a knockout, not through the pools, or (a tour) the series lost. A lost Test leaves the series alive. */
function cupUserOut(c) {
  if (!c) return false;
  if (cupDone(c)) return cupWinner(c) !== c.user;
  if (c.id === 'tour') return false;
  for (let k = 0; k < c.results.length; k++) if (cupKO(c, k) && c.results[k].some(m => (m.h === c.user || m.a === c.user) && m.w !== c.user)) return true;
  return c.round < c.fixtures.length && cupKO(c, c.round) && !c.fixtures[c.round].some(p => p.includes(c.user));
}
/* How far the user went: Winners (Series Won), Runners-Up, Semi-Finalists, Quarter-Finalists, Pool Stage (Series Lost). */
function cupFinish(c) {
  if (c.id === 'tour') return cupWinner(c) === c.user ? 'Series Won' : 'Series Lost';
  if (cupWinner(c) === c.user) return 'Winners';
  let last = -1;
  c.results.forEach((rd, k) => { if (rd.some(m => m.h === c.user || m.a === c.user)) last = k; });
  const stage = last < 0 ? '' : cupStage(c, last);
  return stage === 'Final' ? 'Runners-Up' : stage === 'Semi-Final' ? 'Semi-Finalists' : stage === 'Quarter-Final' ? 'Quarter-Finalists' : 'Pool Stage';
}
/* The stage now ('Semi-Final', 'Pool B', 'Test 2 of 3'), or, once the user is done, how far he went. */
function cupLabel(c) {
  const fx = cupFixture(c);
  if (fx) return fx.label;
  return cupDone(c) || cupUserOut(c) ? cupFinish(c) : cupStage(c, Math.min(c.round, c.fixtures.length - 1));
}
/* The user's record in the cup: played, won, drawn, lost, points and tries for and against. */
function cupRecordOf(c) {
  const s = { played:0, won:0, drawn:0, lost:0, pointsFor:0, pointsAgainst:0, triesFor:0, triesAgainst:0 };
  for (const rd of c.results) for (const m of rd) {
    if (m.h !== c.user && m.a !== c.user) continue;
    const home = m.h === c.user, us = home ? m.hs : m.as, them = home ? m.as : m.hs;
    s.played++; s[us > them ? 'won' : us < them ? 'lost' : 'drawn']++;
    s.pointsFor += us; s.pointsAgainst += them; s.triesFor += home ? m.ht : m.at; s.triesAgainst += home ? m.at : m.ht;
  }
  return s;
}

/* The Triple Crown: in a six-nation season (championship.js's shape, a nation's own six), a home nation that has beaten each of
   the other three. Read from the results, so it can be asked of a season under way. */
function cupTriple(season) {
  const s = season;
  if (!s || !Array.isArray(s.teams) || !Array.isArray(s.results) || !s.teams[s.user]) return false;
  const ids = CUP_TRIPLE.nations, me = s.teams[s.user];
  if (me.custom || !ids.includes(me.id)) return false;
  const others = ids.filter(id => id !== me.id).map(id => s.teams.findIndex(t => t && t.id === id && !t.custom));
  if (others.some(i => i < 0)) return false;
  const all = s.results.flat();
  return others.every(o => all.some(r => (r.h === s.user && r.a === o && r.hs > r.as) || (r.a === s.user && r.h === o && r.as > r.hs)));
}
/* After a result goes into a six-nation season: true, once, in the round that completed the Triple Crown, telling the Locker. */
function cupTripleAfter(season) {
  if (!cupTriple(season)) return false;
  if (cupTriple({ ...season, results:season.results.slice(0, -1) })) return false;
  if (typeof lockerEvent === 'function') lockerEvent('triple');
  return true;
}

/* A saved cup, rebuilt and checked: the sides through cleanSide, the drawn rounds' shape, every later round remade from the
   results and compared, and each result against its fixture. null for anything that does not hold; a save without one loads
   as it did. */
function cleanCup(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c) || !CUPS[c.id]) return null;
  const n = CUP_SIZE[c.id];
  if (!Array.isArray(c.teams) || c.teams.length !== n || !Number.isInteger(c.user) || c.user < 0 || c.user >= n) return null;
  const teams = c.teams.map(cleanSide);
  if (teams.some(t => !t)) return null;
  if (!Array.isArray(c.fixtures) || !Array.isArray(c.results) || c.round !== c.results.length || c.results.length > c.fixtures.length || c.fixtures.length > 6) return null;
  const out = { id:c.id, uid:typeof c.uid === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(c.uid) ? c.uid : '', cat:TEAM_CATS.some(x => x.id === c.cat) ? c.cat : 'men' };
  if (Number.isInteger(c.year) && c.year >= 0 && c.year <= 9999) out.year = c.year;
  Object.assign(out, { user:c.user, teams });
  const idx = v => Number.isInteger(v) && v >= 0 && v < n;
  const pairOk = p => Array.isArray(p) && p.length === 2 && idx(p[0]) && idx(p[1]) && p[0] !== p[1];
  const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((p, i) => pairOk(b[i]) && p[0] === b[i][0] && p[1] === b[i][1]);
  if (c.id === 'world') {
    if (!Array.isArray(c.pools) || c.pools.length !== 4 || !c.pools.every(p => Array.isArray(p) && p.length === 3 && p.every(idx))) return null;
    const pools = c.pools.map(p => p.slice());
    if (new Set(pools.flat()).size !== 12 || !pools.every(p => p.every((i, b) => Math.floor(i/4) === b))) return null;   // one side of each band
    out.pools = pools;
  }
  out.fixtures = []; out.results = []; out.round = 0;
  const made = c.id === 'world' ? cupPoolRounds(out) : c.id === 'tour' ? [[[1, 0]]] : null;
  if (c.id === 'euro') {
    const f = c.fixtures[0];
    if (!Array.isArray(f) || f.length !== 2 || !f.every(pairOk) || new Set(f.flat()).size !== 4 || !f.every(p => same([cupHome(out, p[0], p[1])], [p]))) return null;
  } else if (c.fixtures.length < made.length || !made.every((rd, k) => same(rd, c.fixtures[k]))) return null;
  for (let k = 0; k < c.fixtures.length; k++) {
    const want = k < CUP_MADE[c.id] ? (made ? made[k] : c.fixtures[0].map(p => p.slice())) : cupNext(out, k);
    if (!want || !same(want, c.fixtures[k]) || (k > out.results.length && k >= CUP_MADE[c.id])) return null;   // a later round only once the one before it is played
    out.fixtures.push(want.map(p => p.slice()));
    if (k >= c.results.length) continue;
    const rd = c.results[k], ko = cupKO(out, k);
    if (!Array.isArray(rd) || rd.length !== want.length) return null;
    const clean = [];
    for (let i = 0; i < rd.length; i++) {
      const m = rd[i], [h, a] = want[i];
      if (!m || typeof m !== 'object' || m.h !== h || m.a !== a) return null;
      const hs = ptsOf(m.hs), as = ptsOf(m.as), ht = ptsOf(m.ht), at = ptsOf(m.at);
      if (hs == null || as == null || ht == null || at == null) return null;
      const r = { h, a, hs, as, ht, at };
      if (ko) {
        const by = hs !== as ? null : ht !== at ? 'tries' : 'toss', w = by === 'tries' ? (ht > at ? h : a) : by ? m.w : hs > as ? h : a;
        if (m.w !== w || (w !== h && w !== a) || (m.by || null) !== by) return null;
        r.w = w; if (by) r.by = by;
      }
      clean.push(r);
    }
    out.results.push(clean); out.round = out.results.length;
  }
  if (out.fixtures.length === out.results.length) { const nx = cupNext(out, out.results.length); if (nx) out.fixtures.push(nx); }   // a missing next round follows from the results
  /* The next unplayed round must be his. One he has no part in (the pool round he sits out, or the rest once he is out) is played by
     cupSettle as soon as it is made, with draws a validator never makes, so a save still holding one could never move on. */
  const next = out.fixtures[out.results.length];
  if (next && !next.some(p => p.includes(out.user))) return null;
  if (!out.uid) out.uid = 'cup-' + cupHash(out);
  return out;
}
function cupHash(c) {                                      // a stable id for a cup saved without one, from its data, never the RNG
  const text = JSON.stringify([c.id, c.user, c.teams, c.pools || null, c.fixtures, c.results]);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}
/* A Trophy Cabinet entry for a finished cup: { kind, id, cup }. League seasons are entries as they always were (kind 'league'). */
function cleanCupEntry(e) {
  if (!e || typeof e !== 'object' || !CUPS[e.kind]) return null;
  const c = cleanCup(e.cup);
  if (!c || c.id !== e.kind || !cupDone(c)) return null;
  return { kind:c.id, id:c.uid, cup:c };
}
