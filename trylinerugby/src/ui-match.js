/* =========================================================
   UI
   ========================================================= */
let mode = 'menu';           // 'menu' | 'match'
let pickMode = 'champ', quickPick = null, quickAuto = false;   // quickAuto: Farnham is still the untouched default
let bannerTimer = 0, coachLast = null, coachUntil = 0;   // coachUntil: wall-clock ms until another coach line may speak (one at a time)
const playing = () => mode === 'match' && M && !M.demo;

function showScreen(id) {
  if (typeof offlineScreen === 'function') offlineScreen(id);
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id;
  setFocus(null);
  if (id === 's-teams') { fitNames(); poolTabShow(); }
  if (id !== 's-home') { const a = document.activeElement; if (a && typeof a.blur === 'function') a.blur(); }   // a focused menu button must not fire on Enter once it is hidden
}
function clearBanner() { clearTimeout(bannerTimer); const el = document.getElementById('banner'); if (el) el.innerHTML = ''; }
function say(text, size, team, grade, low) {
  if (!M || M.demo || M.headless) return;
  const el = $('banner');
  const k = team != null ? showCol(team) : 'var(--flood)';
  el.innerHTML = '';
  el.classList.toggle('cut', !!M.cut);
  el.classList.toggle('lo', !!low);                       // a goal verdict sits under the crossbar while the ball is up at the posts
  const m = document.createElement('div');
  m.className = 'msg' + (size ? ' ' + size : '');
  m.style.setProperty('--k', k);
  if (grade) { const g = document.createElement('span'); g.className = 'grade'; g.textContent = grade; m.appendChild(g); }
  m.appendChild(document.createTextNode(text));
  el.appendChild(m);
  clearTimeout(bannerTimer);
  const ms = size === 'big' ? 1700 : size === 'coach' ? 1600 : size === 'small' ? 900 : 1300;
  bannerTimer = setTimeout(() => { el.innerHTML = ''; }, size === 'coach' ? ms : ms/matchPace());   // a banner lasts as long against the play as it always did. A coach line is for reading, and stays in real time with coachUntil
}

function startDemo() {
  soundQuiet();                                            // every way out of a match or a drill comes through here
  const all = ALL_TEAMS, a = Math.floor(rnd()*all.length); let b = Math.floor(rnd()*(all.length-1)); if (b >= a) b++;
  newMatch(all[a], all[b], { halfLen:1e9, diff:1, auto:true, demo:true });
  mode = 'menu';
  $('hud').hidden = true; $('controls').hidden = true; $('b-pause').hidden = true;
  for (const m of document.querySelectorAll('.modal')) m.hidden = true;
}
function lockLandscape() {
  if (!window.matchMedia('(pointer: coarse)').matches) return;
  try {
    const el = document.documentElement;
    const fs = el.requestFullscreen ? el.requestFullscreen({ navigationUI:'hide' }) : null;
    const lock = () => { try { const p = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if (p && p.catch) p.catch(() => {}); } catch (e) { /* unsupported */ } };
    if (fs && fs.then) fs.then(lock, () => {}); else lock();
  } catch (e) { /* unsupported */ }
}
function startMatch(u, c, isChamp, o) {
  if (!sidesMeet(teamOf(u), teamOf(c))) return false;        // the team screen never offers this; men's never plays women's
  lockLandscape();
  ac();
  for (const P of PADS.values()) P.used = false;             // a pad unplugged mid-match pauses only if it was used in that match
  const pair = !!(o && o.two);                               // two player: both sides human, each at the level they picked; the seats model routes the keyboard halves and the pads
  setTwo(pair);
  const ease = !pair && settings.diff === 1 && settings.played < EARLY.games;   // counted as the match starts, so quitting does not play the kinder game again
  if (!pair) { settings.played = Math.min(99, settings.played + 1); save(); }
  newMatch(u, c, { halfLen:HALF_SECONDS[settings.half], diff:settings.diff, champ:isChamp, duels:'live', early:ease, arcade:true, kids:!pair && kidsLevel(),   // the switch is gone: a match you play always has duels; Kids is one player's
    humans:pair ? [true, true] : null, levels:pair ? (o.levels || [settings.diff, settings.diff]) : null });
  mode = 'match';
  showScreen(null);
  $('hud').hidden = false; $('controls').hidden = pair; $('b-pause').hidden = false;   // two player: the stick and the three buttons are seat 0's touch controls, and nobody is touching; each player's marks are drawn on the pitch
  $('h-t0').hidden = $('h-t1').hidden = !pair;             // the seat tags either side of the scorebug
  $('h-n0').textContent = M.nat[0].id; $('h-n1').textContent = M.nat[1].id;
  $('h-k0').style.setProperty('--k', showCol(0)); $('h-k1').style.setProperty('--k', showCol(1));
  lastHud = ''; restStick();
  lastStat = null; lastCap = false; $('h-stat').hidden = $('h-cap').hidden = true;
  return true;
}
function exitMatch() {
  if (practice) { practiceLeave(); return; }
  const wasChamp = M && M.champ, wasCareer = M && M.career;
  setTwo(false);                                           // the menus are one player's again; the join screen switches the seats back on
  series = { w:[0, 0], d:0 }; navOnly = null;              // a two-player series ends with the visit to the menu
  startDemo();
  if (wasCareer && career) careerOpen();
  else if (wasChamp && champ) { renderHub(); showScreen('s-hub'); } else goHome();
}

let lastHud = '', lastBtn = '', lastStat = null, lastCap = false;
/* What to do now, as a word and a shape under the clock, for your first matches. A matter of the moment, so nothing about it is stored but the count. */
const STATUS_MATCHES = 5;                                   // finished matches it stays for; always at the Kids level
const STATUS_INK = '#08110b';
const BALL_STATUS = {
  ours:{ word:'Your Ball', icon:`<svg viewBox="0 0 22 14" aria-hidden="true"><ellipse cx="11" cy="7" rx="10" ry="6.5" fill="currentColor"/><path d="M6 7h10M8.5 5v4M11 5v4M13.5 5v4" stroke="${STATUS_INK}" stroke-width="1.3" fill="none"/></svg>` },
  stop:{ word:'Stop Them', icon:`<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M5.5 1h7L17 5.5v7L12.5 17h-7L1 12.5v-7z" fill="currentColor"/><rect x="4" y="7.4" width="10" height="3.2" fill="${STATUS_INK}"/></svg>` },
  loose:{ word:'Get the Ball', icon:`<svg viewBox="0 0 26 18" aria-hidden="true"><ellipse cx="13" cy="10" rx="7" ry="4.6" fill="currentColor"/><path d="M1.5 10h3.2M21.3 10h3.2M4.5 2.8l2.4 2.4M21.5 2.8l-2.4 2.4M13 .8v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>` },
};
function statusWanted() {                                   // whose match it shows in: one player's, for a while. The Match Help switch turns it off, except at the Kids level, where it stays
  return !!(M && playing() && !M.two && !M.auto && !practice && (M.kids || (settings.hints && settings.finished < STATUS_MATCHES)));
}
function statusOf() {                                       // which of BALL_STATUS, or null. Pure: it reads the match, and the tools read it too
  if (!statusWanted() || M.cut || M.tut || M.paused || M.over) return null;
  const t = teamOfSeat(0), b = M.ball;
  if (t < 0) return null;
  if (M.phase === 'set') return M.set && M.set.kind === 'ruck' ? (M.set.team === t ? 'ours' : 'stop') : null;   // a ruck has a side: every other stop in play has its own banner
  if (M.phase !== 'play') return null;
  if (b.state === 'held') return b.carrier.team === t ? 'ours' : 'stop';
  if (b.state === 'air') return b.f && b.f.kind === 'pass' ? (b.f.team === t ? 'ours' : 'stop') : 'loose';   // a pass still belongs to a side; a kick is anyone's till it is caught
  return b.state === 'loose' ? 'loose' : null;
}
function statusSync() {
  const key = statusOf();
  if (key !== lastStat) {
    lastStat = key;
    const el = $('h-stat');
    el.hidden = !key;
    if (key) { el.className = 'bstat ' + key; $('h-stat-i').innerHTML = BALL_STATUS[key].icon; $('h-stat-w').textContent = BALL_STATUS[key].word; }
  }
  const cap = careerCaption();
  if (cap !== lastCap) { lastCap = cap; $('h-cap').hidden = !cap; }
}
function cutLabels(c) {
  if (c.kind === 'scrum') return ['Push', null];
  if (c.kind === 'lineout') return ['Jump', null];
  return duelLabels(c);
}

function fmtClock() {
  const mins = M.golden ? 80 + Math.min(M.clock/periodLen(), 1)*10 : (M.half-1)*40 + Math.min(M.clock/M.halfLen, 1)*40;   // extra time runs 80 to 90
  const mm = Math.floor(mins), ss = Math.floor((mins-mm)*60);
  return String(mm).padStart(2,'0') + ':' + String(ss).padStart(2,'0');
}
function updateHud() {
  if (!playing()) return;
  const sub = M.golden ? '<span class="lp">Golden Try</span>' : M.hooter ? '<span class="lp">Last Play</span>' : (M.phaseCount > 0 ? 'Phase ' + M.phaseCount : (M.half === 1 ? '1st Half' : '2nd Half'));
  const fire = M.arcade ? M.fire.map(F => F.t > 0 ? 'on' : String(F.heat)).join('|') : '';
  const key = M.score[0] + '|' + M.score[1] + '|' + fmtClock() + sub + fire;
  if (key !== lastHud) {
    lastHud = key;
    $('h-s0').textContent = M.score[0]; $('h-s1').textContent = M.score[1];
    $('h-sub').innerHTML = fmtClock() + ' · ' + sub;
    for (const t of [0, 1]) { const el = $('h-f' + t), F = M.fire[t]; el.hidden = !M.arcade; el.className = 'heat' + (F.t > 0 ? ' on' : ''); el.style.setProperty('--n', F.t > 0 ? ARCADE.fire.need : F.heat); }   // the run towards On Fire, under each side's code
  }
  const cut = M.phase === 'cut' && M.cut;
  const goal = cut && M.cut.kind === 'goal';
  const ctrl = M.ctrl, ht = ctrl ? ctrl.team : 0, k = M.contact, held = !!(k && ctrl && k.c === ctrl), play = M.phase === 'play';   // seat 0's side: the on-screen buttons are its. held: your carrier is in a tackle
  const ours = ourBall(ht), S0 = sideOf(ht), P0 = S0.pass;
  const b = M.ball;
  let passCharge = 0, passLong = false;
  if (P0 && P0.mode === 'hold' && play && ctrl && b.state === 'held' && b.carrier === ctrl && !ctrl.bind) {
    passCharge = Math.min(1, P0.t / LONG.auto);
    passLong = P0.t >= LONG.arm && !!passAim(ctrl, inputOf(ht).world().y).far;
  }
  let la, lb, cueA, cueB, aAct, bAct;
  const gs = goal ? M.cut.g.stage : '';
  const D = practice && practice.space ? drillLabels() : null;   // a training space sets its own buttons
  if (D) { la = D.a; lb = D.b; cueA = !!D.cueA; cueB = false; aAct = !!D.aOn; bAct = !!D.bOn; }
  else if (goal) { [la, lb, cueA, cueB] = goalLabels(M.cut); aAct = bAct = !M.cut.after && !M.cut.g.out && (M.cut.g.watch || gs === 'aim' || gs === 'power' || gs === 'hold' || gs === 'wait'); }
  else if (cut) { [la, lb] = cutLabels(M.cut); cueA = !!(!M.cut.after && la); cueB = !!(!M.cut.after && lb); aAct = bAct = !M.cut.after; }
  else if (ours) { const carrying = b.state === 'held' && b.carrier === ctrl; la = held && canOffload(k) ? 'Offload' : passLong ? 'Long' : 'Pass'; lb = ctrl ? kickLabel(M.ctrl.team) : 'Kick'; cueA = la === 'Offload'; cueB = false; aAct = play && carrying && (!held || cueA); bAct = play && carrying && !held; }   // own pass in flight: neither action can act; held in a tackle, only an available Offload lights Pass
  else { const tagging = practice && practice.tagOnly; la = tagging ? 'Pull Tag' : 'Tackle'; lb = 'Switch'; cueA = false; cueB = switchUseful(ht); aAct = play && (tagging ? drillCanPull(ctrl) : canDive(ctrl)); bAct = play; }   // Tackle lights up only when a press would dive now. Switch pulses when the man in the ring can still meet the ball and yours is behind it
  const S = M.spr[ht], sprOn = D ? !!D.cOn : !cut && sprintOn(ht), sprCue = sprOn && S.cue > 0;   // Sprint: dim exactly when a press would do nothing (the same test the press makes)
  const duel = cut && M.cut.duel;
  const bk = la + '|' + lb + aAct + bAct + cueA + cueB + (duel ? M.cut.kind + (M.cut.after ? 1 : 0) : '') + gs + '|' + (cut ? 'h' : sprOn ? 'r' : 'i') + sprCue + (passLong ? 'L' : '') + (D ? (D.c ? 'C' : 'c') : '');
  if (bk !== lastBtn) {
    lastBtn = bk;
    $('la').textContent = la || '';
    $('lb').textContent = lb || '';
    $('btnA').hidden = !la;
    $('btnB').hidden = !lb;
    $('btnC').hidden = !!cut || !!(D && !D.c);                                // Sprint is hidden in every close-up and stays in place otherwise, so nothing on screen moves
    $('btnA').classList.toggle('cue', cueA);
    $('btnB').classList.toggle('cue', cueB);
    $('btnC').classList.toggle('cue', sprCue);
    $('btnB').classList.toggle('two', lb === 'Drop Goal');   // two lines inside the small button
    $('plates').hidden = !(duel && M.cut.kind === 'past' && !M.cut.after);
    $('btnA').classList.toggle('idle', !aAct); $('btnB').classList.toggle('idle', !bAct);
    $('btnC').classList.toggle('idle', !sprOn); $('btnC').classList.toggle('ready', sprOn);
    $('hud').classList.toggle('gk', !!goal);   // the clock line hides under a goal close-up
  }
  $('btnB').style.setProperty('--c', S0.charging ? S0.charge.toFixed(3) : goal && gs === 'hold' ? M.cut.g.m.toFixed(3) : 0);   // the ring shows the charge, or a drop's meter
  $('btnC').style.setProperty('--s', S.m.toFixed(3));        // the Sprint ring is the meter
  $('btnA').classList.toggle('hold', passCharge > 0);
  $('btnA').style.setProperty('--p', passCharge.toFixed(3)); // the Pass ring fills while a long pass charges
  syncHints(la, lb);
  coachTick();
  statusSync();
}

