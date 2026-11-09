/* ---------- team shape ---------- */
/* One runner is held on the open shoulder, still behind the ball. The rest of the line stays on the flat shelf.
   The open shoulder is the side the nearest defender up on the ball is not on; head-on, it is the side with more
   room to touch. He slides wider, then a little deeper, while a defender is inside SUPPORT.clear — never forward,
   and never outside the Key Pass box. The stick still picks the man; the ring only shows whether that man is free. */
function supportSlots(fx, fy, d, n, depth, skipNear) {
  const out = [];
  for (const k of [1,-1,2,-2,3,-3,4,-4,5,-5,6,-6,7,-7,8,-8,9,-9]) {
    if (out.length >= n) break;
    if (skipNear && k === skipNear) continue;             // the near slot on the open side: the held runner stands there instead
    const y = fy + k*6.5; if (y < 3 || y > 67) continue;
    out.push({ x:clamp(fx - d*(depth + 1.3*Math.abs(k)), 1, 119), y });
  }
  while (out.length < n) out.push({ x:clamp(fx - d*depth, 1, 119), y:clamp(fy,3,67) });
  return out;
}
function shoulderRoom(fy, sign) { return sign > 0 ? 67 - fy : fy - 3; }
function openShoulder(fx, fy, d, team) {                   // +1 is +y. 0 when neither touch leaves room for a shoulder
  let best = null, bd = 1e9, side = 0;
  for (const q of M.players) {
    if (q.team === team || !onFeet(q) || q.offside > 0) continue;
    const dx = (q.x - fx)*d; if (dx < -2.5) continue;     // behind the ball: not guarding a shoulder
    const dy = q.y - fy, dd = hyp(dx, dy);
    if (dd > 16 || dd >= bd) continue;
    bd = dd; best = q; side = dy;
  }
  let sign = best && Math.abs(side) >= 1.5 ? (side > 0 ? -1 : 1) : ((70 - fy) >= fy ? 1 : -1);
  if (shoulderRoom(fy, sign) < 4.5 && shoulderRoom(fy, -sign) >= 4.5) sign = -sign;
  return shoulderRoom(fy, sign) >= 4.5 ? sign : 0;
}
function shoulderPoint(fx, fy, d, open, team) {            // where the held runner stands: in space, on that shoulder, behind the ball
  if (!open) return null;
  let lat = SUPPORT.lat, back = SUPPORT.back, best = null, bestC = -1;
  for (let i = 0; i < 14; i++) {
    const y = clamp(fy + open*lat, 3, 67), x = clamp(fx - d*back, 1, 119);
    const gotLat = (y - fy)*open, gotBack = (fx - x)*d;
    if (gotLat < 4 || gotBack < 1) break;                 // a clamp that pulled him off the shoulder, or in front of the ball
    let clear = 99;
    for (const q of M.players) if (q.team !== team && onFeet(q)) clear = Math.min(clear, hyp(q.x - x, q.y - y));
    if (clear > bestC) { bestC = clear; best = { x, y, lat:gotLat, back:gotBack }; }
    if (clear >= SUPPORT.clear) return best;
    if (lat < SUPPORT.latMax - 0.01) lat = Math.min(SUPPORT.latMax, lat + 1.2);
    else if (back < SUPPORT.backMax - 0.01) back = Math.min(SUPPORT.backMax, back + 0.6);
    else break;
  }
  return best;
}
function holdShoulder(A, fx, fy, d, team) {                // the attacker already in that channel, held on the point. Null keeps the flat shelf
  const open = openShoulder(fx, fy, d, team), pt = shoulderPoint(fx, fy, d, open, team);
  if (!pt || !A.length) return null;
  let holder = null, by = 1e9, bx = 1e9;
  for (const p of A) {
    const dy = Math.abs(p.y - pt.y), dx = Math.abs(p.x - pt.x);
    if (dy < by - 1e-6 || (Math.abs(dy - by) <= 1e-6 && dx < bx)) { by = dy; bx = dx; holder = p; }
  }
  return holder ? { holder, at:pt, skip:open } : null;
}
function assignByY(T, arr, slots, lx = 0) {              // lx: an upfield lead on every slot (the line running on while a pass is in the air)
  const a = arr.slice().sort((p,q) => p.y-q.y), s = slots.slice().sort((p,q) => p.y-q.y);
  a.forEach((p,i) => { const t = s[i] || s[s.length-1]; if (t) T.set(p, { x:clamp(t.x + lx, 1, 119), y:t.y, s:maxSpeed(p) }); });
}
/* A line break: the men still goal-side come up instead of holding the sweeper's depth.
   Easy commits only when he is the last man, and slower, so a break near the line can still be finished.
   Normal and Hard bring the last two. The angle is onto the inside shoulder, which turns the run toward touch. */
const COVER = { last:[1, 2, 2], speed:[0.90, 0.98, 1], acc:[12, 15, 18], inside:[2.2, 2.8, 3.2], ahead:[0.6, 1.0, 1.4] };
function commitPoint(p, carrier, lv, dA) {
  const room = Math.min(carrier.y, 70 - carrier.y);
  const drifting = Math.abs(carrier.y - 35) < 4;
  const inside = drifting ? (Math.abs(carrier.vy) > 0.4 ? (carrier.vy > 0 ? -1 : 1) : (p.y >= carrier.y ? 1 : -1)) : (carrier.y < 35 ? 1 : -1);
  const gap = dist(p, carrier);
  const depth = (p.x - carrier.x) * dA;                         // goal-side of the carrier is positive
  const wide = room < 6 ? 0.35 : clamp(room / 14, 0.45, 1);     // already near touch: shut the short side rather than overshoot it
  const shade = COVER.inside[lv] * wide * clamp((gap - 1.6) / 8, 0, 1);   // the angle is for the run in; the last metres are at the man
  // Close, or he has stepped level: go at the body. A point ahead of the carrier is how he runs past the tackle.
  if (gap < 4.2 || depth < 2.2) return { x:clamp(carrier.x, 1, 119), y:clamp(carrier.y + inside * shade, 2, 68) };
  // Still in front: the earliest spot on the carrier's line he can reach, a touch goal-side so he arrives in the tackle and not a stride late.
  const sp = Math.max(0.5, maxSpeed(p) * COVER.speed[lv]);
  let t = gap / sp;
  for (let i = 0; i < 5; i++) {
    const tx = carrier.x + carrier.vx * t + dA * COVER.ahead[lv], ty = carrier.y + carrier.vy * t + inside * shade;
    t = clamp(hyp(tx - p.x, ty - p.y) / sp, 0.08, 3.2);
  }
  return {
    x: clamp(carrier.x + carrier.vx * t + dA * COVER.ahead[lv], 1, 119),
    y: clamp(carrier.y + carrier.vy * t + inside * shade, 2, 68),
  };
}
function assignMarks(T, D, pts, dA, fx, fy, lineX, mode, sweep) {
  if (!D.length) return;
  let rest = D.slice();
  if (sweep !== false && rest.length >= 4) {
    const own = dA > 0 ? 110 : 10;
    let fbx = fx + dA*(mode === 'kick' ? 10 : 18);
    fbx = dA > 0 ? Math.min(fbx, own+3) : Math.max(fbx, own-3);
    const fby = 35 + (fy-35)*0.5;
    const fb = nearestOf(rest, fbx, fby);
    T.set(fb, { x:clamp(fbx,1,119), y:fby, s:maxSpeed(fb)*0.85 });
    rest = rest.filter(p => p !== fb);
  }
  const ps = pts.slice().sort((a,b) => hyp(a.x-fx, a.y-fy) - hyp(b.x-fx, b.y-fy)).slice(0, rest.length);
  for (const off of [7,-7,14,-14,21,-21,28,-28,35,-35]) {
    if (ps.length >= rest.length) break;
    const y = fy + off; if (y >= 3 && y <= 67) ps.push({ x:fx, y });
  }
  while (ps.length < rest.length) ps.push({ x:fx, y:clamp(fy,3,67) });
  ps.sort((a,b) => a.y-b.y); rest.sort((a,b) => a.y-b.y);
  rest.forEach((p,i) => {
    const a = ps[i]; let x;
    if (lineX != null) x = lineX;
    else if (mode === 'kick') x = a.x + dA*7;
    else { x = a.x + dA*4.5; x = dA > 0 ? Math.max(x, fx+2.5) : Math.min(x, fx-2.5); }
    T.set(p, { x:clamp(x,1,119), y:clamp(a.y + (fy-a.y)*0.12, 2, 68), s:maxSpeed(p)*0.86 });
  });
}
function matchTargets() {
  const T = new Map(), b = M.ball, P = M.players;
  const uc = new Set(); for (const t of [0, 1]) if (userActive(t)) uc.add(ctrlOf(t));   // the men under a human's ring drive themselves
  const free = p => p.down <= 0 && !uc.has(p) && !p.bind;
  if (M.phase === 'goal' || (M.phase === 'set' && (M.set.kind === 'try' || M.set.kind === 'score'))) {
    for (const p of P) T.set(p, { x:p.x, y:p.y, s:0 });
    return T;
  }
  if (M.phase === 'set' && (M.set.kind === 'kickoff' || M.set.kind === 'dropout')) {
    for (const p of P) T.set(p, { x:p.hx, y:p.hy, s:5 });
    return T;
  }
  let att, fx, fy, mode, carrier = null;
  if (M.phase === 'set') { att = M.set.team; fx = M.set.x; fy = M.set.y; mode = 'set'; }
  else if (b.state === 'held') { carrier = b.carrier; att = carrier.team; fx = carrier.x; fy = carrier.y; mode = 'held'; }
  else if (b.state === 'air' && b.f.kind === 'pass') { att = b.f.team; fx = b.f.x1; fy = b.f.y1; mode = 'pass'; }
  else if (b.state === 'air') { att = 1-b.f.team; fx = b.f.x1; fy = b.f.y1; mode = 'kick'; }
  else { att = 1-b.last; fx = b.x; fy = b.y; mode = 'kick'; }
  const dA = dirOf(att);
  let A = P.filter(p => p.team === att && free(p)), D = P.filter(p => p.team !== att && free(p));
  if (mode === 'kick') {
    for (const side of [A, D]) {
      const s = side.slice().sort((p,q) => hyp(p.x-fx, p.y-fy) - hyp(q.x-fx, q.y-fy));
      for (const p of s.slice(0,2)) T.set(p, { x:fx, y:fy, s:maxSpeed(p), a:16 });
    }
    A = A.filter(p => !T.has(p)); D = D.filter(p => !T.has(p));
  } else if (mode === 'pass') {
    const r = b.f.target; if (r && free(r)) { T.set(r, b.f.sure ? { x:fx, y:fy, s:maxSpeed(r), a:18 } : runOnTarget(r, b.f, passPace(b.f.team))); A = A.filter(p => p !== r); }   // an AI receiver runs onto it at his side's pace; a sure pass keeps its seek
  } else if (mode === 'held') {
    A = A.filter(p => p !== carrier);
  } else {
    const k = M.set.kind, m = playFrom(att, fx, fy, k);
    const sx = clamp(m.x, 1, 119), sy = m.y;
    const pin = k === 'ruck' && M.set.picker && M.set.picker.team === att && onFeet(M.set.picker) ? M.set.picker : null;   // he keeps the half-back mark, so the rest of the shape is the one it was
    const sh = pin || nearestOf(A, sx, sy);
    if (sh) { T.set(sh, { x:sx, y:sy, s:maxSpeed(sh) }); A = A.filter(p => p !== sh); }
  }
  const depth = mode === 'set' ? ((M.set.kind === 'scrum' || M.set.kind === 'lineout') ? 5 : 3) : SUPPORT.back;
  const pod = (mode === 'held' || mode === 'pass') ? holdShoulder(A, fx, fy, dA, att) : null;   // one runner on the open shoulder; a set piece keeps the flat shelf
  const rest = pod ? A.filter(p => p !== pod.holder) : A;
  const slots = supportSlots(fx, fy, dA, rest.length, depth, pod ? pod.skip : 0);
  const lead = mode === 'pass' && b.f.target ? dA*maxSpeed(b.f.target)*0.95*RUNON.line : 0;   // the line keeps running while the ball is in the air, instead of pulling up round the landing spot
  assignByY(T, rest, slots, lead);
  if (pod) T.set(pod.holder, { x:clamp(pod.at.x + lead, 1, 119), y:pod.at.y, s:maxSpeed(pod.holder) });
  let sweep = true;
  if (mode === 'held') {
    const live = D.filter(p => !(p.offside > 0));                  // a retiring tackler is never the chaser, and never the man who comes up
    const depthOf = p => (p.x - carrier.x) * dA;
    const L = levelOf(att), lv = L === 0 || L === 2 ? L : 1;         // how hard the defence is for this attacker: his side's level
    const quota = COVER.last[lv];
    const ahead = live.filter(p => depthOf(p) > 0.8);               // still goal-side: a formed line, or the last men of a break
    const stepped = live.filter(p => { const z = depthOf(p); return z > -4 && z <= 0.8; }).sort((a, b) => depthOf(b) - depthOf(a));
    let committers = [];
    if (ahead.length > 0 && ahead.length <= quota) {               // through the line: those men come up, and one who has just drawn level stays on the commit
      committers = ahead.slice();
      for (const p of stepped) { if (committers.length >= quota) break; committers.push(p); }
    } else if (ahead.length === 0 && stepped.length > 0 && stepped.length <= quota) committers = stepped.slice();
    const taken = new Set();
    const chase = p => {
      const lead = clamp(dist(p, carrier) / 9, 0, 0.7);
      T.set(p, { x:carrier.x + carrier.vx*lead, y:carrier.y + carrier.vy*lead, s:maxSpeed(p), a:15, pursue:true });
      taken.add(p);
    };
    if (committers.length) {
      sweep = false;                                                // nobody is posted to the 18m station once the line is broken
      const commitSet = new Set(committers);
      const behind = live.filter(p => !commitSet.has(p)).sort((a, b) => dist(a, carrier) - dist(b, carrier));
      const ch = [];
      if (behind[0]) ch.push(behind[0]);
      for (const q of behind.slice(1, 3)) if (dist(q, carrier) < 5.5) ch.push(q);
      for (const p of ch) chase(p);
      for (const p of committers) {
        const to = commitPoint(p, carrier, lv, dA);
        T.set(p, { x:to.x, y:to.y, s:maxSpeed(p)*COVER.speed[lv], a:COVER.acc[lv], pursue:true });
        taken.add(p);
      }
    } else {
      const s = live.slice().sort((a, b) => dist(a, carrier) - dist(b, carrier));
      const ch = [];
      if (s[0]) ch.push(s[0]);
      for (const q of s.slice(1, 3)) if (dist(q, carrier) < 5.5) ch.push(q);
      for (const p of ch) chase(p);
    }
    D = D.filter(p => !taken.has(p));
  } else if (mode === 'pass') {
    const c = nearestOf(D, fx, fy);
    if (c) { T.set(c, { x:fx + dA*1.2, y:fy, s:maxSpeed(c), a:15, pursue:true }); D = D.filter(p => p !== c); }
  }
  const pts = (mode === 'held' || mode === 'pass')
    ? P.filter(p => p.team === att && p.down <= 0 && p !== carrier).map(p => ({ x:p.x, y:p.y }))
    : slots;
  const lineX = mode === 'set' ? fx + dA*(SETGAP[M.set.kind] || 5) : null;
  assignMarks(T, D, pts, dA, fx, fy, lineX, mode, sweep);
  for (const p of P) if (p.bite > 0 && p.biteTo && T.has(p)) { const r = p.biteTo; T.set(p, { x:r.x + r.vx*0.3, y:r.y + r.vy*0.3, s:maxSpeed(p), a:15, pursue:true }); }   // a sold Dummy: he runs at the man the pass was shown to
  return T;
}

/* ---------- AI ball carrier ---------- */
function aiCarrier(p, dt) {
  if (p.drop) { steer(p, 0, 0, 12, dt); if ((p.drop.t -= dt) <= 0) cpuDropStrike(p); return; }   // winding up a drop goal: he checks his run and strikes it on the half-volley
  const d = dirOf(p.team), n = M.nat[p.team];
  let ax = d, ay = 0, near = 99;
  for (const q of M.players) {
    if (q.team === p.team || q.down > 0) continue;
    const dx = (q.x-p.x)*d, dy = q.y-p.y, dd = hyp(dx,dy);
    if (dd < near) near = dd;
    if (dx > 0 && dd < 9) { const w = (9-dd)/9; ay += (dy > 0 ? -1 : 1)*w*1.0; }
  }
  if (p.y < 8) ay += (8-p.y)*0.25;
  if (p.y > 62) ay -= (p.y-62)*0.25;
  const toLine = (oppLine(p.team)-p.x)*d;
  if (toLine < 12) ay += (35-p.y)*0.015;
  const m = hyp(ax,ay) || 1, sp = maxSpeed(p)*0.95;
  steer(p, ax/m*sp, ay/m*sp, 15, dt);
  if (near < 3 && p.side <= -0.9 && rnd() < dt*0.9*n.handling/5) { p.side = 0.35; const s = rnd() < 0.5 ? -1 : 1; p.vy += s*MOVES.step.cpuPush; artStepped(p, s); }
  if (M.careerPro && proCarrier(p, dt)) return;          // Pro Mode: a Call for Ball answered, or a look for your player (career-pro.js)
  p.think -= dt; if (p.think > 0) return; p.think = 0.15;
  if (p.hold < 0.5) return;
  const KD = MOVES.dummy, lv = levelOf(p.team);
  if (KD.cpu[lv] > 0 && isHuman(1 - p.team) && p.side <= -0.9 && M.dclock - p.dumAt >= KD.cd) {   // the CPU's Dummy, only against a human and only where cpu[level] > 0: AI v AI and Normal draw nothing here
    let fa = 99; for (const q of M.players) if (q.team !== p.team && onFeet(q) && (q.x - p.x)*d > 0) fa = Math.min(fa, dist(q, p));
    if (fa >= KD.cpuRange[0] && fa <= KD.cpuRange[1]) { const r = bestReceiver(p); if (r && rnd() < KD.cpu[lv]) { p.dumAt = M.dclock; dummyPass(p, r.q); return; } }
  }
  if (p.quick && p.hold > 0.4) {
    p.quick = false;
    if (rnd() < 0.85) { const r = bestReceiver(p); if (r) { doPass(p, r.q); return; } }
  }
  const fromOwn = (p.x-ownLine(p.team))*d;
  if (p.fromKick) { p.fromKick = false; if (fromOwn < 40 && rnd() < 0.5) { aiKick(p, 'territory'); return; } }
  if (fromOwn < 22 && near < 8 && rnd() < 0.45) { aiKick(p, 'clear'); return; }
  if (toLine < 30 && toLine > 6 && Math.abs(p.y-35) < 13 && M.phaseCount >= 2 && cpuDropOffer(p) && rnd() < 0.07) { aiKick(p, 'drop'); return; }   // the same offer rule as yours, from his side
  if (fromOwn < 45 && near > 5 && M.phaseCount >= 3 && rnd() < 0.03) { aiKick(p, 'territory'); return; }
  if (near < 2.6 || (p.hold > 2.4 && rnd() < 0.15)) {
    const r = bestReceiver(p);
    if (r && r.space > near + 2 && rnd() < 0.6) {
      const nearMan = pickReceiver(p, 0);                     // the man a flat pass would find; a long one skips him when he is crowded and the next man is in space
      const nxt = nearMan && pressure(nearMan) < 2.2 ? pickLong(p, 0, nearMan) : null;
      if (nxt && pressure(nxt) > pressure(nearMan) + 2) passOrBlock(p, nxt, { long:true });
      else passOrBlock(p, r.q);
    }
  }
}

/* ---------- the user's player ---------- */
function userMove(p, dt, inp) {
  const j = inp.world(), b = M.ball;
  const ms = maxSpeed(p)*(b.carrier === p ? 0.95 : 1);
  if (b.state === 'air' && b.f.kind === 'pass' && b.f.target === p) {   // a pass to him: he runs onto it whatever the stick says, and the stick takes over at the catch
    if (b.f.sure) { seek(p, b.f.x1, b.f.y1, ms, 22, dt); return; }     // a won Key Pass keeps its seek
    const r = runOnTarget(p, b.f, passPace(p.team)); seek(p, r.x, r.y, r.s, 22, dt, true); return;
  }
  if (b.carrier === p && p.boost > 0 && j.mag < 0.3) { const m = hyp(1, 0.3*p.autoDir), v = frameVec(p.team, { x:ms/m, y:ms*0.3*p.autoDir/m }); steer(p, v.x, v.y, 20, dt); return; }   // the burst runs upfield, autoDir to the owner's right
  steer(p, j.x*ms, j.y*ms, 20, dt);                       // the Side Step and the Dummy are read in gestureStep, from the slot's history, not here
}
function throwUserPass(c, shown) {
  sideOf(c.team).pass = null;
  if (!shown || !shown.to) { say('No Support', 'small'); return; }
  passOrBlock(c, shown.to, { long:!!shown.gold });          // the other side's human may get a Block on it
}
function startUserPass(c) {                                // a tap (no hold) is today's pass; a finger still down starts the charge. Inside the catch gate the press is kept, not dropped.
  const S = sideOf(c.team), inp = inputOf(c.team), to = pickReceiver(c, inp.world().y);
  if (!inp.aDown) {
    S.pass = { mode:'tap', to, t:0 };
    if (c.hold >= LONG.gate) throwUserPass(c, shownPass(c));
    return;
  }
  S.pass = { mode:'hold', to, t:0 };
}
function tickUserPass(t, dt) {
  const S = sideOf(t), p = S.pass;
  if (!p) return;
  const b = M.ball, c = ctrlOf(t), inp = inputOf(t);
  const carrying = c && M.phase === 'play' && b.state === 'held' && b.carrier === c && !c.bind;
  if (!carrying || inp.aCancel) { S.pass = null; return; }
  if (p.mode === 'tap') { if (c.hold >= LONG.gate) throwUserPass(c, shownPass(c)); return; }
  p.t += dt;
  if (!inp.aDown) {
    if (c.hold < LONG.gate) { p.to = shownPass(c).to; p.mode = 'tap'; return; }   // let go inside the gate: it still goes, to the man the ring showed
    throwUserPass(c, shownPass(c));
    return;
  }
  if (p.t >= LONG.auto && c.hold >= LONG.gate) throwUserPass(c, shownPass(c));
}
function userKick(t, power) {
  const c = ctrlOf(t);
  doKick(c, power, inputOf(t).world().y);
}
function canDive(q) {                                      // would a Tackle press act now: a carrier of the other side within 2.8m, and this man up, off cooldown, not retiring and unbound
  const b = M.ball, c = b.state === 'held' ? b.carrier : null;
  if (!q || !c || c.team === q.team || !onFeet(q) || q.tcd > 0 || q.offside > 0 || dist(q, c) >= 2.8) return false;
  return !c.bind || (!c.bind.q2 && c.bind.q !== q);
}
function userTackle(t) {                                   // the Tackle press for the human on side t: a dive, an Ankle Tap from behind, or joining a bind; beyond reach it does nothing
  const q = ctrlOf(t), b = M.ball;
  if (practice && practice.tagOnly) { drillTagPull(q); return; }   // the youngest pull a tag: no dive
  if (!canDive(q)) { st('ignored'); if (practice && practice.id === 'defend') drillWhiff(q); return; }   // a press with nothing in reach costs a moment in that drill, so the timing counts
  const c = b.carrier;
  if (dropHolding(c)) { st('ignored'); return; }   // he is about to drop for goal: the close-up judges you as a charger
  if (c.bind) { joinTackle(c.bind, q); return; }
  const behind = (q.x - c.x)*dirOf(c.team) < -0.3;
  const dx = c.x-q.x, dy = c.y-q.y, m = hyp(dx,dy) || 1;
  q.vx = dx/m*9; q.vy = dy/m*9;
  commitTackle(q, c, behind ? 'ankle' : 'dive');
}
function switchMark(t) {                               // where "behind the ball" is judged. The carrier, when they have it (the ball sits half a metre in front of his hands). The ball itself on their pass or kick. Nothing on a loose ball: there is no line to be behind
  const b = M.ball;
  if (b.state === 'held' && b.carrier && b.carrier.team !== t) return { x:b.carrier.x, y:b.carrier.y, d:dirOf(b.carrier.team) };
  if (b.state === 'air' && b.f && b.f.team !== t && (b.f.kind === 'pass' || b.f.kind === 'kick')) return { x:b.x, y:b.y, d:dirOf(b.f.team) };
  return null;
}
function switchTarget(t) {                                // the one man the dashed ring, the press and the pulse agree on. Nearest the ball, or the second-nearest when that is already you. When your man is behind the ball, the nearest teammate still in front
  const b = M.ball, cur = ctrlOf(t);
  if (proPinned(t)) return null;                          // Pro Mode: he is always him, so there is no Switch
  const list = M.players.filter(p => p.team === t && onFeet(p)).sort((p, q) => hyp(p.x-b.x, p.y-b.y) - hyp(q.x-b.x, q.y-b.y));
  if (!list.length) return null;
  const m = switchMark(t);
  if (cur && m && (cur.x - m.x)*m.d < -0.3) {             // behind: the attack is past him, the same 0.3m an Ankle Tap calls behind. Still in front: level, or goal-side
    const front = list.find(p => p !== cur && (p.x - m.x)*m.d >= -0.3);
    if (front) return front;
  }
  const pick = (list[0] === cur && list[1]) ? list[1] : list[0];
  return pick === cur ? null : pick;
}
function switchUseful(t) {                                // worth pulsing, the way Offload pulses: your man is behind the ball and the man in the ring can still meet it. A switch onto someone already beaten stays quiet
  if (!M || M.phase !== 'play' || M.cut || ourBall(t)) return false;
  const q = switchTarget(t), cur = ctrlOf(t), m = switchMark(t);
  return !!(q && cur && m && (cur.x - m.x)*m.d < -0.3 && (q.x - m.x)*m.d >= -0.3);
}
function switchPlayer(t) {
  const q = switchTarget(t);
  if (q) setCtrl(t, q);
}
/* Phase A reads every human slot's edges; Phase B resolves the side in possession first (the carrier's team, the passer's team
   while a pass is in the air, M.poss otherwise), then the other, each in today's order: A, the pass in hand, B, Sprint, then the
   charge. One player has one side, so nothing moves; in two player a pass and a dive pressed on the same step resolve the same
   way whichever seat pressed. */
/* ---------- open-play moves: the Side Step and the Dummy (see MOVES) ---------- */
function sideStep(c, j, s) {                               // the carrier steps toward s (the flick's sign across the pitch), darting along the stick
  const K = MOVES.step;
  c.side = K.side; c.vx += j.x*K.push; c.vy += j.y*K.push;
  M.stats.steps = (M.stats.steps || 0) + 1; st('steps' + c.team);
  if (ringed(c)) tag('Side Step', c.x, c.y);
  sfx('whoosh'); buzz(15, c.team);
  artStepped(c, s);                                        // the art's feint: render-only, nothing else reads it
}
function dummyPass(c, r) {                                 // c shows a pass to r and keeps the ball: the nearest standing AI defender ahead may buy it. False when there is nobody to sell
  const K = MOVES.dummy, t = c.team, d = dirOf(t);
  if (!r) return false;
  let q = null, bd = K.range[1];
  for (const o of M.players) { if (o.team === t || !onFeet(o) || ringed(o) || (o.x - c.x)*d < -0.5) continue; const dd = dist(o, c); if (dd >= K.range[0] && dd < bd) { bd = dd; q = o; } }
  if (!q) return false;
  st('dummies' + t);
  sfx('whoosh');
  if (rnd() < K.bite[levelOf(t)]) {                        // he bites: wrong-footed, drifting onto the runner, no tackle for a moment
    q.wf = Math.max(q.wf, K.wf); q.tcd = Math.max(q.tcd, K.tcd);
    q.vy += (Math.sign(r.y - q.y) || 1)*K.shove;
    q.bite = K.drift; q.biteTo = r;
    st('sold' + t);
    tag('Dummy', c.x, c.y); buzz(15, t);
  } else if (isHuman(t)) tag('Not Fooled', c.x, c.y);
  return true;
}
const dirKeyHeld = (inp, d) => { for (const code of inp.keys) { const k = KEYDIR[code]; if (k && (d == null || keyFwd(inp, k)*d < 0)) return true; } return false; };   // any direction key, or (with d) one pointing back toward his own line
function gestureStep(t, dt) {                              // one human side's open-play gestures, read once a step from its slot's history
  const inp = inputOf(t), c = ctrlOf(t), b = M.ball, S = sideOf(t), KS = MOVES.step, KD = MOVES.dummy;
  const peak = inp.latPeak; inp.latPeak = null;            // consumed this step, carrying or not, so a flick from a cut can't finish on the next carry
  const G = inp.gest || (inp.gest = { who:null, n:-9, L:[], gap:[], armed:true, run:0, lastRun:0, dropT:-9, pull:null, keyed:false, kb:false, v:null, t:0, tagAt:0, tagged:null });   // the Dummy's cooldown is not kept here: it is the carrier's (c.dumAt, on the match clock), so a lifted thumb, a pause or a duel's restore can't reset it
  G.t += dt;
  if (G.tagged && G.t - G.tagAt <= 0.15 && (S.pass || (b.state === 'air' && b.f.kind === 'pass' && b.f.team === t))) { const i = M.tags.indexOf(G.tagged); if (i >= 0) M.tags.splice(i, 1); G.tagged = null; }   // Pass inside 0.15s of a step: that flick was an aim, so the tag comes off
  const carrying = M.phase === 'play' && !!c && b.state === 'held' && b.carrier === c && !c.bind && !inp.aDown && !inp.bDown && !S.charging;
  if (!carrying) { G.who = null; return; }
  if (G.who !== c || G.n !== M.stepN - 1) { G.who = c; G.L.length = 0; G.gap.length = 0; G.armed = true; G.run = 0; G.lastRun = 0; G.dropT = -9; G.pull = null; G.keyed = false; G.kb = false; G.v = null; }   // a new carrier, or any step he was not carrying in open play (a cut, a set piece, the ball in the air): the history starts again
  G.n = M.stepN;
  const j = inp.world(), d = dirOf(t);
  let jx = j.x, jy = j.y, L = jy, mag = j.mag;
  if (typeof peak === 'number' && !inp.keys.size && Math.abs(peak) > Math.abs(jy)) { jy = peak; L = peak; mag = Math.max(mag, Math.abs(peak)); }   // a flick Chrome coalesced into one move: the peak across the run, not the sample that landed back near centre
  const F = jx*d;
  // the Side Step: a sharp rise across the run inside the window, armed
  G.L.push(L); G.gap.push(stepGap); if (G.L.length > KS.win + 3) { G.L.shift(); G.gap.shift(); }   // the thumb lives in real time whatever the pace, so the window is real time too: a slower match must not make a slower thumb a flick
  if (Math.abs(L) < KS.rearm) G.armed = true;              // the investigation's re-arm: back inside rearm first (a key switch passes through 0; a thumb crosses the centre in a few steps)
  if (G.armed && Math.abs(L) >= KS.L && mag >= KS.mag) {
    const s = Math.sign(L), W = KS.win/60; let lo = s*L, back = 0;
    for (let i = G.L.length - 1; i > 0 && back < W - 1e-9; i--) {   // back through the samples to the window's real start, the far one read part way along. At a step a frame this is simply the last win steps
      const gap = G.gap[i] ?? 1/60, f = back + gap <= W + 1e-9 ? 1 : (W - back)/gap;
      lo = Math.min(lo, s*(G.L[i] + (G.L[i - 1] - G.L[i])*f)); back += gap;
    }
    if (s*L - lo >= KS.rise) {
      G.armed = false;                                     // the flick is spent whether or not it acts: outside a tackler's reach it is steering
      if (c.side <= -0.9 && c.hold >= KS.since && pressure(c) < KS.range) { sideStep(c, { x:jx, y:jy }, s); G.tagged = M.tags[M.tags.length - 1] || null; G.tagAt = G.t; }
    }
  }
  // the Dummy: a held run, a quick pull back, and the push on
  const keyHeld = dirKeyHeld(inp), backKey = dirKeyHeld(inp, d);
  if (F >= KD.fwd) { G.run += dt; if (G.pull == null) G.v = { x:c.vx, y:c.vy }; G.keyed = keyHeld; }   // his pace before the pull, not the push-on step's (already slowed)
  else { if (G.run > 0) { G.lastRun = G.run; G.dropT = G.t; G.kb = false; } G.run = 0; }
  if (G.pull == null && F <= KD.back && G.t - G.dropT <= KD.drop && G.lastRun >= KD.hold) G.pull = G.t;
  if (G.pull != null) { if (backKey) G.kb = true; if (keyHeld) G.keyed = true; if (G.t - G.pull > KD.ret) G.pull = null; }
  if (G.pull != null && G.t > G.pull && F >= KD.on) {
    G.pull = null; G.lastRun = 0;
    if ((!G.keyed || G.kb) && M.dclock - c.dumAt >= KD.cd) { const v = G.v; if (dummyPass(c, shownPass(c).to)) { c.dumAt = M.dclock; if (v) { c.vx = v.x; c.vy = v.y; } } }   // on keys the pull must have been the back key itself; the cooldown is the carrier's, on the match clock, as the CPU's is
  }
}
/* Phase A reads every human slot's edges; Phase B resolves the side in possession first (the carrier's team, the passer's team
   while a pass is in the air, M.poss otherwise), then the other, each in today's order: A, the pass in hand, B, Sprint, then the
   charge. One player has one side, so nothing moves; in two player a pass and a dive pressed on the same step resolve the same
   way whichever seat pressed. The open-play gestures are read last, once a step for each human side. */
function handleUser(dt) {
  if (M.auto) return;
  const b = M.ball, I = [null, null];
  for (const t of [0, 1]) {
    const inp = inputOf(t); if (!inp) continue;
    I[t] = { a:inp.aPressed, b:inp.bPressed, c:inp.cPressed };
    inp.aPressed = inp.bPressed = inp.cPressed = false;
  }
  const poss = b.state === 'held' ? b.carrier.team : (b.state === 'air' && b.f.kind === 'pass') ? b.f.team : M.poss;
  for (const t of [poss, 1 - poss]) if (I[t]) userStep(t, I[t], dt);
  for (const inp of inputs) inp.aCancel = inp.bCancel = inp.cCancel = false;
  for (const t of [0, 1]) if (inputOf(t)) gestureStep(t, dt);
  if (M.kids) for (const t of [0, 1]) kidsSwitch(t);      // Kids: the ring finds your best defender
}
function userStep(t, i, dt) {
  const b = M.ball, c = ctrlOf(t), S = sideOf(t), inp = inputOf(t);
  if (M.phase === 'set' && M.set && M.set.kind === 'ruck') { S.pass = null; if (S.charging) { S.charging = false; S.charge = 0; } return; }   // Pass, Kick and Tackle stay dead until the ball is out
  if (i.a) {
    if (inp.aCancel) S.pass = null;
    else if (M.phase === 'play' && c) {
      if (b.state === 'held' && b.carrier === c) { if (c.bind) { S.pass = null; offload(c.bind, true); } else startUserPass(c); }   // held in a tackle, Pass is the offload, on the press
      else if (!ourBall(t)) { S.pass = null; userTackle(t); }
      else if (proPinned(t)) proCall();                     // Pro Mode: a teammate has it, so Pass is Call for Ball (career-pro.js)
    }
  }
  tickUserPass(t, dt);
  if (i.b && !inp.bCancel) {
    if (M.phase === 'play' && b.state === 'held' && b.carrier === c && !c.bind) { S.charging = true; S.charge = 0; S.holdN = 0; M.dropArmed[t] = dropPress(c); }   // what the label promised at the press
    else if (M.phase === 'play' && !ourBall(t)) switchPlayer(t);
  }
  if (i.c && !inp.cCancel && c) sprintPress(t);                            // the hold itself is read by sprintTick
  if (S.charging) {
    if (!(M.phase === 'play' && b.state === 'held' && b.carrier === c) || inp.bCancel || c.bind) { S.charging = false; S.charge = 0; }   // a cancelled touch is never a kick, and a man held in a tackle can't kick
    else {
      S.charge = Math.min(1, S.charge + dt/0.85); S.holdN++;
      if (!inp.bDown) { const pw = S.charge; S.charging = false; S.charge = 0; userKick(t, pw); }   // a tap is a chip, as ever
      else if (M.dropArmed[t] && S.holdN >= holdSteps()) startDropCut(c);   // a Drop Goal press held 0.20s (holdSteps steps, the press step the first): the close-up, with the thumb still down. The label is not run again: what it said at the press is what you get
    }
  }
}

/* ---------- the step ---------- */
function moveAll(dt) {
  const b = M.ball;
  const T = computeTargets();
  const snap = M.phase === 'set' && M.set.snap;
  const ua = [userActive(0), userActive(1)];
  for (const p of M.players) {
    if (p.bind) { bindMove(p, dt); continue; }
    if (p.down > 0) { p.down -= dt; steer(p, 0, 0, 16, dt); continue; }
    if (ua[p.team] && ringed(p)) {
      const inp = inputOf(p.team);
      if (M.phase === 'set' && M.set && M.set.kind === 'ruck' && M.set.picker === p && inp.world().mag < 1e-6) {
        const t = T.get(p);                                     // the stick let go: he still runs onto the ball, as he did before the ring moved
        if (t) { seek(p, t.x, t.y, t.s, t.a || 13, dt, t.pursue); continue; }
      }
      if (M.kids && kidsChase(p, inp, dt)) continue;           // Kids: let go of the stick and he chases on his own
      userMove(p, dt, inp); continue;                          // any deflection places him until the ball is out
    }
    if (M.phase === 'play' && b.state === 'held' && b.carrier === p) { aiCarrier(p, dt); continue; }
    const t = T.get(p);
    if (!t) { steer(p, 0, 0, 10, dt); continue; }
    if (snap && hyp(t.x-p.x, t.y-p.y) > 12) { p.x = t.x + (rnd()-0.5)*1.5; p.y = t.y + (rnd()-0.5)*1.5; p.vx = p.vy = 0; }
    seek(p, t.x, t.y, t.s, t.a || 13, dt, t.pursue);
  }
  if (snap) M.set.snap = false;
  let carryX = null, carryTeam = -1;
  const carrying = M.phase === 'play' && b.state === 'held' ? b.carrier : null;   // metres made: ground gained with the ball, after the shove of this step
  for (const p of M.players) {
    if (p === carrying) { carryX = p.x; carryTeam = p.team; }
    p.x += p.vx*dt; p.y += p.vy*dt;
    const sp = hyp(p.vx, p.vy);
    if (sp > 0.6) { p.fx = p.vx/sp; p.fy = p.vy/sp; }
    else if (b.carrier !== p) {
      const dx = b.x-p.x, dy = b.y-p.y, m = hyp(dx,dy);
      if (m > 0.5) { p.fx += (dx/m-p.fx)*0.12; p.fy += (dy/m-p.fy)*0.12; const n = hyp(p.fx,p.fy) || 1; p.fx /= n; p.fy /= n; }
    }
    if (p.tcd > 0) p.tcd -= dt;
    if (p.offside > 0) p.offside -= dt;
    if (p.sprinting) p.sprint = Math.min(SPRINT.fade, p.sprint + dt); else if (p.sprint > 0) p.sprint -= dt;   // the burst climbs while held, eases out when not
    if (p.stumble > 0) p.stumble -= dt;
    if (p.wf > 0) p.wf -= dt;
    if (p.bite > 0) p.bite -= dt;
    if (p.boost > 0) p.boost -= dt;
    if (p.grace > 0) p.grace -= dt;                        // the moment after a catch: see PASS_FLIGHT
    if (p.side > -1) p.side -= dt;
    p.hold += dt;
    p.x = clamp(p.x, -4, 124);
    if (b.carrier !== p) p.y = clamp(p.y, -3, 73);
  }
  collide();
  if (carryX != null && b.state === 'held' && b.carrier && b.carrier.team === carryTeam) M.stats.gain[carryTeam] += (b.carrier.x - carryX)*dirOf(carryTeam);
}
function computeTargets() {
  const targets = matchTargets();
  if (practice && practice.id === 'defend') for (const p of M.players) {
    if (p.team === 0 && p !== ctrlOf(0)) targets.set(p, { x:p.x, y:p.y, s:0 });
  }
  if (M.career) careerLifeSupport(targets);                // a career match: Team Spirit pulls your player's support line towards the ball
  return targets;
}
function update(dt) {
  if (practice && practice.demo && demoStep(dt)) return;   // Watch How: the pilot writes the input first, or the world holds (drill-demo.js)
  if (practice) dt *= drillRate();                         // a drill runs at its own pace, the world and its clocks together; a match is untouched
  if (!(practice && practice.space)) matchUpdate(dt);      // a training space has no match flow: its drill moves the men and the ball (training.js)
  practiceTick(dt);
  if (practice && practice.demo) demoSync();               // the ghost shows what the input holds after the step
}
function matchUpdate(dt) {
  if (!M || M.phase === 'break' || M.phase === 'menu' || M.paused || M.over) return;
  M.stepN++;                                               // every step, close-ups included: gestureStep reads it to see a gap in a man's carry
  if (M.phase === 'cut') { updateCut(dt); return; }
  const b = M.ball;
  if (M.surge && (M.surge.t -= dt) <= 0) M.surge = null;
  fireTick(dt);
  const clockOn = M.phase === 'play' || (M.phase === 'set' && M.set.kind !== 'try' && M.set.kind !== 'score');
  if (clockOn) {
    M.clock += dt; M.dclock += dt;
    if (!M.hooter && M.clock >= periodLen()) { M.hooter = true; if (!M.demo) { say('Last Play'); sfx('horn'); } }
  }
  handleUser(dt);
  if (M.phase === 'cut') return;                           // a drop goal's close-up opened on this step: the world is frozen from here
  contactGuard(); sprintTick(dt);
  for (const s of M.side) { if (s.ctrl !== s.ctrlPrev) { s.ctrlPrev = s.ctrl; s.ctrlT = 0; } else s.ctrlT += dt; }
  moveAll(dt);
  if (M.phase === 'play') {
    if (b.state === 'held') {
      const c = b.carrier;
      b.x = c.x + c.fx*0.55; b.y = c.y + c.fy*0.55; b.z = 1.0;
      if (M.contact) contactStep(c, dt); else if (!carrierChecks(c) && !duelCheck(c)) tackleChecks(c);
    } else if (b.state === 'air') updateBallAir(dt);
    else if (b.state === 'loose') updateLoose(dt);
    if (M.phase === 'play' && M.hooter && !M.demo && M.clock > periodLen() + 45) endHalf();
  } else if (M.phase === 'set') {
    M.set.t -= dt;
    if (M.set.t <= 0) { const s = M.set; M.set = null; M.phase = 'play'; s.then(s); }
  } else if (M.phase === 'goal') updateGoal(dt);
  if (M.duelPending) startPendingDuel();
}

/* ---------- halves ---------- */
function endHalf() {
  placeBall(M.ball.x, M.ball.y);
  for (const s of M.side) s.charging = false;
  if (M.demo) { M.clock = 0; M.hooter = false; kickoff(rnd() < 0.5 ? 0 : 1); return; }
  sfx('long');
  if (M.half === 1) {
    if (M.headless) { secondHalf(); return; }
    M.phase = 'break'; showBreak('half');
  } else if (M.half === 2 && goldenOn() && M.score[0] === M.score[1]) {
    startGolden();                                         // level: sudden death, straight from the hooter
  } else {
    M.phase = 'break'; M.over = true;
    if (!M.headless) finishMatch();
  }
}
function secondHalf() { lockerHalf(); M.half = 2; M.clock = 0; M.hooter = false; M.wind.a += Math.PI; kickoff(1-M.firstKick); }   // you always attack +x, so the wind turns instead of the ends

