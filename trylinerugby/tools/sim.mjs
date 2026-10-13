// AI v AI: how a match plays out with nobody holding the stick.
// node tools/sim.mjs [matches=24] [halfSeconds=240] [difficulty 0|1|2 = 1]
import { T } from './harness.mjs';

const n = +process.argv[2] || 24, half = +process.argv[3] || 240, diff = process.argv[4] == null ? 1 : +process.argv[4];
const res = T.simulate(n, half, diff);
const agg = {}, gk = { att: [0, 0], made: [0, 0] }, dg = { att: [0, 0], made: [0, 0], charged: [0, 0] };
for (const r of res) {
  agg.tries = (agg.tries || 0) + r.tries[0] + r.tries[1];
  agg.points = (agg.points || 0) + r.score[0] + r.score[1];
  for (const [k, v] of Object.entries(r.stats)) { if (typeof v !== 'number') continue; agg[k] = (agg[k] || 0) + v; }   // gk and dg are objects: summed below
  for (const t of [0, 1]) { gk.att[t] += r.stats.gk.att[t]; gk.made[t] += r.stats.gk.made[t]; for (const k of ['att', 'made', 'charged']) dg[k][t] += r.stats.dg[k][t]; }
}
for (const r of res.slice(0, 8)) console.log(`${r.teams.join(' v ')}  ${r.score.join('-')}  tries ${r.tries.join('-')}`);
console.log('per match:', Object.fromEntries(Object.entries(agg).map(([k, v]) => [k, +(v / n).toFixed(1)])));
const pct = t => gk.att[t] ? Math.round(100 * gk.made[t] / gk.att[t]) : 0;
console.log(`goal kicks: team 0 ${pct(0)}% (${gk.att[0]})  team 1 ${pct(1)}% (${gk.att[1]})`);
const dp = t => dg.att[t] ? `${Math.round(100 * dg.made[t] / dg.att[t])}% made, ${Math.round(100 * dg.charged[t] / dg.att[t])}% charged down (${dg.att[t]})` : 'none';
console.log(`drop goals: team 0 ${dp(0)}  team 1 ${dp(1)}`);
