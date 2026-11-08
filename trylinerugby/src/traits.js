/* =========================================================
   Star traits: a few men with something special, as FIFA's players have traits.

   The rules, all of them here:
   - Six traits, one row each in TRAITS: the ability that brings it, the career skill and number that unlock it, the shirts it
     fits (sevens: 1 to 3 forwards, 4 scrum-half, 5 fly-half, 6 centre, 7 wing). Every effect size is in TRAIT.
   - A team: each ability at TRAIT.star (5) brings its trait(s), each on its own man: Pace a Burst wing, Power a Crunch forward
     and a Hand-Off centre, Handling a Safe Hands scrum-half, Kicking a Long Boot fly-half, Stamina an Engine forward. Which
     forward is the team's name's (traitHash), so a side keeps its stars from match to match; a shirt already taken moves the
     trait to the next one that fits, then to its unit, then anywhere. Built-in, custom and imported sides alike: it reads only
     the abilities, so nothing new is saved.
   - Your career player: each trait whose skill has reached its unlock (80; Hand-Off 90) is his, on him only. In a career match
     his shirt is his own, so a team star that would wear it moves along (traitsArm).
   - Only a match you play has them (M.arcade, as On Fire and Stamina): traitsArm hands them out at newMatch and careerArm, and
     traitOn reads false everywhere else, so AI v AI, the demo, practice and the balance tools play as they did.
     Every hook in the engine is a multiplier of exactly 1, a term of exactly 0 or the value handed in when traitOn is false.
   - A trait that decides a moment says so over the man (tag), at most once every TRAIT.gap seconds of play for each man; a
     small gold star sits on each star's shoulder in the top view (traitMarks, from render-match.js).
   ========================================================= */
const TRAITS = [   // in ABILITIES order; name is the label everywhere (cards, call-outs, the career hub)
  { id:'burst',   name:'Burst',      skill:'pace',     unlock:80, shirts:[7] },        // the wing
  { id:'crunch',  name:'Crunch',     skill:'power',    unlock:80, shirts:[1, 2, 3] },  // a forward
  { id:'handoff', name:'Hand-Off',   skill:'power',    unlock:90, shirts:[6] },        // the centre
  { id:'safe',    name:'Safe Hands', skill:'handling', unlock:80, shirts:[4] },        // the scrum-half
  { id:'boot',    name:'Long Boot',  skill:'kicking',  unlock:80, shirts:[5] },        // the fly-half
  { id:'engine',  name:'Engine',     skill:'stamina',  unlock:80, shirts:[1, 2, 3] },  // a forward
];
const TRAIT = {
  star:5,                                   // the ability a team needs for that ability's star(s)
  burst:{ top:0.08, acc:1.4 },              // sprinting: top speed 8% more at full burst, acceleration 40% more
  crunch:{ dom:0.15, jolt:0.05 },           // his made tackles: 15 points more chance of a Big Hit (dominant tackle), 5 more of the ball jolting loose
  handoff:{ hold:0.8 },                     // his carries: a tackle on him (not an ankle tap) holds 80% as often, and every one he breaks is a Fend (he keeps his speed)
  safe:{ hands:0.1, offload:0.4, hard:0.05 },   // a knock-on at the catch a tenth as likely; his offloads go astray 40% as often. The call-out is for a catch that was at least 5% to go down without it
  boot:{ roll:2.0, touch:10, band:1.35 },   // his tactical kick lands where the cross says and runs on twice as far; his side's kick to touch 10m further; his goal kicks' band 35% wider (he takes his side's place kicks)
  engine:{ fade:0.15, drain:0.5, late:0.5 },    // he feels 15% of what the half takes from his side's Power and pace, and his sprint drains the meter half as fast. The call-out: a sprint started in the second half of a period
  gap:4,                                    // seconds of play between one man's call-outs
};
const TRAIT_BY = Object.fromEntries(TRAITS.map(t => [t.id, t]));
const TRAIT_FWD = [1, 2, 3], TRAIT_BACKS = [4, 5, 6, 7], TRAIT_ALL = [1, 2, 3, 4, 5, 6, 7];
const traitHash = s => { let h = 2166136261; for (const ch of String(s == null ? '' : s)) h = Math.imul(h ^ ch.codePointAt(0), 16777619); return h >>> 0; };
const traitRot = (a, k) => a.map((_, i) => a[(i + k) % a.length]);

/* ---------- who has them ---------- */
/* A side's stars: shirt number to trait ids, in TRAITS order. taken: shirts already spoken for (your career player's). */
function teamStars(t, taken) {
  const out = new Map(), used = new Set(taken || []);
  if (!t || typeof t !== 'object') return out;
  const h = traitHash(t.name);
  TRAITS.forEach((tr, i) => {
    if (abilityOf(t, tr.skill) < TRAIT.star) return;
    const k = h >>> (i*4), unit = tr.shirts[0] <= 3 ? TRAIT_FWD : TRAIT_BACKS;
    const n = [...traitRot(tr.shirts, k % tr.shirts.length), ...traitRot(unit, k % unit.length), ...TRAIT_ALL].find(s => !used.has(s));
    if (n == null) return;
    used.add(n); out.set(n, [...(out.get(n) || []), tr.id]);
  });
  return out;
}
/* The team cards' line: the trait names, in TRAITS order. */
const teamTraitNames = t => [...teamStars(t).values()].flat().sort((a, b) => TRAITS.indexOf(TRAIT_BY[a]) - TRAITS.indexOf(TRAIT_BY[b])).map(id => TRAIT_BY[id].name);
/* Your career player's traits: each one his skill has reached. */
const careerTraitIds = cr => (cr && cr.skills ? TRAITS.filter(tr => (+cr.skills[tr.skill] || 0) >= tr.unlock).map(tr => tr.id) : []);
/* Hand them out for this match: newMatch, then careerArm once your player is known. Nothing outside a match you play. */
function traitsArm() {
  if (!M) return;
  for (const p of M.players) p.tr = null;
  if (!M.arcade) return;
  const mine = M.career && M.careerP ? M.careerP : null;
  for (const t of [0, 1]) {
    const stars = teamStars(M.nat[t], t === 0 && mine ? [mine.n] : null);
    for (const p of M.players) if (p.team === t && stars.has(p.n)) p.tr = Object.fromEntries(stars.get(p.n).map(id => [id, true]));
  }
  if (mine) { const ids = careerTraitIds(career); mine.tr = ids.length ? Object.fromEntries(ids.map(id => [id, true])) : null; }
}
const traitOn = (p, id) => !!(M && M.arcade && p && p.tr && p.tr[id]);

/* ---------- the call-out ---------- */
/* The trait's name over him when it decides a moment: counted each time (trait_<id>), shown at most once every TRAIT.gap
   seconds of play for each man. True when it showed. */
function traitCall(p, id, x, y) {
  if (!traitOn(p, id)) return false;
  st('trait_' + id);
  if (p.trAt != null && M.dclock - p.trAt < TRAIT.gap) return false;
  p.trAt = M.dclock;
  tag(TRAIT_BY[id].name, x == null ? p.x : x, y == null ? p.y : y);
  return true;
}

/* ---------- the engine's hooks ---------- */
/* Burst: the sprint's top speed and its acceleration (maxSpeed, steer). */
const traitBurst = (p, sp) => (traitOn(p, 'burst') ? 1 + TRAIT.burst.top*sp : 1);
const traitAcc = p => (p.sprint > 0 && traitOn(p, 'burst') ? TRAIT.burst.acc : 1);
/* Engine: his pace fade (maxSpeed hands in the side's staminaPace), his Power fade at the tackle (an edge, as Power points),
   and his sprint's drain on the meter. */
const traitPace = (p, k) => (traitOn(p, 'engine') ? 1 - (1 - k)*TRAIT.engine.fade : k);
const traitKeep = p => (traitOn(p, 'engine') ? staminaFade(p.team)*(1 - TRAIT.engine.fade) : 0);   // the Power the fade would have taken that he keeps
const traitEdge = (q, c) => traitKeep(q) - traitKeep(c);
const traitDrain = p => (traitOn(p, 'engine') ? TRAIT.engine.drain : 1);
function traitSprint(p) {                                  // a fresh sprint: Burst, or Engine late in a period
  if (traitCall(p, 'burst')) return;
  if (traitOn(p, 'engine') && M.clock >= TRAIT.engine.late*periodLen()) traitCall(p, 'engine');
}
/* Crunch and Hand-Off: the tackle. traitHold scales the chance a tackle on him holds; traitDom adds to his Big Hit chance. */
const traitHold = (c, mode) => (mode !== 'ankle' && traitOn(c, 'handoff') ? TRAIT.handoff.hold : 1);
const traitDom = q => (traitOn(q, 'crunch') ? TRAIT.crunch.dom : 0);
const traitJolt = q => (traitOn(q, 'crunch') ? TRAIT.crunch.jolt : 0);
const traitFend = c => traitOn(c, 'handoff');
/* Safe Hands: the catch (knock-on chance k) and the offload (success chance pOk). */
const traitHands = (p, k) => (traitOn(p, 'safe') ? k*TRAIT.safe.hands : k);
function traitCaught(p, k) { if (k >= TRAIT.safe.hard) traitCall(p, 'safe'); }   // a hard catch held: a kick, an intercept, under pressure or a long one
const traitOffload = (c, pOk) => (traitOn(c, 'safe') ? 1 - (1 - pOk)*TRAIT.safe.offload : pOk);
/* Long Boot: his tactical kick runs on (ball.js reads f.boot at the landing), his side's kick to touch goes further, and he
   takes his side's place kicks with a wider band. */
function traitKick(c) { if (!traitOn(c, 'boot') || !M.ball.f) return; M.ball.f.boot = true; traitCall(c, 'boot'); }
function traitTouch(team, x, y) {                          // metres more on a penalty kick to touch
  const p = M && M.arcade ? M.players.find(q => q.team === team && traitOn(q, 'boot')) : null;
  if (!p) return 0;
  traitCall(p, 'boot', x, y);
  return TRAIT.boot.touch;
}
const traitKicker = team => (M && M.arcade ? M.players.find(q => q.team === team && traitOn(q, 'boot')) || null : null);
function traitBand(g) {                                    // bandOf's multiplier on the goal kick's band: the man kicking it, or for a place kick the man who will
  if (!M || !M.arcade) return 1;
  const k = g.kicker || (g.type === 'set' ? (M.career && careerKicker(g.team)) || traitKicker(g.team) : null);
  return traitOn(k, 'boot') ? TRAIT.boot.band : 1;
}

/* ---------- drawing ---------- */
/* A small gold star on each star's right shoulder, over the men (render-match.js calls it once, after drawPlayer). Your career
   player has his own ring and star, so he is left out. */
function traitMarks(r) {
  if (!M || !M.arcade) return;
  const s = Math.max(4, r*0.5);
  for (const p of M.players) {
    if (!p.tr || (M.career && p === M.careerP)) continue;
    const [wx, wy] = drawPos(p), [x0, y0] = toS(wx, wy), x = x0 + r*0.95, y = y0 - r*0.95;
    if (x < -s || x > V.W + s || y < -s || y > V.H + s) continue;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI/2 + i*Math.PI/5, rr = i % 2 ? s*0.45 : s; ctx.lineTo(x + Math.cos(a)*rr, y + Math.sin(a)*rr); }
    ctx.closePath();
    ctx.fillStyle = '#ffcf3d'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = C.outline; ctx.stroke();
  }
}
