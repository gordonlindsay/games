// Teams: kit clashes, local clubs, teams you make, and championships built from any six.
// Also the menu (Quick Match first, no Duels switch) and the save: what loads, what is dropped.
// Exits 1 on any failure.
// node tools/teams.mjs
import fs from 'fs';
import { T } from './harness.mjs';

const X = T.teams, STEP = T.STEP;
let failed = 0, passed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const all = [...X.NATIONS, ...X.CLUBS];

// 1. the lists
{
  const ids = all.map(t => t.id);
  ok(new Set(ids).size === ids.length, `every team code is unique (${ids.join(' ')})`);
  ok(X.NATIONS.map(t => t.id).join() === 'ENG,FRA,IRE,ITA,SCO,WAL', 'the nations keep their order, which saved championships index into');
  ok(X.CLUBS[0].id === 'FAR', 'Farnham comes first in Local');
  ok(X.CLUBS.length >= 6, `Local has enough clubs for a championship (${X.CLUBS.length})`);
  ok(X.NATIONS.filter(t => t.home).map(t => t.id).join() === 'ENG,IRE,SCO,WAL', 'the home nations are England, Ireland, Scotland and Wales');
  const R = ['pace', 'power', 'handling', 'kicking'];
  ok(all.every(t => R.every(k => Number.isInteger(t[k]) && t[k] >= 1 && t[k] <= 5)), 'every rating is 1 to 5');
  const top = Math.max(...X.CLUBS.map(t => R.reduce((a, k) => a + t[k], 0)));
  ok(top <= 4 + X.BUDGET, `no club is stronger than a team you can make (${top} v ${4 + X.BUDGET})`);
  ok(all.every(t => /^#[0-9a-f]{6}$/i.test(t.kit) && /^#[0-9a-f]{6}$/i.test(t.trim)), 'every kit colour is a hex');
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
  const sum = t.pace + t.power + t.handling + t.kicking;
  ok(sum === 4 + X.BUDGET && [t.pace, t.power, t.handling, t.kicking].every(v => v >= 1 && v <= 5), `abilities are held to the budget (${sum})`);
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
  ok(T.debug.settings().pool === 0, 'a bad list choice falls back to International');
}

// 7. the menu, and a save that survives a reload
{
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const quick = html.indexOf('id="b-quick"'), champBtn = html.indexOf('id="b-champ"');
  ok(quick > 0 && champBtn > quick, 'Quick Match comes before Championship');
  ok(/<button class="btn primary" id="b-quick" autofocus>Quick Match<\/button>/.test(html), 'Quick Match is the primary button and takes focus');
  ok(!html.includes('data-key="duels"'), 'the Duels switch is gone');
  ok(html.includes("duels:'live'"), 'a match you play passes live duels');
  ok(/<dt>Saving<\/dt>/.test(html) && html.includes('Start Fresh'), 'How to Play explains saving and starting fresh');

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
    settings: { half: 2, diff: 0, sound: false, duels: false, kickSeen: true, pool: 1 },
    champ: played,
    custom: [{ name: 'Wasps', pace: 9, power: 9, handling: 9, kicking: 9 }],
  });
  const s = T.debug.settings();
  ok(s.duels === true && s.half === 2 && s.diff === 0 && s.sound === false && s.kickSeen === true && s.pool === 1, 'settings load, and an old duels-off save is turned on');
  const c = X.champ();
  ok(c && c.round === 1 && c.results.length === 1 && JSON.stringify(c.fixtures) === JSON.stringify(played.fixtures), 'fixtures, results and the round load back');
  ok(c.teams.find(t => t.id === 'ENG').alt === '#1b2747' && c.teams.filter(t => t.home).length === 4, 'change kits and home nations survive a reload');
  ok(X.standings(c).reduce((a, r) => a + r.P, 0) === 6, 'a reloaded table still adds up');
  ok(X.custom().length === 1 && X.custom()[0].name === 'Wasps' && X.custom()[0].pace + X.custom()[0].power + X.custom()[0].handling + X.custom()[0].kicking === 4 + X.BUDGET, 'a saved team is kept and held to the budget');

  X.restore({ settings: { half: 9, diff: 'hard', sound: 0, duels: false, pool: 7, kickSeen: 'yes' } });
  const s2 = T.debug.settings();
  ok(s2.half === 2 && s2.diff === 0 && s2.sound === false && s2.duels === true && s2.pool === 0 && s2.kickSeen === true, 'bad settings are ignored and duels stay on');
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

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
