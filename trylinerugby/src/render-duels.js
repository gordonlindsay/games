/* ---------- duel view: a chase-cam over your player's shoulder ----------
   Looks along +x, so screen-right is always world +y. A point (x, y, h)
   projects with z = x - camX: sx = cx + F(y - camY)/z, sy = hz + F(camH - h)/z. */
let RM = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();   // let: the render test flips it
const RIG = { 1:{ back:4.2, side:2.2, h:2.3, F:1.2, hz:0.20 }, 2:{ back:6.5, side:2.4, h:3.0, F:1.05, hz:0.16 } };
const ease3 = u => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
const lerp = (a, b, u) => a + (b - a)*u;
// where everyone stands at scene time t (render only: the world is frozen)
function duelPose(c, t) {
  const tk = c.tkAt != null ? c.tk - 0.10*(1 - ease3((t - c.tkAt)/0.15)) : c.tk, D = c.D, K = c.K, w = c.w;   // two player: a step's slower approach eases in over the step's 0.15s, so the figures don't jump apart
  const gap = G_START - (G_START - G_HIT)*clamp((t - CUT_IN)/(tk - CUT_IN), 0, 1);
  const P = { u:{ x:K.x - D.x*gap*w, y:K.y - D.y*gap*w, h:0 }, o:{ x:K.x + D.x*gap*(1 - w), y:K.y + D.y*gap*(1 - w), h:0 }, r:null, ball:null };
  const after = c.judged != null ? t - c.judged : -1, hit = t - c.tk;
  if (c.kind === 'past') {
    const shade = c.feintAt != null && t < c.feintAt + 0.12 ? -c.open0 : -c.open;      // the side he's blocking
    const into = c.feintAt != null ? clamp((t - c.feintAt)/0.12, 0, 1) : 1;
    P.o.shift = c.feintAt != null ? lerp(-c.open0, -c.open, into)*0.55 : shade*0.55;
    if (c.act && after >= 0) P.u.y += 1.2*c.act*ease3(after/0.15);
    if (c.out === 'break' && hit > 0) { P.u.x += hit*6; P.o.dive = c.act ? -c.act : 1; P.o.y += -0.6*c.open*ease3(hit/0.2); P.o.lying = hit > 0.18; }
    if (c.out === 'tackled' && hit > 0) { P.u.lying = hit > 0.15; P.o.lying = hit > 0.2; }
    if (c.out === 'broken' && hit > 0) { P.u.x += hit*5; P.o.lying = hit > 0.12; }
  } else if (c.kind === 'pass') {
    const r = c.r0, rx = r.x + r.vx*c.rho*(t - c.tTrig), dy = r.y - c.u0.y;
    const ly = Math.sign(dy)*Math.min(Math.abs(dy), 3.0 + 0.15*(Math.abs(dy) - 4));   // squeezed for the shot
    P.r = { x:Math.max(rx, P.u.x - 1.5), y:P.u.y + ly, h:0 };
    const drift = c.driftAt != null ? ease3((t - c.driftAt)/0.15)
      : c.fakeAt != null ? ease3((t - c.fakeAt)/0.12)*(1 - ease3((t - c.fakeAt - 0.2)/0.12)) : 0;
    P.o.y += c.side*1.2*drift; P.o.shift = c.side*0.45*drift + (c.lean || 0)*0.45;   // two player: the other player's hand before the lock
    P.o.commit = c.drift ? 0 : clamp((t - c.commitT + 0.1)/0.15, 0, 1);
    if (c.act === 'dummy' && after >= 0 && after < 0.2) P.u.fake = true;
    if (c.out === 'sold' && hit > 0) { P.u.x += hit*6; P.u.y -= 0.5*c.side*ease3(hit/0.2); }
    if (after >= 0 && !['tackled', 'broken', 'sold'].includes(c.out)) {
      const fl = clamp(after/0.35, 0, 1);
      P.ball = { x:lerp(P.u.x, P.r.x, fl), y:lerp(P.u.y, P.r.y, fl), h:1.1 + 0.6*fl*(1 - fl) };
      if (c.out === 'drawn' && hit > 0) { P.o.lying = hit > 0.15; P.o.x = lerp(P.o.x, P.u.x + 0.3, ease3(hit/0.2)); }
      if (c.out === 'early') P.o.y = lerp(P.o.y, P.r.y, ease3(after/0.6)*0.4);
    }
    if ((c.out === 'tackled' || c.out === 'broken') && hit > 0) { if (c.out === 'tackled') { P.u.lying = hit > 0.15; P.o.lying = hit > 0.2; } else { P.u.x += hit*5; P.o.lying = hit > 0.12; } }
  } else if (c.kind === 'tackle') {
    if (c.stepAt != null) P.o.y += c.stepDir*1.2*ease3((t - c.stepAt)/0.15);
    if (after >= 0 && c.act) P.u.dive = ease3(after/0.2);
    if (c.out === 'bighit' && hit > 0) { P.o.x += 1.5*ease3(hit/0.25); P.o.lying = hit > 0.12; P.u.x += 0.8*ease3(hit/0.25); P.u.lying = hit > 0.2; }
    if (c.out === 'tackled' && hit > 0) { P.o.lying = hit > 0.15; P.u.lying = hit > 0.15; }
    if (c.out === 'missed' && hit > 0) { P.u.lying = hit > 0.1; P.o.x -= hit*5; }
  } else {
    const t1 = c.reachT != null ? c.reachT : c.centre, q0 = c.u0;
    const reach = ease3((t - CUT_IN)/(t1 - CUT_IN));
    P.u = { x:q0.x + (c.L.x - q0.x)*0.85*reach, y:q0.y + (c.L.y - q0.y)*0.85*reach, h:0 };
    const slow = (p0, s) => ({ x:p0.x + p0.vx*0.35*s, y:p0.y + p0.vy*0.35*s, h:0 });
    P.o = slow(c.o0, t); P.r = slow(c.r0, t);
    P.o.wind = clamp((t - 0.55)/0.2, 0, 1); P.o.thrown = t >= c.rel;
    if (c.dummy && t > 0.75 && t < c.rel) P.o.pump = clamp((t - 0.75)/0.15, 0, 1);
    if (t < c.rel) P.ball = null;
    else {
      const sp = hyp(c.L.x - c.P0.x, c.L.y - c.P0.y)/0.30, dir = { x:(c.P1.x - c.P0.x), y:(c.P1.y - c.P0.y) }, m = hyp(dir.x, dir.y) || 1;
      let s = (t - c.rel)*sp;
      if (c.out === 'intercept' && after >= 0) s = Math.min(s, hyp(c.L.x - c.P0.x, c.L.y - c.P0.y));
      P.ball = { x:c.P0.x + dir.x/m*s, y:c.P0.y + dir.y/m*s, h:1.3 };
      if (c.out === 'intercept' && after >= 0) { P.ball = { x:P.u.x + 0.3, y:P.u.y, h:1.2 }; P.u.x += Math.max(0, after - 0.1)*6; P.ball.x = P.u.x + 0.3; P.u.carry = true; }
      if (c.out === 'knock' && after >= 0) { const k = clamp(after/0.5, 0, 1); P.ball = { x:c.L.x - 3*k, y:c.L.y + (c.act || 1)*0.4*k, h:1.3*(1 - k) + 0.6*Math.sin(k*Math.PI) }; }
    }
  }
  return P;
}
// Block frames the pass itself: from behind whichever of you and the passer is nearer, centred between passer and receiver
function camAt(c, cam, P, Pl) {
  if (c.kind === 'block') return { camX:Math.min(P.u.x, P.o.x) - cam.back, camY:(Pl.o.y + Pl.r.y)/2 + cam.side*0.4 };
  return { camX:P.u.x - cam.back, camY:Pl.u.y + cam.side };
}
function duelCam(c) {
  const key = V.W + 'x' + V.H;
  if (c.cam && c.cam.key === key) return c.cam;
  const r = RIG[DUEL[c.kind].rig], tw = (c.win[0] + c.win[1])/2;
  const P = duelPose({ ...c, judged:null, out:null, act:null }, tw);
  const focus = c.kind === 'block' ? { x:c.L.x, y:(P.o.y + P.r.y)/2 } : P.o;
  const s = c.kind === 'pass' ? Math.sign((P.r.y - P.u.y) || 1) : c.kind === 'block' ? Math.sign((c.r0.y - c.u0.y) || 1) : ((P.o.y - P.u.y) < -0.5 ? -1 : 1);
  const cam = { key, back:r.back, side:r.side*s, h:r.h, F:r.F*V.H, hz:r.hz*V.H, s, rig:DUEL[c.kind].rig };
  for (let i = 0; i < 6; i++) {
    const { camX, camY } = camAt(c, cam, P, P);
    cam.cx = clamp((0.5 - (cam.rig === 2 ? 0.07*s : 0))*V.W - cam.F*(focus.y - camY)/Math.max(0.5, focus.x - camX), 0.30*V.W, 0.75*V.W);
    // keep every opponent between the bars and clear of the buttons
    let ok = true;
    for (const tt of [CUT_IN, tw, c.tk]) {
      const Q = duelPose({ ...c, judged:null, out:null, act:null }, tt);
      const qc = camAt(c, cam, Q, Q);
      for (const a of [Q.o, Q.r].filter(Boolean)) {
        const z = a.x - qc.camX;
        if (z < 0.8) continue;
        const k = cam.F/z, sx = cam.cx + k*(a.y - qc.camY), top = cam.hz + k*(cam.h - 1.9), bot = cam.hz + k*cam.h;
        if (sx - 0.45*k < 0.05*V.W || sx + 0.45*k > V.W - 124 || top < 0.07*V.H + 4 || bot > 0.93*V.H - 4 || (sx < 180 && bot > V.H - 190)) ok = false;
      }
    }
    if (ok) break;
    cam.back += 0.8; cam.h += 0.25;
  }
  c.cam = cam;
  return cam;
}
function drawStands(g, hz, top) {
  const { W, H } = g;
  top = top || 0;
  const st = ctx.createLinearGradient(0, top, 0, hz);
  st.addColorStop(0, '#05080a'); st.addColorStop(1, '#14201a');
  ctx.fillStyle = st; ctx.fillRect(0, top, W, hz - top);
  for (const [cx, cy, k] of CROWD) { ctx.fillStyle = CROWD_C[k]; ctx.fillRect(cx*W, hz*0.22 + cy*hz*0.66, 3, 3); }
  for (const fx of [0.1, 0.9]) {
    const gl = ctx.createRadialGradient(W*fx, 0, 0, W*fx, 0, H*0.6);
    gl.addColorStop(0, 'rgba(255,238,196,.32)'); gl.addColorStop(1, 'rgba(255,238,196,0)');
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H*0.6);
  }
  ctx.fillStyle = '#0c1611'; ctx.fillRect(0, hz - H*0.035, W, H*0.035);
}
function drawDuel(c, g) {
  const { W, H } = g;
  const cam = duelCam(c);
  // hit-stop: the scene clock holds for 90ms at contact
  const ti = c.out === 'bighit' ? c.judged + 0.12 : c.tk;
  let t = c.t + (c.acc || 0);                              // slow motion: the fraction of a frame the logic is holding back, so the run-in is smooth
  if (!RM && c.out && t > ti) t = t < ti + 0.09 ? ti : t - 0.09;
  const P = duelPose(c, t);
  const lagT = RM ? t : Math.max(0, t - 0.12);
  const Pl = duelPose(c, lagT);
  const { camX, camY } = camAt(c, cam, P, Pl), F = cam.F, hz = cam.hz, cx = cam.cx, ch = cam.h;
  const proj = (x, y, h) => { const z = x - camX; return z < 0.05 ? null : { sx:cx + F*(y - camY)/z, sy:hz + F*(ch - h)/z, k:F/z, z }; };
  ctx.save();
  if (!RM && c.out && ['tackled', 'bighit', 'break', 'broken'].includes(c.out)) {
    const dt = c.t - c.tk;
    if (dt > 0 && dt < 0.25) { const a = 6*Math.exp(-dt/0.08); ctx.translate((Math.random() - 0.5)*a, (Math.random() - 0.5)*a); }
  }
  drawStands(g, hz);
  ctx.fillStyle = C.surround; ctx.fillRect(0, hz, W, H - hz);
  // grass bands, as drawPitch does them, projected
  const quad = (x0, y0, x1, y1, fill) => {
    const a = Math.max(x0, camX + 0.5), bnd = x1;
    if (bnd <= camX + 0.5) return;
    const p1 = proj(a, y0, 0), p2 = proj(a, y1, 0), p3 = proj(bnd, y1, 0), p4 = proj(bnd, y0, 0);
    ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(p1.sx, p1.sy); ctx.lineTo(p2.sx, p2.sy); ctx.lineTo(p3.sx, p3.sy); ctx.lineTo(p4.sx, p4.sy); ctx.closePath(); ctx.fill();
  };
  for (let i = 0; i < 12; i++) quad(i*10, 0, i*10 + 10, 70, i % 2 ? C.grassA : C.grassB);
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0*0.14; quad(0, 0, 10, 70, M.kit[c.own].fill); quad(110, 0, 120, 70, M.kit[1 - c.own].fill); ctx.globalAlpha = a0;   // the owner's in-goal behind him, the other side's ahead
  ctx.strokeStyle = C.line;
  const lineX = (x, dash) => {
    if (x <= camX + 0.5) return;
    const a = proj(x, 0, 0), b2 = proj(x, 70, 0);
    ctx.lineWidth = Math.max(1, 0.1*a.k); ctx.setLineDash(dash ? [a.k*1.5, a.k*1.5] : []);
    ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b2.sx, b2.sy); ctx.stroke();
  };
  for (const x of [10, 110, 32, 88, 60]) lineX(x, false);
  for (const x of [50, 70, 15, 105]) lineX(x, true);
  ctx.setLineDash([]);
  for (const y of [0, 70]) {
    const a = proj(camX + 0.6, y, 0), b2 = proj(camX + 160, y, 0);
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b2.sx, b2.sy); ctx.stroke();
  }
  // posts
  if (110 - camX > 0.5 && 110 - camX < 70) {
    for (const py of [32.2, 37.8]) {
      const a = proj(110, py, 0), b2 = proj(110, py, 11);
      ctx.strokeStyle = '#f7f5ee'; ctx.lineWidth = Math.max(1.5, 0.12*a.k); ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b2.sx, b2.sy); ctx.stroke();
      ctx.fillStyle = C.pad; ctx.fillRect(a.sx - 0.3*a.k, a.sy - 1.8*a.k, 0.6*a.k, 1.8*a.k);
    }
    const l = proj(110, 32.2, 3), r = proj(110, 37.8, 3);
    ctx.strokeStyle = '#f7f5ee'; ctx.beginPath(); ctx.moveTo(l.sx, l.sy); ctx.lineTo(r.sx, r.sy); ctx.stroke();
  }
  // Easy only: the open lane
  if (c.kind === 'past' && levelOf(c.own) === 0 && c.out == null) {
    const o = c.open, path = (k, lat) => proj(c.K.x + c.D.x*k, c.K.y + c.D.y*k + lat*o, 0);
    const pts = [path(-1, 0.7), path(3, 0.7), path(3, 1.9), path(-1, 1.9)].filter(Boolean);
    if (pts.length === 4) { ctx.fillStyle = 'rgba(255,207,61,.22)'; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy)); ctx.closePath(); ctx.fill(); }
  }
  // the ring: the one timing cue
  if (c.out == null && !(c.kind === 'block' && t < c.rel)) {
    const A = c.kind === 'block' ? { x:c.L.x, y:c.L.y } : P.o, pa = proj(A.x, A.y, 0);
    if (pa) {
      const r = c.kind === 'block' ? 0.9 : lerp(2.6, 0.9, clamp((t - CUT_IN)/(c.win[0] - CUT_IN), 0, 1));
      const rx = r*pa.k, ry = rx*clamp(ch/pa.z, 0.18, 0.6), live = t >= c.win[0] && t <= c.win[1];
      ctx.beginPath(); ctx.ellipse(pa.sx, pa.sy, rx, ry, 0, 0, Math.PI*2);
      if (live) { ctx.fillStyle = seatOfTeam(c.own) === 1 ? 'rgba(255,95,210,.30)' : 'rgba(255,207,61,.30)'; ctx.fill(); ctx.strokeStyle = ringCol(c.own); ctx.lineWidth = 4; }   // the ring in the owner's colour: pink for Player 2
      else { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; }
      ctx.stroke();
    }
  }
  // figures, far to near
  const actors = [];
  const add = (a, man, back, extra) => { if (a) actors.push({ a, team:man.team, back, o:{ kit:kitOf(man.team, man), ...extra } }); };   // the kit knows the man, for the Locker's boots (kitOf)
  if (c.kind === 'past' || c.kind === 'pass') {
    add(P.u, c.U, true, { carry:!P.ball && !P.u.fake, arms:P.u.fake ? 'pass' : undefined, num:c.U.n, stride:t*19 });
    add(P.o, c.O, false, { shift:P.o.shift || 0, lean:(P.o.shift || 0)*0.6 + (P.o.commit || 0)*0.25, arms:P.o.commit > 0.5 ? 'wide' : 'run', stride:t*12, lying:P.o.lying, dive:P.o.dive });
    if (P.r) add(P.r, c.R, true, { num:c.R.n, stride:t*19, arms:P.ball ? 'reach' : 'run' });
  } else if (c.kind === 'tackle') {
    add(P.u, c.U, true, { num:c.U.n, stride:t*16, dive:P.u.dive ? 1 : 0, lying:P.u.lying, arms:P.u.dive ? 'reach' : 'run' });
    add(P.o, c.O, false, { carry:true, stride:t*19, lean:c.stepAt != null && t > c.stepAt ? c.stepDir*0.3 : (c.lean || 0)*0.3, lying:P.o.lying });
  } else {
    add(P.u, c.U, true, { num:c.U.n, stride:t*14, arms:P.u.carry ? 'carry' : 'reach' });
    add(P.o, c.O, false, { stride:t*8, arms:P.o.thrown ? 'pass' : (P.o.wind ? 'carry' : 'run'), twist:P.o.pump || P.o.wind });
    add(P.r, c.R, false, { stride:t*10, arms:'reach' });
  }
  actors.sort((p, q) => q.a.x - p.a.x);
  for (const it of actors) {
    const p = proj(it.a.x, it.a.y, 0);
    if (!p || p.z < 0.8) continue;
    figFB(p.sx, p.sy, p.k, it.team, { back:it.back, ...it.o });
    if (it.o.carry) cutBall(p.sx + (it.back ? 0.18 : -0.18)*p.k, p.sy - 1.15*p.k, Math.max(10, p.k*0.9), 0.3);
    if (M.two && c.out == null && (it.a === P.u || it.a === P.o)) cutSeatTag(seatOfTeam(it.team), p.sx, p.sy - 2.25*p.k, 0.4*p.k);   // the seat tags over the two men in it, until the verdict
  }
  if (P.ball) { const pb = proj(P.ball.x, P.ball.y, P.ball.h); if (pb) { const sh = proj(P.ball.x, P.ball.y, 0); if (sh) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ellipse(sh.sx, sh.sy, 0.18*sh.k, 0.05*sh.k); ctx.fill(); } cutBall(pb.sx, pb.sy, Math.max(10, pb.k*0.9), 0.6); } }
  // effects
  if (!RM && c.out) {
    const dt = c.t - c.tk;
    const k0 = proj(c.K.x, c.K.y, 1.2);
    if (k0 && dt > 0 && dt < 0.15 && ['tackled', 'bighit', 'break', 'broken', 'missed'].includes(c.out)) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) { const a = i/8*Math.PI*2, r0 = 0.3*k0.k, r1 = (0.6 + dt*3)*k0.k; seg(k0.sx + Math.cos(a)*r0, k0.sy + Math.sin(a)*r0, k0.sx + Math.cos(a)*r1, k0.sy + Math.sin(a)*r1); }
    }
    if (c.out === 'bighit' && dt > 0 && dt < 0.3) {
      ctx.fillStyle = 'rgba(120,170,90,.8)';
      for (let i = 0; i < 10; i++) { const kk = proj(c.K.x + 1 + (i % 3)*0.3, c.K.y + (i - 5)*0.15, dt*4*(1 + i % 2)); if (kk) ctx.fillRect(kk.sx, kk.sy, 3, 3); }
    }
    if ((c.out === 'break' || c.out === 'intercept') && c.after) {
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) { const a = i/12*Math.PI*2 + 0.2, r0 = H*0.25; seg(cx + Math.cos(a)*r0, hz + H*0.3 + Math.sin(a)*r0*0.6, cx + Math.cos(a)*r0*2.2, hz + H*0.3 + Math.sin(a)*r0*1.3); }
    }
  }
  ctx.restore();
}
