/* ---------- the maul (2026-11-09) ----------
   The owner: "For adult games, we could look at potentially having the ball carrier gets tackled, slows down, and maybe you could
   switch and have another player join. And obviously that creates a ruck or a maul situation that you could then drive. So it could
   bring up maul, for example, as a call out, and then you're into having to direction and tap like you would a scrum in order to
   drive." He then chose a close-up like the scrum's.
   Adult games only: never a Kids match, never a Minis one (matchMild), never a drill. A carrier held on his feet in a Soft or Wrap bind
   (contactStep) can call it: your Switch press (B, dead in a bind until now) sends the nearest teammate within MAUL.r in, the bind
   holds, 'Maul' is called and the close-up opens after MAUL.join. The CPU calls one on its own carrier sometimes (maulCpuRate: more
   for a forward, near the line it attacks, with a Power edge), rolled once a bind at MAUL.cpu.at, and you defend it in the close-up.
   With no human in it (AI v AI, the demo, a tool's headless match, a Pro Mode back's match) it is driven in the world instead, by the
   same model with both packs on the CPU's terms (maulAutoStep), so nothing waits on a human.
   The close-up: Bind, then Drive for MAUL.drive seconds. Taps on Push are the shove, read as scrumPush reads them (a timed first
   shove on Drive is worth MAUL.hit metres); the stick's up and down wheels the maul across the pitch (as driveShape reads it), shown
   as the maul's angle and on the pitch strip. Over the line is a maul try; MAUL.use metres or more is Use It, the ball back to the
   scrum-half through a short ruck (a surge past MAUL.strong); less, or driven MAUL.back back, is Held Up and a scrum to the defence.
   No new penalty. MAUL.on false draws exactly as the build before the maul (b706c3e): nothing here runs and no random number is drawn. */
const MAUL = { on:true, r:4, join:0.3,
  cpu:{ at:0.12, base:0.05, fwd:0.05, near:0.10, nearM:15, pow:0.03, max:0.35 },   // the CPU's call, rolled once a bind: base, + a forward, + within nearM of the line it attacks, + a Power point of edge
  set:1.0, drive:3.0, speed:3.4, edge:0.2,   // the Bind call, the Drive's length, metres a second per unit of shove, the attack's edge
  use:1.0, strong:3.0, back:1.5, hit:0.3,    // Use It from 1m, a surge from 3m, Held Up at 1.5m back; a timed first shove
  wheel:0.9, ang:0.6, creep:0.8, edgeY:6,    // the stick turns it 0.9 rad/s to 0.6 rad either way; it slides 0.8 m/s along its turn; never within 6m of touch
  useT:0.5, surge:2.0 };                     // the ruck after Use It, and the surge after a strong one
// MAUL_TUNE
const maulForward = p => CAREER_POS.F.includes(p.n);
function maulMate(c) {                                     // the man who joins: the nearest teammate on his feet within MAUL.r, never one under a ring (Pro Mode's own player stays his own), never one in front of the ball (offside; supportFor's margin)
  const dir = dirOf(c.team);
  let best = null, bd = MAUL.r;
  for (const p of M.players) {
    if (p.team !== c.team || p === c || !onFeet(p) || p.offside > 0 || ringed(p) || (p.x - c.x)*dir > 0.3) continue;
    const d = dist(p, c); if (d < bd) { bd = d; best = p; }
  }
  return best;
}
function maulOpen(k) {                                     // can this bind still become a maul: an adult match in play, the carrier held on his feet in a Soft or Wrap in the field of play (in his own in-goal the tackle is Held in Goal), nothing called yet
  return MAUL.on && !practice && !matchMild() && !!k && M.contact === k && M.phase === 'play' && M.ball.state === 'held' && M.ball.carrier === k.c
    && !k.maul && !k.offloaded && (k.tier === 'soft' || k.tier === 'wrap') && k.t < k.T && (k.c.x - ownLine(k.c.team))*dirOf(k.c.team) >= 0;
}
function maulCan(k) { return maulOpen(k) && !(proPinned(k.c.team) && proSkip()) && !!maulMate(k.c); }   // the B button's Maul: a man to join, and never a Pro Mode back's (his set pieces are played for the team)
function maulPress(t) {                                    // B held in a tackle: the Maul. Nothing happens with nobody near
  const c = ctrlOf(t), k = c && c.bind;
  if (!k || k.c !== c || !maulCan(k)) return false;
  maulCall(k, maulMate(c));
  return true;
}
function maulCpuRate(c) {                                  // how often the CPU carrier calls one when it can
  const P = MAUL.cpu, toLine = (oppLine(c.team) - c.x)*dirOf(c.team);
  return clamp(P.base + (maulForward(c) ? P.fwd : 0) + (toLine <= P.nearM ? P.near : 0) + Math.max(0, powerOf(c.team) - powerOf(1 - c.team))*P.pow, 0, P.max);
}
function maulCall(k, mate) {
  const c = k.c, d = dirOf(c.team);
  k.maul = { t:0, live:false, cut:interactive() && !proSkip(), C:null };
  k.offloaded = true; k.aiOff = null;                      // no offload once the maul is called
  k.mate = mate; mate.bind = k; mate.bindOff = { x:-d*0.75, y:(mate.y >= c.y ? 1 : -1)*0.35 }; endSprint(mate);   // bound on his back: bindMove pulls him in as it pulls a tackler onto the hip
  st('maulCall'); st('maulCall' + c.team);
  if (k.maul.cut) say('Maul', '', c.team); else tag('Maul', c.x, c.y);
  sfx('tackle'); if (ringed(c)) buzz(30, c.team);
}
/* contactStep's hook, every step of a bind: the CPU's call, the join, and the driven maul. True when it has the bind this step. */
function maulStep(k, dt) {
  if (!MAUL.on) return false;
  const m = k.maul, c = k.c;
  if (!m) {
    if (k.maulTried || k.t < MAUL.cpu.at || k.aiOff != null || !(!isHuman(c.team) || proRun(c))) return false;
    k.maulTried = true;
    const mate = maulOpen(k) ? maulMate(c) : null;
    if (!mate || rnd() >= maulCpuRate(c)) return false;
    maulCall(k, mate);
    return true;
  }
  m.t += dt;
  if (!m.live) { if (m.t >= MAUL.join) maulForm(k); return true; }
  maulAutoStep(k, dt);
  return true;
}
function maulNew(k, auto) {                                // the maul's state, for the close-up or the world: each pack's base effort (a CPU pack's drawn as the scrum's), the wave
  const c = k.c, att = c.team;
  const C = { kind:'maul', team:att, x:c.x, y:c.y, k, auto, fwd:0, lat:0, ang:0, v:0, d:0, engaged:false, result:null, cut:!auto,
    line:(oppLine(att) - c.x)*dirOf(att), rate:[0, 0], taps:[0, 0], hit:[false, false], early:[false, false], base:[0, 0], eff:[0, 0], wave:0, msg:[null, null] };
  for (const t of [0, 1]) C.base[t] = maulCpu(C, t) ? (diffOf(t).scrumCpu + (powerOf(t) - 3)*0.06)*(0.75 + rnd()*0.5) : (powerOf(t) - 3)*0.06 + (M.two ? SCRUM_LEVEL[levelOf(t)] : 0);
  C.wave = rnd()*6;
  return C;
}
const maulCpu = (C, t) => C.auto || cpuSide(t);           // a pack the CPU drives: a CPU side's, or both when nobody is in it
function maulForm(k) {                                     // the join is done: the close-up, or the drive in the world
  const m = k.maul, c = k.c;
  st('mauls'); st('maul' + c.team);
  if (m.cut) {
    const C = maulNew(k, false); releaseBind(k); C.men = [c, k.mate, k.q, k.q2].filter(Boolean);
    for (const inp of humanSlots()) { inp.pre = null; inp.reanchor(); inp.held = new Set(inp.keys); }   // as a duel's and a kick's cut-in: touch re-centred, a pad stick latched, held keys ignored (maulSteer)
    startCut(C); return;
  }
  for (const key of ['q', 'q2']) if (k[key] && ringed(k[key])) { maulLetGo(k, k[key]); k[key] = null; }   // a man under a ring is never bound into a maul he cannot play (Pro Mode's back as the tackler)
  m.C = maulNew(k, true); m.C.men = [c, k.mate, k.q, k.q2].filter(Boolean); m.live = true; m.v = { x:0, y:0 };
}
function maulLetGo(k, q) {                                 // a tackler let out of a maul in the world: he rolls away off its side and retires, as tackle() has him do from a ruck of the usual length
  const c = k.c, d = dirOf(c.team), T = RUCK.t.normal + 0.25;
  q.bind = null;
  slide(q, clamp(c.x + d*1.0, 0.5, 119.5), clamp(c.y + (q.y >= c.y ? 1 : -1)*1.6, 1, 69), 0.15);
  q.vx = q.vy = 0; q.down = T; q.tcd = q.offside = T + RUCK.retire;
}
const maulCpuEff = (C, s) => C.base[s]*(1 + 0.22*Math.sin(C.d*2.4 + C.wave + s*1.7));   // a CPU pack's shove, with a little wave
function maulCpuSteer(C) {                                 // the CPU attack wheels gently towards the middle, with a sway
  const y = C.y + C.lat;
  return clamp((35 - y)/25, -1, 1)*0.35 + Math.sin(C.d*1.3 + C.wave)*0.25;
}
function maulSteer(inp) {                                  // a human's wheel: world()'s up and down, but never a key or a pad stick held into the close-up (a duel's sideX): a held key is skipped and a latched stick reads nothing
  let x = inp.latch ? 0 : inp.jx, y = inp.latch ? 0 : inp.jy, px = 0, nx = 0, py = 0, ny = 0;
  for (const code of inp.keys) { const d = KEYDIR[code]; if (!d || inp.held.has(code)) continue; if (d[0] > 0) px = 1; else if (d[0] < 0) nx = 1; if (d[1] > 0) py = 1; else if (d[1] < 0) ny = 1; }
  const kx = px - nx, ky = py - ny;
  if (kx || ky) { const m = hyp(kx, ky); x = kx/m; y = ky/m; }
  const t = stickTurn(inp.seat);
  return t ? x*t : y;                                      // a behind view turns the stick as world() does
}
function maulDrive(C, dt, eff) {                           // one step of the drive, the close-up's and the world's: the wheel, then the ground made along it
  const att = C.team, def = 1 - att;
  let s = 0;
  for (const t of [0, 1]) if (!maulCpu(C, t)) { const inp = inputOf(t); if (inp) s += maulSteer(inp); }   // the stick's up and down, from each human in it
  if (maulCpu(C, att)) s += maulCpuSteer(C);
  const y = C.y + C.lat;
  if ((y <= MAUL.edgeY && s < 0) || (y >= 70 - MAUL.edgeY && s > 0)) s = (35 - y)/35;   // never wheeled into touch: near it, the maul comes back off the line
  C.ang = clamp(C.ang + clamp(s, -1, 1)*MAUL.wheel*dt, -MAUL.ang, MAUL.ang);
  C.eff = eff; C.d += dt;
  C.v = MAUL.speed*(eff[att] + MAUL.edge - eff[def]);
  C.fwd += C.v*Math.cos(C.ang)*dt;
  const lo = Math.min(C.y, MAUL.edgeY) - C.y, hi = Math.max(C.y, 70 - MAUL.edgeY) - C.y;
  C.lat = clamp(C.lat + (C.v + MAUL.creep)*Math.sin(C.ang)*dt, lo, hi);
}
function maulOver(C) {                                     // the verdict, when there is one: over the line, driven back, or the Drive's time up
  if (C.fwd >= C.line + 0.3) return 'try';
  if (C.fwd <= -MAUL.back) return 'held';
  if (C.d >= MAUL.drive) return C.fwd >= MAUL.use ? 'use' : 'held';
  return null;
}
function maulPush(C, s, dt) {                              // a human pack's shove this step, as scrumPush: a timed first shove on Drive, then the taps of the last quarter second or so
  const t = C.t, inp = inputOf(s), sign = s === C.team ? 1 : -1;
  if (inp && inp.aPressed && t > CUT_IN) {
    const note = text => { if (M.two) C.msg[s] = { text, at:t }; else say(text, 'small'); };
    if (t < MAUL.set - 0.08) { if (!C.early[s] && !C.hit[s]) { C.early[s] = true; note('Early'); } }   // a press in the Bind call forfeits the timed shove, nothing more
    else if (!C.hit[s] && !C.early[s] && t <= MAUL.set + 0.28) { C.hit[s] = true; C.fwd += MAUL.hit*sign; note('Good Timing'); buzz(25, s); }
    if (t >= MAUL.set) { C.rate[s] += 1; C.taps[s]++; }
  }
  if (t < MAUL.set) return 0;
  C.rate[s] *= Math.exp(-dt/0.25);
  return 0.85*Math.min(1.3, C.rate[s]/1.25) + C.base[s];   // 5 taps a second is a full shove, about 6.5 the most, as the scrum
}
function updateMaul(C, dt) {                               // the close-up's step (updateCut)
  const eff = [0, 1].map(s => (maulCpu(C, s) ? 0 : maulPush(C, s, dt)));
  if (C.t < MAUL.set || C.result) return;
  if (!C.engaged) { C.engaged = true; sfx('tackle'); buzz(40); }
  for (const s of [0, 1]) if (maulCpu(C, s)) eff[s] = maulCpuEff(C, s);
  maulDrive(C, dt, eff);
  const res = maulOver(C); if (res) maulResult(C, res);
}
function maulAutoStep(k, dt) {                             // the maul driven in the world: the carrier walks the model's ground, the men bound to him follow (bindMove)
  const C = k.maul.C, d = dirOf(C.team), f0 = C.fwd, l0 = C.lat;
  maulDrive(C, dt, [maulCpuEff(C, 0), maulCpuEff(C, 1)]);
  k.maul.v = { x:d*(C.fwd - f0)/dt, y:(C.lat - l0)/dt };
  const res = maulOver(C); if (res) maulResult(C, res);
}
function maulPlace(C, ex, ey) {                            // the men where the maul ended; after a close-up everyone else moves with it too (the world was frozen under it)
  const k = C.k, c = k.c, d = dirOf(C.team), dx = ex - c.x, dy = ey - c.y, men = new Set(C.men), sy = (k.q && k.q.y >= c.y) ? 1 : -1;
  if (C.cut) for (const p of M.players) if (!men.has(p)) { p.x = clamp(p.x + dx, 0.5, 119.5); p.y = clamp(p.y + dy, 1, 69); p.drawFrom = null; }
  const at = (p, x, y) => { if (!p) return; if (C.cut) { p.x = x; p.y = y; p.drawFrom = null; } else slide(p, x, y, 0.15); p.vx = p.vy = 0; p.bind = null; };
  at(c, ex, ey); at(k.mate, ex - d*0.3, ey - sy*0.9); at(k.q, ex + d*0.9, ey + sy*0.6); at(k.q2, ex + d*0.9, ey - sy*0.9);
  const T = MAUL.useT;
  c.down = T + 0.15; if (k.mate) k.mate.down = T;
  for (const q of [k.q, k.q2]) if (q) { q.down = T + 0.1; q.tcd = q.offside = T + 0.25 + RUCK.retire; }   // the defenders in it retire, as from a ruck
}
function maulResult(C, res) {
  C.result = res;
  const att = C.team, def = 1 - att, d = dirOf(att), k = C.k;
  st('maul_' + res); st('maulM', C.fwd); st('maulDrive', C.d);
  const ex = clamp(C.x + d*C.fwd, 0.5, 119.5), ey = clamp(C.y + C.lat, 1, 69), strong = res === 'use' && C.fwd >= MAUL.strong;
  const apply = () => {
    releaseBind(k);
    if (C.cut) M.stats.gain[att] += C.fwd;               // the ground a close-up's maul made is carried ground (a maul in the world counts it as it goes)
    maulPlace(C, ex, ey);
    if (res === 'try') { const c = k.c; c.x = clamp(oppLine(att) + d*0.6, 0.5, 119.5); c.down = 0; scoreTry(c); return; }
    if (res === 'held') { placeBall(ex, ey); deadBall(() => scrum(def, ex, ey, 'Held Up')); return; }
    const bx = clamp(ex - d*0.4, 1, 119), by = clamp(ey, 1, 69);
    placeBall(bx, by); M.phaseCount++;
    startSet({ kind:'ruck', team:att, x:bx, y:by, t:MAUL.useT, maul:true, then:s => { releaseTo(att, s.x, s.y, 'ruck', s.picker); if (strong) surge(att, MAUL.surge); } });   // Use It: the ball back to the scrum-half, quick
  };
  if (!C.cut) { if (res === 'use') tag('Use It', ex, ey); else if (res === 'held') tag('Held Up', ex, ey); apply(); return; }   // driven in the world: its verdict on the pitch (a try says so itself)
  say(res === 'try' ? 'Maul Try' : res === 'use' ? 'Use It' : 'Held Up', res === 'use' && !strong ? 'small' : '', res === 'held' ? def : att);
  if (res === 'held') sfx('whistle'); else if (res === 'try') sfx('roar');
  finishCut(apply, res === 'try' ? 0.6 : 0.8);
}
function maulResume(C) { if (!C.engaged) C.t = Math.max(CUT_IN, C.t - 0.6); }   // a pause before the Drive gives the thumb a moment, as the scrum's
function maulCues(C) {                                     // two player's bottom bar: each pack's Push, and the stick for both
  const out = [];
  for (const t of [0, 1]) { const s = seatOfTeam(t); if (s != null) out.push([s, seatKey(s, 'a') + ' · Push · ' + maulSteerKey(s) + ' · Steer']); }
  return out;
}
function maulSteerKey(s) { const sch = seatScheme(s); return !sch ? 'Stick' : sch === 'right' ? 'Arrows' : 'W S'; }   // the stick's up and down: a pad's stick, the arrows, or W and S
function maulHint(C, t, kb) { return C.result ? null : card('Maul', C.team === t ? 'Your Ball' : 'Hold Them Up', [row([chip('v')], kb ? 'Steer' : 'Steer With the Stick'), row([chip('a', 'Push')], 'Tap Push to Drive')]); }
function maulTutCards(name, steer) { return [['Maul', 'Steer With ' + steer], ['Maul', 'Tap ' + name('a', 'Push') + ' to Drive']]; }
