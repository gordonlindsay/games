// Real results, the weekly job's side (README, Real results: the weekly job): the parsers against saved pages, the owner's boost rules and
// window, the validator that refuses a file, the run's refusals, robots.txt, the mapping's completeness against the booted game, the
// results.json in the repository, and the workflow (pull requests only, never main). No network: every page here is a saved, trimmed
// fixture in tools/fixtures/results/, with no person's name, photo or contact in it. Exits 1 on any failure.
// node tools/results.mjs
import fs from 'node:fs';
import * as L from './results/lib.mjs';
import { robotsRules, robotsAllows, cacheKey, Fetcher, GAP_MS, GIVE_UP, MAX_HOPS } from './results/fetch.mjs';
import { pitcheroLeague, wikiLeague, nationEntries, baselineOf, roundEve } from './results/update.mjs';
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
{ // a friendly Pitchero types "Cup" (Gordano v Bath University, 14 Nov) is still a friendly: never a result, never the next fixture
  const raw = nd('pitchero-farnham-fixtures-2026-11-15.html'), fxs = raw.props.initialReduxState.teams.fixtures;
  const [tid, map] = Object.entries(fxs.fixtures)[0], g = Object.values(map).find(x => x && x.dateTime && x.dateTime.startsWith('2026-11-21'));
  const cupFriendly = JSON.parse(JSON.stringify(raw)), cg = Object.values(cupFriendly.props.initialReduxState.teams.fixtures.fixtures[tid]).find(x => x && x.id === g.id);
  Object.assign(cg, { competitionId:'f', type:'Cup', division:null });
  const got = L.pitcheroFixtures(cupFriendly).find(x => x.id === String(g.id));
  eq([got.friendly, got.cup, got.league], [true, false, false], 'a fixture in the Friendlies competition typed Cup is a friendly, not a cup match');
}
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
// a club's own page left behind years ago (13 clubs' pages stopped between 2018 and 2025) is read as no page
const ages = (list, years) => list.map(g => ({ ...g, date:String(+g.date.slice(0, 4) - years) + g.date.slice(4) }));
const stale = pitcheroLeague('Regional 1 South Central', now.rows, { at:'2026-11-14T11:09:22Z', rows:was.rows }, { ...pages, Wimbledon:ages(wimPage, 6) }, here, idOf, '2026-11-15');
eq([stale.entries.WIM && stale.entries.WIM.date, stale.entries.WIM && stale.entries.WIM.f, stale.entries.WIM && stale.entries.WIM.opp], ['2026-11-14', 33, 'BRC'], 'a page that lists nothing this season: the result comes from an opponent\'s page instead');
ok(stale.notes.some(n => /Wimbledon's own page lists nothing this season/.test(n)), 'and the run says so');
const lagging = pitcheroLeague('Regional 1 South Central', now.rows, { at:'2026-11-14T11:09:22Z', rows:was.rows }, { Farnham:farFx.filter(g => g.date < '2026-11-14'), Bracknell:pages.Bracknell }, here, idOf, '2026-11-15');
eq([lagging.entries.FAR && lagging.entries.FAR.date, lagging.entries.FAR && lagging.entries.FAR.f, lagging.entries.FAR && lagging.entries.FAR.a], ['2026-11-14', 38, 34], 'an own page with nothing since last week while its table line has a game more: read from the table line, not the page\'s older result');
const noneHere = pitcheroLeague('Regional 1 South Central', now.rows, { at:'2026-11-14T11:09:22Z', rows:was.rows }, { Wimbledon:ages(wimPage, 6) }, [['WIM', 'Wimbledon']], idOf, '2026-11-15');
ok(!noneHere.entries.WIM || noneHere.entries.WIM.date >= '2026-07-01', 'never a result from an earlier season as a club\'s latest');
// the baseline: a Monday run after Sunday's pull request was merged still reads against last week's table, not the same weekend's
eq([roundEve('2026-11-15'), roundEve('2026-11-16'), roundEve('2026-11-14'), roundEve('2026-11-13'), roundEve('2026-11-18')], ['2026-11-13', '2026-11-13', '2026-11-13', '2026-11-06', '2026-11-13'], 'the eve of the weekend\'s round: the Friday before');
const sunday = { at:'2026-11-15T22:20:00Z', tableId:190924, rows:now.rows, prev:{ at:'2026-11-14T11:09:22Z', rows:was.rows } };
eq(baselineOf(sunday, '2026-11-16', '2026-27', 190924).at, '2026-11-14T11:09:22Z', 'Monday, after the Sunday file was merged: last week\'s table');
eq(baselineOf({ at:'2026-11-14T11:09:22Z', rows:was.rows }, '2026-11-16', '2026-27', 190924).at, '2026-11-14T11:09:22Z', 'Monday, the Sunday file unmerged: last week\'s table, as before');
eq(baselineOf(sunday, '2026-11-22', '2026-27', 190924).at, '2026-11-15T22:20:00Z', 'the next Sunday: the last run\'s table');
const monday = pitcheroLeague('Regional 1 South Central', now.rows, baselineOf(sunday, '2026-11-16', '2026-27', 190924), pages, here, idOf, '2026-11-16');
eq([monday.entries.FAR.prePos, monday.entries.FAR.oppPos, monday.entries.FAR.boost], [6, 8, 1], 'so Monday\'s places before the match are Sunday\'s');
{ // the review's case: 6th beats 3rd, read on Monday after the Sunday file was merged, keeps its +2
  const row = (rank, name, p, pf, pa, hf, af, pts) => ({ rank, name, p, w:p - 1, d:0, l:1, pf, pa, hf, af, pts });
  const nowT = [row(1, 'C', 7, 200, 100, 120, 80, 28), row(2, 'B', 7, 150, 100, 80, 70, 24), row(5, 'A', 7, 140, 120, 80, 60, 20)];
  const weekAgo = { at:'2026-11-08T22:20:00Z', rows:[row(1, 'C', 6, 180, 90, 100, 80, 24), row(3, 'B', 6, 140, 80, 70, 70, 24), row(6, 'A', 6, 120, 110, 60, 60, 16)] };
  const kept = { at:'2026-11-15T22:20:00Z', rows:nowT, prev:weekAgo };
  const pg = { A:[{ date:'2026-11-14', ha:'h', f:20, a:10, opp:'B', league:true }, { date:'2026-11-21', ha:'a', f:null, a:null, opp:'C', league:true }] };
  const e = pitcheroLeague('T', nowT, baselineOf(kept, '2026-11-16', '2026-27'), pg, [['AAA', 'A']], () => null, '2026-11-16').entries.AAA;
  eq([e.why, e.boost, e.prePos, e.oppPos], ['higher', 2, 6, 3], 'a win over a side placed higher stays +2 on the Monday run');
}
eq(baselineOf({ at:'2026-05-02T22:20:00Z', rows:was.rows }, '2026-09-06', '2026-27', 190924), null, 'last season\'s table is no baseline for this one');
eq(baselineOf({ at:'2026-11-14T11:09:22Z', tableId:1, rows:was.rows }, '2026-11-16', '2026-27', 190924), null, 'nor is another table\'s');

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
// a page that lists only some rounds: its own table is updated to 7 Nov, and the 14 Nov round it lists is added to it
const e2 = fx('wikipedia-national-league-2-east-2026-11-15.html'), V2 = { Guernsey:'Guernsey Raiders' };
eq(L.wikiUpdated(e2), '2026-11-07', 'the date the page\'s table is updated to');
eq(L.wikiUpdated(wl), null, 'none on a page that does not say');
const E2 = wikiLeague('National League 2 East', e2, V2, [['DOR', 'Dorking'], ['WPA', 'Westcombe Park'], ['LLI', 'Leicester Lions']], () => null, '2026-11-15');
eq([E2.entries.DOR.p, E2.entries.DOR.pts, E2.entries.DOR.pos, E2.entries.DOR.boost], [10, 37, 4, 2], 'Dorking\'s line after its 36-19 bonus point win on 14 Nov: P10, 37 points, not the page\'s P9 and 32');
eq([E2.entries.WPA.prePos, E2.entries.WPA.oppPos, E2.entries.WPA.boost, E2.entries.WPA.why], [14, 12, 2, 'higher'], 'Westcombe Park, 14th, beat Leicester Lions, 12th, 36-35: +2, the places from the page\'s table before the round');
ok(E2.entries.LLI.p === 10 && E2.entries.LLI.l >= 1, 'the loser\'s line counts the match too');
const e2Undated = wikiLeague('National League 2 East', e2.replace(/Updated to match\(es\) played on [^<]*/, ''), V2, [['DOR', 'Dorking']], () => null, '2026-11-15');
eq([e2Undated.entries.DOR.f, 'league' in e2Undated.entries.DOR, 'prePos' in e2Undated.entries.DOR], [36, false, false], 'with no date under its table: the result, but no line and no places (the table could be from before it)');
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
const U = nationEntries('wru', rw, mw, ['USA', 'ENG'], '2026-10-31', Date.parse('2026-10-31T20:00:00Z'));
eq([U.entries.USA && U.entries.USA.ha, U.entries.ENG && U.entries.ENG.ha], ['h', 'a'], 'USA at home in the United States, England away there (the feed\'s venue is "United States", its team "USA")');

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
bent(['clubs', 'FAR', 'comp'], 'Friendlies', 'a friendly');
const oldGood = JSON.parse(JSON.stringify(good)); Object.assign(oldGood.clubs.FAR, { date:'2019-04-13', from:'2019-04-14', until:'2019-04-19', next:'2019-04-20' });
ok(L.validate(oldGood, G.ids).some(p => /FAR: date 2019-04-13 is more than 60 days/.test(p)), 'refused: a club\'s result from a page left behind years ago');
const nationOld = JSON.parse(JSON.stringify(good)); Object.assign(nationOld.men.ENG, { date:'2026-03-14', from:'2026-03-15', until:'2026-03-21' }); delete nationOld.men.ENG.next;
eq(L.validate(nationOld, G.ids), [], 'a nation\'s last Test may be months back (no Tests between windows)');
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
const jumpy = now.rows.map(r => ({ ...r, p:r.p + 4 }));
ok(L.runProblems({}, null, [{ league:'X', now:jumpy, was:now.rows, days:7 }]).length === 1, 'games played up by 4 in a week for every club is refused');
eq(L.runProblems({}, null, [{ league:'X', now:jumpy, was:now.rows, days:28 }]), [], 'but not against a snapshot four weeks old (pull requests closed since): the limit grows a game a week');
const ageing = { generated:'2026-11-15T22:17:00Z', clubs:many(85), men:{}, women:{} }, prevAged = { generated:'2026-11-08T22:17:00Z', clubs:{ ...many(85), ...Object.fromEntries(G.clubs.slice(85, 100).map(c => [c.id, { ...F, date:'2026-09-05' }])) }, men:{}, women:{} };
eq(L.runProblems(ageing, prevAged), [], 'entries that aged past 60 days are not counted as lost');
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
fs.mkdirSync(tmp + '/old', { recursive:true });
fs.writeFileSync(tmp + '/old/' + cacheKey('https://www.pitchero.com/clubs/farnham') + '.meta', JSON.stringify({ url:'x', status:200, fetched:'2026-11-01T10:00:00Z' }));
fs.writeFileSync(tmp + '/old/' + cacheKey('https://www.pitchero.com/clubs/farnham') + '.html', 'kept');
eq((await new Fetcher({ dir:tmp + '/old', offline:true }).get('https://www.pitchero.com/clubs/farnham')).body, 'kept', 'offline, the cache is read at any age (a week re-run from it)');
{ // a host that stops answering is given up after GIVE_UP failures in a row; nothing is fetched after the deadline; redirects stop at MAX_HOPS
  const fake = (answers, opts = {}) => { const f = new Fetcher({ dir:tmp + '/f' + Math.random().toString(36).slice(2), ...opts }); f.robots.set('www.pitchero.com', { rules:[], delay:0 }); f.pace = async () => {}; f.raw = async u => { f.requests++; return answers(u); }; return f; };
  const down = fake(() => ({ status:0, body:'', error:'ETIMEDOUT' }));
  const realSleep = global.setTimeout; global.setTimeout = (fn) => realSleep(fn, 0);
  try {
    for (let i = 0; i < 4; i++) await down.get('https://www.pitchero.com/clubs/a' + i);
    eq([down.requests, [...down.dead]], [GIVE_UP, ['www.pitchero.com']], `a host that fails ${GIVE_UP} times in a row is given up for the run`);
    const late = fake(() => ({ status:200, body:'x' }), { deadline:Date.now() - 1 });
    eq([(await late.get('https://www.pitchero.com/clubs/b')).status, late.late, late.requests], [0, true, 0], 'nothing is fetched after the run\'s deadline');
    let n = 0;
    const loop = fake(u => ({ status:301, body:'', location:'https://www.pitchero.com/clubs/r' + (++n) }));
    await loop.get('https://www.pitchero.com/clubs/r0');
    ok(loop.requests === MAX_HOPS + 1, `redirects are followed ${MAX_HOPS} times at most (${loop.requests} requests)`);
  } finally { global.setTimeout = realSleep; }
}
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
ok(/if: always\(\)\n\s+run: if \[ -f "\$RUNNER_TEMP\/summary\.md" \]; then cat "\$RUNNER_TEMP\/summary\.md" >> "\$GITHUB_STEP_SUMMARY"/.test(wf), 'a refused run still shows its summary, with why');
ok(/gh pr close "\$old"/.test(wf) && /startswith\(\\"results\/\\"\)/.test(wf) && /headRefName != \\"\$branch\\"/.test(wf), 'an earlier week\'s pull request still open is closed, never this week\'s');

console.log(`${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
