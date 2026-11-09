// Exercise the current browser bundle, its menu handlers and the browser-save boundary.
process.env.SEED ??= '19';
const { T, rndCalls } = await import('./harness.mjs');
const X = T.teams, $ = id => document.getElementById(id);
let passed = 0, writes = 0;
const ok = (test, message) => { if (!test) throw Error(message); passed++; };
const memory = {};
globalThis.localStorage = {
  getItem:key => memory[key] ?? null,
  setItem(key, value) { memory[key] = value; writes++; },
};
const saved = () => JSON.parse(memory['tryline.v1']);
X.newChamp(X.NATIONS[0], X.NATIONS.slice(1));
const seasonId = X.champ().id, orientations = [];
for (let round = 0; round < 5; round++) {
  const c = X.champ(), pair = c.fixtures[c.round].find(p => p.includes(c.user));
  const opponent = pair.find(i => i !== c.user);
  orientations.push(pair[0] === c.user);
  T.newMatch(c.teams[c.user], c.teams[opponent], { champ:true, headless:false });
  T.M.score = [21, 10]; T.M.tries = [3, 2];
  T.M.stats.tk.att = [10 + round, 90]; T.M.stats.tk.made = [8 + round, 70];
  X.recordChampResult(); X.recordChampResult();
  ok(c.round === round + 1, 'a duplicate full-time record must not advance another round');
  const result = c.results[round].find(r => r.h === c.user || r.a === c.user);
  ok((result.h === c.user ? result.hs : result.as) === 21 && (result.h === c.user ? result.ht : result.at) === 3,
    'scores and tries follow the user when fixture home/away changes');
  ok(result.stats.tk.made === 8 + round && result.stats.tk.att === 10 + round,
    'saved details belong to the user, including away fixtures');
  ok(c.results[round].filter(r => r.stats).length === 1, 'simulated fixtures never inherit played-match details');
}
ok(orientations.every((home, i) => home === (i % 2 === 0)), 'the five real fixture orientations alternate home and away');
ok(saved().champHistory.length === 1 && saved().champHistory[0].id === seasonId, 'completion saves one archived season');
X.setChamp(null); X.load(); X.renderHub();
ok(X.champ().round === 5 && X.champ().id === seasonId, 'browser storage reload restores the completed championship');
ok($('hub-summary').innerHTML.includes('5 recorded matches') && $('hub-summary').innerHTML.includes('50/60'),
  'reloaded hub aggregates all five saved tackle records');
ok($('hub-results').innerHTML.includes('Recorded Match Stats'), 'reloaded results expose saved match details');
X.renderHub(); X.save();
ok(saved().champHistory.length === 1, 'reopening the hub and saving do not duplicate the archive');
$('hub-reset').click();
ok(X.champ() !== null, 'Start Fresh requires its second press');
$('hub-reset').click();
ok(saved().champ === null && saved().champHistory.length === 1, 'Start Fresh clears the active season and retains its archive');
X.load(); X.renderHome();
ok(X.champ() === null && !$('b-cabinet').hidden, 'home cabinet (Championship\'s Trophy Cabinet) remains available after reloading Start Fresh');
X.restore({ settings:{ sound:false } }); X.save();
ok(saved().champHistory.length === 1 && saved().champHistory[0].id === seasonId, 'a partial settings restore preserves completed history');
const beforeRandom = rndCalls(); X.save(); X.renderHome();
ok(rndCalls() === beforeRandom, 'saving and rendering progression consumes no simulation RNG');
const beforePractice = memory['tryline.v1'], beforeWrites = writes;
T.practice.start('pass'); X.save(); X.recordChampResult(); T.practice.leave();
ok(writes === beforeWrites && memory['tryline.v1'] === beforePractice, 'practice cannot write or change the browser season save');
console.log(`Season flow: ${passed} assertions passed`);
