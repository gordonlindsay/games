#!/usr/bin/env node
// Developer script, never part of the game: the mapping pass. Writes docs/results-clubs.json, which tells the weekly job
// (tools/results/update.mjs) where each of the game's clubs plays this season and which pages to read.
//   node tools/results/discover.mjs --cache DIR [--seed DIR ...] [--fetch N] [--dry-run]
// For every club the game gathers (tools/results/teams.mjs): its 2026-27 league and its name in that league's table, from the Wikipedia
// season pages (Premiership to National League 2) or a Pitchero 1st XV league table (Regional 1 to Counties 1, and wherever a club moved);
// and its Pitchero folder and 1st XV team id where it has a Pitchero site tied to it. A name is never guessed: it matches exactly after
// normName, or through tools/results/aliases.json, or the club is listed as unmapped. --fetch N allows up to N new Pitchero requests (a
// club's 1st XV league-table page, or its club home to find the 1st XV) to place clubs no cached table shows; a --seed is an earlier run's
// cache, read only.
import fs from 'node:fs';
import path from 'node:path';
import { Fetcher } from './fetch.mjs';
import { gameTeams, GAME_ROOT } from './teams.mjs';
import { nextData, pitcheroClub, pitcheroTables, firstXV, normName, leagueName, wikiMatches, wikiTable } from './lib.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const many = k => args.flatMap((a, i) => (a === k ? [args[i + 1]] : []));
const CACHE = opt('--cache', path.join(GAME_ROOT, 'tools/results/.cache'));
const SEEDS = many('--seed');
const BUDGET = +opt('--fetch', '0');
const DRY = args.includes('--dry-run');
const SEASON = '2026-27';
const OUT = path.join(GAME_ROOT, 'docs/results-clubs.json');
export const WIKI = [
  { key:'Premiership', title:'2026–27_Premiership_Rugby', level:1 },
  { key:'Championship', title:'2026–27_Champ_Rugby', level:2 },
  { key:'National League 1', title:'2026–27_National_League_1', level:3 },
  { key:'National League 2 East', title:'2026–27_National_League_2_East', level:4 },
  { key:'National League 2 North', title:'2026–27_National_League_2_North', level:4 },
  { key:'National League 2 West', title:'2026–27_National_League_2_West', level:4 },
];
const wikiUrl = t => 'https://en.wikipedia.org/wiki/' + encodeURIComponent(t);
const tableUrl = (folder, team) => `https://www.pitchero.com/clubs/${folder}/teams/${team}/league-table`;
const log = (...a) => console.log(...a);

const F = new Fetcher({ dir:CACHE, seeds:SEEDS, allowSeed:true, maxAge:7*864e5, log });
const G = gameTeams();
const ALIAS = JSON.parse(fs.readFileSync(path.join(GAME_ROOT, 'tools/results/aliases.json'), 'utf8'));

/* 1. The Wikipedia leagues: each page's table names are the league's teams. */
const leagues = {};   // name -> { name, src, level, wiki | via:[{folder, team}], teams:[names], rows }
for (const w of WIKI) {
  const r = await F.get(wikiUrl(w.title), { anyAge:true });
  const table = r.body ? wikiTable(r.body) : [];
  const teams = table.map(t => t.name);
  const variants = (ALIAS.variants || {})[w.title] || {};
  const odd = [...new Set(wikiMatches(r.body || '').flatMap(m => [m.home, m.away]))].filter(n => !teams.includes(n) && !variants[n] && !/standings|winner|loser|tbc|tbd/i.test(n));
  if (odd.length) log(`  ${w.key}: names in its matches its table does not hold: ${odd.join(', ')} (add a variant)`);
  leagues[w.key] = { name:w.key, src:'wikipedia', level:w.level, wiki:w.title, teams };
}

/* 2. Every Pitchero league-table page in the caches: this season's tables, and the page each came from. */
const pages = new Map();   // "folder/team" -> { folder, team, club, tables }
const homes = new Map();   // folder -> club (a club home page)
function scan(dir) {
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.html') || !f.startsWith('www.pitchero.com_clubs_')) continue;
    const m = f.match(/^www\.pitchero\.com_clubs_([a-z0-9-]+)(?:_teams_(\d+)_league-table)?\.html$/i);   // a club's home or a 1st XV table, never its fixtures page
    if (!m) continue;
    const nd = nextData(fs.readFileSync(path.join(dir, f), 'utf8'));
    const club = pitcheroClub(nd);
    if (!club) continue;
    if (!m[2]) { if (!homes.has(m[1])) homes.set(m[1], club); continue; }
    const k = `${m[1]}/${m[2]}`;
    if (!pages.has(k)) pages.set(k, { folder:m[1], team:+m[2], club, tables:pitcheroTables(nd).filter(t => t.teamId === +m[2]) });
  }
}
for (const d of [CACHE, ...SEEDS]) if (fs.existsSync(d)) scan(d);
/* Some clubs never set a season up, so a table comes unlabelled. Table ids are global and rise with time, so an unlabelled one inside the band
   of ids the labelled tables of one season span is that season's. */
const bands = new Map();
for (const p of pages.values()) for (const t of p.tables) if (t.season) { const b = bands.get(t.season) || [Infinity, -Infinity]; bands.set(t.season, [Math.min(b[0], t.id), Math.max(b[1], t.id)]); }
for (const p of pages.values()) for (const t of p.tables) if (!t.season) for (const [s, [lo, hi]] of bands) if (t.id >= lo - 500 && t.id <= hi + 500) { t.season = s; t.inferred = true; }
const isNow = t => t.season === SEASON;
function addPage(p) {
  const now = p.tables.filter(isNow).pop();
  if (!now) return null;
  const name = leagueName(now.name);
  const L = leagues[name] || (leagues[name] = { name, src:'pitchero', tableId:now.id, via:[], teams:now.rows.map(r => r.name), rows:now.rows });
  if (L.src !== 'pitchero') return null;   // a National League table on Pitchero: Wikipedia's results are read instead
  const own = now.rows.find(r => r.own);
  if (!L.via.some(v => v.folder === p.folder && v.team === p.team)) L.via.push({ folder:p.folder, team:p.team, row:own ? own.name : null });
  return L;
}
for (const p of pages.values()) addPage(p);

/* Last season's tables, for a club whose RFU name is not its own: its row there (its place and its W-D-L as docs/clubs-local.json has them)
   names it, and that exact name is looked for in this season's tables. */
const LAST = '2025-26', lastTables = new Map();
const lkey = s => leagueName(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();   // never normName: it drops "(North)"
for (const p of pages.values()) for (const t of p.tables) if (t.season === LAST && !lastTables.has(lkey(t.name))) lastTables.set(lkey(t.name), t);
function recordName(club) {
  const t = lastTables.get(lkey(club.league || ''));
  if (!t || !Number.isInteger(club.w) || !Number.isInteger(club.place)) return null;
  const hit = t.rows.filter(r => r.rank === club.place && r.w === club.w && r.d === club.d && r.l === club.l);
  return hit.length === 1 ? hit[0].name : null;
}

/* 3. Match each club to one team in one league. */
const top = new Set(Object.keys(ALIAS.ids));
const claimed = new Map();   // "league|team" -> id, for names the aliases give a top-tier side
for (const [id, names] of Object.entries(ALIAS.ids)) for (const n of names) for (const L of Object.values(leagues)) if (L.teams.includes(n)) claimed.set(`${L.name}|${n}`, id);
function candidates(club) {
  const out = [];
  const keys = top.has(club.id) ? null : new Set([normName(club.name), normName(club.fullName)].filter(Boolean));
  const pitch = (ALIAS.pitchero || {})[club.id], rec = keys && recordName(club);
  for (const L of Object.values(leagues)) for (const n of L.teams) {
    const c = claimed.get(`${L.name}|${n}`);
    if (c) { if (c === club.id) out.push({ league:L.name, team:n, how:'alias' }); continue; }
    if (pitch && n === pitch) out.push({ league:L.name, team:n, how:'alias' });
    else if (keys && keys.has(normName(n))) out.push({ league:L.name, team:n, how:'name' });
    else if (rec && n === rec) out.push({ league:L.name, team:n, how:'record' });
  }
  return out;
}
/* A club's own Pitchero site: a cached home whose 1st XV page is cached too, and whose own row in this season's table is the club. */
function ownSite(club, L, team) {
  for (const p of pages.values()) {
    const now = p.tables.filter(isNow).pop(), own = now && now.rows.find(r => r.own);
    if (own && leagueName(now.name) === L.name && own.name === team) return { folder:p.folder, team:p.team, how:'own row on its 1st XV page' };
  }
  return null;
}
const mapping = {}, unmapped = [], ambiguous = [];
function place(club) {
  const c = candidates(club);
  const byLeague = [...new Map(c.map(x => [x.league, x])).values()];
  if (byLeague.length === 1) return byLeague[0];
  if (byLeague.length > 1) {
    const same = byLeague.filter(x => lkey(x.league) === lkey(club.league || ''));
    if (same.length === 1) return { ...same[0], how:same[0].how + ', last season\'s league of ' + byLeague.length };
    const near = byLeague.filter(x => { const L = leagues[x.league]; const lv = L.level || levelOf(L.name); return lv && Math.abs(lv - club.level) <= 1; });
    if (near.length === 1) return { ...near[0], how:near[0].how + ', nearest level of ' + byLeague.length };
    ambiguous.push({ id:club.id, name:club.name, leagues:byLeague.map(x => `${x.league}: ${x.team}`) });
  }
  return null;
}
function levelOf(name) {
  if (/^National League 1/.test(name)) return 3; if (/^National League 2/.test(name)) return 4;
  if (/^Regional 1/.test(name)) return 5; if (/^Regional 2/.test(name)) return 6;
  const m = name.match(/^Counties (\d)/); return m ? 6 + +m[1] : null;
}

/* 4. Clubs no cached table places: open their own Pitchero site, if one is known, within the budget. */
let spent = 0;
const knownSite = club => {
  const lead = (ALIAS.sites || {})[club.id];
  if (lead) {
    const [folder, team] = lead.split('/');
    if (team) return { folder, team:+team, name:club.name };
    const c = homes.get(folder), t = c && firstXV(c);
    return t ? { folder, team:t.id, name:c.name } : { folder, team:null, name:club.name };
  }
  const keys = new Set([normName(club.name), normName(club.fullName)]);
  for (const [folder, c] of homes) if (keys.has(normName(c.name)) && c.live && c.gender !== 'female' && !c.isYouth) { const t = firstXV(c); if (t) return { folder, team:t.id, name:c.name }; }
  return null;
};
for (const club of G.clubs) {
  if (place(club)) continue;
  const site = knownSite(club);
  if (site && !site.team && spent < BUDGET) {   // a lead with no team id: its club home names the 1st XV
    const r = await F.get(`https://www.pitchero.com/clubs/${site.folder}`);
    if (!r.cached) spent++;
    const c = r.status === 200 ? pitcheroClub(nextData(r.body)) : null, t = c && firstXV(c);
    if (c) homes.set(site.folder, c);
    if (t) site.team = t.id;
  }
  if (!site || !site.team || spent >= BUDGET || pages.has(`${site.folder}/${site.team}`)) continue;
  const r = await F.get(tableUrl(site.folder, site.team));
  if (!r.cached) spent++;
  if (r.status !== 200) continue;
  const nd = nextData(r.body), c = pitcheroClub(nd);
  if (!c) continue;
  const p = { folder:site.folder, team:site.team, club:c, tables:pitcheroTables(nd).filter(t => t.teamId === site.team) };
  pages.set(`${site.folder}/${site.team}`, p);
  addPage(p);
}
ambiguous.length = 0;
for (const club of G.clubs) {
  const hit = place(club);
  if (!hit) { unmapped.push({ id:club.id, name:club.name, was:club.league }); continue; }
  const L = leagues[hit.league];
  const site = L.src === 'pitchero' ? ownSite(club, L, hit.team) : null;
  const known = !site && knownSite(club);
  mapping[club.id] = { name:club.name, league:L.name, team:hit.team, was:club.league,
    ...(site ? { folder:site.folder, team1:site.team } : known ? { folder:known.folder, team1:known.team } : {}),
    confidence:hit.how.startsWith('alias') ? 'alias' : hit.how.startsWith('record') ? 'record' : site ? 'site' : 'name',
    source:L.src === 'wikipedia' ? `Wikipedia ${L.wiki.replace(/_/g, ' ')}: its table's "${hit.team}"` : `Pitchero ${SEASON} ${L.name} table (id ${L.tableId}): row "${hit.team}"${hit.how.startsWith('record') ? `, the name its ${LAST} row carried (place and W-D-L as the game has them)` : ''}${site ? `, its own 1st XV page ${site.folder}/${site.team}` : ''}` };
}
/* 4b. Sites from the table rows: a row the RFU feed links to a Pitchero club names its folder, or its own domain, which a cached club home
   may carry. The club home gives the 1st XV's team id (one request, within the budget, when it is not cached). */
const byDomain = new Map([...homes].filter(([, c]) => c.domain).map(([f, c]) => [c.domain.replace(/^www\./, ''), f]));
for (const m of Object.values(mapping)) {
  const L = leagues[m.league];
  if (L.src !== 'pitchero' || m.team1) continue;
  const row = (L.rows || []).find(r => r.name === m.team);
  if (!row || !row.url) continue;
  let folder = null;
  const pm = row.url.match(/pitchero\.com\/clubs\/([a-z0-9-]+)/i);
  if (pm) folder = pm[1].toLowerCase();
  else { try { folder = byDomain.get(new URL(row.url).host.replace(/^www\./, '').toLowerCase()) || null; } catch (e) { folder = null; } }
  if (!folder) continue;
  let c = homes.get(folder);
  if (!c && spent < BUDGET) {
    const r = await F.get(`https://www.pitchero.com/clubs/${folder}`);
    if (!r.cached) spent++;
    c = r.status === 200 ? pitcheroClub(nextData(r.body)) : null;
    if (c) homes.set(folder, c);
  }
  const t = c && c.gender !== 'female' && !c.isYouth && firstXV(c);
  if (!t) continue;
  Object.assign(m, { folder, team1:t.id });
  m.source += `, its row's link to ${folder} (1st XV ${t.id}, "${t.name}")`;
}
for (const club of G.clubs) if (!mapping[club.id]) { const c = candidates(club); if (c.length > 1) ambiguous.push({ id:club.id, name:club.name, leagues:c.map(x => `${x.league}: ${x.team}`) }); }

/* 5. The pages each Pitchero league reads: its table from any of its clubs' pages, its results from the fixtures pages of the clubs whose
   1st XV is known. */
const used = new Set(Object.values(mapping).map(m => m.league));
const out = { generated:new Date().toISOString().slice(0, 10), version:1, season:SEASON,
  about:'Written by tools/results/discover.mjs; read by tools/results/update.mjs. leagues: where each league is read. clubs: each game club\'s league this season and its name in that league\'s table, its Pitchero folder and 1st XV team id where a site is tied to it, how sure, and where that came from. unmapped: the clubs no source places, which get no entry.',
  leagues:{}, clubs:{}, unmapped, ambiguous };
for (const name of [...used].sort()) {
  const L = leagues[name];
  if (L.src === 'wikipedia') out.leagues[name] = { src:'wikipedia', wiki:L.wiki, teams:L.teams.length };
  else {
    const sites = new Map();
    for (const v of L.via) if (v.row) sites.set(v.row, { folder:v.folder, team:v.team });
    for (const m of Object.values(mapping)) if (m.league === name && m.folder && m.team1) sites.set(m.team, { folder:m.folder, team:m.team1 });
    out.leagues[name] = { src:'pitchero', tableId:L.tableId, teams:L.teams.length, via:L.via.map(v => ({ folder:v.folder, team:v.team })),
      sites:Object.fromEntries([...sites].sort((a, b) => (a[0] < b[0] ? -1 : 1))) };
  }
}
for (const id of Object.keys(mapping).sort()) out.clubs[id] = mapping[id];
const n = Object.keys(mapping).length;
log(`Placed ${n} of ${G.clubs.length} clubs in ${used.size} leagues (${[...used].filter(x => leagues[x].src === 'pitchero').length} on Pitchero); ${unmapped.length} unmapped, ${ambiguous.length} ambiguous; ${spent} new Pitchero requests, ${F.requests} in all.`);
for (const u of unmapped) log(`  unmapped ${u.id} ${u.name} (2025-26: ${u.was})`);
for (const a of ambiguous) log(`  ambiguous ${a.id} ${a.name}: ${a.leagues.join('; ')}`);
if (!DRY) { fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n'); log(`Wrote ${path.relative(GAME_ROOT, OUT)}.`); }
