// HUD action availability follows the real possession state, including pass flight.
// node tools/polish.mjs
process.env.SEED ??= '11';
const { T } = await import('./harness.mjs');
const D = T.debug, S = T.sides, $ = id => document.getElementById(id);
let passed = 0;
const ok = (value, message) => { if (!value) throw new Error(message); passed++; };

for (const twoPlayer of [false, true]) {
  const humanTeam = 0, mode = twoPlayer ? 'two player' : 'solo';
  T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'off', humans:[true, twoPlayer] });
  D.setMode('match');
  const m = T.M, b = m.ball;
  m.phase = 'play'; m.cut = null; m.set = null;
  const carrier = m.players.find(p => p.team === humanTeam);
  const receiver = m.players.find(p => p.team === humanTeam && p !== carrier);
  S.setCtrl(humanTeam, carrier);
  Object.assign(b, { state:'held', carrier, f:null });
  D.updateHud();
  ok(!$('btnA').classList.contains('idle') && !$('btnB').classList.contains('idle'), `${mode}: carrying enables Pass and Kick`);

  // Real pass action changes possession to an airborne pass and control to its receiver.
  Object.assign(carrier, { x:60, y:35, hold:2, bind:null });
  Object.assign(receiver, { x:60 - (humanTeam === 0 ? 5 : -5), y:43, down:0, bind:null });
  T.contact.doPass(carrier, receiver);
  ok(b.state === 'air' && b.f.kind === 'pass' && S.ourBall(humanTeam), `${mode}: real pass retains team possession in flight`);
  D.updateHud();
  ok($('btnA').classList.contains('idle') && $('btnB').classList.contains('idle'), `${mode}: own pass flight dims actions that cannot act`);

  // The catch restores both actions without changing the labels or requiring a new match.
  Object.assign(b, { state:'held', carrier:receiver, f:null });
  S.setCtrl(humanTeam, receiver);
  D.updateHud();
  ok(!$('btnA').classList.contains('idle') && !$('btnB').classList.contains('idle'), `${mode}: catch restores Pass and Kick`);

  const opponent = m.players.find(p => p.team !== humanTeam);
  const opponentReceiver = m.players.find(p => p.team !== humanTeam && p !== opponent);
  Object.assign(b, { state:'held', carrier:opponent, f:null });
  T.contact.doPass(opponent, opponentReceiver);
  D.updateHud();
  ok($('la').textContent === 'Tackle' && $('lb').textContent === 'Switch' && !$('btnB').classList.contains('idle'), `${mode}: opponent flight keeps Switch available`);
}
console.log(`Polish: ${passed} assertions passed`);
