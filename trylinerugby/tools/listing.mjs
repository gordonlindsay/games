// The store listing pack and the game's web pages: store-listing/*.md, privacy.html, support.html, superfan.html, pages.css.
// node tools/listing.mjs            check them (part of tools/check.mjs). Exits 1 on any failure.
// node tools/listing.mjs --write    regenerate privacy.html from PRIVACY.md, then check
// node tools/listing.mjs --launch   also fail while any [OWNER: ...] placeholder is left (run before submitting to the stores)
// What it checks: every file is there; the three pages link each other, load nothing from outside and carry no script; no em
// or en dash anywhere in the pack; the listing copy keeps to each store's length limits and avoids the banned words and the other
// store's name; privacy.html is PRIVACY.md; the fonts line in PRIVACY.md matches how index.html loads its fonts; superfan.html
// lists every club in FAN_CLUBS with its stated share; the screenshots are all there at their exact sizes with no alpha channel.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LISTING_SIZES, LISTING_MOMENTS, LISTING_FEATURE, SHOTS_DIR, shotFile } from './listing-shots.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const at = rel => path.join(ROOT, rel);
const read = rel => fs.readFileSync(at(rel), 'utf8');
const flags = new Set(process.argv.slice(2));
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } if (process.env.VERBOSE) console.log(cond ? 'ok  ' : 'FAIL', msg); };

export const LISTING_DOCS = ['README.md', 'APP_STORE.md', 'GOOGLE_PLAY.md', 'LISTING.md', 'SUPER_FAN.md', 'SCREENSHOTS.md', 'LAUNCH_CHECKLIST.md'].map(f => 'store-listing/' + f);
export const LISTING_PAGES = [
  { file:'privacy.html', label:'Privacy' },
  { file:'support.html', label:'Support' },
  { file:'superfan.html', label:'Super Fan' },
];
const OWN = [...LISTING_DOCS, ...LISTING_PAGES.map(p => p.file), 'pages.css', 'PRIVACY.md', 'store-listing/feature-graphic.html', 'tools/listing.mjs', 'tools/listing-shots.mjs'];

/* ---------- the pages' shared parts ---------- */
export const PAGE_TITLE = 'Try Line Rugby';
// The three pages' buttons, in one balanced row, the current page shown pressed. The same block on every page (checked).
export function listingNav(current) {
  return '<nav class="nav" aria-label="Try Line Rugby pages">' + LISTING_PAGES.map(p =>
    `<a class="btn" href="${p.file}"${p.file === current ? ' aria-current="page"' : ''}>${p.label}</a>`).join('') + '</nav>';
}
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// PRIVACY.md's markdown: headings, paragraphs, bullet lists, **bold**, `code` and [text](address). Nothing else is used.
function inline(s) {
  return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) => `<a href="${href}">${text}</a>`);
}
export function markdownBody(md) {
  const out = [], lines = md.replace(/\r/g, '').split('\n');
  let para = [], list = null;
  const flush = () => {
    if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; }
    if (list) { out.push('<ul>\n' + list.map(li => '<li>' + inline(li) + '</li>').join('\n') + '\n</ul>'); list = null; }
  };
  for (const line of lines) {
    const h = line.match(/^(#{1,3})\s+(.*)$/), li = line.match(/^-\s+(.*)$/);
    if (h) { flush(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); }
    else if (li) { if (para.length) flush(); (list ||= []).push(li[1]); }
    else if (!line.trim()) flush();
    else if (list) { flush(); para.push(line.trim()); }
    else para.push(line.trim());
  }
  flush();
  return out.join('\n');
}
// privacy.html, made from PRIVACY.md: its first heading is the page's title; the rest is the body.
export function privacyHtml(md) {
  const m = md.match(/^# (.*)\n/);
  const title = m ? m[1].replace(/^Privacy:\s*/, '') : PAGE_TITLE;
  const body = markdownBody(m ? md.slice(m[0].length) : md);
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b130e">
<title>Privacy · ${esc(title)}</title>
<meta name="description" content="What Try Line Rugby keeps on your device. It collects nothing about you or your child.">
<link rel="icon" href="icons/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="fonts/fonts.css">
<link rel="stylesheet" href="pages.css">
</head>
<body>
<!-- Made from PRIVACY.md by node tools/listing.mjs --write. Edit PRIVACY.md, not this file. -->
<main class="page">
<header class="top">
<p class="eyebrow">${esc(title)}</p>
<h1>Privacy</h1>
${listingNav('privacy.html')}
</header>
${body}
</main>
</body>
</html>
`;
}

/* ---------- the listing copy ---------- */
// Each piece of store copy sits in a fenced block straight after a <!-- copy:key --> marker; the key sets its store and limit.
// Apple counts the keyword field in bytes; everything else is in characters.
export const COPY_LIMITS = {
  'apple.name':30, 'apple.subtitle':30, 'apple.promo':170, 'apple.description':4000, 'apple.keywords':100, 'apple.whatsnew':4000,
  'apple.iap.name':30, 'apple.iap.description':45, 'apple.review':4000,
  'google.title':30, 'google.short':80, 'google.full':4000, 'google.iap.name':55, 'google.iap.description':200,
};
export const BANNED = [/\bsix\s+nations\b/i, /\bdonat(?:e|es|ed|ing|ion|ions)\b/i, /\bcharit(?:y|ies|able)\b/i, /\bbest\b/i, /\bultimate\b/i];
const NOT_ON_APPLE = [/\bandroid\b/i, /\bgoogle\b/i];
const NOT_ON_GOOGLE = [/\bapple\b/i, /\biphone\b/i, /\bipad\b/i, /\bapp store\b/i, /\bios\b/i];
const US_SPELLING = [/\bcolor/i, /\bfavorite/i, /\bcenter\b/i, /\bdefense\b/i, /\boffense\b/i, /\blicense\b/i, /\btraveling\b/i, /\bgray\b/i, /\bpracticing\b/i];
export function copyBlocks(md) {
  const out = [];
  const re = /<!--\s*copy:([a-z.]+)\s*-->\s*\n```[a-z]*\n([\s\S]*?)\n```/g;
  let m;
  while ((m = re.exec(md))) out.push({ key:m[1], text:m[2] });
  return out;
}
const limitOf = key => COPY_LIMITS[key] ?? COPY_LIMITS[key.split('.').slice(0, 2).join('.')] ?? COPY_LIMITS[key.replace(/\.[^.]+\.(name|description)$/, '.$1')];

/* ---------- PNG ---------- */
function pngInfo(file) {
  const b = fs.readFileSync(file);
  if (b.length < 33 || b.toString('latin1', 1, 4) !== 'PNG' || b.toString('latin1', 12, 16) !== 'IHDR') return null;
  return { w:b.readUInt32BE(16), h:b.readUInt32BE(20), depth:b[24], type:b[25] };   // type 2: RGB, no alpha
}

/* ---------- the club list, where the store's code is merged in ---------- */
function fanClubs() {
  const dir = at('src');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8'), m = src.match(/const FAN_CLUBS\s*=\s*(\[[\s\S]*?\n\]);/);
    if (!m) continue;
    try { return { file:f, clubs:Function('"use strict"; return (' + m[1] + ');')() }; }
    catch (e) { return { file:f, error:e.message }; }
  }
  return null;
}
const visible = html => html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/\s+/g, ' ');

/* ================= the checks ================= */
function main() {
if (flags.has('--write')) {
  fs.writeFileSync(at('privacy.html'), privacyHtml(read('PRIVACY.md')));
  console.log('wrote privacy.html from PRIVACY.md');
}

// 1. every file is there
for (const f of [...OWN]) ok(fs.existsSync(at(f)), `${f} is there`);

// 2. no em or en dash, and no dash entity, in anything the pack owns (the entity names are spelt in pieces so this file passes too)
const DASH = new RegExp('[\\u2013\\u2014]|&' + 'mdash;|&' + 'ndash;|&#821[12];|&#x201[34];', 'i');
const ARROW = new RegExp('[' + String.fromCodePoint(0x2190) + '-' + String.fromCodePoint(0x21ff) + [0x2794, 0x27a1, 0x2b05, 0x2b06, 0x2b07, 0x25b6, 0x25c0].map(c => String.fromCodePoint(c)).join('') + ']');   // arrow glyphs, spelt as code points
for (const f of OWN.filter(f => fs.existsSync(at(f)))) {
  const s = read(f), hit = s.match(DASH);
  ok(!hit, `${f} has no em or en dash${hit ? ' (found ' + JSON.stringify(hit[0]) + ' near "' + s.slice(Math.max(0, hit.index - 30), hit.index + 10).replace(/\n/g, ' ') + '")' : ''}`);
}

// 3. the pages: the same nav on each, linking all three, nothing loaded from outside, no script, no arrows, no banned words
for (const p of LISTING_PAGES) {
  if (!fs.existsSync(at(p.file))) continue;
  const html = read(p.file), text = visible(html);
  ok(/^<!doctype html>/i.test(html) && /<html lang="en-GB">/.test(html), `${p.file} is an en-GB HTML page`);
  ok(/<meta name="viewport" content="width=device-width,initial-scale=1/.test(html), `${p.file} has a phone viewport`);
  ok(/<title>[^<]+<\/title>/.test(html), `${p.file} has a title`);
  ok(html.includes(listingNav(p.file)), `${p.file} carries the shared nav with itself pressed`);
  for (const q of LISTING_PAGES) ok(html.includes(`href="${q.file}"`), `${p.file} links ${q.file}`);
  ok(!/<script\b/i.test(html), `${p.file} has no script`);
  const outside = [...html.matchAll(/<(?:link|script|img|iframe|source|video|audio)\b[^>]*(?:href|src)="((?:https?:)?\/\/[^"]+)"/gi)].map(m => m[1]);
  ok(!outside.length, `${p.file} loads nothing from another site${outside.length ? ': ' + outside.join(', ') : ''}`);
  ok(!/fonts\.(googleapis|gstatic)\.com/.test(html), `${p.file} never asks Google Fonts`);
  for (const m of html.matchAll(/(?:href|src)="([^"#:]+)(?:#[^"]*)?"/g)) {
    if (/^(?:[a-z]+:|\/\/)/i.test(m[1]) || m[1] === 'fonts/fonts.css') continue;   // fonts/fonts.css is the game's own (the native branch adds it)
    ok(fs.existsSync(at(m[1])), `${p.file}: ${m[1]} exists`);
  }
  const arrow = text.match(ARROW);
  ok(!arrow, `${p.file} has no arrow glyphs${arrow ? ': ' + arrow[0] : ''}`);
  for (const b of BANNED) ok(!b.test(text), `${p.file} avoids ${b.source}`);
  const ext = [...html.matchAll(/<a\b[^>]*href="(https?:[^"]+)"/g)].map(m => m[1]);
  ok(ext.every(u => /^https:\/\//.test(u)), `${p.file}: every outside address is https`);
}

// 4. privacy.html is PRIVACY.md
if (fs.existsSync(at('privacy.html'))) ok(read('privacy.html') === privacyHtml(read('PRIVACY.md')), 'privacy.html matches PRIVACY.md (run node tools/listing.mjs --write after editing PRIVACY.md)');

// 5. PRIVACY.md's fonts line says what index.html does
{
  const index = read('index.html'), md = read('PRIVACY.md');
  const google = /fonts\.googleapis\.com/.test(index), says = /loads its two typefaces from Google Fonts/.test(md);
  ok(google === says, google ? 'index.html loads Google Fonts, and PRIVACY.md says so'
    : 'index.html no longer loads Google Fonts, so PRIVACY.md must not say it does: replace that paragraph with "Its two typefaces come with the game, on the web and in the app. It never loads fonts from Google Fonts or any other site." and run node tools/listing.mjs --write');
  ok(!/\bNo purchases\b/i.test(md), 'PRIVACY.md does not still say there are no purchases');
  for (const want of ['App Store', 'Google Play', 'Restore Purchases', 'Super Fan', 'grown-up check']) ok(md.includes(want), `PRIVACY.md covers ${want}`);
}

// 6. the listing copy: limits, banned words, the other store's names, UK spelling
{
  const blocks = LISTING_DOCS.filter(f => fs.existsSync(at(f))).flatMap(f => copyBlocks(read(f)).map(b => ({ ...b, file:f })));
  const keys = new Set(blocks.map(b => b.key));
  for (const k of ['apple.name', 'apple.subtitle', 'apple.promo', 'apple.description', 'apple.keywords', 'google.title', 'google.short', 'google.full']) ok(keys.has(k), `the listing copy has ${k}`);
  for (const b of blocks) {
    const limit = limitOf(b.key), size = b.key === 'apple.keywords' ? Buffer.byteLength(b.text) : [...b.text].length;
    ok(limit != null, `${b.file}: ${b.key} is a known field`);
    if (limit != null) ok(size <= limit, `${b.file}: ${b.key} is ${size} of ${limit}${b.key === 'apple.keywords' ? ' bytes' : ''}`);
    ok(size > 0, `${b.file}: ${b.key} is not empty`);
    for (const r of BANNED) ok(!r.test(b.text), `${b.file}: ${b.key} avoids ${r.source}`);
    for (const r of b.key.startsWith('apple.') ? NOT_ON_APPLE : NOT_ON_GOOGLE) ok(!r.test(b.text), `${b.file}: ${b.key} does not name the other store (${r.source})`);
    for (const r of US_SPELLING) ok(!r.test(b.text), `${b.file}: ${b.key} keeps UK spelling (${r.source})`);
  }
  const kw = blocks.find(b => b.key === 'apple.keywords');
  if (kw) {
    const words = kw.text.split(',');
    ok(!/,\s|\s,/.test(kw.text) && !/\n/.test(kw.text), 'the App Store keywords are one comma-separated line with no spaces round the commas');
    ok(new Set(words.map(w => w.toLowerCase())).size === words.length, 'no keyword is repeated');
    const name = (blocks.find(b => b.key === 'apple.name') || { text:'' }).text.toLowerCase().split(/\s+/);
    ok(words.every(w => !name.includes(w.toLowerCase())), 'no keyword repeats a word of the app name (Apple indexes the name already)');
  }
}

// 7. superfan.html lists every partner club with its stated share, as FAN_CLUBS has it (once the store's code is in)
{
  const html = fs.existsSync(at('superfan.html')) ? read('superfan.html') : '';
  const rows = [...html.matchAll(/<tr data-club="([a-z0-9]+)" data-product="([^"]+)" data-share="([0-9.]*)"><td>([^<]+)<\/td>([\s\S]*?)<\/tr>/g)]
    .map(m => ({ key:m[1], product:m[2], share:m[3], name:visible(m[4]).trim(), cells:visible(m[4] + ' ' + m[5]) }));
  const text = visible(html);
  ok(rows.length > 0, 'superfan.html lists at least one club');
  for (const r of rows) {
    ok(r.product === 'tryline.fan.' + r.key, `superfan.html: ${r.key} sells as tryline.fan.${r.key}`);
    // a set share: the N% in its row, and the game's own line under the table ("Supports <club>: N% of ...", whatever follows)
    ok(r.share ? r.cells.includes(r.share + '%') && text.includes(`Supports ${r.name}: ${r.share}% of `) : /To Be Confirmed/.test(r.cells),
      `superfan.html: ${r.key} shows ${r.share ? 'its ' + r.share + '% and the line "Supports ' + r.name + ': ' + r.share + '% of ..."' : 'To Be Confirmed while its share is not set'}`);
  }
  const fc = fanClubs();
  if (fc && fc.error) ok(false, `FAN_CLUBS in src/${fc.file} could not be read (${fc.error}); update tools/listing.mjs`);
  else if (fc) {
    for (const c of fc.clubs) {
      const r = rows.find(x => x.key === c.key);
      ok(!!r, `superfan.html lists ${c.name} (FAN_CLUBS in src/${fc.file})`);
      if (!r) continue;
      ok(r.product === c.product, `superfan.html: ${c.key}'s product is ${c.product}`);
      ok(r.share === (c.share == null ? '' : String(c.share)), `superfan.html: ${c.key}'s share is ${c.share == null ? 'not set' : c.share + '%'}, as in FAN_CLUBS`);
      ok(r.name === c.name, `superfan.html names ${c.name} as FAN_CLUBS does`);
    }
    ok(rows.every(r => fc.clubs.some(c => c.key === r.key)), 'superfan.html lists no club that FAN_CLUBS does not have');
  } else if (process.env.VERBOSE) console.log('note: no FAN_CLUBS in src/ yet (the store branch adds it); superfan.html checked on its own');
}

// 8. the links the store's code opens are pages that are here (once the store's code is in)
for (const f of fs.readdirSync(at('src')).filter(f => f.endsWith('.js'))) {
  const src = fs.readFileSync(at('src/' + f), 'utf8');
  for (const m of src.matchAll(/'https:\/\/gordonlindsay\.github\.io\/games\/trylinerugby\/([a-z]+\.html)'/g)) ok(fs.existsSync(at(m[1])), `src/${f} opens ${m[1]}, which is here`);
}

// 9. the screenshots: every size and moment, exact pixels, RGB with no alpha
for (const size of LISTING_SIZES) {
  LISTING_MOMENTS.forEach((moment, i) => {
    const file = shotFile(size, moment, i), rel = path.relative(ROOT, file), info = fs.existsSync(file) ? pngInfo(file) : null;
    ok(!!info, `${rel} is there (node tools/listing-shots.mjs)`);
    if (info) ok(info.w === size.px[0] && info.h === size.px[1] && info.type === 2 && info.depth === 8, `${rel} is ${size.px.join('x')} RGB (is ${info.w}x${info.h}, colour type ${info.type})`);
  });
}
{
  const file = path.join(SHOTS_DIR, LISTING_FEATURE.file), info = fs.existsSync(file) ? pngInfo(file) : null;
  ok(!!info && info.w === LISTING_FEATURE.px[0] && info.h === LISTING_FEATURE.px[1] && info.type === 2, `the Google Play feature graphic is ${LISTING_FEATURE.px.join('x')} RGB`);
}
{
  const strays = fs.existsSync(SHOTS_DIR) ? fs.readdirSync(SHOTS_DIR, { recursive:true }).filter(f => f.endsWith('.png')).map(f => path.join(SHOTS_DIR, f))
    .filter(f => f !== path.join(SHOTS_DIR, LISTING_FEATURE.file) && !LISTING_SIZES.some(s => LISTING_MOMENTS.some((m, i) => shotFile(s, m, i) === f))) : [];
  ok(!strays.length, `no stray screenshots${strays.length ? ': ' + strays.map(f => path.relative(ROOT, f)).join(', ') : ''}`);
}

// 10. what the owner still has to fill in
{
  const left = OWN.filter(f => fs.existsSync(at(f)) && !f.startsWith('tools/')).flatMap(f => [...read(f).matchAll(/\[OWNER:[^\]]*\]/g)].map(m => `${f}: ${m[0]}`));
  if (flags.has('--launch')) ok(!left.length, `no owner placeholders left${left.length ? ':\n  ' + left.join('\n  ') : ''}`);
  else console.log(`${left.length} owner placeholders to fill before launch (node tools/listing.mjs --launch lists them)`);
}

console.log(`${passed} checks passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
