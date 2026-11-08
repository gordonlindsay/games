/* =========================================================
   Training Ground drills.
   Bouncy Egg, Pass Around the Circle, Cones and Tackling each run in a training space of their own: the pitch, the kits and
   the controls of a match with none of its flow. While practice.space is set, update() skips matchUpdate and the drill moves
   the men and the ball itself (M.phase reads 'drill', so nothing in the HUD or the hints takes it for open play). Kicking
   and Driving use the match's own goal-kick and scrum close-ups; Defend a Breakaway and Create a Two-on-One restage open
   play. Every engine hook checks `practice` first, so matches, AI v AI, the demo and the balance tools never reach any of it,
   and nothing here draws a random number outside a drill.
   ========================================================= */
const DRILL_RUN = { acc:16, secs:3, refill:4.5, floor:0.2 };   // a training space's run: pick-up (m/s²), the Sprint meter's seconds of burst, its refill, the least it needs to start
const drillStarsOf = (score, cuts) => cuts.filter(c => score >= c).length;   // stars: one for each threshold met, 0 to 3
const drillLerp = (a, b, u) => a + (b - a)*u;
function drillPlace(p, x, y, fx, fy) {
  p.x = x; p.y = y; p.hx = x; p.hy = y; p.vx = p.vy = 0; p.down = 0; p.tcd = 0; p.offside = 0; p.bind = null; p.drawFrom = null;
  p.fx = fx == null ? dirOf(p.team) : fx; p.fy = fy || 0; p.sprint = 0; p.sprinting = false; p.stumble = 0; p.wf = 0; p.boost = 0; p.fend = 0;
}
function drillFace(p, x, y) { const dx = x - p.x, dy = y - p.y, m = hyp(dx, dy); if (m > 1e-3) { p.fx = dx/m; p.fy = dy/m; } }
function drillSpace(x, y, zoom) {                          // a training space: no match flow, a still camera (closer in where the space is small), the ball dead at the spot until the drill takes it
  practice.space = true; practice.cam = { x, y }; practice.zoom = zoom || 1;
  M.phase = 'drill'; M.set = null; M.cut = null; M.goal = null; M.contact = null; M.tags = []; M.fx = [];
  placeBall(x, y);
  const S = M.spr[0]; S.m = 1; S.spent = false; S.p = null;
}
function drillHold(p) {                                    // the ball in p's hands
  const b = M.ball;
  b.state = 'held'; b.carrier = p; b.f = null; b.x = p.x + p.fx*0.55; b.y = p.y + p.fy*0.55; b.z = 1.0; b.vx = b.vy = b.vz = 0;
}
function drillSprint(p, dt, moving) {                      // the Sprint meter in a training space: held Sprint while moving is a burst paid from the meter, which refills once the burst has eased out
  const inp = inputOf(0), S = M.spr[0], R = DRILL_RUN;
  if (!inp.cDown) S.spent = false;
  const go = inp.cDown && moving && !S.spent && (p.sprinting || S.m >= R.floor);
  if (go) {
    if (!p.sprinting) { sfx('whoosh'); st('drillSprints'); }
    p.sprinting = true; p.sprint = SPRINT.fade; S.m -= dt/R.secs;
    if (S.m <= 0) { S.m = 0; S.spent = true; p.sprinting = false; }
  } else {
    p.sprinting = false;
    if (p.sprint > 0) p.sprint = Math.max(0, p.sprint - dt); else S.m = Math.min(1, S.m + dt/R.refill);
  }
  return p.sprinting;
}
function drillRun(p, dt, box, sprint) {                    // the human's own run: the stick steers; Sprint (when the drill allows it) is a burst from the meter. box: [x0, y0, x1, y1]
  const j = inputOf(0).world();
  if (sprint) drillSprint(p, dt, j.mag > 0.2); else { p.sprinting = false; p.sprint = 0; }
  const ms = maxSpeed(p);
  steer(p, j.x*ms, j.y*ms, DRILL_RUN.acc, dt);
  const x = clamp(p.x + p.vx*dt, box[0], box[2]), y = clamp(p.y + p.vy*dt, box[1], box[3]);
  if (x !== p.x + p.vx*dt) p.vx = 0;
  if (y !== p.y + p.vy*dt) p.vy = 0;
  p.x = x; p.y = y;
  const sp = hyp(p.vx, p.vy); if (sp > 0.6) { p.fx = p.vx/sp; p.fy = p.vy/sp; }
  return sp;
}
function drillTag(text, x, y) { M.tags.push({ text, x, y, t:0 }); while (M.tags.length > 2) M.tags.shift(); }   // a word on the pitch in a drill: the drills' own words, kept apart from the match's fixed list
function drillTap() { const inp = inputOf(0), a = inp.aPressed; inp.aPressed = inp.bPressed = inp.cPressed = false; return a; }   // a training space reads its own presses
function drillName(word, act) { return word + (lastDev === 'touch' ? '' : ' (' + seatKey(0, act) + ')'); }   // a button's name, with its key on a keyboard or a controller
function drillCue(objective, cue) {                        // the in-play line, written only when it changes (it is a polite live region)
  const key = objective + '|' + (cue || '');
  if (practice.cueKey === key) return;
  practice.cueKey = key;
  $('pr-objective').textContent = objective; $('pr-cue').textContent = cue || '';
  $('practice-cue').hidden = !objective;
}
function drillWorldText(text, x, y, colour) {              // a word on the pitch, in screen pixels at a world point (the world transform is live)
  const s = V.s;
  ctx.save(); ctx.translate(x, y); ctx.scale(1/s, 1/s);
  ctx.font = `800 15px 'Big Shoulders Display', Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,14,10,.85)'; ctx.fillStyle = colour || '#f1eee4';
  ctx.strokeText(text.toUpperCase(), 0, 0); ctx.fillText(text.toUpperCase(), 0, 0);
  ctx.restore();
}
function drillRing(x, y, r, colour, width, dash) {
  ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.setLineDash(dash || []);
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
}
function drillCone(x, y, state) {                          // a training cone from above: orange, a white top; state rings it gold (next), green (cleared) or red (missed)
  const ring = state === 'next' ? 'rgba(255,207,61,.95)' : state === 'done' ? 'rgba(98,214,128,.95)' : state === 'miss' ? 'rgba(255,132,102,.95)' : null;
  if (ring) drillRing(x, y, 0.62, ring, 0.14);
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.arc(x + 0.12, y + 0.12, 0.4, 0, 7); ctx.fill();
  ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.arc(x, y, 0.38, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffd9b8'; ctx.beginPath(); ctx.arc(x, y, 0.14, 0, 7); ctx.fill();
}

/* ---------- Bouncy Egg: a thrower and a catcher ----------
   The thrower faces you and, after the same short wind-up every time, spins the ball into the ground so it pops up at an odd
   angle and height, passes it flat, or throws it high and long. You only know which at the release. Catch it cleanly (the
   ball within reach, between knee and head height); a ball that lands untouched costs a heart. The throws get quicker and
   wilder as the run goes on. Stars by clean catches. */
const DRILL_EGG = { throws:12, lives:3, reach:1.15, lo:0.35, hi:2.4, wind:[1.0, 0.55], gap:0.6, miss:0.9, box:[47, 24, 73, 46], at:[60, 35], from:[45, 35], cam:[57, 35], zoom:1.45, stars:[4, 7, 10] };
function eggStage(E, stage) { E.stage = stage; E.t = 0; }
function eggReady(E) {                                     // the ball back in the thrower's hands and the wind-up begins, a little shorter each throw
  const u = Math.min(1, E.n/(DRILL_EGG.throws - 2));
  E.wind = drillLerp(DRILL_EGG.wind[0], DRILL_EGG.wind[1], u);
  eggStage(E, 'wind');
  drillHold(E.tw);
}
function eggThrow(E) {
  const b = M.ball, me = E.me, tw = E.tw, u = Math.min(1, E.n/(DRILL_EGG.throws - 2)), wild = 0.6 + 1.6*u;
  const kinds = ['bounce', 'flat', 'high'];
  let kind = kinds[Math.floor(rnd()*3)];
  if (kind === E.hist[0] && kind === E.hist[1]) kind = kinds[(kinds.indexOf(kind) + 1 + Math.floor(rnd()*2)) % 3];   // never three the same in a row
  E.hist.unshift(kind); E.hist.length = Math.min(E.hist.length, 2);
  E.kind = kind; E.n++; E.bounced = false;
  b.state = 'loose'; b.carrier = null; b.f = null; b.last = 1; b.kickInfo = null;
  b.x = tw.x + tw.fx*0.6; b.y = tw.y + tw.fy*0.6; b.z = 1.6;
  let tx, ty, T, zEnd;
  if (kind === 'flat') {                                   // a flat pass at chest height, to one side of him
    tx = me.x + (rnd() - 0.5)*1.2*wild; ty = me.y + (rnd() - 0.5)*3.2*wild; zEnd = 1.3;
    T = Math.max(0.35, hyp(tx - b.x, ty - b.y)/(10 + 6*u));
  } else if (kind === 'high') {                            // up and long: it comes down a few metres away; its shadow shows where
    const a = rnd()*2*Math.PI, r = 2.5 + rnd()*(2 + 3*u);
    tx = clamp(me.x + Math.cos(a)*r, DRILL_EGG.box[0] + 1, DRILL_EGG.box[2] - 1); ty = clamp(me.y + Math.sin(a)*r, DRILL_EGG.box[1] + 1, DRILL_EGG.box[3] - 1); zEnd = 1.2;
    T = 2.0 - 0.45*u;
  } else {                                                 // spun into the ground short of him: it pops up at an odd angle
    const d = hyp(me.x - b.x, me.y - b.y) || 1, back = 1.5 + rnd()*1.5;
    tx = me.x - (me.x - b.x)/d*back + (rnd() - 0.5)*1.5*wild; ty = me.y - (me.y - b.y)/d*back + (rnd() - 0.5)*1.5*wild; zEnd = 0;
    T = 0.5 + 0.2*(1 - u);
  }
  const B = DRILL_EGG.box;                                 // never out of reach: every throw comes down well inside the area you can run in
  tx = clamp(tx, B[0] + 3, B[2] - 3); ty = clamp(ty, B[1] + 3, B[3] - 3);
  b.vx = (tx - b.x)/T; b.vy = (ty - b.y)/T; b.vz = (zEnd - b.z + 4.9*T*T)/T;
  eggStage(E, 'fly');
  sfx('pass');
}
function eggFly(E, dt) {
  const b = M.ball, me = E.me, u = Math.min(1, (E.n - 1)/(DRILL_EGG.throws - 2));
  b.vz -= 9.8*dt; b.x += b.vx*dt; b.y += b.vy*dt; b.z += b.vz*dt;
  if (hyp(me.x - b.x, me.y - b.y) < DRILL_EGG.reach && b.z > DRILL_EGG.lo && b.z < DRILL_EGG.hi) {   // within reach, between knee and head height: a clean catch
    E.caught++; st('eggCatch');
    drillHold(me); eggStage(E, 'caught');
    drillTag('Caught', me.x, me.y); sfx('tick'); buzz(20, 0);
    return;
  }
  if (b.z > 0) return;
  b.z = 0;
  if (E.kind === 'bounce' && !E.bounced) {                 // the spin: off the ground at an odd angle and height
    E.bounced = true;
    const dir = Math.atan2(b.vy, b.vx) + (rnd() < 0.5 ? -1 : 1)*(0.35 + rnd()*(0.5 + 0.6*u)), out = 2.2 + rnd()*2.5;
    b.vx = Math.cos(dir)*out; b.vy = Math.sin(dir)*out; b.vz = 3.8 + rnd()*2.6;
    const air = 2*b.vz/9.8, B = DRILL_EGG.box;              // and its pop stays inside the area too
    if (b.x + b.vx*air < B[0] + 1.5 || b.x + b.vx*air > B[2] - 1.5) b.vx = -b.vx;
    if (b.y + b.vy*air < B[1] + 1.5 || b.y + b.vy*air > B[3] - 1.5) b.vy = -b.vy;
    sfx('trip');
    return;
  }
  E.lives--; st('eggMiss');                                // it landed untouched
  b.vz = 0; b.vx *= 0.35; b.vy *= 0.35;
  eggStage(E, 'missed');
  drillTag('Missed', b.x, b.y); sfx('groan');
}
function eggEnd(E) {
  const stars = drillStarsOf(E.caught, DRILL_EGG.stars);
  practiceFinish(stars > 0, E.caught + (E.caught === 1 ? ' Catch' : ' Catches'), stars);
}
const drillEgg = {
  setup(own, cpu) {
    const me = own[0], tw = cpu[0];
    M.players = [me, tw];
    drillSpace(DRILL_EGG.cam[0], DRILL_EGG.cam[1], DRILL_EGG.zoom);
    drillPlace(me, DRILL_EGG.at[0], DRILL_EGG.at[1], -1, 0); drillPlace(tw, DRILL_EGG.from[0], DRILL_EGG.from[1], 1, 0);
    setCtrl(0, me);
    const E = practice.egg = { me, tw, n:0, caught:0, lives:DRILL_EGG.lives, stage:'wind', t:0, wind:DRILL_EGG.wind[0], kind:null, hist:[], bounced:false };
    eggReady(E);
  },
  tick(dt) {
    const E = practice.egg, b = M.ball;
    drillTap();
    drillRun(E.me, dt, DRILL_EGG.box, false);
    drillFace(E.tw, E.me.x, E.me.y);
    E.t += dt;
    if (E.stage === 'wind') { drillHold(E.tw); if (E.t >= E.wind) eggThrow(E); }
    else if (E.stage === 'fly') eggFly(E, dt);
    else if (E.stage === 'caught') { drillHold(E.me); if (E.t >= DRILL_EGG.gap) this.next(E); }
    else if (E.stage === 'missed') { const f = Math.exp(-3*dt); b.vx *= f; b.vy *= f; b.x += b.vx*dt; b.y += b.vy*dt; if (E.t >= DRILL_EGG.miss) this.next(E); }
  },
  next(E) { if (E.lives <= 0 || E.n >= DRILL_EGG.throws) eggEnd(E); else eggReady(E); },
  timeUp() { eggEnd(practice.egg); },
  labels() { return { a:null, b:null, c:false }; },
  hud() { const E = practice.egg; return { lives:[E.lives, DRILL_EGG.lives], num:String(E.caught), icon:'ball' }; },
  drawWorld() {                                            // the wind-up: the same closing ring round the thrower whatever is coming
    const E = practice.egg; if (!E || E.stage !== 'wind') return;
    const u = clamp(E.t/E.wind, 0, 1);
    drillRing(E.tw.x, E.tw.y, 2.4 - 1.4*u, `rgba(241,238,228,${(0.35 + 0.5*u).toFixed(3)})`, 0.12);
  },
  howTo() { return 'Run to the ball and catch it. Watch its shadow.'; },
  result() { return { skill:'handling' }; },
};

/* ---------- Pass Around the Circle ----------
   A ring of six. The runner passes, then runs round the outside and must be home before the ball has been passed all the
   way round. Each round the ring grows. Runner: you run (hold the stick, Sprint from the meter) and the passers speed up.
   Passer: you make every pass with a timed tap as the closing ring meets the gold one (Perfect is quickest, an early tap is
   fumbled), and the runner speeds up. Stars by rounds survived. */
const DRILL_CIRCLE = { n:6, r0:5, grow:1, rounds:5, out:1.6, acc:10, runF:[1.30, 1.12, 1.02, 0.95, 0.915], cpuPass:14, passG:[2.5, 1.6, 1.0, 0.6, 0.3],
  fast:16, good:12, slow:8, ready:0.6, perfect:0.1, ok:0.25, fumble:0.6, late:0.5, growT:0.8, endT:1.1, at:[60, 35], zoom:1.35, stars:[1, 3, 5] };
const circleAngle = i => -Math.PI/2 + i*2*Math.PI/DRILL_CIRCLE.n;
function circleSpot(i, R) { const a = circleAngle(i); return { x:DRILL_CIRCLE.at[0] + R*Math.cos(a), y:DRILL_CIRCLE.at[1] + R*Math.sin(a) }; }
function circleLap(R) { const K = DRILL_CIRCLE; return 2*K.out + 2*Math.PI*(R + K.out); }   // the runner's lap: out from his spot, round the outside, back in
function circleRunAt(R, s) {                               // where the runner is, s metres into his lap
  const K = DRILL_CIRCLE, a0 = circleAngle(0), arc = 2*Math.PI*(R + K.out);
  let r, a;
  if (s < K.out) { r = R + s; a = a0; }
  else if (s < K.out + arc) { r = R + K.out; a = a0 + (s - K.out)/(R + K.out); }
  else { r = R + K.out - Math.min(K.out, s - K.out - arc); a = a0; }
  return { x:K.at[0] + r*Math.cos(a), y:K.at[1] + r*Math.sin(a), a, r };
}
function circleChord(R) { return 2*R*Math.sin(Math.PI/DRILL_CIRCLE.n); }
function circleSetRound(C) {                               // this round's race: the ring's size, the CPU's pace, and everyone on his spot
  const K = DRILL_CIRCLE, k = C.round - 1;
  C.R = K.r0 + K.grow*k; C.L = circleLap(C.R);
  const chord = circleChord(C.R), n = K.n;
  if (C.role === 'runner') {                               // the ball's lap against a runner at top speed with no Sprint: a slower lap early, a quicker one later
    const v = maxSpeed(C.men[0]), ref = C.L/v + v/(2*K.acc), T = ref*K.runF[k];
    C.cpuHold = Math.max(0.12, (T - n*chord/K.cpuPass)/(n - 1));
  } else {                                                 // the runner's lap against your passes: room for a few slow ones early, Perfect passes needed late
    const first = chord/K.good, perfect = first + (n - 1)*(K.ready + chord/K.fast), good = n*chord/K.good + (n - 1)*K.ready;
    const T = perfect + (good - perfect)*K.passG[k];
    const disc = Math.max(0, T*T - 2*C.L/K.acc);
    C.cpuV = K.acc*(T - Math.sqrt(disc));
  }
  C.men.forEach((p, i) => { const s = circleSpot(i, C.R); drillPlace(p, s.x, s.y); drillFace(p, K.at[0], K.at[1]); });
  C.s = 0; C.v = 0; C.home = false; C.fly = null; C.hold = null; C.ballHome = false;
  drillHold(C.men[0]);
  setCtrl(0, C.men[0]);                                   // the ring starts on the runner, who holds the ball
  C.stage = 'start'; C.t = 0;
}
function circlePass(C, from, speed, rushed) {
  const K = DRILL_CIRCLE, to = (from + 1) % K.n, a = C.men[from], spot = circleSpot(to, C.R);
  const T = Math.max(0.12, hyp(spot.x - a.x, spot.y - a.y)/speed);
  C.fly = { from, to, t:0, T, x0:a.x + a.fx*0.55, y0:a.y + a.fy*0.55, x1:spot.x, y1:spot.y, rushed:!!rushed };
  C.hold = null;
  const b = M.ball; b.state = 'loose'; b.carrier = null; b.f = null;
  if (C.role === 'passer' && to !== 0) setCtrl(0, C.men[to]);
  sfx('pass');
}
function circleGo(C) {                                     // the runner passes, then sets off
  circlePass(C, 0, DRILL_CIRCLE.good, false);
  C.stage = 'race'; C.t = 0; C.s = 0; C.v = 0;
  st('circleRounds');
}
function circleRunner(C, dt) {
  const K = DRILL_CIRCLE, p = C.men[0];
  let vt;
  if (C.role === 'runner') {
    const j = inputOf(0).world(), run = j.mag > 0.25;
    drillSprint(p, dt, run);
    vt = run ? maxSpeed(p) : 0;
  } else vt = C.cpuV;
  C.v += clamp(vt - C.v, -20*dt, K.acc*dt);
  const x0 = p.x, y0 = p.y;
  C.s = Math.min(C.L, C.s + C.v*dt);
  const at = circleRunAt(C.R, C.s);
  p.x = at.x; p.y = at.y; p.vx = (p.x - x0)/dt; p.vy = (p.y - y0)/dt;
  const sp = hyp(p.vx, p.vy); if (sp > 0.3) { p.fx = p.vx/sp; p.fy = p.vy/sp; }
  if (C.s >= C.L) { C.home = true; drillPlace(p, circleSpot(0, C.R).x, circleSpot(0, C.R).y); drillFace(p, K.at[0], K.at[1]); }
}
function circleBall(C, dt, tap) {
  const K = DRILL_CIRCLE, b = M.ball;
  if (C.fly) {
    const f = C.fly; f.t += dt;
    const u = Math.min(1, f.t/f.T);
    b.x = drillLerp(f.x0, f.x1, u); b.y = drillLerp(f.y0, f.y1, u); b.z = 1.1 + 2*u*(1 - u)*(f.rushed ? 0.3 : 0.9);
    b.vx = (f.x1 - f.x0)/f.T; b.vy = (f.y1 - f.y0)/f.T; b.vz = 0;
    if (u < 1) return;
    C.fly = null;
    if (f.to === 0) { C.ballHome = true; return; }
    C.hold = { i:f.to, t:0, fumble:f.rushed ? K.fumble : 0, tc:(f.rushed ? K.fumble : 0) + K.ready };
    if (f.rushed) drillTag('Fumble', C.men[f.to].x, C.men[f.to].y);
  }
  if (!C.hold) return;
  const H = C.hold, p = C.men[H.i];
  drillHold(p); H.t += dt;
  if (C.role === 'runner') { if (H.t >= C.cpuHold + H.fumble) circlePass(C, H.i, K.cpuPass, false); return; }
  if (tap && H.t >= H.fumble) {                            // your timed tap (not while he is still gathering a fumble): on the gold is Perfect and quickest; early is fumbled at the next man
    const e = H.t - H.tc, a = Math.abs(e);
    const grade = a <= K.perfect ? 'Perfect' : a <= K.ok ? 'Good' : e < 0 ? 'Early' : 'Late';
    st('circle' + grade);
    drillTag(grade, p.x, p.y);
    circlePass(C, H.i, grade === 'Perfect' ? K.fast : grade === 'Early' ? K.slow : K.good, grade === 'Early');
    if (grade === 'Perfect') buzz(15, 0);
  } else if (H.t >= H.tc + K.late) { st('circleLate'); drillTag('Late', p.x, p.y); circlePass(C, H.i, K.good, false); }
}
function circleSettle(C) {                                 // whoever is home first takes the round
  if (!C.home && !C.ballHome) return;
  const runnerFirst = C.home && !C.ballHome;
  const won = C.role === 'runner' ? runnerFirst : !runnerFirst;
  if (C.home) { C.fly = null; drillHold(C.men[0]); }
  else { const b = M.ball, s = circleSpot(0, C.R); b.state = 'loose'; b.x = s.x; b.y = s.y; b.z = 0.2; }
  if (won) {
    C.survived = C.round; st('circleWon');
    say(C.role === 'runner' ? 'Home First' : 'Beat Him', 'small', 0); sfx('cheer');
    if (C.round >= DRILL_CIRCLE.rounds) { C.stage = 'end'; C.t = 0; return; }
    C.stage = 'grow'; C.t = 0; C.from = C.men.map(p => ({ x:p.x, y:p.y }));
    C.round++;
  } else {
    say(C.role === 'runner' ? 'The Ball Won' : 'He Was Home', 'small', 1); sfx('groan');
    C.stage = 'end'; C.t = 0;
  }
}
function circleEnd(C) {
  const n = C.survived || 0, stars = drillStarsOf(n, DRILL_CIRCLE.stars);
  practiceFinish(stars > 0, n === DRILL_CIRCLE.rounds ? 'All ' + n + ' Rounds' : n + (n === 1 ? ' Round' : ' Rounds'), stars);
}
const drillCircle = {
  setup(own) {
    M.players = own.slice(0, DRILL_CIRCLE.n);
    drillSpace(DRILL_CIRCLE.at[0], DRILL_CIRCLE.at[1], DRILL_CIRCLE.zoom);
    const C = practice.circle = { role:practice.role || 'runner', round:1, survived:0, men:M.players, stage:'start', t:0 };
    circleSetRound(C);
  },
  role(r) { const C = practice.circle; practice.role = C.role = r === 'passer' ? 'passer' : 'runner'; circleSetRound(C); },
  tick(dt) {
    const C = practice.circle, K = DRILL_CIRCLE, tap = drillTap();
    C.t += dt;
    if (C.stage === 'start') {
      drillHold(C.men[0]); if (C.role === 'runner') drillSprint(C.men[0], dt, false);
      if (tap) circleGo(C);
    } else if (C.stage === 'race') {
      if (!C.home) circleRunner(C, dt);
      circleBall(C, dt, tap);
      circleSettle(C);
    } else if (C.stage === 'grow') {                       // the ring steps out a metre
      const u = Math.min(1, C.t/K.growT), R = K.r0 + K.grow*(C.round - 1);
      C.men.forEach((p, i) => { const s = circleSpot(i, R); p.x = drillLerp(C.from[i].x, s.x, u); p.y = drillLerp(C.from[i].y, s.y, u); });
      drillHold(C.men[0]);
      if (C.role === 'runner') drillSprint(C.men[0], dt, false);
      if (u >= 1) circleSetRound(C);
    } else if (C.stage === 'end') { if (C.t >= K.endT) circleEnd(C); }
  },
  timeUp() { circleEnd(practice.circle); },
  labels() {
    const C = practice.circle, start = C.stage === 'start';
    if (C.role === 'runner') return { a:start ? 'Pass' : null, aOn:start, cueA:start, b:null, c:true, cOn:C.stage === 'race' && !C.home && (M.spr[0].p || M.spr[0].m >= DRILL_RUN.floor) && !M.spr[0].spent };
    return { a:'Pass', aOn:start || !!C.hold, cueA:start, b:null, c:false };
  },
  hud() {
    const C = practice.circle, pips = [];
    for (let i = 1; i <= DRILL_CIRCLE.rounds; i++) pips.push(i <= (C.survived || 0) ? 'got' : i === C.round && C.stage !== 'end' ? 'now' : 'todo');
    return { pips };
  },
  drawWorld() {
    const C = practice.circle, K = DRILL_CIRCLE; if (!C) return;
    const R = C.stage === 'grow' ? drillLerp(K.r0 + K.grow*(C.round - 2), K.r0 + K.grow*(C.round - 1), Math.min(1, C.t/K.growT)) : C.R;
    drillRing(K.at[0], K.at[1], R + K.out, 'rgba(241,238,228,.4)', 0.1, [0.5, 0.5]);   // the runner's track
    const home = circleSpot(0, R);
    drillRing(home.x, home.y, 0.95, 'rgba(255,207,61,.9)', 0.16);                       // home
    if (C.role === 'passer' && C.hold && C.stage === 'race') {   // the timing: the white ring closes on the gold one; tap as they meet
      const H = C.hold, p = C.men[H.i], e = H.t - H.tc;
      const r = e < 0 ? 1.0 + 1.8*clamp(-e/K.ready, 0, 1) : Math.max(0.35, 1.0 - 1.3*e);
      drillRing(p.x, p.y, 1.0, 'rgba(255,207,61,.95)', 0.16);
      drillRing(p.x, p.y, r, Math.abs(e) <= K.perfect ? 'rgba(255,207,61,1)' : 'rgba(241,238,228,.9)', 0.12);
    }
  },
  howTo() { return 'Runner: pass, then run round the outside and beat the ball home. Passer: tap ' + drillName('Pass', 'a') + ' as the white ring meets the gold.'; },
  cue() {
    const C = practice.circle;
    if (C.stage !== 'start' || C.round > 1) return null;
    return C.role === 'runner' ? ['Runner', 'Tap ' + drillName('Pass', 'a') + ', then hold the stick to run. ' + drillName('Sprint', 'c') + ' goes faster.'] : ['Passer', 'Tap ' + drillName('Pass', 'a') + ' as the white ring meets the gold.'];
  },
  result() { const role = practice.role === 'passer' ? 'passer' : 'runner'; return { role, skill:role === 'runner' ? 'stamina' : 'handling' }; },
};

/* ---------- Cones: an obstacle course against the clock ----------
   Out through a zig-zag of gates, round the flag, and a sprint back through a straight line of gates to the finish. A missed
   gate adds two seconds and a clipped cone one. The Sprint meter lasts three seconds: spend it on the straights. Stars by time. */
const DRILL_CONES = { start:[24, 30], gates:[[32, 29], [38.5, 33], [45, 29], [51.5, 33], [58, 29], [57, 46], [47, 46], [37, 46]], out:5, turn:[66, 37], half:1.7, clip:0.5,
  hit:1, miss:2, line:26, box:[20, 22, 72, 52], cam:[50, 37], times:[12.5, 17] };   // the course stays left of the Sprint button
function conesCones() {                                    // every cone: each gate's pair, then the flag
  const K = DRILL_CONES, out = [];
  K.gates.forEach(([x, y], i) => { out.push({ x, y:y - K.half, g:i }, { x, y:y + K.half, g:i }); });
  out.push({ x:K.turn[0], y:K.turn[1], g:-1 });
  return out;
}
function conesTime(Q) { return practice.elapsed + Q.pen; }
function conesEnd(Q, finished) {
  const t = conesTime(Q), K = DRILL_CONES;
  const stars = !finished ? 0 : t <= K.times[0] ? 3 : t <= K.times[1] ? 2 : 1;
  practiceFinish(stars > 0, finished ? t.toFixed(1) + ' Seconds' : 'Out of Time', stars);
}
const drillCones = {
  setup(own) {
    const me = own[0], K = DRILL_CONES;
    M.players = [me];
    drillSpace(K.cam[0], K.cam[1]);
    drillPlace(me, K.start[0], K.start[1], 1, 0);
    setCtrl(0, me); placeBall(-30, -30);                   // no ball: this is running, and a carrier's Sprint is shorter
    practice.cones = { me, pass:K.gates.map(() => 0), hit:new Set(), pen:0, turned:false, px:me.x, py:me.y, cones:conesCones(), done:false };
  },
  tick(dt) {
    const Q = practice.cones, K = DRILL_CONES, me = Q.me;
    drillTap();
    Q.px = me.x; Q.py = me.y;
    drillRun(me, dt, K.box, true);
    K.gates.forEach(([gx, gy], i) => {                     // through a gate: crossing the line between its cones
      if (Q.pass[i]) return;
      if ((Q.px - gx)*(me.x - gx) <= 0 && Q.px !== me.x) {
        const y = Q.py + (me.y - Q.py)*(gx - Q.px)/(me.x - Q.px);
        if (Math.abs(y - gy) <= K.half) { Q.pass[i] = 1; st('conesGate'); sfx('tick'); return; }
      }
      const back = i >= K.out;
      if ((!back && me.x > gx + 1.5) || (back && Q.turned && me.x < gx - 1.5)) { Q.pass[i] = -1; Q.pen += K.miss; st('conesMiss'); drillTag('Missed', gx, gy); sfx('groan'); }   // ran past it
    });
    for (let i = 0; i < Q.cones.length; i++) {             // a clipped cone
      const c = Q.cones[i];
      if (Q.hit.has(i) || hyp(me.x - c.x, me.y - c.y) > K.clip) continue;
      Q.hit.add(i); Q.pen += K.hit; st('conesHit'); drillTag('+' + K.hit, c.x, c.y); sfx('trip');
    }
    if (!Q.turned && me.x >= K.turn[0] + 0.4) { Q.turned = true; sfx('whoosh'); }
    if (Q.turned && me.x <= K.line) {                      // home: any gate never run through still costs
      K.gates.forEach((g, i) => { if (!Q.pass[i]) { Q.pass[i] = -1; Q.pen += K.miss; } });
      conesEnd(Q, true);
    }
  },
  timeUp() { conesEnd(practice.cones, false); },
  labels() { const S = M.spr[0]; return { a:null, b:null, c:true, cOn:(!!S.p || S.m >= DRILL_RUN.floor) && !S.spent }; },
  hud() { const Q = practice.cones; return { pips:Q.pass.map(v => v > 0 ? 'got' : v < 0 ? 'miss' : 'todo'), num:conesTime(Q).toFixed(1), icon:'clock' }; },
  drawWorld() {
    const Q = practice.cones, K = DRILL_CONES; if (!Q) return;
    const lw = Math.max(0.12, 1.3/V.s);
    ctx.strokeStyle = 'rgba(241,238,228,.45)'; ctx.lineWidth = lw; ctx.setLineDash([0.6, 0.9]);   // the route
    ctx.beginPath(); ctx.moveTo(K.start[0], K.start[1]);
    for (let i = 0; i < K.out; i++) ctx.lineTo(K.gates[i][0], K.gates[i][1]);
    ctx.quadraticCurveTo(K.turn[0] + 4, K.turn[1] - 9, K.turn[0] + 2.2, K.turn[1]);
    ctx.quadraticCurveTo(K.turn[0] + 1, K.gates[K.out][1] + 1, K.gates[K.out][0], K.gates[K.out][1]);
    for (let i = K.out + 1; i < K.gates.length; i++) ctx.lineTo(K.gates[i][0], K.gates[i][1]);
    ctx.lineTo(K.line - 2, K.gates[K.gates.length - 1][1]);
    ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(241,238,228,.9)'; ctx.lineWidth = lw*1.6;   // start and finish lines
    ctx.beginPath(); ctx.moveTo(K.line, K.start[1] - 5); ctx.lineTo(K.line, K.start[1] + 5); ctx.stroke();
    for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? '#f1eee4' : '#14140f'; ctx.fillRect(K.line - 0.5, 41 + i, 1, 1); }
    const next = Q.pass.findIndex(v => !v);
    for (const c of Q.cones) {
      if (c.g < 0) continue;
      const v = Q.pass[c.g];
      drillCone(c.x, c.y, v > 0 ? 'done' : v < 0 ? 'miss' : c.g === next && (c.g < K.out || Q.turned) ? 'next' : null);
    }
    const [fx, fy] = K.turn;                               // the flag to run round
    if (!Q.turned) drillRing(fx, fy, 0.9, 'rgba(255,207,61,.95)', 0.14);
    ctx.fillStyle = '#ffcf3d'; ctx.beginPath(); ctx.arc(fx, fy, 0.35, 0, 7); ctx.fill();
    ctx.strokeStyle = '#f1eee4'; ctx.lineWidth = 0.14; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 2.2); ctx.stroke();
    ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.moveTo(fx, fy - 2.2); ctx.lineTo(fx + 1.4, fy - 1.8); ctx.lineTo(fx, fy - 1.4); ctx.closePath(); ctx.fill();
  },
  howTo() { return 'Run through every gate, round the flag and back. Missed gates and cones add time.'; },
  result() { return { skill:'pace' }; },
};

/* ---------- Tackling: position, height, timing, power, squeeze ----------
   One runner a rep. On the pitch, get into his path and stand still (Set). Then a side-on close-up, so height reads: aim
   at his thighs with the stick (too high is always a fail, the safety point; too low and he steps out), hold Tackle to load
   power and let go as he steps on the gold (Timing, Power), then Squeeze with taps or a hold to bring him down. Each rep
   names how every element went. Stars by good reps. */
const DRILL_TACKLE = { reps:5, jog:4.2, from:20, lane:[2.5, 5.5], at:[52, 35], setAt:6.5, inLine:1.0, still:2.2, side:6, run:3.2, zone:[1.0, 2.6], late:0.55, fill:0.55, power:0.6,
  aim:1.25, aim0:0.7, height:[0.28, 0.52], lunge:0.22, squeeze:1.3, tap:0.25, holdRate:1.4, show:2.0, box:[40, 23, 70, 47], cam:[60, 35], zoom:1.25, stars:[1, 2, 4] };
const TACKLE_PARTS = [['pos', 'Position'], ['height', 'Height'], ['time', 'Timing'], ['power', 'Power'], ['squeeze', 'Squeeze']];
function tackleRep(K) {                                    // the next runner, jogging down a lane a few metres off yours
  const T = practice.tackle, side = rnd() < 0.5 ? -1 : 1, lane = K.at[1] + side*(K.lane[0] + rnd()*(K.lane[1] - K.lane[0]));
  T.rep++; T.lane = lane; T.stage = 'approach'; T.t = 0; T.marks = {}; T.fail = null; T.d = K.side; T.h = K.aim0; T.charge = 0; T.wasDown = false; T.sq = 0; T.down = 0; T.lungeT = 0;
  drillPlace(T.me, K.at[0], K.at[1], 1, 0);
  drillPlace(T.ru, K.at[0] + K.from, lane, -1, 0);
  drillHold(T.ru);
  inputOf(0).aPressed = false;
}
function tackleMark(T, part, ok, word) { T.marks[part] = { ok, word }; }
function tackleJudge(T) {                                  // the commit: height, timing and power, the safety point first
  const K = DRILL_TACKLE;
  const h = T.h < K.height[0] ? 'low' : T.h > K.height[1] ? 'high' : 'ok';
  tackleMark(T, 'height', h === 'ok', h === 'ok' ? 'Height' : h === 'high' ? 'Too High' : 'Too Low');
  const tm = T.d > K.zone[1] ? 'early' : T.d < K.zone[0] ? 'late' : 'ok';
  tackleMark(T, 'time', tm === 'ok', tm === 'ok' ? 'Timing' : tm === 'early' ? 'Early' : 'Late');
  tackleMark(T, 'power', T.charge >= K.power, T.charge >= K.power ? 'Power' : 'Weak');
  T.fail = h === 'high' ? 'high' : h === 'low' ? 'low' : tm !== 'ok' ? tm : T.charge < K.power ? 'weak' : null;
  if (h === 'high') st('tackleHigh');
}
function tackleShow(T, good) {
  T.stage = 'show'; T.t = 0; T.good = good;
  for (const [k] of TACKLE_PARTS) if (!T.marks[k]) T.marks[k] = { ok:null, word:TACKLE_PARTS.find(p => p[0] === k)[1] };
  T.results.push(good);
  if (good) { T.made++; st('tackleGood'); sfx('cheer'); }
  else { sfx('groan'); }
}
function tackleEnd(T) {
  const stars = drillStarsOf(T.made, DRILL_TACKLE.stars);
  practiceFinish(stars > 0, T.made + (T.made === 1 ? ' Good Tackle' : ' Good Tackles'), stars);
}
const drillTackle = {
  setup(own, cpu) {
    const me = own[0], ru = cpu[0], K = DRILL_TACKLE;
    M.players = [me, ru];
    drillSpace(K.cam[0], K.cam[1], K.zoom);
    setCtrl(0, me);
    practice.tackle = { me, ru, rep:0, made:0, results:[], stage:'approach', t:0, marks:{} };
    tackleRep(K);
  },
  tick(dt) {
    const T = practice.tackle, K = DRILL_TACKLE, inp = inputOf(0), me = T.me, ru = T.ru;
    T.t += dt;
    if (T.stage === 'approach') {                          // on the pitch: into his path, then stand still
      drillTap();
      const sp = drillRun(me, dt, K.box, false);
      ru.x -= K.jog*dt; ru.vx = -K.jog; ru.fx = -1; ru.fy = 0; drillHold(ru);
      if (ru.x - me.x <= K.setAt) {
        const inLine = Math.abs(me.y - T.lane) <= K.inLine, set = sp <= K.still;
        tackleMark(T, 'pos', inLine && set, !inLine ? 'Off Line' : !set ? 'Not Set' : 'Position');
        if (inLine && set) { T.stage = 'side'; T.t = 0; T.d = K.side; me.vx = me.vy = 0; drillFace(me, ru.x, ru.y); inp.aPressed = false; T.wasDown = inp.aDown; }
        else { T.stage = 'past'; T.t = 0; st('tackleOffLine'); }
      }
    } else if (T.stage === 'past') {                       // he jogs on past you
      drillTap();
      ru.x -= K.jog*dt; drillHold(ru); drillRun(me, dt, K.box, false);
      if (T.t >= 0.9) tackleShow(T, false);
    } else if (T.stage === 'side') {                       // the close-up: aim, load, let go on the gold
      const j = inp.world();
      T.h = clamp(T.h - j.y*K.aim*dt, 0.06, 0.95);
      if (inp.aDown && !T.wasDown) T.charge = 0;           // a fresh press starts the load
      if (inp.aDown) T.charge = Math.min(1, T.charge + dt/K.fill);
      const released = T.wasDown && !inp.aDown && T.charge > 0;
      T.wasDown = inp.aDown; inp.aPressed = false;
      T.d -= K.run*dt;
      if (released) { tackleJudge(T); T.stage = 'lunge'; T.t = 0; T.dc = T.d; sfx('whoosh'); }
      else if (T.d <= K.late) { tackleMark(T, 'time', false, 'Late'); T.fail = 'late'; T.stage = 'lunge'; T.t = 0; T.dc = T.d; }
    } else if (T.stage === 'lunge') {
      T.d -= K.run*dt*(T.fail ? 1 : 0.4);
      if (T.t >= K.lunge) {
        if (T.fail) { T.stage = 'missed'; T.t = 0; sfx(T.fail === 'weak' ? 'tackle' : 'whiff'); }
        else { T.stage = 'squeeze'; T.t = 0; T.sq = 0; inp.aPressed = false; T.wasDown = inp.aDown; sfx('tackle'); buzz(30, 0); }
      }
    } else if (T.stage === 'squeeze') {                    // wrap and squeeze: quick taps or a hold
      if (inp.aPressed) T.sq += K.tap;
      if (inp.aDown && T.wasDown) T.sq += K.holdRate*dt;
      T.wasDown = inp.aDown; inp.aPressed = false;
      if (T.sq >= 1) { tackleMark(T, 'squeeze', true, 'Squeeze'); T.stage = 'down'; T.t = 0; sfx('hit'); buzz(45, 0); }
      else if (T.t >= K.squeeze) { tackleMark(T, 'squeeze', false, 'Loose'); T.fail = 'loose'; T.stage = 'missed'; T.t = 0; sfx('whiff'); }
    } else if (T.stage === 'missed') {
      drillTap(); T.d -= K.run*dt*1.4;
      if (T.t >= 0.8) tackleShow(T, false);
    } else if (T.stage === 'down') {
      drillTap();
      if (T.t >= 0.7) tackleShow(T, true);
    } else if (T.stage === 'show') {
      drillTap();
      if (T.t >= K.show) { if (T.rep >= K.reps) tackleEnd(T); else tackleRep(K); }
    }
  },
  timeUp() { tackleEnd(practice.tackle); },
  labels() {
    const T = practice.tackle, s = T.stage;
    if (s === 'side') return { a:'Tackle', aOn:true, cueA:false, b:null, c:false };
    if (s === 'squeeze') return { a:'Squeeze', aOn:true, cueA:true, b:null, c:false };
    return { a:null, b:null, c:false };
  },
  hud() { const T = practice.tackle, pips = []; for (let i = 0; i < DRILL_TACKLE.reps; i++) pips.push(i < T.results.length ? (T.results[i] ? 'got' : 'miss') : i === T.results.length ? 'now' : 'todo'); return { pips }; },
  cue() {
    const s = practice.tackle.stage;
    return s === 'approach' ? ['Set', 'Get in his path and stand still.'] : s === 'side' ? ['Aim and Tackle', 'Aim at his thighs. Hold ' + drillName('Tackle', 'a') + ', let go on the gold.']
      : s === 'squeeze' ? ['Squeeze', 'Tap or hold ' + drillName('Squeeze', 'a') + '.'] : null;
  },
  drawWorld() {                                            // on the pitch: his path, green under you when you are in it, and a gold ring once your feet are set
    const T = practice.tackle, K = DRILL_TACKLE; if (!T || (T.stage !== 'approach' && T.stage !== 'past')) return;
    const me = T.me, inLine = Math.abs(me.y - T.lane) <= K.inLine;
    ctx.strokeStyle = inLine ? 'rgba(98,214,128,.85)' : 'rgba(241,238,228,.45)'; ctx.lineWidth = Math.max(0.12, 1.3/V.s)*1.4; ctx.setLineDash([0.7, 0.7]);
    ctx.beginPath(); ctx.moveTo(T.ru.x - 0.8, T.lane); ctx.lineTo(K.box[0], T.lane); ctx.stroke(); ctx.setLineDash([]);
    if (inLine && hyp(me.vx, me.vy) <= K.still) drillRing(me.x, me.y, 1.35, 'rgba(255,207,61,.95)', 0.16);
  },
  drawScreen() { tackleDraw(practice.tackle); },
  howTo() { return 'Get in his path and stand still. Aim at his thighs, hold ' + drillName('Tackle', 'a') + ' and let go on the gold, then ' + drillName('Squeeze', 'a') + '.'; },
  result() { return { skill:'power' }; },
};
function tackleBody(x, y0, k, kit, o) {                    // a side-on player: o.dir faces (+1 right), o.lean (radians), o.crouch (0..1), o.phase (the running stride), o.down (0..1 fallen)
  const H = 1.8*k, dir = o.dir;
  ctx.save(); ctx.translate(x, y0);
  if (o.down) ctx.rotate((o.fwd ? 1 : -1)*dir*o.down*Math.PI/2*0.92);   // the runner goes down backwards, the tackler forwards
  const hip = H*(0.5 - 0.18*(o.crouch || 0)), sh = H*(0.82 - 0.3*(o.crouch || 0)), lean = o.lean || 0;
  const hx = 0, hy = -hip, sx = hx + dir*Math.sin(lean)*(sh - hip), sy = -hip - Math.cos(lean)*(sh - hip);
  ctx.lineCap = 'round'; ctx.strokeStyle = C.outline;
  const leg = (ph, shade) => {                             // thigh and shin
    const a = Math.sin(ph)*0.6, kx = hx + dir*Math.sin(a)*H*0.26, ky = hy + Math.cos(a)*H*0.26, fx = kx + dir*Math.sin(a - 0.5*Math.abs(a) - 0.1)*H*0.26, fy = Math.min(0, ky + H*0.26);
    ctx.strokeStyle = shade; ctx.lineWidth = H*0.11; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
  };
  leg((o.phase || 0) + Math.PI, '#1d2a21'); leg(o.phase || 0, kit.trim);
  ctx.fillStyle = kit.fill; ctx.strokeStyle = C.outline; ctx.lineWidth = Math.max(1.5, H*0.02);
  ctx.beginPath(); ctx.moveTo(hx - H*0.09, hy); ctx.lineTo(sx - H*0.1, sy); ctx.lineTo(sx + H*0.1, sy); ctx.lineTo(hx + H*0.09, hy); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.head; ctx.beginPath(); ctx.arc(sx + dir*H*0.03, sy - H*0.08, H*0.075, 0, 7); ctx.fill();
  if (o.ball) { ctx.fillStyle = '#f6f3ea'; ctx.strokeStyle = '#3b2f22'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(sx + dir*H*0.1, sy + H*0.12, H*0.08, H*0.05, dir*0.4, 0, 7); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}
function tackleDraw(T) {                                   // the side-on close-up: height on the runner reads as red, green and amber bands
  if (!T || !['side', 'lunge', 'squeeze', 'missed', 'down', 'show'].includes(T.stage) || (T.stage === 'show' && !T.marks.height)) {
    if (T && T.stage === 'show') tackleChips(T);
    return;
  }
  const K = DRILL_TACKLE, W = V.W, H = V.H, y0 = H*0.8, k = H*0.40/1.8, Hp = 1.8*k, tx = W*0.32;
  ctx.save();
  const sky = ctx.createLinearGradient(0, 0, 0, y0);    // a still, side-on view: the pitch behind is covered so only the two men read
  sky.addColorStop(0, '#13202a'); sky.addColorStop(1, '#2e4a58');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, y0);
  ctx.fillStyle = '#2a6233'; ctx.fillRect(0, y0, W, H - y0);
  ctx.fillStyle = 'rgba(244,241,232,.85)'; ctx.fillRect(0, y0 - 1, W, 2);
  ctx.fillStyle = 'rgba(255,207,61,.55)'; ctx.fillRect(tx + K.zone[0]*k, y0, (K.zone[1] - K.zone[0])*k, 10);   // the gold: let go as his front foot lands here
  const rx = tx + Math.max(0.35, T.d)*k + H*0.04, run = T.stage === 'side' || T.stage === 'lunge' || T.stage === 'missed';
  const fall = T.stage === 'down' || (T.stage === 'show' && T.good) ? clamp(T.stage === 'down' ? T.t/0.45 : 1, 0, 1) : 0;
  if (T.stage === 'side' || T.stage === 'lunge') {         // the bands on him: too high, right, too low
    const bx = rx - H*0.12, bw = H*0.26;
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#ff8466'; ctx.fillRect(bx, y0 - Hp, bw, Hp*(1 - K.height[1]));
    ctx.fillStyle = '#62d680'; ctx.fillRect(bx, y0 - Hp*K.height[1], bw, Hp*(K.height[1] - K.height[0]));
    ctx.fillStyle = '#ffcf3d'; ctx.fillRect(bx, y0 - Hp*K.height[0], bw, Hp*K.height[0]);
    ctx.globalAlpha = 1;
  }
  tackleBody(rx, y0, k, M.kit[1], { dir:-1, phase:run ? M.rt*11 : 0, lean:run ? 0.15 : 0, ball:true, down:fall });
  const zone = T.h > K.height[1] ? '#ff8466' : T.h < K.height[0] ? '#ffcf3d' : '#62d680';
  const contact = T.stage === 'squeeze' || T.stage === 'down' || (T.stage === 'show' && T.good);
  const lungeU = T.stage === 'lunge' ? clamp(T.t/K.lunge, 0, 1) : contact ? 1 : T.stage === 'missed' && T.fail !== 'late' ? 1 : 0;
  const reach = T.fail === 'early' ? (T.dc - K.zone[1] + 0.6)*k : 0;
  const mx = drillLerp(tx, rx - H*0.12, lungeU) - (T.fail === 'early' ? reach*lungeU : 0);
  const crouch = clamp((0.62 - T.h)/0.5, 0, 1);
  tackleBody(mx, y0, k, M.kit[0], { dir:1, fwd:true, crouch, lean:0.35 + 0.9*lungeU, phase:0, down:T.stage === 'missed' && T.fail !== 'high' ? clamp(T.t/0.3, 0, 1)*0.9 : contact ? 0.55 : 0 });
  if (T.stage === 'side') {                                // the aim: a bracket across him at the height you have chosen, coloured by the band
    const ay = y0 - T.h*Hp;
    ctx.strokeStyle = zone; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(rx - H*0.16, ay - 8); ctx.lineTo(rx - H*0.16, ay); ctx.lineTo(rx + H*0.14, ay); ctx.lineTo(rx + H*0.14, ay - 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx + H*0.1, ay); ctx.lineTo(rx - H*0.2, ay); ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    const px = tx - H*0.2, ph = Hp*0.8;                    // the power meter: fills while Tackle is held; the notch is enough
    ctx.fillStyle = 'rgba(8,14,10,.8)'; ctx.fillRect(px - 7, y0 - ph, 14, ph);
    ctx.fillStyle = T.charge >= K.power ? '#62d680' : '#ffcf3d'; ctx.fillRect(px - 5, y0 - ph*T.charge, 10, ph*T.charge);
    ctx.fillStyle = '#f1eee4'; ctx.fillRect(px - 10, y0 - ph*K.power - 1, 20, 3);
  }
  if (T.stage === 'squeeze') {                             // the squeeze: a ring that fills
    const cx = rx - H*0.06, cy = y0 - Hp*0.4, r = H*0.11;
    ctx.strokeStyle = 'rgba(241,238,228,.35)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#ffcf3d'; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + 2*Math.PI*clamp(T.sq, 0, 1)); ctx.stroke();
  }
  ctx.restore();
  tackleChips(T);
}
function tackleChips(T) {                                  // the five elements, a word each: green right, red wrong, grey not reached yet
  const W = V.W, top = Math.max(96, V.H*0.27), gap = 6, w = Math.min(124, (W - 120 - gap*4)/5), x0 = W/2 - (w*5 + gap*4)/2;
  ctx.save();
  ctx.font = `800 15px 'Big Shoulders Display', Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  TACKLE_PARTS.forEach(([k, label], i) => {
    const m = T.marks[k], x = x0 + i*(w + gap);
    ctx.fillStyle = !m || m.ok == null ? 'rgba(16,27,20,.85)' : m.ok ? 'rgba(46,140,74,.95)' : 'rgba(186,64,44,.95)';
    rrect(x, top, w, 28, 5); ctx.fill();
    ctx.fillStyle = !m || m.ok == null ? 'rgba(241,238,228,.55)' : '#f1eee4';
    ctx.fillText((m ? m.word : label).toUpperCase(), x + w/2, top + 14.5);
  });
  if (T.stage === 'show') {                                // the verdict under the chips: the rep, or the first thing to put right
    const bad = TACKLE_PARTS.map(([k]) => T.marks[k]).find(m => m && m.ok === false);
    ctx.font = `900 34px 'Big Shoulders Display', Impact, sans-serif`; ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(8,14,10,.9)';
    ctx.fillStyle = T.good ? '#62d680' : '#ff8466';
    const word = (T.good ? 'Great Tackle' : bad ? bad.word : 'Try Again').toUpperCase();
    ctx.strokeText(word, W/2, top + 62); ctx.fillText(word, W/2, top + 62);
  }
  ctx.restore();
}

/* ---------- Kicking: a run of five goal kicks ----------
   The first is close and in front with no wind; each one after is further out, wider and windier. Stars by kicks made. */
const DRILL_KICKS = { spots:[[100, 35, 0], [97, 28, 5], [94, 43, 9], [90, 23, 13], [86, 48, 18]], stars:[2, 3, 5] };
function kickNext(K) {
  const [x, y, mph] = DRILL_KICKS.spots[K.i];
  M.wind = { ...M.wind, mph };
  goalKick(0, x, y, 'conversion');
}
const drillKick = {
  setup() {
    M.wind = { ...M.wind, mph:0 };
    practice.kick = { i:0, made:0, shots:[] };
    kickNext(practice.kick);
  },
  onGoal(g) {                                              // a judged kick: count it, then the next spot, or the result
    const K = practice.kick;
    K.shots.push(!!g.ok); if (g.ok) K.made++;
    K.i++;
    if (K.i < DRILL_KICKS.spots.length) { kickNext(K); return true; }
    const stars = drillStarsOf(K.made, DRILL_KICKS.stars);
    practiceFinish(stars > 0, K.made + ' of ' + K.shots.length + ' Kicks', stars);
    return true;
  },
  timeUp() { const K = practice.kick, stars = drillStarsOf(K.made, DRILL_KICKS.stars); practiceFinish(stars > 0, K.made + ' of ' + DRILL_KICKS.spots.length + ' Kicks', stars); },
  hud() { const K = practice.kick, pips = []; for (let i = 0; i < DRILL_KICKS.spots.length; i++) pips.push(i < K.shots.length ? (K.shots[i] ? 'got' : 'miss') : i === K.shots.length ? 'now' : 'todo'); return { pips }; },
  howTo() { return 'Five kicks, each further out and windier. Steer the arrow with your run controls, hold ' + drillName('Kick', 'a') + ' and let go in the gold.'; },
  result() { return { skill:'kicking' }; },
};

/* ---------- Driving: three scrums, each pack a little stronger ----------
   The match's own scrum, as it is: Crouch, Bind, Set, a Good Hit on Set, then tap Push to drive. A drive is won when your pack
   gains half a metre or more. Stars by drives won. */
const DRILL_DRIVE = { scrums:3, cpu:[0.55, 0.8, 1.0], gain:0.5, at:[60, 35], stars:[1, 2, 3] };
function driveNext(D) {
  startScrum({ team:0, x:DRILL_DRIVE.at[0], y:DRILL_DRIVE.at[1] });
  if (M.cut && M.cut.kind === 'scrum') M.cut.base[1] *= DRILL_DRIVE.cpu[D.i];   // the other pack's strength for this scrum
}
const drillDrive = {
  setup() { practice.drive = { i:0, won:0, res:[] }; driveNext(practice.drive); },
  onScrum(c) {
    const D = practice.drive, won = c.result === 'dom0' || (c.result === 'win0' && c.pos >= DRILL_DRIVE.gain);
    D.res.push(won); if (won) D.won++;
    say(won ? 'Drive Won' : c.pos < 0 ? 'Pushed Back' : 'Held', won ? '' : 'small', won ? 0 : 1); sfx(won ? 'cheer' : 'groan');
    finishCut(() => {
      if (!practice) return;
      D.i++;
      if (D.i < DRILL_DRIVE.scrums) { M.phase = 'play'; driveNext(D); return; }
      const stars = drillStarsOf(D.won, DRILL_DRIVE.stars);
      practiceFinish(stars > 0, D.won + (D.won === 1 ? ' Drive Won' : ' Drives Won'), stars);
    }, 0.8);
    return true;
  },
  timeUp() { const D = practice.drive, stars = drillStarsOf(D.won, DRILL_DRIVE.stars); practiceFinish(stars > 0, D.won + (D.won === 1 ? ' Drive Won' : ' Drives Won'), stars); },
  hud() { const D = practice.drive, pips = []; for (let i = 0; i < DRILL_DRIVE.scrums; i++) pips.push(i < D.res.length ? (D.res[i] ? 'got' : 'miss') : i === D.res.length ? 'now' : 'todo'); return { pips }; },
  howTo() { return 'Tap ' + drillName('Push', 'a') + ' on Set, then keep tapping as fast as you can.'; },
  result() { return { skill:'power' }; },
};

/* ---------- the two open-play scenarios, as before; stars by how quickly they are done ---------- */
const DRILL_QUICK = { defend:[7, 11], pass:[10, 15] };    // seconds for three stars, then two; any later win is one
const drillQuickStars = (id, won) => !won ? 0 : practice.elapsed <= DRILL_QUICK[id][0] ? 3 : practice.elapsed <= DRILL_QUICK[id][1] ? 2 : 1;
const drillDefend = {
  setup(own, cpu) {
    M.players = [own[0], own[1], cpu[0]];
    drillPlace(cpu[0], 49, 35); drillPlace(own[0], 56, 35); drillPlace(own[1], 36, 39);
    setCarrier(cpu[0]); setCtrl(0, own[0]); practice.initialCtrl = own[0];
    practice.cam = null; M.cam.x = 44; M.cam.y = 35;
  },
  tick() { if (ctrlOf(0) !== practice.initialCtrl) practice.switched = true; },
  onTackle(c, q) {                                         // any made tackle on the runner, the one that jolts the ball loose included
    if (c.team !== 1) return false;
    const won = practice.switched && q === ctrlOf(0);
    practiceFinish(won, won ? 'You switched into cover and stopped the runner.' : 'Switch to the defender ahead of the ball, then meet the runner.', drillQuickStars('defend', won));
    return true;
  },
  hud() { return { bar:1 - practice.elapsed/practice.limit }; },
  result() { return { skill:'pace' }; },
};
const drillPass = {
  setup(own, cpu) {
    M.players = [own[0], own[1], cpu[0]];
    drillPlace(own[0], 83, 31); drillPlace(own[1], 80, 42); drillPlace(cpu[0], 94, 31);
    setCarrier(own[0]); practice.firstCarrier = own[0];
    M.cam.x = 91; M.cam.y = 35;
  },
  tick() {
    const b = M.ball;
    if (b.state === 'held' && b.carrier.team === 0 && b.carrier !== practice.firstCarrier && M.stats.passes > 0) practice.completedPass = true;
    if ((b.state === 'held' && b.carrier.team === 1) || M.phase === 'set') practiceFinish(false, 'Keep the defender with the ball carrier, then pass before contact. Try again.', 0);
  },
  hud() { return { bar:1 - practice.elapsed/practice.limit }; },
  result() { return { skill:'handling' }; },
};

const DRILL_KIT = { egg:drillEgg, circle:drillCircle, cones:drillCones, tackle:drillTackle, kick:drillKick, scrum:drillDrive, defend:drillDefend, pass:drillPass };
const drillKit = () => (practice ? DRILL_KIT[practice.id] : null);
/* the engine's hooks: each returns true when the drill has taken the moment */
function practiceTackle(c, q) { const k = drillKit(); return !!(k && k.onTackle && k.onTackle(c, q)); }
function practiceGoal(g) { const k = drillKit(); return !!(k && k.onGoal && k.onGoal(g)); }
function practiceScrum(c) { const k = drillKit(); return !!(k && k.onScrum && k.onScrum(c)); }
function practiceTry(p) {                                  // a try inside a drill ends it: only the two-on-one is won that way
  if (practice.id === 'pass' && p.team === 0 && practice.completedPass) { practiceFinish(true, 'You moved the ball to support and finished the attack.', drillQuickStars('pass', true)); return; }
  practiceFinish(false, p.team === 0 ? 'Draw the defender, then pass to your supporting runner before scoring.' : 'The runner got through. Switch into cover and run towards the ball.', 0);
}
function drillLabels() { const k = drillKit(); return (k && k.labels && k.labels()) || { a:null, b:null, c:false }; }
function drillDrawWorld() { const k = drillKit(); if (k && k.drawWorld && !M.cut) k.drawWorld(); }
function drillDrawScreen() { const k = drillKit(); if (k && k.drawScreen) k.drawScreen(); }
let drillHudKey = '';
const DRILL_HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.3 5.3 3.2 1.7-1.9 3.1-3.2 5.3-3.2 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>';
function drillHudSync() {                                  // the drill bar: pips, hearts, a count and a draining bar; rewritten only when it changes, and never a live region
  const k = drillKit(); if (!k || !k.hud) return;
  const h = k.hud(), key = JSON.stringify(h);
  if (key === drillHudKey) return;
  drillHudKey = key;
  let html = '';
  if (h.lives) for (let i = 0; i < h.lives[1]; i++) html += `<i class="dh-life${i < h.lives[0] ? '' : ' lost'}">${DRILL_HEART}</i>`;
  if (h.pips) html += h.pips.map(s => `<i class="dh-pip ${s}"></i>`).join('');
  $('dh-pips').innerHTML = html;
  $('dh-num').textContent = h.num == null ? '' : h.num;
  $('dh-num').hidden = h.num == null;
  $('dh-num').className = h.icon ? 'ic-' + h.icon : '';
  $('dh-bar').hidden = h.bar == null;
  if (h.bar != null) $('dh-bar').style.setProperty('--t', clamp(h.bar, 0, 1).toFixed(3));
}

/* ---------- the drill cards' pictures: line drawings, no image files ---------- */
const DRILL_ICONS = {
  egg:'<path d="M5 33q5-14 10 0q4-9 8 0" class="dash"/><ellipse cx="28" cy="13" rx="8" ry="5" transform="rotate(-30 28 13)" class="acc"/><path d="M24.5 15.5l7-5" class="seam"/>',
  circle:'<circle cx="20" cy="20" r="12" class="dash"/>' + [0, 1, 2, 3, 4, 5].map(i => { const a = -Math.PI/2 + i*Math.PI/3; return `<circle cx="${(20 + 12*Math.cos(a)).toFixed(1)}" cy="${(20 + 12*Math.sin(a)).toFixed(1)}" r="3.2" class="${i ? 'man' : 'acc'}"/>`; }).join(''),
  cones:'<path d="M4 34q6-10 12-4t12-4" class="dash"/><path d="M8 31l3-9 3 9z" class="cone"/><path d="M19 25l3-9 3 9z" class="cone"/><path d="M29 31l3-9 3 9z" class="cone"/>',
  tackle:'<circle cx="27" cy="7" r="3"/><path d="M27 10v11M27 21l-3 13M27 21l4 13M27 14l-4 4"/><path d="M27 23h-3" class="band"/><ellipse cx="15" cy="24" rx="9" ry="3.6" class="acc" transform="rotate(-10 15 24)"/>',
  kick:'<path d="M12 4v32M28 4v32M12 22h16"/><ellipse cx="20" cy="13" rx="4" ry="2.6" class="acc"/>',
  scrum:'<rect x="3" y="13" width="14" height="14" rx="4" class="man"/><rect x="23" y="13" width="14" height="14" rx="4"/><ellipse cx="20" cy="33" rx="3.4" ry="2.2" class="acc"/>',
  defend:'<path d="M20 4l12 4v10c0 8-5.5 13-12 16C13.5 31 8 26 8 18V8z"/><path d="M15 19l4 4 7-8" class="acc-line"/>',
  pass:'<circle cx="8" cy="28" r="4" class="man"/><circle cx="32" cy="28" r="4" class="man"/><path d="M11 23q9-16 18 0" class="dash"/><ellipse cx="20" cy="13" rx="3.6" ry="2.4" class="acc"/>',
};
const drillIconSvg = id => `<svg viewBox="0 0 40 40" aria-hidden="true">${DRILL_ICONS[id] || ''}</svg>`;
const DRILL_STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.4l-6.1 3.5 1.5-6.8L2.2 9.5l6.9-.7z"/></svg>';
function drillStarsHtml(n) { let s = ''; for (let i = 0; i < 3; i++) s += `<i class="${i < n ? 'on' : ''}">${DRILL_STAR}</i>`; return s; }
