// Store: the one-off unlocks (Full Game, Super Fan of a partner club), who has them, the adapter to the app stores, the locks,
// the Unlock card and the Grown-Ups panel, and that the web with STORE_WEB_TIER 'full' plays exactly as it did before.
// node tools/store.mjs   Exits 1 on any failure.
const { T, fire } = await import('./harness.mjs');
import fs from 'node:fs';
const S = T.store, K = T.kids, X = T.teams, D = T.debug, C = T.career, I = T.importer, $ = id => document.getElementById(id);
let failed = 0, passed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } if (process.env.VERBOSE) console.log(cond ? 'ok  ' : 'FAIL', msg); };
const tick = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)); };
const memory = {};
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; } };
const saved = () => JSON.parse(memory['tryline.v1']);
const read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const html = read('index.html'), src = read('src/store.js'), ui = read('src/ui-store.js'), menus = read('src/ui-menus.js'), css = read('styles.css');
const FEATURES = ['champ', 'career', 'create', 'hard', 'import'], PAID = ['champ', 'career', 'create', 'hard'];
const opened = [];
globalThis.open = (...a) => { opened.push(a); return null; };
const pass = () => { const g = K.gate(); if (!g) return false; for (const d of g.answer) K.type(d); return true; };   // a grown-up answers the check
const cancel = () => K.close(false);
const FARNHAM = S.FAN_CLUBS[0];
$('b-grown').parentNode = $('learn-row');                  // the stand-in DOM has no parents: Grown-Ups sits in the learn row, as in index.html
const reset = () => {                                       // the web as shipped, nothing bought, nothing open
  S.setNative(null); S.setTier(null); S.setBackend(null); S.setBought([]); S.setPrices({}); S.setStarted(false);
  FARNHAM.share = 50; FARNHAM.agreed = false; S.FAN_CLUBS.length = 1; S.LINKS.ios = null; S.LINKS.android = null;
  delete navigator.userAgent;
  if (K.gate()) cancel();
  if (!$('m-store').hidden) S.close();
  delete globalThis.Capacitor;
};
// a stand-in for @capgo/native-purchases as Capacitor's bridge exposes it, recording every call
const calls = [];
let owns = [], next = null, listener = null;
const plugin = () => {
  globalThis.Capacitor = { isNativePlatform:() => true, Plugins:{ NativePurchases:{
    getProducts:async o => { calls.push(['getProducts', o]); return { products:[...o.productIdentifiers, 'someone.else'].map(id => ({ identifier:id, priceString:id === 'tryline.full' ? '£1.99' : '£3.99', title:id })) }; },
    getPurchases:async o => { calls.push(['getPurchases', o]); return { purchases:owns.map(t => (typeof t === 'string' ? { productIdentifier:t, transactionId:'1' } : t)) }; },
    purchaseProduct:async o => { calls.push(['purchaseProduct', o]); const r = next; next = null; if (r instanceof Error) throw r; return r === 'none' ? null : r || { productIdentifier:o.productIdentifier, transactionId:'9' }; },
    restorePurchases:async () => { calls.push(['restorePurchases']); if (next instanceof Error) { const e = next; next = null; throw e; } },
    addListener:async (ev, fn) => { calls.push(['addListener', ev]); listener = fn; return { remove() {} }; },
    acknowledgePurchase:async o => { calls.push(['acknowledgePurchase', o]); if (o.purchaseToken === 'fails') throw new Error('Service unavailable'); },
  } } };
};
const app = () => { reset(); plugin(); S.setNative(true); S.setStarted(true); calls.length = 0; owns = []; next = null; listener = null; };   // the app, already started (section 7 starts it)
const called = n => calls.filter(c => c[0] === n);
const android = () => Object.defineProperty(navigator, 'userAgent', { value:'Mozilla/5.0 (Linux; Android 14)', configurable:true });
const SHARE_WORDS = '% of what we receive for every Super Fan unlock goes to the club.';   // tools/listing.mjs on the listing branch holds superfan.html to the same

// 1. what ships: the tier, the products, the partner clubs and the links
{
  ok(/^const STORE_WEB_TIER = 'full';/m.test(src) && S.WEB_TIER === 'full', 'the web ships on the full tier until the app is live');
  ok(S.FULL === 'tryline.full', 'Full Game is tryline.full');
  ok(S.FAN_CLUBS.length >= 1 && FARNHAM.key === 'farnham' && FARNHAM.name === 'Farnham RUFC' && FARNHAM.product === 'tryline.fan.farnham' && FARNHAM.team === 'FAR', 'Farnham RUFC is the first partner club, tryline.fan.farnham, playing as Farnham');
  const fanSrc = src.slice(src.indexOf('const FAN_CLUBS'), src.indexOf('\n];', src.indexOf('const FAN_CLUBS')) + 3);
  ok(/\{ key:'farnham', name:'Farnham RUFC', product:'tryline\.fan\.farnham', share:50, agreed:false, team:'FAR' \}/.test(fanSrc) && FARNHAM.share === 50 && FARNHAM.agreed === false, 'Farnham\'s share is 50 (of what we receive), not yet agreed in writing: agreed:false');
  let parsed = null; try { parsed = Function('"use strict"; return (' + fanSrc.match(/=\s*(\[[\s\S]*\])/)[1] + ');')(); } catch (e) { /* not plain data */ }
  ok(Array.isArray(parsed) && JSON.stringify(parsed) === JSON.stringify(S.FAN_CLUBS), 'FAN_CLUBS is plain data, as tools/listing.mjs reads it');
  for (const c of S.FAN_CLUBS) {
    ok(c.product === 'tryline.fan.' + c.key && /^[a-z0-9]{1,24}$/.test(c.key), `${c.name}: one product a club, tryline.fan.<key>`);
    ok(c.share === null || (typeof c.share === 'number' && c.share > 0 && c.share <= 100), `${c.name}: a share is null or a percentage`);
    ok(typeof c.agreed === 'boolean' && (!c.agreed || c.share !== null), `${c.name}: agreed is true or false, and true only with a share`);
    ok(!!S.teamOf(c) && X.ALL_TEAMS.includes(S.teamOf(c)), `${c.name}: its side is in the game, for its kit and to be offered first`);
  }
  ok(!S.ids().includes('tryline.fan') && !/'tryline\.fan'/.test(src + ui), 'no generic tryline.fan with no club share');
  ok(new Set(S.ids()).size === S.ids().length, 'every product id is its own');
  ok(['privacy', 'support'].every(k => /^https:\/\/gordonlindsay\.github\.io\/games\/trylinerugby\/[a-z]+\.html$/.test(S.LINKS[k])), 'privacy and support open the pages GitHub Pages serves');
  ok(S.WEB_TIER !== 'free' || /^https:\/\//.test(S.LINKS.ios || ''), 'the free tier cannot ship without the App Store link for Get the App (Google Play is phase 2)');
  ok(JSON.parse(read('src/manifest.json')).includes('store.js') && JSON.parse(read('src/manifest.json')).includes('ui-store.js'), 'store.js and ui-store.js are built into the game');
  ok(/'store'/.test(read('tools/check.mjs').match(/\.\.\.\[([^\]]*)\]\.map/)[1]), 'this suite is in the default checks');
}

// 2. the web, as shipped ('full'): everything unlocked and nothing of the store shows, so it plays exactly as before
{
  reset();
  ok(!S.native() && !S.live(), 'the web is not the app, and the store is not live');
  ok(FEATURES.every(f => S.has(f)), 'every feature is unlocked');
  ok(S.fan() === null && S.offers(null).length === 0 && S.offers('champ').length === 0, 'no Super Fan and nothing on sale');
  S.setBought(['tryline.full', 'tryline.fan.farnham']);
  ok(S.fan() === null && FEATURES.every(f => S.has(f)), 'purchases are the app\'s: the web never reads them');
  S.setBought([]);
  // index.html: every new element starts hidden, so the page is as it was before a line of script runs
  ok(/<button class="btn" id="b-grown" hidden>Grown-Ups<\/button>/.test(html) && /<p class="eyebrow st-fan" id="st-fan" hidden><\/p>/.test(html) && /<div class="modal" id="m-store" hidden>/.test(html) && /<span id="st-locked" hidden>Locked<\/span>/.test(html), 'Grown-Ups, the badge, the card and the Locked note start hidden');
  // the home: storeRender changes nothing while the store is not live
  const els = ['b-champ', 'b-career', 'b-grown', 'st-fan', 'home-tag', 'learn-row', 't-create', 't-import'].map($);
  const seg = document.querySelectorAll('.seg[data-key]').find(g => g.dataset.key === 'diff');
  const look = () => JSON.stringify([...els, ...seg.children].map(e => [e.hidden, e.classList.contains('locked'), e.classList.contains('three')]));
  $('b-grown').hidden = true; $('st-fan').hidden = true;
  const before = look();
  const sets = [], keep = els.map(e => e.setAttribute);
  els.forEach((e, i) => { e.setAttribute = (...a) => { sets.push([e.id, ...a]); return keep[i].apply(e, a); }; });
  D.goHome(); S.render(); S.teamsRender();
  ok(look() === before && !sets.length, 'rendering the home and the team screen touches no control: no lock, no Grown-Ups, no badge, no thirds');
  els.forEach((e, i) => { e.setAttribute = keep[i]; });
  const s = D.settings(); s.diff = 2; s.twoDiff = [2, 2]; D.goHome();
  ok(s.diff === 2 && s.twoDiff.join() === '2,2', 'Hard stays Hard, one player and two');
  s.diff = 1; s.twoDiff = [1, 1];
  // every way in goes ahead, with no card
  X.setChamp(null); $('b-champ').click();
  ok($('m-store').hidden && D.pickMode() === 'champ' && !$('s-teams').hidden, 'Championship opens its team screen');
  C.set(null); $('cn-clubs').innerHTML = ''; C.open();
  ok($('m-store').hidden && /data-i="0"/.test($('cn-clubs').innerHTML), 'Career opens the new player screen');
  T.stamina.openBuilder(null);
  ok($('m-store').hidden && !$('s-build').hidden, 'Create Team opens the builder');
  I.open();
  ok($('m-store').hidden && !$('m-import').hidden && I.state().step === 'web', 'Import Club opens its card, which says it works in the app');
  $('im-back').click(); D.goHome();
  ok(I.card().includes('t-import'), 'and the Import Club card is on the team screen as before');
  // the save: byte for byte what it was, with no store field while nothing is bought
  X.save();
  ok(Object.keys(saved()).join() === 'settings,champ,custom,champHistory,seasonSerial,career,importLeague', `a web save has the same fields as before (${Object.keys(saved()).join(', ')})`);
  ok(D.startMatch && T.newMatch && typeof S.gate === 'function', 'the engine API is untouched');
}

// 3. the save field: validated, kept in order, and never in the way of an old save
{
  reset();
  ok(S.clean({ owned:['tryline.full', 'tryline.fan.farnham', 'tryline.full', 7, null, 'tryline.fan', 'tryline.fan.', 'TRYLINE.FULL', 'tryline.fan.a-b', 'tryline.fan.' + 'x'.repeat(25), 'com.other.app'] }).join() === 'tryline.full,tryline.fan.farnham', 'only well-formed product ids are kept, each once');
  ok(S.clean(null).length === 0 && S.clean('x').length === 0 && S.clean([]).length === 0 && S.clean({ owned:'tryline.full' }).length === 0, 'a missing or broken field is nothing bought');
  ok(S.clean({ owned:['tryline.fan.oldclub'] }).join() === 'tryline.fan.oldclub', 'a club since dropped from FAN_CLUBS stays bought in the save');
  ok(S.clean({ owned:Array.from({ length:50 }, (_, i) => 'tryline.fan.c' + i) }).length === 32, 'at most 32 are read');
  S.setBought(['tryline.full']); X.save();
  ok(JSON.stringify(saved().store) === '{"owned":["tryline.full"]}', 'a purchase is saved as store:{ owned }');
  S.setBought([]); X.load();
  ok(S.bought().join() === 'tryline.full', 'and loads back');
  X.restore({ settings:{ sound:true } });
  ok(S.bought().join() === 'tryline.full', 'a save without the field leaves purchases as they are');
  X.restore({ store:{ owned:'junk' } });
  ok(S.bought().length === 0, 'a broken field reads as nothing bought');
  S.setBought([]);
}

// 4. the web from launch ('free'): the free tier, locks, Get the App; saves under way kept, locked
{
  reset(); S.setTier('free');
  ok(S.live() && !S.native(), 'the free web is live, and not the app');
  ok(['quick', 'drills', 'kids', 'easy', 'normal', 'help', 'two'].every(f => S.has(f)), 'Quick Match, the Training Ground, Kids, Easy, Normal, How to Play and Two Player are free');
  ok(PAID.every(f => !S.has(f)) && !S.has('import'), 'Championship, Career, Create Team, Hard and Import are locked');
  // an Android browser, while there is no Google Play page (iPhone first): no lock with no app to get, everything as before
  android();
  ok(S.tier() === 'full' && !S.live() && FEATURES.every(f => S.has(f)), 'an Android browser stays on the full tier until the Google Play link is set');
  D.goHome();
  ok(!$('b-champ').classList.contains('locked') && $('b-grown').hidden && !$('learn-row').classList.contains('three'), 'and its home has no lock and no Grown-Ups');
  S.LINKS.android = 'https://play.google.com/store/apps/details?id=x';
  ok(S.tier() === 'free' && S.live() && PAID.every(f => !S.has(f)) && S.appLink() === S.LINKS.android, 'once it is set: the free tier, and Get the App opens Google Play');
  S.LINKS.android = null; delete navigator.userAgent;
  ok(S.tier() === 'free', 'everywhere else the free tier needs only the App Store link');
  S.setBought(['tryline.full', 'tryline.fan.farnham']);
  ok(FEATURES.every(f => !S.has(f)) && S.fan() === null && S.offers(null).length === 0, 'nothing bought counts on the web, and nothing is sold there');
  S.setBought([]);
  // a web save with a championship and a career under way, flipped to free: kept, locked, untouched
  X.newChamp(X.CLUBS[0], X.CLUBS.slice(1, 6));
  C.set(null); C.set(C.create({ name:'Sam', pos:'B', num:5, club:X.CLUBS[0] }));
  X.save(); X.load();
  const c0 = JSON.stringify(X.champ()), cr0 = JSON.stringify(C.get());
  D.goHome();
  ok($('b-champ').classList.contains('locked') && $('b-champ').textContent === 'Continue Championship' && !$('champ-note').hidden, 'Continue Championship keeps its label and its note, with a lock');
  ok($('b-career').classList.contains('locked') && $('b-career').textContent === 'Continue Career', 'Continue Career likewise');
  const seg = document.querySelectorAll('.seg[data-key]').find(g => g.dataset.key === 'diff');
  ok(!$('b-grown').hidden && $('learn-row').classList.contains('three'), 'Grown-Ups joins How to Play and Training Ground in thirds');
  $('b-champ').click();
  ok(!$('m-store').hidden && S.ui().mode === 'unlock' && S.ui().feature === 'champ' && $('s-hub').hidden && !$('s-home').hidden, 'Championship opens the Unlock card, not the hub');
  ok($('st-eyebrow').textContent === 'Unlock' && $('st-title').textContent === 'Championship', 'Unlock · Championship');
  ok($('st-offers').innerHTML === '' && $('st-restore').hidden, 'with no App Store link yet: nothing to buy here and no Restore Purchases on the web');
  S.close();
  C.open();
  ok(!$('m-store').hidden && S.ui().feature === 'career' && !$('s-home').hidden, 'Career opens the Unlock card, not the career');
  S.close();
  ok(JSON.stringify(X.champ()) === c0 && JSON.stringify(C.get()) === cr0, 'the championship and the career are untouched in memory');
  X.save();
  ok(JSON.stringify(saved().champ) === c0 && JSON.stringify(saved().career) === cr0, 'and in the save');
  S.setTier(null); D.goHome();
  ok(!$('b-champ').classList.contains('locked') && !$('b-career').classList.contains('locked') && $('b-grown').hidden && !$('learn-row').classList.contains('three'), 'back on the full tier the locks and Grown-Ups go');
  $('b-champ').click();
  ok($('m-store').hidden && !$('s-hub').hidden, 'and Continue Championship goes to the hub');
  D.goHome();
  S.setTier('free');
  // Hard: a saved Hard plays as Normal while locked, one player and two
  const s = D.settings(); s.diff = 2; s.kids = false; s.twoDiff = [2, 0];
  D.goHome();
  ok(s.diff === 1 && s.twoDiff.join() === '1,0', 'a saved Hard is played as Normal while Hard is locked');
  ok(S.gate('hard') === false && !$('m-store').hidden && S.ui().feature === 'hard' && $('st-title').textContent === 'Hard', 'pressing Hard opens the Unlock card');
  S.close();
  ok(/if \(key === 'diff' && i === 3 && !storeGate\('hard'/.test(menus) && /if \(i === 2 && !storeGate\('hard'/.test(menus), 'the home\'s Hard and each Two Player Hard go through the gate first');
  // Get the App: once the links are in, through the grown-up check, the store for the device
  S.LINKS.ios = 'https://apps.apple.com/app/id1';
  S.open({ mode:'unlock', feature:'champ' });
  ok(/id="st-app">Get the App<small class="hsub">Championship · Career · Create Team · Hard<\/small>/.test($('st-offers').innerHTML), 'Get the App, with what the Full Game holds');
  ok(S.appLink() === S.LINKS.ios, 'the App Store from a computer or an iPhone');
  android();
  ok(S.appLink() === null, 'an Android phone gets no App Store link (it stays on the full tier, above)');
  S.LINKS.android = 'https://play.google.com/store/apps/details?id=x';
  ok(S.appLink() === S.LINKS.android, 'Google Play from an Android phone, once it is set');
  delete navigator.userAgent; S.LINKS.android = null;
  opened.length = 0;
  S.leave(S.appLink());
  ok(!!K.gate() && $('m-store').hidden && !opened.length, 'Get the App asks a grown-up first, with the card hidden');
  cancel();
  ok(!K.gate() && !$('m-store').hidden && !opened.length, 'cancelled: the card is back and nothing opens');
  S.leave(S.appLink()); pass();
  ok(opened.length === 1 && opened[0][0] === S.LINKS.ios && opened[0][1] === '_blank' && /noopener/.test(opened[0][2]), 'passed: the store page opens in a new tab with no way back into the page');
  S.close();
  S.open({ mode:'unlock', feature:'import' });
  ok(/id="st-app">Get the App<\/button>/.test($('st-offers').innerHTML), 'for Import Club, Get the App without the Full Game\'s list (Import is the Super Fan\'s)');
  S.close();
  S.open({ mode:'grown' });
  ok($('st-eyebrow').textContent === 'Grown-Ups' && !$('st-links').hidden && $('st-back').textContent === 'Back to Menu' && $('st-restore').hidden && $('st-row').classList.contains('one'), 'the web Grown-Ups panel: Get the App, Privacy | Support, and Back to Menu alone');
  S.close();
  X.setChamp(null); C.set(null); X.save();
}

// 5. the app: nothing bought
{
  app();
  ok(S.native() && S.live() && S.api() === S.backend, 'in the app the adapter talks to the plugin');
  ok(PAID.every(f => !S.has(f)) && !S.has('import') && S.has('quick'), 'the free tier, and nothing more');
  ok(S.offers('champ').map(o => o.id).join() === 'tryline.full', 'while Farnham has not agreed its share in writing only the Full Game is on sale');
  ok(!S.offers(null).some(o => o.kind === 'fan') && !S.offers('import').length, 'no Super Fan offer anywhere');
  ok(!S.offered('import') && I.card() === '', 'and Import Club, which only Super Fan unlocks, is not on the team screen');
  S.open({ mode:'unlock', feature:'champ' });
  ok(!/tryline\.fan|Super Fan|Supports/.test($('st-offers').innerHTML), 'the card shows no Super Fan offer and no share line');
  S.close();
  for (const a of [false, undefined, 'true', 1, null]) { FARNHAM.agreed = a; ok(!S.offers(null).some(o => o.kind === 'fan') && !S.offered('import'), `agreed ${String(a)}: no Super Fan offer, even with its share of 50`); }
  FARNHAM.agreed = true; FARNHAM.share = null;
  ok(!S.offers(null).some(o => o.kind === 'fan'), 'agreed with no share stated: no offer either');
  // the share set and agreed in writing: the offer and its sentence
  FARNHAM.share = 50;
  ok(S.offers('champ').map(o => o.id).join() === 'tryline.full,tryline.fan.farnham' && S.offers('import').map(o => o.id).join() === 'tryline.fan.farnham', 'agreed, with its share: the Super Fan offer joins the Full Game, and alone unlocks Import');
  ok(S.shareLine(FARNHAM) === 'Supports Farnham RUFC: 50' + SHARE_WORDS, 'the share sentence says what the club gets: a share of what we receive, not of the price');
  ok(!/(?:%|\bshare)\s+of\s+(?:each|every)\s+Super Fan unlock/i.test(src + ui + read('store/README.md') + read('README.md')), 'nowhere is the share stated as of every unlock (the price)');
  for (const bad of [0, -5, 101, NaN, '20', Infinity]) { FARNHAM.share = bad; ok(!S.offers(null).some(o => o.kind === 'fan'), `a share of ${String(bad)} is not a share: no offer`); }
  FARNHAM.share = 50;
  ok(S.offered('import') && I.card().includes('t-import'), 'Import Club is on the team screen once a Super Fan club is on sale');
  S.open({ mode:'unlock', feature:'champ' });
  ok(/data-buy="tryline\.full"/.test($('st-offers').innerHTML) && /data-buy="tryline\.fan\.farnham"/.test($('st-offers').innerHTML) && $('st-offers').innerHTML.includes('Supports Farnham RUFC: 50' + SHARE_WORDS), 'the card: Full Game, Super Fan · Farnham RUFC and its share');
  ok($('st-offers').innerHTML.replace(/\u00a0/g, ' ').includes('Full Game · Import Club · Super Fan Badge') && $('st-offers').innerHTML.includes('Super\u00a0Fan\u00a0Badge') && !/Club Badge/.test(ui.replace('Super Fan Badge', '')), 'the Super Fan perks: Full Game, Import Club and the Super Fan Badge (the shirt and name, never a crest)');
  ok(!$('st-restore').hidden && !$('st-row').classList.contains('one') && $('st-links').hidden && $('st-back').textContent === 'Back to Menu', 'Restore Purchases | Back to Menu under them');
  S.close();
  // locks
  D.goHome();
  ok(['b-champ', 'b-career'].every(id => $(id).classList.contains('locked')) && !$('b-grown').hidden, 'Championship and Career locked, Grown-Ups on the home');
  S.teamsRender();
  ok($('t-create').classList.contains('locked') && $('t-import').classList.contains('locked'), 'Create Team and Import Club locked');
  T.stamina.openBuilder(null);
  ok(!$('m-store').hidden && S.ui().feature === 'create' && $('s-build').hidden && !$('s-home').hidden, 'Create Team opens the Unlock card, not the builder');
  S.close();
  D.openTeams('quick'); I.open();
  ok(!$('m-store').hidden && S.ui().feature === 'import' && $('m-import').hidden, 'Import Club opens the Unlock card, not the import');
  ok($('st-back').textContent === 'Back to Teams', 'and its Back says where it goes: Back to Teams');
  D.goHome();
  S.close();
}

// 6. the app: buying, through the grown-up check, checked before anything unlocks
{
  app(); FARNHAM.agreed = true; X.setChamp(null);
  let went = 0;
  S.gate('champ', () => went++);
  S.buyAsk('tryline.full');
  ok(!!K.gate() && $('m-store').hidden && !called('purchaseProduct').length, 'Full Game asks a grown-up first, the card hidden, nothing bought yet');
  cancel();
  ok(!K.gate() && !$('m-store').hidden && !called('purchaseProduct').length, 'cancelled: the card is back and nothing is bought');
  S.buyAsk('tryline.full'); pass(); await tick();
  const p = called('purchaseProduct');
  ok(p.length === 1 && JSON.stringify(p[0][1]) === '{"productIdentifier":"tryline.full","productType":"inapp","quantity":1}', 'passed: the plugin\'s purchaseProduct, a one-off in-app product, nothing about the player');
  ok(S.bought().join() === 'tryline.full' && saved().store.owned.join() === 'tryline.full', 'bought, and saved');
  ok(PAID.every(f => S.has(f)) && !S.has('import') && S.fan() === null, 'the Full Game: Championship, Career, Create Team and Hard; not Import');
  ok($('m-store').hidden && went === 1, 'the card closes and carries on into what was asked for');
  D.goHome();
  ok(!$('b-champ').classList.contains('locked') && !$('b-career').classList.contains('locked'), 'the locks go');
  ok(S.offers('champ').length === 0 && S.offers(null).map(o => o.id).join() === 'tryline.fan.farnham', 'the Full Game is not offered again; Super Fan still is');
  // each way a purchase can fail, and none unlocks anything
  const tries = [
    [Object.assign(new Error('User cancelled'), {}), '', 'cancelled on iOS'],
    [Object.assign(new Error('USER_CANCELED'), { code:'USER_CANCELED' }), '', 'cancelled on Android'],
    [new Error('Transaction pending'), S.MSG.pending, 'Ask to Buy, waiting'],
    [new Error('Purchase is pending'), S.MSG.pending, 'Google\'s pending payment'],
    [{ productIdentifier:'tryline.fan.farnham', purchaseState:'0' }, S.MSG.pending, 'a transaction still pending'],
    [{ productIdentifier:'tryline.fan.other' }, S.MSG.failed, 'a transaction for another product'],
    [{ productIdentifier:'tryline.fan.farnham', revocationDate:'2026-01-01' }, S.MSG.failed, 'a revoked transaction'],
    ['none', S.MSG.failed, 'no transaction'],
    [new Error('Network down'), S.MSG.failed, 'an error'],
  ];
  for (const [r, msg, what] of tries) {
    S.open({ mode:'grown' }); next = r;
    S.buyAsk('tryline.fan.farnham'); pass(); await tick();
    ok(S.bought().join() === 'tryline.full' && S.fan() === null && $('st-msg').textContent === msg && $('st-msg').hidden === !msg && !S.ui().busy, `${what}: nothing unlocked${msg ? ', "' + msg + '"' : ', and no message'}`);
    S.close();
  }
  // Google: already owned (bought on another device): read back from the store
  owns = ['tryline.fan.farnham']; next = Object.assign(new Error('ITEM_ALREADY_OWNED'), { code:'ITEM_ALREADY_OWNED' });
  S.open({ mode:'unlock', feature:'import' }); S.buyAsk('tryline.fan.farnham'); pass(); await tick();
  ok(S.fan() && S.fan().key === 'farnham' && S.has('import') && $('m-store').hidden, 'already owned: read back from the store and unlocked');
  ok(called('getPurchases').every(c => c[1].onlyCurrentEntitlements === true && c[1].productType === 'inapp'), 'reading back asks for current entitlements only (no sign-in prompt)');
  // a card closed while the store's sheet is up: the purchase still stands
  app(); FARNHAM.agreed = true;
  let resolve; globalThis.Capacitor.Plugins.NativePurchases.purchaseProduct = o => new Promise(r => { resolve = () => r({ productIdentifier:o.productIdentifier }); });
  S.open({ mode:'unlock', feature:'champ' }); S.buyAsk('tryline.full'); pass(); await tick(2);
  ok(S.ui().busy, 'busy while the store\'s sheet is up');
  S.close(); resolve(); await tick();
  ok(S.bought().join() === 'tryline.full' && $('m-store').hidden, 'closed meanwhile: bought all the same, and nothing reopens');
  ok(S.buyAsk('com.other') === undefined && !K.gate(), 'an id that is not ours is never offered to the check');
}

// 7. Restore Purchases, the start, and purchases that finish later
{
  app(); FARNHAM.agreed = true;
  S.open({ mode:'grown' });
  S.restoreAsk();
  ok(!!K.gate() && !called('restorePurchases').length, 'Restore Purchases asks a grown-up first');
  cancel();
  owns = ['tryline.full', { productIdentifier:'tryline.fan.farnham', revocationDate:'2026-02-02' }, { productIdentifier:'tryline.full', purchaseState:'1' }, 'com.someone.else'];
  S.restoreAsk(); pass(); await tick();
  ok(called('restorePurchases').length === 1 && called('getPurchases').length === 1, 'passed: the store syncs, then what is owned is read');
  ok(S.bought().join() === 'tryline.full' && $('st-msg').textContent === S.MSG.restored, 'restored: the Full Game (not the revoked Super Fan, not another app\'s)');
  S.restoreAsk(); pass(); await tick();
  ok($('st-msg').textContent === S.MSG.same, 'again: up to date');
  app(); S.open({ mode:'grown' });
  S.restoreAsk(); pass(); await tick();
  ok(S.bought().length === 0 && $('st-msg').textContent === S.MSG.none, 'nothing bought: no purchases to restore');
  next = new Error('Network error'); S.restoreAsk(); pass(); await tick();
  ok($('st-msg').textContent === S.MSG.store, 'offline: could not reach the store');
  next = new Error('User cancelled'); S.restoreAsk(); pass(); await tick();
  ok($('st-msg').hidden, 'the Apple ID sign-in cancelled: no message');
  S.close();
  // restoring from a locked control carries on into it
  owns = ['tryline.full']; let went = 0;
  S.gate('career', () => went++); S.restoreAsk(); pass(); await tick();
  ok(S.has('career') && $('m-store').hidden && went === 1, 'restored from Career\'s Unlock card: it closes and opens Career');
  // the start, in the app: listen, read back silently, fetch prices
  app(); FARNHAM.agreed = true; owns = ['tryline.full']; S.setStarted(false);
  D.goHome(); await tick();
  ok(S.started() && called('addListener').length === 1 && called('addListener')[0][1] === 'transactionUpdated', 'on the home, once: a listener for purchases that finish later');
  ok(called('getPurchases').length === 1 && !called('restorePurchases').length && S.bought().join() === 'tryline.full', 'what is owned is read back with no prompt (no restorePurchases)');
  const gp = called('getProducts');
  ok(gp.length === 1 && gp[0][1].productIdentifiers.join() === 'tryline.full,tryline.fan.farnham' && gp[0][1].productType === 'inapp', 'prices are asked for our products only');
  ok(S.prices()['tryline.full'] === '£1.99' && !('someone.else' in S.prices()), 'and kept for ours alone');
  D.goHome(); await tick();
  ok(called('addListener').length === 1 && called('getPurchases').length === 1, 'and only once');
  S.open({ mode:'grown' });
  ok(/Super Fan · Farnham RUFC · £3\.99/.test($('st-offers').innerHTML), 'the store\'s own price on the button');
  S.close();
  listener({ productIdentifier:'tryline.fan.farnham', transactionId:'5' }); await tick();
  ok(S.fan() && S.fan().name === 'Farnham RUFC' && saved().store.owned.join() === 'tryline.full,tryline.fan.farnham', 'Ask to Buy approved later: the Super Fan arrives by the listener, and is saved');
  listener({ productIdentifier:'tryline.full', purchaseState:'0' }); listener({ productIdentifier:'evil' }); await tick();
  ok(S.bought().join() === 'tryline.full,tryline.fan.farnham', 'a pending or foreign transaction from the listener changes nothing');
  owns = []; S.setStarted(false); D.goHome(); await tick();
  ok(S.bought().length === 2, 'a store that answers with less (offline, signed out) never takes a purchase away');
  ok(!called('acknowledgePurchase').length, 'nothing to acknowledge: Apple\'s transactions carry no isAcknowledged');
  // Android: a pending Google payment paid since is acknowledged at the next start (Google refunds it after three days otherwise)
  app(); S.setStarted(false);
  owns = [
    { productIdentifier:'tryline.fan.farnham', purchaseState:'1', isAcknowledged:false, purchaseToken:'tok-fan' },
    { productIdentifier:'tryline.full', purchaseState:'1', isAcknowledged:true, purchaseToken:'tok-full' },
    { productIdentifier:'tryline.fan.other', purchaseState:'0', isAcknowledged:false, purchaseToken:'tok-pending' },
    { productIdentifier:'com.someone.else', purchaseState:'1', isAcknowledged:false, purchaseToken:'tok-foreign' },
  ];
  D.goHome(); await tick(12);
  ok(called('acknowledgePurchase').map(c => c[1].purchaseToken).join() === 'tok-fan' && JSON.stringify(called('acknowledgePurchase')[0][1]) === '{"purchaseToken":"tok-fan"}', 'paid and not acknowledged: acknowledged with its token alone; not one already acknowledged, still pending or another app\'s');
  ok([...S.bought()].sort().join() === 'tryline.fan.farnham,tryline.full', `and both purchases are kept (${S.bought().join(', ')})`);
  const order = calls.map(c => c[0]).filter(n => n !== 'addListener');
  ok(order.join() === 'getPurchases,acknowledgePurchase,getProducts', `one after the other: read, acknowledge, then the prices (${order.join(', ')})`);
  app(); S.setStarted(false);
  owns = [{ productIdentifier:'tryline.fan.farnham', purchaseState:'1', isAcknowledged:false, purchaseToken:'fails' }, { productIdentifier:'tryline.full', purchaseState:'1', isAcknowledged:false, purchaseToken:'tok-full' }];
  D.goHome(); await tick(12);
  ok(called('acknowledgePurchase').length === 2 && S.bought().join() === 'tryline.fan.farnham,tryline.full' && called('getProducts').length === 1, 'an acknowledgement that fails stops nothing: the next is tried, both unlock, and it is tried again at the next start');
  delete globalThis.Capacitor.Plugins.NativePurchases.acknowledgePurchase; S.setBought([]); S.setStarted(false); D.goHome(); await tick(12);
  ok(S.bought().length === 2, 'a plugin without acknowledgePurchase still reads back what is owned');
  // Ask to Buy approved while the Unlock card is still open: it closes and carries on into what was asked for
  app(); S.setStarted(false); D.goHome(); await tick(12);
  let wentOn = 0;
  S.gate('career', () => wentOn++);
  next = new Error('Transaction pending'); S.buyAsk('tryline.full'); pass(); await tick();
  ok(!$('m-store').hidden && $('st-msg').textContent === S.MSG.pending && !wentOn, 'Ask to Buy: the card waits for a grown-up to approve it');
  listener({ productIdentifier:'tryline.full', transactionId:'7' }); await tick();
  ok(S.has('career') && $('m-store').hidden && wentOn === 1 && S.ui().msg === '', 'approved while the card is open: it closes, with no stale message, and Career opens');
  // the same in the Grown-Ups panel: the panel stays, shows what is owned, and drops the waiting message
  app(); S.setStarted(false); D.goHome(); await tick(12);
  S.open({ mode:'grown' });
  next = new Error('Transaction pending'); S.buyAsk('tryline.full'); pass(); await tick();
  ok($('st-msg').textContent === S.MSG.pending, 'Grown-Ups: waiting for a grown-up');
  listener({ productIdentifier:'tryline.full', transactionId:'8' }); await tick();
  ok(!$('m-store').hidden && $('st-msg').hidden && $('st-have').innerHTML.includes('Full Game Unlocked'), 'approved: the panel stays, the message goes, and it shows the Full Game unlocked');
  S.close();
  // a pending unlock for a feature it does not open (Full Game from Import Club's card) leaves the card up, message cleared
  app(); FARNHAM.agreed = true; S.setStarted(false); D.goHome(); await tick(12);
  S.open({ mode:'unlock', feature:'import' }); S.ui().msg = S.MSG.pending; S.cardRender();
  listener({ productIdentifier:'tryline.full', transactionId:'9' }); await tick();
  ok(!$('m-store').hidden && S.ui().feature === 'import' && $('st-msg').hidden, 'the Full Game arriving on Import Club\'s card: still locked, so the card stays, its message gone');
  S.close();
  // the web never starts the store
  reset(); calls.length = 0; plugin(); S.setNative(false); D.goHome(); await tick();
  ok(!S.started() && !calls.length, 'on the web nothing is asked of a store, even where a plugin is present');
  delete globalThis.Capacitor;
}

// 8. Super Fan: the badge, Import, and the club offered first
{
  app(); FARNHAM.agreed = true; S.setBought(['tryline.fan.farnham']);
  ok(FEATURES.every(f => S.has(f)) && JSON.stringify(S.fan()) === '{"key":"farnham","name":"Farnham RUFC"}', 'Super Fan: everything in the Full Game, and Import; storeFan names the club');
  D.goHome();
  ok(!$('st-fan').hidden && $('st-fan').innerHTML.includes('Super Fan · Farnham RUFC') && $('st-fan').innerHTML.includes('--kit:#1a1a1a') && $('home-tag').hidden, 'the home\'s badge: Farnham\'s kit and the club\'s name, in the tagline\'s place');
  ok(S.offers(null).length === 0, 'nothing more to sell');
  S.open({ mode:'grown' });
  ok($('st-title').textContent === 'Purchases' && $('st-have').innerHTML.includes('Super Fan · Farnham RUFC') && $('st-offers').innerHTML === '' && !$('st-links').hidden && $('st-back').textContent === 'Back to Menu', 'the Grown-Ups panel: what is owned, Privacy | Support, Restore Purchases | Back to Menu');
  S.close();
  ok(I.card().includes('t-import'), 'Import Club is on the team screen');
  I.open();
  ok($('m-store').hidden && !$('m-import').hidden, 'and opens the import');
  $('im-back').click();
  // a second partner club, to see it first in Career and Championship (Farnham is first already)
  S.FAN_CLUBS.push({ key:'guildford', name:'Guildford RFC', product:'tryline.fan.guildford', share:50, agreed:true, team:'GUI' });
  S.grant(['tryline.fan.guildford']);
  ok(S.fan().key === 'guildford', 'the latest Super Fan unlock is the club shown');
  C.set(null); C.newOpen();
  const cn = $('cn-clubs').innerHTML;
  ok(cn.indexOf('Guildford') > 0 && cn.indexOf('Guildford') < cn.indexOf('Farnham') && /--kit:#1a1e4f/.test($('cn-shirt').innerHTML), 'Career\'s new player: Guildford first, and picked');
  X.setChamp(null); D.goHome(); $('b-champ').click();
  ok(D.settings().pool === 1 && $('t-default').textContent === 'Play as Guildford' && !$('t-default').hidden, 'Championship opens on the club\'s list with Play as Guildford');
  ok(/data-i="0"[^>]*>[\s\S]*?Guildford/.test($('t-grid').innerHTML.split('data-i="1"')[0]), 'Guildford is the first card');
  S.FAN_CLUBS.push({ key:'toulouse', name:'Toulouse', product:'tryline.fan.toulouse', share:50, agreed:true, team:'TLS' });
  S.grant(['tryline.fan.toulouse']);
  ok(S.homePool() === 2, 'a club in another list opens that list');
  ok(S.first([X.CLUBS[0], X.FRANCE[1], X.FRANCE[0]]).map(t => t.id).join() === 'TLS,FAR,BOR', 'storeFirst moves the club to the front and keeps the rest in order');
  ok(S.first([{ ...X.FRANCE[0], custom:true }, X.CLUBS[0]])[0].custom, 'a team made by the player is never taken for the club');
  S.setBought([]);
  ok(S.homePool() === 1 && S.homeTeam() === X.CLUBS[0], 'no Super Fan: Local, Farnham, as before');
  S.setBought(['tryline.fan.oldclub']);
  ok(FEATURES.every(f => S.has(f)) && S.fan() === null && S.offers('champ').length === 0, 'a Super Fan of a club since dropped keeps everything it unlocked, with no badge');
  // careerClubs: the Super Fan's club first on the new player screen
  S.setBought(['tryline.fan.guildford']);
  const careerSrc = read('src/ui-career.js');
  ok(/const careerClubs = \(\) => storeFirst\(\[\.\.\.CLUBS, \.\.\.custom\]\)/.test(careerSrc), 'Career\'s club list puts the Super Fan\'s club first');
  ok(/if \(pickMode === 'champ'\) teamList = storeFirst\(teamList\)/.test(menus), 'and so does Championship\'s team screen');
  S.setBought([]); D.goHome();
  ok($('st-fan').hidden && !$('home-tag').hidden, 'no Super Fan: the tagline is back');
}

// 9. leaving the game: Privacy and Support, only through the grown-up check
{
  for (const where of ['web', 'app']) {
    if (where === 'app') app(); else { reset(); S.setTier('free'); }
    S.open({ mode:'grown' }); opened.length = 0;
    for (const [id, url] of [['st-privacy', S.LINKS.privacy], ['st-support', S.LINKS.support]]) {
      $(id).click();
      ok(!!K.gate() && !opened.length, `${where}: ${id.slice(3)} asks a grown-up first`);
      pass();
      const o = opened.pop();
      ok(o && o[0] === url && o[1] === '_blank' && (where === 'app' ? o.length === 2 : /noopener/.test(o[2])), `${where}: then opens ${url}${where === 'app' ? ' for the system browser' : ' in a new tab'}`);
    }
    S.leave('http://example.com'); S.leave('javascript:alert(1)');
    ok(!K.gate() && !opened.length, `${where}: only https links leave, and nothing else is asked`);
    S.close();
  }
  ok(!/window\.open|location\.href|location\.assign/.test(src) && (ui.match(/window\.open\(/g) || []).length === 2 && /function storeOpenUrl/.test(ui), 'storeOpenUrl is the one place the store leaves the game');
  ok(/storeLeave\(STORE_LINKS\.privacy\)/.test(ui) && /storeLeave\(STORE_LINKS\.support\)/.test(ui) && /storeLeave\(link\)/.test(ui), 'Privacy, Support and Get the App all go through storeLeave');
  ok(/function storeAsk\(go\)[\s\S]*?parentGate\(/.test(ui) && /function storeBuyAsk[^\n]*storeAsk\(/.test(ui) && /function storeRestoreAsk[^\n]*storeAsk\(/.test(ui) && /function storeLeave[^\n]*storeAsk\(/.test(ui), 'buying, restoring and leaving all ask through parentGate');
}

// 10. the card's controls: a controller, the keyboard, and Back
{
  app(); FARNHAM.agreed = true;
  S.open({ mode:'unlock', feature:'champ' });
  ok(/data-back/.test(html.slice(html.indexOf('id="st-back"') - 40, html.indexOf('id="st-back"') + 60)), 'Back is the card\'s data-back, so a controller\'s Back closes it');
  ok(/DEFAULT_FOCUS\['m-store'\] = storeFocusEl/.test(ui), 'a controller\'s first press lands on the first offer');
  fire('keydown', { key:'Escape' });
  ok($('m-store').hidden, 'Escape closes it');
  S.open({ mode:'unlock', feature:'champ' }); S.buyAsk('tryline.full');
  fire('keydown', { key:'Escape', stopPropagation() {}, preventDefault() { this.defaultPrevented = true; } });
  ok(!K.gate() && !$('m-store').hidden, 'over it, the grown-up check takes Escape first: the check shuts, the card stays');
  S.close();
  const block = html.slice(html.indexOf('<div class="modal" id="m-store"'), html.indexOf('<div class="modal" id="m-gate"'));
  ok((block.match(/<button class="btn"/g) || []).length === 5 && /id="st-reset" hidden>Reset Kids Level</.test(block) && !/<a[\s>]|href=/.test(block), 'Privacy, Support, Reset Kids Level, Restore Purchases and Back are buttons, never links');
  ok(/aria-modal="true"/.test(block) && /role="status"/.test(block), 'a dialog, and its message is read out');
  const z = sel => { let v = null; for (const m of css.matchAll(new RegExp('(?:^|[},\\s])' + sel.replace(/[.#]/g, '\\$&') + '\\{[^}]*z-index:(\\d+)', 'g'))) v = +m[1]; return v; };
  ok(z('.modal') < z('#m-gate'), 'the grown-up check sits over the card');
}

// 11. copy: Title Case labels, the share in words, never a donation, no em dash or arrow
{
  const SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'on', 'to', 'in', 'for', 'as', 'at', 'by']);
  const title = s => s.split(/[ ·]+/).filter(Boolean).every((w, i) => (i > 0 && SMALL.has(w)) || /^[A-Z0-9£]/.test(w));
  const labels = ['Grown-Ups', 'Unlock', 'Purchases', 'Full Game', 'Super Fan', 'Restore Purchases', 'Back to Menu', 'Back to Teams', 'Back to Players', 'Privacy', 'Support', 'Get the App', 'Full Game Unlocked', 'Locked', ...Object.values(S.NAMES), S.LINE.full, S.LINE.fan];
  for (const l of labels) ok(title(l) && (ui + html).includes(l), `"${l}" is a Title Case label in use`);
  ok(Object.values(S.MSG).every(m => /^[A-Z][^.!?]*\.( [A-Z][^.!?]*\.)?$/.test(m) && m.length <= 45), 'each message is one or two short plain sentences');
  const block = html.slice(html.indexOf('<div class="modal" id="m-store"'), html.indexOf('<div class="modal" id="m-gate"'));
  ok(!/donat|charit|good cause/i.test(src + ui + block + read('store/README.md').replace(/never[^.]*(donation|charity)[^.]*\./gi, '')), 'never called a donation or charity (Apple 3.2.2): it says what the club gets');
  ok(!/—/.test(src + ui + block + read('store/README.md')) && !/[←-↙⇐-⇙]/.test(src + ui + block), 'no em dash or arrow');
  ok(/@media \(orientation:landscape\) and \(max-height:420px\)\{\n  \.learn-row\.three \.btn\{padding-block:4px;line-height:1\.05\}/.test(css), 'in thirds on a narrow phone the row stays 44px');
}

// 12. the contracts with the other builders
{
  const boot = read('src/boot.js');
  const ns = boot.slice(boot.indexOf('window.__tryline = {'), boot.indexOf('\n  get M() {'));
  ok(boot.indexOf('window.__tryline = {') >= 0 && boot.indexOf('\n  get M() {') > boot.indexOf('window.__tryline = {') && (ns.match(/^  store:\{ [^\n]*\},$/gm) || []).length === 1 && (boot.match(/^  store:\{/gm) || []).length === 1,
    'one store namespace line in window.__tryline, before get M() (in any order with the other builders\' lines)');
  ok(['has', 'fan'].every(k => typeof S[k] === 'function'), 'storeHas and storeFan are exported');
  ok(/typeof nativeOn === 'function' && !!nativeOn\(\)/.test(src), 'the app is detected through the native builder\'s nativeOn, when it is there');
  ok(/Plugins\.NativePurchases/.test(src) && ['getProducts', 'purchaseProduct', 'restorePurchases', 'getPurchases', "'transactionUpdated'"].every(n => src.includes(n)), 'the adapter uses the plugin\'s documented calls');
  const code = (src + ui).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''), ack = code.match(/async function storeAcknowledge\(P, list\) \{[\s\S]*?\n\}\n/);
  ok(!/appAccountToken|receipt|jwsRepresentation|purchaseToken|fetch\(|XMLHttpRequest|sendBeacon/.test(code.replace(ack ? ack[0] : '', '')), 'no account token, receipt or token is read or sent, and the store code makes no request of its own');
  ok(!!ack && (ack[0].match(/purchaseToken/g) || []).length === 4 && /await P\.acknowledgePurchase\(\{ purchaseToken:t\.purchaseToken \}\)/.test(ack[0]) && !/fetch|XMLHttpRequest|sendBeacon|save\(|localStorage/.test(ack[0]), 'Google\'s purchase token is read in one place, storeAcknowledge, and goes only back to the plugin');
  const readme = read('store/README.md');
  ok(/@capgo\/native-purchases@8\.9\.6/.test(readme) && /tryline\.full/.test(readme) && /tryline\.fan\.farnham/.test(readme) && /STORE_WEB_TIER/.test(readme), 'store/README.md names the plugin and its version, the product ids and the tier flag');
}

reset();
console.log(`Store: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
