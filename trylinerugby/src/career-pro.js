/* =========================================================
   Pro Mode: a career played as your player alone (2026-11-08, the owner's "control only your player").
   The choice is made with the career (Play as Whole Team | My Player, Whole Team first and the default) and kept in
   career.proMode (a career saved before club seasons kept its Pro Club side in `pro`; cleanCareer makes that side its club). careerArm sets M.careerPro in a career match with it on.
   Every rule here reads M.careerPro, so with it off (every other match, and a Whole Team career) the game plays
   exactly as before: the hooks in match.js, movement.js, passing.js, contact.js, goal-kicks.js and ui-match.js are each
   one condition that is false without it.
   - The ring is his for the whole match: setCtrl moves it to nobody else, so Switch is gone, Sprint never moves it to a
     chaser, his side never takes it at a catch, a kick or a ruck, and the Kids ring never moves either.
   - His teammates, the carrier included, are run by the computer as the CPU side's men are: aiCarrier carries, passes,
     kicks, drops for goal (with the CPU's kick inputs) and tries offloads in the tackle; matchTargets moves the rest.
     His side keeps its own balance terms (pace, catching, Kids' help): only who decides changes.
   - Team Spirit (careerSpirit(), 0 to 1, from career-life.js; M.careerLife.spirit or 0.5 without it) sets how often a
     teammate looks for him. At a pass the carrier was making anyway he gives it to him instead with chance PRO.look,
     and while he is a sensible option the carrier passes to him unprompted, PRO.seek times a second, unless he is
     running into open grass himself. Sensible: level or behind the ball, PRO.near to PRO.far metres off, no defender
     within PRO.open of him and none within PRO.lane of the line to him. Never a pass into trouble. An offload out of a
     tackle goes to him only inside the engine's offload range (CONTACT.off.range), as any other offload does.
   - Call for Ball: Pass while a teammate has the ball. Answered with chance PRO.answer when a pass to him is on (the
     same test, with PRO.callOpen for his space), PRO.react later; otherwise the No sign over the carrier. One call
     each PRO.cool seconds. A call lasts one possession: setCarrier drops it when anyone gets the ball, so a caller who
     loses it and has it back later never answers a call from before.
   - Kids: a My Player career match never moves the hidden Kids rating (kidsAdapt), since his teammates won or lost it.
   - Set pieces: a forward plays the scrums and lineouts, as today; a back's are played for the team (autoScrum and
     autoLineout, as AI v AI plays them). He takes the goal kicks, as in every career match, and the duels are his
     only, since the engine starts them only for the ringed man.
   ========================================================= */
const PRO = {
  look:[0.10, 0.80],      // a pass the carrier was making anyway goes to him instead, at Team Spirit 0 and 1
  seek:[0.05, 0.70],      // passes a second to him while he is a sensible option, at Team Spirit 0 and 1
  answer:[0.25, 0.95],    // Call for Ball answered when a pass is on, at Team Spirit 0 and 1
  react:0.2,              // seconds from the call to the pass
  near:3, far:20,         // metres from the carrier
  open:4,                 // no defender this close to him for a pass the carrier chooses
  callOpen:2.5,           // and this close for a call: he asked for it
  lane:1.5,               // no defender this close to the line to him
  hold:0.4,               // a carrier looks for him only after this long on the ball
  gap:8,                  // and not while his own way ahead is clearer than this
  cool:0.8,               // seconds between calls
  callT:0.45, noT:0.8,    // how long the call's ring and the No sign show
};
const proOn = () => !!(M && M.careerPro);
function proPinned(t) { return !!(M && M.careerPro && t === 0); }   // the side whose ring never moves: yours, in Pro Mode
function proRun(p) { return !!(M && M.careerPro && p && p.team === 0 && p !== M.careerP); }   // a teammate of his, run by the computer
function proSpirit() {                                       // Team Spirit, 0 to 1: career-life.js when it is there, else the match's snapshot, else the middle
  if (typeof careerSpirit === 'function') { const s = +careerSpirit(); if (Number.isFinite(s)) return clamp(s, 0, 1); }
  const L = M && M.careerLife;
  return L && Number.isFinite(+L.spirit) ? clamp(+L.spirit/100, 0, 1) : 0.5;
}
const proAt = (a, s) => a[0] + (a[1] - a[0])*s;
function proOpen(c, room, far = PRO.far) {                   // could carrier c pass to your player now, into space (room: no defender closer to him), from at most `far` away
  const me = M.careerP;
  if (!me || !c || c === me || c.team !== me.team || !onFeet(me) || !passOk(c, me, far) || dist(c, me) < PRO.near || pressure(me) < room) return false;
  const ax = me.x - c.x, ay = me.y - c.y, L2 = ax*ax + ay*ay || 1;
  for (const q of M.players) {
    if (q.team === c.team || !onFeet(q)) continue;
    const u = clamp(((q.x - c.x)*ax + (q.y - c.y)*ay)/L2, 0, 1);
    if (hyp(c.x + ax*u - q.x, c.y + ay*u - q.y) < PRO.lane) return false;
  }
  return true;
}
/* doPass's hook: a teammate's pass may go to him instead. Returns the pass's [to, o]. An offload (offload() is the one pass
   of a teammate's that names men to skip: the tacklers) reaches only CONTACT.off.range, as supportFor's do. */
function proPass(from, to, o) {
  if (!proRun(from) || to === M.careerP || o.sure || !proOpen(from, PRO.open, o.skip ? CONTACT.off.range : PRO.far) || rnd() >= proAt(PRO.look, proSpirit())) return [to, o];
  st('proLook');
  return [M.careerP, { ...o, long:false }];                  // a flat pass to him: a floater was for the man it skipped
}
/* aiCarrier's hook, every step after the carrier has run: a call answered, or a look for him. True when a pass went. */
function proCarrier(p, dt) {
  if (!proRun(p)) return false;
  const K = M.proCall;
  if (K && K.at != null) {
    if (K.c !== p) M.proCall = null;                         // the ball has moved on since he called
    else {
      if ((K.at -= dt) > 0) return false;
      M.proCall = null;
      if (!p.bind && proOpen(p, PRO.callOpen)) { st('proAnswer'); doPass(p, M.careerP); return true; }
      proNo(p); return false;                                // it was on when he called and is not now
    }
  }
  if (p.hold < PRO.hold || gapAhead(p) >= PRO.gap || !proOpen(p, PRO.open) || rnd() >= proAt(PRO.seek, proSpirit())*dt) return false;
  st('proSeek'); doPass(p, M.careerP);
  return true;
}
/* Call for Ball */
function proCanCall() {                                      // would a press call now: a teammate holds it in open play, free of a tackle and not winding up a drop, no call pending, the last one PRO.cool ago
  if (!proOn() || M.phase !== 'play' || M.cut) return false;
  const b = M.ball, c = b.state === 'held' ? b.carrier : null, K = M.proCall;
  return !!(c && proRun(c) && !c.bind && !c.drop && !(K && K.at != null && K.c === c) && M.dclock - (M.proLast == null ? -99 : M.proLast) >= PRO.cool);
}
function proCall() {                                         // userStep's hook: Pass with a teammate on the ball
  if (!proCanCall()) return false;
  const c = M.ball.carrier;
  M.proLast = M.dclock; M.proCue = { p:M.careerP, at:M.dclock };
  st('proCalls'); sfx('tick'); buzz(15, 0);
  if (proOpen(c, PRO.callOpen) && rnd() < proAt(PRO.answer, proSpirit())) M.proCall = { c, at:PRO.react };
  else proNo(c);
  return true;
}
function proNo(c) { M.proNo = { p:c, at:M.dclock }; st('proNo'); sfx('whiff'); }
function proCalling(t) {                                     // your side's ball, and not in his hands or on its way to him: the Pass button is Call for Ball
  if (!proPinned(t)) return false;
  const b = M.ball, me = M.careerP;
  return !(b.state === 'held' ? b.carrier === me : b.state === 'air' && b.f && b.f.target === me);
}
/* A back's scrums and lineouts are played for the team; a forward plays them. */
function proSkip() { return !!(M && M.careerPro && M.careerP && !CAREER_POS.F.includes(M.careerP.n)); }
/* careerMark's hook: the call's ring going out from him, and the No sign (a slashed circle, no words) over the carrier. */
function proMark(r) {
  const now = M.dclock, C = M.proCue, N = M.proNo;
  if (C && C.p && now - C.at < PRO.callT) {
    const u = (now - C.at)/PRO.callT, [sx, sy] = toS(...drawPos(C.p));
    ctx.save(); ctx.globalAlpha = 1 - u; ctx.strokeStyle = ringCol(0); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(sx, sy, r*(RM ? 1.9 : 1.5 + 1.4*u), 0, 7); ctx.stroke(); ctx.restore();   // reduced motion: it fades where it is
  }
  if (N && N.p && now - N.at < PRO.noT) {
    const [sx, sy] = toS(...drawPos(N.p)), y = sy - r*2.7, R = Math.max(7, r*0.8), a = Math.min(1, 4*(1 - (now - N.at)/PRO.noT));
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(8,14,10,.88)'; ctx.beginPath(); ctx.arc(sx, y, R + 3, 0, 7); ctx.fill();
    ctx.strokeStyle = SUPPORT.tint; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(sx, y, R, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx - R*0.7, y - R*0.7); ctx.lineTo(sx + R*0.7, y + R*0.7); ctx.stroke();
    ctx.restore();
  }
}
