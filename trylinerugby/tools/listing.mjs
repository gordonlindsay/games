// The store listing pack and the game's web pages: store-listing/*.md, privacy.html, support.html, superfan.html, pages.css.
// node tools/listing.mjs            check them (part of tools/check.mjs). Exits 1 on any failure.
// node tools/listing.mjs --write    regenerate privacy.html from PRIVACY.md, then check
// node tools/listing.mjs --launch   also fail while any [OWNER: ...] placeholder is left (run before submitting to the stores)
// What it checks: every file is there; the three pages link each other, load nothing from outside and carry no script; no em
// or en dash anywhere in the pack; the listing copy keeps to each store's length limits and avoids the banned words and the other
// store's name, and Apple's copy never says who the app is for by age (guideline 2.3.8); a share is always stated as a share of
// what we receive; privacy.html is PRIVACY.md; the fonts line in PRIVACY.md matches how index.html loads its fonts; superfan.html
// lists exactly the FAN_CLUBS marked agreed, with their shares, and names no other; the game's share line (storeShareLine) uses
// superfan.html's words; Apple's copy without Super Fan (for a build with no club agreed) names neither Super Fan nor Add Your Team (the import), and
// the copy with it (the .fan keys) is there for when one is; every page names the company with its registration; the owner's wording
// of 9 November 2026 (the subtitle and the Full Game's descriptions) and every place that repeats it in step; the Supporters' Wall on
// superfan.html (its steps, adults only, a list only for an agreed club), in PRIVACY.md and the launch checklist (removal takes a name
// off the page, and its earlier versions stay readable in the public repository's history, said plainly), and a crest only with
// the club's written permission; the screenshots are all there at their exact sizes with no alpha channel.
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
export const PAGE_TITLE = 'Tryline Rugby Sevens';   // the App Store name (the owner, 2026-11-08); the web game's own title is index.html's
// The three pages' buttons, in one balanced row, the current page shown pressed. The same block on every page (checked).
export function listingNav(current) {
  return `<nav class="nav" aria-label="${PAGE_TITLE} pages">` + LISTING_PAGES.map(p =>
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
<meta name="description" content="What ${esc(PAGE_TITLE)} keeps on your device. It collects nothing about you or your child.">
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
// Apple guideline 2.3.8: "Use of terms like "For Kids" and "For Children" in app metadata is reserved in the App Store for the Kids
// Category". The app is in Sports, so Apple's copy and screenshot captions may name the Kids level, never an audience by age.
export const APPLE_AUDIENCE = [/\bfor\s+(?:kids|children|toddlers)\b/i, /\b\d+\s*(?:to|-|and)\s*\d+\s*years?[- ]?olds?\b/i, /\b(?:aged?|ages)\s+\d+/i];
// A share is stated as a share of what we receive (the owner, 2026-11-08): "N% of every Super Fan unlock" reads as N% of the price.
export const SHARE_WORDS = '% of what we receive for every Super Fan unlock goes to the club.';
export const shareLine = (name, share) => `Supports ${name}: ${share}${SHARE_WORDS}`;
// The owner's wording (2026-11-09: "play as and support your club", "career, championship, international modes").
export const OWNER_COPY = {
  'apple.subtitle':'Play as and support your club',
  'apple.iap.full.description':'Career, Championship and International modes',
  'google.iap.full.description':'Play as and support your club: Career, Championship and International modes, Create Team, the Hard level and the Legends sides. A one-off unlock.',
};
export const FULL_GAME_WORDS = 'Career, Championship and International modes';   // how every page and document names the Full Game's modes
const SHARE_OF_PRICE = /(?:%|\bshare)\s+of\s+(?:each|every)\s+Super Fan unlock/i;
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
// Copy for a build that sells Super Fan: apple.description.fan, apple.review.fan, apple.iap.fan.name and the like. The plain keys are
// for a build with no partner club agreed (agreed:false everywhere), where the app has no Super Fan and no Add Your Team.
export const isFanKey = key => /\.fan(?:\.|$)/.test(key);
const FAN_WORDS = /\bsuper\s+fan\b|\bimport\b|\badd\s+your\s+team\b/i;   // Add Your Team is the import's name in the game (2026-11-09)
// where the fan copy sits in a file, so --launch can leave its placeholders until a club is agreed
const fanRanges = md => [...md.matchAll(/<!--\s*copy:([a-z.]+)\s*-->\s*\n```[a-z]*\n[\s\S]*?\n```/g)].filter(m => isFanKey(m[1])).map(m => [m.index, m.index + m[0].length]);
// The company line every page ends with: who makes the game, where it is registered, its number and its registered office (UK
// companies must show these on their websites: the Company, LLP and Business (Names and Trading Disclosures) Regulations 2015, reg 25).
export const COMPANY = /is made by [A-Z][A-Za-z ]* Ltd, a company registered in (?:England and Wales|Scotland|Northern Ireland), company number \S+[^.]*\. Registered office: \S/;

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
// The words after the share in the game's own line (storeShareLine, the store work's), to hold superfan.html to them.
function storeShareWords() {
  const dir = at('src');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    if (!/\bconst storeShareLine\b/.test(src)) continue;
    const m = src.match(/const storeShareLine\s*=\s*\(?\s*(\w+)\s*\)?\s*=>\s*'Supports '\s*\+\s*\1\.name\s*\+\s*': '\s*\+\s*\1\.share\s*\+\s*'([^'\\]*)'/)
      || src.match(/const storeShareLine\s*=\s*\(?\s*(\w+)\s*\)?\s*=>\s*`Supports \$\{\1\.name\}: \$\{\1\.share\}([^`$\\]*)`/);
    return m ? { file:f, words:m[2] } : { file:f, error:'not in a shape this check reads' };
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
  ok(!SHARE_OF_PRICE.test(text), `${p.file} states a share as a share of what we receive, never "of every Super Fan unlock"`);
  const ext = [...html.matchAll(/<a\b[^>]*href="(https?:[^"]+)"/g)].map(m => m[1]);
  ok(ext.every(u => /^https:\/\//.test(u)), `${p.file}: every outside address is https`);
  ok(COMPANY.test(text), `${p.file} names the company with where it is registered, its number and its registered office`);
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
  for (const want of ['App Store', 'Google Play', 'Restore Purchases', 'Super Fan', 'grown-up check', "Supporters' Wall"]) ok(md.includes(want), `PRIVACY.md covers ${want}`);
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
    if (b.key.startsWith('apple.')) for (const r of APPLE_AUDIENCE) ok(!r.test(b.text), `${b.file}: ${b.key} names no audience by age, which guideline 2.3.8 keeps for the Kids Category (${r.source})`);
    ok(!SHARE_OF_PRICE.test(b.text), `${b.file}: ${b.key} states a share as a share of what we receive`);
  }
  // Super Fan in Apple's copy only where the build sells it: a reviewer sent looking for a purchase or Add Your Team the app does not
  // have is a guideline 2.1 or 2.3.1 rejection (LAUNCH_CHECKLIST.md, section 4)
  for (const k of ['apple.description', 'apple.review', 'apple.description.fan', 'apple.review.fan']) ok(keys.has(k), `the listing copy has ${k}`);
  for (const b of blocks.filter(b => b.key.startsWith('apple.') && !isFanKey(b.key))) ok(!FAN_WORDS.test(b.text), `${b.file}: ${b.key} is for a build with no Super Fan, so names neither Super Fan nor Add Your Team (the import) (those go in ${b.key}.fan)`);
  for (const k of ['apple.description.fan', 'apple.review.fan']) { const b = blocks.find(x => x.key === k); if (b) ok(/\bSuper Fan\b/.test(b.text) && /\bAdd Your Team\b/.test(b.text) && !/\bImport (?:Club|Data)\b/.test(b.text), `${b.file}: ${k} sells Super Fan and Add Your Team, by the game's name for it`); }
  {
    const fc = fanClubs(), agreed = !!(fc && fc.clubs && fc.clubs.some(c => c.agreed === true));
    console.log(agreed ? 'A partner club is agreed in FAN_CLUBS: submit with apple.description.fan and apple.review.fan, and attach its tryline.fan product with tryline.full'
      : 'No partner club is agreed in FAN_CLUBS: submit with apple.description and apple.review (no Super Fan), and attach tryline.full alone');
  }
  const kw = blocks.find(b => b.key === 'apple.keywords');
  if (kw) {
    const words = kw.text.split(',');
    ok(!/,\s|\s,/.test(kw.text) && !/\n/.test(kw.text), 'the App Store keywords are one comma-separated line with no spaces round the commas');
    ok(new Set(words.map(w => w.toLowerCase())).size === words.length, 'no keyword is repeated');
    const indexed = ['apple.name', 'apple.subtitle'].flatMap(k => (blocks.find(b => b.key === k) || { text:'' }).text.toLowerCase().split(/[^a-z0-9]+/)).filter(Boolean);
    const repeats = words.filter(w => indexed.includes(w.toLowerCase()));
    ok(!repeats.length, `no keyword repeats a word of the app name or subtitle, which Apple indexes already${repeats.length ? ': ' + repeats.join(', ') : ''}`);
  }
  // the screenshot captions go on Apple's screenshots too, so 2.3.8 holds for them
  if (fs.existsSync(at('store-listing/SCREENSHOTS.md'))) {
    const captions = read('store-listing/SCREENSHOTS.md').split('\n').filter(l => /^\|\s*`\d\d-[a-z]+\.png`/.test(l)).map(l => l.split('|').map(c => c.trim()).filter(Boolean).pop());
    ok(captions.length === LISTING_MOMENTS.length, `SCREENSHOTS.md has a caption idea for each of the ${LISTING_MOMENTS.length} moments`);
    for (const c of captions) for (const r of APPLE_AUDIENCE) ok(!r.test(c), `SCREENSHOTS.md: the caption "${c}" names no audience by age (guideline 2.3.8)`);
  }
}

// 7. superfan.html names a partner club only once it has agreed in writing (FAN_CLUBS' agreed:true), with its share, in the game's words.
// The page is public as soon as the work merges, long before the app ships, so a club whose agreement is not signed is not named.
{
  const html = fs.existsSync(at('superfan.html')) ? read('superfan.html') : '', live = html.replace(/<!--[\s\S]*?-->/g, ' ');
  const rows = [...live.matchAll(/<tr data-club="([a-z0-9]+)" data-product="([^"]+)" data-share="([0-9.]*)"><td>([^<]+)<\/td>([\s\S]*?)<\/tr>/g)]
    .map(m => ({ key:m[1], product:m[2], share:m[3], name:visible(m[4]).trim(), cells:visible(m[4] + ' ' + m[5]) }));
  const text = visible(html);
  ok((live.match(/<tr data-club=/g) || []).length === rows.length, 'every club row on superfan.html is in the checked shape');
  for (const r of rows) {
    ok(r.product === 'tryline.fan.' + r.key, `superfan.html: ${r.key} sells as tryline.fan.${r.key}`);
    ok(!!r.share && r.cells.includes(r.share + '%') && text.includes(shareLine(r.name, r.share)),
      `superfan.html: ${r.key} shows its share as N% and, under the table, the game's line "${shareLine(r.name, r.share || 'N')}" (a club is listed only with its agreed share)`);
  }
  const fc = fanClubs();
  if (fc && fc.error) ok(false, `FAN_CLUBS in src/${fc.file} could not be read (${fc.error}); update tools/listing.mjs`);
  else if (fc) {
    for (const c of fc.clubs) {
      const r = rows.find(x => x.key === c.key), short = c.name.replace(/\s+(?:RUFC|RFC|RUC|RC)$/, '');
      if (c.agreed === true) {
        ok(typeof c.share === 'number' && c.share > 0 && c.share <= 100, `FAN_CLUBS (src/${fc.file}): ${c.key} is marked agreed, so its share is set`);
        ok(!!r, `superfan.html lists ${c.name}, marked agreed in FAN_CLUBS (src/${fc.file})`);
        if (!r) continue;
        ok(r.product === c.product, `superfan.html: ${c.key}'s product is ${c.product}`);
        ok(r.share === String(c.share), `superfan.html: ${c.key}'s share is ${c.share}%, as in FAN_CLUBS`);
        ok(r.name === c.name, `superfan.html names ${c.name} as FAN_CLUBS does`);
      } else {
        ok(!r, `superfan.html has no row for ${c.name}: FAN_CLUBS does not mark it agreed (agreed:true once the club confirms its share in writing)`);
        ok(!text.includes(c.name) && !new RegExp('\\b' + short.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(text), `superfan.html does not name ${c.name} before it has agreed in writing`);
      }
    }
    ok(rows.every(r => fc.clubs.some(c => c.key === r.key)), 'superfan.html lists no club that FAN_CLUBS does not have');
  } else if (process.env.VERBOSE) console.log('note: no FAN_CLUBS in src/ yet (the store branch adds it); superfan.html checked on its own');
  const sw = storeShareWords();
  if (sw) ok(!sw.error && sw.words === SHARE_WORDS, sw.error ? `storeShareLine in src/${sw.file} could not be read (${sw.error}); update tools/listing.mjs`
    : `storeShareLine in src/${sw.file} ends "${SHARE_WORDS}", as superfan.html does (it ends "${sw.words}")`);
}

// 8. the links the store's code opens are pages that are here (once the store's code is in)
for (const f of fs.readdirSync(at('src')).filter(f => f.endsWith('.js'))) {
  const src = fs.readFileSync(at('src/' + f), 'utf8');
  for (const m of src.matchAll(/'https:\/\/gordonlindsay\.github\.io\/games\/trylinerugby\/([a-z]+\.html)'/g)) ok(fs.existsSync(at(m[1])), `src/${f} opens ${m[1]}, which is here`);
}

// 8b. the owner's wording of 9 November 2026, and every copy that repeats it kept in step
{
  const blocks = LISTING_DOCS.filter(f => fs.existsSync(at(f))).flatMap(f => copyBlocks(read(f)).map(b => ({ ...b, file:f })));
  for (const [k, want] of Object.entries(OWNER_COPY)) {
    const b = blocks.filter(x => x.key === k);
    ok(b.length === 1 && b[0].text === want && [...want].length <= limitOf(k), `${k} is the owner's "${want}" (${[...want].length} of ${limitOf(k)})`);
  }
  ok(read('store-listing/APP_STORE.md').includes(`| Subtitle | ${OWNER_COPY['apple.subtitle']} |`) && read('store-listing/LISTING.md').includes(`The subtitle (${OWNER_COPY['apple.subtitle']})`), 'APP_STORE.md\'s table and LISTING.md\'s notes quote the same subtitle');
  for (const f of ['store-listing/APP_STORE.md', 'store-listing/SUPER_FAN.md', 'store/README.md', 'superfan.html', 'support.html']) ok(read(f).includes(FULL_GAME_WORDS), `${f} names the Full Game's modes as the store copy does (${FULL_GAME_WORDS})`);
  const all = [...OWN, 'store/README.md'].filter(f => fs.existsSync(at(f)) && !f.startsWith('tools/')).map(f => read(f)).join('\n');
  ok(!/Championship, Career, Create Team/.test(all), 'the old order (Championship, Career, Create Team) is gone everywhere');
  for (const k of ['apple.description', 'apple.description.fan', 'google.full']) {
    const t = (blocks.find(b => b.key === k) || { text:'' }).text, i = ['- Career:', '- Championship:', '- International:'].map(w => t.indexOf(w));
    ok(i.every((x, n) => x >= 0 && (!n || x > i[n - 1])), `${k} lists the Full Game's modes in the same order: Career, Championship, International`);
  }
}

// 8c. the Supporters' Wall: on superfan.html (its steps, adults only, a list only for an agreed club, empty to start), in PRIVACY.md and
// the launch checklist; and a crest only with the club's written permission
{
  const html = fs.existsSync(at('superfan.html')) ? read('superfan.html') : '', live = html.replace(/<!--[\s\S]*?-->/g, ' '), text = visible(html);
  const wall = text.slice(text.indexOf("Supporters' Wall"), text.indexOf('For Clubs'));
  ok(/<h2 id="wall">Supporters' Wall<\/h2>/.test(html) && html.indexOf('id="wall"') < html.indexOf('id="join"'), 'superfan.html has its Supporters\' Wall');
  ok(/18 or over/.test(wall) && /Join the Supporters' Wall/.test(wall) && /grown-up check/.test(wall) && /support@signcheck\.ai/.test(wall) && /a first name and your town, or a first name and an initial/.test(wall) && /taken off/.test(wall) && /only the name and the club/.test(wall), 'with the same opt-in steps the app takes: the grown-up check, 18 or over, the name, the email the grown-up sends, and how to be taken off');
  const fc = fanClubs(), agreed = fc && fc.clubs ? fc.clubs.filter(c => c.agreed === true).map(c => c.key) : [];
  const lists = [...live.matchAll(/<ul class="wall" data-club="([a-z0-9]+)">([\s\S]*?)<\/ul>/g)];
  ok((live.match(/class="wall"/g) || []).length === lists.length && lists.every(l => agreed.includes(l[1])), `each wall's list is in the checked shape and belongs to a club agreed in writing (${lists.map(l => l[1]).join(', ') || 'none yet'})`);
  const names = lists.flatMap(l => [...l[2].matchAll(/<li>([^<]*)<\/li>/g)].map(m => visible(m[1]).trim()));
  ok(names.every(n => n.length >= 2 && n.length <= 40 && !/@|\d{3}|https?:/i.test(n)), `every name on a wall is a short name, never an email, a number or a link (${names.length})`);
  ok(lists.length || /No names yet\./.test(wall), 'empty to start: No names yet.');
  const md = read('PRIVACY.md');
  ok(/Requests to join the wall arrive by email\. SignCheck Ltd checks each one by hand and keeps only the name and the club, to publish them/.test(md) && /email support@signcheck\.ai at any time and we will remove it/.test(md) && /We never list a child/.test(md), 'PRIVACY.md: requests arrive by email, SignCheck Ltd keeps only the name and the club to publish them, removal on request, never a child');
  // the names are published by committing them to superfan.html in a public repository: taking one off the page leaves it in the
  // repository's history, and every page that promises removal says so plainly (the owner decides before the first name goes up)
  const history = /The page is published from a public code repository on GitHub, so its earlier versions, with any name that was on them, can still be read in that repository's history after a name comes off the page\./;
  ok(/email support@signcheck\.ai at any time and we will remove it from the page\./.test(md) && history.test(md) && /to take it off the page \(earlier versions of the page stay readable, as Supporters' Wall says\)/.test(md) && !/we will remove it\.(?!\w)/.test(md), 'PRIVACY.md (and so privacy.html): removal takes a name off the page, and earlier versions stay readable in the public repository\'s history');
  ok(/we will remove it from this page\. This page is published from a public code repository on GitHub, so its earlier versions, with any name that was on them, can still be read in that repository's history after a name comes off the page\./.test(wall), 'superfan.html says the same where it promises removal');
  const lc = read('store-listing/LAUNCH_CHECKLIST.md');
  ok(/\*\*The Supporters' Wall: reviewing and publishing names\.\*\*/.test(lc) && /18 or over/.test(lc) && /Delete the email/.test(lc), 'the launch checklist has the owner\'s step: check each request, publish the name, delete the email, remove on request');
  ok(/\*\*The Supporters' Wall: where the names live, decided before the first one goes up\.\*\*[^\n]*public repository[^\n]*history/.test(lc) && /reply to say it is off the page, and that earlier versions of the page stay in the public repository's history/.test(lc) && lc.indexOf('where the names live') < lc.indexOf('reviewing and publishing names'), 'and, before it, the owner\'s decision on where the names live, with the public history spelled out; a removal\'s reply says the same');
  ok(/\*\*A crest only with the club's written permission\.\*\*/.test(lc) && /crest[^.]*\*\*written permission\*\*|written permission[^.]*crest|crest[^.]*written permission/i.test(read('store-listing/SUPER_FAN.md')), 'the launch checklist and SUPER_FAN.md: a crest only with the club\'s written permission');
  if (fc && fc.clubs) ok(fc.clubs.every(c => c.crest === null || (/^crests\/[a-z0-9-]{1,32}\.(?:png|webp|svg)$/.test(c.crest) && fs.existsSync(at(c.crest)))), 'every crest in FAN_CLUBS is null, or a file of the game\'s own that is there');
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
  const fc = fanClubs(), agreed = !!(fc && fc.clubs && fc.clubs.some(c => c.agreed === true));   // with no club agreed, the Super Fan copy's placeholders wait
  const left = OWN.filter(f => fs.existsSync(at(f)) && !f.startsWith('tools/')).flatMap(f => {
    const md = read(f), skip = agreed ? [] : fanRanges(md);
    return [...md.matchAll(/\[OWNER:[^\]]*\]/g)].filter(m => !skip.some(([a, b]) => m.index >= a && m.index < b)).map(m => `${f}: ${m[0]}`);
  });
  if (flags.has('--launch')) ok(!left.length, `no owner placeholders left${left.length ? ':\n  ' + left.join('\n  ') : ''}`);
  else console.log(`${left.length} owner placeholders to fill before launch (node tools/listing.mjs --launch lists them)`);
}

console.log(`${passed} checks passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
