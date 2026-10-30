// The full-time card: both sides, and only numbers the match counted. Exits 1 on any failure.
// node tools/postmatch.mjs            (SEED=11 unless set)
process.env.SEED ??= '11';
const { T } = await import('./harness.mjs');
const STEP = T.STEP, M = () => T.M, D = T.debug, $ = id => document.getElementById(id);
let failed = 0, passed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const near = (a, b, e) => Math.abs(a - b) <= e;
const fresh = (o = {}) => { T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'live', ...o }); D.setMode('match'); };

const text = () => $('br-stats').innerHTML;
const paint = (patch, kind = 'full') => {
  const S = M().stats;
  Object.assign(S, patch);
  if (kind === 'full') M().seriesDone = true;   // showing the card must not move a two-player series
  D.showBreak(kind);
  return text();
};

fresh();
M().score = [19, 12]; M().tries = [3, 2];
{
  paint({
    conv:{ att:[3, 2], made:[2, 1] }, pen:{ att:[1, 0], made:[0, 0] },
    tk:{ att:[14, 11], made:[11, 7] }, duelN:{ att:[4, 0], won:[3, 0] }, gain:[142.4, -2.2],
  });
  M().stats.dg.att = [1, 0]; M().stats.dg.made = [1, 0];
  const html2 = paint({});
  ok(!$('br-stats').hidden && html2.includes('Conversions') && html2.includes('2/3') && html2.includes('1/2'), `conversions are made of attempted (${html2})`);
  ok(html2.includes('Penalty Goals') && html2.includes('0/1') && html2.includes('Drop Goals') && html2.includes('1/1'), 'penalty goals and drop goals show when someone attempted one');
  ok(html2.includes('Tackles') && html2.includes('11/14') && html2.includes('7/11'), 'tackles are made of attempted, by side');
  ok(html2.includes('3/4') && html2.includes('\u2013'), 'your duels are won of attempted, and the computer has a dash');
  ok(html2.includes('142') && html2.includes('\u22122') && html2.includes('Metres Made'), `metres are whole, and a side driven back reads negative (${html2})`);
  ok(html2.includes('>ENG<') && html2.includes('>FRA<') && !html2.includes('<button'), 'the columns are the team codes, and the table is not a button');
  ok($('br-tries').textContent === 'England Win · Tries 3 – 2' && $('br-go').textContent === 'Continue' && $('br-row').hidden, 'the result line and Continue are unchanged');
  D.showBreak('half');
  ok($('br-stats').hidden && $('br-eyebrow').textContent === 'Half Time' && $('br-go').textContent === 'Second Half', 'half time hides the stats');
  D.showBreak('full');
  $('br-go').click();
  ok($('m-break').hidden && !$('s-home').hidden, 'Continue is still one press back to the menu');
}

D.setMode('menu'); D.openJoin();
{
  const sel = D.twoSel(); sel.teams = [T.teams.NATIONS[0], T.teams.NATIONS[1]]; sel.levels = [1, 1];
  D.startTwo(); M().headless = true;
  M().score = [15, 17]; M().tries = [3, 3];
  M().stats.dg.att = [0, 0]; M().stats.dg.made = [0, 0];
  const html = paint({
    conv:{ att:[3, 3], made:[1, 2] }, pen:{ att:[0, 0], made:[0, 0] },
    tk:{ att:[6, 8], made:[4, 5] }, duelN:{ att:[3, 2], won:[2, 0] }, gain:[40, 55],
  });
  ok(html.includes('2/3') && html.includes('0/2') && !html.includes('\u2013') && !html.includes('Penalty Goals') && !html.includes('Drop Goals'), `two player: both duel columns, and empty kick rows stay off (${html})`);
  ok($('br-tries').textContent === 'Player 2 Wins · Tries 3 – 3' && $('br-go').textContent === 'Rematch' && !$('br-row').hidden, 'Rematch and Change Teams stay where they were');
  const series = D.series().w.slice();
  $('br-go').click();
  ok($('m-break').hidden && M().phase !== 'break' && M().nat[0].id === 'ENG' && M().nat[1].id === 'FRA' && D.series().w[0] === series[0] && D.series().w[1] === series[1], 'Rematch is still one press, the same teams, and does not count the match twice');
}

// the counts themselves
fresh({ auto:true, humans:[false, false], duels:'off' });
D.goalKick(0, 99, 35, 'conversion');
ok(M().stats.conv.att[0] === 1 && M().stats.pen.att[0] === 0 && M().stats.gk.att[0] === 1, 'a conversion attempt is counted apart from penalty goals');
{
  let n = 0; while (M().goal && !M().goal.judged && n++ < 800) T.update(STEP);
  ok(M().stats.conv.made[0] === M().stats.gk.made[0] && M().stats.conv.made[0] === (M().score[0] >= 2 ? 1 : 0), `a conversion is made only when it scores (${M().stats.conv.made[0]}, gk ${M().stats.gk.made[0]}, score ${M().score[0]})`);
}
D.goalKick(1, 21, 40, 'penalty');
ok(M().stats.pen.att[1] === 1 && M().stats.conv.att[1] === 0 && M().stats.gk.att[1] === 1, 'a penalty goal attempt is not a conversion');

fresh({ duels:'off' });
{
  const c = M().players[0], q = M().players[7];
  c.x = 60; c.y = 35; c.vx = 4; c.vy = 0; c.fx = 1; c.fy = 0; q.x = 61.2; q.y = 35; q.vx = -2; q.vy = 0;
  T.contact.commitTackle(q, c, 'ai');
  ok(M().stats.tk.att[1] === 1 && M().stats.tk.att[0] === 0, 'the tackle attempt is the tackler\'s, not the carrier\'s');
  ok(M().stats.tk.made[1] === (M().contact ? 1 : 0), `a made tackle counts and a broken one does not (made ${M().stats.tk.made[1]}, contact ${!!M().contact})`);
}

fresh({ auto:true, humans:[false, false], duels:'off' });
{
  const p = M().players[0];
  M().phase = 'play'; M().ball.state = 'held'; M().ball.carrier = p;
  p.x = 40; p.y = 20; p.vx = 0; p.vy = 0; p.down = 0; p.bind = null; p.fx = 1; p.fy = 0;
  for (const o of M().players) if (o !== p) { o.x = 100; o.y = 60; }
  const x0 = p.x;
  T.contact.moveAll(STEP);
  ok(M().stats.gain[0] > 0 && near(M().stats.gain[0], p.x - x0, 1e-6), `metres are the ground made while carrying (${M().stats.gain[0]}, moved ${(p.x - x0).toFixed(3)})`);
  const g0 = M().stats.gain[0];
  p.vx = -8; T.contact.moveAll(STEP);
  ok(M().stats.gain[0] < g0, 'ground lost while carrying comes off the total');
}

fresh({ duels:'instant' });
{
  const won = M().stats.duelsWon, att = M().stats.duelN.att[0];
  T.forceDuel('past');
  ok(M().stats.duelN.att[0] === att + 1 && M().stats.duelN.att[1] === 0, 'a duel is counted for its owner');
  ok(M().stats.duelN.won[0] - 0 === M().stats.duelsWon - won, `the card's wins are the same wins as duelsWon (${M().stats.duelN.won[0]}, duelsWon ${M().stats.duelsWon})`);
}

fresh();
M().half = 2; M().phase = 'play'; M().hooter = true; M().clock = M().halfLen + 46; M().ball.state = 'dead';
$('m-break').hidden = true;
T.update(STEP);
ok(M().over && M().phase === 'break' && $('m-break').hidden, 'a headless full time records the end and does not open the card');

T.newMatch(0, 1, { halfLen:240, diff:1, demo:true, duels:'off', humans:[false, false] });
M().half = 2; M().phase = 'play'; M().hooter = true; M().clock = M().halfLen + 46; M().ball.state = 'dead';
$('m-break').hidden = true;
T.update(STEP);
ok(!M().over && $('m-break').hidden, 'the menu demo does not stop for a full-time card');

console.log(failed ? `FAIL ${failed}` : `ok (${passed} passed)`);
process.exit(failed ? 1 : 0);
