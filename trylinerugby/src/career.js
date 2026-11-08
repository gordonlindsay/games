/* =========================================================
   Career: one player, from the minis to the national team.

   The rules, all of them here:
   - Five stages, each a season of the championship's shape (six sides, five rounds, three games a round): Minis,
     Juniors, County, Pro Club, International. Only your game is played; the other two are drawn by simMatch, as in a
     championship. Points are the championship's (4 a win, bonus points, 3 for a grand slam).
   - Minis and Juniors are your club against five other Local clubs drawn at random, every side at lowered ratings
     (Minis: one off every ability; Juniors: one off Pace and Power). County is Surrey against five invented county
     sides. Pro Club is the city side you sign for (drawn from the France, Australia and South Africa lists when you
     go up) against five others from its list. International is your country (picked when you are called up) against
     the other five nations, at their own ratings.
   - Promotion at the end of a season: finish in the top two, or reach the stage's bar with your overall rating
     (CAREER_STAGES[].bar). Otherwise you play the stage again, against a new draw. A finished International season
     ends the career, whatever the table says.
   - Your player has a 1 to 99 rating in each ability (Pace, Power, Handling, Kicking, and Stamina even before the
     teams have it). The overall is the team cards' overallOf on the same 40 to 99 scale.
   - Skills rise from training (one session a round, between matches: a drill's stars give points to its skill,
     CAREER_TRAIN) and a little from what your player does in a match (CAREER_DEEDS, capped a match).
   - In a career match only (M.career, set by careerArm after startMatch), your player wears a star and a ring in the
     kit's trim, the ring starts on him at every kick-off, he takes your side's goal kicks, and his skills shade HIS
     speed, catching, tackling, kicking and stamina from the team's baseline (CAREER_SHADE). Every engine site reads
     the side's own value unless M.career is set, and careerNatOf, careerAbility, careerFade and careerSprintDrain add
     the shade for your player only, so no other match and no other man changes.
   - The career keeps its own seasons in `career` (persistence.js), never in `champ` or champHistory. Championship
     helpers that take the season as an argument (roundRobin, simMatch, standings, userFixture) are reused; the ones
     that read the global champ (newChamp, recordChampResult, retainCompletedSeason) never are.
   ========================================================= */
const CAREER_STAGES = [
  { id:'minis', name:'Minis', bar:64 },
  { id:'juniors', name:'Juniors', bar:70 },
  { id:'county', name:'County', bar:77 },
  { id:'pro', name:'Pro Club', bar:85 },
  { id:'intl', name:'International', bar:null },   // the last stage: one season, then the career is over
];
const CAREER_UP = 2;                                 // the top two go up
const CAREER_CUT = [{ all:-1 }, { pace:-1, power:-1 }];   // Minis and Juniors: what comes off a club's abilities (never below 1)
/* Invented county sides: county names, made-up kits and ratings (Pace to Kicking 11 to 14, the Local clubs' range; Stamina 3,
   kept only once the teams have it). Surrey is yours. */
const CAREER_COUNTIES = [
  { id:'SUR', name:'Surrey',    kit:'#2a3d8f', trim:'#f2b01e', pace:3, power:3, handling:4, kicking:3, stamina:3 },
  { id:'KEN', name:'Kent',      kit:'#f2efe6', trim:'#c8102e', pace:3, power:4, handling:3, kicking:3, stamina:3 },
  { id:'SSX', name:'Sussex',    kit:'#1c6fb8', trim:'#f2b01e', hoops:true, pace:3, power:3, handling:3, kicking:3, stamina:3 },
  { id:'HAM', name:'Hampshire', kit:'#c8102e', trim:'#f2efe6', pace:4, power:3, handling:3, kicking:3, stamina:3 },
  { id:'MDX', name:'Middlesex', kit:'#0f5a32', trim:'#f2efe6', hoops:true, pace:4, power:4, handling:3, kicking:3, stamina:3 },
  { id:'BRK', name:'Berkshire', kit:'#5b2d8e', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:2, stamina:3 },
];
const CAREER_PRO_POOLS = [FRANCE, AUSTRALIA, SOUTH_AFRICA];
const CAREER_POS = { F:[1, 2, 3], B:[4, 5, 6, 7] };   // sevens: forwards wear 1 to 3, backs 4 to 7
/* A new player: about 61 overall, near the Minis sides. Any skill not listed starts at CAREER_BASE. */
const CAREER_START = { F:{ pace:32, power:44, handling:36, kicking:26, stamina:38 }, B:{ pace:44, power:26, handling:38, kicking:34, stamina:34 } };
const CAREER_BASE = 35;
const CAREER_TRAIN = [1, 3, 5, 8];                   // skill points for 0, 1, 2 and 3 stars
/* Which skill a drill trains. A drill's own result wins when it names one: Pass Around the Circle trains Stamina as the
   Runner and Handling as the Passer. Driving is hidden in the Minis: young players don't scrum yet. */
const CAREER_DRILL_SKILL = { egg:'handling', pass:'handling', circle:'handling', tackle:'power', scrum:'power', cones:'pace', defend:'pace', kick:'kicking' };
const CAREER_DRILL_ORDER = ['egg', 'pass', 'circle', 'tackle', 'scrum', 'cones', 'defend', 'kick'];
const CAREER_DRILL_NAME = { egg:'Bouncy Egg', pass:'Create a Two-on-One', circle:'Pass Around the Circle', tackle:'Tackling', scrum:'Driving', cones:'Cones', defend:'Defend a Breakaway', kick:'Kicking' };   // only if a drill has no name of its own
/* A match's deeds by your player: each try a point of Pace and one of Handling, each tackle a point of Power, each goal
   kicked a point of Kicking. At most CAREER_DEED_CAP points a match: training is where most of it comes from. */
const CAREER_DEEDS = { tries:{ pace:1, handling:1 }, goals:{ kicking:1 }, tackles:{ power:1 } };
const CAREER_DEED_CAP = 6;
const CAREER_SHADE = 0.5;                            // how far your player's own rating pulls his abilities from the team's
const CAREER_FADE = 0.02;                            // late in a half: top speed per ability point of stamina above (or below) the team's
const CAREER_SPRINT = 0.08;                          // the sprint meter's drain while he sprints, per ability point of stamina
const CAREER_HISTORY = 40;
let careerLast = null;                               // what the last match or session gave, for the hub: { kind, gains }

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

/* ---------- teams for each stage ---------- */
function careerSide(t, cut) {
  const s = cleanSide(t); if (!s) return null;
  for (const [k] of ABILITIES) if (k in s) s[k] = clamp(s[k] + ((cut && (cut[k] != null ? cut[k] : cut.all)) || 0), 1, 5);
  return s;
}
const careerProSide = id => CAREER_PRO_POOLS.flat().find(t => t.id === id) || FRANCE[0];
const careerNation = id => NATIONS.find(t => t.id === id) || NATIONS[0];
function careerTeamFor(cr, stage) {
  if (stage <= 1) return careerSide(cr.club, CAREER_CUT[stage]);
  if (stage === 2) return careerSide(CAREER_COUNTIES[0]);
  if (stage === 3) return careerSide(careerProSide(cr.pro));
  return careerSide(careerNation(cr.country));
}
function careerOpponents(cr, stage) {               // five sides; the random draws happen here, never in a save or a render
  if (stage <= 1) {
    const mine = cr.club, same = t => t.id === mine.id || t.name === mine.name || (typeof importSame === 'function' && importSame(t.name, mine.name));   // an imported Farnham RFC is Farnham, as the import's own league draw has it
    const others = CLUBS.filter(t => !same(t));
    return shuffle(others.slice()).slice(0, 5).map(t => careerSide(t, CAREER_CUT[stage]));
  }
  if (stage === 2) return CAREER_COUNTIES.slice(1).map(t => careerSide(t));
  if (stage === 3) {
    const me = careerProSide(cr.pro), pool = CAREER_PRO_POOLS.find(p => p.includes(me)) || FRANCE;
    return shuffle(pool.filter(t => t !== me)).slice(0, 5).map(t => careerSide(t));
  }
  return NATIONS.filter(t => t.id !== careerNation(cr.country).id).map(t => careerSide(t));
}
/* A season: the championship's shape, with the weakest opponent first and the strongest last, as newChamp does. */
function careerNewSeason(cr) {
  const user = careerTeamFor(cr, cr.stage), five = careerOpponents(cr, cr.stage);
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
  const cr = { name:careerName(o.name), pos, num:nums.includes(o.num) ? o.num : nums[0], club, pro:null, country:null, skills,
    stage:0, seasons:0, season:null, trained:false, history:[], totals:{ matches:0, tries:0, tackles:0, goals:0 }, proMode:o.proMode === true };   // proMode: Pro Mode, your player alone (career-pro.js)
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

/* ---------- the season's end ---------- */
function careerPlace(c) { return standings(c).findIndex(r => r.i === c.user) + 1; }
function careerOutcome(cr) {
  const c = cr && cr.season;
  if (!c || c.round < 5) return null;
  const place = careerPlace(c), ovr = careerOverall(cr.skills), st = CAREER_STAGES[cr.stage];
  const final = cr.stage >= CAREER_STAGES.length - 1, top = place <= CAREER_UP, bar = st.bar != null && ovr >= st.bar;
  return { place, ovr, final, top, bar, promoted:!final && (top || bar) };
}
function careerSign(cr) {                            // going up to Pro Club: a city side from one of the three lists
  const all = CAREER_PRO_POOLS.flat();
  cr.pro = all[Math.floor(rnd()*all.length)].id;
}
function careerAdvance(country) {                    // Next Season (or a country, when called up)
  const cr = career, out = careerOutcome(cr);
  if (practice || !out || out.final) return false;
  const c = cr.season, s = seasonSummary(c);
  cr.history.push({ stage:cr.stage, name:c.teams[c.user].name, place:out.place, up:out.promoted, w:s.won, d:s.drawn, l:s.lost });
  cr.history = cr.history.slice(-CAREER_HISTORY);
  if (out.promoted) {
    cr.stage++;
    if (cr.stage === 3 && !cr.pro) careerSign(cr);
    if (cr.stage === 4) cr.country = NATIONS.some(t => t.id === country) ? country : (cr.country || 'ENG');
  }
  careerNewSeason(cr);
  careerLast = null;
  save();
  return true;
}
function careerEnd() { if (practice) return; career = null; careerLast = null; save(); }   // Start New Career, or Start Fresh

/* ---------- training ---------- */
function careerDrills(cr) {                          // the drills that exist right now, in the career's order; no Driving in the Minis
  const have = new Map(PRACTICE_DRILLS.map(d => [d.id, d]));
  return CAREER_DRILL_ORDER.filter(id => have.has(id) && !(id === 'scrum' && cr && cr.stage === 0))
    .map(id => ({ id, name:have.get(id).name || CAREER_DRILL_NAME[id], skills:id === 'circle' ? ['stamina', 'handling'] : [CAREER_DRILL_SKILL[id]] }));
}
const careerCanTrain = cr => !!(cr && cr.season && cr.season.round < 5 && !cr.trained);
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
function careerArm() {                               // straight after startMatch: this match is a career match
  if (!M || !career) return;
  M.career = true;
  M.careerP = M.players.find(p => p.team === 0 && p.n === career.num) || M.players.find(p => p.team === 0);
  M.careerPro = career.proMode === true;                    // Pro Mode: your player alone (career-pro.js)
  M.careerNat = careerNatFor(M.nat[0], career.skills);
  M.careerDeeds = { tries:0, tackles:0, goals:0 };
  careerKickoff();
}
function careerPlay() {                              // Play Match on the hub
  const cr = career, c = cr && cr.season;
  if (practice || !c || c.round >= 5) return false;
  const { opp } = userFixture(c);
  startMatch(c.teams[c.user], c.teams[opp], false);
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
/* Full time in a career match: the result into the career's season (never the championship), the deeds into his skills. */
function careerRecordResult() {
  const cr = career, c = cr && cr.season;
  if (!c || c.round >= 5 || !M || !M.career || M.demo || M.two || practice || M.careerDone) return false;
  const { pair } = userFixture(c), home = pair[0] === c.user;
  const mine = home
    ? { h:pair[0], a:pair[1], hs:M.score[0], as:M.score[1], ht:M.tries[0], at:M.tries[1] }
    : { h:pair[0], a:pair[1], hs:M.score[1], as:M.score[0], ht:M.tries[1], at:M.tries[0] };
  const rd = [mine];
  for (const p of c.fixtures[c.round]) if (p !== pair) rd.push(simMatch(c, p[0], p[1]));
  M.careerDone = true;
  c.results.push(rd);
  c.round++;
  const deeds = M.careerDeeds || {}, gains = careerDeedGains(deeds);
  for (const k in gains) cr.skills[k] = clamp(cr.skills[k] + gains[k], 1, 99);
  const T = cr.totals;
  T.matches++; T.tries += deeds.tries || 0; T.tackles += deeds.tackles || 0; T.goals += deeds.goals || 0;
  cr.trained = false;
  careerLast = { kind:'match', gains };
  careerSettle(cr);
  save();
  return true;
}
function careerSettle(cr) {                          // going up to Pro Club: sign at the season's end, so the screen can name the club
  const out = careerOutcome(cr);
  if (!out || !out.promoted || cr.stage !== 2 || cr.pro) return false;
  careerSign(cr);
  return true;
}

/* ---------- the save ---------- */
const careerInt = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);
function cleanCareer(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
  const club = cleanSide(c.club);
  if (!club) return null;
  const pos = c.pos === 'F' ? 'F' : c.pos === 'B' ? 'B' : null;
  if (!pos) return null;
  const stage = careerInt(c.stage, 0, CAREER_STAGES.length - 1);
  if (stage == null) return null;
  const skills = {}, raw = c.skills && typeof c.skills === 'object' ? c.skills : {};
  for (const k of careerSkillKeys()) skills[k] = typeof raw[k] === 'number' && Number.isFinite(raw[k]) ? clamp(Math.round(raw[k]), 1, 99) : (CAREER_START[pos][k] || CAREER_BASE);
  const T = c.totals && typeof c.totals === 'object' ? c.totals : {}, totals = {};
  for (const k of ['matches', 'tries', 'tackles', 'goals']) totals[k] = careerInt(T[k], 0, 100000) || 0;
  const history = [];
  if (Array.isArray(c.history)) for (const h of c.history.slice(-CAREER_HISTORY)) {
    if (!h || typeof h !== 'object') continue;
    const e = { stage:careerInt(h.stage, 0, CAREER_STAGES.length - 1), name:String(h.name || '').replace(/\s+/g, ' ').trim().slice(0, 24), place:careerInt(h.place, 1, 6), up:!!h.up,
      w:careerInt(h.w, 0, 5), d:careerInt(h.d, 0, 5), l:careerInt(h.l, 0, 5) };
    if (e.stage == null || e.place == null || e.w == null || e.d == null || e.l == null || !e.name) continue;
    history.push(e);
  }
  const season = c.season == null ? null : cleanChamp(c.season);   // a broken season is dropped; the hub draws a new one for the same stage
  return { name:careerName(c.name), pos, num:CAREER_POS[pos].includes(c.num) ? c.num : CAREER_POS[pos][0], club,
    pro:CAREER_PRO_POOLS.flat().some(t => t.id === c.pro) ? c.pro : null, country:NATIONS.some(t => t.id === c.country) ? c.country : (stage === 4 ? 'ENG' : null),
    skills, stage, seasons:careerInt(c.seasons, 0, 100000) || 0, season, trained:c.trained === true && !!season && season.round < 5, history, totals, proMode:c.proMode === true };   // a career from before Pro Mode is Whole Team
}
/* Your player: a ring in the kit's trim round him and a star on his back (the trim, or the shirt, or chalk, whichever
   stands off the grass), drawn over the men so a ruck can't hide him. */
function careerMark(r) {
  const p = M.careerP; if (!p) return;
  const [wx, wy] = drawPos(p), [sx, sy] = toS(wx, wy), k = M.kit[0];
  const col = colorDist(k.trim, '#2f6a38') >= 90 ? k.trim : colorDist(k.fill, '#2f6a38') >= 90 ? k.fill : '#f1eee4';
  ctx.save(); ctx.translate(sx, sy);
  ctx.lineWidth = 3; ctx.strokeStyle = col;
  ctx.beginPath(); ctx.arc(0, 0, r*1.3, 0, 7); ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI/2 + i*Math.PI/5, rr = i % 2 ? r*0.42 : r*1.0; ctx.lineTo(Math.cos(a)*rr, Math.sin(a)*rr); }
  ctx.closePath();
  ctx.fillStyle = col; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = C.outline; ctx.stroke();
  ctx.restore();
  if (M.careerPro) proMark(r);                             // Pro Mode: the call's ring and the No sign (career-pro.js)
}
