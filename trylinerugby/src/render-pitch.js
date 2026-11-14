/* =========================================================
   Rendering
   ========================================================= */
const cv = $('cv');
let ctx = cv.getContext('2d');   // let: paintMan points it at a sprite cell for one man
const V = { W:0, H:0, dpr:1, s:10 };
const C = { surround:'#0e2414', grassA:'#2a6233', grassB:'#2f6a38', line:'rgba(244,241,232,.92)', board:'#122018', boardHi:'#1c3125', pad:'#1b2747', ctrl:'#ffcf3d', p2:'#ff5fd2', head:'#2a1d16', outline:'#08110b' };
const ringCol = t => (seatOfTeam(t) === 1 ? C.p2 : C.ctrl);   // the ring, the pointer and the kick aim: gold for seat 0, pink for Player 2
const SHADOWS = [[0.45,0.35],[-0.45,0.35],[0.45,-0.35],[-0.45,-0.35]];

/* iPhone Safari can still zoom a page: a quick double tap, a rotation, or a pinch it lets through.
   Block the gestures, and if the page ever ends up zoomed, snap it back to 1. */
['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive:false }));
document.addEventListener('dblclick', e => e.preventDefault(), { passive:false });
function unzoom() {
  const vv = window.visualViewport, meta = document.querySelector('meta[name="viewport"]');
  if (!vv || !meta || vv.scale <= 1.01) return;
  const c = meta.content;
  meta.content = c.replace('maximum-scale=1', 'maximum-scale=1.01');   // a change to the tag makes Safari re-apply it
  requestAnimationFrame(() => { meta.content = c; window.scrollTo(0, 0); });
}
function resize() {
  V.dpr = Math.min(dprMax(), window.devicePixelRatio || 1);
  V.W = window.innerWidth; V.H = window.innerHeight;
  cv.width = Math.round(V.W*V.dpr); cv.height = Math.round(V.H*V.dpr);
}
function toS(x, y) {
  if (BV.on) return bvS(x, y);
  const s = V.s, c = M.cam;
  return [V.W/2 + (x-c.x)*s, V.H/2 + (y-c.y)*s];
}
function svec(x, y) { return [x, y]; }

function drawPitch() {
  const s = V.s, lw = Math.max(0.14, 1.3/s);
  ctx.fillStyle = C.surround; ctx.fillRect(-40, -40, 200, 150);
  // perimeter boards
  for (let i = -2; i < 25; i++) {
    ctx.fillStyle = i % 2 ? C.board : C.boardHi;
    ctx.fillRect(i*6, -6.5, 6, 1.6); ctx.fillRect(i*6, 74.9, 6, 1.6);
  }
  for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? C.grassA : C.grassB; ctx.fillRect(i*10, 0, 10, 70); }
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = M.kit[0].fill; ctx.fillRect(0, 0, 10, 70);
  ctx.fillStyle = M.kit[1].fill; ctx.fillRect(110, 0, 10, 70);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = C.line; ctx.lineWidth = lw;
  const line = (x0,y0,x1,y1) => { ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke(); };
  ctx.strokeRect(0, 0, 120, 70);
  for (const x of [10, 110, 32, 88, 60]) line(x, 0, x, 70);
  ctx.setLineDash([2, 2]);
  for (const x of [50, 70, 15, 105]) line(x, 0, x, 70);
  ctx.setLineDash([1, 4]);
  for (const y of [5, 15, 55, 65]) line(10, y, 110, y);
  ctx.setLineDash([]);
  line(59, 35, 61, 35);
  // posts with floodlight shadows
  for (const px of [10, 110]) {
    ctx.fillStyle = 'rgba(0,0,0,.07)';
    for (const [sx,sy] of [[2.2,1.4],[-2.2,1.4],[2.2,-1.4],[-2.2,-1.4]]) {
      ctx.beginPath(); ctx.moveTo(px, 32.2); ctx.lineTo(px+sx, 32.2+sy); ctx.lineTo(px+sx, 37.8+sy); ctx.lineTo(px, 37.8); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = '#f7f5ee'; ctx.lineWidth = Math.max(0.28, 2.2/s);
    line(px, 32.2, px, 37.8);
    for (const py of [32.2, 37.8]) {
      ctx.fillStyle = C.pad; ctx.beginPath(); ctx.arc(px, py, 0.55, 0, 7); ctx.fill();
      ctx.fillStyle = '#f7f5ee'; ctx.beginPath(); ctx.arc(px, py, 0.22, 0, 7); ctx.fill();
    }
    ctx.lineWidth = lw; ctx.strokeStyle = C.line;
  }
}
function ellipse(x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI*2); }
function drawPos(p) {                                      // where he is drawn: the logic's teleports (a slide-off, a roll-away) are smoothed over drawFrom.T
  const f = p.drawFrom;
  if (!f || f.t <= 0) return [p.x, p.y, 0];
  const u = clamp(f.t/f.T, 0, 1);                           // 1 at the jump, 0 once the drawing has caught up
  return [p.x + (f.x - p.x)*u, p.y + (f.y - p.y)*u, u];
}
function drawPlayer(p, r) {
  const [wx, wy, u] = drawPos(p);
  const [sx, sy] = toS(wx, wy);
  const kit = M.kit[p.team], k = p.bind, tackler = !!(k && p !== k.c);
  const [fx, fy] = svec(p.fx, p.fy);
  let ang = Math.atan2(fy, fx);
  ctx.fillStyle = 'rgba(0,0,0,.12)';
  for (const [ox, oy] of SHADOWS) { ellipse(sx + ox*r, sy + oy*r, r*0.95, r*0.75); ctx.fill(); }
  const sp = hyp(p.vx, p.vy), spr = sprintLevel(p);
  const fire = onFire(p.team);
  if (fire && p.down <= 0) {                                 // On Fire: an orange glow under every man on the side, pulsing
    ctx.fillStyle = `rgba(255,110,30,${(0.30 + 0.12*Math.sin(M.rt*2*Math.PI*3)).toFixed(3)})`;
    ellipse(sx, sy, r*1.55, r*1.3); ctx.fill();
  }
  if (p.down <= 0 && !k && (p.boost > 0 || spr > 0 || p.chase > 0 || fire || (M.surge && M.surge.team === p.team)) && sp > (fire ? 1.5 : 3)) {
    const tx = -p.vx/sp, ty = -p.vy/sp;
    ctx.fillStyle = fire ? 'rgba(255,110,30,.6)' : (p.boost > 0 || spr > 0 || p.chase > 0) ? 'rgba(255,207,61,.35)' : 'rgba(244,241,232,.18)';   // On Fire burns orange; a burst, a sprint and the kick chase (src/chase.js) gold
    for (const kk of [1.1, 2.0]) { ellipse(sx + tx*r*kk, sy + ty*r*kk, r*(1 - kk*0.22), r*(0.85 - kk*0.2)); ctx.fill(); }
    if (spr > 0) {                                           // a sprint: two speed streaks behind him
      ctx.strokeStyle = `rgba(244,241,232,${(0.55*spr).toFixed(3)})`; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (const side of [-1, 1]) { const ox = -ty*side*r*0.75, oy = tx*side*r*0.75; ctx.beginPath(); ctx.moveTo(sx + ox + tx*r*1.2, sy + oy + ty*r*1.2); ctx.lineTo(sx + ox + tx*r*2.8, sy + oy + ty*r*2.8); ctx.stroke(); }
    }
  }
  ctx.save(); ctx.translate(sx, sy);
  if (tackler) { const off = p.bindOff || { x:1, y:0 }; ctx.rotate(Math.atan2(off.y, off.x) + Math.PI/2); ctx.scale(0.85, 0.85); }   // bound across the carrier's hips, on the side he came from
  else {
    if (p.down > 0 && u > 0 && p.drawFrom.spin) ang += p.drawFrom.spin*Math.PI/2*u;   // the slide-off: a quarter turn away from the carrier as he lands
    if (p.stumble > 0) ang += 9*D2R*Math.sin(M.rt*2*Math.PI*14);                      // the wobble after an ankle tap
    ctx.rotate(ang);
  }
  ctx.strokeStyle = C.outline; ctx.lineWidth = Math.max(1.4, r*0.15);
  if (p.down > 0 || tackler) {
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = kit.fill; ellipse(0, 0, r*1.3, r*0.58); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.head; ctx.beginPath(); ctx.arc(r*1.05, 0, r*0.36, 0, 7); ctx.fill();
  } else {
    const lean = k ? (k.tier === 'soft' ? 0.15 : k.tier === 'dom' && k.t/k.T >= 0.4 ? -0.12 : 0) : 0;   // a bound carrier leans into a Soft tackle, stands up in a Wrap, recoils from a Big Hit
    const boots = lockerBoots(p.team, p); if (boots) lockerFeet(boots, r, p);   // the Locker's boots on your side, under the body so the toes show as he runs (src/locker.js)
    ctx.fillStyle = kit.trim;
    ctx.beginPath(); ctx.arc(lean*r, -r*0.86, r*0.3, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(lean*r, r*0.86, r*0.3, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = kit.fill; ellipse(lean*r*0.5, 0, r*0.62*(1 + Math.abs(lean)), r*0.92); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.head; ctx.beginPath(); ctx.arc(r*0.1 + lean*r*1.4, 0, r*0.4, 0, 7); ctx.fill();
  }
  ctx.restore();
  if (p.fend > 0) {                                          // the fend: an arm out at the man he has just beaten, in his trim colour
    const a = p.fendA, l = r*(0.9 + 0.5*(1 - p.fend/0.2));
    ctx.strokeStyle = kit.trim; ctx.lineWidth = Math.max(2, r*0.22); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx + Math.cos(a)*r*0.4, sy + Math.sin(a)*r*0.4); ctx.lineTo(sx + Math.cos(a)*l, sy + Math.sin(a)*l); ctx.stroke();
  }
}
function drawTags(dt, r) {                                 // on-pitch tags: chalk, outlined, rising 14px over 0.7s, fading over the last 0.25s, at most two
  if (M.fx.length) {                                       // the Big Hit's impact ring grows from 0.3m to 1.6m over 0.22s
    for (const f of M.fx) { const u = clamp(f.t/0.22, 0, 1), [x, y] = toS(f.x, f.y); ctx.strokeStyle = `rgba(255,255,255,${(0.8*(1 - u)).toFixed(3)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, (0.3 + 1.3*u)*V.s, 0, 7); ctx.stroke(); f.t += dt; }
    M.fx = M.fx.filter(f => f.t < 0.22);
  }
  if (!M.tags.length) return;
  ctx.font = `800 16px 'Big Shoulders Display', Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,14,10,.85)'; ctx.fillStyle = '#f1eee4';
  for (const t of M.tags) {
    if (t.call) continue;                                          // a possession call is drawn on its own, over the men's marks (drawCalls)
    const u = clamp(t.t/0.7, 0, 1), a = t.t > 0.45 ? clamp(1 - (t.t - 0.45)/0.25, 0, 1) : 1;
    let [x, y] = toS(t.x, t.y);
    const edge = tagBox();                                          // insets 0: 76 / 60 / W-200, as before. A right inset walks the clamp in with the buttons
    y = Math.max(edge.top, y - 2.2*r - 14*u); x = clamp(x, edge.left, V.W - edge.right);
    ctx.globalAlpha = a; ctx.strokeText(t.text.toUpperCase(), x, y); ctx.fillText(t.text.toUpperCase(), x, y);
    t.t += dt;
  }
  ctx.globalAlpha = 1;
  M.tags = M.tags.filter(t => t.t < (t.call ? callsLv('life') || 0.9 : 0.7));
}
/* The possession call (src/calls.js): a dark plate edged in its colour (t.k: his side's, lightened to show, or in Two Player his seat's)
   with its word in chalk, going with the new carrier. Where it stands is chosen once, on its first frame (callPlace), so it never
   jumps: over his pointer; under his ring where the banner would sit on the plate or between it and him; beside him where both are
   taken. The banner's box is the one it is laid out at, not the one its pop is still growing. In Two Player it never sits on the other
   person's man (his ring, his pointer and seat mark), and beside him it goes on the side away from that man. It rises
   CALL_RISE px over its life (it holds still under reduced motion) and fades over its last quarter second; a place is clear only if
   the plate is clear all the way up its rise. Where no place is clear (the banner over him and the other person's man under him, say)
   it takes the one least on that man, then least on his own man, then least under the banner, and never falls back onto that man.
   While he is off the frame its clock waits for him, for up to CALLS.hold seconds, so the call is there when the camera reaches him.
   at(t): { x, top, foot, half }, the screen x, the y the plate stands on over him, the y it hangs from under him and his ring's half
   width, or null while he is off the frame. */
const CALL_H = 26, CALL_GAP = 10, CALL_RISE = 6;           // the plate's height; its gap from his ring when it stands beside him; how far it rises over its life
function bannerBox() {                                     // the banner's laid-out box while one shows (the page lays it out over the canvas), or null
  const el = document.getElementById('banner'), m = el && el.firstElementChild;
  if (!m || typeof el.getBoundingClientRect !== 'function' || !(m.offsetWidth > 0)) return null;
  const r = el.getBoundingClientRect(), left = r.left + m.offsetLeft, top = r.top + m.offsetTop;   // offsets are the layout's: the pop's transform is not in them
  return { left, top, right:left + m.offsetWidth, bottom:top + m.offsetHeight };
}
const boxOn = (a, b, pad) => (a && b ? Math.max(0, Math.min(a.right, b.right + pad) - Math.max(a.left, b.left - pad))*Math.max(0, Math.min(a.bottom, b.bottom + pad) - Math.max(a.top, b.top - pad)) : 0);   // how much of box a is on box b grown by pad, in px2: 0 where they are clear
function callSpot(place, pt, w, lift, edge) {               // the plate's centre at a place, this frame: x kept inside the tags' box (clear of the buttons), as a tag's is
  const h = CALL_H, half = pt.half || 12, side = place === 'left' ? -1 : place === 'right' ? 1 : 0;
  const x = pt.x + side*(half + CALL_GAP + w/2), cx = clamp(x, Math.max(edge.left, w/2 + 6), V.W - Math.max(edge.right, w/2 + 6));
  if (side) return { x:cx, y:clamp((pt.top + pt.foot)/2 - lift, edge.top + h/2, V.H - h/2 - 4), squeezed:Math.abs(cx - x) > 2 };
  if (place === 'under') return { x:cx, y:Math.min(V.H - h/2 - 4, pt.foot + h/2 - lift) };
  return { x:cx, y:Math.max(edge.top + h/2, pt.top - h/2 - lift) };
}
function callPlace(t, pt, w, edge, at) {                   // over him, under him, or beside him: the first clear of the banner and of the other person's man, all the way up its rise
  const ban = bannerBox(), h = CALL_H, rise = RM ? 0 : CALL_RISE;
  const others = [0, 1].filter(s => t.p && s !== t.p.team && isHuman(s) && ctrlOf(s) && ctrlOf(s) !== t.p).map(s => at({ p:ctrlOf(s) })).filter(Boolean)
    .map(o => ({ left:o.x - (o.half || 12), right:o.x + (o.half || 12), top:o.top, bottom:o.foot }));
  const cost = place => {                                   // [on the other person's man, on his own man, under the banner]: all 0 is clear
    const c = callSpot(place, pt, w, 0, edge), up = callSpot(place, pt, w, rise, edge);
    const plate = { left:c.x - w/2, right:c.x + w/2, top:Math.min(c.y, up.y) - h/2, bottom:Math.max(c.y, up.y) + h/2 };   // every frame of its life, from where it starts to the top of its rise
    const reach = place === 'over' ? { ...plate, bottom:Math.max(plate.bottom, pt.top + 12) } : plate;   // over him: the banner may not sit on the plate, nor between it and his pointer
    const him = c.squeezed || (place === 'over' && pt.top - h < edge.top) ? 1 : 0;              // beside him with the edge of the frame or the buttons pushing it onto him; over him with the top of the frame doing so
    return [others.reduce((a, o) => a + boxOn(plate, o, 2), 0), him, boxOn(reach, ban, 6)];
  };
  const side = others.length ? (others[0].left + others[0].right > 2*pt.x ? 'left' : 'right') : pt.x > V.W/2 ? 'left' : 'right';   // away from the other person's man, or towards the middle
  const ways = ['over', 'under', side, side === 'left' ? 'right' : 'left'].map(place => ({ place, c:cost(place) }));
  const less = (a, b) => a.c[0] - b.c[0] || a.c[1] - b.c[1] || a.c[2] - b.c[2];
  return ways.reduce((best, x) => (less(x, best) < 0 ? x : best)).place;   // the first clear one; where none is, the least on the other person's man, then on his own, then under the banner (in that order on a tie)
}
function drawCalls(dt, at) {
  if (!M.tags.length) return;
  const L = callsLv('life') || 0.9, hold = callsLv('hold') || 0, edge = tagBox();
  let on = false;
  for (const t of M.tags) {
    if (!t.call) continue;
    const pt = at(t);
    if (!pt) { t.hid = (t.hid || 0) + dt; if (t.hid > hold) t.t += dt; continue; }      // off the frame: its clock waits for him, for so long
    t.t += dt;
    if (!on) { on = true; ctx.save(); ctx.font = `800 17px 'Big Shoulders Display', Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; }
    const u = clamp(t.t/L, 0, 1), a = clamp((L - t.t)/0.25, 0, 1), text = t.text.toUpperCase(), lift = RM ? 0 : CALL_RISE*u;
    const m = ctx.measureText(text), w = ((m && m.width) || text.length*8.5) + 22, h = CALL_H;
    if (!t.place) t.place = callPlace(t, pt, w, edge, at);                                // once: it never jumps
    const c = callSpot(t.place, pt, w, lift, edge), x = c.x, y = c.y;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(8,14,10,.9)'; rrect(x - w/2, y - h/2, w, h, 5); ctx.fill();
    ctx.strokeStyle = t.k || C.line; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#f1eee4'; ctx.fillText(text, x, y + 1);
  }
  if (on) ctx.restore();
}
function drawBall(r) {
  const b = M.ball, s = V.s;
  const [gx, gy] = toS(b.x, b.y);
  const rx = Math.max(4.4, 0.4*s);
  const scG = 1/(1 + Math.max(0, b.z)*0.16);             // the shadow shrinks as the ball climbs, so a long pass reads as a loop
  ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.globalAlpha = 0.45 + 0.55*scG;
  ellipse(gx, gy, rx*0.9*scG, rx*0.55*scG); ctx.fill(); ctx.globalAlpha = 1;
  const lift = b.z*s*0.55, sc = 1 + Math.min(b.z, 20)*0.035;
  let ang = 0;
  if (b.state === 'held') { const [fx, fy] = svec(b.carrier.fx, b.carrier.fy); ang = Math.atan2(fy, fx); }
  else { const [vx, vy] = svec(b.vx, b.vy); if (hyp(vx, vy) > 0.5) ang = Math.atan2(vy, vx); }
  const tum = b.tumble != null && b.state !== 'held' ? b.tumble : null;   // Bouncy Egg: the ball tumbles end over end, so its length comes and goes as it turns. Nothing else sets it
  if (tum != null) ang += tum*0.35;
  const len = tum == null ? 1 : 0.62 + 0.38*Math.abs(Math.cos(tum));
  ctx.save(); ctx.translate(gx, gy - lift); ctx.rotate(ang);
  const look = lockerBall();                               // the Locker's ball in a match you play, or null for the classic one (src/locker.js)
  ctx.fillStyle = look ? lockerBallFill(look, rx*sc) : '#f6f3ea'; ctx.strokeStyle = look ? look.line : '#3b2f22'; ctx.lineWidth = 1.2;
  ellipse(0, 0, rx*sc*len, rx*0.62*sc); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(59,47,34,.6)'; ctx.beginPath(); ctx.moveTo(-rx*0.45*sc, 0); ctx.lineTo(rx*0.45*sc, 0); ctx.stroke();
  ctx.restore();
}
