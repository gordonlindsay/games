// Career life: Energy, Morale and Team Spirit, and the dilemmas between matches. The save, the readers, the dilemma schedule and
// table, each rule between matches, each effect in a match, what stays exactly as it was, and the hub.
// node tools/career-life.mjs   Exits 1 on any failure.
// GAME=/path/to/an/older/index.html node tools/career-life.mjs --pins   prints that build's fingerprints, to re-pin BASE below
process.env.SEED ??= '41';
const { T, reseed, rndCalls, bot } = await import('./harness.mjs');
const { readGameSource } = await import('./source.mjs');
const C = T.career, X = T.teams, D = T.debug, L = T.careerLife, $ = id => document.getElementById(id);
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const json = v => JSON.stringify(v);
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;

// 0. What must not move. Seeded runs of everything that is not a career match: two AI v AI matches (the balance tools' simulate),
//    a match you play as Quick Match plays it (arcade, live duels) and a championship match, both by the harness's bot, the
//    menus' demo and the Defend a Breakaway drill; then a career match with the bars at rest (Energy 100, Morale 50, Team
//    Spirit 50), which must play exactly as a career match did before the bars. Pinned from 30e13e2, the commit before them:
//    GAME=<30e13e2's trylinerugby/index.html> node tools/career-life.mjs --pins
//    The championship match (third) is re-pinned for star traits (src/traits.js), which act in matches you play between star
//    sides: with traitOn forced off the merged build gives 30e13e2's opguqv again.
//    Re-pinned again at the team hierarchy merge, data only: the AI v AI simulate (first) is career.mjs's own fingerprint, which moved
//    with the nations' XV ratings (career.mjs notes the old ratings give the old value); the championship match (third) is England v
//    Italy, both re-rated; the demo (fourth) draws from ALL_TEAMS, which the new leagues enlarged. The Quick Match and the drill hold.
//    Re-pinned again at club seasons (2026-11-08): `rest` is a career match at Farnham, and a career's first year is no longer the
//    Minis, so its two sides play at full strength instead of one off every ability. With the Minis' sides put back (careerMatch's
//    `minis`, the same draw with CAREER_CUT[0] on both) this build gives the pin from before the bars, `restMinis`, exactly.
const BASE = { others:'lhsdx3 1foeejc 1ga5bkq 11tx4fr 83k82g', rest:'1gof0cz', restMinis:'1ibpkeg' };   // re-pinned at the PR #14 merge for its calmer passing (PASS_FLIGHT: the ball hangs longer and a catcher gets a moment): with PASS_FLIGHT='{"match":1,"kids":1,"grace":[0,0,0],"graceKids":0}' this build gives the old pin exactly, 1o2r2g2 1fohttg 1230j1m c6ydhd 83k82g, 1qet6a1 and 1p6a14j (the drill, 83k82g, did not move)
const runOut = (side = 0) => { let n = 0; while (!T.M.over && n < 400000) { bot(side); T.update(T.STEP); n++; } return n; };
const pos = () => T.M.players.map(p => [p.x.toFixed(6), p.y.toFixed(6)]).join(';');
function others() {
  const out = [];
  reseed(23); out.push(json(T.simulate(2, 60, 1).map(r => [r.teams, r.score, r.tries, r.steps])));
  reseed(101); T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:1, headless:true, humans:[true, false], arcade:true, duels:'live' });
  out.push(json([T.M.score, T.M.tries, T.M.stats, runOut()]));
  reseed(102); T.newMatch(X.NATIONS[0], X.NATIONS[3], { halfLen:60, diff:2, headless:true, humans:[true, false], arcade:true, duels:'live', champ:true });
  out.push(json([T.M.score, T.M.tries, T.M.stats, runOut()]));
  reseed(55); D.exitMatch(); for (let i = 0; i < 4000; i++) T.update(T.STEP);
  out.push(json([T.M.demo, T.M.score, pos()]));
  reseed(77); T.practice.start('defend'); for (let i = 0; i < 1500; i++) { bot(0); T.update(T.STEP); }
  out.push(json([pos(), T.M.ball.x.toFixed(6), T.M.ball.y.toFixed(6)])); T.practice.leave();
  return out.map(fnv).join(' ');
}
function careerMatch(life, seed = 131, o = {}) {   // a career match through careerArm, played by the bot to full time: its fingerprint
  reseed(31);
  const cr = C.create({ pos:'B', num:5, club:X.CLUBS[0] }); C.set(cr);
  if (o.minis) cr.season.teams = cr.season.teams.map(t => { const m = { ...t }; for (const [k] of T.stamina.ABILITIES) if (k in m) m[k] = Math.max(1, m[k] - 1); return m; });   // the Minis' sides, as careers had them before club seasons
  if (L && life) Object.assign(cr.life, life);
  reseed(seed);
  T.newMatch(cr.season.teams[0], cr.season.teams[1], { halfLen:60, diff:1, headless:true, humans:[true, false], arcade:true, duels:'live' });
  C.arm();
  if (o.noLife) T.M.careerLife = null;
  if (o.pro) T.M.careerPro = true;
  const n = runOut(), M = T.M, out = fnv(json([M.score, M.tries, M.stats, M.careerDeeds, n]));
  C.set(null);
  return out;
}
const REST = { energy:100, morale:50, spirit:50 };
if (process.argv.includes('--pins')) { console.log(json({ others:others(), rest:careerMatch(REST) })); process.exit(0); }
{
  const now = others();
  ok(now === BASE.others, `AI v AI, a Quick Match, a championship match, the demo and a drill play exactly as before the bars (${now}, pinned ${BASE.others})`);
}

// the browser save, counted; the career screens join the harness's list so showScreen toggles them
const memory = {}; let writes = 0;
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; writes++; } };
const saved = () => JSON.parse(memory['tryline.v1']);
{ const qsa = document.querySelectorAll, mine = ['s-career-new', 's-career', 's-career-train', 's-career-table', 's-career-end'];
  document.querySelectorAll = sel => (sel === '.screen' ? qsa(sel).concat(mine.map(id => $(id))) : qsa(sel)); }
const shown = () => ['s-home', 's-career-new', 's-career', 's-career-train', 's-career-table', 's-career-end'].find(id => !$(id).hidden);
const skillKeys = C.skills().map(([k]) => k), barKeys = L.KEYS.map(([k]) => k);
const LF = L.LIFE;
// a career match to full time through the real path: Play Match, then the hooter
function playOut(us, them, o = {}) {
  ok(C.play(), 'Play Match starts a career match');
  T.M.half = 2; T.M.score = [us, them]; T.M.tries = [Math.floor(us/5), Math.floor(them/5)];
  T.M.careerDeeds = { tries:0, tackles:0, goals:0, ...(o.deeds || {}) };
  if (o.passes != null) T.M.careerLifeStats.passes = o.passes;
  T.arcade.endHalf();
  D.exitMatch();
}
const withId = (cr, id) => { cr.season.id = id; return cr; };

// 1. the save
{
  const cr = C.create({ pos:'F', num:2, club:X.CLUBS[0] });
  ok(json(cr.life) === json({ energy:80, morale:60, spirit:50, done:'' }), `a new career starts at Energy 80, Morale 60, Team Spirit 50 (${json(cr.life)})`);
  ok(json(C.clean(cr)) === json(cr), 'a new career passes its own validator unchanged');
  const old = JSON.parse(json(cr)); delete old.life;
  ok(json(C.clean(old).life) === json({ energy:80, morale:60, spirit:50, done:'' }), 'a career saved before the bars comes back at 80, 60 and 50');
  const bad = C.clean({ ...JSON.parse(json(cr)), life:{ energy:140, morale:-9, spirit:'x', done:'<b>' } }).life;
  ok(bad.energy === 100 && bad.morale === 0 && bad.spirit === 50 && bad.done === '', `bars are held to 0 to 100, a bad one takes its start (${json(bad)})`);
  ok(C.clean({ ...JSON.parse(json(cr)), life:{ energy:41.6, morale:59.4, spirit:12 } }).life.energy === 42 && C.clean({ ...JSON.parse(json(cr)), life:{ energy:41.6, morale:59.4, spirit:12 } }).life.morale === 59, 'and are whole numbers');
  ok(json(C.clean({ ...JSON.parse(json(cr)), life:[] }).life) === json(L.fresh()) && json(C.clean({ ...JSON.parse(json(cr)), life:null }).life) === json(L.fresh()), 'a life that is not an object is the start');
  ok(C.clean({ ...JSON.parse(json(cr)), life:{ ...cr.life, done:cr.season.id + ':3' } }).life.done === cr.season.id + ':3' && C.clean({ ...JSON.parse(json(cr)), life:{ ...cr.life, done:'x:9' } }).life.done === '', 'the answered dilemma is kept, a broken key dropped');
  C.set(cr); cr.life.energy = 33; X.save();
  ok(json(saved().career.life) === json(cr.life), 'the bars are saved with the career');
  C.set(null); X.load();
  ok(json(C.get()) === json(cr), 'and load back exactly');
  C.set(null);
}

// 2. the readers
{
  C.set(null);
  if (T.M && T.M.career) D.exitMatch();
  ok(L.spirit() === 0.5 && L.morale() === 0.5 && L.energy() === 0.5, 'with no career every reader is 0.5');
  const cr = C.create({ pos:'B', num:6, club:X.CLUBS[1] }); C.set(cr);
  Object.assign(cr.life, { energy:30, morale:75, spirit:90 });
  ok(near(L.energy(), 0.3) && near(L.morale(), 0.75) && near(L.spirit(), 0.9), 'on the hub they read the career');
  C.play();
  ok(json(T.M.careerLife) === json({ energy:30, morale:75, spirit:90 }), 'careerArm takes the bars as they are at kick-off');
  cr.life.spirit = 10; cr.life.energy = 99;
  ok(near(L.spirit(), 0.9) && near(L.energy(), 0.3), 'and in the match the readers keep them, whatever the career does');
  D.exitMatch();
  ok(near(L.spirit(), 0.1), 'back on the hub, the career again');
  C.set(null);
}

// 3. the dilemma schedule
{
  const cr = C.create({ pos:'B', num:4, club:X.CLUBS[0] });
  const r0 = rndCalls();
  let all = [], seen = new Set(), plans = new Set(), firsts = 0, repeats = 0, gapRun = 0, worstGap = 0;
  for (let i = 0; i < 600; i++) {
    cr.year = 1 + i % 5; withId(cr, 'career-test-' + i.toString(36) + '-' + (i % 7));
    const plan = L.plan(cr);
    all.push(...plan);
    plans.add(plan.map(d => (d ? 1 : 0)).join(''));
    if (plan[0]) firsts++;
    const ids = plan.filter(Boolean).map(d => d.id);
    if (new Set(ids).size !== ids.length) repeats++;
    for (const d of plan) { if (d) { seen.add(d.id); gapRun = 0; } else worstGap = Math.max(worstGap, ++gapRun); }
    if (plan.filter(Boolean).some(d => d.from > cr.year)) repeats += 1000;
  }
  ok(rndCalls() === r0, 'the schedule draws no random numbers');
  ok(all.filter(Boolean).length === 600*3, 'three dilemmas in every season of five rounds');
  ok(firsts === 600 && worstGap === 1, `the first round always has one, and no two rounds running go without, across a season's end too (longest gap ${worstGap})`);
  ok(plans.size === 3, `the rounds vary from season to season (${[...plans].join(', ')})`);
  ok(repeats === 0, 'never the same dilemma twice in a season, and never one before its year');
  ok(seen.size === L.DILEMMAS.length, `every dilemma comes up (${seen.size} of ${L.DILEMMAS.length})`);
  withId(cr, 'career-same-1'); cr.year = 1;
  ok(json(L.plan(cr).map(d => d && d.id)) === json(L.plan(JSON.parse(json(cr))).map(d => d && d.id)), 'the same season draws the same dilemmas');
  const first = new Set(); for (let i = 0; i < 300; i++) { withId(cr, 'career-m-' + i); cr.year = 1; for (const d of L.plan(cr)) if (d) first.add(d.id); }
  ok(['gym', 'minis', 'physio', 'school', 'swim'].every(id => !first.has(id)) && first.size >= 6, `a career's first year gets only the first year's dilemmas (${[...first].join(', ')})`);
  const second = new Set(); for (let i = 0; i < 300; i++) { withId(cr, 'career-y-' + i); cr.year = 2; for (const d of L.plan(cr)) if (d) second.add(d.id); }
  ok(['gym', 'minis'].every(id => second.has(id)) && ['physio', 'school', 'swim'].every(id => !second.has(id)), 'the second year adds Rest or Gym and Help Coach the Minis; the third and on, the rest');
  const old = { ...cr, year:undefined }; withId(old, 'career-old-1');
  ok(L.plan(old).filter(Boolean).every(d => d.from === 1), 'a career object with no year reads as year 1');
}

// 4. the table
{
  const small = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'on', 'to', 'in', 'for', 'as', 'at', 'by']);
  const titled = s => s.replace(/\?$/, '').split(/\s+/).every((w, i) => (i && small.has(w)) || /^[A-Z]/.test(w));
  const Ds = L.DILEMMAS;
  ok(Ds.length >= 8 && new Set(Ds.map(d => d.id)).size === Ds.length, `at least eight dilemmas (${Ds.length})`);
  ok(Ds.every(d => d.opts.length >= 2 && d.opts.length <= 3), 'two or three options each');
  ok(Ds.every(d => titled(d.q) && /\?$/.test(d.q) && d.q.length <= 26), `each question is short, Title Case and a question (${Ds.filter(d => !titled(d.q) || !/\?$/.test(d.q)).map(d => d.q)})`);
  const opts = Ds.flatMap(d => d.opts);
  ok(opts.every(o => titled(o.name)), `each option a Title Case name (${opts.filter(o => !titled(o.name)).map(o => o.name)})`);
  // one line each at 667x375: a name that wraps makes both buttons a line taller and the hub scrolls (Park Touch Rugby did, by 11px).
  // The widths are each letter of Big Shoulders Display 800 at 20px with the name's .02em, upper case, measured on its own in
  // headless Chromium (their sums came within half a pixel of every name rendered whole); the room is an option button's inside
  // at 667x375 (two halves of the hub's right column, less 12px each side). Re-measure both if the CSS changes: render the hub
  // with a dilemma, read .cr-opt's clientWidth less its padding, and a span of each letter inside it.
  const W20 = { A:9.27, B:9.24, C:9.5, D:9.63, E:8.04, F:7.97, G:9.55, H:9.5, I:4.72, J:8.85, K:9.58, L:7.9, M:14.22, N:10.57, O:9.65, P:9.15, Q:9.65, R:9.3, S:9.24, T:8.1, U:9.47, V:9.54, W:15.07, X:9.13, Y:9, Z:8.18, ' ':4.4 };
  const ROOM = 133, wide = n => [...n.toUpperCase()].reduce((a, ch) => a + (W20[ch] ?? W20.W), 0);
  const widest = opts.reduce((a, o) => (wide(o.name) > wide(a.name) ? o : a));
  ok(opts.every(o => wide(o.name) <= ROOM), `each option name fits one line of its button at 667x375 (widest ${widest.name}, ${wide(widest.name).toFixed(1)} of ${ROOM}px; too wide: ${opts.filter(o => wide(o.name) > ROOM).map(o => o.name + ' ' + wide(o.name).toFixed(1))})`);
  ok(opts.every(o => Object.keys(o.fx).length >= 1 && Object.keys(o.fx).length <= 2 && Object.keys(o.fx).every(k => skillKeys.includes(k) || barKeys.includes(k))), 'one or two effects each, every one a skill or a bar (two chips fit the hub at 667x375)');
  ok(opts.every(o => Object.values(o.fx).some(v => v > 0) && Object.values(o.fx).every(v => Number.isInteger(v) && Math.abs(v) <= 20)), 'every option gives something: no dilemma is a trap');
  ok(opts.every(o => Object.entries(o.fx).every(([k, v]) => v > 0 || k === 'energy')), 'the only cost is Energy');
  ok(opts.filter(o => skillKeys.some(k => o.fx[k] >= 2)).every(o => o.fx.energy < 0), 'training (two skill points) always costs Energy');
  ok(opts.filter(o => o.fx.spirit > 0).every(o => o.fx.morale > 0 || o.fx.pace > 0 || o.fx.energy > 0 || o.fx.spirit >= 10) && opts.filter(o => o.fx.energy >= 20).every(o => Object.keys(o.fx).length === 1), 'going out with the team builds Team Spirit, resting is Energy');
  ok(Ds.every(d => d.opts.some(o => (o.fx.energy || 0) >= 0)), 'every dilemma has an option that costs no Energy');
  const words = /\b(beer|pub|bar|wine|drink|drunk|money|cash|bet|betting|casino|party all night|kiss|date|£|\$)\b/i;
  ok(Ds.every(d => !words.test(d.q) && d.opts.every(o => !words.test(o.name))), 'nothing grown-up: no drink, no money, no dates');
  ok(Ds.every(d => [1, 2, 3].includes(d.from)) && Ds.filter(d => d.from === 1).length >= 6, 'enough for a first year, more from the second year on');
}

// 5. picking an option
{
  const cr = C.create({ pos:'B', num:5, club:X.CLUBS[0] }); C.set(cr);
  for (let i = 0; i < 99 && L.dilemma(cr).id !== 'pizza'; i++) withId(cr, 'career-pick-' + i);
  const d = L.dilemma(cr);
  ok(d && d.id === 'pizza' && cr.season.round === 0, 'a season opens with a dilemma');
  const h0 = cr.skills.handling, w0 = writes;
  ok(L.choose(0) && cr.skills.handling === h0 + 2 && cr.life.energy === 65, 'Extra Training: Handling +2, Energy −15');
  ok(writes > w0 && saved().career.life.done === cr.season.id + ':0', 'the answer is saved');
  ok(json(C.last()) === json({ kind:'dilemma', gains:{ handling:2 }, life:{ energy:-15 } }), 'the hub is told what it gave');
  ok(L.dilemma(cr) === null && !L.choose(1) && cr.life.spirit === 50, 'one answer a round');
  C.set(null); X.load();
  ok(L.dilemma(C.get()) === null && C.get().skills.handling === h0 + 2, 'reloaded: still answered');
  // clamps
  const c2 = C.create({ pos:'B', num:5, club:X.CLUBS[0] }); C.set(c2);
  for (let i = 0; i < 99 && L.dilemma(c2).id !== 'pizza'; i++) withId(c2, 'career-pick-' + i);
  c2.life.spirit = 95; c2.life.morale = 97;
  ok(L.choose(1) && c2.life.spirit === 100 && c2.life.morale === 100 && json(C.last().life) === json({ spirit:5, morale:3 }), 'a bar stops at 100, and the hub shows what really moved');
  const c3 = C.create({ pos:'B', num:5, club:X.CLUBS[0] }); C.set(c3);
  for (let i = 0; i < 99 && L.dilemma(c3).id !== 'pizza'; i++) withId(c3, 'career-pick-' + i);
  c3.life.energy = 9; c3.skills.handling = 98;
  ok(L.choose(0) && c3.life.energy === 0 && c3.skills.handling === 99, 'and at 0, a skill at 99');
  ok(!L.choose(5), 'an option that is not there does nothing');
  // a reload shows the same card
  const c4 = C.create({ pos:'B', num:5, club:X.CLUBS[0] }); C.set(c4); X.save();
  const before = L.dilemma(c4).id;
  C.set(null); X.load();
  ok(L.dilemma(C.get()).id === before, 'a reload shows the same dilemma');
  // practice writes nothing
  T.practice.start('defend'); const w1 = writes, s1 = json(C.get());
  ok(!L.choose(0) && writes === w1 && json(C.get()) === s1, 'not from a drill');
  T.practice.leave();
  // the rules never stop a match: an unanswered round is skipped, the next round has its own
  const c5 = C.create({ pos:'B', num:5, club:X.CLUBS[0] }); C.set(c5);
  const life5 = json(c5.life), plan5 = L.plan(c5);
  playOut(10, 5);
  ok(c5.season.round === 1 && L.dilemma(c5) === plan5[1], 'a match played with the dilemma unanswered skips it; the next round has its own (or none)');
  ok(c5.life.done === '' && JSON.parse(life5).done === '', 'and nothing was answered for it');
  C.set(null);
}

// 6. between matches
{
  const cr = C.create({ pos:'F', num:1, club:X.CLUBS[0] }); C.set(cr);
  cr.life.energy = 50;
  C.trainDone({ id:'egg', stars:2, success:true });
  ok(cr.life.energy === 50 + LF.energy.train && json(C.last().life) === json({ energy:LF.energy.train }), `a training session costs ${-LF.energy.train} Energy`);
  cr.trained = false; const e = cr.life.energy;
  C.trainDone({ id:'egg', stars:0, quit:true });
  ok(cr.life.energy === e, 'a drill left before it finished costs nothing');
  // full time: Energy back, Morale from the result, Team Spirit from his part
  Object.assign(cr.life, { energy:40, morale:50, spirit:50 }); cr.trained = true;
  playOut(20, 5, { passes:19, deeds:{ tries:1, tackles:3, goals:0 } });
  const back = Math.max(LF.energy.backMin, Math.round(60*LF.energy.back));
  ok(cr.life.energy === 40 + back, `Energy comes back by a fifth of what is missing (${cr.life.energy})`);
  ok(cr.life.morale === 50 + LF.morale.win + LF.morale.deedCap, `a win and four deeds: Morale +${LF.morale.win} +${LF.morale.deedCap} (${cr.life.morale})`);
  ok(cr.life.spirit === 50 + LF.spirit.fade + Math.floor(19/LF.spirit.passes) + LF.spirit.tryPts, `Team Spirit: ${LF.spirit.fade}, +1 for each ${LF.spirit.passes} passes, +${LF.spirit.tryPts} a try (${cr.life.spirit})`);
  ok(json(C.last().life) === json({ energy:back, morale:LF.morale.win + LF.morale.deedCap, spirit:cr.life.spirit - 50 }) && cr.life.spirit !== 50, `the hub is told (${json(C.last())})`);
  Object.assign(cr.life, { energy:97, morale:90, spirit:3 });
  playOut(3, 30, { passes:0 });
  ok(cr.life.energy === 100 && cr.life.morale === 90 - Math.round(40*LF.morale.drift) + LF.morale.loss && cr.life.spirit === 0, `a loss: Morale drifts to the middle and drops; nothing goes over 100 or under 0 (${json(cr.life)})`);
  Object.assign(cr.life, { morale:20, spirit:50 });
  playOut(10, 10, { passes:400, deeds:{ tries:5 } });
  ok(cr.life.morale === 20 + Math.round(30*LF.morale.drift) + LF.morale.draw + LF.morale.deedCap && cr.life.spirit === 50 + LF.spirit.fade + LF.spirit.cap, `a draw lifts a low Morale; Team Spirit takes ${LF.spirit.cap} at most from a match (${json(cr.life)})`);
  ok(LF.energy.backMin > 0 && LF.spirit.fade < 0, 'Energy always comes back some, Team Spirit always fades if never tended');
  // the higher Team Spirit is, the faster it fades: 1 more for every LF.spirit.high above 50, so his part in a match never holds it up
  { const c6 = C.create({ pos:'B', num:5, club:X.CLUBS[0] }); C.set(c6);
    Object.assign(c6.life, { spirit:100 });
    playOut(10, 5, { passes:400, deeds:{ tries:5 } });
    ok(c6.life.spirit === 100 + LF.spirit.fade - Math.floor(50/LF.spirit.high) + LF.spirit.cap && c6.life.spirit < 100, `at 100 it fades ${-LF.spirit.fade + Math.floor(50/LF.spirit.high)}: even the most a match can give (${LF.spirit.cap}) leaves it lower (${c6.life.spirit})`);
    Object.assign(c6.life, { spirit:79 });
    playOut(10, 5, { passes:0 });
    ok(c6.life.spirit === 79 + LF.spirit.fade - Math.floor(29/LF.spirit.high), `at 79, ${-LF.spirit.fade + Math.floor(29/LF.spirit.high)} (${c6.life.spirit})`);
    C.set(cr); }
  delete cr.life; cr.trained = false;
  C.trainDone({ id:'egg', stars:1 }); playOut(5, 5);
  ok(cr.life && cr.life.energy === 72 + Math.max(LF.energy.backMin, Math.round(28*LF.energy.back)) && cr.season.round > 0, 'a career object made without its bars gets them, rather than breaking a session or a full time');
  C.set(null);
}

// 6b. Team Spirit in a cup: no fade and no gain from a cup match, so it carries over from the league unchanged and goes on in the next
//     league or international season. Whole scripted runs through the real path (Play Match, full time, Continue between phases) with
//     the real cups engine: the European Cup and the World Cup after a won league, the Home Nations Tour after a six, each match with
//     the passes and tries that would give a league round the most it can. Energy and Morale move at every one, as ever.
{
  const K = C.cups(), club = id => X.NATIONAL.flat().find(t => t.id === id), clip = v => Math.max(0, Math.min(100, v));
  const rule = (l, us, them, o, cup) => {            // the bars after a match, by the rules, from the bars before it
    const did = Math.min(LF.morale.deedCap, ['tries', 'tackles', 'goals'].reduce((a, k) => a + (o.deeds[k] || 0), 0)*LF.morale.deed);
    const inv = Math.min(LF.spirit.cap, Math.floor(o.passes/LF.spirit.passes) + (o.deeds.tries || 0)*LF.spirit.tryPts);
    return { energy:clip(l.energy + Math.max(LF.energy.backMin, Math.round((100 - l.energy)*LF.energy.back))),
      morale:clip(l.morale - Math.round((l.morale - 50)*LF.morale.drift) + (us > them ? LF.morale.win : us < them ? LF.morale.loss : LF.morale.draw) + did),
      spirit:cup ? l.spirit : clip(l.spirit + LF.spirit.fade - Math.floor(Math.max(0, l.spirit - 50)/LF.spirit.high) + inv) };
  };
  const BUSY = { passes:30, deeds:{ tries:3, tackles:2, goals:1 } };   // in a league round: +6 Team Spirit, the most a match gives
  const play = (cr, us, them, o, tag) => {           // one match through Play Match and full time; true when the bars are as the rules say
    const cup = !cr.season && !!cr.cup, before = { ...cr.life };
    playOut(us, them, o);
    const want = rule(before, us, them, o, cup), got = { energy:cr.life.energy, morale:cr.life.morale, spirit:cr.life.spirit };
    const fine = json(got) === json(want) && (!cup || !('spirit' in ((C.last() && C.last().life) || {})));
    if (!fine) console.log('  ', tag, json(before), json(o), 'got', json(got), 'want', json(want), json(C.last()));
    return fine;
  };
  const run = (cr, us, them, o, tag) => { let n = 0, fine = true; while (C.ahead(cr) && n < 12) { fine = play(cr, us, them, o, tag + ' ' + n) && fine; n++; } return { n, fine }; };
  ok(K && K.cupNew === T.cups.cupNew, 'the career plays the real cups engine here');
  // a back at Bath in a World Cup year: the league won, the European Cup, the World Cup, then year 5's league, its European Cup and the six
  const cr = C.create({ pos:'B', num:7, club:club('BTH') }); C.set(cr);
  cr.year = 4; cr.country = 'ENG'; for (const k of skillKeys) cr.skills[k] = 90;
  Object.assign(cr.life, { energy:50, morale:50, spirit:70 });
  const lg = run(cr, 30, 0, { passes:12, deeds:{ tries:1 } }, 'league');
  ok(lg.n === 5 && lg.fine && cr.season.round === 5 && cr.life.spirit < 70, `the league as ever: Team Spirit fades and gains at each round (70 to ${cr.life.spirit})`);
  const held = cr.life.spirit, e0 = cr.life.energy, m0 = cr.life.morale;
  C.advance();
  ok(cr.phase === 'cup' && cr.cup && cr.cup.id === 'euro', 'the league won: the European Cup');
  const eu = run(cr, 30, 0, BUSY, 'euro');
  ok(eu.n === 2 && eu.fine && cr.life.spirit === held, `the European Cup, Semi-Final and Final: Team Spirit exactly where the league left it (${held}), Energy and Morale as ever (${e0} to ${cr.life.energy}, ${m0} to ${cr.life.morale})`);
  ok(K.cupWinner(cr.cup) === cr.cup.user, 'and won');
  C.advance();
  ok(cr.phase === 'intl' && cr.cup && cr.cup.id === 'world' && !cr.season, 'then the World Cup, in year 4');
  const wc = run(cr, 30, 0, BUSY, 'world');
  ok(wc.n === 5 && wc.fine && cr.life.spirit === held, `the World Cup, two pool matches and three knockouts: still ${held} (${cr.life.spirit})`);
  C.advance(); ok(cr.phase === 'transfer', 'then the transfer window');
  C.sign(null);
  ok(cr.year === 5 && cr.phase === 'league' && cr.life.spirit === held, 'the next year starts at the cups\' Team Spirit');
  const r1 = { ...cr.life };
  ok(play(cr, 30, 0, { passes:12, deeds:{ tries:1 } }, 'next league') && cr.life.spirit !== held && cr.life.spirit === rule(r1, 30, 0, { passes:12, deeds:{ tries:1 } }, false).spirit, `and its first league round fades and gains again (${held} to ${cr.life.spirit})`);
  const rest = run(cr, 30, 0, { passes:0, deeds:{} }, 'league 5');
  ok(rest.n === 4 && rest.fine, 'the rest of the league as ever');
  const held5 = cr.life.spirit;
  C.advance(); ok(cr.phase === 'cup', 'the league won again: the European Cup');
  const eu5 = run(cr, 30, 0, BUSY, 'euro 5');
  ok(eu5.fine && cr.life.spirit === held5, `held there too (${held5})`);
  C.advance();
  ok(cr.phase === 'intl' && cr.season && !cr.cup, 'then his country\'s six, in a year without a World Cup');
  ok(play(cr, 30, 0, { passes:0, deeds:{} }, 'six') && cr.life.spirit === held5 + LF.spirit.fade - Math.floor(Math.max(0, held5 - 50)/LF.spirit.high), `and the international season fades it again (${held5} to ${cr.life.spirit})`);
  C.set(null);
  // a forward at Dublin in a tour year: the league lost, his country's six, the Home Nations Tour, then year 7's league
  const fw = C.create({ pos:'F', num:2, club:club('DUB') }); C.set(fw);
  fw.year = 6; fw.country = 'IRE'; for (const k of skillKeys) fw.skills[k] = 95;
  Object.assign(fw.life, { energy:60, morale:60, spirit:40 });
  const lost = run(fw, 0, 30, { passes:6, deeds:{} }, 'league lost');
  C.advance();
  ok(lost.fine && fw.phase === 'intl' && fw.season, 'no league title: on to his country\'s six');
  const six = run(fw, 30, 0, { passes:24, deeds:{ tries:1 } }, 'six');
  ok(six.n === 5 && six.fine, `the six as a league (${fw.life.spirit})`);
  const held6 = fw.life.spirit;
  C.advance();
  ok(fw.phase === 'tour' && fw.cup && fw.cup.id === 'tour', 'then the Home Nations Tour, in year 6');
  const tests = [[30, 0], [0, 30], [30, 0]].map(([us, them], i) => (C.ahead(fw) ? play(fw, us, them, BUSY, 'Test ' + (i + 1)) && fw.life.spirit === held6 : true));
  ok(tests.every(Boolean) && !C.ahead(fw) && fw.life.spirit === held6, `three Tests, won, lost and won: Team Spirit still ${held6}, Morale up and down with them (${fw.life.morale})`);
  C.advance(); C.sign(null);
  ok(fw.year === 7 && fw.phase === 'league' && play(fw, 10, 20, { passes:6, deeds:{} }, 'year 7') && fw.life.spirit === rule({ ...fw.life, spirit:held6 }, 10, 20, { passes:6, deeds:{} }, false).spirit, `year 7's league goes on from it (${held6} to ${fw.life.spirit})`);
  C.set(null);
}

// 7. a career match: what the bars do
{
  const cr = C.create({ pos:'B', num:6, club:X.CLUBS[0] }); C.set(cr);
  const nat = life => { Object.assign(cr.life, life); C.play(); const n = { ...T.M.careerNat }; D.exitMatch(); return n; };
  const rest = nat(REST), happy = nat({ ...REST, morale:100 }), sad = nat({ ...REST, morale:0 });
  const want = (k, f) => C.natFor(T.M.nat[0], { ...cr.skills, [k]:cr.skills[k]*f })[k];
  C.play(); const team = T.M.nat[0]; D.exitMatch();
  ok(skillKeys.every(k => near(happy[k], C.natFor(team, Object.fromEntries(skillKeys.map(q => [q, cr.skills[q]*1.05])))[k]) && near(sad[k], C.natFor(team, Object.fromEntries(skillKeys.map(q => [q, cr.skills[q]*0.95])))[k])), 'Morale 100 plays his skills 5% higher, Morale 0 5% lower');
  ok(skillKeys.every(k => rest[k] === C.natFor(team, cr.skills)[k]), 'and Morale 50 not at all');
  ok(skillKeys.every(k => happy[k] > rest[k] && sad[k] < rest[k]), 'every skill moves with it');
  const tired = nat({ ...REST, energy:0 }), half = nat({ ...REST, energy:30 }), fresh60 = nat({ ...REST, energy:60 });
  ok(fresh60.stamina === rest.stamina && skillKeys.every(k => k === 'stamina' || tired[k] === rest[k]), 'Energy 60 or more changes nothing, and Energy only ever touches Stamina');
  ok(near(tired.stamina, Math.max(0, rest.stamina - LF.energy.most)) && near(half.stamina, Math.max(0, rest.stamina - LF.energy.most/2)), `Energy 0 takes ${LF.energy.most} Stamina points off for the match (down to 0), Energy 30 half that`);
  // through the existing terms: a shorter sprint, more fade late in the half
  Object.assign(cr.life, { ...REST, energy:0 }); C.play();
  const M = T.M, me = M.careerP; M.clock = M.halfLen;
  const tiredDrain = C.sprintDrain(me), tiredFade = C.fade(me); D.exitMatch();
  Object.assign(cr.life, REST); C.play(); T.M.clock = T.M.halfLen;
  const restDrain = C.sprintDrain(T.M.careerP), restFade = C.fade(T.M.careerP); D.exitMatch();
  ok(tiredDrain > restDrain && tiredFade < restFade, `a tired player's sprint runs out sooner (drain ×${(tiredDrain/restDrain).toFixed(3)}) and he fades more by the hooter (top speed ×${(tiredFade/restFade).toFixed(3)})`);
  // Team Spirit: catches
  Object.assign(cr.life, { ...REST, spirit:100 }); C.play();
  const me2 = T.M.careerP, mate = T.M.players.find(p => p.team === 0 && p !== me2), foe = T.M.players.find(p => p.team === 1);
  ok(near(L.hands(me2, 'pass', { lifeFrom:false }), 1 - LF.spirit.hands) && near(L.hands(mate, 'pass', { lifeFrom:true }), 1 - LF.spirit.hands), `Team Spirit 100: a pass to him, or from him, is knocked on ${LF.spirit.hands*100}% less often`);
  ok(L.hands(mate, 'pass', { lifeFrom:false }) === 1 && L.hands(me2, 'kick', null) === 1 && L.hands(me2, 'intercept', null) === 1 && L.hands(foe, 'pass', { lifeFrom:false }) === 1, 'anyone else\'s pass, a kick or an intercept: as ever');
  T.M.careerPro = true;
  ok(L.hands(me2, 'pass', {}) === 1, 'Pro Mode has its own Team Spirit, so this one stands aside there');
  D.exitMatch();
  Object.assign(cr.life, { ...REST, spirit:0 }); C.play();
  ok(near(L.hands(T.M.careerP, 'pass', {}), 1 + LF.spirit.hands), `Team Spirit 0: ${LF.spirit.hands*100}% more often`);
  D.exitMatch();
  // and through catchBall itself: 4000 passes from him to a teammate in open space, counted
  const knocks = spirit => {
    reseed(900); Object.assign(cr.life, { ...REST, spirit }); C.play();
    const M = T.M, me = M.careerP, mate = M.players.find(p => p.team === 0 && p !== me);
    for (const p of M.players) { p.x = p.team === 0 ? 40 : 100; p.y = 10 + p.n*7; }
    let n = 0;
    for (let i = 0; i < 4000; i++) {
      M.phase = 'play'; M.set = null; M.ball.state = 'air'; M.ball.carrier = null; M.ball.f = { kind:'pass', team:0, target:mate, lifeFrom:true };
      const k0 = M.stats.knocks; T.kids.catchBall(mate, 'pass'); if (M.stats.knocks > k0) n++;
    }
    D.exitMatch();
    return n;
  };
  const kHi = knocks(100), kMid = knocks(50), kLo = knocks(0);
  ok(kHi < kMid*0.85 && kLo > kMid*1.15, `knock-ons in 4000 passes from him: ${kHi} at Team Spirit 100, ${kMid} at 50, ${kLo} at 0`);
  // Team Spirit: his support line, a teammate on the ball
  const line = (spirit, o = {}) => {
    Object.assign(cr.life, { ...REST, spirit }); C.play();
    const M = T.M, me = M.careerP, mate = M.players.find(p => p.team === 0 && p !== me && p.n === 3);
    M.phase = 'play'; M.set = null;
    for (const p of M.players) { p.x = p.team === 0 ? 50 : 70; p.y = 10 + p.n*7; p.vx = p.vy = 0; p.down = 0; p.bind = null; }
    mate.x = 60; mate.y = 30; me.y = 50; me.x = 52;
    M.ball.state = 'held'; M.ball.carrier = o.carrier ? me : mate; M.ball.f = null; M.poss = 0;
    if (o.foe) M.ball.carrier = M.players.find(p => p.team === 1);
    T.sides.setCtrl(0, o.ring ? me : M.ball.carrier.team === 0 ? M.ball.carrier : mate);
    if (o.pro) M.careerPro = true;
    const t = T.contact.computeTargets().get(me), c = M.ball.carrier;
    const out = t ? { d:Math.hypot(t.x - c.x, t.y - c.y), back:(c.x - t.x), lat:Math.abs(t.y - c.y), t } : null;
    D.exitMatch();
    return out;
  };
  const s50 = line(50), s100 = line(100), s0 = line(0), s75 = line(75);
  ok(s50 && s100 && s0 && s100.d < s75.d && s75.d < s50.d && s50.d < s0.d, `his support line: ${s100.d.toFixed(1)}m from the carrier at Team Spirit 100, ${s50.d.toFixed(1)}m at 50, ${s0.d.toFixed(1)}m at 0`);
  ok(near(s100.lat, Math.max(LF.spirit.lat, s50.lat*(1 - LF.spirit.support))) && s100.back > 0 && s0.back > 0, 'closer by the pull, never tighter than its floor, and always behind the ball');
  ok(json(line(100, { pro:true }).t) === json(s50.t), 'Pro Mode: not this one');
  ok(line(100, { ring:true }) === null || json(line(100, { ring:true }).t) === json(line(50, { ring:true }).t), 'under the ring he runs where you steer him');
  ok(json(line(100, { foe:true }).t) === json(line(50, { foe:true }).t), 'and defending, as ever');
  C.set(null);
}

// 8. at rest the bars are nothing: a career match plays exactly as before them; anything else is live
{
  const rest = careerMatch(REST);
  ok(rest === BASE.rest, `a career match at Energy 100, Morale 50, Team Spirit 50 plays as pinned (${rest}, pinned ${BASE.rest})`);
  const restMinis = careerMatch(REST, 131, { minis:true });
  ok(restMinis === BASE.restMinis, `and, with the Minis' sides it was pinned on, exactly as a career match did before the bars (${restMinis}, pinned ${BASE.restMinis})`);
  ok(careerMatch(REST, 131, { noLife:true }) === rest && careerMatch({ ...REST, energy:60 }) === rest, 'the same with no bars at all, and with Energy at 60');
  ok(careerMatch({ ...REST, spirit:90 }) !== rest && careerMatch({ ...REST, morale:90 }) !== rest && careerMatch({ ...REST, energy:10 }) !== rest, 'Team Spirit, Morale and Energy each change a match once away from rest');
  // With no Pro Mode in the build, M.careerPro set by hand plays like any career match: none of this file's Team Spirit acts there.
  // Once career-pro.js is in, M.careerPro is Pro Mode itself and the match is a different one, so this proves nothing; section 7
  // already shows careerLifeHands and careerLifeSupport stand aside under M.careerPro.
  if (!T.careerPro) ok(careerMatch({ ...REST, spirit:90 }, 131, { pro:true }) === rest, 'Pro Mode with this file alone: Team Spirit moves nothing here (the Pro Mode builder owns it there)');
  ok(others() === BASE.others, 'and after career matches with every bar, everything else still plays as before');
}

// 9. Team Spirit, measured: the bot playing the whole team passes to him more with the team behind him
{
  const passesTo = (spirit, n) => {
    let to = 0;
    for (let i = 0; i < n; i++) {
      reseed(31); const cr = C.create({ pos:'B', num:5, club:X.CLUBS[0] }); C.set(cr); Object.assign(cr.life, { ...REST, spirit });
      reseed(500 + i);
      T.newMatch(cr.season.teams[0], cr.season.teams[1], { halfLen:60, diff:1, headless:true, humans:[true, false], arcade:true, duels:'live' });
      C.arm();
      let last = null, m = 0, mine = 0;
      while (!T.M.over && m < 400000) { bot(0); T.update(T.STEP); m++; const f = T.M.ball.f; if (T.M.ball.state === 'air' && f && f.kind === 'pass' && f !== last) { last = f; if (f.target === T.M.careerP) to++; if (f.target === T.M.careerP || f.lifeFrom) mine++; } }
      const got = T.M.careerLifeStats.passes; if (got < mine || got > mine + 2) counted = false; involved += got;   // a pass picked off on the step it was thrown never shows in the air here, but is counted
    }
    C.set(null);
    return to/n;
  };
  let counted = true, involved = 0;
  const lo = passesTo(20, 12), mid = passesTo(50, 12), hi = passesTo(90, 12);
  ok(counted && involved > 0, `every pass he threw or was thrown is counted for Team Spirit at full time (${involved} in 36 matches)`);
  ok(lo < mid && mid < hi && hi > lo*1.3, `passes to him a match (12 seeded, one-minute halves): ${lo.toFixed(2)} at Team Spirit 20, ${mid.toFixed(2)} at 50, ${hi.toFixed(2)} at 90`);
}

// 9b. Team Spirit over two seasons, real matches (the bot, two-minute halves) through careerArm and full time, from Team Spirit 100:
//     a player who always takes the training option (a drill every round too, and a dilemma with no training option left
//     unanswered) never goes out with the team, and it must fall clearly however much the team then plays through him;
//     one who always goes out with the team keeps it up. That is the train-or-socialise trade-off.
{
  const career2 = (policy, pre = 'career-spirit-') => {   // the seasons' ids are fixed (the game's are the clock's), so the same dilemmas come up every run
    reseed(31); const cr = withId(C.create({ pos:'B', num:5, club:X.CLUBS[0] }), pre + '0'); C.set(cr); Object.assign(cr.life, { energy:80, morale:60, spirit:100 });
    const trail = [];
    for (let i = 0; i < 10; i++) {
      if (cr.season.round >= 5) { C.advance(); C.sign(null); withId(cr, pre + '1'); }   // the season's end, the transfer window (Stay), the next year's league
      const d = L.dilemma(cr);
      if (d) { const j = d.opts.findIndex(o => (policy === 'train' ? skillKeys.some(k => o.fx[k] >= 2) : o.fx.spirit > 0)); if (j >= 0) L.choose(j); }
      if (policy === 'train' && C.drills(cr).length) { cr.trained = false; C.trainDone({ id:'egg', stars:2, success:true }); }
      const c = cr.season, pair = c.fixtures[c.round].find(q => q.includes(c.user)), opp = pair[0] === c.user ? pair[1] : pair[0];
      reseed(700 + i);
      T.newMatch(c.teams[c.user], c.teams[opp], { halfLen:120, diff:1, headless:true, humans:[true, false], arcade:true, duels:'live' });
      C.arm(); runOut(); C.record();
      trail.push(cr.life.spirit);
    }
    C.set(null);
    return trail;
  };
  const pre = process.env.SPIRIT_IDS || 'career-spirit-', train = career2('train', pre), social = career2('social', pre);
  if (process.env.SPIRIT_IDS) console.log('trails', train.join(' '), '/', social.join(' '));
  ok(train[4] <= 90 && train[9] <= 85 && Math.max(...train.slice(5)) < 90, `never tended, Team Spirit falls from 100 (${train.join(' ')})`);
  ok(Math.min(...social) >= 75 && social[9] >= train[9] + 5, `going out with the team keeps it up (${social.join(' ')})`);
}

// 10. the hub
{
  const src = readGameSource(), html = src.slice(src.indexOf('<body>'), src.indexOf('<script>'));
  ok(/<div class="cr-dilemma" id="cr-dilemma" hidden><\/div>\s*<div id="cr-next"><\/div>\s*<button class="btn primary" id="cr-play">/.test(html), 'the dilemma card sits where the fixture and Play Match are');
  const cr = C.create({ name:'Isla', pos:'B', num:7, club:X.CLUBS[0] }); C.set(cr);
  for (let i = 0; i < 99 && L.dilemma(cr).id !== 'pizza'; i++) withId(cr, 'career-hub-' + i);
  C.open();
  const card = $('cr-card').innerHTML;
  ok(shown() === 's-career' && L.KEYS.every(([, l]) => card.includes(`>${l}<`)) && /class="cr-life"/.test(card) && card.indexOf('cr-life') > card.indexOf('cr-skills'), 'the card: Energy, Morale and Team Spirit under the skills');
  ok(L.KEYS.every(([k]) => card.includes(`width:${cr.life[k]}%`) && card.includes(`<b>${cr.life[k]}</b>`)), 'each a bar and its value');
  ok(!$('cr-dilemma').hidden && $('cr-play').hidden && $('cr-next').hidden, 'a dilemma waiting: the card in place of the fixture and Play Match');
  const box = $('cr-dilemma').innerHTML;
  ok(/<h3 class="cr-q" data-fit>Training or Pizza Night\?<\/h3>/.test(box) && (box.match(/<button class="btn cr-opt" data-o="/g) || []).length === 2, 'its question as the heading, an option a button');
  const nmCss = (src.match(/\.cr-opt \.nm\{([^}]*)\}/) || [])[1] || '';
  ok((box.match(/<span class="nm" data-fit>/g) || []).length === 2 && /white-space:nowrap/.test(nmCss) && /align-self:stretch/.test(nmCss) && /min-width:0/.test(nmCss), 'each name kept to one line, as wide as its button, and stepped down by careerFit if a device draws it wider');
  ok(box.includes('>Extra Training<') && box.includes('>Handling +2<') && box.includes('>Energy −15<') && box.includes('>Team Spirit +12<') && box.includes('>Morale +6<'), 'names, and chips such as Energy −15 and Team Spirit +12');
  ok(box.includes(`--k:${L.COL.energy}`) && box.includes('--k:#5fd38a'), 'each chip in its bar\'s or skill\'s colour');
  ok(L.pick(1) && $('cr-dilemma').hidden && !$('cr-play').hidden && !$('cr-next').hidden && $('cr-dilemma').innerHTML === '', 'picked: the fixture and Play Match are back');
  ok($('cr-card').innerHTML.includes('<em>+12</em>') && $('cr-card').innerHTML.includes('<em>+6</em>'), 'and the bars show what moved');
  ok(!L.pick(0), 'a second tap does nothing');
  cr.trained = false; C.trainDone({ id:'defend', stars:3 });
  ok($('cr-gain').textContent === `+${C.TRAIN[3]} Pace` && $('cr-card').innerHTML.includes(`<em class="dn">−${-LF.energy.train}</em>`), 'after training: the gain line as before, the Energy it cost on its bar');
  ok(/DEFAULT_FOCUS\['s-career'\] = \(\) => \(careerDilemma\(career\) && \$\('cr-dilemma'\)\.querySelectorAll\('\.btn'\)\[0\]\) \|\| base\(\)/.test(src), 'a controller\'s first press lands on the first option while one waits');
  ok(!/[←-↙⇐-⇙]/.test(L.DILEMMAS.map(d => d.q + d.opts.map(o => o.name).join('')).join('')), 'no arrow glyphs');
  ok(L.KEYS.every(([k]) => /^#[0-9a-f]{6}$/.test(L.COL[k])) && new Set(Object.values(L.COL)).size === 3 && Object.values(L.COL).every(c => !['#5fb8ff', '#ff6b5a', '#5fd38a', '#ff9f43', '#c58cff', '#ffcf3d'].includes(c)), 'three colours of their own, none a skill\'s or the floodlight\'s');
  // the rest of the season: no card on a round without one
  const plan = L.plan(cr);
  for (let r = 1; r < 5; r++) {
    playOut(10, 5); C.open();
    ok(!$('cr-dilemma').hidden === !!plan[r] && $('cr-play').hidden === !!plan[r], `round ${r + 1}: ${plan[r] ? plan[r].q : 'no dilemma'}`);
    if (plan[r]) L.pick(0);
  }
  C.set(null);
}

console.log(`Career life: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
