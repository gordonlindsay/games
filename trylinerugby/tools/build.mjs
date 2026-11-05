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

export const shellAssets = ['index.html', 'game.js', 'styles.css', 'practice.css', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'];
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
  return files.length;
}

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
      console.log(`Built game.js and sw.js from ${files.length} source sections.`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
