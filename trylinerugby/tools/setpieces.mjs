// Scrum and lineout close-ups, played by script at different skill levels.
// Scrum: taps per second with the stick held forward, and whether the Set hit
// is timed. Lineout: how far off the perfect jump the press lands.
// node tools/setpieces.mjs [trialsPerCell=300]
import { T } from './harness.mjs';

const N = +process.argv[2] || 300;
const STEP = T.STEP;
const DIFFS = ['Easy', 'Normal', 'Hard'];

function freshMatch(diff) {
  T.newMatch(0, 1, { halfLen: 240, diff, headless: false, duels: 'off' });   // ENG v FRA, both power 5
  for (let i = 0; i < 120; i++) T.update(STEP);                  // let the kick-off settle
}
function runScrum(feed, taps, goodHit) {
  T.scrum(feed, 60, 35, '');
  T.input.jx = taps > 0 ? 1 : 0;
  let next = 0, guard = 0;
  while (T.M.phase !== 'cut' && guard++ < 400) T.update(STEP);
  const c = T.M.cut;
  while (T.M.cut === c && !c.result && guard++ < 2000) {
    if (goodHit && !c.hit && c.t >= 1.42) { T.input.aPressed = true; next = c.t + 1 / taps; }
    else if (taps > 0 && c.t >= 1.42 && c.t >= next) { T.input.aPressed = true; next = c.t + 1 / taps; }
    T.update(STEP);
  }
  T.input.jx = 0;
  const r = c.result;
  while (T.M.phase === 'cut' && guard++ < 4000) T.update(STEP);
  return r;
}
function runLineout(team, errSec) {
  T.lineout(team, 60, 5, '');
  let guard = 0;
  while (T.M.phase !== 'cut' && guard++ < 400) T.update(STEP);
  const c = T.M.cut, at = c.arrive - 0.57 + errSec;
  while (T.M.cut === c && c.winner == null && guard++ < 2000) {   // an overthrow's winner is drawn 0.45s after the miss
    if (c.jump[0] == null && c.t >= at) T.input.aPressed = true;
    T.update(STEP);
  }
  const w = c.winner;
  while (T.M.phase === 'cut' && guard++ < 4000) T.update(STEP);
  return w;
}
const pct = (n) => String(Math.round(100 * n / N)).padStart(3) + '%';

console.log('SCRUM, your put-in: share you keep (or better) / you win a penalty or pushover / CPU wins a penalty');
for (const [label, taps, hit] of [['no taps', 0, false], ['4/s', 4, false], ['6/s + hit', 6, true], ['8/s + hit', 8, true]]) {
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
console.log('\nSCRUM, their put-in: share you steal (against the head or penalty/pushover)');
for (const [label, taps, hit] of [['4/s', 4, false], ['6/s + hit', 6, true], ['8/s + hit', 8, true]]) {
  const row = [];
  for (let d = 0; d < 3; d++) {
    freshMatch(d);
    let won = 0;
    for (let i = 0; i < N; i++) { const r = runScrum(1, taps, hit); if (r === 'steal0' || r === 'dom0') won++; }
    row.push(`${DIFFS[d]} ${pct(won)}`);
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
