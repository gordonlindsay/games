/* =========================================================
   Hints and the tutorial (2026-10-17: Gordon's "Close-Ups and Key Moves" and "Pause and Step Through")
   The hints card (#hc0 top-left for Player 1 and one player, #hc1 top-right for Player 2) names the close-up and its one control for
   the device in use, through every duel's slow run-in to the verdict, the scrum to its result, the lineout to the catch, a goal kick or
   drop from the cut-in to the strike, and once a match each in open play (Long Pass, Sprint, Side Step, Dummy, Offload, Drop Goal, 3s
   each, 4s apart). hintFor(seat) is pure: it reads the match and returns the words, or null. syncHints runs from updateHud and writes
   the DOM only when the content changes. The open-play triggers read the labels updateHud already computed (cueOf in two player), so
   dropZone is never run again and nothing random is drawn. The tutorial pauses the first time each moment comes up on this device
   (while that seat's Hints are On): the close-up holds its first frame under a card or two, Next then Play, a tap anywhere or the
   pass key advancing, the match clock and the world frozen; Replay Tutorial on How to Play forgets them all.
   ========================================================= */
const hintShown = [null, null], hintKey = ['', ''], HO = [null, null];   // what each card shows now (the tools read it); the last content key; open-play state per seat
const OPEN_HINTS = ['offload', 'drop', 'long', 'sprint', 'step', 'dummy'], OPEN_SECS = 3.0, OPEN_GAP = 4.0;
const CHIP_LABEL = { a:'Pass', b:'Kick', c:'Sprint', x:'Stick', v:'Stick', back:'Stick' };
const teamOfSeat = s => (M ? M.side.findIndex(x => x.human && x.seat === s) : -1);
const hintsOn = s => (s == null ? false : two.on ? settings.twoHints[two.swapped ? 1 - s : s] : settings.hints);   // two player: per player, stored by keyboard half like twoDiff
function setHints(s, on) {
  if (two.on) settings.twoHints[two.swapped ? 1 - s : s] = !!on; else settings.hints = !!on;
  save(); renderHintSwitches(); if (M) syncHints();
}
function hintReset() { for (const s of [0, 1]) { HO[s] = { shown:new Set(), cur:null, until:-9, last:-99 }; } for (const s of [0, 1]) renderHint(s, null); }
function hintCut() { for (const s of [0, 1]) if (HO[s]) HO[s].cur = null; }   // a close-up ends an open-play card
function hintDev(s) { return two.on ? (seatScheme(s) ? 'kb' : 'pad') : lastDev; }   // one player: the last device that acted; two player: the seat's own
const card = (title, rule, rows, kick) => ({ title, rule, rows, kick:!!kick });
const row = (chips, text) => ({ chips, text });
const chip = (act, label) => ({ act, label:label || CHIP_LABEL[act] });
function hintFor(s) {                                      // the card for seat s now, or null
  if (!M || M.demo || M.auto || !hintsOn(s)) return null;
  const t = teamOfSeat(s); if (t < 0) return null;
  const dev = hintDev(s), kb = dev === 'kb', c = M.cut;
  if (c) {
    if (M.phase !== 'cut') return null;
    if (c.duel) {
      if (c.out != null) return null;
      const own = seatOfTeam(c.own) === s, k = c.kind;
      if (own) return k === 'past' ? card('Get Past', 'To His Open Side', [row([chip('x')], kb ? 'Step on Gold' : 'Flick on Gold')])
        : k === 'pass' ? card('Key Pass', 'Dummy If He Drifts', [row([chip('a', 'Pass'), chip('b', 'Dummy')], 'On Gold')])
        : k === 'tackle' ? card('Tackle', 'He May Step', [row([chip('a', 'Tackle')], 'On Gold')])
        : card('Block', 'He May Dummy', [row([chip('a', 'Block')], 'On Gold')]);
      if (!M.two || c.locked) return null;                   // the chooser's card goes at his lock, as his bottom-bar cue does
      return k === 'past' ? card('Get Past', 'Before Gold', [row([chip('x')], 'Guard a Shoulder')])
        : k === 'pass' ? card('Key Pass', 'Before Gold', [row([chip('x')], 'Drift or Rush')])
        : k === 'tackle' ? card('Tackle', 'Before Gold', [row([chip('x')], 'Step Left or Right')])
        : card('Block', 'Before the Pass', [row([chip('b', 'Dummy')], 'Tap It')]);
    }
    if (c.kind === 'scrum') return c.result ? null : card('Scrum', c.feed === t ? 'Your Ball' : 'Steal Their Ball', [row([chip('a', 'Push')], 'Hit on Set'), row([chip('a', 'Push')], 'Then Tap Fast')]);
    if (c.kind === 'lineout') return c.outcome != null ? null : card('Lineout', c.team === t ? 'Your Throw' : 'Steal Their Throw', [row([chip('a', 'Jump')], 'Ball Halfway')]);
    if (c.kind === 'goal') {
      const g = c.g;
      if (g.watch || g.team !== t || c.t < CUT_IN || c.after || g.out) return null;
      if (g.type === 'drop') return g.stage === 'wait' || g.stage === 'hold' ? card(null, 'Before They Reach You', [...(M.kids ? [] : [row([chip('x')], 'Steer')]), row([chip('b', 'Kick')], 'Let Go in the Gold')], true) : null;
      return g.stage === 'aim' || g.stage === 'power' ? card(null, 'Let Go in the Gold', [...(M.kids ? [] : [row([chip('x')], 'Steer the Arrow')]), row([chip('a', 'Kick')], 'Hold It')], true) : null;   // Kids sets the aim, so there is nothing to steer
    }
    return null;
  }
  const o = HO[s] && HO[s].cur;
  if (!o) return null;
  return o === 'long' ? card('Long Pass', 'Skips a Man', [row([chip('a', 'Pass')], 'Hold It')])
    : o === 'sprint' ? card('Sprint', '', [row([chip('c', 'Sprint')], 'Hold It')])
    : o === 'step' ? card('Side Step', 'Near a Tackler', [row([chip('v')], kb ? 'Tap Across' : 'Flick Across')])
    : o === 'dummy' ? card('Dummy', 'Fakes the Pass', [row([chip('back')], kb ? 'Tap Back' : 'Pull Back, Push On')])
    : o === 'offload' ? card('Offload', 'As You’re Tackled', [row([chip('a', 'Offload')], 'Tap It')])
    : card('Drop Goal', 'In Range', [row([chip('b', 'Drop Goal')], 'Hold It')]);
}
function hintOpenPick(s, t, la, lb) {                       // which open-play card, if any, is due for seat s now: the first unseen trigger that holds
  const H = HO[s], c = ctrlOf(t), b = M.ball;
  if (!c) return null;
  const carry = b.state === 'held' && b.carrier === c && !c.bind, d = dirOf(t);
  const cands = [];
  if (la === 'Offload') cands.push('offload');
  if (lb === 'Drop Goal') cands.push('drop');
  if (carry && c.hold >= 0.8 && pressure(c) >= 5 && passAim(c, inputOf(t).world().y).far) cands.push('long');
  if (sprintOn(t) && ((carry && gapAhead(c) >= 8) || (b.state === 'held' && b.carrier.team !== t && dist(c, b.carrier) <= 12 && cleanThrough(b.carrier, t)))) cands.push('sprint');
  if (carry) {
    let front = 99, ai = 99;
    for (const q of M.players) { if (q.team === t || !onFeet(q) || (q.x - c.x)*d <= 0.5) continue; const dd = dist(q, c); if (Math.abs(q.y - c.y) < 3) front = Math.min(front, dd); if (!ringed(q)) ai = Math.min(ai, dd); }
    if (front >= 3.5 && front <= 6) cands.push('step');
    if (ai >= 3 && ai <= 7 && shownPass(c).to) cands.push('dummy');
  }
  for (const id of OPEN_HINTS) if (cands.includes(id) && !H.shown.has(id)) return id;
  return null;
}
function hintOpenStep(s, t, la, lb) {
  const H = HO[s]; if (!H) return;
  if (!(M.phase === 'play' && !M.cut && !M.tut && hintsOn(s))) { H.cur = null; return; }
  if (H.cur) { if (M.dclock < H.until) return; H.cur = null; }
  if (M.dclock < H.last + OPEN_GAP) return;
  const id = hintOpenPick(s, t, la, lb);
  if (!id) return;
  H.cur = id; H.shown.add(id); H.last = M.dclock; H.until = M.dclock + OPEN_SECS;
}
function syncHints(la, lb) {                               // la, lb: what seat 0's buttons read this frame (one player); two player reads each side's cue
  if (!M) return;
  for (const s of [0, 1]) {
    const t = teamOfSeat(s);
    if (t < 0) { renderHint(s, null); continue; }
    if (M.two) { const cue = cueOf(t); hintOpenStep(s, t, cue === 'Offload' ? 'Offload' : '', cue === 'Drop Goal' ? 'Drop Goal' : ''); }
    else hintOpenStep(s, t, la, lb);
    renderHint(s, hintFor(s));
  }
}
function keycapsFor(s, act) {                             // the keycaps a chip wears on a keyboard: the seat's own keys
  const sch = seatScheme(s) || 'solo', R = sch === 'right', kc = code => (ARROW_KEY[code] ? `<kbd class="kc ar ${ARROW_KEY[code]}"></kbd>` : `<kbd class="kc">${KEYCAP[code]}</kbd>`);
  if (act === 'a' || act === 'b' || act === 'c') return kc(KB[sch][act][0]);
  if (act === 'x') return R ? kc('ArrowLeft') + kc('ArrowRight') : kc('KeyA') + kc('KeyD');
  const behind = stickTurn(s);                             // a behind view: across the run is across the screen, and back is the down key
  if (act === 'v') return behind ? (R ? kc('ArrowLeft') + kc('ArrowRight') : kc('KeyA') + kc('KeyD')) : R ? kc('ArrowUp') + kc('ArrowDown') : kc('KeyW') + kc('KeyS');
  if (behind) return kc(R ? 'ArrowDown' : 'KeyS');
  const d = dirOf(Math.max(0, teamOfSeat(s)));             // back: the key toward his own line
  return kc(R ? (d > 0 ? 'ArrowLeft' : 'ArrowRight') : (d > 0 ? 'KeyA' : 'KeyD'));
}
const PAD_GLYPH = { a:'<i class="pad dia"><b></b><b></b><b class="on"></b><b></b></i>', b:'<i class="pad dia"><b></b><b class="on"></b><b></b><b></b></i>', c:'<i class="pad sh"></i>' };
function chipHtml(s, ch) {
  const dev = hintDev(s), cls = ch.act === 'a' || ch.act === 'b' || ch.act === 'c' ? ch.act : 'x';
  const badge = dev === 'kb' ? keycapsFor(s, ch.act) : dev === 'pad' ? (PAD_GLYPH[ch.act] || '<i class="pad stick"></i>') : '';
  const wide = (badge.match(/<kbd/g) || []).length > 1 ? ' wide' : /pad sh/.test(badge) ? ' mid' : '';   // a two-keycap badge (A D, the arrow pair) or the shoulder glyph hangs over the chip's right end: the chip pads out so the badge never sits on its own label
  return `<span class="chip ${cls}${wide}">${esc(ch.label)}${badge ? '<span class="badges">' + badge + '</span>' : ''}</span>`;
}
function renderHint(s, h) {
  hintShown[s] = h;
  const el = $('hc' + s); if (!el) return;
  const key = h ? JSON.stringify([h.title, h.rule, h.rows, h.kick, hintDev(s), seatScheme(s), teamOfSeat(s), stickTurn(s)]) : '';
  const c = M && M.cut, dim = !!(h && h.kick && c && c.kind === 'goal' && c.g.hcOver);
  el.classList.toggle('dim', dim); el.classList.toggle('two', !!(M && M.two));   // two player: the narrower limit, clear of the seat tags
  if (key === hintKey[s]) return;
  hintKey[s] = key;
  el.hidden = !h;
  if (!h) return;
  const dev = hintDev(s);
  el.classList.toggle('kick', h.kick); el.classList.toggle('notitle', !h.title); el.classList.toggle('badged', dev === 'kb' || dev === 'pad');   // badged: the chips wear keycaps or pad glyphs, which stand 9px above the row, so the rows start lower (the badges sat on the rule line)
  $('hc' + s + '-t').textContent = h.title || ''; $('hc' + s + '-r').textContent = h.rule || '';
  $('ht' + s).hidden = h.kick;                              // kick cards sit inside the stick zone: no tick a steering thumb could hit
  $('hc' + s + '-b').innerHTML = h.rows.map(r => `<div class="hc-row">${r.chips.map(ch => chipHtml(s, ch)).join('<span class="hc-or">or</span>')}<span>${esc(r.text)}</span></div>`).join('');
}
function renderHintSwitches() {                            // the pause card's rows, the join cards' ticks, the penalty card's tick and sublines, Replay Tutorial
  const pair = !!(M && M.two && mode === 'match');
  $('pz-hl0').textContent = pair ? 'Player 1 Hints' : 'Hints'; $('pz-hrow1').hidden = !pair; $('pz-cam').hidden = pair || !!practice;
  for (const s of [0, 1]) { const seg = $('pz-h' + s); if (seg && seg.children) [...seg.children].forEach((b, i) => b.setAttribute('aria-pressed', String((i === 0) === hintsOn(s)))); }
  for (const s of [0, 1]) $('jt' + s).classList.toggle('off', !settings.twoHints[two.swapped ? 1 - s : s]);
  const ps = penCtx && M && M.two ? seatOfTeam(penCtx.team) : 0, on = hintsOn(ps);
  $('m-pen').classList.toggle('nohints', !on); $('ht-pen').classList.toggle('off', !on);
  $('p-goal-s').textContent = $('p-goal').disabled ? 'Out of Range' : '3 Points';
  $('h-replay').disabled = !settings.tut.length;
}
/* the tutorial */
function tutMoment(c) { return c.duel ? c.kind : c.kind === 'goal' ? (c.g.watch || !isHuman(c.g.team) ? null : c.g.type === 'drop' ? 'drop' : 'goal') : c.kind; }
function tutSeatOf(c) {                                    // whose first time it is: the duel's owner, the kicker, the feeding or throwing side's player, else the human in it
  const t = c.duel ? c.own : c.kind === 'goal' ? c.g.team : c.kind === 'scrum' ? c.feed : c.team;
  const s = seatOfTeam(t); return s != null ? s : seatOfTeam(1 - t);
}
function tutStart(c) {
  const id = tutMoment(c); if (!id) return;
  const s = tutSeatOf(c); if (s == null) return;
  if (tutSeen(id)) return;
  tutMark(id);                                             // remembered at its first time whether or not the card shows, so the first-time aids come once
  if (!interactive() || !hintsOn(s)) return;
  M.tut = { id, seat:s, step:0, cut:c };
  renderTut();
}
/* a card's words name the control for the device: on a keyboard every key is a {code} token (KeyJ, Slash), which renderTut draws as a
   keycap through tutHtml, as the hint chips do, so Player 2's / . , never read as punctuation in the sentence and A and D never as words */
function tutHtml(text) { return text.split(/(\{[A-Za-z0-9]+\})/).map(part => (/^\{[A-Za-z0-9]+\}$/.test(part) ? `<kbd class="kc">${esc(KEYCAP[part.slice(1, -1)] || part.slice(1, -1))}</kbd>` : esc(part))).join(''); }
function tutCards(id, s) {
  const dev = hintDev(s), kb = dev === 'kb', pad = dev === 'pad', sch = seatScheme(s) || 'solo', R = sch === 'right';
  const PAD = { a:'Bottom Button', b:'Right Button', c:'Shoulder' };
  const key = act => '{' + KB[sch][act][0] + '}';
  const name = (act, word) => (kb ? key(act) : pad ? 'the ' + PAD[act] : word);   // a keycap, the Bottom Button, or the button's own word
  const flick = kb ? (R ? 'Tap an Arrow' : 'Tap {KeyA} or {KeyD}') : 'Flick the Stick', steer = kb ? (R ? 'the Arrows' : '{KeyA} and {KeyD}') : 'the Stick', aim = M && M.kids ? '' : 'Steer With ' + steer + ', ';   // Kids sets the aim
  switch (id) {
    case 'past': return [['Get Past', 'Beat the Last Man'], ['Get Past', flick + ' Away From Him When the Ring Turns Gold']];
    case 'pass': return [['Key Pass', 'Two on One'], ['Key Pass', 'Press ' + name('a', 'Pass') + ' on Gold, or ' + name('b', 'Dummy') + ' If He Drifts to Your Runner']];
    case 'tackle': return [['Tackle', 'You Are the Last Man'], ['Tackle', 'Press ' + name('a', 'Tackle') + ' When the Ring Turns Gold. He May Step']];
    case 'block': return [['Block', 'Their Pass Crosses Your Man'], ['Block', 'Press ' + name('a', 'Block') + ' on the Real Release, Not the Dummy']];
    case 'scrum': return [['Scrum', 'Crouch, Bind, Set'], ['Scrum', 'Press ' + name('a', 'Push') + ' on Set, Then Tap It Fast']];
    case 'lineout': return [['Lineout', 'One Jumper Each'], ['Lineout', 'Press ' + name('a', 'Jump') + ' So Your Jumper Is Up When the Ball Arrives']];
    case 'goal': return [['Goal Kick', 'Kick Between the Posts'], ['Goal Kick', aim + 'Hold ' + name('a', 'Kick') + ', Let Go in the Gold']];
    default: return [['Drop Goal', 'Three Points From Open Play'], ['Drop Goal', 'Hold ' + name('b', 'Kick') + ', ' + aim + 'Let Go in the Gold Before They Reach You']];
  }
}
function renderTut() {
  const T = M && M.tut, el = $('m-tut');
  if (!T) { el.hidden = true; return; }
  const [title, text] = tutCards(T.id, T.seat)[T.step], eb = $('tu-eye');
  eb.textContent = M.two ? 'Player ' + (T.seat + 1) + ' · Tutorial' : 'Tutorial'; eb.classList.toggle('p1', M.two && T.seat === 0); eb.classList.toggle('p2', M.two && T.seat === 1);
  $('tu-title').textContent = title; $('tu-text').innerHTML = tutHtml(text);
  $('tu-row').hidden = T.step !== 0; $('tu-play').hidden = T.step === 0;
  setFocus(null); el.hidden = false;
}
function tutAdvance() { if (!M || !M.tut) return; if (M.tut.step === 0) { M.tut.step = 1; renderTut(); } else tutPlay(); }
function tutPlay() {                                        // Play (or Skip): the close-up runs from its first frame
  if (!M || !M.tut) return;
  const c = M.tut.cut; M.tut = null; $('m-tut').hidden = true;
  if (c && c.kind === 'goal' && c.g.type === 'drop' && !c.g.out) { c.g.started = false; c.g.stage = 'hold'; c.g.m = 0; c.g.pt = 0; }   // the thumb still down carries over as at the press; one lifted needs a fresh press
  if (c && c.duel) { c.slowFrom = c.t; c.acc = 0; }
  for (const inp of inputs) { inp.aPressed = inp.bPressed = inp.cPressed = false; inp.flick = 0; }
}
for (const s of [0, 1]) {
  $('ht' + s).addEventListener('click', () => setHints(s, false));
  $('jt' + s).addEventListener('click', () => setHints(s, !hintsOn(s)));
  [...($('pz-h' + s).children || [])].forEach((b, i) => b.addEventListener('click', () => setHints(s, i === 0)));
}
$('ht-pen').addEventListener('click', () => { const s = penCtx && M && M.two ? seatOfTeam(penCtx.team) : 0; setHints(s, !hintsOn(s)); });
$('m-tut').addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('button')) return; tutAdvance(); });   // a tap anywhere advances; the buttons speak for themselves
$('tu-next').addEventListener('click', tutAdvance);
$('tu-skip').addEventListener('click', tutPlay);
$('tu-play').addEventListener('click', tutPlay);
$('h-replay').addEventListener('click', () => { tutReset(); renderHintSwitches(); });

/* ---------- first-match coach (2026-10-30)
   One short line the first time each open-play move comes up on this device, through say() so it stays a banner (the on-pitch
   tags stay capped at two, and reduced motion already drops the banner's pop). Play is not frozen. One line at a time, and
   none while a game banner is up or two tags are already out. Headless, auto and the menu demo stay quiet.
   The first duel and the first goal kick keep the tutorial card, the hints card and the first-kick path: those already teach
   the moment, so the coach remembers the line and leaves the card and the path to speak. With Hints off and no card up, the
   first duel still gets its one line. A drop goal is the tutorial's own moment. */
function coachClear() { coachLast = null; coachUntil = 0; }
function bannerBusy() { const el = $('banner'); return !!(el && el.innerHTML); }
function coachStepNear(c) {                               // the Side Step hint's window: a standing defender ahead, 3.5–6m off and within 3m across
  const d = dirOf(c.team); let front = 99;
  for (const q of M.players) {
    if (q.team === c.team || !onFeet(q) || (q.x - c.x)*d <= 0.5) continue;
    if (Math.abs(q.y - c.y) < 3) front = Math.min(front, dist(q, c));
  }
  return front >= 3.5 && front <= 6;
}
function coachOpen(t) {                                   // which lines this human's buttons would earn right now
  const due = [], c = ctrlOf(t); if (!c) return due;
  const b = M.ball, k = M.contact, held = b.state === 'held' && b.carrier === c;
  if (held && c.bind && k && k.c === c && (k.tier === 'soft' || k.tier === 'wrap') && canOffload(k)) due.push('offload');
  if (!ourBall(t) && canDive(c)) due.push('tackle');
  if (held && !c.bind) { if (coachStepNear(c)) due.push('step'); due.push('pass'); }
  if (sprintOn(t)) due.push('sprint');
  return due;
}
function coachCut() {                                     // a duel or a place kick. Returns a line to say, or null after remembering one the existing aids already cover
  const c = M.cut; if (!c || c.after) return null;
  if (c.duel && isHuman(c.own) && !tipSeen('duel')) {
    const s = seatOfTeam(c.own);
    if (M.tut || (s != null && hintsOn(s))) { coachMark('duel'); return null; }   // the tutorial card or the hints card already names the gold ring
    if (c.t >= CUT_IN) return 'duel';
  }
  const g = c.kind === 'goal' ? c.g : null;
  if (g && g.type !== 'drop' && !g.watch && isHuman(g.team) && !tipSeen('kick')) {
    const s = seatOfTeam(g.team);
    if (M.tut || g.aid === 'path' || tutSeen('goal') || (s != null && hintsOn(s))) { coachMark('kick'); return null; }   // the first-kick path, the card, or a kick this device has already had
    if (c.t >= CUT_IN && (g.stage === 'aim' || g.stage === 'power')) return 'kick';
  }
  return null;
}
function coachPick() {
  const due = [];
  if (M.phase === 'cut' && M.cut) { const id = coachCut(); if (id) due.push(id); }
  else if (M.phase === 'play' && !M.cut) for (const t of [0, 1]) if (isHuman(t)) due.push(...coachOpen(t));
  for (const id of COACH_IDS) if (due.includes(id) && !tipSeen(id)) return id;
  return null;
}
function coachShow(id) {
  coachMark(id);
  coachLast = COACH_LINE[id];
  say(coachLast, 'coach');
  coachUntil = performance.now() + 1700;
}
function coachTick() {
  if (!settings.coach || !M || !interactive() || M.paused || M.over || M.tut || M.phase === 'menu' || M.phase === 'break') return;
  const id = coachPick();
  if (!id || performance.now() < coachUntil || bannerBusy() || M.tags.length >= 2) return;
  coachShow(id);
}

