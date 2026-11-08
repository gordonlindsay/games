/* ---------- tackling ----------
   Contact is a commit, then a bind. A defender who comes within reach commits to the carrier: the roll is drawn at the commit
   and then played out. A made tackle binds the two men for CONTACT.bind seconds as a Big Hit, a Wrap or a Soft tackle, a second
   defender can join, and it ends in a ruck with the tackler rolling away and retiring. A broken tackle slides the tackler off the
   carrier's hip, never into his path. Duels and the drop-goal smother call tackle() with no tier and keep the old body, so no new
   random draw reaches them. New code reads the two-player shims (isHuman, ctrlOf, levelOf), never team 0 or M.ctrl. */
const ringed = q => q === ctrlOf(q.team);                   // the man under a human's ring
const onFeet = p => p.down <= 0 && !p.bind;
const st = (k, n) => { M.stats[k] = (M.stats[k] || 0) + (n == null ? 1 : n); };
const countTk = (team, made) => { const tk = M.stats.tk; tk.att[team]++; if (made) tk.made[team]++; };   // a tackle attempt by that side: made is a completed tackle, missed is a broken one
const cpuEdge = (q, c, arr) => (!isHuman(q.team) && isHuman(c.team)) ? arr[levelOf(c.team)] : 0;   // a CPU edge over a human, by the level that human plays
const slide = (p, x, y, T, spin) => { T = Math.max(T, hyp(x - p.x, y - p.y)/9); p.drawFrom = { x:p.x, y:p.y, t:T, T, spin:spin || 0 }; p.x = x; p.y = y; };   // a teleport in the logic, smoothed in the drawing at no more than 9 m/s
function tag(text, x, y) { if (M.auto) return; st('tag_' + text); M.tags.push({ text, x, y, t:0 }); while (M.tags.length > 2) M.tags.shift(); }
function impact(x, y) { M.fx.push({ x, y, t:0 }); }
function hitStop(ms, shake) { if (!interactive()) return; M.stop = ms/1000; if (!RM) M.shake = M.shakeT = shake || 0.12; }   // shake: its length, which also sets its size
function commitTackle(q, c, mode) {                        // mode: 'ai' (an AI defender's reach), 'contact' (your ringed man's automatic tackle), 'dive' (a Tackle press), 'ankle' (a dive from behind)
  const d = dirOf(c.team), rx = q.x - c.x, ry = q.y - c.y, rm = hyp(rx, ry) || 1;
  const cv = hyp(c.vx, c.vy), cosF = cv > 0.5 ? (rx*c.vx + ry*c.vy)/(rm*cv) : rx*d/rm;
  const behind = (q.x - c.x)*d < -0.3, sideOn = !behind && Math.abs(cosF) < 0.5;
  let p = mode === 'ankle' ? CONTACT.ankle : tackleChance(q, c, mode);
  if (sideOn && mode !== 'ankle') p = Math.min(0.95, p*CONTACT.side);
  q.tcd = 1.0;
  st('ta' + c.team);
  const qs = !!q.sprinting, cs = !!c.sprinting, dp = M.career ? careerAbility(q, 'power') - careerAbility(c, 'power') : M.nat[q.team].power - M.nat[c.team].power;   // both read the hold itself, not an ease-out: a tap buys no Big Hit bonus and no Fend
  const r = rnd();
  let tier = 'broken';
  if (r < p) {
    const closing = ((c.vx - q.vx)*rx + (c.vy - q.vy)*ry)/rm;   // how fast the two are coming together along the line between them
    let dom = CONTACT.dom.base + dp*CONTACT.dom.pow + (cosF > 0.5 && closing > 6 ? CONTACT.dom.front : 0) + (mode === 'dive' && rm < 1.7 ? CONTACT.dom.dive : 0) + (qs ? CONTACT.dom.sprint : 0) + cpuEdge(q, c, CONTACT.dom.cpu);
    let soft = CONTACT.soft.base + (behind ? CONTACT.soft.behind : 0) + (cv > 7 ? CONTACT.soft.fast : 0) - dp*CONTACT.soft.pow;
    if (mode === 'ankle') { dom = 0; soft = 1; }             // an ankle tap is always soft
    else { dom = clamp(dom, 0.03, 0.5); soft = clamp(soft, 0.05, 1 - dom); }
    const r2 = rnd();
    tier = r2 < dom ? 'dom' : r2 < dom + soft ? 'soft' : 'wrap';
    st('ts' + c.team);
  }
  st('tier_' + tier);
  countTk(q.team, tier !== 'broken');
  if (mode === 'ankle') { st('ankleTry'); if (tier !== 'broken') st('ankle' + q.team); }
  const k = { c, q, q2:null, mode, tier, t:0, T:tier === 'broken' ? 0 : CONTACT.bind, v0:{ x:c.vx, y:c.vy }, front:cosF > 0.3, aiOff:null, offloaded:false, margin:r - p, dp, cSprint:cs };
  endSprint(q);                                            // the sprint ends when he commits
  if (tier === 'broken') { resolveContact(k); return k; }
  endSprint(c);
  q.bind = k; c.bind = k; q.bindOff = { x:rx/rm*0.7, y:ry/rm*0.7 };
  M.contact = k; st('binds');
  sfx('tackle'); if (ringed(q) || ringed(c)) buzz(30);
  if (!isHuman(c.team) && tier !== 'dom' && rnd() < CONTACT.off.cpu*(0.6 + 0.2*(M.nat[c.team].handling - 3))) k.aiOff = 0.10 + rnd()*0.15;   // the AI carrier tries an offload
  return k;
}
function releaseBind(k) { for (const p of [k.c, k.q, k.q2]) if (p) p.bind = null; if (M.contact === k) M.contact = null; }
function contactGuard() { const k = M.contact; if (!k) return; const b = M.ball; if (!(M.phase === 'play' && b.state === 'held' && b.carrier === k.c)) releaseBind(k); }
function bindMove(p, dt) {                                 // velocities through the bind: the carrier runs down (or is driven back), the tackler is pulled onto his hip
  const k = p.bind;
  if (p === k.c) {
    const u = clamp(k.t/k.T, 0, 1);
    const f = k.tier === 'soft' ? 1 - 0.6*u : k.tier === 'wrap' ? 1 - u : (u < 0.4 ? 1 - u/0.4 : -0.35*(u - 0.4)/0.6);
    p.vx = k.v0.x*f; p.vy = k.v0.y*f;
  } else {
    const tx = k.c.x + p.bindOff.x, ty = k.c.y + p.bindOff.y;
    let px = (tx - p.x)*12, py = (ty - p.y)*12; const pm = hyp(px, py);
    if (pm > 8) { px *= 8/pm; py *= 8/pm; }                   // the pull onto the hip: 12/s of the gap, capped so a lunge from 2.8m reads as a lunge, not a blink
    p.vx = k.c.vx + px; p.vy = k.c.vy + py;
  }
}
function contactStep(c, dt) {                              // runs in place of the duel and tackle checks while a bind is on
  const k = M.contact;
  if (k.c !== c) { releaseBind(k); return; }
  if (carrierChecks(c)) { releaseBind(k); return; }        // a bound carrier who crosses the line still scores; touch is still touch
  k.t += dt;
  if (k.aiOff != null && k.t >= k.aiOff) { k.aiOff = null; if (offload(k, false)) return; }
  if (!k.q2) for (const o of M.players) {
    if (o.team === c.team || o === k.q || !onFeet(o) || o.tcd > 0 || o.offside > 0) continue;
    if (dist(o, c) < CONTACT.second.r) { joinTackle(k, o); break; }
  }
  if (k.t >= k.T) resolveContact(k);
}
function joinTackle(k, o) { const c = k.c, m = dist(o, c) || 1; k.q2 = o; o.bind = k; o.bindOff = { x:(o.x - c.x)/m*0.7, y:(o.y - c.y)/m*0.7 }; endSprint(o); st('second'); }
function supportFor(c) {                                   // the AI carrier's offload target: a team-mate level or behind within range, in some space
  const d = dirOf(c.team); let best = null, bd = CONTACT.off.range;
  for (const q of M.players) { if (q.team !== c.team || q === c || !onFeet(q) || (q.x - c.x)*d > 0.3) continue; const dd = dist(q, c); if (dd > 1.5 && dd < bd && pressure(q) > 2) { bd = dd; best = q; } }
  return best;
}
function offloadTarget(k) {                                // the one receiver the Offload label, the press and the pass-target ring all agree on: the stick's side within range, else the nearest within range
  if (k.offloaded || k.tier === 'dom' || k.tier === 'broken') return null;
  const c = k.c, inp = inputOf(c.team);
  return inp ? pickReceiver(c, inp.world().y, CONTACT.off.range) : supportFor(c);
}
function canOffload(k) { return !!offloadTarget(k); }
function looseInContact(c) {                               // the ball comes loose behind him, for anyone
  const b = M.ball, d = dirOf(c.team);
  tag('Loose Ball', c.x, c.y);
  b.state = 'loose'; b.carrier = null; b.f = null; b.last = c.team; b.kickInfo = null;
  b.x = c.x - d*0.4; b.y = c.y; b.z = 0.6; b.vx = -d*(2 + rnd()*3); b.vy = (rnd() - 0.5)*4; b.vz = 1.5;
  c.hold = 0;
}
function offload(k, user) {                                // user: the carrier's own Pass press while held; otherwise the AI's try
  const c = k.c;
  if (k.offloaded || k.tier === 'dom' || k.tier === 'broken') return false;
  const r = user ? offloadTarget(k) : supportFor(c);        // the press takes the man the label was lit for
  if (!r) return false;
  const pOk = CONTACT.off[k.tier]*(1 + (M.nat[c.team].handling - 3)*0.05);
  st('offAtt'); k.offloaded = true;
  const q = k.q, q2 = k.q2;
  releaseBind(k);
  c.down = 0.9; q.down = 0.6; q.tcd = 1.0; if (q2) q2.tcd = 0.4;
  if (rnd() < pOk) { st('offloads'); st('off' + c.team); if (ringed(c)) tag('Offload', c.x, c.y); doPass(c, r, { skip:[q, q2].filter(Boolean) }); return true; }
  st('offFail');
  if (rnd() < CONTACT.off.hold) { st('offHeld'); c.down = 0; q.down = 0; q.tcd = 0; tackle(c, q, { tier:k.tier, q2 }); return true; }   // he couldn't get it away: an ordinary ruck
  if (rnd() < CONTACT.off.knock) { st('offKnock'); knockOn(c, 'offload'); } else { st('offLoose'); looseInContact(c); }
  return true;
}
function resolveContact(k) {                               // the end of the bind, or a broken tackle at the commit
  const c = k.c, q = k.q, q2 = k.q2;
  let tier = k.tier;
  if (q2) {
    if (tier === 'wrap' && rnd() < CONTACT.second.toDom) tier = 'dom';
    else if (tier === 'soft' && rnd() < CONTACT.second.softToWrap) tier = 'wrap';
    if (tier !== k.tier) st('secondChanged');
  }
  releaseBind(k);
  if (tier === 'broken') {
    let ux = c.vx, uy = c.vy, cv = hyp(ux, uy);              // the carrier's line: his run, or his facing when he is standing still, or the line from the tackler; never nothing, so the tackler never lands on top of him
    if (cv < 0.5) { ux = c.fx; uy = c.fy; cv = hyp(ux, uy); }
    if (cv < 0.5) { ux = c.x - q.x; uy = c.y - q.y; cv = hyp(ux, uy); }
    if (cv < 1e-6) { ux = dirOf(c.team); uy = 0; cv = 1; }
    ux /= cv; uy /= cv;
    const s = (q.x - c.x)*uy - (q.y - c.y)*ux >= 0 ? 1 : -1;
    slide(q, c.x - ux*CONTACT.slide[0] + uy*CONTACT.slide[1]*s, c.y - uy*CONTACT.slide[0] - ux*CONTACT.slide[1]*s, 0.12, s);   // off the hip: beside and behind, out of his path
    q.down = (k.mode === 'dive' || k.mode === 'ankle') ? CONTACT.diveDown : CONTACT.brokenDown; q.tcd = 1.0; q.vx = q.vy = 0;
    const fend = k.cSprint || (-k.dp >= CONTACT.fend.pow && k.margin >= CONTACT.fend.margin);   // beaten by a clear margin with the power edge, or at a sprint: he keeps his speed
    c.fend = 0.2; c.fendA = Math.atan2(q.y - c.y, q.x - c.x);
    let tripped = false;
    if (k.mode === 'ankle' && rnd() < CONTACT.trip.p) { c.stumble = CONTACT.trip.t; c.stumbleMul = CONTACT.trip.mul; st('trip'); tripped = true; }
    else if (!fend) { c.stumble = CONTACT.stumble[0]; c.stumbleMul = CONTACT.stumble[1]; }
    if (fend) { st('fends'); st('fend' + c.team); if (ringed(c)) tag('Fend', c.x, c.y); }
    if (tripped) { sfx('trip'); if (ringed(q)) { tag('Tripped', c.x, c.y); buzz(20, q.team); } } else sfx('whiff');
    st('broken' + c.team); M.stats.broken++; heat(c.team, 'break');
    return;
  }
  if (tier === 'dom') {
    st('dom' + q.team); impact(c.x, c.y); sfx('hit'); buzz(45);
    if (M.arcade) {                                          // arcade: the whole screen knows. Yours freezes and shakes hard; one on your carrier shakes too
      heat(q.team, 'hit');
      if (ringed(q)) { say('Big Hit', 'big hit', q.team); hitStop(ARCADE.hit.stop, ARCADE.hit.shake); }
      else if (ringed(c) && !RM && interactive()) M.shake = M.shakeT = ARCADE.hit.hitShake;
    } else if (ringed(q)) { tag('Big Hit', c.x, c.y); hitStop(70); }
  }
  const jolt = (CONTACT.jolt[tier] || 0)*(1 + (3 - M.nat[c.team].handling)*0.15) + (tier === 'dom' && M.arcade ? ARCADE.hit.jolt : 0);   // the ball jolted loose in the tackle; an arcade Big Hit spills it more
  if (rnd() < jolt) {
    st('jolts');
    c.down = 1.0; q.down = 0.6; q.tcd = 1.0;
    if (rnd() < CONTACT.jolt.fwd) { st('joltKnock'); knockOn(c, 'contact'); } else { st('joltLoose'); looseInContact(c); }
    return;
  }
  if (k.mode === 'ankle') { sfx('trip'); if (ringed(q)) { tag('Ankle Tap', c.x, c.y); buzz(20, q.team); } }
  tackle(c, q, { tier, q2 });
}
function tackle(c, q, o) {
  if (practice && practice.id === 'defend' && c.team === 1) { practiceFinish(practice.switched && q === ctrlOf(0), practice.switched && q === ctrlOf(0) ? 'You switched into cover and stopped the runner.' : 'Switch to the defender ahead of the ball, then meet the runner.'); return; }
  o = o || {};
  M.stats.tackles++;
  if (M.career) careerDeed('tackles', q);                  // a career match: a tackle by your player
  const team = c.team, d = dirOf(team);
  if (o.tier == null) {                                      // the duels' tackles and Big Hit, and the drop-goal smother: the old body, with no new random draw
    c.down = 1.25; c.vx *= 0.2; c.vy *= 0.2; c.drop = null;
    q.down = 1.0; q.tcd = 1.0;
    sfx('tackle'); buzz(30);
    if ((c.x-ownLine(team))*d < 0) {
      placeBall(c.x, c.y);
      deadBall(() => scrum(1-team, c.x, c.y, 'Held in Goal'));
      return;
    }
    placeBall(clamp(c.x,1,119), clamp(c.y,1,69));
    M.phaseCount++; M.stats.rucks++;
    startSet({ kind:'ruck', team, x:clamp(c.x,1,119), y:clamp(c.y,1,69), t:o.dom ? DOM_RUCK : 1.05, dom:!!o.dom, domP:o.domP, then:resolveRuck });
    return;
  }
  c.vx *= 0.2; c.vy *= 0.2; c.drop = null;
  if ((c.x-ownLine(team))*d < 0) {
    c.down = 1.25; q.down = 1.0; q.tcd = 1.0;
    placeBall(c.x, c.y);
    deadBall(() => scrum(1-team, c.x, c.y, 'Held in Goal'));
    return;
  }
  const bx = clamp(c.x - d*0.4, 1, 119), by = clamp(c.y, 1, 69), ball = { x:bx, y:by };   // the ball goes behind the tackled man
  placeBall(bx, by);
  M.phaseCount++; M.stats.rucks++;
  const tier = o.tier, sy = q.y >= by ? 1 : -1;
  c.x = clamp(bx + d*0.45, 0.5, 119.5); c.y = by;
  // the race to the ball sets the ruck's length: the attack's first support against the defence's first man other than the tackler
  let tA = 99;
  for (const p of M.players) if (p.team === team && p !== c && onFeet(p)) tA = Math.min(tA, dist(p, ball)/(0.85*maxSpeed(p)) + 0.15 - RUCK.attHead);
  tA = Math.max(0.1, tA);
  const q2 = o.q2 && o.q2.down <= 0 ? o.q2 : null;
  let tD = q2 ? 0.15 : 99;
  for (const p of M.players) if (p.team !== team && p !== q && p !== q2 && onFeet(p) && !(p.offside > 0) && dist(p, ball) <= RUCK.gate && (p.x - bx)*d >= -0.5) tD = Math.min(tD, dist(p, ball)/(0.85*maxSpeed(p)) + 0.15);
  const t = tier === 'dom' ? RUCK.t.slow : (tA + RUCK.quickLead < tD ? RUCK.t.quick : RUCK.t.normal);
  st(t <= RUCK.t.quick ? 'ruck_quick' : t >= RUCK.t.slow ? 'ruck_slow' : 'ruck_normal');
  c.down = t + 0.15;
  slide(q, clamp(bx + d*1.0, 0.5, 119.5), clamp(by + sy*1.1, 1, 69), 0.15);   // the tackler rolls away, then retires: no tackle and no chasing until he is back
  q.vx = q.vy = 0; q.down = t + 0.25; q.tcd = q.offside = t + 0.25 + RUCK.retire;
  if (q2) { q2.offside = t + 0.25 + RUCK.retire; q2.tcd = Math.max(q2.tcd, q2.offside); }   // the man who joined is in the ruck too, and retires for as long as the tackler
  startSet({ kind:'ruck', team, x:bx, y:by, t, tier, tA, tD, tackler:q, then:resolveRuck });
}
function wrongFoot(team, x, y) {                           // the side that lost the ball, near it, is caught on the wrong side: slow and unable to tackle for a moment
  for (const p of M.players) if (p.team !== team && hyp(p.x - x, p.y - y) < RUCK.wf.r) { p.tcd = Math.max(p.tcd, RUCK.wf.t); p.wf = RUCK.wf.t; st('wfMen'); }
}
function resolveRuck(s) {                                  // the ruck is automatic: a flat penalty roll, then a flat turnover roll
  const att = s.team, def = 1-att;
  if (rnd() < RUCK.pen) { penalty(rnd() < 0.55 ? def : att, s.x, s.y); return; }
  const pT = s.dom ? s.domP : RUCK.flatBase + (M.nat[def].power - M.nat[att].power)*0.02 + (cpuSide(def) ? diffOf(def).turnover : -diffOf(def).turnover);   // the level's turnover edge for a CPU defence, against a human one
  if (rnd() < clamp(pT, 0.03, s.dom ? 0.40 : 0.18)) {
    M.stats.turnovers++; st('toRuck'); say('Turnover', 'small'); heat(def, 'turnover');
    releaseTo(def, s.x, s.y, 'turnover');
    if (s.tier) wrongFoot(def, s.x, s.y);
    if (s.dom) surge(def, LINE_SPEED);                     // Line Speed for the side that made the Big Hit
    return;
  }
  releaseTo(att, s.x, s.y, 'ruck', s.picker);
  if (s.dom) surge(def, LINE_SPEED);
}
// a Drop Goal press: the 0.20s to the close-up is the kicker's, and a man close enough to stop it is judged as a charger in the cut
const dropHolding = c => !!c && !!M.dropArmed[c.team] && !!sideOf(c.team).charging && M.ball.carrier === c;
function tackleChecks(c) {
  if (dropHolding(c)) return false;
  for (const q of M.players) {
    if (q.team === c.team || q.down > 0 || q.tcd > 0 || q.offside > 0 || q.bind) continue;
    const user = ringed(q);
    if (dist(q,c) < (user ? 1.35 : 1.5)) { commitTackle(q, c, user ? 'contact' : 'ai'); return true; }   // the first man to commit takes him; nobody else rolls while he is bound
  }
  return false;
}
function collide() {                                       // standing men push apart; a man on the ground, or one bound in a tackle, is stepped round; team-mates stop jostling
  const P = M.players, R = 1.25, RD = CONTACT.downR;
  for (let i = 0; i < P.length; i++) {
    const a = P[i];
    for (let j = i+1; j < P.length; j++) {
      const c = P[j];
      if (a.bind && a.bind === c.bind) continue;             // the men in one bind hold each other: bindMove owns them
      const ad = a.down > 0 || !!a.bind, cd = c.down > 0 || !!c.bind;   // a bound man stays put like a man on the ground, and everyone else steps round him
      if (ad && cd) continue;
      const dx = c.x-a.x, dy = c.y-a.y, d2 = dx*dx + dy*dy, r = (ad || cd) ? RD : R;
      if (d2 >= r*r) continue;
      const d = Math.sqrt(d2), o = Math.min(r - d, (ad || cd) ? 0.2 : 0.4), nx = d > 1e-3 ? dx/d : 1, ny = d > 1e-3 ? dy/d : 0;   // eased out by at most 0.2m a step round a man on the ground or bound (one getting up inside a crowd is not shoved), 0.4m between standing men so they never sink into each other; an exact overlap is parted along the touchline axis rather than left
      if (ad) { c.x += nx*o; c.y += ny*o; }
      else if (cd) { a.x -= nx*o; a.y -= ny*o; }
      else {
        a.x -= nx*o/2; a.y -= ny*o/2; c.x += nx*o/2; c.y += ny*o/2;
        const rv = (c.vx - a.vx)*nx + (c.vy - a.vy)*ny;
        if (rv < 0 && a.team === c.team) { a.vx += nx*rv/2; a.vy += ny*rv/2; c.vx -= nx*rv/2; c.vy -= ny*rv/2; }   // opponents are not damped: a shadowing defender must not become a wall
      }
    }
  }
}

/* ---------- Sprint ----------
   One meter a side, M.spr[t]. Holding Sprint lifts the controlled man's top speed and drains the meter over SPRINT.secs; letting
   go refills it over SPRINT.refill[level]. A sprint needs SPRINT.floor to start, and a hold that runs the meter dry must be let go
   before the next. The AI side runs the same meter, as often as its level's policy says, for a chaser or its carrier. */
const sprintLevel = p => p.sprint > 0 ? Math.min(1, p.sprint/SPRINT.fade) : 0;   // p.sprint is the burst in seconds of SPRINT.fade: full while held, easing out over SPRINT.fade after a release, climbing back from where it is if he is held again inside that
function sprintable(p) { return !!p && M.phase === 'play' && onFeet(p) && !(p.offside > 0); }
function stopSprint(S) { const p = S.p; if (!p) return; p.sprinting = false; S.p = null; }   // the ease-out runs on from his level now, and sprintTick charges it to the meter
function endSprint(p) { const S = M.spr[p.team]; if (S.p === p) stopSprint(S); p.sprint = 0; }   // a commit or a bind ends the sprint outright: no ease-out to pay for
function startSprint(S, p) {
  const fresh = !(p.sprint > 0);                           // inside his own ease-out the burst climbs back at the fade's rate: a re-press never snaps to full speed
  S.p = p; p.sprinting = true; if (fresh) p.sprint = SPRINT.fade;
  st(isHuman(p.team) ? 'sprints' : 'cpuSprints');
  if (isHuman(p.team) && fresh) { sfx('whoosh'); buzz(15, p.team); }
}
function bestChaser(team) {                                // the nearest man of this side on his feet to the other side's carrier
  const b = M.ball, c = b.state === 'held' ? b.carrier : null; if (!c || c.team === team) return null;
  let best = null, bd = 1e9;
  for (const p of M.players) if (p.team === team && onFeet(p) && !(p.offside > 0)) { const d = dist(p, c); if (d < bd) { bd = d; best = p; } }
  return best;
}
function sprintPick(t) {                                   // the man a Sprint press would move the ring to: the best chaser when yours is down or another is over SPRINT.pick nearer their carrier; null to stay put
  const b = M.ball, p = ctrlOf(t), c = b.state === 'held' && b.carrier.team !== t ? b.carrier : null, best = c ? bestChaser(t) : null;
  return c && best && best !== p && (!p || !onFeet(p) || dist(p, c) - dist(best, c) > SPRINT.pick) ? best : null;
}
function sprintOn(t) {                                     // would a Sprint press act now: the meter over the floor (or a sprint running), not latched, and the man it would go to able to sprint
  const S = M.spr[t];
  return M.phase === 'play' && !S.spent && (!!S.p || S.m >= SPRINT.floor) && sprintable(sprintPick(t) || ctrlOf(t));
}
function sprintPress(t) {                                  // the press edge: a dim button does nothing, not even a switch; otherwise the ring moves to the man who can chase and the hold will act
  if (!isHuman(t) || !sprintOn(t)) return false;
  const best = sprintPick(t);
  if (best) { setCtrl(t, best); st('sprintPick'); }
  return true;
}
function gapAhead(c) { const d = dirOf(c.team); let m = 99; for (const q of M.players) if (q.team !== c.team && onFeet(q) && (q.x - c.x)*d > -1) m = Math.min(m, dist(q, c)); return m; }
function ahead(c, t) { const d = dirOf(c.team); let n = 0; for (const q of M.players) if (q.team === t && q.down <= 0 && (q.x - c.x)*d > 0 && Math.abs(q.y - c.y) < SPRINT.cpu.lane) n++; return n; }   // defenders of side t still ahead of the carrier, in his lane
function cleanThrough(c, t) { return ahead(c, t) === 0; }
function cpuSprintWant(t, S, dt) {                         // the AI side's policy: who should be sprinting on its meter this step, if anyone
  if (S.spent) { S.spent = false; return null; }
  const b = M.ball; if (b.state !== 'held') return null;
  const c = b.carrier, d = dirOf(c.team), P = SPRINT.cpu, lv = levelOf(t);
  const think = p => { S.think -= dt; if (S.think > 0) return false; S.think = P.think; return rnd() < p; };
  if (c.team === t) {                                      // carrying: a burst into a clean break, kept while the space lasts
    if (c.drop) return null;
    const gap = gapAhead(c);
    if (S.p === c) return gap > P.keep ? c : null;
    if (!P.carry[lv] || gap < P.space || ahead(c, 1 - t) > P.carryLast[lv]) return null;
    return think(P.carry[lv]) ? c : null;
  }
  if (S.p) { const q = S.p, dd = dist(q, c); return (q.team === t && dd > 1.5 && dd < P.max + 3 && (q.x - c.x)*d <= 1.5) ? q : null; }
  const q = bestChaser(t); if (!q) return null;
  const dd = dist(q, c);
  if (dd < P.min || dd > P.max || (q.x - c.x)*d > 1) return null;   // chasing from level or behind
  if (ahead(c, t) > P.chaseLast[lv]) return null;          // only a runner who is through (or past all but the last man, on Hard): the sprint is the last line, not every chase
  return think(P.chase[lv]) ? q : null;
}
function sprintWant(t, dt) {
  const S = M.spr[t];
  if (isHuman(t) && !inputOf(t).cDown) S.spent = false;   // letting go clears the spent latch whatever the phase: a release during a ruck counts
  if (M.phase !== 'play') return null;
  if (!isHuman(t)) return cpuSprintWant(t, S, dt);
  return S.spent || !inputOf(t).cDown ? null : ctrlOf(t);
}
function sprintTick(dt) {                                  // after the close-up return in update(), so the meters freeze in scrums, lineouts, duels and goal kicks
  for (let t = 0; t < 2; t++) {
    const S = M.spr[t], want = sprintWant(t, dt), c = M.ball.carrier;
    if (S.p && (S.p !== want || !sprintable(S.p))) stopSprint(S);
    if (want && !S.p && S.m >= SPRINT.floor && sprintable(want)) startSprint(S, want);
    let drain = 0;                                         // the hold and every ease-out on this side are charged by their level, x1.5 with the ball: a tap buys no more than a hold, and nothing refills while a burst is easing out
    for (const p of M.players) if (p.team === t && p.sprint > 0) {
      if (!onFeet(p)) { p.sprint = 0; continue; }           // down or bound: the sprint is over, and nothing is charged for an ease-out that can't move him
      drain += sprintLevel(p)*(c === p ? SPRINT.ballDrain : 1)*(M.career ? careerSprintDrain(p) : 1);   // a career match: your player's stamina
    }
    if (drain > 0) {
      S.m -= dt/SPRINT.secs*drain; if (S.p) st(isHuman(t) ? 'sprintSecs' : 'cpuSprintSecs', dt);
      if (S.m <= 0) { S.m = 0; if (S.p) { S.spent = true; stopSprint(S); } for (const p of M.players) if (p.team === t) p.sprint = 0; }   // dry: the burst and any ease-out end at once
    }
    else if (S.m < 1) { S.m = Math.min(1, S.m + dt/SPRINT.refill[levelOf(t)]); if (S.m >= 1) { S.cue = 0.5; if (isHuman(t) && M.dclock - S.tick > 3) { S.tick = M.dclock; sfx('tick'); } } }
    if (S.cue > 0) S.cue -= dt;
  }
}
function carrierChecks(c) {
  const d = dirOf(c.team);
  if (c.y < 0 || c.y > 70) {
    placeBall(c.x, clamp(c.y,0,70)); sfx('whistle');
    deadBall(() => lineout(1-c.team, c.x, c.y, 'Into Touch'));
    return true;
  }
  if ((c.x-oppLine(c.team))*d >= 0.3) { scoreTry(c); return true; }
  if (c.team === 0 ? c.x < 0 : c.x > 120) {
    placeBall(c.x, c.y);
    deadBall(() => scrum(1-c.team, c.x, c.y, 'Dead Ball'));
    return true;
  }
  return false;
}

