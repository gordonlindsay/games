// Watch How and the Training Ground's pace: every demo succeeds inside its cap at scaled speed, the ghost matches the input,
// nothing is recorded, a skip at any stage cleans up, a fresh run is the run it would have been, and the seen flag persists.
process.env.SEED ??= '31';
import fs from 'node:fs';
const H = await import('./harness.mjs');
const { T } = H;
const P = T.practice, X = T.drills, D = T.debug, $ = id => document.getElementById(id), inp = T.input, STEP = T.STEP;
let passed = 0, failed = 0;
function ok(test, message) { if (test) passed++; else { failed++; console.log('FAIL ' + message); } }
const ids = X.DRILLS.map(d => d.id), S = () => P.state(), demo = () => S() && S().demo;
const unsee = () => { D.settings().drillSeen = []; };
const seeAll = () => { D.settings().drillSeen = ids.slice(); };
const key = (code, down = true, repeat = false) => T.onKey({ code, repeat, preventDefault() {} }, down);
const clean = () => inp.src.a === 0 && inp.src.b === 0 && inp.src.c === 0 && !inp.aDown && !inp.bDown && !inp.cDown && !inp.aPressed && !inp.bPressed && !inp.cPressed && inp.jx === 0 && inp.jy === 0 && inp.keys.size === 0 && inp.stickId === null;
const ghostOff = () => !$('knob').classList.contains('lit') && !$('stick').classList.contains('on') && !$('knob').style.transform && ['btnA', 'btnB', 'btnC'].every(b => !$(b).classList.contains('lit'));
const overlayOff = () => $('drill-demo').hidden && $('demo-skip').hidden && !$('controls').classList.contains('demo');
function ghostMatches() {
  const m = /translate\((-?[\d.e-]+)px,(-?[\d.e-]+)px\)/.exec($('knob').style.transform || ''), moved = Math.hypot(inp.jx, inp.jy) > 0.01;
  const R = 52, x = m ? +m[1]/R : 0, y = m ? +m[2]/R : 0;
  return (moved ? Math.abs(x - inp.jx) < 1e-6 && Math.abs(y - inp.jy) < 1e-6 && $('knob').classList.contains('lit') : !m && !$('knob').classList.contains('lit'))
    && $('btnA').classList.contains('lit') === inp.aDown && $('btnB').classList.contains('lit') === inp.bDown && $('btnC').classList.contains('lit') === inp.cDown;
}
function watch(max = 9000) {                               // drive a demo to its end, a real step at a time, checking every step
  const seen = { a:0, b:0, c:0, stick:0, steps:0, ghostBad:0, caps:new Set(), rateLo:9, rateHi:0, doneBad:0, pauseBad:0, sourceBad:0, aHeld:[] };
  while (demo() && seen.steps < max) {
    T.update(STEP); seen.steps++;
    if (!demo()) break;
    if (!ghostMatches()) seen.ghostBad++;
    if (S().done || S().stars || S().best) seen.doneBad++;
    if (T.M.paused) seen.pauseBad++;
    if (inp.src.a & ~X.DEMO.bit || inp.src.b & ~X.DEMO.bit || inp.src.c & ~X.DEMO.bit) seen.sourceBad++;
    if (inp.aDown) seen.a++; if (inp.bDown) seen.b++; if (inp.cDown) seen.c++; if (Math.hypot(inp.jx, inp.jy) > 0.01) seen.stick++;
    if ($('demo-cap').textContent) seen.caps.add($('demo-step').textContent + ': ' + $('demo-cap').textContent);
    const r = demo().rate; seen.rateLo = Math.min(seen.rateLo, r); seen.rateHi = Math.max(seen.rateHi, r);
  }
  return seen;
}
const memory = {}; let writes = 0;
localStorage.getItem = k => memory[k] ?? null; localStorage.setItem = (k, v) => { memory[k] = String(v); writes++; };
const savedSeen = () => { const j = memory['tryline.v1']; return j ? JSON.parse(j).settings.drillSeen : undefined; };

// ---- the pace lever: every kind of drill runs on it, a match never does
ok(X.PACE.live === 0.75, 'one lever: live drills run at 0.75');
seeAll();
for (const d of X.DRILLS) {
  P.start(d.id); if (d.roles) $('pr-runner').click(); else $('pr-retry').click();
  ok(X.rate() === X.PACE.live, d.id + ': a live drill reads the lever');
  const e0 = S().elapsed; for (let i = 0; i < 60; i++) T.update(STEP);
  ok(Math.abs(S().elapsed - e0 - 60*STEP*X.PACE.live) < 1e-9, d.id + ': sixty steps are 0.75 of a second on the drill\'s clock (' + (S().elapsed - e0).toFixed(3) + ')');
  P.leave();
}
P.start('kick'); $('pr-retry').click(); { const c = T.M.cut, t0 = c.t; T.update(STEP); ok(Math.abs(c.t - t0 - STEP*X.PACE.live) < 1e-9, 'Kicking: the close-up\'s clock is scaled'); } P.leave();
P.start('scrum'); $('pr-retry').click(); { const c = T.M.cut, t0 = c.t; T.update(STEP); ok(Math.abs(c.t - t0 - STEP*X.PACE.live) < 1e-9, 'Driving: the close-up\'s clock is scaled'); } P.leave();
P.start('tackle'); $('pr-retry').click(); { const Tk = S().tackle, x0 = Tk.ru.x; T.update(STEP); ok(Math.abs(x0 - Tk.ru.x - X.TACKLE.jog*STEP*X.PACE.live) < 1e-9, 'Tackling: the runner\'s jog is scaled'); } P.leave();
for (const id of ['defend', 'pass']) { P.start(id); $('pr-retry').click(); const c0 = T.M.clock; T.update(STEP); ok(Math.abs(T.M.clock - c0 - STEP*X.PACE.live) < 1e-9, id + ': the restaged play\'s clock is scaled'); P.leave(); }
T.newMatch(0, 1, { halfLen:240, diff:1, auto:true, headless:true });
{ const c0 = T.M.clock; T.update(STEP); ok(X.rate() === 1 && Math.abs(T.M.clock - c0 - STEP) < 1e-12, 'a match is not scaled'); }
H.reseed(77); const simA = JSON.stringify(T.simulate(1, 60, 1).map(m => [m.score, m.steps]));

// ---- every demo: opens by itself, real drill code, succeeds in its cap, the ghost is the input, nothing recorded
const walls = {}, baseStats = {};
for (const d of X.DRILLS) { seeAll(); P.start(d.id); baseStats[d.id] = JSON.stringify(T.M.stats); P.leave(); }
for (const d of X.DRILLS) {
  unsee(); writes = 0;
  P.start(d.id);
  ok(!!demo() && !S().ready && !T.M.paused && $('m-practice').hidden && !$('controls').hidden && $('b-pause').hidden, d.id + ': the first open plays the demo by itself');
  ok(!$('demo-skip').hidden && !$('drill-demo').hidden && $('drill-hud').hidden && $('practice-cue').hidden, d.id + ': Skip and the caption are up, the drill\'s own lines are not');
  ok(writes === 0, d.id + ': the seen flag is not spent just by opening');
  ok(X.rate() === X.DEMO.rate, d.id + ': the demo starts at its own pace');
  const firstM = T.M, s = watch();
  const L = X.demoLast();
  walls[d.id] = L.wall;
  ok(L && L.id === d.id && L.ok && L.why === 'end' && L.wall < X.DEMO.cap, d.id + ': one good rep inside the cap (' + (L ? L.why + ' ' + L.wall.toFixed(1) + ' s' : 'none') + ')');
  ok(s.ghostBad === 0, d.id + ': the ghost matches the input on every step (' + s.ghostBad + ' off)');
  ok(s.doneBad === 0 && s.pauseBad === 0 && s.sourceBad === 0, d.id + ': no result, no pause and no other source through the demo');
  ok(s.rateLo >= X.DEMO.slow - 1e-9 && s.rateHi <= X.DEMO.rate + 1e-9, d.id + ': the speed stays between ' + X.DEMO.slow + ' and ' + X.DEMO.rate);
  ok(s.stick > 0 || d.id === 'scrum', d.id + ': the thumb moves (Driving uses no stick)');
  ok(s.caps.size >= 2 && [...s.caps].every(c => !/\b(he|him|his)\b/i.test(c) && c.length <= 110), d.id + ': short captions, and none says he');
  ok(T.M !== firstM && JSON.stringify(T.M.stats) === baseStats[d.id], d.id + ': the demo\'s match, its stats with it, is thrown away');
  ok(S().ready && T.M.paused && !$('m-practice').hidden && !S().done && S().stars === 0 && S().best === null && S().elapsed === 0, d.id + ': ends on a fresh ready card');
  ok($('pr-result').textContent === d.name && $('pr-stars').hidden && !$('pr-watch').hidden, d.id + ': the ready card, not a result card, with Watch How on it');
  ok(!T.M.stats.drillSprints && !T.M.stats.tackleGood && !T.M.stats.eggCatch && !T.M.stats.passes, d.id + ': no stat carries over');
  ok(clean() && ghostOff() && overlayOff() && !demo(), d.id + ': no input, no ghost and no overlay left');
  ok(writes === 1 && savedSeen().includes(d.id), d.id + ': the seen flag is saved once, and the demo writes nothing else');
  P.leave();
}
console.log('Demo lengths in real seconds: ' + Object.entries(walls).map(([k, v]) => k + ' ' + v.toFixed(1)).join(', '));
for (const [id, want] of [['tag', ['a']], ['back', ['a']], ['tackle', ['a']], ['circle', ['a', 'c']], ['cones', ['c']], ['kick', ['a']], ['scrum', ['a']], ['defend', ['a', 'b', 'c']], ['pass', ['a']]]) {
  unsee(); P.start(id); const s = watch();
  ok(want.every(k => s[k] > 0), id + ': the demo really holds ' + want.join(' and ') + ' on the real buttons');
  P.leave();
}
{ // the moments that matter ease down to about 0.25
  unsee(); P.start('tackle'); const s = watch(); const m = X.demoLast().marks;
  ok(m.release <= 0.28 && m.squeeze <= 0.28, 'Tackling: the release and the Squeeze play at about 0.25 (' + m.release.toFixed(3) + ', ' + m.squeeze.toFixed(3) + ')');
  ok(['Set', 'Head Side', 'Aim', 'Hold and Let Go on the Gold', 'Squeeze'].every(t => [...s.caps].some(c => c.startsWith(t + ':'))), 'Tackling: all five steps are captioned, in the order Set, Head Side, Aim, Hold and Let Go on the Gold, Squeeze');
  P.leave();
}
{ // the release itself is judged by the real code: height, timing and power all right
  unsee(); P.start('tackle'); let marks = null; for (let i = 0; i < 9000 && demo(); i++) { T.update(STEP); if (demo() && S().tackle.made) marks = S().tackle.marks; }
  ok(marks && ['pos', 'height', 'time', 'power', 'squeeze'].every(k => marks[k] && marks[k].ok), 'Tackling: every element is marked right by the drill\'s own judge'); P.leave();
}
{ // Circle: both roles
  unsee(); P.start('circle'); const s = watch();
  ok([...s.caps].some(c => c.startsWith('Runner')) && [...s.caps].some(c => c.startsWith('Passer')), 'Circle: the demo shows the Runner, then the Passer'); P.leave();
}
for (const id of ['pass', 'defend']) { // Create a Gap and Defend a Breakaway: Watch How plays round one and ends on it, never reaching round two
  for (let seed = 1; seed <= 6; seed++) {
    H.reseed(seed*613); unsee(); P.start(id); let most = 0, round = 1, n = 0;
    while (demo() && n++ < 9000) { T.update(STEP); if (!demo()) break; const R = (S().gap || S().defend).R; most = Math.max(most, R.won); round = Math.max(round, R.round); }
    const L = X.demoLast(); ok(L.ok && L.why === 'end' && most === 1 && round === 1, id + ': Watch How wins round one and ends there, seed ' + seed + ' (' + most + ' won, round ' + round + ')'); P.leave();
  }
}

// ---- the pilot is reliable: Tackling across seeds, and the rest across a few
{ let good = 0, longest = 0; const n = 60; /* a rep can't be retried unseen: the longest says how often it took a second one */ for (let seed = 1; seed <= n; seed++) { H.reseed(seed*131); unsee(); P.start('tackle'); watch(); const L = X.demoLast(); if (L.ok && L.why === 'end') good++; longest = Math.max(longest, L.wall); P.leave(); }
  ok(good === n, 'Tackling: the pilot succeeds under ' + n + ' seeds (' + good + ', longest ' + longest.toFixed(1) + ' s)'); }
for (const d of X.DRILLS) { if (d.id === 'tackle') continue; let good = 0, longest = 0; const n = 15; for (let seed = 1; seed <= n; seed++) { H.reseed(seed*977); unsee(); P.start(d.id); watch(); const L = X.demoLast(); if (L.ok && L.why === 'end') good++; longest = Math.max(longest, L.wall); P.leave(); }
  ok(good === n, d.id + ': the pilot succeeds under ' + n + ' seeds (' + good + ', longest ' + longest.toFixed(1) + ' s)'); }

// ---- the wall-clock cap ends it cleanly
unsee(); P.start('tackle'); demo().cap = 1; watch();
ok(X.demoLast().why === 'cap' && !X.demoLast().ok && S().ready && clean() && ghostOff() && overlayOff(), 'the cap ends a demo on the ready card, cleanly'); P.leave();

// ---- real input is ignored
{ unsee(); P.start('tackle');
  for (let i = 0; i < 30; i++) T.update(STEP);
  const before = [inp.src.a, inp.jx, inp.jy];
  key('KeyJ'); key('KeyW'); key('KeyK'); key('KeyL');
  ok(!(inp.src.a & 1) && !(inp.src.b & 1) && !(inp.src.c & 1) && inp.keys.size === 0, 'keys never reach the slot');
  $('zone').fire('pointerdown', { pointerId:5, clientX:90, clientY:280 }); $('zone').fire('pointermove', { pointerId:5, clientX:150, clientY:280 });
  ok(inp.stickId === null && inp.jx === before[1], 'a real thumb never takes the stick');
  $('btnA').fire('pointerdown', { pointerId:6 }); $('btnC').fire('pointerdown', { pointerId:7 });
  ok(!(inp.src.a & 2) && !(inp.src.c & 2) && !$('btnA')._held, 'a real finger never presses a button');
  $('cv').fire('pointerdown', { pointerId:8, clientX:780, clientY:320 });
  ok(!(inp.src.a & 2) && !(inp.src.b & 2) && !(inp.src.c & 2), 'a tap on the pitch near a button is ignored too');
  key('KeyJ', false); key('KeyW', false); key('KeyK', false); key('KeyL', false); $('btnA').fire('pointerup', { pointerId:6 }); $('zone').fire('pointerup', { pointerId:5 });
  const pad = { index:0, mapping:'standard', connected:true, axes:[1, 0], buttons:Array.from({ length:17 }, () => ({ pressed:false, value:0 })) };
  H.padStub([pad]); H.fire('gamepadconnected', { gamepad:pad });
  pad.buttons[0] = { pressed:true, value:1 }; pad.buttons[5] = { pressed:true, value:1 }; T.pollPads();
  ok(!(inp.src.a & 4) && !(inp.src.c & 4) && !inp.padStick, 'a controller never reaches the slot');
  ok(!!demo(), 'and none of them ended it');
  pad.buttons[1] = { pressed:true, value:1 }; T.pollPads();
  ok(!!demo() && !(inp.src.b & 4), 'the Right Button a caption names does not end it either'); pad.buttons[1] = { pressed:false, value:0 }; T.pollPads();
  pad.buttons[9] = { pressed:true, value:1 }; T.pollPads();
  ok(!demo() && S().ready, 'Start on a controller skips');
  pad.buttons = pad.buttons.map(() => ({ pressed:false, value:0 })); pad.axes = [0, 0]; T.pollPads(); H.fire('gamepaddisconnected', { gamepad:pad });
  ok(clean() && S().ready, 'and what was held can\'t fire afterwards');
  P.leave(); H.padStub([]);
}

// ---- skip at every stage
const ways = {
  Escape: () => key('Escape'),
  'the Skip button': () => $('demo-skip').click(),
  'Pause (P)': () => key('KeyP'),
  'pause, as an app hide calls it': () => D.pause(),
  'losing focus': () => H.fire('blur'),
  'the phone turned': () => D.phoneUpright(),
};
for (const d of X.DRILLS) for (const [name, act] of Object.entries(ways)) {
  for (const n of [0, 1, 40, 200, 700, 1500]) {
    unsee(); P.start(d.id);
    for (let i = 0; i < n && demo(); i++) T.update(STEP);
    if (!demo()) { P.leave(); continue; }                  // already over: this demo is shorter than that
    const live = true;
    act();
    const good = S() && S().ready && !demo() && T.M.paused && $('m-pause').hidden && !$('m-practice').hidden && clean() && ghostOff() && overlayOff() && S().best === null && S().elapsed === 0;
    if (!good) ok(false, d.id + ': ' + name + ' after ' + n + ' steps leaves a clean ready card (was live: ' + live + ')'); else passed++;
    T.update(STEP); ok(S().elapsed === 0, d.id + ': nothing runs behind the ready card');
    P.leave();
  }
}
{ unsee(); P.start('tackle'); for (let i = 0; i < 40; i++) T.update(STEP); key('Escape'); key('Escape', true, true);
  ok(S() && S().ready, 'a held Escape stops at the ready card: its repeats don\'t leave as well'); key('Escape', false); key('Escape'); ok(!S(), 'a fresh Escape on the ready card leaves'); }
{ unsee(); P.start('tackle'); for (let i = 0; i < 40; i++) T.update(STEP); P.leave(); ok(!S() && clean() && ghostOff() && overlayOff(), 'leaving mid-demo cleans up'); }
{ const before = JSON.stringify({ ...D.settings(), drillSeen:0 });
  unsee(); P.start('kick'); for (let i = 0; i < 400; i++) T.update(STEP); P.leave();
  ok(JSON.stringify({ ...D.settings(), drillSeen:0 }) === before && D.settings().drillSeen.includes('kick'), 'leaving mid-demo restores the settings, the seen flag kept');
  T.newMatch(0, 1, { halfLen:240, diff:1, humans:[true, false] }); T.update(STEP);
  ok(!T.M.practice && !S() && X.rate() === 1 && clean(), 'and a match after it starts clean'); }

// ---- a fresh run after a demo is the run it would have been
function trace(id, role, seed, withDemo) {
  seeAll(); H.reseed(seed);
  if (withDemo) { P.start(id); H.reseed(seed + 1); $('pr-watch').click(); ok(!!demo(), id + ': Watch How replays from the ready card'); const n = withDemo; for (let i = 0; i < n && demo(); i++) T.update(STEP); H.reseed(seed); X.demoSkip(); }
  else P.start(id);
  if (role) $('pr-' + role).click(); else $('pr-retry').click();
  const out = [];
  for (let i = 0; i < 240 && !S().done; i++) {
    if (i % 40 === 20) { inp.jx = 0.6; inp.jy = 0.2; } if (i % 40 === 35) { inp.jx = inp.jy = 0; }
    T.update(STEP);
    out.push([T.M.ball.x, T.M.ball.y, T.M.ball.z, ...T.M.players.flatMap(p => [p.x, p.y]), S().elapsed]);
  }
  const r = JSON.stringify(out), stats = JSON.stringify(T.M.stats); inp.jx = inp.jy = 0; P.leave();
  return r + stats;
}
for (const d of X.DRILLS) {
  const seed = 4000 + ids.indexOf(d.id), a = trace(d.id, d.roles ? 'runner' : null, seed, 0), b = trace(d.id, d.roles ? 'runner' : null, seed, 500);
  ok(a === b, d.id + ': a run after Watch How matches the same seed\'s run without it, frame for frame');
}

// ---- a career's drill: gets the demo, still reports once, and only the real run
{ let calls = []; const onDone = r => calls.push(r), catcher = st => { const E = st.egg, b = T.M.ball; if (E.stage === 'fly' && b.z > 0.5 && b.z < 2) { E.me.x = b.x; E.me.y = b.y; } };
  unsee(); P.start('egg', { onDone, leaveLabel:'Back to Career' });
  ok(!!demo() && S().opts.onDone === onDone, 'career: a caller\'s first open gets the demo too');
  watch();
  ok(calls.length === 0 && S().ready && S().opts && S().opts.onDone === onDone && $('pr-select').textContent === 'Back to Career' && S().best === null, 'career: the demo reports nothing and keeps the caller');
  $('pr-select').click();
  ok(calls.length === 1 && calls[0].quit === true && calls[0].stars === 0, 'career: leaving after only the demo reports quit, no stars, so no reward');
  calls = []; unsee(); P.start('egg', { onDone }); key('Escape'); $('pr-retry').click();
  let n = 0; while (!S().done && n < 9000) { catcher(S()); T.update(STEP); n++; }
  const stars = S().stars; $('pr-retry').click();          // Try Again, then Watch How, must keep the best
  $('pr-watch').click(); for (let i = 0; i < 100; i++) T.update(STEP); key('Escape');
  ok(S().best && S().best.stars === stars, 'career: a demo between runs keeps the visit\'s best');
  $('pr-select').click();
  ok(calls.length === 1 && calls[0].stars === stars && !calls[0].quit, 'career: the real run reports once, with its stars (' + stars + ')');
}

// ---- the seen flag
{ seeAll(); D.settings().drillSeen = [];
  P.start('cones'); ok(!!demo(), 'unseen: it plays'); key('Escape'); P.leave();
  ok(D.settings().drillSeen.includes('cones') && savedSeen().includes('cones'), 'seen survives the practice.settings restore and is in the save');
  P.start('cones'); ok(!demo() && S().ready, 'seen: the drill opens on its ready card'); P.leave();
  P.start('egg'); ok(!!demo(), 'another drill is still unseen'); P.leave();
  const reload = save => { memory['tryline.v1'] = JSON.stringify(save); D.settings().drillSeen = []; T.teams.load(); return D.settings().drillSeen; };
  ok(JSON.stringify(reload({ settings:{ drillSeen:['tackle', 'nope', 3, 'egg', 'egg', null] } })) === JSON.stringify(['egg', 'tackle']), 'a save\'s list is validated: only known drills, each once, in order');
  ok(JSON.stringify(reload({ settings:{ drillSeen:'egg' } })) === '[]' && JSON.stringify(reload({ settings:{ drillSeen:{ egg:1 } } })) === '[]', 'a broken list is ignored');
  ok(JSON.stringify(reload({ settings:{ half:1, played:4 } })) === '[]', 'an old save has seen nothing, and loads');
  ok(JSON.stringify([...X.DRILL_IDS].sort()) === JSON.stringify([...ids].sort()), 'the persisted ids are the drills');
  unsee(); P.start('kick'); key('Escape'); const w0 = writes; $('pr-watch').click(); for (let i = 0; i < 50; i++) T.update(STEP); key('Escape'); P.leave();
  ok(writes === w0, 'a replay writes nothing');
}

// ---- the one automatic play is spent by watching, not by opening
{ const seen = id => D.settings().drillSeen.includes(id), inStore = id => (savedSeen() || []).includes(id), sec = s => { for (let i = 0; i < s/STEP && demo(); i++) T.update(STEP); };
  delete memory['tryline.v1'];
  for (const [name, act] of [['an app hide', () => D.pause()], ['losing focus', () => H.fire('blur')], ['the phone turned', () => D.phoneUpright()]]) {
    unsee(); P.start('tackle'); sec(1); act();
    ok(S().ready && !demo(), name + ' a second in: it stops on the ready card, and does not start itself again');
    ok(!inStore('tackle'), name + ' a second in: the save says unseen');
    P.leave(); ok(!seen('tackle'), name + ' a second in: still unseen after leaving');
    P.start('tackle'); ok(!!demo(), name + ' a second in: the next open plays it again'); P.leave();
  }
  unsee(); P.start('tackle'); sec(X.DEMO.seen + 0.1); D.pause(); ok(S().ready && inStore('tackle'), 'interrupted after ' + X.DEMO.seen + ' s of watching: seen, and in the save'); P.leave(); ok(seen('tackle'), 'and it stays seen after leaving'); P.start('tackle'); ok(!demo(), 'so the next open goes to the ready card'); P.leave();
  delete memory['tryline.v1'];
  unsee(); P.start('egg'); sec(0.5); $('demo-skip').click(); ok(inStore('egg'), 'Skip counts as seen'); P.leave();
  delete memory['tryline.v1'];
  unsee(); P.start('cones'); sec(0.5); D.pause(); $('pr-retry').click(); ok(inStore('cones') && !S().ready, 'Start Drill after an interruption counts as seen'); P.leave();
  unsee(); const w = () => writes; P.start('cones'); sec(X.DEMO.seen + 1); const w0 = w(); sec(1); ok(w() === w0, 'the mark is written once'); P.leave();
}

// ---- a retry shows the Switch step as the first try did
{ let retries = 0, shortest = 9; const R = {};
  for (let seed = 1; seed <= 40 && retries < 6; seed++) {
    H.reseed(seed*41); unsee(); P.start('defend');
    let cur = demo(), began = 0, wall = 0, pressed = false, n = 0;
    while (demo() && n++ < 9000) {
      T.update(STEP); wall += STEP;
      if (!demo()) break;
      if (demo() !== cur) { cur = demo(); began = wall; pressed = false; retries++; R.saw = true; }
      if (!pressed && inp.bDown) { pressed = true; if (began > 0) shortest = Math.min(shortest, wall - began); }
    }
    P.leave();
  }
  ok(R.saw && shortest >= 1.45, 'Defend: every retry waits at the Switch caption as the first try does (' + retries + ' retries, the shortest ' + shortest.toFixed(2) + ' s)');
}

// ---- Defend: Sprint straight after Switch keeps the ring on the man you switched to
{ seeAll();
  for (const [at, gap] of [[0.2, 0.25], [0.4, 0.05], [0.05, 0.02], [0.2, 0]]) {
    P.start('defend'); $('pr-retry').click();
    const cover = T.M.players.filter(p => p.team === 0)[1], step = () => { T.update(STEP); inp.bPressed = inp.cPressed = false; };
    for (let t = 0; t < at; t += STEP) step();
    inp.bPressed = true; for (let t = 0; t < gap; t += STEP) step();
    inp.cPressed = true; inp.cDown = true; let held = 0;
    for (let i = 0; i < 40; i++) { step(); if (T.sides.ctrlOf(0) === cover) held++; }
    ok(held === 40, 'Defend: Switch at ' + at + ' s, Sprint ' + gap + ' s later: the ring stays on the cover man (' + held + ' of 40 steps)');
    inp.cDown = false; P.leave();
  }
  P.start('defend'); $('pr-retry').click();
  ok(T.contact.sprintPick(0) === null || T.contact.sprintPick(0) !== T.sides.ctrlOf(0), 'before the Switch, Sprint may still pick the nearer man'); P.leave();
}

// ---- the pace lever leaves a real thumb's shove alone: the same taps a real second make the same push in a live drill as in a match
{ const shove = (live, rate) => {
    const every = Math.round(1/(rate*STEP)), out = [];
    if (live) { seeAll(); P.start('scrum'); $('pr-retry').click(); }
    else { T.newMatch(0, 1, { halfLen:240, diff:1, humans:[true, false], headless:true, duels:'off' }); T.M.phase = 'play'; T.kids.startScrum({ team:0, x:60, y:35 }); }
    const c = T.M.cut;
    for (let i = 0; i < 2000 && !c.engaged; i++) T.update(STEP);
    for (let i = 0; i < 90 && T.M.cut === c && !c.result; i++) { c.pos = 0; inp.aPressed = i % every === 0; T.update(STEP); inp.aPressed = false; if (i >= 45) out.push(c.rate[0]); }
    if (live) P.leave();
    return out.reduce((a, b) => a + b, 0)/(out.length || 1);
  };
  for (const rate of [4, 5, 6]) { const a = shove(true, rate), b = shove(false, rate); ok(a > 0 && b > 0 && Math.abs(a - b) <= 0.05*b, 'Driving: ' + rate + ' real taps a second shove ' + a.toFixed(3) + ' in the drill and ' + b.toFixed(3) + ' in a match'); }
}

// ---- the names follow the device
{ unsee(); key('KeyJ'); key('KeyJ', false); P.start('scrum'); for (let i = 0; i < 400 && demo() && !/Push/.test($('demo-cap').textContent); i++) T.update(STEP);
  ok(/Push \(J\)/.test($('demo-cap').textContent), 'a keyboard player sees the key: ' + $('demo-cap').textContent); key('Escape'); P.leave();
  const pad = { index:1, mapping:'standard', connected:true, axes:[0, 0], buttons:Array.from({ length:17 }, () => ({ pressed:false, value:0 })) };
  H.padStub([pad]); H.fire('gamepadconnected', { gamepad:pad }); unsee(); P.start('scrum');
  pad.buttons[0] = { pressed:true, value:1 }; T.pollPads(); for (let i = 0; i < 400 && demo() && !/Push/.test($('demo-cap').textContent); i++) T.update(STEP);
  ok(/Push \(Bottom Button\)/.test($('demo-cap').textContent), 'a controller player sees the button: ' + $('demo-cap').textContent); key('Escape'); P.leave();
  pad.buttons[0] = { pressed:false, value:0 }; T.pollPads(); H.fire('gamepaddisconnected', { gamepad:pad }); H.padStub([]);
  $('zone').fire('pointerdown', { pointerId:9, clientX:90, clientY:280 }); $('zone').fire('pointerup', { pointerId:9 });
  unsee(); P.start('scrum'); for (let i = 0; i < 400 && demo() && !/Push/.test($('demo-cap').textContent); i++) T.update(STEP);
  ok(/^Tap Push on Set/.test($('demo-cap').textContent), 'a touch player sees the plain name: ' + $('demo-cap').textContent); key('Escape'); P.leave();
}

// ---- no draw outside a drill; the AI sims and Two Player are not reached
const demoSrc = fs.readFileSync(new URL('../src/drill-demo.js', import.meta.url), 'utf8');
ok(!/\brnd\(|Math\.random/.test(demoSrc), 'the pilots draw no random number of their own');
ok(!/\b(he|him|his)\b/i.test(demoSrc.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')), 'the demo\'s copy never says he');
{ seeAll(); P.start('cones'); const n0 = H.rndCalls(); $('pr-watch').click(); for (let i = 0; i < 300 && demo(); i++) T.update(STEP); ok(H.rndCalls() === n0, 'a demo with nothing random in its drill draws nothing'); X.demoSkip(); P.leave(); }
H.reseed(77); ok(JSON.stringify(T.simulate(1, 60, 1).map(m => [m.score, m.steps])) === simA, 'AI v AI is the same run after all this');
T.debug.setTwo && T.debug.setTwo(false);
ok(!/practice|drill/i.test(fs.readFileSync(new URL('../src/match.js', import.meta.url), 'utf8').match(/function newMatch[\s\S]{0,60}/)[0]), 'newMatch is not touched');
console.log(failed ? `Drill demo: ${passed} passed, ${failed} failed` : `Drill demo: ${passed} assertions passed`);
process.exitCode = failed ? 1 : 0;
