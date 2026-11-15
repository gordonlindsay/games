#!/usr/bin/env node
// Local clubs by county: docs/clubs-local.json (the research, the source of truth) to src/clubs-local.js (one function, localCounties(),
// read by src/data.js when LOCAL is on). Validates loudly and writes nothing on any failure.
//   node tools/clubs-local.mjs           writes src/clubs-local.js
//   node tools/clubs-local.mjs --check   exits 1 if src/clubs-local.js is not what the research gives (as tools/build.mjs --check)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const SRC = path.join(root, 'docs/clubs-local.json'), OUT = path.join(root, 'src/clubs-local.js');
const args = new Set(process.argv.slice(2));
if ([...args].some(a => a !== '--check')) { console.error('Usage: node tools/clubs-local.mjs [--check]'); process.exit(2); }

const data = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const errors = [], notes = [];
const fail = m => errors.push(m);

/* ---------- the game as it stands: every code and name, and its own importSame ---------- */
const gameFiles = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js') && f !== 'clubs-local.js');
const gameSrc = Object.fromEntries(gameFiles.map(f => [f, fs.readFileSync(path.join(root, 'src', f), 'utf8')]));
const GAME = new Map();                                          // code: name, every side a list, a cup or the nations hold
for (const src of Object.values(gameSrc)) for (const m of src.matchAll(/\{ id:'([A-Z0-9]{3})', name:'((?:[^'\\]|\\.)*)'/g)) GAME.set(m[1], m[2].replace(/\\'/g, "'"));
if (!GAME.has('FAR') || !GAME.has('ENG') || !GAME.has('HNS')) fail('could not read the game\'s codes from src/ (FAR, ENG and HNS expected)');
// importSame exactly as the game has it (src/import-core.js), so two names the game would take for one club are caught here
const imp = gameSrc['import-core.js'], line = re => { const m = imp.match(re); if (!m) fail('src/import-core.js: ' + re + ' not found'); return m ? m[0] : ''; };
const importSame = new Function(`${line(/^const IMPORT_SUFFIX = .*;$/m)}\n${line(/^const IMPORT_LABEL = .*;$/m)}\n${line(/^const importKey = .*;$/m)}\n`
  + `${line(/^function importBase\(s\) \{[\s\S]*?\n\}$/m)}\n${line(/^const importSame = .*;$/m)}\nreturn importSame;`)();

/* ---------- the rules ---------- */
const LEVEL = [[/^National League 1\b/, 3], [/^National League 2\b/, 4], [/^Regional 1\b/, 5], [/^Regional 2\b/, 6], [/^Counties 1\b/, 7]];   // as COMP_LEAGUES (src/competitions.js)
const KEYS_TAKEN = ['int', 'eng', 'en2', 'fra', 'cel', 'sco', 'rsa', 'aus', 'nzl', 'jpn', 'sur', 'cty', 'my'];   // TEAM_LISTS' keys and My League's
const GROUP_PREFIX = ['nat', 'mine', 'fav', 'recent', 'comp', 'cup'];   // the ladder's own group keys (pickLadder, src/ui-menus.js)
const PICK_GROUP = /^[a-z0-9.-]{1,24}$/;                          // the save's group key (src/persistence.js)
const PLAIN = /Beaumont|Bill|Senior Vase|Twickenham/i;            // tools/county.mjs: never a person's or a sponsor's name, nor the RFU's own national cups
const PERSON = { 'Staffordshire Owen Cup':'named for a person' };   // a cup named for a person, which the plain-name rule also keeps out
const FOOT = 12;                                                  // the foot of the game's county tables (COUNTY_CUPS)
const MIN_LIST = 6;                                               // a championship is your side and five from the list
const hex = /^#[0-9a-f]{6}$/;
const DESIGNS = ['plain', 'hoops', 'halves', 'quarters', 'stripes', 'sash', 'band'];   // a kit's design and third colour (the owner's research, 14 Nov 2026), drawn since 1.8 (src/kit-design.js)
const WORDS = /^(?:he|his|him|she|her|man|men|guy|lad)$/i;        // a code is on the scoreboard: never a gendered word (tools/sides.mjs keeps them out of what the game shows)
const ABIL = ['pace', 'power', 'handling', 'kicking', 'stamina'];
// how a club plays (its flavour, TEAM_FLAVOUR): the game's own, not the club's. 3 in each, one up and one down, from the code
function flavour(id) {
  let h = 2166136261; for (const c of id) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const up = h % 5, down = (up + 1 + (h >>> 3) % 4) % 5, f = [3, 3, 3, 3, 3];
  f[up] = 4; f[down] = 2;
  return f;
}
/* A county's cups as the game reads them ({ name, to }, to ascending: a club enters the first whose to its level is within). Only what is
   sourced: a cup with both ends; one with only a start, the last to start there, runs to the foot. Names only, or none: null, the plain
   County Cup table (COUNTY_CUPS.ANY). */
function cupsOf(c) {
  const out = [], left = [];
  const starts = c.cups.map(x => x.from);
  c.cups.forEach((x, i) => {
    if (PLAIN.test(x.name) || PERSON[x.name]) { left.push(`${x.name} (${PERSON[x.name] || 'the plain-name rule'})`); return; }
    if (x.to != null) { out.push({ name:x.name, to:x.to }); return; }
    if (x.from != null && starts.indexOf(x.from) === i && starts.lastIndexOf(x.from) === i && !c.cups.some(o => o.from != null && o.from > x.from)) { out.push({ name:x.name, to:FOOT }); return; }
    left.push(`${x.name} (levels not sourced)`);
  });
  if (left.length) notes.push(`${c.county}: left out ${left.join(', ')}`);
  return out.length ? out : null;
}

/* ---------- read and check ---------- */
const counties = data.counties, ids = new Map(), names = [];
const sizes = {};                                                  // each league's table: its first XVs here and the second XVs left out
for (const c of counties) for (const x of c.clubs) sizes[x.league] = (sizes[x.league] || 0) + 1;
for (const x of data.droppedSecondXVs || []) if (sizes[x.league] != null) sizes[x.league]++;
const seenKeys = new Set();
for (const c of counties) {
  const key = c.code.toLowerCase();
  if (!/^[A-Z]{3}$/.test(c.code)) fail(`${c.county}: code ${c.code} is not three capitals`);
  if (KEYS_TAKEN.includes(key) && c.code !== 'SUR') fail(`${c.county}: key ${key} is a list's already`);
  if (GROUP_PREFIX.some(p => key === p || key.startsWith(p + '.'))) fail(`${c.county}: key ${key} is a group's`);
  if (!PICK_GROUP.test(key) || seenKeys.has(key)) fail(`${c.county}: key ${key} is not a fresh save key`);
  seenKeys.add(key);
  const bare = String(c.label || '').replace(/\u00ad/g, '');   // a label is one line of 16 at most, or two (labelWraps: Notts Lincs & Derbyshire) of 16 each
  if (!bare || (c.labelWraps ? bare.length > 32 || bare.split(' ').some(w => w.length > 16) : bare.length > 16)) fail(`${c.county}: label '${bare}' too long for its ${c.labelWraps ? 'two lines' : 'line'}`);
  const shared = c.code === 'SUR' ? [] : c.existingBelowScope || [];
  for (const id of shared) if (!GAME.has(id)) fail(`${c.county}: shared ${id} is not a game side`);
  const own = c.clubs.filter(x => !x.existingId).length + c.clubs.filter(x => x.existingId).length + shared.length;
  if (own < MIN_LIST) fail(`${c.county}: ${own} clubs, under ${MIN_LIST}`);
  let last = 0;
  for (const x of c.clubs) {
    const tag = `${c.county} ${x.id} ${x.name}`;
    if (x.county !== c.county || x.code !== c.code) fail(`${tag}: county ${x.county}/${x.code}`);
    const lv = LEVEL.find(([re]) => re.test(x.league));
    if (!lv || lv[1] !== x.level) fail(`${tag}: level ${x.level} for ${x.league}`);
    if (x.level < last) fail(`${tag}: out of level order`);
    last = x.level;
    if (!Number.isInteger(x.place) || x.place < 1 || x.place > sizes[x.league]) fail(`${tag}: place ${x.place} of ${sizes[x.league]}`);
    const fig = ['w', 'd', 'l', 'pf', 'pa'].map(k => x[k]);
    if (!(fig.every(v => v == null) || fig.every(v => Number.isInteger(v) && v >= 0))) fail(`${tag}: a part line`);
    if (!hex.test(x.kit) || !hex.test(x.trim)) fail(`${tag}: kit ${x.kit} ${x.trim}`);
    if (typeof x.hoops !== 'boolean' || !['confirmed', 'reported', 'guess'].includes(x.kitConfidence)) fail(`${tag}: hoops or kitConfidence`);
    if (x.kitFree != null && (!['hoops', 'trim'].includes(x.kitFree) || x.kitConfidence === 'guess')) fail(`${tag}: kitFree ${x.kitFree} (hoops or trim, on a sourced kit)`);   // a sourced kit's part that is a free choice (Pitchero gives no pattern, the owner's research no trim)
    if (x.design != null && (!DESIGNS.includes(x.design) || x.kitConfidence === 'guess' || x.hoops !== (x.design === 'hoops'))) fail(`${tag}: design ${x.design} (one of ${DESIGNS.join(', ')}, on a sourced kit, hooped exactly when it is hoops, so an older build and KITS off draw any other plain)`);
    if (x.third != null && (!hex.test(x.third) || x.design == null)) fail(`${tag}: third ${x.third} (a hex colour, with a design)`);
    if (x.existingId) {
      if (x.design != null || x.third != null) fail(`${tag}: a design or third on the game's own club (data.js has its kit)`);
      if (x.existingId !== x.id || !GAME.has(x.id)) fail(`${tag}: existingId ${x.existingId}`);
      else {
        const was = gameSrc['data.js'].match(new RegExp(`\\{ id:'${x.id}'[^\\n]*`))[0];
        const lg = (was.match(/league:'([^']*)'/) || [])[1], pl = +((was.match(/place:(\d+)/) || [])[1]);
        if (lg !== x.league || pl !== x.place) notes.push(`${tag}: the research has ${x.league} ${x.place}, the game ${lg} ${pl}; the game's line kept`);
      }
      continue;                                                   // the game's own club: its line, kit and name stay as data.js has them
    }
    if (!/^[A-Z]{3}$/.test(x.id)) fail(`${tag}: id not three capitals`);
    if (WORDS.test(x.id)) fail(`${tag}: id ${x.id} reads as a word on the scoreboard`);
    if (GAME.has(x.id)) fail(`${tag}: id ${x.id} is the game's ${GAME.get(x.id)}`);
    if (ids.has(x.id)) fail(`${tag}: id ${x.id} twice (${ids.get(x.id)})`);
    ids.set(x.id, x.name);
    if (!x.name || x.name.length > 16 || x.name !== x.name.trim()) fail(`${tag}: name over 16 or untrimmed`);
    if (x.fullName != null && (typeof x.fullName !== 'string' || !x.fullName || x.fullName !== x.fullName.trim() || x.fullName.length > 40)) fail(`${tag}: full name '${x.fullName}'`);   // written as full: where it differs, for the search (a card's name cut to 16)
    for (const [gid, gname] of GAME) if (importSame(x.name, gname)) fail(`${tag}: the same name to the game as its ${gid} ${gname}`);
    for (const o of names) if (importSame(x.name, o)) fail(`${tag}: the same name to the game as ${o}`);
    names.push(x.name);
  }
  const cups = cupsOf(c);
  if (cups) {
    for (let i = 1; i < cups.length; i++) if (!(cups[i].to > cups[i - 1].to)) fail(`${c.county}: cups not in level order (${cups.map(x => x.to)})`);
    for (const x of cups) if (PLAIN.test(x.name) || !/^[A-Za-z][A-Za-z ,&'.]+$/.test(x.name)) fail(`${c.county}: cup name ${x.name}`);
  }
  c.gameCups = cups;
}
if (!counties.some(c => c.code === 'SUR')) fail('no Surrey');
for (const k of Object.keys(sizes)) if (!LEVEL.some(([re]) => re.test(k))) fail(`league ${k} has no level`);
const MER = (data.gameKitChanges || []).find(g => g.id === 'MER');
if (MER && !(MER.to && hex.test(MER.to.kit) && hex.test(MER.to.trim))) fail('gameKitChanges: Merton\'s kit');

if (errors.length) { console.error(errors.map(e => 'clubs-local: ' + e).join('\n')); console.error(`clubs-local: ${errors.length} problem(s); nothing written`); process.exit(1); }

/* ---------- write ---------- */
const q = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\u00ad/g, '\\u00ad') + "'";
const clubLine = x => {
  const f = flavour(x.id), parts = [`id:${q(x.id)}`, `name:${q(x.name)}`, ...(x.fullName && x.fullName !== x.name ? [`full:${q(x.fullName)}`] : []), `kit:${q(x.kit)}`, `trim:${q(x.trim)}`, ...(x.hoops ? ['hoops:true'] : []),
    ...ABIL.map((k, i) => `${k}:${f[i]}`), `league:${q(x.league)}`, `place:${x.place}`,
    ...(x.w != null ? ['w', 'd', 'l', 'pf', 'pa'].map(k => `${k}:${x[k]}`) : [])];
  return `{ ${parts.join(', ')} },${x.kitConfidence === 'guess' ? '   // colours a free choice' : x.kitFree ? `   // ${x.kitFree} a free choice` : ''}`;
};
const cupText = cups => (cups ? '[' + cups.map(x => `{ name:${q(x.name)}, to:${x.to} }`).join(', ') + ']' : 'null');
const ordered = [...counties.filter(c => c.code === 'SUR'), ...counties.filter(c => c.code !== 'SUR').sort((a, b) => a.county.localeCompare(b.county, 'en'))];
let out = `/* =========================================================
   Local clubs by county: written by tools/clubs-local.mjs from docs/clubs-local.json, the research (version ${data.version}, ${data.generated}).
   Never edited by hand: change the research and run node tools/clubs-local.mjs (its --check is in tools/local.mjs).
   Every club in England's 2025-26 National League 1 and 2, Regional 1, Regional 2 and Counties 1, first XVs only, by its county (its RFU
   constituent body), Jersey and Guernsey Raiders under Hampshire and Douglas under Cheshire. Surrey first, then A to Z.
   - A club is written as data.js writes one: its kit and trim, how it plays (3 in each ability, one up and one down from its code: the
     game's own, not the club's), and its 2025-26 line. A place with no W-D-L is a league with no published table: its place only. full:
     its own name where the card's differs (cut to 16, or told apart), which the search finds as well.
   - Its rating comes from its league and place (localRated, src/ratings.js), never from the abilities here.
   - A kit marked a free choice is a guess; every other is the club's own colours as the research found them (docs/clubs-local.json
     has the source of each). Kits within a county are told apart at a glance; sourced kits that look alike stay as sourced, bar a
     Pitchero kit (it gives colours, never a pattern), whose hoops or trim, marked a free choice, tells it from the club it looked like.
     78 kits are the owner's research (14 Nov 2026); where it gave no second colour the trim is marked a free choice.
   - designs: a club's design (plain, hoops, halves, quarters, stripes, sash, band) and third colour from the owner's research, drawn
     since 1.8: data.js puts each on its club (src/kit-design.js draws it). A hooped one is hoops on its line too, so KITS off draws a
     club plain or hooped, as 1.7 did, whatever its design. A plain club's third is drawn as an edge at its collar and cuffs (kitEdgeOf).
   - The game's own clubs (Farnham and the rest of Surrey's, Aldershot) are not here: data.js has them. shared: the game's clubs a county
     also lists (Aldershot, in Surrey's list since PR #14, shown under Hampshire).
   - cups: the county's own cups by level ({ name, to }, as COUNTY_CUPS), only what is sourced; null for the plain County Cup table.
   - sizes: each league's table, second XVs counted, for localRated.
   One function declaration, after data.js in src/manifest.json (data.js holds 'use strict'): hoisted, so data.js calls it.
   ========================================================= */
function localCounties() {
  return {
    sizes:{
`;
for (const k of Object.keys(sizes).sort()) out += `      ${q(k)}:${sizes[k]},\n`;
out += '    },\n    counties:[\n';
for (const c of ordered) {
  const shared = c.code === 'SUR' ? [] : c.existingBelowScope || [];
  out += `      { county:${q(c.county)}, label:${q(c.label)}, code:${q(c.code)}, key:${q(c.code.toLowerCase())}, wraps:${!!c.labelWraps}, shared:[${shared.map(q).join(', ')}], cups:${cupText(c.gameCups)}, clubs:[\n`;
  for (const x of c.clubs) if (!x.existingId) out += '        ' + clubLine(x) + '\n';
  out += '      ] },\n';
}
out += `    ],
    kits:{ ${(data.gameKitChanges || []).map(g => `${g.id}:{ kit:${q(g.to.kit)}, trim:${q(g.to.trim)}, hoops:${!!g.to.hoops} }`).join(', ')} },   // the game's own kits a decision changes (Merton: plain, its hoops never sourced)
    designs:{   // each club's design and third colour as the owner's research gives them: data.js puts them on the clubs (1.8)
${ordered.flatMap(c => c.clubs.filter(x => !x.existingId && x.design != null)).map(x => `      ${x.id}:{ design:${q(x.design)}${x.third ? `, third:${q(x.third)}` : ''} },\n`).join('')}    },
  };
}
`;
const total = counties.reduce((a, c) => a + c.clubs.filter(x => !x.existingId).length, 0);
if (args.has('--check')) {
  const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (now !== out) { console.error('src/clubs-local.js is out of date: run node tools/clubs-local.mjs'); process.exit(1); }
  console.log(`clubs-local: src/clubs-local.js up to date (${total} new clubs in ${counties.length} counties)`);
} else {
  fs.writeFileSync(OUT, out);
  console.log(`clubs-local: wrote src/clubs-local.js (${total} new clubs in ${counties.length} counties, ${out.length} bytes)`);
}
for (const n of notes) console.log('  note: ' + n);
