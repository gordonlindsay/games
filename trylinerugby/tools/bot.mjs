// Scripted average player v the CPU on each difficulty. The headline check
// after any change to speed, tackling, AI or duels.
// node tools/bot.mjs [matchesPerDifficulty=18] [halfSeconds=240] [--duels live|instant|off]
import { T, bot } from './harness.mjs';

const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const n = +pos[0] || 18, half = +pos[1] || 240, duels = flag('--duels', 'live');
for (const diff of [0, 1, 2]) {
  let us = 0, them = 0, tu = 0, tt = 0, w = 0, d = 0, l = 0, du = 0, dw = 0, dp = 0, frozen = 0;
  const kinds = { past: 0, pass: 0, tackle: 0, block: 0 };
  for (let i = 0; i < n; i++) {
    const a = i % 6, b = (a + 1 + (i % 5)) % 6;
    T.newMatch(a, b, { halfLen: half, diff, headless: true, duels });
    let steps = 0;
    while (!T.M.over && steps < 500000) { bot(); T.update(T.STEP); steps++; if (T.M.phase === 'cut' && T.M.cut && T.M.cut.duel) frozen += T.STEP; }
    const M = T.M;
    us += M.score[0]; them += M.score[1]; tu += M.tries[0]; tt += M.tries[1];
    if (M.score[0] > M.score[1]) w++; else if (M.score[0] < M.score[1]) l++; else d++;
    du += M.stats.duels; dw += M.stats.duelsWon; dp += M.stats.duelsPerfect;
    for (const k of Object.keys(kinds)) kinds[k] += M.stats['d_' + k] || 0;
  }
  const name = ['Easy', 'Normal', 'Hard'][diff];
  let line = `${name.padEnd(6)}  avg ${(us / n).toFixed(1)}-${(them / n).toFixed(1)}  tries ${(tu / n).toFixed(1)}-${(tt / n).toFixed(1)}  W${w} D${d} L${l}`;
  if (duels !== 'off') line += `  | duels ${(du / n).toFixed(2)}/match (${Object.entries(kinds).map(([k, v]) => k + ' ' + (v / n).toFixed(2)).join(', ')}) won ${du ? Math.round(100 * dw / du) : 0}% perfect ${du ? Math.round(100 * dp / du) : 0}% frozen ${(frozen / n).toFixed(1)}s`;
  console.log(line);
}
