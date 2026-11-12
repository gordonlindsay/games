// The touch stick and the buttons never stay stuck, and a card's button works under a second finger (2026-11-11: the owner, "the
// joystick got jammed/stuck on a recent test game for some reason and we had to quit"). One check for each reproduction, each failing on
// f83a6f3 (1.4) and passing with the fix; then, where Playwright is installed, the worst of them in Chromium with real touches.
// node tools/stick.mjs              (SEED=11 unless set; NO_BROWSER=1 skips the browser part)
process.env.SEED ??= '11';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const { T, fire, fireDoc } = await import('./harness.mjs');
const D = T.debug, I = T.input, STEP = T.STEP, $ = id => document.getElementById(id);
let passed = 0, failed = 0, group = '';
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', group + ':', msg); } };
const begin = name => { group = name; };
const done = () => console.log(`${group.padEnd(34)} ${failed ? 'FAIL so far ' + failed : 'ok'} (${passed} passed)`);

/* The glass, as a browser keeps it: the fingers down (live: each pointer's touch, with its own identifier and where it is now) and who
   holds each one's capture. A press goes to the window first (its capture phase), then to its target, then its touchstart; a lift the
   page hears goes to the window, then to the element holding the finger, then its touchend. One it never hears leaves the page as it was.
   Chromium lets the capture go when it sees the lift, whether or not the page hears it (gone); an iPhone that never saw the lift itself
   would still claim it (stale). A touch's identifier is never its pointer's id here (WebKit's isn't, nor Chromium's), so a hold matched
   to its touch by the pointer's id would find none. */
const live = new Map(), caps = new Map();
let nextTouch = 7000;
function capturable(el) {
  el.setPointerCapture = id => { if (!live.has(id)) throw Error('NotFoundError'); caps.set(id, el); };
  el.hasPointerCapture = id => caps.get(id) === el;
  el.releasePointerCapture = id => { if (caps.get(id) === el) caps.delete(id); };
}
for (const id of ['zone', 'btnA', 'btnB', 'btnC']) capturable($(id));
let clock = 1000;                                          // the events' own timeStamp: each new press is a second after the last
const P = (id, x = 160, y = 290, o = {}) => ({ pointerId:id, pointerType:'touch', clientX:x, clientY:y, timeStamp:clock, ...o });
const down = (el, id, x = 160, y = 290, o = {}) => {        // a press, then its touchstart (o.touch false: the touchstart comes later, by hand; o.first: before the pointerdown, as a browser might)
  clock += 1000; live.set(id, { identifier:nextTouch++, clientX:x, clientY:y });
  if (o.first) touchstart([id], [...live.keys()]);
  const e = P(id, x, y, o.type ? { pointerType:o.type } : {}); fire('pointerdown', e); $(el).fire('pointerdown', e);
  if (o.touch !== false && !o.first) touchstart([id], [...live.keys()]);
};
const move = (id, x, y) => { const t = live.get(id); if (t) { t.clientX = x; t.clientY = y; } $('zone').fire('pointermove', P(id, x, y)); };
const holder = id => caps.get(id) || $('cv');
const up = (id, type = 'pointerup') => {                   // heard: the window, then the holder, then the touch's end
  const t = live.get(id); live.delete(id); const e = P(id); fire(type, e); holder(id).fire(type, e); caps.delete(id);
  if (t) touchEnd([t], type === 'pointercancel' ? 'touchcancel' : 'touchend');
};
const gone = id => { live.delete(id); caps.delete(id); };     // lifted, never heard by the page; the browser saw it and let the capture go
const stale = id => { live.delete(id); };                    // lifted, and the browser itself never saw it: the capture still claimed
const touchList = ids => ids.map(id => ({ ...(live.get(id) || { identifier:90000 + id, clientX:160, clientY:290 }) }));
const touchstart = (fresh, all) => { const e = { changedTouches:touchList(fresh), touches:touchList(all), timeStamp:clock }; fire('touchstart', e); fireDoc('touchstart', e); };
const touchEnd = (ended, type = 'touchend') => { const e = { changedTouches:ended.map(t => ({ ...t })), touches:touchList([...live.keys()]), timeStamp:clock }; fire(type, e); fireDoc(type, e); };   // the fingers listed are the ones still live
const lose = id => { const t = { ...live.get(id) }; stale(id); return t; };   // a lift whose pointer events the page never hears: its touch's end still comes (touchEnd([t]))
function fresh(kind = 'past') {
  D.releaseTouch(); D.releaseAll(); D.setTwo(false); live.clear(); caps.clear();
  T.newMatch(0, 1, { halfLen:240, diff:1, duels:'off' }); D.setMode('match'); if (kind) D.stage(kind);
  for (const id of ['m-pause', 'm-break', 'm-pen', 'm-tut', 'm-practice']) $(id).hidden = true;
  I.jx = I.jy = 0;                                          // stageDuel sets the run in the stick's place: no thumb, no run
  return T.M;
}
const run = (n = 1) => { for (let i = 0; i < n; i++) T.update(STEP); };
const held = () => I.stickId !== null || I.jx !== 0 || I.jy !== 0;

// 1. A lift the zone never hears (its capture lost, the thumb lifted on the pitch or a button): the window hears it
begin('a lift off the zone');
{
  fresh(); down('zone', 1); move(1, 230, 290);
  ok(I.stickId === 1 && I.jx === 1, 'the thumb holds the stick and runs right');
  live.delete(1); fire('pointerup', P(1, 560, 250)); $('cv').fire('pointerup', P(1, 560, 250));
  ok(!held() && !$('stick').classList.contains('on'), 'a lift on the pitch lets go: the window hears it though the zone does not');
  down('btnC', 2, 700, 300); down('btnB', 3, 700, 300); run();
  live.delete(2); fire('pointerup', P(2, 300, 200));
  ok(!I.cDown && !$('btnC')._held && I.bDown, 'Sprint let go by a lift heard only by the window; Kick, another finger, still held');
  live.delete(3); fire('pointercancel', P(3, 300, 200));
  ok(!I.bDown && !$('btnB')._held && I.bCancel, 'a cancel heard only by the window cancels Kick');
}
done();

// 2. The zone loses its capture with the thumb still down: it takes it back once, so the lift still comes to it; a second loss, or a
//    finger already gone, lets go
begin('a lost capture');
{
  fresh(); down('zone', 4); move(4, 230, 290);
  caps.delete(4); $('zone').fire('lostpointercapture', P(4));
  ok(I.stickId === 4 && caps.get(4) === $('zone'), 'a capture lost with the thumb down is taken back, and the run carries on');
  caps.delete(4); $('zone').fire('lostpointercapture', P(4));
  ok(!held(), 'lost a second time: the stick lets go rather than wait on a lift that could land anywhere');
  down('zone', 5); move(5, 100, 290); live.delete(5); caps.delete(5); $('zone').fire('lostpointercapture', P(5));
  ok(!held(), 'a capture lost because the finger is gone (its lift unheard) lets go at once');
  down('zone', 6); ok(I.stickId === 6, 'and the next thumb takes the stick');
  up(6);
}
done();

// 3. The page hidden (an app switch, the Home swipe, a call, the lock) with the thumb on the stick, and its lift never heard
begin('the page hidden');
{
  fresh(); down('zone', 7); move(7, 230, 290); down('btnC', 8, 700, 300); run();
  document.hidden = true; fireDoc('visibilitychange'); gone(7); gone(8);
  ok(T.M.paused && !held() && !I.cDown && !$('btnC')._held && !$('btnC').classList.contains('press'), 'hidden: paused, the stick and Sprint let go though neither lift was heard');
  document.hidden = false; fireDoc('visibilitychange'); D.resume();
  run(30);
  ok(!held() && I.world().mag === 0 && !I.cDown, 'after Resume nothing is held: no run and no Sprint with no thumb on the glass');
  down('zone', 9, 260, 300); move(9, 190, 300);
  ok(I.stickId === 9 && I.jx < -0.5, 'a new thumb takes the stick and steers');
  fire('pointerup', P(7)); $('zone').fire('pointerup', P(7));
  ok(I.stickId === 9, 'the old thumb\'s late lift cannot let go of the new one');
  up(9);
  down('zone', 10); move(10, 230, 290); fire('pagehide'); gone(10);
  ok(!held() && T.M.paused, 'pagehide lets go too');
  D.resume();
}
done();

// 4. The lift lost with no event at all (an iPhone's Control Centre or a system alert: no blur, nothing hidden)
begin('a lift lost, nothing else');
{
  fresh(); down('zone', 11); move(11, 230, 290); gone(11);
  run(5); ok(I.stickId === 11 && I.jx === 1, 'the page heard nothing, so the run is still held (the most it can know)');
  down('zone', 12, 260, 300);
  ok(I.stickId === 12 && I.jx === 0, 'the next thumb on the zone takes the stick at once: the browser holds no capture for the old one');
  move(12, 190, 300); ok(I.jx < -0.5, 'and steers');
  up(12);
  // the same id coming down again proves the old finger ended (a browser that reuses ids)
  down('zone', 13); move(13, 230, 290); stale(13);
  down('zone', 13, 250, 300); ok(I.stickId === 13 && I.jx === 0 && I.ox === 250, 'its own id again: the old one ended unheard, the new press takes the stick where it lands');
  up(13);
  // an iPhone that never saw the lift itself still claims the capture: the touchstart's own list of fingers decides
  down('zone', 14); move(14, 230, 290); stale(14);
  down('zone', 15, 260, 300, { touch:false });
  ok(I.stickId === 14, 'a browser still claiming the old capture: the pointerdown alone cannot tell');
  touchstart([15], [15]);
  ok(I.stickId === 15 && I.ox === 260 && I.jx === 0, 'the touchstart has no finger from before on the glass: the old hold goes and the new thumb takes the stick');
  move(15, 190, 300); ok(I.jx < -0.5, 'and steers');
  up(15);
}
done();

// 5. A second finger never takes the stick or a button from a live one: today's palm on the zone, and a thumb's own touchstart
begin('a live finger keeps its hold');
{
  fresh(); down('zone', 16); move(16, 230, 290);
  down('zone', 17, 300, 200);
  ok(I.stickId === 16 && I.jx === 1, 'a palm on the zone is ignored, as before: the thumb is still on the glass');
  up(17); move(16, 160, 230); ok(I.stickId === 16 && I.jy < -0.5, 'the thumb still steers after the palm lifts');
  up(16);
  down('zone', 18); move(18, 230, 290);
  ok(I.stickId === 18 && I.jx === 1, 'a thumb\'s own touchstart (its pointerdown came first) never lets go of its own hold');
  down('btnC', 19, 700, 300);
  ok(I.cDown && $('btnC')._pointerId === 19 && I.stickId === 18, 'Sprint and the stick together, as ever');
  down('btnC', 20, 700, 300); ok($('btnC')._pointerId === 19 && I.cDown, 'a second finger on Sprint never takes it from the first');
  up(20); ok(I.cDown, 'nor does its lift let go of the first');
  up(19); up(18); ok(!I.cDown && !held(), 'each lift lets go of its own');
}
done();

// 6. A button whose lift was lost: the next press takes it as a fresh press; a stale Kick is never a kick
begin('a button\'s lift lost');
{
  const m = fresh(); const c = T.sides.ctrlOf(0); m.ball.state = 'held'; m.ball.carrier = c;
  down('btnC', 21, 700, 300); run(); gone(21);
  ok(I.cDown && $('btnC')._held, 'Sprint\'s lift unheard: still held, as far as the page knows');
  down('btnC', 22, 700, 300);
  ok(I.cDown && I.cPressed && $('btnC')._pointerId === 22 && !I.cCancel, 'the next press on Sprint takes it, as a fresh press');
  up(22); ok(!I.cDown, 'and its lift lets go');
  down('btnB', 23, 700, 300); run(5); ok(m.side[0].charging, 'Kick held: charging');
  const kicks = m.stats.kicks; stale(23);
  down('zone', 24);
  ok(!I.bDown && !$('btnB')._held && I.bCancel && I.stickId === 24, 'a touchstart with no finger from before: the stale Kick is let go as cancelled, and the thumb has the stick');
  run(3); ok(m.stats.kicks === kicks && !m.side[0].charging, 'and no kick is fired from it');
  up(24);
  // a stale Sprint, and the next finger lands on Sprint itself: the finger it turned away takes it
  down('btnC', 25, 700, 300); stale(25); down('btnC', 26, 700, 300, { touch:false });
  ok($('btnC')._pointerId === 25, 'a browser still claiming the old capture: Sprint still the old finger\'s at the pointerdown');
  touchstart([26], [26]);
  ok($('btnC')._pointerId === 26 && I.cDown && !I.cCancel, 'the touchstart shows the old one gone: the new finger has Sprint');
  up(26); ok(!I.cDown && !$('btnC')._held, 'and lets go on its own lift');
}
done();

// 7. A hold whose lift was lost (the browser saw it and let its capture go) lets go at any new press anywhere, before the press reaches its
//    own target: a button as cancelled, so a stale Kick is never a kick, and a press on that same stick or button takes it fresh. A live
//    finger still holds its capture, so it keeps its hold. (The review of 4defbcd: a stale Sprint was let go only by a press on Sprint
//    itself or a touchstart with every finger new.) No touch event is heard here: the press alone must tell
begin('any press frees a stale hold');
{
  fresh(); down('zone', 50); move(50, 230, 290); down('btnC', 51, 700, 300); run();
  gone(51);
  down('btnA', 52, 760, 250, { touch:false });
  ok(!I.cDown && !$('btnC')._held && !$('btnC').classList.contains('press') && I.cCancel, 'Sprint\'s lift lost, then a tap on Pass: Sprint lets go, as cancelled');
  ok(I.aDown && $('btnA')._pointerId === 52 && I.stickId === 50 && I.jx === 1, 'Pass is pressed and the thumb still runs');
  run(); up(52, 'pointercancel'); up(50);
  const m = fresh(), c = T.sides.ctrlOf(0); m.ball.state = 'held'; m.ball.carrier = c;
  down('btnB', 53, 640, 330); run(5); ok(m.side[0].charging, 'Kick held: charging');
  const kicks = m.stats.kicks; gone(53);
  down('zone', 54, 160, 290, { touch:false });
  ok(!I.bDown && !$('btnB')._held && I.bCancel && I.stickId === 54, 'Kick\'s lift lost, then a thumb on the zone: Kick lets go as cancelled, and the thumb has the stick');
  run(3); ok(m.stats.kicks === kicks && !m.side[0].charging, 'and no kick is fired from it');
  down('btnB', 55, 640, 330); run(5); gone(55);
  down('btnB', 56, 640, 330, { touch:false });
  ok(I.bDown && I.bPressed && !I.bCancel && $('btnB')._pointerId === 56, 'a stale Kick and a press on Kick itself: the new finger takes it as a fresh press, never a cancel');
  run(3); ok(m.side[0].charging && m.stats.kicks === kicks, 'charging again from the new press, and no kick from the old one');
  up(56, 'pointercancel'); up(54);
  fresh(); down('zone', 57); move(57, 230, 290); gone(57);
  run(3); ok(I.stickId === 57 && I.jx === 1, 'the thumb\'s lift lost with nothing heard: still running (the most the page can know)');
  down('btnC', 58, 700, 300, { touch:false });
  ok(!held() && I.cDown && $('btnC')._pointerId === 58, 'then a press on Sprint: the stick lets go, and Sprint is pressed');
  run(3); ok(I.world().mag === 0, 'no run with no thumb on the glass');
  up(58);
  fresh(); down('zone', 59); move(59, 230, 290); down('btnC', 60, 700, 300); down('btnB', 61, 640, 330, { touch:false }); down('zone', 62, 330, 200, { touch:false });
  ok(I.stickId === 59 && I.jx === 1 && I.cDown && $('btnC')._pointerId === 60 && I.bDown && $('btnB')._pointerId === 61, 'presses beside live fingers let go of nothing: the stick, Sprint and Kick all held, a palm on the zone ignored');
  up(62); up(61, 'pointercancel'); up(60); up(59); ok(!held() && !I.cDown && !I.bDown, 'each lifts on its own');
}
done();

// 8. The stick's lift lost while the browser still claims the dead thumb's capture, and another finger is down (Sprint held): a new
//    thumb's touchstart lists Sprint's finger and itself but not the old thumb, so the old hold goes and the new thumb takes the stick.
//    (The review of 4defbcd: a touchstart let go of a stale hold only when every finger on it was new, so with Sprint down it never did)
begin('a stale stick beside a live finger');
{
  fresh(); down('zone', 63); move(63, 230, 290); down('btnC', 64, 700, 300); run();
  stale(63);
  run(5); ok(I.stickId === 63 && I.jx === 1, 'the thumb\'s lift lost, nothing heard: the run is still held (the most the page can know)');
  down('zone', 65, 260, 300);
  ok(I.stickId === 65 && I.ox === 260 && I.jx === 0, 'a new thumb on the zone with Sprint down: its touchstart lacks the old thumb, so the new thumb takes the stick');
  ok(I.cDown && $('btnC')._pointerId === 64, 'and Sprint, whose finger it lists, stays held');
  move(65, 190, 300); ok(I.jx < -0.5, 'and steers');
  up(65); ok(!held() && I.cDown, 'its lift lets go of the stick, not of Sprint');
  down('zone', 66); move(66, 230, 290); stale(66);
  down('cv', 67, 450, 120);
  ok(!held() && I.cDown, 'or a finger on the pitch: its touchstart lets go of the stale stick, and Sprint stays');
  up(67);
  down('zone', 68); move(68, 230, 290); down('zone', 69, 330, 200);
  ok(I.stickId === 68 && I.jx === 1 && I.cDown, 'a live thumb beside Sprint: a palm on the zone is ignored, as ever');
  up(69); ok(I.stickId === 68 && I.jx === 1, 'and its lift too');
  up(68); up(64); ok(!held() && !I.cDown, 'each lifts on its own');
}
done();

// 9. The backstop: every touchstart, touchend and touchcancel lists the fingers on the glass, and a hold whose finger isn't listed lets go
//    (a Kick as cancelled) whatever the pointer events said; with no finger listed nothing is held. Here no pointer event is heard and
//    every capture is still claimed, so only the touch list can tell
begin('the glass has the last word');
{
  const m = fresh(), c = T.sides.ctrlOf(0); m.ball.state = 'held'; m.ball.carrier = c;
  down('zone', 70); move(70, 230, 290); down('btnC', 71, 700, 300); down('btnB', 72, 640, 330); run(5);
  ok(I.stickId === 70 && I.cDown && m.side[0].charging, 'the stick, Sprint and Kick held, Kick charging');
  const kicks = m.stats.kicks;
  touchEnd([lose(71)]);
  ok(!I.cDown && !$('btnC')._held && I.stickId === 70 && I.jx === 1 && I.bDown, 'Sprint\'s lift with only its touch\'s end heard: Sprint lets go; the stick and Kick, whose fingers it lists, stay');
  run(); touchEnd([lose(70)]);
  ok(!held() && I.bDown && $('btnB')._held && m.side[0].charging, 'the thumb\'s: the stick lets go, Kick still charging');
  run(); touchEnd([lose(72)]);
  ok(!I.bDown && !$('btnB')._held && !I.bCancel, 'the last finger\'s own end heard: a lift, so Kick lets go as a release, whatever came first');
  run(3); ok(m.stats.kicks === kicks + 1 && !m.side[0].charging, 'and the kick is struck');
  { const m2 = fresh(), c2 = T.sides.ctrlOf(0); m2.ball.state = 'held'; m2.ball.carrier = c2;
    down('btnB', 84, 640, 330); down('cv', 85, 450, 120); run(5); const k2 = m2.stats.kicks;
    stale(84); up(85);
    ok(!I.bDown && !$('btnB')._held && I.bCancel, 'Kick\'s finger gone from the list without its own end heard: cancelled');
    run(3); ok(m2.stats.kicks === k2 && !m2.side[0].charging, 'and no kick is fired'); }
  fresh(); down('zone', 73); move(73, 230, 290); down('btnC', 74, 700, 300); down('btnA', 75, 760, 250);
  touchEnd([lose(73), lose(74), lose(75)], 'touchcancel');
  ok(!held() && !I.cDown && !I.aDown && !$('btnA')._held && !$('btnC')._held, 'a touchcancel with no finger left: the stick, Sprint and Pass all let go');
  fresh(); down('zone', 76, 160, 290, { touch:false }); move(76, 230, 290); down('btnC', 77, 700, 300, { touch:false });
  for (const id of [76, 77]) live.get(id).clientX += 100;  // their touches nowhere near where the pointer events put them, so nothing can name them
  ok(I.stickId === 76 && I.cDown, 'two holds whose touchstarts were never heard');
  down('cv', 78, 450, 120); ok(I.stickId === 76 && I.jx === 1 && I.cDown && I.stickTid === null && $('btnC')._tid === null, 'unnamed, and other fingers on the glass: kept (they may be live)');
  stale(76); stale(77); up(78); ok(!held() && !I.cDown, 'the last finger lifts and the glass is empty: both let go');
  fresh(); fire('pointerdown', P(79, 700, 300, { pointerType:'mouse' })); $('btnC').fire('pointerdown', P(79, 700, 300, { pointerType:'mouse' })); caps.set(79, $('btnC'));
  down('cv', 80, 450, 120); up(80);
  ok(I.cDown && $('btnC')._pointerId === 79, 'a mouse\'s hold is not the glass\'s to judge: a touch\'s end with no finger left leaves it');
  fire('pointerup', P(79, 700, 300, { pointerType:'mouse' })); $('btnC').fire('pointerup', P(79, 700, 300, { pointerType:'mouse' })); ok(!I.cDown, 'its own lift lets go');
}
done();

// 9b. A browser may give an ended touch's identifier to the next finger: a hold whose finger ended unheard is not kept alive by it
begin('a reused touch identifier');
{
  fresh(); down('zone', 86); move(86, 230, 290); const tid = I.stickTid;
  ok(I.stickId === 86 && I.jx === 1 && tid != null, 'the thumb holds the stick, named by its touch');
  stale(86); const keep = nextTouch; nextTouch = tid; down('zone', 87, 140, 290); nextTouch = keep;
  ok(I.stickId === 87 && I.jx === 0, 'a new thumb landing with the dead touch\'s identifier takes the stick');
  move(87, 70, 290); ok(I.jx === -1, 'and steers'); up(87); ok(!held(), 'and lets go on its lift');
  fresh(); down('btnC', 88, 700, 300); const t2 = $('btnC')._tid; down('zone', 89); move(89, 230, 290);
  stale(88); const keep2 = nextTouch; nextTouch = t2; down('btnA', 90, 760, 250); nextTouch = keep2;
  ok(!I.cDown && !$('btnC')._held && I.stickId === 89 && I.aDown, 'a stale Sprint whose identifier comes back on Pass lets go; the live stick and the new Pass are kept');
}
done();

// 10. Each hold knows its touch by where it went down, never by its pointer's id
begin('each hold knows its touch');
{
  fresh(); down('zone', 81); move(81, 230, 290);
  live.set(82, { identifier:nextTouch++, clientX:700, clientY:300 }); live.set(83, { identifier:nextTouch++, clientX:760, clientY:250 });
  fire('pointerdown', P(82, 700, 300)); $('btnC').fire('pointerdown', P(82, 700, 300)); fire('pointerdown', P(83, 760, 250)); $('btnA').fire('pointerdown', P(83, 760, 250));
  touchstart([82, 83], [...live.keys()]);
  ok(I.stickTid === live.get(81).identifier && $('btnC')._tid === live.get(82).identifier && $('btnA')._tid === live.get(83).identifier, 'two fingers in one touchstart: each hold named with its own touch, by its spot');
  touchEnd([lose(83)]); ok(!I.aDown && I.cDown && I.stickId === 81 && I.jx === 1, 'Pass\'s touch ends: only Pass lets go');
  down('btnB', 84, 640, 330, { first:true });
  ok($('btnB')._held && $('btnB')._tid === null, 'a browser that sends the touchstart first: Kick held, not yet named');
  down('cv', 85, 450, 120);
  ok($('btnB')._tid === live.get(84).identifier && I.bDown, 'named at the next touch event, by where its finger is');
  up(85); touchEnd([lose(84)]); ok(!I.bDown && I.cDown && I.stickId === 81, 'and its touch\'s end lets go of Kick alone');
  up(82); up(81); ok(!held() && !I.cDown, 'each lifts on its own');
}
done();

// 10. A card's button under a second finger: the finger's own lift on it clicks it. A browser makes no click from a tap while another
//    finger is down, so before this a card met mid-run ignored the other thumb (the harness can't make that rule; the browser part does)
begin('a card under a second finger');
{
  const sel1 = (el, s) => (s === '[hidden]' ? !!el.hidden : s[0] === '#' ? el.id === s.slice(1) : s[0] === '.' ? el.classList.contains(s.slice(1)) : s === 'button' ? !!el.isButton : false);
  const nest = (el, ups, button) => {                       // el's ancestors, nearest first: closest() and contains() as a page has them
    el.isButton = button;
    el.closest = s => [el, ...ups].find(a => s.split(',').some(x => sel1(a, x.trim()))) || null;
    for (const a of [el, ...ups]) { (a.kids ||= new Set()).add(el); a.contains = x => x === a || a.kids.has(x); }
  };
  const box = (el, x, y, w = 120, h = 48) => { el.rect = { left:x, top:y, right:x + w, bottom:y + h, width:w, height:h }; };
  nest($('tu-next'), [$('tu-row'), $('m-tut')], true); nest($('tu-skip'), [$('tu-row'), $('m-tut')], true); nest($('tu-play'), [$('m-tut')], true);
  nest($('tu-title'), [$('m-tut')], false); nest($('m-tut'), [], false); nest($('b-pause'), [], true); nest($('pz-resume'), [$('m-pause')], true);
  nest($('p-goal'), [$('m-pen')], true); nest($('cv'), [], false); nest($('m-pause'), [], false); nest($('m-pen'), [], false);
  box($('tu-next'), 430, 250); box($('tu-skip'), 300, 250); box($('tu-play'), 300, 250, 250); box($('tu-title'), 300, 120, 250, 40); box($('m-tut'), 0, 0, 844, 390);
  box($('cv'), 0, 0, 844, 390); box($('b-pause'), 790, 6, 44, 44); box($('pz-resume'), 300, 200, 250); box($('p-goal'), 300, 150, 250);
  let tid = 100;
  const tap = (el, o = {}) => {                            // a second finger's tap: down at the button's middle, up after o.dx/o.dy
    const r = el.rect, x = r.left + r.width/2, y = r.top + r.height/2, t = { identifier:++tid, clientX:x, clientY:y };
    const s = { target:el, changedTouches:[t], touches:[...touchList([...live.keys()]), t], timeStamp:clock };   // the thumb on the stick is on the glass too
    fire('touchstart', s); fireDoc('touchstart', s);
    const u = { identifier:t.identifier, clientX:x + (o.dx || 0), clientY:y + (o.dy || 0) };
    const e = { target:el, changedTouches:[u], touches:touchList([...live.keys()]), cancelable:o.cancelable !== false, defaultPrevented:false, preventDefault() { this.defaultPrevented = true; } };
    fire('touchend', e); fireDoc('touchend', e);
    return e;
  };
  const cardUp = () => { D.settings().tut = []; D.settings().hints = true; const m = fresh(); T.scrum(0, 60, 35, 'Knock-On'); for (let i = 0; i < 200 && !m.tut; i++) T.update(STEP); return m; };
  const m = cardUp();
  down('zone', 30); move(30, 230, 290);
  ok(m.tut && m.tut.id === 'scrum' && m.tut.step === 0 && !$('m-tut').hidden && I.stickId === 30, 'the first scrum\'s card is up with the thumb on the stick');
  let e = tap($('tu-next'));
  ok(m.tut && m.tut.step === 1 && e.defaultPrevented, 'Next under a second finger: the card turns, and the browser\'s own click is stopped');
  $('tu-row').hidden = true; e = tap($('tu-play'));
  ok(!m.tut && $('m-tut').hidden && I.stickId === 30 && e.defaultPrevented, 'Play: the scrum runs, the thumb still on the stick');
  up(30);
  // Chromium makes the touch's end uncancelable once the steering thumb has moved: the lift still clicks, the browser making none of its own
  const m1 = cardUp(); down('zone', 35); move(35, 230, 290);
  e = tap($('tu-next'), { cancelable:false }); ok(m1.tut && m1.tut.step === 1 && !e.defaultPrevented, 'an uncancelable lift beside the thumb still turns the card');
  up(35); e = tap($('tu-next'), { cancelable:false }); ok(m1.tut && m1.tut.step === 1, 'an uncancelable lift by a lone finger is left to the browser, whose own click it can\'t stop (no double)');
  D.tutPlay();
  const m2 = cardUp(); down('zone', 31); move(31, 230, 290);
  tap($('tu-title')); ok(m2.tut && m2.tut.step === 1, 'a tap anywhere on the card turns it, as its own click does');
  $('tu-row').hidden = false; tap($('tu-skip')); ok(!m2.tut, 'Skip');
  up(31);
  const m3 = cardUp(); down('zone', 32);
  e = tap($('tu-next'), { dx:40 }); ok(m3.tut.step === 0 && !e.defaultPrevented, 'a finger that slid 40px is a scroll, not a tap: nothing, and the browser decides');
  e = tap($('tu-next'), { dy:60 }); ok(m3.tut.step === 0 && !e.defaultPrevented, 'nor a lift off the button');
  $('tu-row').hidden = true; e = tap($('tu-next')); ok(m3.tut.step === 0 && !e.defaultPrevented, 'nor a button in a hidden row');
  $('tu-row').hidden = false;
  e = tap($('cv')); ok(m3.tut.step === 0 && !e.defaultPrevented, 'nor a touch outside the cards (the pitch)');
  D.tutPlay(); up(32);
  fresh(); down('zone', 33); move(33, 230, 290); $('b-pause').hidden = false;   // startMatch shows it
  tap($('b-pause')); ok(T.M.paused && !$('m-pause').hidden, 'Pause under a second finger pauses');
  tap($('pz-resume')); ok(!T.M.paused && $('m-pause').hidden && I.stickId === 33, 'Resume resumes, the thumb still on the stick');
  $('b-pause').hidden = true; tap($('b-pause')); ok(!T.M.paused, 'a hidden Pause is not there to tap');
  $('b-pause').hidden = false; up(33);
  fresh(); down('zone', 34); D.openPenalty(95, 30);
  $('p-goal').disabled = true; e = tap($('p-goal')); ok(!$('m-pen').hidden && !e.defaultPrevented, 'Kick at Goal out of range: no tap');
  $('p-goal').disabled = false; tap($('p-goal')); ok($('m-pen').hidden && T.M.cut && T.M.cut.kind === 'goal', 'the penalty card\'s Kick at Goal under a second finger takes the kick');
  up(34);
  // the browser's own click after a tap already clicked: eaten once, there and then; a key's click (detail 0) and a click elsewhere never
  let clicks = 0; const L = () => clicks++;
  $('pz-resume').addEventListener('click', L);
  const clickAt = (x, y, o = {}) => { const ev = { isTrusted:true, detail:1, clientX:x, clientY:y, ...o, prevented:false, stopped:false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } }; fireDoc('click', ev); return ev; };
  fresh(); D.pause(); clicks = 0; tap($('pz-resume'));
  ok(clicks === 1 && !T.M.paused, 'Resume clicked once by the lift');
  let k = clickAt(425, 224); ok(k.stopped && k.prevented, 'the browser\'s own click from that tap, if it comes, is eaten');
  k = clickAt(425, 224); ok(!k.stopped, 'only once');
  D.pause(); tap($('pz-resume')); k = clickAt(425, 224, { detail:0 }); ok(!k.stopped, 'a key\'s click is never eaten');
  D.pause(); tap($('pz-resume')); k = clickAt(100, 100); ok(!k.stopped, 'nor a click somewhere else');
  D.pause(); tap($('pz-resume')); touchstart([999], [999]); k = clickAt(425, 224); ok(!k.stopped, 'nor one after the next touch has begun');
}
done();

// 11. Nothing else moves: the stick's own lift, a cancel, rotation and blur as before, and no random number drawn by any of it
begin('as before');
{
  const { rndCalls } = await import('./harness.mjs');
  fresh(); const r0 = rndCalls();
  down('zone', 40); move(40, 230, 290); up(40); ok(!held(), 'a lift heard on the zone lets go');
  down('zone', 41); move(41, 230, 290); up(41, 'pointercancel'); ok(!held(), 'a cancel lets go');
  down('zone', 42); move(42, 230, 290); D.phoneUpright(); ok(!held(), 'the phone upright lets go'); D.resume(); gone(42);
  down('zone', 43); move(43, 230, 290); fire('blur'); ok(!held(), 'a blur lets go'); D.resume(); gone(43);
  ok(rndCalls() === r0, 'none of it draws a random number');
}
done();

await browserChecks();
console.log(`Stick: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;

function chromium() {
  const require = createRequire(import.meta.url);
  for (const from of [() => require('playwright'), () => require(path.join(execFileSync('npm', ['root', '-g'], { stdio:['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright'))]) {
    try { return from().chromium; } catch (e) { /* not here */ }
  }
  return null;
}
/* 12. In Chromium with real touches (CDP Input.dispatchTouchEvent), 844x390, a phone with a new profile: every tutorial card up. A lift the
      page must not hear is stopped at the window before the game's own listeners (an init script), as a lost touchend would be. */
async function browserChecks() {
  if (process.env.GAME || process.env.NO_BROWSER) { console.log('skip the browser checks (GAME or NO_BROWSER set)'); return; }
  const chrome = chromium();
  if (!chrome) { console.log('skip the browser checks: Playwright is not installed (npm i -g playwright && npx playwright install chromium)'); return; }
  let browser;
  try { browser = await chrome.launch(); } catch (e) { console.log('skip the browser checks: Chromium would not start (' + e.message.split('\n')[0] + ')'); return; }
  const dir = fileURLToPath(new URL('../', import.meta.url));
  const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.json':'application/json', '.webmanifest':'application/manifest+json' };
  const server = http.createServer((req, res) => {
    const file = path.resolve(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type':TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(+process.env.PORT || 0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const ZX = 160, ZY = 290;                                // the thumb's first touch, well inside the zone
  const LOSE = ['pointerup', 'pointercancel', 'lostpointercapture', 'touchend', 'touchcancel'];
  async function open(o = {}) {
    const touch = o.touch !== false;
    const ctx = await browser.newContext({ viewport:{ width:844, height:390 }, deviceScaleFactor:1, isMobile:touch, hasTouch:touch, serviceWorkers:'block' });
    await ctx.addInitScript(() => {                        // before the game: the lifts to lose, and every click on the page with whether a browser made it
      window.__lose = null; window.__clicks = [];           // __lose: a Set of the event types the page must not hear
      for (const t of ['pointerup', 'pointercancel', 'lostpointercapture', 'touchend', 'touchcancel']) window.addEventListener(t, e => { if (window.__lose && window.__lose.has(e.type)) e.stopImmediatePropagation(); }, true);
      window.addEventListener('click', e => window.__clicks.push((e.target.id || e.target.tagName) + (e.isTrusted ? ':trusted' : '')), true);
    });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + 'index.html', { waitUntil:'load' });
    await page.waitForFunction(() => window.__tryline && window.__tryline.debug);
    const cdp = await ctx.newCDPSession(page), pts = new Map();
    const send = type => cdp.send('Input.dispatchTouchEvent', { type, touchPoints:[...pts].map(([id, p]) => ({ x:p.x, y:p.y, id, radiusX:4, radiusY:4, force:1 })) });
    const F = {
      page, errors, ev:(fn, a) => page.evaluate(fn, a),
      async down(id, x, y) { pts.set(id, { x, y }); await send('touchStart'); },
      async move(id, x, y, steps = 4) { const p = pts.get(id), x0 = p.x, y0 = p.y; for (let i = 1; i <= steps; i++) { pts.set(id, { x:x0 + (x - x0)*i/steps, y:y0 + (y - y0)*i/steps }); await send('touchMove'); } },
      async up(id) { const p = pts.get(id); pts.delete(id); await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[{ x:p.x, y:p.y, id, radiusX:4, radiusY:4, force:1 }] }); },   // a touchEnd lifts the points it lists
      async at(sel) { return page.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return { x:r.left + r.width/2, y:r.top + r.height/2 }; }, sel); },
      async tap(id, sel) { const c = await F.at(sel); await F.down(id, c.x, c.y); await wait(50); await F.up(id); await wait(120); },
      async thumb(id = 1) { await F.down(id, ZX, ZY); await wait(30); await F.move(id, ZX + 60, ZY); await wait(80); },   // the thumb on the stick, running right
      state: () => page.evaluate(() => { const T = window.__tryline, I = T.input, M = T.M; return { stickId:I.stickId, jx:+I.jx.toFixed(2), jy:+I.jy.toFixed(2), aDown:I.aDown, bDown:I.bDown, cDown:I.cDown, bCancels:window.__bCancels || 0, paused:!!M.paused, tut:M.tut ? M.tut.id + ':' + M.tut.step : null, cut:M.cut ? M.cut.kind : null, phase:M.phase, pen:!document.getElementById('m-pen').hidden, clicks:window.__clicks.splice(0) }; }),
      close: () => ctx.close(),
    };
    await F.ev(o => { const T = window.__tryline, X = T.teams; T.debug.startMatch(X.CLUBS[0], X.CLUBS[1], false); if (o.seen) T.debug.settings().tut = T.debug.TUT_IDS.slice(); }, o);
    for (let i = 0; i < 100; i++) { if (await F.ev(() => { const M = window.__tryline.M; return M.phase === 'play' && !M.cut && !M.tut && !M.paused; })) break; await wait(100); }
    return F;
  }
  const cardFor = async (F, kind) => {                     // a first-time moment while the thumb is on the stick
    await F.ev(k => { const T = window.__tryline, M = T.M; if (k === 'scrum') T.scrum(0, M.ball.x, 35, 'Knock-On'); else if (k === 'lineout') T.lineout(0, 60, 0, 'Into Touch'); else T.forceDuel(k); }, kind);
    for (let i = 0; i < 80; i++) { if (await F.ev(() => !!window.__tryline.M.tut)) break; await wait(50); }
    await wait(150);
  };
  const B = (cond, msg) => ok(cond, 'browser: ' + msg);
  try {
    begin('browser: cards under the stick thumb');
    for (const kind of ['scrum', 'past']) {                 // 1 and 2: a set piece's card and a duel's (whose stick is re-centred under it, by design)
      const F = await open();
      await F.thumb(1); await cardFor(F, kind);
      let s = await F.state(); B(s.tut === kind + ':0' && s.stickId !== null, `${kind}: the first ${kind}'s card is up with the thumb on the stick (${s.tut}, stick ${s.stickId})`);
      await F.tap(20, '#tu-next'); s = await F.state();
      B(s.tut === kind + ':1' && s.clicks.join() === 'tu-next', `${kind}: a second finger's Next turns it, one click and not the browser's (${s.tut}; ${s.clicks})`);
      await F.tap(21, '#tu-play'); s = await F.state();
      B(s.tut === null && s.stickId !== null && s.clicks.join() === 'tu-play', `${kind}: Play starts it, the thumb still on the stick (${s.tut}; ${s.clicks})`);
      await F.up(1); await wait(100); s = await F.state(); B(s.stickId === null && s.jx === 0, `${kind}: the thumb's lift lets go`);
      B(!F.errors.length, `${kind}: no page errors (${F.errors.join('; ')})`); await F.close();
    }
    {                                                      // Sprint held instead, at the first lineout
      const F = await open(); const C = await F.at('#btnC');
      await F.down(2, C.x, C.y); await wait(100); await cardFor(F, 'lineout');
      await F.tap(22, '#tu-next'); let s = await F.state();
      B(s.tut === 'lineout:1', `lineout: Next works with a thumb on Sprint (${s.tut})`);
      await F.up(2); await wait(80); s = await F.state(); B(!s.cDown, 'lineout: Sprint lets go on its lift'); await F.close();
    }
    {                                                      // Pause and Resume, and the penalty card, with the thumb on the stick
      const F = await open({ seen:true });
      await F.thumb(1); await F.tap(23, '#b-pause'); let s = await F.state();
      B(s.paused && s.clicks.join() === 'b-pause', `Pause with the thumb on the stick pauses (${s.clicks})`);
      await F.tap(24, '#pz-resume'); s = await F.state();
      B(!s.paused && s.stickId !== null && s.jx > 0.5, `Resume resumes and the thumb still runs (jx ${s.jx})`);
      await F.ev(() => window.__tryline.debug.openPenalty(95, 30)); await wait(150);
      await F.tap(25, '#p-touch'); s = await F.state();
      B(!s.pen, 'the penalty card\'s Kick to Touch works with the thumb on the stick');
      await F.up(1); await F.close();
    }
    {                                                      // one finger alone: one click a tap, never two (Play sits where Next was)
      const F = await open();
      await cardFor(F, 'scrum'); await F.tap(26, '#tu-next'); let s = await F.state();
      const one = (s, id) => s.clicks.length === 1 && s.clicks[0].startsWith(id);   // the lift's click or the browser's, never both
      B(s.tut === 'scrum:1' && one(s, 'tu-next'), `a lone finger's Next turns the card once, never through to Play (${s.tut}; ${s.clicks})`);
      await F.tap(27, '#tu-play'); s = await F.state(); B(s.tut === null && one(s, 'tu-play'), `then Play, once (${s.clicks})`);
      await F.close();
    }
    {                                                      // a mouse clicks as ever
      const F = await open({ touch:false });
      await cardFor(F, 'scrum'); const c = await F.at('#tu-next'); await F.page.mouse.click(c.x, c.y); await wait(100);
      const s = await F.state(); B(s.tut === 'scrum:1' && s.clicks.join() === 'tu-next:trusted', `a mouse's click turns the card once (${s.clicks})`);
      await F.close();
    }
    done();
    begin('browser: a lift the page never hears');
    {                                                      // 3: hidden, the lift lost while hidden
      const F = await open({ seen:true });
      await F.thumb(1);
      await F.ev(L => { window.__vis = 'hidden'; Object.defineProperty(document, 'hidden', { configurable:true, get:() => window.__vis === 'hidden' }); Object.defineProperty(document, 'visibilityState', { configurable:true, get:() => window.__vis }); document.dispatchEvent(new Event('visibilitychange')); window.__lose = new Set(L); }, LOSE);
      await F.up(1); await F.ev(() => { window.__lose = null; window.__vis = 'visible'; document.dispatchEvent(new Event('visibilitychange')); }); await wait(100);
      let s = await F.state(); B(s.paused && s.stickId === null && s.jx === 0, `hidden: paused and the stick let go (stick ${s.stickId}, jx ${s.jx})`);
      await F.tap(30, '#pz-resume'); await wait(400); s = await F.state();
      B(!s.paused && s.stickId === null && s.jx === 0 && s.jy === 0, `after Resume no run is held (stick ${s.stickId}, jx ${s.jx})`);
      await F.down(2, 260, 300); await F.move(2, 190, 300); await wait(80); s = await F.state();
      B(s.stickId !== null && s.jx < -0.5, `a new thumb takes the stick (jx ${s.jx})`);
      await F.up(2); await F.close();
    }
    for (const ios of [false, true]) {                     // 4: no event at all; ios: the browser itself still claims the old capture
      const F = await open({ seen:true });
      if (ios) await F.ev(() => { const z = document.getElementById('zone'); z.hasPointerCapture = () => true; });
      await F.thumb(1); await F.ev(L => { window.__lose = new Set(L); }, LOSE); await F.up(1); await F.ev(() => { window.__lose = null; }); await wait(150);
      let s = await F.state(); const tag = ios ? 'claimed capture' : 'Chromium';
      B(s.stickId !== null && s.jx > 0.5, `${tag}: nothing heard, so the run is still held (the page can't know yet)`);
      await F.down(2, 260, 300); await wait(50); s = await F.state();
      B(s.stickId !== null && s.jx === 0, `${tag}: the next thumb takes the stick at once (jx ${s.jx})`);
      await F.move(2, 190, 300); await wait(80); s = await F.state(); B(s.jx < -0.5, `${tag}: and steers (jx ${s.jx})`);
      await F.up(2); await wait(80); s = await F.state(); B(s.stickId === null && s.jx === 0, `${tag}: and lets go on its lift`);
      await F.close();
    }
    {                                                      // 5: the capture lost, the thumb slid onto the pitch and lifted
      for (const keep of [true, false]) {
        const F = await open({ seen:true });
        await F.thumb(1);
        await F.ev(keep => { const z = document.getElementById('zone'), id = window.__tryline.input.stickId; if (!keep) window.__lose = new Set(['lostpointercapture']); z.releasePointerCapture(id); }, keep);
        await F.move(1, 560, 250, 8); await F.up(1); await wait(100); await F.ev(() => { window.__lose = null; });
        const s = await F.state(); B(s.stickId === null && s.jx === 0, `capture lost${keep ? '' : ' (and not taken back)'}, lifted on the pitch: the stick lets go (stick ${s.stickId})`);
        await F.down(2, 260, 300); await wait(50); const s2 = await F.state(); B(s2.stickId !== null, 'and the next thumb takes it');
        await F.up(2); await F.close();
      }
    }
    {                                                      // multi-touch as ever: stick, Sprint and Pass at once; a palm on the zone ignored
      const F = await open({ seen:true }); const C = await F.at('#btnC'), A = await F.at('#btnA');
      await F.thumb(1); await F.down(2, C.x, C.y); await wait(60);
      let s = await F.state(); B(s.stickId !== null && s.jx > 0.5 && s.cDown, 'the stick and Sprint together');
      const id0 = s.stickId; await F.down(3, 330, 200); await F.move(3, 300, 160); await wait(60); s = await F.state();
      B(s.stickId === id0 && s.jx > 0.5, 'a palm on the zone is ignored');
      await F.up(3); await F.down(4, A.x, A.y); await wait(60); await F.up(4); await wait(60); s = await F.state();
      B(s.stickId === id0 && s.cDown, 'a tap on Pass leaves the stick and Sprint held');
      await F.up(2); await F.up(1); await wait(80); s = await F.state(); B(!s.cDown && s.stickId === null, 'each lifts on its own');
      await F.close();
    }
    done();
    begin('browser: stale holds, any finger down');
    const claim = (F, ids) => F.ev(ids => { for (const id of ids) document.getElementById(id).hasPointerCapture = () => true; }, ids);   // a browser still claiming a dead finger's capture (an iPhone that never saw the lift)
    const countCancels = F => F.ev(() => { const I = window.__tryline.input; let v = I.bCancel; window.__bCancels = 0; Object.defineProperty(I, 'bCancel', { configurable:true, get:() => v, set:x => { if (x && !v) window.__bCancels++; v = x; } }); });   // each time Kick is let go as cancelled
    for (const path of ['press', 'list']) {               // 7 and 9: Sprint's lift lost with the thumb on the stick, then a tap on Pass. press: its touchstart unheard, so the press alone tells; list: Sprint's capture claimed, so the touchstart's list alone tells
      const F = await open({ seen:true }); const C = await F.at('#btnC'), A = await F.at('#btnA');
      if (path === 'list') await claim(F, ['btnC']);
      await F.thumb(1); await F.down(2, C.x, C.y); await wait(100);
      await F.ev(L => { window.__lose = new Set(L); }, LOSE); await F.up(2); await F.ev(() => { window.__lose = null; }); await wait(100);
      let s = await F.state(); B(s.cDown && s.stickId !== null && s.jx > 0.5, `${path}: Sprint's lift lost, nothing heard: still held as far as the page knows`);
      if (path === 'press') await F.ev(() => { window.__lose = new Set(['touchstart']); });
      await F.down(3, A.x, A.y); await wait(60); await F.ev(() => { window.__lose = null; });
      s = await F.state(); B(!s.cDown && s.aDown && s.stickId !== null && s.jx > 0.5, `${path}: then a tap on Pass lets go of Sprint, Pass pressed and the thumb still running (cDown ${s.cDown}, aDown ${s.aDown}, jx ${s.jx})`);
      await F.up(3); await wait(80); s = await F.state(); B(!s.aDown && !s.cDown && s.stickId !== null && s.jx > 0.5, `${path}: Pass lets go on its lift, the thumb still running (jx ${s.jx})`);
      await F.up(1); await wait(80); s = await F.state(); B(s.stickId === null && s.jx === 0, `${path}: and the thumb lets go on its own`);
      B(!F.errors.length, `${path}: no page errors (${F.errors.join('; ')})`); await F.close();
    }
    {                                                      // 8: the browser still claims the dead thumb's capture, and Sprint is down: a new thumb takes the stick at its touchstart
      const F = await open({ seen:true }); const C = await F.at('#btnC');
      await claim(F, ['zone']);
      await F.thumb(1); await F.down(2, C.x, C.y); await wait(100);
      await F.ev(L => { window.__lose = new Set(L); }, LOSE); await F.up(1); await F.ev(() => { window.__lose = null; }); await wait(150);
      let s = await F.state(); B(s.stickId !== null && s.jx > 0.5 && s.cDown, 'claimed capture, Sprint down: the thumb\'s lift unheard, so the run is still held (the page can\'t know yet)');
      await F.down(3, 260, 300); await wait(50); s = await F.state();
      B(s.stickId !== null && s.jx === 0 && s.cDown, `a new thumb with Sprint down takes the stick at once (jx ${s.jx}), Sprint still held`);
      await F.move(3, 190, 300); await wait(80); s = await F.state(); B(s.jx < -0.5, `and steers (jx ${s.jx})`);
      await F.up(3); await wait(80); s = await F.state(); B(s.stickId === null && s.jx === 0 && s.cDown, 'its lift lets go of the stick, and Sprint is still held');
      await F.up(2); await wait(80); s = await F.state(); B(!s.cDown, 'Sprint lets go on its own lift');
      B(!F.errors.length, `no page errors (${F.errors.join('; ')})`); await F.close();
    }
    {                                                      // 9: every capture claimed and no pointer lift heard, only the touches' ends: each hold lets go as its finger leaves the list (Chromium's pointer ids aren't its touch identifiers either), and with none left nothing is held, Kick as cancelled
      const F = await open({ seen:true }); const C = await F.at('#btnC'), K = await F.at('#btnB');
      await claim(F, ['zone', 'btnA', 'btnB', 'btnC']); await countCancels(F);
      await F.thumb(1); await F.down(2, C.x, C.y); await F.down(3, K.x, K.y); await wait(100);
      let s = await F.state(); B(s.stickId !== null && s.jx > 0.5 && s.cDown && s.bDown, 'the stick, Sprint and Kick held at once');
      const ids = await F.ev(() => ({ pointers:[window.__tryline.input.stickId, document.getElementById('btnC')._pointerId], touches:[window.__tryline.input.stickTid, document.getElementById('btnC')._tid] }));
      B(ids.touches.every(t => t != null) && ids.touches.join() !== ids.pointers.join(), `each hold named with its own touch, which isn't its pointer's id (pointers ${ids.pointers}, touches ${ids.touches})`);
      await F.ev(() => { window.__lose = new Set(['pointerup', 'pointercancel', 'lostpointercapture']); });
      await F.up(2); await wait(60); s = await F.state();
      B(!s.cDown && s.stickId !== null && s.jx > 0.5 && s.bDown, `Sprint's touch ends, its pointerup unheard: Sprint lets go; the stick and Kick, whose touches it lists, stay (cDown ${s.cDown}, jx ${s.jx}, bDown ${s.bDown})`);
      await F.up(1); await wait(60); s = await F.state(); B(s.stickId === null && s.jx === 0 && s.bDown, `the thumb's: the stick lets go, Kick stays (stick ${s.stickId}, bDown ${s.bDown})`);
      const c0 = s.bCancels; await F.up(3); await wait(100); s = await F.state();
      B(!s.bDown && s.bCancels === c0, `Kick's own touch ends, its pointerup unheard: nothing held, and Kick let go as a lift, not cancelled, whatever order the browser sends (bDown ${s.bDown}, cancels ${s.bCancels - c0})`);
      await F.ev(() => { window.__lose = null; });
      await F.down(4, 260, 300); await F.move(4, 190, 300); await wait(80); s = await F.state(); B(s.stickId !== null && s.jx < -0.5, `a new thumb takes the stick and steers (jx ${s.jx})`);
      await F.up(4); await wait(60);
      B(!F.errors.length, `no page errors (${F.errors.join('; ')})`); await F.close();
    }
    done();
  } finally { await browser.close(); server.close(); }
}
