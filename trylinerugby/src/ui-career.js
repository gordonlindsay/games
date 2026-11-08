/* =========================================================
   Career screens: the new player, the hub, training, the table and the season's end.
   The rules are in src/career.js; nothing here draws a random number except through it.
   ========================================================= */
const CAREER_COL = { pace:'#5fb8ff', power:'#ff6b5a', handling:'#5fd38a', kicking:'#ff9f43', stamina:'#c58cff' };   // a colour per skill, always beside its name
let careerDraft = null, careerResetArmed = false, careerRestartArmed = false;
const careerStageName = i => CAREER_STAGES[i].name;
const careerSeasonNo = cr => cr.history.filter(h => h.stage === cr.stage).length + 1;
const careerPosWord = pos => (pos === 'F' ? 'Forward' : 'Back');
function careerShirt(t, num, cls) {                  // the kit with his number on it
  return `<span class="cr-shirt${cls ? ' ' + cls : ''}">${jersey(t)}<b>${num}</b></span>`;
}
/* A name too long for its box steps down in size until its longest word fits, as fitNames does on the team cards. Run once the screen shows.
   A label (International on a narrow Hall of Fame, Forward · No. 1 on the player card at 667 wide) gives up most of its letter spacing
   first, and may go down to 10px. */
function careerFit(root) {
  for (const el of root.querySelectorAll('[data-fit]')) {
    el.style.fontSize = ''; el.style.letterSpacing = '';
    const over = () => el.scrollWidth > el.clientWidth + 0.5, lbl = el.classList.contains('lbl') || el.classList.contains('eyebrow');
    if (lbl && over()) el.style.letterSpacing = '.04em';
    let px = parseFloat(getComputedStyle(el).fontSize) || 20;
    while (over() && px > (lbl ? 10 : 12)) { px -= 1; el.style.fontSize = px + 'px'; }
  }
}
function careerShow(id) { showScreen(id); const s = $(id); s.scrollTop = 0; careerFit(s); }
function careerNote(cr) {
  const c = cr.season, st = careerStageName(cr.stage);
  if (!c) return st;
  if (c.round < 5) return st + ' · ' + c.teams[c.user].name + ' · Round ' + (c.round + 1) + ' of 5';
  return st + ' · ' + (careerOutcome(cr).final ? 'Career Over' : 'Season Over');
}
function renderCareerHome() {
  const b = $('b-career'), note = $('career-note');
  if (!career) { b.textContent = 'Career'; note.hidden = true; return; }
  const c = career.season;
  b.textContent = 'Continue Career'; homeNote(note, careerNote(career), c && c.teams[c.user] ? c.teams[c.user].name : '');
}

/* ---------- the new player ---------- */
const careerClubs = () => storeFirst([...CLUBS, ...custom]);   // the Local list and the teams you made (an imported club is one of those), the Super Fan's club first (src/store.js)
function careerNewOpen() {
  careerDraft = { i:0, pos:'B', num:CAREER_POS.B[0], numsFor:null };
  $('cn-name').value = '';
  $('cn-clubs').innerHTML = careerClubs().map((t, i) => `<button class="team cr-club" data-i="${i}">${jersey(t)}<span class="tname" data-fit>${esc(t.name)}</span></button>`).join('');
  for (const b of $('cn-clubs').querySelectorAll('[data-i]')) b.addEventListener('click', () => { careerDraft.i = +b.dataset.i; renderCareerNew(); });
  renderCareerNew(); careerShow('s-career-new');
}
/* The picks change in place, so a controller's ring stays on the button it pressed; the numbers are redrawn only for a new position. */
function renderCareerNew() {
  const d = careerDraft, clubs = careerClubs();
  if (d.i >= clubs.length) d.i = 0;
  for (const b of $('cn-clubs').querySelectorAll('[data-i]')) { const on = +b.dataset.i === d.i; b.classList.toggle('picked', on); b.setAttribute('aria-pressed', String(on)); }
  [...$('cn-pos').children].forEach((b, i) => b.setAttribute('aria-pressed', String((i === 0) === (d.pos === 'F'))));
  if (d.numsFor !== d.pos) {
    d.numsFor = d.pos;
    $('cn-num').innerHTML = CAREER_POS[d.pos].map(n => `<button data-n="${n}">${n}</button>`).join('');
    for (const b of $('cn-num').querySelectorAll('[data-n]')) b.addEventListener('click', () => { careerDraft.num = +b.dataset.n; renderCareerNew(); });
  }
  for (const b of $('cn-num').querySelectorAll('[data-n]')) b.setAttribute('aria-pressed', String(+b.dataset.n === d.num));
  $('cn-shirt').innerHTML = careerShirt(clubs[d.i], d.num, 'big');
}
[...$('cn-pos').children].forEach((b, i) => b.addEventListener('click', () => {
  const pos = i === 0 ? 'F' : 'B';
  if (careerDraft.pos !== pos) { careerDraft.pos = pos; careerDraft.num = CAREER_POS[pos][0]; }
  renderCareerNew();
}));
$('cn-name').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
$('cn-go').addEventListener('click', () => {
  const d = careerDraft, club = careerClubs()[d.i];
  if (!careerStart({ name:$('cn-name').value, pos:d.pos, num:d.num, club })) return;
  careerOpen();
});
$('cn-back').addEventListener('click', goHome);

/* ---------- the hub ---------- */
function careerOpen() {
  if (!storeGate('career', careerOpen)) return;            // Career is in the Full Game (src/store.js); a career under way stays saved
  if (!career) { careerNewOpen(); return; }
  if (!career.season) { careerNewSeason(career); save(); }   // a broken season was dropped on load: a new draw for the same stage
  if (career.season.round >= 5) { if (careerSettle(career)) save(); renderCareerEnd(); careerShow('s-career-end'); return; }
  renderCareer(); careerShow('s-career');
}
function careerCardHtml(cr, team) {
  const ovr = careerOverall(cr.skills), g = (careerLast && careerLast.gains) || {};
  return `<div class="cr-id">${careerShirt(team, cr.num)}
      <div class="cr-who"><p class="eyebrow" data-fit>${careerPosWord(cr.pos)} · No. ${cr.num}</p><h3 data-fit>${esc(cr.name || team.name)}</h3></div>
      <span class="cr-ovr" aria-label="Overall ${ovr}"><b>${ovr}</b><span>Overall</span></span></div>
    <div class="cr-skills">${careerSkills().map(([k, l]) => {
      const v = cr.skills[k];
      return `<div class="cr-sk" style="--k:${CAREER_COL[k] || 'var(--chalk)'}"><span class="lbl">${l}</span><span class="bar" aria-hidden="true"><i style="width:${v}%"></i></span><b>${v}</b>${g[k] ? `<em>+${g[k]}</em>` : '<em></em>'}</div>`;
    }).join('')}</div>`;
}
function careerFixtureHtml(c) {
  const { pair } = userFixture(c), [h, a] = pair, T = c.teams;
  return `<div class="fixture"><span class="fx-team">${jersey(T[h])}<span data-fit>${esc(T[h].name)}</span></span><span class="fx-v">V</span><span class="fx-team r"><span data-fit>${esc(T[a].name)}</span>${jersey(T[a])}</span></div>`;
}
function careerLine(cr) {
  const c = cr.season, st = CAREER_STAGES[cr.stage];
  const place = c.round ? ordinal(careerPlace(c)) : '';
  const goal = st.bar == null ? '' : 'Top Two or Overall ' + st.bar + ' to Go Up';
  return [place, goal].filter(Boolean).join(' · ');
}
function careerGainText(g) { return careerSkills().filter(([k]) => g[k]).map(([k, l]) => '+' + g[k] + ' ' + l).join(' · '); }
function renderCareer() {
  const cr = career, c = cr.season, team = c.teams[c.user];
  $('cr-card').innerHTML = careerCardHtml(cr, team);
  $('cr-eyebrow').textContent = careerStageName(cr.stage) + ' · Season ' + careerSeasonNo(cr);
  $('cr-title').textContent = 'Round ' + (c.round + 1) + ' of 5';
  $('cr-line').textContent = careerLine(cr); $('cr-line').hidden = !$('cr-line').textContent;
  const gain = careerLast ? careerGainText(careerLast.gains) : '';
  $('cr-gain').textContent = gain; $('cr-gain').hidden = !gain;
  $('cr-next').innerHTML = careerFixtureHtml(c);
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
  if (!careerResetArmed) { careerResetArmed = true; confirmArm(); $('cr-reset').textContent = 'Tap Again to Start Fresh'; return; }
  if (confirmSoon()) return;                               // a quick double tap only asks (CONFIRM, ui-menus.js)
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
}
$('ct-back').addEventListener('click', careerOpen);

/* ---------- the table ---------- */
function careerTableRows(cr) {
  const c = cr.season, T = c.teams, up = CAREER_STAGES[cr.stage].bar != null;
  return standings(c).map((r, n) => `
    <tr class="${r.i === c.user ? 'me' : ''}${up && c.round && n < CAREER_UP ? ' up' : ''}">
      <td class="rk">${c.round ? n + 1 : '–'}</td>
      <td class="t"><span class="chip" style="--k:${HEX.test(T[r.i].kit) ? T[r.i].kit : '#888888'}"></span>${esc(T[r.i].name)}</td>
      <td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.PD > 0 ? '+' : ''}${r.PD}</td><td>${r.BP}</td><td class="pts">${r.Pts}</td>
    </tr>`).join('');
}
function renderCareerTable() {
  const cr = career, c = cr.season, T = c.teams;
  $('cl-eyebrow').textContent = careerStageName(cr.stage) + ' · Season ' + careerSeasonNo(cr);
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
      const places = cr.history.filter(h => h.stage === i).map(h => h.place).concat(i === cr.stage ? [out.place] : []);
      return places.length ? careerTile(st.name, ordinal(Math.min(...places))) : '';
    }).filter(Boolean);
    const titles = cr.history.filter(h => h.place === 1).length + (out.place === 1 ? 1 : 0);
    $('ce-eyebrow').textContent = (cr.name ? cr.name + ' · ' : '') + careerPosWord(cr.pos) + ' · No. ' + cr.num;
    title.textContent = 'Hall of Fame'; title.classList.add('gold');
    $('ce-line').textContent = team.name + ' finish ' + ordinal(out.place);
    body.innerHTML = `<div class="cr-tiles" style="--n:5">${careerTile('Overall', out.ovr)}${careerTile('Seasons', cr.seasons)}${careerTile('Matches', cr.totals.matches)}${careerTile('Tries', cr.totals.tries)}${careerTile('Titles', titles)}</div><div class="cr-tiles cr-best" style="--n:${best.length}">${best.join('')}</div>`;
    act.innerHTML = `<button class="btn primary" id="ce-go">Start New Career</button>`;
    careerRestartArmed = false;
    $('ce-go').addEventListener('click', careerRestart);
    return;
  }
  const next = out.promoted ? cr.stage + 1 : cr.stage;
  $('ce-eyebrow').textContent = careerStageName(cr.stage) + ' · Season ' + careerSeasonNo(cr);
  title.textContent = out.place === 1 ? 'Champions' : out.promoted ? (next === 4 ? 'Called Up' : 'Promoted') : 'One More Season';
  title.classList.toggle('gold', out.promoted);
  $('ce-line').textContent = team.name + ' finish ' + ordinal(out.place) + (out.promoted && !out.top ? ' · Overall ' + out.ovr : '');
  const tiles = careerTile('Place', ordinal(out.place)) + careerTile('Overall', out.ovr);
  if (out.promoted && next === 4) {                  // called up: the country is the choice, and the choice starts the season
    body.innerHTML = `<div class="cr-tiles">${tiles}${careerTile('Next', careerStageName(next))}</div><p class="lbl cr-pick">Pick Your Country</p>
      <div class="cr-nations">${NATIONS.map(t => `<button class="team cr-club" data-n="${t.id}">${jersey(t)}<span class="tname" data-fit>${esc(t.name)}</span></button>`).join('')}</div>`;
    for (const b of body.querySelectorAll('[data-n]')) b.addEventListener('click', () => { careerAdvance(b.dataset.n); careerOpen(); });
    act.innerHTML = '';
    return;
  }
  const nextTeam = out.promoted ? careerTeamFor(cr, next) : team;
  body.innerHTML = `<div class="cr-tiles">${tiles}${careerTile(out.promoted ? 'Next' : 'Again', careerStageName(next), `<span class="cr-next">${jersey(nextTeam)}<span data-fit>${esc(nextTeam.name)}</span></span>`)}</div>`;
  act.innerHTML = `<button class="btn primary" id="ce-go">Next Season</button>`;
  $('ce-go').addEventListener('click', () => { careerAdvance(); careerOpen(); });
}
/* Start New Career on the Hall of Fame wipes the career and its honours, so it takes a second tap, as Start Fresh does. */
function careerRestart() {
  if (!careerRestartArmed) { careerRestartArmed = true; confirmArm(); $('ce-go').textContent = 'Tap Again to Start New Career'; return false; }
  if (confirmSoon()) return false;
  careerRestartArmed = false; careerEnd(); careerNewOpen();
  return true;
}
$('ce-back').addEventListener('click', goHome);

/* the first controller press lands on the screen's main action */
Object.assign(DEFAULT_FOCUS, { 's-career-new':() => $('cn-go'), 's-career':() => $('cr-play'), 's-career-train':() => $('ct-list').querySelector('.btn'), 's-career-end':() => $('ce-go') || $('ce-body').querySelector('.team') });
