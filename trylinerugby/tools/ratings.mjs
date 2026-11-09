// Ratings: the table pinned, abilities from a rating, the league lines, nations in championships and careers, ratings.json, and the
// developer's update script. Exits 1 on any failure.
// node tools/ratings.mjs
import fs from 'node:fs';
process.env.SEED ??= '31';
let bootFetches = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (...a) => { bootFetches++; return realFetch(...a); };   // before the game boots, to count what it asks for
const { T, reseed, bot } = await import('./harness.mjs');
const U = await import('./ratings/update.mjs');
const R = T.ratings, X = T.teams, C = T.career, D = T.debug, I = T.importer;
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const by = id => X.ALL_TEAMS.find(t => t.id === id);
const read = p => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const KEYS = ['pace', 'power', 'handling', 'kicking', 'stamina'];
const sumOf = t => KEYS.reduce((a, k) => a + t[k], 0);
/* The merge (README, Integration with PR #14): main's tiers, natList and official tables rate the teams, and PR #14's club data, lists, stars on
   screen, women's sides and career stages wait for the builders. A section of those is recorded here, not run, and named in the last line; a
   builder that brings one in takes its pending() off. Everything else (abilitiesFor, the star scale, the levels, ratings.json's checks and
   fetch, the developer's script, the drawing of stars, a made team's level, Import Club's level) runs. */
const PENDING = [];
const pending = (what, fn) => { PENDING.push(what); };

// 1. the table, by hand from the brief. A change to a rating has to change this too.
const TABLE = {
  RSA:96, NZL:93, IRE:87, FRA:87, SCO:84, ENG:84, AUS:81, ARG:78, ITA:70, WAL:70, FIJ:70, JPN:70, GEO:67, POR:61, USA:58, ESP:55, CHI:55, TGA:55, URU:55, SAM:52, CDA:49, ROU:46,
  NTH:75, BAT:72, EXE:72, LEI:72, LON:70, BRS:70, SAL:67, GLO:67, HAR:67, NEW:64,
  DUB:75, LIM:72, GAL:70, BEL:70, COR:58, BMA:49,
  BOR:90, TLS:75, MPL:72, PAR:72, PAU:72, NAN:72, LRO:70, CLE:70, TLN:70, CAS:70, LYO:67, BAY:67, PGN:67, MTB:64,
  BRI:70, CAN:70, PTH:70, SYD:67, MEL:61, ADL:61,
  CPT:72, PRE:72, JHB:70, DUR:70, KIM:61, BLM:61, MBO:61,
  GLA:72, CDF:70, SWA:70, EDI:67, TRE:67, LLA:67, NPT:67, PMA:64,
  EAL:64, BED:64, COV:64, WOR:64, CHN:64, HPY:64, CWL:64, DON:64, NOT:61, AMP:61, CAL:61, RIC:61, CAM:61,
  FAR:58, WIM:55, IRO:52, GUI:49, COB:49, WEY:49, ORU:46, KIN:43, HAS:43, ALD:43, GDN:40,
  EFF:43, WAN:40, EGH:40, MER:40, MIT:40, FEL:40,
};
// the star scale by hand, overall to stars: one scale for every side, whatever its list
const STARS = { 40:1, 43:2, 46:2, 49:2.5, 52:2.5, 55:3, 58:3, 61:3.5, 64:3.5, 67:3.5, 70:4, 72:4, 75:4.5, 78:4.5, 81:4.5, 84:4.5, 87:4.5, 90:5, 93:5, 96:5, 99:5 };
pending('1. PR #14\'s own table, its club cap of 75 with Bordeaux at 90 and its 22 nations (main\'s band instead: tools/teams.mjs 12)', () => {
  const wrong = Object.entries(TABLE).filter(([id, ov]) => !by(id) || X.overallOf(by(id)) !== ov).map(([id, ov]) => `${id} ${by(id) && X.overallOf(by(id))} not ${ov}`);
  ok(!wrong.length, `every listed team's overall is the table's (${wrong.join(', ') || Object.keys(TABLE).length + ' teams'})`);
  ok(X.ALL_TEAMS.every(t => t.id in TABLE) && Object.keys(TABLE).length === X.ALL_TEAMS.length, 'and every team in the game is on the table');
  ok(X.ENGLAND.map(t => t.name).join() === 'Northampton,Bath,Exeter,Leicester,London,Bristol,Sale,Gloucester,Twickenham,Newcastle', 'England is in table order');
  ok(X.IRELAND.map(t => t.name).join() === 'Dublin,Limerick,Galway,Belfast,Cork,Ballymena', 'Ireland is in table order');
  ok(X.ENGLAND.includes(X.CLUBS[5]) && X.CLUBS[5].id === 'HAR' && X.CLUBS.indexOf(X.CLUBS[5]) === 5, 'The side coded HAR stays where it is in Local and is the same object in England');
  const clubs = [...X.CLUBS, ...X.FRANCE, ...X.AUSTRALIA, ...X.SOUTH_AFRICA, ...X.ENGLAND, ...X.IRELAND, ...X.WALES_SCOTLAND_ITALY, ...X.ENGLAND_TWO, ...X.COUNTIES];
  const over = clubs.filter(t => X.overallOf(t) > R.CLUB_CAP).map(t => t.id);
  ok(over.join() === 'BOR' && JSON.stringify(R.CLUB_OVER_CAP) === '{"BOR":90}' && R.CLUB_CAP === 75, `the club cap is 75, with one named exception, Bordeaux at 90, the European champion (${over})`);
  ok(clubs.filter(t => X.overallOf(t) === 75).map(t => t.id).sort().join() === 'DUB,NTH,TLS', 'only the top flights\' national champions reach the cap: Northampton, Toulouse, Dublin');
});
{
  // the star scale, and every team's stars against it
  for (const [ov, st] of Object.entries(STARS)) ok(R.starsOfOverall(+ov) === st, `${ov} is ${st} stars (${R.starsOfOverall(+ov)})`);
  { const seen = new Set(); for (let s = 5; s <= 25; s++) seen.add(Math.round(40 + (s - 5)*59/20));
    ok([...seen].every(v => v in STARS) && Object.keys(STARS).length === seen.size, 'the scale names all 21 overalls a side can have');
    let last = 0, up = true; for (let v = 30; v <= 100; v++) { const st = R.starsOfOverall(v); if (st < last) up = false; last = st; }
    ok(up && R.starsOfOverall(30) === 1 && R.starsOfOverall(47) === 2 && R.starsOfOverall(60) === 3 && R.starsOfOverall(74) === 4 && R.starsOfOverall(89) === 4.5 && R.starsOfOverall(100) === 5, 'and a number between them (a career player can be any) takes the value below, 1 star the minimum');
    pending('every team\'s stars against PR #14\'s table (main\'s: tools/teams.mjs 12)', () => {
    const wrong = Object.entries(TABLE).filter(([id, ov]) => R.starsOf(by(id)) !== STARS[ov]).map(([id]) => id);
    ok(!wrong.length, `every team's stars are the table's (${wrong.join() || Object.keys(TABLE).length + ' teams'})`);
    const count = {}; for (const ov of Object.values(TABLE)) count[STARS[ov]] = (count[STARS[ov]] || 0) + 1;
    const shape = Object.keys(count).map(Number).sort((a, b) => a - b).map(k => k + ':' + count[k]).join(' ');
    ok(shape === '1:6 2:6 2.5:7 3:8 3.5:34 4:30 4.5:9 5:3', `how many sides at each star level, which a change has to change here too. Only 5 stars is under 6, the owner's rare one (${shape})`);
    ok(['BOR', 'RSA', 'NZL'].every(id => R.starsOf(by(id)) === 5), 'five stars is Bordeaux and the top two nations');
    });
    ok(R.starsWords(1) === '1 Star' && R.starsWords(2.5) === '2.5 Stars', 'and the words for a screen reader');
  }
  // the levels: one table, with what each can spend
  { const row = R.TEAM_LEVELS.map(l => [l.id, l.name, l.overall, l.stars, l.budget].join(':')).join();
    // re-pinned at the real order (2026-11-09): each level is the best built-in side of its league on the clubs' ladder (Farnham's Regional 1 61,
    // England 2's National League 64), PR #14's 40 to 58 a step up; its European Champions (90) went with Bordeaux's 90, read as National Champions
    ok(row === 'c5:Counties 5:43:2:1,c3:Counties 3:46:2:2,c1:Counties 1:52:2.5:4,r2:Regional 2:55:3:5,r1:Regional 1:61:3.5:7,nat:National League:64:3.5:8,top:Top Flight:72:4:11,champ:National Champions:75:4.5:12', `the level table (${row})`);
    const best = re => Math.max(...X.ALL_TEAMS.filter(t => re.test(t.league || '')).map(X.overallOf));
    ok([[/Counties 5/, 'c5'], [/Counties 3/, 'c3'], [/Counties 1/, 'c1'], [/Regional 2/, 'r2'], [/Regional 1/, 'r1'], [/English Championship/, 'nat']].every(([re, id]) => best(re) === R.TEAM_LEVELS.find(l => l.id === id).overall) && R.TEAM_LEVELS.find(l => l.id === 'champ').overall === Math.max(...X.ALL_TEAMS.filter(t => !X.isNation(t)).map(X.overallOf)), 'each level is the best built-in side of its league, National Champions the best club');
    ok(R.TEAM_LEVELS.every(l => R.starsOfOverall(l.overall) === l.stars && R.abilitiesFor({}, 5 + l.budget) && X.overallOf(R.abilitiesFor({}, 5 + l.budget)) === l.overall), 'a level spent in full is its own overall and stars');
    ok(R.TEAM_LEVELS.find(l => l.id === 'champ').budget === X.BUDGET, 'and the old budget of 12 is the National Champions level');
  }
  // a real score, however big, never costs a saved season (a level 90 side on Easy with long halves passes 260)
  { const pair = X.NATIONS.slice(0, 6), saved = (hs, as) => { const c = { user:0, teams:pair.map(t => ({ ...t })), round:1, fixtures:[[[0, 1], [2, 3], [4, 5]], [[0, 2], [1, 4], [3, 5]], [[0, 3], [1, 5], [2, 4]], [[0, 4], [1, 3], [2, 5]], [[0, 5], [1, 2], [3, 4]]], results:[[{ h:0, a:1, hs, as, ht:0, at:0 }, { h:2, a:3, hs:7, as:5, ht:1, at:1 }, { h:4, a:5, hs:7, as:5, ht:1, at:1 }]] }; return X.cleanChamp(c); };
    ok(saved(229, 0) && saved(229, 0).results[0][0].hs === 229, 'a saved 229 keeps the Championship and the score');
    ok(saved(3, 264) && saved(3, 264).results[0][0].as === 264, 'and so does 3-264');
    ok(!saved(1000, 0) && !saved(-1, 0), 'only a number no match could make is a damaged save'); }
  pending('PR #14\'s Wales Scotland Italy, its bands from 40 and its 22 nations (England 2 and Counties are in main\'s tiers: tools/teams.mjs 12; its English bands are live since the real order, below)', () => {
  // the new lists
  ok(X.WALES_SCOTLAND_ITALY.map(t => t.name).join() === 'Glasgow,Cardiff,Swansea,Edinburgh,Treviso,Llanelli,Newport,Parma', 'Wales, Scotland and Italy, in table order');
  ok(X.ENGLAND_TWO.map(t => t.name).join() === 'Ealing,Bedford,Coventry,Worcester,Chinnor,Hartpury,Cornwall,Doncaster,Nottingham,Ampthill,Caldy,Richmond,Cambridge', 'England 2, in table order, the side from London left out');
  ok(new Set(X.ALL_TEAMS.map(t => t.name)).size === X.ALL_TEAMS.length, 'no two sides in the game share a name');
  ok(X.COUNTIES.map(t => t.name).join() === 'Effingham,Wandsworth,Guildfordians,Egham,Merton,Mitcham,Feltham' && X.COUNTIES.includes(X.CLUBS[7]), 'Counties: a Counties 3 side and Counties 5 in table order, Guildfordians the Local list\'s own');
  ok(X.COUNTIES.every(t => X.overallOf(t) === (/Counties 3/.test(t.league) ? 43 : 40)), 'and every side is Counties 3\'s 43 or Counties 5\'s 40');
  { const close = (a, b) => (!!a.hoops === !!b.hoops) && X.colorDist(a.kit, b.kit) < 40 && X.colorDist(a.trim, b.trim) < 60, same = (list, l) => list.flatMap((a, i) => list.slice(i + 1).filter(b => close(a, b)).map(b => a.name + '/' + b.name)).join();
    for (const [name, list] of [['England 2', X.ENGLAND_TWO], ['Counties', X.COUNTIES]]) ok(!same(list), `no two sides on ${name} wear the same shirt, trim and pattern at a glance (${same(list)})`);
    const blocks = l => l.flatMap((a, i) => l.slice(i + 1).filter(b => a.kit === b.kit && a.trim === b.trim).map(b => a.name + '/' + b.name)).join();
    ok(!blocks(X.ENGLAND_TWO), `and no two share a table chip, shirt over trim (${blocks(X.ENGLAND_TWO)})`); }
  ok(X.ENGLAND_TWO.every(t => X.overallOf(t) === (t.w > t.l ? 64 : 61)), 'England 2 is 64 with a winning record, else 61, between Regional 1 and the top flight');
  // the bands stay apart: a league's foot is not under the league below's top
  { const band = re => X.ALL_TEAMS.filter(t => re.test(t.league || '')).map(X.overallOf), span = re => [Math.min(...band(re)), Math.max(...band(re))];
    const steps = [/Counties 5/, /Counties 3/, /Counties 1/, /Regional 2/, /Regional 1/, /English Championship/, /English Premiership/].map(span);
    ok(steps.every((v, i) => !i || v[0] >= steps[i - 1][1]), `each level of the English game starts where the last stops (${steps.map(v => v.join('-')).join(', ')})`);
  }
  ok(Math.max(...X.allNations().map(X.overallOf)) === 96, 'nations may go above it, and South Africa is 96');
  });
  // PR #14's English bands, live in main's lists since the real order (2026-11-09): England 2 64 or 61, and each level of the English game
  // starts where the last stops, Counties 5 up to the Premiership
  ok(X.ENGLAND_TWO.every(t => X.overallOf(t) === (t.w > t.l ? 64 : 61)), 'England 2 is 64 with a winning record, else 61, between Regional 1 and the top flight');
  { const band = re => X.ALL_TEAMS.filter(t => re.test(t.league || '')).map(X.overallOf), span = re => [Math.min(...band(re)), Math.max(...band(re))];
    const steps = [/Counties 5/, /Counties 3/, /Counties 1/, /Regional 2/, /Regional 1/, /English Championship/, /English Premiership/].map(span);
    ok(steps.every((v, i) => !i || v[0] >= steps[i - 1][1]) && steps.map(v => v.join('-')).join() === '43-43,46-46,49-52,52-55,58-61,61-64,67-75', `each level of the English game starts where the last stops (${steps.map(v => v.join('-')).join(', ')})`); }
  const WOMEN = { NZL:96, ENG:96, CDA:93, FRA:84, USA:72, IRE:72, AUS:70, RSA:64, ITA:64, SCO:61, WAL:58, FIJ:58, JPN:52, ESP:49, SAM:43 };
  ok(JSON.stringify(R.BUNDLED.women) === JSON.stringify(WOMEN) && !['GEO', 'POR', 'TGA', 'CHI', 'ROU', 'ARG', 'URU'].some(id => id in R.BUNDLED.women), "the women's table is bundled with its 15 nations");
  ok(R.BUNDLED.date === '2026-11-07', 'the table carries its date');
  ok(Object.entries(R.BUNDLED.men).every(([id, ov]) => TABLE[id] === ov) && Object.keys(R.BUNDLED.men).length === 22, "the bundled men's table is the 22 nations (PR #14's, the shape ratings.json is checked against)");
  pending('the 22 nations\' kits and codes (PR #14\'s nations: main has its fourteen)', () => {
  ok(X.NATIONS.map(t => t.id).join() === 'ENG,FRA,IRE,ITA,SCO,WAL' && X.MORE_NATIONS.every(t => /^#[0-9a-f]{6}$/i.test(t.kit + '') && /^#[0-9a-f]{6}$/i.test(t.trim) && /^#[0-9a-f]{6}$/i.test(t.alt) && /^#[0-9a-f]{6}$/i.test(t.altTrim)), 'the Six Nations keep their order; every other nation has kit, trim, alt kit and alt trim');
  ok(by('CAN').name === 'Canberra' && by('CDA').name === 'Canada', 'Canberra keeps CAN, Canada is CDA');
  const ids = X.ALL_TEAMS.map(t => t.id);
  ok(new Set(ids).size === ids.length && !C.COUNTIES.some(t => ids.includes(t.id)), 'every code is unique, nations and counties included');
  });
}

// 2. abilities from a flavour and a sum
{
  const flavours = X.ALL_TEAMS.map(t => Object.fromEntries(KEYS.map(k => [k, t[k]])));
  flavours.push({ pace:5, power:5, handling:5, kicking:5, stamina:5 }, { pace:1, power:1, handling:1, kicking:1, stamina:1 }, { pace:3 });
  let bad = 0, order = 0;
  for (const f of flavours) for (let s = 5; s <= 25; s++) {
    const a = R.abilitiesFor(f, s);
    if (sumOf(a) !== s || !KEYS.every(k => Number.isInteger(a[k]) && a[k] >= 1 && a[k] <= 5) || JSON.stringify(a) !== JSON.stringify(R.abilitiesFor(f, s))) bad++;
    for (const k of KEYS) for (const j of KEYS) if (f[k] > f[j] && a[k] < a[j]) order++;
  }
  ok(!bad, `any flavour and any sum from 5 to 25: whole abilities 1 to 5 that add up, the same every time (${bad} bad)`);
  ok(!order, `an ability that started ahead of another is never behind it after (${order} broken)`);
  ok(JSON.stringify(R.abilitiesFor({ pace:4, power:3, handling:4, kicking:3, stamina:3 }, 13)) === '{"pace":4,"power":2,"handling":3,"kicking":2,"stamina":2}', 'points come off where the side is weakest first');
  ok(JSON.stringify(R.abilitiesFor({ pace:5, power:3, handling:4, kicking:3, stamina:4 }, 20)) === '{"pace":5,"power":4,"handling":4,"kicking":3,"stamina":4}', 'a point goes where the side is already strong, past an ability already at 5, Pace and Power counting one up');
  ok(JSON.stringify(R.abilitiesFor({ pace:4, power:4, handling:5, kicking:5, stamina:5 }, 21)) === '{"pace":4,"power":4,"handling":5,"kicking":4,"stamina":4}', 'and points come off the others first, where it is level');
  // two sides with one overall: not one spent on what wins matches and one spent on what does not. These pairs played far apart under the old order
  ok(R.abilitiesFor({ pace:5, power:5, handling:5, kicking:5, stamina:5 }, 99).pace === 5 && sumOf(R.abilitiesFor({}, 1)) === 5, 'a sum out of range is held to 5 to 25');
  ok(R.sumOfOverall(96) === 24 && R.sumOfOverall(43) === 6 && R.sumOfOverall(75) === 17, 'overallOf, the other way');
  pending('2. each listed side\'s abilities at PR #14\'s own ratings (main\'s band: tools/teams.mjs 12)', () => {
  const legs = t => t.pace + t.power, ab = t => KEYS.map(k => t[k]).join('');
  ok(ab(by('IRE')) === '44544' && ab(by('FRA')) === '55335' && ab(by('SCO')) === '54434' && ab(by('ENG')) === '45344', `Ireland and France at 87, England and Scotland at 84 (${[by('IRE'), by('FRA'), by('SCO'), by('ENG')].map(ab)})`);
  const w = id => T.sidesOf.WOMEN_NATIONS.find(t => t.id === id);
  ok(ab(w('IRE')) === '33433' && ab(w('USA')) === '44323', `Ireland's and the USA's women at 72 (${ab(w('IRE'))} ${ab(w('USA'))})`);
  const byOverall = {};
  for (const t of X.allNations()) (byOverall[X.overallOf(t)] ||= []).push(t);
  ok(Object.values(byOverall).every(l => Math.max(...l.map(legs)) - Math.min(...l.map(legs)) <= 3), `nations level on overall are within 3 on Pace and Power (${Object.entries(byOverall).map(([ov, l]) => ov + ':' + (Math.max(...l.map(legs)) - Math.min(...l.map(legs))))})`);
  ok(R.abilitiesFor({ pace:5, power:5, handling:5, kicking:5, stamina:5 }, 99).pace === 5 && sumOf(R.abilitiesFor({}, 1)) === 5, 'a sum out of range is held to 5 to 25');
  const top = (id, ...k) => { const t = by(id), best = Math.max(...KEYS.map(x => t[x])); return k.every(x => t[x] === best); };
  ok(top('FIJ', 'pace') && by('FIJ').handling >= 4 && by('FIJ').kicking === 1, 'Fiji: pace and handling');
  ok(top('RSA', 'power') && top('GEO', 'power') && by('GEO').power === 5 && top('ROU', 'power'), 'South Africa, Georgia and Romania: power');
  ok(top('JPN', 'pace', 'stamina'), 'Japan: pace and stamina');
  ok(top('NZL', 'pace', 'handling') && top('ARG', 'power') && top('AUS', 'handling') && top('TGA', 'power'), 'New Zealand, Argentina, Australia and Tonga keep their characters too');
  ok(top('FAR', 'pace') && top('EXE', 'power') && top('BRS', 'pace') && top('DUB', 'handling'), 'and so do the clubs');
  ok(X.overallOf(by('RSA')) === 96 && R.sumOfOverall(96) === 24 && R.sumOfOverall(43) === 6 && R.sumOfOverall(75) === 17, 'overallOf, the other way');
  });
}

// 3. the league lines: real figures, read from the list
pending('3. the league lines with PR #14\'s codes, Cork, Ballymena and Twickenham (main\'s codes: tools/teams.mjs 12)', () => {
  const line = t => [t.league, t.place, t.w, t.d, t.l, t.pf, t.pa].join();
  ok(line(by('FAR')) === 'Regional 1 South Central,7,10,0,12,640,646', `Farnham's line (${line(by('FAR'))})`);
  ok(line(by('TLS')) === 'Top 14,1,18,0,8,981,617' && line(by('NTH')) === 'English Premiership,1,14,1,3,693,536' && line(by('DUB')) === 'United Rugby Championship,2,12,0,6,515,370', 'Toulouse, Northampton and Dublin');
  ok(line(by('COR')) === 'All-Ireland League 1A,5,10,0,8,430,391' && line(by('KIM')) === 'Currie Cup,1,6,0,1,271,143' && line(by('BRI')) === 'Super Rugby Pacific,5,8,0,6,364,386' && line(by('GDN')) === 'Counties 5 Surrey,4,7,0,7,422,313', 'Cork, Kimberley, Brisbane and Guildfordians');
  ok(line(by('GLA')) === 'United Rugby Championship,1,13,0,5,479,338' && line(by('PMA')) === 'United Rugby Championship,16,2,0,16,312,587' && line(by('EAL')) === 'English Championship,1,26,0,0,1125,435' && line(by('CAM')) === 'English Championship,14,0,1,25,447,1190', 'Glasgow, Parma, Ealing and Cambridge');
  ok(!by('MEL').league && !by('ADL').league && X.allNations().every(t => !t.league) && C.COUNTIES.every(t => !t.league), 'Melbourne, Adelaide, the nations and the counties have no line');
  const withLine = X.ALL_TEAMS.filter(t => !X.allNations().includes(t) && t.id !== 'MEL' && t.id !== 'ADL');
  ok(withLine.every(t => t.league && Number.isInteger(t.place) && t.place >= 1 && ['w', 'd', 'l', 'pf', 'pa'].every(k => Number.isInteger(t[k]) && t[k] >= 0)), `every other club has a line (${withLine.length})`);
  X.newChamp(by('FAR'), X.CLUBS.slice(1, 6));
  ok(X.champ().teams.every(t => !('league' in t) && !('pf' in t)), 'a championship keeps no league line');
  const cr = C.create({ pos:'B', num:4, club:by('FAR') });
  ok(!('league' in cr.club) && cr.season.teams.every(t => !('league' in t)), 'nor does a career');
  X.setChamp(null);
  const text = [read('../src/data.js'), read('../src/ratings.js'), read('../src/career.js')].join('\n');
  const names = X.ALL_TEAMS.map(t => t.name + ' ' + (t.league || '')).join(' | ');
  ok(!/Saints|Saracens|Tigers|Chiefs|Bears|Sharks|Red Bulls|Leinster|Munster|Connacht|Ulster|Stormers|Griquas|Cheetahs|Pumas|Lions|Waratahs|Reds\b|Brumbies|Force\b|Stade|Racing 92|Gallagher|Energia|Vandals|Harlequins|Quins\b|Warriors|Ospreys|Scarlets|Dragons|Benetton|Zebre|Trailfinders|Blues\b|Pirates|Knights|Champ Rugby/.test(names), 'no club name or nickname and no sponsor reaches a team or league name');
  ok(!/Saints|Saracens|Leinster|Munster|Connacht|Gallagher|Energia|Harlequins|Quins\b|Warriors|Ospreys|Scarlets|Benetton|Zebre|Trailfinders|Pirates/.test(text), 'nor the source');
  const shipped = [read('../game.js'), read('../index.html'), read('../sw.js'), read('../ratings.json')].join('\n');
  ok(!/Harlequins|Quins\b/.test(shipped), 'nor anything a player loads: every professional side goes by a place');
  ok(by('HAR').name === 'Twickenham' && X.ENGLAND.includes(by('HAR')) && X.CLUBS[5] === by('HAR') && X.overallOf(by('HAR')) === 67, 'the Premiership side from there is Twickenham, one team, at 67');
  // a save from before the rename, and what a player named themselves
  const oldSide = { id:'HAR', name:'Harlequins', kit:'#c8306f', trim:'#7eb0dc', pace:4, power:3, handling:4, kicking:3, stamina:3 };
  ok(X.cleanSide(oldSide).name === 'Twickenham' && X.cleanSide(oldSide).id === 'HAR', 'a saved side with the old name comes back under the place');
  ok(X.cleanSide({ ...oldSide, key:'lg-HAR' }).name === 'Harlequins' && X.cleanSide({ ...oldSide, key:'my1', custom:true }).name === 'Harlequins', "a team you made or imported keeps the name you gave it");
  const oldCareer = C.clean({ pos:'B', num:4, club:oldSide, skills:{}, stage:0, history:[{ stage:0, name:'Harlequins', place:3, up:false, w:2, d:0, l:3 }] });
  ok(oldCareer.club.name === 'Twickenham' && oldCareer.history[0].name === 'Twickenham', 'and a saved career and its history read the place too');
});

// 4. nations in a championship
pending('4. nations in a championship (PR #14\'s 22 nations; main plays natGroup)', () => {
  for (const t of X.NATIONS) {
    const five = R.champOthers(t, 0);
    ok(five.length === 5 && !five.includes(t) && five.every(o => X.NATIONS.includes(o)), `${t.name} plays the other five of the Six Nations`);
  }
  const near = id => R.nationsNearest(by(id)).map(t => t.id).join();
  ok(near('FIJ') === 'ITA,WAL,JPN,GEO,ARG', `Fiji plays the five nearest (${near('FIJ')})`);
  ok(near('ROU') === 'CDA,SAM,ESP,CHI,TGA', `Romania plays the five nearest (${near('ROU')})`);
  ok(near('RSA') === 'NZL,FRA,IRE,ENG,SCO', `South Africa plays the five nearest (${near('RSA')})`);
  ok(R.champOthers(by('FIJ'), 0).map(t => t.id).join() === near('FIJ'), 'the championship uses them');
  X.newChamp(by('FIJ'), R.champOthers(by('FIJ'), 0));
  const c = X.champ(), opps = c.fixtures.map(rd => { const p = rd.find(x => x.includes(c.user)); return p[0] === c.user ? p[1] : p[0]; }).map(i => X.rateOf(c.teams[i]));
  ok(opps.every((v, i) => !i || v >= opps[i - 1]) && opps[4] === X.rateOf(by('ARG')), `weakest first, strongest last (${opps})`);
  const custom = X.cleanTeam({ name:'Badgers', pace:5, power:5, handling:3, kicking:2, stamina:2 }, 0);
  ok(R.champOthers(custom, 0).length === 5 && R.champOthers(custom, 0).every(t => X.allNations().includes(t)), 'a team you made on International plays five nations too');
  ok(R.champOthers(by('BAT'), 5).every(t => X.ENGLAND.includes(t)) && R.champOthers(by('BAT'), 5).length === 9, 'England draws from England');
  X.setChamp(null);
  ok(R.nationsRanked().map(t => t.id).join() === 'RSA,NZL,FRA,IRE,ENG,SCO,AUS,ARG,ITA,WAL,FIJ,JPN,GEO,POR,USA,ESP,CHI,TGA,URU,SAM,CDA,ROU', `International is strongest first (${R.nationsRanked().map(t => t.id)})`);
  ok(X.NATIONS[0].id === 'ENG', 'and sorting leaves the saved order alone');
});

// 5. nations in a career
pending('5. nations in a career (PR #14\'s stages; main\'s call-up is natList)', () => {
  const cr = C.create({ pos:'B', num:4, club:X.CLUBS[0] }); C.set(cr);
  cr.stage = 3; cr.pro = 'BAT'; C.newSeason(cr);
  ok(cr.season.teams[0].name === 'Bath' && cr.season.teams.slice(1).every(t => X.ENGLAND.some(o => o.id === t.id)), 'Pro Club can be an English side, against its own list');
  const dub = { ...cr, pro:'DUB' };
  ok(C.teamFor(dub, 3).name === 'Dublin' && C.opponents(dub, 3).length === 5 && C.opponents(dub, 3).every(t => X.IRELAND.some(o => o.id === t.id)), 'or an Irish one, whose list of six is just enough');
  const finish = c => { c.results = c.fixtures.map(rd => rd.map(([h, a]) => ({ h, a, hs:20, as:0, ht:4, at:0 }))); c.round = 5; };
  finish(cr.season);
  C.renderEnd();
  const html = document.getElementById('ce-body').innerHTML, order = [...html.matchAll(/data-n="([A-Z]{3})"/g)].map(m => m[1]);
  ok(order.join() === R.nationsRanked().map(t => t.id).join() && order[0] === 'RSA', `the call-up list is every nation, strongest first (${order.length})`);
  ok(/data-n="RSA">[\s\S]*?class="ovr"[^>]*>96</.test(html) && /data-n="ROU">[\s\S]*?class="ovr"[^>]*>46</.test(html), 'each with its overall, so the pick is an informed one');
  C.advance('FIJ');
  const s = cr.season, opps = s.fixtures.map(rd => { const p = rd.find(x => x.includes(s.user)); return p[0] === s.user ? p[1] : p[0]; });
  ok(cr.stage === 4 && cr.country === 'FIJ' && s.teams[0].name === 'Fiji' && s.teams.slice(1).map(t => t.id).sort().join() === 'ARG,GEO,ITA,JPN,WAL', 'Fiji is a country you can play for, against the five nearest');
  ok(X.rateOf(s.teams[opps[4]]) === Math.max(...s.teams.slice(1).map(X.rateOf)) && s.teams[opps[4]].id === 'ARG', 'with the strongest last');
  const back = C.clean(JSON.parse(JSON.stringify(cr)));
  ok(back && back.country === 'FIJ' && back.season && back.season.teams[0].name === 'Fiji', 'cleanCareer keeps a nation outside the Six Nations');
  ok(C.clean(JSON.parse(JSON.stringify({ ...cr, country:'CDA' }))).country === 'CDA' && C.clean(JSON.parse(JSON.stringify({ ...cr, country:'XYZ' }))).country === 'ENG', 'Canada is CDA; an unknown country is put right');
  const six = { ...cr, country:'SCO' };
  ok(C.opponents(six, 4).map(t => t.id).join() === 'ENG,FRA,IRE,ITA,WAL', 'a Six Nations country stays the other five');
  C.set(null);
});

// 6. the ladder rises, stage by stage, and each pro list stands above the counties
pending('6. the career ladder (PR #14\'s stages, dropped for main\'s club seasons)', () => {
  const mean = l => l.reduce((a, t) => a + X.overallOf(t), 0)/l.length;
  const cr = C.create({ pos:'B', num:4, club:X.CLUBS[0] });
  const stage = s => X.CLUBS.map(t => C.teamFor({ ...cr, club:t }, s));
  const PRO = [X.FRANCE, X.AUSTRALIA, X.SOUTH_AFRICA, X.ENGLAND, X.IRELAND, X.WALES_SCOTLAND_ITALY, X.ENGLAND_TWO];
  const m = [mean(stage(0)), mean(stage(1)), mean(C.COUNTIES), mean(PRO.flat()), mean(X.NATIONS)];
  ok(m.every((v, i) => !i || v > m[i - 1]), `Minis, Juniors, County, Pro Club and International each average higher (${m.map(v => v.toFixed(1)).join(' ')})`);
  ok(PRO.every(p => mean(p) > m[2] && p.length >= 6), 'every pro list averages above the counties, and has at least six sides');
  ok(Math.max(...C.COUNTIES.map(X.overallOf)) < 72, 'and the best county is under the best of the pro lists');
  ok(C.STAGES.map(s => s.bar).join() === '64,70,77,85,', 'the bars are as they were');
  const lg = I.sides({ league:['Ash Vale', 'Birch Lane', 'Cedar Park', 'Damson Hill', 'Elm Bridge', 'Fir Tree'].map(name => ({ name })), teams:[] });
  ok(X.overallOf(lg[0]) === 58 && X.overallOf(lg[lg.length - 1]) === 43 && lg.every(t => X.overallOf(t) <= 58), `an imported league sits with the Local clubs, 43 to 58, under the pro lists (${lg.map(X.overallOf)})`);
});

// 7. ratings.json: checked strictly, then used for later picks only
{
  const base = () => JSON.parse(JSON.stringify({ date:'2026-11-14', men:R.BUNDLED.men, women:R.BUNDLED.women }));
  const NOW = Date.parse('2026-11-15T12:00:00Z');
  const good = R.clean(base(), NOW);
  ok(good && good.date === '2026-11-14' && good.men.RSA === 96, 'a good file passes');
  const bad = { 'null':null, 'a list':[], 'a string':'x', 'no date':(v => { delete v.date; return v; })(base()), 'a date with no day':{ ...base(), date:'2026-11' }, 'an impossible date':{ ...base(), date:'2026-02-31' }, 'a date far ahead':{ ...base(), date:'2027-01-01' }, 'older than the bundled table':{ ...base(), date:'2026-01-01' },
    'an unknown id':(v => { v.men.XXX = 60; return v; })(base()), 'a missing id':(v => { delete v.men.FIJ; return v; })(base()), 'a swap of a missing and an unknown id':(v => { delete v.men.FIJ; v.men.XXX = 70; return v; })(base()),
    'too high':(v => { v.men.RSA = 100; return v; })(base()), 'too low':(v => { v.men.ROU = 39; return v; })(base()), 'a fraction':(v => { v.men.RSA = 95.5; return v; })(base()), 'a number off the scale':(v => { v.men.RSA = 95; return v; })(base()), 'a string rating':(v => { v.men.RSA = '96'; return v; })(base()),
    'no men':(v => { delete v.men; return v; })(base()), 'no women':(v => { delete v.women; return v; })(base()), 'a women\'s list with an unknown id':(v => { v.women.ROU = 46; return v; })(base()), 'an inherited id':(v => { v.men = Object.create({ RSA:96 }); return v; })(base()) };
  for (const [name, v] of Object.entries(bad)) ok(R.clean(v, NOW) === null, `refused: ${name}`);
  const res = (body, o = {}) => ({ ok:true, status:200, json:async () => body, ...o });
  const asked = [];
  const stub = r => (u, o) => { asked.push([u, o]); return r(); };
  const moved = base(); moved.men.FIJ = 84; moved.men.RSA = 87;
  const fiji = () => X.overallOf(by('FIJ'));
  ok(await R.fetch(stub(() => { throw new Error('offline'); })) === false && R.waiting() === null, 'a network failure leaves the bundled table');
  ok(await R.fetch(stub(() => res(null, { ok:false, status:404 }))) === false, 'so does a missing file');
  ok(await R.fetch(stub(() => ({ ok:true, json:async () => { throw new Error('not JSON'); } }))) === false, 'and a file that is not JSON');
  ok(await R.fetch(stub(() => res({ ...moved, men:{ ...moved.men, XXX:60 } }))) === false && R.waiting() === null && R.now() === R.BUNDLED, 'and a file that fails its check');
  ok(asked.every(([u, o]) => u === 'ratings.json' && o.credentials === 'same-origin'), 'it only ever asks for its own relative ratings.json');
  pending('7. a fetched table rated into the nations (the teams builder wires ratingsSync into natList)', async () => {
  const savedChamp = (X.newChamp(by('FIJ'), R.nationsNearest(by('FIJ'))), JSON.stringify(X.champ()));
  const careerNow = C.create({ pos:'B', num:4, club:X.CLUBS[0] }); careerNow.stage = 4; careerNow.country = 'FIJ'; C.newSeason(careerNow); C.set(careerNow);
  const careerSaved = JSON.stringify(careerNow);
  const realNow = Date.now; Date.now = () => NOW;
  ok(await R.fetch(stub(() => res(moved))) === true && R.waiting() && fiji() === 70, 'a good file waits: nothing changes under a pick already made');
  Date.now = realNow;
  D.openTeams('champ');
  ok(fiji() === 84 && X.overallOf(by('RSA')) === 87 && !R.waiting() && R.now().date === '2026-11-14', 'the next pick uses it');
  ok(R.line() === 'Ratings from World Rankings and Recent Results · Updated 14 Nov 2026', `the line follows its date (${R.line()})`);
  ok(JSON.stringify(X.champ()) === savedChamp && JSON.stringify(C.get()) === careerSaved, 'a saved championship and career keep their teams');
  ok(by('FIJ').pace >= by('FIJ').power && X.rateOf(by('FIJ')) === 20 && X.overallOf(by('FAR')) === 58, 'the side keeps its character, and clubs are not touched');
  R.reset(); C.set(null); X.setChamp(null);
  ok(fiji() === 70 && R.line() === 'Ratings from World Rankings and Recent Results · Updated 7 Nov 2026', 'the bundled line reads 7 Nov 2026');
  });
  { const realNow = Date.now; Date.now = () => NOW; const was = X.overallOf(by('FIJ'));
    ok(await R.fetch(stub(() => res(moved))) === true && R.waiting() && R.sync() === true && !R.waiting() && R.now().date === '2026-11-14' && X.overallOf(by('FIJ')) === was, 'a good file is held and taken at the next pick, and main\'s nations are left as they are');
    ok(R.line() === 'Ratings from World Rankings and Recent Results · Updated 14 Nov 2026', `the line follows its date (${R.line()})`);
    Date.now = realNow; R.reset(); ok(R.line() === 'Ratings from World Rankings and Recent Results · Updated 7 Nov 2026', 'the bundled line reads 7 Nov 2026'); }
}

// 8. who asks for it. Node has no location, so the harness never fetches; these give it one for a moment.
{
  ok(bootFetches === 0 && R.boot() === false && bootFetches === 0, 'the test harness never fetched ratings.json');
  const set = (p, on) => { globalThis.location = { protocol:p }; Object.defineProperty(globalThis.navigator, 'onLine', { value:on, configurable:true }); };
  const calls = []; globalThis.fetch = (...a) => { calls.push(a); return Promise.reject(new Error('stub')); };
  set('https:', false); ok(R.boot() === false && !calls.length, 'offline with no service worker: no request, there is nothing to answer it');
  Object.defineProperty(globalThis.navigator, 'serviceWorker', { value:{ controller:null }, configurable:true });
  ok(R.boot() === false && !calls.length, 'nor with a worker that does not control this page');
  Object.defineProperty(globalThis.navigator, 'serviceWorker', { value:{ controller:{} }, configurable:true });
  ok(R.boot() === true && calls.length === 1 && calls[0][0] === 'ratings.json', 'offline with a controlling worker: it asks, so the last good copy is used and a device does not drop back to the bundled table');
  delete globalThis.navigator.serviceWorker; calls.length = 0;
  set('file:', true); ok(R.boot() === false && !calls.length, 'from a file: no request');
  set('capacitor:', true); ok(R.boot() === false && !calls.length, "in the app's own scheme: no request");
  set('https:', true); ok(R.boot() === true && calls.length === 1 && calls[0][0] === 'ratings.json', 'online on the web: one request, for the file beside the page');
  await new Promise(r => setTimeout(r, 0));
  delete globalThis.location; delete globalThis.navigator.onLine; globalThis.fetch = realFetch;
  const bundle = read('../game.js') + read('../sw.js') + read('../index.html');
  ok(!/pulselive|world\.?rugby/i.test(bundle), "nothing a player's device loads names the feed or World Rugby");
  ok(/ratings\.json/.test(read('../sw.js')), 'the service worker knows the file');
}

// 9. seeded play does not depend on ratings.json: the same seed plays the same match with a file waiting
{
  const play = () => { reseed(77); T.newMatch(by('FIJ'), by('JPN'), { halfLen:30, diff:1, headless:true, humans:[true, false], duels:'off' }); let n = 0; while (!T.M.over && n < 100000) { bot(0); T.update(T.STEP); n++; } return JSON.stringify([T.M.score, T.M.tries, n]); };
  const before = play();
  const moved = JSON.parse(JSON.stringify({ date:R.BUNDLED.date, men:{ ...R.BUNDLED.men, FIJ:84 }, women:R.BUNDLED.women }));
  await R.fetch(async () => ({ ok:true, json:async () => moved }));
  ok(play() === before, 'a file that has arrived and not been used changes nothing');
  R.reset();
  ok(play() === before, 'and the table is back as it was');
}

// 10. the developer's script: rate2.py's formula, ported
{
  const rankings = { entries:[['1', 'AAA', 'Aland', 80, 1], ['2', 'BBB', 'Bland', 70, 2], ['3', 'CAN', 'Canada', 60, 3]].map(([id, abbreviation, name, pts, pos]) => ({ team:{ id, abbreviation, name }, pts, pos })) };
  const match = (matchId, day, a, b, sa, sb, venue, status = 'C') => ({ matchId, status, time:{ millis:day, label:`2026-01-${String(day).padStart(2, '0')}` }, teams:[{ id:a, name:a === '1' ? 'Aland' : a === '2' ? 'Bland' : 'Canada' }, { id:b, name:b === '1' ? 'Aland' : b === '2' ? 'Bland' : 'Canada' }], scores:[sa, sb], venue });
  const r = U.rateSport(rankings, [match('m1', 1, '1', '2', 20, 10, null), match('m1', 1, '1', '2', 20, 10, null), match('m2', 2, '2', '1', 30, 0, { country:'Bland' }), match('m3', 3, '1', '2', 9, 9, null, 'U'), match('m4', 4, '1', '9', 9, 9, null)], ['AAA', 'CDA']);
  const expect1 = 1/(1 + 10**((70 - 80)/10)), expect2 = 1/(1 + 10**((80 - 73)/10));
  const form = Math.max(-3, ((1 - expect1) + (0 - (1 - expect2)))/2*10);
  ok(Math.abs(r.AAA.last[0].exp - expect1) < 1e-9 && Math.abs(r.AAA.last[1].exp - (1 - expect2)) < 1e-9 && Math.abs(r.AAA.form - form) < 0.006, `form: a null venue is neutral, a home side gets 3, repeats, unfinished games and unknown sides are left out (${r.AAA.form} v ${form.toFixed(2)})`);
  ok(r.AAA.last.length === 2 && r.CDA && r.CDA.pts === 60 && r.CDA.last.length === 0 && r.CDA.form === 0, 'Canada is CAN in the feed and CDA in the game; no results is no form');
  const many = Array.from({ length:14 }, (_, i) => match('w' + i, i + 1, '3', '1', 50, 0, null));
  ok(U.rateSport(rankings, many, ['CDA']).CDA.form === 3 && U.rateSport(rankings, many, ['CDA']).CDA.last.length === 10, 'form is the last ten results, held to 3 either way');
  // the scores behind the table, from the run that made it: each gives the table's overall
  const scores = { RSA:92.98, NZL:92.84, IRE:88.59, FRA:88.48, SCO:85.27, ENG:85.17, AUS:84.9, ARG:81.45, ITA:77.09, WAL:77.01, FIJ:76.93, JPN:75.85, GEO:73.5, POR:71, USA:68.41, ESP:66.99, CHI:66.62, TGA:65.77, URU:65.57, SAM:64, CDA:62.52, ROU:61.29 };
  const w = Object.entries(scores).filter(([id, s]) => U.overallOf(U.sumOfScore(s)) !== R.BUNDLED.men[id]).map(([id]) => id);
  ok(!w.length && U.sumOfScore(0) === 5 && U.sumOfScore(200) === 25, `the score scale gives the bundled table (${w.join() || 'all 22'})`);
  ok(JSON.stringify(U.bundledTable()) === JSON.stringify(R.BUNDLED), 'the script reads the game\'s own table');
  const men = Object.fromEntries(Object.entries(R.BUNDLED.men).map(([id, ov]) => [id, { overall:ov, sum:R.sumOfOverall(ov), pts:80, form:0, pos:1, last:[{ date:'2026-11-07', opp:'X', f:1, a:0 }] }]));
  const women = Object.fromEntries(Object.entries(R.BUNDLED.women).map(([id, ov]) => [id, { overall:ov, sum:R.sumOfOverall(ov), pts:80, form:0, pos:1, last:[] }]));
  const wantM = Object.keys(men), wantW = Object.keys(women), check = (next, prev) => U.checkRatings(next, prev, wantM, wantW, '2026-11-08');
  const clone = v => JSON.parse(JSON.stringify(v));
  const good = { date:'2026-11-07', detail:{ men, women } };
  ok(!check(good, R.BUNDLED).problems.length, 'a run that matches passes');
  const few = clone(good); delete few.detail.men.ROU;
  ok(/too few men's nations: ROU/.test(check(few, R.BUNDLED).problems.join()), 'too few nations is refused');
  const range = clone(good); range.detail.women.ENG.overall = 120;
  ok(/out of range/.test(check(range, R.BUNDLED).problems.join()), 'an overall out of range is refused');
  const jump = clone(good); jump.detail.men.ITA = { ...jump.detail.men.ITA, overall:87, sum:21, pts:90 };
  ok(/UNEXPLAINED men ITA moved 6 steps/.test(check(jump, R.BUNDLED).problems.join()), 'a nation moving more than 2 steps with nothing to explain it is refused');
  const two = clone(good); two.detail.men.ITA = { ...two.detail.men.ITA, overall:75, sum:17 };
  ok(!check(two, R.BUNDLED).problems.length, 'two steps is allowed');
  const file = U.buildFile(jump.detail.men, jump.detail.women, '2026-11-07');
  ok(file.men.ITA === 87 && file.workings.men.ITA.pts === 90 && !('last' in file.workings.men.ITA), 'the file holds the ratings and the workings the next run reads');
  const prev = U.buildFile(men, women, '2026-11-06'); prev.workings.men.ITA = { pts:76.3, form:0.79, pos:11 };
  const big = clone(good); big.detail.men.ITA = { ...big.detail.men.ITA, overall:81, sum:19, pts:81, form:2.5 };
  const seen = check(big, prev);
  ok(!seen.problems.length && /EXPLAINED men ITA moved 4 steps, 70 to 81: points 76.3 to 81, form 0.79 to 2.5, played since 2026-11-06: X 1-0/.test(seen.notes.join()), `a big move its points and a result explain is written, and printed (${seen.notes.join()})`);
  big.detail.men.ITA.last = [];
  ok(/UNEXPLAINED/.test(check(big, prev).problems.join()), 'with no match since, it is refused');
  ok(/older than/.test(check({ ...good, date:'2026-11-01' }, R.BUNDLED).problems.join()) && /bad date/.test(check({ ...good, date:'2026-12-01' }, R.BUNDLED).problems.join()), 'a date older than the last update, or in the future, is refused');
  // the points themselves: a feed can't vouch for its own numbers
  const played = [{ date:'2026-11-08', opp:'FRA', f:20, a:10 }];
  const feed = (pts, sum, overall, last = played) => { const v = clone(good); v.date = '2026-11-08'; v.detail.men.ENG = { ...v.detail.men.ENG, pts, sum, overall, form:0, last }; return v; };
  const was = U.buildFile(men, women, '2026-11-07'); was.workings.men.ENG = { pts:85.68, form:-0.5, pos:6 };
  ok(/points 100000 are out of range/.test(check(feed(100000, 25, 99), was).problems.join()), 'absurdly high points are refused, even with a match played to explain them');
  ok(/points -500 are out of range/.test(check(feed(-500, 5, 40), was).problems.join()), 'as are negative ones');
  ok(/points NaN are out of range/.test(check(feed(NaN, 5, 40), was).problems.join()), 'and points that are no number');
  ok(/points 85.68 to 100 is more than 1 matches can move them/.test(check(feed(100, 25, 99), was).problems.join()), 'a move in range that one match could not make is refused');
  ok(/more than no matches can move them/.test(check(feed(95, 20, 84, []), was).problems.join()), 'and so is one with no match played, though the rating is unchanged');
  ok(!check(feed(90.5, 20, 84), was).problems.length, 'one match can move points by what one match can');
  ok(!check(feed(95.5, 20, 84, [...played, { date:'2026-11-08', opp:'WAL', f:30, a:3 }]), was).problems.length, 'two matches, twice that');
  // what the run compares against
  const every = (mn, wm) => [mn, wm].map(t => Object.fromEntries(Object.keys(t).map(id => [id, 70])));
  const [fullM, fullW] = every(R.BUNDLED.men, R.BUNDLED.women);
  const whole = JSON.stringify({ date:'2026-11-07', men:fullM, women:fullW });
  ok(U.previousFile(whole, R.BUNDLED, wantM, wantW).men.ENG === 70, 'a whole last file is what the next run compares against');
  for (const [name, text] of Object.entries({ 'no file':'', 'not JSON':'{oops', 'an empty object':'{}', 'empty tables':'{"date":"2026-11-07","men":{},"women":{}}', 'a list':'[]', 'null':'null', 'no date':JSON.stringify({ men:fullM, women:fullW }), 'a nation short':JSON.stringify({ date:'2026-11-07', men:{ ...fullM, ENG:undefined }, women:fullW }), 'a rating off the scale':JSON.stringify({ date:'2026-11-07', men:{ ...fullM, ENG:1000 }, women:fullW }) }))
    ok(U.previousFile(text, R.BUNDLED, wantM, wantW) === R.BUNDLED, `${name}: the run compares against the bundled table`);
  const flood = clone(good); for (const sport of ['men', 'women']) for (const r of Object.values(flood.detail[sport])) Object.assign(r, { pts:100, sum:25, overall:99 });
  ok(check(flood, U.previousFile('{}', R.BUNDLED, wantM, wantW)).problems.length > 20, 'so one truncated commit can not switch off the move check for the next run');
  ok(/nothing to compare it with/.test(check(flood, {}).problems.join()), 'and a run given nothing to compare with refuses');
  const src = read('./ratings/update.mjs');
  ok(!/@[a-z]/i.test(src.replace(/@\w+\.\w+\(/g, '')) && /USER_AGENT = 'ratings-update\/1\.0'/.test(src) && /pageSize=100/.test(src), 'a generic User-Agent, no email, pages of 100');
  if (fs.existsSync(new URL('../ratings.json', import.meta.url))) {
    const onDisk = JSON.parse(read('../ratings.json'));
    ok(R.clean(onDisk) !== null, `the ratings.json in this tree passes the game's own check (${onDisk.date})`);
  }
  const yml = fs.readFileSync(new URL('../../.github/workflows/tryline-ratings.yml', import.meta.url), 'utf8');
  ok(/workflow_dispatch/.test(yml) && !/^\s*schedule\s*:/m.test(yml) && !/cron/.test(yml.replace(/^#.*$/gm, '')), 'the workflow runs by hand only: no schedule');
  ok(/ratings\.json/.test(read('../PRIVACY.md')) && /unofficial/i.test(read('../README.md')) && /no permission/i.test(read('../README.md')), 'the privacy note names the file; the README says the feed is unofficial and no permission has been seen');
}

// Stars on screen: the drawing, and every screen where a side is picked or listed. Layout and legibility at phone size are in tools/browser.mjs.
{
  const Y = T.yourTeam, S = D.settings(), $ = id => document.getElementById(id);
  const label = t => 'aria-label="' + R.starsWords(R.starsOf(t)) + '"';
  const labels = html => [...html.matchAll(/role="img" aria-label="([^"]+)"/g)].map(m => m[1]);
  const words = list => list.map(t => R.starsWords(R.starsOf(t))).join();
  // the drawing: five dim stars, and over them the lit ones, a half star being the left half of its own star
  for (let n = 1; n <= 5; n += 0.5) {
    const h = R.starsHtml(n), off = h.match(/class="off" d="([^"]*)"/)[1], on = h.match(/class="on" d="([^"]*)"/)[1], shapes = on.split('M').slice(1), whole = Math.floor(n);
    const xs = s => s.replace(/Z$/, '').split('L').map(p => +p.split(' ')[0]);
    ok(off.split('M').length - 1 === 5 && shapes.length === Math.ceil(n), n + ' stars: five dim, ' + Math.ceil(n) + ' lit');
    ok(shapes.slice(0, whole).every(s => s.split('L').length === 10) && (n === whole || shapes[whole].split('L').length === 6), n + ': whole stars have ten points, a half six');
    if (n !== whole) ok(Math.max(...xs(shapes[whole])) === 10 + 20*whole && Math.min(...xs(shapes[whole])) < 10 + 20*whole - 9, n + ': the half star is lit exactly to its middle, from its left tip');
    ok(h.includes('role="img"') && h.includes('aria-label="' + R.starsWords(n) + '"') && !h.includes('aria-hidden'), n + ': the picture says its stars in words');
    ok(R.starsHtml(n, true).includes('aria-hidden="true"') && !R.starsHtml(n, true).includes('aria-label'), n + ': or stays quiet where the words are beside it');
  }
  const css = read('../styles.css'), minStar = Math.min(...[...css.matchAll(/--star:(\d+)px/g)].map(m => +m[1]));
  ok(minStar >= 12, 'no star is drawn under 12px (' + minStar + ')');
  // a made team's level, and Import Club's: the levels came in whole
  Y.openBuilder(null);
  ok(labels($('bd-level-grid').innerHTML).join() === R.TEAM_LEVELS.map(l => R.starsWords(l.stars)).join(), 'the builder\'s level choice draws each level\'s stars');
  T.stamina.builderLevel('r1');
  ok($('bd-level-stars').innerHTML.includes('aria-hidden') && $('bd-level-name').textContent === 'Regional 1 · 3.5 Stars', 'a chosen level has its stars beside its words');   // re-pinned at the real order: Regional 1 is Farnham's 61, 3.5 stars (was 58, 3)
  { const made = X.custom(), n = made.length; D.openTeams('quick'); Y.openBuilder(null); T.stamina.builderLevel('top'); $('bd-name').value = 'Cubs'; $('bd-save').click();
    const cubs = made[made.length - 1];
    ok(made.length === n + 1 && cubs.name === 'Cubs' && cubs.level === 'top' && X.overallOf(cubs) === 72 && R.starsOf(cubs) === 4, `Top Flight and Save Team, with no + pressed, is a 72 and 4 stars (${X.overallOf(cubs)})`);
    made.length = n; }
  D.openTeams('champ'); I.open();
  { const u = I.state(); u.step = 'preview'; u.data = { club:{ name:'Bracknell RFC', kit:'#399913', trim:'#e4c200' }, league:[], teams:[] }; u.draft = { kit:'#399913', trim:'#e4c200', hoops:false }; u.level = 'r2'; I.render();
    ok($('im-lv-name').textContent === 'Regional 2 · 3 Stars' && $('im-lv-stars').innerHTML === R.starsHtml(3, true), 'Import Club draws the level\'s stars beside its words'); }   // re-pinned at the real order: Regional 2 is 55, 3 stars (was 52, 2.5)
  $('m-import').hidden = true;
  pending('stars on PR #14\'s screens: its Your Team panel, fixtures and tables (main\'s screens: tools/browser.mjs, tools/teams.mjs 12, tools/home.mjs 6b)', async () => {
  // team cards: every tab, men's and women's, a card's stars beside its overall, one for each team
  const cardsOk = g => { let bad = []; for (const pool of Y.POOL_TABS.slice(0, 9)) { S.pool = pool; S.womens = g; D.renderTeams(); const list = Y.teamList(), html = $('t-grid').innerHTML, parts = html.split('<button class="team').slice(1);
    list.forEach((t, i) => { if (!parts[i].includes('>' + t.name.replace(/&/g, '&amp;') + '</span>') || !parts[i].includes(label(t)) || !parts[i].includes('<span class="ovr" aria-label="Overall ' + X.overallOf(t) + '">')) bad.push(t.id); }); if (labels(html).length !== list.length) bad.push('count on ' + pool); } return bad; };
  D.openTeams('champ');
  { const bad = cardsOk(0); ok(!bad.length, 'every card on every men\'s tab has its stars and its overall (' + bad + ')'); }
  { const bad = cardsOk(1); ok(!bad.length, 'and on every women\'s tab (' + bad + ')'); }
  S.womens = 0;
  S.pool = Y.POOL_TABS[0]; D.renderTeams();
  ok(labels($('t-grid').innerHTML)[0] === '5 Stars' && $('t-grid').innerHTML.includes('class="tid"'), 'South Africa, first, is five stars');
  // Create Team and Import Club sit on the same screen with no stars of their own
  ok(!$('t-grid').innerHTML.split('t-create')[1].includes('tstars'), 'nor do the Create Team and Import Club cards have any');
  // the Your Team panel: a side's own rating on each side, none for a side that does not exist
  const panel = (id, g) => { S.myTeam = id; S.womens = g; X.renderHome(); return labels($('yt-stars').innerHTML).join(); };
  ok(panel('BOR', 0) === '5 Stars' && panel('NTH', 0) === '4.5 Stars' && panel('GDN', 0) === '1 Star', 'the Your Team panel shows your side\'s stars');
  const wEng = T.sidesOf.sideVersion(by('ENG'), 1), wGeo = T.sidesOf.sideVersion(by('GEO'), 1);
  ok(panel('ENG', 1) === R.starsWords(R.starsOf(wEng)) && R.starsOf(wEng) !== R.starsOf(by('ENG')), 'on Women\'s it is the women\'s rating (' + panel('ENG', 1) + ')');
  ok(wGeo === null && panel('GEO', 1) === '' && $('yt-stars').innerHTML === '', 'and a nation with no women\'s side shows none');
  S.womens = 0; S.myTeam = 'FAR';
  // the picked-team bar, in Quick Match and for Player 1
  D.openTeams('quick');
  ok(!$('t-yours').hidden && labels($('t-mine').innerHTML).join() === R.starsWords(R.starsOf(by('FAR'))), 'the picked-team bar shows the picked side\'s stars');
  // a team you made: the level list, then the points so far
  Y.openBuilder(null);
  ok(labels($('bd-level-grid').innerHTML).join() === R.TEAM_LEVELS.map(l => R.starsWords(l.stars)).join(), 'the builder\'s level choice draws each level\'s stars');
  ok(!$('bd-jersey').innerHTML.includes('tstars'), 'before a level is chosen the shirt has no stars');
  T.stamina.builderLevel('r1');
  ok($('bd-level-stars').innerHTML.includes('aria-hidden') && $('bd-level-name').textContent === 'Regional 1 · 3 Stars', 'a chosen level has its stars beside its words');
  ok(labels($('bd-jersey').innerHTML).join() === '3 Stars', 'and the shirt says the same: the level sets the ability, with nothing more to spend');
  Object.assign(T.stamina.draft(), { pace:2, power:1, handling:1, kicking:1, stamina:1 }); T.stamina.renderBuilder();
  ok(labels($('bd-jersey').innerHTML).join() === R.starsWords(R.starsOf(T.stamina.draft())) && R.starsOf(T.stamina.draft()) < 3 && /^Spend 5 more points to reach 3 Stars\.$/.test($('bd-level-note').textContent), `points taken off bring the shirt down, and the line says how to get them back (${$('bd-level-note').textContent})`);
  Object.assign(T.stamina.draft(), { pace:3, power:3, handling:3, kicking:1, stamina:1 }); T.stamina.renderBuilder();
  ok(labels($('bd-jersey').innerHTML).join() === R.starsWords(R.starsOf(T.stamina.draft())) && R.starsOf(T.stamina.draft()) === 3, 'and all spent, its level\'s stars');
  // what a child gets who picks four stars and saves: the owner's level sets the ability
  { const made = X.custom(), n = made.length; D.openTeams('quick'); Y.openBuilder(null); T.stamina.builderLevel('top'); $('bd-name').value = 'Cubs'; $('bd-save').click();
    const cubs = made[made.length - 1];
    ok(made.length === n + 1 && cubs.name === 'Cubs' && cubs.level === 'top' && X.overallOf(cubs) === 72 && R.starsOf(cubs) === 4, `Top Flight and Save Team, with no + pressed, is a 72 and 4 stars (${X.overallOf(cubs)}, ${R.starsOf(cubs)})`);
    made.length = n; }
  // Import Club's level
  D.openTeams('champ'); I.open();
  { const u = I.state(); u.step = 'preview'; u.data = { club:{ name:'Bracknell RFC', kit:'#399913', trim:'#e4c200' }, league:[], teams:[] }; u.draft = { kit:'#399913', trim:'#e4c200', hoops:false }; u.level = 'r2'; I.render();
    ok($('im-lv-name').textContent === 'Regional 2 · 3 Stars' && $('im-lv-stars').innerHTML === R.starsHtml(3, true), 'Import Club draws the level\'s stars beside its words'); }   // re-pinned at the real order: Regional 2 is 55, 3 stars (was 52, 2.5)
  $('m-import').hidden = true;
  const made = X.cleanTeam({ name:'Kestrels', id:'KES', kit:'#2050b0', trim:'#f2efe6', level:'r1', ...R.abilitiesFor({}, 11), key:'mystar' }, 0);
  ok(R.teamStars(made).includes('3 Stars'), 'a made team spent in full wears its level\'s stars');
  // the championship: fixture and table
  const clubs = ['HAR', 'FAR', 'WIM', 'IRO', 'GUI'].map(by);
  X.newChamp(by('GDN'), clubs); X.renderHub();
  { const c = X.champ(), rows = $('hub-table').innerHTML, pair = c.fixtures[0].find(p => p.includes(c.user));
    ok(labels(rows).sort().join() === c.teams.map(t => R.starsWords(R.starsOf(t))).sort().join(), 'the championship table has every side\'s stars');
    ok(labels($('hub-next').innerHTML).join() === words(pair.map(i => c.teams[i])), 'and so does the next fixture, in its order'); }
  X.setChamp(null);
  // the career: the club list, the fixture, the table, the next stage and the call-up
  C.end(); C.newOpen();
  ok(labels($('cn-clubs').innerHTML).join() === words(Y.careerClubs()), 'the career club list has every club\'s stars');
  C.start({ name:'Sam', pos:'B', num:10, club:by('FAR'), look:Y.careerDraft().look }); C.open();
  { const cr = C.get(), c = cr.season, pair = c.fixtures[0].find(p => p.includes(c.user));
    ok(labels($('cr-next').innerHTML).join() === words(pair.map(i => c.teams[i])), 'a career fixture has both sides\' stars');
    C.renderTable();
    ok(labels($('cl-table').innerHTML).sort().join() === c.teams.map(t => R.starsWords(R.starsOf(t))).sort().join(), 'and the career table all six');
    const done = () => { const s = cr.season; s.results = s.fixtures.map(rd => rd.map(([h, a]) => ({ h, a, hs:h === s.user ? 30 : 10, as:a === s.user ? 30 : 12, ht:4, at:1 }))); s.round = 5; };
    done(); C.open();
    ok(labels($('ce-body').innerHTML).join() === R.starsWords(R.starsOf(C.teamFor(cr, 1))), 'the next stage\'s side, at the season\'s end');
    cr.stage = 3; C.newSeason(cr); done(); C.open();
    { const n = D.settings() && T.ratings.nationsRanked(0); ok(labels($('ce-body').innerHTML).join() === words(n) && ($('ce-body').innerHTML.match(/class="ovr"/g) || []).length === n.length, 'and the call-up list has every nation\'s stars and overall'); }
  }
  C.end();
  });
}

console.log(`Ratings: ${passed} passed, ${failed} failed` + (PENDING.length ? ` · ${PENDING.length} pending for the builders: ${PENDING.join('; ')}` : ''));
process.exitCode = failed ? 1 : 0;
