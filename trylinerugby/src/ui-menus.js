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
    if (M.champ) {
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
  if (M.champ && champ) recordChampResult();
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
  if (practice && (practice.done || practice.ready)) return;
  if (!playing() || M.over || M.phase === 'break') return;
  M.paused = true;
  $('pz-score').textContent = M.nat[0].name + ' ' + M.score[0] + '\u00a0–\u2060\u00a0' + M.score[1] + ' ' + M.nat[1].name;   // the score never splits across lines (the joiner stops a break after the dash)
  $('pz-quit').textContent = 'Quit Match'; quitArmed = false;
  if (two.lost && two.lost.length) seatLost(two.lost[0]); else $('pz-seat').hidden = true;
  renderHintSwitches();
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
  if (!quitArmed) { quitArmed = true; $('pz-quit').textContent = isDesk() ? 'Press Again to Quit' : 'Tap Again to Quit'; return; }
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
    const val = BOOL[key] ? ((key === 'hints' ? settings.hints || settings.coach : settings[key]) ? 0 : 1) : settings[key];
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
}
function goHome() {
  navOnly = null;
  renderHome();
  showScreen('s-home');
  const b = $('b-quick');
  if (b && typeof b.focus === 'function') b.focus();
}
for (const seg of document.querySelectorAll('.seg[data-key]')) {
  [...seg.children].forEach((btn, i) => btn.addEventListener('click', () => {
    const key = seg.dataset.key;
    if (BOOL[key]) settings[key] = i === 0; else settings[key] = i;
    if (key === 'hints') settings.coach = settings.hints; // one home switch for control hints and coach tips
    save(); renderHome();
    if (key === 'sound' && settings.sound) ac();
    if (key === 'pool') { renderTeams(); $('s-teams').scrollTop = 0; }
  }));
}
$('b-champ').addEventListener('click', () => {
  ac();
  if (champ) { renderHub(); showScreen('s-hub'); }
  else openTeams('champ');
});
$('b-quick').addEventListener('click', () => { ac(); openTeams('quick'); });
$('b-help').addEventListener('click', () => { renderHintSwitches(); showScreen('s-help'); });   // Replay Tutorial is dim with nothing to replay
$('h-back').addEventListener('click', goHome);
$('t-back').addEventListener('click', () => { if (pickMode === 'two') { navOnly = null; renderJoin(); showScreen('s-join'); return; } goHome(); });
$('t-change').addEventListener('click', () => { if (pickMode === 'two') twoSel.picking = 0; else { quickPick = null; quickAuto = false; } renderTeams(); $('s-teams').scrollTop = 0; });
$('t-default').addEventListener('click', () => pickTeam(DEFAULT_TEAM));

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
function pips(v) { let s = ''; for (let i = 1; i <= 5; i++) s += `<i class="${i <= v ? 'on' : ''}"></i>`; return `<span class="pips" aria-label="${v} of 5">${s}</span>`; }
let teamList = [];
function teamCard(t, i) {
  const picked = pickMode === 'quick' && quickPick && keyOf(quickPick) === keyOf(t);
  const stronger = pickMode === 'quick' && quickPick && !picked && outmatched(quickPick, t);
  const btn = `<button class="team${picked ? ' picked' : ''}" data-i="${i}" ${picked ? 'aria-disabled="true"' : ''}>
      ${jersey(t)}<span class="tname">${esc(t.name)}</span>
      ${stronger ? '<span class="gap">Stronger Side</span>' : ''}
      <span class="stats">${ABILITIES.map(([k, l]) => `<span>${l}</span>${pips(t[k])}`).join('')}</span>
    </button>`;
  return t.custom ? `<div class="tcard">${btn}<button class="btn" data-edit="${i}">Edit</button></div>` : btn;
}
function openTeams(m) {
  pickMode = m; settings.pool = 1; quickPick = m === 'quick' ? DEFAULT_TEAM : null; quickAuto = m === 'quick';
  if (m === 'two') twoSel.picking = 0;                     // Player 1 picks first (Change Teams after a match comes back here too)
  renderTeams(); showScreen('s-teams'); $('s-teams').scrollTop = 0;
}
function renderTeams() {
  const quick = pickMode === 'quick', pair = pickMode === 'two', p = twoSel.picking, mine = pair ? twoSel.teams[0] : quickPick;   // two player: Player 1 picks first; while Player 2 picks, Player 1's team sits in the bar with Change Team (his own big action presses it); the title and eyebrow are the picker's, in his colour
  const eb = $('t-eyebrow');
  eb.textContent = quick ? 'Quick Match' : pair ? 'Two Player' : 'Championship';
  eb.classList.toggle('p1', pair && p === 0); eb.classList.toggle('p2', pair && p === 1);
  $('t-title').textContent = pair ? 'Player ' + (p + 1) + ' Team' : quick && quickPick ? 'Pick Opponent' : 'Pick Your Team';
  [...document.querySelectorAll('.pool button')].forEach((b, i) => b.setAttribute('aria-pressed', String(i === settings.pool)));
  const yours = (quick && !!quickPick) || (pair && p === 1);
  $('t-yours').hidden = !yours;
  if (yours) $('t-mine').innerHTML = `${jersey(mine)}<span>${pair ? 'Player 1 · ' : ''}${esc(mine.name)}</span>`;
  $('t-default').hidden = quick || pair || settings.pool !== 1;
  $('t-back').textContent = pair ? 'Back to Players' : 'Back to Menu';
  navOnly = pair ? p : null;
  $('t-default').textContent = 'Play as ' + DEFAULT_TEAM.name;
  teamList = [...POOLS[settings.pool], ...custom];
  let html = teamList.map(teamCard).join('');
  if (custom.length < MAX_CUSTOM) html += `<button class="team create" id="t-create"><span class="plus" aria-hidden="true">+</span><span class="tname">Create Team</span></button>`;
  $('t-grid').innerHTML = html;
  for (const b of $('t-grid').querySelectorAll('.team[data-i]')) b.addEventListener('click', () => pickTeam(teamList[+b.dataset.i]));
  for (const b of $('t-grid').querySelectorAll('[data-edit]')) b.addEventListener('click', () => openBuilder(teamList[+b.dataset.edit]));
  const cr = $('t-create'); if (cr) cr.addEventListener('click', () => openBuilder(null));
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
/* A championship is your team and five others from the list on screen. */
function pickTeam(t) {
  if (pickMode === 'two') {                                  // Player 1 changing his team comes back to Player 2's pick; Player 2's pick starts the match
    if (twoSel.picking === 0) { twoSel.teams[0] = t; twoSel.picking = 1; renderTeams(); $('s-teams').scrollTop = 0; return; }
    twoSel.teams[1] = t; startTwo(); return;
  }
  if (pickMode === 'champ') {
    const others = shuffle(POOLS[settings.pool].filter(o => keyOf(o) !== keyOf(t)));
    newChamp(t, others); renderHub(); showScreen('s-hub'); return;
  }
  if (quickPick == null) { quickPick = t; quickAuto = false; renderTeams(); $('s-teams').scrollTop = 0; return; }
  if (keyOf(quickPick) === keyOf(t)) return;   // the picked card can still be reached from the keyboard
  startMatch(quickPick, t, false);
}

/* create team */
let draft = null, editing = null, codeTouched = false, delArmed = false;
const spent = d => ABILITIES.reduce((a, [k]) => a + d[k] - 1, 0);
function buildBuilder() {
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
    if (d > 0 && (draft[k] >= 5 || spent(draft) >= BUDGET)) return;
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
      if (quickPick && keyOf(quickPick) === editing.key) quickPick = custom[i];
      if (twoSel.teams[0] && keyOf(twoSel.teams[0]) === editing.key) twoSel.teams[0] = custom[i];
    } else {
      custom.push(cleanTeam({ ...t, key:'my' + Date.now().toString(36) }, custom.length));
      if (pickMode === 'quick' && quickAuto) { quickPick = custom[custom.length - 1]; quickAuto = false; }   // made it to play as it
      else if (pickMode === 'two' && twoSel.picking === 0) { twoSel.teams[0] = custom[custom.length - 1]; twoSel.picking = 1; }   // Player 1 made it to play as it
    }
    save(); renderTeams(); showScreen('s-teams');
  });
  $('bd-back').addEventListener('click', () => { renderTeams(); showScreen('s-teams'); });
  $('bd-del').addEventListener('click', () => {
    if (!delArmed) { delArmed = true; $('bd-del').textContent = 'Confirm Delete'; return; }
    custom = custom.filter(c => c.key !== editing.key);
    if (quickPick && keyOf(quickPick) === editing.key) quickPick = null;
    if (twoSel.teams[0] && keyOf(twoSel.teams[0]) === editing.key) twoSel.teams[0] = DEFAULT_TEAM;
    save(); renderTeams(); showScreen('s-teams');
  });
}
function openBuilder(t) {
  editing = t;
  draft = t ? { ...t } : { name:'', kit:'#2050b0', trim:'#f2efe6', pace:1, power:1, handling:1, kicking:1 };
  codeTouched = !!t;
  $('bd-name').value = draft.name;
  $('bd-code').value = t ? t.id : autoCode('My Team');
  $('bd-eyebrow').textContent = t ? 'Edit Team' : 'Create Team';
  $('bd-del').hidden = !t; $('bd-row').classList.toggle('one', !t);
  delArmed = false; $('bd-del').textContent = 'Delete Team';
  renderBuilder(); showScreen('s-build'); $('s-build').scrollTop = 0;
}
function renderBuilder() {
  $('bd-title').textContent = draft.name.trim() || 'My Team';
  $('bd-jersey').innerHTML = jersey(draft);
  [...$('bd-pat').children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === (draft.hoops ? 1 : 0))));
  for (const [id, key] of [['bd-kit', 'kit'], ['bd-trim', 'trim']])
    for (const b of $(id).querySelectorAll('.sw')) b.setAttribute('aria-pressed', String(b.dataset.c === draft[key]));
  const left = BUDGET - spent(draft);
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
    $('hub-next').innerHTML = `<button class="btn primary" id="hub-new">New Championship</button>`;
    $('hub-new').addEventListener('click', () => { archiveChampionship(champ); champ = null; save(); openTeams('champ'); });
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
  if (!resetArmed) { resetArmed = true; $('hub-reset').textContent = 'Tap Again to Start Fresh'; return; }
  archiveChampionship(champ); champ = null; save(); goHome();
});

