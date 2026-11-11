/* =========================================================
   Career screens: the new player and his club, the hub, training, the table, and the screen between phases (a season's or a
   cup's end, the call-up, the transfer window). The rules are in src/career.js; nothing here draws a random number except
   through it.
   ========================================================= */
const CAREER_COL = { pace:'#5fb8ff', power:'#ff6b5a', handling:'#5fd38a', kicking:'#ff9f43', stamina:'#c58cff' };   // a colour per skill, always beside its name
/* The trophy row on the player card: a trophy per kind he has won, in its kind's shape and metal (TROPHY_SHAPE and TROPHY_METAL,
   src/cups.js: a shield, a tankard (a county cup), a cup with big handles, a cup with a ball on top, a plate, a crown; gold or silver, as in the Trophy Cabinet),
   and how many, in CAREER_KINDS order; each trophy's own label names its kind. */
const CAREER_KIND_NAME = { league:'League', county:'County Cup', euro:'European Cup', world:'World Cup', tour:'Home Nations Tour', triple:'Triple Crown' };
let careerDraft = null, careerResetArmed = false, careerRestartArmed = false;
const careerPosWord = pos => (pos === 'F' ? 'Forward' : 'Back');
function careerShirt(t, num, cls) {                  // the kit with his number on it
  return `<span class="cr-shirt${cls ? ' ' + cls : ''}">${jersey(t)}<b>${num}</b></span>`;
}
/* A name too long for its box steps down in size until its longest word fits, as fitNames does on the team cards. Run once the screen shows.
   A label (Forward · No. 1 on the player card at 667 wide) gives up most of its letter spacing first, and may go down to 10px; so may the
   trophy row, whose five kinds in two figures need 11px beside the overall at 667x375 (six, with a county cup, 10px and the row's tight spacing). One marked data-fit="wrap" (a transfer offer's
   league) that is still too wide at its smallest goes on two lines or more at its own size instead, a word never broken. A side's name
   in the fixture also steps down while it runs to three lines (South Africa Women, London North Women at 667x375, and the hub would
   scroll), to 16px at most: three lines there are no taller than two at the hub's 24px. A transfer offer's league still too wide on its
   lines (a word of it wider than its column: Championship, the United Rugby Championship's, beside a shirt in a quarter of 667) takes the
   card's whole width under the shirt, on every card of the window alike (.cr-offers.wide). */
function careerFit(root) {
  const offers = root.classList && root.classList.contains('cr-offers') ? [root] : [...root.querySelectorAll('.cr-offers')];
  for (const o of offers) o.classList.remove('wide');
  careerFitEach(root);
  for (const o of offers) if ([...o.querySelectorAll('.lbl')].some(e => e.scrollWidth > e.clientWidth + 0.5)) { o.classList.add('wide'); careerFitEach(o); }
}
function careerFitEach(root) {
  for (const el of root.querySelectorAll('[data-fit]')) {
    el.style.fontSize = ''; el.style.letterSpacing = ''; el.style.whiteSpace = '';
    const over = () => el.scrollWidth > el.clientWidth + 0.5, lbl = el.classList.contains('lbl') || el.classList.contains('eyebrow');
    if (lbl && over()) el.style.letterSpacing = '.04em';
    let px = parseFloat(getComputedStyle(el).fontSize) || 20;
    const floor = lbl || el.classList.contains('cr-cab') ? 10 : 12;
    while (over() && px > floor) { px -= 1; el.style.fontSize = px + 'px'; }
    if (el.classList.contains('cr-cab')) el.classList.toggle('tight', over());   // six kinds in two figures (a county cup's too) at 667x375: closer together, still one line at 10px
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
  return (cr.cup && cr.cup.id === 'county' && cr.cup.name ? cr.cup.name : CAREER_CUP_NAME[careerCupKind(cr)]) + ' · ' + (f && f.label ? f.label : 'Year ' + cr.year);   // a county cup by its own name: Surrey Shield · Semi-Final
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
/* The home's Career box: Career, and while a career is under way and Continue shows something else, its fixture (Round 2 v Bath, Transfer
   Window: homeCareerFix, src/ui-menus.js), on two lines where the half needs them. My Team's box already names the club. */
function renderCareerHome() {
  const note = $('career-note');
  if (!career || (typeof homeUnder === 'function' && homeUnder() === 'career')) { note.hidden = true; return; }
  homeLine(note, homeCareerFix(career));
}

/* ---------- the new player, and his club ---------- */
/* Your Club is picked on the team screen, in its Career mode (careerClubOpen, below). */
const careerSame = (a, b) => !!a && !!b && keyOf(a) === keyOf(b) && !a.custom === !b.custom;
function careerNewOpen() {
  const home = myPool() || 'sur', pool = poolTier(home) > 0 ? home : 'sur';
  careerDraft = { club:myClubTeam(), league:pool, pool, nat:poolTier(pool) === 1 ? pool : 'eng', pos:'B', num:CAREER_POS.B[0], numsFor:null, cat:'men', proMode:false, look:{ ...CAREER_LOOK } };   // My Team's club (the Super Fan's, or Farnham, until one is picked), changed with Change Club; Men first and picked; Whole Team first and picked: Pro Mode is the harder way; the default look, changed with Change Look
  $('cn-name').value = '';
  renderCareerNew(); careerShow('s-career-new');
}
/* The picks change in place, so a controller's ring stays on the button it pressed; the numbers are redrawn only for a new position. */
function renderCareerNew() {
  const d = careerDraft;
  $('cn-mine').innerHTML = `${careerShirt(d.club, d.num)}<span class="cr-mine"><b data-fit>${esc(listName(d.club))}</b><span class="lbl" data-fit="wrap">${esc(careerLeagueName(careerLeagueKey(d.league, d.club)))}</span></span>`;   // the league, stepped down, then on two lines (United Rugby Championship)
  [...$('cn-cat').children].forEach((b, i) => b.setAttribute('aria-pressed', String((i === 1) === (d.cat === 'women'))));
  [...$('cn-pos').children].forEach((b, i) => b.setAttribute('aria-pressed', String((i === 0) === (d.pos === 'F'))));
  [...$('cn-mode').children].forEach((b, i) => b.setAttribute('aria-pressed', String((i === 1) === d.proMode)));
  if (d.numsFor !== d.pos) {
    d.numsFor = d.pos;
    $('cn-num').innerHTML = CAREER_POS[d.pos].map(n => `<button data-n="${n}">${n}</button>`).join('');
    for (const b of $('cn-num').querySelectorAll('[data-n]')) b.addEventListener('click', () => { careerDraft.num = +b.dataset.n; renderCareerNew(); });
  }
  for (const b of $('cn-num').querySelectorAll('[data-n]')) b.setAttribute('aria-pressed', String(+b.dataset.n === d.num));
  if (!$('s-career-new').hidden) careerFit($('cn-mine'));   // a pick on the screen redraws Your Player: its name steps down again (Bloemfontein at 667x375)
}
function careerCatPick(i) { careerDraft.cat = i === 1 ? 'women' : 'men'; careerDraft.look.g = i === 1 ? 1 : 0; renderCareerNew(); }   // Men | Women: the career's teams are named for it, and it is his body too, PR #14's Male | Female as one control (career.js)
[...$('cn-cat').children].forEach((b, i) => b.addEventListener('click', () => careerCatPick(i)));
[...$('cn-pos').children].forEach((b, i) => b.addEventListener('click', () => {
  const pos = i === 0 ? 'F' : 'B';
  if (careerDraft.pos !== pos) { careerDraft.pos = pos; careerDraft.num = CAREER_POS[pos][0]; }
  renderCareerNew();
}));
function careerModePick(i) { careerDraft.proMode = i === 1; renderCareerNew(); }   // Play as Whole Team (0) or My Player (1): Pro Mode (career-pro.js)
[...$('cn-mode').children].forEach((b, i) => b.addEventListener('click', () => careerModePick(i)));
$('cn-name').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
function careerNewGo() {                            // Start Career: the player as picked, his look included
  const d = careerDraft;
  if (!careerStart({ name:$('cn-name').value, pos:d.pos, num:d.num, club:d.club, league:d.league, cat:d.cat, proMode:d.proMode, look:d.look })) return false;
  careerOpen();
  return true;
}
$('cn-go').addEventListener('click', careerNewGo);
$('cn-back').addEventListener('click', goHome);
$('cn-change').addEventListener('click', () => careerClubOpen());
$('cn-look-go').addEventListener('click', () => careerLookOpen());

/* ---------- his look (PR #14's player builder) ----------
   Change Look opens Your Look, New Player's second step: his picture on the left, standing three-quarters on in his club's kit (the
   rendered art, artPreview; his shirt with his number stands in while the art is not in, or if it never comes), and the pickers: Build
   (Small | Medium | Big, the art's three bodies), Skin and Hair Colour (six swatches each) and Hair Style (all twelve, for either body).
   Male or Female is not here: it is New Player's Team, Men | Women, one control. A pick changes the picture at once, and Back to New
   Player keeps it; Start Career saves it with the career (careerLook validates it). */
const CAREER_SKIN_NAMES = ['Skin 1', 'Skin 2', 'Skin 3', 'Skin 4', 'Skin 5', 'Skin 6'];   // lightest to darkest; a swatch's name, for a screen reader
const CAREER_HAIR_NAMES = ['Black', 'Dark Brown', 'Brown', 'Light Brown', 'Blonde', 'Red'];
function careerLookOpen() {
  renderCareerLook(); careerShow('s-career-look');
  const art = ART.state === 'idle' ? artLoad() : ART.state === 'loading' ? ART.promise : null;   // the real sprite when it can be had
  if (art && art.then) art.then(() => { if (careerDraft && !$('s-career-look').hidden) careerLookShow(); });
}
function careerLookSet(key, v) { careerDraft.look[key] = v; renderCareerLook(); }
function careerLookShow() {                          // the picture: the art when it is in, his shirt when not
  const d = careerDraft, cv = $('ck-pic'), drawn = artPreview(cv, d.club, d.look);
  cv.hidden = !drawn; $('ck-shirt').hidden = drawn;
  if (!drawn) $('ck-shirt').innerHTML = careerShirt(d.club, d.num, 'big');
}
function renderCareerLook() {                        // the picks change in place, so a controller's ring stays on the button it pressed
  const L = careerDraft.look, press = (id, on) => [...$(id).children].forEach((b, i) => b.setAttribute('aria-pressed', String(on(i))));
  press('ck-build', i => CAREER_BUILDS[i] === L.b); press('ck-skin', i => i === L.skin); press('ck-hair', i => i === L.hair); press('ck-style', i => i === L.style);
  careerLookShow();
}
$('ck-skin').innerHTML = LOOK_SKIN.map((h, i) => `<button class="sw" style="--k:${h}" aria-label="${CAREER_SKIN_NAMES[i]}"></button>`).join('');
$('ck-hair').innerHTML = LOOK_HAIR.map((h, i) => `<button class="sw" style="--k:${h}" aria-label="${CAREER_HAIR_NAMES[i]}"></button>`).join('');
for (const [id, key, of] of [['ck-build', 'b', i => CAREER_BUILDS[i]], ['ck-skin', 'skin', i => i], ['ck-hair', 'hair', i => i], ['ck-style', 'style', i => i]])
  [...$(id).children].forEach((b, i) => b.addEventListener('click', () => careerLookSet(key, of(i))));
$('ck-back').addEventListener('click', () => { renderCareerNew(); careerShow('s-career-new'); });
/* The club: the team screen in its Career mode (openTeams('career'), src/ui-menus.js), one side, centred: the ladder's clubs only (no nation,
   no Legend), Made Teams and My League, the Super Fan's club first in its group, opening on his club. Pick takes it, with the group's list
   as its league (Dublin plays the URC), and goes back to New Player; a team you made keeps the league it had. No category there: Men |
   Women is New Player's. */
function careerClubOpen() { openTeams('career'); }
function careerClubPick(t, list) {                   // a club picked: his, with its group's list as its league; back to New Player
  const d = careerDraft; if (!t || !d) return;
  d.club = t;
  if (list === IMPORT_POOL ? !!importLeague : TEAM_LISTS.some(l => l.key === list && l.tier > 0)) d.league = list;
  else if (!t.custom) d.league = careerLeagueKey(d.league, t);
  d.pool = d.league;
  renderCareerNew(); careerShow('s-career-new');
}
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
/* His trophies, counted by kind under his name: the kind's trophy (its shape and metal, by data-kind and data-metal) and the number, only the kinds he has won, each named in words
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
/* Train: the Skill Games as the home shows them, each its picture and name with the skill it trains: the open games in rows
   of four, then Contact Games (U9 and Up) with the coach line (PRACTICE_COACH, src/practice.js) and its three. The youngest never
   see the contact games (careerDrills), so for them there is no group and no coach line. */
function renderCareerTrain() {
  const list = careerDrills(career), hard = list.filter(d => d.contact);
  const tiles = ds => `<div class="cr-drills">${ds.map(d => `<button class="btn cr-drill" data-drill="${d.id}"><span class="dc-icon" aria-hidden="true">${drillIconSvg(d.id)}</span><span class="nm">${esc(d.name).replace(/\S*-\S*/g, w => `<span class="nw">${w}</span>`)}</span><span class="cr-chips">${careerChips(d.skills)}</span></button>`).join('')}</div>`;
  $('ct-list').innerHTML = tiles(list.filter(d => !d.contact))
    + (hard.length ? `<div class="ct-contact"><p class="pr-cg"><span class="pr-group">Contact Games (U9 and Up)</span> <span class="pr-coach">${PRACTICE_COACH}</span></p>${tiles(hard)}</div>` : '');
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
const careerNextName = (next, cr) => (next.phase === 'county' ? (cr && typeof compCupFor === 'function' ? compCupFor(cr.club).name : 'County Cup') : next.phase === 'cup' ? 'European Cup' : next.phase === 'tour' ? 'Home Nations Tour' : next.phase === 'transfer' ? 'Transfers' : next.kind === 'world' ? 'World Cup' : 'International');
function careerNextTile(cr, next) {                  // what comes next, with the side he plays it for where it is known
  const side = next.phase === 'cup' || next.phase === 'county' ? careerTeamFor(cr, 'league') : next.phase === 'intl' && cr.country ? careerTeamFor(cr, 'intl') : null;
  return careerTile('Next', careerNextName(next, cr), side ? `<span class="cr-next">${jersey(side)}<span data-fit>${esc(side.name)}</span></span>` : '');
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
      <div class="cr-nations">${careerNations(careerCat(cr)).map(t => `<button class="team cr-club" data-n="${t.id}">${jersey(t)}<span class="tid"><span class="tname" data-fit>${esc(listName(t))}</span>${ratedStars(t)}</span></button>`).join('')}</div>`;
    for (const b of body.querySelectorAll('[data-n]')) b.addEventListener('click', () => { careerAdvance(b.dataset.n); careerOpen(); });
    act.innerHTML = '';
    return;
  }
  act.innerHTML = `<button class="btn primary" id="ce-go">Continue</button>`;
  $('ce-go').addEventListener('click', () => { careerAdvance(); careerOpen(); });
}
/* The transfer window: each offer a club's card (its kit, name, rating, stars and league), and his own club's card to Stay, in equal parts. */
function careerOfferHtml(t, id, lbl) {
  return `<button class="team cr-offer${id ? '' : ' stay'}" data-sign="${id}">${jerseyRated(t)}<span class="tname" data-fit>${esc(listName(t))}</span>${ratedStars(t)}<span class="lbl" data-fit="wrap">${esc(lbl)}</span></button>`;
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
Object.assign(DEFAULT_FOCUS, { 's-career-draw':() => $('cd-back'), 's-career-new':() => $('cn-go'), 's-career':() => $('cr-play'), 's-career-train':() => $('ct-list').querySelector('.btn'), 's-career-end':() => $('ce-go') || $('ce-body').querySelector('.stay') || $('ce-body').querySelector('.team') });
