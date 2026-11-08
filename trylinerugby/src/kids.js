/* =========================================================
   Kids: a level below Easy for 6 to 10 year olds, and the
   grown-up check in front of anything that leaves the game.
   ========================================================= */
/* How the level is stored: settings.kids, a flag layered on Easy (settings.diff stays 0). Every lever table in the engine (DIFF,
   KICK's fill and band, SPRINT, CONTACT.contact, the duel windows, COVER, MOVES.dummy.bite) is an array by level 0..2, and the save
   keeps diff as 0..2. A fourth level would need a fourth entry in every one of them, or would shift what a saved 0..2 means. As a
   flag, a saved diff means what it always did, an old save (no flag) loads exactly as it was, and anything that reads settings.diff
   or levelOf sees Easy, the nearest level. The flag counts only with diff 0, so a hand-edited kids:true on Hard is just Hard.
   The levers below act only in a match newMatch was asked to play as Kids (opts.kids, which startMatch passes): one player, on
   Easy, never AI v AI, the demo or two player, and in the Training Ground only the Kicking and Driving drills (practice.js). Every
   one reads M.kids, so the sims, the demo and the balance tools run the same numbers and the same random draws as before. */
const KIDS = {
  diff:{ ...DIFF[0], cpuSpeed:0.92, cpuTackle:0.45, cpuIntercept:0.05, turnover:-0.05, scrumCpu:0.45, lineSigma:0.28, lineContest:0.35 },   // Easy's row with the other side slower, weaker in the tackle, less often intercepting or turning the ball over, and soft at scrum and lineout
  tackle:0.10,             // your ringed man's own tackles (his contact tackle and his dive) are this much surer
  hands:0.1,               // your side's catches knock on a tenth as often
  jolt:0.15,               // your carrier in a tackle has the ball jolted loose about a seventh as often
  offload:0.95,            // an offload you press gets away
  passErr:0.4,             // your passes stray less than half as far
  duelWin:0.20,            // the gold ring stays open 0.2s longer. A close-up is never lost (kidsDuel): in the gold it is a Perfect
  kick:{ band:2, bandMax:0.34, fill:1.6, rush:0.65 },   // goal kicks: the gold band twice as wide (at most 0.34 of the meter), the meter 1.6x slower, the aim set for you, a release in the gold struck true; drop-goal chargers at 65% pace
  switchHold:0.5,          // defending, the ring moves to your best defender once it has stayed put this long
  rest:0.15,               // a stick under this is let go: your ringed defender chases the ball on his own
  chase:0.80,              // at this share of his pace, so the other side can still get away and score now and then
  scrum:0.25,              // your pack's own shove, so a few taps win your scrum
  reach:0.12,              // your lineout jumper's reach, so a rough Jump still takes your throw
};
const kidsLevel = () => !!settings.kids && settings.diff === 0;
/* The home Difficulty row is Kids | Easy | Normal | Hard: button 0 is the flag, buttons 1-3 are diff 0-2. */
const kidsSegIndex = () => (kidsLevel() ? 0 : settings.diff + 1);
function kidsSegSet(i) { settings.kids = i === 0; settings.diff = clamp(i - 1, 0, 2); }

/* ---------- the levers the engine calls (each caller checks M.kids first) ---------- */
function kidsDuel(c, res) {                                // a close-up is never lost: early, late or the wrong way it still comes off, and a press in the gold is a Perfect
  if (res !== 'perfect') res = 'ok';
  const right = c.kind === 'past' ? c.open : c.kind === 'pass' ? (c.drift ? 'dummy' : 'pass') : 1;
  return [res, right];
}
function kidsDuelAct(c, inp) {                             // any press counts: Pass or Kick in a Get Past, Kick in a Tackle or Block
  if (!(inp.aPressed || inp.bPressed || inp.flick)) return null;
  if (c.kind === 'past') return inp.flick || c.open;
  if (c.kind === 'pass') return inp.bPressed ? 'dummy' : 'pass';
  return 1;
}
function kidsBand(g) {                                     // after bandOf: the band widens about its centre and the meter slows
  const w = Math.min(g.w*KIDS.kick.band, KIDS.kick.bandMax);
  g.w = w; g.lo = g.ctr - w/2; g.hi = Math.min(1, g.ctr + w/2);
  g.fill *= KIDS.kick.fill;
}
const kidsStrike = (g, m) => (M && M.kids && isHuman(g.team) && m >= g.lo && m <= g.hi ? g.ctr : m);   // a release in the gold strikes the band's centre, which the set aim puts between the posts
function kidsSwitch(t) {                                   // defending, the ring goes to the man who can make the tackle: the nearest chaser when yours is down or another is well nearer, else the man in front when yours is beaten
  if (!M.kids || !isHuman(t) || M.phase !== 'play' || M.cut || ourBall(t) || sideOf(t).ctrlT < KIDS.switchHold) return;
  const cur = ctrlOf(t);
  if (cur && cur.bind) return;                             // never off a man bound in a tackle: how it ends (Big Hit, Tripped, Ankle Tap) is his to see
  const q = sprintPick(t) || (switchUseful(t) ? switchTarget(t) : null);
  if (q && q !== cur) { setCtrl(t, q); st('kidsSwitch'); }
}
function kidsChase(p, inp, dt) {                           // the stick let go while defending: the ringed man chases the carrier, or runs to a kicked or loose ball, as his teammates do
  if (!M.kids || inp.world().mag >= KIDS.rest || M.phase !== 'play' || p.offside > 0) return false;   // a retiring tackler stays out, as his teammates do
  const b = M.ball;
  let x, y;
  if (b.state === 'held' && b.carrier.team !== p.team) { const c = b.carrier, lead = clamp(dist(p, c)/9, 0, 0.7); x = c.x + c.vx*lead; y = c.y + c.vy*lead; }
  else if (b.state === 'air' && b.f && b.f.kind !== 'pass') { x = b.f.x1; y = b.f.y1; }
  else if (b.state === 'loose') { x = b.x; y = b.y; }
  else return false;
  seek(p, x, y, maxSpeed(p)*KIDS.chase, 15, dt, true);
  return true;
}

/* ---------- the grown-up check ----------
   parentGate(onPass, onCancel): a card a young child cannot get past, in the Apple Kids-category style. It asks a multiplication
   written out in words, a teen times six to nine with a three-figure answer (seventeen times six), typed on its own number keys.
   A wrong answer clears and asks a new one. A second wrong answer in a row rests the keys (10s, then 20s, 40s and 60s at most until
   a right answer), so tapping a pattern cannot cycle through the questions until one comes out; the rest outlives the card, so
   shutting it and opening it again does not skip it. Touch, the keyboard (the figures, Backspace, Escape, and Tab inside the card:
   the rest of the page is inert while it is open) and a controller (the card is the nav layer, Back is Cancel) all reach it. Only a
   right answer calls onPass. */
const KIDS_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const KIDS_GATE = { tries:2, rest:10000, restMax:60000 };   // wrong answers in a row before the keys rest; the first rest (ms), doubling to restMax
const KIDS_ASKS = [];                                      // [a, b]: 13 to 19 times 6 to 9 with a three-figure answer, 102 to 171 (22 questions), past the times tables a child knows
for (let a = 13; a <= 19; a++) for (let b = 6; b <= 9; b++) if (a*b >= 100) KIDS_ASKS.push([a, b]);
let kidsGate = null;                                       // the open check: { a, b, answer, typed, onPass, onCancel, back, inert }
let kidsGateMiss = 0, kidsGateRests = 0, kidsGateRest = null;   // wrong answers in a row; rests since the last right answer; the rest under way ({ until, ms }) or null
function kidsPick(n) {                                     // 0..n-1 from the browser's crypto, so the check never draws on the match's Math.random
  try { const u = new Uint32Array(1); crypto.getRandomValues(u); return u[0] % n; } catch (e) { return Math.floor(Math.random()*n); }
}
function kidsAsk() {
  const g = kidsGate, q = KIDS_ASKS[kidsPick(KIDS_ASKS.length)];
  g.a = q[0]; g.b = q[1]; g.answer = String(g.a*g.b); g.typed = '';
  $('pg-q').textContent = 'What is ' + KIDS_WORDS[g.a] + ' times ' + KIDS_WORDS[g.b] + '?';
}
function kidsGateShow(wrong) {
  const el = $('pg-ans'), rest = !!kidsGateRest;
  el.textContent = rest ? 'Wait' : kidsGate.typed || (wrong ? 'Try Again' : '');
  el.classList.toggle('wrong', rest || !!wrong);
  $('m-gate').classList.toggle('rest', rest);              // the keys dim and a bar runs down the answer box (styles.css)
  if (rest) el.style.setProperty('--pg-rest', Math.max(0, kidsGateRest.until - Date.now()) + 'ms');
}
function kidsGateSleep() {                                 // the second wrong answer in a row: the keys rest
  const ms = Math.min(KIDS_GATE.restMax, KIDS_GATE.rest*2**kidsGateRests);
  kidsGateRests++; kidsGateMiss = 0;
  const r = kidsGateRest = { until:Date.now() + ms, ms };
  setTimeout(() => kidsGateWake(r), ms);
}
function kidsGateWake(r) {                                 // r: the rest its timer was set for, so a stale timer never ends a later one (the tools call it bare)
  if (!kidsGateRest || (r && r !== kidsGateRest)) return;
  kidsGateRest = null;
  if (kidsGate) kidsGateShow(false);
}
function parentGate(onPass, onCancel) {
  if (kidsGate) kidsGateClose(false);                      // one check at a time: an older one is cancelled
  const pad = lastDev === 'pad', act = document.activeElement || null;
  kidsGate = { onPass, onCancel, typed:'', back:act, inert:[] };
  kidsAsk(); kidsGateShow(false);
  const m = $('m-gate'), body = document.body;
  if (pad && act && act.blur) act.blur();                  // a controller works by the chalk ring, and the DOM focus would draw a second outline on another key
  if (body && body.children) for (const el of body.children) if (el !== m && el.id !== 'rotate' && !el.inert) { el.inert = true; kidsGate.inert.push(el); }   // Turn Your Phone Sideways stays live: it covers the card upright, and an inert overlay would let a tap through to the keys under it
  m.hidden = false;
  if (pad) setFocus($('pg-k1'));                           // the ring starts on 1
  else { setFocus(null); const first = $('pg-k1'); if (first && first.focus) first.focus(); }   // the keyboard's Tab and the screen reader start there
}
function kidsGateClose(passed) {
  const g = kidsGate; if (!g) return;
  kidsGate = null;
  $('m-gate').hidden = true; setFocus(null);
  for (const el of g.inert) el.inert = false;
  if (g.back && g.back.focus && !(g.back.closest && g.back.closest('[hidden]'))) g.back.focus();
  if (passed) { kidsGateMiss = 0; kidsGateRests = 0; }
  const fn = passed ? g.onPass : g.onCancel;
  if (typeof fn === 'function') fn();
}
function kidsGateType(d) {
  const g = kidsGate; if (!g || kidsGateRest) return;      // resting keys do nothing
  g.typed = (g.typed + d).slice(0, 3);
  if (g.typed.length < g.answer.length) { kidsGateShow(false); return; }
  if (g.typed === g.answer) { kidsGateClose(true); return; }
  kidsAsk();
  if (++kidsGateMiss >= KIDS_GATE.tries) kidsGateSleep();
  kidsGateShow(true);
}
function kidsGateDelete() { if (kidsGate && !kidsGateRest) { kidsGate.typed = kidsGate.typed.slice(0, -1); kidsGateShow(false); } }
for (const n of '1234567890') $('pg-k' + n).addEventListener('click', () => kidsGateType(n));
$('pg-del').addEventListener('click', kidsGateDelete);
$('pg-cancel').addEventListener('click', () => kidsGateClose(false));
$('m-gate').hidden = true;                                 // closed until asked for (the test harness's stand-in elements start open)
DEFAULT_FOCUS['m-gate'] = () => $('pg-k1');
window.addEventListener('keydown', e => {                  // while the check is open no key reaches the game; the figures, Backspace and Escape answer it, and every other key keeps the browser's own meaning (Tab, Enter and Space on the card's buttons)
  if (!kidsGate) return;
  if (e.stopPropagation) e.stopPropagation();
  const k = e.key;
  if (/^[0-9]$/.test(k)) kidsGateType(k);
  else if (k === 'Backspace' || k === 'Delete') kidsGateDelete();
  else if (k === 'Escape') kidsGateClose(false);
  else return;
  if (e.preventDefault) e.preventDefault();
}, true);
