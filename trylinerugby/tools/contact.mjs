// Contact, the ruck and Sprint: staged binds and broken tackles, the tier table against its closed form, the Second Man,
// collisions (men on the ground and bound pairs stepped round), the ruck race and the roll-away, wrong-footing, every
// timer running out, the Tackle press rule, the Sprint meter (hold to sprint, the floor, the refill, the ease-out charged
// to the meter so taps buy nothing, the dim state and the press agreeing), the CPU's meter and policy on every level,
// offloads (the label and the press picking one receiver), the ball jolted loose, trips, fends, a census of 60 bot
// matches, that duels and goal kicks draw no new random number, the ring through a ruck (on the man who will pick the
// ball up, the stick placing him, Pass Kick and Tackle dead), the words, the three-button layout and a render smoke
// test. Exits 1 on any failure. Seed-proof: every staged bind that must end in a ruck runs with the jolt switched off.
// node tools/contact.mjs            (SEED=7 unless set; 1, 5, 7, 14 and 99 are run before a change ships)
process.env.SEED ??= '7';
import fs from 'fs';
const { T, bot, rndCalls, reseed } = await import('./harness.mjs');
const C = T.contact, { CONTACT, RUCK, SPRINT } = C, STEP = T.STEP, M = () => T.M, inp = T.input;
const html = fs.readFileSync(new URL(process.env.GAME || '../index.html', import.meta.url), 'utf8'), script = html.match(/<script>([\s\S]*)<\/script>/)[1];
const doc = globalThis.document, $ = id => doc.getElementById(id);
const hyp = Math.hypot, clamp = (v, a, b) => v < a ? a : v > b ? b : v, dist = (a, b) => hyp(a.x - b.x, a.y - b.y), dirOf = t => t === 0 ? 1 : -1;
const near = (a, b, e) => Math.abs(a - b) <= e;
let failed = 0, passed = 0, group = '';
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', group + ':', msg); } };
const done = name => { console.log(`${name.padEnd(26)} ${failed ? 'FAIL so far ' + failed : 'ok'} (${passed} passed)`); };
const begin = name => { group = name; };
const snap = o => JSON.parse(JSON.stringify(o)), restore = (o, s) => { for (const k of Object.keys(o)) delete o[k]; Object.assign(o, snap(s)); };
const C0 = snap(CONTACT), R0 = snap(RUCK), S0 = snap(SPRINT);
const reset = () => { restore(CONTACT, C0); restore(RUCK, R0); restore(SPRINT, S0); };
const noJolt = () => { CONTACT.jolt.dom = CONTACT.jolt.wrap = CONTACT.jolt.soft = 0; };   // a staged bind that must end in a ruck: the 9 / 2 / 1% jolt would make it a scrum or a loose ball on some seeds
const fresh = (diff = 1, o = {}) => T.newMatch(o.a ?? 0, o.b ?? 1, { halfLen:240, diff, headless:true, duels:'off', ...o });
const steps = (n, drive) => { for (let i = 0; i < n; i++) { if (drive) drive(); T.update(STEP); } };
const run = (pred, max = 2000, drive) => { for (let i = 0; i < max && !pred(); i++) { if (drive) drive(); T.update(STEP); } return pred(); };
// a carrier of team ct at (cx, cy) running (cvx, cvy), a tackler at (qx, qy) running (qvx, qvy), everyone else parked well away.
// ctrl: 'c' (the carrier, team 0 only), 'q' (the tackler, team 0 only) or 'none' (a far man of yours). Returns { c, q, own, opp }.
function stage(o) {
  const m = M(), P = m.players, b = m.ball, ct = o.ct ?? 0, d = dirOf(ct);
  m.phase = 'play'; m.set = null; m.cut = null; m.clock = 30; m.dclock = 100; m.hooter = false; m.charging = false; m.surge = null; m.contact = null; m.duelPending = null; m.goal = null; m.tags = []; m.fx = [];
  for (const p of P) Object.assign(p, { vx:0, vy:0, down:0, tcd:0, side:-1, boost:0, boostMul:1, hold:2, drop:null, quick:false, bind:null, offside:0, sprint:0, sprinting:false, stumble:0, stumbleMul:1, wf:0, drawFrom:null, fend:0, think:0 });
  for (const S of m.spr) { S.p = null; S.spent = false; S.m = 1; S.cue = 0; S.think = 0; }
  const own = P.filter(p => p.team === ct), opp = P.filter(p => p.team !== ct);
  own.forEach((p, i) => { p.x = clamp(o.cx - d*(24 + 3*i), 1, 119); p.y = 4 + i*10; p.fx = d; p.fy = 0; });   // team-mates out of passing range behind him
  opp.forEach((p, i) => { p.x = clamp(o.cx - d*(40 + i), 1, 119); p.y = 4 + i*10; p.fx = -d; p.fy = 0; });   // the other side well behind him too: nobody between him and the line
  const c = own[0], q = opp[0];
  const face = (p, vx, vy, def) => { const s = hyp(vx, vy); if (s > 0.5) { p.fx = vx/s; p.fy = vy/s; } else { p.fx = def; p.fy = 0; } };
  Object.assign(c, { x:o.cx, y:o.cy, vx:o.cvx ?? 0, vy:o.cvy ?? 0 }); face(c, c.vx, c.vy, d);
  Object.assign(q, { x:o.qx ?? o.cx + d*40, y:o.qy ?? o.cy, vx:o.qvx ?? 0, vy:o.qvy ?? 0 }); face(q, q.vx, q.vy, -d);
  b.state = 'held'; b.carrier = c; b.f = null; b.last = ct; b.kickInfo = null; b.x = c.x + c.fx*0.55; b.y = c.y + c.fy*0.55; b.z = 1; b.vx = b.vy = b.vz = 0;
  m.poss = ct; m.phaseCount = 2; m.charging = false;
  m.ctrl = o.ctrl === 'c' ? c : o.ctrl === 'q' ? q : P.find(p => p.team === 0 && p !== c && p !== q);
  m.ctrlPrev = m.ctrl; m.ctrlT = 1;
  inp.jx = inp.jy = 0; inp.aPressed = inp.bPressed = inp.cPressed = false; inp.aDown = inp.bDown = inp.cDown = false; inp.keys.clear();
  return { c, q, own, opp };
}
// stage, then commit until the tackle sticks (the tier is then set as asked); the bind is left at its first step
function bind(o, mode, tier, tries = 400) {
  for (let i = 0; i < tries; i++) {
    const { c, q, own, opp } = stage(o);
    const k = C.commitTackle(q, c, mode);
    if (k.T > 0) { if (tier) k.tier = tier; k.own = own; k.opp = opp; return k; }
  }
  return null;
}
function broken(o, mode, tries = 400) {
  for (let i = 0; i < tries; i++) {
    const { c, q } = stage(o);
    const q0 = { x:q.x, y:q.y };
    const k = C.commitTackle(q, c, mode);
    if (k.tier === 'broken') { k.q0 = q0; return k; }
    C.releaseBind(k);
  }
  return null;
}
const FRONT = { cx:60, cy:35, cvx:8, qx:61.3, qy:35, qvx:-4, ctrl:'none' };   // a CPU defender meets your carrier head on
// the closed form of commitTackle for a stick, for a staged geometry: returns { p, dom, soft } (wrap is the rest)
function closed(o, mode, di = 1) {
  const { c, q } = stage(o), d = dirOf(c.team), rx = q.x - c.x, ry = q.y - c.y, rm = hyp(rx, ry), cv = hyp(c.vx, c.vy), cosF = cv > 0.5 ? (rx*c.vx + ry*c.vy)/(rm*cv) : rx*d/rm;
  const behind = (q.x - c.x)*d < -0.3, sideOn = !behind && Math.abs(cosF) < 0.5, dp = M().nat[q.team].power - M().nat[c.team].power;
  let p = mode === 'ankle' ? CONTACT.ankle : C.tackleChance(q, c, mode);
  if (sideOn && mode !== 'ankle') p = Math.min(0.95, p*CONTACT.side);
  const closing = ((c.vx - q.vx)*rx + (c.vy - q.vy)*ry)/rm, cpu = q.team === 1 && c.team === 0 ? CONTACT.dom.cpu[di] : 0;
  let dom = CONTACT.dom.base + dp*CONTACT.dom.pow + (cosF > 0.5 && closing > 6 ? CONTACT.dom.front : 0) + (mode === 'dive' && rm < 1.7 ? CONTACT.dom.dive : 0) + (o.sprint ? CONTACT.dom.sprint : 0) + cpu;
  let soft = CONTACT.soft.base + (behind ? CONTACT.soft.behind : 0) + (cv > 7 ? CONTACT.soft.fast : 0) - dp*CONTACT.soft.pow;
  if (mode === 'ankle') { dom = 0; soft = 1; } else { dom = clamp(dom, 0.03, 0.5); soft = clamp(soft, 0.05, 1 - dom); }
  return { p, dom, soft, closing, cosF };
}
function rates(o, mode, n = 20000, di = 1) {
  fresh(di);
  const cnt = { stick:0, dom:0, soft:0, wrap:0 };
  for (let i = 0; i < n; i++) {
    const { c, q } = stage(o);
    if (o.sprint) { q.sprinting = true; M().spr[q.team].p = q; }
    const k = C.commitTackle(q, c, mode);
    if (k.T > 0) { cnt.stick++; cnt[k.tier]++; C.releaseBind(k); }
  }
  return { stick:cnt.stick/n, dom:cnt.dom/n, soft:cnt.soft/n, wrap:cnt.wrap/n };
}

// 1. a staged front-on stick: the bind, the tackler on his hip, the carrier's speed by tier, one commit, a ruck
begin('bind');
for (const tier of ['wrap', 'soft', 'dom']) {
  fresh(1); noJolt();
  const k = bind(FRONT, 'ai', tier), { c, q } = k, v0 = hyp(c.vx, c.vy), ta0 = M().stats.ta0, binds0 = M().stats.binds;
  let n = 0, far = 0, back = false, last = v0;
  while (M().contact === k && n < 60) { T.update(STEP); n++; if (M().contact === k) { if (dist(q, c) > 1.0 && k.t > 0.1) far++; if (dist(q, c) > 1.5) far += 100; last = hyp(c.vx, c.vy); if (tier === 'dom' && k.t/k.T > 0.45 && c.vx*k.v0.x < 0) back = true; } }
  ok(near(n*STEP, CONTACT.bind, STEP + 1e-9), `${tier}: the bind lasts ${CONTACT.bind}s give or take a step (${n} steps)`);
  ok(far === 0, `${tier}: the tackler is pulled onto the carrier's hip: within 1.0m from 0.1s in, never beyond his reach (${far} steps out)`);
  if (tier === 'wrap') ok(last < 0.10*v0, `wrap ends under a tenth of the entry speed (${(100*last/v0).toFixed(1)}%)`);
  if (tier === 'soft') ok(last > 0.35*v0, `soft ends above 35% of the entry speed (${(100*last/v0).toFixed(1)}%)`);
  if (tier === 'dom') ok(back, 'a Big Hit drives him backwards after 40% of the bind');
  ok(M().phase === 'set' && M().set.kind === 'ruck' && M().set.tier === tier, `${tier}: the bind ends in a ruck of its tier (${M().phase} ${M().set && M().set.kind} ${M().set && M().set.tier})`);
  ok(M().stats.ta0 === ta0 && M().stats.binds === binds0, `${tier}: nobody else rolls or binds while he is bound`);
}
reset();
// the guard: a bind whose carrier no longer holds the ball in play is released before the next step moves anyone
{
  fresh(1); const k = bind(FRONT, 'ai', 'wrap'), { c, q } = k;
  M().ball.state = 'loose'; M().ball.carrier = null;
  T.update(STEP);
  ok(!M().contact && !c.bind && !q.bind, 'contactGuard releases a bind whose carrier has lost the ball');
}
// a third man within reach while a Second Man is already bound: no roll, no commit (tackleChecks is gated out by the bind)
{
  fresh(1); const k = bind(FRONT, 'ai', 'wrap'), { c, opp } = k, o2 = opp[1], o3 = opp[2];
  o2.x = c.x + 0.9; o2.y = c.y + 0.9; C.joinTackle(k, o2);
  o3.x = c.x + 1.1; o3.y = c.y - 0.5; o3.vx = -2;
  const ta0 = M().stats.ta0;
  steps(3);
  ok(M().contact === k && M().stats.ta0 === ta0 && o3.tcd === 0 && !o3.bind, 'a third defender within reach neither rolls nor binds during the bind');
}
// a CPU carrier who shaped to pass (a pending Block duel) and was bound in the same step: no pass leaves his hands, no duel starts
{
  fresh(1, { duels:'live' }); const k = bind({ ct:1, cx:60, cy:30, cvx:-4, qx:58.7, qy:30, qvx:4, ctrl:'none' }, 'ai', 'wrap');
  const R = k.own[1]; R.x = k.c.x + 4; R.y = k.c.y + 10; R.vx = -4;
  M().duelPending = { kind:'block', U:k.opp[1], O:k.c, R, P0:{ x:k.c.x, y:k.c.y }, P1:{ x:R.x, y:R.y }, L:{ x:(k.c.x + R.x)/2, y:(k.c.y + R.y)/2 }, how:'normal' };
  T.update(STEP);
  ok(M().ball.state === 'held' && M().ball.carrier === k.c && M().phase === 'play' && !M().duelPending, 'a pass pending at the moment he is tackled neither goes nor starts a duel');
}
// a bound carrier half a metre out on a Soft tackle still scores
{
  fresh(1); const k = bind({ ...FRONT, cx:109.5, qx:110.8, ctrl:'c' }, 'ai', 'soft'), tries0 = M().tries[0];
  run(() => M().tries[0] > tries0 || M().phase === 'set', 40);
  ok(M().tries[0] === tries0 + 1 && !M().contact, 'a bound carrier who crosses the line on a Soft tackle scores, and the bind is released');
}
done('1 bind');

// 2. a forced broken tackle: no bind, the carrier keeps his speed, the tackler slides off the hip, behind, down 0.5s (0.75s after a dive)
begin('broken');
for (const [mode, down] of [['ai', CONTACT.brokenDown], ['dive', CONTACT.diveDown]]) {
  fresh(1); M().diff.cpuTackle = 0; CONTACT.dive = [0, 0];
  const k = broken(FRONT, mode), { c, q } = k, v0 = hyp(c.vx, c.vy);
  ok(!!k && !M().contact && !c.bind && !q.bind, `${mode}: a broken tackle makes no bind`);
  const ux = c.vx/v0, uy = c.vy/v0, along = (q.x - c.x)*ux + (q.y - c.y)*uy, across = Math.abs((q.x - c.x)*uy - (q.y - c.y)*ux);
  ok(along < 0 && across >= 0.8, `${mode}: the tackler lands behind and at least 0.8m off the carrier's line (along ${along.toFixed(2)}, across ${across.toFixed(2)})`);
  ok(near(q.down, down, 1e-9) && q.tcd === 1.0, `${mode}: he is down ${down}s with a 1.0s cooldown (${q.down}, ${q.tcd})`);
  ok(near(c.fend, 0.2, 1e-9), `${mode}: the fend arm line is set for 0.2s at the commit (${c.fend})`);
  steps(12);
  ok(hyp(c.vx, c.vy) >= 0.88*v0, `${mode}: the carrier runs on at no less than 0.88x his speed (${(hyp(c.vx, c.vy)/v0).toFixed(3)})`);
  reset(); M().diff.cpuTackle = 0.64;
}
// a carrier standing still: the slide-off takes his facing, so the tackler never lands on top of him; with no facing either, the line from the tackler
{
  fresh(1); M().diff.cpuTackle = 0;
  const STILL = { cx:60, cy:35, cvx:0, qx:61.3, qy:35, qvx:-4, ctrl:'none' };
  const k = broken(STILL, 'ai'), { c, q } = k;
  ok(hyp(c.vx, c.vy) < 0.5 && c.fx === 1 && c.fy === 0, `the staged carrier is standing still, facing up the pitch (${hyp(c.vx, c.vy).toFixed(2)} m/s)`);
  const along = (q.x - c.x)*c.fx + (q.y - c.y)*c.fy, across = Math.abs((q.x - c.x)*c.fy - (q.y - c.y)*c.fx);
  ok(along < 0 && across >= 0.8 && dist(q, c) >= 0.8, `a missed tackle on a standing carrier lands the tackler behind him and off his line, not on top of him (along ${along.toFixed(2)}, across ${across.toFixed(2)})`);
  steps(30);
  ok(dist(q, c) >= 0.8, `and they are still apart half a second later (${dist(q, c).toFixed(2)}m)`);
  let k2 = null;
  for (let i = 0; i < 400 && !k2; i++) { const s = stage(STILL); s.c.fx = s.c.fy = 0; const kk = C.commitTackle(s.q, s.c, 'ai'); if (kk.tier === 'broken') k2 = kk; else C.releaseBind(kk); }
  ok(k2 && dist(k2.q, k2.c) >= 0.8 && (k2.q.x - k2.c.x) > 0.3, `with no run and no facing the slide-off takes the line from the tackler: he lands back where he came from, clear of the carrier (${k2 && dist(k2.q, k2.c).toFixed(2)}m)`);
  M().diff.cpuTackle = 0.64;
}
done('2 broken tackle');

// 3. tier and stick rates against the closed form, 20,000 seeded commits each, within 1.5 points
begin('rates');
reseed(11);
const CASES = [
  ['front-on AI, closing over 6 m/s', FRONT, 'ai'],
  ['side-on (x1.10)', { cx:60, cy:35, cvx:8, qx:60, qy:36.2, qvx:0, ctrl:'none' }, 'ai'],
  ['from behind (Soft +0.25)', { cx:60, cy:35, cvx:8, qx:58.8, qy:35, qvx:8.5, ctrl:'none' }, 'ai'],
  ['a dive within 1.7m', { ct:1, cx:60, cy:35, cvx:-8, qx:58.8, qy:35, qvx:4, ctrl:'q' }, 'dive'],
  ['sprinting tackler (+0.10 Big Hit)', { ...FRONT, sprint:true }, 'ai'],
  ['Ankle Tap (0.55, always Soft)', { ct:1, cx:60, cy:35, cvx:-8, qx:61.2, qy:35, qvx:-9, ctrl:'q' }, 'ankle'],
];
for (const [name, o, mode] of CASES) {
  fresh(1); const cf = closed(o, mode), r = rates(o, mode);
  const want = { stick:cf.p, dom:cf.p*cf.dom, soft:cf.p*cf.soft, wrap:cf.p*(1 - cf.dom - cf.soft) };
  for (const k of ['stick', 'dom', 'soft', 'wrap']) ok(near(r[k], want[k], 0.015), `${name}: ${k} ${(100*r[k]).toFixed(1)}% against ${(100*want[k]).toFixed(1)}%`);
  if (name.startsWith('front')) ok(cf.closing > 6 && cf.dom >= CONTACT.dom.base + CONTACT.dom.front - 1e-9, `front-on: the closing speed is positive and the Big Hit bonus applies (closing ${cf.closing.toFixed(1)}, dom ${cf.dom.toFixed(2)})`);
  if (mode === 'ankle') ok(near(r.stick, CONTACT.ankle, 0.015) && r.dom === 0 && r.wrap === 0, 'an Ankle Tap sticks at 0.55 and is never a Wrap or a Big Hit');
}
{ fresh(2); const cf = closed(FRONT, 'ai', 2), r = rates(FRONT, 'ai', 20000, 2); ok(near(r.dom, cf.p*cf.dom, 0.015) && cf.dom > closed(FRONT, 'ai', 1).dom, `on Hard the CPU's Big Hit edge applies (${(100*r.dom).toFixed(1)}% against ${(100*cf.p*cf.dom).toFixed(1)}%)`); fresh(1); }
{ fresh(1); const { c, q } = stage(FRONT); q.sprinting = true; M().spr[1].p = q; C.commitTackle(q, c, 'ai'); ok(!q.sprinting && !M().spr[1].p, 'the sprint ends when he commits'); }
done('3 tier rates');

// 4. the Second Man joins within 1.3m and never beyond 1.4m; his tier changes come out at 0.35
begin('second man');
{
  fresh(1);
  for (const [r, want] of [[1.25, true], [1.45, false]]) {
    const k = bind(FRONT, 'ai', 'wrap'), { c, opp } = k, o = opp[1];
    o.x = c.x + r*0.6; o.y = c.y + r*0.8; o.vx = o.vy = 0;
    T.update(STEP);
    ok((k.q2 === o) === want, `a defender ${r}m away ${want ? 'joins' : 'does not join'} the bind`);
  }
  const N = 6000;
  CONTACT.second.softToWrap = 0.5;                            // the two levers are told apart: the soft run must follow its own
  for (const [from, to] of [['wrap', 'dom'], ['soft', 'wrap']]) {
    const want = from === 'wrap' ? CONTACT.second.toDom : CONTACT.second.softToWrap;
    let changed = 0;
    for (let i = 0; i < N; i++) {
      const k = bind(FRONT, 'ai', from), o = k.opp[1]; o.x = k.c.x + 0.8; o.y = k.c.y + 0.8; C.joinTackle(k, o);
      const ch0 = M().stats.secondChanged || 0;
      C.resolveContact(k);
      if ((M().stats.secondChanged || 0) > ch0) changed++;
    }
    ok(near(changed/N, want, 0.02), `a Second Man turns a ${from} into a ${to} ${(100*changed/N).toFixed(1)}% of the time (lever ${want})`);
  }
  reset();
}
done('4 second man');

// 5. one moveAll: a standing man is pushed off a man on the ground, who does not move; team-mates stop jostling, opponents do not
begin('collide');
{
  fresh(1); const { own, opp } = stage({ cx:30, cy:35, cvx:0, ctrl:'none' });
  const a = own[2], bdn = opp[2]; a.x = 60; a.y = 35; bdn.x = 60.5; bdn.y = 35; bdn.down = 1; a.vx = a.vy = 0;
  let worst = 0; for (let i = 0; i < 3; i++) { const x0 = a.x; C.moveAll(STEP); worst = Math.max(worst, Math.abs(a.x - x0)); }
  ok(dist(a, bdn) >= CONTACT.downR - 0.02 && bdn.x === 60.5 && bdn.y === 35, `a standing man ends ${dist(a, bdn).toFixed(2)}m from a man on the ground, who has not moved`);
  ok(worst <= 0.2 + 0.02, `the push is at most 0.2m a step (plus his own stride), so nobody is shoved across the screen (${worst.toFixed(3)}m)`);
  // a bound pair: a free man is stepped round either of them, they are not moved by him, and the pair itself is not parted
  const k = bind(FRONT, 'ai', 'wrap'), { c, q } = k, s = k.own[1]; s.x = c.x - 0.85; s.y = c.y + 0.1; s.vx = s.vy = 0;
  const cx0 = c.x, cvx = c.vx, dq0 = dist(q, c);
  C.moveAll(STEP);
  ok(dist(s, c) >= CONTACT.downR - 0.02 && near(c.x - cx0, cvx*STEP, 1e-6), `a free man ends ${dist(s, c).toFixed(2)}m from a bound carrier, who moved only by his own bind velocity`);
  ok(dist(q, c) <= dq0 + 0.3, `the bound pair is not parted by the collision pass (${dist(q, c).toFixed(2)}m)`);
  s.x = q.x + 0.3; s.y = q.y; C.moveAll(STEP); C.moveAll(STEP);
  ok(dist(s, q) >= 0.6, `a free man is pushed off the bound tackler too (${dist(s, q).toFixed(2)}m)`);
  C.releaseBind(k);
  // an exact overlap is parted along the touchline axis instead of being left
  stage({ cx:30, cy:35, cvx:0, ctrl:'none' });
  const e1 = own[2], e2 = own[3]; e1.x = e2.x = 60; e1.y = e2.y = 35; e1.vx = e1.vy = e2.vx = e2.vy = 0;
  for (let i = 0; i < 8; i++) C.moveAll(STEP);
  ok(dist(e1, e2) >= 1.25 - 0.02 && Math.abs(e1.y - e2.y) < 0.3, `two men on the same spot are parted to ${dist(e1, e2).toFixed(2)}m along the touchline axis (dy ${Math.abs(e1.y - e2.y).toFixed(2)})`);
  stage({ cx:30, cy:35, cvx:0, ctrl:'none' });
  const p1 = own[2], p2 = own[3]; p1.x = 60; p1.y = 35; p1.vx = 3; p2.x = 61; p2.y = 35; p2.vx = -3;
  C.moveAll(STEP);
  ok(Math.abs(p2.vx - p1.vx) < 0.8, `two team-mates' closing velocity is removed (${(p2.vx - p1.vx).toFixed(2)} m/s left)`);
  stage({ cx:30, cy:35, cvx:0, ctrl:'none' });
  const u = own[2], v = opp[2]; u.x = 60; u.y = 35; u.vx = 3; v.x = 61; v.y = 35; v.vx = -3;
  C.moveAll(STEP);
  ok(Math.abs(v.vx - u.vx) > 5, `two opponents' closing velocity is kept (${(v.vx - u.vx).toFixed(2)} m/s)`);
}
done('5 collide');

// 6. the ruck: the roll-away and retiring, no chasing while retiring, quick / normal / slow, the duel Big Hit unchanged
begin('ruck');
{
  fresh(1); noJolt();
  const k = bind(FRONT, 'ai', 'wrap'), { c, q, own } = k; own[1].x = c.x - 2; own[1].y = c.y + 1;   // one support man 2m back, no defender near: quick ball
  run(() => M().phase === 'set', 40);
  const s = M().set, bx = s.x, by = s.y, d = 1;
  ok(s.kind === 'ruck' && near(s.t, RUCK.t.quick, 1e-9), `quick ball with support near and no defender near (${s.t}s)`);
  ok(near(q.x, bx + d*1.0, 0.02) && near(Math.abs(q.y - by), 1.1, 0.02), `the tackler rolls 1.0m beyond and 1.1m aside (${(q.x - bx).toFixed(2)}, ${(q.y - by).toFixed(2)})`);
  ok(near(q.down, s.t + 0.25, 1e-9) && near(q.offside, s.t + 0.25 + RUCK.retire, 1e-9) && near(q.tcd, q.offside, 1e-9), `he is down until the ruck ends + 0.25s, then retiring ${RUCK.retire}s (${q.down.toFixed(2)}, ${q.offside.toFixed(2)})`);
  let chased = 0, retiring = 0, tries = 0;
  while (retiring < 20 && tries++ < 30) {                    // a ruck that turns over or gives a penalty is restaged: the check needs his side's carrier to chase
    if (tries > 1) { const kk = bind(FRONT, 'ai', 'wrap'); kk.own[1].x = kk.c.x - 2; kk.own[1].y = kk.c.y + 1; run(() => M().phase === 'set', 40); }
    run(() => M().phase !== 'set', 120);
    if (!(M().phase === 'play' && M().ball.state === 'held' && M().ball.carrier.team === 0)) continue;
    const qq = M().players[7]; chased = 0; retiring = 0;
    while (qq.offside > 0 && M().phase === 'play' && retiring < 200) { const t = C.computeTargets().get(qq); if (qq.down <= 0) { retiring++; if (t && t.pursue) chased++; } T.update(STEP); }
  }
  ok(retiring > 20 && chased === 0, `computeTargets never picks a retiring man as a chaser (${chased} of ${retiring} steps)`);
  // normal: a standing onside defender within 3.5m beats the support
  const k2 = bind(FRONT, 'ai', 'wrap'); k2.own[1].x = k2.c.x - 2; k2.own[1].y = k2.c.y + 1; k2.opp[1].x = k2.c.x + 0.5; k2.opp[1].y = k2.c.y + 1.6; k2.opp[1].tcd = 1;   // beside the ball, too far to join, on cooldown
  run(() => M().phase === 'set', 40);
  ok(near(M().set.t, RUCK.t.normal, 1e-9), `normal ball when a defender is at the ruck first (${M().set.t}s)`);
  const k3 = bind(FRONT, 'ai', 'dom'); k3.own[1].x = k3.c.x - 2; k3.own[1].y = k3.c.y + 1;
  run(() => M().phase === 'set', 40);
  ok(near(M().set.t, RUCK.t.slow, 1e-9), `slow ball after a Big Hit (${M().set.t}s)`);
  // the Second Man retires for as long as the tackler, and his cooldown runs to the end of it
  const k4 = bind(FRONT, 'ai', 'wrap'), o4 = k4.opp[1]; o4.x = k4.c.x + 0.8; o4.y = k4.c.y + 0.8; C.joinTackle(k4, o4);
  run(() => M().phase === 'set', 40);
  ok(k4.q2 === o4 && near(o4.offside, M().set.t + 0.25 + RUCK.retire, 1e-9) && o4.tcd >= o4.offside - 1e-9, `the Second Man retires until the ruck ends + 0.25s + ${RUCK.retire}s and can't tackle before then (offside ${o4.offside.toFixed(2)}, tcd ${o4.tcd.toFixed(2)})`);
  reset();
  // the duel Big Hit and the old tackle body: no tier, no new random draw, the same placements as before
  const { c: c4, q: q4 } = stage(FRONT); const r0 = rndCalls(), qx = q4.x;
  C.tackle(c4, q4, { dom:true, domP:0.25 });
  ok(rndCalls() === r0 && near(M().set.t, 1.6, 1e-9) && M().set.dom && M().set.tier == null && q4.x === qx && q4.down === 1.0 && c4.down === 1.25, 'the duel Big Hit keeps its 1.6s ruck, the old placements and draws nothing random');
  const { c: c5, q: q5 } = stage(FRONT); const r1 = rndCalls();
  C.tackle(c5, q5);
  ok(rndCalls() === r1 && near(M().set.t, 1.05, 1e-9) && !M().set.dom && M().set.tier == null && q5.offside === 0 && q5.down === 1.0, 'a tackle with no tier (duels, the drop-goal smother) is the old 1.05s ruck with no roll-away and no random draw');
}
done('6 ruck');

// 6b. during a ruck the ring is on the teammate who will pick the ball up. The stick places him; let go and he still
// runs to the mark and takes the ball. Pass, Kick and Tackle stay dead. The timer and the rolls are the tackle's.
// A turnover still goes to the defence. A CPU side is not moved.
begin('ruck control');
{
  const park = (k, mate) => {
    const d = dirOf(k.c.team);
    mate.x = k.c.x - d*3; mate.y = k.c.y; mate.vx = mate.vy = 0;
    k.own.forEach((p, i) => { if (p !== k.c && p !== mate) { p.x = 6; p.y = 3 + i*8; p.vx = p.vy = 0; } });
  };
  const toRuck = () => run(() => M().phase === 'set' && M().set && M().set.kind === 'ruck', 40);
  fresh(1); noJolt(); const turn0 = M().diff.turnover;
  const k = bind(FRONT, 'ai', 'wrap'), mate = k.own[1]; park(k, mate);
  ok(toRuck(), 'a staged tackle becomes a ruck');
  const s = M().set, d = dirOf(s.team), mx = s.x - d*1.6, my = s.y;
  ok(s.picker === mate && M().ctrl === mate && mate !== k.c && mate.down <= 0, 'the ring leaves the tackled man for the teammate nearest the mark');
  ok(near(s.t, RUCK.t.quick, 1e-9) && !('jackal' in s) && !('mine' in s) && !('press' in s), `the ruck keeps its length and has no jackal, steal or press (${s.t}s)`);
  const y0 = mate.y, cy0 = k.c.y, t0 = s.t, r0 = rndCalls();
  inp.jx = 0; inp.jy = 1;
  steps(20);
  ok(rndCalls() === r0, 'placing him draws no random number');
  ok(mate.y > y0 + 1 && Math.abs(k.c.y - cy0) < 0.2 && k.c.down > 0, `the stick moves him (${(mate.y - y0).toFixed(2)}m) and the tackled man stays down`);
  ok(M().phase === 'set' && M().ball.state === 'dead' && near(M().set.t, t0 - 20*STEP, 1e-6), 'the ball stays down and the timer only loses the steps');
  T.debug.setMode('match');
  const passes = M().stats.passes || 0, kicks = M().stats.kicks || 0, tackles = M().stats.tackles;
  inp.aPressed = true; inp.bPressed = true; inp.cPressed = true; inp.aDown = true; inp.bDown = true; inp.cDown = true;
  T.update(STEP); T.debug.updateHud();
  ok(M().phase === 'set' && M().ball.state === 'dead' && M().ctrl === mate && !M().side[0].pass && !M().side[0].charging, 'Pass, Kick and Tackle do nothing while the ruck is down');
  ok((M().stats.passes || 0) === passes && (M().stats.kicks || 0) === kicks && M().stats.tackles === tackles, 'and they add no pass, kick or tackle');
  ok($('btnA').classList.contains('idle') && $('btnB').classList.contains('idle') && $('btnC').classList.contains('idle'), 'and all three buttons are dim');
  inp.aDown = inp.bDown = inp.cDown = false; inp.jx = inp.jy = 0; T.debug.setMode('menu');
  // stick let go: he runs to the mark, and he is the one who takes the ball
  let kept = false;
  for (let i = 0; i < 12 && !kept; i++) {
    fresh(1); noJolt(); RUCK.pen = 0; M().diff.turnover = -1;
    const kk = bind(FRONT, 'ai', 'wrap'), m2 = kk.own[1]; park(kk, m2);
    if (!toRuck() || M().set.picker !== m2) continue;
    const ss = M().set, dd = dirOf(ss.team), x1 = ss.x - dd*1.6, y1 = ss.y, d0 = dist(m2, { x:x1, y:y1 });
    inp.jx = inp.jy = 0;
    steps(25);
    const d1 = dist(m2, { x:x1, y:y1 });
    ok(M().phase === 'set' && d1 < d0 - 0.35, `with the stick let go he runs to the mark (${d0.toFixed(2)}m to ${d1.toFixed(2)}m)`);
    run(() => M().phase !== 'set', 80);
    if (M().phase === 'play' && M().ball.state === 'held' && M().ball.carrier === m2) {
      kept = true;
      ok(dist(m2, { x:x1, y:y1 }) < 1.2, `and he takes the ball at the mark (${dist(m2, { x:x1, y:y1 }).toFixed(2)}m off)`);
      T.debug.setMode('match'); T.debug.updateHud();
      ok($('la').textContent === 'Pass' && !$('btnA').classList.contains('idle') && !$('btnB').classList.contains('idle'), 'Pass and Kick come back once the ball is out');
      T.debug.setMode('menu');
    }
  }
  ok(kept, 'a ruck with the stick let go could be kept by the attack');
  // the stick held away the whole ruck: he is still the man who picks it up, not whoever is standing at the mark
  let placed = false;
  for (let i = 0; i < 12 && !placed; i++) {
    fresh(1); noJolt(); RUCK.pen = 0; M().diff.turnover = -1;
    const kk = bind(FRONT, 'ai', 'wrap'), m2 = kk.own[1]; park(kk, m2);
    if (!toRuck() || M().set.picker !== m2) continue;
    const yAt = M().set.y;
    run(() => M().phase !== 'set', 90, () => { inp.jx = 0; inp.jy = 1; });
    if (M().phase === 'play' && M().ball.state === 'held' && M().ball.carrier === m2 && Math.abs(m2.y - yAt) > 2) {
      placed = true;
      ok(true, `placed off the mark, he still picks the ball up (${Math.abs(m2.y - yAt).toFixed(1)}m aside)`);
    }
  }
  ok(placed, 'a placed carrier could be kept by the attack');
  // a turnover still goes to the other side. resolveRuck draws the same rolls; the placed man does not keep it
  let turned = false;
  for (let i = 0; i < 80 && !turned; i++) {
    fresh(1); noJolt(); RUCK.pen = 0; M().diff.turnover = 1;
    const kk = bind(FRONT, 'ai', 'wrap'), m2 = kk.own[1]; park(kk, m2);
    if (!toRuck() || M().set.picker !== m2) continue;
    const s = M().set, before = rndCalls(), to0 = M().stats.toRuck || 0;
    C.resolveRuck(s);
    if ((M().stats.toRuck || 0) > to0 && M().ball.state === 'held' && M().ball.carrier.team === 1) {
      turned = true;
      ok(M().ball.carrier !== m2 && rndCalls() > before, 'a turnover goes to the defence, and the roll is still drawn when the ruck ends');
    }
  }
  ok(turned, 'a ruck turnover could be forced without the placed man keeping the ball');
  // a CPU side is not moved onto a picker
  fresh(1, { humans:[false, false] }); noJolt(); CONTACT.off.cpu = 0;
  const cpu = bind({ ...FRONT, ctrl:'c' }, 'ai', 'wrap');
  ok(toRuck() && !M().set.picker && M().ctrl === cpu.c, 'a CPU ruck sets no picker and leaves the ring where it was');
  // two player: the tackler's side keeps its own ring
  fresh(1, { humans:[true, true] }); noJolt();
  const both = bind(FRONT, 'ai', 'wrap'), mate2 = both.own[1]; park(both, mate2); M().side[1].ctrl = both.q;
  ok(toRuck() && M().ctrl === mate2 && M().set.picker === mate2 && M().side[1].ctrl === both.q, 'two player moves only the attacking ring');
  // the away human: his ring, not seat 0's
  fresh(1, { humans:[false, true] }); noJolt();
  const away = bind({ ct:1, cx:60, cy:35, cvx:-4, qx:61.3, qy:35, qvx:4, ctrl:'none' }, 'ai', 'wrap'), mate3 = away.own[1];
  park(away, mate3); const seat0 = M().ctrl;
  ok(toRuck() && M().side[1].ctrl === mate3 && mate3 !== away.c && M().ctrl === seat0, 'an away-side human\'s ring moves to his own next carrier');
  M().diff.turnover = turn0; reset();
}
done('6b ruck control');

// 7. wrong-footed: after a ruck turnover every opponent within 3m is slow and can't tackle for 0.7s; nobody beyond 3m is
begin('wrong-footed');
{
  fresh(1); RUCK.pen = 0; const d0 = M().diff.turnover; M().diff.turnover = 1;
  let got = false;
  for (let i = 0; i < 300 && !got; i++) {
    const k = bind(FRONT, 'ai', 'wrap'), { c, own } = k; own[1].x = c.x - 2; own[1].y = c.y + 1;
    run(() => M().phase === 'set', 40);
    const s = M().set; if (!s || s.kind !== 'ruck') continue;   // the ball came loose in the tackle: stage again
    own[2].x = s.x - 2.0; own[2].y = s.y; own[3].x = s.x - 4.0; own[3].y = s.y;
    const to0 = M().stats.toRuck || 0;
    C.resolveRuck(s);
    if ((M().stats.toRuck || 0) > to0) {
      got = true;
      ok(own[2].wf === RUCK.wf.t && own[2].tcd >= RUCK.wf.t && own[1].wf === RUCK.wf.t, 'the losing side within 3m of the ball is wrong-footed: tcd at least 0.7 and 0.7s slow');
      ok(own[3].wf === 0 && own[3].tcd === 0, 'a man 4m away is not');
      const sp = C.maxSpeed(own[2]);
      ok(near(sp, 0.5*(7.6 + M().nat[0].pace*0.25), 1e-9), `wrong-footed men run at x0.5 (${sp.toFixed(2)})`);
      ok(M().ball.carrier && M().ball.carrier.team === 1, 'the ball went to the other side');
    }
  }
  ok(got, 'a ruck turnover could be forced');
  M().diff.turnover = d0; reset();
}
done('7 wrong-footed');

// 7b. every timer runs out in its stated time, give or take a step, and the man is back to normal after it: retiring (the tackler and a ringed Second Man), wrong-footed, a stumble, a trip
begin('timers');
{
  fresh(1); noJolt(); RUCK.pen = 0; const d0 = M().diff.turnover; M().diff.turnover = -1;   // no penalties and no turnovers, so the ruck's end is plain
  // the tackler: retiring runs out, then he is a chaser and a sprinter again
  const k = bind(FRONT, 'ai', 'wrap'); run(() => M().phase === 'set', 40);
  const q = k.q, T0 = q.offside, far0 = k.opp[1];
  let n = 0; while (q.offside > 0 && n++ < 400) T.update(STEP);
  ok(near(n*STEP, T0, STEP + 1e-9) && q.down <= 0, `the tackler's retire runs out after ${T0.toFixed(2)}s give or take a step (${(n*STEP).toFixed(2)}s), with him on his feet`);
  ok(q.tcd <= 0 && M().phase === 'play' && C.sprintable(q), 'then his cooldown is over and he can sprint again');
  // chasing: with the ball held by your man next to him and the other defenders down, he is the best chaser now and was not a step before
  const pick = () => { const m = M(); const c = m.players.find(p => p.team === 0 && p !== m.ball.carrier) || m.players[0]; m.ball.state = 'held'; m.ball.carrier = c; c.x = clamp(q.x - 3, 1, 119); c.y = q.y; for (const p of m.players) if (p.team === 1 && p !== q) p.down = 1; return C.bestChaser(1); };
  ok(pick() === q, 'and computeTargets\' chaser pool (bestChaser) takes him again');
  q.offside = 0.1; ok(pick() !== q, 'while a man still retiring is never the best chaser'); q.offside = 0;
  // the ringed Second Man: Tackle stays dim and a press does nothing while he retires, then both work again
  fresh(1); noJolt(); RUCK.pen = 0; M().diff.turnover = -1; T.debug.setMode('match');
  const k2 = bind({ ct:1, cx:60, cy:35, cvx:-8, qx:58.7, qy:35, qvx:4, ctrl:'none' }, 'ai', 'wrap');
  const me = k2.opp[1]; me.x = k2.c.x - 1.8; me.y = k2.c.y + 1; M().ctrl = me; C.userTackle(0);
  run(() => M().phase === 'set', 40);
  ok(k2.q2 === me && me.offside > 0, `your Second Man is retiring after the ruck forms (${me.offside.toFixed(2)}s)`);
  const T2 = me.offside;
  // at every step of his retire, put the picture a press would meet in front of canDive and the HUD (a CPU carrier beside him, in play), then put the match back and step it
  const probe = () => { const m = M(), b = m.ball, sv = { phase:m.phase, set:m.set, state:b.state, carrier:b.carrier, ctrl:m.ctrl, contact:m.contact, x:me.x, y:me.y, down:me.down, tcd:me.tcd, bind:me.bind };
    const c = m.players.find(p => p.team === 1 && p !== k2.c), cs = { bind:c.bind, vx:c.vx, vy:c.vy, down:c.down };
    m.phase = 'play'; m.set = null; m.contact = null; b.state = 'held'; b.carrier = c; c.bind = null; m.ctrl = me; me.bind = null; me.x = c.x + 1.5; me.y = c.y; me.down = 0; me.tcd = 0;   // tcd cleared: retiring alone must hold the press off
    T.debug.updateHud(); const dive = C.canDive(me), lit = !$('btnA').classList.contains('idle');
    const ta = m.stats.ta1 || 0, sec = m.stats.second || 0, ig = m.stats.ignored || 0; C.userTackle(0); const acted = (m.stats.ta1 || 0) !== ta || (m.stats.second || 0) !== sec || !!me.bind || (m.stats.ignored || 0) === ig;
    if (m.contact) C.releaseBind(m.contact); m.contact = sv.contact; c.bind = cs.bind; c.vx = cs.vx; c.vy = cs.vy; c.down = cs.down; me.bind = sv.bind;
    m.phase = sv.phase; m.set = sv.set; b.state = sv.state; b.carrier = sv.carrier; m.ctrl = sv.ctrl; me.x = sv.x; me.y = sv.y; me.down = sv.down; me.tcd = sv.tcd; return { dive, lit, acted }; };
  let dimOk = 0, dimBad = 0, pressBad = 0, m = 0;
  while (me.offside > 0 && m++ < 200) { const r = probe(); if (r.dive || r.lit) dimBad++; else dimOk++; if (r.acted) pressBad++; T.update(STEP); }
  ok(dimOk > 30 && dimBad === 0 && pressBad === 0, `while he retires Tackle is dim and a press does nothing, even beside a carrier (${dimOk} steps checked, ${dimBad} lit, ${pressBad} acted)`);
  ok(near(m*STEP, T2, 2*STEP + 1e-9), `his retire runs out after ${T2.toFixed(2)}s give or take a step (${(m*STEP).toFixed(2)}s)`);
  const r = probe();
  ok(me.offside <= 0 && r.dive && r.lit && r.acted, 'and once it has, Tackle lights up and a press dives');
  T.debug.setMode('menu'); M().diff.turnover = d0; reset();
  // wrong-footed: 0.7s, then full speed and no cooldown
  fresh(1); const st = stage({ cx:30, cy:35, cvx:0, ctrl:'none' }), w = st.own[2]; w.x = 60; w.y = 35; const base = C.maxSpeed(w);
  C.wrongFoot(1, 60, 35);
  ok(w.wf === RUCK.wf.t && near(C.maxSpeed(w), base*RUCK.wf.mul, 1e-9), `wrong-footed: x${RUCK.wf.mul} for ${RUCK.wf.t}s`);
  n = 0; while (w.wf > 0 && n++ < 100) T.update(STEP);
  ok(near(n*STEP, RUCK.wf.t, STEP + 1e-9) && near(C.maxSpeed(w), base, 1e-9) && w.tcd <= 0, `it runs out after ${RUCK.wf.t}s give or take a step (${(n*STEP).toFixed(2)}s), at full speed with no cooldown`);
  // a stumble (0.15s at x0.9) and a trip (0.5s at x0.5) run out too
  for (const [mode, want, mul, trip] of [['ai', CONTACT.stumble[0], CONTACT.stumble[1], false], ['ankle', CONTACT.trip.t, CONTACT.trip.mul, true]]) {
    fresh(1); SPRINT.cpu.carry = [0, 0, 0]; SPRINT.cpu.chase = [0, 0, 0];   // no CPU sprint, so his top speed is only the stumble's
    if (trip) { CONTACT.ankle = 0; CONTACT.trip.p = 1; } else { M().diff.cpuTackle = 0; CONTACT.fend.pow = 99; }
    const o = trip ? { ct:1, cx:60, cy:35, cvx:-8, qx:61.2, qy:35, qvx:-9, ctrl:'q' } : FRONT;
    const kk = broken(o, mode), c = kk.c, sp0 = (7.6 + M().nat[c.team].pace*0.25)*(c.team === 1 ? M().diff.cpuSpeed : 1);
    ok(c.stumble === want && near(C.maxSpeed(c), sp0*mul, 1e-9), `${trip ? 'a trip' : 'a stumble'} slows him to x${mul} for ${want}s`);
    n = 0; while (c.stumble > 0 && n++ < 100) T.update(STEP);
    ok(near(n*STEP, want, 2*STEP + 1e-9) && near(C.maxSpeed(c), sp0, 1e-9), `and runs out after ${want}s give or take a step (${(n*STEP).toFixed(2)}s), back to full speed`);
    reset(); M().diff.cpuTackle = 0.64;
  }
}
done('7b timers');

// 8. your automatic tackle base by level, and the dive as before
begin('tackle base');
for (const di of [0, 1, 2]) {
  fresh(di); const { c, q } = stage({ ct:1, cx:60, cy:35, cvx:-8, qx:58.8, qy:35, qvx:4, ctrl:'q' });
  ok(near(C.tackleChance(q, c, 'contact'), CONTACT.contact[di], 1e-9), `level ${di}: your automatic tackle is ${CONTACT.contact[di]} (${C.tackleChance(q, c, 'contact')})`);
  ok(near(C.tackleChance(q, c, 'dive'), CONTACT.dive[0], 1e-9), `level ${di}: a dive within 1.7m is ${CONTACT.dive[0]}`);
  q.x = c.x - 2.5; ok(near(C.tackleChance(q, c, 'dive'), CONTACT.dive[1], 1e-9), `level ${di}: a dive from 2.5m is ${CONTACT.dive[1]}`);
}
// 8b. a stepping carrier (side > 0: the Side Step's 0.35s) is tackled at x MOVES.step.odds, read from side alone (2026-10-17); and the old
// turn-rate step is gone from userMove (p.turn, p.lastA, and both from HOLD_KEYS)
{
  fresh(1); const { c, q } = stage({ ct:1, cx:60, cy:35, cvx:-8, qx:58.8, qy:35, qvx:4, ctrl:'q' });
  const p0 = C.tackleChance(q, c, 'ai'); c.side = 0.35; const p1 = C.tackleChance(q, c, 'ai'); c.side = -1;
  ok(C.MOVES && C.MOVES.step.odds === 0.65 && near(p1, p0*C.MOVES.step.odds, 1e-9), `a stepping carrier is tackled at x${C.MOVES && C.MOVES.step.odds} (${p1.toFixed(3)} v ${p0.toFixed(3)})`);
  ok(!/p\.lastA\s*=|p\.turn\s*=|lastA:0|turn:0/.test(script) && !/'turn'|'lastA'/.test(script), 'userMove keeps no turn rate: p.turn and p.lastA are gone, from HOLD_KEYS too');
}
done('8b side step odds');

// 9. the Tackle press: nothing at 3.0m (and A is dim), a dive at 2.2m in front, an Ankle Tap from behind, a join on a bound carrier
begin('tackle press');
{
  fresh(1); T.debug.setMode('match');
  const { c, q } = stage({ ct:1, cx:60, cy:35, cvx:-8, qx:57.0, qy:35, qvx:0, ctrl:'q' });
  const ig0 = M().stats.ignored || 0, ta = M().stats.ta1 || 0, qs = { x:q.x, y:q.y, vx:q.vx, down:q.down, tcd:q.tcd };
  C.userTackle(0);
  ok((M().stats.ignored || 0) === ig0 + 1 && (M().stats.ta1 || 0) === ta && q.down === qs.down && q.tcd === qs.tcd && q.vx === qs.vx && !M().contact, 'a Tackle press at 3.0m does nothing: no dive, no fall, no cooldown');
  T.debug.updateHud();
  ok($('la').textContent === 'Tackle' && $('btnA').classList.contains('idle'), `A reads Tackle and is dim at 3.0m (${$('la').textContent}, idle ${$('btnA').classList.contains('idle')})`);
  q.x = c.x - 2.2; T.debug.updateHud();
  ok(!$('btnA').classList.contains('idle'), 'A lights up at 2.2m');
  const ta1 = M().stats.ta1 || 0, tried = M().stats.ankleTry || 0;
  C.userTackle(0);
  ok((M().stats.ta1 || 0) === ta1 + 1 && (M().stats.ankleTry || 0) === tried && q.tcd === 1.0 && (M().contact ? M().contact.mode === 'dive' : q.down > 0), 'a press at 2.2m in front is a dive');
  stage({ ct:1, cx:60, cy:35, cvx:-8, qx:62.2, qy:35, qvx:-9, ctrl:'q' });
  const tried2 = M().stats.ankleTry || 0;
  C.userTackle(0);
  ok((M().stats.ankleTry || 0) === tried2 + 1, 'a press from behind is an Ankle Tap');
  const k = bind({ ct:1, cx:60, cy:35, cvx:-8, qx:58.7, qy:35, qvx:4, ctrl:'none' }, 'ai', 'wrap');
  const me = k.opp[1]; me.x = k.c.x - 1.8; me.y = k.c.y + 1; M().ctrl = me;
  C.userTackle(0);
  ok(k.q2 === me && me.bind === k, 'a press on a bound carrier joins the tackle');
  const third = k.opp[2]; third.x = k.c.x - 1.8; third.y = k.c.y - 1; third.tcd = 0; third.down = 0; M().ctrl = third;
  const ig = M().stats.ignored || 0; T.debug.updateHud();
  ok(!C.canDive(third) && $('btnA').classList.contains('idle'), 'with a Second Man already bound, a third man\'s Tackle is dim');
  C.userTackle(0);
  ok((M().stats.ignored || 0) === ig + 1 && k.q2 === me && !third.bind, 'and his press does nothing: no second join');
  T.debug.setMode('menu');
}
done('9 tackle press');

// 10. Sprint: hold to sprint, the meter drains over 2s and refills over 10s, the floor, the spent latch, the ease-out, the speed
begin('sprint');
{
  ok(SPRINT.secs === 2 && SPRINT.refill[1] === 10 && SPRINT.refill[2] === 10 && SPRINT.refill[0] <= SPRINT.refill[1] && SPRINT.floor > 0 && SPRINT.floor <= 0.3, `about 2s of sprint from full, about 10s to refill, Easy no slower, a floor to start (${SPRINT.secs}, ${SPRINT.refill}, ${SPRINT.floor})`);
  fresh(1);
  const far = () => { const r = stage({ ct:1, cx:112, cy:35, cvx:-8, qx:60, qy:35, qvx:8, ctrl:'q' }); r.c.hold = -99; inp.jx = 1; return r; };   // a CPU carrier running away a long way off who never passes or kicks; your man runs the other way
  const { c, q } = far(), S = M().spr[0], base = 7.6 + M().nat[0].pace*0.25;
  steps(1);
  ok(!q.sprinting && near(C.maxSpeed(q), base, 1e-9), 'nothing happens until Sprint is held');
  inp.cDown = true; steps(1);
  ok(q.sprinting && S.p === q && near(C.maxSpeed(q), base*SPRINT.mul[1], 1e-9), `holding Sprint lifts your chaser to x${SPRINT.mul[1]} (${(C.maxSpeed(q)/base).toFixed(3)})`);
  steps(59);
  ok(near(S.m, 1 - 1/SPRINT.secs, 0.02) && q.sprinting, `after 1s of hold the meter is half gone (${S.m.toFixed(3)})`);
  const mRel = S.m; inp.cDown = false; steps(1);
  ok(!q.sprinting && S.p === null && q.sprint > 0 && C.sprintLevel(q) < 1 && C.sprintLevel(q) > 0.5, `letting go stops the sprint at once with a short ease out (level ${C.sprintLevel(q).toFixed(2)})`);
  let mPrev = S.m, rose = 0, fadeSteps = 1; while (q.sprint > 0 && fadeSteps++ < 60) { T.update(STEP); if (S.m > mPrev + 1e-12) rose++; mPrev = S.m; }
  ok(rose === 0 && near(fadeSteps*STEP, SPRINT.fade, 2*STEP + 1e-9), `the meter never rises while the ease-out runs, and the ease-out runs out within SPRINT.fade (${(fadeSteps*STEP).toFixed(3)}s)`);
  ok(near(mRel - S.m, SPRINT.fade/2/SPRINT.secs, 0.02), `the ease-out is charged to the meter at its level: ${(mRel - S.m).toFixed(3)} of it for a ${SPRINT.fade}s fade (about ${(SPRINT.fade/2/SPRINT.secs).toFixed(3)})`);
  ok(C.sprintLevel(q) === 0 && near(C.maxSpeed(q), base, 1e-9), 'the ease out is over within SPRINT.fade');
  const m0 = S.m; steps(60);
  ok(near(S.m - m0, 1/SPRINT.refill[1], 0.02), `the meter refills at 1/${SPRINT.refill[1]} a second while not held (${(S.m - m0).toFixed(3)} in 1s)`);
  far(); S.m = SPRINT.floor - 0.05; inp.cDown = true; steps(2);
  ok(!q.sprinting, 'a hold under the floor does not start a sprint');
  inp.cDown = false; steps(1); S.m = SPRINT.floor + 0.05; inp.cDown = true; steps(1);
  ok(q.sprinting, 'a hold just over the floor does');
  steps(120);
  ok(!q.sprinting && S.m < SPRINT.floor && S.spent, `a hold that runs the meter dry stops it and latches (${q.sprinting}, ${S.m}, ${S.spent})`);
  S.m = 0.5; steps(2);
  ok(!q.sprinting, 'the latched hold does not restart as the meter refills');
  inp.cDown = false; steps(1); inp.cDown = true; steps(1);
  ok(q.sprinting && !S.spent, 'letting go and holding again does');
  // a sprint stacks with neither the duel's burst nor the surge: the bigger one applies
  q.boostMul = 1.14; q.boost = 2.5; M().surge = { team:0, t:2 };
  ok(near(C.maxSpeed(q), base*Math.max(SPRINT.mul[1], 1.14*1.08), 1e-9), `a sprint with a Perfect BURST and a surge gives max(${SPRINT.mul[1]}, 1.14 x 1.08), never the product (${(C.maxSpeed(q)/base).toFixed(3)})`);
  q.boost = 0; q.boostMul = 1; M().surge = null;
  // the Sprint button: --s is the meter, ready / idle / hidden
  far(); T.debug.setMode('match'); S.m = 0.6; T.debug.updateHud();
  ok($('btnC').style.getPropertyValue('--s') === '0.600' && $('btnC').classList.contains('ready') && !$('btnC').classList.contains('idle') && !$('btnC').hidden, 'the Sprint ring shows the meter and the button is ready while a hold would act');
  inp.cDown = false; steps(1); S.m = SPRINT.floor - 0.05; T.debug.updateHud();
  ok($('btnC').classList.contains('idle') && !$('btnC').classList.contains('ready'), 'it is dim under the floor');
  const pk0 = M().stats.sprintPick || 0, ctrl0 = M().ctrl; inp.cPressed = true; T.update(STEP);
  ok(M().ctrl === ctrl0 && (M().stats.sprintPick || 0) === pk0 && !q.sprinting, 'and a press on the dim button does nothing: the ring stays where it was and nobody sprints');
  S.m = 1; q.down = 1; T.debug.updateHud();
  const alt = C.sprintPick(0);
  ok(!!alt && alt !== q && alt.team === 0 && !$('btnC').classList.contains('idle'), 'while your man is down the button stays lit, because a press would move the ring to a chaser who can sprint');
  inp.cPressed = true; inp.cDown = true; T.update(STEP);
  ok(M().ctrl === alt && (M().stats.sprintPick || 0) === pk0 + 1 && alt.sprinting, 'and the press does move it to him, and he sprints');
  inp.cDown = false; steps(1); M().ctrl = q; for (const p of M().players) if (p.team === 0 && p !== q) p.down = 1;
  T.debug.updateHud();
  ok($('btnC').classList.contains('idle') && !C.sprintPick(0), 'it is dim when nobody of yours could sprint');
  inp.cPressed = true; T.update(STEP);
  ok(M().ctrl === q && (M().stats.sprintPick || 0) === pk0 + 1, 'with the press doing nothing');
  for (const p of M().players) p.down = 0;
  M().phase = 'set'; M().set = { kind:'ruck', t:1, team:1, x:60, y:35, then:() => {} }; T.debug.updateHud();
  ok($('btnC').classList.contains('idle'), 'and dim in a ruck');
  M().phase = 'play'; M().set = null;
  // letting go during a ruck clears the spent latch, so a hold taken up again in the ruck sprints when play resumes
  far(); inp.cDown = true; steps(130);
  ok(S.spent && S.m < SPRINT.floor && !q.sprinting && q.sprint === 0, 'a hold that runs the meter dry latches, with no ease-out left to spend');
  M().phase = 'set'; M().set = { kind:'ruck', t:1, team:1, x:60, y:35, then:() => {} };
  inp.cDown = false; steps(1); inp.cDown = true; inp.cPressed = true; steps(1);
  ok(!S.spent && !q.sprinting, 'letting go and pressing again during the ruck clears the latch, and nothing sprints in the ruck');
  M().phase = 'play'; M().set = null; S.m = 0.55; steps(1);
  ok(q.sprinting && S.p === q, 'and the hold kept through the ruck sprints when play resumes');
  inp.cDown = false; steps(1);
  // a lone chase: your man well behind a CPU carrier running away down the far end, your other men parked behind him so the ring has nobody better to go to
  const lone = () => { const r = stage({ ct:1, cx:115, cy:35, cvx:-8, qx:5, qy:35, qvx:8, ctrl:'q' }); r.c.hold = -99; r.opp.forEach((p, i) => { if (p !== r.q) { p.x = 1; p.y = 2 + i*5; } }); inp.jx = 1; return r; };
  // a re-press inside the ease-out climbs back from where it is: no snap to full speed
  lone(); inp.cDown = true; steps(30); inp.cDown = false; steps(7);
  const lv = C.sprintLevel(q); inp.cDown = true; inp.cPressed = true; steps(1);
  ok(lv > 0.4 && lv < 0.8 && q.sprinting && S.p === q && C.sprintLevel(q) > lv && C.sprintLevel(q) < lv + 2*STEP/SPRINT.fade + 1e-9, `a re-press inside the ease-out resumes from its level (${lv.toFixed(2)}) and climbs a step at a time (${C.sprintLevel(q).toFixed(2)}), never snapping to 1`);
  steps(Math.ceil(SPRINT.fade/STEP)); ok(C.sprintLevel(q) === 1, 'and is back at full burst within SPRINT.fade');
  inp.cDown = false; steps(20);
  // taps buy nothing: in every pattern the burst-seconds equal the meter spent at the hold's rate (SPRINT.secs a full meter), and the meter never refills while any ease-out runs
  const burst = (on, off) => {                               // on/off in steps; 0/0 is a hold; the side's whole burst is counted, whoever carries the ring
    lone();
    let b = 0, spent = 0, rose = 0, n = 0, mPrev = S.m;
    for (let t = 0; t < 6; t += STEP, n++) {
      const down = on === 0 || (n % (on + off)) < on;
      if (down && !inp.cDown) inp.cPressed = true; inp.cDown = down;
      const pre = M().players.filter(p => p.team === 0).map(p => [p, C.sprintLevel(p), p.sprinting]), fading = pre.some(([, L]) => L > 0);
      T.update(STEP);
      for (const [p, L, was] of pre) b += (S.m === 0 && p.sprint === 0 && L > 0 ? 0 : (p.sprinting && !was && L === 0) ? 1 : L)*STEP;   // the level the step ran at: a fresh start runs at 1, the step the meter dries runs at 0
      if (S.m < mPrev) spent += mPrev - S.m; else if (S.m > mPrev + 1e-12 && fading) rose++;
      mPrev = S.m;
    }
    inp.cDown = false; return { b, spent, rose };
  };
  const hold = burst(0, 0), pats = [['5Hz taps', burst(2, 10)], ['8Hz taps', burst(1, 6)], ['5 on / 7 off', burst(5, 7)], ['1 on / 5 off', burst(1, 5)]];
  ok(near(hold.b, SPRINT.secs, 2*STEP + 1e-9) && near(hold.spent, 1, 1e-6) && hold.rose === 0, `one hold from full gives ${hold.b.toFixed(2)} burst-seconds for the whole meter`);
  for (const [name, r] of pats) ok(near(r.b, r.spent*SPRINT.secs, 4*STEP + 1e-9) && r.rose === 0 && r.b <= SPRINT.secs*(1 + 6/SPRINT.refill[1]) + 4*STEP, `${name}: ${r.b.toFixed(2)} burst-seconds for ${r.spent.toFixed(2)} of meter, the hold's rate exactly, and no refill while an ease-out ran (${r.rose} steps did)`);
  T.debug.setMode('menu');
}
// the keyboard: L holds Sprint
{
  fresh(1); stage({ ct:1, cx:112, cy:35, cvx:-8, qx:60, qy:35, qvx:8, ctrl:'q' }); T.debug.setMode('match');
  const e = code => ({ code, repeat:false, preventDefault() {} });
  T.debug.keyDown(e('KeyL')); ok(inp.cDown && inp.cPressed, 'KeyL presses and holds Sprint');
  T.debug.keyUp(e('KeyL')); ok(!inp.cDown, 'and releases it');
  inp.cPressed = false; T.debug.setMode('menu');
}
done('10 sprint meter');

// 11. your carrier sprints too, at the with-ball multiplier and drain; control moving moves the sprint; a duel zeroes it; a close-up freezes the meter
begin('sprint carrier');
{
  fresh(1); const { c, own } = stage({ cx:40, cy:35, cvx:8, ctrl:'c' }), S = M().spr[0], base = 7.6 + M().nat[0].pace*0.25;
  inp.jx = 1; inp.cDown = true; inp.cPressed = true; steps(1);
  ok(c.sprinting && near(C.maxSpeed(c), base*SPRINT.mulBall[1], 1e-9) && SPRINT.mulBall[1] < SPRINT.mul[1], `your carrier sprints at x${SPRINT.mulBall[1]}, below the chase multiplier (${(C.maxSpeed(c)/base).toFixed(3)})`);
  const m0 = S.m; steps(30);
  ok(near(m0 - S.m, 0.5*SPRINT.ballDrain/SPRINT.secs, 0.02), `with the ball the meter drains ${SPRINT.ballDrain}x as fast (${(m0 - S.m).toFixed(3)} in 0.5s)`);
  const r = own[1]; r.x = c.x - 3; r.y = c.y + 5; r.vx = 8;
  inp.aPressed = true; steps(1);
  ok(M().ball.state === 'air' && !c.sprinting && M().ctrl === r, 'passing moves the ring to the receiver and the passer stops sprinting');
  run(() => M().ball.state !== 'air', 120);
  ok(M().ball.carrier === r && r.sprinting && S.p === r, 'the new carrier sprints on the same hold');
  inp.cDown = false; steps(1);
  // a duel zeroes every sprint and keeps the meter
  fresh(1, { duels:'live' }); const st = T.debug.stage('tackle'); const S2 = M().spr[0]; S2.m = 0.7; st.U.sprinting = true; st.U.sprint = 0; S2.p = st.U; st.O.sprinting = true; M().spr[1].p = st.O;
  T.debug.startDuel({ kind:'tackle', U:st.U, O:st.O, how:'force' });
  ok(M().players.every(p => !p.sprinting && p.sprint === 0) && S2.p === null && M().spr[1].p === null && S2.m === 0.7, 'startDuel zeroes every sprint and keeps the meter where it was');
  // the meter freezes in a scrum close-up and a goal close-up
  T.newMatch(0, 1, { halfLen:240, diff:1, headless:false, duels:'off' }); steps(120);
  const S3 = M().spr[0]; inp.cDown = true; T.scrum(0, 60, 35, '');
  run(() => M().phase === 'cut', 400); S3.m = 0.4;
  ok(M().phase === 'cut' && !inp.cDown, 'a Sprint held into a close-up is let go as it opens');
  steps(60);
  ok(M().phase === 'cut' && S3.m === 0.4, `the meter is frozen through a scrum close-up (${S3.m})`);
  inp.cDown = true; run(() => M().phase !== 'cut', 4000);
  ok(!inp.cDown && !inp.cPressed, 'and one taken up inside it is let go as it closes: a sprint after a close-up needs a fresh press');
  inp.cDown = true; T.debug.resume(); ok(!inp.cDown, 'resume() from a pause lets go too');
  fresh(1); M().spr[0].m = 0.3; T.debug.goalKick(0, 88, 35, 'penalty');
  ok(M().phase === 'cut', 'a goal close-up opened'); steps(90);
  ok(M().spr[0].m === 0.3, `and the meter is frozen through it (${M().spr[0].m})`);
}
done('11 sprint carrier');

// 12. the press moves the ring to the best chaser: when your man is down, when another is over 4m nearer, never otherwise
begin('sprint pick');
{
  fresh(1); const { c, q, opp } = stage({ ct:1, cx:60, cy:35, cvx:-8, qx:66, qy:35, qvx:0, ctrl:'q' });
  const other = opp[1]; other.x = 70; other.y = 35;
  C.sprintPress(0); ok(M().ctrl === q, 'the ring stays when your man is the nearest chaser');
  other.x = 61; C.sprintPress(0); ok(M().ctrl === other, 'the ring moves to a man over 4m nearer the carrier');
  M().ctrl = q; other.x = 63; C.sprintPress(0); ok(M().ctrl === q, 'and stays when the other man is under 4m nearer');
  q.down = 1; C.sprintPress(0); ok(M().ctrl === other, 'and moves when your man is down');
}
done('12 sprint pick');

// 13. the CPU's meter on every level: never below 0 or over 1, a start only from the floor, the drain and refill rates, the same burst; the pace of use rises with the level
begin('cpu sprint');
{
  const perLevel = [];
  for (const di of [0, 1, 2]) {
    let bad = 0, starts = 0, m = 0, chaseOk = 0, chaseBad = 0, speedBad = 0;
    for (let i = 0; i < 10; i++) {
      reseed(500 + di*31 + i); fresh(di, { a:i % 6, b:(i + 1 + (i % 5)) % 6 });
      const S = M().spr[1], base = (7.6 + M().nat[1].pace*0.25)*M().diff.cpuSpeed;
      let prev = S.m, prevP = S.p, n = 0;
      while (!M().over && n++ < 60000) {
        bot(); const phase = M().phase, c0 = M().ball.state === 'held' ? M().ball.carrier : null;
        const easing = M().players.filter(p => p.team === 1 && p !== S.p && p.sprint > 0);   // an ease-out still running on this side before the step
        const fading = easing.length;
        T.update(STEP);
        if (S.m < -1e-9 || S.m > 1 + 1e-9) bad++;
        if (S.p && !prevP) { starts++; if (prev < SPRINT.floor) bad++; if (S.p.team !== 1) bad++;
          if (c0 && c0.team === 0) { const dd = dist(S.p, c0); if (dd >= SPRINT.cpu.min - 0.5 && dd <= SPRINT.cpu.max + 0.5) chaseOk++; else chaseBad++; } }
        if (S.p && prevP === S.p && phase === 'play' && !fading) { const d1 = STEP/SPRINT.secs, d2 = d1*SPRINT.ballDrain; if (!near(prev - S.m, d1, 1e-6) && !near(prev - S.m, d2, 1e-6) && S.m > 0) bad++; }
        if (S.p && phase === 'play') { const sp = C.maxSpeed(S.p), want = base*(M().ball.carrier === S.p ? SPRINT.mulBall[di] : SPRINT.mul[di]); if (sp > want*1.001 && !(S.p.boost > 0) && !M().surge) speedBad++; }
        if (fading && easing.some(p => p.sprint > 0) && S.m > prev + 1e-9) bad++;   // nothing refills while an ease-out is still running; a tackle this step can cancel it, and that step may refill
        if (!S.p && !prevP && !fading && phase === 'play' && prev < 1 && S.m - prev > STEP/SPRINT.refill[di] + 1e-6) bad++;
        if (!S.p && !prevP && !fading && S.m < prev - 1e-9) bad++;   // and nothing drains with nobody bursting
        prev = S.m; prevP = S.p;
      }
      m++;
    }
    perLevel.push(starts/m);
    ok(bad === 0, `level ${di}: the CPU's meter obeys the floor, the drain and the refill (${bad} breaches)`);
    ok(chaseBad === 0, `level ${di}: a CPU chaser sprints only from ${SPRINT.cpu.min}–${SPRINT.cpu.max}m (${chaseBad} outside, ${chaseOk} in)`);
    ok(speedBad === 0, `level ${di}: a CPU sprinter runs at the same multiplier as yours (${speedBad} steps over)`);
  }
  ok(perLevel.every(v => v > 0), `the CPU sprints on every level (${perLevel.map(v => v.toFixed(1)).join(' / ')} a match)`);   // how many a match follows how often a break stays clean, which the fullback coming up changes; the rates themselves are checked below
  // the policy's shape: every level sprints, more with each level, and only for a clean break (nobody left ahead in the lane), never past "all but the last man"
  { const P = SPRINT.cpu;
    ok(P.chase[0] > 0 && P.chase[0] <= P.chase[1] && P.chase[1] < P.chase[2] && P.carry[0] <= P.carry[1] && P.carry[1] < P.carry[2] && P.carry[2] > 0, `the CPU's rates rise with the level: chase ${P.chase.join(' / ')}, carry ${P.carry.join(' / ')}`);
    ok(P.chaseLast.every(v => v === 0) && P.carryLast.every(v => v === 0) && P.lane >= 10 && P.space >= P.keep, `clean breaks only on every level (chaseLast ${P.chaseLast.join('/')}, carryLast ${P.carryLast.join('/')}, lane ${P.lane}m)`); }
  // staged: your carrier clean through on Hard; the nearest CPU chaser 14m back never sprints, one 8m back does (odds forced to 1 so the gates decide, not the random stream)
  SPRINT.cpu.chase = [1, 1, 1];
  for (const [gap, want] of [[14, false], [8, true]]) {
    fresh(2); const { c, q } = stage({ cx:60, cy:35, cvx:8, qx:60 - gap, qy:35, qvx:8, ctrl:'c' }); c.hold = -99; inp.jx = 1;
    const S = M().spr[1]; let started = false;
    for (let i = 0; i < 90 && !started; i++) { T.update(STEP); if (S.p) started = true; }
    ok(started === want, `a CPU chaser ${gap}m behind a carrier who is clean through ${want ? 'sprints' : 'does not sprint'} (${started})`);
  }
  // staged with the odds forced to 1, so the gates alone decide: a chaser only for a runner with no CPU man ahead inside the 15m lane; a carrier only into 6m of space, let go inside 2.5m
  SPRINT.cpu.chase = [1, 1, 1]; SPRINT.cpu.carry = [1, 1, 1];
  for (const [inLane, want] of [[true, false], [false, true]]) {
    fresh(1); const { c, opp } = stage({ cx:60, cy:35, cvx:8, qx:52, qy:35, qvx:8, ctrl:'c' }); c.hold = -99; inp.jx = 1;
    opp[1].x = c.x + 10; opp[1].y = c.y + SPRINT.cpu.lane + (inLane ? -2 : 2);   // one CPU defender 10m ahead, just inside or just outside the lane
    const S = M().spr[1]; let started = false;
    for (let i = 0; i < 30 && !started; i++) { T.update(STEP); if (S.p) started = true; }
    ok(started === want, `a CPU chaser ${inLane ? 'does not sprint while a CPU man is still ahead in the lane' : 'sprints once nobody is ahead in the lane'} (${started})`);
  }
  for (const [where, want] of [['side4', false], ['ahead9', false], ['clear', true]]) {
    fresh(1); const { c, q } = stage({ ct:1, cx:60, cy:35, cvx:-8, qx:60, qy:35, qvx:0, ctrl:'q' }); c.hold = -99; inp.jx = 0;
    if (where === 'side4') { q.x = c.x + 0.5; q.y = c.y + 4; q.vx = -8; inp.jx = -1; }   // your man running level with him 4m off his shoulder (not ahead, so only the space gate holds): no space
    else if (where === 'ahead9') { q.x = c.x - 9; q.y = c.y; }          // your man 9m ahead in his lane: not a clean break
    else { q.x = c.x - 9; q.y = c.y + SPRINT.cpu.lane + 2; }            // your man 9m up but outside the lane: clean, and the nearest man is over 6m off
    const S = M().spr[1]; let started = false;
    for (let i = 0; i < 30 && !started; i++) { T.update(STEP); if (S.p === c) started = true; }
    ok(started === want, `a CPU carrier ${where === 'side4' ? 'does not sprint with a man 4m off' : where === 'ahead9' ? 'does not sprint with a man ahead in his lane' : 'sprints into a clean break with 6m of space'} (${started})`);
    if (want && started) { q.x = c.x; q.y = c.y + 2; T.update(STEP); ok(S.p === null && !c.sprinting, `and lets go once the nearest defender is inside ${SPRINT.cpu.keep}m (${S.p ? 'still sprinting' : 'stopped'})`); }
  }
  reset();
}
done('13 cpu sprint');

// 13b. a sprint that ends in a fall or a bind charges nothing more: the ease-out is zeroed, not drained from the meter
begin('sprint ends clean');
{
  fresh(1); const { c, q } = stage({ cx:60, cy:35, cvx:8, qx:50, qy:35, qvx:8, ctrl:'q' }); c.hold = -99;
  const S = M().spr[0]; S.m = 0.6; q.sprint = SPRINT.fade; q.sprinting = false; q.down = 1;
  T.update(STEP);
  ok(q.sprint === 0 && S.m >= 0.6 - 1e-9, `a man who goes down in his ease-out stops sprinting and the meter isn't charged (sprint ${q.sprint}, meter ${S.m.toFixed(4)})`);
  fresh(1); const s2 = stage({ cx:60, cy:35, cvx:8, qx:50, qy:35, qvx:8, ctrl:'q' }); s2.c.hold = -99;
  const S2 = M().spr[0]; S2.m = 0.6; s2.q.sprint = SPRINT.fade; T.debug.endSprint(s2.q);
  ok(s2.q.sprint === 0, 'a commit or a bind (endSprint) zeroes the ease-out');
  reset();
}
done('13b sprint ends clean');

// 13c. the push: standing men 0.3m apart are parted by 0.4m in a step (they never sink into each other); round a man on the ground it is 0.2m a step
begin('push');
{
  fresh(1); const P = M().players;
  P.forEach((p, i) => { p.x = 5 + (i % 7)*15; p.y = 5 + Math.floor(i/7)*30; p.down = 0; p.bind = null; });
  const [a, b, g, h] = [P[1], P[8], P[2], P[9]];
  a.x = 60; a.y = 35; b.x = 60.3; b.y = 35;                          // two standing opponents, nearly on top of each other
  g.x = 30; g.y = 20; h.x = 30.3; h.y = 20; g.down = 1;              // a standing man beside one on the ground
  T.debug.collide();
  ok(Math.abs(Math.hypot(b.x - a.x, b.y - a.y) - 0.7) < 1e-9, `standing men 0.3m apart are 0.7m apart after one push (${Math.hypot(b.x - a.x, b.y - a.y).toFixed(3)})`);
  ok(Math.abs(Math.hypot(h.x - g.x, h.y - g.y) - 0.5) < 1e-9 && g.x === 30, `beside a man on the ground the standing man is eased out 0.2m and the man down doesn't move (${Math.hypot(h.x - g.x, h.y - g.y).toFixed(3)})`);
  reset();
}
done('13c push');

// 14. staged breakaways, Normal, pace 4 v 4, 30m out: from 4m back a sprint catches him at least 40% of the time, never without; 8m back is gone either way
begin('breakaway');
{
  const team = (id, pace) => T.teams.cleanTeam({ name:id, kit:id === 'USR' ? '#f2efe6' : '#1d3a8f', trim:'#c8102e', pace, power:3, handling:3, kicking:1 }, 0);
  function trial(gap, sprint) {
    T.newMatch(team('USR', 4), team('CPU', 4), { halfLen:9999, diff:1, headless:true, duels:'off' });
    const { c, q } = stage({ ct:1, cx:40, cy:35, cvx:-8, qx:40 + gap, qy:35, qvx:-8, ctrl:'q' });
    const tries0 = M().tries[1], tk0 = M().stats.tackles;
    for (let t = 0; t < 15; t += STEP) {
      const dx = c.x - q.x, dy = c.y - q.y, d = hyp(dx, dy) || 1;
      inp.jx = dx/d; inp.jy = dy/d; inp.aPressed = false;
      if (d < 2.4 && Math.random() < 0.2) inp.aPressed = true;
      const hold = sprint && d < 12; if (hold && !inp.cDown) inp.cPressed = true; inp.cDown = hold;
      T.update(STEP);
      if (M().tries[1] > tries0) return false;
      if (M().stats.tackles > tk0) return true;
      if (M().phase !== 'play' || M().ball.carrier !== c) return false;
    }
    return false;
  }
  const N = 400, rate = (gap, sprint) => { reseed(77); let n = 0; for (let i = 0; i < N; i++) if (trial(gap, sprint)) n++; return n/N; };
  const a4 = rate(4, false), b4 = rate(4, true), a8 = rate(8, false), b8 = rate(8, true);
  ok(a4 === 0 && b4 >= 0.4, `4m back: ${(100*a4).toFixed(0)}% caught without Sprint, ${(100*b4).toFixed(0)}% with it`);
  ok(a8 === 0 && b8 > 0 && b8 < 0.3 && b8 < b4, `8m back: ${(100*a8).toFixed(0)}% without Sprint, ${(100*b8).toFixed(0)}% with it: only Sprint gives a chance, and less than from 4m`);
  inp.cDown = false;
}
done('14 breakaway');

// 15. the offload: Pass while held in a Wrap or Soft with a receiver within 9m goes, the tackler can't intercept it, no ruck; a Big Hit or no receiver gives nothing; the CPU never offloads from a Big Hit; the failure split
begin('offload');
{
  fresh(1); T.debug.setMode('match'); CONTACT.off.wrap = 1; CONTACT.off.soft = 1;
  let k = bind({ ...FRONT, ctrl:'c' }, 'ai', 'wrap'); let r = k.own[1]; r.x = k.c.x - 3; r.y = k.c.y + 4; r.vx = 8;
  T.debug.updateHud();
  ok($('la').textContent === 'Offload' && $('btnA').classList.contains('cue') && !$('btnA').classList.contains('idle'), `A reads Offload and pulses in a Wrap with a receiver near (${$('la').textContent})`);
  const rucks0 = M().stats.rucks, off0 = M().stats.offloads || 0;
  inp.aPressed = true; T.update(STEP);
  ok(M().ball.state === 'air' && M().ball.f.kind === 'pass' && M().ball.f.rolled.has(k.q) && !M().contact && M().stats.rucks === rucks0 && (M().stats.offloads || 0) === off0 + 1, 'the offload goes, the tackler can\'t intercept it and there is no ruck');
  k = bind({ ...FRONT, ctrl:'c' }, 'ai', 'dom'); r = k.own[1]; r.x = k.c.x - 3; r.y = k.c.y + 4;
  T.debug.updateHud();
  ok($('la').textContent === 'Pass' && $('btnA').classList.contains('idle'), 'A reads Pass and is dim in a Big Hit');
  inp.aPressed = true; T.update(STEP);
  ok(M().ball.state === 'held' && M().contact === k, 'Pass in a Big Hit does nothing');
  k = bind({ ...FRONT, ctrl:'c' }, 'ai', 'wrap');
  inp.aPressed = true; T.update(STEP);
  ok(M().ball.state === 'held' && M().contact === k, 'Pass with no receiver within 9m does nothing');
  // the label, the press and the ring pick one man, whatever the stick says: with the stick tilted to a man beyond 9m, the man within 9m on the other side is the Offload
  k = bind({ ...FRONT, ctrl:'c' }, 'ai', 'wrap'); let up5 = k.own[1], down13 = k.own[2];
  up5.x = k.c.x - 3; up5.y = k.c.y - 4; up5.vx = 8; down13.x = k.c.x - 5; down13.y = k.c.y + 12; down13.vx = 8;
  inp.jx = 0; inp.jy = 1; T.debug.updateHud();
  ok(C.offloadTarget(k) === up5 && $('la').textContent === 'Offload' && $('btnA').classList.contains('cue'), 'with the stick tilted towards a man 13m away, Offload reads and the ring sits on the man 5m away on the other side');
  let att0 = M().stats.offAtt || 0; inp.aPressed = true; T.update(STEP);
  ok((M().stats.offAtt || 0) === att0 + 1 && !M().contact, 'and the press offloads to him: the label and the press agree');
  k = bind({ ...FRONT, ctrl:'c' }, 'ai', 'wrap'); up5 = k.own[1]; const down6 = k.own[2];
  up5.x = k.c.x - 3; up5.y = k.c.y - 4; down6.x = k.c.x - 3; down6.y = k.c.y + 5.2;
  inp.jy = 1; ok(C.offloadTarget(k) === down6, 'with both in range the stick picks the side'); inp.jy = -1; ok(C.offloadTarget(k) === up5, 'either way'); inp.jy = 0; ok(C.offloadTarget(k) === up5, 'and the nearest with the stick centred');
  k = bind({ ...FRONT, ctrl:'c' }, 'ai', 'wrap'); down13 = k.own[2]; down13.x = k.c.x - 5; down13.y = k.c.y + 12;
  inp.jy = 1; T.debug.updateHud();
  ok(!C.offloadTarget(k) && $('la').textContent === 'Pass' && $('btnA').classList.contains('idle'), 'with the only man on the stick\'s side 13m away and nobody else in range, A reads Pass and is dim');
  att0 = M().stats.offAtt || 0; inp.aPressed = true; T.update(STEP);
  ok((M().stats.offAtt || 0) === att0 && M().ball.state === 'held' && M().contact === k, 'and the press does nothing, as the label said');
  inp.jy = 0;
  // the CPU never offloads from a Big Hit, and sometimes does from a Wrap
  let domOff = 0, wrapOff = 0, doms = 0, wraps = 0;
  for (let i = 0; i < 2000; i++) { const kk = bind({ ...FRONT, ct:1, cx:60, cvx:-8, qx:58.7, qvx:4, ctrl:'none' }, 'ai'); if (kk.tier === 'dom') { doms++; if (kk.aiOff != null) domOff++; } else { wraps++; if (kk.aiOff != null) wrapOff++; } C.releaseBind(kk); }
  ok(doms > 50 && domOff === 0 && wrapOff > 0, `the CPU never tries an offload from a Big Hit (${domOff} of ${doms}) and does from a Wrap or Soft (${wrapOff} of ${wraps})`);
  // the failure split: held / Knock-On / Loose Ball 50 / 27.5 / 22.5
  CONTACT.off.wrap = 0; CONTACT.off.soft = 0;
  const N = 8000; let held = 0, knock = 0, loose = 0;
  for (let i = 0; i < N; i++) {
    const kk = bind({ ...FRONT, ctrl:'c' }, 'ai', 'wrap'); const rr = kk.own[1]; rr.x = kk.c.x - 3; rr.y = kk.c.y + 4;
    const h0 = M().stats.offHeld || 0, k0 = M().stats.offKnock || 0, l0 = M().stats.offLoose || 0;
    C.offload(kk, true);
    if ((M().stats.offHeld || 0) > h0) held++; else if ((M().stats.offKnock || 0) > k0) knock++; else if ((M().stats.offLoose || 0) > l0) loose++;
  }
  ok(near(held/N, 0.5, 0.02) && near(knock/N, 0.275, 0.02) && near(loose/N, 0.225, 0.02), `a failed offload is held / Knock-On / Loose Ball ${(100*held/N).toFixed(1)} / ${(100*knock/N).toFixed(1)} / ${(100*loose/N).toFixed(1)}`);
  reset(); T.debug.setMode('menu');
}
done('15 offload');

// 16. the ball jolted loose: 9 / 2 / 1% by tier (handling 3), split 55 / 45 Knock-On / Loose Ball
begin('jolt');
{
  const team = (id, h) => T.teams.cleanTeam({ name:id, kit:id === 'A' ? '#f2efe6' : '#1d3a8f', trim:'#c8102e', pace:3, power:3, handling:h, kicking:3 }, 0);
  T.newMatch(team('A', 3), team('B', 3), { halfLen:240, diff:1, headless:true, duels:'off' });
  const N = 20000, got = {};
  let knock = 0, loose = 0;
  for (const tier of ['dom', 'wrap', 'soft']) {
    let j = 0;
    for (let i = 0; i < N; i++) {
      const k = bind(FRONT, 'ai', tier), j0 = M().stats.jolts || 0, k0 = M().stats.joltKnock || 0;
      C.resolveContact(k);
      if ((M().stats.jolts || 0) > j0) { j++; if ((M().stats.joltKnock || 0) > k0) knock++; else loose++; }
    }
    got[tier] = j/N;
    ok(near(got[tier], CONTACT.jolt[tier], 0.005), `${tier}: the ball comes loose ${(100*got[tier]).toFixed(2)}% of the time (${(100*CONTACT.jolt[tier]).toFixed(0)}%)`);
  }
  ok(near(knock/(knock + loose), CONTACT.jolt.fwd, 0.03), `split Knock-On / Loose Ball ${(100*knock/(knock + loose)).toFixed(1)} / ${(100*loose/(knock + loose)).toFixed(1)}`);
  // a loose ball pops back, for anyone; a knock-on is a scrum to the other side
  fresh(1); CONTACT.jolt.wrap = 1; CONTACT.jolt.fwd = 0;
  let k = bind(FRONT, 'ai', 'wrap'); C.resolveContact(k);
  ok(M().ball.state === 'loose' && M().ball.vx < 0 && M().phase === 'play', 'a Loose Ball pops back towards the carrier\'s own line, live for anyone');
  CONTACT.jolt.fwd = 1; k = bind(FRONT, 'ai', 'wrap'); C.resolveContact(k);
  ok(M().phase === 'set' && M().set.kind === 'scrum' && M().set.team === 1 && (M().stats.ko_contact || 0) >= 1, 'a Knock-On in contact is a scrum to the tacklers');
  reset();
}
done('16 jolt');

// 17. Tripped: 40% of missed Ankle Taps slow him to x0.5 for 0.5s
begin('tripped');
{
  fresh(1); CONTACT.ankle = 0;
  const N = 4000; let trips = 0, slow = 0;
  for (let i = 0; i < N; i++) {
    const { c, q } = stage({ ct:1, cx:60, cy:35, cvx:-8, qx:61.2, qy:35, qvx:-9, ctrl:'q' }), t0 = M().stats.trip || 0;
    C.commitTackle(q, c, 'ankle');
    if ((M().stats.trip || 0) > t0) { trips++; if (c.stumble === CONTACT.trip.t && c.stumbleMul === CONTACT.trip.mul) slow++; }
    else if (c.stumble !== CONTACT.stumble[0]) slow -= 1000;
  }
  ok(near(trips/N, CONTACT.trip.p, 0.02) && slow === trips, `${(100*trips/N).toFixed(1)}% of missed Ankle Taps trip him, to x${CONTACT.trip.mul} for ${CONTACT.trip.t}s; the rest stumble`);
  reset();
}
done('17 tripped');

// 18. fends: every broken tackle shows the arm; the Fend tag (and no stumble) only with a clear power edge or at a sprint
begin('fend');
{
  const count = (a, b, sprint) => {
    T.newMatch(a, b, { halfLen:240, diff:1, headless:true, duels:'off' });
    let fends = 0, tags = 0, n = 0, stumbled = 0, arms = 0;
    for (let i = 0; i < 6000; i++) {
      const { c, q } = stage({ ...FRONT, ctrl:'c' }); if (sprint) { c.sprinting = true; M().spr[0].p = c; }
      const f0 = M().stats.fends || 0, t0 = M().stats.tag_Fend || 0;
      const k = C.commitTackle(q, c, 'ai');
      if (k.tier !== 'broken') { C.releaseBind(k); continue; }
      n++; if (c.fend > 0) arms++;
      const fend = (M().stats.fends || 0) > f0; if (fend) fends++; if ((M().stats.tag_Fend || 0) > t0) tags++;
      if (fend ? c.stumble > 0 : c.stumble <= 0) stumbled++;
    }
    return { n, fends, tags, stumbled, arms };
  };
  const eq = count(0, 1, false), edge = count(0, 3, false), spr = count(0, 1, true);
  ok(eq.n > 1000 && eq.arms === eq.n, `every broken tackle shows the fend arm (${eq.arms} of ${eq.n})`);
  ok(eq.fends === 0 && eq.tags === 0, `with no power edge and no sprint there is no Fend (${eq.fends} of ${eq.n})`);
  ok(edge.fends > 0 && edge.fends < 0.5*edge.n && edge.tags === edge.fends, `with a clear power edge a few broken tackles are fends, and only those are tagged (${edge.fends} of ${edge.n})`);
  ok(spr.fends === spr.n && spr.tags === spr.n, `at a sprint every broken tackle is a fend (${spr.fends} of ${spr.n})`);
  ok(eq.stumbled === 0 && edge.stumbled === 0 && spr.stumbled === 0, 'a fend keeps his speed; any other broken tackle costs a stumble');
}
done('18 fend');

// 19. a census of 60 seeded Normal bot matches: run-overs, ruck ball hit at once, turnover ball hit at once, the last tackler, no steals, no new penalty words, no duel in a bind
begin('census');
{
  reseed(9001 + 31);
  let m = 0, runover = 0, rk = 0, rk05 = 0, tov = 0, tov1 = 0, early = 0, badLabel = 0, jack = 0, duelInBind = 0, tagsN = 0, fendTags = 0;
  const tagKinds = new Set(), setLabels = new Set();
  for (let i = 0; i < 60; i++) {
    fresh(1, { a:i % 6, b:(i + 1 + (i % 5)) % 6, duels:'live' });
    let n = 0, wasSet = null, rel = null; const nearSet = new Set();
    while (!M().over && n++ < 60000) {
      bot(); T.update(STEP);
      const Mm = M(), B = Mm.ball;
      if (Mm.phase === 'set' && Mm.set) {
        if (Mm.set.kind === 'ruck') { wasSet = { kind:'ruck', team:Mm.set.team, tackler:Mm.set.tackler, el:Mm.dclock }; if ('jackal' in Mm.set || 'mine' in Mm.set || 'press' in Mm.set) jack++; }
        else wasSet = { kind:Mm.set.kind };
        if (Mm.set.label) { setLabels.add(Mm.set.label); if (Mm.set.kind === 'penalty' && !/^Penalty [A-Z0-9]{3}$/.test(Mm.set.label)) badLabel++; }
      } else if (wasSet && Mm.phase === 'play' && B.state === 'held') {
        if (wasSet.kind === 'ruck') { rel = { kind:B.carrier.team === wasSet.team ? 'ruck' : 'turnover', t:Mm.dclock, p:B.carrier, tackler:wasSet.tackler, end:Mm.dclock }; if (rel.kind === 'ruck') rk++; else tov++; }
        wasSet = null;
      }
      if (Mm.phase === 'cut' && Mm.cut && Mm.cut.duel && Mm.contact) duelInBind++;
      const k = Mm.contact;
      if (k && k.t === 0 && rel && k.c === rel.p && !rel.hit) {
        rel.hit = true; const dt = Mm.dclock - rel.t;
        if (rel.kind === 'ruck' && dt < 0.5) rk05++;
        if (rel.kind === 'turnover' && dt < 1.0) tov1++;
      }
      if (k && k.t === 0 && rel && k.q === rel.tackler && Mm.dclock - rel.end < 0.25) early++;
      if (rel && (B.state !== 'held' || B.carrier !== rel.p)) rel = null;
      if (Mm.phase === 'play' && B.state === 'held' && !B.carrier.bind) {
        const c = B.carrier;
        for (const p of Mm.players) {
          if (p === c || !(p.down > 0)) { nearSet.delete(p); continue; }
          const d = dist(p, c);
          if (d < 0.9) { if (!nearSet.has(p)) { nearSet.add(p); runover++; } } else if (d > 1.05) nearSet.delete(p);
        }
      } else nearSet.clear();
    }
    m++;
    for (const [k, v] of Object.entries(M().stats)) if (k.startsWith('tag_')) { tagKinds.add(k.slice(4)); if (k !== 'tag_Side Step') tagsN += v; if (k === 'tag_Fend') fendTags += v; }   // the bot's bang-bang swerve fires Side Steps a thumb never would (about 37 a match), so they are counted apart
  }
  ok(runover/m < 2, `run-overs ${(runover/m).toFixed(2)} a match (under 2)`);
  ok(rk05/rk < 0.08, `ruck ball tackled within 0.5s ${(100*rk05/rk).toFixed(1)}% (under 8%)`);
  ok(tov1/tov < 0.25, `turnover ball tackled within 1s ${(100*tov1/tov).toFixed(1)}% (under 25%)`);
  ok(early === 0, `the last tackler never tackles before the ruck ends + 0.25s (${early} did)`);
  ok(jack === 0, 'no ruck ever has a jackal, a Steal prompt or a press window');
  ok(badLabel === 0 && ![...setLabels].some(l => /Releasing|Off Your Feet|Rolling Away|High Tackle|Sin Bin|Yellow/.test(l)), `every penalty is a plain Penalty: no new reasons (${[...setLabels].filter(l => /Penalty/.test(l)).join(', ')})`);
  ok(duelInBind === 0, 'no duel ever starts during a bind');
  const allowed = new Set(['Fend', 'Big Hit', 'Ankle Tap', 'Tripped', 'Offload', 'Loose Ball', 'Side Step', 'Dummy', 'Not Fooled']);
  ok([...tagKinds].every(t => allowed.has(t)), `every tag is one of the nine (${[...tagKinds].join(', ')})`);
  ok(fendTags/m >= 1 && fendTags/m <= 15 && tagsN/m < 40, `tags are a few a match, not a stream (Fend ${(fendTags/m).toFixed(1)}, all but Side Step ${(tagsN/m).toFixed(1)})`);
  ok(!/Not Releasing|Off Your Feet|Not Rolling Away|High Tackle|Sin Bin|Yellow Card|'Steal'|jackal/.test(script), 'the game has no steal, no new penalty and no sin bin');
}
done('19 census');

// 20. duels draw nothing new: applyDuel for a tackle and a Big Hit draws no random number and gives the old rucks
begin('duel paths');
{
  fresh(1, { duels:'live' }); T.debug.stage('tackle'); T.update(STEP);
  let c = M().cut; ok(c && c.kind === 'tackle', 'a Tackle duel is staged');
  c.res = 'perfect'; c.act = 1; c.out = 'bighit'; c.verdict = 'Big Hit'; c.good = true;
  let r0 = rndCalls(); T.debug.applyDuel(c);
  ok(rndCalls() === r0 && M().phase === 'set' && M().set.kind === 'ruck' && near(M().set.t, 1.6, 1e-9) && M().set.tier == null, 'the duel Big Hit hands back a 1.6s dominant ruck with no random draw');
  fresh(1, { duels:'live' }); T.debug.stage('past'); T.update(STEP);
  c = M().cut; c.res = 'late'; c.act = null; c.out = 'tackled'; c.verdict = 'Too Late';
  r0 = rndCalls(); T.debug.applyDuel(c);
  ok(rndCalls() === r0 && M().phase === 'set' && M().set.kind === 'ruck' && near(M().set.t, 1.05, 1e-9) && M().set.tier == null, 'a duel tackle hands back the old 1.05s ruck with no random draw');
}
done('20 duel paths');

// 21. words: every label and tag comes from a fixed list, is Title Case and carries no arrow
begin('words');
{
  const SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'on', 'to', 'in', 'for', 'as', 'at', 'by']);
  const title = s => s.split(' ').every((w, i) => (i > 0 && SMALL.has(w)) || /^[A-Z0-9][A-Za-z0-9:'-]*$/.test(w));
  const labels = ['Pass', 'Offload', 'Tackle', 'Switch', 'Kick', 'Drop Goal', 'Push', 'Jump', 'Skip', 'Dummy', 'Block', 'Sprint'];
  const tags = [...script.matchAll(/tag\('([^']+)'/g)].map(m => m[1]);
  const fixedTags = ['Fend', 'Big Hit', 'Ankle Tap', 'Tripped', 'Offload', 'Loose Ball', 'Side Step', 'Dummy', 'Not Fooled'];
  ok(tags.length >= 9 && tags.every(t => fixedTags.includes(t)), `every tag in the code is on the list (${[...new Set(tags)].join(', ')})`);
  ok([...labels, ...fixedTags].every(title), 'labels and tags are Title Case');
  ok(![...labels, ...fixedTags].some(s => /[←→↑↓⇐⇒➜»›]/.test(s)) && !/[←→]/.test(script.replace(/\/\/.*$/gm, '')), 'no arrow glyph in a label, a tag or the code');
  const lc = html.match(/<span id="lc">([^<]+)<\/span>/);
  ok(lc && lc[1] === 'Sprint', 'the third button is labelled Sprint');
  ok(/<dt>Sprint<\/dt>/.test(html) && /<dt>Offload<\/dt>/.test(html) && /<b>L<\/b> Sprint/.test(html), 'How to Play has Sprint and Offload rows and L on the keyboard line');
}
done('21 words');

// 22. layout arithmetic from the CSS: three buttons in a fan, no overlap, gaps of 12px or more, 44px targets, clear of the stick zone and the HUD, B and Sprint mirror images across A's diagonal
begin('layout');
{
  const css = html.match(/<style>([\s\S]*)<\/style>/)[1];
  const rule = cls => { const m = css.match(new RegExp('\\.act\\.' + cls + '\\{([^}]*)\\}')); return m[1]; };
  const num = (s, re) => { const m = s.match(re); return m ? +m[1] : 0; };
  const geo = cls => { const r = rule(cls); return { w:num(r, /width:(\d+)px/), right:num(r, /\+ (\d+)px\);bottom/), bottom:num(r, /inset-bottom,0px\) \+ (\d+)px/) }; };
  const A = geo('a'), B = geo('b'), Cc = geo('c');
  ok(A.w === 88 && B.w === 68 && Cc.w === 68 && B.right === 104 && B.bottom === 70 && Cc.right === 44 && Cc.bottom === 130, `the CSS offsets are the spec's (B +${B.right}/+${B.bottom}, Sprint +${Cc.right}/+${Cc.bottom})`);
  for (const [W, H, insR, insB] of [[667, 375, 0, 0], [932, 430, 0, 0], [932, 430, 59, 21]]) {
    const box = g => { const right = Math.max(20, insR) + (g === A ? 0 : g.right), bottom = insB + (g === A ? 26 : g.bottom); return { x0:W - right - g.w, x1:W - right, y0:H - bottom - g.w, y1:H - bottom, cx:W - right - g.w/2, cy:H - bottom - g.w/2, r:g.w/2 }; };
    const a = box(A), b = box(B), c = box(Cc), gap = (p, q) => hyp(p.cx - q.cx, p.cy - q.cy) - p.r - q.r;
    const tag = `${W}x${H}${insR ? ' insets' : ''}`;
    ok(gap(a, b) >= 12 && gap(a, c) >= 12 && gap(b, c) >= 12, `${tag}: gaps A-B ${gap(a, b).toFixed(1)} A-Sprint ${gap(a, c).toFixed(1)} B-Sprint ${gap(b, c).toFixed(1)} (12 or more)`);
    ok([a, b, c].every(bx => bx.x1 - bx.x0 >= 44 && bx.y1 - bx.y0 >= 44), `${tag}: every target is 44px or more`);
    ok([a, b, c].every(bx => bx.x0 >= 0.52*W && bx.y0 >= 67), `${tag}: nothing inside the stick zone or over the HUD (left edges ${[a, b, c].map(bx => bx.x0.toFixed(0)).join(' ')}, tops ${[a, b, c].map(bx => bx.y0.toFixed(0)).join(' ')})`);
    ok(near(b.cx - a.cx, c.cy - a.cy, 1) && near(b.cy - a.cy, c.cx - a.cx, 1), `${tag}: B and Sprint mirror across A's diagonal (${(b.cx - a.cx).toFixed(0)},${(b.cy - a.cy).toFixed(0)}) v (${(c.cx - a.cx).toFixed(0)},${(c.cy - a.cy).toFixed(0)})`);
  }
  const zone = css.match(/#zone\{([^}]*)\}/)[1];
  ok(/left:env\(safe-area-inset-left,0px\)/.test(zone) && /bottom:env\(safe-area-inset-bottom,0px\)/.test(zone) && /width:calc\(52% - env\(safe-area-inset-left,0px\)\)/.test(zone) && /top:calc\(env\(safe-area-inset-top,0px\) \+ 64px\)/.test(zone), 'the stick zone starts after the notch and stops at the home indicator, and its right edge stays at 52%');
  const rest = (W, H, ins) => T.debug.stickRest(W, H, ins), z = { t:0, r:0, b:0, l:0 };
  ok(rest(844, 390, z).x === 96 && rest(844, 390, z).y === 390 - 118 && rest(667, 375, z).x === 96 && rest(667, 375, z).y === 375 - 118, 'with no inset the resting stick stays at 96, H-118');
  const notch = rest(852, 393, { t:0, r:0, b:21, l:59 });
  ok(notch.x === 129 && notch.y === 393 - 118 && notch.x - 62 >= 59 + 8, `a 59px notch moves the ring to x ${notch.x}, 8px clear, and a 21px home indicator does not lift it`);
  const deep = rest(852, 393, { t:0, r:0, b:80, l:0 });
  ok(deep.x === 96 && deep.y === 393 - (80 + 62 + 8), `a deep home indicator lifts the ring to y ${deep.y}`);
  const capped = rest(667, 375, { t:0, r:0, b:0, l:200 });
  ok(capped.x + 62 <= 0.52*667 - 8, `a huge left inset still keeps the ring left of the buttons (x ${capped.x})`);
  const box0 = T.debug.tagBox(z), boxR = T.debug.tagBox({ t:0, r:59, b:0, l:0 });
  ok(box0.top === 76 && box0.left === 60 && box0.right === 200, 'tags keep the old box when the insets are 0');
  ok(boxR.right === 239 && boxR.top === 76, `a 59px right inset walks the tag clamp in with the buttons (${boxR.right})`);
  const W = 667, H = 375, rect = (l, t, w) => ({ left:l, top:t, width:w, height:w, right:l + w, bottom:t + w });
  $('btnA').rect = rect(W - 108, H - 114, 88); $('btnB').rect = rect(W - 192, H - 138, 68); $('btnC').rect = rect(W - 132, H - 198, 68);
  const hit = (x, y) => { const n = T.debug.nearestAct(x, y); return n && n.key; };
  ok(hit(527, 211) === 'c', 'a tap 8px outside Sprint\'s box, within 12px of its circle, is Sprint');
  ok(hit(509, 313) === 'b', 'a tap 8px below Kick\'s box is Kick');
  ok(hit(10, 10) == null, 'a tap on the pitch, away from the fan, is nothing');
  $('btnC').hidden = true; ok(hit(527, 211) == null, 'Sprint hidden in a close-up takes no near miss'); $('btnC').hidden = false;
  $('btnA').rect = $('btnB').rect = $('btnC').rect = null;
  const short = [...css.matchAll(/@media \(orientation:landscape\) and \(max-height:420px\)\{([\s\S]*?)\n\}/g)].map(m => m[1]).join('\n');
  ok(/grid-template-columns:1fr 1fr/.test(short) && /min-height:44px/.test(short) && !/min-height:(?:[1-3]?\d)px/.test(short.replace(/min-height:44px/g, '')), 'under 420px tall the home settings are two columns and no target drops below 44px');
  const homeH = 44 + 6 + 44 + 6 + (8 + 64 + 8 + 64 + 8), avail = 320 - (12 + 21 + 12);
  ok(homeH <= avail, `that home fits a 320px landscape with a 21px home indicator (${homeH}px of ${avail})`);
  const hud = 4 + (18 + 6) + 2 + (11 + 4), hud0 = 8 + (21 + 12) + 5 + (11 + 8);
  ok(hud < hud0 - 16 && /\.bug\{font-size:18px\}/.test(short), `the scorebug band drops from ${hud0}px to ${hud}px`);
  ok(/\.pause::after\{[^}]*inset:-6px -2px -10px -10px/.test(css), 'the pause glyph stays 44px and its hit target grows inward');
  fresh(); T.debug.setMode('match'); $('controls').hidden = false;
  $('btnC').rect = rect(W - 132, H - 198, 68);
  $('cv').fire('pointerdown', { pointerId:11, clientX:527, clientY:211 });
  ok(inp.cDown && $('btnC').classList.contains('press'), 'that near miss, landing on the pitch, presses Sprint');
  $('cv').fire('pointerup', { pointerId:11 });
  ok(!inp.cDown && !$('btnC').classList.contains('press'), 'letting go on the pitch lets Sprint go');
  $('btnC').rect = null; $('controls').hidden = true;
  const stick = $('stick'), knob = $('knob');
  $('zone').fire('pointerdown', { pointerId:1, clientX:100, clientY:280 });
  $('zone').fire('pointermove', { pointerId:1, clientX:160, clientY:280 });
  $('btnC').fire('pointerdown', { pointerId:2, clientX:700, clientY:300 });
  ok(inp.stickId === 1 && stick.classList.contains('on') && inp.jx > 0.5 && inp.cDown && $('btnC').classList.contains('press'), 'a held stick and Sprint, before the phone turns');
  T.debug.phoneUpright();
  ok(M().paused && inp.stickId === null && !stick.classList.contains('on') && inp.jx === 0 && inp.jy === 0 && knob.style.transform === '' && stick.style.left === '96px', 'turning upright pauses and sends the stick home');
  ok(!inp.cDown && !$('btnC').classList.contains('press') && !$('btnC')._held, 'and lets Sprint go');
  $('zone').fire('pointercancel', { pointerId:1 }); $('btnC').fire('pointercancel', { pointerId:2 });
  ok(inp.stickId === null && !stick.classList.contains('on') && !inp.cDown && !inp.cCancel, 'a cancel that arrives late does not bring the stick or Sprint back');
  T.debug.resume(); T.debug.setMode('menu');
}
done('22 layout');

// 23. render smoke: binds, broken-tackle smoothing, sprint trails and tags at three sizes and once under reduced motion: nothing non-finite reaches the canvas, no drawn man jumps over 0.3m a frame, and drawing draws no random number
begin('render');
{
  const bad = new Map(), mark = k => bad.set(k, (bad.get(k) || 0) + 1);
  const walk = (k, v) => { if (typeof v === 'number') { if (!Number.isFinite(v)) mark(k); } else if (typeof v === 'string') { if (/NaN|Infinity/.test(v)) mark(k); } else if (Array.isArray(v)) for (const x of v) walk(k, x); };
  globalThis.__ctxSpy = (k, a) => { for (const v of a) walk(k, v); };
  let frames = 0, jumps = 0, rndIn = 0, tagsDrawn = 0, bindsDrawn = 0, slides = 0, sprintsDrawn = 0, maxJump = 0;
  for (const [W, H, rm] of [[667, 375, false], [844, 390, false], [932, 430, false], [844, 390, true]]) {
    T.debug.view(W, H); T.debug.setRM(rm);
    reseed(300 + W); fresh(1, { duels:'off' }); T.debug.setMode('match');
    const last = new Map(); let n = 0, settle = 0;
    while (n++ < 600) {
      bot(); if (M().phase === 'play' && M().ball.state === 'held' && M().ball.carrier.team === 1 && (n % 40) < 20) { inp.cDown = true; }   // hold Sprint on and off so the trail is drawn
      const r0 = rndCalls(); const phase = M().phase;
      T.update(STEP);
      const r1 = rndCalls();
      T.debug.render(STEP); T.debug.updateHud();
      if (rndCalls() !== r1) rndIn++;
      frames++;
      if (M().tags.length) tagsDrawn++;
      if (M().contact) bindsDrawn++;
      if (M().players.some(p => p.drawFrom)) slides++;
      if (M().players.some(p => C.sprintLevel(p) > 0)) sprintsDrawn++;
      const playNow = M().phase === 'play' && phase === 'play';
      if (playNow && settle > 2) for (const p of M().players) { const [x, y] = C.drawPos(p), prev = last.get(p); if (prev) { const j = hyp(x - prev[0], y - prev[1]); if (j > 0.3) jumps++; if (j > maxJump) maxJump = j; } last.set(p, [x, y]); }
      else { last.clear(); }
      settle = playNow ? settle + 1 : 0;
    }
    T.debug.setMode('menu');
  }
  globalThis.__ctxSpy = null; T.debug.setRM(false); T.debug.view(844, 390); inp.cDown = false;
  ok(bad.size === 0, `no non-finite value reaches the canvas over ${frames} frames (${[...bad.entries()].map(([k, v]) => k + ' x' + v).join(', ')})`);
  ok(jumps === 0, `no drawn player jumps over 0.3m in a frame (${jumps}, worst ${maxJump.toFixed(2)}m)`);
  ok(rndIn === 0, `drawing draws no random number (${rndIn} frames did)`);
  ok(bindsDrawn > 20 && slides > 20 && tagsDrawn > 0 && sprintsDrawn > 20, `the smoke test saw binds (${bindsDrawn}), slides (${slides}), tags (${tagsDrawn}) and sprints (${sprintsDrawn})`);
}
done('23 render');

// 24. a line break: the last defender comes up onto the inside shoulder; a line that is still set keeps its sweeper; the chase from behind stays a chase
begin('fullback');
{
  const limitFor = [2.8, 2.2, 2.2];
  for (const diff of [0, 1, 2]) {
    fresh(diff, { duels:'off' });
    const { c, opp } = stage({ cx:70, cy:20, cvx:7.5, cvy:0, ctrl:'c' });
    const fb = opp[0];
    fb.x = 86; fb.y = 32;                                          // the last man, goal-side and on the inside; everyone else is behind
    let engaged = false, inside = 0, seen = 0;
    const name = ['Easy', 'Normal', 'Hard'][diff];
    for (let i = 0; i < Math.round(limitFor[diff] / STEP); i++) {
      inp.jx = 1; inp.jy = 0;
      T.update(STEP);
      const gap = dist(fb, c);
      const ct = M().contact;
      const attempted = fb.tcd > 0 || fb.down > 0 || (ct && (ct.q === fb || ct.q2 === fb));
      if (attempted) { engaged = true; break; }
      if (M().phase !== 'play' || M().ball.carrier !== c) break;   // a try or a turnover is not the fullback arriving
      if (gap > 3) { seen++; if (fb.y > c.y + 0.5) inside++; }
    }
    ok(engaged, `${name}: the fullback commits to the tackle within ${limitFor[diff]}s (at ${dist(fb, c).toFixed(1)}m)`);
    ok(seen > 8 && inside > seen * 0.6, `${name}: he comes from the inside, turning the run toward touch (${inside}/${seen})`);
  }
  // two men still in front on Easy: the near one chases, the sweeper holds his depth
  fresh(0, { duels:'off' });
  const easy = stage({ cx:70, cy:22, cvx:6, cvy:0, ctrl:'c' });
  easy.opp[0].x = 80; easy.opp[0].y = 24;
  easy.opp[1].x = 92; easy.opp[1].y = 36;
  const eT = C.computeTargets();
  const near = eT.get(easy.opp[0]), deep = eT.get(easy.opp[1]);
  ok(near && near.pursue, 'Easy, with two men still in front: the near one comes up');
  ok(deep && !deep.pursue && deep.x > easy.c.x + 14, `Easy keeps a sweeper behind that man (${deep && deep.x.toFixed(1)})`);
  // Normal, the same picture: both of the last two commit, and a man behind still chases
  fresh(1, { duels:'off' });
  const mid = stage({ cx:70, cy:22, cvx:7, cvy:0, ctrl:'c' });
  const a = mid.opp[0], b = mid.opp[1], ch = mid.opp[2];
  a.x = 84; a.y = 30; b.x = 96; b.y = 40; ch.x = 66; ch.y = 22;
  const mT = C.computeTargets();
  ok(mT.get(a).pursue && mT.get(a).x < a.x - 3, `Normal brings the nearer last man up (${mT.get(a).x.toFixed(1)} from ${a.x})`);
  ok(mT.get(b).pursue && mT.get(b).x < b.x - 3, `and the deeper one, rather than drifting on (${mT.get(b).x.toFixed(1)} from ${b.x})`);
  ok(mT.get(a).y > mid.c.y && mT.get(b).y > mid.c.y, 'both aim on his inside shoulder');
  ok(mT.get(ch).pursue && Math.abs(mT.get(ch).y - mid.c.y) < 2, 'the covering man behind still chases the carrier');
  a.offside = 1.2;
  const rT = C.computeTargets();
  ok(!rT.get(a).pursue, 'a retiring last man does not come up');
  ok(rT.get(b).pursue, 'the man left in front does');
  // a set line: seven in front, one of them holds the sweeper station and does not pursue
  fresh(1, { duels:'off' });
  const line = stage({ cx:55, cy:35, cvx:6, cvy:0, ctrl:'c' });
  line.opp.forEach((p, i) => { p.x = 64; p.y = 6 + i * 9; });
  const held = line.opp.map(p => C.computeTargets().get(p)).filter(t => t && !t.pursue && t.x > line.c.x + 14);
  ok(held.length === 1, `with the line set, one sweeper holds depth and the rest do not (${held.length})`);
}
done('24 fullback');

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
