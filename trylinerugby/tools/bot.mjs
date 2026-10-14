// Scripted average player v the CPU on each difficulty. The headline check
// after any change to speed, tackling, AI or duels.
// node tools/bot.mjs [matchesPerDifficulty=18] [halfSeconds=240] [--duels live|instant|off]
// HABITS=0 gives the old bot (no Sprint, no offloads, Pass mashed in a tackle); NOSPRINT=1, NOSPRINTBALL=1 and NODIVE=1 turn single habits off.
import { T, bot } from './harness.mjs';

const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const n = +pos[0] || 18, half = +pos[1] || 240, duels = flag('--duels', 'live');
const CONTACT_KEYS = ['tackles', 'broken', 'rucks', 'ruck_quick', 'ruck_normal', 'ruck_slow', 'dom0', 'dom1', 'second', 'turnovers', 'toRuck', 'intercepts', 'offAtt', 'offloads', 'off0', 'off1', 'offHeld', 'long', 'long0', 'long1',
  'fends', 'fend0', 'fend1', 'jolts', 'joltKnock', 'joltLoose', 'ankleTry', 'ankle0', 'trip', 'sprints', 'sprintSecs', 'sprintPick', 'cpuSprints', 'cpuSprintSecs', 'pens', 'knocks', 'ko_catch', 'ko_contact', 'ko_offload', 'wfMen', 'ignored'];
for (const diff of [0, 1, 2]) {
  let us = 0, them = 0, tu = 0, tt = 0, w = 0, d = 0, l = 0, du = 0, dw = 0, dp = 0, frozen = 0;
  const gk = { att: [0, 0], made: [0, 0] };
  const kinds = { past: 0, pass: 0, tackle: 0, block: 0 };
  const S = {}; for (const k of CONTACT_KEYS) S[k] = 0;
  const tags = {};
  for (let i = 0; i < n; i++) {
    const a = i % 6, b = (a + 1 + (i % 5)) % 6;
    T.newMatch(a, b, { halfLen: half, diff, headless: true, duels });
    let steps = 0;
    while (!T.M.over && steps < 500000) { bot(); T.update(T.STEP); steps++; if (T.M.phase === 'cut' && T.M.cut && T.M.cut.duel) frozen += T.STEP; }
    const M = T.M;
    us += M.score[0]; them += M.score[1]; tu += M.tries[0]; tt += M.tries[1];
    if (M.score[0] > M.score[1]) w++; else if (M.score[0] < M.score[1]) l++; else d++;
    du += M.stats.duels; dw += M.stats.duelsWon; dp += M.stats.duelsPerfect;
    for (const t of [0, 1]) { gk.att[t] += M.stats.gk.att[t]; gk.made[t] += M.stats.gk.made[t]; }
    for (const k of Object.keys(kinds)) kinds[k] += M.stats['d_' + k] || 0;
    for (const k of CONTACT_KEYS) S[k] += M.stats[k] || 0;
    for (const [k, v] of Object.entries(M.stats)) if (k.startsWith('tag_')) tags[k.slice(4)] = (tags[k.slice(4)] || 0) + v;
  }
  const name = ['Easy', 'Normal', 'Hard'][diff];
  const pct = t => gk.att[t] ? Math.round(100 * gk.made[t] / gk.att[t]) : 0;
  let line = `${name.padEnd(6)}  avg ${(us / n).toFixed(1)}-${(them / n).toFixed(1)}  tries ${(tu / n).toFixed(1)}-${(tt / n).toFixed(1)}  W${w} D${d} L${l}  kicks us ${pct(0)}% (${gk.att[0]}) them ${pct(1)}% (${gk.att[1]})`;
  if (duels !== 'off') line += `  | duels ${(du / n).toFixed(2)}/match (${Object.entries(kinds).map(([k, v]) => k + ' ' + (v / n).toFixed(2)).join(', ')}) won ${du ? Math.round(100 * dw / du) : 0}% perfect ${du ? Math.round(100 * dp / du) : 0}% frozen ${(frozen / n).toFixed(1)}s`;
  console.log(line);
  const f = v => (v / n).toFixed(1), f2 = v => (v / n).toFixed(2);
  if (T.contact) {
    console.log(`  contact: tackles ${f(S.tackles)} broken ${f(S.broken)} rucks ${f(S.rucks)} (quick ${f(S.ruck_quick)} normal ${f(S.ruck_normal)} slow ${f(S.ruck_slow)}) big hits us ${f2(S.dom0)} them ${f2(S.dom1)} second man ${f(S.second)}`);
    console.log(`  turnovers ${f2(S.turnovers)} (ruck ${f2(S.toRuck)}, loose ${f2(S.turnovers - S.toRuck)}) intercepts ${f2(S.intercepts)}  offloads us ${f2(S.off0)} them ${f2(S.off1)} of ${f2(S.offAtt)} (held ${f2(S.offHeld)})  fends us ${f2(S.fend0)} them ${f2(S.fend1)}  jolts ${f2(S.jolts)} (knock ${f2(S.joltKnock)} loose ${f2(S.joltLoose)})  ankle taps ${f2(S.ankle0)} of ${f2(S.ankleTry)} tripped ${f2(S.trip)}`);
    console.log(`  sprints us ${f2(S.sprints)} (${f(S.sprintSecs)}s, ring moved ${f2(S.sprintPick)}) cpu ${f2(S.cpuSprints)} (${f(S.cpuSprintSecs)}s)  pens ${f2(S.pens)}  knock-ons ${f2(S.knocks)} (catch ${f2(S.ko_catch)} contact ${f2(S.ko_contact)} offload ${f2(S.ko_offload)})  long passes us ${f2(S.long0)} them ${f2(S.long1)}  wrong-footed men ${f(S.wfMen)}  tackle presses ignored ${f2(S.ignored)}`);
    const tg = Object.entries(tags).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${f2(v)}`).join(', ');
    if (tg) console.log(`  tags/match: ${tg}`);
  }
}
