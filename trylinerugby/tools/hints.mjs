// The hints card (2026-10-17): its settings and saving, its words for every moment on every device and seat, when it shows and
// hides, that it never covers a figure or the ring in a duel, the open-play cards' triggers, the penalty card's sublines and
// tick, the home row and the pause rows. Exits 1 on any failure.
// node tools/hints.mjs            (SEED=3 unless set)
process.env.SEED ??= '3';
import fs from 'fs';
const { T, inputs, bot, reseed, rndCalls, kickBot, padStub, fire } = await import('./harness.mjs');
const D = T.debug, X = T.teams, K = T.kick, C = T.contact, S = T.sides, STEP = T.STEP, M = () => T.M, $ = id => document.getElementById(id);
let failed = 0, passed = 0, group = '';
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', group + ':', msg); } };
const done = name => { console.log(`${name.padEnd(26)} ${failed ? 'FAIL so far ' + failed : 'ok'} (${passed} passed)`); };
const begin = name => { group = name; };
const html = fs.readFileSync(new URL(process.env.GAME || '../index.html', import.meta.url), 'utf8');
if (!D.hintFor || !D.hintShown) { console.log('FAIL hints: hintFor and hintShown are missing from the engine'); console.log('0 passed, 1 failed'); process.exit(1); }
const settings = () => D.settings();
const fresh = (o = {}) => { T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'live', ...o }); D.setMode('match'); D.setTwo(!!(o.humans && o.humans[0] && o.humans[1])); for (const inp of inputs) { inp.keys.clear(); inp.jx = inp.jy = 0; inp.aPressed = inp.bPressed = inp.cPressed = false; inp.aDown = inp.bDown = inp.cDown = false; } };
const sync = (la = 'Pass', lb = 'Kick') => { D.syncHints(la, lb); return D.hintShown(); };
const runUntil = (pred, max = 600) => { for (let i = 0; i < max && !pred(); i++) T.update(STEP); return pred(); };
const small = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'on', 'to', 'in', 'for', 'as', 'at', 'by']);
const titled = s => String(s).split(/[\s,]+/).filter(Boolean).every((w, i) => (i && small.has(w)) || !/^[a-z]/.test(w));
const rowsOf = h => h.rows.map(r => r.chips.map(c => c.act + ':' + c.label).join('|') + ' ' + r.text).join(' / ');
const settingsOn = () => { settings().hints = true; settings().twoHints = [true, true]; };

// A. settings: defaults, cleaning, saving, the switches per seat and by half
begin('settings');
{
  const s = settings();
  ok(s.hints === true && Array.isArray(s.twoHints) && s.twoHints.length === 2 && Array.isArray(s.tut), `the defaults: hints ${s.hints}, twoHints ${JSON.stringify(s.twoHints)}, tut an array`);
  X.restore({ settings:{ hints:false, twoHints:[true, false] } }); ok(s.hints === false && s.twoHints[0] === true && s.twoHints[1] === false, 'booleans load');
  X.restore({ settings:{ hints:'off', twoHints:[1, 0] } }); ok(s.hints === false && s.twoHints[1] === false, 'a string and numbers are ignored');
  X.restore({ settings:{ twoHints:[true] } }); ok(s.twoHints.length === 2 && s.twoHints[1] === false, 'a short pair is ignored');
  X.restore({ settings:{ twoHints:[true, true, true] } }); ok(s.twoHints.length === 2 && s.twoHints[1] === false, 'so is a long one');
  X.restore({ settings:{ hints:true, twoHints:[true, true] } });
  const kept = globalThis.localStorage, mem = {};
  globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
  s.hints = false; s.twoHints = [false, true]; X.save();
  const w = JSON.parse(mem['tryline.v1']).settings;
  ok(w.hints === false && w.twoHints.join() === 'false,true' && Array.isArray(w.tut), 'save writes hints, twoHints and the tutorial memory');
  s.hints = true; s.twoHints = [true, true]; X.load();
  ok(s.hints === false && s.twoHints[0] === false && s.twoHints[1] === true, 'and load reads them back');
  // every switch saves as it is pressed (Hints Off from the card was lost on reload unless something else happened to save): the card's tick, a
  // pause row, a join tick, and the home row, which stores a boolean (not the button's index, which would read as Off)
  const stored = () => JSON.parse(mem['tryline.v1']).settings;
  s.hints = true; s.twoHints = [true, true]; D.setTwo(false); fresh(); $('ht0').click(); ok(s.hints === false && stored().hints === false, 'the card\'s tick saves Hints Off at once');
  $('pz-h0').children[0].click(); ok(s.hints === true && stored().hints === true, 'the pause card\'s On saves');
  $('pz-h0').children[1].click(); ok(s.hints === false && stored().hints === false, 'and its Off');
  D.setTwo(true); D.resetSeats(); $('jt1').click(); ok(s.twoHints.join() === 'true,false' && stored().twoHints.join() === 'true,false', 'a join tick saves that half');
  $('pz-h1').children[0].click(); ok(stored().twoHints.join() === 'true,true', 'Player 2\'s pause row saves his half'); D.setTwo(false);
  const home = document.querySelectorAll('.seg[data-key]').find(g => g.dataset.key === 'hints');
  ok(!!home && home.children.length === 2, 'the home screen has a Hints row with On and Off');
  home.children[1].click(); ok(s.hints === false && stored().hints === false, 'the home row\'s Off stores false');
  home.children[0].click(); ok(s.hints === true && typeof s.hints === 'boolean' && stored().hints === true, `the home row's On stores true, a boolean (${JSON.stringify(s.hints)})`);
  globalThis.localStorage = kept;
  // one player: the setting; two player: by keyboard half, so a swap moves it with the player
  settingsOn(); D.setTwo(false);
  ok(D.hintsOn(0) === true && D.hintsOn(null) === false, 'one player reads settings.hints');
  D.setHints(0, false); ok(settings().hints === false && settings().twoHints.join() === 'true,true', 'setHints in one player writes settings.hints only');
  settingsOn(); D.setTwo(true); D.resetSeats();
  D.setHints(1, false); ok(settings().twoHints.join() === 'true,false' && D.hintsOn(0) && !D.hintsOn(1) && settings().hints === true, 'two player: Player 2\'s tick writes the right half');
  D.twoSwap(); ok(!D.hintsOn(0) && D.hintsOn(1), 'after Swap Players the setting goes with the player');
  D.setHints(0, true); ok(settings().twoHints.join() === 'true,true', 'and his tick writes his own half');
  D.twoSwap(); D.setTwo(false); settingsOn();
  // the tick on the in-match card
  fresh(); $('ht0').click(); ok(settings().hints === false, 'the card\'s tick turns one player\'s Hints off');
  settingsOn();
  fresh({ humans:[true, true], levels:[1, 1] }); $('ht1').click(); ok(settings().twoHints.join() === 'true,false' && settings().hints === true, 'Player 2\'s card tick turns his Hints off');
  settingsOn(); D.setTwo(false);
}
done('A settings');

// B. the words: every moment on every device, Title Case, no arrows, chip labels the buttons' own, badges the seat's keys, within the width budget
begin('words');
{
  settingsOn();
  const want = {
    past:['Get Past', 'To His Open Side', { touch:'x:Stick Flick on Gold', kb:'x:Stick Step on Gold', pad:'x:Stick Flick on Gold' }],
    pass:['Key Pass', 'Dummy If He Drifts', { touch:'a:Pass|b:Dummy On Gold', kb:'a:Pass|b:Dummy On Gold', pad:'a:Pass|b:Dummy On Gold' }],
    tackle:['Tackle', 'He May Step', { touch:'a:Tackle On Gold', kb:'a:Tackle On Gold', pad:'a:Tackle On Gold' }],
    block:['Block', 'He May Dummy', { touch:'a:Block On Gold', kb:'a:Block On Gold', pad:'a:Block On Gold' }],
  };
  const all = [];
  for (const kind of ['past', 'pass', 'tackle', 'block']) for (const dev of ['touch', 'kb', 'pad']) {
    fresh(); D.setDev(dev);
    if (kind === 'block') T.forceDuel('block'); else { D.stage(kind); T.update(STEP); }
    const c = M().cut, h = sync();
    ok(c && c.kind === kind && h[0] && h[0].title === want[kind][0] && h[0].rule === want[kind][1] && rowsOf(h[0]) === want[kind][2][dev] && !h[0].kick, `${kind} on ${dev}: ${h[0] && h[0].title} · ${h[0] && h[0].rule} · ${h[0] && rowsOf(h[0])}`);
    if (h[0]) all.push(h[0]);
    // the chip labels are what the buttons say for this close-up
    D.updateHud();
    const labels = [$('la').textContent, $('lb').textContent].filter(Boolean);
    ok(h[0].rows.every(r => r.chips.every(ch => ch.act === 'x' || labels.includes(ch.label))), `${kind}: the chips (${h[0].rows.map(r => r.chips.map(ch => ch.label).join('/')).join(' ')}) are the buttons' own labels (${labels.join(', ')})`);
    runUntil(() => M().phase !== 'cut', 900);
  }
  D.setDev('touch');
  // two player: the owner's card with his keys, the chooser's with his
  fresh({ humans:[true, true], levels:[1, 1] });
  const chooser = { past:['Before Gold', 'x:Stick Guard a Shoulder'], pass:['Before Gold', 'x:Stick Drift or Rush'], tackle:['Before Gold', 'x:Stick Step Left or Right'], block:['Before the Pass', 'b:Dummy Tap It'] };
  for (const kind of ['past', 'pass', 'tackle', 'block']) {
    fresh({ humans:[true, true], levels:[1, 1] });
    if (kind === 'block') T.forceDuel('block', 1); else { D.stage(kind, 1); T.update(STEP); }
    const h = sync();
    ok(h[1] && h[1].title === want[kind][0] && rowsOf(h[1]) === want[kind][2].kb && h[0] && h[0].title === want[kind][0] && h[0].rule === chooser[kind][0] && rowsOf(h[0]) === chooser[kind][1], `${kind} owned by Player 2: his card (${h[1] && rowsOf(h[1])}), Player 1's chooser card (${h[0] && h[0].rule} · ${h[0] && rowsOf(h[0])})`);
    if (h[0]) all.push(h[0]); if (h[1]) all.push(h[1]);
    runUntil(() => M().phase !== 'cut', 900);
  }
  // the badges: keycaps by the seat's own scheme, pad glyphs by position
  ok(/<kbd class="kc">F<\/kbd>/.test(D.keycapsFor(0, 'a')) && /A<\/kbd>.*D<\/kbd>/.test(D.keycapsFor(0, 'x')) && /W<\/kbd>.*S<\/kbd>/.test(D.keycapsFor(0, 'v')) && /<kbd class="kc">A<\/kbd>/.test(D.keycapsFor(0, 'back')), `two player, Player 1: F, A D, W S and A (back) (${D.keycapsFor(0, 'x')})`);
  ok(/<kbd class="kc">\/<\/kbd>/.test(D.keycapsFor(1, 'a')) && /kc ar l.*kc ar r/.test(D.keycapsFor(1, 'x')) && /kc ar u.*kc ar d/.test(D.keycapsFor(1, 'v')) && /kc ar r"/.test(D.keycapsFor(1, 'back')), `Player 2 on the arrows: /, left and right, up and down, and right for back (attacking left) (${D.keycapsFor(1, 'back')})`);
  D.setTwo(false); fresh();
  ok(/J<\/kbd>/.test(D.keycapsFor(0, 'a')) && /K<\/kbd>/.test(D.keycapsFor(0, 'b')) && /L<\/kbd>/.test(D.keycapsFor(0, 'c')), 'one player: J K L');
  D.setDev('pad'); ok(/pad dia/.test(D.chipHtml(0, { act:'a', label:'Pass' })) && /pad sh/.test(D.chipHtml(0, { act:'c', label:'Sprint' })) && /pad stick/.test(D.chipHtml(0, { act:'x', label:'Stick' })), 'a controller badges the diamond, the shoulder and the stick');
  D.setDev('touch'); ok(!/badges/.test(D.chipHtml(0, { act:'a', label:'Pass' })) && /chip a/.test(D.chipHtml(0, { act:'a', label:'Pass' })), 'touch: the chip alone, in the big button\'s look');
  // the badges stand 9px above their chips: a keyboard or pad card is badged (its rows start lower, clear of the rule line), and a chip whose
  // badge is wider than its padding (two keycaps, the shoulder glyph) is wide or mid, so the badge never sits on the chip's own label
  D.setDev('kb'); fresh(); D.stage('past'); T.update(STEP); sync();
  ok($('hc0').classList.contains('badged') && /^<span class="chip x wide">/.test(D.chipHtml(0, { act:'x', label:'Stick' })) && /^<span class="chip x wide">/.test(D.chipHtml(0, { act:'v', label:'Stick' })) && /^<span class="chip a">/.test(D.chipHtml(0, { act:'a', label:'Pass' })) && /^<span class="chip x">/.test(D.chipHtml(0, { act:'back', label:'Stick' })), 'a keyboard card is badged; a two-keycap chip is wide, a one-keycap chip is not');
  D.setDev('pad'); sync(); ok($('hc0').classList.contains('badged') && /^<span class="chip c mid">/.test(D.chipHtml(0, { act:'c', label:'Sprint' })) && /^<span class="chip a">/.test(D.chipHtml(0, { act:'a', label:'Pass' })), 'a controller card is badged; the shoulder chip is mid');
  D.setDev('touch'); sync(); ok(!$('hc0').classList.contains('badged') && /^<span class="chip x">/.test(D.chipHtml(0, { act:'x', label:'Stick' })), 'a touch card is not badged and no chip is wide'); runUntil(() => M().phase !== 'cut', 900);
  ok(/\.hc\.badged \.hc-rows\{margin-top:7px\}/.test(html) && /\.chip\.wide\{padding-right:36px\}\.chip\.mid\{padding-right:24px\}/.test(html), 'the stylesheet gives a badged card its 7px and a wide or mid chip its padding');
  // set pieces and kicks
  T.newMatch(0, 1, { halfLen:240, diff:1, headless:false, duels:'live' }); D.setMode('match'); D.setTwo(false); runUntil(() => M().phase === 'play', 400);
  T.scrum(0, 60, 35, ''); runUntil(() => M().phase === 'cut', 400);
  let h = sync(); ok(h[0] && h[0].title === 'Scrum' && h[0].rule === 'Your Ball' && rowsOf(h[0]) === 'a:Push Hit on Set / a:Push Then Tap Fast', `our scrum: ${h[0] && h[0].rule} · ${h[0] && rowsOf(h[0])}`); if (h[0]) all.push(h[0]);
  runUntil(() => M().cut.result, 4000); h = sync(); ok(h[0] == null, 'and the card goes at the result');
  runUntil(() => M().phase === 'play', 4000);
  T.scrum(1, 60, 35, ''); runUntil(() => M().phase === 'cut', 400); h = sync(); ok(h[0] && h[0].rule === 'Steal Their Ball', `their scrum: ${h[0] && h[0].rule}`); if (h[0]) all.push(h[0]);
  runUntil(() => M().phase === 'play', 4000);
  T.lineout(1, 60, 5, ''); runUntil(() => M().phase === 'cut', 400); h = sync(); ok(h[0] && h[0].title === 'Lineout' && h[0].rule === 'Steal Their Throw' && rowsOf(h[0]) === 'a:Jump Ball Halfway', `their lineout: ${h[0] && h[0].rule} · ${h[0] && rowsOf(h[0])}`); if (h[0]) all.push(h[0]);
  runUntil(() => M().cut.outcome != null, 4000); h = sync(); ok(h[0] == null, 'and the card goes at the catch');
  runUntil(() => M().phase === 'play', 4000);
  T.lineout(0, 60, 5, ''); runUntil(() => M().phase === 'cut', 400); h = sync(); ok(h[0] && h[0].rule === 'Your Throw', `our lineout: ${h[0] && h[0].rule}`);
  runUntil(() => M().phase === 'play', 4000);
  fresh(); D.goalKick(0, 88, 35, 'penalty'); h = sync(); ok(M().phase === 'cut' && h[0] == null, 'a goal kick: nothing before the cut-in');
  runUntil(() => M().cut.t >= D.CUT_IN, 30); h = sync();
  ok(h[0] && h[0].title == null && h[0].rule === 'Let Go in the Gold' && rowsOf(h[0]) === 'x:Stick Steer the Arrow / a:Kick Hold It' && h[0].kick, `the kick card: ${h[0] && h[0].rule} · ${h[0] && rowsOf(h[0])}, a kick card (no tick)`); if (h[0]) all.push(h[0]);
  D.updateHud(); ok($('la').textContent === 'Kick' && $('ht0').hidden === true, 'the chip is the button\'s word and the tick is hidden');
  runUntil(() => { kickBot(M().cut); return M().cut.g.stage === 'flight'; }, 600); h = sync(); ok(M().cut.g.stage === 'flight' && h[0] == null, 'and the card goes at the strike');
  runUntil(() => M().phase !== 'cut', 900);
  // a drop goal, from the real B hold
  { fresh(); K.stageDrop({ x:92, y:35 }, [{ x:102, y:35 }], 0); const c = S.ctrlOf(0); c.hold = 1; let n = 0; while (K.kickLabel(0) !== 'Drop Goal' && n++ < 60) T.update(STEP);
    inputs[0].bPressed = true; inputs[0].bDown = true; runUntil(() => M().phase === 'cut', 40);
    ok(M().phase === 'cut' && M().cut.kind === 'goal' && M().cut.g.type === 'drop', 'a drop goal close-up from the hold');
    runUntil(() => M().cut.t >= D.CUT_IN, 30); h = sync();
    ok(h[0] && h[0].rule === 'Before They Reach You' && rowsOf(h[0]) === 'x:Stick Steer / b:Kick Let Go in the Gold' && h[0].kick, `the drop card: ${h[0] && h[0].rule} · ${h[0] && rowsOf(h[0])}`); if (h[0]) all.push(h[0]);
    inputs[0].bDown = false; runUntil(() => M().phase !== 'cut', 900); }
  // the CPU's kick: no card
  T.newMatch(0, 1, { halfLen:240, diff:1, headless:false, duels:'live' }); D.setMode('match'); runUntil(() => M().phase === 'play', 400);
  D.goalKick(1, 32, 35, 'penalty'); runUntil(() => M().cut && M().cut.t >= D.CUT_IN + 0.1, 40); h = sync();
  ok(M().phase === 'cut' && M().cut.g.watch && h[0] == null && h[1] == null, 'the CPU\'s kick shows no card');
  runUntil(() => M().phase !== 'cut', 900);
  // open play
  fresh();
  const open = { long:['Long Pass', 'Skips a Man', 'a:Pass Hold It'], sprint:['Sprint', '', 'c:Sprint Hold It'], step:['Side Step', 'Near a Tackler', 'v:Stick Flick Across'], dummy:['Dummy', 'Fakes the Pass', 'back:Stick Pull Back, Push On'], offload:['Offload', 'As You’re Tackled', 'a:Offload Tap It'], drop:['Drop Goal', 'In Range', 'b:Drop Goal Hold It'] };
  for (const [id, [title, rule, rows]] of Object.entries(open)) { D.hintOpen()[0].cur = id; const hh = D.hintFor(0); ok(hh && hh.title === title && hh.rule === rule && rowsOf(hh) === rows, `${id}: ${hh && hh.title} · ${hh && hh.rule} · ${hh && rowsOf(hh)}`); if (hh) all.push(hh); }
  D.setDev('kb'); D.hintOpen()[0].cur = 'step'; ok(rowsOf(D.hintFor(0)) === 'v:Stick Tap Across', 'Side Step on keys: Tap Across (W or S)'); D.hintOpen()[0].cur = 'dummy'; ok(rowsOf(D.hintFor(0)) === 'back:Stick Tap Back', 'Dummy on keys: Tap Back'); D.setDev('touch'); D.hintOpen()[0].cur = null;
  // Title Case, no arrows, the width budget (title at most 9 characters, rule 21, row text 18: the 217px limit at 667x375)
  const words = all.flatMap(hh => [hh.title, hh.rule, ...hh.rows.map(r => r.text), ...hh.rows.flatMap(r => r.chips.map(ch => ch.label))].filter(Boolean));
  ok(words.every(titled), `every word is Title Case (${words.filter(w => !titled(w)).join(', ') || words.length + ' words'})`);
  ok(words.every(w => !/[←-↙⇐-⇙]/.test(w)) && !/[←-↙⇐-⇙]/.test(html.slice(html.indexOf('<body>'))), 'no arrow glyph in a card or the markup');
  ok(all.every(hh => (hh.title || '').length <= 9 && (hh.rule || '').length <= 21 && hh.rows.every(r => r.text.length <= 18)), `every card fits the width budget (longest title ${Math.max(...all.map(hh => (hh.title || '').length))}, rule ${Math.max(...all.map(hh => (hh.rule || '').length))}, row ${Math.max(...all.flatMap(hh => hh.rows.map(r => r.text.length)))})`);
  ok(all.every(hh => hh.duel == null) && all.filter(hh => ['Get Past', 'Key Pass', 'Tackle', 'Block'].includes(hh.title)).every(hh => hh.rows.length === 1), 'every duel card is one row (two rows cover a figure at 667x375)');
}
done('B words');

// C. when it shows: a duel from the cut's start to the verdict, the chooser's card to his lock, Hints Off hides it, the canvas tag yields to a titled card
begin('visibility');
{
  settingsOn(); fresh(); D.stage('past'); T.update(STEP);
  const c = M().cut; let h = sync();
  ok(c && c.t <= STEP + 1e-9 && h[0] && h[0].title === 'Get Past', 'the card is up from the first frame of the cut');
  runUntil(() => c.t >= c.centre, 600); h = sync(); ok(h[0] && h[0].title === 'Get Past', 'and still up at the ring');
  // the canvas tag: not drawn under a titled card, drawn with Hints Off and under a kick card
  const texts = () => { const out = []; globalThis.__ctxSpy = (k, a) => { if (k === 'fillText') out.push(String(a[0])); }; D.view(667, 375); D.drawCut(); globalThis.__ctxSpy = null; return out; };
  let tx = texts(); ok(tx.length > 0 && !tx.includes('GET PAST'), `drawCut skips the canvas tag while the card names the duel (${tx.length} texts drawn)`);
  settings().hints = false; sync(); tx = texts(); ok(tx.includes('GET PAST'), 'and draws it with Hints Off'); settings().hints = true; sync();
  inputs[0].flick = c.open; T.update(STEP); h = sync(); ok(c.res && c.out != null && h[0] == null, `and gone at the verdict (${c.verdict})`);
  runUntil(() => M().phase !== 'cut', 900); h = sync(); ok(h[0] == null || !['Get Past', 'Key Pass', 'Tackle', 'Block'].includes(h[0].title), `no duel card in open play (${h[0] ? 'an open-play ' + h[0].title + ' card' : 'nothing'})`);
  // Hints Off
  settings().hints = false; fresh(); D.stage('past'); T.update(STEP); h = sync(); ok(M().phase === 'cut' && h[0] == null, 'Hints Off: no card'); settings().hints = true; h = sync(); ok(h[0] && h[0].title === 'Get Past', 'Hints On again: the card');
  runUntil(() => M().phase !== 'cut', 900);
  fresh(); D.goalKick(0, 88, 35, 'penalty'); runUntil(() => M().cut.t >= D.CUT_IN, 30); sync(); tx = texts(); ok(tx.some(t => /PENALTY GOAL/.test(t)) && D.hintShown()[0] && D.hintShown()[0].kick, 'a kick card has no title, so the canvas tag stays');
  runUntil(() => M().phase !== 'cut', 900);
  // two player: the chooser's card goes at his lock, the owner's stays
  fresh({ humans:[true, true], levels:[1, 1] }); D.stage('past', 0); T.update(STEP);
  const c2 = M().cut; h = sync(); ok(h[0] && h[0].rule === 'To His Open Side' && h[1] && h[1].rule === 'Before Gold', 'Player 1 owns: his card and Player 2\'s chooser card');
  runUntil(() => c2.locked, 600); h = sync(); ok(c2.locked && h[0] && h[1] == null, 'at the lock the chooser\'s card goes and the owner\'s stays');
  runUntil(() => M().phase !== 'cut', 900); D.setTwo(false);
  // the match's end and the demo: no cards
  fresh(); M().over = true; T.newMatch(0, 1, { halfLen:240, diff:1, auto:true, demo:true }); ok(D.hintShown()[0] == null && $('hc0').hidden, 'the demo shows nothing and a new match starts with the card hidden');
}
done('C visibility');

// D. clearance: over bot-match duels at four phone sizes, no figure's head box and no ring under the one-row card (left 12 to 12 + min(340, W/2 - 116), top to 85)
begin('clearance');
{
  settingsOn();
  for (const [W, H] of [[667, 375], [740, 360], [844, 390], [932, 430]]) {
    D.view(W, H);
    const cardR = 12 + Math.min(340, W/2 - 116), cb = 85;
    let duels = 0, over = 0, ring = 0, minGap = 1e9;
    for (let m = 0; m < 4; m++) {
      reseed(900 + m); T.newMatch(m % 6, (m + 1 + (m % 5)) % 6, { halfLen:120, diff:m % 3, headless:true, duels:'live' });
      let steps = 0, seen = null;
      while (!M().over && steps < 200000) {
        bot(); T.update(STEP); steps++;
        const c = M().cut;
        if (c && c.duel && c !== seen) {
          seen = c; duels++;
          const cam = D.duelCam(c);
          for (const t of [D.CUT_IN + 0.01, (D.CUT_IN + c.win[0])/2, c.win[0], c.centre, c.tk]) {
            const P = D.duelPose(c, t), Pl = D.duelPose(c, Math.max(0, t - 0.12)), { camX, camY } = D.camAt(c, cam, P, Pl);
            const box = a => { if (!a) return null; const z = a.x - camX; if (z < 0.8) return null; const k = cam.F/z, sx = cam.cx + k*(a.y - camY); return [sx - 0.45*k, cam.hz + k*(cam.h - 1.9), sx + 0.45*k, cam.hz + k*cam.h]; };
            for (const b of [box(P.u), box(P.o), box(P.r)]) { if (!b) continue; if (b[0] < cardR && b[2] > 12) { minGap = Math.min(minGap, b[1] - cb); if (b[1] < cb) over++; } }
            if (!(c.kind === 'block' && t < c.rel)) {
              const A = c.kind === 'block' ? { x:c.L.x, y:c.L.y } : P.o, z = A.x - camX;
              if (z > 0.5) { const k = cam.F/z, rsx = cam.cx + k*(A.y - camY), rsy = cam.hz + k*cam.h, r = (c.kind === 'block' ? 0.9 : 2.6 + (0.9 - 2.6)*Math.min(1, Math.max(0, (t - D.CUT_IN)/(c.win[0] - D.CUT_IN))))*k, ry = r*Math.max(0.18, Math.min(0.6, cam.h/z)); if (rsx - r < cardR && rsy - ry < cb) ring++; }
            }
          }
        }
      }
    }
    ok(duels >= 8 && over === 0 && ring === 0, `${W}x${H}: ${duels} duels, no figure (${over}) and no ring (${ring}) under the card; the nearest head ${minGap === 1e9 ? 'never near' : minGap.toFixed(0) + 'px below it'}`);
  }
  D.view(844, 390);
}
done('D clearance');

// E. open play: each trigger once a match a seat, 3s, 4s apart, one at a time, never in a close-up, no random number drawn
begin('open play');
{
  settingsOn();
  const carry = (defAhead, mateOut) => {                   // our ringed man carrying at (60, 35) in open play, a defender defAhead metres ahead (standing) and a team-mate mateOut metres out; everyone else far away
    fresh(); const m = M(), P = m.players, b = m.ball;
    m.phase = 'play'; m.set = null; m.cut = null; m.clock = 60; m.dclock = 60; m.contact = null;
    for (const p of P) { Object.assign(p, { vx:0, vy:0, down:0, tcd:0, side:-1, boost:0, hold:2, bind:null, sprint:0, sprinting:false, wf:0, bite:0 }); p.x = p.team === 0 ? 20 : 110; p.y = 5 + (p.n - 1)*9; }
    const c = P[3], q = P[7], r = P[4];
    c.x = 60; c.y = 35; c.fx = 1; c.fy = 0; c.vx = 6; m.side[0].ctrl = c; m.side[0].ctrlPrev = c; m.side[0].ctrlT = 1;
    b.state = 'held'; b.carrier = c; b.f = null; b.last = 0; b.x = c.x + 0.55; b.y = c.y; b.z = 1;
    if (defAhead != null) { q.x = 60 + defAhead; q.y = 35; q.fx = -1; }
    if (mateOut != null) { r.x = 57; r.y = 35 + mateOut; r.fx = 1; }
    m.spr[0].m = 1; m.spr[0].p = null;
    return { c, q, r, m };
  };
  const H = () => D.hintOpen()[0];
  // Side Step: a standing defender 4.5m ahead, front on
  let { m } = carry(4.5, null); let r0 = rndCalls(); let h = sync(); ok(H().cur === 'step' && h[0] && h[0].title === 'Side Step' && rndCalls() === r0, `a defender 4.5m ahead: the Side Step card (${H().cur}), nothing random drawn`);
  m.dclock += 2.9; h = sync(); ok(H().cur === 'step' && h[0], 'still up at 2.9s');
  m.dclock += 0.2; h = sync(); ok(H().cur == null && h[0] == null, 'gone at 3s');
  m.dclock += 10; h = sync(); ok(H().cur == null && H().shown.has('step'), 'the same trigger again shows nothing: once a match');
  // Dummy: a defender 5m ahead with the ring on a team-mate; it waits 4s after the last start
  ({ m } = carry(5, 7)); H().shown.add('step'); H().last = m.dclock - 2; h = sync(); ok(H().cur == null, 'a card 2s after the last one\'s start: not yet (4s apart)');
  m.dclock += 2.5; h = sync(); ok(H().cur === 'dummy' && h[0] && h[0].title === 'Dummy', `then the Dummy card (${H().cur})`);
  // Long Pass: held 0.8s, nobody within 5m, a man to skip to
  ({ m } = carry(12, null)); const P = m.players; P[4].x = 57; P[4].y = 42; P[5].x = 55; P[5].y = 52; m.side[0].ctrl.hold = 1; h = sync(); ok(H().cur === 'long' && h[0].title === 'Long Pass', `the Long Pass card with a second man out (${H().cur})`);
  ({ m } = carry(12, null)); m.players[4].x = 57; m.players[4].y = 42; m.players[5].x = 55; m.players[5].y = 52; m.side[0].ctrl.hold = 0.5; h = sync(); ok(H().cur !== 'long', 'not before he has held it 0.8s');
  // Sprint: the meter full and 8m of space with the ball
  ({ m } = carry(12, null)); H().shown.add('long'); h = sync(); ok(H().cur === 'sprint' && h[0].title === 'Sprint' && h[0].rule === '', `the Sprint card with space ahead (${H().cur})`);
  ({ m } = carry(12, null)); H().shown.add('long'); m.spr[0].m = 0.1; h = sync(); ok(H().cur == null, 'not with the meter under the floor');
  // Offload and Drop Goal read the labels the HUD computed
  ({ m } = carry(12, null)); h = sync('Offload', 'Kick'); ok(H().cur === 'offload' && h[0].title === 'Offload', 'the Offload label lit: the Offload card');
  ({ m } = carry(12, null)); h = sync('Pass', 'Drop Goal'); ok(H().cur === 'drop' && h[0].title === 'Drop Goal', 'the small button reading Drop Goal: the Drop Goal card');
  // never in a close-up or a set piece; Hints Off shows none
  ({ m } = carry(4.5, null)); D.stage('past'); T.update(STEP); h = sync(); ok(M().phase === 'cut' && H().cur == null && h[0] && h[0].title === 'Get Past', 'a cut: the duel card, no open-play card');
  runUntil(() => M().phase !== 'cut', 900);
  ({ m } = carry(4.5, null)); m.phase = 'set'; m.set = { kind:'ruck', t:1, then:() => {} }; h = sync(); ok(H().cur == null && h[0] == null, 'a set piece: nothing');
  ({ m } = carry(4.5, null)); settings().hints = false; h = sync(); ok(H().cur == null, 'Hints Off: nothing'); settings().hints = true;
  // two player: each seat its own, from cueOf
  fresh({ humans:[true, true], levels:[1, 1] }); { const mm = M(), PP = mm.players, bb = mm.ball; mm.phase = 'play'; mm.set = null; mm.cut = null; mm.dclock = 60; for (const p of PP) { Object.assign(p, { vx:0, vy:0, down:0, tcd:0, side:-1, hold:2, bind:null, bite:0 }); p.x = p.team === 0 ? 20 : 110; p.y = 5 + (p.n - 1)*9; } const c1 = PP[10]; c1.x = 60; c1.y = 35; c1.fx = -1; c1.vx = -6; mm.side[1].ctrl = c1; mm.side[1].ctrlPrev = c1; mm.side[1].ctrlT = 1; bb.state = 'held'; bb.carrier = c1; bb.f = null; bb.last = 1; bb.x = c1.x - 0.55; bb.y = c1.y; PP[3].x = 55.5; PP[3].y = 35; PP[3].fx = 1; mm.side[0].ctrl = PP[2];
    const hh = sync(); ok(D.hintOpen()[1].cur === 'step' && hh[1] && hh[1].title === 'Side Step' && D.hintOpen()[0].cur == null, `Player 2 carrying at a tackler: his Side Step card, nothing for Player 1 (${D.hintOpen()[1].cur}, ${D.hintOpen()[0].cur})`); }
  D.setTwo(false);
}
done('E open play');

// F. the penalty card's sublines and tick, the pause rows, the home row, the Help page, the join ticks
begin('cards');
{
  settingsOn();
  T.newMatch(0, 1, { halfLen:240, diff:1, headless:false, duels:'live' }); D.setMode('match'); runUntil(() => M().phase === 'play', 400);
  D.openPenaltyFor(0, 80, 35, 0);
  ok(M().phase === 'menu' && !$('m-pen').hidden && $('p-goal-s').textContent === '3 Points' && !$('m-pen').classList.contains('nohints') && !$('ht-pen').classList.contains('off'), `the penalty card in range: 3 Points under Kick at Goal, the tick ticked (${$('p-goal-s').textContent})`);
  $('ht-pen').click(); ok(settings().hints === false && $('m-pen').classList.contains('nohints') && $('ht-pen').classList.contains('off'), 'its tick turns Hints off: the sublines hide and the box empties');
  $('ht-pen').click(); ok(settings().hints === true && !$('m-pen').classList.contains('nohints'), 'and back on');
  $('p-tap').click(); M().headless = true; runUntil(() => M().phase === 'play', 400);
  M().headless = false; D.openPenaltyFor(0, 20, 35, 0); ok($('p-goal').disabled === true && $('p-goal-s').textContent === 'Out of Range', `out of range: ${$('p-goal-s').textContent}`); $('p-tap').click(); M().headless = true;
  // the pause card's rows: one in one player, Player 1 and Player 2 in two player
  D.pause(); ok(M().paused && $('pz-hl0').textContent === 'Hints' && $('pz-hrow1').hidden, 'one player paused: one Hints row'); D.resume();
  fresh({ humans:[true, true], levels:[1, 1] }); D.pause(); ok($('pz-hl0').textContent === 'Player 1 Hints' && !$('pz-hrow1').hidden, 'two player paused: a row each'); D.resume(); D.setTwo(false);
  // the markup: the home's fourth row, the pause rows, the penalty sublines, the two cards, the Help entries, Replay Tutorial beside Back to Menu
  const home = html.slice(html.indexOf('id="s-home"'), html.indexOf('id="s-teams"'));
  const rows = [...home.matchAll(/<div class="set"><span class="lbl">([^<]+)<\/span><div class="seg" data-key="([a-z]+)">/g)].map(m => m[1] + ':' + m[2]);
  ok(rows.join() === 'Half Length:half,Difficulty:diff,Sound:sound,Hints:hints,Coach Tips:coach', `the home's rows: ${rows.join(', ')}`);
  ok(/<div class="hc" id="hc0" hidden>/.test(html) && /<div class="hc s1" id="hc1" hidden>/.test(html) && /id="ht0"/.test(html) && /id="ht1"/.test(html), 'two cards, #hc0 and #hc1, each with its tick');
  ok(/id="pz-h0"/.test(html) && /id="pz-h1"/.test(html) && /Player 2 Hints/.test(html), 'the pause card carries the Hints rows');
  ok(/<div id="pz-hints">\s*<div class="set"><span class="lbl" id="pz-hl0">Hints<\/span>[\s\S]*?<div class="set" id="pz-hrow1" hidden>[\s\S]*?<\/div>\s*<\/div>\s*<button class="btn warn" id="pz-quit">/.test(html) && /#pz-hints\{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:14px 12px\}[^\n]*\n#pz-hints \.set\{display:contents\}\n#pz-hints \.set\[hidden\]\{display:none\}/.test(html), 'the two Hints rows share one grid (one label column), so both On | Off controls start on the same line');
  ok(/\.hc\.s1\{[^}]*max-width:min\(340px,calc\(50% - 190px\)\)/.test(html) && /\.hc\.two\{max-width:min\(340px,calc\(50% - 140px\)\)\}/.test(html) && /\.hc\{[^}]*max-width:min\(340px,calc\(50% - 116px\)\)/.test(html) && /\.hc-row\{display:flex;flex-wrap:wrap;/.test(html) && !/\.hc-rule\{[^}]*white-space:nowrap/.test(html), 'in two player each card stops 12px short of the scorebug\'s seat tags (Player 1 from 12px in, Player 2 from 62px in, by the pause button), and a bound card wraps its rule and rows rather than spilling');
  fresh({ humans:[true, true], levels:[1, 1] }); D.stage('past', 1); T.update(STEP); sync(); ok($('hc0').classList.contains('two') && $('hc1').classList.contains('two'), 'the cards carry the two-player class in a two-player match'); runUntil(() => M().phase !== 'cut', 900);
  D.setTwo(false); fresh(); D.stage('past'); T.update(STEP); sync(); ok(!$('hc0').classList.contains('two'), 'and not in one player'); runUntil(() => M().phase !== 'cut', 900);
  ok(/<small class="hsub" id="p-goal-s">3 Points<\/small>/.test(html) && /Kick to Touch<small class="hsub">Lineout Upfield<\/small>/.test(html) && /Tap and Go<small class="hsub">Play On Now<\/small>/.test(html) && /id="ht-pen"/.test(html), 'the penalty card\'s sublines and tick');
  ok(/<dt>Hints<\/dt><dd>The card in the top corner names the control for each close-up\. Untick <b>Hints<\/b> on it, or set Hints to Off on the menu\.<\/dd>/.test(html), 'the Help page\'s Hints entry');
  ok(/<div class="row2"><button class="btn" id="h-replay">Replay Tutorial<\/button><button class="btn" id="h-back" data-back>Back to Menu<\/button><\/div>/.test(html), 'Replay Tutorial and Back to Menu share a balanced row on How to Play');
  ok(/id="jt0"/.test(html) && /id="jt1"/.test(html), 'each join card has a Hints tick');
  const labels = [...html.matchAll(/<button class="hc-tick" id="[a-z0-9-]+" aria-label="([^"]+)"><i><\/i><span>([^<]+)<\/span><\/button>/g)].map(m => m[2]);
  ok(labels.length === 5 && labels.every(l => l === 'Hints'), `every tick is labelled Hints (${labels.length})`);
  ok(html.indexOf('id="hc0"') > html.indexOf('id="b-pause"') && /\.hc-tick\{[^}]*width:44px;height:44px/.test(html), 'the tick is 44px');
  // the join ticks follow twoHints by half, through the screen's own flow: Two Player opens on the saved state (they rendered ticked whatever was
  // saved, so the first tap looked like it did nothing) and Swap Players swaps them with the players
  settings().twoHints = [true, false]; D.setTwo(false); D.openJoin();
  ok(D.two().on && !$('s-join').hidden && !$('jt0').classList.contains('off') && $('jt1').classList.contains('off'), 'Two Player opens with each half\'s saved setting on its tick (Player 1 on, Player 2 off)');
  $('jt1').click(); ok(settings().twoHints[1] === true && !$('jt1').classList.contains('off'), 'and a tap turns that player\'s on');
  $('jt1').click(); ok(settings().twoHints[1] === false && $('jt1').classList.contains('off'), 'and off again');
  $('j-swap').click(); ok(D.two().swapped && !D.hintsOn(0) && D.hintsOn(1) && $('jt0').classList.contains('off') && !$('jt1').classList.contains('off'), 'after Swap Players the setting and the tick go with the player: Player 1 off, Player 2 on');
  $('j-swap').click(); ok(!D.two().swapped && D.hintsOn(0) && !D.hintsOn(1) && !$('jt0').classList.contains('off') && $('jt1').classList.contains('off'), 'and back');
  D.setTwo(false); settingsOn();
}
done('F cards');

// G. the plates: the Step Left | Step Right plates never sit under the hints card, wherever the thumb lands (y 70-200 on the left), at 667x375
// and 844x390; the card's box is the measured one (12-171 x 6-78, the one-row duel card). They used to flip below the stick only when their
// top would pass the clock line, so a thumb at y 134-186 put Step Left under Flick on Gold
begin('plates');
{
  settingsOn(); D.setTwo(false); fresh(); D.stage('past'); T.update(STEP); sync();
  const PL_H = +(html.match(/#plates span\{[^}]*height:(\d+)px/) || [])[1], PL_W = +(html.match(/#plates\{[^}]*width:(\d+)px/) || [])[1];
  ok(PL_H === 30 && PL_W === 164 && !$('hc0').hidden && D.hintShown()[0] && D.hintShown()[0].title === 'Get Past', `the plates are ${PL_W}x${PL_H}px and the Get Past card is up`);
  for (const [W, H] of [[667, 375], [844, 390]]) {
    globalThis.innerWidth = W; globalThis.innerHeight = H; $('hc0').rect = { left:12, top:6, right:171, bottom:78, width:159, height:72 };
    let under = 0, flips = 0, n = 0, first = '';
    for (let y = 70; y <= 200; y += 2) {
      D.placeStick(110, y); n++; const top = parseFloat($('plates').style.top), left = parseFloat($('plates').style.left);
      const hit = top < 78 && top + PL_H > 6 && left < 171 && left + PL_W > 12;
      if (hit) { under++; first = first || `a thumb at y ${y} puts them at ${top}-${top + PL_H}`; } if (top > y) flips++;
    }
    ok(under === 0 && flips > 0 && flips < n, `${W}x${H}: for a thumb at y 70-200 the plates never meet the card (${under} of ${n} did${first ? ': ' + first : ''}; ${flips} flipped below the stick, the rest above it)`);
  }
  ok(D.platesFloor() === 84, `the floor is the card's bottom and 6px (${D.platesFloor()})`);
  $('hc0').hidden = true; ok(D.platesFloor() === 0.07*390 + 6, 'and the clock line when no card is up'); $('hc0').hidden = false;
  $('hc0').rect = null; globalThis.innerWidth = 844; globalThis.innerHeight = 390; runUntil(() => M().phase !== 'cut', 900);
}
done('G plates');

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
