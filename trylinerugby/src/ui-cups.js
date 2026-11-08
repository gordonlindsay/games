/* =========================================================
   Silverware in Championship mode (README, Silverware): the team screen's competition row (League | World Cup | Home Nations
   Tour), the European Cup offered after a European league is won, the cup hub (the stage, your next fixture, Play, the
   bracket, the pools or the Tests), the last round's result card, the winner's card, the full-time line, and the cups in the
   Trophy Cabinet. The rules are src/cups.js's; the cup under way is `cup` (persistence.js). All of it sits behind
   Championship's Full Game gate, as the button that leads here does.
   ========================================================= */
const CUP_COMPS = [['league', 'League'], ['world', 'World Cup'], ['tour', 'Home Nations Tour']];
const CUP_SHORT = { euro:'European Cup', world:'World Cup', tour:'Tour' };   // the home screen's note, one line under its half
const CUP_PLURAL = { 'Semi-Final':'Semi-Finals', 'Quarter-Final':'Quarter-Finals', Final:'Final' };
let champComp = 'league';                                  // the competition row; League, today's flow, each time the screen opens
let cupEuroSkip = null;                                    // Not Now: the league season whose European Cup offer was put off, this visit
let cupResetArmed = false;

{
  $('t-comp').innerHTML = CUP_COMPS.map(([id, n]) => `<button data-comp="${id}">${n}</button>`).join('');
  for (const b of $('t-comp').querySelectorAll('[data-comp]')) b.addEventListener('click', () => cupCompPick(b.dataset.comp));
}
function cupCompReset() { champComp = 'league'; }
function cupCompPick(id) {
  if (!CUP_COMPS.some(c => c[0] === id)) return;
  champComp = id;
  renderTeams(); $('s-teams').scrollTop = 0;
}
/* The team screen for the World Cup (the category's twelve, pick your nation) or the Home Nations Tour (your side is the
   Home Nations; the three hosts, the one in turn first and on the primary). null for League. */
function cupTeamsView() {
  if (champComp === 'world') {
    const cat = settings.cat;
    return { comp:'world', title:'Pick Your Nation', list:cupTwelve(cat), start:t => cupBegin('world', { user:catTeam(t, cat) || t, cat }) };
  }
  if (champComp !== 'tour') return null;
  const cat = settings.cat, hosts = CUPS.tour.hosts, at = cupTurn % hosts.length;
  const list = [0, 1, 2].map(i => cupNation(hosts[(at + i) % hosts.length], cat)).filter(Boolean);
  return { comp:'tour', title:'Pick the Host', list, yours:cupTourSide(cat), pick:list[0], primary:'Tour ' + listName(list[0]),
    start:t => { if (!hosts.includes(t.id)) return; cupTurn = hosts.indexOf(t.id) + 1; cupBegin('tour', { user:cupTourSide(cat), cat, host:t.id }); } };
}
function cupBegin(id, opts) {
  const c = cupNew(id, opts);
  if (!c) return false;
  cup = c; cupResetArmed = false;
  save(); renderCup(); showScreen('s-cup'); $('s-cup').scrollTop = 0;
  return true;
}

/* A league won with a side from England, France, Celtic and Italy or South Africa offers the European Cup straight after. */
function cupEuroOn(c, rows) { return !!c && c.round >= 5 && rows[0].i === c.user && cupEuroSkip !== c.id && !!cupListOf(c.teams[c.user]); }
function cupEuroHub(c, rows) {
  if (!cupEuroOn(c, rows)) return false;
  $('hub-next').innerHTML = `<div class="stack cup-offer"><button class="btn primary" id="hub-euro"><span class="cup-trophy" data-kind="euro" aria-hidden="true"></span>Play European Cup</button><button class="btn" id="hub-later">Not Now</button></div>`;
  $('hub-euro').addEventListener('click', cupEuroStart);
  $('hub-later').addEventListener('click', () => { cupEuroSkip = champ ? champ.id : null; renderHub(); });
  return true;
}
function cupEuroStart() {
  const c = champ;
  if (!c || !cupEuroOn(c, standings(c))) return false;
  const me = c.teams[c.user];
  archiveChampionship(c);                                  // the league season goes into the Trophy Cabinet first
  champ = null;
  return cupBegin('euro', { user:me, cat:catOf(me) });
}

/* Full time in a cup match in Championship mode: the result into the cup, in the fixture's order. */
function cupRecordMatch() {
  if (!cup || !M || M.cup !== cup.id || M.career || M.demo || M.two || practice || M.cupResultDone) return false;
  const fx = cupFixture(cup);
  if (!fx) return false;
  const home = fx.home === cup.user;
  const r = home ? { score:[M.score[0], M.score[1]], tries:[M.tries[0], M.tries[1]] } : { score:[M.score[1], M.score[0]], tries:[M.tries[1], M.tries[0]] };
  M.cupResultDone = true;
  const done = cupRecord(cup, r);
  save();
  return done;
}
function cupPlay() {
  const fx = cupFixture(cup);
  if (!fx) return false;
  startMatch(cup.teams[cup.user], cup.teams[fx.opp], false, { cup:cup.id, cupKO:fx.ko });
  return true;
}
/* A finished cup goes into the Trophy Cabinet once, as { kind, id, cup } (persistence.js). Never a career's: career.cup is its own. */
function cupRetain(c) {
  if (practice || !c || !cupDone(c)) return false;
  const e = cleanCupEntry({ kind:c.id, cup:c });
  if (!e || champHistory.some(old => old.id === e.id)) return false;
  champHistory.push(e);
  champHistory = cabinetTrim(champHistory);
  return true;
}

/* Words. */
function cupNote(c) { return cupName(c) + ' · ' + cupLabel(c); }
/* The home screen's note under Championship: a small trophy in the cup's colour, then Bath · European Cup · Semi-Final. A phone held
   sideways leaves out the side's name and the cup's (styles.css), so it stays one line under its half: the trophy and Semi-Final. */
function cupHomeNote(el, c) {
  const tour = c.id === 'tour' && c.user === 0;
  const name = tour ? '' : `<span class="rn-name">${esc(c.teams[c.user].name + ' · ')}</span>`;
  el.innerHTML = `<span class="cup-trophy" data-kind="${c.id}" aria-hidden="true"></span>${name}<span class="rn-cup">${esc((tour ? 'Tour of ' + listName(c.teams[1]) : CUPS[c.id].name) + ' · ')}</span>${esc(cupLabel(c))}`;
  el.hidden = false;
}
/* The cup by name: European Cup · Bath, or on tour, Tour of South Africa (the Home Nations are always the side on tour). */
function cupName(c, long) {
  if (c.id === 'tour' && c.user === 0) return 'Tour of ' + listName(c.teams[1]);
  return (long ? CUPS[c.id].name : c.teams[c.user].name + ' · ' + CUP_SHORT[c.id]) + (long ? ' · ' + c.teams[c.user].name : '');
}
function cupLastRound(c) {                                 // the latest round with a result of the user's
  for (let k = c.results.length - 1; k >= 0; k--) if (c.results[k].some(m => m.h === c.user || m.a === c.user)) return k;
  return -1;
}
const cupMine = (c, k) => c.results[k].find(m => m.h === c.user || m.a === c.user);
const cupUs = (c, m) => (m.h === c.user ? [m.hs, m.as, m.ht] : [m.as, m.hs, m.at]);   // the user's points, theirs, his tries
function cupRoundName(c, k) {
  if (c.id === 'tour') return 'Test ' + (k + 1);
  if (c.id === 'world' && k < 3) return cupStage(c, k) + ' · Match ' + (c.results.slice(0, k + 1).filter(rd => rd.some(m => m.h === c.user || m.a === c.user)).length);
  return CUP_PLURAL[cupStage(c, k)];
}
/* What round k meant for the user: Through to the Final (on Tries), Out, Winners, Series 2 – 1, or a pool's table points. */
function cupVerdict(c, k) {
  const m = cupMine(c, k);
  if (!m) return { text:'', good:false };
  const [us, them, tries] = cupUs(c, m);
  if (c.id === 'world' && k < 3 && c.results.length >= 3) {   // his last pool match, the pools done: through or out, and where he finished
    const p = c.pools.findIndex(x => x.includes(c.user)), place = cupPoolRows(c, p).findIndex(r => r.i === c.user);
    return { text:place === 0 ? 'Pool ' + CUP_POOL[p] + ' Winners' : (place === 1 ? 'Through' : 'Out') + ' · ' + ordinal(place + 1) + ' in Pool ' + CUP_POOL[p], good:place < 2 };
  }
  if (!cupKO(c, k)) { const mp = matchPoints(us, them, tries); return { text:'+' + mp.p + ' Table ' + (mp.p === 1 ? 'Point' : 'Points') + (mp.why.length ? ' · ' + mp.why.join(', ') : ''), good:us >= them }; }
  const won = m.w === c.user, how = m.by === 'tries' ? ' on Tries' : m.by === 'toss' ? ' on the Toss' : '';
  if (c.id === 'tour') {
    const s = cupSeries(c, k + 1), mine = s[c.user], theirs = s[1 - c.user];
    const end = k === c.results.length - 1 && cupDone(c) ? (cupWinner(c) === c.user ? 'Series Won ' : 'Series Lost ') : 'Series ';
    return { text:(won ? 'Test Won' : 'Test Lost') + how + ' · ' + end + mine + ' – ' + theirs, good:won };
  }
  if (!won) return { text:'Out' + how, good:false };
  if (cupDone(c) && k === c.results.length - 1) return { text:CUPS[c.id].name + ' Winners' + how, good:true };
  return { text:'Through to the ' + CUP_PLURAL[cupStage(c, k + 1)] + how, good:true };
}
function cupBreakLine() {                                  // the full-time card, once the result is in (M.cupResultDone)
  const c = M && M.cup ? (M.career ? career && career.cup : cup) : null;
  if (!c || !M.cupResultDone || c.id !== M.cup) return '';
  const k = cupLastRound(c);
  return k < 0 ? '' : cupVerdict(c, k).text;
}
function cupLine(c) {                                      // under the title
  const fx = cupFixture(c), T = c.teams;
  if (!fx) {
    if (!cupDone(c)) return 'Out of the ' + CUPS[c.id].name;
    const w = cupWinner(c);
    if (c.id === 'tour') { const s = cupSeries(c); return T[w].name + ' win the series ' + Math.max(...s) + ' – ' + Math.min(...s); }
    return T[w].name + ' win the ' + CUPS[c.id].name;
  }
  if (c.id === 'tour') {
    const s = cupSeries(c), mine = s[c.user], theirs = s[1 - c.user];
    return fx.round === 0 ? 'Win two Tests to take the series' : 'Series ' + mine + ' – ' + theirs + (mine === 1 && theirs === 1 ? ' · The decider' : '');
  }
  if (!fx.ko) {
    if (fx.round === 0) return 'Top two in each pool go through';
    const p = c.pools.findIndex(x => x.includes(c.user)), place = cupPoolRows(c, p).findIndex(r => r.i === c.user);
    return ordinal(place + 1) + ' in Pool ' + CUP_POOL[p] + ' · top two go through';
  }
  return fx.label === 'Final' ? 'Win the ' + CUPS[c.id].name : 'Win to reach the ' + CUP_PLURAL[cupStage(c, fx.round + 1)];
}

/* Pieces. */
const cupKit = t => (HEX.test(t.kit) ? t.kit : '#888888');
const cupChip = t => `<i class="cup-chip" style="--k:${cupKit(t)}"></i>`;
function cupResHtml(c, m) {
  const T = c.teams, mine = m.h === c.user || m.a === c.user;
  return `<div class="res${mine ? ' me' : ''}"><span class="h">${esc(listName(T[m.h]))}</span><span class="sc">${m.hs} – ${m.as}</span><span>${esc(listName(T[m.a]))}</span></div>`;
}
function cupLastHtml(c) {                                  // the result card for the round just played: your match and what it meant (the rest are in the draw)
  const k = cupLastRound(c);
  if (c.id === 'tour') return cupSeriesHtml(c, k);
  if (k < 0) return '';
  const v = cupVerdict(c, k);
  return `<div class="cup-last"><p class="eyebrow">${esc(cupRoundName(c, k))}</p>${cupResHtml(c, cupMine(c, k))}<p class="cup-verdict${v.good ? ' good' : ' bad'}">${esc(v.text)}</p></div>`;
}
function cupSeriesHtml(c, k) {                             // a tour's result card: the series score, and the last Test's outcome under it
  const T = c.teams, s = cupSeries(c), m = k < 0 ? null : cupMine(c, k);
  const won = m && m.w === c.user, how = m && m.by === 'tries' ? ' on Tries' : m && m.by === 'toss' ? ' on the Toss' : '';
  const text = !m ? '' : cupDone(c) ? (cupWinner(c) === c.user ? 'Series Won' : 'Series Lost') : 'Test ' + (k + 1) + (won ? ' Won' : ' Lost') + how;
  const side = (t, r) => `<span class="cs-side${r ? ' r' : ''}${t === c.user ? ' me' : ''}" data-fit>${r ? '' : cupChip(T[t])}${esc(listName(T[t]))}${r ? cupChip(T[t]) : ''}</span>`;
  return `<div class="cup-last"><p class="eyebrow">Series</p><div class="cup-series">${side(0)}<b>${s[0]} – ${s[1]}</b>${side(1, true)}</div>${text ? `<p class="cup-verdict${(cupDone(c) ? cupWinner(c) === c.user : won) ? ' good' : ' bad'}">${esc(text)}</p>` : ''}</div>`;
}
/* The next-match panel's two cards. pre names the button's id, one per screen (the cup hub's is 'cup': cup-play, cup-new), so a
   screen left hidden with its old panel never answers $() for another's: give Career its own and bind $(pre + '-play'). label is
   the winner's card's button (here New Championship). */
function cupFixtureHtml(c, fx, pre) {
  const T = c.teams, h = T[fx.home], a = T[fx.away];
  return `<div class="stack">
      <div class="fixture">
        <span class="fx-team">${jersey(h)}<span data-fit>${esc(listName(h))}</span></span>
        <span class="fx-v">V</span>
        <span class="fx-team r"><span data-fit>${esc(listName(a))}</span>${jersey(a)}</span>
      </div>
      ${outmatched(T[c.user], T[fx.opp]) ? '<p class="eyebrow">Stronger Side</p>' : ''}
      <button class="btn primary" id="${pre}-play">Play Match</button>
    </div>`;
}
function cupWinHtml(c, pre, label) {                       // the winner's card, and its button
  const w = cupWinner(c), won = w === c.user;
  const head = w < 0 ? CUPS[c.id].name : c.id === 'tour' ? 'Series Winners' : CUPS[c.id].name + ' Winners';
  const who = w < 0 ? c.teams[c.user] : c.teams[w];
  return `<div class="stack">
      <div class="cup-win${won ? ' mine' : ''}" data-kind="${c.id}">
        <span class="cup-trophy" data-kind="${c.id}" aria-hidden="true"></span>
        <div class="cup-who"><p class="eyebrow">${w < 0 ? 'Out' : esc(head)}</p><b data-fit>${esc(listName(who))}</b></div>
        ${jersey(who)}
      </div>
      <button class="btn primary" id="${pre}-new">${esc(label)}</button>
    </div>`;
}
/* One tie in the bracket: two rows, the winner bright, yours marked; one not drawn yet is the same size. short: each side by its code, as
   the World Cup's and a tour's are (three columns: Australia and Home Nations are wider than a column at 667x375, and a name is never
   broken inside a word); the European Cup's two columns take a club's name. */
function cupTieHtml(c, k, i, short) {
  const pair = c.fixtures[k] && c.fixtures[k][i], m = c.results[k] && c.results[k][i];
  if (!pair) return `<div class="cb-tie tbc"><span class="cb-nm">${cupDone(c) ? 'Not Needed' : 'To Come'}</span></div>`;
  const row = (t, sc) => `<span class="cb-row${t === c.user ? ' me' : ''}${m && m.w === t ? ' win' : ''}">${cupChip(c.teams[t])}<span class="cb-nm">${esc(short ? c.teams[t].id : listName(c.teams[t]))}</span><b>${m ? sc : ''}</b></span>`;
  return `<div class="cb-tie">${row(pair[0], m && m.hs)}${row(pair[1], m && m.as)}</div>`;
}
function cupBracketHtml(c) {                               // the knockouts (or a tour's Tests) as columns of ties, each round's name over its column
  const cols = c.id === 'euro' ? [[0, 2], [1, 1]] : c.id === 'tour' ? [[0, 1], [1, 1], [2, 1]] : [[3, 4], [4, 2], [5, 1]];
  const name = k => (c.id === 'tour' ? 'Test ' + (k + 1) : CUP_PLURAL[cupStage(c, k)]);
  return `<div class="cup-bracket" style="--cols:${cols.length}">${cols.map(([k]) => `<p class="eyebrow">${name(k)}</p>`).join('')}${cols.map(([k, n]) => `<div class="cb-col">${Array.from({ length:n }, (_, i) => cupTieHtml(c, k, i, c.id !== 'euro')).join('')}</div>`).join('')}</div>`;
}
function cupPoolsHtml(c) {
  return `<div class="cup-pools">${c.pools.map((own, p) => `<div class="cp-pool${own.includes(c.user) ? ' me' : ''}"><p class="eyebrow">Pool ${CUP_POOL[p]}</p>
      <span class="cp-row cp-head"><span></span><span>P</span><b>Pts</b></span>
      ${cupPoolRows(c, p).map((r, n) => `<span class="cp-row${r.i === c.user ? ' me' : ''}${c.round >= 3 && n < 2 ? ' thru' : ''}"><span class="cp-t">${cupChip(c.teams[r.i])}<span class="cb-nm">${esc(c.teams[r.i].id)}</span></span><span>${r.P}</span><b>${r.Pts}</b></span>`).join('')}
    </div>`).join('')}</div>`;
}
function cupDrawHtml(c) {
  if (c.id !== 'world') return cupBracketHtml(c);
  if (c.round < 3) return cupPoolsHtml(c);
  return cupBracketHtml(c) + `<details class="cabinet cup-pooled"><summary>Pools</summary>${cupPoolsHtml(c)}</details>`;
}

/* The cup hub. */
function renderCup() {
  const c = cup;
  if (!c) return;
  if (cupRetain(c)) save();
  const fx = cupFixture(c), me = c.teams[c.user], won = cupDone(c) && cupWinner(c) === c.user;
  $('cup-eyebrow').textContent = cupName(c, true);
  $('cup-title').textContent = cupLabel(c);
  $('cup-title').classList.toggle('gold', won);
  $('cup-line').textContent = cupLine(c);
  $('cup-line').classList.toggle('payoff', won);
  $('cup-next').innerHTML = fx ? cupFixtureHtml(c, fx, 'cup') : cupWinHtml(c, 'cup', 'New Championship');
  if (fx) $('cup-play').addEventListener('click', cupPlay);
  else $('cup-new').addEventListener('click', () => { cupRetain(cup); cup = null; save(); openTeams('champ'); });
  $('cup-last').innerHTML = cupLastHtml(c);
  $('cup-last').hidden = !$('cup-last').innerHTML;
  $('cup-draw').innerHTML = cupDrawHtml(c);
  $('cup-reset').textContent = 'Start Fresh'; cupResetArmed = false;
  cupFit($('s-cup'));
}
/* A long name (South Africa, Home Nations) steps down in size until its longest word fits its box, never under the edge of a jersey. */
function cupFit(root) {
  for (const el of root.querySelectorAll('[data-fit]')) {
    el.style.fontSize = '';
    let px = parseFloat(getComputedStyle(el).fontSize) || 24;
    while (el.scrollWidth > el.clientWidth + 0.5 && px > 14) { px -= 1; el.style.fontSize = px + 'px'; }
  }
}
$('cup-back').addEventListener('click', goHome);
$('cup-reset').addEventListener('click', () => {
  if (!cupResetArmed) { cupResetArmed = true; confirmArm(); $('cup-reset').textContent = 'Tap Again to Start Fresh'; return; }
  if (confirmSoon()) return;
  cupRetain(cup); cup = null; save(); goHome();
});

/* A finished cup in the Trophy Cabinet (renderCabinet, src/ui-menus.js). */
function cupEntryHtml(e, i, tag) {
  const c = e.cup, s = cupRecordOf(c), w = cupWinner(c);
  const award = w === c.user ? (c.id === 'tour' ? 'Series Won' : CUPS[c.id].name) : (c.id === 'tour' ? 'Series Won by ' : 'Won by ') + esc(c.teams[w].name);
  return `<article class="season-entry"><p class="eyebrow">${tag}${i === 0 ? 'Most Recent' : 'Earlier Cup'}</p><h3>${esc(c.teams[c.user].name)} · ${esc(cupFinish(c))}</h3><p>${s.played ? seasonRecord(s) : 'No matches played'}</p><p>Points ${s.pointsFor} for / ${s.pointsAgainst} against · Tries ${s.triesFor} for / ${s.triesAgainst} against</p><p class="season-awards">${award}</p></article>`;
}
