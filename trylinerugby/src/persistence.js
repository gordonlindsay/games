/* =========================================================
   Persistence. One browser key holds the settings, the teams
   you make, and the championship: its six sides, the fixtures,
   the results and the round. A match in progress is not stored.
   Leaving it, or reloading, comes back to that round to play
   again. Duels are always on, including a save from when the
   switch could turn them off. Anything missing or broken is
   ignored, and the rest of the save is kept.
   ========================================================= */
const STORE = 'tryline.v1';
/* hints: the card in the top corner naming each close-up's control (one player); twoHints: the same per player in two player, stored
   by keyboard half like twoDiff. tut: the tutorial moments this device has seen (TUT_IDS), each shown once; Replay Tutorial empties it.
   It replaces the old duelSeen and kickSeen flags: the first-duel window aid and the first-kick path aid key off it too.
   coach: Coach Tips on the home row, on for a new game. tips: the coach lines this device has already heard (COACH_IDS), each once. */
const TUT_IDS = ['past', 'pass', 'tackle', 'block', 'scrum', 'lineout', 'goal', 'drop'];
const DRILL_IDS = ['egg', 'circle', 'cones', 'tackle', 'kick', 'scrum', 'defend', 'pass', 'tag', 'back'];   // drillSeen: the drills whose Watch How has played on this device, each opened with it once (drill-demo.js)
const COACH_IDS = ['offload', 'step', 'tackle', 'duel', 'kick', 'pass', 'sprint'];   // fleeting moments first, then the ones that stay available
const COACH_LINE = {
  offload: 'Tap Pass \u2014 offload!',
  step: 'Flick across \u2014 side step',
  tackle: 'Tap Tackle \u2014 they\u2019re in reach',
  duel: 'Wait for gold, then go',
  kick: 'Hold it, let go in the gold',
  pass: 'Tap Pass to move it',
  sprint: 'Hold Sprint for a burst',
};
let settings = { half:0, diff:1, sound:true, duels:true, hints:true, twoHints:[true, true], tut:[], coach:true, tips:[], pool:0, twoDiff:[1, 1], played:0, kids:false, drillSeen:[], camPick:false, poolV:3, myTeam:DEFAULT_TEAM.id, womens:0, finished:0 };   // finished: one-player matches played to full time, for the Your Ball sign under the clock (ui-match.js); twoDiff: each player's Difficulty in two player; played: one-player matches started, for the gentler start; kids: the Kids level, a flag on Easy (kids.js); camPick: the camera button has been used (cleanSettings); poolV: what pool's numbers mean (cleanSettings); myTeam: Your Team on the home screen, the key of a side, read through myTeamOf; womens: 1 when the team screen is on Women's
let champ = null, custom = [], champHistory = [], seasonSerial = 0;
let career = null;   // the player career (src/career.js): its own seasons, never the championship's
let importLeague = null;   // an imported league's other sides, { teams }, cleaned by cleanImportLeague (src/import.js)
const SEASON_LIMIT = 10;
/* Only the user's full-time card is retained. Optional broken detail never invalidates a result. */
function cleanSeasonStats(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return null;
  const out = {};
  for (const key of ['conv', 'pen', 'dg', 'tk', 'duelN']) {
    const v = s[key], made = key === 'duelN' ? 'won' : 'made';
    if (!v || !Number.isInteger(v.att) || v.att < 0 || v.att > 100000 || !Number.isInteger(v[made]) || v[made] < 0 || v[made] > v.att) return null;
    out[key] = { att:v.att, [made]:v[made] };
  }
  if (typeof s.gain !== 'number' || !Number.isFinite(s.gain) || Math.abs(s.gain) > 1000000) return null;
  out.gain = Math.round(s.gain);
  return out;
}
/* The legacy fingerprint uses only validated season data, never the simulation RNG. */
function legacySeasonId(c) {
  const text = JSON.stringify([c.user, c.teams, c.fixtures, c.results.map(rd => rd.map(({h,a,hs,as,ht,at}) => ({h,a,hs,as,ht,at})))]);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return 'legacy-' + (h >>> 0).toString(36);
}
const HEX = /^#[0-9a-f]{6}$/i;
/* A team someone made, or one read back from storage: anything off is put right, never trusted. */
function cleanTeam(t, i) {
  if (!t || typeof t !== 'object') return null;
  const name = String(t.name || '').replace(/\s+/g, ' ').trim().slice(0, 16) || 'My Team';
  const team = { key:String(t.key || 'my' + i).slice(0, 24), id:codeFor(t.id, name), name, custom:true,
    kit:HEX.test(t.kit) ? t.kit : '#2050b0', trim:HEX.test(t.trim) ? t.trim : '#f2efe6', hoops:!!t.hoops };
  // spent in ABILITIES order, so an overspent team loses from the last; a team without Stamina (saved before it, or an import) has its 3
  // set aside first, so a cut falls on the other four. A team saved before Stamina spent at most 10, so nothing of it is cut.
  // The budget is the team's own level's; a team with no level (saved before levels) keeps BUDGET, and is cut as it always was.
  const keys = ABILITIES.map(([k]) => k), hasStamina = !keys.includes('stamina') || (typeof t.stamina === 'number' && Number.isFinite(t.stamina));
  const got = {};
  let left = teamBudget(t);
  for (const k of hasStamina ? keys : ['stamina', ...keys.filter(x => x !== 'stamina')]) { const v = clamp(Math.round(abilityOf(t, k) || 1), 1, 5); const spend = Math.min(v - 1, left); got[k] = 1 + spend; left -= spend; }
  for (const k of keys) team[k] = got[k];
  if (teamSide(t)) team.g = teamSide(t);                     // men's is no field at all
  if (teamLevelOf(t)) team.level = t.level;                      // no level is no field, so an old team reads and saves as it did
  return team;
}
/* The short name filled in for you skips codes already on the scoreboard elsewhere: Farnham Minis is FAN, not FAR. */
function autoCode(name, own) {
  const L = String(name || '').toUpperCase().replace(/[^A-Z]/g, '') || 'MYTEAM';
  const used = new Set([...ALL_TEAMS, ...custom.filter(t => t.key !== own)].map(t => t.id));
  for (let j = 1; j < L.length; j++) for (let k = j + 1; k < L.length; k++) { const c = L[0] + L[j] + L[k]; if (!used.has(c)) return c; }
  return codeFor('', L);
}
function codeFor(s, name) { const l = v => String(v || '').toUpperCase().replace(/[^A-Z]/g, ''); return (l(s) + l(name) + 'XXX').slice(0, 3); }
function idx6(n) { return Number.isInteger(n) && n >= 0 && n <= 5; }
const PTS_MAX = 999;   // far past any real score: a level 90 side on Easy with long halves has passed 260, and a real result must never cost a saved season
function ptsOf(n) {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > PTS_MAX) return null;
  return Math.round(n);
}
/* A side inside a saved championship. A built-in side keeps its home-nation flag and its change kit. */
function cleanSide(t) {
  if (!t || typeof t !== 'object') return null;
  let name = String(t.name || '').replace(/\s+/g, ' ').trim().slice(0, 24);
  if (!name) return null;
  const id = /^[A-Z]{3}$/.test(t.id) ? t.id : codeFor(t.id, name);
  if (id === 'HAR' && !t.key && !t.custom) name = CLUBS[5].name;   // a save from before this side went by its place; a team you made or imported keeps the name you gave it
  const team = { id, name, kit:HEX.test(t.kit) ? t.kit : '#2050b0', trim:HEX.test(t.trim) ? t.trim : '#f2efe6', hoops:!!t.hoops };
  if (t.home) team.home = true;
  if (t.custom) team.custom = true;
  if (t.key) team.key = String(t.key).slice(0, 24);
  if (HEX.test(t.alt)) team.alt = t.alt;
  if (HEX.test(t.altTrim)) team.altTrim = t.altTrim;
  if (teamSide(t)) team.g = teamSide(t);                     // men's is no field, so an old season's fingerprint (legacySeasonId) stays as it was
  for (const [k] of ABILITIES) team[k] = clamp(Math.round(abilityOf(t, k) || 1), 1, 5);   // a side saved before Stamina gets 3
  return team;
}
/* null means the championship cannot be shown or played, so it is dropped instead of crashing the table. */
function cleanChamp(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c) || !idx6(c.user)) return null;
  if (!Number.isInteger(c.round) || c.round < 0 || c.round > 5) return null;
  let teams;
  if (!Array.isArray(c.teams)) teams = NATIONS.map(n => ({ ...n }));   // saved before clubs existed: indexes into NATIONS, in that order
  else {
    if (c.teams.length !== 6) return null;
    teams = c.teams.map(cleanSide);
    if (teams.some(t => !t)) return null;
  }
  if (teams.some(t => !sidesMeet(teams[c.user], t))) return null;   // your side could never play this one: no normal play makes it, only a damaged save
  if (!Array.isArray(c.fixtures) || c.fixtures.length !== 5 || !Array.isArray(c.results) || c.results.length !== c.round) return null;
  const fixtures = [], results = [];
  for (const rd of c.fixtures) {
    if (!Array.isArray(rd) || rd.length !== 3) return null;
    const seen = new Set(), pairs = [];
    for (const p of rd) {
      if (!Array.isArray(p) || p.length !== 2 || !idx6(p[0]) || !idx6(p[1]) || p[0] === p[1] || seen.has(p[0]) || seen.has(p[1])) return null;
      seen.add(p[0]); seen.add(p[1]);
      pairs.push([p[0], p[1]]);
    }
    if (seen.size !== 6) return null;
    fixtures.push(pairs);
  }
  for (const rd of c.results) {
    if (!Array.isArray(rd) || rd.length !== 3) return null;
    const seen = new Set(), out = [];
    for (const m of rd) {
      if (!m || typeof m !== 'object' || !idx6(m.h) || !idx6(m.a) || m.h === m.a || seen.has(m.h) || seen.has(m.a)) return null;
      const hs = ptsOf(m.hs), as = ptsOf(m.as), ht = ptsOf(m.ht), at = ptsOf(m.at);
      if (hs == null || as == null || ht == null || at == null) return null;
      seen.add(m.h); seen.add(m.a);
      const result = { h:m.h, a:m.a, hs, as, ht, at };
      const detail = cleanSeasonStats(m.stats);
      if ((m.h === c.user || m.a === c.user) && detail) result.stats = detail;
      out.push(result);
    }
    if (seen.size !== 6) return null;
    results.push(out);
  }
  const out = { user:c.user, teams, round:c.round, fixtures, results };
  out.id = typeof c.id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(c.id) ? c.id : legacySeasonId(out);
  return out;
}
function cleanSettings(g) {
  if (!g || typeof g !== 'object' || Array.isArray(g)) return;
  if (g.half === 0 || g.half === 1 || g.half === 2) settings.half = g.half;
  if (g.diff === 0 || g.diff === 1 || g.diff === 2) settings.diff = g.diff;
  if (typeof g.sound === 'boolean') settings.sound = g.sound;
  if (typeof g.hints === 'boolean') settings.hints = g.hints;
  if (Array.isArray(g.twoHints) && g.twoHints.length === 2 && g.twoHints.every(v => typeof v === 'boolean')) settings.twoHints = [g.twoHints[0], g.twoHints[1]];
  if (Array.isArray(g.tut)) settings.tut = TUT_IDS.filter(id => g.tut.includes(id));   // only moments the game knows, each once, in the game's order
  if (typeof g.coach === 'boolean') settings.coach = g.coach;
  if (Array.isArray(g.tips)) settings.tips = COACH_IDS.filter(id => g.tips.includes(id));   // coach lines already heard, in the game's order, unknown ones dropped
  /* What a save's pool number means. poolV 3: POOLS now. poolV 2, before Wales, Scotland and Italy and England 2: 7 was My League, and the rest are as they are now. No poolV, before England and Ireland: 5 was My League. */
  if ('pool' in g) { const my = POOLS.length, n = g.pool; settings.pool = !Number.isInteger(n) || n < 0 ? 0 : g.poolV === 3 ? (n <= my ? n : 0) : g.poolV === 2 ? (n === 7 ? my : n < 7 ? n : 0) : n === 5 ? my : n < 5 && POOLS[n] ? n : 0; }
  if (typeof g.myTeam === 'string' && /^[A-Za-z0-9-]{1,24}$/.test(g.myTeam)) settings.myTeam = g.myTeam;   // a key that names no side now (a deleted team) reads as the default: myTeamOf
  if (Array.isArray(g.twoDiff) && g.twoDiff.length === 2 && g.twoDiff.every(v => v === 0 || v === 1 || v === 2)) settings.twoDiff = [g.twoDiff[0], g.twoDiff[1]];
  if (Number.isInteger(g.played) && g.played >= 0 && g.played <= 99) settings.played = g.played;
  if (Number.isInteger(g.finished) && g.finished >= 0 && g.finished <= 99) settings.finished = g.finished;   // a save from before it has none, so an old player gets the sign for a few matches too: it is new to them
  if (typeof g.kids === 'boolean') settings.kids = g.kids;
  if (g.womens === 0 || g.womens === 1) settings.womens = g.womens;
  if (Array.isArray(g.drillSeen)) settings.drillSeen = DRILL_IDS.filter(id => g.drillSeen.includes(id));   // only drills the game knows, each once; a save from before Watch How has none, so each plays once
  if (typeof g.camPick === 'boolean') settings.camPick = g.camPick;
  if (g.cam === 1 || g.cam === 2 || g.cam === 3 || (g.cam === 0 && g.camPick === true)) settings.cam = g.cam;   // a save with no cam starts on the default, Mid (render-behind.js). So does a Top nobody chose: one build wrote cam 0 into every save as its default, so a 0 counts only with camPick, set by the camera button
}
function restore(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return;
  const hadPlayed = !!(s.settings && Number.isInteger(s.settings.played) && s.settings.played >= 0 && s.settings.played <= 99);
  cleanSettings(s.settings);
  settings.duels = true;
  if (Array.isArray(s.custom)) custom = s.custom.map(cleanTeam).filter(Boolean).slice(0, MAX_CUSTOM);
  if (Number.isSafeInteger(s.seasonSerial) && s.seasonSerial >= 0) seasonSerial = s.seasonSerial;
  if ('champHistory' in s) {
    champHistory = [];
    if (Array.isArray(s.champHistory)) for (const raw of s.champHistory.slice(-100)) {
      const c = cleanChamp(raw);
      if (c && c.round === 5 && !champHistory.some(old => old.id === c.id)) champHistory.push(c);
    }
    champHistory = champHistory.slice(-SEASON_LIMIT);
  }
  if ('champ' in s) champ = s.champ == null ? null : cleanChamp(s.champ);
  if ('career' in s) career = s.career == null || typeof cleanCareer !== 'function' ? null : cleanCareer(s.career);
  if ('importLeague' in s) importLeague = s.importLeague == null ? null : cleanImportLeague(s.importLeague);
  if (settings.pool === POOLS.length && !importLeague) settings.pool = 0;   // My League, with no league
  retainCompletedSeason(champ);
  if (!hadPlayed && (settings.tut.length > 0 || champ)) settings.played = EARLY.games;   // a save from before the gentler start has already been played
}
function load() {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) restore(JSON.parse(raw));
  } catch (e) { /* missing, blocked, or not JSON: keep a fresh game */ }
  settings.duels = true;
}
function saveWith(s) { try { localStorage.setItem(STORE, JSON.stringify({ settings:s, champ, custom, champHistory, seasonSerial, career, importLeague })); } catch (e) { /* private mode, or full */ } }
function save() {
  if (practice) return; // practice never writes settings, tutorial progress or a championship
  settings.duels = true;
  retainCompletedSeason(champ);
  saveWith(settings);
}
const tutSeen = id => settings.tut.includes(id);           // has this device had the moment's tutorial (or its first time with Hints off)?
function tutMark(id) { if (!tutSeen(id)) { settings.tut.push(id); save(); } }
function tutReset() { settings.tut = []; save(); }
const tipSeen = id => settings.tips.includes(id);          // has this device already heard this coach line?
function coachMark(id) { if (!tipSeen(id)) { settings.tips.push(id); save(); } }

