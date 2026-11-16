/* =========================================================
   Real results: each built-in side's latest first team result, this season's league place, and a short Form boost while it is fresh.
   The owner, 15 Nov 2026: "My club should show the most recent first team result for the club / league status. Key results from the
   week should be shared to provide a temporary performance boost". The rules, all of them here:
   - results.json, at the game's root beside ratings.json, written each week by a job (tools/results/update.mjs; its contract is
     docs/results-schema.md, version 1). The game ships with no results of its own: with no file every screen and every match is
     exactly as before, and the tools (node has no location, so it never fetches) see today's game.
   - Read once at boot, as ratings.json is (src/ratings.js): on the web from the game's own site, same origin, offline through the
     service worker's own copy; in the app from the game's own site too (RESULTS_SITE), the last good copy kept on the device. Checked
     strictly (resultsClean): a file shaped wrong is refused whole and the last good one stands; an entry that is wrong is dropped alone.
   - A file that arrives is held until nothing is being picked or played (resultsSync): the home redraws if it is showing, and
     otherwise it is used from the next goHome or openTeams, so a card never changes under a finger and a match never changes in play.
   - The boost: +1, +1.5 or -1 ability points, from the entry's from to its until, inclusive UK dates (Europe/London: realToday), and never
     after until, even offline. It lives on a copy of the side made at kick-off (realSide, from startMatch: Quick Match, 2 Players, the
     Championship, the cups and the career), so a saved championship's next match plays this week's Form and nothing saved is ever
     edited. The demo, AI v AI, simulate, the drills and the Skill Games never go through startMatch and never have it.
   - Who has one: a built-in club's own side on Men, and a nation in its own category (men or women). Never a club's Women or Minis
     side, a Minis nation, a team you made, a My League side or a Legend, and nobody at the Kids level (the result line still shows).
   - The card's overall, its stars, its star traits and Stronger Side read the side as it is (realBase): they never move week to week.
   RESULTS='{"on":false}' (tools/harness.mjs) is the game without any of it; RESULTS='{"table":{...},"now":"2026-11-17"}' loads a table
   and a fixed UK date for the tools, as T.real.set(table, now) does.
   ========================================================= */
const RESULTS = { on:true, days:30 };   // days: how long after the match the result line stays on My Team's box (then the box is as it was until the next)
// RESULTS_TUNE
const RESULTS_SITE = 'https://gordonlindsay.github.io/games/trylinerugby/';   // the game's own site: where the app asks for the file (the web asks the page's own folder)
const RESULTS_KEPT = 'tryline.results';            // the app's last good file (it has no service worker); never part of the save
const RESULTS_SLACK = 2*864e5;                     // generated this far ahead of the device's clock could be its clock; further is a broken file
const RESULTS_MAX = 1000;                          // entries a table may hold: about 500 are written
let realNow = null, realWaiting = null;            // the table in use, and one checked and fetched but held until nothing is being picked or played

/* ---------- dates: UK dates as YYYY-MM-DD ---------- */
const realIso = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + 'T12:00:00Z').toISOString().slice(0, 10) === s;   // a real date, never 2026-02-30
const realAdd = (s, n) => new Date(Date.parse(s + 'T12:00:00Z') + n*864e5).toISOString().slice(0, 10);
/* The date in the UK at a moment: British Summer Time (an hour ahead) from 01:00 UTC on the last Sunday of March to 01:00 UTC on the last
   Sunday of October, Greenwich Mean Time otherwise. By the rule, not Intl, so every device and the tools agree. */
function londonDate(ms) {
  const y = new Date(ms).getUTCFullYear(), change = m => { const last = new Date(Date.UTC(y, m + 1, 0)); return Date.UTC(y, m, last.getUTCDate() - last.getUTCDay(), 1); };
  return new Date(ms + (ms >= change(2) && ms < change(9) ? 36e5 : 0)).toISOString().slice(0, 10);
}
const realClock = () => { const n = RESULTS.now; return typeof n === 'string' && n ? Date.parse(realIso(n) ? n + 'T12:00:00Z' : n) : Date.now(); };   // the tools' fixed clock, or the device's
const realToday = () => londonDate(realClock());
const REAL_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], REAL_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const realDay = s => { const d = new Date(s + 'T12:00:00Z'); return REAL_DAY[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + REAL_MON[d.getUTCMonth()]; };   // Sat 14 Nov

/* ---------- results.json: checked strictly ---------- */
const realClubIds = () => new Set(ALL_TEAMS.filter(t => !NATIONS.some(n => n.id === t.id) && !t.legend).map(t => t.id));
const realIds = { clubs:null, men:null, women:null };
const realKnown = kind => (realIds[kind] ||= kind === 'clubs' ? realClubIds() : new Set(natList(kind).map(t => t.id)));
const realWhole = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const realText = (v, most) => typeof v === 'string' && v.length >= 1 && v.length <= most && v.trim() === v && !/[<>\u0000-\u001f\u007f]/.test(v);   // plain text, shown only through esc()
const REAL_WHY = { win:['W', 1], big:['W', 1.5], higher:['W', 1.5], loss:['L', -1], draw:['D', 0], none:[null, 0] };   // the owner, 15 Nov 2026: +2 softened to +1.5
/* One entry, or null to drop it: every rule docs/results-schema.md gives the job, so a file the job would write passes and nothing else does. */
function resultsEntry(e, kind, day) {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return null;
  const club = kind === 'clubs', has = k => Object.prototype.hasOwnProperty.call(e, k);
  if (!realIso(e.date) || e.date > day || !['h', 'a', 'n'].includes(e.ha) || (club && e.ha === 'n')) return null;
  if (!realWhole(e.f, 0, 200) || !realWhole(e.a, 0, 200) || !['W', 'D', 'L'].includes(e.res)) return null;
  const wo = has('wo') ? e.wo === true : false;
  if (has('wo') && !wo) return null;
  if (!wo && e.res !== (e.f > e.a ? 'W' : e.f < e.a ? 'L' : 'D')) return null;
  if (!(e.opp === null || (typeof e.opp === 'string' && realKnown(club ? 'clubs' : kind).has(e.opp))) || !realText(e.oppName, 40) || !realText(e.comp, 60)) return null;
  const out = { date:e.date, ha:e.ha, res:e.res, f:e.f, a:e.a, opp:e.opp, oppName:e.oppName, comp:e.comp };
  if (wo) out.wo = true;
  const table = ['pos', 'of', 'p', 'w', 'd', 'l', 'pts', 'prePos', 'oppPos', 'rank', 'oppRank'];
  if (!club && ['league', ...table.slice(0, 9)].some(has)) return null;   // a nation has no league table
  if (club && ['rank', 'oppRank'].some(has)) return null;
  if (has('league') || has('pos') || has('of')) {
    if (!realText(e.league, 60) || !realWhole(e.of, 1, 24) || !realWhole(e.pos, 1, e.of)) return null;
    Object.assign(out, { league:e.league, pos:e.pos, of:e.of });
  }
  const line = ['p', 'w', 'd', 'l', 'pts'];
  if (line.some(has)) {
    if (!out.league || !line.slice(0, 4).every(k => realWhole(e[k], 0, 60)) || !realWhole(e.pts, -50, 200) || e.w + e.d + e.l !== e.p) return null;
    for (const k of line) out[k] = e[k];
  }
  for (const [x, y, hi] of [['prePos', 'oppPos', 24], ['rank', 'oppRank', 120]]) {
    if (!has(x) && !has(y)) continue;
    if (!realWhole(e[x], 1, hi) || !realWhole(e[y], 1, hi) || e[x] === e[y]) return null;   // two sides never share a place or a ranking
    out[x] = e[x]; out[y] = e[y];
  }
  const why = typeof e.why === 'string' && Object.prototype.hasOwnProperty.call(REAL_WHY, e.why) ? REAL_WHY[e.why] : null;
  if (!why || e.boost !== why[1]) return null;   // the boost the reason gives, and nothing else
  if (why[0] && (wo || e.res !== why[0])) return null;   // win, big and higher a win, loss a loss, draw a draw; none any result (a walkover, or a window with no room)
  if (wo && e.why !== 'none') return null;
  if (e.why === 'big' && e.f - e.a < 15) return null;
  if ((e.why === 'higher' || e.why === 'win') && e.f - e.a >= 15) return null;   // a win by 15 or more is big
  const above = out.oppPos < out.prePos || out.oppRank < out.rank;   // the opponent placed higher before the match (false when either place is unknown)
  if ((e.why === 'higher' && !above) || (e.why === 'win' && above)) return null;   // higher only over a side placed higher, and a win over one is never just a win
  if (!realIso(e.from) || !realIso(e.until) || e.from !== realAdd(e.date, 1) || e.until < e.from || e.until > realAdd(e.date, 7)) return null;   // from the day after the match, at most 7 days, never longer
  if (has('next') && (!realIso(e.next) || e.next <= e.date || (e.why !== 'none' && e.until >= e.next))) return null;   // a window ends before the next fixture (none: no room, and no boost)
  Object.assign(out, { boost:e.boost, from:e.from, until:e.until });
  if (has('next')) out.next = e.next;
  return out;
}
/* The whole file, or null: then the copy held stands. held: the table in use, whose generated a newer file must not be older than. */
function resultsClean(v, now = realClock(), held = realNow) {
  if (!v || typeof v !== 'object' || Array.isArray(v) || v.v !== 1 || typeof v.generated !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(v.generated)) return null;
  const when = Date.parse(v.generated);
  if (!Number.isFinite(when) || new Date(when).toISOString().slice(0, 19) + 'Z' !== v.generated || when > now + RESULTS_SLACK) return null;
  if (held && held.generated && v.generated < held.generated) return null;   // never back to an older week
  const day = londonDate(when), out = { v:1, generated:v.generated };
  if (typeof v.season === 'string' && /^\d{4}-\d{2}$/.test(v.season)) out.season = v.season;
  let n = 0;
  for (const kind of ['clubs', 'men', 'women']) {
    const t = v[kind];
    if (!t || typeof t !== 'object' || Array.isArray(t)) return null;
    out[kind] = {};
    const ids = Object.keys(t);
    if ((n += ids.length) > RESULTS_MAX) return null;
    for (const id of ids) {
      if (!realKnown(kind).has(id)) continue;   // an unknown id, a Legend, a made team: dropped, the rest kept
      const e = resultsEntry(t[id], kind, day);
      if (e) out[kind][id] = e;
    }
  }
  return out;
}

/* ---------- whose, and when ---------- */
const realBuiltIn = t => !!t && !t.custom && !t.legend && !String(t.key || '').startsWith('lg-');   // a list's own side: never one you made, a My League side (whose code a list may share) or a Legend
/* A side's entry for its matches: a built-in club's own side on Men, or a nation in its own category. null for everything else. */
function realEntry(t) {
  if (!RESULTS.on || !realNow || !realBuiltIn(t)) return null;
  const cat = catOf(t);
  if (isNation(t)) return cat === 'minis' ? null : realNow[cat === 'women' ? 'women' : 'men'][t.id] || null;
  return cat === 'men' ? realNow.clubs[t.id] || null : null;
}
/* The club's or the country's news, for My Team's box: its result whatever category the player is on (a Minis player's club played
   too), while it is fresh (RESULTS.days after the match). cat: the category a nation is read in (women for the women's Tests). */
function realNews(t, cat) {
  if (!RESULTS.on || !realNow || !realBuiltIn(t)) return null;
  const e = isNation(t) ? realNow[cat === 'women' ? 'women' : 'men'][t.id] : realNow.clubs[t.id], today = realToday();
  return e && today <= realAdd(e.date, RESULTS.days) ? e : null;
}
const realOpen = (e, today = realToday()) => !!e && !!e.boost && e.from <= today && today <= e.until;
/* The week's Form for a side: its boost while the window is open, else 0. Nobody has one at the Kids level. */
function realDelta(t) {
  const e = realEntry(t);
  return realOpen(e) && !(typeof kidsLevel === 'function' && kidsLevel()) ? e.boost : 0;
}
/* The side as this week's match plays it: a copy with the boost's points added where it is strongest, or taken where it is weakest
   (abilitiesFor, src/ratings.js: no random draw, each ability 1 to 5), with the side as it is kept on the copy (realBase) for the star
   traits and Stronger Side. No boost: the side itself, so a match with none is exactly as before.
   +1.5 (the owner, 15 Nov 2026) is a whole point through abilitiesFor and a real half point on the ability abilitiesFor would give the next
   whole point to (the strongest still below 5): abilitiesFor rounded its sum then, so +1.5 handed to it whole would have played as +2
   (since 1.9.3 it puts a part sum the same way, for Counties 5's 41 and 42, and a Counties 5 side's own part point carries through
   rateOf into the sum here, so its Form moves it by exactly the boost, 42 plus 1 a sum of 6.75). The engine
   reads abilities as given (abilityOf, the match's M.nat; a career player's are fractional already), so the half plays as a half, and the
   card shows +1 on one ability and +0.5 on the other. A side at 5 everywhere has nowhere for it, and plays as it is. */
function realSide(t) {
  const d = t && typeof t === 'object' ? realDelta(t) : 0;
  if (!d) return t;
  const base = Object.fromEntries(ABILITIES.map(([k]) => [k, abilityOf(t, k)]));
  const whole = Math.trunc(d), part = d - whole, out = abilitiesFor(base, rateOf(t) + whole);
  if (part) {
    const next = abilitiesFor(base, rateOf(t) + whole + Math.sign(part)), k = ABILITIES.map(([x]) => x).find(x => next[x] !== out[x]);
    if (k) out[k] += part;
  }
  return { ...t, ...out, real:d, realBase:base };
}
const realBase = t => (t && t.realBase ? { ...t, ...t.realBase } : t);
const realForm = d => 'Form ' + (d > 0 ? '+' + d : '−' + -d);   // Form +1.5, Form +1, Form −1 (a minus sign)
const realFormSaid = d => 'Form ' + (d > 0 ? 'plus ' : 'minus ') + Math.abs(d);   // read out
const REAL_WORD = { W:'Won', D:'Drew', L:'Lost' };
const realScore = e => (e.wo ? '(Walkover)' : e.f + '-' + e.a);
/* The opponent by the game's own name where it holds the side (v London West), else as the source names it. */
function realOpp(e) {
  const t = e.opp ? ALL_TEAMS.find(x => x.id === e.opp) || NATIONS.find(x => x.id === e.opp) : null;
  return t ? listName(t) : e.oppName;
}
const realLine = e => REAL_WORD[e.res] + ' ' + realScore(e) + ' v ' + realOpp(e);   // Won 38-34 v Old Alleynians

/* ---------- fetching ---------- */
/* On the way to a pick, never during one: a waiting file is used from here. True when the table changed. */
function resultsSync() {
  if (!realWaiting) return false;
  realNow = realWaiting; realWaiting = null;
  return true;
}
const resultsQuiet = () => typeof document !== 'undefined' && !$('s-home').hidden && (typeof mode === 'undefined' || mode === 'menu') && (typeof M === 'undefined' || !M || M.demo);
function resultsArrived(good) {
  realWaiting = good;
  if (resultsQuiet() && resultsSync() && typeof myHome === 'function') myHome();   // the home on show redraws; anywhere else it waits for goHome or openTeams
}
async function resultsFetch(get, url = 'results.json', keep = null) {   // resolves true when a good file is waiting; never throws, never retries
  try {
    const res = await get(url, { cache:'no-cache', credentials:url === 'results.json' ? 'same-origin' : 'omit' });
    const raw = res && res.ok ? await res.json() : null, good = raw && resultsClean(raw, realClock(), realWaiting || realNow);
    if (!good) return false;
    if (keep) keep(raw);   // the file as it came, so the next start checks it again as a whole
    resultsArrived(good);
    return true;
  } catch (e) { return false; }
}
/* At boot. On the web the file beside the page, so a relative address is the game's own site and nothing else; offline only when a
   service worker controls the page, as it holds the last good copy. In the app (no worker) the game's own site by its address, with
   no cookies, and the last good copy from the device first. Node has no location, so the tools never get here, and a page opened from
   a file never asks. */
function resultsBoot() {
  if (!RESULTS.on || typeof location === 'undefined' || typeof fetch !== 'function') return false;
  if (typeof nativeOn === 'function' && nativeOn()) {
    try { const kept = resultsClean(JSON.parse(localStorage.getItem(RESULTS_KEPT) || 'null')); if (kept) resultsArrived(kept); } catch (e) { /* none kept, or storage refused */ }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
    resultsFetch((u, o) => fetch(u, o), RESULTS_SITE + 'results.json', raw => { try { localStorage.setItem(RESULTS_KEPT, JSON.stringify(raw)); } catch (e) { /* storage full: still used this time */ } });
    return true;
  }
  if (!/^https?:$/.test(location.protocol)) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false && !(navigator.serviceWorker && navigator.serviceWorker.controller)) return false;
  resultsFetch((u, o) => fetch(u, o));
  return true;
}
if (RESULTS.on && RESULTS.table) realNow = resultsClean(RESULTS.table, realClock(), null);   // the tools' table (RESULTS='{"table":...}')
