// AI v AI: how a match plays out with nobody holding the stick.
// node tools/sim.mjs [matches=24] [halfSeconds=240] [difficulty 0|1|2 = 1]
import { T } from './harness.mjs';

const n = +process.argv[2] || 24, half = +process.argv[3] || 240, diff = process.argv[4] == null ? 1 : +process.argv[4];
const res = T.simulate(n, half, diff);
const agg = {};
for (const r of res) {
  agg.tries = (agg.tries || 0) + r.tries[0] + r.tries[1];
  agg.points = (agg.points || 0) + r.score[0] + r.score[1];
  for (const [k, v] of Object.entries(r.stats)) agg[k] = (agg[k] || 0) + v;
}
for (const r of res.slice(0, 8)) console.log(`${r.teams.join(' v ')}  ${r.score.join('-')}  tries ${r.tries.join('-')}`);
console.log('per match:', Object.fromEntries(Object.entries(agg).map(([k, v]) => [k, +(v / n).toFixed(1)])));
