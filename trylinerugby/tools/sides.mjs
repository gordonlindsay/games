// Who plays on a team: men's, women's or mixed. The side on a team and in the saves, the bodies it gives, the one age lever, the career
// player's look, Men's | Women's on the team screen, Team on Create Team, the side read from an import's label, and the neutral wording
// on screen. Old saves are pinned against what the build before this gave. Exits 1 on any failure.
// node tools/sides.mjs
process.env.SEED ??= '37';
import fs from 'node:fs';
const { T, rndCalls } = await import('./harness.mjs');
const { readGameSource } = await import('./source.mjs');
const S = T.sidesOf, X = T.teams, C = T.career, D = T.debug, I = T.importer, B = T.behind, R = T.ratings, Y = T.yourTeam, $ = id => document.getElementById(id);
let passed = 0, failed = 0;
/* The merge (README, Integration with PR #14): main's Men | Women | Minis is the one control, and teamSide reads it (Women is 1, Minis mixed);
   a g of a team's own still wins, so the looks below run as they did. PR #14's toggle, women's lists, a made or imported team's own side and
   the career look builder wait for the builders: those sections are recorded, not run, and named in the last line. */
const PENDING = [];
const pending = (what, fn) => { PENDING.push(what); };
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const memory = {};
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; } };
const saved = () => JSON.parse(memory['tryline.v1']);
const s = D.settings();
const json = JSON.stringify;
const hash = t => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const by = id => X.ALL_TEAMS.find(t => t.id === id);
const women = id => S.WOMEN_NATIONS.find(t => t.id === id);
const src = readGameSource(), body = src.slice(src.indexOf('<body>'), src.indexOf('<script>'));
const segOf = key => document.querySelectorAll('.seg[data-key]').find(x => x.dataset.key === key);
const toggle = i => segOf('womens').children[i].click();     // the real button's own handler
const squad = (t, b = X.CLUBS[1]) => { T.newMatch(t, t === b ? X.CLUBS[2] : b, { halfLen:240, diff:1, headless:true, duels:'off' }); return T.M.players.filter(p => p.team === 0); };
const side = (id, name, extra = {}) => ({ id, name, kit:'#112233', trim:'#445566', hoops:false, pace:3, power:3, handling:3, kicking:3, stamina:3, ...extra });

// 1. the side on a team, and what meets what
{
  ok(S.teamSide({}) === 0 && S.teamSide(null) === 0 && S.teamSide({ g:0 }) === 0 && S.teamSide({ g:1 }) === 1 && S.teamSide({ g:'mixed' }) === 'mixed', 'no g is men\'s; 1 and mixed read as themselves');
  for (const junk of [2, '1', true, 'women', -1, null]) ok(S.teamSide({ g:junk }) === 0, `g ${junk} is men's`);
  const m = {}, w = { g:1 }, x = { g:'mixed' };
  ok(!S.sidesMeet(m, w) && !S.sidesMeet(w, m), 'men\'s never meets women\'s');
  ok(S.sidesMeet(m, m) && S.sidesMeet(w, w) && S.sidesMeet(x, x) && S.sidesMeet(x, m) && S.sidesMeet(w, x), 'each meets its own, and mixed meets both');
  ok(S.MIXED_THROUGH === 11, 'the game follows England: mixed through U11');
  const code = src.slice(src.indexOf('<script>'));
  ok((code.match(/\bMIXED_THROUGH = /g) || []).length === 1, 'one lever');
  ok(/Ireland and\s+Australia run through U12/.test(code) && /New Zealand through U13/.test(code) && /Wales and Scotland\s+were not confirmed/.test(code), 'with the other countries in its comment');
}

// 2. cleanTeam and cleanSide carry it, and men's is no field at all
pending('2. a made or saved side carrying its own g (the teams builder: main\'s Men | Women | Minis decides the side)', async () => {
  const my = { key:'myabc', id:'OTT', name:'Otters', kit:'#112233', trim:'#445566', hoops:true, pace:3, power:3, handling:3, kicking:3, stamina:3 };
  ok(json(X.cleanTeam(my, 0)) === '{"key":"myabc","id":"OTT","name":"Otters","custom":true,"kit":"#112233","trim":"#445566","hoops":true,"pace":3,"power":3,"handling":3,"kicking":3,"stamina":3}', 'an old team of yours reads exactly as it did');
  ok(X.cleanTeam({ ...my, g:1 }, 0).g === 1 && X.cleanTeam({ ...my, g:'mixed' }, 0).g === 'mixed', 'cleanTeam keeps women\'s and mixed');
  ok(!('g' in X.cleanTeam({ ...my, g:0 }, 0)) && !('g' in X.cleanTeam({ ...my, g:'boys' }, 0)), 'and drops men\'s and rubbish');
  const c = T.stamina.cleanSide;
  ok(c(side('AAA', 'Aaa', { g:1 })).g === 1 && c(side('AAA', 'Aaa', { g:'mixed' })).g === 'mixed', 'cleanSide keeps them too');
  ok(!('g' in c(side('AAA', 'Aaa'))) && !('g' in c(side('AAA', 'Aaa', { g:0 }))) && !('g' in c(side('AAA', 'Aaa', { g:7 }))), 'and writes no field for men\'s');
});

// 3. old saves: what the build before this gave, byte for byte
{
  const teams = ['FAR', 'HAS', 'GUI', 'ALD', 'WEY', 'COB'].map(id => side(id, by(id).name));
  const fixtures = [[[0, 5], [1, 4], [2, 3]], [[3, 0], [4, 2], [5, 1]], [[0, 4], [3, 1], [2, 5]], [[1, 0], [2, 4], [3, 5]], [[0, 2], [5, 4], [1, 3]]];
  X.restore({ champ:{ user:0, teams, round:0, fixtures, results:[] } });
  ok(X.champ().id === 'legacy-1uhhq2b' && X.champ().teams.every(t => !('g' in t)), `an old championship keeps its fingerprint and its men's sides (${X.champ().id})`);
  X.setChamp(null);
  pending('3. an old career through PR #14\'s stages, and its Men\'s | Women\'s setting (main\'s club seasons and category)', () => {
  const old = { name:'Sam', pos:'B', num:5, club:side('FAR', 'Farnham'), pro:'BAT', country:'GEO', skills:{ pace:50, power:30, handling:40, kicking:35, stamina:36 }, stage:4, seasons:6,
    season:{ user:0, teams, round:0, fixtures, results:[], id:'career-abc' }, trained:false, history:[], totals:{ matches:9, tries:2, tackles:3, goals:1 } };
  X.restore({ career:old });
  const got = C.get();
  ok(hash(json(got)) === 'da78aa', `an old career loads exactly as it did (${hash(json(got))})`);
  ok(!('look' in got) && got.country === 'GEO', 'with no look, and its country unchanged even where there is no women\'s side');
  C.newSeason(got);
  ok(got.season.teams.every(t => !('g' in t)) && got.season.teams[0].id === 'GEO' && got.season.teams[0].pace === by('GEO').pace, 'its next season is men\'s, at the men\'s rating');
  X.restore({ career:{ ...old, stage:0, country:null } });
  C.newSeason(C.get());
  ok(C.get().season.teams.every(t => !('g' in t)), 'an old career in the Minis stays men\'s too: nothing it had changes');
  C.play();
  ok(!T.M.nat[0].squad && B.lookOf(T.M.players.find(p => p.team === 0 && p.n === 5)).g === 0, 'and has no squad entry');
  D.exitMatch(); C.set(null);
  X.setChamp(null);
  X.restore({ settings:{ half:1 } });
  ok(s.womens === 0, 'an old save\'s team screen is on Men\'s');
  for (const v of [2, '1', true, null]) { X.restore({ settings:{ womens:v } }); ok(s.womens === 0, `womens ${v} is ignored`); }
  X.restore({ settings:{ womens:1 } }); ok(s.womens === 1, 'and a saved Women\'s comes back');
  s.womens = 0; X.save(); ok(saved().settings.womens === 0, 'it is in the save');
  s.womens = 1; X.save(); s.womens = 0; X.load(); ok(s.womens === 1, 'and reads back'); s.womens = 0;
  });
}

// 4. looks. A men's squad is pinned against the build before this. Re-pinned once from r31ovt: renaming the one side coded HAR changes that squad's looks, because they are dealt from its name; with the old name put back on it the hash is r31ovt again, and no other team differs.
{
  const list = [...X.NATIONS, ...X.CLUBS, ...X.FRANCE.slice(0, 3), ...X.ENGLAND.slice(0, 3)];   // main's lists: PR #14 had its 16 more nations here, so the hash is re-pinned below
  let h = 2166136261;
  for (const t of list) { T.newMatch(t, t === X.CLUBS[0] ? X.CLUBS[1] : X.CLUBS[0], { halfLen:240, diff:1, headless:true, duels:'off' }); const j = json(T.M.players.filter(p => p.team === 0).map(p => B.lookOf(p))); for (let i = 0; i < j.length; i++) { h ^= j.charCodeAt(i); h = Math.imul(h, 16777619); } }
  ok((h >>> 0).toString(36) === '1bzpbns', `a men's squad looks exactly as it did (${(h >>> 0).toString(36)})`);   // re-pinned at the merge, on main's lists (PR #14's had its 16 more nations): with g left out of each look, this build gives w2eoig, the same as main with the cameras (8df969d), so only PR #14's g:0 field is new
  const r0 = rndCalls();
  const all = X.ALL_TEAMS.map(t => ({ t, w:squad({ ...t, g:1 }).map(B.lookOf), x:squad({ ...t, g:'mixed' }).map(B.lookOf) }));
  const drawn = rndCalls() - r0, r1 = rndCalls();
  squad(X.CLUBS[3]); const base = rndCalls() - r1;
  ok(drawn <= (base + 1)*X.ALL_TEAMS.length*2, `the looks draw nothing from the match's stream (${drawn} over ${X.ALL_TEAMS.length*2} kick-offs at ${base} each)`);
  { const p = squad({ ...X.CLUBS[0], g:'mixed' })[0], r = rndCalls(); B.lookOf(p); ok(rndCalls() === r, 'a mixed look draws nothing'); }
  { const p = squad({ ...X.CLUBS[0], g:1 })[0], r = rndCalls(); B.lookOf(p); ok(rndCalls() === r, 'nor a women\'s'); }
  ok(all.every(a => a.w.every(l => l.g === 1)), 'a women\'s squad is all female bodies');
  ok(all.every(a => new Set(a.w.map(l => l.style)).size === 7), 'seven different hair styles in each');
  const styles = new Set(all.flatMap(a => a.w.map(l => l.style)));
  ok(json([...styles].sort((a, b) => a - b)) === json([0, 2, 3, 5, 8, 9, 10, 11]), `the eight that read, across the women's squads (${[...styles].sort((a, b) => a - b)})`);
  ok(all.every(a => a.w.filter(l => l.style >= 8).length >= 3), 'at least three of the four long styles in every women\'s squad');
  ok(all.every(a => a.x.filter(l => l.g === 1).every(l => B.LOOK_FEMALE.includes(l.style))), 'and a female body in a mixed squad wears the same ones');
  ok(all.every(a => { const n = a.x.filter(l => l.g === 1).length; return n === 3 || n === 4; }), 'a mixed squad is three or four of seven, every squad');
  ok(new Set(all.map(a => a.x.filter(l => l.g === 1).length)).size === 2, 'sometimes three, sometimes four');
  ok(all.every(a => { const m = a.x.filter(l => l.g === 0); return m.every(l => l.style < 6); }), 'a male body in a mixed squad walks the six styles');
  for (let tone = 0; tone < 6; tone++) {
    const of = all.flatMap(a => a.x).filter(l => l.skin === tone), share = of.filter(l => l.g === 1).length/of.length;
    ok(share > 0.35 && share < 0.65, `female and male do not lean on skin ${tone} (${share.toFixed(2)})`);
  }
  for (let n = 1; n <= 7; n++) { const share = all.filter(a => a.x[n - 1].g === 1).length/all.length; ok(share > 0.2 && share < 0.8, `nor on shirt ${n} (${share.toFixed(2)})`); }
  const again = squad({ ...X.CLUBS[4], g:'mixed' }).map(B.lookOf), other = squad({ ...X.CLUBS[4], g:'mixed' }).map(B.lookOf);
  ok(json(again) === json(other), 'the same squad deals the same every time');
  const men = squad(X.CLUBS[4]).map(B.lookOf), wom = squad(X.catSide(X.CLUBS[4], 'women')).map(B.lookOf);   // a Women club: main's category
  ok(json(wom) === json(squad(X.catSide(X.CLUBS[4], 'women')).map(B.lookOf)) && men.every(l => l.g === 0), 'a club\'s Women side deals the same every time (main names it Farnham Women, so its deal is its own: PR #14\'s women\'s club kept the men\'s name and so the men\'s height, build, skin and hair)');
  const entry = { ...X.CLUBS[4], g:1, squad:[{ n:3, look:{ g:0, style:1 } }] };
  ok(B.lookOf(squad(entry)[2]).g === 0 && B.lookOf(squad(entry)[2]).style === 1, 'a squad entry still overrides it');
  ok(squad(X.catSide(X.CLUBS[2], 'women')).map(B.lookOf).every(l => l.g === 1) && squad(X.catSide(X.CLUBS[2], 'minis')).map(B.lookOf).some(l => l.g === 1) && squad(X.CLUBS[2]).map(B.lookOf).every(l => l.g === 0), 'main\'s Women side is all female bodies, Minis mixed, Men male (teamSide reads the category)');
}

// 5. the women's nations: typed in by hand
pending('5. PR #14\'s 15 women\'s nations (main\'s natList(\'women\') is the official table)', async () => {
  const TABLE = { NZL:96, ENG:96, CDA:93, FRA:84, USA:72, IRE:72, AUS:70, RSA:64, ITA:64, SCO:61, WAL:58, FIJ:58, JPN:52, ESP:49, SAM:43 };
  ok(S.WOMEN_NATIONS.length === 15 && json(S.WOMEN_NATIONS.map(t => t.id).sort()) === json(Object.keys(TABLE).sort()), 'fifteen women\'s nations');
  for (const [id, ov] of Object.entries(TABLE)) ok(X.overallOf(women(id)) === ov, `${id} women are ${ov} (${X.overallOf(women(id))})`);
  ok(S.WOMEN_NATIONS.every(t => t.g === 1), 'all women\'s');
  ok(S.WOMEN_NATIONS.every(t => { const m = by(t.id); return t !== m && t.kit === m.kit && t.trim === m.trim && t.alt === m.alt && t.altTrim === m.altTrim && t.name === m.name && !!t.hoops === !!m.hoops; }), 'their own objects, sharing the men\'s kits');
  ok(X.overallOf(by('ENG')) === 84 && !('g' in by('ENG')), 'England\'s men stay as they were');
  for (const id of ['GEO', 'POR', 'TGA', 'CHI', 'ROU', 'ARG', 'URU']) ok(!women(id) && S.sideVersion(by(id), 1) === null, `${id} has no women's side`);
  ok(X.ALL_TEAMS.every(t => !S.WOMEN_NATIONS.includes(t)), 'and they are not in the men\'s lists');
  ok(json(R.nationsRanked(1).slice(0, 3).map(t => t.id)) === '["NZL","ENG","CDA"]' && R.nationsRanked().length === 22 && R.nationsRanked()[0].id === 'RSA', 'each list ranked strongest first');
  ok(json(R.nationsNearest(women('JPN')).map(t => t.id).sort()) === json(['ESP', 'FIJ', 'SAM', 'SCO', 'WAL'].sort()), 'the nearest five are from the women\'s list');
  // ratings.json moves the women's list too, at the next pick
  const file = { date:'2026-11-07', men:R.BUNDLED.men, women:{ ...R.BUNDLED.women, ENG:93 } };
  await R.fetch(async () => ({ ok:true, json:async () => file }));
  ok(X.overallOf(women('ENG')) === 96, 'a new file waits');
  R.sync();
  ok(X.overallOf(women('ENG')) === 93, 'then the women\'s ratings move');
  R.reset();
  ok(X.overallOf(women('ENG')) === 96, 'and the reset puts them back');
});

// 6. club lists: the same clubs and ratings, with women's bodies
pending('6. womenClub (main\'s catSide names a Women club)', async () => {
  for (const p of [1, 2, 3, 4, 5, 6]) {
    const men = Y.poolTeams(p), wom = Y.poolTeams(p, 1);
    ok(men === X.POOLS[p], `men's is the list itself on ${p}`);
    ok(wom.length === men.length && wom.every((t, i) => t.g === 1 && t.id === men[i].id && X.overallOf(t) === X.overallOf(men[i]) && t.kit === men[i].kit), `women's is the same clubs at the same ratings on ${p}`);
    ok(wom.every(t => !('league' in t) && !('pf' in t)), `with no league line: those figures are the men's, on ${p}`);
  }
  const q = by('HAR');
  ok(X.POOLS[1].includes(q) && X.POOLS[5].includes(q) && S.womenClub(q) === Y.poolTeams(5, 1).find(t => t.id === 'HAR') && S.womenClub(q) === Y.poolTeams(1, 1).find(t => t.id === 'HAR'), 'the side in Local and England stays one team in both lists');
  ok(!('g' in q) && !('g' in X.CLUBS[0]), 'the men\'s objects are untouched');
});

// 7. the team screen
pending('7. Men\'s | Women\'s on the team screen (main\'s Men | Women | Minis)', async () => {
  const titled = t => $('t-title').textContent === t;
  s.myTeam = 'FAR'; s.womens = 0; X.custom().length = 0; I.setLeague && I.setLeague(null);
  D.openTeams('quick');
  ok(!$('t-side').hidden && S.quickPick() === by('FAR'), 'Quick Match shows the toggle, on Men\'s by default');
  toggle(1);
  ok(s.womens === 1 && S.quickPick() === S.womenClub(by('FAR')) && titled('Pick Opponent'), 'Women\'s: Farnham becomes Farnham\'s women, and the pick stands');
  ok(saved().settings.womens === 1, 'the toggle is saved');
  ok(S.teamList().every(t => t.g === 1), 'every team on the screen is women\'s');
  s.pool = 0; D.renderTeams();
  ok(S.teamList().length === 15 && S.teamList()[0].id === 'NZL', 'International shows the fifteen');
  ok(!$('t-ratings').hidden, 'with the ratings line');
  toggle(0);
  ok(S.teamList().length === 22 && S.quickPick() === by('FAR'), 'and back: the twenty-two, and the men\'s Farnham');
  // England changes sides with you, at each side's rating
  D.pickTeam(by('FAR')); $('t-change').click(); D.pickTeam(by('ENG'));
  ok(S.quickPick() === by('ENG') && X.overallOf(S.quickPick()) === 84, 'England at 84 on Men\'s');
  toggle(1);
  ok(S.quickPick() === women('ENG') && X.overallOf(S.quickPick()) === 96, 'England at 96 on Women\'s');
  toggle(0);
  // a nation with no women's side is put down: never left playing the wrong side
  $('t-change').click(); D.pickTeam(by('GEO'));
  ok(S.quickPick() === by('GEO'), 'Georgia picked on Men\'s');
  toggle(1);
  ok(S.quickPick() === null && titled('Pick Your Team'), 'Women\'s: Georgia has no women\'s side, so the pick is put down and you pick again');
  ok(!S.teamList().some(t => t.id === 'GEO'), 'and Georgia is not on the list');
  D.pickTeam(by('GEO'));
  ok(S.quickPick() === null, 'nor can it be picked from a stale press');
  D.pickTeam(by('ENG'));
  ok(S.quickPick() === women('ENG'), 'a men\'s England pressed on Women\'s is England\'s women');
  toggle(0); toggle(0);
  ok(s.womens === 0, 'pressing the side you are on does nothing');
  // Your Team on the panel, with no women's side
  s.myTeam = 'GEO'; s.womens = 1; Y.render();
  ok($('yt-play').textContent === 'Pick a Team', `the panel does not promise Georgia on Women's (${$('yt-play').textContent})`);
  D.openTeams('quick');
  ok(S.quickPick() === null && s.pool === 0 && titled('Pick Your Team'), 'and it opens on the women\'s list, with nothing picked');
  s.womens = 0; Y.render();
  ok($('yt-play').textContent === 'Play as Georgia', 'on Men\'s it plays Georgia');
  s.myTeam = 'FAR';
  // Two Player and the picker have no toggle
  for (const m of ['two', 'my']) { D.openTeams(m); ok($('t-side').hidden, `no toggle on ${m}`); }
  s.womens = 1;
  D.openTeams('my'); ok(S.teamList().every(t => t.g !== 1), 'Your Team\'s picker lists the clubs themselves');
  D.pickTeam(by('ENG')); ok(s.myTeam === 'ENG', 'and keeps the key');
  s.myTeam = 'FAR'; s.womens = 0;
});

// 8. your own teams keep their own side
pending('8. a made team\'s own side (the teams builder)', async () => {
  const my = X.custom(); my.length = 0;
  const made = (key, name, g) => X.cleanTeam({ key, id:'', name, g, pace:3, power:3, handling:3, kicking:3, stamina:3 }, 0);
  my.push(made('mym', 'Otters', 0), made('myw', 'Herons', 1), made('myx', 'Minnows', 'mixed'));
  const [mm, mw, mx] = my, names = () => S.teamList().map(t => t.name);
  s.womens = 0; D.openTeams('champ');
  ok(names().includes('Otters') && names().includes('Minnows') && !names().includes('Herons'), 'Men\'s lists your men\'s and mixed teams');
  toggle(1);
  ok(!names().includes('Otters') && names().includes('Minnows') && names().includes('Herons'), 'Women\'s lists your women\'s and mixed teams');
  D.pickTeam(mm);
  ok(D.pickMode() === 'champ', 'a men\'s team cannot be pressed on Women\'s');
  // the toggle goes with your team
  s.myTeam = 'myw'; s.womens = 0; D.openTeams('quick');
  ok(s.womens === 1 && S.quickPick() === mw, 'your women\'s team opens on Women\'s');
  s.myTeam = 'mym'; s.womens = 1; D.openTeams('quick');
  ok(s.womens === 0 && S.quickPick() === mm, 'your men\'s team opens on Men\'s');
  toggle(1);
  ok(S.quickPick() === null, 'and is put down by Women\'s');
  s.myTeam = 'myx'; s.womens = 1; D.openTeams('quick');
  ok(s.womens === 1 && S.quickPick() === mx, 'a mixed team stays on whichever you are on');
  toggle(0); ok(S.quickPick() === mx, 'through the toggle');
  s.myTeam = 'FAR'; s.womens = 0;
  // Two Player: men's ratings and men's or mixed sides
  D.openJoin(); D.openTeams('two');
  ok(!names().includes('Herons') && names().includes('Otters') && names().includes('Minnows'), 'Two Player does not list a women\'s team');
  ok(S.teamList().every(t => t.g !== 1), 'and plays men\'s ratings');
  s.pool = 0; D.renderTeams();
  ok(S.teamList().filter(t => !t.key).length === 22 && X.overallOf(S.teamList()[0]) === 96, 'all twenty-two men\'s nations');
  // editing the team Player 1 picked into a women's team
  D.pickTeam(mm); ok(D.twoSel().teams[0] === mm, 'Player 1 picks a men\'s team');
  Y.openBuilder(mm); T.stamina.draft().g = 1; S.saveBuilder();
  ok(X.custom()[0].g === 1 && D.twoSel().teams[0].id === 'FAR', 'made women\'s in the builder, Player 1 goes back to the default');
  D.setTwo(false); my.length = 0; my.push(mm, mw, mx);
});

// 9. no men's v women's through the team screen: every team, every tab, on both sides, the toggle pressed either way
pending('9. the toggle on every tab (main\'s category)', async () => {
  const my = X.custom(); my.length = 0;
  const made = (key, name, g) => X.cleanTeam({ key, id:'', name, g, pace:3, power:3, handling:3, kicking:3, stamina:3 }, 0);
  my.push(made('mym', 'Otters', 0), made('myw', 'Herons', 1), made('myx', 'Minnows', 'mixed'));
  const league = { teams:[side('QAA', 'Ash Vale', { key:'lg-QAA' }), side('QAB', 'Bourne', { key:'lg-QAB', g:1 }), side('QAC', 'Chobham', { key:'lg-QAC', g:'mixed' }), side('QAD', 'Dorking', { key:'lg-QAD', g:1 })] };
  I.setLeague(league);
  const tabs = Y.POOL_TABS;
  let pairs = 0, bad = 0, starts = 0, champs = 0, champBad = 0;
  const walk = (first, flip) => {
    for (const p of tabs) {
      s.womens = first; D.openTeams('quick'); $('t-change').click();
      s.pool = p; D.renderTeams();
      const count = S.teamList().length;
      for (let i = 0; i < count; i++) {
        s.womens = first; D.openTeams('quick'); $('t-change').click(); s.pool = p; D.renderTeams();
        D.pickTeam(S.teamList()[i]);
        if (flip) toggle(first ? 0 : 1);
        for (const o of tabs) {
          s.pool = o; D.renderTeams();
          for (const t of S.teamList()) {
            if (S.quickPick() && !S.sidesMeet(S.quickPick(), t)) { bad++; console.log('offered', S.quickPick().name, S.quickPick().g, t.name, t.g); }
            pairs++;
          }
        }
        const pick = S.quickPick();
        if (pick) {                                          // and the one that is pressed really plays
          s.pool = tabs[i % tabs.length]; D.renderTeams();
          const foe = S.teamList().find(t => (t.key || t.id) !== (pick.key || pick.id));
          if (foe) { D.pickTeam(foe); starts++; if (!S.sidesMeet(T.M.nat[0], T.M.nat[1])) { bad++; console.log('played', T.M.nat[0].name, T.M.nat[1].name); } D.exitMatch(); }
        }
      }
    }
  };
  walk(0, false); walk(1, false); walk(0, true); walk(1, true);
  ok(bad === 0 && pairs > 10000, `quick match: ${pairs} pairs offered and ${starts} played, none men's v women's (${bad})`);
  for (const g of [0, 1]) for (const p of tabs) {
    s.womens = g; D.openTeams('champ'); s.pool = p; D.renderTeams();
    const count = S.teamList().length;
    for (let i = 0; i < count; i++) {
      X.setChamp(null); s.womens = g; D.openTeams('champ'); s.pool = p; D.renderTeams();
      D.pickTeam(S.teamList()[i]);
      const c = X.champ();
      champs++;
      if (!c || c.teams.length !== 6 || c.teams.some(a => c.teams.some(b => !S.sidesMeet(a, b)))) { champBad++; console.log('champ', c && c.teams.map(t => t.name + ':' + (t.g || 0)).join()); }
    }
  }
  ok(champBad === 0 && champs > 100, `championship: ${champs} draws, all six on one side (${champBad})`);
  // the last stop: startMatch itself
  D.exitMatch();
  const before = T.M; D.startMatch(by('ENG'), women('NZL'), false);
  ok(T.M === before, 'startMatch refuses men\'s v women\'s');
  D.startMatch(women('ENG'), women('NZL'), false);
  ok(T.M !== before && T.M.nat.every(n => n.g === 1), 'and plays women\'s v women\'s');
  ok(T.M.players.every(p => B.lookOf(p).g === 1), 'every body on the pitch female');
  D.exitMatch();
  D.startMatch(by('ENG'), S.WOMEN_NATIONS[2].id === 'CDA' ? { ...by('CAN'), g:'mixed' } : by('FRA'), false);
  ok(T.M.nat[1].g === 'mixed', 'mixed can play either');
  D.exitMatch();
  // a mirror match on women's keeps the side on the renamed copy
  T.newMatch(women('ENG'), women('ENG'), { halfLen:240, diff:1, headless:true, duels:'off' });
  ok(T.M.nat[1].id !== 'ENG' && T.M.nat[1].g === 1, 'a mirror match stays women\'s on both');
  I.setLeague(null); my.length = 0; X.setChamp(null); s.womens = 0; s.pool = 1;
});

// 10. a championship
pending('10. a women\'s championship through the toggle (main\'s category)', async () => {
  s.womens = 1; D.openTeams('champ'); s.pool = 0; D.renderTeams();
  D.pickTeam(women('FRA'));
  let c = X.champ();
  ok(c.teams.every(t => t.g === 1) && c.teams.map(t => t.id).sort().join() === 'ENG,FRA,IRE,ITA,SCO,WAL', 'a women\'s Six Nations pick plays those six');
  ok(X.overallOf(c.teams[0]) === 84, 'at the women\'s ratings');
  ok(json(c.teams[0]).indexOf('"g":1') > 0, 'with the side on each');
  X.save(); const raw = saved().champ;
  X.setChamp(null); X.restore({ champ:raw });
  const once = json(X.champ());
  ok(X.champ().teams.every(t => t.g === 1) && X.champ().id === raw.id && X.champ().teams.map(t => t.id).join() === raw.teams.map(t => t.id).join(), 'and through a save');
  X.save(); X.setChamp(null); X.restore({ champ:saved().champ });
  ok(json(X.champ()) === once, 'and again, the same');
  // saved mid-way, it keeps its teams whatever the toggle says
  s.womens = 0; D.openTeams('quick'); toggle(1); toggle(0); D.renderHub();
  ok(X.champ().teams.every(t => t.g === 1), 'the toggle never touches a championship under way');
  X.setChamp(null);
  s.womens = 1; D.openTeams('champ'); s.pool = 0; D.renderTeams();
  D.pickTeam(women('JPN'));
  c = X.champ();
  ok(c.teams.every(t => t.g === 1) && c.teams.slice(1).map(t => t.id).sort().join() === 'ESP,FIJ,SAM,SCO,WAL', 'any other women\'s nation plays the five nearest');
  X.setChamp(null);
  s.womens = 1; D.openTeams('champ'); s.pool = 5; D.renderTeams();
  D.pickTeam(S.teamList()[0]);
  c = X.champ();
  ok(c.teams.every(t => t.g === 1) && c.teams.every(t => X.ENGLAND.some(e => e.id === t.id)), 'a club list is its women\'s sides');
  ok(c.teams.every(t => !('league' in t)), 'with no league line');
  X.setChamp(null); s.womens = 0;
  D.openTeams('champ'); s.pool = 0; D.renderTeams();
  D.pickTeam(by('FRA'));
  ok(X.champ().teams.every(t => !('g' in t)) && X.champ().teams.map(t => t.id).sort().join() === 'ENG,FRA,IRE,ITA,SCO,WAL', 'Men\'s plays as it did');
  X.setChamp(null);
});

// 11. the career
pending('11. the career player\'s look and Male | Female (the career builder: the look builder)', async () => {
  const look = { g:1, skin:4, hair:2, style:6, b:1.12 };
  const male = C.create({ pos:'B', num:5, club:X.CLUBS[0] });
  ok(json(male.look) === json(S.CAREER_LOOK) && male.look.g === 0, 'a default look, male');
  ok(json(S.careerLook({ g:7, skin:99, hair:-1, style:50, b:9, x:1 })) === json({ g:0, skin:5, hair:0, style:11, b:1.16 }), `a look is cleaned (${json(S.careerLook({ g:7, skin:99, hair:-1, style:50, b:9, x:1 }))})`);
  const female = C.create({ pos:'F', num:2, club:X.CLUBS[2], look });
  ok(json(female.look) === json(look), 'the look goes on the career');
  ok(female.season.teams.every(t => t.g === 'mixed') && male.season.teams.every(t => t.g === 'mixed'), 'Minis: every side is mixed, for either player');
  const stage = (cr, n, extra = {}) => { Object.assign(cr, { stage:n, ...extra }); C.newSeason(cr); return cr.season.teams; };
  ok(stage(male, 1).every(t => !('g' in t)), 'Juniors on: a male player\'s sides are men\'s');
  ok(stage(female, 1).every(t => t.g === 1), 'a female player\'s are women\'s');
  ok(stage(male, 2).every(t => !('g' in t)) && stage(female, 2).every(t => t.g === 1), 'County the same');
  ok(stage(male, 3, { pro:'BAT' }).every(t => !('g' in t)) && stage(female, 3, { pro:'BAT' }).every(t => t.g === 1), 'Pro Club the same');
  const f4 = stage(female, 4, { country:'JPN' }), m4 = stage(male, 4, { country:'JPN' });
  ok(f4.every(t => t.g === 1) && X.overallOf(f4[0]) === 52 && f4.slice(1).map(t => t.id).sort().join() === 'ESP,FIJ,SAM,SCO,WAL', 'International: a female player\'s Japan is at the women\'s rating, among the women\'s nearest');
  ok(m4.every(t => !('g' in t)) && X.overallOf(m4[0]) === 70, 'a male player\'s at the men\'s');
  const f6 = stage(female, 4, { country:'IRE' });
  ok(f6.every(t => t.g === 1) && f6.map(t => t.id).sort().join() === 'ENG,FRA,IRE,ITA,SCO,WAL' && X.overallOf(f6[0]) === 72, 'a women\'s Six Nations side plays those six');
  // the call-up list
  const callUp = (cr) => {
    cr.stage = 3; cr.pro = 'BAT'; cr.country = null; C.newSeason(cr); C.set(cr);
    const c = cr.season; c.round = 5; c.results = c.fixtures.map(rd => rd.map(([h, a]) => { const mine = h === c.user || a === c.user; return { h, a, hs:mine ? (h === c.user ? 40 : 0) : 10, as:mine ? (a === c.user ? 40 : 0) : 10, ht:mine ? (h === c.user ? 6 : 0) : 1, at:mine ? (a === c.user ? 6 : 0) : 1 }; }));
    S.renderCareerEnd();
    return $('ce-body').innerHTML;
  };
  const fh = callUp(female);
  ok((fh.match(/data-n="/g) || []).length === 15 && fh.includes('data-n="NZL"') && !fh.includes('data-n="GEO"'), 'a female player\'s country list is the fifteen');
  ok(fh.indexOf('data-n="NZL"') < fh.indexOf('data-n="SAM"'), 'strongest first');
  C.advance('GEO');
  ok(female.country === 'ENG' && female.season.teams[0].g === 1, 'a nation with no women\'s side cannot be chosen: England');
  const mh = callUp(male);
  ok((mh.match(/data-n="/g) || []).length === 22 && mh.includes('data-n="GEO"'), 'a male player\'s is the twenty-two');
  C.advance('GEO');
  ok(male.country === 'GEO' && X.overallOf(male.season.teams[0]) === 67, 'and Georgia is there');
  // saves
  const back = C.clean(JSON.parse(json(female)));
  ok(json(back) === json(female), 'a female career loads back exactly');
  ok(C.clean({ ...JSON.parse(json(female)), country:'GEO', stage:4 }).country === 'ENG', 'a saved Georgia on a female career falls back');
  ok(json(C.clean({ ...JSON.parse(json(female)), look:{ g:'x' } }).look) === json(S.CAREER_LOOK), 'a broken look takes the default');
  ok(!('look' in C.clean({ ...JSON.parse(json(female)), look:null })) && !('look' in C.clean({ ...JSON.parse(json(female)), look:[1] })), 'a look that is not one is none');
  const mix = C.create({ pos:'B', num:4, club:X.CLUBS[0], look });
  C.set(mix); X.save();
  ok(json(saved().career.look) === json(look), 'the look is in the save');
  ok(saved().career.season.teams.every(t => t.g === 'mixed'), 'and the Minis sides stay mixed');
  C.set(null); X.load();
  ok(json(C.get()) === json(mix), 'and comes back');
  // in the match: your player
  C.play();
  const me = T.M.careerP, L = B.lookOf(me);
  ok(me.n === 4 && L.g === 1 && L.skin === 4 && L.hair === 2 && L.style === 6 && L.b === 1.12, 'your player in the match has your look');
  const fem = T.M.players.filter(p => p.team === 0).map(B.lookOf).filter(l => l.g === 1).length;
  ok(fem >= 3 && fem <= 5 && T.M.nat[0].g === 'mixed' && T.M.nat[1].g === 'mixed', `a Minis match is mixed on both sides (${fem} of 7 female on yours)`);
  ok(T.M.career && T.M.careerNat.pace != null, 'and it is still a career match');
  D.exitMatch(); C.set(null);
  const boy = C.create({ pos:'B', num:4, club:X.CLUBS[0], look:{ ...look, g:0, style:7 } });
  boy.stage = 2; C.newSeason(boy); C.set(boy); C.play();
  ok(B.lookOf(T.M.careerP).g === 0 && B.lookOf(T.M.careerP).style === 7 && T.M.players.every(p => B.lookOf(p).g === 0), 'a male player in a men\'s side, with a plait if you like');
  D.exitMatch(); C.set(null);
  // a team you made is only a name and a kit in a career
  const mine = X.cleanTeam({ key:'myw', name:'Herons', g:1, pace:3, power:3, handling:3, kicking:3, stamina:3 }, 0);
  const lad = C.create({ pos:'B', num:4, club:mine });
  ok(lad.season.teams[0].g === 'mixed', 'Minis is mixed whatever your made team plays');
  lad.stage = 1; C.newSeason(lad);
  ok(!('g' in lad.season.teams[0]), 'and a male player\'s Juniors are men\'s');
  // the New Player screen
  S.careerNewOpen();
  const d = S.draft();
  ok(json(d.look) === json(S.CAREER_LOOK), 'the screen opens on the default look');
  S.careerLookSet('g', 1); S.careerLookSet('skin', 5); S.careerLookSet('hair', 4); S.careerLookSet('style', 7); S.careerLookSet('b', 0.92);
  ok(S.careerNewGo() && json(C.get().look) === json({ g:1, skin:5, hair:4, style:7, b:0.92 }), 'Start Career takes it');
  C.set(null);
  for (const [id, labels] of [['cn-g', 'Male,Female'], ['cn-build', 'Small,Medium,Big'], ['cn-style', 'Short,Shaved,Big Hair,Scrum Cap,Headband,Bun,Ponytail,Plait,Long Plait,Bunches,High Ponytail,Long Bob']]) {
    const row = body.match(new RegExp(`id="${id}">(.*?)</div>`))[1];
    ok([...row.matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map(m => m[1]).join() === labels, `${id} reads ${labels}`);
  }
  ok(/<span class="lbl">Player<\/span>/.test(body) && /<span class="lbl">Skin<\/span>/.test(body) && /<span class="lbl">Hair Colour<\/span>/.test(body) && /<span class="lbl">Hair Style<\/span>/.test(body) && /<span class="lbl">Build<\/span>/.test(body), 'the pickers\' labels');
  ok(S.draft().look.b === 0.92 && [0.92, 1, 1.12].every(b => T.behind.cleanLook({ b }).b === b), 'each build is one the art draws');
  // stages against the lever
  ok(S.careerStageG({ look:{ g:1 } }, 0) === 'mixed' && S.careerStageG({ look:{ g:1 } }, 1) === 1 && S.careerStageG({}, 0) === 0, 'stages read the lever');
});

// 12. Create Team
pending('12. Team on Create Team (the teams builder)', async () => {
  const row = body.match(/id="bd-side">(.*?)<\/div>/)[1];
  ok([...row.matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map(m => m[1]).join() === "Men's,Women's,Mixed", 'Team: Men\'s | Women\'s | Mixed');
  const my = X.custom(); my.length = 0;
  s.womens = 0; D.openTeams('champ');
  Y.openBuilder(null);
  ok(S.teamSide(T.stamina.draft()) === 0, 'a new team starts on Men\'s');
  $('bd-name').value = 'Otters'; S.saveBuilder();
  ok(!('g' in my[0]), 'and saves with no field');
  await new Promise(r => setTimeout(r, 2));                  // a made team's key is the clock's
  Y.openBuilder(null); $('bd-name').value = 'Herons'; T.stamina.draft().g = 1; S.saveBuilder();
  ok(my[1].g === 1 && s.womens === 1, 'a women\'s team: the list follows it, so it is there');
  ok(S.teamList().some(t => t.name === 'Herons'), 'on the list');
  await new Promise(r => setTimeout(r, 2));
  Y.openBuilder(null); $('bd-name').value = 'Minnows'; T.stamina.draft().g = 'mixed'; S.saveBuilder();
  ok(my[2].g === 'mixed', 'a mixed team');
  X.save(); const raw = saved().custom;
  my.length = 0; X.restore({ custom:raw });
  ok(X.custom().map(t => t.g || 0).join() === '0,1,mixed', 'all three through a save');
  const ed = X.custom()[1];
  Y.openBuilder(ed); ok(T.stamina.draft().g === 1, 'Edit opens on its side');
  T.stamina.draft().g = 0; S.saveBuilder();
  ok(!('g' in X.custom()[1]), 'and can change it');
  // made from Quick Match to play as it
  X.custom().length = 0; s.womens = 0; s.myTeam = 'FAR'; D.openTeams('quick');
  Y.openBuilder(null); $('bd-name').value = 'Herons'; T.stamina.draft().g = 1; S.saveBuilder();
  ok(S.quickPick() === X.custom()[0] && s.womens === 1, 'made to play as it: you are on Women\'s with it');
  ok(S.teamList().every(t => t.g === 1 || t.g === 'mixed'), 'and only women\'s sides to play');
  // made from Two Player
  X.custom().length = 0; s.womens = 0; D.openJoin(); D.openTeams('two');
  Y.openBuilder(null); $('bd-name').value = 'Herons'; T.stamina.draft().g = 1; S.saveBuilder();
  ok(D.twoSel().picking === 0 && D.twoSel().teams[0].id === 'FAR', 'a women\'s team made from Two Player is not picked there');
  D.setTwo(false); X.custom().length = 0;
});

// 13. import: the label says who plays
pending('13. an import\'s side from its label (the teams builder)', async () => {
  const read = S.importSideOf;
  const TABLE = [['Bracknell U11', 'mixed'], ['Bracknell U10s', 'mixed'], ['Bracknell U7', 'mixed'], ['U9 & U10', 'mixed'], ['Under 9s', 'mixed'], ['Under-11', 'mixed'], ['Bracknell Minis', 'mixed'], ['Sevenoaks Mini', 'mixed'], ['Ash Mixed', 'mixed'],
    ['Bracknell Girls', 1], ['Bracknell Ladies', 1], ['Bracknell Women', 1], ['Bracknell Womens', 1], ["Bracknell Women's", 1], ['Bracknell Women’s', 1], ['Bracknell U12 Girls', 1], ['Bracknell U18 Girls', 1], ['U13 Ladies', 1],
    ['Bracknell U12', 0], ['Bracknell U14s', 0], ['Academy U18 1XV', 0], ['Bracknell 1st XV', 0], ['Bracknell RFC', 0], ['Bracknell Boys', 0], ['Old Boys', 0], ['', 0], [null, 0], ['U11 & U12', 0], ['Multifit', 0], ['Minister', 0], ['Mixedup', 0], ['Girlstown', 0]];
  for (const [name, g] of TABLE) ok(read(name) === g, `${name} reads ${g} (${read(name)})`);
  ok(read('Bracknell U9 Girls') === 'mixed' && read('Minis Girls') === 'mixed', 'by the rule\'s order, U11 and under is mixed first');
  const data = (club, league, label) => ({ source:'generic', club:club ? { name:club, kit:'#112233', trim:'#f2efe6' } : null, teams:[], league:league.map(l => ({ name:l, played:null, won:null, drawn:null, lost:null, points:null, kit:null, trim:null })), ...(label ? { label } : {}) });
  X.custom().length = 0; I.setLeague(null);
  let r = I.save(data('Riverside RFC', ['Ash', 'Bourne']), { kit:'#112233', trim:'#f2efe6' });
  ok(!('g' in r.club) && I.league().teams.every(t => !('g' in t)), 'a plain club and league are men\'s');
  X.custom().length = 0;
  r = I.save(data('Riverside Ladies', ['Ash', 'Bourne Ladies']), { kit:'#112233', trim:'#f2efe6' });
  ok(r.club.g === 1 && I.league().teams.every(t => t.g === 1), 'a Ladies club: women\'s, and a side with no label plays as the club does');
  X.custom().length = 0;
  r = I.save(data('Riverside U10s', ['Ash U10s', 'Bourne U10s']), { kit:'#112233', trim:'#f2efe6' });
  ok(r.club.g === 'mixed' && I.league().teams.every(t => t.g === 'mixed'), 'a U10 club and league: mixed');
  X.custom().length = 0;
  r = I.save(data('Riverside U12', ['Ash U12', 'Bourne U12 Girls']), { kit:'#112233', trim:'#f2efe6' });
  ok(!('g' in r.club) && !('g' in I.league().teams[0]) && I.league().teams[1].g === 1, 'U12 is men\'s, and U12 with Girls is women\'s');
  X.custom().length = 0;
  r = I.save(data('Riverside RFC', ['Riverside Under 10s', 'Ash'], 'Under 10s'), { kit:'#112233', trim:'#f2efe6' });
  ok(r.club.g === 'mixed', 'the club\'s side can come from the page\'s title');
  X.custom().length = 0;
  ok(I.parse('<html><head><title>U10 Girls | Riverside RFC</title></head><body></body></html>', 'https://riverside.example.org/').label === 'U10 Girls', 'the title\'s label is read before it is lost');
  ok(!('label' in I.parse('<html><head><title>Fixtures | Riverside RFC</title></head><body></body></html>', 'https://riverside.example.org/')), 'and only a label');
  r = I.save(data('Bourne Women', ['Ash', 'Chobham']), { kit:'#112233', trim:'#f2efe6' });
  const raw = JSON.parse(json(I.league()));
  I.setLeague(null);
  X.restore({ importLeague:raw });
  ok(I.league().teams.every(t => t.g === 1), 'a saved league keeps its side');
  X.restore({ importLeague:{ teams:[{ id:'QAZ', name:'Ash Vale', kit:'#1b2747', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:3 }] } });
  ok(!('g' in I.league().teams[0]), 'an old saved league is men\'s');
  // a league all of one side: its tab waits on that side
  I.setLeague({ teams:[side('QAB', 'Bourne', { key:'lg-QAB', g:1 })] });
  s.womens = 0; D.openTeams('champ'); s.pool = Y.IMPORT_POOL; D.renderTeams();
  ok(s.pool === 1 && $('t-league').hidden, 'a women\'s league on Men\'s: the tab is hidden and you are on Local');
  s.womens = 1; D.renderTeams();
  ok(!$('t-league').hidden, 'on Women\'s it is there');
  s.pool = Y.IMPORT_POOL; D.renderTeams();
  ok(S.teamList()[0].name === 'Bourne', 'with its side');
  D.pickTeam(S.teamList()[0]);
  ok(X.champ().teams.every(t => t.g === 1) && X.champ().teams.length === 6, 'and its championship tops up with Local clubs\' women\'s sides');
  X.setChamp(null); I.setLeague(null); X.custom().length = 0; s.womens = 0;
});

// 14. the preview on the New Player screen
pending('14. the New Player picture (the career builder: the look builder)', async () => {
  const man = JSON.parse(fs.readFileSync(new URL('../assets/players/players.json', import.meta.url), 'utf8'));
  const A = B.ART, cv = { width:126, height:158, getContext:() => ({ clearRect() {}, save() {}, restore() {}, translate() {}, scale() {}, drawImage() {} }) };
  A.state = 'off';
  ok(S.artPreview(cv, X.CLUBS[0], S.CAREER_LOOK) === false, 'no art: no picture, and the shirt stands in');
  B.artInstall(man, man.pages.map(() => ({ w:1, h:1, data:new Uint8ClampedArray(4) })));
  let blits = 0;
  A.img = { data:new Uint8ClampedArray(256*256*4) }; A.scratch = { width:256, height:256 }; A.sg = { putImageData() { blits++; } };
  ok(S.artPreview(cv, X.CLUBS[0], { ...S.CAREER_LOOK, g:1, style:6 }) === true && blits === 2, `the body and the hair (${blits})`);
  const row = g => B.artSprite('idle', 0, 3, false, { ...S.CAREER_LOOK, g }).row;
  ok(json(row(1)) === json(man.sprites['medium.f'].idle[3*man.clips.idle.n]) && json(row(0)) === json(man.sprites['medium.m'].idle[3*man.clips.idle.n]), 'each from its own body');
  B.artOff();
});

// 14b. women's hair: new styles appended, so nothing old moves, and each tells from the others from the front as well as the back
{
  const man = JSON.parse(fs.readFileSync(new URL('../assets/players/players.json', import.meta.url), 'utf8'));
  ok(json(man.styles) === json(['short', 'shaved', 'big', 'cap', 'band', 'bun', 'pony', 'plait', 'sideplait', 'bunches', 'highpony', 'bob']), 'the styles in look.style\'s order, the old eight where they were');
  ok(B.LOOK_STYLES === man.styles.length && B.LOOK_LONG === 8, `the game and the atlas agree (${B.LOOK_STYLES})`);
  ok(man.parts.slice(0, 12).join() === 'shirt,hoop,trim,shorts,socks,skin,hair,boots,shaved,eye,cap,line' && man.parts[12] === 'lock', 'the part ids where they were, with the lock appended');
  ok(B.LOOK_FEMALE.length === 8 && B.LOOK_FEMALE.every(st => st < B.LOOK_STYLES) && !B.LOOK_FEMALE.some(st => [1, 4, 6, 7].includes(st)), 'a women\'s squad leaves out what hangs out of sight from the front, and the headband\'s ring');
  // the picture's size, from the front and the back: a style that reads is a different shape, not only a different colour
  const of = (deg, st) => { const n = man.clips.idle.n, r = man.sprites['medium.f'].idle[man.clips.idle.dirs.indexOf(deg)*n], h = man.hair[st][r[7]]; return { w:h[3], h:h[4] }; };
  for (const [st, front, back] of [['sideplait', f => f.h >= 45, f => f.w >= 27], ['bunches', f => f.w >= 40, f => f.w >= 40], ['highpony', f => f.h >= 25, f => f.h >= 32], ['bob', f => f.h >= 30 && f.w >= 24, f => f.h >= 32 && f.w >= 24]]) {
    ok(front(of(180, st)), `${st} from the front is not a short back and sides (${json(of(180, st))}, short ${json(of(180, 'short'))})`);
    ok(back(of(0, st)), `${st} from behind (${json(of(0, st))}, short ${json(of(0, 'short'))})`);
  }
  ok(of(180, 'pony').h < 18 && of(180, 'plait').h < 18, `the old ponytail and plait are what the front cannot see, which is why they left the squads (${of(180, 'pony').h}, ${of(180, 'plait').h})`);
  const py = fs.readFileSync(new URL('blender/build_players.py', import.meta.url), 'utf8'), bits = py.slice(py.indexOf("elif style == 'sideplait'"), py.indexOf('def rope('));
  ok(bits.includes("'bob'") && !/'cap'/.test(bits), 'none of the four has a tie in a kit colour: no ring to float over the head like a halo');
  // saved looks keep theirs: the career player's look, every old style, on either body
  const nat = { ...X.CLUBS[3], g:1 };
  const lookWith = (look, n = 3) => { const t = { ...nat, squad:[{ n, look }] }; return B.lookOf(squad(t)[n - 1]); };
  for (let st = 0; st < 8; st++) for (const g of [0, 1]) { const L = lookWith({ g, skin:2, hair:3, style:st, b:1 }); ok(L.style === st && L.g === g && L.skin === 2 && L.hair === 3, `a saved look with style ${st}, ${g ? 'female' : 'male'}, keeps it`); }
  ok(lookWith({ g:1, style:10 }).style === 10 && lookWith({ g:0, style:9 }).style === 9, 'and a new one can be asked for, on either body');
  { const name = String(nat.key || nat.name || nat.id), hashOf = t => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
    ok(lookWith({ g:1 }).style === (hashOf(name) + 3*5) % 8, 'a saved female look with no style still walks the same eight it did'); }
  pending('14b. a career save keeping its look (the career builder: the look builder)', () => {
  const cleanCareer = C.clean({ ...C.create({ pos:'B', num:4, club:X.CLUBS[0], look:{ g:1, skin:4, hair:2, style:6, b:1.12 } }) });
  ok(cleanCareer && cleanCareer.look.style === 6 && C.create({ pos:'B', num:4, club:X.CLUBS[0], look:{ g:1, skin:4, hair:2, style:11, b:1 } }).look.style === 11, 'a career save keeps its style through a reload, and a new one is taken');
  });
  // hair against the shirt and the face. Only the long styles: every older look's colour is exactly as it was
  const skinsAll = B.LOOK_SKIN, hairsAll = B.LOOK_HAIR;
  let same = true, minSkin = 1e9, minShirt = 1e9, moved = 0, total = 0;
  B.artInstall(man, man.pages.map(() => ({ w:1, h:1, data:new Uint8ClampedArray(4) })));
  for (let skin = 0; skin < 6; skin++) for (let hair = 0; hair < 6; hair++) for (const [, shirt] of X.KIT_COLOURS) {
    for (let style = 0; style < 8; style++) if (B.artHairOf({ style, hair }, { shirt }, skinsAll[skin]) !== hairsAll[hair]) same = false;
    const h = B.artHairOf({ style:11, hair }, { shirt }, skinsAll[skin]); total++; if (h !== hairsAll[hair]) moved++;
    minSkin = Math.min(minSkin, X.colorDist(h, skinsAll[skin])); minShirt = Math.min(minShirt, X.colorDist(h, shirt));
  }
  ok(same, 'the older styles keep the hair colour as it was, on any kit and skin');
  ok(minSkin >= 38 && minShirt >= 54, `a long style clears the face and the shirt on every kit colour (${minSkin.toFixed(0)}, ${minShirt.toFixed(0)})`);
  ok(moved/total < 0.25, `and moves the colour only where it has to (${moved} of ${total})`);
  // the preview shows each one
  const A = B.ART, cv = { width:126, height:158, getContext:() => ({ clearRect() {}, save() {}, restore() {}, translate() {}, scale() {}, drawImage() {} }) };
  let blits = 0;
  A.img = { data:new Uint8ClampedArray(256*256*4) }; A.scratch = { width:256, height:256 }; A.sg = { putImageData() { blits++; } };
  const LOOK0 = { g:0, skin:2, hair:1, style:0, b:1 };   // PR #14's CAREER_LOOK, the look builder's default
  for (let style = 8; style < 12; style++) { blits = 0; ok(S.artPreview(cv, X.CLUBS[0], { ...LOOK0, g:1, style }) === true && blits === 2, `the picture draws style ${style} (${blits})`); }
  B.artOff();
}

// 15. the wording on screen. Every string in the game's source and the page's text
{
  const manifest = JSON.parse(fs.readFileSync(new URL('../src/manifest.json', import.meta.url), 'utf8'));
  const WORD = /\b(?:he|his|him|himself|she|her|hers|herself|man|men|guy|guys|lad|lads|chap)\b|\bhe['’]s\b|\bshe['’]s\b/i;
  const clean = t => t.replace(/\\u2019/g, '’').replace(/class="[^"]*"/g, '').replace(/\b(?:wo)?men['’]s\b/gi, '').replace(/\bMen\b/g, '');   // and Men, main's category label (Men | Women | Minis), never a pronoun
  // strings and template text, comments and regular expressions left out, ${} left out
  function literals(code) {
    const out = []; let i = 0, prev = '';
    const n = code.length;
    function str(q) { let t = ''; i++; while (i < n) { const c = code[i]; if (c === '\\') { t += code.slice(i, i + 2); i += 2; continue; } if (c === q || c === '\n') { i++; break; } t += c; i++; } out.push(t); }
    function tmpl() { let t = ''; i++; while (i < n) { const c = code[i]; if (c === '\\') { t += code.slice(i, i + 2); i += 2; continue; } if (c === '`') { i++; break; }
      if (c === '$' && code[i + 1] === '{') { i += 2; for (let d = 1; i < n && d;) { const e = code[i]; if (e === '{') d++; else if (e === '}') d--; else if (e === '`') { tmpl(); continue; } else if (e === "'" || e === '"') { str(e); continue; } i++; } t += ' '; continue; }
      t += c; i++; } out.push(t); }
    while (i < n) {
      const c = code[i];
      if (c === '/' && code[i + 1] === '/') { while (i < n && code[i] !== '\n') i++; continue; }
      if (c === '/' && code[i + 1] === '*') { i = code.indexOf('*/', i + 2) + 2; continue; }
      if (c === '/' && /[=(,:!&|?{};]/.test(prev)) { i++; while (i < n && code[i] !== '\n') { if (code[i] === '\\') { i += 2; continue; } if (code[i] === '[') { while (i < n && code[i] !== ']') { if (code[i] === '\\') i++; i++; } } if (code[i] === '/') break; i++; } i++; prev = '/'; continue; }
      if (c === '`') { tmpl(); prev = '`'; continue; }
      if (c === "'" || c === '"') { str(c); prev = c; continue; }
      if (!/\s/.test(c)) prev = c;
      i++;
    }
    return out;
  }
  let scanned = 0;
  const KEYS = new Set(['men', 'man']);                      // bare keys, never shown: ratings.json's table and a drawing's class
  for (const f of manifest) {
    const code = fs.readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');
    for (const t of literals(code)) { scanned++; if (!KEYS.has(t) && WORD.test(clean(t))) ok(false, `${f} says "${t.slice(0, 80)}"`); }
  }
  const page = body.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  ok(!WORD.test(clean(page)), `the page's own text (${(clean(page).match(WORD) || [])[0]})`);
  ok(scanned > 2000, `every string read (${scanned})`);
  ok(/Beat the Last Defender/.test(page) && /White means they are free/.test(page), 'the new words are there');
}

// 16. the privacy page and the notes
{
  const privacy = fs.readFileSync(new URL('../PRIVACY.md', import.meta.url), 'utf8').split('\n')[6];
  pending('16. PRIVACY.md naming the career player\'s look and Male or Female (the career builder, with the look builder)', () => ok(/look/.test(privacy) && /Male or Female/.test(privacy) && /on this device only/.test(privacy), 'PRIVACY.md line 7 lists the look and the choice'));
  ok(/sides\.mjs/.test(fs.readFileSync(new URL('./CHECKS.md', import.meta.url), 'utf8')), 'CHECKS.md names this suite');
  ok(/MIXED_THROUGH/.test(fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8')), 'README names the lever');
}

console.log(`Sides: ${passed} passed, ${failed} failed` + (PENDING.length ? ` · ${PENDING.length} pending for the builders: ${PENDING.join('; ')}` : ''));
process.exit(failed ? 1 : 0);
