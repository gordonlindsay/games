/* ---------- close-ups: scrums, lineouts, duels ----------
   A close-up freezes the pitch and the clock, slides a side-on broadcast
   view in, runs one short contest, then slides out and hands the result
   back to the match. Headless runs, the menu demo and AI v AI resolve
   them instantly instead. */
const CUT_IN = 0.22, CUT_OUT = 0.25;
const interactive = () => !M.auto && !M.demo && !M.headless;
function startCut(c) {
  c.t = 0; c.after = null; c.hold = 0; c.exit = -1; c.acc = 0;
  M.cut = c; M.phase = 'cut';
  clearBanner();
  clearCharge(); for (const s of M.side) s.pass = null;
  for (const inp of inputs) { inp.aPressed = inp.bPressed = inp.cPressed = false; inp.cDown = false; }   // a Sprint held into a close-up must be pressed again after it
  lastBtn = '';
  hintCut(c);                                              // the open-play hint, if one was up, is over; and the tutorial, the first time this kind of moment comes up
  tutStart(c);
}
function finishCut(after, hold) {
  const c = M.cut;
  if (!c || c.after) return;
  c.after = after; c.hold = hold == null ? 0.9 : hold;
}
/* Slow motion (2026-10-17, Gordon: duels came too fast to react to). A duel's run-in plays slowly after the slide-in, then ramps to
   full speed into the window: secs[level] of real time at `rate`, a ramp of `ramp` scene seconds easing to 1, done `lead` before the
   ring opens (a run-in too short for all that loses slow time, never the ramp). The window, the tells and the verdict are untouched
   in scene time: the scene clock steps whole frames, held back by the accumulator, so a bot acting on c.t sees exactly the steps it
   always saw and only the real time (the frames) stretches; the drawing adds the fraction back (c.acc) so the motion is smooth.
   Resume before the window restarts the slow phase from the resumed time (c.slowFrom). Instant mode has no close-up at all. */
const DUEL_SLOW = { secs:[1.2, 0.9, 0.6], rate:0.4, ramp:0.10, lead:0.03 };   // measured 2026-10-17: a 0.15 ramp and 0.05 lead clipped Easy's slow phase to 0.95s (its ring opens at 0.80s scene) and left its run-in no longer than Normal's
function cutRate(c) {                                      // the scene clock's rate this step
  if (!c.duel || c.after || c.res || c.t < CUT_IN) return 1;
  const S = DUEL_SLOW, from = c.slowFrom == null ? CUT_IN : c.slowFrom;
  const rampEnd = Math.min(from + S.rate*S.secs[levelOf(c.own)] + S.ramp, c.win[0] - S.lead), rampStart = rampEnd - S.ramp;
  if (c.t >= rampEnd) return 1;
  if (c.t <= rampStart) return S.rate;
  const u = (c.t - rampStart)/S.ramp;
  return S.rate + (1 - S.rate)*u*u*(3 - 2*u);
}
function updateCut(dt) {
  const c = M.cut;
  if (M.tut && c.t + dt >= CUT_IN - 1e-9) {                // the tutorial card: the close-up holds its first frame (the slide-in's last step taken, nothing run on it), presses advance the card, the stick is re-centred under the thumb
    if (c.t < CUT_IN) c.t += dt;
    if (humanSlots().some(i => i.aPressed)) tutAdvance();
    if (c.duel || c.kind === 'goal') for (const inp of (M.two ? [inputOf(c.duel ? c.own : c.g.team)].filter(Boolean) : humanSlots())) { inp.reanchor(); inp.flick = 0; }   // as the grace: in two player only the owner's stick is re-centred (re-anchoring a pad stick latches it, and the chooser's choice would be lost on a pad but kept on keys)
    for (const inp of inputs) { inp.aPressed = inp.bPressed = inp.cPressed = false; inp.flick = 0; inp.aCancel = inp.bCancel = inp.cCancel = false; }
    return;
  }
  const rate = cutRate(c);
  if (rate >= 1) c.t += dt;
  else { c.acc += rate*dt; if (c.acc >= STEP - 1e-9) { c.acc -= STEP; c.t += dt; } }   // slow motion: whole frames only, so nothing judged on c.t moves
  if (c.after) {
    if ((c.duel || c.kind === 'goal') && c.t >= c.skipAt && humanSlots().some(i => i.aPressed || i.bPressed || i.flick)) c.hold = 0;   // tap to skip, from either seat
    if (c.hold > 0) c.hold -= dt;
    else {
      c.exit = Math.max(0, c.exit) + dt;
      if (c.exit >= CUT_OUT) {
        const fn = c.after; M.cut = null; M.phase = 'play'; lastBtn = ''; for (const inp of inputs) inp.cDown = inp.cPressed = false; fn();
        for (const inp of humanSlots()) { inp.latch = false; inp.pre = null; inp.held.clear(); }   // every slot the cut-in prepared reads live again: a stick the non-owner (or a watcher of a CPU kick) held through it is no longer latched
      }
    }
  } else if (c.kind === 'scrum') updateScrum(c, dt);
  else if (c.kind === 'lineout') updateLineout(c, dt);
  else if (c.kind === 'goal') updateGoalCut(c, dt);
  else updateDuel(c, dt);
  for (const inp of inputs) { inp.aPressed = inp.bPressed = inp.cPressed = false; inp.flick = 0; inp.aCancel = inp.bCancel = inp.cCancel = false; }
}
function surge(team, secs) { M.surge = { team, t:secs }; }

/* Scrum: Crouch, Bind, Set. Press on Set for a good hit, then tap Push fast to drive: the taps alone are the shove, the stick
   plays no part (2026-10-17: it used to scale the taps by 0.55 at rest and 0.2 held back, and nothing on screen said so). pos is
   metres gained by your pack. SCRUM_DOM is the one penalty line: a pack that has gained that much wins a penalty (a pushover
   within 8m of the line); the steal line is 1.2, half way up the bar. */
const SCRUM_SET = 1.4, SCRUM_PUSH = 2.6, SCRUM_DOM = 2.4;
function startScrum(s) {
  // every scrum is a little different: a CPU pack's strength varies, and the side putting in gets a small edge. pos is metres gained by team 0's pack
  const c = { kind:'scrum', feed:s.team, x:s.x, y:s.y, pos:0, engaged:false, mine:0, theirs:0, result:null,
    rate:[0, 0], taps:[0, 0], hit:[false, false], early:[false, false], base:[0, 0], wave:0, msg:[null, null] };   // a pack a side: a human's taps and timing, every pack's base effort; msg: two player's Early / Good Hit tag over each pack
  for (const t of [0, 1]) c.base[t] = cpuSide(t) ? (diffOf(t).scrumCpu + (M.nat[t].power-3)*0.06)*(0.75 + rnd()*0.5) + (s.team === t ? 0.08 : 0) : (M.nat[t].power-3)*0.06 + (s.team === t ? 0.08 : 0) + (M.two ? SCRUM_LEVEL[levelOf(t)] : 0);
  c.wave = rnd()*6;
  startCut(c);
}
function scrumPush(c, s, dt) {                             // a human pack's shove this step: a timed hit on Set, then the taps of the last quarter second or so. The stick is not read
  const t = c.t, inp = inputOf(s), d = dirOf(s);
  if (inp && inp.aPressed) {
    const note = text => { if (M.two) c.msg[s] = { text, at:t }; else say(text, 'small'); };   // two player: a tag over that pack in its seat colour, so two hits at once don't fight over the banner
    if (t < SCRUM_SET - 0.08) { if (!c.early[s] && !c.hit[s]) { c.early[s] = true; c.pos -= 0.25*d; note('Early'); } }
    else if (!c.hit[s] && !c.early[s] && t <= SCRUM_SET + 0.28) { c.hit[s] = true; c.pos += 0.35*d; note('Good Hit'); buzz(25, s); }
    if (t >= SCRUM_SET) { c.rate[s] += 1; c.taps[s]++; }
  }
  if (t < SCRUM_SET) return 0;
  c.rate[s] *= Math.exp(-dt/0.25);
  return 0.85*Math.min(1.3, c.rate[s]/1.25) + c.base[s];   // 5 taps a second = full shove, about 6.5 the most (a phone thumb manages 5-7)
}
function updateScrum(c, dt) {
  const t = c.t, eff = [0, 1].map(s => (cpuSide(s) ? 0 : scrumPush(c, s, dt)));   // a human's press is read before Set too (Early, or the Good Hit)
  if (t < SCRUM_SET) return;
  if (!c.engaged) { c.engaged = true; sfx('tackle'); buzz(40); }
  for (const s of [0, 1]) if (cpuSide(s)) eff[s] = c.base[s]*(1 + 0.22*Math.sin((t-SCRUM_SET)*2.4 + c.wave));
  c.mine = eff[0]; c.theirs = eff[1];
  c.pos = clamp(c.pos + (c.mine - c.theirs)*1.8*dt, -2.5, 2.5);
  if (t >= SCRUM_SET + SCRUM_PUSH || Math.abs(c.pos) >= SCRUM_DOM) resolveScrum(c);
}
function resolveScrum(c) {
  const p = c.pos, F = c.feed;
  let res = p >= SCRUM_DOM ? 'dom0' : p <= -SCRUM_DOM ? 'dom1' : F === 0 ? (p <= -1.2 ? 'steal1' : 'win0') : (p >= 1.2 ? 'steal0' : 'win1');
  if (res === 'dom1' && !cpuSide(0) && !c.taps[0] && !c.hit[0]) res = F === 0 ? 'steal1' : 'win1';   // a human pack that never pushed loses the ball, nothing worse
  if (res === 'dom0' && !cpuSide(1) && !c.taps[1] && !c.hit[1]) res = F === 1 ? 'steal0' : 'win0';
  c.result = res;
  const mx = clamp(c.x + p, 15, 105), y = c.y;
  if (res === 'dom0' || res === 'dom1') {
    const t = res === 'dom0' ? 0 : 1, over = Math.abs(oppLine(t) - mx) <= 8;
    say(over ? 'Pushover' : 'Scrum Penalty ' + M.nat[t].id, '', t); sfx('whistle');
    finishCut(() => {
      if (over) { const q = nearestFree(t, mx, y) || M.players.find(p => p.team === t); q.x = oppLine(t) + dirOf(t)*0.8; q.y = y; scoreTry(q); }
      else penalty(t, mx, y);
    });
    return;
  }
  const w = res.endsWith('0') ? 0 : 1, stolen = res.startsWith('steal');
  const strong = w === 0 ? p > 0.8 : p < -0.8;
  say(stolen ? 'Against the Head' : strong ? 'Go-Forward Ball' : 'Scrum Won', stolen || strong ? '' : 'small', w);
  finishCut(() => { releaseTo(w, mx, y, 'scrum'); if (stolen || strong) surge(w, 2.5); }, 0.8);
}
function autoScrum(s) {
  const F = s.team, o = 1-F, edge = (M.nat[F].power - M.nat[o].power)*0.03, r = rnd();
  if (r < 0.035) { penalty(rnd() < 0.6 + edge ? F : o, s.x, s.y); return; }
  if (r < 0.035 + clamp(0.07 - edge, 0.02, 0.12)) { say('Against the Head', 'small'); releaseTo(o, s.x, s.y, 'scrum'); return; }
  releaseTo(F, s.x, s.y, 'scrum');
}

/* Lineout: one jumper each side in the middle. The thrower dummies, then
   throws; press Jump so your jumper is at full height when the ball arrives. */
const LINE_X = 7;            // metres in from touch where the jumpers stand
function liftAt(s) {          // metres a jumper's feet are off the ground, s seconds after the jump
  if (s == null || s < 0) return 0;
  if (s < 0.42) return 1.45*Math.sin(s/0.42*Math.PI/2);
  if (s < 0.72) return 1.45;
  if (s < 1.12) return 1.45*(1 - (s-0.72)/0.4);
  return 0;
}
function startLineout(s) {
  const throwT = 0.75 + rnd()*0.6, flight = 0.95 + rnd()*0.35;
  const c = { kind:'lineout', team:s.team, x:s.x, y:s.y, throwT, flight, arrive:throwT + flight, catchH:3.4 + rnd()*0.3,
    jump:[null, null], outcome:null, winner:null, decidedAt:null,
    reach:[0, 1].map(t => 2.35 + gauss()*0.08 + (t === s.team ? (M.two ? 0.10 : 0.06) : 0) + (M.two ? LINE_LEVEL[levelOf(t)] : 0)) };   // two player: the throw's edge is 0.10 (the thrower keeps about 86% at equal timing, measured over 4,000 throws a side), plus an Easy player's reach; the same draws
  for (const t of [0, 1]) {                                  // a CPU jumper: always on its own throw, else at its level's contest rate, timed with its level's spread
    if (!cpuSide(t)) continue;
    const contest = s.team === t || rnd() < diffOf(t).lineContest;
    if (contest) c.jump[t] = c.arrive - 0.57 + gauss()*diffOf(t).lineSigma*(s.team === t ? 0.9 : 1);
  }
  startCut(c);
}
function handAt(c, team, t) { return c.reach[team] + liftAt(c.jump[team] == null ? null : t - c.jump[team]); }
function updateLineout(c, dt) {
  const t = c.t;
  for (const s of [0, 1]) { const inp = inputOf(s); if (inp && inp.aPressed && c.jump[s] == null && t > CUT_IN) { c.jump[s] = t; sfx('pass'); } }   // each human side's Jump
  if (c.outcome == null && t >= c.arrive) {
    const u = handAt(c, 0, t), k = handAt(c, 1, t), need = c.catchH - 0.2;
    const okU = u >= need, okK = k >= need;
    c.decidedAt = t;
    if (okU && okK) c.winner = Math.abs(u - k) < 0.03 ? c.team : (u > k ? 0 : 1);
    else if (okU) c.winner = 0;
    else if (okK) c.winner = 1;
    if (c.winner == null) { c.outcome = 'over'; return; }
    c.outcome = 'caught';
    const w = c.winner, steal = w !== c.team;
    say(steal ? 'Lineout Steal' : 'Lineout Won', steal ? '' : 'small', w);
    if (steal) buzz(40);
    finishCut(() => { releaseTo(w, c.x, c.y, 'lineout'); if (steal) surge(w, 2.5); }, 0.9);
  }
  if (c.outcome === 'over' && c.winner == null && t >= c.decidedAt + 0.45) {
    const w = rnd() < 0.5 ? 0 : 1;
    c.winner = w;
    say('Overthrown', 'small');
    finishCut(() => releaseTo(w, c.x, c.y, 'lineout'), 0.5);
  }
}
function autoLineout(s) {
  const T = s.team, o = 1-T, edge = (M.nat[T].handling - M.nat[o].handling)*0.03;
  const w = rnd() < clamp(0.84 + edge, 0.7, 0.93) ? T : o;
  if (w !== T) say('Lineout Steal', 'small', w);
  releaseTo(w, s.x, s.y, 'lineout');
}

