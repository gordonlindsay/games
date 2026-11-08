// Real match/input paths for the isolated practice scenarios.
process.env.SEED ??= '11';
const { T } = await import('./harness.mjs');
const D = T.debug, P = T.practice, $ = id => document.getElementById(id);
let passed = 0;
function ok(test, message) { if (!test) throw Error(message); passed++; }
const key = (code, down = true) => T.onKey({ code, repeat:false, preventDefault() {} }, down);
function tick(n = 1) { for (let i=0; i<n; i++) T.update(T.STEP); }
function start(id) { P.start(id); ok(P.state().ready && T.M.paused, id + ' waits for Start'); $('pr-retry').click(); }
const original = JSON.stringify(D.settings()), originalChamp = JSON.stringify(T.teams.champ());
let writes = 0; localStorage.setItem = () => writes++;
T.locker.state().drills = T.drills.DRILLS.map(d => d.id);   // the Locker's Star Pupil writes the save once, after a drill's first three stars (tools/locker.mjs): every drill counted already keeps that write out of these checks
start('defend');
const initial = T.sides.ctrlOf(0), target = T.contact.switchTarget(0);
ok(target && target !== initial && target.x < T.M.ball.carrier.x, 'Switch points to goal-side cover');
key('KeyK'); tick(); key('KeyK', false);
ok(T.sides.ctrlOf(0) === target && P.state().switched, 'real Switch input changes defender');
// Real tackle resolver must require the switched defender, not an automatic teammate.
T.contact.tackle(T.M.ball.carrier, target);
ok(P.state().done && P.state().won, 'cover tackle completes drill');
D.resume(); ok(T.M.paused, 'result cannot resume via pause shortcut');
key('Escape'); ok(!P.state() && !$('s-practice').hidden, 'Escape returns from result to drill selection');
ok(JSON.stringify(D.settings()) === original, 'selection restores all settings');
start('pass');
const carrier = T.M.ball.carrier;
key('KeyD'); tick(10);
key('KeyJ'); tick(2); key('KeyJ', false);
for (let i=0; i<90 && T.M.ball.carrier === carrier && !P.state().done; i++) tick();
ok(T.M.stats.passes > 0, 'real Pass input throws a pass');
for (let i=0; i<180 && !P.state().completedPass && !P.state().done; i++) tick();
ok(P.state().completedPass, 'pass caught by supporting runner counts');
key('KeyD', false);
// Move the ball carrier to just before the line; crossing and try still use update().
T.M.ball.carrier.x = 109.95; T.M.ball.carrier.y = 42; key('KeyD');
for (let i=0; i<30 && !P.state().done; i++) tick(); key('KeyD', false);
ok(P.state().done && P.state().won, 'passing then crossing try line completes drill');
$('pr-retry').click(); ok(P.state().ready && P.state().elapsed === 0, 'retry returns to untimed ready card');
$('pr-retry').click(); tick(1500);
ok(P.state().done && !P.state().won, 'idle drill ends with retry feedback');
start('kick');
ok(T.M.phase === 'cut' && T.M.cut.kind === 'goal', 'conversion uses existing close-up');
ok(T.M.wind.mph === 0, 'first kick practice is calm');
const g = T.M.goal;
// Use the real hold/release path, choose a power/aim from the existing geometry.
g.aim = T.kick.aimFor(g, g.ctr);
tick(30); key('KeyJ');
const hold = Math.round(g.ctr*g.fill/T.STEP);
tick(hold); key('KeyJ', false);
for (let i=0; i<900 && P.state().kick.shots.length < 1; i++) tick();
ok(g.judged, 'hold/release judged a real conversion');
ok(P.state().kick.shots.length === 1 && P.state().kick.shots[0] === !!g.ok && P.state().kick.made === (g.ok ? 1 : 0), 'conversion outcome feeds the Kicking count');
ok(!P.state().done && T.M.cut && T.M.cut.kind === 'goal' && T.M.goal !== g && T.M.wind.mph > 0, 'the next kick opens further out, with wind');
P.leave();
ok(!P.state() && $('m-practice').hidden && $('m-pause').hidden, 'leave clears practice overlays');
ok(JSON.stringify(D.settings()) === original, 'all exits restore settings');
ok(JSON.stringify(T.teams.champ()) === originalChamp, 'championship untouched');
ok(writes === 0, 'practice never writes the browser save');
start('pass'); D.pause(); $('pz-quit').click(); $('pz-quit').click();
ok(!P.state() && $('m-pause').hidden, 'pause then Quit restores practice state');
ok(JSON.stringify(D.settings()) === original && writes === 0, 'quit restores settings without save');
console.log('Practice: ' + passed + ' assertions passed');
