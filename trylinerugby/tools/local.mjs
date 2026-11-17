// The county clubs (LOCAL, src/data.js and src/clubs-local.js, 2026-11-14): every club of England's 2025-26 National League 1 and 2,
// Regional 1, Regional 2 and Counties 1, by county. The research and its generator, every club once, codes and names, six a list,
// the ratings in their bands and in table order, the county cups and their rivals, the ladder and the Filter, the search, the home's Local
// tier and Other County, the saves with the new keys, the place-only lines, and the build with LOCAL off as 1.6.1. Its browser part (every new
// club's card, the Filter, the Competitions tier and Other County at five sizes) runs where Playwright is installed.
// node tools/local.mjs   Exits 1 on any failure.
process.env.LOCAL ??= '{"on":true}';
process.env.SEED ??= '41';
const { T, reseed, offRun, LOCAL_CHILD } = await import('./harness.mjs');
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resultsServe } from './results-serve.mjs';
const X = T.teams, P = T.picker, H = T.home, C = T.career, K = T.cups, Q = T.comp, R = T.ratings, I = T.importer, D = T.debug, LO = T.local;
const $ = id => document.getElementById(id);
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } if (process.env.VERBOSE) console.log(cond ? 'ok  ' : 'FAIL', msg); };
const json = v => JSON.stringify(v);
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
const memory = {};
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; } };
const s = D.settings();

/* 0. With LOCAL off the build is 1.6.1 (1.6 with the areas renamed: below): every list, side, rating, kit and line, the ladder and its names, the search, the home's tiers, the
      county cups and the demo's draw, fingerprinted the same way from 56c38c1 (GAME=<its index.html> LOCAL_CHILD=1 node tools/local.mjs).
      Checked first, in a child (offRun). */
function dataPrint() {
  const out = [];
  const side = t => [t.id, t.name, t.kit, t.trim, !!t.hoops, t.pace, t.power, t.handling, t.kicking, t.stamina, t.league, t.place, t.w, t.d, t.l, t.pf, t.pa];
  out.push(json(X.ALL_TEAMS.map(side)));
  out.push(json(X.TEAM_LISTS.map(l => [l.key, l.tier, l.name, l.teams.map(t => t.id)])));
  out.push(json([P.LIST_HOME, P.LIST_LOCAL, Q.COUNTY_CUPS, Q.COUNTY_CUP_NAMES, Q.CLUB_COUNTY, Q.COMP_LEAGUES.map(([re, n]) => [String(re), n])]));
  const local = [...new Set(X.TEAM_LISTS.filter(l => l.tier === 2).flatMap(l => l.teams))];
  out.push(json(local.map(t => [t.id, Q.levelOf(t), Q.cupFor(t).name])));
  for (const cat of ['men', 'women']) out.push(json(P.ladder(cat, { nations:true, legends:true, clubs:true, mine:'all', fav:true, recent:0 }).map(g => [g.key, g.name, P.where(g), g.teams.map(t => t.id || t.act)])));
  const L = P.ladder('men', { nations:true, legends:true, clubs:true, mine:'all' });
  out.push(json(['a', 'sur', 'regional', 'counties', 'kent', 'e'].map(q => P.filterSearch(L, q).map(h => [h.t.id, h.r, h.path]))));
  out.push(json([0, 1, 2].map(t => H.comps(t))));
  reseed(77); D.exitMatch(); for (let n = 0; n < 2000; n++) T.update(T.STEP);
  out.push(json([T.M.demo, T.M.nat.map(t => t.id), T.M.score, T.M.ball.x.toFixed(5)]));
  return out.map(fnv).join(' ');
}
// Re-pinned at the 1.6.1 merge (56c38c1, folded into 1.7): with LOCAL off this build is 1.6.1, not 1.6. 1.6.1 renamed the areas (North, South,
// Mine to Northern Hemisphere, Southern Hemisphere, My Clubs), which moved the ladders' lines and the search's paths (the 5th to 7th) and
// nothing else. The chain: 56c38c1's own index.html gives BEFORE_LOCAL (GAME=<its index.html> LOCAL_CHILD=1 node tools/local.mjs), and with
// its PICK_HEMI put back to North, South, Mine it gives BEFORE_161, b9fa00d's (1.6) pin, exactly.
const BEFORE_161 = '13ekg89 1qw9wvi q29ftc fu9h2l 154r8uo i9vggm 15ccodg t0f9pk kzpnpt';   // b9fa00d (1.6), from its own index.html
const BEFORE_LOCAL = '13ekg89 1qw9wvi q29ftc fu9h2l 1ja44q7 lgqmbb 1g4d2wv t0f9pk kzpnpt';   // 56c38c1 (1.6.1, never released: in 1.7), from its own index.html
if (LOCAL_CHILD) { console.log(dataPrint()); process.exit(0); }
{ const off = await offRun(new URL(import.meta.url));
  ok(!off.fails.length && off.last === BEFORE_LOCAL, `with LOCAL off the build is 1.6.1 (56c38c1; 1.6, b9fa00d, but for the areas' names, ${BEFORE_161}): every list, side and line, the ladder, the search, the home's tiers, the county cups and the demo's draw (${off.last}, pinned ${BEFORE_LOCAL})`); }

const root = fileURLToPath(new URL('../', import.meta.url));
const research = JSON.parse(fs.readFileSync(path.join(root, 'docs/clubs-local.json'), 'utf8'));
const NEW = [...LO.LOCAL_NEW], SUR = X.TEAM_LISTS.find(l => l.key === 'sur').teams, list = k => X.TEAM_LISTS.find(l => l.key === k);
const counties = X.TEAM_LISTS.filter(l => l.county);

// 1. The research and its generator: every club once, its line and its kit as the research has them
{
  const gen = spawnSync(process.execPath, [path.join(root, 'tools/clubs-local.mjs'), '--check'], { encoding:'utf8' });
  ok(gen.status === 0 && /up to date/.test(gen.stdout), `tools/clubs-local.mjs --check: src/clubs-local.js is what docs/clubs-local.json gives (${(gen.stdout || gen.stderr).split('\n')[0]})`);
  ok(LO.LOCAL.on === true && research.version >= 3 && research.counties.length === 28 && counties.length === 28, `the research: version ${research.version}, 28 counties, each a Local list (${counties.length})`);
  const all = research.counties.flatMap(c => c.clubs), wrong = [];
  for (const c of research.counties) for (const r of c.clubs) {
    const t = X.ALL_TEAMS.find(o => o.id === r.id), l = list(c.code.toLowerCase());
    if (!t || !l || !l.teams.includes(t)) { wrong.push(r.id + ' missing'); continue; }
    if (r.existingId) continue;                                   // the game's own: its line, kit and name as data.js has them
    const kitWant = [r.kit, r.trim, !!r.hoops], line = ['league', 'place', 'w', 'd', 'l', 'pf', 'pa'].map(k => r[k] == null ? undefined : r[k]);
    if (t.name !== r.name || json([t.kit, t.trim, !!t.hoops]) !== json(kitWant) || json(['league', 'place', 'w', 'd', 'l', 'pf', 'pa'].map(k => t[k])) !== json(line)) wrong.push(r.id);
  }
  ok(all.length === 459 && !wrong.length, `every one of the research's 459 clubs is in the game once, in its county's list, its name, kit and line as researched (${wrong.join() || 'all'})`);
  ok(NEW.length === 452 && all.filter(r => r.existingId).map(r => r.id).join() === 'FAR,WIM,IRO,GUI,COB,WEY,ORU', 'the 452 new, and the game\'s own seven by their own codes (Farnham, Wimbledon, Ironsides, Guildford, Cobham, Weybridge, Old Ruts)');
  const ids = X.ALL_TEAMS.map(t => t.id), names = X.ALL_TEAMS.map(t => t.name.toLowerCase());
  ok(new Set(ids).size === ids.length && NEW.every(t => /^[A-Z]{3}$/.test(t.id)) && !NEW.some(t => t.id === 'HNS'), `every code three capitals and unique across every list and the nations (${ids.length})`);
  const same = NEW.filter(t => X.ALL_TEAMS.some(o => o !== t && I.same(o.name, t.name))).map(t => t.name);
  ok(new Set(names).size === names.length && NEW.every(t => t.name.length <= 16) && !same.length, `every name 16 at most and never the same to the game as another side's (importSame) (${same.join() || 'none'})`);
  ok(NEW.every(t => /^#[0-9a-f]{6}$/.test(t.kit) && /^#[0-9a-f]{6}$/.test(t.trim)), 'every kit and trim a hex colour');
  const src = fs.readFileSync(path.join(root, 'src/clubs-local.js'), 'utf8'), guess = all.filter(r => !r.existingId && r.kitConfidence === 'guess');
  ok(guess.every(r => new RegExp(`id:'${r.id}'[^\\n]*// colours a free choice`).test(src)) && (src.match(/colours a free choice/g) || []).length === guess.length, `the ${guess.length} guessed kits say so where they are written (// colours a free choice), and no other`);
  const free = all.filter(r => r.kitFree);
  ok(free.length === 30 && free.every(r => r.kitConfidence !== 'guess' && new RegExp(`id:'${r.id}'[^\\n]*// ${r.kitFree} a free choice`).test(src) && r.sources.some(l => l.startsWith(`Kit: ${r.kitFree} a free choice`))) && (src.match(/(hoops|trim) a free choice/g) || []).length === free.length, `the ${free.length} kits with a free hoops or trim say so where they are written and in their sources: 21 Pitchero kits told apart (Pitchero gives no pattern), 2 of them moved off an owner's kit, and 9 owner's kits with no second colour (${free.filter(r => r.kitFree === 'hoops').length} hoops, ${free.filter(r => r.kitFree === 'trim').length} trims)`);
  // and no Pitchero kit (colours from the club's own site, never a pattern) looks the same as another kit in its county, as the game shows it:
  // shirts and readable trims within 60 of each other (colorDist) and the same hoops, the research's own rule
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), cd = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
  const trimOf = t => (cd(t.kit, t.trim) >= 60 ? t.trim : null), alike = (a, b) => cd(a.kit, b.kit) < 60 && !!a.hoops === !!b.hoops && (trimOf(a) === null ? trimOf(b) === null : trimOf(b) !== null && cd(trimOf(a), trimOf(b)) < 60);
  const ptKit = new Set(all.filter(r => r.sources.some(l => /^Kit: Pattern: .*Pitchero gives no pattern/.test(l))).map(r => r.id)), clash = [];
  for (const l of counties) { const ts = [...new Set(l.teams)]; ts.forEach((a, i) => ts.slice(i + 1).forEach(b => { if ((ptKit.has(a.id) || ptKit.has(b.id)) && alike(a, b)) clash.push(a.name + '/' + b.name); })); }
  ok(ptKit.size === 103 && !clash.length, `none of the ${ptKit.size} Pitchero kits looks the same as another kit in its county (${clash.join(', ') || 'none'})`);
  // The owner's research (14 Nov 2026): 78 of the 84 guesses are sourced now (reported), the other 6 (Gateshead, Portsmouth, Syston, Ledbury, Spalding,
  // Old Crossleyans) still guesses. No guess and no free choice looks the same as another kit in its county; where two sourced kits do, both stay,
  // and the pairs that take in an owner's kit are the decided entry's, no more and no fewer.
  // Re-pinned 15 Nov 2026 (1.9.2, the owner's answers on the six): Spalding confirmed, Old Crossleyans, Ledbury and Portsmouth reported, each a plain
  // shirt (design 'plain', Portsmouth's third white); Gateshead and Syston still guesses. So 6 guesses become 2 (GAT, SYS) and the counts go from
  // 70, 376, 6 to 71, 379, 2: exactly the four kits moved (one to confirmed, three to reported). The 78 owner's kits are as they were.
  const ownerKit = all.filter(r => r.sources.some(l => l.startsWith("Kit: the owner's research (14 Nov 2026)")));
  ok(ownerKit.length === 78 && ownerKit.every(r => r.kitConfidence === 'reported' && r.design) && guess.map(r => r.id).sort().join() === 'GAT,SYS'
    && ['confirmed', 'reported', 'guess'].map(k => all.filter(r => !r.existingId && r.kitConfidence === k).length).join() === '71,379,2',
    `the owner's research: 78 kits reported, each with its design; 2 still guesses (${guess.map(r => r.id).join()}); confirmed, reported, guess ${['confirmed', 'reported', 'guess'].map(k => all.filter(r => !r.existingId && r.kitConfidence === k).length).join(', ')} of the 452 new`);
  const kit15 = { SPL:['#7c1431', '#1b2747', 'confirmed', null], OCR:['#1b2747', '#f2b01e', 'reported', null], LED:['#109a52', '#1c1c1c', 'reported', null], POT:['#f2b01e', '#1c1c1c', 'reported', '#f2efe6'] };
  const k15 = all.filter(r => kit15[r.id]), d15 = research.decided.find(x => x.topic === "Last season's lines and six kits") || {};
  ok(k15.length === 4 && k15.every(r => json([r.kit, r.trim, r.kitConfidence, r.third ?? null, r.design, r.hoops, r.kitFree ?? null]) === json([...kit15[r.id], 'plain', false, null]) && r.sources.some(l => l.includes('the owner, 15 Nov 2026')))
    && ['GAT', 'SYS'].every(id => all.find(r => r.id === id).sources.some(l => l.startsWith('Kit: still not found (the kit research and its second check, 15 Nov 2026)'))),
    `the owner's six (15 Nov 2026): Spalding maroon and navy (confirmed), Old Crossleyans navy and gold, Ledbury green and black, Portsmouth gold and black with a white third (reported), each a plain shirt, its sources saying so; Gateshead and Syston still guesses, the research's findings in their sources`);
  const movable = new Set([...ptKit, ...guess.map(r => r.id), ...free.map(r => r.id)]), clash2 = [], kept = [], kept15 = [];
  const OWNER = new Set(ownerKit.map(r => r.id));
  for (const l of counties) { const ts = [...new Set(l.teams)]; ts.forEach((a, i) => ts.slice(i + 1).forEach(b => { if (!alike(a, b)) return;
    if ((movable.has(a.id) && !OWNER.has(a.id)) || (movable.has(b.id) && !OWNER.has(b.id)) || (free.some(r => r.id === a.id && OWNER.has(a.id)) || free.some(r => r.id === b.id && OWNER.has(b.id)))) clash2.push(a.name + '/' + b.name);
    else if (kit15[a.id] || kit15[b.id]) kept15.push([a.id, b.id].sort().join('/'));   // the owner's six (15 Nov 2026): checked against their own decided entry, below
    else if (OWNER.has(a.id) || OWNER.has(b.id)) kept.push([a.id, b.id].sort().join('/')); })); }
  const keptWant = (research.decided.find(x => x.topic === "Kits from the owner's research") || {}).lookAlikesKept || [];
  ok(!clash2.length && kept.sort().join() === [...keptWant].sort().join(), `no guess or free choice looks the same as another kit in its county (${clash2.join(', ') || 'none'}); the ${kept.length} sourced pairs with an owner's kit that look alike stay, as decided (${kept.join(' ')})`);
  ok(kept15.sort().join() === [...(d15.lookAlikesKept || [])].sort().join() && kept15.join() === 'GUS/OCR,LEO/OCR,OCR/WEN', `the owner's six (15 Nov 2026): the sourced pairs that take one in and look alike are their decided entry's, no more and no fewer, and stay (${kept15.join(' ')}: Old Crossleyans' navy and gold beside Leodiensian's, and Guisborough's and Wensleydale's black and gold, in Yorkshire)`);
  // design and third carried into src/clubs-local.js as designs, as the research has them, and (1.8) onto each club by data.js, the one place
  const designs = LO.LOCAL_DATA.designs || {}, withDesign = all.filter(r => r.design != null);
  // Re-pinned 15 Nov 2026 (1.9.2): the owner's four sourced kits of that day (Spalding, Old Crossleyans, Ledbury, Portsmouth) carry design 'plain',
  // Portsmouth a white third: 78 designs become 82 and 33 thirds 34, exactly those four and that one
  ok(withDesign.length === 82 && Object.keys(designs).length === 82 && withDesign.every(r => json(designs[r.id]) === json(r.third ? { design:r.design, third:r.third } : { design:r.design }))
    && withDesign.every(r => r.hoops === (r.design === 'hoops')) && withDesign.filter(r => r.third).length === 34
    && withDesign.filter(r => !ownerKit.includes(r)).map(r => r.id).sort().join() === 'LED,OCR,POT,SPL' && withDesign.filter(r => r.third && !ownerKit.includes(r)).map(r => r.id).join() === 'POT',
    `design and third carried to src/clubs-local.js's designs (82: the owner's research's 78 and the four of 15 Nov 2026, ${withDesign.filter(r => r.third).length} with a third); hooped exactly where the design is hoops (${['halves', 'band'].map(k => withDesign.filter(r => r.design === k).map(r => r.id).join(' ')).join(', ')}: halves and chest band, drawn since 1.8)`);
  // 1.8 reads them (the owner, 14 Nov: Build): the designs map is read in one place, data.js, which puts each club's design and third on it
  // exactly as the research gives them; no other club, nation or game club carries either; and the game draws what they say (kitDesignOf,
  // kitThirdOf and kitEdgeOf, src/kit-design.js: Plain shows no design's third, so the 12 plain clubs' thirds are drawn as an edge at the
  // collar and cuffs instead: the owner, 15 Nov 2026, "Show It as a Collar Trim")
  {
    const srcOf = f => fs.readFileSync(path.join(root, 'src', f), 'utf8'), KD = T.kits;
    const readers = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js') && f !== 'clubs-local.js' && /\.designs\b/.test(srcOf(f)));
    const carried = NEW.filter(t => designs[t.id]), wrong = NEW.filter(t => designs[t.id] ? t.design !== designs[t.id].design || (t.third ?? null) !== (designs[t.id].third ?? null) : 'design' in t || 'third' in t);
    const others = X.ALL_TEAMS.filter(t => !LO.LOCAL_NEW.has(t) && ('design' in t || 'third' in t));
    const drawn = carried.filter(t => KD.designOf(t) !== designs[t.id].design || KD.thirdOf(t) !== (designs[t.id].design === 'plain' ? null : designs[t.id].third ?? null)
      || KD.edgeOf(t) !== (designs[t.id].design === 'plain' ? designs[t.id].third ?? null : null));
    // Re-pinned 15 Nov 2026 (1.9.2): 82 clubs carry a design (the four of that day added), and Portsmouth's white third on Plain is the 13th edge
    ok(readers.join() === 'data.js' && /LOCAL_DATA\.designs/.test(srcOf('data.js')) && carried.length === 82 && !wrong.length && !others.length && !drawn.length
      && carried.filter(t => KD.thirdOf(t)).length === 21 && carried.filter(t => t.design === 'plain' && t.third).length === 13 && X.ALL_TEAMS.filter(t => KD.edgeOf(t)).length === 13
      && KD.edgeOf(X.ALL_TEAMS.find(t => t.id === 'POT')) === '#f2efe6',
      `the game reads them (1.8): the designs map in data.js alone (${readers.join() || 'none'}), the 82 clubs carry exactly their design and third and nothing else does (${wrong.map(t => t.id).join() || 'none'}; ${others.map(t => t.id).join() || 'none'}), each drawn as it says (${drawn.map(t => t.id).join() || 'all'}): 21 thirds shown (19 hoops, 2 chest bands), the 13 on Plain (Portsmouth's white the 13th, 15 Nov 2026) shown as an edge at the collar and cuffs, and no other side with one`);
  }
  const placeOnly = all.filter(r => !r.existingId && r.w == null);
  // Re-pinned 15 Nov 2026 (1.9.2, the owner's "Research Last Season"): 8 of the 10 have their line now, the table's plus the league games it lacks
  // from the clubs' own fixture lists; Nottingham and Market Rasen keep their place only, both points figures for their missing game resting on search snippets alone
  ok(placeOnly.map(r => r.id).sort().join() === 'MRL,NUI' && placeOnly.every(r => { const t = X.ALL_TEAMS.find(o => o.id === r.id); return t.place === r.place && !('w' in t) && !('pf' in t) && r.sources.some(l => l.startsWith('No line: '));}), `a club with no line it can be given has its place only, nothing invented: the 2 of the three tables short of fixtures whose missing game rests on a search snippet (${placeOnly.map(r => r.id).join()})`);
  const line15 = { RYT:[20, 0, 2, 867, 386], BAU:[7, 0, 15, 488, 662], NOV:[21, 0, 1, 1121, 331], MEI:[13, 1, 8, 817, 663], DBE:[17, 0, 5, 692, 437], BEE:[7, 1, 14, 630, 752], HWA:[17, 0, 5, 725, 470], CRW:[10, 1, 11, 473, 524] };
  ok(Object.entries(line15).every(([id, v]) => { const t = X.ALL_TEAMS.find(o => o.id === id); return json(['w', 'd', 'l', 'pf', 'pa'].map(k => t[k])) === json(v) && t.w + t.d + t.l === 22; }),
    `the 8 lines of 15 Nov 2026 (the owner, "Research Last Season"), 22 games each: ${Object.keys(line15).join(', ')}`);
  const pt = all.filter(r => !r.existingId && r.sources.some(l => /^Line: .*on Pitchero/.test(l)));
  ok(pt.length === 200 && pt.every(r => { const t = X.ALL_TEAMS.find(o => o.id === r.id); return t.w + t.d + t.l > 0 && t.pf > 0; }), `a line from Pitchero's 2025-26 tables for the clubs with none on Wikipedia: 168 from complete tables and 32 from the three short of fixtures (24, and 8 more with the games the table lacks, 15 Nov 2026) (${pt.length})`);
  ok(NEW.filter(t => /^National League/.test(t.league)).length === 56 && ['JES', 'GRA'].every(id => list('ham').teams.some(t => t.id === id)) && list('chs').teams.some(t => t.id === 'DOU'), 'National League 1 and 2 added (55, and Guernsey Raiders the 56th); Jersey and Guernsey Raiders under Hampshire, Douglas under Cheshire (the owner, 14 Nov)');
  ok(X.TEAM_LISTS.filter(l => l.tier === 2).every(l => l.teams.length >= 6) && counties.every(l => P.clubGroups('ENG').find(g => g.list === l.key).teams.length >= 6), `six at least in every county, as it shows and as it plays (${counties.map(l => l.key + ' ' + l.teams.length).join(', ')})`);
  const mer = X.COUNTIES.find(t => t.id === 'MER');
  ok(mer.kit === '#1c1c1c' && mer.trim === '#f2b01e' && !mer.hoops && SUR.some(t => t.id === 'CAE' && t.hoops), 'Merton plain black with its gold trim (its hoops were never sourced; Camberley\'s are)');
  const label = k => list(k).name;
  ok(label('bkm') === 'Bucks' && label('gls') === 'Glos' && label('nbl') === 'Northumber­land' && label('nld') === 'Notts Lincs & Derbyshire' && ['eco', 'nld', 'nbl'].every(k => list(k).wraps) && counties.filter(l => l.wraps).length === 3, 'the labels: Bucks, Glos, Northumberland with a soft hyphen; Eastern Counties, Notts Lincs & Derbyshire and Northumberland may take two lines');
  ok(counties.every(l => { const b = l.name.replace(/­/g, ''); return l.wraps ? b.split(' ').every(w => w.length <= 16) : b.length <= 16; }), 'every label one line of 16 at most, or two of 16 each');
}

// 2. Ratings: the rule the game's own clubs follow, every new club in its band and its table's order; the ladder's ends hold. The owner,
//    14 Nov: "rerate the lower clubs - farnham shouldnt be as high as they are": National League 1 61, National League 2 61 or 58, and
//    Regional 1 and every level under it a step down (Farnham 61 to 58), the game's own clubs with them
{
  const ov = X.overallOf, BAND = { 3:[61, 61], 4:[58, 61], 5:[55, 58], 6:[49, 52], 7:[46, 49] }, lv = t => Q.ownLevel(t);
  const own = ['FAR', 'WIM', 'IRO', 'GUI', 'COB', 'WEY', 'ORU'].map(id => X.ALL_TEAMS.find(t => t.id === id));
  ok(own.every(t => LO.localRated(t) === R.CLUB_RATED[t.id] && ov(t) === R.CLUB_RATED[t.id]) && own.map(t => ov(t)).join() === '58,55,52,49,49,49,46', `localRated gives the game's own seven exactly, each a step under 1.6 (${own.map(t => t.id + ' ' + LO.localRated(t)).join(', ')}): Farnham 58`);
  // Re-pinned 16 Nov 2026 (1.9.3, the owner's "Spread by Table" for Counties 5 Surrey): Wandsworth and Guildfordians 42, Egham and Merton 41,
  // Mitcham and Feltham 40, by part sums (PART_SUM, src/ratings.js); their abilities are the only change (tools/ratings.mjs, section 2b)
  const step = { FAR:58, QUI:58, WIM:55, IRO:52, GUI:49, COB:49, WEY:49, ORU:46, KIN:43, HAS:43, ALD:43, GDN:42, EFF:43, WAN:42, EGH:41, MER:41, MIT:40, FEL:40 }, moved = Object.entries(step).filter(([id, v]) => ov(X.ALL_TEAMS.find(t => t.id === id)) !== v || R.CLUB_RATED[id] !== v).map(([id]) => id);
  ok(!moved.length && R.CLUB_RATED.QUI === R.CLUB_RATED.FAR, `every one of the game's Local and Counties sides a step down: Regional 1 58 and 55, Regional 2 52 and 49, Counties 1 49 and 46, Counties 3 43, Counties 5 42 to 40 by its table, Quins level with Farnham (${moved.join() || 'all 18'})`);
  const off = NEW.filter(t => ov(t) !== LO.LOCAL_RATED[t.id] || ov(t) < BAND[lv(t)][0] || ov(t) > BAND[lv(t)][1]).map(t => t.id);
  ok(!off.length, `every new club at its rating, in its band: National League 1 61, National League 2 58 to 61, Regional 1 55 to 58, Regional 2 49 to 52, Counties 1 46 to 49 (${off.join() || NEW.length + ' clubs'})`);
  const nl = lg => NEW.filter(t => new RegExp('^National League ' + lg + '\\b').test(t.league)).map(ov);
  ok(nl(1).length === 14 && nl(1).every(v => v === 61) && nl(2).length === 42 && nl(2).some(v => v === 61) && nl(2).some(v => v === 58) && Math.max(...NEW.filter(t => lv(t) === 5).map(ov)) === 58, `National League 1 all 61, National League 2 61 or 58 by place, above Regional 1's top, 58 (${[...new Set(nl(2))].join(' or ')})`);
  const top = t => t.place <= Math.round(7*LO.LOCAL_DATA.sizes[t.league]/12);
  ok(NEW.every(t => ov(t) === (top(t) ? BAND[lv(t)][1] : BAND[lv(t)][0])), 'the top of its band in the top seven twelfths of its table, else the foot');
  const wrong = [];
  for (const a of X.ALL_TEAMS) for (const b of X.ALL_TEAMS) if ((NEW.includes(a) || NEW.includes(b)) && a.league && a.league === b.league && a.place < b.place && ov(a) < ov(b)) wrong.push(a.id + '<' + b.id);
  ok(!wrong.length, `no club rated under one it finished above in its league (${wrong.join() || 'none'})`);
  const sums = [...Array(21).keys()].map(i => ov(R.abilitiesFor({}, 5 + i)));   // every overall a side of whole abilities can have, sums 5 to 25
  const between = [...new Set(sums)].filter(v => v > 61 && v < 64);
  ok(!between.length && R.sumOfOverall(62) === R.sumOfOverall(61) && R.sumOfOverall(63) === R.sumOfOverall(64), `the overall scale has no step between Regional 1's top (61) and England 2's (64): National League is 61 (${[...new Set(sums)].join(' ')})`);
  const nat = Math.min(...X.NATIONS.map(ov)), club = Math.max(...X.ALL_TEAMS.filter(t => !X.isNation(t)).map(ov)), e2 = Math.min(...X.ENGLAND_TWO.map(ov));
  const local = [...new Set(X.TEAM_LISTS.filter(l => l.tier === 2).flatMap(l => l.teams))];
  ok(nat > club && Math.max(...local.map(ov)) <= e2 && Math.max(...local.map(ov)) === 61 && Math.min(...local.map(ov)) === 40, `every nation above every club (${nat} v ${club}); no Local side above an England 2 side (${Math.max(...local.map(ov))} v ${e2}); Local 40 to 61`);
  ok(sums[0] === 40 && R.sumOfOverall(40) === 5 && ov(R.abilitiesFor({ pace:4, power:2 }, R.sumOfOverall(40))) === 40 && Math.min(...sums) === 40, `the scale goes low enough: Counties 5's 40 is its floor, a sum of 5 (every ability 1), whatever the side's flavour (${sums.slice(0, 4).join(' ')})`);
  ok(R.TEAM_LEVELS.map(l => l.overall).join() === '40,43,49,52,58,64,72,75' && R.TEAM_LEVELS[0].budget === 0 && R.TEAM_LEVELS[0].stars === 1, 'the levels a made team can take a step down from Regional 1, each still the best built-in side of its league (Regional 1 58, Farnham) but Counties 5, which stays 40, no points to spend, 1 star, under its 42s (1.9.3)');
}

// 3. County cups: every club's county and cup, sourced tables or the plain one, a level under them, rivals from its own county first
{
  const local = Q.local(), plain = /Beaumont|Bill|Senior Vase|Twickenham/i, by = id => X.ALL_TEAMS.find(t => t.id === id);
  ok(Q.local() === local && local.length === new Set(X.TEAM_LISTS.filter(l => l.tier === 2).flatMap(l => l.teams)).size, `the grassroots sides gathered once (${local.length})`);
  const code = t => { const c = research.counties.find(c => c.clubs.some(r => r.id === t.id)); return c && c.code; };
  ok(local.every(t => Q.CLUB_COUNTY[t.id]) && NEW.every(t => Q.CLUB_COUNTY[t.id] === code(t)) && Q.CLUB_COUNTY.FAR === 'SUR' && Q.CLUB_COUNTY.ALD === 'HAM', 'every Local club has its county: each new club its research county\'s, the game\'s own as they were');
  const cups = local.map(t => Q.cupFor(t));
  ok(cups.every(c => c && Q.COUNTY_CUP_NAMES.includes(c.name) && !plain.test(c.name)), 'every club has a county cup (never undefined), a plain name the save knows');
  ok(Q.COUNTY_CUPS.SUR.map(c => c.name + ' ' + c.to).join() === 'Surrey Cup 5,Surrey Trophy 8,Surrey Shield 10,Surrey Bowl 12' && Q.COUNTY_CUPS.HAM.map(c => c.to).join() === '7,9,12', 'Surrey\'s and Hampshire\'s tables as they were');
  for (const c of LO.LOCAL_DATA.counties) if (c.code !== 'SUR' && c.code !== 'HAM') ok(c.cups ? Q.COUNTY_CUPS[c.code] === c.cups : !Q.COUNTY_CUPS[c.code], `${c.county}: ${c.cups ? c.cups.map(x => x.name + ' to ' + x.to).join(', ') : 'no sourced levels, the plain County Cup table'}`);
  ok(Q.cupFor(by('TWE')).name === 'Kent Cup' && Q.cupFor(by('BLA')).name === 'Kent Cup' && Q.cupFor(by('TWE')).to === 6, 'Tunbridge Wells (level 5) and Blackheath (level 3): the Kent Cup');
  const dhm = list('dhm').teams.find(t => Q.ownLevel(t) === 7), bkm = list('bkm').teams[0];
  ok(Q.cupFor(dhm).name === 'County Trophy' && /^County /.test(Q.cupFor(bkm).name), `a level under its county's sourced cups (Durham's only reach 5): the plain table's cup for it (${dhm.name}, ${Q.cupFor(dhm).name}); a county with none, the plain table (${bkm.name}, ${Q.cupFor(bkm).name})`);
  reseed(5);
  const twe = Q.rivals(by('TWE'));
  ok(twe.length === 7 && twe.every(t => Q.CLUB_COUNTY[t.id] === 'KEN') && !twe.some(t => t.id === 'TWE'), `Tunbridge Wells' county cup draws Kent's own (${twe.map(t => t.id)})`);
  const brk = list('brk').teams[0], br = Q.rivals(brk);
  ok(br.length === 7 && br.filter(t => Q.CLUB_COUNTY[t.id] === 'BRK').length === 6 && br.slice(6).every(t => Q.CLUB_COUNTY[t.id] !== 'BRK'), `a county with six others (Berkshire): all six, then one from elsewhere nearest its level (${br.map(t => t.id + ' ' + Q.CLUB_COUNTY[t.id])})`);
  const made = { id:'ZZZ', name:'My Town', custom:true, kit:'#123456', trim:'#ffffff', pace:3, power:3, handling:3, kicking:3, stamina:3 };
  const mr = Q.rivals(made);
  ok(mr.length === 7 && new Set(mr.map(t => Q.CLUB_COUNTY[t.id])).size > 1, `a made side has no county and draws from every county (${[...new Set(mr.map(t => Q.CLUB_COUNTY[t.id]))]})`);
  const at = ov => ({ ...made, ...R.abilitiesFor({}, R.sumOfOverall(ov)) }), lvAt = ov => Q.levelOf(at(ov));
  ok([58, 61, 64, 72, 75].every(ov => lvAt(ov) === 5) && lvAt(52) === 6 && lvAt(43) === 9 && lvAt(40) === 11, `a made side is matched from Regional 1 down, as 1.6 matched it a step up: at 58 and above a Regional 1 side, never National League's, though its clubs are 58 and 61 (${[40, 43, 49, 52, 58, 61, 64, 72, 75].map(ov => ov + ' L' + lvAt(ov)).join(', ')})`);
  ok([58, 61, 72].every(ov => { reseed(ov); const r = Q.rivals(at(ov)); return r.length === 7 && r.every(t => Q.ownLevel(t) === 5); }) && Q.cupFor(at(72)).name === 'County Cup', 'so its county cup draws Regional 1 clubs, and it plays the County Cup');
  reseed(6);
  const cup = K.cupNew('county', { user:by('TWE'), cat:'men', year:1 });
  ok(cup && cup.name === 'Kent Cup' && cup.teams.length === 8 && cup.teams.slice(1).every(t => Q.CLUB_COUNTY[t.id] === 'KEN'), 'the Kent Cup, as a career\'s county phase plays it: eight Kent sides');
  const cr = C.create({ pos:'B', num:5, club:by('TWE'), league:'ken' });
  ok(cr.league === 'ken' && C.league(cr) === 'ken' && cr.season.teams.slice(1).every(t => list('ken').teams.some(o => o.id === t.id)), 'a career at Tunbridge Wells: a year in Kent\'s league');
}

// 4. The ladder, the card's head and the Filter (the owner's layout, 14 Nov: Build)
{
  s.myClub = 'FAR'; s.pick = [null, null]; s.fav = []; s.recent = [[], []]; X.setChamp(null);   // Farnham as My Team's club, a fixture (1.10: a new game has no club; the Filter's top with none is tools/links.mjs')
  const eng = P.clubGroups('ENG'), keys = eng.map(g => g.key);
  ok(keys.join() === ['eng', 'en2', 'sur', ...counties.filter(l => l.key !== 'sur').map(l => l.key)].join() && counties.slice(1).every((l, i, a) => i === 0 || a[i - 1].county.localeCompare(l.county, 'en') < 0), `England: the Premiership, the Championship, Surrey, then every other county A to Z (${keys.slice(0, 6).join()}...)`);
  const sur = eng.find(g => g.key === 'sur'), ham = eng.find(g => g.key === 'ham');
  ok(sur.teams.length === 34 && !sur.teams.some(t => t.id === 'ALD') && ham.teams.some(t => t.id === 'ALD') && SUR.some(t => t.id === 'ALD') && list('ham').teams.some(t => t.id === 'ALD'), 'Aldershot is on Surrey\'s list and Hampshire\'s, and shown under Hampshire only; Surrey shows its 34');
  ok(X.COUNTIES.every(t => sur.teams.includes(t)) && !eng.some(g => g.key === 'cty') && X.poolKey('cty') === 'sur', 'Counties\' sides are Surrey\'s; its list is off the ladder and a saved Counties is Surrey');
  ok(eng.filter(g => g.local).every(g => P.where({ ...g, hemi:'north' }) === 'Northern Hemisphere · England' && g.county), 'the line above the group\'s button: Northern Hemisphere · England (Northern Hemi where two sides share the screen), no Local');
  const lvl = LO.pickLevel;
  ok(eng.filter(g => g.local).every(g => g.teams.every((t, i) => i === 0 || lvl(t) > lvl(g.teams[i - 1]) || (lvl(t) === lvl(g.teams[i - 1]) && (t.place || 0) >= (g.teams[i - 1].place || 0)))), 'each county in its pyramid\'s order: level, then place (Quins, with no line, after Regional 1)');
  D.openTeams('quick');
  ok(P.view(0).group.key === 'sur' && /<button class="btn pk-group two" data-act="sheet" aria-haspopup="dialog"><span class="pk-gn">Surrey<\/span><svg class="pk-ico d" [^>]*aria-hidden="true"[^>]*><path [^>]*\/><\/svg><\/button>/.test(P.panel(0)) && /<span class="pk-area">Northern Hemi<span class="hx">sphere<\/span><\/span> <span>England<\/span><\/span>/.test(P.panel(0)), 'the card: Surrey on its group\'s button (two lines allowed; its name, then the down chevron, 1.8.1), Northern Hemisphere · England above it (the area\'s end apart, for Northern Hemi)');
  P.filter(0, '', { dev:'touch' });
  const F = P.filterState();
  ok(F.cols.map(c => c.head).slice(0, 3).join() === 'Area,Country,League' && F.cols[2].rows.map(n => n.name).join() === ['National', 'Premiership', 'Championship', 'Surrey', ...counties.slice(1).map(l => l.name)].join(), 'the Filter\'s England: National, Premiership, Championship, Surrey, then every other county A to Z');
  const nld = F.cols[2].rows.findIndex(n => n.name === 'Notts Lincs & Derbyshire'); P.filterSel(2, nld);
  ok(F.cols[3].head === 'Notts Lincs & Derbyshire' && F.cols[3].wraps && /<p class="fl-h two" id="fl-h3">Notts Lincs &amp; Derbyshire<\/p>/.test($('fl-cols').innerHTML), 'a long county\'s Teams column head may take two lines');
  P.filterClose();
  // the search: a club with its path, a county by its full name, a club's own league, at most FL_CAP drawn
  const L = P.view(0).ladder, hit = q => P.filterSearch(L, q);
  const tun = hit('Tunb');
  ok(tun.length === 1 && tun[0].t.id === 'TWE' && tun[0].path === 'Northern Hemisphere · England · Kent', `Tunbridge Wells, with its path (${tun.map(h => h.path)})`);
  const bucks = hit('Buckinghamshire');
  ok(bucks.length === list('bkm').teams.length && bucks.every(h => h.path === 'Northern Hemisphere · England · Bucks'), `a county by its full name: Buckinghamshire finds Bucks' clubs (${bucks.length})`);
  const thames = hit('Regional 2 Thames'), want = X.ALL_TEAMS.filter(t => t.league === 'Regional 2 Thames');
  ok(thames.length === want.length && want.every(t => thames.some(h => h.t === t)), `a club's own league: Regional 2 Thames finds its ${want.length} clubs, across their counties`);
  ok(hit('Farnham')[0].t.id === 'FAR' && hit('Farnham')[0].r === 0, 'a club\'s name still comes first');
  const fulls = research.counties.flatMap(c => c.clubs).filter(r => !r.existingId && r.fullName && r.fullName !== r.name), withFull = NEW.filter(t => t.full);
  ok(withFull.length === fulls.length && fulls.every(r => X.ALL_TEAMS.find(t => t.id === r.id).full === r.fullName) && !X.ALL_TEAMS.some(t => t.full && !NEW.includes(t)), `a club's full name is with it where its card's differs, as researched (${withFull.length})`);
  const missed = withFull.filter(t => !hit(t.full).some(h => h.t === t && h.r === 0)).map(t => t.full);
  ok(!missed.length, `every one found by its full name, at the first step (${missed.join(', ') || withFull.length + ' clubs'})`);
  const byFull = { 'Weston-super-Mare':'WSM', 'Saracens Amateurs':'SAA', 'Liverpool St Helens':'LSH', 'Betteshanger':'DBE', 'Worcester Wanderers':'WWA', 'Devonport Services':'DSE', 'Nottingham University':'NUI', 'Chosen Hill Former':'CHF', 'Nuneaton Old Edwardians':'NOE', 'Old Rishworthians':'ORS', 'Old Wimbledonians':'OWI' };
  const lost = Object.entries(byFull).filter(([q, id]) => !hit(q).length || hit(q)[0].t.id !== id).map(([q]) => q);
  ok(!lost.length && hit('St Helens').some(h => h.t.id === 'LSH'), `a club cut on its card found by its own name: Weston-super-Mare, Saracens Amateurs, Betteshanger and the rest (${lost.join(', ') || 'all'})`);
  ok(LO.FL_CAP === 200 && hit('a').length > 200, `a letter matches more than ${LO.FL_CAP} (${hit('a').length})`);
  P.filter(0, 'a', { dev:'touch' });
  ok(P.filterState().hits.length === 200 && new RegExp(`<p class="fl-none fl-more">200 of ${hit('a').length} Teams</p>`).test($('fl-res').innerHTML) && ($('fl-res').innerHTML.match(/ data-r="/g) || []).length === 200, `so 200 are drawn, and the count of all said under them (200 of ${hit('a').length} Teams)`);
  ok($('fl-said').textContent === `200 of ${hit('a').length} Teams`, `and a screen reader hears the same count (${$('fl-said').textContent})`);
  P.filter(0, 'Tunb', { dev:'touch' }); ok($('fl-said').textContent === '1 Team', 'a search under the cap says its count alone (1 Team)');
  P.filterClose();
  // Quick Match's Opponent, untouched: Your Team's league rival first; in a county with none, the side nearest its level, then its overall
  const opp = id => { s.myClub = id; s.pick = [null, null]; D.goHome(); D.openTeams('quick'); return [P.view(0).team, P.view(1).team, P.view(1).group.key]; };
  const [far, farOpp] = opp('FAR'), [ald, aldOpp, aldG] = opp('ALD');
  ok(farOpp.league === far.league && farOpp !== far, `Farnham: a league rival first (${farOpp.name}, ${farOpp.league})`);
  ok(aldG === 'ham' && aldOpp.league === 'Counties 1 Hampshire' && X.overallOf(aldOpp) === 46, `Aldershot (Counties 3, none in Hampshire): Counties 1's foot, the nearest (${aldOpp.name} ${X.overallOf(aldOpp)}), not Hampshire's strongest`);
  const wide = [];
  for (const t of [...new Set(counties.flatMap(l => P.clubGroups('ENG').find(g => g.list === l.key).teams))]) { const [me, op] = opp(t.id); if (Math.abs(X.overallOf(me) - X.overallOf(op)) >= 9) wide.push(`${me.name} ${X.overallOf(me)} v ${op.name} ${X.overallOf(op)}`); }
  ok(!wide.length, `no county club's Opponent opens 9 or more from it (${wide.slice(0, 4).join('; ') || 'none'})`);
  s.myClub = 'FAR'; s.pick = [null, null]; D.goHome();
}

// 5. The home's Local tier: your county | Other County | My League; Other County on the Filter's County | Teams
{
  const mine = (club, league) => { s.myClub = club; I.setLeague(league || null); return H.comps(2); };
  ok(json(mine('FAR')) === json([['sur', 'Surrey'], ['county', 'Other County']]), 'Farnham\'s: Surrey | Other County');
  ok(json(mine('FAR', { teams:[] })) === json([['sur', 'Surrey'], ['county', 'Other County'], ['my', 'My League']]), 'with a league imported: Surrey | Other County | My League');
  // 1.10: no club, no county of yours: Pick Your County in their place (the owner: no Farnham, nor its Surrey, unless a link says so)
  ok(!s.myClubLegacy && json(mine(null)) === json([['county', 'Pick Your County']]) && LO.myCounty() === null, 'no club: Pick Your County alone, no Surrey');
  ok(json(mine(null, { teams:[] })) === json([['county', 'Pick Your County'], ['my', 'My League']]), 'no club, a league imported: Pick Your County | My League');
  ok(mine('TWE')[0].join() === 'ken,Kent' && mine('ALD')[0].join() === 'ham,Hampshire' && mine('SCU')[0].join() === 'nld,Notts Lincs & Derbyshire', 'My Team\'s club\'s county (Tunbridge Wells: Kent; Aldershot: Hampshire)');
  ok(mine('BTH')[0][0] === 'sur' && mine('GLA')[0][0] === 'sur', 'a professional side has no county: Surrey');
  X.restore({ custom:[{ key:'my0', name:'My Town', id:'MYT', kit:'#123456', trim:'#abcdef', pace:3, power:3, handling:3, kicking:3, stamina:3 }] });
  ok(mine('my0')[0][0] === 'sur', 'a team you made: Surrey');
  mine('FAR'); X.setChamp(null); K.set(null);
  H.champPick('county');
  const F = P.filterState();
  ok(!$('s-teams').hidden && LO.champCounty() && F.open && F.cols.length === 2 && F.cols[0].head === 'County' && F.cols[0].rows.length === 28 && F.cols[0].rows[F.cols[0].sel].name === 'Surrey' && F.cols[1].head === 'Surrey', 'Other County: the team screen, the Filter open on County | Teams, your county marked');
  const ken = F.cols[0].rows.findIndex(n => n.name === 'Kent'); P.filterSel(0, ken);
  const first = F.cols[1].rows[0]; P.filterTap(1, 0);
  const c = X.champ();
  ok(c && c.teams.length === 6 && c.teams[c.user].id === first.id && c.teams.every(t => list('ken').teams.some(o => o.id === t.id)), `a Kent club picked (${first.name}): Kent's championship, its five others Kent's (${c && c.teams.map(t => t.id)})`);
  X.setChamp(null); D.goHome();
  H.champPick('sur');
  const shown = P.clubGroups('ENG').find(g => g.key === 'sur').teams;
  ok(!LO.champCounty() && P.view(0).ladder[0].key === 'comp' && P.view(0).ladder[0].list === 'sur' && P.view(0).ladder[0].teams.length === shown.length && shown.every(t => P.view(0).ladder[0].teams.includes(t)), `your county: its own championship, every club the ladder shows under it (${shown.length})`);
  ok(!P.view(0).ladder[0].teams.some(t => t.id === 'ALD') && X.poolTeams('sur').length === SUR.length - 1 && !X.poolTeams('sur').some(t => t.id === 'ALD') && X.poolTeams('ham').some(t => t.id === 'ALD'), 'Aldershot, on Surrey\'s list for the saves, plays in Hampshire\'s championship only: never on Surrey\'s team screen nor in its draw');
  D.goHome();
  const by = id => X.ALL_TEAMS.find(t => t.id === id), drawn = new Set();
  for (let n = 0; n < 40; n++) { reseed(100 + n); X.setChamp(null); H.champPick('sur'); D.pickTeam(by('FAR')); const c = X.champ(); if (c) c.teams.forEach(t => drawn.add(t.id)); D.goHome(); const cr = C.create({ pos:'B', num:5, club:by('FAR'), league:'sur' }); cr.season.teams.forEach(t => drawn.add(t.id)); }
  ok(!drawn.has('ALD') && drawn.size > 20, `forty Surrey championships and Farnham career years: never Aldershot (${drawn.size} clubs drawn)`);
  const ald = C.create({ pos:'B', num:5, club:by('ALD'), league:'sur' });
  ok(ald.league === 'ham' && C.clean(JSON.parse(json(ald))).league === 'ham' && C.clean({ ...JSON.parse(json(ald)), league:'sur' }).league === 'ham' && ald.season.teams.slice(1).every(t => Q.CLUB_COUNTY[t.id] === 'HAM'), 'an Aldershot career, a 1.6 one saved on Surrey too: Hampshire\'s league');
  X.setChamp(null); D.goHome();
}

// 5b. 1.6.1's changes, folded into 1.7, with a county club as My Team: a Mini (Tunbridge Wells, Kent) sees Kent on the Competitions' Local
//     tier; leaving Minis is Leave Minis? (no grown-up check), Keep Minis changes nothing, Change the age group and the level only, the
//     club, its county and its tier as they were (tools/profile.mjs checks the Skill Games by age group)
{
  const F = T.profile, saveWas = memory['tryline.v1'];
  X.restore({ settings:{ myClub:'TWE', myNat:'ENG' } }); F.age('mini');
  ok(F.get().age === 'mini' && s.kids && s.cat === 'minis' && H.myClub().id === 'TWE' && H.comps(2)[0].join() === 'ken,Kent', `a Mini with Tunbridge Wells as My Team: the Kids level, Minis, and Kent on the Local tier (${json(H.comps(2))})`);
  F.age('junior');
  ok(!!T.kids.minis.open() && !T.kids.gate() && F.get().age === 'mini' && H.myClub().id === 'TWE', 'Junior from Mini: Leave Minis? first, never the grown-up check, nothing changed yet');
  T.kids.minis.close(false);
  ok(!T.kids.minis.open() && F.get().age === 'mini' && s.kids && H.myClub().id === 'TWE' && H.comps(2)[0].join() === 'ken,Kent', 'Keep Minis: still a Mini, Tunbridge Wells, Kent');
  F.age('junior'); T.kids.minis.close(true);
  ok(!T.kids.minis.open() && F.get().age === 'junior' && !s.kids && H.myClub().id === 'TWE' && s.myNat === 'ENG' && H.comps(2)[0].join() === 'ken,Kent', `Change: a Junior, the Kids level off, still Tunbridge Wells and Kent's tier (${json(H.comps(2))})`);
  D.openTeams('quick');
  ok(P.view(0).group.key === 'ken' && P.view(0).team.id === 'TWE' && P.where(P.view(0).group) === 'Northern Hemisphere · England', `Quick Match: My Team's club in Kent, the line Northern Hemisphere · England (${P.where(P.view(0).group)})`);
  D.goHome(); F.age('adult'); X.restore({ settings:{} }); memory['tryline.v1'] = saveWas;
}

// 6. Saves with the new keys, and a My League side on a code a county club has taken
{
  X.restore({ settings:{ pool:'ken', pick:[{ id:'TWE', g:'ken', cat:'men' }, null], fav:['TWE', 'BLA'], recent:[['SCU'], []], myClub:'TWE' } });
  ok(s.pool === 'ken' && s.pick[0].g === 'ken' && s.pick[0].id === 'TWE' && s.fav.join() === 'TWE,BLA' && s.recent[0].join() === 'SCU' && H.myClub().id === 'TWE', 'a saved county list, a pick in its group, favourites, recents and My Team at a county club load as saved');
  s.pick = [null, null]; D.openTeams('quick');
  ok(P.view(0).group.key === 'ken' && P.view(0).team.id === 'TWE', 'Quick Match opens on My Team\'s club, in its county');
  ok(json(D.settings().fav) === json(['TWE', 'BLA']) && P.find('BLA', 'men').id === 'BLA', 'a favourite found again by its code');
  const cr = C.create({ pos:'B', num:5, club:X.ALL_TEAMS.find(t => t.id === 'SCU'), league:'nld' });
  ok(C.clean(JSON.parse(json(cr))).league === 'nld' && C.clean({ ...JSON.parse(json(cr)), league:'cty' }).league === 'nld', 'a career\'s county league kept through a save; a wrong one is the club\'s own county');
  X.restore({ settings:{ pool:'cty' } }); ok(s.pool === 'sur', 'a saved Counties is Surrey');
  // My League: a side saved on a code a county club has since taken (Tunbridge Wells is TWE): recoded, and My Team goes with it
  const side = { key:'lg-TWE', id:'TWE', name:'Tunbridge Town', kit:'#1b2747', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:3, stamina:3 };
  X.restore({ settings:{ myClub:'lg-TWE' }, importLeague:{ teams:[side, { ...side, key:'lg-XAN', id:'XAN', name:'Xanadu' }] } });
  const got = I.league().teams[0];
  ok(got.id !== 'TWE' && got.key === 'lg-' + got.id && s.myClub === got.key && H.myClub() === got && !X.ALL_TEAMS.some(t => t.id === got.id), `a saved league side coded TWE is recoded (${got.id}), and is still My Team`);
  ok(!X.ALL_TEAMS.some(t => t.id === 'SEV' || t.id === 'TUN') && X.ALL_TEAMS.some(t => t.id === 'SEO' && t.name === 'Sevenoaks'), 'the importer\'s own Sevenoaks and Tunbridge Wells codes (SEV, TUN) are no county club\'s: Sevenoaks is SEO');
  // ...and everything else the save holds for a recoded side follows it: a 1.6 league with Rams (RAM) and Clifton (CLI), codes that are
  // Rams' and Clifton's now, its favourites, recents, picks, the games played as it and a county cup under way as it
  const lg = (id, name) => ({ ...side, key:'lg-' + id, id, name });
  reseed(9); X.setChamp(null);
  const cupSave = JSON.parse(json(K.cupNew('county', { user:lg('RAM', 'Rams Old Boys'), cat:'men', year:1 })));
  X.restore({ settings:{ myClub:'lg-RAM', fav:['lg-RAM', 'lg-CLI', 'FAR'], recent:[['lg-CLI'], ['lg-RAM', 'TWE']], pick:[{ id:'lg-RAM', g:'mine.league', cat:'men' }, { id:'FAR', g:'sur', cat:'men' }] },
    importLeague:{ teams:[lg('RAM', 'Rams Old Boys'), lg('CLI', 'Clifton Town'), lg('XQZ', 'Xqz Park')] }, cup:cupSave,
    form:[{ k:'c:lg-RAM', w:5, d:0, l:2, last:'WWLWW' }, { k:'c:FAR', w:1, d:0, l:0, last:'W' }] });
  const [ram, cli, xqz] = I.league().teams;
  ok(ram.id !== 'RAM' && cli.id !== 'CLI' && xqz.key === 'lg-XQZ' && s.myClub === ram.key && H.myClub() === ram, `a 1.6 league's Rams and Clifton recoded (${ram.id}, ${cli.id}), Rams still My Team`);
  ok(json(s.fav) === json([ram.key, cli.key, 'FAR']) && json(s.recent) === json([[cli.key], [ram.key, 'TWE']]) && s.pick[0].id === ram.key && s.pick[0].g === 'mine.league' && s.pick[1].id === 'FAR', `its favourites, recents and picks follow it (${s.fav.join()}; ${json(s.recent)}; ${s.pick.map(p => p && p.id).join()})`);
  const fav = P.ladder('men', { nations:true, clubs:true, mine:'all', fav:true, recent:0 }).find(g => g.hemi === 'fav');
  ok(fav && fav.teams.includes(ram) && fav.teams.includes(cli), 'so the Favourites group still has both');
  ok(H.form.of(ram).w === 5 && H.form.of(ram).last === 'WWLWW' && H.form.get().length === 2 && H.form.of(X.ALL_TEAMS.find(t => t.id === 'FAR')).w === 1 && !H.form.get().some(r => r.k === 'c:lg-RAM'), `the games played as it follow it (${json(H.form.of(ram))})`);
  const cu = K.get();
  ok(cu && cu.teams[cu.user].key === ram.key && cu.teams[cu.user].id === ram.id, `a county cup under way as it, its side with it (${cu && cu.teams[cu.user].key})`);
  X.restore({ settings:{ myClub:'lg-RAM' }, importLeague:{ teams:[lg('RAM', 'Rams Old Boys')] }, form:[{ k:'c:lg-RAM', w:2, d:0, l:0, last:'WW' }, { k:'c:lg-' + ram.id, w:9, d:0, l:9, last:'' }] });
  ok(json(H.form.get().map(r => [r.k, r.w])) === json([['c:' + ram.key, 2]]), 'a record the save had under the new code already (a side since gone) gives way to the side that has the code now');
  K.set(null); H.form.set([]);
  X.restore({ importLeague:null, settings:{ myClub:null, fav:[], recent:[[], []], pick:[null, null] } });
}

// 7. A place-only club: no record line, its league and place everywhere a line is shown (Teddington was one until the Pitchero pass)
//    Re-pinned 15 Nov 2026 (1.9.2): Novocastrians, the place-only club here until then, has its line now, so the place-only club is Nottingham
//    (the same league, place and checks), and Novocastrians joins Teddington as a club given its line
{
  const t = X.ALL_TEAMS.find(o => o.id === 'NUI');
  ok(!('w' in t) && H.recordLine(t) === '' && H.leagueLine(t) === 'Counties 1 Midlands East (North) · 1st Last Season', `Nottingham Uni: its league and place (${H.leagueLine(t)}), no record line`);
  s.myClub = 'NUI'; D.goHome(); H.render();
  ok(!/undefined|NaN/.test($('my-league').innerHTML + $('my-rec').innerHTML) && /Counties 1 Midlands East/.test($('my-league').innerHTML), 'My Team\'s box at a place-only club: its line, nothing undefined');
  const nov = X.ALL_TEAMS.find(o => o.id === 'NOV');
  ok(H.recordLine(nov) === 'Won 21 · Lost 1 · 1121 Scored · 331 Conceded' && H.leagueLine(nov) === 'Counties 1 Durham & Northumberland · 1st Last Season', `Novocastrians, place only until 15 Nov 2026, has its line (${H.recordLine(nov)})`);
  const ted = X.ALL_TEAMS.find(o => o.id === 'TED');
  ok(H.recordLine(ted) === 'Won 10 · Lost 12 · 694 Scored · 702 Conceded', `Teddington, place only in 1.7's first build, has its Pitchero line (${H.recordLine(ted)})`);
  s.myClub = null;
  const lg = X.ALL_TEAMS.find(o => o.id === 'FAR');
  ok(H.recordLine(lg) === 'Won 10 · Lost 12 · 640 Scored · 646 Conceded', 'a club with a table keeps its record line');
}

await browserChecks();
console.log(`Local clubs: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;

function chromium() {
  const require = createRequire(import.meta.url);
  for (const from of [() => require('playwright'), () => require(path.join(execFileSync('npm', ['root', '-g'], { stdio:['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright'))]) {
    try { return from().chromium; } catch (e) { /* not here */ }
  }
  return null;
}
// 8. In Chromium, at 844x390, 667x375, 844x340, 667x320 and 568x320: every new club's card once, each county's group button, the Filter's
//    England and its long counties, the search's count, the Competitions tier and Other County. Nothing cut, nothing under 44px, no scroll.
async function browserChecks() {
  if (process.env.GAME || process.env.NO_BROWSER) { console.log('skip the browser checks (GAME or NO_BROWSER set)'); return; }
  const chrome = chromium();
  if (!chrome) { console.log('skip the browser checks: Playwright is not installed'); return; }
  let browser;
  try { browser = await chrome.launch(); } catch (e) { console.log('skip the browser checks: Chromium would not start (' + e.message.split('\n')[0] + ')'); return; }
  const dir = root;
  const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.png':'image/png', '.webmanifest':'application/manifest+json', '.json':'application/json' };
  const server = http.createServer((req, res) => {
    if (resultsServe(req.url, res)) return;   // the week's results.json: 404 unless RESULTS_FILE (tools/results-serve.mjs)
    const file = path.resolve(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type':TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  const SAVE = { settings:{ tut:['past', 'pass', 'tackle', 'block', 'scrum', 'lineout', 'goal', 'drop', 'maul'], coach:false, played:5, myClub:'FAR', myNat:'ENG' }, profile:{ age:'adult', gender:'male', look:null } };
  try {
    for (const [w, h] of [[844, 390], [667, 375], [844, 340], [667, 320], [568, 320]]) {
      const at = `${w}x${h}`;
      const ctx = await browser.newContext({ viewport:{ width:w, height:h }, hasTouch:true });
      await ctx.addInitScript(v => { try { localStorage.setItem('tryline.v1', v); } catch (e) { /* none */ } }, JSON.stringify(SAVE));
      const page = await ctx.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(base);
      await page.waitForFunction(() => window.__tryline && !document.getElementById('s-home').hidden);
      await page.evaluate(() => document.fonts && document.fonts.ready);
      const r = await page.evaluate(() => {
        const T = window.__tryline, P = T.picker, D = T.debug, $ = id => document.getElementById(id), scr = $('s-teams'), bad = [];
        const cut = e => e.scrollWidth > e.clientWidth + 1;
        const vis = el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
        const card = what => {
          if (scr.scrollHeight > scr.clientHeight + 0.5) bad.push(`${what}: scrolls`);
          const o = [...scr.querySelectorAll('#t-side0 .tname, #t-side0 .pk-league, #t-side0 .pk-ctx')].filter(cut).map(e => e.textContent); if (o.length) bad.push(`${what}: cut ${o.join(', ')}`);
          const g = scr.querySelector('#t-side0 .pk-group'); if (g && (cut(g) || g.scrollHeight > g.clientHeight + 1)) bad.push(`${what}: group cut ${g.textContent}`);
          const small = [...scr.querySelectorAll('#t-side0 .btn')].filter(b => vis(b) && b.getBoundingClientRect().height < 43.5).map(b => b.textContent); if (small.length) bad.push(`${what}: under 44px ${small.join(', ')}`);
          const hd = scr.querySelector('#t-side0 .pk-head'), kids = [...hd.children].filter(vis).map(k => k.getBoundingClientRect());
          for (let i = 1; i < kids.length; i++) if (kids[i].left < kids[i - 1].right - 0.5) bad.push(`${what}: head overlaps`);
        };
        D.openTeams('quick');
        const ladder = () => P.view(0).ladder, gi = k => ladder().findIndex(g => g.key === k);
        let cards = 0;
        for (const g of ladder().filter(g => g.local)) {
          P.group(0, gi(g.key) - P.view(0).gi);
          for (let i = 0; i < g.teams.length; i++) { if (T.local.LOCAL_NEW.has(P.view(0).team) || i === 0) { card(`${g.key} ${P.view(0).team.name}`); cards++; } P.step(0, 1); }
        }
        // the heads: a county's button may take two lines, and beside it Your Team stays one line, the head 44px, so both sides' cards
        // start level, whatever the other side shows (layout, so offsetTop and offsetHeight: a card sliding in does not move them)
        const heads = [];
        for (const [a, b] of [['nld', null], ['eco', null], ['nbl', null], ['nmi', null], ['nld', 'eng'], ['eco', 'eng'], ['nbl', 'eng'], ['eng', 'nld'], ['sur', 'eng'], ['nld', 'nbl']]) {
          P.group(0, gi(a) - P.view(0).gi);
          if (b) { const L1 = P.view(1).ladder; P.group(1, L1.findIndex(g => g.key === b) - P.view(1).gi); }
          const m = [0, 1].map(s => { const side = $('t-side' + s), who = side.querySelector('.pk-who'); return { who:who.offsetHeight, line:parseFloat(getComputedStyle(who).lineHeight), head:side.querySelector('.pk-head').offsetHeight, top:side.querySelector('.pk-card').offsetTop }; });
          const what = `${a}|${b || P.view(1).group.key}`;
          if (m.some(x => x.who > x.line * 1.5)) heads.push(`${what}: a side's label on two lines`);
          if (m.some(x => x.head > 45) || m[0].top !== m[1].top) heads.push(`${what}: heads ${m[0].head} and ${m[1].head}, cards at ${m[0].top} and ${m[1].top}`);
        }
        bad.push(...heads.map(h => 'Head ' + h));
        // the Filter: England's League column and each county's Teams, every row and head whole and 44px
        const fl = what => {
          const m = $('m-filter');
          const c = [...m.querySelectorAll('.fl-r > b, .fl-nm > b, .fl-h, .fl-nm small')].filter(e => vis(e) && (cut(e) || e.scrollHeight > e.clientHeight + 1)).map(e => e.textContent); if (c.length) bad.push(`${what}: cut ${c.join(', ')}`);
          const s = [...m.querySelectorAll('.fl-r')].filter(e => vis(e) && e.getBoundingClientRect().height < 43.5).map(e => e.textContent); if (s.length) bad.push(`${what}: under 44px ${s.slice(0, 3).join(', ')}`);
          if (document.scrollingElement.scrollHeight > innerHeight + 1 || document.scrollingElement.scrollWidth > innerWidth + 1) bad.push(`${what}: the page scrolls`);
        };
        P.group(0, gi('sur') - P.view(0).gi);
        P.filter(0, '', { dev:'touch' });
        const F = P.filterState(), counties = F.cols[2].rows.map((n, i) => [n.name, i]).slice(3);
        for (const [n, i] of counties) { P.filterSel(2, i); fl('Filter ' + n); }
        P.filterClose();
        P.filter(0, 'a', { dev:'touch' }); fl('search a'); const more = $('fl-res').querySelector('.fl-more'); if (!more || cut(more)) bad.push('search: no count line'); P.filterClose();
        // the Competitions tier, Local: two boxes, then three with My League; Other County on its Filter
        D.goHome(); T.home.open('champ'); T.home.setTier(2); T.home.champ();
        const comps = () => [...document.querySelectorAll('#hc-comps .hc-comp')];
        for (const b of comps()) if (cut(b) || b.getBoundingClientRect().height < 43.5) bad.push('Competitions: ' + b.textContent);
        const two = comps().map(b => b.textContent).join('|');
        T.importer.setLeague({ teams:[] }); T.home.champ();
        const three = comps().map(b => b.textContent).join('|');
        T.importer.setLeague(null); T.home.champ();
        $('hc-county').click();
        const OC = P.filterState(), oc = OC.cols.map(c => c.head).join('|'); fl('Other County');
        for (let i = 0; i < OC.cols[0].rows.length; i++) { P.filterSel(0, i); fl('Other County ' + OC.cols[0].rows[i].name); }
        return { bad, cards, two, three, oc };
      });
      ok(!errors.length, `${at}: no page errors (${errors.join('; ')})`);
      ok(!r.bad.filter(b => /^Head /.test(b)).length, `${at}: a county's two-line button leaves Your Team one line and the head 44px, both cards level beside the Premiership or another county (${r.bad.filter(b => /^Head /.test(b)).slice(0, 4).join('; ')})`);
      ok(r.cards >= 452 && !r.bad.filter(b => !/^Head |Filter|search|Competitions|Other County/.test(b)).length, `${at}: every new club's card once (${r.cards}), each county's button, nothing cut, under 44px or scrolled (${r.bad.filter(b => !/^Head |Filter|search|Competitions|Other County/.test(b)).slice(0, 4).join('; ')})`);
      ok(!r.bad.filter(b => /Filter|search/.test(b)).length, `${at}: the Filter's every county, its Teams heads, the search's count line whole (${r.bad.filter(b => /Filter|search/.test(b)).slice(0, 4).join('; ')})`);
      ok(r.two === 'Surrey|Other County' && r.three === 'Surrey|Other County|My League' && r.oc === 'County|Surrey' && !r.bad.filter(b => /Competitions|Other County/.test(b)).length, `${at}: Local's competitions (${r.two}; ${r.three}) and Other County's Filter (${r.oc}) whole (${r.bad.filter(b => /Competitions|Other County/.test(b)).slice(0, 4).join('; ')})`);
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
}
