/* ---------- close-up view: a side-on broadcast camera ---------- */
const CROWD = Array.from({ length:280 }, () => [Math.random(), Math.random(), Math.floor(Math.random()*5)]);
const CROWD_C = ['#2b3a4a', '#4a3a2e', '#6b5a48', '#203528', '#5a2f35'];
let SKIN = '#c69c7c', HAIR = '#2a1d16';   // let: paintMan sets them for one man
function luma(hex) { const [r, g, b] = hexRgb(hex); return (0.299*r + 0.587*g + 0.114*b)/255; }
function shade(hex, k) { const a = hexRgb(hex); return `rgb(${a.map(v => Math.round(v*(1-k) + 11*k)).join(',')})`; }
function kitOf(team, p = null) { const k = M.kit[team]; return { shirt:k.fill, trim:k.trim, hoops:k.hoops, shorts:luma(k.fill) > 0.6 ? '#1b2233' : '#ece9df', boots:lockerBoots(team, p) }; }   // boots: the Locker's on your side in a match you play, else null for black (src/locker.js); p, the man drawn when a close-up knows him, so a career's are his alone
function seg(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function rrect(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function cutGeom() { const W = V.W, H = V.H; return { W, H, horizon:H*0.38, ground:H*0.83, sc:H*0.15 }; }
function drawStage(g) {
  const { W, H, horizon } = g;
  const st = ctx.createLinearGradient(0, 0, 0, horizon);
  st.addColorStop(0, '#05080a'); st.addColorStop(1, '#14201a');
  ctx.fillStyle = st; ctx.fillRect(0, 0, W, horizon);
  for (const [cx, cy, k] of CROWD) { ctx.fillStyle = CROWD_C[k]; ctx.fillRect(cx*W, horizon*0.22 + cy*horizon*0.66, 3, 3); }
  for (const fx of [0.1, 0.9]) {
    const gl = ctx.createRadialGradient(W*fx, 0, 0, W*fx, 0, H*0.6);
    gl.addColorStop(0, 'rgba(255,238,196,.32)'); gl.addColorStop(1, 'rgba(255,238,196,0)');
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H*0.6);
  }
  ctx.fillStyle = '#0c1611'; ctx.fillRect(0, horizon - H*0.04, W, H*0.04);
  ctx.fillStyle = '#2b6334'; ctx.fillRect(0, horizon, W, H - horizon);
  const vx = W*0.5, vy = horizon - H*0.9, k = (horizon - vy)/(H - vy);
  ctx.fillStyle = '#326e3b';
  for (let i = -14; i < 14; i += 2) {
    const a = vx + i*W*0.09, b = vx + (i+1)*W*0.09;
    ctx.beginPath(); ctx.moveTo(a, H); ctx.lineTo(b, H); ctx.lineTo(vx + (b-vx)*k, horizon); ctx.lineTo(vx + (a-vx)*k, horizon); ctx.closePath(); ctx.fill();
  }
  const sh = ctx.createLinearGradient(0, horizon, 0, H);
  sh.addColorStop(0, 'rgba(0,0,0,.35)'); sh.addColorStop(0.4, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh; ctx.fillRect(0, horizon, W, H - horizon);
}
/* A side-on player. x/gy: feet position in px; sc: px per metre.
   o.face 1 = facing right; o.lean 0..1 bends the body forward (1 = horizontal);
   o.crouch 0..1; o.lift metres off the ground; o.arms down|up|bind|reach|carry; o.stride run phase. */
function fig(x, gy, sc, kit0, o) {
  const f = o.face || 1, lift = (o.lift || 0)*sc, lean = o.lean || 0, cr = o.crouch || 0, w = sc*0.15;
  const dk = o.dim || 0, tone = h => dk ? shade(h, dk) : h;
  const kit = { shirt:tone(kit0.shirt), trim:tone(kit0.trim), shorts:tone(kit0.shorts) }, skin = tone(SKIN), hair = tone(HAIR);
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ellipse(x, gy, sc*(0.42 - Math.min(o.lift || 0, 1.5)*0.12), sc*0.08); ctx.fill();
  ctx.save(); ctx.translate(x, gy - lift); ctx.scale(f, 1);
  ctx.lineCap = 'round';
  const hipH = (0.95 - cr*0.4)*sc, st = o.stride || 0;
  for (const [hx, sw] of [[-0.04*sc, Math.sin(st)], [0.04*sc, -Math.sin(st)]]) {
    let fx = hx + sw*0.34*sc + lean*0.12*sc, kx = (hx + fx)/2 + cr*0.3*sc + sw*0.06*sc, ky = -hipH*0.5;
    if (o.drive) { fx = hx - 0.55*sc + sw*0.06*sc; kx = hx - 0.12*sc; ky = -hipH*0.42; }
    ctx.strokeStyle = kit.shorts; ctx.lineWidth = w*1.15; seg(hx, -hipH, kx, ky);
    ctx.strokeStyle = kit.shirt; ctx.lineWidth = w*0.85; seg(kx, ky, fx, -0.07*sc);
    ctx.fillStyle = kit0.boots || '#111'; ctx.fillRect(fx - 0.04*sc, -0.08*sc, 0.2*sc, 0.08*sc);
  }
  ctx.translate(0, -hipH); ctx.rotate(lean*1.42);
  ctx.strokeStyle = C.outline; ctx.lineWidth = 1.5;
  ctx.fillStyle = kit.shirt; rrect(-0.2*sc, -0.64*sc, 0.4*sc, 0.68*sc, 0.12*sc); ctx.fill(); ctx.stroke();
  ctx.fillStyle = kit.trim; ctx.fillRect(-0.19*sc, -0.5*sc, 0.38*sc, 0.07*sc);
  if (kit0.hoops) { ctx.fillRect(-0.19*sc, -0.34*sc, 0.38*sc, 0.07*sc); ctx.fillRect(-0.19*sc, -0.18*sc, 0.38*sc, 0.07*sc); }
  ctx.fillStyle = kit.shorts; rrect(-0.21*sc, -0.06*sc, 0.42*sc, 0.16*sc, 0.05*sc); ctx.fill();
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0.04*sc, -0.78*sc, 0.13*sc, 0, 7); ctx.fill();
  ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(0.02*sc, -0.81*sc, 0.135*sc, Math.PI*0.85, Math.PI*2.05); ctx.fill();
  const sx = 0.03*sc, sy = -0.56*sc;
  const ARMS = { up:[0.1, -1.24], bind:[0.56, -0.48], reach:[0.62, -0.78], carry:[0.3, -0.32], down:[0.1, -0.1] };
  const [ex, ey] = (ARMS[o.arms] || ARMS.down).map(v => v*sc);
  const mx = (sx + ex)/2, my = (sy + ey)/2;
  ctx.strokeStyle = kit.shirt; ctx.lineWidth = w*0.85; seg(sx, sy, mx, my);
  ctx.strokeStyle = skin; ctx.lineWidth = w*0.7; seg(mx, my, ex, ey);
  ctx.restore();
}
function cutBall(x, y, sc, ang) {
  const rx = Math.max(5, sc*0.17);
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0);
  const look = lockerBall();                               // the Locker's ball in a match you play (src/locker.js)
  ctx.fillStyle = look ? lockerBallFill(look, rx) : '#f6f3ea'; ctx.strokeStyle = look ? look.line : '#3b2f22'; ctx.lineWidth = 1.4;
  ellipse(0, 0, rx, rx*0.62); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function cutText(text, y, size, alpha) {
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0*(alpha == null ? 1 : alpha);
  ctx.font = `900 ${Math.round(size)}px 'Big Shoulders Display', Impact, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillText(text.toUpperCase(), V.W/2 + 2, y + 3);
  ctx.fillStyle = '#f1eee4'; ctx.fillText(text.toUpperCase(), V.W/2, y);
  ctx.globalAlpha = a0;
}
function cutTag(text, g) {
  ctx.font = `700 ${Math.round(g.H*0.034)}px 'Atkinson Hyperlegible', system-ui, sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#a7b4a9';
  ctx.fillText(text.toUpperCase(), 16, g.H*0.035);
}
/* two player: each player's cue in the bottom bar of a close-up, in his colour and naming his own key (the on-screen buttons are off,
   so this is where a pair learns that Kick at goal, Push and Jump are the Pass key). The owner's cue stays until the verdict; the
   other player's until his choice locks. [[seat, text], ...], Player 1's first */
const KEYCAP = { KeyW:'W', KeyA:'A', KeyS:'S', KeyD:'D', KeyF:'F', KeyG:'G', KeyH:'H', KeyJ:'J', KeyK:'K', KeyL:'L', Slash:'/', Period:'.', Comma:',', Space:'Space', ShiftLeft:'Shift', ShiftRight:'Shift', Numpad1:'Num 1', Numpad2:'Num 2', Numpad3:'Num 3' };
function seatKey(s, act) {                                 // what seat s presses for an action, as the screen names it: a keycap, or a controller button by its position
  const sch = seatScheme(s);
  if (!sch) return act === 'a' ? 'Bottom Button' : act === 'b' ? 'Right Button' : act === 'c' ? 'Shoulder' : act === 'x' ? 'Stick' : 'Stick';
  if (act === 'x') return sch === 'right' ? 'Arrows' : 'A D';   // a sideways step or guard
  if (act === 'm') return sch === 'right' ? 'Arrows' : 'W A S D';
  return KEYCAP[KB[sch][act][0]] || KB[sch][act][0];
}
function cutCues(c) {
  const out = [], key = (t, act) => seatKey(seatOfTeam(t), act);
  if (c.kind === 'scrum') { for (const t of [0, 1]) out.push([seatOfTeam(t), key(t, 'a') + ' · Push']); return out; }
  if (c.kind === 'lineout') { for (const t of [0, 1]) out.push([seatOfTeam(t), key(t, 'a') + ' · Jump']); return out; }
  if (c.kind === 'maul') return c.result ? out : maulCues(c);   // src/maul.js
  if (c.kind === 'goal') { const t = c.g.team; if (!c.after && !c.g.out && !c.g.watch) out.push([seatOfTeam(t), c.g.type === 'drop' ? key(t, 'b') + ' · Drop Goal' : 'Hold ' + key(t, 'a') + ' · Kick']); return out; }
  if (c.out != null) return out;
  const k = c.kind, U = c.own, O = 1 - c.own;
  out.push([seatOfTeam(U), k === 'past' ? key(U, 'x') + ' · Step Left · Step Right' : k === 'pass' ? key(U, 'a') + ' Pass · ' + key(U, 'b') + ' Dummy' : k === 'tackle' ? key(U, 'a') + ' · Tackle' : key(U, 'a') + ' · Block']);
  if (!c.locked) out.push([seatOfTeam(O), k === 'past' ? key(O, 'x') + ' · Guard Left · Guard Right' : k === 'pass' ? key(O, 'x') + ' · Drift · Rush' : k === 'tackle' ? key(O, 'x') + ' · Step Left · Step Right' : key(O, 'b') + ' · Dummy']);
  out.sort((a, b) => a[0] - b[0]);
  return out;
}
function cutSeatTag(s, x, y, size) {                       // two player: a seat tag (the numeral on the seat colour) over a figure in a close-up, its bottom edge at y
  if (s == null) return;
  const w = Math.max(14, size), h = w*0.9;
  ctx.fillStyle = s === 1 ? C.p2 : C.ctrl; rrect(x - w/2, y - h, w, h, w*0.18); ctx.fill();
  ctx.fillStyle = TAG_INK[s]; ctx.font = `900 ${Math.round(w*0.72)}px 'Big Shoulders Display', Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(s + 1), x, y - h/2 + 0.5);
}
function drawCutCues(c, g) {
  const cues = cutCues(c); if (!cues.length) return;
  ctx.font = `700 ${Math.round(g.H*0.034)}px 'Atkinson Hyperlegible', system-ui, sans-serif`; ctx.textBaseline = 'middle';
  for (const [s, text] of cues) {
    ctx.fillStyle = s === 1 ? C.p2 : C.ctrl; ctx.textAlign = s === 1 ? 'right' : 'left';
    ctx.fillText(('Player ' + (s + 1) + ' · ' + text).toUpperCase(), s === 1 ? g.W - 16 : 16, g.H*0.965);
  }
}
function drawScrum(c, g) {
  if (practice) dvStage(g.H*0.62); else drawStage(g);
  const { W, H } = g, sc = H*0.2, ground = H*0.85;
  const t = c.t, engaged = t >= SCRUM_SET;
  const mid = W*0.5 + scrumShown(c)*sc*0.7 + (engaged && !c.result ? Math.sin(t*31)*1.5 : 0);   // the packs meet on the line at dead level and lean the way of the pack ahead, as the bar does
  const gap = engaged ? 0 : t < 0.75 ? 0.9 : 0.4;
  const lean = engaged ? 1 : t < 0.75 ? 0.5 : 0.85, crouch = engaged ? 0.75 : t < 0.75 ? 0.35 : 0.65;
  // far prop, hooker, near prop: the far two sit just behind and darker
  for (const [k, dy, dim] of [[0.86, -0.045, 0.42], [0.93, -0.022, 0.22], [1, 0, 0]]) {
    const s = sc*k;
    for (const team of [1, 0]) {
      const f = team === 0 ? 1 : -1;
      if (!(practice && dvScrumMan(team, dim ? (dim > 0.3 ? 2 : 1) : 0, mid - f*(0.92 + gap/2)*s, ground + dy*H, s, f, t, engaged))) fig(mid - f*(0.92 + gap/2)*s, ground + dy*H, s, kitOf(team), { face:f, lean, crouch, arms:'down', drive:t >= 0.75, dim });
    }
  }
  if (M.two) for (const team of [0, 1]) {                     // the seat tag over each pack, and that pack's Early or Good Hit for 0.9s
    const f = team === 0 ? 1 : -1, px = mid - f*(0.92 + gap/2)*sc, ty = ground - 1.75*sc, tag = Math.max(16, H*0.045);
    cutSeatTag(seatOfTeam(team), px, ty, tag);
    const m = c.msg[team];
    if (m && t - m.at < 0.9) { ctx.fillStyle = ringCol(team); ctx.font = `800 ${Math.round(H*0.045)}px 'Big Shoulders Display', Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(m.text.toUpperCase(), px, ty - tag*0.9 - 4); }
  }
  // whose ball it will be (2026-11-09): the bar's middle is the line that decides it, and the feeder's head start leans the bar its
  // way from Crouch (SCRUM_HEAD). Each half fills at that pack's penalty line, in the colour of the pack ahead; dead level shows no
  // fill and is the feeder's. The ball sits between the bar and the name of the side whose ball it is. A drill's bar has no ball:
  // its line is the mark, and it reads as it always did
  const bw = W*0.38, bx = W*0.5 - bw/2, by = H*0.885, bh = Math.max(8, H*0.022), frac = scrumBar(c), rb = bh*1.1, slot = practice ? 0 : 2*rb + 8;
  // the feed: the ball waits at the mouth of the tunnel, clear of the bar, then rolls in
  const roll = engaged ? clamp((t - SCRUM_SET - 0.2)/0.35, 0, 1) : 0, shF = c.feed === 0 ? 1 : -1, fs = sc*(1.1 - 0.25*roll);
  cutBall(mid - shF*0.5*sc*(1 - roll), Math.min(ground + (0.06 - 0.075*roll)*H, by - 7 - Math.max(5, fs*0.17)*0.62), fs, roll*6);
  // calls
  const call = t < 0.75 ? 'Crouch' : t < 1.3 ? 'Bind' : t < 1.9 ? 'Set' : null;
  if (call && t > CUT_IN) cutText(call, H*0.37, H*(call === 'Set' ? 0.17 : 0.13), call === 'Set' ? 1 : 0.92);
  ctx.fillStyle = 'rgba(8,14,10,.8)'; rrect(bx - 3, by - 3, bw + 6, bh + 6, 4); ctx.fill();
  ctx.fillStyle = M.two ? (frac >= 0 ? ringCol(0) : ringCol(1)) : (frac >= 0 ? C.ctrl : showCol(1));   // two player: each pack's gain in its player's colour
  if (frac > 0) ctx.fillRect(W*0.5, by, bw/2*frac, bh); else if (frac < 0) ctx.fillRect(W*0.5 + bw/2*frac, by, -bw/2*frac, bh);
  ctx.fillStyle = '#f1eee4'; ctx.fillRect(W*0.5 - 2, by - 6, 4, bh + 12);   // the line
  ctx.font = `800 ${Math.round(H*0.04)}px 'Big Shoulders Display', Impact, sans-serif`; ctx.textBaseline = 'middle';
  ctx.textAlign = 'right'; ctx.fillText(practice ? 'YOU' : M.nat[0].id, bx - 10 - slot, by + bh/2);
  ctx.textAlign = 'left'; ctx.fillText(practice ? 'THEM' : M.nat[1].id, bx + bw + 10 + slot, by + bh/2);
  if (!practice) cutBall(scrumAhead(c) === 0 ? bx - 7 - rb : bx + bw + 7 + rb, by + bh/2, rb/0.17);
}
function drawLineout(c, g) {
  drawStage(g);
  const { W, H, ground } = g, t = c.t;
  const sc = Math.min(g.sc, (W*0.96 - W*0.3)/((LINE_X + 1.15)*0.9 + 0.25));   // the far lifter stays on screen
  const X = m => W*0.3 + m*sc*0.9;   // clear of the joystick on the left
  ctx.strokeStyle = 'rgba(244,241,232,.85)'; ctx.lineWidth = 3;
  seg(X(-0.6), H, X(-0.6) + (W*0.5 - X(-0.6))*0.18, g.horizon);
  const thrown = t >= c.throwT;
  fig(X(-0.2), ground + 0.05*H, sc*1.08, kitOf(c.team), { face:1, arms:thrown ? 'reach' : 'up', crouch:thrown ? 0 : 0.1, lean:thrown ? 0.15 : 0 });
  for (const team of [1, 0]) {
    const k = team === 0 ? 1 : 0.88, off = team === 0 ? 0 : 0.4, gy = ground + (team === 0 ? 0 : -0.08*H), s = sc*k;
    const lift = liftAt(c.jump[team] == null ? null : t - c.jump[team]);
    const kit = kitOf(team);
    fig(X(LINE_X + off - 0.75), gy, s, kit, { face:-1, arms:lift > 0.3 ? 'up' : 'carry', crouch:lift > 0.3 ? 0.05 : 0.3 });
    fig(X(LINE_X + off + 0.75), gy, s, kit, { face:-1, arms:lift > 0.3 ? 'up' : 'carry', crouch:lift > 0.3 ? 0.05 : 0.3 });
    fig(X(LINE_X + off), gy, s, kit, { face:-1, lift, arms:lift > 0.15 || (c.winner === team) ? 'up' : 'down' });
    if (M.two) cutSeatTag(seatOfTeam(team), X(LINE_X + off), gy - (lift + 2.45)*s, Math.max(16, H*0.045));   // the seat tag over each jumper
  }
  let bx, bh, ang = 0;
  if (!thrown) { bx = -0.05; bh = 2.5; }
  else if (c.outcome === 'caught') { const off = c.winner === 0 ? 0 : 0.4; bx = LINE_X + off; bh = handAt(c, c.winner, t) + 0.08; }
  else {
    const u = (t - c.throwT)/c.flight;
    if (u <= 1) { bx = -0.05 + (LINE_X + 0.05)*u; bh = 2.5 + (c.catchH - 2.5)*u + 2.8*u*(1-u); ang = -0.5 + u; }
    else { bx = LINE_X + (u-1)*LINE_X*1.1; bh = Math.max(0.1, c.catchH - (u-1)*5); ang = u; }
  }
  const gyB = c.outcome === 'caught' && c.winner === 1 ? ground - 0.08*H : ground;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ellipse(X(bx), gyB, sc*0.12, sc*0.035); ctx.fill();
  cutBall(X(bx), gyB - bh*sc*(c.outcome === 'caught' && c.winner === 1 ? 0.88 : 1), sc, ang);
}
function drawCut() {
  const c = M.cut; if (!c) return;
  const g = cutGeom();
  const ease = u => 1 - Math.pow(1 - u, 3);
  const ein = ease(clamp(c.t/CUT_IN, 0, 1)), eout = c.exit > 0 ? ease(clamp(c.exit/CUT_OUT, 0, 1)) : 0;
  const left = RM ? 0 : eout*g.W, right = RM ? g.W : ein*g.W;
  if (right - left <= 0.5) return;
  ctx.save();
  if (RM) ctx.globalAlpha = Math.min(ein, 1 - eout);
  ctx.beginPath(); ctx.rect(left, 0, right - left, g.H); ctx.clip();
  if (c.kind === 'scrum') drawScrum(c, g);
  else if (c.kind === 'lineout') drawLineout(c, g);
  else if (c.kind === 'goal') drawKick(c, g);
  else if (c.kind === 'maul') drawMaul(c, g);              // src/render-maul.js
  else drawDuel(c, g);
  if (!practice) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, g.W, g.H*0.07); ctx.fillRect(0, g.H*0.93, g.W, g.H*0.07); }   // the broadcast bars are a match's
  if (!(hintShown[0] && hintShown[0].title)) cutTag(cutTitle(c), g);   // a hints card with a title sits where the tag goes and names the moment itself
  if (M.two) drawCutCues(c, g);
  ctx.restore();
  if (RM) return;
  ctx.fillStyle = C.ctrl;
  if (ein < 1) ctx.fillRect(right - 3, 0, 6, g.H);
  if (eout > 0 && eout < 1) ctx.fillRect(left - 3, 0, 6, g.H);
}
