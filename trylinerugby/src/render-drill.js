/* =========================================================
   The Training Ground's look: a sunny practice field of its own, seen through whichever view shows each game's technique best. It draws through the
   behind view's projection and men (renderBehind, drawManBehind, artDraw), with its own camera, grass, markings and props. A match never comes here:
   every line below is reached only while `practice` is set, and behindOn() stays false, so a match's camera, sizes and Top are as they were.
   Side views keep x across the screen and y down it, as Top does, so the stick reads as it always did. A behind view turns the stick (dvTurn), so up is
   up the screen on touch, keys and a pad alike, and Watch How writes through the same turn (demoStart's go). Nothing here draws a random number.
   ========================================================= */
const DV_SIDE = { u:{ x:0, y:-1 }, r:{ x:1, y:0 } }, DV_BEHIND = { u:{ x:1, y:0 }, r:{ x:0, y:1 } };
// k: px a metre at the focus at 844x390. z: the lens' distance from the focus (longer is flatter). tilt: its height over that distance. sy: where the focus sits up the screen. aim: where it looks, x, y and a zoom
const DV_VIEW = {
  tag:{ ...DV_BEHIND, k:30, z:18, tilt:0.42, sy:0.74, cut:10, aim:() => { const T = practice.tag, m = T.me; return [tagMode(T) === 'keep' ? m.x : Math.min(m.x, T.them.x), 35 + (m.y - 35)*0.35]; } },   // a dodge reads best across the screen, and both hips show
  egg:{ ...DV_SIDE, k:24, z:40, tilt:0.34, sy:0.5, aim:() => [clamp((58 + practice.egg.me.x)/2, 54, 60), 35] },               // from the side, low, so a hop's height reads above its shadow. It leans a little after you, never so far that the thrower goes off
  circle:{ ...DV_SIDE, k:19, z:44, tilt:0.6, sy:0.58, aim:() => { const C = practice.circle, K = DRILL_CIRCLE; return [K.at[0], K.at[1], clamp(10.6/(dvCircleR(C) + K.out), 1, 1.5)]; } },   // high, so the whole ring shows, closer in while it is small
  cones:{ ...DV_SIDE, k:25, z:30, tilt:0.5, sy:0.56, cut:30, aim:() => { const m = practice.cones.me; return [clamp(m.x + m.vx*0.6, 30, 62), clamp(m.y*0.65 + 37*0.35, 30, 44)]; } },            // runs with you: the next gate is what matters
  tackle:{ ...DV_BEHIND, k:30, z:18, tilt:0.42, sy:0.74, aim:() => [DRILL_TACKLE.at[0], 35] },                                  // behind you, to get in their path. The close-ups take over from Head Side on
  back:{ ...DV_SIDE, k:20, z:36, tilt:0.42, sy:0.58, aim:() => [60, 35] },                                                      // all close-up, so only ever seen under nothing
  pass:{ ...DV_SIDE, k:23, z:36, tilt:0.42, sy:0.58, cut:30, aim:() => [clamp(M.ball.x + 3, 72, 98), 36] },                    // from the side: how near the defender is reads as a distance across the screen
  defend:{ ...DV_SIDE, k:21, z:38, tilt:0.42, sy:0.58, cut:30, aim:() => { const c = practice.switched ? ctrlOf(0) : M.players[1], b = M.ball; return [c ? (b.x + c.x)/2 : b.x, 35 + (b.y - 35)*0.4]; } },   // between the runner and the cover: the man you switch to starts clear of the thumb
  kick:{ ...DV_SIDE, k:20, z:36, tilt:0.42, sy:0.58, aim:() => [90, 35] },                                                      // its own close-up: this is only what a wipe uncovers
  scrum:{ ...DV_SIDE, k:20, z:36, tilt:0.42, sy:0.58, aim:() => [60, 35] },
};
const DV = { cam:null, tx:0, ty:0, zoom:1, sky:new Map(), props:{}, egg:null };
const DV_GRASS = ['#4f9b4b', '#59a553'], DV_CHALK = 'rgba(250,248,238,.9)', DV_FAINT = 'rgba(250,248,238,.17)', DV_GOLD = 'rgba(255,207,61,.95)', DV_GREEN = 'rgba(98,214,128,.95)', DV_RED = 'rgba(255,132,102,.95)';
const DV_KITS = [{ fill:'#1d4f9c', trim:'#ffcf3d', hoops:false }, { fill:'#ee6c22', trim:'#1b1d22', hoops:false }];   // training colours, for both sides of every game: yours blue, theirs an orange bib
const dvOn = () => !!practice && playing();
function dvTurn() {                                         // the stick's turn in a behind view. 0 everywhere else, close-ups included: their left and right are the screen's
  if (!dvOn()) return 0;
  if (practice.id === 'tag') return 1;
  if (practice.id === 'tackle') { const T = practice.tackle; return T && (T.stage === 'approach' || T.stage === 'past') ? 1 : 0; }
  return 0;
}
const dvCovered = () => (practice.id === 'back' && !!practice.back) || (practice.id === 'tackle' && !!practice.tackle && practice.tackle.stage !== 'approach' && practice.tackle.stage !== 'past' && !(practice.tackle.stage === 'show' && !practice.tackle.marks.height));   // a close-up has the whole screen: nothing goes on under it

/* ---------- the camera ---------- */
function dvCamera(dt) {
  const v = DV_VIEW[practice.id], W = V.W, H = V.H, tall = H > W, q = Math.min(W/(tall ? 520 : 844), H/390), a = v.aim();   // an upright window (a tablet or a desktop; a phone is told to turn) comes in closer and holds the field lower
  let c = DV.cam;
  const fresh = !c || c.id !== practice.id || c.W !== W || c.H !== H || BV.M !== M;
  if (fresh) c = DV.cam = { id:practice.id, key:'dv', W, H, cx:W/2, F:0, ch:v.tilt*v.z, back:v.z, hz:0, u:v.u, r:v.r, Cx:0, Cy:0 };
  const z = a[2] || 1, dx = a[0] - DV.tx, dy = a[1] - DV.ty, cut = v.cut || 25;
  if (fresh || Math.abs(dx) > cut || Math.abs(dy) > cut) { DV.tx = a[0]; DV.ty = a[1]; DV.zoom = z; }
  else {
    DV.tx += clamp(dx*Math.min(1, dt*4), -14*dt, 14*dt); DV.ty += clamp(dy*Math.min(1, dt*3), -14*dt, 14*dt);
    DV.zoom += (z - DV.zoom)*Math.min(1, dt*3);
  }
  BV.M = M; BV.rt = M.rt;
  const k = v.k*q*DV.zoom;
  c.F = k*v.z; c.hz = (tall ? v.sy*0.72 : v.sy)*H - k*c.ch; c.Cx = DV.tx - v.z*v.u.x; c.Cy = DV.ty - v.z*v.u.y;
  return c;
}
function dvFree() { if (!DV.sky.size) return; for (const c of DV.sky.values()) c.width = 0; DV.sky.clear(); }
const dvCircleR = C => (C.stage === 'grow' ? drillLerp(circleRadius(C.role, C.round - 1), circleRadius(C.role, C.round), Math.min(1, C.t/DRILL_CIRCLE.growT)) : C.R);

/* ---------- the field ---------- */
function dvSky(h) {                                         // daylight, trees, a hedge and a shed: a picture painted once. No boards, stands or floodlights
  const W = V.W, d = V.dpr, key = Math.round(h) + 'x' + W + 'x' + d;
  let cv = DV.sky.get(key);
  if (cv) return cv;
  if (DV.sky.size >= 3) { for (const old of DV.sky.values()) old.width = 0; DV.sky.clear(); }
  cv = document.createElement('canvas'); cv.width = Math.ceil(W*d); cv.height = Math.ceil(h*d);
  DV.sky.set(key, cv);
  const g = cv.getContext('2d');
  g.scale(d, d);
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#8fc1e2'); sky.addColorStop(1, '#e6efe2');
  g.fillStyle = sky; g.fillRect(0, 0, W, h);
  const R = Math.max(10, Math.min(h, 90)*0.28), base = h;
  g.fillStyle = 'rgba(255,255,255,.75)';
  for (let i = 0; i < 5; i++) { const x = ((i*0.237 + 0.07) % 1)*W, y = base*(0.14 + 0.1*(i % 3)); g.beginPath(); g.ellipse(x, y, R*1.8, R*0.42, 0, 0, 7); g.ellipse(x + R, y - R*0.22, R*1.1, R*0.4, 0, 0, 7); g.fill(); }
  for (const [col, up, gap] of [['#6d9a68', 1.15, 0.9], ['#4f8150', 0.8, 0.65]]) {
    g.fillStyle = col;
    for (let x = -R, i = 0; x < W + R; x += R*gap, i++) { const r = R*(0.75 + 0.35*((i*7) % 5)/4); g.beginPath(); g.arc(x, base - R*up*0.6 + ((i*3) % 4)*0.08*R, r, 0, 7); g.fill(); }
    g.fillRect(0, base - R*up*0.6, W, R*up*0.6);
  }
  const sw = R*3.6, sh = R*1.5, sx = W*0.7, sy = base - R*0.5 - sh;     // a clubhouse shed, plain, no sign
  g.fillStyle = '#d9cdb4'; g.fillRect(sx, sy, sw, sh);
  g.fillStyle = '#8d5a3e'; g.beginPath(); g.moveTo(sx - R*0.25, sy); g.lineTo(sx + sw/2, sy - R*0.62); g.lineTo(sx + sw + R*0.25, sy); g.closePath(); g.fill();
  g.fillStyle = '#5b7a8c'; g.fillRect(sx + R*0.4, sy + R*0.4, R*0.8, R*0.55); g.fillRect(sx + sw - R*1.2, sy + R*0.4, R*0.8, R*0.55);
  g.fillStyle = '#3f6b45'; g.fillRect(0, base - R*0.5, W, R*0.5);        // the hedge
  g.fillStyle = '#f4f1e6';
  for (let x = 0; x < W; x += R*1.5) g.fillRect(x, base - R*0.42, Math.max(1.2, R*0.07), R*0.42);
  g.fillRect(0, base - R*0.34, W, Math.max(1, R*0.05)); g.fillRect(0, base - R*0.16, W, Math.max(1, R*0.05));
  return cv;
}
const DV_WORN = Array.from({ length:40 }, (_, i) => [10 + ((i*37) % 11)*10 + ((i*13) % 7), 8 + ((i*53) % 9)*6.5, 1.2 + ((i*11) % 5)*0.5]);   // worn patches, the same every time
function dvLine(cam, x0, y0, x1, y1, col, w, dash) {
  ctx.beginPath(); if (!groundSeg(cam, x0, y0, x1, y1, 0)) return;
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]);
}
function dvCircle(cam, x, y, r, col, w, dash) {             // a true circle on the grass, by projection: a large one stays under the men standing on it
  const n = Math.max(20, Math.min(56, Math.round(r*7)));
  ctx.beginPath(); let on = false;
  for (let i = 0; i <= n; i++) { const a = i/n*2*Math.PI, q = pr(cam, x + r*Math.cos(a), y + r*Math.sin(a), 0); if (!q) { on = false; continue; } if (on) ctx.lineTo(q.sx, q.sy); else ctx.moveTo(q.sx, q.sy); on = true; }
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]);
}
function dvGround(cam) {
  const W = V.W, H = V.H, top = Math.max(0, cam.hz), fx = DV.tx, fy = DV.ty;
  if (cam.hz > 0) ctx.drawImage(dvSky(cam.hz), 0, 0, W, cam.hz);
  ctx.fillStyle = DV_GRASS[0]; ctx.fillRect(0, top, W, H - top);
  const c0 = Math.floor((fx + fy)/14)*14, y0 = fy - 60, y1 = fy + 60;   // mown across the field on the diagonal: the pitch's bands run straight
  for (let i = -6; i <= 6; i++) { const a = c0 + i*14, b = a + 7; groundPoly(cam, [a - y0, y0, b - y0, y0, b - y1, y1, a - y1, y1], 0, DV_GRASS[1]); }
  ctx.fillStyle = 'rgba(112,96,44,.09)';
  for (const [x, y, r] of DV_WORN) { const q = pr(cam, x, y, 0); if (!q || q.sx < -40 || q.sx > W + 40 || q.sy < top - 20 || q.sy > H + 20) continue; ellipse(q.sx, q.sy, r*q.k, r*q.k*bvFlat(cam, q.z)); ctx.fill(); }
  ctx.beginPath();                                          // the training grid, faint, every ten metres
  const gx = Math.floor(fx/10)*10, gy = Math.floor(fy/10)*10;
  for (let i = -4; i <= 4; i++) { groundSeg(cam, gx + i*10, gy - 40, gx + i*10, gy + 40, 0); groundSeg(cam, gx - 40, gy + i*10, gx + 40, gy + i*10, 0); }
  ctx.strokeStyle = DV_FAINT; ctx.lineWidth = Math.max(1, 0.05*cam.F/cam.back); ctx.stroke();
}
function dvStage(y0) {                                      // the close-ups' backdrop: the same day on the same field
  const W = V.W, H = V.H;
  ctx.drawImage(dvSky(y0*0.62), 0, 0, W, y0*0.62);
  ctx.fillStyle = DV_GRASS[0]; ctx.fillRect(0, y0*0.62, W, H - y0*0.62);
  ctx.fillStyle = DV_GRASS[1];
  for (let i = -6; i < 12; i += 2) { const a = W*0.5 + i*W*0.11, b = a + W*0.11, f = 0.3, t = y0*0.62; ctx.beginPath(); ctx.moveTo(a, H); ctx.lineTo(b, H); ctx.lineTo(W*0.5 + (b - W*0.5)*f, t); ctx.lineTo(W*0.5 + (a - W*0.5)*f, t); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = 'rgba(250,248,238,.85)'; ctx.fillRect(0, y0 - 1, W, 2);
}

/* ---------- the props: cones, saucers, a flag, tackle bags, a bag of balls, a tee. Each is painted once to a small canvas, then one drawImage a time ---------- */
const DV_SCALE = { cone:1.25, saucer:1.2 };                 // a little larger than life, so they read at a phone's size
const DV_PX = 72;                                           // pixels a metre on the prop pictures
const DV_PAINT = {
  cone(g, K) {
    g.fillStyle = 'rgba(10,30,14,.3)'; g.beginPath(); g.ellipse(0.04*K, 0, 0.34*K, 0.11*K, 0, 0, 7); g.fill();
    const s = g.createLinearGradient(-0.24*K, 0, 0.24*K, 0); s.addColorStop(0, '#ffa04d'); s.addColorStop(0.55, '#ff7a1a'); s.addColorStop(1, '#c9530a');
    g.fillStyle = '#d95f0e'; g.beginPath(); g.ellipse(0, -0.01*K, 0.29*K, 0.09*K, 0, 0, 7); g.fill();
    g.fillStyle = s; g.beginPath(); g.moveTo(-0.23*K, -0.03*K); g.lineTo(-0.045*K, -0.56*K); g.lineTo(0.045*K, -0.56*K); g.lineTo(0.23*K, -0.03*K); g.quadraticCurveTo(0, 0.05*K, -0.23*K, -0.03*K); g.closePath(); g.fill();
    g.fillStyle = '#f7f4ea'; g.beginPath(); g.moveTo(-0.142*K, -0.27*K); g.lineTo(-0.086*K, -0.43*K); g.quadraticCurveTo(0, -0.41*K, 0.086*K, -0.43*K); g.lineTo(0.142*K, -0.27*K); g.quadraticCurveTo(0, -0.235*K, -0.142*K, -0.27*K); g.closePath(); g.fill();
    g.fillStyle = '#ffb877'; g.beginPath(); g.ellipse(0, -0.56*K, 0.045*K, 0.016*K, 0, 0, 7); g.fill();
  },
  saucer(g, K) {
    g.fillStyle = 'rgba(10,30,14,.25)'; g.beginPath(); g.ellipse(0.02*K, 0.01*K, 0.27*K, 0.09*K, 0, 0, 7); g.fill();
    g.fillStyle = '#e8b420'; g.beginPath(); g.ellipse(0, 0, 0.25*K, 0.085*K, 0, 0, 7); g.fill();
    g.fillStyle = '#ffd84d'; g.beginPath(); g.ellipse(0, -0.03*K, 0.2*K, 0.066*K, 0, 0, 7); g.fill();
    g.fillStyle = '#6c8c3c'; g.beginPath(); g.ellipse(0, -0.035*K, 0.06*K, 0.02*K, 0, 0, 7); g.fill();
  },
  flag(g, K) {
    g.fillStyle = 'rgba(10,30,14,.3)'; g.beginPath(); g.ellipse(0.02*K, 0, 0.22*K, 0.07*K, 0, 0, 7); g.fill();
    g.fillStyle = '#f7f4ea'; g.fillRect(-0.035*K, -2.3*K, 0.07*K, 2.3*K);
    g.fillStyle = '#ff7a1a'; g.beginPath(); g.moveTo(0.035*K, -2.3*K); g.lineTo(0.95*K, -2.02*K); g.lineTo(0.035*K, -1.72*K); g.closePath(); g.fill();
    g.fillStyle = '#ffd84d'; g.beginPath(); g.ellipse(0, -2.32*K, 0.07*K, 0.07*K, 0, 0, 7); g.fill();
  },
  bag(g, K) {                                               // a padded tackle bag, stood up: two straps and a darker top
    g.fillStyle = 'rgba(10,30,14,.3)'; g.beginPath(); g.ellipse(0.06*K, 0, 0.42*K, 0.14*K, 0, 0, 7); g.fill();
    const s = g.createLinearGradient(-0.3*K, 0, 0.3*K, 0); s.addColorStop(0, '#39558e'); s.addColorStop(0.45, '#2a4478'); s.addColorStop(1, '#172a50');
    g.fillStyle = s; g.beginPath(); g.moveTo(-0.3*K, -0.03*K); g.lineTo(-0.3*K, -1.3*K); g.quadraticCurveTo(0, -1.46*K, 0.3*K, -1.3*K); g.lineTo(0.3*K, -0.03*K); g.quadraticCurveTo(0, 0.09*K, -0.3*K, -0.03*K); g.closePath(); g.fill();
    g.fillStyle = '#f2efe4'; for (const y of [-0.42, -0.95]) { g.beginPath(); g.moveTo(-0.3*K, y*K - 0.05*K); g.quadraticCurveTo(0, y*K + 0.05*K, 0.3*K, y*K - 0.05*K); g.lineTo(0.3*K, y*K + 0.05*K); g.quadraticCurveTo(0, y*K + 0.15*K, -0.3*K, y*K + 0.05*K); g.closePath(); g.fill(); }
    g.fillStyle = '#4a689f'; g.beginPath(); g.ellipse(0, -1.32*K, 0.3*K, 0.09*K, 0, 0, 7); g.fill();
  },
  balls(g, K) {                                             // a net bag of practice balls
    g.fillStyle = 'rgba(10,30,14,.3)'; g.beginPath(); g.ellipse(0.04*K, 0, 0.56*K, 0.17*K, 0, 0, 7); g.fill();
    const ball = (x, y, a) => { g.save(); g.translate(x*K, y*K); g.rotate(a); g.fillStyle = '#f6f3ea'; g.strokeStyle = '#3b2f22'; g.lineWidth = 0.02*K; g.beginPath(); g.ellipse(0, 0, 0.21*K, 0.13*K, 0, 0, 7); g.fill(); g.stroke(); g.restore(); };
    ball(-0.22, -0.13, -0.2); ball(0.22, -0.13, 0.25); ball(0, -0.28, 0.1); ball(-0.08, -0.45, -0.3); ball(0.14, -0.46, 0.4);
    g.strokeStyle = 'rgba(40,40,44,.55)'; g.lineWidth = 0.014*K;
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i*0.14*K, -0.02*K); g.lineTo(i*0.05*K, -0.72*K); g.stroke(); }
    for (const y of [-0.12, -0.3, -0.48]) { g.beginPath(); g.moveTo(-0.5*K*(1 + y), y*K); g.lineTo(0.5*K*(1 + y), y*K); g.stroke(); }
    g.fillStyle = '#ffcf3d'; g.fillRect(-0.09*K, -0.78*K, 0.18*K, 0.06*K);
  },
  tee(g, K) {                                               // a kicking tee: a low yellow cup
    g.fillStyle = 'rgba(10,30,14,.28)'; g.beginPath(); g.ellipse(0, 0.01*K, 0.2*K, 0.06*K, 0, 0, 7); g.fill();
    g.fillStyle = '#e9b81c'; g.beginPath(); g.moveTo(-0.15*K, 0); g.lineTo(-0.07*K, -0.12*K); g.lineTo(0.07*K, -0.12*K); g.lineTo(0.15*K, 0); g.quadraticCurveTo(0, 0.05*K, -0.15*K, 0); g.closePath(); g.fill();
    g.fillStyle = '#ffd84d'; g.beginPath(); g.ellipse(0, -0.12*K, 0.075*K, 0.025*K, 0, 0, 7); g.fill();
  },
};
const DV_BOX = { cone:[0.75, 0.7], saucer:[0.7, 0.2], flag:[2.1, 2.5], bag:[1, 1.55], balls:[1.3, 0.95], tee:[0.45, 0.22] };   // the picture's width and height over the ground, in metres
function dvPropPic(name) {
  let p = DV.props[name];
  if (p) return p;
  const [w, h] = DV_BOX[name], cv = document.createElement('canvas'), low = 0.2;
  cv.width = Math.ceil(w*DV_PX); cv.height = Math.ceil((h + low)*DV_PX);
  const g = cv.getContext('2d'), ox = name === 'flag' ? 0.3 : w/2;
  g.translate(ox*DV_PX, h*DV_PX);
  DV_PAINT[name](g, DV_PX);
  p = DV.props[name] = { cv, w, h:h + low, ox, oy:h };
  return p;
}
function dvProp(cam, name, x, y, s) {                       // stood on the grass at x, y, sized by its depth
  const q = pr(cam, x, y, 0);
  if (!q) return;
  const p = dvPropPic(name), k = q.k*(s || DV_SCALE[name] || 1);
  if (q.sx < -p.w*k || q.sx > V.W + p.w*k || q.sy < -2 || q.sy > V.H + p.h*k) return;
  ctx.drawImage(p.cv, q.sx - p.ox*k, q.sy - p.oy*k, p.w*k, p.h*k);
}
function dvPropAt(name, x, y, k) { const p = dvPropPic(name); ctx.drawImage(p.cv, x - p.ox*k, y - p.oy*k, p.w*k, p.h*k); }   // the same picture at a screen point: the kick's tee

/* ---------- each game's own markings and props ---------- */
const DV_FLAT = { egg:1, cones:1, circle:1 };
const DV_DRAW = {
  tag:{
    ground(cam) {                                           // a channel with a line to run for
      const T = practice.tag, K = DRILL_TAG, B = K.box, Q = K[tagMode(T)], w = Math.max(1.5, 0.08*cam.F/cam.back);
      for (const y of [B[1], B[3]]) dvLine(cam, B[0] - 6, y, B[2] + 6, y, 'rgba(250,248,238,.55)', w, [6, 5]);
      dvLine(cam, Q.line, B[1], Q.line, B[3], DV_CHALK, w*1.8);
      if (tagMode(T) === 'pull' && T.stage === 'play' && tagCanPull(T)) groundRing(cam, T.them.x, T.them.y, 1.0, DV_GOLD, 3);
      if (tagMode(T) === 'keep' && T.lunge) groundRing(cam, T.them.x, T.them.y, 1.2, DV_RED, 3);   // they have gone: the moment to change direction
    },
    props() { const K = DRILL_TAG, B = K.box, out = []; for (let x = B[0]; x <= B[2]; x += 8) out.push(['saucer', x, B[1]], ['saucer', x, B[3]]); out.push(['balls', 40, 24]); return out; },
    under(cam, p) { dvTagFar(cam, p); },
    over(cam, p) { dvTagNear(cam, p); },
    pose(cam, p, s) {
      const T = practice.tag, keep = tagMode(T) === 'keep';
      if (p === T.them && keep && T.lunge) return dvFace(cam, p, s, 'reach', 0, T.me);            // arms out, going for your hip
      if (p === T.them && keep && T.lost === 'me') return dvFace(cam, p, s, 'reach', 1, T.me);    // and your tag held up
      if (p === T.me && !keep && T.lost === 'them') return dvFace(cam, p, s, 'reach', 1, T.them); // their tag held up
      if (p === T.me && !keep && T.stage === 'play' && tagCanPull(T)) return dvFace(cam, p, s, 'reach', 0, T.them);
      return null;
    },
    tick() {                                                // a dodge plays the Side Step: render-only
      const T = practice.tag, m = T.me;
      if (tagMode(T) === 'keep' && T.lunge && !T.stepShown && Math.abs(m.vy) > 2) { T.stepShown = T.rep; artStepped(m, Math.sign(m.vy)); }
      if (!T.lunge && T.stepShown !== T.rep) T.stepShown = 0;
    },
  },
  egg:{
    ground(cam) {                                           // the thrower's spot, the box you may run in, a line of cones six metres out; and the same closing ring whatever is coming
      const E = practice.egg, K = DRILL_EGG, B = K.box, w = Math.max(1.5, 0.07*cam.F/cam.back);
      if (!E) return;
      dvLine(cam, B[0], B[1], B[2], B[1], 'rgba(250,248,238,.5)', w, [7, 6]); dvLine(cam, B[2], B[1], B[2], B[3], 'rgba(250,248,238,.5)', w, [7, 6]);
      dvLine(cam, B[2], B[3], B[0], B[3], 'rgba(250,248,238,.5)', w, [7, 6]);
      groundRing(cam, K.from[0], K.from[1], 0.75, 'rgba(250,248,238,.75)', 2);
      if (E.stage === 'wind') { const u = clamp(E.t/E.wind, 0, 1); dvCircle(cam, E.tw.x, E.tw.y, 2.4 - 1.4*u, `rgba(255,255,255,${(0.45 + 0.5*u).toFixed(3)})`, 2.5); }
      if (E.stage === 'fly' && E.aim) {                     // where the ball comes down, at release and again after every hop: a ring the size of your reach, and its centre
        const lw = Math.max(2.5, 0.14*cam.F/cam.back);
        dvCircle(cam, E.aim.x, E.aim.y, K.reach, DV_GOLD, lw);
        dvCircle(cam, E.aim.x, E.aim.y, 0.18, DV_GOLD, lw);
      }
    },
    props() { const B = DRILL_EGG.box, out = []; for (let i = 0; i < 5; i++) out.push(['cone', B[0] - 0.7, drillLerp(B[1] + 2, B[3] - 2, i/4)]); out.push(['balls', 42, 28]); return out; },
    pose(cam, p, s) {
      const E = practice.egg, b = M.ball;
      if (p === E.tw) {
        if (E.stage === 'wind') return dvFace(cam, p, s, 'carryidle', 0, E.me);
        if (E.stage === 'fly' && E.t < 0.26) return dvFace(cam, p, s, 'pass', E.t < 0.06 ? 0 : E.t < 0.15 ? 1 : 2, E.me);
        return null;
      }
      if (p === E.me && E.stage === 'fly' && dist(p, b) < 3 && (hyp(p.vx, p.vy) < 2.5 || dist(p, b) < 1.6)) return dvFace(cam, p, s, 'catch', b.z > 2 ? 1 : 0, b);   // hands up to take it
      return null;
    },
    after(cam, dt) { dvEggFx(cam, dt); },
  },
  circle:{
    ground(cam) {
      const C = practice.circle, K = DRILL_CIRCLE; if (!C) return;
      const R = dvCircleR(C), home = circleSpot(0, R), w = Math.max(1.6, 0.09*cam.F/cam.back);
      dvCircle(cam, K.at[0], K.at[1], R, 'rgba(250,248,238,.3)', w*0.8);                 // the ring the ball goes round
      dvCircle(cam, K.at[0], K.at[1], R + K.out, 'rgba(250,248,238,.72)', w, [7, 6]);    // the runner's track
      dvCircle(cam, home.x, home.y, 0.95, DV_GOLD, w*1.3);                               // home
      if (C.stage === 'start') {                           // the first pass: the white ring closes on the gold over and over until you tap
        const e = circleStartE(C), r = e < 0 ? 0.95 + 1.8*clamp(-e/(K.beat/2), 0, 1) : Math.max(0.35, 0.95 - 1.3*e);
        dvCircle(cam, home.x, home.y, r, Math.abs(e) <= K.ok ? 'rgba(255,207,61,1)' : 'rgba(255,255,255,.95)', w*1.1);
      }
      if (C.role === 'runner' && C.stage === 'race' && !C.home) {   // the way round: the stick goes the way this arrow goes
        const A = circleRunAt(C.R, C.s + 1), B = circleRunAt(C.R, C.s + 2.4), a = pr(cam, A.x, A.y, 0), b = pr(cam, B.x, B.y, 0);
        if (a && b) { const dx = b.sx - a.sx, dy = b.sy - a.sy, m = hyp(dx, dy) || 1, ux = dx/m, uy = dy/m, s = Math.min(9, m*0.5); ctx.save(); ctx.strokeStyle = DV_GOLD; ctx.lineWidth = w*1.3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.moveTo(b.sx - ux*s - uy*s*0.7, b.sy - uy*s + ux*s*0.7); ctx.lineTo(b.sx, b.sy); ctx.lineTo(b.sx - ux*s + uy*s*0.7, b.sy - uy*s - ux*s*0.7); ctx.stroke(); ctx.restore(); }
      }
      if (C.role === 'passer' && C.hold && C.stage === 'race') {   // the timing: the white ring closes on the gold one; tap as they meet
        const H = C.hold, p = C.men[H.i], e = H.t - H.tc, r = e < 0 ? 1.0 + 1.8*clamp(-e/K.ready, 0, 1) : Math.max(0.35, 1.0 - 1.3*e);
        dvCircle(cam, p.x, p.y, 1.0, DV_GOLD, w*1.3);
        dvCircle(cam, p.x, p.y, r, Math.abs(e) <= K.perfect ? 'rgba(255,207,61,1)' : 'rgba(255,255,255,.95)', w*1.1);
      }
    },
    spots(cam) { const C = practice.circle; if (!C) return; const R = dvCircleR(C); for (let i = 1; i < DRILL_CIRCLE.n; i++) { const s = circleSpot(i, R); dvProp(cam, 'saucer', s.x, s.y); } },
    props() { return [['balls', 75, 25], ['cone', 76.5, 44], ['cone', 44, 44], ['cone', 44, 25]]; },
    pose(cam, p, s) {
      const C = practice.circle, f = C.fly, i = C.men.indexOf(p);
      if (i < 0 || (i === 0 && C.stage === 'race' && !C.home)) return null;                 // the runner runs
      if (f && f.to === i) return dvFace(cam, p, s, 'catch', 0, M.ball);                    // hands out at the chest
      if (f && f.from === i && f.t < 0.25) return dvFace(cam, p, s, 'pass', f.t < 0.05 ? 0 : f.t < 0.14 ? 1 : 2, C.men[f.to]);
      return null;
    },
  },
  cones:{
    ground(cam) {
      const Q = practice.cones, K = DRILL_CONES; if (!Q) return;
      const w = Math.max(1.3, 0.07*cam.F/cam.back);
      ctx.beginPath();                                      // the route, in chalk
      let [px, py] = K.start, go = (x, y) => { groundSeg(cam, px, py, x, y, 0); px = x; py = y; };
      for (let i = 0; i < K.out; i++) go(K.gates[i][0], K.gates[i][1]);
      go(K.turn[0] + 2.2, K.turn[1] - 4); go(K.turn[0] + 2.2, K.turn[1] + 2); go(K.gates[K.out][0], K.gates[K.out][1]);
      for (let i = K.out + 1; i < K.gates.length; i++) go(K.gates[i][0], K.gates[i][1]);
      go(K.line - 1, K.gates[K.gates.length - 1][1]);
      ctx.strokeStyle = 'rgba(250,248,238,.55)'; ctx.lineWidth = w; ctx.setLineDash([6, 7]); ctx.stroke(); ctx.setLineDash([]);
      dvLine(cam, K.startLine, K.start[1] - 5, K.startLine, K.start[1] + 5, DV_CHALK, w*2);   // start
      const fin = K.gates[K.gates.length - 1][1] - 5;       // the chequered finish, across the way home
      for (let i = 0; i < 10; i++) groundPoly(cam, [K.line - 0.5, fin + i, K.line + 0.5, fin + i, K.line + 0.5, fin + i + 1, K.line - 0.5, fin + i + 1], 0, i % 2 ? '#f6f3e8' : '#16160f');
      const next = Q.pass.findIndex(v => !v);
      for (const c of Q.cones) {                            // gold for the next gate, green cleared, red missed: rings on the grass
        if (c.g < 0) continue;
        const v = Q.pass[c.g], col = v > 0 ? DV_GREEN : v < 0 ? DV_RED : c.g === next && (c.g < K.out || Q.turned) ? DV_GOLD : null;
        if (col) groundRing(cam, c.x, c.y, 0.62, col, 2.5);
      }
      if (!Q.turned) groundRing(cam, K.turn[0], K.turn[1], 1.0, DV_GOLD, 3);
      if (next >= 0 && (next < K.out || Q.turned)) bvChevron(cam, { x:K.gates[next][0], y:K.gates[next][1] }, DV_GOLD);   // the next gate, off the frame
      else if (!Q.turned) bvChevron(cam, { x:K.turn[0], y:K.turn[1] }, DV_GOLD);
      else bvChevron(cam, { x:K.line, y:K.gates[K.gates.length - 1][1] }, '#f6f3e8');
    },
    props() { const Q = practice.cones, K = DRILL_CONES, out = []; for (const c of Q.cones) if (c.g >= 0) out.push(['cone', c.x, c.y]); out.push(['flag', K.turn[0], K.turn[1]], ['balls', 18, 26]); return out; },
  },
  tackle:{
    ground(cam) {                                           // their path, green under you when you are in it, and a gold ring once your feet are set
      const T = practice.tackle, K = DRILL_TACKLE; if (!T || (T.stage !== 'approach' && T.stage !== 'past')) return;
      const me = T.me, inLine = Math.abs(me.y - T.lane) <= K.inLine, w = Math.max(2, 0.1*cam.F/cam.back);
      dvLine(cam, T.ru.x - 0.8, T.lane, K.box[0], T.lane, inLine ? DV_GREEN : 'rgba(250,248,238,.6)', w, [10, 8]);
      if (inLine && hyp(me.vx, me.vy) <= K.still) groundRing(cam, me.x, me.y, 1.35, DV_GOLD, 3);
    },
    props() { return [['bag', 72, 25], ['bag', 74.5, 26], ['bag', 77, 25], ['bag', 72, 45], ['bag', 74.5, 44], ['balls', 62, 24], ['saucer', 52, 28], ['saucer', 52, 42]]; },
    pose(cam, p, s) {
      const T = practice.tackle;
      if (p === T.me && T.stage === 'approach' && Math.abs(p.y - T.lane) <= DRILL_TACKLE.inLine && hyp(p.vx, p.vy) <= DRILL_TACKLE.still) return dvFace(cam, p, s, 'crouch', 1, T.ru);   // set: low, hands up, looking at them
      return null;
    },
  },
  pass:{
    ground(cam) {                                           // the line to score on, and how close the defender has to be: the ball leaving your hands in here is what draws them
      const w = Math.max(2, 0.12*cam.F/cam.back), def = M.players.find(p => p.team === 1), me = ctrlOf(0);
      dvLine(cam, 110, 12, 110, 58, DV_CHALK, w);
      if (def && M.stats.passes === 0) { const inside = me && dist(me, def) <= DRILL_QUICK.draw; dvCircle(cam, def.x, def.y, DRILL_QUICK.draw, inside ? DV_GOLD : 'rgba(250,248,238,.55)', Math.max(1.5, w*0.6), inside ? null : [7, 6]); }
    },
    props() { return [['flag', 110, 22], ['flag', 110, 50], ['cone', 110, 29], ['cone', 110, 36], ['cone', 110, 43], ['balls', 70, 24]]; },
  },
  defend:{
    ground(cam) {                                           // where the runner is heading
      const b = M.ball, c = b.state === 'held' ? b.carrier : null;
      if (c && c.team === 1) dvLine(cam, c.x, c.y, c.x - 14, c.y, 'rgba(250,248,238,.5)', Math.max(1.5, 0.08*cam.F/cam.back), [7, 6]);
    },
    props() { return [['bag', 30, 22], ['bag', 33, 23], ['balls', 56, 24], ['cone', 24, 28], ['cone', 24, 42], ['cone', 44, 28], ['cone', 44, 42]]; },
  },
};
/* a man's hip tags: two ribbons from a belt, the far one behind him and the near one in front */
function dvTagPoints(cam, p) {
  const s = bvMan(p), m = hyp(p.fx, p.fy) || 1, fx = p.fx/m, fy = p.fy/m, sc = lookOf(p).h/1.8, sp = hyp(p.vx, p.vy), hip = 0.93*sc;
  const pts = [-1, 1].map(side => {
    const wx = s.wx - fy*side*0.3, wy = s.wy + fx*side*0.3, z = (wx - cam.Cx)*cam.u.x + (wy - cam.Cy)*cam.u.y, tail = Math.min(0.45, sp*0.06);
    return { z, side, a:pr(cam, wx, wy, hip), b:pr(cam, wx - fx*tail, wy - fy*tail, hip - 0.56 + tail*0.4), m:pr(cam, wx - fx*tail*0.4, wy - fy*tail*0.4, hip - 0.26) };
  });
  return pts.sort((u, v) => v.z - u.z);                     // far first
}
function dvTagRibbon(q, col) {
  if (!q.a || !q.b || !q.m) return;
  const w = Math.max(3, 0.14*q.a.k);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(8,14,10,.75)'; ctx.lineWidth = w + 1.6; ctx.beginPath(); ctx.moveTo(q.a.sx, q.a.sy); ctx.quadraticCurveTo(q.m.sx, q.m.sy, q.b.sx, q.b.sy); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(q.a.sx, q.a.sy); ctx.quadraticCurveTo(q.m.sx, q.m.sy, q.b.sx, q.b.sy); ctx.stroke();
}
function dvTagOf(p) { const T = practice.tag; return p === T.me ? { col:'#62d6ff', gone:T.lost === 'me' } : p === T.them ? { col:'#c8ff3d', gone:T.lost === 'them' } : null; }
function dvTagFar(cam, p) { const t = dvTagOf(p); if (!t || t.gone) return; dvTagRibbon(dvTagPoints(cam, p)[0], t.col); }
function dvTagNear(cam, p) {
  const t = dvTagOf(p); if (!t) return;
  const pts = dvTagPoints(cam, p);
  if (pts[0].a && pts[1].a) { ctx.strokeStyle = t.col; ctx.lineWidth = Math.max(2, 0.07*pts[0].a.k); ctx.lineCap = 'round'; seg(pts[0].a.sx, pts[0].a.sy, pts[1].a.sx, pts[1].a.sy); }   // the belt
  dvTagRibbon(pts[1], t.col);
  const T = practice.tag;
  if (T.stage === 'show' && T.lost && p === (T.lost === 'me' ? T.them : T.me)) {           // the pulled tag, held up
    const s = bvMan(p), q = pr(cam, s.wx, s.wy, lookOf(p).h + 0.34);
    if (q) { ctx.strokeStyle = 'rgba(8,14,10,.75)'; ctx.lineWidth = 6; seg(q.sx, q.sy, q.sx + 3, q.sy + 0.44*q.k); ctx.strokeStyle = T.lost === 'me' ? '#62d6ff' : '#c8ff3d'; ctx.lineWidth = 3.4; seg(q.sx, q.sy, q.sx + 3, q.sy + 0.44*q.k); }
  }
}
/* Bouncy Egg: what makes a hop read. A line of chalk dots behind the ball shows the arc, a stem to its shadow shows the height, and a puff shows each landing */
function dvEggFx(cam, dt) {
  const E = practice.egg, b = M.ball; if (!E) return;
  let F = DV.egg;
  if (!F || F.E !== E || F.n !== E.n) F = DV.egg = { E, n:E.n, hops:0, trail:[], puffs:[], up:false };
  const flying = E.stage === 'fly' || E.stage === 'missed';
  if (flying) {
    const last = F.trail[F.trail.length - 1];
    if (!last || hyp(b.x - last[0], b.y - last[1]) + Math.abs(b.z - last[2]) > 0.32) { F.trail.push([b.x, b.y, b.z]); if (F.trail.length > 26) F.trail.shift(); }
    if (b.z <= 0.02 && F.up) { F.up = false; F.puffs.push({ x:b.x, y:b.y, t:0 }); if (F.puffs.length > 4) F.puffs.shift(); }
    if (b.z > 0.12) F.up = true;
  } else if (F.trail.length && E.stage === 'caught') F.trail.length = 0;
  for (let i = 0; i < F.trail.length; i++) {
    const t = F.trail[i], q = pr(cam, t[0], t[1], t[2]);
    if (!q) continue;
    ctx.fillStyle = `rgba(255,255,255,${(0.14 + 0.62*i/F.trail.length).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(q.sx, q.sy, Math.max(1.4, 0.055*q.k*(0.6 + 0.6*i/F.trail.length)), 0, 7); ctx.fill();
  }
  for (const f of F.puffs) {
    const q = pr(cam, f.x, f.y, 0), u = clamp(f.t/0.32, 0, 1);
    f.t += dt;
    if (!q || u >= 1) continue;
    const r = (0.3 + 0.75*u)*q.k, fl = bvFlat(cam, q.z);
    ctx.strokeStyle = `rgba(255,250,225,${(0.9*(1 - u)).toFixed(3)})`; ctx.lineWidth = Math.max(1.5, 3*(1 - u));
    ellipse(q.sx, q.sy, r, r*fl); ctx.stroke();
    ctx.fillStyle = `rgba(214,190,120,${(0.8*(1 - u)).toFixed(3)})`;
    for (let i = 0; i < 6; i++) { const a = i*Math.PI/3 + 0.4; ctx.beginPath(); ctx.arc(q.sx + Math.cos(a)*r*0.8, q.sy + Math.sin(a)*r*0.8*fl - 7*u*(1 - u)*4, Math.max(1, 0.05*q.k), 0, 7); ctx.fill(); }
  }
}
function dvBall(cam) {                                      // a ball that is not in anyone's hands: bigger than a match's, tumbling if it tumbles, with a stem down to its shadow while it is up
  const b = M.ball;
  if (b.state === 'held') return;
  if (b.state === 'air' && b.f && b.f.kind !== 'pass') groundRing(cam, b.f.x1, b.f.y1, BV_RING*1.3, 'rgba(255,255,255,.85)', 2, [4, 3]);
  const z = Math.max(0, b.z), q = pr(cam, b.x, b.y, z), sh = pr(cam, b.x, b.y, 0);
  if (!q || q.sx < -30 || q.sx > V.W + 30) return;
  if (sh) {
    const g = 1/(1 + z*0.2), fl = bvFlat(cam, sh.z);
    ctx.fillStyle = 'rgba(6,20,8,.5)'; ellipse(sh.sx, sh.sy, Math.max(4, 0.26*sh.k)*g, Math.max(2, 0.26*sh.k*fl)*g); ctx.fill();
    if (z > 0.3) { ctx.strokeStyle = 'rgba(255,255,255,.42)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); seg(q.sx, q.sy, sh.sx, sh.sy); ctx.setLineDash([]); }
  }
  const across = b.vx*cam.r.x + b.vy*cam.r.y, along = b.vx*cam.u.x + b.vy*cam.u.y, tum = b.tumble != null ? b.tumble : null;
  const rx = Math.max(6, 0.24*q.k), len = tum == null ? 1 : 0.62 + 0.38*Math.abs(Math.cos(tum));
  let ang = hyp(across, along) > 0.5 ? Math.atan2(-along*bvFlat(cam, q.z) - (b.vz || 0)*0.6, across) : 0;
  if (tum != null) ang += tum*0.5;
  ctx.save(); ctx.translate(q.sx, q.sy); ctx.rotate(ang);
  ctx.fillStyle = '#fbf8ef'; ctx.strokeStyle = '#3b2f22'; ctx.lineWidth = 1.5;
  ellipse(0, 0, rx*len, rx*0.64); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(200,50,30,.8)'; ctx.lineWidth = Math.max(1, rx*0.14); ctx.beginPath(); ctx.moveTo(-rx*0.5*len, 0); ctx.lineTo(rx*0.5*len, 0); ctx.stroke();
  ctx.restore();
}

/* ---------- the men ---------- */
function dvFace(cam, p, s, clip, frame, at) {               // a Training Ground picture for this man, turned towards at. Eight-way clips flip to whichever side the thing is on
  const dx = at.x - s.wx, dy = at.y - s.wy, m = hyp(dx, dy) || 1, fu = (dx*cam.u.x + dy*cam.u.y)/m, fr = (dx*cam.r.x + dy*cam.r.y)/m, d8 = artFacing(s, fu, fr);
  return artSprite(clip, frame, d8, false, lookOf(p));
}
function dvPose(cam, p, s) { const d = DV_DRAW[practice.id]; return d && d.pose ? d.pose(cam, p, s) : null; }
function dvPropList(cam) {                                  // this game's props, far to near: the order never changes, because the lens doesn't turn
  const d = DV_DRAW[practice.id];
  if (!d || !d.props) return [];
  if (!practice.dvProps) practice.dvProps = d.props().sort((a, b) => (b[1]*cam.u.x + b[2]*cam.u.y) - (a[1]*cam.u.x + a[2]*cam.u.y));
  return practice.dvProps;
}
function dvMen(cam, ctrl, dt) {                             // far to near, the props among them
  const d = DV_DRAW[practice.id] || {}, list = dvPropList(cam);
  if (d.tick) d.tick();
  let n = 0;
  const propsTo = z => { while (n < list.length) { const it = list[n], pz = (it[1] - cam.Cx)*cam.u.x + (it[2] - cam.Cy)*cam.u.y; if (pz < z) break; dvProp(cam, it[0], it[1], it[2]); n++; } };
  for (const p of BV.order) {
    propsTo(bvMan(p).z);
    if (d.under) d.under(cam, p);
    drawManBehind(cam, p, ctrl);
    if (d.over) d.over(cam, p);
  }
  propsTo(-1e9);
}
function dvManAt(x, y, k, p, clip, frame, d8, flip, ang) {  // a rendered man on a close-up, in the art's own drawing, feet at x, y. False when the art isn't in: the close-up draws its code-drawn man instead
  if (!artReady() || !p) return false;
  return !!artDraw({ sx:x, sy:y }, p, bvMan(p), k/DV_SQUASH, 1, ang || 0, artSprite(clip, frame, d8, !!flip, lookOf(p)), true);
}
const DV_BALL = 0.8;                                        // a close-up's ball, for cutBall: a real one's size beside a man
const DV_SQUASH = 0.91;                                     // the art looks down at the Mid camera's tilt, so a man stands this much shorter on the sheet than his height: a close-up takes it back, so its height bands stay true
function dvHeld(x, y, k, p) {                               // the ball in the hands of the picture just drawn by dvManAt, as the art holds it
  const pose = ART_OUT, q = (k/DV_SQUASH)/ART.man.px, m = pose.mirror ? -1 : 1, look = lookOf(p);
  if (pose.row.length <= 12) return false;
  cutBall(x + m*pose.row[12]*q*look.b/ART.man.builds[pose.build], y + pose.row[13]*q, k*DV_BALL, pose.deg === 90 ? 0.2*m : pose.deg === 0 || pose.deg === 180 ? 1.25 : 0.7*m);
  return true;
}
function dvKicker(it, g, P, tf) {                           // Kicking: the rendered kicker, from behind. The run-up, the plant, the strike and the follow-through
  const p = g.kicker || M.players[0];
  let clip = 'idle', frame = 0;
  if (tf >= 0) { if (tf < 0.45) { clip = 'kick'; frame = tf < 0.06 ? 1 : 2; } }
  else if (P.leg > 0.5) { clip = 'kick'; frame = 1; }
  else if (P.leg > 0) { clip = 'kick'; frame = 0; }
  else if (P.stride > 0) { clip = 'run'; frame = Math.floor(P.stride/1.6) & 7; }
  else if (P.held) { clip = 'carryidle'; }
  return dvManAt(it.sx, it.sy, it.k, p, clip, frame, 0);
}
function dvScrumMan(team, i, x, y, s, f, t, engaged) {      // Driving: a rendered pack, side on. Down and ready, then low with the head and shoulders up, driving off each foot in turn
  const row = M.players.filter(p => p.team === team), p = row[i];
  return dvManAt(x, y, s, p, 'bind', !engaged ? 0 : 1 + (Math.floor(t*(5 + i)) & 1), f > 0 ? 2 : 6);
}
function dvKickField(cam, g, hz, W, H, tilt) {              // the goal-kick close-up on the training field: daylight, the mown grass and one chalk line to the posts. No stands and no touch judges
  if (hz > 0) ctx.drawImage(dvSky(Math.max(20, hz + tilt + 8)), 0, -tilt - 8, W, Math.max(20, hz + tilt + 8));
  ctx.fillStyle = DV_GRASS[0]; ctx.fillRect(0, hz, W, H - hz + tilt + 8);
  for (let x = 40; x < 130; x += 6) groundPoly(cam, [x, -60, x + 3, -60, x + 3, 130, x, 130], 0, DV_GRASS[1]);   // mown across the line of the kick
  ctx.strokeStyle = C.line;
  groundLine(cam, 110, 5, 110, 65, false);
  groundLine(cam, g.x - 0.25, g.y, g.x + 0.25, g.y, false); groundLine(cam, g.x, g.y - 0.25, g.x, g.y + 0.25, false);   // the mark
}
function dvTee(cam, g) { const q = pr(cam, g.x, g.y, 0); if (q && q.z >= 0.8) dvPropAt('tee', q.sx, q.sy, q.k*1.5); }
