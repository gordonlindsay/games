// The first-time tutorial (2026-10-17): the first time each duel kind, the scrum, the lineout, a goal kick and a drop goal comes up
// on this device (with Hints On) play pauses under a card or two; Next then Play; a press advances; the world and the clock are
// frozen; each moment is remembered once seen; Replay Tutorial forgets them; two player names the owner. Exits 1 on any failure.
// node tools/tutorial.mjs            (SEED=2 unless set)
process.env.SEED ??= '2';
import fs from 'fs';
const { T, inputs, rndCalls, kickBot, padStub, fire } = await import('./harness.mjs');
const D = T.debug, X = T.teams, K = T.kick, S = T.sides, STEP = T.STEP, M = () => T.M, $ = id => document.getElementById(id);
let failed = 0, passed = 0, group = '';
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', group + ':', msg); } };
const done = name => { console.log(`${name.padEnd(26)} ${failed ? 'FAIL so far ' + failed : 'ok'} (${passed} passed)`); };
const begin = name => { group = name; };
const html = fs.readFileSync(new URL(process.env.GAME || '../index.html', import.meta.url), 'utf8');
if (!D.tutCards || !D.TUT_IDS) { console.log('FAIL tutorial: tutCards and TUT_IDS are missing from the engine'); console.log('0 passed, 1 failed'); process.exit(1); }
const settings = () => D.settings();
const fresh = (o = {}) => { T.newMatch(0, 1, { halfLen:240, diff:1, headless:false, duels:'live', ...o }); D.setMode('match'); D.setTwo(!!(o.humans && o.humans[0] && o.humans[1])); for (const inp of inputs) { inp.keys.clear(); inp.jx = inp.jy = 0; inp.aPressed = inp.bPressed = inp.cPressed = false; inp.aDown = inp.bDown = inp.cDown = false; } };
const runUntil = (pred, max = 600) => { for (let i = 0; i < max && !pred(); i++) T.update(STEP); return pred(); };
const unseen = () => { settings().tut = []; settings().hints = true; settings().twoHints = [true, true]; };
const seenAll = () => { settings().tut = D.TUT_IDS.slice(); };
const snap = () => { const m = M(); return JSON.stringify({ t:m.cut && m.cut.t, clock:m.clock, dclock:m.dclock, P:m.players.map(p => [p.x, p.y, p.vx, p.vy, p.down]), b:[m.ball.x, m.ball.y], spr:m.spr.map(s => s.m) }); };
const press = () => { inputs[0].aPressed = true; T.update(STEP); };
const small = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'on', 'to', 'in', 'for', 'as', 'at', 'by']);
const titled = s => String(s).split(/[\s,.]+/).filter(Boolean).every((w, i) => (i && small.has(w)) || !/^[a-z]/.test(w));
const tuText = () => $('tu-text').innerHTML.replace(/<[^>]+>/g, '');   // the card's sentence as read (its keys are keycaps, <kbd>, in the markup)
const bare = /(^|[\s,.])([/.,]|[A-Z])(?=[\s,.]|$)/;         // a lone / . , or capital letter standing as a word: a key named outside a keycap

// A. the first Get Past: the card, the hold, the frozen world, Next then Play, then the slow run-in
begin('first duel');
{
  unseen(); fresh(); D.stage('past'); T.update(STEP);
  const c = M().cut, tu = D.tut();
  ok(c && c.kind === 'past' && tu && tu.id === 'past' && tu.seat === 0 && tu.step === 0 && tu.cut === c && !$('m-tut').hidden, 'the first Get Past opens the tutorial card at the cut');
  ok($('tu-eye').textContent === 'Tutorial' && $('tu-title').textContent === 'Get Past' && tuText() === 'Beat the Last Man' && !$('tu-row').hidden && $('tu-play').hidden, `card 1: ${$('tu-title').textContent} · ${tuText()}, Skip | Next`);
  ok(settings().tut.includes('past'), 'the moment is remembered at once');
  runUntil(() => c.t >= D.CUT_IN, 30);
  const a = snap(), r0 = rndCalls();
  for (let i = 0; i < 600; i++) { inputs[0].jx = 1; inputs[0].flick = 1; T.update(STEP); }
  ok(snap() === a && rndCalls() === r0 && c.res == null && D.tut() === tu, 'the close-up holds its first frame for 10s: nothing moves, no clock runs, no random number is drawn, a flick is not judged');
  ok(inputs[0].jx === 0, 'the stick is re-centred under the thumb through the hold');
  press(); ok(D.tut() && D.tut().step === 1 && tuText() === 'Flick the Stick Away From Him When the Ring Turns Gold' && $('tu-row').hidden && !$('tu-play').hidden, `a press: card 2 (${tuText()}), Play`);
  const t1 = c.t; press(); ok(D.tut() == null && $('m-tut').hidden && c.slowFrom === t1 && c.res == null, 'a second press: Play, and the slow run-in starts from here');
  let n = 0; while (c.t < c.win[0] && n++ < 600) T.update(STEP);
  ok(c.t >= c.win[0] && n > 60, `the run-in then plays, ${(n*STEP).toFixed(2)}s real to the ring`);
  runUntil(() => M().phase !== 'cut', 900);
  fresh(); D.stage('past'); T.update(STEP); ok(M().phase === 'cut' && D.tut() == null && $('m-tut').hidden, 'the second Get Past has no tutorial');
  runUntil(() => M().phase !== 'cut', 900);
}
done('A first duel');

// B. every moment once: the other duels, the scrum, the lineout, a goal kick, a drop goal; the buttons; a tap anywhere
begin('every moment');
{
  unseen();
  for (const kind of ['pass', 'tackle', 'block']) {
    fresh(); if (kind === 'block') T.forceDuel('block'); else { D.stage(kind); T.update(STEP); }
    const tu = D.tut(); ok(tu && tu.id === kind && $('tu-title').textContent === D.tutCards(kind, 0)[0][0], `${kind}: the card (${$('tu-title').textContent})`);
    $('tu-next').click(); ok(D.tut().step === 1, 'Next'); $('tu-play').click(); ok(D.tut() == null, 'Play');
    runUntil(() => M().phase !== 'cut', 900);
    fresh(); if (kind === 'block') T.forceDuel('block'); else { D.stage(kind); T.update(STEP); } ok(D.tut() == null, `${kind}: once only`); runUntil(() => M().phase !== 'cut', 900);
  }
  fresh(); runUntil(() => M().phase === 'play', 400); T.scrum(1, 60, 35, ''); runUntil(() => M().phase === 'cut', 400);
  ok(D.tut() && D.tut().id === 'scrum' && $('tu-title').textContent === 'Scrum' && tuText() === 'Crouch, Bind, Set', `the first scrum (${tuText()})`);
  { const c = M().cut; runUntil(() => c.t >= D.CUT_IN, 30); const t0 = c.t; for (let i = 0; i < 120; i++) T.update(STEP); ok(c.t === t0 && !c.engaged, 'the scrum holds before Crouch'); }
  $('tu-skip').click(); ok(D.tut() == null && $('m-tut').hidden, 'Skip goes straight to play');
  { const c = M().cut; let n = 0; while (M().cut === c && n++ < 4000) { if (c.t >= 1.4 && n % 10 === 0) inputs[0].aPressed = true; T.update(STEP); } ok(c.result != null, `the scrum then plays out (${c.result})`); }
  runUntil(() => M().phase === 'play', 4000);
  T.lineout(0, 60, 5, ''); runUntil(() => M().phase === 'cut', 400);
  ok(D.tut() && D.tut().id === 'lineout' && tuText() === 'One Jumper Each', 'the first lineout');
  $('m-tut').click(); ok(D.tut() && D.tut().step === 1, 'a tap anywhere on the card is Next'); $('m-tut').click(); ok(D.tut() == null, 'and then Play');
  runUntil(() => M().phase === 'play', 4000);
  fresh(); D.goalKick(0, 88, 35, 'penalty');
  ok(D.tut() && D.tut().id === 'goal' && $('tu-title').textContent === 'Goal Kick' && M().cut.g.aid === 'path', 'the first goal kick: the card, and the first-kick path aid');
  { const c = M().cut; runUntil(() => c.t >= D.CUT_IN, 30); for (let i = 0; i < 30; i++) { inputs[0].aPressed = true; T.update(STEP); if (D.tut() == null) break; } ok(c.g.stage === 'aim' && c.g.m === 0 && D.tut() == null && c.t < D.CUT_IN + STEP, 'two presses through the hold are Next and Play; neither starts the meter'); }
  { const c = M().cut; T.update(STEP); runUntil(() => { kickBot(c, { aim:0 }); return c.g.stage === 'flight'; }, 900); ok(c.g.stage === 'flight', 'then the kick is taken from Aim (a frame after Play, as a thumb lifts: a press on the very frame the thumb is first read is a finger already down)'); runUntil(() => M().phase !== 'cut', 900); }
  fresh(); D.goalKick(0, 88, 35, 'penalty'); ok(D.tut() == null && M().cut.g.aid === 'line', 'the second kick: no card, the line (the aid was the first time\'s)'); runUntil(() => { const c = M().cut; if (!c) return true; kickBot(c, { aim:0 }); return false; }, 1200);
  // a drop goal from the real B hold: the thumb still down carries over Play; lifted during the card, a fresh press is needed
  const drop = () => { fresh(); K.stageDrop({ x:92, y:35 }, [{ x:104, y:35 }], 0); const c = S.ctrlOf(0); c.hold = 1; let n = 0; while (K.kickLabel(0) !== 'Drop Goal' && n++ < 60) T.update(STEP); inputs[0].bPressed = true; inputs[0].bDown = true; runUntil(() => M().phase === 'cut', 40); return M().cut; };
  { const c = drop(); ok(c && c.g.type === 'drop' && D.tut() && D.tut().id === 'drop' && $('tu-title').textContent === 'Drop Goal' && c.g.aid === 'path', 'the first drop goal: the card and the path');
    runUntil(() => c.t >= D.CUT_IN, 30); for (let i = 0; i < 30; i++) T.update(STEP); ok(c.g.m === 0 && c.t < D.CUT_IN + STEP, 'the meter does not fill under the card');
    $('tu-skip').click(); T.update(STEP); ok(D.tut() == null && c.g.stage === 'hold' && c.g.started, 'Play with the thumb still down: the hold runs on');
    for (let i = 0; i < 20; i++) T.update(STEP); ok(c.g.m > 0, 'and the meter fills'); inputs[0].bDown = false; runUntil(() => M().phase !== 'cut', 900); }
  settings().tut = settings().tut.filter(id => id !== 'drop');
  { const c = drop(); runUntil(() => c.t >= D.CUT_IN, 30); inputs[0].bDown = false; $('tu-skip').click(); T.update(STEP); ok(c.g.stage === 'wait' && c.g.m === 0, 'the thumb lifted under the card: back to Wait for a fresh press');
    inputs[0].bPressed = true; inputs[0].bDown = true; T.update(STEP); ok(c.g.stage === 'hold', 'which starts the hold'); inputs[0].bDown = false; runUntil(() => M().phase !== 'cut', 900); }
  ok(D.TUT_IDS.filter(id => id !== 'past').every(id => settings().tut.includes(id)), `every moment is now remembered (${settings().tut.join(', ')})`);
}
done('B every moment');

// C. the words: every card on every device, Title Case, the control named for the device
begin('words');
{
  const all = [];
  D.setTwo(false); fresh();
  for (const dev of ['touch', 'kb', 'pad']) { D.setDev(dev); for (const id of D.TUT_IDS) for (const [title, text] of D.tutCards(id, 0)) all.push([dev, id, title, text]); }
  D.setDev('touch');
  ok(all.every(([, , title, text]) => titled(title) && titled(text)), `every card is Title Case (${all.filter(([, , t, x]) => !titled(t) || !titled(x)).map(a => a[3]).join(' | ') || all.length + ' cards'})`);
  ok(all.every(([, , , text]) => !/[←-↙⇐-⇙]/.test(text)), 'no arrow glyph');
  const text = (dev, id) => { D.setDev(dev); const t = D.tutCards(id, 0)[1][1]; D.setDev('touch'); return t; };
  // on a keyboard every key is a {code} token, which the card draws as a keycap (as the hint chips do): never 'A' as a word or '/' as punctuation
  ok(text('touch', 'past') === 'Flick the Stick Away From Him When the Ring Turns Gold' && text('kb', 'past') === 'Tap {KeyA} or {KeyD} Away From Him When the Ring Turns Gold' && text('pad', 'past') === 'Flick the Stick Away From Him When the Ring Turns Gold', 'Get Past names the stick, or the A and D keycaps on a keyboard');
  ok(text('touch', 'pass') === 'Press Pass on Gold, or Dummy If He Drifts to Your Runner' && text('kb', 'pass') === 'Press {KeyJ} on Gold, or {KeyK} If He Drifts to Your Runner' && text('pad', 'pass') === 'Press the Bottom Button on Gold, or the Right Button If He Drifts to Your Runner', `Key Pass names the buttons for the device (${text('pad', 'pass')})`);
  ok(text('touch', 'scrum') === 'Press Push on Set, Then Tap It Fast' && text('kb', 'scrum') === 'Press {KeyJ} on Set, Then Tap It Fast', 'the scrum');
  ok(text('touch', 'goal') === 'Steer With the Stick, Hold Kick, Let Go in the Gold' && text('kb', 'goal') === 'Steer With {KeyA} and {KeyD}, Hold {KeyJ}, Let Go in the Gold', 'the goal kick');
  ok(text('touch', 'drop') === 'Hold Kick, Steer With the Stick, Let Go in the Gold Before They Reach You' && text('kb', 'drop') === 'Hold {KeyK}, Steer With {KeyA} and {KeyD}, Let Go in the Gold Before They Reach You', 'the drop goal');
  ok(D.tutCards('tackle', 0)[0].join(' · ') === 'Tackle · You Are the Last Man' && D.tutCards('block', 0)[0].join(' · ') === 'Block · Their Pass Crosses Your Man' && D.tutCards('lineout', 0)[1][1] === 'Press Jump So Your Jumper Is Up When the Ball Arrives', 'Tackle, Block and the lineout');
  ok(D.tutHtml('Press {KeyJ} on Gold, or {KeyK} If He Drifts') === 'Press <kbd class="kc">J</kbd> on Gold, or <kbd class="kc">K</kbd> If He Drifts' && D.tutHtml('a <b> & {Slash}') === 'a &lt;b&gt; &amp; <kbd class="kc">/</kbd>', 'tutHtml draws each token as a keycap and escapes the words');
  // two player: each seat's own keys
  fresh({ humans:[true, true], levels:[1, 1] });
  ok(D.tutCards('pass', 0)[1][1] === 'Press {KeyF} on Gold, or {KeyG} If He Drifts to Your Runner' && D.tutCards('pass', 1)[1][1] === 'Press {Slash} on Gold, or {Period} If He Drifts to Your Runner' && D.tutCards('past', 1)[1][1] === 'Tap an Arrow Away From Him When the Ring Turns Gold' && D.tutCards('goal', 1)[1][1] === 'Steer With the Arrows, Hold {Slash}, Let Go in the Gold', `two player: Player 1's F and G, Player 2's / . and the arrows (${D.tutCards('past', 1)[1][1]})`);
  // Player 2's cards as drawn: / and . are keycaps in the sentence, never a full stop or a typo (they read 'Press / on Gold, or . If He Drifts')
  M().tut = { id:'pass', seat:1, step:0, cut:null }; D.tutAdvance();
  ok($('tu-text').innerHTML === 'Press <kbd class="kc">/</kbd> on Gold, or <kbd class="kc">.</kbd> If He Drifts to Your Runner', `Player 2's Key Pass card draws / and . as keycaps (${$('tu-text').innerHTML})`);
  M().tut = { id:'drop', seat:1, step:0, cut:null }; D.tutAdvance();
  ok($('tu-text').innerHTML === 'Hold <kbd class="kc">.</kbd>, Steer With the Arrows, Let Go in the Gold Before They Reach You', `and his Drop Goal card (${$('tu-text').innerHTML})`);
  M().tut = null; $('m-tut').hidden = true;
  for (const s of [0, 1]) for (const id of D.TUT_IDS) for (const [title, text] of D.tutCards(id, s)) all.push(['two kb ' + s, id, title, text]);
  D.setTwo(false);
  // every card on every device and seat, as drawn: with the keycaps taken out, no bare / . , or lone letter stands as a word, and no token is left undrawn
  { const drawn = all.map(a => [a[0], a[1], D.tutHtml(a[3]).replace(/<kbd class="kc">[^<]*<\/kbd>/g, 'KEY').replace(/<[^>]+>/g, '')]);   // each keycap read as the word KEY, so the sentence's own commas stay attached
    const wrong = drawn.filter(([, , t]) => bare.test(t) || /[{}]/.test(t));
    ok(drawn.length >= 48 && wrong.length === 0, `no card names a key as bare punctuation or a lone letter outside a keycap, on ${drawn.length} cards (${wrong.map(w => w[0] + ' ' + w[1] + ': ' + w[2]).join(' | ') || 'none'})`); }
  ok(/<dt>Tutorial<\/dt><dd>The first time each close-up comes up, play pauses and a card says what to do\. <b>Replay Tutorial<\/b> below shows them all again\.<\/dd>/.test(html), 'the Help page\'s Tutorial entry');
  ok(/<div class="modal" id="m-tut" hidden>/.test(html) && /<div class="row2" id="tu-row"><button class="btn" id="tu-skip">Skip<\/button><button class="btn" id="tu-next">Next<\/button><\/div>/.test(html) && /<button class="btn primary" id="tu-play" hidden>Play<\/button>/.test(html), 'the card: Skip | Next balanced, then Play on its own row');
}
done('C words');

// D. Hints Off, headless, the memory, Replay Tutorial, pause under the card, two player
begin('memory and seats');
{
  unseen(); settings().hints = false;
  fresh(); D.stage('past'); T.update(STEP); let c = M().cut;
  ok(c && D.tut() == null && settings().tut.includes('past') && Math.abs(c.wid - (0.23 + 0.08 + Math.max(-0.036, Math.min(0.036, 0.012*(M().nat[0].pace - M().nat[1].power))))) < 1e-9, 'Hints Off: no card, but the moment is remembered and the first-time window aid (+0.08) is given');
  runUntil(() => M().phase !== 'cut', 900);
  fresh(); D.stage('past'); T.update(STEP); c = M().cut; ok(Math.abs(c.wid - (0.23 + Math.max(-0.036, Math.min(0.036, 0.012*(M().nat[0].pace - M().nat[1].power))))) < 1e-9, 'the second Get Past has no aid'); runUntil(() => M().phase !== 'cut', 900);
  settings().hints = true;
  unseen(); T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'live' }); D.setMode('match'); D.stage('tackle'); T.update(STEP);
  ok(M().phase === 'cut' && D.tut() == null && settings().tut.includes('tackle'), 'headless: no card (the tools never pause), the moment still remembered'); runUntil(() => M().phase !== 'cut', 900);
  // the save round-trip and the cleaning
  X.restore({ settings:{ tut:['scrum', 'bogus', 'goal', 'goal'] } }); ok(settings().tut.join() === 'scrum,goal', 'a saved list loads in the game\'s order, unknown and repeated moments dropped');
  X.restore({ settings:{ tut:'scrum' } }); ok(settings().tut.join() === 'scrum,goal', 'a string is ignored');
  const kept = globalThis.localStorage, mem = {}; globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
  X.save(); ok(JSON.parse(mem['tryline.v1']).settings.tut.join() === 'scrum,goal', 'save writes it'); settings().tut = []; X.load(); ok(settings().tut.join() === 'scrum,goal', 'load reads it back'); globalThis.localStorage = kept;
  // Replay Tutorial
  seenAll(); D.renderHintSwitches(); ok($('h-replay').disabled === false, 'Replay Tutorial is live with moments seen');
  $('h-replay').click(); ok(settings().tut.length === 0 && $('h-replay').disabled === true, 'pressing it forgets them all and dims the button');
  fresh(); D.stage('past'); T.update(STEP); ok(D.tut() && D.tut().id === 'past', 'and the next Get Past has its card again'); runUntil(() => M().phase !== 'cut', 900);
  // pause under the card, then resume: the card is still there and Play still works
  unseen(); fresh(); D.stage('pass'); T.update(STEP); c = M().cut; runUntil(() => c.t >= D.CUT_IN, 30);
  D.pause(); ok(M().paused && D.tut(), 'paused under the card'); D.resume(); ok(!M().paused && D.tut() && D.tut().id === 'pass', 'resumed: the card is still up');
  for (let i = 0; i < 30; i++) T.update(STEP); const held = c.t; for (let i = 0; i < 30; i++) T.update(STEP); ok(c.t === held, 'and the hold goes on');
  $('tu-skip').click(); runUntil(() => M().phase !== 'cut', 900);
  // two player: the owner's seat is named, either seat advances, the memory is the device's
  unseen(); fresh({ humans:[true, true], levels:[1, 1] }); D.stage('past', 1); T.update(STEP); c = M().cut;
  ok(c && c.own === 1 && D.tut() && D.tut().seat === 1 && $('tu-eye').textContent === 'Player 2 · Tutorial' && $('tu-eye').classList.contains('p2') && tuText() === 'Beat the Last Man', `Player 2's first Get Past: ${$('tu-eye').textContent}`);
  runUntil(() => c.t >= D.CUT_IN, 30); inputs[0].aPressed = true; T.update(STEP); ok(D.tut() && D.tut().step === 1, 'Player 1\'s press advances it too (either can skip)');
  ok(tuText() === 'Tap an Arrow Away From Him When the Ring Turns Gold', `card 2 names Player 2's keys (${tuText()})`);
  inputs[1].aPressed = true; T.update(STEP); ok(D.tut() == null, 'and Player 2\'s press is Play');
  runUntil(() => M().phase !== 'cut', 900);
  fresh({ humans:[true, true], levels:[1, 1] }); D.stage('past', 0); T.update(STEP); ok(D.tut() == null && settings().tut.includes('past'), 'Player 1\'s first Get Past on this device shows no card: the memory is the device\'s'); runUntil(() => M().phase !== 'cut', 900);
  // a CPU's scrum in one player: the human's seat
  unseen(); fresh(); runUntil(() => M().phase === 'play', 400); T.scrum(1, 60, 35, ''); runUntil(() => M().phase === 'cut', 400); ok(D.tut() && D.tut().id === 'scrum' && D.tut().seat === 0 && $('tu-eye').textContent === 'Tutorial', 'their scrum in one player: the card is yours'); $('tu-skip').click(); runUntil(() => M().phase === 'play', 4000);
  // a CPU's kick: no tutorial
  unseen(); fresh(); runUntil(() => M().phase === 'play', 400); D.goalKick(1, 32, 35, 'penalty'); ok(M().phase === 'cut' && M().cut.g.watch && D.tut() == null && !settings().tut.includes('goal'), 'the CPU\'s kick: no card, nothing remembered'); runUntil(() => M().phase !== 'cut', 900);
  // quitting under the card hides it
  unseen(); fresh(); D.stage('past'); T.update(STEP); ok(D.tut(), 'a card up'); D.exitMatch(); ok($('m-tut').hidden && (!M() || !M().tut), 'Quit Match takes it down');
  D.setTwo(false); seenAll();
}
done('D memory and seats');

// E. the first-match coach: one line each, once, and quiet when the match is not a player's
begin('coach');
{
  const X = T.teams, line = id => D.COACH_LINE[id];
  ok(D.COACH_IDS.join() === 'offload,step,tackle,duel,kick,pass,sprint' && /coach:true, tips:\[\]/.test(html), 'Coach Tips starts on, and the lines are the seven moments');
  const seg = [...document.querySelectorAll('.seg[data-key]')].find(g => g.dataset.key === 'coach');
  ok(!!seg && seg.children.length === 2, 'the home row is Coach Tips, On and Off');
  seg.children[1].click(); ok(settings().coach === false, 'Off stores false');
  seg.children[0].click(); ok(settings().coach === true, 'On stores true');
  X.restore({ settings:{ tips:['sprint', 'nope', 'pass', 'pass'] } });
  ok(settings().tips.join() === 'pass,sprint', `known lines load in the game's order (${settings().tips.join()})`);
  settings().coach = false;
  X.restore({ settings:{ tips:'pass', coach:'yes' } });
  ok(settings().coach === false && settings().tips.join() === 'pass,sprint', 'a string for the lines or the switch is ignored');
  const kept = globalThis.localStorage, mem = {};
  globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
  settings().coach = false; settings().tips = ['tackle'];
  X.save(); settings().coach = true; settings().tips = []; X.load();
  ok(settings().coach === false && settings().tips.join() === 'tackle' && JSON.parse(mem['tryline.v1']).settings.tips.join() === 'tackle', 'tryline.v1 keeps the switch and the lines heard');
  globalThis.localStorage = kept;
  settings().coach = true; settings().hints = true; settings().tips = []; D.coachClear();
  const pose = (o) => {
    fresh(o);
    const m = M();
    m.phase = 'play'; m.paused = false; m.over = false; m.cut = null; m.contact = null; m.tut = null;
    const me = m.side[0].ctrl;
    me.x = 30; me.y = 35; me.bind = null; me.down = 0; me.tcd = 0; me.offside = 0;
    m.ball.state = 'held'; m.ball.carrier = me;
    for (const p of m.players) if (p.team === 1) { p.x = 110; p.y = 12; p.down = 0; p.bind = null; }
    m.spr[0].m = 1; m.spr[0].spent = false; m.spr[0].p = null;
    return m;
  };
  const hear = (id) => { D.coachClear(); D.updateHud(); ok(D.coachLast() === line(id) && settings().tips.includes(id), `${id}: ${D.coachLast()}`); };
  let m = pose();
  hear('pass');
  D.updateHud(); ok(settings().tips.join() === 'pass', 'the next frame does not stack a second line on the pass');
  const me = m.side[0].ctrl, opp = m.players.find(p => p.team === 1);
  me.x = 40; me.y = 35; opp.x = 42; opp.y = 35; m.ball.carrier = opp;
  hear('tackle');
  const mate = m.players.find(p => p.team === 0 && p !== me);
  for (const p of m.players) if (p.team === 0 && p !== me) { p.x = 8; p.y = 8; p.down = 0; p.bind = null; }
  me.x = 50; me.y = 35; mate.x = 46; mate.y = 35; m.ball.carrier = me;
  me.bind = m.contact = { c:me, tier:'dom', offloaded:false };
  D.coachClear(); D.updateHud(); ok(D.coachLast() == null && !settings().tips.includes('offload'), 'a Big Hit does not offer the offload line');
  m.contact.tier = me.bind.tier = 'soft';
  hear('offload');
  me.bind = null; m.contact = null; me.x = 40; me.y = 35;
  let i = 0; for (const p of m.players) if (p.team === 1) { p.x = i === 0 ? 45 : 110; p.y = i === 0 ? 35 : 8; p.down = 0; p.bind = null; i++; }
  hear('step');
  for (const p of m.players) if (p.team === 1) { p.x = 110; p.y = 12; }
  hear('sprint');
  ok(settings().tips.filter(id => ['pass', 'tackle', 'offload', 'step', 'sprint'].includes(id)).length === 5, `the five open-play lines have each fired once (${settings().tips.join(', ')})`);
  // quiet matches, even if a side is marked human so a line would otherwise be due
  for (const [name, o] of [['headless', { headless:true }], ['auto', { auto:true }], ['demo', { demo:true }]]) {
    settings().tips = []; D.coachClear(); const q = pose(o); q.side[0].human = true; q.auto = o.auto || q.auto; q.demo = !!o.demo; q.headless = !!o.headless;
    D.updateHud(); D.coachTick();
    ok(settings().tips.length === 0 && D.coachLast() == null, `${name}: no coach line`);
  }
  settings().tips = []; settings().coach = false; D.coachClear(); pose(); D.updateHud();
  ok(settings().tips.length === 0 && D.coachLast() == null, 'Coach Tips off: nothing');
  settings().coach = true; settings().hints = true;
  // the first duel. Hints off and no card: the line. Hints on: the card covers it, the line is only remembered
  settings().tut = settings().tut.filter(id => id !== 'past'); settings().tips = []; D.coachClear(); settings().hints = false;
  fresh(); D.stage('past'); T.update(STEP);
  let c = M().cut;
  ok(c && c.kind === 'past' && D.tut() == null && settings().tut.includes('past'), 'hints off: the first duel is remembered and no card is up');
  { let n = 0; while (c.t < D.CUT_IN && n++ < 40) T.update(STEP); }
  D.coachTick();
  ok(D.coachLast() === line('duel') && settings().tips.includes('duel'), `the coach says the duel line (${D.coachLast()})`);
  D.coachTick(); ok(settings().tips.filter(id => id === 'duel').length === 1, 'once');
  settings().hints = true; settings().tips = settings().tips.filter(id => id !== 'duel'); D.coachClear();
  fresh(); D.stage('past'); T.update(STEP);
  ok(D.tut() == null && M().phase === 'cut', 'the next Get Past has no tutorial card');
  D.coachTick();
  ok(settings().tips.includes('duel') && D.coachLast() == null, 'hints on: the hints card covers the duel, so the coach stays quiet and remembers it');
  // the first goal kick keeps its card and its path. The coach remembers the kick line and does not say it
  settings().tut = settings().tut.filter(id => id !== 'goal'); settings().tips = settings().tips.filter(id => id !== 'kick');
  settings().hints = true; D.coachClear();
  fresh(); D.goalKick(0, 88, 35, 'penalty');
  ok(D.tut() && D.tut().id === 'goal' && M().cut.g.aid === 'path', 'the first kick still has the card and the path');
  D.coachTick();
  ok(!settings().tips.includes('kick') && D.coachLast() == null, 'under the card the coach stays quiet');
  $('tu-skip').click(); D.coachTick();
  ok(settings().tips.includes('kick') && M().cut.g.aid === 'path' && D.coachLast() == null, 'after Play the path still owns the kick: the line is remembered, not said');
  settings().coach = true; settings().hints = true; settings().tips = D.COACH_IDS.slice(); settings().tut = D.TUT_IDS.slice(); D.setTwo(false);
}
done('E coach');

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
