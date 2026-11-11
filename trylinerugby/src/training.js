/* =========================================================
   The games: Skill Games, and the career's Train.
   Tag Chase, Bouncy Egg, Pass Around the Circle, Cones, Tackling and Ball Back each run in a training space of their own: a practice field (drawn in
   render-drill.js) and the controls of a match with none of its flow. While practice.space is set, update() skips matchUpdate and the drill moves
   the men and the ball itself (M.phase reads 'drill', so nothing in the HUD or the hints takes it for open play). Kicking
   and Driving use the match's own goal-kick and scrum close-ups; Defend a Breakaway and Create a Gap restage open play,
   five rounds each. Every engine hook checks `practice` first, so matches, AI v AI, the demo and the balance tools never reach any of it,
   and nothing here draws a random number outside a drill.
   ========================================================= */
const DRILL_PACE = { live:0.75 };                           // the Training Ground's one speed lever: a live drill's dt is scaled by this, so its windows, meters and clocks all stretch together. Matches never read it
const drillRate = () => (!practice ? 1 : practice.demo ? practice.demo.rate : DRILL_PACE.live);   // this step's scale: a match is 1, a live drill the lever, Watch How its own slow motion (drill-demo.js)
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
function drillRun(p, dt, box, sprint, slide) {              // the human's own run: the stick steers; Sprint (when the drill allows it) is a burst from the meter, with less grip to turn on if the drill says (slide). box: [x0, y0, x1, y1]
  const j = inputOf(0).world();
  if (sprint) drillSprint(p, dt, j.mag > 0.2); else { p.sprinting = false; p.sprint = 0; }
  const ms = maxSpeed(p);
  const cur = hyp(p.vx, p.vy), turning = slide && p.sprinting && cur > 1 && j.mag > 0.2 && (p.vx*j.x + p.vy*j.y)/(cur*j.mag) < 0.87;   // only the turn: a sprinter gathers speed in a straight line as anyone does
  steer(p, j.x*ms, j.y*ms, turning ? slide : DRILL_RUN.acc, dt);
  const x = clamp(p.x + p.vx*dt, box[0], box[2]), y = clamp(p.y + p.vy*dt, box[1], box[3]);
  if (x !== p.x + p.vx*dt) p.vx = 0;
  if (y !== p.y + p.vy*dt) p.vy = 0;
  p.x = x; p.y = y;
  const sp = hyp(p.vx, p.vy); if (sp > 0.6) { p.fx = p.vx/sp; p.fy = p.vy/sp; }
  return sp;
}
function drillTag(text, x, y) { M.tags.push({ text, x, y, t:0 }); while (M.tags.length > 2) M.tags.shift(); }   // a word on the pitch in a drill: the drills' own words, kept apart from the match's fixed list
function drillTap() { const inp = inputOf(0), a = inp.aPressed; inp.aPressed = inp.bPressed = inp.cPressed = false; return a; }   // a training space reads its own presses
const drillKey = act => (lastDev === 'pad' ? { a:'Bottom Button', b:'Right Button', c:'Shoulder', m:'Stick' }[act] : seatKey(0, act));   // what this player presses: the pad's own button once a pad is what they last used, else the keyboard's key
function drillName(word, act) { return word + (lastDev === 'touch' ? '' : ' (' + drillKey(act) + ')'); }   // a button's name, with its key on a keyboard or a controller: the one namer for cards, live cues and Watch How
const drillIsKeys = () => lastDev === 'kb';
const drillMove = () => (drillIsKeys() ? 'Press ' + drillKey('m') : 'Push the stick');   // moving, in the words of the device in hand
const drillSide = what => (drillIsKeys() ? 'Press A or D ' + what : 'Push the stick ' + what);   // a left or right choice. what: 'for the tick', 'towards your team'
function drillCue(objective, cue) {                        // the in-play line, written only when it changes (it is a polite live region)
  const key = objective + '|' + (cue || '');
  if (practice.cueKey === key) return;
  practice.cueKey = key;
  $('pr-objective').textContent = objective; $('pr-cue').textContent = cue || '';
  $('practice-cue').hidden = !objective;
}

/* ---------- Bouncy Egg: a thrower and a catcher ----------
   The thrower faces you and, after the same short wind-up every time, spins the ball into the ground so it tumbles away in hops
   at odd angles, passes it flat, or throws it high and long. The first three throws are one of each, named as thrown; after that
   you only know which at the release. Catch it cleanly: within reach and below head height, and a bounce pass only once it has
   hit the ground, then on any hop until it stops (so every Bounce Pass really bounces). A flat pass stays low from the hands to
   the catch, so running at it meets it anywhere on its way. A flat pass or a high ball that lands untouched costs a heart and
   hops away; so does a bounce pass that stops untouched. Running to meet the ball scores double what waiting for it does: that
   is the habit the game is after. The throws get quicker and wilder as the run goes on. You can come no nearer the thrower than
   six metres (box): every throw leaves the thrower's hands within reach of a catcher standing close, so closer would catch the
   lot with no reactions at all. named: while the first three are named the line at the top of the screen is up, so they keep clear of it. */
const DRILL_EGG = { throws:12, lives:3, reach:1.15, lo:0.35, hi:2.4, wind:[1.0, 0.55], gap:0.6, miss:1.3, box:[51, 24, 73, 46], at:[60, 35], from:[45, 35], cam:[55, 35], zoom:1.45,
  first:['bounce', 'flat', 'high'], names:{ bounce:'Bounce Pass', flat:'Flat Pass', high:'High Ball' }, lines:{ bounce:'Catch it on any hop.', flat:'Run to meet it before it lands.', high:'Get under it. Watch the ball in.' },
  named:7, flatTop:1.8, meet:1.5, points:[1, 2], pop:[4.6, 7.0], hopOut:[2.2, 4.7], keep:[0.66, 0.8], turn:[0.45, 1.3], slow:0.72, stop:1.15, roll:3.5, still:0.4, stars:[8, 14, 20], bounce:0.9 };
/* bounce: after the first three, a throw is a Bounce Pass this often, else a Flat Pass or a High Ball, the surprise. Never three the same in a row caps
   it: about two in three bounce (0.63 measured over many seeded throws). The gold ring is a help, not the game: the youngest see it on every
   throw, Easy and Normal on the first three, Hard never; Watch How always. eggRing is the one gate, and draws no random number. */
const eggRingAll = () => practiceYoung() && settings.diff < 2;   // the Kids level or Minis, and not on Hard: the ring every throw
const eggRing = E => !!practice && (!!practice.demo || (settings.diff < 2 && (eggRingAll() || E.n <= DRILL_EGG.first.length)));
function eggStage(E, stage) { E.stage = stage; E.t = 0; }
function eggReady(E) {                                     // the ball back in the thrower's hands and the wind-up begins, a little shorter each throw
  const u = Math.min(1, E.n/(DRILL_EGG.throws - 2));
  E.wind = drillLerp(DRILL_EGG.wind[0], DRILL_EGG.wind[1], u);
  eggStage(E, 'wind');
  E.aim = null;
  M.ball.tumble = null;
  drillHold(E.tw);
}
function eggThrow(E) {
  const b = M.ball, me = E.me, tw = E.tw, K = DRILL_EGG, u = Math.min(1, E.n/(K.throws - 2)), wild = 0.6 + 1.6*u;
  const kinds = ['bounce', 'flat', 'high'];
  let kind = rnd() < K.bounce ? 'bounce' : rnd() < 0.5 ? 'flat' : 'high';   // mostly a Bounce Pass: a Flat Pass or a High Ball is the surprise
  if (kind === E.hist[0] && kind === E.hist[1]) kind = kinds[(kinds.indexOf(kind) + 1 + Math.floor(rnd()*2)) % 3];   // never three the same in a row
  if (E.n < K.first.length) kind = K.first[E.n];           // the first three: one of each, in the order Watch How shows them
  E.hist.unshift(kind); E.hist.length = Math.min(E.hist.length, 2);
  E.kind = kind; E.n++; E.bounced = false; E.rolling = false; E.hops = []; E.hopV = 0; E.g = 9.8;
  b.state = 'loose'; b.carrier = null; b.f = null; b.last = 1; b.kickInfo = null;
  b.x = tw.x + tw.fx*0.6; b.y = tw.y + tw.fy*0.6; b.z = 1.6; b.tumble = 0;
  E.spin = (rnd() < 0.5 ? -1 : 1)*(kind === 'high' ? 5 : kind === 'flat' ? 2 : 8);   // end over end: see drawBall
  if (E.n <= K.first.length) drillTag(K.names[kind], tw.x, tw.y);
  let tx, ty, T, zEnd;
  if (kind === 'flat') {                                   // a flat pass, chest high from the hands to you, to one side of you: see below for how it stays low
    tx = me.x + (rnd() - 0.5)*1.2*wild; ty = me.y + (rnd() - 0.5)*3.2*wild; zEnd = 1.3;
    T = Math.max(0.35, hyp(tx - b.x, ty - b.y)/(10 + 6*u));
  } else if (kind === 'high') {                            // up and long: it comes down a few metres away; the gold ring shows where
    const a = rnd()*2*Math.PI, r = 2.5 + rnd()*(2 + 3*u);
    tx = clamp(me.x + Math.cos(a)*r, K.box[0] + 1, K.box[2] - 1); ty = clamp(me.y + Math.sin(a)*r, K.box[1] + 1, K.box[3] - 1); zEnd = 1.2;
    T = 2.0 - 0.45*u;
  } else {                                                 // spun into the ground short of you: it tumbles off at an odd angle
    const d = hyp(me.x - b.x, me.y - b.y) || 1, back = 1.5 + rnd()*1.5;
    tx = me.x - (me.x - b.x)/d*back + (rnd() - 0.5)*1.5*wild; ty = me.y - (me.y - b.y)/d*back + (rnd() - 0.5)*1.5*wild; zEnd = 0;
    T = 0.5 + 0.2*(1 - u);
  }
  const B = K.box;                                         // never out of reach: every throw comes down inside the area you can run in. A bounce may land short of it, between the thrower and you (its hop carries it in); pulling it into the area would send it past you at chest height instead
  tx = kind === 'bounce' ? clamp(tx, tw.x + 3, B[2] - 3) : clamp(tx, B[0] + 1, B[2] - 3); ty = clamp(ty, E.n <= K.first.length ? B[1] + K.named : B[1] + 3, B[3] - 3);
  E.aim = { x:tx, y:ty };                                  // the gold ring on the grass: where this throw comes down to you. A flat pass and a high ball are at catching height there, and a bounce pass lands there
  b.vx = (tx - b.x)/T; b.vy = (ty - b.y)/T; b.vz = (zEnd - b.z + 4.9*T*T)/T;
  if (kind === 'flat') {                                   // same time in the air, but its top is K.flatTop whatever the range: a long pass under full gravity would lob over the catch limit. The speed is the fall this flight needs
    const up = K.flatTop - b.z, drop = b.z - zEnd, s = (Math.sqrt(2*up) + Math.sqrt(2*up + 2*drop))/T;
    E.g = s*s; b.vz = Math.sqrt(2*E.g*up);
  }
  eggStage(E, 'fly');
  sfx('pass');
}
function eggMove(E, dt) { return hopMove(M.ball, E, DRILL_EGG, dt); }   // the ball through the air, then along the ground once its hops are done. True the step it lands. The hop is shared with a match's spilled ball (src/ball.js)
function eggHop(E) {                                       // off the ground again, at an odd angle, each hop smaller than the last. Too small a hop and it rolls
  const b = M.ball, K = DRILL_EGG, B = K.box, u = Math.min(1, (E.n - 1)/(K.throws - 2));
  const fit = (b, vx, vy, air) => { b.vx = eggPop(b.x, vx, air, B[0] + 1.5, B[2] - 1.5); b.vy = eggPop(b.y, vy, air, E.n <= K.first.length ? B[1] + K.named : B[1] + 1.5, B[3] - 1.5); };   // it comes down inside the area: as it goes, else turned back, else aimed at the nearest spot in it
  if (!hopBounce(b, E, K, u, fit)) { E.aim = { x:b.x + b.vx/K.roll, y:b.y + b.vy/K.roll }; return; }   // the ring moves to where it will roll to a stop
  const air = 2*b.vz/9.8;
  E.aim = { x:b.x + b.vx*air, y:b.y + b.vy*air };          // the ring moves to where this hop comes down
}
function eggMiss(E) {
  const b = M.ball;
  E.lives--; st('eggMiss');
  eggStage(E, 'missed');
  drillTag('Missed', b.x, b.y); sfx('groan');
}
function eggMeeting(E) {                                   // running at the ball as it arrives, rather than standing and waiting for it
  const b = M.ball, me = E.me, sp = hyp(me.vx, me.vy), d = hyp(b.x - me.x, b.y - me.y);
  return sp >= DRILL_EGG.meet && (d < 0.6 || me.vx*(b.x - me.x) + me.vy*(b.y - me.y) >= -0.35*sp*d);   // on to it, across to it or right under it; only running away from it does not count
}
function eggFly(E, dt) {
  const b = M.ball, me = E.me, K = DRILL_EGG, landed = eggMove(E, dt);
  if (hyp(me.x - b.x, me.y - b.y) < K.reach && (E.kind === 'bounce' ? E.bounced : b.z >= K.lo) && b.z < K.hi) {   // within reach and below head height, and a bounce pass only once it has hit the ground: a clean catch
    const met = eggMeeting(E);
    E.caught++; E.score += K.points[met ? 1 : 0]; if (met) E.met++; st('eggCatch'); if (met) st('eggMet');
    b.tumble = null; drillHold(me); eggStage(E, 'caught');
    drillTag(met ? 'Met It' : 'Caught', me.x, me.y); sfx('catch'); buzz(20, 0);
    return;
  }
  if (E.kind === 'bounce') {
    if (landed) { E.bounced = true; eggHop(E); }
    else if (E.rolling && hyp(b.vx, b.vy) < K.still) eggMiss(E);   // it stopped before anyone got to it
    return;
  }
  if (landed) { eggMiss(E); eggHop(E); }                   // it landed untouched, and hops away
}
function eggPop(p, v, air, lo, hi) {
  const at = p + v*air, back = p - v*air;
  return at >= lo && at <= hi ? v : back >= lo && back <= hi ? -v : (clamp(at, lo, hi) - p)/air;
}
function eggEnd(E) {
  const stars = drillStarsOf(E.score, DRILL_EGG.stars);
  practiceFinish(stars > 0, E.caught + (E.caught === 1 ? ' Catch' : ' Catches'), stars);
}
const drillEgg = {
  setup(own, cpu) {
    const me = own[0], tw = cpu[0];
    M.players = [me, tw];
    drillSpace(DRILL_EGG.cam[0], DRILL_EGG.cam[1], DRILL_EGG.zoom);
    drillPlace(me, DRILL_EGG.at[0], DRILL_EGG.at[1], -1, 0); drillPlace(tw, DRILL_EGG.from[0], DRILL_EGG.from[1], 1, 0);
    setCtrl(0, me);
    const E = practice.egg = { g:9.8, me, tw, n:0, caught:0, met:0, score:0, lives:DRILL_EGG.lives, stage:'wind', t:0, wind:DRILL_EGG.wind[0], kind:null, hist:[], bounced:false, rolling:false, hops:[], hopV:0, spin:0, aim:null };
    eggReady(E);
  },
  tick(dt) {
    const E = practice.egg;
    drillTap();
    drillRun(E.me, dt, DRILL_EGG.box, false);
    drillFace(E.tw, E.me.x, E.me.y);
    E.t += dt;
    if (E.stage === 'wind') { drillHold(E.tw); if (E.t >= E.wind) eggThrow(E); }
    else if (E.stage === 'fly') eggFly(E, dt);
    else if (E.stage === 'caught') { drillHold(E.me); if (E.t >= DRILL_EGG.gap) this.next(E); }
    else if (E.stage === 'missed') { if (eggMove(E, dt)) eggHop(E); if (E.t >= DRILL_EGG.miss) this.next(E); }
  },
  next(E) { if (E.lives <= 0 || E.n >= DRILL_EGG.throws) eggEnd(E); else eggReady(E); },
  timeUp() { eggEnd(practice.egg); },
  labels() { return { a:null, b:null, c:false }; },
  hud() { const E = practice.egg; return { lives:[E.lives, DRILL_EGG.lives], num:String(E.score), icon:'ball' }; },
  cue() { const E = practice.egg, K = DRILL_EGG; return E.stage === 'fly' && E.n <= K.first.length ? [K.names[E.kind], K.lines[E.kind]] : null; },   // the first three throws, named as they come
  howTo() { return eggRingAll() ? 'The gold ring shows where the ball comes down. Run to meet it and catch it.' : 'Watch the ball in. Run to meet it and catch it.'; },
  tip() { const E = practice.egg; return E.met*2 >= E.caught && E.caught ? 'Running to meet the ball scored double.' : 'Run to meet the ball. It scores double.'; },
  result() { return { skill:'handling' }; },
};

/* ---------- Pass Around the Circle ----------
   A ring of six. The runner passes, then runs round the outside and must be home before the ball has been passed all the
   way round. A small ring is easiest for a runner and a large one for a passer, so the Runner's ring grows a metre a round and
   the Passer's shrinks a metre a round. Runner: you run (hold the stick, Sprint from the meter) and the passers speed up.
   Passer: you make every pass with a timed tap as the closing ring meets the gold one, the hands finishing at the catcher's
   chest: on the gold is a Chest pass and quickest, an early tap goes over their head and is fumbled, a late one drops low and
   hangs. The runner speeds up. Either way the first pass of a round is timed on the same ring: to the chest and the passer's
   hands are free at once (the Runner gets away already moving, the Passer's ball is quicker). Stars by rounds survived.
   The Runner's passers are graded at random, as yours are as the Passer, with the same words and flights: Chest (quick), Good, Too High
   (fumbled and gathered) and Too Low (late, hanging). More Chest passes as the rounds go on, more fumbles early (cpu: each grade's share a
   round, Good the rest). The round's grades and holds are drawn as it starts (circleGo), and the holds rescaled so the ball's lap is the
   one runF set, to the step (cpuPass's flights and one fixed hold each, as before the grades: lapT), so every Runner's stars are as they
   were. cpuMin: the least a hold is scaled by. */
const DRILL_CIRCLE = { n:6, r0:5, grow:1, rounds:5, out:1.6, acc:10, runF:[1.30, 1.05, 0.93, 0.915, 0.89], cpuPass:14, passG:[3.0, 1.45, 1.0, 0.8, 0.54],
  cpu:{ Perfect:[0.15, 0.25, 0.35, 0.45, 0.55], Early:[0.25, 0.2, 0.15, 0.1, 0.05], Late:[0.2, 0.18, 0.15, 0.12, 0.1] }, cpuMin:0.6,
  fast:16, good:12, slow:8, ready:0.6, perfect:0.1, ok:0.25, fumble:1.1, late:0.5, growT:0.8, endT:1.1, at:[60, 35], zoom:1.35, stars:[1, 3, 5], beat:1.2, chestAt:0.9, rolling:0.8, follow:0.2, offLine:0.5, words:{ Perfect:'Chest', Good:'Good', Early:'Too High', Late:'Too Low' } };
const circleRadius = (role, round) => DRILL_CIRCLE.r0 + DRILL_CIRCLE.grow*(role === 'passer' ? DRILL_CIRCLE.rounds - round : round - 1);   // this round's ring: the Runner's small to large, the Passer's large to small
const circleStartE = C => ((C.t - DRILL_CIRCLE.chestAt + DRILL_CIRCLE.beat/2 + 2*DRILL_CIRCLE.beat) % DRILL_CIRCLE.beat) - DRILL_CIRCLE.beat/2;   // the round's first pass: seconds off the gold, the ring closing over and over until you tap
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
const circleSpeed = g => (g === 'Perfect' ? DRILL_CIRCLE.fast : g === 'Early' ? DRILL_CIRCLE.slow : DRILL_CIRCLE.good);   // a grade's flight, yours as the Passer and the CPU's alike
function circleCpuGrade(k) {                               // a CPU pass in round k + 1: Chest more often as the rounds go on, Too High less
  const P = DRILL_CIRCLE.cpu, u = rnd(), a = P.Perfect[k], b = a + P.Early[k], c = b + P.Late[k];
  return u < a ? 'Perfect' : u < b ? 'Early' : u < c ? 'Late' : 'Good';
}
function circleCpuBase(g) {                                // its hold before scaling, as a Passer's tap would be: on the gold, a little off it, early or late
  const K = DRILL_CIRCLE;
  if (g === 'Perfect') return K.ready;
  if (g === 'Early') return K.ready - K.ok - rnd()*0.2;
  if (g === 'Late') return K.ready + K.ok + rnd()*(K.late - K.ok);
  return K.ready + (rnd() < 0.5 ? -1 : 1)*(K.perfect + rnd()*(K.ok - K.perfect));
}
function circleSteps(T, dt, hold) {                       // the steps a flight (or a hold) of T seconds takes, counted as circleBall counts them
  let t = 0, n = 0;
  do { t += dt; n++; } while (hold ? !(t >= T) : Math.min(1, t/T) < 1);
  return n;
}
function circlePlan(C) {                                   // the round's five CPU passes, a grade and a hold each, as it starts: the ball's lap is the one the one fixed hold made, step for step
  const K = DRILL_CIRCLE, n = K.n, k = C.round - 1, dt = STEP*drillRate(), men = C.men;
  const fly = (i, g) => { const a = men[i], b = circleSpot((i + 1) % n, C.R); return circleSteps(Math.max(0.12, hyp(b.x - a.x, b.y - a.y)/(g ? circleSpeed(g) : K.cpuPass)), dt); };
  const first = fly(0, 'Good');                            // your own pass to the first man (circleGo)
  let goal = first;                                        // the lap before the grades: cpuPass's flights and C.cpuHold at every man
  for (let i = 1; i < n; i++) goal += fly(i, null) + circleSteps(C.cpuHold, dt, true) - 1;   // a hold's first step is its catch's last
  C.lapT = goal*dt;
  for (let tries = 0; ; tries++) {                         // a draw with too many fumbles for the round's time is drawn again; after eight, all Good
    const plan = [null];
    for (let i = 1; i < n; i++) { const grade = tries < 8 ? circleCpuGrade(k) : 'Good'; plan.push({ grade, base:circleCpuBase(grade), fum:i > 1 && plan[i - 1].grade === 'Early' ? K.fumble : 0 }); }
    let left = goal - first + (n - 1), base = 0, fum = 0;  // the hold steps the lap leaves, each passer's gather of a fumble included (not the pass home: home ends it)
    for (let i = 1; i < n; i++) { left -= fly(i, plan[i].grade); base += plan[i].base; fum += plan[i].fum; }
    const s = ((left - (n - 1)/2)*dt - fum)/base;          // the holds' scale; a hold of k steps is set half a step short of k*dt, so it takes exactly k
    if (s < K.cpuMin && tries < 8) continue;
    const least = plan.slice(1).map(q => Math.ceil(q.fum/dt) + 1), want = plan.slice(1).map((q, i) => Math.max(least[i], (q.base*s + q.fum)/dt + 0.5)), steps = want.map(Math.floor);
    let spare = left - steps.reduce((a, b) => a + b, 0);    // whole steps, the largest remainders rounded up, so they add up to exactly what the lap leaves
    const order = want.map((w, i) => [w - steps[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    for (let j = 0; spare > 0; j = (j + 1) % order.length, spare--) steps[order[j][1]]++;
    for (let j = order.length - 1; spare < 0 && j >= 0; j--) if (steps[order[j][1]] > least[order[j][1]]) { steps[order[j][1]]--; spare++; }
    for (let i = 1; i < n; i++) plan[i].hold = (steps[i - 1] - 0.5)*dt - plan[i].fum;
    return plan;
  }
}
function circleSetRound(C) {                               // this round's race: the ring's size, the CPU's pace, and everyone on his spot
  const K = DRILL_CIRCLE, k = C.round - 1;
  C.R = circleRadius(C.role, C.round); C.L = circleLap(C.R);
  const chord = circleChord(C.R), n = K.n;
  C.plan = null; C.lapT = 0;
  if (C.role === 'runner') {                               // the ball's lap against a runner at top speed with no Sprint: a slower lap early, a quicker one later
    const v = maxSpeed(C.men[0]), ref = C.L/v + v/(2*K.acc), T = ref*K.runF[k];
    C.cpuHold = Math.max(0.12, (T - n*chord/K.cpuPass)/(n - 1));   // the one hold every passer had before the grades: the lap it made is still the lap. The passes are drawn as the round starts (circleGo): picking Passer draws none
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
function circleGo(C) {                                     // the runner passes, then sets off: already moving off a pass to the chest
  const K = DRILL_CIRCLE, chest = Math.abs(circleStartE(C)) <= K.ok;
  if (C.role === 'runner') C.plan = circlePlan(C);           // the round's CPU passes, graded and timed now
  if (chest) { C.chest++; st('circleChest'); drillTag('Chest', C.men[0].x, C.men[0].y); }
  circlePass(C, 0, chest && C.role === 'passer' ? K.fast : K.good, false);
  C.stage = 'race'; C.t = 0; C.s = 0; C.v = chest && C.role === 'runner' ? maxSpeed(C.men[0])*K.rolling : 0;
  st('circleRounds');
}
function circleWay(C) {                                    // the way the lap goes from here: on the ground, the direction the stick has to follow
  const a = circleRunAt(C.R, C.s), b = circleRunAt(C.R, C.s + 0.25), m = hyp(b.x - a.x, b.y - a.y) || 1;
  return { x:(b.x - a.x)/m, y:(b.y - a.y)/m };
}
function circleRunner(C, dt) {
  const K = DRILL_CIRCLE, p = C.men[0];
  let vt;
  if (C.role === 'runner') {
    const j = inputOf(0).world(), run = j.mag > 0.25, way = circleWay(C), onLine = (j.x*way.x + j.y*way.y)/(j.mag || 1) >= K.follow;
    drillSprint(p, dt, run && onLine);
    vt = !run ? 0 : onLine ? maxSpeed(p) : maxSpeed(p)*K.offLine;   // the thumb goes round with the man: a stick pushed some other way only shuffles
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
  if (C.role === 'runner') {                               // the CPU's pass, graded at the round's start: the Passer's words and flights
    const q = C.plan[H.i];
    if (H.t >= q.hold + H.fumble) { drillTag(K.words[q.grade], p.x, p.y); circlePass(C, H.i, circleSpeed(q.grade), q.grade === 'Early'); }
    return;
  }
  if (tap && H.t >= H.fumble) {                            // your timed tap (not while he is still gathering a fumble): on the gold is Perfect and quickest; early is fumbled at the next man
    const e = H.t - H.tc, a = Math.abs(e);
    const grade = a <= K.perfect ? 'Perfect' : a <= K.ok ? 'Good' : e < 0 ? 'Early' : 'Late';
    st('circle' + grade); if (grade === 'Perfect') C.chest++;
    drillTag(K.words[grade], p.x, p.y);
    circlePass(C, H.i, circleSpeed(grade), grade === 'Early');
    if (grade === 'Perfect') buzz(15, 0);
  } else if (H.t >= H.tc + K.late) { st('circleLate'); drillTag(K.words.Late, p.x, p.y); circlePass(C, H.i, K.good, false); }
}
function circleSettle(C) {                                 // whoever is home first takes the round
  if (!C.home && !C.ballHome) return;
  const runnerFirst = C.home && !C.ballHome;
  const won = C.role === 'runner' ? runnerFirst : !runnerFirst;
  if (C.home) { C.fly = null; drillHold(C.men[0]); }
  else { const b = M.ball, s = circleSpot(0, C.R); b.state = 'loose'; b.x = s.x; b.y = s.y; b.z = 0.2; }
  if (won) {
    C.survived = C.round; st('circleWon');
    say(C.role === 'runner' ? 'Home First' : 'Beat the Runner', 'small', 0); sfx('cheer');
    if (C.round >= DRILL_CIRCLE.rounds) { C.stage = 'end'; C.t = 0; return; }
    C.stage = 'grow'; C.t = 0; C.from = C.men.map(p => ({ x:p.x, y:p.y }));
    C.round++;
  } else {
    say(C.role === 'runner' ? 'The Ball Won' : 'The Runner Won', 'small', 1); sfx('groan');
    C.stage = 'end'; C.t = 0;
  }
}
function circleEnd(C) {
  const n = C.survived || 0, stars = drillStarsOf(n, DRILL_CIRCLE.stars);
  practiceFinish(stars > 0, n === DRILL_CIRCLE.rounds ? 'All ' + n + ' Rounds' : n + (n === 1 ? ' Round' : ' Rounds'), stars);
}
const CIRCLE_CHEST = [0.62, 0.82];                         // the gold band on the catcher in the corner picture, as shares of their height
function circleChestBox(W, H) { const h = Math.max(92, H*0.3); return { x:Math.max(10, W*0.015), y:Math.max(52, H*0.15), w:h*0.8, h }; }   // above the touch stick's resting place, clear of it at 844x390 and 667x375
const drillCircle = {
  setup(own) {
    M.players = own.slice(0, DRILL_CIRCLE.n);
    drillSpace(DRILL_CIRCLE.at[0], DRILL_CIRCLE.at[1], DRILL_CIRCLE.zoom);
    const C = practice.circle = { role:practice.role || 'runner', round:1, survived:0, chest:0, men:M.players, stage:'start', t:0 };
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
    } else if (C.stage === 'grow') {                       // the ring steps out a metre for a Runner, in a metre for a Passer
      const u = Math.min(1, C.t/K.growT), R = circleRadius(C.role, C.round);
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
  drawScreen() {                                           // the catcher, side on: the ball comes down past the head and the chest; tap as it meets the gold
    const C = practice.circle, K = DRILL_CIRCLE; if (!C || (C.role !== 'passer' && C.stage !== 'start') || (C.stage !== 'start' && !(C.hold && C.stage === 'race'))) return;
    const e = C.stage === 'start' ? circleStartE(C) : C.hold.t - C.hold.tc, B = circleChestBox(V.W, V.H), Hp = B.h*0.8, y0 = B.y + B.h - 4, x = B.x + B.w*0.46, k = Hp/1.8;
    ctx.save();
    ctx.fillStyle = 'rgba(8,14,10,.72)'; rrect(B.x, B.y, B.w, B.h, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,207,61,.55)'; ctx.fillRect(B.x + 4, y0 - Hp*(CIRCLE_CHEST[1]), B.w - 8, Hp*(CIRCLE_CHEST[1] - CIRCLE_CHEST[0]));
    if (!dvManAt(x, y0, k, C.men[C.stage === 'start' ? 1 : C.hold.i] || C.men[1], 'catch', 0, 2)) tackleBody(x, y0, k, M.kit[0], { dir:1 });
    const u = clamp((CIRCLE_CHEST[0] + CIRCLE_CHEST[1])/2 - e*0.75, 0.05, 1.12), by = y0 - Hp*u;
    ctx.fillStyle = '#f6f3ea'; ctx.strokeStyle = '#3b2f22'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x + B.w*0.3, by, 8, 5, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.restore();
  },
  howTo() { return 'Runner: pass, then run round the outside and beat the ball home. Passer: tap ' + drillName('Pass', 'a') + ' as the white ring meets the gold.'; },
  tip() { const C = practice.circle; return C.chest ? 'Passes to the chest are the easiest to catch.' : 'Time your pass to reach the chest.'; },
  cue() {
    const C = practice.circle;
    if (C.stage !== 'start' || C.round > 1) return null;
    return C.role === 'runner' ? ['Runner', 'Tap ' + drillName('Pass', 'a') + ', then ' + (drillIsKeys() ? 'press the way you run. ' : 'push the stick the way you run. ') + drillName('Sprint', 'c') + ' goes faster.'] : ['Passer', 'Tap ' + drillName('Pass', 'a') + ' as the white ring meets the gold.'];
  },
  result() { const role = practice.role === 'passer' ? 'passer' : 'runner'; return { role, skill:role === 'runner' ? 'stamina' : 'handling' }; },
};

/* ---------- Cones: an obstacle course against the clock ----------
   Out through a zig-zag of gates, round the flag, and a sprint back through a straight line of gates to the finish. A missed
   gate adds two seconds and a clipped cone one. The Sprint meter lasts three seconds: spend it on the straights, because a
   sprinter has less grip to turn on (slide) and goes wide. A clean line through the middle of a gate is the short way round.
   Stars by time.
   The course stays left of the Sprint button, and the finish (line) right of the touch stick's resting place at 667x375 too. */
const DRILL_CONES = { start:[24, 30], gates:[[32, 29], [38.5, 33], [45, 29], [51.5, 33], [58, 29], [58, 46], [49, 46], [40, 46]], out:5, turn:[66, 37], half:1.7, clip:0.5,
  hit:1, miss:2, startLine:26, line:35, box:[20, 22, 72, 52], cam:[50, 37], times:[11.5, 16], slide:6.5, clean:1.0 };
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
    practice.cones = { me, pass:K.gates.map(() => 0), hit:new Set(), pen:0, turned:false, px:me.x, py:me.y, cones:conesCones(), done:false, clean:0 };
  },
  tick(dt) {
    const Q = practice.cones, K = DRILL_CONES, me = Q.me;
    drillTap();
    Q.px = me.x; Q.py = me.y;
    drillRun(me, dt, K.box, true, K.slide);
    K.gates.forEach(([gx, gy], i) => {                     // through a gate: crossing the line between its cones
      if (Q.pass[i]) return;
      if ((Q.px - gx)*(me.x - gx) <= 0 && Q.px !== me.x) {
        const y = Q.py + (me.y - Q.py)*(gx - Q.px)/(me.x - Q.px);
        if (Math.abs(y - gy) <= K.half) { Q.pass[i] = 1; st('conesGate'); sfx('tick'); if (Math.abs(y - gy) <= K.clean) { Q.clean++; drillTag('Clean', gx, gy); } return; }
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
  howTo() { return 'Run through every gate, round the flag and back. Missed gates and cones add time.'; },
  tip() { const Q = practice.cones; return Q.pen === 0 && Q.clean >= 5 ? 'Clean lines through the gates beat running wide.' : 'A clean line through each gate. Sprint on the straights.'; },
  result() { return { skill:'pace' }; },
};

/* ---------- Tackling: position, height, timing, power, squeeze ----------
   One runner a rep. On the pitch, get into his path on short steps, feet balanced (Set). Then a front-on look: he is stepping to one side,
   and your head goes behind him, away from where he is going (Head, the second safety point). Then a side-on close-up, so
   height reads: aim at his thighs with the stick (too high is always a fail, the safety point, and its verdict says why; too
   low and he steps out), hold Tackle to load power and let go as he steps on the gold (Timing, Power), then Squeeze with taps
   or a hold to bring him down. Each rep names how every element went. Stars by good reps. The aim moves at half a height a second (aim): a child seeing the
   bracket 0.4 s late with the stick pushed all the way still stops it inside the green, which is a quarter of his height. */
const DRILL_TACKLE = { reps:5, jog:4.2, from:20, lane:[2.5, 5.5], at:[52, 35], setAt:6.5, inLine:1.0, still:4.5, side:6, run:3.2, zone:[1.0, 2.6], late:0.55, fill:0.55, power:0.6,
  aim:0.5, aim0:0.7, height:[0.28, 0.52], lunge:0.22, squeeze:1.3, tap:0.25, holdRate:1.4, show:2.0, box:[40, 23, 70, 47], cam:[60, 35], zoom:1.25, stars:[1, 2, 4], headT:1.5, headGap:0.3, headStick:0.5 };
const TACKLE_PARTS = [['pos', 'Position'], ['head', 'Head'], ['height', 'Height'], ['time', 'Timing'], ['power', 'Power'], ['squeeze', 'Squeeze']];
const TACKLE_WHY = {                                        // what the verdict says under the word: the reason, in a few words
  'Off Line':'Get in Their Path First', 'Not Set':'Short Steps, Feet Balanced',
  'Wrong Side':'Put Your Head Behind Them', 'No Side':'Put Your Head Behind Them',
  'Too High':'That Can Hurt. Aim for the Legs.', 'Too Low':'They Stepped Out. Aim at the Thighs.',
  Early:'Let Go on the Gold', Late:'Let Go on the Gold', Weak:'Hold Longer for More Drive', Loose:'Wrap and Squeeze With Your Arms',
};
function tackleVerdict(T) {                                // the rep in a word and a reason: a high tackle is always named first
  const marks = TACKLE_PARTS.map(([k]) => T.marks[k]).filter(m => m && m.ok === false);
  const bad = marks.find(m => m.word === 'Too High') || marks[0];
  return T.good ? { word:'Great Tackle', why:'' } : bad ? { word:bad.word, why:TACKLE_WHY[bad.word] || '' } : { word:'Try Again', why:'' };
}
function tackleRep(K) {                                    // the next runner, jogging down a lane a few metres off yours
  const T = practice.tackle, side = rnd() < 0.5 ? -1 : 1, lane = K.at[1] + side*(K.lane[0] + rnd()*(K.lane[1] - K.lane[0]));
  T.rep++; T.lane = lane; T.stage = 'approach'; T.t = 0; T.marks = {}; T.fail = null; T.d = K.side; T.h = K.aim0; T.charge = 0; T.wasDown = false; T.sq = 0; T.down = 0; T.lungeT = 0; T.drift = rnd() < 0.5 ? -1 : 1; T.safe = -T.drift; T.pick = null;
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
  const head = T.marks.head && T.marks.head.ok === false;   // the head on the wrong side fails the rep too, whatever the rest did
  T.fail = h === 'high' ? 'high' : head ? 'head' : h === 'low' ? 'low' : tm !== 'ok' ? tm : T.charge < K.power ? 'weak' : null;
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
    if (T.stage === 'approach') {                          // on the pitch: into his path, slowing to short steps by the time he is close
      drillTap();
      const sp = drillRun(me, dt, K.box, false);
      ru.x -= K.jog*dt; ru.vx = -K.jog; ru.fx = -1; ru.fy = 0; drillHold(ru);
      if (ru.x - me.x <= K.setAt) {
        const inLine = Math.abs(me.y - T.lane) <= K.inLine, set = sp <= K.still;
        tackleMark(T, 'pos', inLine && set, !inLine ? 'Off Line' : !set ? 'Not Set' : 'Position');
        if (inLine && set) { T.stage = 'head'; T.t = 0; T.d = K.side; T.armed = inp.world().mag < K.headStick; me.vx = me.vy = 0; drillFace(me, ru.x, ru.y); inp.aPressed = false; }
        else { T.stage = 'past'; T.t = 0; st('tackleOffLine'); }
      }
    } else if (T.stage === 'head') {                       // front on: they step to one side and your head goes behind them, away from where they are going
      drillTap();
      const j = inp.world();
      T.armed = T.armed || Math.abs(j.x) < K.headStick;     // a thumb still pushing from getting in their path is not a choice
      if (T.armed && T.pick == null && Math.abs(j.x) >= K.headStick) {
        T.pick = Math.sign(j.x); T.t = Math.max(T.t, K.headT - K.headGap);
        tackleMark(T, 'head', T.pick === T.safe, T.pick === T.safe ? 'Head' : 'Wrong Side');
        if (T.pick === T.safe) sfx('tick'); else st('tackleWrongSide');
      }
      if (T.t >= K.headT) {
        if (T.pick == null) { tackleMark(T, 'head', false, 'No Side'); st('tackleWrongSide'); }
        T.stage = 'side'; T.t = 0; inp.aPressed = false; T.wasDown = inp.aDown;
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
    return s === 'approach' ? ['Set', 'Get in their path on short steps.'] : s === 'head' ? ['Head Side', 'Put your head behind them: the tick.'] : s === 'side' ? ['Aim and Tackle', 'Aim at their thighs. Hold ' + drillName('Tackle', 'a') + ', let go on the gold.']
      : s === 'squeeze' ? ['Squeeze', 'Tap or hold ' + drillName('Squeeze', 'a') + '.'] : null;
  },
  drawScreen() { tackleDraw(practice.tackle); },
  howTo() { return 'Get in their path on short steps. Head behind them, aim at their thighs, hold ' + drillName('Tackle', 'a') + ' and let go on the gold, then ' + drillName('Squeeze', 'a') + '.'; },
  tip() { const T = practice.tackle; return T.made ? 'Head behind them, low and strong, arms round. That is a good tackle.' : 'Set your feet, head behind them, then aim low.'; },
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
function drillMark(x, y, r, good) {                         // a tick for the right choice, a cross for the wrong one: the same on every screen
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [w, col] of [[Math.max(5, r*0.5), 'rgba(8,14,10,.9)'], [Math.max(2.5, r*0.26), '#ffffff']]) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
    if (good) { ctx.moveTo(x - r*0.8, y + r*0.05); ctx.lineTo(x - r*0.2, y + r*0.65); ctx.lineTo(x + r*0.85, y - r*0.6); }
    else { ctx.moveTo(x - r*0.65, y - r*0.65); ctx.lineTo(x + r*0.65, y + r*0.65); ctx.moveTo(x + r*0.65, y - r*0.65); ctx.lineTo(x - r*0.65, y + r*0.65); }
    ctx.stroke();
  }
  ctx.restore();
}
function tackleHeadDraw(T) {                               // the front-on look: the runner stepping to one side, and the two places for your head, the green one behind them
  const W = V.W, H = V.H, y0 = H*0.8, Hp = H*0.42, cx = W/2 + T.drift*clamp(T.t/DRILL_TACKLE.headT, 0, 1)*H*0.16, kit = M.kit[1];
  ctx.save();
  dvStage(y0);
  ctx.lineCap = 'round';
  if (dvManAt(cx, y0, Hp/1.8, T.ru, 'carry', Math.floor(M.rt*10) & 7, 4, false, T.drift*0.12)) dvHeld(cx, y0, Hp/1.8, T.ru);
  else {
    const lean = T.drift*Hp*0.08, hipY = y0 - Hp*0.48, shY = y0 - Hp*0.82;
    ctx.strokeStyle = '#1d2a21'; ctx.lineWidth = Hp*0.1;    // legs, then a body tipped the way they are going
    ctx.beginPath(); ctx.moveTo(cx - Hp*0.07, hipY); ctx.lineTo(cx - Hp*0.1 + Math.sin(M.rt*11)*Hp*0.03, y0); ctx.moveTo(cx + Hp*0.07, hipY); ctx.lineTo(cx + Hp*0.1 - Math.sin(M.rt*11)*Hp*0.03, y0); ctx.stroke();
    ctx.fillStyle = kit.fill; ctx.strokeStyle = C.outline; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - Hp*0.12, hipY); ctx.lineTo(cx - Hp*0.17 + lean, shY); ctx.lineTo(cx + Hp*0.17 + lean, shY); ctx.lineTo(cx + Hp*0.12, hipY); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.head; ctx.beginPath(); ctx.arc(cx + lean*1.3, shY - Hp*0.1, Hp*0.085, 0, 7); ctx.fill();
    ctx.fillStyle = '#f6f3ea'; ctx.strokeStyle = '#3b2f22'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(cx - T.drift*Hp*0.16, hipY - Hp*0.14, Hp*0.05, Hp*0.08, 0, 0, 7); ctx.fill(); ctx.stroke();
  }
  const ax = cx + T.drift*Hp*0.34, ay = y0 - Hp*0.1;       // the way they are going
  ctx.strokeStyle = '#ffcf3d'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + T.drift*Hp*0.3, ay); ctx.moveTo(ax + T.drift*Hp*0.2, ay - Hp*0.08); ctx.lineTo(ax + T.drift*Hp*0.3, ay); ctx.lineTo(ax + T.drift*Hp*0.2, ay + Hp*0.08); ctx.stroke();
  const spot = side => W/2 + side*Hp*0.72, sy = y0 - Hp*0.58, r = Hp*0.13;
  for (const side of [-1, 1]) {                            // the green place behind them, the red one in their way
    const safe = side === T.safe, sel = T.pick === side;
    ctx.fillStyle = safe ? (sel ? 'rgba(98,214,128,.95)' : 'rgba(98,214,128,.4)') : (sel ? 'rgba(255,132,102,.95)' : 'rgba(255,132,102,.28)');
    ctx.strokeStyle = safe ? '#62d680' : '#ff8466'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(spot(side), sy, r, 0, 7); ctx.fill(); ctx.stroke();
    if (sel) { ctx.fillStyle = C.head; ctx.beginPath(); ctx.arc(spot(side), sy, r*0.55, 0, 7); ctx.fill(); }
    drillMark(spot(side), sy, r*0.62, safe);               // a shape as well as a colour, so the safe side reads for a colour-blind child
  }
  ctx.restore();
  tackleChips(T);
}
function tackleDraw(T) {                                   // the side-on close-up: height on the runner reads as red, green and amber bands
  if (T && T.stage === 'head') { tackleHeadDraw(T); return; }
  if (!T || !['side', 'lunge', 'squeeze', 'missed', 'down', 'show'].includes(T.stage) || (T.stage === 'show' && !T.marks.height)) {
    if (T && T.stage === 'show') tackleChips(T);
    return;
  }
  const K = DRILL_TACKLE, W = V.W, H = V.H, y0 = H*0.8, k = H*0.40/1.8, Hp = 1.8*k, tx = W*0.32, kd = tackleRunScale(W, H);   // k sizes the men, kd his distance along the ground
  ctx.save();
  dvStage(y0);                                              // a still, side-on view: the field behind, so only the two read
  ctx.fillStyle = 'rgba(255,207,61,.55)'; ctx.fillRect(tx + K.zone[0]*kd, y0, (K.zone[1] - K.zone[0])*kd, 10);   // the gold: let go as his front foot lands here
  const rx = tx + Math.max(0.35*k, T.d*kd) + H*0.04, run = T.stage === 'side' || T.stage === 'lunge' || T.stage === 'missed';
  const fall = T.stage === 'down' || (T.stage === 'show' && T.good) ? clamp(T.stage === 'down' ? T.t/0.45 : 1, 0, 1) : 0;
  if (T.stage === 'side' || T.stage === 'lunge') {         // the bands on him: too high, right, too low
    const bx = rx - H*0.12, bw = H*0.26;
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#ff8466'; ctx.fillRect(bx, y0 - Hp, bw, Hp*(1 - K.height[1]));
    ctx.fillStyle = '#62d680'; ctx.fillRect(bx, y0 - Hp*K.height[1], bw, Hp*(K.height[1] - K.height[0]));
    ctx.fillStyle = '#ffcf3d'; ctx.fillRect(bx, y0 - Hp*K.height[0], bw, Hp*K.height[0]);
    ctx.globalAlpha = 1;
  }
  const drawRunner = () => {
    if (fall ? dvManAt(rx, y0, k, T.ru, 'land', fall < 0.35 ? 0 : fall < 0.8 ? 1 : 2, 6) : dvManAt(rx, y0, k, T.ru, 'carry', run ? Math.floor(M.rt*10) & 7 : 0, 6)) { if (!fall) dvHeld(rx, y0, k, T.ru); else cutBall(rx + (fall < 0.35 ? -0.1 : fall < 0.8 ? 0.15 : 0.5)*k, y0 - (fall < 0.35 ? 1.0 : fall < 0.8 ? 0.62 : 0.28)*k, k*DV_BALL, 0.6); }
    else tackleBody(rx, y0, k, M.kit[1], { dir:-1, phase:run ? M.rt*11*kd/k : 0, lean:run ? 0.15 : 0, ball:true, down:fall });
  };
  const zone = T.h > K.height[1] ? '#ff8466' : T.h < K.height[0] ? '#ffcf3d' : '#62d680';
  const contact = T.stage === 'squeeze' || T.stage === 'down' || (T.stage === 'show' && T.good);
  if (!contact) drawRunner();                              // in the tackle the runner is drawn last: your head goes behind them, in the picture too, and never on the ball
  const lungeU = T.stage === 'lunge' ? clamp(T.t/K.lunge, 0, 1) : contact ? 1 : T.stage === 'missed' && T.fail !== 'late' ? 1 : 0;
  const reach = T.fail === 'early' ? (T.dc - K.zone[1] + 0.6)*kd : 0;
  const mx = drillLerp(tx, rx - H*0.12, lungeU) - (T.fail === 'early' ? reach*lungeU : 0);
  const crouch = clamp((0.62 - T.h)/0.5, 0, 1);
  { const miss = T.stage === 'missed' && T.fail !== 'high', clip = miss ? 'fall' : contact ? (T.stage === 'squeeze' ? 'tackle' : 'lying') : lungeU > 0 && T.fail !== 'high' ? 'tackle' : 'crouch';   // set, low and looking at them; then the lunge and the wrap; a miss goes to ground
    const frame = miss ? Math.min(2, Math.floor(T.t/0.14)) : contact ? (T.stage === 'squeeze' ? 1 : 0) : clip === 'tackle' ? 0 : T.h > 0.62 ? 0 : T.h > 0.42 ? 1 : 2;
    if (!dvManAt(mx, y0, k, T.me, clip, frame, 2)) tackleBody(mx, y0, k, M.kit[0], { dir:1, fwd:true, crouch, lean:0.35 + 0.9*lungeU, phase:0, down:T.stage === 'missed' && T.fail !== 'high' ? clamp(T.t/0.3, 0, 1)*0.9 : contact ? 0.55 : 0 }); }
  if (contact) drawRunner();
  if (T.stage === 'side') {                                // the aim: a bracket across him at the height you have chosen, coloured by the band
    const ay = y0 - T.h*Hp;
    ctx.strokeStyle = zone; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(rx - H*0.16, ay - 8); ctx.lineTo(rx - H*0.16, ay); ctx.lineTo(rx + H*0.14, ay); ctx.lineTo(rx + H*0.14, ay - 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx + H*0.1, ay); ctx.lineTo(rx - H*0.2, ay); ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    const pm = tackleMeterBox(W, H);                       // the power meter: fills while Tackle is held; the notch is enough
    ctx.fillStyle = 'rgba(8,14,10,.8)'; ctx.fillRect(pm.x - 2, pm.y - 2, pm.w + 4, pm.h + 4);
    ctx.fillStyle = T.charge >= K.power ? '#62d680' : '#ffcf3d'; ctx.fillRect(pm.x, pm.y, pm.w*T.charge, pm.h);
    ctx.fillStyle = '#f1eee4'; ctx.fillRect(pm.x + pm.w*K.power - 1, pm.y - 4, 3, pm.h + 8);
  }
  if (T.stage === 'squeeze') {                             // the squeeze: a ring that fills
    const cx = rx - H*0.06, cy = y0 - Hp*0.4, r = H*0.11;
    ctx.strokeStyle = 'rgba(241,238,228,.35)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#ffcf3d'; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + 2*Math.PI*clamp(T.sq, 0, 1)); ctx.stroke();
  }
  ctx.restore();
  tackleChips(T);
}
/* Metres to pixels along the ground. The men's own scale, unless that would start the runner under the Tackle button (88px,
   20px in from the right edge): then his run closes up so the right edge of his three bands (0.18 of the height past his
   distance) starts 20px clear of the button, and the low band and his feet are never under a thumb. 667x375 closes it to about half.
   The nearest he comes (0.35m) stays at the men's scale, so the contact poses read as they did. */
function tackleRunScale(W, H) {
  const k = H*0.40/1.8, room = W - 128 - W*0.32 - H*0.18;
  return Math.max(k*0.4, Math.min(k, room/DRILL_TACKLE.side));
}
const tackleChipTop = H => Math.max(96, H*0.27);          // the top of the five chips (28px tall)
function tackleMeterBox(W, H) {                            // the power meter: a bar over the tackler's head, between it and the chips, so the thumb on the touch stick never covers it
  const y0 = H*0.8, Hp = 0.4*H, w = H*0.24, h = 8;          // the close-up's ground line and a man's height, as tackleDraw has them; his head's top is 0.96 of that, standing
  return { x:W*0.32 - w/2, y:(tackleChipTop(H) + 28 + y0 - Hp*0.96)/2 - h/2, w, h };
}
function tackleChips(T) {                                  // the five elements, a word each: green right, red wrong, grey not reached yet
  const W = V.W, top = tackleChipTop(V.H), gap = 6, n = TACKLE_PARTS.length, w = Math.min(112, (W - 120 - gap*(n - 1))/n), x0 = W/2 - (w*n + gap*(n - 1))/2;
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
    const v = tackleVerdict(T);
    ctx.font = `900 34px 'Big Shoulders Display', Impact, sans-serif`; ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(8,14,10,.9)';
    ctx.fillStyle = T.good ? '#62d680' : '#ff8466';
    const word = v.word.toUpperCase();
    ctx.strokeText(word, W/2, top + 62); ctx.fillText(word, W/2, top + 62);
    if (v.why) { ctx.font = `800 19px 'Big Shoulders Display', Impact, sans-serif`; ctx.lineWidth = 4; ctx.fillStyle = '#f1eee4'; ctx.strokeText(v.why.toUpperCase(), W/2, top + 90); ctx.fillText(v.why.toUpperCase(), W/2, top + 90); }
  }
  ctx.restore();
}

/* ---------- Kicking: a run of five goal kicks ----------
   The first is close and in front with no wind; each one after is further out and wider, with a strong wind across it, so the
   arrow has to allow for it: an unaimed run loses about a star. Stars by kicks made. */
const DRILL_KICKS = { spots:[[100, 35, 0], [95, 27, 16], [92, 44, 19], [88, 24, 21], [85, 48, 22]], stars:[2, 3, 5] };
function kickNext(K) {
  const [x, y, mph] = DRILL_KICKS.spots[K.i];
  M.wind = { ...M.wind, mph, a:(rnd() < 0.5 ? 1 : -1)*Math.PI/2 };   // always across the kick, so the arrow has to allow for it: a wind along the line would leave a kick needing no aim
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
  howTo() { return 'Five kicks, each further out and windier. ' + (M && M.kids ? 'Hold ' : 'Aim the arrow with your run controls, hold ') + drillName('Kick', 'a') + ' and let go in the gold.'; },   // Kids sets the aim
  tip() { return practice.kick.made >= 3 ? 'Aiming first and letting go in the gold did it.' : 'Aim first, then let go in the gold. No rush.'; },
  result() { return { skill:'kicking' }; },
};

/* ---------- Driving: three scrums, each pack a little stronger ----------
   The match's own scrum, as it is: Crouch, Bind, Set, a Good Hit on Set, then tap Push to drive; only here, your body shape counts
   too. The stick holds you low and strong in the green (hips lower than your shoulders), and you rise out of it as you
   push. Out of the green, standing up or going too low, your pack shoves far less, however fast you tap: shape and timing beat
   tapping alone. A drive is won when your pack gains half a metre or more. Stars by drives won. */
const DRILL_DRIVE = { scrums:3, cpu:[0.35, 0.8, 1.0], gain:0.5, at:[60, 35], stars:[1, 2, 3], shape:{ from:0.9, band:[0.38, 0.66], rate:0.6, rise:0.15, wave:0.1, bad:0.22 } };
function driveShape(c, dt, eff) {                          // the Driving drill's one hook in updateScrum: the stick moves your body, and a body out of the green pushes less
  const K = DRILL_DRIVE.shape, j = inputOf(0).world();
  if (c.shape == null) { c.shape = K.from; c.shapeIn = 0; c.shapeAll = 0; }
  c.shape = clamp(c.shape + (K.rise + K.wave*Math.sin(c.t*2.1 + c.wave) - j.y*K.rate)*dt, 0, 1);
  const good = c.shape >= K.band[0] && c.shape <= K.band[1];
  if (c.t < SCRUM_SET) return;
  c.shapeAll += dt; if (good) c.shapeIn += dt; else eff[0] *= K.bad;
  const R = practice.drive; if (R) { R.all += dt; if (good) R.good += dt; }
}
function driveGaugeBox(W, H) { const h = Math.max(100, H*0.34), w = h*0.62; return { x:W - w - 18, y:Math.max(72, H*0.2), w, h }; }   // top right, under Pause and above Push, clear of the packs, the scrum's hint card and the touch stick
function driveNext(D) {
  startScrum({ team:0, x:DRILL_DRIVE.at[0], y:DRILL_DRIVE.at[1] });
  if (M.cut && M.cut.kind === 'scrum') M.cut.base[1] *= DRILL_DRIVE.cpu[D.i];   // the other pack's strength for this scrum
}
const drillDrive = {
  setup() { practice.drive = { i:0, won:0, res:[], all:0, good:0 }; driveNext(practice.drive); },
  onScrum(c) {                                             // a drill's scrum has its line at the mark (startScrum), so half a metre gained is always win0, never a steal
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
  drawScreen() {                                           // your shape, side on, beside a band: the green is low and strong
    const c = M.cut; if (!c || c.kind !== 'scrum' || c.shape == null || c.result) return;
    const K = DRILL_DRIVE.shape, B = driveGaugeBox(V.W, V.H), good = c.shape >= K.band[0] && c.shape <= K.band[1], bar = 10, y1 = B.y + B.h - 6, Hb = B.h - 12, y = u => y1 - Hb*u;
    ctx.save();
    ctx.fillStyle = 'rgba(8,14,10,.72)'; rrect(B.x, B.y, B.w, B.h, 6); ctx.fill();
    ctx.fillStyle = 'rgba(241,238,228,.18)'; ctx.fillRect(B.x + 6, B.y + 6, bar, Hb);
    ctx.fillStyle = '#62d680'; ctx.fillRect(B.x + 6, y(K.band[1]), bar, y(K.band[0]) - y(K.band[1]));
    ctx.fillStyle = '#f1eee4'; ctx.fillRect(B.x + 3, y(c.shape) - 2, bar + 6, 4);
    { const low = c.shape < K.band[0], up = c.shape > K.band[1], kk = (Hb/1.8)*0.8, me = M.players.find(p => p.team === 0);   // high, in the green, too low
      if (!dvManAt(B.x + B.w*(good || low ? 0.4 : 0.56), y1, kk*(good || low ? 0.78 : 1), me, up ? 'crouch' : low ? 'tackle' : 'bind', up ? (c.shape > 0.8 ? 0 : 1) : low ? 2 : 1, 2)) tackleBody(B.x + B.w*0.56, y1, kk, M.kit[0], { dir:1, crouch:clamp(1.25*(1 - c.shape), 0, 1), lean:0.15 + 1.55*(1 - c.shape) }); }
    ctx.font = `800 15px 'Big Shoulders Display', Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = good ? '#62d680' : '#ff8466';
    ctx.fillText((good ? 'Strong' : c.shape > K.band[1] ? 'Get Low' : 'Too Low').toUpperCase(), B.x + B.w/2, B.y - 2);
    ctx.restore();
  },
  cue() { const c = M.cut; return c && c.kind === 'scrum' && !c.result && !c.engaged ? ['Get Low', 'Stay in the green and tap ' + drillName('Push', 'a') + ' on Set.'] : c && c.kind === 'scrum' && !c.result ? ['Drive', 'Stay in the green and keep tapping ' + drillName('Push', 'a') + '.'] : null; },
  howTo() { return 'Stay low in the green with ' + (drillIsKeys() ? 'W and S' : 'the stick') + '. Tap ' + drillName('Push', 'a') + ' on Set, then keep tapping.'; },
  tip() { const R = practice.drive; return R.all && R.good/R.all >= 0.6 ? 'Low and strong: that is what moved them.' : 'Get low and strong, and stay in the green.'; },
  result() { return { skill:'power' }; },
};

/* ---------- Create a Gap and Defend a Breakaway: open play, five rounds each ----------
   Both restage open play: the match's own men, AI, passes and tackles. Five rounds each, harder as they go. A round is won by a
   try after a drawn pass (Create a Gap) or by stopping the carrier (Defend); anything else ends the run, as the Circle's lost
   round does. Between rounds the world holds (practice.space, so update() skips the match flow, as it does for a training
   space): the round's word on the pitch (show), then the next line-up under a Round N card (card), then play. Each round has its
   own clock (practice.limit). Stars by rounds won, as the Circle's: 1, 3 and all 5. Watch How plays round one, which is set up
   exactly as the one-round game it replaced was. */
const DRILL_ROUNDS = { n:5, stars:[1, 3, 5], show:1.1, card:1.0, word:0.3 };   // word: how new a word on the pitch is (seconds) for the round's word to take its place
const roundsLine = n => (n === DRILL_ROUNDS.n ? 'All ' + n + ' Rounds' : n + (n === 1 ? ' Round' : ' Rounds'));   // the result card's line, as the Circle's
const roundsNew = () => ({ round:1, won:0, lost:'', again:false, stage:'play', t:0, at:0 });
function roundsHold(R, stage) { R.stage = stage; R.t = 0; R.at = practice.elapsed; practice.space = true; }
function roundWord(word, p) { M.tags = M.tags.filter(t => t.t > DRILL_ROUNDS.word || dist(t, p) > 3); drillTag(word, p.x, p.y); }   // the round's word takes the place of one just put down where it ends (Got It, Big Hit, the match's Stopped), so there is one word to read, never two printed over each other
function roundWon(R, word, p) { if (R.stage !== 'play') return; R.won++; st('roundsWon'); roundWord(word, p); sfx('cheer'); roundsHold(R, 'show'); }
function roundLost(R, word, p) { if (R.stage !== 'play') return; R.lost = word; roundWord(word, p); sfx('groan'); roundsHold(R, 'show'); }
function roundAgain(R, word, p) { if (R.stage !== 'play') return; R.again = true; roundWord(word, p); roundsHold(R, 'show'); }   // neither side's doing (their dropped pass, say): the same round again
function roundsStage() {                                   // open play from nothing, as a kick-off leaves it: no set piece and no bind, both Sprint meters full, the half's clock at 0 so no round reaches the hooter. Round one finds all of it so already
  M.phase = 'play'; M.set = null; M.cut = null; M.goal = null; M.contact = null; M.surge = null; M.duelPending = null;
  M.clock = 0; M.hooter = false; M.phaseCount = 0; M.dropArmed = [false, false]; M.dropOn = [false, false]; M.tags = []; M.fx = [];
  clearCharge(); for (const s of M.side) s.pass = null;
  for (const S of M.spr) { S.m = 1; S.p = null; S.spent = false; }
  for (const p of M.players) { p.grace = 0; p.bite = 0; p.biteTo = null; p.drop = null; p.quick = false; p.hold = 0; p.side = 0; }
}
function roundsTick(R, dt, restage) {                      // each kit's tick runs this first: true while the world is held between rounds
  if (R.stage === 'play') return false;
  R.t += dt;
  if (R.stage === 'show') {
    practice.elapsed = R.at;                               // the bar stays where the round ended
    if (R.t < DRILL_ROUNDS.show) return true;
    if (R.lost || R.won >= DRILL_ROUNDS.n) { roundsEnd(R); return true; }
    if (!R.again) R.round++;
    R.again = false; R.stage = 'card'; R.t = 0;
    clearBanner(); restage(R.round);
  }
  practice.elapsed = 0;                                    // a full bar under the card: the round's clock starts at the whistle
  if (R.t >= DRILL_ROUNDS.card) {
    R.stage = 'play'; practice.space = false;
    for (const inp of inputs) { inp.aPressed = inp.bPressed = inp.cPressed = false; inp.gest = null; }   // nothing pressed under the card goes off at the whistle
  }
  return true;
}
function roundsEnd(R) { const stars = drillStarsOf(R.won, DRILL_ROUNDS.stars); practiceFinish(stars > 0, roundsLine(R.won), stars); }
function roundsPips(R) { const out = []; for (let i = 1; i <= DRILL_ROUNDS.n; i++) out.push(i <= R.won ? 'got' : i !== R.round ? 'todo' : R.lost ? 'miss' : 'now'); return out; }   // the Circle's pips: one a round
const roundsHud = R => ({ pips:roundsPips(R), bar:1 - practice.elapsed/practice.limit });
function roundsCue(R, label) {                             // the card between rounds, then nothing; round one keeps the game's own line, as before
  if (R.stage === 'card') return ['Round ' + R.round, label];
  if (R.stage === 'play' && R.round === 1) return [(practice.tagOnly && practice.tagObjective) || practice.objective, practiceInstructions(practice.id)];
  return null;
}

const DRILL_WHIFF = { t:0.45, mul:0.55 };                  // a Tackle or Pull Tag pressed with nothing in reach in Defend: a stumble this long, at this share of speed
function drillWhiff(q) { if (!q) return; q.stumble = DRILL_WHIFF.t; q.stumbleMul = DRILL_WHIFF.mul; st('drillWhiff'); drillTag('Too Far', q.x, q.y); sfx('whiff'); }
const drillCanPull = q => { const b = M.ball, c = b.state === 'held' ? b.carrier : null; return !!(q && c && c.team !== q.team && onFeet(q) && dist(q, c) <= DRILL_TAG.pull.reach); };
function drillTagPull(q) {                                 // the Kids level and the Minis: a press pulls the tag, in reach, and nobody goes to ground
  if (!drillCanPull(q)) { drillWhiff(q); return; }
  sfx('tick'); buzz(20, 0); drillTag('Got It', q.x, q.y); st('drillPulled');
  const k = drillKit(); if (k && k.onPull) k.onPull(q);
}
function drillTagCheck(c) {                                // the Kids level and the Minis, in place of the automatic tackle: nobody commits. In Create a Gap a defender still in it reaching the carrier ends the run with a tag
  const G = practice.gap;
  if (practice.id === 'pass' && c.team === 0 && M.players.some(q => q.team === 1 && !G.drawn.has(q) && dist(q, c) < 1.5)) { st('drillTagged'); roundLost(G.R, 'Tagged', c); return true; }
  return false;
}

/* Defend a Breakaway: your first defender is beaten, so Switch into cover, get across and stop the carrier. The rounds: the chase
   as it always was; a longer start for the runner, the cover further across (7 m off the runner's line, not 4); a support runner the carrier
   may pass to (the match's own carrier: under pressure, or held too long); the same with quicker runners; two cover men to Switch
   between, the runners quicker still. Won by stopping whoever carries with the man you switched to
   (Pull Tag for the youngest); a try, the clock or a tackle without the Switch ends the run. Only your ringed man commits here
   (contact.js tackleChecks), so a cover man left standing can neither win it nor lose it. Once you have switched, the ring never goes
   back to the beaten man: not by Sprint (contact.js sprintPick), as before, and not when their pass is caught far from your man or
   with him down (defendRepick). A dropped pass of theirs, or the ball loose, plays the round again. */
const DRILL_DEFEND = { limit:18, rounds:[
  { label:'The Chase', run:[49, 35], beaten:[56, 35], cover:[[36, 39]] },
  { label:'Longer Start', run:[49, 33], beaten:[57, 33], cover:[[36, 40]] },
  { label:'Support Runner', run:[49, 32], support:[53, 36], beaten:[57, 32], cover:[[36, 36]] },
  { label:'Quicker Runner', run:[49, 32], support:[53, 36], beaten:[57, 32], cover:[[36, 36]], pace:2 },
  { label:'Two Cover Defenders', run:[49, 33], support:[52, 40], beaten:[57, 33], cover:[[38, 25], [37, 42]], pace:2 },
] };
function defendRestage(n) {
  const D = practice.defend, r = DRILL_DEFEND.rounds[n - 1], run = D.cpu[0], sup = r.support ? D.cpu[1] : null, beaten = D.own[0], covers = D.own.slice(1, 1 + r.cover.length);
  M.players = [beaten, ...covers, run, ...(sup ? [sup] : [])];
  drillPlace(run, r.run[0], r.run[1]); if (sup) drillPlace(sup, r.support[0], r.support[1]);
  drillPlace(beaten, r.beaten[0], r.beaten[1]); covers.forEach((p, i) => drillPlace(p, r.cover[i][0], r.cover[i][1]));
  roundsStage();
  M.nat[1].pace = D.pace + (r.pace || 0);                  // this match's copy of their side: a quicker runner, and back again
  setCarrier(run); setCtrl(0, beaten); if (n > 1) drillHold(run);   // the ball in his hands under the card; round one's first step puts it there, as it always did
  practice.initialCtrl = beaten; practice.switched = false; practice.limit = DRILL_DEFEND.limit;
}
const DEFEND_VIEW = [{ sy:0.46, lean:0, zoom:0.88 }, { sy:0.56, lean:1, zoom:0.88 }];   // the camera (render-drill.js) with one cover defender and with two: where the field sits up the screen, metres towards the beaten man until the Switch, and a touch out. Measured at 667x375, the tighter size: every man clear of the stick, the buttons and the card, on the card and as play starts, in all five rounds
const defendView = () => DEFEND_VIEW[practice.defend && DRILL_DEFEND.rounds[practice.defend.R.round - 1].cover.length > 1 ? 1 : 0];
function defendRepick(t, c) {                              // setCarrier (match.js) moves the ring when their pass is caught with your man down or far off: to the nearest of yours on his feet, as in a match, but once you have switched never back to the beaten man. With nobody else free the ring stays where it is
  return nearestOf(M.players.filter(q => q.team === t && q.down <= 0 && !q.bind && !(practice.switched && q === practice.initialCtrl)), c.x, c.y);
}
const DEFEND_TIP = { 'Switch First':'Switch to the defender ahead of the ball first.', 'Time Up':'Get across early and close the gap.', Try:'Switch early, then run to where the carrier is going.' };
const drillDefend = {
  setup(own, cpu) {
    practice.defend = { own, cpu, pace:M.nat[1].pace, R:roundsNew() };
    defendRestage(1);
    practice.cam = null; M.cam.x = 44; M.cam.y = 35;
  },
  tick(dt) {
    const R = practice.defend.R;
    if (roundsTick(R, dt, defendRestage)) return;
    if (ctrlOf(0) !== practice.initialCtrl) practice.switched = true;
    const b = M.ball, c = b.state === 'held' ? b.carrier : null;
    if (c && c.team === 0 && practice.switched) { roundWon(R, 'Stopped', c); return; }   // their pass taken, or the ball won back
    if (M.phase !== 'play' || b.state === 'loose' || b.state === 'dead' || (b.state === 'air' && b.f.kind !== 'pass') || (c && c.team === 0)) roundAgain(R, 'Go Again', b);
  },
  stop(q, c) {                                             // a tackle or a pulled tag on whoever carries for them
    const R = practice.defend.R, won = practice.switched && q === ctrlOf(0);
    if (won) roundWon(R, 'Stopped', c); else roundLost(R, 'Switch First', c);
  },
  onPull(q) { this.stop(q, q); },
  onTackle(c, q) {                                         // any made tackle on their carrier, the one that jolts the ball loose included
    if (c.team !== 1) return false;
    this.stop(q, c);
    return true;
  },
  onTry(p) { roundLost(practice.defend.R, 'Try', p); },
  timeUp() { const b = M.ball; roundLost(practice.defend.R, 'Time Up', b); },
  labels() { return { a:practice.tagOnly ? 'Pull Tag' : 'Tackle', aOn:false, b:'Switch', bOn:false, c:true, cOn:false }; },   // only between rounds: every button where it will be, none lit
  hud() { return roundsHud(practice.defend.R); },
  cue() { const R = practice.defend.R; return roundsCue(R, DRILL_DEFEND.rounds[R.round - 1].label); },
  tip() { const R = practice.defend.R; return R.won >= DRILL_ROUNDS.n ? 'Switch early and run to where the carrier is going.' : DEFEND_TIP[R.lost] || DEFEND_TIP.Try; },
  result() { return { skill:'pace' }; },
};

/* Create a Gap: always one over. Your men stand in lanes, each a stride deeper than the man inside, and each defender marks one
   of them, the outside man free. Run at your man and pass once he comes to you, inside DRILL_GAP.draw (the ring turns gold): a
   pass from further out is Too Early and ends the run, since he would only drift on to the next man. A drawn defender stays on
   the man who drew him, out of it. The next one keeps hold metres off his man until that man has the ball, then comes at him,
   so every man has to draw his own. Held, tagged (Kids and Minis), the ball lost or a pass too early ends the run; a try after
   a drawn pass wins the round. A man who has passed trails further back (trail) and is offered no pass again (gapSpent, in
   passing.js), so the next man out is always the pass. Round four's defenders come quicker and wait closer (hold); round five is 5 on 4, a touch quicker than the first three. */
const DRILL_GAP = { draw:6.5, lane:6, depth:2.5, trail:5, ahead:11, x:83, hold:7.5, fixed:0.5, zoom:[1, 1, 0.85, 0.72], cam:3,   // zoom: the camera's, by men a side less one, so the whole line is on the screen. cam: metres nearer than the line's middle it looks, so play sits above the thumbs
  rounds:[{ att:2, rush:0.9, limit:22, label:'2 on 1' }, { att:3, rush:0.9, limit:24, label:'3 on 2' }, { att:4, rush:0.9, limit:26, label:'4 on 3' },
    { att:4, rush:1.15, pace:2, hold:7, limit:26, label:'4 on 3, Quicker' }, { att:5, rush:0.95, limit:30, label:'5 on 4' }] };
function gapRestage(n) {
  const G = practice.gap, K = DRILL_GAP, r = K.rounds[n - 1], y0 = 35 + (r.att - 1)*K.lane/2;   // the carrier nearest the camera, the line out up the screen
  G.lanes = G.own.slice(0, r.att); G.marks = G.cpu.slice(0, r.att - 1); G.y = G.lanes.map((p, k) => y0 - k*K.lane);
  M.players = G.lanes.concat(G.marks);
  G.lanes.forEach((p, k) => drillPlace(p, K.x - K.depth*k, G.y[k]));
  G.marks.forEach((p, k) => drillPlace(p, K.x + K.ahead, G.y[k]));
  roundsStage();
  M.nat[1].pace = G.pace + (r.pace || 0);
  G.rush = r.rush; G.hold = r.hold || K.hold; G.drawn = new Set(); G.passed = new Set(); G.passes = M.stats.passes; G.ko = M.stats.ko_catch || 0; G.last = G.lanes[0];
  practice.completedPass = false; practice.limit = r.limit;
  setCarrier(G.lanes[0]); if (n > 1) drillHold(G.lanes[0]);
}
function gapTargets(T) {                                   // Create a Gap's men (computeTargets, movement.js): yours hold their lanes, and each defender marks one of them
  const G = practice.gap; if (!G || G.R.stage !== 'play') return;
  const K = DRILL_GAP, b = M.ball, f = b.state === 'air' && b.f.kind === 'pass' ? b.f : null, held = b.state === 'held', c = held ? b.carrier : f ? f.target : null;
  const ci = G.lanes.indexOf(c), bx = held ? c.x : b.x;
  G.lanes.forEach((p, k) => {
    if (k === ci || ringed(p) || !onFeet(p)) return;       // the carrier, and the man a pass is for, run their own way
    const back = ci < 0 ? K.depth*k : k > ci ? K.depth*(k - ci) : K.trail + K.depth*(ci - k - 1);
    T.set(p, { x:clamp(bx - back, 1, 119), y:G.y[k], s:maxSpeed(p) });
  });
  G.marks.forEach((d, k) => {
    if (!onFeet(d)) return;
    const a = G.lanes[k];
    if (G.drawn.has(d) || (held && ci > k)) T.set(d, { x:a.x + 1, y:a.y, s:maxSpeed(d)*K.fixed });   // drawn, or the ball is already past him: he stays on his man
    else if (held && a === c) { const lead = clamp(dist(d, a)/9, 0, 0.7); T.set(d, { x:a.x + a.vx*lead, y:a.y + a.vy*lead, s:maxSpeed(d)*G.rush, a:COVER.acc[0], pursue:true }); }   // his man has it: at him
    else T.set(d, { x:Math.max(d.x, a.x + G.hold), y:a.y, s:maxSpeed(d)*G.rush });   // still to come: level with his man and no nearer than hold, until the ball is his
  });
}
const gapZoom = () => (practice.gap ? DRILL_GAP.zoom[practice.gap.lanes.length - 2] || 1 : 1);
const gapAimY = () => 35 + (M.ball.y - 35)*0.5 + DRILL_GAP.cam;   // half way from the line's middle to the ball
const gapSpent = q => !!(practice.gap && practice.gap.passed.has(q));   // passing.js: a man who has passed this round is offered no pass, so the next man out is the pass
const gapMark = c => { const G = practice.gap, d = G && c ? G.marks[G.lanes.indexOf(c)] : null; return d && !G.drawn.has(d) ? d : null; };   // the defender still to draw: the carrier's own man (the ring on the grass)
const GAP_TIP = { 'Too Early':'Run at your defender until the ring turns gold, then pass.', Held:'Pass before they reach you.', Tagged:'Pass before they reach you.', 'Ball Lost':'Run straight and pass to the next runner.', 'Pass First':'Pass to the spare runner before the line.', 'Time Up':'Keep running at your defender.' };
const drillPass = {
  setup(own, cpu) {
    practice.gap = { own, cpu, pace:M.nat[1].pace, R:roundsNew(), lanes:[], marks:[], y:[], drawn:new Set(), passed:new Set(), passes:0, last:null, rush:1 };
    gapRestage(1);
    M.cam.x = 91; M.cam.y = 35;
  },
  tick(dt) {
    const G = practice.gap, R = G.R;
    if (roundsTick(R, dt, gapRestage)) return;
    const b = M.ball, c = b.state === 'held' ? b.carrier : null;
    if (M.stats.passes > G.passes) {                       // a pass has just left your hands: judged on how near the passer's own defender was
      G.passes = M.stats.passes;
      const d = G.marks[G.lanes.indexOf(G.last)];
      G.passed.add(G.last);                                // the passer is out of the line: never the next pass (gapSpent)
      if (d && !G.drawn.has(d) && dist(G.last, d) > DRILL_GAP.draw) { st('gapEarly'); roundLost(R, 'Too Early', G.last); return; }
      if (d && !G.drawn.has(d)) { G.drawn.add(d); d.tcd = 99; st('gapDrawn'); }   // he went for the passer: out of it, and no tackle left in him
    }
    if (c && c.team === 0) { if (c !== G.last) practice.completedPass = true; G.last = c; }
    if ((M.stats.ko_catch || 0) > G.ko) { roundAgain(R, 'Go Again', b); return; }   // a pass dropped by the catcher: the match's own handling roll, which no button changes, so the round again
    if (M.phase !== 'play' || (c && c.team === 1) || b.state === 'loose' || b.state === 'dead' || (b.state === 'air' && b.f.kind !== 'pass')) { st('gapLost'); roundLost(R, 'Ball Lost', b); }
  },
  onTackle(c) {                                            // a made tackle on your carrier: held
    if (c.team !== 0) return false;
    st('gapHeld'); roundLost(practice.gap.R, 'Held', c);
    return true;
  },
  onTry(p) { const R = practice.gap.R; if (p.team === 0 && practice.completedPass) roundWon(R, 'Try', p); else roundLost(R, 'Pass First', p); },
  timeUp() { roundLost(practice.gap.R, 'Time Up', M.ball); },
  labels() { return { a:'Pass', aOn:false, b:kickLabel(0), bOn:false, c:true, cOn:false }; },   // only between rounds: every button where it will be, none lit
  hud() { return roundsHud(practice.gap.R); },
  cue() { const R = practice.gap.R; return roundsCue(R, DRILL_GAP.rounds[R.round - 1].label); },
  tip() { const R = practice.gap.R; return R.won >= DRILL_ROUNDS.n ? 'Draw your defender, then pass. That makes the gap.' : GAP_TIP[R.lost] || GAP_TIP['Too Early']; },
  result() { return { skill:'handling' }; },
};

/* ---------- Tag Chase: pull the tag, keep yours, no contact ----------
   Everyone wears two tags, one on each hip. The reps take turns. Keep: you carry the ball for the line and a
   tagger stays in front of you, wherever you run, until you are close. Then they go for you, in a straight line: change direction
   as they go and they run past. Keep on the line you were on and they have you, wide or straight. Pull: a carrier runs for your line. Get to a hip, and tap
   Pull Tag: from the front you can't reach a hip, and a bump is No Contact and the rep is gone. Stars by reps won. */
const DRILL_TAG = { reps:6, box:[44, 27, 76, 43], cam:[60, 35], zoom:1.3, show:1.1, limit:8, stars:[2, 4, 6],
  keep:{ at:[46, 35], them:[63, 35], line:74, jog:0.25, shadow:0.85, chase:0.6, acc:12, trigger:13, lungeV:0.35, lungeT:1.5, rest:0.5, reach:1.25, grab:0.04, read:0.7, track:2 },
  pull:{ at:[52, 35], them:[74, 35], lane:4, line:46, pace:0.68, acc:9, weave:1.4, reach:1.9, close:0.45, front:0.7, whiff:0.45, dodge:5, step:2.6 } };
const TAG_WHY = { Pulled:'Change Direction as They Go', Bumped:'Tag Has No Contact. No Bumps.', Past:'Reach a Hip, Then Pull' };
const tagMode = T => (T.rep % 2 ? 'keep' : 'pull');        // rep 1 keeps, rep 2 pulls, and so on
function tagRep(K) {
  const T = practice.tag, me = T.me, them = T.them;
  T.rep++; T.stage = 'play'; T.t = 0; T.grab = 0; T.whiff = 0; T.lunge = null; T.rest = 0; T.dodged = false; T.stepT = 0; T.lost = null; T.lat = 0;
  if (tagMode(T) === 'keep') {
    const Q = K.keep;
    drillPlace(me, Q.at[0], Q.at[1], 1, 0); drillPlace(them, Q.them[0], Q.them[1] + (rnd() - 0.5)*2, -1, 0);
    drillHold(me);
  } else {
    const Q = K.pull;
    drillPlace(me, Q.at[0], Q.at[1], 1, 0); drillPlace(them, Q.them[0], Q.them[1] + (rnd() - 0.5)*2*Q.lane, -1, 0);
    drillHold(them);
  }
  inputOf(0).aPressed = false;
}
function tagOver(T, won, word, why) {                      // the rep's verdict, a word on the pitch and a moment to read it
  T.stage = 'show'; T.t = 0; T.results.push(won); T.word = word; T.why = why || '';
  if (won) { T.won++; st('tagWon'); sfx('cheer'); if (tagMode(T) === 'keep') T.kept++; else T.pulled++; } else sfx('groan');
  drillTag(word, T.me.x, T.me.y);
}
function tagCanPull(T) {                                   // in reach of a hip: at the carrier's side or behind them, never in front, and not so close you bump
  const K = DRILL_TAG.pull, me = T.me, c = T.them, dx = me.x - c.x, dy = me.y - c.y, d = hyp(dx, dy), sp = hyp(c.vx, c.vy) || 1;
  return d <= K.reach && d >= K.close && (c.vx*dx + c.vy*dy)/(sp*(d || 1)) < K.front;
}
function tagEnd(T) { const stars = drillStarsOf(T.won, DRILL_TAG.stars); practiceFinish(stars > 0, T.won + ' of ' + DRILL_TAG.reps, stars); }
const drillChase = {
  setup(own, cpu) {
    const me = own[0], them = cpu[0], K = DRILL_TAG;
    M.players = [me, them];
    drillSpace(K.cam[0], K.cam[1], K.zoom);
    setCtrl(0, me);
    practice.tag = { me, them, rep:0, won:0, kept:0, pulled:0, results:[], stage:'play', t:0 };
    tagRep(K);
  },
  tick(dt) {
    const T = practice.tag, K = DRILL_TAG, me = T.me, them = T.them, inp = inputOf(0), tap = drillTap();
    T.t += dt;
    if (T.stage === 'show') {
      if (T.t >= K.show) { if (T.rep >= K.reps) tagEnd(T); else tagRep(K); }
      return;
    }
    drillRun(me, dt, K.box, false);
    const v = maxSpeed(me);
    if (tagMode(T) === 'keep') {
      const Q = K.keep;
      drillHold(me);
      const gap = dist(me, them);
      if (T.lunge) {                                       // they have gone for you, in a straight line to where you were heading: change direction now and they go past
        T.lunge.t += dt;
        steer(them, T.lunge.x*v*Q.lungeV, T.lunge.y*v*Q.lungeV + clamp((me.y - them.y)*2, -Q.track, Q.track), 40, dt);   // they lean after you as they come: a slow drift or a wiggle stays in reach, and only a real change of direction beats them
        if (T.lunge.t >= Q.lungeT) { T.lunge = null; T.rest = Q.rest; }
      } else if (T.rest > 0) { T.rest -= dt; steer(them, 0, 0, Q.acc, dt); }
      else if (them.x > me.x) {                            // in front of you they shadow you across the pitch, so running wide early gets you nowhere, and go for you once you are close
        steer(them, -v*Q.jog, clamp((me.y - them.y)*3, -v*Q.shadow, v*Q.shadow), Q.acc, dt);
        T.lat += (me.vy - T.lat)*Math.min(1, dt/Q.read);       // the way you have really been drifting: they read that, so a wiggle made before they go earns nothing, and only a change of direction after they have gone gets you past
        if (gap <= Q.trigger) {
          const tc = gap/(v + v*Q.lungeV), tx = me.x + me.vx*tc - them.x, ty = me.y + T.lat*tc - them.y, m = hyp(tx, ty) || 1;
          T.lunge = { t:0, x:tx/m, y:ty/m }; st('tagLunge'); sfx('whoosh');
        }
      } else { const m = gap || 1; steer(them, (me.x - them.x)/m*v*Q.chase, (me.y - them.y)/m*v*Q.chase, Q.acc, dt); }   // you got past: they can't catch you now
      them.x += them.vx*dt; them.y += them.vy*dt; drillFace(them, me.x, me.y);
      if (dist(me, them) <= Q.reach) T.grab += dt; else T.grab = 0;
      if (T.grab >= Q.grab) { st('tagLost'); T.lost = 'me'; tagOver(T, false, 'Pulled', TAG_WHY.Pulled); return; }
      if (me.x >= Q.line) { tagOver(T, true, 'Kept', ''); return; }
    } else {
      const Q = K.pull;
      drillHold(them);
      let vy = Math.sin(T.t*1.7)*Q.weave;                  // down the pitch with a weave, and one step away as you close in
      if (!T.dodged && dist(me, them) < Q.dodge && me.x < them.x) { T.dodged = true; T.step = me.y >= them.y ? -1 : 1; T.stepT = 0.5; }
      if (T.stepT > 0) { T.stepT -= dt; vy += T.step*Q.step; }
      steer(them, -v*Q.pace, vy, Q.acc, dt);
      them.x += them.vx*dt; them.y = clamp(them.y + them.vy*dt, K.box[1] + 1, K.box[3] - 1); drillFace(them, them.x + them.vx, them.y + them.vy);
      T.whiff = Math.max(0, T.whiff - dt);
      if (tap && !T.whiff) {
        if (tagCanPull(T)) { st('tagPulled'); T.lost = 'them'; sfx('tick'); buzz(20, 0); tagOver(T, true, 'Got It', ''); return; }
        T.whiff = Q.whiff; st('tagWhiff'); sfx('whiff');
      }
      if (dist(me, them) < Q.close) { st('tagBump'); tagOver(T, false, 'No Contact', TAG_WHY.Bumped); return; }
      if (them.x <= Q.line) { tagOver(T, false, 'Too Late', TAG_WHY.Past); return; }
    }
    if (T.t >= K.limit) tagOver(T, false, 'Too Slow', tagMode(T) === 'keep' ? '' : TAG_WHY.Past);
  },
  timeUp() { tagEnd(practice.tag); },
  labels() { const T = practice.tag; if (tagMode(T) !== 'pull' || T.stage !== 'play') return { a:null, b:null, c:false }; const on = tagCanPull(T); return { a:'Pull Tag', aOn:on, cueA:on, b:null, c:false }; },
  hud() { const T = practice.tag, pips = []; for (let i = 0; i < DRILL_TAG.reps; i++) pips.push(i < T.results.length ? (T.results[i] ? 'got' : 'miss') : i === T.results.length ? 'now' : 'todo'); return { pips }; },
  cue() {
    const T = practice.tag;
    if (T.stage === 'show') return T.why ? [T.word, T.why] : null;
    return tagMode(T) === 'keep' ? ['Keep Your Tags', 'Run for the line. Change direction as they go for you.'] : ['Pull the Tag', 'Reach a hip and tap ' + drillName('Pull Tag', 'a') + '. No bumps.'];
  },
  howTo() { return 'Keep your tags and pull theirs. No bumps.'; },
  tip() { const T = practice.tag; return T.kept >= T.pulled ? 'A quick change of direction keeps your tags.' : 'Go for a hip and pull, with no bumps.'; },
  result() { return { skill:'pace' }; },
};

/* ---------- Ball Back: being tackled, and keeping the ball for your team ----------
   A close-up, side on, as Tackling has. A tackler is coming: tap Both Hands in the gold, before they reach you. You are going
   down: pick the safe landing, bottom then shoulder, not a hand out to break the fall. On the ground: your team arrives on
   one side, so push the stick that way and the ball goes back to them. Each part is timed. Stars by good reps. */
const DRILL_BACK = { reps:5, from:6, close:2.4, gold:[1.0, 2.2], contact:0.7, land:1.7, place:1.6, grace:0.25, stickAt:0.5, show:2.0, stars:[1, 3, 5], clear:0.45 };   // clear: in the landing picture the tackler stands this many of the art's metres further off, so the head is beside the carrier and clear of the ball
const BACK_PARTS = [['hands', 'Both Hands'], ['land', 'Landing'], ['place', 'Ball Back']];
const BACK_WHY = {
  'One Hand':'Two Hands Keep the Ball Safe', 'Hand Out':'A Hand Can Get Hurt. Bottom, Then Shoulder.', 'Slow Landing':'Bottom, Then Shoulder',
  'Wrong Way':'Place It Towards Your Team', 'Too Slow':'Place It Towards Your Team',
};
function backRep() {
  const T = practice.back;
  T.rep++; T.stage = 'run'; T.t = 0; T.d = DRILL_BACK.from; T.marks = {}; T.good = false; T.tapped = false; T.pick = null; T.placed = null;
  T.safe = rnd() < 0.5 ? -1 : 1; T.team = rnd() < 0.5 ? -1 : 1;
  inputOf(0).aPressed = false;
}
function backMark(T, part, ok, word) { T.marks[part] = { ok, word }; }
function backVerdict(T) {
  const bad = BACK_PARTS.map(([k]) => T.marks[k]).find(m => m && m.ok === false);
  return T.good ? { word:'Ball Back', why:'' } : bad ? { word:bad.word, why:BACK_WHY[bad.word] || '' } : { word:'Try Again', why:'' };
}
function backEnd(T) { const stars = drillStarsOf(T.made, DRILL_BACK.stars); practiceFinish(stars > 0, T.made + (T.made === 1 ? ' Ball Back' : ' Balls Back'), stars); }
const drillBack = {
  setup(own, cpu) {
    const me = own[0], them = cpu[0];
    M.players = [me, them];
    drillSpace(60, 35, 1.25);
    drillPlace(me, 56, 35, 1, 0); drillPlace(them, 64, 35, -1, 0);
    setCtrl(0, me); drillHold(me);
    practice.back = { me, them, mates:[own[1], own[2]], rep:0, made:0, results:[], stage:'run', t:0, marks:{} };
    backRep();
  },
  tick(dt) {
    const T = practice.back, K = DRILL_BACK, inp = inputOf(0), tap = drillTap(), j = inp.world();
    T.t += dt;
    if (T.stage === 'run') {                               // Both Hands, in the gold, before they reach you
      T.d -= K.close*dt;
      if (tap && !T.tapped) {
        T.tapped = true;
        const ok = T.d <= K.gold[1] && T.d >= K.gold[0];
        backMark(T, 'hands', ok, ok ? 'Both Hands' : 'One Hand');
        if (ok) sfx('tick');
      }
      if (T.d <= K.contact) {
        if (!T.tapped) backMark(T, 'hands', false, 'One Hand');
        T.stage = 'land'; T.t = 0; T.armed = Math.abs(j.x) < K.stickAt; sfx('tackle'); buzz(25, 0);
      }
    } else if (T.stage === 'land') {                       // going down: the safe landing, or a hand out
      T.armed = T.armed || Math.abs(j.x) < K.stickAt;       // a choice is a fresh push: a thumb left on the stick never makes one
      if (T.armed && T.t >= K.grace && T.pick == null && Math.abs(j.x) >= K.stickAt) {
        T.pick = Math.sign(j.x);
        const ok = T.pick === T.safe;
        backMark(T, 'land', ok, ok ? 'Landing' : 'Hand Out');
        if (ok) sfx('tick');
      }
      if (T.pick != null || T.t >= K.land) {
        if (T.pick == null) backMark(T, 'land', false, 'Slow Landing');
        T.stage = 'place'; T.t = 0; T.armed = Math.abs(j.x) < K.stickAt; sfx('hit');
      }
    } else if (T.stage === 'place') {                      // on the ground: towards your team
      T.armed = T.armed || Math.abs(j.x) < K.stickAt;       // the thumb that chose the landing lets go first: it has not seen where the team is yet
      if (T.armed && T.t >= K.grace && T.placed == null && Math.abs(j.x) >= K.stickAt) {
        T.placed = Math.sign(j.x);
        const ok = T.placed === T.team;
        backMark(T, 'place', ok, ok ? 'Ball Back' : 'Wrong Way');
      }
      if (T.placed != null || T.t >= K.place) {
        if (T.placed == null) backMark(T, 'place', false, 'Too Slow');
        T.good = BACK_PARTS.every(([k]) => T.marks[k] && T.marks[k].ok);
        T.results.push(T.good); if (T.good) { T.made++; st('backGood'); sfx('cheer'); } else sfx('groan');
        T.stage = 'show'; T.t = 0;
      }
    } else if (T.stage === 'show') {
      if (T.t >= K.show) { if (T.rep >= K.reps) backEnd(T); else backRep(); }
    }
  },
  timeUp() { backEnd(practice.back); },
  labels() { const T = practice.back; if (T.stage !== 'run') return { a:null, b:null, c:false }; const K = DRILL_BACK, gold = T.d <= K.gold[1] && T.d >= K.gold[0]; return { a:'Both Hands', aOn:!T.tapped, cueA:gold && !T.tapped, b:null, c:false }; },
  hud() { const T = practice.back, pips = []; for (let i = 0; i < DRILL_BACK.reps; i++) pips.push(i < T.results.length ? (T.results[i] ? 'got' : 'miss') : i === T.results.length ? 'now' : 'todo'); return { pips }; },
  cue() {
    const s = practice.back.stage;
    return s === 'run' ? ['Both Hands', 'Tap ' + drillName('Both Hands', 'a') + ' on the gold.'] : s === 'land' ? ['Landing', drillSide('for the tick') + ': bottom, then shoulder.'] : s === 'place' ? ['Ball Back', drillSide('towards your team') + '.'] : null;
  },
  drawScreen() { backDraw(practice.back); },
  howTo() { return 'Both hands on the ball, land safely, and put it back towards your team.'; },
  tip() { const T = practice.back; return T.made ? 'Both hands, a safe landing, ball back to your team.' : 'Bottom, then shoulder. Never a hand out.'; },
  result() { return { skill:'handling' }; },
};
function backDraw(T) {                                     // side on, as Tackling's close-up: you with the ball, the tackler arriving, then the ground
  if (!T) return;
  const K = DRILL_BACK, W = V.W, H = V.H, y0 = H*0.8, k = H*0.4/1.8, Hp = 1.8*k, tx = W*0.42;
  ctx.save();
  dvStage(y0);
  const s = T.stage, run = s === 'run';
  const fall = s === 'land' ? clamp(T.t/K.land, 0, 0.75) : s === 'place' || s === 'show' ? 1 : 0;
  if (run) { ctx.fillStyle = 'rgba(255,207,61,.55)'; ctx.fillRect(tx + K.gold[0]*k, y0, (K.gold[1] - K.gold[0])*k, 10); }   // the gold: tap as the tackler's foot lands here
  const rx = tx + Math.max(0.5, T.d)*k + H*0.04;
  const side0 = T.placed != null ? T.placed : T.team, away = s === 'place' || s === 'show' ? tx - side0*1.5*k : s === 'land' ? rx + K.clear*k : rx;   // on the ground they roll away from your team's side, so they are not in the way of the ball
  if (!dvManAt(away, y0, k, T.them, run ? 'sprint' : s === 'land' ? 'tackle' : 'lying', run ? Math.floor(M.rt*10) & 7 : s === 'land' ? 1 : 0, s === 'place' || s === 'show' ? (side0 > 0 ? 2 : 6) : 6)) tackleBody(rx, y0, k, M.kit[1], { dir:-1, phase:run ? M.rt*11 : 0, lean:0.35, crouch:0.5, down:fall*0.8, fwd:true });
  const both = T.marks.hands && T.marks.hands.ok, hand = T.pick != null && T.pick !== T.safe;
  { const side = T.placed != null ? T.placed : T.team, d8 = side < 0 ? 2 : 6, u = s === 'land' ? clamp(T.t/K.land, 0, 1) : 0;   // your head goes towards your team, so the ball goes back to them
    const clip = run ? (both ? 'carry' : 'run') : s === 'land' ? (hand ? 'fall' : 'land') : hand && s !== 'show' ? 'fall' : 'place';
    const frame = run ? Math.floor(M.rt*10) & 7 : s === 'land' ? (hand ? 1 : T.pick != null ? 1 + (u > 0.5 ? 1 : 0) : 0) : clip === 'fall' ? 2 : T.placed != null ? 1 : 0;
    if (dvManAt(tx, y0, k, T.me, clip, frame, clip === 'place' ? d8 : 2)) {
      if (clip === 'carry') dvHeld(tx, y0, k, T.me);
      else if (run) cutBall(tx + 0.22*k, y0 - 1.0*k, k*DV_BALL, 0.7);          // in one hand, at the side: not yet safe
      else if (clip === 'land') cutBall(tx + (frame ? -0.02 : 0.1)*k, y0 - (frame === 2 ? 0.34 : frame ? 0.68 : 1.02)*k, k*DV_BALL, 0.6);
      else if (clip === 'fall') cutBall(tx + 0.9*k, y0 - 0.05*k, k*DV_BALL, 0);
      else if (clip === 'place' && (s !== 'show' || !T.good) && T.placed == null) cutBall(tx - (d8 === 2 ? 0.25 : -0.25)*k, y0 - 0.36*k, k*DV_BALL, 0.2);
    } else {
      tackleBody(tx, y0, k, M.kit[0], { dir:1, phase:run ? M.rt*11 : 0, lean:run ? 0.15 : 0, ball:s !== 'show' || !T.good, down:fall*(s === 'place' || s === 'show' ? 1 : 0.8) });
      if (both && run) { ctx.strokeStyle = C.head; ctx.lineWidth = Hp*0.05; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tx - H*0.01, y0 - Hp*0.6); ctx.lineTo(tx + Hp*0.11, y0 - Hp*0.66); ctx.moveTo(tx + Hp*0.02, y0 - Hp*0.74); ctx.lineTo(tx + Hp*0.11, y0 - Hp*0.7); ctx.stroke(); }
    }
  }
  const label = (text, x, y, col, mark) => { ctx.font = `800 17px 'Big Shoulders Display', Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const w = ctx.measureText ? (ctx.measureText(text.toUpperCase()) || {}).width || 90 : 90; ctx.fillStyle = 'rgba(8,14,10,.85)'; rrect(x - w/2 - 10, y - 16, w + 20, 32, 6); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke(); ctx.fillStyle = col; ctx.fillText(text.toUpperCase(), x, y + 1); if (mark != null) drillMark(x - w/2 - 24, y, 12, mark); };
  const lx = W*0.5 - W*0.24, ly = H*0.42, rx2 = W*0.5 + W*0.24;
  if (s === 'land') {                                      // the two landings, either way round
    const at = side => (side < 0 ? lx : rx2);
    label('Bottom, Then Shoulder', at(T.safe), ly, '#62d680', true);
    label('Hand Out', at(-T.safe), ly, '#ff8466', false);
  } else if (s === 'place' || (s === 'show' && T.marks.place)) {   // your team, arriving on one side
    const px = T.team < 0 ? tx - Hp*0.8 : tx + Hp*1.1;
    const face = T.team < 0 ? 2 : 6, f0 = Math.floor(M.rt*9) & 7;   // they run in
    if (!dvManAt(px + (T.team < 0 ? -Hp*0.3 : Hp*0.3), y0, k*0.92, T.mates[1], 'run', (f0 + 3) & 7, face)) tackleBody(px + (T.team < 0 ? -Hp*0.3 : Hp*0.3), y0, k*0.92, M.kit[0], { dir:-T.team, lean:0.5, crouch:0.5, phase:M.rt*8 });
    if (!dvManAt(px, y0, k, T.mates[0], 'run', f0, face)) tackleBody(px, y0, k, M.kit[0], { dir:-T.team, lean:0.5, crouch:0.5, phase:M.rt*8 + 1 });
    if (s === 'place') label('Your Team', px, ly, '#f1eee4');
    if ((s === 'show' || s === 'place') && T.placed != null) { const bx = tx + T.placed*(artReady() ? 1.28*k : Hp*0.45); cutBall(bx, y0 - 6, k*DV_BALL, 0); }   // at arm's length, on the grass, towards whichever side it went
  }
  ctx.restore();
  const top = tackleChipTop(H), gap = 6, n = BACK_PARTS.length, w = Math.min(124, (W - 120 - gap*(n - 1))/n), x0 = W/2 - (w*n + gap*(n - 1))/2;
  ctx.save();
  ctx.font = `800 15px 'Big Shoulders Display', Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  BACK_PARTS.forEach(([p, name], i) => {
    const m = T.marks[p], x = x0 + i*(w + gap);
    ctx.fillStyle = !m ? 'rgba(16,27,20,.85)' : m.ok ? 'rgba(46,140,74,.95)' : 'rgba(186,64,44,.95)';
    rrect(x, top, w, 28, 5); ctx.fill();
    ctx.fillStyle = !m ? 'rgba(241,238,228,.55)' : '#f1eee4';
    ctx.fillText((m ? m.word : name).toUpperCase(), x + w/2, top + 14.5);
  });
  if (s === 'show') {
    const v = backVerdict(T);
    ctx.font = `900 34px 'Big Shoulders Display', Impact, sans-serif`; ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(8,14,10,.9)'; ctx.fillStyle = T.good ? '#62d680' : '#ff8466';
    ctx.strokeText(v.word.toUpperCase(), W/2, top + 62); ctx.fillText(v.word.toUpperCase(), W/2, top + 62);
    if (v.why) { ctx.font = `800 19px 'Big Shoulders Display', Impact, sans-serif`; ctx.lineWidth = 4; ctx.fillStyle = '#f1eee4'; ctx.strokeText(v.why.toUpperCase(), W/2, top + 90); ctx.fillText(v.why.toUpperCase(), W/2, top + 90); }
  }
  ctx.restore();
}

const DRILL_KIT = { tag:drillChase, back:drillBack, egg:drillEgg, circle:drillCircle, cones:drillCones, tackle:drillTackle, kick:drillKick, scrum:drillDrive, defend:drillDefend, pass:drillPass };
const drillKit = () => (practice ? DRILL_KIT[practice.id] : null);
/* the engine's hooks: each returns true when the drill has taken the moment */
function practiceTackle(c, q) { const k = drillKit(); return !!(k && k.onTackle && k.onTackle(c, q)); }
function practiceGoal(g) { const k = drillKit(); return !!(k && k.onGoal && k.onGoal(g)); }
function practiceScrum(c) { const k = drillKit(); return !!(k && k.onScrum && k.onScrum(c)); }
function practiceTry(p) {                                  // a try inside a drill: Create a Gap's and Defend a Breakaway's to judge, the only games that restage open play
  const k = drillKit();
  if (k && k.onTry) k.onTry(p); else practiceFinish(false, '', 0);
}
function drillLabels() { const k = drillKit(); return (k && k.labels && k.labels()) || { a:null, b:null, c:false }; }
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
  tag:'<circle cx="20" cy="8" r="4"/><path d="M20 12v13M20 25l-5 11M20 25l5 11M20 16l-8 5M20 16l8 5"/><path d="M12 24l-5 7" class="acc-line"/><path d="M28 24l5 7" class="acc-line"/>',
  back:'<path d="M5 33h30"/><ellipse cx="24" cy="27" rx="7" ry="4.4" class="acc"/><path d="M15 27H5M9 23l-4 4 4 4" class="acc-line"/><circle cx="33" cy="9" r="3"/>',
  pass:'<circle cx="8" cy="28" r="4" class="man"/><circle cx="32" cy="28" r="4" class="man"/><path d="M11 23q9-16 18 0" class="dash"/><ellipse cx="20" cy="13" rx="3.6" ry="2.4" class="acc"/>',
};
const drillIconSvg = id => `<svg viewBox="0 0 40 40" aria-hidden="true">${DRILL_ICONS[id] || ''}</svg>`;
const DRILL_STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.4l-6.1 3.5 1.5-6.8L2.2 9.5l6.9-.7z"/></svg>';
function drillStarsHtml(n) { let s = ''; for (let i = 0; i < 3; i++) s += `<i class="${i < n ? 'on' : ''}">${DRILL_STAR}</i>`; return s; }
