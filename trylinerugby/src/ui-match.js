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
  if (id === 's-teams') fitNames();
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
  bannerTimer = setTimeout(() => { el.innerHTML = ''; }, size === 'big' ? 1700 : size === 'coach' ? 1600 : size === 'small' ? 900 : 1300);
}

function startDemo() {
  const all = ALL_TEAMS, a = Math.floor(rnd()*all.length); let b = Math.floor(rnd()*(all.length-1)); if (b >= a) b++;
  newMatch(all[a], all[b], { halfLen:1e9, diff:1, auto:true, demo:true });
  mode = 'menu';
  $('hud').hidden = true; $('controls').hidden = true; $('b-pause').hidden = true;
  for (const m of document.querySelectorAll('.modal')) m.hidden = true;
}
function lockLandscape() {
  if (typeof nativeOn === 'function' && nativeOn()) return;   // the Try Line app is landscape with no bars from the start (native.js); its web views have no fullscreen to ask for
  if (!window.matchMedia('(pointer: coarse)').matches) return;
  try {
    const el = document.documentElement;
    const fs = el.requestFullscreen ? el.requestFullscreen({ navigationUI:'hide' }) : null;
    const lock = () => { try { const p = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if (p && p.catch) p.catch(() => {}); } catch (e) { /* unsupported */ } };
    if (fs && fs.then) fs.then(lock, () => {}); else lock();
  } catch (e) { /* unsupported */ }
}
function startMatch(u, c, isChamp, o) {
  lockLandscape();
  ac();
  for (const P of PADS.values()) P.used = false;             // a pad unplugged mid-match pauses only if it was used in that match
  const pair = !!(o && o.two);                               // two player: both sides human, each at the level they picked; the seats model routes the keyboard halves and the pads
  setTwo(pair);
  const ease = !pair && settings.diff === 1 && settings.played < EARLY.games;   // counted as the match starts, so quitting does not play the kinder game again
  if (!pair) { settings.played = Math.min(99, settings.played + 1); save(); }
  newMatch(u, c, { halfLen:HALF_SECONDS[settings.half], diff:settings.diff, champ:isChamp, duels:'live', early:ease, arcade:true, kids:!pair && kidsLevel(), kidsR:settings.kidsR,   // the switch is gone: a match you play always has duels; Kids is one player's, at the child's own rating
    humans:pair ? [true, true] : null, levels:pair ? (o.levels || [settings.diff, settings.diff]) : null });
  mode = 'match';
  showScreen(null);
  $('hud').hidden = false; $('controls').hidden = pair; $('b-pause').hidden = false;   // two player: the stick and the three buttons are seat 0's touch controls, and nobody is touching; each player's marks are drawn on the pitch
  $('h-t0').hidden = $('h-t1').hidden = !pair;             // the seat tags either side of the scorebug
  $('h-n0').textContent = M.nat[0].id; $('h-n1').textContent = M.nat[1].id;
  $('h-k0').style.setProperty('--k', showCol(0)); $('h-k1').style.setProperty('--k', showCol(1));
  lastHud = ''; restStick();
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

let lastHud = '', lastBtn = '';
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
  else if (ours && proCalling(ht)) { la = 'Call for Ball'; lb = null; cueA = cueB = false; aAct = play && proCanCall(); bAct = false; }   // Pro Mode: a teammate has it (career-pro.js)
  else if (ours) { const carrying = b.state === 'held' && b.carrier === ctrl; la = held && canOffload(k) ? 'Offload' : passLong ? 'Long' : 'Pass'; lb = ctrl ? kickLabel(M.ctrl.team) : 'Kick'; cueA = la === 'Offload'; cueB = false; aAct = play && carrying && (!held || cueA); bAct = play && carrying && !held; }   // own pass in flight: neither action can act; held in a tackle, only an available Offload lights Pass
  else { la = 'Tackle'; lb = proPinned(ht) ? null : 'Switch'; cueA = false; cueB = switchUseful(ht); aAct = play && canDive(ctrl); bAct = play; }   // Tackle lights up only when a press would dive now. Switch pulses when the man in the ring can still meet the ball and yours is behind it
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
    $('btnA').classList.toggle('two', la === 'Call for Ball');   // and inside the big one
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
}

