/* =========================================================
   Skill Games: the drill picker (the home's Skill Games step), the ready and result card, and the rules every drill keeps.
   No championship result, played count or tutorial memory is written here. The drills themselves are in training.js.
   practiceStart(id, { onDone, leaveLabel? }) runs a drill for a caller (the career): every way out of it (the card's Back to
   Career, or leaveLabel; Back or Escape on the card; Pause then Back to Career) restores the settings exactly as leaving does,
   shows the home screen, then calls onDone({ id, stars, success, skill, role? }) once. It reports the best finished run of the visit, so
   Try Again never costs what was won; a visit with no finished run reports quit: true and 0 stars.
   ========================================================= */
const PRACTICE_DRILLS = [                                   // tag and handling first; contact marks the games under Contact Games (U9 and Up), which the Kids level and a career's Minis never reach
  { id:'tag', name:'Tag Chase', objective:'Keep Your Tags, Pull Theirs', limit:70 },
  { id:'egg', name:'Bouncy Egg', objective:'Catch the Ball', limit:75 },
  { id:'circle', name:'Pass Around the Circle', objective:'Beat the Ball Home', limit:110, roles:true },
  { id:'cones', name:'Cones', objective:'Beat the Clock', limit:45 },
  { id:'pass', name:'Create a Gap', objective:'Draw Your Defender, Then Pass', cue:'Run at your defender. Pass when the ring turns gold.', limit:22 },   // the id from when it was Create a Two-on-One: saves, stars, the career and the Locker read it
  { id:'kick', name:'Kicking', objective:'Five Goal Kicks', cue:'Aim the arrow with your run controls. Hold Kick and let go in the gold band.', limit:150, kids:true },
  { id:'defend', name:'Defend a Breakaway', objective:'Get Across and Stop the Runner', tagObjective:'Get Across and Pull the Tag', tackles:true, cue:'Press Switch, run across and Tackle. Sprint closes the gap.', tagCue:'Press Switch, run across and Pull Tag. Sprint closes the gap.', limit:18 },
  { id:'tackle', name:'Tackling', objective:'Set, Aim, Tackle, Squeeze', limit:90, contact:true },
  { id:'scrum', name:'Driving', objective:'Win the Drive', limit:60, contact:true, kids:true },
  { id:'back', name:'Ball Back', objective:'Hands, Landing, Ball Back', limit:60, contact:true },
];
const PRACTICE_COACH = 'Learn Real Tackling With a Club Coach. Not One to Try at Home.';
const practiceYoung = () => kidsLevel() || settings.cat === 'minis';   // the youngest: the Kids level, or Minis picked on the team screen (Men | Women | Minis), in free play as much as on the career's own list
function practiceBarred(id) {                              // the one rule, for every route in: no contact game for the youngest
  const d = PRACTICE_DRILLS.find(x => x.id === id);
  return !!(d && d.contact && practiceYoung());
}
function practiceNextId(id) {                              // Next Game: the next one this player may play
  const n = PRACTICE_DRILLS.length, i = PRACTICE_DRILLS.findIndex(d => d.id === id);
  for (let k = 1; k <= n; k++) { const d = PRACTICE_DRILLS[(i + k) % n]; if (!practiceBarred(d.id)) return d.id; }
  return id;
}
function practiceGroups() {                                // the picker as this player sees it, the grown-ups' panel shut
  $('pr-contact').hidden = practiceYoung();
  $('pr-games').hidden = false; $('pr-grownups').hidden = true;
}
function practiceInstructions(id) {
  const name = drillName;
  if (id === 'defend') return 'Press ' + name('Switch', 'b') + ', run across and ' + name(practiceYoung() ? 'Pull Tag' : 'Tackle', 'a') + '. ' + name('Sprint', 'c') + ' closes the gap.';
  if (id === 'pass') return 'Run at your defender. ' + name('Pass', 'a') + ' when the ring turns gold.';
  const kit = DRILL_KIT[id];
  return kit && kit.howTo ? kit.howTo() : '';
}
function practiceRestore() {
  if (!practice) return;
  if (practice.demo) demoClean();
  const snapshot = practice.settings;
  for (const key of Object.keys(settings)) delete settings[key];
  Object.assign(settings, snapshot);
  practice = null;
  $('practice-cue').hidden = true; $('m-practice').hidden = true; $('drill-hud').hidden = true;
  for (const id of ['m-pause', 'm-break', 'm-tut', 'm-pen']) $(id).hidden = true;
  releaseAll(); clearBanner();
  lockerFlush();                                           // a drill's first three stars reach the save now, with the settings back as they were (src/locker.js)
}
function practiceResult(p) {                               // a run as a caller hears it: the stars shown on its result card, or quit when it was left unfinished
  const kit = DRILL_KIT[p.id], done = !!p.done;
  return { id:p.id, stars:done ? p.stars : 0, success:done && !!p.won, ...(kit && kit.result ? kit.result() : {}), ...(done ? {} : { quit:true }) };
}
const practiceBest = (a, b) => (!a ? b : !b ? a : b.stars >= a.stars ? b : a);   // a caller's better finished run: more stars, the later on a tie
function practiceHandBack() {                              // a caller's drill ends: settings back as leaving puts them, the home screen up, then its onDone, once, with the visit's best finished run
  const p = practice, fn = p.opts.onDone;
  const res = p.best || practiceResult(p);
  p.opts = null;
  practiceRestore(); exitMatch();
  fn(res);
}
function practiceLeave() { if (practice && practice.opts) { practiceHandBack(); return; } practiceRestore(); exitMatch(); }
function practiceChoose() {                                // Back to Skill Games: the home, on Skill Games where every drill is picked, the drill just played in focus
  if (practice && practice.opts) { practiceHandBack(); return; }
  const id = practice && practice.id;
  practiceRestore();
  setTwo(false); startDemo();
  $('hud').hidden = $('controls').hidden = $('b-pause').hidden = true;
  practiceGroups();                                        // the contact group shown or hidden for this player, the grown-ups' panel shut
  goHome(id ? $('pr-' + id) : null);                       // a drill never writes the settings: back on the home's Skill Games step, where it was picked
}
/* The two sides on a drill's pitch play at these ability sums, whatever their clubs are rated this season: a drill's timing and its stars are the drill's, and don't move when a league's band does. */
const DRILL_SUMS = [13, 8];
function practiceStart(id, opts, noDemo) {                 // noDemo: Watch How rebuilding its own drill
  const drill = PRACTICE_DRILLS.find(d => d.id === id); if (!drill || practiceBarred(id)) return;
  const tagOnly = practiceYoung();                         // read before the run's own settings: for the youngest, no open-play game ever ends in a tackle (training.js)
  const kit = DRILL_KIT[id];
  const keep = opts && typeof opts.onDone === 'function' ? opts : null;
  practiceRestore(); releaseAll(); setTwo(false); lockLandscape(); ac();
  const firstTime = !settings.drillSeen.includes(id) && !noDemo;   // Watch How plays the first time this device opens the drill, until it has really been seen (demoMark)
  practice = { ...drill, tagOnly, ...(tagOnly && drill.tagCue ? { cue:drill.tagCue } : {}), opts:keep, best:null, settings:JSON.parse(JSON.stringify(settings)), elapsed:0, done:false, switched:false, completedPass:false, stars:0, won:false, space:false, cam:null, cueKey:'', role:null };
  // Existing hints remain available; first-time tutorial cards and coach memory belong to normal matches.
  settings.tut = TUT_IDS.slice(); settings.coach = false;
  // Every game plays on Easy, its two sides at DRILL_SUMS whatever their clubs are rated. At Kids, Kicking (and Driving, which the Kids
  // level never reaches: a contact game) also take a Kids match's own help (kids.js: the aim set for you, a wider gold band and a slower
  // meter), as the career's Train sends a Kids player to them. They take it at the start of the Kids scale (newMatch is given no kidsR),
  // the help they always had, whatever the child's rating. The others stay as they are: the training spaces never read M.kids, and Kids'
  // automatic switch would play Defend a Breakaway for you.
  newMatch({ ...DEFAULT_TEAM, ...abilitiesFor(TEAM_FLAVOUR.get(DEFAULT_TEAM.id), DRILL_SUMS[0]) }, { ...CLUBS[1], ...abilitiesFor(TEAM_FLAVOUR.get(CLUBS[1].id), DRILL_SUMS[1]) }, { halfLen:120, diff:0, duels:'off', humans:[true, false], kids:!!drill.kids && kidsLevel() });
  M.practice = id; M.phase = 'play'; M.set = null; M.cut = null; M.goal = null; M.kit = DV_KITS;
  const own = M.players.filter(p => p.team === 0), cpu = M.players.filter(p => p.team === 1);
  kit.setup(own, cpu);
  if (practice.cam) { M.cam.x = practice.cam.x; M.cam.y = practice.cam.y; }
  mode = 'match'; showScreen(null);
  $('hud').hidden = true; $('controls').hidden = false; $('b-pause').hidden = false;   // a drill shows its own bar, not the scorebug
  $('h-t0').hidden = $('h-t1').hidden = true;
  $('h-n0').textContent = M.nat[0].id; $('h-n1').textContent = M.nat[1].id;
  $('h-k0').style.setProperty('--k', showCol(0)); $('h-k1').style.setProperty('--k', showCol(1));
  $('pr-objective').textContent = (tagOnly && drill.tagObjective) || drill.objective; $('pr-cue').textContent = practiceInstructions(id);
  $('practice-cue').hidden = true; $('drill-hud').hidden = true; drillHudKey = ''; lastHud = ''; lastBtn = ''; restStick();
  practice.ready = true; M.paused = true;
  $('pr-icon').innerHTML = drillIconSvg(id);
  $('pr-result').textContent = drill.name; $('pr-feedback').textContent = practiceInstructions(id);
  $('pr-stars').hidden = true; $('pr-tip').hidden = true; $('pr-coach').hidden = !(drill.contact || (drill.tackles && !tagOnly));
  $('pr-roles').hidden = !drill.roles; $('pr-retry').hidden = !!drill.roles;
  $('pr-watch').hidden = false; $('pr-go').classList.toggle('one', !!drill.roles);
  $('pr-retry').textContent = 'Play'; $('pr-next').hidden = true;
  practiceLeaveLabel();
  $('m-practice').hidden = false; $('controls').hidden = true; $('b-pause').hidden = true;
  const first = drill.roles ? $('pr-runner') : $('pr-retry');
  if (first.focus) first.focus();
  if (firstTime) demoStart();
}
const practiceBackText = () => (practice.opts ? (practice.opts.leaveLabel || 'Back to Career') : 'Back to Skill Games');   // the card's leave button and the pause card's
function practiceLeaveLabel() {                            // Back to Skill Games on its own row, or beside Next Game; a caller's drill goes Back to Career unless it names its own
  $('pr-eyebrow').textContent = practice.opts ? 'Training' : 'Skill Games';   // the place it came from: the home's Skill Games, or a caller's training (the career's Train)
  $('pr-select').textContent = practiceBackText();
  $('pr-row').classList.toggle('one', !!$('pr-next').hidden);
}
function practiceGo() {                                    // the ready card's Start: the drill runs
  practice.ready = false; M.paused = false; releaseAll();
  demoMark();                                              // started by hand: no demo on its next open
  for (const inp of inputs) inp.aPressed = inp.bPressed = inp.cPressed = false;
  $('m-practice').hidden = true; $('controls').hidden = false; $('b-pause').hidden = false;
  $('practice-cue').hidden = !(practice.id === 'defend' || practice.id === 'pass');
  $('drill-hud').hidden = false; drillHudKey = ''; drillHudSync();
}
function practiceFinish(won, feedback, stars) {
  if (!practice || practice.done) return;
  if (practice.demo) { demoEnd(!!won); return; }           // Watch How records nothing: no stars, no best, no card
  stars = stars == null ? (won ? 3 : 0) : clamp(Math.round(stars), 0, 3);
  practice.ready = false; practice.done = true; practice.won = !!won; practice.stars = stars; M.paused = true;
  lockerDrill(practice.id, stars);                         // three stars: Star Pupil (src/locker.js), saved when the drill is left
  if (practice.opts) practice.best = practiceBest(practice.best, practiceResult(practice));   // taken now, while the run (its role included) is as shown
  $('pr-retry').textContent = 'Try Again'; $('pr-retry').hidden = false; $('pr-roles').hidden = true;
  $('pr-watch').hidden = true; $('pr-go').classList.add('one');
  $('pr-next').hidden = !!practice.opts;                   // a caller picks the next drill itself
  practiceLeaveLabel();
  $('pr-result').textContent = won ? 'Well Played' : 'Have Another Go';
  $('pr-stars').innerHTML = drillStarsHtml(stars); $('pr-stars').setAttribute('aria-label', stars + (stars === 1 ? ' Star' : ' Stars')); $('pr-stars').hidden = false;
  $('pr-feedback').textContent = feedback;
  { const kit = DRILL_KIT[practice.id], tip = kit && kit.tip ? kit.tip() : ''; $('pr-tip').textContent = tip; $('pr-tip').hidden = !tip; }   // a short line on what worked
  $('m-practice').hidden = false; $('practice-cue').hidden = true; $('drill-hud').hidden = true;
  $('controls').hidden = true; $('b-pause').hidden = true;
  releaseAll(); setFocus(null);
  if ($('pr-retry').focus) $('pr-retry').focus();
}
function practiceTick(dt) {
  if (!practice || practice.done || !M || M.paused) return;
  practice.elapsed += dt;
  const kit = DRILL_KIT[practice.id];
  if (kit.tick) kit.tick(dt);
  if (!practice || practice.done) return;
  if (kit.cue && !practice.demo) { const c = kit.cue(); if (c) drillCue(c[0], c[1]); else drillCue('', ''); }
  if (practice.elapsed >= practice.limit) {
    if (kit.timeUp) kit.timeUp();
    else practiceFinish(false, 'Try again: ' + practice.cue, 0);
  }
  if (practice && !practice.done) drillHudSync();
}
for (const d of PRACTICE_DRILLS) { $('pr-' + d.id).addEventListener('click', () => practiceStart(d.id)); $('pi-' + d.id).innerHTML = drillIconSvg(d.id); }
$('pr-retry').addEventListener('click', () => {
  if (!practice) return;
  if (!practice.ready) { const best = practice.best; practiceStart(practice.id, practice.opts); if (practice && practice.opts) practice.best = best; return; }   // a caller keeps the best run so far
  practiceGo();
});
for (const role of ['runner', 'passer']) $('pr-' + role).addEventListener('click', () => {   // Pass Around the Circle: the role is the start
  if (!practice || !practice.ready || !practice.roles) return;
  DRILL_KIT[practice.id].role(role);
  practiceGo();
});
$('pr-watch').addEventListener('click', () => { if (practice && practice.ready) demoStart(); });
$('pr-next').addEventListener('click', () => practiceStart(practiceNextId(practice.id), practice.opts));
$('pr-grown').addEventListener('click', () => { $('pr-games').hidden = true; $('pr-grownups').hidden = false; setFocus(null); const b = $('pr-grown-back'); if (b.focus) b.focus({ preventScroll:true }); $('pr-grownups').scrollTop = 0; });   // opens at its top (it scrolls inside the panel), with Back to Skill Games a key press away
$('pr-grown-back').addEventListener('click', () => { $('pr-games').hidden = false; $('pr-grownups').hidden = true; setFocus(null); const b = $('pr-grown'); if (b.focus) b.focus(); });
$('pr-select').addEventListener('click', practiceChoose);
