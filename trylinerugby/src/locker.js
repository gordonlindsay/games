/* =========================================================
   The Locker: medals for feats, the balls and boots they unlock, and the Legends.

   The rules, all of them here:
   - A feat (LOCKER_FEATS) counts once in a match you play, at most, at full time (lockerMatch, from finishMatch): any level,
     Kids included, Quick Match, Championship, Career and Two Player alike. Never AI v AI, the demo, a drill or a tool's
     headless match (only a match you play reaches finishMatch with M.arcade). Two Player counts Player 1's side (side 0).
   - Bronze, Silver and Gold are a feat done 1, 3 and 10 times (LOCKER_TIERS). Star Pupil counts drills, each once, at three
     stars, so its Gold is every drill (8 today, never more than 10). The events (lockerEvent) count once a call, and once a
     match for one medal: 'champ' (Champions; the Championship's own league win calls it here), 'euro', 'world', 'tour' and
     'triple' (Silverware), 'callup' (Call-Up). 'transfer' has no medal yet and counts nothing.
   - Every Bronze and every Silver unlocks one ball or one pair of boots (each feat's unlock). Every Gold unlocks the next
     Legends side of each list, in date order: the nth Gold, the nth men's and the nth women's side. Nothing here is sold.
   - The match counts are plain counters on M.lk (drop goals and duel Big Hits by side, the half-time score), made only in a
     match you play; nothing here draws a random number, so AI v AI, the demo and every tool play exactly as before.
   - The chosen ball and boots are drawn only in a match you play (lockerBall, lockerBoots); AI v AI, the demo and the drills
     draw as they always have. The default ball and boots (Classic, Black) draw as today too.
   - The save is one field, locker (cleanLocker), written only once something is in it, so an old save loads with nothing
     earned and a save with nothing earned stays as it was. A drill's three stars wait for the drill to end before saving,
     so a drill never writes the save while its settings are the drill's own.
   ========================================================= */
const LOCKER_TIERS = [1, 3, 10];                            // Bronze, Silver, Gold
const LOCKER_MEDALS = ['Bronze', 'Silver', 'Gold'];
const LOCKER_MAX = 9999;                                     // a count stops here
/* Each feat: its name (a label, Title Case), its line (one plain sentence for a child), and the ball or boots its Bronze and its
   Silver unlock ('ball:pink', 'boots:red'). Match feats first, in the order of the Locker's grid. */
const LOCKER_FEATS = [
  { id:'hat',      name:'Hat-Trick',     line:'Score 3 tries in a match.',       unlock:['ball:white', 'boots:red'] },
  { id:'sharp',    name:'Sharpshooter',  line:'Kick 3 goals in a match.',        unlock:['boots:white', 'ball:sky'] },
  { id:'hit',      name:'Big Hitter',    line:'Make 3 Big Hits in a match.',     unlock:['ball:red', 'boots:blue'] },
  { id:'clean',    name:'Clean Sheet',   line:'Win and let in no tries.',        unlock:['boots:sky', 'ball:blue'] },
  { id:'golden',   name:'Golden Try',    line:'Win in Golden Try.',              unlock:['ball:orange', 'boots:yellow'] },
  { id:'comeback', name:'Comeback',      line:'Win after losing at half time.',  unlock:['boots:orange', 'ball:purple'] },
  { id:'drop',     name:'Drop Goal',     line:'Score a drop goal.',              unlock:['ball:pink', 'boots:pink'] },
  { id:'fire',     name:'On Fire Twice', line:'Go On Fire twice in a match.',    unlock:['boots:neon', 'ball:neon'] },
  { id:'champ',    name:'Champions',     line:'Win a Championship.',             unlock:['boots:silver', 'ball:gold'] },
  { id:'star',     name:'Star Pupil',    line:'Get 3 stars in a drill.',         unlock:['boots:purple', 'ball:stripes'] },
  { id:'silver',   name:'Silverware',    line:'Win a cup or a crown.',           unlock:['ball:silver', 'boots:gold'] },
  { id:'callup',   name:'Call-Up',       line:'Get called up.',                  unlock:['boots:rainbow', 'ball:rainbow'] },
];
const LOCKER_EVENTS = { champ:'champ', euro:'silver', world:'silver', tour:'silver', triple:'silver', callup:'callup' };   // lockerEvent's ids and the medal each counts toward
/* The balls: the first is the ball as it always was. band: two stripes; rainbow: the colours along it; shine: a gold sheen. */
const LOCKER_BALLS = [
  { id:'classic', name:'Classic',  fill:'#f6f3ea', line:'#3b2f22' },
  { id:'white',   name:'White',    fill:'#ffffff', line:'#56626b' },
  { id:'pink',    name:'Pink',     fill:'#ff7eb6', line:'#6e1a44' },
  { id:'neon',    name:'Neon',     fill:'#dcff3d', line:'#465400' },
  { id:'sky',     name:'Sky Blue', fill:'#6fc8f2', line:'#123c52' },
  { id:'orange',  name:'Orange',   fill:'#ff8a2a', line:'#552700' },
  { id:'red',     name:'Red',      fill:'#ec3440', line:'#470a10' },
  { id:'blue',    name:'Blue',     fill:'#3a7bff', line:'#0d2260' },
  { id:'purple',  name:'Purple',   fill:'#a274ff', line:'#2c1060' },
  { id:'silver',  name:'Silver',   fill:'#cfd6db', line:'#3c464d', shine:true },
  { id:'stripes', name:'Stripes',  fill:'#f6f3ea', line:'#1b2747', band:'#c8102e' },
  { id:'rainbow', name:'Rainbow',  fill:'#f6f3ea', line:'#3b2f22', rainbow:true },
  { id:'gold',    name:'Gold',     fill:'#ffcf3d', line:'#5e4100', shine:true },
];
/* The boots: the first, Black, is the default and draws as today (the top view shows no boots). */
const LOCKER_BOOTS = [
  { id:'black',   name:'Black',      col:'#1c1c1c' },
  { id:'white',   name:'White',      col:'#f6f3ea' },
  { id:'red',     name:'Red',        col:'#ec3440' },
  { id:'blue',    name:'Blue',       col:'#3a7bff' },
  { id:'neon',    name:'Neon Green', col:'#7dff3d' },
  { id:'pink',    name:'Pink',       col:'#ff6fb0' },
  { id:'orange',  name:'Orange',     col:'#ff8a2a' },
  { id:'sky',     name:'Sky Blue',   col:'#6fc8f2' },
  { id:'purple',  name:'Purple',     col:'#a274ff' },
  { id:'yellow',  name:'Yellow',     col:'#ffe03d' },
  { id:'silver',  name:'Silver',     col:'#cfd6db' },
  { id:'rainbow', name:'Rainbow',    col:'#ff4f4f', rainbow:true },
  { id:'gold',    name:'Gold',       col:'#ffcf3d' },
];
const LOCKER_RAINBOW = ['#ff4f4f', '#ff9a2a', '#ffe03d', '#5fd35f', '#3a9bff', '#8a5cff'];
/* The Legends: the sides that won a World Cup, named by nation and year only (never a player's name, likeness or nickname), in
   date order, men's then women's. Ratings at the top of the scale: every ability 5 (overall 99) or one 4 (96); style is the side's
   strength, as the Locker shows it. Kit colours are the nation's. A women's side already says Women, with cat 'women', so the team
   screen's Men | Women | Minis (catSide) leaves its name alone. Codes are unique across every list: L and the year, W and the year. */
const LEGEND_KIT = {
  'New Zealand':  { kit:'#1c1c1c', trim:'#f2efe6', alt:'#f2efe6', altTrim:'#1c1c1c' },
  'Australia':    { kit:'#f2b01e', trim:'#0f5a32', alt:'#0f5a32', altTrim:'#f2b01e' },
  'South Africa': { kit:'#0f5a32', trim:'#f2b01e', alt:'#f2efe6', altTrim:'#0f5a32' },
  'England':      { kit:'#f2efe6', trim:'#c8102e', alt:'#1b2747', altTrim:'#c8102e' },
  'USA':          { kit:'#1b2747', trim:'#c8102e', alt:'#f2efe6', altTrim:'#1b2747' },
};
function legend(cat, nation, year, style, low) {             // low: the one ability at 4, or null for all 5s
  const t = { id:(cat === 'women' ? 'W' : 'L') + String(year).slice(2), name:nation + ' ' + year + (cat === 'women' ? ' Women' : ''), nation, year, cat, style, legend:true, ...LEGEND_KIT[nation] };
  for (const [k] of ABILITIES) t[k] = k === low ? 4 : 5;
  return t;
}
const LEGENDS = [
  legend('men', 'New Zealand', 1987, 'pace', 'kicking'),
  legend('men', 'Australia', 1991, 'handling', 'power'),
  legend('men', 'South Africa', 1995, 'power', 'pace'),
  legend('men', 'Australia', 1999, 'stamina', 'handling'),
  legend('men', 'England', 2003, 'kicking', 'pace'),
  legend('men', 'South Africa', 2007, 'power', 'handling'),
  legend('men', 'New Zealand', 2011, 'handling', 'kicking'),
  legend('men', 'New Zealand', 2015, 'pace', null),
  legend('men', 'South Africa', 2019, 'power', 'pace'),
  legend('men', 'South Africa', 2023, 'stamina', null),
  legend('women', 'USA', 1991, 'pace', 'kicking'),
  legend('women', 'England', 1994, 'power', 'pace'),
  legend('women', 'New Zealand', 1998, 'handling', 'kicking'),
  legend('women', 'New Zealand', 2002, 'power', 'kicking'),
  legend('women', 'New Zealand', 2006, 'stamina', 'kicking'),
  legend('women', 'New Zealand', 2010, 'handling', null),
  legend('women', 'England', 2014, 'kicking', 'pace'),
  legend('women', 'New Zealand', 2017, 'pace', 'power'),
  legend('women', 'New Zealand', 2021, 'pace', 'kicking'),   // the 2021 World Cup, played in 2022
  legend('women', 'England', 2025, 'power', null),
];

/* ---------- the record ---------- */
const lockerFresh = () => ({ n:{}, drills:[], ball:LOCKER_BALLS[0].id, boots:LOCKER_BOOTS[0].id, seen:{} });
let locker = lockerFresh();
let lockerDirty = false;                                     // a drill's three stars, waiting to be saved once the drill is over
const lockerFeat = id => LOCKER_FEATS.find(f => f.id === id);
const lockerStarMax = () => Math.min(LOCKER_TIERS[2], typeof PRACTICE_DRILLS !== 'undefined' ? PRACTICE_DRILLS.length : LOCKER_TIERS[2]);
const lockerTiers = id => (id === 'star' ? [LOCKER_TIERS[0], LOCKER_TIERS[1], lockerStarMax()] : LOCKER_TIERS);
const lockerCount = id => (id === 'star' ? locker.drills.length : locker.n[id] || 0);
const lockerTier = id => { const n = lockerCount(id); return lockerTiers(id).filter(c => n >= c).length; };   // 0 none, 1 Bronze, 2 Silver, 3 Gold
const lockerNext = id => { const t = lockerTier(id); return t < 3 ? lockerTiers(id)[t] : null; };          // the count the next medal needs
const lockerGolds = (tiers = id => lockerTier(id)) => LOCKER_FEATS.filter(f => tiers(f.id) === 3).length;
/* What unlocks an item: the feat and the tier (1 Bronze, 2 Silver), or null for the default. */
function lockerSource(kind, id) {
  for (const f of LOCKER_FEATS) { const i = f.unlock.indexOf(kind + ':' + id); if (i >= 0) return { feat:f, tier:i + 1 }; }
  return null;
}
const lockerHas = (kind, id) => { const s = lockerSource(kind, id); return s ? lockerTier(s.feat.id) >= s.tier : (kind === 'ball' ? LOCKER_BALLS : LOCKER_BOOTS).some(x => x.id === id); };
const lockerItem = (kind, id) => (kind === 'ball' ? LOCKER_BALLS : LOCKER_BOOTS).find(x => x.id === id) || null;
/* The unlocked Legends of one list: 'men' or 'women' (minis play the men's). The team screen's International list shows them. */
function lockerLegends(cat) {
  const c = cat === 'women' ? 'women' : 'men';
  return LEGENDS.filter(t => t.cat === c).slice(0, lockerGolds());
}
function lockerAdd(id) { locker.n[id] = Math.min(LOCKER_MAX, (locker.n[id] || 0) + 1); }

/* ---------- counting ---------- */
const lockerSide = () => (M && M.side ? M.side.findIndex(s => s.human) : -1);   // your side: the human one, Player 1's in Two Player
const lockerCounts = () => !!(M && M.arcade && !M.demo && !M.auto && !practice && lockerSide() >= 0);
function lockerTally(key, team) {                            // engine hooks: a drop goal ('drops') or a duel's Big Hit ('hits') by side team
  if (!lockerCounts()) return;
  const k = M.lk || (M.lk = { drops:[0, 0], hits:[0, 0], ht:null });
  k[key][team]++;
}
function lockerHalf() {                                      // the second half starts: the half-time score, for Comeback
  if (!lockerCounts()) return;
  (M.lk || (M.lk = { drops:[0, 0], hits:[0, 0], ht:null })).ht = M.score.slice();
}
/* Full time in a match you play: each feat done counts once, then a Championship won. Called once a match (finishMatch). */
function lockerMatch() {
  if (!lockerCounts() || M.lockerDone) return [];
  M.lockerDone = true;
  lockerFrom();
  const me = lockerSide(), op = 1 - me, S = M.stats, k = M.lk || { drops:[0, 0], hits:[0, 0], ht:null };
  const won = M.score[me] > M.score[op];
  const done = {
    hat: M.tries[me] >= 3,
    sharp: S.conv.made[me] + S.pen.made[me] + k.drops[me] >= 3,   // conversions, penalty goals and drop goals
    hit: (S['dom' + me] || 0) + k.hits[me] >= 3,                  // Big Hits in open play and in a Tackle duel
    clean: won && M.tries[op] === 0,
    golden: won && !!M.golden,
    comeback: won && !!k.ht && k.ht[me] < k.ht[op],
    drop: k.drops[me] >= 1,
    fire: (S['fire' + me] || 0) >= 2,
  };
  const ids = Object.keys(done).filter(id => done[id]);
  for (const id of ids) lockerAdd(id);
  if (M.champ && champ && champ.round >= 5 && standings(champ)[0].i === champ.user && lockerEvent('champ')) ids.push('champ');   // the Championship's own league win
  save();
  return ids;
}
/* Another part of the game says a moment happened: true when it counted. Callers outside this file use
   typeof lockerEvent === 'function' && lockerEvent(id). */
function lockerEvent(id) {
  const f = LOCKER_EVENTS[id];
  if (!f || practice) return false;
  if (M && M.arcade && !M.demo && !M.auto) { lockerFrom(); const ev = M.lockerEv || (M.lockerEv = []); if (ev.includes(f)) return false; ev.push(f); }   // once a match for one medal
  lockerAdd(f);
  save();
  return true;
}
/* A drill finished with its stars (practiceFinish): three stars in a drill not yet counted counts toward Star Pupil. Saved once
   the drill is over (lockerFlush, from practiceRestore), never while the drill's own settings are in place. */
function lockerDrill(id, stars) {
  if (stars < 3 || locker.drills.includes(id) || !PRACTICE_DRILLS.some(d => d.id === id)) return false;
  locker.drills = PRACTICE_DRILLS.map(d => d.id).filter(d => d === id || locker.drills.includes(d));
  lockerDirty = true;
  return true;
}
function lockerFlush() { if (lockerDirty && !practice) { lockerDirty = false; save(); } }

/* ---------- what is new ---------- */
const lockerSeen = id => Math.min(locker.seen[id] || 0, lockerTier(id));
const lockerNew = () => LOCKER_FEATS.some(f => lockerTier(f.id) > lockerSeen(f.id));
/* The tiers as a match you play began, kept on M (M.lkFrom) before its first count: at full time (lockerMatch) or at an event inside
   it, whichever comes first. Every count in a match goes through those two, so this is the Locker as the match found it, and the
   full-time card shows only what the match itself won. */
function lockerFrom() {
  if (!M.lkFrom) M.lkFrom = Object.fromEntries(LOCKER_FEATS.map(f => [f.id, lockerTier(f.id)]));
  return M.lkFrom;
}
/* Each medal won since `from` (a feat's tier then; the last one shown by default): { feat, tier, item } (item null for a Gold), and
   the Legends the new Golds bring. */
function lockerNews(from = lockerSeen) {
  const medals = [];
  for (const f of LOCKER_FEATS) for (let t = from(f.id) + 1; t <= lockerTier(f.id); t++) {
    const u = t < 3 ? f.unlock[t - 1].split(':') : null;
    medals.push({ feat:f, tier:t, item:u ? { kind:u[0], ...lockerItem(u[0], u[1]) } : null });
  }
  const g0 = Math.min(10, lockerGolds(from)), g1 = Math.min(10, lockerGolds());
  const legends = [];
  for (let i = g0; i < g1; i++) legends.push(LEGENDS.filter(t => t.cat === 'men')[i], LEGENDS.filter(t => t.cat === 'women')[i]);
  return { medals, legends };
}
function lockerMarkSeen(ids) {                               // the medals shown: every feat (the Locker), or only those listed (the full-time card)
  let changed = false;
  for (const f of LOCKER_FEATS) { if (ids && !ids.includes(f.id)) continue; const t = lockerTier(f.id); if ((locker.seen[f.id] || 0) !== t) { locker.seen[f.id] = t; changed = true; } }
  if (changed) save();
}

/* ---------- picking ---------- */
function lockerPick(kind, id) {                              // the Locker's swatches: only an unlocked one
  if (!lockerItem(kind, id) || !lockerHas(kind, id)) return false;
  locker[kind] = id; save();
  return true;
}

/* ---------- the save ---------- */
/* What the save keeps: undefined until something is earned or picked, so a save with nothing in the Locker is as it was. */
function lockerSaved() {
  const n = {};
  for (const f of LOCKER_FEATS) if (f.id !== 'star' && locker.n[f.id] > 0) n[f.id] = locker.n[f.id];
  const seen = {};
  for (const f of LOCKER_FEATS) if (locker.seen[f.id] > 0) seen[f.id] = locker.seen[f.id];
  const empty = !Object.keys(n).length && !locker.drills.length && locker.ball === LOCKER_BALLS[0].id && locker.boots === LOCKER_BOOTS[0].id && !Object.keys(seen).length;
  return empty ? undefined : { n, drills:locker.drills.slice(), ball:locker.ball, boots:locker.boots, seen };
}
/* A saved Locker, read back: anything unknown or broken is dropped, counts are whole and bounded, and a ball or boots not unlocked
   by those counts goes back to the default. Never throws; anything unreadable is a Locker with nothing in it. */
function cleanLocker(v) {
  const out = lockerFresh();
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  if (v.n && typeof v.n === 'object' && !Array.isArray(v.n)) for (const f of LOCKER_FEATS) {
    const c = v.n[f.id];
    if (f.id !== 'star' && Number.isInteger(c) && c > 0) out.n[f.id] = Math.min(LOCKER_MAX, c);
  }
  const ids = typeof PRACTICE_DRILLS !== 'undefined' ? PRACTICE_DRILLS.map(d => d.id) : [];
  if (Array.isArray(v.drills)) out.drills = ids.filter(id => v.drills.includes(id));
  const keep = locker; locker = out;                       // read the tiers from the cleaned counts
  try {
    if (typeof v.ball === 'string' && lockerHas('ball', v.ball)) out.ball = v.ball;
    if (typeof v.boots === 'string' && lockerHas('boots', v.boots)) out.boots = v.boots;
    if (v.seen && typeof v.seen === 'object' && !Array.isArray(v.seen)) for (const f of LOCKER_FEATS) {
      const s = v.seen[f.id];
      if (Number.isInteger(s) && s > 0 && lockerTier(f.id) > 0) out.seen[f.id] = Math.min(s, lockerTier(f.id));
    }
  } finally { locker = keep; }
  return out;
}

/* ---------- drawing: two hooks for the renderer ----------
   lockerBall(): the ball's look in a match you play ({ fill, line, band?, rainbow?, shine? }), or null to draw the classic ball.
   lockerBoots(team, p): the colour of man p's boots, or null for no boots in the top view and black ones in a close-up (the default
   Black, the other side, a career teammate, AI v AI, the demo and the drills). p null is a close-up's figure: the side's colour
   (Rainbow's first), but none in a career match, where only his are coloured. Both read nothing but the Locker and M; lockerBallFill
   and lockerFeet are the current renderer's own use of them (src/render-pitch.js, src/render-setpieces.js, src/render-goals.js). */
const lockerDraws = () => !!(M && M.arcade && !M.demo && !M.auto && !practice);
function lockerBall() {
  if (!lockerDraws() || locker.ball === LOCKER_BALLS[0].id) return null;
  return lockerItem('ball', locker.ball);
}
function lockerBoots(team, p) {
  if (!lockerDraws() || locker.boots === LOCKER_BOOTS[0].id || team !== Math.max(0, lockerSide())) return null;
  if (M.career && p !== M.careerP) return null;              // a career match: his boots only
  const b = lockerItem('boots', locker.boots);
  return b ? (b.rainbow ? LOCKER_RAINBOW[((p && p.n) || 0) % LOCKER_RAINBOW.length] : b.col) : null;
}
/* The ball's fill along its length, in the ball's own frame (x from -rx to rx): a colour, or a gradient for the patterns. */
function lockerBallFill(look, rx) {
  if (!look.band && !look.rainbow && !look.shine) return look.fill;
  const g = ctx.createLinearGradient(-rx, 0, rx, 0);
  if (look.rainbow) LOCKER_RAINBOW.forEach((c, i) => g.addColorStop(i/(LOCKER_RAINBOW.length - 1), c));
  else if (look.band) [0, 0.26, 0.38, 0.62, 0.74, 1].forEach((at, i, a) => { if (i) { const c = i % 2 ? look.fill : look.band; g.addColorStop(a[i - 1], c); g.addColorStop(at, c); } });   // two bands, a third of the way in from each end
  else { g.addColorStop(0, look.fill); g.addColorStop(0.42, '#ffffff'); g.addColorStop(0.58, look.fill); g.addColorStop(1, look.line); }
  return g;
}
/* Two boots under man p, in his own turned frame (x along his facing), drawn before his body so only the toes show as he runs. */
function lockerFeet(col, r, p) {
  const sp = hyp(p.vx, p.vy), a = Math.min(1, sp/6)*0.55*Math.sin((M.rt || 0)*(4 + sp*1.3) + p.n*1.7);
  ctx.fillStyle = col;                                       // the outline and its width are the body's, already set
  for (const [s, y] of [[1, -0.32], [-1, 0.32]]) { ellipse(r*(0.32 + s*a), r*y, r*0.3, r*0.18); ctx.fill(); ctx.stroke(); }
}
