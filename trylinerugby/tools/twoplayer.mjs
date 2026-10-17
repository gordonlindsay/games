// Two player: the input layer (per-seat slots fed by the keyboard halves, touch and controllers), the sides refactor and the
// mirrored close-ups. Exits 1 on any failure. The sections: A keyboard routing, B controllers, C seats and menus, E the geometric
// mirror, F the two-player step, G role-keyed balance, H one player as the away side.
// node tools/twoplayer.mjs [--sym N] [--lock]            (SEED=11 unless set)
process.env.SEED ??= '11';
const { T, inputs, padStub, fire, bot, reseed, rndCalls, duelBot, ownerBot, chooserBot, chooserRelease, scrumBot, lineBot } = await import('./harness.mjs');
const STEP = T.STEP, M = () => T.M, D = T.debug, D2R = Math.PI/180, $ = id => document.getElementById(id);
let failed = 0, passed = 0, group = '';
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', group + ':', msg); } };
const done = name => { console.log(`${name.padEnd(26)} ${failed ? 'FAIL so far ' + failed : 'ok'} (${passed} passed)`); };
const begin = name => { group = name; };
const near = (a, b, e) => Math.abs(a - b) <= e;
const steps = (n, drive) => { for (let i = 0; i < n; i++) { if (drive) drive(); T.update(STEP); } };
const fresh = (o = {}) => { T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'live', ...o }); D.setMode('match'); };
const menu = () => { D.setMode('menu'); $('s-join').hidden = false; };   // the join screen is where pads are seated
const clearSlots = () => { for (const inp of inputs) { inp.keys.clear(); inp.held.clear(); inp.src.a = inp.src.b = inp.src.c = 0; inp.aDown = inp.bDown = inp.cDown = false; inp.aPressed = inp.bPressed = inp.cPressed = false; inp.flick = 0; inp.jx = inp.jy = 0; inp.latch = false; inp.padStick = false; } };
// a keyboard event: pd records whether the game called preventDefault
const ev = (code, repeat = false) => { const e = { code, repeat, pd:false, preventDefault() { this.pd = true; } }; return e; };
const down = (code, repeat) => { const e = ev(code, repeat); T.onKey(e, true); return e; };
const up = code => { const e = ev(code); T.onKey(e, false); return e; };
const edges = () => inputs.map(i => [i.aPressed, i.bPressed, i.cPressed, i.aDown, i.bDown, i.cDown].map(v => v ? 1 : 0).join(''));
const clearEdges = () => { for (const i of inputs) i.aPressed = i.bPressed = i.cPressed = false; };
// a Gamepad-shaped stub
const gamepad = (index, mapping = 'standard') => ({ index, mapping, connected:true, buttons:Array.from({ length:17 }, () => ({ pressed:false, value:0 })), axes:[0, 0, 0, 0] });
const bset = (gp, i, v) => { gp.buttons[i].value = v; gp.buttons[i].pressed = v > 0.5; };
const connect = gp => { fire('gamepadconnected', { gamepad:gp }); };
const poll = (n = 1) => { for (let i = 0; i < n; i++) T.pollPads(); };
const seatOf = s => D.two().seats[s];

// A. keyboard routing: one player's solo map, the two halves, the lone keyboard seat, preventDefault, repeats and releases, isolation, blur
begin('keyboard');
{
  fresh(); D.setTwo(false); clearSlots();
  ok(D.seatScheme(0) === 'solo' && D.seatScheme(1) === null, 'one player: seat 0 is the solo map and seat 1 has no keys');
  for (const [code, act] of [['KeyW', 'm'], ['ArrowUp', 'm'], ['KeyJ', 'a'], ['Space', 'a'], ['KeyK', 'b'], ['ShiftLeft', 'b'], ['ShiftRight', 'b'], ['KeyL', 'c']]) {
    const r = T.keyRoute(code); ok(r && r[0] === 0 && r[1] === act, `${code} routes to seat 0 as ${act} (${JSON.stringify(r)})`);
  }
  ok(T.keyRoute('KeyF') === null && T.keyRoute('Slash') === null, 'KeyF and Slash reach nobody in one player');
  down('KeyL'); ok(inputs[0].cPressed && inputs[0].cDown && inputs[0].src.c === 1, 'KeyL sets cPressed and holds cDown on slot 0'); up('KeyL'); ok(!inputs[0].cDown, 'and KeyL up releases it');
  clearEdges(); down('ShiftLeft'); ok(inputs[0].bPressed && inputs[0].bDown, 'Shift is still the small action'); up('ShiftLeft');
  clearEdges(); down('KeyJ'); ok(inputs[0].aPressed && inputs[0].aDown && !inputs[1].aPressed, 'J presses A on slot 0 only'); up('KeyJ');
  clearEdges(); down('KeyF'); ok(edges().join('|') === '000000|000000', 'KeyF does nothing'); up('KeyF');
  // both seats on the keyboard
  D.setTwo(true); clearSlots();
  ok(D.seatScheme(0) === 'left' && D.seatScheme(1) === 'right', 'two player, both seats on the keyboard: left and right halves');
  const only = (code, seat, act) => { const r = T.keyRoute(code); return r && r[0] === seat && r[1] === act; };
  ok(['KeyW', 'KeyA', 'KeyS', 'KeyD'].every(c => only(c, 0, 'm')) && only('KeyF', 0, 'a') && only('KeyG', 0, 'b') && only('KeyH', 0, 'c'), 'W A S D F G H reach only seat 0');
  ok(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].every(c => only(c, 1, 'm')) && only('Slash', 1, 'a') && only('Period', 1, 'b') && only('Comma', 1, 'c') && only('Numpad1', 1, 'a') && only('Numpad2', 1, 'b') && only('Numpad3', 1, 'c'), 'the arrows, Slash, Period, Comma and Numpad 1-3 reach only seat 1');
  ok(['KeyJ', 'KeyK', 'KeyL', 'Space', 'ShiftLeft', 'ShiftRight', 'Enter', 'Tab', 'ControlLeft', 'AltLeft', 'MetaLeft'].every(c => T.keyRoute(c) === null), 'J K L Space Shift Enter Tab reach nobody, and Ctrl Cmd Alt are never bound');
  ok(T.keyRoute('KeyP')[1] === 'pause' && T.keyRoute('Escape')[1] === 'pause', 'Escape and P are the pause from either half');
  clearEdges(); down('KeyF');
  ok(inputs[0].aPressed && inputs[0].aDown && !inputs[1].aPressed && !inputs[1].aDown, 'F presses only slot 0');
  clearEdges(); down('Slash'); ok(inputs[1].aPressed && inputs[1].aDown && !inputs[0].aPressed, 'and Slash only slot 1');
  clearEdges();
  up('KeyF'); up('Slash'); ok(!inputs[0].aDown && !inputs[1].aDown, 'both released');
  clearEdges(); down('KeyH'); down('Comma'); ok(inputs[0].cDown && inputs[1].cDown && inputs[0].cPressed && inputs[1].cPressed, 'H and Comma hold Sprint on their own seats'); up('KeyH'); up('Comma'); clearEdges();
  ok(!M().paused, 'not paused yet'); down('KeyP'); ok(M().paused, 'P pauses the match'); up('KeyP');
  down('Escape'); ok(!M().paused, 'Escape on the pause card resumes'); up('Escape');
  // isolation
  clearSlots(); down('KeyD');
  ok(inputs[0].world().x === 1 && inputs[1].world().x === 0, 'KeyD down: slot 0 reads x 1, slot 1 reads 0');
  down('KeyA'); down('ArrowRight');
  ok(inputs[0].world().x === 0 && inputs[1].world().x === 1 && inputs[0].keys.has('KeyA') && !inputs[0].keys.has('ArrowRight') && !inputs[1].keys.has('KeyA'), 'KeyA with ArrowRight: each player only their own key');
  up('KeyD'); up('KeyA'); up('ArrowRight');
  ok(inputs[0].keys.size === 0 && inputs[1].keys.size === 0, 'releases clear both slots');
  // the lone keyboard seat gets the solo map
  const gp0 = gamepad(0); padStub([gp0]); connect(gp0);
  menu(); bset(gp0, 0, 1); poll(); bset(gp0, 0, 0); poll();
  ok(seatOf(0).dev === 'pad' && seatOf(1).dev === 'kb' && D.seatScheme(1) === 'solo' && D.seatScheme(0) === null, `a pad on seat 0 leaves seat 1 with the solo map (${seatOf(0).dev}, ${D.seatScheme(1)})`);
  D.setMode('match'); clearSlots();
  for (const c of ['KeyW', 'ArrowUp', 'KeyJ', 'Space', 'KeyL']) { const r = T.keyRoute(c); ok(r && r[0] === 1, `${c} reaches seat 1`); }
  ok(T.keyRoute('KeyF') === null && T.keyRoute('Slash') === null, 'the halves are unbound while one seat is on a pad');
  D.twoRelease(0); ok(seatOf(0).dev === 'kb' && seatOf(0).half === 'left' && D.seatScheme(0) === 'left', 'Use Keyboard returns seat 0 to the left half');
  D.padGone(0);
  // preventDefault: every routed code in a match and on the pause card; an unrouted key gets none
  clearSlots();
  for (const c of ['KeyW', 'ArrowLeft', 'KeyF', 'Slash', 'KeyH', 'Comma', 'KeyP']) { const e = down(c); ok(e.pd, `${c} is preventDefaulted in a match`); up(c); }
  { const e = down('KeyQ'); ok(!e.pd, 'an unrouted key is not'); up('KeyQ'); }
  { const e = down('Quote'); ok(e.pd, 'Quote (Firefox Quick Find) is, in two player'); up('Quote'); }
  if (M().paused) { down('KeyP'); up('KeyP'); }
  down('KeyP'); up('KeyP'); ok(M().paused, 'paused again');
  { const e = down('KeyW'); ok(e.pd, 'a routed key is preventDefaulted on the pause card'); up('KeyW'); }
  down('Escape'); up('Escape'); ok(!M().paused, 'resumed');
  // repeats and releases
  clearSlots(); clearEdges();
  down('KeyF', true); ok(!inputs[0].aPressed && !inputs[0].aDown, 'a repeat never presses');
  down('KeyF'); clearEdges(); down('KeyF', true); ok(!inputs[0].aPressed && inputs[0].aDown, 'a repeat while held presses nothing more');
  up('KeyF');
  inputs[0].src.a = 2; inputs[0].aDown = true; clearEdges();   // a touch is holding A
  down('KeyF'); ok(!inputs[0].aPressed && inputs[0].src.a === 3, 'a key on a button a touch is already holding is no new press');
  up('KeyF'); ok(inputs[0].aDown && inputs[0].src.a === 2, 'and its release clears Down only when no other source holds it');
  inputs[0].src.a = 0; inputs[0].aDown = false;
  down('KeyW'); down('KeyF'); D.setTwo(false);
  ok(inputs[0].keys.size === 0 && !inputs[0].aDown && inputs[0].src.a === 0 && D.seatScheme(0) === 'solo', 'a scheme change releases everything');
  // blur
  clearSlots(); down('KeyD'); down('KeyJ'); ok(inputs[0].aDown && inputs[0].keys.has('KeyD'), 'held');
  fire('blur');
  ok(!inputs[0].aDown && inputs[0].keys.size === 0 && inputs[1].keys.size === 0 && M().paused, 'a window blur clears every slot and pauses');
  D.resume(); up('KeyD'); up('KeyJ'); clearSlots(); clearEdges();
  // one player on a menu: native keys
  menu();
  for (const c of ['Tab', 'Enter', 'Space']) { const e = down(c); ok(!e.pd && !inputs[0].aPressed, `${c} keeps its native behaviour on a one-player menu`); up(c); }
  clearEdges();
  // a duel's step from the keyboard, and a key held into the cut-in ignored
  fresh(); clearSlots(); clearEdges(); down('KeyD');
  D.stage('past'); T.update(STEP);
  ok(M().phase === 'cut' && M().cut.kind === 'past' && inputs[0].held.has('KeyD'), 'a Get Past opens with the held KeyD remembered');
  steps(20); down('KeyD', true); ok(inputs[0].flick === 0, 'a repeat of the held key is no step');
  down('KeyA'); ok(inputs[0].flick === -1, 'a fresh KeyA in the duel is Step Left'); inputs[0].flick = 0; up('KeyA'); up('KeyD');
  menu(); clearSlots(); clearEdges();
}
done('A keyboard');

// B. controllers: edges, the dead zone, trigger hysteresis, an idle pad never releases a key, the d-pad, Start, a '' mapping, the latch, disconnects
begin('controllers');
{
  fresh(); D.setTwo(false); clearSlots(); clearEdges();
  for (const k of [...D.pads().keys()]) D.padGone(k);
  const gp = gamepad(0); padStub([gp]); connect(gp);
  ok(D.padsOn(), 'the first gamepadconnected switches polling on');
  bset(gp, 0, 1); poll();
  ok(inputs[0].aPressed && inputs[0].aDown && inputs[0].src.a === 4, 'the first press of a new pad counts');
  clearEdges(); poll(5); ok(!inputs[0].aPressed && inputs[0].aDown, 'a hold never presses again');
  bset(gp, 0, 0); poll(); ok(!inputs[0].aDown && inputs[0].src.a === 0, 'a release clears Down');
  bset(gp, 1, 1); poll(); ok(inputs[0].bPressed && inputs[0].bDown, 'the right button is B'); bset(gp, 1, 0); poll(); clearEdges();
  // dead zone
  gp.axes[0] = 0.19; poll(); ok(inputs[0].jx === 0 && !inputs[0].padStick, 'a stick at 0.19 reads 0');
  gp.axes[0] = 0.6; poll(); ok(near(inputs[0].jx, 0.5, 1e-9) && inputs[0].padStick, `0.6 reads 0.5 (${inputs[0].jx})`);
  gp.axes[0] = 1.0; poll(); ok(near(inputs[0].jx, 1, 1e-9), '1.0 reads 1');
  gp.axes[0] = 0.3; gp.axes[1] = -0.4; poll(); ok(near(Math.hypot(inputs[0].jx, inputs[0].jy), (0.5 - 0.2)/0.8, 1e-9) && inputs[0].jy < 0, 'the dead zone is radial and y is positive downward');
  gp.axes[0] = 0; gp.axes[1] = 0; poll(); ok(inputs[0].jx === 0 && inputs[0].jy === 0 && !inputs[0].padStick, 'back to centre zeroes it once');
  inputs[0].jx = 0.7; poll(); ok(inputs[0].jx === 0.7, 'and an idle stick never writes over another source');
  inputs[0].jx = 0;
  // trigger hysteresis
  bset(gp, 6, 0.30); gp.buttons[6].pressed = false; poll(); ok(!inputs[0].cDown, 'a trigger at 0.30 is up');
  bset(gp, 6, 0.36); gp.buttons[6].pressed = false; poll(); ok(inputs[0].cDown && inputs[0].cPressed, 'at 0.36 it is down (Sprint)');
  clearEdges(); bset(gp, 6, 0.30); gp.buttons[6].pressed = false; poll(); ok(inputs[0].cDown, 'back at 0.30 it is still down');
  bset(gp, 6, 0.24); gp.buttons[6].pressed = false; poll(); ok(!inputs[0].cDown, 'at 0.24 it is up');
  bset(gp, 4, 1); poll(); ok(inputs[0].cDown, 'a shoulder button is Sprint too'); bset(gp, 4, 0); poll(); clearEdges();
  // an idle pad over 60 polls leaves held keys held
  down('KeyJ'); down('KeyK'); clearEdges(); poll(60);
  ok(inputs[0].aDown && inputs[0].bDown && !inputs[0].aPressed, 'an idle pad over 60 polls leaves a keyboard-held A (a goal-kick hold) and B (a charged kick) held');
  up('KeyJ'); up('KeyK');
  // the d-pad
  bset(gp, 14, 1); poll(); ok(inputs[0].keys.has('PadLeft') && inputs[0].world().x === -1, 'the d-pad shows up as PadLeft in keys');
  bset(gp, 14, 0); poll(); ok(!inputs[0].keys.has('PadLeft'), 'and leaves on release');
  fresh(); D.stage('past'); T.update(STEP);
  ok(M().phase === 'cut' && M().cut.kind === 'past', 'a Get Past is staged');
  steps(20); bset(gp, 14, 1); poll(); ok(inputs[0].flick === -1, 'a fresh PadLeft in a Get Past sets flick -1');
  bset(gp, 14, 0); poll(); inputs[0].flick = 0;
  // d-pad aim at the keyboard's 12 degrees a second
  T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'off' }); D.setMode('match'); clearSlots(); clearEdges();
  D.goalKick(0, 88, 35, 'penalty');
  ok(M().phase === 'cut' && M().cut.kind === 'goal' && M().cut.g.stage === 'aim', 'a penalty goal close-up is open');
  steps(20); const a0 = M().cut.g.aim;
  bset(gp, 15, 1); poll(); steps(60, () => poll());
  ok(near((M().cut.g.aim - a0)/D2R, 12, 0.6), `the d-pad aims at 12 degrees a second (${((M().cut.g.aim - a0)/D2R).toFixed(2)})`);
  bset(gp, 15, 0); poll();
  // Start pauses and resumes
  fresh(); clearSlots(); clearEdges();
  bset(gp, 9, 1); poll(); ok(M().paused, 'Start pauses'); bset(gp, 9, 0); poll();
  bset(gp, 9, 1); poll(); ok(!M().paused, 'and resumes'); bset(gp, 9, 0); poll();
  bset(gp, 9, 1); poll(); bset(gp, 9, 0); poll(); ok(M().paused, 'paused again');
  bset(gp, 1, 1); poll(); ok(!M().paused, 'the right button resumes from the pause card'); bset(gp, 1, 0); poll(); clearEdges();
  // a pad with no standard mapping: axes 0/1 and buttons 0/1 only
  D.padGone(0); if (M().paused) D.resume();                // the used pad's unplugging paused the match
  const raw = gamepad(1, ''); padStub([raw]); connect(raw); clearEdges();
  bset(raw, 0, 1); poll(); ok(inputs[0].aPressed && inputs[0].src.a === 8, 'a mapping-less pad still presses A'); bset(raw, 0, 0); poll(); clearEdges();
  bset(raw, 9, 1); poll(); ok(!M().paused, 'its button 9 is not Start'); bset(raw, 9, 0); poll();
  bset(raw, 4, 1); poll(); ok(!inputs[0].cDown, 'and its button 4 is not Sprint'); bset(raw, 4, 0); poll();
  D.padGone(1);
  // the latch: a stick held through a conversion's cut-in turns the arrow 0 degrees; let go, then a 0.5s nudge at 0.6 steers
  padStub([gp]); connect(gp); clearSlots(); clearEdges();
  T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'off' }); D.setMode('match');
  gp.axes[0] = 1; poll(); ok(inputs[0].jx === 1 && inputs[0].padStick, 'the stick is held right before the kick');
  D.goalKick(0, 99, 35, 'conversion');
  ok(inputs[0].latch && inputs[0].jx === 0, 'the cut-in latches the held stick');
  const aim0 = M().cut.g.aim;
  steps(90, () => poll());
  ok(near(M().cut.g.aim, aim0, 1e-9) && inputs[0].latch, `a stick held through the cut-in leaves the aim at 0.0 degrees after 1.5s (${((M().cut.g.aim - aim0)/D2R).toFixed(2)})`);
  gp.axes[0] = 0; poll(); ok(!inputs[0].latch && inputs[0].jx === 0, 'release clears the latch');
  gp.axes[0] = 0.6; poll(); ok(near(inputs[0].jx, 0.5, 1e-9), 'a 0.6 nudge now writes 0.5');
  steps(30, () => poll());
  const turned = (M().cut.g.aim - aim0)/D2R, want = 18*Math.pow(0.5, 1.6)*0.5;
  ok(near(turned, want, 0.6), `a 0.5s nudge at 0.6 turns the arrow ${want.toFixed(1)} degrees (${turned.toFixed(2)}; the stick reads 0.5 after the dead zone, on the |x|^1.6 curve)`);
  gp.axes[0] = 0; poll();
  // disconnect: one player pauses only if the pad was used this match
  fresh(); clearSlots(); clearEdges();
  ok(!D.pads().get(0).used, 'a new match starts with the pad unused');
  D.padGone(0); ok(!M().paused, 'an unused pad unplugging does not pause');
  padStub([gp]); connect(gp); bset(gp, 0, 1); poll(); bset(gp, 0, 0); poll(); clearEdges();
  ok(D.pads().get(0).used, 'a press marks the pad used this match');
  D.padGone(0); ok(M().paused && !inputs[0].aDown, 'a used pad unplugging pauses and clears its bits');
  D.resume();
  // disconnect in two player: the seat returns to the keyboard, schemes recomputed, and the match pauses
  D.setTwo(true); menu(); padStub([gp]); connect(gp); bset(gp, 0, 1); poll(); bset(gp, 0, 0); poll();
  ok(seatOf(0).dev === 'pad' && D.seatScheme(1) === 'solo', 'seat 0 claimed by the pad');
  D.setMode('match'); clearEdges();
  bset(gp, 0, 1); poll(); ok(inputs[0].aDown, 'the pad drives seat 0');
  D.padGone(0);
  ok(M().paused && seatOf(0).dev === 'kb' && D.seatScheme(0) === 'left' && D.seatScheme(1) === 'right' && !inputs[0].aDown, 'unplugging it pauses, returns the seat to the keyboard and recomputes both halves');
  D.resume(); D.setTwo(false); clearSlots(); clearEdges(); padStub([]);
}
done('B controllers');

// C. seats and menus: claiming, Use Keyboard, Swap Players; one player keeps native keys on menus and a pad never reaches the slots there
begin('seats');
{
  menu(); D.setTwo(true);
  for (const k of [...D.pads().keys()]) D.padGone(k);
  if (seatOf(0).dev !== 'kb') D.twoRelease(0); if (seatOf(1).dev !== 'kb') D.twoRelease(1);
  const g0 = gamepad(0), g1 = gamepad(1), g2 = gamepad(2); padStub([g0, g1, g2]); connect(g0); connect(g1); connect(g2);
  bset(g1, 0, 1); poll(); bset(g1, 0, 0); poll();
  ok(seatOf(0).dev === 'pad' && seatOf(0).pad === 1 && seatOf(1).dev === 'kb', 'the first pad to press claims seat 0, whatever its index');
  ok(D.seatScheme(1) === 'solo', 'with seat 0 on a pad, seat 1 is the solo map');
  bset(g0, 2, 1); poll(); bset(g0, 2, 0); poll();
  ok(seatOf(1).dev === 'pad' && seatOf(1).pad === 0, 'the second claims seat 1 (a face button claims too)');
  bset(g2, 0, 1); poll(); bset(g2, 0, 0); poll();
  ok(D.pads().get(2).owner == null && seatOf(0).pad === 1 && seatOf(1).pad === 0, 'a third pad is ignored');
  ok(D.seatScheme(0) === null && D.seatScheme(1) === null, 'two pads: the keyboard drives nobody');
  D.twoRelease(1); ok(seatOf(1).dev === 'kb' && seatOf(1).half === 'right' && D.seatScheme(1) === 'solo' && D.pads().get(0).owner == null, 'Use Keyboard on seat 1 frees its pad and gives it the solo map');
  D.twoRelease(0); ok(seatOf(0).dev === 'kb' && seatOf(0).half === 'left' && D.seatScheme(0) === 'left' && D.seatScheme(1) === 'right', 'and on seat 0 the left half, so the halves are back');
  D.twoSwap(); ok(seatOf(0).half === 'right' && seatOf(1).half === 'left' && D.seatScheme(0) === 'right', 'Swap Players moves Player 1 to the right half');
  ok(T.keyRoute('ArrowUp')[0] === 0 && T.keyRoute('KeyW')[0] === 1, 'and the arrows now reach seat 0');
  D.twoSwap();
  bset(g2, 0, 1); poll(); bset(g2, 0, 0); poll();
  ok(seatOf(0).dev === 'pad' && seatOf(0).pad === 2, 'a vacant seat can be claimed again');
  D.twoSwap(); ok(seatOf(1).dev === 'pad' && D.pads().get(2).owner === 1 && D.seatScheme(0) === 'solo', 'Swap Players moves the pad with its player');
  D.twoRelease(1); for (const k of [...D.pads().keys()]) D.padGone(k); padStub([]);
  D.setTwo(false);
  // one player on a menu: pad edges go to the menu, never into the slots
  fresh(); menu(); clearSlots(); clearEdges();
  const gp = gamepad(0); padStub([gp]); connect(gp);
  bset(gp, 0, 1); poll(); ok(!inputs[0].aPressed && !inputs[0].aDown, 'a pad press on a menu never reaches slot 0'); bset(gp, 0, 0); poll();
  gp.axes[1] = 1; poll(); gp.axes[1] = 0; poll();
  D.padGone(0); padStub([]);
  D.setMode('match'); M().phase = 'menu';   // the penalty card
  padStub([gp]); connect(gp); bset(gp, 0, 1); poll(); ok(!inputs[0].aPressed, 'nor on the penalty card'); bset(gp, 0, 0); poll();
  D.padGone(0); padStub([]); M().phase = 'play';
  ok(D.two().seats.every(s => s.dev === 'kb'), 'the seats are back on the keyboard');
  menu();
}
done('C seats');

// E. the geometric mirror: a team 1 duel, in a match where the human plays team 1 (humans:[false, true]), is a team 0 duel in the
// owner's frame: the same triggers, the same frame data, outcomes that land at toWorld(1, .) of team 0's, the same camera and the
// same drawing with the kits swapped. Kicks: the aim cross, the penalty card and the drop zone mirror too.
begin('mirror');
{
  const K = T.kick, S = T.sides;
  // the same ratings on both sides, so the home duel and the away duel are one duel; the colours differ, so the kit swap can be checked
  const A = T.teams.cleanTeam({ name:'Blues', kit:'#2050b0', trim:'#f2b01e', pace:4, power:3, handling:4, kicking:3 }, 0);
  const B = T.teams.cleanTeam({ name:'Reds', kit:'#c8102e', trim:'#0f5a32', pace:4, power:3, handling:4, kicking:3 }, 1);
  const match = (team, o = {}) => { T.newMatch(A, B, { halfLen:240, diff:1, headless:true, duels:'live', humans:team ? [false, true] : [true, false], ...o }); D.setMode('match'); clearSlots(); clearEdges(); };
  const mirror = (x, y) => K.toWorld(1, x, y);
  const r9 = v => typeof v === 'number' ? Math.round(v*1e9)/1e9 : v;
  const FRAME = ['kind', 'u0', 'o0', 'r0', 'K', 'D', 'g0', 'w', 'tk', 'rho', 'tTrig', 'dtau', 'centre', 'wid', 'win', 'open', 'open0', 'feintAt', 'commitT', 'side', 'drift', 'driftAt', 'fakeAt', 'stepDir', 'stepAt', 'dummy', 'rel', 'endT', 'P0', 'P1', 'L'];
  const frameOf = (c, rnd = r9) => JSON.stringify(FRAME.map(k => { const v = c[k]; return v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([a, b]) => [a, rnd(b)])) : rnd(v === undefined ? null : v); }));
  // the Tackle's carrier is an AI man: staged on an exact y tie he swerves the same world side in both matches (the AI's tie-break is
  // world-handed, which is not the mirror's business), so he is staged 0.6m off the tie in the frame and his swerve follows the geometry
  const stageIn = (team, kind) => {
    match(team); reseed(500 + kind.length*7);
    if (kind === 'block') { D.stage('block', team); return T.forceDuel('block', team); }
    const st = D.stage(kind, team);
    if (kind === 'tackle') { const w = K.toWorld(team, 50, 35.6); st.O.x = w.x; st.O.y = w.y; M().ball.y = w.y; }
    T.update(STEP); return M().cut;
  };
  // triggers and frame data
  for (const kind of ['past', 'pass', 'tackle', 'block']) {
    const c0 = stageIn(0, kind), c1 = stageIn(1, kind);
    ok(c0 && c0.kind === kind && c1 && c1.kind === kind && c0.own === 0 && c1.own === 1, `${kind} fires for both sides (${c0 && c0.kind}, ${c1 && c1.kind})`);
    if (!c0 || !c1) continue;
    ok(c0.win[0] === c1.win[0] && c0.win[1] === c1.win[1] && c0.centre === c1.centre && c0.wid === c1.wid, `${kind}: equal windows (${c0.win.map(v => v.toFixed(3))} v ${c1.win.map(v => v.toFixed(3))})`);
    ok(frameOf(c0) === frameOf(c1), `${kind}: the team 1 duel's frame data equals the team 0 duel's to 1e-9`);
    const U1 = c1.U, u0 = c0.u0;
    ok(near(U1.x, mirror(u0.x, u0.y).x, 1e-9) && near(U1.y, mirror(u0.x, u0.y).y, 1e-9), `${kind}: team 1's U stands at the mirror of team 0's in the world`);
    ok(S.inputOf(c1.own) === inputs[0] && S.isCtrl(c1.U) === true, `${kind}: the owner's slot is seat 0 and the owner's man is under the ring`);
    const cam0 = D.duelCam(c0), cam1 = D.duelCam(c1);
    ok(['back', 'side', 'h', 'cx', 'F', 'hz'].every(k => near(cam0[k], cam1[k], 1e-9)), `${kind}: the same camera for both owners`);
    const P1 = D.duelPose(c1, (c1.win[0] + c1.win[1])/2), q = D.camAt(c1, cam1, P1, P1);
    ok(P1.o.x - q.camX > 0.8 && P1.u.x - q.camX > 0.8 && P1.u.x < P1.o.x + (kind === 'block' ? 99 : 0), `${kind}: for a team 1 owner U is behind O ahead of the lens (z ${(P1.o.x - q.camX).toFixed(2)})`);
  }
  // drawing: the ctx-spy logs of the pair are identical with the kits swapped
  {
    const tok = team => ({ [A.kit]:team ? 'KO' : 'KU', [A.trim]:team ? 'TO' : 'TU', [B.kit]:team ? 'KU' : 'KO', [B.trim]:team ? 'TU' : 'TO' });
    const logOf = (team, kind) => {
      const c = stageIn(team, kind); steps(24); const log = [];
      const r6 = a => typeof a === 'number' ? Math.round(a*1e6)/1e6 : Array.isArray(a) ? a.map(r6).join('/') : String(a);
      globalThis.__ctxSpy = (name, args) => log.push(name + ':' + args.map(r6).join(','));
      D.view(844, 390); D.drawCut(); globalThis.__ctxSpy = null;
      const map = tok(team);
      return log.map(l => l.replace(/#[0-9a-f]{6}/gi, h => map[h.toLowerCase()] || h)).join('\n');
    };
    for (const kind of ['past', 'pass', 'tackle', 'block']) {
      const l0 = logOf(0, kind), l1 = logOf(1, kind);
      ok(l0.length > 2000 && l0 === l1, `${kind}: drawDuel draws the same scene for either owner, kits swapped (${l0.length} v ${l1.length} chars)`);
    }
  }
  // outcomes: forced with the same screen-relative inputs, the world after applyDuel for team 1 is toWorld(1, .) of team 0's
  const ix = (c, who) => M().players.indexOf(c[who]);
  function playOut(team, kind, setup, act, atOf) {
    const c = stageIn(team, kind); if (!c || c.kind !== kind) return null;
    setup(c);
    const inp = S.inputOf(team), at = atOf(c);
    for (let i = 0; i < 400 && !c.res && c.t < at; i++) T.update(STEP);
    reseed(91);
    if (!c.res && act != null) { if (kind === 'past') inp.flick = act; else if (act === 'dummy') inp.bPressed = true; else inp.aPressed = true; T.update(STEP); }
    for (let i = 0; i < 600 && M().phase === 'cut'; i++) T.update(STEP);
    const P = M().players, b = M().ball;
    const men = ['U', 'O', 'R'].filter(w => c[w]).map(w => ({ w, i:ix(c, w), x:c[w].x, y:c[w].y, vx:c[w].vx, vy:c[w].vy, down:c[w].down, fx:c[w].fx, fy:c[w].fy }));
    return { c, out:c.out, res:c.res, men, ball:{ state:b.state, x:b.x, y:b.y, vx:b.vx, vy:b.vy, last:b.last, carrier:b.carrier ? P.indexOf(b.carrier) : -1, x1:b.f ? b.f.x1 : null, y1:b.f ? b.f.y1 : null }, surge:M().surge ? M().surge.team : null, phase:M().phase };
  }
  const centre = c => c.centre;
  const CASES = [
    ['past', 'break', c => { c.open = 1; c.open0 = 1; c.feintAt = null; }, 1, centre],
    ['past', 'break', c => { c.open = -1; c.open0 = -1; c.feintAt = null; }, -1, centre],
    ['pass', 'drawn', c => { c.drift = false; c.driftAt = null; c.fakeAt = null; }, 'pass', centre],
    ['pass', 'sold', c => { c.drift = true; c.driftAt = c.win[0] - 0.32; c.fakeAt = null; }, 'dummy', centre],
    ['pass', 'covered', c => { c.drift = true; c.driftAt = c.win[0] - 0.32; c.fakeAt = null; }, 'pass', centre],
    ['tackle', 'bighit', c => { c.stepDir = 0; c.stepAt = null; }, 1, centre],
    ['block', 'intercept', c => {}, 1, centre],
    ['block', 'knock', c => {}, 1, c => c.centre + 0.3*c.wid],
    ['block', 'pass', c => {}, null, () => 99],
  ];
  for (const [kind, want, setup, act, atOf] of CASES) {
    const h = playOut(0, kind, setup, act, atOf), a = playOut(1, kind, setup, act, atOf);
    const label = `${kind}:${want}${kind === 'past' ? ' step ' + (act > 0 ? 'right' : 'left') : ''}`;
    ok(h && a && h.out === want && a.out === want, `${label}: both sides give ${want} (${h && h.out}, ${a && a.out})`);
    if (!h || !a || h.out !== want || a.out !== want) continue;
    // the same men, by index within their team (7 apart), mirrored
    const same = h.men.every((m, k) => { const n = a.men[k]; const w = mirror(m.x, m.y); return n.i === (m.i + 7) % 14 && near(n.x, w.x, 1e-6) && near(n.y, w.y, 1e-6) && near(n.vx, -m.vx, 1e-6) && near(n.vy, -m.vy, 1e-6) && near(n.down, m.down, 1e-9) && near(n.fx, -m.fx, 1e-6) && near(n.fy, -m.fy, 1e-6); });
    ok(same, `${label}: U, O and R land at the mirror of team 0's spots with mirrored velocities and facings`);
    const loose = want === 'covered' || want === 'pass';     // an ordinary pass adds the same random error to both, which no mirror can match: its start mirrors, its flight is checked loosely
    const bw = mirror(h.ball.x, h.ball.y), bok = a.ball.state === h.ball.state && near(a.ball.x, bw.x, 1e-6) && near(a.ball.y, bw.y, 1e-6)
      && (loose ? near(a.ball.vx, -h.ball.vx, 1.5) && near(a.ball.vy, -h.ball.vy, 1.5) : near(a.ball.vx, -h.ball.vx, 1e-6) && near(a.ball.vy, -h.ball.vy, 1e-6))
      && (h.ball.x1 == null || loose || (near(a.ball.x1, mirror(h.ball.x1, h.ball.y1).x, 1e-6) && near(a.ball.y1, mirror(h.ball.x1, h.ball.y1).y, 1e-6))) && (h.ball.carrier < 0 ? a.ball.carrier < 0 : a.ball.carrier === (h.ball.carrier + 7) % 14);
    ok(bok, `${label}: the ball mirrors too (${h.ball.state} at ${h.ball.x.toFixed(2)},${h.ball.y.toFixed(2)} v ${a.ball.state} at ${a.ball.x.toFixed(2)},${a.ball.y.toFixed(2)})`);
    if (want === 'break') ok(h.men[0].vx > 0 && a.men[0].vx < 0, `${label}: the burst runs +x for team 0 and -x for team 1`);
    if (want === 'break') ok(act > 0 ? h.men[0].y > h.c.K.y && a.men[0].y < mirror(h.c.K.x, h.c.K.y).y : h.men[0].y < h.c.K.y && a.men[0].y > mirror(h.c.K.x, h.c.K.y).y, `${label}: Step ${act > 0 ? 'Right' : 'Left'} is the owner's right for both (world ${act > 0 ? '+y then -y' : '-y then +y'})`);
    if (want === 'knock') ok(h.ball.last === 0 && a.ball.last === 1 && h.ball.vx < 0 && a.ball.vx > 0, `${label}: b.last is the owner and the knock-down runs back along his own direction`);
    if (want === 'intercept') ok(h.ball.carrier === h.men[0].i && a.ball.carrier === a.men[0].i && h.ball.last === 0 && a.ball.last === 1, `${label}: the interceptor carries, b.last the owner`);
    if (want === 'knock') { const kx = h.c.K.x; ok(near(h.men[0].x, kx - 0.5, 1e-6) && near(a.men[0].x, 120 - (kx - 0.5), 1e-6), `${label}: the blocker lands half a metre back towards his own line, as he always did`); }
    if (want === 'bighit') {
      ok(h.phase === 'set' && a.phase === 'set' && M().set.kind === 'ruck' && M().set.dom, `${label}: a dominant ruck for both`);
      reseed(5); for (let i = 0; i < 200 && M().phase !== 'play' && !M().surge; i++) T.update(STEP);
      ok(M().surge && M().surge.team === 1, `${label}: the surge after the ruck goes to the tackling side, team 1 (${M().surge && M().surge.team})`);
    }
  }
  // findAttackDuel rejects team 1 when its stick points +x (away from its own line of attack)
  match(1); D.stage('past', 1); inputs[0].jx = 1; inputs[0].jy = 0; T.update(STEP);
  ok(M().phase !== 'cut', 'a team 1 carrier steering +x gets no Get Past');
  match(1); D.stage('past', 1); T.update(STEP);
  ok(M().phase === 'cut' && M().cut.kind === 'past', 'and steering -x, at him, does');
  // the kick-aim cross is drawn on the carrier's own side of him
  for (const team of [0, 1]) {
    match(team, { duels:'off' }); K.stageDrop({ x:85, y:35 }, [], team);
    const c = S.ctrlOf(team); S.side(team).charging = true; S.side(team).charge = 0.5;
    const arcs = [];
    globalThis.__ctxSpy = (name, args) => { if (name === 'arc') arcs.push(args); };
    D.view(844, 390); D.render(STEP); globalThis.__ctxSpy = null;
    const sc = Math.min(844/54, 390/36), ring = arcs.find(a => Math.abs(a[2] - Math.max(8, 0.95*sc)*1.55) < 1e-6), cross = arcs.find(a => a[2] === 13);
    ok(ring && cross && (team ? cross[0] < ring[0] : cross[0] > ring[0]), `team ${team}'s kick-aim cross is drawn ${team ? 'left' : 'right'} of its man (${cross && cross[0].toFixed(0)} v ${ring && ring[0].toFixed(0)})`);
  }
  // a team 1 human's penalty: the headless choice goes through cpuPenalty(1) to a team 1 goal close-up on seat 0's slot
  match(1, { duels:'off' }); D.penalty(1, 30, 35);
  for (let i = 0; i < 200 && M().phase !== 'cut'; i++) T.update(STEP);
  ok(M().phase === 'cut' && M().cut.kind === 'goal' && M().cut.g.team === 1 && M().cut.inp === inputs[0] && near(M().cut.g.x, 90, 1e-9) && !M().cut.g.watch, `a team 1 penalty kicked at goal is a live team 1 close-up from frame x 90 (${M().cut && M().cut.kind}, team ${M().cut && M().cut.g.team}, x ${M().cut && M().cut.g.x})`);
  match(1, { duels:'off' }); M().headless = false; D.openPenaltyFor(1, 30, 35, 20); const meta = document.getElementById('p-meta').textContent; M().headless = true;
  ok(M().phase === 'menu' && /^\d+m to the Posts/.test(meta), `the card opens for a team 1 human with its distance (${meta})`);
  match(0, { duels:'off' }); D.penalty(1, 30, 35);
  for (let i = 0; i < 200 && M().phase === 'set'; i++) T.update(STEP);
  ok(M().phase !== 'cut' || M().cut.g.watch, 'and for a CPU team 1 the penalty is kicked instantly, headless');
  // the drop zone: team 1 is offered a drop at the mirror of every team 0 spot
  for (const spot of [{ x:85, y:35 }, { x:95, y:28 }, { x:80, y:42 }, { x:72, y:35 }, { x:60, y:35 }, { x:85, y:62 }, { x:102, y:35 }]) {
    const zs = [0, 1].map(team => { match(team, { duels:'off' }); const c = K.stageDrop(spot, [], team); return K.dropZone(c).ok; });
    ok(zs[0] === zs[1], `dropZone at frame ${spot.x},${spot.y}: ${zs[0] ? 'offered' : 'not offered'} to both sides (${zs.join(' ')})`);
  }
  D.setMode('menu');
}
done('E mirror');

// F. two player: both sides human in one match, each on its own slot. Two bots play it out; the pass in hand, the kick charge, Sprint,
// goal kicks and drop goals are each side's own; a pass and a dive on one step resolve from the side in possession first
begin('two player');
{
  const K = T.kick, S = T.sides, C = T.contact;
  const pair = (o = {}) => { T.newMatch(0, 1, { halfLen:120, diff:1, headless:true, duels:'live', humans:[true, true], levels:[0, 2], ...o }); D.setMode('match'); clearSlots(); clearEdges(); };
  pair();
  ok(M().two && !M().auto && S.isHuman(0) && S.isHuman(1) && S.inputOf(0) === inputs[0] && S.inputOf(1) === inputs[1], 'a two-player match seats team 0 in slot 0 and team 1 in slot 1');
  ok(S.levelOf(0) === 0 && S.levelOf(1) === 2 && S.seatOfTeam(1) === 1, 'each side keeps the level it picked, and team 1 sits in seat 1');
  ok(S.ctrlOf(0).team === 0 && S.ctrlOf(1).team === 1 && M().ctrl === S.ctrlOf(0), 'each side has a man under its ring; M.ctrl is still side 0\'s');
  // a whole match, two bots
  reseed(77);
  let own = [0, 0], cuts = [0, 0], kicksBy = [0, 0], dropsBy = [0, 0], bad = 0, stepsN = 0;
  while (!M().over && stepsN < 200000) {
    bot(0); bot(1); T.update(STEP); stepsN++;
    const m = M();
    if (m.side[0].ctrl.team !== 0 || m.side[1].ctrl.team !== 1) bad++;
    if (m.phase === 'cut' && m.cut) {
      if (m.cut.duel && m.cut.t === STEP) own[m.cut.own]++;
      if (m.cut.kind === 'goal' && m.cut.t === STEP && !m.cut.g.watch) { cuts[m.cut.g.team]++; if (m.cut.inp !== inputs[m.cut.g.team]) bad++; if (m.cut.g.type === 'drop') dropsBy[m.cut.g.team]++; }
    }
  }
  ok(M().over && stepsN < 200000, `the two-bot match runs to full time (${stepsN} steps, ${M().score.join('-')}, tries ${M().tries.join('-')})`);
  ok(bad === 0, `every step kept each ring on its own side and every goal close-up on the kicker's slot (${bad} slips)`);
  ok(own[0] + own[1] >= 2, `duels fired (${own[0]} for team 0, ${own[1]} for team 1)`);
  ok((M().stats.sprints || 0) > 0 && !(M().stats.cpuSprints > 0), `sprints are counted as human for both sides (${M().stats.sprints} sprints, ${M().stats.cpuSprints || 0} cpu)`);
  ok((M().stats.passes || 0) > 20, `both sides passed (${M().stats.passes})`);
  // the pass in hand is each side's own: a hold on seat 1 charges a long pass while seat 0 is idle
  pair({ duels:'off' }); K.stageDrop({ x:60, y:35 }, [], 1);
  const c1 = S.ctrlOf(1); ok(c1 && M().ball.carrier === c1, 'team 1\'s man carries at the staged spot');
  c1.hold = 1; inputs[1].aPressed = true; inputs[1].aDown = true; T.update(STEP);
  ok(S.side(1).pass && S.side(1).pass.mode === 'hold' && !S.side(0).pass, 'a held A on seat 1 starts side 1\'s pass charge, and side 0 has none');
  steps(12); ok(S.side(1).pass && S.side(1).pass.t > C.LONG.arm && M().ball.state === 'held', 'past 0.18s it is still in hand, charging');
  const shown = C.shownPass(c1); ok(shown.gold && shown.to && shown.to.team === 1 && (shown.to.x - c1.x) > 0, `the ring is gold on the next man out, behind him in his own direction (${shown.to && shown.to.x.toFixed(1)} v ${c1.x.toFixed(1)})`);
  steps(30); ok(M().ball.state === 'air' && M().ball.f.long && M().ball.f.team === 1 && !S.side(1).pass, 'at 0.6s it throws itself as a long pass by team 1');
  inputs[1].aDown = false;
  // the kick charge is each side's own, and a team 1 kick goes -x
  pair({ duels:'off' }); K.stageDrop({ x:60, y:35 }, [], 1);
  const k1 = S.ctrlOf(1); inputs[1].bPressed = true; inputs[1].bDown = true; T.update(STEP);
  ok(S.side(1).charging && !S.side(0).charging && S.anyCharging(), 'B on seat 1 charges side 1\'s kick only');
  steps(20); inputs[1].bDown = false; T.update(STEP);
  ok(M().ball.state === 'air' && M().ball.f.kind === 'kick' && M().ball.f.team === 1 && M().ball.f.x1 < k1.x, `the release kicks it for team 1, towards -x (${M().ball.f && M().ball.f.x1.toFixed(1)} from ${k1.x.toFixed(1)})`);
  ok(!S.side(1).charging, 'and the charge is cleared');
  // a drop goal from seat 1: the label, the 0.20s hold, the close-up on seat 1's slot, and the bot drops it
  pair({ duels:'off' }); const dc = K.stageDrop({ x:85, y:35 }, [], 1);
  ok(K.kickLabel(1) === 'Drop Goal' && K.kickLabel(0) === 'Kick', `team 1's carrier in the zone: kickLabel(1) Drop Goal, kickLabel(0) Kick (${K.kickLabel(1)}, ${K.kickLabel(0)})`);
  inputs[1].bPressed = true; inputs[1].bDown = true;
  for (let i = 0; i < K.holdSteps() + 2 && M().phase !== 'cut'; i++) T.update(STEP);
  ok(M().phase === 'cut' && M().cut.kind === 'goal' && M().cut.g.type === 'drop' && M().cut.g.team === 1 && M().cut.inp === inputs[1], `the hold opens a team 1 drop close-up on seat 1's slot (${M().phase}, ${M().cut && M().cut.inp === inputs[1]})`);
  { let n = 0; while (M().phase === 'cut' && n++ < 600) { bot(1); T.update(STEP); } }
  ok(M().phase !== 'cut' && M().stats.dg.att[1] === 1, `seat 1's bot plays the drop out (${M().stats.dg.made[1] ? 'made' : 'missed'})`);
  // a conversion for team 1 is kicked from seat 1's slot by seat 1's bot
  pair({ duels:'off' }); D.goalKick(1, 21, 35, 'conversion');
  ok(M().phase === 'cut' && M().cut.g.team === 1 && M().cut.inp === inputs[1] && !M().cut.g.watch, 'a team 1 conversion is a live close-up on seat 1');
  inputs[0].aPressed = inputs[0].aDown = true; steps(30);
  ok(M().cut && M().cut.g.stage === 'aim', 'seat 0\'s Kick does nothing in seat 1\'s close-up'); inputs[0].aDown = false; clearEdges();
  { let n = 0; while (M().phase === 'cut' && n++ < 600) { bot(1); T.update(STEP); } }
  ok(M().phase !== 'cut' && M().stats.gk.att[1] === 1, 'and seat 1 kicks it');
  // Sprint is a hold on each side's own meter
  pair({ duels:'off' }); K.stageDrop({ x:60, y:35 }, [], 0);
  const s0 = S.ctrlOf(0); inputs[0].cPressed = true; inputs[0].cDown = true; steps(10);
  ok(s0.sprinting && M().spr[0].p === s0 && !M().spr[1].p && M().spr[1].m === 1, 'Sprint held on seat 0 runs side 0\'s meter and leaves side 1\'s full');
  inputs[1].cPressed = true; inputs[1].cDown = true; steps(10);
  ok(M().spr[1].p && M().spr[1].p.team === 1 && M().spr[1].m < 1 && M().spr[0].m < 1, 'and seat 1\'s hold runs side 1\'s meter alongside');
  inputs[0].cDown = inputs[1].cDown = false; steps(1);
  // a pass and a dive pressed on one step: the side in possession resolves first, so the pass is away (team 0's, in the air) before the
  // dive is judged, and the dive finds no carrier: no tackle, no contact. The mirror: team 1 in possession, team 0 diving. With
  // handleUser's order reversed the dive commits first and the ball is held in a bind or tackled (checked as a mutant in scratch)
  for (const poss of [0, 1]) {
    pair({ duels:'off' }); K.stageDrop({ x:60, y:35 }, [{ x:62, y:35 }], poss);
    const pc = S.ctrlOf(poss), tk = S.ctrlOf(1 - poss); pc.hold = 1;
    ok(C.canDive(tk), `team ${poss} carries and team ${1 - poss}'s man can dive`);
    const ta0 = M().stats.tackles, ig0 = M().stats.ignored || 0;
    inputs[poss].aPressed = true; inputs[1 - poss].aPressed = true;
    T.update(STEP);
    const b = M().ball;
    ok(b.state === 'air' && b.f.kind === 'pass' && b.f.team === poss && !M().contact && M().stats.tackles === ta0 && !pc.bind && !tk.bind, `team ${poss}'s pass is in the air and the dive found nobody: no contact, no tackle (${b.state}${b.f ? ' ' + b.f.kind + ' by ' + b.f.team : ''}, contact ${!!M().contact}, tackles +${M().stats.tackles - ta0})`);
    ok((M().stats.ignored || 0) === ig0 + 1 && tk.vx === 0 && tk.vy === 0, `the dive on an empty-handed man was ignored, not launched (ignored +${(M().stats.ignored || 0) - ig0}, v ${tk.vx.toFixed(1)})`);
  }
  // switching men: B off the ball on seat 1 moves seat 1's ring only
  pair({ duels:'off' }); K.stageDrop({ x:60, y:35 }, [], 0);
  const r0 = S.ctrlOf(0), r1 = S.ctrlOf(1); inputs[1].bPressed = true; T.update(STEP);
  ok(S.ctrlOf(0) === r0 && S.ctrlOf(1) !== r1 && S.ctrlOf(1).team === 1, 'Switch on seat 1 moves only seat 1\'s ring, to a team 1 man');
  D.setMode('menu');
}
done('F two player');

// G. role-keyed balance: a side plays the human terms or the CPU terms by its role, at its own level. Two player has no CPU terms at
// all; an away-side match gives the CPU terms to team 0; AI v AI gives them to both sides, so the demo is fair
begin('roles');
{
  const S = T.sides, C = T.contact, DIFF = [{ cpuSpeed:0.97 }, { cpuSpeed:1.00 }, { cpuSpeed:1.04 }];
  const base = (m, t) => 7.6 + m.nat[t].pace*0.25;
  // two player at Easy v Hard: nobody runs at cpuSpeed, and each side's own level keys its own terms
  T.newMatch(1, 1, { halfLen:120, diff:1, headless:true, duels:'off', humans:[true, true], levels:[0, 2] }); D.setMode('match');
  { const m = M(), p0 = m.players[0], p1 = m.players[7]; for (const p of [p0, p1]) { p.boost = 0; p.sprint = 0; p.stumble = 0; p.wf = 0; }
    ok(m.role[0] === 'human' && m.role[1] === 'human', 'two player: both sides play the human terms');
    ok(near(C.maxSpeed(p0), base(m, 0), 1e-9) && near(C.maxSpeed(p1), base(m, 1), 1e-9), `neither side runs at cpuSpeed (${C.maxSpeed(p0).toFixed(3)} v ${C.maxSpeed(p1).toFixed(3)})`);
  }
  // tackleChance keyed by role and level: an AI man of a human side tackles at myTackle of that side's level; a CPU side's at cpuTackle of its (opponent's) level
  const tc = (humans, levels, qTeam, mode) => {
    T.newMatch(1, 1, { halfLen:120, diff:1, headless:true, duels:'off', humans, levels }); D.setMode('match');
    const m = M(), q = m.players.find(p => p.team === qTeam), c = m.players.find(p => p.team !== qTeam);
    q.x = 60; q.y = 35; c.x = 60 + (qTeam ? -1 : 1); c.y = 35; c.side = -1; c.vx = 0; c.vy = 0;   // q a metre in front of a standing carrier: front-on, equal power, so the base rate and nothing else
    return C.tackleChance(q, c, mode);
  };
  const my = [0.58, 0.48, 0.42], cpu = [0.56, 0.64, 0.72], TWO = D.TWO.tackle;
  ok(near(tc([true, true], [0, 2], 0, 'ai'), TWO[2], 1e-9) && near(tc([true, true], [0, 2], 1, 'ai'), TWO[0], 1e-9), `two player: an AI tackler tackles at TWO.tackle of the carrier's level (${tc([true, true], [0, 2], 0, 'ai').toFixed(3)} against the Hard carrier, ${tc([true, true], [0, 2], 1, 'ai').toFixed(3)} against the Easy one)`);
  ok(near(tc([true, true], [2, 0], 0, 'ai'), TWO[0], 1e-9) && near(tc([true, true], [2, 0], 1, 'ai'), TWO[2], 1e-9), 'and the levels swapped swap the rates');
  ok(near(tc([false, true], [2, 2], 0, 'ai'), cpu[2], 1e-9) && near(tc([false, true], [2, 2], 1, 'ai'), my[2], 1e-9), `away side at Hard: the CPU team 0 tackles at cpuTackle, the human team 1 at myTackle (${tc([false, true], [2, 2], 0, 'ai').toFixed(3)}, ${tc([false, true], [2, 2], 1, 'ai').toFixed(3)})`);
  ok(near(tc([true, false], [1, 1], 1, 'ai'), cpu[1], 1e-9) && near(tc([true, false], [1, 1], 0, 'ai'), my[1], 1e-9), 'one player: as it always was');
  // AI v AI is fair: both roles cpu, both sides at cpuSpeed, the same tackle chance, the same kick spread level
  for (const d of [0, 2]) {
    T.newMatch(1, 1, { halfLen:120, diff:d, auto:true, headless:true }); D.setMode('match');
    const m = M(), p0 = m.players[0], p1 = m.players[7]; for (const p of [p0, p1]) { p.boost = 0; p.sprint = 0; }
    ok(m.role[0] === 'cpu' && m.role[1] === 'cpu', `AI v AI at ${['Easy', 'Normal', 'Hard'][d]}: both sides play the CPU terms`);
    ok(near(C.maxSpeed(p0), C.maxSpeed(p1), 1e-9) && near(C.maxSpeed(p0), base(m, 0)*DIFF[d].cpuSpeed, 1e-9), `both run at cpuSpeed (${C.maxSpeed(p0).toFixed(3)} v ${C.maxSpeed(p1).toFixed(3)})`);
    const g0 = T.kick.makeGoal(0, 88, 35, 'penalty', null), g1 = T.kick.makeGoal(1, 32, 35, 'penalty', null);
    ok(g0.cpu && g1.cpu && S.levelOf(0) === d && S.levelOf(1) === d, `both CPU kickers kick at the match level (${S.levelOf(0)}, ${S.levelOf(1)})`);
  }
  // the scrum: a pack a side. Seat 1's taps shove team 1 forward (pos negative), and its Good Hit lands on Set; seat 0 idle and no CPU pack
  T.newMatch(0, 1, { halfLen:240, diff:1, headless:false, duels:'off', humans:[true, true], levels:[1, 1] }); D.setMode('match'); clearSlots(); clearEdges();
  steps(120); T.scrum(0, 60, 35, '');
  { let g = 0; while (M().phase !== 'cut' && g++ < 400) T.update(STEP); }
  const sc = M().cut;
  ok(sc && sc.kind === 'scrum' && sc.base.length === 2 && sc.hit.length === 2, 'a two-player scrum has a pack a side');
  inputs[1].jx = -1; inputs[1].jy = 0;                       // team 1 pushes toward -x
  { let next = 0, g = 0; while (M().cut === sc && !sc.result && g++ < 2000) { if (!sc.hit[1] && sc.t >= 1.42) { inputs[1].aPressed = true; next = sc.t + 1/8; } else if (sc.t >= 1.42 && sc.t >= next) { inputs[1].aPressed = true; next = sc.t + 1/8; } T.update(STEP); } }
  ok(sc.hit[1] && !sc.hit[0] && sc.taps[1] > 4 && sc.taps[0] === 0, `seat 1 hit on Set and tapped (${sc.taps[1]} taps); seat 0 never pushed`);
  ok(sc.result && (sc.result === 'dom1' || sc.result === 'steal1'), `team 1 out-shoves an idle team 0 on team 0's put-in (${sc.result})`);
  inputs[1].jx = 0; { let g = 0; while (M().phase === 'cut' && g++ < 4000) T.update(STEP); }
  // and an idle human pack never concedes worse than the ball
  T.scrum(1, 60, 35, ''); { let g = 0; while (M().phase !== 'cut' && g++ < 400) T.update(STEP); }
  const sc2 = M().cut; inputs[0].jx = 1;
  { let next = 0, g = 0; while (M().cut === sc2 && !sc2.result && g++ < 2000) { if (sc2.t >= 1.42 && sc2.t >= next) { inputs[0].aPressed = true; next = sc2.t + 1/8; } T.update(STEP); } }
  ok(sc2.result === 'win0' || sc2.result === 'steal0', `team 0 tapping hard against an idle team 1 on team 1's put-in takes the ball, never a penalty (${sc2.result})`);
  inputs[0].jx = 0; { let g = 0; while (M().phase === 'cut' && g++ < 4000) T.update(STEP); }
  // the lineout: no CPU jump for a human side; each seat's press is its own jumper
  T.lineout(0, 60, 5, ''); { let g = 0; while (M().phase !== 'cut' && g++ < 400) T.update(STEP); }
  const lo = M().cut;
  ok(lo && lo.kind === 'lineout' && lo.jump[0] == null && lo.jump[1] == null, 'a two-player lineout starts with neither jumper up');
  steps(20); inputs[1].aPressed = true; T.update(STEP);
  ok(lo.jump[1] != null && lo.jump[0] == null, 'seat 1\'s Jump is team 1\'s jumper');
  inputs[0].aPressed = true; T.update(STEP);
  ok(lo.jump[0] != null, 'and seat 0\'s is team 0\'s');
  { let g = 0; while (M().phase === 'cut' && g++ < 4000) T.update(STEP); }
  // the away side: the CPU jumper is team 0's, the human's press team 1's
  T.newMatch(0, 1, { halfLen:240, diff:1, headless:false, duels:'off', humans:[false, true] }); D.setMode('match'); clearSlots(); clearEdges();
  steps(120); T.lineout(0, 60, 5, ''); { let g = 0; while (M().phase !== 'cut' && g++ < 400) T.update(STEP); }
  const lo2 = M().cut;
  ok(lo2 && lo2.jump[0] != null && lo2.jump[1] == null, 'away side: the CPU (team 0) jumps on its own throw, the human (team 1) waits for the press');
  steps(20); inputs[0].aPressed = true; T.update(STEP);
  ok(lo2.jump[1] != null, 'and seat 0\'s press is team 1\'s jumper');
  { let g = 0; while (M().phase === 'cut' && g++ < 4000) T.update(STEP); }
  D.setMode('menu');
}
done('G roles');

// H. one player as the away side: the bot in seat 0 plays team 1 against the CPU, to the end, with its ring on team 1 throughout
begin('away side');
{
  const S = T.sides;
  T.newMatch(0, 1, { halfLen:120, diff:1, headless:true, duels:'live', humans:[false, true] }); D.setMode('match'); clearSlots(); clearEdges();
  ok(!S.isHuman(0) && S.isHuman(1) && S.inputOf(1) === inputs[0] && S.ctrlOf(0) === null && S.ctrlOf(1).team === 1, 'the lone human plays team 1 from seat 0');
  reseed(3);
  let n = 0, bad = 0, duels = 0;
  while (!M().over && n < 200000) { bot(1); T.update(STEP); n++; if (M().side[1].ctrl.team !== 1) bad++; if (M().phase === 'cut' && M().cut && M().cut.duel && M().cut.t === STEP) duels++; }
  ok(M().over && bad === 0, `the away-side match runs to full time with the ring on team 1 (${M().score.join('-')}, tries ${M().tries.join('-')}, ${duels} duels)`);
  ok(M().stats.ta1 > 0 && (M().stats.sprints || 0) > 0, `team 1 carried and sprinted as the human (${M().stats.sprints} sprints)`);
  D.setMode('menu');
}
done('H away side');

// I. the home and the join screen: Two Player is a desk-only button beside Championship (How to Play drops to its own row there, phones keep
// Championship | How to Play), the join screen seats both players on the keyboard halves with a legend each (keycaps or pad glyphs for
// Run Pass Kick Sprint, lit while held), fixed rows so the two cards line up, a pad claims a seat with one press and the screen follows,
// Use Keyboard and Swap Players (the Difficulty goes with the player), then the team flow: Player 1 picks first, then Player 2 with
// Player 1's team in the bar (Change Team is his, from his own seat), and the pick starts the match with both humans at their own levels
begin('join');
{
  const fs = (await import('fs')).default, S = T.sides, X = T.teams;
  const src = fs.readFileSync(process.env.GAME ? process.env.GAME : new URL('../index.html', import.meta.url), 'utf8');
  ok(/<button class="btn desk-only" id="b-two">Two Player<\/button>/.test(src), 'the home has a desk-only Two Player button');
  ok(/<button class="btn primary" id="b-quick" autofocus>Quick Match<\/button>/.test(src) && src.indexOf('id="b-champ"') < src.indexOf('id="b-two"') && src.indexOf('id="b-two"') < src.indexOf('id="b-help"'), 'Quick Match is still the gold first button with the focus; Championship, Two Player, How to Play follow');
  ok(/body\.desk \.home-row #b-help\{grid-column:1\/-1\}/.test(src) && /\.desk-only\{display:none\}/.test(src), 'on a computer How to Play takes a row of its own under Championship | Two Player; phones never see the button');
  ok(/b\.classList\.toggle\('desk', PADS\.size > 0 \|\| !!\(deskQuery && deskQuery\.matches\)\)/.test(src) && /PADS\.delete\(index\);\n  setDesk\(\);/.test(src) && /function padConnected\(gp\) \{\n  padsOn = true;\n  if \(gp\) padOf\(gp\);\n  setDesk\(\);/.test(src), 'body.desk follows the pointer or the pads connected right now: a phone that had a pad goes back to its own layout when it is unplugged');
  // labels on the join screen are Title Case, with no arrow glyph anywhere in the markup
  const small = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'on', 'to', 'in', 'for', 'as', 'at', 'by']);
  const titled = s => s.split(/[\s·]+/).filter(Boolean).every((w, i) => (i && small.has(w)) || !/^[a-z]/.test(w));
  const join = src.slice(src.indexOf('id="s-join"'), src.indexOf('id="m-pen"')), text = s => s.replace(/<[^>]+>/g, '').trim();
  const labels = [...join.matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map(m => m[1]).concat([...join.matchAll(/<p class="eyebrow[^"]*">(.*?)<\/p>/g)].map(m => text(m[1])), [...join.matchAll(/<span class="lbl">([^<]+)<\/span>/g)].map(m => m[1]));
  ok(labels.length >= 12 && labels.every(titled), `every label on the join screen is Title Case (${labels.filter(l => !titled(l)).join(', ') || 'all ' + labels.length})`);
  ok(!new RegExp('[\\u2190-\\u2199\\u21d0-\\u21d9]').test(src.slice(src.indexOf('<body>'), src.indexOf('<script>'))), 'no arrow glyph in the markup');
  // the join screen
  menu(); D.setTwo(false); for (const k of [...D.pads().keys()]) D.padGone(k); padStub([]);
  D.openJoin();
  ok(D.two().on && D.navOnly() == null && D.twoSel().picking === 0 && D.twoSel().teams[0] === X.CLUBS[0] && D.twoSel().teams[1] == null, 'opening the join screen switches the seats model on, no seat restricted, Player 1 to pick first (Farnham until he does)');
  ok(seatOf(0).dev === 'kb' && seatOf(0).half === 'left' && seatOf(1).dev === 'kb' && seatOf(1).half === 'right' && $('j-dev0').textContent === 'Keyboard' && $('j-dev1').textContent === 'Keyboard', 'a fresh visit seats both players on the keyboard halves in order (the last visit\'s swap and pads are forgotten), and the cards say Keyboard');
  ok($('j-kb0').hidden && $('j-kb1').hidden && !$('j-pad').hidden, 'Use Keyboard is hidden for a keyboard seat; the Press Any Button line shows');
  // the legend: four cells per card reading Run Pass Kick Sprint, keycaps by code for the scheme, arrows as CSS triangles, pad glyphs by position
  const leg = s => D.legendHtml(s), caps = h => [...h.matchAll(/data-code="([A-Za-z0-9]+)"/g)].map(m => m[1]).join(' '), lbls = h => [...h.matchAll(/<span class="lbl">([^<]+)<\/span>/g)].map(m => m[1]).join(' ');
  ok(lbls(leg(0)) === 'Run Pass Kick Sprint' && lbls(leg(1)) === 'Run Pass Kick Sprint', 'each card carries a legend: Run Pass Kick Sprint');
  ok(caps(leg(0)) === 'KeyW KeyA KeyS KeyD KeyF KeyG KeyH' && /<kbd class="kc" data-code="KeyF">F<\/kbd>/.test(leg(0)) && /class="caps four"/.test(leg(0)), `Player 1's legend: the W A S D cluster, then F G H keycaps (${caps(leg(0))})`);
  ok(caps(leg(1)) === 'ArrowUp ArrowLeft ArrowDown ArrowRight Slash Period Comma' && /<kbd class="kc ar u" data-code="ArrowUp"><\/kbd>/.test(leg(1)) && /data-code="Slash">\/<\/kbd>/.test(leg(1)) && !/[←-↙]/.test(leg(1)), `Player 2's: four arrow keycaps drawn in CSS (no glyph), then / . , (${caps(leg(1))})`);
  ok(/function lightKey\(code, on\)/.test(src) && /if \(two\.on && r && r\[0\] != null\) lightKey\(code, down\);/.test(src) && /lightPad\(seat, 'big', now\)/.test(src) && /lightPad\(seat, 'stick', P\.stickLit\)/.test(src) && /\.kc\.on,\.pad\.on\{background:var\(--flood\)/.test(src) && /\.seat\.p2 \.kc\.on,\.seat\.p2 \.pad\.on\{background:var\(--p2\)/.test(src), 'a keycap or pad glyph lights (.on, in the seat colour) while its key or button is held: onKey and pollPads drive it');
  ok(/\.devrow\{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:44px\}/.test(src) && /\.legend\{display:grid;grid-template-columns:repeat\(4,1fr\);gap:6px;min-height:76px/.test(src) && /<div class="devrow"><p class="dev" id="j-dev1">Keyboard<\/p><button class="btn" id="j-kb1" hidden>Use Keyboard<\/button><\/div>/.test(src), 'fixed rows: Use Keyboard sits in a 44px device row that keeps its height either way, the legend is 76px, so the Difficulty rows line up');
  ok(/<p class="eyebrow p1"><i class="stag s0">1<\/i>Player 1<button class="hc-tick" id="jt0"[^>]*>(?:(?!<\/p>).)*<\/button><\/p>/.test(src) && /<p class="eyebrow p2"><i class="stag s1">2<\/i>Player 2<button class="hc-tick" id="jt1"[^>]*>(?:(?!<\/p>).)*<\/button><\/p>/.test(src), 'each card is badged with its seat tag, with its Hints tick at the right of the row');
  const gp = gamepad(0); padStub([gp]); connect(gp); bset(gp, 0, 1); poll(); bset(gp, 0, 0); poll();
  ok(seatOf(0).dev === 'pad' && $('j-dev0').textContent === 'Controller' && !$('j-kb0').hidden && $('j-dev1').textContent === 'Keyboard' && $('j-kb1').hidden && D.seatScheme(1) === 'solo', 'a pad press claims seat 0 and the screen follows: Controller, Use Keyboard, the lone keyboard seat on the solo map');
  ok(!/data-code/.test(leg(0)) && /data-pad="stick"/.test(leg(0)) && /data-pad="big"/.test(leg(0)) && /data-pad="small"/.test(leg(0)) && /data-pad="sh"/.test(leg(0)) && lbls(leg(0)) === 'Run Pass Kick Sprint', 'the pad seat\'s legend is the stick, the diamond with its bottom and right dots, and the shoulder');
  ok(caps(leg(1)) === 'KeyW KeyA KeyS KeyD KeyJ KeyK KeyL', 'and the lone keyboard seat\'s legend is the solo map: W A S D, J K L');
  D.twoSel().levels[0] = 0; D.twoSel().levels[1] = 2; D.swapPlayers();
  ok(seatOf(1).dev === 'pad' && $('j-dev1').textContent === 'Controller' && !$('j-kb1').hidden && $('j-dev0').textContent === 'Keyboard' && $('j-kb0').hidden, 'Swap Players moves the pad to Player 2');
  ok(D.twoSel().levels[0] === 2 && D.twoSel().levels[1] === 0 && D.settings().twoDiff[0] === 0 && D.settings().twoDiff[1] === 2, 'and the Difficulty goes with the player, saved by keyboard half (left Easy, right Hard)');
  const g1 = gamepad(1); padStub([gp, g1]); connect(g1); bset(g1, 0, 1); poll(); bset(g1, 0, 0); poll();
  ok(seatOf(0).dev === 'pad' && $('j-dev0').textContent === 'Controller' && $('j-pad').hidden, 'a second pad takes the other seat, and the Press Any Button line goes');
  D.useKeyboard(1); D.useKeyboard(0);
  ok(seatOf(0).dev === 'kb' && seatOf(1).dev === 'kb' && seatOf(0).half === 'right' && seatOf(1).half === 'left' && D.seatScheme(0) === 'right' && !$('j-pad').hidden, 'Use Keyboard on both returns the halves, Player 1 on the right as the swap put him');
  D.swapPlayers(); ok(seatOf(0).half === 'left' && seatOf(1).half === 'right', 'and swapping back puts Player 1 on the left');
  for (const k of [...D.pads().keys()]) D.padGone(k); padStub([]);
  // each player's Difficulty is his own, remembered, and cleaned on load
  const sel = D.twoSel(); sel.levels[0] = 0; sel.levels[1] = 2; D.settings().twoDiff = sel.levels.slice();   // what the two Difficulty rows set
  X.restore({ settings:{ twoDiff:[2, 0] } }); ok(D.settings().twoDiff[0] === 2 && D.settings().twoDiff[1] === 0, 'a saved pair of levels loads');
  X.restore({ settings:{ twoDiff:[3, 'x'] } }); ok(D.settings().twoDiff[0] === 2 && D.settings().twoDiff[1] === 0, 'a bad pair is ignored');
  X.restore({ settings:{ twoDiff:[1] } }); ok(D.settings().twoDiff.length === 2 && D.settings().twoDiff[0] === 2, 'so is a short one');
  D.settings().twoDiff = [1, 1];
  // the team flow: Player 1 first
  D.openTeams('two');
  ok(D.pickMode() === 'two' && sel.picking === 0 && $('t-eyebrow').textContent === 'Two Player' && $('t-eyebrow').classList.contains('p1') && !$('t-eyebrow').classList.contains('p2') && $('t-title').textContent === 'Player 1 Team', 'Player 1 picks first: Player 1 Team, the eyebrow in his colour');
  ok($('t-yours').hidden && $('t-default').hidden && $('t-back').textContent === 'Back to Players' && D.navOnly() === 0 && D.navOwner(0) && !D.navOwner(1) && D.navOwner(null), 'no team in the bar yet, the Play as Farnham button is off, Back to Players, and only seat 0 (or the mouse) acts');
  D.pickTeam(X.NATIONS[0]);
  ok(sel.teams[0] === X.NATIONS[0] && sel.picking === 1 && $('t-title').textContent === 'Player 2 Team' && $('t-eyebrow').classList.contains('p2') && !$('t-yours').hidden && D.navOnly() === 1 && !M().two, 'Player 1 picked England: Player 2 Team, England in the bar with Change Team, only seat 1 acts; nothing has started');
  D.navLog.length = 0; ok(T.navPress(0) === true && sel.picking === 0 && $('t-title').textContent === 'Player 1 Team' && D.navOnly() === 0, 'Player 1\'s own big action while Player 2 picks presses Change Team: back to Player 1 Team');
  D.pickTeam(X.NATIONS[0]); ok(sel.picking === 1 && D.navOnly() === 1, 'he picks again and Player 2 is on');
  ok(T.navPress(0) === true && sel.picking === 0, 'a pad\'s bottom button from seat 0 presses it too (the same navPress)'); D.pickTeam(X.NATIONS[0]);
  ok(T.navMove(0, 1, 0) === null && sel.picking === 1, 'but seat 0 can\'t move the ring on Player 2\'s grid');
  D.pickTeam(X.NATIONS[1]);
  ok(M().two && !M().headless && M().nat[0] === X.NATIONS[0] && M().nat[1] === X.NATIONS[1] && S.isHuman(0) && S.isHuman(1) && S.levelOf(0) === 0 && S.levelOf(1) === 2 && M().duels === 'live', 'Player 2\'s pick starts the match: England v France, Easy v Hard, both human, duels live');
  ok($('controls').hidden && !$('hud').hidden && !$('b-pause').hidden && !$('h-t0').hidden && !$('h-t1').hidden && D.navOnly() == null && D.two().on, 'the touch controls are off, the HUD with its seat tags and the pause button on, the seats model on through the match');
  D.exitMatch();
  ok(!D.two().on && D.navOnly() == null && M().demo, 'leaving the match switches the seats model off and the menu demo back on');
  // a mirror match is allowed
  D.openJoin(); D.openTeams('two'); D.pickTeam(X.CLUBS[0]); D.pickTeam(X.CLUBS[0]);
  ok(M().two && M().nat[0].id === 'FAR' && M().nat[1].id === 'FA2', 'both players can pick Farnham: FAR v FA2');
  D.exitMatch();
  // one player's team screen is as it was
  D.openTeams('quick');
  ok($('t-eyebrow').textContent === 'Quick Match' && !$('t-eyebrow').classList.contains('p1') && !$('t-eyebrow').classList.contains('p2') && $('t-title').textContent === 'Pick Opponent' && !$('t-yours').hidden && $('t-back').textContent === 'Back to Menu' && D.navOnly() == null, 'Quick Match: Pick Opponent with Farnham in the bar, Back to Menu, nobody restricted');
  fresh({ headless:false }); $('h-t0').hidden = $('h-t1').hidden = false; D.startMatch(0, 1, false); ok($('h-t0').hidden && $('h-t1').hidden && !$('controls').hidden, 'a one-player match: no seat tags on the scorebug, the touch controls on'); D.exitMatch();
  D.goHome(); menu();
  // Difficulty is saved by keyboard half: swapped Easy/Hard, then a fresh visit puts the halves back in order and each half keeps its own level
  D.useKeyboard && D.useKeyboard(0); D.useKeyboard && D.useKeyboard(1);
  D.openJoin(); D.twoSel().levels[0] = 0; D.twoSel().levels[1] = 2; D.swapPlayers();
  { const save = D.settings().twoDiff.slice(); D.openJoin();
    ok(save[0] === 0 && save[1] === 2 && D.twoSel().levels[0] === 0 && D.twoSel().levels[1] === 2 && D.seatScheme(0) === 'left', `swapped, then a fresh visit: the left half is Player 1 again with his own Easy, the right half Hard (${D.twoSel().levels.join(', ')}, ${D.seatScheme(0)})`); }
}
done('I join');

// J. the match head to head: the on-screen buttons are off, so each player's man carries a numbered tag in his colour, the Sprint meter as an
// arc round his ring, and under him his key and the word the button would read (F · Offload, G · Drop Goal, / · Tackle); either seat
// pauses; the pause card names a lost pad's player; the penalty card names its player and takes only his seat, from his keys as well as
// his pad; the half-time and full-time cards take either seat's keys; the close-up cues name each player's key
begin('marks');
{
  const K = T.kick, S = T.sides, C = T.contact;
  const pair = (o = {}) => { T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'off', humans:[true, true], levels:[1, 1], ...o }); D.setMode('match'); clearSlots(); clearEdges(); };
  const draw = () => {
    const texts = [], arcs = []; let fill = '', stroke = '';
    globalThis.__ctxSpy = (name, args) => { if (name === 'fillStyle') fill = args[0]; else if (name === 'strokeStyle') stroke = args[0]; else if (name === 'fillText') texts.push([String(args[0]), fill]); else if (name === 'arc') arcs.push([args, stroke]); };
    D.view(844, 390); D.render(STEP); globalThis.__ctxSpy = null;
    return { texts, arcs };
  };
  const sc = Math.min(844/54, 390/36), r = Math.max(8, 0.95*sc), meterR = r*1.55 + 5;
  pair(); D.setTwo(true); K.stageDrop({ x:60, y:35 }, [], 0);
  let d = draw();
  ok(d.texts.some(([t, f]) => t === '1' && f === '#1c1500') && d.texts.some(([t, f]) => t === '2' && f === '#2a0a22'), 'the tags 1 and 2 are drawn over the two ringed men, inked on gold and on pink');
  ok(d.arcs.some(([a, s]) => near(a[2], meterR, 1e-6) && s === '#ffcf3d') && d.arcs.some(([a, s]) => near(a[2], meterR, 1e-6) && s === '#ff5fd2'), 'a Sprint arc in each player\'s colour round his ring');
  M().spr[1].m = 0.25;
  d = draw(); const arc1 = d.arcs.find(([a, s]) => near(a[2], meterR, 1e-6) && s === '#ff5fd2');
  ok(arc1 && near(arc1[0][4] - arc1[0][3], Math.PI*2*0.25, 1e-9), 'the arc is the meter: a quarter full draws a quarter turn');
  ok(!d.texts.some(([t]) => /DROP GOAL|TACKLE|LONG|OFFLOAD/.test(t)), 'no cue chip while nothing is on');
  // the cue chips read the key and what the button would
  pair(); D.setTwo(true); K.stageDrop({ x:85, y:35 }, [], 1);
  ok(D.cueOf(1) === 'Drop Goal' && K.kickLabel(1) === 'Drop Goal' && D.cueOf(0) === null, `team 1's carrier in range: Player 2's chip reads Drop Goal, Player 1 has none (${D.cueOf(1)}, ${D.cueOf(0)})`);
  d = draw(); ok(d.texts.some(([t, f]) => t === '. · DROP GOAL' && f === '#ff5fd2'), `and it is drawn in pink with his Kick key: . · DROP GOAL (${d.texts.filter(([t]) => /DROP/.test(t)).map(([t]) => t).join('|')})`);
  pair(); D.setTwo(true); K.stageDrop({ x:60, y:35 }, [{ x:62, y:35 }], 0);
  ok(C.canDive(S.ctrlOf(1)) && D.cueOf(1) === 'Tackle' && D.cueOf(0) === null, `a defender within reach: Player 2's chip reads Tackle (${D.cueOf(1)})`);
  d = draw(); ok(d.texts.some(([t, f]) => t === '/ · TACKLE' && f === '#ff5fd2'), 'drawn as / · TACKLE');
  pair(); D.setTwo(true); K.stageDrop({ x:60, y:35 }, [], 1);
  { const c1 = S.ctrlOf(1); c1.hold = 1; inputs[1].aPressed = true; inputs[1].aDown = true; T.update(STEP); steps(12); }
  ok(S.side(1).pass && S.side(1).pass.t > C.LONG.arm && D.cueOf(1) === 'Long', `past the arm a held Pass reads Long (${D.cueOf(1)})`);
  d = draw(); ok(d.texts.some(([t]) => t === 'LONG'), 'Long is a state, drawn without a key');
  inputs[1].aDown = false; steps(2);
  pair(); D.setTwo(true); K.stageDrop({ x:60, y:35 }, [{ x:61.2, y:35, vx:-6 }], 0);
  // a receiver 2m behind and 5m aside, so an Offload has somewhere to go; then a tackle that binds (a broken one, or a Big Hit, is tried again)
  { const c0 = S.ctrlOf(0), q = S.ctrlOf(1), r0 = M().players[1]; r0.x = 58; r0.y = 40; r0.vx = r0.vy = 0; reseed(8); let k = null; for (let i = 0; i < 40 && !k; i++) { k = C.commitTackle(q, c0, 'ai'); if (k.tier === 'broken' || k.tier === 'dom') { if (M().contact) C.releaseBind(M().contact); k = null; q.tcd = 0; c0.stumble = 0; } } }
  ok(M().contact && M().contact.c === S.ctrlOf(0) && (C.canOffload(M().contact) ? D.cueOf(0) === 'Offload' : D.cueOf(0) === null), `held in a tackle, Player 1's chip reads Offload exactly when the button would (${D.cueOf(0)})`);
  ok(M().contact && C.canOffload(M().contact) && D.cueOf(0) === 'Offload', `with a receiver level within 9m it reads Offload (${D.cueOf(0)})`);
  d = draw(); ok(d.texts.some(([t, f]) => t === 'F · OFFLOAD' && f === '#ffcf3d'), 'drawn as F · OFFLOAD in gold');
  if (M().contact) C.releaseBind(M().contact);
  // one player draws the pointer, not a tag, and no arc
  fresh({ duels:'off' }); D.setTwo(false); K.stageDrop({ x:60, y:35 }, [], 0);
  d = draw(); ok(!d.texts.some(([t]) => t === '1' || t === '2') && !d.arcs.some(([a]) => near(a[2], meterR, 1e-6)), 'one player: no tag and no arc');
  // either seat pauses: Start on a pad in seat 1
  pair(); D.setTwo(true); menu(); for (const k of [...D.pads().keys()]) D.padGone(k); D.resetSeats();
  const g0 = gamepad(0), g1 = gamepad(1); padStub([g0, g1]); connect(g0); connect(g1);
  bset(g0, 0, 1); poll(); bset(g0, 0, 0); poll(); bset(g1, 0, 1); poll(); bset(g1, 0, 0); poll();
  ok(seatOf(0).pad === 0 && seatOf(1).pad === 1, 'two pads, a seat each');
  D.setMode('match'); clearEdges();
  bset(g1, 9, 1); poll(); ok(M().paused, 'Start on Player 2\'s pad pauses'); bset(g1, 9, 0); poll();
  bset(g0, 1, 1); poll(); ok(!M().paused, 'and Player 1\'s right button resumes from the card'); bset(g0, 1, 0); poll();
  D.padGone(1);
  ok(M().paused && $('pz-seat').textContent === 'Player 2 · Press Any Button' && !$('pz-seat').hidden && $('pz-seat').classList.contains('s1') && seatOf(1).dev === 'kb', 'Player 2\'s pad unplugged: paused, the card asks Player 2 to press any button, his seat is back on the keyboard');
  D.resume(); D.padGone(0); padStub([]); D.setTwo(false);
  // the penalty card for whichever side: it names its player, and only his seat acts, from his keys as well as a pad
  pair(); D.setTwo(true); M().headless = false; D.openPenaltyFor(1, 30, 35, 20);
  ok(M().phase === 'menu' && $('p-eyebrow').textContent === 'Penalty · Player 2' && $('p-eyebrow').classList.contains('p2') && D.navOnly() === 1 && !D.navOwner(0) && D.navOwner(1), 'a team 1 penalty: the card names Player 2 in his colour and only his seat acts');
  clearSlots(); clearEdges(); D.navLog.length = 0;
  const pressed = (seat, owned) => D.navLog.some(l => l[0] === 'press' && l[1] === seat && l[2] === owned);   // (a press with no ring yet goes on to place it, so a move follows it in the log)
  { const e = down('Slash'); up('Slash');
    ok(e.pd && pressed(1, true) && !inputs[1].aPressed && !inputs[1].aDown, `Player 2's Pass key on his penalty card is a press on the card, never on his slot (${JSON.stringify(D.navLog)}, aPressed ${inputs[1].aPressed})`); }
  D.navLog.length = 0;
  { down('KeyF'); up('KeyF');
    ok(pressed(0, false) && !pressed(0, true) && !inputs[0].aPressed && !inputs[0].aDown, `Player 1's F is refused there, and leaves no edge on his slot (${JSON.stringify(D.navLog)})`); }
  { down('ArrowLeft'); const last = D.navLog[D.navLog.length - 1]; ok(last && last[0] === 'move' && last[1] === 1 && inputs[1].keys.size === 0, 'his arrows move the ring, and never enter his keys'); up('ArrowLeft'); }
  { down('Period'); up('Period'); const last = D.navLog[D.navLog.length - 1]; ok(last && last[0] === 'back' && last[1] === 1 && !inputs[1].bPressed, 'his Kick key is Back on the card'); }
  // paused over the penalty card: the pause card is the layer, and anyone's
  D.pause(); ok(M().paused && D.navOwner(0) && D.navOwner(1) && D.navLayer() === $('m-pause'), 'paused over the penalty card, the pause card is the layer and either seat may work it');
  D.navLog.length = 0; { down('KeyF'); up('KeyF'); ok(pressed(0, true) && !inputs[0].aPressed, 'Player 1\'s F presses on the pause card'); }
  D.resume(); ok(!M().paused && !D.navOwner(0) && D.navOwner(1), 'resumed: the penalty card is Player 2\'s again');
  M().phase = 'play'; $('m-pen').hidden = true; M().headless = true;
  pair(); D.setTwo(true); M().headless = false; D.openPenaltyFor(0, 90, 35, 20);
  ok($('p-eyebrow').textContent === 'Penalty · Player 1' && $('p-eyebrow').classList.contains('p1') && D.navOnly() === 0, 'a team 0 penalty names Player 1');
  $('p-tap').click(); ok($('m-pen').hidden && D.navOnly() == null && M().phase !== 'menu', 'his choice (Tap and Go) closes the card and frees the layer'); M().headless = true;
  // the half-time and full-time cards: either seat's keys
  M().phase = 'break'; D.showBreak('half'); clearSlots(); clearEdges();
  D.navLog.length = 0; { down('Slash'); up('Slash'); down('KeyF'); up('KeyF'); ok(pressed(1, true) && pressed(0, true) && !inputs[1].aPressed && !inputs[0].aPressed && !inputs[0].aDown && !inputs[1].aDown, 'on the half-time card either seat\'s Pass key presses, and nothing is left on the slots'); }
  $('m-break').hidden = true; M().phase = 'play';
  fresh({ duels:'off' }); D.setTwo(false); M().headless = false; D.openPenaltyFor(0, 90, 35, 20);
  ok($('p-eyebrow').textContent === 'Penalty' && !$('p-eyebrow').classList.contains('p1') && D.navOnly() == null, 'one player: Penalty, nobody restricted');
  M().phase = 'play'; $('m-pen').hidden = true; M().headless = true;
  // the close-up cues name each player's key: scrums and lineouts both players, a goal kick its kicker (a set piece only cuts in when the match is not headless)
  pair({ headless:false }); D.setTwo(true); steps(120); T.scrum(1, 60, 35, ''); { let g = 0; while (M().phase !== 'cut' && g++ < 400) T.update(STEP); }
  ok(M().cut && M().cut.kind === 'scrum' && JSON.stringify(D.cutCues(M().cut)) === '[[0,"F · Push"],[1,"/ · Push"]]', `a scrum cues each player's Pass key to Push (${JSON.stringify(D.cutCues(M().cut))})`);
  { let g = 0; while (M().phase === 'cut' && g++ < 4000) T.update(STEP); }
  T.lineout(0, 60, 5, ''); { let g = 0; while (M().phase !== 'cut' && g++ < 400) T.update(STEP); }
  ok(M().cut && M().cut.kind === 'lineout' && JSON.stringify(D.cutCues(M().cut)) === '[[0,"F · Jump"],[1,"/ · Jump"]]', 'a lineout cues F · Jump and / · Jump');
  { let g = 0; while (M().phase === 'cut' && g++ < 4000) T.update(STEP); }
  D.goalKick(1, 21, 35, 'conversion');
  ok(M().cut && M().cut.kind === 'goal' && JSON.stringify(D.cutCues(M().cut)) === '[[1,"Hold / · Kick"]]', `a team 1 conversion cues Player 2 to hold his Pass key: Hold / · Kick (${JSON.stringify(D.cutCues(M().cut))})`);
  { let n = 0; while (M().phase === 'cut' && n++ < 600) { bot(1); T.update(STEP); } }
  pair(); D.setTwo(true); K.stageDrop({ x:85, y:35 }, [], 0); inputs[0].bPressed = true; inputs[0].bDown = true;
  for (let i = 0; i < K.holdSteps() + 2 && M().phase !== 'cut'; i++) T.update(STEP);
  ok(M().cut && M().cut.g.type === 'drop' && JSON.stringify(D.cutCues(M().cut)) === '[[0,"G · Drop Goal"]]', 'a drop goal cues its kicker\'s Kick key: G · Drop Goal');
  inputs[0].bDown = false; { let n = 0; while (M().phase === 'cut' && n++ < 600) { bot(0); T.update(STEP); } }
  // with a pad in seat 1 the cues name the button by position; the solo keyboard seat its own keys
  pair(); D.setTwo(true); menu(); D.resetSeats(); const gq = gamepad(3); padStub([gq]); connect(gq); bset(gq, 0, 1); poll(); bset(gq, 0, 0); poll(); D.swapPlayers(); D.setMode('match');
  ok(seatOf(1).dev === 'pad' && D.seatScheme(0) === 'solo' && D.seatKey(1, 'a') === 'Bottom Button' && D.seatKey(1, 'b') === 'Right Button' && D.seatKey(1, 'c') === 'Shoulder' && D.seatKey(1, 'x') === 'Stick' && D.seatKey(0, 'a') === 'J' && D.seatKey(0, 'b') === 'K' && D.seatKey(0, 'x') === 'A D', 'a pad seat\'s keys are Bottom Button, Right Button, Shoulder and Stick; the solo seat\'s J K and A D');
  D.padGone(3); padStub([]); if (M().paused) D.resume(); D.setTwo(false);
  D.setMode('menu');
}
done('J marks');

// K. head to head duels: the other player is the chooser. The CPU's plan is drawn as in one player and runs unless he moves first; his
// first fresh input before the lock takes over (shown live, with the feint's own animation; at most a feint and back in a Get Past;
// one step in a Tackle, eased; a dummy before the pump in a Block) and the choice is fixed at the lock, DUEL_LOCK at the timer's level
// before the plain window. A key or stick held into the cut-in is never a choice; a push in the grace counts; a dummied Block sounds
// its release once, at 1.05. For both owners. One player never reaches it
begin('locks');
{
  const S = T.sides, LOCK = D.DUEL_LOCK;
  const pairD = (levels = [1, 1]) => { T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'live', humans:[true, true], levels }); D.setMode('match'); D.setTwo(true); D.resetSeats(); clearSlots(); clearEdges(); };
  const stage = (kind, own, seed = 40 + kind.length, levels, prep) => { pairD(levels); if (prep) prep(); reseed(seed); if (kind === 'block') { D.stage('block', own); return T.forceDuel('block', own); } D.stage(kind, own); T.update(STEP); return M().cut; };
  // a seed whose plan satisfies `want` (the draws are the one-player draws, so the plan varies with the seed); prep runs after the match is made, before the duel
  const stageWhere = (kind, own, want, levels, prep) => { let last = null; for (let s = 1; s < 80; s++) { last = stage(kind, own, s, levels, prep); if (want(last)) return last; } if (last) last.planMissed = true; return last; };   // no seed drew that plan: the last duel, flagged, so the asserts fail instead of the suite crashing
  const runTo = (c, at) => { let n = 0; while (M().cut === c && !c.res && c.t < at - 1e-9 && n++ < 600) T.update(STEP); };
  const toLock = c => { let n = 0; while (M().cut === c && !c.locked && n++ < 600) T.update(STEP); };
  const sounds = []; globalThis.__sfxSpy = (k, t) => sounds.push([k, t]);
  for (const own of [0, 1]) {
    const inO = () => S.inputOf(1 - own), inU = () => S.inputOf(own), who = `owner ${own}`, kO = act => D.seatKey(1 - own, act), kU = act => D.seatKey(own, act);
    // Get Past: a plain plan
    let c = stageWhere('past', own, c => c.open0 === c.open);
    ok(c && c.kind === 'past' && c.own === own && near(c.lock, c.win[0] - LOCK[1], 1e-9) && !c.locked && !c.taken && c.changes === 0, `${who}: a Get Past locks DUEL_LOCK[Normal] = ${LOCK[1]}s before the ring opens`);
    const drawn = c.open;
    ok(JSON.stringify(D.cutCues(c)) === JSON.stringify([[own, kU('x') + ' · Step Left · Step Right'], [1 - own, kO('x') + ' · Guard Left · Guard Right']].sort((a, b) => a[0] - b[0])), `${who}: the cues name the stepper's and the guard's keys (${JSON.stringify(D.cutCues(c))})`);
    runTo(c, 0.15); inO().jx = drawn; T.update(STEP);     // in the grace: the chooser's push counts (a pad pushed in reaction to the cue)
    ok(c.taken && c.open === -drawn && c.open0 === drawn && near(c.feintAt, 0.15, 2*STEP) && c.changes === 1 && !c.locked, `${who}: a push in the first 0.30s is read: he guards the side he points at, and the switch animates as a feint from ${c.feintAt && c.feintAt.toFixed(2)}s`);
    ok(near(D.duelPose(c, c.feintAt).o.shift, -drawn*0.55, 1e-9), `${who}: the shoulder shown still the old one at the switch`);
    runTo(c, c.feintAt + 0.13); ok(near(D.duelPose(c, c.t).o.shift, drawn*0.55, 1e-9), `${who}: and the new one 0.12s later`);
    inO().jx = -drawn; T.update(STEP); ok(c.open === drawn && c.changes === 2, `${who}: pointing the other way guards that side (a feint and back)`);
    inO().jx = drawn; T.update(STEP); T.update(STEP); ok(c.open === drawn && c.changes === 2, `${who}: a third change is ignored`);
    toLock(c); ok(c.locked && c.open === drawn && c.t >= c.lock && c.t < c.lock + 2*STEP, `${who}: at the lock the guard is fixed`);
    inO().jx = -drawn; T.update(STEP); T.update(STEP); ok(c.open === drawn, `${who}: and the stick no longer moves it`);
    ok(JSON.stringify(D.cutCues(c)) === JSON.stringify([[own, kU('x') + ' · Step Left · Step Right']]), `${who}: after the lock only the stepper's cue stays`);
    runTo(c, c.centre); inU().flick = c.open; T.update(STEP);
    ok(c.res && c.out === 'break', `${who}: a step to the open side in the window is a Line Break (${c.res}, ${c.out})`);
    c = stage('past', own); runTo(c, c.centre); inU().flick = -c.open; T.update(STEP);
    ok(c.out === 'tackled' && c.verdict === 'Wrong Way', `${who}: into the guard is Wrong Way`);
    // an idle chooser plays the CPU's plan: a feint drawn at Normal shows at win[0] - 0.32, the lock
    c = stageWhere('past', own, c => c.open0 !== c.open);
    ok(c && !c.planMissed && c.feintAt != null && near(c.feintAt, c.win[0] - 0.32, 1e-9) && near(c.feintAt, c.lock, 1e-9), `${who}: a drawn feint (open0 ${c && c.open0}, open ${c && c.open}) is planned at the lock`);
    { const o0 = c.open0, o1 = c.open; toLock(c); ok(!c.planMissed && c.locked && !c.taken && c.open0 === o0 && c.open === o1 && near(c.feintAt, c.lock, 1e-9) && near(D.duelPose(c, c.lock + 0.13).o.shift, -o1*0.55, 1e-9), `${who}: an idle chooser leaves the plan: the feint plays and the open side is as drawn`); }
    // a Hard timer's lock is later than a drawn feint, so the feint shows before it; a fresh push after the feint still takes over until the lock
    c = stageWhere('past', own, c => c.open0 !== c.open, own ? [1, 2] : [2, 1]);
    ok(c && !c.planMissed && near(c.lock, c.win[0] - LOCK[2], 1e-9) && c.feintAt < c.lock, `${who}: a Hard timer locks ${LOCK[2]}s before the window, after the plan's feint`);
    // the chooser's run key held into the cut-in is never a choice; a fresh opposite key is
    { const codes = own ? ['KeyA', 'KeyD'] : ['ArrowLeft', 'ArrowRight'];   // the chooser's own half: Player 2's arrows when Player 1 owns, Player 1's A D when Player 2 does
      c = stageWhere('past', own, c => c.open0 === c.open, undefined, () => down(codes[1]));
      ok(c && inO().held.has(codes[1]) && inO().keys.has(codes[1]) && inO().sideX() === 0, `${who}: the chooser's run key (${codes[1]}) held into the cut is in held, and sideX reads 0`);
      const d0 = c.open; toLock(c); ok(c.locked && !c.taken && c.open === d0, `${who}: so it makes no choice: the drawn side stands`);
      up(codes[1]); c = stageWhere('past', own, c => c.open0 === c.open, undefined, () => down(codes[1])); const d1 = c.open; runTo(c, 0.35);
      up(codes[1]); down(d1 > 0 ? codes[1] : codes[0]); T.update(STEP);
      ok(c.taken && c.open === -d1, `${who}: let go and pressed again, the fresh key guards the side it points at`);
      up(codes[0]); up(codes[1]); clearSlots(); }
    // Key Pass: a plain plan
    c = stageWhere('pass', own, c => !c.drift && c.fakeAt == null);
    ok(c && c.kind === 'pass' && !c.drift && c.driftAt == null && c.fakeAt == null && near(c.lock, c.win[0] - LOCK[1], 1e-9), `${who}: a Key Pass with a plain plan: no drift, no fake`);
    ok(c.lock > 0.40, `${who}: the lock (${c.lock.toFixed(2)}s) leaves the chooser room to work in`);
    runTo(c, 0.15); inO().jx = c.side; T.update(STEP);
    ok(c.taken && c.drift && near(c.driftAt, 0.15, 2*STEP) && c.lean === 0 && !c.locked, `${who}: held toward the runner in the grace: he drifts onto him from ${c.driftAt && c.driftAt.toFixed(2)}s, live`);
    runTo(c, c.driftAt + 0.16); ok(near(D.duelPose(c, c.t).o.y - D.duelPose({ ...c, driftAt:null, drift:false }, c.t).o.y, c.side*1.2, 1e-9) && !c.locked, `${who}: 0.15s on, his body has moved the full 1.2m toward the runner`);
    inO().jx = -c.side; T.update(STEP);
    ok(!c.drift && c.driftAt == null && near(c.fakeAt, c.t - 0.2, 2*STEP) && near(c.lean, -c.side, 1e-9) && !c.locked, `${who}: let go of the drift before the lock: it was a fake, he comes back and leans the other way`);
    inO().jx = c.side; T.update(STEP); ok(c.drift && near(c.driftAt, c.t, 2*STEP) && c.fakeAt == null && !c.locked, `${who}: and drifts again`);
    toLock(c); ok(c.locked && c.drift && c.lean === 0, `${who}: at the lock the drift stands`);
    runTo(c, c.centre); inU().bPressed = true; T.update(STEP); ok(c.out === 'sold', `${who}: Dummy sells him (${c.out})`);
    c = stageWhere('pass', own, c => !c.drift && c.fakeAt == null); runTo(c, 0.35); inO().jx = -c.side; toLock(c);
    ok(c.locked && c.taken && !c.drift && c.driftAt == null, `${who}: held away from the runner: he rushes`);
    runTo(c, c.centre); inU().aPressed = true; T.update(STEP); ok(c.out === 'drawn', `${who}: Pass draws him (${c.out})`);
    c = stageWhere('pass', own, c => !c.drift && c.fakeAt == null); toLock(c); ok(!c.drift && !c.taken, `${who}: a still hand on a plain plan is a rush`);
    runTo(c, c.centre); inU().bPressed = true; T.update(STEP); ok(c.out === 'tackled' || c.out === 'broken', `${who}: a Dummy on a rushing man is Not Fooled, or broken (${c.out})`);
    // an idle chooser plays a drawn drift (at the lock) or a drawn fake (before it)
    c = stageWhere('pass', own, c => c.drift); ok(c && !c.planMissed && near(c.driftAt, c.lock, 1e-9), `${who}: a drawn drift is planned at the lock`);
    toLock(c); ok(c.drift && !c.taken, `${who}: an idle chooser drifts as drawn`); runTo(c, c.centre); inU().bPressed = true; T.update(STEP); ok(c.out === 'sold', `${who}: and the Dummy sells him`);
    c = stageWhere('pass', own, c => c.fakeAt != null); ok(c && !c.planMissed && c.fakeAt < c.lock && !c.drift, `${who}: a drawn fake shows before the lock`);
    toLock(c); ok(!c.drift && c.fakeAt != null, `${who}: and leaves him coming at the passer`);
    c = stageWhere('pass', own, c => c.drift, own ? [1, 0] : [0, 1]);
    ok(c && !c.planMissed && near(c.lock, c.win[0] - LOCK[0], 1e-9) && near(c.driftAt, c.lock, 1e-9) && c.driftAt < c.win[0] - 0.32, `${who}: an Easy timer's lock is ${LOCK[0]}s before the window, and the drawn drift is pulled back to it`);
    // the defender's run key held into the cut (own 1: Player 1's D) makes no drift
    { clearSlots(); const codes = D.seatScheme(1 - own) === 'right' ? ['ArrowLeft', 'ArrowRight'] : ['KeyA', 'KeyD'];
      c = stageWhere('pass', own, c => !c.drift && c.fakeAt == null); const key = c.side > 0 ? codes[1] : codes[0];
      up(key); clearSlots(); down(key); c = stageWhere('pass', own, c => !c.drift && c.fakeAt == null && c.side === (key === codes[1] ? 1 : -1));
      if (c) { toLock(c); ok(!c.drift && !c.taken, `${who}: a run key toward the runner held into the cut is no drift`); } else { ok(true, ''); }
      up(key); clearSlots(); }
    // Tackle: a plan without a step
    c = stageWhere('tackle', own, c => !c.stepDir);
    ok(c && c.kind === 'tackle' && !c.stepDir && c.stepAt == null && c.tkAt == null && near(c.lock, c.win[0] - LOCK[1], 1e-9), `${who}: a Tackle with no drawn step`);
    const win0 = c.win.slice(), tk0 = c.tk, end0 = c.endT, cam0 = D.duelCam(c);
    runTo(c, 0.35); inO().jx = 1; T.update(STEP);
    ok(c.taken === false && c.stepped && c.stepDir === 1 && near(c.stepAt, 0.35, 2*STEP) && near(c.tkAt, c.stepAt, 1e-9) && near(c.tk, tk0 + 0.10, 1e-9) && near(c.win[0], win0[0] + 0.10, 1e-9) && near(c.win[1], win0[1] + 0.10, 1e-9) && near(c.endT, end0 + 0.10, 1e-9) && c.cam === null, `${who}: a fresh push before the lock is the step: the contact, the window and the end move 0.10s later, the camera is reframed`);
    { const at = c.stepAt, P = (cc, t) => D.duelPose(cc, t).u.x, plainC = { ...c, tkAt:null, tk:tk0 }, fullC = { ...c, tkAt:null };
      let extra = 0; for (let t = at; t < at + 0.16; t += STEP) extra = Math.max(extra, Math.abs((P(c, t + STEP) - P(c, t)) - (P(plainC, t + STEP) - P(plainC, t))));   // the most any one step adds over the plain approach
      const snap = Math.abs((P(fullC, at + STEP) - P(plainC, at)) - (P(plainC, at + STEP) - P(plainC, at)));   // what a snap to the stepped pace would add in one step
      ok(near(P(c, at - STEP), P(plainC, at - STEP), 1e-9) && extra < 0.5*snap && near(P(c, at + 0.3), P(fullC, at + 0.3), 1e-9), `${who}: the approach eases from the plain pace to the stepped one over 0.15s: at most ${extra.toFixed(3)}m a step over the plain run, against a ${snap.toFixed(3)}m snap`); }
    inO().jx = -1; T.update(STEP); ok(c.stepDir === 1 && near(c.win[0], win0[0] + 0.10, 1e-9), `${who}: one step only: the second push is ignored`);
    toLock(c); ok(c.locked && c.lean === 0, `${who}: locked`);
    runTo(c, c.centre); inU().aPressed = true; T.update(STEP); ok(c.out === 'bighit', `${who}: a Tackle timed on the moved window is a Big Hit (${c.out})`);
    c = stageWhere('tackle', own, c => !c.stepDir); const win1 = c.win.slice(); toLock(c); ok(!c.stepDir && c.win[0] === win1[0] && c.win[1] === win1[1], `${who}: a still hand: no step, the window stays`);
    runTo(c, win1[0] + 0.02); inU().aPressed = true; T.update(STEP); ok(c.res === 'ok' || c.res === 'perfect', `${who}: and the window is where it was (${c.res})`);
    c = stageWhere('tackle', own, c => c.stepDir);
    ok(c && !c.planMissed && c.stepDir && near(c.stepAt, c.lock, 1e-9) && near(c.tkAt, c.lock, 1e-9) && near(c.lock, c.win[0] - 0.10 - LOCK[1], 1e-9), `${who}: a drawn step is planned at the lock, which is set from the plain window`);
    { const sd = c.stepDir; toLock(c); ok(c.locked && c.stepDir === sd && !c.stepped, `${who}: an idle chooser keeps the drawn step`); }
    { clearSlots(); const codes = D.seatScheme(1 - own) === 'right' ? ['ArrowLeft', 'ArrowRight'] : ['KeyA', 'KeyD']; down(codes[0]);
      c = stageWhere('tackle', own, c => !c.stepDir); const w = c.win.slice(); toLock(c);
      ok(!c.stepDir && !c.stepped && c.win[0] === w[0], `${who}: the carrier's run key held into the cut is no step`); up(codes[0]); clearSlots(); }
    // Block: a plain plan
    c = stageWhere('block', own, c => !c.dummy);
    ok(c && c.kind === 'block' && !c.dummy && near(c.rel, 0.75, 1e-9) && near(c.lock, 0.75, 1e-9) && near(c.centre, 1.05, 1e-9) && near(c.reachT, 1.05, 1e-9), `${who}: a Block with a plain plan: the release at 0.75, the lock at the pump`);
    runTo(c, 0.10); inO().bPressed = true; T.update(STEP);
    ok(c.dummyPress && !c.dummy && !c.locked, `${who}: a Dummy pressed in the grace is kept until the pump`);
    sounds.length = 0; toLock(c);
    ok(c.locked && c.dummy && near(c.rel, 1.05, 1e-9) && near(c.centre, 1.35, 1e-9) && near(c.win[0], 1.35 - c.wid/2, 1e-9) && near(c.endT, 1.80, 1e-9) && near(c.reachT, 1.05, 1e-9), `${who}: at the pump the dummy is on: the real release at 1.05, the ring with it, the blocker's run unchanged`);
    ok(near(D.duelPose(c, 1.05).u.x, c.u0.x + (c.L.x - c.u0.x)*0.85, 1e-9), `${who}: the blocker is on the lane by the plain release`);
    runTo(c, 1.20);
    ok(!sounds.some(([k, t]) => k === 'pass' && t < 1.0) && sounds.filter(([k]) => k === 'pass').length === 1 && near(sounds.find(([k]) => k === 'pass')[1], 1.05, 2*STEP), `${who}: the release sounds once, at 1.05, never at the pump (${JSON.stringify(sounds.filter(([k]) => k === 'pass'))})`);
    runTo(c, c.centre); inU().aPressed = true; T.update(STEP); ok(c.out === 'intercept' || c.out === 'knock', `${who}: a Block on the real release wins (${c.out})`);
    c = stageWhere('block', own, c => !c.dummy); sounds.length = 0; runTo(c, 1.05); inU().aPressed = true; T.update(STEP); ok((c.out === 'intercept' || c.out === 'knock') && sounds.filter(([k]) => k === 'pass').length === 1 && near(sounds.find(([k]) => k === 'pass')[1], 0.75, 2*STEP), `${who}: no press: a plain release at 0.75, sounded once there, blocked on its window (${c.out})`);
    c = stageWhere('block', own, c => !c.dummy); runTo(c, 0.40); inO().bPressed = true; T.update(STEP); runTo(c, 1.05); inU().aPressed = true; T.update(STEP);
    ok(c.out === 'pass' && c.res === 'early', `${who}: a Block on the pump is Too Early (${c.out}, ${c.res})`);
    c = stageWhere('block', own, c => !c.dummy); runTo(c, 0.80); inO().bPressed = true; T.update(STEP); ok(c.locked && !c.dummy && near(c.rel, 0.75, 1e-9), `${who}: a Dummy after the pump is ignored`);
    c = stageWhere('block', own, c => c.dummy); ok(c && !c.planMissed && c.dummy && near(c.rel, 1.05, 1e-9) && near(c.reachT, 1.05, 1e-9) && near(D.duelPose(c, 1.05).u.x, c.u0.x + (c.L.x - c.u0.x)*0.85, 1e-9), `${who}: a drawn dummy stands for an idle passer, with the blocker's run still timed to the plain release`);
    runTo(c, 0.40); ok(JSON.stringify(D.cutCues(c)) === JSON.stringify([[own, kU('a') + ' · Block'], [1 - own, kO('b') + ' · Dummy']].sort((a, b) => a[0] - b[0])), `${who}: the Block cues name the blocker's and the passer's keys (${JSON.stringify(D.cutCues(c))})`);
    // the chooser's ring: Get Past and Key Pass hand it to O. His ring is put on another man 6m behind the carrier first (near enough
    // that setCarrier would leave it there), so the hand-over is startDuel's own
    for (const kind of ['past', 'pass']) {
      pairD(); reseed(40 + kind.length); const st = D.stage(kind, own);
      const other = M().players.find(p => p.team !== own && p !== st.O && p !== st.R), w = T.kick.toWorld(own, 64, 35);
      other.x = w.x; other.y = w.y; other.vx = other.vy = 0; other.down = 0; S.setCtrl(1 - own, other);
      T.update(STEP); c = M().cut;
      ok(c && c.kind === kind && c.O !== other && S.ctrlOf(1 - own) === c.O, `${who}: startDuel hands the chooser's control to O in a ${kind === 'past' ? 'Get Past' : 'Key Pass'} (his ring was on another man 6m back)`);
    }
    // the owner's stick is re-centred through the grace; the chooser's is not
    c = stage('past', own); runTo(c, 0.10); inU().jx = 1; inU().padStick = true; T.update(STEP); ok(inU().jx === 0 && inU().latch, `${who}: the owner's stick pushed in the grace is re-centred and latched`); inU().padStick = false; inU().latch = false;
  }
  globalThis.__sfxSpy = null;
  // one player: no lock, the draws as they were, a drawn dummy keeps its slower blocker run
  fresh(); D.setTwo(false); reseed(44); D.stage('past'); T.update(STEP);
  ok(M().cut && M().cut.kind === 'past' && M().cut.lock === undefined && M().cut.locked === undefined && M().cut.lean === undefined && M().cut.tkAt === undefined, 'one player: a duel has no lock, no lean and no eased step');
  fresh(); reseed(44); D.stage('block'); const b1 = T.forceDuel('block');
  ok(b1.reachT === undefined && near(b1.centre, b1.rel + 0.30, 1e-9), 'one player: a Block keeps its drawn release');
  D.setMode('menu');
}
done('K locks');

// L. full time head to head: Rematch (the same teams and levels, the series kept), the result named by player (a mirror match has two
// Farnhams) with the seat tags on the score row, the Series line counting Player 1's wins first and draws, Change Teams back to Player 1's
// pick with the series kept, Back to Menu ending the series; half time and one player unchanged
begin('full time');
{
  const S = T.sides, X = T.teams;
  menu(); D.openJoin(); const sel = D.twoSel(); sel.teams = [X.NATIONS[2], X.NATIONS[3]]; sel.levels = [0, 2];
  D.startTwo(); M().headless = true;
  ok(M().two && M().nat[0].id === 'IRE' && M().nat[1].id === 'ITA' && S.levelOf(0) === 0 && S.levelOf(1) === 2, 'the match from the join selection: Ireland v Italy, Easy v Hard');
  M().score = [10, 3]; M().tries = [2, 0]; D.showBreak('full');
  ok($('br-eyebrow').textContent === 'Full Time' && $('br-go').textContent === 'Rematch' && !$('br-row').hidden && $('br-series').hidden && $('br-tries').textContent === 'Player 1 Wins · Tries 2 – 0' && $('br-pts').hidden && !$('br-t0').hidden && !$('br-t1').hidden, `full time in two player: Player 1 Wins, the seat tags, Rematch, Change Teams | Back to Menu, and no series line after one match (${$('br-tries').textContent})`);
  D.showBreak('full'); ok($('br-series').hidden && D.series().w[0] === 1, 'shown again, the match counts once');
  $('m-break').hidden = true; D.startTwo(); M().headless = true;
  ok(M().two && M().nat[0].id === 'IRE' && M().nat[1].id === 'ITA' && S.levelOf(0) === 0 && S.levelOf(1) === 2 && D.series().w[0] === 1 && !M().seriesDone, 'Rematch: the same teams and levels, the series kept');
  M().score = [5, 5]; D.showBreak('full'); ok(!$('br-series').hidden && $('br-series').textContent === 'Series 1 – 0 · 1 Draw' && $('br-tries').textContent.startsWith('Draw'), 'a draw, and from the second match the series line shows');
  $('m-break').hidden = true; D.startTwo(); M().headless = true; M().score = [0, 7]; D.showBreak('full'); ok($('br-series').textContent === 'Series 1 – 1 · 1 Draw' && $('br-tries').textContent.startsWith('Player 2 Wins'), 'Player 2 wins one');
  $('m-break').hidden = true; D.startTwo(); M().headless = true; M().score = [3, 3]; D.showBreak('full'); ok($('br-series').textContent === 'Series 1 – 1 · 2 Draws', 'two draws');
  // a mirror match names the player
  $('m-break').hidden = true; sel.teams = [X.CLUBS[0], X.CLUBS[0]]; D.startTwo(); M().headless = true; M().score = [7, 12]; D.showBreak('full');
  ok(M().nat[0].id === 'FAR' && M().nat[1].id === 'FA2' && $('br-tries').textContent === 'Player 2 Wins · Tries 0 – 0' && $('br-n0').textContent === 'FAR' && $('br-n1').textContent === 'FA2', 'Farnham v Farnham: Player 2 Wins, with the two codes');
  // Change Teams: back to Player 1's pick, the series and the seats kept
  $('m-break').hidden = true; D.setMode('menu'); D.openTeams('two');
  ok(D.pickMode() === 'two' && sel.picking === 0 && $('t-title').textContent === 'Player 1 Team' && D.series().w[0] === 1 && D.series().w[1] === 2 && D.two().on, 'Change Teams goes back to Player 1\'s pick, the series and the seats kept');
  D.pickTeam(X.NATIONS[2]); D.pickTeam(X.CLUBS[1]); M().headless = true;
  ok(M().two && M().nat[0].id === 'IRE' && M().nat[1].id === 'HAS' && S.levelOf(0) === 0 && S.levelOf(1) === 2, 'Player 1 picks Ireland, Player 2 Haslemere, and the match starts at the same levels');
  M().score = [12, 0]; D.showBreak('full'); ok($('br-series').textContent === 'Series 2 – 2 · 2 Draws', 'and the series runs on');
  $('m-break').hidden = true; D.exitMatch();
  ok(D.series().w[0] === 0 && D.series().w[1] === 0 && D.series().d === 0 && !D.two().on, 'Back to Menu ends the series and the seats model');
  // one player's cards are as they were
  fresh(); M().score = [7, 0]; D.showBreak('full');
  ok($('br-go').textContent === 'Continue' && $('br-row').hidden && $('br-series').hidden && $('br-pts').hidden && $('br-t0').hidden && $('br-t1').hidden && $('br-tries').textContent === 'England Win · Tries 0 – 0', 'one player: England Win, Continue, no series, no tags');
  D.showBreak('half'); ok($('br-eyebrow').textContent === 'Half Time' && $('br-go').textContent === 'Second Half' && $('br-row').hidden && $('br-series').hidden, 'half time: Second Half');
  $('m-break').hidden = true;
  T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'off', humans:[true, true], levels:[1, 1] }); D.setMode('match'); D.showBreak('half');
  ok($('br-go').textContent === 'Second Half' && $('br-row').hidden && $('br-series').hidden && !$('br-t0').hidden, 'two player half time: Second Half, the tags, no series yet');
  $('m-break').hidden = true; D.setMode('menu');
}
done('L full time');

// N. pads on the cards, and seats lost and regained: a button let go on the pause, penalty or half-time card is released (no sprint, no
// run and a fresh press edge after it); a pad that drops mid-match, at half time or on a shared dongle is claimed back into its own seat
// by the next press, a pad pressed on the team screen claims nothing, a release gives the halves by seat; a stick held through a
// close-up the player doesn't own reads live the moment it hands back (and after a CPU kick in one player)
begin('cards and pads');
{
  const S = T.sides, K = T.kick;
  // one player: Sprint and the d-pad let go on the penalty card
  fresh({ duels:'off' }); D.setTwo(false); clearSlots(); clearEdges(); for (const k of [...D.pads().keys()]) D.padGone(k);
  const gp = gamepad(0); padStub([gp]); connect(gp);
  K.stageDrop({ x:60, y:35 }, [], 0); bset(gp, 6, 1); bset(gp, 14, 1); poll(); steps(3, () => poll());
  ok(inputs[0].cDown && inputs[0].src.c === 4 && inputs[0].keys.has('PadLeft') && M().spr[0].p, 'one player: RT holds Sprint and the d-pad runs left');
  M().phase = 'menu'; bset(gp, 6, 0); bset(gp, 14, 0); poll(); clearEdges();
  ok(!inputs[0].cDown && inputs[0].src.c === 0 && !inputs[0].keys.has('PadLeft'), 'let go on the penalty card: the trigger and the d-pad are released there');
  M().phase = 'play'; steps(30, () => poll()); const m0 = M().spr[0].m; steps(20, () => poll());
  ok(!M().spr[0].p && M().players.every(p => p.team === 1 || p.sprint <= 0) && M().spr[0].m > m0 && inputs[0].keys.size === 0, `back in play the burst eases out, then nobody sprints and no d-pad key runs on its own (meter refilling ${m0.toFixed(2)} to ${M().spr[0].m.toFixed(2)}; p ${!!M().spr[0].p}, sprints ${M().players.filter(p => p.sprint > 0).map(p => p.team + ":" + p.sprint.toFixed(2))}, keys ${[...inputs[0].keys]})`);
  bset(gp, 6, 1); poll(); ok(inputs[0].cPressed && inputs[0].cDown, 'and the next press of the trigger is a fresh edge'); bset(gp, 6, 0); poll(); clearEdges();
  // A let go on the half-time card, and on the pause card
  bset(gp, 0, 1); poll(); ok(inputs[0].aDown, 'A held in play'); M().phase = 'break'; bset(gp, 0, 0); poll(); clearEdges(); ok(!inputs[0].aDown && inputs[0].src.a === 0, 'let go on the half-time card, released');
  M().phase = 'play'; bset(gp, 0, 1); poll(); ok(inputs[0].aPressed, 'the next A press is an edge'); clearEdges();
  bset(gp, 9, 1); poll(); bset(gp, 9, 0); poll(); ok(M().paused && inputs[0].aDown, 'Start pauses with A still held'); bset(gp, 0, 0); poll(); ok(!inputs[0].aDown, 'let go on the pause card, released');
  bset(gp, 9, 1); poll(); bset(gp, 9, 0); poll(); ok(!M().paused, 'resumed'); clearEdges(); bset(gp, 0, 1); poll(); ok(inputs[0].aPressed, 'and A presses again'); bset(gp, 0, 0); poll();
  D.padGone(0); padStub([]); if (M().paused) D.resume();
  // two player: Player 2 lets go of Sprint while Player 1 has paused
  T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'off', humans:[true, true], levels:[1, 1] }); D.setMode('match'); clearSlots(); clearEdges();
  D.setTwo(true); menu(); D.resetSeats(); const g0 = gamepad(0), g1 = gamepad(1); padStub([g0, g1]); connect(g0); connect(g1);
  bset(g0, 0, 1); poll(); bset(g0, 0, 0); poll(); bset(g1, 0, 1); poll(); bset(g1, 0, 0); poll(); D.setMode('match'); clearEdges();
  K.stageDrop({ x:60, y:35 }, [], 1); bset(g1, 7, 1); poll(); steps(2, () => poll()); ok(inputs[1].cDown && M().spr[1].p, 'Player 2 holds Sprint');
  bset(g0, 9, 1); poll(); bset(g0, 9, 0); poll(); ok(M().paused, 'Player 1 pauses');
  bset(g1, 7, 0); poll(); ok(!inputs[1].cDown && inputs[1].src.c === 0, 'Player 2 lets go on the card: released');
  bset(g0, 9, 1); poll(); bset(g0, 9, 0); poll(); clearEdges(); bset(g1, 7, 1); poll(); ok(!M().paused && inputs[1].cPressed, 'after Player 1 resumes, Player 2\'s next Sprint press is an edge'); bset(g1, 7, 0); poll();
  // a pad lost mid-match comes back to its own seat
  D.padGone(1);
  ok(M().paused && D.two().lost[0] === 1 && seatOf(1).dev === 'kb' && seatOf(0).dev === 'pad' && D.seatScheme(1) === 'solo' && !$('pz-seat').hidden, 'Player 2\'s pad drops: paused, his seat on the keyboard (the solo map), the card asking him to press');
  const g2 = gamepad(2); padStub([g0, g2]); connect(g2); bset(g2, 0, 1); poll(); bset(g2, 0, 0); poll();
  ok(seatOf(1).dev === 'pad' && seatOf(1).pad === 2 && seatOf(0).dev === 'pad' && seatOf(0).pad === 0 && D.two().lost.length === 0 && $('pz-seat').hidden, 'his next press takes seat 1 back, Player 1\'s pad untouched, the card line gone');
  D.resume();
  // Player 1 on the keyboard, Player 2's pad drops: Player 1 stays on the left half and the solo map; a reconnect gives seat 1 back
  D.padGone(0); D.padGone(2); if (M().paused) D.resume(); D.resetSeats(); padStub([g1]); connect(g1); menu(); bset(g1, 0, 1); poll(); bset(g1, 0, 0); poll();
  ok(seatOf(0).dev === 'pad', 'the first pad took seat 0; Swap Players puts it on Player 2'); D.swapPlayers(); ok(seatOf(1).dev === 'pad' && seatOf(0).dev === 'kb' && D.seatScheme(0) === 'solo', 'Player 1 keyboard, Player 2 pad');
  D.setMode('match'); D.padGone(1);
  ok(M().paused && seatOf(1).dev === 'kb' && D.seatScheme(0) === 'right' && D.seatScheme(1) === 'left' && D.two().lost[0] === 1, 'the pad drops: both on the keyboard, the halves as the swap left them (Player 1 right)');
  padStub([g2]); connect(g2); bset(g2, 0, 1); poll(); bset(g2, 0, 0); poll();
  ok(seatOf(1).dev === 'pad' && seatOf(1).pad === 2 && seatOf(0).dev === 'kb' && D.seatScheme(0) === 'solo', 'the reconnected pad is Player 2 again, Player 1 back on the solo map');
  D.resume();
  // without a swap: Player 1 left, Player 2 right when both end up on the keyboard
  D.padGone(2); if (M().paused) D.resume(); menu(); D.resetSeats(); padStub([g1]); connect(g1); bset(g1, 0, 1); poll(); bset(g1, 0, 0); poll(); D.twoRelease(0);
  ok(seatOf(0).dev === 'kb' && seatOf(0).half === 'left' && seatOf(1).half === 'right', 'Use Keyboard with nobody swapped: Player 1 left, Player 2 right');
  // a shared dongle: both pads drop, the presses take the seats back in the order they went
  menu(); D.resetSeats(); padStub([g0, g1]); connect(g0); connect(g1); bset(g0, 0, 1); poll(); bset(g0, 0, 0); poll(); bset(g1, 0, 1); poll(); bset(g1, 0, 0); poll(); D.setMode('match');
  D.padGone(1); D.padGone(0);
  ok(M().paused && D.two().lost.join('') === '10' && $('pz-seat').textContent === 'Player 2 · Press Any Button', 'both pads drop (Player 2\'s first): the card asks Player 2 first');
  const g3 = gamepad(3), g4 = gamepad(4); padStub([g3, g4]); connect(g3); connect(g4); bset(g3, 0, 1); poll(); bset(g3, 0, 0); poll();
  ok(seatOf(1).pad === 3 && seatOf(0).dev === 'kb' && $('pz-seat').textContent === 'Player 1 · Press Any Button' && !$('pz-seat').hidden, 'the first press is Player 2\'s, and the card now asks Player 1');
  bset(g4, 0, 1); poll(); bset(g4, 0, 0); poll();
  ok(seatOf(0).pad === 4 && seatOf(1).pad === 3 && $('pz-seat').hidden && D.two().lost.length === 0, 'the second is Player 1\'s');
  D.resume();
  // lost on the half-time card: no pause is possible there, but the next press still takes the seat back
  M().phase = 'break'; D.padGone(3);
  ok(!M().paused && D.two().lost[0] === 1 && seatOf(1).dev === 'kb', 'Player 2\'s pad sleeps over half time: his seat falls back to the keyboard, nothing pauses');
  const g5 = gamepad(5); padStub([g4, g5]); connect(g5); bset(g5, 0, 1); poll(); bset(g5, 0, 0); poll();
  ok(seatOf(1).dev === 'pad' && seatOf(1).pad === 5 && D.two().lost.length === 0, 'one press on the card and he is back in seat 1');
  M().phase = 'play';
  // a pad pressed on the team screen (the join screen hidden, nobody lost) claims nothing
  D.padGone(5); if (M().paused) D.resume(); D.twoRelease(0); D.padGone(4); D.resetSeats(); D.setMode('menu'); $('s-join').hidden = true;
  const g6 = gamepad(6); padStub([g6]); connect(g6); bset(g6, 0, 1); poll(); bset(g6, 0, 0); poll();
  ok(seatOf(0).dev === 'kb' && seatOf(1).dev === 'kb' && D.pads().get(6).owner == null, 'a pad pressed away from the join screen with no seat lost stays unowned');
  $('s-join').hidden = false; D.padGone(6); padStub([]);
  // a stick held through a close-up the player doesn't own reads live when it hands back
  menu(); D.resetSeats(); padStub([g0, g1]); connect(g0); connect(g1); bset(g0, 0, 1); poll(); bset(g0, 0, 0); poll(); bset(g1, 0, 1); poll(); bset(g1, 0, 0); poll();
  T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'live', humans:[true, true], levels:[1, 1] }); D.setMode('match'); clearSlots(); clearEdges();
  g0.axes[0] = 1; g1.axes[0] = -1; poll(); ok(inputs[0].jx === 1 && inputs[1].jx === -1 && inputs[1].padStick, 'both sticks held');
  reseed(9); D.stage('past', 0); T.update(STEP); let c = M().cut;
  ok(c && c.kind === 'past' && inputs[1].latch && inputs[1].jx === 0, 'Player 1\'s Get Past: Player 2\'s held stick is latched at the cut-in');
  { let n = 0; while (M().cut === c && !c.res && c.t < c.centre && n++ < 600) { poll(); T.update(STEP); } inputs[0].flick = c.open; T.update(STEP); n = 0; while (M().phase === 'cut' && n++ < 600) { poll(); T.update(STEP); } }
  poll(); ok(M().phase !== 'cut' && !inputs[1].latch && inputs[1].jx === -1 && !inputs[0].latch, `after the duel Player 2's still-held stick reads live again (jx ${inputs[1].jx}, latch ${inputs[1].latch})`);
  K.stageDrop({ x:85, y:35 }, [], 1); inputs[1].bPressed = true; inputs[1].bDown = true;
  for (let i = 0; i < K.holdSteps() + 2 && M().phase !== 'cut'; i++) T.update(STEP);
  ok(M().cut && M().cut.g.type === 'drop' && inputs[0].latch, 'Player 2\'s drop goal latches Player 1\'s held stick');
  inputs[1].bDown = false; { let n = 0; while (M().phase === 'cut' && n++ < 600) { bot(1); T.update(STEP); } }
  poll(); ok(M().phase !== 'cut' && !inputs[0].latch && inputs[0].jx === 1, `and it reads live again after the drop (jx ${inputs[0].jx})`);
  D.padGone(0); D.padGone(1); if (M().paused) D.resume(); padStub([]); D.setTwo(false);
  // one player: a stick held through a CPU conversion reads live after it
  fresh({ headless:false, duels:'off' }); clearSlots(); clearEdges(); padStub([g0]); connect(g0); g0.axes[0] = 1; poll(); ok(inputs[0].jx === 1, 'one player, stick held');
  D.goalKick(1, 21, 35, 'conversion'); ok(M().cut && M().cut.g.watch && inputs[0].latch, 'a CPU conversion\'s watch cut latches it');
  { let n = 0; while (M().phase === 'cut' && n++ < 900) { poll(); T.update(STEP); } }
  poll(); ok(M().phase !== 'cut' && !inputs[0].latch && inputs[0].jx === 1, `and it reads live after the kick (jx ${inputs[0].jx})`);
  g0.axes[0] = 0; poll(); D.padGone(0); padStub([]); if (M().paused) D.resume();
  D.setMode('menu');
}
done('N cards and pads');

// T. the tutorial's hold in two player (2026-10-17): while the owner's first-time card is up only his stick is re-centred (as in the grace),
// so a chooser who pushes during the card and holds through Play is read the same on a pad as on keys. Re-anchoring every slot latched
// the chooser's pad stick, and his push was lost on a pad but kept on keys. Player 2 owns his first Key Pass; Player 1 (seat 0) chooses
begin('tutorial hold');
{
  const run = (dev, tutorial) => {
    D.settings().hints = true; D.settings().twoHints = [true, true]; D.settings().tut = tutorial ? [] : D.TUT_IDS.slice();
    D.setTwo(true); menu(); D.resetSeats(); for (const k of [...D.pads().keys()]) D.padGone(k); padStub([]); clearSlots(); clearEdges();
    let gp = null;
    if (dev === 'pad') { gp = gamepad(0); padStub([gp]); connect(gp); bset(gp, 0, 1); poll(); bset(gp, 0, 0); poll(); }   // the pad claims seat 0 on the join screen
    T.newMatch(0, 1, { halfLen:240, humans:[true, true], levels:[1, 1], headless:false, duels:'live' }); D.setMode('match'); clearSlots(); clearEdges();
    D.stage('pass', 1); T.update(STEP);
    const c = M().cut, away = -c.side;                       // a rush, away from the runner, in the owner's frame
    const push = () => { if (gp) { gp.axes[0] = away; poll(); } else { const code = away > 0 ? 'KeyD' : 'KeyA'; if (!inputs[0].keys.has(code)) down(code); } };
    const step = () => { if (gp) poll(); T.update(STEP); };
    const shown = !!D.tut(), seat0 = seatOf(0).dev;
    if (tutorial) { for (let i = 0; i < 20; i++) step(); push(); for (let i = 0; i < 30; i++) step(); inputs[1].aPressed = true; step(); inputs[1].aPressed = true; step(); }   // the card holds the scene; the chooser pushes while he waits; Player 2: Next, then Play
    else { for (let i = 0; i < 20; i++) step(); push(); }
    let n = 0; while (!c.locked && n++ < 600) { push(); step(); }
    const r = { dev, tutorial, seat0, shown, tut:!!D.tut(), locked:c.locked, taken:c.taken, drift:c.drift, latch:inputs[0].latch };
    while (M().phase === 'cut' && n++ < 2000) step();
    if (gp) { gp.axes[0] = 0; poll(); } up('KeyA'); up('KeyD'); clearSlots(); clearEdges(); D.setMode('menu'); for (const k of [...D.pads().keys()]) D.padGone(k); padStub([]);
    return r;
  };
  const R = {}; for (const dev of ['kb', 'pad']) for (const tut of [false, true]) R[dev + (tut ? '+tut' : '')] = run(dev, tut);
  ok(R.pad.seat0 === 'pad' && R['pad+tut'].seat0 === 'pad' && R.kb.seat0 === 'kb', 'the chooser is on a pad in the pad runs and on the keyboard in the key runs');
  ok(R['kb+tut'].shown && R['pad+tut'].shown && !R.kb.shown && !R.pad.shown && Object.values(R).every(r => !r.tut && r.locked), 'Player 2\'s first Key Pass shows his tutorial card (never once seen), and every duel reaches its lock with the card gone');
  ok(Object.values(R).every(r => r.taken), `the chooser's push is read on every device, with and without the card (${Object.entries(R).map(([k, r]) => k + ' ' + (r.taken ? 'taken' : 'lost')).join(', ')})`);
  ok(R['pad+tut'].drift === R.pad.drift && R['kb+tut'].drift === R.kb.drift && R.pad.drift === R.kb.drift && !R['pad+tut'].latch, `and the same choice lands: a rush (drift ${R['pad+tut'].drift} / ${R.pad.drift} on a pad, ${R['kb+tut'].drift} / ${R.kb.drift} on keys); the card never latched the chooser's pad (${R['pad+tut'].latch})`);
  D.settings().tut = D.TUT_IDS.slice(); D.setTwo(false);
}
done('T tutorial hold');

// O. the two-player levels, quotas and aids: an Easy player against a Hard one gets the wider windows, the longer lock, the path aid on
// his kicks, the slower-draining meter and the set-piece assists; the AI men tackle his carrier at his own rate; per-owner quotas
// (ceil(halfLen/180) each, never the same kind twice running per owner, the Last Play bonus shared); the fails and first-duel aids
// per owner (the tutorial's per-device memory is one player's aid); M.di forced to 2 changes nothing a player faces
begin('handicap');
{
  const S = T.sides, K = T.kick, C = T.contact;
  const pairL = (levels, o = {}) => { T.newMatch(1, 1, { halfLen:240, diff:1, headless:true, duels:'live', humans:[true, true], levels, ...o }); D.setMode('match'); D.setTwo(true); clearSlots(); clearEdges(); };
  const winOf = (kind, own, levels) => { pairL(levels); reseed(7); D.stage(kind, own); T.update(STEP); const c = M().cut; S.side(0).duel.first = S.side(1).duel.first = false; return c; };
  const MODS = { past:['pace', 'power'], pass:['handling', 'pace'], tackle:['power', 'pace'], block:['handling', 'handling'] };
  const edge = (kind, c) => Math.max(-0.036, Math.min(0.036, 0.012*(M().nat[c.U.team][MODS[kind][0]] - M().nat[c.O.team][MODS[kind][1]])));   // the rating edge, as startDuel adds it
  for (const kind of ['past', 'pass', 'tackle']) {
    const DU = { past:[0.30, 0.23, 0.17], pass:[0.32, 0.24, 0.18], tackle:[0.30, 0.23, 0.17] }[kind];
    const c0 = winOf(kind, 0, [0, 2]), c1 = winOf(kind, 1, [0, 2]);
    ok(near(c0.wid, DU[0] + 0.08 + edge(kind, c0), 1e-9) && near(c1.wid, DU[2] + 0.08 + edge(kind, c1), 1e-9), `${kind}: Player 1 on Easy gets win[0] (${c0.wid.toFixed(3)}), Player 2 on Hard win[2] (${c1.wid.toFixed(3)}), each with his own first-duel aid`);
    ok(near(c0.lock, c0.win[0] - (c0.stepDir ? 0.10 : 0) - D.DUEL_LOCK[0], 1e-9) && near(c1.lock, c1.win[0] - (c1.stepDir ? 0.10 : 0) - D.DUEL_LOCK[2], 1e-9), `${kind}: the lock lead is the timer's: ${D.DUEL_LOCK[0]} for Easy, ${D.DUEL_LOCK[2]} for Hard`);
    const e0 = winOf(kind, 0, [0, 0]), e1 = winOf(kind, 1, [0, 0]), h0 = winOf(kind, 0, [2, 2]), h1 = winOf(kind, 1, [2, 2]);
    ok(near(e0.wid, e1.wid, 1e-9) && near(h0.wid, h1.wid, 1e-9) && near(e0.lock - e0.win[0], e1.lock - e1.win[0], 1e-9), `${kind}: Easy v Easy and Hard v Hard give identical windows and leads on both sides`);
  }
  // goal aids: Easy, or each player's first kick of the match
  pairL([0, 2]);
  ok(K.makeGoal(0, 88, 35, 'penalty', null).aid === 'path' && K.makeGoal(1, 32, 35, 'penalty', null).aid === 'path', 'Easy v Hard: Player 1 gets the path (Easy); Player 2 gets it once, his first kick');
  S.side(1).kickFirst = false;
  ok(K.makeGoal(1, 32, 35, 'penalty', null).aid === 'line' && K.makeGoal(0, 88, 35, 'penalty', null).aid === 'path', 'after it, Player 2 gets the line; Player 1 keeps the path on Easy');
  pairL([1, 1]); D.goalKick(1, 21, 35, 'conversion');
  ok(M().cut.g.aid === 'path' && S.side(1).kickFirst, 'a Normal player\'s first kick of the match has the path');
  { let n = 0; while (M().phase === 'cut' && n++ < 600) { bot(1); T.update(STEP); } }
  ok(!S.side(1).kickFirst && S.side(0).kickFirst, 'the strike clears his own kickFirst only');
  D.goalKick(1, 21, 35, 'conversion'); ok(M().cut.g.aid === 'line', 'his second kick has the line');
  { let n = 0; while (M().phase === 'cut' && n++ < 600) { bot(1); T.update(STEP); } }
  // the meter refills at each player's own rate
  pairL([0, 2], { duels:'off' }); M().spr[0].m = 0; M().spr[1].m = 0; K.stageDrop({ x:60, y:35 }, [], 0); steps(60);
  ok(near(M().spr[0].m, 1/C.SPRINT.refill[0], 1e-6) && near(M().spr[1].m, 1/C.SPRINT.refill[2], 1e-6), `a second's refill: Easy ${M().spr[0].m.toFixed(3)} v Hard ${M().spr[1].m.toFixed(3)}`);
  // the set-piece assists: an Easy pack's base shove and an Easy jumper's reach, the two-player throw edge of 0.10
  T.newMatch(1, 1, { halfLen:240, diff:1, headless:false, duels:'off', humans:[true, true], levels:[0, 2] }); D.setMode('match'); clearSlots(); clearEdges();
  steps(120); T.scrum(1, 60, 35, ''); { let g = 0; while (M().phase !== 'cut' && g++ < 400) T.update(STEP); }
  { const c = M().cut; ok(c && c.kind === 'scrum' && near(c.base[0], (M().nat[0].power - 3)*0.06 + D.SCRUM_LEVEL[0], 1e-9) && near(c.base[1], (M().nat[1].power - 3)*0.06 + 0.08, 1e-9), `an Easy pack shoves +${D.SCRUM_LEVEL[0]} (${c.base[0].toFixed(3)} v the feeder's ${c.base[1].toFixed(3)})`);
    let g = 0; while (M().phase === 'cut' && g++ < 4000) T.update(STEP); }
  // the lineout's reach: measured over 150 throws each way (the draws are the same gauss() calls; only the constants differ)
  { const reachOf = (humans, levels, team, n) => { T.newMatch(1, 1, { halfLen:240, diff:1, headless:false, duels:'off', humans, levels }); D.setMode('match'); steps(120); const r = [0, 0]; for (let i = 0; i < n; i++) { T.lineout(team, 60, 5, ''); let g = 0; while (M().phase !== 'cut' && g++ < 400) T.update(STEP); const c = M().cut; r[0] += c.reach[0]; r[1] += c.reach[1]; g = 0; while (M().phase === 'cut' && g++ < 4000) T.update(STEP); if (M().phase !== 'play') { M().phase = 'play'; M().set = null; } } return r.map(v => v/n); };
    reseed(5); const two1 = reachOf([true, true], [0, 2], 1, 150), two0 = reachOf([true, true], [0, 2], 0, 150), one1 = reachOf([true, false], null, 1, 150);
    ok(near(two1[1] - two1[0], 0.10 - D.LINE_LEVEL[0], 0.03) && near(two0[0] - two0[1], 0.10 + D.LINE_LEVEL[0], 0.03) && near(one1[1] - one1[0], 0.06, 0.03), `the throwing side reaches +0.10 in two player (one player +0.06) and an Easy jumper +${D.LINE_LEVEL[0]}: team 1 throwing ${(two1[1] - two1[0]).toFixed(3)}, team 0 throwing ${(two0[0] - two0[1]).toFixed(3)}, one player ${(one1[1] - one1[0]).toFixed(3)}`); }
  // quotas per owner: ceil(halfLen/180) each over the half, never the same kind twice running per owner, the Last Play bonus shared
  pairL([1, 1]);
  let bonus = [false, false], hooter = false;
  const stage = (kind, own) => { D.stage(kind, own); M().dclock = 1000 + 100*M().stats.duels; M().hooter = hooter; M().duelLog.bonus = bonus; T.update(STEP); return M().phase === 'cut' ? M().cut : null; };   // (stageDuel resets the hooter and the log: the shared bonus is carried across)
  const skip = () => { const c = M().cut; if (!c) return; c.res = 'late'; D.applyDuel(c); M().cut = null; M().phase = 'play'; };
  const fail = c => { let n = 0; while (M().cut === c && !c.res && n++ < 600) T.update(STEP); c.hold = 0; n = 0; while (M().phase === 'cut' && n++ < 100) T.update(STEP); };   // the duel run out with no press: Too Late, settled through the real path
  ok(M().duelLog.half[0] === 0 && Math.ceil(240/180) === 2, '4-minute halves: two duels each a half');
  let c = stage('past', 0); ok(c && c.own === 0, 'Player 1 takes a Get Past'); skip();
  c = stage('past', 0); ok(c === null, 'never the same kind twice running for him');
  c = stage('past', 1); ok(c && c.own === 1, 'but Player 2 can take a Get Past straight after'); skip();
  c = stage('tackle', 0); ok(c && c.own === 0 && S.side(0).duel.half[0] === 2, 'Player 1\'s second duel of the half'); skip();
  c = stage('pass', 0); ok(c === null && S.side(0).duel.half[0] === 2, 'his third is refused: his quota is used');
  c = stage('tackle', 1); ok(c && c.own === 1 && S.side(1).duel.half[0] === 2, 'Player 2 still has one'); skip();
  c = stage('pass', 1); ok(c === null, 'and no more');
  hooter = true; c = stage('pass', 0); ok(c && c.how === 'bonus' && M().duelLog.bonus[0], 'the Last Play bonus goes to the first to qualify'); skip();
  c = stage('pass', 1); ok(c === null, 'and is shared: Player 2 gets none'); hooter = false; bonus = [false, false];
  // the aids per owner
  pairL([1, 1]);
  c = stage('past', 0); ok(c && near(c.wid, 0.23 + 0.08 + edge('past', c), 1e-9) && !S.side(0).duel.first && S.side(1).duel.first, 'Player 1\'s first duel gets +0.08, and only his flag clears'); skip();
  c = stage('tackle', 1); ok(c && near(c.wid, 0.23 + 0.08 + edge('tackle', c), 1e-9), 'Player 2\'s first duel gets his +0.08'); skip();
  c = stage('tackle', 1); ok(c === null, '(the same kind twice running is refused him)'); c = stage('pass', 1); ok(c && near(c.wid, 0.24 + edge('pass', c), 1e-9), 'his second duel has no first-duel aid'); skip();
  pairL([1, 1]); S.side(0).duel.first = S.side(1).duel.first = false;
  for (let i = 0; i < 2; i++) { c = stage(i ? 'tackle' : 'past', 0); fail(c); }
  ok(S.side(0).duel.fails === 2 && S.side(1).duel.fails === 0, 'two duels run out count against their owner only');
  M().half = 2; c = stage('pass', 1); ok(c && near(c.wid, 0.24 + edge('pass', c), 1e-9), 'Player 2\'s next duel gets no catch-up aid for Player 1\'s failures'); skip();
  c = stage('past', 0); ok(c && near(c.wid, 0.23 + 0.04 + edge('past', c), 1e-9), 'Player 1\'s does'); skip();
  // an AI man crossing the other player's pass intercepts at the passer's level (DIFF.cpuIntercept: 0.10 Easy, 0.25 Hard), as the CPU does against a human
  { const rate = (levels, n) => { let hits = 0; for (let i = 0; i < n; i++) { reseed(400 + i); pairL(levels, { duels:'off' }); K.stageDrop({ x:60, y:35 }, [{ x:70, y:35 }], 0);
        const P = M().players, c = S.ctrlOf(0), r = P.find(p => p.team === 0 && p !== c), q = P.find(p => p.team === 1 && p !== S.ctrlOf(1));
        for (const p of P) if (p.team === 0 && p !== c && p !== r) { p.x = 20; p.y = 5 + p.n*5; }   // one receiver, square of the carrier; one AI opponent on the line, standing
        r.x = 60; r.y = 45; r.vx = r.vy = 0; q.x = 60; q.y = 40; q.vx = q.vy = 0; q.down = 0; c.hold = 1;
        inputs[0].aPressed = true; T.update(STEP);
        if (!(M().ball.state === 'air' && M().ball.f.kind === 'pass')) continue;
        let k = 0; while (M().ball.state === 'air' && k++ < 120) T.update(STEP);
        if (M().stats.intercepts) hits++; } return hits/n; };
    const easy = rate([0, 1], 150), hard = rate([2, 1], 150);
    ok(near(easy, 0.10, 0.07) && near(hard, 0.25, 0.08) && hard > easy + 0.06, `an AI interceptor reads the passer's level: ${(100*easy).toFixed(0)}% against an Easy passer, ${(100*hard).toFixed(0)}% against a Hard one`); }
  // M.di forced to 2 changes nothing a player faces
  pairL([0, 0]); M().di = 2; M().diff = T.teams.cleanTeam ? M().diff : M().diff;
  { const g = K.makeGoal(0, 88, 35, 'penalty', null); const p0 = M().players[0], p7 = M().players[7]; p0.boost = p7.boost = 0;
    const q = M().players.find(p => p.team === 1), cc = M().players.find(p => p.team === 0); q.x = 60; q.y = 35; cc.x = 59; cc.y = 35; cc.side = -1; cc.vx = cc.vy = 0;   // the tackler a metre in front of the carrier
    ok(g.di === 0 && g.aid === 'path' && near(C.tackleChance(q, cc, 'ai'), D.TWO.tackle[0] + (M().nat[1].power - M().nat[0].power)*0.05, 1e-9) && near(C.maxSpeed(p0), 7.6 + M().nat[0].pace*0.25, 1e-9), 'with M.di forced to 2 the kick, the aid, the tackle rate and the speed are still the Easy player\'s'); }
  D.setTwo(false); D.setMode('menu');
}
done('O handicap');

// P. render smoke: two player drawn through open play, a scrum, a lineout, every duel with each side as timer, both teams' goal kicks and
// a drop goal, at 1024x600, 1280x720, 1440x900 and 1920x1080: no non-finite number reaches the canvas, both seat tags and rings are drawn
// on the pitch, each close-up carries its PLAYER cues in the seat colours and its seat tags over the men, the duel's live ring is stroked
// in the owner's colour, the scrum bar fills in the gaining side's colour and clears the bottom bar
begin('render');
{
  const S = T.sides, K = T.kick;
  const pairR = () => { T.newMatch(0, 1, { halfLen:240, diff:1, headless:false, duels:'live', humans:[true, true], levels:[1, 1] }); D.setMode('match'); D.setTwo(true); clearSlots(); clearEdges(); M().headless = true; };
  const spy = () => {
    const log = { bad:0, texts:[], fills:[], strokes:[], rects:[] }; let fill = '', stroke = '';
    globalThis.__ctxSpy = (name, args) => {
      for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) log.bad++;
      if (name === 'fillStyle') fill = args[0]; else if (name === 'strokeStyle') stroke = args[0];
      else if (name === 'fillText') log.texts.push([String(args[0]), fill]); else if (name === 'stroke') log.strokes.push(stroke); else if (name === 'fillRect') log.rects.push([args, fill]);
    };
    return log;
  };
  const off = () => { globalThis.__ctxSpy = null; };
  for (const [W, H] of [[1024, 600], [1280, 720], [1440, 900], [1920, 1080]]) {
    const at = `${W}x${H}`;
    pairR(); D.view(W, H); K.stageDrop({ x:60, y:35 }, [{ x:63, y:35 }], 0);
    let log = spy(); for (let i = 0; i < 30; i++) { bot(0); bot(1); T.update(STEP); D.render(STEP); } D.updateHud(); off();
    ok(log.bad === 0 && log.texts.some(([t, f]) => t === '1' && f === '#1c1500') && log.texts.some(([t, f]) => t === '2' && f === '#2a0a22'), `${at}: open play draws finite numbers and both seat tags`);
    // a scrum: the cues, the tags over both packs, the bar in the gaining side's colour, and an Early tag at the pack that pressed
    M().headless = false; steps(90); T.scrum(0, 60, 35, ''); { let g = 0; while (M().phase !== 'cut' && g++ < 400) T.update(STEP); } M().headless = true;
    { const c = M().cut; ok(c && c.kind === 'scrum', `${at}: a scrum`);
      inputs[1].aPressed = true; T.update(STEP);          // Player 2 presses before Set: Early
      c.pos = 0.8; log = spy(); D.drawCut(); off();
      const barW = W*0.38;
      ok(log.bad === 0 && log.texts.some(([t, f]) => t === 'PLAYER 1 · F · PUSH' && f === '#ffcf3d') && log.texts.some(([t, f]) => t === 'PLAYER 2 · / · PUSH' && f === '#ff5fd2'), `${at}: the scrum cues name each player's key in his colour`);
      ok(log.texts.filter(([t, f]) => t === '1' && f === '#1c1500').length >= 1 && log.texts.filter(([t, f]) => t === '2' && f === '#2a0a22').length >= 1 && log.texts.some(([t, f]) => t === 'EARLY' && f === '#ff5fd2'), `${at}: a seat tag over each pack, and Player 2's Early as a pink tag at his pack`);
      ok(log.rects.some(([a, f]) => f === '#ffcf3d' && near(a[0], W*0.5, 1e-6) && a[2] > 0 && a[2] <= barW/2 + 1e-6), `${at}: Player 1 gaining fills the bar gold from the centre, inside W·0.38`);
      c.pos = -0.8; log = spy(); D.drawCut(); off();
      ok(log.rects.some(([a, f]) => f === '#ff5fd2' && a[0] < W*0.5 && near(a[0] + a[2], W*0.5, 1e-6)), `${at}: Player 2 gaining fills it pink to the left`);
      c.pos = 0; let g = 0; while (M().phase === 'cut' && g++ < 4000) T.update(STEP); }
    // a lineout: both jumpers tagged
    M().headless = false; T.lineout(1, 60, 5, ''); { let g = 0; while (M().phase !== 'cut' && g++ < 400) T.update(STEP); } M().headless = true;
    { const c = M().cut; steps(20); log = spy(); D.drawCut(); off();
      ok(c && c.kind === 'lineout' && log.bad === 0 && log.texts.some(([t]) => t === 'PLAYER 1 · F · JUMP') && log.texts.some(([t]) => t === 'PLAYER 2 · / · JUMP') && log.texts.some(([t, f]) => t === '1' && f === '#1c1500') && log.texts.some(([t, f]) => t === '2' && f === '#2a0a22'), `${at}: the lineout cues and a tag over each jumper`);
      let g = 0; while (M().phase === 'cut' && g++ < 4000) T.update(STEP); }
    // every duel with each side as timer: the cues, the tags over U and O, the live ring in the owner's colour
    for (const own of [0, 1]) for (const kind of ['past', 'pass', 'tackle', 'block']) {
      pairR(); D.view(W, H); reseed(3 + kind.length); if (kind === 'block') { D.stage('block', own); T.forceDuel('block', own); } else { D.stage(kind, own); T.update(STEP); }
      const c = M().cut; if (!(c && c.kind === kind)) { ok(false, `${at}: ${kind} for owner ${own} did not stage`); continue; }
      let n = 0; while (c.t < Math.min(0.4, c.lock - 3*STEP) && n++ < 60) T.update(STEP);   // before the chooser's lock, while both cues show
      log = spy(); D.drawCut(); off();
      const col = own === 1 ? '#ff5fd2' : '#ffcf3d';
      ok(log.bad === 0 && log.texts.some(([t, f]) => t.startsWith('PLAYER ' + (own + 1) + ' · ') && f === col) && log.texts.some(([t, f]) => t.startsWith('PLAYER ' + (2 - own) + ' · ') && f === (own === 1 ? '#ffcf3d' : '#ff5fd2')), `${at}: ${kind}, owner ${own}: both players' cues, each in his colour`);
      ok(log.texts.some(([t, f]) => t === '1' && f === '#1c1500') && log.texts.some(([t, f]) => t === '2' && f === '#2a0a22'), `${at}: ${kind}, owner ${own}: the tags over U and O`);
      n = 0; while (!(c.t >= c.win[0] && c.t <= c.win[1]) && n++ < 200) T.update(STEP);
      log = spy(); D.drawCut(); off();
      ok(log.strokes.includes(col), `${at}: ${kind}, owner ${own}: the live ring is stroked in the owner's colour`);
    }
    // both teams' goal kicks and a drop goal: the kicker's cue and tag
    for (const team of [0, 1]) {
      pairR(); D.view(W, H); D.goalKick(team, team ? 21 : 99, 35, 'conversion'); steps(20);
      log = spy(); D.drawCut(); off();
      const col = team === 1 ? '#ff5fd2' : '#ffcf3d', key = team === 1 ? '/' : 'F';
      ok(log.bad === 0 && log.texts.some(([t, f]) => t === `PLAYER ${team + 1} · HOLD ${key} · KICK` && f === col) && log.texts.some(([t, f]) => t === String(team + 1) && f === (team ? '#2a0a22' : '#1c1500')), `${at}: team ${team}'s conversion: the kicker's cue and tag`);
      let n = 0; while (M().phase === 'cut' && n++ < 600) { bot(team); T.update(STEP); }
    }
    pairR(); D.view(W, H); K.stageDrop({ x:85, y:35 }, [], 0); inputs[0].bPressed = true; inputs[0].bDown = true;
    for (let i = 0; i < K.holdSteps() + 2 && M().phase !== 'cut'; i++) T.update(STEP);
    steps(5); log = spy(); D.drawCut(); off();
    ok(M().cut && M().cut.g.type === 'drop' && log.bad === 0 && log.texts.some(([t, f]) => t === 'PLAYER 1 · G · DROP GOAL' && f === '#ffcf3d'), `${at}: a drop goal's cue`);
    inputs[0].bDown = false; { let n = 0; while (M().phase === 'cut' && n++ < 600) { bot(0); T.update(STEP); } }
  }
  // one player at a phone's size draws no tag, no cue and no seat tag in a close-up
  fresh({ duels:'off' }); D.setTwo(false); D.view(568, 320); M().headless = false; steps(90); T.scrum(0, 60, 35, ''); { let g = 0; while (M().phase !== 'cut' && g++ < 400) T.update(STEP); } M().headless = true;
  { const log = spy(); D.drawCut(); off(); ok(!log.texts.some(([t]) => /^PLAYER/.test(t) || t === '1' || t === '2'), 'one player at 568x320: no player cues and no seat tags in the scrum'); let g = 0; while (M().phase === 'cut' && g++ < 4000) T.update(STEP); }
  D.setMode('menu');
}
done('P render');

// Q. isolation: Player 1's conversion ignores Player 2's slot until the verdict; in a Get Past the timer's B and the chooser's A do nothing
// to the other's role; a scrum reads each pack from its own slot only; Player 2's keys never move seat 0's man
begin('isolation');
{
  const S = T.sides, K = T.kick;
  const pairI = () => { T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'live', humans:[true, true], levels:[1, 1] }); D.setMode('match'); D.setTwo(true); clearSlots(); clearEdges(); };
  pairI(); D.goalKick(0, 99, 35, 'conversion'); steps(20);
  { const g = M().cut.g, a0 = g.aim; inputs[1].aPressed = true; inputs[1].aDown = true; inputs[1].jx = 1; steps(30);
    ok(g.stage === 'aim' && near(g.aim, a0, 1e-9), 'Player 1\'s conversion: Player 2\'s A and stick change neither the stage nor the aim'); inputs[1].aDown = false; inputs[1].jx = 0; }
  { let n = 0; while (M().phase === 'cut' && !M().cut.after && n++ < 600) { bot(0); T.update(STEP); } const c = M().cut; const hold0 = c.hold;
    inputs[1].aPressed = true; T.update(STEP); ok(c.hold > 0 && c.hold <= hold0, 'before the verdict + 0.25s Player 2 can\'t skip');
    n = 0; while (M().cut === c && c.t < c.skipAt && n++ < 60) T.update(STEP); inputs[1].aPressed = true; T.update(STEP); ok(c.hold === 0, 'after it either player skips the replay');
    n = 0; while (M().phase === 'cut' && n++ < 600) T.update(STEP); }
  pairI(); reseed(12); D.stage('past', 0); T.update(STEP);
  { const c = M().cut; let n = 0; while (c.t < 0.5 && n++ < 60) T.update(STEP); const o = c.open, w = c.win.slice();
    inputs[0].bPressed = true; T.update(STEP); ok(!c.res && c.open === o && c.win[0] === w[0], 'Get Past: the timer\'s B does nothing to the chooser');
    inputs[1].aPressed = true; T.update(STEP); ok(!c.res && c.judged == null, 'and the chooser\'s A does nothing to the timer');
    n = 0; while (M().phase === 'cut' && n++ < 600) { bot(0); T.update(STEP); } }
  T.newMatch(0, 1, { halfLen:240, diff:1, headless:false, duels:'off', humans:[true, true], levels:[1, 1] }); D.setMode('match'); D.setTwo(true); clearSlots(); clearEdges();
  steps(120); T.scrum(0, 60, 35, ''); { let g = 0; while (M().phase !== 'cut' && g++ < 400) T.update(STEP); }
  { const c = M().cut; let n = 0; while (c.t < 1.5 && n++ < 120) T.update(STEP);
    down('KeyD'); down('KeyF'); T.update(STEP); ok(c.taps[0] === 1 && c.taps[1] === 0 && c.rate[1] === 0, 'a scrum: Player 1\'s keys push his pack only'); up('KeyF'); up('KeyD');
    down('ArrowLeft'); down('Slash'); T.update(STEP); ok(c.taps[1] === 1 && c.taps[0] === 1, 'and Player 2\'s his'); up('Slash'); up('ArrowLeft');
    let g = 0; while (M().phase === 'cut' && g++ < 4000) T.update(STEP); }
  // the stick plays no part in the shove (2026-10-17): both seats tap on the same steps, Player 2 holding his forward key (ArrowLeft) and Player 1
  // no direction key, then Player 1 holding D. Each pack's rate is the same, and the shove difference is the packs' base difference alone
  for (const p1key of [null, 'KeyD']) {
    T.newMatch(0, 1, { halfLen:240, diff:1, headless:false, duels:'off', humans:[true, true], levels:[1, 1] }); D.setMode('match'); D.setTwo(true); clearSlots(); clearEdges();
    steps(120); T.scrum(0, 60, 35, ''); { let g = 0; while (M().phase !== 'cut' && g++ < 400) T.update(STEP); }
    const c = M().cut; let n = 0; while (c.t < 1.5 && n++ < 120) T.update(STEP);
    down('ArrowLeft'); if (p1key) down(p1key);
    let sameRate = true, baseOnly = true, taps = 0, engaged = 0;
    for (let k = 0; k < 150 && M().cut === c && !c.result; k++) {
      if (k % 9 === 0) { down('KeyF'); down('Slash'); taps++; } else if (k % 9 === 1) { up('KeyF'); up('Slash'); }
      T.update(STEP);
      if (!c.engaged || c.result) continue;
      engaged++;
      if (c.rate[0] !== c.rate[1]) sameRate = false;
      if (!near(c.mine - c.theirs, c.base[0] - c.base[1], 1e-9)) baseOnly = false;
    }
    up('ArrowLeft'); if (p1key) up(p1key); up('KeyF'); up('Slash');
    ok(taps >= 10 && engaged >= 100 && sameRate && baseOnly, `a scrum, Player 1 ${p1key ? 'holding D' : 'with no direction key'} v Player 2 holding ArrowLeft: equal taps give equal rates (${sameRate}) and a shove difference of the bases alone (${baseOnly}) over ${engaged} steps`);
    let g = 0; while (M().phase === 'cut' && g++ < 4000) T.update(STEP);
  }
  pairI(); K.stageDrop({ x:60, y:35 }, [], 0);
  { const p0 = S.ctrlOf(0), p1 = S.ctrlOf(1), y0 = p0.y, y1 = p1.y; down('ArrowUp'); steps(20); up('ArrowUp');
    ok(p1.y < y1 - 0.5 && Math.abs(p0.y - y0) < 0.5, `Player 2's arrows move his man, not Player 1's (${(p1.y - y1).toFixed(2)} v ${(p0.y - y0).toFixed(2)})`); }
  D.setTwo(false); D.setMode('menu');
}
done('Q isolation');

// M. symmetry and balance. Two copies of the scripted player, each on his own seat, every close-up head to head through the real input
// paths (the chooser's hand by keys on one seat and the stick on the other, the owner with a reaction model, scrumBot and lineBot at
// the set pieces). A paired design: every seed is played twice with the teams the other way round, so a bias toward a seat shows as a
// paired difference. The default sample is 100 pairs at 2-minute halves; `--sym N` plays N pairs at the spec's 4-minute halves and
// adds the away-side comparison, the AI v AI share and the Easy v Hard handicap runs
begin('symmetry');
{
  const ai = process.argv.indexOf('--sym'), full = ai >= 0, N = full ? +(process.argv[ai + 1] || 400) : 100, HALF = full ? 240 : 120;
  const S = T.sides;
  const drive = (side, c, dev) => {
    if (M().phase === 'cut' && c) {
      if (c.duel) { if (c.own === side) ownerBot(c); else chooserBot(c, { dev }); return; }
      if (c.kind === 'scrum') return scrumBot(side);
      if (c.kind === 'lineout') return lineBot(side);
    }
    bot(side);
  };
  const play = (a, b, levels, seed) => {
    reseed(seed);
    T.newMatch(a, b, { halfLen:HALF, diff:1, headless:false, duels:'live', humans:[true, true], levels }); D.setMode('match'); D.setTwo(true); D.resetSeats(); clearSlots(); clearEdges();   // not headless: the scrums and lineouts cut in and are contested, the cards are pressed below
    const m = M(), r = { duels:[0, 0], won:[0, 0], frozen:0, scrumKeep:[0, 0], scrums:[0, 0], lineKeep:[0, 0], lines:[0, 0], n:0 };
    const devs = seed % 2 ? ['keys', 'stick'] : ['stick', 'keys'];
    let last = null;
    while (!m.over && r.n++ < 400000) {
      if (m.phase === 'menu') { ($('p-goal').disabled ? $('p-touch') : $('p-goal')).click(); continue; }   // the penalty card: Kick at Goal when it is on, as the CPU chooses
      if (m.phase === 'break') { if (m.over) break; $('br-go').click(); continue; }                           // Second Half
      const c = m.cut;
      drive(0, c, devs[0]); drive(1, c, devs[1]); T.update(STEP);
      if (m.phase === 'cut' && c && c.duel) { r.frozen += STEP; if (c.t === STEP) r.duels[c.own]++; }
      if (last && last.duel && (c !== last || last.res)) chooserRelease(last);   // the keys chooser lets go at the verdict (or the next cut), so his man doesn't run sideways into open play
      if (c && c !== last) last = c;
      if (c && c.duel && c.res && !c.counted) { c.counted = true; if (c.good) r.won[c.own]++; }
      if (c && c.kind === 'scrum' && c.result && !c.counted) { c.counted = true; r.scrums[c.feed]++; if (c.result.endsWith(String(c.feed)) || c.result === 'dom' + c.feed) r.scrumKeep[c.feed]++; }
      if (c && c.kind === 'lineout' && c.winner != null && !c.counted) { c.counted = true; r.lines[c.team]++; if (c.winner === c.team) r.lineKeep[c.team]++; }
    }
    chooserRelease(last);
    r.score = m.score.slice(); r.tries = m.tries.slice(); r.gk = [0, 1].map(t => [m.stats.gk.att[t], m.stats.gk.made[t]]);
    return r;
  };
  const sum = (arr, f) => arr.reduce((a, r) => a + f(r), 0);
  // one player's frozen duel time and duels at the same half length, the scripted player against the CPU. The gate (2026-10-17): two player's
  // duels freeze no longer each than one player's (within 15%), and the match no more than 1.8 x one player's. It was 1.6 x a match
  // when a duel froze about 2s; the slow run-in adds the same real time to every duel, and two player has about 1.75 x the duels (an
  // owner's quota each), so the ratio of match totals follows the ratio of counts and no longer says anything about the duels themselves
  let frozen1 = 0, duels1 = 0; const n1f = 12;
  for (let i = 0; i < n1f; i++) { reseed(3000 + i); T.newMatch(i % 6, (i + 1) % 6, { halfLen:HALF, diff:1, headless:true, duels:'live' }); D.setMode('match'); D.setTwo(false); let k = 0; while (!M().over && k++ < 200000) { bot(0); T.update(STEP); if (M().phase === 'cut' && M().cut && M().cut.duel) frozen1 += STEP; } duels1 += M().stats.duels; }
  frozen1 /= n1f; duels1 /= n1f;
  const report = (rows, label) => {
    const n = rows.length, w = [0, 0, 0]; for (const r of rows) w[r.score[0] > r.score[1] ? 0 : r.score[0] < r.score[1] ? 1 : 2]++;
    const share = (w[0] + w[2]/2)/n, se = 0.5/Math.sqrt(n);
    const tries = [0, 1].map(t => sum(rows, r => r.tries[t])/n), pts = [0, 1].map(t => sum(rows, r => r.score[t])/n);
    const gk = [0, 1].map(t => { const a = sum(rows, r => r.gk[t][0]), m = sum(rows, r => r.gk[t][1]); return a ? 100*m/a : 0; });
    const du = [0, 1].map(t => sum(rows, r => r.duels[t])/n), dw = [0, 1].map(t => { const d = sum(rows, r => r.duels[t]), wn = sum(rows, r => r.won[t]); return d ? 100*wn/d : 0; });
    const sk = [0, 1].map(t => { const s = sum(rows, r => r.scrums[t]), k = sum(rows, r => r.scrumKeep[t]); return s ? 100*k/s : 0; }), lk = [0, 1].map(t => { const s = sum(rows, r => r.lines[t]), k = sum(rows, r => r.lineKeep[t]); return s ? 100*k/s : 0; });
    const frozen = sum(rows, r => r.frozen)/n;
    console.log(`${label}: ${n} matches, ${HALF/60}-minute halves, Normal v Normal, duels live head to head, set pieces contested: Player 1 ${w[0]} wins, Player 2 ${w[1]}, ${w[2]} draws; share ${(100*share).toFixed(1)}% (se ${(100*se).toFixed(1)}); points ${pts.map(v => v.toFixed(1)).join(' v ')}; tries ${tries.map(v => v.toFixed(2)).join(' v ')} (${(tries[0] + tries[1]).toFixed(2)} a match); goal kicks ${gk.map(v => v.toFixed(0) + '%').join(' v ')}; duels owned ${du.map(v => v.toFixed(2)).join(' v ')}, won ${dw.map(v => v.toFixed(0) + '%').join(' v ')}; scrum kept by the feed ${sk.map(v => v.toFixed(0) + '%').join(' v ')}; lineout kept by the throw ${lk.map(v => v.toFixed(0) + '%').join(' v ')}; frozen ${frozen.toFixed(1)}s a match`);
    return { n, share, se, tries, pts, gk, du, dw, sk, lk, frozen };
  };
  // paired: each seed twice, the teams swapped
  const pairs = [[1, 1], [0, 1], [2, 3], [4, 5], [6, 7]].map(([a, b]) => [T.teams.NATIONS[a] || T.teams.CLUBS[a - 6], T.teams.NATIONS[b] || T.teams.CLUBS[b - 6]]);
  const rows = [], diff = [];
  reseed(2024);
  for (let i = 0; i < N; i++) {
    const [a, b] = pairs[i % pairs.length], s = 3000 + i;
    const r1 = play(a, b, [1, 1], s), r2 = play(b, a, [1, 1], s);
    rows.push(r1, r2);
    diff.push((r1.score[0] - r1.score[1]) + (r2.score[0] - r2.score[1]));   // Player 1's margin over the pair, whichever team he had
  }
  const R = report(rows, 'symmetry');
  const md = diff.reduce((a, v) => a + v, 0)/diff.length, sd = Math.sqrt(diff.reduce((a, v) => a + (v - md)*(v - md), 0)/Math.max(1, diff.length - 1)), seD = sd/Math.sqrt(diff.length);
  console.log(`  paired: Player 1's margin ${md.toFixed(2)} points a pair (se ${seD.toFixed(2)}, ${(md/seD).toFixed(1)} se)`);
  const b = full ? { share:0.05, mirror:0.06, tries:0.25, gk:4, du:0.15, dw:6, sk:5, lk:4 } : { share:Math.max(0.05, 2.5*R.se), mirror:0.06, tries:Math.max(0.25, 0.5*Math.sqrt(1/R.n)*4), gk:8, du:0.15, dw:10, sk:8, lk:8 };
  ok(Math.abs(R.share - 0.5) <= b.share && Math.abs(md) <= 3*seD + 0.5, `Player 1's share of the decided matches is 50 ± ${(100*b.share).toFixed(1)} (${(100*R.share).toFixed(1)}%) and his paired margin is within three standard errors of zero (${md.toFixed(2)} ± ${(3*seD).toFixed(2)})`);
  ok(Math.abs(R.tries[0] - R.tries[1]) <= b.tries, `tries a match within ${b.tries.toFixed(2)} (${R.tries.map(v => v.toFixed(2)).join(' v ')})`);
  ok(Math.abs(R.gk[0] - R.gk[1]) <= b.gk, `goal-kick percentage within ${b.gk} points (${R.gk.map(v => v.toFixed(1)).join(' v ')})`);
  ok(Math.abs(R.du[0] - R.du[1]) <= b.du*Math.max(R.du[0], R.du[1]) + 0.05, `duels owned within ${100*b.du}% (${R.du.map(v => v.toFixed(2)).join(' v ')})`);
  ok(Math.abs(R.dw[0] - R.dw[1]) <= b.dw, `the owner's duel win rate within ${b.dw} points (${R.dw.map(v => v.toFixed(1)).join(' v ')})`);
  ok(Math.abs(R.sk[0] - R.sk[1]) <= b.sk, `scrum retention by the feeding side within ${b.sk} points (${R.sk.map(v => v.toFixed(1)).join(' v ')})`);
  ok(Math.abs(R.lk[0] - R.lk[1]) <= b.lk, `lineout retention by the throwing side within ${b.lk} points (${R.lk.map(v => v.toFixed(1)).join(' v ')})`);
  { const perTwo = R.frozen/Math.max(0.01, R.du[0] + R.du[1]), per1 = frozen1/Math.max(0.01, duels1);
    ok(perTwo <= 1.15*per1 && R.frozen <= 1.8*frozen1, `a two-player duel freezes no longer than one player's (${perTwo.toFixed(2)}s a duel against ${per1.toFixed(2)}s; ${R.frozen.toFixed(1)}s a match over ${(R.du[0] + R.du[1]).toFixed(2)} duels against one player's ${frozen1.toFixed(1)}s over ${duels1.toFixed(2)}, at most 1.8 x)`); }
  ok(R.du[0] + R.du[1] > 0.5 && R.dw[0] > 0 && R.dw[1] > 0, 'duels were fought head to head and won by both owners');
  // the mirror match
  const mrows = []; for (let i = 0; i < Math.ceil(N/2); i++) mrows.push(play(T.teams.NATIONS[1], T.teams.NATIONS[1], [1, 1], 5000 + i));
  const Rm = report(mrows, 'mirror');
  ok(Math.abs(Rm.share - 0.5) <= Math.max(b.mirror, 2.5*Rm.se), `the mirror match's share is 50 ± ${(100*Math.max(b.mirror, 2.5*Rm.se)).toFixed(1)} (${(100*Rm.share).toFixed(1)}%)`);
  if (full) {
    // one player as the away side against the home side, the same pairings and seeds
    const run1 = (home, seed) => { reseed(seed); T.newMatch(home ? 0 : 1, home ? 1 : 0, { halfLen:HALF, diff:1, headless:true, duels:'live', humans:home ? [true, false] : [false, true] }); D.setMode('match'); D.setTwo(false); clearSlots(); clearEdges(); const side = home ? 0 : 1; let n = 0; while (!M().over && n++ < 200000) { bot(side); T.update(STEP); } return { w: M().score[side] > M().score[1 - side] ? 1 : M().score[side] < M().score[1 - side] ? 0 : 0.5, t: M().tries[side] }; };
      let wh = 0, wa = 0, th = 0, ta = 0; const n1 = Math.min(N, 200);
    for (let i = 0; i < n1; i++) { const h = run1(true, 7000 + i), a = run1(false, 7000 + i); wh += h.w; wa += a.w; th += h.t; ta += a.t; }
    console.log(`  away side: home human wins ${(100*wh/n1).toFixed(1)}%, away human ${(100*wa/n1).toFixed(1)}%; tries ${(th/n1).toFixed(2)} v ${(ta/n1).toFixed(2)} (${n1} matches each)`);
    ok(Math.abs(wh - wa)/n1 <= 0.05 + 2*0.5/Math.sqrt(n1) && Math.abs(th - ta)/n1 <= 0.3 + 2/Math.sqrt(n1), 'one player as the away side wins within 5 points and scores within 0.3 tries of the home side');
    // AI v AI: team 0's share over 500 matches, both ways round
    const sims = T.simulate(500, 240, 1); let s0 = 0; for (const r of sims) s0 += r.score[0] > r.score[1] ? 1 : r.score[0] < r.score[1] ? 0 : 0.5;
    console.log(`  AI v AI: team 0's share ${(100*s0/sims.length).toFixed(1)}% of ${sims.length} matches at Normal`);
    ok(s0/sims.length >= 0.45 && s0/sims.length <= 0.55, `AI v AI is even (${(100*s0/sims.length).toFixed(1)}%)`);
    // the handicap: Player 1 on Easy against Player 2 on Hard wins more than 60% of 200; swapped, the result swaps within 8 points
    let we = 0, wh2 = 0; const nh = 200;
    for (let i = 0; i < nh; i++) { const r = play(T.teams.NATIONS[1], T.teams.NATIONS[1], [0, 2], 9000 + i); we += r.score[0] > r.score[1] ? 1 : r.score[0] < r.score[1] ? 0 : 0.5; const q = play(T.teams.NATIONS[1], T.teams.NATIONS[1], [2, 0], 9000 + i); wh2 += q.score[1] > q.score[0] ? 1 : q.score[1] < q.score[0] ? 0 : 0.5; }
    console.log(`  handicap: Easy beats Hard ${(100*we/nh).toFixed(1)}% as Player 1, ${(100*wh2/nh).toFixed(1)}% as Player 2 (${nh} each)`);
    ok(we/nh > 0.60 && Math.abs(we - wh2)/nh <= 0.08, 'an Easy player beats a Hard one more than 60% of the time, from either seat within 8 points');
  }
  D.setTwo(false); D.setMode('menu');
}
done('M symmetry');

// H2. the lock sweep (`--lock`): ownerBot (reaction 0.25 ± 0.05s) against chooserBot (trick 0.3, late 0.1) for leads of 0.15, 0.24, 0.32
// and 0.40, per kind at each timer level, 600 duels a cell, printed next to one player's rate at that level with the same timer model
// (and today's duelBot). The shipped DUEL_LOCK must sit within 8 points of one player
if (process.argv.includes('--lock')) {
  begin('lock sweep');
  const S = T.sides, LOCK = D.DUEL_LOCK, shipped = LOCK.slice(), N = 600;
  const kinds = ['past', 'pass', 'tackle', 'block'];
  const duel = (kind, own, two, levels, lead, seed) => {        // own is 0 in one player: the human owns every duel
    reseed(seed);
    T.newMatch(1, 1, { halfLen:240, diff:levels[own], headless:true, duels:'live', humans:two ? [true, true] : [true, false], levels:two ? levels : null }); D.setMode('match'); D.setTwo(two); clearSlots(); clearEdges();
    S.side(0).duel.first = S.side(1).duel.first = false;
    if (two) LOCK[levels[own]] = lead;
    if (kind === 'block') { D.stage('block', own); T.forceDuel('block', own); } else { D.stage(kind, own); T.update(STEP); }
    const c = M().cut; if (!c || c.kind !== kind) return null;
    let n = 0; while (M().cut === c && !c.res && n++ < 600) { if (two) { ownerBot(c); chooserBot(c); } else (process.env.LOCK_DUELBOT ? duelBot : ownerBot)(c); T.update(STEP); }
    return c.good ? 1 : 0;
  };
  const rate = (kind, two, level, lead) => { let w = 0, n = 0; for (let i = 0; i < N; i++) { const r = duel(kind, two ? i % 2 : 0, two, [level, level], lead, 100 + i); if (r == null) continue; w += r; n++; } return 100*w/Math.max(1, n); };
  const LEADS = [0.15, 0.24, 0.32, 0.40], names = ['Easy', 'Normal', 'Hard'];
  console.log('lock sweep: the timer\'s win rate, ownerBot (reaction 0.25 ± 0.05s) against chooserBot (trick 0.3, late 0.1), 600 duels a cell; one player: the same timer against the CPU');
  const table = {};
  for (const level of [0, 1, 2]) {
    for (const kind of kinds) {
      const one = rate(kind, false, level, 0);
      const row = LEADS.map(l => rate(kind, true, level, l));
      table[level + kind] = { one, row };
      console.log(`  ${names[level].padEnd(6)} ${kind.padEnd(6)} one player ${one.toFixed(1).padStart(5)}%   leads ${LEADS.map((l, i) => l.toFixed(2) + ': ' + row[i].toFixed(1).padStart(5) + '%').join('  ')}`);
    }
    LOCK[level] = shipped[level];
  }
  for (const level of [0, 1, 2]) {
    const i = LEADS.indexOf(shipped[level]);
    for (const kind of kinds) { const t = table[level + kind]; ok(i >= 0 && Math.abs(t.row[i] - t.one) <= 8, `${names[level]} ${kind}: the shipped lead ${shipped[level]} is within 8 points of one player (${t.row[i] && t.row[i].toFixed(1)}% v ${t.one.toFixed(1)}%)`); }
  }
  D.setTwo(false); D.setMode('menu');
  done('H2 lock sweep');
}

// Z. one player keeps the browser's own keys on the pause card: Space and Enter press a focused button natively (not swallowed); P resumes
begin('one player pause keys');
{
  D.setTwo && D.setTwo(false); fresh(); clearSlots(); D.pause ? D.pause() : T.debug.pause && T.debug.pause();
  const paused0 = M().paused;
  const sp = down('Space'); up('Space'); const en = down('Enter'); up('Enter');
  ok(paused0 && M().paused && !sp.pd && !en.pd && edges().every(e => e === '000000'), `paused in one player: Space and Enter are left to the focused button (prevented ${sp.pd}/${en.pd}) and reach no slot`);
  const p = down('KeyP'); up('KeyP');
  ok(!M().paused && p.pd, 'and P resumes');
  D.setMode('menu');
}
done('Z one player pause keys');

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
