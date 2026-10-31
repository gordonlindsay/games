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
    settings: { half: 2, diff: 0, sound: false, duels: false, hints: false, twoHints: [false, true], tut: ['goal', 'bogus', 'past'], pool: 1 },
    champ: played,
    custom: [{ name: 'Wasps', pace: 9, power: 9, handling: 9, kicking: 9 }],
  });
  const s = T.debug.settings();
  ok(s.duels === true && s.half === 2 && s.diff === 0 && s.sound === false && s.hints === false && s.twoHints[0] === false && s.twoHints[1] === true && s.tut.join() === 'past,goal' && s.pool === 1, 'settings load (Hints, each player\'s Hints, the tutorial moments seen in the game\'s order with an unknown one dropped), and an old duels-off save is turned on');
  const c = X.champ();
  ok(c && c.round === 1 && c.results.length === 1 && JSON.stringify(c.fixtures) === JSON.stringify(played.fixtures), 'fixtures, results and the round load back');
  ok(c.teams.find(t => t.id === 'ENG').alt === '#1b2747' && c.teams.filter(t => t.home).length === 4, 'change kits and home nations survive a reload');
  ok(X.standings(c).reduce((a, r) => a + r.P, 0) === 6, 'a reloaded table still adds up');
  ok(X.custom().length === 1 && X.custom()[0].name === 'Wasps' && X.custom()[0].pace + X.custom()[0].power + X.custom()[0].handling + X.custom()[0].kicking === 4 + X.BUDGET, 'a saved team is kept and held to the budget');

  X.restore({ settings: { half: 9, diff: 'hard', sound: 0, duels: false, pool: 7, hints: 'yes', twoHints: [true], tut: 'past' } });
  const s2 = T.debug.settings();
  ok(s2.half === 2 && s2.diff === 0 && s2.sound === false && s2.duels === true && s2.pool === 0 && s2.hints === false && s2.twoHints[1] === true && s2.tut.join() === 'past,goal', 'bad settings are ignored (a string for Hints, a short twoHints, a string for the tutorial) and duels stay on');
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
  ok(document.getElementById('b-champ').textContent === 'Final Table' && document.getElementById('champ-note').textContent === 'Farnham · Runners-Up' && document.getElementById('champ-note').hidden === false, 'home keeps the finished season as Final Table');

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
  ok(!X.outmatched(far, has) && !X.outmatched(far, eng) && X.outmatched(far, fra), 'France is a stronger side than Farnham; England and Haslemere are not');
  ok(X.rateOf(fra) === 18 && X.rateOf(far) === 14 && X.rateOf(has) === 11, `rating totals France ${X.rateOf(fra)} Farnham ${X.rateOf(far)} Haslemere ${X.rateOf(has)}`);

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
  T.newMatch(far, has, { halfLen: 30, diff: 1, headless: true, early: true, duels: 'off' });
  const q = T.M.players[0], opp = T.M.players[7], mate = T.M.players[8];
  q.x = opp.x = mate.x = 40; q.y = opp.y = mate.y = 35; opp.side = q.side = -1;
  ok(near(C.tackleChance(q, opp, 'ai', false), 0.48 + E.nudge.myTackle), `teammates tackle more surely (${C.tackleChance(q, opp, 'ai', false)})`);
  ok(near(C.tackleChance(mate, q, 'ai', false), 0.64), `the CPU's tackle is not eased (${C.tackleChance(mate, q, 'ai', false)})`);

  const five = ['HAR', 'HAS', 'GUI', 'ALD', 'WEY'].map(id => X.CLUBS.find(t => t.id === id));
  X.newChamp(far, five);
  const ch = X.champ();
  const opps = ch.fixtures.map(rd => { const p = rd.find(x => x[0] === ch.user || x[1] === ch.user); return p[0] === ch.user ? p[1] : p[0]; });
  ok(opps.map(i => X.rateOf(ch.teams[i])).join() === '11,12,13,13,14', `weakest first (${opps.map(i => ch.teams[i].id).join(' ')})`);
  ok(ch.teams.map(t => t.id).join() === 'FAR,HAR,HAS,GUI,ALD,WEY', 'the draw stays in the order it was given');

  const weak = X.cleanTeam({ name: 'Cubs', pace: 1, power: 1, handling: 1, kicking: 1 }, 0);
  X.newChamp(weak, five);
  D.renderHub();
  ok(document.getElementById('hub-next').innerHTML.includes('Stronger Side'), 'the hub names a stronger first opponent');
  X.newChamp(far, five);
  D.renderHub();
  ok(!document.getElementById('hub-next').innerHTML.includes('Stronger Side'), 'Farnham\'s weakest club opponent is not marked');

  D.openTeams('quick'); s.pool = 0; D.renderTeams();
  const grid = document.getElementById('t-grid').innerHTML;
  const card = name => { const i = grid.indexOf('>' + name + '<'); return grid.slice(i, grid.indexOf('</button>', i)); };
  ok(card('France').includes('Stronger Side') && card('Ireland').includes('Stronger Side') && !card('England').includes('Stronger Side') && !card('Italy').includes('Stronger Side'), 'Quick Match marks a side three points stronger');
  s.pool = 1; D.renderTeams();
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

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
