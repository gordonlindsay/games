/* =========================================================
   Watch How: the game plays a drill itself, in slow motion, and shows the real controls being used.
   It runs the real drill: a small scripted pilot, one a drill, writes the stick and the buttons on the same input object a
   thumb or a key writes (btn() with its own source bit), so it can't drift from the rules, and it draws no random number of
   its own. It plays one good rep or round, then rebuilds the drill and ends on the ready card, so Start Drill is a clean run.
   Nothing is recorded: practiceFinish stops here, and the stats it wrote go with the thrown-away match. Real input is ignored.
   There is no pause: a hidden app, a lost focus or a turned phone drops to the ready card, so nothing can stay held or paused.
   The one automatic play is used up only by DEMO.seen seconds of watching, its end, Skip, or Start Drill: an interruption before that leaves it for the next open.
   ========================================================= */
const DEMO = { rate:0.4, slow:0.25, ease:5, cap:75, tap:0.22, linger:1.2, seen:4, bit:1 << 20 };   // the pace and the slow pace at the moment that matters; rate's easing a second; the wall-clock cap; a tap's and the closing hold's real seconds; real seconds of watching that use up the automatic play; this source's bit in inp.src
let demoLast = null;                                       // how the last one ended, for the tools: { id, ok, why, wall, marks }
const demoOn = () => !!(practice && practice.demo);
const demoName = drillName, demoMove = drillMove;          // one namer for the cards, the live cues and these captions (training.js)
function demoStart() {
  if (!practice || !practice.ready) return;
  practice.ready = false; M.paused = false; releaseAll();
  practice.demo = { rate:DEMO.rate, wall:0, began:0, tries:1, cap:DEMO.cap, x:0, y:0, want:{ a:false, b:false, c:false }, tapT:{ a:0, b:0, c:0 }, slow:false, out:null, left:0, title:'', line:'', marks:{}, n:{},
    step(title, line) { this.title = title; this.line = line; }, go(x, y) { const m = hyp(x, y), t = stickTurn(0), sx = t ? y*t : x, sy = t ? -x*t : y; this.x = m > 1 ? sx/m : sx; this.y = m > 1 ? sy/m : sy; }, hold(k) { this.want[k] = true; }, tap(k) { if (this.tapT[k] <= 0) this.tapT[k] = DEMO.tap; }, mark(k) { if (this.marks[k] == null) this.marks[k] = this.rate; }, end(ok) { demoEnd(ok); } };
  $('m-practice').hidden = true; $('controls').hidden = false; $('b-pause').hidden = true; $('drill-hud').hidden = true; $('practice-cue').hidden = true;
  $('controls').classList.add('demo'); if (document.body) document.body.classList.add('drill-demo');
  $('drill-demo').hidden = false; $('demo-skip').hidden = false; $('demo-step').textContent = ''; $('demo-cap').textContent = '';
  $('demo-coach').hidden = !(practice.contact || (practice.tackles && !practice.tagOnly));   // a first open plays this before any card: the coach line goes with the pictures
  setFocus(null); lastBtn = ''; restStick();
  const skip = $('demo-skip'); if (skip.focus) skip.focus();
  demoStep(0);
}
function demoMark() {                                      // this device has seen this drill's demo. save() stands down in a drill, so the snapshot, the settings it puts back, is what is written
  const p = practice, s = p.settings;
  if (s.drillSeen.includes(p.id)) return;
  s.drillSeen = DRILL_IDS.filter(d => d === p.id || s.drillSeen.includes(d));
  saveWith(s);
}
function demoStep(raw) {                                   // a real step, before the world's: true holds the world still
  const D = practice.demo;
  if (raw && uprightPhone.matches) return true;            // opened with the phone upright: it waits behind the Turn Your Phone cover
  D.wall += raw;
  if (D.wall >= DEMO.seen) demoMark();
  if (D.out) {                                             // the good rep is done: hold the picture a moment
    D.left -= raw; demoCaption(D);
    if (D.wall >= D.cap) demoFinish(false, 'cap');
    else if (D.left <= 0) { if (D.out.ok) demoFinish(true, 'end'); else demoAgain(D); }
    return true;
  }
  if (D.wall >= D.cap) { demoFinish(false, 'cap'); return true; }
  D.x = D.y = 0; D.want.a = D.want.b = D.want.c = false; D.slow = false;
  DEMO_PILOT[practice.id](D, Math.max(raw, STEP)*D.rate);
  if (!practice.demo || D.out) { demoRelease(D); demoSync(); return true; }
  D.rate += ((D.slow ? DEMO.slow : DEMO.rate) - D.rate)*(1 - Math.exp(-raw*DEMO.ease));
  input.jx = D.x; input.jy = D.y;
  for (const k of ['a', 'b', 'c']) { if (D.tapT[k] > 0) D.tapT[k] -= raw; btn(input, k, DEMO.bit, D.want[k] || D.tapT[k] > 0); }
  demoCaption(D); demoSync();
  return false;
}
function demoCaption(D) {                                  // written only when it changes (it is a polite live region)
  if ($('demo-step').textContent !== D.title) $('demo-step').textContent = D.title;
  if ($('demo-cap').textContent !== D.line) $('demo-cap').textContent = D.line;
}
function demoSync() {                                      // the ghost: the real stick's knob where the input says, with a thumb on it; each real button lit with a finger on it for exactly as long as it is down
  const x = input.jx, y = input.jy, moved = hyp(x, y) > 0.01;
  knob.style.transform = moved ? `translate(${x*STICK_R}px,${y*STICK_R}px)` : '';
  knob.classList.toggle('lit', moved); stick.classList.toggle('on', moved);
  for (const [id, key] of ACTS) $(id).classList.toggle('lit', !!input[key + 'Down']);
}
function demoRelease(D) { input.jx = input.jy = 0; D.tapT.a = D.tapT.b = D.tapT.c = 0; for (const k of ['a', 'b', 'c']) btn(input, k, DEMO.bit, false); }
function demoEnd(ok) {                                     // the pilot is done, or the drill ended itself: let go and hold the picture
  const D = practice.demo; if (!D || D.out) return;
  demoRelease(D);
  D.out = { ok }; D.left = DEMO.linger; D.step(ok ? 'Now Play It' : 'Missed', ok ? 'That is how the game goes.' : 'Even good players miss. One more look.');
  demoCaption(D); demoSync();
}
function demoAgain(D) {                                    // the rules said no (a dive is never certain): the same drill freshly built, and the pilot goes again until the cap
  const p = practice, best = p.best, wall = D.wall, tries = D.tries + 1;
  practiceStart(p.id, p.opts, true);
  if (!practice) return;
  practice.best = best;
  demoStart();
  if (practice.demo) { practice.demo.wall = practice.demo.began = wall; practice.demo.tries = tries; }   // began: a retry shows its steps at the pace the first try did
}
function demoFinish(ok, why) {                             // back to a freshly built drill on its ready card
  const p = practice, D = p.demo; if (!D) return;
  demoLast = { id:p.id, ok:!!ok, why, wall:D.wall, tries:D.tries, marks:D.marks };
  if (why !== 'stop') demoMark();
  const best = p.best;
  practiceStart(p.id, p.opts, true);
  if (practice) practice.best = best;
}
function demoSkip() { if (demoOn()) demoFinish(false, 'skip'); }   // the player said no more: Skip, Escape, or Start on a pad
function demoStop() { if (demoOn()) demoFinish(false, 'stop'); }   // the phone or the browser interrupted: that is not having seen it
$('demo-skip').addEventListener('click', demoSkip);
function demoClean() {                                     // every way out goes through here (practiceRestore): the overlay, the ghost and anything the pilot held
  practice.demo = null;
  $('drill-demo').hidden = true; $('demo-skip').hidden = true;
  $('controls').classList.remove('demo'); if (document.body) document.body.classList.remove('drill-demo');
  knob.classList.remove('lit'); knob.style.transform = ''; stick.classList.remove('on');
  for (const [id] of ACTS) $(id).classList.remove('lit');
  for (const inp of inputs) { inp.flick = 0; inp.pre = null; inp.latch = false; inp.held.clear(); }
  releaseAll(); lastBtn = '';
}
function demoKeyDown(e, r) {
  if (r) setDev('kb');
  if (e.code === 'Escape' || e.code === 'KeyP') { if (e.preventDefault) e.preventDefault(); if (!e.repeat) demoSkip(); }
  else if (r && e.preventDefault) e.preventDefault();      // Space can't press the focused Skip
}
function demoPad(gp, P) {                                  // the pad's edges are still tracked, so a button held through it can't fire afterwards. Only Start skips: a caption names every other button, and a child copying it must not lose the demo. A pad with no Start plays it through
  const n = P.std ? Math.min(gp.buttons.length, 16) : Math.min(gp.buttons.length, 2);
  let skip = false;
  for (let i = 0; i < n; i++) {
    const was = !!P.b[i], now = padDown(gp.buttons[i], i, was);
    if (now === was) continue;
    P.b[i] = now;
    if (now) { setDev('pad'); if (i === BMAP.start) skip = true; }
  }
  if (skip) demoSkip();
}

/* ---------- the pilots ----------
   Each reads the drill as a player reads the screen and says, step by step, what the thumb and the fingers do. dt is the drill
   time this step will take. A rep that goes wrong just rolls on to the drill's next rep; a drill with only one (Defend, Two-on-One)
   is built afresh and goes again. Its rules are never bent: a dive is about two in three, for the pilot as for anyone. */
function demoEggSpot(E) {                                  // where to run: the first point on the ball's flight within reach in time, or where this hop lands. t: how long until the ball is there
  const b = M.ball, me = E.me, K = DRILL_EGG, v = maxSpeed(me)*0.8, lo = E.bounced ? 0.05 : E.kind === 'bounce' ? 99 : K.lo + 0.1;   // a Bounce Pass can't be caught before it lands, so run to where it lands
  let x = b.x, y = b.y, z = b.z, vz = b.vz;
  if (E.rolling) return { x:b.x + b.vx*0.3, y:b.y + b.vy*0.3, t:0 };
  for (let t = 0; t < 3.5; t += 1/60) {
    vz -= E.g/60; x += b.vx/60; y += b.vy/60; z += vz/60;
    if (z <= 0) return { x, y, t };
    if (z > lo && z < K.hi - 0.1 && hyp(x - me.x, y - me.y) - K.reach*0.6 <= v*t) return { x, y, t };
  }
  return { x, y, t:3.5 };
}
const demoMissed = () => !!M.stats.tier_broken;              // Defend: the dive went in and the runner broke it
const demoToward = (D, me, x, y, near) => { const dx = x - me.x, dy = y - me.y, m = hyp(dx, dy); if (m > (near || 0.15)) D.go(dx/m*Math.min(1, m/0.8), dy/m*Math.min(1, m/0.8)); };
const DEMO_PILOT = {
  egg(D) {                                                 // the three throws, one of each, named as they come: it ends after the third, however that one went
    const E = practice.egg, K = DRILL_EGG, me = E.me, b = M.ball, name = K.names[E.kind];
    if (E.n >= K.first.length && E.stage !== 'fly' && E.stage !== 'wind') { D.step(name, E.stage === 'caught' ? 'Caught on the run. That is all three.' : 'That is all three.'); if (E.t >= 0.3) D.end(true); return; }
    if (E.stage === 'caught') { D.step(name, 'Caught on the run. Moving to the ball scores double.'); return; }
    if (E.stage === 'missed') { D.step(name, 'Missed. Even good players miss.'); return; }
    if (E.stage !== 'fly') { { const left = K.first.length - E.n; D.step('Watch', left === 3 ? 'Watch the thrower. Three throws are coming.' : left === 2 ? 'Two more to come.' : 'One more to come.'); } return; }
    const at = demoEggSpot(E), far = hyp(at.x - me.x, at.y - me.y), v = maxSpeed(me);
    D.step(name, E.kind === 'bounce' ? 'It hops at odd angles. Run to it and catch it on any hop.' : E.kind === 'flat' ? 'Run to meet it before it lands.' : 'Up high. Run under it and watch the ball in.');
    if (hyp(me.x - b.x, me.y - b.y) < 5) D.slow = true;
    if (E.kind === 'bounce' && E.hops.length < 2) {        // let it hop first, so the hops can be seen: stay just out of its reach
      const dx = me.x - b.x, dy = me.y - b.y, m = hyp(dx, dy) || 1, B = K.box;
      if (m < 2.6) { let ax = dx/m, ay = dy/m; if ((me.x <= B[0] + 0.5 && ax < 0) || (me.x >= B[2] - 0.5 && ax > 0)) ax = 0; if ((me.y <= B[1] + 0.5 && ay < 0) || (me.y >= B[3] - 0.5 && ay > 0)) ay = 0; if (!ax && !ay) ay = me.y < (B[1] + B[3])/2 ? 1 : -1; D.go(ax, ay); }
      return;
    }
    if (D.n.go !== E.n && (far - K.reach*0.7)/v + 0.3 >= at.t - 0.12) D.n.go = E.n;   // set off so as to arrive moving, not to stand and wait
    if (D.n.go === E.n) { const dx = at.x - me.x, dy = at.y - me.y, m = hyp(dx, dy) || 1; D.go(dx/m, dy/m); }
  },
  circle(D, dt) {
    const C = practice.circle;
    if (C.role === 'runner') {
      if (C.survived >= 1) {                               // the round is won: now the same round as the passer
        D.step('Runner', 'Home first. Now the passer.');
        if (C.t >= 0.5) { C.round = 1; C.survived = 0; DRILL_KIT.circle.role('passer'); }
        return;
      }
      if (C.stage === 'start') { D.slow = true; D.step('Runner', 'Tap ' + demoName('Pass', 'a') + ' on the gold: a pass to the chest.'); if (C.t >= DRILL_CIRCLE.chestAt) D.tap('a'); return; }
      if (C.stage !== 'race' || C.home) return;
      const at = circleRunAt(C.R, C.s);                    // the thumb goes round with the runner
      D.go(-Math.sin(at.a), Math.cos(at.a));
      if (C.s > C.L*0.6) { D.hold('c'); D.step('Runner', 'Hold ' + demoName('Sprint', 'c') + ' to go faster.'); }
      else D.step('Runner', demoMove() + ' to run round the outside.');
      return;
    }
    if (C.survived >= 1) { D.step('Passer', 'You beat the runner.'); D.end(true); return; }
    if (C.stage === 'start') { D.slow = true; D.step('Passer', 'Tap ' + demoName('Pass', 'a') + ' on the gold to start.'); if (C.t >= DRILL_CIRCLE.chestAt) D.tap('a'); return; }
    D.step('Passer', 'Tap ' + demoName('Pass', 'a') + ' as the rings meet: a pass to the chest.');
    if (C.hold) { D.slow = true; if (C.hold.t + dt >= C.hold.tc) D.tap('a'); }
  },
  cones(D) {
    const Q = practice.cones, K = DRILL_CONES, me = Q.me;
    const route = D.route || (D.route = [...K.gates.slice(0, K.out).map(([x, y]) => [x + 0.5, y]), [K.turn[0] + 2, K.turn[1] - 3], [K.turn[0] + 2, K.turn[1] + 2], ...K.gates.slice(K.out).map(([x, y]) => [x - 0.5, y]), [K.line - 3, 46]]);
    let i = D.i || 0;
    if (i < route.length - 1 && hyp(route[i][0] - me.x, route[i][1] - me.y) < 1.2) i = D.i = i + 1;
    const dx = route[i][0] - me.x, dy = route[i][1] - me.y, m = hyp(dx, dy) || 1;
    D.go(dx/m, dy/m);
    if (i > K.out + 1) { D.hold('c'); D.step('Sprint', 'Hold ' + demoName('Sprint', 'c') + ' on the straight home.'); }
    else if (i >= K.out) D.step('The Flag', 'Run round the flag.');
    else D.step('The Gates', demoMove() + ' for a clean line through every gate.');
  },
  tackle(D, dt) {
    const T = practice.tackle, K = DRILL_TACKLE, me = T.me, aim = (K.height[0] + K.height[1])/2;
    const s = T.stage;
    if (T.made) { D.step('Great Tackle', 'Set, head behind them, aim, let go on the gold, squeeze.'); if (s === 'show' && T.t >= 1) D.end(true); return; }
    if (s === 'approach' || s === 'past') {
      D.step('Set', demoMove() + ' to get in the runner’s path. Short steps, feet balanced.');
      const dy = T.lane - me.y;
      if (Math.abs(dy) > 0.15) D.go(0, Math.max(-1, Math.min(1, dy*0.7)));
    } else if (s === 'head') {
      D.slow = true; D.mark('head');
      D.step('Head Side', drillSide('for the tick') + ': your head goes behind them.');
      if (T.t >= 0.35 && T.pick == null) D.go(T.safe, 0);
    } else if (s === 'side') {
      D.slow = true;
      const aimed = Math.abs(T.h - aim) <= 0.015;
      if (!aimed) D.go(0, T.h > aim ? 1 : -1);
      if (aimed || T.d < 3.4) D.n.pressed = true;
      if (!D.n.pressed) D.step('Aim', (drillIsKeys() ? 'Press S' : 'Push the stick down') + ' to aim at the thighs.');
      else {
        D.step('Hold and Let Go on the Gold', 'Hold ' + demoName('Tackle', 'a') + '. Let go on the gold.');
        if (T.d - K.run*dt > (K.zone[0] + K.zone[1])/2) D.hold('a'); else D.mark('release');
      }
    } else if (s === 'lunge') { D.slow = true; D.step('Hold and Let Go on the Gold', 'Let go. Now the tackle.'); }
    else if (s === 'squeeze') {
      D.slow = true; D.n.pressed = false; D.mark('squeeze');
      D.step('Squeeze', 'Hold ' + demoName('Squeeze', 'a') + ' to bring them down.');
      if (T.t >= 0.08) D.hold('a');
    } else { D.n.pressed = false; if (s === 'down') { D.slow = true; D.step('Squeeze', 'They are down.'); } }
  },
  kick(D, dt) {
    const c = M.cut, g = c && c.kind === 'goal' ? c.g : null;
    if (!g || g.watch) return;
    if (g.judged) { if (g.ok) { D.step('Over', 'Over the bar.'); D.end(true); } else D.step('Wide', 'Another one.'); D.n.steer = 0; return; }
    if (c.t <= CUT_IN) { D.step('Aim', 'Line up the arrow with the posts.'); return; }
    if (g.stage === 'aim') {
      const ideal = aimFor(g, g.ctr), steer = D.n.steer || 0, want = steer === 0 ? ideal + 0.07 : ideal, err = want - g.aim;   // a calm first kick needs no aim, so the thumb shows it anyway: out a little, and back on line
      D.step('Aim', demoMove() + ' to steer the arrow to the posts.');
      if (Math.abs(err) >= 0.004) { D.go(Math.sign(err)*Math.max(0.2, Math.min(1, Math.abs(err)/0.05)), 0); return; }
      D.n.steer = steer + 1;
      if (steer) { D.slow = true; D.hold('a'); }
    } else if (g.stage === 'power') {
      D.slow = true;
      D.step('Kick', 'Hold ' + demoName('Kick', 'a') + '. Let go in the gold.');
      if (g.pt + dt < g.ctr*g.fill) D.hold('a'); else D.mark('release');
    } else D.step('Kick', 'Watch it fly.');
  },
  scrum(D) {
    const R = practice.drive, c = M.cut;
    if (R.won) { D.end(true); return; }
    if (!c || c.kind !== 'scrum' || c.result) return;
    if (c.shape != null) { const B = DRILL_DRIVE.shape.band; if (c.shape > B[1] - 0.07) D.go(0, 1); else if (c.shape < B[0] + 0.05) D.go(0, -1); }   // the thumb keeps the body in the green
    if (c.t < SCRUM_SET - 0.3) { D.step('Get Low', 'Get low into the green. Wait for Set.'); return; }
    if (c.t < SCRUM_SET + 0.12 && !c.hit[0]) { D.slow = true; D.mark('set'); D.step('On Set', 'Tap ' + demoName('Push', 'a') + ' on Set.'); if (c.t >= SCRUM_SET - 0.02) D.tap('a'); return; }
    D.step('Drive', 'Stay in the green and keep tapping ' + demoName('Push', 'a') + '.');
    if (c.t >= (D.n.next || 0)) { D.tap('a'); D.n.next = c.t + 1/7; }
  },
  defend(D) {
    const me = ctrlOf(0), b = M.ball, c = b.state === 'held' ? b.carrier : null, tagging = practice.tagOnly, press = tagging ? 'Pull Tag' : 'Tackle';
    if (!practice.switched) { D.slow = true; D.step('Switch', 'Tap ' + demoName('Switch', 'b') + ' to pick the defender in front.'); if (D.wall - D.began >= 1.5) D.tap('b'); return; }
    if (demoMissed()) { D.end(false); return; }
    if (!me || !c || c.team !== 1) return;
    demoToward(D, me, c.x + c.vx*0.25, c.y + c.vy*0.25, 0.05);   // to where the runner is going
    if (dist(me, c) < 6) D.slow = true;
    if ((tagging ? drillCanPull(me) : canDive(me)) && dist(me, c) < 1.5) { D.mark('tackle'); D.step(press, 'Tap ' + demoName(press, 'a') + (tagging ? ' to pull the tag.' : ' once you are close.')); D.tap('a'); }
    else {
      D.step('Run', tagging && dist(me, c) < 6 ? 'Get close, then tap ' + demoName('Pull Tag', 'a') + '.' : demoMove() + ' to the runner. Hold ' + demoName('Sprint', 'c') + ' to catch them.');
      D.hold('c');
    }
  },
  tag(D) {                                                 // one Keep and one Pull
    const T = practice.tag, K = DRILL_TAG, me = T.me, them = T.them;
    if (T.kept && T.pulled) { D.step('Now Play It', 'Keep your tags and pull theirs.'); if (T.stage === 'show' && T.t >= 0.6) D.end(true); return; }
    if (T.stage !== 'play') { D.slow = true; D.step(T.word, T.why || 'Well done.'); return; }
    if (tagMode(T) === 'keep') {
      const ahead = them.x > me.x;
      if (T.lunge && !D.n.side) D.n.side = me.y >= K.cam[1] ? -1 : 1;   // towards the middle, where there is room
      if (!ahead) D.n.side = 0;
      if (T.lunge || (D.n.side && T.rest > 0)) { D.slow = true; D.go(0.45, D.n.side*0.9); D.step('Keep', demoMove() + ' to change direction as they go for you.'); }
      else if (ahead) { D.go(1, 0); D.step('Keep', 'Run at them. Wait for them to go.'); }
      else { D.go(1, 0); D.step('Keep', 'They went past. Run for the line.'); }
      return;
    }
    const side = me.y >= them.y ? 1 : -1, tx = them.x + them.vx*0.35, ty = them.y + them.vy*0.35 + side*1.15, dx = tx - me.x, dy = ty - me.y, m = hyp(dx, dy) || 1;   // to a spot at their hip
    if (m > 0.2) D.go(dx/m*Math.min(1, m/0.8), dy/m*Math.min(1, m/0.8));
    D.step('Pull', 'Go for a hip, not the front.');
    if (dist(me, them) < 5) D.slow = true;
    if (tagCanPull(T)) { D.mark('pull'); D.step('Pull', 'Tap ' + demoName('Pull Tag', 'a') + ' to take the tag.'); D.tap('a'); }
  },
  back(D) {                                                // one good rep, each part named
    const T = practice.back, K = DRILL_BACK, s = T.stage;
    if (T.made) { D.step('Ball Back', 'Both hands, a safe landing, ball back to your team.'); if (s === 'show' && T.t >= 1) D.end(true); return; }
    if (s === 'run') {
      D.step('Both Hands', 'Tap ' + demoName('Both Hands', 'a') + ' on the gold.');
      if (T.d < K.gold[1] + 1) D.slow = true;
      if (!T.tapped && T.d <= (K.gold[0] + K.gold[1])/2) { D.mark('hands'); D.tap('a'); }
    } else if (s === 'land') {
      D.slow = true; D.step('Landing', drillSide('for the tick') + ': bottom, then shoulder.');
      if (T.t >= K.grace + 0.2) D.go(T.safe, 0);
    } else if (s === 'place') {
      D.slow = true; D.step('Ball Back', drillSide('towards your team') + '.');
      if (T.t >= K.grace + 0.3) D.go(T.team, 0);
    }
  },
  pass(D) {
    const me = ctrlOf(0), b = M.ball, def = M.players.find(p => p.team === 1);
    if (practice.completedPass) {
      D.step('Score', demoMove() + ' to run for the try line.');
      if (me && def) { D.go(1, dist(me, def) < 6 && def.x >= me.x - 1 ? (me.y >= def.y ? 0.7 : -0.7) : 0); D.hold('c'); }   // round the defender, then straight home
      return;
    }
    if (b.state !== 'held') { D.slow = true; D.go(1, 0); D.step('Pass', 'The ball goes to the runner with the dashed ring.'); return; }
    if (b.carrier !== me || !def) return;
    D.go(1, 0);
    if (dist(me, def) > 5) { D.step('Draw', demoMove() + ' to run at the defender and draw them in.'); return; }
    D.slow = true; D.mark('pass');
    D.step('Pass', 'Tap ' + demoName('Pass', 'a') + ' before they reach you.');
    D.tap('a');
  },
};
