// The team screen (README, Teams: The Team Screen): Your Team v the Opponent side by side, one team a side, the ladder (North | South |
// Mine | Favourites | Recent, each country's National and its lists' groups, Men | Women | Minis on top), Left and Right through a group,
// Up and Down through the ladder, a whole country at a time, each round again; the swipe; Pick Opponent's lock and its rivals first; the
// picks kept (each side's last, its Recent, the Favourites) through a save and from saves before them; each one-side mode (Championship,
// Career, My Team, the World Cup and the Home Nations Tour); GAME_VERSION. Its last part needs Playwright and Chromium (as
// tools/home.mjs's does) and is skipped, saying so, where they are missing: the screen at 844x390, 667x375, 844x340, 667x320 and 568x320
// with no scroll and every target 44px or more, the keyboard, a controller and the lift's hint, a finger's swipe, and reduced motion.
// node tools/picker.mjs
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
process.env.SEED ??= '41';
const { T, rndCalls } = await import('./harness.mjs');
const { readGameSource } = await import('./source.mjs');
const P = T.picker, D = T.debug, X = T.teams, H = T.home, C = T.career, L = T.locker, S = T.store, $ = id => document.getElementById(id);
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const json = JSON.stringify;
const memory = {};
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = String(v); } };
const saved = () => JSON.parse(memory['tryline.v1']);
const st = D.settings();
const by = id => X.ALL_TEAMS.find(t => t.id === id);
const fresh = () => { st.pick = [null, null]; st.recent = [[], []]; st.fav = []; st.cat = 'men'; st.myClub = null; st.myNat = null; X.custom().length = 0; T.importer.setLeague(null); X.setChamp(null); L.set(L.fresh()); };
const golds = n => { L.set(L.fresh()); L.FEATS.filter(f => f.id !== 'star').slice(0, n).forEach(f => { L.state().n[f.id] = 10; }); };
const rungs = (cat, o) => P.ladder(cat, o).map(g => `${P.where(g)}: ${g.name} ${g.teams.length}`);
const names = g => g.teams.map(t => t.act ? '+' + t.name : X.listName(t)).join(',');
const view = s => P.view(s);
const shown = s => view(s).team;
const ALL = { nations:true, legends:true, clubs:true, mine:'all', fav:true, recent:0 };

// 1. The ladder, from the real data: each category's countries in its own table's order, North then South, each country's National group
//    (the nation, then its Legends) and its lists' groups, named for their competitions, Local's last; then Mine. Japan is in the North.
{
  fresh();
  const MEN = ['North · Ireland: National 1', 'North · Ireland: URC 4', 'North · France: National 1', 'North · France: Top 14 14',
    'North · England: National 1', 'North · England: Premiership 10', 'North · England: Championship 13', 'North · England · Local: Surrey 12', 'North · England · Local: Counties 7',
    'North · Scotland: National 1', 'North · Scotland: URC 2', 'North · Scotland: Premiership 10', 'North · Wales: National 1', 'North · Wales: URC 4',
    'North · Italy: National 1', 'North · Italy: URC 2', 'North · Japan: National 1', 'North · Japan: Clubs 7',
    'South · South Africa: National 1', 'South · South Africa: URC 4', 'South · South Africa: Currie Cup 3', 'South · New Zealand: National 1', 'South · New Zealand: Provinces 6',
    'South · Australia: National 1', 'South · Australia: Clubs 6', 'South · Argentina: National 1', 'South · Fiji: National 1',
    'Mine: Made Teams 1', 'Mine: My League 1'];
  ok(json(rungs('men', ALL)) === json(MEN), `Men: North in the men's table order (Ireland, France, England, Scotland, Wales, Italy, Japan), then South (South Africa, New Zealand, Australia, Argentina, Fiji), each country's National then its groups, England's Local last, then Mine (${rungs('men', ALL).join(' | ')})`);
  const WOMEN = ['North · England: National 1', 'North · England: Premiership 10', 'North · England: Championship 13', 'North · England · Local: Surrey 12', 'North · England · Local: Counties 7',
    'North · Canada: National 1', 'North · France: National 1', 'North · France: Top 14 14', 'North · Ireland: National 1', 'North · Ireland: URC 4', 'North · USA: National 1',
    'North · Italy: National 1', 'North · Italy: URC 2', 'North · Scotland: National 1', 'North · Scotland: URC 2', 'North · Scotland: Premiership 10', 'North · Wales: National 1', 'North · Wales: URC 4',
    'North · Japan: Clubs 7', 'South · New Zealand: National 1', 'South · New Zealand: Provinces 6', 'South · Australia: National 1', 'South · Australia: Clubs 6',
    'South · South Africa: National 1', 'South · South Africa: URC 4', 'South · South Africa: Currie Cup 3', 'South · Fiji: National 1', 'Mine: Made Teams 1', 'Mine: My League 1'];
  ok(json(rungs('women', ALL)) === json(WOMEN), `Women: the women's twelve in their table's order, Canada and the USA National only, Japan its clubs only (last in the North), Argentina not shown (${rungs('women', ALL).join(' | ')})`);
  ok(json(rungs('minis', ALL)) === json(MEN), 'Minis: the men\'s ladder');
  const minis = P.ladder('minis', ALL), women = P.ladder('women', ALL);
  ok(minis.filter(g => g.key.startsWith('nat.')).every(g => g.teams[0].name.endsWith(' Minis') && g.teams[0] === X.natList('minis').find(n => n.id === g.home)) && women.filter(g => g.key.startsWith('nat.')).every(g => g.teams[0] === X.natList('women').find(n => n.id === g.home)), 'each National group is the category\'s own nation (England Minis, England Women)');
  const g = k => P.ladder('men', ALL).find(x => x.key === k);
  ok(names(g('cel.ire')) === 'Dublin,Limerick,Belfast,Galway' && names(g('cel.sco')) === 'Edinburgh,Glasgow' && names(g('cel.wal')) === 'Cardiff,Swansea,Llanelli,Newport' && names(g('cel.ita')) === 'Treviso,Parma', 'the URC split by country: Dublin, Limerick, Belfast, Galway; Edinburgh, Glasgow; Cardiff, Swansea, Llanelli, Newport; Treviso, Parma');
  ok(names(g('rsa.urc')) === 'Pretoria,Cape Town,Durban,Johannesburg' && names(g('rsa.currie-cup')) === 'Bloemfontein,Kimberley,Mbombela', 'South Africa split by its sides\' league: the URC\'s four, the Currie Cup\'s three');
  ok(g('eng').list === 'eng' && g('en2').list === 'en2' && g('sur').list === 'sur' && g('cty').list === 'cty' && g('sco').list === 'sco' && g('cel.ire').list === 'cel' && g('rsa.urc').list === 'rsa' && g('nat.eng').list === 'int', 'each group keeps its whole list\'s key (a pick of Dublin plays the URC, cel)');
  ok(names(g('cty')) === X.COUNTIES.map(t => t.name).join() && names(g('sur')) === X.CLUBS.map(t => t.name).join() && g('cty').local && g('sur').local, 'Local\'s lists whole and in their order (Counties is not cut by league), under Local');
  ok(X.TEAM_LISTS.map(l => l.key).join() === 'int,eng,en2,fra,cel,sco,rsa,aus,nzl,jpn,sur,cty', 'TEAM_LISTS and its keys unchanged (cel included)');
  ok(P.LEAGUE_SHORT['English Premiership'] === 'Premiership' && P.LEAGUE_SHORT['United Rugby Championship'] === 'URC' && P.LIST_GROUP.sco === 'Premiership' && P.LIST_GROUP.nzl === 'Provinces' && g('aus').name === 'Clubs' && g('jpn').name === 'Clubs', 'group names from the data: the competition every side shares, else the list\'s (Scotland\'s Premiership, New Zealand\'s Provinces), else Clubs (Australia\'s two with no league, Japan)');
  const clubs = new Set(P.ladder('men', ALL).filter(x => x.list && x.list !== 'int' && x.hemi !== 'mine').flatMap(x => x.teams));
  ok(clubs.size === X.ALL_TEAMS.filter(t => !X.isNation(t)).length && X.ALL_TEAMS.filter(t => !X.isNation(t)).every(t => clubs.has(t)), `every built-in club on the ladder (${clubs.size}), Guildfordians once a team (in Surrey and Counties)`);
  ok(Object.keys(P.HEMI).length === 14 && P.HEMI.JPN === 'north' && P.HEMI.ARG === 'south' && P.HEMI.CDN === 'north', 'each of the fourteen nations has its hemisphere; Japan is North');
  ok(P.homeLine(by('TOK'), 'men') === 'Clubs · Japan' && P.homeLine(by('BTH'), 'men') === 'English Premiership' && P.homeLine(X.natList('men')[0], 'men') === 'National · South Africa' && P.homeLine(by('AYR'), 'men') === 'Premiership · Scotland', 'the card\'s league line: the side\'s own league, else its group and country');
  // the Legends, behind the Gold medals, after their nation
  golds(10);
  const lg = c => P.ladder(c, ALL).filter(x => x.key.startsWith('nat.')).map(x => x.home + ':' + x.teams.map(t => t.id).join(' ')).filter(s => s.includes(' ')).join(', ');
  ok(lg('men') === 'ENG:ENG L03, RSA:RSA L95 L07 L19 L23, NZL:NZL L87 L11 L15, AUS:AUS L91 L99', `Men's Legends after their nation: England 2003 after England (${lg('men')})`);
  ok(lg('women') === 'ENG:ENG W14 W25, USA:USA W91, NZL:NZL W98 W17', `Women's Legends after theirs (${lg('women')})`);
  ok(lg('minis') === lg('men'), 'Minis show the men\'s Legends, as before');
  golds(0);
  ok(lg('men') === '', 'no Gold, no Legend');
  // Mine: the teams you made and My League, with their ways in, gated as ever
  X.custom().push(X.cleanTeam({ name:'Herons', key:'myhe' }, 0));
  T.importer.setLeague({ teams:[{ key:'lg-BRN', id:'BRN', name:'Bourne', kit:'#112233', trim:'#445566', pace:3, power:3, handling:3, kicking:3, stamina:3 }] });
  const mine = P.ladder('men', ALL).filter(x => x.hemi === 'mine');
  ok(mine.map(names).join(' | ') === 'Herons,+Create Team | Bourne,+Add Your Team', `Mine: Made Teams (Herons, Create Team) and My League (Bourne, Add Your Team) (${mine.map(names).join(' | ')})`);
  for (let i = 0; i < 3; i++) X.custom().push(X.cleanTeam({ name:'Made ' + i, key:'mym' + i }, i + 1));
  ok(!P.ladder('men', ALL).find(x => x.key === 'mine.made').teams.some(t => t.act), 'four made: no Create Team');
  fresh();
}

// 2. Left and Right, Up and Down, a whole country: each round again
{
  fresh(); D.openTeams('quick');
  ok(view(0).group.key === 'sur' && shown(0).id === 'FAR' && !P.state().sides[0].set, 'Your Team opens on My Team\'s club (Farnham, Local · Surrey), offered, not set');
  const n = view(0).group.teams.length;
  P.step(0, 1); ok(view(0).i === 1, 'Next: the next side');
  P.step(0, -1); P.step(0, -1); ok(view(0).i === n - 1, 'Previous from the first: the last (it wraps)');
  P.step(0, 1); ok(view(0).i === 0, 'and Next from the last: the first');
  const G = view(0).ladder.length, at = view(0).gi;
  P.group(0, 1); ok(view(0).group.key === 'cty' && view(0).i === 0, 'Down: the next group (Surrey to Counties), its first side');
  P.group(0, -1); P.group(0, -1); ok(view(0).group.key === 'en2', 'Up: the one before (Championship)');
  for (let k = 0; k < G; k++) P.group(0, 1);
  ok(view(0).group.key === 'en2', `Down ${G} times: round the whole ladder and back`);
  P.group(0, -G + at - view(0).gi);
  // a country at a time
  D.openTeams('quick'); P.group(0, -view(0).gi);
  ok(view(0).group.key === 'nat.ire', 'the ladder\'s top: Ireland');
  const seen = [];
  for (let k = 0; k < 14; k++) { seen.push(view(0).group.key); P.country(0, 1); }
  ok(json(seen) === json(['nat.ire', 'nat.fra', 'nat.eng', 'nat.sco', 'nat.wal', 'nat.ita', 'nat.jpn', 'nat.rsa', 'nat.nzl', 'nat.aus', 'nat.arg', 'nat.fij', 'mine.made', 'nat.ire']), `a country at a time: each country's first group, Mine as one, round again (${seen.join(' ')})`);
  P.group(0, -view(0).gi); P.country(0, -1);
  ok(view(0).group.key === 'mine.made', 'back a country from the top: Mine, at the foot (it wraps)');
  P.country(0, -1); ok(view(0).group.key === 'nat.fij', 'and back again: Fiji');
  P.group(0, view(0).ladder.findIndex(g => g.key === 'en2') - view(0).gi); P.country(0, -1);
  ok(view(0).group.key === 'nat.fra', 'back a country from inside one (England\'s Championship): France');
  P.group(0, view(0).ladder.findIndex(g => g.key === 'en2') - view(0).gi); P.country(0, 1);
  ok(view(0).group.key === 'nat.sco', 'on a country from inside one: Scotland');
  fresh();
}

// 3. Setting a side, the primary, Kick Off; a swipe; Pick Opponent's lock and its rivals; 2 Players' mirror
{
  fresh(); D.openTeams('quick');
  ok(shown(1).id === 'WIM' && view(1).group.key === 'sur', 'Pick Opponent opens on Your Team\'s league rivals first: Wimbledon for Farnham (both Regional 1 South Central)');
  ok(P.primary() === 'Pick Farnham' && $('t-go').textContent === 'Pick Farnham', 'the primary sets Your Team first: Pick Farnham');
  ok($('t-title').textContent === 'Pick Your Team' && $('t-eyebrow').textContent === 'Quick Match', 'Quick Match · Pick Your Team');
  P.go();
  ok(P.state().sides[0].set && P.state().on === 1 && P.primary() === 'Pick Wimbledon' && $('t-title').textContent === 'Pick Opponent', 'Pick Farnham: set, on to the Opponent (Pick Opponent, Pick Wimbledon)');
  ok(T.sidesOf.quickPick() === by('FAR'), 'Your Team set is the one the tools read (quickPick)');
  ok(!view(1).ladder.some(g => g.teams.some(t => t.id === 'FAR')), 'the Opponent\'s ladder never has Your Team\'s side');
  P.go();
  ok(P.ready() && P.primary() === 'Kick Off' && $('t-go').textContent === 'Kick Off', 'both set: Kick Off');
  P.step(1, 1);
  ok(!P.state().sides[1].set && P.primary() === 'Pick ' + X.listName(shown(1)), 'moving a set side frees it: the primary picks it again');
  P.set(1); P.go();
  ok(T.M && T.M.nat[0].id === 'FAR' && T.M.nat[1].id === shown(1).id, 'Kick Off: the match, Your Team v the Opponent');
  D.exitMatch();
  // the lock, for every side Your Team can show
  fresh(); D.openTeams('quick');
  let bad = 0, total = 0;
  for (const g of view(0).ladder) for (const t of g.teams) {
    if (t.act) continue;
    total++;
    const r = P.ladderOf(1, t);
    if (r.some(x => x.teams.some(o => !o.act && (o.key || o.id) === (t.key || t.id)))) bad++;
  }
  ok(bad === 0 && total === X.natList('men').length + X.ALL_TEAMS.filter(t => !X.isNation(t)).length + 1, `the Opponent never shows Your Team's side, for each of the ${total} Your Team can show`);
  // rivals first, only the order changing
  const rival = (id, first) => { fresh(); D.openTeams('quick'); P.group(0, view(0).ladder.findIndex(g => g.teams.some(t => t.id === id)) - view(0).gi); while (shown(0).id !== id) P.step(0, 1); return shown(1).id === first; };
  ok(rival('HAS', 'KIN') && rival('BTH', 'BRS') && rival('KIN', 'HAS'), 'each opens on its own league\'s first rival: Haslemere on Kingston, Bath on Bristol');
  fresh(); D.openTeams('quick'); while (shown(0).id !== 'QUI') P.step(0, 1);
  ok(names(view(1).group) === X.CLUBS.filter(t => t.id !== 'QUI').map(t => t.name).join(), 'Quins has no league line: Surrey as it is, bar Quins');
  fresh(); D.openTeams('quick'); P.step(1, 2); const was = shown(1).id; P.step(0, 1);
  ok(shown(1).id === was, 'an Opponent moved stays where it was put');
  // swipe on a card: left for the next team, up for the next group; the click it ends with does nothing
  fresh(); D.openTeams('quick');
  const el = (s, act) => ({ dataset:{ act }, closest:sel => (sel === '.pk-side' ? { dataset:{ side:String(s) } } : sel === '[data-act]' ? el(s, act) : null) });
  const swipe = (s, dx, dy) => { const t = el(s, 'pick'); $('t-sides').fire('pointerdown', { pointerId:7, target:t, clientX:300, clientY:200 }); $('t-sides').fire('pointermove', { pointerId:7, target:t, clientX:300 + dx, clientY:200 + dy }); $('t-sides').fire('pointerup', { pointerId:7, target:t }); };
  swipe(0, -60, 8); ok(view(0).i === 1, 'a swipe left: the next team');
  swipe(0, 60, -6); ok(view(0).i === 0, 'a swipe right: the one before');
  swipe(0, 4, 70); ok(view(0).group.key === 'cty', 'a swipe down: the next group (the owner\'s Next Group Down)');
  swipe(0, 2, -70); ok(view(0).group.key === 'sur', 'a swipe up: the one before');
  swipe(0, 30, 28); ok(view(0).group.key === 'sur' && view(0).i === 0, 'a short or slanting drag: nothing');
  swipe(1, -60, 0); P.click({ target:el(1, 'pick') });
  ok(!P.state().sides[1].set, 'the click a swipe ends with sets nothing');
  // the long press on Previous or Next: a country
  // (in a browser, the timer; here, the same call it makes)
  // 2 Players: a mirror is allowed, the Opponent follows Player 1 to the next side
  fresh(); D.openJoin(); D.openTeams('two');
  ok($('t-eyebrow').textContent === '2 Players' && P.who(0) === 'Player 1' && P.who(1) === 'Player 2' && shown(1).id === view(0).group.teams[1].id, '2 Players: Player 1 v Player 2, the second opening on the next side in Player 1\'s group');
  P.step(1, -1);
  ok(shown(1).id === shown(0).id, 'and either may show the other\'s side (a mirror match, as ever)');
  P.set(0); P.set(1); ok(P.ready(), 'both set: Kick Off');
  P.go(); ok(T.M && T.M.two && T.M.nat[0].id === 'FAR' && T.M.nat[1].id === 'FA2', `a mirror match kicks off, the second Farnham as FA2, as ever (${T.M && T.M.nat.map(t => t.id)})`);
  D.exitMatch(); D.setTwo(false);
}

// 4. Remembered: each side's last pick (set as it was left), its Recent, the Favourites; through a save, and from saves before them
{
  fresh(); D.openTeams('quick');
  P.group(0, view(0).ladder.findIndex(g => g.key === 'eng') - view(0).gi); P.step(0, 3);
  const mine = shown(0); P.set(0);
  P.group(1, view(1).ladder.findIndex(g => g.key === 'nat.fra') - view(1).gi); P.set(1);
  P.go(); D.exitMatch();
  const w = saved().settings;
  ok(json(w.pick) === json([{ id:mine.id, cat:'men', g:'eng' }, { id:'FRA', cat:'men', g:'nat.fra' }]), `Kick Off keeps each side's pick: its key, its category and its group (${json(w.pick)})`);
  ok(json(w.recent) === json([[mine.id], ['FRA']]), 'and puts each first in its side\'s Recent');
  D.openTeams('quick');
  ok(shown(0) === mine && shown(1).id === 'FRA' && P.state().sides[0].set && P.state().sides[1].set && P.primary() === 'Kick Off', 'the screen reopens where each side was, both set: Kick Off at once');
  ok(view(0).ladder.some(g => g.key === 'recent' && g.teams[0] === mine), 'Recent: shown once it holds something');
  for (const id of ['SAL', 'GLO', 'LEI', 'SAL']) { D.openTeams('quick'); P.group(0, view(0).ladder.findIndex(g => g.key === 'eng') - view(0).gi); while (shown(0).id !== id) P.step(0, 1); P.set(0); P.go(); D.exitMatch(); }
  ok(json(saved().settings.recent[0]) === json(['SAL', 'LEI', 'GLO']) && json(saved().settings.recent[1]) === json(['FRA']), 'Recent: that side\'s own last three, newest first, each once');
  // Favourites
  D.openTeams('quick'); P.group(0, view(0).ladder.findIndex(g => g.key === 'nat.nzl') - view(0).gi);
  ok(!view(0).ladder.some(g => g.key === 'fav'), 'Favourites: not shown while empty');
  P.fav(0);
  ok(json(saved().settings.fav) === json(['NZL']) && view(0).ladder.some(g => g.key === 'fav' && g.teams[0].id === 'NZL') && P.panel(0).includes('aria-pressed="true" aria-label="Favourite"'), 'Favourite: starred, kept, its group shown with it, the toggle pressed');
  for (const id of ['FAR', 'BTH', 'TLS', 'DUB', 'EDI', 'CPT', 'AKL', 'TOK', 'SYD', 'AYR', 'EAL', 'EFF']) st.fav = [id, ...st.fav].slice(0, P.PICK_FAV);
  ok(st.fav.length === 12 && !st.fav.includes('NZL'), 'twelve at most, the oldest dropped');
  P.fav(0); ok(st.fav[0] === 'NZL' && st.fav.length === 12, 'starred again: first');
  P.fav(0); ok(!st.fav.includes('NZL'), 'and the toggle takes it off');
  // the save: each checked as it loads; a save from before them has none
  X.restore({ settings:{ pick:[{ id:'BTH', cat:'women', g:'eng' }, { id:'bad key!', cat:'men' }], recent:[['FAR', 'FAR', 'x y', 'BTH', 'GLO', 'LEI'], 'no'], fav:['NZL', 7, 'NZL', '<b>'] } });
  ok(json(st.pick) === json([{ id:'BTH', cat:'women', g:'eng' }, null]) && json(st.recent) === json([['FAR', 'BTH', 'GLO'], []]) && json(st.fav) === json(['NZL']), `the save checked: keys only, each once, three Recent a side, a bad pick none (${json([st.pick, st.recent, st.fav])})`);
  X.restore({ settings:{ pick:'x', recent:[[]], fav:{} } });
  ok(json(st.pick) === json([{ id:'BTH', cat:'women', g:'eng' }, null]) && st.fav.length === 1, 'a broken value is ignored, as every setting\'s is');
  fresh(); X.restore({ settings:{ cat:'men', pool:1 } });
  D.openTeams('quick');
  ok(shown(0).id === 'FAR' && !P.state().sides[0].set && shown(1).id === 'WIM' && json(st.pick) === json([null, null]), 'a save from before them: Farnham offered, Wimbledon opposite, nothing set');
  st.pick = [{ id:'CDN', cat:'women', g:'nat.cdn' }, { id:'gone', cat:'men', g:'mine.made' }];
  D.openTeams('quick');
  ok(shown(0).id === 'FAR' && !P.state().sides[0].set && !P.state().sides[1].set, 'a kept pick no longer there (Canada on Men, a team deleted): the side opens as if there were none');
  // a nation follows the category; one the category lacks is no longer set
  fresh(); st.cat = 'women'; D.openTeams('quick'); P.group(0, view(0).ladder.findIndex(g => g.key === 'nat.cdn') - view(0).gi); P.set(0);
  X.catPick('men');
  ok(!P.state().sides[0].set && shown(0).id !== 'CDN', 'Canada set on Women, then Men: no longer set');
  X.catPick('women'); P.group(0, view(0).ladder.findIndex(g => g.key === 'nat.eng') - view(0).gi); P.set(0); X.catPick('minis');
  ok(shown(0) === X.natList('minis').find(t => t.id === 'ENG') && P.state().sides[0].set, 'England Women set, then Minis: England Minis, still set');
  fresh();
}

// 5. Mine: Create Team and Add Your Team on the side that asked, gated as ever; Edit
{
  fresh(); D.openTeams('quick');
  P.group(0, view(0).ladder.findIndex(g => g.key === 'mine.made') - view(0).gi);
  ok(shown(0).act === 'create' && P.primary() === 'Create Team' && P.panel(0).includes('data-make="create"'), 'Mine\'s Made Teams: Create Team, on the card and the primary');
  S.setTier('free'); S.setBought([]);
  P.go(); ok(S.ui().mode === 'unlock' && S.ui().feature === 'create', 'locked on the free tier: the Unlock card');
  T.store.close(); S.setTier(null);
  P.go(); ok(!$('s-build').hidden, 'Create Team opens the builder');
  T.sidesOf.saveBuilder();
  ok(shown(0).custom && P.state().sides[0].set && P.state().on === 1, 'saved while picking Your Team: it is Your Team, set, and the Opponent is next');
  ok(P.panel(0).includes('data-act="edit"'), 'a made team has its Edit');
  fresh(); D.openTeams('quick'); P.group(1, view(1).ladder.findIndex(g => g.key === 'mine.made') - view(1).gi); P.go();
  T.sidesOf.saveBuilder();
  ok(shown(1).custom && !P.state().sides[1].set && !P.state().sides[0].set, 'made on the Opponent\'s side: shown there, not set');
  fresh(); D.openTeams('quick'); P.group(0, view(0).ladder.findIndex(g => g.key === 'mine.league') - view(0).gi);
  ok(shown(0).act === 'import' && P.primary() === 'Add Your Team', 'My League: Add Your Team, always in reach');
  fresh();
}

// 6. One side: Championship, Career, My Team, the World Cup and the Home Nations Tour
{
  fresh(); D.openTeams('champ', 'eng');
  ok(P.one() && $('t-side1').hidden && $('t-v').hidden && $('t-sides').classList.contains('one'), 'Championship: one side, centred, no V');
  ok(view(0).ladder.map(g => g.key).join() === 'comp,mine.made' && view(0).group.name === 'England' && names(view(0).ladder[0]) === X.ENGLAND.map(t => t.name).join(), 'its competition\'s sides only, then Made Teams');
  st.myClub = 'BTH'; D.openTeams('champ', 'eng');
  ok(shown(0).id === 'BTH' && P.primary() === 'Play as Bath' && $('t-go').textContent === 'Play as Bath', 'My Team offered: Play as Bath');
  P.step(0, 1); ok(P.primary() === 'Play as ' + shown(0).name, 'Play as follows the side shown');
  const pickedId = shown(0).id; P.go();
  ok(X.champ() && X.champ().teams[0].id === pickedId && X.champ().teams.slice(1).every(t => X.ENGLAND.some(o => o.id === t.id)), 'Play as starts it: that side and five from its list');
  X.setChamp(null);
  st.cat = 'women'; D.openTeams('champ', 'eng');
  ok(P.primary() === 'Play as Bath Women', 'on Women: Play as Bath Women');
  st.cat = 'men';
  D.openTeams('champ', 'int');
  ok(view(0).group.name === 'International' && shown(0).id === 'ENG' && P.primary() === 'Play as England', 'International: England, My Team\'s country');
  fresh(); C.newOpen(); C.clubOpen();
  ok(D.pickMode() === 'career' && $('t-eyebrow').textContent === 'New Player' && $('t-title').textContent === 'Pick Your Club' && $('t-back').textContent === 'Back to New Player' && $('t-cat').hidden, 'Career: New Player · Pick Your Club, no Men | Women | Minis');
  ok(view(0).ladder.every(g => g.teams.every(t => !X.isNation(t) && !t.legend && !t.act)), 'clubs only: no nation, no Legend, no Create Team');
  P.group(0, view(0).ladder.findIndex(g => g.key === 'cel.ire') - view(0).gi);
  ok(shown(0).id === 'DUB' && P.primary() === 'Pick Dublin', 'Pick Dublin');
  P.go();
  ok(C.draft().club.id === 'DUB' && C.draft().league === 'cel', 'a pick of Dublin plays the URC: the career\'s league is the whole list (cel)');
  fresh(); st.myClub = null; D.openTeams('my');
  ok($('t-title').textContent === 'Pick Your Club' && shown(0).id === 'FAR' && P.primary() === 'Done', 'My Team: the club first (Farnham), Done while it is');
  ok(!view(0).ladder.some(g => g.teams.some(t => t.legend)), 'no Legends');
  P.step(0, 1); const club = shown(0); P.go();
  ok(st.myClub === club.id && $('t-title').textContent === 'Pick Your Country' && shown(0).id === 'ENG' && P.primary() === 'Done', 'a club picked: it is My Team\'s, and the side moves on to the country');
  P.group(0, view(0).ladder.findIndex(g => g.key === 'nat.fra') - view(0).gi); P.go();
  ok(st.myNat === 'FRA' && P.primary() === 'Done', 'the country picked: kept, Done');
  fresh(); D.openTeams('champ', 'world');
  ok(view(0).ladder.length === 1 && view(0).group.fixed && view(0).group.teams.length === 12 && shown(0).id === 'ENG' && P.primary() === 'Play as England', 'the World Cup: its twelve, a fixed list, My Team\'s country on show: Play as England');
  const g0 = view(0).gi; P.group(0, 1); P.country(0, 1);
  ok(view(0).gi === g0 && !P.panel(0).includes('data-act="sheet"'), 'no ladder: Up, Down and a country do nothing, and no sheet');
  const i0 = view(0).i; P.step(0, 1); ok(view(0).i === (i0 + 1) % 12, 'Left and Right through the twelve');
  fresh(); D.openTeams('champ', 'tour');
  ok(view(0).group.teams.length === 3 && P.primary().startsWith('Tour ') && P.who(0) === 'Host', 'the Home Nations Tour: its three hosts, Tour and the host');
  fresh();
}

// 7. 2 Players' seats, a controller, the keyboard's arrows and Page keys, through the same calls the devices make
{
  fresh(); D.openJoin(); D.openTeams('two');
  P.nav(1, 1, 0); ok(view(1).i === 2, 'Player 2\'s Right drives his own side');
  P.nav(0, 0, 1); ok(view(0).group.key === 'cty', 'Player 1\'s Down drives his');
  P.shoulder(1, 1); ok(view(1).group.key === 'nat.sco', 'a shoulder (or Sprint): Player 2\'s next country');
  P.press(0); ok(P.state().sides[0].set && !P.state().sides[1].set, 'Player 1\'s A sets his side');
  P.back(0); ok(!P.state().sides[0].set, 'his B frees it');
  P.press(0); P.press(1); ok(P.ready(), 'both A: both set');
  P.press(1); ok(T.M && T.M.two, 'and A again: Kick Off');
  D.exitMatch(); D.setTwo(false);
  fresh(); D.openTeams('quick');
  const key = k => P.key({ key:k, preventDefault() {} });
  ok(key('ArrowRight') && view(0).i === 1, 'the keyboard: Right on the active side');
  ok(key('ArrowDown') && view(0).group.key === 'cty', 'Down: the next group');
  ok(key('PageDown') && view(0).group.key === 'nat.sco', 'Page Down: the next country');
  ok(key('PageUp') && view(0).group.key === 'nat.eng', 'Page Up: back a country');
  ok(key('a') && P.filterState().open && P.filterState().s === 0 && P.filterState().q === 'a', 'a letter: the Filter, for the active side, with it typed');
  P.filterShut(); P.set(0);
  ok(key('7') && P.filterState().open && P.filterState().s === 1 && P.filterState().q === '7', 'a digit too, and for the side being set (the Opponent, once Your Team is)');
  P.filterShut();
  ok(!key('Tab') && !key(' ') && !key('F5') && !P.filterState().open, 'Tab, Space and every other key are the browser\'s');
  ok(!P.key({ key:'b', ctrlKey:true, preventDefault() {} }) && !P.filterState().open, 'and a letter with Ctrl or Cmd (a shortcut) is too');
}

// 7b. The review's fixes (2026-11-11), without a browser: the Opponent follows Your Team from Favourites and Recent to its rivals, and never
//     onto Create Team alone; the category the sides were picked in comes back; a Legend kept from before a purchase was taken back is
//     neither set again nor played; 2 Players' one title
{
  fresh(); st.recent = [['CDF', 'FAR'], []]; st.fav = ['GUI'];
  D.openTeams('quick'); P.group(0, view(0).ladder.findIndex(g => g.key === 'recent') - view(0).gi);
  ok(shown(0).id === 'CDF' && view(1).group.key === 'cel.wal' && shown(1).league === shown(0).league && shown(1).id !== 'CDF', `Your Team on Recent's Cardiff: the Opponent on Cardiff's own group, its rivals first (${view(1).group.key}, ${shown(1).id})`);
  D.openTeams('quick'); P.group(0, view(0).ladder.findIndex(g => g.key === 'fav') - view(0).gi);
  ok(shown(0).id === 'GUI' && view(1).group.key === 'sur' && shown(1).id !== 'GUI', `and on Favourites' Guildford: Surrey, Guildford's own (${view(1).group.key}, ${shown(1).id})`);
  fresh(); D.openTeams('quick'); P.group(0, view(0).ladder.findIndex(g => g.key === 'mine.made') - view(0).gi); P.go(); T.sidesOf.saveBuilder();
  ok(shown(0).custom && P.state().sides[0].set && !shown(1).act && view(1).group.key === 'sur' && P.primary() === 'Pick ' + X.listName(shown(1)), `the first team made from Your Team's side: the Opponent on a real side, never Create Team (${view(1).group.key}, ${P.primary()})`);
  // the category
  fresh(); st.cat = 'men'; st.pick = [{ id:'ENG', cat:'women', g:'nat.eng' }, { id:'FRA', cat:'women', g:'nat.fra' }];
  D.openTeams('quick');
  ok(st.cat === 'women' && shown(0) === X.natList('women').find(t => t.id === 'ENG') && shown(1) === X.natList('women').find(t => t.id === 'FRA') && P.ready(), 'Quick Match reopens in the category its sides were picked in (Women), wherever Men | Women | Minis was left since');
  st.cat = 'men'; D.openTeams('champ', 'eng');
  ok(st.cat === 'men', 'Championship keeps its own');
  st.pick = [{ id:'ENG', cat:'women', g:'nat.eng' }, { id:'FRA', cat:'minis', g:'nat.fra' }]; D.openTeams('quick');
  ok(st.cat === 'men', 'sides kept in two categories: the category as it is');
  // a Legend, the Full Game taken back
  fresh(); golds(10); S.setTier(null);
  D.openTeams('quick'); P.group(0, view(0).ladder.findIndex(g => g.key === 'nat.eng') - view(0).gi); P.step(0, 1);
  ok(shown(0).id === 'L03', 'England 2003 after England');
  P.set(0); P.group(1, view(1).ladder.findIndex(g => g.key === 'nat.eng') - view(1).gi); P.set(1); P.go(); D.exitMatch();
  ok(json(st.pick.map(p => p.id)) === json(['L03', 'ENG']), 'played with the Full Game, and kept');
  S.setTier('free'); S.setBought([]);
  D.openTeams('quick');
  ok(shown(0).id === 'L03' && !P.state().sides[0].set && P.state().sides[1].set && !P.ready() && P.primary() === 'Pick England 2003', `the Full Game taken back: the Legend still shown where it was, but not set, so no Kick Off (${P.primary()})`);
  P.go();
  ok(S.ui().mode === 'unlock' && S.ui().feature === 'legends' && !(T.M && !T.M.demo && T.M.nat[0].id === 'L03'), 'and its Pick opens the Unlock card, never the match');
  T.store.close(); P.state().sides[0].set = true; D.renderTeams();
  ok(P.ready() && P.kickOff() === false && S.ui().mode === 'unlock' && !(T.M && !T.M.demo && T.M.nat[0].id === 'L03'), 'Kick Off itself, both sides set, still asks for the Full Game first');
  T.store.close(); S.setTier(null); golds(0);
  // 2 Players: one title
  fresh(); D.openJoin(); D.openTeams('two');
  ok($('t-title').textContent === 'Pick Teams', '2 Players: Pick Teams');
  P.press(0); ok($('t-title').textContent === 'Pick Teams' && P.state().sides[0].set, 'and still, whoever moved last');
  P.press(1); ok($('t-title').textContent === 'Pick Teams' && P.primary() === 'Kick Off', 'both set: Kick Off under the same title');
  D.setTwo(false); D.goHome(); fresh();
}

// 7c. The lift's hint (the owner, 2026-11-11: "Keep, Show a Hint"), without a browser: a controller's only, X: Buttons on the active side
//     while no ring is lifted; none on touch or the keyboard, none in 2 Players (left as it is for now), none off the team screen. Its other
//     wording, X: Team, and its fit need layout: the browser part
{
  fresh(); D.openTeams('quick');
  D.setDev('touch'); ok(P.hintState() === null && P.hint() === null, 'touch: no hint');
  D.setDev('kb'); ok(P.hintState() === null, 'the keyboard: no hint');
  D.setDev('pad'); let h = P.hintState();
  ok(h && h.s === 0 && h.text === 'X: Buttons', `a controller: X: Buttons on Your Team's side, the active one (${json(h)})`);
  P.set(0); h = P.hintState();
  ok(h && h.s === 1 && h.text === 'X: Buttons', `Your Team set: on the Opponent's, where X would lift the ring now (${json(h)})`);
  D.openTeams('champ', 'sur'); h = P.hintState();
  ok(h && h.s === 0 && h.text === 'X: Buttons', `one side (Championship): on it (${json(h)})`);
  D.openJoin(); D.openTeams('two');
  ok(P.hintState() === null, '2 Players with a controller: no hint, as before');
  D.setTwo(false); D.goHome();
  ok(P.hintState() === null, 'off the team screen: none');
  D.setDev('touch'); fresh();
}

// 7d. The Filter (the owner, 2026-11-11: "Filter pops up with nested team list and search. Have a search icon."; the columns approved,
//     "Nice that works"), without a browser: its columns against each side's own ladder in every category and mode (Area, Country, League,
//     Teams; Mine's League column, Favourites and Recent straight to Teams, Championship's League and Teams, the clubs only for Career and
//     the setup), the side's path marked as it opens, a row filling the columns after it, every gate a pick goes through, the search (its
//     folding, matching and order, each team once, No Teams Found), a pick, Close, the steps the keys and the d-pad take, and the icon
//     (Search Teams, Search Clubs, none on a fixed list). The keys, a controller, a finger, the fit and the phone's keyboard: the browser part
{
  const NAT = id => X.NATIONS.find(n => n.id === id).name;
  const fs0 = () => P.filterState(), cols = () => fs0().cols, col = c => cols()[c];
  const heads = () => cols().map(c => c.head).join(' | '), marks = () => cols().map(c => c.kind === 'team' ? (c.cur >= 0 ? X.listName(c.rows[c.cur]) : '-') : c.rows[c.sel].name).join(' > ');
  const tname = t => (t.act ? '+' + t.name : X.listName(t));
  // the tree as the ladder says it should be, worked out here from the groups alone, and the Filter's own
  const want = L => [...new Set(L.map(g => g.hemi || 'comp'))].map(h => {
    const gs = L.filter(g => (g.hemi || 'comp') === h);
    if (h === 'fav' || h === 'recent') return `${P.PICK_HEMI[h]} ${gs[0].teams.length}`;
    if (h === 'mine') return `Mine ${gs.length} [${gs.map(g => `${g.name} ${g.teams.length}`).join(', ')}]`;
    const homes = [...new Set(gs.map(g => g.home))];
    return `${P.PICK_HEMI[h]} ${homes.length} [${homes.map(c => { const cg = gs.filter(g => g.home === c); return `${NAT(c)} ${cg.length} (${cg.map(g => `${g.name} ${g.teams.length}`).join(', ')})`; }).join(', ')}]`;
  });
  const have = L => { const root = P.filterRoot(L), leaf = n => `${n.name} ${L[n.gi].teams.length}`;
    if (root.kids[0].kind === 'league') return [root.kids.map(leaf).join(', ')];
    return root.kids.map(a => !a.kids ? leaf(a) : a.kids[0].kind === 'league' ? `${a.name} ${a.kids.length} [${a.kids.map(leaf).join(', ')}]` : `${a.name} ${a.kids.length} [${a.kids.map(c => `${c.name} ${c.kids.length} (${c.kids.map(leaf).join(', ')})`).join(', ')}]`); };
  const wantOf = L => (L.some(g => !g.hemi) ? [L.map(g => `${g.name} ${g.teams.length}`).join(', ')] : want(L));   // Championship: its groups are the League column
  fresh(); golds(10); st.fav = ['BTH', 'DUB']; st.recent = [['CDF', 'EAL'], ['FRA']];
  X.custom().push(X.cleanTeam({ name:'Herons', key:'myhe' }, 0));
  const cases = [];
  for (const cat of ['men', 'women', 'minis']) { st.cat = cat; D.openTeams('quick'); cases.push([`Quick Match ${cat}, Your Team`, view(0).ladder], [`Quick Match ${cat}, the Opponent`, view(1).ladder]); }
  st.cat = 'men'; D.openJoin(); D.openTeams('two'); cases.push(['2 Players, Player 1', view(0).ladder], ['2 Players, Player 2', view(1).ladder]); D.setTwo(false);
  D.openTeams('my'); cases.push(['My Team', view(0).ladder]);
  for (const c of ['eng', 'int', 'sur', 'cel']) { D.openTeams('champ', c); cases.push(['Championship ' + c, view(0).ladder]); }
  C.newOpen(); C.clubOpen(); cases.push(['Career', view(0).ladder]);
  for (const [what, L] of cases) {
    const w = wantOf(L), h = have(L);
    ok(json(w) === json(h), `${what}: the Filter's tree is the ladder's (${h.join(' | ').slice(0, 160)})`);
  }
  // Quick Match, Your Team on Farnham: its path marked as it opens, the columns and their counts
  fresh(); st.fav = ['BTH', 'DUB']; st.recent = [['CDF', 'EAL'], []]; D.openTeams('quick');
  ok(P.filter(0, '', { dev:'touch' }) && fs0().open && !$('m-filter').hidden && fs0().s === 0, 'the group\'s button (or the icon) opens the Filter for the side');
  ok(heads() === 'Area | Country | League | Surrey' && marks() === 'North > England > Surrey > Farnham', `Area, Country, League and Teams headed by its group, the side's own path marked: ${marks()} (${heads()})`);
  ok(json(col(0).rows.map(n => n.name)) === json(['North', 'South', 'Mine', 'Favourites', 'Recent']) && json(col(1).rows.map(n => n.name)) === json(['Ireland', 'France', 'England', 'Scotland', 'Wales', 'Italy', 'Japan']) && json(col(2).rows.map(n => n.name)) === json(['National', 'Premiership', 'Championship', 'Surrey', 'Counties']), 'the areas, the North\'s countries in ladder order, England\'s leagues: National, Premiership, Championship, Surrey, Counties');
  const box = () => $('fl-cols').innerHTML;
  ok(/aria-current="true"[^>]*aria-label="North, 7 Countries"><b>North<\/b><span class="fl-n" aria-hidden="true">7<\/span>/.test(box()) && /aria-label="England, 5 Leagues"/.test(box()) && /aria-label="Surrey, 12 Teams"/.test(box()) && /aria-label="Mine, 2 Leagues"/.test(box()) && /aria-label="Favourites, 2 Teams"/.test(box()), 'each row its count (North 7, England 5, Surrey 12, Mine 2, Favourites 2), read out with what it counts');
  ok(/<p class="fl-h" id="fl-h3">Surrey<\/p>/.test(box()) && /data-col="3" data-i="0" aria-current="true"[^>]*><span class="jw[^"]*"><span class="jersey[^>]*><\/span><\/span><span class="fl-nm"><b>Farnham<\/b><span class="gap mine">My Team<\/span><\/span><span class="fl-st"><svg class="rstars"/.test(box()), 'the Teams column: shirt, name, My Team where the card says it, stars; Farnham marked');
  ok(!/Stronger Side/.test(box()) && /<p class="fl-h" id="fl-h0">Area<\/p>/.test(box()), 'Title Case headings, and no Stronger Side tag');
  P.filterSel(0, 1);
  ok(marks() === 'South > South Africa > National > -' && col(3).rows[0].id === 'RSA', `a row of Area: its first country, that country's first league, filled (${marks()})`);
  P.filterSel(1, 2); ok(marks() === 'South > Australia > National > -', 'a country: its first league');
  P.filterSel(2, 1); ok(heads() === 'Area | Country | League | Clubs' && col(3).rows.map(tname).join() === view(0).ladder.find(g => g.key === 'aus').teams.map(tname).join(), 'a league: its teams, in the ladder\'s order, under its name');
  P.filterSel(1, 2); ok(marks() === 'South > Australia > Clubs > -', 'the row already chosen, pressed again: the columns after it kept as they are');
  P.filterSel(0, 2);
  ok(heads() === 'Area | League | Made Teams' && json(col(1).rows.map(n => n.name)) === json(['Made Teams', 'My League']) && col(2).rows.map(tname).join() === '+Create Team', `Mine: no country; its League column, Made Teams and My League (${heads()})`);
  P.filterSel(1, 1); ok(heads() === 'Area | League | My League' && col(2).rows.map(tname).join() === '+Add Your Team', 'My League: Add Your Team, as the card offers it');
  P.filterSel(0, 3); ok(heads() === 'Area | Favourites' && col(1).rows.map(tname).join() === 'Bath,Dublin', 'Favourites: straight to the teams starred');
  P.filterSel(0, 4); ok(heads() === 'Area | Recent' && col(1).rows.map(tname).join() === 'Cardiff,Ealing', 'Recent: straight to that side\'s last picks');
  // the side's path on arrival, wherever it is
  P.filterShut(); P.group(0, view(0).ladder.findIndex(g => g.key === 'recent') - view(0).gi); P.step(0, 1); P.filter(0, '', { dev:'touch' });
  ok(marks() === 'Recent > Ealing', `Your Team on Recent's Ealing: Recent, Ealing marked (${marks()})`);
  P.filterShut(); P.group(0, view(0).ladder.findIndex(g => g.key === 'mine.league') - view(0).gi); P.filter(0, '', { dev:'touch' });
  ok(marks() === 'Mine > My League > Add Your Team' && col(2).rows[0].act === 'import', `on Add Your Team: Mine, My League, it marked (${marks()})`);
  P.filterShut(); D.openTeams('quick'); P.filter(1, '', { dev:'touch' });
  ok(marks() === 'North > England > Surrey > Wimbledon' && !col(3).rows.some(t => t.id === 'FAR'), 'the Opponent\'s: Wimbledon marked, and Your Team\'s Farnham nowhere in it (Pick Opponent\'s lock)');
  ok(!P.filterSearch(view(1).ladder, 'farn').length && P.filterSearch(view(0).ladder, 'farn')[0].t.id === 'FAR', 'nor found by its search');
  P.filterShut();
  // Championship: a League column (its competition, Made Teams) and Teams; Career and the setup: the clubs only, Search Clubs
  D.openTeams('champ', 'eng'); P.filter(0, '', { dev:'touch' });
  ok(heads() === 'League | England' && json(col(0).rows.map(n => n.name)) === json(['England', 'Made Teams']) && marks() === 'England > Bath' && col(1).rows.map(tname).join() === X.ENGLAND.map(t => t.name).join(), `Championship: League (England, Made Teams) and its Teams, My Team's Bath... marked where it is (${marks()})`);
  P.filterSel(0, 1); ok(col(1).rows.map(tname).join() === '+Create Team,+Add Your Team', 'its Made Teams: Create Team and Add Your Team (none made yet)');
  ok(P.findWord() === 'Teams' && $('fl-q').placeholder === 'Search Teams', 'Search Teams');
  P.filterShut(); C.newOpen(); C.clubOpen(); P.filter(0, '', { dev:'touch' });
  ok(P.findWord() === 'Clubs' && $('fl-q').placeholder === 'Search Clubs' && $('t-find').hidden === false, 'Career\'s Change Club: Search Clubs');
  const walked = [], walk = c => { const k = col(c); if (k.kind === 'team') { walked.push(...k.rows); return; } for (let i = 0; i < k.rows.length; i++) { P.filterSel(c, i); walk(c + 1); } };
  walk(0);
  ok(walked.length > 100 && walked.every(t => !t.act && !t.legend && !X.isNation(t)) && !P.filterSearch(view(0).ladder, 'eng').some(h => X.isNation(h.t)), `every column of Career's: clubs only, no nation, Legend, Create Team or Add Your Team (${walked.length} rows), and its search the same`);
  P.filterType('zzq'); ok(/<p class="fl-none">No Clubs Found<\/p>/.test($('fl-res').innerHTML), 'no match: No Clubs Found');
  P.filterShut(); C.set(null);
  T.profile.open(); T.profile.answer('adult'); T.profile.answer('male');
  ok(D.pickMode() === 'setup' && P.filter(0, '', { dev:'touch' }) && P.findWord() === 'Clubs' && cols().every(k => k.kind !== 'team' || k.rows.every(t => t.act || !X.isNation(t))), 'the setup\'s Club: Search Clubs, the clubs only');
  P.filterShut(); D.goHome();
  // fixed lists: no Filter, no icon, no group button
  for (const c of ['world', 'tour']) { D.openTeams('champ', c); ok(!P.filterable(view(0)) && !P.filter(0, '', { dev:'touch' }) && !fs0().open && $('t-find').hidden && !P.panel(0).includes('data-act="sheet"'), `the ${c === 'world' ? 'World Cup' : 'tour'}: a fixed list, no Filter, no icon, no group button`); }
  D.openTeams('quick'); ok(!$('t-find').hidden && P.findWord() === 'Teams', 'Quick Match: the icon, Search Teams');
  // the search: folded, matched and ordered, each team once
  fresh(); st.fav = ['BTH']; st.recent = [['BTH'], []]; D.openTeams('quick'); P.filter(0, 'ba', { dev:'touch' });
  const L0 = view(0).ladder, hits = q => P.filterSearch(L0, q), ids = q => hits(q).map(h => h.t.id);
  ok($('fl-cols').hidden && !$('fl-res').hidden && fs0().hits.length === hits('ba').length && /data-r="0"[^>]*><span class="jw[^"]*"><span class="jersey[^>]*><\/span><\/span><span class="fl-nm"><b>Bayonne<\/b><small>North · France · Top 14<\/small><\/span><span class="fl-st"><svg class="rstars"/.test($('fl-res').innerHTML), 'typing swaps the columns for one list: shirt, name, its path (North · France · Top 14), stars');
  ok(ids('ba').slice(0, 2).join() === 'BAY,BTH' && hits('ba').every((h, k, a) => !k || a[k - 1].r <= h.r) && hits('ba').filter(h => h.r === 0).length === 2, `"ba": the names that start with it first, in ladder order (Bayonne, Bath), then those holding it (${hits('ba').map(h => X.listName(h.t)).join(', ')})`);
  ok(ids('north').slice(0, 2).join() === 'NTH,LNO' && hits('north')[1].r === 1, `"north": Northampton (starts), then London North (a word starts) (${hits('north').slice(0, 4).map(h => X.listName(h.t)).join(', ')})`);
  ok(ids('BÁTH').join() === 'BTH' && ids('  bath ').join() === 'BTH' && ids('mOntÀuBan').join() === 'MTB', 'case and accents folded: BÁTH, mOntÀuBan');
  const prem = hits('Premiership');
  ok(prem.length === 20 && prem.slice(0, 10).every(h => h.path === 'North · England · Premiership') && prem.slice(10).every(h => h.path === 'North · Scotland · Premiership') && prem.every(h => h.r === 3), 'a group\'s name: "Premiership" lists both Premierships\' clubs, England\'s then Scotland\'s');
  const eng = hits('eng');
  ok(eng[0].t.id === 'ENG' && eng[0].r === 0 && eng.slice(1).every(h => h.r >= 3) && eng.some(h => h.t.id === 'FAR') && eng.findIndex(h => h.t.id === 'BTH') < eng.findIndex(h => h.t.id === 'FAR'), 'a country\'s name: "eng" has England, then England\'s clubs in ladder order');
  ok(hits('bath').length === 1 && hits('bath')[0].path === 'North · England · Premiership', 'each team once: Bath, starred and recent too, under its own group');
  const urc = hits('united');
  ok(urc.length === X.CELTIC.length + 4 && urc.every(h => h.r === 3 && / · URC$/.test(h.path)) && ['DUB', 'CDF', 'EDI', 'TRE'].every(id => urc.some(h => h.t.id === id)) && json(ids('United Rugby Championship')) === json(ids('united')), `a group called by its competition's short name found by its full one: "united" lists the URC's clubs, South Africa's four too, each under its URC (${urc.length})`);
  ok(ids('english').slice(0, 10).join() === view(0).ladder.find(g => g.key === 'eng').teams.map(t => t.id).join() && ids('english').length === 23, 'and "english": the English Premiership\'s clubs, then the English Championship\'s');
  X.custom().push(X.cleanTeam({ name:'Béziers', key:'mybz' }, 0)); D.renderTeams();
  ok(P.filterSearch(view(0).ladder, 'bez').map(h => h.path).join() === 'Mine · Made Teams', 'a team made with an accent found without it (Béziers for "bez"), under Mine · Made Teams');
  ok(!hits('create').length && !hits('add your').length, 'Create Team and Add Your Team are not teams to find');
  P.filterType('zzq'); ok(!fs0().hits.length && /<p class="fl-none">No Teams Found<\/p>/.test($('fl-res').innerHTML) && $('fl-said').textContent === 'No Teams Found', 'nothing: No Teams Found, said to a screen reader too');
  P.filterType('bath'); ok($('fl-said').textContent === '1 Team', 'one: 1 Team');
  P.filterType(''); ok(!$('fl-cols').hidden && $('fl-res').hidden && marks() === 'North > England > Surrey > Farnham', 'cleared: the columns again, as they were');
  P.filterShut(); X.custom().length = 0;
  // the dialog named for its side; 2 Players: only that side's seat drives it while it is open (navOnly), both again once it shuts
  { const fm = $('m-filter'), fa = {}; fm.setAttribute = (k, val) => { fa[k] = String(val); }; fm.getAttribute = k => (k in fa ? fa[k] : null);
    fresh(); D.openTeams('quick'); P.filter(0, '', { dev:'touch' }); const a0 = fm.getAttribute('aria-label'); P.filterShut(); P.filter(1, '', { dev:'touch' }); const a1 = fm.getAttribute('aria-label'); P.filterShut();
    D.openJoin(); D.openTeams('two'); P.filter(1, '', { dev:'touch' }); const a2 = fm.getAttribute('aria-label'), only = D.navOnly(); D.renderTeams(); const kept = D.navOnly(); P.filterClose(); const after = D.navOnly();
    P.filter(0, '', { dev:'touch' }); const only0 = D.navOnly(); P.filterShut(); D.setTwo(false); D.goHome();
    ok(a0 === 'Your Team' && a1 === 'Opponent' && a2 === 'Player 2', `the Filter is a dialog named for its side: ${a0}, ${a1}, ${a2} in 2 Players`);
    ok(only === 1 && kept === 1 && after === null && only0 === 0, `2 Players: Player 2's Filter answers Player 2's seat only (navOnly ${only}, ${kept} through a redraw), both seats again once it closes (${after}); Player 1's his (${only0})`); }
  // a pick: the side moved and set, on to the next side, the Filter shut; Close leaves it be
  fresh(); D.openTeams('quick'); P.filter(0, '', { dev:'touch' });
  P.filterSel(0, 1); P.filterSel(1, 1); P.filterSel(2, 1); const pickT = col(3).rows[2]; P.filterTap(3, 2);
  ok(!fs0().open && $('m-filter').hidden && shown(0) === pickT && P.state().sides[0].set && P.state().on === 1 && $('t-title').textContent === 'Pick Opponent', `a team picked: Your Team ${X.listName(pickT)}, set, on to Pick Opponent, the Filter shut`);
  P.filter(1, 'cardiff', { dev:'touch' }); P.filterPick(fs0().hits[0].gi, fs0().hits[0].i);
  ok(shown(1).id === 'CDF' && P.state().sides[1].set && P.ready() && P.primary() === 'Kick Off', 'a match picked: the Opponent Cardiff, set; Kick Off');
  P.filter(0, '', { dev:'touch' }); P.filterSel(0, 0); P.filterSel(1, 0); const was = [view(0).gi, view(0).i, P.state().sides[0].set];
  P.filterClose(); ok(!fs0().open && json([view(0).gi, view(0).i, P.state().sides[0].set]) === json(was) && P.ready(), 'Close: the side as it was, still set');
  // each gate a pick goes through
  fresh(); golds(10); S.setTier('free'); S.setBought([]); D.openTeams('quick');
  P.filter(0, 'england 2003', { dev:'touch' }); const leg = fs0().hits[0];
  ok(leg.t.id === 'L03' && leg.path === 'North · England · National', 'a Legend found, under its nation\'s National');
  P.filterPick(leg.gi, leg.i);
  ok(S.ui().mode === 'unlock' && S.ui().feature === 'legends' && shown(0).id === 'L03' && !P.state().sides[0].set && !fs0().open, 'a Legend picked without the Full Game: the Unlock card (storeGate), the side on it, not set');
  T.store.close();
  P.filter(0, '', { dev:'touch' }); P.filterSel(0, 2); P.filterTap(2, 0);
  ok(S.ui().mode === 'unlock' && S.ui().feature === 'create', 'Create Team on the free tier: the Unlock card');
  T.store.close(); P.filter(0, '', { dev:'touch' }); P.filterSel(0, 2); P.filterSel(1, 1); P.filterTap(2, 0);
  ok(S.ui().mode === 'unlock' && S.ui().feature === 'import', 'Add Your Team: its Unlock card too');
  T.store.close(); S.setTier(null); golds(0);
  D.openTeams('quick'); P.filter(0, '', { dev:'touch' }); P.filterSel(0, 2); P.filterTap(2, 0);
  ok(!$('s-build').hidden && !fs0().open, 'with the Full Game: Create Team opens the builder');
  T.sidesOf.saveBuilder();
  ok(shown(0).custom && P.state().sides[0].set && P.state().on === 1, 'and the team made is Your Team, set, the Opponent next, as from the card');
  for (let i = 0; i < 3; i++) X.custom().push(X.cleanTeam({ name:'Made ' + i, key:'mym' + i }, i + 1));
  D.renderTeams(); P.filter(0, '', { dev:'touch' }); P.filterSel(0, 2);
  ok(col(2).rows.length === 4 && !col(2).rows.some(t => t.act), 'four made (MAX_CUSTOM): no Create Team in the Filter either');
  P.filterShut(); X.custom().length = 0;
  D.openTeams('quick'); P.filter(0, '', { dev:'touch' }); P.filterSel(0, 2); P.filterSel(1, 1); P.filterTap(2, 0);
  ok(!$('m-import').hidden && !fs0().open, 'Add Your Team opens the import card');
  $('m-import').hidden = true;
  // one side: Championship plays as the team picked, Career takes the club
  fresh(); D.openTeams('champ', 'eng'); P.filter(0, 'leicester', { dev:'touch' }); P.filterPick(fs0().hits[0].gi, fs0().hits[0].i);
  ok(X.champ() && X.champ().teams[0].id === 'LEI', 'Championship: a team picked there plays it, as Play as does');
  X.setChamp(null); C.newOpen(); C.clubOpen(); P.filter(0, 'limerick', { dev:'touch' }); P.filterPick(fs0().hits[0].gi, fs0().hits[0].i);
  ok(C.draft().club.id === 'LIM' && C.draft().league === 'cel', 'Career: a club picked there is his, its group\'s whole list its league (the URC)');
  C.set(null); D.goHome();
  // the steps the keys and the d-pad take (the browser checks them on real rows)
  fresh(); D.openTeams('quick'); P.filter(0, '', { dev:'touch' });
  const row = (c, i) => ({ dataset:{ col:String(c), i:String(i) } }), TOP = { top:1 };
  ok(P.filterStep(row(2, 3), 0, 1, TOP) !== undefined && fs0().path.join() === '0,2,4' && col(3).head === 'Counties', 'Down in League: Counties chosen, its teams filled');
  ok(P.filterStep(row(0, 0), 0, -1, TOP) === TOP && P.filterStep(row(3, 0), 0, -1, TOP) === TOP, 'Up from a column\'s first row: to the top (the field, or Close for a controller)');
  ok(P.filterStep(row(0, 4), 0, 1, TOP) === null && P.filterStep(row(0, 0), -1, 0, TOP) === null && P.filterStep(row(3, 0), 1, 0, TOP) === null, 'no further at the ends: nothing');
  P.filterStep(row(1, 2), 0, 1, TOP); ok(fs0().path.join() === '0,3,0' && col(3).head === 'National', 'Down in Country: Scotland, on its first league');
  P.filterShut();
  // the field's resting edge reads as a field: 3:1 or more against the card and its own ground (WCAG 1.4.11), the chalk ring when focused
  { const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8'), tok = n => (css.match(new RegExp(`--${n}:(#[0-9a-f]{6})`)) || [])[1];
    const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)/255).map(v => (v <= 0.03928 ? v/12.92 : ((v + 0.055)/1.055) ** 2.4)); return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]; };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05)/(Math.min(x, y) + 0.05); };
    const edge = (css.match(/\.fl-field\{[^}]*border:1\.5px solid var\(--([a-z-]+)\)/) || [])[1], e = tok(edge), r1 = ratio(e, tok('panel')), r2 = ratio(e, tok('night'));
    ok(edge === 'rule-in' && r1 >= 3 && r2 >= 3 && /\.fl-field:focus-within\{border-color:var\(--chalk\)/.test(css), `the Search field's edge at rest: ${edge} ${e}, ${r1.toFixed(2)}:1 on the card and ${r2.toFixed(2)}:1 on its ground; the chalk when focused`); }
  fresh();
}

// 8. Nothing drawn at random; GAME_VERSION
{
  fresh();
  const before = rndCalls();
  for (const m of ['quick', 'two', 'my']) { D.openTeams(m); for (let k = 0; k < 40; k++) { P.group(0, 1); P.step(0, 1); if (m !== 'my') P.step(1, 1); } }
  for (const c of ['eng', 'int', 'world', 'tour']) D.openTeams('champ', c);
  D.openTeams('quick'); for (const s of [0, 1]) { P.filter(s, '', { dev:'touch' }); for (let k = 0; k < 5; k++) { P.filterSel(0, k); P.filterSel(1, 0); } for (const q of ['b', 'ba', 'Premiership', 'zz', '']) P.filterType(q); P.filterClose(); }
  P.filter(0, 'bath', { dev:'touch' }); P.filterPick(P.filterState().hits[0].gi, P.filterState().hits[0].i);
  ok(rndCalls() === before, `the team screen and its Filter draw no random number (${rndCalls() - before})`);
  ok(T.GAME_VERSION === '1.6' && $('ver').textContent === 'Version 1.6', 'GAME_VERSION is 1.6 (1.2 the side-by-side picker, 1.3 the profile, 1.4 the Filter and fewer knock-ons, 1.5 Settings, goal kicks and the stick, 1.6 the possession calls and the kick chase), on window.__tryline and at the foot of Settings');
  const src = readGameSource();
  ok((src.match(/\bconst GAME_VERSION\b/g) || []).length === 1 && src.includes("const GAME_VERSION = '1.6';") && /<p class="ver" id="ver">Version 1\.6<\/p>/.test(src), 'one constant (main\'s 1.1 from PR #17 merged away, not declared twice), and the line in Settings');
  ok(!/id="home-tag"|\$\('home-tag'\)/.test(src), 'and no home tagline for it: PR #17\'s v1.1 line went with the tidied home, so nothing writes to an element that is not there');
  ok(!/[←-⇿⟵-⟿]/.test(src.slice(src.indexOf('<section class="screen" id="s-teams"'), src.indexOf('<section class="screen" id="s-build"'))), 'no arrow glyph on the team screen');
  fresh();
}

await browserChecks();
console.log(`Picker: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;

function chromium() {
  const require = createRequire(import.meta.url);
  for (const from of [() => require('playwright'), () => require(path.join(execFileSync('npm', ['root', '-g'], { stdio:['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright'))]) {
    try { return from().chromium; } catch (e) { /* not here */ }
  }
  return null;
}
// 9. In Chromium: every size, every state
async function browserChecks() {
  if (process.env.GAME || process.env.NO_BROWSER) { console.log('skip the browser checks (GAME or NO_BROWSER set)'); return; }
  const chrome = chromium();
  if (!chrome) { console.log('skip the browser checks: Playwright is not installed (npm i -g playwright && npx playwright install chromium)'); return; }
  let browser;
  try { browser = await chrome.launch(); } catch (e) { console.log('skip the browser checks: Chromium would not start (' + e.message.split('\n')[0] + ')'); return; }
  const dir = fileURLToPath(new URL('../', import.meta.url));
  const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.png':'image/png', '.webmanifest':'application/manifest+json', '.json':'application/json' };
  const server = http.createServer((req, res) => {
    const file = path.resolve(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type':TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  const SAVE = { settings:{ tut:['past', 'pass', 'tackle', 'block', 'scrum', 'lineout', 'goal', 'drop', 'maul'], coach:false, played:5 } };
  const SIZES = [[844, 390], [667, 375], [844, 340], [667, 320], [568, 320]];
  try {
    for (const [w, h] of SIZES) {
      const at = `${w}x${h}`;
      for (const reduce of [false, true]) {
        if (reduce && w !== 667) continue;
        const ctx = await browser.newContext({ viewport:{ width:w, height:h }, hasTouch:true, reducedMotion:reduce ? 'reduce' : 'no-preference' });
        await ctx.addInitScript(s => { try { localStorage.setItem('tryline.v1', s); } catch (e) { /* none */ } }, JSON.stringify(SAVE));
        const page = await ctx.newPage();
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        await page.goto(base);
        await page.waitForFunction(() => window.__tryline && !document.getElementById('s-home').hidden);
        await page.evaluate(() => document.fonts && document.fonts.ready);
        if (!reduce) {
          // fit: every group on both sides, and every side of every group on the left, in Quick Match, each category; then each one-side mode
          const fit = await page.evaluate(() => {
            const T = window.__tryline, P = T.picker, $ = id => document.getElementById(id), scr = $('s-teams'), bad = [];
            const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top >= -0.5 && r.bottom <= innerHeight + 0.5 && r.left >= -0.5 && r.right <= innerWidth + 0.5; };
            const small = () => [...scr.querySelectorAll('button')].filter(b => !b.hidden && !b.closest('[hidden]') && b.getBoundingClientRect().width > 0).filter(b => { const r = b.getBoundingClientRect(); return r.height < 43.5 || r.width < 43.5; }).map(b => b.textContent.trim() || b.getAttribute('aria-label'));
            const over = () => [...scr.querySelectorAll('.tname,.pk-league,.pk-st .lbl')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent);
            const check = what => {
              const one = P.one(), parts = [$('t-side0'), $('t-go'), $('t-back'), ...(one ? [] : [$('t-side1'), $('t-v')])];
              if (scr.scrollHeight > scr.clientHeight + 0.5) bad.push(`${what}: scrolls ${scr.scrollHeight - scr.clientHeight}px`);
              const out = parts.filter(p => !vis(p)).map(p => p.id); if (out.length) bad.push(`${what}: out of view ${out.join(' ')}`);
              const s = small(); if (s.length) bad.push(`${what}: under 44px ${s.join(', ')}`);
              const o = over(); if (o.length) bad.push(`${what}: cut ${o.join(', ')}`);
              const l = laps(); if (l.length) bad.push(`${what}: overlapping ${l.join(', ')}`);
            };
            // overlaps: Stronger Side (or any tag) and the name under Edit; the overall's badge on the bars or their names; traits cut
            // mid-word (their box overflowing); a context line starting with its dot (the dot not clipped off at a line's start)
            const hit = (a, b, m = 0.5) => { const x = a.getBoundingClientRect(), y = b.getBoundingClientRect(); return Math.min(x.right, y.right) - Math.max(x.left, y.left) > m && Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > m; };
            const text = el => { const r = document.createRange(); r.selectNodeContents(el); return r; };
            const textHit = (el, b) => { const x = text(el).getBoundingClientRect(), y = b.getBoundingClientRect(); return x.width > 0 && Math.min(x.right, y.right) - Math.max(x.left, y.left) > 0.5 && Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > 0.5; };
            const laps = () => {
              const out = [];
              for (const side of scr.querySelectorAll('.pk-side:not([hidden])')) {
                const edit = side.querySelector('.pk-edit'), ovr = side.querySelector('.pk-pick .ovr'), stats = side.querySelector('.pk-stats');
                if (edit) for (const el of side.querySelectorAll('.tname,.pk-rate .gap,.pk-league,.tstars')) if (textHit(el, edit)) out.push(side.id + ' ' + el.className + ' under Edit');
                if (ovr && stats) for (const el of stats.querySelectorAll('.lbl,.pk-bar')) if (hit(ovr, el)) { out.push(side.id + ' the overall on the bars'); break; }
                for (const el of side.querySelectorAll('.tstars')) if (el.scrollHeight > el.clientHeight + 0.5) out.push(side.id + ' traits cut');
                const ctx = side.querySelector('.pk-ctx'), parts = ctx ? [...ctx.querySelectorAll(':scope > span > span')] : [];
                let top = null; for (const p of parts) { const r = p.getBoundingClientRect(); if (top == null || Math.abs(r.top - top) > 2) { if (r.left > ctx.getBoundingClientRect().left - 2 && top != null) out.push(side.id + ' a line starting with its dot'); top = r.top; } }
              }
              return out;
            };
            let n = 0;
            // the longest of everything: every Legend (six traits at most), a made team's longest name, a My League side, Favourites and Recent
            T.locker.set(T.locker.fresh()); T.locker.FEATS.filter(f => f.id !== 'star').slice(0, 10).forEach(f => { T.locker.state().n[f.id] = 10; });
            T.teams.custom().push(T.teams.cleanTeam({ name:'Wolverhampton Ab', key:'mylong', pace:5, power:5, handling:5, kicking:5, stamina:1 }, 0));
            T.importer.setLeague({ teams:[{ key:'lg-BRN', id:'BRN', name:'Bournemouth Oaks', kit:'#112233', trim:'#445566', pace:3, power:3, handling:3, kicking:3, stamina:3 }] });
            const s = T.debug.settings(); s.fav = ['L15', 'W25', 'JHB', 'BLM', 'mylong']; s.recent = [['L23', 'CHC'], ['W17', 'GUI']];
            for (const cat of ['men', 'women', 'minis']) {
              T.debug.settings().cat = cat; T.debug.openTeams('quick');
              const G = P.view(0).ladder.length;
              for (let g = 0; g < G; g++) {
                const k = P.view(0).group.teams.length;
                for (let i = 0; i < k; i++) { check(`${cat} ${P.view(0).group.key} ${i}`); n++; P.step(0, 1); P.step(1, 1); }
                P.group(0, 1); P.group(1, 1);
              }
            }
            T.debug.settings().cat = 'men';
            for (const c of ['eng', 'int', 'cel', 'my', 'world', 'tour']) { T.debug.openTeams('champ', c); for (let i = 0; i < P.view(0).group.teams.length; i++) { check(`champ ${c} ${i}`); n++; P.step(0, 1); } }
            T.debug.openTeams('my'); for (let g = 0; g < P.view(0).ladder.length; g++) { check(`my ${P.view(0).group.key}`); n++; P.group(0, 1); }
            T.career.newOpen(); T.career.clubOpen(); for (let g = 0; g < P.view(0).ladder.length; g++) { check(`career ${P.view(0).group.key}`); n++; P.group(0, 1); }
            // the Filter in the same states: every row of every column of each side's and each mode's, its marks on arrival for every group
            // a side can be on, and the matches; the card in view, no page scroll, no label cut, every target 44px, the stars whole
            const fl = $('m-filter'), flCheck = what => {
              document.getAnimations().forEach(a => a.finish());
              const c = $('fl-card').getBoundingClientRect();
              if (c.top < -0.5 || c.bottom > innerHeight + 0.5 || c.left < -0.5 || c.right > innerWidth + 0.5) bad.push(`${what}: the Filter out of view`);
              if (document.documentElement.scrollHeight > innerHeight + 0.5 || document.documentElement.scrollWidth > innerWidth + 0.5) bad.push(`${what}: the page scrolls`);
              for (const e of fl.querySelectorAll('.fl-r b, .fl-h, .fl-nm small')) if (e.getClientRects().length && e.scrollWidth > e.clientWidth + 0.5) bad.push(`${what}: ${e.textContent} cut`);
              for (const b of fl.querySelectorAll('button, .fl-field')) { const r = b.getBoundingClientRect(); if (r.width && (r.height < 43.5 || r.width < 43.5)) bad.push(`${what}: ${b.textContent.trim() || b.className} under 44px`); }
              for (const st of fl.querySelectorAll('.fl-t .rstars')) { const a = st.getBoundingClientRect(), row = st.closest('.fl-r').getBoundingClientRect(); if (a.right > row.right + 0.5 || a.left < row.left - 0.5 || a.bottom > row.bottom + 0.5) bad.push(`${what}: stars cut`); }
              for (const l of fl.querySelectorAll('.fl-list, .fl-res')) if (l.getClientRects().length && l.scrollHeight > l.clientHeight + 0.5 && getComputedStyle(l).overflowY !== 'auto') bad.push(`${what}: a column that does not scroll itself`);
            };
            const flWalk = (what, c) => { const col = P.filterState().cols[c]; if (col.kind === 'team') { flCheck(what); n++; return; } for (let i = 0; i < col.rows.length; i++) { P.filterSel(c, i); flWalk(what + ' ' + col.rows[i].name, c + 1); } };
            const arrive = what => {                         // as it opens: each column's mark in its view, the side's team marked with its stars whole
              flCheck(what); n++;
              for (const m of fl.querySelectorAll('#fl-cols [aria-current="true"]')) { const r = m.getBoundingClientRect(), l = m.parentNode.getBoundingClientRect(); if (r.top < l.top - 0.5 || r.bottom > l.bottom + 0.5) bad.push(`${what}: ${m.textContent} marked out of its column's view`); }
              const cols = P.filterState().cols, last = cols[cols.length - 1];
              if (last.cur < 0 || !fl.querySelector(`#fl-cols [data-col="${cols.length - 1}"][data-i="${last.cur}"][aria-current="true"]`)) bad.push(`${what}: the side's team not marked`);
            };
            for (const cat of ['men', 'women']) {
              T.debug.settings().cat = cat; T.debug.openTeams('quick');
              for (const side of [0, 1]) { P.filter(side, '', { dev:'touch' }); flWalk(`Filter ${cat} ${side}`, 0); P.filterShut(); }
              for (let g = 0; g < P.view(0).ladder.length; g++) { P.step(0, P.view(0).group.teams.length - 1); P.filter(0, '', { dev:'touch' }); arrive(`Filter on ${cat} ${P.view(0).group.key}`); P.filterShut(); P.group(0, 1); }
            }
            T.debug.settings().cat = 'men';
            for (const c of ['eng', 'int', 'cel']) { T.debug.openTeams('champ', c); P.filter(0, '', { dev:'touch' }); flWalk('Filter champ ' + c, 0); P.filterShut(); }
            T.debug.openTeams('my'); P.filter(0, '', { dev:'touch' }); flWalk('Filter my', 0); P.filterShut();
            T.career.newOpen(); T.career.clubOpen(); P.filter(0, '', { dev:'touch' }); flWalk('Filter career', 0); P.filterShut();
            T.debug.openTeams('quick'); for (const q of ['ba', 'a', 'Premiership', 'zzq', 'new zealand 19']) { P.filter(0, q, { dev:'touch' }); flCheck('search ' + q); n++; P.filterShut(); }
            // the icon in the top bar: in every mode beside the title and the rest, nothing on anything, nothing off the side
            for (const m of ['quick', 'two', 'my', 'career', 'setup', 'champ']) {
              if (m === 'career') { T.career.set(null); T.career.newOpen(); T.career.clubOpen(); } else if (m === 'setup') { T.profile.open(); T.profile.answer('adult'); T.profile.answer('male'); } else if (m === 'champ') T.debug.openTeams('champ', 'eng'); else if (m === 'two') { T.debug.openJoin(); T.debug.openTeams('two'); } else T.debug.openTeams(m);
              const kids = [...document.querySelector('#s-teams .pk-top').children].filter(e => !e.hidden && e.getBoundingClientRect().width), rs = kids.map(e => e.getBoundingClientRect()), nm = document.querySelector('#s-teams .pk-name');
              for (let i = 1; i < rs.length; i++) if (rs[i].left < rs[i - 1].right - 0.5) bad.push(`top bar ${m}: ${kids[i].id || kids[i].className} on ${kids[i - 1].id || kids[i - 1].className}`);
              if (nm.scrollWidth > nm.clientWidth + 1 || rs.some(r => r.right > innerWidth + 0.5)) bad.push(`top bar ${m}: the title or a button cut`);
              if (!kids.includes($('t-find'))) bad.push(`top bar ${m}: no search icon`);
            }
            T.debug.setTwo(false); T.debug.goHome();
            return { bad, n };
          });
          ok(fit.bad.length === 0 && fit.n > 700, `${at}: every state fits with no scroll, both sides, the V, the primary and Back in view, every target 44px or more, no name or bar label cut; the Filter in every state of every mode (each column's every row, its marks on arrival for every group, the matches) in view with no page scroll, no label cut, every target 44px, the stars whole; the icon in the top bar of every mode, on nothing (${fit.n} states${fit.bad.length ? ': ' + fit.bad.slice(0, 6).join('; ') : ''})`);
          // the keyboard: the arrows on the side with the focus, Page Down a country, Tab to the next control, Enter sets and moves on
          await page.evaluate(() => { const T = window.__tryline; T.debug.settings().pick = [null, null]; T.debug.openTeams('quick'); });
          await page.focus('#t-side0 .pk-pick');
          await page.keyboard.press('ArrowRight');
          let k = await page.evaluate(() => ({ i:window.__tryline.picker.view(0).i, focus:document.activeElement.dataset.act, side:document.activeElement.closest('.pk-side') && document.activeElement.closest('.pk-side').id }));
          ok(k.i === 1 && k.focus === 'pick' && k.side === 't-side0', `${at}: Right on Your Team's card: its next side, the focus kept on the card (${json(k)})`);
          await page.keyboard.press('ArrowDown'); await page.keyboard.press('PageDown');
          k = await page.evaluate(() => window.__tryline.picker.view(0).group.key);
          ok(k === 'nat.sco', `${at}: Down then Page Down: Counties, then Scotland (${k})`);
          await page.keyboard.press('Enter');
          k = await page.evaluate(() => ({ set:window.__tryline.picker.state().sides[0].set, side:document.activeElement.closest('.pk-side') && document.activeElement.closest('.pk-side').id, act:document.activeElement.dataset.act }));
          ok(k.set && k.side === 't-side1' && k.act === 'pick', `${at}: Enter sets Your Team and the focus moves on to the Opponent (${json(k)})`);
          const before = await page.evaluate(() => window.__tryline.picker.view(1).group.key);
          await page.keyboard.press('ArrowDown');
          k = await page.evaluate(() => ({ g:window.__tryline.picker.view(1).group.key, left:window.__tryline.picker.view(0).group.key }));
          ok(k.g !== before && k.left === 'nat.sco', `${at}: the arrows now act on the Opponent (${before} to ${json(k)})`);
          await page.keyboard.press('Enter');
          k = await page.evaluate(() => ({ id:document.activeElement.id, text:document.activeElement.textContent }));
          ok(k.id === 't-go' && k.text === 'Kick Off', `${at}: Enter again: the focus on Kick Off (${json(k)})`);
          await page.keyboard.press('Shift+Tab');
          const k1 = await page.evaluate(() => document.activeElement.id);
          await page.keyboard.press('Shift+Tab');
          k = await page.evaluate(() => ({ side:document.activeElement.closest('.pk-side') && document.activeElement.closest('.pk-side').id, act:document.activeElement.dataset.act }));
          await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
          const k2 = await page.evaluate(() => document.activeElement.id);
          ok(k1 === 't-back' && k.side === 't-side1' && k2 === 't-go', `${at}: Tab follows the screen: back from Kick Off is Back (on its left), then the Opponent's side, and on again through Back to Kick Off (${k1} ${json(k)} ${k2})`);
          // a controller: the ring on a card drives it, A moves on, a shoulder a country, B Back
          k = await page.evaluate(() => {
            const T = window.__tryline, P = T.picker; T.debug.settings().pick = [null, null]; T.debug.openTeams('quick'); T.home.ring(null);
            const first = T.navMove(0, 0, 0), out = { first:first && first.dataset.act + (first.closest('.pk-side') || {}).id };
            T.navMove(0, 1, 0); out.right = P.view(0).i;
            T.navMove(0, 0, 1); out.down = P.view(0).group.key;
            const pads = [{ index:0, mapping:'standard', connected:true, axes:[0, 0], buttons:Array.from({ length:17 }, () => ({ pressed:false, value:0 })) }];
            navigator.getGamepads = () => pads; T.debug.padConnected(pads[0]);
            pads[0].buttons[5] = { pressed:true, value:1 }; T.pollPads(); pads[0].buttons[5] = { pressed:false, value:0 }; T.pollPads();
            out.rb = P.view(0).group.key;
            pads[0].buttons[4] = { pressed:true, value:1 }; T.pollPads(); pads[0].buttons[4] = { pressed:false, value:0 }; T.pollPads();
            out.lb = P.view(0).group.key;
            T.navPress(0); out.a1 = P.state().sides[0].set && T.debug.focus() && (T.debug.focus().closest('.pk-side') || {}).id;
            T.navPress(0); out.a2 = T.debug.focus() && T.debug.focus().id;
            T.navMove(0, 0, -1); out.up = T.debug.focus() && (T.debug.focus().dataset.act || T.debug.focus().dataset.cat || T.debug.focus().id);
            T.navBack(0); out.back = !document.getElementById('s-home').hidden;
            return out;
          });
          ok(k.first === 'pickt-side0' && k.right === 1 && k.down === 'cty' && k.rb === 'nat.sco' && k.lb === 'nat.eng', `${at}: a controller's first press on Your Team's card; Right a team, Down a group, RB the next country, LB back (${json(k)})`);
          ok(k.a1 === 't-side1' && k.a2 === 't-go' && k.up && k.back, `${at}: A sets the side and moves on (the Opponent, then Kick Off), Up from Kick Off moves the ring on as anywhere, B goes back (${json(k)})`);
          // a finger: a swipe across a card and up it, Previous and Next, the sheet
          await page.evaluate(() => { const T = window.__tryline; T.debug.settings().pick = [null, null]; T.debug.openTeams('quick'); });
          const cdp = await ctx.newCDPSession(page);
          const box = await page.evaluate(() => { const r = document.querySelector('#t-side0 .pk-card').getBoundingClientRect(); return { x:r.left + r.width/2, y:r.top + r.height/2 }; });
          const drag = async (dx, dy) => {
            await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:box.x, y:box.y }] });
            for (let s = 1; s <= 6; s++) await cdp.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{ x:box.x + dx*s/6, y:box.y + dy*s/6 }] });
            await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
            await page.waitForTimeout(450);
          };
          await drag(-90, 4);
          k = await page.evaluate(() => ({ i:window.__tryline.picker.view(0).i, set:window.__tryline.picker.state().sides[0].set, sh:document.getElementById('s-teams').scrollTop }));
          ok(k.i === 1 && !k.set && k.sh === 0, `${at}: a finger's swipe left: the next team, nothing set, nothing scrolled (${json(k)})`);
          await drag(4, 80);
          k = await page.evaluate(() => window.__tryline.picker.view(0).group.key);
          ok(k === 'cty', `${at}: a swipe down the card: the next group, Next Group Down (${k})`);
          await drag(-3, -80);
          k = await page.evaluate(() => window.__tryline.picker.view(0).group.key);
          ok(k === 'sur', `${at}: and up it: the one before (${k})`);
          await drag(4, 80);
          await page.tap('#t-side0 [data-act="next"]');
          k = await page.evaluate(() => window.__tryline.picker.view(0).i);
          ok(k === 1, `${at}: Next tapped (${k})`);
          const flNow = () => page.evaluate(() => ({ open:!document.getElementById('m-filter').hidden, side:window.__tryline.picker.filterState().s, field:document.activeElement === document.getElementById('fl-q'), marks:[...document.querySelectorAll('#fl-cols [aria-current="true"]')].map(e => e.querySelector('b').textContent).join(' > ') }));
          const gap = () => page.waitForTimeout(450);          // past the double tap's guard (FL_TAP): a tap that opens or shuts the Filter eats a second by it for 400ms
          await page.tap('#t-find'); await gap();
          k = await flNow();
          ok(k.open && k.side === 0 && !k.field && k.marks === 'North > England > Counties > Wandsworth', `${at}: a finger on the search icon: the Filter for the side being set, on its path, the field not focused, so no keyboard comes up (${json(k)})`);
          await page.tap('#fl-q');
          k = await flNow();
          ok(k.open && k.field, `${at}: a tap on the field: it takes the focus (the keyboard's, on a phone) (${json(k)})`);
          await page.tap('#fl-close'); await gap();
          k = await page.evaluate(() => ({ open:!document.getElementById('m-filter').hidden, g:window.__tryline.picker.view(0).group.key, i:window.__tryline.picker.view(0).i, inert:[...document.body.children].filter(e => e.inert).length }));
          ok(!k.open && k.g === 'cty' && k.i === 1 && !k.inert, `${at}: Close: the side as it was, nothing left inert (${json(k)})`);
          await page.tap('#t-side1 [data-act="sheet"]'); await gap();
          k = await flNow();
          ok(k.open && k.side === 1 && !k.field, `${at}: the Opponent's group button: the Filter for the Opponent (${json(k)})`);
          await page.tap('#fl-close'); await gap();
          await page.tap('#t-side0 [data-act="sheet"]'); await gap();
          const tapped = [];
          for (const [c, i] of [[0, 0], [1, 0], [2, 0]]) { await page.tap(`#fl-cols [data-col="${c}"][data-i="${i}"]`); tapped.push(await page.evaluate(() => { const a = document.activeElement; return a && a.dataset.col != null ? a.dataset.col + ':' + a.dataset.i + ' ' + a.querySelector('b').textContent + (a.isConnected ? '' : ' (gone)') : a && (a.id || a.tagName); })); }
          k = await flNow();
          ok(k.open && k.marks === 'North > Ireland > National' && json(tapped) === json(['0:0 North', '1:0 Ireland', '2:0 National']), `${at}: a finger through the columns: North, Ireland, National, each filling the next, and the row tapped keeps the focus (it is not drawn again under the finger) (${json(k)} ${json(tapped)})`);
          await page.tap('#fl-cols [data-col="3"][data-i="0"]'); await gap();
          k = await page.evaluate(() => ({ g:window.__tryline.picker.view(0).group.key, i:window.__tryline.picker.view(0).i, set:window.__tryline.picker.state().sides[0].set, open:!document.getElementById('m-filter').hidden }));
          ok(k.g === 'nat.ire' && k.i === 0 && k.set && !k.open, `${at}: a team tapped there: Your Team on it and set, the Filter shut (${json(k)})`);
          // the long press on Next: a country
          const nb = await page.evaluate(() => { const r = document.querySelector('#t-side0 [data-act="next"]').getBoundingClientRect(); return { x:r.left + r.width/2, y:r.top + r.height/2 }; });
          await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[nb] });
          await page.waitForTimeout(650);
          await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
          await page.waitForTimeout(100);
          k = await page.evaluate(() => ({ g:window.__tryline.picker.view(0).group.key, i:window.__tryline.picker.view(0).i }));
          ok(k.g === 'nat.fra' && k.i === 0, `${at}: a long press on Next: the next country, and no extra step (${json(k)})`);
          // motion: opacity and transform only, 250ms or less
          k = await page.evaluate(() => { const T = window.__tryline; T.picker.group(0, 1); const a = document.getAnimations(); return a.map(x => ({ d:x.effect.getTiming().duration, props:[...new Set(x.effect.getKeyframes().flatMap(f => Object.keys(f).filter(p => !['offset', 'easing', 'composite', 'computedOffset'].includes(p))))].join() })); });
          ok(k.length >= 1 && k.every(a => a.d <= 250 && /^(opacity|transform)(,(opacity|transform))?$/.test(a.props)), `${at}: a move slides in, opacity and transform only, 250ms or less (${json(k)})`);
          // a double tap never goes through the Filter (a child's, or one tap read twice): a tap that opens it, picks a team in it or closes it
          // eats a second by it for a moment, so nothing under the finger is pressed; one aimed elsewhere at once still counts
          await page.evaluate(() => { const T = window.__tryline, P = T.picker; T.debug.settings().pick = [null, null]; T.debug.settings().cat = 'men'; T.debug.openTeams('quick'); P.set(0); P.set(1); });
          await gap();
          const mid = sel => page.evaluate(q => { const r = document.querySelector(q).getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; }, sel);
          const dbl = async ([x, y]) => { await page.touchscreen.tap(x, y); await page.waitForTimeout(120); await page.touchscreen.tap(x, y); await gap(); };
          const dnow = () => page.evaluate(() => { const T = window.__tryline, P = T.picker; return { screen:([...document.querySelectorAll('.screen')].find(e => !e.hidden) || { id:'none' }).id, open:!document.getElementById('m-filter').hidden, cat:T.debug.settings().cat, t1:P.view(1).team.id, set1:P.state().sides[1].set, field:document.activeElement === document.getElementById('fl-q') }; });
          await dbl(await mid('#t-find')); const d0 = await dnow();             // the icon: the second tap on the field under it
          await dbl(await mid('#fl-close')); const d1 = await dnow();           // Close: Minis under it
          await page.tap('#t-find'); await gap();
          const low = await page.evaluate(() => { const rows = [...document.querySelectorAll('#fl-cols .fl-t')].filter(b => { const r = b.getBoundingClientRect(), l = b.parentNode.getBoundingClientRect(); return r.top >= l.top - 0.5 && r.bottom <= l.bottom + 0.5; }), b = rows[rows.length - 1], r = b.getBoundingClientRect(), c = window.__tryline.picker.filterState().cols; return { at:[r.left + r.width/2, r.top + r.height/2], id:c[c.length - 1].rows[+b.dataset.i].id }; });
          await dbl(low.at); const d2 = await dnow();                            // the lowest team in view: Kick Off or the Opponent's Next under it
          await page.tap('#t-find'); await page.waitForTimeout(150); await page.tap('#fl-close'); await gap(); const d3 = await dnow();   // Close at once, far from the icon
          ok(d0.open && !d0.field && !d1.open && d1.cat === 'men' && d2.screen === 's-teams' && !d2.open && d2.t1 === low.id && d2.set1 && !d3.open, `${at}: a double tap never goes through the Filter: on the icon, the field under it not focused (no keyboard); on Close, Minis under it not chosen; on a team, it picked and set, Kick Off or Next under it not pressed; Close tapped at once after the icon still closes (${json([d0, d1, low.id, d2, d3])})`);
          if (at === '844x390') {
            await page.evaluate(() => { window.__tryline.debug.openTeams('champ', 'eng'); }); await gap();
            await page.tap('#t-find'); await gap();
            await dbl(await mid('#fl-cols [data-col="1"][data-i="3"]'));
            const c0 = await page.evaluate(() => ({ screen:([...document.querySelectorAll('.screen')].find(e => !e.hidden) || { id:'none' }).id, team:window.__tryline.teams.champ() && window.__tryline.teams.champ().teams[0].id }));
            await page.evaluate(() => { const T = window.__tryline; T.teams.setChamp(null); T.debug.goHome(); T.career.set(null); T.career.newOpen(); T.career.clubOpen(); }); await gap();
            await page.tap('#t-find'); await gap();
            await dbl(await mid('#fl-cols [data-col="3"][data-i="1"]'));
            const c1 = await page.evaluate(() => ({ screen:([...document.querySelectorAll('.screen')].find(e => !e.hidden) || { id:'none' }).id, focus:document.activeElement.tagName }));
            await page.evaluate(() => { const T = window.__tryline; T.career.set(null); T.debug.goHome(); });
            ok(c0.screen === 's-hub' && c0.team === 'GLO' && c1.screen === 's-career-new' && c1.focus !== 'INPUT', `${at}: and onto the next screen: Championship's Gloucester double tapped, the hub shown and its first match not kicked off; Career's club double tapped, New Player shown and its name field not focused (${json([c0, c1])})`);
          }
          // a controller's reach (the review, 2026-11-11): from the first press, the d-pad's four ways and X or Y (the lift) reach every button
          // on the screen and every card, in Quick Match, Championship (a made team with its Edit), the World Cup, the career's club screen,
          // My Team, and 2 Players for each seat (his own card driven, the rest by the lifted ring)
          k = await page.evaluate(() => {
            const T = window.__tryline, P = T.picker, D = T.debug, $ = id => document.getElementById(id), out = [];
            const key = el => !el ? 'none' : el.closest('.pk-side') ? el.closest('.pk-side').id + ':' + el.dataset.act : el.dataset.cat ? 'cat:' + el.dataset.cat : el.id;
            const find = k => (k === 'none' ? null : k.startsWith('cat:') ? document.querySelector(`#t-cat [data-cat="${k.slice(4)}"]`) : k.includes(':') ? $(k.split(':')[0]).querySelector(`[data-act="${k.split(':')[1]}"]`) : $(k));
            T.teams.custom().length = 0; T.teams.custom().push(T.teams.cleanTeam({ name:'Herons', key:'myhe' }, 0));
            for (const [run, seat] of [['quick', 0], ['champ', 0], ['world', 0], ['career', 0], ['my', 0], ['two', 0], ['two', 1], ['quick+p', 0], ['champ+p', 0], ['my+p', 0], ['two+p', 1]]) {   // +p: with a profile that decides the category (Adult, Female): no Men | Women | Minis but in 2 Players
              const mode = run.replace('+p', ''); T.profile.set(run.endsWith('+p') ? { age:'adult', gender:'female', look:null } : { age:null, gender:null, look:null });
              D.settings().pick = [null, null]; D.setTwo(false);
              if (mode === 'two') { D.openJoin(); D.openTeams('two'); }
              else if (mode === 'champ') { D.openTeams('champ', 'sur'); P.group(0, 1); }
              else if (mode === 'world') D.openTeams('champ', 'world');
              else if (mode === 'career') { T.career.set(null); T.career.newOpen(); T.career.clubOpen(); }
              else D.openTeams(mode);
              T.home.ring(null);
              const first = mode === 'two' ? 'none' : key(T.navMove(seat, 0, 0)), seen = new Set([first]), todo = [first];
              while (todo.length) {
                const at = todo.shift();
                for (const a of ['l', 'r', 'u', 'd', 'y']) {
                  T.home.ring(find(at)); P.state().lifter = at !== 'none' && !at.endsWith(':pick') ? seat : null;
                  if (a === 'y') P.lift(seat); else T.navMove(seat, a === 'r' ? 1 : a === 'l' ? -1 : 0, a === 'd' ? 1 : a === 'u' ? -1 : 0);
                  const nk = key(D.focus()); if (!seen.has(nk)) { seen.add(nk); todo.push(nk); }
                }
              }
              const all = [...$('s-teams').querySelectorAll('button')].filter(b => !b.closest('[hidden]') && b.getBoundingClientRect().width > 0 && !b.disabled).map(key);
              const missing = all.filter(x => !seen.has(x) && !(mode === 'two' && x === `t-side${seat}:pick`) && !(mode === 'two' && x === `t-side${1 - seat}:pick`));
              out.push(`${run}${mode === 'two' ? seat : ''} ${first} ${all.length} ${JSON.stringify(missing)}${run.endsWith('+p') ? (all.some(x => x.startsWith('cat:')) === (mode === 'two') ? '' : ' cat?') : ''}`);
            }
            T.profile.set({ age:null, gender:null, look:null }); D.settings().cat = 'men'; T.home.ring(null); D.setTwo(false); T.teams.custom().length = 0; D.goHome();
            return out;
          });
          ok(k.every(x => x.endsWith(' []')) && k[0].startsWith('quick t-side0:pick') && k.slice(1, 5).every(x => / t-side0:pick /.test(x)) && k.length === 11, `${at}: from the first press a controller reaches every button, in every mode, and in 2 Players for each seat; with a profile that decides the category too, Men | Women | Minis gone but from 2 Players (${k.join('; ')})`);
          // with a profile that decides the category (Settings' Age Group | Gender) the switch is gone from the top bar: Up from a side's head
          // reaches the search icon, its one control, in Quick Match, Championship and My Team; 2 Players keeps Up to the switch
          k = await page.evaluate(() => {
            const T = window.__tryline, P = T.picker, D = T.debug, $ = id => document.getElementById(id), f = () => D.focus(), out = [];
            T.profile.set({ age:'adult', gender:'female', look:null });
            for (const mode of ['quick', 'champ', 'my', 'two']) {
              D.settings().pick = [null, null]; D.setTwo(false);
              if (mode === 'two') D.openJoin();
              if (mode === 'champ') D.openTeams('champ', 'int'); else D.openTeams(mode);
              T.home.ring(null); T.navMove(0, 0, 0); P.lift(0); T.navMove(0, 0, -1);
              const top = $('t-sides').getBoundingClientRect().top, bar = document.querySelector('.pk-top').getBoundingClientRect(), find = $('t-find').getBoundingClientRect();
              out.push([mode, f() && (f().dataset.cat || f().id), $('t-cat').hidden, D.settings().cat, Math.round(bar.right - find.right), find.bottom <= top]);
            }
            T.profile.set({ age:null, gender:null, look:null }); D.settings().cat = 'men'; T.home.ring(null); D.setTwo(false); D.goHome();
            return out;
          });
          ok(json(k.map(x => x.slice(0, 4))) === json([['quick', 't-find', true, 'women'], ['champ', 't-find', true, 'women'], ['my', 't-find', true, 'women'], ['two', 'women', false, 'women']]) && k.slice(0, 3).every(x => x[4] === 0 && x[5]), `${at}: the profile deciding (Adult, Female): no Men | Women | Minis, Women played, the search icon at the top bar's right end and Up from a side's head on it; 2 Players keeps the switch, Up on Women (${json(k)})`);
          k = await page.evaluate(() => {
            const T = window.__tryline, P = T.picker, D = T.debug, $ = id => document.getElementById(id), f = () => D.focus(), out = {};
            D.settings().pick = [null, null]; D.openTeams('quick'); T.home.ring(null);
            T.navMove(0, 0, 0); P.lift(0); out.lift = f() && f().dataset.act;                       // Y: the group's button
            T.navMove(0, 0, -1); out.up = f() && f().dataset.cat;                                     // Up: Men | Women | Minis, on the one chosen
            T.navMove(0, 1, 0); T.navPress(0); out.cat = D.settings().cat;                             // Right to Women, A presses it
            D.settings().cat = 'men'; D.openTeams('quick'); T.home.ring(null); T.navMove(0, 0, 0); P.lift(0);
            T.navMove(0, 0, 1); out.down = f() && (f().dataset.act || f().id);                         // Down passes over the card to the buttons under it
            T.home.ring(document.querySelector('#t-side0 [data-act="next"]'));
            const g = P.view(0).group.key; T.navPress(0); out.moved = P.view(0).group.key === g && P.view(0).i === 1 && f() && f().dataset.act;   // A on Next steps the team, the ring kept on Next
            P.lift(0); out.back = f() && f().dataset.act;                                            // Y again: back on the card
            T.navMove(0, 1, 0); out.drive = P.view(0).i;                                               // where the d-pad drives it again
            // the bottom row: Back | Kick Off on a phone held sideways, in that order for Tab too, and Left from Kick Off is Back
            D.settings().pick = [null, null]; D.openTeams('quick'); P.set(0); P.set(1); T.home.ring($('t-go'));
            T.navMove(0, -1, 0); out.left = f() && f().id; T.navMove(0, 1, 0); out.right = f() && f().id;
            out.order = [...$('t-go').parentNode.children].map(b => b.id).join();
            T.home.ring(null); D.goHome();
            return out;
          });
          ok(k.lift === 'sheet' && k.up === 'men' && k.cat === 'women' && /^(prev|next|t-back|t-go)$/.test(k.down) && k.moved === 'next' && k.back === 'pick' && k.drive === 2, `${at}: Y lifts the ring onto the group's button, Up reaches Men | Women | Minis (Men, chosen) and A on Women presses it, Down passes over the card to the buttons under it, A on Next steps the team, Y puts the ring back on the card to drive it (${json(k)})`);
          ok(k.left === 't-back' && k.right === 't-go' && k.order === 't-back,t-go', `${at}: the bottom row Back | Kick Off: Left from Kick Off is Back, Right back again, and Back first for Tab (${json(k)})`);
          // the lift's hint (the owner, 2026-11-11: "Keep, Show a Hint"), driven by a pad's own presses: a chip under the count of the side
          // the ring is on, X: Buttons on the card and X: Team off it; gone on a touch or a key, kept by a mouse; none in 2 Players. Wherever
          // it shows (either side, either wording, one side alone) it overlaps nothing, a button's ring included, cuts no word, keeps the
          // row at its buttons' height and leaves the screen unscrolled
          k = await page.evaluate(() => {
            const T = window.__tryline, P = T.picker, D = T.debug, $ = id => document.getElementById(id), scr = $('s-teams'), out = { seq:[], bad:[] };
            const chip = () => { const c = scr.querySelector('.pk-hint'); return c && c.getClientRects().length ? c.closest('.pk-side').id.slice(-1) + ' ' + [...c.children].filter(w => getComputedStyle(w).visibility === 'visible' && w.getAttribute('aria-hidden') !== 'true').map(w => w.textContent).join('|') : 'none'; };
            const pads = [{ index:0, mapping:'standard', connected:true, axes:[0, 0], buttons:Array.from({ length:17 }, () => ({ pressed:false, value:0 })) }];
            navigator.getGamepads = () => pads; D.padConnected(pads[0]);
            const press = i => { pads[0].buttons[i] = { pressed:true, value:1 }; T.pollPads(); pads[0].buttons[i] = { pressed:false, value:0 }; T.pollPads(); };
            const R = el => el.getBoundingClientRect();
            const lap = (a, b, m) => Math.min(a.right, b.right + m) - Math.max(a.left, b.left - m) > 0.5 && Math.min(a.bottom, b.bottom + m) - Math.max(a.top, b.top - m) > 0.5;
            const fits = what => {
              const c = scr.querySelector('.pk-hint');
              if (!c || !c.getClientRects().length) { out.bad.push(what + ': no chip'); return; }
              const r = R(c), step = c.parentNode, prev = step.querySelector('[data-act="prev"]');
              for (const el of scr.querySelectorAll('*')) {
                if (el === c || el.contains(c) || c.contains(el) || !el.getClientRects().length) continue;
                if (lap(r, R(el), el.matches('button') ? 5 : 0)) out.bad.push(`${what}: on ${el.id || el.dataset.act || el.className || el.tagName}`);   // a button's ring: 3px of outline, 2px out
              }
              for (const el of [c, ...step.children]) if (el.scrollWidth > el.clientWidth + 0.5) out.bad.push(`${what}: ${el.textContent} cut`);
              if (Math.abs(R(step).height - R(prev).height) > 0.5 || R(prev).height < 43.5) out.bad.push(`${what}: the row ${R(step).height}px`);
              if (r.left < 0 || r.right > innerWidth || r.bottom > innerHeight) out.bad.push(`${what}: out of view`);
              if (scr.scrollHeight > scr.clientHeight + 0.5) out.bad.push(`${what}: scrolls`);
              if (getComputedStyle(c).textTransform !== 'none') out.bad.push(`${what}: not Title Case`);
            };
            const widths = {}, see = what => {                               // and Previous keeps one width a side, either wording: nothing shifts as X is pressed
              out.seq.push(chip()); if (chip() === 'none') return;
              fits(what); const c = scr.querySelector('.pk-hint'), k = P.one() + c.closest('.pk-side').id; (widths[k] ||= new Set()).add(Math.round(R(c.parentNode.querySelector('[data-act="prev"]')).width*10));
            };
            D.settings().pick = [null, null]; D.setTwo(false); D.openTeams('quick'); T.home.ring(null);
            D.setDev('touch'); see('touch');
            D.setDev('kb'); see('keyboard');
            press(12); see('the first press, on the card');                   // a pad: the ring on Your Team's card
            press(2); see('X, lifted');                                         // X: onto its side's buttons
            press(2); see('X again, back on the card');
            press(15); see('Right, the next team');                             // the d-pad drives the card, the hint stays
            press(0); see('A, on to the Opponent');                             // A sets Your Team: the ring on the Opponent's card
            press(2); see('the Opponent lifted');
            T.home.ring($('t-go')); see('on the primary');                      // the bottom row: the active side's, still lifted
            press(2); see('back on the active side\'s card');
            D.keyDown({ code:'ArrowRight', key:'ArrowRight', repeat:false, target:document.body, preventDefault() {} }); D.keyUp({ code:'ArrowRight', key:'ArrowRight', target:document.body, preventDefault() {} });
            see('a key');
            press(12); see('the pad again');
            scr.querySelector('.pk-n').dispatchEvent(new PointerEvent('pointerdown', { pointerType:'mouse', bubbles:true })); see('a mouse');
            scr.querySelector('.pk-n').dispatchEvent(new PointerEvent('pointerdown', { pointerType:'touch', bubbles:true })); see('a finger');
            D.settings().pick = [null, null]; D.openTeams('champ', 'sur'); T.home.ring(null); press(12); see('one side');
            press(2); see('one side, lifted');
            D.openJoin(); D.openTeams('two'); see('2 Players');
            D.setTwo(false); T.home.ring(null); D.setDev('touch'); D.goHome();
            out.shift = Object.entries(widths).filter(([, w]) => w.size !== 1).map(([k, w]) => k + ' ' + [...w].join('/'));
            return out;
          });
          ok(json(k.seq) === json(['none', 'none', '0 X: Buttons', '0 X: Team', '0 X: Buttons', '0 X: Buttons', '1 X: Buttons', '1 X: Team', '1 X: Team', '1 X: Buttons', 'none', '1 X: Buttons', '1 X: Buttons', 'none', '0 X: Buttons', '0 X: Team', 'none']), `${at}: the lift's hint: none on touch or a key; with a pad X: Buttons on the side the ring drives and X: Team once X lifts it (the same press back), on the Opponent's once A moves on, the active side's from the bottom row; a key or a finger hides it, a mouse leaves it; one side alone too; none in 2 Players (${k.seq.join(', ')})`);
          ok(k.bad.length === 0 && k.shift.length === 0, `${at}: the hint fits wherever it shows: on nothing (a button's ring included), no word cut, the row its buttons' 44px, no scroll, Title Case; and Previous and Next keep their width whichever it says (${[...k.bad.slice(0, 6), ...k.shift].join('; ')})`);
          // 2 Players: each seat's group button opens the Filter for its side; Escape clears its text, then closes it, and nothing more
          k = await page.evaluate(async () => {
            const T = window.__tryline, P = T.picker, D = T.debug, $ = id => document.getElementById(id), out = [];
            const esc = () => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', code:'Escape', bubbles:true, cancelable:true }));
            for (const set of [false, true]) {
              D.settings().pick = [null, null]; D.openJoin(); D.openTeams('two'); if (set) P.press(0);
              $('t-side1').querySelector('[data-act="sheet"]').click(); const side = P.filterState().s;
              P.filterType('ba'); esc(); const kept = !$('m-filter').hidden && P.filterState().q === '' && !$('fl-cols').hidden;
              esc();
              out.push({ side, kept, filter:!$('m-filter').hidden, teams:!$('s-teams').hidden, set0:P.state().sides[0].set });
            }
            D.openTeams('two'); $('t-side0').querySelector('[data-act="sheet"]').click(); out.push(P.filterState().s); P.filterClose();
            D.setTwo(false); D.goHome();
            return out;
          });
          ok(k[0].side === 1 && k[2] === 0 && k[0].kept && k[1].kept && !k[0].filter && k[0].teams && !k[1].filter && k[1].teams && k[1].set0, `${at}: 2 Players: each seat's group button opens the Filter for its side; Escape clears the text, then closes it and nothing else: still on the team screen, Player 1's side still set (${json(k)})`);
          // the Filter keeps the keyboard in it: Enter on the group's button opens it with the field focused; Tab stays inside; the arrows walk
          // its columns (Up and Down choosing as they go, Left and Right between columns, Home and End), Enter on a row opens it, Enter on a
          // team picks it and the focus moves on as from the card; a letter on the screen opens it typed; Escape clears, then closes; another
          // screen shuts it
          await page.evaluate(() => { const T = window.__tryline; T.debug.settings().pick = [null, null]; T.debug.openTeams('quick'); T.picker.set(0); T.picker.set(1); });
          await page.waitForTimeout(450);                     // past the click a swipe ends with
          await page.focus('#t-side0 [data-act="sheet"]'); await page.keyboard.press('Enter');
          k = await page.evaluate(() => ({ open:!document.getElementById('m-filter').hidden, id:document.activeElement.id }));
          ok(k.open && k.id === 'fl-q', `${at}: Enter on the group's button: the Filter, the field focused (${json(k)})`);
          const inside = [], within = () => page.evaluate(() => { const a = document.activeElement; return !a || a === document.body || !!a.closest('#m-filter'); });   // the browser's own stop past the page's last control counts as in
          for (let t = 0; t < 40; t++) { await page.keyboard.press('Tab'); inside.push(await within()); }
          for (let t = 0; t < 4; t++) { await page.keyboard.press('Shift+Tab'); inside.push(await within()); }
          k = await page.evaluate(() => ({ open:!document.getElementById('m-filter').hidden, match:!!(window.__tryline.M && !window.__tryline.M.demo) }));
          ok(inside.every(Boolean) && k.open && !k.match && inside.length === 44, `${at}: Tab and Shift+Tab never leave the open Filter, so nothing behind it can be pressed (${inside.filter(x => !x).length} outside)`);
          const at2 = () => page.evaluate(() => { const a = document.activeElement, P = window.__tryline.picker, c = P.filterState().cols; return a.id || (a.dataset.col != null ? `${a.dataset.col}:${a.dataset.i} ${a.querySelector('b').textContent}|${c[c.length - 1].head}` : a.dataset.r != null ? 'r' + a.dataset.r + ' ' + a.querySelector('b').textContent : a.tagName); });
          const seq = [];
          await page.focus('#fl-q');
          for (const key of ['ArrowDown', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End', 'ArrowRight', 'ArrowDown']) { await page.keyboard.press(key); seq.push(await at2()); }
          ok(json(seq) === json(['3:0 Farnham|Surrey', '2:3 Surrey|Surrey', '2:4 Counties|Counties', '2:3 Surrey|Surrey', '2:0 National|National', '2:4 Counties|Counties', '3:0 Effingham|Counties', '3:1 Wandsworth|Counties']), `${at}: the keys: Down from the field to the side's team, Left to its league, Down and Up choosing (the Teams column following), Home and End, Right into the Teams (${json(seq)})`);
          await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft'); const a0 = await at2(); await page.keyboard.press('Enter'); const a1 = await at2(); await page.keyboard.press('ArrowUp'); const a2 = await at2(); await page.keyboard.press('ArrowUp'); const a3 = await at2();
          ok(a0 === '0:0 North|Counties' && a1 === '1:2 England|Counties' && a2 === '1:1 France|National' && a3 === '1:0 Ireland|National', `${at}: Enter on a row opens it, into the next column on its mark; Up from there chooses as it goes (${a0}, ${a1}, ${a2}, ${a3})`);
          await page.keyboard.press('ArrowUp'); const a4 = await at2();
          await page.keyboard.press('ArrowDown'); const a5 = await at2();
          for (const key of ['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowDown']) await page.keyboard.press(key);
          const a6 = await at2(); await page.keyboard.press('Enter');
          k = await page.evaluate(() => ({ open:!document.getElementById('m-filter').hidden, g:window.__tryline.picker.view(0).group.key, i:window.__tryline.picker.view(0).i, set:window.__tryline.picker.state().sides[0].set, focus:document.activeElement.id, inert:[...document.body.children].filter(e => e.inert).length }));
          ok(a4 === 'fl-q' && a5 === '3:0 Ireland|National' && a6 === '3:1 Limerick|URC' && !k.open && k.g === 'cel.ire' && k.i === 1 && k.set && k.focus === 't-go' && k.inert === 0, `${at}: Up from a column's top: the field, Down from it the Teams column; Enter on a team (Limerick) picks it, the Filter shut, the side set and the focus on to Kick Off as from the card (${a4} ${a5} ${a6} ${json(k)})`);
          await page.evaluate(() => { const T = window.__tryline; T.debug.settings().pick = [null, null]; T.debug.openTeams('quick'); });
          await page.focus('#t-side0 .pk-pick'); await page.keyboard.press('b');
          k = await page.evaluate(() => ({ open:!document.getElementById('m-filter').hidden, q:document.getElementById('fl-q').value, focus:document.activeElement.id }));
          await page.keyboard.type('a');
          const typed = await page.evaluate(() => ({ q:document.getElementById('fl-q').value, first:(document.querySelector('#fl-res [data-r="0"] b') || {}).textContent }));
          await page.keyboard.press('ArrowDown'); const r0 = await at2(); await page.keyboard.press('ArrowDown'); const r1 = await at2(); await page.keyboard.press('t'); const typed2 = await page.evaluate(() => ({ q:document.getElementById('fl-q').value, focus:document.activeElement.id }));
          ok(k.open && k.q === 'b' && k.focus === 'fl-q' && typed.q === 'ba' && typed.first === 'Bayonne' && r0 === 'r0 Bayonne' && r1 === 'r1 Bath' && typed2.q === 'bat' && typed2.focus === 'fl-q', `${at}: a letter on the screen opens the Filter with it typed, once; typing goes on in the field, Down walks the matches, and a letter from a match goes back to the field (${json([k, typed, r0, r1, typed2])})`);
          await page.keyboard.press('Escape');
          const e1 = await page.evaluate(() => ({ open:!document.getElementById('m-filter').hidden, q:document.getElementById('fl-q').value, cols:!document.getElementById('fl-cols').hidden, focus:document.activeElement.id }));
          await page.keyboard.press('Escape');
          const e2 = await page.evaluate(() => ({ open:!document.getElementById('m-filter').hidden, focus:document.activeElement.id, i:window.__tryline.picker.view(0).i, g:window.__tryline.picker.view(0).group.key }));
          ok(e1.open && e1.q === '' && e1.cols && e1.focus === 'fl-q' && !e2.open && e2.focus === 't-find' && e2.g === 'sur' && e2.i === 0, `${at}: Escape clears the text (the columns back), then closes, the side as it was and the focus back on the icon (${json([e1, e2])})`);
          k = await page.evaluate(() => { const T = window.__tryline; T.picker.filter(0, '', { dev:'touch' }); T.debug.goHome(); return { open:!document.getElementById('m-filter').hidden, inert:[...document.body.children].filter(e => e.inert).length }; });
          ok(!k.open && k.inert === 0, `${at}: another screen shown shuts the Filter, and leaves nothing inert (${json(k)})`);
          // a controller in the Filter: A on the group's button opens it on the side's mark; the d-pad walks it as the keys do, passing over
          // the field to Close; A opens a row or picks a team, the ring moving on as from the card; B closes it, the ring back on the button
          k = await page.evaluate(() => {
            const T = window.__tryline, P = T.picker, D = T.debug, $ = id => document.getElementById(id), f = () => D.focus(), out = [];
            const id = el => !el ? 'none' : el.dataset.col != null ? `${el.dataset.col}:${el.dataset.i}` : el.closest && el.closest('.pk-side') ? el.closest('.pk-side').id + ' ' + el.dataset.act : el.id;
            D.settings().pick = [null, null]; D.openTeams('quick'); T.home.ring(null);
            T.navMove(0, 0, 0); P.lift(0); out.push(id(f()));               // the group's button
            T.navPress(0); out.push(!$('m-filter').hidden ? 'open' : 'shut', id(f()), document.activeElement === $('fl-q') ? 'field' : 'not the field');
            T.navMove(0, -1, 0); out.push(id(f())); T.navMove(0, 0, 1); out.push(id(f()), P.filterState().cols[3].head);
            for (let n = 0; n < 5; n++) T.navMove(0, 0, -1); out.push(id(f()));   // up the League column, past its top: Close (the field passed over)
            T.navMove(0, 0, 1); out.push(id(f()));
            T.navMove(0, -1, 0); T.navMove(0, -1, 0); T.navMove(0, -1, 0); out.push(id(f()));   // Left to the areas
            T.navMove(0, 0, 1); T.navPress(0); out.push(id(f()));               // South, A: into its countries
            T.navMove(0, 1, 0); T.navMove(0, 1, 0); out.push(id(f())); T.navPress(0);
            out.push(!$('m-filter').hidden ? 'open' : 'shut', P.view(0).team.id, P.state().sides[0].set, id(f()));
            P.filter(1, '', { dev:'pad' }); out.push(id(f())); T.navBack(0); out.push(!$('m-filter').hidden ? 'open' : 'shut', id(f()));
            T.home.ring(null); D.goHome();
            return out;
          });
          ok(json(k) === json(['t-side0 sheet', 'open', '3:0', 'not the field', '2:3', '2:4', 'Counties', 'fl-close', '3:0', '0:0', '1:0', '3:0', 'shut', 'RSA', true, 't-side1 pick', '3:0', 'shut', 't-side1 sheet']), `${at}: a controller: A on the group's button opens the Filter on Your Team's mark (the field untouched); the d-pad: Left to its league, Down choosing Counties, Up past the top to Close, Down back in, Left to the areas; A on South opens it into its countries, A on a team picks it (South Africa, set) and the ring moves on to the Opponent; B closes, the ring back on the group's button (${json(k)})`);
          // 2 Players: the Filter answers only the seat whose side it is, as each seat drives only his own card; B is either seat's
          if (at === '844x390') {
            k = await page.evaluate(() => {
              const T = window.__tryline, P = T.picker, D = T.debug, $ = id => document.getElementById(id), f = () => { const e = D.focus(); return e && e.dataset.col != null ? e.dataset.col + ':' + e.dataset.i : e ? e.id : 'none'; }, out = [];
              D.settings().pick = [null, null]; D.openJoin(); D.openTeams('two'); T.home.ring(null);
              P.filter(1, '', { dev:'pad' }); out.push($('m-filter').getAttribute('aria-label'), f());
              T.navMove(0, -1, 0); out.push(f()); T.navPress(0); out.push(!$('m-filter').hidden ? 'open' : 'shut', P.state().sides[1].set);   // Player 1: nothing
              T.navMove(1, -1, 0); out.push(f());                                                                                            // Player 2: Left to the league
              T.navBack(0); out.push(!$('m-filter').hidden ? 'open' : 'shut', D.navOnly());                                                  // Player 1's B closes it
              T.home.ring(null); D.setTwo(false); D.goHome();
              return out;
            });
            ok(k[0] === 'Player 2' && /^3:/.test(k[1]) && k[2] === k[1] && k[3] === 'open' && k[4] === false && /^2:/.test(k[5]) && k[6] === 'shut' && k[7] === null, `${at}: 2 Players: Player 2's Filter (named for him) answers his seat only: Player 1's d-pad and A do nothing in it, Player 2's Left moves the ring; either seat's B closes it, both seats free again (${json(k)})`);
          }
          // a card over the screen (the Unlock card): the keys and a controller's shoulder leave the teams behind it alone
          k = await page.evaluate(() => {
            const T = window.__tryline, P = T.picker, D = T.debug, S = T.store, $ = id => document.getElementById(id);
            T.locker.set(T.locker.fresh()); T.locker.FEATS.filter(f => f.id !== 'star').slice(0, 10).forEach(f => { T.locker.state().n[f.id] = 10; });
            S.setTier('free'); S.setBought([]);
            D.settings().pick = [null, null]; D.openTeams('quick'); P.group(0, P.view(0).ladder.findIndex(g => g.key === 'nat.eng') - P.view(0).gi); P.step(0, 1);
            const was = P.view(0).team.id; P.set(0);
            const open = !$('m-store').hidden;
            for (const key of ['ArrowRight', 'ArrowDown', 'PageDown']) document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles:true, cancelable:true }));
            const afterKeys = P.view(0).team.id, g = P.view(0).group.key;
            P.shoulder(0, 1);
            const out = { was, open, afterKeys, afterPad:P.view(0).group.key, g };
            T.store.close(); S.setTier(null); T.locker.set(T.locker.fresh()); D.goHome();
            return out;
          });
          ok(k.was === 'L03' && k.open && k.afterKeys === 'L03' && k.afterPad === k.g, `${at}: with the Unlock card over England 2003, the arrows, Page Down and a shoulder leave the side as it was (${json(k)})`);
          // the whole card: a swipe from the bars, and a tap on them, as on the shirt
          await page.evaluate(() => { const T = window.__tryline; T.debug.settings().pick = [null, null]; T.debug.openTeams('quick'); });
          const bars = await page.evaluate(() => { const r = document.querySelector('#t-side0 .pk-stats').getBoundingClientRect(); return { x:r.left + r.width/2, y:r.top + r.height/2 }; });
          await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[bars] });
          for (let st = 1; st <= 6; st++) await cdp.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{ x:bars.x - 90*st/6, y:bars.y + 3 }] });
          await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
          await page.waitForTimeout(450);
          k = await page.evaluate(() => ({ i:window.__tryline.picker.view(0).i, set:window.__tryline.picker.state().sides[0].set }));
          await page.tap('#t-side0 .pk-stats');
          const k3 = await page.evaluate(() => window.__tryline.picker.state().sides[0].set);
          ok(k.i === 1 && !k.set && k3, `${at}: a swipe from the bars changes the team, and a tap on them sets it, as anywhere on the card (${json(k)} ${k3})`);
          // the keyboard's focus is never dropped by a button switched off under it (Next on a group of one)
          await page.evaluate(() => { const T = window.__tryline, P = T.picker; T.debug.settings().pick = [null, null]; T.debug.openTeams('quick'); P.group(0, P.view(0).ladder.findIndex(g => g.key === 'nat.ire') - P.view(0).gi + 1); });
          await page.focus('#t-side0 [data-act="next"]'); await page.keyboard.press('ArrowUp');
          k = await page.evaluate(() => ({ g:window.__tryline.picker.view(0).group.key, act:document.activeElement.dataset.act || document.activeElement.tagName }));
          ok(k.g === 'nat.ire' && k.act === 'pick', `${at}: Up from Next into Ireland's National (one side, Next off): the focus moves to the card, never lost (${json(k)})`);
          // a made team as the Opponent, stronger: Stronger Side clear of Edit; a long made name clear of it too, and not under 16px where the shirt can step down
          k = await page.evaluate(() => {
            const T = window.__tryline, P = T.picker, D = T.debug, $ = id => document.getElementById(id), out = {};
            T.teams.custom().length = 0;
            T.teams.custom().push(T.teams.cleanTeam({ name:'Zed Town', key:'myzed', pace:5, power:5, handling:5, kicking:5, stamina:5 }, 0), T.teams.cleanTeam({ name:'MMMMMMMMMMMMMMMM', key:'mymmm', pace:1, power:1, handling:1, kicking:1, stamina:1 }, 1));
            D.settings().pick = [null, null]; D.openTeams('quick');
            P.group(0, P.view(0).ladder.findIndex(g => g.key === 'cty') - P.view(0).gi); while (P.view(0).i < P.view(0).group.teams.length - 1) P.step(0, 1);
            P.group(1, P.view(1).ladder.findIndex(g => g.key === 'mine.made') - P.view(1).gi);
            const side = $('t-side1'), edit = side.querySelector('.pk-edit'), gap = side.querySelector('.gap');
            const r = el => { const g = document.createRange(); g.selectNodeContents(el); return g.getBoundingClientRect(); };
            out.gap = gap ? gap.textContent : null; out.gapClear = gap ? r(gap).right <= edit.getBoundingClientRect().left + 0.5 || r(gap).top >= edit.getBoundingClientRect().bottom - 0.5 : null;
            P.step(1, 1); const name = side.querySelector('.tname'), e2 = side.querySelector('.pk-edit'), cs = getComputedStyle(name);
            out.long = name.textContent; out.nameClear = name.getBoundingClientRect().right <= e2.getBoundingClientRect().left + 0.5 && (name.scrollWidth <= name.clientWidth + 0.5 || (cs.textOverflow === 'ellipsis' && cs.overflowX === 'hidden'));
            out.px = parseFloat(cs.fontSize); out.fit = $('s-teams').dataset.fit;
            T.teams.custom().length = 0; D.goHome();
            return out;
          });
          ok(k.gap === 'Stronger Side' && k.gapClear && k.long === 'MMMMMMMMMMMMMMMM' && k.nameClear && (k.px >= 16 || (k.fit === '3' && k.px >= 13)), `${at}: a stronger made team as the Opponent: Stronger Side clear of Edit; a sixteen-letter name clear of it (an ellipsis at the very last), 16px or more unless the shirt is already at its smallest, and never under 13px (${json(k)})`);
          // the Filter's own motion: it comes in by opacity and transform, quickly
          k = await page.evaluate(() => { const T = window.__tryline; T.debug.openTeams('quick'); document.getAnimations().forEach(a => a.finish()); T.picker.filter(0, '', { dev:'touch' }); const a = document.getAnimations(); const out = a.map(x => ({ d:x.effect.getTiming().duration, props:[...new Set(x.effect.getKeyframes().flatMap(f => Object.keys(f).filter(p => !['offset', 'easing', 'composite', 'computedOffset'].includes(p))))].join() })); T.picker.filterShut(); T.debug.goHome(); return out; });
          ok(k.length === 1 && k[0].d <= 250 && /^(opacity|transform)(,(opacity|transform))?$/.test(k[0].props), `${at}: the Filter comes in by opacity and transform, 250ms or less (${json(k)})`);
          // the phone's keyboard (a visualViewport stood in for it): with the field focused, the Filter takes what the keyboard leaves, the
          // field and two matches or more above it, wherever the page has scrolled; a window resize under it fits nothing again until it shuts
          if (at === '844x390' || at === '667x375') {
            k = await page.evaluate(() => {
              const T = window.__tryline, P = T.picker, D = T.debug, $ = id => document.getElementById(id), out = [], scr = $('s-teams');
              D.settings().pick = [null, null]; D.openTeams('quick'); const base = scr.dataset.fit;
              P.filter(0, 'a', { dev:'touch' }); document.getAnimations().forEach(a => a.finish());
              for (const [left, top] of [[175, 0], [150, 0], [140, 0], [132, 0], [128, 0], [160, 40]]) {
                const vv = new EventTarget(); Object.assign(vv, { width:innerWidth, height:left, offsetTop:top, offsetLeft:0, scale:1 });
                Object.defineProperty(window, 'visualViewport', { value:vv, configurable:true });
                $('fl-q').blur(); $('fl-q').focus(); vv.dispatchEvent(new Event('resize'));
                const inView = b => b.top >= top - 0.5 && b.bottom <= top + left + 0.5, all = [...document.querySelectorAll('#fl-res .fl-r')];
                const rows = all.filter(r => inView(r.getBoundingClientRect())).length, read = all.filter(r => [...r.querySelectorAll('.fl-nm, .fl-st')].every(e => inView(e.getBoundingClientRect()))).length, f = $('fl-q').getBoundingClientRect();
                out.push({ left, top, kb:$('m-filter').classList.contains('kb'), rows, read, field:f.top >= top - 0.5 && f.bottom <= top + left + 0.5 });
              }
              scr.dataset.fit = '3'; window.dispatchEvent(new Event('resize')); const held = scr.dataset.fit;
              $('fl-q').blur(); const off = $('m-filter').classList.contains('kb');
              P.filterClose(); const after = scr.dataset.fit;
              delete window.visualViewport; D.goHome();
              return { out, held, off, base, after };
            });
            ok(k.out.every(o => o.kb && o.field && o.read >= 2 && (o.left < 132 || o.rows >= 2)), `${at}: with the field focused and the phone's keyboard up (what it leaves: 175, 150, 140 and 132px; 160px with the page scrolled 40 down), the Filter fits in it, the field and two whole matches or more above the keyboard; at 128px (a landscape iPhone with QuickType and the form bar) the second's name, path and stars still wholly above it (${json(k.out)})`);
            ok(k.held === '3' && !k.off && k.after === k.base, `${at}: a window resize under the open Filter fits nothing again (data-fit kept at ${k.held}); the field let go, the card back to its own size; the Filter shut, the screen fitted (${k.base} to ${k.after})`);
          }
        } else {
          const k = await page.evaluate(() => { const T = window.__tryline; T.debug.openTeams('quick'); T.picker.step(0, 1); T.picker.group(1, 1); T.picker.filter(0, 'ba', { dev:'touch' }); T.picker.filterType(''); T.picker.filterSel(0, 1); const n = document.getAnimations().length; T.picker.filterShut(); return n; });
          ok(k === 0, `${at} with reduced motion: no slide at all, and the Filter comes in with none (${k})`);
        }
        ok(errors.length === 0, `${at}${reduce ? ' (reduced motion)' : ''}: no page error (${errors.join('; ')})`);
        await ctx.close();
      }
    }
    // a computer (a mouse, no touch): a click on the icon opens the Filter with the field focused, to type at once
    {
      const ctx = await browser.newContext({ viewport:{ width:844, height:390 } });
      await ctx.addInitScript(s => { try { localStorage.setItem('tryline.v1', s); } catch (e) { /* none */ } }, JSON.stringify(SAVE));
      const page = await ctx.newPage();
      await page.goto(base); await page.waitForFunction(() => window.__tryline && !document.getElementById('s-home').hidden);
      await page.evaluate(() => window.__tryline.debug.openTeams('quick'));
      await page.click('#t-find');
      let k = await page.evaluate(() => ({ desk:document.body.classList.contains('desk'), open:!document.getElementById('m-filter').hidden, focus:document.activeElement.id }));
      await page.keyboard.type('glouc'); await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
      const k2 = await page.evaluate(() => ({ team:window.__tryline.picker.view(0).team.id, set:window.__tryline.picker.state().sides[0].set, open:!document.getElementById('m-filter').hidden }));
      ok(k.desk && k.open && k.focus === 'fl-q' && k2.team === 'GLO' && k2.set && !k2.open, `a computer: a click on the icon opens the Filter with the field focused; typed "glouc", Enter to the match and Enter again picks Gloucester (${json([k, k2])})`);
      // a click on a row of Area or Country keeps the focus on it (the columns before it are not drawn again), so Tab and the arrows go on
      // from there, as they do for Enter
      const foc = () => page.evaluate(() => { const a = document.activeElement; return a && a.dataset.col != null ? `${a.dataset.col}:${a.dataset.i} ${a.querySelector('b').textContent}` : a ? a.id || a.tagName : null; });
      await page.evaluate(() => { const T = window.__tryline; T.debug.settings().pick = [null, null]; T.debug.openTeams('quick'); });
      await page.waitForTimeout(450);                         // a person's next click on the icon: never inside the double click's 400ms
      await page.click('#t-find'); await page.waitForTimeout(450);
      await page.click('#fl-cols [data-col="0"][data-i="1"]'); const m0 = await foc();
      await page.click('#fl-cols [data-col="1"][data-i="1"]'); const m1 = await foc();
      await page.keyboard.press('ArrowDown'); const m2 = await foc();
      ok(m0 === '0:1 South' && m1 === '1:1 New Zealand' && m2 === '1:2 Australia', `a computer: a click on South keeps the focus on South, one on New Zealand on it, and Down goes on from there (${m0}, ${m1}, ${m2})`);
      await page.keyboard.press('Escape');
      // a gated team picked from the Filter by the keys (a Legend without the Full Game): the Unlock card, and Escape on it puts the focus
      // back on Your Team's card, as a pick on the card does
      await page.evaluate(() => { const T = window.__tryline, L = T.locker; T.store.setTier('free'); T.store.setBought([]); L.set(L.fresh()); L.FEATS.filter(f => f.id !== 'star').slice(0, 10).forEach(f => { L.state().n[f.id] = 10; }); T.debug.settings().pick = [null, null]; T.debug.openTeams('quick'); });
      await page.focus('#t-side0 .pk-pick'); await page.keyboard.type('england 2003'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
      const g0 = await page.evaluate(() => ({ store:!document.getElementById('m-store').hidden, team:window.__tryline.picker.view(0).team.id }));
      await page.keyboard.press('Escape');
      const g1 = await page.evaluate(() => { const a = document.activeElement, s = a && a.closest && a.closest('.pk-side'); return { store:!document.getElementById('m-store').hidden, focus:s ? s.id + ' ' + a.dataset.act : a && (a.id || a.tagName) }; });
      await page.evaluate(() => { const T = window.__tryline; T.store.setTier(null); T.locker.set(T.locker.fresh()); T.debug.goHome(); });
      ok(g0.store && g0.team === 'L03' && !g1.store && g1.focus === 't-side0 pick', `a computer: England 2003 picked from the Filter by the keys without the Full Game: the Unlock card; Escape and the focus is on Your Team's card, as from the card (${json([g0, g1])})`);
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
}
