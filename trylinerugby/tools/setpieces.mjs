// Scrum and lineout close-ups, played by script at different skill levels, the way a phone is actually played.
// Scrum: taps a second with an 18% jitter on each interval and the thumb off the stick (the stick plays no part since
// 2026-10-17), with a Good Hit on Set (1.47 ± 0.06s) or a late first tap that misses it (1.72-1.84s). Lineout: how far
// off the perfect jump the press lands. ENG v FRA, equal packs (power 5).
// node tools/setpieces.mjs [trialsPerCell=300]        (SEED=1 unless set)
process.env.SEED ??= '1';
const { T } = await import('./harness.mjs');

const N = +process.argv[2] || 300;
const STEP = T.STEP;
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
// set pieces are staged 120 steps after a kickoff, so a goal close-up can never be open here; if one is, the stage is wrong
const step = () => { T.update(STEP); if (T.M.cut && T.M.cut.kind === 'goal') { console.log('FAIL: a goal close-up opened during a set-piece run'); process.exit(1); } };
const DIFFS = ['Easy', 'Normal', 'Hard'];

let made = 0;
function freshMatch(diff) {
  T.newMatch(0, 1, { halfLen: 240, diff, headless: false, duels: 'off' });   // ENG v FRA, both power 5
  for (let i = 0; i < 120; i++) step();                          // let the kick-off settle
  made = 0;
}
function runScrum(feed, taps, goodHit) {
  if (made++ >= 40 || T.M.over) freshMatch(T.M.di);              // a fresh match every 40 scrums, so the clock never runs out mid-cell
  T.scrum(feed, 60, 35, '');
  T.input.jx = 0; T.input.jy = 0;                                // the thumb is off the stick
  let guard = 0;
  while (T.M.phase !== 'cut' && guard++ < 400) step();
  const c = T.M.cut;
  let next = taps > 0 ? (goodHit ? Math.min(1.66, Math.max(1.33, 1.47 + gauss()*0.06)) : 1.72 + Math.random()*0.12) : 99;
  while (T.M.cut === c && !c.result && guard++ < 2000) {
    if (taps > 0 && c.t >= next) { T.input.aPressed = true; next = c.t + Math.max(0.05, (1/taps)*(1 + 0.18*gauss())); }
    step();
  }
  const r = c.result;
  while (T.M.phase === 'cut' && guard++ < 4000) step();
  return r;
}
function runLineout(team, errSec) {
  T.lineout(team, 60, 5, '');
  let guard = 0;
  while (T.M.phase !== 'cut' && guard++ < 400) step();
  const c = T.M.cut, at = c.arrive - 0.57 + errSec;
  while (T.M.cut === c && c.winner == null && guard++ < 2000) {   // an overthrow's winner is drawn 0.45s after the miss
    if (c.jump[0] == null && c.t >= at) T.input.aPressed = true;
    step();
  }
  const w = c.winner;
  while (T.M.phase === 'cut' && guard++ < 4000) step();
  return w;
}
const pct = (n) => String(Math.round(100 * n / N)).padStart(3) + '%';
const SCRUM_ROWS = [['no taps', 0, false], ['4/s late', 4, false], ['5/s late', 5, false], ['7/s late', 7, false], ['5/s + hit', 5, true], ['6/s + hit', 6, true], ['7/s + hit', 7, true], ['8/s + hit', 8, true]];

console.log(`SCRUM (${N} a cell, SEED ${process.env.SEED}, taps jittered 18%, thumb off the stick; "late" is a first tap after the Good Hit window)`);
console.log('your put-in: share you keep (or better) / you win a penalty or pushover / CPU wins a penalty');
for (const [label, taps, hit] of SCRUM_ROWS) {
  const row = [];
  for (let d = 0; d < 3; d++) {
    freshMatch(d);
    const tally = {};
    for (let i = 0; i < N; i++) { const r = runScrum(0, taps, hit); tally[r] = (tally[r] || 0) + 1; }
    const keep = (tally.win0 || 0) + (tally.dom0 || 0);
    row.push(`${DIFFS[d]} ${pct(keep)} / ${pct(tally.dom0 || 0)} / ${pct(tally.dom1 || 0)}`);
  }
  console.log(label.padEnd(10), row.join('   '));
}
console.log('\ntheir put-in: share you steal (against the head or penalty/pushover) / CPU wins a penalty');
for (const [label, taps, hit] of SCRUM_ROWS.slice(1)) {
  const row = [];
  for (let d = 0; d < 3; d++) {
    freshMatch(d);
    let won = 0, pen = 0;
    for (let i = 0; i < N; i++) { const r = runScrum(1, taps, hit); if (r === 'steal0' || r === 'dom0') won++; if (r === 'dom1') pen++; }
    row.push(`${DIFFS[d]} ${pct(won)} / ${pct(pen)}`);
  }
  console.log(label.padEnd(10), row.join('   '));
}
console.log('\nLINEOUT: share you win, by how far your jump is off the perfect moment');
for (const team of [0, 1]) {
  console.log(team === 0 ? 'your throw' : 'their throw');
  for (const err of [0, 0.1, 0.2, 0.3, -0.2, null]) {
    const row = [];
    for (let d = 0; d < 3; d++) {
      freshMatch(d);
      let won = 0;
      for (let i = 0; i < N; i++) { const w = runLineout(team, err == null ? 99 : err); if (w === 0) won++; }
      row.push(`${DIFFS[d]} ${pct(won)}`);
    }
    console.log('  ' + (err == null ? 'no jump' : (err > 0 ? 'late ' : err < 0 ? 'early ' : 'on time ') + (err ? Math.abs(err) + 's' : '')).padEnd(12), row.join('   '));
  }
}
