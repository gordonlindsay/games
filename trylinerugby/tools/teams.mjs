import { readGameSource } from './source.mjs';
// Teams: kit clashes, local clubs, teams you make, and championships built from any six.
// Also the menu (Quick Match first, no Duels switch) and the save: what loads, what is dropped.
// Exits 1 on any failure.
// node tools/teams.mjs
import fs from 'fs';
import { T } from './harness.mjs';

const X = T.teams, STEP = T.STEP;
let failed = 0, passed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const all = X.ALL_TEAMS;
const clubs = [...X.CLUBS, ...X.NATIONAL.flat()];   // every side that is not a nation: Local and the national leagues

// 1. the lists
{
  const ids = all.map(t => t.id);
  ok(new Set(ids).size === ids.length, `every team code is unique (${ids.join(' ')})`);
  ok(X.NATIONS.map(t => t.id).slice(0, 6).join() === 'ENG,FRA,IRE,ITA,SCO,WAL', 'the six nations keep their order, which saved championships index into');
  // re-pinned at the official tables: Canada (CDN: CAN is Canberra's) and the USA appended for the women's twelve
  ok(X.NATIONS.map(t => t.id).join() === 'ENG,FRA,IRE,ITA,SCO,WAL,NZL,RSA,AUS,ARG,FIJ,JPN,CDN,USA', 'then New Zealand, South Africa, Australia, Argentina, Fiji and Japan, then Canada and the USA: fourteen');
  ok(X.CLUBS[0].id === 'FAR', 'Farnham comes first in Local');
  ok(X.CLUBS.length >= 6, `Local has enough clubs for a championship (${X.CLUBS.length})`);
  ok(X.POOLS.length === 10 && X.POOLS.every((p, i) => p === X.TEAM_LISTS[i].teams), 'POOLS is every built-in list, in the team screen\'s order');
  ok(X.POOLS.every(p => p.length >= 6), `every list has enough sides for a championship (${X.POOLS.map(p => p.length).join(' ')})`);
  ok(X.FRANCE.length === 14, `France is the Top 14 (${X.FRANCE.length})`);
  ok(all.length === X.POOLS.reduce((a, p) => a + p.length, 0), 'ALL_TEAMS is every list');
  ok(X.NATIONS.filter(t => t.home).map(t => t.id).join() === 'ENG,IRE,SCO,WAL', 'the home nations are England, Ireland, Scotland and Wales');
  const R = ['pace', 'power', 'handling', 'kicking', 'stamina'];
  ok(all.every(t => R.every(k => Number.isInteger(t[k]) && t[k] >= 1 && t[k] <= 5)), 'every rating is 1 to 5');
  const top = Math.max(...clubs.map(t => R.reduce((a, k) => a + t[k], 0)));
  ok(top <= 5 + X.BUDGET, `no club is stronger than a team you can make (${top} v ${5 + X.BUDGET})`);   // a team with no level; PR #14's levels go to 90 (European Champions), and where they sit against main's club band is the teams builder's (README, integration list)
  ok(all.every(t => /^#[0-9a-f]{6}$/i.test(t.kit) && /^#[0-9a-f]{6}$/i.test(t.trim)), 'every kit colour is a hex');
  ok(X.overallOf({ pace:1, power:1, handling:1, kicking:1, stamina:1 }) === 40 && X.overallOf({ pace:5, power:5, handling:5, kicking:5, stamina:5 }) === 99, 'the overall rating runs 40 to 99');
  // re-pinned at the official men's table: France 87.43 points, 21 (87), was 23 (93)
  ok(X.overallOf(X.NATIONS[1]) === 87 && X.overallOf({ pace:5, power:5, handling:3, kicking:2, stamina:2 }) === 75, `France is 87 and a team you make tops out at 75 (${X.overallOf(X.NATIONS[1])})`);
  ok(all.every(t => { const o = X.overallOf(t); return Number.isInteger(o) && o >= 40 && o <= 99; }), 'every built-in team has a whole-number overall');
}

// 2. no two shirts on the pitch too alike, for every pairing of built-in teams
{
  const bad = [];
  for (const a of all) for (const b of all) {
    if (a === b) continue;
    const k = X.awayKit(a, b);
    if (X.colorDist(a.kit, k.fill) < 140) bad.push(`${a.id} v ${b.id}`);
  }
  ok(bad.length === 0, `every pairing has shirts far enough apart (${bad.length} clash: ${bad.slice(0, 8).join(', ')})`);
  const far = X.CLUBS.find(t => t.id === 'FAR'), wey = X.CLUBS.find(t => t.id === 'WEY');
  const k = X.awayKit(far, wey);
  ok(k.fill !== wey.kit, 'Weybridge change shirts against Farnham, both being black');
  const own = X.awayKit(X.NATIONS[0], far);
  ok(own.fill === far.kit && own.hoops === true, 'a hooped side keeps its hoops when it plays in its own colours (England v Farnham)');
  const swapped = X.awayKit(X.NATIONS[1], far);
  ok(swapped.fill === far.trim && swapped.hoops === true, 'and keeps them when it swaps its colours (France v Farnham)');
}

// 3. matches with clubs and a team you made
{
  const mine = X.cleanTeam({ name: 'Badgers', kit: '#f2b01e', trim: '#1c1c1c', hoops: true, pace: 5, power: 5, handling: 3, kicking: 1 }, 0);
  T.newMatch(mine, X.CLUBS[0], { halfLen: 60, diff: 1, auto: true, headless: true });
  const M = T.M;
  ok(M.nat[0].name === 'Badgers' && M.nat[1].id === 'FAR', 'newMatch takes team objects');
  ok(M.kit[0].hoops === true, 'your hoops reach the pitch');
  let steps = 0; while (!M.over && steps < 200000) { T.update(STEP); steps++; }
  ok(M.over, `a club match plays to the end (${M.score.join('-')})`);
  T.newMatch(0, 1, { halfLen: 60, diff: 1, auto: true, headless: true });
  ok(T.M.nat[0].id === 'ENG' && T.M.nat[1].id === 'FRA', 'newMatch still takes nation indexes, as the tools use');
}

// 4. a team you make is put right, never trusted
{
  const t = X.cleanTeam({ name: '  A   very long team name indeed ', kit: 'red', trim: '#zzzzzz', pace: 9, power: 9, handling: 9, kicking: 9, id: 'q1' }, 3);
  ok(t.name.length <= 16 && !/\s\s/.test(t.name) && t.name === t.name.trim(), `names are tidied and cut to 16 (${JSON.stringify(t.name)})`);
  ok(t.kit === '#2050b0' && t.trim === '#f2efe6', 'bad colours fall back');
  const sum = t.pace + t.power + t.handling + t.kicking + t.stamina;
  ok(sum === 5 + X.BUDGET && [t.pace, t.power, t.handling, t.kicking, t.stamina].every(v => v >= 1 && v <= 5), `abilities are held to the budget (${sum})`);
  // a team's level sets what it can spend; a team with no level, from an old save, keeps 12 and is cut as it always was
  { const R5 = T.ratings, K = ['pace', 'power', 'handling', 'kicking', 'stamina'], total = v => K.reduce((a, k) => a + v[k], 0), full = { name:'Otters', pace:5, power:5, handling:5, kicking:5, stamina:5 };
    ok(!('level' in t) && R5.teamBudget({}) === 12 && R5.teamBudget({ level:'nope' }) === 12 && R5.teamBudget(null) === 12, 'no level, or one the game does not know, is the old budget of 12');
    ok(!('level' in X.cleanTeam({ ...full, level:'nope' }, 0)) && total(X.cleanTeam({ ...full, level:'nope' }, 0)) === 17, 'and a level the game does not know is dropped');
    for (const l of R5.TEAM_LEVELS) {
      const c = X.cleanTeam({ ...full, level:l.id }, 0), back = X.cleanTeam(JSON.parse(JSON.stringify(c)), 0);
      ok(c.level === l.id && total(c) === 5 + l.budget && X.overallOf(c) === l.overall && JSON.stringify(back) === JSON.stringify(c), `${l.name}: held to ${l.budget} points, ${l.overall} overall, and reloading loses nothing (${K.map(k => c[k]).join('')})`);
    }
    const c3 = X.cleanTeam({ name:'Cubs', level:'c3', pace:3, power:1, handling:1, kicking:1, stamina:1 }, 0);
    ok(c3.pace === 2 && total(c3) === 6, 'the cut falls from the last in line, as it always has');
    const under = X.cleanTeam({ name:'Tenners', level:'top', pace:2, power:2, handling:2, kicking:2, stamina:2 }, 0);
    ok(total(under) === 10 && X.overallOf(under) === 55 && under.level === 'top', 'a team under its level keeps what it has');
    const old13 = X.cleanTeam({ key:'my1', name:'Old13', pace:5, power:5, handling:3, kicking:1, stamina:1 }, 0), old17 = X.cleanTeam({ key:'my2', name:'Old17', pace:5, power:5, handling:3, kicking:3, stamina:1 }, 0);
    ok(K.map(k => old13[k]).join('') === '55311' && K.map(k => old17[k]).join('') === '55331' && !('level' in old13), 'old saves: teams at and under the old 12 points keep every ability, with no level');
    const c0 = X.cleanSide({ ...under, league:'x' });
    ok(!('level' in c0), 'a side in a saved championship or career holds no level: it keeps its abilities as they are');
  }
  ok(t.id === 'QAV', `the short name is letters only, topped up from the name (${t.id})`);
  ok(X.codeFor('', 'Old Ruts') === 'OLD' && X.codeFor('ab', 'x') === 'ABX', 'short names fill to three letters');
  ok(X.cleanTeam({ name: '' }, 0).name === 'My Team', 'an empty name becomes My Team');
  ok(X.cleanTeam({ name: 'x', pace: 0, power: -3 }, 0).pace === 1, 'abilities never drop below 1');
}

// 5. championships
function playOut() {
  for (let r = 0; r < 5; r++) {
    const c = X.champ();
    const pair = c.fixtures[c.round].find(p => p[0] === c.user || p[1] === c.user);
    const opp = pair[0] === c.user ? pair[1] : pair[0];
    T.newMatch(c.teams[c.user], c.teams[opp], { halfLen: 60, diff: 1, headless: true, champ: true, duels: 'off' });
    T.M.score = [24, 10]; T.M.tries = [4, 2];
    X.recordChampResult();
  }
  return X.champ();
}
{
  X.newChamp(X.CLUBS[0], X.CLUBS.slice(1));
  let c = X.champ();
  ok(c.teams.length === 6 && c.user === 0 && c.teams[0].id === 'FAR', 'a Local championship is your club and five others');
  c = playOut();
  const rows = X.standings(c);
  ok(rows.length === 6 && rows.every(r => r.P === 5), 'every club plays five');
  const me = rows.find(r => r.i === c.user);
  ok(me.W === 5 && me.gs && rows[0].i === c.user, 'five wins tops the table with a Grand Slam');
  ok(X.chaseTitle(c, rows) === 'Grand Slam' && X.chaseLine(c, rows) === 'Farnham win the Grand Slam', `a local slam reads as one (${X.chaseLine(c, rows)})`);
  const hon = X.honours(c, rows).map(h => h[0]);
  ok(!hon.includes('Triple Crown') && hon.includes('Wooden Spoon') && hon.includes('Champions'), `no Triple Crown without the home nations (${hon.join(', ')})`);
}
{
  const mine = X.cleanTeam({ name: 'Badgers', pace: 5, power: 5 }, 0);
  const nations = X.NATIONS.filter(n => n.id !== 'SCO');
  X.newChamp(mine, nations);
  const c = playOut();
  // England beat the other home nations present, so only the four-nation rule can keep the Triple Crown away
  const id = i => c.teams[i].id;
  for (const r of c.results.flat()) {
    if (!c.teams[r.h].home || !c.teams[r.a].home) continue;
    const engHome = id(r.h) === 'ENG', engAway = id(r.a) === 'ENG';
    if (engHome || (!engAway && id(r.h) < id(r.a))) { r.hs = 20; r.as = 3; } else { r.hs = 3; r.as = 20; }
  }
  const rows = X.standings(c), hon = X.honours(c, rows).map(h => h[0]);
  ok(c.teams[0].name === 'Badgers' && c.teams.filter(t => t.home).length === 3, 'your team can take a nation\'s place');
  ok(!hon.includes('Triple Crown'), `no Triple Crown with a home nation missing, even when England beat the others (${hon.join(', ')})`);
  mine.name = 'Changed';
  ok(X.champ().teams[0].name === 'Badgers', 'editing a team later leaves a championship under way alone');
}
{
  X.newChamp(X.NATIONS[2], X.NATIONS.filter(n => n.id !== 'IRE'));
  const c = playOut(), hon = X.honours(c, X.standings(c)).map(h => h[0]);
  ok(c.teams[c.user].id === 'IRE' && hon.includes('Triple Crown'), `the Six Nations still has its Triple Crown (${hon.join(', ')})`);
  ok(X.chaseTitle(c, X.standings(c)) === 'Grand Slam' && X.chaseLine(c, X.standings(c)) === 'Ireland win the Grand Slam and the Triple Crown', `the Six Nations slam names both prizes (${X.chaseLine(c, X.standings(c))})`);
}

// 5b. fair draws, and the scoreboard always tells the sides apart
{
  const seen = {}, N = 6000;
  for (let i = 0; i < N; i++) for (const t of X.shuffle(X.CLUBS.slice(1)).slice(0, 5)) seen[t.id] = (seen[t.id] || 0) + 1;
  const rates = Object.values(seen).map(v => v / N), want = 5 / (X.CLUBS.length - 1);
  ok(rates.length === X.CLUBS.length - 1 && rates.every(r => Math.abs(r - want) < 0.03), `each club is drawn about as often (${rates.map(r => r.toFixed(2)).join(' ')}, want ${want.toFixed(2)})`);
  ok(X.autoCode('Farnham Minis') === 'FAN' && X.autoCode('My Team') === 'MYT' && X.autoCode('Kingston Colts') !== 'KIN', `the short name filled in for you skips codes in use (${X.autoCode('Farnham Minis')}, ${X.autoCode('Kingston Colts')})`);
  const minis = X.cleanTeam({ name: 'Farnham Minis', id: 'FAR' }, 0);
  T.newMatch(minis, X.CLUBS[0], { halfLen: 60, diff: 1, headless: true, duels: 'off' });
  ok(T.M.nat[0].id === 'FAR' && T.M.nat[1].id === 'FA2' && X.CLUBS[0].id === 'FAR', 'two sides with one code: the away side shows another for that match, and the club is unchanged');
  const gold = X.cleanTeam({ name: 'Bees', kit: '#f2b01e', trim: '#1c1c1c' }, 0);
  T.newMatch(gold, X.CLUBS[0], { halfLen: 60, diff: 1, headless: true, duels: 'off' });
  ok(T.M.kit[1].fill === '#1a1a1a' && X.showCol(1) === '#f2efe6', 'a black away shirt shows on the dark plates in its trim');
  const night = X.cleanTeam({ name: 'Night', kit: '#1c1c1c', trim: '#1c1c1c' }, 0);
  T.newMatch(X.NATIONS[0], night, { halfLen: 60, diff: 1, headless: true, duels: 'off' });
  ok(X.showCol(1) === '#f1eee4', 'black on black falls back to chalk');
}

// 6. a championship saved before clubs existed still loads
{
  X.newChamp(X.NATIONS[0], X.NATIONS.slice(1));
  const fresh = X.champ();
  const old = { user: 2, round: 1, fixtures: fresh.fixtures, results: [fresh.fixtures[0].map(([h, a]) => ({ h, a, hs: 10, as: 5, ht: 2, at: 1 }))] };
  X.setChamp(null);
  X.restore({ settings: { half: 1 }, champ: old });
  const c = X.champ();
  ok(Array.isArray(c.teams) && c.teams.length === 6 && c.teams[2].name === 'Ireland' && c.user === 2, 'an old championship gets the six nations, in index order');
  const rows = X.standings(c);
  ok(rows.reduce((a, r) => a + r.P, 0) === 6, 'and its table still adds up');
  X.restore({ custom: [{ name: 'A' }, { name: 'B' }, null, { name: 'C' }, { name: 'D' }, { name: 'E' }, 'junk'] });
  ok(X.custom().length === 4 && X.custom().every(t => t.custom && t.key), 'saved teams are cleaned and capped at four');
  X.restore({ settings: { pool: 7 } });
  ok(T.debug.settings().pool === 'int', 'a bad list choice falls back to International');
}

// 7. the menu, and a save that survives a reload
{
  const html = readGameSource();
  const quick = html.indexOf('id="b-quick"'), champBtn = html.indexOf('id="b-champ"');
  ok(quick > 0 && champBtn > quick, 'Quick Match comes before Championship');
  ok(/<button class="btn primary" id="b-quick" autofocus>Play<\/button>/.test(html) && /<span class="hl-name">Quick Match<\/span>/.test(html), 'Quick Match\'s Play is the primary button and takes focus');
  ok(!html.includes('data-key="duels"'), 'the Duels switch is gone');
  ok(html.includes("duels:'live'"), 'a match you play passes live duels');
  ok(/<dt class="web-only">Saving<\/dt>/.test(html) && /<dt class="app-only" hidden>Saving<\/dt>/.test(html) && html.includes('Start Fresh'), 'How to Play explains saving and starting fresh');

  X.newChamp(X.NATIONS[0], X.NATIONS.slice(1));
  const c0 = X.champ();
  const pair = c0.fixtures[c0.round].find(p => p.includes(c0.user));
  const opp = pair[0] === c0.user ? pair[1] : pair[0];
  T.newMatch(c0.teams[c0.user], c0.teams[opp], { halfLen: 60, diff: 1, headless: true, champ: true, duels: 'off' });
  T.M.score = [19, 7]; T.M.tries = [3, 1];
  X.recordChampResult();
  const played = JSON.parse(JSON.stringify(X.champ()));
  X.setChamp(null);
  X.restore({
    settings: { half: 2, diff: 0, sound: false, duels: false, hints: false, twoHints: [false, true], tut: ['goal', 'bogus', 'past'], pool: 1, cat: 'women' },
    champ: played,
    custom: [{ name: 'Wasps', pace: 9, power: 9, handling: 9, kicking: 9 }],
  });
  const s = T.debug.settings();
  ok(s.duels === true && s.half === 2 && s.diff === 0 && s.sound === false && s.hints === false && s.twoHints[0] === false && s.twoHints[1] === true && s.tut.join() === 'past,goal' && s.pool === 'sur' && s.cat === 'women', 'settings load (Hints, each player\'s Hints, the tutorial moments seen in the game\'s order with an unknown one dropped), and an old duels-off save is turned on (an old Local is Surrey)');
  T.debug.settings().cat = 'men';
  const c = X.champ();
  ok(c && c.round === 1 && c.results.length === 1 && JSON.stringify(c.fixtures) === JSON.stringify(played.fixtures), 'fixtures, results and the round load back');
  ok(c.teams.find(t => t.id === 'ENG').alt === '#1b2747' && c.teams.filter(t => t.home).length === 4, 'change kits and home nations survive a reload');
  ok(X.standings(c).reduce((a, r) => a + r.P, 0) === 6, 'a reloaded table still adds up');
  ok(X.custom().length === 1 && X.custom()[0].name === 'Wasps' && X.custom()[0].pace + X.custom()[0].power + X.custom()[0].handling + X.custom()[0].kicking + X.custom()[0].stamina === 5 + X.BUDGET, 'a saved team is kept and held to the budget');

  X.restore({ settings: { half: 9, diff: 'hard', sound: 0, duels: false, pool: 7, hints: 'yes', twoHints: [true], tut: 'past', cat: 'girls' } });
  const s2 = T.debug.settings();
  ok(s2.half === 2 && s2.diff === 0 && s2.sound === false && s2.duels === true && s2.pool === 'int' && s2.cat === 'men' && s2.hints === false && s2.twoHints[1] === true && s2.tut.join() === 'past,goal', 'bad settings are ignored (a string for Hints, a short twoHints, a string for the tutorial, an unknown category) and duels stay on');
  X.restore({ champ: { user: 0, round: 3, teams: [], fixtures: null, results: {} } });
  ok(X.champ() == null && X.custom().length === 1 && T.debug.settings().half === 2, 'a broken championship is dropped and the rest of the save stays');

  const kept = globalThis.localStorage;
  const mem = { 'tryline.v1': '{' };
  globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
  X.load();
  ok(X.champ() == null && T.debug.settings().half === 2 && T.debug.settings().duels === true, 'unreadable storage is left alone');
  mem['tryline.v1'] = JSON.stringify({ settings: { half: 0, duels: false }, champ: played, custom: [] });
  X.load();
  ok(T.debug.settings().half === 0 && T.debug.settings().duels === true && X.champ().round === 1 && X.custom().length === 0, 'load reads a save and turns duels on');
  T.debug.settings().duels = false;
  X.save();
  const written = JSON.parse(mem['tryline.v1']);
  ok(written.settings.duels === true && written.champ.round === 1 && written.champ.fixtures.length === 5, 'a save never stores duels as off');
  globalThis.localStorage = { getItem: () => null, setItem() { throw new Error('quota'); } };
  X.newChamp(X.NATIONS[0], X.NATIONS.slice(1));
  ok(X.champ() && X.champ().teams.length === 6 && X.champ().round === 0, 'a blocked save still starts the championship');
  globalThis.localStorage = kept;
}

// 8. the chase between fixtures. The points rules are the ones the table already uses.
function scriptRounds(n, user, others) {
  X.newChamp(X.CLUBS[0], X.CLUBS.slice(1));
  for (let r = 0; r < n; r++) {
    const c = X.champ();
    c.results.push(c.fixtures[c.round].map(([h, a]) => {
      if (h === c.user) return { h, a, hs: user[0], as: user[1], ht: user[2], at: user[3] };
      if (a === c.user) return { h, a, hs: user[1], as: user[0], ht: user[3], at: user[2] };
      return { h, a, hs: others[0], as: others[1], ht: others[2], at: others[3] };
    }));
    c.round++;
  }
  return X.champ();
}
function settle(pick) {
  const c = X.champ();
  c.results = c.fixtures.map(rd => rd.map(([h, a]) => ({ h, a, ...pick(h, a, c) })));
  c.round = 5;
  return c;
}
{
  X.newChamp(X.CLUBS[0], X.CLUBS.slice(1));
  let c = X.champ(), rows = X.standings(c);
  ok(X.chaseLine(c, rows) === 'Five rounds. Top the table.' && X.fixtureStake(c, rows) === '' && X.champNote(c) === 'Farnham · Round 1 of 5', `a new championship has no table to read yet (${X.chaseLine(c, rows)})`);
  X.renderHub();
  const next = document.getElementById('hub-next').innerHTML;
  ok(document.getElementById('hub-title').textContent === 'Round 1 of 5' && document.getElementById('hub-chase').textContent === 'Five rounds. Top the table.' && !document.getElementById('hub-chase').classList.contains('payoff'), 'the hub opens on the round, not a prize');
  ok(next.includes('Play Match') && next.includes('Also This Round') && next.includes('Still to Come') && next.includes('Round 2 ·') && next.includes('Round 5 ·') && !next.includes('class="stake"'), 'the other two games and the four still to come are on the card, and this match has no stake yet');
  ok((document.getElementById('hub-table').innerHTML.match(/class="rk">–/g) || []).length === 6, 'an unplayed table is numbered with dashes, not a pretend lead');

  c = scriptRounds(1, [0, 20, 0, 3], [10, 10, 2, 2]);
  rows = X.standings(c);
  ok(/^\d.., \d+ points behind\. Still in it$/.test(X.chaseLine(c, rows)) && X.fixtureStake(c, rows) === '', `one loss, four to play: still in it, and this match does not have to be a win (${X.chaseLine(c, rows)})`);
  ok(X.champNote(c).startsWith('Farnham · ') && X.champNote(c).endsWith(' · Round 2 of 5'), `the home line carries the place (${X.champNote(c)})`);

  c = scriptRounds(4, [20, 0, 3, 0], [10, 10, 2, 2]);
  rows = X.standings(c);
  const me = rows.find(r => r.i === c.user);
  ok(me.Pts === 16 && me.W === 4 && X.chaseLine(c, rows) === 'Champions, with a round to play' && X.fixtureStake(c, rows) === 'For the Grand Slam', `four wins, and nobody can catch 16: the title is safe and the last game is the slam (${X.chaseLine(c, rows)} / ${X.fixtureStake(c, rows)})`);
  ok(X.champNote(c) === 'Farnham · Champions · Round 5 of 5', `the home line says the title is safe (${X.champNote(c)})`);
  X.renderHub();
  ok(document.getElementById('hub-chase').classList.contains('payoff') && document.getElementById('hub-next').innerHTML.includes('For the Grand Slam') && document.getElementById('hub-next').innerHTML.includes('Also This Round') && !document.getElementById('hub-next').innerHTML.includes('Still to Come'), 'the last round keeps the other games and the slam, and drops the run-in');
  ok(document.getElementById('hub-table').innerHTML.includes('class="rk">1'), 'a started table is numbered');

  // The leader is the side you play. Beating them denies them a win, and the slam that would come with it.
  X.newChamp(X.CLUBS[0], X.CLUBS.slice(1));
  c = X.champ(); c.round = 4; c.fixtures[4] = [[0, 1], [2, 3], [4, 5]];
  rows = [
    { i:1, P:4, W:4, D:0, L:0, Pts:16, PD:30, TF:8 },
    { i:0, P:4, W:3, D:1, L:0, Pts:14, PD:20, TF:8 },
    { i:2, P:4, W:2, D:0, L:2, Pts:8, PD:0, TF:4 },
    { i:3, P:4, W:1, D:1, L:2, Pts:6, PD:-10, TF:3 },
    { i:4, P:4, W:1, D:0, L:3, Pts:4, PD:-20, TF:2 },
    { i:5, P:4, W:0, D:0, L:4, Pts:0, PD:-20, TF:1 },
  ];
  ok(X.fixtureStake(c, rows) === 'A win takes the title' && X.chaseLine(c, rows) === '2nd, 2 points behind', `level enough that beating the leader takes it, and the line leaves that to the match (${X.chaseLine(c, rows)} / ${X.fixtureStake(c, rows)})`);

  // Same numbers, but the unbeaten side is someone else: they can still take the slam, so a win does not take the title.
  c.fixtures[4] = [[0, 2], [1, 3], [4, 5]];
  ok(X.fixtureStake(c, rows) === '', `a win is not the title while another side can still slam (${X.fixtureStake(c, rows) || 'no stake'})`);

  rows = [
    { i:0, P:4, W:3, D:1, L:0, Pts:16, PD:20, TF:8 },
    { i:1, P:4, W:3, D:0, L:1, Pts:15, PD:10, TF:6 },
    { i:2, P:4, W:2, D:0, L:2, Pts:8, PD:0, TF:4 },
    { i:3, P:4, W:1, D:0, L:3, Pts:4, PD:-10, TF:3 },
    { i:4, P:4, W:1, D:0, L:3, Pts:4, PD:-12, TF:2 },
    { i:5, P:4, W:0, D:0, L:4, Pts:0, PD:-8, TF:1 },
  ];
  c.fixtures[4] = [[0, 2], [1, 3], [4, 5]];
  ok(X.fixtureStake(c, rows) === 'A try-bonus win takes the title', `four more points leave them alive, five finishes it (${X.fixtureStake(c, rows)})`);

  rows = [
    { i:0, P:4, W:3, D:1, L:0, Pts:18, PD:40, TF:10 },
    { i:1, P:4, W:3, D:0, L:1, Pts:14, PD:8, TF:6 },
    { i:2, P:4, W:2, D:0, L:2, Pts:8, PD:0, TF:4 },
    { i:3, P:4, W:1, D:0, L:3, Pts:4, PD:-10, TF:3 },
    { i:4, P:4, W:1, D:0, L:3, Pts:4, PD:-12, TF:2 },
    { i:5, P:4, W:0, D:0, L:4, Pts:0, PD:-26, TF:1 },
  ];
  ok(X.fixtureStake(c, rows) === 'A draw is enough' && X.chaseLine(c, rows) === '1st, 4 points clear', `a draw, even with their try bonus, is clear of their best (${X.chaseLine(c, rows)})`);

  rows = [
    { i:1, P:4, W:4, D:0, L:0, Pts:16, PD:40, TF:10 },
    { i:0, P:4, W:3, D:0, L:1, Pts:12, PD:4, TF:6 },
    { i:2, P:4, W:2, D:0, L:2, Pts:8, PD:0, TF:4 },
    { i:3, P:4, W:1, D:0, L:3, Pts:4, PD:-10, TF:3 },
    { i:4, P:4, W:1, D:0, L:3, Pts:4, PD:-14, TF:2 },
    { i:5, P:4, W:0, D:0, L:4, Pts:0, PD:-20, TF:1 },
  ];
  c.fixtures[4] = [[0, 2], [1, 3], [4, 5]];
  ok(X.fixtureStake(c, rows) === 'Must win to stay in it' && X.chaseLine(c, rows) === '2nd, 4 points behind', `a draw leaves 15, short of 16 already on the board (${X.chaseLine(c, rows)} / ${X.fixtureStake(c, rows)})`);

  rows = [
    { i:1, P:4, W:4, D:0, L:0, Pts:16, PD:40, TF:10 },
    { i:0, P:4, W:2, D:0, L:2, Pts:8, PD:-20, TF:4 },
    { i:2, P:4, W:2, D:0, L:2, Pts:8, PD:-4, TF:4 },
    { i:3, P:4, W:1, D:0, L:3, Pts:4, PD:-10, TF:3 },
    { i:4, P:4, W:1, D:0, L:3, Pts:4, PD:-12, TF:2 },
    { i:5, P:4, W:0, D:0, L:4, Pts:0, PD:-8, TF:1 },
  ];
  ok(X.fixtureStake(c, rows) === '' && X.chaseLine(c, rows) === '2nd, 8 points behind, and out of the title', `13 is the best left, and the leader already has 16 (${X.chaseLine(c, rows)})`);

  // A save from before clubs can have the user at any index. The chase follows c.user.
  c.user = 2; c.fixtures[4] = [[2, 0], [1, 3], [4, 5]];
  rows = [
    { i:0, P:4, W:4, D:0, L:0, Pts:16, PD:20, TF:8 },
    { i:2, P:4, W:3, D:0, L:1, Pts:12, PD:0, TF:6 },
    { i:1, P:4, W:2, D:0, L:2, Pts:8, PD:0, TF:4 },
    { i:3, P:4, W:1, D:0, L:3, Pts:4, PD:-8, TF:3 },
    { i:4, P:4, W:1, D:0, L:3, Pts:4, PD:-10, TF:2 },
    { i:5, P:4, W:0, D:0, L:4, Pts:0, PD:-2, TF:1 },
  ];
  ok(X.chaseLine(c, rows) === '2nd, 4 points behind' && X.fixtureStake(c, rows) === 'Must win to stay in it', `the chase follows whichever index you are (${X.chaseLine(c, rows)})`);

  X.newChamp(X.CLUBS[0], X.CLUBS.slice(1));
  c = settle((h, a) => {
    if (h === 1 || a === 1) return h === 1 ? { hs:20, as:0, ht:2, at:0 } : { hs:0, as:20, ht:0, at:2 };
    if (h === 0 || a === 0) return h === 0 ? { hs:15, as:5, ht:2, at:1 } : { hs:5, as:15, ht:1, at:2 };
    return { hs:10, as:10, ht:2, at:2 };
  });
  rows = X.standings(c);
  ok(rows[0].i === 1 && rows.findIndex(r => r.i === 0) === 1, 'Haslemere won the lot, Farnham the rest');
  ok(X.chaseTitle(c, rows) === 'Runners-Up' && X.chaseLine(c, rows) === 'Farnham finish 2nd, 7 points short of ' + c.teams[1].name, `second reads as the gap to the champion (${X.chaseLine(c, rows)})`);
  X.renderHub();
  X.renderHome();
  ok(document.getElementById('hub-title').textContent === 'Runners-Up' && !document.getElementById('hub-title').classList.contains('gold') && !document.getElementById('hub-chase').classList.contains('payoff') && document.getElementById('hub-next').innerHTML.includes('New Championship') && !document.getElementById('hub-next').innerHTML.includes('Play Match'), 'a finished season headlines the place, and offers a new one');
  ok(document.getElementById('b-champ').textContent === 'Final Table' && document.getElementById('champ-note').innerHTML === '<span class="rn-name">Farnham · </span>Runners-Up' && document.getElementById('champ-note').hidden === false, 'home keeps the finished season as Final Table (the team\'s name a span a phone held sideways leaves out)');

  X.newChamp(X.CLUBS[0], X.CLUBS.slice(1));
  c = settle((h, a) => {
    if ((h === 0 && a === 1) || (h === 1 && a === 0)) return { hs:10, as:10, ht:2, at:2 };
    if (h === 0 || a === 0) return h === 0 ? { hs:30, as:0, ht:2, at:0 } : { hs:0, as:30, ht:0, at:2 };
    if (h === 1 || a === 1) return h === 1 ? { hs:10, as:0, ht:2, at:0 } : { hs:0, as:10, ht:0, at:2 };
    return { hs:10, as:10, ht:2, at:2 };
  });
  rows = X.standings(c);
  ok(rows[0].i === c.user && rows[0].Pts === rows[1].Pts && X.chaseTitle(c, rows) === 'Champions' && X.chaseLine(c, rows) === 'Farnham win the championship, ahead on points difference', `level on points, first on points difference (${X.chaseLine(c, rows)})`);
  X.renderHub();
  ok(document.getElementById('hub-title').classList.contains('gold') && document.getElementById('hub-title').textContent === 'Champions', 'winning the championship turns the title gold');

  X.newChamp(X.NATIONS[2], X.NATIONS.filter(n => n.id !== 'IRE'));
  c = X.champ();
  const nid = i => c.teams[i].id;
  c.results = c.fixtures.map(rd => rd.map(([h, a]) => {
    const H = nid(h), A = nid(a), ire = H === 'IRE' ? h : A === 'IRE' ? a : -1;
    if (ire < 0) return { h, a, hs:10, as:10, ht:2, at:2 };
    const other = h === ire ? A : H, win = other === 'ENG' || other === 'SCO' || other === 'WAL';
    if (h === ire) return { h, a, hs: win ? 20 : 0, as: win ? 0 : 20, ht: win ? 3 : 0, at: win ? 0 : 3 };
    return { h, a, hs: win ? 0 : 20, as: win ? 20 : 0, ht: win ? 0 : 3, at: win ? 3 : 0 };
  }));
  c.round = 5;
  rows = X.standings(c);
  const hon = X.honours(c, rows).filter(h => h[1] === c.user).map(h => h[0]);
  ok(hon.includes('Triple Crown') && !hon.includes('Champions') && X.chaseTitle(c, rows) === 'Triple Crown' && X.chaseLine(c, rows).startsWith('Ireland take the Triple Crown, and finish '), `the crown without the title (${X.chaseLine(c, rows)}; ${hon.join(', ')})`);

  X.newChamp(X.CLUBS[0], X.CLUBS.slice(1));
  c = scriptRounds(5, [0, 20, 0, 3], [10, 10, 2, 2]);
  rows = X.standings(c);
  ok(X.chaseTitle(c, rows) === 'Wooden Spoon' && X.chaseLine(c, rows) === 'Farnham take the Wooden Spoon', `five losses is the spoon (${X.chaseLine(c, rows)})`);

  c = scriptRounds(4, [0, 20, 0, 3], [10, 10, 2, 2]);
  rows = X.standings(c);
  ok(X.chaseLine(c, rows) === '6th, 10 points behind, and out of the title' && X.fixtureStake(c, rows) === '', `four losses on the real table, and five more points cannot catch ten (${X.chaseLine(c, rows)})`);

  // Full time stays the score, the result and the table points. The chase is the hub, not this card.
  X.newChamp(X.CLUBS[0], X.CLUBS.slice(1));
  c = X.champ();
  const pair = c.fixtures[c.round].find(p => p.includes(c.user));
  const opp = pair[0] === c.user ? pair[1] : pair[0];
  T.newMatch(c.teams[c.user], c.teams[opp], { halfLen: 60, diff: 1, headless: true, champ: true, duels: 'off' });
  T.M.score = [19, 7]; T.M.tries = [3, 1];
  X.recordChampResult();
  T.debug.showBreak('full');
  ok(document.getElementById('br-pts').hidden === false && document.getElementById('br-pts').textContent === '+4 Table Points · Win' && document.getElementById('br-tries').textContent === 'Farnham Win · Tries 3 – 1', `full time is still the result and the table points (${document.getElementById('br-pts').textContent})`);
}

// 9. the gentler start, and a championship that runs from the weakest opponent to the strongest
{
  const E = X.EARLY, C = T.contact, D = T.debug, s = D.settings();
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const speed = (pace, mul) => (7.6 + pace * 0.25) * mul;
  ok(E.games === 2 && E.gap === 3 && E.nudge.cpuSpeed === -0.03 && E.nudge.myTackle === 0.14, 'two Normal matches and a gap of three');
  const far = X.CLUBS[0], has = X.CLUBS[1], fra = X.NATIONS[1], eng = X.NATIONS[0];
  const ita = X.NATIONS[3];   // re-pinned when the nations were rated on the XV hierarchy: England (18 in the four, was 16) is now a Stronger Side than Farnham (14); Italy (15) is the nation that is not
  ok(!X.outmatched(far, has) && !X.outmatched(far, ita) && X.outmatched(far, fra) && X.outmatched(far, eng), 'France and England are stronger sides than Farnham; Italy and Haslemere are not');
  ok(X.rateOf(fra) === 21 && X.rateOf(far) === 17 && X.rateOf(has) === 14, `rating totals France ${X.rateOf(fra)} Farnham ${X.rateOf(far)} Haslemere ${X.rateOf(has)}`);   // re-pinned at the official men's table: France 23 to 21
  // Stronger Side leaves Stamina out, so it marks the pairs it did before Stamina: within a pool, as the hub shows them
  const by = id => X.ALL_TEAMS.find(t => t.id === id), marks = (u, t) => X.outmatched(by(u), by(t));
  // re-pinned when the leagues were rated on their XV tables: Adelaide is now two points off Sydney and Canberra, so Taranaki v Hamilton and Llanelli v Dublin stand in
  // re-pinned at the official men's table: England (17 in the four) is two off Wales (15), so Ireland (18) stands in
  ok(marks('HAS', 'FAR') && marks('IRO', 'QUI') && marks('TAR', 'HMN') && marks('LLA', 'DUB') && marks('KIM', 'PRE') && marks('MBO', 'CPT') && marks('WAL', 'IRE') && marks('PGN', 'TLS'),
    'a side three points stronger in Pace, Power, Handling and Kicking is marked, whatever the Stamina');
  ok(!marks('GDN', 'WIM') && !marks('MTB', 'CLE'), 'two points apart in the four and Stamina on top is not a Stronger Side');
  ok(X.outmatched(X.cleanTeam({ name: 'Cubs', pace: 2, power: 2, handling: 2, kicking: 2 }, 0), far) && X.outmatched({ ...X.NATIONS[5], stamina: undefined }, { ...X.NATIONS[2], stamina: undefined }), 'an old weak team and a championship side saved before Stamina are marked as before');   // re-pinned with the line above: Wales v Ireland, not England

  T.newMatch(far, has, { halfLen: 30, diff: 1, headless: true, duels: 'off' });
  ok(!T.M.early && near(C.maxSpeed(T.M.players.find(p => p.team === 1)), speed(has.pace, 1)), 'a headless match is not eased, and Normal pace is unchanged');
  T.newMatch(0, 1, { halfLen: 30, diff: 1, auto: true, headless: true, early: true, duels: 'off' });
  ok(!T.M.early && T.M.auto, 'AI v AI ignores an early request');
  T.newMatch(0, 1, { halfLen: 30, diff: 1, demo: true, auto: true, early: true, headless: true });
  ok(!T.M.early && T.M.demo, 'the demo ignores an early request');
  T.newMatch(far, has, { halfLen: 30, diff: 0, headless: true, early: true, duels: 'off' });
  ok(!T.M.early, 'Easy is not eased further');
  T.newMatch(far, has, { halfLen: 30, diff: 2, headless: true, early: true, duels: 'off' });
  ok(!T.M.early && near(C.maxSpeed(T.M.players.find(p => p.team === 1)), speed(has.pace, 1.04)), 'Hard keeps its pace');
  T.newMatch(far, fra, { halfLen: 30, diff: 1, headless: true, humans: [true, true], early: true, duels: 'off' });
  ok(!T.M.early && T.M.two, 'two player is not eased');

  T.newMatch(far, fra, { halfLen: 30, diff: 1, headless: true, early: true, duels: 'off' });
  ok(T.M.early && document.getElementById('banner').innerHTML === '', 'an eased headless kick-off stays quiet, stronger side included');
  ok(near(C.maxSpeed(T.M.players.find(p => p.team === 1)), speed(fra.pace, 1 + E.nudge.cpuSpeed)) && near(C.maxSpeed(T.M.players.find(p => p.team === 0)), speed(far.pace, 1)), 'eased CPU pace, and yours is not');
  T.newMatch({ ...far, pace: 3, power: 3 }, { ...has, pace: 3, power: 3 }, { halfLen: 30, diff: 1, headless: true, early: true, duels: 'off' });   // level in Power, so the tackle chances are the plain lever's
  const q = T.M.players[0], opp = T.M.players[7], mate = T.M.players[8];
  q.x = opp.x = mate.x = 40; q.y = opp.y = mate.y = 35; opp.side = q.side = -1;
  ok(near(C.tackleChance(q, opp, 'ai', false), 0.48 + E.nudge.myTackle), `teammates tackle more surely (${C.tackleChance(q, opp, 'ai', false)})`);
  ok(near(C.tackleChance(mate, q, 'ai', false), 0.64), `the CPU's tackle is not eased (${C.tackleChance(mate, q, 'ai', false)})`);

  const five = ['QUI', 'HAS', 'GUI', 'ALD', 'WEY'].map(id => X.CLUBS.find(t => t.id === id));
  X.newChamp(far, five);
  const ch = X.champ();
  const opps = ch.fixtures.map(rd => { const p = rd.find(x => x[0] === ch.user || x[1] === ch.user); return p[0] === ch.user ? p[1] : p[0]; });
  ok(opps.map(i => X.rateOf(ch.teams[i])).join() === '14,16,16,16,17', `weakest first (${opps.map(i => ch.teams[i].id).join(' ')})`);
  ok(ch.teams.map(t => t.id).join() === 'FAR,QUI,HAS,GUI,ALD,WEY', 'the draw stays in the order it was given');

  const weak = X.cleanTeam({ name: 'Cubs', pace: 1, power: 1, handling: 1, kicking: 1 }, 0);
  X.newChamp(weak, five);
  D.renderHub();
  ok(document.getElementById('hub-next').innerHTML.includes('Stronger Side'), 'the hub names a stronger first opponent');
  X.newChamp(far, five);
  D.renderHub();
  ok(!document.getElementById('hub-next').innerHTML.includes('Stronger Side'), 'Farnham\'s weakest club opponent is not marked');

  D.openTeams('quick'); D.pickTeam(far); X.tierPick(0);   // Farnham picked by Player 1: the opponents
  const grid = document.getElementById('t-grid').innerHTML;
  const card = name => { const i = grid.indexOf('>' + name + '<'); return grid.slice(i, grid.indexOf('</button>', i)); };
  ok(card('France').includes('Stronger Side') && card('Ireland').includes('Stronger Side') && card('England').includes('Stronger Side') && !card('Italy').includes('Stronger Side') && !card('Japan').includes('Stronger Side'), 'Quick Match marks a side three points stronger');   // re-pinned at the XV ratings: England is now one, Italy and Japan are not
  X.tierPick(2);
  ok(!document.getElementById('t-grid').innerHTML.includes('Stronger Side'), 'no local card is marked stronger than Farnham');

  s.played = 0; s.tut = []; X.setChamp(null);
  X.restore({ settings: { tut: ['past'] } });
  ok(s.played === E.games && s.tut.join() === 'past', 'a save with a tutorial moment and no played count is past the gentler start');
  s.tut = []; X.setChamp(null);
  X.restore({ settings: { played: 0, tut: ['past'] } });
  ok(s.played === 0 && s.tut.join() === 'past', 'an explicit 0 is kept');
  s.played = 1; X.setChamp(null); s.tut = [];
  X.restore({ settings: { played: 100 } });
  ok(s.played === 1, 'a count above 99 is ignored');
  X.restore({ settings: { played: 1 } });
  ok(s.played === 1, 'a stored count loads');

  s.played = 0; s.diff = 1;
  D.startMatch(far, has, false);
  ok(T.M.early && s.played === 1 && !T.M.headless, 'the first Normal match is eased and counted');
  D.exitMatch();
  D.startMatch(far, has, false);
  ok(T.M.early && s.played === 2, 'the second is eased too');
  D.exitMatch();
  D.startMatch(far, has, false);
  ok(!T.M.early && s.played === 3, 'the third is full Normal');
  D.exitMatch();
  s.played = 0; s.diff = 0;
  D.startMatch(far, has, false);
  ok(!T.M.early && s.played === 1, 'an Easy match is counted and not eased');
  D.exitMatch();
  s.diff = 1; s.played = 0;
}

// 10. International | National | Local: the lists, the hierarchy and old saves
{
  const D = T.debug, s = D.settings(), $ = id => document.getElementById(id), L = X.TEAM_LISTS;
  const R = ['pace', 'power', 'handling', 'kicking', 'stamina'], total = t => R.reduce((a, k) => a + t[k], 0);
  ok(X.TEAM_TIERS.join() === 'International,National,Local', 'three tiers: International, National, Local');
  ok(L.map(l => l.key + ':' + l.tier).join() === 'int:0,eng:1,fra:1,cel:1,sco:1,rsa:1,aus:1,nzl:1,jpn:1,sur:2', 'International is one list; National is England, France, Celtic and Italy, Scotland, South Africa, Australia, New Zealand and Japan; Local is Surrey');
  ok(L.map(l => l.name).join() === 'International,England,France,Celtic and Italy,Scotland,South Africa,Australia,New Zealand,Japan,Surrey', 'each list is named by its country or county, never a competition');
  ok(L.every(l => l.teams.length >= 6), `every list offers at least six sides (${L.map(l => l.key + ' ' + l.teams.length).join(', ')})`);
  // re-pinned at the official tables: NATIONS is fourteen (Canada and the USA appended); each category's International is twelve
  ok([X.NATIONS, X.ENGLAND, X.FRANCE, X.CELTIC, X.SCOTLAND, X.SOUTH_AFRICA, X.AUSTRALIA, X.NEW_ZEALAND, X.JAPAN, X.CLUBS].map(l => l.length).join() === '14,10,14,12,10,7,6,6,7,12' && ['men', 'women', 'minis'].every(c => X.natList(c).length === 12), 'International 12 a category (14 nations in all), England 10, France 14, Celtic and Italy 12, Scotland 10, South Africa 7, Australia 6, New Zealand 6, Japan 7, Surrey 12');
  ok(X.ENGLAND.map(t => t.name).join() === 'Bath,Bristol,Exeter,Gloucester,Leicester,Newcastle,Northampton,Sale,London North,London West', 'England by city');
  ok(X.CELTIC.map(t => t.name).join() === 'Dublin,Limerick,Belfast,Galway,Edinburgh,Glasgow,Cardiff,Swansea,Llanelli,Newport,Treviso,Parma', 'Ireland, Scotland, Wales and Italy by city');
  ok(X.NEW_ZEALAND.map(t => t.name).join() === 'Auckland,Hamilton,Wellington,Christchurch,Dunedin,Taranaki', 'New Zealand by city, and Taranaki');
  ok(X.SCOTLAND.map(t => t.name).join() === 'Ayr,Currie,Goldenacre,Myreside,Kelso,Giffnock,Hawick,Melrose,Anniesland,Selkirk', 'Scotland: the Premiership\'s ten by town, and by district or ground in Edinburgh and Glasgow');
  ok(X.SCOTLAND.map(t => t.id).join() === 'AYR,CUR,GOL,MYR,KEL,GIF,HAW,MLR,ANN,SEL' && !X.SCOTLAND.some(t => ['GAL', 'GLA', 'GLO', 'MEL', 'EDI'].includes(t.id)), 'Scotland\'s codes, none of them Galway\'s, Glasgow\'s, Gloucester\'s, Melbourne\'s or Edinburgh\'s');
  const lower = all.map(t => t.name.toLowerCase());
  ok(new Set(lower).size === lower.length && X.CELTIC.some(t => t.id === 'EDI') && X.CELTIC.some(t => t.id === 'GLA') && !X.SCOTLAND.some(t => /edinburgh|glasgow/i.test(t.name)), 'no side is in two lists: Edinburgh and Glasgow stay with the professional sides');
  const avg = l => l.reduce((a, t) => a + total(t), 0) / l.length, others = X.NATIONAL.filter(l => l !== X.SCOTLAND).flat();
  // the XV hierarchy: each category's International is its World Rugby table's top twelve, in order (men's 3 November 2026, women's
  // 2 November 2026; README, Teams), five-ability sums by the points, every nation above every club. Re-pinned from the unofficial
  // men's table of 2 November (24 down to 19) when the official tables came in; the women's list is new.
  const MEN = { RSA:93.09, NZL:92.27, IRE:88.08, FRA:87.43, ENG:85.68, SCO:84.78, AUS:84.43, ARG:82.24, FIJ:77.85, WAL:76.38, ITA:76.30, JPN:76.23 };
  const WOMEN = { ENG:94.20, NZL:93.18, CDN:91.68, FRA:85.00, IRE:78.29, USA:77.50, AUS:77.18, ITA:71.99, SCO:71.25, RSA:70.76, WAL:70.12, FIJ:66.65 };
  const SUMS = { men:'23,23,21,21,20,20,20,19,18,18,18,18', women:'23,23,22,21,20,20,20,19,19,18,18,18' };
  const base = id => X.NATIONS.find(t => t.id === id);
  for (const [cat, table, sums] of [['men', MEN, SUMS.men], ['women', WOMEN, SUMS.women], ['minis', MEN, SUMS.men]]) {
    const l = X.natList(cat), pts = l.map(t => table[t.id]);
    ok(l.map(t => t.id).join() === Object.keys(table).join() && pts.every((p, i) => i === 0 || p < pts[i - 1]), `${cat}: the twelve in its table's order (${l.map(t => t.id).join(' ')})`);
    ok(l.map(total).join() === sums && l.every((t, i) => i === 0 || X.overallOf(t) <= X.overallOf(l[i - 1])), `${cat}: sums by the points (${l.map(t => t.id + ' ' + total(t) + ' ' + X.overallOf(t)).join(', ')})`);
    ok(Math.min(...l.map(total)) > Math.max(...clubs.map(total)), `${cat}: every nation above every club (${Math.min(...l.map(total))} v ${Math.max(...clubs.map(total))})`);
    ok(cat === 'men' ? l.every(t => t === base(t.id)) : l.every(t => t.cat === cat && t.name === base(t.id).name + (cat === 'women' ? ' Women' : ' Minis') && t.id === base(t.id).id && t.kit === base(t.id).kit && t.home === base(t.id).home), `${cat}: named by catSide, code, kit and home nation the nation's own${cat === 'men' ? ' (the NATIONS objects themselves)' : ''}`);
    ok(X.natList(cat) === l && X.natList(cat)[0] === l[0], `${cat}: the same list and the same sides every time`);
    if (cat !== 'women') ok(l.every(t => R.every(k => t[k] === base(t.id)[k])), `${cat}: the men's ratings`);
  }
  ok(X.natList('men').every(t => Math.abs(X.overallOf(t) - MEN[t.id]) < 2), `the men's overall sits within two of the points (${X.natList('men').map(t => t.id + ' ' + X.overallOf(t) + ' v ' + MEN[t.id]).join(', ')})`);
  const abil = l => l.map(t => R.map(k => t[k]).join('')).join(' ');
  ok(abil(X.natList('women')) === '45455 54545 45445 55434 43553 55334 54443 44434 54433 45333 44343 53523' && R.some(k => X.natList('women')[0][k] !== base('ENG')[k]), `the women's twelve have their own ratings, England's not the men's (${abil(X.natList('women'))})`);
  ok(abil(X.natList('men')) === '45455 54545 44553 55434 45353 54533 54443 45433 53523 44343 44433 53433', `the men's twelve (${abil(X.natList('men'))})`);
  ok(X.natList('xyz') === X.natList('men'), 'an unknown category is the men\'s');
  ok(['CDN', 'USA'].every(id => X.natList('women').some(t => t.id === id) && !X.natList('men').some(t => t.id === id) && !X.natList('minis').some(t => t.id === id)) && ['ARG', 'JPN'].every(id => !X.natList('women').some(t => t.id === id)), 'Canada and the USA only under Women; Argentina and Japan only under Men and Minis');
  ok(X.catTeam(base('CDN'), 'men') === null && X.catTeam(base('CDN'), 'women') === X.natList('women')[2] && X.catTeam(base('ENG'), 'women') === X.natList('women')[0] && X.catTeam(base('ENG'), 'men') === base('ENG') && X.catTeam(X.CLUBS[0], 'women').name === 'Farnham Women', 'catTeam: a nation is its category\'s own, or none; a club is catSide\'s');
  for (const cat of ['men', 'women']) {
    const nat = id => X.natList(cat).find(t => t.id === id), fij = nat('FIJ'), rsa = nat('RSA'), ire = nat('IRE');
    ok(fij.pace === 5 && R.every(k => fij[k] <= fij.pace) && rsa.power === 5 && ire.handling === 5 && ire.kicking === 5 && R.every(k => fij.kicking <= fij[k]), `${cat}: each keeps its style: Fiji's pace, South Africa's power, Ireland's handling and kicking`);
  }
  ok(Math.min(...X.NATIONS.map(total)) > Math.max(...clubs.map(total)), `every nation above every club (${Math.min(...X.NATIONS.map(total))} v ${Math.max(...clubs.map(total))})`);
  const TABLES = {   // strongest first: the last completed league table each list follows (README, Teams)
    eng: 'NTH,BTH,EXE,LEI,BRS,LNO,SAL,GLO,LWE,NCL',            // Premiership 2025-26 (Exeter and Leicester level: 3rd and 4th)
    fra: 'TLS,MPL,PAU,PAR,NAN,LRO,CLE,BOR,TLN,CAS,LYO,BAY,PGN,MTB',   // Top 14 2025-26
    cel: 'GLA,DUB,LIM,CDF,GAL,BEL,SWA,EDI,TRE,LLA,NPT,PRM',    // URC 2025-26
    sco: 'AYR,CUR,GOL,MYR,KEL,GIF,HAW,MLR,ANN,SEL',            // Scottish Premiership 2025-26
    rsa: 'CPT,PRE,JHB,DUR,KIM,BLM,MBO',                        // URC 2025-26, then the Currie Cup 2026
    aus: 'BRI,CAN,PTH,SYD,MEL,ADL',                            // Super Rugby Pacific 2026; Melbourne (gone after 2024) and the invented Adelaide last
    nzl: 'WLG,HMN,CHC,AKL,DUN,TAR',                            // Super Rugby Pacific 2026; Taranaki (provincial) last
    jpn: 'KOB,SAI,FNB,TOK,AIC,SHZ,YOK',                        // League One 2025-26
  };
  for (const [k, order] of Object.entries(TABLES)) {
    const l = L.find(x => x.key === k), ids = order.split(','), side = id => l.teams.find(t => t.id === id);
    ok(ids.length === l.teams.length && ids.every(side) && ids.every((id, i) => i === 0 || total(side(id)) <= total(side(ids[i - 1]))) && total(side(ids[0])) > total(side(ids[ids.length - 1])), `${l.name} rates its sides in table order (${ids.map(id => id + ' ' + total(side(id))).join(', ')})`);
  }
  const pros = X.NATIONAL.filter(l => l !== X.SCOTLAND).flat();
  ok(pros.every(t => total(t) >= 14 && total(t) <= 17) && X.SCOTLAND.every(t => total(t) >= 12 && total(t) < Math.min(...pros.map(total))), `the professional leagues in 14 to 17 (67 to 75), Scotland's amateur clubs below every one of them (${Math.min(...X.SCOTLAND.map(total))} to ${Math.max(...X.SCOTLAND.map(total))})`);
  ok(X.CLUBS.map(total).join() === '17,14,16,16,16,17,15,13,15,15,14,17' && X.overallOf(X.CLUBS[0]) === Math.max(...pros.map(X.overallOf)), 'Local is not re-rated (Kids and Quick Match read it): Farnham, 75, is level with the top professional sides');
  ok(avg(X.SCOTLAND) < avg(others) && X.SCOTLAND.every(t => total(t) <= 5 + X.BUDGET) && X.SCOTLAND.every((t, i) => i === 0 || total(t) <= total(X.SCOTLAND[i - 1])) && total(X.SCOTLAND[0]) > total(X.SCOTLAND[9]), `Scotland's amateur sides rate a little below the professional leagues (${avg(X.SCOTLAND).toFixed(1)} v ${avg(others).toFixed(1)}), the table's leaders highest`);
  ok(X.AUSTRALIA.map(t => t.id).join() === 'SYD,BRI,CAN,PTH,MEL,ADL' && X.SOUTH_AFRICA.length === 7 && X.FRANCE.length === 14, 'Australia, South Africa and France as they were (append only: saved careers name their sides)');
  // the owner's trademark rule: a city or a region, never a club's registered name or nickname (Quins in Local is the one exception)
  const MARKS = /\b(leinster|munster|ulster|connacht|saracens|harlequins|tigers|saints|sharks|bears|chiefs|blues|crusaders|hurricanes|highlanders|steelers|wild knights|spears|sungoliath|verblitz|bluerevs|blue revs|eagles|warriors|ospreys|scarlets|dragons|benetton|zebre|falcons|red bulls|brumbies|waratahs|reds|force|rebels|stormers|bulls|lions|cheetahs|pumas|stade|racing|rugby|rfc|club|toyota|kubota|panasonic|suntory|kobelco|canon|yamaha|chieftains|hawks|watsonians?|heriots?|hutchesons|aloysians|gha|marr|accies|academicals?)\b/i;
  const pro = X.NATIONAL.flat();
  ok(pro.every(t => !MARKS.test(t.name)), `no professional side carries a club's name or nickname (${pro.filter(t => MARKS.test(t.name)).map(t => t.name).join(', ') || 'none'})`);
  const codes = X.ALL_TEAMS.map(t => t.id);   // the career's invented counties went with its stages (club seasons, 2026-11-08): every side it plays is on a list
  ok(new Set(codes).size === codes.length && codes.every(c => /^[A-Z]{3}$/.test(c)), 'every code is three letters and unique across every list and every nation');
  ok(['NZL', 'RSA', 'AUS', 'ARG', 'FIJ', 'JPN', 'CDN', 'USA'].every(id => !clubs.some(t => t.id === id)) && !X.NATIONS.slice(6).some(t => t.home) && X.AUSTRALIA.some(t => t.id === 'CAN' && t.name === 'Canberra'), 'the new nations\' codes clash with no club (Canada is CDN: CAN stays Canberra\'s), and none is a home nation');
  ok(pro.every(t => total(t) <= 5 + X.BUDGET) && X.NATIONS.every(t => R.every(k => t[k] >= 1 && t[k] <= 5)), `no league side is stronger than a team you can make (top ${Math.max(...pro.map(total))})`);
  ok(X.NATIONS.slice(6).every(t => /^#[0-9a-f]{6}$/i.test(t.alt) && /^#[0-9a-f]{6}$/i.test(t.altTrim)), 'each new nation has a change kit, as the six do');

  // the hierarchy on screen
  X.setChamp(null); D.openTeams('quick');
  ok(X.teamPool() === 'sur' && X.poolTier(X.teamPool()) === 2 && !$('t-loc').hidden && $('t-nat').hidden && $('t-league').hidden, 'Quick Match opens on Local · Surrey; no My League without an import');
  const grid = () => $('t-grid').innerHTML, names = l => l.every(t => grid().includes('>' + t.name + '<'));
  ok(names(X.CLUBS), 'Surrey lists the Local clubs');
  X.tierPick(1);
  ok(s.pool === 'eng' && !$('t-nat').hidden && $('t-loc').hidden && names(X.ENGLAND) && !grid().includes('>Farnham<'), 'National opens on England, its league under it');
  X.poolPick('jpn');
  ok(s.pool === 'jpn' && names(X.JAPAN) && !grid().includes('>Bath<'), 'a league shows its own sides');
  X.poolPick('sco');
  ok(s.pool === 'sco' && names(X.SCOTLAND) && !grid().includes('>Edinburgh<') && !grid().includes('>Glasgow<') && X.teamPool() === 'sco' && X.poolTier('sco') === 1 && !$('t-nat').hidden, 'Scotland, under National, shows the Premiership\'s clubs; the pro sides stay in Celtic and Italy');
  X.poolPick('jpn');
  X.tierPick(0);
  const inOrder = l => l.every((t, i) => i === 0 || grid().indexOf('>' + X.listName(t) + '<') > grid().indexOf('>' + X.listName(l[i - 1]) + '<'));
  const engAt = grid().indexOf('>England<');
  ok(s.pool === 'int' && $('t-nat').hidden && $('t-loc').hidden && names(X.natList('men')) && inOrder(X.natList('men').filter(t => t.id !== 'ENG')) && engAt >= 0 && engAt < grid().indexOf('>South Africa<') && /data-i="0"[\s\S]*?>England<[\s\S]*?My Team/.test(grid().split('data-i="1"')[0]) && !grid().includes('>Canada<') && !grid().includes('>USA<'), 'International: the men\'s twelve in table order, with nothing under it (in Player 1\'s list My Team\'s England first, marked)');   // re-pinned at the official tables: natList, not NATIONS
  ok(X.poolTeams('int') === X.natList('men') && grid().includes('aria-label="Overall 93">93<'), 'Men: the list is natList(\'men\'), South Africa at 93');
  X.catPick('women');
  ok(X.poolTeams('int') === X.natList('women') && X.natList('women').every(t => grid().includes('>' + X.listName(t) + '<')) && inOrder(X.natList('women')) && !grid().includes('>Argentina<') && !grid().includes('>Japan<') && !grid().includes(' Women<'), 'Women: the women\'s twelve in table order, Canada and the USA in, each card by the nation\'s name as the club cards are');
  X.catPick('minis');
  ok(X.poolTeams('int') === X.natList('minis') && names(X.natList('men')) && !grid().includes('>Canada<'), 'Minis: the men\'s twelve');
  X.catPick('men');
  X.tierPick(1);
  ok(s.pool === 'jpn', 'National goes back to the league last looked at');
  X.tierPick(1);
  ok(s.pool === 'jpn', 'and pressing it again stays put');
  X.tierPick(2);
  ok(s.pool === 'sur', 'Local is Surrey');
  X.poolPick('nope'); ok(s.pool === 'int', 'a list that does not exist is International');
  // a championship from every list: your side and five from it
  for (const l of L) {
    D.openTeams('champ'); X.poolPick(l.key);
    D.pickTeam(l.teams[1]);
    const c = X.champ();
    ok(c.teams.length === 6 && c.teams[0].id === l.teams[1].id && c.teams.slice(1).every(t => l.teams.some(o => o.id === t.id) && t.id !== l.teams[1].id), `a championship from ${l.name} is your side and five from ${l.name}`);
    X.setChamp(null);
  }
  // International through the team screen: a nation plays the rest of its six in its category's twelve, by who is in it, as Career's
  // International stage does, so the Six Nations (and its Triple Crown) is what England, France, Ireland, Italy, Scotland and Wales get
  // every time. Re-pinned at the official tables: natList for each category, not NATIONS in sixes.
  const sixOf = l => l.map(t => t.id).sort().join(), SIX = 'ENG,FRA,IRE,ITA,SCO,WAL', REST = { men:'ARG,AUS,FIJ,JPN,NZL,RSA', women:'AUS,CDN,FIJ,NZL,RSA,USA', minis:'ARG,AUS,FIJ,JPN,NZL,RSA' };
  ok(sixOf(X.NATIONS.filter(t => t.home || ['FRA', 'ITA'].includes(t.id))) === SIX && ['men', 'women'].every(c => X.SIX_NATIONS.every(id => X.natList(c).some(t => t.id === id))), 'the Six Nations are in both categories\' twelve');
  for (const cat of ['men', 'women', 'minis']) {
    const l = X.natList(cat);
    for (const n of l) {
      D.openTeams('champ'); X.catPick(cat); X.poolPick('int'); D.pickTeam(n);
      const c = X.champ(), got = sixOf(c.teams), want = X.SIX_NATIONS.includes(n.id) ? SIX : REST[cat];
      const rated = c.teams.every(t => { const o = l.find(x => x.id === t.id); return o && R.every(k => t[k] === o[k]) && t.name === o.name && (cat === 'men' ? !('cat' in t) : t.cat === cat); });
      ok(c.teams[c.user].id === n.id && got === want && rated && sixOf(X.natGroup(n.id, cat)) === want, `${cat}: a championship as ${n.name} from International is its own six, at its list's ratings (${got})`);
      X.setChamp(null);
    }
  }
  ok(X.natGroup('NZL', 'women').map(t => t.id).join() === 'NZL,CDN,USA,AUS,RSA,FIJ' && X.natGroup('ENG', 'men').map(t => t.id).join() === 'IRE,FRA,ENG,SCO,WAL,ITA', 'a group keeps its table\'s order');
  for (const cat of ['men', 'women']) {
    D.openTeams('champ'); X.catPick(cat); X.poolPick('int'); D.pickTeam(X.natList(cat).find(t => t.id === 'ENG'));
    const c = playOut(), hon = X.honours(c, X.standings(c)).filter(h => h[1] === c.user).map(h => h[0]);
    ok(c.teams.filter(t => t.home).length === 4 && hon.includes('Triple Crown'), `${cat}: England picked on the team screen can win the Triple Crown (${hon.join(', ')})`);
    X.setChamp(null);
    const mine = X.cleanTeam({ name: 'Badgers', pace: 5, power: 5 }, 0);
    D.openTeams('champ'); X.catPick(cat); X.poolPick('int'); D.pickTeam(mine);
    const m = X.champ(), l = X.natList(cat);
    ok(m.teams[m.user].name === (cat === 'men' ? 'Badgers' : 'Badgers Women') && m.teams.length === 6 && m.teams.filter((t, i) => i !== m.user).every(t => l.some(n => n.id === t.id && n.name === t.name && R.every(k => n[k] === t[k]))), `${cat}: a team you made, on International, plays five of the category's twelve`);
    X.setChamp(null);
  }
  D.openTeams('champ'); X.catPick('men'); X.poolPick('int'); D.pickTeam(X.NATIONS[12]);
  ok(X.champ() == null, 'Canada handed to the team screen on Men starts nothing: the men\'s list has no Canada');
  // a pick follows the category: Quick Match and Two Player
  D.openTeams('quick'); $('t-change').click(); X.catPick('women'); X.poolPick('int'); D.pickTeam(X.natList('women')[2]);
  ok($('t-mine').innerHTML.includes('Canada Women') && $('t-title').textContent === 'Pick Opponent', 'Quick Match on Women: Canada Women is your team');
  X.catPick('minis');
  ok($('t-yours').hidden && $('t-title').textContent === 'Pick Your Team', 'Minis has no Canada: the pick is undone, and the screen asks for your team');
  D.pickTeam(X.natList('minis')[4]); X.catPick('women');
  ok($('t-mine').innerHTML.includes('England Women'), 'England Minis picked, then Women: England Women');
  D.pickTeam(X.natList('women')[1]);
  ok(T.M.nat[0] === X.natList('women')[0] && T.M.nat[1] === X.natList('women')[1] && T.M.nat[0].pace === 4 && T.M.nat[0].stamina === 5, 'England Women v New Zealand Women: the women\'s sides, at the women\'s ratings');
  D.exitMatch();
  D.openJoin(); D.openTeams('two'); X.catPick('women'); X.poolPick('int'); D.pickTeam(X.natList('women')[5]);
  ok(D.twoSel().picking === 1 && $('t-mine').innerHTML.includes('USA Women'), 'Two Player on Women: Player 1 is the USA');
  X.catPick('men');
  ok(D.twoSel().picking === 0 && D.twoSel().teams[0] === X.CLUBS[0], 'Men has no USA: Player 1 picks again, from Farnham');
  D.pickTeam(X.natList('women')[0]); X.catPick('men');
  ok(D.twoSel().teams[0] === X.NATIONS[0] && $('t-mine').innerHTML.includes('Player 1 · England<'), 'England Women, then Men: England');
  D.setTwo(false); X.catPick('men'); D.goHome();
  // old saves: each index the team screen used to save goes to where it was
  const want = ['int', 'sur', 'fra', 'aus', 'rsa', 'my'];
  ok(X.POOL_OLD.join() === want.join() && !X.POOL_OLD.includes('sco'), 'the old lists were International, Local, France, Australia, South Africa, My League: nothing old lands on Scotland');
  for (let i = 0; i < want.length; i++) { X.restore({ settings: { pool: i } }); ok(s.pool === want[i], `an old saved pool ${i} is ${want[i]}`); }
  for (const k of [...L.map(l => l.key), 'my']) { X.restore({ settings: { pool: k } }); ok(s.pool === k, `a saved ${k} loads as it is`); }
  for (const bad of [-1, 6, 1.5, 'x', null, {}, true]) { X.restore({ settings: { pool: bad } }); ok(s.pool === 'int', `a bad pool (${JSON.stringify(bad)}) is International, as before`); }
  X.restore({ settings: { pool: 5 } });
  ok(X.teamPool() === 'sur', 'an old My League with no league saved shows Surrey');
  ok(X.poolKey(2) === 'fra' && X.poolKey('cel') === 'cel', 'poolKey maps an old index and keeps a key');
  {   // a championship saved before the official tables keeps its sides as they were saved: England Women at the old men's 22, Argentina Women
    const was = { ENG:[4, 5, 4, 5, 4], FRA:[5, 5, 4, 4, 5], ARG:[4, 5, 4, 3, 4], JPN:[5, 3, 4, 3, 4], WAL:[4, 4, 3, 4, 4], ITA:[4, 4, 4, 3, 4] };
    X.newChamp(...(() => { const six = Object.entries(was).map(([id, r]) => { const t = { ...X.catSide(base(id), 'women') }; R.forEach((k, i) => { t[k] = r[i]; }); return t; }); return [six[0], six.slice(1)]; })());
    const saved = JSON.parse(JSON.stringify(X.champ()));
    X.setChamp(null); X.restore({ settings: { cat: 'women', pool: 'int' }, champ: saved });
    const c = X.champ();
    const same = (a, b) => a.id === b.id && a.name === b.name && a.cat === b.cat && a.kit === b.kit && R.every(k => a[k] === b[k]);
    ok(c && c.teams.length === 6 && c.teams.every((t, i) => same(t, saved.teams[i])) && c.teams[0].name === 'England Women' && total(c.teams[0]) === 22 && c.teams.some(t => t.name === 'Argentina Women'), 'a saved championship keeps its teams: no re-rating, Argentina Women still in it');
    X.setChamp(null); X.restore({ settings: { pool: 'int', cat: 'men' } });
  }
  const kept = globalThis.localStorage, mem = {};
  globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
  D.openTeams('champ'); X.poolPick('nzl'); X.catPick('women');
  const w = JSON.parse(mem['tryline.v1']).settings;
  ok(w.pool === 'nzl' && w.cat === 'women', 'the save keeps the list\'s key and the category');
  globalThis.localStorage = kept;
  X.catPick('men');
}

// 11. Men | Women | Minis: the name and the cat, nothing else
{
  const D = T.debug, s = D.settings(), $ = id => document.getElementById(id);
  const R = ['pace', 'power', 'handling', 'kicking', 'stamina'], far = X.CLUBS[0], has = X.CLUBS[1];
  ok(X.TEAM_CATS.map(c => c.name).join() === 'Men,Women,Minis' && s.cat === 'men', 'Men | Women | Minis, on Men');
  ok(X.catSide(far, 'men') === far && X.catOf(far) === 'men', 'Men is the team as it was, and a team with no category is men\'s');
  const fw = X.catSide(far, 'women'), em = X.catSide(X.NATIONS[0], 'minis');
  ok(fw.name === 'Farnham Women' && fw.cat === 'women' && fw.id === 'FAR' && fw.kit === far.kit && R.every(k => fw[k] === far[k]) && far.name === 'Farnham' && !('cat' in far), 'Women: the name and the cat; the code, kit and ratings unchanged, the list\'s own side untouched');
  ok(em.name === 'England Minis' && em.cat === 'minis' && em.home === true && em.alt === X.NATIONS[0].alt, 'Minis: England Minis, still a home nation in its change kit');
  ok(X.catSide({ name: 'Farnham Minis', id: 'FAN' }, 'minis').name === 'Farnham Minis' && X.catSide({ name: 'Farnham Minis', id: 'FAN' }, 'women').name === 'Farnham Minis Women', 'a name already ending in its word is not doubled');
  // Quick Match
  D.openTeams('quick'); D.pickTeam(far); X.catPick('women');
  ok(s.cat === 'women' && $('t-mine').innerHTML.includes('Farnham Women'), 'the bar names your side for the category');
  ok($('t-grid').innerHTML.includes('>Haslemere<') && !$('t-grid').innerHTML.includes('Haslemere Women'), 'the cards keep the club\'s name');
  D.pickTeam(has);
  ok(T.M.nat[0].name === 'Farnham Women' && T.M.nat[1].name === 'Haslemere Women' && T.M.nat.every(n => n.cat === 'women') && T.M.nat[0].id === 'FAR' && T.M.nat[1].id === 'HAS', 'a women\'s Quick Match: both sides named for it and carrying cat, the scoreboard codes unchanged');
  ok(R.every(k => T.M.nat[0][k] === far[k] && T.M.nat[1][k] === has[k]) && T.M.kit[0].fill === far.kit, 'ratings and kits as the men\'s');
  D.exitMatch();
  // a championship keeps the category it was started with
  D.openTeams('champ'); X.catPick('minis'); X.poolPick('int');
  D.pickTeam(X.NATIONS[2]);
  let c = X.champ();
  ok(c.teams.every(t => t.cat === 'minis' && / Minis$/.test(t.name)) && c.teams[0].name === 'Ireland Minis', `a minis championship names all six (${c.teams.map(t => t.name).join(', ')})`);
  D.renderHub();
  ok($('hub-eyebrow').textContent === 'Championship · Ireland Minis' && $('hub-table').innerHTML.includes('Ireland Minis'), 'the hub shows the names');
  X.catPick('men');
  const saved = JSON.parse(JSON.stringify(X.champ()));
  X.setChamp(null); X.restore({ champ: saved });
  c = X.champ();
  ok(c.teams.every(t => t.cat === 'minis' && / Minis$/.test(t.name)), 'a reload keeps them, whatever the team screen says now');
  const pair = c.fixtures[0].find(p => p.includes(c.user)), opp = pair[0] === c.user ? pair[1] : pair[0];
  D.startMatch(c.teams[c.user], c.teams[opp], true);
  ok(T.M.nat[0].cat === 'minis' && T.M.nat[0].name === 'Ireland Minis' && T.M.nat[0].id === 'IRE', 'and its matches are minis matches');
  D.exitMatch();
  X.restore({ champ: { ...saved, teams: saved.teams.map(t => ({ ...t, cat: 'bogus' })) } });
  ok(X.champ().teams.every(t => !('cat' in t)), 'an unknown category in a saved side is dropped: men\'s');
  X.setChamp(null);
  // Play as Farnham names the side it starts
  D.openTeams('champ'); X.catPick('women');
  ok(!$('t-default').hidden && $('t-default').textContent === 'Play as Farnham Women', `Play as names the category (${$('t-default').textContent})`);
  $('t-default').click();
  ok(X.champ() && X.champ().teams[X.champ().user].name === 'Farnham Women', 'and starts the side it names');
  X.setChamp(null); X.catPick('men'); D.openTeams('champ');
  ok($('t-default').textContent === 'Play as Farnham', 'on Men it is Farnham, as before');
  // Two Player
  D.openJoin(); D.openTeams('two'); X.catPick('women');
  D.pickTeam(X.NATIONS[0]); D.pickTeam(X.NATIONS[1]);
  ok(T.M.two && T.M.nat[0].name === 'England Women' && T.M.nat[1].name === 'France Women' && T.M.nat.every(n => n.cat === 'women'), 'Two Player plays the category too');
  D.setTwo(false); D.exitMatch(); X.catPick('men');
  D.openJoin(); D.openTeams('two'); D.pickTeam(X.NATIONS[0]); D.pickTeam(X.NATIONS[1]);
  ok(T.M.nat[0] === X.NATIONS[0] && T.M.nat[1] === X.NATIONS[1], 'on Men a match is given the very teams it always was');
  D.setTwo(false); D.exitMatch();
  const demoIds = new Set();   // the home screen's demo (exitMatch starts it): a men's match, so never Canada or the USA
  for (let i = 0; i < 400; i++) { D.exitMatch(); demoIds.add(T.M.nat[0].id); demoIds.add(T.M.nat[1].id); }
  ok(T.M.demo && !demoIds.has('CDN') && !demoIds.has('USA') && X.natList('men').some(t => demoIds.has(t.id)) && X.CLUBS.some(t => demoIds.has(t.id)), `the demo is a men's match: nations and clubs, never Canada or the USA (${demoIds.size} sides in 400 demos)`);
  // the screen: labels, controls and no arrows
  const html = readGameSource(), menus = fs.readFileSync(new URL('../src/ui-menus.js', import.meta.url), 'utf8');
  ok(html.includes('<div class="seg cat" id="t-cat"></div></div>') && html.includes('<div class="pools"><div class="seg" id="t-tier"></div><div class="seg" id="t-nat" hidden></div><div class="seg" id="t-loc" hidden></div></div>'), 'Men | Women | Minis beside the title, the tiers and their lists under it');
  ok(!html.includes('data-key="pool"'), 'the old five-list control has gone');
  const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  ok(X.TEAM_LISTS.filter(l => l.tier === 1).length === 8 && /@media \(max-width:731px\)\{\s*#t-nat\{grid-auto-flow:row;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)\}/.test(css), 'National\'s eight leagues: one row where eight fit, two balanced rows of four where they do not');
  const small = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'on', 'to', 'in', 'for', 'as', 'at', 'by']);
  const titled = t => t.split(' ').every((w, i) => (i && small.has(w)) || /^[A-Z]/.test(w));
  const labels = [...X.TEAM_TIERS, ...X.TEAM_LISTS.map(l => l.name), ...X.TEAM_CATS.map(c => c.name), 'My League'];
  ok(labels.every(titled), `every label is Title Case (${labels.filter(l => !titled(l)).join(', ') || labels.length + ' labels'})`);
  ok(!/[←-↙⇐-⇙—]/.test(labels.join(' ') + menus.slice(menus.indexOf('let natLast'), menus.indexOf('function openTeams'))), 'no arrow or em dash');
}

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

