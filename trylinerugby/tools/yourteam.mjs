// Your Team on the home screen and the new lists on the team screen: the tabs, what a save's pool means, the panel, the picker,
// and the key that survives a deleted team. Exits 1 on any failure.
// node tools/yourteam.mjs
process.env.SEED ??= '37';
const { T } = await import('./harness.mjs');
const { readGameSource } = await import('./source.mjs');
const Y = T.yourTeam, X = T.teams, C = T.career, D = T.debug, I = T.importer, $ = id => document.getElementById(id);
let passed = 0, failed = 0;
/* The merge (README, Integration with PR #14): main's home, My Team and team screen won, and PR #14's Your Team panel, its tabs and Men's |
   Women's wait for the builders, so every section here is recorded, not run, and named in the last line. A builder that brings one in takes
   its pending() off and points it at main's screens. */
const PENDING = [];
const pending = (what, fn) => { PENDING.push(what); };
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const memory = {};
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; } };
const saved = () => JSON.parse(memory['tryline.v1']);
const s = D.settings();
const by = id => X.ALL_TEAMS.find(t => t.id === id);
const src = readGameSource(), body = src.slice(src.indexOf('<body>'), src.indexOf('<script>'));

// 1. the tabs and what they show
pending('1. the tabs (main\'s International | National | Local wins; the teams builder adds England 2 and Counties there)', async () => {
  const row = body.match(/<div class="seg pool" data-key="pool">(.*?)<\/div>/)[1];
  const labels = [...row.matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map(m => m[1]);
  ok(labels.join() === 'International,Local,Counties,England,England 2,Ireland,Wales Scotland Italy,France,Australia,South Africa,My League', `the tabs read in the owner's order (${labels})`);
  const lists = [X.NATIONS, X.CLUBS, X.COUNTIES, X.ENGLAND, X.ENGLAND_TWO, X.IRELAND, X.WALES_SCOTLAND_ITALY, X.FRANCE, X.AUSTRALIA, X.SOUTH_AFRICA];
  ok(Y.POOL_TABS.length === labels.length && lists.every((l, i) => X.POOLS[Y.POOL_TABS[i]] === l) && Y.POOL_TABS[10] === Y.IMPORT_POOL, 'each tab is its list, whatever its place in POOLS');
  ok(Y.IMPORT_POOL === X.POOLS.length && I.POOL === Y.IMPORT_POOL, 'My League stays one past the lists');
  ok(Y.poolTeams(0).length === 22 && Y.poolTeams(0)[0].id === 'RSA' && Y.poolTeams(5) === X.ENGLAND, 'International is every nation');
  ok(/\.head > \.pool\{[^}]*overflow-x:auto/.test(src), 'the tabs scroll sideways when they do not fit');
  D.openTeams('champ'); s.pool = 0; D.renderTeams();
  const grid = $('t-grid').innerHTML;
  ok(grid.indexOf('>South Africa<') < grid.indexOf('>New Zealand<') && grid.indexOf('>New Zealand<') < grid.indexOf('>France<') && grid.includes('>Romania<'), 'the International tab lists them strongest first');
  ok(!$('t-ratings').hidden && $('t-ratings').textContent === 'Ratings from World Rankings and Recent Results · Updated 7 Nov 2026', `one line under the tabs (${$('t-ratings').textContent})`);
  // every club tab says where its numbers come from, and reads strongest first
  for (const p of [1, 2, 5, 6, 7, 8]) { s.pool = p; D.renderTeams(); ok(!$('t-ratings').hidden && $('t-ratings').textContent === "Ratings from Last Season's Table, Scored and Conceded", `the source line on tab ${p} (${$('t-ratings').textContent})`); }
  ok(Y.tabRatingsLine(Y.IMPORT_POOL) === '' && Y.tabRatingsLine(1, 1) === "Club Ratings Use the Men's Results for Now", "My League has no line, and a women's club tab says its numbers are the men's");
  ok(Y.tabTeams(1).map(t => t.id).join() === 'HAR,FAR,WIM,IRO,GUI,WEY,COB,ORU,HAS,ALD,KIN,GDN', `Local, strongest first, Twickenham then Farnham, level sides in list order (${Y.tabTeams(1).map(t => t.id)})`);
  ok(Y.tabTeams(5).map(t => t.id).join() === X.ENGLAND.map(t => t.id).join(), 'England stays in table order, which is also strongest first');
  ok(Y.tabTeams(2).every((t, i, l) => !i || X.rateOf(l[i - 1]) >= X.rateOf(t)) && Y.tabTeams(1) !== X.CLUBS && X.CLUBS[1].id === 'HAS', 'France too, and the lists themselves stay in saved order');
  s.pool = 5; D.renderTeams();
  ok($('t-grid').innerHTML.includes('1st · 693 Scored · 536 Conceded') && $('t-grid').innerHTML.includes('10th · 325 Scored · 860 Conceded'), 'every club card shows its place and points, so clubs can be compared');
  s.pool = 3; D.renderTeams();
  ok(($('t-grid').innerHTML.match(/class="tline"/g) || []).length === 4 && !/undefined/.test($('t-grid').innerHTML), 'Melbourne and Adelaide have no line, and no invented one');
  s.pool = 0; D.renderTeams();
  ok(!$('t-grid').innerHTML.includes('class="tline"'), 'nor do nations');
  s.pool = 5; s.womens = 1; D.renderTeams();
  ok(!$('t-grid').innerHTML.includes('class="tline"'), "nor a women's club: those figures are the men's");
  s.womens = 0;
  s.pool = 5; D.renderTeams();
  ok($('t-grid').innerHTML.includes('>Northampton<') && $('t-grid').innerHTML.includes('>Twickenham<') && !$('t-grid').innerHTML.includes('Harlequins'), 'England on its tab');
  s.pool = 6; D.renderTeams();
  ok($('t-grid').innerHTML.includes('>Dublin<') && $('t-grid').innerHTML.includes('>Ballymena<'), 'and Ireland on its');
  const fixed = body.replace(/<script[\s\S]*$/, '');
  ok(!/World Rugby/i.test(fixed), 'no World Rugby name on the page');
});

// 2. what a save's pool means
pending('2. a save\'s pool number (main keeps list keys, poolKey)', async () => {
  const league = { teams:[{ id:'QAZ', name:'Ash Vale', kit:'#1b2747', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:3 }] };
  X.restore({ settings:{ pool:5 }, importLeague:league });
  ok(s.pool === Y.IMPORT_POOL && s.pool !== 5, `a save from before England and Ireland holding pool 5 still means My League (${s.pool})`);
  X.restore({ settings:{ pool:5 }, importLeague:null });
  ok(s.pool === 0, 'with no league saved it falls back');
  X.restore({ settings:{ pool:6 } });
  ok(s.pool === 0, 'an old save never held 6');
  for (const n of [0, 1, 2, 3, 4]) { X.restore({ settings:{ pool:n } }); ok(s.pool === n, `an old save's pool ${n} keeps its list`); }
  for (const v of [2, 3]) {
    X.restore({ settings:{ pool:5, poolV:v } }); ok(s.pool === 5, `a poolV ${v} save holding 5 is England`);
    X.restore({ settings:{ pool:6, poolV:v } }); ok(s.pool === 6, 'and 6 is Ireland');
    X.restore({ settings:{ pool:-1, poolV:v } }); ok(s.pool === 0, 'as a negative falls back');
  }
  // poolV 2 was the numbering with seven lists, where 7 was My League: a saved My League must not open Wales, Scotland and Italy
  X.restore({ settings:{ pool:7, poolV:2 }, importLeague:league }); ok(s.pool === Y.IMPORT_POOL && Y.IMPORT_POOL === 10, `a poolV 2 save holding 7 is still My League (${s.pool})`);
  X.restore({ settings:{ pool:7, poolV:2 }, importLeague:null }); ok(s.pool === 0, 'with no league saved it falls back');
  X.restore({ settings:{ pool:8, poolV:2 } }); ok(s.pool === 0, 'a poolV 2 save never held 8');
  X.restore({ settings:{ pool:9, poolV:2 } }); ok(s.pool === 0, 'nor 9');
  X.restore({ settings:{ pool:7, poolV:3 } }); ok(s.pool === 7, 'a poolV 3 save holding 7 is Wales, Scotland and Italy');
  X.restore({ settings:{ pool:8, poolV:3 } }); ok(s.pool === 8, 'and 8 is England 2');
  X.restore({ settings:{ pool:9, poolV:3 } }); ok(s.pool === 9, 'and 9 is Counties');
  X.restore({ settings:{ pool:Y.IMPORT_POOL, poolV:3 }, importLeague:league }); ok(s.pool === Y.IMPORT_POOL, 'and one past them is My League');
  X.restore({ settings:{ pool:Y.IMPORT_POOL + 1, poolV:3 } }); ok(s.pool === 0, 'past that it falls back');
  // an old saved league side whose code a new list has taken: it gets a new code, and if it was Your Team, Your Team follows it
  { const was = s.myTeam, side = { key:'lg-EAL', id:'EAL', name:'Ealing Town', kit:'#1b2747', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:3, stamina:3 };
    X.restore({ settings:{ pool:7, poolV:2, myTeam:'lg-EAL' }, importLeague:{ teams:[side] } });
    const got = I.league().teams[0];
    ok(s.pool === Y.IMPORT_POOL && got.id !== 'EAL' && got.key === 'lg-' + got.id && s.myTeam === got.key && Y.of() === got, `a league side coded EAL is recoded (${got.id}) and is still Your Team`);
    // two sides recoded in a row: Bedford takes the code Bedford Athletic had, and Your Team stays with the side it was
    const bed = key => ({ settings:{ pool:7, poolV:2, myTeam:key }, importLeague:{ teams:[{ ...side, key:'lg-BED', id:'BED', name:'Bedford' }, { ...side, key:'lg-BEF', id:'BEF', name:'Bedford Athletic' }, { ...side, key:'lg-XAN', id:'XAN', name:'Xanadu' }] } });
    for (const [key, name] of [['lg-BED', 'Bedford'], ['lg-BEF', 'Bedford Athletic'], ['lg-XAN', 'Xanadu']]) { X.restore(bed(key)); ok(Y.of().name === name, `Your Team as ${key} is still ${name} after the recoding (${Y.of().name}, ${s.myTeam})`); }
    s.myTeam = was; X.restore({ importLeague:null }); }
  X.restore({ settings:{ pool:'5' } }); ok(s.pool === 0, 'and a string');
  s.pool = 5; X.save();
  ok(saved().settings.poolV === 3 && saved().settings.pool === 5, 'a save says which numbering it uses');
  X.load();
  ok(s.pool === 5, 'and reads back as England');
  I.setLeague(null); s.pool = 1;
  D.settings().pool = 1; X.save();
});

// 3. the two lines under the logo, and the panel
pending('3. the Your Team panel (the My Team builder: its stars and last-season record into main\'s My Team)', async () => {
  const c = C.create({ pos:'B', num:4, club:X.CLUBS[3] }); C.set(c);
  X.renderHome();
  ok($('home-club').textContent !== 'Play as Aldershot · Support Aldershot', 'the first line no longer follows a career');
  C.set(null);
  ok(/<p class="eyebrow home-club" id="home-club">Play as Your Team · Support Your Team<\/p>\s*<p class="eyebrow home-tagline">Grassroots to Global<\/p>/.test(body), 'Play as Your Team · Support Your Team, with Grassroots to Global on the line under it');
  ok(!/home-club'\)\.textContent/.test(src), 'and nothing in the game rewrites the first line');
  X.renderHome();
  ok($('yt-name').textContent === 'Farnham' && s.myTeam === 'FAR' && Y.of() === X.CLUBS[0], 'a new game supports Farnham');
  ok($('yt-league').textContent === 'Regional 1 South Central · 7th Last Season' && !$('yt-league').hidden, `the league and the finish (${$('yt-league').textContent})`);
  ok($('yt-record').textContent === 'Won 10 · Lost 12 · 640 Scored · 646 Conceded' && !$('yt-record').hidden, `and the record (${$('yt-record').textContent})`);
  ok($('yt-play').textContent === 'Play as Farnham', 'Play as Farnham');
  ok($('yt-jersey').innerHTML.includes('--kit:#1a1a1a') && $('yt-jersey').innerHTML.includes('hoops'), 'the club\'s jersey');
  ok(/<section class="yt" id="yt-panel"[^>]*>[\s\S]*?<p class="eyebrow" id="yt-eyebrow">Your Team<\/p>/.test(body) && /id="yt-change">Change Team</.test(body), 'the eyebrow and Change Team');
  ok((body.match(/class="btn primary"/g) || []).length >= 1 && body.slice(body.indexOf('id="s-home"'), body.indexOf('id="s-teams"')).match(/btn primary/g).length === 1 && !/primary[^>]*id="yt-/.test(body), 'Quick Match stays the only gold button on home');
  const at = id => body.indexOf('id="' + id + '"');
  ok(at('b-cam') < at('b-half') && at('b-half') < at('b-quick') && at('b-practice') < at('yt-panel') && at('yt-panel') < at('app-tools') && at('app-tools') < at('home-cabinet'), 'in the keyboard\'s Tab order, as the screen reads: the camera and the clock by the logo, then the buttons, the panel, Offline Ready, the Trophy Cabinet and the settings');
  ok(/\.btn, \.team, \.seg button/.test(src), 'its buttons are .btn, so a controller reaches them');
  const panel = body.slice(at('yt-panel'), at('app-tools')) + src.slice(src.indexOf('const yourTeamLeague'), src.indexOf('function renderYourTeam'));
  ok(!/\b(he|his|him|she|her)\b/i.test(panel.replace(/<[^>]+>/g, ' ')), 'no he or she in the panel');
  const line = id => { s.myTeam = id; X.renderHome(); return [$('yt-name').textContent, $('yt-league').hidden ? null : $('yt-league').textContent, $('yt-record').hidden ? null : $('yt-record').textContent, $('yt-play').textContent]; };
  ok(line('NTH').join() === 'Northampton,English Premiership · 1st Last Season,Won 14 · Drew 1 · Lost 3 · 693 Scored · 536 Conceded,Play as Northampton', `a draw shows when there was one (${line('NTH')})`);
  ok(line('HAR')[1] === 'English Premiership · 9th Last Season' && line('COB')[1] === 'Counties 1 Surrey/Sussex · 1st Last Season' && line('MTB')[1] === 'Top 14 · 14th Last Season', 'ordinals read right');
  ok(line('MEL')[1] === null && line('MEL')[2] === null && line('MEL')[3] === 'Play as Melbourne', 'Melbourne has no league line, and no invented one');
  ok(line('FIJ')[1] === null && line('FIJ')[2] === null && $('yt-name').textContent === 'Fiji', 'nor does a nation');
  const made = X.cleanTeam({ key:'my1', name:'Badgers Rugby Club', kit:'#123456', trim:'#abcdef', pace:3, league:'Fake League', place:1, w:99, d:0, l:0, pf:999, pa:0 }, 0);
  X.restore({ custom:[made] });
  const m = line('my1');
  ok(m[0] === made.name && m[1] === null && m[2] === null && m[3] === 'Play as ' + made.name && !('league' in X.custom()[0]), `a team you made shows no figures, even handed some (${m})`);
  ok($('yt-name').textContent.length <= 24 && /data-fit/.test(body.slice(at('yt-name') - 30, at('yt-name') + 30)), 'a long name is fitted');
  X.restore({ custom:[] }); s.myTeam = 'FAR'; X.renderHome();
});

// 4. Play as: Quick Match with your team picked
pending('4. Play as (main\'s My Team and Quick Match)', async () => {
  s.myTeam = 'BAT'; X.renderHome();
  $('yt-play').click();
  ok(D.pickMode() === 'quick' && $('t-title').textContent === 'Pick Opponent' && !$('t-yours').hidden && $('t-mine').innerHTML.includes('Bath') && s.pool === 5, 'Play as Bath opens Quick Match with Bath picked, on its list');
  ok($('t-grid').innerHTML.includes('aria-disabled="true"') && $('t-eyebrow').textContent === 'Quick Match', 'Bath\'s own card is out of reach');
  $('b-quick').click();
  ok($('t-mine').innerHTML.includes('Bath'), 'Quick Match itself starts on your team too');
  s.myTeam = 'FIJ'; $('yt-play').click();
  ok(s.pool === 0 && $('t-mine').innerHTML.includes('Fiji'), 'a nation opens on International');
  s.myTeam = 'HAR'; $('yt-play').click();
  ok(s.pool === 1, 'the side in two lists opens on Local, the list it came from');
  s.myTeam = 'FAR'; $('b-quick').click();
  ok(s.pool === 1 && $('t-mine').innerHTML.includes('Farnham') && D.pickMode() === 'quick', 'the default is as it always was');
  // a championship starts from Your Team too
  D.openTeams('champ');
  ok(s.pool === 1 && $('t-yours').hidden && !$('t-default').hidden && $('t-default').textContent === 'Play as Farnham', 'a new game: the championship pick is Farnham on Local');
  s.myTeam = 'BAT'; D.openTeams('champ');
  ok(s.pool === 5 && !$('t-default').hidden && $('t-default').textContent === 'Play as Bath', `a Bath supporter opens on England with Play as Bath (${s.pool}, ${$('t-default').textContent})`);
  s.pool = 2; D.renderTeams();
  ok($('t-default').hidden, 'on another tab the gold button goes: a championship draws from the tab on screen');
  s.pool = 5; D.renderTeams();
  X.setChamp(null); $('t-default').click();
  ok(X.champ() && X.champ().teams[0].id === 'BAT' && X.champ().teams.slice(1).every(t => X.ENGLAND.some(o => o.id === t.id)), 'pressing it starts the season as Bath, against its own list');
  X.setChamp(null);
  s.womens = 1; D.openTeams('champ');
  ok($('t-default').textContent === 'Play as Bath' && !$('t-default').hidden, "on Women's it is Bath's women");
  $('t-default').click();
  ok(X.champ().teams[0].g === 1 && X.champ().teams.every(t => t.g === 1), 'all six the same side');
  X.setChamp(null);
  s.myTeam = 'GEO'; D.openTeams('champ');
  ok(s.pool === 0 && $('t-default').hidden, "a nation with no women's side has no gold button on Women's");
  s.womens = 0; D.openTeams('champ');
  ok($('t-default').textContent === 'Play as Georgia' && !$('t-default').hidden && s.pool === 0, 'and has one on Men\'s');
  s.myTeam = 'FAR'; D.openTeams('two');
  ok(s.pool === 1 && $('t-default').hidden, 'Two Player opens as it did');
  D.openTeams('quick');
});

// 4b. on Women's the panel says so, and shows no men's figures
pending('4b. Women\'s on the panel (the My Team builder, with main\'s Men | Women | Minis)', async () => {
  s.myTeam = 'FAR'; s.womens = 1; X.renderHome();
  ok($('yt-eyebrow').textContent === "Your Team · Women's" && $('yt-league').hidden && $('yt-record').hidden && $('yt-play').textContent === 'Play as Farnham', `Women's on: named on the panel, and the men's league line and record are gone (${$('yt-eyebrow').textContent})`);
  s.womens = 0; X.renderHome();
  ok($('yt-eyebrow').textContent === 'Your Team' && !$('yt-league').hidden && !$('yt-record').hidden, "Men's: the eyebrow and figures are back");
  const made = X.cleanTeam({ key:'my9', name:'Otters', g:1, pace:3 }, 0);
  X.restore({ custom:[made] }); s.myTeam = 'my9'; X.renderHome();
  ok($('yt-eyebrow').textContent === "Your Team · Women's", "a women's team you made says so with the toggle on Men's");
  X.restore({ custom:[] }); s.myTeam = 'FAR'; X.renderHome();
});

// 5. Change Team: the tabs and teams you made, Import Club among them
pending('5. Change Team (main\'s My Team picker)', async () => {
  const pressed = t => { const i = Y.teamList().indexOf(t); return i; };
  s.myTeam = 'FAR'; $('yt-change').click();
  ok(D.pickMode() === 'my' && $('t-eyebrow').textContent === 'Your Team' && $('t-title').textContent === 'Pick Your Team', 'Change Team opens a picker');
  ok($('t-default').hidden && $('t-yours').hidden && $('t-back').textContent === 'Back to Menu', 'with no gold button and a way back');
  ok($('t-grid').innerHTML.includes('id="t-import"') && $('t-grid').innerHTML.includes('Import Club') && $('t-grid').innerHTML.includes('id="t-create"'), 'Import Club and Create Team are there');
  ok(/class="team picked" data-i="1"\s+aria-current="true"\s*>/.test($('t-grid').innerHTML), 'your team is marked, for a screen reader too, and can still be pressed');
  ok(($('t-grid').innerHTML.match(/aria-current/g) || []).length === 1, 'and only your team');
  s.pool = 2; D.renderTeams();
  D.pickTeam(by('TLS'));
  ok(s.myTeam === 'TLS' && saved().settings.myTeam === 'TLS' && !$('s-home').hidden && $('yt-name').textContent === 'Toulouse' && !T.M.two, 'picking one saves it and comes home; no match starts');
  ok(pressed(by('TLS')) >= 0, 'it came from the list on screen');
  // a team you make is your team
  $('yt-change').click();
  D.renderTeams();
  Y.openBuilder(null); $('bd-name').value = 'Badgers'; $('bd-code').value = 'BDG';
  Y.finishBuilder();
  const mine = X.custom().find(t => t.name === 'Badgers');
  ok(mine && s.myTeam === mine.key && $('yt-name').textContent === 'Badgers' && !$('s-home').hidden, 'a team made from the picker becomes your team');
  // it survives a reload, and its deletion
  X.save();
  const key = mine.key, text = memory['tryline.v1'];
  s.myTeam = 'FAR'; X.load();
  ok(s.myTeam === key && Y.of().key === key, 'your team loads back');
  $('yt-change').click();
  Y.openBuilder(X.custom().find(t => t.key === key)); Y.delTeam(); Y.delTeam();
  ok(!X.custom().some(t => t.key === key) && s.myTeam === 'FAR' && Y.of() === X.CLUBS[0], 'deleting it goes back to the default');
  X.restore(JSON.parse(text)); X.restore({ custom:[] });
  ok(s.myTeam === key && Y.of() === X.CLUBS[0], 'a save whose team has gone reads as the default');
  X.renderHome();
  ok($('yt-name').textContent === 'Farnham', 'and the panel draws');
  for (const bad of [5, '', '<img src=x>', 'a'.repeat(25), null, {}]) { s.myTeam = 'FAR'; X.restore({ settings:{ myTeam:bad } }); ok(s.myTeam === 'FAR', `a bad key is ignored (${JSON.stringify(bad)})`); }
  X.restore({ settings:{ myTeam:'NOPE' } });
  ok(Y.of() === X.CLUBS[0], 'an unknown key reads as the default');
  X.restore({ settings:{ half:1 } }); s.myTeam = 'FAR';
  const old = { settings:{ half:1, diff:1, pool:1 }, custom:[], champ:null };
  X.restore(old);
  ok(s.myTeam === 'FAR', 'a save from before Your Team starts on the default');
  // a club imported from the picker is your team
  $('yt-change').click();
  const u = Y.importUi(); u.step = 'preview'; u.data = { club:{ name:'Bracknell RFC', kit:'#399913', trim:'#e4c200' }, league:[], teams:[] }; u.draft = { kit:'#399913', trim:'#e4c200', hoops:false };
  Y.commitImport();
  const club = X.custom().find(t => t.name === 'Bracknell RFC');
  ok(club && s.myTeam === club.key && !$('s-home').hidden && $('yt-name').textContent === 'Bracknell RFC' && $('yt-league').hidden && $('yt-record').hidden, 'a club imported from the picker becomes your team, with no invented figures');
  ok(X.rateOf(club) === 11 && club.level === 'r1', 'set at the level of the best Local club: Regional 1');
  // a side in your imported league can be your team, until the league goes
  X.restore({ importLeague:{ teams:[{ id:'QAZ', name:'Ash Vale', kit:'#1b2747', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:3 }] } });
  s.myTeam = I.league().teams[0].key;
  ok(Y.of().name === 'Ash Vale' && Y.poolOf(Y.of()) === Y.IMPORT_POOL, 'a league side can be your team');
  I.setLeague(null);
  ok(Y.of() === X.CLUBS[0], 'and when the league is removed the default stands');
  X.restore({ custom:[] }); s.myTeam = 'FAR';
});

// 6. a new career starts on your team, when it is in the list
pending('6. a new career on your team (main\'s career picks My Team\'s club already)', async () => {
  s.myTeam = 'GUI'; C.newOpen();
  ok(Y.careerClubs()[Y.careerDraft().i].id === 'GUI', 'the new player\'s club starts on your team');
  s.myTeam = 'TLS'; C.newOpen();
  ok(Y.careerDraft().i === 0, 'on the first club when your team is not a Local club');
  X.restore({ custom:[{ key:'my7', name:'Otters', kit:'#123456', trim:'#abcdef', pace:3 }] }); s.myTeam = 'my7'; C.newOpen();
  ok(Y.careerClubs()[Y.careerDraft().i].name === 'Otters', 'or on a team you made');
  X.restore({ custom:[] }); s.myTeam = 'FAR';
});

// 7. what a phone needs: no layout here, so these pin the rules the browser check measured
pending('7. the panel\'s phone rules (the My Team builder)', async () => {
  const at = id => body.indexOf('id="' + id + '"');
  // New Player's rules are the career builder's now (2026-11-09): main's New Player with Your Look as its second step (tools/career.mjs measures both)
  ok(at('cn-cat') < at('cn-name') && at('cn-go') > at('cn-num') && at('cn-look-go') < at('cn-go') && at('ck-style') > at('cn-go'), 'New Player: Team (Men | Women, the one control) on the left, Start Career after every picker, Your Look a screen of its own');
  ok(/\.swatches\.cr-sw\{grid-template-columns:repeat\(3,44px\)/.test(src) && !/minmax\(0,44px\)/.test(src), 'swatches stay 44 wide: nothing lets them shrink');
  ok(/\.app-action \{[^}]*min-height:44px/.test(src) && /\.home-cabinet summary\{min-height:44px/.test(src), 'Update Game, Install Game and the Trophy Cabinet are 44 tall');
  ok(/\.home-side \.app-tools\{flex:0 1 auto;flex-wrap:nowrap/.test(src) && /\.home-side \.home-cabinet\{flex:1 1 0;min-width:0/.test(src), 'the tools and the cabinet share one row, the cabinet taking what is left, so Update Game can not wrap off the screen');
  ok(/\.app-tools:has\(\.app-action:not\(\[hidden\]\)\) #offline-status\{display:none\}/.test(src), 'Offline Ready gives way first');
  // the tab row's cue: a fade where more tabs are, from its own scroll metrics
  const row = () => { const on = new Set(); return { scrollLeft:0, scrollWidth:747, clientWidth:632, classList:{ toggle:(c, v) => { if (v) on.add(c); else on.delete(c); } }, on }; };
  const r = row(); Y.poolTabCue(r);
  ok(r.on.has('more-r') && !r.on.has('more-l'), 'more tabs to the right: a fade on the right');
  r.scrollLeft = 50; Y.poolTabCue(r);
  ok(r.on.has('more-r') && r.on.has('more-l'), 'in the middle: both');
  r.scrollLeft = 115; Y.poolTabCue(r);
  ok(!r.on.has('more-r') && r.on.has('more-l'), 'at the end: on the left only');
  r.scrollLeft = 0; r.scrollWidth = 632; Y.poolTabCue(r);
  ok(!r.on.has('more-r') && !r.on.has('more-l'), 'and none when they all fit');
  ok(/\.head > \.pool\.more-r\{[^}]*mask-image/.test(src) && /\.pool button\{padding:0 9px\}/.test(src), 'the fade is drawn, and a small phone shows part of the next tab');
});

console.log(`Your Team: ${passed} passed, ${failed} failed` + (PENDING.length ? ` · ${PENDING.length} pending for the builders: ${PENDING.join('; ')}` : ''));
process.exitCode = failed ? 1 : 0;
