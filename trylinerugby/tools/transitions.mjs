// Regressions for controls crossing pause and close-up boundaries.
process.env.SEED ??= '11';
const { T, padStub, fire } = await import('./harness.mjs');
const D = T.debug, I = T.inputs, STEP = T.STEP, $ = id => document.getElementById(id);
let passed = 0;
function ok(value, message) { if (!value) throw Error(message); passed++; }
const key = (code, down = true) => T.onKey({ code, repeat:false, preventDefault() {} }, down);
function fresh() {
  D.setTwo(false); D.releaseAll();
  T.newMatch(0, 1, { halfLen:240, diff:1, duels:'off' }); D.setMode('match');
  D.stage('past');
  // Stage a safe, ordinary kick outside drop-goal range, away from any tackler.
  T.M.players = T.M.players.filter(p => p.team === 0);
  T.M.side[0].ctrl.x = T.M.ball.x = 50;
  for (const id of ['m-pause', 'm-break', 'm-pen', 'm-tut', 'm-practice']) $(id).hidden = true;
  return T.M;
}
function noKick(m, message) {
  D.resume(); T.update(STEP);
  ok(m.ball.state === 'held' && m.stats.kicks === 0, message);
  ok(!m.side[0].charging && m.side[0].charge === 0, 'pending charge was cancelled');
}
// Actual keyboard press -> pause -> release on the card -> resume.
{
  const m = fresh(); key('KeyK'); T.update(STEP);
  ok(m.side[0].charging, 'keyboard Kick starts a charge');
  D.pause(); key('KeyK', false); noKick(m, 'keyboard release during pause does not kick on resume');
  key('KeyK'); T.update(STEP); key('KeyK', false); T.update(STEP);
  ok(m.stats.kicks === 1 && m.ball.state === 'air', 'a fresh keyboard Kick still works');
}
// Phone rotation cancels the touch hold; resuming must not turn that cancel into a chip.
{
  const m = fresh();
  $('btnB').fire('pointerdown', { pointerId:31 }); T.update(STEP);
  ok(m.side[0].charging, 'touch Kick starts a charge');
  D.phoneUpright(); noKick(m, 'rotation cancellation does not kick on resume');
  ok(!I[0].bDown && !I[0].src.b, 'rotation clears the touch source');
}
// Controller releases continue to reach their slot on the pause card.
{
  const m = fresh();
  const gp = { index:0, mapping:'standard', connected:true, axes:[0,0], buttons:Array.from({length:16}, () => ({pressed:false,value:0})) };
  const set = (n,v) => { gp.buttons[n] = {pressed:!!v,value:v}; };
  padStub([gp]); fire('gamepadconnected', {gamepad:gp});
  set(1,1); T.pollPads(); T.update(STEP);
  ok(m.side[0].charging, 'controller Kick starts a charge');
  D.pause(); set(1,0); T.pollPads(); noKick(m, 'controller release during pause does not kick on resume');
  set(1,1); T.pollPads(); T.update(STEP); set(1,0); T.pollPads(); T.update(STEP);
  ok(m.stats.kicks === 1, 'fresh controller Kick works after resuming');
  D.padGone(0); padStub([]);
}
// A goal close-up retains its existing dedicated reset, rather than releasing a partial kick.
{
  fresh(); D.goalKick(0,96,29,'conversion');
  const g = T.M.goal;
  for(let i=0;i<30;i++) T.update(STEP);
  key('KeyJ'); for(let i=0;i<8;i++) T.update(STEP);
  ok(g.stage === 'power' && g.m > 0, 'conversion meter is charging through real input');
  D.pause(); key('KeyJ',false); D.resume(); T.update(STEP);
  ok(g.stage === 'aim' && g.m === 0 && !g.judged, 'resume returns conversion to aim without striking');
}
console.log('Transitions: ' + passed + ' assertions passed');
