// Single-player touch lifecycle: pointer ownership and cancelled actions.
process.env.SEED ??= '11';
const {T, fire} = await import('./harness.mjs');
const D = T.debug, I = T.input, $ = id => document.getElementById(id);
let passed = 0;
const ok = (value, message) => { if (!value) throw Error(message); passed++; };
const event = (id, type, pointerId) => $(id).fire(type, {pointerId, clientX:700, clientY:300});
const key = (code, down) => T.onKey({code,repeat:false,preventDefault(){}},down);
function fresh(kind='past') {
  D.releaseTouch(); D.releaseAll(); D.setTwo(false);
  T.newMatch(0,1,{halfLen:240,diff:1,duels:'off'}); D.setMode('match'); D.stage(kind);
  for(const id of ['m-pause','m-break','m-pen','m-tut','m-practice']) $(id).hidden=true;
  return T.M;
}
function defence() {
  const m=fresh('tackle'), original=T.sides.ctrlOf(0), cover=m.players.find(p=>p.team===0&&p!==original);
  original.x=75; original.y=35; cover.x=45; cover.y=35;
  return {m,original,cover};
}
// A second finger over the same button never steals the original finger's hold.
{
  fresh(); event('btnB','pointerdown',21); event('btnB','pointerdown',22); event('btnB','pointerup',22);
  ok(I.bDown && $('btnB')._held, 'second finger release leaves the original Kick held');
  event('btnB','pointercancel',22);
  ok(I.bDown && !I.bCancel, 'second finger cancellation cannot cancel the original Kick');
  event('btnB','pointerup',21);
  ok(!I.bDown && !$('btnB')._held, 'owning finger still releases Kick');
}
// Canvas release fallback is scoped to the finger that began each action.
{
  fresh(); event('btnC','pointerdown',31); event('btnB','pointerdown',32);
  event('cv','pointerup',99);
  ok(I.cDown && I.bDown, 'unrelated pitch finger releases neither action');
  event('cv','pointercancel',99);
  ok(I.cDown && I.bDown && !I.cCancel && !I.bCancel, 'unrelated pitch cancellation leaves both actions intact');
  event('cv','pointerup',31);
  ok(!I.cDown && I.bDown, 'canvas fallback releases only the matching Sprint finger');
  event('cv','pointercancel',32);
  ok(!I.bDown && I.bCancel, 'canvas fallback cancels the matching Kick finger');
}
// Cancellation before the next simulation frame must not perform a defender switch.
for (const [id, action] of [['btnB','Switch'],['btnC','Sprint']]) {
  const {original,cover}=defence();
  ok((id==='btnB' ? T.contact.switchTarget(0) : T.contact.sprintPick(0))===cover, action+' would select the nearer defender');
  event(id,'pointerdown',41); event(id,'pointercancel',41); T.update(T.STEP);
  ok(T.sides.ctrlOf(0)===original, 'cancelled '+action+' does not change defender');
  ok(!I.bCancel && !I.cCancel, 'action cancellations are consumed once per frame');
  event(id,'pointerdown',42); T.update(T.STEP);
  ok(T.sides.ctrlOf(0)===cover, 'fresh '+action+' works after cancellation');
  event(id,'pointerup',42);
}
// Pointer ownership must not disturb the independent keyboard source bit.
{
  fresh(); key('KeyL',true); event('btnC','pointerdown',51); event('btnC','pointerup',51);
  ok(I.cDown && I.src.c===1, 'touch release leaves a keyboard Sprint hold intact');
  key('KeyL',false); ok(!I.cDown && I.src.c===0, 'keyboard source releases independently');
}
// Cancelling the touch source must not cancel a simultaneous valid keyboard action.
{
  const {cover}=defence(); key('KeyL',true);
  event('btnC','pointerdown',55); event('btnC','pointercancel',55); T.update(T.STEP);
  ok(T.sides.ctrlOf(0)===cover && I.cDown && I.src.c===1, 'touch cancel preserves a valid keyboard Sprint and defender switch');
  key('KeyL',false);
  const m=fresh(); key('KeyK',true); T.update(T.STEP);
  event('btnB','pointerdown',56); event('btnB','pointercancel',56); T.update(T.STEP);
  ok(m.side[0].charging && I.bDown && I.src.b===1, 'touch cancel preserves an ongoing keyboard Kick hold');
  key('KeyK',false); T.update(T.STEP);
  ok(m.stats.kicks===1, 'keyboard Kick releases normally after touch cancellation');
}
// Rotation clears ownership so a new finger can operate the button immediately.
{
  fresh(); event('btnB','pointerdown',61); D.phoneUpright(); D.resume();
  ok(!$('btnB')._held && $('btnB')._pointerId==null && !I.bDown, 'rotation clears the owning touch');
  event('btnB','pointerdown',62); T.update(T.STEP);
  ok(T.M.side[0].charging, 'new finger can charge Kick after rotation');
  event('btnB','pointerup',62);
}
// Losing focus may lose the old pointerup entirely. A fresh finger must still work.
{
  fresh(); event('btnB','pointerdown',101); T.update(T.STEP);
  fire('blur');
  ok(T.M.paused && !$('btnB')._held && $('btnB')._pointerId==null && !$('btnB').classList.contains('press'), 'blur clears the old button owner and pressed appearance');
  D.resume(); event('btnB','pointerdown',102); T.update(T.STEP);
  ok(T.M.side[0].charging && I.bDown && $('btnB')._pointerId===102, 'fresh Kick finger works after a lost release on blur');
  event('btnB','pointerup',101);
  ok(I.bDown && $('btnB')._pointerId===102, 'late release from before blur cannot release the new finger');
  event('btnB','pointerup',102);
}
// The same all-input reset is used on a new match or input-scheme change.
{
  fresh(); event('zone','pointerdown',111); event('btnC','pointerdown',112);
  D.setTwo(false);
  ok(I.stickId===null && !$('btnC')._held && $('btnC')._pointerId==null && !I.cDown, 'scheme reset clears stick and action pointer ownership');
  event('zone','pointerdown',113);
  ok(I.stickId===113, 'a fresh stick finger is accepted after reset');
  key('KeyL',true); ok(I.cDown && I.src.c===1, 'keyboard routing still accepts Sprint after reset');
  key('KeyL',false); event('zone','pointerup',113);
}
console.log('Input lifecycle: '+passed+' assertions passed');
