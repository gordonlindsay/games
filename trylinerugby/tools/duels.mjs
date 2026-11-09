import { readGameSource } from './source.mjs';
// Forced duel scenarios with asserts, and the scrum close-up's rates. Exits 1 on any failure.
// node tools/duels.mjs            (SEED=1 unless set, so the scrum rate cells repeat)
process.env.SEED ??= '1';
import fs from 'fs';
const { T } = await import('./harness.mjs');

const STEP = T.STEP;
let failed = 0, passed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const fresh = (duels = 'live', diff = 1) => T.newMatch(0, 1, { halfLen: 240, diff, headless: true, duels });
const runUntil = (pred, max = 600) => { for (let i = 0; i < max && !pred(); i++) { T.update(STEP); if (T.M.cut && T.M.cut.kind === 'goal') throw new Error('a goal close-up opened in a duel scenario'); } return pred(); };
const M = () => T.M;
// play a live duel to the end with an input at time `at` (null = no input)
function play(c, act, at) {
  runUntil(() => c.res || c.t >= (at ?? 99), 400);
  if (!c.res && at != null) {
    if (c.kind === 'past') T.input.flick = act; else if (act === 'dummy') T.input.bPressed = true; else T.input.aPressed = true;
    T.update(STEP);
  }
  runUntil(() => M().phase !== 'cut', 600);
}

// 1. each attacking and tackle duel fires through update(); none with the stick pointing away
for (const kind of ['past', 'pass', 'tackle']) {
  fresh(); const s = T.debug.stage(kind);
  T.update(STEP);
  ok(M().phase === 'cut' && M().cut.kind === kind, `${kind} fires from its staged position (phase ${M().phase}, kind ${M().cut && M().cut.kind})`);
  fresh(); T.debug.stage(kind); T.input.jx = -1; T.input.jy = 0;
  T.update(STEP);
  ok(M().phase !== 'cut', `${kind} does not fire when steering away`);
}
// block: the spec check accepts the staged pass across your man
{
  fresh(); const s = T.debug.stage('block');
  ok(!!T.forceDuel && M(), 'block can be forced');
}
// 1b. the Tackle duel's trigger (2026-10-17): the hold floor is 0.3s (from 0.5) and the last-defender test is "no other man of yours goal-side of the
// carrier within 7m" (from "nobody within 10m unless a metre behind him"), the levers in TDUEL; front-on and the distance band are as they were.
// Reverted (TDUEL='{"hold":0.5,"lastBack":1,"lastR":10}' node tools/duels.mjs), the four asserts marked * fail.
{
  const TD = T.debug.TDUEL, team0 = () => M().players.filter(p => p.team === 0);
  ok(TD.hold === 0.3 && TD.lastBack === -0.5 && TD.lastR === 7 && TD.ahead === 0.5 && TD.near === 2.9 && TD.far === 6 && TD.ctrlT === 0.6 && TD.cos === 0.57, `TDUEL is as decided (${JSON.stringify(TD)})`);
  const fires = () => { T.update(STEP); return M().phase === 'cut' && M().cut.kind === 'tackle'; };
  fresh(); let st = T.debug.stage('tackle'); st.O.hold = 0.35;
  ok(fires(), '* fires with the carrier 0.35s on the ball');
  fresh(); st = T.debug.stage('tackle'); st.O.hold = 0.25;
  ok(!fires(), 'not at 0.25s');
  fresh(); st = T.debug.stage('tackle'); let o = team0()[1]; o.x = 47; o.y = 40;
  ok(!fires(), 'another man of ours 3m goal-side of the carrier and 5.8m off: your man is not the last defender, no duel');
  fresh(); st = T.debug.stage('tackle'); o = team0()[1]; o.x = 50; o.y = 40;
  ok(fires(), '* a man of ours level with the carrier, 5m off, is not between him and the line: the duel fires');
  fresh(); st = T.debug.stage('tackle'); o = team0()[1]; o.x = 50.5; o.y = 39;
  ok(fires(), '* nor is one half a metre behind him');
  fresh(); st = T.debug.stage('tackle'); o = team0()[1]; o.x = 42.5; o.y = 36;
  ok(fires(), '* a man goal-side but 7.6m off is beyond the last-defender radius: the duel fires');
  fresh(); st = T.debug.stage('tackle'); o = team0()[1]; o.x = 43.5; o.y = 35.5;
  ok(!fires(), 'one 6.5m off goal-side is not');
  fresh(); st = T.debug.stage('tackle'); st.U.x = 49.6;
  ok(!fires(), 'front-on still: your man 0.4m goal-side of the carrier does not get the duel');
  fresh(); st = T.debug.stage('tackle'); st.U.x = 43.5;
  ok(!fires(), 'and the band is as it was: 6.5m off is too far');
}

// 2. the world is frozen during a close-up
{
  fresh(); T.debug.stage('past'); T.update(STEP);
  const snap = () => JSON.stringify({ p: M().players.map(p => [p.x, p.y, p.vx, p.vy, p.down]), b: [M().ball.x, M().ball.y, M().ball.state], clock: M().clock });
  const a = snap();
  for (let i = 0; i < 40; i++) T.update(STEP);
  ok(M().phase === 'cut' && snap() === a, 'players, ball and clock are frozen during a duel');
}

// 3. success with a centred input, and the Step Left / Step Right direction pin
for (const dir of [-1, 1]) {
  fresh(); T.debug.stage('past'); T.update(STEP);
  const c = M().cut; c.open = dir; c.open0 = dir; c.feintAt = null;
  play(c, dir, c.centre);
  const U = c.U, O = c.O;
  ok(c.out === 'break', `past with a centred flick to the open side breaks (got ${c.out}, res ${c.res})`);
  ok(O.down > 0 && U.boost > 0 && M().ball.carrier === U, 'past win: defender down, carrier boosted and still carrying');
  ok(dir < 0 ? U.y < c.K.y : U.y > c.K.y, `Step ${dir < 0 ? 'Left' : 'Right'} lands world ${dir < 0 ? '-y' : '+y'} (y ${U.y.toFixed(2)} vs contact ${c.K.y.toFixed(2)})`);
}
{
  fresh(); const st = T.debug.stage('pass'); T.update(STEP);
  const c = M().cut;
  ok(c && c.kind === 'pass', 'pass duel staged');
  c.drift = false; c.driftAt = null; c.fakeAt = null;   // he comes at you: Pass is right
  play(c, 'pass', c.centre);
  ok(c.out === 'drawn', `pass with a centred press draws (got ${c.out})`);
  const b = M().ball;
  ok(b.state === 'air' && b.f.sure && b.f.target === st.R, 'the sure pass goes to the runner the scene showed');
  runUntil(() => M().ball.state !== 'air', 200);
  ok(M().ball.carrier === st.R && st.R.boost > 0, 'the runner catches with a burst');
}
// 3e. the open-play gesture history (2026-10-17): a Get Past still reads its flick from the re-centred stick as before (3 above), and the stick's
// restore after the duel clears the open-play history, so a flick begun before the cut-in can't finish after it
{
  fresh(); T.debug.stage('past');
  const inp = T.input;
  inp.gest = { who:M().ball.carrier, n:M().stepN, L:[0, 0.2, 0.4], gap:[1/60, 1/60, 1/60], armed:true, run:0, lastRun:0, dropT:-9, pull:null, keyed:false, kb:false, v:null, t:1, tagAt:0, tagged:null };
  T.update(STEP);
  ok(M().phase === 'cut' && M().cut.kind === 'past', 'a Get Past cuts in with a half-made flick in the slot\'s history');
  const c = M().cut, s0 = M().stats.steps || 0; play(c, c.open, c.centre);
  ok(c.out === 'break' && inp.gest == null, `the restore after the duel cleared the gesture history (${c.out})`);
  inp.jx = 0.75; inp.jy = 0.65; T.update(STEP); T.update(STEP);
  ok((M().stats.steps || 0) === s0, 'and the stick put back across after it is not a flick');
}
// the Key Pass runner box (2026-10-17): the runner may be up to RUNON.kpBack (7.5m) behind the carrier, not 6, now the led pass sits the line deeper
for (const [back, want] of [[7, 'pass'], [8, 'past']]) {
  fresh(); const st = T.debug.stage('pass'); st.R.x = st.U.x - back; T.update(STEP);
  ok(M().phase === 'cut' && M().cut.kind === want, `a support runner ${back}m behind the carrier gives a ${want === 'pass' ? 'Key Pass' : 'Get Past (no Key Pass)'} (got ${M().cut && M().cut.kind})`);
}
{
  fresh(); T.debug.stage('tackle'); T.update(STEP);
  const c = M().cut; c.stepDir = 0; c.stepAt = null;
  play(c, 1, c.centre);
  ok(c.out === 'bighit', `tackle with a centred press is a Big Hit (got ${c.out})`);
  ok(M().phase === 'set' && M().set.kind === 'ruck' && M().set.dom && Math.abs(M().set.t - 1.6) < 1e-9, 'Big Hit gives a dominant 1.6s ruck');
}
for (const [label, offset, want] of [['inner', 0, 'intercept'], ['outer', 0.42, 'knock']]) {
  fresh(); const st = T.debug.stage('block'); const c = T.forceDuel('block');
  const at = c.centre + offset*c.wid;
  play(c, 1, at);
  ok(c.out === want, `block ${label} gives ${want} (got ${c.out})`);
  if (want === 'intercept') ok(M().ball.carrier === c.U && Math.hypot(c.U.x - c.L.x, c.U.y - c.L.y) < 0.6, 'interceptor carries from the lane point');
  else ok(M().ball.state === 'loose' && M().ball.vx < 0, 'a knock-down goes backwards for us');
}

// 3b. a won Key Pass bursts upfield even when the runner is wide and catching across his body
{
  let fwd = 0, n = 0;
  for (let i = 0; i < 20; i++) {
    fresh(); const st = T.debug.stage('pass'); st.R.y = 46; st.R.vy = 3; T.update(STEP);
    const c = M().cut; if (!c || c.kind !== 'pass') continue;
    c.drift = false; c.driftAt = null; c.fakeAt = null;
    play(c, 'pass', c.centre);
    runUntil(() => M().ball.state !== 'air', 200);
    if (M().ball.carrier !== st.R) continue;
    n++; const v = Math.hypot(st.R.vx, st.R.vy); if (st.R.vx > 0.8*v) fwd++;
  }
  ok(n > 0 && fwd === n, `Key Pass burst runs upfield (${fwd} of ${n})`);
}
// 3b2. the Dummy: right when he drifts onto the runner, wrong when he comes at you
{
  fresh(); const st = T.debug.stage('pass'); T.update(STEP);
  let c = M().cut; c.drift = true; c.driftAt = c.win[0] - 0.32; c.fakeAt = null;
  play(c, 'dummy', c.centre);
  ok(c.out === 'sold' && c.verdict === 'Dummy', `Dummy against a drifting defender is sold (got ${c.out})`);
  ok(M().ball.carrier === st.U && st.U.boost > 0 && st.O.down > 0, 'a sold Dummy: you keep the ball with a burst, he is wrong-footed');
  fresh(); const st2 = T.debug.stage('pass'); T.update(STEP);
  c = M().cut; c.drift = true; c.driftAt = c.win[0] - 0.32; c.fakeAt = null;
  play(c, 'pass', c.centre);
  ok(c.out === 'covered' && M().ball.state === 'air' && !M().ball.f.sure, `passing to a covered runner is a normal pass, not a sure one (got ${c.out})`);
  let tackled = 0, broken = 0;
  for (let i = 0; i < 30; i++) {
    fresh(); T.debug.stage('pass'); T.update(STEP);
    c = M().cut; c.drift = false; c.driftAt = null; c.fakeAt = null;
    play(c, 'dummy', c.centre);
    if (c.out === 'tackled' && c.verdict === 'Not Fooled') tackled++; else if (c.out === 'broken') broken++;
  }
  ok(tackled + broken === 30 && tackled > 0, `Dummy against a man coming at you: Not Fooled or a broken tackle (${tackled}/${broken})`);
}
// 3c. scrums release at the mark, whoever wins; ignoring a scrum never concedes worse than the ball
{
  let far = 0, n = 0, dom = 0;
  for (let i = 0; i < 40; i++) {
    T.newMatch(0, 1, { halfLen: 240, diff: 1, headless: false, duels: 'off' });
    for (let k = 0; k < 120; k++) T.update(STEP);
    T.scrum(i % 2, 60, 35, '');
    runUntil(() => M().phase === 'cut', 400);
    const c = M().cut;
    runUntil(() => M().phase !== 'cut', 900);
    if (c.result === 'dom1' || c.result === 'dom0') { dom++; continue; }
    const b = M().ball; if (b.state !== 'held') continue;
    n++; if (Math.hypot(b.carrier.x - (c.x + c.pos), b.carrier.y - c.y) > 2.5) far++;
  }
  ok(n > 0 && far === 0, `scrum ball released at the mark (${far} of ${n} far away)`);
  ok(dom === 0, `a scrum with no pushing never ends in a penalty or pushover (${dom} did)`);
}
// 3d. the scrum (2026-10-17): Push alone drives it and the stick plays no part; a phone thumb at 7 taps a second with a Good Hit
// keeps its own put-in and steals about a third of theirs on Normal; SCRUM_DOM is the one penalty line. Farnham v Haslemere (equal
// packs, power 3), taps jittered 18% as a thumb's are, the stick at rest unless the test says otherwise
{
  const SD = T.debug.SCRUM_DOM ?? 2.4, FAR = { ...T.teams.CLUBS[0], pace:4, power:2, handling:3, kicking:2, stamina:2 }, HAS = { ...T.teams.CLUBS[1], pace:2, power:2, handling:2, kicking:1, stamina:1 };   // two packs level in Power, written out, because these rates are the scrum's and not a league's: the league bands put these two clubs a point of Power apart, which took the steal to 46%;   // (a build without SCRUM_DOM is the old 2.0 line: the staged asserts below then fail, as they should)
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
  let made = 0, away = false;
  const freshFH = (diff, aw) => { away = !!aw; T.newMatch(away ? HAS : FAR, away ? FAR : HAS, { halfLen:240, diff, headless:false, duels:'off', humans:away ? [false, true] : [true, false] }); for (let i = 0; i < 120; i++) T.update(STEP); made = 0; };
  // one scrum on `feed`'s put-in with the human's (seat 0's) taps scripted: o.rate a second with 18% jitter (0 = none); o.hit a Good Hit at
  // 1.47 ± 0.06s, else a first tap at 1.72-1.84s; o.script(c) presses on its own say-so instead; o.jx / o.jy what the stick says; o.pin
  // [base0, base1] pins both packs and stills the CPU's wobble; o.pos stages the shove once engaged; each(c) runs after every step. Returns the cut
  const scrum = (feed, o) => {
    if (made++ >= 40 || M().over) freshFH(M().di, away);
    T.scrum(feed, o.x == null ? 60 : o.x, 35, '');
    runUntil(() => M().phase === 'cut', 600);
    const c = M().cut, inp = T.input;
    if (o.pin) { c.base[0] = o.pin[0]; c.base[1] = o.pin[1]; c.wave = 0; }
    let next = o.hit ? Math.min(1.66, Math.max(1.33, 1.47 + gauss()*0.06)) : 1.72 + Math.random()*0.12, g = 0;
    while (M().cut === c && !c.result && g++ < 3000) {
      inp.jx = o.jx || 0; inp.jy = o.jy || 0;
      if (o.script) { if (o.script(c)) inp.aPressed = true; }
      else if (o.rate > 0 && c.t >= next) { inp.aPressed = true; next = c.t + Math.max(0.05, (1/o.rate)*(1 + 0.18*gauss())); }
      if (o.pos != null && c.engaged) c.pos = o.pos;
      T.update(STEP);
      if (o.each) o.each(c);
    }
    inp.jx = inp.jy = 0;
    runUntil(() => M().phase !== 'cut', 4000);
    return c;
  };
  const cell = (diff, feed, o, n = 300) => { freshFH(diff, false); const t = {}; for (let i = 0; i < n; i++) { const c = scrum(feed, o); t[c.result] = (t[c.result] || 0) + 1; } return k => 100*(t[k] || 0)/n; };
  // the stick plays no part: one fixed tap script (a Good Hit at 1.45s, then a tap every 9 steps) against a pinned CPU pack, with the stick
  // at rest, forward and pulled back, gives the same shove at every step and the same result. Home side, then one player as the away side
  for (const aw of [false, true]) {
    const d = aw ? -1 : 1, runs = [];
    for (const [jx, jy] of [[0, 0], [d, 0], [-d, 1]]) {
      freshFH(1, aw);
      const trace = [];
      const script = c => { if (!c.hitDone) { if (c.t >= 1.45) { c.hitDone = true; c.n = 0; return true; } return false; } return ++c.n % 9 === 0; };
      const c = scrum(aw ? 1 : 0, { pin:aw ? [0.72, 0] : [0, 0.72], script, jx, jy, each:k => trace.push(k.pos) });
      runs.push({ trace, result:c.result, taps:c.taps[aw ? 1 : 0] });
    }
    const same = runs.every(r => r.trace.length === runs[0].trace.length && r.trace.every((v, i) => v === runs[0].trace[i]) && r.result === runs[0].result);
    ok(same && runs[0].taps > 10, `${aw ? 'away side' : 'home side'}: the stick at rest, forward and back gives the same shove at every step and the same result (${runs.map(r => r.result).join(' / ')}, ${runs[0].taps} taps)`);
  }
  // the rates. Normal at 7 a second with a Good Hit: your put-in kept, no penalty against; theirs stolen about a third
  const keep = f => f('win0') + f('dom0'), steal = f => f('steal0') + f('dom0');
  const n7 = cell(1, 0, { rate:7, hit:true }), t7 = cell(1, 1, { rate:7, hit:true });
  ok(keep(n7) >= 98 && n7('dom1') === 0, `Normal, 7 taps a second with a Good Hit: your put-in kept ${keep(n7).toFixed(1)}% (98 or more), penalties against ${n7('dom1')}% (none)`);
  ok(steal(t7) >= 20 && steal(t7) <= 45, `Normal, 7 a second with a Good Hit: their put-in stolen ${steal(t7).toFixed(1)}% (20-45)`);
  const e7 = steal(cell(0, 1, { rate:7, hit:true })), h7 = steal(cell(2, 1, { rate:7, hit:true }));
  ok(e7 >= steal(t7) + 8 && steal(t7) >= h7 + 8, `steals at 7 a second order Easy > Normal > Hard, at least 8 points apart (${e7.toFixed(1)} / ${steal(t7).toFixed(1)} / ${h7.toFixed(1)})`);
  const h6 = steal(cell(2, 1, { rate:6, hit:true }));
  ok(h6 <= 8, `Hard, 6 a second with a Good Hit: their put-in stolen ${h6.toFixed(1)}% (8 or less)`);
  const nl = steal(cell(1, 1, { rate:7, hit:false }));
  ok(nl <= 10, `Normal, 7 a second with no Good Hit: their put-in stolen ${nl.toFixed(1)}% (10 or less: the hit is what wins their ball)`);
  // the regression Gordon hit: Normal, 6 a second, Good Hit, thumb off the stick
  const n6 = cell(1, 0, { rate:6, hit:true }), t6 = cell(1, 1, { rate:6, hit:true });
  ok(keep(n6) >= 98 && t6('dom1') === 0, `Normal, 6 a second with a Good Hit and the thumb off the stick: your put-in kept ${keep(n6).toFixed(1)}% (98 or more), penalties against on theirs ${t6('dom1')}% of 300 (none)`);
  // a fast thumb can reach the penalty line before the scrum ends: 8 a second on your own put-in wins a penalty or pushover more than a tenth of
  // the time (with the scrum ending at the old 2.0 as Go-Forward Ball it never gets there: 0%)
  const n8 = cell(1, 0, { rate:8, hit:true });
  ok(n8('dom0') > 10, `Normal, 8 a second with a Good Hit on your own put-in: a penalty or pushover ${n8('dom0').toFixed(1)}% of the time (over 10)`);
  // the penalty line: the shove staged with both packs stilled (no taps, so no drift). SCRUM_DOM is a penalty, a hair less is Go-Forward Ball;
  // a penalty within 8m of their line is a Pushover try
  freshFH(1, false);
  const staged = (feed, pos, x) => { const tries = M().tries[0]; const c = scrum(feed, { pin:[0, 0], pos, x }); return { res:c.result, pos:c.pos, line:c.line, tag:T.kick.cutTitle(c), scored:M().tries[0] > tries || (M().phase === 'set' && M().set && M().set.kind === 'try') }; };
  const a = staged(0, SD - 0.1), b = staged(0, SD);
  ok(a.res === 'win0' && b.res === 'dom0', `your put-in: ${(SD - 0.1).toFixed(1)}m gained is Go-Forward Ball (${a.res}), ${SD}m is a penalty (${b.res})`);
  const over = staged(0, SD, 100);
  ok(over.res === 'dom0' && over.scored, `a penalty from a scrum 10m out is a Pushover try (${over.res}, try scored ${over.scored})`);
  // the ball goes to the pack ahead on the bar (2026-11-09, Gordon: "if a team wins a scrum, they should also win possession"). The bar's
  // middle is the line that decides it, SCRUM_HEAD (1.2m, the old steal line) towards the pack not putting in: the feeder's head start, so
  // the rates above hold. Staged with both packs stilled, and the words heard with the colour they are said in: 0.3m past the line on their
  // put-in wins it Against the Head, said for you; 0.3m short leaves it theirs; on your put-in 0.3m ahead keeps it, 0.3m behind loses it;
  // dead level, or nearer the line than SCRUM_TIE, is the feeder's. Go-Forward Ball is past 0.8m gained, as before
  {
    const HEAD = T.debug.SCRUM_HEAD, TIE = T.debug.SCRUM_TIE, doc = globalThis.document, mk = doc.createElement, tn = doc.createTextNode, heard = [];
    doc.createTextNode = t => ({ said:t }); doc.createElement = tag => { const e = mk(tag); e.appendChild = n => { if (n && n.said != null) heard.push([n.said, e.style.getPropertyValue('--k')]); }; return e; };
    const col = t => T.teams.showCol(t);
    const said = (feed, pos) => { heard.length = 0; const r = staged(feed, pos); return { ...r, words:heard.length ? heard[heard.length - 1][0] : null, to:heard.length ? [0, 1].find(t => col(t) === heard[heard.length - 1][1]) : null }; };
    ok(HEAD === 1.2 && TIE === 0.05 && col(0) !== col(1), `the line sits ${HEAD}m towards the pack not putting in, dead level is nearer it than ${TIE}m (the two sides' colours differ: ${col(0)} v ${col(1)})`);
    const L1 = 1.2, L0 = -1.2;                              // the line in pos (metres gained by your pack from the mark) on their put-in and on yours
    const t1 = said(1, L1 + 0.3), t2 = said(1, L1 - 0.3), t3 = said(1, 0.3);
    ok(t1.line === L1 && t1.res === 'steal0' && t1.words === 'Against the Head' && t1.to === 0, `their put-in, 0.3m past the line: your ball, Against the Head said for you (${t1.res}, ${t1.words}, ${t1.to})`);
    ok(t2.res === 'win1' && t2.words === 'Scrum Won' && t2.to === 1 && t3.res === 'win1', `their put-in, 0.3m short of the line: their ball, Scrum Won said for them (${t2.res}, ${t2.words}, ${t2.to}); 0.3m up from the mark is short of it too (${t3.res})`);
    const o1 = said(0, L0 + 0.3), o2 = said(0, L0 - 0.3), o3 = said(0, 1.0);
    ok(o1.line === L0 && o1.res === 'win0' && o1.words === 'Scrum Won' && o1.to === 0, `your put-in, 0.3m ahead of the line: you keep it, Scrum Won said for you (${o1.res}, ${o1.words}, ${o1.to})`);
    ok(o2.res === 'steal1' && o2.words === 'Against the Head' && o2.to === 1, `your put-in, 0.3m behind the line: theirs, Against the Head said for them (${o2.res}, ${o2.words}, ${o2.to})`);
    ok(o3.res === 'win0' && o3.words === 'Go-Forward Ball' && o3.to === 0, `your put-in, 1.0m gained: Go-Forward Ball said for you (${o3.res}, ${o3.words}, ${o3.to})`);
    const tag = t => 'Scrum · ' + M().nat[t].id + ' Ball';   // the tag in the corner: the put-in's, then the side that won the ball
    ok(T.kick.cutTitle({ kind:'scrum', feed:1, result:null }) === tag(1) && T.kick.cutTitle({ kind:'scrum', feed:1, result:'dom0' }) === tag(1) && t1.tag === tag(0) && t2.tag === tag(1) && o1.tag === tag(0) && o2.tag === tag(1), `the corner tag names the put-in until the ball is won (and at a penalty), then the side with it: ${t1.tag}, ${t2.tag}, ${o1.tag}, ${o2.tag}`);
    const d1 = said(1, L1), d2 = said(1, L1 + TIE - 0.01), d3 = said(1, L1 + TIE), d4 = said(0, L0), d5 = said(0, L0 - TIE + 0.01);
    ok(d1.res === 'win1' && d2.res === 'win1' && d3.res === 'steal0' && d4.res === 'win0' && d5.res === 'win0', `dead level is the feeder's: their put-in on the line ${d1.res}, ${(TIE - 0.01).toFixed(2)}m past it ${d2.res}, ${TIE}m past it ${d3.res}; your put-in on the line ${d4.res}, ${(TIE - 0.01).toFixed(2)}m behind it ${d5.res}`);
    doc.createElement = mk; doc.createTextNode = tn;
    // what the bar shows is what you get: across the whole shove, both put-ins, the bar's fill leans the way of the side whose ball it is,
    // none at dead level (the feeder's), and the result agrees
    let bad = 0, n = 0;
    for (const feed of [0, 1]) for (let p = -2.35; p <= 2.35; p += 0.01) { const c = { feed, pos:p, line:feed === 0 ? L0 : L1 }, f = T.debug.scrumBar(c), w = T.debug.scrumAhead(c); n++; if ((f > 0 ? 0 : f < 0 ? 1 : feed) !== w) bad++; }
    ok(bad === 0 && n > 900, `the bar leans the way of the side whose ball it is at every 1cm of the shove, both put-ins (${bad} of ${n} wrong)`);
  }
  // the one line is updateScrum's too: both packs stilled, the shove staged 0.2 short of SCRUM_DOM runs on (the old 2.0 ended it at once), staged at
  // SCRUM_DOM it ends there and then. drawScrum's bar (2026-11-09): its middle is the line, each half fills exactly at its pack's penalty line,
  // so on your put-in it leans your way a third at the mark (1.2m of 3.6), none on the line, half your half 0.6m behind it, and full at SD
  // either way; the ball drawn by the side whose ball it is
  { const still = () => { freshFH(1, false); T.scrum(0, 60, 35, ''); runUntil(() => M().phase === 'cut', 600); const c = M().cut; c.base[0] = c.base[1] = 0; c.wave = 0; T.input.jx = T.input.jy = 0; runUntil(() => c.engaged, 200); return c; };
    const c = still(); c.pos = SD - 0.2; T.update(STEP); const ran = c.result, p1 = c.pos; c.pos = SD; T.update(STEP);
    ok(ran == null && Math.abs(p1 - (SD - 0.2)) < 1e-9 && c.result === 'dom0', `updateScrum ends the scrum at ${SD}m and not before: staged at ${(SD - 0.2).toFixed(1)}m it runs on (${ran}), at ${SD}m it is a penalty on the next step (${c.result})`);
    runUntil(() => M().phase !== 'cut', 4000);
    const c2 = still(), W = 667, bw = W*0.38;
    const fills = (pos, cc = c2) => { cc.pos = pos; const out = [], props = []; let fs = '', ball = null; globalThis.__ctxSpy = (k, a) => { if (k === 'fillStyle') fs = a[0]; else if (k === 'fillRect') out.push([...a, fs]); else if (k === 'translate') { ball = a[0]; if (Math.abs(a[1] - 375*0.85) < 1e-6) props.push(a[0]); } }; T.debug.view(W, 375); T.debug.drawCut(); globalThis.__ctxSpy = null; out.ball = ball; out.meet = props.length === 2 ? (props[0] + props[1])/2 : NaN; return out; };   // meet: where the packs meet, half way between the two near props (fig's translate at the ground line)
    const bar = fs => fs.filter(a => Math.abs(a[1] - 375*0.885) < 1e-6 && Math.abs(a[3] - Math.max(8, 375*0.022)) < 1e-6);   // the fill, not the frame or the line
    const right = (fs, w) => bar(fs).some(a => Math.abs(a[0] - W*0.5) < 1e-6 && Math.abs(a[2] - w) < 1e-6), left = (fs, w) => bar(fs).some(a => Math.abs(a[0] + a[2] - W*0.5) < 1e-6 && Math.abs(a[2] - w) < 1e-6);
    const atMark = fills(0), onLine = fills(-1.2), behind = fills(-1.8), pen = fills(SD), penThem = fills(-SD);
    ok(right(atMark, bw/6) && bar(onLine).length === 0 && left(behind, bw/4) && right(pen, bw/2) && left(penThem, bw/2), `drawScrum's bar on your put-in: a third of your half at the mark, none on the line, half of theirs 0.6m behind it, a whole half at ${SD}m either way`);
    ok(atMark.ball < W*0.5 && onLine.ball < W*0.5 && behind.ball > W*0.5, `the ball by the name of the side whose ball it is: yours at the mark and on the line, theirs behind it (${atMark.ball.toFixed(0)}, ${onLine.ball.toFixed(0)}, ${behind.ball.toFixed(0)} of ${W})`);
    // the packs agree (2026-11-09 review: they moved by the shove from the mark, so on their put-in your pack could be seen driving
    // theirs back up to 1.2m while the ball went to them). They meet on the line at dead level, lean the way of the pack ahead, and at
    // a penalty stand where they always did: the screen's middle plus 0.7 of a metre's scale per metre, SD out (the wobble is 1.5px)
    const sc = 375*0.2, at = m => W*0.5 + m*sc*0.7, near = (o, m) => Math.abs(o.meet - at(m)) <= 1.6;
    ok(near(atMark, 0.8) && near(onLine, 0) && near(behind, -1.2) && near(pen, SD) && near(penThem, -SD), `drawScrum's packs on your put-in meet a third of the way your way at the mark, in the middle on the line, half way their way 0.6m behind it, and where they always did at ${SD}m either way (${[atMark, onLine, behind, pen, penThem].map(o => (o.meet - W*0.5).toFixed(0)).join(', ')}px from the middle)`);
    runUntil(() => M().phase !== 'cut', 4000);
    const c3 = (() => { freshFH(1, false); T.scrum(1, 60, 35, ''); runUntil(() => M().phase === 'cut', 600); const k = M().cut; k.base[0] = k.base[1] = 0; k.wave = 0; runUntil(() => k.engaged, 200); return k; })();
    const short = fills(0.9, c3), past = fills(1.5, c3);
    ok(short.meet < W*0.5 - 5 && short.ball > W*0.5 && past.meet > W*0.5 + 5 && past.ball < W*0.5, `their put-in, 0.3m short of the line: their pack is seen driving yours back, by their name (packs ${(short.meet - W*0.5).toFixed(0)}px); 0.3m past it, yours driving theirs (${(past.meet - W*0.5).toFixed(0)}px)`);
    runUntil(() => M().phase !== 'cut', 4000);
    let wrong = 0, cells = 0;
    for (const feed of [0, 1]) for (let p = -2.4; p <= 2.4; p += 0.01) { const k = { feed, pos:p, line:feed === 0 ? -1.2 : 1.2 }, m = T.debug.scrumShown(k), d = p - k.line; cells++; if (Math.abs(d) < T.debug.SCRUM_TIE ? Math.abs(m) > 2*T.debug.SCRUM_TIE : (m > 0 ? 0 : 1) !== T.debug.scrumAhead(k)) wrong++; }
    const drill = [0, 0.37, -0.81, 2.4, -2.5].every(p => T.debug.scrumShown({ pos:p, line:0 }) === p);
    ok(wrong === 0 && cells > 900 && drill, `the packs lean the way of the side whose ball it is at every 1cm of the shove, both put-ins (${wrong} of ${cells} wrong); a drill's packs, line at the mark, stand exactly where the shove puts them (${drill})`); }
  // two player, both seats: a pack a side and the same line. Staged, a pack 0.3m past the line on the other's put-in wins it, said for that side,
  // and 0.3m short leaves it with the feeder; played, equal thumbs keep the feeder's ball, and a thumb against an idle pack takes it
  {
    const pair = () => { T.newMatch(FAR, HAS, { halfLen:240, diff:1, headless:false, duels:'off', humans:[true, true], levels:[1, 1] }); T.debug.setMode('match'); for (let i = 0; i < 120; i++) T.update(STEP); };
    const doc = globalThis.document, mk = doc.createElement, tn = doc.createTextNode, heard = [];
    doc.createTextNode = t => ({ said:t }); doc.createElement = tag => { const e = mk(tag); e.appendChild = n => { if (n && n.said != null) heard.push([n.said, e.style.getPropertyValue('--k')]); }; return e; };
    const two = (feed, rates, pos) => {
      heard.length = 0; if (M().over) pair();
      T.scrum(feed, 60, 35, ''); runUntil(() => M().phase === 'cut', 600);
      const c = M().cut, ins = [T.sides.inputOf(0), T.sides.inputOf(1)], next = [1.45, 1.47]; let g = 0;
      while (M().cut === c && !c.result && g++ < 3000) { if (pos != null && c.engaged) c.pos = pos; for (const s of [0, 1]) if (rates[s] && c.t >= next[s]) { ins[s].aPressed = true; next[s] = c.t + 1/rates[s]; } T.update(STEP); }
      runUntil(() => M().phase !== 'cut', 4000);
      const h = heard[heard.length - 1]; return { res:c.result, to:h ? [0, 1].find(t => T.teams.showCol(t) === h[1]) : null, words:h && h[0] };
    };
    pair();
    const a1 = two(1, [0, 0], 1.5), a2 = two(1, [0, 0], 0.9), b1 = two(0, [0, 0], -1.5), b2 = two(0, [0, 0], -0.9);
    ok(M().two && a1.res === 'steal0' && a1.to === 0 && a1.words === 'Against the Head' && a2.res === 'win1' && a2.to === 1, `two player, Player 2's put-in: Player 1 0.3m past the line wins it, said for him (${a1.res}, ${a1.words}, ${a1.to}); 0.3m short leaves it Player 2's (${a2.res}, ${a2.to})`);
    ok(b1.res === 'steal1' && b1.to === 1 && b1.words === 'Against the Head' && b2.res === 'win0' && b2.to === 0, `two player, Player 1's put-in: Player 2 0.3m past the line wins it, said for him (${b1.res}, ${b1.words}, ${b1.to}); 0.3m short leaves it Player 1's (${b2.res}, ${b2.to})`);
    pair();
    const kept = [0, 1].map(feed => { let k = 0; for (let i = 0; i < 10; i++) { const r = two(feed, [7, 7]).res; if (r === 'win' + feed || r === 'dom' + feed) k++; } return k; });
    const took = [two(1, [8, 0]).res, two(0, [0, 8]).res];
    ok(kept[0] === 10 && kept[1] === 10 && took[0] === 'steal0' && took[1] === 'steal1', `two player, 7 a second each: the feeder keeps it ${kept[0]} and ${kept[1]} of 10; 8 a second against an idle pack takes it, never a penalty (${took.join(', ')})`);
    doc.createElement = mk; doc.createTextNode = tn;
  }
  // Kids (KIDS.scrum, your pack's shove +0.25 at the start of the scale): the same line, the help still the pack's own
  {
    T.newMatch(FAR, HAS, { halfLen:240, diff:0, headless:false, duels:'off', humans:[true, false], kids:true }); for (let i = 0; i < 120; i++) T.update(STEP);
    T.scrum(1, 60, 35, ''); runUntil(() => M().phase === 'cut', 600); const c = M().cut;
    ok(M().kids && c.line === 1.2 && Math.abs(c.base[0] - ((M().nat[0].power - 3)*0.06 + T.kids.KIDS.scrum)) < 1e-9, `Kids: the line sits 1.2m towards you on their put-in (${c.line}) and your pack keeps its shove (+${T.kids.KIDS.scrum})`);
    runUntil(() => M().phase !== 'cut', 4000);
  }
  // the words: neither the Help page nor the README tells the player to hold the stick at a scrum
  const html = readGameSource(), readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const help = (html.match(/<dt>Scrum<\/dt><dd>([\s\S]*?)<\/dd>/) || [])[1] || '', bullet = (readme.match(/- \*\*Scrum:\*\*([\s\S]*?)\n- \*\*/) || [])[1] || '';
  ok(help && !/stick/i.test(help) && /tap it fast/i.test(help), `the Help page's Scrum row says tap it fast and never mentions the stick (${help.slice(0, 90)})`);
  ok(bullet && !/stick/i.test(bullet), `the README's Scrum bullet never mentions the stick`);
}
// 4. no input falls back to the open game's odds
{
  let rucks = 0, frees = 0;
  for (let i = 0; i < 40; i++) {
    fresh(); T.debug.stage('past'); T.update(STEP);
    const c = M().cut; play(c, null, null);
    if (M().phase === 'set' && M().set.kind === 'ruck') rucks++;
    else if (M().ball.carrier === c.U && c.O.down > 0 && c.U.boost === 0) frees++;
  }
  ok(rucks + frees === 40 && rucks > 0 && frees > 0, `past with no input ends in a ruck or a broken tackle without a burst (${rucks} rucks, ${frees} breaks)`);
}
{
  fresh(); T.debug.stage('block'); const c = T.forceDuel('block');
  play(c, null, null);
  const b = M().ball;
  ok(b.state === 'air' && b.f.kind === 'pass' && b.f.rolled.has(c.U), 'block with no input completes the pass, and your man gets no second intercept roll');
}

// 5. the gate
{
  fresh('live'); T.debug.stage('past');
  ok(T.debug.duelGate('past') === 'normal', 'gate open in open play');
  M().charging = true; ok(!T.debug.duelGate('past'), 'gate shut while charging a kick'); M().charging = false;
  M().phase = 'set'; ok(!T.debug.duelGate('past'), 'gate shut during a set piece'); M().phase = 'play';
  M().clock = 10; ok(!T.debug.duelGate('past'), 'gate shut in the first 15s of a half'); M().clock = 30;
  M().duelLog.last = M().dclock - 10; ok(!T.debug.duelGate('tackle'), 'gate shut within 30s of the last duel');
  M().duelLog.last = -99; M().duelLog.lastKind = 'past'; ok(!T.debug.duelGate('past') && T.debug.duelGate('tackle'), 'never the same kind twice running');
  M().duelLog.lastKind = null; M().duelLog.half[0] = 99; ok(!T.debug.duelGate('tackle'), 'per-half cap holds');
  M().hooter = true; M().duelLog.last = M().dclock - 10; ok(T.debug.duelGate('tackle') === 'bonus', 'one Last Play bonus after the hooter');
  M().duelLog.bonus[0] = true; ok(!T.debug.duelGate('tackle'), 'only one bonus a half');
  T.newMatch(0, 1, { halfLen: 240, diff: 1, auto: true, headless: true, duels: 'live' });
  ok(M().duels === 'off', 'AI v AI forces duels off');
}

// 6. instant mode resolves at the trigger with no close-up
{
  const outs = new Set();
  for (let i = 0; i < 60; i++) {
    fresh('instant'); const kind = ['past', 'pass', 'tackle'][i % 3]; T.debug.stage(kind); T.update(STEP);
    ok(M().phase !== 'cut' && !M().cut, `instant ${kind} sets no close-up`);
    outs.add(kind);
  }
}

// 7. AI v AI never duels
{
  const res = T.simulate(3, 120, 1);
  ok(res.every(r => !r.stats.duels), 'simulate() runs with no duels');
}

// 8. slow motion (2026-10-17): a duel's run-in plays at DUEL_SLOW.rate for secs[level] of real time, ramps to full speed before the ring
// opens, and changes nothing judged on scene time: the scene clock steps whole frames, so the windows, tells, verdict and random
// draws are the ones a run with no slow motion gives on the same seed; only the frames (the real time) stretch, longest on Easy
{
  const D = T.debug, SL = D.DUEL_SLOW, CUT_IN = D.CUT_IN;
  if (!SL || !D.cutRate) { failed += 12; console.log('FAIL slow motion: DUEL_SLOW and cutRate are missing from the engine'); }
  else {
    const { reseed, duelBot, rndCalls, bot, chooserBot, chooserRelease } = await import('./harness.mjs');
    ok(SL.rate === 0.4 && SL.secs.join() === '1.2,0.9,0.6' && SL.ramp === 0.10 && SL.lead === 0.03, `the shipped levers: ${JSON.stringify(SL)}`);
    const rate0 = SL.rate, LV = ['Easy', 'Normal', 'Hard'];
    const stageAt = (kind, diff, seed) => { reseed(seed); fresh('live', diff); if (kind === 'block') return T.forceDuel('block'); T.debug.stage(kind); T.update(STEP); return M().cut; };
    const events = c => JSON.stringify([c.win, c.centre, c.wid, c.feintAt, c.driftAt, c.fakeAt, c.stepAt, c.rel, c.endT, c.tk, c.open, c.open0, c.drift, c.dummy]);
    // one duel to the ring: real seconds (frames) from the cut's start, the scene clock always on a whole frame, the slide-in at full speed
    const toRing = c => { let real = 0, slow = 0, whole = true, slide = true; while (c.t < c.win[0] && real < 20) { if (D.cutRate(c) === SL.rate && c.t >= CUT_IN) slow += STEP; T.update(STEP); real += STEP; if (Math.abs(c.t/STEP - Math.round(c.t/STEP)) > 1e-6) whole = false; if (c.t <= CUT_IN && Math.abs(c.t - real) > 1e-9) slide = false; } return { real, slow, whole, slide }; };   // real: frames from the cut's start; slow: frames spent at the slow rate
    const finish = c => { const r0 = rndCalls(); runUntil(() => c.res || c.t >= c.centre, 600); if (!c.res) { duelBot(c); T.update(STEP); } runUntil(() => M().phase !== 'cut', 900); return { res:c.res, out:c.out, judged:c.judged, rnd:rndCalls() - r0 }; };
    const realBy = {};
    for (const kind of ['past', 'pass', 'tackle', 'block']) {
      for (const diff of [0, 1, 2]) {
        const seed = 700 + diff*10 + kind.length;
        SL.rate = rate0; const cA = stageAt(kind, diff, seed), eA = events(cA), rA = toRing(cA), rateAtRing = D.cutRate(cA), fA = finish(cA);
        SL.rate = 1; const cB = stageAt(kind, diff, seed), eB = events(cB), rB = toRing(cB), fB = finish(cB);
        SL.rate = rate0;
        realBy[kind + diff] = rA.slow;
        ok(eA === eB, `${kind} ${LV[diff]}: the windows, tells and plan are the same with and without slow motion (same seed)`);
        ok(rA.whole && rA.slide, `${kind} ${LV[diff]}: the scene clock is always on a whole frame and the slide-in runs at full speed`);
        ok(rateAtRing === 1 && rA.real > rB.real + 0.6*SL.secs[diff] - 0.12 && rA.real < rB.real + 0.6*SL.secs[diff] + 0.3, `${kind} ${LV[diff]}: full speed by the ring, which opens ${rA.real.toFixed(2)}s real from the cut (${rB.real.toFixed(2)}s without slow motion; the slow phase adds about ${(0.6*SL.secs[diff]).toFixed(2)}s, a little less where Easy's early ring clips it)`);
        ok(fA.res === fB.res && fA.out === fB.out && Math.abs(fA.judged - fB.judged) < 1e-9 && fA.rnd === fB.rnd, `${kind} ${LV[diff]}: the same press gives the same verdict at the same scene time with the same random draws (${fA.res}/${fA.out} v ${fB.res}/${fB.out})`);
      }
      ok(realBy[kind + 0] > realBy[kind + 1] && realBy[kind + 1] > realBy[kind + 2] && realBy[kind + 2] >= SL.secs[2] - 0.05 && realBy[kind + 0] >= SL.secs[0] - 0.3, `${kind}: the slow phase is longest on Easy, then Normal, then Hard (${realBy[kind + 0].toFixed(2)} / ${realBy[kind + 1].toFixed(2)} / ${realBy[kind + 2].toFixed(2)}s real at ${SL.rate}x; Easy's early ring may clip its 1.2s)`);
    }
    // the rate schedule itself: rate through the slow phase, 1 from lead before the ring, a ramp that only rises between
    { const c = stageAt('past', 1, 801); const seen = []; while (c.t < c.win[0]) { seen.push([c.t, D.cutRate(c)]); T.update(STEP); }
      const slow = seen.filter(([t]) => t >= CUT_IN && t < CUT_IN + SL.rate*SL.secs[1] - 1e-9), after = seen.filter(([t]) => t >= c.win[0] - SL.lead), mid = seen.filter(([t]) => t >= CUT_IN + SL.rate*SL.secs[1] && t < c.win[0] - SL.lead).map(([, r]) => r);
      const part = mid.filter(r => r > SL.rate + 0.05 && r < 0.95);   // frames part way up the ramp: a jump from rate straight to 1 has none
      ok(slow.length > 10 && slow.every(([, r]) => r === SL.rate) && after.every(([, r]) => r === 1) && mid.every((r, i) => i === 0 || r >= mid[i - 1]) && part.length >= 1, `Normal Get Past: ${slow.length} frames at ${SL.rate} through the slow phase, 1 from ${SL.lead}s before the ring, a rising ramp between (${mid.length} frames, ${part.length} of them part way between ${SL.rate} and 1)`);
      ok(seen.filter(([t]) => t < CUT_IN).every(([, r]) => r === 1), 'the slide-in is not slowed'); }
    // resume before the window starts the slow phase again from the resumed time; after the verdict nothing is slowed
    { const c = stageAt('past', 1, 802); runUntil(() => c.t >= c.win[0] - SL.lead, 600);
      ok(D.cutRate(c) === 1, 'at the ring the rate is 1');
      D.setMode('match'); D.pause(); D.resume(); D.setMode('menu');
      ok(c.slowFrom === c.t && c.acc === 0 && D.cutRate(c) === SL.rate && c.t < c.win[0], `Resume before the ring opens starts the slow phase again from ${c.t.toFixed(3)}s`);
      const { real, slow } = toRing(c); ok(real > 0.45 && slow > 0.3, `and the ring is ${real.toFixed(2)}s real away again (${slow.toFixed(2)}s of it slow: the slow phase runs again until the ramp must start)`);
      finish(c); ok(c.res && D.cutRate(c) === 1, 'after the verdict the replay runs at full speed'); }
    // instant mode has no close-up to slow
    { fresh('instant'); T.debug.stage('past'); T.update(STEP); ok(!M().cut && M().phase !== 'cut', 'instant mode: no close-up, nothing slowed'); }
    // two player: the lock stays in scene time and the chooser's hand lands on the same frame with or without slow motion
    { const two = (rate, seed) => { SL.rate = rate; reseed(seed); T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'live', humans:[true, true], levels:[1, 1] }); D.setTwo(true); D.stage('past', 0); T.update(STEP); const c = M().cut; let lockedAt = null, n = 0; while (!c.locked && n++ < 600) { chooserBot(c, { trick:1, late:0.05 }); T.update(STEP); if (c.locked && lockedAt == null) lockedAt = c.t; } chooserRelease(c); const r = { lock:c.lock, lockedAt, open:c.open, open0:c.open0, feintAt:c.feintAt }; runUntil(() => M().phase !== 'cut', 900); D.setTwo(false); return r; };
      const a = two(rate0, 803), b = two(1, 803); SL.rate = rate0;
      ok(a.lock === b.lock && a.lockedAt === b.lockedAt && a.open === b.open && a.open0 === b.open0 && Math.abs(a.feintAt - b.feintAt) <= STEP + 1e-9, `two player: the lock (${a.lock.toFixed(3)}) and the frame it locks on (${a.lockedAt.toFixed(3)}) are the same with and without slow motion, and the chooser's late switch lands within a frame (${a.feintAt.toFixed(3)} v ${b.feintAt.toFixed(3)}: the scripted hand moves between frames, and slow motion gives it one more frame to land in)`); }
    // the drawing during the slow phase: the fraction held back is drawn, and nothing non-finite reaches the canvas
    { const c = stageAt('pass', 0, 804); runUntil(() => c.t >= CUT_IN + 0.2, 200); let n = 0; while (c.acc < STEP*0.3 && n++ < 10) T.update(STEP);
      let bad = 0, calls = 0; const walk = (k, v) => { calls++; if (typeof v === 'number' && !Number.isFinite(v)) bad++; else if (Array.isArray(v)) v.forEach(x => walk(k, x)); };
      globalThis.__ctxSpy = (k, a) => { for (const v of a) walk(k, v); }; D.view(667, 375); D.drawCut(); globalThis.__ctxSpy = null;
      ok(c.acc > 0 && c.acc < STEP && calls > 200 && bad === 0, `mid slow phase the clock holds back ${(c.acc*1000).toFixed(1)}ms of a frame for the drawing, and the canvas gets ${calls} finite arguments`);
      // and the drawing uses it: the same frame drawn with nothing held back and with 0.9 of a frame held back gives different canvas calls (the
      // figures have moved on), while the same frame drawn twice gives the same (so a judder of one scene frame every 2.5 drawn frames can't pass)
      const draw = acc => { c.acc = acc; const rec = []; globalThis.__ctxSpy = (k, a) => rec.push(k + ':' + a.map(v => (typeof v === 'number' ? v.toFixed(4) : String(v))).join(',')); D.drawCut(); globalThis.__ctxSpy = null; return rec.join('\n'); };
      const acc0 = c.acc, dA = draw(0), dB = draw(0.9*STEP), dA2 = draw(0); c.acc = acc0;
      ok(dA !== dB && dA === dA2, `the fraction held back moves the drawing (${dA === dB ? 'it did not' : 'it did'}; the same frame twice ${dA === dA2 ? 'the same' : 'differs'})`); }
    // a bot match: the same match, more frames frozen in duels
    { const frozenOf = rate => { SL.rate = rate; reseed(805); T.newMatch(0, 1, { halfLen:120, diff:1, headless:true, duels:'live' }); let fr = 0, n = 0; while (!M().over && n++ < 200000) { bot(); T.update(STEP); if (M().phase === 'cut' && M().cut && M().cut.duel) fr += STEP; } return { fr, score:M().score.join('-'), duels:M().stats.duels, won:M().stats.duelsWon }; };
      const a = frozenOf(rate0), b = frozenOf(1); SL.rate = rate0;
      ok(a.score === b.score && a.duels === b.duels && a.won === b.won && a.fr > b.fr + 0.5*a.duels, `a bot match is the same match (${a.score}, ${a.duels} duels, ${a.won} won) with ${a.fr.toFixed(1)}s frozen in duels against ${b.fr.toFixed(1)}s without slow motion`); }
    // the words
    const html = readGameSource(), readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
    ok(/<dt>Duels<\/dt><dd>[^<]*(<b>[^<]*<\/b>[^<]*)*slow motion/.test(html) && /slow motion/i.test(readme), 'the Help page\'s Duels row and the README say the duel starts in slow motion');
  }
}

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

