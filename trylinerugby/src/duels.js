/* ---------- duels ----------
   Four one-on-one moments that cut to a chase-cam close-up: Get Past and
   Key Pass on attack, Tackle and Block on defence. A gold ring is the only
   timing cue. A win gives a short burst; a mistime falls back to the odds
   the open game would have given, so a duel is never a trap.
   M.duels: 'off' (AI v AI, the menu demo, and the headless default),
   'live' (a match you play; the close-up runs) or 'instant' (resolved at the trigger, for tools). */
const DUEL = {
  past:   { name:'Get Past', rig:1, tk:1.20, win:[0.30,0.23,0.17], mod:['pace','power'],       cpu:[0,0.20,0.40] }, // feint chance
  pass:   { name:'Key Pass', rig:2, tk:1.20, win:[0.32,0.24,0.18], mod:['handling','pace'],    cpu:[0,0.06,0.12] }, // commit jitter, s
  tackle: { name:'Tackle',   rig:1, tk:1.20, win:[0.30,0.23,0.17], mod:['power','pace'],       cpu:[0.15,0.30,0.50] }, // step chance
  block:  { name:'Block',    rig:2, tk:1.05, win:[0.26,0.20,0.15], mod:['handling','handling'], cpu:[0,0.15,0.30] }, // dummy chance
};
const DUEL_GRACE = 0.30, DUEL_OUTRO = 0.55, DUEL_SKIP = 0.25, DUEL_GAP = 30, DUEL_LAST_GAP = 6;
/* The Tackle duel's trigger (findTackleDuel), one line so the harness can try values: TDUEL='{"hold":0.5}' node tools/bot.mjs. hold: the CPU
   carrier's seconds on the ball; ctrlT: seconds since your ring last moved; ahead: how far goal-side of him your man must be (front-on);
   near/far: the distance band; lastBack/lastR: no other standing man of yours within lastR of the carrier and no more than lastBack metres
   behind him (negative: at least that far goal-side of him); cos: your stick's cosine toward the carrier.
   2026-10-17: hold 0.5 -> 0.3 and the last-defender test from "nobody within 10m unless 1m behind him" to "nobody goal-side of him within
   7m", since the led pass has the CPU's receivers catching at pace with team-mates level: the duel had fallen from 0.6 to 0.15 a match. */
const TDUEL = { hold:0.3, ctrlT:0.6, ahead:0.5, near:2.9, far:6.0, lastBack:-0.5, lastR:7, cos:0.57 };
const G_START = 7.0, G_WIN = 2.4, G_HIT = 0.8;          // the restaged approach, metres apart
const BURST = { ok:[1.09, 2.0], perfect:[1.14, 2.5], knock:[1.06, 1.2] };   // measured at n=1440 per row: x1.12/x1.18 overshoots Normal once the Dummy is in, x1.06 is barely felt
const DOM_TURN = [0.25, 0.35], DOM_RUCK = 1.6, LINE_SPEED = 2.5;
/* Contact, the ruck and Sprint. Every lever is here, one line each, so the harness can override them:
   CONTACT='{"bind":0.3}' SPRINT='{"mul":[1.25,1.25,1.2]}' node tools/bot.mjs tries values without an edit. Arrays are by level (Easy, Normal, Hard). */
const CONTACT = { bind:0.25, side:1.10, contact:[0.58,0.42,0.42], dive:[0.66,0.50], ankle:0.55, diveDown:0.75, brokenDown:0.5, stumble:[0.15,0.9], slide:[0.5,0.95], downR:0.95, second:{ r:1.3, toDom:0.35, softToWrap:0.35 }, dom:{ base:0.14, pow:0.04, front:0.03, dive:0.08, sprint:0.10, cpu:[-0.03,0,0.03] }, soft:{ base:0.22, behind:0.25, fast:0.08, pow:0.04 }, fend:{ pow:1, margin:0.35 }, trip:{ p:0.4, t:0.5, mul:0.5 }, jolt:{ dom:0.09, wrap:0.02, soft:0.01, fwd:0.55 }, off:{ soft:0.85, wrap:0.70, range:9, cpu:0.10, hold:0.5, knock:0.55 } };
const RUCK = { t:{ quick:0.7, normal:1.0, slow:1.5 }, quickLead:0.3, attHead:0.35, gate:3.5, retire:0.6, flatBase:0.11, pen:0.045, wf:{ r:3, t:0.7, mul:0.5 } };
const SPRINT = { mul:[1.25,1.25,1.20], mulBall:[1.06,1.06,1.05], secs:2.0, ballDrain:1.5, refill:[7,10,10], floor:0.2, fade:0.3, pick:4, cpu:{ chase:[0.1,0.12,0.2], chaseLast:[0,0,0], carry:[0,0.05,0.3], carryLast:[0,0,0], lane:15, min:2.5, max:12, space:6, keep:2.5, think:0.25 } };
const INSTANT = [0.85, 0.70, 0.55];
// Key Pass: how often the defender drifts onto the runner (Dummy is right) and, when he doesn't, how often he fakes a drift first
const DUMMY = { drift:[0.35, 0.40, 0.45], fake:[0, 0.15, 0.30] };                      // instant-mode win rate by difficulty
/* Open-play moves (2026-10-17): the Side Step and the Dummy, read from the stick with no new button. gestureStep runs once a step for
   each human slot while his ringed man carries in open play with neither Pass nor Kick held (both aim with the stick). It reads only
   inputOf(t).world(): L = j.y is across the pitch and F = j.x*dirOf(t) along the run, so it is the same for either team, either seat,
   touch, pad or keys. The history is cleared at a new carrier, at any step he is not carrying in open play (a cut, a set piece, the ball
   in the air, a button held), on a lifted thumb, on the stick's restore after a duel, at newMatch, a seat change and a resume.
   Side Step: one sharp flick across the run (L rises `rise` inside `win` steps to |L| >= L with |j| >= mag), armed from each carry and
   re-armed once |L| is back under rearm, acting with a standing opponent inside `range` and `since` seconds on the
   ball: x`odds` tackle odds while side > 0 (`side` seconds; the cooldown is side counting back to -0.9, 1.25s, as the AI's step), a
   `push` m/s dart along the stick. A fresh up or down key is a flick on its own. The old turn-rate step (p.turn / p.lastA) is gone:
   a single flick could never turn the floating stick far enough, and most of its steps fired on the first step after a catch.
   Dummy: the run held at F >= fwd for `hold` seconds, pulled back to F <= back inside `drop` seconds and pushed on to F >= on inside
   `ret` seconds, with the ring on a teammate and a standing AI defender ahead inside range: he buys it with chance bite[level] (the
   carrier's level) and for `drift` seconds runs at the ring's man, wrong-footed (x0.5 pace for wf seconds), shoved `shove` m/s that way
   and unable to tackle for tcd seconds; the carrier keeps the pace he had before the pull, since the check is a shape, not a stop. On
   keys the pull must be a fresh press of the back key: forward let go and pressed again is not a Dummy. The CPU dummies from
   aiCarrier's think with chance cpu[level] (Hard only) when a human defends, so AI v AI draws nothing, and never sells a human's
   ringed man. Every lever is here: MOVES='{"step":{"push":4}}' node tools/bot.mjs tries values without an edit. */
const MOVES = {
  step:{ win:4, rise:0.45, L:0.45, mag:0.6, rearm:0.3, range:4, since:0.10, side:0.35, push:5, odds:0.65, cpuPush:4 },
  dummy:{ fwd:0.7, hold:0.20, back:0.3, drop:0.15, ret:0.30, on:0.6, range:[1.5, 9], cd:2.5, bite:[0.9, 0.75, 0.6], drift:0.6, wf:0.5, tcd:0.4, shove:3, cpu:[0, 0, 0.04], cpuRange:[2.5, 7] },
};
// CONTACT_TUNE
/* Two player only (never read on a one-player path). DUEL_LOCK: how long before the plain window the chooser's choice locks, by
   the timer's level (Normal's 0.32 is when the CPU shows its feint, drift or step; an Easy timer gets longer to read it). TWO.tackle:
   how hard a side's AI men tackle the other player's carrier, read at the carrier's level: the scoring lever, tuned with
   `twoplayer.mjs --sym` toward 5-7 tries a match at 4-minute halves. SCRUM_LEVEL and LINE_LEVEL: an Easy player's shove and reach. */
const DUEL_LOCK = [0.40, 0.32, 0.24];
const TWO = { tackle:[0.72, 0.80, 0.88] };
const SCRUM_LEVEL = [0.10, 0, 0], LINE_LEVEL = [0.06, 0, 0];

function tackleChance(q, c, mode, stepped) {
  if (stepped == null) stepped = c.side > 0;
  let p = mode === 'dive' ? (dist(q, c) < 1.7 ? CONTACT.dive[0] : CONTACT.dive[1]) : mode === 'contact' ? CONTACT.contact[levelOf(q.team)] : (cpuSide(q.team) ? diffOf(q.team).cpuTackle : M.two ? TWO.tackle[levelOf(c.team)] : diffOf(q.team).myTackle);   // an AI tackler: the CPU's rate at its level, or (two player) the rate the carrier's level faces
  p += ((M.career ? careerAbility(q, 'power') - careerAbility(c, 'power') : powerOf(q.team) - powerOf(c.team)) + traitEdge(q, c))*0.05;   // a career match: your player's own power. An Engine keeps most of his (src/traits.js)
  if (M.kids && isHuman(q.team) && mode !== 'ai') p += KIDS.tackle;   // Kids: your ringed man's contact tackle and dive
  const edge = mode === 'ai' && cpuSide(q.team) && edgeMan(c);   // Easy: the CPU's tackle on your carrier (src/edge.js)
  if (stepped) p *= MOVES.step.odds*(edge ? EDGE.step : 1);
  if ((q.x - c.x)*dirOf(c.team) < -0.3) p *= 0.75;
  if (edge) p *= EDGE.hold;
  return clamp(p, 0.08, 0.95);
}
function setBoost(p, mul, secs) {
  p.boostMul = mul; p.boost = secs; p.autoDir = 0;
  const sp = maxSpeed(p), m = hyp(p.fx, p.fy) || 1;
  p.vx = p.fx/m*sp; p.vy = p.fy/m*sp;
}
function duelGate(kind, owner) {                           // owner: the side that would own it. One player keeps the shared log; two player gives each owner his own quota and "never the same kind twice running", with the gap and the Last Play bonus shared
  if (M.duels === 'off' || M.phase !== 'play' || anyCharging() || M.clock < 15 || M.cut) return false;
  const L = M.duelLog, h = Math.min(M.half, 2) - 1;
  if (M.hooter && !L.bonus[h] && M.dclock - L.last >= DUEL_LAST_GAP) return 'bonus';
  if (M.dclock - L.last < DUEL_GAP) return false;
  if (M.two) {
    const S = sideOf(owner).duel;
    if (kind === S.lastKind || S.half[h] >= Math.ceil(M.halfLen/180)) return false;
    return 'normal';
  }
  if (kind === L.lastKind) return false;
  if (L.half[h] >= Math.ceil(M.halfLen/90)) return false;
  return 'normal';
}
// "ahead" and "behind" along a side's direction of attack, written out per direction so team 0's comparisons are the floats they always were
const notBehind = (qx, cx, d, k) => (d > 0 ? qx >= cx - k : qx <= cx + k);   // q is no more than k metres behind c
const wellAhead = (qx, cx, d, k) => (d > 0 ? qx > cx + k : qx < cx - k);     // q is more than k metres ahead of c
function findAttackDuel(c) {                                // a human carrier at the last defender: Key Pass with a runner outside him, else Get Past
  const t = c.team, d = dirOf(t), inp = inputOf(t);
  if (!ringed(c) || c.hold < 0.5 || c.down > 0 || c.side > -0.9 || c.vx*d <= 3) return null;
  if ((oppLine(t) - c.x)*d < 3 || c.y < 6 || c.y > 64) return null;
  if (inp.world().x*d < 0.5) return null;                       // running at him, or no duel
  let d1 = null, bd = 1e9;
  for (const q of M.players) if (q.team !== t && q.down <= 0 && (q.x - c.x)*d > 0.5) { const dd = dist(q, c); if (dd < bd) { bd = dd; d1 = q; } }
  if (!d1 || bd < 3.6 || bd > 4.6 || d1.tcd > 0) return null;
  const ux = (d1.x - c.x)/bd, uy = (d1.y - c.y)/bd;
  if ((c.vx - d1.vx)*ux + (c.vy - d1.vy)*uy <= 3) return null;
  for (const q of M.players) if (q.team !== t && q !== d1 && q.down <= 0 && notBehind(q.x, c.x, d, 1) && dist(q, c) < 10) return null;
  let r = null;
  for (const p of M.players) {
    if (p.team !== t || p === c || p.down > 0) continue;
    const back = (c.x - p.x)*d, lat = Math.abs(p.y - c.y);
    if (back < 0 || back > RUNON.kpBack || lat < 4 || lat > 12) continue;   // the runner box: the line sits deeper now the ball moves faster
    if (M.players.some(q => q.team !== t && q !== d1 && q.down <= 0 && dist(q, p) < 6)) continue;
    r = p; break;
  }
  if (r) { const g = duelGate('pass', t); if (g) return { kind:'pass', U:c, O:d1, R:r, how:g }; }
  const g = duelGate('past', t);
  return g ? { kind:'past', U:c, O:d1, how:g } : null;
}
function findTackleDuel(c) {                                // the other side's human as the last defender, front-on, running at the carrier (the levers are TDUEL)
  const K = TDUEL;
  if (c.hold < K.hold || c.down > 0) return null;
  const t = 1 - c.team, d = dirOf(c.team), q = ctrlOf(t);
  if (!q || q.down > 0 || q.tcd > 0 || sideOf(t).ctrlT < K.ctrlT) return null;
  if (!wellAhead(q.x, c.x, d, K.ahead)) return null;
  const dd = dist(q, c);
  if (dd < K.near || dd > K.far) return null;
  if ((oppLine(c.team) - c.x)*d < 3 || c.y < 6 || c.y > 64) return null;
  for (const o of M.players) if (o.team === t && o !== q && o.down <= 0 && notBehind(o.x, c.x, d, K.lastBack) && dist(o, c) < K.lastR) return null;   // the last defender: no other man of his goal-side of the carrier (lastBack < 0: by more than -lastBack) within lastR
  const j = inputOf(t).world();
  if (j.mag <= 0.5 || (j.x*(c.x - q.x) + j.y*(c.y - q.y))/(j.mag*dd) < K.cos) return null;
  const g = duelGate('tackle', t);
  return g ? { kind:'tackle', U:q, O:c, how:g } : null;
}
function pickOwner(a, k) {                                 // two candidates on one step (two player only): the side with more duels left this half, then the side that didn't have the last one, then the attacker
  const h = Math.min(M.half, 2) - 1, left = t => Math.ceil(M.halfLen/180) - sideOf(t).duel.half[h];
  if (left(a.U.team) !== left(k.U.team)) return left(a.U.team) > left(k.U.team) ? a : k;
  if (M.duelLog.lastOwner === a.U.team) return k;
  return a;
}
function duelCheck(c) {
  if (M.duels === 'off' || c.drop) return false;    // before any rnd(), so AI v AI keeps its sequence; a CPU carrier winding up a drop is not duelled
  const a = ringed(c) ? findAttackDuel(c) : null, k = isHuman(1 - c.team) ? findTackleDuel(c) : null;
  const s = a && k ? pickOwner(a, k) : (a || k);
  if (!s) return false;
  startDuel(s);
  return true;
}
function blockSpec(from, to) {                             // the defending side's human on the line of a pressure pass, running at it
  const t = 1 - from.team, q = ctrlOf(t), b = M.ball;
  if (!q || q.down > 0 || q.tcd > 0 || sideOf(t).ctrlT < 0.6 || (oppLine(from.team) - from.x)*dirOf(from.team) < 3) return null;
  const aim = leadPass(from, to), P0 = { x:b.x, y:b.y }, P1 = { x:aim.x, y:aim.y };   // the lane is the line the ball will take
  const vx = P1.x - P0.x, vy = P1.y - P0.y, len = hyp(vx, vy);
  if (len < 5) return null;
  const u = ((q.x - P0.x)*vx + (q.y - P0.y)*vy)/(len*len);
  if (u < 0.25 || u > 0.85) return null;
  const L = { x:P0.x + vx*u, y:P0.y + vy*u };
  if (hyp(q.x - L.x, q.y - L.y) > 3.0) return null;
  if (M.players.some(o => o.team === t && o !== q && o.down <= 0 && dist(o, to) < 5)) return null;
  const j = inputOf(t).world();
  if (j.mag <= 0.5) return null;
  const toward = (x, y) => { const dx = x - q.x, dy = y - q.y, m = hyp(dx, dy) || 1; return (j.x*dx + j.y*dy)/(j.mag*m) >= 0.57; };
  if (!toward(L.x, L.y) && !toward(from.x, from.y)) return null;
  const g = duelGate('block', t);
  return g ? { kind:'block', U:q, O:from, R:to, P0, P1, L, how:g } : null;
}
// a pressure pass across the other side's man: when that side is human and duels are live, a Block duel may take it over. The AI's
// passes and a human's go through it alike; a floater is not the flat pass a Block duel reads
function passOrBlock(p, to, o) {
  if (M.duels !== 'off' && isHuman(1 - p.team) && !(o && o.long)) {
    const s = blockSpec(p, to);
    if (s) { M.duelPending = s; return; }
  }
  doPass(p, to, o);
}
function startPendingDuel() {
  const s = M.duelPending; M.duelPending = null;
  if (!(M.phase === 'play' && M.ball.state === 'held' && M.ball.carrier === s.O) || s.O.bind) return;   // tackled as he shaped to pass: no pass, no duel
  const again = blockSpec(s.O, s.R);          // your man may have gone down, or another duel just used the gap
  if (again) startDuel(again); else doPass(s.O, s.R);
}
function startDuel(s) {
  for (const p of M.players) { p.sprinting = false; p.sprint = 0; }   // a duel is run at the duel's pace; the meters keep their level
  for (const S of M.spr) S.p = null;
  const own = s.U.team, k = DUEL[s.kind], di = levelOf(own), ab = (t, m) => (m === 'power' ? powerOf(t) : M.nat[t][m]), L = M.duelLog, h = Math.min(M.half, 2) - 1;
  if (s.how === 'bonus') L.bonus[h] = true; else if (s.how !== 'force') { L.half[h]++; sideOf(own).duel.half[h]++; }
  L.last = M.dclock; L.lastKind = s.kind; L.lastOwner = own; sideOf(own).duel.lastKind = s.kind;
  M.stats.duels++; M.stats['d_' + s.kind] = (M.stats['d_' + s.kind] || 0) + 1; M.stats.duelN.att[own]++;
  if (M.two && (s.kind === 'past' || s.kind === 'pass')) setCtrl(s.O.team, s.O);   // the chooser's ring goes to the man in the close-up (O is the nearest defender, not always his), and stays on him after
  // the duel runs in its owner's frame (toFrame, the kick frame): Step Right is always the owner's right, and a team 0 duel is the geometry it always was
  const snap = p => { if (!p) return null; const f = toFrame(own, p.x, p.y), v = frameVec(own, { x:p.vx, y:p.vy }); return { x:f.x, y:f.y, vx:v.x, vy:v.y }; };
  const c = { duel:true, kind:s.kind, own, U:s.U, O:s.O, R:s.R || null, how:s.how, lastEvt:0, armed:false, opened:false,
    res:null, act:null, judged:null, out:null, verdict:null, u0:snap(s.U), o0:snap(s.O), r0:snap(s.R) };
  const U = c.u0, tgt = s.kind === 'block' ? toFrame(own, s.L.x, s.L.y) : c.o0;
  const gx = tgt.x - U.x, gy = tgt.y - U.y, g0 = hyp(gx, gy) || 1;
  c.D = { x:gx/g0, y:gy/g0 }; c.g0 = g0;
  let vc = 6;
  if (s.kind === 'block') { c.w = 1; c.K = { x:tgt.x, y:tgt.y }; c.P0 = toFrame(own, s.P0.x, s.P0.y); c.P1 = toFrame(own, s.P1.x, s.P1.y); c.L = { x:tgt.x, y:tgt.y }; }
  else {
    const uv = U.vx*c.D.x + U.vy*c.D.y, ov = c.o0.vx*c.D.x + c.o0.vy*c.D.y;
    vc = Math.max(4, uv - ov);
    c.w = clamp(uv/vc, 0.3, 0.7);
    c.K = { x:U.x + c.D.x*g0*c.w, y:U.y + c.D.y*g0*c.w };
  }
  c.tk = k.tk;
  c.rho = (G_START - G_HIT)/vc/(c.tk - CUT_IN);
  c.tTrig = CUT_IN + clamp((G_START - g0)/(G_START - G_HIT), 0, 1)*(c.tk - CUT_IN);
  c.dtau = clamp(c.rho*(c.tk - c.tTrig), 0, 0.5);
  const tw = CUT_IN + (c.tk - CUT_IN)*(G_START - G_WIN)/(G_START - G_HIT);
  const SD = sideOf(own).duel, first = M.two ? SD.first : !tutSeen(s.kind), fails = M.two ? SD.fails : L.fails;   // the aids are per owner in two player: his own first duel, his own failures in a row. One player: the first duel of each kind on this device (the tutorial's moment, marked at the cut-in)
  const w = k.win[di] + clamp(0.012*(ab(s.U.team, k.mod[0]) - ab(s.O.team, k.mod[1])), -0.036, 0.036)
    + (first ? 0.08 : 0) + (fails >= 2 ? 0.04 : 0) + (M.kids ? KIDS.duelWin : 0);
  if (M.two) SD.first = false;
  let centre = tw;
  if (s.kind === 'past') {
    const touch = U.y < 15 ? -1 : U.y > 55 ? 1 : 0;           // show him the touchline (frame y: his own left or right)
    c.open = touch && rnd() < 0.65 ? touch : (rnd() < 0.5 ? -1 : 1);
    c.open0 = rnd() < k.cpu[di] ? -c.open : c.open;           // a feint starts on the other shoulder
  } else if (s.kind === 'pass') {
    centre = c.commitT = tw + (rnd()*2 - 1)*k.cpu[di];
  } else if (s.kind === 'tackle') {
    if (rnd() < k.cpu[di]) { c.stepDir = rnd() < 0.5 ? -1 : 1; c.tk += 0.10; centre += 0.10; }
  } else {
    c.dummy = rnd() < k.cpu[di];
    c.rel = c.dummy ? 1.05 : 0.75;
    centre = c.rel + 0.30; c.tk = centre;
  }
  c.centre = centre; c.wid = w; c.win = [centre - w/2, centre + w/2];
  if (s.kind === 'past' && c.open0 !== c.open) c.feintAt = c.win[0] - 0.32;
  if (s.kind === 'pass') {
    c.side = Math.sign((c.r0.y - U.y) || 1);                   // the runner's side, in the frame
    c.drift = rnd() < DUMMY.drift[di];
    if (c.drift) c.driftAt = c.win[0] - 0.32;                  // he drifts onto the runner, in plain view
    else if (rnd() < DUMMY.fake[di]) c.fakeAt = c.win[0] - 0.55;   // starts to drift, then comes back at you
  }
  if (c.stepDir) c.stepAt = c.win[0] - 0.32;
  c.endT = s.kind === 'block' ? centre + 0.45 : c.tk + 0.35;
  if (M.two) duelHeadToHead(c);                              // head to head: the other player makes the choice the AI drew above, by the lock
  if (M.duels === 'instant') { duelInstant(c); return c; }
  for (const inp of humanSlots()) { inp.pre = null; inp.reanchor(); inp.held = new Set(inp.keys); inp.flick = 0; }   // every human slot: touch re-centred, a pad stick latched, held keys ignored
  startCut(c);
  sfx('whoosh');
  return c;
}
/* Head to head. In two player the duel's other man is the other player's, so he is the chooser: he makes the choice the CPU draws in
   one player (the shoulder the defender guards in a Get Past, a drift onto the runner or a rush at the passer in a Key Pass, the
   carrier's step in a Tackle, the passer's dummy in a Block). The CPU's plan is drawn in startDuel exactly as in one player and runs
   unless the chooser moves first: his first fresh input before the lock takes over and cancels what is left of the plan, so a
   chooser who does nothing defends as the CPU does, and a plan event after the lock shows at the lock. The lock is DUEL_LOCK at the
   timer's level before the plain window (the pump, 0.75s, for a Block); from there the choice is fixed and the timer reads it as he
   would read the CPU's tell. The chooser's hand is sideX(): fresh keys only, never one held into the cut-in, and an unlatched stick.
   Nothing random is drawn here. One player never reaches this, so its duels are the draws they always were. */
function setWindow(c, centre) { c.centre = centre; c.win = [centre - c.wid/2, centre + c.wid/2]; c.endT = c.kind === 'block' ? centre + 0.45 : c.tk + 0.35; }
function duelHeadToHead(c) {
  c.locked = false; c.lean = 0; c.dummyPress = false; c.taken = false; c.changes = 0; c.lastSx = 0;
  const plain0 = c.win[0] - (c.kind === 'tackle' && c.stepDir ? 0.10 : 0);   // the window before any drawn step
  c.lock = c.kind === 'block' ? 0.75 : plain0 - DUEL_LOCK[levelOf(c.own)];
  for (const k of ['feintAt', 'driftAt', 'fakeAt', 'stepAt']) if (c[k] != null) c[k] = Math.min(c[k], c.lock);   // a plan event after the lock is pulled back to it
  if (c.kind === 'tackle' && c.stepDir) c.tkAt = c.stepAt;                     // the drawn step's slower approach eases in at the step, not from the cut-in
  if (c.kind === 'block') c.reachT = 1.05;                                      // the blocker's run is timed to the plain release whether or not a dummy is drawn: nothing on screen tells before the pump
}
function duelOther(c, t) {                                  // the chooser's hand, every step from the cut-in: shown live, and fixed at the lock
  if (c.locked) return;
  const inp = inputOf(1 - c.own); if (!inp) { c.locked = true; return; }
  const sx = inp.sideX(), fresh = sx !== 0 && sx !== c.lastSx; c.lastSx = sx;   // the duel's right is the owner's right
  if (t < c.lock) {
    if (c.kind === 'block') { if (inp.bPressed) c.dummyPress = true; return; }
    if (c.kind === 'past') {
      if (!fresh) return;
      const shown = c.feintAt != null && t < c.feintAt ? c.open0 : c.open;   // the open side as the timer sees it now
      if (!c.taken) { c.taken = true; c.open = c.open0 = shown; c.feintAt = null; }   // the plan's feint is off: the guard follows his hand from here
      if (-sx !== c.open && c.changes < 2) { c.open0 = c.open; c.open = -sx; c.feintAt = t; c.changes++; }   // he guards the side he points at, with the feint's own animation; at most a feint and back
      return;
    }
    c.lean = clamp(sx || (inp.latch ? 0 : inp.jx), -1, 1);
    if (c.kind === 'pass') {
      if (fresh && !c.taken) { c.taken = true; c.drift = false; c.driftAt = null; c.fakeAt = null; }
      if (c.taken) {
        if (sx === c.side && !c.drift) { c.drift = true; c.driftAt = t; c.fakeAt = null; }       // held toward the runner: he drifts onto him, in plain view
        else if (sx !== c.side && c.drift) { c.drift = false; c.driftAt = null; c.fakeAt = t - 0.2; }   // let go before the lock: the drift was a fake, and he comes back
      }
      if (c.drift) c.lean = 0;
    } else if (c.kind === 'tackle' && fresh && !c.stepped) {   // one step, as the AI's: the contact, the window and the end move 0.10s later, the approach easing to the slower pace over the step
      c.stepped = true;
      if (!c.stepDir) { c.tk += 0.10; setWindow(c, c.centre + 0.10); }
      c.stepDir = sx; c.stepAt = t; c.tkAt = t; c.cam = null; sfx('whoosh');
    }
    return;
  }
  c.locked = true; c.lean = 0;                             // (the lock is no event of its own: a resume can land before it, and the choice stays fixed)
  if (c.kind === 'block' && (c.dummyPress || inp.bPressed) && !c.dummy) { c.dummy = true; c.rel = 1.05; c.tk = c.rel + 0.30; setWindow(c, c.tk); }   // the pump: one dummy, the real release at 1.05
}
function updateDuel(c, dt) {
  const t = c.t, input = inputOf(c.own);                   // the timer acts from the owner's slot
  if (M.two) duelOther(c, t);                              // the chooser's hand first, from the cut-in, so a release or a dummy on the lock step is settled before anything sounds
  if (t < DUEL_GRACE) { for (const inp of M.two ? [input] : humanSlots()) { inp.reanchor(); inp.flick = 0; } return; }   // the owner's stick is re-centred through the grace; the chooser's reads live from the cut-in (it was latched once there)
  if (c.feintAt != null && t >= c.feintAt && c.lastEvt < c.feintAt) { c.lastEvt = c.feintAt; sfx('whoosh'); }
  if (c.stepAt != null && t >= c.stepAt && c.lastEvt < c.stepAt) c.lastEvt = c.stepAt;
  for (const at of [c.driftAt, c.fakeAt]) if (at != null && t >= at && c.lastEvt < at) c.lastEvt = at;
  if (c.kind === 'block') {
    if (c.dummy && t >= 0.75 && c.lastEvt < 0.75) c.lastEvt = 0.75;
    if (t >= c.rel && c.lastEvt < c.rel) { c.lastEvt = c.rel; sfx('pass'); }
  }
  if (!c.opened && t >= c.win[0]) { c.opened = true; sfx('tick'); buzz(12, c.own); }
  let act = null;
  if (c.kind === 'past') {
    // a step is a fresh sideways flick of the re-anchored stick, or an arrow key pressed during the duel
    const jx = input.jx, jy = input.jy;
    (c.jxHist ||= []).push(jx); if (c.jxHist.length > 8) c.jxHist.shift();   // the last ~0.13 s
    const moved = jx - c.jxHist[0];
    if (!c.armed && Math.abs(jx) < 0.35) c.armed = true;
    if (input.flick) act = input.flick;
    else if (c.armed && Math.abs(jx) >= 0.6 && Math.abs(jx) > Math.abs(jy) && Math.abs(moved) >= 0.5 && Math.sign(moved) === Math.sign(jx)) act = Math.sign(jx);
  } else if (c.kind === 'pass') {
    if (input.aPressed) act = 'pass'; else if (input.bPressed) act = 'dummy';
  } else if (input.aPressed) act = 1;
  if (act == null && M.kids) act = kidsDuelAct(c, input);   // Kids: any press acts
  input.flick = 0;
  if (act != null) judgeDuel(c, act, t);
  else if (t > c.win[1]) judgeDuel(c, null, t);
}
function judgeDuel(c, act, t) {
  c.judged = t;
  let res = act == null ? 'late' : t < c.win[0] ? 'early' : Math.abs(t - c.centre) <= 0.2*c.wid ? 'perfect' : 'ok';
  if (M.kids) [res, act] = kidsDuel(c, res, act);         // Kids: a mistake still comes off KIDS.save of the time, a Perfect in the gold
  settle(c, res, act);
}
function settle(c, res, act) {
  c.res = res; c.act = act;
  const U = c.U, O = c.O, won = res === 'ok' || res === 'perfect';
  let out, verdict;
  if (c.kind === 'past') {
    if (won && act === c.open) { out = 'break'; verdict = 'Line Break'; }
    else if (won) { out = 'tackled'; verdict = 'Wrong Way'; }
    else if (rnd() < tackleChance(O, U, 'ai', res === 'early')) { out = 'tackled'; verdict = res === 'early' ? 'Too Early' : 'Too Late'; }
    else { out = 'broken'; verdict = 'Broken Tackle'; }
  } else if (c.kind === 'pass') {
    const right = c.drift ? 'dummy' : 'pass';
    if (won && act === right) { out = right === 'pass' ? 'drawn' : 'sold'; verdict = right === 'pass' ? 'Draw and Pass' : 'Dummy'; }
    else if (won && act === 'pass') { out = 'covered'; verdict = 'Covered'; }               // he'd drifted onto the runner
    else if (won || (res === 'early' && act === 'dummy') || res === 'late') {               // dummied a man coming at you, or held on
      if (rnd() < tackleChance(O, U, 'ai')) { out = 'tackled'; verdict = won ? 'Not Fooled' : res === 'early' ? 'Too Early' : 'Too Late'; }
      else { out = 'broken'; verdict = 'Broken Tackle'; }
    } else { out = 'early'; verdict = 'Too Early'; }
  } else if (c.kind === 'tackle') {
    if (won) { out = 'bighit'; verdict = matchMild() ? 'Stopped' : 'Big Hit'; }
    else if (rnd() < tackleChance(U, O, res === 'early' ? 'dive' : 'contact', O.side > 0)) { out = 'tackled'; verdict = res === 'early' ? 'Too Early' : 'Too Late'; }
    else { out = 'missed'; verdict = 'Missed'; }
  } else {
    if (won) { out = res === 'perfect' ? 'intercept' : 'knock'; verdict = res === 'perfect' ? 'Intercepted' : 'Knocked Down'; }
    else { out = 'pass'; verdict = res === 'early' ? 'Too Early' : 'Too Late'; }
  }
  c.out = out; c.verdict = verdict;
  const good = ['break', 'drawn', 'sold', 'bighit', 'intercept', 'knock'].includes(out);
  const ours = good || out === 'broken';
  c.good = good;
  if (good) { M.stats.duelsWon = (M.stats.duelsWon || 0) + 1; M.stats['w_' + c.kind] = (M.stats['w_' + c.kind] || 0) + 1; M.stats.duelN.won[c.own]++; }
  if (good && res === 'perfect' && c.kind !== 'block') M.stats.duelsPerfect = (M.stats.duelsPerfect || 0) + 1;
  M.duelLog.fails = good ? 0 : M.duelLog.fails + 1;
  if (M.two) { const SD = sideOf(c.own).duel; SD.fails = good ? 0 : SD.fails + 1; }   // the catch-up aid counts each owner's own failures
  if (good) sfx('cheer');
  if (['tackled', 'bighit'].includes(out)) { sfx('tackle'); buzz(25); }
  say(verdict, good ? '' : 'small', ours ? c.U.team : c.O.team, good && res === 'perfect' && c.kind !== 'block' ? 'Perfect' : null);
  if (M.duels === 'instant') { applyDuel(c); return; }
  c.skipAt = c.t + DUEL_SKIP;
  finishCut(() => applyDuel(c), Math.max(DUEL_OUTRO + (res === 'perfect' ? 0.1 : 0), c.endT - c.t));
}
function duelInstant(c) {
  let res = rnd() < INSTANT[levelOf(c.own)] ? (rnd() < (c.kind === 'block' ? 0.4 : 0.35) ? 'perfect' : 'ok') : (rnd() < 0.5 ? 'early' : 'late');
  let act = null;
  if (c.kind === 'past') {
    if (res === 'ok' || res === 'perfect') act = c.open;
    else if (rnd() < 0.3) { res = 'ok'; act = -c.open; }
    else if (res === 'early') act = rnd() < 0.5 ? -1 : 1;
  } else if (c.kind === 'pass') {
    const right = c.drift ? 'dummy' : 'pass', wrong = c.drift ? 'pass' : 'dummy';
    if (res === 'ok' || res === 'perfect') act = right;
    else if (rnd() < 0.3) { res = 'ok'; act = wrong; }
    else if (res === 'early') act = rnd() < 0.5 ? 'pass' : 'dummy';
  } else if (res !== 'late') act = 1;
  c.judged = c.centre;
  settle(c, res, act);
}
function put(p, P, carrier) { p.x = clamp(P.x, 0.5, 119.5); p.y = clamp(P.y, carrier ? 3 : 1.5, carrier ? 67 : 68.5); }
// hand the result back to the match, with everyone where the close-up left them
function applyDuel(c) {
  const own = c.own, inp = inputOf(own);
  if (c.kind === 'block' && c.out === 'intercept' && inp) inp.pre = { x:0, y:0 };   // the aim was at the lane; the run is upfield
  if (M.duels !== 'instant' && inp) inp.restore();
  const U = c.U, O = c.O, R = c.R, K = c.K, D = c.D, b = M.ball;
  const at = (k, lat) => toWorld(own, K.x + D.x*k, K.y + D.y*k + (lat || 0));   // a frame spot on the approach line, back in the world
  const face = (p, fx, fy) => { const v = frameVec(own, { x:fx, y:fy }); p.fx = v.x; p.fy = v.y; };
  if (R && c.kind !== 'block') { R.x += R.vx*c.dtau; R.y += R.vy*c.dtau; }
  switch (c.kind + ':' + c.out) {
    case 'past:break': {
      const o = c.open;
      put(U, at(1.3, 1.2*o), true); put(O, at(0, -0.6*o));
      O.down = 0.9; O.tcd = 1; O.vx = O.vy = 0;
      U.side = 0.35; artStepped(U, frameVec(own, { x:0, y:o }).y);   // he comes out of the close-up on the art's feint: render-only
      const m = hyp(1, 0.3); face(U, 1/m, 0.3*o/m);
      setBoost(U, ...(c.res === 'perfect' ? BURST.perfect : BURST.ok));
      U.autoDir = o;
      break;
    }
    case 'past:tackled': case 'pass:tackled':
      put(U, at(-0.4), true); put(O, at(0.4)); countTk(O.team, true); tackle(U, O); break;
    case 'past:broken': case 'pass:broken': {
      const lat = c.res === 'early' && c.act ? 0.8*c.act : 0;
      put(U, at(1.0, lat), true); put(O, at(0.4));
      U.side = 0.35; O.down = 0.5; O.tcd = 1; O.vx = O.vy = 0; M.stats.broken++; countTk(O.team, false);
      if (c.kind === 'past') artStepped(U, frameVec(own, { x:0, y:lat || 1 }).y);   // and here
      break;
    }
    case 'pass:drawn':
      put(U, at(-0.9), true); put(O, at(0.2)); O.down = 0.6; O.vx = O.vy = 0;
      b.x = U.x; b.y = U.y;
      doPass(U, R, { sure:true, boost:c.res === 'perfect' ? BURST.perfect : BURST.ok });
      break;
    case 'pass:sold': {
      // he went with the runner; you go through the gap he left
      put(U, at(1.3, -0.5*c.side), true); put(O, at(0.2, 1.2*c.side));
      O.down = 0.5; O.tcd = 1; O.vx = O.vy = 0;
      U.side = 0.35; U.fx = dirOf(own); U.fy = 0;
      setBoost(U, ...(c.res === 'perfect' ? BURST.perfect : BURST.ok));
      break;
    }
    case 'pass:covered': {
      // he sat on the runner; the pass goes, with him right there
      const dx = R.x - O.x, dy = R.y - O.y, m = hyp(dx, dy) || 1;
      O.x = R.x - dx/m*1.2; O.y = R.y - dy/m*1.2; O.vx = dx/m*6; O.vy = dy/m*6;
      b.x = U.x; b.y = U.y;
      doPass(U, R);
      break;
    }
    case 'pass:early': {
      const dx = R.x - O.x, dy = R.y - O.y, m = hyp(dx, dy) || 1;
      O.x += dx/m*1.5; O.y += dy/m*1.5; O.vx = dx/m*7; O.vy = dy/m*7;
      b.x = U.x; b.y = U.y;
      doPass(U, R);
      break;
    }
    case 'tackle:bighit':
      put(O, at(1.9), true); put(U, at(1.3));
      countTk(U.team, true); tackle(O, U, { dom:true, domP:DOM_TURN[c.res === 'perfect' ? 1 : 0] }); lockerTally('hits', U.team);   // a Tackle duel's Big Hit, for the Locker (src/locker.js)
      U.down = 0.4; U.tcd = 0.4;
      break;
    case 'tackle:tackled':
      put(U, at(0.3)); put(O, at(0.9), true); countTk(U.team, true); tackle(O, U); break;
    case 'tackle:missed':
      put(U, toWorld(own, K.x, K.y)); U.down = 0.75; U.vx = U.vy = 0; put(O, at(-1.2), true); M.stats.broken++; countTk(U.team, false); break;
    case 'block:intercept':
      put(U, toWorld(own, K.x, K.y)); U.fx = dirOf(own); U.fy = 0;
      setCarrier(U); b.x = U.x; b.y = U.y;
      M.stats.intercepts++;
      setBoost(U, ...BURST.ok);
      if (R) { R.x += R.vx*c.dtau; R.y += R.vy*c.dtau; }
      break;
    case 'block:knock': {
      const Kw = toWorld(own, K.x, K.y), kv = frameVec(own, { x:-(3 + 2*rnd()), y:(rnd() - 0.5)*2 });   // the knock-down runs back along the owner's own direction
      b.state = 'loose'; b.carrier = null; b.f = null; b.x = Kw.x; b.y = Kw.y; b.z = 1;
      b.vx = kv.x; b.vy = kv.y; b.vz = 1.5; b.last = own; b.kickInfo = { team:own, ownHalf:false };
      put(U, toWorld(own, K.x - 0.5, K.y)); U.fx = -dirOf(own); U.fy = 0;   // half a metre back towards his own line
      setBoost(U, ...BURST.knock);
      break;
    }
    case 'block:pass':
      doPass(O, R, { skip:[U] }); break;
  }
}
function duelResume(c) {
  c.t = Math.max(c.lastEvt + 0.05, DUEL_GRACE, c.t - 0.25);
  if (c.t < c.win[0]) { c.opened = false; c.slowFrom = c.t; c.acc = 0; }   // the window's tick plays again, and the slow phase starts over from here
  for (const inp of humanSlots()) { inp.reanchor(); inp.held = new Set(); }
}
// canonical positions for tests and the console: __tryline.forceDuel('past'). The scene is laid out in the owner's frame and
// mirrored into the world for team 1 (stageDuel('past', 1) in a match with humans:[false, true]), so the two read the same duel
function stageDuel(kind, team) {
  const own = team || 0, P = M.players, b = M.ball, d = dirOf(own);
  const at = (p, fx, fy) => { const w = toWorld(own, fx, fy); p.x = w.x; p.y = w.y; };
  const run = (p, vx, vy, fx, fy) => { const v = frameVec(own, { x:vx, y:vy }); p.vx = v.x; p.vy = v.y; if (fx != null) { const f = frameVec(own, { x:fx, y:fy }); p.fx = f.x; p.fy = f.y; } };
  P.forEach((p, i) => { const j = p.team === own ? i - 7*own : i + 7*own; at(p, p.team === own ? 20 + j : 100 - j, 5 + (j % 7)*9); p.vx = p.vy = 0; p.down = 0; p.tcd = 0; p.side = -1; p.boost = 0; p.hold = 2; });
  const T0 = P.filter(p => p.team === own), T1 = P.filter(p => p.team !== own);
  M.phase = 'play'; M.set = null; M.cut = null; M.clock = 30; M.dclock = 100; M.hooter = false; for (const s of M.side) s.charging = false;
  M.duelLog = { last:-99, lastKind:null, lastOwner:null, half:[0, 0], bonus:[false, false], fails:0 };
  const input = inputOf(own) || inputs[0];
  input.jx = d; input.jy = 0;
  let U, O, R = null;
  if (kind === 'past' || kind === 'pass') {
    U = T0[0]; O = T1[0];
    at(U, 70, 35); run(U, 8, 0, 1, 0);
    at(O, 74.2, 35); run(O, -7, 0, -1, 0);
    if (kind === 'pass') { R = T0[1]; at(R, 68, 42); run(R, 8, 0); }
    setCarrier(U); U.hold = 2; b.x = U.x + d*0.55; b.y = U.y;
  } else if (kind === 'tackle') {
    U = T0[0]; O = T1[0];
    at(O, 50, 35); run(O, -7, 0, -1, 0);
    at(U, 46, 35); run(U, 3, 0, 1, 0);
    setCarrier(O); O.hold = 2; setCtrl(own, U); b.x = O.x - d*0.55; b.y = O.y;
  } else {
    U = T0[0]; O = T1[0]; R = T1[1];
    at(O, 50, 30); run(O, -4, 0, -1, 0);
    at(R, 54, 40); run(R, -4, 0);
    at(U, 51.8, 35.6); run(U, 0, 0, 1, 0);
    setCarrier(O); O.hold = 2; setCtrl(own, U); b.x = O.x; b.y = O.y;
  }
  for (const s of M.side) { s.ctrlPrev = s.ctrl; s.ctrlT = 1; }
  if (kind === 'tackle') { input.jx = d; input.jy = 0; }
  if (kind === 'block') { const L = toWorld(own, 51.2, 34.4), dx = L.x - U.x, dy = L.y - U.y, m = hyp(dx, dy); input.jx = dx/m; input.jy = dy/m; }
  return { U, O, R };
}
function forceDuel(kind, team) {
  const { U, O, R } = stageDuel(kind, team);
  if (kind === 'block') {
    const s = blockSpec(O, R) || (() => {
      const b = M.ball, P1 = { x:R.x + R.vx*0.4, y:R.y + R.vy*0.4 }, P0 = { x:b.x, y:b.y };
      return { kind:'block', U, O, R, P0, P1, L:{ x:(P0.x + P1.x)/2, y:(P0.y + P1.y)/2 } };
    })();
    return startDuel({ ...s, how:'force' });
  }
  return startDuel({ kind, U, O, R, how:'force' });
}

