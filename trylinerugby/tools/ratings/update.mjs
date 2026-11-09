#!/usr/bin/env node
// Developer script, never part of the game: rebuild ratings.json at the game root from the world rankings and recent results.
// node tools/ratings/update.mjs             fetch, check, write
// node tools/ratings/update.mjs --dry-run   fetch, check, print, write nothing
// The feed is unofficial and no permission to use it has been seen: see the README before turning anything on. Players' devices never
// touch it; they read the ratings.json this writes, from the game's own site. Nothing is written unless every sanity check passes.
// A nation's score is its ranking points plus its form: how far its last ten results beat what the rankings expected, out of 3 either way.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = 'https://api.wr-rims-prod.pulselive.com/rugby/v3';
const USER_AGENT = 'ratings-update/1.0';
const GAME_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT = GAME_ROOT + 'ratings.json';
const HOME_EDGE = 3, FORM_MAX = 3, LAST_N = 10;
const WINDOW_DAYS = { mru:495, wru:860 };           // how far back to look for a nation's last ten results: women's sides play less
const MAX_STEPS = 2;                                // ability points a nation may move with no explanation
const MIN_RANKED = 30;                              // the rankings list is far longer than this; a short one is a broken feed
const PTS_MIN = 0, PTS_MAX = 110;                   // ranking points outside this are a broken feed, whatever else it says: the top side has been in the mid nineties
const PTS_PER_MATCH = 6;                            // the most one match can move a nation's points: 2, half as much again for a big margin, doubled at a World Cup
const toGame = code => (code === 'CAN' ? 'CDA' : code);   // Canberra holds CAN in the game
const fromGame = id => (id === 'CDA' ? 'CAN' : id);

export const overallOf = sum => Math.round(40 + (sum - 5)*59/20);
export const sumOfOverall = ov => 5 + Math.round((ov - 40)*20/59);
export function sumOfScore(score) {                 // a score to an ability sum, 5 to 25
  const raw = Math.max(40, Math.min(99, 1.5*score - 44.85));
  return Math.max(5, Math.min(25, Math.round(5 + (raw - 40)*20/59)));
}
/* rankings: a rankings response. matches: match records in any order, repeats allowed; venue may be null. want: game ids. */
export function rateSport(rankings, matches, want) {
  const byId = new Map(rankings.entries.map(e => [e.team.id, e]));
  const history = new Map();
  const seen = new Set();
  for (const m of [...matches].sort((a, b) => a.time.millis - b.time.millis)) {
    if (seen.has(m.matchId) || m.status !== 'C') continue;
    seen.add(m.matchId);
    const t = m.teams, s = m.scores;
    if (!s || !t || t.length < 2 || !byId.has(t[0].id) || !byId.has(t[1].id)) continue;
    const [a, b] = [t[0].id, t[1].id], home = !!m.venue && m.venue.country === t[0].name;
    const expectA = 1/(1 + 10**((byId.get(b).pts - (byId.get(a).pts + (home ? HOME_EDGE : 0)))/10));
    const gotA = s[0] > s[1] ? 1 : s[0] < s[1] ? 0 : 0.5;
    for (const [id, opp, exp, got, f, ag] of [[a, b, expectA, gotA, s[0], s[1]], [b, a, 1 - expectA, 1 - gotA, s[1], s[0]]]) {
      if (!history.has(id)) history.set(id, []);
      history.get(id).push({ date:m.time.label, opp:byId.get(opp).team.abbreviation, f, a:ag, exp, got });
    }
  }
  const byCode = new Map(rankings.entries.map(e => [e.team.abbreviation, e]));
  const out = {};
  for (const id of want) {
    const e = byCode.get(fromGame(id));
    if (!e) continue;
    const last = (history.get(e.team.id) || []).slice(-LAST_N);
    const over = last.length ? last.reduce((sum, h) => sum + h.got - h.exp, 0)/last.length : 0;
    const form = Math.max(-FORM_MAX, Math.min(FORM_MAX, over*10));
    const sum = sumOfScore(e.pts + form);
    out[id] = { overall:overallOf(sum), sum, pts:+e.pts.toFixed(2), form:+form.toFixed(2), pos:e.pos, last };
  }
  return out;
}
/* The last file, or the bundled table if the file holds anything less than a date and a rating for every nation. A truncated commit must
   not leave the next run with nothing to compare against. */
export function previousFile(text, bundled, wantMen, wantWomen) {
  let v = null;
  try { v = JSON.parse(text); } catch (e) { return bundled; }   // no file yet, or not JSON
  const table = (t, want) => !!t && typeof t === 'object' && !Array.isArray(t) && want.every(id => Number.isInteger(t[id]) && t[id] >= 40 && t[id] <= 99);
  const good = !!v && typeof v === 'object' && !Array.isArray(v) && typeof v.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.date) && table(v.men, wantMen) && table(v.women, wantWomen);
  return good ? v : bundled;
}
/* Sanity. Returns { problems, notes }: any problem refuses the write. Ranking points must be in range, and may not move further than the
   matches played since the last update can move them: the feed's own numbers can't vouch for themselves. A move of more than MAX_STEPS stands
   only when the output can explain it: the nation has played since the last update and its score moved far enough to account for all but
   one step of it. */
export function checkRatings(next, prev, wantMen, wantWomen, today) {
  const problems = [], notes = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(next.date) || next.date > today) problems.push(`bad date ${next.date}`);
  if (prev && next.date < prev.date) problems.push(`date ${next.date} is older than the last update, ${prev.date}`);
  for (const [sport, want] of [['men', wantMen], ['women', wantWomen]]) {
    const got = next.detail[sport], missing = want.filter(id => !got[id]);
    if (missing.length) problems.push(`too few ${sport}'s nations: ${missing.join(' ')} missing`);
    for (const id of want) {
      const r = got[id]; if (!r) continue;
      if (!Number.isInteger(r.overall) || r.overall < 40 || r.overall > 99) problems.push(`${sport} ${id}: overall ${r.overall} is out of range`);
      if (!Number.isFinite(r.pts) || r.pts < PTS_MIN || r.pts > PTS_MAX) problems.push(`${sport} ${id}: ranking points ${r.pts} are out of range`);
      const was = prev && prev[sport] && prev[sport][id];
      if (!was) { problems.push(`${sport} ${id}: nothing to compare it with`); continue; }
      const old = prev.workings && prev.workings[sport] && prev.workings[sport][id];
      const played = r.last.filter(h => h.date > prev.date);
      if (old && Math.abs(r.pts - old.pts) > PTS_PER_MATCH*Math.max(1, played.length)) problems.push(`${sport} ${id}: points ${old.pts} to ${r.pts} is more than ${played.length || 'no'} matches can move them`);
      const steps = Math.abs(r.sum - sumOfOverall(was));
      if (steps <= MAX_STEPS) continue;
      const moved = old ? Math.abs(sumOfScore(r.pts + r.form) - sumOfScore(old.pts + old.form)) : 0;
      const line = `${sport} ${id} moved ${steps} steps, ${was} to ${r.overall}: points ${old ? old.pts : '?'} to ${r.pts}, form ${old ? old.form : '?'} to ${r.form}, played since ${prev.date}: ${played.map(h => `${h.opp} ${h.f}-${h.a}`).join(', ') || 'nothing'}`;
      if (old && played.length && moved >= steps - 1) notes.push('EXPLAINED ' + line);
      else problems.push('UNEXPLAINED ' + line);
    }
  }
  return { problems, notes };
}
const latestResult = detail => Object.values(detail).flatMap(sport => Object.values(sport).flatMap(r => r.last.map(h => h.date))).sort().pop();
/* The file the game reads. The game ignores workings; the next run reads them to explain a big move. */
export function buildFile(men, women, date) {
  const pick = (t, f) => Object.fromEntries(Object.entries(t).map(([id, r]) => [id, f(r)]));
  return { date, men:pick(men, r => r.overall), women:pick(women, r => r.overall),
    workings:{ men:pick(men, ({ pts, form, pos }) => ({ pts, form, pos })), women:pick(women, ({ pts, form, pos }) => ({ pts, form, pos })) } };
}
/* The game's bundled table: one line of strict JSON in src/ratings.js. */
export function bundledTable() {
  const m = fs.readFileSync(GAME_ROOT + 'src/ratings.js', 'utf8').match(/^const RATINGS_BUNDLED = (\{.*\});$/m);
  if (!m) throw new Error('src/ratings.js has no RATINGS_BUNDLED line');
  return JSON.parse(m[1]);
}
async function getJson(url) {
  const res = await fetch(url, { headers:{ 'User-Agent':USER_AGENT, Accept:'application/json' }, signal:AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  return res.json();
}
async function fetchSport(sport, today) {
  const rankings = await getJson(`${BASE}/rankings/${sport}?language=en`);
  if (!Array.isArray(rankings.entries) || rankings.entries.length < MIN_RANKED) throw new Error(`too few nations in the ${sport} rankings (${rankings.entries && rankings.entries.length})`);
  const start = new Date(Date.parse(today) - WINDOW_DAYS[sport]*864e5).toISOString().slice(0, 10);
  const matches = [];
  for (let page = 0, pages = 1; page < pages; page++) {
    const d = await getJson(`${BASE}/match?startDate=${start}&endDate=${today}&sort=desc&pageSize=100&page=${page}&sports=${sport}`);
    matches.push(...d.content);
    pages = d.pageInfo.numPages;
    await new Promise(r => setTimeout(r, 200));
  }
  return { rankings, matches };
}
async function main() {
  const dry = process.argv.includes('--dry-run');
  if (process.argv.slice(2).some(a => a !== '--dry-run')) throw new Error('Usage: node tools/ratings/update.mjs [--dry-run]');
  const bundled = bundledTable(), today = new Date().toISOString().slice(0, 10);
  const wantMen = Object.keys(bundled.men), wantWomen = Object.keys(bundled.women);
  const m = await fetchSport('mru', today), w = await fetchSport('wru', today);
  const men = rateSport(m.rankings, m.matches, wantMen), women = rateSport(w.rankings, w.matches, wantWomen);
  const detail = { men, women }, date = latestResult(detail);
  let text = '';
  try { text = fs.readFileSync(OUT, 'utf8'); } catch (e) { /* no file yet: the bundled table */ }
  const prev = previousFile(text, bundled, wantMen, wantWomen);
  const { problems, notes } = checkRatings({ date, detail }, prev, wantMen, wantWomen, today);
  for (const [name, table] of Object.entries(detail)) {
    console.log(`${name}:`);
    for (const id of Object.keys(table).sort((a, b) => table[b].overall - table[a].overall)) {
      const r = table[id], was = prev[name] && prev[name][id];
      console.log(`  ${id}  ${r.overall}${was != null && was !== r.overall ? ` (was ${was})` : ''}  rank ${r.pos}  points ${r.pts}  form ${r.form}`);
    }
  }
  for (const n of notes) console.log(n);
  if (problems.length) { for (const p of problems) console.error('REFUSED: ' + p); console.error('Nothing written.'); process.exitCode = 1; return; }
  if (dry) { console.log(`Dry run: date ${date}, nothing written.`); return; }
  const tmp = OUT + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(buildFile(men, women, date), null, 1) + '\n');
  fs.renameSync(tmp, OUT);
  console.log(`Wrote ratings.json, date ${date}.`);
}
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error('REFUSED: ' + e.message); console.error('Nothing written.'); process.exitCode = 1; });
