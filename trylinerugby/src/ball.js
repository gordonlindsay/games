/* ---------- ball in flight / loose ---------- */
function updateBallAir(dt) {
  const b = M.ball, f = b.f;
  if (f.kind === 'g3d') return updateG3d(dt);
  const px = b.x, py = b.y, pz = b.z;
  f.t += dt;
  const u = Math.min(1, f.t/f.T);
  b.x = f.x0 + (f.x1-f.x0)*u; b.y = f.y0 + (f.y1-f.y0)*u;
  b.z = f.z0 + (f.z1-f.z0)*u + 4*f.H*u*(1-u);
  b.vx = (f.x1-f.x0)/f.T; b.vy = (f.y1-f.y0)/f.T;
  if (f.kind === 'pass') {
    if (!f.sure) for (const q of M.players) {
      if (q.team === f.team || q.down > 0 || f.rolled.has(q)) continue;
      if (f.long && u > 0.18 && u < 0.82) continue;          // the loop is over the men in between; the contest is at the passer and the receiver
      if (hyp(q.x-b.x, q.y-b.y) < 1.1 && b.z < 2.3) {
        f.rolled.add(q);
        const pI = ringed(q) ? 0.4 : (cpuSide(q.team) ? diffOf(q.team).cpuIntercept : M.two ? DIFF[levelOf(f.team)].cpuIntercept : 0.18);   // an AI interceptor in two player reads at the passer's level, as the CPU does against a human
        if (rnd() < pI) { catchBall(q, 'intercept'); return; }
      }
    }
    if (u >= 1) resolvePass();
    return;
  }
  const d = dirOf(f.team);
  if (f.kind === 'kick') {                                 // an ordinary kick through the posts is a drop goal, judged by the one posts rule at the interpolated crossing
    const line = oppLine(f.team);
    if ((px-line)*d < 0 && (b.x-line)*d >= 0) {
      const s = (line - px)/(b.x - px), yc = py + s*(b.y - py), zc = pz + s*(b.z - pz);
      if (scores(judgeCross({ land:false, x:110, y:toFrame(f.team, line, yc).y, h:zc }))) { dropGoal(f.team); return; }
    }
  }
  if (b.y < 0 || b.y > 70) {
    const own22 = f.team === 0 ? f.x0 <= 32 : f.x0 >= 88;
    const lx = (f.kind === 'restart' || own22) ? b.x : f.x0;
    const full = f.kind === 'kick' && !own22;
    placeBall(b.x, clamp(b.y,0,70));
    deadBall(() => lineout(1-f.team, lx, b.y, full ? 'Out on the Full' : 'Into Touch'));
    return;
  }
  if (u > 0.45 && b.z < 2.7) {
    let best = null, bd = 1.6;
    for (const q of M.players) {
      if (q.down > 0 || (q.team === f.team && !f.onside.has(q))) continue;
      const dd = hyp(q.x-b.x, q.y-b.y); if (dd < bd) { bd = dd; best = q; }
    }
    if (best) { catchBall(best, 'kick'); return; }
  }
  if (u >= 1) {
    b.state = 'loose'; b.f = null;
    const roll = f.boot ? 0.32*TRAIT.boot.roll : 0.32;     // a Long Boot's kick runs on (src/traits.js)
    b.vx = (f.x1-f.x0)/f.T*roll; b.vy = (f.y1-f.y0)/f.T*roll; b.vz = 3.2; b.z = 0.01;
    sfx('bounce');
  }
}
function resolvePass() {
  const b = M.ball, f = b.f, tgt = f.target;
  if (f.sure && tgt && tgt.down <= 0 && hyp(tgt.x-b.x, tgt.y-b.y) < 3.5) {
    setCarrier(tgt); sfx('catch');
    if (f.boost) { tgt.fx = dirOf(tgt.team); tgt.fy = 0; setBoost(tgt, ...f.boost); }   // the burst goes upfield, not along his catching angle
    return;
  }
  if (tgt && tgt.down <= 0 && hyp(tgt.x-b.x, tgt.y-b.y) < 2.4) { catchBall(tgt, 'pass'); return; }
  let best = null, bd = 1.8;
  if (!f.sure) for (const q of M.players) { if (q.down > 0) continue; const dd = hyp(q.x-b.x, q.y-b.y); if (dd < bd) { bd = dd; best = q; } }
  if (best) { catchBall(best, best.team === f.team ? 'pass' : 'intercept'); return; }
  b.state = 'loose'; b.vx = (f.x1-f.x0)/f.T*0.25; b.vy = (f.y1-f.y0)/f.T*0.25; b.vz = 1.5; b.z = 0.9; b.f = null;
  say('Dropped', 'small'); sfx('fumble');
}
/* The egg's hop (2026-11-09): one model for Bouncy Egg's ball (src/training.js) and a match's ball spilled in the tackle or knocked on
   (PRESSURE, src/contact.js). H is the hop state ({ g, hops, hopV, spin, rolling }), K the levers (pop, hopOut, keep, turn, slow,
   stop, roll), u (0..1) how much wider the turn gets, and fit(b, vx, vy, air), if given, sets a hop's speeds so it comes down inside
   an area (the drill's box). A kick, a dropped pass, a charge-down and a ball off the posts keep the old bounce below. */
function hopMove(b, H, K, dt) {                            // through the air, then along the ground once its hops are done. True the step it lands
  b.tumble = (b.tumble || 0) + H.spin*dt;
  if (H.rolling) { const f = Math.exp(-K.roll*dt); b.vx *= f; b.vy *= f; b.x += b.vx*dt; b.y += b.vy*dt; b.z = 0; b.vz = 0; H.spin *= f; return false; }
  b.vz -= H.g*dt; b.x += b.vx*dt; b.y += b.vy*dt; b.z += b.vz*dt;
  if (b.z > 0) return false;
  b.z = 0; H.g = 9.8;                                      // whatever it was thrown as, its hops are real ones
  return true;
}
function hopBounce(b, H, K, u, fit) {                      // off the ground again, at an odd angle, each hop smaller than the last. Too small a hop and it rolls (false)
  const first = !H.hops.length;
  const vz = first ? K.pop[0] + rnd()*(K.pop[1] - K.pop[0]) : H.hopV*(K.keep[0] + rnd()*(K.keep[1] - K.keep[0]));
  const sp = first ? K.hopOut[0] + rnd()*(K.hopOut[1] - K.hopOut[0]) : hyp(b.vx, b.vy)*K.slow;
  if (vz < K.stop) { H.rolling = true; b.vz = 0; return false; }
  const dir = Math.atan2(b.vy, b.vx) + (rnd() < 0.5 ? -1 : 1)*(K.turn[0] + rnd()*(K.turn[1] - K.turn[0] + 0.5*u));
  const air = 2*vz/9.8, vx = Math.cos(dir)*sp, vy = Math.sin(dir)*sp;
  if (fit) fit(b, vx, vy, air); else { b.vx = vx; b.vy = vy; }
  b.vz = vz; H.hopV = vz; H.hops.push(vz); H.spin = -H.spin*1.1;
  sfx('bounce', Math.min(1, vz/K.pop[1]));                  // each hop smaller than the last, and softer
  return true;
}
function eggOff(b) { if (b.egg) { b.egg = null; b.tumble = null; } }   // the match's egg is over: gathered or dead (placeBall, setCarrier). The drill never sets b.egg
function updateLoose(dt) {
  const b = M.ball;
  if (b.egg) { const K = PRESSURE.egg; if (hopMove(b, b.egg, K, dt)) hopBounce(b, b.egg, K, K.wild); }   // spilled in the tackle: it hops like Bouncy Egg's ball (PRESSURE, src/contact.js)
  else {                                                   // a kick's run, a dropped pass, a charge-down, off the posts: the old bounce
    const fr = Math.exp(-1.4*dt); b.vx *= fr; b.vy *= fr;
    b.x += b.vx*dt; b.y += b.vy*dt;
    b.vz -= 9.8*dt; b.z += b.vz*dt;
    if (b.z <= 0) {
      b.z = 0;
      if (Math.abs(b.vz) > 1.2) { sfx('bounce', Math.min(1, Math.abs(b.vz)/5)); b.vz = -b.vz*0.45; b.vx += (rnd()-0.5)*2.5; b.vy += (rnd()-0.5)*2.5; } else b.vz = 0;
    }
  }
  if (b.y < 0 || b.y > 70) {
    const ki = b.kickInfo;
    let t = 1-b.last, reason = 'Into Touch';
    if (ki && ki.ownHalf && (ki.team === 0 ? b.x >= 88 : b.x <= 32)) { t = ki.team; reason = '50:22'; }
    const x = b.x, y = b.y;
    placeBall(x, clamp(y,0,70)); sfx('whistle');
    deadBall(() => lineout(t, x, y, reason));
    return;
  }
  if (b.x < 0 || b.x > 120) {
    const defTeam = b.x < 0 ? 0 : 1;
    placeBall(clamp(b.x,0,120), b.y); sfx('whistle');
    deadBall(() => dropOut(defTeam));
    return;
  }
  if (b.z < (b.egg ? PRESSURE.egg.reach : 1.0)) {          // an egg on the hop is gathered only once it is down by the knees
    let best = null, bd = 1.1;
    for (const q of M.players) { if (q.down > 0) continue; const dd = hyp(q.x-b.x, q.y-b.y); if (dd < bd) { bd = dd; best = q; } }
    if (best) { const E = b.egg; pickUp(best); if (E) pressGather(best, E); }
  }
}

