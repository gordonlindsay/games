/* ---------- stamina ----------
   The fifth ability (staminaOf in data.js reads it, 3 when a team has none). Only a match you play feels it: the same M.arcade as
   On Fire, which only startMatch sets, so AI v AI, the demo, practice and the balance tools read every side as they always have.
   Each side by its own Stamina:
   - Sprint: the meter lasts STAMINA.len longer for each point above 3 and that much shorter below (5: 20% longer, 1: 20% shorter).
   - On Fire burns longer or shorter by the same measure.
   - Power fades over each half, in a straight line from nothing at the kick-off to its fade at the hooter, and is back at half time;
     top speed fades the same way, a little (staminaPace, read by maxSpeed). The owner chose this over a separate Stamina budget so
     that Stamina is worth its point when you make a team;
     extra time starts fresh. Every engine read of a side's Power goes through powerOf: the tackle and the Big Hit, the ruck, the
     scrum (the push and the scrum played for you) and the Get Past and Tackle duel windows.
   simMatch, the championship's other fixtures, ignores Stamina as it ignores the rest of the open game. */
const STAMINA = { len:0.10, fade:[2.0, 0.2], pace:[0.05, 0] };   // fade: Power lost by the hooter at Stamina 1 and at 5, in a straight line between (3 loses 1.1); pace: the share of top speed lost by the hooter, the same way (3 loses 2.5%)
/* All consts, not function declarations: a name another section also uses stops the build instead of quietly replacing one. */
const staminaOn = () => !!(M && M.arcade);
const staminaLasts = t => (staminaOn() ? 1 + (staminaOf(M.nat[t]) - 3)*STAMINA.len : 1);   // how much longer side t's Sprint meter and On Fire last
const staminaFade = t => {                                 // the Power side t has lost so far this half
  if (!staminaOn()) return 0;
  const [at1, at5] = STAMINA.fade, most = at1 + (staminaOf(M.nat[t]) - 1)*(at5 - at1)/4;
  return most*clamp(M.clock/M.halfLen, 0, 1);
};
const powerOf = t => M.nat[t].power - staminaFade(t);      // side t's Power as the engine plays it now
const staminaPace = t => {                                 // side t's top-speed multiplier this far into the half: tired legs late on
  if (!staminaOn()) return 1;
  const [at1, at5] = STAMINA.pace, most = at1 + (staminaOf(M.nat[t]) - 1)*(at5 - at1)/4;
  return 1 - most*clamp(M.clock/M.halfLen, 0, 1);
};
