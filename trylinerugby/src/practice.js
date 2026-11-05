/* =========================================================
   Practice ground: small scenarios using the match's real input and rules.
   No championship result, played count or tutorial memory is written here.
   ========================================================= */
const PRACTICE_DRILLS = [
  { id:'defend', name:'Defend a Breakaway', objective:'Switch into cover and stop the runner', cue:'Your first defender is beaten. Press Switch, run towards the carrier and Tackle. Sprint helps you close the gap.', limit:18 },
  { id:'pass', name:'Create a Two-on-One', objective:'Pass to support, then score a try', cue:'Run towards the defender to draw him in. Pass to the dashed-ringed runner, then run for the right-hand try line.', limit:22 },
  { id:'kick', name:'Kick a Conversion', objective:'Put the conversion between the posts', cue:'Steer the arrow with your run controls. Hold Kick and let go in the gold band.', limit:45 }
];
function practiceInstructions(id) {
  const touch = lastDev === 'touch';
  const name = (word, act) => word + (touch ? '' : ' (' + seatKey(0, act) + ')');
  if (id === 'defend') return 'Your first defender is beaten. Press ' + name('Switch', 'b') + ', run towards the carrier and ' + name('Tackle', 'a') + '. ' + name('Sprint', 'c') + ' helps you close the gap.';
  if (id === 'pass') return 'Run towards the defender to draw him in. ' + name('Pass', 'a') + ' to the dashed-ringed runner, then run for the right-hand try line.';
  return 'Steer the arrow with your run controls. Hold ' + name('Kick', 'a') + ' and let go in the gold band.';
}
function practiceRestore() {
  if (!practice) return;
  const snapshot = practice.settings;
  for (const key of Object.keys(settings)) delete settings[key];
  Object.assign(settings, snapshot);
  practice = null;
  $('practice-cue').hidden = true; $('m-practice').hidden = true;
  for (const id of ['m-pause', 'm-break', 'm-tut', 'm-pen']) $(id).hidden = true;
  releaseAll(); clearBanner();
}
function practiceLeave() { practiceRestore(); exitMatch(); }
function practiceChoose() {
  practiceRestore();
  setTwo(false); startDemo();
  $('hud').hidden = $('controls').hidden = $('b-pause').hidden = true;
  showScreen('s-practice');
}
function practiceStart(id) {
  const drill = PRACTICE_DRILLS.find(d => d.id === id); if (!drill) return;
  practiceRestore(); releaseAll(); setTwo(false); lockLandscape(); ac();
  practice = { ...drill, settings:JSON.parse(JSON.stringify(settings)), elapsed:0, done:false, switched:false, completedPass:false };
  // Existing hints remain available; first-time tutorial cards and coach memory belong to normal matches.
  settings.tut = TUT_IDS.slice(); settings.coach = false;
  newMatch(DEFAULT_TEAM, CLUBS[1], { halfLen:120, diff:0, duels:'off', humans:[true, false] });
  M.practice = id; M.phase = 'play'; M.set = null; M.cut = null; M.goal = null;
  const own = M.players.filter(p => p.team === 0), cpu = M.players.filter(p => p.team === 1);
  const place = (p, x, y) => { p.x = x; p.y = y; p.hx = x; p.hy = y; p.vx = p.vy = 0; p.down = 0; p.tcd = 0; p.offside = 0; p.fx = dirOf(p.team); p.fy = 0; };
  if (id === 'defend') {
    M.players = [own[0], own[1], cpu[0]];
    place(cpu[0], 49, 35); place(own[0], 56, 35); place(own[1], 36, 39);
    setCarrier(cpu[0]); setCtrl(0, own[0]); practice.initialCtrl = own[0];
  } else if (id === 'pass') {
    M.players = [own[0], own[1], cpu[0]];
    place(own[0], 83, 31); place(own[1], 80, 42); place(cpu[0], 94, 31);
    setCarrier(own[0]); practice.firstCarrier = own[0];
  } else {
    M.wind = { ...M.wind, mph:0 };
    goalKick(0, 96, 29, 'conversion');
  }
  M.cam.x = id === 'defend' ? 44 : 91; M.cam.y = 35;
  mode = 'match'; showScreen(null);
  $('hud').hidden = false; $('controls').hidden = false; $('b-pause').hidden = false;
  $('h-t0').hidden = $('h-t1').hidden = true;
  $('h-n0').textContent = M.nat[0].id; $('h-n1').textContent = M.nat[1].id;
  $('h-k0').style.setProperty('--k', showCol(0)); $('h-k1').style.setProperty('--k', showCol(1));
  $('pr-objective').textContent = drill.objective; $('pr-cue').textContent = practiceInstructions(id);
  $('practice-cue').hidden = true; lastHud = ''; lastBtn = ''; restStick();
  practice.ready = true; M.paused = true;
  $('pr-result').textContent = drill.name; $('pr-feedback').textContent = practiceInstructions(id);
  $('pr-retry').textContent = 'Start Drill'; $('pr-next').hidden = true;
  $('m-practice').hidden = false; $('controls').hidden = true; $('b-pause').hidden = true;
  if ($('pr-retry').focus) $('pr-retry').focus();
}
function practiceFinish(won, feedback) {
  if (!practice || practice.done) return;
  practice.ready = false; practice.done = true; practice.won = !!won; M.paused = true;
  $('pr-retry').textContent = 'Try Again'; $('pr-next').hidden = false;
  $('pr-result').textContent = won ? 'Well Played' : 'Have Another Go';
  $('pr-feedback').textContent = feedback;
  $('m-practice').hidden = false; $('practice-cue').hidden = true;
  $('controls').hidden = true; $('b-pause').hidden = true;
  releaseAll(); setFocus(null);
  if ($('pr-retry').focus) $('pr-retry').focus();
}
function practiceTick(dt) {
  if (!practice || practice.done || !M || M.paused) return;
  practice.elapsed += dt;
  if (practice.id === 'defend' && ctrlOf(0) !== practice.initialCtrl) practice.switched = true;
  if (practice.id === 'pass') {
    const b = M.ball;
    if (b.state === 'held' && b.carrier.team === 0 && b.carrier !== practice.firstCarrier && M.stats.passes > 0) practice.completedPass = true;
    if ((b.state === 'held' && b.carrier.team === 1) || M.phase === 'set') return practiceFinish(false, 'Keep the defender with the ball carrier, then pass before contact. Try again.');
  }
  if (practice.elapsed >= practice.limit) practiceFinish(false, practice.id === 'kick' ? 'Take your time to aim, then hold Kick and release in gold.' : 'Try again: ' + practice.cue);
}
$('b-practice').addEventListener('click', practiceChoose);
$('pr-back').addEventListener('click', goHome);
for (const id of ['defend', 'pass', 'kick']) $('pr-' + id).addEventListener('click', () => practiceStart(id));
$('pr-retry').addEventListener('click', () => {
  if (!practice) return;
  if (!practice.ready) { practiceStart(practice.id); return; }
  practice.ready = false; M.paused = false; releaseAll();
  $('m-practice').hidden = true; $('controls').hidden = false; $('b-pause').hidden = false;
  $('practice-cue').hidden = practice.id === 'kick';
});
$('pr-next').addEventListener('click', () => practiceStart(PRACTICE_DRILLS[(PRACTICE_DRILLS.findIndex(d => d.id === practice.id) + 1) % PRACTICE_DRILLS.length].id));
$('pr-select').addEventListener('click', practiceChoose);

