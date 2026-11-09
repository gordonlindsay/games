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
  const rows = matchTag() ? [] : [row('Conversions', of(S.conv.made[0], S.conv.att[0]), of(S.conv.made[1], S.conv.att[1]))];   // tag has no goal kicks and no close-ups
  if (S.pen.att[0] + S.pen.att[1]) rows.push(row('Penalty Goals', of(S.pen.made[0], S.pen.att[0]), of(S.pen.made[1], S.pen.att[1])));
  if (S.dg.att[0] + S.dg.att[1]) rows.push(row('Drop Goals', of(S.dg.made[0], S.dg.att[0]), of(S.dg.made[1], S.dg.att[1])));
  rows.push(row(matchTag() ? 'Tags' : 'Tackles', of(S.tk.made[0], S.tk.att[0]), of(S.tk.made[1], S.tk.att[1])));
  const duel = t => isHuman(t) ? of(S.duelN.won[t], S.duelN.att[t]) : '\u2013';
  if (!matchTag()) rows.push(row('Duels', duel(0), duel(1)));
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
    if (M.career && careerFestival(career)) { $('br-pts').hidden = true; }   // a festival has no table
    else if (M.careerCup) {                                  // a cup tie has no table points: what it did instead
      $('br-pts').textContent = (careerLast && careerLast.line) || '';
      $('br-pts').hidden = !$('br-pts').textContent;
    } else if (M.champ || M.career) {
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
  setFocus(null);
  $('m-break').hidden = false;
}
function finishMatch() {
  if (!M.two && !practice && settings.finished < 99) { settings.finished++; save(); }   // one player's own matches, played right through: quitting doesn't count
  if (M.champ && champ) recordChampResult();
  if (M.career) careerRecordResult();
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
  $('pz-score').textContent = practice ? practice.name : M.nat[0].name + ' ' + M.score[0] + '\u00a0–\u2060\u00a0' + M.score[1] + ' ' + M.nat[1].name;   // the score never splits across lines (the joiner stops a break after the dash). A Training Ground game is not a match: its own name, and no sides
  $('pz-quit').textContent = practice ? 'Leave Game' : 'Quit Match'; quitArmed = false;
  if (two.lost && two.lost.length) seatLost(two.lost[0]); else $('pz-seat').hidden = true;
  renderHintSwitches(); renderIcons();
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
}
let quitArmed = false;
$('b-pause').addEventListener('click', pause);
$('pz-resume').addEventListener('click', resume);
$('pz-quit').addEventListener('click', () => {
  if (!quitArmed) { quitArmed = true; $('pz-quit').textContent = (isDesk() ? 'Press Again to ' : 'Tap Again to ') + (practice ? 'Leave' : 'Quit'); return; }
  exitMatch();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
const uprightPhone = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
function phoneUpright() { pause(); releaseTouch(); }        // the cover pauses the match; the stick and the buttons let go too, so nothing is left held when the phone comes back
function onOrientation() { if (uprightPhone.matches) phoneUpright(); }
if (uprightPhone.addEventListener) uprightPhone.addEventListener('change', onOrientation);
else if (uprightPhone.addListener) uprightPhone.addListener(onOrientation);

/* home. Quick Match is the gold button and the keyboard focus. */
const BOOL = { sound:1, hints:1, coach:1 };
function renderHome() {
  renderCabinet('home-history');
  $('home-cabinet').hidden = !champHistory.length;
  for (const seg of document.querySelectorAll('.seg[data-key]')) {
    const key = seg.dataset.key;
    const val = key === 'pool' ? POOL_TABS.indexOf(settings.pool) : key === 'diff' ? kidsSegIndex() : BOOL[key] ? ((key === 'hints' ? settings.hints || settings.coach : settings[key]) ? 0 : 1) : settings[key];   // Difficulty is Kids | Easy | Normal | Hard (kids.js)
    [...seg.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === val)));
  }
  const note = $('champ-note');
  const live = champ && champ.teams && champ.teams[champ.user] && champ.round < 5;
  const done = champ && champ.teams && champ.teams[champ.user] && champ.round >= 5;
  if (live) {
    $('b-champ').textContent = 'Continue Championship';
    note.textContent = champNote(champ);
    note.hidden = false;
  } else if (done) {
    $('b-champ').textContent = 'Final Table';
    note.textContent = champNote(champ);
    note.hidden = false;
  } else { $('b-champ').textContent = 'Championship'; note.hidden = true; }
  renderCareerHome();
  renderYourTeam();
  renderIcons();
}
/* Your Team: the side you support, whichever you pick. Its league line and record show only where the list has real
   figures; a team you made or imported has none, so it shows none. The key names no side once a team is deleted or a
   league removed, and then this is the default. */
const myTeamOf = () => { const k = settings.myTeam; return ALL_TEAMS.find(t => t.id === k) || custom.find(t => t.key === k) || (importLeague && importLeague.teams.find(t => t.key === k)) || DEFAULT_TEAM; };
const yourTeamLeague = t => (t.league ? t.league + ' · ' + ordinal(t.place) + ' Last Season' : '');
const yourTeamRecord = t => (t.league ? ['Won ' + t.w, ...(t.d ? ['Drew ' + t.d] : []), 'Lost ' + t.l, t.pf + ' Scored', t.pa + ' Conceded'].join(' · ') : '');
function renderYourTeam() {
  const t = myTeamOf(), league = $('yt-league'), rec = $('yt-record');
  const womens = t.key ? teamSide(t) === 1 : settings.womens === 1;   // a listed side's figures are the men's, so they don't show on Women's; a team you made has its own side
  $('yt-jersey').innerHTML = jersey(t);
  const rated = t.key ? t : sideVersion(t, settings.womens);   // on Women's, a nation's own rating, and none for a nation with no women's side
  $('yt-stars').innerHTML = rated ? teamStars(rated) : '';
  $('yt-name').textContent = t.name;
  $('yt-eyebrow').textContent = womens ? "Your Team · Women's" : 'Your Team';
  league.textContent = womens ? '' : yourTeamLeague(t); league.hidden = !league.textContent;
  rec.textContent = womens ? '' : yourTeamRecord(t); rec.hidden = !rec.textContent;
  $('yt-play').textContent = t.key || sideVersion(t, settings.womens) ? 'Play as ' + t.name : 'Pick a Team';   // on Women's, a nation with no women's side
}
function yourTeamFit() { careerFit($('yt-panel')); }       // once the screen shows: a long name steps down until it fits
$('yt-play').addEventListener('click', () => { ac(); openTeams('quick'); });
$('yt-change').addEventListener('click', () => { ac(); openTeams('my'); });
function goHome() {
  navOnly = null;
  ratingsSync();
  renderHome();
  showScreen('s-home');
  yourTeamFit();
  const b = $('b-quick');
  if (b && typeof b.focus === 'function') b.focus();
}
for (const seg of document.querySelectorAll('.seg[data-key]')) {
  [...seg.children].forEach((btn, i) => btn.addEventListener('click', () => {
    const key = seg.dataset.key;
    if (key === 'diff' && kidsLevel() && i !== 0) { parentGate(() => { kidsSegSet(i); save(); renderHome(); }); return; }   // only a grown-up takes the game off the Kids level; a cancelled check leaves it as it was
    if (key === 'diff') kidsSegSet(i); else if (BOOL[key]) settings[key] = i === 0; else if (key === 'pool') settings.pool = POOL_TABS[i]; else if (key === 'womens') pickSideSet(i); else settings[key] = i;
    if (key === 'hints') settings.coach = settings.hints; // one home switch for control hints and coach tips
    save(); renderHome();
    if (key === 'sound') { if (settings.sound) ac(); else soundOff(); }
    if (key === 'pool') { renderTeams(); $('s-teams').scrollTop = 0; }
  }));
}
$('b-champ').addEventListener('click', () => {
  ac();
  if (champ) { renderHub(); showScreen('s-hub'); }
  else openTeams('champ');
});
$('b-quick').addEventListener('click', () => { ac(); openTeams('quick'); });
/* The camera and the half length: an icon button each, and a press moves to the next choice, with the choice in words on the button. Camera is on the home screen and the
   pause card (renderHintSwitches hides it for Two Player and the Training Ground, where it doesn't apply), and a change there takes effect in that match. Half length is the home screen's only. */
const CAM_WORDS = ['Top', 'Low', 'Mid', 'High'], HALF_WORDS = HALF_SECONDS.map(s => s/60 + ' Min');
function iconWord(id, name, word) { const b = $(id), label = name + ': ' + word; $(id + '-w').textContent = word; b.setAttribute('aria-label', label); b.title = label; }
function renderIcons() {
  for (const id of ['b-cam', 'pz-cam']) iconWord(id, 'Camera', CAM_WORDS[settings.cam]);
  iconWord('b-half', 'Half Length', HALF_WORDS[settings.half]);
}
function camNext() { settings.cam = (settings.cam + 1) % CAM_WORDS.length; settings.camPick = true; save(); renderIcons(); }   // a real choice, so a Top chosen here survives a reload (cleanSettings)
function halfNext() { settings.half = (settings.half + 1) % HALF_WORDS.length; save(); renderIcons(); }
$('b-cam').addEventListener('click', () => { camNext(); BV.peekUntil = performance.now() + BV_DEMO_PEEK; });   // the demo behind the home shows the height just picked for a moment, so the word has a picture
$('pz-cam').addEventListener('click', () => { camNext(); $('pz-cam-note').hidden = !(M && M.cut); });   // a close-up has its own camera: say so, or the press looks as if it did nothing
$('b-half').addEventListener('click', halfNext);
$('b-help').addEventListener('click', () => { renderHintSwitches(); showScreen('s-help'); });   // Replay Tutorial is dim with nothing to replay
$('h-back').addEventListener('click', goHome);
$('t-back').addEventListener('click', () => { if (pickMode === 'two') { navOnly = null; renderJoin(); showScreen('s-join'); return; } goHome(); });
$('t-change').addEventListener('click', () => { if (pickMode === 'two') twoSel.picking = 0; else { quickPick = null; quickAuto = false; } renderTeams(); $('s-teams').scrollTop = 0; });
$('t-default').addEventListener('click', () => pickTeam(myTeamOf()));   // pickTeam makes it the side on screen

/* two player: the join screen (computers only: the home button is desk-only), then the team screen for each player, then the match.
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
  renderHintSwitches();                                    // the Hints ticks: by half, so they follow Swap Players and show the saved state when the screen opens
}
function seatsChanged() { if (two.on && !$('s-join').hidden) renderJoin(); }   // a pad claiming a seat, Use Keyboard, Swap Players or a pad unplugged: the join screen follows
function startTwo() { navOnly = null; startMatch(twoSel.teams[0], twoSel.teams[1], false, { two:true, levels:twoSel.levels.slice() }); }
$('b-two').addEventListener('click', () => { ac(); openJoin(); });
$('j-back').addEventListener('click', () => { setTwo(false); goHome(); });
const saveTwoDiff = () => { settings.twoDiff = two.swapped ? twoSel.levels.slice().reverse() : twoSel.levels.slice(); save(); };   // stored by half (left, right): a fresh visit puts the halves back in order
function swapPlayers() { twoSwap(); twoSel.levels.reverse(); saveTwoDiff(); renderJoin(); }   // Swap Players: the device, the half and the Difficulty go with the player
function useKeyboard(s) { twoRelease(s); renderJoin(); }
$('j-swap').addEventListener('click', swapPlayers);
$('j-go').addEventListener('click', () => { ac(); openTeams('two'); });
for (const s of [0, 1]) {
  $('j-kb' + s).addEventListener('click', () => useKeyboard(s));
  [...$('j-diff' + s).children].forEach((b, i) => b.addEventListener('click', () => { twoSel.levels[s] = i; saveTwoDiff(); renderJoin(); }));
}

/* team select */
const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const keyOf = t => t.key || t.id;
function jersey(t, cls) {
  const k = HEX.test(t.kit) ? t.kit : '#888888', tr = HEX.test(t.trim) ? t.trim : '#f2efe6';
  return `<span class="jw ${cls || ''}"><span class="jersey${t.hoops ? ' hoops' : ''}" style="--kit:${k};--trim:${tr}"></span></span>`;
}
/* A side's stars, drawn: five star shapes, the lit ones over the dim, so a half star is half lit and half dim at any size. Inline, like the home's icons, so there is nothing to load. n is starsOf's value, whole or half.
   The picture carries its words for a screen reader, or quiet leaves them out where the same words are already beside it. */
const STAR_SHAPE = (i, half) => {
  const pts = []; for (let k = 0; k <= (half ? 5 : 9); k++) { const r = k % 2 ? 4.5 : 9.8, a = (-90 + (half ? -36 : 36)*k)*Math.PI/180; pts.push((10 + 20*i + r*Math.cos(a)).toFixed(1) + ' ' + (10.6 + r*Math.sin(a)).toFixed(1)); }
  return 'M' + pts.join('L') + 'Z';
};
const STAR_OFF = [0, 1, 2, 3, 4].map(i => STAR_SHAPE(i)).join('');
function starsHtml(n, quiet) {
  const whole = Math.floor(n), on = [0, 1, 2, 3, 4].filter(i => i < whole).map(i => STAR_SHAPE(i)).join('') + (n > whole ? STAR_SHAPE(whole, true) : '');
  return `<svg class="tstars" viewBox="0 0 100 20" ${quiet ? 'aria-hidden="true"' : `role="img" aria-label="${starsWords(n)}"`}><path class="off" d="${STAR_OFF}"/><path class="on" d="${on}"/></svg>`;
}
const teamStars = t => starsHtml(starsOf(t));
const fxName = (t, fit) => `<span class="fx-name"><span${fit ? ' data-fit' : ''}>${esc(t.name)}</span>${teamStars(t)}</span>`;   // a side's name with its stars under it, in a fixture
const jerseyRated = t => jersey(t).replace(/<\/span>$/, `<span class="ovr" aria-label="Overall ${overallOf(t)}">${overallOf(t)}</span></span>`);
function pips(v) { let s = ''; for (let i = 1; i <= 5; i++) s += `<i class="${i <= v ? 'on' : ''}"></i>`; return `<span class="pips" aria-label="${v} of 5">${s}</span>`; }
let teamList = [];
function teamCard(t, i) {
  const picked = pickMode === 'quick' && quickPick && keyOf(quickPick) === keyOf(t);
  const stronger = pickMode === 'quick' && quickPick && !picked && outmatched(quickPick, t);
  const yours = pickMode === 'my' && keyOf(myTeamOf()) === keyOf(t);   // Change Team: your team now is marked and can still be pressed, to keep it
  const btn = `<button class="team${picked || yours ? ' picked' : ''}" data-i="${i}" ${picked ? 'aria-disabled="true"' : ''}${yours ? ' aria-current="true"' : ''}>
      ${jerseyRated(t)}<span class="tid"><span class="tname">${esc(t.name)}</span>${teamStars(t)}</span>
      ${t.league ? `<span class="tline">${ordinal(t.place)} · ${t.pf} Scored · ${t.pa} Conceded</span>` : ''}
      ${stronger ? '<span class="gap">Stronger Side</span>' : ''}
      <span class="stats">${ABILITIES.map(([k, l]) => `<span>${l}</span>${pips(Math.round(abilityOf(t, k)))}`).join('')}</span>
    </button>`;
  return t.custom ? `<div class="tcard">${btn}<button class="btn" data-edit="${i}">Edit</button></div>` : btn;
}
/* The list on a tab, as Men's (0) or Women's (1): International is every nation of that side, strongest first; a club list is the same clubs at the same ratings. */
const poolTeams = (i, g = 0) => (i === IMPORT_POOL ? (importLeague ? importLeague.teams.filter(t => pickMode === 'my' || sidesMeet(t, { g })) : g ? CLUBS.map(womenClub) : CLUBS) : i === 0 ? nationsRanked(g) : g ? POOLS[i].map(womenClub) : POOLS[i]);
/* Men's | Women's is for Quick Match and a Championship, and goes for the whole pick. Two Player has no toggle (Top shows no body difference) and plays men's ratings. */
const pickToggled = () => pickMode === 'quick' || pickMode === 'champ';
const pickG = () => (pickToggled() ? settings.womens : 0);
/* A club tab reads strongest first, as International does, level sides in list order, so England stays in its table order. My League keeps its own table's order. */
const tabTeams = (i, g = 0) => { const l = poolTeams(i, g); return i === IMPORT_POOL || i === 0 ? l : l.slice().sort((a, b) => rateOf(b) - rateOf(a)); };
/* The line under the tabs says where the numbers come from. A women's club has no results of its own here yet. My League's come from your league's table, and the import says so. */
const tabRatingsLine = (i, g = 0) => (i === IMPORT_POOL ? '' : i === 0 ? ratingsLine() : g ? "Club Ratings Use the Men's Results for Now" : "Ratings from Last Season's Table, Scored and Conceded");
const pickFits = t => pickMode === 'my' || sidesMeet(t, { g:pickG() });   // a team you made or imported keeps its side, so it shows only where it can play; Your Team's picker shows them all
/* Your own team keeps its side, so the toggle goes with it: a picked team that has no version on the new side is put down, never left to play the wrong one. */
function pickFollow(t) {
  const s = teamSide(t);
  if (!pickToggled() || s === 'mixed' || settings.womens === s) return;
  settings.womens = s;
  if (quickPick && quickPick !== t) quickPick = sideVersion(quickPick, s);
}
/* The toggle: the team you have picked becomes its own other side (England's women, Farnham's women), or, with none (Georgia, a men's team you made), is put down, and you pick again. */
function pickSideSet(g) {
  if (!pickToggled() || (g !== 0 && g !== 1) || settings.womens === g) return;
  settings.womens = g;
  if (quickPick) { quickPick = sideVersion(quickPick, g); if (!quickPick) quickAuto = false; }
  renderTeams(); $('s-teams').scrollTop = 0;
}
function poolOfTeam(t) {                                   // the tab a side is on: its own list first, Local for a team you made
  if (t.custom) return 1;
  if (importLeague && importLeague.teams.includes(t)) return IMPORT_POOL;
  return allNations().includes(t) ? 0 : Math.max(1, POOLS.findIndex(p => p.includes(t)));
}
function poolTabCue(row) {                                 // a fade on the side with more tabs to swipe to: the scrollbar is hidden, and a tab past the edge would otherwise look gone
  const left = row.scrollLeft, room = row.scrollWidth - row.clientWidth;
  row.classList.toggle('more-l', left > 1);
  row.classList.toggle('more-r', left < room - 1);
}
function poolTabShow() {                                   // the tabs scroll sideways on a narrow screen: keep the one in use in view, without moving the page
  for (const b of document.querySelectorAll('.pool button')) {
    const row = b.parentElement;
    if (!row) continue;
    if (b.getAttribute('aria-pressed') === 'true') {
      const r = b.getBoundingClientRect(), o = row.getBoundingClientRect();
      if (r.left < o.left) row.scrollLeft += r.left - o.left;
      else if (r.right > o.right) row.scrollLeft += r.right - o.right;
    }
    poolTabCue(row);
  }
}
for (const row of document.querySelectorAll('.pool')) row.addEventListener('scroll', () => poolTabCue(row), { passive:true });
function openTeams(m) {
  ratingsSync();                                           // new ratings count from a new pick on
  const mine = m === 'two' ? null : myTeamOf();            // Your Team's tab; Two Player opens on Local
  pickMode = m; settings.pool = mine ? poolOfTeam(mine) : 1;
  if ((m === 'quick' || m === 'champ') && mine.key) pickFollow(mine);
  quickPick = m === 'quick' ? sideVersion(mine, settings.womens) : null; quickAuto = !!quickPick;
  if (m === 'two') twoSel.picking = 0;                     // Player 1 picks first (Change Teams after a match comes back here too)
  renderTeams(); showScreen('s-teams'); $('s-teams').scrollTop = 0;
}
function renderTeams() {
  const quick = pickMode === 'quick', pair = pickMode === 'two', my = pickMode === 'my', p = twoSel.picking, mine = pair ? twoSel.teams[0] : quickPick;   // two player: Player 1 picks first; while Player 2 picks, Player 1's team sits in the bar with Change Team (his own big action presses it); the title and eyebrow are the picker's, in his colour
  const eb = $('t-eyebrow');
  eb.textContent = quick ? 'Quick Match' : pair ? 'Two Player' : my ? 'Your Team' : 'Championship';
  eb.classList.toggle('p1', pair && p === 0); eb.classList.toggle('p2', pair && p === 1);
  $('t-title').textContent = pair ? 'Player ' + (p + 1) + ' Team' : quick && quickPick ? 'Pick Opponent' : 'Pick Your Team';
  if (settings.pool === IMPORT_POOL && importLeague && !importLeague.teams.some(pickFits)) settings.pool = 1;   // the league is all the other side
  [...document.querySelectorAll('.pool button')].forEach((b, i) => b.setAttribute('aria-pressed', String(POOL_TABS[i] === settings.pool)));
  poolTabShow();
  $('t-side').hidden = !pickToggled();
  [...$('t-side').children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === settings.womens)));
  $('t-ratings').textContent = tabRatingsLine(settings.pool, pickG()); $('t-ratings').hidden = !$('t-ratings').textContent;
  const yours = (quick && !!quickPick) || (pair && p === 1);
  $('t-yours').hidden = !yours;
  if (yours) $('t-mine').innerHTML = `${jersey(mine)}<span class="fx-name"><span>${pair ? 'Player 1 · ' : ''}${esc(mine.name)}</span>${teamStars(mine)}</span>`;
  const supported = myTeamOf();                            // a championship's gold button: Your Team, on the tab it plays from, where it has a side to play
  $('t-default').hidden = pickMode !== 'champ' || settings.pool !== poolOfTeam(supported) || !sideVersion(supported, settings.womens);
  $('t-back').textContent = pair ? 'Back to Players' : 'Back to Menu';
  navOnly = pair ? p : null;
  $('t-default').textContent = 'Play as ' + supported.name;
  teamList = [...tabTeams(settings.pool, pickG()), ...custom.filter(pickFits)];   // My League: src/import.js
  let html = teamList.map(teamCard).join('');
  if (custom.length < MAX_CUSTOM) html += `<button class="team create" id="t-create"><span class="plus" aria-hidden="true">+</span><span class="tname">Create Team</span></button>`;
  html += importCard();                                    // Import Club, src/import.js
  $('t-grid').innerHTML = html;
  for (const b of $('t-grid').querySelectorAll('.team[data-i]')) b.addEventListener('click', () => pickTeam(teamList[+b.dataset.i]));
  for (const b of $('t-grid').querySelectorAll('[data-edit]')) b.addEventListener('click', () => openBuilder(teamList[+b.dataset.edit]));
  const cr = $('t-create'); if (cr) cr.addEventListener('click', () => openBuilder(null));
  importBind();
  fitNames();
}
/* A name too long for its card steps down in size until its longest word fits. */
function fitNames() {
  for (const el of $('t-grid').querySelectorAll('.tname')) {
    el.style.fontSize = '';
    let px = parseFloat(getComputedStyle(el).fontSize) || 24;
    while (el.scrollWidth > el.clientWidth + 0.5 && px > 13) { px -= 1; el.style.fontSize = px + 'px'; }
  }
}
/* A championship is your team and five others from the list on screen (champOthers). */
function pickTeam(t) {
  if (pickMode === 'my') { settings.myTeam = keyOf(t); save(); goHome(); return; }
  if (!pickFits(t) && (t.key || pickMode === 'two')) return;   // a side the list on screen would not show
  if (pickMode === 'two') {                                  // Player 1 changing their team comes back to Player 2's pick; Player 2's pick starts the match
    if (twoSel.picking === 0) { twoSel.teams[0] = t; twoSel.picking = 1; renderTeams(); $('s-teams').scrollTop = 0; return; }
    twoSel.teams[1] = t; startTwo(); return;
  }
  t = sideVersion(t, settings.womens);                       // the whole pick is one side
  if (!t) return;
  if (pickMode === 'champ') {
    newChamp(t, champOthers(t, settings.pool, settings.womens)); renderHub(); showScreen('s-hub'); return;
  }
  if (quickPick == null) { quickPick = t; quickAuto = false; renderTeams(); $('s-teams').scrollTop = 0; return; }
  if (keyOf(quickPick) === keyOf(t)) return;   // the picked card can still be reached from the keyboard
  startMatch(quickPick, t, false);
}

/* create team */
let draft = null, editing = null, codeTouched = false, delArmed = false;
let levelChoosing = false, levelNote = '';                 // a new team starts on the level list; the note says what a lower level took off
const spent = d => ABILITIES.reduce((a, [k]) => a + d[k] - 1, 0);
const BD_SIDES = [0, 1, 'mixed'];                            // Men's | Women's | Mixed
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
  [...$('bd-side').children].forEach((b, i) => b.addEventListener('click', () => { draft.g = BD_SIDES[i]; renderBuilder(); }));
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
      const was = quickPick && keyOf(quickPick) === editing.key;
      if (was) quickPick = custom[i];
      if (was || !quickPick) pickFollow(custom[i]);          // your team's side changed, or nothing is picked: the list follows, so the team stays in view
      if (twoSel.teams[0] && keyOf(twoSel.teams[0]) === editing.key) twoSel.teams[0] = teamSide(custom[i]) === 1 ? DEFAULT_TEAM : custom[i];   // Two Player plays men's sides
    } else {
      custom.push(cleanTeam({ ...t, key:'my' + Date.now().toString(36) }, custom.length));
      const made = custom[custom.length - 1];
      if (pickMode === 'quick' && quickAuto) { quickPick = made; quickAuto = false; pickFollow(made); }   // made it to play as it
      else if (pickMode === 'two' && twoSel.picking === 0 && pickFits(made)) { twoSel.teams[0] = made; twoSel.picking = 1; }   // Player 1 made it to play as it
      else if (pickToggled() && !quickPick) pickFollow(made);   // nothing picked yet: the list follows, so the new team is there
      else if (pickMode === 'my') { settings.myTeam = keyOf(custom[custom.length - 1]); save(); goHome(); return; }   // made it to support it
    }
    save(); renderTeams(); showScreen('s-teams');
  });
  $('bd-back').addEventListener('click', () => { renderTeams(); showScreen('s-teams'); });
  $('bd-del').addEventListener('click', () => {
    if (!delArmed) { delArmed = true; $('bd-del').textContent = 'Confirm Delete'; return; }
    custom = custom.filter(c => c.key !== editing.key);
    if (settings.myTeam === editing.key) settings.myTeam = DEFAULT_TEAM.id;
    if (quickPick && keyOf(quickPick) === editing.key) quickPick = null;
    if (twoSel.teams[0] && keyOf(twoSel.teams[0]) === editing.key) twoSel.teams[0] = DEFAULT_TEAM;
    save(); renderTeams(); showScreen('s-teams');
  });
}
function openBuilder(t) {
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
  $('bd-jersey').innerHTML = jersey(draft) + (levelChoosing ? '' : teamStars(draft));   // once a level is chosen: what the points spent come to, on the same scale as every other side, and the level's own stars with them all spent
  [...$('bd-pat').children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === (draft.hoops ? 1 : 0))));
  [...$('bd-side').children].forEach((b, i) => b.setAttribute('aria-pressed', String(BD_SIDES[i] === teamSide(draft))));
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
function renderCabinet(id) {
  const history = champHistory.slice().reverse();
  const totals = savedHonours();
  const tally = [['Title', 'Titles', totals.champions], ['Grand Slam', 'Grand Slams', totals.grandSlams], ['Triple Crown', 'Triple Crowns', totals.tripleCrowns]];
  $(id).innerHTML = `<p class="stat-note">Last 10 completed seasons · saved in this browser.</p>`
    + (history.length ? `<p class="cabinet-tally">${tally.map(([singular, plural, n]) => `${n} ${n === 1 ? singular : plural}`).join(' · ')}</p>` + history.map((c, i) => {
      const rows = standings(c), place = rows.findIndex(r => r.i === c.user) + 1, s = seasonSummary(c);
      const awards = honours(c, rows).filter(h => h[1] === c.user).map(h => h[0]);
      return `<article class="season-entry"><p class="eyebrow">${i === 0 ? 'Most Recent' : 'Earlier Season'}</p><h3>${esc(c.teams[c.user].name)} · ${ordinal(place)}</h3><p>${s.played ? seasonRecord(s) : 'No matches played'}</p><p>Points ${s.pointsFor} for / ${s.pointsAgainst} against · Tries ${s.triesFor} for / ${s.triesAgainst} against</p><p class="season-awards">${awards.length ? awards.join(' · ') : 'No honours'}</p></article>`;
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
          <span class="fx-team">${jersey(T[h])}${fxName(T[h])}</span>
          <span class="fx-v">V</span>
          <span class="fx-team r">${fxName(T[a])}${jersey(T[a])}</span>
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
    $('hub-next').innerHTML = `<button class="btn primary" id="hub-new">New Championship</button>`;
    $('hub-new').addEventListener('click', () => { archiveChampionship(champ); champ = null; save(); openTeams('champ'); });
    $('hub-hon').innerHTML = honours(c, rows).map(([t, i, gold]) => `<div class="hon${gold ? ' gold' : ''}"><span class="eyebrow">${t}</span><b>${esc(T[i].name)}</b></div>`).join('');
    $('hub-hon').hidden = false;
  }
  $('hub-table').innerHTML = rows.map((r, n) => `
    <tr class="${r.i === c.user ? 'me' : ''}">
      <td class="rk">${c.round ? n + 1 : '–'}</td>
      <td class="t"><span class="chip" style="--k:${HEX.test(T[r.i].kit) ? T[r.i].kit : '#888888'};--t:${HEX.test(T[r.i].trim) ? T[r.i].trim : '#f2efe6'}"></span>${esc(T[r.i].name)}${teamStars(T[r.i])}</td>
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
  if (!resetArmed) { resetArmed = true; $('hub-reset').textContent = 'Tap Again to Start Fresh'; return; }
  archiveChampionship(champ); champ = null; save(); goHome();
});

