/* =========================================================
   Career screens: the new player and his club, the hub, training, the table, and the screen between phases (a season's or a
   cup's end, the call-up, the transfer window). The rules are in src/career.js; nothing here draws a random number except
   through it.
   ========================================================= */
const CAREER_COL = { pace:'#5fb8ff', power:'#ff6b5a', handling:'#5fd38a', kicking:'#ff9f43', stamina:'#c58cff' };   // a colour per skill, always beside its name
/* The trophy row on the player card: a cup per kind he has won, in its metal (TROPHY_METAL, src/cups.js: gold or silver, as in the Trophy
   Cabinet), and how many, in CAREER_KINDS order; each cup's own label names its kind. */
const CAREER_KIND_NAME = { league:'League', euro:'European Cup', world:'World Cup', tour:'Home Nations Tour', triple:'Triple Crown' };
let careerDraft = null, careerResetArmed = false, careerRestartArmed = false;
const careerPosWord = pos => (pos === 'F' ? 'Forward' : 'Back');
function careerShirt(t, num, cls) {                  // the kit with his number on it
  return `<span class="cr-shirt${cls ? ' ' + cls : ''}">${jersey(t)}<b>${num}</b></span>`;
}
/* A name too long for its box steps down in size until its longest word fits, as fitNames does on the team cards. Run once the screen shows.
   A label (Forward · No. 1 on the player card at 667 wide) gives up most of its letter spacing first, and may go down to 10px; so may the
   trophy row, whose five kinds in two figures need 11px beside the overall at 667x375. One marked data-fit="wrap" (a transfer offer's
   league) that is still too wide at its smallest goes on two lines or more at its own size instead, a word never broken. A side's name
   in the fixture also steps down while it runs to three lines (South Africa Women, London North Women at 667x375, and the hub would
   scroll), to 16px at most: three lines there are no taller than two at the hub's 24px. */
function careerFit(root) {
  for (const el of root.querySelectorAll('[data-fit]')) {
    el.style.fontSize = ''; el.style.letterSpacing = ''; el.style.whiteSpace = '';
    const over = () => el.scrollWidth > el.clientWidth + 0.5, lbl = el.classList.contains('lbl') || el.classList.contains('eyebrow');
    if (lbl && over()) el.style.letterSpacing = '.04em';
    let px = parseFloat(getComputedStyle(el).fontSize) || 20;
    const floor = lbl || el.classList.contains('cr-cab') ? 10 : 12;
    while (over() && px > floor) { px -= 1; el.style.fontSize = px + 'px'; }
    if (over() && el.getAttribute('data-fit') === 'wrap') {
      el.style.whiteSpace = 'normal'; el.style.fontSize = ''; el.style.letterSpacing = ''; px = parseFloat(getComputedStyle(el).fontSize) || 20;
      while (over() && px > floor) { px -= 1; el.style.fontSize = px + 'px'; }
    }
    if (el.parentNode && el.parentNode.classList && el.parentNode.classList.contains('fx-team')) while (careerLines(el) > 2 && px > 16) { px -= 1; el.style.fontSize = px + 'px'; }
  }
}
function careerLines(el) {                           // the lines a name takes: its height against one line's (1 with no layout, as in the tools' DOM)
  const h = el.getBoundingClientRect().height;
  if (!h) return 1;
  const ws = el.style.whiteSpace; el.style.whiteSpace = 'nowrap'; const one = el.getBoundingClientRect().height; el.style.whiteSpace = ws;
  return one ? Math.round(h/one) : 1;
}
function careerShow(id) { showScreen(id); const s = $(id); s.scrollTop = 0; careerFit(s); }
/* The side he plays for in this phase: his club, his country, or the cup's side for him (the touring side on tour). */
function careerTeamNow(cr) {
  if (cr.season) return cr.season.teams[cr.season.user];
  if (cr.cup && Array.isArray(cr.cup.teams) && cr.cup.teams[careerCupUser(cr.cup)]) return cr.cup.teams[careerCupUser(cr.cup)];
  return careerTeamFor(cr);
}
/* Full time in a career cup match, its result in the cup: the full-time card reads the cup's own line (Through to the Final, Test Won ·
   Series 1 – 0: cupBreakLine, src/ui-cups.js) in place of table points, as a cup match in Championship mode does. */
function careerCupCard() { if (M) M.cupResultDone = true; }
/* The eyebrow over the hub, the table and the screen between phases: Bath · Year 2, England · International,
   European Cup · Semi-Final, World Cup · Pool B, Home Nations Tour · Test 2 of 3 (a finished cup: its year). */
function careerEyebrow(cr) {
  const team = careerTeamNow(cr);
  if (cr.phase === 'transfer' || (cr.season && cr.phase === 'league')) return team.name + ' · Year ' + cr.year;
  if (cr.season) return team.name + ' · International';
  const f = careerAhead(cr);
  return CAREER_CUP_NAME[careerCupKind(cr)] + ' · ' + (f && f.label ? f.label : 'Year ' + cr.year);
}
/* A finished phase in a word or two: the championship's own (Champions, Runners-Up, Triple Crown), or a cup's: Winners, or how far he
   went (the cups engine's cupFinish: Runners-Up, Semi-Finalists, Quarter-Finalists, Pool Stage), Knocked Out where a build has no such word. */
function careerResult(cr, out) {
  if (!out) return 'Season Over';
  if (cr.season) return chaseTitle(cr.season, standings(cr.season));
  if (out.kind === 'tour') return out.won ? 'Series Won' : 'Series Lost';
  const K = careerCups();
  return out.won ? 'Winners' : K && K.cupFinish && cr.cup ? K.cupFinish(cr.cup) : 'Knocked Out';
}
/* A cup has no table: the hub's Table button shows the cup's own draw instead (src/ui-cups.js: the last round's card, then the pools,
   the knockouts or the Tests), named for what it shows. Only with the cups' screens in the build: without them Train takes the row. */
const careerDrawOn = cr => !!(cr && !cr.season && cr.cup && careerCups() && careerCups().cupDrawHtml);
const careerDrawName = c => (c.id === 'tour' ? 'Series' : c.id === 'world' && c.round < 3 ? 'Pools' : 'Knockouts');
/* The line under a cup's title on the hub and at its end: the cups' own (Win to Reach the Final, 2nd in Pool B · top two go through,
   Bath win the European Cup), as Championship mode's cup hub has it; nothing without the cups' screens. */
function careerCupLine(cr) { const K = careerCups(); return cr.cup && K && K.cupLine ? K.cupLine(cr.cup) : ''; }
/* The note under Continue Career: Year 2 · Bath · Round 1 of 5, Year 2 · England · Semi-Final, Year 3 · Transfer Window. A phone held
   sideways leaves out the side's name (homeNote), so the note stays one line under its half. */
function careerNote(cr) {
  const team = careerTeamNow(cr), f = careerAhead(cr);
  return 'Year ' + cr.year + ' · ' + team.name + ' · ' + (cr.phase === 'transfer' ? 'Transfer Window' : f ? f.label : careerResult(cr, careerOutcome(cr)));
}
function renderCareerHome() {                       // the home's Career: Continue Career with its note, or New Career
  const b = $('b-career'), note = $('career-note');
  if (!career) { b.textContent = 'New Career'; note.hidden = true; return; }
  b.textContent = 'Continue Career'; homeNote(note, careerNote(career), careerTeamNow(career).name);
}

/* ---------- the new player, and his club ---------- */
/* Your Club is picked on its own screen with the team screen's rows: National | Local, then National's leagues or Local's Surrey and
   My League (while one is saved). The teams you made follow every list (an imported club is one of those), the Super Fan's club first. */
const careerPoolTeams = k => (k === IMPORT_POOL ? importTeams() : (TEAM_LISTS.find(l => l.key === k && l.tier > 0) || TEAM_LISTS.find(l => l.key === 'sur')).teams);
const careerClubList = k => storeFirst([...careerPoolTeams(k), ...custom]);
const careerSame = (a, b) => !!a && !!b && keyOf(a) === keyOf(b) && !a.custom === !b.custom;
function careerNewOpen() {
  const home = myPool() || 'sur', pool = poolTier(home) > 0 ? home : 'sur';
  careerDraft = { club:myClubTeam(), league:pool, pool, nat:poolTier(pool) === 1 ? pool : 'eng', pos:'B', num:CAREER_POS.B[0], numsFor:null, cat:'men', proMode:false };   // My Team's club (the Super Fan's, or Farnham, until one is picked), changed with Change Club; Men first and picked; Whole Team first and picked: Pro Mode is the harder way
  $('cn-name').value = '';
  renderCareerNew(); careerShow('s-career-new');
}
/* The picks change in place, so a controller's ring stays on the button it pressed; the numbers are redrawn only for a new position. */
function renderCareerNew() {
  const d = careerDraft;
  $('cn-mine').innerHTML = `${careerShirt(d.club, d.num)}<span class="cr-mine"><b data-fit>${esc(listName(d.club))}</b><span class="lbl" data-fit>${esc(careerLeagueName(careerLeagueKey(d.league, d.club)))}</span></span>`;
  [...$('cn-cat').children].forEach((b, i) => b.setAttribute('aria-pressed', String((i === 1) === (d.cat === 'women'))));
  [...$('cn-pos').children].forEach((b, i) => b.setAttribute('aria-pressed', String((i === 0) === (d.pos === 'F'))));
  [...$('cn-mode').children].forEach((b, i) => b.setAttribute('aria-pressed', String((i === 1) === d.proMode)));
  if (d.numsFor !== d.pos) {
    d.numsFor = d.pos;
    $('cn-num').innerHTML = CAREER_POS[d.pos].map(n => `<button data-n="${n}">${n}</button>`).join('');
    for (const b of $('cn-num').querySelectorAll('[data-n]')) b.addEventListener('click', () => { careerDraft.num = +b.dataset.n; renderCareerNew(); });
  }
  for (const b of $('cn-num').querySelectorAll('[data-n]')) b.setAttribute('aria-pressed', String(+b.dataset.n === d.num));
}
function careerCatPick(i) { careerDraft.cat = i === 1 ? 'women' : 'men'; renderCareerNew(); }   // Men | Women: the career's teams are named for it (career.js)
[...$('cn-cat').children].forEach((b, i) => b.addEventListener('click', () => careerCatPick(i)));
[...$('cn-pos').children].forEach((b, i) => b.addEventListener('click', () => {
  const pos = i === 0 ? 'F' : 'B';
  if (careerDraft.pos !== pos) { careerDraft.pos = pos; careerDraft.num = CAREER_POS[pos][0]; }
  renderCareerNew();
}));
function careerModePick(i) { careerDraft.proMode = i === 1; renderCareerNew(); }   // Play as Whole Team (0) or My Player (1): Pro Mode (career-pro.js)
[...$('cn-mode').children].forEach((b, i) => b.addEventListener('click', () => careerModePick(i)));
$('cn-name').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
$('cn-go').addEventListener('click', () => {
  const d = careerDraft;
  if (!careerStart({ name:$('cn-name').value, pos:d.pos, num:d.num, club:d.club, league:d.league, cat:d.cat, proMode:d.proMode })) return;
  careerOpen();
});
$('cn-back').addEventListener('click', goHome);
$('cn-change').addEventListener('click', () => careerClubOpen());
function careerClubOpen() { careerDraft.pool = careerDraft.league; renderCareerClubs(); careerShow('s-career-club'); }   // opens on the list his club is on
function renderCareerClubs() {
  const d = careerDraft, pool = d.pool === IMPORT_POOL && !importLeague ? 'sur' : d.pool, tier = poolTier(pool);
  const press = (id, sel, on) => { for (const b of $(id).querySelectorAll(sel)) b.setAttribute('aria-pressed', String(on(b))); };
  press('cc-tier', '[data-tier]', b => +b.dataset.tier === tier);
  $('cc-nat').hidden = tier !== 1; $('cc-loc').hidden = tier !== 2; $('cc-league').hidden = !importLeague;
  for (const id of ['cc-nat', 'cc-loc']) press(id, '[data-pool]', b => b.dataset.pool === pool);
  const clubs = careerClubList(pool);
  $('cc-grid').innerHTML = clubs.map((t, i) => { const on = careerSame(t, d.club);
    return `<button class="team cr-club${on ? ' picked' : ''}" data-i="${i}" aria-pressed="${on}">${jersey(t)}<span class="tname" data-fit>${esc(listName(t))}</span><span class="cr-rate" aria-label="Overall ${overallOf(t)}">${overallOf(t)}</span></button>`; }).join('');
  for (const b of $('cc-grid').querySelectorAll('[data-i]')) b.addEventListener('click', () => careerClubPick(clubs[+b.dataset.i]));
  if (!$('s-career-club').hidden) careerFit($('s-career-club'));
}
function careerClubPick(t) {                         // a club tapped: his, with the list on screen as its league; back to New Player
  const d = careerDraft; if (!t) return;
  d.club = t; d.league = d.pool === IMPORT_POOL && !importLeague ? 'sur' : d.pool;
  renderCareerNew(); careerShow('s-career-new');
}
function careerPoolPick(k) {
  if (k === IMPORT_POOL && !importLeague) return;
  careerDraft.pool = k; if (poolTier(k) === 1) careerDraft.nat = k;
  renderCareerClubs(); $('s-career-club').scrollTop = 0;
}
function careerTierPick(i) { if (poolTier(careerDraft.pool) !== i) careerPoolPick(i === 1 ? careerDraft.nat : 'sur'); }   // National goes back to the league last looked at
{
  const btn = (attr, label, more) => `<button ${attr}${more || ''}>${esc(label)}</button>`;
  $('cc-tier').innerHTML = [1, 2].map(i => btn(`data-tier="${i}"`, TEAM_TIERS[i])).join('');   // National | Local: a club is never a nation
  $('cc-nat').innerHTML = TEAM_LISTS.filter(l => l.tier === 1).map(l => btn(`data-pool="${l.key}"`, l.name)).join('');
  $('cc-loc').innerHTML = TEAM_LISTS.filter(l => l.tier === 2).map(l => btn(`data-pool="${l.key}"`, l.name)).join('') + btn(`data-pool="${IMPORT_POOL}" id="cc-league"`, 'My League', ' hidden');
  for (const b of $('cc-tier').querySelectorAll('[data-tier]')) b.addEventListener('click', () => careerTierPick(+b.dataset.tier));
  for (const id of ['cc-nat', 'cc-loc']) for (const b of $(id).querySelectorAll('[data-pool]')) b.addEventListener('click', () => careerPoolPick(b.dataset.pool));
}
$('cc-back').addEventListener('click', () => { renderCareerNew(); careerShow('s-career-new'); });

/* ---------- the hub ---------- */
function careerOpen() {
  if (!storeGate('career', careerOpen)) return;            // Career is in the Full Game (src/store.js); a career under way stays saved
  if (!career) { careerNewOpen(); return; }
  if (careerRepair(career)) save();                        // a season or a window's offers dropped on load: drawn again now
  if (!careerAhead(career)) { renderCareerEnd(); careerShow('s-career-end'); return; }
  renderCareer(); careerShow('s-career');
}
function careerCardHtml(cr, team) {
  const ovr = careerOverall(cr.skills), g = (careerLast && careerLast.gains) || {};
  return `<div class="cr-id">${careerShirt(team, cr.num)}
      <div class="cr-who"><p class="eyebrow" data-fit>${careerPosWord(cr.pos)} · No. ${cr.num}</p><h3 data-fit>${esc(cr.name || team.name)}</h3>${careerCabinetHtml(cr)}</div>
      <span class="cr-ovr" aria-label="Overall ${ovr}"><b>${ovr}</b><span>Overall</span></span></div>
    <div class="cr-skills">${careerSkills().map(([k, l]) => {
      const v = cr.skills[k];
      return `<div class="cr-sk" style="--k:${CAREER_COL[k] || 'var(--chalk)'}"><span class="lbl">${l}</span><span class="bar" aria-hidden="true"><i style="width:${v}%"></i></span><b>${v}</b>${g[k] ? `<em>+${g[k]}</em>` : '<em></em>'}</div>`;
    }).join('')}</div>
    <div class="cr-traits">${careerTraitChips(cr)}</div>`;
}
/* His trophies, counted by kind under his name: a cup in the kind's metal and the number, only the kinds he has won, each named in words
   for a screen reader (the cup's own label, as an image: European Cup, 1) and a pointer (its title), in a group named Trophies. */
function careerCabinetHtml(cr) {
  const n = k => (cr.trophies || []).filter(t => t.kind === k).length, have = CAREER_KINDS.filter(n);
  if (!have.length) return '';
  return `<p class="cr-cab" data-fit role="group" aria-label="Trophies">${have.map(k => `<span class="cr-cup" data-kind="${k}" data-metal="${trophyMetal(k)}" role="img" aria-label="${CAREER_KIND_NAME[k]}, ${n(k)}" title="${CAREER_KIND_NAME[k]}"><i></i><b>${n(k)}</b></span>`).join('')}</p>`;
}
/* His star traits (src/traits.js), in TRAITS order: one he has in its skill's colour; a locked one dimmed, with the skill and the number it needs. */
function careerTraitChips(cr) {
  const label = Object.fromEntries(careerSkills()), have = careerTraitIds(cr);
  return TRAITS.map(tr => {
    const on = have.includes(tr.id), need = (label[tr.skill] || tr.skill) + ' ' + tr.unlock;
    return `<span class="cr-trait${on ? '' : ' off'}" style="--k:${CAREER_COL[tr.skill] || 'var(--chalk)'}"${on ? '' : ` aria-label="${tr.name}, ${need}"`}><b data-fit>${tr.name}</b>${on ? '' : `<span>${tr.unlock}</span>`}</span>`;   // locked: the name, dimmed, and the number its skill (the chip's colour) must reach; the label says both
  }).join('');
}
function careerFixtureHtml(f) {
  const T = f.teams, h = f.home, a = f.away;
  return `<div class="fixture"><span class="fx-team">${jersey(T[h])}<span data-fit>${esc(T[h].name)}</span></span><span class="fx-v">V</span><span class="fx-team r"><span data-fit>${esc(T[a].name)}</span>${jersey(T[a])}</span></div>`;
}
const careerLine = cr => (cr.season && cr.season.round ? ordinal(careerPlace(cr.season)) : '');   // his place in the table, once a round is played
function careerGainText(g) { return careerSkills().filter(([k]) => g[k]).map(([k, l]) => '+' + g[k] + ' ' + l).join(' · '); }
function renderCareer() {
  const cr = career, f = careerAhead(cr), team = f.teams[f.user], cup = !cr.season;
  $('cr-card').innerHTML = careerCardHtml(cr, team);
  $('cr-eyebrow').textContent = careerEyebrow(cr);
  $('cr-title').textContent = cup ? 'Year ' + cr.year : f.label;
  $('cr-line').textContent = cup ? careerCupLine(cr) : careerLine(cr); $('cr-line').hidden = !$('cr-line').textContent;
  const gain = careerLast ? careerGainText(careerLast.gains) : '';
  $('cr-gain').textContent = gain; $('cr-gain').hidden = !gain;
  $('cr-next').innerHTML = careerFixtureHtml(f);
  const can = careerCanTrain(cr) && careerDrills(cr).length > 0;
  $('cr-train').textContent = cr.trained ? 'Trained' : 'Train'; $('cr-train').disabled = !can;
  const draw = careerDrawOn(cr);                     // a cup's Table is its draw; without the cups' screens, Train takes the row
  $('cr-table').textContent = draw ? careerDrawName(cr.cup) : 'Table';
  $('cr-table').hidden = cup && !draw; $('cr-trow').classList.toggle('one', cup && !draw);
  $('cr-reset').textContent = 'Start Fresh'; careerResetArmed = false;
  careerLifeRender(cr);                              // the bars on the card, and this round's dilemma (src/career-life.js)
}
$('b-career').addEventListener('click', () => { ac(); careerOpen(); });
$('cr-play').addEventListener('click', () => { careerLast = null; careerPlay(); });
$('cr-train').addEventListener('click', () => { if (careerCanTrain(career)) { renderCareerTrain(); careerShow('s-career-train'); } });
$('cr-table').addEventListener('click', () => {
  if (careerDrawOn(career)) { renderCareerDraw(); careerShow('s-career-draw'); return; }   // a cup's Table is its draw
  if (!career.season) return; renderCareerTable(); careerShow('s-career-table');
});
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
  const c = cr.season, T = c.teams;
  return standings(c).map((r, n) => `
    <tr class="${r.i === c.user ? 'me' : ''}">
      <td class="rk">${c.round ? n + 1 : '–'}</td>
      <td class="t"><span class="chip" style="--k:${HEX.test(T[r.i].kit) ? T[r.i].kit : '#888888'}"></span>${esc(T[r.i].name)}</td>
      <td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.PD > 0 ? '+' : ''}${r.PD}</td><td>${r.BP}</td><td class="pts">${r.Pts}</td>
    </tr>`).join('');
}
function renderCareerTable() {
  const cr = career, c = cr.season, T = c.teams;
  $('cl-eyebrow').textContent = careerEyebrow(cr);
  $('cl-table').innerHTML = careerTableRows(cr);
  $('cl-results').innerHTML = c.results.map((rd, k) => ({ rd, k })).reverse().map(({ rd, k }) => `<div class="rd"><p class="eyebrow">Round ${k + 1}</p>${rd.map(r => {
    const mine = r.h === c.user || r.a === c.user;
    return `<div class="res${mine ? ' me' : ''}"><span class="h">${esc(T[r.h].name)}</span><span class="sc">${r.hs} – ${r.as}</span><span>${esc(T[r.a].name)}</span></div>`;
  }).join('')}</div>`).join('');
}
$('cl-back').addEventListener('click', careerOpen);
/* A cup's draw, laid out as Championship mode's cup hub (src/ui-cups.js): the stage, its line and the last round's card on the left with
   Back to Career, the pools, the knockouts or the Tests on the right. */
function renderCareerDraw() {
  const cr = career, K = careerCups(), c = cr.cup;
  $('cd-eyebrow').textContent = careerEyebrow(cr);
  $('cd-title').textContent = careerDrawName(c);
  $('cd-line').textContent = careerCupLine(cr); $('cd-line').hidden = !$('cd-line').textContent;
  $('cd-last').innerHTML = K.cupLastHtml(c); $('cd-last').hidden = !$('cd-last').innerHTML;
  $('cd-draw').innerHTML = K.cupDrawHtml(c, 'cd');
  if (K.cupDrawBind) K.cupDrawBind(c, 'cd', 'cd-draw');   // a World Cup's knockouts: its own Pools | Bracket swap
}
$('cd-back').addEventListener('click', careerOpen);

/* ---------- between phases: a season's or a cup's end, the call-up, the transfer window ---------- */
function careerTile(label, value, extra) { return `<div class="cr-tile"><span class="lbl" data-fit>${label}</span>${extra || ''}<b data-fit>${value}</b></div>`; }
const careerNextName = next => (next.phase === 'cup' ? 'European Cup' : next.phase === 'tour' ? 'Home Nations Tour' : next.phase === 'transfer' ? 'Transfers' : next.kind === 'world' ? 'World Cup' : 'International');
function careerNextTile(cr, next) {                  // what comes next, with the side he plays it for where it is known
  const side = next.phase === 'cup' ? careerTeamFor(cr, 'league') : next.phase === 'intl' && cr.country ? careerTeamFor(cr, 'intl') : null;
  return careerTile('Next', careerNextName(next), side ? `<span class="cr-next">${jersey(side)}<span data-fit>${esc(side.name)}</span></span>` : '');
}
function renderCareerEnd() {
  const cr = career, title = $('ce-title'), body = $('ce-body'), act = $('ce-act');
  careerRestartArmed = false; $('ce-new').textContent = 'Start New Career';
  if (cr.phase === 'transfer') { renderCareerMove(); return; }
  const out = careerOutcome(cr), team = careerTeamNow(cr);
  if (!out) return;                                  // careerOpen puts right a phase with nothing to show before it gets here
  const next = out.next, first = next.phase === 'intl' && next.first;
  $('ce-shirt').innerHTML = careerShirt(team, cr.num, 'big');
  $('ce-eyebrow').textContent = careerEyebrow(cr);
  title.textContent = first ? 'Called Up' : careerResult(cr, out);
  title.classList.toggle('gold', first || out.won || out.triple);
  $('ce-line').textContent = out.place ? team.name + ' finish ' + ordinal(out.place) : careerCupLine(cr);   // a cup's: who won it (Bath win the European Cup)
  const tiles = (out.place ? careerTile('Place', ordinal(out.place)) : '') + careerTile('Overall', out.ovr) + careerNextTile(cr, next);
  body.innerHTML = first ? '' : `<div class="cr-tiles" style="--n:${out.place ? 3 : 2}">${tiles}</div>`;
  if (first) {                                       // his first call-up: the country is the choice, and the choice starts the window (no tiles: Called Up and the twelve fill the screen)
    body.innerHTML += `<p class="lbl cr-pick">Pick Your Country</p>
      <div class="cr-nations">${careerNations(careerCat(cr)).map(t => `<button class="team cr-club" data-n="${t.id}">${jersey(t)}<span class="tname" data-fit>${esc(listName(t))}</span></button>`).join('')}</div>`;
    for (const b of body.querySelectorAll('[data-n]')) b.addEventListener('click', () => { careerAdvance(b.dataset.n); careerOpen(); });
    act.innerHTML = '';
    return;
  }
  act.innerHTML = `<button class="btn primary" id="ce-go">Continue</button>`;
  $('ce-go').addEventListener('click', () => { careerAdvance(); careerOpen(); });
}
/* The transfer window: each offer a club's card (its kit, name, rating and league), and his own club's card to Stay, in equal parts. */
function careerOfferHtml(t, id, lbl) {
  return `<button class="team cr-offer${id ? '' : ' stay'}" data-sign="${id}">${jersey(t).replace(/<\/span>$/, `<span class="ovr" aria-label="Overall ${overallOf(t)}">${overallOf(t)}</span></span>`)}<span class="tname" data-fit>${esc(listName(t))}</span><span class="lbl" data-fit="wrap">${esc(lbl)}</span></button>`;
}
function renderCareerMove() {
  const cr = career, team = careerTeamFor(cr, 'league'), cat = careerCat(cr), body = $('ce-body');
  $('ce-shirt').innerHTML = careerShirt(team, cr.num, 'big');
  $('ce-eyebrow').textContent = careerEyebrow(cr);
  $('ce-title').textContent = 'Transfer Window'; $('ce-title').classList.remove('gold');
  $('ce-line').textContent = 'Overall ' + careerOverall(cr.skills);
  const offers = (cr.offers || []).map(careerClubById).filter(Boolean);
  body.innerHTML = `<div class="cr-offers" style="--n:${offers.length + 1}">${offers.map(t => careerOfferHtml(catSide(t, cat), t.id, careerLeagueName(careerListOf(t).key))).join('')}${careerOfferHtml(team, '', 'Stay')}</div>`;
  for (const b of body.querySelectorAll('[data-sign]')) b.addEventListener('click', () => { careerSign(b.dataset.sign); careerOpen(); });
  $('ce-act').innerHTML = '';
}
/* Start New Career wipes the career and its trophies, so it takes a second tap, as Start Fresh does. */
function careerRestart() {
  if (!careerRestartArmed) { careerRestartArmed = true; confirmArm(); $('ce-new').textContent = 'Tap Again to Start New Career'; return false; }
  if (confirmSoon()) return false;
  careerRestartArmed = false; careerEnd(); careerNewOpen();
  return true;
}
$('ce-new').addEventListener('click', careerRestart);
$('ce-back').addEventListener('click', goHome);

/* the first controller press lands on the screen's main action: his own club on the club screen, Stay in the transfer window (a
   mashed button never signs him anywhere), the first country at a call-up */
Object.assign(DEFAULT_FOCUS, { 's-career-draw':() => $('cd-back'), 's-career-new':() => $('cn-go'), 's-career-club':() => $('cc-grid').querySelector('.picked') || $('cc-grid').querySelector('.team'), 's-career':() => $('cr-play'), 's-career-train':() => $('ct-list').querySelector('.btn'), 's-career-end':() => $('ce-go') || $('ce-body').querySelector('.stay') || $('ce-body').querySelector('.team') });
