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
  ok(X.POOLS.length === 12 && X.POOLS.every((p, i) => p === X.TEAM_LISTS[i].teams), 'POOLS is every built-in list, in the team screen\'s order');   // re-pinned for PR #14's England 2 and Counties: 12 lists
  ok(X.POOLS.every(p => p.length >= 6), `every list has enough sides for a championship (${X.POOLS.map(p => p.length).join(' ')})`);
  ok(X.FRANCE.length === 14, `France is the Top 14 (${X.FRANCE.length})`);
  // re-pinned for PR #14's Counties: Guildfordians is Surrey's own object in Counties too, so ALL_TEAMS holds every list's sides once each
  const twice = X.POOLS.flat().filter((t, i, a) => a.indexOf(t) !== i);
  ok(all.length === X.POOLS.reduce((a, p) => a + p.length, 0) - 1 && X.POOLS.flat().every(t => all.includes(t)) && twice.length === 1 && twice[0] === X.CLUBS[7] && X.COUNTIES.includes(X.CLUBS[7]), `ALL_TEAMS is every list, each side once: Guildfordians, in Surrey and Counties, is one team (${twice.map(t => t.id)})`);
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
    const c3 = X.cleanTeam({ name:'Cubs', level:'c5', pace:3, power:1, handling:1, kicking:1, stamina:1 }, 0);   // re-pinned at the real order: Counties 5 (43) has the 1 point Counties 3 had (it is 46, 2 points, now)
    ok(c3.pace === 2 && total(c3) === 6, 'the cut falls from the last in line, as it always has');
    const euro = X.cleanTeam({ ...full, level:'euro' }, 0), champ = R5.TEAM_LEVELS.find(l => l.id === 'champ');
    ok(!R5.TEAM_LEVELS.some(l => l.id === 'euro' || l.overall > 75) && R5.teamLevelOf({ level:'euro' }) === champ && euro.level === 'champ' && total(euro) === 5 + champ.budget && X.overallOf(euro) === 75, 'PR #14\'s European Champions (90) has gone with Bordeaux\'s 90: no level above National Champions (75), and a team saved at it reads and saves as National Champions');
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
  const ita = X.ENGLAND_TWO[0];   // re-pinned when the nations were rated on the XV hierarchy: England (18 in the four, was 16) is now a Stronger Side than Farnham (14); Italy (15) was the nation that is not. Re-pinned at the real order: Farnham is 10 in the four (61), so every nation is a Stronger Side, and Ealing, England 2's best (64, 11), is the side above him that is not
  ok(!X.outmatched(far, has) && !X.outmatched(far, ita) && X.outmatched(far, fra) && X.outmatched(far, eng) && X.overallOf(ita) > X.overallOf(far), 'France and England are stronger sides than Farnham; Ealing and Haslemere are not');
  ok(X.rateOf(fra) === 21 && X.rateOf(far) === 12 && X.rateOf(has) === 7, `rating totals France ${X.rateOf(fra)} Farnham ${X.rateOf(far)} Haslemere ${X.rateOf(has)}`);   // re-pinned at the official men's table: France 23 to 21. Re-pinned at PR #14's club table: Haslemere, 9th in Counties 3, is 64 (13), was 14. Re-pinned at the real order: Farnham 61 (12), was 75 (17); Haslemere 46 (7)
  // Stronger Side leaves Stamina out, so it marks the pairs it did before Stamina: within a pool, as the hub shows them
  const by = id => X.ALL_TEAMS.find(t => t.id === id), marks = (u, t) => X.outmatched(by(u), by(t));
  // re-pinned when the leagues were rated on their XV tables: Adelaide is now two points off Sydney and Canberra, so Taranaki v Hamilton and Llanelli v Dublin stand in
  // re-pinned at the official men's table: England (17 in the four) is two off Wales (15), so Ireland (18) stands in
  // re-pinned at PR #14's club table: Ironsides (72, Regional 2) is now two off Quins in the four, so Kingston (64, Counties 3) stands in
  // re-pinned at the real order: Ironsides (55) is three off Quins (61) in the four, so Wimbledon (58, two off) is the pair that is not marked
  ok(marks('HAS', 'FAR') && marks('KIN', 'QUI') && !marks('WIM', 'QUI') && marks('TAR', 'HMN') && marks('LLA', 'DUB') && marks('KIM', 'PRE') && marks('MBO', 'CPT') && marks('WAL', 'IRE') && marks('PGN', 'TLS'),
    'a side three points stronger in Pace, Power, Handling and Kicking is marked, whatever the Stamina');
  ok(!marks('HAS', 'WIM') && X.rateOf(by('WIM')) - X.rateOf(by('HAS')) >= 3 && !marks('MTB', 'CLE'), 'two points apart in the four and Stamina on top is not a Stronger Side');   // re-pinned at the real order: Guildfordians (43) is three off Wimbledon (58) in the four, so Haslemere (46, two off, four in all) stands in
  ok(X.outmatched(X.cleanTeam({ name: 'Cubs', pace: 1, power: 1, handling: 2, kicking: 2 }, 0), far) && X.outmatched({ ...X.NATIONS[5], stamina: undefined }, { ...X.NATIONS[2], stamina: undefined }), 'an old weak team and a championship side saved before Stamina are marked as before');   // re-pinned with the line above: Wales v Ireland, not England   // re-pinned at the real order: Farnham is 10 in the four, so the Cubs are 6 (they were 8 against his 14)

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
  ok(opps.map(i => X.rateOf(ch.teams[i])).join() === '7,7,9,9,12' && opps.map(i => ch.teams[i].id).join() === 'HAS,ALD,GUI,WEY,QUI', `weakest first (${opps.map(i => ch.teams[i].id + ' ' + X.rateOf(ch.teams[i])).join(', ')})`);   // re-pinned at PR #14's club table: Haslemere and Aldershot (Counties 3) 13, Guildford and Weybridge 15, Quins (no figures) 17; was 14,16,16,16,17. Re-pinned at the real order: 7 (46), 9 (52) and Quins level with Farnham, 12 (61)
  ok(ch.teams.map(t => t.id).join() === 'FAR,QUI,HAS,GUI,ALD,WEY', 'the draw stays in the order it was given');

  const weak = X.cleanTeam({ name: 'Cubs', pace: 1, power: 1, handling: 1, kicking: 1 }, 0);
  X.newChamp(weak, ['QUI', 'WIM', 'IRO', 'GUI', 'WEY'].map(id => X.CLUBS.find(t => t.id === id)));   // re-pinned at the real order: Haslemere and Aldershot (46) are within two of the Cubs in the four, so Local's top five stand in
  D.renderHub();
  ok(document.getElementById('hub-next').innerHTML.includes('Stronger Side'), 'the hub names a stronger first opponent');
  X.newChamp(far, five);
  D.renderHub();
  ok(!document.getElementById('hub-next').innerHTML.includes('Stronger Side'), 'Farnham\'s weakest club opponent is not marked');

  D.openTeams('quick'); D.pickTeam(far); X.tierPick(0);   // Farnham picked by Player 1: the opponents
  const grid = document.getElementById('t-grid').innerHTML;
  const card = name => { const i = grid.indexOf('>' + name + '<'); return grid.slice(i, grid.indexOf('</button>', i)); };
  ok(X.natList('men').every(t => card(t.name).includes('Stronger Side')), 'Quick Match marks a side three points stronger: every nation, against Farnham');   // re-pinned at the XV ratings: England is now one, Italy and Japan were not. Re-pinned at the real order: Farnham is 10 in the four (61), every nation 15 or more
  X.tierPick(1); X.poolPick('eng');
  { const g = document.getElementById('t-grid').innerHTML, c = name => { const i = g.indexOf('>' + name + '<'); return g.slice(i, g.indexOf('</button>', i)); };
    ok(c('Northampton').includes('Stronger Side') && c('Bath').includes('Stronger Side') && !c('Newcastle').includes('Stronger Side') && !c('Sale').includes('Stronger Side'), 'and on England the strongest are, its foot (67, one in the four) not'); }
  X.poolPick('en2');
  ok(!document.getElementById('t-grid').innerHTML.includes('Stronger Side'), 'no England 2 card is (64 at most, within one in the four)');
  X.poolPick('eng');   // National goes back to the league last looked at: England, as the screen's own checks (10) expect
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
  // re-pinned for PR #14's lists: England 2 under National, after England; Counties under Local, after Surrey
  ok(L.map(l => l.key + ':' + l.tier).join() === 'int:0,eng:1,en2:1,fra:1,cel:1,sco:1,rsa:1,aus:1,nzl:1,jpn:1,sur:2,cty:2', 'International is one list; National is England, England 2, France, Celtic and Italy, Scotland, South Africa, Australia, New Zealand and Japan; Local is Surrey and Counties');
  ok(L.map(l => l.name).join() === 'International,England,England 2,France,Celtic and Italy,Scotland,South Africa,Australia,New Zealand,Japan,Surrey,Counties', 'each list is named by its country or county, never a competition');
  ok(L.every(l => l.teams.length >= 6), `every list offers at least six sides (${L.map(l => l.key + ' ' + l.teams.length).join(', ')})`);
  // re-pinned at the official tables: NATIONS is fourteen (Canada and the USA appended); each category's International is twelve
  ok([X.NATIONS, X.ENGLAND, X.ENGLAND_TWO, X.FRANCE, X.CELTIC, X.SCOTLAND, X.SOUTH_AFRICA, X.AUSTRALIA, X.NEW_ZEALAND, X.JAPAN, X.CLUBS, X.COUNTIES].map(l => l.length).join() === '14,10,13,14,12,10,7,6,6,7,12,7' && ['men', 'women', 'minis'].every(c => X.natList(c).length === 12), 'International 12 a category (14 nations in all), England 10, England 2 13, France 14, Celtic and Italy 12, Scotland 10, South Africa 7, Australia 6, New Zealand 6, Japan 7, Surrey 12, Counties 7');
  ok(X.ENGLAND.map(t => t.name).join() === 'Bath,Bristol,Exeter,Gloucester,Leicester,Newcastle,Northampton,Sale,London North,London West', 'England by city');
  ok(X.CELTIC.map(t => t.name).join() === 'Dublin,Limerick,Belfast,Galway,Edinburgh,Glasgow,Cardiff,Swansea,Llanelli,Newport,Treviso,Parma', 'Ireland, Scotland, Wales and Italy by city');
  ok(X.NEW_ZEALAND.map(t => t.name).join() === 'Auckland,Hamilton,Wellington,Christchurch,Dunedin,Taranaki', 'New Zealand by city, and Taranaki');
  ok(X.SCOTLAND.map(t => t.name).join() === 'Ayr,Currie,Goldenacre,Myreside,Kelso,Giffnock,Hawick,Melrose,Anniesland,Selkirk', 'Scotland: the Premiership\'s ten by town, and by district or ground in Edinburgh and Glasgow');
  ok(X.SCOTLAND.map(t => t.id).join() === 'AYR,CUR,GOL,MYR,KEL,GIF,HAW,MLR,ANN,SEL' && !X.SCOTLAND.some(t => ['GAL', 'GLA', 'GLO', 'MEL', 'EDI'].includes(t.id)), 'Scotland\'s codes, none of them Galway\'s, Glasgow\'s, Gloucester\'s, Melbourne\'s or Edinburgh\'s');
  ok(X.ENGLAND_TWO.map(t => t.name).join() === 'Ealing,Bedford,Coventry,Worcester,Chinnor,Hartpury,Cornwall,Doncaster,Nottingham,Ampthill,Caldy,Richmond,Cambridge', 'England 2, PR #14\'s second tier, by town, in its table\'s order (the side from London left out)');
  ok(X.COUNTIES.map(t => t.name).join() === 'Effingham,Wandsworth,Guildfordians,Egham,Merton,Mitcham,Feltham' && X.COUNTIES[2] === X.CLUBS[7], 'Counties, PR #14\'s foot of the game: Counties 3\'s Effingham, then Counties 5 Surrey in its table\'s order, Guildfordians the Local list\'s own object');
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
  /* Re-pinned at PR #14's club table (src/ratings.js, CLUB_RATED): each list rates its sides in the order of last season's table, from its
     sides' own league lines, the play-off champion first where it was not first in the table (Dublin, 2nd in the URC). Main had the
     Premiership's 5th and 6th the other way round (Bristol, London North) and ordered each list by place alone, champions or not. */
  const TABLES = {   // strongest first: the last completed league table each list follows (README, Teams)
    eng: 'NTH,BTH,EXE,LEI,LNO,BRS,SAL,GLO,LWE,NCL',            // Premiership 2025-26, Northampton the champion
    en2: 'EAL,BED,COV,WOR,CHN,HPY,CWL,DON,NOT,AMP,CAL,RIC,CAM', // Championship 2025-26 (PR #14's): a winning record first
    fra: 'TLS,MPL,PAR,PAU,NAN,LRO,CLE,BOR,TLN,CAS,LYO,BAY,PGN,MTB',   // Top 14 2025-26, Toulouse the champion
    cel: 'DUB,GLA,LIM,CDF,GAL,BEL,SWA,EDI,TRE,LLA,NPT,PRM',    // URC 2025-26: Dublin the champion, then the table from Glasgow (1st)
    sco: 'AYR,CUR,GOL,MYR,KEL,GIF,HAW,MLR,ANN,SEL',            // Scottish Premiership 2025-26 (main's: no figures)
    rsa: 'CPT,PRE,JHB,DUR,KIM,BLM,MBO',                        // URC 2025-26, then the Currie Cup 2026
    aus: 'BRI,CAN,PTH,SYD,MEL,ADL',                            // Super Rugby Pacific 2026; Melbourne (gone after 2024) and the invented Adelaide last
    nzl: 'WLG,HMN,CHC,AKL,DUN,TAR',                            // Super Rugby Pacific 2026 (main's order: no figures); Dunedin (9th) under Sydney (8th); Taranaki (provincial) last
    jpn: 'KOB,SAI,FNB,TOK,AIC,SHZ,YOK',                        // League One 2025-26 (main's: no figures)
    sur: 'FAR,WIM,IRO,GUI,COB,WEY,ORU,KIN,ALD,HAS,GDN',        // Regional 1, Regional 2, Counties 1, Counties 3, Counties 5, each in its own table's order; Quins has no figures
    cty: 'EFF,WAN,GDN,EGH,MER,MIT,FEL',                        // Counties 3's Effingham, then Counties 5 Surrey
  };
  for (const [k, order] of Object.entries(TABLES)) {
    const l = L.find(x => x.key === k), ids = order.split(','), side = id => l.teams.find(t => t.id === id), rest = l.teams.filter(t => !ids.includes(t.id));
    ok(ids.every(side) && (rest.length === 0 || (k === 'sur' && rest.map(t => t.id).join() === 'QUI')) && ids.every((id, i) => i === 0 || total(side(id)) <= total(side(ids[i - 1]))) && total(side(ids[0])) > total(side(ids[ids.length - 1])), `${l.name} rates its sides in table order (${ids.map(id => id + ' ' + total(side(id))).join(', ')})`);
  }
  // the order is the figures': within one league, a side that finished higher is never rated lower, bar a champion above the table
  { const champs = ['NTH', 'TLS', 'DUB'], wrong = [];
    for (const a of all) for (const b of all) if (a.league && a.league === b.league && a.place < b.place && total(a) < total(b) && !champs.includes(b.id)) wrong.push(a.id + '<' + b.id);
    ok(!wrong.length, `no side rated under one it finished above in its league, but the champions (${wrong.join() || 'none'})`); }
  const tops = X.NATIONAL.filter(l => l !== X.SCOTLAND && l !== X.ENGLAND_TWO).flat();
  // re-pinned at the real order (the owner, 2026-11-09: "Pro leagues on top, then England 2, then Counties and Local clubs by their tables
  // (Farnham about 61 to 64)"): the top flights still in 14 to 17 (67 to 75), 17 only for a national champion; England 2 under every one
  // of them (was level with their foot), Scotland under England 2, and Local and Counties under England 2 (they were above it)
  const local = [...X.CLUBS, ...X.COUNTIES], e2 = X.ENGLAND_TWO.map(total), lo = l => Math.min(...l.map(total)), hi = l => Math.max(...l.map(total));
  ok(tops.every(t => total(t) >= 14 && total(t) <= 17) && X.SCOTLAND.every(t => total(t) >= 11 && total(t) < lo(tops)), `the top flights in 14 to 17 (67 to 75), Scotland's amateur clubs below every one of them (${lo(X.SCOTLAND)} to ${hi(X.SCOTLAND)})`);
  ok(X.ENGLAND_TWO.every(t => total(t) === (t.w > t.l ? 13 : 12)) && Math.max(...e2) < lo(tops) && Math.min(...e2) >= hi(X.SCOTLAND), `England 2: 64 with a winning record, 61 without (PR #14's own), under every top-flight side and none under Scotland's best`);
  ok(tops.filter(t => total(t) === 17).map(t => t.id).join() === 'NTH,TLS,DUB,HMN,WLG,SAI,KOB', 'only a national champion reaches 75 where there are figures (Northampton, Toulouse, Dublin); New Zealand and Japan, with none, keep main\'s');
  // Local from its table, PR #14's ladder a step up: Farnham 61 (the owner's 61 to 64), Quins (no figures) level with him, as main had them
  ok(X.CLUBS.map(total).join() === '12,7,9,7,9,12,9,6,10,7,8,11' && X.overallOf(X.CLUBS[0]) === 61 && total(X.CLUBS[0]) === hi(X.CLUBS) && total(X.CLUBS[5]) === total(X.CLUBS[0]), `Local from its table: Farnham 61, the top of Local, Quins level with him (${X.CLUBS.map(t => t.id + ' ' + total(t)).join(', ')})`);
  ok(hi(local) <= Math.min(...e2) && hi(local) < lo(tops) && local.filter(t => total(t) === Math.min(...e2)).map(t => t.id).join() === 'FAR,QUI', `no Local or Counties side above any England 2 side: Farnham and Quins level with England 2's foot (61), every other one under it (${hi(local)} v ${Math.min(...e2)})`);
  ok(X.COUNTIES.every(t => total(t) === (/Counties 3/.test(t.league) ? 7 : 6)) && Math.min(...all.map(total)) === 6, 'Counties: Counties 3 at 46, Counties 5 at 43, the foot of the ladder, and nothing under it');
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
  // re-pinned for PR #14's England 2: nine leagues, five then four where nine do not fit
  ok(X.TEAM_LISTS.filter(l => l.tier === 1).length === 9 && /@media \(max-width:731px\)\{\s*#t-nat,#cc-nat\{grid-auto-flow:row;grid-template-columns:repeat\(20,minmax\(0,1fr\)\)\}\s*#t-nat button,#cc-nat button\{grid-column:span 4\}\s*#t-nat button:nth-child\(n\+6\),#cc-nat button:nth-child\(n\+6\)\{grid-column:span 5;/.test(css), 'National\'s nine leagues: one row where nine fit, five then four where they do not, each row in equal parts');
  const small = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'on', 'to', 'in', 'for', 'as', 'at', 'by']);
  const titled = t => t.split(' ').every((w, i) => (i && small.has(w)) || /^[A-Z0-9]/.test(w));   // a number stands as it is (England 2)
  const labels = [...X.TEAM_TIERS, ...X.TEAM_LISTS.map(l => l.name), ...X.TEAM_CATS.map(c => c.name), 'My League'];
  ok(labels.every(titled), `every label is Title Case (${labels.filter(l => !titled(l)).join(', ') || labels.length + ' labels'})`);
  ok(!/[←-↙⇐-⇙—]/.test(labels.join(' ') + menus.slice(menus.indexOf('let natLast'), menus.indexOf('function openTeams'))), 'no arrow or em dash');
}

// 12. PR #14's data in main's tiers (2026-11-09, the owner: "main's tiers + PR #14's data"): its last-season club tables rate and order
//     the clubs, in the real order of the tiers (the owner, the same day: "Pro leagues on top, then England 2, then Counties and Local
//     clubs by their tables"), its England 2 and Counties are lists under National and Local, and its star display stands beside every
//     overall badge. A change to a rating has to change TABLE too.
{
  const R5 = T.ratings, D = T.debug, s = D.settings(), $ = id => document.getElementById(id), by = id => all.find(t => t.id === id);
  const K = ['pace', 'power', 'handling', 'kicking', 'stamina'], total = t => K.reduce((a, k) => a + t[k], 0), ab = t => K.map(k => t[k]).join('');
  const TABLE = {
    NTH:75, BTH:72, EXE:72, LEI:72, LNO:70, BRS:70, SAL:67, GLO:67, LWE:67, NCL:67,
    TLS:75, MPL:72, PAR:72, PAU:72, NAN:72, LRO:70, CLE:70, BOR:70, TLN:70, CAS:70, LYO:67, BAY:67, PGN:67, MTB:67,
    DUB:75, GLA:72, LIM:72, CDF:70, GAL:70, BEL:70, SWA:70, EDI:67, TRE:67, LLA:67, NPT:67, PRM:67,
    CPT:72, PRE:72, JHB:70, DUR:70, KIM:67, BLM:67, MBO:67,
    BRI:70, CAN:70, PTH:70, SYD:67, MEL:67, ADL:67, DUN:67,
    EAL:64, BED:64, COV:64, WOR:64, CHN:64, HPY:64, CWL:64, DON:64, NOT:61, AMP:61, CAL:61, RIC:61, CAM:61,
    AYR:61, CUR:61, GOL:61, MYR:61, KEL:61, GIF:58, HAW:58, MLR:58, ANN:58, SEL:58,
    FAR:61, QUI:61, WIM:58, IRO:55, GUI:52, COB:52, WEY:52, ORU:49, KIN:46, HAS:46, ALD:46, GDN:43,
    EFF:46, WAN:43, EGH:43, MER:43, MIT:43, FEL:43,
  };
  const sorted = o => JSON.stringify(Object.entries(o).sort());
  ok(sorted(R5.CLUB_RATED) === sorted(TABLE), 'the clubs\' table is the one pinned here');
  const wrong = Object.entries(TABLE).filter(([id, ov]) => !by(id) || X.overallOf(by(id)) !== ov).map(([id, ov]) => `${id} ${by(id) && X.overallOf(by(id))} not ${ov}`);
  ok(!wrong.length, `every side on it is at its overall (${wrong.join(', ') || Object.keys(TABLE).length + ' sides'})`);
  ok(all.filter(t => t.league).every(t => t.id in TABLE) && all.filter(t => t.league).length === Object.keys(TABLE).length - 14, 'every side with a league line is rated from it (and with none: Melbourne, Adelaide and Dunedin by their place, Scotland\'s ten by their table\'s order, Quins level with Farnham)');
  const unrated = all.filter(t => !(t.id in TABLE)).map(t => t.id);
  ok(unrated.join() === [...X.NATIONS, ...X.NEW_ZEALAND, ...X.JAPAN].filter(t => t.id !== 'DUN').map(t => t.id).sort((a, b) => unrated.indexOf(a) - unrated.indexOf(b)).join() && unrated.length === 14 + 5 + 7, `and only the nations, New Zealand and Japan keep the ratings written in their lists (${unrated.length})`);   // re-pinned at the real order: Scotland and Quins are on the table now
  ok(X.overallOf(by('BOR')) === 70 && Math.max(...all.filter(t => !X.isNation(t)).map(X.overallOf)) === 75 && Math.min(...X.NATIONS.map(X.overallOf)) === 78 && Math.min(...all.map(X.overallOf)) === 43, 'the ladder: clubs 43 to 75, every nation above (78 and up), and no Bordeaux at 90 (70, by its table)');
  { const tier = l => l.map(t => X.overallOf(t)), lists = { tops:X.NATIONAL.filter(l => l !== X.SCOTLAND && l !== X.ENGLAND_TWO).flat(), e2:X.ENGLAND_TWO, sco:X.SCOTLAND, local:[...X.CLUBS, ...X.COUNTIES] }, r = {};
    for (const [k, l] of Object.entries(lists)) r[k] = [Math.min(...tier(l)), Math.max(...tier(l))];
    ok(JSON.stringify(r) === '{"tops":[67,75],"e2":[61,64],"sco":[58,61],"local":[43,61]}' && Math.min(...X.NATIONS.map(X.overallOf)) > r.tops[1] && r.tops[0] > r.e2[1] && r.e2[0] >= r.local[1] && r.e2[0] >= r.sco[1], `the real order, each tier's range: nations 78 and up, top flights 67 to 75, England 2 61 to 64, Scotland 58 to 61, Local and Counties 43 to 61 (${JSON.stringify(r)})`); }
  // the proof behind every data-driven re-pin: CLUB_RATED=off rates no club from its table, so every list is main's as written
  { const { spawnSync } = await import('node:child_process');
    const code = `const { T } = await import(${JSON.stringify(new URL('./harness.mjs', import.meta.url).href)}); console.log(JSON.stringify(Object.fromEntries(T.teams.ALL_TEAMS.map(t => [t.id, ${JSON.stringify(K)}.map(k => t[k]).join('')]))));`;
    const out = spawnSync(process.execPath, ['--input-type=module', '-e', code], { env:{ ...process.env, CLUB_RATED:'off' }, encoding:'utf8' });
    const off = JSON.parse(out.stdout.trim().split('\n').pop() || '{}'), sum = v => [...v].reduce((a, c) => a + +c, 0);
    ok(X.CLUBS.map(t => sum(off[t.id])).join() === '17,14,16,16,16,17,15,13,15,15,14,17' && X.ENGLAND.map(t => sum(off[t.id])).join() === '17,15,16,14,16,14,17,15,15,14' && X.SCOTLAND.map(t => sum(off[t.id])).join() === '13,13,13,13,13,12,12,12,12,12', `CLUB_RATED=off gives main's ratings exactly, Local's, England's and Scotland's as main pinned them (${X.CLUBS.map(t => sum(off[t.id]))})`);
    // and CLUB_RATED=band gives the teams builder's table exactly (main's band, 61 to 75): the proof behind every re-pin the real order moved
    const outB = spawnSync(process.execPath, ['--input-type=module', '-e', code], { env:{ ...process.env, CLUB_RATED:'band' }, encoding:'utf8' });
    const band = JSON.parse(outB.stdout.trim().split('\n').pop() || '{}'), ovB = id => X.overallOf(Object.fromEntries(K.map((k, i) => [k, +band[id][i]])));
    ok(X.CLUBS.map(t => sum(band[t.id])).join() === '17,13,15,13,15,17,15,12,16,13,14,16' && X.ENGLAND_TWO.map(t => ovB(t.id)).join() === '67,67,67,67,67,67,67,67,64,64,64,64,64' && X.SCOTLAND.map(t => sum(band[t.id])).join() === '13,13,13,13,13,12,12,12,12,12' && X.COUNTIES.map(t => ovB(t.id)).join() === '64,61,61,61,61,61,61' && X.ENGLAND.every(t => band[t.id] === ab(t)), `CLUB_RATED=band gives the band's table exactly: Farnham 75, England 2 67 and 64, Scotland and Quins as written, the top flights as now (${X.CLUBS.map(t => sum(band[t.id]))})`);
    const fromFlavour = all.filter(t => t.id in TABLE).filter(t => ab(R5.abilitiesFor(Object.fromEntries(K.map((k, i) => [k, +off[t.id][i]])), R5.sumOfOverall(TABLE[t.id]))) !== ab(t)).map(t => t.id);
    ok(!fromFlavour.length && all.filter(t => !(t.id in TABLE)).every(t => off[t.id] === ab(t)), `each rated side is abilitiesFor its list's own abilities (how it plays) at its table's sum, every other side exactly as written (${fromFlavour.join() || 'all'})`);
  }
  // the league lines: real figures, PR #14's, read from the list and never saved
  const line = t => [t.league, t.place, t.w, t.d, t.l, t.pf, t.pa].join();
  ok(line(by('FAR')) === 'Regional 1 South Central,7,10,0,12,640,646' && line(by('NTH')) === 'English Premiership,1,14,1,3,693,536' && line(by('TLS')) === 'Top 14,1,18,0,8,981,617' && line(by('DUB')) === 'United Rugby Championship,2,12,0,6,515,370', `Farnham, Northampton, Toulouse and Dublin (${line(by('FAR'))})`);
  ok(line(by('BTH')) === 'English Premiership,2,13,0,5,646,424' && line(by('LNO')) === 'English Premiership,5,10,0,8,628,449' && line(by('LWE')) === 'English Premiership,9,6,0,12,448,589' && line(by('NCL')) === 'English Premiership,10,2,0,16,325,860' && line(by('PRM')) === 'United Rugby Championship,16,2,0,16,312,587', 'main\'s codes carry PR #14\'s figures: Bath (its BAT), London North (LON), London West (HAR), Newcastle (NEW), Parma (PMA)');
  ok(line(by('EAL')) === 'English Championship,1,26,0,0,1125,435' && line(by('CAM')) === 'English Championship,14,0,1,25,447,1190' && line(by('GDN')) === 'Counties 5 Surrey,4,7,0,7,422,313' && line(by('KIM')) === 'Currie Cup,1,6,0,1,271,143' && line(by('BRI')) === 'Super Rugby Pacific,5,8,0,6,364,386', 'Ealing, Cambridge, Guildfordians, Kimberley and Brisbane');
  ok([...X.NATIONS, ...X.SCOTLAND, ...X.NEW_ZEALAND, ...X.JAPAN, by('QUI'), by('MEL'), by('ADL')].every(t => !('league' in t)), 'none on the nations, Scotland, New Zealand, Japan, Quins, Melbourne or Adelaide: no figures, and none invented');
  ok(all.filter(t => t.league).every(t => Number.isInteger(t.place) && t.place >= 1 && ['w', 'd', 'l', 'pf', 'pa'].every(k => Number.isInteger(t[k]) && t[k] >= 0)), 'every line is whole numbers');
  X.newChamp(by('FAR'), X.CLUBS.slice(1, 6));
  ok(X.cleanChamp(JSON.parse(JSON.stringify(X.champ()))).teams.every(t => !('league' in t) && !('pf' in t)) && !('league' in X.cleanSide(by('NTH'))) && !('league' in X.cleanTeam({ ...by('FAR'), key:'my1' }, 0)), 'a saved championship, side or team keeps no league line');
  X.setChamp(null);
  // the new lists' kits, as PR #14 pinned them: no two sides on a list wear the same shirt, trim and pattern at a glance, nor share a table chip
  { const close = (a, b) => (!!a.hoops === !!b.hoops) && X.colorDist(a.kit, b.kit) < 40 && X.colorDist(a.trim, b.trim) < 60, same = list => list.flatMap((a, i) => list.slice(i + 1).filter(b => close(a, b)).map(b => a.name + '/' + b.name)).join();
    for (const [name, list] of [['England 2', X.ENGLAND_TWO], ['Counties', X.COUNTIES]]) ok(!same(list), `no two sides on ${name} wear the same shirt, trim and pattern at a glance (${same(list)})`);
    const blocks = l => l.flatMap((a, i) => l.slice(i + 1).filter(b => a.kit === b.kit && a.trim === b.trim).map(b => a.name + '/' + b.name)).join();
    ok(!blocks(X.ENGLAND_TWO) && !blocks(X.COUNTIES), `and no two share a table chip, shirt over trim (${blocks(X.ENGLAND_TWO)})`);
    const src = fs.readFileSync(new URL('../src/data.js', import.meta.url), 'utf8');
    ok(['Chinnor', 'Hartpury', 'Cornwall', 'Doncaster', 'Nottingham', 'Ampthill', 'Caldy', 'Egham', 'Mitcham'].every(n => new RegExp(n + "'[^\\n]*free choice").test(src)), 'the sides whose colours could not be sourced say so where they are written, as PR #14 flagged them'); }
  // on screen: England 2 under National after England, Counties under Local after Surrey, each with its sides
  X.setChamp(null); D.openTeams('quick'); X.tierPick(1);
  const segNames = id => [...$(id).innerHTML.matchAll(/data-pool="([^"]+)"[^>]*>([^<]+)</g)].map(m => m[2]);
  ok(segNames('t-nat').join() === 'England,England 2,France,Celtic and Italy,Scotland,South Africa,Australia,New Zealand,Japan' && segNames('t-loc').join() === 'Surrey,Counties,My League', `National's nine and Local's lists (${segNames('t-nat')} | ${segNames('t-loc')})`);
  X.poolPick('en2');
  ok(s.pool === 'en2' && X.ENGLAND_TWO.every(t => $('t-grid').innerHTML.includes('>' + t.name + '<')) && !$('t-grid').innerHTML.includes('>Bath<'), 'England 2 shows its thirteen');
  X.poolPick('cty');
  ok(s.pool === 'cty' && X.COUNTIES.every(t => $('t-grid').innerHTML.includes('>' + t.name + '<')) && $('t-nat').hidden && !$('t-loc').hidden && X.poolTier('cty') === 2, 'Counties shows its seven, under Local');
  ok(X.poolKey('en2') === 'en2' && X.poolKey('cty') === 'cty', 'the save keeps either list\'s key');
  // the stars beside every overall badge: each card's name with the side's stars under it, its words for a screen reader
  const stars = t => R5.starsHtml(R5.starsOf(t));
  for (const k of ['int', 'eng', 'en2', 'sur', 'cty']) {
    X.poolPick(k); const g = $('t-grid').innerHTML, list = X.poolTeams(k);
    ok(list.every(t => g.includes(`aria-label="Overall ${X.overallOf(t)}">${X.overallOf(t)}</span></span><span class="tid"><span class="tname">${X.listName(t)}</span>${stars(t)}</span>`)), `${k}: every card's stars beside its overall's badge, under its name`);
  }
  ok(R5.starsOf(by('FAR')) === 3.5 && R5.starsOf(by('HAS')) === 2 && R5.starsOf(by('BTH')) === 4 && R5.starsOf(by('RSA')) === 5 && stars(by('FAR')).includes('aria-label="3.5 Stars"'), 'on the one scale: Farnham 3.5 stars, Haslemere 2, Bath 4, South Africa 5, each with its words');   // re-pinned at the real order: Farnham 61 (was 75, 4.5), Haslemere 46 (was 64, 3.5)
  X.tierPick(2); X.poolPick('sur'); D.pickTeam(X.CLUBS[0]);
  ok($('t-mine').innerHTML.includes('<span class="tid"><span>Farnham</span>' + stars(X.CLUBS[0]) + '</span>'), 'Quick Match\'s picked side shows its stars in the bar');
  X.catPick('women');
  ok($('t-mine').innerHTML.includes('<span>Farnham Women</span>'), 'named for the category, at the same rating');
  X.catPick('men'); D.openTeams('my');
  ok($('t-mine').innerHTML.includes('<span class="tid"><span>Farnham</span>' + stars(X.CLUBS[0]) + '</span>') && $('t-mine').innerHTML.includes('<span class="tid"><span>England</span>' + stars(X.NATIONS[0]) + '</span>'), 'My Team\'s screen: the club and the country, each with its stars');
  // a My League side saved under a code PR #14's lists took since: recoded, and My Team goes with it
  { const was = s.myClub, side = { key:'lg-EAL', id:'EAL', name:'Ealing Town', kit:'#1b2747', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:3, stamina:3 };
    X.restore({ settings:{ myClub:'lg-EAL' }, importLeague:{ teams:[side, { ...side, key:'lg-XAN', id:'XAN', name:'Xanadu' }] } });
    const got = T.importer.league().teams[0];
    ok(got.id !== 'EAL' && got.key === 'lg-' + got.id && s.myClub === got.key && T.home.myClub() === got, `a saved league side coded EAL is recoded (${got.id}), and is still My Team`);
    X.restore({ settings:{ myClub:'lg-XAN' }, importLeague:{ teams:[side, { ...side, key:'lg-XAN', id:'XAN', name:'Xanadu' }] } });
    ok(s.myClub === 'lg-XAN' && T.home.myClub().name === 'Xanadu', 'and My Team on another side stays where it was');
    s.myClub = was; X.restore({ importLeague:null }); }
  // an old save (from before England 2 and Counties) with My League's sides on codes those lists took since: My Team at Merton, a career
  // there on My League and a championship. The career stays on My League (it went to Counties, Merton being MER there, and a Bedford Athletic
  // one to England 2), and its club and season follow the recode with My Team in the one pass, as does the championship (review, 2026-11-09)
  { const C = T.career, I = T.importer, was = s.myClub, pool = s.pool;
    const mk = (id, name) => ({ key:'lg-' + id, id, name, kit:'#1b2747', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:3, stamina:3 });
    const old = [['MER', 'Merton'], ['MIT', 'Mitcham'], ['FEL', 'Feltham'], ['EGH', 'Egham'], ['WAN', 'Wandsworthians'], ['EFF', 'Effingham'], ['BED', 'Bedford Athletic']].map(([id, n]) => mk(id, n));
    ok(old.every(t => all.some(o => o.id === t.id)), 'each of the old league\'s codes is a built-in side\'s now');
    const oldSave = club => {                              // the save as the build before PR #14's lists wrote it: the league as it was, never recoded
      I.setLeague({ teams:old.map(t => ({ ...t })) });
      const cr = C.create({ name:'Sam', pos:'B', num:10, club:old.find(t => t.name === club), league:'my' });
      s.pool = 'my'; X.newChamp(old[0], old.slice(1, 6));
      return JSON.parse(JSON.stringify({ settings:{ myClub:'lg-MER' }, career:cr, champ:X.champ(), importLeague:{ teams:old } }));
    };
    const saved = oldSave('Merton');
    ok(saved.career.league === 'my' && saved.career.club.id === 'MER' && saved.career.club.key === 'lg-MER', 'the old career: Merton on My League, coded MER');
    X.restore(saved);
    const lg = I.league().teams, mer = lg.find(t => t.name === 'Merton'), cr = C.get(), keys = new Set(lg.map(t => t.key));
    ok(mer.id !== 'MER' && s.myClub === mer.key && T.home.myClub() === mer, `My Team follows Merton to its new code (${mer.id})`);
    ok(cr.league === 'my' && C.league(cr) === 'my' && C.leagueKey(cr.league, cr.club) === 'my', `the career stays on My League (${cr.league}, ${C.league(cr)})`);
    ok(cr.club.id === mer.id && cr.club.key === mer.key && cr.season.teams[cr.season.user].key === mer.key, 'its club and the user\'s side of its season are the league\'s Merton, new code and key');
    ok(cr.season.teams.every(t => keys.has(t.key) && !all.some(o => o.id === t.id)), `its season is all My League, no side on a built-in club's code (${cr.season.teams.map(t => t.id)})`);
    ok(C.opponents(cr, 'league').every(t => keys.has(t.key)), `and next season draws from My League, never the built-in Counties (${C.opponents(cr, 'league').map(t => t.name)})`);
    ok(X.champ().teams.every(t => keys.has(t.key) && !all.some(o => o.id === t.id)) && X.champ().teams[X.champ().user].key === mer.key, `the championship's sides follow too (${X.champ().teams.map(t => t.id)})`);
    X.restore(oldSave('Bedford Athletic'));
    const bed = I.league().teams.find(t => t.name === 'Bedford Athletic'), cb = C.get();
    ok(cb.league === 'my' && C.league(cb) === 'my' && cb.club.id === bed.id && bed.id !== 'BED', `a Bedford Athletic career stays on My League, not England 2 (${cb.league}, ${cb.club.id})`);
    ok(C.leagueKey('my', { ...mk('BED', 'Bedford Athletic') }) === 'my' && C.leagueKey('my', X.ENGLAND_TWO[1]) === 'en2', 'a My League side is never taken for the built-in club with its code; Bedford itself is England 2\'s');
    C.set(null); X.setChamp(null); s.myClub = was; s.pool = pool; X.restore({ importLeague:null }); }
  // Guildfordians is on Surrey and on Counties: a career at it plays in the list it was picked from. On Counties, its own league (Counties 5
  // Surrey) and the reason that list is there, it went to Surrey (review, 2026-11-09)
  { const C = T.career, gdn = X.CLUBS[7], pick = k => { C.set(null); C.newOpen(); C.clubOpen(); C.tierPick(2); C.poolPick(k); C.clubPick(gdn); return C.draft(); };
    ok(X.CLUBS.includes(gdn) && X.COUNTIES.includes(gdn) && gdn.id === 'GDN', 'Guildfordians, one side on both lists');
    const d = pick('cty'), cr = C.create({ name:'Sam', pos:'B', num:10, club:d.club, league:d.league });
    ok(d.league === 'cty' && $('cn-mine').innerHTML.includes('data-fit>Counties</span>') && !$('cn-mine').innerHTML.includes('Surrey'), `picked on Counties, New Player says Counties (${$('cn-mine').innerHTML.replace(/<[^>]+>/g, ' ').trim()})`);
    ok(cr.league === 'cty' && C.league(cr) === 'cty' && cr.season.teams.slice(1).every(t => X.COUNTIES.some(o => o.id === t.id)), `and the career plays Counties (${cr.season.teams.slice(1).map(t => t.name)})`);
    ok(C.clean(JSON.parse(JSON.stringify(cr))).league === 'cty', 'a reload keeps it on Counties');
    const d2 = pick('sur'), cr2 = C.create({ name:'Sam', pos:'B', num:10, club:d2.club, league:d2.league });
    ok(cr2.league === 'sur' && cr2.season.teams.slice(1).every(t => X.CLUBS.some(o => o.id === t.id)) && C.clean(JSON.parse(JSON.stringify(cr2))).league === 'sur', 'picked on Surrey, Surrey, and a reload keeps it there');
    ok(C.leagueKey('eng', gdn) === 'sur' && C.leagueKey('cty', X.CLUBS[0]) === 'sur' && C.leagueKey(null, gdn) === 'sur' && C.leagueKey('en2', X.ENGLAND[0]) === 'eng', 'a list the club is not on gives its own first list: Farnham is never Counties, Northampton never England 2');
    C.set(null); T.debug.goHome(); }
}

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

