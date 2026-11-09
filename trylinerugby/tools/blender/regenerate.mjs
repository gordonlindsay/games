#!/usr/bin/env node
// One command for the player art: renders every body in Blender, a few at once, packs the atlases, then rebuilds sw.js so the service worker precaches them. Development only.
//   node tools/blender/regenerate.mjs [--work DIR] [--force] [--pack-only] [--only crouch,catch] [--hair bob,bunches]   --only adds or redoes those clips in each body's cached render, leaving the rest as it was.       BLENDER=/path/to/Blender overrides where Blender is; JOBS=3 how many run at once
//   --hair redoes only those hair styles. A style newly appended to STYLES needs no flag: the medium.m pass renders whichever styles its kept render lacks. Bodies and the other styles are not rendered again.
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
const blender = process.env.BLENDER || '/Applications/Blender.app/Contents/MacOS/Blender', jobs = Number(process.env.JOBS) || 3;
const script = fileURLToPath(new URL('./build_players.py', import.meta.url)), build = fileURLToPath(new URL('../build.mjs', import.meta.url));
const argv = process.argv.slice(2), at = argv.indexOf('--work'), work = at >= 0 ? argv[at + 1] : path.join(tmpdir(), 'tryline-players'), force = argv.includes('--force') ? ['--force'] : [], onlyAt = argv.indexOf('--only'), only = onlyAt >= 0 ? ['--only', argv[onlyAt + 1]] : [], hairAt = argv.indexOf('--hair');
const BODIES = ['medium.m', 'slim.m', 'stocky.m', 'medium.f', 'slim.f', 'stocky.f'];
const run = (args, tag) => new Promise((ok, no) => {
  const child = spawn(blender, ['--background', '--factory-startup', '--python-exit-code', '1', '--python', script, '--', '--work', work, ...args], { stdio:['ignore', 'pipe', 'inherit'] });
  let tail = '';
  child.stdout.on('data', d => { tail += d; const lines = tail.split('\n'); tail = lines.pop(); for (const l of lines) if (/^(rendered|atlases|  page|  clipped|done)/.test(l)) console.log(tag + l); });
  child.on('error', no); child.on('exit', c => (c ? no(new Error(`Blender failed on ${tag || 'the pack'}`)) : ok()));
});
try {
  if (hairAt >= 0) await run(['--hair', argv[hairAt + 1], '--render-only'], 'hair: ');
  else if (!argv.includes('--pack-only')) {
    const queue = BODIES.slice();
    await Promise.all(Array.from({ length:jobs }, async () => { while (queue.length) { const b = queue.shift(); await run(['--bodies', b, '--render-only', ...force, ...only], b + ': '); } }));
  }
  await run(['--reuse'], '');
  const r = spawnSync(process.execPath, [build], { stdio:'inherit' });
  if (r.status) throw new Error('build failed');
} catch (e) { console.error(e.message); process.exit(1); }
