// Writes tools/fixtures/career-saves.json: careers saved by each build before club seasons, made by that build's own code, for
// tools/career-season.mjs to load. Each build is taken from git (git archive), loaded through the harness (GAME=), and its own
// careerCreate, Play Match, full time and careerAdvance make a career at every stage, 0 Minis to 4 International: mid-season (two
// rounds played, a back on Whole Team) and finished (all five played, its end screen up and Continue not pressed, a forward, Women and
// My Player where the build has them). Promotion is that build's own rule: his skills are set to clear each stage's bar, then the season
// is won and Next Season pressed.
// node tools/fixtures/career-saves.mjs   (run from trylinerugby/; needs the repository's history)
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BUILDS = [
  ['00a9ec6', 'the first career: Minis, Juniors, County, Pro Club and International'],
  ['1d30ae0', 'Pro Mode (proMode)'],
  ['6165838', 'Energy, Morale and Team Spirit (life)'],
  ['820e376', 'Men | Women (cat), on the team hierarchy\'s branch'],
  ['ed37be5', 'all of them: the last build before club seasons'],
];
const here = fileURLToPath(new URL('.', import.meta.url)), game = path.resolve(here, '../..');

if (process.argv[2] === '--build') {                 // inside one build: GAME is set, print its careers as JSON
  process.env.SEED ??= '7';
  const { T, reseed } = await import('../harness.mjs');
  const C = T.career, X = T.teams, D = T.debug, memory = {};
  globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; } };
  Date.now = (() => { let now = Date.UTC(2026, 10, 1); return () => (now += 997); })();   // the seasons' ids, the same every run
  const settings = D.settings(); Object.assign(settings, { played:99, diff:1, kids:false, half:0 });
  const keys = C.skills().map(([k]) => k), atLeast = ovr => Math.ceil(1 + (ovr - 40.5)*98/59);
  const win = () => {                                // a round through the build's own Play Match and full time
    C.play(); const M = T.M; M.half = 2; M.score = [24, 7]; M.tries = [4, 1];
    if (M.careerDeeds) M.careerDeeds = { tries:1, tackles:2, goals:1 };
    T.arcade.endHalf(); D.exitMatch();
  };
  const out = {};
  for (let stage = 0; stage <= 4; stage++) for (const kind of ['mid', 'done']) {
    reseed(1000 + stage*10 + (kind === 'done' ? 1 : 0));
    const o = kind === 'mid' ? { name:'Sam', pos:'B', num:5, club:X.CLUBS[0] } : { name:'Isla', pos:'F', num:2, club:X.CLUBS[3], cat:'women', proMode:true };
    const cr = C.create(o); C.set(cr);
    for (let s = 0; s < stage; s++) {
      for (const k of keys) cr.skills[k] = Math.max(cr.skills[k], atLeast((C.STAGES[s].bar || 60) + 1));
      while (cr.season.round < 5) win();
      C.advance('WAL');                              // Next Season (the call-up's country, Wales)
    }
    if (kind === 'mid') { win(); win(); } else while (cr.season.round < 5) win();
    X.save();
    out[`s${stage}-${kind}`] = JSON.parse(memory['tryline.v1']).career;
  }
  console.log(JSON.stringify(out));
} else {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'career-saves-')), builds = {};
  try {
    for (const [rev, about] of BUILDS) {
      const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd:game }).toString().trim();
      const dir = path.join(tmp, rev), files = execFileSync('git', ['ls-tree', '-r', '--name-only', rev, 'trylinerugby/'], { cwd:root }).toString().split('\n').filter(f => /^trylinerugby\/([^/]+\.(html|js|css)|fonts\/[^/]+\.css)$/.test(f) && !/sw\.js$/.test(f));   // the page, its bundle and its styles
      fs.mkdirSync(dir);
      execFileSync('sh', ['-c', `git archive ${rev} ${files.join(' ')} | tar -x -C ${JSON.stringify(dir)}`], { cwd:root });
      const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--build'], { cwd:game, env:{ ...process.env, GAME:path.join(dir, 'trylinerugby/index.html') }, encoding:'utf8', maxBuffer:64*1024*1024 });
      if (r.status !== 0) { console.error(rev, r.stderr || r.stdout); process.exit(1); }
      builds[rev] = { about, careers:JSON.parse(r.stdout.trim().split('\n').at(-1)) };
      console.log(rev, Object.keys(builds[rev].careers).length, 'careers');
    }
  } finally { fs.rmSync(tmp, { recursive:true, force:true }); }
  fs.writeFileSync(path.join(here, 'career-saves.json'), JSON.stringify({ about:'Careers saved by the builds before club seasons, made by each build\'s own code (tools/fixtures/career-saves.mjs). Read by tools/career-season.mjs.', builds }) + '\n');
  console.log('wrote', path.join(here, 'career-saves.json'));
}
