#!/usr/bin/env node
// Copy the game's shipping files into app/www for Capacitor (webDir), and nothing else.
//   node scripts/copy-www.mjs [--out <dir>]
// The list is the game's own shell (shellAssets in trylinerugby/tools/build.mjs: the page, game.js, the stylesheets, the
// icons and the self-hosted fonts) plus the fonts' licence files, which the Open Font License asks to travel with the fonts.
// Left out: sw.js (the app registers no service worker), src/ and tools/ (development only), the docs, and anything else
// in the folder. The bundle must be current (node tools/build.mjs), and every local file the page or a stylesheet names must
// be in the copy, or nothing is written.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertBundleCurrent, shellAssets } from '../../trylinerugby/tools/build.mjs';

const game = fileURLToPath(new URL('../../trylinerugby/', import.meta.url));
const LICENCES = ['fonts/OFL-BigShouldersDisplay.txt', 'fonts/OFL-AtkinsonHyperlegible.txt'];

export function wwwFiles() {
  const files = [...shellAssets, ...LICENCES];
  if (new Set(files).size !== files.length) throw new Error('A shipping file is listed twice.');
  for (const f of files) {
    if (path.isAbsolute(f) || f.split('/').includes('..')) throw new Error('Not a file inside the game folder: ' + f);
    if (!fs.statSync(path.join(game, f), { throwIfNoEntry:false })?.isFile()) throw new Error('Missing shipping file: trylinerugby/' + f);
  }
  return files;
}
/* Every local file named by index.html (href, src) and by a shipped stylesheet (url()), relative to the game folder. */
export function localRefs(read = f => fs.readFileSync(path.join(game, f), 'utf8'), files = wwwFiles()) {
  const refs = new Set();
  const add = (from, ref) => {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)) return;   // another site, a data: URI or a fragment: not a file of ours
    refs.add(path.posix.normalize(path.posix.join(path.posix.dirname(from), ref.split(/[?#]/)[0])));
  };
  for (const m of read('index.html').matchAll(/\b(?:href|src)="([^"]+)"/g)) add('index.html', m[1]);
  for (const f of files.filter(f => f.endsWith('.css'))) for (const m of read(f).matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) add(f, m[1]);
  return [...refs];
}
export function copyWww(out) {
  out = path.resolve(out);
  const app = fileURLToPath(new URL('../', import.meta.url));
  const within = (dir, parent) => { const r = path.relative(parent, dir); return !r || (!r.startsWith('..') && !path.isAbsolute(r)); };
  if (within(game, out) || within(app, out) || within(out, game)) throw new Error('Refusing to replace ' + out + ': it holds the game or the app, or sits inside the game.');
  assertBundleCurrent();
  const files = wwwFiles();
  const missing = localRefs().filter(r => !files.includes(r));
  if (missing.length) throw new Error('The page names files the app would not carry: ' + missing.join(', '));
  fs.rmSync(out, { recursive:true, force:true });
  for (const f of files) {
    fs.mkdirSync(path.dirname(path.join(out, f)), { recursive:true });
    fs.copyFileSync(path.join(game, f), path.join(out, f));
  }
  return files;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  try {
    const args = process.argv.slice(2);
    if (!(args.length === 0 || (args.length === 2 && args[0] === '--out'))) throw new Error('Usage: node scripts/copy-www.mjs [--out <dir>]');
    const out = path.resolve(args[1] || fileURLToPath(new URL('../www/', import.meta.url)));
    const files = copyWww(out);
    const shown = path.relative(process.cwd(), out);
    console.log(`Copied ${files.length} shipping files into ${shown && !shown.startsWith('..') ? shown : out}.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
