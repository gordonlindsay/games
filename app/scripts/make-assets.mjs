#!/usr/bin/env node
// Draw the sources @capacitor/assets turns into every app icon and launch screen (npm run assets), from the game's own
// icon (trylinerugby/icons/icon.svg): the goalposts and the ball on its dark green. Run again only if that icon changes.
//   node scripts/make-assets.mjs        (needs npm install first: sharp draws the SVG)
// assets/icon-only.png        1024 square, full bleed, no transparency: iOS rounds the corners itself and refuses an icon with alpha
// assets/icon-background.png  1024, the green: the back layer of Android's adaptive icon
// assets/icon-foreground.png  1024, the posts and ball on transparent, scaled into the adaptive icon's safe circle (61% across)
// assets/splash.png, splash-dark.png  2732 square, the posts and ball small in the middle of the game's night ground, so
//   any crop to a phone or tablet screen keeps them whole (the game is dark either way, so both are the same)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = fileURLToPath(new URL('../', import.meta.url));
const ICON = fileURLToPath(new URL('../../trylinerugby/icons/icon.svg', import.meta.url));
const GREEN = '#092b24', NIGHT = '#0b130e';
/* The artwork inside icon.svg's 512 box: everything after its rounded background square. */
export function iconArt(svg = fs.readFileSync(ICON, 'utf8')) {
  const m = svg.match(/^<svg\b[^>]*viewBox="0 0 512 512"[^>]*>\s*<rect\b[^>]*\/>([\s\S]*)<\/svg>\s*$/);
  if (!m) throw new Error('icons/icon.svg is not the 512 box with a background rect first.');
  return m[1];
}
export function sources(art = iconArt()) {
  const svg = (size, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`;
  const placed = (size, box) => `<g transform="translate(${(size - box)/2} ${(size - box)/2}) scale(${box/512})">${art}</g>`;
  const splash = svg(2732, `<rect width="2732" height="2732" fill="${NIGHT}"/>` + placed(2732, 1000));   // the artwork about 600px tall, a fifth of the side
  return {
    'icon-only.png': { size:1024, opaque:true, svg:svg(1024, `<rect width="1024" height="1024" fill="${GREEN}"/>` + placed(1024, 1024)) },
    'icon-background.png': { size:1024, opaque:true, svg:svg(1024, `<rect width="1024" height="1024" fill="${GREEN}"/>`) },
    'icon-foreground.png': { size:1024, opaque:false, svg:svg(1024, placed(1024, 1024*0.86)) },   // farthest point 0.34 of the side from the centre at full size; 0.29 here, inside the 0.305 safe radius
    'splash.png': { size:2732, opaque:true, svg:splash },
    'splash-dark.png': { size:2732, opaque:true, svg:splash },
  };
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  try {
    const { default: sharp } = await import('sharp');
    fs.mkdirSync(path.join(app, 'assets'), { recursive:true });
    for (const [name, s] of Object.entries(sources())) {
      let img = sharp(Buffer.from(s.svg)).resize(s.size, s.size);
      img = s.opaque ? img.flatten({ background:NIGHT }).removeAlpha() : img.ensureAlpha();
      await img.png({ compressionLevel:9 }).toFile(path.join(app, 'assets', name));
      console.log('Wrote assets/' + name);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
