// Store: the one-off unlocks (Full Game, Super Fan of a partner club), who has them, the adapter to the app stores, the locks,
// the Unlock card and the Grown-Ups panel, and that the web with STORE_WEB_TIER 'full' plays exactly as it did before. Then the Super Fan's
// extras (2026-11-09): the store copy's Full Game on the Unlock card, the gold Super Fan trophy (once a club, restored, never on the web),
// the home in the club's colours and the crest only as a file of the game's own, and the Supporters' Wall (an owned club only, the
// grown-up check, 18 or over, the email built exactly, no name kept).
// node tools/store.mjs   Exits 1 on any failure.
const { T, fire } = await import('./harness.mjs');
import fs from 'node:fs';
const S = T.store, K = T.kids, X = T.teams, D = T.debug, C = T.career, I = T.importer, $ = id => document.getElementById(id);
const PK = T.picker;   // the team screen, side by side since 2026-11-11
const addOnTeams = () => { const g = PK.ladder('men', { mine:'all' }).find(x => x.key === 'mine.league'); return !!g && g.teams.some(t => t.act === 'import'); };   // Add Your Team in Mine's My League
let failed = 0, passed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } if (process.env.VERBOSE) console.log(cond ? 'ok  ' : 'FAIL', msg); };
const tick = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)); };
const memory = {};
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; } };
const saved = () => JSON.parse(memory['tryline.v1']);
const read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const html = read('index.html'), src = read('src/store.js'), ui = read('src/ui-store.js'), menus = read('src/ui-menus.js'), css = read('styles.css');
const FEATURES = ['champ', 'career', 'create', 'hard', 'import', 'legends'], PAID = ['champ', 'career', 'create', 'hard', 'legends'];
const opened = [];
globalThis.open = (...a) => { opened.push(a); return null; };
const pass = () => { const g = K.gate(); if (!g) return false; for (const d of g.answer) K.type(d); return true; };   // a grown-up answers the check
const cancel = () => K.close(false);
const FARNHAM = S.FAN_CLUBS[0];
const reset = () => {                                       // the web as shipped, nothing bought, nothing open
  S.setNative(null); S.setTier(null); S.setBackend(null); S.setBought([]); S.setPrices({}); S.setAsked(false); S.setStarted(false);
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
  ok(/\{ key:'farnham', name:'Farnham RUFC', product:'tryline\.fan\.farnham', share:50, agreed:false, team:'FAR', crest:null \}/.test(fanSrc) && FARNHAM.share === 50 && FARNHAM.agreed === false && FARNHAM.crest === null, 'Farnham\'s share is 50 (of what we receive), not yet agreed in writing: agreed:false; no crest until the club supplies one with its written permission');
  let parsed = null; try { parsed = Function('"use strict"; return (' + fanSrc.match(/=\s*(\[[\s\S]*\])/)[1] + ');')(); } catch (e) { /* not plain data */ }
  ok(Array.isArray(parsed) && JSON.stringify(parsed) === JSON.stringify(S.FAN_CLUBS), 'FAN_CLUBS is plain data, as tools/listing.mjs reads it');
  for (const c of S.FAN_CLUBS) {
    ok(c.product === 'tryline.fan.' + c.key && /^[a-z0-9]{1,24}$/.test(c.key), `${c.name}: one product a club, tryline.fan.<key>`);
    ok(c.share === null || (typeof c.share === 'number' && c.share > 0 && c.share <= 100), `${c.name}: a share is null or a percentage`);
    ok(typeof c.agreed === 'boolean' && (!c.agreed || c.share !== null), `${c.name}: agreed is true or false, and true only with a share`);
    ok(!!S.teamOf(c) && X.ALL_TEAMS.includes(S.teamOf(c)), `${c.name}: its side is in the game, for its kit and to be offered first`);
    ok(c.crest === null || (S.crest(c) === c.crest && fs.existsSync(new URL('../' + c.crest, import.meta.url))), `${c.name}: its crest is null, or a file of the game's own that is there`);
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
  ok(/<button class="btn" id="b-grown" hidden>Grown-Ups<\/button>/.test(html) && /<span class="my-fan" id="st-fan" hidden><\/span>/.test(html) && /<div class="modal" id="m-store" hidden>/.test(html) && /<span id="st-locked" hidden>Locked<\/span>/.test(html), 'Grown-Ups, the badge, the card and the Locked note start hidden');
  // the home: storeRender changes nothing while the store is not live
  const els = ['b-champ', 'b-career', 'b-grown', 'st-fan', 'my-box', 'hp-settings', 't-go', 'b-comps', 'b-set', 'b-import'].map($);   // the team screen's primary carries its entry's lock (Create Team, Add Your Team) since the side-by-side screen
  const seg = document.querySelectorAll('.seg[data-key]').find(g => g.dataset.key === 'diff');
  const look = () => JSON.stringify([...els, ...seg.children].map(e => [e.hidden, e.classList.contains('locked'), e.classList.contains('grown'), e.classList.contains('note')]));
  $('b-grown').hidden = true; $('st-fan').hidden = true;
  const before = look();
  const spied = els, sets = [], keep = spied.map(e => e.setAttribute);
  spied.forEach((e, i) => { e.setAttribute = (...a) => { sets.push([e.id, ...a]); return keep[i].apply(e, a); }; });
  D.goHome(); S.render(); S.teamsRender();
  ok(look() === before && !sets.length, `rendering the home and the team screen touches no control: no lock, no Grown-Ups, no badge, no dot (${JSON.stringify(sets)})`);
  spied.forEach((e, i) => { e.setAttribute = keep[i]; });
  const s = D.settings(); s.diff = 2; s.twoDiff = [2, 2]; D.goHome();
  ok(s.diff === 2 && s.twoDiff.join() === '2,2', 'Hard stays Hard, one player and two');
  s.diff = 1; s.twoDiff = [1, 1];
  // every way in goes ahead, with no card
  X.setChamp(null); T.home.champPick('sur');
  ok($('m-store').hidden && D.pickMode() === 'champ' && !$('s-teams').hidden, 'Championship (a league picked on the home) opens its team screen');
  C.set(null); $('cn-mine').innerHTML = ''; C.open();
  ok($('m-store').hidden && /Farnham/.test($('cn-mine').innerHTML), 'Career opens the new player screen');
  T.stamina.openBuilder(null);
  ok($('m-store').hidden && !$('s-build').hidden, 'Create Team opens the builder');
  I.open();
  ok($('m-store').hidden && !$('m-import').hidden && I.state().step === 'web', 'Add Your Team opens its card, which says it works in the app');
  $('im-back').click(); D.goHome();
  D.openTeams('quick');
  ok(I.shown() && PK.view(0).ladder.find(g => g.key === 'mine.league').teams.some(t => t.act === 'import'), 'and Add Your Team is on the team screen as before (Mine\'s My League)');
  D.goHome();
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
  ok(['quick', 'drills', 'kids', 'easy', 'normal', 'help', 'two'].every(f => S.has(f)), 'Quick Match, Skill Games, Kids, Easy, Normal, How to Play and Two Player are free');
  ok(PAID.every(f => !S.has(f)) && !S.has('import'), 'Championship, Career, Create Team, Hard and Import are locked');
  // an Android browser, while there is no Google Play page (iPhone first): no lock with no app to get, everything as before
  android();
  ok(S.tier() === 'full' && !S.live() && FEATURES.every(f => S.has(f)), 'an Android browser stays on the full tier until the Google Play link is set');
  D.goHome();
  ok(!$('b-champ').classList.contains('locked') && $('b-grown').hidden && !$('hp-settings').classList.contains('grown'), 'and its home has no lock and no Grown-Ups');
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
  ok($('b-career').classList.contains('locked') && $('b-continue').classList.contains('locked') && /^Championship · /.test($('cont-note').textContent), 'the Career box likewise, and Continue (a championship and a career under way), its line kept');
  const seg = document.querySelectorAll('.seg[data-key]').find(g => g.dataset.key === 'diff');
  ok(!$('b-grown').hidden && $('hp-settings').classList.contains('grown') && $('b-comps').classList.contains('locked') && $('b-career').classList.contains('locked') && !$('b-match').classList.contains('locked') && !$('b-quick').classList.contains('locked') && !$('b-drills').classList.contains('locked') && !$('b-set').classList.contains('locked'), 'Grown-Ups in Settings beside Sound and Match Help; Competitions and the Career box carry the lock, Match, Quick Match, Skill Games and Settings none');
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
  ok(!$('b-champ').classList.contains('locked') && !$('b-career').classList.contains('locked') && !$('b-comps').classList.contains('locked') && !$('b-continue').classList.contains('locked') && $('b-grown').hidden && !$('hp-settings').classList.contains('grown'), 'back on the full tier the locks and Grown-Ups go');
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
  ok(/id="st-app">Get the App<small class="hsub">Career · Championship · International · Create Team · Hard · Legends<\/small>/.test($('st-offers').innerHTML), 'Get the App, with what the Full Game holds, in the store\'s order (Career, Championship and International modes, Create Team, Hard, the Legends sides)');
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
  ok(/id="st-app">Get the App<\/button>/.test($('st-offers').innerHTML), 'for Add Your Team, Get the App without the Full Game\'s list (it is the Super Fan\'s)');
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
  ok(!S.offered('import') && !addOnTeams(), 'and Add Your Team, which only Super Fan unlocks, is not on the team screen');
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
  ok(S.offered('import') && addOnTeams(), 'Add Your Team is on the team screen once a Super Fan club is on sale');
  S.open({ mode:'unlock', feature:'champ' });
  ok(/data-buy="tryline\.full"/.test($('st-offers').innerHTML) && /data-buy="tryline\.fan\.farnham"/.test($('st-offers').innerHTML) && $('st-offers').innerHTML.includes('Supports Farnham RUFC: 50' + SHARE_WORDS), 'the card: Full Game, Super Fan · Farnham RUFC and its share');
  ok($('st-offers').innerHTML.replace(/\u00a0/g, ' ').includes('Full Game · Add Your Team · Super Fan Badge') && $('st-offers').innerHTML.includes('Super\u00a0Fan\u00a0Badge') && $('st-offers').innerHTML.includes('Add\u00a0Your\u00a0Team') && !/Club Badge/.test(ui.replace('Super Fan Badge', '')), 'the Super Fan perks: Full Game, Add Your Team and the Super Fan Badge (the shirt and name, never a crest)');
  ok(!$('st-restore').hidden && !$('st-row').classList.contains('one') && $('st-links').hidden && $('st-back').textContent === 'Back to Menu', 'Restore Purchases | Back to Menu under them');
  S.close();
  // locks
  D.goHome();
  ok(['b-champ', 'b-career'].every(id => $(id).classList.contains('locked')) && !$('b-grown').hidden, 'Championship and Career locked, Grown-Ups on the home');
  D.openTeams('quick'); PK.group(0, PK.view(0).ladder.findIndex(g => g.key === 'mine.made') - PK.view(0).gi);
  const madeLock = PK.view(0).team.act === 'create' && $('t-go').classList.contains('locked') && $('t-go').textContent === 'Create Team';
  PK.group(0, 1);
  ok(madeLock && PK.view(0).team.act === 'import' && $('t-go').classList.contains('locked') && $('t-go').textContent === 'Add Your Team', 'Create Team and Add Your Team locked');
  D.goHome();
  T.stamina.openBuilder(null);
  ok(!$('m-store').hidden && S.ui().feature === 'create' && $('s-build').hidden && !$('s-home').hidden, 'Create Team opens the Unlock card, not the builder');
  S.close();
  D.openTeams('quick'); I.open();
  ok(!$('m-store').hidden && S.ui().feature === 'import' && $('m-import').hidden && $('st-title').textContent === 'Add Your Team', 'Add Your Team opens the Unlock card, named Add Your Team, not the import');
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
    [new Error('The Internet connection appears to be offline.'), S.MSG.store, 'offline (Apple\'s words)'],
    [new Error('Cannot find product for id tryline.fan.farnham'), S.MSG.store, 'a product the store could not find'],
    [Object.assign(new Error('Billing service unavailable'), { code:'SERVICE_UNAVAILABLE' }), S.MSG.store, 'Google\'s service out of reach'],
    [new Error('Something unexpected'), S.MSG.failed, 'any other error'],
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
  // a pending unlock for a feature it does not open (Full Game from Add Your Team's card) leaves the card up, message cleared
  app(); FARNHAM.agreed = true; S.setStarted(false); D.goHome(); await tick(12);
  S.open({ mode:'unlock', feature:'import' }); S.ui().msg = S.MSG.pending; S.cardRender();
  listener({ productIdentifier:'tryline.full', transactionId:'9' }); await tick();
  ok(!$('m-store').hidden && S.ui().feature === 'import' && $('st-msg').hidden, 'the Full Game arriving on Add Your Team\'s card: still locked, so the card stays, its message gone');
  S.close();
  // the web never starts the store
  reset(); calls.length = 0; plugin(); S.setNative(false); D.goHome(); await tick();
  ok(!S.started() && !calls.length, 'on the web nothing is asked of a store, even where a plugin is present');
  delete globalThis.Capacitor;
}

// 7b. the store out of reach, a refund, and an unlock that arrives during a drill
{
  // the store never priced the Full Game (offline at the start, or not found): tapping it says so before the grown-up check
  app(); let offline = true;
  const NP = globalThis.Capacitor.Plugins.NativePurchases, gp = NP.getProducts;
  NP.getProducts = async o => { if (offline) { calls.push(['getProducts', o]); throw new Error('The Internet connection appears to be offline.'); } return gp(o); };
  S.open({ mode:'unlock', feature:'champ' }); await tick();
  ok(S.unpriced('tryline.full') && /data-buy="tryline\.full"/.test($('st-offers').innerHTML) && !/£/.test($('st-offers').innerHTML), 'offline: the Full Game shows with no price');
  const asked = called('getProducts').length;
  S.buyAsk('tryline.full');
  ok(!K.gate() && !$('m-store').hidden && $('st-msg').textContent === S.MSG.store && !$('st-msg').hidden && !called('purchaseProduct').length, 'tapped: "Could not reach the store" at once, before any grown-up check, and nothing bought');
  await tick();
  ok(called('getProducts').length === asked + 1 && $('st-msg').textContent === S.MSG.store, 'the store is asked again, and still out of reach');
  offline = false; S.buyAsk('tryline.full'); await tick();
  ok($('st-msg').hidden && /Full Game · £1\.99/.test($('st-offers').innerHTML), 'back online: the price comes in and the message goes');
  S.buyAsk('tryline.full');
  ok(!!K.gate() && $('m-store').hidden, 'and the Full Game asks a grown-up as before');
  cancel(); S.close();
  NP.getProducts = gp;
  app(); ok(!S.unpriced('tryline.full'), 'before the store has answered at all, a tap goes to the grown-up check as before');
  reset(); S.setAsked(true); ok(!S.unpriced('tryline.full'), 'on the web there is no store to be out of reach');
  // a refund: Apple sends the transaction again with a revocationDate, and the unlock goes unless the account still holds it
  app(); FARNHAM.agreed = true; owns = ['tryline.full', 'tryline.fan.farnham']; S.setStarted(false); D.goHome(); await tick(12);
  ok(S.bought().join() === 'tryline.full,tryline.fan.farnham' && S.has('import'), 'both unlocks, read back at the start');
  owns = ['tryline.full'];
  listener({ productIdentifier:'tryline.fan.farnham', revocationDate:'2026-11-08T10:00:00Z' }); await tick();
  ok(S.bought().join() === 'tryline.full' && !S.has('import') && S.has('champ') && S.fan() === null && saved().store.owned.join() === 'tryline.full', 'the Super Fan refunded: it goes, and is saved gone; the Full Game stays');
  listener({ productIdentifier:'tryline.full', revocationDate:'2026-11-08T10:00:00Z' }); await tick();
  ok(S.bought().join() === 'tryline.full', 'a revocation for an unlock the account still holds (bought as well as shared) changes nothing');
  listener({ productIdentifier:'com.someone.else', revocationDate:'2026-11-08T10:00:00Z' }); await tick();
  ok(S.bought().join() === 'tryline.full', 'another app\'s revocation changes nothing');
  owns = [];
  listener({ productIdentifier:'tryline.full', revocationDate:'2026-11-08T10:00:00Z' }); await tick();
  D.goHome();
  ok(!S.bought().length && !S.has('champ') && saved().store === undefined && $('b-champ').classList.contains('locked'), 'the Full Game refunded too: locked again on the home, and the save keeps no unlock');
  // an unlock that arrives during a drill goes into the save, and so into Preferences, at once, though a drill saves nothing else
  app(); S.setStarted(false); D.goHome(); await tick(12); X.save();
  const settingsBefore = JSON.stringify(saved().settings);
  T.practice.start('defend');
  listener({ productIdentifier:'tryline.full', transactionId:'11' }); await tick();
  ok(T.practice.state() && S.has('champ') && saved().store.owned.join() === 'tryline.full', 'Ask to Buy approved during a drill: saved at once');
  ok(JSON.stringify(saved().settings) === settingsBefore, 'and nothing else in the save moves (the drill\'s own settings are never written)');
  T.practice.leave(); D.goHome();
}

// 8. Super Fan: the badge, Import, and the club offered first
{
  app(); FARNHAM.agreed = true; S.setBought(['tryline.fan.farnham']);
  ok(FEATURES.every(f => S.has(f)) && JSON.stringify(S.fan()) === '{"key":"farnham","name":"Farnham RUFC"}', 'Super Fan: everything in the Full Game, and Import; storeFan names the club');
  D.goHome();
  ok(!$('st-fan').hidden && $('st-fan').innerHTML.includes('<span>Super Fan</span>') && /<svg class="fan-shield"[^>]*>[^]*fill="#1a1a1a" stroke="#f2efe6"/.test($('st-fan').innerHTML) && !/<img/.test($('st-fan').innerHTML) && $('my-name').textContent === 'Farnham', 'the badge in My Team\'s box (Farnham, the Super Fan\'s club, My Team by default): a plain shield in Farnham\'s kit colours, Super Fan, over the club\'s name');
  ok(S.offers(null).length === 0, 'nothing more to sell');
  S.open({ mode:'grown' });
  ok($('st-title').textContent === 'Purchases' && $('st-have').innerHTML.includes('Super Fan · Farnham RUFC') && $('st-offers').innerHTML === '' && !$('st-links').hidden && $('st-back').textContent === 'Back to Menu', 'the Grown-Ups panel: what is owned, Privacy | Support, Restore Purchases | Back to Menu');
  S.close();
  ok(addOnTeams(), 'Add Your Team is on the team screen');
  I.open();
  ok($('m-store').hidden && !$('m-import').hidden, 'and opens the import');
  $('im-back').click();
  // a second partner club, to see it first in Career and Championship (Farnham is first already)
  S.FAN_CLUBS.push({ key:'guildford', name:'Guildford RFC', product:'tryline.fan.guildford', share:50, agreed:true, team:'GUI' });
  S.grant(['tryline.fan.guildford']);
  ok(S.fan().key === 'guildford', 'the latest Super Fan unlock is the club shown');
  C.set(null); C.newOpen(); C.clubOpen();
  const cn = PK.view(0).group.teams.map(t => t.id);
  ok(cn[0] === 'GUI' && cn.indexOf('GUI') < cn.indexOf('FAR') && PK.view(0).team.id === 'GUI' && /--kit:#1a1e4f/.test($('cn-mine').innerHTML) && C.draft().club.id === 'GUI', 'Career\'s new player: Guildford picked, and first on its list');
  X.setChamp(null); D.goHome(); T.home.champPick(T.home.myPool());
  ok(T.home.myClub().id === 'GUI' && D.settings().pool === 'sur' && X.teamPool() === 'sur' && $('t-go').textContent === 'Play as Guildford' && !$('t-go').hidden, 'My Team, unset, is the Super Fan\'s club: Championship on its list (Local · Surrey) with Play as Guildford');
  ok(PK.view(0).ladder[0].teams[0].id === 'GUI' && PK.view(0).i === 0, 'Guildford is the first side');
  S.FAN_CLUBS.push({ key:'toulouse', name:'Toulouse', product:'tryline.fan.toulouse', share:50, agreed:true, team:'TLS' });
  S.grant(['tryline.fan.toulouse']);
  ok(S.homePool() === 'fra', 'a club in another list opens that list (National · France)');
  X.setChamp(null); D.goHome(); T.home.champPick(T.home.myPool());
  ok(X.teamPool() === 'fra' && X.poolTier('fra') === 1 && $('t-eyebrow').textContent === 'Championship' && PK.where(PK.view(0).group) === 'National' && PK.view(0).group.name === 'France' && !$('t-go').hidden && $('t-go').textContent === 'Play as Toulouse', 'and France\'s league (National · France) has Play as Toulouse');
  D.openTeams('champ', 'eng');
  ok($('t-go').textContent === 'Play as Bath' && PK.view(0).team.id === 'BTH', 'Toulouse is offered only on its own list: England opens on its first side');
  C.set(null); C.newOpen(); C.clubOpen();
  ok(C.draft().club.id === 'TLS' && C.draft().league === 'fra' && PK.view(0).group.key === 'fra' && PK.view(0).group.teams[0].id === 'TLS' && PK.view(0).team.id === 'TLS', 'Career\'s new player starts at Toulouse, and its club screen opens on France\'s Top 14 with Toulouse first');
  D.goHome();
  ok(S.first([X.CLUBS[0], X.FRANCE[1], X.FRANCE[0]]).map(t => t.id).join() === 'TLS,FAR,BOR', 'storeFirst moves the club to the front and keeps the rest in order');
  ok(S.first([{ ...X.FRANCE[0], custom:true }, X.CLUBS[0]])[0].custom, 'a team made by the player is never taken for the club');
  S.setBought([]);
  ok(S.homePool() === 'sur' && S.homeTeam() === X.CLUBS[0], 'no Super Fan: Local · Surrey, Farnham, as before');
  S.setBought(['tryline.fan.oldclub']);
  ok(FEATURES.every(f => S.has(f)) && S.fan() === null && S.offers('champ').length === 0, 'a Super Fan of a club since dropped keeps everything it unlocked, with no badge');
  // careerClubs: the Super Fan's club first on the new player screen
  S.setBought(['tryline.fan.guildford']);
  const careerSrc = read('src/ui-career.js');
  ok(menus.includes("if (pickMode === 'career') return pickLadder(cat, { clubs:true, mine:'teams', fav:true, fits:t => !isNation(t) && !t.legend }).map(g => ({ ...g, teams:storeFirst(g.teams) }));") && /careerDraft = \{ club:myClubTeam\(\), league:pool/.test(careerSrc) && /const myClubTeam = \(\) => myClubFind\(settings\.myClub\) \|\| storeHomeTeam\(\);/.test(menus), 'Career\'s club groups put the Super Fan\'s club first, and a new player starts with My Team\'s club (the Super Fan\'s until one is picked)');
  ok(menus.includes("teams:storeFirst(teams) }"), 'and so does Championship\'s team screen');
  S.setBought([]); D.goHome();
  ok($('st-fan').hidden && !$('s-home').classList.contains('fan'), 'no Super Fan: no badge, the plain box');
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
  ok(/function storeAsk\(go\)[\s\S]*?parentGate\(/.test(ui) && /function storeBuyAsk[\s\S]*?\n  storeAsk\(\(\) => storeBuy\(id\)\);\n\}/.test(ui) && /function storeRestoreAsk[^\n]*storeAsk\(/.test(ui) && /function storeLeave[^\n]*storeAsk\(/.test(ui), 'buying, restoring and leaving all ask through parentGate');
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
  ok((block.match(/<button class="btn"/g) || []).length === 6 && /id="st-reset" hidden>Reset Kids Level</.test(block) && /id="st-easy" hidden>Move Up to Easy</.test(block) && !/<a[\s>]|href=/.test(block), 'Privacy, Support, Reset Kids Level, Move Up to Easy, Restore Purchases and Back are buttons, never links');
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
  ok(/\.hp-settings\.grown \.set-sound,\.hp-settings\.grown \.set-hints,\.hp-settings #b-grown\{grid-column:span 2\}/.test(css) && /\.hp-settings #b-grown\{align-self:end;min-height:47px;/.test(css), 'Grown-Ups shares Sound and Match Help\'s row in Settings, in equal thirds, a segment\'s height (44px inside its edges) (re-pinned for the Camera row: it was Half Length\'s, in halves)');
  ok(/<div class="set set-gender">[\s\S]*?<\/div><\/div>\s*<div class="set set-sound">[\s\S]*?<button class="btn" id="b-grown" hidden>Grown-Ups<\/button>\s*<div class="set set-half">/.test(html) && /\.hp-settings\.settings \.set-cam,\.hp-settings\.settings \.ver\{grid-row:4;/.test(css), 'with Age Group | Gender under Difficulty (src/profile.js), Grown-Ups stays on Sound and Match Help\'s row, now the third, and Half Length | Camera the fourth (its fit at every size: tools/profile.mjs and tools/home.mjs)');
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

// 13. the copy: the Full Game's contents on the Unlock card in the store copy's own order, and the Super Fan's new labels
{
  const block = (file, key) => { const m = read(file).match(new RegExp('<!--\\s*copy:' + key.replace(/\./g, '\\.') + '\\s*-->\\s*\\n```[a-z]*\\n([\\s\\S]*?)\\n```')); return m ? m[1] : ''; };
  const apple = block('store-listing/APP_STORE.md', 'apple.iap.full.description'), google = block('store-listing/GOOGLE_PLAY.md', 'google.iap.full.description');
  ok(apple === 'Career, Championship and International modes' && [...apple].length === 44, `the Full Game's App Store description: Career, Championship and International modes (${[...apple].length} of 45)`);
  ok(google === 'Play as and support your club: Career, Championship and International modes, Create Team, the Hard level and the Legends sides. A one-off unlock.', 'the Full Game\'s Google Play description, as the owner gave it');
  ok(block('store-listing/LISTING.md', 'apple.subtitle') === 'Play as and support your club', 'the App Store subtitle: Play as and support your club');
  const items = S.LINE.full.split(' · '), at = items.map(w => google.indexOf(w));
  ok(items.join() === 'Career,Championship,International,Create Team,Hard,Legends' && at.every((i, n) => i >= 0 && (n === 0 || i > at[n - 1])) && ['Career', 'Championship', 'International'].every((w, n, a) => apple.indexOf(w) >= 0 && (n === 0 || apple.indexOf(w) > apple.indexOf(a[n - 1]))),
    `the Unlock card lists the Full Game as the store copy does, in its order (${S.LINE.full})`);
  const SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'on', 'to', 'in', 'for', 'as', 'at', 'by']);
  const title = t => t.split(/[ ·]+/).filter(Boolean).every((w, i) => (i > 0 && SMALL.has(w)) || /^[A-Z0-9£]/.test(w));
  const wall = html.slice(html.indexOf('<div class="modal" id="m-wall"'), html.indexOf('</div>\n</div>', html.indexOf('<div class="modal" id="m-wall"')) + 12);
  for (const l of ["Join the Supporters' Wall", "Supporters' Wall", "Yes, I'm 18 or Over", 'Cancel', 'Continue', 'How Your Name Appears', 'First Name and Town or Initial', 'Super Fan']) ok(title(l.replace(/,/g, '')) && (ui + html + read('src/ui-locker.js')).includes(l), `"${l}" is a Title Case label in use`);
  ok(/<p class="wl-q">Are you 18 or over\?<\/p>/.test(wall), 'the question is a sentence, in sentence case');
  ok((wall.match(/<div class="row2"><button class="btn" id="wl-(?:yes|go)"[^>]*>[^<]+<\/button><button class="btn" id="wl-(?:no|cancel)" data-back>Cancel<\/button><\/div>/g) || []).length === 2, 'each step is two balanced buttons in halves, the action then Cancel (a controller\'s Back)');
  ok(!/donat|charit|good cause|—/i.test(wall + ui.slice(ui.indexOf('the Supporters\' Wall ----------')) + src.slice(src.indexOf('the Supporters\' Wall ----------'))) && !/[←-↙⇐-⇙]/.test(wall), 'never a donation or charity, no em dash, no arrow');
  ok(!/<p\b(?![^>]*wl-q)[^>]*>/.test(wall.replace(/<p class="eyebrow"[^>]*>[^<]*<\/p>/, '')), 'no prose on the card beyond the question');
}

// 14. the Super Fan trophy: one a club, for an unlock the app owns; back with Restore Purchases; never on the web; never a win
{
  const L = T.locker, CU = T.cups, fresh = () => L.set(L.fresh()), json = JSON.stringify;
  const cabinet = () => { CU.renderCabinet('home-history'); return $('home-history').innerHTML; };
  for (const tier of [null, 'free']) {
    reset(); fresh(); CU.setHistory([]); X.setChamp(null); S.setTier(tier); FARNHAM.agreed = true; S.setBought(['tryline.fan.farnham']);
    D.goHome(); X.save();
    ok(!L.fanClubs().length && !L.fanAward() && !('locker' in saved()) && !L.isNew() && L.fanHtml() === '' && L.fanCabinet() === '' && $('b-cabinet').hidden && !/fan-entry/.test(cabinet()),
      `the web (${tier || 'full'}): no trophy though the save holds a Super Fan unlock (purchases are the app's), no locker field, no Super Fan row and no Trophy Cabinet`);
    ok(!$('s-home').classList.contains('fan') && $('st-fan').hidden && S.fanOwned().length === 0, `the web (${tier || 'full'}): the home is as it was, no club colours and no badge`);
  }
  // in the app: the Full Game earns nothing; a Super Fan earns its club's trophy once
  app(); fresh(); FARNHAM.agreed = true; CU.setHistory([]); X.setChamp(null);
  S.open({ mode:'unlock', feature:'champ' }); S.buyAsk('tryline.full'); pass(); await tick();
  ok(S.has('champ') && !L.fanClubs().length && !('locker' in saved()), 'the Full Game earns no trophy');
  S.open({ mode:'grown' }); S.buyAsk('tryline.fan.farnham'); pass(); await tick();
  ok(json(L.state().fan) === '["farnham"]' && L.fanClubs()[0].club === FARNHAM && L.fanClubs()[0].team.id === 'FAR' && json(saved().locker.fan) === '["farnham"]' && saved().locker.fanSeen === 0, 'a Super Fan bought: Farnham\'s trophy, awarded and saved');
  S.close(); D.goHome();
  ok(L.isNew() && $('b-locker').classList.contains('note'), 'the Locker\'s dot: a new trophy waits there');
  S.grant(['tryline.fan.farnham']); S.restoreAsk(); D.goHome(); D.goHome();
  ok(json(L.state().fan) === '["farnham"]', 'awarded once: the same unlock again, and every render of the home, add nothing');
  L.open(0);
  const body = $('lk-body').innerHTML;
  ok(/^<div class="lk-fanrow"><div class="lk-fan new" role="group" aria-label="Super Fan Trophy, Farnham RUFC"><svg class="lk-cup"/.test(body) && /fill="#ffcf3d"/.test(body) && /fill="#1a1a1a"/.test(body) && /stroke="#f2efe6"/.test(body) && /<b>Super Fan<\/b><span>Farnham RUFC<\/span>/.test(body) && body.indexOf('lk-fan') < body.indexOf('lk-feat'),
    'the Locker\'s Medals: the trophy first, gold with Farnham\'s kit colours on it, Super Fan and the club\'s name, ringed once as new');
  ok(/<button class="btn lk-wall" data-wall="farnham">Join the Supporters' Wall<\/button><\/div><\/div>/.test(body), 'and Join the Supporters\' Wall beside it');
  ok(saved().locker.fanSeen === 1 && !L.isNew() && !$('b-locker').classList.contains('note'), 'seen once the Locker opens: the dot goes');
  ok(L.golds() === 0 && /Gold 0/.test($('lk-tally').innerHTML) && L.FEATS.every(f => L.tier(f.id) === 0), 'never a medal: the tally and the Legends\' Golds are as they were');
  // the Trophy Cabinet: its own kind, first, gold, never counted as a league or a cup
  D.goHome();
  ok(!$('b-cabinet').hidden && /data-kind="fan" data-metal="gold"/.test($('tc-list').innerHTML), 'the Trophy Cabinet\'s strip is on the home with a Super Fan trophy alone, its rosette in it');
  let cab = cabinet();
  ok(/^<article class="season-entry fan-entry"><p class="eyebrow"><span class="cup-kind" data-kind="fan" data-metal="gold" data-won>Super Fan<\/span><\/p><h3><svg class="lk-cup"[^]*?<\/svg><span>Farnham RUFC<\/span><\/h3><\/article><p class="stat-note">/.test(cab), 'the Trophy Cabinet: the trophy first, its own kind (Super Fan, in gold), the club\'s name and no more');
  X.newChamp(X.NATIONS[0], X.NATIONS.slice(1)); { const c = X.champ(); for (let i = 0; i < 5; i++) { c.results.push(c.fixtures[i].map(p => ({ h:p[0], a:p[1], hs:20, as:10, ht:3, at:1 }))); c.round++; } } X.save(); X.setChamp(null);
  cab = cabinet(); const h = CU.savedHonours(), tally = (cab.match(/<p class="cabinet-tally">[^]*?<\/p>/) || [''])[0];
  ok(h.seasons === 1 && h.cups === 0 && h.euro + h.world + h.tour === 0 && !/fan|Super Fan/.test(tally) && (cab.match(/fan-entry/g) || []).length === 1, `never counted as a league or a cup win: the tally is the season's alone (${tally.replace(/<[^>]+>/g, '')})`);
  ok(T.cups.trophyMetal('fan') === 'gold' && /\[data-metal="gold"\]\{--kc:var\(--gold\)/.test(css), 'its kind\'s colour is gold, from the one map of metals (TROPHY_METAL, src/cups.js)');
  CU.setHistory([]); X.save(); D.goHome();
  // Restore Purchases, a new phone or the app put back: the trophy comes back with the unlock, once
  app(); fresh(); owns = ['tryline.fan.farnham'];
  S.open({ mode:'grown' }); S.restoreAsk(); pass(); await tick();
  ok(json(L.state().fan) === '["farnham"]' && json(saved().locker.fan) === '["farnham"]' && $('st-msg').textContent === S.MSG.restored, 'Restore Purchases: the Super Fan back, and its trophy with it, saved');
  S.restoreAsk(); pass(); await tick();
  ok(json(L.state().fan) === '["farnham"]' && $('st-msg').textContent === S.MSG.same, 'restored again: still the one trophy');
  S.close();
  app(); fresh(); owns = ['tryline.fan.farnham']; S.setStarted(false); D.goHome(); await tick(12);
  ok(json(L.state().fan) === '["farnham"]', 'read back at the start, with no prompt: the trophy too');
  app(); fresh(); S.setBought(['tryline.fan.farnham']); D.goHome();
  ok(json(L.state().fan) === '["farnham"]', 'an unlock bought before the trophies came earns its trophy at the home');
  // a refund takes it back with the unlock; the web never takes one away
  app(); fresh(); FARNHAM.agreed = true; owns = ['tryline.full', 'tryline.fan.farnham']; S.setStarted(false); D.goHome(); await tick(12);
  ok(json(L.state().fan) === '["farnham"]', 'both unlocks at the start, and the trophy');
  owns = ['tryline.full']; listener({ productIdentifier:'tryline.fan.farnham', revocationDate:'2026-11-08T10:00:00Z' }); await tick();
  ok(!L.fanClubs().length && !('fan' in L.state()) && !('locker' in saved()) && S.has('champ'), 'the Super Fan refunded: its trophy goes with it, and the save is as before');
  ok(!L.fanDrop(), 'nothing more to drop');
  reset(); L.set(L.clean({ fan:['farnham'] })); S.setBought([]);
  ok(!L.fanDrop() && json(L.state().fan) === '["farnham"]', 'the web takes nothing away');
  // an unlock that arrives during a drill: the trophy waits for the drill to end, then is saved
  app(); S.setStarted(false); D.goHome(); await tick(12); fresh(); X.save();
  T.practice.start('defend');
  listener({ productIdentifier:'tryline.fan.farnham', transactionId:'12' }); await tick();
  ok(json(L.state().fan) === '["farnham"]' && !('locker' in saved()) && saved().store.owned.join() === 'tryline.fan.farnham', 'during a drill: the unlock saved at once, the trophy held until the drill is over');
  T.practice.leave(); D.goHome();
  ok(json(saved().locker.fan) === '["farnham"]', 'and saved once it is');
  // a second partner club: two trophies, in the order bought
  app(); fresh(); S.FAN_CLUBS.push({ key:'guildford', name:'Guildford RFC', product:'tryline.fan.guildford', share:50, agreed:true, team:'GUI', crest:null });
  S.grant(['tryline.fan.farnham']); S.grant(['tryline.fan.guildford']);
  ok(json(L.state().fan) === '["farnham","guildford"]' && L.fanClubs().map(f => f.team.id).join() === 'FAR,GUI' && (L.fanCabinet().match(/fan-entry/g) || []).length === 2, 'two clubs: a trophy each, in the order bought');
  // the save: validated, and a Locker without a trophy as it was
  ok(json(L.clean({ fan:['guildford', 'farnham', 'farnham', 'nope', 7, null], fanSeen:9 })) === json({ ...L.fresh(), fan:['guildford', 'farnham'], fanSeen:2 }), 'a saved trophy list is put right: known clubs, each once, seen no more than held');
  ok(json(L.clean({ fan:'farnham', fanSeen:1 })) === json(L.fresh()) && json(L.clean({ fan:[], fanSeen:3 })) === json(L.fresh()) && json(L.clean({ fan:['farnham'], fanSeen:-2 })) === json({ ...L.fresh(), fan:['farnham'], fanSeen:0 }), 'a broken one is no trophy, and a Locker with none keeps no field for them');
  fresh(); X.save(); ok(!('locker' in saved()), 'nothing earned: still no locker field');
  reset(); fresh();
}

// 15. a Super Fan's home in the club's colours, readable on the dark; the crest only where the club has given one
{
  const L = T.locker, contrast = S.contrast;
  app(); L.set(L.fresh()); S.setBought(['tryline.fan.farnham']); D.goHome();
  const th = S.theme(X.CLUBS[0]);
  const KEYS = ['kit', 'trim', 'acc', 'ink', 'edge', 'ground', 'gink', 'tab', 'tink', 'star', 'ringw', 'ringd', 'ringl'];
  ok($('s-home').classList.contains('fan') && json(Object.keys(th)) === json(KEYS) && KEYS.every(k => $('s-home').style.getPropertyValue('--fan-' + k) === th[k]), 'a Super Fan of My Team\'s club: the home takes the club\'s colours (#s-home.fan, its thirteen colours)');
  ok(th.kit === '#1a1a1a' && th.trim === '#f2efe6' && th.acc === '#f2efe6' && th.ink === '#f1eee4' && th.edge === '#f2efe6' && th.ground === '#1a1a1a' && th.gink === '#f1eee4', `Farnham's black and white: the white trim the accent and the edge, the black the box's ground with chalk on it (${JSON.stringify(th)})`);
  ok(th.tab === '#f2efe6' && th.tink === '#0b130e' && th.star === '#ffcf3d' && th.ringw === 'transparent' && th.ringd === 'transparent' && th.ringl === 'transparent', `and its Super Fan tab the white edge with the night's ink on it, the stars still yellow and no chip ringed: every one reads on the black (${[th.tab, th.tink, th.star, th.ringw].join(' ')})`);
  const bad = [];
  for (const t of X.ALL_TEAMS) {
    const v = S.theme(t), panel = '#17271d', night = '#0b130e', chalk = '#f1eee4';
    if (contrast(v.acc, panel) < 4.5 || contrast(v.acc, night) < 4.5) bad.push(t.id + ' accent ' + v.acc);
    if (contrast(v.ink, v.kit) < 3.9 || (contrast(chalk, v.kit) >= 4.5 && v.ink !== chalk)) bad.push(t.id + ' ink ' + v.ink + ' on ' + v.kit);
    if (contrast(v.edge, night) < 3) bad.push(t.id + ' edge ' + v.edge);
    if (contrast(v.gink, v.ground) < 4.5) bad.push(t.id + ' box ' + v.gink + ' on ' + v.ground);
    if (contrast(v.tink, v.tab) < 4.5) bad.push(t.id + ' tab ' + v.tink + ' on ' + v.tab);
    if (contrast(v.star, v.ground) < 3) bad.push(t.id + ' stars ' + v.star + ' on ' + v.ground);   // non-text marks: 3:1 (WCAG 1.4.11)
    for (const [k, fill] of [['ringw', '#ffcf3d'], ['ringd', '#c3ccd3'], ['ringl', '#ff8466']]) {
      const ring = v[k];
      if (contrast(fill, v.ground) < 3 ? ring !== v.gink || contrast(ring, v.ground) < 4.5 : ring !== 'transparent') bad.push(t.id + ' ' + k + ' ' + ring + ' for ' + fill + ' on ' + v.ground);
    }
  }
  ok(!bad.length && X.ALL_TEAMS.length > 50, `every side's colours read on the dark: the accent 4.5:1 on the panel and the night, the fill's word chalk wherever chalk reads (4.5:1), the edge 3:1, every word on My Team's box 4.5:1 on its ground and on the Super Fan tab, the rating stars 3:1 on the ground, and a result's chip under 3:1 ringed in the box's ink, every other one not (${bad.slice(0, 4).join(', ') || X.ALL_TEAMS.length + ' sides'})`);
  { const n = X.ALL_TEAMS.map(S.theme), gold = n.filter(v => v.star === '#ffcf3d').length, rung = n.filter(v => v.ringw !== 'transparent').length;
    ok(gold > 50 && gold < n.length && rung > 10, `and both ways are taken: the stars yellow on ${gold} grounds and in the box's ink on ${n.length - gold}, a Won chip ringed on ${rung} (England's white, La Rochelle's yellow)`); }
  ok(/#s-home\.fan \.my-box\{background:var\(--fan-ground\);border-color:var\(--fan-edge\);[^}]*color:var\(--fan-gink\)\}/.test(css) && !/#s-home\.fan \.btn\.bx-go/.test(css),
    'My Team\'s box on the club\'s ground with its edge, every word in the ink that reads; Continue stays the floodlight\'s yellow');
  ok(/#s-home\.fan \.my-box \.rstars \.on\{fill:var\(--fan-star\)\}/.test(css) && ['w', 'd', 'l'].every(k => new RegExp(`#s-home\\.fan \\.my-box \\.fm\\.${k}\\{box-shadow:0 0 0 2px var\\(--fan-ring${k}\\)\\}`).test(css)) && /#s-home\.fan \.my-shirt\{[^}]*background:var\(--panel\)\}/.test(css) && /#s-home\.fan \.my-marks\{background:var\(--fan-tab\);[^}]*color:var\(--fan-tink\)\}/.test(css),
    'and the stars, the chips\' rings, the shirt\'s tile and the Super Fan tab take theirs');
  S.setBought(['tryline.full']); D.goHome();
  ok(!$('s-home').classList.contains('fan') && $('st-fan').hidden, 'without a Super Fan unlock: no club colours, no shield');
  // the crest: a file of the game's own, only where the club has given it
  S.setBought(['tryline.fan.farnham']); FARNHAM.crest = 'crests/farnham.png'; FARNHAM.agreed = false; D.goHome();
  ok(/<svg class="fan-shield"/.test($('st-fan').innerHTML) && !/<img/.test($('st-fan').innerHTML), 'a crest in FAN_CLUBS while the club has not agreed: the plain shield');
  FARNHAM.agreed = true; D.goHome();
  ok(/<img class="fan-shield fan-crest" src="crests\/farnham\.png" alt="" draggable="false"><span>Super Fan<\/span>/.test($('st-fan').innerHTML) && !/<svg/.test($('st-fan').innerHTML), 'a crest given with the club\'s agreement and written permission: the shield shows it, Super Fan beside it');
  for (const c of ['https://example.com/crest.png', '//example.com/c.png', '../crest.png', 'crests/../x.png', 'crests/a b.png', 'crests/c.gif', 'crests/C.PNG', 'data:image/png;base64,AA', 'javascript:alert(1)', 'icons/icon-192.png', 7]) {
    FARNHAM.crest = c; ok(S.crest(FARNHAM) === null, `a crest ${JSON.stringify(c)} is not one: the plain shield`);
  }
  D.goHome(); ok(/<svg class="fan-shield"/.test($('st-fan').innerHTML) && !/<img/.test($('st-fan').innerHTML), 'and the plain shield is back');
  FARNHAM.crest = null;
  const B = await import('./build.mjs');
  ok(json(B.crestAssets()) === '[]' && !B.shellAssets.some(a => a.startsWith('crests/')), 'with every crest null, the game\'s shell is as it was');
  ok(json(B.crestAssets(src.replace("crest:null", "crest:'crests/farnham.png'"))) === '["crests/farnham.png"]', 'a crest set in FAN_CLUBS goes into the shell (offline, and the app\'s copy)');
  let threw = false; try { B.crestAssets(src.replace("crest:null", "crest:'https://example.com/c.png'")); } catch (e) { threw = true; }
  ok(threw, 'and a crest from anywhere else fails the build');
  S.setBought([]); reset();
  function json(v) { return JSON.stringify(v); }
}

// 16. the Supporters' Wall: for a club the app owns, behind the grown-up check, 18 or over, the name into the grown-up's own email and
//     nowhere else
{
  const L = T.locker, json = JSON.stringify;
  const NAME = 'Sam, Farnham', MAIL = 'mailto:support@signcheck.ai?subject=' + encodeURIComponent("Supporters' Wall: Farnham RUFC") + '&body='
    + encodeURIComponent("Name: Sam, Farnham\r\nClub: Farnham RUFC\r\n\r\nI am 18 or over. I agree to be listed on the Supporters' Wall by this name, and I can ask to be removed at any time.");
  const type = v => { $('wl-input').value = v; $('wl-input').fire('input'); };
  const nameKept = () => [json(memory), json(D.settings()), json(S.ui(), (k, v) => (k === 'back' ? undefined : v)), json(L.state()), json(S.wall())].some(t => t.includes('Sam'));
  // nowhere without an owned club: the web, the free web, the app with nothing or the Full Game
  for (const [where, set] of [['the web', () => { reset(); S.setBought(['tryline.fan.farnham']); }], ['the free web', () => { reset(); S.setTier('free'); S.setBought(['tryline.fan.farnham']); }], ['the app with nothing', () => { app(); }], ['the app with the Full Game', () => { app(); S.setBought(['tryline.full']); }]]) {
    set(); FARNHAM.agreed = true; L.set(L.fresh()); D.goHome(); S.open({ mode:'grown' });
    ok(!/data-wall/.test($('st-have').innerHTML) && L.fanHtml() === '' && S.wallAsk('farnham') === false && !K.gate() && $('m-wall').hidden, `${where}: no Supporters' Wall anywhere`);
    S.close();
  }
  // the app with Farnham's Super Fan: offered in the Grown-Ups panel and the Locker
  app(); FARNHAM.agreed = true; L.set(L.fresh()); S.setBought(['tryline.fan.farnham']); D.goHome();
  S.open({ mode:'grown' });
  ok(/^<p class="st-own st-fanown"><span class="jw[^]*?<\/span><span class="st-ownname">Super Fan · Farnham RUFC<\/span><button class="btn st-wall" data-wall="farnham">Join the Supporters' Wall<\/button><\/p>$/.test($('st-have').innerHTML), 'the Grown-Ups panel: Join the Supporters\' Wall on the line of the Super Fan it has, beside the club\'s name (a row of its own pushed the card off a phone)');
  ok(/data-wall="farnham"/.test(L.fanHtml()), 'and the Locker\'s Super Fan tile');
  ok(S.wallAsk('guildford') === false && !K.gate(), 'never for a club the device does not own');
  opened.length = 0;
  ok(S.wallAsk('farnham') === true && !!K.gate() && $('m-store').hidden && $('m-wall').hidden, 'Join asks a grown-up first, the Grown-Ups card hidden under the check');
  cancel();
  ok(!K.gate() && !$('m-store').hidden && $('m-wall').hidden && !opened.length, 'cancelled: the Grown-Ups card is back, and nothing more');
  S.wallAsk('farnham'); pass();
  ok(!$('m-wall').hidden && $('m-store').hidden && $('wl-title').textContent === 'Farnham RUFC' && !$('wl-age').hidden && $('wl-name').hidden && S.wall().step === 'age' && !opened.length, 'passed: the card, for Farnham RUFC, asking Are you 18 or over? first');
  $('wl-no').click();
  ok($('m-wall').hidden && !$('m-store').hidden && !S.wall() && !opened.length, 'Cancel: the card closes onto the Grown-Ups panel, and nothing opens');
  S.wallAsk('farnham'); pass(); $('wl-yes').click();
  ok($('wl-age').hidden && !$('wl-name').hidden && S.wall().step === 'name' && $('wl-go').disabled && $('wl-input').value === '', 'Yes, I\'m 18 or Over: How Your Name Appears, empty, and Continue waits for a name');
  type(' '); ok($('wl-go').disabled, 'a blank name: Continue still waits');
  type(NAME); ok(!$('wl-go').disabled, 'a name typed: Continue');
  $('wl-go').click();
  ok(opened.length === 1 && opened[0][0] === MAIL && opened[0][1] === '_blank' && opened[0].length === 2, `Continue: the grown-up's own email opens, to support@signcheck.ai, by the way every link leaves the app (${opened[0] && opened[0][0]})`);
  const url = new URL(opened[0][0]), body = url.searchParams.get('body');
  ok(url.protocol === 'mailto:' && url.pathname === 'support@signcheck.ai' && url.searchParams.get('subject') === "Supporters' Wall: Farnham RUFC" && [...url.searchParams.keys()].join() === 'subject,body', 'the subject names the club; nothing else is in the address');
  ok(body.split('\r\n')[0] === 'Name: Sam, Farnham' && body.split('\r\n')[1] === 'Club: Farnham RUFC' && /I am 18 or over\. I agree to be listed on the Supporters' Wall by this name, and I can ask to be removed at any time\.$/.test(body), 'the body: the name as typed, the club, and the grown-up\'s yes: 18 or over, agreeing to be listed, and free to be removed at any time');
  ok($('m-wall').hidden && !S.wall() && $('wl-input').value === '' && !$('m-store').hidden, 'the card closes, its field emptied, onto the Grown-Ups panel');
  ok(!nameKept(), 'no name kept: not in the save, the settings, the store\'s state, the Locker or the card');
  ok(!/fetch\(|XMLHttpRequest|sendBeacon|localStorage|save\(/.test(ui.slice(ui.indexOf('let storeWallUi'), ui.indexOf('$(\'m-wall\').hidden = true;')) + src.slice(src.indexOf('const storeWallName'), src.indexOf('/* ---------- the Super Fan\'s club, first'))), 'the wall\'s code sends nothing and saves nothing');
  S.close();
  // from the Locker: the same, and back to the Locker; Escape and Cancel empty the field
  L.open(0); opened.length = 0;
  S.wallAsk('farnham'); pass(); $('wl-yes').click(); type(NAME);
  fire('keydown', { key:'Escape' });
  ok($('m-wall').hidden && $('m-store').hidden && $('wl-input').value === '' && !opened.length && !$('s-locker').hidden, 'from the Locker: Escape closes the card, its field emptied, back on the Locker');
  S.wallAsk('farnham'); pass(); $('wl-yes').click(); type(NAME); $('wl-cancel').click();
  ok($('m-wall').hidden && $('wl-input').value === '' && !opened.length && !nameKept(), 'Cancel likewise');
  S.wallAsk('farnham'); pass(); $('wl-yes').click(); type('  Jo\n\tB  '); $('wl-input').fire('keydown', { key:'Enter' });
  ok(opened.length === 1 && new URL(opened[0][0]).searchParams.get('body').startsWith('Name: Jo B\r\nClub: Farnham RUFC'), 'Enter sends it on too; the name on one line, its spaces and breaks made plain');
  // the name: one line, 40 characters at most, two at least
  ok(S.wallName('x'.repeat(60)).length === 40 && S.wallMail(FARNHAM, 'x') === null && S.wallMail(FARNHAM, '') === null && S.wallMail(null, NAME) === null && S.wallMail(FARNHAM, NAME) === MAIL, 'a name is two to forty characters, for a club');
  ok(/maxlength="40"/.test(html.slice(html.indexOf('id="wl-input"') - 40, html.indexOf('id="wl-input"') + 200)), 'the field takes forty');
  // a purchase in flight, or the card already up: nothing more is asked
  S.open({ mode:'grown' }); S.ui().busy = true;
  ok(S.wallAsk('farnham') === false && !K.gate(), 'not while a purchase is under way');
  S.ui().busy = false; S.close();
  ok(/function storeWallAsk[\s\S]*?parentGate\(\(\) => storeWallOpen/.test(ui) && /DEFAULT_FOCUS\['m-wall'\]/.test(ui) && (ui.match(/window\.open\(/g) || []).length === 2, 'the grown-up check first, a controller\'s first press on the card, and storeOpenUrl still the one way out');
  reset(); L.set(L.fresh());
}

reset();
console.log(`Store: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
