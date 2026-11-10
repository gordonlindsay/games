// The edge (src/edge.js; README.md, Easy): who has it, each lever's size, the Line Break (once a carry, its call, its sound, its
// heat, its hit-stop and the youngest's none, the cover's lag), On Fire's Easy numbers and the meter, and EDGE off drawing exactly as
// 90353c3, the build before it, with AI v AI, the demo, a tool's balance match, Normal, Hard and Two Player never moving at all.
// node tools/edge.mjs           (SEED=17 unless set; VERBOSE=1 lists every check)
// node tools/edge.mjs --pins    prints this build's fingerprints with EDGE off; GAME=<90353c3>/index.html node tools/edge.mjs --pins pinned BASE
process.env.SEED ??= '17';
const { T, reseed, rndCalls, bot } = await import('./harness.mjs');
const X = T.teams, D = T.debug, E = T.edge, C = T.career, STEP = T.STEP, M = () => T.M, $ = id => document.getElementById(id);
let passed = 0, failed = 0, group = '';
const ok = (cond, msg) => { if (cond) passed++; else failed++; if (!cond || process.env.VERBOSE) console.log(cond ? 'ok  ' : 'FAIL', group + ':', msg); };
const begin = name => { group = name; }, done = name => console.log(`${name.padEnd(30)} ${failed ? 'FAIL so far ' + failed : 'ok'} (${passed} passed)`);
const json = v => JSON.stringify(v), near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
const memory = {};
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; } };
const said = []; document.createTextNode = t => { said.push(String(t)); return {}; };   // every banner the game says
const heard = []; globalThis.__sfxSpy = k => { heard.push(k); };                         // every sound it asks for
const settings = D.settings();
const ready = (diff = 0) => { settings.played = 99; settings.diff = diff; settings.kids = false; settings.half = 0; };   // no gentler start, 2-minute halves

/* 0. EDGE off: the build before it, draw for draw. SAME never moves, edge or no edge: AI v AI on Easy, the demo, a tool's balance match
   on Easy (no arcade), an arcade match the bot plays on Normal and on Hard, Two Player on Easy, and their random draws. EASY moves on
   purpose: an arcade Quick Match on Easy and a Kids match at its ceiling, each the bot's; with EDGE off both play as 90353c3. */
const BASE = { same:'1hzoeux ishkxt wwi9x a3ytt3 1a6etmy 1onyo2q z7225g', easy:'lwmcb9 109vndd 12fxhxe' };   // GAME=<90353c3>/index.html node tools/edge.mjs --pins
const ON = '1qlb7jq 5j98i 1biwcs7';   // EASY with the edge as README.md gives it (2026-11-10): re-pin only from a change to the edge, on purpose
const play = (seed, a, b, o, two) => { reseed(seed); T.newMatch(a, b, { halfLen:60, headless:true, humans:two ? [true, true] : [true, false], ...o }); let n = 0; while (!M().over && n < 200000) { bot(0); if (two) bot(1); T.update(STEP); n++; } return json([M().score, M().tries, M().stats, n]); };
function pins() {
  const same = [], easy = [], r0 = rndCalls();
  reseed(71); same.push(json(T.simulate(2, 60, 0).map(r => [r.teams, r.score, r.tries, r.stats, r.steps])));
  reseed(72); T.newMatch(X.NATIONS[2], X.NATIONS[1], { halfLen:1e9, diff:1, auto:true, demo:true });
  for (let i = 0; i < 2400; i++) T.update(STEP);
  same.push(json([M().score, M().stats, M().players.map(p => [p.x.toFixed(5), p.y.toFixed(5)])]));
  same.push(play(73, X.CLUBS[0], X.CLUBS[1], { diff:0, duels:'live' }));
  same.push(play(74, X.NATIONS[0], X.NATIONS[3], { diff:1, duels:'live', arcade:true }));
  same.push(play(75, X.NATIONS[1], X.NATIONS[4], { diff:2, duels:'live', arcade:true }));
  same.push(play(76, X.CLUBS[0], X.CLUBS[11], { duels:'off', arcade:true, levels:[0, 0] }, true));
  same.push(String(rndCalls() - r0));
  const r1 = rndCalls();
  easy.push(play(77, X.NATIONS[0], X.NATIONS[3], { diff:0, duels:'live', arcade:true }));
  easy.push(play(78, X.CLUBS[0], X.CLUBS[11], { diff:0, duels:'live', arcade:true, kids:true, kidsR:1 }));
  easy.push(String(rndCalls() - r1));
  return { same:same.map(fnv).join(' '), easy:easy.map(fnv).join(' ') };
}
if (process.argv.includes('--pins')) {
  if (E) E.EDGE.on = false;
  const p = pins(); console.log(`same:'${p.same}', easy:'${p.easy}'`); process.exit(0);
}
begin('0 EDGE off is 90353c3');
{
  E.EDGE.on = false; const off = pins(); E.EDGE.on = true; const on = pins();
  ok(off.same === BASE.same && off.easy === BASE.easy, `EDGE off: every match plays as 90353c3, with the same draws (${off.same} / ${off.easy}, pinned ${BASE.same} / ${BASE.easy})`);
  ok(on.same === BASE.same, `EDGE on: AI v AI, the demo, a tool's balance match on Easy, Normal and Hard arcade matches and Two Player on Easy do not move at all (${on.same})`);
  ok(on.easy.split(' ').slice(0, 2).every((h, i) => h !== BASE.easy.split(' ')[i]), `EDGE on moves the Easy Quick Match and the Kids match, on purpose (${on.easy})`);
  ok(on.easy === ON, `and plays them as pinned with the edge (${on.easy}, pinned ${ON})`);
}
done('0 EDGE off is 90353c3');

/* 1. Who has it */
begin('1 who');
{
  const one = o => { T.newMatch(X.NATIONS[0], X.NATIONS[1], { halfLen:60, headless:true, humans:[true, false], duels:'off', ...o }); return [E.on(0), E.on(1)]; };
  ok(json(one({ diff:0, arcade:true })) === '[true,false]', 'a match you play on Easy: your side has it, the CPU does not');
  ok(json(one({ diff:0, arcade:true, humans:[false, true] })) === '[false,true]', 'and as the away side, the same');
  ok(json(one({ diff:0, arcade:true, kids:true })) === '[true,false]' && M().kids, 'Kids (on Easy) has it');
  ok(json(one({ diff:1, arcade:true })) === '[false,false]', 'not Normal');
  ok(json(one({ diff:2, arcade:true })) === '[false,false]', 'not Hard');
  ok(json(one({ diff:0 })) === '[false,false]', 'not a tool\'s balance match (never arcade)');
  ok(json(one({ diff:0, arcade:true, humans:[true, true], levels:[0, 0] })) === '[false,false]', 'not Two Player, on Easy for both');
  T.newMatch(0, 1, { halfLen:60, diff:0, auto:true, headless:true, arcade:true }); ok(!E.on(0) && !E.on(1), 'not AI v AI, even asked for arcade');
  T.newMatch(0, 1, { halfLen:1e9, diff:0, auto:true, demo:true }); ok(!E.on(0) && !E.on(1), 'not the demo');
  ready(0);
  const drillsOn = T.drills.DRILL_IDS.filter(id => { T.practice.start(id); const on = !!(M() && (E.on(0) || E.on(1))); T.practice.leave(); return on; });
  ok(drillsOn.length === 0, `not the drills (none of ${T.drills.DRILL_IDS.length}${drillsOn.length ? ': ' + drillsOn.join(', ') : ''})`);
  E.EDGE.on = false; one({ diff:0, arcade:true }); ok(!E.on(0), 'EDGE.on false: nobody'); E.EDGE.on = true;
  // through the real paths
  ready(0); D.startMatch(X.CLUBS[0], X.CLUBS[1], false); ok(M().arcade && E.on(0) && !E.on(1), 'Quick Match on Easy'); D.exitMatch();
  ready(0); D.startMatch(X.NATIONS[0], X.NATIONS[1], true); ok(M().champ && E.on(0), 'Championship on Easy'); D.exitMatch();
  ready(1); D.startMatch(X.CLUBS[0], X.CLUBS[1], false); ok(!E.on(0), 'Quick Match on Normal: not'); D.exitMatch();
  ready(0); settings.kids = true; D.startMatch(X.CLUBS[0], X.CLUBS[1], false); ok(M().kids && E.on(0), 'Kids'); D.exitMatch(); settings.kids = false;
  ready(0); D.startMatch(X.CLUBS[0], X.CLUBS[1], false, { two:true, levels:[0, 0] }); ok(M().two && !E.on(0) && !E.on(1), 'Two Player on Easy: not'); D.exitMatch();
  ready(0); C.set(C.create({ pos:'B', num:5, club:X.CLUBS[0] })); C.play();
  ok(M().career && !M().careerPro && E.on(0) && M().players.filter(p => p.team === 0).every(p => E.man(p)), 'Career on Easy, Whole Team: every man of yours');
  D.exitMatch();
  ready(0); C.set(C.create({ pos:'B', num:5, club:X.CLUBS[0], proMode:true })); C.play();
  ok(M().careerPro && E.on(0) && E.man(M().careerP) && M().players.filter(p => p.team === 0 && p !== M().careerP).every(p => !E.man(p)), 'Pro Mode on Easy: his own player, never a teammate the computer runs');
  D.exitMatch(); C.set(null); ready(1);
}
done('1 who');

/* 2. Each lever, and its size */
begin('2 levers');
{
  const V = E.EDGE;
  ok(json([V.pace, V.hold, V.step, V.bite, V.lag, V.fire, V.brk]) === json([1.03, 0.92, 0.85, 0.06, 0.3, { need:2, secs:15, pts:{ hit:1, turnover:1, try:1, line:1 } }, { lane:15, clear:3, fwd:2.5, line:5, stop:110 }]),
    `the table as README.md gives it (${json(V)})`);
  const scene = (o = {}) => { T.newMatch(X.CLUBS[0], X.CLUBS[0], { halfLen:600, headless:true, humans:[true, false], duels:'off', diff:0, arcade:true, ...o }); M().phase = 'play'; M().set = null; return M(); };
  const give = p => { const b = M().ball; b.state = 'held'; b.carrier = p; b.f = null; p.hold = 1; };
  // pace
  let m = scene(); const you = m.players[3], cpu = m.players[10];
  let s0 = E.maxSpeed(you); give(you); let s1 = E.maxSpeed(you);
  ok(near(s1/s0, V.pace), `your carrier on Easy: ${V.pace}x his pace with the ball (${(s1/s0).toFixed(4)})`);
  s0 = E.maxSpeed(cpu); give(cpu); s1 = E.maxSpeed(cpu);
  ok(near(s1/s0, 1), 'the CPU\'s carrier: unchanged');
  m = scene({ diff:1 }); s0 = E.maxSpeed(m.players[3]); give(m.players[3]); ok(near(E.maxSpeed(m.players[3])/s0, 1), 'Normal: unchanged');
  // the hold
  m = scene(); const q = m.players[10], c = m.players[3];
  q.x = c.x + 2; q.y = c.y; c.side = -1;
  const pOn = E.tackleChance(q, c, 'ai'); V.on = false; const pOff = E.tackleChance(q, c, 'ai'); V.on = true;
  ok(near(pOn/pOff, V.hold), `the CPU's tackle on your carrier holds ${V.hold} of the times it did (${pOff.toFixed(3)} to ${pOn.toFixed(3)})`);
  c.side = 0.2;
  const sOn = E.tackleChance(q, c, 'ai'); V.on = false; const sOff = E.tackleChance(q, c, 'ai'); V.on = true;
  ok(near(sOn/sOff, V.hold*V.step), `a Side Step: ${V.step}x its odds on top (${sOff.toFixed(3)} to ${sOn.toFixed(3)}, MOVES.step.odds ${T.contact.MOVES.step.odds})`);
  c.side = -1;
  const mine = E.tackleChance(c, q, 'contact'); V.on = false; const mine0 = E.tackleChance(c, q, 'contact'); V.on = true;
  ok(near(mine, mine0) && near(E.tackleChance(m.players[4], q, 'ai'), (V.on = false, E.tackleChance(m.players[4], q, 'ai'))), 'your own tackles, and your AI men\'s on their carrier: unchanged'); V.on = true;
  // the Dummy, bought 0.9 + bite of the time from your carrier (the same one draw either way)
  const buy = on => { V.on = on; let sold = 0, r0 = rndCalls(); for (let i = 0; i < 4000; i++) { m = scene(); const cc = m.players[3], r = m.players[4], d1 = m.players[10]; cc.x = 60; cc.y = 35; r.x = 57; r.y = 41; d1.x = 64; d1.y = 35; for (const p of m.players) if (p !== cc && p !== r && p !== d1) { p.x = p.team ? 110 : 12; p.y = 5 + p.n*8; } give(cc); const s = m.stats.sold0 || 0; E.dummyPass(cc, r); if ((m.stats.sold0 || 0) > s) sold++; } V.on = true; return [sold/4000, rndCalls() - r0]; };
  reseed(9001); const [bOn, nOn] = buy(true); reseed(9001); const [bOff, nOff] = buy(false);
  ok(near(bOn, T.contact.MOVES.dummy.bite[0] + V.bite, 0.012) && near(bOff, T.contact.MOVES.dummy.bite[0], 0.012), `a Dummy from your carrier is bought ${(100*bOn).toFixed(1)}% of the time, ${(100*bOff).toFixed(1)}% without the edge (Easy ${T.contact.MOVES.dummy.bite[0]} + ${V.bite})`);
  ok(nOn === nOff, `and with the same draws (${nOn}, ${nOff})`);
  // On Fire: sooner and longer for your side; the CPU's as it was
  m = scene();
  E.heat(0, 'hit'); ok(!E.onFire(0) && m.fire[0].heat === 1, 'one good moment: not yet');
  E.heat(0, 'turnover'); ok(E.onFire(0) && near(m.fire[0].t, V.fire.secs*T.stamina.staminaLasts(0)), `two unanswered light your side, for ${V.fire.secs} match seconds by its Stamina (${m.fire[0].t})`);
  m = scene(); E.heat(0, 'try'); ok(!E.onFire(0) && m.fire[0].heat === 1, 'a try is one moment, not two: on its own it does not light it');
  E.heat(0, 'line'); ok(E.onFire(0), 'a try and a Line Break do');
  m = scene(); E.heat(0, 'hit'); E.heat(1, 'break'); ok(m.fire[0].heat === 0, 'the CPU\'s broken tackle still breaks your run');
  E.heat(0, 'break'); ok(m.fire[0].heat === 0, 'and your broken tackle still builds nothing');
  E.heat(1, 'hit'); E.heat(1, 'hit'); ok(!E.onFire(1) && m.fire[1].heat === 2, 'the CPU still needs three');
  E.heat(1, 'hit'); ok(E.onFire(1) && near(m.fire[1].t, T.arcade.ARCADE.fire.secs*T.stamina.staminaLasts(1)), 'and burns its twelve');
  m = scene({ diff:1 }); E.heat(0, 'hit'); E.heat(0, 'hit'); ok(!E.onFire(0), 'Normal: three, as ever'); E.heat(0, 'hit'); ok(near(m.fire[0].t, T.arcade.ARCADE.fire.secs*T.stamina.staminaLasts(0)), 'for twelve');
  // the meter, in thirds: a run of 1 of 2 shows half full
  m = scene(); D.setMode('match'); E.heat(0, 'hit'); D.updateHud();
  ok($('h-f0').style.getPropertyValue('--n') === '1.5' && $('h-f1').style.getPropertyValue('--n') === '0', `the meter: your one point of two fills half of it (--n ${$('h-f0').style.getPropertyValue('--n')})`);
  m = scene({ diff:1 }); E.heat(0, 'hit'); E.heat(0, 'hit'); D.updateHud(); ok($('h-f0').style.getPropertyValue('--n') === '2', `Normal: two of three, as before (--n ${$('h-f0').style.getPropertyValue('--n')})`);
}
done('2 levers');

/* 3. The Line Break */
begin('3 Line Break');
{
  const V = E.EDGE, K = V.brk;
  const scene = (o = {}) => {   // your 4 running at 8 m/s from x 60 along y 35, their 11 in front of him; everyone else far off
    T.newMatch(o.a || X.NATIONS[0], o.b || X.NATIONS[1], { halfLen:600, headless:false, humans:[true, false], duels:'off', diff:0, arcade:true, ...o });
    D.setMode('match');
    const m = M(); m.phase = 'play'; m.set = null; m.clock = 30;
    for (const p of m.players) { p.x = p.team ? 20 + p.n : 15 + p.n; p.y = 4 + p.n*4; p.vx = p.vy = 0; p.down = 0; p.bind = null; }
    const c = m.players[3], q = m.players[10];
    c.x = 60; c.y = 35; c.vx = 8; c.vy = 0; q.x = 66; q.y = 35;
    const b = m.ball; b.state = 'held'; b.carrier = c; b.f = null; c.hold = 0.5;
    T.sides.setCtrl(0, c);
    said.length = 0; heard.length = 0;
    return { m, c, q };
  };
  let { m, c, q } = scene();
  ok(E.line(c) === false && m.lb && m.lb.had && !m.lb.fired, 'a man in front of him: no break yet, and the carry remembers him');
  q.x = 56; q.y = 33; c.hold = 0.6;
  const r0 = rndCalls(), stop0 = m.stop;
  ok(E.line(c) === true && m.stats.lineBreak0 === 1, 'past him, and nobody else in front within the lane: Line Break');
  ok(rndCalls() === r0, 'it draws no random number');
  ok(said.includes('Line Break'), `called: ${said.join(', ')}`);
  ok(heard.includes('whoosh') && heard.includes('cheer'), `a whoosh and the crowd (${heard.join(', ')})`);
  ok(m.fire[0].heat === 1 && (m.stats.heat_line || 0) === 1, 'a heat point towards On Fire');
  ok(near(m.stop, K.stop/1000) && stop0 === 0 && !(m.shake > 0), `a ${K.stop}ms hold, with no shake (a Big Hit's is ${T.arcade.ARCADE.hit.stop}ms)`);
  ok(K.stop < T.arcade.ARCADE.hit.stop, 'shorter than a Big Hit\'s');
  m.stop = 0; said.length = 0; c.hold = 0.8;
  ok(E.line(c) === false && m.stats.lineBreak0 === 1 && !said.includes('Line Break'), 'once a carry: not again');
  q.x = 70; c.hold = 0.9; E.line(c); q.x = 56; c.hold = 1.0;
  ok(E.line(c) === false && m.stats.lineBreak0 === 1, 'not even past another man in the same carry');
  c.hold = 0.05; q.x = 66; E.line(c); q.x = 56; c.hold = 0.1;
  ok(E.line(c) === true && m.stats.lineBreak0 === 2, 'his next carry (his time on the ball starts again at a catch) can have its own');
  // the cover's lag
  ({ m, c, q } = scene()); E.line(c); q.x = 56; q.y = 33;
  const cover = m.players[12]; cover.x = 75; cover.y = 60; cover.vx = -1; cover.vy = 2;
  E.line(c);
  let tg = E.matchTargets().get(cover);
  ok(tg && near(tg.x, cover.x + cover.vx*0.5) && near(tg.y, cover.y + cover.vy*0.5) && near(tg.s, Math.hypot(cover.vx, cover.vy)), `for ${V.lag}s the CPU's cover runs on as it was running`);
  m.dclock += V.lag + 0.01; tg = E.matchTargets().get(cover);
  ok(tg && !(near(tg.x, cover.x + cover.vx*0.5) && near(tg.y, cover.y + cover.vy*0.5)), `then it reacts (${tg && tg.x.toFixed(1)}, ${tg && tg.y.toFixed(1)})`);
  // when it is not
  const notIf = (label, set, o) => { ({ m, c, q } = scene(o)); E.line(c); q.x = 56; q.y = 33; c.hold = 0.6; set(m, c, q); ok(E.line(c) === false && !m.stats.lineBreak0, label); };
  notIf('not running forward', (m, c) => { c.vx = 1; });
  notIf(`not inside ${K.line}m of the line`, (m, c) => { c.x = 106; });
  notIf(`not with a man within ${K.clear}m of him`, (m, c, q) => { q.x = 59; q.y = 33.5; });
  notIf(`not with a man in front of him ${K.lane - 1}m across`, (m, c) => { m.players[11].x = 80; m.players[11].y = 35 + K.lane - 1; });
  ({ m, c, q } = scene()); q.x = 56; q.y = 33;
  ok(E.line(c) === false, 'not when nobody was in front of him in this carry: there was no line to break');
  notIf('not on Normal', () => {}, { diff:1 });
  ({ m, c, q } = scene()); V.on = false; E.line(c); q.x = 56; q.y = 33; ok(E.line(c) === false && !m.stats.lineBreak0 && !m.lb, 'not with EDGE off'); V.on = true;
  // the CPU's carrier never has one
  ({ m } = scene()); const k = m.players[10]; k.x = 60; k.y = 35; k.vx = -8; const own = m.players[3]; own.x = 54; own.y = 35; m.ball.carrier = k; k.hold = 0.5;
  E.line(k); own.x = 64; k.hold = 0.6; ok(E.line(k) === false && !m.stats.lineBreak1, 'the CPU\'s carrier: never');
  // the youngest: the call and the sound, no slow-motion
  for (const [label, o] of [['Kids', { kids:true, kidsR:1 }], ['Minis', { a:{ ...X.CLUBS[2], id:'MNI', cat:'minis' }, b:{ ...X.CLUBS[4], cat:'minis' } }]]) {
    ({ m, c, q } = scene(o)); E.line(c); q.x = 56; q.y = 33; c.hold = 0.6;
    ok(E.matchMild() && E.line(c) === true && said.includes('Line Break') && heard.includes('cheer') && m.stop === 0 && m.fire[0].heat === 1, `${label}: Line Break called and heard, the heat point, and no slow-motion`);
  }
  // in a real match on Easy, through the frame loop's own path
  let breaks = 0, carries = 0, calls = 0;
  for (let s = 0; s < 4; s++) {
    reseed(300 + s); T.newMatch(X.NATIONS[s], X.NATIONS[(s + 2) % 6], { halfLen:120, diff:0, headless:true, duels:'live', arcade:true, humans:[true, false] });
    let n = 0, last = null, hold = 0, fired = 0;
    while (!M().over && n < 200000) {
      bot(0); T.update(STEP); n++;
      const b = M().ball, k = M().stats.lineBreak0 || 0;
      if (b.state === 'held' && b.carrier.team === 0) { if (b.carrier !== last || b.carrier.hold < hold) { carries++; last = b.carrier; fired = 0; } hold = b.carrier.hold; }
      if (k > breaks + calls) { fired += k - breaks - calls; calls = k - breaks; if (fired > 1) ok(false, `match ${s + 1}: two Line Breaks in one carry`); }
    }
    breaks += M().stats.lineBreak0 || 0; calls = 0;
    ok(!M().stats.lineBreak1, `match ${s + 1}: the CPU never has one`);
  }
  ok(breaks > 0 && breaks < carries, `the scripted bot's four Easy matches: ${breaks} Line Breaks in ${carries} carries, never two in one`);
}
done('3 Line Break');

/* 4. The words: Title Case, no arrow, no em dash */
begin('4 words');
{
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../src/edge.js', import.meta.url), 'utf8');
  const says = [...src.matchAll(/say\('([^']+)'/g)].map(m => m[1]);
  ok(says.join() === 'Line Break', `the one call: ${says.join(', ')}`);
  ok(says.every(w => w.split(' ').every(x => /^[A-Z]/.test(x))), 'Title Case');
  ok(!/[←→↑↓⇐⇒➜»›—]/.test(src), 'no arrow glyph and no em dash');
  ok(['whoosh', 'cheer'].every(k => T.sound.SND[k]), 'its two sounds exist');
}
done('4 words');

console.log(`Edge: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
