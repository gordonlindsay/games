#!/usr/bin/env node
// Assemble valid shared-closure source sections without changing their bytes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const gameDirectory = fileURLToPath(new URL('../', import.meta.url));
const manifestPath = path.join(gameDirectory, 'src/manifest.json');
const bundlePath = path.join(gameDirectory, 'game.js');
const prefix = '\n(() => {\n';
const suffix = '})();\n';

export function assembleBundle() {
  const files = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!Array.isArray(files) || !files.length || files.some(file => typeof file !== 'string' || !/^[a-z][a-z0-9-]*\.js$/.test(file)) || new Set(files).size !== files.length) {
    throw new Error('src/manifest.json must list unique local JavaScript filenames in execution order.');
  }
  const sections = files.map(file => {
    const source = fs.readFileSync(path.join(gameDirectory, 'src', file), 'utf8');
    // Parse each section independently: never hide a split function or brace in the bundle.
    new vm.Script("'use strict';\n" + source, { filename:'src/' + file });
    return source;
  });
  const bundle = prefix + sections.join('') + suffix;
  // Also catches collisions and strict-mode errors across the shared closure.
  new vm.Script(bundle, { filename:'game.js' });
  return { bundle, files };
}

// The player art precaches with the shell, whatever hashed atlases tools/blender/regenerate.mjs last packed. No art in the tree is fine: the game draws its men in code
const playerArt = () => { const dir = path.join(gameDirectory, 'assets/players'); return fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^players[.-]/.test(f)).sort().map(f => 'assets/players/' + f) : []; };
// The recordings (assets/sounds: tools/sound-make.py names each by its content's hash, as the art) precache with the shell too, so a match
// offline has them once the game has been opened online, and the app carries them (app/scripts/copy-www.mjs copies shellAssets). None is fine:
// every sound has its recipe in src/sound.js. LICENCES.md beside them is the list of sources, not a file the game loads
export const soundFiles = () => { const dir = path.join(gameDirectory, 'assets/sounds'); return fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^[a-z]+-\d+\.[0-9a-f]{10}\.m4a$/.test(f)).sort().map(f => 'assets/sounds/' + f) : []; };
export const shellAssets = ['index.html', 'game.js', 'styles.css', 'practice.css', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', ...playerArt(), ...soundFiles()];
export function assembleWorker(bundle = assembleBundle().bundle) {
  const template = fs.readFileSync(path.join(gameDirectory, 'src/service-worker.js'), 'utf8');
  const hash = createHash('sha256').update(template);
  const digests = {};
  for (const asset of shellAssets) {
    const bytes = asset === 'game.js' ? bundle : fs.readFileSync(path.join(gameDirectory, asset));
    digests[asset] = createHash('sha256').update(bytes).digest('hex');
    hash.update(asset).update('\0').update(bytes).update('\0');
  }
  const version = hash.digest('hex').slice(0, 24);
  const worker = template.replace("__SHELL_VERSION__", version).replace('__SHELL_ASSETS__', JSON.stringify(shellAssets)).replace('__SHELL_DIGESTS__', JSON.stringify(digests));
  new vm.Script(worker, { filename: 'sw.js' });
  return { worker, version };
}
export function assertWorkerCurrent() {
  const { worker } = assembleWorker();
  if (!fs.existsSync(path.join(gameDirectory, 'sw.js')) || fs.readFileSync(path.join(gameDirectory, 'sw.js'), 'utf8') !== worker) {
    throw new Error('sw.js is out of date. Run node tools/build.mjs and commit shell assets and sw.js.');
  }
}

export function assertBundleCurrent() {
  const { bundle, files } = assembleBundle();
  if (!fs.existsSync(bundlePath) || fs.readFileSync(bundlePath, 'utf8') !== bundle) {
    throw new Error('game.js is out of date. Run node tools/build.mjs and commit both src/ and game.js.');
  }
  assertWorkerCurrent();
  assertServiceCurrent();
  return files.length;
}

// The import service (import-service/, deployed on its own to Vercel) runs the game's own parsers: src/import-core.js as it
// stands, with colorDist and the two lines it stands on taken from the game's sources (never a copy kept by hand), and an
// export footer, as a CommonJS module the function requires. Generated and committed, as game.js is, and checked the same way.
export const servicePath = path.join(gameDirectory, 'import-service/lib/import-core.cjs');
export const SERVICE_HELPERS = [['data.js', 'hyp'], ['match.js', 'hexRgb'], ['match.js', 'colorDist']];
export const SERVICE_EXPORTS = ['IMPORT_MAX_ROWS', 'IMPORT_MAX_REQUESTS', 'IMPORT_TIMEOUT', 'IMPORT_UA', 'IMPORT_MAX_HTML', 'IMPORT_SOURCES',
  'importUrl', 'importHost', 'importDoc', 'importRead', 'importParse', 'importMerge', 'importSafe', 'importFetch', 'importName', 'importHex', 'importNum', 'importLabel', 'importPersonal'];
export function assembleServiceCore() {
  const core = fs.readFileSync(path.join(gameDirectory, 'src/import-core.js'), 'utf8');
  const helpers = SERVICE_HELPERS.map(([file, name]) => {
    const lines = fs.readFileSync(path.join(gameDirectory, 'src', file), 'utf8').split('\n').filter(l => l.startsWith(`function ${name}(`) || l.startsWith(`const ${name} =`));
    if (lines.length !== 1) throw new Error(`src/${file} must define ${name} once, on one line, for the import service.`);
    new vm.Script(lines[0], { filename:'src/' + file });   // the whole definition, nothing cut off
    return lines[0];
  });
  const text = '// Generated by tools/build.mjs from src/import-core.js, with ' + SERVICE_HELPERS.map(([f, n]) => `${n} (src/${f})`).join(', ') + '.\n' +
    '// Do not edit: change the game\'s sources and run node tools/build.mjs, which checks this file is current.\n' +
    "'use strict';\n" + helpers.join('\n') + '\n' + core + (core.endsWith('\n') ? '' : '\n') +
    'module.exports = { ' + SERVICE_EXPORTS.join(', ') + ' };\n';
  new vm.Script('(function (module) {' + text + '\n})', { filename:'import-core.cjs' });
  return text;
}
export function assertServiceCurrent() {
  if (!fs.existsSync(servicePath) || fs.readFileSync(servicePath, 'utf8') !== assembleServiceCore()) {
    throw new Error('import-service/lib/import-core.cjs is out of date. Run node tools/build.mjs and commit it with src/import-core.js.');
  }
}

// The self-hosted typefaces are shell assets too: fonts/fonts.css and every file it names (once each, in the order it first
// names them), cached for offline play, hashed into the worker's version and copied into the app (app/scripts/copy-www.mjs).
// A file the stylesheet names but the folder lacks fails the build (assembleWorker reads every asset).
export function fontAssets() {
  const css = fs.readFileSync(path.join(gameDirectory, 'fonts/fonts.css'), 'utf8');
  const files = [...new Set([...css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map(m => m[1]))];
  if (!files.length || files.some(f => !/^[a-z0-9-]+\.woff2$/.test(f))) throw new Error('fonts/fonts.css must name local .woff2 files beside it.');
  return ['fonts/fonts.css', ...files.map(f => 'fonts/' + f)];
}
shellAssets.push(...fontAssets());

// A partner club's crest (crest in FAN_CLUBS, src/store.js: set only once the club has supplied it with its written permission) is a
// shell asset too, so the Super Fan's shield shows it offline and in the app. While every crest is null nothing is added. A crest
// that is not a file of the game's own in crests/, or that is not there, fails the build (assembleWorker reads every asset).
export function crestAssets(source = fs.readFileSync(path.join(gameDirectory, 'src/store.js'), 'utf8')) {
  const m = source.match(/const FAN_CLUBS\s*=\s*(\[[\s\S]*?\n\]);/);
  if (!m) return [];
  const clubs = new vm.Script('(' + m[1] + ')').runInNewContext({}), out = [];   // plain data, as tools/listing.mjs reads it
  for (const c of clubs) {
    if (c.crest == null) continue;
    if (typeof c.crest !== 'string' || !/^crests\/[a-z0-9-]{1,32}\.(?:png|webp|svg)$/.test(c.crest)) throw new Error(`FAN_CLUBS: ${c.key}'s crest must be null or crests/<name>.png, .webp or .svg.`);
    if (!out.includes(c.crest)) out.push(c.crest);
  }
  return out;
}
shellAssets.push(...crestAssets());

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  try {
    const args = process.argv.slice(2);
    if (args.some(arg => arg !== '--check') || args.length > 1) throw new Error('Usage: node tools/build.mjs [--check]');
    if (args.includes('--check')) {
      const count = assertBundleCurrent();
      console.log(`Bundle current: ${count} source sections; section and bundle syntax valid.`);
    } else {
      const { bundle, files } = assembleBundle();
      const { worker } = assembleWorker(bundle);
      // Validate everything before replacing the buildless browser entry point.
      const temporaryPath = bundlePath + '.tmp';
      try {
        fs.writeFileSync(temporaryPath, bundle);
        fs.renameSync(temporaryPath, bundlePath);
      } finally {
        if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
      }
      fs.writeFileSync(path.join(gameDirectory, 'sw.js.tmp'), worker);
      fs.renameSync(path.join(gameDirectory, 'sw.js.tmp'), path.join(gameDirectory, 'sw.js'));
      const service = assembleServiceCore();
      fs.mkdirSync(path.dirname(servicePath), { recursive:true });
      fs.writeFileSync(servicePath + '.tmp', service);
      fs.renameSync(servicePath + '.tmp', servicePath);
      console.log(`Built game.js, sw.js and the import service's import-core.cjs from ${files.length} source sections.`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
