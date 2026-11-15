// Real results, the weekly job's side (README, Real results: the weekly job): the parsers against saved pages, the owner's boost rules and
// window, the validator that refuses a file, the run's refusals, robots.txt, the mapping's completeness against the booted game, the
// results.json in the repository, and the workflow (pull requests only, never main). No network: every page here is a saved, trimmed
// fixture in tools/fixtures/results/, with no person's name, photo or contact in it. Exits 1 on any failure.
// node tools/results.mjs
import fs from 'node:fs';
import * as L from './results/lib.mjs';
import { robotsRules, robotsAllows, cacheKey, Fetcher, GAP_MS } from './results/fetch.mjs';
import { pitcheroLeague, wikiLeague, nationEntries } from './results/update.mjs';
import { gameTeams } from './results/teams.mjs';

let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const FX = new URL('./fixtures/results/', import.meta.url);
const fx = f => fs.readFileSync(new URL(f, FX), 'utf8');
const root = p => new URL('../' + p, import.meta.url);

// 1. Pitchero pages
const nd = f => L.nextData(fx(f));
const tableOf = f => L.pitcheroTables(nd(f)).filter(t => t.season === '2026-27').pop();
const now = tableOf('pitchero-farnham-table-2026-11-15.html'), was = tableOf('pitchero-farnham-table-2026-11-14.html');
eq([now.name, now.rows.length, now.id], ['Regional 1 South Central', 12, 190924], 'this season\'s table on Farnham\'s page');
const far = now.rows.find(r => r.name === 'Farnham');
eq([far.rank, far.p, far.w, far.d, far.l, far.pts, far.own], [5, 7, 4, 0, 3, 16, true], 'Farnham 5th, P7 W4 D0 L3, 16 points, its own row');
eq(was.rows.find(r => r.name === 'Farnham').p, 6, 'the 14 Nov table is the one before the round');
ok(L.pitcheroTables(nd('pitchero-farnham-table-2026-11-15.html')).some(t => t.season === '2025-26'), 'last season\'s table is on the same page');
const club = L.pitcheroClub(nd('pitchero-farnham-table-2026-11-15.html'));
eq([club.folder, L.firstXV(club) && L.firstXV(club).id], ['farnham', 37851], 'Farnham\'s folder and its 1st XV');
eq(L.pitcheroClub(nd('pitchero-not-a-club.html')), null, 'a folder Pitchero does not know is no club');
const farFx = L.pitcheroFixtures(nd('pitchero-farnham-fixtures-2026-11-15.html'));
const last = farFx.filter(g => !g.friendly && !g.off && g.f != null).pop();
eq([last.date, last.ha, last.opp, last.f, last.a, last.league], ['2026-11-14', 'a', 'Old Alleynians', 38, 34, true], 'Farnham won 38-34 away at Old Alleynians on 14 Nov');
ok(farFx.some(g => g.off && g.friendly), 'a postponed pre-season friendly is off and a friendly');
ok(farFx.filter(g => g.friendly).every(g => !g.league), 'friendlies are never league matches');
eq(farFx.find(g => g.date === '2026-09-12' && g.league).f, null, 'a league fixture with no result has no score');
eq(L.firstXV({ teams:[{ id:1, name:'Colts', section:'Juniors' }, { id:2, name:"Men's 1st XV", section:'Senior' }, { id:3, name:'1st XV Ladies', section:'Women' }] }).id, 2, 'the men\'s 1st XV, never the ladies\' or the colts');

// 2. a Pitchero league: own pages, an opponent's page, the change in a table line, places before the match
const pages = { Farnham:farFx, Bracknell:L.pitcheroFixtures(nd('pitchero-bracknell-fixtures-2026-11-15.html')) };
const here = [['FAR', 'Farnham'], ['WIM', 'Wimbledon'], ['BRC', 'Bracknell'], ['SEO', 'Sevenoaks'], ['OAE', 'Old Alleynians'], ['MAI', 'Maidenhead']];   // the game's ids
const idOf = (l, n) => (here.find(c => c[1] === n) || [null])[0];
const R1 = pitcheroLeague('Regional 1 South Central', now.rows, { at:'2026-11-14T11:09:22Z', rows:was.rows }, pages, here, idOf, '2026-11-15');
const F = R1.entries.FAR;
eq([F.date, F.ha, F.res, F.f, F.a, F.opp, F.oppName, F.pos, F.of, F.p, F.w, F.d, F.l, F.pts], ['2026-11-14', 'a', 'W', 38, 34, 'OAE', 'Old Alleynians', 5, 12, 7, 4, 0, 3, 16], 'Farnham\'s entry, the real 14 Nov result');
eq([F.prePos, F.oppPos, F.boost, F.why, F.from, F.until, F.next], [6, 8, 1, 'win', '2026-11-15', '2026-11-20', '2026-11-21'], 'Farnham 6th beat 8th: +1, Sunday to Friday, Brunel next on the 21st');
eq([R1.entries.OAE.res, R1.entries.OAE.boost, R1.entries.OAE.ha], ['L', -1, 'h'], 'Old Alleynians, read from Farnham\'s page: lost at home, -1');
eq([R1.entries.WIM.f, R1.entries.WIM.a, R1.entries.WIM.opp], [33, 24, 'BRC'], 'Wimbledon, read from Bracknell\'s page');
const S = R1.entries.SEO;
eq([S.f, S.a, S.ha, S.oppName, S.opp, S.next, S.until], [32, 27, 'a', 'CS Stags 1863', null, '2026-11-21', '2026-11-20'], 'Sevenoaks, from its table line: the side that mirrors it, away by its home and away points, the league\'s next round');
ok(R1.quiet.includes('MAI'), 'Maidenhead did not play: nothing new, carried over by the run');
eq(R1.problems, [], 'no page disagrees');
const wimPage = [{ id:'x', teamId:1, date:'2026-11-14', ha:'h', opp:'Bracknell', comp:'Regional 1 South Central', league:true, cup:false, friendly:false, off:false, wo:false, f:30, a:24, home:'Wimbledon', away:'Bracknell' }];
const twoScores = pitcheroLeague('Regional 1 South Central', now.rows, { at:'2026-11-14T11:09:22Z', rows:was.rows }, { ...pages, Wimbledon:wimPage }, here, idOf, '2026-11-15');
ok(twoScores.problems.some(p => /Wimbledon v Bracknell on 2026-11-14 is/.test(p)), 'two pages giving one match two scores refuses the run');
const offTable = pitcheroLeague('Regional 1 South Central', now.rows, { at:'2026-11-14T11:09:22Z', rows:was.rows }, { Bracknell:pages.Bracknell.map(g => (g.opp === 'Wimbledon' && g.f != null ? { ...g, f:20 } : g)) }, here, idOf, '2026-11-15');
ok(!offTable.entries.WIM && offTable.notes.some(n => /Wimbledon .* but its table moved/.test(n)), 'a score on another club\'s page that the table does not bear out gives no entry');
const noSnap = pitcheroLeague('Regional 1 South Central', now.rows, null, { Farnham:farFx }, here, idOf, '2026-11-15');
eq([noSnap.entries.FAR.prePos, noSnap.entries.FAR.boost, Object.keys(noSnap.entries).sort()], [undefined, 1, ['FAR', 'OAE']], 'no snapshot: no places before; an opponent\'s page still gives the league\'s latest round');
const noSnapOld = pitcheroLeague('Regional 1 South Central', now.rows, null, { Farnham:farFx.filter(g => g.date < '2026-11-14') }, here, idOf, '2026-11-15');
ok(!noSnapOld.entries.SEO && !noSnapOld.entries.WIM, 'and nothing older than the latest round any page shows, which a club may have played since');
const quietWeek = pitcheroLeague('Regional 1 South Central', now.rows, { at:'2026-11-15T12:00:00Z', rows:now.rows }, { Farnham:farFx }, here, idOf, '2026-11-15');
eq([quietWeek.entries.OAE && quietWeek.entries.OAE.f, quietWeek.entries.OAE && quietWeek.entries.OAE.prePos], [34, undefined], 'a table unchanged since the match: the opponent\'s page stands, with no places before (that table is after it)');

// 3. Wikipedia
const wl = fx('wikipedia-national-league-1-2026-11-15.html');
const wt = L.wikiTable(wl);
eq([wt.length, wt[0].name, wt[0].p, wt[0].pts], [14, 'Plymouth Albion', 9, 45], 'National League 1\'s table');
const wm = L.wikiMatches(wl);
ok(wm.length === 70 && wm.every(m => m.date && m.hs != null), '70 matches, each with a date and a score');
const camb = wm.find(m => m.home === 'Camborne' && m.away === 'Bishops Stortford');
eq([camb.date, camb.hs, camb.as, camb.hbp, camb.abp], ['2026-11-07', 66, 35, 1, 1], 'a Rugbybox: the date, the score and both bonus points');
const V = { 'Bishops Stortford':"Bishop's Stortford", Sale:'Sale FC' };
const NL1 = wikiLeague('National League 1', wl, V, [['RAM', 'Rams'], ['CAM', 'Cambridge']], () => null, '2026-11-15');
eq([NL1.entries.RAM.res, NL1.entries.RAM.f, NL1.entries.RAM.a, NL1.entries.RAM.prePos, NL1.entries.RAM.oppPos, NL1.entries.RAM.boost, NL1.entries.RAM.why], ['W', 35, 31, 12, 2, 2, 'higher'], 'Rams, 12th, beat 2nd placed Camborne by 4: +2');
eq([NL1.entries.CAM.p, NL1.entries.CAM.pos, NL1.entries.CAM.pts, NL1.entries.CAM.until], [10, 14, 7, '2026-11-20'], 'the table built from the results; no next fixture listed, so 6 days');
const noVariant = wikiLeague('National League 1', wl, {}, [['RAM', 'Rams']], () => null, '2026-11-15');
ok(noVariant.refused && !Object.keys(noVariant.entries).length, 'a name the table does not hold, with no variant, refuses the league');
const t = L.tableFrom([{ date:'2026-09-05', home:'A', away:'B', hs:20, as:18, hbp:0, abp:1 }, { date:'2026-09-12', home:'B', away:'C', hs:40, as:0, hbp:1, abp:0 }], ['A', 'B', 'C']);
eq([...t.values()].map(r => [r.name, r.pos, r.pts]), [['A', 2, 4], ['B', 1, 6], ['C', 3, 0]], 'a table from results: 4 a win, and the bonus points the page marks (B: a losing bonus, then a win with a try bonus)');
eq([...L.tableFrom([], ['X'], null).values()][0].p, 0, 'no results, no games');

// 4. World Rugby
const rk = JSON.parse(fx('worldrugby-rankings-mru.json')), mt = JSON.parse(fx('worldrugby-match-mru-england.json')).content;
const N = nationEntries('mru', rk, mt, ['ENG', 'JPN'], '2026-11-15', Date.parse('2026-11-15T20:00:00Z'));
eq([N.entries.ENG.date, N.entries.ENG.ha, N.entries.ENG.f, N.entries.ENG.a, N.entries.ENG.opp, N.entries.ENG.rank, N.entries.ENG.oppRank, N.entries.ENG.boost, N.entries.ENG.why], ['2026-11-14', 'h', 78, 15, 'JPN', 5, 12, 2, 'big'], 'England 78-15 Japan: +2, the rankings in force at kick-off');
eq([N.entries.JPN.res, N.entries.JPN.boost, N.entries.JPN.ha], ['L', -1, 'a'], 'Japan, the same Test from the other side');
const rw = JSON.parse(fx('worldrugby-rankings-wru.json')), mw = JSON.parse(fx('worldrugby-match-wru.json')).content;
const W = nationEntries('wru', rw, mw, ['ENG', 'CDN', 'NZL', 'FRA'], '2026-11-15', Date.parse('2026-11-15T20:00:00Z'));
ok(W.entries.CDN && !W.entries.CAN, 'the feed\'s Canada is the game\'s CDN, never CAN (Canberra)');
ok(Object.values(W.entries).every(e => e.comp === 'Test' && e.src === 'worldrugby'), 'women\'s Tests only, never a club match in the same feed');

// 5. the owner's rules
const B = (o) => { const b = L.boostOf(o); return [b.boost, b.why]; };
eq(B({ f:20, a:10 }), [1, 'win'], 'a win is +1');
eq(B({ f:25, a:10 }), [2, 'big'], 'by 15 is +2');
eq(B({ f:24, a:10 }), [1, 'win'], 'by 14 is +1');
eq(B({ f:20, a:10, prePos:6, oppPos:3, preP:5, oppPreP:5 }), [2, 'higher'], 'over a side placed higher is +2');
eq(B({ f:20, a:10, prePos:6, oppPos:3, preP:1, oppPreP:1 }), [1, 'win'], 'nobody is higher placed in the first two rounds');
eq(B({ f:20, a:10, prePos:3, oppPos:6 }), [1, 'win'], 'over a side placed lower is +1');
eq(B({ f:40, a:10, prePos:6, oppPos:3 }), [2, 'big'], 'both together are still +2');
eq(B({ f:10, a:20 }), [-1, 'loss'], 'a loss is -1');
eq(B({ f:15, a:15 }), [0, 'draw'], 'a draw is 0');
eq(B({ f:28, a:0, wo:true }), [0, 'none'], 'a walkover gives nothing');
eq(B({ f:20, a:10, rank:9, oppRank:4 }), [2, 'higher'], 'a nation over a higher ranked one is +2');
eq(L.windowOf('2026-11-14', '2026-11-21'), { from:'2026-11-15', until:'2026-11-20' }, 'Saturday to the next Saturday: Sunday to Friday');
eq(L.windowOf('2026-11-14', null), { from:'2026-11-15', until:'2026-11-20' }, 'no next fixture known: 6 days');
eq(L.windowOf('2026-11-14', '2026-12-05'), { from:'2026-11-15', until:'2026-11-21' }, 'a long gap: 7 days at most');
eq(L.windowOf('2026-11-14', '2026-11-15'), null, 'the next fixture the next day: no window');
const emptyWin = L.entryOf({ date:'2026-11-14', ha:'h', f:30, a:3, oppName:'X', comp:'Y', next:'2026-11-15', src:'pitchero' });
eq([emptyWin.boost, emptyWin.why], [0, 'none'], 'an empty window gives no boost');
eq([L.ukDate('2026-11-14T23:30:00Z'), L.ukDate('2026-07-14T23:30:00Z')], ['2026-11-14', '2026-07-15'], 'UK dates: GMT in winter, BST in summer');
eq([L.seasonOf('2026-11-15'), L.seasonOf('2027-05-01'), L.seasonOf('2027-07-01')], ['2026-27', '2026-27', '2027-28'], 'the club season');
eq(['Farnham R.U.F.C.', "St Benedict's", 'St Ives (SW)', 'Chinnor II', 'Aylesbury Men I'].map(L.normName), ['farnham', 'st benedicts', 'st ives', 'chinnor ii', 'aylesbury'], 'names for exact matching only: a 2nd XV stays apart');
eq(L.leagueName('Counties 1 Tribute Ale Western North'), 'Counties 1 Western North', 'no sponsor in a league\'s name');

// 6. the validator
const G = gameTeams();
const good = { v:1, generated:'2026-11-15T22:17:00Z', season:'2026-27', clubs:{ FAR:F, OAE:R1.entries.OAE }, men:{ ENG:N.entries.ENG }, women:{} };
eq(L.validate(good, G.ids), [], 'a good file passes');
const bent = (path, v, why) => {
  const f = JSON.parse(JSON.stringify(good));
  let o = f; for (const k of path.slice(0, -1)) o = o[k];
  if (v === undefined) delete o[path[path.length - 1]]; else o[path[path.length - 1]] = v;
  ok(L.validate(f, G.ids).length > 0, `refused: ${why}`);
};
bent(['v'], 2, 'another version');
bent(['generated'], '2026-11-15', 'a generated that is not a UTC time');
bent(['generated'], '2026-02-30T10:00:00Z', 'a time that does not exist');
bent(['clubs'], [], 'clubs not an object');
bent(['clubs', 'ZZZ'], F, 'an unknown id');
bent(['clubs', 'ENG'], F, 'a nation as a club');
bent(['men', 'CAN'], N.entries.ENG, 'Canberra\'s code as a nation');
bent(['clubs', 'FAR', 'date'], '2026-11-16', 'a date after generated');
bent(['clubs', 'FAR', 'date'], '2026-11-31', 'a date that does not exist');
bent(['clubs', 'FAR', 'f'], 201, 'a score over 200');
bent(['clubs', 'FAR', 'f'], 3.5, 'a score that is not whole');
bent(['clubs', 'FAR', 'ha'], 'n', 'a club at a neutral ground');
bent(['clubs', 'FAR', 'res'], 'L', 'a result the score does not give');
bent(['clubs', 'FAR', 'boost'], 2, 'a boost that does not match the score');
bent(['clubs', 'FAR', 'why'], 'big', 'big under 15');
bent(['clubs', 'OAE', 'boost'], 1, 'a loss with a plus');
bent(['clubs', 'FAR', 'oppName'], '<b>Old Alleynians</b>', 'HTML in a name');
bent(['clubs', 'FAR', 'oppName'], 'x'.repeat(41), 'a name over 40');
bent(['clubs', 'FAR', 'comp'], 'y'.repeat(61), 'a competition over 60');
bent(['clubs', 'FAR', 'opp'], 'XYZ', 'an opponent the game does not hold');
bent(['clubs', 'FAR', 'pos'], 13, 'a place below the league');
bent(['clubs', 'FAR', 'w'], 5, 'W + D + L not P');
bent(['clubs', 'FAR', 'pts'], undefined, 'a part table line');
bent(['clubs', 'FAR', 'until'], '2026-11-22', 'a window past 7 days');
bent(['clubs', 'FAR', 'until'], '2026-11-21', 'a window into the next fixture');
bent(['clubs', 'FAR', 'from'], '2026-11-14', 'a window from the match day');
bent(['clubs', 'FAR', 'src'], 'bbc', 'an unknown source');
bent(['clubs', 'FAR', 'extra'], 1, 'an unknown key');
bent(['clubs', 'FAR', 'rank'], 3, 'a ranking on a club');
bent(['men', 'ENG', 'pos'], 3, 'a table on a nation');
bent(['clubs', 'FAR', 'oppPos'], 5, 'higher placed opponent given +1');
bent(['men', 'ENG', 'oppRank'], 5, 'two sides on one ranking');
const wo = { ...F, f:28, a:0, res:'W', wo:true, boost:0, why:'none' };
eq(L.validate({ ...good, clubs:{ FAR:wo } }, G.ids), [], 'a walkover: Won, no boost');
eq(L.validate({ ...good, clubs:{ FAR:{ ...wo, boost:1, why:'win' } } }, G.ids).length > 0, true, 'a walkover with a boost is refused');

// 7. the run's refusals
const many = n => Object.fromEntries(G.clubs.slice(0, n).map(c => [c.id, F]));
ok(L.runProblems({ clubs:many(89), men:{}, women:{} }, { clubs:many(100), men:{}, women:{} }).length === 1, 'fewer than 90% of last week\'s clubs is refused');
eq(L.runProblems({ clubs:many(90), men:{}, women:{} }, { clubs:many(100), men:{}, women:{} }), [], '90% is enough');
const back = was.rows.map(r => ({ ...r })); back[0].p -= 1; back[1].p -= 1;
const fwd = now.rows.map(r => ({ ...r }));
eq(L.runProblems({}, null, [{ league:'X', now:fwd, was:now.rows }]), [], 'the same table is no problem');
ok(L.runProblems({}, null, [{ league:'X', now:back, was:now.rows }]).length === 1, 'games played going backwards for two clubs is refused');
eq(L.runProblems({}, null, [{ league:'X', now:back, was:now.rows }], ['X']), [], 'unless overrides.json lets that league shrink (a club withdrawn)');
const one = now.rows.map(r => ({ ...r })); one[0].p -= 1;
eq(L.runProblems({}, null, [{ league:'X', now:one, was:now.rows }]), [], 'one club going back (a result struck off) is allowed');
ok(L.runProblems({ generated:'2026-11-08T22:17:00Z', clubs:{}, men:{}, women:{} }, { generated:'2026-11-15T22:17:00Z', clubs:{}, men:{}, women:{} }).length === 1, 'an older run than the file held is refused');

// 8. polite fetching
const rr = robotsRules(fx('pitchero-robots.txt'));
eq(rr.delay, 5, 'Pitchero\'s Crawl-delay is read');
ok(robotsAllows(rr, '/clubs/farnham/teams/37851/league-table') && !robotsAllows(rr, '/divisionadmin/x') && !robotsAllows(rr, '/ct/1'), 'robots.txt: /clubs/ allowed, its Disallow lines honoured');
const wr = robotsRules('User-agent: *\nDisallow: /w/\nDisallow: /api/\nAllow: /w/load.php\n');
ok(robotsAllows(wr, '/wiki/2026%E2%80%9327_Champ_Rugby') && !robotsAllows(wr, '/w/api.php?x') && robotsAllows(wr, '/w/load.php'), 'Wikipedia: /wiki/ only, never /w/ (the longest match wins)');
ok(GAP_MS >= 5000, 'at least 5 seconds between requests to a host');
eq(L.UA, 'TryLineRugby', 'the User-Agent names nobody');
const src = ['lib.mjs', 'fetch.mjs', 'update.mjs', 'discover.mjs', 'teams.mjs'].map(f => fs.readFileSync(new URL('./results/' + f, import.meta.url), 'utf8')).join('\n');
ok(!/@[a-z0-9-]+\.[a-z]{2,}/i.test(src.replace(/41898282\+github-actions\[bot\]@users\.noreply\.github\.com/g, '')) && !/['"](cookie|authorization|proxy-authorization)['"]\s*:|password|token/i.test(src), 'no email address, cookie, login or token anywhere in the job');
eq(cacheKey('https://www.pitchero.com/clubs/farnham/teams/37851/league-table'), 'www.pitchero.com_clubs_farnham_teams_37851_league-table', 'the cache key matches the research cache\'s');
const tmp = fs.mkdtempSync('/tmp/results-check-');
const fe = new Fetcher({ dir:tmp, offline:true });
let refused = false; try { await fe.get('https://www.example.com/x'); } catch (e) { refused = /not a host/.test(e.message); }
ok(refused, 'a host the job does not read is refused before any request');
eq((await fe.get('https://www.pitchero.com/clubs/farnham')).status, 0, 'offline: nothing fetched');
eq(fe.requests, 0, 'no request made');
fs.rmSync(tmp, { recursive:true, force:true });

// 9. the fixtures carry no person
for (const f of fs.readdirSync(FX)) {
  const s = fx(f);
  ok(!/referee|attendance|squad|player|coach|captain|@[a-z]|tel:|mailto:|"image"|\.jpg|\.png/i.test(s), `fixture ${f} has no person, photo or contact`);
}

// 10. the mapping, against the booted game
process.env.SEED ??= '31';
const { T } = await import('./harness.mjs');
const X = T.teams;
const builtIn = new Set(X.ALL_TEAMS.filter(t => !X.isNation(t)).map(t => t.id));
ok([...G.ids.clubs].every(id => builtIn.has(id)), 'every club gathered is a built-in club of the game');
eq([...G.ids.men].sort(), X.natList('men').map(t => t.id).sort(), 'the men\'s twelve are natList(\'men\')');
eq([...G.ids.women].sort(), X.natList('women').map(t => t.id).sort(), 'the women\'s twelve are natList(\'women\')');
const local = JSON.parse(fs.readFileSync(root('docs/clubs-local.json'), 'utf8')).counties.flatMap(c => c.clubs.map(x => x.id));
ok(local.every(id => G.ids.clubs.has(id)) && X.ENGLAND.every(t => G.ids.clubs.has(t.id)) && X.ENGLAND_TWO.every(t => G.ids.clubs.has(t.id)), 'Premiership, Championship and every Regional 1, Regional 2 and Counties 1 club are gathered');
for (const own of ['HAS', 'ALD', 'KIN', 'GDN', 'EFF', 'WAN', 'EGH', 'MER', 'MIT', 'FEL']) ok(!G.ids.clubs.has(own), `${own}, below Counties 1, is not gathered`);
const M = JSON.parse(fs.readFileSync(root('docs/results-clubs.json'), 'utf8'));
const placed = Object.keys(M.clubs), unm = M.unmapped.map(u => u.id);
eq([...placed, ...unm].sort(), [...G.ids.clubs].sort(), 'every club is placed or listed as unmapped, once');
ok(placed.every(id => M.leagues[M.clubs[id].league]), 'every placed club\'s league is in the mapping');
ok(Object.values(M.leagues).every(l => l.src === 'wikipedia' ? !!l.wiki : l.via && l.via.length && Number.isInteger(l.tableId)), 'every league says where it is read');
ok(placed.length >= 0.9*G.ids.clubs.size, `at least 90% of the clubs are placed (${placed.length} of ${G.ids.clubs.size})`);
const seenTeam = new Set();
for (const [id, c] of Object.entries(M.clubs)) { const k = `${c.league}|${c.team}`; ok(!seenTeam.has(k), `${id}: no two clubs share "${c.team}"`); seenTeam.add(k); }
for (const [id, names] of Object.entries(JSON.parse(fs.readFileSync(new URL('./results/aliases.json', import.meta.url), 'utf8')).ids)) {
  ok(X.ENGLAND.concat(X.ENGLAND_TWO).some(t => t.id === id), `alias ${id} is a top-two-tier side`);
  if (M.clubs[id]) ok(names.includes(M.clubs[id].team), `${id} is placed by its alias`);
}
eq(M.clubs.SAL && M.clubs.SAL.team, 'Sale Sharks', 'Sale is Sale Sharks, never Sale FC');
eq(M.clubs.LNO && M.clubs.LNO.team, 'Saracens', 'London North is Saracens');
eq(M.clubs.FAR && [M.clubs.FAR.league, M.clubs.FAR.folder, M.clubs.FAR.team1], ['Regional 1 South Central', 'farnham', 37851], 'Farnham: its league and its own site');

// 11. results.json in the repository
const file = root('results.json');
if (fs.existsSync(file)) {
  const R = JSON.parse(fs.readFileSync(file, 'utf8'));
  eq(L.validate(R, G.ids), [], 'results.json passes every check');
  ok(Object.keys(R.clubs).every(id => M.clubs[id]), 'every club in results.json is placed in the mapping');
  ok(fs.statSync(file).size <= L.MAX_BYTES, 'results.json is under 300 KB');
} else ok(true, 'no results.json yet');

// 12. the workflow: two scheduled runs, a pull request, never main
const wf = fs.readFileSync(root('../.github/workflows/tryline-results.yml'), 'utf8');
ok(/cron: '17 22 \* \* 0'/.test(wf) && /cron: '43 8 \* \* 1'/.test(wf) && /workflow_dispatch:/.test(wf), 'Sunday 22:17 and Monday 08:43 UTC, and by hand');
ok(/contents: write/.test(wf) && /pull-requests: write/.test(wf), 'it may write a branch and open a pull request');
ok(/timeout-minutes: 60/.test(wf), 'an hour at most');
ok(/gh pr create --base main/.test(wf) && /gh pr edit/.test(wf), 'it opens, or updates, a pull request to main');
ok(/Try Line results: week of \$week/.test(wf), 'titled by the week');
const pushes = wf.split('\n').filter(l => /git push/.test(l));
ok(pushes.length === 1 && /HEAD:refs\/heads\/\$branch/.test(pushes[0]), 'its one push is to its own branch');
ok(/branch="results\/\$week"/.test(wf) && /case "\$branch" in results\/20/.test(wf), 'the branch is results/<date> and nothing else');
ok(!/\bmain\b.*git push|git push[^\n]*\bmain\b|HEAD:main|refs\/heads\/main/.test(wf), 'never pushes to main');
ok(!/secrets\.(?!GITHUB_TOKEN)/.test(wf) && /github\.token/.test(wf), 'no secret but the run\'s own token');
ok(/ref: main/.test(wf), 'it builds on main');

console.log(`${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
