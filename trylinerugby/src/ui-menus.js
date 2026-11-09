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
  if (practice) practiceChoose(); else exitMatch();       // a drill: Back to Skills, or Back to Career for a caller (which hears it as a quit)
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
const uprightPhone = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
function phoneUpright() { pause(); releaseTouch(); }        // the cover pauses the match; the stick and the buttons let go too, so nothing is left held when the phone comes back
function onOrientation() { if (uprightPhone.matches) phoneUpright(); }
if (uprightPhone.addEventListener) uprightPhone.addEventListener('change', onOrientation);
else if (uprightPhone.addListener) uprightPhone.addListener(onOrientation);

/* home. Five headlines along the bottom in equal parts (HOME_HL: Quick Match, Championship, Career, Skills Mini Games, Settings),
   the chosen one's buttons above them, big, and My Team, the Locker and Add Your Team at the top beside the logo. The headline last
   chosen is kept (settings.hl; Quick Match's key is still 'game', so saves keep it). The first press of a controller, and the focus,
   land on the chosen headline's first button: Play on Quick Match. Left and Right move along the bar (the arrow keys, or a
   controller's ring), and pressing a headline shows its buttons. Two Player has no button here (the owner: "take out 2 player from
   the menu. doesn't work for mobile"): openJoin is its way in, kept with the mode. */
const BOOL = { sound:1, hints:1, coach:1 };
const homeHl = () => (HOME_HL.includes(settings.hl) ? settings.hl : 'game');
function renderHome() {
  storeRender();                                           // the locks, Grown-Ups and the Super Fan badge (src/ui-store.js); nothing on the web today
  const hl = homeHl();
  for (const k of HOME_HL) {
    const tab = $('hl-' + k), on = k === hl;
    tab.setAttribute('aria-selected', String(on)); tab.tabIndex = on ? 0 : -1;   // one stop on the bar for Tab; the arrow keys move along it
    $('hp-' + k).hidden = !on;
  }
  for (const seg of document.querySelectorAll('.seg[data-key]')) {
    const key = seg.dataset.key;
    const val = key === 'diff' ? kidsSegIndex() : BOOL[key] ? ((key === 'hints' ? settings.hints || settings.coach : settings[key]) ? 0 : 1) : settings[key];   // Difficulty is Kids | Easy | Normal | Hard (kids.js)
    [...seg.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === val)));
  }
  myHome();
  champHome();
  renderCareerHome();
  practiceGroups();                                         // Skills Mini Games: the contact games hidden for the youngest, the grown-ups' panel shut (practice.js)
  lockerHome();                                             // a dot on Locker while a new medal waits (src/ui-locker.js)
  if (typeof importHome === 'function') importHome();      // Add Your Team, where the team screen's Add Your Team card would show (src/import.js)
}
/* A note under Continue Championship or Continue Career: Bath · Round 2 of 5. The team's name (and its separator) is a span of its own
   (.rn-name); under a button the panel's width the note keeps it, and a long one ends in an ellipsis on a phone held sideways (styles.css). */
function homeNote(el, text, name) {
  const i = name ? text.indexOf(name + ' · ') : -1;
  el.innerHTML = i < 0 ? esc(text) : esc(text.slice(0, i)) + '<span class="rn-name">' + esc(name + ' · ') + '</span>' + esc(text.slice(i + name.length + 3));
  el.hidden = false;
}
/* The chosen headline's first button that can be pressed: where the focus and a controller's first press land. */
function homeFirst() {
  const p = $('hp-' + homeHl());
  const live = b => !b.hidden && !b.disabled && !(b.closest && b.closest('[hidden]')) && (!b.getBoundingClientRect || b.getBoundingClientRect().width > 0);
  return (p && p.querySelectorAll && [...p.querySelectorAll('.btn, .seg button')].find(live)) || $('hl-' + homeHl());
}
DEFAULT_FOCUS['s-home'] = homeFirst;
function goHome(focus) {
  if (typeof nativePutBack === 'function') nativePutBack();   // the app: a save Preferences gave back late goes in first (native.js)
  navOnly = null;
  renderHome();
  showScreen('s-home');
  homeFit();
  const b = focus && !focus.hidden && !(focus.closest && focus.closest('[hidden]')) ? focus : homeFirst();
  if (b && typeof b.focus === 'function') b.focus();
}
/* A headline picked: its buttons show and it is remembered. focus: where the focus goes after (the headline itself, from the bar). */
function homeSelect(k, focus) {
  if (!HOME_HL.includes(k)) return;
  if (settings.hl !== k) { settings.hl = k; save(); }
  renderHome();
  if (focus && typeof focus.focus === 'function') focus.focus();
}
function homeShow(k, focus) { if (HOME_HL.includes(k) && settings.hl !== k) { settings.hl = k; save(); } goHome(focus); }   // the home, on a headline (New Championship: Championship, where the competitions are)
for (const k of HOME_HL) $('hl-' + k).addEventListener('click', () => { ac(); homeSelect(k, $('hl-' + k)); });
$('hl-bar').addEventListener('keydown', e => {             // Left and Right along the bar (Home and End to its ends), each headline shown as it is reached
  const i = HOME_HL.indexOf(homeHl());
  const j = e.key === 'ArrowRight' ? Math.min(i + 1, HOME_HL.length - 1) : e.key === 'ArrowLeft' ? Math.max(i - 1, 0) : e.key === 'Home' ? 0 : e.key === 'End' ? HOME_HL.length - 1 : -1;
  if (j < 0) return;
  if (e.preventDefault) e.preventDefault();
  homeSelect(HOME_HL[j], $('hl-' + HOME_HL[j]));
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

/* My Team: your club and your country, picked once on the team screen (openTeams('my')) and kept as settings.myClub and myNat. A club is
   any side the team picker offers bar a nation: a national league's, Local's, one you made or imported, or a side of My League. Unset,
   or gone (a team deleted, its league removed), it is the Super Fan's club or Farnham, as the game always started; the country unset is
   England. Quick Match and 2 Players only offer it first in Player 1's list, marked My Team, and never pick it; Championship (the club
   for a league, the country for an international competition) and a new Career pick it for you, to change there. */
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
function myHome() {                                        // the home's My Team: the club's and the country's shirts and names
  const c = myClubTeam(), n = myNatTeam(null);
  $('my-kits').innerHTML = [c, n].map(t => `<span class="my-side">${jersey(t, 'mini')}<b>${esc(listName(t))}</b></span>`).join('');
  $('b-my').setAttribute('aria-label', 'My Team: ' + listName(c) + ', ' + listName(n));
  homeFit();
}
function homeFit() {                                       // long names (Christchurch, South Africa) step down together until both fit, once the home has a size
  const box = $('my-kits'); if ($('s-home').hidden || !box.style || !box.querySelectorAll) return;
  box.style.fontSize = '';
  const names = [...box.querySelectorAll('b')], over = () => names.some(b => b.scrollWidth > b.clientWidth + 0.5);
  let px = parseFloat(getComputedStyle(box).fontSize) || 19;
  while (over() && px > 12) { px -= 1; box.style.fontSize = px + 'px'; }
}
$('b-my').addEventListener('click', () => { ac(); openTeams('my'); });

/* Championship's buttons: Continue first while a championship or a cup is saved (its hub then has New Championship or Start Fresh);
   otherwise International | National | Local, the team screen's tier names, and that tier's competitions: the nation's championship
   (its six), the World Cup and the Home Nations Tour; each national league, a trophy on the four that lead to the European Cup; Surrey
   and My League. Each goes to the team screen with only that competition's sides. The Trophy Cabinet is here too. All of it is the
   Full Game's but the Trophy Cabinet (src/store.js). */
let homeTier = null;                                       // the tier on show, while the game runs: first the one My Team's club is on
const champComps = tier => (tier === 0 ? [['int', 'Championship'], ['world', 'World Cup'], ['tour', 'Home Nations Tour']]
  : tier === 1 ? TEAM_LISTS.filter(l => l.tier === 1).map(l => [l.key, l.name])
  : [['sur', 'Surrey'], ...(importLeague ? [[IMPORT_POOL, 'My League']] : [])]);
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
  if (box.dataset.key !== key) {                            // drawn again only when the tier or a lock changes, so a controller's ring stays put
    box.dataset.key = key;
    box.className = 'hc-comps n' + comps.length;
    box.innerHTML = comps.map(([k, n]) => `<button class="btn hc-comp" id="hc-${k}" data-comp="${k}">${typeof cupEuroLeague === 'function' && cupEuroLeague(k) ? `<span class="cup-trophy" data-kind="euro" data-metal="${trophyMetal('euro')}" role="img" aria-label="European Cup"></span>` : ''}<span>${esc(n)}</span></button>`).join('');
    for (const b of box.querySelectorAll('[data-comp]')) { b.addEventListener('click', () => champPick(b.dataset.comp)); storeMark(b, 'champ'); }
  }
  $('b-cabinet').hidden = !champHistory.length && !(typeof lockerFanClubs === 'function' && lockerFanClubs().length);   // a finished season or cup, or a Super Fan trophy (src/ui-locker.js)
}
function champPick(k) {
  ac();
  if (!storeGate('champ', () => champPick(k))) return;     // locked: the Unlock card
  if (cup || champ) { $('b-champ').click(); return; }      // one is saved: its own hub (the home shows Continue then)
  openTeams('champ', k);
}
$('b-champ').addEventListener('click', () => {
  ac();
  if (!storeGate('champ', () => $('b-champ').click())) return;   // locked: the Unlock card; a championship under way stays saved
  if (cup) { renderCup(); showScreen('s-cup'); }          // a cup under way (src/ui-cups.js)
  else if (champ) { renderHub(); showScreen('s-hub'); }
  else { homeSelect('champ'); }
});
$('b-cabinet').addEventListener('click', () => { renderCabinet('home-history'); showScreen('s-cabinet'); $('s-cabinet').scrollTop = 0; });
$('cab-back').addEventListener('click', () => goHome($('b-cabinet')));
$('b-quick').addEventListener('click', () => { ac(); openTeams('quick'); });   // Quick Match's Play: Pick Your Team
$('b-help').addEventListener('click', () => { renderHintSwitches(); showScreen('s-help'); });   // Replay Tutorial is dim with nothing to replay
$('h-back').addEventListener('click', () => goHome($('b-help')));
$('t-back').addEventListener('click', () => { if (pickMode === 'two') { navOnly = null; renderJoin(); showScreen('s-join'); return; } goHome(); });
$('t-change').addEventListener('click', () => { if (pickMode === 'two') twoSel.picking = 0; else quickPick = null; renderTeams(); $('s-teams').scrollTop = 0; });
$('t-default').addEventListener('click', () => { const t = teamDefault(); if (t) pickTeam(t); });   // My Team, picked for you in Championship; on a Home Nations Tour, the host in turn

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
function pips(v) { let s = ''; for (let i = 1; i <= 5; i++) s += `<i class="${i <= v ? 'on' : ''}"></i>`; return `<span class="pips" aria-label="${v} of 5">${s}</span>`; }
let teamList = [];
/* Player 1 choosing his own side: Quick Match before his pick, 2 Players' Player 1, and Championship (bar a tour, where his side is the
   Home Nations and the list is the hosts). My Team is marked there; in Quick Match and 2 Players it is also first in the list. */
const teamOwnPick = view => (pickMode === 'quick' && !quickPick) || (pickMode === 'two' && twoSel.picking === 0) || (pickMode === 'champ' && !(view && view.comp === 'tour'));
let teamOwn = false;                                       // renderTeams' teamOwnPick, for the cards it draws
function teamCard(t, i) {
  const my = pickMode === 'my';
  const picked = my ? myIs(t) : pickMode === 'quick' && quickPick && keyOf(quickPick) === keyOf(t);
  const stronger = pickMode === 'quick' && quickPick && !picked && outmatched(quickPick, t);
  const mine = !my && teamOwn && myIs(t);
  const stars = teamTraitNames(t);                         // the star traits its 5s bring (src/traits.js)
  const state = my ? ` aria-pressed="${picked}"` : picked ? ' aria-disabled="true"' : '';   // My Team's picks stay pressable; Quick Match's own side can't be its opponent
  const btn = `<button class="team${picked ? ' picked' : ''}" data-i="${i}"${t.legend ? ' data-legend="1"' : ''}${state}>
      ${jersey(t).replace(/<\/span>$/, `<span class="ovr" aria-label="Overall ${overallOf(t)}">${overallOf(t)}</span></span>`)}<span class="tname">${esc(listName(t))}</span>
      ${stronger ? '<span class="gap">Stronger Side</span>' : mine ? '<span class="gap mine">My Team</span>' : ''}
      <span class="stats">${ABILITIES.map(([k, l]) => `<span>${l}</span>${pips(Math.round(abilityOf(t, k)))}`).join('')}</span>
      ${stars.length ? `<span class="tstars" aria-label="Star Traits: ${stars.join(', ')}">${stars.map(n => `<b>${n}</b>`).join(' · ')}</span>` : ''}
    </button>`;
  return t.custom ? `<div class="tcard">${btn}<button class="btn" data-edit="${i}">Edit</button></div>` : btn;
}
/* The lists: International | National | Local, then under it National's leagues or Local's Surrey and My League (none under
   International), and Men | Women | Minis beside the title. Built from TEAM_TIERS, TEAM_LISTS and TEAM_CATS (data.js). */
let natLast = 'eng';                                       // National goes back to the league last looked at
const listOf = k => TEAM_LISTS.find(l => l.key === k);
function teamPool() { const k = poolKey(settings.pool); return k === IMPORT_POOL && !importLeague ? 'sur' : k; }   // My League with no league saved is Surrey
const poolTier = k => (k === IMPORT_POOL ? 2 : (listOf(k) || TEAM_LISTS[0]).tier);
function poolTeams(k) {                                   // International is the category's twelve (natList); a list that does not exist is International
  if (k === IMPORT_POOL) return importTeams();
  const l = listOf(k) || TEAM_LISTS[0];
  return l.key === 'int' ? natList(settings.cat) : l.teams;
}
{
  const btn = (attr, label, more) => `<button ${attr}${more || ''}>${esc(label)}</button>`;
  $('t-tier').innerHTML = TEAM_TIERS.map((n, i) => btn(`data-tier="${i}"`, n)).join('');
  $('t-nat').innerHTML = TEAM_LISTS.filter(l => l.tier === 1).map(l => btn(`data-pool="${l.key}"`, l.name)).join('');
  $('t-loc').innerHTML = TEAM_LISTS.filter(l => l.tier === 2).map(l => btn(`data-pool="${l.key}"`, l.name)).join('') + btn('data-pool="my" id="t-league"', 'My League', ' hidden');
  $('t-cat').innerHTML = TEAM_CATS.map(c => btn(`data-cat="${c.id}"`, c.name)).join('');
  for (const b of $('t-tier').querySelectorAll('[data-tier]')) b.addEventListener('click', () => tierPick(+b.dataset.tier));
  for (const id of ['t-nat', 't-loc']) for (const b of $(id).querySelectorAll('[data-pool]')) b.addEventListener('click', () => poolPick(b.dataset.pool));
  for (const b of $('t-cat').querySelectorAll('[data-cat]')) b.addEventListener('click', () => catPick(b.dataset.cat));
}
function poolPick(k) {
  k = poolKey(k);
  if (k === IMPORT_POOL && !importLeague) return;
  settings.pool = k; if (poolTier(k) === 1) natLast = k;
  save(); renderTeams(); $('s-teams').scrollTop = 0;
}
function tierPick(i) { if (poolTier(teamPool()) !== i) poolPick(i === 0 ? 'int' : i === 1 ? natLast : 'sur'); }
function catPick(id) {
  if (!TEAM_CATS.some(c => c.id === id)) return;
  settings.cat = id;
  // a nation already picked follows the category to its own side there; one its list does not have (Canada or the USA on Men) is unpicked
  const follow = t => (isNation(t) ? natList(id).find(n => n.id === t.id) || null : t);
  if (quickPick) quickPick = follow(quickPick);
  if (twoSel.teams[0]) { const t = follow(twoSel.teams[0]); twoSel.teams[0] = t || DEFAULT_TEAM; if (!t) twoSel.picking = 0; }
  save(); renderTeams();
}
/* The team screen, for m: 'quick' (Quick Match: Player 1's side, then the opponent; nothing picked for him), 'two' (2 Players: Player 1,
   then Player 2), 'champ' (a competition chosen on the home: comp is 'int' for the nation's championship, 'world', 'tour', or a league's
   list key; My Team is picked for you on its primary) or 'my' (My Team: the club on National or Local, the country on International).
   Each opens on My Team's list (a team you made: Local · Surrey, as ever). */
function openTeams(m, comp) {
  pickMode = m; quickPick = null;
  if (m === 'champ') {
    const k = comp || myPool() || 'sur', cupId = k === 'world' || k === 'tour' ? k : 'league';
    if (typeof cupCompSet === 'function') cupCompSet(cupId);   // the World Cup or the Home Nations Tour have their own sides (src/ui-cups.js)
    settings.pool = cupId !== 'league' ? 'int' : poolKey(k) === k ? k : 'sur';
  } else settings.pool = myPool() || 'sur';
  if (m === 'two') twoSel.picking = 0;                     // Player 1 picks first (Change Teams after a match comes back here too)
  renderTeams(); showScreen('s-teams'); $('s-teams').scrollTop = 0;
}
/* Championship's World Cup or Home Nations Tour, chosen on the home: its title, its list, its side and its primary (src/ui-cups.js);
   null for a league or the nation's championship, and for every other mode. */
const teamsView = () => (pickMode === 'champ' && typeof cupTeamsView === 'function' ? cupTeamsView() : null);
const champListName = pool => (pool === 'int' ? 'International' : pool === IMPORT_POOL ? 'My League' : (listOf(pool) || TEAM_LISTS[0]).name);
/* The side picked for you, on the primary: Championship's My Team (the club, if the league has it or it is one you made; the country on
   International and in the World Cup), or a tour's host in turn. null where nothing is picked for you: Quick Match, 2 Players, My Team. */
function teamDefault() {
  if (pickMode !== 'champ') return null;
  const view = teamsView();
  if (view) return view.pick || null;
  const pool = teamPool();
  if (pool === 'int') return myNatTeam(settings.cat);
  const c = myClubTeam();
  return c.custom || poolTeams(pool).includes(c) ? c : null;
}
function renderTeams() {
  const quick = pickMode === 'quick', pair = pickMode === 'two', my = pickMode === 'my', inChamp = pickMode === 'champ', p = twoSel.picking, mine = pair ? twoSel.teams[0] : quickPick, view = teamsView();   // two player: Player 1 picks first; while Player 2 picks, Player 1's team sits in the bar with Change Team (his own big action presses it); the title and eyebrow are the picker's, in his colour
  const pool = teamPool(), tier = poolTier(pool), cat = settings.cat, press = (id, sel, on) => { for (const b of $(id).querySelectorAll(sel)) b.setAttribute('aria-pressed', String(on(b))); };
  const eb = $('t-eyebrow');
  eb.textContent = quick ? 'Quick Match' : pair ? '2 Players' : my ? 'My Team' : view ? view.name : 'Championship · ' + champListName(pool);
  eb.classList.toggle('p1', pair && p === 0); eb.classList.toggle('p2', pair && p === 1);
  $('t-title').textContent = view ? view.title : pair ? 'Player ' + (p + 1) + ' Team' : my ? (tier === 0 ? 'Pick Your Country' : 'Pick Your Club') : quick && quickPick ? 'Pick Opponent' : 'Pick Your Team';
  press('t-tier', '[data-tier]', b => +b.dataset.tier === tier);
  $('t-tier').hidden = inChamp;                            // Championship's competition is chosen on the home: its sides only
  $('t-nat').hidden = inChamp || tier !== 1; $('t-loc').hidden = inChamp || tier !== 2; $('t-league').hidden = !importLeague;
  for (const id of ['t-nat', 't-loc']) press(id, '[data-pool]', b => b.dataset.pool === pool);
  press('t-cat', '[data-cat]', b => b.dataset.cat === cat);
  const yours = (quick && !!quickPick) || (pair && p === 1) || !!(view && view.yours) || my;
  $('t-yours').hidden = !yours; $('t-change').hidden = !!view || my;
  if (view && view.yours) $('t-mine').innerHTML = `${jersey(view.yours)}<span>${esc(view.yours.name)}</span>`;   // the Home Nations, on tour
  else if (my) { const n = myNatTeam(null); $('t-mine').innerHTML = [myClubTeam(), n].map(t => `<span class="my-pair">${jersey(t)}<span>${esc(listName(t))}</span></span>`).join(''); }   // My Team: the club and the country
  else if (yours) $('t-mine').innerHTML = `${jersey(mine)}<span>${pair ? 'Player 1 · ' : ''}${esc((catTeam(mine, cat) || mine).name)}</span>`;
  const def = teamDefault();
  $('t-default').hidden = !def;
  $('t-default').textContent = view && view.pick ? view.primary : def ? 'Play as ' + (catTeam(def, cat) || def).name : '';   // the side it starts: Farnham Women on Women
  $('t-back').textContent = pair ? 'Back to Players' : 'Back to Menu';
  navOnly = pair ? p : null;
  const nations = my && tier === 0;                        // My Team's country: the category's twelve, no Legends and no club
  teamList = view ? view.list : nations ? natList(cat).slice() : [...poolTeams(pool), ...custom];   // My League: src/import.js
  if (!view && !my && poolTeams(pool) === natList(cat) && typeof lockerLegends === 'function') teamList.splice(natList(cat).length, 0, ...lockerLegends(cat));   // International: the Legends unlocked so far, after the nations, for the category in play (src/locker.js); never in a cup's list
  if (inChamp) teamList = storeFirst(teamList);            // the Super Fan's club first (src/store.js); a cup's nations and hosts are never a partner club
  else if ((quick || pair) && teamOwnPick(view)) {          // Player 1's list: My Team first (the country on International, the club elsewhere), marked, never picked
    const i = teamList.findIndex(o => myIs(o) && isNation(o) === (tier === 0));
    if (i > 0) teamList = [teamList[i], ...teamList.slice(0, i), ...teamList.slice(i + 1)];
  }
  teamOwn = teamOwnPick(view);
  let html = teamList.map(teamCard).join('');
  if (!view && !nations && custom.length < MAX_CUSTOM) html += `<button class="team create" id="t-create"><span class="plus" aria-hidden="true">+</span><span class="tname">Create Team</span></button>`;
  if (!view && !nations) html += importCard();             // Add Your Team, src/import.js
  $('t-grid').innerHTML = html;
  for (const b of $('t-grid').querySelectorAll('.team[data-i]')) b.addEventListener('click', () => pickTeam(teamList[+b.dataset.i]));
  for (const b of $('t-grid').querySelectorAll('[data-edit]')) b.addEventListener('click', () => openBuilder(teamList[+b.dataset.edit]));
  const cr = $('t-create'); if (cr) cr.addEventListener('click', () => openBuilder(null));
  importBind();
  storeTeamsRender();                                      // locks on Create Team, Edit, Add Your Team and the Legends (src/ui-store.js)
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
/* A championship is your team and five others from the list on screen. A nation's are the rest of its six in the category's twelve,
   as Career's International stage draws them (natGroup): the Six Nations, so the Triple Crown is still there to win, or the other
   six (Men: New Zealand, South Africa, Australia, Argentina, Fiji and Japan; Women: New Zealand, Canada, the USA, Australia, South
   Africa and Fiji). A team you made, on International, gets five of the twelve. Men | Women | Minis names every side of it, or both
   of a match, and a nation is the category's own side (catTeam). */
const champFrom = (pool, t, cat) => (isNation(t) ? natGroup(t.id, cat) : poolTeams(pool));
function pickTeam(t) {
  if (!t) return;
  if (t.legend && !storeGate('legends', () => pickTeam(t))) return;   // a Legends side is played with the Full Game (src/store.js); unlocked on any tier
  if (pickMode === 'my') { myPick(t); return; }
  if (pickMode === 'two') {                                  // Player 1 changing his team comes back to Player 2's pick; Player 2's pick starts the match
    if (twoSel.picking === 0) { twoSel.teams[0] = t; twoSel.picking = 1; renderTeams(); $('s-teams').scrollTop = 0; return; }
    twoSel.teams[1] = t; startTwo(); return;
  }
  if (pickMode === 'champ') {
    const view = teamsView();
    if (view) { view.start(t); return; }                   // a World Cup as that nation, or a tour to that host (src/ui-cups.js)
    const pool = teamPool(), cat = settings.cat, me = catTeam(t, cat);
    if (!me) return;
    const others = pool === IMPORT_POOL ? importOthers(t) : shuffle(champFrom(pool, t, cat).filter(o => keyOf(o) !== keyOf(t)));
    newChamp(me, others.slice(0, 5).map(o => catTeam(o, cat))); renderHub(); showScreen('s-hub'); return;
  }
  if (quickPick == null) { quickPick = t; renderTeams(); $('s-teams').scrollTop = 0; return; }   // Player 1's side, picked by him: now the opponent
  if (keyOf(quickPick) === keyOf(t)) return;   // the picked card can still be reached from the keyboard
  const us = catTeam(quickPick, settings.cat), them = catTeam(t, settings.cat);
  if (us && them) startMatch(us, them, false);
}

/* My Team picked on the team screen: a nation is the country, anything else the club. The screen stays, with the pick marked, and the
   focus (or a controller's ring) stays on the card. */
function myPick(t) {
  if (isNation(t)) settings.myNat = t.id; else settings.myClub = keyOf(t);
  save();
  const i = teamList.indexOf(t), had = focusEl && focusEl.dataset && focusEl.dataset.i != null, typed = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.i != null;
  renderTeams();
  const again = $('t-grid').querySelector && $('t-grid').querySelector(`.team[data-i="${i}"]`);
  if (again && had) setFocus(again);
  if (again && typed && again.focus) again.focus();
}

/* create team */
let draft = null, editing = null, codeTouched = false, delArmed = false;
let levelChoosing = false, levelNote = '';                 // a new team starts on the level list; the note says what a lower level took off
const spent = d => ABILITIES.reduce((a, [k]) => a + d[k] - 1, 0);
/* A level's stars, drawn: five star shapes, the lit ones over the dim, so a half star is half lit and half dim at any size. Inline, like the home's icons, so there is nothing to load. n is a whole or half star count
   (starsOfOverall, src/ratings.js). The picture carries its words for a screen reader, or quiet leaves them out where the same words are already beside it. On the levels for now; beside every team's
   overall badge is the teams builder's (README, integration list). */
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
      if (quickPick && keyOf(quickPick) === editing.key) quickPick = custom[i];
      if (twoSel.teams[0] && keyOf(twoSel.teams[0]) === editing.key) twoSel.teams[0] = custom[i];
    } else {
      custom.push(cleanTeam({ ...t, key:'my' + Date.now().toString(36) }, custom.length));
      if (pickMode === 'quick' && !quickPick) quickPick = custom[custom.length - 1];   // made while picking his side: he plays as it
      else if (pickMode === 'two' && twoSel.picking === 0) { twoSel.teams[0] = custom[custom.length - 1]; twoSel.picking = 1; }   // Player 1 made it to play as it
      else if (pickMode === 'my') settings.myClub = custom[custom.length - 1].key;   // made on My Team: it is the club
    }
    save(); renderTeams(); showScreen('s-teams');
  });
  $('bd-back').addEventListener('click', () => { renderTeams(); showScreen('s-teams'); });
  $('bd-del').addEventListener('click', () => {
    if (!delArmed) { delArmed = true; confirmArm(); $('bd-del').textContent = 'Confirm Delete'; return; }
    if (confirmSoon()) return;
    custom = custom.filter(c => c.key !== editing.key);
    if (quickPick && keyOf(quickPick) === editing.key) quickPick = null;
    if (twoSel.teams[0] && keyOf(twoSel.teams[0]) === editing.key) twoSel.teams[0] = DEFAULT_TEAM;
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

