/* =========================================================
   Ratings: what each side's overall is, and how it becomes abilities.

   - RATINGS_BUNDLED is the nations' table, from the world rankings and recent results, with its date. tools/ratings/update.mjs
     reads this line as JSON, so it stays one line of strict JSON. In the merged game it is the shape ratings.json is checked against;
     the nations themselves are rated by main's official World Rugby tables (NATIONS, NAT_WOMEN, natList in data.js).
   - CLUB_RATED is the clubs' table: PR #14's ratings from last season's results (place, scored and conceded), in the real order of the tiers.
   - starsOfOverall and TEAM_LEVELS are the star scale and the levels a team you make can be set at.
   - abilitiesFor turns a side's flavour (how it plays: the abilities written in its list) and a target sum into whole abilities.
   - Players' devices only ever ask the game's own site: a same-origin ratings.json, read once at boot (online, or offline through
     the service worker's copy), checked strictly here, and used for picks made afterwards. Saved championships and careers keep the sides they were saved with.
   ========================================================= */
const RATINGS_BUNDLED = {"date":"2026-11-07","men":{"RSA":96,"NZL":93,"IRE":87,"FRA":87,"SCO":84,"ENG":84,"AUS":81,"ARG":78,"ITA":70,"WAL":70,"FIJ":70,"JPN":70,"GEO":67,"POR":61,"USA":58,"ESP":55,"CHI":55,"TGA":55,"URU":55,"SAM":52,"CDA":49,"ROU":46},"women":{"NZL":96,"ENG":96,"CDA":93,"FRA":84,"USA":72,"IRE":72,"AUS":70,"RSA":64,"ITA":64,"SCO":61,"WAL":58,"FIJ":58,"JPN":52,"ESP":49,"SAM":43}};
const sumOfOverall = ov => { const n = ABILITIES.length; return n + Math.round((ov - 40)*4*n/59); };   // overallOf, the other way
/* The one star scale, for every side: 40 is 1 star, the minimum; 43 to 46 is 2; 49 to 52 is 2.5; 55 to 58 is 3; 61 to 67 is 3.5; 70 to 72 is 4; 75 to 87 is 4.5; 90 and up is 5, which is rare.
   Whole numbers between those (a career player's rating can be any) take the stars of the value below. */
function starsOfOverall(ov) { return ov >= 90 ? 5 : ov >= 75 ? 4.5 : ov >= 70 ? 4 : ov >= 61 ? 3.5 : ov >= 55 ? 3 : ov >= 49 ? 2.5 : ov >= 43 ? 2 : 1; }
const starsOf = t => starsOfOverall(overallOf(t));
const starsWords = n => n + (n === 1 ? ' Star' : ' Stars');   // the text alternative, and the words on a level
/* A team you make or import is set at a level, which gives it a fixed amount of ability: the one table of level, overall and stars. budget: the points to spend above 1 in each ability.
   Each level is the best built-in side of that league on the clubs' ladder (CLUB_RATED), so a level means what a built-in side of it means:
   Counties 5 43 and Counties 3 46 (every side of each), Counties 1 52 (Cobham, Weybridge), Regional 2 55 (Ironsides), Regional 1 61 (Farnham),
   National League 64 (England 2 with a winning record), Top Flight 72 (its best bar the champions) and National Champions 75. PR #14's European Champions (90, its
   Bordeaux) has gone with Bordeaux's 90: no club is above a nation, and a save holding it reads as National Champions (LEVEL_WAS).
   The id is what a save holds, so it never changes. A saved team with no level keeps BUDGET, so an old save reads as it did: teamBudget. */
const TEAM_LEVELS = [['c5', 'Counties 5', 43], ['c3', 'Counties 3', 46], ['c1', 'Counties 1', 52], ['r2', 'Regional 2', 55], ['r1', 'Regional 1', 61], ['nat', 'National League', 64], ['top', 'Top Flight', 72], ['champ', 'National Champions', 75]]
  .map(([id, name, overall]) => ({ id, name, overall, stars:starsOfOverall(overall), budget:sumOfOverall(overall) - ABILITIES.length }));
const LEVEL_WAS = { euro:'champ' };   // a level that has gone, as a save may still hold it
const levelById = id => TEAM_LEVELS.find(l => l.id === id) || TEAM_LEVELS.find(l => l.id === LEVEL_WAS[id]) || null;
const teamLevelOf = t => (t && levelById(t.level)) || null;
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
const TEAM_FLAVOUR = new Map(ALL_TEAMS.map(t => [t.id, Object.fromEntries(ABILITIES.map(([k]) => [k, t[k]]))]));   // from the lists, before any rating is set: how each side plays (a drill's sides, practice.js)
/* The clubs' table, in the real order (the owner, 2026-11-09: "Pro leagues on top, then England 2, then Counties and Local clubs by their
   tables (Farnham about 61 to 64)"), from PR #14's ratings of last season's results (its CLUB_RATED at 05886e6: each side's place, scored
   and conceded, the figures on its list). Every nation is above every club (78 and up), and no club tops a team you can make (75).
   - Top flights (England, France, Celtic and Italy, South Africa, Australia): 67 to 75, PR #14's own figure, its 64 and 61 held up to 67
     (Newcastle, Montauban, Parma, the Currie Cup's three, Melbourne and Adelaide) so every top-flight side is above England 2. Only a
     national champion is 75: Northampton, Toulouse, Dublin. Bordeaux is rated by its table (8th, 70), not PR #14's European champion at 90.
     New Zealand and Japan (no figures) keep the abilities written in their lists, 67 to 75. Dunedin, 9th in Super Rugby Pacific under
     Sydney's 8th, is held to Sydney's 67 so the one table reads in order across the two lists.
   - England 2: 61 to 64, PR #14's own figures, 64 with a winning record and 61 without.
   - Scotland's Premiership (an amateur league, no figures, in its table's order): 61 for the top five and 58 for the rest, a step under
     the 64 and 61 written in its list, so no Scottish side is above an England 2 side.
   - Local and Counties: PR #14's ladder a step up, so Farnham (Regional 1, 7th) is 61 and nothing local is above England 2: Regional 1
     61 to 58, Regional 2 55 to 52, Counties 1 52 to 49, Counties 3 46, Counties 5 43. Quins (no figures) stays level with Farnham, as main had it.
   A rating is a whole overall; abilitiesFor turns it into abilities from the side's flavour. Sides not here keep the abilities written in their
   list: the nations (natList), New Zealand and Japan. TEAM_LEVELS is on the same ladder. */
const CLUB_RATED = {
  NTH:75, BTH:72, EXE:72, LEI:72, LNO:70, BRS:70, SAL:67, GLO:67, LWE:67, NCL:67,                                                  // England: the Premiership, Northampton the champion
  TLS:75, MPL:72, PAR:72, PAU:72, NAN:72, LRO:70, CLE:70, BOR:70, TLN:70, CAS:70, LYO:67, BAY:67, PGN:67, MTB:67,                    // France: the Top 14, Toulouse the champion
  DUB:75, GLA:72, LIM:72, CDF:70, GAL:70, BEL:70, SWA:70, EDI:67, TRE:67, LLA:67, NPT:67, PRM:67,                                    // Celtic and Italy: the URC, Dublin the champion
  CPT:72, PRE:72, JHB:70, DUR:70, KIM:67, BLM:67, MBO:67,                                                                            // South Africa: the URC's four, then the Currie Cup's
  BRI:70, CAN:70, PTH:70, SYD:67, MEL:67, ADL:67,                                                                                    // Australia: Super Rugby Pacific, then the two with no side now
  DUN:67,                                                                                                                            // New Zealand: Dunedin, under Sydney
  EAL:64, BED:64, COV:64, WOR:64, CHN:64, HPY:64, CWL:64, DON:64, NOT:61, AMP:61, CAL:61, RIC:61, CAM:61,                            // England 2: a winning record 64
  AYR:61, CUR:61, GOL:61, MYR:61, KEL:61, GIF:58, HAW:58, MLR:58, ANN:58, SEL:58,                                                    // Scotland: the Premiership's top five 61
  FAR:61, QUI:61, WIM:58, IRO:55, GUI:52, COB:52, WEY:52, ORU:49, KIN:46, HAS:46, ALD:46, GDN:43,                                    // Local: Regional 1 down to Counties 5
  EFF:46, WAN:43, EGH:43, MER:43, MIT:43, FEL:43,                                                                                    // Counties: Counties 3 46, Counties 5 43
};
// CLUB_TUNE
for (const t of ALL_TEAMS) if (CLUB_RATED[t.id] != null) Object.assign(t, abilitiesFor(TEAM_FLAVOUR.get(t.id), sumOfOverall(CLUB_RATED[t.id])));

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
  ratingsNow = ratingsWaiting; ratingsWaiting = null;   // held, not yet applied: the nations here are main's official tables (natList, data.js), and a fetched table reaches them once the teams builder wires it (README, integration list)
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
