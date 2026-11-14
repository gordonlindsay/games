// The regions' clubs and the shirts past Plain and Hoops (2026-11-14, GAME_VERSION 1.7; README.md, The regions): the five lists and
// what is held back, each club's league, county, rating and kit (src/data.js, src/ratings.js), the demo's sides as they were, a shirt
// in a match, in a save and on the menus (src/match.js, src/persistence.js, src/ui-menus.js), the league line with no place, and a
// region's club's level, county cup and career year (src/competitions.js, src/career.js).
// node tools/regions.mjs   Exits 1 on any failure.
process.env.SEED ??= '61';
const { T } = await import('./harness.mjs');
const X = T.teams, P = T.comp, C = T.career, K = T.cups;
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const json = v => JSON.stringify(v);
const memory = {};
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; } };
const by = id => X.ALL_TEAMS.find(t => t.id === id), list = k => X.TEAM_LISTS.find(l => l.key === k);
const REG = X.LIST_REGIONS.map(list), clubs = REG.flatMap(l => l.teams), HEX = /^#[0-9a-f]{6}$/;

// 1. the lists: five, after every list that was, each in the sheet's order and pinned by its codes (append only)
{
  const IDS = {
    nor:'BOW,WIL,AMB,HPA,WIG,COS,RYT,ASU,ROC,TAL,NRI,WEN',
    mid:'DAV,PET,SLL,OWY,VIP,BRY,DRT,EVE,MAV,MOA,OHA,OSA,VES,DRO,PAV,STA,WBR,ALC,KEI,OCV,SAV',
    eas:'IYM,NEM,NOI,SWL,WNO,WYM,CHG,SHO,WAT,WOO,HHE',
    sea:'HWY,OLN,JES,TOT,WIN,ASH,BRM,GAN,OCO,PHU,GRS,HAC,WIT,ORI,OTI,OWI,RWE,TRT',
    sow:'PAM,CRE,PAI,SID,TOP,MAL,MEK,RWB,SWI,WIB,CHT,DRY,LOG,SWO,NPE,WSM',
  };
  ok(X.LIST_REGIONS.join() === 'nor,mid,eas,sea,sow' && X.TEAM_LISTS.slice(-5).map(l => l.key).join() === 'nor,mid,eas,sea,sow', 'the five regions are the last five lists, in their order');
  ok(REG.map(l => l.name).join() === 'Northern,Midlands,Eastern,South East,South West' && REG.every(l => l.tier === 2 && l.name.length <= 10), 'named Northern, Midlands, Eastern, South East, South West: Local, and ten letters at most (the group\'s button on a small phone)');
  ok(REG.every(l => l.teams.map(t => t.id).join() === IDS[l.key]), `each list's sides in the sheet's order, as pinned (${REG.map(l => l.teams.length).join()})`);
  ok(clubs.length === 78 && REG.every(l => l.teams.length >= 6), '78 clubs, and every list has a championship\'s six');
  const ids = X.ALL_TEAMS.map(t => t.id), names = X.ALL_TEAMS.map(t => t.name);
  ok(new Set(ids).size === ids.length && new Set(names).size === names.length && clubs.every(t => /^[A-Z]{3}$/.test(t.id)), 'every code and every name is one side\'s alone, across every list');
  ok(['GAT', 'POT', 'SYS', 'LED', 'SPL', 'OCR'].every(id => !ids.includes(id)), 'the six held back (Gateshead, Portsmouth, Syston, Ledbury, Spalding, Old Crossleyans) are in no list, their codes free');
}

// 2. each club: its league and county, no table, rated by its league alone
{
  const tier = t => (/^Regional 1 /.test(t.league) ? 58 : /^Regional 2 /.test(t.league) ? 52 : /^Counties 1 /.test(t.league) ? 49 : 0);
  ok(clubs.every(t => tier(t) && typeof t.county === 'string' && t.county), 'every club has a Regional 1, Regional 2 or Counties 1 league and a county');
  ok(clubs.every(t => ['place', 'w', 'd', 'l', 'pf', 'pa'].every(k => !(k in t))), 'none has a place or a record: none invented');
  const wrong = clubs.filter(t => X.overallOf(t) !== tier(t) || T.ratings.CLUB_RATED[t.id] !== tier(t)).map(t => t.id);
  ok(!wrong.length, `each is the lower figure of its level's band: Regional 1 58, Regional 2 52, Counties 1 49 (${wrong.join() || 'all'})`);
  ok(X.overallOf(by('FAR')) === 61 && X.overallOf(by('IRO')) === 55 && X.overallOf(by('COB')) === 52, 'so none is above the side with a real table at its level: Farnham 61, Ironsides 55, Cobham 52');
  ok(clubs.every(t => ['pace', 'power', 'handling', 'kicking', 'stamina'].every(k => Number.isInteger(t[k]) && t[k] >= 1 && t[k] <= 5)), 'whole abilities, 1 to 5');
  ok(X.myLeagueLine(by('TOP')) === 'Regional 1 South West · Devon' && X.myLeagueLine(by('FAR')) === 'Regional 1 South Central · 7th Last Season' && X.myLeagueLine(by('QUI')) === '', 'the league line: the county in the place\'s stead (Topsham), a place as ever (Farnham), none with no league (Quins)');
  ok(T.picker.homeLine(by('NOI'), 'men') === 'Regional 2 Anglia · Eastern Counties' && T.picker.homeLine(by('FAR'), 'men') === 'Regional 1 South Central', 'the team screen\'s card: the league and the county (Norwich), the league alone as ever (Farnham)');
}

// 3. the kits: Plain and Hoops as ever, a chest band, halves, a third colour
{
  ok(clubs.every(t => HEX.test(t.kit) && HEX.test(t.trim) && (t.third == null || HEX.test(t.third)) && (t.pat == null || X.KIT_PATS.includes(t.pat))), 'every shirt, trim and third colour a colour, every pattern one the game has');
  const pat = p => clubs.filter(t => X.kitPat(t) === p).map(t => t.id).join();
  ok(pat('band') === 'BRY,OHA,WIT,DRY' && pat('halves') === 'HAC', `a chest band: Bromyard, Old Halesonians, Witney, Drybrook; halves: HAC (${pat('band')}; ${pat('halves')})`);
  ok(clubs.filter(t => t.hoops).length === 30 && clubs.every(t => !(t.hoops && t.pat)), 'thirty in hoops, and never hoops and another pattern');
  ok(clubs.filter(t => X.kitThird(t)).length === 33 && X.kitThird(by('DRY')) === '#1c1c1c' && X.kitThird(by('HWY')) === '#f2efe6', '33 with a third colour: Drybrook\'s black, High Wycombe\'s white');
  ok(X.kitPat({ hoops:true, pat:'band' }) === null && X.kitPat({ pat:'stripes' }) === null && X.kitPat(null) === null && X.kitThird({ third:'red' }) === null && X.kitThird({ third:'#12345' }) === null && X.kitThird({}) === null, 'a pattern the game has not, hoops with a pattern, a third that is no colour: none');
  ok(X.DEMO_TEAMS.every(t => !X.kitPat(t) && !X.kitThird(t)), 'no side from before the regions has a pattern or a third colour');
}

// 4. the demo behind the menus draws from the sides it always did
{
  const before = X.ALL_TEAMS.filter(t => !clubs.includes(t));
  ok(X.DEMO_TEAMS.length === X.ALL_TEAMS.length - 78 && X.DEMO_TEAMS.every((t, i) => t === before[i]) && X.DEMO_TEAMS.every((t, i) => t === X.ALL_TEAMS[i]), `DEMO_TEAMS is every side but the regions', in the order it was (${X.DEMO_TEAMS.length})`);
}

// 5. a shirt in a match, and the away side's change
{
  T.newMatch(by('FAR'), by('DRY'), { halfLen:120, diff:1, auto:true, headless:true });
  ok(json(T.M.kit[0]) === '{"fill":"#1a1a1a","trim":"#f2efe6","hoops":true}', 'Farnham\'s shirt in a match is the three fields it always was');
  T.newMatch(by('LIM'), by('DRY'), { halfLen:120, diff:1, auto:true, headless:true });
  ok(json(T.M.kit[1]) === '{"fill":"#0f7a3c","trim":"#f2efe6","hoops":false,"pat":"band","third":"#1c1c1c"}', `Drybrook's, away at Limerick's red: its band and its third colour (${json(T.M.kit[1])})`);
  T.newMatch(by('DRY'), by('HAC'), { halfLen:120, diff:1, auto:true, headless:true });
  ok(T.M.kit[1].pat === 'halves' && !('third' in T.M.kit[1]) && T.M.kit[0].pat === 'band', 'HAC\'s halves, with no third colour');
  const clash = X.awayKit(by('BRY'), by('DRY'));
  ok(json(clash) === '{"fill":"#f2efe6","trim":"#0f7a3c","hoops":false,"pat":"band","third":"#1c1c1c"}', `green at green: Drybrook's colours swapped, its band and third colour kept (${json(clash)})`);
  const dark = X.awayKit(by('FAR'), by('DAV'));
  ok(dark.fill !== by('DAV').kit && !('pat' in dark) && !('third' in dark), `black at black: Daventry changes, plain (${json(dark)})`);
  ok(json(X.kitLook('#111111', '#222222', false)) === '{"fill":"#111111","trim":"#222222","hoops":false}', 'a side with neither: no pattern or third field at all');
}

// 6. a side in a save keeps its pattern and third colour, and no other side gains a field
{
  const d = X.cleanSide(by('DRY')), f = X.cleanSide(by('FAR')), back = X.cleanSide(JSON.parse(json(d)));
  ok(d.pat === 'band' && d.third === '#1c1c1c' && back.pat === 'band' && back.third === '#1c1c1c', 'Drybrook saved and read back: its band and its third colour');
  ok(!('pat' in f) && !('third' in f), 'Farnham saved: neither field');
  ok(!('pat' in X.cleanSide({ ...by('DRY'), pat:'stripes' })) && !('third' in X.cleanSide({ ...by('DRY'), third:'javascript:x' })) && !('pat' in X.cleanSide({ ...by('DRY'), hoops:true })), 'a pattern the game has not, a third that is no colour and hoops with a pattern are dropped on the way in');
}

// 7. the menus' shirt
{
  ok(X.jersey(by('FAR')) === '<span class="jw "><span class="jersey hoops" style="--kit:#1a1a1a;--trim:#f2efe6"></span></span>', 'Farnham\'s shirt is the markup it always was');
  ok(X.jersey(by('DRY')) === '<span class="jw "><span class="jersey band c3" style="--kit:#0f7a3c;--trim:#f2efe6;--third:#1c1c1c"></span></span>', `Drybrook: a band and a third colour (${X.jersey(by('DRY'))})`);
  ok(/class="jersey halves" style="--kit:#1b2747;--trim:#7a1f2b"/.test(X.jersey(by('HAC'))) && /class="jersey hoops c3"/.test(X.jersey(by('HWY'))) && /class="jersey c3"/.test(X.jersey(by('MAV'), 'mini')), 'HAC halves, High Wycombe hoops and a third, Malvern plain and a third');
}

// 8. where a region's club sits: its level from its league, its county cup, its rivals from its own region
{
  ok(P.levelOf(by('TOP')) === 5 && P.levelOf(by('KEI')) === 6 && P.levelOf(by('HWY')) === 7, 'levels: Topsham 5 (Regional 1), Kenilworth 6 (Regional 2), High Wycombe 7 (Counties 1)');
  ok(P.countyOf(by('ORI')) === 'SUR' && P.countyOf(by('WIN')) === 'HAM' && P.countyOf(by('TOP')) === null, 'Old Reigatian is Surrey\'s, Winchester Hampshire\'s, Topsham the plain table\'s');
  ok(P.cupFor(by('ORI')).name === 'Surrey Trophy' && P.cupFor(by('JES')).name === 'Hampshire Cup' && P.cupFor(by('TOP')).name === 'County Cup' && P.cupFor(by('KEI')).name === 'County Trophy' && P.cupFor(by('HWY')).name === 'County Trophy', 'their cups: Surrey Trophy, Hampshire Cup, County Cup, County Trophy');
  ok(P.region(by('TOP')).key === 'sow' && P.region(by('FAR')) === null && P.region({ ...by('TOP'), custom:true }) === null, 'a region\'s club knows its region; Farnham and a made side have none');
  let good = true, local = true;
  for (let i = 0; i < 20; i++) {
    const r = P.rivals(by('TOP')), f = P.rivals(by('FAR'));
    good = good && r.length === 7 && new Set(r).size === 7 && r.every(t => list('sow').teams.includes(t) && t.id !== 'TOP');
    local = local && f.length === 7 && f.every(t => !clubs.includes(t));
  }
  ok(good, 'Topsham\'s cup draws seven of the South West, never itself');
  ok(local, 'Farnham\'s draws from Surrey and Counties as ever, never a region\'s club');
  const small = P.rivals(by('HHE'));
  ok(small.length === 7 && small.every(t => list('eas').teams.includes(t)), 'the smallest region (Eastern, eleven) still fills a cup');
}

// 9. a career and a championship at a region's club
{
  const cr = C.create({ pos:'B', num:5, club:by('TOP'), league:'sow' });
  ok(cr && C.league(cr) === 'sow' && cr.season.teams.length === 6 && cr.season.teams.slice(1).every(t => list('sow').teams.some(o => o.id === t.id)), 'a rookie at Topsham: the South West\'s league, his club and five of its list');
  C.set(cr);
  const c = cr.season, order = [1, 2, 3, 4, 5]; order.splice(0, 0, c.user);
  c.results = c.fixtures.map(rd => rd.map(([h, a]) => (order.indexOf(h) < order.indexOf(a) ? { h, a, hs:20, as:0, ht:4, at:0 } : { h, a, hs:0, as:20, ht:0, at:4 })));
  c.round = c.fixtures.length;
  ok(C.outcome(cr).next.phase === 'county', 'and its year goes on to its county cup, as a Local club\'s does');
  C.set(null);
  X.setChamp(null); X.newChamp(by('DRY'), list('sow').teams.filter(t => t.id !== 'DRY'));
  const ch = X.champ(), me = ch && ch.teams[0];
  ok(ch && ch.teams.length === 6 && me.id === 'DRY' && me.pat === 'band' && me.third === '#1c1c1c', 'a championship from Drybrook: six sides, and its own keeps its band and third colour');
  X.setChamp(null);
}

console.log(`Regions: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
