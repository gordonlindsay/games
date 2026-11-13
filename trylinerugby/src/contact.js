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
const matchMild = () => !!(M && (M.kids || catOf(M.nat[0]) === 'minis'));   // a Kids match, or a Minis one (Men | Women | Minis: every side of a match is one category)
function tag(text, x, y, o) {                              // o: a possession call's extras (src/calls.js): k its side's colour, call, p the man it follows
  if (M.auto) return;
  if (!(o && o.call)) st('tag_' + text);                  // a possession call is counted as a call (call_*, src/calls.js), not as a tag
  M.tags.push(o ? { text, x, y, t:0, ...o } : { text, x, y, t:0 });
  while (M.tags.length > 2) { const i = M.tags.findIndex(t => !callFresh(t)); M.tags.splice(i < 0 ? 0 : i, 1); }   // at most two: the oldest goes, but a call in its time never makes way for a tag (src/calls.js)
}
function impact(x, y) { M.fx.push({ x, y, t:0 }); }
function hitStop(ms, shake) { if (!interactive()) return; M.stop = ms/1000; if (!RM && shake !== 0) M.shake = M.shakeT = shake || 0.12; }   // shake: its length, which also sets its size; 0 holds the world with no shake (a Line Break, src/edge.js)
function commitTackle(q, c, mode) {                        // mode: 'ai' (an AI defender's reach), 'contact' (your ringed man's automatic tackle), 'dive' (a Tackle press), 'ankle' (a dive from behind)
  const d = dirOf(c.team), rx = q.x - c.x, ry = q.y - c.y, rm = hyp(rx, ry) || 1;
  const cv = hyp(c.vx, c.vy), cosF = cv > 0.5 ? (rx*c.vx + ry*c.vy)/(rm*cv) : rx*d/rm;
  const behind = (q.x - c.x)*d < -0.3, sideOn = !behind && Math.abs(cosF) < 0.5;
  let p = mode === 'ankle' ? CONTACT.ankle : tackleChance(q, c, mode);
  if (sideOn && mode !== 'ankle') p = Math.min(0.95, p*CONTACT.side);
  const p0 = p;                                            // the hold without a Hand-Off
  p *= traitHold(c, mode);                                 // a Hand-Off carrier breaks more (src/traits.js)
  q.tcd = 1.0;
  st('ta' + c.team);
  const qs = !!q.sprinting, cs = !!c.sprinting, dp = (M.career ? careerAbility(q, 'power') - careerAbility(c, 'power') : powerOf(q.team) - powerOf(c.team)) + traitEdge(q, c);   // both read the hold itself, not an ease-out: a tap buys no Big Hit bonus and no Fend. A career match: your player's own power, faded as his side's; an Engine keeps most of what his side has faded (src/traits.js)
  const r = rnd();
  let tier = 'broken', hit = false;
  if (r < p) {
    const closing = ((c.vx - q.vx)*rx + (c.vy - q.vy)*ry)/rm;   // how fast the two are coming together along the line between them
    const dom0 = CONTACT.dom.base + dp*CONTACT.dom.pow + (cosF > 0.5 && closing > 6 ? CONTACT.dom.front : 0) + (mode === 'dive' && rm < 1.7 ? CONTACT.dom.dive : 0) + (qs ? CONTACT.dom.sprint : 0) + cpuEdge(q, c, CONTACT.dom.cpu);
    let dom = dom0 + traitDom(q);                          // a Crunch tackler hits harder
    let soft = CONTACT.soft.base + (behind ? CONTACT.soft.behind : 0) + (cv > 7 ? CONTACT.soft.fast : 0) - dp*CONTACT.soft.pow;
    if (mode === 'ankle') { dom = 0; soft = 1; }             // an ankle tap is always soft
    else { dom = clamp(dom, 0.03, 0.5); soft = clamp(soft, 0.05, 1 - dom); }
    const r2 = rnd();
    tier = r2 < dom ? 'dom' : r2 < dom + soft ? 'soft' : 'wrap';
    hit = tier === 'dom' && r2 >= clamp(dom0, 0.03, 0.5);   // a Big Hit only the Crunch made: the call-out's (src/traits.js)
    st('ts' + c.team);
  }
  st('tier_' + tier);
  countTk(q.team, tier !== 'broken');
  if (mode === 'ankle') { st('ankleTry'); if (tier !== 'broken') st('ankle' + q.team); }
  const k = { c, q, q2:null, mode, tier, t:0, T:tier === 'broken' ? 0 : CONTACT.bind, v0:{ x:c.vx, y:c.vy }, front:cosF > 0.3, aiOff:null, offloaded:false, margin:r - p, margin0:r - p0, hit, dp, cSprint:cs };   // margin0: without a Hand-Off
  endSprint(q);                                            // the sprint ends when he commits
  if (tier === 'broken') { resolveContact(k); return k; }
  endSprint(c);
  q.bind = k; c.bind = k; q.bindOff = { x:rx/rm*0.7, y:ry/rm*0.7 };
  M.contact = k; st('binds');
  sfx('tackle'); if (ringed(q) || ringed(c)) buzz(30);
  if ((!isHuman(c.team) || proRun(c)) && tier !== 'dom' && rnd() < CONTACT.off.cpu*(0.6 + 0.2*(M.nat[c.team].handling - 3))) k.aiOff = 0.10 + rnd()*0.15;   // the AI carrier tries an offload (Pro Mode: so does a teammate of yours)
  return k;
}
function releaseBind(k) { for (const p of [k.c, k.q, k.q2, k.mate]) if (p) p.bind = null; if (M.contact === k) M.contact = null; }   // k.mate: the man who joined a maul (src/maul.js)
function contactGuard() { const k = M.contact; if (!k) return; const b = M.ball; if (!(M.phase === 'play' && b.state === 'held' && b.carrier === k.c)) releaseBind(k); }
function bindMove(p, dt) {                                 // velocities through the bind: the carrier runs down (or is driven back), the tackler is pulled onto his hip
  const k = p.bind;
  if (p === k.c) {
    if (k.maul && k.maul.live) { p.vx = k.maul.v.x; p.vy = k.maul.v.y; return; }   // a maul driven in the world walks its ground (src/maul.js)
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
  if (maulStep(k, dt)) return;                             // the maul: the CPU's call, the join, the drive (src/maul.js). Nothing at all with MAUL.on false
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
function looseInContact(c, spill) {                        // the ball comes loose behind him, for anyone. spill: knocked loose by the pressure (PRESSURE)
  const b = M.ball, d = dirOf(c.team);
  tag('Loose Ball', c.x, c.y); sfx('fumble');
  b.state = 'loose'; b.carrier = null; b.f = null; b.last = c.team; b.kickInfo = null;
  b.x = c.x - d*0.4; b.y = c.y; b.z = 0.6; b.vx = -d*(2 + rnd()*3); b.vy = (rnd() - 0.5)*4; b.vz = 1.5;
  offMark(c.team, c.x);                                    // he played it last: his men in front of him are offside for it (CALLS, src/calls.js)
  c.hold = 0;
  if (pressLive()) eggStart(b, c.team, !!spill);           // it hops like Bouncy Egg's ball
}
function offload(k, user) {                                // user: the carrier's own Pass press while held; otherwise the AI's try
  const c = k.c;
  if (k.offloaded || k.tier === 'dom' || k.tier === 'broken') return false;
  const r = user ? offloadTarget(k) : supportFor(c);        // the press takes the man the label was lit for
  if (!r) return false;
  const p0 = M.kids && user ? KIDS.offload : CONTACT.off[k.tier]*(1 + (M.nat[c.team].handling - 3)*0.05), pOk = traitOffload(c, p0);   // Kids: an offload you press gets away. Safe Hands: most of his do
  st('offAtt'); k.offloaded = true;
  const q = k.q, q2 = k.q2;
  releaseBind(k);
  c.down = 0.9; q.down = 0.6; q.tcd = 1.0; if (q2) q2.tcd = 0.4;
  const ro = rnd();
  if (ro < pOk) {
    st('offloads'); st('off' + c.team); if (!traitOffloaded(c, ro, p0) && ringed(c)) tag('Offload', c.x, c.y); doPass(c, r, { skip:[q, q2].filter(Boolean) });   // Safe Hands says so when it saved the offload
    if (!user && callsLv('call') && isHuman(c.team) && M.ball.f) M.ball.f.call = 'Offload';   // a teammate the computer runs (Pro Mode): the man the ring is on hears it when he takes it (src/calls.js)
    return true;
  }
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
    const fend0 = k.cSprint || (Math.round(-k.dp) >= CONTACT.fend.pow && k.margin0 >= CONTACT.fend.margin);   // beaten by a clear margin with the power edge, or at a sprint: he keeps his speed. The edge to the nearest point, so the Stamina fade moves it only once the two sides have faded half a point apart. The margin a Hand-Off would have had without him: his own break is a Fend below anyway
    const fend = fend0 || traitFend(c, k.mode);              // a Hand-Off: every tackle he breaks is a Fend, an ankle tap from behind aside
    c.fend = 0.2; c.fendA = Math.atan2(q.y - c.y, q.x - c.x);
    let tripped = false;
    if (k.mode === 'ankle' && rnd() < CONTACT.trip.p) { c.stumble = CONTACT.trip.t; c.stumbleMul = CONTACT.trip.mul; st('trip'); tripped = true; }
    else if (!fend) { c.stumble = CONTACT.stumble[0]; c.stumbleMul = CONTACT.stumble[1]; }
    if (fend) { st('fends'); st('fend' + c.team); if (!traitBroke(c, k, fend0) && ringed(c)) tag('Fend', c.x, c.y); }   // a Hand-Off says so instead, when he decided it
    if (tripped) { sfx('trip'); if (ringed(q)) { tag('Tripped', c.x, c.y); buzz(20, q.team); } } else sfx('whiff');
    st('broken' + c.team); M.stats.broken++; heat(c.team, 'break');
    return;
  }
  if (tier === 'dom') {
    st('dom' + q.team);
    if (matchMild()) {                                       // the youngest: a plain word, no freeze, no shake and no praise for hitting hard (no Crunch call either). It draws no random number, so the match plays the same
      sfx('tackle'); buzz(20); if (M.arcade) heat(q.team, 'hit');
      if (ringed(q)) tag('Stopped', c.x, c.y);
    } else { impact(c.x, c.y); sfx('hit'); buzz(45); if (k.hit) traitCall(q, 'crunch', c.x, c.y);   // a Big Hit his Crunch made
    if (M.arcade) {                                          // arcade: the whole screen knows. Yours freezes and shakes hard; one on your carrier shakes too
      heat(q.team, 'hit');
      if (ringed(q)) { say('Big Hit', 'big hit', q.team); hitStop(ARCADE.hit.stop, ARCADE.hit.shake); }
      else if (ringed(c) && !RM && interactive()) M.shake = M.shakeT = ARCADE.hit.hitShake;
    } else if (ringed(q)) { tag('Big Hit', c.x, c.y); hitStop(70); } }
  }
  const spill = tier === 'dom' && M.arcade && (!knockLv('hit') || isHuman(q.team)) ? ARCADE.hit.jolt : 0;   // your arcade Big Hit spills it more: yours only (KNOCK.hit, src/knock.js; in Two Player both are yours)
  const jolt0 = (CONTACT.jolt[tier] || 0)*(1 + (3 - M.nat[c.team].handling)*0.15) + spill, jolt = jolt0 + traitJolt(q);   // the ball jolted loose in the tackle; a Crunch spills it more too
  if (practice && practiceTackle(c, q)) return;            // a drill takes a made tackle before the ball can jolt loose
  const rj = rnd(), kj = M.kids && isHuman(c.team) ? KIDS.jolt : 1;   // Kids: your carrier keeps hold of it
  if (globalThis.__knockSpy) globalThis.__knockSpy('jolt', c, { tier, q, spill, jolt0, jolt, kj, rj });   // the tools sort a jolt by its tier and the Big Hit's spill
  if (rj < jolt*kj) {
    st('jolts'); if (rj >= jolt0*kj) traitCall(q, 'crunch', c.x, c.y);   // a jolt his Crunch made
    c.down = 1.0; q.down = 0.6; q.tcd = 1.0;
    if (rnd() < CONTACT.jolt.fwd) { st('joltKnock'); knockOn(c, 'contact'); } else { st('joltLoose'); looseInContact(c); }
    return;
  }
  if (rj < pressJolt(c.team, jolt)*kj) {                   // the share the defence's pressure adds (PRESSURE): always loose, for anyone, never a knock-on scrum
    st('jolts'); st('pressSpill');
    c.down = 1.0; q.down = 0.6; q.tcd = 1.0;
    looseInContact(c, true);
    return;
  }
  if (k.mode === 'ankle') { sfx('trip'); if (ringed(q)) { tag('Ankle Tap', c.x, c.y); buzz(20, q.team); } }
  tackle(c, q, { tier, q2 });
}
function tackle(c, q, o) {
  if (practice && practiceTackle(c, q)) return;
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
      restart('heldInGoal', 1-team, c.x, c.y);
      return;
    }
    placeBall(clamp(c.x,1,119), clamp(c.y,1,69));
    M.phaseCount++; M.stats.rucks++;
    pressTackle(c, !!o.dom, clamp(c.x,1,119));             // no draw: the duels stay as they were
    startSet({ kind:'ruck', team, x:clamp(c.x,1,119), y:clamp(c.y,1,69), t:o.dom ? DOM_RUCK : 1.05, dom:!!o.dom, domP:o.domP, then:resolveRuck });
    return;
  }
  c.vx *= 0.2; c.vy *= 0.2; c.drop = null;
  if ((c.x-ownLine(team))*d < 0) {
    c.down = 1.25; q.down = 1.0; q.tcd = 1.0;
    placeBall(c.x, c.y);
    restart('heldInGoal', 1-team, c.x, c.y);
    return;
  }
  const bx = clamp(c.x - d*0.4, 1, 119), by = clamp(c.y, 1, 69), ball = { x:bx, y:by };   // the ball goes behind the tackled man
  placeBall(bx, by);
  M.phaseCount++; M.stats.rucks++;
  pressTackle(c, o.tier === 'dom', bx);
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
  if (rnd() < RUCK.pen) { restart('ruckPenalty', rnd() < 0.55 ? def : att, s.x, s.y); return; }
  const pT = s.dom ? s.domP : RUCK.flatBase + (powerOf(def) - powerOf(att))*0.02 + (cpuSide(def) ? diffOf(def).turnover : -diffOf(def).turnover);   // the level's turnover edge for a CPU defence, against a human one
  if (rnd() < clamp(pT, 0.03, s.dom ? 0.40 : 0.18)) {
    M.stats.turnovers++; st('toRuck'); say('Turnover', 'small', callCol(def)); heat(def, 'turnover');
    releaseTo(def, s.x, s.y, 'turnover');
    if (M.ball.carrier) { callWon(M.ball.carrier); possCall(M.ball.carrier, 'Turnover', true); }   // called over the man the ring goes to (src/calls.js)
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
  if (dropHolding(c) || c.grace > 0) return false;
  if (practice && practice.tagOnly) return drillTagCheck(c);   // the youngest play these drills with tags: no man here ever commits to a tackle
  for (const q of M.players) {
    if (q.team === c.team || q.down > 0 || q.tcd > 0 || q.offside > 0 || q.bind) continue;
    const user = ringed(q);
    if (!user && practice && practice.id === 'defend') continue;   // Defend a Breakaway: only the man you switched to tackles; a cover man left standing never does (training.js)
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

/* ---------- Pressure ----------
   Gordon, 2026-11-09: "after an amount of pressure, let's say consistent big hits or multiple tackles in a row ... and the ball's
   not really moving, this could spark a loose ball, which could then bounce egg style around. And obviously, whoever picks that up
   is able to take advantage of it." M.pressure[t] is the pressure on side t's possession, built by the other side's tackles: a made
   tackle (one that ends in a ruck) adds `rise` when the carrier had gained under `little` metres past the last breakdown's mark (or
   past where the possession began), and a Big Hit adds `hit` anywhere short of a real gain. It goes back to 0 on a real gain (the
   carrier `gain` metres past the mark), a kick, a change of possession, a set piece, a try, and when the ball goes loose. From the
   `line` up it scales the tackle's jolt chance by (1 + `per` x (count - line + 1)), the whole chance capped at `cap` (`capMild` for
   Kids and Minis, matchMild), never below the chance at no pressure; the share over that is a pressure spill, which always goes loose (never straight to a
   knock-on scrum), and the side that gathers it from the other gets the surge (surge(), src/set-pieces.js) for `surge` seconds.
   'Pressure On' is tagged the first time a possession's count reaches `line`. Both sides play the same rule. A pressure spill is the
   ball knocked loose in the tackle, before any ruck: the ruck itself is as it was, with its one flat turnover roll and no new penalty.
   egg: the hop of a ball spilled in the tackle (a jolt or a failed offload) or knocked on, Bouncy Egg's model (hopMove and
   hopBounce, src/ball.js) at match levers: a first hop of 0.6 to 1.4m, lower than the drill's, and gathered only below `reach`
   (0.5m, by the knees; any other loose ball, 1.0m as ever). knock: the seconds a knocked-on ball hops before the whistle and the
   scrum. lead: how far ahead the chase looks at a hopping ball, in seconds of its flight.
   on:false with the maul off too (MAUL.on false) plays exactly as b706c3e did, draw for draw: PRESSURE='{"on":false}'
   MAUL='{"on":false}' node tools/sim.mjs. on:false alone plays as the maul's own build (wt/maul c4980b8). */
const PRESSURE = { on:true, little:3, gain:10, rise:1, hit:2, line:4, per:4, cap:0.25, capMild:0.08, surge:2.0, knock:0.8, lead:0.6,
  egg:{ pop:[3.4, 5.2], hopOut:[2.0, 4.0], keep:[0.55, 0.72], turn:[0.45, 1.3], slow:0.72, stop:1.15, roll:2.5, wild:0.6, spin:[6, 9], reach:0.5 } };
const pressLive = () => PRESSURE.on && !practice && !!M.press;   // a match: a drill never has it
function pressZero() { M.pressure[0] = M.pressure[1] = 0; }
function pressReset() { const P = M.press; pressZero(); P.poss = null; P.mark[0] = P.mark[1] = null; P.said[0] = P.said[1] = false; }   // a set piece, a try, a restart: the next possession starts clean
function pressJolt(t, j) {                                 // the jolt chance with the defence's pressure on side t's carrier: never under j, never over the cap
  const n = pressLive() ? M.pressure[t] - PRESSURE.line + 1 : 0;   // nothing below the line: Pressure On is the warning
  return n > 0 ? Math.max(j, Math.min(matchMild() ? PRESSURE.capMild : PRESSURE.cap, j*(1 + PRESSURE.per*n))) : j;
}
function pressTackle(c, dom, mx) {                         // a made tackle that ends in a ruck at mx: the count rises if the ball has hardly moved, and mx is the new mark
  if (!pressLive()) return;
  const P = M.press, t = c.team, d = dirOf(t), gain = P.mark[t] == null ? 0 : (c.x - P.mark[t])*d, n0 = M.pressure[t];
  if (dom && gain < PRESSURE.gain) M.pressure[t] += PRESSURE.hit;
  else if (gain < PRESSURE.little) M.pressure[t] += PRESSURE.rise;
  P.poss = t; P.mark[t] = mx;
  if (n0 < PRESSURE.line && M.pressure[t] >= PRESSURE.line && !P.said[t]) { P.said[t] = true; st('pressOn'); tag('Pressure On', c.x, c.y); }   // once a possession, so the player learns the word
}
function eggStart(b, team, spill, spin) {                  // the ball is an egg from here: its hops are drawn in the sim, and drawBall tumbles it. spin: given, or drawn
  const K = PRESSURE.egg;
  b.egg = { g:9.8, hops:[], hopV:0, spin:spin != null ? spin : (rnd() < 0.5 ? -1 : 1)*(K.spin[0] + rnd()*(K.spin[1] - K.spin[0])), rolling:false, spill, team };
  b.tumble = 0;
}
function pressGather(p, E) {                               // a pressure spill gathered by the other side: the turnover gets the surge
  if (!E.spill || p.team === E.team || M.ball.state !== 'held' || M.ball.carrier !== p) return;
  st('pressTurn'); surge(p.team, PRESSURE.surge);
}
function knockBeat(p) {                                    // a knock-on in a match: the ball hops on for PRESSURE.knock seconds, then the whistle and the scrum (knockOn, src/match.js)
  if (!pressLive() || !(PRESSURE.knock > 0)) return false;
  const b = M.ball, d = dirOf(p.team), team = 1 - p.team, x = p.x, y = p.y, K = PRESSURE.egg;
  b.z = 1.0; b.vx = d*2.2 + 0.25*p.vx; b.vy = 0.25*p.vy; b.vz = 1.2;   // forward out of his hands, on along his run: that is what a knock-on is. No draw until it lands: the hops are the egg's
  eggStart(b, p.team, false, (p.vy >= 0 ? 1 : -1)*(K.spin[0] + K.spin[1])/2);
  const late = M.hooter && !M.demo;                        // the dead ball is decided at the knock-on, as deadBall does without the beat: one before the hooter keeps its scrum if the hooter goes in the beat
  startSet({ kind:'knock', team, x, y, t:PRESSURE.knock, then:() => { sfx('whistle'); if (late) endHalf(); else restartNow('knockOn', team, x, y); } });
  return true;
}
function eggLead(b) {                                      // where the chase runs for a hopping ball: where this hop comes down, or a little ahead of a roll; any other ball, where it is
  const E = b.egg;
  if (!E || !pressLive()) return b;
  const t = E.rolling ? Math.min(PRESSURE.lead, 1/PRESSURE.egg.roll) : Math.min(PRESSURE.lead, (b.vz + Math.sqrt(Math.max(0, b.vz*b.vz + 2*E.g*b.z)))/E.g);
  return { x:b.x + b.vx*t, y:b.y + b.vy*t };
}
function eggChaser(t, S) {                                 // the CPU sprints its nearest man at a hopping ball, 2.5 to 12m off, with no draw; he keeps it while he is still the nearest
  const L = eggLead(M.ball); let best = null, bd = 1e9;
  for (const p of M.players) if (p.team === t && onFeet(p) && !(p.offside > 0) && !(callsLv('fit') && offsideMan(p))) { const dd = dist(p, L); if (dd < bd) { bd = dd; best = p; } }   // never a man who may not play it (src/calls.js)
  if (!best) return null;
  if (S.p) return S.p === best && bd > 1 ? best : null;
  return bd >= SPRINT.cpu.min && bd <= SPRINT.cpu.max ? best : null;
}
function pressTick(dt) {                                   // once a step in a match (matchUpdate): the resets, the possession's mark, and a knocked-on ball's beat
  if (!pressLive()) return;
  const b = M.ball, P = M.press;
  if (M.phase === 'set') {
    if (M.set.kind === 'knock') { if (b.egg) { const K = PRESSURE.egg; if (hopMove(b, b.egg, K, dt)) hopBounce(b, b.egg, K, K.wild); if (b.x < 0 || b.x > 120 || b.y < 0 || b.y > 70) { b.x = clamp(b.x, 0, 120); b.y = clamp(b.y, 0, 70); b.vx = b.vy = 0; } } }   // dead already: it stays on the field and nobody gathers it
    else if (M.set.kind !== 'ruck') pressReset();
    return;
  }
  if (M.phase !== 'play') { if (M.phase === 'goal') pressReset(); return; }
  if (b.state === 'loose' || (b.state === 'air' && b.f && b.f.kind !== 'pass')) { pressZero(); return; }   // a loose ball or a kick lets the pressure go
  if (b.state !== 'held') return;
  const c = b.carrier, t = c.team;
  if (P.poss !== t) { pressZero(); P.said[0] = P.said[1] = false; P.poss = t; P.mark[t] = c.x; P.mark[1 - t] = null; return; }   // a new possession, marked where it began
  if (P.mark[t] == null) P.mark[t] = c.x;
  else if (M.pressure[t] > 0 && (c.x - P.mark[t])*dirOf(t) >= PRESSURE.gain) M.pressure[t] = 0;   // a real gain
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
  if (fresh) traitSprint(p);                               // Burst, or Engine late on, says so
}
function bestChaser(team) {                                // the nearest man of this side on his feet to the other side's carrier
  const b = M.ball, c = b.state === 'held' ? b.carrier : null; if (!c || c.team === team) return null;
  let best = null, bd = 1e9;
  for (const p of M.players) if (p.team === team && onFeet(p) && !(p.offside > 0)) { const d = dist(p, c); if (d < bd) { bd = d; best = p; } }
  return best;
}
function sprintPick(t) {                                   // the man a Sprint press would move the ring to: the best chaser when yours is down or another is over SPRINT.pick nearer their carrier; null to stay put
  if (practice && practice.id === 'defend' && ctrlOf(t) !== practice.initialCtrl) return null;   // Defend a Breakaway: once you have switched into cover, Sprint never hands the ring back to the beaten man
  const b = M.ball, p = ctrlOf(t), c = b.state === 'held' && b.carrier.team !== t ? b.carrier : null, best = c ? bestChaser(t) : null;
  return c && best && best !== p && !proPinned(t) && (!p || !onFeet(p) || dist(p, c) - dist(best, c) > SPRINT.pick) ? best : null;   // Pro Mode: the ring never moves
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
  const b = M.ball;
  if (b.state === 'loose' && b.egg && pressLive()) return eggChaser(t, S);   // a hopping ball: run it down (PRESSURE)
  if (b.state !== 'held') return null;
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
      drain += sprintLevel(p)*(c === p ? SPRINT.ballDrain : 1)*(M.career ? careerSprintDrain(p) : 1)*traitDrain(p);   // a career match: your player's stamina. An Engine's sprint costs less
    }
    if (drain > 0) {
      S.m -= dt/(SPRINT.secs*staminaLasts(t))*drain; if (S.p) st(isHuman(t) ? 'sprintSecs' : 'cpuSprintSecs', dt);
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
    restart('touchCarried', 1-c.team, c.x, c.y);
    return true;
  }
  if ((c.x-oppLine(c.team))*d >= 0.3) { scoreTry(c); return true; }
  if (c.team === 0 ? c.x < 0 : c.x > 120) {
    placeBall(c.x, c.y);
    restart('deadBallCarried', 1-c.team, c.x, c.y);
    return true;
  }
  return false;
}

