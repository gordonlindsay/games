/* =========================================================
   Career screens: the new player, the hub, training, the table and the season's end.
   The rules are in src/career.js; nothing here draws a random number except through it.
   ========================================================= */
const CAREER_COL = { pace:'#5fb8ff', power:'#ff6b5a', handling:'#5fd38a', kicking:'#ff9f43', stamina:'#c58cff' };   // a colour per skill, always beside its name
let careerDraft = null, careerResetArmed = false, careerRestartArmed = false;
const careerStageName = i => CAREER_STAGES[i].name;
/* At the Club stage the eyebrow names your club's real league. */
const careerEyebrow = cr => { if (careerFestival(cr)) return 'Minis · Tag Festival'; const lg = cr.stage === 2 ? careerClubNow(cr).league : ''; return (lg || careerStageName(cr.stage)) + ' · Season ' + careerSeasonNo(cr); };
const careerSeasonNo = cr => cr.history.filter(h => h.stage === cr.stage).length + 1;
const careerPosWord = pos => (pos === 'F' ? 'Forward' : 'Back');
function careerShirt(t, num, cls) {                  // the kit with your number on it
  return `<span class="cr-shirt${cls ? ' ' + cls : ''}">${jersey(t)}<b>${num}</b></span>`;
}
/* A name too long for its box steps down in size until its longest word fits, as fitNames does on the team cards. Run once the screen shows.
   A label (International on a narrow Hall of Fame) gives up most of its letter spacing first, and may go down to 10px. */
function careerFit(root) {
  for (const el of root.querySelectorAll('[data-fit]')) {
    el.style.fontSize = ''; el.style.letterSpacing = '';
    const over = () => el.scrollWidth > el.clientWidth + 0.5, lbl = el.classList.contains('lbl');
    if (lbl && over()) el.style.letterSpacing = '.04em';
    let px = parseFloat(getComputedStyle(el).fontSize) || 20;
    while (over() && px > (lbl ? 10 : 12)) { px -= 1; el.style.fontSize = px + 'px'; }
  }
}
function careerShow(id) { showScreen(id); const s = $(id); s.scrollTop = 0; careerFit(s); }
function careerNote(cr) {
  const c = cr.season, st = careerStageName(cr.stage);
  if (!c) return st;
  if (c.round < 5) return st + ' · ' + c.teams[c.user].name + (careerFestival(cr) ? ' · Match ' : ' · Round ') + (c.round + 1) + ' of 5';
  return st + ' · ' + (careerOutcome(cr).final ? 'Career Over' : 'Season Over');
}
function renderCareerHome() {
  const b = $('b-career'), note = $('career-note');
  if (!career) { b.textContent = 'Career'; note.hidden = true; return; }
  b.textContent = 'Continue Career'; note.textContent = careerNote(career); note.hidden = false;
}

/* ---------- the new player ---------- */
const careerClubs = () => [...CLUBS, ...custom];     // the Local list and the teams you made (an imported club is one of those)
const CAREER_BUILDS = [0.92, 1, 1.12];                // Small | Medium | Big: one of the art's three builds each
function careerNewOpen() {
  const child = kidsLevel();                         // the Kids level starts on My Child; only a grown-up moves it to Me
  careerDraft = { i:Math.max(0, careerClubs().indexOf(myTeamOf())), pos:'B', num:CAREER_POS.B[0], numsFor:null, look:{ ...CAREER_LOOK }, who:child ? 1 : 0, start:child ? 0 : 2 };   // your club starts on Your Team, when it is one of these
  $('cn-name').value = '';
  $('cn-clubs').innerHTML = careerClubs().map((t, i) => `<button class="team cr-club" data-i="${i}">${jersey(t)}<span class="tid"><span class="tname" data-fit>${esc(t.name)}</span>${teamStars(t)}</span></button>`).join('');
  for (const b of $('cn-clubs').querySelectorAll('[data-i]')) b.addEventListener('click', () => { careerDraft.i = +b.dataset.i; renderCareerNew(); });
  renderCareerNew(); careerShow('s-career-new');
  const art = ART.state === 'idle' ? artLoad() : ART.state === 'loading' ? ART.promise : null;   // the real sprite when it can be had; the shirt stands in until then, or if it never comes
  if (art && art.then) art.then(() => { if (careerDraft && !$('s-career-new').hidden) careerLookShow(); });
}
function careerLookSet(key, v) { careerDraft.look[key] = v; renderCareerNew(); }
function careerLookShow() {
  const cv = $('cn-look'), d = careerDraft;
  cv.hidden = !artPreview(cv, careerClubs()[d.i], d.look);
}
/* The picks change in place, so a controller's ring stays on the button it pressed; the numbers are redrawn only for a new position. */
function renderCareerNew() {
  const d = careerDraft, clubs = careerClubs();
  if (d.i >= clubs.length) d.i = 0;
  for (const b of $('cn-clubs').querySelectorAll('[data-i]')) { const on = +b.dataset.i === d.i; b.classList.toggle('picked', on); b.setAttribute('aria-pressed', String(on)); }
  [...$('cn-pos').children].forEach((b, i) => b.setAttribute('aria-pressed', String((i === 0) === (d.pos === 'F'))));
  [...$('cn-who').children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === d.who)));
  const starts = careerWhoStarts(d.who);
  [...$('cn-start').children].forEach((b, i) => { b.textContent = CAREER_STAGE_START[starts[i]]; b.setAttribute('aria-pressed', String(starts[i] === d.start)); });
  if (d.numsFor !== d.pos) {
    d.numsFor = d.pos;
    $('cn-num').innerHTML = CAREER_POS[d.pos].map(n => `<button data-n="${n}">${n}</button>`).join('');
    for (const b of $('cn-num').querySelectorAll('[data-n]')) b.addEventListener('click', () => { careerDraft.num = +b.dataset.n; renderCareerNew(); });
  }
  for (const b of $('cn-num').querySelectorAll('[data-n]')) b.setAttribute('aria-pressed', String(+b.dataset.n === d.num));
  $('cn-shirt').innerHTML = careerShirt(clubs[d.i], d.num, 'big');
  const L = d.look;
  [...$('cn-g').children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === L.g)));
  [...$('cn-build').children].forEach((b, i) => b.setAttribute('aria-pressed', String(CAREER_BUILDS[i] === L.b)));
  [...$('cn-skin').children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === L.skin)));
  [...$('cn-hair').children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === L.hair)));
  [...$('cn-style').children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === L.style)));
  careerLookShow();
}
const CAREER_HAIR_NAMES = ['Black', 'Dark Brown', 'Brown', 'Light Brown', 'Blonde', 'Red'];
$('cn-skin').innerHTML = LOOK_SKIN.map((h, i) => `<button class="sw" style="--k:${h}" aria-label="Skin ${i + 1}"></button>`).join('');
$('cn-hair').innerHTML = LOOK_HAIR.map((h, i) => `<button class="sw" style="--k:${h}" aria-label="${CAREER_HAIR_NAMES[i]}"></button>`).join('');
for (const [id, key, of] of [['cn-g', 'g', i => i], ['cn-build', 'b', i => CAREER_BUILDS[i]], ['cn-skin', 'skin', i => i], ['cn-hair', 'hair', i => i], ['cn-style', 'style', i => i]])
  [...$(id).children].forEach((b, i) => b.addEventListener('click', () => careerLookSet(key, of(i))));
[...$('cn-pos').children].forEach((b, i) => b.addEventListener('click', () => {
  const pos = i === 0 ? 'F' : 'B';
  if (careerDraft.pos !== pos) { careerDraft.pos = pos; careerDraft.num = CAREER_POS[pos][0]; }
  renderCareerNew();
}));
/* Who's playing sets where the career can start. A choice here sets the stage and nothing else is kept: the stage then sets the rules, the matches and the training. */
const CAREER_STAGE_START = ['Minis', 'Juniors', 'Adult'];
function careerWhoSet(who) {
  careerDraft.who = who;
  const starts = careerWhoStarts(who);
  if (!starts.includes(careerDraft.start)) careerDraft.start = who ? 0 : 2;
  renderCareerNew();
}
function careerWhoPick(i) {
  if (i === careerDraft.who) return;
  if (i === 0 && kidsLevel()) { parentGate(() => careerWhoSet(0)); return; }   // the Kids level: only a grown-up takes a career out of the children's starts
  careerWhoSet(i);
}
function careerStartPick(i) { careerDraft.start = careerWhoStarts(careerDraft.who)[i]; renderCareerNew(); }
[...$('cn-who').children].forEach((b, i) => b.addEventListener('click', () => careerWhoPick(i)));
[...$('cn-start').children].forEach((b, i) => b.addEventListener('click', () => careerStartPick(i)));
$('cn-name').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
function careerNewGo() {
  const d = careerDraft, club = careerClubs()[d.i];
  if (!careerStart({ name:$('cn-name').value, pos:d.pos, num:d.num, club, look:d.look, start:d.start })) return false;
  careerOpen();
  return true;
}
$('cn-go').addEventListener('click', careerNewGo);
$('cn-back').addEventListener('click', goHome);

/* ---------- the hub ---------- */
function careerOpen() {
  ratingsSync();
  if (!career) { careerNewOpen(); return; }
  if (!career.season) { careerNewSeason(career); save(); }   // a broken season was dropped on load: a new draw for the same stage
  if (career.season.round >= 5) { if (careerSettle(career)) save(); renderCareerEnd(); careerShow('s-career-end'); return; }
  renderCareer(); careerShow('s-career');
}
function careerCardHtml(cr, team) {
  const ovr = careerOverall(cr.skills), g = (careerLast && careerLast.gains) || {};
  return `<div class="cr-id">${careerShirt(team, cr.num)}
      <div class="cr-who"><p class="eyebrow">${careerPosWord(cr.pos)} · No. ${cr.num}</p><h3 data-fit>${esc(cr.name || team.name)}</h3></div>
      <span class="cr-ovr" aria-label="Overall ${ovr}"><b>${ovr}</b><span>Overall</span></span></div>
    <div class="cr-skills">${careerSkills().map(([k, l]) => {
      const v = cr.skills[k];
      return `<div class="cr-sk" style="--k:${CAREER_COL[k] || 'var(--chalk)'}"><span class="lbl">${l}</span><span class="bar" aria-hidden="true"><i style="width:${v}%"></i></span><b>${v}</b>${g[k] ? `<em>+${g[k]}</em>` : '<em></em>'}</div>`;
    }).join('')}</div>`;
}
function careerFixtureHtml(c, tie) {
  const [h, a] = tie ? tie.pair : userFixture(c).pair, T = tie ? career.cup.teams : c.teams;
  return `<div class="fixture"><span class="fx-team">${jersey(T[h])}${fxName(T[h], true)}</span><span class="fx-v">V</span><span class="fx-team r">${fxName(T[a], true)}${jersey(T[a])}</span></div>`;
}
function careerLine(cr) {
  const c = cr.season, st = CAREER_STAGES[cr.stage];
  const place = c.round ? ordinal(careerPlace(c)) : '';
  if (st.festival) return st.note;                   // no table, nothing to chase
  const goal = st.bar == null ? '' : 'Top Two or Overall ' + st.bar + ' to Go Up';
  return (!c.round && st.note ? st.note + ' · ' : '') + [place, goal].filter(Boolean).join(' · ');
}
function careerGainText(g) { return careerSkills().filter(([k]) => g[k]).map(([k, l]) => '+' + g[k] + ' ' + l).join(' · '); }
/* A cup tie on the hub: which cup, which round, and what losing means. */
function careerTieLine(cup, tie) { return tie.label === 'Final' ? 'For the Trophy' : !tie.plate && cup.tie === 0 ? 'Lose and You Drop Into the Plate' : 'Lose and You Are Out'; }
function renderCareer() {
  const cr = career, c = cr.season, team = c.teams[c.user], tie = careerCupDue(cr);
  $('cr-card').innerHTML = careerCardHtml(cr, team);
  $('cr-eyebrow').textContent = careerEyebrow(cr);
  $('cr-title').textContent = tie ? (tie.plate ? cr.cup.plate : cr.cup.name) + ' ' + tie.label : (careerFestival(cr) ? 'Match ' : 'Round ') + (c.round + 1) + ' of 5';
  $('cr-table').hidden = careerFestival(cr);
  $('cr-line').textContent = tie ? careerTieLine(cr.cup, tie) : careerLine(cr); $('cr-line').hidden = !$('cr-line').textContent;
  const gain = careerLast ? careerLast.line || careerGainText(careerLast.gains) : '';
  $('cr-gain').textContent = gain; $('cr-gain').hidden = !gain;
  $('cr-next').innerHTML = careerFixtureHtml(c, tie);
  const can = careerCanTrain(cr) && careerDrills(cr).length > 0;
  $('cr-train').textContent = cr.trained ? 'Trained' : 'Train'; $('cr-train').disabled = !can;
  $('cr-reset').textContent = 'Start Fresh'; careerResetArmed = false;
}
$('b-career').addEventListener('click', () => { ac(); careerOpen(); });
$('cr-play').addEventListener('click', () => { careerLast = null; careerPlay(); });
$('cr-train').addEventListener('click', () => { if (careerCanTrain(career)) { renderCareerTrain(); careerShow('s-career-train'); } });
$('cr-table').addEventListener('click', () => { renderCareerTable(); careerShow('s-career-table'); });
$('cr-back').addEventListener('click', goHome);
$('cr-reset').addEventListener('click', () => {
  if (!careerResetArmed) { careerResetArmed = true; $('cr-reset').textContent = 'Tap Again to Start Fresh'; return; }
  careerEnd(); goHome();
});

/* ---------- training ---------- */
function careerChips(keys) {
  const label = Object.fromEntries(careerSkills());
  return keys.map(k => `<span class="cr-chip" style="--k:${CAREER_COL[k] || 'var(--chalk)'}">${label[k] || k}</span>`).join('');
}
function renderCareerTrain() {
  $('ct-list').innerHTML = careerDrills(career).map(d => `<button class="btn cr-drill" data-drill="${d.id}"><span class="nm">${esc(d.name).replace(/\S*-\S*/g, w => `<span class="nw">${w}</span>`)}</span><span class="cr-chips">${careerChips(d.skills)}</span></button>`).join('');
  for (const b of $('ct-list').querySelectorAll('[data-drill]')) b.addEventListener('click', () => careerTrain(b.dataset.drill));
  $('ct-coach').hidden = !careerDrills(career).some(d => PRACTICE_DRILLS.find(p => p.id === d.id).contact);
}
$('ct-back').addEventListener('click', careerOpen);

/* ---------- the table ---------- */
function careerTableRows(cr) {
  const c = cr.season, T = c.teams, up = CAREER_STAGES[cr.stage].bar != null;
  return standings(c).map((r, n) => `
    <tr class="${r.i === c.user ? 'me' : ''}${up && c.round && n < CAREER_UP ? ' up' : ''}">
      <td class="rk">${c.round ? n + 1 : '–'}</td>
      <td class="t"><span class="chip" style="--k:${HEX.test(T[r.i].kit) ? T[r.i].kit : '#888888'};--t:${HEX.test(T[r.i].trim) ? T[r.i].trim : '#f2efe6'}"></span>${esc(T[r.i].name)}${teamStars(T[r.i])}</td>
      <td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.PD > 0 ? '+' : ''}${r.PD}</td><td>${r.BP}</td><td class="pts">${r.Pts}</td>
    </tr>`).join('');
}
/* The cup under the table: the ties played, latest first, your own marked. */
function careerCupHtml(cup) {
  const T = cup.teams, rows = rd => rd.map(r => `<div class="res${r.h === cup.user || r.a === cup.user ? ' me' : ''}"><span class="h">${esc(T[r.h].name)}</span><span class="sc">${r.hs} – ${r.as}</span><span>${esc(T[r.a].name)}</span></div>`).join('');
  const out = [];
  for (let k = cup.tie - 1; k >= 0; k--) {
    out.push(`<div class="rd"><p class="eyebrow">${esc(cup.name)} ${CUP_TIES[k]}</p>${rows(cup.main[k])}</div>`);
    if (k > 0) out.push(`<div class="rd"><p class="eyebrow">${esc(cup.plate)} ${CUP_TIES[k]}</p>${rows(cup.low[k - 1])}</div>`);
  }
  return out.join('');
}
function renderCareerTable() {
  const cr = career, c = cr.season, T = c.teams;
  $('cl-cup').innerHTML = cr.cup ? careerCupHtml(cr.cup) : ''; $('cl-cup').hidden = !cr.cup || !cr.cup.tie;
  $('cl-eyebrow').textContent = careerEyebrow(cr);
  $('cl-table').innerHTML = careerTableRows(cr);
  $('cl-results').innerHTML = c.results.map((rd, k) => ({ rd, k })).reverse().map(({ rd, k }) => `<div class="rd"><p class="eyebrow">Round ${k + 1}</p>${rd.map(r => {
    const mine = r.h === c.user || r.a === c.user;
    return `<div class="res${mine ? ' me' : ''}"><span class="h">${esc(T[r.h].name)}</span><span class="sc">${r.hs} – ${r.as}</span><span>${esc(T[r.a].name)}</span></div>`;
  }).join('')}</div>`).join('');
}
$('cl-back').addEventListener('click', careerOpen);

/* ---------- the season's end, and the end of the career ---------- */
function careerTile(label, value, extra) { return `<div class="cr-tile"><span class="lbl" data-fit>${label}</span>${extra || ''}<b data-fit>${value}</b></div>`; }
function renderCareerEnd() {
  const cr = career, c = cr.season, out = careerOutcome(cr), team = c.teams[c.user];
  const title = $('ce-title'), body = $('ce-body'), act = $('ce-act');
  $('ce-shirt').innerHTML = careerShirt(team, cr.num, 'big');
  if (out.final) {                                   // the International season is the last: the honours
    const best = CAREER_STAGES.map((st, i) => {
      if (st.festival) return '';                    // a festival has no table to have a place in
      const places = cr.history.filter(h => h.stage === i).map(h => h.place).concat(i === cr.stage ? [out.place] : []);
      return places.length ? careerTile(st.name, ordinal(Math.min(...places))) : '';
    }).filter(Boolean);
    const titles = cr.history.filter(h => h.place === 1 && !CAREER_STAGES[h.stage].festival).length + (out.place === 1 ? 1 : 0);
    $('ce-eyebrow').textContent = (cr.name ? cr.name + ' · ' : '') + careerPosWord(cr.pos) + ' · No. ' + cr.num;
    title.textContent = 'Hall of Fame'; title.classList.add('gold');
    $('ce-line').textContent = team.name + ' finish ' + ordinal(out.place);
    body.innerHTML = `<div class="cr-tiles" style="--n:5">${careerTile('Overall', out.ovr)}${careerTile('Seasons', cr.seasons)}${careerTile('Matches', cr.totals.matches)}${careerTile('Tries', cr.totals.tries)}${careerTile('Titles', titles)}</div><div class="cr-tiles cr-best" style="--n:${best.length}">${best.join('')}</div>${cr.trophies && cr.trophies.length ? `<p class="chase cr-cups">Cups: ${cr.trophies.map(t => esc(t.name)).join(' · ')}</p>` : ''}`;
    act.innerHTML = `<button class="btn primary" id="ce-go">Start New Career</button>`;
    careerRestartArmed = false;
    $('ce-go').addEventListener('click', careerRestart);
    return;
  }
  const next = out.promoted ? cr.stage + 1 : cr.stage;
  if (careerFestival(cr)) {                          // no table and no places: what you played, and where you go
    const s = seasonSummary(c), nt = careerTeamFor(cr, next);
    $('ce-eyebrow').textContent = careerEyebrow(cr);
    title.textContent = 'Moved Up'; title.classList.add('gold');
    $('ce-line').textContent = team.name + ' · Festival Done';
    body.innerHTML = `<div class="cr-tiles">${careerTile('Played', s.played)}${careerTile('Tries', s.triesFor)}${careerTile('Next', careerStageName(next), `<span class="cr-next">${jersey(nt)}${fxName(nt, true)}</span>`)}</div>`;
    act.innerHTML = `<button class="btn primary" id="ce-go">Next Season</button>`;
    $('ce-go').addEventListener('click', () => { careerAdvance(); careerOpen(); });
    return;
  }
  $('ce-eyebrow').textContent = careerEyebrow(cr);
  title.textContent = out.place === 1 ? 'Champions' : out.promoted ? (next === 4 ? 'Called Up' : 'Promoted') : 'One More Season';
  title.classList.toggle('gold', out.promoted);
  $('ce-line').textContent = team.name + ' finish ' + ordinal(out.place) + (out.promoted && !out.top ? ' · Overall ' + out.ovr : '');
  const tiles = careerTile('Place', ordinal(out.place)) + careerTile('Overall', out.ovr);
  if (out.promoted && next === 4) {                  // called up: the country is the choice, and the choice starts the season
    body.innerHTML = `<div class="cr-tiles">${tiles}${careerTile('Next', careerStageName(next))}</div><p class="lbl cr-pick">Pick Your Country</p>
      <div class="cr-nations">${nationsRanked(careerFemale(cr) ? 1 : 0).map(t => `<button class="team cr-club" data-n="${t.id}">${jerseyRated(t)}<span class="tid"><span class="tname" data-fit>${esc(t.name)}</span>${teamStars(t)}</span></button>`).join('')}</div>`;
    for (const b of body.querySelectorAll('[data-n]')) b.addEventListener('click', () => { careerAdvance(b.dataset.n); careerOpen(); });
    act.innerHTML = '';
    return;
  }
  const nextTeam = out.promoted ? careerTeamFor(cr, next) : team;
  const cupLine = cr.cup && cr.cup.tie >= CUP_AT.length ? `<p class="chase cr-cups">${esc(cr.cup.name)}: ${esc(cupResult(cr.cup))}</p>` : '';
  body.innerHTML = `<div class="cr-tiles">${tiles}${careerTile(out.promoted ? 'Next' : 'Again', careerStageName(next), `<span class="cr-next">${jersey(nextTeam)}${fxName(nextTeam, true)}</span>`)}</div>${cupLine}`;
  act.innerHTML = `<button class="btn primary" id="ce-go">Next Season</button>`;
  $('ce-go').addEventListener('click', () => { careerAdvance(); careerOpen(); });
}
/* Start New Career on the Hall of Fame wipes the career and its honours, so it takes a second tap, as Start Fresh does. */
function careerRestart() {
  if (!careerRestartArmed) { careerRestartArmed = true; $('ce-go').textContent = 'Tap Again to Start New Career'; return false; }
  careerRestartArmed = false; careerEnd(); careerNewOpen();
  return true;
}
$('ce-back').addEventListener('click', goHome);

/* the first controller press lands on the screen's main action */
Object.assign(DEFAULT_FOCUS, { 's-career-new':() => $('cn-go'), 's-career':() => $('cr-play'), 's-career-train':() => $('ct-list').querySelector('.btn'), 's-career-end':() => $('ce-go') || $('ce-body').querySelector('.team') });
