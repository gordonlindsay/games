/* ---------- goal-kick view: a still, pitch-level camera behind the kicker ----------
   Everything is in the kick frame. The camera sits back metres behind the mark
   at 2.2m, looking along u at the posts' centre, with no pitch and no roll.
   The lens is solved per kick so the mark sits at 0.80H and the upright tops
   just under the scoreboard. Only the arrow moves while you steer. */
function kickCam(g) {
  const key = V.W + 'x' + V.H;
  if (g.cam && g.cam.key === key) return g.cam;
  const W = V.W, H = V.H, D = g.dist, u = { x:Math.cos(g.beta), y:Math.sin(g.beta) }, r = { x:-u.y, y:u.x };
  const back = CAM.b0 + CAM.bK*D, ch = CAM.h, ytop = Math.max(CAM.topY*H, CAM.topPx);
  const F = clamp((CAM.ballY*H - ytop)/(ch/back + (KICK.upH - ch)/(D + back)), CAM.Fmin*H, CAM.Fmax*H);
  g.cam = { key, W, H, cx:0.5*W, F, hz:CAM.ballY*H - F*ch/back, ch, u, r, back, ytop, Cx:g.x - back*u.x, Cy:g.y - back*u.y, fi:null, gy:0 };
  g.cam.gy = proj(g.cam, camPt(g.cam, 110, 35, 4.25)).sy;   // the goal window: the flight zoom closes on it
  return g.cam;
}
function camPt(cam, x, y, h) { const dx = x - cam.Cx, dy = y - cam.Cy; return { z:dx*cam.u.x + dy*cam.u.y, a:dx*cam.r.x + dy*cam.r.y, h }; }
function proj(cam, q) { const k = cam.F/q.z; return { sx:cam.cx + k*q.a, sy:cam.hz + k*(cam.ch - q.h), k, z:q.z }; }
function pr(cam, x, y, h) { const q = camPt(cam, x, y, h); return q.z < CAM.near ? null : proj(cam, q); }   // null behind the near plane
// a ground polygon (flat x,y pairs at height h), clipped against z >= near before projection
const CZ = [], CA = [];
function groundPoly(cam, pts, h, fill) {
  const n = pts.length >> 1, near = CAM.near;
  let m = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, p = camPt(cam, pts[2*i], pts[2*i + 1], h), q = camPt(cam, pts[2*j], pts[2*j + 1], h), pin = p.z >= near, qin = q.z >= near;
    if (pin) { CZ[m] = p.z; CA[m] = p.a; m++; }
    if (pin !== qin) { const t = (near - p.z)/(q.z - p.z); CZ[m] = near; CA[m] = p.a + (q.a - p.a)*t; m++; }
  }
  if (m < 3) return false;
  ctx.fillStyle = fill; ctx.beginPath();
  for (let i = 0; i < m; i++) { const k = cam.F/CZ[i], sx = cam.cx + k*CA[i], sy = cam.hz + k*(cam.ch - h); if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); }
  ctx.closePath(); ctx.fill();
  return true;
}
// adds one clipped ground segment to the current path; returns the mean px-per-metre, or 0 when it is all behind the camera
function groundSeg(cam, x0, y0, x1, y1, h) {
  let p = camPt(cam, x0, y0, h), q = camPt(cam, x1, y1, h);
  const near = CAM.near;
  if (p.z < near && q.z < near) return 0;
  if (p.z < near) { const t = (near - p.z)/(q.z - p.z); p = { z:near, a:p.a + (q.a - p.a)*t, h }; }
  if (q.z < near) { const t = (near - q.z)/(p.z - q.z); q = { z:near, a:q.a + (p.a - q.a)*t, h }; }
  const a = proj(cam, p), b = proj(cam, q);
  ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy);
  return (a.k + b.k)/2;
}
function groundLine(cam, x0, y0, x1, y1, dash) {
  ctx.beginPath();
  const k = groundSeg(cam, x0, y0, x1, y1, 0);
  if (!k) return;
  ctx.lineWidth = clamp(0.1*k, 1, 3.5); ctx.setLineDash(dash ? [k*1.5, k*1.5] : []);
  ctx.stroke(); ctx.setLineDash([]);
}
const JUDGE_KIT = { shirt:'#2b2f36', trim:'#f1eee4', hoops:false, shorts:'#1b1d22' };
const BANDS = Array.from({ length:12 }, (_, i) => [i*10, 0, i*10 + 10, 0, i*10 + 10, 70, i*10, 70]);   // the 10m grass bands, in the frame
const easeIO = u => u < 0.5 ? 2*u*u : 1 - 2*(1 - u)*(1 - u);
// where the kicker and the ball are at run-up time st (< 0 before it) and flight time tf (< 0 before the strike)
function kickPose(g, st, tf) {
  const k = KICK, drop = g.type === 'drop', ux = Math.cos(g.beta), uy = Math.sin(g.beta), rx = -uy, ry = ux;
  // a placed kicker starts 1.6m back and 1.2m left and runs up; a drop kicker stands at the mark, 0.9m left of the arrow, and steps onto the line as he drops it
  const K0x = g.x - (drop ? 0.25 : 1.6)*ux - (drop ? 0.9 : 1.2)*rx, K0y = g.y - (drop ? 0.25 : 1.6)*uy - (drop ? 0.9 : 1.2)*ry, K1x = g.x - 0.25*ux - 0.3*rx, K1y = g.y - 0.25*uy - 0.3*ry;
  const runT = drop ? k.dropT : k.runup, relT = drop ? 0 : 0.12;   // the run-up (or the drop), and when the ball leaves his hands
  const run = st < 0 ? 0 : ease3(st/runT);
  const P = { kx:K0x + (K1x - K0x)*run, ky:K0y + (K1y - K0y)*run, stride:st > 0 && !drop ? st*16 : 0, leg:0, bx:0, by:0, bh:0, held:false };
  if (st >= 0) P.leg = tf < 0 ? clamp((st - (runT - 0.10))/0.10, 0, 1) : Math.max(0, 1 - tf/0.25);
  const hx = 0.15*ux + 0.26*rx, hy = 0.15*uy + 0.26*ry;         // the held ball sits at his right hip, where it shows past his back
  if (st < relT) { P.bx = P.kx + hx; P.by = P.ky + hy; P.bh = 1.05; P.held = true; }
  else if (tf < 0 && st < runT) {                              // let go from the hands, meeting the ground on the mark as the boot arrives
    const s = (st - relT)/(runT - relT), r0 = ease3(relT/runT), Rx = K0x + (K1x - K0x)*r0 + hx, Ry = K0y + (K1y - K0y)*r0 + hy;
    P.bx = Rx + (g.x - Rx)*s; P.by = Ry + (g.y - Ry)*s; P.bh = 1.05 - (1.05 - k.h0)*s*s;
  } else if (tf < 0) { P.bx = g.x; P.by = g.y; P.bh = k.h0; }  // the hit-stop
  else { const p = ballAt(g, tf); P.bx = p.x; P.by = p.y; P.bh = p.h; }
  return P;
}
// the drawn ball at flight time tf: the closed form, then a cosmetic 0.5s rebound off the woodwork, or a roll on from a short landing
function ballAt(g, tf) {
  const X = g.X, L = g.L, res = g.res, k = KICK;
  if (g.out === 'charged') {                                 // blocked hitT into the flight: it comes back toward the lens, low
    if (tf <= g.hitT) { const p = posAt(L, tf); p.h = Math.max(0, p.h); return p; }
    const p = posAt(L, g.hitT), tau = tf - g.hitT, tr = Math.min(tau, 0.6), ux = Math.cos(g.beta), uy = Math.sin(g.beta);
    return { x:p.x - 5*ux*tr, y:p.y - 5*uy*tr, h:Math.max(0, p.h + 2*tau - 4.9*tau*tau) };
  }
  const wood = res === 'post' || res === 'postIn' || res === 'bar' || res === 'barIn';
  if (tf <= X.t || !(X.land || wood)) { const p = posAt(L, tf); p.h = Math.max(0, p.h); return p; }
  const v = velAt(L, X.t), tau = tf - X.t, tr = Math.min(tau, 0.5);
  if (X.land) return { x:X.x + v.x*0.3*tr, y:X.y + v.y*0.3*tr, h:0 };
  // in the kick's own axes (along the line to the posts' centre, and across it), so the woodwork reads on screen the way the verdict does:
  // a contact that scores carries on behind the posts, a miss comes back into play, and a post sends the ball away from itself
  const ux = Math.cos(g.beta), uy = Math.sin(g.beta), rx = -uy, ry = ux;
  const al = v.x*ux + v.y*uy, ac = v.x*rx + v.y*ry, aX = (X.x - g.x)*rx + (X.y - g.y)*ry;   // across 0 is the posts' centre
  let a2 = al, c2 = ac, vh = v.h;
  if (res === 'post' || res === 'postIn') {
    const up = Math.abs(X.y - k.upL) < Math.abs(X.y - k.upR) ? k.upL : k.upR, aU = (110 - g.x)*rx + (up - g.y)*ry;   // the nearer upright
    const away = Math.sign(aX - aU) || (res === 'postIn' ? -1 : 1)*Math.sign(aU);
    if (res === 'postIn') c2 = away*1.5;                                                   // clipped the inside and on through
    else { a2 = -0.5*al; c2 = away*Math.max(1.5, 0.5*Math.abs(ac)); }                      // off the face: back, and out
  } else if (res === 'bar') a2 = -0.5*al;                                                  // back into play
  else { a2 = 0.5*al; c2 = 0; vh = 0.5*Math.abs(v.h); }                                    // barIn: popped up and on over
  return { x:X.x + (a2*ux + c2*rx)*tr, y:X.y + (a2*uy + c2*ry)*tr, h:Math.max(0, X.h + vh*tau - 4.9*tau*tau) };
}
// worst cases of this flight, for the camera: the ball's highest screen point and how far it climbs over the scoreboard
function flightInfo(g, cam) {
  if (cam.fi) return cam.fi;
  const l = pr(cam, 110, 32.2, 3), r = pr(cam, 110, 37.8, 3), gap = Math.abs(r.sx - l.sx);
  let tA = 0, minSy = 1e9;
  for (let t = 0; t <= g.X.t; t += 0.02) { const p = posAt(g.L, t), s = pr(cam, p.x, p.y, Math.max(0, p.h)); if (s && s.sy < minSy) { minSy = s.sy; tA = t; } }
  const tZ = Math.max(0, Math.min(tA, g.X.t - 0.4));   // the zoom starts at the screen apex, but at least 0.4s before the crossing: a short kick's apex is almost on it
  cam.fi = { tA, tZ, ramp:Math.max(0.4, g.X.t - tZ), S:Math.max(0, cam.ytop + 12 - minSy), Zend:clamp(0.20*cam.W/gap, 1, 2.2) };
  return cam.fi;
}
// the flight camera at tf: a tilt keeps a high ball in frame, a zoom closes on the goal window as it comes down; sy is the ball's screen y after both
const VIEW = { tilt:0, Z:1, sy:0 };
function kickView(g, cam, tf, bx, by, bh) {
  const v = VIEW, fi = flightInfo(g, cam), pb = pr(cam, bx, by, bh), gx = cam.cx, gy = cam.gy;
  v.tilt = 0; v.Z = 1; v.sy = gy;
  if (!pb) return v;
  v.tilt = RM ? fi.S*ease3(tf/0.3) : 12*Math.log(1 + Math.exp((cam.ytop + 12 - pb.sy)/12));
  if (!RM && tf >= fi.tZ) {
    const Z = 1 + (fi.Zend - 1)*easeIO(clamp((tf - fi.tZ)/fi.ramp, 0, 1));
    // the zoom is about (gx, gy): hold it to the largest Z that keeps the ball inside x 0.04-0.96W and y ytop-0.91H, so it follows the ball rather than stepping
    const lim = (p, c, lo, hi) => p < c ? (c - lo)/(c - p) : p > c ? (hi - c)/(p - c) : 1e9;
    v.Z = Math.max(1, Math.min(Z, lim(pb.sx, gx, 0.04*cam.W, 0.96*cam.W), lim(pb.sy, gy, cam.ytop, 0.91*cam.H)));
  }
  v.sy = gy + v.tilt + v.Z*(pb.sy - gy);
  return v;
}
const ARROW = new Array(14).fill(0);
function arrowLen(g, psi) { const fx = Math.cos(psi); return Math.max(2, Math.min(14, (108 - g.x)/Math.max(0.2, fx) - 0.6)); }
function drawArrow(cam, g, aim, alpha, chalk) {
  const psi = g.beta + aim, fx = Math.cos(psi), fy = Math.sin(psi), nx = -fy, ny = fx;
  const len = arrowLen(g, psi), s0 = 0.6, s1 = s0 + len, hl = 1.4, hw = 0.55, sw = 0.16;
  const S = [s0, -sw, s0, sw, s1 - hl, sw, s1 - hl, hw, s1, 0, s1 - hl, -hw, s1 - hl, -sw];
  for (let i = 0; i < 7; i++) { const s = S[2*i], w = S[2*i + 1]; ARROW[2*i] = g.x + fx*s + nx*w; ARROW[2*i + 1] = g.y + fy*s + ny*w; }
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0*alpha;
  if (groundPoly(cam, ARROW, 0.02, chalk ? 'rgba(241,238,228,.8)' : C.ctrl)) { ctx.strokeStyle = C.outline; ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.globalAlpha = a0;
}
function drawAimLine(cam, g, aim) {                           // Normal and Hard: the bearing run on to the goal line, with a tick across it
  const psi = g.beta + aim, fx = Math.cos(psi), fy = Math.sin(psi), nx = -fy, ny = fx;
  if (fx < 0.05) return;
  const sEnd = (110 - g.x)/fx, s0 = 0.6 + arrowLen(g, psi) + 0.3;
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0*0.7; ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath();
  for (let s = s0; s < sEnd; s += 1.2) { const e = Math.min(s + 0.6, sEnd); groundSeg(cam, g.x + fx*s, g.y + fy*s, g.x + fx*e, g.y + fy*e, 0.01); }
  groundSeg(cam, g.x + fx*sEnd - nx*0.5, g.y + fy*sEnd - ny*0.5, g.x + fx*sEnd + nx*0.5, g.y + fy*sEnd + ny*0.5, 0.01);
  ctx.stroke(); ctx.globalAlpha = a0;
}
function pathPts(g, m, aim) {                                 // Easy: 16 points of the real flight, cached by aim and power
  const key = Math.round(aim*1000) + '|' + Math.round(m*200);
  if (g.pathKey === key) return g.pathPts;
  const L = launchOf(g, m, aim), X = crossOf(L), pts = g.pathPts || (g.pathPts = new Array(48).fill(0));
  for (let i = 0; i < 16; i++) { const p = posAt(L, X.t*i/15); pts[3*i] = p.x; pts[3*i + 1] = p.y; pts[3*i + 2] = Math.max(0, p.h); }
  g.pathLand = X.land; g.pathKey = key;
  return pts;
}
function drawPath(cam, g, m, aim) {
  const pts = pathPts(g, m, aim), a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0*0.85;
  for (let i = 0; i < 16; i++) {
    const p = pr(cam, pts[3*i], pts[3*i + 1], pts[3*i + 2]); if (!p) continue;
    if (i < 15) { ctx.fillStyle = C.line; ctx.beginPath(); ctx.arc(p.sx, p.sy, Math.max(2, 0.08*p.k), 0, 7); ctx.fill(); }
    else if (g.pathLand) { ctx.strokeStyle = C.line; ctx.lineWidth = 2; const r = Math.max(4, 0.2*p.k); seg(p.sx - r, p.sy - r, p.sx + r, p.sy + r); seg(p.sx + r, p.sy - r, p.sx - r, p.sy + r); }
    else { ctx.fillStyle = C.ctrl; ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.sx, p.sy, Math.max(4, 0.16*p.k), 0, 7); ctx.fill(); ctx.stroke(); }
  }
  ctx.globalAlpha = a0;
}
function drawPosts(cam, g, tf) {
  const X = g.X, hit = tf >= 0 && X && (g.res === 'post' || g.res === 'postIn') && tf > X.t && tf < X.t + 0.4 && !RM;
  for (const py of [32.2, 37.8]) {
    let y = py;
    if (hit && Math.abs(X.y - py) < 1) { const tau = tf - X.t; y += 0.06*Math.sin(tau*2*Math.PI*12)*(1 - tau/0.4); }
    const a = pr(cam, 110, y, 0), b = pr(cam, 110, y, KICK.upH);
    if (!a || a.z < 0.8) continue;
    ctx.strokeStyle = '#f7f5ee'; ctx.lineWidth = Math.max(1.5, 0.12*a.k); seg(a.sx, a.sy, b.sx, b.sy);
    ctx.fillStyle = C.pad; ctx.fillRect(a.sx - 0.3*a.k, a.sy - 1.8*a.k, 0.6*a.k, 1.8*a.k);
  }
  const l = pr(cam, 110, 32.2, KICK.bar), r = pr(cam, 110, 37.8, KICK.bar);
  if (l && r && l.z >= 0.8) { ctx.strokeStyle = '#f7f5ee'; ctx.lineWidth = Math.max(1.5, 0.12*l.k); seg(l.sx, l.sy, r.sx, r.sy); }
}
function drawPennants(cam, g, t) {                            // coral, streaming downwind with a little droop; limp when calm
  const W = g.W, mph = W.mph, calm = mph < KICK.wind.calm, len = 1.4*(0.4 + 0.6*Math.min(1, mph/12));
  const m = hyp(W.x, W.y) || 1, dx = calm ? 0 : W.x/m, dy = calm ? 0 : W.y/m;
  const fl = RM || calm ? 0 : 0.15*Math.sin(t*2*Math.PI*(1.5 + 0.15*mph));
  ctx.fillStyle = '#ff8466';
  for (const py of [32.2, 37.8]) {
    const a = pr(cam, 110, py, KICK.upH), b = pr(cam, 110, py, KICK.upH - 0.6);
    const tip = calm ? pr(cam, 110.08, py + 0.12, KICK.upH - 1.1) : pr(cam, 110 + dx*len, py + dy*len, KICK.upH - 0.3 + fl);
    if (!a || !b || !tip || a.z < 0.8) continue;
    ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.lineTo(tip.sx, tip.sy); ctx.closePath(); ctx.fill();
  }
}
function drawTouchJudges(cam, g, up) {
  for (const jy of [30.2, 39.8]) {
    const p = pr(cam, 113, jy, 0); if (!p || p.z < 0.8) continue;
    figFB(p.sx, p.sy, p.k, g.team, { kit:JUDGE_KIT, arms:up ? 'reach' : 'carry' });
    const hx = p.sx + (up ? 0.32 : 0.12)*p.k, hy = p.sy - (up ? 1.85 : 1.12)*p.k, fl = 0.45*p.k;   // the flag, from the right hand
    ctx.strokeStyle = '#f1eee4'; ctx.lineWidth = Math.max(1, 0.04*p.k); seg(hx, hy, hx, hy - fl);
    ctx.fillStyle = '#f1eee4'; ctx.beginPath(); ctx.moveTo(hx, hy - fl); ctx.lineTo(hx + 0.3*p.k, hy - fl + 0.12*p.k); ctx.lineTo(hx, hy - fl + 0.24*p.k); ctx.closePath(); ctx.fill();
  }
}
function drawKick(c, g0) {
  const g = c.g, cam = kickCam(g), { W, H } = g0, t = c.t, k = KICK, hz = cam.hz, a0 = ctx.globalAlpha, drop = g.type === 'drop';
  const tf = g.stage === 'flight' ? t - g.tStrike - k.hitStop : -1;              // the flight clock, hit-stop included
  const runT = drop ? k.dropT : k.runup;
  const st = g.stage === 'runup' || g.stage === 'drop' ? g.st : g.stage === 'flight' ? runT : -1;   // the run-up (or drop) clock
  const live = g.stage === 'aim' || g.stage === 'wait' || g.stage === 'hold';   // the arrow is yours to steer
  let tau = t - CUT_IN - (g.stage === 'flight' ? clamp(t - g.tStrike, 0, k.hitStop) : 0);   // the chargers' clock pauses with the hit-stop
  if (g.out === 'smothered') tau = Math.min(tau, g.tauStop);
  const P = kickPose(g, st, tf);
  const aimShown = g.watch ? g.aim*easeIO(clamp((t - CUT_IN)/0.5, 0, 1)) : g.aim;
  // camera: a tilt keeps a high ball in frame, and a zoom closes on the goal window as it comes down
  let tilt = 0, Z = 1;
  const gx = cam.cx, gy = cam.gy;
  if (tf >= 0 && g.out !== 'charged') { const v = kickView(g, cam, tf, P.bx, P.by, P.bh); tilt = v.tilt; Z = v.Z; }
  ctx.save();
  const ds = tf + k.hitStop;                                                   // the shake is deterministic: no Math.random
  if (!RM && ds >= 0 && ds < 0.12) { const a = 4*Math.exp(-ds/0.04); ctx.translate(a*Math.sin(97*t), a*Math.cos(83*t)); }
  ctx.translate(gx, gy + tilt); ctx.scale(Z, Z); ctx.translate(-gx, -gy);
  drawStands(g0, hz, -tilt - 8);
  ctx.fillStyle = C.surround; ctx.fillRect(0, hz, W, H - hz + tilt + 8);
  for (let i = 0; i < 12; i++) groundPoly(cam, BANDS[i], 0, i % 2 ? C.grassA : C.grassB);
  ctx.globalAlpha = a0*0.14;
  groundPoly(cam, BANDS[11], 0, M.kit[1 - g.team].fill);
  groundPoly(cam, BANDS[0], 0, M.kit[g.team].fill);
  ctx.globalAlpha = a0;
  ctx.strokeStyle = C.line;
  for (const x of [10, 110, 32, 88, 60]) groundLine(cam, x, 0, x, 70, false);
  for (const x of [50, 70, 15, 105]) groundLine(cam, x, 0, x, 70, true);
  for (const y of [0, 70]) groundLine(cam, 0, y, 120, y, false);
  for (const x of [0, 120]) groundLine(cam, x, 0, x, 70, false);
  groundLine(cam, g.x - 0.25, g.y, g.x + 0.25, g.y, false); groundLine(cam, g.x, g.y - 0.25, g.x, g.y + 0.25, false);   // the kick mark
  // the aim aid, then the arrow: gold is the one you steer, chalk the CPU's
  const struck = tf >= -k.hitStop;
  let arrowA = g.watch ? 0.6 : live ? (RM ? 0.85 : 0.85 + 0.15*Math.sin(t*2*Math.PI*1.6)) : 0.6;
  if (struck) arrowA *= Math.max(0, 1 - (tf + k.hitStop)/0.3);
  if (arrowA > 0.01) {
    if (!g.watch && !struck) {
      if (g.aid === 'path') drawPath(cam, g, g.stage === 'aim' || g.stage === 'wait' ? g.ctr : g.m, g.aim);   // the live meter from Power on, so the run-up shows the kick that was struck
      else drawAimLine(cam, g, g.aim);
    }
    drawArrow(cam, g, aimShown, arrowA, g.watch);
  }
  // far figures and the posts, then the chargers closing from the posts' side
  drawTouchJudges(cam, g, g.judged && g.ok);
  drawPosts(cam, g, tf);
  drawPennants(cam, g, t);
  // the kicker, the ball and the chargers in one list, far to near. Until the strike the ball is in his hands or at his feet, so it goes over him
  const scene = kickScene(cam, g, P, tau, tf), qb = camPt(cam, P.bx, P.by, P.bh);
  { const s = seatOfTeam(g.team), cw = Math.min(340, W/2 - 116), top = 0.07*H + 56, bot = top + 112, l = s === 1 ? W - 62 - cw : 12, r = l + cw;   // a charger drawn under the kick hint card dims it (the card is 12..12+cw by 0.07H+56..+112 at the left, mirrored for Player 2)
    g.hcOver = s != null && scene.some(it => it.kind === 'charger' && it.sx + 0.45*it.k > l && it.sx - 0.45*it.k < r && it.sy > top && it.sy - 1.85*it.k < bot); }
  const ball = () => {
    if (qb.z < CAM.near) return;
    const pb = proj(cam, qb), sh = pr(cam, P.bx, P.by, 0);
    if (tf > 0 && !RM) {                                                       // a chalk trail over the last 0.4s, sampled from the drawn ball's own path
      for (let i = 1; i <= 8; i++) { const tt = tf - 0.05*i; if (tt < 0) break; const p = ballAt(g, tt), s = pr(cam, p.x, p.y, p.h); if (!s) continue; ctx.fillStyle = `rgba(241,238,228,${(0.5 - i*0.055).toFixed(3)})`; ctx.beginPath(); ctx.arc(s.sx, s.sy, Math.max(1.5, 0.06*s.k), 0, 7); ctx.fill(); }
    }
    if (sh && sh.z >= 0.8) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ellipse(sh.sx, sh.sy, 0.18*sh.k, 0.05*sh.k); ctx.fill(); }
    cutBall(pb.sx, pb.sy, Math.max(10, pb.k*0.9), P.held ? 0.3 : tf > 0 ? tf*9 : 0.9);
  };
  for (const it of scene) {
    if (it.kind === 'ball') ball();
    else if (it.kind === 'kicker') { figFB(it.sx, it.sy, it.k, g.team, { back:true, kit:kitOf(g.team, g.kicker), num:g.kicker ? g.kicker.n : 10, stride:P.stride, kickLeg:P.leg, arms:P.held ? 'carry' : 'run' }); if (M.two && !g.judged) cutSeatTag(seatOfTeam(g.team), it.sx, it.sy - 2.25*it.k, 0.4*it.k); }   // the seat tag over the kicker
    else { ctx.globalAlpha = a0*it.alpha; figFB(it.sx, it.sy, it.k, 1 - g.team, it.o); ctx.globalAlpha = a0; }
  }
  ctx.restore();
  if (!g.watch && g.out !== 'smothered') drawMeter(g, g0, tf);
  drawWindChip(g, cam, g0);
}
// what the close-up draws between the posts and the lens, far to near: the kicker (from 0.8m in front of the lens), the ball (over him until the strike,
// then by depth) and the chargers, front-on in their kit, arms up within 3m and on the block. A charger is not drawn until he is CAM.fadeZ metres in
// front of the lens, fades in over the next fadeW, and never stands taller than figH of the screen, so one closing from behind or beside the kicker is
// a figure over him, not a wall of shirt under him. P is the kicker's pose, tau the chargers' clock, tf the flight clock.
function kickScene(cam, g, P, tau, tf) {
  const items = [], qk = camPt(cam, P.kx, P.ky, 0), qb = camPt(cam, P.bx, P.by, P.bh), kMax = CAM.figH*cam.H/1.85;   // a figure is 1.85k tall with his arms up
  if (qk.z >= 0.8) { const p = proj(cam, qk); items.push({ kind:'kicker', z:qk.z, sx:p.sx, sy:p.sy, k:p.k, alpha:1 }); }
  if (qb.z >= CAM.near) items.push({ kind:'ball', z:tf >= 0 ? qb.z : Math.min(qb.z, qk.z) - 1e-6, alpha:1 });
  if (g.rush) for (const r of g.rush) {
    const a = rushAt(r, tau);
    if (a.d < 0.8) { const s = Math.max(0, r.d0 - 0.8); a.x = r.x + r.ux*s; a.y = r.y + r.uy*s; }   // drawn no closer than 0.8m, so he and the kicker stay two figures
    const q = camPt(cam, a.x, a.y, 0);
    if (q.z <= CAM.fadeZ) continue;
    const p = proj(cam, q), moving = a.d > 0.8 && g.out !== 'smothered', hit = g.out === 'charged' && g.outQ === r.q && tf >= g.hitT;
    items.push({ kind:'charger', z:q.z, sx:p.sx, sy:p.sy, k:Math.min(p.k, kMax), alpha:clamp((q.z - CAM.fadeZ)/CAM.fadeW, 0, 1), r, a,
      o:{ stride:moving ? tau*19 : 0, arms:hit || a.d < 3 ? 'reach' : 'run', lean:moving ? 0.1 : 0, back:r.ux > 0.3 } });   // one closing from behind the kicker is seen from behind
  }
  return items.sort((p, q) => q.z - p.z);
}
function drawMeter(g, g0, tf) {
  const { W, H } = g0, x = 0.62*W, y0 = 0.40*H, y1 = 0.86*H, w = 16, h = y1 - y0, a0 = ctx.globalAlpha;
  let alpha = 1;
  if (tf >= 0) { alpha = 1 - tf/0.4; if (alpha <= 0) return; }
  const yOf = m => y1 - clamp(m, 0, 1)*h, lo = g.lo, hi = g.hi, m = g.m;
  ctx.globalAlpha = a0*alpha;
  ctx.fillStyle = 'rgba(8,14,10,.85)'; rrect(x, y0, w, h, 8); ctx.fill();
  ctx.save(); rrect(x, y0, w, h, 8); ctx.clip();
  ctx.fillStyle = 'rgba(255,132,102,.25)'; ctx.fillRect(x, y0, w, yOf(hi) - y0);
  ctx.fillStyle = 'rgba(255,207,61,.30)'; ctx.fillRect(x, yOf(hi), w, yOf(lo) - yOf(hi));
  if (m > 0) {
    ctx.fillStyle = m < lo ? '#f1eee4' : m <= hi ? ringCol(g.team) : '#ff8466'; ctx.fillRect(x, yOf(m), w, y1 - yOf(m));
    ctx.fillStyle = '#fff'; ctx.fillRect(x, yOf(m) - 1.5, w, 3);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(241,238,228,.35)'; ctx.lineWidth = 1.5; rrect(x, y0, w, h, 8); ctx.stroke();
  ctx.fillStyle = '#f1eee4';
  for (const e of [lo, hi]) ctx.fillRect(x - 3, yOf(e) - 1.5, w + 6, 3);   // chalk ticks: the band doesn't rely on colour
  if (g.mRel != null && g.stage !== 'aim' && g.stage !== 'wait') { ctx.fillStyle = '#fff'; ctx.fillRect(x - 4, yOf(g.mRel) - 1.5, 24, 3); }
  ctx.globalAlpha = a0;
}
function drawWindChip(g, cam, g0) {
  const { H } = g0, W = g.W, x = 16, y = 0.07*H + 6, r = 22, cx = x + r, cy = y + r, calm = W.mph < KICK.wind.calm;
  ctx.fillStyle = 'rgba(8,14,10,.74)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(241,238,228,.25)'; ctx.lineWidth = 1; ctx.stroke();
  if (!calm) {                                                 // chalk, always: up is at your back, toward the posts
    const vx = W.x*cam.r.x + W.y*cam.r.y, vy = -(W.x*cam.u.x + W.y*cam.u.y), m = hyp(vx, vy) || 1;
    const len = 16*Math.max(0.4, Math.min(1, W.mph/15)), ex = vx/m*len/2, ey = vy/m*len/2, hx = -ey/len*5, hy = ex/len*5;
    ctx.strokeStyle = '#f1eee4'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    seg(cx - ex, cy - ey, cx + ex, cy + ey);
    seg(cx + ex, cy + ey, cx + ex*0.55 + hx, cy + ey*0.55 + hy); seg(cx + ex, cy + ey, cx + ex*0.55 - hx, cy + ey*0.55 - hy);
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = `700 11px 'Atkinson Hyperlegible', system-ui, sans-serif`; ctx.fillStyle = '#a7b4a9';
  ctx.letterSpacing = '1.3px'; ctx.fillText('WIND', x + 52, y + 11); ctx.letterSpacing = '0px';
  ctx.font = `800 22px 'Big Shoulders Display', Impact, sans-serif`; ctx.fillStyle = W.mph >= 15 ? '#ff8466' : '#f1eee4';
  ctx.fillText(calm ? 'CALM' : Math.round(W.mph) + ' MPH', x + 52, y + 31);
}
function layoutOf(c) {                                        // the framing, for the tests
  const g = c.g, cam = kickCam(g), W = V.W, H = V.H;
  const l = pr(cam, 110, 32.2, 3), r = pr(cam, 110, 37.8, 3), tl = pr(cam, 110, 32.2, KICK.upH), tr = pr(cam, 110, 37.8, KICK.upH), b = pr(cam, g.x, g.y, 0);
  return { gapPx:Math.abs(r.sx - l.sx), ballY:b.sy, topsY:Math.min(tl.sy, tr.sy), meter:{ x:0.62*W, y:0.40*H, w:16, h:0.46*H }, chip:{ x:16, y:0.07*H + 6, w:116, h:44 }, ball:{ x:b.sx, y:b.sy } };
}
/* A front- or back-on player. sx, sy: feet in px; k: px per metre. */
function figFB(sx, sy, k, team, o) {
  const kit = o.kit || kitOf(team), cr = o.crouch || 0, sh = (o.shift || 0)*k;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ellipse(sx, sy, 0.38*k, 0.09*k); ctx.fill();
  ctx.save(); ctx.translate(sx, sy);
  if (o.lying) { ctx.rotate(Math.PI/2*(o.dive || 1)); ctx.translate(0, 0.25*k); }
  else if (o.dive) ctx.rotate((o.back ? -0.35 : 0.35)*o.dive);
  ctx.lineCap = 'round';
  const hip = 0.95*(1 - 0.3*cr)*k, shY = 1.5*(1 - 0.3*cr)*k, st = o.stride || 0;
  // legs: shorts on the thigh, trim socks, boots
  // shading to one side: the hips slide over, the feet stay planted
  for (const side of [-1, 1]) {
    const lift = Math.max(0, Math.sin(st + (side > 0 ? Math.PI : 0)))*0.22*k + (side > 0 ? (o.kickLeg || 0)*0.6*k : 0);   // the right boot swings through a kick
    const fx = side*0.16*k + (side === Math.sign(sh) ? sh*0.6 : 0), kx = side*0.12*k + sh*0.55;
    ctx.strokeStyle = kit.shorts; ctx.lineWidth = 0.17*k; seg(side*0.08*k + sh, -hip, kx, -hip*0.5 - lift*0.6);
    ctx.strokeStyle = kit.trim; ctx.lineWidth = 0.13*k; seg(kx, -hip*0.5 - lift*0.6, fx, -0.08*k - lift);
    ctx.fillStyle = kit.boots || '#111'; ctx.fillRect(fx - 0.07*k, -0.09*k - lift, 0.14*k, 0.09*k);
  }
  ctx.translate(sh, -hip); ctx.rotate(o.lean || 0); ctx.translate(0, hip);   // lean pivots at the hips
  if (o.twist) ctx.scale(1 - 0.25*o.twist, 1);
  // torso
  ctx.strokeStyle = C.outline; ctx.lineWidth = 1.5;
  ctx.fillStyle = kit.shirt;
  ctx.beginPath(); ctx.moveTo(-0.2*k, -hip + 0.02*k); ctx.lineTo(0.2*k, -hip + 0.02*k); ctx.lineTo(0.28*k, -shY); ctx.lineTo(-0.28*k, -shY); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = kit.trim; ctx.fillRect(-0.27*k, -shY + 0.02*k, 0.54*k, 0.06*k);
  if (kit.hoops) for (const t of [0.36, 0.66]) { const y = -shY + (shY - hip)*t, hw = (0.27 - 0.08*t)*k; ctx.fillRect(-hw, y, hw*2, 0.07*k); }
  ctx.fillStyle = kit.shorts; rrect(-0.21*k, -hip - 0.02*k, 0.42*k, 0.16*k, 0.05*k); ctx.fill();
  if (o.back && o.num) {
    ctx.fillStyle = luma(kit.shirt) > 0.6 ? '#1b2233' : '#f1eee4';
    ctx.font = `900 ${Math.max(8, Math.round(0.3*k))}px 'Big Shoulders Display', Impact, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (kit.hoops) { ctx.save(); ctx.strokeStyle = kit.shirt; ctx.lineWidth = 0.08*k; ctx.lineJoin = 'round'; ctx.strokeText(String(o.num), 0, -(hip + shY)/2); ctx.restore(); }
    ctx.fillText(String(o.num), 0, -(hip + shY)/2);
  }
  // arms
  const ARM = { run:[[-0.36, -0.95], [0.36, -1.05]], wide:[[-0.75, -1.3], [0.75, -1.3]], carry:[[-0.1, -1.1], [0.12, -1.12]], pass:[[0.5, -1.25], [0.62, -1.3]], reach:[[-0.32, -1.85], [0.32, -1.85]] };
  const arms = ARM[o.arms] || ARM.run, swing = Math.sin(st)*0.08;
  for (const [i, [ax, ay]] of arms.entries()) {
    const ex = ax*k, ey = (ay + (i ? swing : -swing))*k*(1 - 0.3*cr), s0 = (i ? 0.26 : -0.26)*k;
    ctx.strokeStyle = kit.shirt; ctx.lineWidth = 0.12*k; seg(s0, -shY + 0.05*k, (s0 + ex)/2, (-shY + ey)/2);
    ctx.strokeStyle = SKIN; ctx.lineWidth = 0.1*k; seg((s0 + ex)/2, (-shY + ey)/2, ex, ey);
  }
  // head
  const hy = -1.68*(1 - 0.3*cr)*k;
  ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(0, hy, 0.12*k, 0, 7); ctx.fill();
  ctx.fillStyle = HAIR;
  if (o.back) { ctx.beginPath(); ctx.arc(0, hy - 0.01*k, 0.125*k, 0, 7); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(0, hy - 0.03*k, 0.125*k, Math.PI*1.05, Math.PI*1.95); ctx.fill(); }
  ctx.restore();
}
function cutTitle(c) {
  if (c.duel) return DUEL[c.kind].name;
  if (c.kind === 'goal') return (c.g.kind === 'conversion' ? 'Conversion' : c.g.kind === 'penalty' ? 'Penalty Goal' : 'Drop Goal') + ' · ' + Math.round(c.g.dist) + 'm';
  if (c.kind === 'scrum') return 'Scrum · ' + M.nat[c.feed].id + ' Ball';
  return 'Lineout · ' + M.nat[c.team].id + ' Throw';
}
function duelLabels(c) {
  if (c.kind === 'past') return [null, null];
  if (c.kind === 'pass') return ['Pass', 'Dummy'];
  return [c.kind === 'tackle' ? 'Tackle' : 'Block', null];
}
