/* =========================================================
   Match engine. World units are metres.
   x: 0..120 (dead-ball to dead-ball), try lines at 10 and 110.
   y: 0..70 touchline to touchline. Team 0 (you) attacks +x.
   ========================================================= */
let M = null;
let stepGap = 1/60;                                         // real seconds since the last step. The frame loop sets it below pace 1; a plain update(STEP) always sees 1/60
const matchPace = () => (!M || practice ? 1 : M.kids ? MATCH_PACE.kids : MATCH_PACE.match);   // real time to match time, for the frame loop and the banner's timer. A drill is 1 here: it scales its own steps (drillRate)
const dirOf = t => t === 0 ? 1 : -1;
const oppLine = t => t === 0 ? 110 : 10;
const ownLine = t => t === 0 ? 10 : 110;
const SETGAP = { ruck:1.6, scrum:5, lineout:10, penalty:10, tap:10 };
/* The sides table. Each team has an entry in M.side: whether a human plays it, which input seat that human sits in, the man
   under their ring, their Difficulty, their kick charge and their Pass press. Engine code reads these, never `team === 0`,
   `input` or `M.di`, so one player, one player as the away side (humans:[false, true]) and two player all run one path. */
const sideOf = t => M.side[t];
const isHuman = t => M.side[t].human;
const inputOf = t => (M.side[t].human ? inputs[M.side[t].seat] : null);
const ctrlOf = t => (M.side[t].human ? M.side[t].ctrl : null);
const setCtrl = (t, q) => { if (M.side[t].human && q && !(proPinned(t) && q !== M.careerP)) M.side[t].ctrl = q; };   // Pro Mode: the ring stays on your player (career-pro.js)
const levelOf = t => M.side[t].level;
const seatOfTeam = t => (M.side[t].human ? M.side[t].seat : null);   // which seat a team's human sits in, for the rumble and the ring's colour
const anyCharging = () => M.side[0].charging || M.side[1].charging;
const clearCharge = () => { for (const s of M.side) { s.charging = false; s.charge = 0; } };
const humanSlots = () => M.side.filter(s => s.human).map(s => inputs[s.seat]);   // every human's input slot
/* Balance terms are keyed by role, not by team number: a side plays the human terms or the CPU terms (cpuSpeed, cpuTackle, the
   intercept and turnover edges, the scrum and lineout rules, the CPU's kick accuracy), each at its own level (a CPU side's level is
   the human's it plays against). AI v AI and the menu demo are fair: both sides play the CPU terms (team 0 used to keep the human
   ones, because `team === 1` was the test for the CPU). */
const cpuSide = t => M.role[t] === 'cpu';
let earlyDiff = null;   // Normal's levers with EARLY.nudge, or null. Set for a match, never left over into the next.
const diffOf = t => (M && M.kids ? KIDS.diff : M && M.early && earlyDiff && levelOf(t) === M.di ? earlyDiff : DIFF[levelOf(t)]);   // a Kids match (kids.js) plays both sides' terms from KIDS.diff
const CALM = { x:0, y:0, mph:0 };

function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n>>16&255, n>>8&255, n&255]; }
function colorDist(a,b) { const x = hexRgb(a), y = hexRgb(b); return hyp(x[0]-y[0], x[1]-y[1], x[2]-y[2]); }
/* A team's colour for marks on the dark scoreboard and plates: the shirt, or the trim if the shirt is near black, or chalk. */
function showCol(team) { const k = M.kit[team]; return colorDist(k.fill, '#0f1a12') >= 60 ? k.fill : colorDist(k.trim, '#0f1a12') >= 60 ? k.trim : '#f1eee4'; }

/* The away side changes when the shirts are too alike: its change kit, then its colours swapped, then white or black. */
function awayKit(n0, n1) {
  const h = !!n1.hoops;
  const opts = [[n1.kit, n1.trim, h], [n1.alt, n1.altTrim, false], [n1.trim, n1.kit, h], ['#f2efe6', n1.kit, false], ['#1c1c1c', n1.kit, false]].filter(o => o[0] && o[1]);
  let best = opts[0], bd = -1;
  for (const o of opts) {
    const d = colorDist(n0.kit, o[0]);
    if (d >= 140) return { fill:o[0], trim:o[1], hoops:o[2] };
    if (d > bd) { bd = d; best = o; }
  }
  return { fill:best[0], trim:best[1], hoops:best[2] };
}
const teamOf = t => typeof t === 'number' ? NATIONS[t] : t;
function newMatch(u, c, opts) {
  const n0 = teamOf(u);
  let n1 = teamOf(c);
  if (n1.id === n0.id) n1 = { ...n1, id:n1.id.slice(0, 2) + '2' };   // e.g. a team you called Farnham Minis against Farnham: this match only
  // who plays each side: [human, cpu] in one player, [false, false] for AI v AI and the demo, [true, true] in two player; tests may pass humans directly
  const humans = opts.humans || ((opts.auto || opts.demo) ? [false, false] : [true, false]);
  const auto = !humans[0] && !humans[1], two = humans[0] && humans[1], di = opts.diff == null ? 1 : opts.diff;   // M.di and M.diff: the match's one level, kept for the tools; the engine reads levelOf(t)
  const ease = !!(opts.early && di === 1 && !two && !auto && !opts.demo);   // the gentler start: asked for, Normal, one player, never the demo or AI v AI
  earlyDiff = null;
  if (ease) { const d = DIFF[di], o = { ...d }; for (const k in EARLY.nudge) o[k] = d[k] + EARLY.nudge[k]; earlyDiff = o; }
  M = {
    nat:[n0,n1], kit:[{ fill:n0.kit, trim:n0.trim, hoops:!!n0.hoops }, awayKit(n0, n1)],
    players:[], ball:{ x:60, y:35, z:0, vx:0, vy:0, vz:0, state:'dead', carrier:null, f:null, last:0, kickInfo:null },
    score:[0,0], tries:[0,0], half:1, clock:0, halfLen:opts.halfLen, diff:DIFF[di],
    hooter:false, phase:'set', set:null, goal:null, phaseCount:0, poss:0,
    firstKick: rnd() < 0.5 ? 0 : 1, auto, two, demo:!!opts.demo, champ:!!opts.champ, headless:!!opts.headless, early:ease,
    cup:typeof opts.cup === 'string' ? opts.cup : null, cupKO:typeof opts.cup === 'string' && !!opts.cupKO,   // a cup match (src/cups.js): its id, and whether it is a knockout or a Test, which the Golden Try reads
    paused:false, over:false, cam:{ x:60, y:35 }, cut:null, surge:null,
    di, duels:auto ? 'off' : (opts.duels || 'off'), duelPending:null, dclock:0,
    duelLog:{ last:-99, lastKind:null, lastOwner:null, half:[0, 0], bonus:[false, false], fails:0 },
    stats:{ tackles:0, broken:0, passes:0, kicks:0, rucks:0, turnovers:0, pens:0, knocks:0, intercepts:0, drops:0, duels:0, duelsWon:0, duelsPerfect:0, gk:{ att:[0, 0], made:[0, 0] }, dg:{ att:[0, 0], made:[0, 0], charged:[0, 0] },
      conv:{ att:[0, 0], made:[0, 0] }, pen:{ att:[0, 0], made:[0, 0] },   // conversions and penalty goals, kept apart; drop goals stay on dg
      tk:{ att:[0, 0], made:[0, 0] }, duelN:{ att:[0, 0], won:[0, 0] }, gain:[0, 0] },   // the full-time card: tackles by the tackler's side, duels by the owner, metres gained carrying
    dropOn:[false, false], dropArmed:[false, false],   // the drop-goal label, per side: what it read on the last frame, and what it promised at the B press
    dropSeen:[null, null], dropSet:[null, null],       // the chargers the label last saw (as the hold would leave them), and the ones the press committed the cut to
    contact:null,                                      // the bind under way: { c, q, q2, mode, tier, t, T, ... }
    pressure:[0, 0], press:{ poss:null, mark:[null, null], said:[false, false] },   // PRESSURE (src/contact.js): the pressure on each side's possession, who has it, the last breakdown's mark and whether Pressure On was said
    spr:[0, 1].map(() => ({ m:1, p:null, spent:false, cue:0, tick:-9, think:0 })),   // one Sprint meter a side: its level 0..1, who is sprinting on it, and whether a hold ran it dry
    stepN:0,                                           // every update counts one, close-ups included (gestureStep reads it)
    tags:[], fx:[], stop:0, shake:0, shakeT:0.12, rt:0, // render only: on-pitch tags, impact rings, the Big Hit's hit-stop, its shake and the shake's length, the render clock
    arcade:!!opts.arcade && !auto && !opts.demo,       // On Fire, the louder Big Hit and the Golden Try: a match you play, never AI v AI, the demo or practice
    fire:[0, 1].map(() => ({ heat:0, t:0 })), golden:false,   // each side's run towards On Fire and its seconds alight; extra time
    rules:RULES[opts.rules] || RULES.normal,           // the rule set this match plays (src/data.js): Normal unless the caller names another
    kids:!!opts.kids && di === 0 && !auto && !two && !opts.demo,   // the Kids level's levers (kids.js): asked for, on Easy, one player only; never AI v AI, the demo or two player
  };
  if (M.kids) { M.kidsR = kidsTune(opts.kidsR).r; M.kidsDone = false; }   // its rating sets the levers before anything reads them: the start (0) unless the caller says (startMatch passes settings.kidsR)
  /* A Kids half lasts the half chosen on a real clock (the owner, 2026-11-09: "2 Real Minutes"). The match runs at MATCH_PACE.kids, so
     the half is that share of the chosen half in simulated seconds (2 minutes: 90), and the clock on the scorebug reads real time
     (fmtClock), 2:00 at the hooter. The Golden Try is half of it (periodLen). Only where the Kids pace runs (matchPace): a drill keeps
     its own clock, and every other match keeps the half as given. The close-up quota reads the simulated half, as everything else in a
     half does: one close-up in a 2-minute half instead of two. It binds (the settled 7 to 8 year old has 2.2 a match, 2.6 with a quota of
     two, 3.0 in the 120-second half), but keeps the rate per real minute he had before (0.55 against 0.56; README.md, The half). */
  M.realClock = M.kids && !practice ? MATCH_PACE.kids : 0;
  if (M.realClock) M.halfLen = opts.halfLen*M.realClock;
  // the sides: a human's seat is the next free slot (the lone human of an away-side match sits in seat 0). A CPU side's level is the
  // level it is played at: its human opponent's, or the match's in AI v AI
  let seat = 0;
  M.side = [0, 1].map(t => ({ team:t, human:humans[t], seat:humans[t] ? seat++ : null, ctrl:null, ctrlPrev:null, ctrlT:0,
    charging:false, charge:0, holdN:0,                 // the kick charge: B held with the ball
    pass:null,                                         // a Pass press in hand: { mode:'tap'|'hold', to, t } so a hold can charge and an early tap is not dropped
    level:opts.levels ? opts.levels[t] : di,           // this player's Difficulty (the one level in one player)
    duel:{ half:[0, 0], lastKind:null, fails:0, first:true } }));   // two player: this owner's quota, his last kind, his failures in a row and his first-duel aid
  for (const t of [0, 1]) if (!humans[t] && humans[1 - t] && opts.levels) M.side[t].level = M.side[1 - t].level;
  M.role = [0, 1].map(t => (humans[t] ? 'human' : 'cpu'));
  { const m = M; for (const k of ['ctrl', 'ctrlPrev', 'ctrlT', 'charging', 'charge', 'holdN', 'pass']) Object.defineProperty(m, k, { get:() => m.side[0][k], set:v => { m.side[0][k] = v; }, enumerable:false, configurable:true }); }   // side 0's fields on M, for the tools and the console
  M.wind = makeWind();
  for (let t = 0; t < 2; t++) for (let i = 0; i < 7; i++) {
    M.players.push({ team:t, n:i+1, x:60, y:35, vx:0, vy:0, fx:dirOf(t), fy:0, down:0, tcd:0, side:0, hold:0, think:0, quick:false, fromKick:false, hx:60, hy:35, boost:0, boostMul:1, autoDir:0, drop:null,
      bind:null, bindOff:null, offside:0, sprint:0, sprinting:false, stumble:0, stumbleMul:1, wf:0, drawFrom:null, fend:0, fendA:0, bite:0, biteTo:null, dumAt:-9 });   // contact: the bind he is in, how long he is retiring, his sprint, a stumble, wrong-footed; then render-only smoothing and the fend; a Dummy he bought (bite: seconds left running at biteTo) and, for a CPU carrier, when he last sold one
  }
  M.side[0].ctrl = M.players[3]; if (humans[1]) M.side[1].ctrl = M.players[10];
  traitsArm();                                             // the star traits, in a match you play only (src/traits.js)
  for (const inp of inputs) inp.gest = null;               // the open-play gesture history starts clean
  M.tut = null; hintReset(); coachUntil = 0;               // the hints cards start hidden, the open-play hints unshown, and a coach line from the last match does not hold the next one
  restart('halfStart', M.firstKick);
}

function maxSpeed(p) {
  let s = 7.6 + (M.career ? careerNatOf(p) : M.nat[p.team]).pace*0.25;   // a career match: your player's own pace
  if (cpuSide(p.team)) s *= diffOf(p.team).cpuSpeed;
  let f = 1;
  if (p.boost > 0) f *= 1 + ((p.boostMul || 1) - 1)*Math.min(1, p.boost/0.6);
  if (M.surge && M.surge.team === p.team) f *= 1.08;
  if (p.chase > 0) f *= chaseMul(p);                        // chasing his side's kick (src/chase.js)
  if (onFire(p.team)) f *= ARCADE.fire.speed;
  if (edgeCarry(p)) f *= EDGE.pace;                          // Easy: your carrier, a little quicker with the ball (src/edge.js)
  f *= traitPace(p, staminaPace(p.team));                   // tired legs late in a half (1 outside matches you play); an Engine feels less of it
  const sp = sprintLevel(p);                                 // the bigger of the sprint and the duel's burst applies, never both
  if (sp > 0) f = Math.max(f, 1 + ((M.ball.carrier === p ? SPRINT.mulBall : SPRINT.mul)[levelOf(p.team)] - 1)*sp)*traitBurst(p, sp);   // a Burst sprints a little quicker
  if (p.stumble > 0) f *= p.stumbleMul || CONTACT.stumble[1];
  if (p.wf > 0) f *= RUCK.wf.mul;
  if (M.career) f *= careerFade(p);                         // a career match: your player's stamina, late in the half
  return s*f;
}
function nearestOf(arr, x, y) { let best = null, bd = 1e9; for (const p of arr) { const d = hyp(p.x-x, p.y-y); if (d < bd) { bd = d; best = p; } } return best; }
function nearestFree(team, x, y) { return nearestOf(M.players.filter(p => p.team === team && p.down <= 0 && !p.bind), x, y); }
function pressure(p) { let m = 99; for (const q of M.players) if (q.team !== p.team && q.down <= 0) m = Math.min(m, dist(p,q)); return m; }
function ourBall(t) {                                      // side t has it: held by its man, or its pass in the air
  const b = M.ball;
  return (b.state === 'held' && b.carrier.team === t) || (b.state === 'air' && b.f.kind === 'pass' && b.f.team === t);
}
function userActive(t) { return !!ctrlOf(t) && (M.phase === 'play' || (M.phase === 'set' && M.set.kind === 'ruck')); }   // the stick stays live through a ruck, on the man who will pick the ball up

function steer(p, tvx, tvy, acc, dt) {
  const dx = tvx-p.vx, dy = tvy-p.vy, m = hyp(dx,dy), a = acc*dt*traitAcc(p);   // a Burst gets going quicker while he sprints (src/traits.js)
  if (m <= a) { p.vx = tvx; p.vy = tvy; } else { p.vx += dx/m*a; p.vy += dy/m*a; }
}
function seek(p, tx, ty, speed, acc, dt, pursue) {
  const dx = tx-p.x, dy = ty-p.y, d = hyp(dx,dy);
  if (d < 0.05) { steer(p, 0, 0, acc, dt); return; }
  const sp = pursue ? speed : Math.min(speed, d*2.2);
  steer(p, dx/d*sp, dy/d*sp, acc, dt);
}

function placeBall(x, y) {
  const b = M.ball;
  b.state = 'dead'; b.carrier = null; b.f = null; b.x = x; b.y = y; b.z = 0; b.vx = b.vy = b.vz = 0;
  eggOff(b); if (b.off) b.off = null;                      // nobody is offside at a dead ball (CALLS, src/calls.js)
}
function playFrom(team, x, y, kind) {                      // the mark the ball is played from: a ruck 1.6m behind, a scrum 1.2, a lineout 1.5 and out to the side
  const d = dirOf(team);
  const off = kind === 'ruck' ? 1.6 : kind === 'scrum' ? 1.2 : kind === 'lineout' ? 1.5 : 0.6;
  const sy = kind === 'lineout' ? (y < 35 ? y + 4 : y - 4) : y;
  return { x:x - d*off, y:sy };
}
function startSet(o) {
  M.phase = 'set'; M.set = o;
  if (o.label) say(o.label);
  if (o.kind === 'ruck') {
    // the ring leaves the tackled man for the teammate who will pick the ball up, so the stick can place him while the ruck is still down. A CPU side is left alone
    if (isHuman(o.team)) {
      const m = playFrom(o.team, o.x, o.y, 'ruck'), p = nearestFree(o.team, m.x, m.y);
      if (p) { o.picker = p; setCtrl(o.team, p); }
    }
    return;
  }
  if (o.kind !== 'try' && o.kind !== 'score') for (const t of [0, 1]) {
    if (!isHuman(t)) continue;
    const q = nearestFree(t, o.x, o.y); if (q) setCtrl(t, q);
  }
}

/* ---------- restarts ----------
   Every stoppage comes through restart(): why play stopped (a row of the match's rule set, src/data.js), the side that gets
   the ball, and where. Once the hooter has gone a stoppage ends the half instead, unless its row plays on. */
const RESTART_KIND = { kickoff, dropOut, scrum, lineout, penalty };
function restart(why, team, x, y) {
  if (M.hooter && !M.demo && !M.rules.restarts[why].playOn) { endHalf(); return; }
  restartNow(why, team, x, y);
}
function restartNow(why, team, x, y) {                     // the restart with no look at the hooter: for a caller that settled the dead ball earlier (knockBeat, src/contact.js)
  const r = M.rules.restarts[why];
  RESTART_KIND[r.kind](team, x, y, r.label);
}
function kickoffFormation(kTeam, kx) {
  const d = dirOf(kTeam);
  const KY = [6,16,26,35,44,54,64];
  const RX = [12,12,12,22,24,24,38], RY = [15,35,55,8,28,48,35];
  let i = 0, j = 0;
  for (const p of M.players) {
    if (p.team === kTeam) { p.x = kx - d*(i === 3 ? 2.5 : 1.2); p.y = KY[i]; i++; p.fx = d; }
    else { p.x = clamp(kx + d*RX[j], 2, 118); p.y = RY[j]; j++; p.fx = -d; }
    p.fy = 0; p.vx = p.vy = 0; p.down = 0; p.tcd = 0; p.side = 0; p.boost = 0; p.hx = p.x; p.hy = p.y;
    p.bind = null; p.offside = 0; p.sprint = 0; p.sprinting = false; p.stumble = 0; p.wf = 0; p.drawFrom = null; p.fend = 0;
  }
  M.contact = null;
  for (const S of M.spr) { S.p = null; S.spent = false; }
}
function kickoff(team) {
  kickoffFormation(team, 60);
  placeBall(60, 35);
  M.phaseCount = 0; M.poss = team;
  startSet({ kind:'kickoff', team, x:60, y:35, t:1.4, then:() => restartKick(team, 60, 35, 'kickoff') });
  if (!M.two && outmatched(M.nat[0], M.nat[1])) say('Stronger Side', 'small');   // say itself is quiet in the demo and headless
  if (M.career) careerKickoff();                           // a career match: the ring starts on your player
}
function dropOut(team) {
  const kx = team === 0 ? 32 : 88;
  kickoffFormation(team, kx);
  placeBall(kx, 35);
  M.phaseCount = 0; M.poss = team;
  startSet({ kind:'dropout', team, x:kx, y:35, t:1.5, label:'22 Drop-Out', then:s => restartKick(s.team, s.x, 35, 'dropout') });
}
function restartKick(team, x, y, kind) {
  const d = dirOf(team);
  const len = kind === 'kickoff' ? 13 + rnd()*9 : 30 + rnd()*10;
  const ty = clamp(y + (rnd()-0.5)*44, 10, 60);
  kickBall(team, x, y, x + d*len, ty, kind === 'kickoff' ? 2.2 : 2.5, kind === 'kickoff' ? 11 : 13, 'restart');
  sfx('kick');
}
function scrum(team, x, y, reason) {
  M.stats.scrums = (M.stats.scrums||0) + 1;
  placeBall(clamp(x,15,105), clamp(y,15,55));
  startSet({ kind:'scrum', team, x:clamp(x,15,105), y:clamp(y,15,55), t:interactive() ? 1.1 : 1.8, snap:true,
    label:(reason ? reason + ' · ' : '') + 'Scrum ' + M.nat[team].id, then:s => interactive() && !proSkip() ? startScrum(s) : autoScrum(s) });   // Pro Mode: a back's scrum is played for the team
}
function lineout(team, x, y, reason) {
  const ly = y < 35 ? 8 : 62;
  placeBall(clamp(x,15,105), ly);
  startSet({ kind:'lineout', team, x:clamp(x,15,105), y:ly, t:interactive() ? 1.1 : 1.8, snap:true,
    label:(reason ? reason + ' · ' : '') + 'Lineout ' + M.nat[team].id, then:s => interactive() && !proSkip() ? startLineout(s) : autoLineout(s) });   // and his lineout
}
function releaseTo(team, x, y, kind, who) {
  const d = dirOf(team);
  const m = playFrom(team, x, y, kind);
  const pinned = kind === 'ruck' && who && who.team === team && onFeet(who) ? who : null;   // the man the stick was placing picks it up, wherever he was put; a turnover never asks for him
  const p = pinned || nearestFree(team, m.x, m.y) || M.players.find(q => q.team === team);
  if (kind === 'scrum' || kind === 'lineout') {   // the scrum-half or catcher takes it at the mark, whoever won it
    p.x = clamp(m.x, 1, 119); p.y = clamp(m.y, 2, 68); p.vx = p.vy = 0; p.fx = d; p.fy = 0;
  }
  M.phase = 'play';
  setCarrier(p);
  p.quick = kind === 'ruck' || kind === 'scrum' || kind === 'lineout';
  if (kind === 'ruck' && team === M.poss) { /* phase count already advanced at the tackle */ }
}

/* ---------- possession ---------- */
function setCarrier(p) {
  const b = M.ball;
  if (M.poss !== p.team) M.phaseCount = 0;
  b.state = 'held'; b.carrier = p; b.f = null; b.last = p.team; b.kickInfo = null; eggOff(b); if (b.off) b.off = null;   // a new phase: nobody is offside from the last (CALLS)
  p.hold = 0; p.think = 0.1; p.quick = false; p.drop = null;
  if (M.proCall) M.proCall = null;                         // Pro Mode: a call lasts one possession, his own catch and the caller's next one included (career-pro.js)
  M.poss = p.team;
  clearCharge();
  for (const t of [0, 1]) {                                // the carrier's side takes him; any other human side re-picks when its man is down or far off
    if (!isHuman(t)) continue;
    if (p.team === t) setCtrl(t, p);
    else { const cur = ctrlOf(t); if (!cur || cur.down > 0 || dist(cur, p) > 8) { const q = practice && practice.id === 'defend' ? defendRepick(t, p) : nearestFree(t, p.x, p.y); if (q) setCtrl(t, q); } }   // Defend a Breakaway: never back to the beaten man (training.js)
  }
}
function catchBall(p, kind) {
  const n = M.career ? careerNatOf(p) : M.nat[p.team], f = M.ball.f;   // a career match: your player's own handling
  const base = (0.015 + (5-n.handling)*0.01)*knockLv('base'), marked = pressure(p) < 1.8, long = kind === 'pass' && !!f && !!f.long;   // the base: the drop with no cause to see, halved (KNOCK, src/knock.js)
  let k = base + (kind === 'kick' ? 0.05 : 0) + (kind === 'intercept' ? knockLv('intercept') : 0);   // an interception your man ran into: KNOCK.intercept, 0.2 before
  if (marked) k += 0.04;
  if (long) k += LONG.knock;                               // a floater is a little harder to take
  if (onFire(p.team)) k *= ARCADE.fire.hands;            // On Fire: surer hands
  if (M.kids && isHuman(p.team)) k *= KIDS.hands;         // Kids: your side hardly ever knocks on
  if (M.career) k *= careerLifeHands(p, kind, f);          // a career match: Team Spirit, on a pass to or from your player
  const r = rnd(), pk = traitHands(p, k);                  // one draw whatever the chance (tools/knock.mjs)
  if (globalThis.__knockSpy) globalThis.__knockSpy('catch', p, { kind, base, marked, long, k, pk, r });   // the tools sort every catch by its cause
  if (r < pk) { knockOn(p); return; }                      // Safe Hands: hardly ever
  setCarrier(p); sfx('catch');
  traitCaught(p, r, k);
  p.fromKick = kind === 'kick';
  if (kind === 'pass' && isHuman(p.team)) p.grace = M.kids ? KIDS.grace : PASS_FLIGHT.grace[levelOf(p.team)];   // a moment to see the catch before an AI man can commit (Kids: its rating's, kidsTune)
  if (kind === 'intercept') { M.stats.intercepts++; say('Intercepted', 'small', callCol(p.team)); heat(p.team, 'turnover'); callWon(p); possCall(p, 'Intercepted', true); }   // in the winner's colour, and called over him (src/calls.js)
  else if (kind === 'pass' && f && f.call) possCall(p, f.call, false);   // an offload a teammate the computer runs made to the ring's man: Offload
}
function knockOn(p, why) {                                 // why: 'catch' (the default), 'contact' (jolted loose) or 'offload'
  M.stats.knocks++; st('ko_' + (why || 'catch'));
  if (globalThis.__knockSpy) globalThis.__knockSpy('knock', p, { why:why || 'catch' });   // whose, and how
  if (knockLv('tag')) tag('Knock-On', p.x, p.y);           // over the man who dropped it, as Loose Ball is (KNOCK, src/knock.js)
  placeBall(p.x, p.y);
  sfx('fumble');
  if (knockBeat(p)) return;                                // PRESSURE: it hops for a beat before the whistle (src/contact.js)
  sfx('whistle');
  restart('knockOn', 1-p.team, p.x, p.y);
}
function pickUp(p) {
  const b = M.ball;
  if (b.x < 10 || b.x > 110) {
    const defTeam = b.x < 10 ? 0 : 1;
    if (p.team !== defTeam) { scoreTry(p); return; }
    placeBall(b.x, b.y); sfx('whistle');
    restart('groundedInGoal', defTeam);
    return;
  }
  const turn = p.team !== b.last && !b.kickInfo;
  setCarrier(p); sfx('catch');
  if (turn) { M.stats.turnovers++; say('Turnover', 'small', callCol(p.team)); heat(p.team, 'turnover'); callWon(p); }
  possCall(p, turn ? 'Turnover' : 'Picked Up', turn);       // the ring's man has it: say how (src/calls.js). A kick is anyone's, a kick-off and a drop-out among them, so a kick gathered is Picked Up
}

