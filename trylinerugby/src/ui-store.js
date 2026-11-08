/* =========================================================
   Store screens: the locks, the Unlock card and the Grown-Ups panel (one card, #m-store), the Super Fan badge on the home,
   and the links that leave the game. The rules are in src/store.js.
   - A locked control (Championship, Career, Create Team and Edit, Hard, Import Club) keeps its place and its label, with a small
     lock (.locked), and opens the Unlock card instead. A championship or career under way keeps its note: it is saved, only locked.
   - Every purchase, Restore Purchases, Get the App, Privacy and Support goes through the grown-up check (parentGate, src/kids.js)
     first. The card hides while the check is up, as the import card does, so the two never stack.
   - On the web while STORE_WEB_TIER is 'full' (storeLive false) none of it shows and no control changes.
   ========================================================= */
const STORE_NAMES = { champ:'Championship', career:'Career', create:'Create Team', hard:'Hard', import:'Import Club' };
const STORE_LINE = { full:'Championship · Career · Create Team · Hard', fan:'Full Game · Import Club · Super Fan Badge' };
const STORE_MSG = {
  pending:'Waiting for a grown-up to approve it.',
  failed:'The purchase did not go through.',
  store:'Could not reach the store. Try again later.',
  restored:'Purchases restored.',
  none:'No purchases to restore.',
  same:'Purchases are up to date.',
  kids:'Kids level is back to the start.',
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
  const g = $('b-grown'), row = g.parentNode;
  g.hidden = !live; if (row && row.classList) row.classList.toggle('three', live);   // How to Play | Training Ground | Grown-Ups in thirds
  storeMark($('b-champ'), 'champ'); storeMark($('b-career'), 'career');
  const seg = [...document.querySelectorAll('.seg[data-key]')].find(g => g.dataset.key === 'diff');
  if (seg && seg.children[3]) storeMark(seg.children[3], 'hard');
  if (!storeHas('hard')) {
    if (settings.diff === 2) settings.diff = 1;
    if (settings.twoDiff.includes(2)) settings.twoDiff = settings.twoDiff.map(v => Math.min(v, 1));
  }
  const c = storeFanClub(), t = storeTeamOf(c), b = $('st-fan');   // a Super Fan's line under the logo, in place of Mobile Rugby · Sevens, so the home keeps its height
  if (c && t) { b.innerHTML = jersey(t) + `<span>Super Fan · ${esc(c.name)}</span>`; b.hidden = false; $('home-tag').hidden = true; }
  else if (!b.hidden) { b.hidden = true; $('home-tag').hidden = false; }
}
function storeTeamsRender() {              // the team screen's part, from renderTeams: Create Team, each Edit, Import Club
  storeMark($('t-create'), 'create');
  for (const b of $('t-grid').querySelectorAll('[data-edit]')) storeMark(b, 'create');
  storeMark($('t-import'), 'import');
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
    if (c) have.push(`<p class="st-own">${jersey(storeTeamOf(c))}<span>Super Fan · ${esc(c.name)}</span></p>`);
    else if (storeBought.includes(STORE_FULL)) have.push('<p class="st-own"><span>Full Game Unlocked</span></p>');
  }
  $('st-have').innerHTML = have.join(''); $('st-have').hidden = !have.length;
  const link = storeAppLink();
  $('st-offers').innerHTML = app ? storeOffers(grown ? null : u.feature).map(o => storeOfferHtml(o, u.busy)).join('')
    : link ? `<button class="btn primary" id="st-app">Get the App${u.feature === 'import' ? '' : `<small class="hsub">${STORE_LINE.full}</small>`}</button>` : '';   // Import is the Super Fan's, not the Full Game's
  for (const b of $('st-offers').querySelectorAll('[data-buy]')) b.addEventListener('click', () => storeBuyAsk(b.dataset.buy));
  const ga = $('st-offers').querySelector ? $('st-offers').querySelector('#st-app') : null;
  if (ga) ga.addEventListener('click', () => storeLeave(link));
  $('st-msg').textContent = u.msg; $('st-msg').hidden = !u.msg;
  $('st-links').hidden = !grown;
  const kidsReset = grown && settings.kidsR > 0;            // Reset Kids Level: only once the Kids rating has moved (src/kids.js), for a sibling or a fresh start
  $('st-reset').hidden = !kidsReset; $('st-links').classList.toggle('three', kidsReset);   // Privacy | Support, then Reset Kids Level across the row
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

$('m-store').hidden = true;                // closed until asked for (the test harness's stand-in elements start open)
$('b-grown').addEventListener('click', () => storeOpen({ mode:'grown' }));
$('st-back').addEventListener('click', storeClose);
$('st-restore').addEventListener('click', storeRestoreAsk);
$('st-privacy').addEventListener('click', () => storeLeave(STORE_LINKS.privacy));
/* Reset Kids Level, behind the grown-up check like everything else here: the hidden Kids rating back to 0, saved, and said. */
function storeKidsReset() { if (!(settings.kidsR > 0) || storeUi.busy) return; storeAsk(() => { settings.kidsR = 0; save(); storeUi.msg = STORE_MSG.kids; storeCardRender(); storeCardFocus(); }); }
$('st-reset').addEventListener('click', storeKidsReset);
$('st-support').addEventListener('click', () => storeLeave(STORE_LINKS.support));
window.addEventListener('keydown', e => {  // Escape closes the card (the grown-up check, over it, takes Escape first and stops it here)
  if (e.key !== 'Escape' || e.defaultPrevented || kidsGate || $('m-store').hidden) return;
  storeClose(); if (e.preventDefault) e.preventDefault();
});
