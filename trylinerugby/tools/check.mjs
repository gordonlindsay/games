// Zero-dependency checks. Full stochastic/balance sweeps are opt-in.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const flags = new Set(process.argv.slice(2));
if ([...flags].some(flag => !['--full', '--two-player', '--help'].includes(flag))) {
  console.error('Usage: node tools/check.mjs [--full] [--two-player]');
  process.exit(2);
}
if (flags.has('--help')) {
  console.log('Usage: node tools/check.mjs [--full] [--two-player]\nDefault: build drift/syntax and focused gameplay/UI regressions.\n--full: add existing contact, duel, kicking, movement, passing, team and set-piece suites.\n--two-player: also run the separately tracked two-player suite (known failures; see tools/CHECKS.md).');
  process.exit(0);
}

const cwd = fileURLToPath(new URL('../', import.meta.url));
const jobs = [
  ['Build', ['tools/build.mjs', '--check']],
  ...['offline-core', 'offline-ui', 'practice', 'polish', 'feedback', 'transitions', 'input-lifecycle', 'tutorial', 'hints', 'howto', 'postmatch', 'season-data', 'season-ui', 'season-flow', 'arcade', 'camera', 'stamina', 'career', 'career-pro', 'traits', 'cups', 'county', 'importer', 'drills', 'drilldemo', 'training', 'together', 'kids', 'store', 'listing', 'native', 'ratings', 'yourteam', 'sides', 'sound', 'clarity'].map(name => [name, [`tools/${name}.mjs`]]),
  ['career-life', ['tools/career-life.mjs']],               // the career's Energy, Morale, Team Spirit and dilemmas
  ['locker', ['tools/locker.mjs']],                         // medals, balls and boots, the Legends (its browser part runs where Playwright is installed)
  ['career-season', ['tools/career-season.mjs']],           // scripted careers end to end with the real cups, old saves, every phase's screens
  ['home', ['tools/home.mjs']],                             // the home's headlines, My Team, the competitions by tier, the Legends' gate (its browser part runs where Playwright is installed)
  ['picker', ['tools/picker.mjs']],                         // the team screen side by side: the ladder, Left Right Up Down and a country, the swipe, the lock, the picks kept, each one-side mode, GAME_VERSION (its browser part runs where Playwright is installed)
  ['pressure', ['tools/pressure.mjs']],                     // pressure, the spill and the egg's bounce; PRESSURE off pinned to b706c3e
  ['maul', ['tools/maul.mjs']],                             // the maul: the trigger and its gates, the CPU's call, each result, the wheel, the world's maul, two player, the cards, MAUL off as before (its browser part runs where Playwright is installed)
  ['edge', ['tools/edge.mjs']],                             // Easy's edge: who has it, each lever's size, the Line Break, On Fire's Easy numbers, EDGE off as 90353c3
];
if (flags.has('--full')) {
  for (const name of ['contact', 'duels', 'goalkicks', 'moves', 'passing', 'teams', 'setpieces', 'browser']) jobs.push([name, [`tools/${name}.mjs`]]);
}
if (flags.has('--two-player')) jobs.push(['two-player (separate known failures)', ['tools/twoplayer.mjs']]);

let passed = 0, failed = 0;
const started = performance.now();
for (const [name, args] of jobs) {
  const start = performance.now();
  const result = spawnSync(process.execPath, args, { cwd, encoding:'utf8', maxBuffer:32*1024*1024 });
  const seconds = ((performance.now() - start)/1000).toFixed(1);
  if (result.status === 0 && !result.error) {
    passed++;
    const lines = result.stdout.trim().split('\n').filter(Boolean);
    const summary = [...lines].reverse().find(line => /\b(?:assertions? passed|passed,? \d*|checks? passed|passed\b|unchanged|verified|up to date)/i.test(line));
    console.log(`PASS ${name} (${seconds}s)${summary ? ' · ' + summary.trim() : ''}`);
  } else {
    failed++;
    console.error(`FAIL ${name} (${seconds}s)${result.signal ? ' · signal ' + result.signal : ''}`);
    if (result.stdout) process.stderr.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.error) console.error(result.error.message);
    // A stale/invalid bundle makes every subsequent result misleading.
    if (name === 'Build') break;
  }
}
console.log(`${passed} passed, ${failed} failed · ${((performance.now() - started)/1000).toFixed(1)}s`);
process.exitCode = failed ? 1 : 0;
