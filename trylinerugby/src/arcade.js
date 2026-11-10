/* ---------- arcade ----------
   On Fire, the louder Big Hit and the Golden Try. Only a match you play has them (newMatch's opts.arcade, which startMatch
   passes): AI v AI, the demo, practice and the balance tools never do, so every sim and suite that ran before still runs the
   same. Both sides can go On Fire, the CPU included. The Golden Try is for Quick Match and Two Player: a championship is a
   league, and a league keeps its draws. */
const ARCADE = {
  fire:{ need:3, secs:12, speed:1.06, hands:0.5, pts:{ break:0, hit:1, turnover:1, try:2, line:1 } },   // 3 points unanswered (about two a match at the middle length) lights it for 12 match seconds: 6% quicker, half the handling errors. A try is worth two; a broken tackle (90-odd a match) only breaks the other side's run; a Line Break (src/edge.js, Easy only) is worth one. On Easy your side needs EDGE.fire.need and burns EDGE.fire.secs (fireNeed, fireSecs)
  hit:{ jolt:0.12, stop:180, shake:0.28, hitShake:0.18 },    // your Big Hit: an extra 12% chance the ball spills, a 180ms freeze and a harder shake; taking one shakes too
  golden:{ len:0.5 },                                         // sudden-death extra time is half a half; still level at its hooter, the draw stands
};
const onFire = t => !!(M && M.arcade && M.fire[t].t > 0);
/* A good moment for side t: a broken tackle, a Big Hit, a turnover won or a try. Each breaks the other side's run; all but the broken tackle build this one's. */
function heat(t, why) {
  if (!M || !M.arcade) return;
  const F = M.fire[t], O = M.fire[1 - t];
  O.heat = 0;
  st('heat_' + why);
  if (F.t > 0) return;                                        // already alight: the run starts again when it goes out
  const need = fireNeed(t);                                   // ARCADE.fire.need, or on Easy your side's EDGE.fire.need (src/edge.js)
  F.heat = Math.min(need, F.heat + ((edgeOn(t) && EDGE.fire.pts || ARCADE.fire.pts)[why] || 0));   // on Easy your side's moments are EDGE.fire.pts
  if (F.heat < need) return;
  F.heat = 0; F.t = fireSecs(t)*staminaLasts(t); st('fire' + t);   // longer or shorter by the side's Stamina (src/stamina.js); on Easy yours burns EDGE.fire.secs
  say('On Fire', 'big fire', t); sfx('roar'); buzz(50, t);
}
function fireOut(t) { if (M && M.arcade) { M.fire[t].t = 0; M.fire[t].heat = 0; } }
function fireTick(dt) { if (M.arcade) for (const F of M.fire) if (F.t > 0) F.t = Math.max(0, F.t - dt); }

/* The Golden Try: level at the end of the second half, play on until somebody scores. A cup's knockout or Test has it too
   (M.cupKO, src/cups.js), in Championship mode or a career, since it cannot end level; a cup's pool keeps its draws. */
const goldenOn = () => !!(M && M.arcade && (M.cup ? M.cupKO : !M.champ && !M.career));   // a career season is a league too
const periodLen = () => M.golden ? M.halfLen*ARCADE.golden.len : M.halfLen;
function startGolden() {
  M.half = 3; M.golden = true; M.clock = 0; M.hooter = false;
  for (const t of [0, 1]) fireOut(t);
  sfx('horn'); st('golden');
  kickoff(M.firstKick);
  say('Golden Try', 'big');
}
function goldenScored() { if (M.golden) M.hooter = true; }   // any score in extra time wins it: the next dead ball ends the match
