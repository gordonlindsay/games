/* =========================================================
   Store screens: the locks, the Unlock card and the Grown-Ups panel (one card, #m-store), the Super Fan badge on the home,
   and the links that leave the game. The rules are in src/store.js.
   - A locked control (Championship and its competitions, Career, Create Team and Edit, Hard, Add Your Team on the home and the team screen, a Legends
     side the Locker has unlocked) keeps its place and its label, with a small
     lock (.locked), and opens the Unlock card instead. A championship or career under way keeps its note: it is saved, only locked.
   - Every purchase, Restore Purchases, Get the App, Privacy and Support goes through the grown-up check (parentGate, src/kids.js)
     first. The card hides while the check is up, as the import card does, so the two never stack.
   - On the web while STORE_WEB_TIER is 'full' (storeLive false) none of it shows and no control changes.
   - A Super Fan's home takes the club's kit colours (storeThemeHome) and shows its shield, or its crest where the club has given one
     with its written permission. Without a Super Fan unlock the home is exactly as it was.
   - The Supporters' Wall (storeWallAsk): for a club whose Super Fan unlock this device owns, from the Locker's Super Fan tile and the
     Grown-Ups panel. The grown-up check, then Are you 18 or over? and How Your Name Appears; Continue opens the grown-up's own mail app
     with the request written out (storeWallMail, src/store.js). The game sends nothing and keeps no name.
   ========================================================= */
const STORE_NAMES = { champ:'Championship', career:'Career', create:'Create Team', hard:'Hard', import:'Add Your Team', legends:'Legends' };
const STORE_LINE = { full:'Career · Championship · International · Create Team · Hard · Legends', fan:'Full Game · Add Your Team · Super Fan Badge' };   // the Full Game's in the store's own order (Career, Championship and International modes)
const STORE_MSG = {
  pending:'Waiting for a grown-up to approve it.',
  failed:'The purchase did not go through.',
  store:'Could not reach the store. Try again later.',
  restored:'Purchases restored.',
  none:'No purchases to restore.',
  same:'Purchases are up to date.',
  kids:'Kids level is back to the start.',
  easy:'Difficulty is now Easy.',
};
let storeUi = { mode:'grown', feature:null, then:null, busy:false, msg:'', token:0, back:null };

/* ---------- locks ---------- */
function storeMark(el, f) {                // a lock on a control while its feature is locked; nothing at all while the store is not live
  if (!el || !el.classList) return;
  const lock = storeLive() && !storeHas(f);
  if (el.classList.contains('locked') === lock) return;
  el.classList.toggle('locked', lock);
  if (lock) el.setAttribute('aria-describedby', 'st-locked');   // read out as Locked (#st-locked)
  else if (typeof el.removeAttribute === 'function') el.removeAttribute('aria-describedby');
}
/* A feature's way in: true goes ahead; locked, the Unlock card opens and then() runs once it is bought. */
function storeGate(f, then) {
  if (storeHas(f)) return true;
  storeOpen({ mode:'unlock', feature:f, then:typeof then === 'function' ? then : null });
  return false;
}
/* The home's part, from renderHome: the locks, the Grown-Ups button, the Super Fan badge, and a saved Hard played as Normal while Hard
   is locked (the save keeps no other trace of it; buying the Full Game and pressing Hard puts it back). */
function storeRender() {
  storeStart();
  const live = storeLive();
  const g = $('b-grown'), set = $('hp-settings');
  g.hidden = !live; set.classList.toggle('grown', live);    // Settings: Sound | Match Help | Grown-Ups in thirds
  const ready = live && kidsReady();                        // a dot on Grown-Ups when Move Up to Easy is waiting there, and on the Settings headline; touched only when it changes
  if (g.classList.contains('note') !== ready) { g.classList.toggle('note', ready); g.setAttribute('aria-label', ready ? 'Grown-Ups, a suggestion waiting' : 'Grown-Ups'); }
  const hs = $('hl-settings');
  if (hs.classList.contains('note') !== ready) { hs.classList.toggle('note', ready); hs.setAttribute('aria-label', ready ? 'Settings, a suggestion waiting' : 'Settings'); }
  storeMark($('b-champ'), 'champ'); storeMark($('b-career'), 'career'); storeMark($('hl-champ'), 'champ'); storeMark($('hl-career'), 'career');
  const seg = [...document.querySelectorAll('.seg[data-key]')].find(g => g.dataset.key === 'diff');
  if (seg && seg.children[3]) storeMark(seg.children[3], 'hard');
  if (!storeHas('hard')) {
    if (settings.diff === 2) settings.diff = 1;
    if (settings.twoDiff.includes(2)) settings.twoDiff = settings.twoDiff.map(v => Math.min(v, 1));
  }
  if (typeof lockerFanAward === 'function') lockerFanAward();   // an unlock owned before the trophies came earns its club's too (src/locker.js); in the app only
  const c = storeFanClub(), t = storeTeamOf(c), b = $('st-fan');   // a Super Fan's line under the logo, in place of Mobile Rugby · Sevens, so the home keeps its height
  if (c && t) { b.innerHTML = storeShield(t, c) + `<span>Super Fan · ${esc(c.name)}</span>`; b.hidden = false; $('home-tag').hidden = true; }
  else if (!b.hidden) { b.hidden = true; $('home-tag').hidden = false; }
  storeThemeHome(c && t ? t : null);
}

/* ---------- the Super Fan's home: the club's colours ----------
   The chosen headline, the panel's primary button (Play) and My Team's edge take the club's kit colours (styles.css, #s-home.fan),
   readable on the dark home. The accent, a line or a word on the dark, is whichever of the kit and the trim stands out more from the
   panel, lifted toward chalk until it reads at 4.5:1. A word on the kit's fill is chalk wherever chalk reads on it (4.5:1), and the
   night's ink only on a fill too light for it. The fill's edge is the trim where the trim shows on the dark, the accent where not. */
const STORE_TONE = { chalk:'#f1eee4', night:'#0b130e', panel:'#17271d' };   // styles.css's --chalk, --night and --panel-hi
const storeLum = h => { const v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)/255).map(c => (c <= 0.03928 ? c/12.92 : ((c + 0.055)/1.055) ** 2.4)); return 0.2126*v[0] + 0.7152*v[1] + 0.0722*v[2]; };
const storeContrast = (a, b) => { const x = storeLum(a), y = storeLum(b); return (Math.max(x, y) + 0.05)/(Math.min(x, y) + 0.05); };
const storeMix = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16)*(1 - t) + parseInt(b.slice(i, i + 2), 16)*t).toString(16).padStart(2, '0')).join('');
function storeTheme(t) {
  const kit = (HEX.test(t.kit) ? t.kit : '#888888').toLowerCase(), trim = (HEX.test(t.trim) ? t.trim : '#f2efe6').toLowerCase();
  const base = storeContrast(kit, STORE_TONE.panel) >= storeContrast(trim, STORE_TONE.panel) ? kit : trim;
  let acc = base;
  for (let i = 1; i <= 10 && storeContrast(acc, STORE_TONE.panel) < 4.5; i++) acc = storeMix(base, STORE_TONE.chalk, i/10);
  const chalk = storeContrast(kit, STORE_TONE.chalk), ink = chalk >= 4.5 || chalk >= storeContrast(kit, STORE_TONE.night) ? STORE_TONE.chalk : STORE_TONE.night;
  return { kit, trim, acc, ink, edge:storeContrast(trim, STORE_TONE.night) >= 3 ? trim : acc };
}
let storeThemeOn = '';                     // the colours the home has now ('' for none), so it is touched only when they change
function storeThemeHome(t) {
  const s = $('s-home'), th = t ? storeTheme(t) : null, key = th ? Object.values(th).join() : '';
  if (key === storeThemeOn) return;
  storeThemeOn = key;
  s.classList.toggle('fan', !!th);
  for (const k of ['kit', 'trim', 'acc', 'ink', 'edge']) {
    if (th) s.style.setProperty('--fan-' + k, th[k]);
    else if (typeof s.style.removeProperty === 'function') s.style.removeProperty('--fan-' + k);
  }
}
/* The Super Fan's shield: plain, in the kit colours, or the club's crest where FAN_CLUBS has one (a file of the game's own). */
function storeShield(t, c) {
  const crest = storeCrest(c);
  if (crest) return `<img class="fan-shield fan-crest" src="${esc(crest)}" alt="" draggable="false">`;
  const k = HEX.test(t.kit) ? t.kit : '#888888', tr = HEX.test(t.trim) ? t.trim : '#f2efe6';
  return `<svg class="fan-shield" viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1.6l9.8 3.5v7.5c0 6.7-4.1 11.3-9.8 13.6C6.3 23.9 2.2 19.3 2.2 12.6V5.1z" fill="${k}" stroke="${tr}" stroke-width="2.2" stroke-linejoin="round"/></svg>`;
}
function storeTeamsRender() {              // the team screen's part, from renderTeams: Create Team, each Edit, Add Your Team, a Legends side
  storeMark($('t-create'), 'create');
  for (const b of $('t-grid').querySelectorAll('[data-edit]')) storeMark(b, 'create');
  storeMark($('t-import'), 'import');
  for (const b of $('t-grid').querySelectorAll('[data-legend]')) storeMark(b, 'legends');   // unlocked by Gold medals on any tier, played with the Full Game
}
function storeJoinRender() {               // Two Player's Hard, from renderJoin (a saved Hard was played as Normal by storeRender)
  for (const s of [0, 1]) { const b = $('j-diff' + s).children[2]; if (b) storeMark(b, 'hard'); }
}
/* After a purchase or a restore, whatever is showing catches up. granted: something was just added. If it came by itself (an Ask to
   Buy approved while the card is up, not this card's own Buy or Restore, which are busy and finish themselves), the card's
   message is stale: an Unlock card that now has its feature closes and carries on into it, and any other card drops the message. */
function storeRefresh(granted) {
  if (!$('s-home').hidden) renderHome();
  if (!$('s-teams').hidden) renderTeams();
  if (!$('s-join').hidden) renderJoin();
  if ($('m-store').hidden) return;
  if (storeUi.unpriced && storePrices[storeUi.unpriced]) { storeUi.unpriced = null; storeUi.msg = ''; }   // the store answered after all: its out-of-reach message goes
  if (granted && !storeUi.busy) {
    storeUi.msg = '';
    if (storeUi.mode === 'unlock' && storeHas(storeUi.feature)) { storeDone(); return; }
  }
  storeCardRender();
}

/* ---------- the card: Unlock (from a locked control) or Grown-Ups (from the home) ---------- */
function storeOpen(o) {
  const act = typeof document !== 'undefined' ? document.activeElement : null;
  storeUi = { mode:o.mode, feature:o.feature || null, then:o.then || null, busy:false, msg:'', token:storeUi.token + 1, back:act || null };
  if (storeNative() && storeOffers(null).some(x => !storePrices[x.id])) storePricesLoad();   // a price the store has not given yet (offline at start)
  $('m-store').hidden = false;
  storeCardRender();
  setFocus(null);
  storeCardFocus();
}
function storeClose() {
  const back = storeUi.back;
  storeUi = { ...storeUi, then:null, busy:false, token:storeUi.token + 1, back:null };
  $('m-store').hidden = true; setFocus(null);
  if (back && back.focus && !(back.closest && back.closest('[hidden]'))) back.focus();
}
const storeFocusEl = () => { const q = $('st-offers'); return (q.querySelector && q.querySelector('.btn:not([disabled])')) || $('st-back'); };
DEFAULT_FOCUS['m-store'] = storeFocusEl;
function storeCardFocus() {
  if ($('m-store').hidden || lastDev === 'pad') return;    // a controller starts on DEFAULT_FOCUS with its first press
  const el = storeFocusEl(); if (el && el.focus) el.focus();
}
/* The Super Fan's line wraps only between its items on a narrow phone, never inside one (no lone Badge). */
function storeOfferHtml(o, busy) {
  const price = storePrices[o.id] ? ' · ' + esc(storePrices[o.id]) : '', dis = busy ? ' disabled' : '';
  if (o.kind === 'full') return `<button class="btn primary st-buy" data-buy="${o.id}"${dis}>Full Game${price}<small class="hsub">${STORE_LINE.full}</small></button>`;
  const c = o.club, t = storeTeamOf(c);
  return `<div class="st-fanbuy"><button class="btn st-buy" data-buy="${o.id}"${dis}>${jersey(t)}<span class="st-nm">Super Fan · ${esc(c.name)}${price}<small class="hsub">${STORE_LINE.fan.split(' · ').map(x => x.split(' ').join('\u00a0')).join(' · ')}</small></span></button><p class="st-share">${esc(storeShareLine(c))}</p></div>`;
}
function storeCardRender() {
  const u = storeUi, app = storeNative(), grown = u.mode === 'grown';
  $('st-eyebrow').textContent = grown ? 'Grown-Ups' : 'Unlock';
  $('st-title').textContent = grown ? (app ? 'Purchases' : 'Full Game') : STORE_NAMES[u.feature] || 'Full Game';
  const have = [];
  if (app && grown) {                      // the panel says what this device has
    const c = storeFanClub();
    if (c) have.push(`<p class="st-own st-fanown">${jersey(storeTeamOf(c))}<span class="st-ownname">Super Fan · ${esc(c.name)}</span><button class="btn st-wall" data-wall="${esc(c.key)}">Join the Supporters' Wall</button></p>`);   // beside the club's name, as on the Locker's tile: a row of its own pushed the panel off a phone with the Kids buttons and a message up
    else if (storeBought.includes(STORE_FULL)) have.push('<p class="st-own"><span>Full Game Unlocked</span></p>');
  }
  $('st-have').innerHTML = have.join(''); $('st-have').hidden = !have.length;
  for (const b of $('st-have').querySelectorAll('[data-wall]')) { b.disabled = u.busy; b.addEventListener('click', () => storeWallAsk(b.dataset.wall)); }
  const link = storeAppLink();
  $('st-offers').innerHTML = app ? storeOffers(grown ? null : u.feature).map(o => storeOfferHtml(o, u.busy)).join('')
    : link ? `<button class="btn primary" id="st-app">Get the App${u.feature === 'import' ? '' : `<small class="hsub">${STORE_LINE.full}</small>`}</button>` : '';   // Add Your Team is the Super Fan's, not the Full Game's
  for (const b of $('st-offers').querySelectorAll('[data-buy]')) b.addEventListener('click', () => storeBuyAsk(b.dataset.buy));
  const ga = $('st-offers').querySelector ? $('st-offers').querySelector('#st-app') : null;
  if (ga) ga.addEventListener('click', () => storeLeave(link));
  $('st-msg').textContent = u.msg; $('st-msg').hidden = !u.msg;
  $('st-links').hidden = !grown;
  const kidsReset = grown && settings.kidsR > 0;            // Reset Kids Level: only once the Kids rating has moved (src/kids.js), for a sibling or a fresh start
  const kidsEasy = grown && kidsReady();                    // Move Up to Easy: once the child has outgrown Kids (KIDS_EASY, src/kids.js)
  $('st-reset').hidden = !kidsReset; $('st-links').classList.toggle('three', kidsReset);
  $('st-easy').hidden = !kidsEasy; $('st-links').classList.toggle('four', kidsReset && kidsEasy);   // the two Kids buttons share their row in halves   // Privacy | Support, then Reset Kids Level across the row
  $('st-restore').hidden = !app; $('st-restore').disabled = u.busy;
  $('st-row').classList.toggle('one', !app);
  $('st-back').textContent = !$('s-teams').hidden ? 'Back to Teams' : !$('s-join').hidden ? 'Back to Players' : 'Back to Menu';   // the card closes onto the screen it opened from
  const card = $('m-store').querySelector ? $('m-store').querySelector('.card') : null;
  if (card) { card.classList.toggle('solo', !$('st-offers').innerHTML); if (!$('m-store').hidden) careerFit(card); }   // nothing on offer: one column; a long title steps down to fit (careerFit, ui-career.js)
}

/* ---------- buying, restoring, leaving ---------- */
function storeAsk(go) {                    // the grown-up check over the card: the card hides, and comes back either way
  $('m-store').hidden = true;
  const token = storeUi.token;
  parentGate(() => { if (token !== storeUi.token) return; $('m-store').hidden = false; go(); },
    () => { if (token !== storeUi.token) return; $('m-store').hidden = false; storeCardFocus(); });
}
function storeBuyAsk(id) {
  if (storeUi.busy || !storeIds().includes(id)) return;
  if (storeUnpriced(id)) { storeUi.unpriced = id; storeUi.msg = STORE_MSG.store; storeCardRender(); storeCardFocus(); storePricesLoad(); return; }   // the store never priced it: said now, not after the grown-up check, and asked again
  storeAsk(() => storeBuy(id));
}
async function storeBuy(id) {
  const u = storeUi, token = u.token;
  u.busy = true; u.msg = ''; storeCardRender();
  let r; try { r = await storeApi().buy(id); } catch (e) { r = null; }
  if (r && r.ok) storeGrant([id, ...(Array.isArray(r.ids) ? r.ids : [])].filter(x => x === id || storeIds().includes(x)));   // kept even if the card has gone
  if (token !== storeUi.token) return;     // closed while the store's sheet was up: the purchase stands, nothing more on screen
  u.busy = false;
  if (r && r.ok) { storeDone(); return; }
  u.msg = r && r.why === 'cancelled' ? '' : STORE_MSG[r && r.why] || STORE_MSG.failed;
  storeCardRender(); storeCardFocus();
}
function storeRestoreAsk() { if (!storeUi.busy && storeNative()) storeAsk(storeRestore); }
async function storeRestore() {
  const u = storeUi, token = u.token;
  u.busy = true; u.msg = ''; storeCardRender();
  let r; try { r = await storeApi().restore(); } catch (e) { r = null; }
  const added = !!(r && r.ok) && storeGrant(r.ids);
  if (token !== storeUi.token) return;
  u.busy = false;
  if (added && u.mode === 'unlock' && storeHas(u.feature)) { storeDone(); return; }
  u.msg = r && r.ok ? (added ? STORE_MSG.restored : storeBought.length ? STORE_MSG.same : STORE_MSG.none) : r && r.why === 'cancelled' ? '' : STORE_MSG.store;
  storeCardRender(); storeCardFocus();
}
/* Bought: an Unlock card closes and carries on into what was asked for; the panel stays, showing what is owned. */
function storeDone() {
  const u = storeUi;
  if (u.mode === 'unlock' && storeHas(u.feature)) { const then = u.then; storeClose(); if (then) then(); return; }
  storeCardRender(); storeCardFocus();
}
function storeAppLink() {                  // Get the App: Google Play on Android, the App Store on everything else
  const url = storeAndroid() ? STORE_LINKS.android : STORE_LINKS.ios;   // (an Android browser is on 'full' until Play's is set: storeTier)
  return storeUrlOk(url) ? url : null;
}
function storeLeave(url) { if (typeof url === 'string' && /^https:\/\//.test(url)) storeAsk(() => { storeOpenUrl(url); storeCardFocus(); }); }
/* Outside the game: in the app, Capacitor hands a new window to the system browser (Safari on iOS, an intent on Android) and the
   game stays where it is; on the web, a new tab with no way back into this page. */
function storeOpenUrl(url) {
  try { if (storeNative()) window.open(url, '_blank'); else window.open(url, '_blank', 'noopener,noreferrer'); } catch (e) { /* blocked */ }
}

/* ---------- the Supporters' Wall ----------
   Join the Supporters' Wall, from the Locker's Super Fan tile or the Grown-Ups panel, for a club this device owns the unlock of. The
   grown-up check first (the Grown-Ups card hides under it, as for a purchase), then the card: Are you 18 or over? with Yes, I'm 18 or
   Over | Cancel, then How Your Name Appears with Continue | Cancel. Continue hands the email (storeWallMail) to the grown-up's own mail
   app by the way every link leaves the game (storeOpenUrl), and closes the card. However the card closes, the field is emptied: the
   name is in the email the grown-up sends, and nowhere in the game. */
let storeWallUi = null;                    // while the card is up: { club, step, back, store } (store: the Grown-Ups card it hid)
function storeWallAsk(key) {
  const c = storeFanOwned().find(x => x.key === key);
  if (!c || kidsGate || storeWallUi || storeUi.busy && !$('m-store').hidden) return false;
  const back = typeof document !== 'undefined' ? document.activeElement : null, store = !$('m-store').hidden;
  if (store) $('m-store').hidden = true;
  parentGate(() => storeWallOpen(c, back, store), () => storeWallBack(back, store));
  return true;
}
function storeWallOpen(c, back, store) {
  storeWallUi = { club:c, step:'age', back:back || null, store };
  $('wl-title').textContent = c.name;
  $('wl-input').value = '';
  $('m-wall').hidden = false;              // shown first, so the focus can land in it
  storeWallStep('age');
}
function storeWallStep(step) {
  const u = storeWallUi; if (!u) return;
  u.step = step;
  $('wl-age').hidden = step !== 'age'; $('wl-name').hidden = step !== 'name';
  storeWallCheck();
  setFocus(null);
  if (lastDev === 'pad') return;            // a controller starts on DEFAULT_FOCUS with its first press
  const el = step === 'age' ? $('wl-yes') : typeof importTouch === 'function' && importTouch() ? null : $('wl-input');   // on a touch screen no keyboard springs up over the card until the field is tapped
  if (el && el.focus) el.focus();
}
function storeWallCheck() { $('wl-go').disabled = !storeWallMail(storeWallUi && storeWallUi.club, $('wl-input').value); }   // Continue once a name is there
DEFAULT_FOCUS['m-wall'] = () => (storeWallUi && storeWallUi.step === 'name' ? ($('wl-go').disabled ? $('wl-cancel') : $('wl-go')) : $('wl-yes'));
function storeWallGo() {
  const u = storeWallUi; if (!u || u.step !== 'name') return;
  const url = storeWallMail(u.club, $('wl-input').value);
  if (!url) { storeWallCheck(); return; }
  storeWallClose();
  storeOpenUrl(url);
}
function storeWallClose() {
  const u = storeWallUi; if (!u) return;
  storeWallUi = null;
  $('wl-input').value = '';
  $('m-wall').hidden = true;
  storeWallBack(u.back, u.store);
}
function storeWallBack(back, store) {      // the card or the check closed: back to the Grown-Ups card it came from, or the Locker
  setFocus(null);
  if (store) { $('m-store').hidden = false; storeCardRender(); }
  if (back && back.focus && back.isConnected !== false && !(back.closest && back.closest('[hidden]'))) back.focus();
  else if (store) storeCardFocus();
}

$('m-store').hidden = true;                // closed until asked for (the test harness's stand-in elements start open)
$('b-grown').addEventListener('click', () => storeOpen({ mode:'grown' }));
$('st-back').addEventListener('click', storeClose);
$('st-restore').addEventListener('click', storeRestoreAsk);
$('st-privacy').addEventListener('click', () => storeLeave(STORE_LINKS.privacy));
/* Reset Kids Level, behind the grown-up check like everything else here: the hidden Kids rating back to 0, saved, and said. */
function storeKidsReset() { if (!(settings.kidsR > 0) || storeUi.busy) return; storeAsk(() => { settings.kidsR = 0; settings.kidsTop = 0; save(); storeUi.msg = STORE_MSG.kids; storeCardRender(); storeRender(); storeCardFocus(); }); }
$('st-reset').addEventListener('click', storeKidsReset);
/* Move Up to Easy, behind the grown-up check: the Difficulty row moves from Kids to Easy; the Kids rating is kept for a sibling. */
function storeKidsEasy() { if (!kidsReady() || storeUi.busy) return; storeAsk(() => { settings.kids = false; settings.diff = 0; settings.kidsTop = 0; save(); storeUi.msg = STORE_MSG.easy; storeCardRender(); renderHome(); storeCardFocus(); }); }
$('st-easy').addEventListener('click', storeKidsEasy);
$('st-support').addEventListener('click', () => storeLeave(STORE_LINKS.support));
window.addEventListener('keydown', e => {  // Escape closes the card (the grown-up check, over it, takes Escape first and stops it here)
  if (e.key !== 'Escape' || e.defaultPrevented || kidsGate || $('m-store').hidden) return;
  storeClose(); if (e.preventDefault) e.preventDefault();
});
$('m-wall').hidden = true;                 // closed until asked for (the test harness's stand-in elements start open)
$('wl-yes').addEventListener('click', () => storeWallStep('name'));
$('wl-no').addEventListener('click', storeWallClose);
$('wl-cancel').addEventListener('click', storeWallClose);
$('wl-go').addEventListener('click', storeWallGo);
$('wl-input').addEventListener('input', storeWallCheck);
$('wl-input').addEventListener('keydown', e => { if (e.key === 'Enter') { if (e.preventDefault) e.preventDefault(); storeWallGo(); } });
window.addEventListener('keydown', e => {  // Escape closes the Supporters' Wall card too, the field emptied
  if (e.key !== 'Escape' || e.defaultPrevented || kidsGate || $('m-wall').hidden) return;
  storeWallClose(); if (e.preventDefault) e.preventDefault();
});
