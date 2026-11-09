// Career Pro Mode: your player alone. The choice and its save, the ring held on him, his teammates run by the computer,
// Call for Ball, Team Spirit's pull on who gets the ball, set pieces, the screens, and Pro Mode matches played to full time.
// node tools/career-pro.mjs   Exits 1 on any failure.
process.env.SEED ??= '29';
const { T, reseed, bot, duelBot, kickBot, dropBot, scrumBot, lineBot } = await import('./harness.mjs');
const { readGameSource } = await import('./source.mjs');
const C = T.career, P = T.careerPro, X = T.teams, D = T.debug, K = T.contact, $ = id => document.getElementById(id);
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const json = v => JSON.stringify(v);
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
const memory = {};
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; } };
const settings = D.settings();
const ready = () => { settings.played = 99; settings.diff = 1; settings.kids = false; settings.half = 0; };   // Normal, 2-minute halves, no gentler start: the same match every run

// 0. With Pro Mode off the game plays exactly as it did. Run first, so nothing in this file can move them.
//    NON_CAREER is career.mjs's fingerprint (two AI v AI matches, an arcade match you play and a plain one). TEAM is two whole career
//    matches through Play Match with the harness's bot, Whole Team (a back and a forward, interactive close-ups, the half-time card),
//    pinned on 30e13e2, the commit before Pro Mode. Re-pin TEAM only from a change that moves Whole Team career play on purpose (the
//    Energy, Morale and Team Spirit effects in career-life.js are one, so teamMatch sets those bars to their neutral 100, 50 and 50,
//    where they move nothing), from that change's bundle without career-pro.js.
// NON_CAREER follows career.mjs's BASE, the same seeded runs: re-pinned with it when the nations were rated on the XV rankings (its first
// value, AI v AI, moved with the ratings alone).
// TEAM re-pinned at club seasons (2026-11-08): a career's first year at Farnham and Aldershot is their Local league at full strength,
// no longer the Minis one off every ability. With the Minis' sides put back (team(true): the same draw, one off every ability) this
// build gives the pin from before Pro Mode, TEAM_MINIS, exactly.
const NON_CAREER = '7kryop s07wn3 1imi7lm', TEAM = 'iacmpw 1ecdokz', TEAM_MINIS = '1d34wts 1oezzg9';   // re-pinned at pressure (PRESSURE, src/contact.js, 2026-11-09), which changes AI v AI and every match on purpose (the count, the spill, the egg's hops, a knock-on's beat); with PRESSURE='{"on":false}' this build gives the pin before it exactly, NON_CAREER 'lhsdx3 1vnm2gm 70qhmw', TEAM '1ytx0j 1r23tx', TEAM_MINIS '1ooxlif t7zytl'. Before that: re-pinned at the real order (src/ratings.js, CLUB_RATED, 2026-11-09): Farnham v Haslemere in the non-career matches, 61 v 46 (were 75 v 64), and the career's Surrey league at Farnham re-rated with it; with CLUB_RATED=band this build gives the pins before it exactly, lhsdx3 1wmrjk7 n3fvw5, 1hz0lk0 66vc32 and 3wqcqk 1xh2mp. Before that: re-pinned at PR #14's club table (src/ratings.js, CLUB_RATED): Haslemere (64, was 67) in the non-career match, and the career's Local league at Farnham and Aldershot re-rated from last season's tables (Aldershot 64, was 72); with CLUB_RATED=off this build gives the pins before it exactly, lhsdx3 1wmrjk7 uge569, 1k1rp0v d3xoxp and 3wqcqk 14ancgg. Before that: re-pinned at the PR #14 merge for its calmer passing (PASS_FLIGHT: the ball hangs longer and a catcher gets a moment): with PASS_FLIGHT='{"match":1,"kids":1,"grace":[0,0,0],"graceKids":0}' this build gives the old pin exactly, 1o2r2g2 1uombq7 12cy4qs, kui40f 1x06cnw and 1c73jxu 1d1uovf
function nonCareer() {
  const out = [];
  reseed(23);
  out.push(json(T.simulate(2, 60, 1).map(r => [r.teams, r.score, r.tries, r.steps])));
  for (const [i, o] of [[0, { arcade:true, duels:'live' }], [1, { duels:'off' }]]) {
    reseed(100 + i);
    T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:1, headless:true, humans:[true, false], ...o });
    let n = 0; while (!T.M.over && n < 200000) { bot(0); T.update(T.STEP); n++; }
    out.push(json([T.M.score, T.M.tries, T.M.stats, n]));
  }
  return out.map(fnv).join(' ');
}
// a career match played out through the real path: Play Match, the half-time card's Second Half, a penalty card's choice
function playOut(step, limit = 400000) {
  const M = T.M; let n = 0;
  while (!M.over && n < limit) {
    if (M.phase === 'break') { $('br-go').click(); continue; }
    if (M.phase === 'menu' && !$('m-pen').hidden) { ($('p-goal').disabled ? $('p-tap') : $('p-goal')).click(); continue; }
    step(); T.update(T.STEP); n++;
  }
  return n;
}
function teamMatch(seed, o, minis) {
  reseed(seed); ready();
  const cr = C.create({ pos:o.pos, num:o.num, club:X.CLUBS[o.club] }); C.set(cr);
  if (minis) cr.season.teams = cr.season.teams.map(t => { const m = { ...t }; for (const [k] of T.stamina.ABILITIES) if (k in m) m[k] = Math.max(1, m[k] - 1); return m; });   // the Minis' sides, as careers had them before club seasons
  if (cr.life) Object.assign(cr.life, { energy:100, morale:50, spirit:50 });   // career-life.js's bars at their neutral values: Whole Team plays as on 30e13e2
  C.play();
  const n = playOut(() => bot(0), 200000);
  const out = json([T.M.score, T.M.tries, T.M.stats, n]);
  D.exitMatch(); C.set(null);
  return out;
}
const team = minis => [teamMatch(301, { pos:'B', num:5, club:0 }, minis), teamMatch(302, { pos:'F', num:2, club:3 }, minis)].map(fnv).join(' ');
{ const a = nonCareer(), b = team(), m = team(true);
  ok(a === NON_CAREER, `non-career matches play exactly as before Pro Mode (seeded fingerprint ${a}, pinned ${NON_CAREER})`);
  ok(b === TEAM, `a Whole Team career match plays as pinned (seeded fingerprint ${b}, pinned ${TEAM})`);
  ok(m === TEAM_MINIS, `and, with the Minis' sides it was pinned on, exactly as before Pro Mode (${m}, pinned ${TEAM_MINIS})`); }

// The scripted Pro Mode player. The harness's bot with the ball and in defence (its Switch press does nothing here); its close-up
// bots in his duels, his goal kicks and, for a forward, the scrums and lineouts. While a teammate has the ball he runs a support
// line 3.5m behind and 6.5m wide of him, on the side he is already on, and calls for it at `call` times a second while a pass is on.
function proBot(o = {}) {
  const M = T.M, b = M.ball, me = M.careerP, inp = T.input;
  if (M.phase === 'cut' && M.cut) {
    inp.jx = 0; inp.jy = 0; const c = M.cut;
    if (c.duel) duelBot(c); else if (c.kind === 'goal') (c.g.type === 'drop' ? dropBot : kickBot)(c, M.kids ? { aim:c.g.aim } : {});   // Kids sets the aim
    else if (c.kind === 'scrum') scrumBot(0); else if (c.kind === 'lineout') lineBot(0);
    return;
  }
  const mate = M.phase !== 'play' ? null : b.state === 'held' && b.carrier.team === 0 && b.carrier !== me ? b.carrier
    : b.state === 'air' && b.f.kind === 'pass' && b.f.team === 0 && b.f.target !== me ? b.f.target : null;
  if (!mate) { bot(0); return; }
  inp.jx = 0; inp.jy = 0; inp.cDown = false;
  const s = Math.abs(me.y - mate.y) < 1 ? (mate.y < 35 ? 1 : -1) : Math.sign(me.y - mate.y);
  const tx = mate.x - 3.5 + mate.vx*0.35, ty = Math.max(4, Math.min(66, mate.y + s*6.5)), dx = tx - me.x, dy = ty - me.y, dd = Math.hypot(dx, dy);
  if (dd > 0.4) { const m = Math.min(1, dd/2); inp.jx = dx/dd*m; inp.jy = dy/dd*m; }
  if (o.call && b.state === 'held' && P.canCall() && P.open(mate, P.PRO.callOpen) && Math.random() < o.call*T.STEP) inp.aPressed = true;
}
// a Pro Mode career match to full time: the passes thrown to him, and the match
function proMatch(seed, spirit, o = {}) {
  reseed(seed); ready();
  const cr = C.create({ pos:o.pos || 'B', num:o.pos === 'F' ? 2 : 5, club:X.CLUBS[seed % 6], proMode:true }); C.set(cr);
  C.play();
  const M = T.M; if (spirit != null) M.careerLife = { energy:80, morale:60, spirit:Math.round(spirit*100) };
  let thrown = 0, air = false, ring = true; const cuts = new Set(), sets = new Set();
  const n = playOut(() => {
    proBot(o);
    const b = M.ball, now = b.state === 'air' && b.f.kind === 'pass' && b.f.team === 0 && b.f.target === M.careerP && b.f.x0 != null;
    if (now && !air) thrown++;
    air = now;
    if (T.sides.ctrlOf(0) !== M.careerP) ring = false;
    if (M.cut) cuts.add(M.cut.duel ? 'duel' : M.cut.kind);
    if (M.phase === 'set' && M.set) sets.add(M.set.kind);
  });
  return { M, cr, n, thrown, ring, cuts, sets, stats:M.stats };
}

// 1. the choice and its save
{
  const a = C.create({ pos:'B', num:5, club:X.CLUBS[0] }), b = C.create({ pos:'B', num:5, club:X.CLUBS[0], proMode:true });
  ok(a.proMode === false && b.proMode === true, 'a new career is Whole Team unless My Player is picked');
  ok(C.create({ pos:'B', num:5, club:X.CLUBS[0], proMode:'yes' }).proMode === false && C.create({ pos:'B', num:5, club:X.CLUBS[0], proMode:1 }).proMode === false, 'only a true picks My Player');
  ok(json(C.clean(b)) === json(b) && json(C.clean(a)) === json(a), 'a new career of either kind passes its own validator unchanged');
  const old = JSON.parse(json(b)); delete old.proMode;
  ok(C.clean(old).proMode === false, 'a career saved before Pro Mode loads as Whole Team');
  ok(C.clean({ ...b, proMode:'true' }).proMode === false && C.clean({ ...b, proMode:null }).proMode === false, 'a bad value is Whole Team');
  const signed = C.clean({ ...JSON.parse(json(b)), phase:undefined, stage:3, pro:'TLS' });   // a Pro Club career from before club seasons
  ok(signed.club.id === 'TLS' && signed.proMode === true && C.teamFor(signed).name === 'Toulouse' && !('pro' in signed), 'Pro Mode is its own field: a Pro Club career from before club seasons loads at the side it signed for (`pro`, now its club), still Pro Mode');
  C.set(b); X.save();
  const disk = JSON.parse(memory['tryline.v1']).career;
  C.set(null); X.restore({ career:disk });
  ok(C.get() && C.get().proMode === true && json(C.get()) === json(b), 'a Pro Mode career saves and loads back exactly');
  C.set(null);
}

// 2. who is armed
{
  ready();
  C.set(C.create({ pos:'B', num:5, club:X.CLUBS[0] })); C.play();
  ok(T.M.career === true && T.M.careerPro === false, 'a Whole Team career match is not Pro Mode');
  D.exitMatch();
  C.set(C.create({ pos:'B', num:5, club:X.CLUBS[0], proMode:true })); C.play();
  ok(T.M.career === true && T.M.careerPro === true && P.pinned(0) && !P.pinned(1), 'a My Player career match is, for your side only');
  D.exitMatch();
  T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:1, headless:true, humans:[true, false] });
  ok(!T.M.careerPro && !P.pinned(0), 'with a Pro Mode career under way, a Quick Match is not Pro Mode');
  T.newMatch(X.NATIONS[0], X.NATIONS[1], { halfLen:60, champ:true, headless:true });
  ok(!T.M.careerPro, 'nor a championship match');
  T.practice.start('defend');
  ok(!T.M.careerPro, 'nor a drill');
  T.practice.leave();
  C.set(null);
}

// a Pro Mode career match staged in open play: `carrier` holds the ball (a teammate, n=1, unless he is the one), everyone else away
function stage(o = {}) {
  ready();
  const cr = C.create({ pos:o.pos || 'B', num:o.num || 5, club:X.CLUBS[0], proMode:o.pro !== false }); C.set(cr);
  C.play();
  const M = T.M, me = M.careerP;
  T.kick.stageDrop({ x:50, y:35 }, [], 0);                   // own[0] (n=1) carries at x=50; the other side 22m and more upfield
  M.phaseCount = 0; M.clock = 20; M.dclock = 20;
  for (const p of M.players) { p.hold = 2; p.side = -1; }
  if (o.me) { me.x = o.me.x; me.y = o.me.y; me.vx = me.vy = 0; }
  M.careerLife = { energy:80, morale:60, spirit:Math.round((o.spirit ?? 0.5)*100) };
  T.input.jx = T.input.jy = 0; T.input.aPressed = T.input.bPressed = T.input.cPressed = false; T.input.aDown = T.input.bDown = T.input.cDown = false;
  return { M, me, c:M.ball.carrier, mates:M.players.filter(p => p.team === 0 && p !== me && p !== M.ball.carrier), foes:M.players.filter(p => p.team === 1) };
}
const steps = n => { for (let i = 0; i < n; i++) T.update(T.STEP); };

// 3. the ring is his
{
  let s = stage({ me:{ x:46, y:43 } });
  ok(s.c.n === 1 && s.c !== s.me && T.sides.ctrlOf(0) === s.me, 'a teammate catching the ball does not take the ring: it stays on your player');
  T.sides.setCtrl(0, s.mates[0]);
  ok(T.sides.ctrlOf(0) === s.me, 'nothing can move it to a teammate');
  ok(K.switchTarget(0) === null, 'there is no Switch: no man for it to take');
  T.M.ball.carrier = s.foes[0]; s.foes[0].x = 80; s.me.x = 40;
  ok(K.sprintPick(0) === null, 'Sprint never moves the ring to a chaser, however far away he is');
  D.exitMatch();
  s = stage({ pro:false, me:{ x:46, y:43 } });
  ok(T.sides.ctrlOf(0) === s.c, 'Whole Team: the ring goes to the carrier, as before');
  D.exitMatch();
}

// 4. his teammates are run by the computer
{
  let s = stage({ me:{ x:46, y:50 } });
  const x0 = s.c.x;
  steps(60);
  ok(T.M.ball.state !== 'held' || T.M.ball.carrier !== s.c || s.c.x > x0 + 3, `the carrier runs by himself with the stick let go (${(s.c.x - x0).toFixed(1)}m)`);
  let passedOn = false;
  for (let i = 0; i < 60*8 && !passedOn; i++) { T.update(T.STEP); const b = T.M.ball; if (b.state === 'air' && b.f.kind === 'pass' && b.f.team === 0) passedOn = true; if (T.M.phase !== 'play') break; }
  ok(passedOn || T.M.stats.tackles > 0 || T.M.stats.kicks > 0, 'and passes, kicks or takes the tackle by himself');
  D.exitMatch();
  s = stage({ pro:false, me:{ x:46, y:50 } });
  steps(30);
  ok(Math.abs(s.c.x - 50) < 1.5, 'Whole Team: the same carrier is yours, and stands while the stick is let go');
  D.exitMatch();
  // a teammate's offload: he tries them as the CPU's carriers do; your player's are still your Pass press
  s = stage({ me:{ x:46, y:43 } });
  let tries = 0, mine = 0;
  for (let i = 0; i < 400; i++) {
    for (const [c, q] of [[s.c, s.foes[0]], [s.me, s.foes[1]]]) {
      const M = T.M; M.phase = 'play'; M.ball.state = 'held'; M.ball.carrier = c; M.contact = null;
      for (const p of [c, q]) { p.bind = null; p.down = 0; p.tcd = 0; }
      q.x = c.x + 1; q.y = c.y;
      const k = K.commitTackle(q, c, 'ai');
      if (k && k.aiOff != null) { if (c === s.me) mine++; else tries++; }
      if (k) K.releaseBind(k);
    }
  }
  ok(tries > 0 && mine === 0, `a teammate held in a tackle tries an offload by himself (${tries} in 400), your player never does (${mine})`);
  D.exitMatch();
  // a teammate's drop goal is the CPU's: drawn inputs, struck in the open, no close-up
  s = stage({ me:{ x:40, y:43 } });
  const kk = s.c; kk.x = 86; kk.y = 35; T.M.ball.x = kk.x; T.M.ball.y = kk.y;
  for (const q of s.foes) { q.x = 112; q.y = 10 + s.foes.indexOf(q)*8; }
  T.kick.cpuDrop(kk);
  ok(kk.drop && kk.drop.g && kk.drop.g.cpu && Number.isFinite(kk.drop.g.cpu.m), 'a teammate going for a drop goal has the CPU kicker\'s inputs');
  let threw = null;
  try { steps(40); } catch (e) { threw = e; }
  ok(!threw && !kk.drop && !T.M.cut && (T.M.ball.state === 'air' || T.M.ball.state === 'loose' || T.M.stats.dg.made[0] > 0 || T.M.phase !== 'play'), `and strikes it in the open with no close-up (${threw ? threw.message : T.M.ball.state})`);
  D.exitMatch();
  C.set(null);
}

// 5. the buttons
{
  let s = stage({ me:{ x:46, y:43 } });
  D.updateHud();
  ok($('la').textContent === 'Call for Ball' && $('btnB').hidden && !$('btnA').classList.contains('idle') && $('btnA').classList.contains('two'), 'a teammate has it: Pass is Call for Ball (two lines in the big button), and Kick is gone');
  ok(!$('btnC').hidden, 'Sprint stays');
  const M = T.M; M.ball.carrier = s.me; s.me.x = 50; s.c.x = 46;
  D.updateHud();
  ok($('la').textContent === 'Pass' && !$('btnB').hidden && /Kick|Drop Goal/.test($('lb').textContent) && !$('btnA').classList.contains('two'), 'he has it: Pass and Kick, as today');
  M.ball.carrier = s.foes[0];
  D.updateHud();
  ok($('la').textContent === 'Tackle' && $('btnB').hidden, 'defending: Tackle, and no Switch');
  D.exitMatch();
  s = stage({ pro:false });
  T.M.ball.carrier = s.foes[0]; D.updateHud();
  ok($('la').textContent === 'Tackle' && $('lb').textContent === 'Switch' && !$('btnB').hidden, 'Whole Team: Tackle and Switch, as before');
  D.exitMatch();
  ok(/\.act\.a\.two span\{[^}]*white-space:normal/.test(readGameSource()), 'Call for Ball wraps inside the big button');
  C.set(null);
}

// 6. Call for Ball
{
  const press = () => { T.input.aPressed = true; T.update(T.STEP); };
  // open, Team Spirit full: answered, a moment later
  let s = stage({ me:{ x:46, y:43 }, spirit:1 });
  for (let i = 0; i < 20 && !T.M.proCall; i++) { T.M.proLast = null; press(); if (!T.M.proCall) { s = (D.exitMatch(), stage({ me:{ x:46, y:43 }, spirit:1 })); } }
  const pend = T.M.proCall;
  ok(pend && pend.c === s.c && T.M.ball.state === 'held', 'Pass with a teammate on the ball calls for it; the carrier answers a moment later, not at once');
  ok(T.M.stats.proCalls >= 1 && T.M.proCue && T.M.proCue.p === s.me, 'the call shows as a ring going out from your player');
  let to = null; for (let i = 0; i < 30 && !to; i++) { T.update(T.STEP); const b = T.M.ball; if (b.state === 'air' && b.f.kind === 'pass') to = b.f.target; }
  ok(to === s.me, 'answered: the pass comes to him');
  D.exitMatch();
  // marked: a defender on him, so the call is never answered, whatever Team Spirit says
  s = stage({ me:{ x:46, y:43 }, spirit:1 }); s.foes[2].x = 46.8; s.foes[2].y = 44; s.foes[2].vx = s.foes[2].vy = 0;
  press();
  ok(!T.M.proCall && T.M.proNo && T.M.proNo.p === s.c && T.M.stats.proNo === 1, 'marked: a No over the carrier, no pass into trouble');
  ok(T.M.ball.carrier === s.c, 'and the carrier keeps it');
  D.exitMatch();
  // the lane to him blocked, or he is in front of the ball
  s = stage({ me:{ x:46, y:43 }, spirit:1 }); s.foes[2].x = 48; s.foes[2].y = 39; s.foes[2].vx = s.foes[2].vy = 0;
  press();
  ok(!T.M.proCall && T.M.stats.proNo === 1, 'a defender in the line to him: No');
  D.exitMatch();
  s = stage({ me:{ x:54, y:43 }, spirit:1 });
  press();
  ok(!T.M.proCall && T.M.stats.proNo === 1, 'in front of the ball: No (a pass can\'t go forward)');
  D.exitMatch();
  // one call each PRO.cool seconds
  s = stage({ me:{ x:46, y:43 }, spirit:0 }); s.foes[2].x = 46.8; s.foes[2].y = 44;
  press(); const n1 = T.M.stats.proCalls; steps(10); press();
  ok(n1 === 1 && T.M.stats.proCalls === 1, 'a second press inside the cooldown does nothing');
  T.M.dclock += P.PRO.cool; press();
  ok(T.M.stats.proCalls === 2, 'after it, he can call again');
  D.exitMatch();
  // a call still waiting when the ball moves on is dropped
  s = stage({ me:{ x:46, y:43 }, spirit:1 });
  for (let i = 0; i < 20 && !T.M.proCall; i++) { T.M.proLast = null; P.call(); }   // answered 95% of the time at Team Spirit 1: called until it is
  if (T.M.proCall) { const other = s.mates[0]; T.M.ball.carrier = other; other.hold = 2; steps(1); ok(!T.M.proCall || T.M.proCall.c !== other, 'a call the ball has moved on from is dropped'); }
  else ok(false, 'a call at Team Spirit 1 was not answered');
  D.exitMatch();
  // a call lasts one possession: the caller gives the ball to him before he answers (an offload, say), and later has it back
  // from him. The call went with the first catch, so the caller never answers it late with a pass straight back.
  {
    let cycle = null;
    for (let a = 0; a < 12 && !cycle; a++) {
      s = stage({ me:{ x:46, y:43 }, spirit:1 });
      for (let i = 0; i < 20 && !T.M.proCall; i++) { T.M.proLast = null; P.call(); }
      const M = T.M, c = s.c, me = s.me, catchBy = p => { for (let i = 0; i < 90; i++) { T.update(T.STEP); const b = M.ball; if (b.state === 'held') return b.carrier === p; if (b.state !== 'air' || M.phase !== 'play') return false; } return false; };
      if (!M.proCall || M.proCall.c !== c) { D.exitMatch(); continue; }
      K.doPass(c, me);
      if (!catchBy(me)) { D.exitMatch(); continue; }
      const gone = M.proCall == null;
      steps(30);                                               // he runs with it half a second
      if (M.ball.state !== 'held' || M.ball.carrier !== me) { D.exitMatch(); continue; }
      c.x = me.x - 3; c.y = me.y - 5; c.vx = c.vy = 0;
      const a0 = M.stats.proAnswer || 0;
      K.doPass(me, c);
      if (!catchBy(c)) { D.exitMatch(); continue; }
      let toMe = false; for (let i = 0; i < 30; i++) { T.update(T.STEP); const b = M.ball; if (b.state === 'air' && b.f.kind === 'pass' && b.f.target === me) toMe = true; }
      cycle = { gone, answered:(M.stats.proAnswer || 0) > a0, toMe };
      D.exitMatch();
    }
    ok(cycle && cycle.gone && !cycle.answered && !cycle.toMe, `a call ends with the possession: the ball going to him drops it, and the caller, given it back, does not answer it late (${json(cycle)})`);
  }
  // how often a call is answered: PRO.answer, from Team Spirit 0 to 1
  const rate = sp => {
    let yes = 0; const N = 300;
    const s0 = stage({ me:{ x:46, y:43 }, spirit:sp });
    for (let i = 0; i < N; i++) { T.M.proCall = null; T.M.proLast = null; P.call(); if (T.M.proCall) yes++; }
    D.exitMatch(); return yes/N;
  };
  const r0 = rate(0), r5 = rate(0.5), r1 = rate(1);
  ok(Math.abs(r0 - P.PRO.answer[0]) < 0.08 && Math.abs(r1 - P.PRO.answer[1]) < 0.05 && r0 < r5 && r5 < r1, `a call is answered more as Team Spirit rises (${r0.toFixed(2)} at 0, ${r5.toFixed(2)} at 0.5, ${r1.toFixed(2)} at 1)`);
  C.set(null);
}

// 7. Team Spirit: a pass the carrier was making anyway goes to him instead
{
  const share = (sp, setup) => {
    const s = stage({ me:{ x:46, y:43 }, spirit:sp }); if (setup) setup(s);
    let his = 0; const N = 400;
    for (let i = 0; i < N; i++) { const [to] = P.pass(s.c, s.mates[0], {}); if (to === s.me) his++; }
    const out = { share:his/N, s }; return out;
  };
  const a = share(0), b = share(1);
  ok(Math.abs(a.share - P.PRO.look[0]) < 0.05 && Math.abs(b.share - P.PRO.look[1]) < 0.06, `at a pass, the carrier gives it to him ${Math.round(a.share*100)}% of the time at Team Spirit 0, ${Math.round(b.share*100)}% at 1`);
  D.exitMatch();
  const m = share(1, s => { s.foes[2].x = 46.8; s.foes[2].y = 44; });
  ok(m.share === 0, 'never when he is marked');
  const [t1] = P.pass(m.s.me, m.s.c, {}), [t2] = P.pass(m.s.mates[0], m.s.c, { sure:true });
  ok(t1 === m.s.c && t2 === m.s.c, 'never his own pass, and never a won Key Pass');
  D.exitMatch();
  const keep = P.PRO.look[1]; P.PRO.look[1] = 1; const c = share(1); const [to, oo] = P.pass(c.s.c, c.s.mates[0], { long:true, skip:[1] }); P.PRO.look[1] = keep;
  ok(to === c.s.me && oo.long === false && json(oo.skip) === '[1]', 'a floater meant for the man further out becomes a flat pass to him');
  D.exitMatch();
  // an offload out of a tackle (the one pass of a teammate's that names men to skip) goes to him only inside the engine's offload
  // range, as every offload does; a pass in open play still reaches him from PRO.far
  {
    const keep = P.PRO.look[1]; P.PRO.look[1] = 1;
    const s = stage({ me:{ x:44, y:46 }, spirit:1 }), far = Math.hypot(s.me.x - s.c.x, s.me.y - s.c.y);
    const [o1] = P.pass(s.c, s.mates[0], { skip:[s.foes[0]] }), [p1] = P.pass(s.c, s.mates[0], {});
    s.me.x = 47; s.me.y = 41; const near = Math.hypot(s.me.x - s.c.x, s.me.y - s.c.y);
    const [o2] = P.pass(s.c, s.mates[0], { skip:[s.foes[0]] });
    P.PRO.look[1] = keep;
    ok(far > K.CONTACT.off.range && near < K.CONTACT.off.range && o1 === s.mates[0] && p1 === s.me && o2 === s.me, `an offload goes to him only within ${K.CONTACT.off.range}m (not from ${far.toFixed(1)}m, yes from ${near.toFixed(1)}m); an open-play pass still reaches him from ${far.toFixed(1)}m`);
    D.exitMatch();
  }
  // Team Spirit is career-life.js's reader where it is merged, the match's snapshot of it otherwise
  stage({ spirit:0.2 });
  ok(Math.abs(P.spirit() - 0.2) < 1e-9, 'Team Spirit 20 reads 0.2');
  D.exitMatch();
  C.set(null);
}

// 8. set pieces, goal kicks and close-ups
{
  const setPiece = (o, kind) => {
    const s = stage(o); const M = T.M;
    M.ball.carrier = null; M.ball.state = 'dead';
    (kind === 'scrum' ? T.scrum : T.lineout)(0, 60, 30, 'Test');
    let cut = false; for (let i = 0; i < 60*3 && !cut && M.phase !== 'play'; i++) { T.update(T.STEP); if (M.cut && M.cut.kind === kind) cut = true; }
    const out = { cut, play:M.phase === 'play' && M.ball.state === 'held' };
    D.exitMatch(); return out;
  };
  for (const kind of ['scrum', 'lineout']) {
    const back = setPiece({ pos:'B', num:5 }, kind), fwd = setPiece({ pos:'F', num:2 }, kind), team = setPiece({ pro:false, pos:'B', num:5 }, kind);
    ok(!back.cut && back.play, `Pro Mode, a back: the ${kind} is played for the team, with no close-up`);
    ok(fwd.cut, `Pro Mode, a forward: he plays the ${kind} close-up`);
    ok(team.cut, `Whole Team: the ${kind} close-up, as before`);
  }
  const s = stage({ me:{ x:46, y:43 } });
  D.goalKick(0, 96, 35, 'conversion');
  ok(T.M.goal.kicker === s.me && T.M.cut && T.M.cut.kind === 'goal' && !T.M.goal.watch && T.M.goal.inp, 'he takes the goal kicks, and plays them');
  D.exitMatch();
  C.set(null);
}

// 9. whole matches to full time, and Team Spirit's pull measured
{
  for (const pos of ['B', 'F']) {
    const r = proMatch(pos === 'B' ? 601 : 602, 0.5, { pos, call:0.6 });
    const cr = r.cr, rd = cr.season.results[0];
    ok(r.M.over && cr.season.round === 1 && rd && rd.length === 3, `a Pro Mode match (${pos === 'B' ? 'a back' : 'a forward'}) reaches full time with a scripted player, and goes in the career's table (${r.M.score.join('-')}, ${r.n} steps)`);
    ok(r.ring, 'the ring was on him from the first whistle to the last');
    ok(r.thrown > 0 && r.stats.proCalls > 0, `the ball came to him (${r.thrown} passes, ${r.stats.proCalls} calls)`);
    const kinds = ['scrum', 'lineout'].filter(k => r.sets.has(k));
    if (pos === 'F') ok(kinds.every(k => r.cuts.has(k)), `a forward played his set pieces (${kinds.join(', ') || 'none came up'})`);
    else ok(!r.cuts.has('scrum') && !r.cuts.has('lineout'), `a back's set pieces were played for the team, with no close-up (${kinds.join(', ') || 'none came up'})`);
    D.exitMatch(); C.set(null);
  }
  // the README's numbers are 40 matches a value (the scratch tool behind them is this proBot and proMatch); ten a value here, at the ends
  const per = sp => { let n = 0; for (let i = 0; i < 10; i++) { const r = proMatch(700 + i, sp, { call:0.6 }); n += r.thrown; D.exitMatch(); C.set(null); } return n/10; };
  const lo = per(0.2), hi = per(0.9);
  ok(hi > lo*1.4 && hi - lo > 3, `passes to him a match rise with Team Spirit (${lo.toFixed(1)} at 0.2, ${hi.toFixed(1)} at 0.9)`);
}

// Kids: a My Player career match never moves the hidden Kids rating (his teammates won or lost it, so it says nothing of the
// child's level, and Quick Match and Championship read the same rating); a Whole Team career match still does
{
  const r0 = settings.kidsR;
  const kidsMatch = pro => {
    reseed(640); ready(); settings.diff = 0; settings.kids = true; settings.kidsR = 0.3;
    C.set(C.create({ pos:'B', num:5, club:X.CLUBS[0], proMode:pro })); C.play();
    const M = T.M, kids = !!M.kids;
    const kidsBot = () => { const c = M.cut; if (M.phase === 'cut' && c && !c.duel && c.kind === 'goal') { T.input.jx = T.input.jy = 0; (c.g.type === 'drop' ? dropBot : kickBot)(c, { aim:c.g.aim }); } else bot(0); };   // the harness's bot, with Kids' set aim at a goal kick
    playOut(pro ? () => proBot({ call:0.6 }) : kidsBot);
    const out = { kids, over:M.over, r:settings.kidsR, score:M.score.join('-') };
    D.exitMatch(); C.set(null); ready(); return out;
  };
  const a = kidsMatch(true), b = kidsMatch(false);
  settings.kidsR = r0;
  ok(!a.kids && a.over && a.r === 0.3, `Kids, My Player: the match plays at Easy, not Kids (${a.score}), and leaves the Kids rating at 0.3 (${a.r})`);
  ok(b.kids && b.over && b.r !== 0.3, `Kids, Whole Team: the match (${b.score}) moves it, as before (0.3 to ${b.r})`);
}

// 10. the new player screen
{
  const src = readGameSource(), html = src.slice(src.indexOf('id="s-career-new"'), src.indexOf('id="s-career"'));
  ok(/<span class="lbl">Play as<\/span><div class="seg" id="cn-mode"><button>Whole Team<\/button><button>My Player<\/button><\/div>/.test(html), 'New Player: Play as, Whole Team first, My Player second, one balanced row of two');
  ok(html.indexOf('id="cn-mine"') < html.indexOf('id="cn-mode"') && html.indexOf('id="cn-mode"') < html.indexOf('class="cr-form"') && html.indexOf('class="cr-form"') < html.indexOf('id="cn-go"'), 'under Your Player and Team on the left, so Start Career stays in view on the right');
  C.set(null); C.newOpen();
  ok(P.draft().proMode === false, 'Whole Team is picked to start');
  $('cn-go').click();
  ok(C.get() && C.get().proMode === false, 'Start Career as it comes: Whole Team');
  C.set(null); C.newOpen(); P.modePick(1);
  ok(P.draft().proMode === true, 'My Player picks Pro Mode');
  $('cn-go').click();
  ok(C.get() && C.get().proMode === true && JSON.parse(memory['tryline.v1']).career.proMode === true, 'and Start Career makes a Pro Mode career, saved');
  P.modePick(0); ok(P.draft().proMode === false, 'Whole Team picks it back');
  C.set(null);
}

// 11. and still, with Pro Mode played, nothing else moved
{ const a = nonCareer(), b = team(), m = team(true);
  ok(a === NON_CAREER && b === TEAM && m === TEAM_MINIS, `after Pro Mode matches, other matches and Whole Team careers still play exactly as before (${a} / ${b} / ${m})`); }

console.log(`Career Pro: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
