// Scripted average player v the CPU on each difficulty. The headline check
// after any change to speed, tackling or AI: Easy should be a comfortable
// win, Normal a usual win, Hard close to a coin toss.
// node tools/bot.mjs [matchesPerDifficulty=18] [halfSeconds=240]
import { T, bot } from './harness.mjs';

const n = +process.argv[2] || 18, half = +process.argv[3] || 240;
for (const diff of [0, 1, 2]) {
  let us = 0, them = 0, tu = 0, tt = 0, w = 0, d = 0, l = 0;
  for (let i = 0; i < n; i++) {
    const a = i % 6, b = (a + 1 + (i % 5)) % 6;
    T.newMatch(a, b, { halfLen: half, diff, headless: true });
    let steps = 0;
    while (!T.M.over && steps < 400000) { bot(); T.update(T.STEP); steps++; }
    const M = T.M;
    us += M.score[0]; them += M.score[1]; tu += M.tries[0]; tt += M.tries[1];
    if (M.score[0] > M.score[1]) w++; else if (M.score[0] < M.score[1]) l++; else d++;
  }
  const name = ['Easy', 'Normal', 'Hard'][diff];
  console.log(`${name.padEnd(6)}  avg ${(us / n).toFixed(1)}-${(them / n).toFixed(1)}  tries ${(tu / n).toFixed(1)}-${(tt / n).toFixed(1)}  W${w} D${d} L${l}`);
}
