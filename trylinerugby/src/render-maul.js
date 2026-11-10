/* ---------- the maul's close-up (src/maul.js): side-on, four a side, as the scrum's ----------
   The two packs bound round the ball carrier, Bind then Drive, the maul turned by its wheel (the far men slide as it turns), a bar for
   the metres driven at the foot between the stick and the buttons, and a pitch strip top right showing where it is going. */
function maulGeom(W, H, ins, two) {                        // where the bar and the strip sit; tools/maul.mjs measures them against the stick, the buttons and the hints cards
  ins = ins || { t:0, r:0, b:0, l:0 };
  const bw = W*0.34, bh = Math.max(8, H*0.022), sw = clamp(W*0.18, 110, 160), sh = sw*70/120, sx = W - Math.max(16, ins.r + 8) - sw;
  return { bar:{ x:W*0.5 - bw/2, y:H*0.885, w:bw, h:bh }, strip:{ x:sx, y:two ? H*0.93 - sh - 10 : H*0.33, w:sw, h:sh }, call:{ y:H*0.37, size:H*0.17 } };   // two player: Player 2's hints card is top right and there is no Push button, so the strip sits bottom right
}
const maulCol = t => (M.two ? ringCol(t) : isHuman(t) ? C.ctrl : showCol(t));   // a pack's colour on the bar and the strip: yours gold, theirs their shirt (two player: each seat's)
const MAUL_MEN = [[-0.66, -0.3, 1], [-0.66, 0.38], [-1.16, -0.05], [-1.62, 0.3], [0.66, -0.3], [0.66, 0.38], [1.16, 0.05], [1.62, -0.25]];   // [along the drive, across (far +), the carrier]: the attack's four behind the line of contact, the defence's in front
function drawMaul(c, g) {
  drawStage(g);
  const { W, H } = g, sc = H*0.185, ground = H*0.84, t = c.t, att = c.team, d = dirOf(att), a = c.ang;
  const engaged = t >= MAUL.set, live = engaged && !c.result;
  const mid = W*0.5 + d*clamp(c.fwd, -1.5, 3)*sc*0.15 + (live ? Math.sin(t*29)*1.2 : 0);   // the line of contact moves a little with the drive; the bar and the strip say how far
  const lean = engaged ? 0.42 : 0.2, crouch = engaged ? 0.38 : 0.15, gap = engaged ? 0 : clamp((MAUL.set - t)/MAUL.set, 0, 1)*0.35;   // more upright than a scrum: a maul is on its feet
  const men = MAUL_MEN.map(([u0, w, carrier]) => {
    const team = u0 < 0 ? att : 1 - att, u = u0 + Math.sign(u0)*gap;
    const ox = d*(u*Math.cos(a) + w*Math.sin(a)), depth = -(u*Math.sin(a) - w*Math.cos(a));   // turned by the wheel: across the pitch is depth, away from the camera up the screen
    return { team, carrier:!!carrier, x:mid + ox*sc, depth };
  }).sort((p, q) => q.depth - p.depth);
  let ball = null;
  for (const m of men) {
    const s = sc*(1 - m.depth*0.08), gy = ground - m.depth*H*0.05, face = m.team === att ? d : -d;
    fig(m.x, gy, s, kitOf(m.team), { face, lean, crouch, arms:'bind', drive:engaged, dim:clamp(m.depth*0.4, 0, 0.45) });
    if (m.carrier) ball = [m.x + face*0.36*s, gy - (engaged ? 0.9 : 1.05)*s, s*0.9, face*0.4];
  }
  if (ball) cutBall(...ball);                              // over the men, so the ball always shows
  if (M.two) for (const team of [0, 1]) {                   // the seat tag over each pack, and its Early or Good Timing for 0.9s
    const px = mid - (team === att ? d : -d)*0.9*sc, ty = ground - 1.75*sc, tg = Math.max(16, H*0.045);
    cutSeatTag(seatOfTeam(team), px, ty, tg);
    const m = c.msg[team];
    if (m && t - m.at < 0.9) { const out = px < mid ? -1 : 1; ctx.fillStyle = ringCol(team); ctx.font = `800 ${Math.round(H*0.045)}px 'Big Shoulders Display', Impact, sans-serif`; ctx.textAlign = out < 0 ? 'right' : 'left'; ctx.textBaseline = 'middle'; ctx.fillText(m.text.toUpperCase(), px + out*(tg*0.6 + 6), ty - tg*0.45); }   // beside the tag, out from the maul, clear of the call above
  }
  const G = maulGeom(W, H, safeInsets(), M.two);
  const call = t < MAUL.set ? 'Bind' : t < MAUL.set + 0.6 && !c.result ? 'Drive' : null;
  if (call && t > CUT_IN) cutText(call, G.call.y, call === 'Drive' ? G.call.size : H*0.13, call === 'Drive' ? 1 : 0.92);
  drawMaulBar(c, G.bar, H);
  drawMaulStrip(c, G.strip);
}
function drawMaulBar(c, B, H) {                            // the metres driven: from the Held Up line behind to the try line (or 8m) ahead, the attack's way across the screen
  const att = c.team, d = dirOf(att), ahead = clamp(c.line + 0.3, 3, 8), span = MAUL.back + ahead, ppm = B.w/span;
  const zero = d > 0 ? B.x + MAUL.back*ppm : B.x + B.w - MAUL.back*ppm, X = m => zero + d*m*ppm;
  ctx.fillStyle = 'rgba(8,14,10,.8)'; rrect(B.x - 3, B.y - 3, B.w + 6, B.h + 6, 4); ctx.fill();
  const m = clamp(c.fwd, -MAUL.back, ahead);
  ctx.fillStyle = m >= 0 ? maulCol(att) : maulCol(1 - att);
  const x0 = Math.min(zero, X(m)); ctx.fillRect(x0, B.y, Math.abs(X(m) - zero), B.h);
  ctx.fillStyle = '#f1eee4'; ctx.fillRect(zero - 1, B.y - 4, 2, B.h + 8);   // where it started
  const a0 = ctx.globalAlpha; ctx.globalAlpha = a0*0.7; ctx.fillRect(X(MAUL.use) - 1, B.y - 2, 2, B.h + 4); ctx.globalAlpha = a0;   // Use It from here
  if (c.line + 0.3 <= ahead) { ctx.fillRect(X(c.line + 0.3) - 2, B.y - 6, 4, B.h + 12); }   // the try line, when it is in reach
  ctx.font = `800 ${Math.round(H*0.04)}px 'Big Shoulders Display', Impact, sans-serif`; ctx.textBaseline = 'middle';
  ctx.textAlign = 'right'; ctx.fillText(M.nat[0].id, B.x - 10, B.y + B.h/2);
  ctx.textAlign = 'left'; ctx.fillText(M.nat[1].id, B.x + B.w + 10, B.y + B.h/2);
}
function drawMaulStrip(c, S) {                             // the whole pitch from above, as the Top camera has it: where the maul started, where it is, and where it is heading
  const k = S.w/120, P = (x, y) => [S.x + x*k, S.y + y*k], att = c.team, d = dirOf(att);
  ctx.fillStyle = 'rgba(8,14,10,.82)'; rrect(S.x - 4, S.y - 4, S.w + 8, S.h + 8, 5); ctx.fill();
  ctx.fillStyle = '#2b6334'; ctx.fillRect(S.x, S.y, S.w, S.h);
  ctx.fillStyle = '#245a2d'; ctx.fillRect(S.x, S.y, 10*k, S.h); ctx.fillRect(S.x + 110*k, S.y, 10*k, S.h);   // the in-goals
  ctx.strokeStyle = 'rgba(244,241,232,.75)'; ctx.lineWidth = 1;
  for (const x of [10, 60, 110]) { const [px] = P(x, 0); seg(px, S.y, px, S.y + S.h); }
  ctx.strokeStyle = 'rgba(244,241,232,.35)';
  for (const x of [32, 88]) { const [px] = P(x, 0); seg(px, S.y, px, S.y + S.h); }
  ctx.strokeRect(S.x, S.y, S.w, S.h);
  const [sx, sy] = P(c.x, c.y), [nx, ny] = P(clamp(c.x + d*c.fwd, 0, 120), clamp(c.y + c.lat, 0, 70)), col = maulCol(att);
  ctx.strokeStyle = 'rgba(244,241,232,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx, sy, 3.5, 0, 7); ctx.stroke();
  const L = 9*k; ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  seg(nx, ny, nx + d*Math.cos(c.ang)*L, ny + Math.sin(c.ang)*L);   // the heading: the way the wheel has it going
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(nx, ny, 4.5, 0, 7); ctx.fill();
  ctx.strokeStyle = '#08110b'; ctx.lineWidth = 1.2; ctx.stroke();
}
