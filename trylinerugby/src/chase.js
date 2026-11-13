/* ---------- the kick chase (2026-11-13) ----------
   The owner: "When kicking and chasing down the ball as an attacker, they should have a boost as they have caught the defender by
   surprise." He chose every kicking side (the CPU's kicks too) and small: chasers about 8% quicker for 1.5 seconds, the catching
   side 0.3 seconds late, tuned by how often the kicking side wins the ball back, noticeable and not a walkover. Tuned inside his
   band (pace 1.06 to 1.10, react 0.2 to 0.4): react 0.2, its floor, because the late start is what wins a person's chip back
   (he chips over a defence rushing him, and its nearest men run on the wrong way): +29 to +39 points at 0.3 against an aim of
   +10 to 15, a little less at 0.2 (the kick-chaser on Easy +25 where he was +32); pace stays his 1.08, which alone is +11 to 16.
   The aim on a person's chips is below the band, the owner's call (README.md, Kicking and the chase).
   - Who: every open-play kick (kickBall's kind 'kick': a chip, a long kick, a clearance, a territory kick), by either side, in every
     match, AI v AI, the demo, Two Player, Kids and Minis included (it is speed, not contact). Not a restart (the kick-off and the 22
     drop-out are kind 'restart'), a drop goal (kind 'g3d') or a charge-down (doKick stops before kickBall), and never in a drill.
   - The chasers: the kicking side's men onside at the kick (f.onside, level with or behind the kicker; the kicker himself and the
     human's ringed chaser included) run `pace` times their top speed for `secs` from the kick, easing back to 1 over the last third.
     p.chase is his seconds left, read in maxSpeed with the other factors and under Sprint (the bigger of the two applies, never
     both), so nothing snaps his velocity as setBoost does. It ends early once the kicking side loses the ball (the other side holds
     it or passes it) or the ball is dead (any stoppage, a try, half time). Drawn as a boost is, the gold trail behind him.
   - The catching side: its men the computer runs react `react` seconds late. For that long after the kick they run on as they were
     running (edgeHold, the Easy cover's lag) instead of going to the landing spot or into their support shape (matchTargets). A
     human's own input is never delayed: the ring still jumps to his man nearest the landing spot at the kick (kickBall), his stick
     drives that man at once, and a Kids child's let-go chase (kidsChase) runs for the ball as before.
   Every lever reads chaseLv and none draws a random number, so with CHASE.on false (CHASE='{"on":false}' in the harness) the game
   plays exactly as b4a25d5, the build before it, draw for draw: the proof behind every re-pin since. Measured: README.md, Kicking and
   the chase (tools/chase.mjs --balance). */
const CHASE = { on:true, pace:1.08, secs:1.5, react:0.2 };
// CHASE_TUNE
const CHASE_OFF = { pace:1, secs:0, react:0 };             // b4a25d5's: no chase
const chaseLv = k => (CHASE.on ? CHASE : CHASE_OFF)[k];
function chaseStart(team, onside) {                        // kickBall, an open-play kick: its onside men chase, the other side is caught out
  const secs = chaseLv('secs');
  if (!(secs > 0) || practice) return;
  M.chase = { team, t:0 };
  for (const p of M.players) p.chase = p.team === team && onside.has(p) ? secs : 0;
}
function chaseMul(p) {                                     // his pace now: `pace` until the last third of the chase, then back to 1 by its end
  if (!(p.chase > 0) || !M.chase) return 1;
  const ease = chaseLv('secs')/3;
  return 1 + (chaseLv('pace') - 1)*Math.min(1, p.chase/ease);
}
const chaseLate = t => !!(M.chase && M.chase.team !== t && M.chase.t < chaseLv('react') - 1e-9);   // side t has not reacted to the other side's kick yet (12 steps of 0.2s, the kick's own the first)
function chaseTick(dt) {                                   // once a step in a match, after the ball (matchUpdate): the chase's clock, and its early end
  const C = M.chase;
  if (!C) return;
  const b = M.ball, dead = (M.phase !== 'play' && M.phase !== 'cut') || b.state === 'dead';
  const lost = (b.state === 'held' && b.carrier && b.carrier.team !== C.team) || (b.state === 'air' && b.f && b.f.kind === 'pass' && b.f.team !== C.team);
  C.t += dt;
  const over = dead || lost || C.t >= chaseLv('secs') - 1e-9;   // 90 steps of 1.5s, then nobody is left chasing
  for (const p of M.players) if (p.chase > 0) p.chase = over ? 0 : p.chase - dt;
  if (over) M.chase = null;
}
