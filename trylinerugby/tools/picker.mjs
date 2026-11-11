// The team screen (README, Teams: The Team Screen): Your Team v the Opponent side by side, one team a side, the ladder (North | South |
// Mine | Favourites | Recent, each country's National and its lists' groups, Men | Women | Minis on top), Left and Right through a group,
// Up and Down through the ladder, a whole country at a time, each round again; the swipe; Pick Opponent's lock and its rivals first; the
// picks kept (each side's last, its Recent, the Favourites) through a save and from saves before them; each one-side mode (Championship,
// Career, My Team, the World Cup and the Home Nations Tour); GAME_VERSION. Its last part needs Playwright and Chromium (as
// tools/home.mjs's does) and is skipped, saying so, where they are missing: the screen at 844x390, 667x375, 844x340, 667x320 and 568x320
// with no scroll and every target 44px or more, the keyboard, a controller, a finger's swipe, and reduced motion.
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
  swipe(0, 4, -70); ok(view(0).group.key === 'cty', 'a swipe up: the next group');
  swipe(0, 2, 70); ok(view(0).group.key === 'sur', 'a swipe down: the one before');
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
  ok(!key('a'), 'any other key is the browser\'s');
}

// 8. Nothing drawn at random; GAME_VERSION
{
  fresh();
  const before = rndCalls();
  for (const m of ['quick', 'two', 'my']) { D.openTeams(m); for (let k = 0; k < 40; k++) { P.group(0, 1); P.step(0, 1); if (m !== 'my') P.step(1, 1); } }
  for (const c of ['eng', 'int', 'world', 'tour']) D.openTeams('champ', c);
  ok(rndCalls() === before, `the team screen draws no random number (${rndCalls() - before})`);
  ok(T.GAME_VERSION === '1.2' && $('ver').textContent === 'Version 1.2', 'GAME_VERSION is 1.2, on window.__tryline and at the foot of Settings');
  const src = readGameSource();
  ok(src.includes("const GAME_VERSION = '1.2';") && /<p class="ver" id="ver">Version 1\.2<\/p>/.test(src), 'one constant, and the line in Settings');
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
            T.debug.openTeams('quick'); P.sheet(0);
            const sheet = $('m-ladder'), card = sheet.querySelector('.card'), r = card.getBoundingClientRect();
            if (r.top < -0.5 || r.bottom > innerHeight + 0.5) bad.push('the ladder sheet out of view');
            if ([...sheet.querySelectorAll('button')].some(b => b.getBoundingClientRect().height < 43.5)) bad.push('a sheet button under 44px');
            const list = $('ldr-list'); if (list.scrollHeight > list.clientHeight && getComputedStyle(list).overflowY !== 'auto') bad.push('the sheet does not scroll itself');
            P.sheetClose(null);
            return { bad, n };
          });
          ok(fit.bad.length === 0 && fit.n > 440, `${at}: every state fits with no scroll, both sides, the V, the primary and Back in view, every target 44px or more, no name or bar label cut (${fit.n} states${fit.bad.length ? ': ' + fit.bad.slice(0, 6).join('; ') : ''})`);
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
          k = await page.evaluate(() => ({ side:document.activeElement.closest('.pk-side') && document.activeElement.closest('.pk-side').id, act:document.activeElement.dataset.act }));
          await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
          const k2 = await page.evaluate(() => document.activeElement.id);
          ok(k.side === 't-side1' && k2 === 't-back', `${at}: Tab moves through the sides and the buttons: back from Kick Off into the Opponent's side, on to Back (${json(k)} ${k2})`);
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
            T.navMove(0, 0, -1); out.up = T.debug.focus() && (T.debug.focus().dataset.act || T.debug.focus().id);
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
          await drag(4, -80);
          k = await page.evaluate(() => window.__tryline.picker.view(0).group.key);
          ok(k === 'cty', `${at}: a swipe up the card: the next group (${k})`);
          await page.tap('#t-side0 [data-act="next"]');
          k = await page.evaluate(() => window.__tryline.picker.view(0).i);
          ok(k === 1, `${at}: Next tapped (${k})`);
          await page.tap('#t-side0 [data-act="sheet"]');
          k = await page.evaluate(() => !document.getElementById('m-ladder').hidden && document.querySelectorAll('#ldr-list .ldr-g').length);
          ok(k > 25, `${at}: the group's button opens the ladder sheet, every group in it (${k})`);
          await page.tap('#ldr-list [data-g="0"]');
          k = await page.evaluate(() => ({ g:window.__tryline.picker.view(0).group.key, open:!document.getElementById('m-ladder').hidden }));
          ok(k.g === 'nat.ire' && !k.open, `${at}: a group tapped there: on it, the sheet closed (${json(k)})`);
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
        } else {
          const k = await page.evaluate(() => { const T = window.__tryline; T.debug.openTeams('quick'); T.picker.step(0, 1); T.picker.group(1, 1); return document.getAnimations().length; });
          ok(k === 0, `${at} with reduced motion: no slide at all (${k})`);
        }
        ok(errors.length === 0, `${at}${reduce ? ' (reduced motion)' : ''}: no page error (${errors.join('; ')})`);
        await ctx.close();
      }
    }
  } finally { await browser.close(); server.close(); }
}
