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
   Easy, never AI v AI, the demo or two player, and in Skills Mini Games only the Kicking and Driving drills (practice.js). Every
   one reads M.kids, so the sims, the demo and the balance tools run the same numbers and the same random draws as before. */
/* The Kids rating, r: one hidden number from 0, where every child starts, to 1, the ceiling, which is still a little easier than
   Easy. Each lever that moves is a pair [start, ceiling] in KIDS_SCALE, and kidsTune(r) puts KIDS on the straight line between them
   as a Kids match starts (newMatch). The aids in KIDS outside the scale hold all the way up: the aim set at a goal kick, any press
   acting in a close-up, the ring finding your best defender, and the chase when the stick is let go. After each completed one-player
   Kids match kidsAdapt moves r by the result (KIDS_ADAPT) and saves it as settings.kidsR. Nothing on screen ever shows it. */
const KIDS_SCALE = {       // [start, ceiling]. The start is the Kids level as it was before the scale; the ceiling is 80% of the way from there to Easy, but for the passing pace (flight, grace: below)
  diff:{ cpuSpeed:[0.92, 0.96], cpuTackle:[0.45, 0.54], cpuIntercept:[0.05, 0.09], turnover:[-0.05, -0.035], scrumCpu:[0.45, 0.57], lineSigma:[0.28, 0.21], lineContest:[0.35, 0.51] },   // the other side (Easy: 0.97, 0.56, 0.10, -0.03, 0.60, 0.19, 0.55): slower, weaker in the tackle, less often intercepting or turning the ball over, soft at scrum and lineout
  tackle:[0.10, 0.02],     // your ringed man's own tackles (his contact tackle and his dive) are this much surer (Easy 0)
  hands:[0.1, 0.82],       // your side's catches knock on this share as often (Easy 1)
  jolt:[0.15, 0.83],       // your carrier in a tackle has the ball jolted loose this share as often (Easy 1)
  offload:[0.95, 0.85],    // an offload you press gets away this often (Easy 70 to 85%)
  passErr:[0.4, 0.88],     // your passes stray this share as far (Easy 1)
  duelWin:[0.20, 0.04],    // the gold ring stays open this much longer, in seconds (Easy 0)
  save:[1, 0.2],           // a close-up you get wrong (early, late or the wrong way) still comes off this often (Easy 0); one in the gold is a Perfect
  kick:{ band:[2, 1.2], bandMax:[0.34, 0.26], fill:[1.6, 1.12], rush:[0.65, 0.93] },   // goal kicks (Easy 1, 0.24, 1, 1): the gold band this much wider (at most bandMax), the meter this much slower; drop-goal chargers at this share of their pace
  scrum:[0.25, 0.05],      // your pack's own shove (Easy 0)
  reach:[0.12, 0.03],      // your lineout jumper's reach, in metres (Easy 0)
  /* How long a pass hangs (PASS_FLIGHT, src/passing.js), both sides' passes, and your catcher's moment before an AI man can commit. A child
     starting out keeps PR #14's calm passing (PASS_FLIGHT's Kids); the ceiling is the old pace, the one the calibration was measured at
     (the owner, 2026-11-09: "Keep Kids at Most Easy"). PR #14's passing all the way up took the settled 7 to 8 year old from 81% won by 2.7
     tries to 92% by 3.5; on this scale he settles at 0.97, winning 83% by 2.7 (tools/kidbots.mjs, README.md). These two pass Easy's (1.2, 0.25)
     on the way up; every other lever stops short of it, and the ceiling as a whole is still easier than Easy (84% won by 2.9 against 81% by 2.2). */
  flight:[PASS_FLIGHT.kids, 1],
  grace:[PASS_FLIGHT.graceKids, 0],
};
const KIDS = {             // the levers of the Kids match being played: kidsTune fills in the scale, and the rest never moves
  diff:{ ...DIFF[0] }, kick:{},
  switchHold:0.5,          // defending, the ring moves to your best defender once it has stayed put this long
  rest:0.15,               // a stick under this is let go: your ringed defender chases the ball on his own
  chase:0.80,              // at this share of his pace, so the other side can still get away and score now and then
};
const kidsLerp = (a, b, r) => (1 - r)*a + r*b;            // exactly a at 0 and b at 1
function kidsTune(r) {                                     // KIDS at rating r (0..1). Practice's Kicking and Driving play r = 0, the help they always had
  r = Number.isFinite(r) ? clamp(r, 0, 1) : 0;
  for (const [k, v] of Object.entries(KIDS_SCALE)) {
    if (Array.isArray(v)) KIDS[k] = kidsLerp(v[0], v[1], r);
    else for (const [j, w] of Object.entries(v)) KIDS[k][j] = kidsLerp(w[0], w[1], r);
  }
  KIDS.r = r;
  return KIDS;
}
kidsTune(0);
/* After a completed one-player Kids match (kidsAdapt, from finishMatch: never practice, AI v AI, the demo or two player, never a
   match left early, never a My Player career match, career-pro.js), r takes one fixed step by the result in the child's side's points and tries (KIDS_ADAPT): a win by more than
   KIDS_ADAPT.big tries raises it, any other win (one on a kick included) nudges it up, a draw eases it a little, a loss lowers it, and
   a loss by two tries or more lowers it further. A step is the same size anywhere on the scale; 0 and 1 only stop it. So a loss near
   the start takes it down as surely as one near the top, and a child who loses more than he wins goes back to the start. No step is
   more than a tenth of the scale, so it never lurches. It settles where a child's wins and losses balance: below that point his
   wins outweigh his losses and it climbs, above it the other way, and the nearer it gets the more nearly they cancel, so it drifts
   in more and more slowly rather than swinging from end to end. Scripted children (tools/kidbots.mjs) settle at about 0.73 (a 6 year
   old, winning 72%), 0.96 (a 7 to 8 year old, winning 81% by 2.7 tries) and the ceiling (a sharp 10 year old), and a child who never
   defends at about 0.12; README.md has the scorelines. Since PR #14, with its passing on the scale, the 7 to 8 year old settles at 0.97,
   winning 83% by 2.7 (2026-11-09). */
const KIDS_ADAPT = { big:3, raise:0.05, nudge:0.01, draw:-0.01, lose:-0.05, heavy:-0.10 };
function kidsStep(score, tries, h = 0) {                    // the step one result moves r, up if above 0, down if below. h is the child's side
  const pts = score[h] - score[1 - h], m = tries[h] - tries[1 - h], A = KIDS_ADAPT;
  if (pts > 0) return m > A.big ? A.raise : A.nudge;
  if (pts === 0) return A.draw;
  return m < -1 ? A.heavy : A.lose;
}
function kidsNext(r, score, tries, h = 0) {                // the rating after a result, kept to three places
  r = Number.isFinite(r) ? clamp(r, 0, 1) : 0;
  return Math.round(clamp(r + kidsStep(score, tries, h), 0, 1)*1000)/1000;
}
function kidsAdapt() {                                     // full time in a Kids match: the rating moves once, and is saved
  if (!M || !M.kids || M.kidsDone || !M.over || practice || M.auto || M.demo || M.two || M.careerPro) return null;   // a My Player career match: the computer played his side, so it says nothing of the child's level
  const h = isHuman(0) ? 0 : 1;
  M.kidsDone = true;
  settings.kidsR = kidsNext(M.kidsR, M.score, M.tries, h);
  const big = M.tries[h] - M.tries[1 - h] > KIDS_EASY.margin;   // the run towards Move Up to Easy: big wins at the top of the scale, in a row
  settings.kidsTop = settings.kidsR >= KIDS_EASY.top && big ? Math.min(99, (settings.kidsTop | 0) + 1) : 0;
  save();
  return settings.kidsR;
}
/* Outgrowing Kids (the owner, 2026-11-08: "yes, suggest Easy"). Grown-Ups offers Move Up to Easy, and the home's Grown-Ups button
   carries a dot, once a child has won KIDS_EASY.run Kids matches in a row by more than KIDS_EASY.margin tries with the rating at
   KIDS_EASY.top or above. Chosen by replaying the calibration's settle runs (tools/kidbots.mjs, SEED 7 and 13, 150 matches each):
   wins by 5 or more tries, five in a row, never came up for the 7 to 8 year old Kids is tuned for (0 of 32 runs), the 6 year old
   (0 of 32) or the stick masher (0 of 16), and came up for every sharp 10 year old (16 of 16, median match 39). A margin of 4 or
   more (more than 3) caught 5 of 32 of the 7 to 8 year olds, so it is more than 4. Nothing on the child's screens changes. */
const KIDS_EASY = { top:0.95, margin:4, run:5 };
const kidsReady = () => kidsLevel() && (settings.kidsTop | 0) >= KIDS_EASY.run;
const kidsLevel = () => !!settings.kids && settings.diff === 0;
/* The home Difficulty row is Kids | Easy | Normal | Hard: button 0 is the flag, buttons 1-3 are diff 0-2. */
const kidsSegIndex = () => (kidsLevel() ? 0 : settings.diff + 1);
function kidsSegSet(i) { settings.kids = i === 0; settings.diff = clamp(i - 1, 0, 2); }

/* ---------- the levers the engine calls (each caller checks M.kids first) ---------- */
function kidsDuel(c, res, act) {                           // a close-up you get wrong (early, late or the wrong way) still comes off KIDS.save of the time, a Perfect if the press was in the gold
  const right = c.kind === 'past' ? c.open : c.kind === 'pass' ? (c.drift ? 'dummy' : 'pass') : 1;
  if ((res === 'ok' || res === 'perfect') && act === right) return [res, act];
  if (KIDS.save < 1 && rnd() >= KIDS.save) return [res, act];   // at the start (save 1) no draw is made: every one comes off, as before the scale
  return [res === 'perfect' ? res : 'ok', right];
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
function kidsChase(p, inp, dt) {                           // the stick let go while defending: the ringed man chases the carrier, or runs to a kicked or loose ball or to where their pass will land, as his teammates do
  if (!M.kids || inp.world().mag >= KIDS.rest || M.phase !== 'play' || p.offside > 0) return false;   // a retiring tackler stays out, as his teammates do
  const b = M.ball;
  let x, y;
  if (b.state === 'held' && b.carrier.team !== p.team) { const c = b.carrier, lead = clamp(dist(p, c)/9, 0, 0.7); x = c.x + c.vx*lead; y = c.y + c.vy*lead; }
  else if (b.state === 'air' && b.f && (b.f.kind !== 'pass' || b.f.team !== p.team)) { x = b.f.x1; y = b.f.y1; }
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
   shutting it and opening it again does not skip it, and in the app it outlives the game too (kidsGateKeep), so closing the app and
   opening it again does not skip it either. Touch, the keyboard (the figures, Backspace, Escape, and Tab inside the card:
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
  kidsGateKeep();
}
function kidsGateWake(r) {                                 // r: the rest its timer was set for, so a stale timer never ends a later one (the tools call it bare)
  if (!kidsGateRest || (r && r !== kidsGateRest)) return;
  kidsGateRest = null;
  if (kidsGate) kidsGateShow(false);
  kidsGateKeep();
}
/* In the app, the rest under way and the count of rests are kept on the device under KIDS_GATE_KEY, apart from the save, and read
   back at start: a child who closes the app and opens it again comes back to the same wait. A right answer clears them. The web
   keeps them in memory alone, as before. */
const KIDS_GATE_KEY = 'tryline.gate';
const kidsGateApp = () => typeof nativeOn === 'function' && nativeOn();
function kidsGateKeep() {
  if (!kidsGateApp()) return;
  try {
    if (kidsGateRests > 0) localStorage.setItem(KIDS_GATE_KEY, JSON.stringify({ until:kidsGateRest ? kidsGateRest.until : 0, rests:kidsGateRests }));
    else if (typeof localStorage.removeItem === 'function') localStorage.removeItem(KIDS_GATE_KEY);
  } catch (e) { /* storage refused: the rest still holds while the game is open */ }
}
function kidsGateLoad() {
  if (!kidsGateApp()) return;
  let g = null;
  try { g = JSON.parse(localStorage.getItem(KIDS_GATE_KEY) || 'null'); } catch (e) { g = null; }
  if (!g || typeof g !== 'object') return;
  if (Number.isInteger(g.rests) && g.rests > 0 && g.rests <= 16) kidsGateRests = g.rests;
  const left = Math.min(KIDS_GATE.restMax, Number(g.until) - Date.now());   // a clock put back never makes it longer than a rest can be
  if (!(left > 0)) return;
  const r = kidsGateRest = { until:Date.now() + left, ms:left };
  setTimeout(() => kidsGateWake(r), left);
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
  if (passed) { kidsGateMiss = 0; kidsGateRests = 0; kidsGateKeep(); }
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
kidsGateLoad();                                            // the app: a rest still under way when the app was closed
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
