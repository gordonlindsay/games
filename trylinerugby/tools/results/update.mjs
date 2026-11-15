#!/usr/bin/env node
// Developer script, never part of the game: rebuild trylinerugby/results.json, each side's latest real result and its Form boost.
//   node tools/results/update.mjs              fetch, check, write results.json and tools/results/last-tables.json
//   node tools/results/update.mjs --dry-run    fetch, check, print, write nothing
//   options: --summary FILE (the run's summary, for the pull request), --cache DIR (pages are cached there and reused for 6 hours; default tools/results/.cache, ignored by git)
//            --seed DIR (a read-only cache of an earlier run), --baseline DIR (a cache whose league tables are last week's, for a first run
//            with no tools/results/last-tables.json), --now ISO (the run's time, for a re-run from the cache), --offline (cache only)
// Sources: Wikipedia season pages for the Premiership to National League 2 (results with their bonus points; the tables are built from
// them, because Wikipedia's own lag), Pitchero for Regional 1 to Counties 1 (one RFU league table a league, and the 1st XV fixtures
// pages of the clubs with a Pitchero site; a club without one gets its result from an opponent's page, or from the change in its table
// line since last week's snapshot), and World Rugby's match and rankings feed for the nations. Every page is fetched politely and cached
// (tools/results/fetch.mjs). docs/results-clubs.json says where each club plays (tools/results/discover.mjs writes it).
// Nothing is written unless every check passes: the validator (tools/results/lib.mjs, docs/results-schema.md), fewer than 90% of last
// week's entries, a league's games played going backwards for more than one club, two pages disagreeing on a score.
// The sources' terms: see README, Real results: the weekly job. Players' devices never touch any of them.
import fs from 'node:fs';
import path from 'node:path';
import { Fetcher, GAP_MS, GIVE_UP } from './fetch.mjs';
import { gameTeams, GAME_ROOT } from './teams.mjs';
import * as L from './lib.mjs';

const args = process.argv.slice(2);
const has = k => args.includes(k);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const many = k => args.flatMap((a, i) => (a === k ? [args[i + 1]] : []));
const OUT = path.join(GAME_ROOT, 'results.json');
const SNAP = path.join(GAME_ROOT, 'tools/results/last-tables.json');
const MAP = path.join(GAME_ROOT, 'docs/results-clubs.json');
const FEED = 'https://api.wr-rims-prod.pulselive.com/rugby/v3';
const NATION_DAYS = 400;            // how far back a nation's last Test may be
const DEADLINE_MIN = 45;            // the run gives up fetching after this, and refuses with its summary written (the workflow's timeout is 60)
const lines = [];
const say = s => { lines.push(s); console.log(s); };
/* The run's summary (--summary FILE): the pull request's body, and the workflow's step summary whether or not the week was refused. */
function summary(notes, problems) {
  if (!opt('--summary')) return;
  const refused = problems.length ? `\n\n**Refused, nothing written:**\n${problems.map(p => '- ' + p).join('\n')}` : '';
  fs.writeFileSync(opt('--summary'), lines.filter(x => !x.startsWith('NOTE ')).map(x => x.replace(/^ +/, '- ')).join('\n') + `\n\n${notes} notes in the run's log.${refused}\n`);
}

/* ---------- the clubs ---------- */
/* One Wikipedia league: every mapped club's latest result, places before it from the results before its date. */
export function wikiLeague(name, html, variants, clubsHere, idOf, today) {
  const notes = [], entries = {};
  const table = L.wikiTable(html), teams = table.map(t => t.name);
  const fix = n => variants[n] || n;
  const all = L.wikiMatches(html).map(m => ({ ...m, home:fix(m.home), away:fix(m.away) })).filter(m => m.date && !/standings|winner|loser|tbc|tbd/i.test(m.home + m.away));
  const odd = [...new Set(all.flatMap(m => [m.home, m.away]))].filter(n => !teams.includes(n));
  if (teams.length < 8 || odd.length) return { entries, notes:[`${name}: refused, ${teams.length < 8 ? 'no table' : 'names its table does not hold: ' + odd.join(', ')}`], refused:true };
  const played = all.filter(m => m.hs != null && m.date <= today);
  const after = L.tableFrom(played, teams);
  /* A page that lists only some rounds' matches (its table has more games than its results) cannot rebuild the table from scratch. Its own
     table is as of the date under it ("Updated to match(es) played on 8 November 2026"), so the line is that table plus every result the
     page lists after that date, and the places before a later match are that table plus the results before the match's day. A match on
     or before that date: the page's own line, and no places before it. No date: no line and no places (a stale table would read as after
     a match it is from before). */
  const partial = table.some(t => Number.isInteger(t.p) && after.get(t.name) && t.p > after.get(t.name).p);
  const own = new Map(table.map(t => [t.name, t]));
  const updated = L.wikiUpdated(html);
  const known = updated && updated <= today && table.every(t => [t.p, t.w, t.d, t.l, t.pts].every(Number.isInteger));
  const onTop = upto => {   // the page's table plus the results after its date and before upto (or through today)
    const since = played.filter(m => m.date > updated && (!upto || m.date < upto));
    const add = L.tableFrom(since, teams);
    const rows = table.map((t, i) => { const a = add.get(t.name); return { name:t.name, p:t.p + a.p, w:t.w + a.w, d:t.d + a.d, l:t.l + a.l, pf:(t.pf || 0) + a.pf, pa:(t.pa || 0) + a.pa, pts:t.pts + a.pts, pos:t.pos || i + 1 }; });
    if (since.length) L.rankRows(rows);
    return new Map(rows.map(r => [r.name, r]));
  };
  for (const [id, team] of clubsHere) {
    const mine = played.filter(m => m.home === team || m.away === team);
    if (!mine.length) { notes.push(`${name}: ${id} ${team} has no result yet`); continue; }
    const m = mine[mine.length - 1], home = m.home === team, opp = home ? m.away : m.home;
    let now, places = {};
    if (!partial) {
      const before = L.tableFrom(played, teams, m.date), me = before.get(team), them = before.get(opp);
      now = after.get(team); places = { prePos:me.pos, oppPos:them.pos, preP:me.p, oppPreP:them.p };
    } else if (!known) now = {};
    else if (m.date <= updated) now = { ...own.get(team), pos:own.get(team).pos || table.indexOf(own.get(team)) + 1 };
    else {
      const pre = onTop(m.date), me = pre.get(team), them = pre.get(opp);
      now = onTop(null).get(team); places = { prePos:me.pos, oppPos:them.pos, preP:me.p, oppPreP:them.p };
    }
    const next = all.filter(x => (x.home === team || x.away === team) && x.date > m.date && x.hs == null && !x.off).map(x => x.date).sort()[0] || null;
    entries[id] = L.entryOf({ date:m.date, ha:home ? 'h' : 'a', f:home ? m.hs : m.as, a:home ? m.as : m.hs, wo:m.wo, opp:idOf(name, opp), oppName:opp, comp:name,
      league:now.pos ? name : null, pos:now.pos, of:teams.length, p:now.p, w:now.w, d:now.d, l:now.l, pts:now.pts,
      ...places, next, src:'wikipedia' });
  }
  if (partial) notes.push(`${name}: the page lists only some rounds' matches; ${known ? `its own table is updated to ${updated}, and the results it lists after that are added to it` : 'its table gives no date it is updated to, so no line and no places before a match'}`);
  return { entries, notes, refused:false };
}

/* A Pitchero league. table: this week's rows. snap: last week's ({ at, rows }) or null. pages: { rowName: fixtures[] } from the sites read.
   clubsHere: [[id, rowName]]. Returns entries for clubs with a result found, and the ids with no new result (carried over by the caller). */
export function pitcheroLeague(name, table, snap, pages, clubsHere, idOf, today) {
  const notes = [], problems = [], entries = {}, quiet = [];
  /* A club's own page that lists nothing this season is a page the club left behind (some stopped in 2018): it is read as no page, so an
     opponent's page or the club's table line gives its result. */
  const seasonStart = L.seasonOf(today).slice(0, 4) + '-07-01';
  pages = Object.fromEntries(Object.entries(pages).filter(([owner, list]) => {
    if (list.some(g => g.date >= seasonStart)) return true;
    notes.push(`${name}: ${owner}'s own page lists nothing this season (its latest ${list.length ? list[list.length - 1].date : 'none'}), so it is read as no page`);
    return false;
  }));
  const row = new Map(table.map(r => [r.name, r]));
  const was = snap ? new Map(snap.rows.map(r => [r.name, r])) : null;
  const snapDay = snap ? L.ukDate(snap.at) : null;
  const delta = n => { const a = row.get(n), b = was && was.get(n); return a && b && [a.p, a.pf, a.pa, a.hf, a.af, b.p, b.pf, b.pa, b.hf, b.af].every(Number.isInteger) ? { p:a.p - b.p, f:a.pf - b.pf, a:a.pa - b.pa, hf:a.hf - b.hf, af:a.af - b.af } : null; };
  /* every result seen on any page, once, from the home side's view; two pages giving one match different scores is a problem */
  const seen = new Map();
  for (const [owner, list] of Object.entries(pages)) for (const g of list) {
    if (g.friendly || !g.ha) continue;
    const home = g.ha === 'h' ? owner : g.opp, away = g.ha === 'h' ? g.opp : owner;
    const k = `${g.date}|${home}|${away}`;
    const hs = g.f == null ? null : g.ha === 'h' ? g.f : g.a, as = g.f == null ? null : g.ha === 'h' ? g.a : g.f;
    const prev = seen.get(k);
    if (prev && prev.hs != null && hs != null && (prev.hs !== hs || prev.as !== as)) problems.push(`${name}: ${home} v ${away} on ${g.date} is ${prev.hs}-${prev.as} on one page and ${hs}-${as} on another`);
    if (!prev || (prev.hs == null && hs != null)) seen.set(k, { date:g.date, home, away, hs, as, off:g.off, wo:g.wo, league:g.league, comp:g.comp || name, owner });
  }
  const matches = [...seen.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const results = matches.filter(m => m.hs != null && !m.off && m.date <= today);
  /* A club with no page of its own: its next fixture seen on another club's page, or the league's next round (the first later date any page
     lists a league fixture on), whichever is sooner. A club with a bye that week loses a day or two of its window, never gains one. */
  const nextOf = (team, day) => {
    const seenNext = matches.filter(m => (m.home === team || m.away === team) && m.date > day && !m.off && m.hs == null).map(m => m.date)[0] || null;
    const round = matches.filter(m => m.league && m.date > day && !m.off).map(m => m.date)[0] || null;
    return [seenNext, round].filter(Boolean).sort()[0] || null;
  };
  const tableLine = n => { const r = row.get(n); return r ? { league:name, pos:r.rank, of:table.length, p:r.p, w:r.w, d:r.d, l:r.l, pts:r.pts } : {}; };
  const places = (me, opp, day) => {   // last week's places, when last week's table is the one just before this match for both
    const a = row.get(me), b = row.get(opp), x = was && was.get(me), y = was && was.get(opp);
    if (!a || !b || !x || !y || !(snapDay <= day) || x.p !== a.p - 1 || y.p !== b.p - 1) return {};
    return { prePos:x.rank, oppPos:y.rank, preP:x.p, oppPreP:y.p };
  };
  const roundDays = [...new Set(results.filter(m => m.league && snapDay && m.date >= snapDay).map(m => m.date))];
  for (const [id, team] of clubsHere) {
    if (!row.has(team)) { notes.push(`${name}: ${id} "${team}" is not in this week's table`); continue; }
    let own = pages[team];
    const d = delta(team);
    let m = null, how = '';
    if (own) {
      const mine = own.filter(g => !g.friendly && !g.off && g.f != null && g.date <= today);
      const g = mine[mine.length - 1];
      if (g) { m = { date:g.date, ha:g.ha, f:g.f, a:g.a, wo:g.wo, opp:g.opp, comp:g.league ? name : g.comp, league:g.league }; how = 'own page'; }
      const nx = own.filter(x => !x.friendly && !x.off && x.f == null && m && x.date > m.date).map(x => x.date)[0] || null;
      if (m) m.next = nx;
      /* the table has a game since last week's snapshot that the page does not: the page lags, so it is read as no page */
      if (d && d.p >= 1 && snapDay && (!m || m.date < snapDay)) { notes.push(`${name}: ${team}'s own page has nothing since ${snapDay}, but its table line has ${d.p} more game${d.p > 1 ? 's' : ''}: read as no page`); m = null; own = null; }
      else if (!m) own = null;
    }
    if (!own) {
      const mine = results.filter(x => x.home === team || x.away === team);
      const x = mine[mine.length - 1];
      const leagueLast = results.filter(r => r.league).map(r => r.date).pop() || null;
      if (x && x.date === leagueLast && (!d || d.p === 0) && !(snapDay && x.date >= snapDay)) {
        /* the league's latest round, on an opponent's page, and nothing new in its table line since: no round since that one */
        const home = x.home === team;
        m = { date:x.date, ha:home ? 'h' : 'a', f:home ? x.hs : x.as, a:home ? x.as : x.hs, wo:x.wo, opp:home ? x.away : x.home, comp:name, league:true }; how = `${x.owner}'s page, the league's latest round`;
      } else if (x && d && d.p === 1 && x.date >= snapDay) {
        const home = x.home === team, f = home ? x.hs : x.as, a = home ? x.as : x.hs;
        if (d.f === f && d.a === a) { m = { date:x.date, ha:home ? 'h' : 'a', f, a, wo:x.wo, opp:home ? x.away : x.home, comp:name, league:true }; how = `${x.owner}'s page`; }
        else notes.push(`${name}: ${team} ${f}-${a} on ${x.owner}'s page, but its table moved ${d.f}-${d.a}`);
      } else if (d && d.p === 1) {
        const mirror = [...row.keys()].filter(o => o !== team && (dd => dd && dd.p === 1 && dd.f === d.a && dd.a === d.f)(delta(o)));
        const od = mirror.length === 1 ? delta(mirror[0]) : null;
        const ha = d.f > 0 ? (d.hf === d.f && d.af === 0 ? 'h' : d.af === d.f && d.hf === 0 ? 'a' : null) : od && od.f > 0 ? (od.hf === od.f && od.af === 0 ? 'a' : od.af === od.f && od.hf === 0 ? 'h' : null) : null;
        if (mirror.length === 1 && ha && roundDays.length === 1) { m = { date:roundDays[0], ha, f:d.f, a:d.a, wo:false, opp:mirror[0], comp:name, league:true }; how = 'its table line since last week'; }
        else notes.push(`${name}: ${team} played once since last week (${d.f}-${d.a}) but ${mirror.length !== 1 ? `${mirror.length} sides mirror it` : !ha ? 'home or away is not clear' : `the round's date is not clear (${roundDays.join(', ') || 'none seen'})`}`);
      }
      if (m) m.next = nextOf(team, m.date);
    }
    if (!m) { quiet.push(id); continue; }
    if (own && d && d.p === 1 && m.league && m.date >= snapDay && (d.f !== m.f || d.a !== m.a)) notes.push(`${name}: ${team} ${m.f}-${m.a} on its own page, but its table moved ${d.f}-${d.a}`);
    entries[id] = L.entryOf({ ...m, opp:idOf(name, m.opp), oppName:m.opp, comp:m.comp, ...tableLine(team), ...(m.league ? places(team, m.opp, m.date) : {}), src:'pitchero', how });
  }
  return { entries, notes, problems, quiet };
}

/* ---------- last week's tables ---------- */
const slim = rows => rows.map(({ rank, name:n, p, w, d, l, pf, pa, pts, hf, af }) => ({ rank, name:n, p, w, d, l, pf, pa, pts, hf, af }));
/* The Friday before a day: the eve of the weekend's round a run reads (a Sunday or Monday run: the Friday just gone). */
export function roundEve(today) { const dow = new Date(today + 'T12:00:00Z').getUTCDay(); return L.addDays(today, -((dow + 2) % 7 || 7)); }
/* The snapshot a Pitchero league is read against: the newest one kept (tools/results/last-tables.json holds the last run's table and the
   one that run read against) taken on or before the eve of this weekend's round, so a Monday run after the Sunday pull request was merged
   still reads against last week's table, not the same weekend's. A snapshot from another season, or of another table, is no baseline. */
export function baselineOf(stored, today, season, tableId = null) {
  const fits = s => s && typeof s.at === 'string' && Array.isArray(s.rows) && L.seasonOf(L.ukDate(s.at)) === season && L.ukDate(s.at) <= today && (s.tableId == null || tableId == null || s.tableId === tableId);
  const all = [stored, stored && stored.prev].filter(fits).map(({ prev, ...s }) => s).sort((a, b) => (a.at < b.at ? 1 : -1));
  const eve = roundEve(today);
  return all.find(s => L.ukDate(s.at) <= eve) || all[all.length - 1] || null;
}

/* ---------- the nations ---------- */
const feedCode = { CAN:'CDN' };   // the feed's Canada is the game's CDN (CAN is Canberra)
const venueOf = { 'United States':'USA', 'United States of America':'USA' };   // a venue's country as the feed names the team playing there
export function nationEntries(sport, rankings, matches, want, today, nowMs) {
  const notes = [], entries = {};
  const ranked = new Map(rankings.entries.map(e => [e.team.id, e]));
  const code = e => feedCode[e.team.abbreviation] || e.team.abbreviation;
  const effective = rankings.effective && rankings.effective.label;
  const rankBefore = (e, day) => (effective <= day ? e.pos : e.previousPos);
  const uniq = new Map();
  for (const m of matches) if (m && m.matchId && !uniq.has(m.matchId)) uniq.set(m.matchId, m);
  const tests = [...uniq.values()].filter(m => m.teams && m.teams.length === 2 && ranked.has(m.teams[0].id) && ranked.has(m.teams[1].id) && m.time && Number.isFinite(m.time.millis))
    .sort((a, b) => a.time.millis - b.time.millis);
  const plain = n => L.cleanName(String(n).replace(/\s+Women$/i, ''));
  for (const id of want) {
    const e = [...ranked.values()].find(x => code(x) === id);
    if (!e) { notes.push(`${sport} ${id}: not in the rankings`); continue; }
    const mine = tests.filter(m => m.teams.some(t => t.id === e.team.id));
    const done = mine.filter(m => m.status === 'C' && Array.isArray(m.scores) && Number.isInteger(m.scores[0]) && Number.isInteger(m.scores[1]) && L.ukDate(m.time.millis) <= today);
    const m = done[done.length - 1];
    if (!m) { notes.push(`${sport} ${id}: no Test in the last ${NATION_DAYS} days`); continue; }
    const i = m.teams[0].id === e.team.id ? 0 : 1, o = ranked.get(m.teams[1 - i].id);
    const date = L.ukDate(m.time.millis), venue = m.venue && m.venue.country && (venueOf[m.venue.country] || m.venue.country);
    const ha = venue && venue === m.teams[i].name.replace(/\s+Women$/i, '') ? 'h' : venue && venue === m.teams[1 - i].name.replace(/\s+Women$/i, '') ? 'a' : 'n';
    const later = mine.filter(x => x.time.millis > m.time.millis && x.status === 'U' && x.time.millis > nowMs).map(x => L.ukDate(x.time.millis)).find(dd => dd > date) || null;
    const ranks = effective && (effective <= date || L.daysBetween(date, effective) <= 7) ? { rank:rankBefore(e, date), oppRank:rankBefore(o, date) } : {};   // the table in force at kick-off, or the one just before the release that counted it
    entries[id] = L.entryOf({ date, ha, f:m.scores[i], a:m.scores[1 - i], opp:want.includes(code(o)) ? code(o) : null, oppName:plain(o.team.name), comp:'Test',
      ...(Number.isInteger(ranks.rank) && Number.isInteger(ranks.oppRank) && ranks.rank !== ranks.oppRank ? ranks : {}), next:later, src:'worldrugby' });
  }
  return { entries, notes };
}

/* ---------- the run ---------- */
async function main() {
  for (const a of args) if (a.startsWith('--') && !['--dry-run', '--offline', '--cache', '--seed', '--baseline', '--now', '--summary', '--deadline'].includes(a)) throw new Error(`unknown option ${a}`);
  const dry = has('--dry-run'), nowMs = opt('--now') ? Date.parse(opt('--now')) : Date.now();
  if (!Number.isFinite(nowMs)) throw new Error('--now is not a time');
  const generated = new Date(nowMs).toISOString().replace(/\.\d{3}Z$/, 'Z'), today = L.ukDate(nowMs), season = L.seasonOf(today);
  const started = Date.now();
  const minutes = +opt('--deadline', DEADLINE_MIN);
  const F = new Fetcher({ dir:opt('--cache', path.join(GAME_ROOT, 'tools/results/.cache')), seeds:many('--seed'), offline:has('--offline'), log:s => console.log(s), deadline:started + minutes*60e3 });
  const G = gameTeams(), map = JSON.parse(fs.readFileSync(MAP, 'utf8')), alias = JSON.parse(fs.readFileSync(path.join(GAME_ROOT, 'tools/results/aliases.json'), 'utf8'));
  let overrides = {}; try { overrides = JSON.parse(fs.readFileSync(path.join(GAME_ROOT, 'tools/results/overrides.json'), 'utf8')); } catch (e) { /* none */ }
  let prevText = null; try { prevText = fs.readFileSync(OUT, 'utf8'); } catch (e) { /* the first run */ }
  let prev = null; try { prev = prevText && JSON.parse(prevText); } catch (e) { prev = null; }
  if (prev && L.validate(prev, G.ids).length) { say('The last results.json does not pass the checks: it is not carried over or compared.'); prev = null; }
  let snaps = { leagues:{} }; try { snaps = JSON.parse(fs.readFileSync(SNAP, 'utf8')); } catch (e) { /* none yet */ }
  if (map.season !== season) say(`docs/results-clubs.json is for ${map.season}, this is ${season}: run tools/results/discover.mjs.`);

  const leagues = Object.entries(map.leagues), clubsIn = name => Object.entries(map.clubs).filter(([, c]) => c.league === name).map(([id, c]) => [id, c.team]);
  const names = new Map(Object.entries(map.clubs).map(([id, c]) => [`${c.league}|${c.team}`, id]));
  const idOf = (league, team) => names.get(`${league}|${team}`) || null;
  const pitch = leagues.filter(([, l]) => l.src === 'pitchero');
  const siteCount = pitch.reduce((s, [, l]) => s + Object.keys(l.sites || {}).length, 0);
  const planned = { 'en.wikipedia.org':leagues.length - pitch.length, 'www.pitchero.com':pitch.length + siteCount, 'api.wr-rims-prod.pulselive.com':12 };
  const est = Object.values(planned).reduce((s, n) => s + n, 0)*(GAP_MS + 1500)/60000;
  say(`Plan: ${Object.entries(planned).map(([h, n]) => `${n} from ${h}`).join(', ')}; at most about ${Math.ceil(est)} minutes, one request at a time, less what the cache holds.`);

  const out = { v:L.SCHEMA_V, generated, season, clubs:{}, men:{}, women:{} };
  const notes = [], problems = [], tablesNow = {}, howMany = {};
  /* Wikipedia */
  for (const [name, l] of leagues.filter(([, x]) => x.src === 'wikipedia')) {
    const r = await F.get('https://en.wikipedia.org/wiki/' + encodeURIComponent(l.wiki));
    if (r.status !== 200) { problems.push(`${name}: Wikipedia answered ${r.status}`); continue; }
    const got = wikiLeague(name, r.body, (alias.variants || {})[l.wiki] || {}, clubsIn(name), idOf, today);
    Object.assign(out.clubs, got.entries); notes.push(...got.notes);
    if (got.refused) problems.push(...got.notes.filter(n => n.includes('refused')));
    howMany[name] = Object.keys(got.entries).length;
  }
  /* Pitchero */
  const baseline = opt('--baseline'), fromBaseline = [];
  for (const [name, l] of pitch) {
    let table = null, at = null;
    for (const v of l.via) {
      const r = await F.get(`https://www.pitchero.com/clubs/${v.folder}/teams/${v.team}/league-table`);
      if (r.status !== 200) continue;
      const t = L.pitcheroTables(L.nextData(r.body)).filter(x => x.id === l.tableId || (x.season === season && L.leagueName(x.name) === name)).pop();
      if (t && t.rows.length >= 4) { table = t.rows; at = r.fetched; break; }
    }
    if (!table) { notes.push(`${name}: no table this week`); continue; }
    tablesNow[name] = { at, tableId:l.tableId, rows:slim(table) };
    let snap = baselineOf(snaps.leagues && snaps.leagues[name], today, season, l.tableId);
    if (!snap && baseline) {
      for (const v of l.via) {
        const bf = new Fetcher({ dir:baseline, offline:true });
        const r = await bf.get(`https://www.pitchero.com/clubs/${v.folder}/teams/${v.team}/league-table`, { anyAge:true });
        const t = r.status === 200 && L.pitcheroTables(L.nextData(r.body)).filter(x => x.id === l.tableId || (x.season === season && L.leagueName(x.name) === name)).pop();
        if (t && Date.parse(r.fetched) < nowMs) { snap = { at:r.fetched, rows:slim(t.rows) }; fromBaseline.push(r.fetched); break; }
      }
    }
    if (snap) {
      const wasP = snap.rows.reduce((s, r) => s + (r.p || 0), 0), nowP = table.reduce((s, r) => s + (r.p || 0), 0);
      problems.push(...L.runProblems({}, null, [{ league:name, now:table, was:snap.rows, days:L.daysBetween(L.ukDate(snap.at), today) }], overrides.shrink || []));
      tablesNow[name].prev = { at:snap.at, ...(snap.tableId != null ? { tableId:snap.tableId } : {}), rows:slim(snap.rows) };   // the next run's way back to this one's baseline
      if (nowP === wasP && snap.at && L.ukDate(snap.at) === today) { /* the same table: nothing new since */ }
    }
    const pages = {};
    for (const [rowName, s] of Object.entries(l.sites || {})) {
      const r = await F.get(`https://www.pitchero.com/clubs/${s.folder}/teams/${s.team}/fixtures-results`);
      if (r.status !== 200) { notes.push(`${name}: ${rowName}'s fixtures page answered ${r.status}`); continue; }
      const list = L.pitcheroFixtures(L.nextData(r.body)).filter(g => g.teamId === s.team);
      if (list.length) pages[rowName] = list;
    }
    const got = pitcheroLeague(name, table, snap || null, pages, clubsIn(name), idOf, today);
    Object.assign(out.clubs, got.entries); notes.push(...got.notes); problems.push(...got.problems);
    howMany[name] = Object.keys(got.entries).length;
    /* a club with nothing new keeps last week's result, with this week's table line */
    for (const id of got.quiet) {
      const e = prev && prev.clubs && prev.clubs[id];
      if (!e) continue;
      const r = table.find(x => x.name === map.clubs[id].team), c = { ...e };
      if (r) Object.assign(c, { league:name, pos:r.rank, of:table.length, p:r.p, w:r.w, d:r.d, l:r.l, pts:r.pts });
      if (!L.entryProblems(c, 'clubs', G.ids.clubs, today).length) { out.clubs[id] = c; howMany[name]++; }
    }
  }
  if (fromBaseline.length) say(`Baseline: ${fromBaseline.length} leagues read against ${baseline}'s tables, fetched ${fromBaseline.sort()[0]} to ${fromBaseline.sort().pop()}.`);
  /* World Rugby */
  for (const [sport, kind, want] of [['mru', 'men', G.men], ['wru', 'women', G.women]]) {
    try {
      const rk = await F.get(`${FEED}/rankings/${sport}?language=en`);
      if (rk.status !== 200) throw new Error(`rankings answered ${rk.status}`);
      const rankings = JSON.parse(rk.body);
      const start = L.addDays(today, -NATION_DAYS), end = L.addDays(today, 60), matches = [];
      for (let page = 0, pages = 1; page < pages && page < 30; page++) {
        const r = await F.get(`${FEED}/match?startDate=${start}&endDate=${end}&sort=desc&pageSize=100&page=${page}&sport=${sport}`);
        if (r.status !== 200) throw new Error(`matches page ${page} answered ${r.status}`);
        const d = JSON.parse(r.body);
        matches.push(...(d.content || []));
        pages = d.pageInfo ? d.pageInfo.numPages : 1;
      }
      const got = nationEntries(sport, rankings, matches, want, today, nowMs);
      Object.assign(out[kind], got.entries); notes.push(...got.notes);
    } catch (e) { problems.push(`${kind}'s nations: ${e.message}`); }
  }
  /* order the keys, check, write */
  for (const k of ['clubs', 'men', 'women']) out[k] = Object.fromEntries(Object.entries(out[k]).sort((a, b) => (a[0] < b[0] ? -1 : 1)));
  for (const h of F.dead) problems.push(`${h}: given up after ${GIVE_UP} failures in a row`);
  if (F.late) problems.push(`the run passed its ${minutes}-minute deadline: pages after it were not fetched`);
  problems.push(...L.validate(out, G.ids), ...L.runProblems(out, prev));
  const placed = Object.values(out.clubs).filter(e => e.league).length;
  say(`Clubs: ${Object.keys(out.clubs).length} of ${G.clubs.length} have a result (${placed} with a league place); ${Object.keys(map.clubs).length} mapped, ${map.unmapped.length} unmapped.`);
  say(`Nations: men ${Object.keys(out.men).length} of ${G.men.length}, women ${Object.keys(out.women).length} of ${G.women.length}.`);
  const boosts = Object.values({ ...out.clubs, ...out.men, ...out.women }).filter(e => e.boost && e.until >= today).length;
  say(`Boosts live today (${today}): ${boosts}. Requests: ${F.requests} made, ${F.cached} from the cache. ${((Date.now() - started)/60000).toFixed(1)} minutes.`);
  for (const [n, c] of Object.entries(howMany)) if (c < clubsIn(n).length) say(`  ${n}: ${c} of ${clubsIn(n).length}`);
  for (const n of notes) say('NOTE ' + n);
  summary(notes.length, problems);
  if (problems.length) { for (const p of problems) console.error('REFUSED: ' + p); console.error('Nothing written.'); process.exitCode = 1; return; }
  if (dry) { say('Dry run: nothing written.'); return; }
  const text = JSON.stringify(out, null, 1) + '\n';
  fs.writeFileSync(OUT + '.tmp', text); fs.renameSync(OUT + '.tmp', OUT);
  const keep = { about:'Each Pitchero league\'s table as the last run read it: the next run\'s baseline for places before a match and for results read from the change in a table line. Written by tools/results/update.mjs.', leagues:{ ...(snaps.leagues || {}), ...tablesNow } };
  fs.writeFileSync(SNAP + '.tmp', JSON.stringify(keep, null, 1) + '\n'); fs.renameSync(SNAP + '.tmp', SNAP);
  say(`Wrote results.json (${Buffer.byteLength(text)} bytes) and tools/results/last-tables.json.`);
}
if (process.argv[1] && fs.realpathSync(process.argv[1]) === new URL(import.meta.url).pathname) main().catch(e => { summary(0, [e.message]); console.error('REFUSED: ' + e.message); console.error('Nothing written.'); process.exitCode = 1; });
