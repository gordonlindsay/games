/* ---------- possession calls and the interception rules (2026-11-13) ----------
   The owner: "There's sometimes a glitch where the ball is passed, the tackle is made by CPU and suddenly the ball is with my
   player on a breakaway - or did I miss the switch?" It was his own pass, the CPU tackled his receiver, the ball popped loose and
   his support man had it running free. No wrong-team bug: when your side gathered a loose ball the ring jumped to the new man with
   no call, no sound and no beat, and the only cue was a 0.7s Loose Ball tag over the tackled man. He chose Interceptions Stay
   Automatic, Clearly Called:
   - The call. Whenever the ring of a side a person plays goes to a new carrier for any reason but that person's own pass, a word over
     him, following him for `life` seconds: Picked Up (your side gathers a loose ball it did not win from the other: its own spill,
     its own dropped pass, any kick, a kick-off or a drop-out among them), Intercepted, Turnover (a ruck, or a loose ball gathered from
     the other side, a pressure spill among them), Offload (a teammate the computer runs offloads in the tackle and the ring's man
     takes it: Pro Mode's teammates; the CPU's are the CPU's). Its plate is edged in his side's colour, lightened where it would not
     stand out on the dark plate (callInk), and in Two Player in his seat's gold or pink, as his ring and his seat mark are. It is the
     newest tag and keeps its place under the two-tag cap (tag, src/contact.js). It stands over his pointer, or under his ring, or
     beside him, chosen once on its first frame against the banner's laid-out box and the other person's man (callPlace), so it
     never jumps; while he is off the frame its clock waits for him, for up to `hold` seconds.
     A flash on his ring for `flash` seconds, a ring going out and fading (none under reduced motion), and the Gather sound (a synth
     recipe in src/sound.js: the catch's slap and two notes going up). When the ball changes side to a person's side, a `beat` ms
     hold with no shake (hitStop), never for Kids or Minis (matchMild). None of it in AI v AI, the demo or a drill, and nothing for
     the CPU: when the CPU wins the ball from you, its banner in its colour is the call. A kick-off or a drop-out is a kick (`kicks`):
     gathered off the bounce it is anyone's, so no Turnover, as a tactical kick and a goal kick already were.
   - The banners. Intercepted and Turnover in the winning side's colour (`colour`; both were yellow for either side), lightened as the
     call's is. On Fire waits for the banner of the moment that lit it (`fire`): heat() lights it in the step Turnover, Intercepted,
     Big Hit or Try is said, and its banner now follows that one when that one has had its time, instead of replacing it; it also
     waits for any banner said while it waits, and for open play, so a try's On Fire shows once the conversion is over and the
     kick-off is taken, not under the close-up. Its roar and buzz go with its banner, whenever that shows. A Line Break lights it with
     its word over it, as before. A Line Break is not called within `lbGap` seconds of a turnover or an interception on the same
     carrier (src/edge.js); once that is over it is called if he is still clear, carried over On Fire's banner if that is showing.
   - The interceptions stay automatic, at the same odds (pI, src/ball.js). A pass is never intercepted until the ball is `release`
     metres from where it left the passer's hands: a man at the passer's hands is then out of the 1.1m an interceptor reaches, so
     nobody takes it out of his hands, and the ball is past the swing of his arms (about the first 0.1s of a flat pass's flight).
     Measured at b4a25d5 (AI v AI), about a third of all interceptions were inside 1.5m of the release. And a man who cannot
     play the ball does not (`fit`): down (as before), retiring from a ruck or a maul (p.offside), or offside, cannot intercept,
     take a missed pass or pick up a loose ball, and the AI does not send him after a loose ball. Offside is open play's law: a
     man in front of the teammate who last played the ball (the passer's release, the kicker, the tackled man who spilled it) by
     more than 0.5m (the kick's margin) as it was played, until he is back behind that line. The other side is never offside. At a
     person's own kick the ring goes to the nearest man who may play its bounce (kickRing), not to one in front of the kicker.
   Every lever is read through callsLv and none draws a random number, so CALLS off gives b4a25d5's values and the game plays exactly
   as b4a25d5, draw for draw (CALLS='{"on":false}' in the harness: the proof behind every re-pin since). Measured: README.md,
   Possession calls. */
const CALLS = { on:true, call:true, life:0.9, hold:1.0, flash:0.4, beat:80, colour:true, fire:true, lbGap:1.0, release:1.5, fit:true, kicks:true };
// CALLS_TUNE
const CALLS_OFF = { call:false, life:0, hold:0, flash:0, beat:0, colour:false, fire:false, lbGap:0, release:0, fit:false, kicks:false };   // b4a25d5's
const callsLv = k => (CALLS.on ? CALLS : CALLS_OFF)[k];
const callCol = t => (callsLv('colour') ? t : null);       // a banner's side: its colour, or the old yellow
const OFF_MARGIN = 0.5;                                    // metres in front of the line before a man is offside: the kick's onside margin (kickBall)

/* ---------- a side's colour on the dark plate ---------- */
const CALL_PLATE = '#0b110d';                              // the call's plate and the small banner's, as they sit on the grass
const relLum = h => hexRgb(h).reduce((a, v, i) => { v /= 255; return a + [0.2126, 0.7152, 0.0722][i]*(v <= 0.03928 ? v/12.92 : Math.pow((v + 0.055)/1.055, 2.4)); }, 0);
const contrastOf = (a, b) => { const x = relLum(a), y = relLum(b); return (Math.max(x, y) + 0.05)/(Math.min(x, y) + 0.05); };
const mixHex = (a, b, u) => { const y = hexRgb(b); return '#' + hexRgb(a).map((v, i) => Math.round(v + (y[i] - v)*u).toString(16).padStart(2, '0')).join(''); };
function callInk(t) {                                       // side t's colour where it stands out on the plate (3:1, the least for a mark): its shown colour, or that lightened towards chalk until it does, so it keeps its hue
  const k = showCol(t);
  for (let i = 0; i <= 20; i++) { const c = i ? mixHex(k, '#f1eee4', i/20) : k; if (contrastOf(c, CALL_PLATE) >= 3) return c; }
  return '#f1eee4';
}
const bannerInk = (text, t) => (callsLv('colour') && (text === 'Intercepted' || text === 'Turnover') ? callInk(t) : showCol(t));   // say()'s stripe: the two banners the calls colour, lightened as the call is

/* ---------- who can play the ball ---------- */
function offMark(team, x, men) {                            // the ball played by `team` from x: who of its men is offside for this phase (men: those in front, or null to work them out)
  if (!callsLv('fit')) return;
  const d = dirOf(team), set = new Set();
  for (const p of M.players) if (p.team === team && (men ? men.includes(p) : (p.x - x)*d > OFF_MARGIN)) set.add(p);
  M.ball.off = set.size ? { team, x, men:set } : null;
}
function offsideMan(q) {                                    // in front of the line of the teammate who last played it, as it was played, and not back behind it since
  const o = M.ball.off;
  return !!(o && q.team === o.team && o.men.has(q) && (q.x - o.x)*dirOf(o.team) > 0);
}
function offTick() {                                       // a man who gets back behind the line is onside for the rest of the phase
  const o = M.ball.off;
  if (!o) return;
  const d = dirOf(o.team);
  for (const p of o.men) if ((p.x - o.x)*d <= 0) o.men.delete(p);
  if (!o.men.size) M.ball.off = null;
}
function canPlay(q) {                                       // may this man intercept, take a missed pass or pick up a loose ball
  if (q.down > 0) return false;
  return !callsLv('fit') || (!(q.offside > 0) && !offsideMan(q));
}
const releaseOk = f => !(callsLv('release') > 0) || hyp(M.ball.x - f.x0, M.ball.y - f.y0) >= callsLv('release');   // the pass is out of his hands
function kickRing(t, x, y) {                                 // a person's own kick (kickBall): the ring to the nearest man who may play its bounce, never one left in front of the kicker. Null: nearestFree, as before
  if (!callsLv('fit')) return null;
  return nearestOf(M.players.filter(p => p.team === t && p.down <= 0 && !p.bind && canPlay(p)), x, y);
}

/* ---------- the call ---------- */
function callWon(p) { if (callsLv('lbGap') > 0) M.won = { p, at:M.dclock }; }   // a turnover or an interception: the Line Break waits on this carrier
const callLate = c => !!(callsLv('lbGap') > 0 && M.won && M.won.p === c && M.dclock - M.won.at < callsLv('lbGap'));
function possCall(p, word, turned) {                        // p has the ball, by `word`; turned: it came from the other side
  if (!callsLv('call') || !p || practice || M.auto || M.demo) return false;
  const t = p.team;
  if (!isHuman(t) || ctrlOf(t) !== p || M.ball.state !== 'held' || M.ball.carrier !== p) return false;   // only where the ring is on him: the CPU's carrier, and Pro Mode's teammates, get none
  tag(word, p.x, p.y, { k:M.two ? ringCol(t) : callInk(t), call:true, p, n:M.stepN }); st('call_' + word.replace(' ', '') + t);   // Two Player: his seat's gold or pink, as his ring and seat mark are
  if (callsLv('flash') > 0) M.flash = { p, t, at:0 };
  sfx('gather');
  if (turned && callsLv('beat') > 0 && !matchMild()) hitStop(callsLv('beat'), 0);   // the youngest: no hold
  return true;
}
const callFresh = t => !!(t.call && M.stepN - (t.n || 0) < ((callsLv('life') || 0.9) + Math.min(t.hid || 0, callsLv('hold') || 0))/STEP);   // a call still in its time: the drawing ends it, and with no drawing (a headless match) its steps do
function callFlash(dt, ring) {                              // the flash on his ring, once a frame: ring(p, grow 0..1, colour) draws it in the view's own terms
  const F = M.flash;
  if (!F) return;
  F.at += dt;
  const L = callsLv('flash');
  if (!(L > 0) || F.at >= L || !isHuman(F.t) || ctrlOf(F.t) !== F.p) { M.flash = null; return; }
  if (RM) return;                                          // reduced motion: no flash
  const u = F.at/L, a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0*(1 - u);
  ring(F.p, u, ringCol(F.t));
  ctx.globalAlpha = a0;
}

/* ---------- On Fire after its moment's banner ---------- */
const bannerLife = size => (size === 'big' ? 1.7 : size === 'coach' ? 1.6 : size === 'small' ? 0.9 : 1.3);   // match seconds a banner shows (say's timer, over the pace)
const fireOpen = () => M.phase === 'play' && !M.cut;       // open play: never under a close-up or a set piece, so a try's On Fire waits for the conversion and the kick-off
function fireRoar(t) { sfx('roar'); buzz(50, t); }         // On Fire's crowd and buzz, with its banner whenever that shows
function fireSay(t, grade) {                                 // heat()'s banner and its roar. False with CALLS.fire off: heat() roars at once, as b4a25d5 did. A word over it (a Line Break's) shows at once, as ever
  if (!callsLv('fire')) { say('On Fire', 'big fire', t, grade); return false; }
  if (!grade && M.said && M.said.n === M.stepN) { M.fireQ = { t, grade, at:M.stepN + Math.round(M.said.life/STEP) }; return true; }
  say('On Fire', 'big fire', t, grade);
  M.fireSaid = { n:M.stepN, t, grade, loud:true };          // its roar at the next step, unless a banner later in this one sends it on (sayNote)
  return true;
}
function sayNote(text, size, team) {                         // say()'s note: a banner said in the step On Fire was lit sends On Fire after it, and one said while it waits holds it longer
  if (!callsLv('fire')) return;
  const F = M.fireSaid, life = bannerLife(size), end = M.stepN + Math.round(life/STEP);
  if (text === 'On Fire') M.fireUp = { n:M.stepN, t:team };
  else if (F && F.n === M.stepN) { M.fireSaid = null; M.fireUp = null; M.fireQ = { t:F.t, grade:F.grade, at:end }; }
  else if (M.fireQ) M.fireQ.at = Math.max(M.fireQ.at, end);
  M.said = { n:M.stepN, life };
}
function fireShowing(t) {                                    // side t's On Fire banner is up, or waiting its turn
  if (!callsLv('fire')) return null;
  if (M.fireQ && M.fireQ.t === t) return 'queued';
  return M.fireUp && M.fireUp.t === t && M.stepN - M.fireUp.n < Math.round(bannerLife('big fire')/STEP) ? 'up' : null;
}
function fireFold(t, grade) {                                // side t's On Fire banner is up: say it again with this word over it, rather than replacing it. True when it did
  if (fireShowing(t) !== 'up') return false;
  say('On Fire', 'big fire', t, grade);
  return true;
}
function callsTick() {                                       // once a step (matchUpdate), close-ups included
  const S = M.fireSaid;
  if (S && S.n < M.stepN) { M.fireSaid = null; if (S.loud) fireRoar(S.t); }   // On Fire's banner stood through the step it was said in: its roar now
  const Q = M.fireQ;
  if (Q && M.stepN >= Q.at && fireOpen()) { M.fireQ = null; if (onFire(Q.t)) { say('On Fire', 'big fire', Q.t, Q.grade); M.fireSaid = { n:M.stepN, t:Q.t, grade:Q.grade, loud:true }; } }   // and only while it still burns; a banner later in this step sends it on again
  if (M.ball.off) offTick();
}
