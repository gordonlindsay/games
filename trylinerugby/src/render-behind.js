/* =========================================================
   The behind views: a 2.5D camera for one-player matches (Low, Mid, High), and Mid is where a new game starts. Top is still there, through its own code: render
   returns here only when behindOn(), and toS's one extra line issues no canvas call. Fixed height and pitch, no yaw, roll, bob or shake:
   only depth and a little lateral follow. Up on the stick is always toward the opposition's line. Nothing here draws a random number.
   ========================================================= */
settings.cam = 2;                                           // 0 Top, 1 Low, 2 Mid, 3 High. The default: load() runs later, and a save holding a cam keeps it (cleanSettings: a Top only if the camera button chose it)
const BV_PRESET = [null, { ch:7.5, back:19, fy:0.60 }, { ch:10, back:22, fy:0.58 }, { ch:13, back:25, fy:0.58 }];
const BV_TIERS = [28, 64];                                  // sprite cells, in device pixels per metre
const BV_CELL = { stand:{ w:1.4, h:2.3, ox:0.7, oy:2.1 }, lying:{ w:2.6, h:1.2, ox:0.6, oy:0.7 } };   // in T, with the feet at ox, oy: 0.1T clear of the tallest head style
const BV_RING = 0.6;                                        // the ring's base radius in metres: a top-down ring's radius would swallow a standing man
const BV = { on:false, cam:null, M:null, rt:0, tx:0, ty:0, order:[], cells:[], edges:[], men:new WeakMap(), bakes:0, baked:0, star:null, fontsReady:false, fontsArmed:false, fade:1 };
const behindOn = () => settings.cam > 0 && playing() && !M.two && !M.auto && !practice;
function stickTurn(seat) {                                  // the direction of the team this seat plays: 0 means the stick is read as it always was
  if (!behindOn()) return seat === 0 ? dvTurn() : 0;         // a Training Ground game may have a behind view of its own
  const t = teamOfSeat(seat);
  return t < 0 ? 0 : dirOf(t);
}
function keyFwd(inp, k) { const t = stickTurn(inp.seat); return t ? -k[1]*t : k[0]; }   // a direction key's pull along the pitch
const dprMax = () => (behindOn() || dvOn() || menuDemo() ? 1.5 : 2);
/* The demo behind the menus: the rendered men on Mid, whatever camera the player chose. It reads nothing saved and writes nothing saved, and the stick and behindOn() don't know about it. */
const BV_DEMO_CAM = 2, BV_DEMO_IN = 0.6;                    // the men fade in over this long once the art is in; until then, a calm empty pitch
const menuDemo = () => !!(M && M.demo) && !practice;
const BV_DEMO_PEEK = 2500, BV_DEMO_TOP = { ch:34, back:15, fy:0.5 };   // how long a Camera press on the home shows its height (ms); Top's look in that peek, drawn with the demo's own men
const bvPick = () => (menuDemo() ? (BV.peekUntil && performance.now() < BV.peekUntil ? settings.cam : BV_DEMO_CAM) : settings.cam);
const BV_DEMO_AT = { x:0.33, y:0.42 };                      // a phone held sideways: Mid's height and distance, with the ball framed in the gap the home's two columns leave, where a man is clear of the panels
const bvDemoFrame = (W, H) => (menuDemo() && W > H && H <= 560 ? BV_DEMO_AT : null);

/* ---------- camera and follow ---------- */
function bvRelease() {                                      // the sprites die with their match, whichever view comes next
  if (!practice) dvFree();                                   // the Training Ground's painted backdrops go as soon as it is left
  if (!BV.M || BV.M === M) return;
  for (const c of BV.cells) c.width = 0;
  BV.cells.length = 0; BV.men = new WeakMap(); BV.order.length = 0; BV.M = null;
  artClear();
  if (M.demo) artTrim();
}
function bvCam() {
  const W = V.W, H = V.H, t = teamOfSeat(0), d = t < 0 ? 1 : dirOf(t), pick = bvPick(), at = bvDemoFrame(W, H), key = W + 'x' + H + 'x' + pick + 'x' + d + (at ? 'd' : '');
  if (BV.cam && BV.cam.key === key) return BV.cam;
  const P = BV_PRESET[pick] || BV_DEMO_TOP, F = Math.min(0.703*W, 1.25*H);
  BV.cam = { key, W, H, ins:safeInsets(), cx:at ? at.x*W : W/2, F, ch:P.ch, back:P.back, hz:(at ? at.y : P.fy)*H - F*P.ch/P.back, u:{ x:d, y:0 }, r:{ x:0, y:d }, Cx:BV.cam ? BV.cam.Cx : 60, Cy:BV.cam ? BV.cam.Cy : 35 };
  return BV.cam;
}
function bvFollow(dt) {
  const cam = bvCam(), d = cam.u.x, b = M.ball, t = teamOfSeat(0), ctrl = t < 0 ? null : ctrlOf(t);
  let ax = b.x;                                             // depth: the rearmost of the ring man, the ball and where an opposition kick comes down
  if (ctrl && ctrl.x*d < ax*d) ax = ctrl.x;
  if (b.state === 'air' && b.f && b.f.kind !== 'pass' && b.f.team !== t && b.f.x1*d < ax*d) ax = b.f.x1;
  const ref = ctrl || b;
  let ly = ref.y + (35 - ref.y)*0.25;
  if (BV.M !== M || M.rt - BV.rt > dt + 1e-6) { BV.M = M; BV.tx = ax; BV.ty = ly; }   // a new match, or back from Top: no glide across the pitch
  BV.rt = M.rt;
  if (Math.abs(ax - BV.tx) > 25) BV.tx = ax;                // a long jump (a restart) is a cut, not a pan
  else BV.tx += clamp((ax - BV.tx)*Math.min(1, dt*4), -14*dt, 14*dt);
  const off = ly - BV.ty;
  if (Math.abs(off) > 25) BV.ty = ly;
  else if (Math.abs(off) > 1) BV.ty += clamp((off - Math.sign(off))*Math.min(1, dt*3), -14*dt, 14*dt);   // a 1m dead band: small steers leave the frame alone
  cam.Cx = clamp(BV.tx - cam.back*d, -24, 144); cam.Cy = clamp(BV.ty, 6, 64);
  return cam;
}
function bvS(x, y) {                                        // toS in a behind view. Behind the lens is off the bottom edge, which is where he really is
  const q = pr(BV.cam, x, y, 0);
  return q ? [q.sx, q.sy] : [V.W/2, V.H + 999];
}

/* ---------- the pitch ---------- */
function drawPitchBehind(cam) {
  const W = V.W, H = V.H;
  ctx.fillStyle = C.surround; ctx.fillRect(0, 0, W, H);
  if (cam.hz > 0) {
    ctx.fillStyle = '#0a1210'; ctx.fillRect(0, 0, W, cam.hz);
    ctx.fillStyle = C.board; ctx.fillRect(0, cam.hz - H*0.025, W, H*0.025);
  }
  for (let i = 0; i < 12; i++) groundPoly(cam, BANDS[i], 0, i % 2 ? C.grassA : C.grassB);
  ctx.globalAlpha = 0.14;
  groundPoly(cam, BANDS[0], 0, M.kit[0].fill); groundPoly(cam, BANDS[11], 0, M.kit[1].fill);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = C.line;
  const far = 34, zOf = x => (x - cam.Cx)*cam.u.x;          // past here dashes would only crawl, so lines run solid
  for (const y of [0, 70]) groundLine(cam, 0, y, 120, y, false);
  for (const x of [0, 120, 10, 110, 32, 88, 60]) groundLine(cam, x, 0, x, 70, false);
  for (const x of [50, 70, 15, 105]) groundLine(cam, x, 0, x, 70, zOf(x) < far);
  groundLine(cam, 59, 35, 61, 35, false);
  // the 5m and 15m channels: 1m on, 4m off near the camera, on the pitch's own grid from x=10 as drawPitch paints them, one solid run past that
  const d = cam.u.x, lo = Math.max(10, Math.min(110, cam.Cx + d*3)), hi = Math.max(10, Math.min(110, cam.Cx + d*far));
  const a = 10 + 5*Math.ceil((Math.min(lo, hi) - 10)/5), e = d > 0 ? 10 + 5*Math.floor((hi - 10)/5) : lo;
  ctx.lineWidth = Math.max(1, 0.05*cam.F/cam.back); ctx.beginPath();
  for (const y of [5, 15, 55, 65]) {
    for (let x = a; x < e; x += 5) groundSeg(cam, x, y, Math.min(x + 1, e), y, 0);
    if (d > 0) { if (e < 110) groundSeg(cam, e, y, 110, y, 0); } else if (a > 10) groundSeg(cam, 10, y, a, y, 0);
  }
  ctx.stroke();
  for (const px of [10, 110]) bvPosts(cam, px);
}
function bvPosts(cam, px) {                                 // drawPosts' geometry at either end. A near pair thins out, so it never hides the man you are running
  const near = pr(cam, px, 35, 0);
  if (!near || near.z < 0.8) return;
  ctx.globalAlpha = clamp((near.z - 4)/14, 0.25, 1);
  for (const py of [32.2, 37.8]) {
    const a = pr(cam, px, py, 0), b = pr(cam, px, py, KICK.upH);
    ctx.strokeStyle = '#f7f5ee'; ctx.lineWidth = Math.max(1.5, 0.12*a.k); seg(a.sx, a.sy, b.sx, b.sy);
    ctx.fillStyle = C.pad; ctx.fillRect(a.sx - 0.3*a.k, a.sy - 1.8*a.k, 0.6*a.k, 1.8*a.k);
  }
  const l = pr(cam, px, 32.2, KICK.bar), r = pr(cam, px, 37.8, KICK.bar);
  ctx.strokeStyle = '#f7f5ee'; ctx.lineWidth = Math.max(1.5, 0.12*l.k); seg(l.sx, l.sy, r.sx, r.sy);
  ctx.globalAlpha = 1;
}

/* ---------- one man, on any canvas ---------- */
// fig and figFB draw on the module's ctx in the module's SKIN and HAIR, so swapping those paints one man to a sprite cell with their bodies
// unchanged. The head is redrawn a little larger, in his style: at 40px the figures' own heads are about five pixels across.
function paintMan(g, p, o) {                                // o: k, view (0 back, 1 front, 2 side), face, frame, arms, lying, dive, crouch
  const look = lookOf(p), keepCtx = ctx, keepSkin = SKIN, keepHair = HAIR;
  try {
    ctx = g; SKIN = LOOK_SKIN[look.skin]; HAIR = LOOK_HAIR[look.hair];
    const stride = (o.frame || 0)*Math.PI/2, kit = kitOf(p.team, p);   // the kit knows the man: the Locker's boots on your side, his alone in a career, Rainbow's by shirt (lockerBoots)
    if (o.view === 2) fig(0, 0, o.k, kit, { face:o.face || 1, stride, arms:o.arms === 'carry' ? 'carry' : 'down' });
    else figFB(0, 0, o.k, p.team, { kit, back:o.view === 0, num:p.n, stride, arms:o.arms, lying:o.lying, dive:o.dive, crouch:o.crouch });
    paintHead(look, p.team, o);
  } finally { ctx = keepCtx; SKIN = keepSkin; HAIR = keepHair; }
}
function paintHead(look, team, o) {
  const k = o.k, side = o.view === 2, back = o.view === 0, cr = o.crouch || 0;
  const hx = side ? 0.04*k*(o.face || 1) : 0, hy = side ? -1.73*k : -1.68*(1 - 0.3*cr)*k, R = (side ? 0.13 : 0.12)*k*1.3;
  const a0 = ctx.globalAlpha, disc = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
  const cap = (r, dy) => { ctx.beginPath(); ctx.arc(hx, hy + dy, r, Math.PI*(side && (o.face || 1) < 0 ? 0.9 : 1.05), Math.PI*(side && (o.face || 1) > 0 ? 2.1 : 1.95)); ctx.closePath(); ctx.fill(); };
  ctx.save();
  if (o.lying) { ctx.rotate(Math.PI/2*(o.dive || 1)); ctx.translate(0, 0.25*k); }
  else if (o.dive) ctx.rotate((back ? -0.35 : 0.35)*o.dive);
  const kitTrim = M.kit[team].trim, trim = colorDist(kitTrim, C.grassA) < 60 || colorDist(kitTrim, C.grassB) < 60 ? '#f1eee4' : kitTrim;   // a green trim would lose the head against the grass: chalk instead
  if (look.style === 2) { ctx.fillStyle = HAIR; disc(hx, hy - R*0.22, R*1.42); }         // big hair goes behind the face
  ctx.fillStyle = SKIN; disc(hx, hy, R);
  ctx.strokeStyle = 'rgba(8,17,11,.5)'; ctx.lineWidth = Math.max(0.7, 0.018*k); ctx.stroke();
  ctx.fillStyle = HAIR;
  if (look.style === 0) { if (back) disc(hx, hy, R); else cap(R*1.02, -R*0.08); }         // short
  else if (look.style === 1) { ctx.globalAlpha = a0*0.4; if (back) disc(hx, hy, R); else cap(R, -R*0.12); ctx.globalAlpha = a0; }   // shaved
  else if (look.style === 2) { if (back) disc(hx, hy - R*0.1, R*1.2); }
  else if (look.style === 3) {                               // a scrum cap, in the kit's trim
    ctx.fillStyle = trim;
    if (back) disc(hx, hy, R*1.08); else cap(R*1.1, -R*0.02);
    ctx.stroke();                                            // the head's own outline, round the cap
    ctx.strokeStyle = trim; ctx.lineWidth = Math.max(1, 0.05*k); ctx.beginPath(); ctx.arc(hx, hy, R*1.02, Math.PI*0.2, Math.PI*0.8); ctx.stroke();
  } else if (look.style === 4) {                             // a headband, in the kit's trim
    if (back) disc(hx, hy, R); else cap(R*1.02, -R*0.08);
    ctx.fillStyle = trim; ctx.fillRect(hx - R*1.04, hy - R*0.48, R*2.08, R*0.42);
  } else {                                                   // a bun
    if (back) disc(hx, hy, R); else cap(R*1.02, -R*0.08);
    disc(hx, hy - R*1.2, R*0.56);
  }
  ctx.restore();
}
function bvMan(p) {                                         // render-only state for a man: never on the player object
  let s = BV.men.get(p);
  if (!s) { s = { z:0, wx:p.x, wy:p.y, u:0, view:0, face:1, dist:0, cells:{} }; BV.men.set(p, s); }
  return s;
}
const bvCellKey = (view, frame, tier) => view*10 + (frame === 2 ? 0 : frame) + tier*100;   // frames 0 and 2 are the same picture; a side view or a man on the floor (view 3) is flipped when drawn
function cellFor(p, s, view, frame, tier) {                 // his sprite, or null when this frame's bakes are spent
  const f = frame === 2 ? 0 : frame, key = bvCellKey(view, f, tier);
  const c = s.cells[key];
  if (c) return c;
  if (BV.bakes >= 6) return null;
  BV.bakes++; BV.baked++;
  bvArmFonts();
  const T = BV_TIERS[tier], cell = document.createElement('canvas'), g = cell.getContext('2d'), shape = view === 3 ? BV_CELL.lying : BV_CELL.stand;
  cell.width = Math.ceil(shape.w*T); cell.height = Math.ceil(shape.h*T);
  g.translate(shape.ox*T, shape.oy*T);
  paintMan(g, p, view === 3 ? { k:T, view:1, face:1, frame:0, arms:'run', lying:true, dive:1 } : { k:T, view, face:1, frame:f, arms:'run' });
  BV.cells.push(cell);
  s.cells[key] = cell;
  return cell;
}
function bvArmFonts() {                                     // a shirt number baked before its font arrives is rebuilt once
  if (BV.fontsArmed) return;
  BV.fontsArmed = true;
  const fonts = document.fonts;
  if (!fonts || !fonts.ready) { BV.fontsReady = true; return; }
  fonts.ready.then(() => {
    BV.fontsReady = true;
    for (const c of BV.cells) c.width = 0;
    BV.cells.length = 0; BV.men = new WeakMap(); BV.order.length = 0;
    artClear();
  });
}

/* ---------- the men ---------- */
function bvPrepareMen(cam) {
  const P = M.players, order = BV.order;
  if (order.length !== P.length) { order.length = 0; for (const p of P) order.push(p); }
  for (const p of P) {
    const s = bvMan(p), [wx, wy] = drawPos(p), m = hyp(p.fx, p.fy) || 1, fu = (p.fx*cam.u.x + p.fy*cam.u.y)/m, fr = (p.fx*cam.r.x + p.fy*cam.r.y)/m;
    const step = hyp(wx - s.wx, wy - s.wy);
    if (step < 3) s.dist += step;                           // the stride follows ground covered, so it can't flicker with the clock or stop on a diagonal
    s.wx = wx; s.wy = wy;
    s.z = (wx - cam.Cx)*cam.u.x + (wy - cam.Cy)*cam.u.y;
    // back, front or side, with 0.1 of hysteresis either way so a man running near the diagonal doesn't flip each frame
    if (s.view === 0 ? fu < 0.5 : s.view === 1 ? fu > -0.5 : Math.abs(fu) > 0.7) s.view = fu > 0.6 ? 0 : fu < -0.6 ? 1 : 2;
    if (fr > 0.1) s.face = 1; else if (fr < -0.1) s.face = -1;
  }
  for (let i = 1; i < order.length; i++) {                  // far to near; nearly sorted already, so this barely moves
    const p = order[i], z = bvMan(p).z;
    let j = i - 1;
    while (j >= 0 && bvMan(order[j]).z < z) { order[j + 1] = order[j]; j--; }
    order[j + 1] = p;
  }
}
const bvFlat = (cam, z) => clamp(cam.ch/z, 0.18, 0.6);
function drawManBehind(cam, p, ctrl) {
  const s = bvMan(p), b = M.ball;
  if (s.z <= CAM.fadeZ) return;
  const k = p.bind, tackler = !!(k && p !== k.c), carrier = b.state === 'held' && b.carrier === p;
  let at = pr(cam, s.wx, s.wy, 0);
  if (tackler && p.bindOff) at = pr(cam, k.c.x + p.bindOff.x, k.c.y + p.bindOff.y, 0) || at;   // bound on to the carrier, on the side he came from
  if (!at || at.sx < -at.k*1.5 || at.sx > V.W + at.k*1.5 || at.sy < -at.k*0.5 || at.sy > V.H + at.k*2.5) return;
  const look = lookOf(p), sc = look.h/1.8, kk = at.k, sp = hyp(p.vx, p.vy), spr = sprintLevel(p), fire = onFire(p.team), flat = bvFlat(cam, s.z);
  const alpha = clamp((s.z - CAM.fadeZ)/CAM.fadeW, 0, 1)*BV.fade;
  if (alpha < 1) ctx.globalAlpha = alpha;
  const R = 0.95*kk;
  if (fire && p.down <= 0) {                                 // On Fire: the same pulse as the top view, flat on the grass
    ctx.fillStyle = `rgba(255,110,30,${(0.30 + 0.12*Math.sin(M.rt*2*Math.PI*3)).toFixed(3)})`;
    ellipse(at.sx, at.sy, R*0.9, R*0.9*flat); ctx.fill();
  }
  if (p.down <= 0 && !k && (p.boost > 0 || spr > 0 || p.chase > 0 || fire || (M.surge && M.surge.team === p.team)) && sp > (fire ? 1.5 : 3)) {
    const tx = -p.vx/sp, ty = -p.vy/sp;                      // the trail and streaks, as points on the ground behind him
    ctx.fillStyle = fire ? 'rgba(255,110,30,.6)' : (p.boost > 0 || spr > 0 || p.chase > 0) ? 'rgba(255,207,61,.35)' : 'rgba(244,241,232,.18)';   // the kick chase (src/chase.js) gold, as a burst
    for (const kk2 of [1.1, 2.0]) { const q = pr(cam, s.wx + tx*0.95*kk2, s.wy + ty*0.95*kk2, 0); if (q) { ellipse(q.sx, q.sy, q.k*0.6*(1 - kk2*0.22), q.k*0.6*(1 - kk2*0.22)*flat); ctx.fill(); } }
    if (spr > 0) {
      ctx.strokeStyle = `rgba(244,241,232,${(0.55*spr).toFixed(3)})`; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        const ox = -ty*side*0.7, oy = tx*side*0.7, a = pr(cam, s.wx + ox + tx*1.1, s.wy + oy + ty*1.1, 0.4), e = pr(cam, s.wx + ox + tx*2.7, s.wy + oy + ty*2.7, 0.4);
        if (a && e) seg(a.sx, a.sy, e.sx, e.sy);
      }
    }
  }
  const down = p.down > 0, live = p === ctrl || tackler;     // the man you run and a bound tackler are drawn fresh; everyone else is a sprite
  let frame = 0, ang = 0;
  if (!down && !tackler && sp >= 0.6) frame = Math.floor(s.dist*1.8/(Math.PI/2)) & 3;
  s.frame = frame;
  if (p.stumble > 0) ang = 9*D2R*Math.sin(M.rt*2*Math.PI*14);                 // the wobble after an ankle tap
  if (k && !tackler) ang += (k.tier === 'soft' ? 0.15 : k.tier === 'dom' && k.t/k.T >= 0.4 ? -0.12 : 0)*(s.face);   // a bound carrier leans into a Soft tackle and recoils from a Big Hit
  const view = down ? 3 : s.view, flip = view >= 2 && s.face < 0;
  const place = () => { ctx.save(); ctx.translate(at.sx, at.sy); ctx.scale(look.b*sc, sc); if (ang) ctx.rotate(ang); };   // height, build and lean sit outside the figure, for sprites and live men alike
  let drawn = false, pose = null;
  if (artReady() && (pose = artPose(cam, p, s, k, tackler, carrier, sp, spr))) drawn = !!artDraw(at, p, s, kk, sc, ang, pose, p === ctrl);   // the rendered art, for everyone: the code-drawn man below is what shows until it is in
  if (!drawn && !live) {
    const want = kk*V.dpr > 40 && !M.demo ? 1 : 0, mine = cellFor(p, s, view, frame, want), other = mine ? null : s.cells[bvCellKey(view, frame, 1 - want)], cell = mine || other;
    if (cell) {
      const shape = down ? BV_CELL.lying : BV_CELL.stand;
      place(); if (flip) ctx.scale(-1, 1);
      ctx.drawImage(cell, -shape.ox*kk, -shape.oy*kk, shape.w*kk, shape.h*kk);
      ctx.restore(); drawn = true;
    }
  }
  if (!drawn) {
    place();
    if (down) paintMan(ctx, p, { k:kk, view:1, face:1, frame:0, arms:'run', lying:true, dive:s.face });
    else if (tackler) paintMan(ctx, p, { k:kk*0.92, view:s.view === 1 ? 1 : 0, face:1, frame:0, arms:'wide', crouch:0.65, dive:(k.c.y - s.wy)*cam.r.y >= 0 ? 1 : -1 });
    else paintMan(ctx, p, { k:kk, view:s.view, face:s.face, frame, arms:carrier ? 'carry' : 'run' });
    ctx.restore();
  }
  if (p.fend > 0) {                                          // the fend: an arm out at shoulder height at the man he has just beaten
    const a = p.fendA, l = 0.95*(0.9 + 0.5*(1 - p.fend/0.2)), q0 = pr(cam, s.wx + Math.cos(a)*0.38, s.wy + Math.sin(a)*0.38, 1.3), q1 = pr(cam, s.wx + Math.cos(a)*l, s.wy + Math.sin(a)*l, 1.3);
    if (q0 && q1) { ctx.strokeStyle = M.kit[p.team].trim; ctx.lineWidth = Math.max(2, 0.2*kk); ctx.lineCap = 'round'; seg(q0.sx, q0.sy, q1.sx, q1.sy); }
  }
  if (carrier) {                                             // straight after him, so a nearer man can cover it
    if (drawn && pose && pose.row.length > 12) { const q = kk/ART.man.px, m = pose.mirror ? -1 : 1, side = pose.deg === 90; cutBall(at.sx + m*pose.row[12]*q*look.b/ART.man.builds[pose.build]*sc, at.sy + pose.row[13]*q*sc, kk*0.95, side ? 0.2*m : pose.deg === 0 || pose.deg === 180 ? 1.25 : 0.7*m); }   // in his hands, as the art holds it
    else cutBall(at.sx + 0.18*kk*(s.view === 2 ? s.face : 1), at.sy - 1.15*kk*sc, kk*0.95, s.view === 2 ? 0.2*s.face : 1.25);
  }
  if (M.arcade && p.tr && !(M.career && p === M.careerP)) bvTraitStar(at.sx + 0.34*kk*look.b*sc, at.sy - (down ? 0.6 : 1.62)*kk*sc, Math.max(4, 0.3*kk));   // a star player: traitMarks' gold star on his right shoulder, at his own depth, under every nearer man. Your career player has his own star
  if (alpha < 1) ctx.globalAlpha = 1;
}
const BV_STAR = { px:64, r:26 };                            // the star player's star, baked once: a cell this many pixels square, its points this far from the centre
function bvTraitStar(x, y, s) {                             // traitMarks' star (src/traits.js), the same shape and gold: one drawImage, so a side of stars costs the frame almost nothing
  if (x < -s || x > V.W + s || y < -s || y > V.H + s) return;
  if (!BV.star) {
    const cell = document.createElement('canvas'), g = cell.getContext('2d'), c = BV_STAR.px/2, r = BV_STAR.r;
    cell.width = cell.height = BV_STAR.px;
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI/2 + i*Math.PI/5, rr = i % 2 ? r*0.45 : r; g.lineTo(c + Math.cos(a)*rr, c + Math.sin(a)*rr); }
    g.closePath();
    g.fillStyle = '#ffcf3d'; g.fill();
    g.lineWidth = 0.3*r; g.lineJoin = 'round'; g.strokeStyle = C.outline; g.stroke();
    BV.star = cell;
  }
  const h = s*BV_STAR.px/2/BV_STAR.r;
  ctx.drawImage(BV.star, x - h, y - h, 2*h, 2*h);
}
function groundRing(cam, x, y, radius, style, width, dash) {
  const q = pr(cam, x, y, 0);
  if (!q) return;
  const rx = Math.max(6, radius*q.k);
  ctx.strokeStyle = style; ctx.lineWidth = width; ctx.setLineDash(dash || []);
  ellipse(q.sx, q.sy, rx, rx*bvFlat(cam, q.z)); ctx.stroke(); ctx.setLineDash([]);
}
/* The ball's own marks. None of them is a ring: a solid ring is who you control, a dashed one a pass, a Switch or where a kick comes down. */
const BV_LOOSE = { rx:8.5, air:7, k:0.34, patch:'rgba(246,243,234,.3)' };                 // a ball not in anyone's hands: its half-length never under these px, and this share of a metre on the screen. It reads about 3m away on a phone
function ballLaces(x, y, rx, ang) {                         // the laces that make a big ball a ball, the same on the grass, in the air, on the edge tag and in the marker
  const l = rx*0.42, h = rx*0.2;
  const lk = lockerBall();                                   // the Locker's ball laced in its own line colour (src/locker.js)
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.strokeStyle = lk ? lk.line : BV_CARRY.lace; ctx.lineWidth = Math.max(1.1, rx*0.13); ctx.lineCap = 'round'; ctx.beginPath();
  ctx.moveTo(-l, 0); ctx.lineTo(l, 0);
  for (const f of [-0.55, 0, 0.55]) { ctx.moveTo(f*l, -h); ctx.lineTo(f*l, h); }
  ctx.stroke(); ctx.restore();
}
function bvLooseMark(cam, b) {                              // on the grass, under the men: a pale patch with the rays of a burst
  const q = pr(cam, b.x, b.y, 0);
  if (!q) return;
  const f = bvFlat(cam, q.z), R = Math.max(20, 1.15*q.k)*(RM ? 1 : 1 + 0.08*Math.sin(M.rt*2*Math.PI*1.5));
  ctx.fillStyle = BV_LOOSE.patch; ellipse(q.sx, q.sy, R, R*f); ctx.fill();
  ctx.lineCap = 'round';
  for (const [style, width] of [['rgba(8,17,11,.55)', 4.5], ['#f6f3ea', 2.5]]) {
    ctx.strokeStyle = style; ctx.lineWidth = width; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i*Math.PI/4 + Math.PI/8, c = Math.cos(a), s = Math.sin(a); ctx.moveTo(q.sx + c*R*1.1, q.sy + s*R*1.1*f); ctx.lineTo(q.sx + c*R*1.5, q.sy + s*R*1.5*f); }
    ctx.stroke();
  }
}
function bvBall(cam) {                                      // a ball not in anyone's hands, after the men
  const b = M.ball;
  if (b.state === 'held') return;
  const q = pr(cam, b.x, b.y, Math.max(0, b.z));
  if (b.state === 'air' && b.f && b.f.kind !== 'pass') {     // where a kick comes down
    groundRing(cam, b.f.x1, b.f.y1, BV_RING*1.3, 'rgba(241,238,228,.75)', 2, [4, 3]);
  }
  if (!q) return;
  const sh = pr(cam, b.x, b.y, 0), scG = 1/(1 + Math.max(0, b.z)*0.16);
  if (sh) { ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.globalAlpha = 0.45 + 0.55*scG; ellipse(sh.sx, sh.sy, Math.max(7, 0.3*sh.k)*scG, Math.max(2.5, 0.11*sh.k)*scG); ctx.fill(); ctx.globalAlpha = 1; }
  const across = b.vx*cam.r.x + b.vy*cam.r.y, along = b.vx*cam.u.x + b.vy*cam.u.y, ang = (hyp(across, along) > 0.5 ? Math.atan2(-along*bvFlat(cam, q.z), across) : 0) + (b.tumble != null ? b.tumble*0.5 : 0);   // a spilled or knocked-on egg turns end over end (b.tumble, set in the sim; PRESSURE)
  if (b.state === 'dead' && !b.egg) { cutBall(q.sx, q.sy, q.k*1.1, ang); return; }   // waiting at a kick-off or a ruck, among the men: its old size, so it never sits on a man like a plate. No one needs to chase it. A knock-on hopping before its whistle is drawn as a loose ball
  const rx = Math.max(b.state === 'air' ? BV_LOOSE.air : BV_LOOSE.rx, BV_LOOSE.k*q.k);
  cutBall(q.sx, q.sy, rx/0.17, ang);                         // cutBall's half-length is 0.17 of its scale
  ballLaces(q.sx, q.sy, rx, ang);
}
const bvHudHides = (x, y, ins) => (y < BV_STACK_HUD && Math.abs(x - V.W/2) < 96) || (y < 54 && x > V.W - 70 - (ins ? ins.r : 0));   // the page draws over the canvas: a ball behind the scorebug, the clock, the sign or pause is not seen
function bvChevron(cam, q, col, badge) {                    // an off-frame pass or Switch target: a chevron on the edge, in the ring's colour. With a badge, the ball or your player: a tag that says which
  const W = V.W, H = V.H, view = camPt(cam, q.x, q.y, 0);
  let [x, y] = bvS(q.x, q.y);
  if (view.z < CAM.near) x = cam.cx + view.a*18;
  const ball = q === M.ball, up = ball && q.z > 0 ? pr(cam, q.x, q.y, q.z) : null;
  if (up) { x = up.sx; y = up.sy; }                         // a ball in the air is where it is drawn, not where its shadow is
  if (x >= 0 && x <= W && y >= (ball ? 8 : 0) && y <= H && !(ball && bvHudHides(x, y, cam.ins))) return false;
  if (badge) { edgeTag(x, y, col, badge, cam.ins); return true; }
  const ex = clamp(x, 14, W - 14), ey = clamp(y, 14, H - 14), a = Math.atan2(y - H/2, x - W/2), ca = Math.cos(a), sa = Math.sin(a);
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(ex + ca*9, ey + sa*9); ctx.lineTo(ex - ca*5 - sa*8, ey - sa*5 + ca*8); ctx.lineTo(ex - ca*5 + sa*8, ey - sa*5 - ca*8); ctx.closePath(); ctx.fill();
  BV.edges.push({ x:ex, y:ey });
  return true;
}
/* The edge tag: a dark disc holding what it points at, and the chevron. It keeps out of the notch, the scorebug, the pause button, the stick's resting place, the buttons, the career caption and any other edge mark. */
const BV_TAG = { r:13, tip:21, margin:24, clear:28, disc:'rgba(8,14,10,.9)' };
function edgeTagAt(x, y, ins) {                             // where a tag for a thing at screen x, y goes. It changes nothing, for the tools
  const W = V.W, H = V.H, m = BV_TAG.margin, I = ins || { t:0, r:0, b:0, l:0 }, lo = m + I.l, hi = W - m - I.r;
  let ex = clamp(x, lo, hi), ey = clamp(y, m + I.t, H - m - I.b);
  if (ey < 88 && Math.abs(ex - W/2) < 170) ey = 88;          // the scorebug, the clock and the sign under it
  if (ey < 72 && ex > W - 84 - I.r) ey = 72;                 // the pause button
  const floor = H - 128 - I.b, wall = W - 205 - I.r;         // the Pass, Kick and Sprint buttons fill the corner
  if (ey > floor && ex > wall) { if (ex > W - 100 - I.r) ey = floor; else ex = wall; }
  const st = stickRest(W, H, I), R = 62 + BV_TAG.r + 5, dx = ex - st.x;   // the thumb rests on the stick: a tag there is under it
  if (Math.abs(dx) < R) {
    if (ex <= lo + 1) ey = Math.min(ey, st.y - Math.sqrt(R*R - dx*dx));   // on the left edge: above the ring
    else if (hyp(dx, ey - st.y) < R) ex = st.x + Math.sqrt(R*R - (ey - st.y)*(ey - st.y));   // along the bottom: to its right
  }
  if (careerCaption() && ey > H - 66 - I.b && Math.abs(ex - W/2) < 170) ey = H - 66 - I.b;   // over the kick-off caption
  return [ex, ey];
}
function edgeTag(x, y, col, badge, ins) {
  let [ex, ey] = edgeTagAt(x, y, ins);
  const W = V.W, H = V.H, side = ex <= BV_TAG.margin + (ins ? ins.l : 0) + 1 || ex >= W - BV_TAG.margin - (ins ? ins.r : 0) - 1;
  for (const e of BV.edges) if (hyp(e.x - ex, e.y - ey) < BV_TAG.clear) { if (side) ey += ey > H/3 ? -BV_TAG.clear : BV_TAG.clear; else ex += ex > W/2 ? -BV_TAG.clear : BV_TAG.clear; }
  BV.edges.push({ x:ex, y:ey });
  const a = Math.atan2(y - H/2, x - W/2), ca = Math.cos(a), sa = Math.sin(a), r = BV_TAG.r, tip = BV_TAG.tip;
  ctx.fillStyle = BV_TAG.disc; ctx.beginPath(); ctx.arc(ex, ey, r, 0, 7); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(ex + ca*tip, ey + sa*tip); ctx.lineTo(ex + ca*(r - 1) - sa*7, ey + sa*(r - 1) + ca*7); ctx.lineTo(ex + ca*(r - 1) + sa*7, ey + sa*(r - 1) - ca*7); ctx.closePath(); ctx.fill();
  if (badge === 'star') careerStar(ex, ey, 8, col);
  else { cutBall(ex, ey, 7/0.17, -0.35); ballLaces(ex, ey, 7, -0.35); }
}

/* ---------- the frame ---------- */
/* What stands over a man's head, bottom to top: the pointer (who you control), the ball's marker (who has it), the star (your player),
   and Pro Mode's No sign (a call he did not answer: proMark's, src/career-pro.js), o.no its outer radius.
   Pure, so the tools can read it. tip is the bottom of the stack; a man near the top of the frame moves the whole stack down, so nothing leaves the screen or sits on anything else. */
const BV_CARRY = { w:26, h:17, tail:5, r:5, gap:2, fill:'#f6f3ea', edge:'#08110b', ball:'#fffdf6', lace:'#3b2f22' };
const BV_STACK_HUD = 72;                                    // under the scorebug, the clock and the sign, a marked man's stack stops here: the page draws over the canvas, and a marker under them would not be seen
function bvStack(tip, o) {
  const P = o.pointer ? 8 : 0, B = o.carry ? BV_CARRY.h + BV_CARRY.tail : 0, S = o.star ? 2*o.star : 0, N = o.no ? 2*o.no : 0, n = (P ? 1 : 0) + (B ? 1 : 0) + (S ? 1 : 0) + (N ? 1 : 0);
  let y = Math.max(tip, (o.floor || 6) + P + B + S + N + Math.max(0, n - 1)*BV_CARRY.gap);
  const out = {};
  if (P) { out.pointer = y; y -= P + BV_CARRY.gap; }
  if (B) { out.carry = y; y -= B + BV_CARRY.gap; }
  if (S) { out.star = y - o.star; y -= S + BV_CARRY.gap; }
  if (N) out.no = y - o.no;
  return out;
}
function bvCarryMark(x, y) {                                // a chalk speech bubble with the game's own white laced ball in it, its tail on y. It has no ring and no words, and it reads the same over any kit: chalk on a dark kit, the dark edge on a white one
  const K = BV_CARRY, top = y - K.tail - K.h, l = x - K.w/2;
  ctx.fillStyle = K.fill; ctx.strokeStyle = K.edge; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x - 5, top + K.h - 0.5); ctx.lineTo(x, y); ctx.lineTo(x + 5, top + K.h - 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  rrect(l, top, K.w, K.h, K.r); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 4.5, top + K.h - 0.5); ctx.lineTo(x + 4.5, top + K.h - 0.5); ctx.lineWidth = 2; ctx.strokeStyle = K.fill; ctx.stroke();   // the tail runs into the bubble
  const lk = lockerBall();                                   // the Locker's ball, as the ball itself is (cutBall)
  ctx.save(); ctx.translate(x, top + K.h/2); ctx.rotate(-0.35);
  ctx.fillStyle = lk ? lockerBallFill(lk, 9) : K.ball; ctx.strokeStyle = lk ? lk.line : K.lace; ctx.lineWidth = 1.4; ellipse(0, 0, 9, 5.6); ctx.fill(); ctx.stroke();
  ctx.restore();
  ballLaces(x, top + K.h/2, 9, -0.35);
}
function bvOverheads(cam, ctrls, plain) {                   // plain: a match you are playing, not a drill, the demo or a close-up. Everything else keeps the pointer alone
  const b = M.ball, carrier = plain && M.phase === 'play' && b.state === 'held' ? b.carrier : null, me = plain && M.career ? M.careerP : null;
  const N = plain && M.career && M.careerPro && M.proNo && M.proNo.p && M.dclock - M.proNo.at < PRO.noT ? M.proNo : null;   // Pro Mode: a call not answered, over the carrier it was made to
  const men = [ctrls[0], ctrls[1], carrier, me, N ? N.p : null];
  for (let i = 0; i < 5; i++) {
    const p = men[i];
    if (!p || men.indexOf(p) !== i) continue;                // one stack a man, whatever he is
    const ctrl = p === ctrls[0] || p === ctrls[1], col = ctrl ? ringCol(p === ctrls[0] ? 0 : 1) : null;
    const [wx, wy] = drawPos(p), q = pr(cam, wx, wy, 0), x = q ? q.sx : V.W/2;
    if (!q || x < 0 || x > V.W || q.sy < 0 || q.sy > V.H) {  // off the frame: a dot on the edge for the ring's man; the ball and your player get bvEdgeMarks
      if (ctrl) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(clamp(x, 18, V.W - 18), clamp(q ? q.sy : V.H + 999, 18, V.H - 18), 7, 0, 7); ctx.fill(); }
      continue;
    }
    const star = p === me ? Math.max(8, 0.34*q.k) : 0, no = N && p === N.p ? Math.max(7, 0.4*q.k) + 3 : 0, S = bvStack(q.sy - (lookOf(p).h + 0.2)*q.k, { pointer:ctrl, carry:p === carrier, star, no, floor:plain && (p === carrier || star || no) && Math.abs(x - V.W/2) < 130 ? BV_STACK_HUD : 0 });
    if (ctrl) { const ty = S.pointer; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 6, ty - 8); ctx.lineTo(x + 6, ty - 8); ctx.lineTo(x, ty); ctx.closePath(); ctx.fill(); }
    if (S.carry != null) bvCarryMark(x, S.carry);
    if (star) careerStar(x, S.star, star, careerCol());
    if (no) bvNoSign(x, S.no, no - 3, Math.min(1, 4*(1 - (M.dclock - N.at)/PRO.noT)));
  }
}
function bvCallAt(cam, t, plain) {                          // where a possession call stands in a behind view: over his stack (bvOverheads), as high as it reaches
  const p = t.p, [wx, wy] = p ? drawPos(p) : [t.x, t.y], q = pr(cam, wx, wy, 0);
  if (!q || q.sx < 0 || q.sx > V.W || q.sy < 0 || q.sy > V.H) return null;
  const star = plain && M.career && p === M.careerP ? Math.max(8, 0.34*q.k) : 0, carry = plain && M.phase === 'play' && M.ball.state === 'held' && M.ball.carrier === p;
  const S = bvStack(q.sy - ((p ? lookOf(p).h : 1.8) + 0.2)*q.k, { pointer:true, carry, star, floor:plain && Math.abs(q.sx - V.W/2) < 130 ? BV_STACK_HUD : 0 });
  const top = star ? S.star - star : carry ? S.carry - BV_CARRY.tail - BV_CARRY.h : S.pointer - 8;
  return { x:q.sx, top:top - BV_CARRY.gap, foot:q.sy + Math.max(6, BV_RING*1.55*q.k)*bvFlat(cam, q.z) + 8, half:Math.max(6, BV_RING*1.55*q.k) };   // over the stack, or under his ring on the grass
}
function bvEdgeMarks(cam, plain) {                          // the ball or its carrier off the frame, and your player. Not at a set piece: the game is about to cut to it, and it has its own banner
  if (!plain) return;
  const b = M.ball;
  if (M.phase === 'play' || (M.phase === 'set' && M.set && M.set.kind === 'ruck')) bvChevron(cam, b.state === 'held' && b.carrier ? b.carrier : b, BV_CARRY.fill, 'ball');
  if (M.career && M.careerP) bvChevron(cam, M.careerP, careerEdgeCol(), 'star');
}
/* Pro Mode (src/career-pro.js) in a behind view, as proMark draws it on Top: the call's ring going out from your player on the grass,
   in the ring's colour, fading as it widens (under reduced motion it fades without widening), and the No sign, a slashed circle over
   the carrier's head at the top of his stack (bvOverheads). */
function bvProCall(cam) {
  const call = M.proCue, now = M.dclock;
  if (!call || !call.p || now - call.at >= PRO.callT) return;
  const u = (now - call.at)/PRO.callT, [wx, wy] = drawPos(call.p), a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0*(1 - u); groundRing(cam, wx, wy, BV_RING*(RM ? 1.9 : 1.5 + 1.4*u), ringCol(0), 3); ctx.globalAlpha = a0;
}
function bvNoSign(x, y, R, a) {
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0*a;
  ctx.fillStyle = 'rgba(8,14,10,.88)'; ctx.beginPath(); ctx.arc(x, y, R + 3, 0, 7); ctx.fill();
  ctx.strokeStyle = SUPPORT.tint; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - R*0.7, y - R*0.7); ctx.lineTo(x + R*0.7, y + R*0.7); ctx.stroke();
  ctx.globalAlpha = a0;
}
function renderBehind(dt) {
  const drill = !!practice, cam = BV.cam = drill ? dvCamera(dt) : bvFollow(dt), b = M.ball;   // the Training Ground has its own camera and field (render-drill.js), and the men and cues below
  BV.bakes = 0;
  ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
  if (ART.state === 'idle') artLoad();
  const demo = menuDemo();
  BV.fade = !demo ? 1 : artReady() || ART.state === 'off' ? (RM ? 1 : Math.min(1, BV.fade + dt/BV_DEMO_IN)) : 0;   // loading: no men yet, so never a flash of the code-drawn ones. No art at all: they fade in the same way
  if (drill && dvCovered()) { if (artReady()) artPrepare(cam); drillDrawScreen(); return; }
  const dd = drill ? DV_DRAW[practice.id] : null;
  if (drill) { dvGround(cam); if (dd && dd.ground && !M.cut) dd.ground(cam); if (dd && dd.spots) dd.spots(cam); } else drawPitchBehind(cam);
  const ctrls = [0, 1].map(t => (isHuman(t) ? ctrlOf(t) : null));
  const plain = !drill && !demo && !M.cut;
  BV.edges.length = 0;
  if (plain && M.phase === 'play' && b.state === 'loose') bvLooseMark(cam, b);
  for (const t of [0, 1]) if (ctrls[t]) groundRing(cam, ctrls[t].x, ctrls[t].y, BV_RING*1.55, ringCol(t), 2.5);
  if (!drill) callFlash(dt, (p, u, col) => { const [wx, wy] = drawPos(p); groundRing(cam, wx, wy, BV_RING*(1.55 + 0.9*u), col, 3); });   // a possession call's flash on his ring (src/calls.js)
  if (plain && M.career && M.careerPro) bvProCall(cam);      // on the grass with the ring, under the men
  bvPrepareMen(cam);
  if (artReady()) artPrepare(cam);
  const ctrlHuman = ctrls[0] || ctrls[1];
  if (drill) dvMen(cam, ctrlHuman, dt);
  else if (BV.fade > 0) for (const p of BV.order) drawManBehind(cam, p, ctrlHuman);
  // the same cues as the top view, each sized by its own man's depth
  const targetCue = (q, text, colour) => {
    const at = pr(cam, q.x, q.y, 0);
    if (!at) return;
    const x = at.sx, y = at.sy, cy = y - (lookOf(q).h + 0.3)*at.k - 11;
    if (x < 24 || x > V.W - 24 || cy < 83 || y > V.H - 20) return;
    ctx.save();
    ctx.font = `700 11px 'Atkinson Hyperlegible', sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const measured = ctx.measureText(text), w = ((measured && measured.width) || text.length*6) + 12;
    const cx = clamp(x, w/2 + 8, V.W - w/2 - 8);
    ctx.fillStyle = 'rgba(8,14,10,.9)'; rrect(cx - w/2, cy - 9, w, 18, 4); ctx.fill();
    ctx.fillStyle = colour; ctx.fillText(text, cx, cy);
    ctx.restore();
  };
  for (const t of [0, 1]) {                                  // pass target: render-match.js has the reasoning
    const ctrl = ctrls[t];
    if (!(ctrl && M.phase === 'play' && b.state === 'held' && b.carrier === ctrl)) continue;
    const shown = ctrl.bind ? { to:offloadTarget(ctrl.bind), skip:null, gold:false, marked:false } : shownPass(ctrl);
    if (ctrl.bind) shown.marked = !!(shown.to && pressure(shown.to) < SUPPORT.mark);
    if (shown.skip && shown.skip !== shown.to) groundRing(cam, shown.skip.x, shown.skip.y, BV_RING*1.2, 'rgba(244,241,232,.38)', 1.5, [3, 4]);
    if (shown.to) {
      if (shown.gold) groundRing(cam, shown.to.x, shown.to.y, BV_RING*1.6, ringCol(t), 2.5, [4, 3]);
      else groundRing(cam, shown.to.x, shown.to.y, BV_RING*1.6, shown.marked ? SUPPORT.tint : 'rgba(244,241,232,.95)', shown.marked ? 2.5 : 2, [4, 3]);
      if (shown.gold && shown.marked) groundRing(cam, shown.to.x, shown.to.y, BV_RING*1.15, SUPPORT.tint, 2);
      if (shown.marked) targetCue(shown.to, 'Marked', '#f1eee4');
      bvChevron(cam, shown.to, shown.gold ? ringCol(t) : 'rgba(244,241,232,.95)');
    }
  }
  for (const t of [0, 1]) {                                  // switch target
    const ctrl = ctrls[t];
    if (!(ctrl && M.phase === 'play' && !ourBall(t))) continue;
    const q = switchTarget(t);
    if (!q) continue;
    groundRing(cam, q.x, q.y, BV_RING*1.45, ringCol(t), 2, [4, 3]);
    if (switchUseful(t)) targetCue(q, 'Switch', ringCol(t));
    bvChevron(cam, q, ringCol(t));
  }
  for (const t of [0, 1]) {                                  // kick aim
    const ctrl = ctrls[t], S = sideOf(t);
    if (!(S.charging && ctrl && b.carrier === ctrl)) continue;
    const n = M.career ? careerNatOf(ctrl) : M.nat[t], len = 10 + S.charge*(36 + n.kicking*3), ang = clamp(inputOf(t).world().y, -1.2, 1.2)*0.75;
    const wx = ctrl.x + dirOf(t)*len*Math.cos(ang), wy = ctrl.y + len*Math.sin(ang), q = pr(cam, wx, wy, 0);
    if (!q) continue;
    groundRing(cam, wx, wy, BV_RING*1.2, ringCol(t), 2.5);
    const hw = Math.max(5, 0.32*q.k), hh = hw*bvFlat(cam, q.z);
    ctx.beginPath(); ctx.moveTo(q.sx - hw, q.sy - hh); ctx.lineTo(q.sx + hw, q.sy + hh); ctx.moveTo(q.sx + hw, q.sy - hh); ctx.lineTo(q.sx - hw, q.sy + hh); ctx.stroke();
  }
  if (drill) { if (dd && dd.after) dd.after(cam, dt); dvBall(cam); } else if (BV.fade >= 1) bvBall(cam);
  drawTags(dt, 0.95*cam.F/cam.back);                         // its clocks must run; its impact ring stays a circle on the screen in this slice
  bvOverheads(cam, ctrls, plain);                            // the pointer, the ball's marker and the star, stacked over a man's head
  drawCalls(dt, t => bvCallAt(cam, t, plain));                // a possession call over that stack (src/calls.js)
  bvEdgeMarks(cam, plain);
  if (M.cut) drawCut();
  if (drill) drillDrawScreen();                              // a drill's own close-up or corner picture
}
