// Training Ground games: the right habit is how you win. Scripted bots prove that following the technique earns more stars than
// mashing in every reworked game, a child's reaction still earns stars, Egg's throws and hops do what they say, Kids level and the
// Minis cannot reach a contact game by any route, the coach line and the grown-ups' panel say what was agreed, and no progress is kept.
process.env.SEED ??= '41';
import fs from 'node:fs';
const H = await import('./harness.mjs');
const { T } = H;
const P = T.practice, X = T.drills, C = T.career, D = T.debug, K = T.kids, $ = id => document.getElementById(id), inp = T.input, STEP = T.STEP;
let passed = 0, failed = 0;
function ok(test, message) { if (test) passed++; else { failed++; console.log('FAIL ' + message); } }
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const training = fs.readFileSync(new URL('../src/training.js', import.meta.url), 'utf8');
const practiceSrc = fs.readFileSync(new URL('../src/practice.js', import.meta.url), 'utf8');
const demoSrc = fs.readFileSync(new URL('../src/drill-demo.js', import.meta.url), 'utf8');
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
const stick = (x, y) => { const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } const t = T.behind.stickTurn(0); if (t) { const sx = y*t, sy = -x*t; x = sx; y = sy; } inp.jx = x; inp.jy = y; };   // x, y on the field: where a game's own view turns the stick, the thumb that means that
const hold = on => { if (on && !inp.aDown) inp.aPressed = true; inp.aDown = on; inp.src.a = on ? 1 : 0; };
const sprint = on => { if (on && !inp.cDown) inp.cPressed = true; inp.cDown = on; inp.src.c = on ? 1 : 0; };
const letGo = () => { stick(0, 0); hold(false); sprint(false); inp.keys.clear(); };
const toward = (me, x, y, near = 0.15) => { const dx = x - me.x, dy = y - me.y, m = Math.hypot(dx, dy); if (m > near) stick(dx/m, dy/m); else stick(0, 0); };
const lagged = sec => Math.round(sec/STEP);
const seeAll = () => { D.settings().drillSeen = X.DRILLS.map(d => d.id); };
const memory = {}; let writes = 0;
localStorage.getItem = k => memory[k] ?? null; localStorage.setItem = (k, v) => { memory[k] = String(v); writes++; };
seeAll();

/* ---------- the players ---------- */
const eggChase = lag => { const seen = [], n = lagged(lag); return st => { const E = st.egg, b = T.M.ball; if (E.stage !== 'fly') { seen.length = 0; stick(0, 0); return; } seen.push({ x:b.x, y:b.y, vx:b.vx, vy:b.vy, z:b.z, vz:b.vz }); const o = seen[Math.max(0, seen.length - 1 - n)], air = Math.max(0, (o.vz + Math.sqrt(Math.max(0, o.vz*o.vz + 19.6*Math.max(0, o.z))))/9.8), lead = Math.min(air, E.kind === 'flat' ? 0.25 : air); toward(E.me, o.x + o.vx*lead, o.y + o.vy*lead, 0.02); }; };
const eggWaits = () => st => { const E = st.egg, b = T.M.ball; if (E.stage !== 'fly') { stick(0, 0); return; } const air = Math.max(0, (b.vz + Math.sqrt(Math.max(0, b.vz*b.vz + 19.6*Math.max(0, b.z))))/9.8), tx = b.x + b.vx*air, ty = b.y + b.vy*air, dx = tx - E.me.x, dy = ty - E.me.y, m = Math.hypot(dx, dy); if (m > 0.5) stick(dx/m*Math.min(1, m/1.5), dy/m*Math.min(1, m/1.5)); else stick(0, 0); };
const mash = () => { let t = 0; return () => { if (t-- <= 0) { t = 12; stick(Math.random()*2 - 1, Math.random()*2 - 1); } inp.aPressed = Math.random() < 0.2; inp.bPressed = Math.random() < 0.05; sprint(Math.random() < 0.5); }; };   // every button, and the stick anywhere
const lapWay = Cc => { const a = X.circleRunAt(Cc.R, Cc.s), b = X.circleRunAt(Cc.R, Cc.s + 0.25), m = Math.hypot(b.x - a.x, b.y - a.y) || 1; return [(b.x - a.x)/m, (b.y - a.y)/m]; };   // the Runner's thumb goes round with the run
const circleBot = (role, sig, chest, lead = 0) => { let plan = null; return st => { const Cc = st.circle; if (Cc.stage === 'start') { stick(0, 0); sprint(false); if (chest ? Math.abs(X.circleStartE(Cc) + lead) < 0.05 : Cc.t > 0.2) inp.aPressed = true; return; } if (role === 'runner') { stick(...lapWay(Cc)); sprint(Cc.s > Cc.L*0.45); return; } if (Cc.hold) { if (!plan || plan.h !== Cc.hold) plan = { h:Cc.hold, at:Cc.hold.tc + sig*gauss() }; if (Cc.hold.t >= plan.at) inp.aPressed = true; } }; };
const conesRoute = () => { const Q = X.CONES; return [...Q.gates.slice(0, Q.out).map(([x, y]) => [x + 0.5, y]), [Q.turn[0] + 2, Q.turn[1] - 3], [Q.turn[0] + 2, Q.turn[1] + 2], ...Q.gates.slice(Q.out).map(([x, y]) => [x - 0.5, y]), [Q.line - 3, 46]]; };
const conesWide = () => { const Q = X.CONES, out = []; Q.gates.slice(0, Q.out).forEach(([x, y], i) => { const s = i % 2 ? 1 : -1; out.push([x - 2.5, y - s*4], [x, y - s*1.3], [x + 2.5, y - s*4]); }); return [...out, [Q.turn[0] + 5, Q.turn[1] - 9], [Q.turn[0] + 5, Q.turn[1] + 6], ...Q.gates.slice(Q.out).map(([x, y]) => [x - 0.5, y + 1]), [Q.line - 3, 46]]; };
const conesBot = (route, sp, mag = 1) => { const R = route(); let i = 0; return st => { const me = st.cones.me; const [tx, ty] = R[Math.min(i, R.length - 1)], dx = tx - me.x, dy = ty - me.y, d = Math.hypot(dx, dy); if (d < 1.2 && i < R.length - 1) i++; stick(dx/d*mag, dy/d*mag); sprint(sp(i, R)); }; };
// Create a Gap: every carrier runs at his own man (the ringed defender, X.gapMark) and passes once he is this near; the free man runs home round anyone still in it
const passBot = at => { let who = null, round = 0; return st => { const G = st.gap, me = T.sides.ctrlOf(0), b = T.M.ball; if (G.R.round !== round) { round = G.R.round; who = null; } if (G.R.stage !== 'play' || !me) { stick(0, 0); sprint(false); return; } const def = X.gapMark(me); if (!def) { const q = T.M.players.find(p => p.team === 1 && !G.drawn.has(p) && p.down <= 0 && Math.hypot(me.x - p.x, me.y - p.y) < 6 && p.x >= me.x - 1); stick(1, q ? (me.y >= q.y ? 0.7 : -0.7) : 0); sprint(true); return; } stick(1, 0); sprint(false); if (b.state === 'held' && b.carrier === me && who !== me && Math.hypot(me.x - def.x, me.y - def.y) <= at) { inp.aPressed = true; who = me; } }; };
const kickBot = (o = {}) => () => { const c = T.M.cut; if (c && c.kind === 'goal') H.kickBot(c, o); };
// Defend a Breakaway, round by round: Switch this long into each round, then chase whoever carries; when the ball changes hands, Switch again if the other cover man is the nearer (the man a Switch would go to)
const coverFor = (st, me, c) => T.M.players.find(p => p.team === 0 && p !== me && p !== st.initialCtrl && p.x < c.x && Math.hypot(p.x - c.x, p.y - c.y) < Math.hypot(me.x - c.x, me.y - c.y) - 2);
const roundsOf = (make, sw = true) => { let round = 0, done = false, last = null; return st => { const R = st.defend.R; if (R.round !== round) { round = R.round; done = false; last = null; } if (R.stage !== 'play') { stick(0, 0); sprint(false); return null; } const me = T.sides.ctrlOf(0), b = T.M.ball, c = b.state === 'held' ? b.carrier : null; if (sw && st.switched && me && c && c.team === 1 && c !== last) { last = c; const q = coverFor(st, me, c); if (q && T.contact.switchTarget(0) === q) inp.bPressed = true; } return make(st, R, me, c, () => { if (done) return false; done = true; return true; }); }; };
const defendBot = (at, lead = 0.25) => roundsOf((st, R, me, c, first) => { if (!st.switched) { if (st.elapsed >= at && first()) inp.bPressed = true; return; } if (!me || !c || c.team !== 1) return; toward(me, c.x + c.vx*lead, c.y + c.vy*lead, 0.05); sprint(true); if (Math.hypot(me.x - c.x, me.y - c.y) < 1.5) inp.aPressed = true; });
const defendSpam = hz => () => { const tap = every(hz, () => { inp.aPressed = true; }); return roundsOf((st, R, me, c, first) => { tap(st); if (!st.switched) { if (first()) inp.bPressed = true; return; } if (me && c && c.team === 1) { toward(me, c.x + c.vx*0.25, c.y + c.vy*0.25, 0.05); sprint(true); } }, false); };   // Tackle on a timer, never once close: Switch at the start of each round and run at the carrier
const tackleBot = (lag, sq, head = true, edge = false, soft = false, aimLag = 0) => { const n = lagged(lag), Q = X.TACKLE; let seen = []; return st => { const Tk = st.tackle, me = Tk.me; if (Tk.stage === 'approach') { seen = []; const dy = Tk.lane - me.y; stick(0, Math.abs(dy) > (soft ? 0.5 : 0.15) ? Math.max(-1, Math.min(1, dy*(soft ? 0.2 : 0.7))) : 0); hold(false); return; } if (Tk.stage === 'head') { seen.push(1); stick(seen.length > n && head ? Tk.safe : 0, 0); hold(false); if (seen.length > n && !head) stick(Tk.drift, 0); return; } if (Tk.stage === 'side') { seen.push(Tk.h); const h = seen[Math.max(0, seen.length - 1 - n)]; stick(0, h > (aimLag ? (Q.height[0] + Q.height[1])/2 + aimLag*0.3 : Q.height[1]) ? 1 : h < Q.height[0] ? -1 : 0); hold(Tk.d > (edge ? Q.zone[1] - 0.1 : (Q.zone[0] + Q.zone[1])/2)); return; } stick(0, 0); if (Tk.stage === 'squeeze') { if (Math.round(Tk.t*60) % sq === 0) { hold(false); inp.aPressed = true; } } else hold(false); }; };
const driveBot = (rate, hit, shape = true) => () => { const c = T.M.cut; H.scrumBot(0, rate, hit); stick(0, 0); if (shape && c && c.kind === 'scrum' && c.shape != null) { const B = X.DRIVE.shape.band; stick(0, c.shape > B[1] - 0.06 ? 1 : c.shape < B[0] + 0.06 ? -1 : 0); } };
const tagBot = (lag, ahead = 0) => { const n = lagged(lag), seen = []; let side = 0, rep = 0; return st => { const G = st.tag, me = G.me, th = G.them; if (G.rep !== rep) { rep = G.rep; side = 0; seen.length = 0; } seen.push({ l:!!G.lunge, x:th.x, y:th.y, vx:th.vx, vy:th.vy, can:X.tagCanPull(G) }); const o = seen[Math.max(0, seen.length - 1 - n)]; if (G.stage !== 'play') { stick(0, 0); return; } if (G.rep % 2 === 1) { if (o.l && !side) side = me.y >= 35 ? -1 : 1; if (th.x <= me.x || !side) { stick(1, 0); return; } if (G.lunge || G.rest > 0) { stick(0.45, side*0.9); return; } stick(1, 0); return; } const s = me.y >= o.y ? 1 : -1, lead = 0.3 + (lag + ahead)*0.75; toward(me, o.x + o.vx*lead, o.y + o.vy*lead + s*1.2, 0.2); if (o.can) inp.aPressed = true; }; };
const tagStraight = () => st => { const G = st.tag; if (G.stage !== 'play') { stick(0, 0); return; } if (G.rep % 2 === 1) stick(1, 0); else { toward(G.me, G.them.x, G.them.y); } };
const backBot = (lag, sig, edge = false) => { const n = lagged(lag); let c = 0, rep = 0, plan = 0, stage = ''; return st => { const G = st.back, Q = X.BACK; if (G.rep !== rep) { rep = G.rep; plan = (edge ? Q.gold[1] - 0.1 : (Q.gold[0] + Q.gold[1])/2) + sig*gauss(); } if (G.stage !== stage) { stage = G.stage; c = 0; } c++; if (G.stage === 'run') { stick(0, 0); if (!G.tapped && G.d <= plan) inp.aPressed = true; return; } if (G.stage === 'land') { stick(c > n ? G.safe : 0, 0); return; } if (G.stage === 'place') { stick(c > n ? G.team : 0, 0); return; } stick(0, 0); }; };
const stillBot = () => () => stick(0, 0);
function runOnce(id, role, make, seed) { H.reseed(seed); P.start(id); if (role) $('pr-' + role).click(); else $('pr-retry').click(); const bot = make(); let n = 0; while (P.state() && !P.state().done && n < 14000) { bot(P.state()); T.update(STEP); n++; } letGo(); const st = P.state(); return st; }
function stars(id, role, make, seeds = 15, each) { let sum = 0; const list = []; for (let s = 1; s <= seeds; s++) { const st = runOnce(id, role, make, s*7919); sum += st.stars; list.push(st.stars); if (each) each(st); P.leave(); } return { mean:sum/seeds, list }; }
const showMean = r => r.mean.toFixed(2);
// one output lag for every slow player: what the bot decides reaches the controls this many seconds later, stick and buttons alike
const lagOut = (make, sec) => () => { const bot = make(), n = lagged(sec), q = []; let v = { jx:0, jy:0, aDown:false, cDown:false }; return st => {
  Object.assign(inp, v); inp.aPressed = inp.bPressed = inp.cPressed = false; bot(st);
  v = { jx:inp.jx, jy:inp.jy, aDown:inp.aDown, cDown:inp.cDown }; q.push({ ...v, a:inp.aPressed, b:inp.bPressed, c:inp.cPressed });
  const o = q.length > n ? q.shift() : { jx:0, jy:0, aDown:false, cDown:false, a:false, b:false, c:false };
  inp.jx = o.jx; inp.jy = o.jy; inp.aDown = o.aDown; inp.cDown = o.cDown; inp.aPressed = o.a; inp.bPressed = o.b; inp.cPressed = o.c; inp.src.a = o.aDown ? 1 : 0; inp.src.c = o.cDown ? 1 : 0; }; };
const every = (hz, fn) => { let t = 0; return st => { t += STEP; if (t >= 1/hz) { t = 0; fn(st); } }; };

/* ---------- technique beats mashing, in every reworked game, and a child's reaction still earns stars ---------- */
const table = [
  ['tag', null, 'Tag Chase', () => tagBot(0.2), () => tagBot(0.4)],
  ['egg', null, 'Bouncy Egg', () => eggChase(0.2), () => eggChase(0.4)],
  ['circle', 'runner', 'Circle, Runner', () => circleBot('runner', 0, true), () => circleBot('runner', 0.1, true)],
  ['circle', 'passer', 'Circle, Passer', () => circleBot('passer', 0.05, true), () => circleBot('passer', 0.14, true)],
  ['cones', null, 'Cones', () => conesBot(conesRoute, (i, R) => i > X.CONES.out + 1), () => conesBot(conesRoute, () => false, 0.9)],
  ['pass', null, 'Create a Gap', () => passBot(5), () => passBot(4)],
  ['kick', null, 'Kicking', () => kickBot(), () => kickBot()],
  ['defend', null, 'Breakaway', () => defendBot(0.5), () => defendBot(1.2)],
  ['tackle', null, 'Tackling', () => tackleBot(0.2, 7), () => tackleBot(0.4, 12)],
  ['scrum', null, 'Driving', () => driveBot(6, 1), () => driveBot(4.5, 0.5)],
  ['back', null, 'Ball Back', () => backBot(0.2, 0.2), () => backBot(0.4, 0.35)],
];
const report = [];
for (const [id, role, name, good, child] of table) {
  const g = stars(id, role, good), c = stars(id, role, child), m = stars(id, role, mash), s = stars(id, role, stillBot);
  report.push(`${name}: technique ${showMean(g)}, child ${showMean(c)}, mash ${showMean(m)}, still ${showMean(s)}`);
  ok(g.mean > m.mean, `${name}: following the technique beats mashing (${showMean(g)} to ${showMean(m)})`);
  ok(c.mean > m.mean, `${name}: a child following it beats mashing too (${showMean(c)} to ${showMean(m)})`);
  ok(c.mean >= 1, `${name}: a child's 0.4 s reaction still earns stars (${showMean(c)})`);
  ok(s.mean === 0, `${name}: doing nothing earns no star (${showMean(s)})`);
}
console.log('Stars out of 3, mean of 15 runs. ' + report.join('; '));

/* ---------- a real slow child: the same output lag on every game, and the cheap routes a child finds ----------
   lagged: reacts to what is on screen with this lag. anticipating: the same lag, but plays timed cues early, as a closing ring or a run-in allows. directed: spams the right button and runs the right way, with no timing. */
const eggRunAt = () => st => { const E = st.egg, b = T.M.ball; if (E.stage !== 'fly') { stick(0, 0); return; } toward(E.me, b.x, b.y, 0.02); };
const SLOW = [
  ['tag', null, 'Tag Chase', () => tagBot(0), l => tagBot(0, l), () => { let t = 0, y = 0; return st => { const G = st.tag; if (G.stage !== 'play') { stick(0, 0); return; } if (G.rep % 2 === 1) { if (t-- <= 0) { t = 12; y = Math.random()*2 - 1; } stick(1, y); return; } toward(G.me, G.them.x, G.them.y); inp.aPressed = true; }; }],
  ['egg', null, 'Bouncy Egg', () => eggChase(0), () => eggRunAt(), null],
  ['circle', 'runner', 'Circle, Runner', () => circleBot('runner', 0, true), l => circleBot('runner', 0, true, l*0.75), () => st => { const Cc = st.circle; inp.aPressed = true; stick(1, 0); sprint(true); }],
  ['circle', 'passer', 'Circle, Passer', () => circleBot('passer', 0.06, true), l => circleBot('passer', 0.06, true, l*0.75), () => every(12, () => { inp.aPressed = true; })],
  ['cones', null, 'Cones', () => conesBot(conesRoute, () => false, 0.9), () => conesBot(conesRoute, () => false, 0.9), () => conesBot(conesRoute, () => true)],
  ['pass', null, 'Create a Gap', () => passBot(5), () => passBot(6), () => passBot(99)],
  ['kick', null, 'Kicking', () => kickBot(), l => kickBot({ ahead:l*0.75 }), () => every(10, () => { inp.aPressed = true; inp.aDown = !inp.aDown; })],
  ['defend', null, 'Breakaway', () => defendBot(0.3), l => defendBot(0.3, 0.25 + l*0.75), defendSpam(10)],
  ['tackle', null, 'Tackling', () => tackleBot(0, 12, true, false, true), l => tackleBot(0, 12, true, true, true, l), () => { const tap = every(10, () => { inp.aPressed = true; }); return st => { tap(st); stick(0, 1); hold(Math.random() < 0.5); }; }],
  ['scrum', null, 'Driving', () => driveBot(4.5, 0.5), () => driveBot(4.5, 1), () => driveBot(20, 1, false)],
  ['back', null, 'Ball Back', () => backBot(0.15, 0.2), () => backBot(0.15, 0.2, true), () => { const tap = every(10, () => { inp.aPressed = true; }); return st => { tap(st); stick(Math.random() < 0.5 ? 1 : -1, 0); }; }],
];
const slowRows = [], slowAt = {};
for (const [id, role, name, react, plan, spam] of SLOW) {
  const row = { name };
  for (const l of [0.4, 0.6, 0.8]) { row['r' + l] = stars(id, role, lagOut(() => react(l), l), 20); row['a' + l] = stars(id, role, lagOut(() => plan(l), l), 20); }
  row.spam = spam ? stars(id, role, spam, 20) : null;
  row.best = stars(id, role, () => react(0), 20);
  slowAt[name] = row;
  slowRows.push(name + ': reacting ' + [0.4, 0.6, 0.8].map(l => showMean(row['r' + l])).join('/') + ', anticipating ' + [0.4, 0.6, 0.8].map(l => showMean(row['a' + l])).join('/') + ', directed spam ' + (row.spam ? showMean(row.spam) : 'none'));
  const planned = Math.max(row['r0.4'].mean, row['a0.4'].mean);
  ok(planned >= 1, name + ': a child with a 0.4 s lag still earns a star (' + planned.toFixed(2) + ')');
  if (row.spam) { ok(row.best.mean > row.spam.mean, name + ': the habit beats spamming the right button (' + showMean(row.best) + ' to ' + showMean(row.spam) + ')'); ok(planned >= row.spam.mean, name + ': and so does a slow child playing it (' + planned.toFixed(2) + ' to ' + showMean(row.spam) + ')'); }
}
console.log('Slow child, stars at 0.4/0.6/0.8 s lag, 20 runs. ' + slowRows.join('; '));
ok(slowAt['Tag Chase']['r0.8'].mean > slowAt['Tag Chase'].spam.mean, 'Tag Chase: following the cue at 0.8 s beats a blind wiggle (' + showMean(slowAt['Tag Chase']['r0.8']) + ' to ' + showMean(slowAt['Tag Chase'].spam) + ')');

/* ---------- each cheap route the review found, and the slow play it beat ---------- */
{ // Circle, Passer: a tap 0.4 s late clears the first round, and spam does not
  const late = sec => () => { let plan = null; return st => { const Cc = st.circle; if (Cc.stage === 'start') { if (Math.abs(X.circleStartE(Cc)) < 0.05) inp.aPressed = true; return; } if (Cc.hold) { if (!plan || plan.h !== Cc.hold) plan = { h:Cc.hold, at:Cc.hold.tc + (sec + 0.08*gauss())*X.PACE.live }; if (Cc.hold.t >= plan.at) inp.aPressed = true; } }; };
  for (const sec of [0.2, 0.3, 0.4]) { const r = stars('circle', 'passer', late(sec), 20); ok(r.mean >= 1, 'Circle, Passer: a tap ' + sec + ' s late earns a star (' + showMean(r) + ')'); }
  for (const hz of [6, 12, 20]) { const r = stars('circle', 'passer', () => every(hz, () => { inp.aPressed = true; }), 20); ok(r.mean === 0, 'Circle, Passer: spam at ' + hz + ' a second earns nothing (' + showMean(r) + ')'); }
  const once = stars('circle', 'passer', () => st => { if (st.circle.stage === 'start' && st.circle.t > 0.2) inp.aPressed = true; }, 10); ok(once.mean === 0, 'Circle, Passer: one tap and then nothing earns nothing'); }
{ // Circle, Runner: the timed first pass and the stick's direction both count now
  const go = (chest, sp, way) => () => st => { const Cc = st.circle; if (Cc.stage === 'start') { stick(0, 0); sprint(false); if (chest ? Math.abs(X.circleStartE(Cc)) < 0.05 : Cc.t > 0.2) inp.aPressed = true; return; } if (Cc.stage !== 'race') { stick(0, 0); sprint(false); return; } stick(...(way || lapWay(Cc))); sprint(!!sp && Cc.s > Cc.L*0.45); };
  const chest = stars('circle', 'runner', go(true, true), 20), plain = stars('circle', 'runner', go(false, true), 20), noSprint = stars('circle', 'runner', go(true, false), 20), fixed = stars('circle', 'runner', go(false, true, [-1, 0]), 20), fixedR = stars('circle', 'runner', go(true, true, [1, 0]), 20);
  ok(chest.mean === 3, 'Circle, Runner: a chest pass, the thumb round the lap and Sprint take all five rounds (' + showMean(chest) + ')');
  ok(plain.mean < chest.mean && plain.mean >= 1, 'Circle, Runner: a start not timed to the chest cannot (' + showMean(plain) + ')');
  ok(noSprint.mean <= 1, 'Circle, Runner: no Sprint is worth a star at most (' + showMean(noSprint) + ')');
  ok(fixed.mean === 0 && fixedR.mean === 0, 'Circle, Runner: a stick held one way does not run the lap (' + showMean(fixed) + ', ' + showMean(fixedR) + ')'); }
{ // Breakaway: a press with nothing in reach costs a moment
  const tap = defendSpam;
  const good = stars('defend', null, () => defendBot(0.5), 60);
  for (const hz of [5, 10, 15]) { const r = stars('defend', null, tap(hz), 60); ok(r.mean <= good.mean - 0.5, 'Breakaway: Tackle spammed at ' + hz + ' a second is well behind tackling once close (' + showMean(r) + ' to ' + showMean(good) + ')'); }
  P.start('defend'); $('pr-retry').click(); inp.bPressed = true; T.update(STEP); const me = T.sides.ctrlOf(0); inp.aPressed = true; T.update(STEP); ok(me.stumble > 0 && T.M.stats.drillWhiff === 1 && T.M.tags.some(t => t.text === 'Too Far'), 'Breakaway: a press out of reach stumbles, and says Too Far'); P.leave(); }
{ // Driving: slow taps in the green earn a star most runs, and spam out of it doesn't catch them
  for (const hz of [3, 3.5]) { let zero = 0; const r = stars('scrum', null, () => driveBot(hz, 1), 20); ok(r.mean >= 1, 'Driving: ' + hz + ' taps a second in the green earns a star (' + showMean(r) + ')'); }
  const slow = stars('scrum', null, () => driveBot(3, 1), 20);
  for (const hz of [12, 20, 30]) { const r = stars('scrum', null, () => driveBot(hz, 1, false), 20); ok(r.mean < slow.mean, 'Driving: 3 taps a second in the green beats ' + hz + ' a second out of it (' + showMean(slow) + ' to ' + showMean(r) + ')'); } }
{ // Kicking: an unaimed run loses about a star
  const aim = stars('kick', null, () => kickBot(), 40), off = stars('kick', null, () => kickBot({ aim:0 }), 40);
  ok(off.mean <= aim.mean - 0.9, 'Kicking: never steering the arrow costs about a star (' + showMean(off) + ' to ' + showMean(aim) + ')'); 
  P.start('kick'); $('pr-retry').click(); ok(X.KICKS.spots.slice(1).every(s => s[2] >= 16), 'Kicking: the wind is strong from the second kick on'); for (let i = 0; i < 3; i++) T.update(STEP); ok(Math.abs(Math.cos(T.M.wind.a)) < 1e-6, 'Kicking: and it blows across the kick'); P.leave(); }
{ // Tag Chase: a blind wiggle doesn't keep tags, a late dodge does
  const kept = make => { let k = 0, n = 0; stars('tag', null, make, 20, st => { k += st.tag.kept; n += 3; }); return k/n; };
  const wiggle = kept(() => { let t = 0, y = 0; return st => { const G = st.tag; if (G.stage !== 'play') { stick(0, 0); return; } if (G.rep % 2 === 1) { if (t-- <= 0) { t = 12; y = Math.random()*2 - 1; } stick(1, y); } else stick(0, 0); }; });
  ok(wiggle <= 0.3, 'Tag Chase: running forward with a random stick keeps few tags (' + Math.round(wiggle*100) + '%)');
  for (const l of [0.5, 0.6, 0.8]) { const r = kept(() => tagBot(l)); ok(r >= 0.9, 'Tag Chase: a dodge ' + l + ' s after they go still keeps the tags (' + Math.round(r*100) + '%)'); } }

/* ---------- the single habit each game names beats the same player without it ---------- */
{ const moved = stars('egg', null, () => eggChase(0.2)), waited = stars('egg', null, eggWaits);
  ok(moved.mean > waited.mean, `Egg: running on to the ball earns more than getting there and waiting (${showMean(moved)} to ${showMean(waited)})`); }
{ const clean = stars('cones', null, () => conesBot(conesRoute, () => false), 1), wide = stars('cones', null, () => conesBot(conesWide, () => false), 1);
  const a = runOnce('cones', null, () => conesBot(conesRoute, () => false), 1), ta = a.elapsed + a.cones.pen; P.leave();
  const b = runOnce('cones', null, () => conesBot(conesWide, () => false), 1), tb = b.elapsed + b.cones.pen, gatesB = b.cones.pass.filter(v => v > 0).length; P.leave();
  ok(clean.mean > wide.mean && ta + 2 < tb && gatesB >= 6, `Cones: a clean line beats rounding wide through the same gates (${ta.toFixed(1)} s, ${clean.mean} stars, to ${tb.toFixed(1)} s, ${wide.mean} stars)`);
  const home = runOnce('cones', null, () => conesBot(conesRoute, (i, R) => i > X.CONES.out + 1), 1), homeT = home.elapsed + home.cones.pen, homeS = home.stars; P.leave();
  const all = runOnce('cones', null, () => conesBot(conesRoute, () => true), 1), allT = all.elapsed + all.cones.pen, allS = all.stars; P.leave();
  ok(homeT < allT && homeS > allS, `Cones: Sprint saved for the straight beats Sprint through the turns (${homeT.toFixed(1)} s, ${homeS} stars, to ${allT.toFixed(1)} s, ${allS} stars)`); }
{ const drawn = stars('pass', null, () => passBot(5)), early = stars('pass', null, () => passBot(11));
  ok(drawn.mean > early.mean && Math.max(...early.list) <= 1, `Create a Gap: passing once the defender is drawn scores more than passing early (${showMean(drawn)} to ${showMean(early)})`); }
{ const chestP = stars('circle', 'passer', () => circleBot('passer', 0.05, true)), lateP = stars('circle', 'passer', () => st => { const Cc = st.circle; if (Cc.stage === 'start') { if (Cc.t > 0.2) inp.aPressed = true; return; } if (Cc.hold && Cc.hold.t >= Cc.hold.tc + X.CIRCLE.ok + 0.05) inp.aPressed = true; });
  ok(chestP.mean > lateP.mean, `Circle: passes to the chest beat passes that drop low (${showMean(chestP)} to ${showMean(lateP)})`);
  const start = runOnce('circle', 'runner', () => circleBot('runner', 0, true), 3); const chestStart = T.M.stats.circleChest; P.leave();
  ok(chestStart >= 5 && start, 'Circle: the Runner\'s first pass is timed on the same ring, and a chest pass counts');
  H.reseed(5); P.start('circle'); $('pr-runner').click(); { const Cc = P.state().circle, first = st => {}; for (let i = 0; i < 400 && Math.abs(X.circleStartE(Cc)) > 0.05; i++) T.update(STEP); inp.aPressed = true; T.update(STEP); ok(Cc.stage === 'race' && Cc.v > 3, `Circle: a Runner off a chest pass gets away already moving (${Cc.v.toFixed(1)} m/s)`); } P.leave();
  H.reseed(5); P.start('circle'); $('pr-runner').click(); { const Cc = P.state().circle; for (let i = 0; i < 400 && Math.abs(X.circleStartE(Cc)) < 0.4; i++) T.update(STEP); inp.aPressed = true; T.update(STEP); ok(Cc.stage === 'race' && Cc.v < 3, 'Circle: off a mistimed pass the Runner starts from standing'); } P.leave(); }
{ const shape = stars('scrum', null, () => driveBot(6, 1)), tapOnly = stars('scrum', null, () => driveBot(7, 1, false)), slowShape = stars('scrum', null, () => driveBot(4, 1));
  ok(shape.mean > tapOnly.mean && tapOnly.mean <= 1, `Driving: body shape and timing beat tapping alone (${showMean(shape)} to ${showMean(tapOnly)})`);
  ok(slowShape.mean > tapOnly.mean, `Driving: slower taps in a good shape beat faster taps in a bad one (${showMean(slowShape)} to ${showMean(tapOnly)})`);
  const noHit = stars('scrum', null, () => driveBot(5, 0)), hit = stars('scrum', null, () => driveBot(5, 1));
  ok(hit.mean >= noHit.mean, `Driving: pushing on Set still helps (${showMean(hit)} to ${showMean(noHit)})`); }
{ const headRight = stars('tackle', null, () => tackleBot(0.2, 7)), headWrong = stars('tackle', null, () => tackleBot(0.2, 7, false));
  ok(headRight.mean === 3 && headWrong.mean === 0, `Tackling: the head on the wrong side fails every rep, whatever the rest did (${showMean(headRight)} to ${showMean(headWrong)})`); }
{ const good = stars('tag', null, () => tagBot(0.2)), straight = stars('tag', null, tagStraight);
  ok(good.mean > straight.mean && straight.mean === 0, `Tag Chase: changing direction and pulling from beside beats running straight into them (${showMean(good)} to ${showMean(straight)})`); }

/* ---------- Bouncy Egg ---------- */
{ // the first three throws are one of each, named as thrown; after that it is random
  const firsts = new Set(), later = new Set();
  for (let seed = 1; seed <= 8; seed++) {
    H.reseed(seed*101); P.start('egg'); $('pr-retry').click();
    const st = P.state(), E = st.egg, seen = [], cues = []; let lastN = 0;
    for (let i = 0; i < 9000 && !st.done && E.n < X.EGG.throws; i++) { eggChase(0)(st); T.update(STEP); if (E.n !== lastN) { lastN = E.n; seen.push(E.kind); if (E.n <= 3) { cues.push(T.M.tags.map(t => t.text).join() + '|' + $('pr-objective').textContent); } } stick(0, 0); E.lives = 3; }
    firsts.add(seen.slice(0, 3).join()); seen.slice(3).forEach(k => later.add(k));
    ok(cues.length === 3 && ['Bounce Pass', 'Flat Pass', 'High Ball'].every((n, i) => cues[i].includes(n)), 'Egg: each of the first three is named on the pitch as thrown (' + cues.join('; ') + ')');
    P.leave();
  }
  ok(firsts.size === 1 && [...firsts][0] === 'bounce,flat,high', 'Egg: the first three throws are Bounce Pass, Flat Pass, High Ball (' + [...firsts].join(' / ') + ')');
  ok(later.size === 3, 'Egg: after that any of the three may come');
}
{ // real hops: several, each smaller than the last, at odd angles, and the ball tumbles
  const hopCounts = [], turnsAll = []; let smaller = true, moved = false, inBox = true, tumbles = true;
  for (let seed = 1; seed <= 40; seed++) {
    H.reseed(seed*211); P.start('egg'); $('pr-retry').click();
    const st = P.state(), E = st.egg, b = T.M.ball;
    while (st.egg.stage !== 'fly') T.update(STEP);
    E.me.x = 72; E.me.y = 45;                              // well out of reach, so it runs its course
    let peak = 0, peaks = [], last = 0, dirs = [], wasZ = b.z, up = false, tum = b.tumble;
    for (let i = 0; i < 2000 && E.stage === 'fly'; i++) {
      E.me.x = b.x < 62 ? 72.9 : 51.1; E.me.y = b.y < 35 ? 45.9 : 24.1;
      T.update(STEP);
      if (E.hops.length > last) { last = E.hops.length; dirs.push(Math.atan2(b.vy, b.vx)); if (peak) peaks.push(peak); peak = 0; }
      if (E.hops.length) peak = Math.max(peak, b.z);
      if (b.tumble !== tum) moved = true; tum = b.tumble;
      if (b.x < 40 || b.x > 76 || b.y < 20 || b.y > 50) inBox = false;
    }
    hopCounts.push(E.hops.length);
    for (let i = 1; i < E.hops.length; i++) if (E.hops[i] >= E.hops[i - 1]) smaller = false;
    for (let i = 1; i < peaks.length; i++) if (peaks[i] >= peaks[i - 1] - 1e-9) smaller = false;
    for (let i = 1; i < dirs.length; i++) { const d = Math.abs(Math.atan2(Math.sin(dirs[i] - dirs[i - 1]), Math.cos(dirs[i] - dirs[i - 1]))); turnsAll.push(d); }
    ok(E.stage === 'missed' && E.lives === 2, 'Egg: a bounce pass that stops untouched costs a heart');
    P.leave();
  }
  const least = Math.min(...hopCounts), mean = hopCounts.reduce((a, c) => a + c, 0)/hopCounts.length, turned = turnsAll.filter(d => d > 0.2).length/turnsAll.length;
  ok(least >= 2 && mean >= 3, `Egg: a bounce pass takes several hops (at least ${least}, mean ${mean.toFixed(1)})`);
  ok(smaller, 'Egg: every hop is smaller than the last, in launch speed and in height');
  ok(turned >= 0.7, `Egg: the hops go off at odd angles (${Math.round(turned*100)}% turn by more than 0.2 radians)`);
  ok(moved, 'Egg: the ball tumbles as it goes');
  ok(inBox, 'Egg: every hop stays on the training field');
}
{ // catching on any hop, low ones included, until it stops
  H.reseed(3); P.start('egg'); $('pr-retry').click();
  const st = P.state(), E = st.egg, b = T.M.ball;
  while (E.stage !== 'fly') { E.me.x = 72; E.me.y = 45; T.update(STEP); }
  for (let i = 0; i < 600 && E.hops.length < 2; i++) { E.me.x = b.x < 62 ? 72.9 : 51.1; E.me.y = b.y < 35 ? 45.9 : 24.1; T.update(STEP); }
  for (let i = 0; i < 400 && b.z > 0.3; i++) { E.me.x = b.x < 62 ? 72.9 : 51.1; E.me.y = b.y < 35 ? 45.9 : 24.1; T.update(STEP); }
  ok(E.hops.length >= 2 && b.z <= 0.3, 'Egg: a low second hop to catch');
  E.me.x = b.x - 0.5; E.me.y = b.y; E.me.vx = 0; E.me.vy = 0; T.update(STEP);
  ok(E.caught === 1 && E.stage === 'caught', `Egg: you may catch a bounce pass on any hop, even a low one (z ${b.z.toFixed(2)})`);
  P.leave();
  H.reseed(3); P.start('egg'); $('pr-retry').click();
  { const st2 = P.state(), E2 = st2.egg, b2 = T.M.ball; while (E2.stage !== 'fly') T.update(STEP); E2.me.x = 72; E2.me.y = 45; for (let i = 0; i < 2000 && !E2.rolling && E2.stage === 'fly'; i++) { E2.me.x = b2.x < 62 ? 72.9 : 51.1; E2.me.y = b2.y < 35 ? 45.9 : 24.1; T.update(STEP); } ok(E2.rolling, 'Egg: once its hops are done it rolls'); E2.me.x = b2.x - 0.6; E2.me.y = b2.y; E2.me.vx = E2.me.vy = 0; T.update(STEP); ok(E2.caught === 1, 'Egg: and it can still be picked up, until it stops'); }
  P.leave();
}
{ // flat and high: a heart if they land untouched, and they hop away rather than slide
  for (const n of [1, 2]) {
    H.reseed(9); P.start('egg'); $('pr-retry').click();
    const st = P.state(), E = st.egg, b = T.M.ball;
    E.n = n; E.hist = []; E.stage = 'wind'; E.t = 9;        // the second or third throw is next
    T.update(STEP);
    const kind = E.kind, lives = E.lives;
    ok(kind === (n === 1 ? 'flat' : 'high') && E.stage === 'fly', 'Egg: throw ' + (n + 1) + ' is ' + kind);
    for (let i = 0; i < 900 && E.stage === 'fly'; i++) { E.me.x = b.x < 62 ? 72.9 : 51.1; E.me.y = b.y < 35 ? 45.9 : 24.1; T.update(STEP); }
    ok(E.stage === 'missed' && E.lives === lives - 1, 'Egg: a ' + kind + ' that lands untouched costs a heart');
    let top = 0; const from = { x:b.x, y:b.y };
    for (let i = 0; i < 900 && E.stage === 'missed'; i++) { top = Math.max(top, b.z); T.update(STEP); }
    ok(top > 0.4 && Math.hypot(b.x - from.x, b.y - from.y) > 1, `Egg: then it hops away, up ${top.toFixed(1)} m, instead of sliding`);
    P.leave();
  }
}
{ // the gold ring: where each throw comes down, from release, and again after every hop
  let worstHop = 0, hops = 0, worstThrow = 0, thrown = 0, rolled = 0, worstRoll = 0, always = true, none = true;
  for (let seed = 1; seed <= 12; seed++) {
    H.reseed(seed*307); P.start('egg'); $('pr-retry').click();
    const st = P.state(), E = st.egg, b = T.M.ball;
    if (E.aim) none = false;
    for (let throwN = 0; throwN < 6 && !st.done; throwN++) {
      for (let i = 0; i < 400 && E.stage !== 'fly' && !st.done; i++) { if (E.stage === 'wind' && E.aim) none = false; E.lives = 3; E.me.x = b.x < 62 ? 72.9 : 51.1; E.me.y = b.y < 35 ? 45.9 : 24.1; T.update(STEP); }
      if (st.done) break;
      if (!E.aim) always = false;
      let aim = E.aim, seen = E.hops.length, near = 9e9, thisThrow = E.n, kind = E.kind;
      for (let i = 0; i < 900 && E.stage === 'fly' && E.n === thisThrow; i++) {
        E.me.x = b.x < 62 ? 72.9 : 51.1; E.me.y = b.y < 35 ? 45.9 : 24.1;
        const wasRolling = E.rolling;
        if (kind !== 'bounce' && b.z >= X.EGG.lo && b.z < X.EGG.hi) near = Math.min(near, Math.hypot(b.x - aim.x, b.y - aim.y));
        T.update(STEP);
        if (E.stage !== 'fly') break;
        if (!E.aim) always = false;
        if (E.hops.length > seen) { if (seen > 0 || kind === 'bounce') { worstHop = Math.max(worstHop, Math.hypot(b.x - aim.x, b.y - aim.y)); hops++; } seen = E.hops.length; aim = E.aim; }
        else if (E.rolling && !wasRolling) { worstHop = Math.max(worstHop, Math.hypot(b.x - aim.x, b.y - aim.y)); hops++; aim = E.aim; }
      }
      if (kind !== 'bounce') { worstThrow = Math.max(worstThrow, near); thrown++; }
      else if (E.rolling) { worstRoll = Math.max(worstRoll, Math.hypot(b.x - aim.x, b.y - aim.y)); rolled++; }
    }
    P.leave();
  }
  ok(always && none, 'Egg: the ring is up from the release of every throw, and not before it');
  ok(hops >= 30 && worstHop < 0.3, `Egg: a bounce pass comes down inside its ring, and every hop inside the ring that moved for it (${hops} landings, worst ${worstHop.toFixed(2)} m off centre)`);
  ok(thrown >= 6 && worstThrow < 0.5, `Egg: a flat pass and a high ball pass through their ring at catching height (${thrown} throws, worst ${worstThrow.toFixed(2)} m off centre)`);
  ok(rolled >= 5 && worstRoll < 0.3, `Egg: a rolling ball stops in the ring that moved for it (${rolled} rolls, worst ${worstRoll.toFixed(2)} m)`);
  // the ring makes it easier, so the reward has to stay with moving: a child who reads the ring and stands in it, against one who reads it and runs on to it
  const ringAt = E => E.aim || E.me;
  const standIn = lag => { const n = lagged(lag); let t = 0; return st => { const E = st.egg; if (E.stage !== 'fly') { t = 0; stick(0, 0); return; } if (t++ < n) return; toward(E.me, ringAt(E).x, ringAt(E).y, 0.3); }; };
  const runOn = lag => { const n = lagged(lag); let t = 0; return st => { const E = st.egg, b = T.M.ball; if (E.stage !== 'fly') { t = 0; stick(0, 0); return; } if (t++ < n) return; const a = ringAt(E), d = Math.hypot(a.x - E.me.x, a.y - E.me.y); if (d > 2.2) toward(E.me, a.x, a.y, 0.02); else toward(E.me, b.x, b.y, 0.02); }; };
  for (const lag of [0.4, 0.8]) {
    const stood = stars('egg', null, () => standIn(lag), 20), ran = stars('egg', null, () => runOn(lag), 20);
    ok(stood.mean >= 0.5, `Egg: a child ${lag} s slow who only stands in the ring earns stars (${showMean(stood)})`);
    ok(stood.mean <= 2.2, `Egg: and going to the ring and no further stays short of the top stars (${showMean(stood)})`);
    ok(ran.mean >= stood.mean, `Egg: running on to the ball from the ring earns at least as much as stopping in it (${showMean(ran)} to ${showMean(stood)})`);
  }
}
{ // the same catch, moving or waiting
  const catchAt = run => { H.reseed(11); P.start('egg'); $('pr-retry').click(); const st = P.state(), E = st.egg, b = T.M.ball; while (E.stage !== 'fly') T.update(STEP); for (let i = 0; i < 300 && E.bounced === false; i++) { T.update(STEP); } E.me.x = b.x + 0.8; E.me.y = b.y; E.me.vx = run ? -6 : 0; E.me.vy = 0; if (run) stick(-1, 0); T.update(STEP); letGo(); const out = { caught:E.caught, score:E.score, met:E.met }; P.leave(); return out; };
  const a = catchAt(true), w = catchAt(false);
  ok(a.caught === 1 && w.caught === 1 && a.score === X.EGG.points[1] && w.score === X.EGG.points[0] && X.EGG.points[1] > X.EGG.points[0] && a.met === 1, `Egg: running to meet the ball earns more than waiting (${a.score} to ${w.score})`);
}
{ // Watch How: all three, named, and it does not stop at the first catch
  for (let seed = 1; seed <= 12; seed++) {
    H.reseed(seed*577); D.settings().drillSeen = []; P.start('egg');
    const names = new Set(); let firstCatchWall = null, endN = 0, caught = 0, firstHops = 0;
    for (let i = 0; i < 9000 && P.state().demo; i++) {
      const E = P.state().egg, cap = $('demo-step').textContent;
      if (E.n === 1) firstHops = Math.max(firstHops, E.hops.length);
      if (E.caught && firstCatchWall == null) firstCatchWall = E.n;
      endN = E.n; caught = E.caught;
      if (/^(Bounce Pass|Flat Pass|High Ball)$/.test(cap)) names.add(cap);
      T.update(STEP);
    }
    const L = X.demoLast();
    ok(names.size === 3 && endN === 3 && L.ok && L.why === 'end' && firstCatchWall === 1 && firstHops >= 2, `Egg Watch How, seed ${seed}: names all three, shows the hops and ends after the third (${[...names].join(', ')}; ${endN} throws, ${firstHops} hops seen, ${caught} caught)`);
    P.leave();
  }
  seeAll();
}

/* ---------- Tackling: the head side, and the reason ---------- */
{ const v = (marks, good = false) => X.tackleVerdict({ good, marks });
  const tooHigh = v({ pos:{ ok:true }, head:{ ok:true }, height:{ ok:false, word:'Too High' } });
  ok(tooHigh.word === 'Too High' && /hurt/i.test(tooHigh.why) && tooHigh.why.split(/\s+/).length <= 8, 'Tackling: "Too High" gives its reason in a few words: ' + tooHigh.why);
  ok(v({ head:{ ok:false, word:'Wrong Side' }, height:{ ok:false, word:'Too High' } }).word === 'Too High', 'Tackling: a high tackle is named first, whatever else went wrong');
  ok(Object.values(X.tackleWhy).every(w => w.split(/\s+/).length <= 8), 'Tackling: every reason is a few words');
  ok(v({ head:{ ok:false, word:'Wrong Side' } }).why === 'Put Your Head Behind Them', 'Tackling: the wrong side says where the head goes');
  ok(v({}, true).word === 'Great Tackle' && !v({}, true).why, 'Tackling: a good rep needs no reason');
  P.start('tackle'); $('pr-retry').click();
  const st = P.state(), Tk = st.tackle;
  ok(Tk.drift === -Tk.safe, 'Tackling: the safe side is away from where the runner is going');
  Tk.me.y = Tk.lane; Tk.me.vx = Tk.me.vy = 0; Tk.ru.x = Tk.me.x + X.TACKLE.setAt + 0.01;
  for (let i = 0; i < 30 && Tk.stage === 'approach'; i++) { Tk.me.y = Tk.lane; T.update(STEP); }
  ok(Tk.stage === 'head', 'Tackling: Set leads to the head side');
  D.view(844, 390); let threw = null, chips = []; globalThis.__ctxSpy = (k, a) => { if (k === 'fillText') chips.push(a[0]); }; try { D.render(1/60); } catch (e) { threw = e; } globalThis.__ctxSpy = null;
  ok(!threw && chips.includes('HEAD') && chips.length === 6, 'Tackling: six chips over the head side (' + chips.join(', ') + ')' + (threw ? threw.message : ''));
  for (let i = 0; i < 600 && Tk.stage === 'head'; i++) T.update(STEP);
  ok(Tk.stage === 'side' && Tk.marks.head && Tk.marks.head.ok === false && Tk.marks.head.word === 'No Side', 'Tackling: no choice in time fails the head side, and the rep goes on');
  P.leave();
  P.start('tackle'); const lines = X.KIT.tackle.howTo(); ok(/Head behind them/.test(lines) && /thighs/.test(lines) && lines.length < 130, 'Tackling: the ready card says it in one line'); P.leave();
}

/* ---------- Tag Chase and Ball Back ---------- */
{ P.start('tag'); ok(P.state().ready && !P.state().opts && $('pr-result').textContent === 'Tag Chase', 'Tag Chase: a ready card'); $('pr-retry').click();
  const st = P.state(), G = st.tag;
  ok(st.space && T.M.players.length === 2 && G.rep === 1 && T.M.ball.carrier === G.me, 'Tag Chase: you carry first');
  D.updateHud(); ok($('btnA').hidden && $('btnC').hidden, 'Tag Chase: no button while you keep your tags');
  for (let i = 0; i < 1200 && G.rep === 1; i++) { stick(1, 0); T.update(STEP); }
  letGo();
  ok(G.results[0] === false && G.word === 'Pulled' && G.why, 'Tag Chase: running straight on loses your tag, and it says why: ' + G.why);
  ok(G.rep === 2 && T.M.ball.carrier === G.them, 'Tag Chase: then you chase');
  D.updateHud(); ok(!$('btnA').hidden && $('la').textContent === 'Pull Tag', 'Tag Chase: Pull Tag once you chase');
  G.me.x = G.them.x - 1.5; G.me.y = G.them.y; G.me.vx = G.me.vy = 0; G.them.vx = -5; G.them.vy = 0; const w0 = T.M.stats.tagWhiff || 0;
  ok(!X.tagCanPull(G), 'Tag Chase: from the front you can\'t reach a hip');
  inp.aPressed = true; T.update(STEP);
  ok((T.M.stats.tagWhiff || 0) === w0 + 1 && G.stage === 'play', 'Tag Chase: a grab from the front misses, and costs a moment');
  G.me.x = G.them.x; G.me.y = G.them.y + 1.2; G.whiff = 0; G.them.vx = -5; G.them.vy = 0;
  ok(X.tagCanPull(G), 'Tag Chase: beside them, at arm\'s length, you can');
  inp.aPressed = true; T.update(STEP);
  ok(G.results[1] === true && G.pulled === 1 && G.stage === 'show', 'Tag Chase: and the tag comes away');
  for (let i = 0; i < 1500 && G.rep < 4; i++) T.update(STEP);
  G.me.x = G.them.x + 0.2; G.me.y = G.them.y + 0.1; const r0 = G.results.length; T.update(STEP);
  ok(G.results.length === r0 + 1 && G.results[r0] === false && G.word === 'No Contact', 'Tag Chase: a bump is No Contact, and the rep is gone');
  letGo(); P.leave();
  ok(JSON.stringify(X.result({ id:'tag', done:true, stars:2, won:true })) === JSON.stringify({ id:'tag', stars:2, success:true, skill:'pace' }), 'Tag Chase trains pace');
  ok(C.DRILL_SKILL.tag === 'pace' && C.DRILL_SKILL.back === 'handling', 'the career agrees: Tag Chase pace, Ball Back handling');
  ok(X.result({ id:'back', done:true, stars:1, won:true }).skill === 'handling', 'Ball Back trains handling');
  for (const [id, cuts] of [['tag', X.TAG.stars], ['back', X.BACK.stars]]) ok(cuts.length === 3 && cuts.every((c, i) => c > 0 && (!i || c > cuts[i - 1])), id + ': three rising thresholds');
  ok(/<(path|circle|ellipse)\b/.test(X.icons.tag) && /<(path|circle|ellipse)\b/.test(X.icons.back), 'both have a drawn picture');
}
{ const parts = (o, seed = 8) => { H.reseed(seed); P.start('back'); $('pr-retry').click(); const G = P.state().back; let n = 0, was = ''; while (G.stage !== 'show' && n++ < 3000) { if (G.stage !== was) { was = G.stage; stick(0, 0); T.update(STEP); continue; } if (G.stage === 'run') { if (!G.tapped && (o.hands === 'early' ? G.d < X.BACK.from - 0.3 : o.hands === 'gold' && G.d <= 1.6)) inp.aPressed = true; stick(0, 0); } else if (G.stage === 'land') stick(o.land === 'safe' ? G.safe : o.land === 'hand' ? -G.safe : 0, 0); else if (G.stage === 'place') stick(o.place === 'team' ? G.team : o.place === 'away' ? -G.team : 0, 0); T.update(STEP); } letGo(); const out = { marks:G.marks, good:G.good, why:X.backVerdict(G) }; P.leave(); return out; };
  let r = parts({ hands:'gold', land:'safe', place:'team' });
  ok(r.good && r.why.word === 'Ball Back', 'Ball Back: both hands in time, the safe landing, towards your team');
  r = parts({ hands:'early', land:'safe', place:'team' }); ok(!r.good && r.marks.hands.word === 'One Hand' && /Two Hands/.test(r.why.why), 'Ball Back: a tap long before the gold is One Hand: ' + r.why.why);
  r = parts({ hands:'none', land:'safe', place:'team' }); ok(!r.good && r.marks.hands.word === 'One Hand', 'Ball Back: no tap is One Hand');
  r = parts({ hands:'gold', land:'hand', place:'team' }); ok(!r.good && r.marks.land.word === 'Hand Out' && /Bottom, Then Shoulder/.test(r.why.why), 'Ball Back: a hand out fails the landing: ' + r.why.why);
  r = parts({ hands:'gold', land:'none', place:'team' }); ok(!r.good && r.marks.land.word === 'Slow Landing', 'Ball Back: no choice in time fails the landing');
  r = parts({ hands:'gold', land:'safe', place:'away' }); ok(!r.good && r.marks.place.word === 'Wrong Way', 'Ball Back: away from your team fails');
  r = parts({ hands:'gold', land:'safe', place:'none' }); ok(!r.good && r.marks.place.word === 'Too Slow', 'Ball Back: no placement in time fails');
  const sides = new Set(); for (let s = 1; s <= 12; s++) { H.reseed(s); P.start('back'); $('pr-retry').click(); sides.add(P.state().back.safe + ',' + P.state().back.team); P.leave(); }
  ok(sides.size === 4, 'Ball Back: the safe landing and your team change sides from rep to rep, so one direction held does not win');
  D.view(844, 390); P.start('back'); $('pr-retry').click(); { let threw = null; try { for (let i = 0; i < 400; i++) { T.update(STEP); if (i % 15 === 0) { D.render(1/60); D.updateHud(); } } } catch (e) { threw = e; } ok(!threw, 'Ball Back: draws through its stages' + (threw ? ' (' + threw.message + ')' : '')); } P.leave();
}

/* ---------- every game shows a short line after a run ---------- */
for (const d of X.DRILLS) {
  const made = runOnce(d.id, d.roles ? 'passer' : null, stillBot, 1); const tip = $('pr-tip').textContent;
  ok(made.done && !$('pr-tip').hidden && tip.length > 8 && tip.length <= 70 && !/\b(he|she|his|her|him)\b/i.test(tip), d.id + ': a short line after a run: ' + tip);
  P.leave();
}
P.start('egg'); ok($('pr-tip').hidden, 'no such line on the ready card: nothing to read before play'); P.leave();

/* ---------- pilots: every Watch How across seeds ---------- */
for (const d of X.DRILLS) {
  let good = 0, longest = 0; const n = 12;
  for (let seed = 1; seed <= n; seed++) { H.reseed(seed*1009); D.settings().drillSeen = []; P.start(d.id); for (let i = 0; i < 12000 && P.state() && P.state().demo; i++) T.update(STEP); const L = X.demoLast(); if (L && L.id === d.id && L.ok && L.why === 'end') good++; longest = Math.max(longest, L ? L.wall : 0); P.leave(); }
  ok(good === n && longest < X.DEMO.cap, `${d.id}: the Watch How pilot succeeds under ${n} seeds (${good}, longest ${longest.toFixed(1)} s)`);
}
seeAll();

/* ---------- the age gates: every route ---------- */
const CONTACT = ['tackle', 'scrum', 'back'], OPEN = ['tag', 'egg', 'circle', 'cones', 'pass', 'kick', 'defend'];
/* In the merge, PR #14's "a career still in the Minis" is main's Minis category (Men | Women | Minis): main's career has no Minis stage. */
const minis = fn => { const s = D.settings(), was = s.cat; s.cat = 'minis'; try { fn(); } finally { s.cat = was; } };
{ // free play with Minis picked: the same rule, by every route
  minis(() => {
    ok(D.settings().cat === 'minis' && !K.kidsLevel(), 'Minis picked, not on the Kids level');
    P.choose(); ok($('pr-contact').hidden, 'Minis, free play: the picker hides the contact group'); P.leave();
    for (const id of CONTACT) { ok(X.barred(id), 'Minis, free play: ' + id + ' is barred with no caller'); P.start(id); ok(!P.state(), 'Minis, free play: a direct start of ' + id + ' does not open'); $('pr-' + id).click(); ok(!P.state(), 'Minis, free play: its card does nothing'); }
    P.start('tag'); { const seen = []; for (let i = 0; i < 12; i++) { $('pr-next').click(); seen.push(P.state().id); } ok(seen.every(id => !CONTACT.includes(id)), 'Minis, free play: Next Game never lands on a contact game'); } P.leave();
  });
  D.settings().cat = 'women'; ok(!X.barred('tackle'), 'Women picked, it opens again'); P.choose(); ok(!$('pr-contact').hidden, 'and the picker shows it'); P.leave(); D.settings().cat = 'men';
  ok(!X.barred('tackle'), 'with Men and no Kids level, it opens');
}
{ // Kids level and the Minis: Breakaway and Create a Gap are games of tag, every round. No dive, no bind, no Big Hit
  const pullBot = () => defendBot(0.4);                   // Tackle is Pull Tag here: the same press, once close
  const young = fn => { const s = D.settings(), was = [s.kids, s.diff]; K.segSet(0); try { fn(); } finally { s.kids = was[0]; s.diff = was[1]; } };
  for (const [name, wrap] of [['Kids level', young], ['Minis', minis]]) wrap(() => {
    P.start('defend'); ok(P.state().tagOnly && $('pr-objective').textContent === 'Get Across and Pull the Tag' && /Pull Tag/.test($('pr-feedback').textContent) && !/Tackle/.test($('pr-feedback').textContent) && $('pr-coach').hidden, name + ': the Breakaway card asks for a tag, not a tackle'); P.leave();
    let won = 0, binds = 0, words = 0, tackles = 0, whiffs = 0;
    let rounds = 0, pulls = 0;
    for (let s = 1; s <= 30; s++) { const st = runOnce('defend', null, pullBot, s*911); if (st.won) won++; rounds += st.defend.R.won; pulls += T.M.stats.drillPulled || 0; tackles += (T.M.stats.ta1 || 0) + (T.M.stats.ta0 || 0); for (const p of T.M.players) if (p.bind) binds++; if ((T.M.stats['tag_Big Hit'] || 0) || (T.M.stats.dom0 || 0)) words++; P.leave(); }
    ok(won >= 25 && pulls >= rounds && rounds > won && !tackles && !binds && !words, name + ': Breakaway is won by a tag in every round, with no tackle, bind or Big Hit (' + won + ' of 30 won, ' + rounds + ' rounds, ' + pulls + ' tags pulled; ' + tackles + ' tackles, ' + words + ' Big Hits)');
    P.start('defend'); $('pr-retry').click(); inp.bPressed = true; T.update(STEP); D.updateHud(); ok($('la').textContent === 'Pull Tag', name + ': the button reads Pull Tag'); 
    const st = P.state(), me = T.sides.ctrlOf(0), c = T.M.ball.carrier; me.x = c.x + 1.2; me.y = c.y; inp.aPressed = true; T.update(STEP); ok(!st.done && st.defend.R.won === 1 && st.defend.R.stage === 'show' && T.M.tags.some(t => t.text === 'Got It'), name + ': a press in reach pulls the tag and wins the round'); P.leave();
    for (const n of [1, 3, 5]) { H.reseed(5); P.start('pass'); const stp = P.state(); if (n > 1) { stp.gap.R.round = n; stp.gap.R.won = n - 1; X.gapRestage(n); } $('pr-retry').click(); let k = 0; while (!stp.done && k++ < 3000) { stick(0, 0); T.update(STEP); }
      ok(stp.done && !stp.won === (n === 1) && stp.gap.R.lost === 'Tagged' && !T.M.stats.tackles && !T.M.stats.ta0 && /Pass before they reach you/.test($('pr-tip').textContent), name + ': in Create a Gap round ' + n + ', a carrier who stands still is tagged, not tackled, and the run ends: ' + stp.gap.R.lost + ', ' + $('pr-tip').textContent); P.leave(); }
    { D.settings().drillSeen = []; P.start('defend'); ok($('demo-coach').hidden, name + ': Watch How has no coach line in a game of tag'); let n = 0; const caps = new Set(); while (P.state() && P.state().demo && n++ < 12000) { T.update(STEP); caps.add($('demo-cap').textContent); } const L = X.demoLast(); ok(L && L.ok && [...caps].some(t => /Pull Tag/.test(t)) && ![...caps].some(t => /Tackle/.test(t)), name + ': and its Watch How pulls a tag (' + [...caps].filter(t => /Tag/.test(t)).join(' ; ') + ')'); P.leave(); seeAll(); }
  });
  P.start('defend'); ok(!P.state().tagOnly && !$('pr-coach').hidden && /Tackle/.test($('pr-feedback').textContent), 'grown-up levels: Breakaway is a tackle, and its card carries the coach line'); P.leave();
}
ok(X.DRILLS.filter(d => d.contact).map(d => d.id).join() === CONTACT.join() && X.DRILLS.slice(0, OPEN.length).map(d => d.id).join() === OPEN.join(), 'Tag and handling games come first; Tackling, Driving and Ball Back are the contact group');
{ const body = html.slice(html.indexOf('id="hp-drills"'), html.indexOf('id="pr-grownups"')), group = body.slice(body.indexOf('id="pr-contact"'), body.indexOf('id="pr-grown"'));   // Skills Mini Games, under the home's bar
  ok(/<span class="pr-group">Contact Games \(U9 and Up\)<\/span>/.test(group), 'the group reads Contact Games (U9 and Up)');
  ok(CONTACT.every(id => group.includes(`id="pr-${id}"`)) && OPEN.every(id => !group.includes(`id="pr-${id}"`) && body.includes(`id="pr-${id}"`)), 'the three contact cards are inside that group, and nothing else');
  ok(group.includes(X.COACH), 'the group carries the coach line');
  ok(X.COACH === 'Learn Real Tackling With a Club Coach. Not One to Try at Home.', 'the coach line is word for word');
  ok(!/\bage\b[^s]/i.test(group) && !/<input\b|<select\b/.test(body), 'no age is asked for');
}
function setKids(on) { K.segSet(on ? 0 : 1); }
function atLevel(on, fn) { const s = D.settings(), was = [s.kids, s.diff]; setKids(on); try { fn(); } finally { s.kids = was[0]; s.diff = was[1]; } }
atLevel(true, () => {
  ok(K.kidsLevel(), 'Kids level is on');
  P.leave(); P.choose();
  ok($('pr-contact').hidden && !$('s-home').hidden, 'Kids level, picker (Skills Mini Games, on the home): the contact group is hidden');
  for (const id of CONTACT) {
    P.start(id); ok(!P.state(), 'Kids level, a direct start: ' + id + ' does not open');
    $('pr-' + id).click(); ok(!P.state(), 'Kids level, its card pressed anyway: ' + id + ' does not open');
    ok(X.barred(id, null) && X.barred(id, { onDone() {} }), 'Kids level: ' + id + ' is barred with or without a caller');
  }
  for (const id of OPEN) { P.start(id); ok(P.state() && P.state().id === id, 'Kids level: ' + id + ' still opens'); P.leave(); }
  { P.start('tag'); const seen = []; for (let i = 0; i < 30; i++) { $('pr-next').click(); seen.push(P.state().id); }   // Next Drill, all the way round
    ok(seen.every(id => !CONTACT.includes(id)) && OPEN.every(id => seen.includes(id)), 'Kids level, Next Drill: goes round every open game and never a contact game (' + [...new Set(seen)].join() + ')'); P.leave(); }
  { P.start('egg'); $('pr-retry').click(); const st = P.state(); st.egg.lives = 0; X.KIT.egg.next(st.egg); ok(P.state().done, 'a run ends'); $('pr-next').click(); ok(P.state() && !CONTACT.includes(P.state().id), 'Kids level, Next Drill off a result card: not a contact game'); P.leave(); }
  { const cr = C.create({ pos:'B', num:6, club:{ id:'TST', name:'Testers', kit:'#123456', trim:'#abcdef', pace:4, power:3, handling:4, kicking:3, stamina:3 } }); C.set(cr);
    ok(!C.drills(cr).some(d => CONTACT.includes(d.id)) && C.drills(cr).some(d => d.id === 'tag'), 'Kids level, a career: no contact game on the list');
    for (const id of CONTACT) { cr.trained = false; ok(C.train(id) === false && !P.state(), 'Kids level, career train: ' + id + ' does not open'); }
    C.set(null); }
  P.leave();
});
{ const cr = C.create({ pos:'B', num:6, club:{ id:'TST', name:'Testers', kit:'#123456', trim:'#abcdef', pace:4, power:3, handling:4, kicking:3, stamina:3 } }); C.set(cr);
  minis(() => {
    const list = C.drills(cr).map(d => d.id);
    ok(!list.some(id => CONTACT.includes(id)) && list.includes('tag') && list.length === OPEN.length, 'a career with Minis picked: Tag Chase in, Tackling, Driving and Ball Back out (' + list + ')');
    C.renderTrain(); ok(!$('ct-list').innerHTML.includes('data-drill="tackle"') && $('ct-list').innerHTML.includes('data-drill="tag"') && !/pr-coach|Contact Games/.test($('ct-list').innerHTML), 'Minis: the training screen shows Tag Chase, and no Contact Games group nor coach line since there is no contact game');   // the line is in the list's own markup since Train took the Skills Mini Games' groups (the skills builder)
    for (const id of CONTACT) { cr.trained = false; ok(C.train(id) === false && !P.state(), 'Minis, career train: ' + id + ' does not open'); P.start(id, { onDone() {} }); ok(!P.state(), 'Minis, a direct start with a caller: ' + id + ' does not open'); }
    cr.trained = false; ok(C.train('tag') === true && P.state() && P.state().id === 'tag', 'Minis: Tag Chase opens'); ok($('pr-next').hidden, 'Minis: no Next Drill on the way to a contact game'); P.leave();
  });
  cr.trained = false;
  const up = C.drills(cr).map(d => d.id); ok(CONTACT.every(id => up.includes(id)) && up.includes('tag') && up.length === X.DRILLS.length, 'Men: every game is offered');
  C.renderTrain(); { const ct = $('ct-list').innerHTML, g = ct.indexOf('Contact Games (U9 and Up)'); ok(g > 0 && ct.indexOf('<span class="pr-coach">' + X.COACH + '</span>') > g && ['tackle', 'scrum', 'back'].every(id => ct.indexOf(`data-drill="${id}"`) > g) && ['tag', 'egg', 'circle', 'cones', 'pass', 'kick', 'defend'].every(id => ct.indexOf(`data-drill="${id}"`) < g), 'Men: the training screen carries Contact Games (U9 and Up) and the coach line over the three contact games, the open games before it'); }
  ok(C.train('tackle') === true && P.state().id === 'tackle' && !$('pr-coach').hidden, 'Men: Tackling opens, with the coach line on its card'); P.leave();
  C.set(null);
}
P.start('tackle'); ok(P.state() && P.state().id === 'tackle' && !$('pr-coach').hidden, 'grown-up levels: a contact game\'s card carries the coach line'); P.leave();
P.start('egg'); ok($('pr-coach').hidden, 'an open game\'s card does not'); P.leave();
ok(/id="pr-coach" hidden>Learn Real Tackling With a Club Coach\. Not One to Try at Home\.</.test(html) && X.COACH === 'Learn Real Tackling With a Club Coach. Not One to Try at Home.' && /<span class="pr-coach">\$\{PRACTICE_COACH\}<\/span>/.test(fs.readFileSync(new URL('../src/ui-career.js', import.meta.url), 'utf8')), 'the ready card and the career\'s list carry the line word for word');
P.choose(); ok(!$('pr-contact').hidden, 'at other levels the picker shows the group'); P.leave();

/* ---------- every id on the page is one element's: a game's card is pr-<id>, so a new game's id can't take another button's ---------- */
{ const seen = {}; for (const m of html.matchAll(/\bid="([^"]+)"/g)) seen[m[1]] = (seen[m[1]] || 0) + 1;
  const dup = Object.keys(seen).filter(k => seen[k] > 1);
  ok(!dup.length, 'no id on the page is used twice (' + dup.join() + ')');
  P.choose(); $('pr-home').click(); ok(!$('s-home').hidden && !P.state(), 'Back to Menu goes home, and starts nothing');
  P.choose(); $('pr-back').click(); ok(P.state() && P.state().id === 'back' && $('s-home').hidden, 'the Ball Back card starts Ball Back, and does not go home'); P.leave();
}

/* ---------- the grown-ups' panel ---------- */
{ const panel = html.slice(html.indexOf('id="pr-grownups"'), html.indexOf('id="pr-grown-back"'));
  ok(panel.includes('Coaching Tips Written Independently, in Line With Rugby Governing Body Guidance. Not Endorsed by Any Rugby Body. Not a Substitute for a Qualified Coach.'), 'the agreed line, word for word');
  ok(X.DRILLS.every(d => panel.includes('<b>' + d.name + ':</b>')), 'what each game builds, all ten');
  ok(/concussion/i.test(panel) && /stop playing/i.test(panel) && /doctor/i.test(panel), 'short concussion advice: stop, and see a doctor');
  ok(!/<a[\s>]|href=|http|www\.|\.com|\.org/i.test(panel), 'plain text, no links');
  P.choose(); ok($('pr-grownups').hidden && !$('pr-games').hidden, 'it starts shut');
  $('pr-grown').click(); ok(!$('pr-grownups').hidden && $('pr-games').hidden, 'For Grown-Ups opens it, in place of the cards');
  $('pr-grown-back').click(); ok($('pr-grownups').hidden && !$('pr-games').hidden, 'Back to Games shuts it');
  $('pr-grown').click(); P.choose(); ok($('pr-grownups').hidden, 'coming back to the screen finds it shut'); P.leave();
  const body = html.slice(html.indexOf('<body'), html.indexOf('<script'));
  ok(/For Grown-Ups/.test(body), 'the button is on the Training Ground screen');
}

/* ---------- copy: what children and grown-ups read ---------- */
{ const liter = code => [...code.replace(/\/\*[\s\S]*?\*\/|\s\/\/ .*$/gm, '').matchAll(/'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)].map(m => m[1] ?? m[2]);
  const strings = [...liter(training), ...liter(practiceSrc), ...liter(demoSrc)];
  const screen = html.slice(html.indexOf('id="s-practice"'), html.indexOf('<script'));
  const all = [...strings, screen].join('\n');
  ok(!/\b(he|him|his|she|her|hers|himself|herself)\b/i.test(all), 'no he or she on screen');
  ok(!/\b(RFU|World Rugby|England Rugby|englandrugby|passport\.world|HEADCASE|Red Rose)\b/i.test(all), 'no governing body named on screen');
  ok(!/\b(at home|in the garden|in the park|with a friend|try this|have a go at home)\b/i.test(all.replace(/Not One to Try at Home/g, '')), 'nothing invites practising at home: the only "at home" is the line that says not to');
  ok(!/<a[\s>]|href=/.test(screen), 'no links out');
  ok(!/—/.test(strings.join(' ') + screen), 'no em dashes');
}

/* ---------- career points and old saves ---------- */
{ // the ladder of the existing skills' points never moves: 1, 3, 5, 8
  ok(JSON.stringify(C.TRAIN) === '[1,3,5,8]', 'the career\'s points for 0 to 3 stars are unchanged');
  // what the game's own measured play earns stays where it was (before the rework, tools/CHECKS.md): a band round each old mean, not a pin
  // defend re-pinned at the rounds (2026-11-09) from [2, 3]: round one wins the same 16 of these 20 seeds as at 84e61b1, so 2.40 to 1.45 is the star rule (rounds won, 1, 3 and 5) alone
  const bands = { egg:[1.6, 2.6], cones:[1.8, 3], tackle:[2.5, 3], kick:[1.8, 3], defend:[1, 1.8], pass:[2, 3] };
  const said = [];
  for (const [id, role, name, good, child] of table) { const b = bands[id]; if (!b) continue; const m = stars(id, role, child, 20); said.push(name + ' ' + showMean(m)); ok(m.mean >= b[0] && m.mean <= b[1], `Career: a child's ${name} stays in its old band, ${b[0]} to ${b[1]} stars (${showMean(m)})`); }
  console.log('Career bands, a child\'s mean of 20 runs: ' + said.join(', '));
  const drive = stars('scrum', null, () => driveBot(4.5, 0.5), 20); ok(drive.mean >= 1.5 && drive.mean <= 2.5, `Career: a child's Driving, keeping the green, stays in its old band (${showMean(drive)})`);
}
{ // an old save: no drill field, an old career, its Watch How list from before the two new games
  const old = { settings:{ half:2, diff:1, sound:false, hints:false, coach:false, played:7, drillSeen:['egg', 'tackle', 'kick'] }, champ:null, custom:[], champHistory:[], seasonSerial:3,
    career:{ v:1 } };
  const keep = memory['tryline.v1'];
  delete old.career;
  memory['tryline.v1'] = JSON.stringify(old); T.teams.load();
  ok(JSON.stringify(D.settings().drillSeen.slice().sort()) === JSON.stringify(['egg', 'kick', 'tackle']) && D.settings().played === 7, 'an old save loads, and its Watch How list holds');
  P.start('tag'); ok(!!P.state().demo, 'a game new since that save plays its Watch How once'); P.leave();
  P.start('egg'); ok(!P.state().demo && P.state().ready, 'and one it has seen goes to the ready card'); P.leave();
  memory['tryline.v1'] = keep === undefined ? '' : keep; if (keep === undefined) delete memory['tryline.v1'];
  seeAll();
}
{ // no drill progress is saved: a whole run of every game leaves the save as it was, but for the Watch How list
  seeAll(); T.teams.save(); const before = JSON.parse(memory['tryline.v1']); const w0 = writes;
  for (const d of X.DRILLS) { const st = runOnce(d.id, d.roles ? 'passer' : null, mash, 2); ok(st.done, d.id + ': a run to its end'); P.leave(); }
  ok(writes === w0, 'no run of any game writes the save');
  T.teams.save(); const after = JSON.parse(memory['tryline.v1']);
  ok(JSON.stringify(after) === JSON.stringify(before), 'and the save is the same afterwards: no stars, no best, no age');
  ok(!Object.keys(after).some(k => /drill|practice|training|age|stars/i.test(k)) && !Object.keys(after.settings).some(k => /practice|training|stars|best|\bage\b/i.test(k)), 'no field for progress or age in the save or its settings');
}


/* ---------- the look: each game's own view, and the stick right in it ---------- */
{ const B = T.behind, DV = X.DV, IDS = X.DRILLS.map(d => d.id), BV = B.BV;
  const settle = (id) => { P.start(id); $('pr-retry').click(); for (let i = 0; i < 3; i++) D.render(1/60); return BV.cam; };
  const man = id => { const st = P.state(); return id === 'tag' ? st.tag.me : id === 'tackle' ? st.tackle.me : id === 'egg' ? st.egg.me : st.cones.me; };
  const key = (code, on) => { if (on) inp.keys.add(code); else inp.keys.delete(code); };
  D.view(844, 390);
  for (const id of IDS) {
    if (id === 'scrum' || id === 'kick') { P.start(id); $('pr-retry').click(); } else settle(id);
    const seen = new Set(); let bad = false, threw = null;
    globalThis.__ctxSpy = (k, a) => { if (k === 'fillStyle') seen.add(a[0]); for (const v of a) if (typeof v === 'number' && !Number.isFinite(v)) bad = true; };
    try { for (let i = 0; i < 90; i++) { T.update(STEP); D.render(1/60); } } catch (e) { threw = e; } globalThis.__ctxSpy = null;
    ok(!threw, id + ': the view draws' + (threw ? ' (' + threw.message + ')' : ''));
    ok(!bad, id + ': nothing non-finite reaches the canvas');
    ok(BV.on === true && !B.behindOn() && DV.cam.id === id, id + ': it draws through its own view, and a match\'s behind view stays off');
    ok(B.dprMax() === 1.5, id + ': the canvas caps at 1.5, as a behind view does');
    ok(!seen.has('#2a6233') && !seen.has('#122018') && !seen.has('#2f6a38'), id + ': no match grass and no perimeter boards');
    P.leave();
    P.start(id); $('pr-retry').click(); const r1 = H.rndCalls(); for (let i = 0; i < 20; i++) D.render(1/60);
    ok(H.rndCalls() === r1, id + ': drawing draws no random number'); P.leave();
  }
  // a turned view: up is up the screen and right is right, by thumb, by key and by Watch How
  const moved = (id, set) => { const c = settle(id), me = man(id), a = D.pr(c, me.x, me.y, 0); set(true); for (let i = 0; i < 30; i++) T.update(STEP); set(false); const b = D.pr(c, me.x, me.y, 0); return { dx:b.sx - a.sx, dy:b.sy - a.sy }; };
  for (const id of ['tag', 'tackle', 'egg', 'cones']) {
    for (const [name, write, on] of [
      ['the stick', (x, y) => { inp.jx = x; inp.jy = y; }, null],
      ['the keys', null, true],
    ]) {
      const go = dir => { const [x, y, code] = { up:[0, -1, 'KeyW'], down:[0, 1, 'KeyS'], left:[-1, 0, 'KeyA'], right:[1, 0, 'KeyD'] }[dir]; return moved(id, o => { if (write) { inp.jx = o ? x : 0; inp.jy = o ? y : 0; } else key(code, o); }); };
      const r = go('right'), l = go('left'), u = go('up'), d = go('down');
      ok(r.dx > 0 && Math.abs(r.dx) > Math.abs(r.dy), id + ': ' + name + ' right goes right on the screen');
      ok(l.dx < 0 && Math.abs(l.dx) > Math.abs(l.dy), id + ': ' + name + ' left goes left on the screen');
      ok(u.dy < 0, id + ': ' + name + ' up goes up the screen');
      ok(d.dy > 0, id + ': ' + name + ' down goes down the screen');
      inp.keys.clear(); inp.jx = inp.jy = 0; P.leave();
    }
  }
  { const pad = { index:0, mapping:'standard', connected:true, buttons:Array.from({ length:17 }, () => ({ pressed:false, value:0 })), axes:[0, 0, 0, 0] };   // a pad's stick, through the same turn
    H.padStub([pad]); H.fire('gamepadconnected', { gamepad:pad });
    for (const id of ['tag', 'tackle', 'egg']) for (const [name, ax, test] of [['up', [0, -1], m => m.dy < 0], ['right', [1, 0], m => m.dx > 0 && Math.abs(m.dx) > Math.abs(m.dy)]]) {
      const c = settle(id), me = man(id), a = D.pr(c, me.x, me.y, 0); pad.axes = [ax[0], ax[1], 0, 0];
      for (let i = 0; i < 30; i++) { T.pollPads(); T.update(STEP); }
      pad.axes = [0, 0, 0, 0]; T.pollPads(); const b = D.pr(c, me.x, me.y, 0);
      ok(test({ dx:b.sx - a.sx, dy:b.sy - a.sy }), id + ': the pad\'s stick ' + name + ' goes ' + name + ' on the screen'); P.leave();
    }
    H.fire('gamepaddisconnected', { gamepad:pad }); H.padStub([]); inp.jx = inp.jy = 0; }
  ok(settle('tag') && B.stickTurn(0) === 1, 'Tag Chase turns the stick'); P.leave();
  { settle('tackle'); const Tk = P.state().tackle; ok(B.stickTurn(0) === 1, 'Tackling turns it to get in their path'); Tk.stage = 'head'; ok(B.stickTurn(0) === 0, 'and not on a close-up, whose left and right are the screen\'s'); P.leave(); }
  for (const id of ['egg', 'circle', 'cones', 'pass', 'defend', 'kick', 'scrum', 'back']) { P.start(id); ok(B.stickTurn(0) === 0, id + ': a side or close-up view leaves the stick as Top has it'); P.leave(); }
  // Watch How writes through the same turn, so the ghost thumb shows the way the man really goes
  { P.start('tag'); X.demoStart(); let up = 0, right = 0, went = 0; const G = P.state().tag; for (let i = 0; i < 2400 && G.rep === 1 && P.state().demo; i++) { T.update(STEP); if (inp.jy < -0.5 && !G.lunge) up++; if (Math.hypot(inp.jx, inp.jy) > 0.5 && !G.lunge && inp.jy < -0.5 && G.me.vx > 1) went++; } ok(up > 20 && went > 20, 'Watch How: the ghost thumb pushes up the screen as Tag Chase\'s runner runs up it'); P.leave(); }
  // the props are drawn once a picture each, and a close-up has the screen to itself
  { settle('egg'); ok(typeof X.DV_VIEW.egg.aim === 'function', 'Bouncy Egg has its view'); let imgs = 0; globalThis.__ctxSpy = k => { if (k === 'drawImage') imgs++; }; D.render(1/60); globalThis.__ctxSpy = null; ok(imgs >= 6, 'Bouncy Egg: its cones and the bag of balls are pictures (' + imgs + ')'); P.leave(); }
  // the art's budget, and every new pose is there for every body
  { const man = JSON.parse(fs.readFileSync(new URL('../assets/players/players.json', import.meta.url), 'utf8')), size = man.pages.reduce((a, f) => a + fs.statSync(new URL('../assets/players/' + f, import.meta.url)).size, fs.statSync(new URL('../assets/players/players.json', import.meta.url)).size);
    ok(size < 5*1048576, 'the player art is under the 5 MB target (' + (size/1048576).toFixed(2) + ' MB)');
    for (const clip of ['crouch', 'catch', 'reach', 'bind', 'land', 'place', 'kick']) { const c = man.clips[clip]; ok(c && Object.values(man.sprites).every(b => b[clip] && b[clip].length === c.n*c.dirs.length), 'the ' + clip + ' pose is rendered for every body and facing'); } }
  // copy on the field: training words, no team names on the shove bar, no broadcast bars
  { P.start('scrum'); $('pr-retry').click(); const seen = []; globalThis.__ctxSpy = (k, a) => { if (k === 'fillText') seen.push(a[0]); }; for (let i = 0; i < 40; i++) { T.update(STEP); D.render(1/60); } globalThis.__ctxSpy = null; ok(seen.includes('YOU') && seen.includes('THEM') && !seen.some(t => /^SCRUM ·/.test(String(t))), 'Driving: You and Them, no team names or match titles'); P.leave(); }
  D.view(844, 390);
}

/* ---------- the review's findings, each with its own pin ---------- */
{ // a Bounce Pass really bounces, whoever catches it and however they run
  let catches = 0, unhopped = 0, flats = [], flatOver = 0;
  for (const make of [() => eggChase(0.2), () => eggChase(0.4), () => st => { const E = st.egg, b = T.M.ball; if (E.stage === 'fly') toward(E.me, b.x, b.y, 0.02); else stick(0, 0); }]) for (let s = 1; s <= 30; s++) {
    H.reseed(s*211); P.start('egg'); $('pr-retry').click(); const st = P.state(), E = st.egg, b = T.M.ball, bot = make(); let n = 0, top = 0, kind = null, seen = 0;
    while (!st.done && n++ < 20000) { bot(st); const c0 = E.caught, was = E.n; T.update(STEP); if (E.n !== was) { if (kind === 'flat') flats.push(top); top = 0; kind = E.kind; } if (E.stage === 'fly' && E.kind === 'flat') { top = Math.max(top, b.z); if (b.z >= X.EGG.hi) flatOver++; } if (E.caught > c0 && E.kind === 'bounce') { catches++; if (!E.hops.length) unhopped++; } }
    letGo(); P.leave();
  }
  ok(catches > 100 && unhopped === 0, 'Egg: no Bounce Pass is caught before it has hit the ground (' + unhopped + ' of ' + catches + ')');
  ok(flats.length > 100 && Math.max(...flats) <= X.EGG.flatTop + 0.02 && !flatOver, 'Egg: a Flat Pass stays under the catch limit all the way, at any range (top ' + Math.max(...flats).toFixed(2) + ' m, ' + flatOver + ' frames over)');
  // Watch How's own three throws read as three different heights
  H.reseed(577); D.settings().drillSeen = []; P.start('egg'); const tops = {}; for (let i = 0; i < 12000 && P.state() && P.state().demo; i++) { const E = P.state().egg; if (E.stage === 'fly') tops[E.kind] = Math.max(tops[E.kind] || 0, T.M.ball.z); T.update(STEP); } P.leave(); seeAll();
  ok(tops.flat <= 1.85 && tops.high > tops.flat + 2.5, 'Egg Watch How: the Flat Pass is flat and the High Ball is high (' + tops.flat.toFixed(2) + ' m, ' + tops.high.toFixed(2) + ' m)');
  // and the bounce still has to land before it can be held
  H.reseed(3); P.start('egg'); $('pr-retry').click(); { const E = P.state().egg, b = T.M.ball; while (E.stage !== 'fly') T.update(STEP); ok(E.kind === 'bounce' && !E.bounced && b.z > X.EGG.lo, 'Egg: a Bounce Pass in the air'); E.me.x = b.x; E.me.y = b.y; T.update(STEP); ok(E.caught === 0 && E.stage === 'fly', 'Egg: a catcher right under it can\'t take it before it lands'); } P.leave();
}
{ // Ball Back: a thumb left on the stick never makes a choice
  const held = sec => () => { const Q = X.BACK; let rep = 0, c = 0, stage = '', side = 0, wall = 0, until = -1; return st => { const G = st.back; wall += STEP; if (G.rep !== rep) { rep = G.rep; until = -1; } if (G.stage !== stage) { stage = G.stage; c = 0; } c++;
    if (G.stage === 'run') { stick(0, 0); if (!G.tapped && G.d <= 1.6) inp.aPressed = true; return; }
    if (G.stage === 'land') { if (c*STEP > Q.grace/0.75 + 0.05) { stick(G.safe, 0); side = G.safe; if (until < 0) until = wall + sec; } else stick(0, 0); return; }
    if (G.stage === 'place') { if (wall < until) { stick(side, 0); return; } if (wall < until + 0.25) { stick(0, 0); return; } stick(G.team, 0); return; } stick(0, 0); }; };
  for (const sec of [0.15, 0.3, 0.45, 0.6, 0.8]) { const r = stars('back', null, held(sec), 40); ok(r.mean === 3, 'Ball Back: a thumb held ' + sec + ' s past the landing, then moved, loses nothing (' + showMean(r) + ')'); }
  const forever = stars('back', null, () => st => { const G = st.back; if (G.stage === 'run' && !G.tapped && G.d <= 1.6) inp.aPressed = true; stick(G.stage === 'run' ? 0 : 1, 0); }, 10);
  H.reseed(8); P.start('back'); $('pr-retry').click(); { const G = P.state().back; let n = 0; while (G.stage !== 'show' && n++ < 3000) { stick(1, 0); T.update(STEP); } ok(G.marks.land.word === 'Slow Landing' && G.marks.place.word === 'Too Slow', 'Ball Back: a stick held all along is no choice at all: never Wrong Way or Hand Out'); } P.leave(); letGo();
  ok(forever.mean === 0, 'Ball Back: a stick held one way all along wins nothing');
  // the same rule on Tackling's head side: a thumb still pushing from getting in their path is not a choice
  P.start('tackle'); $('pr-retry').click(); { const Tk = P.state().tackle; Tk.me.y = Tk.lane; Tk.ru.x = Tk.me.x + X.TACKLE.setAt + 0.01; inp.jx = 0.9; inp.jy = 0; for (let i = 0; i < 40 && Tk.stage === 'approach'; i++) { Tk.me.y = Tk.lane; Tk.me.vy = 0; T.update(STEP); Tk.me.y = Tk.lane; } if (Tk.stage === 'head') { for (let i = 0; i < 20; i++) T.update(STEP); ok(Tk.pick == null, 'Tackling: a thumb held through from Set does not pick the head side'); inp.jx = 0; T.update(STEP); inp.jx = Tk.safe; T.update(STEP); ok(Tk.pick === Tk.safe, 'Tackling: let go and push, and it does'); } else ok(false, 'Tackling: got to the head side (' + Tk.stage + ')'); } letGo(); P.leave(); }
{ // Tackling: Set is balanced feet on short steps, not standing still
  const reach = (speed) => { P.start('tackle'); $('pr-retry').click(); const Tk = P.state().tackle; const v = speed/8.35; Tk.me.y = Tk.lane; for (let i = 0; i < 2000 && Tk.stage === 'approach'; i++) { stick(v, 0); T.update(STEP); Tk.me.y = Tk.lane; } const m = Tk.marks.pos, why = X.tackleVerdict({ good:false, marks:{ pos:m } }); letGo(); P.leave(); return { m, why }; };
  const jog = reach(3.5), flat = reach(8.3);
  ok(jog.m.ok, 'Tackling: coming forward on short steps is Set (' + jog.m.word + ')');
  ok(!flat.m.ok && flat.m.word === 'Not Set' && /Short Steps/.test(flat.why.why), 'Tackling: arriving flat out is Not Set, and it says what to do: ' + flat.why.why);
  ok(X.TACKLE.still >= X.TACKLE.jog, 'Tackling: short steps are allowed at the runner\'s own jog'); }
{ // the words a child sees: drills, lessons, and things the sources don't say
  const liter = code => [...code.replace(/\/\*[\s\S]*?\*\/|\s\/\/ .*$/gm, '').matchAll(/'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)].map(m => m[1] ?? m[2]);
  const help = fs.readFileSync(new URL('../src/ui-help.js', import.meta.url), 'utf8'), pieces = fs.readFileSync(new URL('../src/set-pieces.js', import.meta.url), 'utf8');
  const all = [...liter(training), ...liter(practiceSrc), ...liter(demoSrc), ...liter(help), ...liter(pieces)].join('\n') + '\n' + html.slice(html.indexOf('<body'), html.indexOf('<script'));
  for (const [re, why] of [[/now you try/i, 'the opposite of Not One to Try at Home'], [/stand still/i, 'no source says it, and the tackle reference has you closing in'], [/shadow/i, 'catching is eyes on the ball'], [/\bhit on set\b|good hit\b/i, 'no source praises a hit at the scrum'], [/close enough to dive|\bto dive\b/i, 'the youngest don\'t dive'], [/as the youngest age groups play/i, 'no source for pulling from beside'], [/head and shoulders above/i, 'too close to a reference page, and that page is about rucks'], [/arm.s length/i, 'no source'], [/get beside them/i, 'no source: the tags are on the hips'], [/a steady aim and a smooth kick/i, 'no source'], [/run close to the gates/i, 'no source'], [/step \d of \d/i, 'a game, not a lesson'], [/start drill|next drill|back to training|pick a drill|learn the game|leave drill/i, 'a game, not a lesson']])
    ok(!re.test(all), 'on-screen copy: no "' + re.source + '": ' + why);
  ok(!/try it|you try\b/i.test(demoSrc.replace(/\/\/.*$/gm, '')), 'Watch How never invites trying it');
  const panel = html.slice(html.indexOf('id="pr-grownups"'), html.indexOf('id="pr-grown-back"'));
  ok(/no scrums/.test(panel) && /Driving and the placing in Ball Back go further than under-9s play/.test(panel), 'the panel says plainly where Contact Games go beyond under-9');
  ok(/only a grown-up can leave the Kids level/.test(panel) && /The Kids level and Minis hide Contact Games/.test(panel), 'and how the youngest are kept out');
}
{ // Watch How: the last word and the coach line
  for (const id of CONTACT) { D.settings().drillSeen = []; H.reseed(11); P.start(id); ok(!$('demo-coach').hidden && html.includes('<em id="demo-coach" hidden>' + X.COACH + '</em>'), id + ': Watch How shows the coach line, since a first open plays before any card'); let last = '', n = 0; while (P.state() && P.state().demo && n++ < 20000) { last = $('demo-step').textContent; T.update(STEP); } ok(last === 'Now Play It', id + ': it ends on Now Play It (' + last + ')'); P.leave(); }
  seeAll();
  D.settings().drillSeen = []; H.reseed(11); P.start('tag'); ok($('demo-coach').hidden, 'an open game\'s Watch How has no coach line'); P.leave(); seeAll();
  // Egg counts what is left
  D.settings().drillSeen = []; H.reseed(11); P.start('egg'); { const lines = new Set(); let n = 0; while (P.state() && P.state().demo && n++ < 20000) { const E = P.state().egg; if ($('demo-step').textContent === 'Watch') lines.add(E.n + ':' + $('demo-cap').textContent); T.update(STEP); } const got = [...lines].join(' | '); ok(/0:Watch the thrower\. Three throws are coming\./.test(got) && /1:Two more to come\./.test(got) && /2:One more to come\./.test(got), 'Egg Watch How counts the throws left: ' + got); } P.leave(); seeAll();
  // the keyboard's words
  const words = id => { D.settings().drillSeen = []; H.reseed(11); P.start(id); const seen = new Set(); let n = 0; while (P.state() && P.state().demo && n++ < 20000) { seen.add($('demo-cap').textContent); T.update(STEP); } P.leave(); seeAll(); return [...seen]; };
  D.setDev('kb');
  const kbT = words('tackle'), kbB = words('back');
  ok(kbT.includes('Press S to aim at the thighs.') && !kbT.some(t => /W A S D (down|to the)/.test(t)), 'keyboard, Tackling: Press S, not W A S D down');
  ok(kbB.some(t => /Press A or D for the tick/.test(t)) && kbB.some(t => /Press A or D towards your team/.test(t)) && !kbB.some(t => /W A S D to the/.test(t) || /stick/.test(t)), 'keyboard, Ball Back: the keys by name, and no stick');
  P.start('scrum'); ok(/with W and S/.test($('pr-feedback').textContent) && !/stick/.test($('pr-feedback').textContent), 'keyboard, Driving\'s card names the keys: ' + $('pr-feedback').textContent); P.leave();
  D.setDev('touch'); P.start('scrum'); ok(/with the stick/.test($('pr-feedback').textContent), 'touch, Driving\'s card names the stick'); P.leave();
  // a pad: one name for one button, on the card, the live cue and Watch How
  const pad = { index:0, mapping:'standard', connected:true, axes:[0, 0, 0, 0], buttons:Array.from({ length:17 }, () => ({ pressed:false, value:0 })) };
  H.padStub([pad]); H.fire('gamepadconnected', { gamepad:pad }); pad.buttons[0] = { pressed:true, value:1 }; T.pollPads(); pad.buttons[0] = { pressed:false, value:0 }; T.pollPads();
  for (const [id, word, key] of [['tackle', 'Tackle', 'Bottom Button'], ['defend', 'Switch', 'Right Button'], ['defend', 'Sprint', 'Shoulder'], ['scrum', 'Push', 'Bottom Button']]) { P.start(id); const card = $('pr-feedback').textContent; ok(card.includes(word + ' (' + key + ')') && !/\((J|K|L)\)/.test(card), id + ', pad: the card says ' + word + ' (' + key + '): ' + card); P.leave(); }
  P.start('tackle'); $('pr-retry').click(); { const Tk = P.state().tackle; Tk.stage = 'side'; Tk.t = 0; T.update(STEP); ok($('pr-cue').textContent.includes('Tackle (Bottom Button)') && !/\(J\)/.test($('pr-cue').textContent), 'pad: the live cue agrees: ' + $('pr-cue').textContent); } P.leave();
  ok(X.drillName('Tackle', 'a') === 'Tackle (Bottom Button)', 'pad: and the one namer says the same for Watch How');
  H.fire('gamepaddisconnected', { gamepad:pad }); H.padStub([]); D.setDev('touch');
  D.setDev('kb'); ok(X.drillName('Tackle', 'a') === 'Tackle (J)', 'keyboard: its own key'); D.setDev('touch'); ok(X.drillName('Tackle', 'a') === 'Tackle', 'touch: no key');
}
{ // the pause card in a game
  P.start('tackle'); $('pr-retry').click(); D.pause(); ok($('pz-score').textContent === 'Tackling' && !/\d/.test($('pz-score').textContent), 'pause in a game: its name, no clubs and no score (' + $('pz-score').textContent + ')'); ok($('pz-quit').textContent === 'Back to Skills', 'and Back to Skills, not Quit Match (main\'s way back: Skills Mini Games)'); $('pz-quit').click(); ok(/Again to Leave/.test($('pz-quit').textContent), 'it asks once more in the same words: ' + $('pz-quit').textContent); P.leave(); }
{ // Driving's own hint card, and none on its ready card
  const s = D.settings(), was = s.hints; s.hints = true; P.start('scrum');
  ok(!D.hintFor(0), 'Driving\'s ready card has no hint card over it'); $('pr-retry').click(); const c = T.M.cut; c.t = 1; const h = D.hintFor(0);
  ok(h && h.title === 'Driving' && /Low in the Green/.test(h.rule) && !JSON.stringify(h).includes('Hit'), 'in play the card is Driving\'s own, and names the green: ' + JSON.stringify(h && [h.title, h.rule])); s.hints = was; P.leave(); }
{ // a shape as well as a colour, wherever the safe choice is shown
  const marks = fn => { const paths = []; let cur = null; globalThis.__ctxSpy = (k) => { if (k === 'beginPath') { cur = { m:0, l:0 }; paths.push(cur); } if (cur && k === 'moveTo') cur.m++; if (cur && k === 'lineTo') cur.l++; }; try { fn(); } finally { globalThis.__ctxSpy = null; } return paths; };
  D.view(844, 390); P.start('tackle'); $('pr-retry').click(); { const Tk = P.state().tackle; Tk.stage = 'head'; Tk.t = 0.3; const p = marks(() => D.render(1/60)); ok(p.filter(q => q.m === 1 && q.l === 2).length >= 2 && p.filter(q => q.m === 2 && q.l === 2).length >= 2, 'Head Side: one spot has a tick and the other a cross'); } P.leave();
  P.start('back'); $('pr-retry').click(); { const G = P.state().back; G.stage = 'land'; G.t = 0.3; const p = marks(() => D.render(1/60)); ok(p.filter(q => q.m === 1 && q.l === 2).length >= 2 && p.filter(q => q.m === 2 && q.l === 2).length >= 2, 'Ball Back\'s landing: a tick on the safe one and a cross on the other'); } P.leave();
  ok(/the tick/.test(training) && !/the green side/.test(training + demoSrc), 'the words point at the tick, not at a colour'); }
{ // in a tackle the runner is drawn over the tackler, so the head goes behind them and never on the ball
  D.view(844, 390); P.start('tackle'); $('pr-retry').click(); const Tk = P.state().tackle; Tk.stage = 'squeeze'; Tk.d = 1.6; Tk.h = 0.4; Tk.t = 0.2; Tk.sq = 0.3; const fills = []; globalThis.__ctxSpy = (k, a) => { if (k === 'fillStyle') fills.push(a[0]); }; D.render(1/60); globalThis.__ctxSpy = null; const me = fills.indexOf(T.M.kit[0].fill), them = fills.indexOf(T.M.kit[1].fill); ok(me > -1 && them > me, 'Tackling, in the tackle: the runner is drawn last (tackler ' + me + ', runner ' + them + ')');
  Tk.stage = 'side'; const f2 = []; globalThis.__ctxSpy = (k, a) => { if (k === 'fillStyle') f2.push(a[0]); }; D.render(1/60); globalThis.__ctxSpy = null; ok(f2.indexOf(T.M.kit[1].fill) < f2.indexOf(T.M.kit[0].fill), 'and before it, in the usual order'); P.leave();
  ok(X.BACK.clear > 0.3 && /s === 'land' \? rx \+ K\.clear\*k/.test(training), 'Ball Back\'s landing: the tackler stands clear of the ball in the picture'); }
{ // the youngest hear no Big Hit: a Kids match and a career's Minis
  const dom = () => { const p = T.M.players, c = p.find(x => x.team === 1), q = T.sides.ctrlOf(0); for (let i = 0; i < 400; i++) { q.tcd = 0; q.down = 0; q.bind = null; c.bind = null; c.down = 0; T.M.contact = null; c.x = q.x + 1; c.y = q.y; c.vx = -7; const b = T.M.ball; b.state = 'held'; b.carrier = c; const k = T.contact.commitTackle(q, c, 'contact'); if (k && k.tier === 'dom') { for (let n = 0; n < 40 && T.M.contact; n++) T.update(STEP); return true; } } return false; };
  const NAT = T.teams.NATIONS; T.newMatch(NAT[0], NAT[3], { halfLen:120, diff:0, humans:[true, false], kids:true, arcade:true }); T.M.phase = 'play'; D.setMode('match');
  ok(T.contact.matchMild() && dom() && !T.M.stats['tag_Big Hit'] && T.M.stats.tag_Stopped > 0 && !(T.M.stop > 0) && !T.M.shake, 'Kids match: a dominant tackle reads Stopped, with no freeze and no shake');
  T.newMatch(NAT[0], NAT[3], { halfLen:120, diff:0, humans:[true, false], arcade:true }); T.M.phase = 'play';
  ok(!T.contact.matchMild(), 'an Easy match is not mild'); const cr = C.create({ pos:'B', num:6, club:{ id:'TST', name:'Testers', kit:'#123456', trim:'#abcdef', pace:4, power:3, handling:4, kicking:3, stamina:3 } }); C.set(cr); T.M.career = true; ok(!T.contact.matchMild(), 'a men\'s career match is not'); C.set(null); T.M.career = false; T.newMatch(T.teams.catSide(NAT[0], 'minis'), T.teams.catSide(NAT[3], 'minis'), { halfLen:120, diff:1, humans:[true, false], arcade:true }); T.M.phase = 'play'; ok(T.contact.matchMild(), 'a Minis match is (Men | Women | Minis: PR #14\'s career Minis, in the merge)'); D.exitMatch();
  ok(/It lights up when you can reach them/.test(html), 'Help says when the button lights without teaching a dive'); }

console.log(failed ? `Training games: ${passed} passed, ${failed} failed` : `Training games: ${passed} assertions passed`);
process.exitCode = failed ? 1 : 0;
