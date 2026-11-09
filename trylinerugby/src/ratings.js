/* =========================================================
   Ratings: what each side's overall is, and how it becomes abilities.

   - RATINGS_BUNDLED is the nations' table, from the world rankings and recent results, with its date. tools/ratings/update.mjs
     reads this line as JSON, so it stays one line of strict JSON.
   - CLUB_RATED is the clubs' table, from last season's results in each league's band. Melbourne and Adelaide have no current side and are set by hand.
   - starsOfOverall and TEAM_LEVELS are the star scale and the levels a team you make can be set at.
   - abilitiesFor turns a side's flavour (how it plays: the abilities written in its list) and a target sum into whole abilities.
   - Players' devices only ever ask the game's own site: a same-origin ratings.json, read once at boot (online, or offline through
     the service worker's copy), checked strictly here, and used for picks made afterwards. Saved championships and careers keep the sides they were saved with.
   ========================================================= */
const RATINGS_BUNDLED = {"date":"2026-11-07","men":{"RSA":96,"NZL":93,"IRE":87,"FRA":87,"SCO":84,"ENG":84,"AUS":81,"ARG":78,"ITA":70,"WAL":70,"FIJ":70,"JPN":70,"GEO":67,"POR":61,"USA":58,"ESP":55,"CHI":55,"TGA":55,"URU":55,"SAM":52,"CDA":49,"ROU":46},"women":{"NZL":96,"ENG":96,"CDA":93,"FRA":84,"USA":72,"IRE":72,"AUS":70,"RSA":64,"ITA":64,"SCO":61,"WAL":58,"FIJ":58,"JPN":52,"ESP":49,"SAM":43}};
/* Each league has its own band, so a step between leagues is a step in the rating: Counties 5 is 40, Counties 3 is 43, Counties 1 is 46 to 49, Regional 2 is 49 to 52, Regional 1 is 55 to 58, the English second tier
   61 to 64, a top flight 64 to 72. Overalls come in 21 values (overallOf), so a band can't be finer than about 3 points. CLUB_CAP is the top flights' ceiling: 75, and only their national champions reach it.
   Bordeaux, the European champion, is the one named exception, at 90: five stars, with the top nations. */
const CLUB_CAP = 75, CLUB_OVER_CAP = { BOR:90 };
const CLUB_RATED = {
  FAR:58, WIM:55, IRO:52, GUI:49, COB:49, WEY:49, ORU:46, KIN:43, HAS:43, ALD:43, GDN:40,                                               // Local
  EFF:43, WAN:40, EGH:40, MER:40, MIT:40, FEL:40,                                                                                       // Counties: Counties 3 is 43 and Counties 5 is 40, as in Local
  NTH:75, BAT:72, EXE:72, LEI:72, LON:70, BRS:70, SAL:67, GLO:67, HAR:67, NEW:64,                                                       // England, with Twickenham above, and Northampton the champion
  DUB:75, LIM:72, GAL:70, BEL:70, COR:58, BMA:49,                                                                                       // Ireland, with Dublin the United Rugby Championship's champion
  TLS:75, MPL:72, PAR:72, PAU:72, NAN:72, LRO:70, CLE:70, TLN:70, CAS:70, LYO:67, BAY:67, PGN:67, MTB:64, ...CLUB_OVER_CAP,             // France, with Toulouse the champion
  BRI:70, CAN:70, PTH:70, SYD:67, MEL:61, ADL:61,                                                                                       // Australia
  CPT:72, PRE:72, JHB:70, DUR:70, KIM:61, BLM:61, MBO:61,                                                                               // South Africa
  GLA:72, CDF:70, SWA:70, EDI:67, TRE:67, LLA:67, NPT:67, PMA:64,                                                                       // Wales, Scotland and Italy
  EAL:64, BED:64, COV:64, WOR:64, CHN:64, HPY:64, CWL:64, DON:64, NOT:61, AMP:61, CAL:61, RIC:61, CAM:61,                               // England's second tier: a winning record last season is 64
};
const sumOfOverall = ov => { const n = ABILITIES.length; return n + Math.round((ov - 40)*4*n/59); };   // overallOf, the other way
/* The one star scale, for every side: 40 is 1 star, the minimum; 43 to 46 is 2; 49 to 52 is 2.5; 55 to 58 is 3; 61 to 67 is 3.5; 70 to 72 is 4; 75 to 87 is 4.5; 90 and up is 5, which is rare.
   Whole numbers between those (a career player's rating can be any) take the stars of the value below. */
function starsOfOverall(ov) { return ov >= 90 ? 5 : ov >= 75 ? 4.5 : ov >= 70 ? 4 : ov >= 61 ? 3.5 : ov >= 55 ? 3 : ov >= 49 ? 2.5 : ov >= 43 ? 2 : 1; }
const starsOf = t => starsOfOverall(overallOf(t));
const starsWords = n => n + (n === 1 ? ' Star' : ' Stars');   // the text alternative, and the words on a level
/* A team you make or import is set at a level, which gives it a fixed amount of ability: the one table of level, overall and stars. budget: the points to spend above 1 in each ability.
   The id is what a save holds, so it never changes. A saved team with no level keeps BUDGET, so an old save reads as it did: teamBudget. */
const TEAM_LEVELS = [['c5', 'Counties 5', 40], ['c3', 'Counties 3', 43], ['c1', 'Counties 1', 49], ['r2', 'Regional 2', 52], ['r1', 'Regional 1', 58], ['nat', 'National League', 61], ['top', 'Top Flight', 72], ['champ', 'National Champions', 75], ['euro', 'European Champions', 90]]
  .map(([id, name, overall]) => ({ id, name, overall, stars:starsOfOverall(overall), budget:sumOfOverall(overall) - ABILITIES.length }));
const teamLevelOf = t => (t && TEAM_LEVELS.find(l => l.id === t.level)) || null;
const teamBudget = t => { const l = teamLevelOf(t); return l ? l.budget : BUDGET; };
/* Whole abilities 1 to 5 adding up to sum, from a side's flavour. Short of it, a point goes to where the side is already
   strong; over it, a point comes off where it is weakest. Each ability takes its turn, strongest (or weakest) first, so
   an ability that started ahead of another is never behind it after. Pace and Power count one point up for that order: in play
   they matter most, so two sides with one overall should not differ only in having spent it there. Ties go by ABILITIES order, the
   other way round when taking off, so the same flavour always gives the same side. */
function abilitiesFor(flavour, sum) {
  const keys = ABILITIES.map(([k]) => k), n = keys.length, out = {};
  let left = clamp(Math.round(sum), n, 5*n);
  for (const k of keys) { out[k] = clamp(Math.round(abilityOf(flavour, k)) || 1, 1, 5); left -= out[k]; }
  const add = left > 0, step = add ? 1 : -1;
  const worth = k => out[k] + (k === 'pace' || k === 'power' ? 1 : 0);
  const turn = keys.slice().sort((a, b) => step*(worth(b) - worth(a)) || step*(keys.indexOf(a) - keys.indexOf(b)));
  for (let i = 0; left; i++) { const k = turn[i % n]; if (add ? out[k] < 5 : out[k] > 1) { out[k] += step; left -= step; } }
  return out;
}
const TEAM_FLAVOUR = new Map(ALL_TEAMS.map(t => [t.id, Object.fromEntries(ABILITIES.map(([k]) => [k, t[k]]))]));   // from the lists, before any rating is set, so a new rating starts from how the side plays and not from its last rating
function rateTeam(t, overall) { Object.assign(t, abilitiesFor(TEAM_FLAVOUR.get(t.id), sumOfOverall(overall))); }
function rateNations(men) { for (const t of allNations()) rateTeam(t, men[t.id]); }
for (const t of ALL_TEAMS) if (CLUB_RATED[t.id] != null) rateTeam(t, CLUB_RATED[t.id]);
rateNations(RATINGS_BUNDLED.men);
/* The women's nations: their own team objects, sharing the men's kits and how each side plays, at the women's ratings. In the table's order,
   so level sides keep it. A nation not in the table has no women's side here: too little data, or unranked. */
const WOMEN_NATIONS = Object.keys(RATINGS_BUNDLED.women).map(id => ({ ...allNations().find(t => t.id === id), g:1 }));
function rateWomen(women) { for (const t of WOMEN_NATIONS) rateTeam(t, women[t.id]); }
rateWomen(RATINGS_BUNDLED.women);
const womenSix = () => WOMEN_NATIONS.filter(t => NATIONS.some(n => n.id === t.id));
/* A club's women's side: the same club and rating with women's bodies. No real women's club results have been gathered. No league line: those figures are the men's. */
const WOMEN_CLUBS = new Map();
function womenClub(t) { let w = WOMEN_CLUBS.get(t); if (!w) WOMEN_CLUBS.set(t, w = { ...champSide(t), g:1 }); return w; }
/* A team you made or imported has a key and keeps its own side; a listed side is whichever of the two the pick wants. Null when it has none
   here: a nation with no women's side, or a team of yours that is the other side. */
function sideVersion(t, g) {
  if (!t) return null;
  if (t.key) { const s = teamSide(t); return s === 'mixed' || s === g ? t : null; }
  const base = ALL_TEAMS.find(o => o.id === t.id);
  if (!base) return t;
  if (!g) return base;
  return allNations().includes(base) ? WOMEN_NATIONS.find(o => o.id === t.id) || null : womenClub(base);
}
const nationsRanked = (g = 0) => (g ? WOMEN_NATIONS.slice() : allNations()).sort((a, b) => rateOf(b) - rateOf(a));   // strongest first; a stable sort, so level sides stay in list order
/* The five nations nearest in rating to t, not t, from the men's or the women's list: the nearer first, then the stronger, then list order. */
function nationsNearest(t, g = teamSide(t) === 1 ? 1 : 0) {
  const me = rateOf(t), all = g ? WOMEN_NATIONS : allNations();
  return all.filter(o => o !== t).sort((a, b) => Math.abs(rateOf(a) - me) - Math.abs(rateOf(b) - me) || rateOf(b) - rateOf(a) || all.indexOf(a) - all.indexOf(b)).slice(0, 5);
}

/* ---------- ratings.json ---------- */
let ratingsNow = RATINGS_BUNDLED, ratingsWaiting = null;   // waiting: checked and fetched, not yet used, so no pick under way changes under anyone
const RATINGS_SLACK = 2*864e5;                     // a date this far ahead of the device's clock could be its clock; further is a broken file
function ratingsTable(v, known) {                  // exactly the sides in known, each a whole overall that some ability sum gives
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const ids = Object.keys(v);
  if (ids.length !== known.length) return null;
  const out = {};
  for (const id of known) {
    const ov = Object.prototype.hasOwnProperty.call(v, id) ? v[id] : null;
    if (!Number.isInteger(ov) || ov < 40 || ov > 99 || overallOf(abilitiesFor({}, sumOfOverall(ov))) !== ov) return null;
    out[id] = ov;
  }
  return out;
}
function ratingsClean(v, now = Date.now()) {       // null on anything wrong: the bundled table stands
  if (!v || typeof v !== 'object' || Array.isArray(v) || typeof v.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return null;
  const when = Date.parse(v.date + 'T00:00:00Z');
  if (!Number.isFinite(when) || new Date(when).toISOString().slice(0, 10) !== v.date || when > now + RATINGS_SLACK || v.date < RATINGS_BUNDLED.date) return null;
  const men = ratingsTable(v.men, Object.keys(RATINGS_BUNDLED.men)), women = ratingsTable(v.women, Object.keys(RATINGS_BUNDLED.women));
  return men && women ? { date:v.date, men, women } : null;
}
function ratingsSync() {                           // on the way to a pick, never during one
  if (!ratingsWaiting) return false;
  ratingsNow = ratingsWaiting; ratingsWaiting = null;
  rateNations(ratingsNow.men); rateWomen(ratingsNow.women);
  return true;
}
const RATINGS_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ratingsDate = d => { const [y, m, day] = d.split('-'); return +day + ' ' + RATINGS_MONTHS[+m - 1] + ' ' + y; };
const ratingsLine = () => 'Ratings from World Rankings and Recent Results · Updated ' + ratingsDate(ratingsNow.date);
async function ratingsFetch(get) {                 // resolves true when a good file is waiting; never throws, never retries
  try {
    const res = await get('ratings.json', { cache:'no-cache', credentials:'same-origin' });
    const good = res && res.ok && ratingsClean(await res.json());
    if (!good) return false;
    ratingsWaiting = good;
    return true;
  } catch (e) { return false; }
}
/* At boot, on the web: the file sits beside the page, so a relative address is the game's own site and nothing else. Node has no
   location, so the test harness never gets here; a page opened from a file or a native wrapper's own scheme doesn't either. Offline it
   asks only when a service worker controls the page, because the worker holds the last good copy; with no worker there is nothing to ask. */
function ratingsBoot() {
  if (typeof location === 'undefined' || !/^https?:$/.test(location.protocol) || typeof fetch !== 'function') return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false && !(navigator.serviceWorker && navigator.serviceWorker.controller)) return false;
  ratingsFetch((u, o) => fetch(u, o));
  return true;
}
