/* ---------- the kick chase (2026-11-13) ----------
   The owner: "When kicking and chasing down the ball as an attacker, they should have a boost as they have caught the defender by
   surprise." He chose every kicking side (the CPU's kicks too) and small, tuned by how often the kicking side wins the ball back,
   noticeable and not a walkover. Asked on 13 November 2026 which chase ships in 1.6, he chose "Pace Alone (Recommended): Chasers 8%
   quicker for 1.5s, and defenders react normally. Chips won back about 11 to 16 points more, so no chip-spam walkover." So react is
   0 and the chase is its pace alone: the chasers 1.08 times their top speed for 1.5s, the catching side reacting at once, as before.
   Rejected: react 0.2 (98e11c8, the floor of his first band, 0.2 to 0.4), where a chip-spammer on Normal won back two chips in three
   and won 67% of his matches (45% before): the late start, not the pace, wins a person's chip back (he chips over a defence rushing
   him, and its nearest men run on the wrong way). Its code is kept, idle at 0 and tunable (CHASE='{"react":0.2}' in the harness), and
   tools/chase.mjs proves a build without it plays react 0 exactly, draw for draw.
   - Who: every open-play kick (kickBall's kind 'kick': a chip, a long kick, a clearance, a territory kick), by either side, in every
     match, AI v AI, the demo, Two Player, Kids and Minis included (it is speed, not contact). Not a restart (the kick-off and the 22
     drop-out are kind 'restart'), a drop goal (kind 'g3d') or a charge-down (doKick stops before kickBall), and never in a drill.
   - The chasers: the kicking side's men onside at the kick (f.onside, level with or behind the kicker; the kicker himself among them,
     and the human's ringed man with them: since 1.6 the possession calls (src/calls.js, kickRing) put the ring after a person's own
     kick on the nearest man who may play its bounce, the kicker or a man behind him, so he is always onside and always chasing, 100
     of a person's chips in 100 played in tools/chase.mjs; before them, as with CALLS off, the ring jumped to his man nearest the
     landing spot wherever he stood, in front of the kicker about a third of the time, at his own pace with no trail) run `pace`
     times their top speed for `secs` from the kick, easing back to 1 over the last third.
     p.chase is his seconds left, read in maxSpeed with the other factors and under Sprint (the bigger of the two applies, never
     both), so nothing snaps his velocity as setBoost does. It ends early once the kicking side loses the ball (the other side holds
     it or passes it) or the ball is dead (any stoppage, a try, half time). Drawn as a boost is, the gold trail behind him.
   - The catching side: as it ships (react 0) its men react at once, as before the chase. Tuned above 0, its men the computer runs react
     `react` seconds late: for that long after the kick they run on as they were running (edgeHold, the Easy cover's lag) instead of
     going to the landing spot or into their support shape (matchTargets). A human's own input is never delayed: the ring still goes
     at the kick to his man nearest the landing spot who may play it (kickBall), his stick drives that man at once, and a Kids child's let-go chase
     (kidsChase) runs for the ball as before.
   Every lever reads chaseLv and none draws a random number, so with CHASE.on false and the possession calls off too
   (CHASE='{"on":false}' CALLS='{"on":false}' in the harness) the game plays exactly as b4a25d5, the build before it, draw for draw:
   the proof behind every re-pin since. CHASE off alone plays as wt/calls (a032b3a), the calls on their own. Measured: README.md,
   Kicking and the chase (tools/chase.mjs --balance; --balance band checks a person's chips against the owner's aim). */
const CHASE = { on:true, pace:1.08, secs:1.5, react:0 };
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
const chaseLate = t => !!(M.chase && M.chase.team !== t && M.chase.t < chaseLv('react') - 1e-9);   // side t has not reacted to the other side's kick yet: never at react 0, as it ships (at 0.2, 12 steps, the kick's own the first)
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
