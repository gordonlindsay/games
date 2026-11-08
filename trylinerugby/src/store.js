/* =========================================================
   Store: the one-off unlocks, who has them, and the adapter to the app stores.

   Free: Quick Match, the Training Ground, Kids, Easy and Normal, How to Play and Two Player. Full Game (tryline.full) adds
   Championship, Career, Create Team and Hard. Super Fan of a partner club (tryline.fan.<key>, one product a club) is the Full
   Game and Import, and marks the player as that club's Super Fan: its kit and name on the home, and the club offered first in
   Career and Championship. No subscriptions, no ads, no accounts, no server: a purchase is kept on this device in the save's
   own field (store), and Restore Purchases reads it back from the App Store or Google Play.

   Where it applies (storeHas):
   - The Try Line app: by purchases.
   - The web: by STORE_WEB_TIER alone. 'full' (until the app is live) unlocks everything and shows nothing of the store, so the
     web plays exactly as it did before; 'free' (from launch) keeps the free tier and offers Get the App. Purchases are the
     app's: the web never reads them, and a save with a championship or a career under way keeps it, locked, untouched.
     An Android browser stays on 'full' until STORE_LINKS.android is set: the app is on the App Store first, and a lock with
     no app to get would be a dead end.

   The adapter (storeBackend) talks to @capgo/native-purchases, a Capacitor plugin over StoreKit 2 and Google Play Billing
   with no service of its own in between (trylinerugby/store/README.md says why that one). The web and the tests use
   storeStub, or a backend a test hands in. Nothing about the player is sent: no account token, no receipt, nothing.
   ========================================================= */
const STORE_WEB_TIER = 'full';             // the web build: 'full' now, 'free' at launch (trylinerugby/store/README.md)
const STORE_FULL = 'tryline.full';         // Full Game, £1.99; Super Fan, £3.99 (prices live in App Store Connect and Play Console)
const STORE_FULL_HAS = ['champ', 'career', 'create', 'hard'];
const STORE_FAN_HAS = [...STORE_FULL_HAS, 'import'];   // Super Fan: everything in the Full Game, and Import
/* Partner clubs. key names the product (tryline.fan.<key>), so Apple's and Google's sales reports count each club's unlocks with
   nothing collected by us. name is how the game names the club; team is its side in data.js, for the badge's kit and the side
   offered first. share is the club's percentage of what we receive for each Super Fan unlock (the proceeds, after the store's
   commission). agreed turns true only once the club has confirmed that share in writing. The club's Super Fan offer is shown only
   with both, so it can never go out without its stated, agreed share. A club the game does not have yet is appended to CLUBS
   (data.js) first. tools/listing.mjs reads this list as plain data: keep it literals only. */
const FAN_CLUBS = [
  { key:'farnham', name:'Farnham RUFC', product:'tryline.fan.farnham', share:50, agreed:false, team:'FAR' },
];
const STORE_LINKS = {                      // each opens outside the game, and only after the grown-up check
  privacy:'https://gordonlindsay.github.io/games/trylinerugby/privacy.html',
  support:'https://gordonlindsay.github.io/games/trylinerugby/support.html',
  ios:null,                                // the App Store page for Get the App: set before STORE_WEB_TIER goes to 'free'
  android:null,                            // the Google Play page, likewise
};
const STORE_ID = /^tryline\.(?:full|fan\.[a-z0-9]{1,24})$/;   // a product id the save may keep: one from a club since dropped stays bought
let storeNativeHook = null;                // the tests' stand-in for nativeOn (src/native.js)
let storeTierHook = null;                  // the tests' stand-in for STORE_WEB_TIER
let storeUse = null;                       // the tests' backend, in place of the app's or the stub
let storePrices = {};                      // product id: its price as the store writes it (£1.99), once the store has said
let storeAsked = false;                    // the store has answered a price request, or failed to, since the start
let storeStarted = false;

/* ---------- who has what ---------- */
const storeNative = () => (storeNativeHook != null ? !!storeNativeHook : typeof nativeOn === 'function' && !!nativeOn());
const storeUrlOk = u => typeof u === 'string' && /^https:\/\//.test(u);
const storeAndroid = () => { try { return typeof navigator !== 'undefined' && !!navigator && /android/i.test(String(navigator.userAgent || '')); } catch (e) { return false; } };
/* The web's tier. An Android browser keeps 'full' until the Google Play page is set, so the free web never locks a mode it has no
   app to offer for (the app is on the App Store first). */
function storeTier() {
  const t = storeTierHook || STORE_WEB_TIER;
  return t === 'free' && storeAndroid() && !storeUrlOk(STORE_LINKS.android) ? 'full' : t;
}
const storeLive = () => storeNative() || storeTier() === 'free';   // false: the web as it was, everything unlocked and no store
function cleanStore(v) {                   // the save's store field: known-shaped product ids, each once
  const out = [];
  const ids = v && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.owned) ? v.owned : [];
  for (const id of ids.slice(0, 32)) if (typeof id === 'string' && STORE_ID.test(id) && !out.includes(id)) out.push(id);
  return out;
}
const storeClubOf = id => FAN_CLUBS.find(c => c.product === id) || null;
const storeTeamOf = c => (c ? ALL_TEAMS.find(t => t.id === c.team) || null : null);
function storeFanClub() {                  // the club of the latest Super Fan unlock still in FAN_CLUBS, in the app
  if (!storeNative()) return null;
  for (let i = storeBought.length - 1; i >= 0; i--) { const c = storeClubOf(storeBought[i]); if (c) return c; }
  return null;
}
function storeFan() { const c = storeFanClub(); return c ? { key:c.key, name:c.name } : null; }
const storeAnyFan = () => storeNative() && storeBought.some(id => id.startsWith('tryline.fan.'));   // any Super Fan unlock, a club since dropped from FAN_CLUBS included, still unlocks
function storeHas(f) {
  if (!STORE_FAN_HAS.includes(f)) return true;           // the free tier
  if (!storeNative()) return storeTier() !== 'free';     // the web: the tier alone
  if (storeAnyFan()) return true;
  return f !== 'import' && storeBought.includes(STORE_FULL);
}
/* A club is on sale only with a share and the club's written agreement to it (agreed:true). */
const storeShareOk = c => c.agreed === true && typeof c.share === 'number' && Number.isFinite(c.share) && c.share > 0 && c.share <= 100;
/* The share is of what we receive (the proceeds, after the store's commission), never of the price. tools/listing.mjs holds
   superfan.html to these same words. */
const storeShareLine = c => 'Supports ' + c.name + ': ' + c.share + '% of what we receive for every Super Fan unlock goes to the club.';
/* What can be bought, in the app: for a locked feature, what unlocks it; for the Grown-Ups panel (f null), all not yet owned.
   A Super Fan club is offered only once its share is set and agreed. */
function storeOffers(f) {
  if (!storeNative()) return [];
  const out = [], fan = storeAnyFan();
  if (!fan && !storeBought.includes(STORE_FULL) && (f == null || STORE_FULL_HAS.includes(f))) out.push({ id:STORE_FULL, kind:'full' });
  for (const c of FAN_CLUBS) if (storeShareOk(c) && storeTeamOf(c) && !storeBought.includes(c.product) && (f == null || !storeHas(f))) out.push({ id:c.product, kind:'fan', club:c });
  return out;
}
/* A locked control is shown only where something unlocks it: in the app, Import Club stays away until a Super Fan club is on sale. */
const storeOffered = f => storeHas(f) || !storeNative() || storeOffers(f).length > 0;

/* ---------- the Super Fan's club, first ---------- */
const storeFanTeam = () => storeTeamOf(storeFanClub());
const storeHomeTeam = () => storeFanTeam() || DEFAULT_TEAM;
function storeHomePool() { const t = storeFanTeam(), l = t && TEAM_LISTS.find(x => x.teams.includes(t)); return l ? l.key : 'sur'; }   // the list holding the Super Fan's club, or Local · Surrey
function storeFirst(list) {                // the Super Fan's club moved to the front of a team list, the rest in their order
  const t = storeFanTeam(); if (!t) return list;
  const i = list.findIndex(o => o && !o.custom && o.id === t.id);
  return i <= 0 ? list : [list[i], ...list.slice(0, i), ...list.slice(i + 1)];
}

/* ---------- purchases kept ---------- */
function storeGrant(ids) {                 // add only: a store that answers with less (offline, signed out) never takes one away
  let added = false;
  for (const id of Array.isArray(ids) ? ids : []) if (typeof id === 'string' && STORE_ID.test(id) && !storeBought.includes(id)) { storeBought.push(id); added = true; }
  if (added) { storeKeep(); storeRefresh(true); }
  return added;
}
/* A refund, or a family member's unlock that ends when they leave the Family Sharing group: Apple sends the transaction again with a
   revocationDate (the transactionUpdated listener). The unlock goes only if the store's current entitlements no longer hold it (an
   unlock bought twice, once shared and once bought, stays). Anything saved stays saved, only locked, as on the free web. */
function storeRevoke(ids) {
  const gone = (Array.isArray(ids) ? ids : []).filter(id => storeBought.includes(id));
  if (!gone.length) return Promise.resolve(false);
  return Promise.resolve().then(() => storeApi().owned()).then(own => (Array.isArray(own) ? own : []), () => []).then(own => {
    const before = storeBought.length;
    storeBought = storeBought.filter(id => !gone.includes(id) || own.includes(id));
    if (storeBought.length === before) return false;
    storeKeep(); storeRefresh();
    return true;
  });
}
/* The purchases into the save at once. save() waits out a drill (practice never writes settings or a championship), so an unlock
   that arrives during one (Ask to Buy approved, a family member's) goes into the save as it stands, and into Preferences. */
function storeKeep() {
  if (!practice) { save(); return; }
  try {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { s = null; }
    if (!s || typeof s !== 'object' || Array.isArray(s)) s = {};
    s.store = storeBought.length ? { owned:storeBought.slice() } : undefined;
    localStorage.setItem(STORE, JSON.stringify(s));
  } catch (e) { /* storage refused: the store gives them back at the next start, or Restore Purchases */ }
  if (typeof nativeMirror === 'function') nativeMirror();
}

/* ---------- the adapter ----------
   storeBackend: @capgo/native-purchases, reached as Capacitor.Plugins.NativePurchases (the game has no bundler; Capacitor's
   bridge puts every installed plugin there). Its documented calls, and nothing else: getProducts, purchaseProduct,
   restorePurchases, getPurchases, acknowledgePurchase and the transactionUpdated event. Each answer is checked here before
   anything is unlocked. */
const storePlugin = () => { try { const C = window.Capacitor, P = C && C.Plugins && C.Plugins.NativePurchases; return P && typeof P.purchaseProduct === 'function' ? P : null; } catch (e) { return null; } };
const storeIds = () => [STORE_FULL, ...FAN_CLUBS.map(c => c.product)];
/* A transaction counts when it is for a product of ours, Google's state is Purchased (1, not 0 Pending) and Apple has not revoked it. */
const storeOurs = t => !!t && typeof t === 'object' && typeof t.productIdentifier === 'string' && STORE_ID.test(t.productIdentifier);
const storeValid = t => storeOurs(t) && (t.purchaseState == null || String(t.purchaseState) === '1') && !t.revocationDate;
const storeRevoked = t => storeOurs(t) && !!t.revocationDate;
/* A refused purchase, by the words either platform rejects with. No connection, or a product the store could not find (Apple:
   "Cannot find product for id", Google: SERVICE_UNAVAILABLE), is the store out of reach, said as such. */
function storeWhy(e) {
  const m = String((e && e.code) || '') + ' ' + String((e && e.message) || e || '');
  return /cancel/i.test(m) ? 'cancelled' : /pending/i.test(m) ? 'pending' : /already_?owned/i.test(m) ? 'owned'
    : /offline|network|internet|connection|timed?[ _]?out|cannot find product|not found|unavailable/i.test(m) ? 'store' : 'failed';
}
const storeBackend = {
  async products() {
    const P = storePlugin(); if (!P) return [];
    const r = await P.getProducts({ productIdentifiers:storeIds(), productType:'inapp' });
    return ((r && r.products) || []).filter(p => p && storeIds().includes(p.identifier)).map(p => ({ id:p.identifier, price:typeof p.priceString === 'string' ? p.priceString.slice(0, 16) : '' }));
  },
  async owned() {                          // what this Apple ID or Google account owns now, with no sign-in asked for
    const P = storePlugin(); if (!P) return [];
    const r = await P.getPurchases({ productType:'inapp', onlyCurrentEntitlements:true });
    const list = ((r && r.purchases) || []).filter(storeValid);
    await storeAcknowledge(P, list);
    return list.map(t => t.productIdentifier);
  },
  async buy(id) {
    const P = storePlugin(); if (!P) return { ok:false, why:'store' };
    try {
      const t = await P.purchaseProduct({ productIdentifier:id, productType:'inapp', quantity:1 });
      if (storeValid(t) && t.productIdentifier === id) return { ok:true, ids:[id] };
      return { ok:false, why:t && String(t.purchaseState) === '0' ? 'pending' : 'failed' };
    } catch (e) {
      const why = storeWhy(e);
      if (why !== 'owned') return { ok:false, why };
      const ids = await this.owned().catch(() => []);   // Google: already owned (bought on another device), so it is read back
      return ids.includes(id) ? { ok:true, ids } : { ok:false, why:'failed' };
    }
  },
  async restore() {                        // Restore Purchases: the store syncs (Apple may ask to sign in), then what is owned is read
    const P = storePlugin(); if (!P) return { ok:false, why:'store' };
    try { await P.restorePurchases(); return { ok:true, ids:await this.owned() }; } catch (e) { return { ok:false, why:storeWhy(e) }; }
  },
  listen(fn, gone) {                       // an Apple purchase that finishes later (Ask to Buy approved), or one revoked (a refund). The
    const P = storePlugin(); if (!P || typeof P.addListener !== 'function') return;   // plugin fires it on iOS only: Google's pending payment arrives by owned() at the next start
    P.addListener('transactionUpdated', t => { if (storeValid(t)) fn([t.productIdentifier]); else if (storeRevoked(t) && typeof gone === 'function') gone([t.productIdentifier]); });
  },
};
/* Google wants every purchase acknowledged within three days, or it refunds it. The plugin acknowledges one bought and paid in the
   same purchaseProduct, but not a pending payment (cash at a shop) paid later, which arrives only by getPurchases at the next start.
   Each of ours that Google reports Purchased and not yet acknowledged is acknowledged here, one at a time (the plugin opens a
   fresh billing connection for every call). Android only: Apple's transactions carry no isAcknowledged, and the plugin finishes
   them itself. Google's purchase token goes straight back to the plugin, on the device, and nowhere else. */
async function storeAcknowledge(P, list) {
  if (typeof P.acknowledgePurchase !== 'function') return;
  for (const t of list) {
    if (t.isAcknowledged !== false || String(t.purchaseState) !== '1' || typeof t.purchaseToken !== 'string' || !t.purchaseToken) continue;
    try { await P.acknowledgePurchase({ purchaseToken:t.purchaseToken }); } catch (e) { /* tried again at the next start */ }
  }
}
const storeStub = {                        // the web and the tests: no store, nothing sold
  async products() { return []; },
  async owned() { return []; },
  async buy() { return { ok:false, why:'store' }; },
  async restore() { return { ok:false, why:'store' }; },
  listen() {},
};
const storeApi = () => storeUse || (storeNative() && storePlugin() ? storeBackend : storeStub);
function storePricesLoad() {
  Promise.resolve().then(() => storeApi().products()).then(list => {
    for (const p of Array.isArray(list) ? list : []) if (p && typeof p.price === 'string' && p.price) storePrices[p.id] = p.price;
    storeAsked = true; storeRefresh();
  }, () => { storeAsked = true; });       // offline: the buttons go without a price, and say so when tapped (storeBuyAsk), until it answers
}
/* A product the store has not priced though it was asked (offline, or not found): tapping it says the store is out of reach at once,
   rather than after the grown-up check. */
const storeUnpriced = id => storeNative() && storeAsked && !storePrices[id];
/* In the app, once: listen for purchases that finish later, read back what is owned (no prompt, acknowledging any Google payment
   that completed since), then fetch the prices. One after the other: the plugin's Android side closes its billing connection at
   each new call, so a price request alongside could cut an acknowledgement short. */
function storeStart() {
  if (storeStarted || !storeNative()) return;
  storeStarted = true;
  const api = storeApi();
  try { api.listen(ids => storeGrant(ids), ids => storeRevoke(ids)); } catch (e) { /* no listener: Restore Purchases still reads them */ }
  Promise.resolve().then(() => api.owned()).then(storeGrant, () => {}).then(storePricesLoad);
}
