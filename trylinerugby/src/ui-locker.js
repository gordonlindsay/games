/* =========================================================
   The Locker's screens: the home button, the Locker (Medals | Ball | Boots | Legends) and the full-time card's medal rows.
   Pictures and colours first: each feat has an icon, each medal a bronze, silver or gold pip, each ball and pair of boots is
   drawn in its colours, a locked one is dimmed with the pip and the name of the medal that unlocks it, and a locked Legends
   side is a padlock with the Gold count it needs. The rules are in src/locker.js.
   ========================================================= */
const LOCKER_TABS = ['Medals', 'Ball', 'Boots', 'Legends'];
let lockerTab = 0, lockerSvgN = 0;
const LOCKER_ICON = {   // 40x40, drawn in the chalk line; .acc is the gold accent
  hat:'<ellipse cx="10" cy="27" rx="6.5" ry="4.2" transform="rotate(-28 10 27)"/><ellipse cx="20" cy="14" rx="6.5" ry="4.2" transform="rotate(-28 20 14)" class="acc"/><ellipse cx="30" cy="27" rx="6.5" ry="4.2" transform="rotate(-28 30 27)"/>',
  sharp:'<path d="M12 5v30M28 5v30M12 23h16"/><ellipse cx="20" cy="12" rx="5" ry="3.3" transform="rotate(-35 20 12)" class="acc"/>',
  hit:'<path class="acc" d="M20 3l3.2 9 8.6-4.2-4.2 8.6 9 3.2-9 3.2 4.2 8.6-8.6-4.2-3.2 9-3.2-9-8.6 4.2 4.2-8.6-9-3.2 9-3.2-4.2-8.6 8.6 4.2z"/>',
  clean:'<path d="M20 4l13 4.5v10c0 8.5-5.5 14-13 17.5C12.5 32.5 7 27 7 18.5v-10z"/><path class="acc-line" d="M13.5 19.5l4.5 4.5 8.5-9"/>',
  golden:'<ellipse cx="20" cy="22" rx="9" ry="6" transform="rotate(-30 20 22)" class="acc"/><path class="acc-line" d="M20 5v5M33 10l-3.5 3.5M7 10l3.5 3.5M35 23h-4.5M5 23h4.5"/>',
  comeback:'<path d="M8 34v-7M16 34v-12M24 34v-17M32 34v-23" class="acc-line" stroke-width="5"/><path d="M5 35h30"/>',
  drop:'<path d="M13 4v15M27 4v15M13 12h14"/><path class="dash" d="M20 28V15"/><ellipse cx="20" cy="31" rx="5.5" ry="3.6" transform="rotate(-30 20 31)" class="acc"/>',
  fire:'<path class="acc" d="M13 36c-5 0-8-4-7-9 1-4 4-6 4-11 4 2 6 6 5 10 1-2 3-3 3-5 2 3 3 6 2 9-1 4-3 6-7 6z"/><path class="acc" d="M28 36c-5 0-8-4-7-9 1-4 4-6 4-11 4 2 6 6 5 10 1-2 3-3 3-5 2 3 3 6 2 9-1 4-3 6-7 6z"/>',
  champ:'<path class="acc" d="M13 6h14v8a7 7 0 0 1-14 0z"/><path d="M13 9H8.5a4.5 4.5 0 0 0 5 6M27 9h4.5a4.5 4.5 0 0 1-5 6M20 21v6M15 27h10v6H15z"/>',
  star:'<path class="acc" d="M20 4l2.6 6.2 6.7.5-5.1 4.4 1.6 6.5L20 18l-5.8 3.6 1.6-6.5-5.1-4.4 6.7-.5z"/><path d="M9.5 22l1.7 4 4.3.3-3.3 2.8 1 4.2-3.7-2.3-3.7 2.3 1-4.2-3.3-2.8 4.3-.3zM30.5 22l1.7 4 4.3.3-3.3 2.8 1 4.2-3.7-2.3-3.7 2.3 1-4.2-3.3-2.8 4.3-.3z"/>',
  silver:'<circle cx="20" cy="17" r="12"/><circle cx="20" cy="17" r="6.5" class="acc"/><path d="M20 29v4M13 35h14"/>',
  callup:'<path d="M14 6l-8 5 3 7 4-2v18h14V16l4 2 3-7-8-5c-1 3-4 4-6 4s-5-1-6-4z"/><path class="acc" d="M20 17l1.6 3.4 3.7.4-2.8 2.5.8 3.7-3.3-1.9-3.3 1.9.8-3.7-2.8-2.5 3.7-.4z"/>',
};
const lockerIcon = id => `<svg viewBox="0 0 40 40" aria-hidden="true">${LOCKER_ICON[id] || ''}</svg>`;
const lockerDisc = t => `<svg class="lk-disc t${t}" viewBox="0 0 20 24" aria-hidden="true"><path d="M5 0h4l3 7H8zM15 0h-4L8 7h4z" fill="#c8102e"/><circle cx="10" cy="15" r="7.5" fill="var(--pc)" stroke="rgba(0,0,0,.45)" stroke-width="1.4"/></svg>`;   // a medal on its ribbon, in its colour
const lockerPip = (t, on) => `<i class="lk-pip t${t}${on ? ' on' : ''}" aria-hidden="true"></i>`;
/* A ball or a pair of boots, drawn in its colours: patterns as a gradient with an id of its own, so two copies never share one. */
function lockerSwatch(kind, it) {
  const n = 'lkg' + (++lockerSvgN);
  let fill = kind === 'ball' ? it.fill : it.col, defs = '';
  const stops = it.rainbow ? LOCKER_RAINBOW.map((c, i) => [i/(LOCKER_RAINBOW.length - 1), c])
    : it.band ? [[0, it.fill], [0.26, it.fill], [0.26, it.band], [0.38, it.band], [0.38, it.fill], [0.62, it.fill], [0.62, it.band], [0.74, it.band], [0.74, it.fill], [1, it.fill]]
    : it.shine ? [[0, it.fill], [0.42, '#ffffff'], [0.58, it.fill], [1, it.line]] : null;
  if (stops) { defs = `<defs><linearGradient id="${n}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient></defs>`; fill = `url(#${n})`; }
  if (kind === 'ball') return `<svg class="lk-ball" viewBox="0 0 48 32" aria-hidden="true">${defs}<ellipse cx="24" cy="16" rx="21" ry="12.5" fill="${fill}" stroke="${it.line}" stroke-width="2"/><path d="M15 16h18M19 13.5v5M23 13.5v5M27 13.5v5" stroke="${it.line}" stroke-width="1.6" stroke-linecap="round" opacity=".7"/></svg>`;
  return `<svg class="lk-boot" viewBox="0 0 48 32" aria-hidden="true">${defs}<path d="M5 6h15l2 9 15 3.5c5 1 7 3.5 7 6.5v2H5z" fill="${fill}" stroke="#a7b4a9" stroke-width="1.6" stroke-linejoin="round"/><path d="M5 27h39" stroke="#a7b4a9" stroke-width="1.6"/><g fill="#08110b"><circle cx="10" cy="29.5" r="1.8"/><circle cx="17" cy="29.5" r="1.8"/><circle cx="31" cy="29.5" r="1.8"/><circle cx="39" cy="29.5" r="1.8"/></g></svg>`;
}
const lockerItemName = it => it.name + (it.kind === 'ball' ? ' Ball' : ' Boots');
const LOCKER_LOCK = '<svg class="lk-lock" viewBox="0 0 14 18" aria-hidden="true"><path d="M3.6 8.2V5.4a3.4 3.4 0 0 1 6.8 0v2.8" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x=".5" y="7.6" width="13" height="10" rx="2" fill="currentColor"/></svg>';

/* ---------- Super Fan trophies ----------
   A gold cup with ribbons, a shield and a band in the club's kit colours: in the Locker's Super Fan tile (Medals, before the feats)
   and in the Trophy Cabinet, its own kind (lockerFanCabinet). The club's name beside it and nothing more. */
function lockerCup(t) {
  const k = HEX.test(t.kit) ? t.kit : '#888888', tr = HEX.test(t.trim) ? t.trim : '#f2efe6', g = '#ffcf3d', ink = '#5e4100';
  return `<svg class="lk-cup" viewBox="0 0 48 48" aria-hidden="true"><g stroke="${tr}" stroke-width="1.4" stroke-linejoin="round"><path d="M11.5 14 7 36l4.6-3 3.4 4V16z" fill="${k}"/><path d="M36.5 14 41 36l-4.6-3-3.4 4V16z" fill="${k}"/></g>`
    + `<path d="M13 9H8.5a5.5 5.5 0 0 0 6 8.5M35 9h4.5a5.5 5.5 0 0 1-6 8.5" fill="none" stroke="${g}" stroke-width="3" stroke-linecap="round"/>`
    + `<path d="M12.5 5h23v12c0 6.8-5.2 11.8-11.5 11.8S12.5 23.8 12.5 17z" fill="${g}" stroke="${ink}" stroke-width="1.6"/><path d="M16.5 9v7" stroke="#fff4c8" stroke-width="2" stroke-linecap="round" opacity=".85"/>`
    + `<path d="M24 9.4l5 1.8v3.9c0 3.3-2.1 5.6-5 6.8-2.9-1.2-5-3.5-5-6.8v-3.9z" fill="${k}" stroke="${tr}" stroke-width="1.4" stroke-linejoin="round"/>`
    + `<path d="M21 28.5h6v6h-6z" fill="#e2ab27" stroke="${ink}" stroke-width="1.4"/><path d="M13.5 34.5h21v9h-21z" fill="${g}" stroke="${ink}" stroke-width="1.6"/><path d="M13.5 37.6h21v2.8h-21z" fill="${k}" stroke="${tr}" stroke-width="1"/></svg>`;
}
/* The Medals tab's Super Fan row: a tile a club, with Join the Supporters' Wall for a club whose unlock this device owns (src/ui-store.js). */
function lockerFanHtml(news) {
  const held = lockerFanClubs(); if (!held.length) return '';
  const own = typeof storeFanOwned === 'function' ? storeFanOwned() : [];
  return `<div class="lk-fanrow">${held.map(({ club:c, team:t }) => `<div class="lk-fan${news && news.has('fan:' + c.key) ? ' new' : ''}" role="group" aria-label="Super Fan Trophy, ${esc(c.name)}">${lockerCup(t)}<span class="lk-fanname"><b>Super Fan</b><span>${esc(c.name)}</span></span>${own.includes(c) ? `<button class="btn lk-wall" data-wall="${esc(c.key)}">Join the Supporters' Wall</button>` : ''}</div>`).join('')}</div>`;
}
/* The Trophy Cabinet's Super Fan trophies (renderCabinet, src/ui-menus.js): first, each its own entry, never in the tally. */
function lockerFanCabinet() {
  return lockerFanClubs().map(({ club:c, team:t }) => `<article class="season-entry fan-entry"><p class="eyebrow"><span class="cup-kind" data-kind="fan">Super Fan</span></p><h3>${lockerCup(t)}<span>${esc(c.name)}</span></h3></article>`).join('');
}

/* ---------- the home button ---------- */
function lockerHome() {                                      // from renderHome: a dot on Locker while a medal waits there unseen
  const b = $('b-locker'); if (!b || !b.classList) return;
  const fresh = lockerNew();
  if (b.classList.contains('note') !== fresh) { b.classList.toggle('note', fresh); b.setAttribute('aria-label', fresh ? 'Locker, a new medal' : 'Locker'); }
}

/* ---------- the Locker ---------- */
function lockerOpen(tab) {
  lockerTab = tab == null ? 0 : tab;
  const news = new Set([...LOCKER_FEATS.filter(f => lockerTier(f.id) > lockerSeen(f.id)).map(f => f.id), ...lockerFanHeld().slice(locker.fanSeen || 0).map(k => 'fan:' + k)]);   // shown once with a ring, then seen
  renderLocker(news);
  showScreen('s-locker'); $('s-locker').scrollTop = 0;
  lockerMarkSeen(); lockerHome();
}
function renderLocker(news) {
  const tiers = LOCKER_FEATS.map(f => lockerTier(f.id));
  $('lk-tally').innerHTML = [1, 2, 3].map(t => `<span class="lk-tal" aria-label="${LOCKER_MEDALS[t - 1]} ${tiers.filter(x => x >= t).length}">${lockerPip(t, true)}${tiers.filter(x => x >= t).length}</span>`).join('');
  [...$('lk-tabs').children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === lockerTab)));
  const body = $('lk-body');
  body.className = 'lk-body lk-t' + lockerTab;
  if (lockerTab === 0) {
    body.innerHTML = lockerFanHtml(news) + LOCKER_FEATS.map(f => {
      const t = lockerTier(f.id), next = lockerNext(f.id), n = lockerCount(f.id);
      return `<div class="lk-feat${news && news.has(f.id) ? ' new' : ''}" role="group" aria-label="${f.name}, ${t ? LOCKER_MEDALS[t - 1] : 'no medal yet'}, ${n}${next ? ' of ' + next : ''}">
      <span class="lk-ic">${lockerIcon(f.id)}</span><b class="lk-name">${f.name}</b><span class="lk-line">${f.line}</span>
      <span class="lk-pips">${[1, 2, 3].map(k => lockerPip(k, t >= k)).join('')}<span class="lk-n">${next ? n + '/' + next : n}</span></span></div>`;
    }).join('');
    for (const b of body.querySelectorAll('[data-wall]')) b.addEventListener('click', () => storeWallAsk(b.dataset.wall));   // the grown-up check first (src/ui-store.js)
  } else if (lockerTab < 3) {
    const kind = lockerTab === 1 ? 'ball' : 'boots', list = kind === 'ball' ? LOCKER_BALLS : LOCKER_BOOTS;
    body.innerHTML = list.map(it => {
      const has = lockerHas(kind, it.id), on = locker[kind] === it.id, src = lockerSource(kind, it.id);
      const why = !has && src ? `<span class="lk-why">${lockerPip(src.tier, true)}${src.feat.name}</span>` : '';
      const label = it.name + (has ? '' : ', locked, ' + src.feat.name + ' ' + LOCKER_MEDALS[src.tier - 1]);
      return `<button class="btn lk-item${has ? '' : ' lk-off'}" data-kind="${kind}" data-id="${it.id}" aria-pressed="${on}" aria-label="${label}"${has ? '' : ' disabled'}>
        ${lockerSwatch(kind, it)}<span class="lk-iname">${it.name}</span>${why}</button>`;
    }).join('');
    for (const b of body.querySelectorAll('.lk-item')) b.addEventListener('click', () => { if (lockerPick(b.dataset.kind, b.dataset.id)) { renderLocker(); const again = $('lk-body').querySelector(`[data-id="${b.dataset.id}"]`); if (again && again.focus) again.focus(); if (again && focusEl) setFocus(again); } });
  } else {
    const g = Math.min(10, lockerGolds());
    const tile = (t, i) => i < g
      ? `<div class="lk-leg" data-legend="1" role="group" aria-label="${esc(t.name)}, Overall ${overallOf(t)}">${jersey(t).replace(/<\/span>$/, `<span class="ovr">${overallOf(t)}</span></span>`)}<span class="lk-nat">${esc(t.nation)}</span><b class="lk-yr">${t.year}</b></div>`
      : `<div class="lk-leg lk-off" role="group" aria-label="Locked, ${i + 1} Gold ${i ? 'Medals' : 'Medal'}"><span class="lk-padlock">${LOCKER_LOCK}</span><span class="lk-need">${lockerPip(3, true)}${i + 1}</span></div>`;
    body.innerHTML = ['men', 'women'].map(cat => `<p class="lbl">${cat === 'men' ? 'Men' : 'Women'}</p><div class="lk-legrow">${LEGENDS.filter(t => t.cat === cat).map(tile).join('')}</div>`).join('');
    for (const el of body.querySelectorAll('[data-legend]')) storeMark(el, 'legends');   // won on any tier, played with the Full Game: the lock the team screen shows (src/ui-store.js)
  }
}
function lockerSetTab(i) { lockerTab = clamp(i, 0, LOCKER_TABS.length - 1); renderLocker(); }
[...$('lk-tabs').children].forEach((b, i) => b.addEventListener('click', () => lockerSetTab(i)));
$('b-locker').addEventListener('click', () => { ac(); lockerOpen(0); });
$('lk-back').addEventListener('click', goHome);

/* ---------- full time ---------- */
/* The full-time card: a row for each medal this match won (its pip, its name, what it unlocked), and a line for the Legends a new
   Gold brings. Only what the match won, from the tiers it began with (lockerFrom): a medal won between matches, a drill's Star Pupil
   say, keeps the dot on the home's Locker button and its ring in the Locker. In Two Player the medals are Player 1's, so they carry his
   seat tag. Shown once: those medals are seen from then on. */
function lockerCard(kind) {
  const el = $('br-medals');
  const show = on => {                                       // the card makes room for them beside the stats on a phone held sideways,
    el.hidden = !on; $('m-break').classList.toggle('lk-on', on);   // spanning the rows shown above Continue and no more (styles.css)
    const card = el.parentElement;                           // (no layout, and no parent, in the tools' headless page)
    if (on && card) el.style.setProperty('--lk-rows', [...card.children].filter(c => c !== el && !c.hidden && c.id !== 'br-go' && c.id !== 'br-row').length);
  };
  if (kind !== 'full' || !M.lkFrom) { show(false); el.innerHTML = ''; return; }
  const { medals, legends } = lockerNews(id => Math.max(lockerSeen(id), M.lkFrom[id] || 0));
  if (!medals.length) { show(false); el.innerHTML = ''; return; }
  el.innerHTML = (M.two ? '<p class="lk-who"><i class="stag s0" aria-hidden="true">1</i>Player 1</p>' : '') + medals.map(m => `<p class="lk-won" aria-label="${m.feat.name}, ${LOCKER_MEDALS[m.tier - 1]}${m.item ? ', ' + lockerItemName(m.item) : ''}">${lockerDisc(m.tier)}<b>${m.feat.name}</b>${m.item ? `<span class="lk-got">${lockerSwatch(m.item.kind, m.item)}${lockerItemName(m.item)}</span>` : ''}</p>`).join('')
    + (legends.length ? `<p class="lk-won lk-newleg"><b>New Legends</b>${legends.map(t => `<span class="lk-got">${jersey(t)}${esc(t.name)}</span>`).join('')}</p>` : '');
  show(true);
  lockerMarkSeen(medals.map(m => m.feat.id));
}
