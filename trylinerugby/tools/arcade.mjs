import { T } from './harness.mjs';
// Arcade: On Fire, the louder Big Hit and the Golden Try. Only a match you play has them; AI v AI, the demo and the tools never do.
// node tools/arcade.mjs   Exits 1 on any failure.
const A = T.arcade, X = T.teams, STEP = T.STEP;
let failed = 0, passed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const play = o => T.newMatch(X.NATIONS[0], X.NATIONS[1], { halfLen:60, diff:1, headless:true, duels:'off', humans:[true, false], ...o });

// 1. who gets it
{
  T.newMatch(0, 1, { halfLen:60, diff:1, auto:true, headless:true, arcade:true });
  ok(!T.M.arcade, 'AI v AI never plays arcade, even when asked');
  A.heat(0, 'hit'); A.heat(0, 'hit'); A.heat(0, 'hit');
  ok(!A.onFire(0) && T.M.fire[0].heat === 0, 'heat does nothing outside arcade');
  play({});
  ok(!T.M.arcade, 'a match is not arcade unless asked (practice and the tools)');
  play({ arcade:true });
  ok(T.M.arcade && T.M.fire.length === 2 && !T.M.golden, 'a match you play is arcade');
}

// 2. On Fire
{
  play({ arcade:true });
  const p = T.M.players[3], base = A.maxSpeed(p);
  A.heat(0, 'turnover'); A.heat(0, 'hit');
  ok(!A.onFire(0) && T.M.fire[0].heat === 2, 'two in a row is not enough');
  A.heat(1, 'break');
  ok(T.M.fire[0].heat === 0 && T.M.fire[1].heat === 0, 'a broken tackle breaks the other side\'s run but builds nothing');
  A.heat(0, 'hit'); A.heat(1, 'turnover');
  ok(T.M.fire[0].heat === 0 && T.M.fire[1].heat === 1, 'the other side\'s good moment breaks the run');
  A.heat(0, 'hit'); A.heat(0, 'try');
  ok(A.onFire(0) && T.M.fire[0].t === A.ARCADE.fire.secs, 'three in a row lights it');
  ok(Math.abs(A.maxSpeed(p)/base - A.ARCADE.fire.speed) < 1e-9, `On Fire is ${A.ARCADE.fire.speed}x quicker`);
  A.heat(0, 'hit');
  ok(T.M.fire[0].heat === 0, 'no run builds while alight');
  A.fireTick(A.ARCADE.fire.secs - 0.5);
  ok(A.onFire(0), 'still alight just before time');
  A.fireTick(1);
  ok(!A.onFire(0) && Math.abs(A.maxSpeed(p) - base) < 1e-9, 'it goes out on time, and the speed with it');
  A.heat(0, 'hit'); A.heat(0, 'hit'); A.heat(0, 'hit');
  A.scoreTry(T.M.players[8]);
  ok(!A.onFire(0) && !A.onFire(1), 'a try by the other side puts it out');
  ok(T.M.fire[1].heat === 2, 'and a try is worth two to the scorers\' run');
  play({ arcade:true });
  A.heat(1, 'hit'); A.heat(1, 'hit'); A.heat(1, 'hit');
  ok(A.onFire(1), 'the CPU side can go On Fire too');
}

// 3. the Golden Try
{
  play({ arcade:true });
  T.M.half = 2; T.M.score = [12, 12];
  A.endHalf();
  ok(T.M.golden && T.M.half === 3 && !T.M.over, 'level at full time goes to a Golden Try');
  ok(Math.abs(A.periodLen() - 60*A.ARCADE.golden.len) < 1e-9, 'extra time is half a half');
  ok(T.M.phase === 'set' && T.M.set.kind === 'kickoff', 'extra time starts with a kick-off');
  A.scoreTry(T.M.players[3]);
  ok(T.M.score[0] === 17 && T.M.hooter, 'a Golden Try wins it');
  let n = 0; while (!T.M.over && n < 2000) { T.update(STEP); n++; }
  ok(T.M.over && T.M.score[0] === 17, `the match ends at once, with no conversion (${T.M.score.join('-')})`);

  play({ arcade:true });
  T.M.half = 2; T.M.score = [7, 7]; A.endHalf();
  T.M.phase = 'play'; T.M.set = null;
  A.dropGoal(1);
  n = 0; while (!T.M.over && n < 2000) { T.update(STEP); n++; }
  ok(T.M.over && T.M.score[1] === 10, 'a drop goal in extra time wins it too');

  play({ arcade:true });
  T.M.half = 2; T.M.score = [5, 5]; A.endHalf();
  A.endHalf();
  ok(T.M.over && T.M.score[0] === T.M.score[1], 'still level when extra time runs out: the draw stands');

  play({ arcade:true, champ:true });
  T.M.half = 2; T.M.score = [10, 10]; A.endHalf();
  ok(T.M.over && !T.M.golden, 'a championship keeps its draws');
  play({ arcade:true });
  T.M.half = 2; T.M.score = [10, 5]; A.endHalf();
  ok(T.M.over && !T.M.golden, 'a match with a winner just ends');
  play({});
  T.M.half = 2; T.M.score = [3, 3]; A.endHalf();
  ok(T.M.over && !T.M.golden, 'no Golden Try outside arcade');
}

// 4. whole arcade matches play out, with the heat counted
{
  let heats = 0, done = 0;
  for (let i = 0; i < 4; i++) {
    play({ arcade:true, halfLen:90 });
    T.M.side[0].human = false; T.M.side[0].ctrl = null;   // nobody is holding the controls headless, and a human's goal kick would wait for them: the CPU plays both, the arcade rules stay on
    let n = 0; while (!T.M.over && n < 400000) { T.update(STEP); n++; }
    if (T.M.over) done++;
    heats += Object.keys(T.M.stats).filter(k => k.startsWith('heat_')).reduce((a, k) => a + T.M.stats[k], 0);
  }
  ok(done === 4, `every arcade match reaches full time (${done}/4)`);
  ok(heats > 0, `good moments build heat in real play (${heats})`);
}

console.log(`${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
