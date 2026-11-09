// Skills Mini Games (the drills): every drill's setup, a scripted success and failure, the star thresholds, the onDone hand-back to a
// caller, and isolation (no save, settings, championship or tutorial writes; matches, AI v AI and the demo untouched).
process.env.SEED ??= '21';
import fs from 'node:fs';
const H = await import('./harness.mjs');
const { T } = H;
const P = T.practice, X = T.drills, D = T.debug, $ = id => document.getElementById(id), inp = T.input;
let passed = 0, failed = 0;
function ok(test, message) { if (test) passed++; else { failed++; console.log('FAIL ' + message); } }
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const src = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const training = fs.readFileSync(new URL('../src/training.js', import.meta.url), 'utf8');
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
function stick(x, y) { const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } const t = T.behind.stickTurn(0); if (t) { const sx = y*t, sy = -x*t; x = sx; y = sy; } inp.jx = x; inp.jy = y; }   // x, y on the field: where a game's own view turns the stick, the thumb that means that
function hold(on) { if (on && !inp.aDown) inp.aPressed = true; inp.aDown = on; inp.src.a = on ? 1 : 0; }
function sprint(on) { if (on && !inp.cDown) inp.cPressed = true; inp.cDown = on; inp.src.c = on ? 1 : 0; }
function letGo() { stick(0, 0); hold(false); sprint(false); inp.keys.clear(); }
function begin(id, role, opts) { P.start(id, opts); if (role) $('pr-' + role).click(); else $('pr-retry').click(); }
function play(bot, max = 9000) { let n = 0; while (P.state() && !P.state().done && n < max) { bot(P.state()); T.update(T.STEP); n++; } letGo(); return P.state(); }
const isTitle = s => s.split(' ').every((w, i) => (i > 0 && ['a', 'an', 'the', 'and', 'or', 'of', 'on', 'to', 'in', 'for', 'as', 'at', 'by'].includes(w)) || /^[A-Z0-9]/.test(w));

// ---- isolation is watched across the whole run
const originalSettings = JSON.stringify(D.settings()), originalChamp = JSON.stringify(T.teams.champ()), originalCustom = JSON.stringify(T.teams.custom());
let writes = 0; localStorage.setItem = () => writes++;
T.locker.state().drills = X.DRILLS.map(d => d.id);   // the Locker's Star Pupil writes the save once, after a drill's first three stars (tools/locker.mjs): every drill counted already keeps that write out of these checks

// ---- the contract: ids, names, cards, pictures
const ids = X.DRILLS.map(d => d.id);
ok(JSON.stringify([...ids].sort()) === JSON.stringify(['back', 'circle', 'cones', 'defend', 'egg', 'kick', 'pass', 'scrum', 'tackle', 'tag']), 'PRACTICE_DRILLS holds exactly the ten contract ids');
const names = { tag:'Tag Chase', back:'Ball Back', egg:'Bouncy Egg', circle:'Pass Around the Circle', tackle:'Tackling', cones:'Cones', kick:'Kicking', scrum:'Driving', defend:'Defend a Breakaway', pass:'Create a Two-on-One' };
for (const d of X.DRILLS) {
  ok(d.name === names[d.id] && isTitle(d.name), d.id + ' is named ' + names[d.id] + ', in Title Case');
  ok(new RegExp(`<button class="btn drill" id="pr-${d.id}"><span class="dc-icon" id="pi-${d.id}" aria-hidden="true"></span><span class="dc-name">${d.name}</span></button>`).test(html), d.id + ' has a drill card button (a nav candidate) with its name');
  ok(X.KIT[d.id] && typeof X.KIT[d.id].setup === 'function' && X.icons[d.id] && /<(path|circle|ellipse|rect)\b/.test(X.icons[d.id]), d.id + ' has a drill and a drawn picture');
  ok(d.limit > 0 && d.limit <= 150, d.id + ' has a time limit');
}
ok(/<button class="btn hl" id="hl-drills" data-hl="drills"[^>]*>[\s\S]*?<span class="hl-name">Skills Mini Games<\/span><\/button>/.test(html) && /<div class="hl-panel hp-drills" id="hp-drills"[^>]*>\s*<div class="pr-games" id="pr-games">\s*<div class="drills hl-drills" id="pr-grid">/.test(html) && /<p class="eyebrow" id="pr-eyebrow">Skills Mini Games<\/p>/.test(html) && !/id="s-practice"|id="b-practice"|Practice Ground|Training Ground|Training Drills/.test(html), 'the games are the home\'s Skills Mini Games (PR #14\'s Training Ground screen folded into it, as the drills were), and the card reads Skills Mini Games');
ok(/id="pr-select" data-back>Back to Skills</.test(html) && /id="pr-next">Next Game</.test(html) && /id="pr-watch">Watch How</.test(html) && /id="pr-runner">Runner</.test(html) && /id="pr-passer">Passer</.test(html), 'the card offers Try Again, Watch How, Next Game and Back to Skills, and the circle\'s Runner and Passer');   // Next Drill became Next Game with PR #14's games
ok(!/<img\b|\.png|\.jpg|\.gif/.test(html.slice(html.indexOf('id="pr-grid"'), html.indexOf('id="pr-grownups"'))) && !/<img\b|\.png|\.jpg|\.gif/.test(html.slice(html.indexOf('id="m-practice"'), html.indexOf('<script'))) && !/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(training), 'drill pictures are drawn, with no image files and no emoji');
const drillWords = [...training.matchAll(/drillTag\('([^']+)'/g)].map(m => m[1]);
ok(drillWords.length >= 5 && drillWords.every(w => isTitle(w) || w === '+') && !/\btag\(/.test(training), 'the drills\' on-pitch words are Title Case, and none is a match tag (' + [...new Set(drillWords)].join(', ') + ')');
ok(!/[\u2190-\u2199\u21D0-\u21D9]/.test(training) && !/\u2014/.test(training.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')), 'no arrow glyphs and no em dashes in the drills');
ok(/"training\.js",\s*"practice\.js"/.test(fs.readFileSync(new URL('../src/manifest.json', import.meta.url), 'utf8')), 'training.js is built just before practice.js');

// ---- star thresholds
ok(X.starsOf(0, [4, 7, 10]) === 0 && X.starsOf(4, [4, 7, 10]) === 1 && X.starsOf(9, [4, 7, 10]) === 2 && X.starsOf(12, [4, 7, 10]) === 3, 'stars are one per threshold met');
for (const [k, cuts] of [['EGG', X.EGG.stars], ['CIRCLE', X.CIRCLE.stars], ['TACKLE', X.TACKLE.stars], ['KICKS', X.KICKS.stars], ['DRIVE', X.DRIVE.stars]]) ok(cuts.length === 3 && cuts.every((c, i) => c > 0 && (!i || c > cuts[i - 1])), k + ' has three rising thresholds');
ok(X.CONES.times.length === 2 && X.CONES.times[0] < X.CONES.times[1], 'Cones: two time thresholds, three stars under the first');

// ---- Bouncy Egg
begin('egg');
let s = P.state();
ok(s.space && T.M.phase === 'drill' && T.M.players.length === 2 && s.egg.tw.team === 1 && s.egg.me === T.sides.ctrlOf(0), 'Bouncy Egg: a training space, a thrower facing you');
ok($('drill-hud').hidden === false && /dh-life/.test($('dh-pips').innerHTML) && $('hud').hidden, 'Bouncy Egg: hearts and the catch count in the drill bar, no scorebug');
{ const kinds = new Set(); for (let i = 0; i < 30; i++) { s.egg.me.x = 59; s.egg.me.y = 35; X.eggThrow(s.egg); kinds.add(s.egg.kind); } ok(kinds.size === 3, 'Bouncy Egg: the throw is a bounce, a flat pass or a high one'); }
P.leave();
begin('egg');
s = play(st => { const E = st.egg, b = T.M.ball; if (E.stage === 'fly') { E.me.x = b.x < 61 ? 75 : 47; E.me.y = b.y < 35 ? 51 : 19; } });   // always the wrong way
ok(s.done && s.egg.lives === 0 && s.egg.caught < X.EGG.stars[0] && s.stars === 0 && !s.won && $('pr-result').textContent === 'Have Another Go', 'Bouncy Egg: three balls landing untouched ends the run, no star');
P.leave();
begin('egg');
const meeter = st => { const E = st.egg, b = T.M.ball; if (E.stage === 'wind') { E.me.x = 70; E.me.y = 35; E.me.vx = E.me.vy = 0; } if (E.stage === 'fly' && b.x > X.EGG.box[0] + 0.5 && b.z > X.EGG.lo + 0.05 && b.z < X.EGG.hi - 0.05) { E.me.x = b.x + 0.6; E.me.y = b.y; E.me.vx = -5; E.me.vy = 0; } };   // a scripted catcher who is always there, running at the ball
s = play(meeter);
ok(s.done && s.egg.caught === X.EGG.throws && s.egg.met === X.EGG.throws && s.egg.score === X.EGG.throws*X.EGG.points[1] && s.stars === 3 && s.won && $('pr-feedback').textContent === X.EGG.throws + ' Catches', 'Bouncy Egg: twelve clean catches on the run is three stars');
ok(T.M.stats.eggCatch === X.EGG.throws && /class="on"/.test($('pr-stars').innerHTML) && !$('pr-stars').hidden, 'Bouncy Egg: the result card shows the stars');
P.leave();
begin('egg');
s = play(st => { const E = st.egg, b = T.M.ball; if (E.stage === 'fly' && b.z > X.EGG.lo + 0.05 && b.z < X.EGG.hi - 0.05) { E.me.x = b.x; E.me.y = b.y; E.me.vx = E.me.vy = 0; } });   // and one who is always there, standing waiting
ok(s.done && s.egg.caught === X.EGG.throws && s.egg.met === 0 && s.egg.score === X.EGG.throws && s.stars === 1, 'Bouncy Egg: the same twelve catches standing still is one star: moving to the ball is what scores');
P.leave();
{ // a camper: the stick held towards the thrower all run and nothing else. Every throw leaves his hands, so in his face it would catch the lot
  let nearest = Infinity; const stars = [];
  for (let seed = 1; seed <= 6; seed++) { H.reseed(seed); begin('egg'); s = play(st => { stick(-1, 0); nearest = Math.min(nearest, st.egg.me.x - st.egg.tw.x); }); stars.push(s.stars); P.leave(); }
  ok(nearest >= 6 - 1e-9 && Math.max(...stars) <= 1, 'Bouncy Egg: camping towards the thrower stops six metres out, behind the marker cones, and earns no more than one star (' + stars.join(' ') + ')');
}

// ---- Pass Around the Circle
P.start('circle');
ok(!$('pr-roles').hidden && $('pr-retry').hidden, 'Circle: the ready card asks Runner or Passer');
$('pr-runner').click(); s = P.state();
ok(s.space && s.role === 'runner' && T.M.players.length === 6 && s.circle.R === X.CIRCLE.r0 && T.M.ball.carrier === s.circle.men[0], 'Circle: a ring of six, the runner holding the ball');
D.updateHud(); ok($('la').textContent === 'Pass' && !$('btnC').hidden, 'Circle runner: Pass to start, and Sprint');
s = play(st => { if (st.circle.stage === 'start' && st.circle.t > 0.2) inp.aPressed = true; });   // passes, never runs
ok(s.done && s.stars === 0 && s.circle.survived === 0 && T.M.stats.circleRounds === 1, 'Circle runner: a runner who never runs is beaten round one');
ok(JSON.stringify(X.result(s)) === JSON.stringify({ id:'circle', stars:0, success:false, role:'runner', skill:'stamina' }), 'Circle runner: the result names the role and trains stamina');
P.leave();
begin('circle', 'runner');
s = play(st => { const C = st.circle; if (C.stage === 'start') { if (Math.abs(X.circleStartE(C)) < 0.05) inp.aPressed = true; stick(0, 0); sprint(false); return; } const a = X.circleRunAt(C.R, C.s), b = X.circleRunAt(C.R, C.s + 0.25); stick((b.x - a.x)*9, (b.y - a.y)*9); sprint(C.s > C.L*0.45); });
ok(s.done && s.circle.survived === X.CIRCLE.rounds && s.stars === 3, 'Circle runner: a pass to the chest, the thumb going round with the run and Sprint on the second half survive all five rounds');
ok(s.circle.R === X.CIRCLE.r0 + X.CIRCLE.grow*(X.CIRCLE.rounds - 1), 'Circle: the ring grows a metre a round');
for (let r = 1; r <= 5; r++) ok(X.circleRadius('runner', r) === 4 + r && X.circleRadius('passer', r) === 10 - r, `Circle round ${r}: the Runner's ring is ${4 + r} m and the Passer's ${10 - r} m`);
P.leave();
begin('circle', 'runner');
s = play(st => { const C = st.circle; if (C.stage === 'start') { if (C.t > 0.2) inp.aPressed = true; stick(0, 0); return; } const a = X.circleRunAt(C.R, C.s), b = X.circleRunAt(C.R, C.s + 0.25); stick((b.x - a.x)*9, (b.y - a.y)*9); });
ok(s.done && s.circle.survived >= 2 && s.circle.survived < X.CIRCLE.rounds, 'Circle runner: without Sprint the late rounds are lost');
P.leave();
begin('circle', 'passer');
D.updateHud(); ok($('btnC').hidden && $('la').textContent === 'Pass', 'Circle passer: Pass, no Sprint');
s = play(st => { const C = st.circle; if (C.stage === 'start') { if (C.t > 0.2) inp.aPressed = true; return; } if (C.hold && Math.abs(C.hold.t - C.hold.tc) < T.STEP/2 + 1e-9) inp.aPressed = true; });
ok(s.done && s.circle.survived === X.CIRCLE.rounds && s.stars === 3 && T.M.stats.circlePerfect > 0 && !T.M.stats.circleEarly, 'Circle passer: tapping on the gold every time beats the runner every round');
ok(X.result(s).role === 'passer' && X.result(s).skill === 'handling', 'Circle passer: trains handling');
P.leave();
begin('circle', 'passer');
s = play(st => { const C = st.circle; if (C.stage === 'start') { if (C.t > 0.2) inp.aPressed = true; return; } if (Math.round(st.elapsed*60) % 6 === 0) inp.aPressed = true; });
ok(s.done && s.stars === 0 && T.M.stats.circleEarly > 0, 'Circle passer: mashing Pass is early every time and loses');
P.leave();

// ---- Cones
begin('cones');
s = P.state();
ok(s.space && T.M.players.length === 1 && s.cones.cones.length === X.CONES.gates.length*2 + 1 && T.M.ball.x < 0, 'Cones: a runner, eight gates and a flag, no ball');
const route = (() => { const K = X.CONES; return [...K.gates.slice(0, K.out).map(([x, y]) => [x + 0.5, y]), [K.turn[0] + 2, K.turn[1] - 3], [K.turn[0] + 2, K.turn[1] + 2], ...K.gates.slice(K.out).map(([x, y]) => [x - 0.5, y]), [K.line - 3, 46]]; })();
const conesBot = (sp, skip) => { let i = 0; return st => { const me = st.cones.me; while (skip && skip.includes(i)) i++; const [tx, ty] = route[Math.min(i, route.length - 1)], dx = tx - me.x, dy = ty - me.y, d = Math.hypot(dx, dy); if (d < 1.2 && i < route.length - 1) i++; stick(dx/d, dy/d); sprint(sp && i > X.CONES.out + 1); }; };
s = play(conesBot(true));
ok(s.done && s.cones.pen === 0 && s.stars === 3 && T.M.stats.drillSprints > 0, 'Cones: a clean run, sprinting the straight back, is three stars');
const fast = s.elapsed;
P.leave();
begin('cones');
s = play(conesBot(false));
ok(s.done && s.cones.pen === 0 && s.elapsed > fast + 0.3 && s.stars === 2, 'Cones: the same run without Sprint is slower: the meter matters');
P.leave();
begin('cones');
s = play(conesBot(true, [1]));                             // cuts out the second gate
ok(s.done && s.cones.pass[1] === -1 && s.cones.pen >= X.CONES.miss && T.M.stats.conesMiss >= 1, 'Cones: a missed gate costs two seconds');
P.leave();
begin('cones');
s = P.state(); { const c = s.cones.cones[0]; s.cones.me.x = c.x - 0.2; s.cones.me.y = c.y; T.update(T.STEP); }
ok(s.cones.pen === X.CONES.hit && s.cones.hit.size === 1, 'Cones: a clipped cone costs a second');
s = play(() => {});
ok(s.done && s.stars === 0 && $('pr-feedback').textContent === 'Out of Time', 'Cones: standing still runs out of time, no star');
P.leave();

// ---- Tackling
const tackleBot = o => { let at = null; return st => {
  const Tk = st.tackle, me = Tk.me;
  if (Tk.stage === 'approach') { const dy = Tk.lane + (o.off || 0) - me.y; stick(0, Math.abs(dy) > 0.15 ? Math.max(-1, Math.min(1, dy*0.7)) : 0); hold(false); at = null; return; }
  if (Tk.stage === 'head') { stick(o.head === 'wrong' ? Tk.drift : o.head === 'none' ? 0 : Tk.safe, 0); hold(false); return; }
  if (Tk.stage === 'side') { const e = o.h - Tk.h; stick(0, Math.abs(e) > 0.03 ? -Math.sign(e) : 0); if (at == null) at = o.d; hold(o.tap ? Tk.d > at && Tk.d < at + 0.1 : Tk.d > at); return; }
  stick(0, 0);
  if (Tk.stage === 'squeeze' && o.squeeze) { if (Math.round(Tk.t*60) % 7 === 0) { hold(false); inp.aPressed = true; } } else hold(false);
}; };
begin('tackle');
s = P.state();
ok(s.space && T.M.players.length === 2 && s.tackle.ru.team === 1 && T.M.ball.carrier === s.tackle.ru && Math.abs(s.tackle.lane - X.TACKLE.at[1]) >= X.TACKLE.lane[0], 'Tackling: one runner, coming down a lane off yours');
s = play(tackleBot({ h:0.4, d:1.8, squeeze:true }));
ok(s.done && s.tackle.made === X.TACKLE.reps && s.stars === 3 && s.tackle.results.every(Boolean), 'Tackling: set, thighs, on the gold with power, then squeeze: five good reps, three stars');
ok(Object.values(s.tackle.marks).every(m => m.ok) && s.tackle.marks.height.word === 'Height' && s.tackle.marks.head.word === 'Head', 'Tackling: every element is named right');
P.leave();
const firstFail = o => { begin('tackle'); const bot = tackleBot(o); let n = 0; while (P.state().tackle.stage !== 'show' && n < 1200) { bot(P.state()); T.update(T.STEP); n++; } letGo(); const st = P.state(); const r = { marks:st.tackle.marks, good:st.tackle.results[0], made:st.tackle.made }; P.leave(); return r; };
let r = firstFail({ h:0.75, d:1.8, squeeze:true });
ok(r.good === false && r.marks.height.word === 'Too High' && r.marks.height.ok === false && r.made === 0, 'Tackling: too high is a fail even with the rest right (the safety point)');
r = firstFail({ h:0.15, d:1.8, squeeze:true });
ok(r.good === false && r.marks.height.word === 'Too Low', 'Tackling: too low and he steps out');
r = firstFail({ h:0.4, d:3.4, squeeze:true });
ok(r.good === false && r.marks.time.word === 'Early', 'Tackling: letting go before the gold is Early');
r = firstFail({ h:0.4, d:1.8, tap:true, squeeze:true });
ok(r.good === false && r.marks.power.word === 'Weak', 'Tackling: a quick tap has no power');
r = firstFail({ h:0.4, d:1.8, squeeze:false });
ok(r.good === false && r.marks.squeeze.word === 'Loose', 'Tackling: no squeeze and he breaks free');
r = firstFail({ h:0.4, d:1.8, squeeze:true, head:'wrong' });
ok(r.good === false && r.marks.head.word === 'Wrong Side' && r.marks.height.ok === true && r.made === 0, 'Tackling: the head on the wrong side is a fail even with the rest right (the second safety point)');
r = firstFail({ h:0.4, d:1.8, squeeze:true, head:'none' });
ok(r.good === false && r.marks.head.word === 'No Side', 'Tackling: no head side chosen in time is a fail too');
r = firstFail({ h:0.4, d:1.8, squeeze:true, off:3 });
ok(r.good === false && r.marks.pos.word === 'Off Line' && r.marks.height.ok === null, 'Tackling: out of his path, Position fails and nothing else is reached');
{ // a young child on a keyboard, a D-pad or a stick pushed all the way: steers the bracket by its colour, seeing it 0.4 s late, lets go mid-gold and taps Squeeze
  const lag = Math.round(0.4/T.STEP), K = X.TACKLE; let seen = [], greenAtGold = 0, gold = 0;
  begin('tackle');
  s = play(st => {
    const Tk = st.tackle, me = Tk.me;
    if (Tk.stage === 'approach') { seen = []; const dy = Tk.lane - me.y; stick(0, Math.abs(dy) > 0.15 ? Math.max(-1, Math.min(1, dy*0.7)) : 0); hold(false); return; }
    if (Tk.stage === 'head') { seen.push(0); stick(seen.length > lag ? Tk.safe : 0, 0); hold(false); return; }
    if (Tk.stage === 'side') {
      seen.push(Tk.h); const h = seen[Math.max(0, seen.length - 1 - lag)];
      stick(0, h > K.height[1] ? 1 : h < K.height[0] ? -1 : 0); hold(Tk.d > (K.zone[0] + K.zone[1])/2);
      if (Tk.d <= K.zone[1]) { gold++; if (Tk.h >= K.height[0] && Tk.h <= K.height[1]) greenAtGold++; }
      return;
    }
    stick(0, 0);
    if (Tk.stage === 'squeeze') { if (Math.round(Tk.t*60) % 12 === 0) { hold(false); inp.aPressed = true; } } else hold(false);
  });
  ok(s.done && gold > 0 && greenAtGold === gold && s.tackle.made === X.TACKLE.reps && s.stars === 3, 'Tackling: a child steering at full deflection with a 0.4 s reaction holds the bracket in the green through the gold, every rep (' + greenAtGold + ' of ' + gold + ' frames, ' + s.tackle.made + ' good)');
  P.leave();
}
begin('tackle'); s = play(() => {});
ok(s.done && s.stars === 0 && s.tackle.made === 0, 'Tackling: doing nothing earns no star');
ok(X.result(s).skill === 'power', 'Tackling trains power');
P.leave();

// ---- Kicking
begin('kick');
ok(T.M.phase === 'cut' && T.M.cut.kind === 'goal' && T.M.wind.mph === 0, 'Kicking: the first kick is close and calm');
const kickXs = [], winds = [];
s = play(st => { const c = T.M.cut; if (c && c.kind === 'goal') { if (!kickXs.length || kickXs[kickXs.length - 1] !== c.g) { kickXs.push(c.g); winds.push(T.M.wind.mph); } H.kickBot(c); } });
ok(s.done && s.kick.shots.length === X.KICKS.spots.length && s.stars === X.starsOf(s.kick.made, X.KICKS.stars) && $('pr-feedback').textContent === s.kick.made + ' of 5 Kicks', 'Kicking: five kicks, stars by kicks made');
ok(winds.length === 5 && winds.every((w, i) => !i || w > winds[i - 1]) && X.KICKS.spots.every((p, i) => !i || (110 - p[0]) + Math.abs(p[1] - 35) > (110 - X.KICKS.spots[i - 1][0]) + Math.abs(X.KICKS.spots[i - 1][1] - 35)), 'Kicking: each kick is further out and windier');
P.leave();
begin('kick');
s = play(() => {}, 200);
ok(!s.done && s.kick.shots.length === 0, 'Kicking: a kick waits for the kicker');
s.elapsed = s.limit; T.update(T.STEP);
ok(s.done && s.stars === 0, 'Kicking: out of time with none made is no star');
P.leave();

// ---- Driving
begin('scrum');
ok(T.M.phase === 'cut' && T.M.cut.kind === 'scrum' && T.M.cut.feed === 0, 'Driving: our own scrum close-up');
const inGreen = () => { const c = T.M.cut; stick(0, 0); if (c && c.kind === 'scrum' && c.shape != null) { const B = X.DRIVE.shape.band; stick(0, c.shape > B[1] - 0.06 ? 1 : c.shape < B[0] + 0.06 ? -1 : 0); } };
s = play(() => { H.scrumBot(0, 7, 1); inGreen(); });
ok(s.done && s.drive.won === 3 && s.stars === 3 && X.result(s).skill === 'power', 'Driving: low in the green, a push on Set and fast taps win all three drives');
P.leave();
begin('scrum');
s = play(() => { H.scrumBot(0, 7, 1); stick(0, 0); });
ok(s.done && s.drive.won <= 1 && s.stars <= 1, 'Driving: the same taps and hit, standing up out of the green, win no more than one (' + s.drive.won + ')');
P.leave();
begin('scrum');
s = play(() => {});
ok(s.done && s.drive.won === 0 && s.stars === 0 && s.drive.res.length === 3, 'Driving: no push wins nothing');
ok($('m-pen').hidden === true && !T.M.set, 'Driving: no penalty card or restart follows a drive');
P.leave();

// ---- the open-play scenarios: stars by how quickly
begin('defend');
T.contact.tackle(T.M.ball.carrier, T.sides.ctrlOf(0));
ok(P.state().done && !P.state().won && P.state().stars === 0, 'Defend: a tackle without the switch is no star');
P.leave();
begin('defend');
{ const tgt = T.contact.switchTarget(0); T.sides.setCtrl(0, tgt); T.update(T.STEP); T.contact.tackle(T.M.ball.carrier, tgt); }
ok(P.state().done && P.state().won && P.state().stars === 3, 'Defend: a quick switch and tackle is three stars');
P.leave();

// ---- every drill draws and labels its buttons without error, its close-ups included
D.view(844, 390);
for (const d of X.DRILLS) {
  let threw = null, drew = 0;
  globalThis.__ctxSpy = () => { drew++; };
  try {
    begin(d.id, d.roles ? 'passer' : null);
    for (let i = 0; i < 400 && !P.state().done; i++) {
      if (d.id === 'tackle' && P.state().tackle.stage === 'approach') { const Tk = P.state().tackle; Tk.me.y = Tk.lane; Tk.me.vx = Tk.me.vy = 0; }
      if (d.id === 'circle' && P.state().circle.stage === 'start') inp.aPressed = true;
      T.update(T.STEP); if (i % 20 === 0) { D.render(1/60); D.updateHud(); }
    }
  } catch (e) { threw = e; }
  globalThis.__ctxSpy = null;
  ok(!threw && drew > 0, d.id + ': draws and updates its buttons' + (threw ? ' (' + threw.message + ')' : ''));
  letGo(); P.leave();
}
begin('tackle'); { const Tk = P.state().tackle; let seen = new Set(), threw = null, alone = null;
  try { for (let i = 0; i < 900; i++) { if (Tk.stage === 'approach') { Tk.me.y = Tk.lane; Tk.me.vx = Tk.me.vy = 0; } stick(Tk.stage === 'head' ? Tk.safe : 0, 0); if (Tk.stage === 'side') Tk.h = 0.4; hold(Tk.stage === 'side' && Tk.d > 1.8); if (Tk.stage === 'squeeze') inp.aPressed = true; T.update(T.STEP); seen.add(Tk.stage); D.render(1/60); D.updateHud(); if (Tk.stage === 'side' && alone == null) alone = $('la').textContent === 'Tackle' && $('btnB').hidden && $('btnC').hidden; } } catch (e) { threw = e; }
  ok(alone === true, 'Tackling: Tackle alone in the close-up');
  ok(!threw && ['head', 'side', 'lunge', 'squeeze', 'down', 'show'].every(k => seen.has(k)), 'Tackling: the front-on look and the side-on close-up draw through every stage' + (threw ? ' (' + threw.message + ')' : '')); }
letGo(); P.leave();
for (const [W, Ht] of [[844, 390], [667, 375]]) {           // where a thumb rests on the touch stick: the ring at stickRest, 62px round
  const rest = D.stickRest(W, Ht, { t:0, r:0, b:0, l:0 }), ring = { x0:rest.x - 62, y0:rest.y - 62, x1:rest.x + 62, y1:rest.y + 62 };
  const clear = b => b.x1 < ring.x0 - 4 || b.x0 > ring.x1 + 4 || b.y1 < ring.y0 - 4 || b.y0 > ring.y1 + 4;
  D.view(W, Ht); begin('cones');
  // the camera runs with you: the finish is on screen when you reach it, and the thumb has to be clear of it then
  { const Q = P.state().cones, K = X.CONES, y = K.gates[K.gates.length - 1][1]; Q.me.x = K.line + 0.5; Q.me.y = y; for (let i = 0; i < 400; i++) D.render(1/60);
    const cam = T.behind.BV.cam, strip = []; for (let i = 0; i < 10; i++) { const a = D.pr(cam, K.line - 0.5, y - 5 + i, 0), b = D.pr(cam, K.line + 0.5, y - 4 + i, 0); strip.push({ x0:Math.min(a.sx, b.sx), y0:Math.min(a.sy, b.sy), x1:Math.max(a.sx, b.sx), y1:Math.max(a.sy, b.sy) }); }
    ok(strip.every(clear), 'Cones: the chequered finish is clear of the resting touch stick at ' + W + 'x' + Ht + ' as you reach it'); }
  P.leave();
  { const asBox = b => ({ x0:b.x, y0:b.y, x1:b.x + b.w, y1:b.y + b.h }), gauge = X.driveGaugeBox(W, Ht), chest = X.circleChestBox(W, Ht);
    ok(clear(asBox(gauge)), 'Driving: the body shape gauge sits clear of the resting touch stick at ' + W + 'x' + Ht);
    ok(clear(asBox(chest)), 'Circle: the catcher in the corner sits clear of the resting touch stick at ' + W + 'x' + Ht); }
  const m = X.tackleMeterBox(W, Ht), box = { x0:m.x - 2, y0:m.y - 4, x1:m.x + m.w + 2, y1:m.y + m.h + 4 }, chips = Math.max(96, Ht*0.27) + 28, head = Ht*0.8 - 0.4*Ht*0.96;
  ok(clear(box) && box.y0 > chips && box.y1 < head, 'Tackling: the power meter sits between the chips and his head, clear of the resting touch stick at ' + W + 'x' + Ht);
  begin('tackle'); { const Tk = P.state().tackle; Tk.stage = 'side'; Tk.t = 0; Tk.d = X.TACKLE.side; }
  let drawn = false; globalThis.__ctxSpy = (k, a) => { if (k === 'fillRect' && a[0] === m.x - 2 && a[1] === m.y - 2 && a[2] === m.w + 4) drawn = true; };
  D.render(1/60); globalThis.__ctxSpy = null;
  ok(drawn, 'Tackling: the close-up draws its power meter in that box at ' + W + 'x' + Ht);
  P.leave();
}
D.view(844, 390);
begin('cones'); D.updateHud();
ok(!$('btnC').hidden && $('btnA').hidden && $('btnB').hidden, 'Cones: Sprint alone');
ok((P.state().cones.pass.length === X.CONES.gates.length) && ($('dh-pips').innerHTML.match(/dh-pip/g) || []).length === X.CONES.gates.length && /ic-clock/.test($('dh-num').className), 'Cones: a pip a gate and the clock in the drill bar');
P.leave();

// ---- onDone: a caller's drill hands back once, after the settings are restored
let calls = [];
const onDone = res => calls.push({ res, settings:JSON.stringify(D.settings()), practice:X.state(), home:!$('s-home').hidden });
P.start('egg', { onDone });
ok($('pr-select').textContent === 'Back to Career' && $('pr-row').classList.contains('one') && $('pr-eyebrow').textContent === 'Training', 'onDone: the ready card leaves with Back to Career when the caller names nothing else, under the caller\'s Training (never Skills Mini Games)');
$('pr-retry').click();
s = play(meeter);
ok(s.done && $('pr-next').hidden && $('pr-select').textContent === 'Back to Career' && calls.length === 0, 'onDone: the result card offers Try Again and Back to Career, no Next Drill');
$('pr-retry').click(); ok(P.state() && P.state().ready && P.state().opts && P.state().opts.onDone === onDone, 'onDone: Try Again keeps the caller');
$('pr-retry').click();
s = play(meeter);
const shown = s.stars;
$('pr-select').click(); $('pr-select').click();
ok(calls.length === 1 && calls[0].res.id === 'egg' && calls[0].res.stars === shown && Number.isInteger(calls[0].res.stars) && calls[0].res.success === true && calls[0].res.skill === 'handling' && !('quit' in calls[0].res), 'onDone fires once, with the stars shown');
ok(calls[0].settings === originalSettings && calls[0].practice === null && calls[0].home, 'onDone runs after the settings are restored, with the home screen up');
const catcher = meeter;
calls = [];
P.start('egg', { onDone, leaveLabel:'Back to the Club' });
ok($('pr-select').textContent === 'Back to the Club', 'onDone: a caller may name its own way back');
$('pr-retry').click(); s = play(catcher); const won = s.stars;
$('pr-retry').click();                                     // Try Again, the card's primary
ok(won === 3 && P.state().ready && !P.state().done && calls.length === 0, 'onDone: Try Again after a finished run opens the ready card');
$('pr-select').click();                                    // and leaving from it, unstarted
ok(calls.length === 1 && calls[0].res.stars === won && calls[0].res.success === true && !('quit' in calls[0].res), 'onDone: a finished run survives Try Again then leaving from the ready card');
calls = [];
P.start('egg', { onDone }); $('pr-retry').click(); s = play(catcher);
$('pr-retry').click(); $('pr-retry').click(); s = play(() => {});   // three stars, then a run standing still
const worse = s.stars;
$('pr-retry').click(); $('pr-retry').click(); T.update(T.STEP); D.pause(); $('pz-quit').click(); $('pz-quit').click();   // and a third run quit part way
ok(worse < 3 && calls.length === 1 && calls[0].res.stars === 3 && !('quit' in calls[0].res), 'onDone: the visit\'s best finished run is reported, whatever came after it');
calls = [];
P.start('circle', { onDone }); $('pr-runner').click(); s = play(st => { if (st.circle.stage === 'start' && st.circle.t > 0.2) inp.aPressed = true; });   // a runner who never runs
$('pr-retry').click(); $('pr-passer').click();
s = play(st => { const C = st.circle; if (C.stage === 'start') { if (C.t > 0.2) inp.aPressed = true; return; } if (C.hold && Math.abs(C.hold.t - C.hold.tc) < T.STEP/2 + 1e-9) inp.aPressed = true; });
$('pr-select').click();
ok(calls.length === 1 && calls[0].res.stars === 3 && calls[0].res.role === 'passer' && calls[0].res.skill === 'handling', 'onDone: the best run carries its own role and skill');
calls = [];
P.start('circle', { onDone }); $('pr-passer').click(); D.pause(); $('pz-quit').click(); $('pz-quit').click();
ok(calls.length === 1 && calls[0].res.quit === true && calls[0].res.stars === 0 && calls[0].res.role === 'passer' && calls[0].res.skill === 'handling' && calls[0].settings === originalSettings, 'onDone: Pause then Quit hands back once, quit and no stars');
calls = [];
P.start('tackle', { onDone }); D.keyDown({ code:'Escape', repeat:false, preventDefault() {} });
ok(calls.length === 1 && calls[0].res.quit === true && calls[0].res.skill === 'power' && !X.state(), 'onDone: Escape on the ready card hands back once');
P.start('cones'); ok(!P.state().opts && $('pr-select').textContent === 'Back to Skills' && $('pr-eyebrow').textContent === 'Skills Mini Games', 'without opts the card reads Skills Mini Games and goes Back to Skills');
$('pr-select').click(); ok(!X.state() && !$('s-home').hidden && calls.length === 1, 'Back to Skills returns to the drill picker (the home\'s Skills Mini Games) and calls nobody');

// ---- isolation
ok(writes === 0, 'no drill writes the browser save');
ok(JSON.stringify(D.settings()) === originalSettings, 'every exit restores the settings (tutorial memory and played count included)');
ok(JSON.stringify(T.teams.champ()) === originalChamp && JSON.stringify(T.teams.custom()) === originalCustom, 'no drill touches the championship or the teams');
{ // an old save loads as before and gains no field from the drills
  const memory = {}; localStorage.getItem = k => memory[k] ?? null; localStorage.setItem = (k, v) => { memory[k] = String(v); };
  const old = { settings:{ half:2, diff:2, sound:false, hints:false, coach:false, played:7 }, champ:null, custom:[], champHistory:[], seasonSerial:3 };
  T.locker.set(T.locker.fresh());                         // and the Locker back to empty, as an old save's is
  memory['tryline.v1'] = JSON.stringify(old); T.teams.load();
  const before = JSON.stringify(D.settings());
  P.start('egg'); $('pr-retry').click(); play(() => {}, 300); P.leave();
  ok(JSON.stringify(D.settings()) === before && D.settings().half === 2 && D.settings().played === 7, 'an old save loads, and a drill leaves it as it was');
  T.teams.save(); const saved = JSON.parse(memory['tryline.v1']);
  ok(Object.keys(saved).sort().join() === 'career,champ,champHistory,custom,importLeague,seasonSerial,settings' && !Object.keys(saved).some(k => /drill|practice|training/i.test(k)) && saved.settings.half === 2 && saved.seasonSerial === 3, 'the save round-trips with no drill field added (career and importLeague are the career\'s and the import\'s own)');
  localStorage.setItem = () => writes++;
}

// ---- matches, AI v AI and the demo never reach the drills
ok(/if \(!\(practice && practice\.space\)\) matchUpdate\(dt\);/.test(src) && /if \(drill\) drillDrawScreen\(\);/.test(src) && /const drill = !!practice/.test(src) && /if \(practice && practice\.cam\)/.test(src), 'the engine hooks are gated on practice');
ok(!/cone/i.test(src.slice(src.indexOf('function collide()'), src.indexOf('function collide()') + 2500)), 'cones are not in the match collision');
T.newMatch(0, 1, { halfLen:240, diff:1, auto:true, headless:true });
for (let i = 0; i < 600; i++) T.update(T.STEP);
ok(!X.state() && T.M.phase !== 'drill' && !T.M.practice, 'a headless match runs its own flow with no drill');
const sim = T.simulate(2, 120, 1);
ok(sim.length === 2 && sim.every(m => m.steps > 1000), 'AI v AI still runs to full time');

console.log(failed ? `Drills: ${passed} passed, ${failed} failed` : `Drills: ${passed} assertions passed`);
process.exitCode = failed ? 1 : 0;
