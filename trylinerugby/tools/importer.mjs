// Import: every parser path on the fixtures in tools/fixtures/import, link checking, the safeguarding filter, the
// native fetch path (a stubbed window.Capacitor), the web message, the save, old saves and the My League list.
// node tools/importer.mjs
import fs from 'node:fs';
process.env.SEED ??= '23';
const { T, rndCalls } = await import('./harness.mjs');
const I = T.importer, X = T.teams, D = T.debug, $ = id => document.getElementById(id);
let passed = 0;
const ok = (test, message) => { if (!test) throw Error(message); passed++; };
const fx = f => fs.readFileSync(new URL('./fixtures/import/' + f + '.html', import.meta.url), 'utf8');
const tick = () => new Promise(r => setTimeout(r, 0));
const memory = {};
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; } };
const saved = () => JSON.parse(memory['tryline.v1']);
const PIT = 'https://www.pitchero.com/clubs/bracknell';
const names = list => list.map(t => t.name).join(',');

// 1. links: http(s) only, normalised, nothing local or odd
{
  const yes = [
    [PIT, PIT],
    ['  http://WWW.Pitchero.com/clubs/bracknell/teams/3100#top  ', PIT + '/teams/3100'],
    ['www.pitchero.com/clubs/bracknell', PIT],
    ['pitchero.com/clubs/bracknell?utm_source=whatsapp&fbclid=abc&season=97473', 'https://pitchero.com/clubs/bracknell?season=97473'],
    ['Our table: https://www.pitchero.com/clubs/bracknell/teams/3100/league-table see you Sunday', PIT + '/teams/3100/league-table'],
    ['https://www.pitchero.com:443/clubs/bracknell', PIT],
    ['http://www.bracknellrugbyclub.com/teams/3100', 'https://www.bracknellrugbyclub.com/teams/3100'],
  ];
  for (const [inp, out] of yes) ok(I.url(inp) === out, `link ${JSON.stringify(inp)} becomes ${out} (${I.url(inp)})`);
  const no = ['', '   ', null, 42, {}, 'javascript:alert(1)', 'JavaScript:alert(1)', ' data:text/html,<b>x</b>', 'file:///etc/passwd', 'ftp://example.com/x',
    'mailto:a@example.com', 'about:blank', 'chrome://settings', 'blob:https://example.com/x', 'http://localhost/x', 'localhost:8080', 'http://127.0.0.1/x', 'https://0x7f.0.0.1/',
    'https://192.168.1.10/table', 'http://[::1]/x', 'https://user:pass@example.com/', 'https://example.com:8080/x', 'https://intranet/x', 'https://printer.local/x',
    'https://router.home/x', 'not a link', 'https://example.com/' + 'x'.repeat(3000)];
  for (const inp of no) ok(I.url(inp) === null, `link ${JSON.stringify(String(inp).slice(0, 60))} is refused`);
}

// 2. every parser path
const P = (f, url) => I.parse(fx(f), url);
{
  const home = P('pitchero-home', PIT);
  ok(home.source === 'pitchero' && home.club.name === 'Bracknell RFC' && home.club.kit === '#399913' && home.club.trim === '#e4c200', 'Pitchero club home: the club and its colours from props.club');
  ok(!home.teams.length && !home.league.length, 'a club home names no league and no opponents (its own sections are not opponents)');
  const lg = P('pitchero-league', PIT + '/teams/3100/league-table');
  ok(names(lg.league) === 'Sevenoaks,Tunbridge Wells,London Scottish Lions,Wimbledon,Farnham,Bracknell', `Pitchero league table in rank order (${names(lg.league)})`);
  const s7 = lg.league[0];
  ok(s7.played === 6 && s7.won === 6 && s7.drawn === 0 && s7.lost === 0 && s7.points === 24, 'values read by column key, drew as drawn');
  ok(s7.kit === null && lg.league[1].kit === '#002d57' && lg.league[1].trim === '#debe00', 'the grey placeholder pair is no colour; real colours are kept, lower case');
  ok(lg.league.filter(r => r.own).map(r => r.name).join() === 'Bracknell', 'is_highlighted marks the club\'s own row, and only it');
  const old = I.parse(fx('pitchero-safeguarding').replace('"seasonId":97473', '"seasonId":93909'), PIT + '/teams/3100/league-table');
  ok(names(old.league) === 'Old Season Side', 'the table is the one for the page\'s seasonId');
  const none = I.parse(fx('pitchero-league').replace('"seasonId":97473', '"seasonId":1'), PIT + '/teams/3100/league-table');
  ok(none.league.length === 6, 'an unknown season falls back to the newest table');
  const fix = P('pitchero-fixtures', PIT + '/teams/3100/fixtures-results');
  ok(names(fix.teams) === 'Hornets RFC,Farnham,Sevenoaks' && !fix.league.length, `Pitchero fixtures: the opponents in date order (${names(fix.teams)})`);
  ok(fix.teams[1].kit === '#3d3d3d' && fix.teams[1].trim === '#ffc927' && fix.teams[0].kit === null, 'an opponent\'s colours come from the side it played as');
  ok(!fix.teams.some(t => /XV|Bracknell/.test(t.name)), 'the club\'s own sides (1st XV, Bracknell) are not opponents');
  const empty = P('pitchero-minis-empty', PIT + '/teams/3487/fixtures-results');
  ok(empty.club.name === 'Bracknell RFC' && !empty.teams.length && !empty.league.length, 'a minis team with no fixtures still gives the club');
  const darl = P('pitchero-minis-friendlies', 'https://www.pitchero.com/clubs/darlingtonrfc/teams/14605/fixtures-results');
  ok(darl.club.name === 'Darlington RFC' && names(darl.teams) === 'Stockton,Barnard Castle', 'minis friendlies give their opponents, never the U10s label');
  const own = P('pitchero-league', 'https://www.bracknellrugbyclub.com/teams/3100/league-table');
  ok(own.source === 'pitchero' && own.league.length === 6, 'a Pitchero club on its own domain is known by its page');
  const plain = P('generic-tournament', PIT + '/teams/3100/league-table');
  ok(plain.source === 'pitchero' && plain.league.length > 0 && plain.club.name === 'Riverside RFC', 'a Pitchero page without its JSON falls back to the tables and meta tags');
  const next = I.SOURCES[0].next(I.doc(fx('pitchero-home')), 'https://www.pitchero.com/en_GB/clubs/bracknell');
  ok(next.map(s => s.kind + ' ' + s.href).join() === `league ${PIT}/teams/3100/league-table,fixtures ${PIT}/teams/3100/fixtures-results`, `from a club home (locale dropped), the first team with a table (${JSON.stringify(next)})`);
  const next2 = I.SOURCES[0].next(I.doc(fx('pitchero-fixtures')), PIT + '/teams/3100/fixtures-results');
  ok(next2.length === 1 && next2[0].kind === 'league', 'a fixtures page offers its league table, not itself');

  const tour = P('generic-tournament', 'https://www.riversiderfc.example.com/spring-cup');
  ok(tour.source === 'generic' && tour.club.name === 'Riverside RFC' && tour.club.kit === '#7a1f2b' && tour.club.trim === null, 'tournament page: the club from og:site_name, its colour from theme-color');
  ok(names(tour.league) === 'Hillside Hawks,Riverside U16,Kingsmead Rugby Football Club,Valley Vipers', `the standings table with the club in it (Pool B) (${names(tour.league)})`);
  ok(tour.league[1].own && tour.league.filter(r => r.own).length === 1 && tour.league[0].drawn === 1 && tour.league[0].points === 10, 'its own row and full-word headers');
  ok(names(tour.teams) === 'Northbridge,Westbrook Wolves,Lakeside,Eastfield Eagles', `the other sides: fixtures Home and Away, then JSON-LD competitors, no placeholders (${names(tour.teams)})`);
  const pools = I.parse(fx('generic-tournament').replace(/<meta property="og:site_name"[^>]*>/, '').replace('| Riverside RFC', ''), 'https://www.riversiderfc.example.com/spring-cup');
  ok(names(pools.league) === "Northbridge,Eastfield Eagles,Old Mill & District,St Bede's,Westbrook Wolves", `no club named: the biggest table, a crest cell spanned, entities decoded, (Hosts) dropped (${names(pools.league)})`);
  const ld = P('generic-jsonld', 'https://www.hilltophawks.example.com/');
  ok(ld.club.name === 'Hilltop Hawks RFC' && ld.club.kit === '#0f5a32' && !ld.league.length && !ld.teams.length, 'JSON-LD: the page\'s own SportsTeam, not the league it belongs to');
  const nx = P('generic-next', 'https://aldervale.example.org/');
  ok(nx.club.name === 'Alder Vale RFC' && nx.club.kit === '#1b2747' && nx.club.trim === '#f2b01e', 'another Next.js site: a club object with colors');
  ok(names(nx.league) === 'Alder Vale,Beech Green,Cedar Park,Damson Hill' && nx.league[0].own && nx.league[1].points === 13, 'its standings, team.name and stats nested');
  ok(names(nx.teams) === 'Elm Bridge,Fir Tree', 'opponents from homeTeam and awayTeam, the club\'s U12s left out');
  const fl = P('generic-flight', 'https://juniper.example.org/tables');
  ok(fl.club.name === 'Juniper RFC' && fl.club.kit === '#5b2d8e' && names(fl.league) === 'Gorse Lane,Heath End,Ivy Bank' && fl.league[0].drawn === 1, 'app-router flight data: rows with p w d l pts, an rgb() colour');
  const blank = P('generic-empty', 'https://blank.example.org/');
  ok(blank.club === null && !blank.teams.length && !blank.league.length, 'an empty page gives nothing (Welcome is not a club)');
  for (const bad of [null, 42, '', '<script id="__NEXT_DATA__" type="application/json">{"props":', '<table><tr><th>Team<th>W<th>L<th>Pts<tr><td>A', 'x'.repeat(4000000)]) {
    const r = I.parse(bad, PIT);
    ok(r && Array.isArray(r.teams) && Array.isArray(r.league), 'broken or huge input parses to an empty result without throwing');
  }
  const hostile = '<svg'.repeat(60000) + '<table><tr><td>'.repeat(20000) + '<a href=x>'.repeat(60000) + '<!--'.repeat(20000) + '<title>'.repeat(20000) + '<script>self.__next_f.push([1,"'.repeat(5000);
  const t0 = Date.now(); I.parse(hostile, PIT); I.parse('\u0130'.repeat(1000) + fx('pitchero-league'), PIT);
  ok(Date.now() - t0 < 3000, `a page of unclosed tags parses in one pass (${Date.now() - t0}ms)`);
  const stall = { 'a':'<a '.repeat(40000), 'meta':'<meta '.repeat(40000), 'table':'<table '.repeat(40000), 'script':'<script '.repeat(40000), 'tr':'<table>' + '<tr '.repeat(40000) + '</table>',
    'title':'<title>' + '<'.repeat(200000) + '</title>', 'cell':'<table><tr><th>Team<th>W<th>L<th>Pts<tr><td>' + '<x'.repeat(100000) + '</table', 'name':'<table><tr><th>Team<th>W<th>L<th>Pts<tr><td>' + '('.repeat(200000) + '<td>1<td>2<td>3</table>',
    'window blob in blob':'<script>' + 'window.__a__=['.repeat(20000) + ']'.repeat(20000) + '</script>', 'flight push in push':'<script>' + 'self.__next_f.push(['.repeat(20000) + ']'.repeat(20000) + '</script>' };
  for (const [k, page] of Object.entries(stall)) { const t1 = Date.now(); I.parse(page, PIT); ok(Date.now() - t1 < 1000, `${k}: a page built to stall the parser reads in one pass (${Date.now() - t1}ms)`); }
  ok(I.parse('\u0130'.repeat(5000) + fx('pitchero-league'), PIT + '/teams/3100/league-table').league.length === 6, 'characters that change length when lower-cased do not shift the parse');
  ok(I.parse('<title>Fixtures | Ash Grove RFC</title>', 'https://ashgrove.example.org/fixtures').club.name === 'Ash Grove RFC' && I.parse('<title>Ash Grove Rugby Club</title>', 'https://ashgrove.example.org/').club.name === 'Ash Grove Rugby Club', 'a title names the club in the part that says it is one');
  ok(I.parse('<title>Zara Fakeperson</title>', 'https://club.example.org/team/zara-fakeperson').club === null && I.parse('<meta property="og:title" content="Arlo Plantedkid">', 'https://club.example.org/player-profile/arlo-plantedkid/').club === null, 'a title with no club word names no club');
  ok(I.short('London Scottish Lions') === 'London Scottish' && I.short('Old Whitgiftian RFC') === 'Old Whitgiftian' && I.short('Old Mill & District') === 'Old Mill' && I.short('Supercalifragilistic') === 'Supercalifragili' && I.short('Bracknell RFC') === 'Bracknell RFC', 'names fit a card: the suffix, then whole words');
}

// 3. safeguarding: nothing about a person reaches a result, the save or the screen
{
  const PEOPLE = ['testplayer', 'tinyplayer', 'plantedname', 'coachperson', 'fakename', 'byline', 'madeup', 'notreal', 'statsname', 'organiserperson', 'soloathlete',
    'taylor p', 'j smith', 'joe s', 'example.com', 'example.org', '07700', '@', '.jpg', '.png', 'http', 'captain', 'coach', 'secretary', 'logo',
    'fakeperson', 'plantedkid', 'notachild', 'inventedname', 'madeupname', 'testsurname', 'pretendperson', 'imaginaryname'];
  const ROW = ['name', 'played', 'won', 'drawn', 'lost', 'points', 'kit', 'trim', 'own'];
  const urls = { 'pitchero-safeguarding':PIT + '/teams/3100/league-table', 'generic-tournament':'https://www.riversiderfc.example.com/', 'generic-jsonld':'https://www.hilltophawks.example.com/', 'generic-next':'https://aldervale.example.org/', 'generic-empty':'https://blank.example.org/', 'pitchero-home':PIT, 'pitchero-league':PIT + '/teams/3100/league-table', 'generic-people':'https://club.example.org/team/zara-fakeperson' };
  for (const [f, u] of Object.entries(urls)) {
    const r = I.parse(fx(f), u), text = JSON.stringify(r).toLowerCase();
    for (const p of PEOPLE) ok(!text.includes(p), `${f}: "${p}" never reaches the result`);
    ok(Object.keys(r).join() === 'source,club,teams,league' && (!r.club || Object.keys(r.club).join() === 'name,kit,trim') && r.teams.every(t => Object.keys(t).join() === 'name,kit,trim') && r.league.every(x => Object.keys(x).every(k => ROW.includes(k))), `${f}: only names, colours and table numbers leave the parser`);
  }
  const sg = I.parse(fx('pitchero-safeguarding'), PIT + '/teams/3100/league-table');
  ok(names(sg.league) === 'Sevenoaks,Tunbridge Wells,Bracknell' && names(sg.teams) === 'Hornets RFC,Farnham', `person-shaped rows and opponents are dropped, the real ones kept (${names(sg.league)} / ${names(sg.teams)})`);
  const FREE = ['Zara Fakeperson', 'Arlo Plantedkid', 'Priya Notachild', 'Teddy Inventedname', 'Willow Madeupname', 'Ezra Testsurname', 'Nia Pretendperson', 'Kofi Imaginaryname'];
  ok(FREE.every(n => I.name(n) === n), 'generic-people\'s planted first names are not in the first-name list: only the structure keeps them out');
  for (const u of ['https://club.example.org/team/zara-fakeperson', 'https://club.example.org/player-profile/arlo-plantedkid/', 'https://club.example.org/']) {
    const pp = I.parse(fx('generic-people'), u);
    ok(pp.club === null && names(pp.league) === 'Ash Grove,Birch Lane' && !pp.teams.length, `${u}: no club from a person's title, no table from a leaderboard, rankings, results or individuals, only the standings (${JSON.stringify(pp)})`);
  }
  const PERSON = ['J Smith', 'J. Smith', 'Joe S', 'Joe S.', 'Jamie Testplayer', 'Sophie Taylor', 'Oliver James Brown', 'alex@example.com', '07700 900123', 'Coach: Robin', 'Mr Brown', 'www.example.com', 'Captain Fantastic'];
  for (const p of PERSON) ok(I.personal(p) && I.name(p) === '', `"${p}" reads as a person`);
  const TEAM = ['Bath A', 'Bath B', 'Sale Sharks', 'London Scottish', 'Old Ruts', 'Tunbridge Wells', 'Hornets RFC', "St Bede's", 'Farnham', 'Harlequins', 'Barnard Castle', 'Morgan Academy', 'Jack Rugby Club', 'Kingsmead Rugby Football Club'];
  for (const t of TEAM) ok(!I.personal(t) && I.name(t) === t, `"${t}" is a team`);
  const NOT = ['U10s', '1st  XV', 'U9 & U10 Girls', 'Academy U18 1XV', 'Ladies', 'TBC', 'Bye', 'Festival at Farnham', 'Winner Pool A', 'Semi-Final 1', 'Pitchero', 'Home', '123', '<b></b>'];
  for (const t of NOT) ok(I.name(t) === '', `"${t}" is not a team`);
  ok(I.name('Farnham (H)') === 'Farnham' && I.name('<b>Farnham</b>') === 'Farnham' && I.name('Farn‮ham​') === 'Farnham' && I.name('Farnham \u{1F3C9}') === 'Farnham' && I.name('Old Mill &amp; District') === 'Old Mill & District', 'names lose tags, entities, direction marks, emoji and a trailing (H)');
}

// 4. the native fetch path, through a stubbed Capacitor
const pages = {}, calls = [];
// In the app Add Your Team is the Super Fan's (src/store.js): with the app stubbed this suite plays as a Super Fan, so the native
// builder's nativeOn (once merged) sees the app and Import stays open. On the web the purchase is never read.
const native = on => {
  T.store.setBought(on ? ['tryline.fan.farnham'] : []);
  if (!on) { delete globalThis.Capacitor; return; }
  globalThis.Capacitor = { isNativePlatform:() => true, Plugins:{ CapacitorHttp:{ get:async o => {
    calls.push(o);
    const p = pages[o.url];
    if (p === 'hang') return new Promise(() => {});
    if (p === 'throw') throw Error('offline');
    return p || { status:404, data:'' };
  } } } };
};
const html200 = (f, url) => ({ status:200, data:typeof f === 'string' && f.startsWith('<') ? f : fx(f), url });
const reset = () => { calls.length = 0; for (const k of Object.keys(pages)) delete pages[k]; };
{
  native(true); reset();
  pages[PIT] = html200('pitchero-home');
  pages[PIT + '/teams/3100/league-table'] = html200('pitchero-league');
  const slept = [];
  const r = await I.fetch(' ' + PIT + '#x', { sleep:ms => { slept.push(ms); } });
  ok(r.ok && r.requests === 2 && calls.length === 2, `a club home, then its 1st XV's league table: two requests (${r.requests})`);
  ok(calls[0].url === PIT && calls[1].url === PIT + '/teams/3100/league-table', 'the pasted page first, cleaned, then the derived league table');
  ok(r.data.club.name === 'Bracknell RFC' && r.data.league.length === 6, 'the result holds the club and the table');
  ok(calls.every(c => Object.keys(c.headers).join() === 'User-Agent,Accept' && c.headers['User-Agent'] === 'TryLineRugby' && c.connectTimeout > 0 && c.readTimeout > 0), 'only a plain TryLineRugby User-Agent and Accept are sent, with timeouts');
  ok(slept.join() === '5000', 'Pitchero gets its five seconds between requests');

  reset();
  const team = 'https://www.pitchero.com/clubs/darlingtonrfc/teams/14605';
  const nd = JSON.parse(fx('pitchero-minis-friendlies').match(/application\/json">([\s\S]*?)<\/script>/)[1]);
  delete nd.props.initialReduxState;
  pages[team] = html200('<script id="__NEXT_DATA__" type="application/json">' + JSON.stringify(nd) + '</script>');
  pages[team + '/fixtures-results'] = html200('pitchero-minis-friendlies');
  const r2 = await I.fetch(team, { gap:0 });
  ok(r2.ok && calls.map(c => c.url.slice(team.length)).join() === ',/league-table,/fixtures-results' && r2.requests === 3, `a minis team: its page, a missing league table, then fixtures (${calls.map(c => c.url).join(' ')})`);
  ok(r2.data.club.name === 'Darlington RFC' && names(r2.data.teams) === 'Stockton,Barnard Castle', 'the club from the first page, the opponents from the third');

  reset();
  const site = 'https://www.riversiderfc.example.com/spring-cup';
  const linky = '<meta property="og:site_name" content="Riverside RFC"><a href="https://elsewhere.example.net/league-table">League Table</a><a href="/spring-cup/fixtures">Fixtures</a>';
  pages[site] = html200(linky);
  pages['https://www.riversiderfc.example.com/spring-cup/fixtures'] = html200(linky + '<a href="/other-table">Table</a>');
  const r3 = await I.fetch(site, { gap:0 });
  ok(r3.ok && calls.length <= 3 && !calls.some(c => c.url.includes('elsewhere')), `links to another site are never followed (${calls.map(c => c.url).join(' ')})`);
  for (const f of ['generic-empty', 'pitchero-minis-empty']) {
    reset();
    for (const u of [site, site + '/standings', site + '/fixtures', PIT, PIT + '/teams/3100/league-table', PIT + '/teams/3100/fixtures-results']) pages[u] = html200(f);
    await I.fetch(f.startsWith('p') ? PIT : site, { gap:0 });
    ok(calls.length <= I.MAX_REQUESTS, `never more than three requests (${f}: ${calls.length})`);
  }

  reset(); pages[PIT] = 'hang';
  const t0 = Date.now(), r4 = await I.fetch(PIT, { timeout:30 });
  ok(!r4.ok && r4.error === 'timeout' && Date.now() - t0 < 2000, 'a page that never answers times out');
  reset(); pages[PIT] = { status:500, data:'' };
  ok((await I.fetch(PIT)).error === 'net', 'a server error is a failed import');
  reset(); pages[PIT] = 'throw';
  ok((await I.fetch(PIT)).error === 'net', 'no connection is a failed import');
  reset();
  ok((await I.fetch('javascript:alert(1)')).error === 'url' && calls.length === 0, 'a bad link is refused before any request');
  reset(); pages[PIT] = { status:200, data:{ standings:[{ teamName:'Ash Grove', w:2, l:0, pts:8 }, { teamName:'Birch Lane', w:0, l:2, pts:0 }] } };
  const r5 = await I.fetch(PIT, { gap:0 });
  ok(r5.ok && names(r5.data.league) === 'Ash Grove,Birch Lane', 'a JSON answer is read too');
  reset(); pages['https://www.bracknellrugbyclub.com/'] = html200('pitchero-home', PIT);
  pages[PIT + '/teams/3100/league-table'] = html200('pitchero-league');
  const r6 = await I.fetch('https://www.bracknellrugbyclub.com/', { gap:0 });
  ok(r6.ok && calls[1] && calls[1].url === PIT + '/teams/3100/league-table', 'after a redirect, the next page is on the site that answered');
  ok(calls.length && calls.every(c => c.disableRedirects === true), 'the platform is never left to follow a redirect itself');

  reset(); pages['https://www.bracknellrugbyclub.com/'] = { status:301, headers:{ Location:PIT }, data:'' };
  pages[PIT] = html200('pitchero-home'); pages[PIT + '/teams/3100/league-table'] = html200('pitchero-league');
  const r7 = await I.fetch('https://www.bracknellrugbyclub.com/', { gap:0 });
  ok(r7.ok && r7.requests === 3 && calls.map(c => c.url).join() === ['https://www.bracknellrugbyclub.com/', PIT, PIT + '/teams/3100/league-table'].join() && r7.data.league.length === 6, `a redirect is followed here, as one of the three requests, and the next page is on the site it led to (${calls.map(c => c.url).join(' ')})`);
  reset(); pages['https://www.bracknellrugbyclub.com/'] = { status:302, headers:{ location:'http://192.168.1.1/admin' }, data:'' };
  const r8 = await I.fetch('https://www.bracknellrugbyclub.com/', { gap:0 });
  ok(!r8.ok && r8.error === 'net' && calls.length === 1, 'a redirect to a local address is refused, and nothing more is asked for');
  reset(); pages['https://www.bracknellrugbyclub.com/'] = { status:200, url:'http://192.168.1.1/', data:'<title>Router RFC</title><a href="/cgi-bin/luci/;stok=TOKEN/admin/status">Status Table</a>' };
  const r9 = await I.fetch('https://www.bracknellrugbyclub.com/', { gap:0 });
  ok(!r9.ok && r9.error === 'net' && calls.length === 1, 'a page the platform brought from a refused address is never read, nor its links followed');
  reset(); pages['https://loop.example.org/'] = { status:302, headers:{ Location:'/again' }, data:'' };
  pages['https://loop.example.org/again'] = { status:307, headers:{ Location:'https://loop.example.org/' }, data:'' };
  const r10 = await I.fetch('https://loop.example.org/', { gap:0 });
  ok(!r10.ok && calls.length === I.MAX_REQUESTS && calls[1].url === 'https://loop.example.org/again', `a redirect loop ends at three requests (${calls.length})`);
  reset(); pages['https://nowhere.example.org/'] = { status:302, data:'' };
  ok((await I.fetch('https://nowhere.example.org/', { gap:0 })).error === 'net' && calls.length === 1, 'a redirect with no Location is a failed import');

  reset(); pages[team] = html200('<script id="__NEXT_DATA__" type="application/json">' + JSON.stringify(nd) + '</script>');
  let stop = false;
  const r11 = await I.fetch(team, { gap:1, sleep:() => { stop = true; }, cancelled:() => stop });
  ok(!r11.ok && r11.error === 'cancelled' && calls.length === 1, 'cancelled in the pause between pages, no further request is made');
}

// 5. the web build never fetches, and says so
{
  native(false); reset();
  let webFetches = 0;
  globalThis.fetch = () => { webFetches++; return Promise.reject(Error('no')); };
  globalThis.XMLHttpRequest = function () { webFetches++; };
  const r = await I.fetch(PIT);
  ok(!r.ok && r.error === 'web' && webFetches === 0, 'the web build does not fetch');
  globalThis.Capacitor = { isNativePlatform:() => false, Plugins:{ CapacitorHttp:{ get:() => { webFetches++; } } } };
  ok((await I.fetch(PIT)).error === 'web' && webFetches === 0, 'nor does Capacitor on the web');
  native(false);
  I.open();
  ok(!$('m-import').hidden && I.state().step === 'web' && $('im-title').textContent === 'Works in the Try Line App', 'the card says Add Your Team works in the app');
  ok(!$('im-line').hidden && $('im-field').hidden && $('im-go').hidden && $('im-alt').hidden, 'one plain line, no link field, no Import, one balanced Back button');
  $('im-back').click();
  ok($('m-import').hidden, 'Back to Teams closes it');
}

// 6. the card in the app: grown-up check, preview, save
{
  native(true); reset();
  X.restore({ custom:[], champ:null }); I.setLeague(null);
  const LG = PIT + '/teams/3100/league-table';
  let focused = '';
  for (const id of ['im-url', 'im-go', 'im-back', 'im-paste', 'im-make']) $(id).focus = () => { focused = id; };
  pages[LG] = html200('pitchero-league');
  D.openTeams('champ');
  ok($('t-grid').innerHTML.includes('id="t-import"') && $('t-grid').innerHTML.includes('<span class="tname">Add Your Team</span>') && !$('t-grid').innerHTML.includes('Import Club') && $('t-league').hidden, 'the team screen has an Add Your Team card beside Create Team (the home\'s name for the same card), and no My League yet');
  X.poolPick(I.POOL);
  ok(D.settings().pool === 'sur' && X.teamPool() === 'sur', 'My League cannot be picked before there is one');
  I.open();
  ok(I.state().step === 'link' && $('im-title').textContent === 'Paste Your Link' && !$('im-field').hidden && $('im-go').textContent === 'Import', 'in the app the card asks for the link');
  ok(focused === 'im-url' && I.focusEl(true) === $('im-go'), 'focus goes into the card, on the link field; a controller\'s ring starts on Import');
  const mm = globalThis.matchMedia; globalThis.matchMedia = q => ({ matches:q === '(pointer: coarse)' });
  focused = ''; I.open();
  ok(focused === 'im-go', 'on a touch screen focus goes to Import, so no keyboard springs up over the card');
  globalThis.matchMedia = mm; I.open();
  $('im-url').value = 'file:///etc/passwd'; I.go();
  ok(!$('im-err').hidden && $('im-err').textContent === I.MSG.url && calls.length === 0, 'a bad link says so and fetches nothing');
  let gate = null;
  I.setGate((go, cancel) => { gate = { go, cancel }; });
  $('im-url').value = LG; I.go();
  ok(gate && $('m-import').hidden && calls.length === 0, 'Import asks the grown-up check first, the card out of its way, nothing fetched');
  focused = ''; gate.cancel();
  ok(!$('m-import').hidden && I.state().step === 'link' && calls.length === 0 && focused === 'im-url', 'cancelling the check comes back to the link, focus on it, nothing fetched');
  gate = null; I.go(); gate.go();
  ok(I.state().step === 'busy' && $('im-go').textContent === 'Importing' && $('im-go').disabled && $('im-url').disabled && focused === 'im-back', 'passing it starts the import, focus on Back');
  for (let i = 0; i < 20 && I.state().step === 'busy'; i++) await tick();
  ok(I.state().step === 'preview' && $('im-title').textContent === 'Bracknell RFC' && !$('im-jersey').hidden && $('im-jersey').innerHTML.includes('--kit:#399913'), 'the preview shows the club in its colours');
  ok($('im-league').innerHTML.includes('My League · 5 Teams') && ($('im-league').innerHTML.match(/class="jersey/g) || []).length === 5, 'and the league\'s shirts and size');
  ok($('im-cols').hidden && $('im-go').textContent === 'Save Club' && $('im-alt').textContent === 'Change Link' && !$('im-alt').classList.contains('warn') && focused === 'im-go', 'page colours need no picking; Save Club, focused, then Change Link beside Back');
  I.go();
  const club = X.custom().find(t => t.name === 'Bracknell RFC'), NA = I.ABILITIES.length, TOP = NA + X.BUDGET;
  ok(club && club.custom && club.kit === '#399913' && club.trim === '#e4c200' && X.rateOf(club) === TOP && I.ABILITIES.every(([k]) => club[k] === 3 || ((k === 'pace' || k === 'handling') && club[k] === 4)) && club.pace === 4 && club.handling === 4,
    `Save Club adds it through cleanTeam, the budget spent evenly over every ability (${I.ABILITIES.map(([k]) => k + ' ' + club[k]).join(', ')})`);
  ok(I.league().teams.length === 5 && names(I.league().teams) === 'Sevenoaks,Tunbridge Wells,London Scottish,Wimbledon,Farnham', 'and keeps the league\'s other five, names fitted');
  ok(!$('m-import').hidden && I.state().step === 'mine' && $('im-title').textContent === 'Bracknell RFC' && !$('im-mine').hidden && $('im-row').hidden && $('im-go').hidden && !$('im-jersey').hidden && focused === 'im-make', 'then the card offers Make This My Team | Not Now, in the club\'s shirt, focus on Make This My Team');
  $('im-not').click();
  ok(D.settings().myClub == null, 'Not Now leaves My Team as it was');
  ok($('m-import').hidden && D.settings().pool === I.POOL && X.teamPool() === 'my' && X.poolTier('my') === 2 && !$('t-league').hidden && $('t-tier').hidden, 'the card closes on My League (Local\'s, beside Surrey), Championship\'s list now that its competition is chosen on the home');
  ok($('t-grid').innerHTML.includes('Sevenoaks') && $('t-grid').innerHTML.includes('Bracknell RFC'), 'My League lists the league and your teams');
  const sv = saved();
  ok(sv.importLeague.teams.length === 5 && sv.custom.some(t => t.name === 'Bracknell RFC'), 'both are in the browser save');
  const lead = I.league().teams[0], foot = I.league().teams[4];
  ok(X.rateOf(lead) === TOP && X.rateOf(foot) === Math.round(TOP - NA*4/5) && lead.kit !== foot.kit && I.league().teams.every(t => I.ABILITIES.every(([k]) => Number.isInteger(t[k]))), `ratings follow the table over every ability, the leader a team you can make (${X.rateOf(lead)} top, ${X.rateOf(foot)} fifth of six)`);
  const opp = I.sides({ teams:['Ash Vale', 'Birch Lane', 'Cedar Park', 'Damson Hill', 'Elm Bridge', 'Fir Tree'].map(name => ({ name })), league:[] });
  ok(opp.every(t => X.rateOf(t) > TOP - NA && X.rateOf(t) < TOP), `fixture opponents fall between a table's foot and its leader (${opp.map(X.rateOf).join(' ')})`);
  const ids = [...I.league().teams, ...X.custom()].map(t => t.id);
  ok(new Set(ids).size === ids.length && !ids.some(id => X.ALL_TEAMS.some(t => t.id === id)), `codes are unique and clear of the built-in sides (${ids.join(' ')})`);

  I.open(); $('im-url').value = LG; I.go(); gate.go();
  for (let i = 0; i < 20 && I.state().step === 'busy'; i++) await tick();
  I.go();
  ok(X.custom().filter(t => t.name === 'Bracknell RFC').length === 1, 'importing the same club again keeps your one copy and its edits');

  pages['https://plain.example.org/'] = html200('<meta property="og:site_name" content="Plain Lane RFC"><table><tr><th>Team</th><th>P</th><th>W</th><th>L</th><th>Pts</th></tr><tr><td>Plain Lane</td><td>2</td><td>2</td><td>0</td><td>8</td></tr><tr><td>Quarry Hill</td><td>2</td><td>0</td><td>2</td><td>0</td></tr></table>');
  I.open(); $('im-url').value = 'plain.example.org'; I.go(); gate.go();
  for (let i = 0; i < 20 && I.state().step === 'busy'; i++) await tick();
  ok(I.state().pick && !$('im-cols').hidden && I.state().draft.kit === '#2050b0', 'a page with no colours offers the shirt and trim swatches');
  ok($('im-league').innerHTML.includes('My League · 1 Team</span>'), 'a league of one says 1 Team');
  I.state().draft.kit = '#c8102e'; I.state().draft.trim = '#f2efe6'; I.render(); I.go();
  ok(X.custom().find(t => t.name === 'Plain Lane RFC').kit === '#c8102e' && names(I.league().teams) === 'Quarry Hill', 'the picked colours are saved, and the new league replaces the old');

  I.open(); I.alt();
  ok($('im-alt').textContent === 'Confirm Remove', 'Remove League armed');
  $('im-url').value = 'plain.example.org'; I.go(); gate.go();
  for (let i = 0; i < 20 && I.state().step === 'busy'; i++) await tick();
  focused = ''; I.alt();
  ok(I.state().step === 'link' && !I.state().armed && $('im-alt').textContent === 'Remove League' && focused === 'im-url', 'an import in between disarms it, and Change Link puts focus on the link');
  I.alt();
  ok(I.league() && $('im-alt').textContent === 'Confirm Remove', 'so one tap after Change Link never removes the league');
  $('im-back').click();

  pages['https://gone.example.org/'] = { status:404, data:'' };
  I.open(); $('im-url').value = 'https://gone.example.org/'; I.go(); gate.go();
  for (let i = 0; i < 20 && I.state().step === 'busy'; i++) await tick();
  ok(I.state().step === 'link' && $('im-err').textContent === I.MSG.net && !$('im-err').hidden, 'a page that fails says so, back on the link');
  pages['https://blank.example.org/'] = html200('generic-empty');
  $('im-url').value = 'https://blank.example.org/'; I.go(); gate.go();
  for (let i = 0; i < 20 && I.state().step === 'busy'; i++) await tick();
  ok(I.state().step === 'link' && $('im-err').textContent === I.MSG.empty, 'a page with nothing on it says so');

  pages['https://slow.example.org/'] = 'hang';
  I.open(); $('im-url').value = 'https://slow.example.org/';
  const before = JSON.stringify([X.custom(), I.league()]);
  const run = I.run('https://slow.example.org/', I.state().token, { timeout:20 });
  $('im-back').click(); await run;
  ok($('m-import').hidden && JSON.stringify([X.custom(), I.league()]) === before, 'Back while it imports drops whatever comes back');
  reset();
  const MINI = PIT + '/teams/3487';
  for (const u of [MINI, MINI + '/league-table', MINI + '/fixtures-results']) pages[u] = html200('pitchero-minis-empty');
  I.open();
  const run2 = I.run(MINI, I.state().token, { gap:200 });
  await new Promise(r => setTimeout(r, 30)); $('im-back').click(); await run2;
  ok(calls.length === 1, `Back while it imports stops the requests, not just the card (${calls.length})`);

  I.open();
  ok($('im-alt').textContent === 'Remove League' && $('im-alt').classList.contains('warn') && !$('im-row').classList.contains('one'), 'with a league saved, Remove League sits beside Back');
  I.alt();
  ok(I.league() && $('im-alt').textContent === 'Confirm Remove', 'it asks twice');
  focused = ''; I.alt();
  ok(I.league() === null && saved().importLeague === null && D.settings().pool === 'sur' && $('im-alt').hidden && focused === 'im-url', 'then the league goes, from the save too, the list back to Surrey, and focus is not left on a hidden button');
  $('im-back').click();
  ok($('t-league').hidden, 'and so does My League');
  I.setGate(null); native(false);
}

// 7. the save field: round trip, the validator, old saves
{
  const lg = { teams:[{ key:'lg-SEV', id:'SEV', name:'Sevenoaks', kit:'#f2efe6', trim:'#f2b01e', hoops:false, pace:4, power:4, handling:3, kicking:3 },
    { key:'lg-TUN', id:'TUN', name:'Tunbridge Wells', kit:'#002d57', trim:'#debe00', hoops:true, pace:3, power:3, handling:4, kicking:3 }] };
  I.setLeague(I.clean(lg)); X.save();
  const text = memory['tryline.v1'], want = JSON.stringify(I.league());
  ok(I.league().teams.every((t, i) => ['key', 'id', 'name', 'kit', 'trim', 'hoops', 'pace', 'power', 'handling', 'kicking'].every(k => t[k] === lg.teams[i][k])), 'a clean league passes the validator unchanged');
  I.setLeague(null); X.load();
  ok(JSON.stringify(I.league()) === want, 'a saved league reloads exactly');
  X.restore({ settings:{ sound:false } });
  ok(I.league() && I.league().teams.length === 2, 'a partial restore keeps it');
  for (const bad of [null, undefined, 'x', 3, [], {}, { teams:'x' }, { teams:[] }, { teams:[null, 'x', { name:'' }] }]) ok(I.clean(bad) === null, `a broken league is dropped (${JSON.stringify(bad)})`);
  const messy = I.clean({ teams:[
    { id:'FAR', name:'Farnham Town', kit:'red', trim:'#zzzzzz', pace:9, power:-2, handling:'3', kicking:null, home:true, custom:true, extra:'x' },
    { id:'FAR', name:'London Scottish Lions', kit:'#123456', pace:3, power:3, handling:3, kicking:3 },
    { name:'J Smith', pace:3 }, { name:'<script>x</script>' }, { name:'Joe S' },
    ...Array.from({ length:20 }, (_, i) => ({ name:'Side ' + String.fromCharCode(65 + i) + 'ville', pace:3, power:3, handling:3, kicking:3 })),
  ] });
  const m0 = messy.teams[0], m1 = messy.teams[1];
  ok(m0.kit === '#2050b0' && m0.trim === '#f2efe6' && m0.pace === 5 && m0.power === 1 && m0.handling === 3 && m0.kicking === 1 && !m0.home && !m0.custom && !('extra' in m0), 'each side is put right through cleanSide, flags and unknown fields dropped');
  ok(m0.id !== 'FAR' && m1.id !== 'FAR' && m0.id !== m1.id && m0.key === 'lg-' + m0.id, `a built-in or repeated code is replaced (${m0.id} ${m1.id})`);
  ok(m1.name === 'London Scottish' && !messy.teams.some(t => /Smith|Joe|script/.test(t.name)) && messy.teams.length === I.MAX_SIDES, 'names fit a card, people and junk are dropped, at most sixteen');
  const short = I.sides({ league:['Tunbridge Wells', 'Tunbridge Wells II', 'Old Whitgiftians', 'Old Whitgiftians II', 'Sevenoaks Minis A', 'Sevenoaks Minis B'].map(name => ({ name })), teams:[] });
  ok(names(short) === 'Tunbridge Wells,Tunbridge II,Old Whitgiftians,Sevenoaks A,Sevenoaks B', `sides that would shorten to one name keep their labels, or one is left out (${names(short)})`);
  ok(names(I.clean({ teams:[{ name:'Tunbridge Wells' }, { name:'Tunbridge Wells' }, { name:'Tunbridge Wells II' }] }).teams) === 'Tunbridge Wells,Tunbridge II', 'a saved league never shows two sides of one name');
  const OLD = { settings:{ half:1, diff:2, sound:true, hints:true, pool:1 }, champ:null, custom:[{ key:'my1', name:'Badgers', kit:'#1c1c1c', trim:'#f2b01e', pace:3, power:3, handling:3, kicking:3 }], champHistory:[], seasonSerial:4 };
  I.setLeague(null);
  memory['tryline.v1'] = JSON.stringify(OLD); X.load();
  ok(I.league() === null && X.custom()[0].name === 'Badgers' && D.settings().diff === 2 && D.settings().half === 1, 'a save from before import loads unchanged, with no league');
  X.save();
  ok('importLeague' in saved() && saved().importLeague === null && saved().custom[0].name === 'Badgers', 'and saves back with an empty league field');
  I.setLeague(I.clean(lg));
  X.restore(OLD);
  ok(I.league() && I.league().teams.length === 2, 'restoring an old save does not wipe a league it never had');
  X.restore({ importLeague:'garbage' });
  ok(I.league() === null, 'a broken league field reads as none');
  memory['tryline.v1'] = text; X.load();
  ok(I.league().teams.length === 2, 'the save written above still loads');
  X.restore({ settings:{ pool:5 } });
  ok(D.settings().pool === I.POOL && X.teamPool() === I.POOL, 'a My League choice saved before the hierarchy (5) is My League again');
  X.restore({ settings:{ pool:I.POOL } }); I.setLeague(null);
  ok(D.settings().pool === I.POOL && X.teamPool() === 'sur', 'and with no league saved the list shows Surrey (the team screen opens on Local anyway)');
  I.setLeague(I.clean(lg));
}

// 8. My League in a championship: your club and five others, trimmed or topped up
{
  const LN = ['Ash Vale', 'Birch Lane', 'Cedar Park', 'Damson Hill', 'Elm Bridge', 'Fir Tree', 'Gorse Lane', 'Hazel End', 'Ivy Bank', 'Juniper Way', 'Larch Wood', 'Maple Cross'];
  const mk = n => ({ teams:Array.from({ length:n }, (_, i) => ({ id:'Q' + String.fromCharCode(65 + i) + 'Z', name:LN[i], kit:'#1b2747', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:3 })) });
  const mine = X.cleanTeam({ key:'my9', name:'Bracknell RFC', kit:'#399913', trim:'#e4c200', pace:4, power:3, handling:4, kicking:3 }, 0);
  X.restore({ custom:[mine] });
  for (const [n, fromLeague] of [[12, 5], [5, 5], [3, 3], [1, 1]]) {
    I.setLeague(I.clean(mk(n)));
    D.openTeams('champ'); D.settings().pool = I.POOL; D.renderTeams();
    ok(!$('t-league').hidden && $('t-grid').innerHTML.includes('Ash Vale') && I.league().teams.length === n && $('t-grid').innerHTML.includes('Bracknell RFC'), `My League (${n}) lists the league and your club`);
    D.pickTeam(X.custom()[0]);
    const c = X.champ(), others = c.teams.slice(1);
    ok(c.teams.length === 6 && c.teams[c.user].name === 'Bracknell RFC', `a ${n}-team league plays a six-team championship with your club in it`);
    ok(others.filter(t => LN.includes(t.name)).length === fromLeague && others.filter(t => X.CLUBS.some(k => k.id === t.id)).length === 5 - fromLeague, `${fromLeague} from the league, ${5 - fromLeague} Local clubs to make six`);
    ok(new Set(c.teams.map(t => t.name)).size === 6, 'no side twice');
    X.setChamp(null);
  }
  I.setLeague(I.clean(mk(6)));
  D.openTeams('champ'); D.settings().pool = I.POOL; D.renderTeams();
  D.pickTeam(I.league().teams[2]);
  ok(X.champ().teams[0].name === 'Cedar Park' && !X.champ().teams.slice(1).some(t => t.name === 'Cedar Park'), 'playing as a league side leaves it out of the others');
  X.setChamp(null);
  const r0 = rndCalls(); D.renderTeams(); X.save(); I.render();
  ok(rndCalls() === r0, 'showing My League and saving it draw no simulation RNG');
  I.setLeague(null); D.renderTeams();
  ok($('t-league').hidden, 'no league, no My League');
  const full = Array.from({ length:4 }, (_, i) => ({ key:'f' + i, name:'Full ' + i }));
  X.restore({ custom:full }); D.renderTeams();
  ok(!$('t-grid').innerHTML.includes('t-import') && !$('t-grid').innerHTML.includes('t-create'), 'with four teams made and no league, Add Your Team goes with Create Team');
  I.setLeague(I.clean(mk(3))); D.renderTeams();
  ok($('t-grid').innerHTML.includes('t-import') && !$('t-grid').innerHTML.includes('t-create'), 'with four made and a league saved, Add Your Team stays: the way to refresh or remove it');
  native(true); reset(); I.setGate(go => go());
  pages[PIT + '/teams/3100/league-table'] = html200('pitchero-league');
  I.open(); $('im-url').value = PIT + '/teams/3100/league-table'; I.go();
  for (let i = 0; i < 20 && I.state().step === 'busy'; i++) await tick();
  ok(I.state().step === 'preview' && $('im-title').textContent === 'My League' && $('im-go').textContent === 'Save League' && $('im-jersey').hidden, 'with four made, a club\'s page offers its league alone');
  I.go();
  ok(X.custom().length === 4 && !X.custom().some(t => /Bracknell/.test(t.name)) && names(I.league().teams) === 'Sevenoaks,Tunbridge Wells,London Scottish,Wimbledon,Farnham', 'and saves the league, not the club');
  pages['https://clubonly.example.org/'] = html200('<meta property="og:site_name" content="Club Only RFC">');
  I.open(); $('im-url').value = 'https://clubonly.example.org/'; I.go();
  for (let i = 0; i < 20 && I.state().step === 'busy'; i++) await tick();
  ok(I.state().step === 'link' && $('im-err').textContent === I.MSG.full && !$('im-err').hidden, 'a club with no league, with four made, says to make room');
  $('im-back').click(); I.setGate(null); native(false); I.setLeague(null);
  X.restore({ custom:[] });
}

// 9. copy: Title Case labels, no em dash, no arrow, and the gate is the kids contract
{
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const block = html.slice(html.indexOf('<div class="modal" id="m-import"'), html.indexOf('<section class="screen" id="s-hub"'));
  const src = fs.readFileSync(new URL('../src/import.js', import.meta.url), 'utf8');
  ok(!/[—←-↙⇐-⇙]/.test(block + src), 'no em dash or arrow in the import card or its source');
  const SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'on', 'to', 'in', 'for', 'as', 'at', 'by']);
  const title = s => s.split(' ').every((w, i) => (i > 0 && SMALL.has(w)) || /^[A-Z0-9]/.test(w));
  const labels = ['Add Your Team', 'Paste Your Link', 'Import', 'Importing', 'Save Club', 'Save League', 'Change Link', 'Remove League', 'Confirm Remove', 'Back to Teams', 'Paste', 'My League', 'Works in the Try Line App', 'Shirt', 'Trim'];
  ok(!/Import Club|Import Data|Import Works/.test(block + src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')), 'one name for the flow, the home\'s and the team screen\'s alike: Add Your Team, never Import Club or Import Data');
  for (const l of labels) ok(title(l) && (src + block).includes(l), `"${l}" is a Title Case label in use`);
  const menus = fs.readFileSync(new URL('../src/ui-menus.js', import.meta.url), 'utf8');
  ok(html.includes('<div class="seg" id="t-loc" hidden></div>') && menus.includes("btn('data-pool=\"my\" id=\"t-league\"', 'My League', ' hidden')"), 'Local\'s list carries My League after Surrey, hidden until there is one');
  ok(/typeof parentGate === 'function'\) parentGate\(go, cancel\)/.test(src), 'Import goes through parentGate(go, cancel) when the kids check is there');
  ok(Object.values(I.MSG).every(m => m.length <= 45 && /\.$/.test(m)), 'each message is one short plain sentence');
}

console.log(`Importer: ${passed} assertions passed`);
