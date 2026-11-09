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
const names = { tag:'Tag Chase', back:'Ball Back', egg:'Bouncy Egg', circle:'Pass Around the Circle', tackle:'Tackling', cones:'Cones', kick:'Kicking', scrum:'Driving', defend:'Defend a Breakaway', pass:'Create a Gap' };
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

// ---- the Skills Mini Games as one set (the skills builder, at the PR #14 merge): the home's order, the contact three, Watch How on every
//      card, Next Game round all ten, and the skill each game hands a caller (the career's Train reads it)
{
  const CAREER = T.career.DRILL_SKILL;
  ok(JSON.stringify(ids) === JSON.stringify(['tag', 'egg', 'circle', 'cones', 'pass', 'kick', 'defend', 'tackle', 'scrum', 'back']), 'the ten in the home\'s order: the seven open games, then the contact three (' + ids + ')');
  ok(JSON.stringify(X.DRILLS.filter(d => d.contact).map(d => d.id)) === '["tackle","scrum","back"]', 'Tackling, Driving and Ball Back are the contact games, and only they');
  const seen = D.settings().drillSeen; D.settings().drillSeen = ids.slice();   // a first open plays Watch How before the card: these read the card
  const noWatch = ids.filter(id => { P.start(id); const good = P.state() && P.state().ready && !$('pr-watch').hidden && $('pr-eyebrow').textContent === 'Skills Mini Games' && $('pr-select').textContent === 'Back to Skills'; P.leave(); return !good; });
  ok(!noWatch.length, 'every game\'s ready card offers Watch How and Back to Skills, under Skills Mini Games (' + (noWatch.join(', ') || 'all ten') + ')');
  { P.start('tag'); const walk = []; for (let i = 0; i < 10; i++) { $('pr-next').click(); walk.push(P.state().id); } P.leave();
    ok(JSON.stringify(walk) === JSON.stringify(ids.slice(1).concat(['tag'])), 'Next Game goes round all ten in the home\'s order, then back to the first (' + walk + ')'); }
  const skill = {};
  for (const id of ids) for (const role of id === 'circle' ? ['runner', 'passer'] : [null]) {
    P.start(id, { onDone() {} }); $(role ? 'pr-' + role : 'pr-retry').click(); P.finish(true, 'Done', 2);
    const r = X.result(P.state()); skill[id + (role ? ':' + role : '')] = r.skill; P.leave();
  }
  ok(Object.entries(skill).every(([k, v]) => v === (k === 'circle:runner' ? 'stamina' : k === 'circle:passer' ? 'handling' : CAREER[k])) && Object.keys(skill).length === 11, 'every game hands a caller the skill the career trains with it, the circle Stamina as the Runner and Handling as the Passer (' + Object.entries(skill).map(([k, v]) => k + ' ' + v).join(', ') + ')');
  D.settings().drillSeen = seen;
}

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

// ---- Create a Gap and Defend a Breakaway: five rounds each, restaged in open play, stars by rounds won (the Circle's 1, 3 and 5)
{
  const RN = X.ROUNDS, line = n => (n === 5 ? 'All 5 Rounds' : n + (n === 1 ? ' Round' : ' Rounds'));
  const side = t => T.M.players.filter(p => p.team === t).length;
  const held = (n = 1) => { for (let i = 0; i < n; i++) T.update(T.STEP); }, hold1 = Math.ceil(X.ROUNDS.show/(T.STEP*X.PACE.live)) + 2;   // hold1: steps for the round's word to have its time
  const untilPlay = R => { let k = 0; while (R.stage !== 'play' && P.state() && !P.state().done && k++ < 600) T.update(T.STEP); return k; };
  ok(RN.n === 5 && JSON.stringify(RN.stars) === '[1,3,5]' && [0, 1, 2, 3, 4, 5].map(n => X.starsOf(n, RN.stars)).join() === '0,1,1,2,2,3', 'rounds: five a run, and stars by rounds won, as the Circle: one for 1, two for 3, three for all 5');
  ok(!('QUICK' in X) && !/drillQuickStars|drillPassStars|DRILL_QUICK/.test(training), 'no stars by time left in either game');
  // the rename: Create a Gap is the old id
  const gap = X.DRILLS.find(d => d.id === 'pass');
  ok(gap.name === 'Create a Gap' && gap.objective === 'Draw Your Defender, Then Pass' && isTitle(gap.objective) && !/Two-on-One|Two on One/.test(html.slice(html.indexOf('id="pr-grid"'), html.indexOf('</ul>', html.indexOf('id="pr-grownups"')))), 'Create a Two-on-One is Create a Gap on the same id (pass), its objective in Title Case, the old name gone from the cards and the grown-ups\' panel');
  { const w0 = writes, cr = T.career.create({ pos:'B', num:6, club:{ id:'TST', name:'Testers', kit:'#123456', trim:'#abcdef', pace:4, power:3, handling:4, kicking:3, stamina:3 } }); T.career.set(cr);
    const it = T.career.drills(cr).find(d => d.id === 'pass'), h0 = cr.skills.handling; cr.trained = false; T.career.trainDone({ id:'pass', stars:3 });
    ok(it && it.name === 'Create a Gap' && cr.skills.handling > h0, 'the career\'s Train lists Create a Gap on the id pass, and its stars still feed Handling (' + h0 + ' to ' + cr.skills.handling + ')'); T.career.set(null);
    writes = w0; }                                         // the career's own save, not a drill's: the isolation count below is the drills'
  { const L = T.locker, was = L.state(); L.set(L.clean({ drills:['pass', 'egg'] }));
    ok(L.state().drills.includes('pass') && L.count('star') === 2, 'an old save\'s three stars for pass are kept, and the Locker\'s Star Pupil still counts them');
    L.set(was); }
  // Create a Gap's line-ups: always one over, in lanes, each defender on one man
  const lineup = [[2, 1], [3, 2], [4, 3], [4, 3], [5, 4]], gotGap = [];
  P.start('pass');
  for (let n = 1; n <= 5; n++) { const G = P.state().gap; if (n > 1) X.gapRestage(n); gotGap.push(side(0) + 'v' + side(1));
    const lanes = G.lanes.map(p => p.y), free = G.lanes[G.lanes.length - 1];
    ok(side(0) === lineup[n - 1][0] && side(1) === lineup[n - 1][1] && G.marks.length === side(1) && lanes.every((y, k) => !k || Math.abs(lanes[k - 1] - y - X.GAP.lane) < 1e-9) && G.marks.every((d, k) => Math.abs(d.y - lanes[k]) < 1e-9 && d.x > G.lanes[0].x) && X.gapMark(free) === null && T.M.ball.carrier === G.lanes[0] && T.sides.ctrlOf(0) === G.lanes[0] && P.state().limit === X.GAP.rounds[n - 1].limit,
      'Create a Gap round ' + n + ' (' + X.GAP.rounds[n - 1].label + '): ' + lineup[n - 1].join(' on ') + ', a lane each, a defender in front of every man but the outside one, the ball with the inside man, its own clock'); }
  ok(gotGap.join() === '2v1,3v2,4v3,4v3,5v4' && X.GAP.rounds[3].rush > X.GAP.rounds[2].rush && X.GAP.rounds.every(r => isTitle(r.label)), 'Create a Gap: 2 on 1, 3 on 2, 4 on 3, 4 on 3 with quicker defenders, then 5 on 4, its labels Title Case (' + gotGap + ')');
  P.leave();
  // Defend a Breakaway's line-ups: the chase as before, then a longer start, a support runner, a quicker one, two cover men
  const want = [[2, 1], [2, 1], [2, 2], [2, 2], [3, 2]], gotDef = [];
  P.start('defend');
  for (let n = 1; n <= 5; n++) { const Dd = P.state().defend, r = X.DEFEND.rounds[n - 1]; if (n > 1) X.defendRestage(n); gotDef.push(side(0) + 'v' + side(1));
    ok(side(0) === want[n - 1][0] && side(1) === want[n - 1][1] && T.M.ball.carrier === Dd.cpu[0] && T.sides.ctrlOf(0) === Dd.own[0] && P.state().initialCtrl === Dd.own[0] && !P.state().switched && T.M.players.filter(p => p.team === 0).slice(1).every(p => p.x < T.M.ball.carrier.x) && Dd.own[0].x > T.M.ball.carrier.x && isTitle(r.label),
      'Defend round ' + n + ' (' + r.label + '): ' + want[n - 1].join(' against ') + ', the ring on the beaten man behind the ball, the cover goal-side'); }
  ok(gotDef.join() === '2v1,2v1,2v2,2v2,3v2' && X.DEFEND.rounds[3].pace > 0 && JSON.stringify(X.DEFEND.rounds[0]) === JSON.stringify({ label:'The Chase', run:[49, 35], beaten:[56, 35], cover:[[36, 39]] }), 'Defend: the chase as it always was (49, 56 and 36 across, as before), then the rest (' + gotDef + ')');
  P.leave();
  // Defend: a tackle without the Switch ends the run with nothing
  begin('defend');
  T.contact.tackle(T.M.ball.carrier, T.sides.ctrlOf(0)); held(hold1);
  ok(P.state().done && !P.state().won && P.state().stars === 0 && P.state().defend.R.lost === 'Switch First' && $('pr-feedback').textContent === '0 Rounds' && !$('pr-tip').hidden, 'Defend: a tackle without the Switch ends the run at 0 Rounds, no star, with a line on why');
  P.leave();
  // Defend, scripted through every round: the real Switch, then the real made-tackle path on whoever carries
  begin('defend');
  { const st = P.state(), Rd = st.defend.R; let held0 = null, card = null, early = null;
    for (let n = 1; n <= 5; n++) {
      if (n > 1) { const k = untilPlay(Rd); if (n === 2) card = card || k; }
      inp.bPressed = true; T.update(T.STEP);
      const q = T.sides.ctrlOf(0); ok(st.switched && q !== st.initialCtrl, 'Defend round ' + n + ': the Switch takes the ring off the beaten man');
      T.contact.tackle(T.M.ball.carrier, q);
      ok(Rd.won === n && !st.done && T.M.tags.some(t => t.text === 'Stopped'), 'Defend round ' + n + ': a switched tackle wins it, and says Stopped');
      if (n === 1) { const pos = JSON.stringify(T.M.players.map(p => [p.x, p.y])), e = st.elapsed; inp.aPressed = true; held(30);
        held0 = JSON.stringify(T.M.players.map(p => [p.x, p.y])) === pos && st.elapsed === e && Rd.stage === 'show' && st.space;
        held(Math.round(RN.show/(T.STEP*X.PACE.live)) - 28); early = Rd.stage === 'card' && Rd.round === 2 && $('pr-objective').textContent === 'Round 2' && $('pr-cue').textContent === X.DEFEND.rounds[1].label && !$('practice-cue').hidden && st.elapsed === 0; }
    }
    ok(held0, 'Defend: between rounds the world holds, and the round\'s clock with it');
    ok(early, 'Defend: then the next line-up under a Round 2 card naming it, on a full clock');
    ok(card > 10 && card < 120, 'Defend: the card stays up about a second, then play (' + card + ' steps)');
    held(hold1);
    ok(st.done && st.won && st.stars === 3 && $('pr-feedback').textContent === 'All 5 Rounds' && $('pr-result').textContent === 'Well Played', 'Defend: all five rounds won is three stars, and the card says All 5 Rounds'); }
  P.leave();
  // Defend: a still player loses round one to a try, and nothing comes of it
  begin('defend'); { const s = play(() => stick(0, 0)); ok(s.done && s.stars === 0 && s.defend.R.won === 0 && s.defend.R.lost === 'Try' && $('pr-feedback').textContent === '0 Rounds', 'Defend: doing nothing loses round one to a try: 0 Rounds'); } P.leave();
  // Defend: only the ringed man tackles, and the round's clock runs out to a loss
  begin('defend'); { const st = P.state(); X.defendRestage(5); st.defend.R.round = 5; const c = T.M.ball.carrier, still = T.M.players.filter(p => p.team === 0)[2]; still.x = c.x - 0.6; still.y = c.y; held(1);
    ok(!T.M.contact && !T.M.stats.ta1, 'Defend: a cover man left standing never tackles, even with the carrier on him'); }
  P.leave();
  begin('defend'); { const st = P.state(); st.elapsed = st.limit - 0.001; T.M.ball.carrier.x = 60; held(2); ok(st.defend.R.lost === 'Time Up' && st.space, 'Defend: the round\'s clock running out loses it'); } P.leave();
  // Create a Gap: an early pass loses round one at once; a drawn pass then the try wins it
  begin('pass');
  { const st = P.state(), G = st.gap; let n = 0; while (G.R.stage === 'play' && n++ < 400) { stick(1, 0); if (st.elapsed > 0.3) inp.aPressed = true; T.update(T.STEP); }
    ok(G.R.lost === 'Too Early' && T.M.tags.some(t => t.text === 'Too Early'), 'Create a Gap: a pass with the defender outside the ring is Too Early, there and then');
    held(hold1); ok(st.done && st.stars === 0 && $('pr-feedback').textContent === '0 Rounds' && /ring turns gold/.test($('pr-tip').textContent), 'Create a Gap: and the run ends at 0 Rounds, with a line on why'); }
  P.leave();
  const passer = at => { let who = null, round = 0; return st => { const G = st.gap, me = T.sides.ctrlOf(0), b = T.M.ball; if (G.R.round !== round) { round = G.R.round; who = null; } if (G.R.stage !== 'play' || !me) { stick(0, 0); return; } const d = X.gapMark(me); stick(1, 0); sprint(!d); if (d && b.state === 'held' && b.carrier === me && who !== me && Math.hypot(me.x - d.x, me.y - d.y) <= at) { inp.aPressed = true; who = me; } }; };
  H.reseed(7919); begin('pass');
  { const st = P.state(), G = st.gap, seen = [], drawn = [];
    const bot = passer(5); let n = 0;
    while (!st.done && n++ < 20000) { bot(st); const before = G.drawn.size; T.update(T.STEP); if (G.drawn.size > before) drawn.push(G.R.round); if (G.R.stage === 'play' && seen[seen.length - 1] !== G.R.round) seen.push(G.R.round); }
    letGo();
    ok(st.done && st.stars === 3 && G.R.won === 5 && $('pr-feedback').textContent === 'All 5 Rounds' && seen.join() === '1,2,3,4,5', 'Create a Gap, seeded: running at each man and passing once he is drawn wins all five rounds, three stars (' + G.R.won + ' rounds, ' + st.stars + ' stars)');
    ok(drawn.filter(r => r === 1).length === 1 && drawn.filter(r => r === 5).length === 4, 'Create a Gap: one drawn pass in 2 on 1, four in 5 on 4 (' + drawn.join() + ')'); }
  P.leave();
  // the drill bar: a pip a round and the round's clock
  begin('pass'); held(2); ok(($('dh-pips').innerHTML.match(/dh-pip/g) || []).length === 5 && /dh-pip now/.test($('dh-pips').innerHTML) && !$('dh-bar').hidden, 'both games show the Circle\'s five pips and the round\'s clock'); P.leave();
  // the result lines
  for (const n of [0, 1, 3, 5]) { begin('pass'); const st = P.state(); st.gap.R.won = n; st.gap.R.lost = n === 5 ? '' : 'Held'; st.gap.R.stage = 'show'; st.gap.R.t = 99; st.space = true; held(1);
    ok($('pr-feedback').textContent === line(n) && st.stars === X.starsOf(n, RN.stars), 'the result card names the rounds: ' + line(n)); P.leave(); }
}

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
