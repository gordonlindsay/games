/* ---------- passing and kicking ---------- */
const LONG = { arm:0.18, auto:0.6, gate:0.12, range:32, knock:0.03 };   // hold past arm to skip a man; the ball leaves on release, or on its own at auto
/* The pass leads the receiver (2026-10-17). A pass used to be thrown at where the receiver stood, and while it was in the air he braked
   for it (arrive-style seek), so a completed pass lost about 5m and he took it standing still. Now the ball goes where he will be
   running on upfield, he runs onto it at pace whatever the stick says (the stick takes over at the catch), and the line keeps running
   while the ball is in the air. Every lever is here: a: his pick-up (m/s²) from his upfield speed now to top speed × pace; cpu: the
   CPU receiver's pace (a human's is 1; this is the one-player balance lever: 0.6 gives about 87 / 47 on Normal / Hard, 0.7 about
   81 / 42 at the old ball pace; PASS_FLIGHT left it at 0.65: paired runs could not tell 0.65 from 0.68, so don't read a small Hard move as this lever's); keep: how much of his sideways drift the aim keeps; back: the landing spot is capped this far behind the passer at
   release, and never forward after the handling error (the law); line: the support slots' upfield lead while a pass is in the air,
   in seconds of the receiver's top speed; kpBack: how far behind the carrier the Key Pass runner may be (6 before the lead). */
const RUNON = { a:18, cpu:0.65, keep:0.5, back:0.4, line:0.45, kpBack:7.5 };
/* One runner on the open shoulder (2026-10-31). lat / back: where he starts, wide of the ball and behind it. clear: he slides
   while a defender is closer than this. mark: the pass ring tints when a defender is closer than this to the man it is on.
   latMax / backMax keep him inside the Key Pass box (4–12m wide, inside kpBack). tint: the marked colour, the alert chalk. */
const SUPPORT = { lat:5, back:2.6, clear:5, mark:5, latMax:11.2, backMax:6.4, tint:'#ff8466' };
/* How long a pass hangs in the air (2026-11-08, from the owner's phone playtest: passing in a match is a little hectic). The ball's speed is
   divided by this, so the flight lasts longer and the lead, the Block lane and the sure pass all aim for the slower ball. It is the one lever to
   retune after the kid test: 1 is the old pace. match: every match but Kids, Two Player and Training included (your passes hang 13% longer on the
   bot's mix). kids: a Kids match, both sides' passes (yours 30% longer), at the start of the Kids scale: KIDS_SCALE.flight runs from it to the old
   pace at the ceiling (src/kids.js). A long pass stays off it: it hangs already. A short pass capped by the law stays near the old pace too
   (capSpeed), or he brakes for it.
   grace: a slower ball alone left your catcher tackled in the next 0.3s far more often (Kids 22% to 34%, Normal 32% to 38%, Hard 36% to 45%), and
   easing the defence or the receiver in the air did not bring that back. So your catcher has this long after a catch, by level, before an AI man can
   commit: Kids (at the start of its scale: KIDS_SCALE.grace runs from it to none at the ceiling), then Easy, Normal, Hard. It costs the bot's Hard
   balance: 53% at the old pace, about 61% if Hard had 0.25, 57% at its 0.15, and it leaves Hard's rate 4 points up.
   PASS_FLIGHT='{"match":1.25}' node tools/bot.mjs tries a value without an edit. */
const PASS_FLIGHT = { match:1.2, kids:1.4, grace:[0.25, 0.25, 0.15], graceKids:0.35 };
const passFlight = () => (M && M.kids ? KIDS.flight : PASS_FLIGHT.match);   // a Kids match plays its rating's (kidsTune)
const passSpeedOld = (n, long) => (15 + n.handling*1.1) * (long ? 0.88 : 1);   // the ball before the lever: a long pass hangs a little, so the loop reads
const passSpeed = (n, long) => passSpeedOld(n, long) / (long ? 1 : passFlight());   // a long pass keeps its pace: it hangs already, and the lever on top held one up to 2.9s with the stick doing nothing
const passPace = team => (isHuman(team) ? 1 : RUNON.cpu);   // how hard a side's receiver runs onto the ball, by role
function runOn(r, d, t, pace) {                             // how far upfield r gets in t seconds running on from his upfield speed now, picking up at RUNON.a to top speed × pace
  const vm = maxSpeed(r)*pace, v0 = clamp(r.vx*d, 0, vm), ta = Math.min(t, (vm - v0)/RUNON.a);
  return v0*ta + 0.5*RUNON.a*ta*ta + vm*(t - ta);
}
function capSpeed(to, d, need, far, fast, slow, pace) {      // the law fixes the landing spot, so a longer flight only makes him brake for it: the ball's speed, between the old pace and the lever's, that lets him reach the spot at his run
  const t = v => far/v + 0.06;
  if (need <= runOn(to, d, t(fast), pace)) return fast;
  if (need >= runOn(to, d, t(slow), pace)) return slow;
  for (let i = 0; i < 8; i++) { const v = (fast + slow)/2; if (runOn(to, d, t(v), pace) < need) fast = v; else slow = v; }
  return slow;
}
function leadPass(from, to, o) {                            // the aim: where the ball lands if he runs onto it, before the handling error. blockSpec reads the same point, so the Block close-up shows the line the ball takes
  o = o || {};
  const d = dirOf(from.team), n = M.nat[from.team], pace = passPace(from.team);
  let spd = passSpeed(n, o.long), tx = to.x, ty = to.y, T = 0.2;
  for (let i = 0; i < 4; i++) { T = hyp(tx-from.x, ty-from.y)/spd + 0.06; tx = to.x + d*runOn(to, d, T, pace); ty = to.y + to.vy*RUNON.keep*T; }
  if ((tx-from.x)*d > -RUNON.back) {
    tx = from.x - d*RUNON.back;
    spd = capSpeed(to, d, (tx-to.x)*d, hyp(tx-from.x, ty-from.y), passSpeedOld(n, o.long), spd, pace);
  }
  return { x:tx, y:ty, T, spd };
}
function runOnTarget(r, f, pace) {                          // the receiver while the pass is in the air: onto the landing spot as the ball gets there, at pace, never braking for it
  const rem = Math.max(STEP, f.T - f.t), dd = hyp(f.x1 - r.x, f.y1 - r.y);
  return { x:f.x1, y:f.y1, s:Math.min(maxSpeed(r)*pace, dd/rem), a:RUNON.a, pursue:true };
}
function passOk(c, q, maxR) {
  if (!q || q === c || q.team !== c.team || q.down > 0 || q.bind) return false;
  if (practice && gapSpent(q)) return false;               // Create a Gap: a man who has passed is out of the line (training.js)
  if ((q.x - c.x)*dirOf(c.team) > 0.5) return false;
  const dd = dist(c, q);
  return dd >= 1.5 && dd <= maxR;
}
function pickReceiver(c, pref, maxR = 22) {                 // maxR: an offload reaches only CONTACT.off.range
  const d = dirOf(c.team); let best = null, bs = 1e9;
  for (const q of M.players) {
    if (q.team !== c.team || q === c || q.down > 0 || q.bind) continue;
    if (practice && gapSpent(q)) continue;                 // Create a Gap: the man who passed to you is never the next pass (training.js)
    const dx = (q.x-c.x)*d; if (dx > 0.5) continue;
    const dy = q.y-c.y, dd = hyp(dx,dy);
    if (dd > maxR || dd < 1.5) continue;
    let s = dd;
    if (pref < -0.3 && dy > 0) s += 30;
    if (pref > 0.3 && dy < 0) s += 30;
    if (s < bs) { bs = s; best = q; }
  }
  return best;
}
function pickLong(c, pref, skip) {                          // the next man out, on the stick's side or the side with more support, within LONG.range and not forward
  if (!skip) return null;                                  // with nobody to skip, a hold stays a normal pass
  const all = [];
  for (const q of M.players) {
    if (!passOk(c, q, LONG.range) || q === skip) continue;
    const dy = q.y - c.y, dd = dist(c, q);
    if (dd < dist(c, skip) + 0.5) continue;                // out means further than the man this pass skips
    all.push({ q, dy, dd });
  }
  if (!all.length) return null;
  let side = pref < -0.3 ? -1 : pref > 0.3 ? 1 : 0;
  if (!side) {
    let neg = 0, pos = 0;
    for (const q of M.players) {
      if (!passOk(c, q, LONG.range)) continue;
      const dy = q.y - c.y;
      if (dy < -0.4) neg++; else if (dy > 0.4) pos++;
    }
    if (pos > neg) side = 1; else if (neg > pos) side = -1;
  }
  let pool = all;
  if (side) {
    pool = all.filter(o => side > 0 ? o.dy > 0.3 : o.dy < -0.3);
    if (!pool.length) return null;                         // nobody further on that side: the press stays a normal pass
  }
  pool.sort((a, b) => a.dd - b.dd);
  return pool[0].q;
}
function passAim(c, pref) { const near = pickReceiver(c, pref); return { near, far:pickLong(c, pref, near) }; }
function shownPass(c) {                                   // the ring and the pass read this together, so the ball goes to the man the ring is on
  const inp = inputOf(c.team), pref = inp ? inp.world().y : 0, aim = passAim(c, pref), p = sideOf(c.team).pass;
  const charge = p && p.mode === 'hold' ? Math.min(1, p.t/LONG.auto) : 0;
  const out = p && p.mode === 'tap' ? { to:passOk(c, p.to, 22) ? p.to : aim.near, skip:null, gold:false, charge:0 }
    : p && p.mode === 'hold' && p.t >= LONG.arm && aim.far ? { to:aim.far, skip:aim.near, gold:true, charge }
    : { to:aim.near, skip:null, gold:false, charge };      // a short hold still tracks the ring
  out.marked = !!(out.to && pressure(out.to) < SUPPORT.mark);   // white when he is free, tinted when a defender is on him
  return out;
}
function bestReceiver(p) {
  const d = dirOf(p.team); let best = null, bs = -1e9;
  for (const q of M.players) {
    if (q.team !== p.team || q === p || q.down > 0 || q.bind) continue;
    const dx = (q.x-p.x)*d; if (dx > 0.3) continue;
    const dd = dist(p,q); if (dd < 2 || dd > 20) continue;
    const sp = pressure(q), s = sp - dd*0.12;
    if (s > bs) { bs = s; best = { q, space:sp }; }
  }
  return best;
}
function doPass(from, to, o) {
  o = o || {};
  if (M.careerPro) [to, o] = proPass(from, to, o);       // Pro Mode: a teammate may give it to your player instead (career-pro.js)
  const b = M.ball, n = M.nat[from.team], d = dirOf(from.team);
  const spd = passSpeed(n, o.long);
  let tx, ty, T, v = spd;
  if (o.sure) {                                            // a won Key Pass: thrown at where the runner is going, as it always was, and never caught in touch
    tx = to.x; ty = to.y; T = 0.2;
    for (let i = 0; i < 3; i++) { T = hyp(tx-from.x, ty-from.y)/spd + 0.06; tx = to.x + to.vx*T; ty = to.y + to.vy*T; }
    if ((tx-from.x)*d > 0) tx = from.x;
    ty = clamp(ty, 3, 67);
  } else {                                                 // led: where he will be running on, then the handling error, and never forward of the passer (the law)
    const a = leadPass(from, to, o); tx = a.x; ty = a.y; v = a.spd;
    const err = ((5-n.handling)*0.08 * (o.long ? 1.7 : 1) + (o.long ? 0.4 : 0))*(M.kids && isHuman(from.team) ? KIDS.passErr : 1); tx += gauss()*err; ty += gauss()*err;   // Kids: your passes stray less
    if ((tx-from.x)*d > 0) tx = from.x;
  }
  T = hyp(tx-b.x, ty-b.y)/v + 0.06;
  const dist = hyp(tx-b.x, ty-b.y);
  const H = o.long ? Math.min(6.4, 1.5 + dist*0.11) : 0.5;   // higher with the distance, so it sails over the skipped man's defender
  b.state = 'air'; b.carrier = null; b.last = from.team;
  b.f = { kind:'pass', team:from.team, x0:b.x, y0:b.y, x1:tx, y1:ty, t:0, T, H, z0:1.1, z1:1.1, rolled:new Set(o.skip || []), onside:null, target:to,
    sure:!!o.sure, boost:o.boost || null, long:!!o.long };
  from.hold = 0; from.quick = false;
  M.stats.passes++;
  if (M.career) careerLifePass(from, to);                  // a career match: a pass to or from your player, for Team Spirit
  if (o.long) { st('long'); st('long' + from.team); }
  if (isHuman(from.team)) setCtrl(from.team, to);
  sfx('pass');
}
function kickBall(team, x0, y0, x1, y1, T, H, kind) {
  const b = M.ball, d = dirOf(team);
  const onside = new Set();
  for (const p of M.players) if (p.team === team && (kind === 'restart' || (p.x-x0)*d <= 0.5)) onside.add(p);
  b.state = 'air'; b.carrier = null; b.last = team;
  b.f = { kind, team, x0, y0, x1, y1, t:0, T, H, z0:0.4, z1:0, rolled:new Set(), onside, target:null };
  b.x = x0; b.y = y0; b.z = 0.4;
  b.kickInfo = kind === 'kick' ? { team, ownHalf:(x0-60)*d < 0 } : null;
  M.phase = 'play';
  clearCharge();
  for (const t of [0, 1]) if (isHuman(t)) { const q = nearestFree(t, x1, y1); if (q) setCtrl(t, q); }
  if (kind === 'kick') chaseStart(team, onside);           // an open-play kick: its onside men chase it, the other side is caught out (src/chase.js)
}
function chargeDown(c) {                                   // a tactical kick's roll: a defender on top of the kicker gets a 30% charge-down
  let q = null, bd = 1.7;
  for (const o of M.players) if (o.team !== c.team && o.down <= 0) { const d = dist(o,c); if (d < bd) { bd = d; q = o; } }
  if (!q || rnd() > 0.3) return false;
  chargeDownBy(c, q);
  return true;
}
function chargeDownBy(c, q, quiet, at) {                   // q blocks c's kick and the ball bounces back loose. at: where he lands, 1.2m from the kicker on the side he came from (a drop's charger ran there; a tactical kick's roll leaves him where he stood)
  const b = M.ball, d = dirOf(c.team);
  if (at) { put(q, at); q.vx = q.vy = 0; }
  b.state = 'loose'; b.carrier = null; b.f = null; b.last = q.team; b.kickInfo = { team:c.team, ownHalf:false };   // a kicked ball: whoever gathers it, that is no turnover
  if (at) {                                                // off the charger's hands, away from him: a man from behind knocks it on, one from in front back
    const m = hyp(c.x - at.x, c.y - at.y) || 1, ux = (c.x - at.x)/m, uy = (c.y - at.y)/m, sp = 3 + rnd()*4, side = (rnd()-0.5)*5;
    b.x = c.x + ux*0.6; b.y = c.y + uy*0.6; b.z = 1; b.vx = ux*sp - uy*side; b.vy = uy*sp + ux*side; b.vz = 2;
  } else { b.x = c.x + d*0.6; b.y = c.y; b.z = 1; b.vx = -d*(3+rnd()*4); b.vy = (rnd()-0.5)*5; b.vz = 2; }
  c.hold = 0;
  M.phase = 'play'; clearCharge();
  if (!quiet) { say('Charged Down', 'small'); sfx('tackle'); }
}
function doKick(c, power, lat) {
  if (chargeDown(c)) return;
  const n = M.career ? careerNatOf(c) : M.nat[c.team], d = dirOf(c.team);   // a career match: your player's own kicking
  const len = 10 + power*(36 + n.kicking*3);
  const ang = clamp(lat, -1.2, 1.2)*0.75 + gauss()*(0.13 - n.kicking*0.015);
  const tx = c.x + d*len*Math.cos(ang), ty = c.y + len*Math.sin(ang);
  c.hold = 0;
  M.stats.kicks++;
  kickBall(c.team, c.x, c.y, tx, ty, 0.8 + len/28, 2.5 + len*0.26, 'kick');
  traitKick(c);                                            // a Long Boot's kick runs on where it lands (src/traits.js)
  sfx('kick');
}
function aiKick(p, type) {
  const d = dirOf(p.team), n = M.nat[p.team];
  if (type === 'clear') doKick(p, 0.8 + rnd()*0.2, p.y < 35 ? -0.75 : 0.75);
  else if (type === 'territory') doKick(p, 0.7 + rnd()*0.3, (rnd()-0.5)*0.8);
  else cpuDrop(p);
}

