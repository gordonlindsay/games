/* penalty choice: the card's kick is built now, so the card and the kick share one wind */
let penCtx = null;
function openPenalty(team, x, y, dP) {                     // the card for the human side the penalty went to; headless runs choose as the CPU does
  if (M.headless) { cpuPenalty(team, x, y, dP); return; }
  M.phase = 'menu';
  const g = makeGoal(team, penSpot(team, x), y, 'penalty', null);
  penCtx = { team, x, y, g };
  $('p-meta').textContent = Math.round(g.dist) + 'm to the Posts\u00a0· ' + (g.W.mph < KICK.wind.calm ? 'Calm' : 'Wind ' + Math.round(g.W.mph) + ' MPH');   // breaks after the dot, never before it
  $('p-goal').disabled = g.mClear > KICK.range;
  const s = M.two ? seatOfTeam(team) : null, eb = $('p-eyebrow');   // two player: the card names its player, in his colour, and only his seat acts on it (the mouse always can)
  eb.textContent = s == null ? 'Penalty' : 'Penalty · Player ' + (s + 1); eb.classList.toggle('p1', s === 0); eb.classList.toggle('p2', s === 1);
  navOnly = s;
  renderHintSwitches();                                    // the sublines (3 Points, or Out of Range) and the tick, for this player's Hints
  setFocus(null);
  $('m-pen').hidden = false;
}
for (const [id, c] of [['p-goal','goal'],['p-touch','touch'],['p-tap','tap']]) {
  $(id).addEventListener('click', () => { if (!penCtx) return; $('m-pen').hidden = true; navOnly = null; const p = penCtx; penCtx = null; penChoice(p.team, p.x, p.y, c, p.g); });
}

/* half time and full time */
let breakKind = 'half';
function fillScore(prefix) {
  $(prefix + 'n0').textContent = M.nat[0].id; $(prefix + 'n1').textContent = M.nat[1].id;
}
/* Full time only. Every number is one the match already counted: a slash is made of attempted, a dash is a side
   that does not play duels, and Metres Made is ground gained with the ball toward that side's try line. */
function fillMatchStats() {
  const el = $('br-stats');
  if (breakKind !== 'full') { el.hidden = true; return; }
  const S = M.stats, of = (made, att) => made + '/' + att;
  const row = (label, a, b) => `<tr><th scope="row">${label}</th><td>${a}</td><td>${b}</td></tr>`;
  const rows = [row('Conversions', of(S.conv.made[0], S.conv.att[0]), of(S.conv.made[1], S.conv.att[1]))];
  if (S.pen.att[0] + S.pen.att[1]) rows.push(row('Penalty Goals', of(S.pen.made[0], S.pen.att[0]), of(S.pen.made[1], S.pen.att[1])));
  if (S.dg.att[0] + S.dg.att[1]) rows.push(row('Drop Goals', of(S.dg.made[0], S.dg.att[0]), of(S.dg.made[1], S.dg.att[1])));
  rows.push(row('Tackles', of(S.tk.made[0], S.tk.att[0]), of(S.tk.made[1], S.tk.att[1])));
  const duel = t => isHuman(t) ? of(S.duelN.won[t], S.duelN.att[t]) : '\u2013';
  rows.push(row('Duels', duel(0), duel(1)));
  const metres = t => { const n = Math.round(S.gain[t]); return n < 0 ? '\u2212' + (-n) : String(n); };
  rows.push(row('Metres Made', metres(0), metres(1)));
  const head = t => `<th scope="col">${esc(M.nat[t].id)}</th>`;
  el.innerHTML = `<table><thead><tr><th scope="col"></th>${head(0)}${head(1)}</tr></thead><tbody>${rows.join('')}</tbody></table><p class="key">Made / attempted. Metres Made is ground gained with the ball.</p>`;
  el.hidden = false;
}
function showBreak(kind) {
  breakKind = kind;
  fillScore('br-');
  if (two.lost && two.lost.length) seatLost(two.lost[0]); else $('br-seat').hidden = true;
  $('br-eyebrow').textContent = kind === 'half' ? 'Half Time' : 'Full Time';
  $('br-sc').textContent = M.score[0] + ' – ' + M.score[1];
  $('br-tries').textContent = 'Tries ' + M.tries[0] + ' – ' + M.tries[1];
  $('br-pts').hidden = true;
  $('br-go').textContent = kind === 'half' ? 'Second Half' : M.two ? 'Rematch' : 'Continue';
  const pair = kind === 'full' && !!M.two;
  $('br-t0').hidden = $('br-t1').hidden = !M.two;          // the seat tags on the score row: a mirror match has two Farnhams
  if (kind === 'full') {
    const [a, b] = M.score;
    const res = M.two ? (a > b ? 'Player 1 Wins' : a < b ? 'Player 2 Wins' : 'Draw') : a > b ? M.nat[0].name + ' Win' : a < b ? M.nat[1].name + ' Win' : 'Draw';   // two player names the player, since both can be Farnham
    $('br-tries').textContent = res + ' · Tries ' + M.tries[0] + ' – ' + M.tries[1];
    const cupLine = M.cup && M.cupResultDone && typeof cupBreakLine === 'function' ? cupBreakLine() : '';   // a cup match: Through to the Final, Series 1–0 (src/ui-cups.js)
    if (cupLine) { $('br-pts').textContent = cupLine; $('br-pts').hidden = false; }
    else if (M.champ || M.career) {
      const mp = matchPoints(a, b, M.tries[0]);
      $('br-pts').textContent = '+' + mp.p + ' Table ' + (mp.p === 1 ? 'Point' : 'Points') + (mp.why.length ? ' · ' + mp.why.join(', ') : '');
      $('br-pts').hidden = false;
    }
    if (pair) {                                              // two player: the series between the two players, counted once a match, Player 1's wins first
      if (!M.seriesDone) { M.seriesDone = true; if (a > b) series.w[0]++; else if (a < b) series.w[1]++; else series.d++; }
      $('br-series').textContent = 'Series ' + series.w[0] + ' – ' + series.w[1] + (series.d ? ' · ' + series.d + (series.d === 1 ? ' Draw' : ' Draws') : '');
    }
  }
  $('br-series').hidden = !pair || series.w[0] + series.w[1] + series.d < 2; $('br-row').hidden = !pair;   // a series needs two matches
  fillMatchStats();
  lockerCard(kind);                                        // full time: a row for each medal won (src/ui-locker.js)
  setFocus(null);
  $('m-break').hidden = false;
}
function finishMatch() {
  if (!M.two && !practice && settings.finished < 99) { settings.finished++; save(); }   // one player's own matches, played right through: quitting doesn't count (the Your Ball sign, ui-match.js)
  if (M.champ && champ) { const was = champ.round; recordChampResult(); if (champ.round > was && typeof cupTripleAfter === 'function') cupTripleAfter(champ); }   // a Triple Crown completed by this result tells the Locker (src/cups.js)
  if (M.cup && !M.career && cup && typeof cupRecordMatch === 'function') cupRecordMatch();   // a cup in Championship mode (src/ui-cups.js)
  if (M.career) careerRecordResult();
  if (M.kids) kidsAdapt();                                  // a completed Kids match moves the hidden rating (kids.js): Quick Match, Championship and a Whole Team career alike
  formMatch();                                              // the games played as My Team, for the home's box (src/persistence.js)
  lockerMatch();                                            // the Locker: the feats done this match, and a Championship won (src/locker.js)
  showBreak('full');
}
$('br-go').addEventListener('click', () => {
  $('m-break').hidden = true;
  if (breakKind === 'half') { M.phase = 'set'; secondHalf(); }
  else if (M.two) startTwo();                               // Rematch: the same teams and levels, the series kept
  else exitMatch();
});
$('br-teams').addEventListener('click', () => { $('m-break').hidden = true; startDemo(); openTeams('two'); });   // Change Teams: Player 1's team stays until he changes it, the series kept
$('br-menu').addEventListener('click', () => { $('m-break').hidden = true; exitMatch(); });

/* pause */
function pause() {
  if (demoOn()) { demoStop(); return; }                    // Watch How has no pause card: a hidden app, a lost focus or a turned phone ends it on the ready card, so nothing can stay held or paused
  if (practice && (practice.done || practice.ready)) return;
  if (!playing() || M.over || M.phase === 'break') return;
  M.paused = true;
  $('pz-score').textContent = practice ? practice.name : M.nat[0].name + ' ' + M.score[0] + '\u00a0–\u2060\u00a0' + M.score[1] + ' ' + M.nat[1].name;   // the score never splits across lines (the joiner stops a break after the dash); a drill has no score, so its name
  $('pz-quit').textContent = practice ? practiceBackText() : 'Quit Match'; quitArmed = false;   // a drill goes back to where it came from (practice.js)
  if (two.lost && two.lost.length) seatLost(two.lost[0]); else $('pz-seat').hidden = true;
  renderHintSwitches();
  $('pz-cam-note').hidden = true;
  setFocus(null);
  $('m-pause').hidden = false;
}
function resume() {
  if (practice && (practice.done || practice.ready)) return;
  if (!M) return;
  M.paused = false; $('m-pause').hidden = true;
  for (const inp of inputs) { inp.keys.clear(); inp.aPressed = inp.bPressed = inp.cPressed = false; inp.cDown = false; inp.flick = 0; inp.gest = null; }
  clearCharge(); // a Kick released on the pause card must not fire when play resumes
  for (const s of M.side) s.pass = null;
  const c = M.cut;
  if (c && c.duel && !c.after) duelResume(c);
  else if (c && c.kind === 'goal' && !c.after) goalResume(c);
  // scrums and lineouts give the thumb a moment too, without replaying a throw backwards
  else if (c && c.kind === 'lineout' && c.outcome == null) c.t = Math.max(CUT_IN, c.t >= c.throwT ? c.throwT : 0, c.t - 0.6);
  else if (c && c.kind === 'scrum' && !c.engaged) c.t = Math.max(CUT_IN, c.t - 0.6);
  else if (c && c.kind === 'maul' && !c.after) maulResume(c);   // src/maul.js
}
/* A two-tap confirm (Quit, Delete Team, Start Fresh, Start New Career, Remove League): the first tap asks again, and the second
   counts only once CONFIRM.gap has passed, so a quick double tap (a child mashing, or one tap read twice) only asks. */
const CONFIRM = { gap:500, at:0 };
function confirmArm() { CONFIRM.at = Date.now(); }
const confirmSoon = () => Date.now() - CONFIRM.at < CONFIRM.gap;
let quitArmed = false;
$('b-pause').addEventListener('click', pause);
$('pz-resume').addEventListener('click', resume);
$('pz-quit').addEventListener('click', () => {
  if (!quitArmed) { quitArmed = true; confirmArm(); $('pz-quit').textContent = (isDesk() ? 'Press Again to ' : 'Tap Again to ') + (practice ? 'Leave' : 'Quit'); return; }
  if (confirmSoon()) return;
  if (practice) practiceChoose(); else exitMatch();       // a drill: Back to Skill Games, or Back to Career for a caller (which hears it as a quit)
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
const uprightPhone = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
function phoneUpright() { pause(); releaseTouch(); }        // the cover pauses the match; the stick and the buttons let go too, so nothing is left held when the phone comes back
function onOrientation() { if (uprightPhone.matches) phoneUpright(); }
if (uprightPhone.addEventListener) uprightPhone.addEventListener('change', onOrientation);
else if (uprightPhone.addListener) uprightPhone.addListener(onOrientation);

/* home. The left column: the wordmark, My Team's box and the Trophy Cabinet's strip; the right: five big boxes, Continue across the top,
   then Match | Career and Skill Games | Settings in equal halves (the owner, 2026-11-11: "Larger boxes: Continue, Match, Career, Skill Games,
   Settings. With my team info on the left with games/form and trophy cabinet there too"). Continue picks up whatever is under way (a
   championship or a cup, or a career: the one played last where there are both) and says what in one line; with nothing under way it reads
   Play and opens Quick Match with My Team set on the left and the Opponent ready to change. Match, Competitions, Skill Games and Settings each
   open a step in the home's place (HOME_STEPS), Back at its top left. The focus and a controller's first press land on Continue, and the
   arrow keys move between the boxes as a controller's ring does. Two Player has no button here (the owner: "take out 2 player from the
   menu. doesn't work for mobile"): openJoin is its way in, kept with the mode. */
const BOOL = { sound:1, hints:1, coach:1 };
$('ver').textContent = 'Version ' + GAME_VERSION;              // small, at the foot of Settings (data.js)
const HOME_STEPS = {                                         // each step: its title, its Back's words, the box it opened from, and the step Back goes to
  match:{ title:'Match', back:'Back to Menu', from:'b-match' },
  champ:{ title:'Competitions', back:'Back to Match', from:'b-comps', up:'match' },
  drills:{ title:'Skill Games', back:'Back to Menu', from:'b-drills' },
  settings:{ title:'Settings', back:'Back to Menu', from:'b-set' },
};
const HOME_STEP_IDS = { match:/^b-(quick|comps)$/, champ:/^(b-champ|hc-)/, drills:/^(pr-|b-help$)/, settings:/^b-grown$/ };   // a step's buttons by id, where an element cannot say (the tools' stand-in DOM)
let homeStep = null;                                         // the step on show (a HOME_STEPS key), or null for the five boxes
function renderHome() {
  storeRender();                                           // the locks, Grown-Ups, the Super Fan's colours on My Team's box (src/ui-store.js)
  for (const seg of document.querySelectorAll('.seg[data-key]')) {
    const key = seg.dataset.key;
    const val = key === 'diff' ? kidsSegIndex() : BOOL[key] ? ((key === 'hints' ? settings.hints || settings.coach : settings[key]) ? 0 : 1) : settings[key];   // Difficulty is Kids | Easy | Normal | Hard (kids.js)
    [...seg.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === val)));
  }
  myHome();
  homeCabinet();
  champHome();
  homeContinue();
  renderCareerHome();
  practiceGroups();                                         // Skill Games: the contact games hidden for the youngest, the grown-ups' panel shut (practice.js)
  lockerHome();                                             // a dot on Locker while a new medal waits (src/ui-locker.js)
  if (typeof importHome === 'function') importHome();      // Add Your Team in My Team's box, where the team screen's Add Your Team card would show (src/import.js)
  homeStepDraw();
}
/* The five boxes, or one step in their place with its title and Back (hidden while For Grown-Ups, which has its own Back to Skill Games, is open),
   Offline Ready, Install Game and Updating going with whichever shows. */
function homeStepDraw() {
  const k = HOME_STEPS[homeStep] ? homeStep : null, st = k && HOME_STEPS[k];
  homeStep = k;
  $('home-side').hidden = $('home-main').hidden = !!k; $('home-step').hidden = !k;
  for (const id of Object.keys(HOME_STEPS)) $('hp-' + id).hidden = id !== k;
  if (st) { $('hs-title').textContent = st.title; $('hs-back').textContent = st.back; }
  $('hs-back').hidden = k === 'drills' && !$('pr-grownups').hidden;
  const tools = $('app-tools'), at = $(k ? 'hs-head' : 'home-mark');   // Offline Ready, Install Game and Updating: beside the wordmark, or at a step's top right, so they show wherever the home is
  if (at && typeof at.appendChild === 'function' && tools.parentNode && tools.parentNode !== at) at.appendChild(tools);
}
/* A note under Continue Championship or in the Career box: Bath · Round 2 of 5. The team's name (and its separator) is a span of its own
   (.rn-name); a long one ends in an ellipsis on a phone held sideways (styles.css). */
function homeNote(el, text, name) {
  const i = name ? text.indexOf(name + ' · ') : -1;
  el.innerHTML = i < 0 ? esc(text) : esc(text.slice(0, i)) + '<span class="rn-name">' + esc(name + ' · ') + '</span>' + esc(text.slice(i + name.length + 3));
  el.hidden = false;
}
const homeLive = b => !!b && !b.hidden && !b.disabled && !(b.closest && b.closest('[hidden]')) && (!b.getBoundingClientRect || b.getBoundingClientRect().width > 0 || !b.closest);
/* Where the focus and a controller's first press land: Continue on the five boxes; a step's first button that can be pressed. */
function homeFirst() {
  if (!homeStep) return $('b-continue');
  const p = $('hp-' + homeStep), all = sel => (p && p.querySelectorAll ? [...p.querySelectorAll(sel)] : []);
  return (homeStep === 'champ' ? all('.btn').find(homeLive) : null)   // Competitions: Continue Championship, or the tier's first competition, before the tiers
    || all('.btn, .seg button').find(homeLive) || $('hs-back');
}
DEFAULT_FOCUS['s-home'] = homeFirst;
function homeStepOf(el) {                                    // the step a button is in, or null for the five boxes and My Team's box
  if (!el) return null;
  const at = typeof el.closest === 'function' ? el.closest('[data-step]') : null;
  if (at && at.dataset) return at.dataset.step;
  return Object.keys(HOME_STEP_IDS).find(k => HOME_STEP_IDS[k].test(el.id || '')) || null;
}
/* The home: on the five boxes, or, for focus inside a step (a drill just played, How to Play), on that step with the focus there. */
function goHome(focus) {
  if (typeof nativePutBack === 'function') nativePutBack();   // the app: a save Preferences gave back late goes in first (native.js)
  navOnly = null;
  homeStep = homeStepOf(focus);
  renderHome();
  showScreen('s-home');
  homeFit();
  const b = homeLive(focus) ? focus : homeFirst();
  if (b && typeof b.focus === 'function') b.focus();
}
function homeFocus(b, ring) {                                // the focus on b, and a controller's ring with it where the ring was showing
  if (!b) return;
  setFocus(ring ? b : null);
  if (typeof b.focus === 'function') b.focus({ preventScroll:true });
}
/* A step shown in the home's place: its first button focused (or focus, a button in it). */
function homeOpen(k, focus) {
  if (!HOME_STEPS[k]) return;
  const ring = !!focusEl;
  homeStep = k; renderHome(); homeFit();
  homeFocus(homeLive(focus) ? focus : homeFirst(), ring);
}
/* Back: Competitions to Match, any other step to the five boxes, the focus on the box that opened it. */
function homeBack() {
  const st = HOME_STEPS[homeStep]; if (!st) return;
  if (st.up) { homeOpen(st.up, $(st.from)); return; }
  const ring = !!focusEl;
  homeStep = null; renderHome(); homeFit();
  homeFocus($(st.from), ring);
}
/* The home on a step (Competitions, after New Championship or a cup put away), or on the five boxes. */
function homeShow(k, focus) { goHome(focus); if (HOME_STEPS[k] && homeStep !== k) homeOpen(k, focus); }
$('b-match').addEventListener('click', () => { ac(); homeOpen('match'); });
$('b-comps').addEventListener('click', () => { ac(); homeOpen('champ'); });   // locked on the free tier, as Championship's headline was: each competition opens the Unlock card
$('b-drills').addEventListener('click', () => { ac(); homeOpen('drills'); });
$('b-set').addEventListener('click', () => { ac(); homeOpen('settings'); });
$('hs-back').addEventListener('click', () => homeBack());
$('pr-grown').addEventListener('click', () => { $('hs-back').hidden = true; });          // For Grown-Ups: its own Back to Skill Games (practice.js)
$('pr-grown-back').addEventListener('click', () => { $('hs-back').hidden = false; });
/* The home's own moves, for the arrow keys and a controller's ring alike (navMove asks it first); undefined leaves the move to the nearest
   button that way (navNearest). On the five boxes: Down from Continue is Match, the first half, never whichever half is a pixel nearer; Left
   from Continue is Change, the first of My Team's column; Left from the boxes' first column goes into My Team's column at the button level
   with it (its buttons, or the Trophy Cabinet), never down the boxes' own column, and Right from the end of a row in My Team's column goes
   to the box level with it, or back to the box Left came from (homeNavLeft), so Left then Right is where it started; Up and Down in My
   Team's column stay in it; Continue has nothing to its right. On a step, Down from Back lands on the step's first row (Competitions'
   tiers, which sit to its right), and Up from that row goes back to Back. */
let homeNavLeft = null;                                      // the last Left from a box into My Team's column: { at:the button it landed on, box:the box it left }
function homeNavTo(from, dx, dy, cands) {
  if (!from || $('s-home').hidden) return undefined;
  const to = homeNavPick(from, dx, dy, cands);
  if (dx < 0 && !dy && to && $('home-main').contains(from) && $('home-side').contains(to)) homeNavLeft = { at:to, box:from };
  return to;
}
function homeNavPick(from, dx, dy, cands) {
  const main = $('home-main'), side = $('home-side'), r = el => el.getBoundingClientRect(), mid = (el, k) => { const q = r(el); return k === 'x' ? q.left + q.width/2 : q.top + q.height/2; };
  if (homeStep) {
    const back = $('hs-back'), p = $('hp-' + homeStep), inside = cands.filter(el => p.contains(el)), top = Math.min(...inside.map(el => r(el).top));
    if (from === back && !dx && dy > 0) {                          // Down from a step's Back: its first row, never past it
      const row = inside.filter(el => r(el).top - top < 4).sort((a, b) => Math.abs(mid(a, 'x') - mid(from, 'x')) - Math.abs(mid(b, 'x') - mid(from, 'x')));
      return row[0] || null;
    }
    if (from !== back && !dx && dy < 0 && inside.includes(from) && r(from).top - top < 4 && cands.includes(back)) return back;   // Up from the step's first row: Back
    return undefined;
  }
  if (from === $('b-continue') && !dy && dx > 0) return null;          // Continue is alone in its row: nothing to its right
  if (from === $('b-continue') && dy > 0 && !dx) return $('b-match');
  if (from === $('b-continue') && !dy && dx < 0) return cands.includes($('b-my')) ? $('b-my') : undefined;   // Left from Continue: the first of My Team's column
  if (dx > 0 && !dy && side.contains(from)) {                        // Right in My Team's column: along its row, and from the row's end to the box level with it
    const y = mid(from, 'y'), x = mid(from, 'x'), along = cands.filter(el => side.contains(el) && Math.abs(mid(el, 'y') - y) < 4 && mid(el, 'x') > x + 4);
    if (along.length) return along.sort((a, b) => mid(a, 'x') - mid(b, 'x'))[0];
    if (homeNavLeft && homeNavLeft.at === from && cands.includes(homeNavLeft.box)) return homeNavLeft.box;   // straight back to the box Left came from
    const boxes = cands.filter(el => main.contains(el)).sort((a, b) => Math.abs(mid(a, 'y') - y) - Math.abs(mid(b, 'y') - y) || r(a).left - r(b).left);
    return boxes[0] || null;
  }
  if (dy && !dx && side.contains(from)) {                          // Up and Down in My Team's column stay in it: its three, then the Trophy Cabinet across the column
    const y = mid(from, 'y'), x = mid(from, 'x'), next = cands.filter(el => side.contains(el) && (mid(el, 'y') - y)*dy > 4);
    next.sort((a, b) => Math.abs(mid(a, 'y') - y) - Math.abs(mid(b, 'y') - y) || Math.abs(mid(a, 'x') - x) - Math.abs(mid(b, 'x') - x));
    return next[0] || null;
  }
  if (dx < 0 && !dy && main.contains(from) && r(from).left - r(main).left < 2) {   // Left from the boxes' first column: My Team's column, at the button level with it
    const y = mid(from, 'y'), left = cands.filter(el => side.contains(el));
    left.sort((a, b) => Math.abs(mid(a, 'y') - y) - Math.abs(mid(b, 'y') - y) || r(b).left - r(a).left);
    return left[0] || null;
  }
  return undefined;
}
/* The arrow keys on the home move the focus to the nearest button that way, as a controller's ring moves (navNearest, src/input-devices.js):
   Down from Continue to Match, from Match to Skill Games, Right from Match to Career. Escape on a step is Back. */
$('s-home').addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  if (e.key === 'Escape' && homeStep && !$('hs-back').hidden) { if (e.preventDefault) e.preventDefault(); homeBack(); return; }
  const d = { ArrowUp:[0, -1], ArrowDown:[0, 1], ArrowLeft:[-1, 0], ArrowRight:[1, 0] }[e.key];
  if (!d) return;
  const cands = navCands($('s-home')), at = document.activeElement;
  let to = cands.includes(at) ? homeNavTo(at, d[0], d[1], cands) : homeFirst();
  if (to === undefined) to = navNearest(cands, at, d[0], d[1]);
  if (e.preventDefault) e.preventDefault();
  if (to && typeof to.focus === 'function') { to.focus(); if (focusEl) setFocus(to); }
});
for (const seg of document.querySelectorAll('.seg[data-key]')) {
  [...seg.children].forEach((btn, i) => btn.addEventListener('click', () => {
    const key = seg.dataset.key;
    if (key === 'diff' && i === 3 && !storeGate('hard', () => btn.click())) return;   // Hard is in the Full Game (src/store.js)
    if (key === 'diff' && kidsLevel() && i !== 0) { parentGate(() => { kidsSegSet(i); save(); renderHome(); }); return; }   // only a grown-up takes the game off the Kids level; a cancelled check leaves it as it was
    if (key === 'diff') kidsSegSet(i); else if (BOOL[key]) settings[key] = i === 0; else settings[key] = i;
    if (key === 'cam') { settings.camPick = true; if (M && M.cut) $('pz-cam-note').hidden = false; if (!(M && M.paused) && !$('s-home').hidden) BV.peekUntil = performance.now() + BV_DEMO_PEEK; }   // on the home, the demo behind it shows the height just picked for a moment (PR #14); the pause card's row changes the match itself   // a real choice, so a Top chosen here survives a reload (cleanSettings); a close-up has its own camera, so the pause card says so
    if (key === 'hints') settings.coach = settings.hints; // one home switch for control hints and coach tips
    save(); renderHome();
    if (key === 'sound') { if (settings.sound) ac(); else soundOff(); }
  }));
}

/* Continue: what is under way. 'champ' is a championship (live or at its Final Table) or a cup, 'career' a career; with both, the one played
   last (settings.last, set as a match of either starts). null is nothing: Continue reads Play. */
function homeUnder() {
  const ch = !!cup || !!(champ && champ.teams && champ.teams[champ.user]), cr = !!career;
  return ch && cr ? (settings.last === 'career' ? 'career' : 'champ') : ch ? 'champ' : cr ? 'career' : null;
}
const homeVs = (label, t) => [String(label || '').replace(/ of \d+$/, ''), t ? 'v ' + listName(t) : ''].filter(Boolean).join(' ');
/* A career's fixture, as Continue and the Career box say it: Round 2 v Bath, Pool A v France, Transfer Window; once the year's matches
   are played, how it ended (careerResult: the title chase, Winners, Knocked Out, Series Won). */
function homeCareerFix(cr) {
  if (cr.phase === 'transfer') return 'Transfer Window';
  const f = typeof careerAhead === 'function' ? careerAhead(cr) : null;
  if (f) return homeVs(f.label, f.teams[f.home === f.user ? f.away : f.home]);
  return typeof careerResult === 'function' && typeof careerOutcome === 'function' ? careerResult(cr, careerOutcome(cr)) : 'Year ' + cr.year;
}
/* Continue's line: Championship · Round 3 v Wimbledon, World Cup · Semi-Final v France, Career · Round 2 v Bath; Quick Match for Play. */
function homeContinueLine(w) {
  if (w === 'champ' && cup && typeof cupFixture === 'function') {
    const fx = cupFixture(cup);
    return CUPS[cup.id].name + ' · ' + (fx ? homeVs(fx.label, cup.teams[fx.opp]) : cupLabel(cup));
  }
  if (w === 'champ') return 'Championship · ' + (champ.round >= 5 ? 'Final Table' : homeVs('Round ' + (champ.round + 1), champ.teams[userFixture(champ).opp]));
  if (w === 'career') return 'Career · ' + homeCareerFix(career);
  return 'Quick Match';
}
/* A line in its parts, each kept whole (styles.css, .bx-sub .nw), so where the box needs two lines it breaks between them and never inside one:
   Championship · | Round 3 | v Wimbledon. */
function homeChunks(text) {
  return String(text).split(' · ').flatMap((part, i, all) => {
    const m = part.match(/^(.+?) (v .+)$/), bits = m ? [m[1], m[2]] : [part];
    if (i < all.length - 1) bits[bits.length - 1] += ' ·';
    return bits;
  }).map(b => '<span class="nw">' + esc(b) + '</span>').join(' ');
}
function homeLine(el, text) { el.textContent = text; el.innerHTML = homeChunks(text); el.hidden = false; }   // the text first: the tools' stand-in DOM keeps no children
function homeContinue() {
  const w = homeUnder(), b = $('b-continue');
  $('cont-name').textContent = w ? 'Continue' : 'Play';
  homeLine($('cont-note'), homeContinueLine(w));
  b.setAttribute('aria-label', (w ? 'Continue' : 'Play') + ', ' + homeContinueLine(w));
  storeMark(b, w || 'free');                                 // a championship or a career under way on the free tier: locked, its line kept
}
$('b-continue').addEventListener('click', () => {
  ac();
  const w = homeUnder();
  if (w === 'champ') { $('b-champ').click(); return; }       // its hub, or the cup's (the Full Game's gate inside)
  if (w === 'career') { careerOpen(); return; }               // src/ui-career.js, gated inside
  openTeams('quick', null, { play:true, from:$('b-continue') });
});

/* My Team: your club and your country, picked once on the team screen (openTeams('my')) and kept as settings.myClub and myNat. A club is
   any side the team picker offers bar a nation: a national league's, Local's, one you made or imported, or a side of My League. Unset,
   or gone (a team deleted, its league removed), it is the Super Fan's club or Farnham, as the game always started; the country unset is
   England. Quick Match and 2 Players only offer it first in Player 1's list, marked My Team, and never pick it; Championship (the club
   for a league, the country for an international competition) and a new Career pick it for you, to change there; Play on the home sets it. */
function myClubFind(k) {
  if (typeof k !== 'string' || !k) return null;
  return custom.find(t => t.key === k) || (importLeague && importLeague.teams.find(t => keyOf(t) === k))
    || TEAM_LISTS.filter(l => l.tier > 0).map(l => l.teams.find(t => t.id === k)).find(Boolean) || null;
}
const myClubTeam = () => myClubFind(settings.myClub) || storeHomeTeam();
function myNatTeam(cat) { const id = settings.myNat || 'ENG'; return cat ? natList(cat).find(n => n.id === id) || null : NATIONS.find(n => n.id === id); }   // in the category's twelve, or null (Canada on Men)
function myPool() {                                       // the list My Team's club is on: a built-in list, My League, or (a team you made, which follows every list) null
  const t = myClubTeam();
  if (t.custom) return null;
  if (importLeague && importLeague.teams.includes(t)) return IMPORT_POOL;
  const l = TEAM_LISTS.find(x => x.tier > 0 && x.teams.includes(t));
  return l ? l.key : 'sur';
}
const myIs = t => !!t && (isNation(t) ? !t.legend && t.id === (settings.myNat || 'ENG') : keyOf(t) === keyOf(myClubTeam()) && !t.custom === !myClubTeam().custom);
/* My Team's club, last season (PR #14's Your Team info): its league and place, as its list has them. Real figures from the club's list, so
   only a built-in club with a line has one; a nation, a team you made or imported, a My League side and a club with no figures (Quins, New
   Zealand, Japan, Scotland) show none, never an invented one. myRecordLine is the rest of PR #14's line (won, lost, scored, conceded):
   since 2026-11-11 the game shows it nowhere (the home's box shows the games you have played as the club instead), and only the tools
   read it (tools/home.mjs 6b), kept so the figures stay checked against the club's list. */
const myLeagueLine = t => (t && t.league ? t.league + ' · ' + ordinal(t.place) + ' Last Season' : '');
const myRecordLine = t => (t && t.league ? ['Won ' + t.w, ...(t.d ? ['Drew ' + t.d] : []), 'Lost ' + t.l, t.pf + ' Scored', t.pa + ' Conceded'].join(' · ') : '');
const FORM_WORD = { W:'Won', D:'Drawn', L:'Lost' };
/* My Team's box: the club's shirt, name, stars and league line; the games you have played as it (formOf, src/persistence.js) and its last
   five results, the latest on the right of them; the country's shirt and name; Change | Add Your Team | Locker. */
function myHome() {
  const c = myClubTeam(), n = myNatTeam(null), f = formOf(c), g = formOf(n), played = r => r.w + r.d + r.l;
  const figs = r => ['Played ' + played(r), 'Won ' + r.w, 'Drawn ' + r.d, 'Lost ' + r.l].join(', ');
  $('my-shirt').innerHTML = jersey(c);
  $('my-name').textContent = listName(c);
  $('my-stars').innerHTML = ratedStars(c);
  $('my-league').innerHTML = c.league ? `<span>${esc(c.league)}</span><span class="sep"> · </span><span>${esc(ordinal(c.place) + ' Last Season')}</span>` : '';   // myLeagueLine, the league over its place
  $('my-rec').innerHTML = [['Played', played(f)], ['Won', f.w], ['Drawn', f.d], ['Lost', f.l]].map(([w, v]) => `<div><dt>${w}</dt><dd>${v}</dd></div>`).join('');
  const last = f.last.split('');
  $('my-form').innerHTML = last.map(x => `<li class="fm ${x.toLowerCase()}"><span aria-hidden="true">${x}</span><span class="sr">${FORM_WORD[x]}</span></li>`).join('') + '<li class="fm none" aria-hidden="true"></li>'.repeat(FORM_LAST - last.length);   // the letter seen, the word read out
  $('my-form').setAttribute('aria-label', last.length ? 'Last ' + (last.length === 1 ? 'Result' : last.length + ' Results') : 'No Results Yet');
  const nat = $('my-nat');
  nat.innerHTML = `${jersey(n, 'mini')}<b aria-hidden="true">${esc(listName(n))}</b><span class="sr">${esc('My Country: ' + listName(n) + (played(g) ? ', ' + figs(g) : ''))}</span>`;   // read out with its own record (a span takes no aria-label)
  nat.setAttribute('title', listName(n) + (played(g) ? ': ' + figs(g) : ''));
  $('b-my').setAttribute('aria-label', 'Change My Team: ' + listName(c) + ', ' + listName(n));
  homeFit();
}
/* The Trophy Cabinet's strip: each kind won, its trophy in its metal and the count (2 Titles · 1 Cup), the Super Fan's rosette; shown once a
   season or a cup is finished, or a Super Fan trophy is held, as the Trophy Cabinet's button always was. */
const CAB_STRIP = [['league', 'champions', 'Title', 'Titles', 'Title', 'Titles'], ['triple', 'tripleCrowns', 'Triple Crown', 'Triple Crowns', 'Crown', 'Crowns'],
  ['euro', 'euro', 'European Cup', 'European Cups', 'Cup', 'Cups'], ['world', 'world', 'World Cup', 'World Cups', 'Cup', 'Cups'], ['tour', 'tour', 'Home Nations Tour', 'Home Nations Tours', 'Tour', 'Tours']];
function homeCabinet() {
  const fans = typeof lockerFanClubs === 'function' ? lockerFanClubs() : [], b = $('b-cabinet');
  b.hidden = !champHistory.length && !fans.length;
  if (b.hidden) return;
  const t = savedHonours(), metal = k => (typeof trophyMetal === 'function' ? trophyMetal(k) : 'silver');
  const won = CAB_STRIP.filter(([, key]) => (t[key] || 0) > 0).map(([k, key, one, many, sone, smany]) => ({ k, n:t[key], name:t[key] === 1 ? one : many, word:t[key] === 1 ? sone : smany }));
  $('tc-list').innerHTML = won.map(x => `<span class="tc-it"><span class="cup-trophy" data-kind="${x.k}" data-metal="${metal(x.k)}" aria-hidden="true"></span>${x.n}<span class="tc-w">&nbsp;${x.word}</span></span>`).join('')
    + fans.map(() => `<span class="tc-it"><span class="cup-trophy" data-kind="fan" data-metal="${metal('fan')}" aria-hidden="true"></span></span>`).join('');
  const said = [...won.map(x => x.n + ' ' + x.name), ...fans.map(f => 'Super Fan Trophy, ' + f.club.name)];
  b.setAttribute('aria-label', 'Trophy Cabinet' + (said.length ? ': ' + said.join(', ') : ''));
  homeFit();
}
/* My Team's box steps down a level at a time (styles.css, .my-box[data-fit]) until it holds everything it shows: while its lines are too
   many for its height, and while the league or the country is cut short, for the levels that only shrink (up to 3: a smaller shirt leaves
   the words more room), never dropping a line for a long name. Long names then step down until they fit (Christchurch, Bloemfontein), and
   the strip's words go where its trophies need the room, once the home has a size (again once the game's typefaces load). */
const HOME_FIT_SHRINK = 3;
function homeFit() {
  const box = $('my-box'), name = $('my-name'), strip = $('b-cabinet');
  if ($('s-home').hidden || !box.dataset || !name.style || !name.getBoundingClientRect || box.getBoundingClientRect().height === 0) return;
  name.style.fontSize = '';
  delete box.dataset.fit;
  const cut = e => !!e && e.offsetWidth > 0 && e.scrollWidth > e.clientWidth + 0.5;
  const over = lvl => box.scrollHeight > box.clientHeight + 0.5 || (lvl < HOME_FIT_SHRINK && [...box.querySelectorAll('.my-league > span, .my-nat b')].some(cut));
  for (let lvl = 1; lvl <= 6 && over(lvl - 1); lvl++) box.dataset.fit = String(lvl);
  let px = parseFloat(getComputedStyle(name).fontSize) || 30;
  while (name.scrollWidth > name.clientWidth + 0.5 && px > 16) { px -= 1; name.style.fontSize = px + 'px'; }
  if (!strip.hidden) {
    delete strip.dataset.fit;
    const list = $('tc-list');
    if (list.scrollWidth > list.clientWidth + 0.5) strip.dataset.fit = 'short';
  }
}
$('b-my').addEventListener('click', () => { ac(); openTeams('my'); });

/* Competitions (Match's second step): Continue first while a championship or a cup is saved (its hub then has New Championship or Start
   Fresh); otherwise International | National | Local, the team screen's tier names, and that tier's competitions: the nation's championship
   (its six), the World Cup and the Home Nations Tour; each national league, a trophy on the four that lead to the European Cup; Surrey,
   Counties and My League. Each goes to the team screen with only that competition's sides. All of it is the Full Game's (src/store.js). */
let homeTier = null;                                       // the tier on show, while the game runs: first the one My Team's club is on
const champComps = tier => (tier === 0 ? [['int', 'Championship'], ['world', 'World Cup'], ['tour', 'Home Nations Tour']]
  : tier === 1 ? TEAM_LISTS.filter(l => l.tier === 1).map(l => [l.key, l.name])
  : [...TEAM_LISTS.filter(l => l.tier === 2).map(l => [l.key, l.name]), ...(importLeague ? [[IMPORT_POOL, 'My League']] : [])]);
$('hc-tier').innerHTML = TEAM_TIERS.map((n, i) => `<button data-tier="${i}">${n}</button>`).join('');   // plain words (data.js)
for (const b of $('hc-tier').querySelectorAll('[data-tier]')) b.addEventListener('click', () => { homeTier = +b.dataset.tier; champHome(); });
function champHome() {
  const note = $('champ-note');
  const live = champ && champ.teams && champ.teams[champ.user] && champ.round < 5;
  const done = champ && champ.teams && champ.teams[champ.user] && champ.round >= 5;
  const saved = !!cup || !!live || !!done;
  $('hc-go').hidden = !saved; $('hc-new').hidden = saved;
  if (cup && typeof cupHomeNote === 'function') {           // a cup under way, or finished and not yet put away (src/ui-cups.js)
    $('b-champ').textContent = cupFixture(cup) ? 'Continue Championship' : 'Final Result';
    cupHomeNote(note, cup);
  } else if (live) {
    $('b-champ').textContent = 'Continue Championship';
    homeNote(note, champNote(champ), champ.teams[champ.user].name);
  } else if (done) {
    $('b-champ').textContent = 'Final Table';
    homeNote(note, champNote(champ), champ.teams[champ.user].name);
  } else { $('b-champ').textContent = 'Continue Championship'; note.hidden = true; }
  storeMark($('b-champ'), 'champ');
  if (homeTier == null) homeTier = poolTier(myPool() || 'sur');
  for (const b of $('hc-tier').querySelectorAll('[data-tier]')) b.setAttribute('aria-pressed', String(+b.dataset.tier === homeTier));
  const comps = champComps(homeTier), key = comps.map(c => c[0]).join() + (storeLive() && !storeHas('champ') ? ':locked' : '');
  const box = $('hc-comps');
  if (box.dataset.key !== key) {                            // drawn again only when the tier or a lock changes, so a controller's ring stays put; a long name (the United Rugby Championship) is .long: its lock goes in the corner (styles.css)
    box.dataset.key = key;
    box.className = 'hc-comps n' + comps.length;
    box.innerHTML = comps.map(([k, n]) => `<button class="btn hc-comp${n.length > 20 ? ' long' : ''}" id="hc-${k}" data-comp="${k}">${typeof cupEuroLeague === 'function' && cupEuroLeague(k) ? `<span class="cup-trophy" data-kind="euro" data-metal="${trophyMetal('euro')}" role="img" aria-label="European Cup"></span>` : ''}<span>${esc(n)}</span></button>`).join('');
    for (const b of box.querySelectorAll('[data-comp]')) { b.addEventListener('click', () => champPick(b.dataset.comp)); storeMark(b, 'champ'); }
  }
}
function champPick(k) {
  ac();
  if (!storeGate('champ', () => champPick(k))) return;     // locked: the Unlock card
  if (cup || champ) { $('b-champ').click(); return; }      // one is saved: its own hub (the home shows Continue then)
  openTeams('champ', k, { from:$('hc-' + k) });             // Back comes back to it
}
$('b-champ').addEventListener('click', () => {
  ac();
  if (!storeGate('champ', () => $('b-champ').click())) return;   // locked: the Unlock card; a championship under way stays saved
  if (cup) { renderCup(); showScreen('s-cup'); }          // a cup under way (src/ui-cups.js)
  else if (champ) { renderHub(); showScreen('s-hub'); }
  else homeOpen('champ');
});
$('b-cabinet').addEventListener('click', () => { renderCabinet('home-history'); showScreen('s-cabinet'); $('s-cabinet').scrollTop = 0; });
$('cab-back').addEventListener('click', () => goHome($('b-cabinet')));
$('b-quick').addEventListener('click', () => { ac(); openTeams('quick', null, { from:$('b-quick') }); });   // Quick Match: Pick Your Team
$('b-help').addEventListener('click', () => { renderHowTo(); showScreen('s-help'); });
$('h-back').addEventListener('click', () => goHome($('b-help')));

/* two player: the join screen (openJoin: no button on the home since 2026-11-09, the mode and its checks kept), then the team screen
   for each player, then the match.
   Both seats start on the keyboard halves, so a keyboard pair has nothing to set up; a controller takes a seat with one press on this
   screen (the seats model is switched on here, so pads can claim), Use Keyboard gives it back, Swap Players swaps the halves and the
   Difficulty that goes with them. Each player's Difficulty is his own and is remembered. Each seat's card carries its legend: the
   keycaps or pad buttons for Run, Pass, Kick and Sprint, lit while held, so a pair learns the keys here and sees a keyboard that can't
   hold them all. Player 1 picks his team first, then Player 2. */
let twoSel = { teams:[DEFAULT_TEAM, null], levels:[1, 1], picking:0 }, series = { w:[0, 0], d:0 };
const KEY_LEGEND = {
  left:[['Run', ['KeyW', 'KeyA', 'KeyS', 'KeyD']], ['Pass', ['KeyF']], ['Kick', ['KeyG']], ['Sprint', ['KeyH']]],
  right:[['Run', ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']], ['Pass', ['Slash']], ['Kick', ['Period']], ['Sprint', ['Comma']]],
  solo:[['Run', ['KeyW', 'KeyA', 'KeyS', 'KeyD']], ['Pass', ['KeyJ']], ['Kick', ['KeyK']], ['Sprint', ['KeyL']]],
};
const ARROW_KEY = { ArrowUp:'u', ArrowLeft:'l', ArrowDown:'d', ArrowRight:'r' };
function seatDev(s) { return seatScheme(s) ? 'Keyboard' : 'Controller'; }
function legendHtml(s) {                                   // the seat's legend: four cells, Run Pass Kick Sprint, keycaps by the scheme (arrows as CSS triangles, never a glyph) or the pad's glyphs by position
  const cell = (caps, label, four) => `<span class="lg"><span class="caps${four ? ' four' : ''}">${caps}</span><span class="lbl">${label}</span></span>`;
  const sch = seatScheme(s);
  if (!sch) return cell('<i class="pad stick" data-pad="stick"></i>', 'Run') + cell('<i class="pad dia" data-pad="big"><b></b><b></b><b class="on"></b><b></b></i>', 'Pass')
    + cell('<i class="pad dia" data-pad="small"><b></b><b class="on"></b><b></b><b></b></i>', 'Kick') + cell('<i class="pad sh" data-pad="sh"></i>', 'Sprint');
  const kc = code => (ARROW_KEY[code] ? `<kbd class="kc ar ${ARROW_KEY[code]}" data-code="${code}"></kbd>` : `<kbd class="kc" data-code="${code}">${KEYCAP[code]}</kbd>`);
  return KEY_LEGEND[sch].map(([label, codes]) => cell(codes.map(kc).join(''), label, codes.length > 1)).join('');
}
function openJoin() {
  resetSeats(); setTwo(true); navOnly = null;
  twoSel = { teams:[DEFAULT_TEAM, null], levels:settings.twoDiff.slice(), picking:0 }; series = { w:[0, 0], d:0 };
  renderJoin(); showScreen('s-join'); $('s-join').scrollTop = 0;
}
function renderJoin() {
  for (const s of [0, 1]) {
    $('j-dev' + s).textContent = seatDev(s);
    $('j-kb' + s).hidden = two.seats[s].dev !== 'pad';   // its row keeps its height either way, so the two Difficulty rows stay level
    $('j-leg' + s).innerHTML = legendHtml(s);
    [...$('j-diff' + s).children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === twoSel.levels[s])));
  }
  $('j-pad').hidden = two.seats[0].dev === 'pad' && two.seats[1].dev === 'pad';
  storeJoinRender();
  renderHintSwitches();                                    // the Hints ticks: by half, so they follow Swap Players and show the saved state when the screen opens
}
function seatsChanged() { if (two.on && !$('s-join').hidden) renderJoin(); }   // a pad claiming a seat, Use Keyboard, Swap Players or a pad unplugged: the join screen follows
function startTwo() {                                    // Men | Women | Minis: the team screen's, a nation as that category's own side
  const a = catTeam(twoSel.teams[0], settings.cat), b = catTeam(twoSel.teams[1], settings.cat);
  if (!a || !b) return;
  navOnly = null; startMatch(a, b, false, { two:true, levels:twoSel.levels.slice() });
}
$('j-back').addEventListener('click', () => { setTwo(false); goHome(); });
const saveTwoDiff = () => { settings.twoDiff = two.swapped ? twoSel.levels.slice().reverse() : twoSel.levels.slice(); save(); };   // stored by half (left, right): a fresh visit puts the halves back in order
function swapPlayers() { twoSwap(); twoSel.levels.reverse(); saveTwoDiff(); renderJoin(); }   // Swap Players: the device, the half and the Difficulty go with the player
function useKeyboard(s) { twoRelease(s); renderJoin(); }
$('j-swap').addEventListener('click', swapPlayers);
$('j-go').addEventListener('click', () => { ac(); openTeams('two'); });
for (const s of [0, 1]) {
  $('j-kb' + s).addEventListener('click', () => useKeyboard(s));
  [...$('j-diff' + s).children].forEach((b, i) => b.addEventListener('click', () => { if (i === 2 && !storeGate('hard', () => b.click())) return; twoSel.levels[s] = i; saveTwoDiff(); renderJoin(); }));
}

/* team select */
const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const keyOf = t => t.key || t.id;
function jersey(t, cls) {
  const k = HEX.test(t.kit) ? t.kit : '#888888', tr = HEX.test(t.trim) ? t.trim : '#f2efe6';
  return `<span class="jw ${cls || ''}"><span class="jersey${t.hoops ? ' hoops' : ''}" style="--kit:${k};--trim:${tr}"></span></span>`;
}
/* A side's stars, from its overall on the one scale (starsOf, src/ratings.js): drawn beside its overall's badge wherever a team is picked or
   listed (the team screen's sides, My Team, the career's transfer offers and call-up). Named ratedStars, not teamStars: that is the star
   traits' (src/traits.js). The badge says the number; the stars carry their words for a screen reader. */
const ratedStars = (t, quiet) => starsHtml(starsOf(t), quiet);
const jerseyRated = (t, cls) => jersey(t, cls).replace(/<\/span>$/, `<span class="ovr" aria-label="Overall ${overallOf(t)}">${overallOf(t)}</span></span>`);   // the shirt with its overall's badge
function pips(v) { let s = ''; for (let i = 1; i <= 5; i++) s += `<i class="${i <= v ? 'on' : ''}"></i>`; return `<span class="pips" aria-label="${v} of 5">${s}</span>`; }

/* ---------- The team screen: Your Team v Opponent (the owner, 2026-11-11) ----------
   "Rebuild the team select screen ... as a side-by-side picker in the style of EA FC's kick-off screen": Your Team on the left, the
   Opponent on the right, a big V between them (Championship, Career, My Team and the cups show one side, centred). Each side shows one
   team: its shirt with its overall, its name and stars, five bars, the league it plays in. Left and Right change the team within its group;
   Up and Down step through every group in order, ONE LADDER (his answer, the same day: "like EA FC"), the hemisphere and the country above
   it; a shoulder button, Page Up or Page Down, or a long press on Previous or Next jumps a whole country. The top of the ladder is North |
   South | Mine | Favourites | Recent; Men | Women | Minis stays the top switch. Each wraps.
   The ladder (pickLadder) is a view of the lists, never new data: TEAM_LISTS cut by country (LIST_HOME, URC_HOME in src/data.js) and by
   league where a list holds two (South Africa's URC and Currie Cup), each group named for its competition, the nations in the category's
   own order with their Legends, then Mine (Made Teams with Create Team, My League with Add Your Team), the teams starred and each side's
   last three picks. A side picked from a group plays as its list always has: a championship from Dublin is the URC's.
   A side is set (Pick Farnham, a tap on its card, a controller's A) and Kick Off starts the match once both are; moving a side sets it free
   again. Pick Opponent never shows your own side, and opens on its league's rivals (Wimbledon for Farnham) until the opponent is moved.
   Each side's last pick, its last three (Recent) and the teams starred (Favourites) are kept (settings.pick, recent, fav: persistence.js),
   so the screen reopens where each side was. Nothing here draws a random number (tools/importer.mjs counts them). */
let teamList = [];                                         // the active side's group: its teams, for the tools
const PICK = { ms:200, swipe:36, ratio:1.4, hold:500 };      // one quick move (opacity and transform, none with reduced motion); a swipe's distance and how much straighter than across it must be; a long press
const PICK_HEMI = { north:'North', south:'South', mine:'Mine', fav:'Favourites', recent:'Recent' };
const PICK_MAKE = { act:'create', name:'Create Team' }, PICK_ADD = { act:'import', name:'Add Your Team' };   // Mine's two ways in, an entry each, gated as ever (storeGate)
const pickKey = t => (!t ? '' : t.act ? '+' + t.act : keyOf(t));
const motionOn = () => { try { return !matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const natName = id => (NATIONS.find(n => n.id === id) || { name:String(id) }).name;
const pickSlug = v => String(v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const pickHome = (list, t) => (list === 'cel' ? URC_HOME[t.id] : LIST_HOME[list]) || null;   // a club's country
/* The countries with something to show, in the category's own table order, then any with clubs only (Japan, for the women). One with
   neither (Argentina for the women, Canada and the USA for the men) has no group and is not shown. */
function pickCountries(cat) {
  const ranked = natList(cat).map(t => t.id), more = [];
  for (const l of TEAM_LISTS) if (l.tier) for (const t of l.teams) { const h = pickHome(l.key, t); if (h && !ranked.includes(h) && !more.includes(h)) more.push(h); }
  return [...ranked, ...more];
}
/* A country's club groups, in TEAM_LISTS order (so Local's Surrey and Counties come last): each list's sides from that country, cut by
   league where every side has one and they differ (South Africa), named for the competition they all share, else LIST_GROUP's name, else
   Clubs; Local's lists keep their own names. */
function pickClubGroups(home) {
  const out = [];
  for (const l of TEAM_LISTS) {
    if (!l.tier) continue;
    const teams = l.teams.filter(t => pickHome(l.key, t) === home);
    if (!teams.length) continue;
    const local = LIST_LOCAL.includes(l.key), leagues = [...new Set(teams.map(t => t.league || ''))], split = !local && leagues.length > 1 && !leagues.includes('');
    for (const lg of split ? leagues : ['']) {
      const ts = split ? teams.filter(t => t.league === lg) : teams;
      const name = local ? l.name : ts.every(t => t.league && t.league === ts[0].league) ? LEAGUE_SHORT[ts[0].league] || ts[0].league : LIST_GROUP[l.key] || 'Clubs';
      out.push({ key:[l.key, ...(l.key === 'cel' ? [home.toLowerCase()] : []), ...(split ? [pickSlug(name)] : [])].join('.'), list:l.key, home, local, name, teams:ts });
    }
  }
  return out;
}
const pickLegends = (home, cat) => (typeof lockerLegends === 'function' ? lockerLegends(cat).filter(t => t.nation === natName(home)) : []);   // England 2003 after England (src/locker.js)
/* A saved key (a pick, a favourite, a recent one) to its team in this category, or null for one gone: a made team deleted, a league
   removed, Canada on Men, a Legend not unlocked. */
function pickFind(k, cat) {
  if (typeof k !== 'string' || !k) return null;
  return custom.find(t => t.key === k) || (importLeague && importLeague.teams.find(t => keyOf(t) === k)) || natList(cat).find(t => t.id === k)
    || (typeof lockerLegends === 'function' && lockerLegends(cat).find(t => t.id === k)) || TEAM_LISTS.filter(l => l.tier > 0).map(l => l.teams.find(t => t.id === k)).find(Boolean) || null;
}
/* The ladder, top to bottom. o: nations (each country's National group, its nation then, with legends, its Legends), clubs, mine ('all':
   Made Teams with Create Team and My League with Add Your Team, so both stay in reach; 'teams': their sides only), fav, recent (a side's
   index), fits (what this screen can pick). Empty groups are left out. */
function pickLadder(cat, o) {
  const out = [], fits = o.fits || (() => true);
  for (const hemi of ['north', 'south']) for (const home of pickCountries(cat)) {
    if (NATION_HEMI[home] !== hemi) continue;
    const nat = o.nations && natList(cat).find(t => t.id === home);
    if (nat) out.push({ key:'nat.' + home.toLowerCase(), list:'int', hemi, home, name:'National', teams:[nat, ...(o.legends ? pickLegends(home, cat) : [])] });
    if (o.clubs) for (const g of pickClubGroups(home)) out.push({ ...g, hemi });
  }
  if (o.mine) {
    const all = o.mine === 'all';
    out.push({ key:'mine.made', list:null, hemi:'mine', name:'Made Teams', teams:[...custom, ...(all && custom.length < MAX_CUSTOM ? [PICK_MAKE] : [])] });
    out.push({ key:'mine.league', list:IMPORT_POOL, hemi:'mine', name:'My League', teams:[...(importLeague ? importLeague.teams : []), ...(all && importShown() ? [PICK_ADD] : [])] });
  }
  const saved = keys => keys.map(k => pickFind(k, cat)).filter(t => t && fits(t));
  if (o.fav) out.push({ key:'fav', list:null, hemi:'fav', name:'Favourites', teams:saved(settings.fav) });
  if (o.recent != null) out.push({ key:'recent', list:null, hemi:'recent', name:'Recent', teams:saved(settings.recent[o.recent] || []) });
  return out.map(g => (g.hemi === 'fav' || g.hemi === 'recent' ? g : { ...g, teams:g.teams.filter(t => t.act || fits(t)) })).filter(g => g.teams.length);
}
/* Where a team lives: its group and country for the card's league line (Clubs · Japan, National · England), whichever group shows it. */
function pickHomeLine(t, cat) {
  if (t.league) return t.league;
  if (t.custom) return 'Made Teams';
  if (importLeague && importLeague.teams.includes(t)) return 'My League';
  const home = isNation(t) || t.legend ? (t.legend ? NATIONS.find(n => n.name === t.nation) || {} : t).id : null;
  if (home) return 'National · ' + natName(home);
  for (const l of TEAM_LISTS) if (l.tier && l.teams.includes(t)) { const h = pickHome(l.key, t), g = pickClubGroups(h).find(x => x.teams.includes(t)); return g ? g.name + ' · ' + natName(h) : ''; }
  return '';
}

/* The screen's state: each side's place in its ladder (a group's key and a team's, so a ladder drawn again finds it), whether it is set,
   and whether it has been moved (an Opponent not yet moved follows Your Team to its rivals). on: the side the primary, the title and the
   keys act on. opener: the side that opened Create Team or Add Your Team, which shows what it made. */
const pickSide = () => ({ g:null, k:null, gi:0, i:0, set:false, touched:false });
let pick = { sides:[pickSide(), pickSide()], on:0, opener:0, sheet:null, made:null, lifter:null };
let pickView = [null, null];                               // each side as drawn: { ladder, gi, i, group, team }
const pickOne = () => pickMode !== 'quick' && pickMode !== 'two';   // Championship, Career, My Team and the cups: one side, centred
const pickCat = () => (pickMode === 'career' && careerDraft ? careerDraft.cat : settings.cat);
/* Championship's World Cup or Home Nations Tour, chosen on the home: its title, its list, its side and its primary (src/ui-cups.js);
   null for a league or the nation's championship, and for every other mode. */
const teamsView = () => (pickMode === 'champ' && typeof cupTeamsView === 'function' ? cupTeamsView() : null);
const champListName = pool => (pool === 'int' ? 'International' : pool === IMPORT_POOL ? 'My League' : (listOf(pool) || TEAM_LISTS[0]).name);
/* Each side's ladder in this mode. Quick Match and 2 Players: everything; Player 1's side has My Team's club first in its group (offered,
   never picked), and Pick Opponent never has Your Team's side and has its league's rivals first. Championship: the competition's sides
   (the Legends after the twelve on International, the Super Fan's club first: storeFirst), then Made Teams; a cup, its fixed list. My Team:
   no Legends. Career: clubs only, as ever, the Super Fan's club first. */
function pickLadderOf(s, left) {
  const cat = pickCat();
  if (pickMode === 'champ') {
    const view = teamsView();
    if (view) return [{ key:'cup.' + view.comp, list:null, hemi:null, name:view.name, ctx:view.yours ? 'Your Side · ' + listName(view.yours) : 'International', fixed:true, teams:view.list.slice() }];   // a tour: the Home Nations against the host picked here
    const pool = teamPool();
    let teams = poolTeams(pool).slice();
    if (pool === 'int' && typeof lockerLegends === 'function') teams.splice(natList(cat).length, 0, ...lockerLegends(cat));
    const made = [...custom, ...(custom.length < MAX_CUSTOM ? [PICK_MAKE] : []), ...(importShown() ? [PICK_ADD] : [])];
    return [{ key:'comp', list:pool, hemi:null, name:champListName(pool), ctx:TEAM_TIERS[poolTier(pool)], teams:storeFirst(teams) }, ...(made.length ? [{ key:'mine.made', list:null, hemi:'mine', name:'Made Teams', teams:made }] : [])];
  }
  if (pickMode === 'career') return pickLadder(cat, { clubs:true, mine:'teams', fav:true, fits:t => !isNation(t) && !t.legend }).map(g => ({ ...g, teams:storeFirst(g.teams) }));
  if (pickMode === 'my') return pickLadder(cat, { nations:true, clubs:true, mine:'all', fav:true, fits:t => !t.legend });
  const all = pickLadder(cat, { nations:true, legends:true, clubs:true, mine:'all', fav:true, recent:s });
  if (s === 0) return all.map(g => { if (g.hemi === 'fav' || g.hemi === 'recent') return g; const i = g.teams.findIndex(t => !t.act && !isNation(t) && myIs(t)); return i > 0 ? { ...g, teams:[g.teams[i], ...g.teams.slice(0, i), ...g.teams.slice(i + 1)] } : g; });
  if (pickMode !== 'quick' || !left || left.act) return all;
  const lk = keyOf(left), lg = left.league, rival = t => !!lg && t.league === lg;
  return all.map(g => {
    let ts = g.teams.filter(t => t.act || keyOf(t) !== lk);
    if (ts.some(rival)) ts = [...ts.filter(rival), ...ts.filter(t => !rival(t))];
    return { ...g, teams:ts };
  }).filter(g => g.teams.length);
}
/* Where a side opens. Quick Match and 2 Players: each side's last pick (Quick Match's set as it was left, so Kick Off is a press away; 2
   Players' for each player to set again); else Your Team on My Team's club (offered, not picked) and the Opponent where pickFollow puts it. Championship: My Team (teamDefault) or a cup's own pick. My Team: the club. Career:
   his club, on its league's list. */
function pickOpen(s) {
  const st = pick.sides[s] = pickSide(), cat = pickCat();
  const at = (team, list) => { if (!team) return; st.k = keyOf(team); st.g = list || null; };
  if (!pickOne()) {
    const p = settings.pick[s], t = p && pickFind(p.id, cat);
    if (t) { st.k = p.id; st.g = p.g; st.set = pickMode === 'quick' && (!t.legend || storeHas('legends')); st.touched = true; return; }   // 2 Players: each player sets his own again (A), as at a rematch's Change Teams; a Legend is set again only while the Full Game is had (a purchase taken back leaves it shown, locked)
    if (s === 0) { const c = myClubTeam(); at(c, c.custom ? 'mine.made' : null); st.list = myPool(); }
    return;
  }
  if (pickMode === 'champ') { const view = teamsView(), d = view ? view.pick : teamDefault(); if (d) at(d, d.custom ? 'mine.made' : null); return; }
  if (pickMode === 'my') { const c = myClubTeam(); at(c, c.custom ? 'mine.made' : null); st.list = myPool(); return; }
  if (pickMode === 'career' && careerDraft) { at(careerDraft.club, careerDraft.club.custom ? 'mine.made' : null); st.list = careerDraft.league; }
}
/* Play on the home (Continue with nothing under way): Your Team is My Team's club, set; the Opponent the last one picked (unless it is My
   Team's club), else its league's rival as pickFollow puts it; the Opponent's side active, ready to change, and Kick Off one press away. */
function pickPlay() {
  const c = myClubTeam(), st = pick.sides[0], o = pick.sides[1];
  st.k = keyOf(c); st.g = c.custom ? 'mine.made' : null; st.list = myPool(); st.set = true; st.touched = true;
  if (o.k === st.k) pick.sides[1] = pickSide();
  pick.on = 1;
}
/* A side found again in a ladder drawn afresh: its group by key, and its team in it by key; failing that, the team in another group (its
   list's first), then the group now in its place. A side whose team has gone (Canada on Men, a team deleted) is no longer set. */
function pickResolve(st, ladder) {
  if (!ladder.length) return null;
  let gi = st.g ? ladder.findIndex(g => g.key === st.g && g.teams.some(t => pickKey(t) === st.k)) : -1;
  if (gi < 0 && st.k) gi = ladder.findIndex(g => g.hemi !== 'fav' && g.hemi !== 'recent' && (!st.list || g.list === st.list) && g.teams.some(t => pickKey(t) === st.k));
  if (gi < 0 && st.k) gi = ladder.findIndex(g => g.hemi !== 'fav' && g.hemi !== 'recent' && g.teams.some(t => pickKey(t) === st.k));
  if (gi < 0 && st.g) gi = ladder.findIndex(g => g.key === st.g);
  if (gi < 0) gi = clamp(st.gi, 0, ladder.length - 1);
  const g = ladder[gi];
  let i = g.teams.findIndex(t => pickKey(t) === st.k);
  if (i < 0) { i = st.k ? clamp(st.i, 0, g.teams.length - 1) : 0; st.set = false; }
  st.g = g.key; st.gi = gi; st.i = i; st.k = pickKey(g.teams[i]); delete st.list;
  if (g.teams[i].act) st.set = false;
  return { ladder, gi, i, group:g, team:g.teams[i] };
}
/* The Opponent, until it is moved, follows Your Team: Your Team's group, its first side there (its league's rivals come first: Wimbledon
   for Farnham), or, where that group has nothing left (a nation and no Legend), the next country's National group. 2 Players: the next
   side in Player 1's group as the screen opens, and from then on Player 2's own (a mirror match is still a press away). */
function pickFollow(st, ladder, lv) {
  if (st.touched || !lv) return;
  const saved = g => g.hemi === 'fav' || g.hemi === 'recent', real = g => g.teams.some(t => !t.act), lk = pickKey(lv.team);
  let lg = lv.group;
  if (saved(lg)) lg = lv.ladder.find(g => !saved(g) && g.teams.some(t => pickKey(t) === lk)) || lg;   // Your Team from Favourites or Recent: its own group, so its rivals still come first
  let gi = ladder.findIndex(g => g.key === lg.key && real(g));   // a group left with only Create Team (your one made team) is passed over
  if (pickMode === 'quick' && gi < 0 && lg.key.startsWith('nat.')) { const li = lv.ladder.indexOf(lg); for (let n = 1; n <= lv.ladder.length && gi < 0; n++) { const g = lv.ladder[(li + n) % lv.ladder.length]; if (g.key.startsWith('nat.')) gi = ladder.findIndex(x => x.key === g.key && real(x)); } }
  if (gi < 0) { const c = keyOf(myClubTeam()); gi = ladder.findIndex(g => !saved(g) && g.teams.some(t => !t.act && keyOf(t) === c)); }   // then My Team's club's group (Surrey)
  if (gi < 0) gi = ladder.findIndex(g => !saved(g) && real(g));
  if (gi < 0) gi = 0;
  const g = ladder[gi], j = g.teams.findIndex(t => pickKey(t) === lk);
  let i = pickMode === 'two' && j >= 0 ? (j + 1) % g.teams.length : 0;
  if (g.teams[i].act) i = Math.max(0, g.teams.findIndex(t => !t.act));
  st.g = g.key; st.k = pickKey(g.teams[i]); st.gi = gi; st.i = i; st.set = false;
  if (pickMode === 'two') st.touched = true;                 // Player 2's side is his own from the start: it never moves while Player 1 looks
}
function pickBuild() {
  const one = pickOne();
  for (const s of [0, 1]) {
    if (one && s === 1) { pickView[1] = null; continue; }
    const left = s === 1 && pickView[0] ? pickView[0].team : null, ladder = pickLadderOf(s, left), was = pick.sides[s].set;
    if (s === 1) pickFollow(pick.sides[1], ladder, pickView[0]);
    pickView[s] = pickResolve(pick.sides[s], ladder);
    if (!one && was && !pick.sides[s].set) pick.on = s;      // a side set to a team that has gone (Canada on Men): it is the one to pick again
  }
  if (one) pick.on = 0;
  const v = pickView[pick.on];
  teamList = v ? v.group.teams.filter(t => !t.act) : [];
  quickPick = pickMode === 'quick' && pick.sides[0].set && pickView[0] ? pickView[0].team : null;   // Your Team, once it is set (the tools and the builder read it)
  twoSel.picking = pick.on;
}
const pickReady = () => !pickOne() && [0, 1].every(s => pick.sides[s].set && pickView[s] && !pickView[s].team.act);

/* ---------- moving, setting, and the primary ---------- */
function pickTo(s, gi, i, how) {
  const v = pickView[s]; if (!v) return;
  const g = v.ladder[gi], st = pick.sides[s];
  st.g = g.key; st.gi = gi; st.i = i; st.k = pickKey(g.teams[i]); st.set = false; st.touched = true; pick.on = s;
  renderTeams();
  pickSlide(s, how);
}
function pickStep(s, d) {                                   // Left and Right: the next team in the group, round again at its end
  const v = pickView[s]; if (!v) return;
  const n = v.group.teams.length;
  if (n > 1) pickTo(s, v.gi, (v.i + d + n) % n, d > 0 ? 'next' : 'prev');
}
function pickGroupStep(s, d) {                             // Up and Down: the next group on the ladder, round again at its ends
  const v = pickView[s]; if (!v) return;
  const n = v.ladder.length;
  if (n > 1 && !v.group.fixed) pickTo(s, (v.gi + d + n) % n, 0, d > 0 ? 'down' : 'up');
}
/* A whole country: the first group of the next one (or of this one's start, going back, then the one before). Mine, Favourites and Recent
   each count as one. */
const pickPlace = g => g.hemi + '.' + (g.home || '');
function pickCountry(s, d) {
  const v = pickView[s]; if (!v || v.ladder.length < 2 || v.group.fixed) return;
  const L = v.ladder, n = L.length, start = gi => { let j = gi; while (j > 0 && pickPlace(L[j - 1]) === pickPlace(L[gi])) j--; return j; };
  let gi = start(v.gi);
  if (d > 0) { let j = gi; do j = (j + 1) % n; while (j !== gi && pickPlace(L[j]) === pickPlace(L[gi])); gi = j; }
  else gi = start((gi - 1 + n) % n);
  if (gi !== v.gi) pickTo(s, gi, 0, d > 0 ? 'down' : 'up');
}
/* A side set as it shows (Pick Farnham, a tap on its card, A): on to the other side, then Kick Off. One side: the screen's own action
   (Play as, Pick, Tour). An entry (Create Team, Add Your Team) opens its card instead; a Legend is played with the Full Game. */
function pickSet(s) {
  const v = pickView[s], t = v && v.team; if (!t) return false;
  if (t.act) { pickAct(s, t.act); return false; }
  if (t.legend && !storeGate('legends', () => pickSet(s))) return false;
  if (pickOne()) { pickTeam(t); return true; }
  pick.sides[s].set = true; pick.sides[s].touched = true;
  pick.on = s === 0 && !pick.sides[1].set ? 1 : s === 1 && !pick.sides[0].set ? 0 : s;
  renderTeams();
  return true;
}
function pickAct(s, act) { pick.opener = s; pick.on = s; pick.made = null; if (act === 'create') openBuilder(null); else if (typeof importOpen === 'function') importOpen(); }
/* The one primary: Kick Off once both sides are set; before that Pick and the side's team (Your Team first); on an entry, the entry. One
   side: Play as Farnham (Championship, the World Cup), Tour Scotland, Pick Bath (Career), and on My Team, Pick or Done. */
function pickPrimary() {
  const view = teamsView(), cat = pickCat(), v = pickView[pick.on], t = v && v.team;
  if (t && t.act) return t.name;
  if (pickOne()) {
    if (!t) return '';
    if (view) return view.comp === 'tour' ? 'Tour ' + listName(t) : 'Play as ' + (catTeam(t, cat) || t).name;
    if (pickMode === 'champ') return 'Play as ' + (catTeam(t, cat) || t).name;
    if (pickMode === 'my' && myIs(t)) return 'Done';
    return 'Pick ' + listName(t);
  }
  if (pickReady()) return 'Kick Off';
  const s = pickTarget(), p = pickView[s].team;
  return 'Pick ' + (catTeam(p, cat) || p).name;            // the side as it will play: Pick Farnham Women on Women
}
const pickTarget = () => (!pick.sides[pick.on].set ? pick.on : pick.sides[0].set ? 1 : 0);   // the side the primary sets: the active one, or the first not yet set
function pickGo() {
  const v = pickView[pick.on], t = v && v.team; if (!t) return;
  if (t.act) { pickAct(pick.on, t.act); return; }
  if (pickOne()) {
    if (pickMode === 'my' && myIs(t)) { goHome($('b-my')); return; }
    pickSet(0); return;
  }
  if (pickReady()) { pickKickOff(); return; }
  pickSet(pickTarget());
}
/* Kick Off: each side's pick kept (its team, its category, its group) and put first in its Recent, then the match. */
function pickKickOff() {
  if (!pickReady()) return false;
  const [a, b] = [pickView[0].team, pickView[1].team], cat = settings.cat;
  if ((a.legend || b.legend) && !storeGate('legends', pickKickOff)) return false;   // a Legend kept from before a purchase was taken back: the Unlock card, never the match
  for (const s of [0, 1]) {
    const k = keyOf(pickView[s].team);
    settings.pick[s] = { id:k, cat, g:pickView[s].group.key };
    settings.recent[s] = [k, ...settings.recent[s].filter(x => x !== k)].slice(0, PICK_RECENT);
  }
  save();
  if (pickMode === 'two') { twoSel.teams = [a, b]; startTwo(); return true; }
  const us = catTeam(a, cat), them = catTeam(b, cat);
  if (us && them) startMatch(us, them, false);
  return true;
}
function pickFav(s) {                                      // Favourite: the team on show starred, or not, newest first, twelve at most
  const t = pickView[s] && pickView[s].team; if (!t || t.act) return;
  const k = keyOf(t), was = settings.fav.includes(k);
  settings.fav = was ? settings.fav.filter(x => x !== k) : [k, ...settings.fav].slice(0, PICK_FAV);
  save(); renderTeams();
}
/* A team made on Create Team, or a club added on Add Your Team, from the team screen: on the side that asked for it, in Made Teams. Made
   while picking Your Team (or Player 1's), it is the one played as, and the Opponent is next, as it always was. On My Team the builder's
   Save makes it the club (and saves); a club imported there is offered as ever (Make This My Team | Not Now, src/import.js). */
function pickMade(t) {
  const s = pickOne() ? 0 : pick.opener, st = pick.sides[s];
  st.g = 'mine.made'; st.k = keyOf(t); st.touched = true; st.set = false; pick.on = s; pick.made = s;
  if (!pickOne() && s === 0) { st.set = true; pick.on = 1; }
}
/* A league added on Add Your Team from the team screen: its sides in view. Championship's competition becomes My League, as it did; else
   the side that asked shows My League (the Opponent, when Your Team has just been set to the club that came with it). */
function pickLeague() {
  const made = pick.made; pick.made = null;
  if (pickMode === 'champ') { settings.pool = IMPORT_POOL; pick.sides[0] = pickSide(); return; }
  const s = !pickOne() && pick.opener === 0 && pick.sides[0].set ? 1 : pickOne() ? 0 : pick.opener, st = pick.sides[s];
  if (made === s) return;                                   // that side shows the club that came with the league (My Team's Add Your Team): it stays on it
  st.g = 'mine.league'; st.k = importLeague && importLeague.teams[0] ? keyOf(importLeague.teams[0]) : null; st.gi = 0; st.i = 0; st.touched = true; st.set = false; pick.on = s;
}

/* ---------- drawing ---------- */
function pickWho(s) {                                      // the side's own name, over its place on the ladder
  const view = teamsView(), t = pickView[s] && pickView[s].team;
  if (pickMode === 'two') return 'Player ' + (s + 1);
  if (pickMode === 'quick') return s ? 'Opponent' : 'Your Team';
  if (view) return view.comp === 'tour' ? 'Host' : 'Your Nation';
  if (pickMode === 'my') return t && !t.act && isNation(t) ? 'My Country' : 'My Club';
  if (pickMode === 'career') return 'Your Club';
  return 'Your Team';
}
function pickWhere(g) {                                    // North · England, North · England · Local, Mine; a competition's tier
  if (g.ctx) return g.ctx;
  if (g.home) return [PICK_HEMI[g.hemi], natName(g.home), ...(g.local ? ['Local'] : [])].join(' · ');
  return g.hemi === 'mine' ? PICK_HEMI.mine : '';
}
function pickTag(s, t) {                                   // Stronger Side (the Opponent, as ever) or My Team (where it is offered or picked)
  if (t.act) return '';
  if (pickMode === 'quick' && s === 1 && pickView[0] && !pickView[0].team.act && outmatched(pickView[0].team, t)) return '<span class="gap">Stronger Side</span>';
  if (pickMode === 'career') return careerDraft && careerSame(t, careerDraft.club) ? '<span class="gap mine">Your Club</span>' : '';
  const tour = teamsView() && teamsView().comp === 'tour';   // the tour's hosts are never the player's own side
  if (s === 0 && !tour && myIs(t)) return '<span class="gap mine">My Team</span>';   // Your Team's (or Player 1's, or the one side's): never the Opponent's
  return '';
}
function pickPanel(s) {
  const v = pickView[s], g = v.group, t = v.team, st = pick.sides[s], cat = pickCat();
  const where = pickWhere(g), many = v.ladder.length > 1 && !g.fixed;
  const group = many ? `<button class="btn pk-group" data-act="sheet" aria-haspopup="dialog">${esc(g.name)}</button>` : `<span class="pk-group fixed">${esc(g.name)}</span>`;
  const real = !t.act, fav = real ? `<button class="btn pk-fav" data-act="fav" aria-pressed="${settings.fav.includes(keyOf(t))}" aria-label="Favourite"><i aria-hidden="true"></i><span>Favourite</span></button>` : '';
  const edit = real && t.custom ? `<button class="btn pk-edit" data-act="edit">Edit</button>` : '';   // a team you made: Edit, in the card's corner
  const count = `<span class="pk-n">${v.i + 1} of ${g.teams.length}</span>`;
  let card;
  if (!real) card = `<button class="team pk-pick pk-make" data-act="pick" data-make="${t.act}"><span class="plus${t.act === 'import' ? ' link' : ''}" aria-hidden="true">${t.act === 'import' ? '' : '+'}</span><span class="tname">${esc(t.name)}</span></button>`;
  else {
    const stars = teamTraitNames(t), line = pickHomeLine(t, cat);
    card = `<button class="team pk-pick" data-act="pick"${t.legend ? ' data-legend="1"' : ''} aria-pressed="${st.set}">${jerseyRated(t, 'big')}<span class="tid"><span class="tname">${esc(listName(t))}</span><span class="pk-rate">${ratedStars(t)}${pickTag(s, t)}</span>${line ? `<span class="pk-league${line === g.name ? ' dup' : ''}">${esc(line)}</span>` : ''}${stars.length ? `<span class="tstars" aria-label="Star Traits: ${esc(stars.join(', '))}" data-names="${esc(stars.join('|'))}">${pickTraitsHtml(stars)}</span>` : ''}</span></button>`
      + `<span class="pk-stats">${ABILITIES.map(([k, l]) => { const a = abilityOf(t, k); return `<span class="pk-st"><span class="lbl">${l}</span><span class="pk-bar" role="img" aria-label="${l} ${Math.round(a)} of 5"><i style="--v:${(a/5).toFixed(2)}"></i></span></span>`; }).join('')}</span>${edit}`;
  }
  const one = v.group.teams.length > 1 ? '' : ' disabled';
  const ctx = where ? `<span class="pk-ctx"><span>${where.split(' · ').map(w => `<span>${esc(w)}</span>`).join(' ')}</span></span>` : '';   // North · England · Local: it breaks between parts, never after a dot
  return `<div class="pk-head"><p class="pk-where"><span class="pk-who">${pickWho(s)}</span>${ctx}</p>${group}${fav}</div>`
    + `<div class="pk-card${st.set ? ' pk-set' : ''}${edit ? ' made' : ''}">${card}</div>`
    + `<div class="pk-step"><button class="btn" data-act="prev"${one}>Previous</button>${count}<button class="btn" data-act="next"${one}>Next</button></div>`;   // Previous and Next in equal halves, the count between
}
const pickTraitsHtml = names => names.map(n => `<b>${esc(n)}</b>`).join(' · ');
/* The keyboard's focus and a controller's ring are on a side's control as it is drawn again: the same control after (Previous stays on
   Previous), so moving through teams never drops them. */
const pickAt = el => { const side = el && typeof el.closest === 'function' && el.closest('.pk-side'); return side && el.dataset ? { s:+side.dataset.side, act:el.dataset.act } : null; };
function pickEl(s, act) { const p = $('t-side' + s); return (p && p.querySelector && p.querySelector(`[data-act="${act}"]`)) || null; }
/* The team screen, for m: 'quick' (Quick Match: Your Team v the Opponent; nothing picked for you), 'two' (2 Players: Player 1 v Player 2),
   'champ' (a competition chosen on the home: comp is 'int' for the nation's championship, 'world', 'tour', or a league's list key; My Team
   on show, to play as or change), 'my' (My Team: the club, then the country) or 'career' (Career's club: New Player's Change Club). */
let pickFrom = null;                                       // the home's button that opened the team screen, where Back goes (Quick Match, Play, a competition)
function openTeams(m, comp, o) {
  pickMode = m; quickPick = null; pick = { sides:[pickSide(), pickSide()], on:0, opener:0, sheet:null, made:null, lifter:null }; pickView = [null, null];
  pickFrom = (o && o.from) || null;
  if (m === 'champ') {
    const k = comp || myPool() || 'sur', cupId = k === 'world' || k === 'tour' ? k : 'league';
    if (typeof cupCompSet === 'function') cupCompSet(cupId);   // the World Cup or the Home Nations Tour have their own sides (src/ui-cups.js)
    settings.pool = cupId !== 'league' ? 'int' : poolKey(k) === k ? k : 'sur';
  } else if (m !== 'career') settings.pool = myPool() || 'sur';
  if (!pickOne()) { const cats = settings.pick.filter(Boolean).map(p => p.cat); if (cats.length && cats.every(c => c === cats[0]) && TEAM_CATS.some(c => c.id === cats[0])) settings.cat = cats[0]; }   // Quick Match and 2 Players reopen in the category their sides were picked in (Championship may have moved it)
  pickOpen(0); if (!pickOne()) pickOpen(1);
  const play = m === 'quick' && !!(o && o.play);
  if (play) pickPlay();
  if (m === 'two') twoSel.picking = 0;
  renderTeams();
  if (play && !pick.sides[1].set && pickView[1] && !pickView[1].team.act) { pick.sides[1].set = true; pick.sides[1].touched = true; pick.on = 1; renderTeams(); }   // the Opponent its league's rival, set: Kick Off is one press away
  showScreen('s-teams'); $('s-teams').scrollTop = 0;
  if (typeof pickFit === 'function') pickFit();
}
function renderTeams() {
  const ring = focusEl && pickAt(focusEl), typed = pickAt(document.activeElement);
  pickBuild();
  const one = pickOne(), view = teamsView(), quick = pickMode === 'quick', pair = pickMode === 'two', cat = pickCat();
  const eb = $('t-eyebrow');
  eb.textContent = quick ? 'Quick Match' : pair ? '2 Players' : pickMode === 'my' ? 'My Team' : pickMode === 'career' ? 'New Player' : view ? view.name : 'Championship';
  eb.classList.remove('p1'); eb.classList.remove('p2');
  const t0 = pickView[0] && pickView[0].team;
  $('t-title').textContent = view ? view.title : pair ? 'Pick Teams' : pickMode === 'my' ? (t0 && !t0.act && isNation(t0) ? 'Pick Your Country' : 'Pick Your Club') : quick && pick.on === 1 ? 'Pick Opponent' : pickMode === 'career' ? 'Pick Your Club' : 'Pick Your Team';
  $('t-cat').hidden = pickMode === 'career';                 // Men | Women is New Player's
  for (const b of $('t-cat').querySelectorAll('[data-cat]')) b.setAttribute('aria-pressed', String(b.dataset.cat === settings.cat));
  $('t-sides').classList.toggle('one', one);
  $('t-v').hidden = one; $('t-side1').hidden = one;
  for (const s of one ? [0] : [0, 1]) {
    const p = $('t-side' + s);
    p.innerHTML = pickPanel(s);
    p.classList.toggle('on', !one && pick.on === s); p.classList.toggle('pk-set', !one && pick.sides[s].set);
    p.classList.toggle('p1', pair && s === 0); p.classList.toggle('p2', pair && s === 1);
    p.setAttribute('aria-label', pickWho(s));
  }
  const go = $('t-go'), label = pickPrimary();
  go.textContent = label; go.hidden = !label;
  $('t-back').textContent = pair ? 'Back to Players' : pickMode === 'career' ? 'Back to New Player' : 'Back to Menu';
  navOnly = null;                                            // 2 Players: each seat drives its own side (pickNav)
  storeTeamsRender();                                        // locks on Create Team, Edit, Add Your Team and the Legends (src/ui-store.js)
  if ($('s-teams').hidden) fitNames(); else pickFit();
  const live = el => !!el && !el.disabled;
  if (ring) { const el = [ring.act, 'sheet', 'fav', 'pick'].map(a => pickEl(ring.s, a)).find(live); if (el) setFocus(el); }   // a ring off the card stays off it
  if (typed) { const el = [typed.act, 'pick'].map(a => pickEl(typed.s, a)).find(live); if (el && el.focus) el.focus({ preventScroll:true }); }
  if (pick.sheet != null && !$('m-ladder').hidden) pickSheetDraw();
  pickHint();                                                // the lift's hint, on the side as drawn again
}
/* A move seen: the card slides in from where the team came from (Next from the right, Down from below), opacity and transform only, and
   nothing with reduced motion. */
function pickSlide(s, how) {
  if (!how || !motionOn()) return;
  const el = $('t-side' + s).querySelector && $('t-side' + s).querySelector('.pk-card');
  if (!el || typeof el.animate !== 'function') return;
  const from = { next:'translateX(28px)', prev:'translateX(-28px)', down:'translateY(18px)', up:'translateY(-18px)' }[how];
  el.animate([{ opacity:0, transform:from }, { opacity:1, transform:'none' }], { duration:PICK.ms, easing:'cubic-bezier(.2,.7,.2,1)' });
}
/* A name too long for its card steps down in size until its longest word fits. */
function fitNames() {
  for (const el of $('s-teams').querySelectorAll('.tname')) {
    el.style.fontSize = '';
    let px = parseFloat(getComputedStyle(el).fontSize) || 24;
    while (el.scrollWidth > el.clientWidth + 0.5 && px > 13) { px = Math.max(13, px - 1); el.style.fontSize = px + 'px'; }   // never under 13px
  }
}
/* A side's star traits, whole names only: two lines at most (one at data-fit 3), the last ones dropped where they would not fit, never one
   cut mid-word. A screen reader hears them all (its label). */
function pickTraits() {
  for (const el of $('s-teams').querySelectorAll('.pk-pick .tstars')) {
    const all = (el.dataset.names || '').split('|').filter(Boolean); if (!all.length) continue;
    el.innerHTML = pickTraitsHtml(all);
    for (let k = all.length - 1; k >= 1 && el.scrollHeight > el.clientHeight + 0.5; k--) el.innerHTML = pickTraitsHtml(all.slice(0, k));
  }
}
const PICK_NAME_MIN = 16;                                    // a name steps the shirt down (data-fit) before it goes under this
/* The screen never scrolls on a phone held sideways: where a long name or a Legend's six traits would make it, or a long name would go under
   16px, the shirt and the name step down together (data-fit 1 to 3, styles.css) until it fits. A swipe on a card takes its own direction
   only where the screen does not scroll after all (touch-action), so it never fights the page's own. The bottom row: on a phone held
   sideways Back and the primary share it in halves, Back on the left, so Back comes first for Tab too; taller, the primary has its own row
   over Back. */
function pickFit() {
  const scr = $('s-teams'); if (!scr || scr.hidden || !scr.querySelectorAll || !scr.dataset) return;
  const go = $('t-go'), back = $('t-back'), foot = go.parentNode;
  let short = false; try { short = matchMedia('(max-height:440px)').matches; } catch (e) { /* none */ }
  if (foot && foot.insertBefore && (back.nextElementSibling === go) !== short) foot.insertBefore(short ? back : go, short ? go : back);   // the order on screen is the order for Tab
  go.style.fontSize = '';
  for (let px = parseFloat(getComputedStyle(go).fontSize) || 22; go.scrollWidth > go.clientWidth + 0.5 && px > 14; ) { px -= 1; go.style.fontSize = px + 'px'; }   // Pick Wolverhampton on one line
  const small = () => [...scr.querySelectorAll('.tname')].some(el => parseFloat(el.style.fontSize) < PICK_NAME_MIN), over = () => scr.scrollHeight > scr.clientHeight + 0.5;
  delete scr.dataset.dup;
  for (let n = 0; n <= 3; n++) { scr.dataset.fit = String(n); fitNames(); pickTraits(); if (!over() && !small()) break; }
  if (over()) { scr.dataset.dup = '1'; fitNames(); pickTraits(); }   // the last step: a league line that only says its group's name again (Made Teams under Made Teams) goes
  scr.classList.toggle('scrolls', scr.scrollHeight > scr.clientHeight + 1);   // styles.css: a card's own vertical swipe only where the page cannot scroll
}

/* ---------- the ladder sheet: every group, under its hemisphere and country, for a finger ----------
   A modal while it is open: everything else is inert (as the grown-up check makes it, src/kids.js), so Tab stays in it and nothing behind
   it can be pressed; the arrows move between its groups; Escape (or Back) closes it once. */
let pickInert = [];                                          // what the open sheet made inert, to give back as it shuts (kept apart from pick, which a new screen replaces)
function pickSheet(s) {
  const v = pickView[s]; if (!v || v.ladder.length < 2 || v.group.fixed) return;
  pickSheetShut();
  pick.sheet = s; pick.on = s;
  pickSheetDraw();
  const m = $('m-ladder'), body = document.body;
  if (body && body.children) for (const el of body.children) if (el !== m && el.id !== 'rotate' && !el.inert) { el.inert = true; pickInert.push(el); }   // Turn Your Phone Sideways stays live, as it does for the grown-up check
  m.hidden = false;
  const el = $('ldr-list').querySelector && $('ldr-list').querySelector('[aria-pressed="true"]');
  if (el) { if (focusEl) setFocus(el); if (el.focus) el.focus({ preventScroll:true }); if (el.scrollIntoView) el.scrollIntoView({ block:'center' }); }
}
function pickSheetDraw() {
  const s = pick.sheet, v = pickView[s]; if (!v) return;
  $('ldr-title').textContent = pickWho(s);
  let html = '', hemi = null, place = null;
  v.ladder.forEach((g, gi) => {
    if (g.hemi !== hemi) { if (place != null) html += '</div>'; hemi = g.hemi; place = null; html += `<h3 class="ldr-h">${esc(PICK_HEMI[g.hemi] || g.name)}</h3>`; }
    const here = g.home ? natName(g.home) + (g.local ? ' · Local' : '') : '';
    if (here !== place) { if (place != null) html += '</div>'; place = here; html += `<div class="ldr-row">${here ? `<p class="ldr-c">${esc(here)}</p>` : ''}`; }
    html += `<button class="btn ldr-g" data-g="${gi}" aria-pressed="${gi === v.gi}">${esc(g.name)}</button>`;
  });
  if (place != null) html += '</div>';
  $('ldr-list').innerHTML = html;
}
function pickSheetShut() {                                  // the sheet put away, nothing else: also whenever another screen is shown (showScreen)
  if ($('m-ladder').hidden && !pickInert.length) return;
  pick.sheet = null; $('m-ladder').hidden = true;
  for (const el of pickInert) el.inert = false;
  pickInert = [];
}
function pickSheetClose(gi) {
  const s = pick.sheet; if (s == null) return;
  pickSheetShut();
  if (gi != null && pickView[s] && gi !== pickView[s].gi) pickTo(s, gi, 0, null);
  const el = pickEl(s, 'sheet');
  if (el) { if (focusEl) setFocus(el); if (el.focus) el.focus({ preventScroll:true }); }
}
$('m-ladder').hidden = true;                                 // shut until a group's button opens it
$('ldr-list').addEventListener('click', e => { const b = e.target && e.target.closest ? e.target.closest('[data-g]') : null; if (b) pickSheetClose(+b.dataset.g); });
$('ldr-back').addEventListener('click', () => pickSheetClose(null));
DEFAULT_FOCUS['m-ladder'] = () => ($('ldr-list').querySelector && $('ldr-list').querySelector('[aria-pressed="true"]')) || $('ldr-back');

/* ---------- input: touch and the mouse, the keyboard, a controller ---------- */
let pickSwiped = 0, pickHold = null;
const pickHit = e => {                                       // the control a tap or a press is on: anywhere on a card bar Edit is its team (the shirt, the name, the bars)
  const t = e.target && e.target.closest ? e.target : null; if (!t) return null;
  const b = t.closest('[data-act]'); if (b) return b;
  const card = t.closest('.pk-card');
  return card && card.querySelector ? card.querySelector('[data-act="pick"]') : null;
};
function pickClick(e) {
  const b = pickHit(e); if (!b) return;
  const at = pickAt(b); if (!at) return;
  if (e.detail !== 0 && performance.now() - pickSwiped < 400) return;   // the click a swipe or a long press ends with (a controller's A or a key's is never one)
  const s = at.s, wasTyped = document.activeElement === b, wasRing = focusEl === b;
  if (at.act === 'prev' || at.act === 'next') pickStep(s, at.act === 'next' ? 1 : -1);
  else if (at.act === 'sheet') pickSheet(s);
  else if (at.act === 'fav') pickFav(s);
  else if (at.act === 'edit') { const t = pickView[s].team; pick.opener = s; if (t && t.custom) openBuilder(t); }
  else if (at.act === 'pick') {
    const was = pick.on;
    if (!pickSet(s) || pickOne()) return;
    const next = pickReady() ? $('t-go') : pick.on !== s || was !== pick.on ? pickEl(pick.on, 'pick') : null;   // A moves on: Your Team, the Opponent, Kick Off
    if (next) { if (wasRing) setFocus(next); if (wasTyped && next.focus) next.focus({ preventScroll:true }); }
  }
}
for (const s of [0, 1]) $('t-side' + s).addEventListener('click', pickClick);
$('t-go').addEventListener('click', () => { ac(); pickGo(); });
$('t-back').addEventListener('click', () => {
  if (pickMode === 'two') { navOnly = null; renderJoin(); showScreen('s-join'); return; }
  if (pickMode === 'career') { renderCareerNew(); careerShow('s-career-new'); return; }
  goHome(pickMode === 'my' ? $('b-my') : pickFrom);           // back to the button that opened it (Quick Match, Play, a competition)
});
/* A swipe across a card: left for the next team, right for the one before; up for the next group, down for the one before. A long press on
   Previous or Next jumps a country. */
$('t-sides').addEventListener('pointerdown', e => {
  const b = pickHit(e), at = b && pickAt(b);
  if (!at) return;
  if (at.act === 'pick') pickHold = { id:e.pointerId, s:at.s, x:e.clientX, y:e.clientY, swipe:true };
  else if (at.act === 'prev' || at.act === 'next') {
    const d = at.act === 'next' ? 1 : -1;
    const h = pickHold = { id:e.pointerId, s:at.s, fired:false, timer:0 };
    h.timer = setTimeout(() => { h.fired = true; h.timer = 0; pickSwiped = performance.now(); pickCountry(at.s, d); }, PICK.hold);
  }
});
$('t-sides').addEventListener('pointermove', e => {
  const h = pickHold; if (!h || h.id !== e.pointerId || !h.swipe) return;
  const dx = e.clientX - h.x, dy = e.clientY - h.y, ax = Math.abs(dx), ay = Math.abs(dy);
  const scr = $('s-teams'), scrolls = scr.scrollHeight > scr.clientHeight + 1;
  if (ax >= PICK.swipe && ax > ay*PICK.ratio) { pickHold = null; pickSwiped = performance.now(); pickStep(h.s, dx < 0 ? 1 : -1); }
  else if (!scrolls && ay >= PICK.swipe && ay > ax*PICK.ratio) { pickHold = null; pickSwiped = performance.now(); pickGroupStep(h.s, dy < 0 ? 1 : -1); }
});
const pickLetGo = e => { const h = pickHold; if (h && h.id === e.pointerId) { if (h.timer) clearTimeout(h.timer); if (h.fired) pickSwiped = performance.now(); pickHold = null; } };   // a long press let go: the click it ends with is not a step as well
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) $('t-sides').addEventListener(ev, pickLetGo);
/* The keyboard, one player (2 Players' halves come through navKey): the arrows act on the side the focus is in (or the active side when
   nothing is focused), Page Up and Page Down jump a country; Tab and Enter are the browser's own. */
function pickKeyDown(e) {
  if ($('s-teams').hidden || two.on || navLayer() !== $('s-teams') || (e.target && e.target.tagName === 'INPUT')) return false;
  const a = document.activeElement, at = pickAt(a), free = !a || a === document.body || a === $('s-teams');
  const s = at ? at.s : free ? pick.on : null;
  if (s == null) return false;
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'ArrowRight') pickStep(s, k === 'ArrowRight' ? 1 : -1);
  else if (k === 'ArrowUp' || k === 'ArrowDown') pickGroupStep(s, k === 'ArrowDown' ? 1 : -1);
  else if (k === 'PageUp' || k === 'PageDown') pickCountry(s, k === 'PageDown' ? 1 : -1);
  else return false;
  if (e.preventDefault) e.preventDefault();
  return true;
}
document.addEventListener('keydown', pickKeyDown);
/* The sheet's own keys: Escape closes it, and only it (2 Players' Escape would go on to free a side or leave the screen: navBack); the
   arrows step through its groups, round again, Home and End to its ends. */
document.addEventListener('keydown', e => {
  if ($('m-ladder').hidden) return;
  if (e.key === 'Escape') { if (e.stopPropagation) e.stopPropagation(); if (e.preventDefault) e.preventDefault(); pickSheetClose(null); return; }
  const gs = [...$('ldr-list').querySelectorAll('.ldr-g')], i = gs.indexOf(document.activeElement), n = gs.length;
  const j = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? (i < 0 ? n - 1 : (i - 1 + n) % n) : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
  if (j < 0 || !n) return;
  if (e.preventDefault) e.preventDefault();
  gs[j].focus({ preventScroll:true }); if (gs[j].scrollIntoView) gs[j].scrollIntoView({ block:'nearest' });
});
/* A controller (and 2 Players' keys): navMove, navPress and navBack ask here first on the team screen (src/input-devices.js).
   On a card the d-pad drives that side: Left and Right a team, Up and Down a group, a shoulder a country; A sets it and moves on (Your
   Team, the Opponent, then Kick Off; one side: the screen's own action). X or Y lifts the ring off the card onto that side's buttons, and
   from there it moves as on every screen, the cards passed over, so Men | Women | Minis, the group's sheet, Favourite, Edit, Previous and
   Next, the primary and Back are all in reach; X or Y again puts it back on the card. B is Back, as everywhere.
   2 Players: each seat drives its own side wherever the ring is, A sets it (then Kick Off once both are), B frees it (then Back); a seat's
   X or Y lifts the ring onto his side's buttons, and that seat's d-pad and A then work the ring, until his X or Y again. */
const pickCard = el => !!el && !!el.dataset && el.dataset.act === 'pick' && !!pickAt(el);
function pickLifted(seat) {                                  // the ring is on one of the screen's buttons, not a card (2 Players: and this seat lifted it)
  if (!focusEl || pickCard(focusEl) || $('s-teams').hidden || navLayer() !== $('s-teams') || !navCands($('s-teams')).includes(focusEl)) return false;
  return !(two.on && !pickOne()) || seat === pick.lifter;
}
const pickSkip = el => pickCard(el);                         // a lifted ring passes over the cards (navMove), so it reaches the buttons above and below them
function pickNav(seat, dx, dy) {
  if ($('s-teams').hidden || (!dx && !dy)) return false;
  if (pickLifted(seat)) {
    const go = $('t-go'), back = $('t-back');
    if (dx && (focusEl === go || focusEl === back)) {        // the bottom row's halves: Left and Right along it, before anything above
      const o = focusEl === go ? back : go, a = focusEl.getBoundingClientRect(), b = o.getBoundingClientRect();
      if (!o.hidden && b.width && Math.abs(a.top - b.top) < 4 && (b.left - a.left)*dx > 0) { setFocus(o); return true; }
    }
    const cat = $('t-cat'), chosen = !cat.hidden && cat.querySelector && cat.querySelector('[aria-pressed="true"]');
    if (dy < 0 && !dx && chosen && focusEl.closest && focusEl.closest('.pk-head')) { setFocus(chosen); return true; }   // Up from either side's head: Men | Women | Minis, on the one chosen
    return false;                                            // the ring moves as on every screen (navMove)
  }
  let s = null;
  if (two.on && !pickOne()) s = seat === 1 ? 1 : 0;
  else { const at = focusEl && pickAt(focusEl); if (at && at.act === 'pick') s = at.s; }
  if (s == null) return false;
  if (dx) pickStep(s, dx); else pickGroupStep(s, dy);
  return true;
}
function pickPress(seat) {
  if ($('s-teams').hidden || !two.on || pickOne() || pickLifted(seat)) return false;   // a lifted ring: A presses what it is on (navPress)
  const s = seat === 1 ? 1 : 0;
  if (!pick.sides[s].set) { pick.on = s; pickSet(s); } else if (pickReady()) pickKickOff();
  return true;
}
function pickBack(seat) {
  if ($('s-teams').hidden || !two.on || pickOne()) return false;
  const s = seat === 1 ? 1 : 0;
  if (!pick.sides[s].set) return false;
  pick.sides[s].set = false; pick.on = s; renderTeams();
  return true;
}
function pickShoulder(seat, d) {                           // a shoulder button, or 2 Players' Sprint: a whole country (never under a card or the sheet)
  if ($('s-teams').hidden || navLayer() !== $('s-teams')) return false;
  const at = focusEl && pickAt(focusEl);
  const s = two.on && !pickOne() ? (seat === 1 ? 1 : 0) : at ? at.s : pick.on;
  pickCountry(s, d);
  return true;
}
/* X or Y: the ring off the card onto its side's first button (the group's, else Favourite, Previous or Next, else the primary), or back onto
   the card from wherever it is (the side it is on; from the top or the bottom row, the active side's). 2 Players: the seat's own side. */
function pickLift(seat) {
  if ($('s-teams').hidden || navLayer() !== $('s-teams')) return false;
  const pair = two.on && !pickOne(), at = focusEl && pickAt(focusEl), s = pair ? (seat === 1 ? 1 : 0) : at ? at.s : pick.on;
  if (pickLifted(seat)) { pick.lifter = null; setFocus(pair ? null : pickEl(s, 'pick')); return true; }   // 2 Players: back to driving his own side, no ring
  const el = ['sheet', 'fav', 'prev', 'next'].map(a => pickEl(s, a)).find(e => e && !e.disabled) || $('t-go');
  pick.lifter = pair ? s : null;
  setFocus(el);
  return true;
}
/* A controller's first press: the active side's card. */
DEFAULT_FOCUS['s-teams'] = () => pickEl(pick.on, 'pick') || $('t-go');
/* The lift's hint (the owner, 2026-11-11: "Keep, Show a Hint"): a small chip under the count of the side the ring is on (else the active
   side, where X or Y would take it), X: Buttons while the d-pad drives the card and X: Team while the ring is off it, so the same press reads
   as the way back. Only while a controller acted last (lastDev), so never on touch or the keyboard; one player only (2 Players is left as
   it is for now). It sits under the count between Previous and Next, so it takes no room the screen needs (styles.css, .pk-hint). The code
   names no PlayStation button, so it says X. setFocus, setDev and renderTeams keep it in step; null where it is not shown. */
function pickHintState() {
  const scr = $('s-teams');
  if (!scr || scr.hidden || lastDev !== 'pad' || two.on) return null;
  const at = focusEl && pickAt(focusEl);
  return { s:at ? at.s : pick.on, text:pickLifted(0) ? 'X: Team' : 'X: Buttons' };
}
function pickHint() {
  const h = pickHintState(), scr = $('s-teams');
  if (!scr || typeof scr.querySelector !== 'function') return h;
  const step = h ? scr.querySelector('#t-side' + h.s + ' .pk-step') : null;
  let chip = scr.querySelector('.pk-hint');
  for (const st of scr.querySelectorAll('.pk-step')) st.classList.toggle('hinted', st === step);
  if (!step) { if (chip) chip.remove(); return h; }
  if (!chip) { chip = document.createElement('span'); chip.className = 'chip pk-hint'; chip.innerHTML = '<span>X: Buttons</span><span>X: Team</span>'; }   // both wordings in one cell, the other unseen and unread, so the chip keeps the wider's width and nothing beside it shifts as X is pressed
  if (chip.parentNode !== step) step.appendChild(chip);
  for (const w of chip.children) { if (w.textContent === h.text) w.removeAttribute('aria-hidden'); else w.setAttribute('aria-hidden', 'true'); }
  return h;
}
$('s-teams').addEventListener('pointerdown', e => { if (!two.on && (e.pointerType === 'touch' || e.pointerType === 'pen')) setDev('touch'); }, true);   // one player: a finger on the screen is the last device, as one in play is (a mouse leaves it be; 2 Players as it was)
/* Men | Women | Minis: the sides follow to the category's own (England to England Women); one it has not got (Canada on Men) is the
   next one there, and no longer set. */
$('t-cat').innerHTML = TEAM_CATS.map(c => `<button data-cat="${c.id}">${esc(c.name)}</button>`).join('');
for (const b of $('t-cat').querySelectorAll('[data-cat]')) b.addEventListener('click', () => catPick(b.dataset.cat));
function catPick(id) {
  if (!TEAM_CATS.some(c => c.id === id)) return;
  settings.cat = id;
  save(); renderTeams();
}
const listOf = k => TEAM_LISTS.find(l => l.key === k);
function teamPool() { const k = poolKey(settings.pool); return k === IMPORT_POOL && !importLeague ? 'sur' : k; }   // My League with no league saved is Surrey
const poolTier = k => (k === IMPORT_POOL ? 2 : (listOf(k) || TEAM_LISTS[0]).tier);
function poolTeams(k) {                                   // International is the category's twelve (natList); a list that does not exist is International
  if (k === IMPORT_POOL) return importTeams();
  const l = listOf(k) || TEAM_LISTS[0];
  return l.key === 'int' ? natList(settings.cat) : l.teams;
}
/* The side on show when Championship opens: My Team (the club, if the league has it or it is one you made; the country on International and
   in the World Cup), or a tour's host in turn. null where nothing is offered: Quick Match, 2 Players, My Team. */
function teamDefault() {
  if (pickMode !== 'champ') return null;
  const view = teamsView();
  if (view) return view.pick || null;
  const pool = teamPool();
  if (pool === 'int') return myNatTeam(settings.cat);
  const c = myClubTeam();
  return c.custom || poolTeams(pool).includes(c) ? c : null;
}
/* A championship is your team and five others from the list on screen. A nation's are the rest of its six in the category's twelve,
   as Career's International stage draws them (natGroup): the Six Nations, so the Triple Crown is still there to win, or the other
   six (Men: New Zealand, South Africa, Australia, Argentina, Fiji and Japan; Women: New Zealand, Canada, the USA, Australia, South
   Africa and Fiji). A team you made, on International, gets five of the twelve. Men | Women | Minis names every side of it, or both
   of a match, and a nation is the category's own side (catTeam). */
const champFrom = (pool, t, cat) => (isNation(t) ? natGroup(t.id, cat) : poolTeams(pool));
/* A team committed, as a tap on its card commits it: Championship starts (a cup as that nation, or a tour to that host), My Team keeps it,
   Career takes the club; Quick Match and 2 Players set it on the active side (where that side's ladder has it). */
function pickTeam(t) {
  if (!t) return;
  if (t.legend && !storeGate('legends', () => pickTeam(t))) return;   // a Legends side is played with the Full Game (src/store.js); unlocked on any tier
  if (pickMode === 'my') { myPick(t); return; }
  if (pickMode === 'career') { const v = pickView[0]; careerClubPick(t, v && v.team === t ? v.group.list : null); return; }
  if (pickMode === 'champ') {
    const view = teamsView();
    if (view) { view.start(t); return; }                   // a World Cup as that nation, or a tour to that host (src/ui-cups.js)
    const pool = teamPool(), cat = settings.cat, me = catTeam(t, cat);
    if (!me) return;
    const others = pool === IMPORT_POOL ? importOthers(t) : shuffle(champFrom(pool, t, cat).filter(o => keyOf(o) !== keyOf(t)));
    newChamp(me, others.slice(0, 5).map(o => catTeam(o, cat))); renderHub(); showScreen('s-hub'); return;
  }
  const s = pick.on, v = pickView[s]; if (!v) return;
  let gi = v.ladder.findIndex(g => g.teams.some(o => !o.act && keyOf(o) === keyOf(t)));
  if (gi < 0) return;                                       // not on this side (Canada on Men, Your Team's own side on Pick Opponent)
  if (v.gi !== gi && v.group.teams.some(o => !o.act && keyOf(o) === keyOf(t))) gi = v.gi;
  const st = pick.sides[s]; st.g = v.ladder[gi].key; st.k = keyOf(t); st.touched = true;
  renderTeams(); pickSet(s);
}

/* My Team picked on the team screen: a nation is the country, anything else the club. A club picked, the side goes on to the country (the
   club, then the country); the country picked, it stays, marked. */
function myPick(t) {
  if (isNation(t)) settings.myNat = t.id; else settings.myClub = keyOf(t);
  save();
  if (!isNation(t)) { const st = pick.sides[0], n = myNatTeam(settings.cat); if (n) { st.g = 'nat.' + n.id.toLowerCase(); st.k = n.id; } }
  renderTeams();
}

/* create team */
let draft = null, editing = null, codeTouched = false, delArmed = false;
let levelChoosing = false, levelNote = '';                 // a new team starts on the level list; the note says what a lower level took off
const spent = d => ABILITIES.reduce((a, [k]) => a + d[k] - 1, 0);
/* A level's stars, drawn: five star shapes, the lit ones over the dim, so a half star is half lit and half dim at any size. Inline, like the home's icons, so there is nothing to load. n is a whole or half star count
   (starsOfOverall, src/ratings.js). The picture carries its words for a screen reader, or quiet leaves them out where the same words are already beside it. On the levels, and beside every
   team's overall badge (ratedStars). */
const STAR_SHAPE = (i, half) => {
  const pts = []; for (let k = 0; k <= (half ? 5 : 9); k++) { const r = k % 2 ? 4.5 : 9.8, a = (-90 + (half ? -36 : 36)*k)*Math.PI/180; pts.push((10 + 20*i + r*Math.cos(a)).toFixed(1) + ' ' + (10.6 + r*Math.sin(a)).toFixed(1)); }
  return 'M' + pts.join('L') + 'Z';
};
const STAR_OFF = [0, 1, 2, 3, 4].map(i => STAR_SHAPE(i)).join('');
function starsHtml(n, quiet) {
  const whole = Math.floor(n), on = [0, 1, 2, 3, 4].filter(i => i < whole).map(i => STAR_SHAPE(i)).join('') + (n > whole ? STAR_SHAPE(whole, true) : '');
  return `<svg class="rstars" viewBox="0 0 100 20" ${quiet ? 'aria-hidden="true"' : `role="img" aria-label="${starsWords(n)}"`}><path class="off" d="${STAR_OFF}"/><path class="on" d="${on}"/></svg>`;
}
/* Setting the level sets the team's ability: a team set at four stars is a four-star team, with nothing more to do. The abilities go through cleanTeam's own cut, so what you see here is what it saves as, and any that came down are named; any points the level has left go on from what the team has now (abilitiesFor), and can be moved about. */
function builderLevel(id) {
  const l = TEAM_LEVELS.find(v => v.id === id); if (!l || !draft) return;
  const cut = cleanTeam({ ...draft, level:id }, 0), down = ABILITIES.filter(([k]) => cut[k] < draft[k]).map(([, n]) => n);
  for (const [k] of ABILITIES) draft[k] = cut[k];
  const room = l.budget - spent(draft);
  if (room > 0) Object.assign(draft, abilitiesFor(draft, ABILITIES.length + l.budget));
  draft.level = id; levelChoosing = false;
  levelNote = down.length ? `${l.name} has ${l.budget} ${l.budget === 1 ? 'point' : 'points'}, so ${down.length > 1 ? down.slice(0, -1).join(', ') + ' and ' + down[down.length - 1] + ' came' : down[0] + ' came'} down.` : room > 0 ? 'Your points are shared out. Take one off an ability to add it to another.' : '';
  renderBuilder(); $('s-build').scrollTop = 0;
}
function buildBuilder() {
  $('bd-level-grid').innerHTML = TEAM_LEVELS.map(l => `<button class="btn lv" data-level="${l.id}"><span class="lv-name">${l.name}</span><span class="lv-sub">${starsHtml(l.stars)}<span>${l.budget} ${l.budget === 1 ? 'Point' : 'Points'}</span></span></button>`).join('');
  for (const b of $('bd-level-grid').querySelectorAll('[data-level]')) b.addEventListener('click', () => builderLevel(b.dataset.level));
  $('bd-level-change').addEventListener('click', () => { levelChoosing = true; renderBuilder(); $('s-build').scrollTop = 0; });
  $('bd-level-keep').addEventListener('click', () => { levelChoosing = false; renderBuilder(); });
  const sw = id => KIT_COLOURS.map(([n, h]) => `<button class="sw" style="--k:${h}" data-c="${h}" aria-label="${n}"></button>`).join('');
  for (const [id, key] of [['bd-kit', 'kit'], ['bd-trim', 'trim']]) {
    $(id).innerHTML = sw();
    for (const b of $(id).querySelectorAll('.sw')) b.addEventListener('click', () => { draft[key] = b.dataset.c; renderBuilder(); });
  }
  $('bd-abs').insertAdjacentHTML('beforeend', ABILITIES.map(([k, l]) => `
    <div class="ab"><span class="lbl">${l}</span>
      <button class="step" data-ab="${k}" data-d="-1" aria-label="Less ${l}">−</button>
      <span id="bd-p-${k}"></span>
      <button class="step" data-ab="${k}" data-d="1" aria-label="More ${l}">+</button>
    </div>`).join(''));
  for (const b of $('bd-abs').querySelectorAll('.step')) b.addEventListener('click', () => {
    const k = b.dataset.ab, d = +b.dataset.d;
    if (d > 0 && (draft[k] >= 5 || spent(draft) >= teamBudget(draft))) return;
    if (d < 0 && draft[k] <= 1) return;
    draft[k] += d; renderBuilder();
  });
  [...$('bd-pat').children].forEach((b, i) => b.addEventListener('click', () => { draft.hoops = i === 1; renderBuilder(); }));
  $('bd-name').addEventListener('input', () => {
    draft.name = $('bd-name').value;
    if (!codeTouched) $('bd-code').value = autoCode(draft.name.trim() || 'My Team', editing && editing.key);
    renderBuilder();
  });
  $('bd-code').addEventListener('input', () => {
    codeTouched = true;
    const v = $('bd-code').value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    if ($('bd-code').value !== v) $('bd-code').value = v;
  });
  for (const id of ['bd-name', 'bd-code']) $(id).addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
  $('bd-save').addEventListener('click', () => {
    const t = { ...draft, name:$('bd-name').value, id:codeFor($('bd-code').value, $('bd-name').value) };
    if (editing) {
      const i = custom.findIndex(c => c.key === editing.key);
      custom[i] = cleanTeam({ ...t, key:editing.key }, i);
      twoSel.teams = twoSel.teams.map(o => (o && keyOf(o) === editing.key ? custom[i] : o));   // a Rematch plays it as it now is
    } else {
      const made = cleanTeam({ ...t, key:'my' + Date.now().toString(36) }, custom.length);
      custom.push(made);
      pickMade(made);                                        // on the side that asked: played as, made while picking Your Team
      if (pickMode === 'my') settings.myClub = made.key;     // made on My Team: it is the club (saved just below)
    }
    save(); renderTeams(); showScreen('s-teams');
  });
  $('bd-back').addEventListener('click', () => { renderTeams(); showScreen('s-teams'); });
  $('bd-del').addEventListener('click', () => {
    if (!delArmed) { delArmed = true; confirmArm(); $('bd-del').textContent = 'Confirm Delete'; return; }
    if (confirmSoon()) return;
    custom = custom.filter(c => c.key !== editing.key);
    twoSel.teams = twoSel.teams.map(o => (o && keyOf(o) === editing.key ? null : o));   // a side showing it moves on as the screen is drawn (pickResolve)
    save(); renderTeams(); showScreen('s-teams');
  });
}
function openBuilder(t) {
  if (!storeGate('create', () => openBuilder(t))) return;   // Create Team is in the Full Game (src/store.js)
  editing = t;
  draft = t ? { ...t } : { name:'', kit:'#2050b0', trim:'#f2efe6', ...Object.fromEntries(ABILITIES.map(([k]) => [k, 1])) };
  codeTouched = !!t;
  $('bd-name').value = draft.name;
  $('bd-code').value = t ? t.id : autoCode('My Team');
  $('bd-eyebrow').textContent = t ? 'Edit Team' : 'Create Team';
  delArmed = false; $('bd-del').textContent = 'Delete Team';
  levelChoosing = !t; levelNote = '';                        // a new team starts by choosing its level; a saved one opens as it is, with no level if it was made before them
  renderBuilder(); showScreen('s-build'); $('s-build').scrollTop = 0;
}
function renderBuilder() {
  $('bd-title').textContent = draft.name.trim() || 'My Team';
  $('bd-jersey').innerHTML = jersey(draft);
  [...$('bd-pat').children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === (draft.hoops ? 1 : 0))));
  for (const [id, key] of [['bd-kit', 'kit'], ['bd-trim', 'trim']])
    for (const b of $(id).querySelectorAll('.sw')) b.setAttribute('aria-pressed', String(b.dataset.c === draft[key]));
  const lv = teamLevelOf(draft), left = teamBudget(draft) - spent(draft);
  $('bd-levels').hidden = !levelChoosing; $('bd-form').hidden = levelChoosing; $('bd-save').hidden = levelChoosing;
  const keep = levelChoosing && !!(lv || editing), del = !levelChoosing && !!editing;   // the row under the screen: Keep This Level or Delete Team beside Back, so the level list fits a phone sideways
  $('bd-level-keep').hidden = !keep; $('bd-del').hidden = !del; $('bd-row').classList.toggle('one', !keep && !del);
  for (const b of $('bd-level-grid').querySelectorAll('[data-level]')) b.setAttribute('aria-pressed', String(!!lv && b.dataset.level === lv.id));
  $('bd-level-name').textContent = lv ? `${lv.name} · ${starsWords(lv.stars)}` : `No Level Set · ${BUDGET} Points`;
  $('bd-level-stars').innerHTML = lv ? starsHtml(lv.stars, true) : '';
  const note = lv && left > 0 ? `Spend ${left} more ${left === 1 ? 'point' : 'points'} to reach ${starsWords(lv.stars)}.` : levelNote;   // points taken off and not put back: why the shirt reads under the level
  $('bd-level-note').textContent = note; $('bd-level-note').hidden = !note;
  $('bd-left').textContent = 'Points Left ' + left; $('bd-left').classList.toggle('spent', left === 0);
  for (const [k] of ABILITIES) {
    $('bd-p-' + k).innerHTML = pips(draft[k]);
    for (const b of $('bd-abs').querySelectorAll(`.step[data-ab="${k}"]`)) b.disabled = +b.dataset.d > 0 ? draft[k] >= 5 || left <= 0 : draft[k] <= 1;
  }
}
buildBuilder();

/* hub */
/* Saved progression uses counted scores for every fixture; detailed counters belong only to played matches. */
function seasonRecord(s) {
  return s.won + ' W · ' + s.drawn + ' D · ' + s.lost + ' L';
}
function recordedStatsHtml(s, label = 'Recorded Match Stats') {
  const pair = (v, made = 'made') => v[made] + '/' + v.att;
  const row = (label, value) => `<tr><th scope="row">${label}</th><td>${value}</td></tr>`;
  return `<table class="saved-stats"><caption>${label} · your team</caption><tbody>${
    row('Conversions', pair(s.conv)) + row('Penalty Goals', pair(s.pen)) + row('Drop Goals', pair(s.dg))
    + row('Tackles', pair(s.tk)) + row('Duels', pair(s.duelN, 'won')) + row('Metres Made', Math.round(s.gain))
  }</tbody></table><p class="stat-note">Made / attempted; duels won / attempted. Metres Made is ground gained with the ball.</p>`;
}
/* The Trophy Cabinet: league seasons and, beside them, finished cups (src/ui-cups.js), each marked in its kind's metal (TROPHY_METAL,
   src/cups.js: gold or silver) with its kind's name, and a trophy in its kind's shape (TROPHY_SHAPE, by data-kind); the tally counts each kind won, a cup's only once one is kept. A trophy is drawn
   only for silverware held (data-won): an entry won (a title or a Grand Slam, a cup or a tour's series) and a count above 0. An entry
   not won keeps a dot in its kind's metal, and a count of 0 no mark at all. An entry without a kind is a league season. */
function renderCabinet(id) {
  const history = champHistory.slice().reverse();
  const totals = savedHonours();
  const tally = [['league', 'Title', 'Titles', totals.champions], ['league', 'Grand Slam', 'Grand Slams', totals.grandSlams], ['triple', 'Triple Crown', 'Triple Crowns', totals.tripleCrowns],
    ...[['euro', 'European Cup', 'European Cups'], ['world', 'World Cup', 'World Cups'], ['tour', 'Tour', 'Tours']].map(([k, a, b]) => [k, a, b, totals[k] || 0]).filter(t => t[3] > 0)];
  const metal = k => (typeof trophyMetal === 'function' ? trophyMetal(k) : 'silver');   // a build without the cups: every entry is a League
  const won = on => (on ? ' data-won' : '');
  const kindTag = (k, on) => `<span class="cup-kind" data-kind="${k}" data-metal="${metal(k)}"${won(on)}>${{ league:'League', euro:'European Cup', world:'World Cup', tour:'Home Nations Tour' }[k]}</span>`;
  $(id).innerHTML = (typeof lockerFanCabinet === 'function' ? lockerFanCabinet() : '')   // Super Fan trophies first, their own kind, never in the tally (src/ui-locker.js)
    + `<p class="stat-note">Last 10 completed seasons and 10 cups · saved on this device.</p>`
    + (history.length ? `<p class="cabinet-tally">${tally.map(([k, singular, plural, n]) => `<span class="ck" data-kind="${k}" data-metal="${metal(k)}"${won(n > 0)}>${n} ${n === 1 ? singular : plural}</span>`).join(' · ')}</p>` + history.map((c, i) => {
      if (c.kind && c.kind !== 'league') return cupEntryHtml(c, i, kindTag(c.kind, cupWinner(c.cup) === c.cup.user));
      const rows = standings(c), place = rows.findIndex(r => r.i === c.user) + 1, s = seasonSummary(c);
      const awards = honours(c, rows).filter(h => h[1] === c.user).map(h => h[0]);
      return `<article class="season-entry"><p class="eyebrow">${kindTag('league', awards.includes('Champions') || awards.includes('Grand Slam'))}${i === 0 ? 'Most Recent' : 'Earlier Season'}</p><h3>${esc(c.teams[c.user].name)} · ${ordinal(place)}</h3><p>${s.played ? seasonRecord(s) : 'No matches played'}</p><p>Points ${s.pointsFor} for / ${s.pointsAgainst} against · Tries ${s.triesFor} for / ${s.triesAgainst} against</p><p class="season-awards">${awards.length ? awards.join(' · ') : 'No honours'}</p></article>`;
    }).join('') : '<p class="stat-note">Complete a championship to record your first season here.</p>');
}
function renderSeasonSummary(c) {
  const s = seasonSummary(c);
  $('hub-summary').innerHTML = `<p class="eyebrow">Your Season · ${s.played} of 5 Played</p><p class="season-record">${s.played ? seasonRecord(s) : 'No matches played'}</p><p>Points ${s.pointsFor} for / ${s.pointsAgainst} against · Tries ${s.triesFor} for / ${s.triesAgainst} against</p>`
    + (s.detailedMatches ? `<details class="season-details"><summary>Recorded Season Stats · ${s.detailedMatches} ${s.detailedMatches === 1 ? 'Match' : 'Matches'}</summary>${recordedStatsHtml(s.stats, 'Recorded Season Totals')}<p class="stat-note">Totals cover ${s.detailedMatches} recorded ${s.detailedMatches === 1 ? 'match' : 'matches'}${s.legacyMatches ? '; older matches have scores and tries only' : ''}.</p></details>` : `<p class="stat-note">${c.round >= 5 ? 'This season has scores and tries only.' : 'Detailed stats appear here after your next played match.'}</p>`);
}
function renderHub() {
  const c = champ; if (!c) return;
  archiveChampionship(c);
  renderSeasonSummary(c); renderCabinet('hub-history');
  const done = c.round >= 5;
  const T = c.teams;
  const rows = standings(c);
  const title = chaseTitle(c, rows);
  $('hub-eyebrow').textContent = 'Championship · ' + T[c.user].name;
  $('hub-title').textContent = title;
  const prize = title === 'Grand Slam' || title === 'Champions' || title === 'Triple Crown';
  $('hub-title').classList.toggle('gold', done && (title === 'Grand Slam' || title === 'Champions'));
  $('hub-chase').textContent = chaseLine(c, rows);
  $('hub-chase').classList.toggle('payoff', (done && prize) || (!done && c.round > 0 && chaseFacts(c, rows).clinched));
  if (!done) {
    const { pair } = userFixture(c);
    const [h, a] = pair;
    const stake = fixtureStake(c, rows);
    const mates = c.fixtures[c.round].filter(p => p !== pair).map(p => esc(T[p[0]].name) + ' v ' + esc(T[p[1]].name));
    const later = [];
    for (let r = c.round + 1; r < 5; r++) {
      const p = c.fixtures[r].find(x => x[0] === c.user || x[1] === c.user);
      later.push('Round ' + (r + 1) + ' · ' + esc(T[p[0] === c.user ? p[1] : p[0]].name));
    }
    const foe = T[h === c.user ? a : h];
    $('hub-next').innerHTML = `
      <div class="stack">
        <div class="fixture">
          <span class="fx-team">${jersey(T[h])}<span>${esc(T[h].name)}</span></span>
          <span class="fx-v">V</span>
          <span class="fx-team r"><span>${esc(T[a].name)}</span>${jersey(T[a])}</span>
          ${stake ? `<p class="stake">${stake}</p>` : ''}
        </div>
        ${outmatched(T[c.user], foe) ? '<p class="eyebrow">Stronger Side</p>' : ''}
        <button class="btn primary" id="hub-play">Play Match</button>
        ${mates.length || later.length ? `<div class="path">
          ${mates.length ? `<p class="eyebrow">Also This Round</p><p class="ln">${mates.join(' · ')}</p>` : ''}
          ${later.length ? `<p class="eyebrow">Still to Come</p><p class="ln">${later.join(' · ')}</p>` : ''}
        </div>` : ''}
      </div>`;
    $('hub-play').addEventListener('click', () => { const { opp } = userFixture(champ); startMatch(champ.teams[champ.user], champ.teams[opp], true); });
    $('hub-hon').hidden = true;
  } else {
    if (typeof cupEuroHub === 'function' && cupEuroHub(c, rows)) { /* won a European league: Play European Cup or Not Now (src/ui-cups.js) */ }
    else {
      $('hub-next').innerHTML = `<button class="btn primary" id="hub-new">New Championship</button>`;
      $('hub-new').addEventListener('click', () => { archiveChampionship(champ); champ = null; save(); homeShow('champ'); });   // the competitions are on the home
    }
    $('hub-hon').innerHTML = honours(c, rows).map(([t, i, gold]) => `<div class="hon${gold ? ' gold' : ''}"><span class="eyebrow">${t}</span><b>${esc(T[i].name)}</b></div>`).join('');
    $('hub-hon').hidden = false;
  }
  $('hub-table').innerHTML = rows.map((r, n) => `
    <tr class="${r.i === c.user ? 'me' : ''}">
      <td class="rk">${c.round ? n + 1 : '–'}</td>
      <td class="t"><span class="chip" style="--k:${HEX.test(T[r.i].kit) ? T[r.i].kit : '#888888'}"></span>${esc(T[r.i].name)}</td>
      <td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.PD > 0 ? '+' : ''}${r.PD}</td><td>${r.BP}</td><td class="pts">${r.Pts}</td>
    </tr>`).join('');
  $('hub-results').innerHTML = c.results.map((rd, k) => ({ rd, k })).reverse().map(({ rd, k }) => `
    <div class="rd"><p class="eyebrow">Round ${k+1}</p>
      ${rd.map(r => { const mine = r.h === c.user || r.a === c.user; return `<div class="result-entry"><div class="res${mine ? ' me' : ''}"><span class="h">${esc(T[r.h].name)}</span><span class="sc">${r.hs} – ${r.as}</span><span>${esc(T[r.a].name)}</span></div>${mine && r.stats ? `<details class="match-details"><summary>Recorded Match Stats</summary>${recordedStatsHtml(r.stats)}</details>` : ''}</div>`; }).join('')}
    </div>`).join('');
  $('hub-reset').textContent = 'Start Fresh'; resetArmed = false;
}
let resetArmed = false;
$('hub-back').addEventListener('click', goHome);
$('hub-reset').addEventListener('click', () => {
  if (!resetArmed) { resetArmed = true; confirmArm(); $('hub-reset').textContent = 'Tap Again to Start Fresh'; return; }
  if (confirmSoon()) return;
  archiveChampionship(champ); champ = null; save(); goHome();
});

