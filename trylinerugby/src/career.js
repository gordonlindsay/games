/* =========================================================
   Career: one player, club seasons. Any club, a rookie whatever the club; a year at it, then what he has earned, then the
   transfer window.

   The rules, all of them here:
   - A year (career.year, from 1) runs in phases (career.phase, in CAREER_PHASES order), each one skipped unless he has earned it:
     'league'   his club's league: his club and five drawn from its list, a season of the championship's shape (six sides, five
                rounds, three games a round, the championship's points). Only his game is played; the other two are simMatch's.
     'county'   his county's cup, every year he is at a Local club (a Local list: Surrey or Counties): eight sides in the cup its county runs for its
                level, the Surrey Cup down to the Surrey Bowl (src/competitions.js). A professional club has none.
     'cup'      the European Cup, when he has just won a European league (CAREER_EURO: England, France, the United Rugby Championship, South Africa).
     'intl'     the international window, when his overall is at or above CAREER_CALL.bar at the end of the league (or the cup):
                his country's six in its category's twelve (natGroup) as a season, or in a World Cup year (4, 8, 12) the World Cup.
                His country is picked at his first call-up, from the career's Men or Women twelve (natList), and kept.
     'tour'     the Home Nations Tour, in years 2, 6, 10, after the window, for a home-nation player (CAREER_HOME) rated
                CAREER_CALL.tour or more.
     'transfer' two or three offers from clubs near his level (CAREER_MOVE), and Stay; then the next year, at his club's league.
     The cups (the county cup, the European Cup, the World Cup and the tour) are the cups engine's (src/cups.js: cupNew, cupFixture, cupRecord,
     cupWinner, cupLabel, cleanCup, cupTriple), read through careerCups. Without it they are skipped, and a World Cup year is his
     country's six as any other.
   - Any club: a side from a national league, a Local club, or a team you made or imported. The list it was picked from is its
     league (career.league): a built-in club's is always its own list, a made one's the list it was picked on (My League for an
     imported one, Local while no league is saved). Every player starts a rookie (CAREER_START, about 61), whatever the club.
   - Transfers: his overall (61 to 99) maps onto the national clubs' band (58 to 75) linearly and capped (careerTarget); the offers are
     clubs from the national lists, Scotland's included, never his own, within CAREER_MOVE.band of that, the band widened a
     point at a time until there are two. One from each league first where it can be. A made, imported or Local club he started
     at is his to stay at; an offer is always from the national lists. The draw is made as the window opens and saved with it.
   - Trophies (career.trophies, { kind, year, name }): a league or his country's six won ('league'), a county cup ('county', named
     for the cup), the European Cup ('euro'),
     the World Cup ('world'), the Home Nations Tour ('tour') and the Triple Crown ('triple'). The player card counts them by kind.
   - Men or Women, picked with the player (cat): every side of the career is named for it ('Farnham Women'), and its
     international window is that category's own twelve; nothing else changes. It is also his body: Men a male player, Women a
     female one (PR #14's Male | Female is this same control, so a career its build saved as Female, look.g 1 and no cat, loads as
     Women: cleanCareer). His look (cr.look: build, skin, hair colour, hair style) goes on
     his squad entry in his matches, so the behind views and the art draw him with it (careerLook, CAREER_LOOK).
   - Your player has a 1 to 99 rating in each ability (Pace, Power, Handling, Kicking, and Stamina even before the
     teams have it). The overall is the team cards' overallOf on the same 40 to 99 scale.
   - Skills rise from training (one session a round, between matches: a drill's stars give points to its skill,
     CAREER_TRAIN) and a little from what your player does in a match (CAREER_DEEDS, capped a match).
   - In a career match only (M.career, set by careerArm after startMatch), your player wears a star in the kit's trim. The
     star means your player and the ring means who you control now, and only one of each is drawn. The ring starts on
     him at every kick-off and moves with Switch and passes, he takes your side's goal kicks, and his skills shade HIS
     speed, catching, tackling, kicking and stamina from the team's baseline (CAREER_SHADE). Every engine site reads
     the side's own value unless M.career is set, and careerNatOf, careerAbility, careerFade and careerSprintDrain add
     the shade for your player only, so no other match and no other man changes.
   - The career keeps its own seasons and cups in `career` (persistence.js), never in `champ`, champHistory or the cups'
     own save. Championship helpers that take the season as an argument (roundRobin, simMatch, standings, userFixture,
     honours) are reused; the ones that read the global champ (newChamp, recordChampResult, retainCompletedSeason) never are.
   ========================================================= */
const CAREER_PHASES = ['league', 'county', 'cup', 'intl', 'tour', 'transfer'];
/* bar: the overall that earns a call-up (a scripted player is first called up at the end of year 3 or 4: tools/career.mjs);
   tour: the overall for the Home Nations Tour; every4: a World Cup in years 4, 8, 12, the tour in years tourAt + 4n (2, 6, 10). */
const CAREER_CALL = { bar:80, tour:88, every:4, tourAt:2 };
/* from: his overall's range; to: the national clubs' (Scotland's bottom five at 58 to the national champions at 75, the real order), so
   every national club can be offered; band: how near a club's overall must be to the target, widened a point at a time until there are
   two; offers: two or three. */
const CAREER_MOVE = { from:[61, 99], to:[58, 75], band:1, offers:[2, 3] };
const CAREER_EURO = ['eng', 'fra', 'cel', 'rsa'];   // the leagues whose winners play the European Cup (the cups engine's CUPS.euro.lists)
const CAREER_HOME = ['ENG', 'IRE', 'SCO', 'WAL'];   // the home nations: the tour is theirs (CUPS.tour.from), and so is the Triple Crown
const CAREER_CUP_NAME = { county:'County Cup', euro:'European Cup', world:'World Cup', tour:'Home Nations Tour' };   // a county cup's own name is on the cup (cupTitle)   // the cups engine's names (CUPS)
const CAREER_KINDS = ['league', 'county', 'euro', 'world', 'tour', 'triple'];   // a trophy's kind, in the card's order
const CAREER_TROPHIES = 60;                          // the most kept, the latest
const CAREER_POS = { F:[1, 2, 3], B:[4, 5, 6, 7] };   // sevens: forwards wear 1 to 3, backs 4 to 7
/* A new player: about 61 overall, whatever the club. Any skill not listed starts at CAREER_BASE. */
const CAREER_START = { F:{ pace:32, power:44, handling:36, kicking:26, stamina:38 }, B:{ pace:44, power:26, handling:38, kicking:34, stamina:34 } };
const CAREER_BASE = 35;
const CAREER_TRAIN = [1, 3, 5, 8];                   // skill points for 0, 1, 2 and 3 stars
/* Which skill a game trains (Train lists the Skills Mini Games, in their order). A game's own result wins when it names one:
   Pass Around the Circle trains Stamina as the Runner and Handling as the Passer. The contact games (PRACTICE_DRILLS' contact)
   are hidden for the youngest (practiceBarred), so the Kids level and Minis have no game that trains Power: their Power comes
   from match tackles and the dilemmas (Tackle Drills, Gym Session). */
const CAREER_DRILL_SKILL = { tag:'pace', egg:'handling', pass:'handling', circle:'handling', tackle:'power', scrum:'power', back:'handling', cones:'pace', defend:'pace', kick:'kicking' };
const CAREER_DRILL_NAME = { tag:'Tag Chase', egg:'Bouncy Egg', pass:'Create a Gap', circle:'Pass Around the Circle', tackle:'Tackling', scrum:'Driving', back:'Ball Back', cones:'Cones', defend:'Defend a Breakaway', kick:'Kicking' };   // only if a drill has no name of its own
/* A match's deeds by your player: each try a point of Pace and one of Handling, each tackle a point of Power, each goal
   kicked a point of Kicking. At most CAREER_DEED_CAP points a match: training is where most of it comes from. */
const CAREER_DEEDS = { tries:{ pace:1, handling:1 }, goals:{ kicking:1 }, tackles:{ power:1 } };
const CAREER_DEED_CAP = 6;
const CAREER_SHADE = 0.5;                            // how far your player's own rating pulls his abilities from the team's
const CAREER_FADE = 0.02;                            // late in a half: top speed per ability point of stamina above (or below) the team's
const CAREER_SPRINT = 0.08;                          // the sprint meter's drain while he sprints, per ability point of stamina
const CAREER_HISTORY = 40;
let careerLast = null;                               // what the last match or session gave, for the hub: { kind, gains }
/* The cups engine, when the build has it: its functions, or null, and every cup phase is skipped. careerCupsHook is the tests'
   stand-in (an object of the same functions, or false for none), as storeNativeHook is the store's. */
let careerCupsHook = null;
function careerCups() {
  if (careerCupsHook !== null) return careerCupsHook || null;
  if (typeof cupNew !== 'function' || typeof cupFixture !== 'function' || typeof cupRecord !== 'function' || typeof cupWinner !== 'function') return null;
  return { cupNew, cupFixture, cupRecord, cupWinner, cupLabel:typeof cupLabel === 'function' ? cupLabel : null,
    cleanCup:typeof cleanCup === 'function' ? cleanCup : null, cupTriple:typeof cupTriple === 'function' ? cupTriple : null,
    cupFinish:typeof cupFinish === 'function' ? cupFinish : null,   // how far he went: Runners-Up, Semi-Finalists, Series Lost
    /* the cups' own pieces for the career's screens (src/ui-cups.js): the line under the title, the last round's card and the draw.
       A stand-in without them gets the career's plain cup screens: no draw, no line. */
    cupLine:typeof cupLine === 'function' ? cupLine : null, cupLastHtml:typeof cupLastHtml === 'function' ? cupLastHtml : null, cupDrawHtml:typeof cupDrawHtml === 'function' ? cupDrawHtml : null, cupDrawBind:typeof cupDrawBind === 'function' ? cupDrawBind : null };
}
const CAREER_CUP_PHASE = { county:'county', cup:'euro', intl:'world', tour:'tour' };   // the cup each phase can hold: a saved cup of another kind is not his
/* A medal (the Locker). The career's own: his first call-up ('callup'), a transfer ('transfer') and a Triple Crown ('triple', as it is
   banked: the cups engine tells the Locker of one in Championship mode only). A cup he wins ('euro', 'world', 'tour') is the cups
   engine's to tell (cupRecord, in Championship mode and in a career alike), never the career's, so it is never counted twice. */
const careerLocker = id => { if (typeof lockerEvent === 'function') lockerEvent(id); };

/* ---------- skills ---------- */
function careerSkills() {                            // [key, label]: the team abilities, plus Stamina while the teams don't have it yet
  const out = ABILITIES.map(([k, l]) => [k, l]);
  if (!out.some(([k]) => k === 'stamina')) out.push(['stamina', 'Stamina']);
  return out;
}
const careerSkillKeys = () => careerSkills().map(([k]) => k);
const careerAbil = v => 1 + (clamp(v, 1, 99) - 1)*4/98;   // a 1 to 99 rating on the team scale, 1 to 5
function careerOverall(skills) {                     // overallOf's 40 to 99, from the mean rating
  const keys = careerSkillKeys(), mean = keys.reduce((a, k) => a + (+skills[k] || 1), 0)/keys.length;
  return clamp(Math.round(40 + (mean - 1)*59/98), 40, 99);
}
function careerName(v) { return Array.from(String(v == null ? '' : v).normalize('NFC').replace(/[^\p{L}' -]/gu, '').replace(/\s+/g, ' ').trim()).slice(0, 12).join('').trim(); }
/* His look (PR #14's player builder): build, skin, hair colour and hair style, picked on New Player's Your Look and drawn in the behind
   views and the art (src/looks.js, src/render-art.js). Its body (g: 0 male, 1 female) is not a choice of its own: it is the career's
   Men | Women, the one control, so a women's career is always a female player. Every field is there, so a saved look never depends on
   the team's deal; a career saved before it, or a broken look, takes CAREER_LOOK on the career's own body. No height: his is the
   shirt's, as every man's is. Kept on this device only, as the name is (PRIVACY.md). */
const CAREER_LOOK = { g:0, skin:2, hair:1, style:0, b:1 };
const CAREER_BUILDS = [0.92, 1, 1.12];                // Small | Medium | Big: the art's three bodies (slim, medium, stocky), the only builds the picker gives
function careerLook(l, cat) {
  const c = cleanLook(l), b = Number.isFinite(c.b) ? CAREER_BUILDS.reduce((a, v) => (Math.abs(v - c.b) < Math.abs(a - c.b) ? v : a)) : CAREER_LOOK.b;
  return { g:cat === 'women' ? 1 : 0, skin:c.skin ?? CAREER_LOOK.skin, hair:c.hair ?? CAREER_LOOK.hair, style:c.style ?? CAREER_LOOK.style, b };
}

/* ---------- clubs, leagues and nations ---------- */
const careerSide = t => cleanSide(t);
const careerCat = cr => (cr && cr.cat === 'women' ? 'women' : 'men');   // Men | Women: Career has no Minis
const careerNations = cat => natList(cat).filter(t => !t.legend);      // the twelve to be called up for: never a Legends side
const careerNation = (id, cat) => { const l = careerNations(cat); return l.find(t => t.id === id) || l.find(t => t.id === 'ENG'); };   // the category's own side
const careerClubs = () => NATIONAL.flat();           // where an offer comes from: every national league, Scotland's included
const careerClubById = id => careerClubs().find(t => t.id === id) || null;
const careerBuiltIn = t => !!t && !t.custom && !String(t.key || '').startsWith('lg-');   // a list's own club: not one you made, nor a My League side (whose code a later list may share, as England 2's and Counties' did)
const careerListOf = t => (careerBuiltIn(t) ? TEAM_LISTS.find(l => l.tier > 0 && l.teams.some(o => o.id === t.id)) || null : null);   // a built-in club's first list, or null for one you made or imported
/* A built-in club as its list rates it now. A save keeps the abilities its club had when it was saved, and a re-rating (the real order,
   2026-11-09: Farnham 75 to 61) would leave a career's club at the old ones while every league it draws is at the new. So a loaded
   career's club takes its list's abilities (cleanCareer); a team you made or a My League side keeps its own, and a season in progress
   keeps its sides as saved, as a championship does. */
function careerRated(club) {
  const l = careerListOf(club), now = l && l.teams.find(o => o.id === club.id);
  if (now) for (const [k] of ABILITIES) club[k] = clamp(Math.round(abilityOf(now, k) || 1), 1, 5);
  return club;
}
/* The list a club was picked from, as the save keeps it: a built-in club's, the one picked while the club is on it (Guildfordians is on
   Surrey and Counties), else its first; a team you made, on a national league or My League as picked; anything else Local. */
function careerLeagueKey(key, club) {
  const own = careerListOf(club);
  if (own) return TEAM_LISTS.some(l => l.key === key && l.tier > 0 && l.teams.some(o => o.id === club.id)) ? key : own.key;
  return key === IMPORT_POOL || TEAM_LISTS.some(l => l.key === key && l.tier > 0) ? key : 'sur';
}
function careerLeague(cr) {                          // his club's league now: My League only while a league is saved
  const key = careerLeagueKey(cr.league, cr.club);
  return key === IMPORT_POOL && !importLeague ? 'sur' : key;
}
const careerLeagueName = key => (key === IMPORT_POOL ? 'My League' : (TEAM_LISTS.find(l => l.key === key) || { name:'' }).name);
/* Where he plays now: his country in the international window and on tour, his club otherwise. */
const careerWhere = cr => (cr.phase === 'intl' || cr.phase === 'tour' ? 'intl' : 'league');
function careerTeamFor(cr, where) { return catSide(careerTeamBase(cr, where || careerWhere(cr)), careerCat(cr)); }
function careerTeamBase(cr, where) { return careerSide(where === 'intl' ? careerNation(cr.country, careerCat(cr)) : cr.club); }
function careerOpponents(cr, where) { return careerDraw(cr, where || careerWhere(cr)).map(t => catSide(t, careerCat(cr))); }
function careerDraw(cr, where) {                     // five sides; the random draws happen here, never in a save or a render
  if (where === 'intl') {                            // his country's six in its category's twelve (natGroup), by who is in it
    const cat = careerCat(cr), me = careerNation(cr.country, cat);
    return natGroup(me.id, cat).filter(t => t.id !== me.id && !t.legend).map(careerSide);
  }
  const key = careerLeague(cr), mine = cr.club;
  if (key === IMPORT_POOL) return importOthers(mine).map(careerSide);   // My League: its sides, topped up with Local clubs (src/import.js)
  const same = t => t.id === mine.id || t.name === mine.name || (typeof importSame === 'function' && importSame(t.name, mine.name));   // an imported Farnham RFC is Farnham, as the import's own league draw has it
  const list = (TEAM_LISTS.find(l => l.key === key) || TEAM_LISTS.find(l => l.key === 'sur')).teams;
  return shuffle(list.filter(t => !same(t))).slice(0, 5).map(careerSide);
}
/* A season (his club's league, or his country's six): the championship's shape, with the weakest opponent first and the
   strongest last, as newChamp does. */
function careerNewSeason(cr) {
  const where = careerWhere(cr), user = careerTeamFor(cr, where), five = careerOpponents(cr, where);
  const ranked = five.map((t, i) => ({ i:i + 1, r:rateOf(t) })).sort((a, b) => a.r - b.r || a.i - b.i);
  const order = [0, ranked[4].i, ranked[3].i, ranked[2].i, ranked[1].i, ranked[0].i];
  cr.seasons++;
  cr.season = { user:0, teams:[user, ...five], round:0, fixtures:roundRobin(order), results:[], id:'career-' + Date.now().toString(36) + '-' + cr.seasons.toString(36) };   // cleanChamp's shape and order, so a reload is the same season
  cr.trained = false;
  return cr.season;
}
function careerCreate(o) {
  const pos = o && o.pos === 'F' ? 'F' : 'B', nums = CAREER_POS[pos];
  const club = cleanSide(o && o.club);
  if (!club) return null;
  const skills = {};
  for (const k of careerSkillKeys()) skills[k] = CAREER_START[pos][k] || CAREER_BASE;
  const cr = { name:careerName(o.name), pos, num:nums.includes(o.num) ? o.num : nums[0], club, league:careerLeagueKey(o.league, club), cat:careerCat(o),
    look:careerLook(o.look, careerCat(o)),           // his look, on the career's body (Men | Women). In cleanCareer's order
    proMode:o.proMode === true,                      // Pro Mode, your player alone (career-pro.js). Its own line, and in cleanCareer's order
    country:null, skills, year:1, phase:'league', seasons:0, season:null, cup:null, offers:null, trained:false,
    history:[], totals:{ matches:0, tries:0, tackles:0, goals:0 }, trophies:[] };
  cr.life = careerLifeNew();                         // Energy, Morale and Team Spirit (src/career-life.js)
  careerNewSeason(cr);
  return cr;
}
function careerStart(o) {                            // Start Career on the new player screen
  if (practice) return null;
  const cr = careerCreate(o); if (!cr) return null;
  career = cr; careerLast = null;
  save();
  return cr;
}

/* ---------- the next match, and the end of a phase ---------- */
const careerCupUser = cup => (Number.isInteger(cup && cup.user) ? cup.user : 0);   // his side's index in the cup's teams
const careerCupKind = cr => (cr.phase === 'county' ? 'county' : cr.phase === 'cup' ? 'euro' : cr.phase === 'tour' ? 'tour' : 'world');
const careerCountyOn = cr => TEAM_LISTS.some(l => l.key === careerLeague(cr) && l.tier === 2);   // a Local club's year (Surrey or Counties) has its county cup
/* His next match in the phase: { teams, home, away, user, label, ko }, or null when the phase is over (or there is no match: the
   transfer window). ko: a cup's knockout or Test (cupFixture's), which cannot end level; a season's match never is. Reads the season
   or the cup, draws nothing. */
function careerAhead(cr) {
  if (!cr || cr.phase === 'transfer') return null;
  const c = cr.season;
  if (c) { if (c.round >= 5) return null; const { pair } = userFixture(c); return { teams:c.teams, home:pair[0], away:pair[1], user:c.user, label:'Round ' + (c.round + 1) + ' of 5', ko:false }; }
  const K = careerCups(), f = cr.cup && K ? K.cupFixture(cr.cup) : null;
  return f ? { teams:cr.cup.teams, home:f.home, away:f.away, user:careerCupUser(cr.cup), label:f.label || '', ko:!!f.ko } : null;
}
function careerPlace(c) { return standings(c).findIndex(r => r.i === c.user) + 1; }
function careerTriple(c) {                           // a home nation that beat the other three: the cups engine's rule, else the championship's honours
  const K = careerCups();
  if (K && K.cupTriple) return !!K.cupTriple(c);
  return honours(c, standings(c)).some(h => h[0] === 'Triple Crown' && h[1] === c.user);
}
/* What comes next this year, after the phase he is in: the first of the phases after it that he has earned. */
function careerNext(cr) {
  const K = careerCups(), ovr = careerOverall(cr.skills), from = CAREER_PHASES.indexOf(cr.phase);
  const won = cr.phase === 'league' && !!cr.season && cr.season.round >= 5 && careerPlace(cr.season) === 1;
  for (const ph of CAREER_PHASES.slice(from + 1)) {
    if (ph === 'county' && K && careerCountyOn(cr)) return { phase:'county', kind:'county' };
    if (ph === 'cup' && won && K && CAREER_EURO.includes(careerLeague(cr))) return { phase:'cup', kind:'euro' };
    if (ph === 'intl' && ovr >= CAREER_CALL.bar) return { phase:'intl', kind:K && cr.year % CAREER_CALL.every === 0 ? 'world' : 'six', first:!cr.country };
    if (ph === 'tour' && K && cr.year % CAREER_CALL.every === CAREER_CALL.tourAt && CAREER_HOME.includes(cr.country) && ovr >= CAREER_CALL.tour) return { phase:'tour', kind:'tour' };
  }
  return { phase:'transfer' };
}
/* The phase just finished, for the screen between phases: { kind, place, won, triple, ovr, next }, or null while a match is
   still to play (and in the transfer window). kind: 'league', 'intl' (his country's six), 'euro', 'world' or 'tour'. */
function careerOutcome(cr) {
  if (!cr || cr.phase === 'transfer' || careerAhead(cr)) return null;
  const out = { kind:null, place:null, won:false, triple:false, ovr:careerOverall(cr.skills), next:null };
  const c = cr.season, K = careerCups();
  if (c) { out.kind = cr.phase === 'intl' ? 'intl' : 'league'; out.place = careerPlace(c); out.won = out.place === 1; out.triple = out.kind === 'intl' && careerTriple(c); }
  else if (cr.cup && K) { out.kind = careerCupKind(cr); out.won = K.cupWinner(cr.cup) === careerCupUser(cr.cup); }
  else return null;
  out.next = careerNext(cr);
  return out;
}
function careerTrophy(cr, kind, name) {
  cr.trophies.push({ kind, year:cr.year, name:String(name).slice(0, 24) });
  cr.trophies = cr.trophies.slice(-CAREER_TROPHIES);
}
function careerBank(cr, out) {                       // the phase just finished into his history and his trophies
  const c = cr.season;
  if (c) {
    const s = seasonSummary(c), name = c.teams[c.user].name;
    cr.history.push({ year:cr.year, kind:out.kind, name, place:out.place, w:s.won, d:s.drawn, l:s.lost });
    cr.history = cr.history.slice(-CAREER_HISTORY);
    if (out.won) careerTrophy(cr, 'league', name);
    if (out.triple) { careerTrophy(cr, 'triple', name); careerLocker('triple'); }
  } else if (out.won) careerTrophy(cr, out.kind, out.kind === 'county' && cr.cup.name ? cr.cup.name : cr.cup.teams[careerCupUser(cr.cup)].name);   // a county cup by its name: the Surrey Shield   // its medal is the cups engine's (cupRecord)
}
/* Into a phase: its season, cup or offers drawn now, once, and saved with it. */
function careerEnter(cr, next) {
  const K = careerCups(), cat = careerCat(cr);
  cr.phase = next.phase; cr.season = null; cr.cup = null; cr.offers = null; cr.trained = false;
  if (next.phase === 'transfer') { cr.offers = careerOffers(cr); return; }
  if (next.phase === 'league' || (next.phase === 'intl' && next.kind !== 'world')) { careerNewSeason(cr); return; }
  const id = next.kind, opts = { user:careerTeamFor(cr, id === 'euro' || id === 'county' ? 'league' : 'intl'), cat, year:cr.year };
  if (id === 'euro') opts.list = careerLeague(cr);   // his league, never drawn again (a made team's is the list it was picked on)
  if (id === 'tour') opts.n = Math.floor(cr.year/CAREER_CALL.every);   // the hosts in turn: years 2, 6, 10 are 0, 1, 2
  const cup = K ? K.cupNew(id, opts) : null;
  if (cup) { cr.cup = cup; return; }
  if (id === 'world') careerNewSeason(cr);           // no World Cup after all: his country's six
  else careerEnter(cr, { phase:'transfer' });
}
/* Continue on the screen between phases (or a country, at the first call-up): the phase into the history and the cabinet, and the next one. */
function careerAdvance(country) {
  const cr = career, out = careerOutcome(cr);
  if (practice || !out) return false;
  careerBank(cr, out);
  if (out.next.phase === 'intl' && out.next.first) {
    cr.country = careerNations(careerCat(cr)).some(t => t.id === country) ? country : 'ENG';
    careerLocker('callup');
  }
  careerEnter(cr, out.next);
  careerLast = null;
  save();
  return true;
}
/* The transfer window. target: the club overall his own maps to. */
function careerTarget(ovr) { const [a, b] = CAREER_MOVE.from, [lo, hi] = CAREER_MOVE.to; return clamp(lo + (ovr - a)*(hi - lo)/(b - a), lo, hi); }
function careerOffers(cr) {                          // two or three club ids, best first; the draw happens here, as the window opens
  const target = careerTarget(careerOverall(cr.skills)), pool = careerClubs().filter(t => cr.club.custom || t.id !== cr.club.id);
  let near = [];
  for (let band = CAREER_MOVE.band; near.length < 2 && band <= 40; band++) near = pool.filter(t => Math.abs(overallOf(t) - target) <= band);
  const [few, most] = CAREER_MOVE.offers, n = Math.min(near.length, few + Math.floor(rnd()*(most - few + 1)));
  const mixed = shuffle(near.slice()), out = [], lists = new Set();
  for (const t of mixed) { const k = careerListOf(t).key; if (out.length < n && !lists.has(k)) { out.push(t); lists.add(k); } }
  for (const t of mixed) if (out.length < n && !out.includes(t)) out.push(t);
  return out.sort((a, b) => overallOf(b) - overallOf(a)).map(t => t.id);
}
/* An offer taken (its club's id), or Stay (anything else): the next year starts at that club's league. */
function careerSign(id) {
  const cr = career;
  if (practice || !cr || cr.phase !== 'transfer') return false;
  const to = id && (cr.offers || []).includes(id) ? careerClubById(id) : null;
  if (to) { cr.club = careerSide(to); cr.league = careerListOf(to).key; careerLocker('transfer'); }
  cr.year++;
  careerEnter(cr, { phase:'league' });
  careerLast = null;
  save();
  return true;
}
/* A phase with nothing drawn yet (a broken season or cup dropped on load, a window's offers lost): drawn now, as the hub opens. */
function careerRepair(cr) {
  if (cr.phase === 'transfer') { if (cr.offers && cr.offers.length) return false; cr.offers = careerOffers(cr); return true; }
  if (cr.season || (cr.cup && careerCups())) return false;
  if (cr.phase === 'league' || cr.phase === 'intl') { cr.cup = null; careerNewSeason(cr); return true; }
  careerEnter(cr, { phase:'transfer' });             // a cup that could not be kept: on to the window
  return true;
}
function careerEnd() { if (practice) return; career = null; careerLast = null; save(); }   // Start New Career, or Start Fresh

/* ---------- training ---------- */
function careerDrills(cr) {                          // the games that exist right now, in the Skills Mini Games' order; no contact game for the youngest (practiceBarred: the Kids level, or Minis)
  return PRACTICE_DRILLS.filter(d => d.id in CAREER_DRILL_SKILL && !practiceBarred(d.id))
    .map(d => ({ id:d.id, name:d.name || CAREER_DRILL_NAME[d.id], contact:!!d.contact, skills:d.id === 'circle' ? ['stamina', 'handling'] : [CAREER_DRILL_SKILL[d.id]] }));
}
const careerCanTrain = cr => !!(cr && !cr.trained && careerAhead(cr));   // one session before each match, league, international or cup
/* The drill's onDone ({ id, stars, success[, role, skill, quit] }), once its settings are restored. One session a round;
   a drill left before it finished (quit) gives nothing and keeps the session. */
function careerTrainDone(res) {
  const cr = career;
  let out = null;
  if (!practice && careerCanTrain(cr) && res && typeof res === 'object' && !res.quit) {
    const keys = careerSkillKeys();
    const skill = keys.includes(res.skill) ? res.skill : CAREER_DRILL_SKILL[res.id];
    if (skill && keys.includes(skill)) {
      const stars = clamp(Math.round(+res.stars || 0), 0, 3), before = cr.skills[skill];
      cr.skills[skill] = clamp(before + CAREER_TRAIN[stars], 1, 99);
      cr.trained = true;
      out = careerLast = { kind:'train', stars, gains:{ [skill]:cr.skills[skill] - before } };
      careerLifeTrain(cr);                           // a session costs a little Energy
      save();
    }
  }
  if (mode === 'match' && !practice) { setTwo(false); startDemo(); }   // the drill's match is over: back to the menus' demo, whatever the drill left behind
  careerOpen();
  return out;
}
function careerTrain(id) {
  if (!careerCanTrain(career) || !careerDrills(career).some(d => d.id === id)) return false;
  practiceStart(id, { onDone:careerTrainDone, leaveLabel:'Back to Career' });
  return true;
}

/* ---------- a career match ---------- */
function careerNatFor(team, skills) {                // the team's abilities, each pulled toward your player's own
  const out = { ...team };
  for (const k of careerSkillKeys()) {
    const base = k === 'stamina' ? careerTeamStamina(team) : +team[k] || 3;
    out[k] = clamp(base + (careerAbil(+skills[k] || CAREER_BASE) - base)*CAREER_SHADE, 1, 5);
  }
  return out;
}
const CAREER_CAP = { matches:3, secs:4 };            // the kick-off caption: a player's first matches, this long on M.rt. Over the play, never stopping it
const careerCaption = () => !!(M && M.career && M.capUntil > M.rt && !M.cut && !M.tut && !M.paused && !M.over && !practice);
function careerArm() {                               // straight after startMatch: this match is a career match
  if (!M || !career) return;
  M.career = true;
  M.careerP = M.players.find(p => p.team === 0 && p.n === career.num) || M.players.find(p => p.team === 0);
  M.careerPro = career.proMode === true;                    // Pro Mode: your player alone (career-pro.js)
  M.careerNat = careerNatFor(M.nat[0], career.skills);
  M.careerDeeds = { tries:0, tackles:0, goals:0 };
  careerLifeArm();                                   // the bars as they are now, for the whole match: Energy and Morale into M.careerNat
  traitsArm();                                       // his own traits, and his shirt kept for him (src/traits.js)
  M.capUntil = settings.hints && career.totals && career.totals.matches < CAREER_CAP.matches ? M.rt + CAREER_CAP.secs : 0;
  careerKickoff();
}
/* startMatch's options for his next match f: Easy for My Player on Kids, and for a cup match the cup's id and whether it is a knockout
   or a Test (cupKO), which newMatch keeps on the match for the cups engine's rules (the Golden Try in a level knockout), as it keeps
   champ. The career sets nothing of the cup's on the match itself. */
function careerMatchOpts(cr, f) {
  const o = cr.proMode === true && kidsLevel() ? { easy:true } : undefined;   // My Player on Kids plays at Easy: the computer runs his side, so Kids' weaker opponents would let it win by itself (the owner's call)
  return !cr.season && cr.cup ? { ...o, cup:cr.cup.id, cupKO:!!f.ko } : o;
}
function careerPlay() {                              // Play Match on the hub
  const cr = career, f = careerAhead(cr);
  if (practice || !f) return false;
  const opp = f.home === f.user ? f.away : f.home, mine = f.teams[f.user];
  startMatch({ ...mine, squad:[{ n:cr.num, look:careerLook(cr.look, careerCat(cr)) }] }, f.teams[opp], false, careerMatchOpts(cr, f));   // his look on his squad entry, for this match only (lookOf): the season's side is untouched
  careerArm();
  return true;
}
/* engine hooks: each one is read only behind M.career, or gives the team's own value when M.career is not set */
function careerNatOf(p) { return M.career && p === M.careerP ? M.careerNat : M.nat[p.team]; }
/* One ability for man p as the engine reads it: his side's (Power after the stamina fade, where the game has powerOf), plus, for
   your player in a career match only, the pull of his own rating as an extra term. Everyone else gets exactly the side's value. */
function careerAbility(p, k) {
  const t = M.nat[p.team], base = k === 'power' && typeof powerOf === 'function' ? powerOf(p.team) : +t[k];
  return M.career && p === M.careerP ? base + M.careerNat[k] - (+t[k] || 3) : base;
}
const careerTeamStamina = t => (typeof staminaOf === 'function' ? staminaOf(t) : +t.stamina || 3);   // a side without Stamina reads 3
function careerGoalNat(team, kicker, kind) {         // your side's goal kicks are his; a drop goal is whoever drops it
  const his = kicker ? kicker === M.careerP : team === 0 && kind !== 'drop';
  return M.career && his ? M.careerNat : M.nat[team];
}
function careerKicker(team) { return M.career && team === 0 && M.careerP ? M.careerP : null; }
function careerStamina(p) { return M.career && p === M.careerP ? M.careerNat.stamina - careerTeamStamina(M.nat[p.team]) : 0; }   // his stamina against the team's, ability points: an extra term on him, the side's own fade and sprint length are the side's
function careerFade(p) { const d = careerStamina(p); return d ? 1 + d*CAREER_FADE*clamp(M.clock/M.halfLen, 0, 1) : 1; }   // nothing at the kick-off, the full shade at the hooter
function careerSprintDrain(p) { const d = careerStamina(p); return d ? clamp(1 - d*CAREER_SPRINT, 0.7, 1.3) : 1; }
function careerDeed(kind, p) { if (M.career && M.careerDeeds && p && p === M.careerP) M.careerDeeds[kind]++; }
function careerKickoff() { if (M.career && M.careerP && isHuman(0)) setCtrl(0, M.careerP); }
function careerDeedGains(deeds) {
  const gains = {}, keys = careerSkillKeys();
  let left = CAREER_DEED_CAP;
  for (const kind of Object.keys(CAREER_DEEDS)) {
    const n = Math.max(0, Math.floor(+(deeds && deeds[kind]) || 0));
    for (let i = 0; i < n && left > 0; i++) for (const [k, v] of Object.entries(CAREER_DEEDS[kind])) {
      if (left <= 0 || !keys.includes(k)) continue;
      const add = Math.min(v, left); gains[k] = (gains[k] || 0) + add; left -= add;
    }
  }
  return gains;
}
/* Full time in a career match: the result into the career's season or cup (never the championship's), the deeds into his skills. */
function careerRecordResult() {
  const cr = career, f = careerAhead(cr);
  if (!f || !M || !M.career || M.demo || M.two || practice || M.careerDone) return false;
  const home = f.home === f.user, us = [M.score[0], M.tries[0]], them = [M.score[1], M.tries[1]];
  M.careerDone = true;
  const c = cr.season;
  if (c) {
    const { pair } = userFixture(c);
    const mine = home ? { h:pair[0], a:pair[1], hs:us[0], as:them[0], ht:us[1], at:them[1] } : { h:pair[0], a:pair[1], hs:them[0], as:us[0], ht:them[1], at:us[1] };
    const rd = [mine];
    for (const p of c.fixtures[c.round]) if (p !== pair) rd.push(simMatch(c, p[0], p[1]));
    c.results.push(rd);
    c.round++;
  } else {
    careerCups().cupRecord(cr.cup, home ? { score:[us[0], them[0]], tries:[us[1], them[1]] } : { score:[them[0], us[0]], tries:[them[1], us[1]] });   // in the fixture's order
    careerCupCard();                                 // the result is in the cup: the full-time card says what it meant (src/ui-career.js)
  }
  const deeds = M.careerDeeds || {}, gains = careerDeedGains(deeds);
  for (const k in gains) cr.skills[k] = clamp(cr.skills[k] + gains[k], 1, 99);
  const T = cr.totals;
  T.matches++; T.tries += deeds.tries || 0; T.tackles += deeds.tackles || 0; T.goals += deeds.goals || 0;
  cr.trained = false;
  careerLast = { kind:'match', gains };
  careerLifeRound(cr, deeds);                        // Energy back, Morale from the result, Team Spirit from his part in it (held in a cup)
  save();
  return true;
}

/* ---------- the save ---------- */
const careerInt = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);
const careerText = v => String(v || '').replace(/\s+/g, ' ').trim().slice(0, 24);
function careerTrophies(list) {
  const out = [];
  for (const t of list.slice(-CAREER_TROPHIES)) {
    if (!t || typeof t !== 'object' || !CAREER_KINDS.includes(t.kind)) continue;
    const year = careerInt(t.year, 1, 9999), name = careerText(t.name);
    if (year != null && name) out.push({ kind:t.kind, year, name });
  }
  return out;
}
/* A career from before club seasons has a stage (0 Minis, 1 Juniors, 2 County, 3 Pro Club, 4 International) and no phase. Minis,
   Juniors and County become a league year at their club, a new season drawn as the hub opens; Pro Club is a year at the side he
   signed for, its season kept; International keeps that club and his country, in the window with its season. Its skills, history,
   totals and life are kept, and the titles in its history are its first trophies. A Minis, Juniors or County season he had finished
   (its end screen seen, Continue not yet pressed) is banked here as Continue would have banked it, since its season is not kept: its
   place and record into his history (a title into his trophies), and he starts the year after it. A club and skills are the career:
   anything else that is broken is put right, never the whole career dropped. */
function cleanCareer(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
  const raw = c.skills && typeof c.skills === 'object' && !Array.isArray(c.skills) ? c.skills : null;
  const was = typeof c.phase === 'string' ? null : careerInt(c.stage, 0, 4);   // the stage of a career from before club seasons
  const signed = was != null && was >= 3 ? careerClubById(c.pro) : null;   // the Pro Club side it signed for
  const club = cleanSide(signed || c.club);
  if (!club || !raw) return null;
  careerRated(club);                                   // a built-in club at its list's ratings now, whatever it was saved at
  const pos = c.pos === 'F' ? 'F' : 'B';               // an unknown position is a back, as careerCreate has it
  /* Men or Women. A career from before Men | Women is Men, except one PR #14's build saved: it has no cat, and its Female was look.g 1
     (its careerFemale), the same one control, so that is a women's career. A cat, where there is one, decides. */
  const cat = c.cat == null && c.look && typeof c.look === 'object' && c.look.g === 1 ? 'women' : careerCat(c);
  const skills = {};
  for (const k of careerSkillKeys()) skills[k] = typeof raw[k] === 'number' && Number.isFinite(raw[k]) ? clamp(Math.round(raw[k]), 1, 99) : (CAREER_START[pos][k] || CAREER_BASE);
  const T = c.totals && typeof c.totals === 'object' ? c.totals : {}, totals = {};
  for (const k of ['matches', 'tries', 'tackles', 'goals']) totals[k] = careerInt(T[k], 0, 100000) || 0;
  const history = [];
  if (Array.isArray(c.history)) c.history.slice(-CAREER_HISTORY).forEach((h, i) => {
    if (!h || typeof h !== 'object') return;
    const stage = careerInt(h.stage, 0, 4), kind = h.kind === 'league' || h.kind === 'intl' ? h.kind : stage == null ? null : stage === 4 ? 'intl' : 'league';
    const e = { year:careerInt(h.year, 1, 9999) || i + 1, kind, name:careerText(h.name), place:careerInt(h.place, 1, 6), w:careerInt(h.w, 0, 5), d:careerInt(h.d, 0, 5), l:careerInt(h.l, 0, 5) };
    if (e.kind && e.name && e.place != null && e.w != null && e.d != null && e.l != null) history.push(e);
  });
  let phase = CAREER_PHASES.includes(c.phase) ? c.phase : was === 4 ? 'intl' : 'league';
  const nations = careerNations(cat), K = careerCups();
  const country = nations.some(t => t.id === c.country) ? c.country : phase === 'intl' || phase === 'tour' ? 'ENG' : null;
  let season = null, cup = null, offers = null;
  if ((phase === 'league' || phase === 'intl') && c.season != null && !(was != null && was < 3)) season = cleanChamp(c.season);   // a broken season is dropped (and a Minis, Juniors or County one): the hub draws a new one
  if (season && cat !== 'men') season.teams = season.teams.map(t => (catOf(t) === cat ? t : catSide(t, cat)));   // a kept season is the career's category: PR #14's Pro Club or International season marked its women's sides with g, which cleanSide drops, so they would be men's around a female player
  if (phase !== 'league' && phase !== 'transfer' && !season && c.cup != null && K && K.cleanCup) cup = K.cleanCup(c.cup) || null;
  if (cup && cup.id !== CAREER_CUP_PHASE[phase]) cup = null;   // a European Cup saved in the window (or any cup in another's phase) would read and bank as the wrong cup
  if ((phase === 'county' || phase === 'cup' || phase === 'tour') && !cup) phase = 'transfer';   // a cup that cannot be kept (a build without the cups): on to the window
  if (phase === 'transfer' && Array.isArray(c.offers)) {
    offers = [...new Set(c.offers.filter(id => typeof id === 'string' && careerClubById(id) && (club.custom || id !== club.id)))].slice(0, CAREER_MOVE.offers[1]);
    if (!offers.length) offers = null;               // drawn again as the hub opens
  }
  let year = careerInt(c.year, 1, 9999) || (was != null ? Math.max(1, careerInt(c.seasons, 1, 9999) || history.length + 1) : 1);
  const done = was != null && was < 3 && c.season != null ? cleanChamp(c.season) : null;   // the old stage's season, banked only if finished
  if (done && done.round >= 5) {
    const s = seasonSummary(done);
    year = Math.max(year, history.length ? history[history.length - 1].year + 1 : 1);
    history.push({ year, kind:'league', name:careerText(done.teams[done.user].name), place:careerPlace(done), w:s.won, d:s.drawn, l:s.lost });
    if (history.length > CAREER_HISTORY) history.shift();
    year++;
  }
  const trophies = Array.isArray(c.trophies) ? careerTrophies(c.trophies) : careerTrophies(history.filter(h => h.place === 1).map(h => ({ kind:'league', year:h.year, name:h.name })));
  return { name:careerName(c.name), pos, num:CAREER_POS[pos].includes(c.num) ? c.num : CAREER_POS[pos][0], club, league:careerLeagueKey(c.league, club), cat,
    look:careerLook(c.look, cat),                    // a career from before the look builder, or a broken look, takes the default on its own body
    proMode:c.proMode === true,                      // Pro Mode (career-pro.js): a career from before it is Whole Team
    country, skills, year, phase, seasons:careerInt(c.seasons, 0, 100000) || 0, season, cup, offers,
    trained:c.trained === true && (season ? season.round < 5 : !!cup), history, totals, trophies,
    life:careerLifeClean(c.life) };
}
/* Your player: a star in the trim, the shirt or chalk, whichever stands off the grass, on his back on Top and over his head in a behind
   view, drawn over the men so a ruck can't hide him. No ring of his own: a ring on the grass always means who you control now. */
function careerCol() { const k = M.kit[0]; return colorDist(k.trim, '#2f6a38') >= 90 ? k.trim : colorDist(k.fill, '#2f6a38') >= 90 ? k.fill : '#f1eee4'; }
const careerEdgeCol = () => { const c = careerCol(); return colorDist(c, '#08110b') >= 90 ? c : '#f1eee4'; };   // the edge arrow sits on a dark disc: a near-black trim would vanish there
function careerStar(cx, cy, r, col) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI/2 + i*Math.PI/5, rr = i % 2 ? r*0.42 : r; ctx.lineTo(cx + Math.cos(a)*rr, cy + Math.sin(a)*rr); }
  ctx.closePath();
  ctx.fillStyle = col; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = C.outline; ctx.stroke();
}
function careerMark(r) {
  const p = M.careerP; if (!p) return;
  const [wx, wy] = drawPos(p), [sx, sy] = toS(wx, wy);
  if (sx < 0 || sx > V.W || sy < 0 || sy > V.H) { BV.edges.length = 0; edgeTag(sx, sy, careerEdgeCol(), 'star', safeInsets()); }
  else careerStar(sx, sy, r, careerCol());
  if (M.careerPro) proMark(r);                             // Pro Mode: the call's ring and the No sign (career-pro.js)
}
