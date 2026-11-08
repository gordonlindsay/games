/* ---------- penalties and goal kicks ---------- */
function penalty(team, x, y) {
  M.stats.pens++;
  sfx('whistle');
  placeBall(x, y);
  M.poss = team;
  startSet({ kind:'penalty', team, x, y, t:1.1, snap:true, label:'Penalty ' + M.nat[team].id, then:s => {
    const dP = hyp(oppLine(s.team)-s.x, s.y-35);
    if (isHuman(s.team)) openPenalty(s.team, s.x, s.y, dP);
    else cpuPenalty(s.team, s.x, s.y, dP);
  }});
}
const penSpot = (team, x) => team === 0 ? Math.min(x, 110 - KICK.penMin) : Math.max(x, 10 + KICK.penMin);   // a kick at goal is taken at least 10m out
function cpuPenalty(team, x, y, dP) {
  if (dP < 40 && Math.abs(y-35) < 28) {
    const g = makeGoal(team, penSpot(team, x), y, 'penalty', null);
    if (g.mClear <= KICK.range) return penChoice(team, x, y, 'goal', g);   // the g checked is the g kicked
  }
  const fromOwn = (x-ownLine(team))*dirOf(team);
  if (fromOwn < 75 || rnd() < 0.6) return penChoice(team, x, y, 'touch');
  return penChoice(team, x, y, 'tap');
}
function penChoice(team, x, y, c, g) {
  M.phase = 'play';
  if (c === 'goal') goalKick(team, penSpot(team, x), y, 'penalty', g);
  else if (c === 'touch') {
    const nx = clamp(x + dirOf(team)*(20 + M.nat[team].kicking*3), 15, 105);
    sfx('kick');
    lineout(team, nx, y, 'Kick to Touch');   // after the hooter too: the kicking side gets its lineout
  } else startSet({ kind:'tap', team, x, y, t:0.8, snap:true, label:'Tap and Go', then:s => releaseTo(s.team, s.x, s.y, 'tap') });
}
function scoreTry(p) {
  if (practice) { practiceTry(p); return; }
  const team = p.team;
  M.score[team] += 5; M.tries[team]++;
  if (M.career) careerDeed('tries', p);                    // a career match: a try by your player
  heat(team, 'try'); fireOut(1 - team);                    // a try lights the scorers and puts the other side out
  goldenScored();
  placeBall(clamp(p.x,0,120), clamp(p.y,0,70));
  p.vx *= 0.3; p.vy *= 0.3;
  say(M.golden ? 'Golden Try' : 'Try', 'big', team); sfx('whistle'); sfx('roar'); buzz(60);
  startSet({ kind:'try', team, x:p.x, y:clamp(p.y,1,69), t:1.9, then:s => M.golden ? endHalf() : conversion(s.team, s.y) });   // a Golden Try needs no conversion
}
function conversion(team, y) {
  const yy = clamp(y, 4, 66);
  goalKick(team, oppLine(team) - dirOf(team)*(11 + Math.abs(yy-35)*0.2), yy, 'conversion');
}
function goalKick(team, x, y, kind, g0) {
  placeBall(x, y);
  const d = dirOf(team);
  const k = (M.career && careerKicker(team)) || nearestFree(team, x, y) || M.players.find(p => p.team === team);   // a career match: your player takes your side's goal kicks
  k.x = x - d*2.2; k.y = y; k.vx = k.vy = 0; k.fx = d; k.fy = 0;
  for (const p of M.players) if (p !== k && hyp(p.x-x, p.y-y) < 5) { p.x -= d*6; }
  const g = g0 || makeGoal(team, x, y, kind, k);
  g.kicker = k;
  M.goal = g; M.stats.gk.att[team]++;
  if (kind === 'conversion') M.stats.conv.att[team]++; else if (kind === 'penalty') M.stats.pen.att[team]++;
  if (isHuman(team)) { g.inp = inputOf(team); startGoalCut(g); return; }
  strikeGoal(g, g.cpu.m, g.cpu.aim);                 // fixed now, so skipping the close-up can't change it
  if (interactive()) { g.watch = true; g.stage = 'settle'; startGoalCut(g); return; }
  M.phase = 'goal'; g.stage = 'fly'; g.t = 0;
  sfx('kick');
}
/* The instant flight: headless, AI v AI and the menu demo. The top-down ball follows the same closed form. */
function updateGoal(dt) {
  const g = M.goal, b = M.ball, X = g.X;
  g.t += dt;
  const end = X.land ? X.t : X.t + 0.4;
  const tt = !g.judged && g.t >= X.t ? X.t : Math.min(g.t, end);
  const p = posAt(g.L, tt), w = toWorld(g.team, p.x, p.y), v = frameVec(g.team, velAt(g.L, tt));
  b.x = w.x; b.y = w.y; b.z = Math.max(0, p.h); b.vx = v.x; b.vy = v.y;
  if (!g.judged && g.t >= X.t) scoreGoal(g);
  else if (g.t >= end) settleGoal(g);
}

/* ---------- the kick frame ----------
   Every kick at goal is computed as if the kicker attacks +x at posts on
   x = 110, uprights at y = 32.2 and 37.8. Team 1 is mirrored into it, so the
   CPU shares the code path, and left and right are always the kicker's. */
const toFrame = (team, x, y) => team ? { x:120 - x, y:70 - y } : { x, y };
const toWorld = toFrame;                                   // its own inverse
const frameVec = (team, v) => team ? { x:-v.x, y:-v.y } : v;
function makeWind() {
  const w = KICK.wind, r = rnd();
  let acc = 0, i = 0;
  while (i < w.mix.length - 1 && r >= (acc += w.mix[i][0])) i++;
  const [, lo, hi] = w.mix[i];
  const mph = lo + rnd()*(hi - lo);
  return { a:rnd()*2*Math.PI, mph };                       // a: the world direction it blows toward
}
function kickWind(team) {                                  // drawn once per kick: what you read is what the ball gets
  const w = KICK.wind, mw = M.wind;
  const mph = clamp(mw.mph*(1 + w.gust*gauss()), 0, w.max), a = mw.a + w.swing*D2R*gauss();
  if (mph < w.calm) return { x:0, y:0, mph:0 };
  const v = frameVec(team, { x:mph*MPH*Math.cos(a), y:mph*MPH*Math.sin(a) });
  return { x:v.x, y:v.y, mph };
}
function windNow(team) {                                   // the match wind as it stands, ungusted and in the frame: what the drop label and the CPU's trigger read, with no random draw
  const mw = M.wind;
  if (mw.mph < KICK.wind.calm) return CALM;
  const v = frameVec(team, { x:mw.mph*MPH*Math.cos(mw.a), y:mw.mph*MPH*Math.sin(mw.a) });
  return { x:v.x, y:v.y, mph:mw.mph };
}
function goalOf(team, wx, wy, kind, kicker, W) {          // a kick's geometry and band in the given wind, drawing nothing random
  const f = toFrame(team, wx, wy);
  const g = { team, kind, type:kind === 'drop' ? 'drop' : 'set', wx, wy, x:f.x, y:f.y, beta:Math.atan2(35 - f.y, 110 - f.x), dist:hyp(110 - f.x, 35 - f.y), ang:Math.abs(f.y - 35)/35,
    kicking:(M.career ? careerGoalNat(team, kicker, kind) : M.nat[team]).kicking, di:isHuman(team) ? levelOf(team) : 1, kicker, W:{ x:W.x, y:W.y, mph:W.mph },
    mClear:0, lo:0, hi:0, w:0, ctr:0, fill:1, aid:'line', watch:false, cpu:null, inp:null,   // inp: the kicker's input slot, for a human's kick
    stage:'aim', st:0, aim:0, m:0, pt:0, drain:0, mRel:null, L:null, X:null, res:null, ok:false, grade:null, curl:0,
    tStrike:0, judged:false, skipped:false, t:0, cam:null, pathKey:null, pathPts:null, bot:null,
    rush:null, out:null, outQ:null, started:false, tRel:0, hitT:0, tauStop:0 };   // drop goals: the chargers, and how one ended
  return bandOf(g);
}
function makeGoal(team, wx, wy, kind, kicker) {
  const g = goalOf(team, wx, wy, kind, kicker, kickWind(team));
  if (!isHuman(team)) g.cpu = cpuKickInputs(g);
  else {
    g.aid = (levelOf(team) === 0 || (M.two ? sideOf(team).kickFirst : !tutSeen(kind === 'drop' ? 'drop' : 'goal'))) ? 'path' : 'line';   // the first kick ever (the tutorial's goal or drop moment unseen) gets the Easy aids; in two player each player's first kick of the match does
    if (g.aid === 'path') { g.aim = aimFor(g, g.ctr); bandOf(g, g.aim); g.aim = aimFor(g, g.ctr); }   // a wide kick aimed off is a longer kick
  }
  return g;
}
/* dv/dt = A - kd v integrates exactly: no integrator, no frame-rate dependence. */
function posAt(L, t) {
  const k = KICK.kd, e = Math.exp(-k*t), f = (1 - e)/k, A = L.A, v = L.v0, p = L.p0;
  return { x:p.x + A.x/k*t + (v.x - A.x/k)*f, y:p.y + A.y/k*t + (v.y - A.y/k)*f, h:p.h + A.h/k*t + (v.h - A.h/k)*f };
}
function velAt(L, t) {
  const k = KICK.kd, e = Math.exp(-k*t), A = L.A, v = L.v0;
  return { x:A.x/k + (v.x - A.x/k)*e, y:A.y/k + (v.y - A.y/k)*e, h:A.h/k + (v.h - A.h/k)*e };
}
function launchOf(g, m, aim, curl) {
  const k = KICK, V = (k.v0 + k.vK*g.kicking)*(k.vLo + (1 - k.vLo)*m), th = k.elev[g.type]*D2R;
  const psi = clamp(g.beta + clamp(aim, -k.aimMax*D2R, k.aimMax*D2R), -85*D2R, 85*D2R);
  const c = curl == null ? curlOf(g, m) : curl, rx = -Math.sin(psi), ry = Math.cos(psi);
  return { p0:{ x:g.x, y:g.y, h:k.h0 }, v0:{ x:V*Math.cos(th)*Math.cos(psi), y:V*Math.cos(th)*Math.sin(psi), h:V*Math.sin(th) },
    A:{ x:k.kw*g.W.x + c*rx, y:k.kw*g.W.y + c*ry, h:-k.g } };
}
function bisectT(L, a, b, hit) { for (let i = 0; i < 30; i++) { const m = (a + b)/2; if (hit(posAt(L, m))) b = m; else a = m; } return b; }
const hitLine = p => p.x >= 110, hitGround = p => p.h <= 0;
function crossOf(L) {                                      // where the ball crosses the goal line, or lands first
  const dt = 0.02;
  let t0 = 0;
  for (let t = dt; t < 8; t += dt) {
    const p = posAt(L, t), tx = p.x >= 110 ? bisectT(L, t0, t, hitLine) : 9, tl = p.h <= 0 ? bisectT(L, t0, t, hitGround) : 9;
    if (tx < 9 || tl < 9) { const land = tl <= tx, tc = land ? tl : tx, q = posAt(L, tc); return { t:tc, x:q.x, y:q.y, h:Math.max(0, q.h), land }; }
    t0 = t;
  }
  const q = posAt(L, 8); return { t:8, x:q.x, y:q.y, h:0, land:true };
}
/* From the kicker's view. R is the ball's allowance around each upright. */
function judgeCross(X) {
  const { R, bar, upL, upR, upH } = KICK, y = X.y, h = X.h;
  if (X.land) return 'short';
  if (h > upH) return (y > upL && y < upR) ? 'goal' : (y <= upL ? 'wideL' : 'wideR');
  if (Math.abs(y - upL) <= R || Math.abs(y - upR) <= R) return (h >= bar && y > upL && y < upR) ? 'postIn' : 'post';   // a hit below the bar can't score
  if (y < upL) return 'wideL';
  if (y > upR) return 'wideR';
  if (h >= bar + R) return 'goal';
  if (h >= bar) return 'barIn';
  if (h >= bar - R) return 'bar';
  return 'short';
}
const scores = r => r === 'goal' || r === 'postIn' || r === 'barIn';
function curlOf(g, m) {
  const rho = 1 - KICK.curlK*(g.kicking - 3);
  return m > g.hi ? -KICK.hook*rho*(m - g.hi)/0.1 : m < g.lo ? KICK.push*rho*(g.lo - m)/0.1 : 0;   // over hooks left, under fades right
}
function clearPower(g, aim) {                              // the lowest m whose curl-free flight at this aim clears the bar by 0.3m
  aim = aim || 0;
  const ok = m => { const X = crossOf(launchOf(g, m, aim, 0)); return !X.land && X.h >= KICK.bar + KICK.clear; };
  if (!ok(1)) return 1.05;
  let a = 0, b = 1;
  for (let i = 0; i < 22; i++) { const m = (a + b)/2; if (ok(m)) b = m; else a = m; }
  return b;
}
function aimFor(g, m) {                                    // the aim that sends a curl-free strike at m through y = 35 in this wind
  let a = -0.6, b = 0.6;
  for (let i = 0; i < 30; i++) { const mid = (a + b)/2; if (crossOf(launchOf(g, m, mid, 0)).y < 35) a = mid; else b = mid; }
  return (a + b)/2;
}
function bandOf(g, aim) {                                  // at aim 0, except the Easy path's band, which is honest for the arrow it hands you
  const k = KICK, di = g.di, kk = g.kicking - 3;
  const w0 = clamp(k.band[di] - k.bandD*(g.dist - 12) - k.bandA*g.ang + k.bandK*kk, k.bandMin + k.minK*kk, k.bandMax);
  g.w = g.type === 'drop' ? w0*k.dropBand : w0;
  g.mClear = clearPower(g, aim);
  g.ctr = Math.min(Math.max(g.mClear + k.lift + k.liftW*g.w, k.floor), k.ceil);   // the floor makes short kicks fly like real ones
  g.lo = g.ctr - g.w/2; g.hi = g.ctr + g.w/2;
  g.fill = (g.type === 'drop' ? k.dropFill : k.fill)[di]/(1 + (g.dist - 12)*k.fillD);
  if (M && M.kids && isHuman(g.team)) kidsBand(g);        // Kids: a wider band and a slower meter
  return g;
}
function strikeGoal(g, m, aim) {                           // draws no random numbers: the result is known at the release
  g.m = m; g.aim = aim; g.curl = curlOf(g, m);
  g.L = launchOf(g, m, aim, g.curl);
  g.X = crossOf(g.L);
  g.res = judgeCross(g.X);
  g.ok = scores(g.res);
  g.grade = gradeOf(g);
  return g;
}
function gradeOf(g) {
  if (g.ok) return g.res === 'postIn' ? 'Off the Post' : g.res === 'barIn' ? 'Off the Bar' : (g.m >= g.lo && g.m <= g.hi ? 'Pure Strike' : null);
  if (g.m > g.hi) return 'Overcooked';
  if (g.m < g.lo) return 'Under-Hit';
  if (scores(judgeCross(crossOf(launchOf({ ...g, W:{ x:0, y:0, mph:0 } }, g.m, g.aim, g.curl))))) return 'Wind';   // would have scored in still air
  return 'Pure Strike';
}
function verdictOf(g) {
  if (g.ok) return g.kind === 'conversion' ? 'Converted' : g.kind === 'penalty' ? 'Penalty Goal' : 'Drop Goal';
  return { wideL:'Wide Left', wideR:'Wide Right', short:'Short', post:'Off the Post', bar:'Off the Bar' }[g.res];
}
function cpuKickInputs(g) {                                // the CPU allows for about 90% of the wind, with some spread
  const k = KICK, di = cpuSide(g.team) ? levelOf(g.team) : 1;   // a CPU kicker's spread is its level's
  const aim = aimFor(g, g.ctr)*(k.cpuAim[0] + k.cpuAim[1]*gauss()) + k.cpuAimSd*D2R*gauss();
  const m = clamp(g.ctr + k.cpuSig[di]*gauss()/g.fill, 0, 1);
  return { m, aim };
}
function scoreGoal(g) {                                    // the verdict moment: points, banner, sound
  if (g.judged) return;
  g.judged = true;
  const { team, ok, kind } = g;
  if (ok) {
    M.score[team] += kind === 'conversion' ? 2 : 3; (kind === 'drop' ? M.stats.dg : M.stats.gk).made[team]++;
    if (kind === 'conversion') M.stats.conv.made[team]++; else if (kind === 'penalty') M.stats.pen.made[team]++;
    if (M.career) careerDeed('goals', g.kicker);            // a career match: a goal kicked by your player
    goldenScored();
  }
  say(verdictOf(g), '', ok ? team : null, g.grade, M.cut && M.cut.kind === 'goal' && verdictLow(g));
  if (g.res === 'post' || g.res === 'postIn' || g.res === 'bar' || g.res === 'barIn') { sfx('post'); buzz(40); }
  sfx(ok ? 'cheer' : 'groan');
  if (ok && kind === 'drop') sfx('roar');
}
function verdictLow(g) {                                   // the banner goes under the bar when the ball is up at the posts at the verdict, and up top when it has dropped short
  const cam = kickCam(g), p = ballAt(g, g.X.t);
  return kickView(g, cam, g.X.t, p.x, p.y, p.h).sy < 0.55*V.H;
}
function settleGoal(g) {
  if (practice && practiceGoal(g)) return;
  const w = toWorld(g.team, g.X.x, g.X.y), x = clamp(w.x, 0, 120), y = clamp(w.y, 0, 70);
  placeBall(x, y);
  const { team, ok, kind } = g;
  startSet({ kind:'score', team, x, y, t:M.phase === 'goal' ? 1.0 : 0.6, then:() => deadBall(() => (kind === 'penalty' && !ok) ? dropOut(1-team) : kickoff(1-team)) });
}
/* ---------- the close-up ---------- */
function startGoalCut(g) {
  for (const inp of humanSlots()) { inp.pre = null; inp.reanchor(); inp.held = new Set(inp.keys); }   // every human slot: touch re-centred, a pad stick latched, held keys ignored
  startCut({ kind:'goal', g, inp:g.inp, armA:null, skipAt:1e9 });   // c.inp: the kicker's slot, the only one that acts (null for a CPU kick)
  sfx('whoosh');
}
function updateGoalCut(c, dt) {
  const g = c.g, t = c.t;
  g.t = t;
  if (t < CUT_IN) { for (const inp of humanSlots()) inp.reanchor(); return; }
  if (g.watch) return watchStep(c, dt);
  const inp = c.inp;
  if (c.armA == null) c.armA = !inp.aDown;                 // a finger already down must lift first
  if (!inp.aDown) c.armA = true;
  if (g.type === 'drop') return dropStep(c, dt);
  if (g.stage === 'aim') {
    if (g.drain > 0) { g.drain = Math.max(0, g.drain - dt); g.m = g.mRel*g.drain/0.2; }
    steerAim(g, dt, inp);
    if (inp.aPressed && c.armA) { g.stage = 'power'; g.pt = 0; g.m = 0; g.drain = 0; g.mRel = null; }
  } else if (g.stage === 'power') {
    g.pt += dt; g.m = Math.min(1, g.pt/g.fill);
    if (inp.aCancel || (!inp.aDown && g.m < KICK.tap)) backToAim(g);
    else if (!inp.aDown) { strikeGoal(g, kidsStrike(g, g.m), g.aim); g.mRel = g.m; g.stage = 'runup'; g.st = 0; }
  } else if (g.stage === 'runup') {
    if ((g.st += dt) >= KICK.runup) strikeNow(c);
  } else if (g.stage === 'flight' && !g.judged && t - g.tStrike - KICK.hitStop >= g.X.t) verdict(c, 1.5);
}
function strikeNow(c) {                                    // the boot meets the ball. In two player a player's first strike of the match ends his first-kick aid (one player's is the tutorial's memory, marked at the cut-in)
  const g = c.g; g.stage = 'flight'; g.tStrike = c.t; sfx('strike'); buzz(25);
  if (g.watch || !isHuman(g.team)) return;
  if (M.two) sideOf(g.team).kickFirst = false;
}
function watchStep(c, dt) {                                // the CPU's kick: settle, run-up, flight; Skip jumps to the verdict
  const g = c.g, t = c.t;
  if (t >= 0.3 && !g.judged && humanSlots().some(i => i.aPressed || i.bPressed)) {   // Skip, from any seat
    g.skipped = true; g.stage = 'flight'; g.tStrike = t - KICK.hitStop - g.X.t;   // the ball is drawn at the crossing
    verdict(c, 0.6);
    return;
  }
  if (g.stage === 'settle') { if (t >= CUT_IN + 0.6) { g.stage = 'runup'; g.st = 0; } }
  else if (g.stage === 'runup') { if ((g.st += dt) >= KICK.runup) strikeNow(c); }
  else if (g.stage === 'flight' && !g.judged && t - g.tStrike - KICK.hitStop >= g.X.t) verdict(c, 1.5);
}
function steerAim(g, dt, inp) {
  if (M.kids && isHuman(g.team)) return;                   // Kids: the aim the path shows is set for you
  const k = KICK;
  const jx = inp.jx, kx = inp.keyX();                      // the d-pad aims at the keyboard's rate too
  const rate = jx ? k.aimRate*Math.sign(jx)*Math.pow(Math.abs(jx), 1.6) : k.keyRate*kx;
  if (!rate) return;
  const lim = 85*D2R;
  g.aim = clamp(clamp(g.aim + rate*D2R*dt, -k.aimMax*D2R, k.aimMax*D2R), -lim - g.beta, lim - g.beta);
}
function backToAim(g) { g.stage = 'aim'; g.mRel = g.m; g.drain = 0.2; g.pt = 0; }   // the meter drains over 0.2s
function verdict(c, hold) { const g = c.g; scoreGoal(g); c.skipAt = c.t + 0.25; finishCut(() => g.type === 'drop' ? applyDrop(c) : settleGoal(g), hold); }
function goalResume(c) {                                   // back to Aim with the meter empty; a fresh press is needed. A drop goes back to Wait, with the chargers where the cut began
  const g = c.g;
  if (g.type === 'drop') { if (!g.out && (g.stage === 'hold' || g.stage === 'wait')) { g.stage = 'wait'; g.m = 0; g.pt = 0; g.started = true; c.t = CUT_IN; } }
  else if (!g.watch && (g.stage === 'aim' || g.stage === 'power')) { g.stage = 'aim'; g.m = 0; g.pt = 0; g.drain = 0; g.mRel = null; }
  c.armA = false;
  for (const inp of humanSlots()) { inp.aDown = inp.bDown = false; inp.reanchor(); inp.held = new Set(); }
}
function goalLabels(c) {
  const g = c.g;
  if (g.watch) return ['Skip', null, false, false];
  if (g.type === 'drop') return [null, 'Kick', false, g.stage === 'wait' && !c.after && !g.out];
  return ['Kick', null, g.stage === 'aim' && !c.after, false];
}
function dropGoal(team, quiet) {                           // quiet: the close-up has already shown the verdict and added the points
  if (!quiet) { M.score[team] += 3; say('Drop Goal', 'big', team); sfx('roar'); goldenScored(); }
  placeBall(M.ball.x, M.ball.y);
  startSet({ kind:'score', team, x:M.ball.x, y:M.ball.y, t:quiet ? 0.6 : 1.6, then:() => deadBall(() => kickoff(1-team)) });
}

/* ---------- drop goals ----------
   In range, the small button reads Drop Goal: a tap is still a chip, a 0.20s
   hold freezes play and cuts to the goal-kick shot with the thumb still down.
   The meter fills while B is held, the stick steers, and the nearest three
   defenders charge at the lens. The label is geometry alone (2026-10-17): the
   kick is offered whenever it is viable, in range (a calm pure strike reaches
   the bar) and at a bearing that can go between the posts, judged on the world
   as the hold will leave it, whatever the chargers are doing. They still run
   at him in the close-up, and one rule, blockedBy, decides whether the kick
   gets away: pressure is the risk he takes. What the label says at the press
   is what the press gives: a Drop Goal press opens the close-up at 0.20s
   whatever has moved since, and a Kick press stays a kick. The CPU's own drop
   decisions (cpuDropOffer) still weigh the chargers, in the top-down view. */
const DZ_ON = { ok:true }, DZ_OFF = { ok:false };
const holdSteps = () => Math.ceil(KICK.hold/STEP - 1e-9);     // the B press opens the cut on this step, the press step counted as the first: the one count the trigger and the label's projection share
const holdLead = () => (holdSteps() - 1)*STEP;               // how long the world runs between the B press and the freeze: the step that opens the cut does not move it
function dropZone(c) {                                     // is this carrier offered a drop goal right now? Rules 1 and 3 where he stands; range and bearing where the hold will leave him
  const t = c.team, inp = inputOf(t), b = M.ball, k = KICK;
  const off = () => { M.dropOn[t] = false; return DZ_OFF; };
  if (!inp || c !== ctrlOf(t) || b.state !== 'held' || b.carrier !== c || M.phase !== 'play' || M.cut || c.hold < 0.3 || c.bind) return off();
  const j = frameVec(t, inp.world());
  if (Math.abs(j.y) > 0.55 || j.x < -0.3) return off();   // pointing at touch, or back: the button is today's kick
  const proj = projectHold(c, holdLead()), f = toFrame(t, proj.x, proj.y), D = hyp(110 - f.x, 35 - f.y);
  if (f.x < 70 || f.x > 104 || D > 42 || Math.abs(Math.atan2(35 - f.y, 110 - f.x)) > 40*D2R) return off();
  const g = goalOf(t, proj.x, proj.y, 'drop', c, CALM);
  const on = g.mClear <= k.range;                          // in range: a calm pure strike reaches the bar
  if (on) M.dropSeen[t] = new Set(rushersOf(c, g, proj).map(r => r.q));   // the chargers as the hold will leave them: the cut takes the ones behind him from this set, not from where the hold really left them
  M.dropOn[t] = on;
  return on ? DZ_ON : DZ_OFF;
}
// at the B press the label decides: if it read Drop Goal on the last frame, a thumb leaving the stick on this one doesn't take it away. The
// cut then judges the chargers that label saw, so a chaser who crosses into the shoulder radius during the hold stays out of it
function dropPress(c) {
  const t = c.team, on = M.dropOn[t] || dropZone(c).ok;
  M.dropSet[t] = on ? M.dropSeen[t] : null;
  return on;
}
function kickLabel(t) {                                    // the small button with the ball in hand, for the human on side t: what this press will do. Through a hold it stays what the press promised
  const c = ctrlOf(t);
  if (!c) return 'Kick';
  if (sideOf(t).charging && M.ball.carrier === c) return M.dropArmed[t] ? 'Drop Goal' : 'Kick';
  return dropZone(c).ok ? 'Drop Goal' : 'Kick';
}
// the world `lead` seconds on, run the way the hold will run it: the real step for everyone (the kicker on his stick, a CPU kicker checking
// his run as the wind-up does, the AI's chasers and the defensive line as computeTargets drives them, collisions included), then everyone put back.
// Nothing random is drawn. Returns the kick spot and every standing opponent's projected spot and velocity, all in the world.
const HOLD_KEYS = ['x', 'y', 'vx', 'vy', 'fx', 'fy', 'down', 'tcd', 'side', 'hold', 'boost', 'offside', 'sprint', 'stumble', 'wf', 'bite'];   // what moveAll touches
function projectHold(c, lead) {
  const t = c.team, n = Math.max(0, Math.round(lead/STEP)), dt = n ? lead/n : 0, P = M.players;
  const saved = P.map(p => HOLD_KEYS.map(k => p[k])), steps0 = M.stats.steps, drop0 = c.drop;
  if (!isHuman(t) && !c.drop) c.drop = { t:1e9, g:null };   // a CPU kicker brakes through the wind-up, and never strikes inside the projection
  for (let i = 0; i < n; i++) moveAll(dt);
  const out = { x:c.x, y:c.y, vx:c.vx, vy:c.vy, opps:P.filter(q => q.team !== t && q.down <= 0).map(q => ({ q, x:q.x, y:q.y, vx:q.vx, vy:q.vy })) };
  P.forEach((p, i) => HOLD_KEYS.forEach((k, j) => { p[k] = saved[i][j]; }));
  M.stats.steps = steps0; c.drop = drop0;
  return out;
}
// the chargers: every standing opponent within 15m of the kick spot ahead of it or level, and behind it only within the shoulder radius (a man on the
// kicker's shoulder counts, a chaser deeper behind him does not, at the label and in the cut alike), the nearest three. Each is frozen where `proj` puts
// him (or where he really stands), with his speed toward the kicker and his top speed. g.x/g.y is the kick spot, in the frame.
function rushersOf(c, g, proj, only) {                     // only: behind the kick spot, judge these opponents and no others (the ones the label saw)
  const t = c.team, k = KICK, mul = isHuman(t) ? k.rushMul[levelOf(t)]*(M.kids ? KIDS.kick.rush : 1) : 1, out = [];   // a human's chargers run at the difficulty's pace; a CPU kicker faces real players
  const list = proj ? proj.opps : M.players.filter(q => q.team !== t && q.down <= 0).map(q => ({ q, x:q.x, y:q.y, vx:q.vx, vy:q.vy }));
  for (const o of list) {
    const f = toFrame(t, o.x, o.y), v = frameVec(t, { x:o.vx, y:o.vy });
    const dx = g.x - f.x, dy = g.y - f.y, d0 = hyp(dx, dy);
    if (d0 > (dx > 0 ? k.shoulder : k.rushR)) continue;   // dx > 0: he is behind the kick spot
    if (only && dx > 0 && !only.has(o.q)) continue;        // a chaser who crossed into the shoulder radius during the hold was not in the label's set
    const vmax = maxSpeed(o.q)*mul, ux = d0 > 1e-6 ? dx/d0 : 1, uy = d0 > 1e-6 ? dy/d0 : 0;
    out.push({ q:o.q, x:f.x, y:f.y, ux, uy, d0, v0:clamp(v.x*ux + v.y*uy, 0, vmax), vmax, a:k.rushAcc*vmax/8.35 });
  }
  out.sort((p, q) => p.d0 - q.d0);
  return out.slice(0, 3);
}
function rushRun(r, t) {                                   // metres covered t seconds after the chargers start: v = min(vmax, v0 + a t)
  if (t <= 0) return 0;
  const ta = (r.vmax - r.v0)/r.a;
  return t <= ta ? r.v0*t + 0.5*r.a*t*t : r.v0*ta + 0.5*r.a*ta*ta + r.vmax*(t - ta);
}
function rushAt(r, t) {                                    // where he is, closing straight at the kicker and stopping on him; d is his distance to the kicker
  const d = Math.max(0, r.d0 - rushRun(r, t)), s = r.d0 - d;
  return { x:r.x + r.ux*s, y:r.y + r.uy*s, d };
}
function rushWhen(r, d) {                                  // when he first comes within d of the kicker
  const s = r.d0 - d;
  if (s <= 0) return 0;
  const ta = (r.vmax - r.v0)/r.a, sa = r.v0*ta + 0.5*r.a*ta*ta;
  return s <= sa ? (Math.sqrt(r.v0*r.v0 + 2*r.a*s) - r.v0)/r.a : ta + (s - sa)/r.vmax;
}
// the one charging rule. A charger within 1.0m of the kicker before the strike blocks it (Smothered before the release, Charged Down
// after it); so does the ball passing within 0.9m of a charger, horizontally, while under 2.4m in its first 0.8s. tStrike is on the
// chargers' clock, which starts at the end of the cut-in. Returns null, or the earliest block.
function blockedBy(g, rushers, tStrike) {
  const k = KICK;
  let hit = null;
  for (const r of rushers) if (rushAt(r, tStrike).d <= k.block) { const at = rushWhen(r, k.block); if (!hit || at < hit.t) hit = { q:r.q, t:at, how:at < tStrike - k.dropT ? 'smothered' : 'charged' }; }
  if (hit || !g.L) return hit;
  for (let i = 0; i <= 80; i++) {
    const tau = i*0.01, p = posAt(g.L, tau);
    if (p.h <= 0) break;
    if (p.h > k.reach) continue;
    for (const r of rushers) { const a = rushAt(r, tStrike + tau); if (hyp(p.x - a.x, p.y - a.y) <= k.lat) return { q:r.q, t:tStrike + tau, how:'charged' }; }
  }
  return null;
}
function startDropCut(c) {                                 // the carrier has held B for 0.20s in range: freeze, and cut in with the thumb still down
  const t = c.team, g = makeGoal(t, c.x, c.y, 'drop', c);
  g.inp = inputOf(t);
  g.rush = rushersOf(c, g, null, M.dropSet[t]);           // the chargers as they really stand at the freeze; behind him, only the ones the label saw
  M.dropSet[t] = null;
  g.stage = 'hold';
  M.goal = g; M.stats.dg.att[t]++; M.dropArmed[t] = false;
  startGoalCut(g);
}
function dropStep(c, dt) {
  const g = c.g, k = KICK, t = c.t, inp = inputOf(g.team), tau = t - CUT_IN;   // tau: the chargers' clock
  if (g.out) return;
  if (!g.started) { g.started = true; g.pt = 0; g.m = 0; g.stage = inp.bDown ? 'hold' : 'wait'; }   // the press carries over the cut-in; a thumb that lifted needs a fresh press
  if (g.stage === 'hold' || g.stage === 'wait') {
    for (const r of g.rush) if (rushAt(r, tau).d <= k.block) return dropStop(c, 'smothered', r.q, 0);
    steerAim(g, dt, inp);
    if (g.stage === 'hold') {
      g.pt += dt; g.m = Math.min(1, g.pt/g.fill);
      if (inp.bCancel || (!inp.bDown && g.m < k.tap)) { g.stage = 'wait'; g.m = 0; g.pt = 0; }
      else if (!inp.bDown) { strikeGoal(g, kidsStrike(g, g.m), g.aim); g.mRel = g.m; g.tRel = tau; g.stage = 'drop'; g.st = 0; }
    } else if (inp.bPressed) { g.stage = 'hold'; g.pt = 0; g.m = 0; }
  } else if (g.stage === 'drop') {
    if ((g.st += dt) >= k.dropT) {                         // the half-volley: charging is checked now, with the strike on the chargers' clock
      const hit = blockedBy(g, g.rush, g.tRel + k.dropT);
      if (hit) dropStop(c, 'charged', hit.q, Math.max(0.02, hit.t - g.tRel - k.dropT));
      else strikeNow(c);
    }
  } else if (g.stage === 'flight') {
    const tf = t - g.tStrike - k.hitStop;
    if (g.X.land) { if (tf >= 0.6) finishCut(() => applyDrop(c), 0); }   // short: no banner, and the ball stays live in the air
    else if (!g.judged && tf >= g.X.t) verdict(c, 1.5);
  }
}
function dropStop(c, how, q, hitT) {                       // Smothered before the release, or Charged Down at the strike (hitT: how long the ball flew first)
  const g = c.g;
  g.out = how; g.outQ = q; g.judged = true; g.tauStop = c.t - CUT_IN;
  if (how === 'charged') { g.hitT = hitT; strikeNow(c); M.stats.dg.charged[g.team]++; }
  say(how === 'charged' ? 'Charged Down' : 'Smothered', '', 1 - g.team);
  sfx('tackle'); buzz(30);
  c.skipAt = c.t + 0.25;
  finishCut(() => applyDrop(c), 0.9);
}
// hand the drop back to the match: everyone stands where the freeze left them, except the charger
function applyDrop(c) {
  const g = c.g, team = g.team, kk = g.kicker, q = g.outQ, inp = inputOf(team);
  if (inp) inp.restore();
  if (g.out === 'smothered') { put(q, stopSpot(g, q, 0.5)); q.vx = q.vy = 0; countTk(q.team, true); tackle(kk, q); return; }
  if (g.out === 'charged') { chargeDownBy(kk, q, true, stopSpot(g, q, 1.2)); return; }
  const w = toWorld(team, g.X.x, g.X.y);
  if (g.ok) { placeBall(clamp(w.x, 0, 120), clamp(w.y, 0, 70)); dropGoal(team, true); return; }
  if (g.X.land) { kk.hold = 0; launchG3d(g, kk, Math.min(0.6, g.X.t)); return; }   // the flight the cut left 0.6s into
  if (g.res === 'post' || g.res === 'bar') { looseOffWood(g); return; }
  placeBall(clamp(w.x, 0, 120), clamp(w.y, 0, 70));
  deadBall(() => dropOut(1 - team));                       // wide, or under the bar and dead: their 22
}
function stopSpot(g, q, back) {                            // where the charger who stopped the kick lands: `back` metres from the kick spot on the side he came from, in the world
  const r = g.rush && g.rush.find(r => r.q === q), ux = r ? r.ux : -1, uy = r ? r.uy : 0;
  return toWorld(g.team, g.x - ux*back, g.y - uy*back);
}
function looseOffWood(g) {                                 // a post or bar miss: loose, 1m in front of the goal line, bouncing back into play
  const b = M.ball, X = g.X, w = toWorld(g.team, 109, X.y), v = frameVec(g.team, { x:-4, y:X.y < 35 ? -1 : 1 });
  b.state = 'loose'; b.carrier = null; b.f = null; b.last = g.team; b.kickInfo = { team:g.team, ownHalf:false };   // a kicked ball: no turnover for whoever gathers it
  b.x = w.x; b.y = w.y; b.z = Math.min(X.h, KICK.bar); b.vx = v.x; b.vy = v.y; b.vz = 2;
  M.phase = 'play';
}
// a struck drop flying on in the top-down view, t0 seconds in: the closed form drives the ball, and x1/y1 is where it comes down, so chasers go there
function launchG3d(g, kk, t0) {
  const b = M.ball, team = g.team, d = dirOf(team), X = g.X, w0 = toWorld(team, g.x, g.y), w1 = toWorld(team, X.x, X.y);
  const onside = new Set();
  for (const p of M.players) if (p.team === team && (p.x - w0.x)*d <= 0.5) onside.add(p);
  b.state = 'air'; b.carrier = null; b.last = team; b.kickInfo = { team, ownHalf:false };   // a kicked ball: no turnover for whoever gathers it
  b.f = { kind:'g3d', team, L:g.L, X, t:t0 || 0, T:X.t, x0:w0.x, y0:w0.y, x1:w1.x, y1:w1.y, z0:KICK.h0, z1:0, onside, rolled:new Set(), target:null, drop:true };
  const p = posAt(g.L, Math.min(b.f.t, X.t)), w = toWorld(team, p.x, p.y);
  b.x = w.x; b.y = w.y; b.z = Math.max(0, p.h);
  M.phase = 'play'; clearCharge();
  for (const t of [0, 1]) if (isHuman(t)) setCtrl(t, nearestFree(t, w1.x, w1.y));
}
function updateG3d(dt) {                                   // the g3d ball in the air: the one posts rule at the line, touch, and a catch under 2.7m as for any kick
  const b = M.ball, f = b.f, team = f.team, X = f.X;
  f.t += dt;
  const tt = Math.min(f.t, X.t), p = posAt(f.L, tt), w = toWorld(team, p.x, p.y), v = frameVec(team, velAt(f.L, tt));
  b.x = w.x; b.y = w.y; b.z = Math.max(0, p.h); b.vx = v.x; b.vy = v.y;
  if (f.t >= X.t) {
    if (!X.land) {
      const res = judgeCross(X);
      if (scores(res)) { if (f.drop) M.stats.dg.made[team]++; dropGoal(team); return; }
      if (res === 'post' || res === 'bar') { looseOffWood({ team, X }); sfx('post'); return; }
      placeBall(clamp(b.x, 0, 120), clamp(b.y, 0, 70)); sfx('whistle');
      deadBall(() => dropOut(1 - team));
      return;
    }
    b.state = 'loose'; b.f = null; b.vx = v.x*0.32; b.vy = v.y*0.32; b.vz = 3.2; b.z = 0.01;
    return;
  }
  if (b.y < 0 || b.y > 70) {
    const own22 = team === 0 ? f.x0 <= 32 : f.x0 >= 88;
    placeBall(b.x, clamp(b.y, 0, 70));
    deadBall(() => lineout(1 - team, own22 ? b.x : f.x0, b.y, own22 ? 'Into Touch' : 'Out on the Full'));
    return;
  }
  if (f.t/X.t > 0.45 && b.z < 2.7) {
    let best = null, bd = 1.6;
    for (const q of M.players) {
      if (q.down > 0 || (q.team === team && !f.onside.has(q))) continue;
      const dd = hyp(q.x - b.x, q.y - b.y); if (dd < bd) { bd = dd; best = q; }
    }
    if (best) catchBall(best, 'kick');
  }
}
/* The CPU's drop: offered by the same charging rule from his side on the clock his strike keeps, then a 0.25s wind-up in the open (a
   tackle in that time is a normal tackle), the strike checked against every opponent where he really stands, and a g3d flight with no
   close-up. The offer projects the world through the wind-up and gives your players KICK.cpuReact to react, so a man closing on him can block it. */
function cpuDropOffer(p) {
  const proj = projectHold(p, KICK.dropT), g = goalOf(p.team, proj.x, proj.y, 'drop', p, windNow(p.team));
  return g.mClear <= KICK.range && !blockedBy({ L:launchOf(g, g.ctr, 0, 0) }, rushersOf(p, g, proj), KICK.cpuReact);
}
function cpuDrop(p) {
  const g = makeGoal(p.team, p.x, p.y, 'drop', p);        // his inputs are drawn now: nothing random happens at the strike
  p.drop = { t:KICK.dropT, g };
  M.stats.drops++; M.stats.dg.att[p.team]++;
}
function cpuDropStrike(p) {
  const g0 = p.drop.g, g = goalOf(p.team, p.x, p.y, 'drop', p, g0.W);   // struck from where the wind-up leaves him, with the inputs drawn at the decision
  g.cpu = g0.cpu; p.drop = null;
  strikeGoal(g, g.cpu.m, g.cpu.aim);
  g.rush = rushersOf(p, g, null);                          // every opponent where he really stands, your controlled player included
  const hit = blockedBy(g, g.rush, 0);
  if (hit) { M.stats.dg.charged[p.team]++; chargeDownBy(p, hit.q, false, stopSpot(g, hit.q, 1.2)); return; }
  p.hold = 0;
  launchG3d(g, p, 0);
  sfx('kick');
}
// canonical positions for the tests and the console: a carrier of `team` at a frame spot, holding the ball with the stick forward, and
// opponents at frame positions (with frame velocities) as chargers; everyone else well away. Returns the carrier.
function stageDrop(spot, chargers, team) {
  team = team || 0; chargers = chargers || [];
  const P = M.players, b = M.ball, d = dirOf(team), w = toWorld(team, spot.x, spot.y);
  const own = P.filter(p => p.team === team), opp = P.filter(p => p.team !== team);
  M.phase = 'play'; M.set = null; M.cut = null; M.clock = 30; M.dclock = 100; M.hooter = false; clearCharge(); M.phaseCount = 2;
  M.dropOn = [false, false]; M.dropArmed = [false, false]; M.dropSeen = [null, null]; M.dropSet = [null, null];
  for (const p of P) { p.vx = p.vy = 0; p.down = 0; p.tcd = 0; p.side = -1; p.boost = 0; p.hold = 2; p.drop = null; p.quick = false; }
  own.forEach((p, i) => { p.x = clamp(i ? w.x - d*(8 + i) : w.x, 1, 119); p.y = i ? 6 + i*9.5 : w.y; p.fx = d; p.fy = 0; });
  opp.forEach((q, i) => {
    const ch = chargers[i];
    if (ch) { const cw = toWorld(team, ch.x, ch.y), cv = frameVec(team, { x:ch.vx || 0, y:ch.vy || 0 }); q.x = cw.x; q.y = cw.y; q.vx = cv.x; q.vy = cv.y; }
    else { q.x = clamp(w.x + d*(22 + i), 1, 119); q.y = 6 + i*9.5; }
    q.fx = -d; q.fy = 0;
  });
  const c = own[0];
  setCarrier(c); c.hold = 2;
  b.x = c.x + c.fx*0.55; b.y = c.y; b.z = 1;
  setCtrl(team, c); for (const s of M.side) { s.ctrlPrev = s.ctrl; s.ctrlT = 1; }
  const inp = inputOf(team); if (inp) { inp.jx = d; inp.jy = 0; }   // the stick forward, in his own direction
  return c;
}

