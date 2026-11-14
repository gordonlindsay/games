/* ---------- the edge: Easy, you against the CPU ----------
   The owner, 2026-11-10, who plays on Easy: "Provide more of an edge", then, choosing More Edge for You v the CPU, "It Just Feels
   Flat: nothing is wrong exactly; I want to feel more powerful: bigger runs, more line breaks, more tries for me".
   Who has it: a side a person plays against the CPU on Easy (levelOf 0, so Kids as well): Quick Match, Championship, Career, and in
   Pro Mode his own player (never a teammate the computer runs, proRun). Never Two Player, AI v AI, the demo, a drill, a tool's
   balance match, Normal or Hard: edgeOn reads M.arcade, which only startMatch asks for (AI v AI, the demo, the drills and the
   tools' balance matches are never arcade), and the human must face the CPU. Every lever reads edgeOn or edgeMan and draws no random
   number of its own, so with EDGE.on false (EDGE='{"on":false}' in the harness) the game plays exactly as 90353c3, draw for draw.
   - The Line Break. Your carrier gets past the last man in front of him: no standing defender ahead of him inside a window that is
     brk.lane metres across beside him (the lane the CPU's Sprint calls a clean break by, SPRINT.cpu.lane) and widens by brk.cone
     metres for every metre ahead, so the deep cover man still counts while he is placed to come across; where one was earlier in the
     same carry; none within brk.clear metres of him at all; running forward at brk.fwd m/s or more, brk.line metres or more out.
     Once a carry (a new carrier, or the same man's next catch, starts another): Line Break is called (the small banner in your
     colour, as Turnover and Intercepted are since the possession calls, so the run stays in sight; not within CALLS.lbGap seconds
     of a turnover or an interception on the same carrier, whose call that moment is, and carried over On Fire's banner while it
     shows: src/calls.js), a whoosh and the crowd, a heat point towards On Fire, and a brk.stop ms
     hit-stop with no shake, shorter than a Big Hit's 180 (never for Kids or Minis: matchMild). If the point lights On Fire, the On
     Fire banner carries Line Break over it, so the call is still seen. A Get Past close-up won the right way already says Line Break
     with its cheer (settle, src/duels.js), so that is the carry's Line Break (edgeBroke): its heat point and the cover's lag, never a
     second call. The CPU's cover then runs on as it was running for `lag` seconds before it reacts (matchTargets).
   - On Fire sooner and longer: your side lights after fire.need good moments unanswered, a try, a Line Break, a Big Hit and a
     turnover won one each (fire.pts), and burns fire.secs match seconds; ARCADE.fire's three points, a try two, and twelve seconds
     for every other side. Each by Stamina, as before. With a try worth two here as well, the casual adult went On Fire 4.4 times a
     match (every try lit it): the call stopped being one.
   - Your carrier, against the CPU only (its own carriers are as they were): `pace` times his top speed with the ball; the CPU's tackle
     on him holds `hold` of the times it did (tackleChance, an AI tackler, in open play and in a close-up's fallback); a Side Step's
     tackle odds `step` times MOVES.step.odds; a Dummy bought `bite` more often (Easy's 0.9).
   Measured with a casual adult (tools/bot.mjs, PROFILE=casual) and the children (tools/kidbots.mjs): README.md, Easy. */
const EDGE = {
  on:true,
  pace:1.03,                  // your carrier's top speed with the ball
  hold:0.92,                  // the CPU's tackle on your carrier holds this share of the times it did
  step:0.85,                  // a Side Step's tackle odds: MOVES.step.odds (0.65) times this
  bite:0.06,                  // a Dummy is bought this much more often (Easy 0.9)
  lag:0.3,                    // seconds after a Line Break the CPU's cover holds its line before it reacts
  fire:{ need:2, secs:15, pts:{ hit:1, turnover:1, try:1, line:1 } },   // On Fire: two good moments unanswered, a try one of them, light it for 15 match seconds (ARCADE.fire: 3 points, a try two, for 12)
  brk:{ lane:15, cone:1, clear:3, fwd:2.5, line:5, stop:110 },   // the Line Break: metres across beside him and the window's widening a metre ahead, metres clear of every man, m/s forward, metres out, the hit-stop in ms
};
// EDGE_TUNE
const edgeOn = t => !!(EDGE.on && M && M.arcade && !M.two && !practice && isHuman(t) && !isHuman(1 - t) && levelOf(t) === 0);   // side t: a person on Easy against the CPU, in a match he plays
const edgeMan = p => !!p && edgeOn(p.team) && !proRun(p);   // p is yours: in Pro Mode, your own player only
const edgeCarry = p => M.ball.state === 'held' && M.ball.carrier === p && edgeMan(p);   // your carrier, for his pace
const fireNeed = t => (edgeOn(t) ? EDGE.fire.need : ARCADE.fire.need);
const fireSecs = t => (edgeOn(t) ? EDGE.fire.secs : ARCADE.fire.secs);
/* Once a step while your carrier runs in open play, after the try line and the close-ups have had their look (matchUpdate). M.lb is
   the carry being watched: its man, whether a defender has been in front of him, and whether and when Line Break was called. */
function edgeLine(c) {
  if (!edgeMan(c) || c.bind || c.down > 0) return false;
  let L = M.lb;
  if (!L || L.c !== c || c.hold < L.hold) L = M.lb = { c, had:false, fired:false, at:0, hold:0 };   // a new carry: his time on the ball starts again at every catch
  L.hold = c.hold;
  if (L.fired) return false;
  const d = dirOf(c.team), K = EDGE.brk;
  let near = 99;
  for (const q of M.players) {
    if (q.team === c.team || q.down > 0 || q.bind) continue;
    const ahead = (q.x - c.x)*d;
    if (ahead > 0 && Math.abs(q.y - c.y) < K.lane + K.cone*ahead) { L.had = true; return false; }   // a man still in front of him, the deep cover man too
    near = Math.min(near, dist(q, c));
  }
  if (!L.had || near < K.clear || c.vx*d < K.fwd || (oppLine(c.team) - c.x)*d < K.line) return false;   // away from the man he beat, and running on
  if (callLate(c)) return false;                           // he has just won it: Turnover or Intercepted is this moment's call, and the Line Break waits (src/calls.js)
  L.fired = true; L.at = M.dclock;
  st('lineBreak' + c.team);
  if (!fireFold(c.team, 'Line Break')) say('Line Break', 'small', c.team);   // On Fire's banner up already: the call goes over it (src/calls.js)
  sfx('whoosh'); sfx('cheer'); buzz(30, c.team);
  if (!matchMild()) hitStop(K.stop, 0);                    // the youngest: the call and the sound, no slow-motion
  heat(c.team, 'line', 'Line Break');                      // lighting On Fire, its banner carries the call
  return true;
}
/* A Get Past close-up won the right way (applyDuel's past:break): the close-up has said Line Break and cheered, so it is this carry's
   Line Break. The count, the heat point and the cover's lag, and no second call however clear he then is. */
function edgeBroke(c) {
  if (!edgeMan(c)) return;
  let L = M.lb;
  if (!L || L.c !== c || c.hold < L.hold) L = M.lb = { c, had:true, fired:false, at:0, hold:0 };
  L.hold = c.hold;
  if (L.fired) return;
  L.had = true; L.fired = true; L.at = M.dclock;
  st('lineBreak' + c.team);
  heat(c.team, 'line');
}
const edgeLag = c => !!(M.lb && M.lb.c === c && M.lb.fired && M.dclock - M.lb.at < EDGE.lag);   // the CPU's cover has not reacted yet
const edgeHold = (p, a) => ({ x:p.x + p.vx*0.5, y:p.y + p.vy*0.5, s:hyp(p.vx, p.vy), a });   // he runs on the line he was running, at the pace he had
