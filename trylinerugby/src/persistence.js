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
const TUT_IDS = ['past', 'pass', 'tackle', 'block', 'scrum', 'lineout', 'goal', 'drop', 'maul'];   // appended only: a save's list is kept in this order
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
const HOME_HL = ['game', 'champ', 'career', 'drills', 'settings'];   // the home's five headlines, in the bar's order: Quick Match, Championship, Career, Skills Mini Games, Settings (the keys are the saves', kept from Game and Training Drills)
let settings = { half:0, diff:1, sound:true, duels:true, hints:true, twoHints:[true, true], tut:[], coach:true, tips:[], pool:'int', cat:'men', twoDiff:[1, 1], played:0, kids:false, kidsR:0, kidsTop:0, hl:'game', myClub:null, myNat:null, drillSeen:[], camPick:false, finished:0 };   // pool: the team screen's list (TEAM_LISTS); cat: Men | Women | Minis (TEAM_CATS); twoDiff: each player's Difficulty in two player; played: one-player matches started, for the gentler start; finished: one-player matches played to full time, for the Your Ball sign under the clock (ui-match.js); kids: the Kids level, a flag on Easy, and kidsR its hidden rating, 0 to 1 (kids.js); hl: the home's headline last chosen (HOME_HL, ui-menus.js); myClub and myNat: My Team, a club's key and a nation's code, null for the default (myClubTeam, ui-menus.js); drillSeen: the games whose Watch How has played (drill-demo.js); camPick: the camera row has been used (cleanSettings)
let champ = null, custom = [], champHistory = [], seasonSerial = 0;
let career = null;   // the player career (src/career.js): its own seasons, never the championship's
let cup = null, cupTurn = 0;   // Championship mode's cup under way (src/cups.js), and how many Home Nations Tours it has started, for the host in turn; saved only once there is one
let importLeague = null;   // an imported league's other sides, { teams }, cleaned by cleanImportLeague (src/import.js)
let storeBought = [];   // the app's purchases, product ids in the order bought (src/store.js); saved as store:{ owned } only once there is one, so a web save is as it was
const SEASON_LIMIT = 10;
/* The Trophy Cabinet (champHistory) holds completed league seasons, as it always has, and finished cups beside them as
   { kind, id, cup } (src/cups.js). An entry without a kind is a league season: every old one. It keeps the last SEASON_LIMIT of
   each, leagues and cups, in the order they finished. */
const cabinetKind = e => (e && typeof e === 'object' && e.kind != null && e.kind !== 'league' ? e.kind : 'league');
function cabinetTrim(list) {
  const leagues = list.filter(e => cabinetKind(e) === 'league').slice(-SEASON_LIMIT), cups = list.filter(e => cabinetKind(e) !== 'league').slice(-SEASON_LIMIT);
  return list.filter(e => leagues.includes(e) || cups.includes(e));
}
function cabinetClean(raw) {
  if (cabinetKind(raw) !== 'league') return typeof cleanCupEntry === 'function' ? cleanCupEntry(raw) : null;
  const c = cleanChamp(raw);
  return c && c.round === 5 ? c : null;
}
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
  if (teamLevelOf(t)) team.level = teamLevelOf(t).id;            // no level is no field, so an old team reads and saves as it did; a level that has gone saves as the one it reads as (LEVEL_WAS)
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
  const name = String(t.name || '').replace(/\s+/g, ' ').trim().slice(0, 24);
  if (!name) return null;
  const id = /^[A-Z]{3}$/.test(t.id) || /^[LW]\d{2}$/.test(t.id) ? t.id : codeFor(t.id, name);   // a Legends side keeps its code (L87, W91: src/locker.js), and so does one dropped since (W94)
  const team = { id, name, kit:HEX.test(t.kit) ? t.kit : '#2050b0', trim:HEX.test(t.trim) ? t.trim : '#f2efe6', hoops:!!t.hoops };
  if (t.home) team.home = true;
  if (t.custom) team.custom = true;
  if (t.key) team.key = String(t.key).slice(0, 24);
  if (HEX.test(t.alt)) team.alt = t.alt;
  if (HEX.test(t.altTrim)) team.altTrim = t.altTrim;
  if (t.cat != null && catOf(t) === t.cat) team.cat = t.cat;   // Men | Women | Minis, kept as it was started; a side saved before it has none and is men's
  for (const [k] of ABILITIES) team[k] = clamp(Math.round(abilityOf(t, k) || 1), 1, 5);   // a side saved before Stamina gets 3
  return team;
}
/* null means the championship cannot be shown or played, so it is dropped instead of crashing the table. */
function cleanChamp(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c) || !idx6(c.user)) return null;
  if (!Number.isInteger(c.round) || c.round < 0 || c.round > 5) return null;
  let teams;
  if (!Array.isArray(c.teams)) teams = NATIONS.slice(0, 6).map(n => ({ ...n }));   // saved before clubs existed: indexes into the first six NATIONS, in that order
  else {
    if (c.teams.length !== 6) return null;
    teams = c.teams.map(cleanSide);
    if (teams.some(t => !t)) return null;
  }
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
  if ('pool' in g) settings.pool = poolKey(g.pool);   // an old save's index goes to the list it was (POOL_OLD)
  if (TEAM_CATS.some(c => c.id === g.cat)) settings.cat = g.cat;   // a save from before Men | Women | Minis is Men
  if (Array.isArray(g.twoDiff) && g.twoDiff.length === 2 && g.twoDiff.every(v => v === 0 || v === 1 || v === 2)) settings.twoDiff = [g.twoDiff[0], g.twoDiff[1]];
  if (Number.isInteger(g.played) && g.played >= 0 && g.played <= 99) settings.played = g.played;
  if (Number.isInteger(g.finished) && g.finished >= 0 && g.finished <= 99) settings.finished = g.finished;   // a save from before it has none, so an old player gets the sign for a few matches too: it is new to them
  if (typeof g.kids === 'boolean') settings.kids = g.kids;
  if (typeof g.kidsR === 'number' && Number.isFinite(g.kidsR) && g.kidsR >= 0 && g.kidsR <= 1) settings.kidsR = Math.round(g.kidsR*1000)/1000;   // a save from before the rating has none, and starts at 0
  if (Number.isInteger(g.kidsTop) && g.kidsTop >= 0 && g.kidsTop <= 99) settings.kidsTop = g.kidsTop;   // the run of big wins at the top of Kids (Move Up to Easy)
  if (HOME_HL.includes(g.hl)) settings.hl = g.hl;   // the home's headline last chosen; a save from before it opens on Quick Match
  if (typeof g.myClub === 'string' && /^[A-Za-z0-9-]{1,24}$/.test(g.myClub)) settings.myClub = g.myClub;   // My Team's club, by its key (a built-in club's code, a made or imported team's key, a My League side's); one no longer there reads as the default (myClubTeam)
  if (typeof g.myNat === 'string' && NATIONS.some(n => n.id === g.myNat)) settings.myNat = g.myNat;   // My Team's country; a save from before My Team has neither, and is the Super Fan's club or Farnham, and England
  if (Array.isArray(g.drillSeen)) settings.drillSeen = DRILL_IDS.filter(id => g.drillSeen.includes(id));   // only drills the game knows, each once; a save from before Watch How has none, so each plays once
  if (typeof g.camPick === 'boolean') settings.camPick = g.camPick;
  if (g.cam === 1 || g.cam === 2 || g.cam === 3 || (g.cam === 0 && g.camPick === true)) settings.cam = g.cam;   // a save with no cam starts on the default, Mid (render-behind.js). So does a Top nobody chose: one build wrote cam 0 into every save as its default, so a 0 counts only with camPick, set by the camera row
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
      const c = cabinetClean(raw);
      if (c && !champHistory.some(old => old.id === c.id)) champHistory.push(c);
    }
    champHistory = cabinetTrim(champHistory);
  }
  if ('champ' in s) champ = s.champ == null ? null : cleanChamp(s.champ);
  if ('career' in s) career = s.career == null || typeof cleanCareer !== 'function' ? null : cleanCareer(s.career);
  if ('importLeague' in s) { const moved = new Map(); importLeague = s.importLeague == null ? null : cleanImportLeague(s.importLeague, moved); if (typeof importRecode === 'function') importRecode(moved); }   // after the career and the championship: a recoded league side is followed into both, and by My Team
  if ('store' in s) storeBought = typeof cleanStore === 'function' ? cleanStore(s.store) : [];
  if ('locker' in s) locker = typeof cleanLocker === 'function' ? cleanLocker(s.locker) : locker;   // medals, the ball and boots picked (src/locker.js); a save from before it has none
  if ('cup' in s) cup = s.cup == null || typeof cleanCup !== 'function' ? null : cleanCup(s.cup);   // a save from before the cups has none
  if ('cupTurn' in s) cupTurn = Number.isInteger(s.cupTurn) && s.cupTurn >= 0 && s.cupTurn <= 9999 ? s.cupTurn : 0;
  if (settings.myClub && typeof myClubFind === 'function' && !myClubFind(settings.myClub)) settings.myClub = null;   // a My Team since deleted, or its league removed: the default again
  retainCompletedSeason(champ);
  if (typeof cupRetain === 'function') cupRetain(cup);
  if (!hadPlayed && (settings.tut.length > 0 || champ)) settings.played = EARLY.games;   // a save from before the gentler start has already been played
}
function load() {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) restore(JSON.parse(raw));
  } catch (e) { /* missing, blocked, or not JSON: keep a fresh game */ }
  settings.duels = true;
}
/* The write itself, with the settings to keep: save()'s own, or a drill's snapshot (drill-demo.js: Watch How seen, written while save() stands down). */
function saveWith(s) {
  if (typeof nativeMirror === 'function') nativeMirror();   // the Try Line app copies this save into Preferences once it is written (native.js)
  try { localStorage.setItem(STORE, JSON.stringify({ settings:s, champ, custom, champHistory, seasonSerial, career, importLeague, cup:cup || undefined, cupTurn:cupTurn || undefined, store:storeBought.length ? { owned:storeBought } : undefined, locker:typeof lockerSaved === 'function' ? lockerSaved() : undefined })); } catch (e) { /* private mode, or full */ }
}
function save() {
  if (practice) return; // practice never writes settings, tutorial progress or a championship
  settings.duels = true;
  retainCompletedSeason(champ);
  if (typeof cupRetain === 'function') cupRetain(cup);
  saveWith(settings);
}
const tutSeen = id => settings.tut.includes(id);           // has this device had the moment's tutorial (or its first time with Hints off)?
function tutMark(id) { if (!tutSeen(id)) { settings.tut.push(id); save(); } }
function tutReset() { settings.tut = []; save(); }
const tipSeen = id => settings.tips.includes(id);          // has this device already heard this coach line?
function coachMark(id) { if (!tipSeen(id)) { settings.tips.push(id); save(); } }

