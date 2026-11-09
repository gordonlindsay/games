/* =========================================================
   Career: one player, from the minis to the national team.

   The rules, all of them here:
   - Five stages, each a season of the championship's shape (six sides, five rounds, three games a round): Minis,
     Juniors, Club, Pro Club, International. You can start at the first three (careerCreate's start). Only your game is played; the other two are drawn by simMatch, as in a
     championship. Points are the championship's (4 a win, bonus points, 3 for a grand slam).
   - Minis and Juniors are your club against five other Local clubs drawn at random, every side at a lower rating worked
     out from its own, so sides stay different: Minis 40 to 46, one and two stars, Juniors 46 to 55 (CAREER_CUT). Club is your club against the five clubs nearest its real league (compCupRivals), at 58 to 64, with its county's cup beside the league. Pro Club is the city side you sign for (drawn when you go up from the lists a step above the counties, and only a side that is not above its rivals: careerSign) against five others from its list. International is your country (picked from every nation
     when you are called up), at its own rating: a Six Nations side against the other five, any other against the five
     nations nearest in rating. The strongest comes last either way.
   - Your player's look and Male or Female (cr.look) go on your squad entry in the match. Minis is mixed (CAREER_STAGES[].age against
     MIXED_THROUGH); from Juniors on every side is your player's: a female player's clubs are women's sides and the country list the
     women's nations at the women's ratings. A save from before this has no look: it stays men's, with its country, in every season.
   - What a stage plays is on CAREER_STAGES: Minis are tag festivals (short matches, no table, everyone moves up), Juniors play contact with a free pass for every scrum, and Club on play everything.
   - Promotion at the end of a season: finish in the top two, or reach the stage's bar with your overall rating
     (CAREER_STAGES[].bar). Otherwise you play the stage again, against a new draw. A finished International season
     ends the career, whatever the table says.
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
   - The career keeps its own seasons in `career` (persistence.js), never in `champ` or champHistory. Championship
     helpers that take the season as an argument (roundRobin, simMatch, standings, userFixture) are reused; the ones
     that read the global champ (newChamp, recordChampResult, retainCompletedSeason) never are.
   ========================================================= */
const CAREER_STAGES = [
  { id:'minis', name:'Minis', bar:64, age:10, rules:'tag', festival:true, note:'Tag Rugby: No Kicks, Six Tags Then the Ball Goes Over' },   // age: the stage's age group, against MIXED_THROUGH. rules: what its matches play (match.js). festival: short matches, no table, and everyone moves up
  { id:'juniors', name:'Juniors', bar:70, age:14, rules:'noscrum', note:'Full Contact, With a Free Pass for Every Scrum' },
  { id:'club', name:'Club', bar:77, cup:true },       // cup: your club enters its county's knockout (below). Stage 2 was County: a save there plays on as Club
  { id:'pro', name:'Pro Club', bar:85 },
  { id:'intl', name:'International', bar:null },   // the last stage: one season, then the career is over
];
const CAREER_FESTIVAL_HALF = 60;                     // a festival match's half, match seconds, whatever the home screen's length
const careerFestival = cr => !!(cr && CAREER_STAGES[cr.stage].festival);
const careerMatchOpts = cr => { const st = CAREER_STAGES[cr.stage]; return { rules:st.rules, halfLen:st.festival ? CAREER_FESTIVAL_HALF : 0 }; };
const CAREER_UP = 2;                                 // the top two go up
/* How much harder the other side plays at each stage: the share of the step from Normal's levers to Hard's (DIFF), added to the level you chose, so each stage is a step whichever you play on. Minis is as chosen, and Hard, already the hardest, stays as it is. A Kids match keeps its own terms. */
const CAREER_PUSH = [0, 0.20, 0.25, 0.25, 0.55];
/* Minis and Juniors: a club's ability sum read on to a lower range. from: what a side at the Local floor (sum 5, 40 overall) plays at; per: how many of its points make one here; top: the most here, so Twickenham and a team you made
   at a high level play as the best of the stage. Minis 5 to 7 is 40 to 46; Juniors 7 to 10 is 46 to 55; Club 11 to 13 is 58 to 64, under the top flights, so a Counties 5 club and a Regional 1 club each meet their own league's kind of rival. */
const CAREER_CUT = [{ from:5, per:3, top:7 }, { from:7, per:2, top:10, up:1 }, { from:11, per:3, top:13, up:1 }];   // up: the points your rivals have on you at this stage, under the same top, so going up is a step up (README, the career ladder)
const careerCutSum = (sum, c, up = 0) => Math.min(c.top, c.from + up + Math.ceil(Math.max(0, sum - ABILITIES.length)/c.per));
const CAREER_PRO_POOLS = [FRANCE, AUSTRALIA, SOUTH_AFRICA, ENGLAND, IRELAND, WALES_SCOTLAND_ITALY, ENGLAND_TWO];
const CAREER_POS = { F:[1, 2, 3], B:[4, 5, 6, 7] };   // sevens: forwards wear 1 to 3, backs 4 to 7
/* A new player: about 61 overall, above every Minis side (40 to 46) as a player's rating has always read, three short of the Minis bar. Rechecked by bot with the wider bands: kept, as the bars are (README). Any skill not listed starts at CAREER_BASE. */
const CAREER_START = { F:{ pace:32, power:44, handling:36, kicking:26, stamina:38 }, B:{ pace:44, power:26, handling:38, kicking:34, stamina:34 } };
const CAREER_BASE = 35;
/* Where a career can start, and the points on every skill for starting there: a player arrives at each stage with about the overall the last one's bar asks of them, 61, 64 and 70 (tools/ladder.mjs). */
const CAREER_STARTS = [0, 5, 15];
const CAREER_TRAIN = [1, 3, 5, 8];                   // skill points for 0, 1, 2 and 3 stars
/* Which skill a drill trains. A drill's own result wins when it names one: Pass Around the Circle trains Stamina as the
   Runner and Handling as the Passer. The contact games (PRACTICE_DRILLS' contact) are hidden in the Minis, which plays Tag Chase instead, and at the Kids level. */
const CAREER_DRILL_SKILL = { tag:'pace', egg:'handling', pass:'handling', circle:'handling', tackle:'power', scrum:'power', back:'handling', cones:'pace', defend:'pace', kick:'kicking' };
const CAREER_DRILL_ORDER = ['tag', 'egg', 'pass', 'circle', 'tackle', 'scrum', 'back', 'cones', 'defend', 'kick'];
/* The training each stage plays: bouncing the egg and running around for the young, set-piece work for the grown game. Every stage keeps the Circle, the one game that trains Stamina. Pro Club and International train as Club. */
const CAREER_STAGE_DRILLS = {
  minis:['tag', 'egg', 'pass', 'circle', 'cones', 'defend'],   // tag has no kicking and no contact, so Kicking and Power wait for the Juniors
  juniors:['egg', 'pass', 'circle', 'tackle', 'back', 'cones', 'defend', 'kick'],
  adult:['pass', 'circle', 'tackle', 'scrum', 'back', 'cones', 'defend', 'kick'],
};
const CAREER_DRILL_NAME = { tag:'Tag Chase', egg:'Bouncy Egg', pass:'Create a Two-on-One', circle:'Pass Around the Circle', tackle:'Tackling', scrum:'Driving', back:'Ball Back', cones:'Cones', defend:'Defend a Breakaway', kick:'Kicking' };   // only if a drill has no name of its own
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

/* ---------- your player's look ---------- */
const CAREER_LOOK = { g:0, skin:2, hair:1, style:0, b:1 };   // Male, Medium build; every field is there, so a saved look never depends on the team's deal
function careerLook(l) {                             // always all five (and a height if one was saved); anything off takes the default
  const c = cleanLook(l);
  return { ...CAREER_LOOK, ...c, g:c.g === 1 ? 1 : 0 };
}
/* ---------- teams for each stage ---------- */
const careerFemale = cr => !!(cr && cr.look && cr.look.g === 1);
const careerStageG = (cr, stage) => (!cr.look ? 0 : CAREER_STAGES[stage].age <= MIXED_THROUGH ? 'mixed' : cr.look.g);   // no look: a save from before this stays men's
function careerSide(t, cut, g, up) {
  const s = t ? cleanSide({ ...t, g }) : null; if (!s) return null;   // the stage decides, whatever side a team you made plays elsewhere
  if (cut) Object.assign(s, abilitiesFor(s, careerCutSum(rateOf(s), cut, up)));   // from the side's own abilities, so it keeps its character
  return s;
}
const careerProSide = id => CAREER_PRO_POOLS.flat().find(t => t.id === id) || FRANCE[0];
const careerNations = cr => (careerFemale(cr) ? WOMEN_NATIONS : allNations());
const careerNation = (id, cr) => careerNations(cr).find(t => t.id === id) || (careerFemale(cr) ? WOMEN_NATIONS.find(t => t.id === 'ENG') : NATIONS[0]);
/* The club for a new season: a Local club at its rating now, whatever the save copied when the career began, so it stays on the same scale as the rivals drawn for it.
   A team you made or imported has only the copy. A season under way keeps the sides it was drawn with. */
const careerClubNow = cr => (cr.club.key || cr.club.custom ? cr.club : CLUBS.find(t => t.id === cr.club.id) || cr.club);
function careerTeamFor(cr, stage) {
  const g = careerStageG(cr, stage);
  if (stage <= 2) return careerSide(careerClubNow(cr), CAREER_CUT[stage], g);
  if (stage === 3) return careerSide(careerProSide(cr.pro), null, g);
  return careerSide(careerNation(cr.country, cr), null, g);
}
function careerOpponents(cr, stage) {               // five sides; the random draws happen here, never in a save or a render
  const g = careerStageG(cr, stage);
  if (stage <= 1) {
    const mine = cr.club, others = CLUBS.filter(t => t.id !== mine.id && t.name !== mine.name);
    return shuffle(others.slice()).slice(0, 5).map(t => careerSide(t, CAREER_CUT[stage], g, CAREER_CUT[stage].up));
  }
  if (stage === 2) return compCupRivals(careerClubNow(cr), 5).map(t => careerSide(t, CAREER_CUT[2], g, CAREER_CUT[2].up));   // your club's own league first
  if (stage === 3) {
    const me = careerProSide(cr.pro), pool = CAREER_PRO_POOLS.find(p => p.includes(me)) || FRANCE;
    return shuffle(pool.filter(t => t !== me)).slice(0, 5).map(t => careerSide(t, null, g));
  }
  const me = careerNation(cr.country, cr), six = careerFemale(cr) ? womenSix() : NATIONS;
  return (six.includes(me) ? six.filter(t => t !== me) : nationsNearest(me, careerFemale(cr) ? 1 : 0)).map(t => careerSide(t, null, g));
}
/* A season: the championship's shape, with the weakest opponent first and the strongest last, as newChamp does. */
function careerNewSeason(cr) {
  const user = careerTeamFor(cr, cr.stage), five = careerOpponents(cr, cr.stage);
  const ranked = five.map((t, i) => ({ i:i + 1, r:rateOf(t) })).sort((a, b) => a.r - b.r || a.i - b.i);
  const order = [0, ranked[4].i, ranked[3].i, ranked[2].i, ranked[1].i, ranked[0].i];
  cr.seasons++;
  cr.season = { user:0, teams:[user, ...five], round:0, fixtures:roundRobin(order), results:[], id:'career-' + Date.now().toString(36) + '-' + cr.seasons.toString(36) };   // cleanChamp's shape and order, so a reload is the same season
  cr.trained = false;
  careerCupDraw(cr);
  return cr.season;
}
function careerCreate(o) {
  const pos = o && o.pos === 'F' ? 'F' : 'B', nums = CAREER_POS[pos];
  const club = cleanSide(o && o.club);
  if (!club) return null;
  const skills = {};
  const stage = Number.isInteger(o && o.start) && o.start >= 0 && o.start < CAREER_STARTS.length ? o.start : 0;
  for (const k of careerSkillKeys()) skills[k] = (CAREER_START[pos][k] || CAREER_BASE) + CAREER_STARTS[stage];
  const cr = { name:careerName(o.name), pos, num:nums.includes(o.num) ? o.num : nums[0], club, pro:null, country:null, skills, look:careerLook(o.look),
    stage, seasons:0, season:null, trained:false, history:[], totals:{ matches:0, tries:0, tackles:0, goals:0 } };
  careerNewSeason(cr);
  return cr;
}
const careerWhoStarts = who => (who ? [0, 1] : [1, 2]);   // 0 Me: Juniors or Adult. 1 My Child: Minis or Juniors
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
  return { place, ovr, final, top, bar, promoted:!final && (top || bar || !!st.festival) };
}
/* Going up to Pro Club: the draw must not decide how hard the stage is, so a first signing is only a side whose rivals are a step above Club (their mean at least Club's best) and that is not far above or below them. gap: its overall less its rivals' mean.
   That leaves out England 2, whose rivals are Club's level; Dublin and Bordeaux, which won nearly everything (98% and 99% for the scripted bot, margins of +26 and +32), and the other sides well clear of their list; and the sides far under theirs, Cork and Ballymena. They are still on their lists to meet, and a saved career already at one stays. */
const CAREER_SIGN = { rivals:64, gap:[-7, -2.5] };
function careerRivals(t) { const list = CAREER_PRO_POOLS.find(p => p.includes(t)).filter(o => o !== t); return list.reduce((a, o) => a + overallOf(o), 0)/list.length; }
const careerSignable = () => CAREER_PRO_POOLS.flat().filter(t => { const m = careerRivals(t), gap = overallOf(t) - m; return m >= CAREER_SIGN.rivals && gap >= CAREER_SIGN.gap[0] && gap <= CAREER_SIGN.gap[1]; });
function careerSign(cr) {
  const all = careerSignable();
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
    if (cr.stage === 4) cr.country = careerNations(cr).some(t => t.id === country) ? country : (cr.country || 'ENG');
  }
  careerNewSeason(cr);
  careerLast = null;
  save();
  return true;
}
function careerEnd() { if (practice) return; career = null; careerLast = null; save(); }   // Start New Career, or Start Fresh

/* ---------- training ---------- */
function careerDrills(cr) {                          // the drills that exist right now for this stage, in the career's order; no contact game at the Kids level
  const have = new Map(PRACTICE_DRILLS.map(d => [d.id, d]));
  const list = CAREER_STAGE_DRILLS[CAREER_STAGES[(cr && cr.stage) || 0].id] || CAREER_STAGE_DRILLS.adult;
  return CAREER_DRILL_ORDER.filter(id => list.includes(id) && have.has(id) && !(have.get(id).contact && kidsLevel()))
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
const CAREER_CAP = { matches:3, secs:4 };            // the kick-off caption: a player's first matches, this long on M.rt. Over the play, never stopping it
const careerCaption = () => !!(M && M.career && M.capUntil > M.rt && !M.cut && !M.tut && !M.paused && !M.over && !practice);
function careerArm() {                               // straight after startMatch: this match is a career match
  if (!M || !career) return;
  M.career = true;
  M.careerP = M.players.find(p => p.team === 0 && p.n === career.num) || M.players.find(p => p.team === 0);
  M.careerNat = careerNatFor(M.nat[0], career.skills);
  M.careerDeeds = { tries:0, tackles:0, goals:0 };
  const push = M.di < 2 ? CAREER_PUSH[career.stage] : 0;
  if (push) { const d = M.early && earlyDiff ? earlyDiff : DIFF[M.di], o = { ...d }; for (const k in d) o[k] = d[k] + push*(DIFF[2][k] - DIFF[1][k]); earlyDiff = o; M.early = true; }   // the engine's one way to change a match's levers (diffOf); a new match clears it
  M.capUntil = settings.hints && career.totals && career.totals.matches < CAREER_CAP.matches ? M.rt + CAREER_CAP.secs : 0;
  careerKickoff();
}
function careerPlay() {                              // Play Match on the hub
  const cr = career, c = cr && cr.season;
  if (practice || !c || c.round >= 5) return false;
  const due = careerCupDue(cr);
  if (due) return careerCupPlay(cr, due);
  const { opp } = userFixture(c);
  const mine = c.teams[c.user];                      // your player's look is on the squad entry, for this match; a save from before it has none
  if (!startMatch(cr.look ? { ...mine, squad:[{ n:cr.num, look:cr.look }] } : mine, c.teams[opp], false, careerMatchOpts(cr))) return false;   // no match started: nothing to arm
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
  if (M && M.career && M.careerCup) return careerCupRecord();
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
  careerCupTick(cr);
  careerSettle(cr);
  save();
  return true;
}
function careerSettle(cr) {                          // going up from Club to Pro Club: sign at the season's end, so the screen can name the club
  const out = careerOutcome(cr);
  if (!out || !out.promoted || cr.stage !== 2 || cr.pro) return false;
  careerSign(cr);
  return true;
}

/* ---------- the county cup ----------
   A stage with cup:true runs its county's knockout beside the league (src/competitions.js), in cr.cup, never in the season, so the five-round league and everything that reads it stay as they were.
   A tie is due before the league round CUP_AT says, and is the next match until it is played; the last is done before the last league round, so a season always ends with its cup finished.
   Cup rules for the ladder: a cup match counts in the totals but gives no skill points, and a cup never decides promotion. So the ladder is what it was. */
const CUP_AT = [1, 3, 4];                            // league rounds played when each tie falls due
const CAREER_TROPHIES = 40;
function careerCupDraw(cr) {
  delete cr.cup;
  const st = CAREER_STAGES[cr.stage];
  if (!st.cup) return;
  const club = careerClubNow(cr), g = careerStageG(cr, cr.stage), cut = CAREER_CUT[cr.stage];
  cr.cup = cupNew(compCupFor(club), [careerTeamFor(cr, cr.stage), ...compCupRivals(club).map(t => careerSide(t, cut, g, cut.up))]);
}
function careerCupDue(cr) {                          // your tie, when it is the next match
  const cup = cr && cr.cup, c = cr && cr.season;
  if (!cup || !c || cup.tie >= CUP_AT.length || c.round < CUP_AT[cup.tie]) return null;
  return cupUserTie(cup);
}
function careerCupTick(cr) {                         // once you are out, the rest of the draw plays on when each tie falls due
  const cup = cr.cup, c = cr.season;
  while (cup && c && cup.tie < CUP_AT.length && c.round >= CUP_AT[cup.tie] && !cupUserTie(cup)) cupPlayTie(cup, null);
}
function careerCupPlay(cr, due) {
  const cup = cr.cup, opp = due.pair[0] === cup.user ? due.pair[1] : due.pair[0], mine = cup.teams[cup.user];
  if (!startMatch(cr.look ? { ...mine, squad:[{ n:cr.num, look:cr.look }] } : mine, cup.teams[opp], false, careerMatchOpts(cr))) return false;
  careerArm();
  M.careerCup = true;                                // read by goldenOn: a tie level at the hooter goes to sudden death
  return true;
}
function careerCupRecord() {
  const cr = career, cup = cr && cr.cup, due = careerCupDue(cr);
  if (!due || !M || !M.career || M.demo || M.two || practice || M.careerDone) return false;
  M.careerDone = true;
  const home = due.pair[0] === cup.user;
  const mine = home
    ? { h:due.pair[0], a:due.pair[1], hs:M.score[0], as:M.score[1], ht:M.tries[0], at:M.tries[1] }
    : { h:due.pair[0], a:due.pair[1], hs:M.score[1], as:M.score[0], ht:M.tries[1], at:M.tries[0] };
  cupPlayTie(cup, mine);
  const said = cupTieLine(cup, mine, due.plate), deeds = M.careerDeeds || {}, T = cr.totals;
  T.matches++; T.tries += deeds.tries || 0; T.tackles += deeds.tackles || 0; T.goals += deeds.goals || 0;
  if (said.trophy) cr.trophies = [...(cr.trophies || []), { name:said.trophy, season:cr.seasons }].slice(-CAREER_TROPHIES);
  careerLast = { kind:'cup', gains:{}, line:said.line };
  careerCupTick(cr);
  save();
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
    const e = { stage:careerInt(h.stage, 0, CAREER_STAGES.length - 1), name:h.stage <= 1 && club.id === 'HAR' && !club.key && !club.custom ? club.name : String(h.name || '').replace(/\s+/g, ' ').trim().slice(0, 24), place:careerInt(h.place, 1, 6), up:!!h.up,
      w:careerInt(h.w, 0, 5), d:careerInt(h.d, 0, 5), l:careerInt(h.l, 0, 5) };
    if (e.stage == null || e.place == null || e.w == null || e.d == null || e.l == null || !e.name) continue;
    history.push(e);
  }
  let season = c.season == null ? null : cleanChamp(c.season);   // a broken season is dropped; the hub draws a new one for the same stage
  if (season && stage === 2 && season.teams[season.user].id === 'SUR') season = null;   // a County season from before the Club stage: the same stage, drawn again at your club
  const looks = c.look && typeof c.look === 'object' && !Array.isArray(c.look) ? { look:careerLook(c.look) } : {};   // no look is a save from before it: male, and men's sides
  const cup = season && CAREER_STAGES[stage].cup ? cleanCup(c.cup) : null;   // none in a save from before cups, or if broken: that season plays on without one
  const trophies = Array.isArray(c.trophies) ? c.trophies.slice(-CAREER_TROPHIES).map(t => ({ name:typeof t?.name === 'string' ? t.name.trim().slice(0, 32) : '', season:careerInt(t?.season, 0, 100000) })).filter(t => t.name && t.season != null) : [];
  return { name:careerName(c.name), pos, num:CAREER_POS[pos].includes(c.num) ? c.num : CAREER_POS[pos][0], club,
    pro:CAREER_PRO_POOLS.flat().some(t => t.id === c.pro) ? c.pro : null, country:careerNations(looks).some(t => t.id === c.country) ? c.country : (stage === 4 ? 'ENG' : null),
    skills, ...looks, stage, seasons:careerInt(c.seasons, 0, 100000) || 0, season, trained:c.trained === true && !!season && season.round < 5, history, totals, ...(cup ? { cup } : {}), ...(trophies.length ? { trophies } : {}) };
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
  if (sx < 0 || sx > V.W || sy < 0 || sy > V.H) { BV.edges.length = 0; edgeTag(sx, sy, careerEdgeCol(), 'star', safeInsets()); return; }
  careerStar(sx, sy, r, careerCol());
}
