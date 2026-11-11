/* =========================================================
   The profile: who is playing (the owner, 2026-11-11: "Profile setup for a new user? Allows them to create the avatar, gender
   (male/female/na), club and set age group (mini, junior, adult)"). Three answers and a look, kept on this device only, in the save's
   own profile field (cleanProfile): the age group, the gender and the player's look. The club is My Team's, as ever (settings.myClub
   and myNat). No name and nothing else is asked.

   First launch only (profileFirst: no save at all, never a save that exists, the demo, the tools or the app's copy of a save put back):
   a short setup before the home, one step a screen, each with Skip and Back (none on the first, which has nothing before it), and Done
   at the end: Age Group, Gender, Club (the team screen in its one-side mode, pickMode 'setup': the whole ladder, Mine and Favourites,
   clubs only) and Your Look (New Player's builder: src/ui-career.js, lookFor 'setup'). Nothing is set until it ends, so a step skipped,
   or every step, keeps the game's own defaults. Everyone else, and anyone later, reaches the same answers on My
   Profile, from Change in My Team's box: the age group and gender as rows, Change Look, and My Team's Change, its old job, one press on.

   What an answer sets (profileCat, profileLevel), once, when it is given: nothing locks, and the Men | Women | Minis switch, the level
   and My Team stay changeable as ever without rewriting the age group or the gender.
   - Mini: the Kids level (as the Kids button does) and Minis, the mixed side. Junior: Easy, the Kids level off. Adult: Normal, off.
     Junior and Adult play Men for Male and Not Say, Women for Female. Not Say is mixed wherever the game is (Minis, through
     MIXED_THROUGH), otherwise Men. An answer left blank keeps the side as it is (profileCat): a gender alone never moves a side off
     Minis, an age group alone never moves one between Men and Women. Leaving the Kids level from here asks the grown-up check first,
     as the Difficulty row does. A row already chosen, pressed again on My Profile, sets nothing again.
   - Club: My Team's club, and My Team's country from the club's where the ladder knows it (an England club, England), else as it was.
   - Gender: Career's New Player starts on Men or Women by it (Not Say follows the category), on the profile's look.
   - The look: build, skin, hair colour and hair style; the body by the gender, or picked on Your Look for Not Say. It stands in My
     Team's box on the home in My Team's kit (profileHomePic), and in every match you play, Quick Match, Championship and the cups,
     one man of your side wears it (profileYou: the fly-half, No. 5). A career keeps its own player. Never AI v AI, the demo, Two
     Player or a tool's match. Drawing only (lookOf, src/looks.js): no random number and nothing in a match moves for it. His face,
     skin and hair always; his body follows the side, so a men's side never draws a female body nor a women's side a male one, bar
     the mixed Minis, where it is his own.
   ========================================================= */
const PROFILE_AGES = [{ id:'mini', name:'Mini', line:'Up to ' + MIXED_THROUGH, k:'#5fd38a', h:0.66 }, { id:'junior', name:'Junior', line:(MIXED_THROUGH + 1) + ' to 17', k:'#5fb8ff', h:0.83 }, { id:'adult', name:'Adult', line:'18 and Over', k:'#ff9f43', h:1 }];   // the Mini band is the mixed one (MIXED_THROUGH, data.js), so the two never part
const PROFILE_GENDERS = [{ id:'male', name:'Male', k:'#4fd1c5' }, { id:'female', name:'Female', k:'#ff8466' }, { id:'na', name:'Not Say', k:'#c58cff' }];   // colours of their own, none an age group's, so no card seems to belong with one on the step before
const PROFILE_BODIES = ['Male', 'Female'];                 // Your Look's Body row, for Not Say (or no gender): look.g 0 or 1
const PROFILE_NUM = 5;                                      // the shirt that wears your look in a match: the fly-half, at the heart of the play (traits.js names the sevens shirts)
const PROFILE_STEPS = [{ id:'age', title:'Age Group' }, { id:'gender', title:'Gender' }, { id:'club', title:'Pick Your Club' }, { id:'look', title:'Your Look' }];
const profileKnows = (list, v) => list.some(o => o.id === v);
/* A look as the profile keeps it: careerLook's (src/career.js) fields and checks, the body by the gender (Not Say, or none: its own,
   Male unless it says Female). */
function profileLookClean(l, gender) {
  const c = l && typeof l === 'object' && !Array.isArray(l) ? cleanLook(l) : {};
  const g = gender === 'female' ? 1 : gender === 'male' ? 0 : c.g === 1 ? 1 : 0;
  return { ...careerLook(l, g ? 'women' : 'men'), g };
}
/* The save's profile field, read back: each answer one the game knows or null, the look checked; anything else dropped. */
function cleanProfile(p) {
  const out = { age:null, gender:null, look:null };
  if (!p || typeof p !== 'object' || Array.isArray(p)) return out;
  if (profileKnows(PROFILE_AGES, p.age)) out.age = p.age;
  if (profileKnows(PROFILE_GENDERS, p.gender)) out.gender = p.gender;
  if (p.look && typeof p.look === 'object' && !Array.isArray(p.look)) out.look = profileLookClean(p.look, out.gender);
  return out;
}
const profileSaved = () => (profile.age || profile.gender || profile.look ? { age:profile.age, gender:profile.gender, look:profile.look ? { ...profile.look } : null } : undefined);   // saved only once something is set
/* The category an answer gives: Minis for a Mini (mixed, whoever plays), else Women for Female and Men for Male and Not Say; null with
   neither known. An answer missing keeps the side the player is on (cur, settings.cat), so a category picked is never overwritten by a
   question left blank: with no age group, Minis stays Minis (they are mixed, so a gender alone never moves a side off them, nor brings
   Contact Games back); with no gender, a Junior or an Adult keeps Men or Women, and only Minis moves (to Men). A first launch starts on
   Men, so there a step skipped plays Men, as the table in README's Profile says. */
function profileCat(age, gender, cur) {
  if (age === 'mini') return 'minis';
  if (!age && !gender) return null;
  if (!age && cur === 'minis') return 'minis';
  if (gender) return gender === 'female' ? 'women' : 'men';
  return cur === 'women' ? 'women' : 'men';
}
const profileLevel = age => (age === 'mini' ? 0 : age === 'junior' ? 1 : age === 'adult' ? 2 : null);   // the Difficulty row's button: Kids | Easy | Normal (kidsSegSet, kids.js)
/* An age group and a gender given: the level and the category they set, then then(). Leaving the Kids level asks a grown-up first (the
   Difficulty row's own rule); a cancelled check sets nothing. */
function profileSet(age, gender, o) {
  const lvl = o && o.level === false ? null : profileLevel(age), cat = profileCat(age, gender, settings.cat);
  const go = () => {
    if (lvl != null) kidsSegSet(lvl);
    if (cat) settings.cat = cat;
    profile.age = age; profile.gender = gender;
    if (profile.look) profile.look = profileLookClean(profile.look, gender);   // the body follows a gender given
    save();
    if (o && o.then) o.then(true);
  };
  if (lvl != null && lvl !== 0 && kidsLevel()) parentGate(go, () => { if (o && o.then) o.then(false); });
  else go();
}
/* The club's country, where the ladder knows it: its group's (pickHome), else its list's. null for a team you made, My League's sides and
   anything else, which leave My Team's country as it was. */
function profileNatOf(t, group) {
  if (!t || t.custom || isNation(t)) return null;
  const at = group && group.home && NATIONS.some(n => n.id === group.home) ? group.home : null;
  if (at) return at;
  const l = TEAM_LISTS.find(x => x.tier > 0 && x.teams.includes(t)), id = l ? pickHome(l.key, t) : null;
  return id && NATIONS.some(n => n.id === id) ? id : null;
}
/* Career's New Player starts here: Men or Women by the gender (Not Say follows the category: Women only where it is Women), on the
   profile's look with the career's body. */
/* A look to start from where there is none: the default, on the gender's body, a Long Bob on a female one (it reads as hers from the front,
   where Short would not). */
function profileLookStart(gender) { const g = gender === 'female' ? 1 : 0; return { ...CAREER_LOOK, g, style:g ? 11 : CAREER_LOOK.style }; }
function profileCareerCat() {
  const g = profile.gender;
  return g === 'female' || (g === 'na' && settings.cat === 'women') ? 'women' : 'men';
}
function profileCareerLook(cat) { return { ...(profile.look ? careerLook(profile.look, cat) : CAREER_LOOK), g:cat === 'women' ? 1 : 0 }; }

/* ---------- your player in a match ---------- */
/* startMatch asks this once the match is made (src/ui-match.js): the man of your side who wears your look, or null. A match you play
   against the computer only (never Two Player, AI v AI, the demo, a drill or a tool's match, which never come through startMatch with a
   human side), and never a career's, whose side brings its own player (its squad). His face, skin and hair are yours; the body is the
   side's: 0 on a men's side, 1 on a women's, yours on a mixed one (Minis). Read by lookOf (src/looks.js) only, so it is drawing and
   nothing else. */
function profileYou() {
  if (!M || !profile.look || M.two || M.auto || M.demo || practice) return null;
  const t = M.side.findIndex(s => s.human), nat = t >= 0 ? M.nat[t] : null;
  if (!nat || Array.isArray(nat.squad)) return null;
  const side = teamSide(nat), L = profile.look;
  return { team:t, n:PROFILE_NUM, look:{ skin:L.skin, hair:L.hair, style:L.style, b:L.b, g:side === 'mixed' ? L.g : side === 1 ? 1 : 0 } };
}

/* ---------- the pictures ---------- */
/* A figure for a card, in the card's colour: a player at an age group's height, or the two hair styles for the genders (Not Say: both). */
function profileFigure(x, s, hair) {
  const hairs = { short:'M-7 -54 Q-6 -62 0 -62 Q6 -62 7 -54 Q3 -57 0 -57 Q-3 -57 -7 -54Z', tail:'M-7 -54 Q-6 -62 0 -62 Q6 -62 7 -54 Q3 -57 0 -57 Q-3 -57 -7 -54Z M5 -58 Q15 -56 12 -42 Q10 -49 6 -51Z' };
  return `<g transform="translate(${x} 64) scale(${s})"><circle cx="0" cy="-52" r="7"/><path d="${hairs[hair]}"/><path d="M-10 -42 Q0 -45 10 -42 L18 -33 L13 -28 L9 -32 L9 -19 L-9 -19 L-9 -32 L-13 -28 L-18 -33Z"/><path d="M-9 -20 H9 L10 -11 H2 L0 -14 L-2 -11 H-10Z"/><path d="M-8 -12 h5 v11 h-5z M3 -12 h5 v11 h-5z"/></g>`;
}
function profilePic(kind, o) {
  const body = kind === 'age' ? profileFigure(24, o.h, 'short') : o.id === 'na' ? profileFigure(14, 0.78, 'short') + profileFigure(35, 0.78, 'tail') : profileFigure(24, 1, o.id === 'female' ? 'tail' : 'short');
  return `<svg viewBox="0 0 48 66" aria-hidden="true">${body}</svg>`;
}
/* Your player standing in kit t (the art's picture, artPreview), into canvas cv; false while the art is not in, or with no look. */
function profileDraw(cv, t, look) {
  if (!cv || !look || !t || typeof artPreview !== 'function' || typeof cv.getContext !== 'function') return false;
  try { return !!artPreview(cv, t, look); } catch (e) { return false; }
}
/* My Team's box on the home (myHome, src/ui-menus.js): your player in My Team's kit in place of its shirt, once there is a look and the
   art is in; the shirt as before otherwise. */
function profileHomePic(c) {
  const sh = $('my-shirt'), ready = !!profile.look && typeof artReady === 'function' && artReady();
  let drawn = false;
  if (ready) {                                             // the picture in the shirt's own tile, so it reads on any kit as the shirt does
    sh.innerHTML = '<canvas class="my-pic" width="68" height="148" aria-hidden="true"></canvas>';   // the art's standing player, cropped close (the preview's 126x158 holds him in 37 to 88 across and 27 to 157 down, a High Ponytail a little higher)
    drawn = profileDraw(sh.querySelector ? sh.querySelector('canvas') : null, c, profile.look);
    if (!drawn) sh.innerHTML = jersey(c);
  }
  sh.classList.toggle('me', drawn);
  return drawn;
}
/* The art came in (artInstall, src/render-art.js): the pictures waiting for it. */
function profileArtIn() {
  if (!profile.look) return;
  if (!$('s-home').hidden && typeof myHome === 'function') myHome();
  if (!$('s-profile').hidden) profileRender();
}

/* ---------- the setup, on a first launch ---------- */
let profileRun = null;                                     // the setup under way: its step (PROFILE_STEPS) and the answers so far, none set until it ends
const profileAuto = () => {                                // a person's first launch: a real page (not the tools' stand-in DOM, which has no body) that no automation drives (navigator.webdriver: Playwright)
  try { return !!(document.body && !(typeof navigator !== 'undefined' && navigator.webdriver)); } catch (e) { return false; }
};
/* boot.js asks this as the game starts: the setup, only with no save at all and only for a person. */
function profileBoot() { if (profileFirst && profileAuto()) profileSetupOpen(); }
function profileSetupOpen() {
  profileRun = { step:0, age:null, gender:null, club:null, nat:null, lookDraft:null, lookBegun:false };
  profileStep(0);
}
const profileSetupCat = () => (profileRun ? profileCat(profileRun.age, profileRun.gender, settings.cat) || settings.cat : settings.cat);   // the team screen's category while it is the setup's Club
const profileSetupClub = () => (profileRun && profileRun.club) || myClubTeam();
function profileStep(i, focus) {
  const R = profileRun; if (!R) return;
  R.step = clamp(i, 0, PROFILE_STEPS.length - 1);
  const st = PROFILE_STEPS[R.step];
  if (st.id === 'club') { openTeams('setup'); profileFocus(null, pickEl(0, 'pick')); return; }   // from the keyboard on the card, so the arrow keys step the clubs and Enter picks (the team screen's own keys)
  if (st.id === 'look') {
    if (!R.lookDraft) R.lookDraft = profileLookStart(R.gender);
    careerLookOpen('setup');
    return;
  }
  const opts = st.id === 'age' ? PROFILE_AGES : PROFILE_GENDERS, now = R[st.id];
  $('su-step').innerHTML = profileDots(R.step);
  $('su-title').textContent = st.title;
  $('su-back').disabled = !R.step;                       // nothing before the first step: its slot kept empty (the title stands where it does on every step), and Skip the one way on
  $('su-opts').innerHTML = opts.map(o => `<button class="btn su-opt" data-v="${o.id}" aria-pressed="${o.id === now}" style="--k:${o.k}"><span class="su-pic">${profilePic(st.id, o)}</span><span class="su-word">${esc(o.name)}</span>${o.line ? `<span class="su-line">${esc(o.line)}</span>` : ''}</button>`).join('');
  for (const b of $('su-opts').querySelectorAll('[data-v]')) b.addEventListener('click', () => profileAnswer(b.dataset.v));
  showScreen('s-setup'); $('s-setup').scrollTop = 0;
  profileFocus($('s-setup'), focus || DEFAULT_FOCUS['s-setup']());
}
/* Where the setup is: a short bar a step, the steps done dimmer, this one bright, the rest faint; read out as 2 of 4. A picture, not the
   words of a lesson (the game's own rule for what a child reads: tools/training.mjs). */
function profileDots(i) {
  return `<span class="su-dots" role="img" aria-label="${i + 1} of ${PROFILE_STEPS.length}">${PROFILE_STEPS.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'on' : ''}"></i>`).join('')}</span>`;
}
/* A screen of the profile's shown: the keyboard's focus on its first choice where the keyboard was used last (a controller's ring too, where
   it was the controller), else on the screen itself, so the arrow keys work from the start and nothing looks chosen for a finger. */
function profileFocus(scr, to) {
  const dev = typeof lastDev !== 'undefined' ? lastDev : 'touch';
  if (to && dev !== 'touch' && typeof to.focus === 'function') { to.focus({ preventScroll:true }); if (dev === 'pad') setFocus(to); return; }
  if (scr && typeof scr.focus === 'function') scr.focus({ preventScroll:true });
}
DEFAULT_FOCUS['s-setup'] = () => ($('su-opts').querySelector && ($('su-opts').querySelector('[aria-pressed="true"]') || $('su-opts').querySelector('[data-v]'))) || $('su-skip');
function profileAnswer(v) {
  const R = profileRun; if (!R) return;
  const st = PROFILE_STEPS[R.step];
  if (st.id === 'age' && profileKnows(PROFILE_AGES, v)) R.age = v;
  else if (st.id === 'gender' && profileKnows(PROFILE_GENDERS, v)) { if (R.lookDraft && R.gender !== v) R.lookDraft = profileLookClean(R.lookDraft, v); R.gender = v; }
  else return;
  profileStep(R.step + 1);
}
function profileSkip() {                                   // this step left unanswered: what it would set stays as it was
  const R = profileRun; if (!R) return;
  const st = PROFILE_STEPS[R.step];
  if (st.id === 'look') { profileSetupEnd(!!R.lookBegun); return; }   // a look begun is never thrown away (Skip is not shown once it is: profileLookPicked)
  if (st.id === 'club') { R.club = null; R.nat = null; }
  else R[st.id] = null;
  profileStep(R.step + 1);
}
function profileBack() {                                   // the step before, its answer kept; none before the first
  const R = profileRun; if (!R || !R.step) return;
  profileStep(R.step - 1, null);
}
/* The setup's Club (the team screen, pickMode 'setup'): the club picked, its country with it where the ladder knows it, then Your Look. */
function profileClubPick(t, group) {
  const R = profileRun; if (!R || !t || t.act) return;
  R.club = t; R.nat = profileNatOf(t, group);
  profileStep(3);
}
/* Done (withLook) or Skip on Your Look: every answer given is set, then the home. */
function profileSetupEnd(withLook) {
  const R = profileRun; if (!R) return;
  profileRun = null;
  if (R.club) { settings.myClub = keyOf(R.club); if (R.nat) settings.myNat = R.nat; }
  profile.look = withLook && R.lookDraft ? profileLookClean(R.lookDraft, R.gender) : null;
  if (R.age || R.gender) profileSet(R.age, R.gender, { then:() => goHome() });
  else { profile.age = profile.gender = null; save(); goHome(); }
}
$('su-back').addEventListener('click', profileBack);
$('su-skip').addEventListener('click', profileSkip);

/* ---------- My Profile: the same answers, changed one at a time ---------- */
let profileLook = null;                                    // the look Your Look is editing from My Profile, kept as each pick is made
const profileLookDraft = () => (profileRun ? profileRun.lookDraft : profileLook);   // Your Look's look, in its setup and profile modes (src/ui-career.js)
const profileLookClub = () => (profileRun ? profileSetupClub() : myClubTeam());
const profileLookGender = () => (profileRun ? profileRun.gender : profile.gender);
/* A pick on Your Look (src/ui-career.js): on My Profile it is kept at once, as Settings' rows are. In the setup the look is begun, so
   Skip goes from the top and Done (or Back) is the way on: a child who has picked a hair style and then taps Skip keeps it. */
const profileLookBegun = () => !!(profileRun && profileRun.lookBegun);
function profileLookPicked() {
  if (profileRun) { profileRun.lookBegun = true; $('ck-skip').hidden = true; return; }
  if (!profileLook) return;
  profile.look = profileLookClean(profileLook, profile.gender);
  save();
}
function profileOpen(focus) {
  profileRun = null;
  profileRender();
  showScreen('s-profile'); $('s-profile').scrollTop = 0;
  profileFocus($('s-profile'), focus && !focus.hidden ? focus : DEFAULT_FOCUS['s-profile']());
}
DEFAULT_FOCUS['s-profile'] = () => ($('pf-age').querySelector && $('pf-age').querySelector('[aria-pressed="true"]')) || $('pf-back');
function profileRender() {
  const c = myClubTeam(), n = myNatTeam(null), seg = (id, list, now) => {
    const el = $(id);
    if (!el.dataset.built) { el.dataset.built = '1'; el.innerHTML = list.map(o => `<button data-v="${o.id}">${o.line ? `<b>${esc(o.name)}</b><span>${esc(o.line)}</span>` : esc(o.name)}</button>`).join(''); for (const b of el.querySelectorAll ? el.querySelectorAll('[data-v]') : []) b.addEventListener('click', () => (id === 'pf-age' ? profileAge(b.dataset.v) : profileGender(b.dataset.v))); }
    for (const b of el.querySelectorAll ? el.querySelectorAll('[data-v]') : []) b.setAttribute('aria-pressed', String(b.dataset.v === now));
  };
  seg('pf-age', PROFILE_AGES, profile.age);
  seg('pf-gender', PROFILE_GENDERS, profile.gender);
  $('pf-club').innerHTML = `${jersey(c)}<span class="pf-names"><b>${esc(listName(c))}</b><span>${esc(listName(n))}</span></span>`;
  $('pf-team').setAttribute('aria-label', 'Change My Team: ' + listName(c) + ', ' + listName(n));
  const drawn = profileDraw($('pf-cv'), c, profile.look);
  $('pf-cv').hidden = !drawn; $('pf-shirt').hidden = drawn;
  if (!drawn) $('pf-shirt').innerHTML = jersey(c, 'big');
  $('pf-look').textContent = profile.look ? 'Change Look' : 'Make Your Look';
  if (!drawn && profile.look && typeof ART !== 'undefined' && ART.state === 'idle' && typeof artLoad === 'function') artLoad();   // the picture once the art is in (profileArtIn)
}
function profileAge(v) {
  if (!profileKnows(PROFILE_AGES, v) || v === profile.age) return;   // the row already chosen: nothing set again (a level or side moved since stays as it is)
  profileSet(v, profile.gender, { then:() => { profileRender(); renderHome(); } });
}
function profileGender(v) {
  if (!profileKnows(PROFILE_GENDERS, v) || v === profile.gender) return;
  profileSet(profile.age, v, { level:false, then:() => { profileRender(); renderHome(); } });   // the gender moves the category, never the level
}
$('pf-back').addEventListener('click', () => goHome($('b-my')));
$('pf-team').addEventListener('click', () => openTeams('my', null, { from:$('pf-team') }));   // My Team's picker, its old job: the club, then the country; back here after
$('pf-look').addEventListener('click', () => {
  profileLook = profile.look ? profileLookClean(profile.look, profile.gender) : profileLookStart(profile.gender);
  careerLookOpen('profile');
});

/* The arrow keys on the setup and My Profile move the focus to the nearest button that way, as a controller's ring does (navNearest);
   Escape is the screen's Back. Your Look's own, in its setup and profile modes, the same. */
function profileKeys(e) {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || (e.target && e.target.tagName === 'INPUT')) return;
  if (typeof kidsGate !== 'undefined' && kidsGate) return;   // the grown-up check takes every key while it is open (kids.js)
  const layer = e.currentTarget;
  if (e.key === 'Escape') {
    const back = [...(layer.querySelectorAll ? layer.querySelectorAll('[data-back]') : [])].find(b => !b.hidden && !(b.closest && b.closest('[hidden]')));
    if (back) { if (e.preventDefault) e.preventDefault(); back.click(); }
    return;
  }
  const d = { ArrowUp:[0, -1], ArrowDown:[0, 1], ArrowLeft:[-1, 0], ArrowRight:[1, 0] }[e.key];
  if (!d) return;
  const cands = navCands(layer), at = document.activeElement;
  let to = cands.includes(at) ? profileNav(cands, at, d[0], d[1]) : (DEFAULT_FOCUS[layer.id] && DEFAULT_FOCUS[layer.id]()) || cands[0];
  if (e.preventDefault) e.preventDefault();
  if (to && typeof to.focus === 'function') { to.focus(); if (focusEl) setFocus(to); }
}
/* The nearest button that way (navNearest); failing one, the nearest anywhere on that side, so Up from the middle card still reaches the
   top row's Back or Skip. The keys and a controller's ring alike (navMove asks it on these screens, src/input-devices.js). */
function profileNav(cands, el, dx, dy) {
  const best = navNearest(cands, el, dx, dy);
  if (best) return best;
  const r0 = el.getBoundingClientRect(), cx = r0.left + r0.width/2, cy = r0.top + r0.height/2;
  let near = null, nd = 1e9;
  for (const c of cands) {
    if (c === el) continue;
    const r = c.getBoundingClientRect(), ex = r.left + r.width/2 - cx, ey = r.top + r.height/2 - cy;
    if (ex*dx + ey*dy <= 8) continue;
    const dd = Math.hypot(ex, ey);
    if (dd < nd) { nd = dd; near = c; }
  }
  return near;
}
for (const id of ['s-setup', 's-profile']) $(id).addEventListener('keydown', profileKeys);
/* The setup's Club is the team screen, which leaves Escape to the browser for one player (input-devices.js): there Escape is its Back,
   to Gender, as on the setup's other steps. Never past a card over it (the team screen's Filter takes Escape first, and closes; the grown-up
   check; the store), nor while a name is typed. */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || e.defaultPrevented || !profileRun || pickMode !== 'setup' || $('s-teams').hidden || navLayer() !== $('s-teams')) return;
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || (e.target && e.target.tagName === 'INPUT')) return;
  if (e.preventDefault) e.preventDefault();
  $('t-sback').click();
});
$('s-career-look').addEventListener('keydown', e => { if (lookFor !== 'career') profileKeys(e); });   // New Player's own Your Look keeps Tab, as ever
