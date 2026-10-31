// Passing (2026-10-17): the pass leads the receiver, who runs onto it. Staged passes through the real doPass and update path,
// then a census of bot matches. Exits 1 on any failure.
//   1. the lead: a pass lands upfield of where the receiver stood and never forward of the passer; a team 1 pass is the exact mirror;
//      a CPU passer leads less (RUNON.cpu)
//   2. never forward: 5,000 random staged passes, every landing spot behind the passer after the handling error
//   3. runs onto it: the human receiver takes a led pass at pace whatever the stick says (upfield, toward touch, let go), an AI
//      receiver at his side's pace; a won Key Pass's sure pass keeps today's target and seek exactly
//   4. the line in the air: the supports keep running while a pass is in the air
//   5. the Block lane is the line the ball will take
//   6. census guard: 12 bot matches a level with the thumb holding its direction through the flight
//   7. the open shoulder: one runner held behind the ball on the free side, and the pass ring white, tinted or gold
// node tools/passing.mjs            (SEED=1 unless set)
process.env.SEED ??= '1';
const { T, bot, reseed } = await import('./harness.mjs');
const C = T.contact, S = T.sides, STEP = T.STEP, M = () => T.M, inp = T.input;
const hyp = Math.hypot, near = (a, b, e) => Math.abs(a - b) <= e, dirOf = t => (t === 0 ? 1 : -1);
let failed = 0, passed = 0, group = '';
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', group + ':', msg); } };
const done = name => { console.log(`${name.padEnd(22)} ${failed ? 'FAIL so far ' + failed : 'ok'} (${passed} passed)`); };
const begin = name => { group = name; };
const guard = fn => { try { fn(); } catch (e) { ok(false, `threw ${e && e.message}`); } };   // a build without the fix (no leadPass) reports a failure here instead of dying
const mean = a => a.reduce((s, v) => s + v, 0)/(a.length || 1);
const team = (id, handling, pace = 3) => ({ id, name:id, kit:'#1a1a1a', trim:'#f2efe6', pace, power:3, handling, kicking:3 });
// a match of two sides with the given handling, both human (two player) or the human at home against the CPU; everyone parked 40m+ away
const fresh = (o = {}) => { T.newMatch(team('TA', o.h ?? 3), team('TB', o.h ?? 3), { halfLen:240, diff:o.diff ?? 1, headless:true, duels:o.duels || 'off', humans:o.humans || [true, false] }); const m = M(); m.phase = 'play'; m.set = null; m.clock = 30; m.dclock = 100; return m; };
// stage a pass: the passer of team t at (x, y) running (vx, vy) upfield, the receiver `back` m behind him and `wide` m across (sign: screen down), running (rvx, rvy) in his own frame
function stage(t, o) {
  const m = M(), d = dirOf(t), P = m.players, own = P.filter(p => p.team === t), opp = P.filter(p => p.team !== t);
  for (const p of P) { Object.assign(p, { vx:0, vy:0, down:0, tcd:0, side:-1, boost:0, boostMul:1, hold:2, drop:null, quick:false, bind:null, offside:0, sprint:0, sprinting:false, stumble:0, wf:0, fend:0, think:0 }); }
  own.forEach((p, i) => { p.x = Math.max(1, Math.min(119, o.x - d*(40 + 3*i))); p.y = 4 + i*9; p.fx = d; p.fy = 0; });
  opp.forEach((p, i) => { p.x = Math.max(1, Math.min(119, o.x + d*(45 + i))); p.y = 4 + i*9; p.fx = -d; p.fy = 0; });
  const from = own[0], to = own[1];
  Object.assign(from, { x:o.x, y:o.y, vx:(o.vx ?? 7)*d, vy:o.vy ?? 0, fx:d, fy:0 });
  Object.assign(to, { x:o.x - d*o.back, y:o.y + o.wide, vx:(o.rvx ?? 2)*d, vy:o.rvy ?? 0, fx:d, fy:0 });
  const b = m.ball; b.state = 'held'; b.carrier = from; b.f = null; b.last = t; b.kickInfo = null; b.x = from.x + d*0.55; b.y = from.y; b.z = 1; b.vx = b.vy = b.vz = 0;
  m.phase = 'play'; m.set = null; m.cut = null; m.goal = null; m.hooter = false;   // a knock-on from the last pass left a scrum pending
  m.poss = t; m.contact = null; m.duelPending = null; m.tags = [];
  if (S.isHuman(t)) S.setCtrl(t, from);
  for (const s of m.side) { s.ctrlPrev = s.ctrl; s.ctrlT = 1; s.pass = null; s.charging = false; }
  const i = S.inputOf(t); if (i) { i.jx = i.jy = 0; i.aPressed = i.bPressed = i.cPressed = false; i.aDown = i.bDown = i.cDown = false; i.keys.clear(); }
  return { from, to, d };
}
// play a staged pass in the air to the end; stick(step) sets the receiving side's stick each step. Returns what happened at the catch
function fly(t, stick) {
  const m = M(), b = m.ball, to = b.f.target, d = dirOf(t), x1 = b.f.x1, y1 = b.f.y1, knocks = m.stats.knocks, i = S.inputOf(t);
  let n = 0, out = null;
  while (b.state === 'air' && n++ < 400) {
    if (i && stick) { const s = stick(n); i.jx = s[0]; i.jy = s[1]; }
    T.update(STEP);
  }
  if (b.state === 'held' && b.carrier === to) out = 'caught';
  else if (m.stats.knocks > knocks) out = 'knock';
  else if (b.state === 'held') out = 'other';
  else out = 'dropped';
  return { out, miss:hyp(to.x - x1, to.y - y1), up:to.vx*d, speed:hyp(to.vx, to.vy), x1, y1 };
}

// 1. the lead
begin('lead');
guard(() => {
  fresh({ h:3, humans:[true, true] });
  const a = stage(0, { x:60, y:35, vx:7, back:4.5, wide:6.5, rvx:2 }), L0 = C.leadPass(a.from, a.to);
  ok(L0.x >= a.to.x + 1.5 && L0.x <= a.from.x - 0.4, `a human's pass lands ${(L0.x - a.to.x).toFixed(2)}m upfield of where the receiver stood (1.5 or more) and ${(a.from.x - L0.x).toFixed(2)}m behind the passer (0.4 or more)`);
  ok(near(L0.y, a.to.y + a.to.vy*C.RUNON.keep*L0.T, 1e-9) && L0.y === a.to.y, `with no sideways drift the ball lands on his line (${L0.y.toFixed(3)})`);
  const b = stage(1, { x:60, y:35, vx:7, back:4.5, wide:6.5, rvx:2 }), L1 = C.leadPass(b.from, b.to);
  ok(near(L1.x, 120 - L0.x, 1e-9) && near(L1.y, L0.y, 1e-9), `a team 1 pass lands at the exact mirror (${L1.x.toFixed(6)} v ${(120 - L0.x).toFixed(6)})`);
  // a receiver drifting sideways keeps half of it
  const c = stage(0, { x:60, y:35, vx:7, back:4.5, wide:6.5, rvx:2, rvy:3 }), L2 = C.leadPass(c.from, c.to);
  ok(L2.y > c.to.y && near(L2.y, c.to.y + 3*C.RUNON.keep*L2.T, 1e-9), `half his sideways drift is kept (${(L2.y - c.to.y).toFixed(2)}m over ${L2.T.toFixed(2)}s)`);
  // the CPU passer leads less
  fresh({ h:3, humans:[true, false] });
  const e = stage(0, { x:60, y:35, vx:7, back:4.5, wide:6.5, rvx:2 }), LH = C.leadPass(e.from, e.to), leadH = LH.x - e.to.x;   // taken now: staging the CPU's pass parks team 0 (e.to with it) 40m away
  const f = stage(1, { x:60, y:35, vx:7, back:4.5, wide:6.5, rvx:2 }), LC = C.leadPass(f.from, f.to), leadC = (LC.x - f.to.x)*-1;
  ok(C.passPace(0) === 1 && C.passPace(1) === C.RUNON.cpu && leadC > 0.5 && leadC < 0.9*leadH, `a CPU passer leads his receiver less than a human does: ${leadC.toFixed(2)} v ${leadH.toFixed(2)}m, under 0.9 of it (measured 0.83; a CPU at the human's pace gives 1.0)`);
  // the cap: a receiver already level lands 0.4m behind, not level
  const g = stage(0, { x:60, y:35, vx:7, back:0.5, wide:6.5, rvx:7 }), L3 = C.leadPass(g.from, g.to);
  ok(near(L3.x, g.from.x - C.RUNON.back, 1e-9), `a receiver level with the passer is led to ${C.RUNON.back}m behind him, never level (${(g.from.x - L3.x).toFixed(2)})`);
});
done('1 lead');

// 2. never forward
begin('never forward');
guard(() => {
  let n = 0, fwd = 0, worst = 0;
  for (const h of [1, 2, 3, 4, 5]) {
    fresh({ h, humans:[true, true] });
    for (let i = 0; i < 500; i++) {
      const t = i % 2, d = dirOf(t), top = 7.6 + 3*0.25, ang = Math.random()*2*Math.PI, sp = Math.random()*top;
      const o = { x:30 + Math.random()*60, y:10 + Math.random()*50, vx:Math.random()*8, vy:(Math.random() - 0.5)*4, back:0.5 + Math.random()*9.5, wide:(Math.random() < 0.5 ? -1 : 1)*(1.5 + Math.random()*20.5), rvx:Math.cos(ang)*sp, rvy:Math.sin(ang)*sp };
      const { from, to } = stage(t, o);
      C.doPass(from, to, { long:i % 4 === 3 });
      const f = M().ball.f; n++;
      const over = (f.x1 - from.x)*d;
      if (over > 0) { fwd++; worst = Math.max(worst, over); }
    }
  }
  ok(n === 2500 && fwd === 0, `${n} random passes (handling 1-5, short and long, both teams, the receiver running anywhere): ${fwd} landed forward of the passer (worst ${worst.toFixed(3)}m)`);
  // and the same for 2,500 more with the receiver standing still or running flat out upfield
  let n2 = 0, fwd2 = 0;
  for (const h of [1, 3, 5]) {
    fresh({ h, humans:[true, true] });
    for (let i = 0; i < 834; i++) {
      const t = i % 2, d = dirOf(t);
      const { from, to } = stage(t, { x:30 + Math.random()*60, y:10 + Math.random()*50, vx:Math.random()*8, back:0.5 + Math.random()*9.5, wide:(Math.random() < 0.5 ? -1 : 1)*(1.5 + Math.random()*20.5), rvx:i % 3 === 0 ? 0 : 8.35, rvy:0 });
      C.doPass(from, to, { long:i % 2 === 1 });
      n2++; if ((M().ball.f.x1 - from.x)*d > 0) fwd2++;
    }
  }
  ok(n2 === 2502 && fwd2 === 0, `${n2} more with the receiver still or at full pace: ${fwd2} forward`);
});
done('2 never forward');

// 3. runs onto it
begin('runs onto it');
guard(() => {
  // six shapes of pass: the investigation's (4.5m back, 6.5m wide, jogging), a standing man out wide, a short one to a man already at pace
  // (the lead is capped 0.4m behind the passer, so he takes it a little slower), a drifting one, and two deeper ones
  const geoms = [{ back:4.5, wide:6.5, rvx:2 }, { back:8, wide:12, rvx:0 }, { back:2, wide:5, rvx:5 }, { back:6, wide:-9, rvx:1, rvy:-2 }, { back:5, wide:7, rvx:4 }, { back:10, wide:15, rvx:3 }];
  for (const [label, stick] of [['the stick held upfield', () => [1, 0]], ['the stick held toward touch', () => [0, 1]], ['the stick let go', () => [0, 0]], ['the stick pulled back', () => [-1, 0]]]) {
    fresh({ h:5, humans:[true, false] });
    let caught = 0, knocks = 0, dropped = 0, far = 0, slow = 0, slow0 = 0, n = 0, speeds = [];
    for (let i = 0; i < 24; i++) {
      const g = geoms[i % geoms.length], { from, to } = stage(0, { x:50, y:35, vx:7, ...g });
      C.doPass(from, to, {});
      const r = fly(0, stick); n++;
      if (r.out === 'caught') { caught++; speeds.push(r.up); if (r.miss > 0.6) far++; if (r.up < 4.5) slow++; if (i % geoms.length === 0 && r.up < 5) slow0++; } else if (r.out === 'knock') knocks++; else if (r.out === 'dropped') dropped++;
    }
    ok(dropped === 0 && caught + knocks === n && caught >= n - 4 && far === 0 && slow === 0 && slow0 === 0 && mean(speeds) >= 5.5, `${label}: ${caught} of ${n} caught by the target (${knocks} knocked on, ${dropped} dropped), ${far} further than 0.6m from the landing spot, ${slow} under 4.5 m/s upfield, ${slow0} of the investigation's pass under 5; mean ${mean(speeds).toFixed(2)} m/s upfield (5.5 or more)`);
  }
  // an AI receiver runs onto it at his side's pace (RUNON.cpu x top speed; the arrive cap leaves him a shade under it)
  {
    fresh({ h:5, humans:[true, false] });
    let caught = 0, far = 0, slow = 0, n = 0, speeds = [];
    const floor = 0.85*C.RUNON.cpu*C.maxSpeed(M().players[7]);
    for (let i = 0; i < 24; i++) {
      const g = geoms[i % geoms.length], { from, to } = stage(1, { x:70, y:35, vx:7, ...g });
      C.doPass(from, to, {});
      const r = fly(1, null); n++;
      if (r.out === 'caught') { caught++; speeds.push(r.up); if (r.miss > 0.6) far++; if (r.up < floor) slow++; }
    }
    ok(caught >= n - 4 && far === 0 && slow === 0 && mean(speeds) >= 0.88*C.RUNON.cpu*C.maxSpeed(M().players[7]), `an AI receiver: ${caught} of ${n} caught, ${far} further than 0.6m from the spot, ${slow} under 0.85 x ${C.RUNON.cpu} x top speed (${floor.toFixed(2)}); mean ${mean(speeds).toFixed(2)} m/s upfield`);
  }
  // a won Key Pass's sure pass keeps today's target and seek exactly
  {
    fresh({ h:3, humans:[true, false] });
    const { from, to, d } = stage(0, { x:60, y:35, vx:7, back:4.5, wide:6.5, rvx:2, rvy:1 });
    const spd = C.passSpeed(M().nat[0], false);
    let tx = to.x, ty = to.y, TT = 0.2;
    for (let i = 0; i < 3; i++) { TT = hyp(tx - from.x, ty - from.y)/spd + 0.06; tx = to.x + to.vx*TT; ty = to.y + to.vy*TT; }
    if ((tx - from.x)*d > 0) tx = from.x;
    ty = Math.max(3, Math.min(67, ty));
    C.doPass(from, to, { sure:true, boost:[1.09, 2] });
    const f = M().ball.f;
    ok(f.sure && f.x1 === tx && f.y1 === ty, `a sure pass is thrown at where the runner is going, as before (${f.x1.toFixed(3)}, ${f.y1.toFixed(3)})`);
    // one step with the stick toward touch: his velocity is today's arrive-style seek at the landing spot, not the run-on
    inp.jx = 0; inp.jy = 1;
    const ms = C.maxSpeed(to), dx = f.x1 - to.x, dy = f.y1 - to.y, dd = hyp(dx, dy), sp = Math.min(ms, dd*2.2), tvx = dx/dd*sp, tvy = dy/dd*sp;
    let evx = to.vx, evy = to.vy; { const ax = tvx - evx, ay = tvy - evy, m = hyp(ax, ay), a = 22*STEP; if (m <= a) { evx = tvx; evy = tvy; } else { evx += ax/m*a; evy += ay/m*a; } }
    T.update(STEP);
    ok(near(to.vx, evx, 1e-9) && near(to.vy, evy, 1e-9), `the runner seeks the sure pass's landing spot exactly as before (${to.vx.toFixed(4)}, ${to.vy.toFixed(4)} v ${evx.toFixed(4)}, ${evy.toFixed(4)})`);
    inp.jx = inp.jy = 0;
  }
});
done('3 runs onto it');

// 4. the line in the air: in bot matches, the supports' pooled upfield speed at the catch against their speed at release, for passes
// thrown by a carrier running upfield at 5 m/s or more. With no slot lead (RUNON.line 0) the line pulls up round the landing spot: the
// human side's supports fall to about a third of their speed and the CPU's to about 0.5 m/s
begin('line in the air');
guard(() => {
  reseed(41);
  const R = [{ rel:0, cat:0, n:0 }, { rel:0, cat:0, n:0 }];
  for (let i = 0; i < 6; i++) {
    T.newMatch(i % 6, (i + 1) % 6, { halfLen:240, diff:1, headless:true, duels:'live' });
    const m = M(), b = m.ball; let steps = 0, pend = null;
    while (!m.over && steps++ < 200000) {
      bot(); T.update(STEP);
      if (b.state === 'air' && b.f && b.f.kind === 'pass' && b.f !== (pend && pend.f)) {
        const f = b.f, d = dirOf(f.team), passer = m.players.find(p => p.team === f.team && p.hold <= 1.5*STEP && p !== f.target) || null;   // the passer's hold was zeroed at the throw, then one step added
        if (!f.sure && passer && passer.vx*d >= 5) {
          const sup = m.players.filter(p => p.team === f.team && p !== passer && p !== f.target && p.down <= 0 && !p.bind);
          pend = { f, d, sup, v0:sup.map(p => p.vx*d), team:f.team };
        } else pend = { f };
      }
      if (pend && pend.sup && b.state !== 'air') {
        const r = R[pend.team]; r.n++; for (let k = 0; k < pend.sup.length; k++) { r.rel += Math.max(0, pend.v0[k]); r.cat += Math.max(0, pend.sup[k].vx*pend.d); r.men = (r.men || 0) + 1; }
        pend = null;
      }
    }
  }
  const h = R[0], c = R[1];
  ok(h.n > 100 && h.cat >= 0.8*h.rel, `your passes (${h.n} from a running carrier): the supports' pooled upfield speed at the catch is ${(h.cat/h.rel).toFixed(2)} x their speed at release (0.8 or more; ${(h.rel/h.men).toFixed(2)} to ${(h.cat/h.men).toFixed(2)} m/s)`);
  ok(c.n > 50 && c.cat/c.men >= 1.0, `the CPU's passes (${c.n}): its supports are still moving at the catch, ${(c.cat/c.men).toFixed(2)} m/s upfield (1.0 or more; ${(c.rel/c.men).toFixed(2)} at release)`);
});
done('4 line in the air');

// 5. the Block lane
begin('block lane');
guard(() => {
  for (const t of [0, 1]) {
    T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'live', humans:t ? [false, true] : [true, false] });
    const st = T.debug.stage('block', t), s = C.blockSpec(st.O, st.R), a = C.leadPass(st.O, st.R);
    ok(s && s.kind === 'block' && s.P1.x === a.x && s.P1.y === a.y, `team ${t} human: the Block lane's far point is where the led pass lands (${s && s.P1.x.toFixed(3)}, ${s && s.P1.y.toFixed(3)})`);
  }
});
done('5 block lane');

// 6. census guard: 12 bot matches a level, the thumb holding its direction through the flight (as a player's does), SEED 1
begin('census');
guard(() => {
  reseed(1);
  for (const diff of [0, 1, 2]) {
    const n = 12, R = { gain:[], up:[], stand:0, caught:0, dropped:0, x15:[], cpuUp:[] };
    for (let i = 0; i < n; i++) {
      const a = i % 6, b = (a + 1 + (i % 5)) % 6;
      T.newMatch(a, b, { halfLen:240, diff, headless:true, duels:'live' });
      const m = M(), ball = m.ball; let steps = 0, held = { x:1, y:0 }, live = [], prevAir = false, cur = null;
      while (!m.over && steps++ < 200000) {
        bot();
        if (m.phase === 'play' && ball.state === 'air' && ball.f && ball.f.kind === 'pass' && ball.f.team === 0 && ball.f.target === S.ctrlOf(0)) { inp.jx = held.x; inp.jy = held.y; }
        else if (ball.state === 'held' && ball.carrier.team === 0) held = { x:inp.jx, y:inp.jy };
        const wasPass = ball.state === 'air' && ball.f && ball.f.kind === 'pass', f0 = ball.f;
        T.update(STEP);
        const isPass = ball.state === 'air' && ball.f && ball.f.kind === 'pass';
        if (isPass && ball.f !== f0) {           // a new pass: who threw it stands where the ball left
          const f = ball.f, d = dirOf(f.team);
          cur = { f, d, px:f.x0 - d*0.55, t:0 };
          live.push({ team:f.team, px:cur.px, t:0, done:false });
        }
        if (wasPass && !isPass && cur) {           // the flight ended: a catch by the target, a knock-on, an intercept or a drop
          const f = cur.f, to = f.target, d = cur.d;
          if (ball.state === 'held' && ball.carrier === to && !f.sure) {
            const up = to.vx*d, sp = hyp(to.vx, to.vy);
            if (f.team === 0) { R.caught++; R.gain.push((to.x - cur.px)*d); R.up.push(up); if (sp < 2) R.stand++; } else R.cpuUp.push(up);
          } else if (ball.state === 'loose' && f.team === 0) R.dropped++;
          cur = null;
        }
        for (const L of live) { if (L.done) continue; L.t += STEP; if (L.t >= 1.5) { L.done = true; if (L.team === 0) R.x15.push((ball.x - L.px)*dirOf(0)); } }
        live = live.filter(L => !L.done);
      }
    }
    const name = ['Easy', 'Normal', 'Hard'][diff];
    const g = mean(R.gain), up = mean(R.up), stand = 100*R.stand/(R.caught || 1), drops = R.dropped/n, x15 = mean(R.x15), cup = mean(R.cpuUp);
    console.log(`  ${name}: your completed passes ${(R.caught/n).toFixed(1)} a match: gain at the catch ${g.toFixed(2)}m, upfield speed ${up.toFixed(2)} m/s, standing ${stand.toFixed(0)}%; dropped ${drops.toFixed(2)} a match; the ball ${x15.toFixed(2)}m past the release line 1.5s on; CPU catches at ${cup.toFixed(2)} m/s upfield`);
    ok(R.caught >= 10*n && g >= -3.5 && up >= 5 && stand <= 10 && drops <= 0.5, `${name}: gain at the catch ${g.toFixed(2)}m (-3.5 or better), ${up.toFixed(2)} m/s upfield (5 or more), standing ${stand.toFixed(0)}% (10 or less), dropped ${drops.toFixed(2)} a match (0.5 or less)`);
    ok(x15 >= -0.5, `${name}: the ball is ${x15.toFixed(2)}m past the release line 1.5s after a pass (-0.5 or better; about -3 before the lead)`);
    ok(R.cpuUp.length >= 5*n && cup >= 4, `${name}: the CPU's receivers catch at ${cup.toFixed(2)} m/s upfield (4 or more)`);
  }
});
done('6 census');

// 7. the open shoulder (2026-10-31): one runner is held on the open shoulder, still behind the ball, and the pass ring tints when a defender is on that man
begin('open shoulder');
guard(() => {
  const D = T.debug, SU = C.SUPPORT;
  const lay = (t, o) => {
    fresh({ humans: t === 0 ? [true, false] : [false, true] });
    const m = M(), d = dirOf(t), own = m.players.filter(p => p.team === t), opp = m.players.filter(p => p.team !== t);
    const c = own[0];
    own.forEach((p, i) => {
      p.down = 0; p.bind = null; p.offside = 0; p.vx = 0; p.vy = 0; p.hold = 2;
      const k = i === 0 ? 0 : [1, -1, 2, -2, 3, -3][i - 1];
      p.x = o.x - d * (i === 0 ? 0 : SU.back + 1.3 * Math.abs(k));
      p.y = o.y + (i === 0 ? 0 : k * 6.5);
    });
    c.x = o.x; c.y = o.y; c.vx = 6 * d; c.fx = d; c.fy = 0;
    opp.forEach((p, i) => { p.down = 0; p.bind = null; p.offside = 0; p.vx = p.vy = 0; p.x = o.x + d * (28 + i * 3); p.y = 6 + i * 8; });
    const def = opp[0]; def.x = o.x + d * o.dx; def.y = o.y + o.dy;
    const b = m.ball; b.state = 'held'; b.carrier = c; b.f = null; b.last = t; b.kickInfo = null; b.x = c.x; b.y = c.y; b.z = 1; b.vx = b.vy = b.vz = 0;
    m.phase = 'play'; m.set = null; m.cut = null; m.poss = t; m.contact = null;
    if (S.isHuman(t)) S.setCtrl(t, c);
    return { c, def, d, own, opp };
  };
  const behind = (c, p, d) => (c.x - p.x) * d;
  // a defender on +y: the held runner is on -y, at the shelf's depth, and the closed side stays on the shelf
  {
    const s = lay(0, { x:60, y:35, dx:4, dy:8 });
    const open = C.openShoulder(s.c.x, s.c.y, s.d, 0), pt = C.shoulderPoint(s.c.x, s.c.y, s.d, open, 0);
    ok(open === -1, `a defender on +y leaves the open shoulder on -y (got ${open})`);
    ok(pt && near(pt.lat, SU.lat, 0.05) && near(pt.back, SU.back, 0.05) && behind(s.c, pt, s.d) >= 1 && pt.y < s.c.y, `a clear shoulder sits ${SU.lat}m wide and ${SU.back}m behind (got lat ${pt && pt.lat.toFixed(2)}, back ${pt && pt.back.toFixed(2)})`);
    const Tg = C.computeTargets();
    const held = s.own.filter(p => p !== s.c && Tg.has(p) && near(Tg.get(p).x, pt.x, 1e-6) && near(Tg.get(p).y, pt.y, 1e-6));
    ok(held.length === 1, `one runner is held on that point (${held.length})`);
    const shelfX = s.c.x - (SU.back + 1.3), shelfY = s.c.y + 6.5;
    const shelf = s.own.filter(p => p !== s.c && Tg.has(p) && near(Tg.get(p).x, shelfX, 0.05) && near(Tg.get(p).y, shelfY, 0.05));
    ok(shelf.length === 1, `the closed side stays on the shelf at ${shelfX.toFixed(1)}, ${shelfY.toFixed(1)} (${shelf.length})`);
    ok(s.own.every(p => p === s.c || !Tg.has(p) || behind(s.c, Tg.get(p), s.d) >= -0.01), 'every support target is behind the ball');
  }
  // the open side is occupied too: he slides wider along it, still behind, still inside the Key Pass box
  {
    const s = lay(0, { x:60, y:35, dx:2, dy:3 });          // nearest is on +y, closer than the shoulder spot, so a man standing there does not flip the read
    const home = C.shoulderPoint(s.c.x, s.c.y, s.d, -1, 0);
    s.opp[1].x = home.x; s.opp[1].y = home.y;
    const open = C.openShoulder(s.c.x, s.c.y, s.d, 0), slid = C.shoulderPoint(s.c.x, s.c.y, s.d, open, 0);
    const gap = hyp(slid.x - home.x, slid.y - home.y);
    ok(open === -1 && slid.y < s.c.y && slid.lat > SU.lat + 0.5, `he stays on -y and slides wider (lat ${slid.lat.toFixed(2)} from ${SU.lat})`);
    ok(gap >= SU.clear - 0.05 && behind(s.c, slid, s.d) >= 1 && slid.lat >= 4 && slid.lat <= 12 && slid.back <= C.RUNON.kpBack, `the slide leaves the defender ${gap.toFixed(2)}m off, behind the ball, inside the Key Pass box (lat ${slid.lat.toFixed(2)}, back ${slid.back.toFixed(2)})`);
  }
  // head-on, the shoulder is the side with more room; team 1's behind is +x
  {
    const s = lay(0, { x:60, y:35, dx:4, dy:0 });
    ok(C.openShoulder(s.c.x, s.c.y, s.d, 0) === 1, `head-on in midfield, the open shoulder is +y (got ${C.openShoulder(s.c.x, s.c.y, s.d, 0)})`);
    const edge = lay(0, { x:60, y:64, dx:4, dy:0 });
    const eo = C.openShoulder(edge.c.x, edge.c.y, edge.d, 0), ep = C.shoulderPoint(edge.c.x, edge.c.y, edge.d, eo, 0);
    ok(eo === -1 && ep && ep.y <= edge.c.y - 4 && behind(edge.c, ep, edge.d) >= 1, `near the top touch he takes the side with room and stays behind (y ${ep && ep.y.toFixed(1)}, back ${ep && ep.back.toFixed(2)})`);
    const m = lay(1, { x:60, y:35, dx:4, dy:8 });
    const mo = C.openShoulder(m.c.x, m.c.y, m.d, 1), mp = C.shoulderPoint(m.c.x, m.c.y, m.d, mo, 1), Tg = C.computeTargets();
    ok(mo === -1 && mp.x > m.c.x && mp.y < m.c.y, `team 1 mirrors: behind is +x, the open shoulder is still -y (${mp.x.toFixed(1)}, ${mp.y.toFixed(1)})`);
    ok(m.own.some(p => p !== m.c && Tg.has(p) && near(Tg.get(p).x, mp.x, 1e-6) && near(Tg.get(p).y, mp.y, 1e-6)), 'one of his runners is held on that point');
  }
  // the ring: white when the man is free, tinted when a defender is on him, gold kept for a long pass with the tint inside it
  {
    fresh({ h:3, humans:[true, false] });
    const { from, to } = stage(0, { x:60, y:35, vx:6, back:4, wide:6, rvx:0 });
    const opp = M().players.find(p => p.team === 1);
    opp.x = to.x + 1.5; opp.y = to.y;
    const marked = C.shownPass(from);
    ok(marked.to === to && marked.marked && !marked.gold && C.pressure(to) < SU.mark, `a defender ${C.pressure(to).toFixed(2)}m off marks the ring's man`);
    const rad = Math.max(8, 0.95 * Math.min(844 / 54, 390 / 36));
    const arcsOf = () => {
      const arcs = []; let stroke = '', width = 0;
      globalThis.__ctxSpy = (name, args) => { if (name === 'strokeStyle') stroke = args[0]; else if (name === 'lineWidth') width = args[0]; else if (name === 'arc') arcs.push({ r:args[2], stroke, width }); };
      D.view(844, 390); D.render(STEP); globalThis.__ctxSpy = null;
      return arcs;
    };
    let arcs = arcsOf();
    ok(arcs.some(a => near(a.r, rad * 1.6, 0.2) && a.stroke === SU.tint), 'the pass ring is drawn in the tint');
    ok(!arcs.some(a => near(a.r, rad * 1.6, 0.2) && a.stroke === 'rgba(244,241,232,.95)'), 'and not in white while he is marked');
    opp.x = to.x + 14; opp.y = to.y + 10;
    const free = C.shownPass(from);
    ok(free.to === to && !free.marked && C.pressure(to) >= SU.mark, `with the defender ${C.pressure(to).toFixed(1)}m off the ring reads free`);
    arcs = arcsOf();
    ok(arcs.some(a => near(a.r, rad * 1.6, 0.2) && a.stroke === 'rgba(244,241,232,.95)') && !arcs.some(a => a.stroke === SU.tint), 'a free man keeps the white ring, with no tint');
    const far = M().players.filter(p => p.team === 0)[2];
    far.x = from.x - 8; far.y = from.y + 14; far.down = 0; far.bind = null;
    opp.x = far.x + 1; opp.y = far.y + 1;
    const inp0 = S.inputOf(0); inp0.jx = 0; inp0.jy = 1;
    S.side(0).pass = { mode:'hold', to:null, t:C.LONG.arm + 0.02 };
    const long = C.shownPass(from);
    ok(long.gold && long.marked && long.to === far, `a long pass to a marked man stays gold and reads marked (${long.to === far}, gold ${long.gold}, marked ${long.marked})`);
    arcs = arcsOf();
    ok(arcs.some(a => near(a.r, rad * 1.6, 0.2) && a.stroke === '#ffcf3d') && arcs.some(a => near(a.r, rad * 1.15, 0.2) && a.stroke === SU.tint), 'the gold ring stays, and the tint is drawn inside it');
    inp0.jx = inp0.jy = 0; S.side(0).pass = null;
  }
});
done('7 open shoulder');

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
