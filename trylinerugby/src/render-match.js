function render(dt) {
  if (!M) return;
  const d = V.dpr;
  const along = V.W, across = V.H;
  V.s = Math.min(along/54, across/36);
  const s = V.s, b = M.ball, cam = M.cam;
  let tx = b.x, ty = b.y;
  if (b.state === 'held') tx += dirOf(b.carrier.team)*7;
  const k = Math.min(1, dt*3.2);
  cam.x += (tx-cam.x)*k; cam.y += (ty-cam.y)*k;
  const ha = along/2/s, hc = across/2/s;
  cam.x = ha*2 >= 132 ? 60 : clamp(cam.x, ha-6, 126-ha);
  cam.y = hc*2 >= 82 ? 35 : clamp(cam.y, hc-6, 76-hc);
  M.rt += dt;
  for (const p of M.players) { if (p.drawFrom && (p.drawFrom.t -= dt) <= 0) p.drawFrom = null; if (p.fend > 0) p.fend -= dt; }   // render-only clocks
  const shake = M.shake > 0 && !RM ? 3*(M.shakeT/0.12)*(M.shake/M.shakeT) : 0;   // your Big Hit: a 3px shake for 0.12s (an arcade one bigger and longer), none under reduced motion
  if (M.shake > 0) M.shake -= dt;
  const camX = cam.x + shake*Math.sin(M.rt*173)/s, camY = cam.y + shake*Math.cos(M.rt*131)/s;

  ctx.setTransform(d*s, 0, 0, d*s, d*(V.W/2 - s*camX), d*(V.H/2 - s*camY));
  drawPitch();

  ctx.setTransform(d, 0, 0, d, 0, 0);
  const r = Math.max(8, 0.95*s);
  const ctrls = [0, 1].map(t => (isHuman(t) ? ctrlOf(t) : null));   // the man under each human's ring
  for (const t of [0, 1]) if (ctrls[t]) {
    const [cx, cy] = toS(ctrls[t].x, ctrls[t].y);
    ctx.strokeStyle = ringCol(t); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, r*1.55, 0, 7); ctx.stroke();
  }
  const order = M.players.slice().sort((a, c) => toS(a.x, a.y)[1] - toS(c.x, c.y)[1]);
  for (const p of order) drawPlayer(p, r);
  if (M.career) careerMark(r);                             // a career match: your player's ring and the star on his back
  // A short cue only where a decision matters; free pass targets keep just their ring.
  // Suppress edge cues rather than detach a label from an off-screen player or cover the scorebug.
  const targetCue = (q, text, colour) => {
    const [x, y] = toS(q.x, q.y), cy = y - r*1.6 - 13;
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
  // pass target, for the human holding the ball. Held in a tackle, the ring sits on the man an Offload would go to. While a long pass charges it turns gold, with a faint ring on the man it skips.
  // White is a free man. The ring tints when a defender is on him; a long pass keeps its gold and draws the tint inside it.
  for (const t of [0, 1]) {
    const ctrl = ctrls[t];
    if (!(ctrl && M.phase === 'play' && b.state === 'held' && b.carrier === ctrl)) continue;
    const shown = ctrl.bind ? { to:offloadTarget(ctrl.bind), skip:null, gold:false, marked:false } : shownPass(ctrl);
    if (ctrl.bind) shown.marked = !!(shown.to && pressure(shown.to) < SUPPORT.mark);
    const ringAt = (q, style, width, rad, dash) => {
      const [qx, qy] = toS(q.x, q.y);
      ctx.strokeStyle = style; ctx.lineWidth = width; ctx.setLineDash(dash);
      ctx.beginPath(); ctx.arc(qx, qy, rad, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    };
    if (shown.skip && shown.skip !== shown.to) ringAt(shown.skip, 'rgba(244,241,232,.38)', 1.5, r*1.2, [3, 4]);
    if (shown.to) {
      if (shown.gold) ringAt(shown.to, ringCol(t), 2.5, r*1.6, [4, 3]);
      else ringAt(shown.to, shown.marked ? SUPPORT.tint : 'rgba(244,241,232,.95)', shown.marked ? 2.5 : 2, r*1.6, [4, 3]);
      if (shown.gold && shown.marked) ringAt(shown.to, SUPPORT.tint, 2, r*1.15, []);
      if (shown.marked) targetCue(shown.to, 'Marked', '#f1eee4');
    }
  }
  // switch target, for a human without the ball: the dashed ring is the man Switch would take, drawn before the press
  for (const t of [0, 1]) {
    const ctrl = ctrls[t];
    if (!(ctrl && M.phase === 'play' && !ourBall(t))) continue;
    const q = switchTarget(t);
    if (!q) continue;
    const [qx, qy] = toS(q.x, q.y);
    ctx.strokeStyle = ringCol(t); ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.arc(qx, qy, r*1.45, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    if (switchUseful(t)) targetCue(q, 'Switch', ringCol(t));
  }
  // kick aim, for each side charging a kick, in its own direction
  for (const t of [0, 1]) {
    const ctrl = ctrls[t], S = sideOf(t);
    if (!(S.charging && ctrl && b.carrier === ctrl)) continue;
    const n = M.career ? careerNatOf(ctrl) : M.nat[t], len = 10 + S.charge*(36 + n.kicking*3), ang = clamp(inputOf(t).world().y, -1.2, 1.2)*0.75;
    const [lx, ly] = toS(ctrl.x + dirOf(t)*len*Math.cos(ang), ctrl.y + len*Math.sin(ang));
    ctx.strokeStyle = ringCol(t); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(lx-7, ly-7); ctx.lineTo(lx+7, ly+7); ctx.moveTo(lx+7, ly-7); ctx.lineTo(lx-7, ly+7); ctx.stroke();
    ctx.beginPath(); ctx.arc(lx, ly, 13, 0, 7); ctx.stroke();
  }
  drawBall(r);
  drawTags(dt, r);
  for (const t of [0, 1]) if (ctrls[t]) {
    let [cx, cy] = toS(ctrls[t].x, ctrls[t].y);
    const off = cx < 0 || cx > V.W || cy < 0 || cy > V.H;
    cx = clamp(cx, 18, V.W-18); cy = clamp(cy, 18 + r*2.4, V.H-18);
    ctx.fillStyle = ringCol(t);
    if (M.two) { drawSeatMark(t, cx, cy, r, off); continue; }
    if (off) { ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(cx-6, cy-r*2.4); ctx.lineTo(cx+6, cy-r*2.4); ctx.lineTo(cx, cy-r*1.75); ctx.closePath(); ctx.fill(); }
  }
  const g = ctx.createRadialGradient(V.W/2, V.H/2, Math.min(V.W, V.H)*0.35, V.W/2, V.H/2, Math.max(V.W, V.H)*0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.42)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, V.W, V.H);
  if (M.cut) drawCut();
}
/* two player: the stick and the three buttons are off (they are seat 0's touch controls), so each player's marks are on the pitch: a
   numbered tag in his colour over his man where the pointer sits in one player, the Sprint meter as an arc round his ring (the button's
   ring in one player, dim exactly when a press would do nothing), and under him the word the button would read when it matters now */
const TAG_INK = ['#1c1500', '#2a0a22'];
function drawSeatMark(t, cx, cy, r, off) {
  const col = ringCol(t), s = seatOfTeam(t);
  ctx.fillStyle = col;
  if (off) { ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); ctx.fill(); return; }
  const w = 18, h = 16, y0 = cy - r*2.4 - h;
  rrect(cx - w/2, y0, w, h, 3); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx-5, y0 + h); ctx.lineTo(cx+5, y0 + h); ctx.lineTo(cx, y0 + h + 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = TAG_INK[s]; ctx.font = `900 13px 'Big Shoulders Display', Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(s + 1), cx, y0 + h/2 + 0.5);
  const S = M.spr[t], on = !M.cut && sprintOn(t), a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0*(on ? 0.95 : 0.35); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.arc(cx, cy, r*1.55 + 5, -Math.PI/2, -Math.PI/2 + Math.PI*2*clamp(S.m, 0, 1)); ctx.stroke();
  ctx.globalAlpha = a0;
  const cue = cueOf(t);
  if (cue) {
    const text = (cue === 'Long' ? cue : seatKey(s, cue === 'Drop Goal' || cue === 'Switch' ? 'b' : 'a') + ' · ' + cue).toUpperCase(), y = cy + r*2.1;   // the key, then the word: F · OFFLOAD, G · DROP GOAL, G · SWITCH, / · TACKLE
    ctx.font = `800 12px 'Big Shoulders Display', Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const m = ctx.measureText(text), tw = ((m && m.width) || text.length*6.5) + 12;
    ctx.fillStyle = 'rgba(8,14,10,.82)'; rrect(cx - tw/2, y - 9, tw, 18, 4); ctx.fill();
    ctx.fillStyle = col; ctx.fillText(text, cx, y);
  }
}
function cueOf(t) {                                        // the word the big or small button would read for side t when a press matters now (the tests read it too)
  if (!M || M.phase !== 'play' || M.cut) return null;
  const c = ctrlOf(t); if (!c) return null;
  const b = M.ball, k = M.contact;
  if (ourBall(t)) {
    if (b.state !== 'held' || b.carrier !== c) return null;
    if (c.bind) return k && k.c === c && canOffload(k) ? 'Offload' : null;
    const p = sideOf(t).pass;
    if (p && p.mode === 'hold' && p.t >= LONG.arm && passAim(c, inputOf(t).world().y).far) return 'Long';
    return kickLabel(t) === 'Drop Goal' ? 'Drop Goal' : null;
  }
  if (switchUseful(t)) return 'Switch';                  // the chase, when your man is behind and a teammate can still meet the ball. It outranks Tackle: the pulse is the thing to read
  return canDive(c) ? 'Tackle' : null;
}

