// Decision cues are attached to the actual pass/switch target and never alter play.
process.env.SEED ??= '11';
const { T, rndCalls } = await import('./harness.mjs');
const D = T.debug, C = T.contact, S = T.sides;
let passed = 0;
const ok = (value, message) => { if (!value) throw new Error(message); passed++; };
function fresh() {
  T.newMatch(0, 1, { halfLen:240, diff:1, headless:true, duels:'off' });
  D.setMode('match');
  const m = T.M;
  m.phase = 'play'; m.set = m.cut = null;
  for (const p of m.players) Object.assign(p, { x:p.team ? 115 : 5, y:5, down:0, bind:null, offside:0 });
  const own = m.players.filter(p => p.team === 0), opp = m.players.filter(p => p.team === 1);
  Object.assign(own[0], { x:60, y:32 }); Object.assign(own[1], { x:56, y:40 });
  Object.assign(opp[0], { x:57, y:40 });
  Object.assign(m.ball, { state:'held', carrier:own[0], x:60, y:32, f:null });
  S.setCtrl(0, own[0]); m.cam.x = 60; m.cam.y = 35;
  return { m, own, opp };
}
function paint(width = 844, height = 390) {
  const text = []; globalThis.__ctxSpy = (name, args) => { if (name === 'fillText') text.push(args); };
  D.view(width, height); D.render(0); globalThis.__ctxSpy = null;
  return text;
}
const relevant = m => JSON.stringify({ players:m.players.map(p => [p.x,p.y,p.vx,p.vy]), ball:[m.ball.state,m.ball.carrier?.team,m.ball.carrier?.n], stats:m.stats, score:m.score, phase:m.phase });
{
  const { m, own, opp } = fresh();
  ok(C.shownPass(own[0]).to === own[1] && C.shownPass(own[0]).marked, 'setup uses actual marked selected receiver');
  const before = relevant(m), draws = rndCalls();
  for (const [w,h] of [[667,375],[844,390],[932,430]]) {
    const cues = paint(w,h).filter(a => a[0] === 'Marked');
    ok(cues.length === 1, `one marked cue at ${w}x${h}`);
    ok(cues[0][1] >= 8 && cues[0][1] <= w-8 && cues[0][2] >= 83 && cues[0][2] <= h-20, 'cue stays inside phone play area');
  }
  ok(relevant(m) === before && rndCalls() === draws, 'render cues change neither match state nor random stream');
  opp[0].x = 100;
  ok(!paint().some(a => a[0] === 'Marked'), 'free receiver gets no permanent text');
  // A long pass changes the selected target; the warning must follow it, never its skipped man.
  Object.assign(own[2], { x:52, y:48 }); Object.assign(opp[0], { x:53, y:48 });
  T.input.jy = 1; S.side(0).pass = { mode:'hold', t:C.LONG.arm + 0.02 };
  ok(C.shownPass(own[0]).gold && C.shownPass(own[0]).to === own[2], 'long pass selects the farther runner');
  ok(paint().filter(a => a[0] === 'Marked').length === 1, 'long target gets one warning');
  own[2].y = 70; opp[0].y = 70; T.input.jy = 0; S.side(0).pass = null;
  Object.assign(own[1], { y:70 });
  ok(!paint().some(a => a[0] === 'Marked'), 'off-screen target gets no detached cue');
}
{
  const { m, own, opp } = fresh();
  Object.assign(opp[0], { x:50, y:35 }); Object.assign(own[0], { x:57, y:35 }); Object.assign(own[1], { x:41, y:39 });
  Object.assign(m.ball, { carrier:opp[0], x:50, y:35 });
  ok(C.switchUseful(0) && C.switchTarget(0) === own[1], 'beaten defender has useful cover target');
  ok(paint().filter(a => a[0] === 'Switch').length === 1, 'useful cover target named Switch');
  C.switchPlayer(0);
  ok(!C.switchUseful(0) && !paint().some(a => a[0] === 'Switch'), 'switch cue clears when cover defender is selected');
  m.phase = 'set';
  ok(!paint().some(a => a[0] === 'Switch' || a[0] === 'Marked'), 'decision cues stay off during set pieces');
}
console.log(`Feedback: ${passed} assertions passed`);
