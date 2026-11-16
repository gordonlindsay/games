// 1.10 (README, Home, My Team, Profile and Team Links; the owner, 2026-11-16: "Don't start with Farnham unless directed to it via a specific
// team sign-up link, for example, a QR code or a custom URL. Start generically with the ability to search from the top of the hierarchy",
// "Difficulty level needs setting at the start too"): no default club everywhere a club is used; the team screen's Filter at its top, nothing
// chosen, its counts clubs and its Clubs column A to Z from the start; the setup's Difficulty step (Kids | Easy | Normal | Hard, the age
// group's level marked, Hard locked on the free tier, a Mini asked Leave Minis?, Skip keeping the age group's level); team links
// (#club=<code or name>: a first launch's setup on that club, after it Make Farnham My Team?, an unknown one ignored, the hash taken off the
// address, served offline by the service worker); a save from before 1.10 keeping Farnham; Team and Settings' tabs. Its last part needs
// Playwright and Chromium (as tools/home.mjs's does) and is skipped, saying so, where they are missing: the setup's Club and Difficulty steps
// and Quick Match's Filter at the top at five phone sizes (no scroll, every target 44px, a controller and the keyboard), and a team link
// opened offline through the real service worker.   node tools/links.mjs   Exits 1 on any failure.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
process.env.SEED ??= '73';
const { T, rndCalls } = await import('./harness.mjs');
const F = T.profile, D = T.debug, X = T.teams, H = T.home, C = T.career, K = T.cups, P = T.picker, S = T.store, $ = id => document.getElementById(id);
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } if (process.env.VERBOSE) console.log(cond ? 'ok  ' : 'FAIL', msg); };
const json = JSON.stringify;
const memory = {};
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = String(v); } };
const saved = () => JSON.parse(memory['tryline.v1']);
const MORE = ['s-setup', 's-profile', 's-career-new', 's-career-look', 's-career', 's-cup', 's-locker', 's-cabinet'];
{ const qsa = document.querySelectorAll; document.querySelectorAll = sel => (sel === '.screen' ? qsa(sel).concat(MORE.map(id => $(id))) : qsa(sel)); for (const id of MORE) $(id).hidden = true; }
const shown = () => ['s-home', 's-teams', 's-hub', 's-help', 's-join', 's-build', ...MORE].find(id => !$(id).hidden);
for (const id of ['my-box', 'b-my', 'pf-team', 'b-match', 'b-career']) { const e = $(id), at = {}; e.setAttribute = (k, v) => { at[k] = String(v); }; e.getAttribute = k => (k in at ? at[k] : null); for (const k of Object.keys(e.dataset)) delete e.dataset[k]; }   // the stand-in DOM keeps no attributes: these remember theirs (and forget what the boot's home set, so it is set again)
const st = D.settings();
const fresh = () => {                                       // a 1.10 game on its defaults: no club, Normal, Men, no profile, the web as shipped
  F.set({ age:null, gender:null, look:null }); st.cat = 'men'; st.kids = false; st.diff = 1; st.myClub = null; st.myClubLegacy = false; st.myNat = null; st.pick = [null, null]; st.fav = []; st.recent = [[], []];
  S.setNative(null); S.setTier(null); S.setBought([]); S.setStarted(false); if (!$('m-store').hidden) S.close();
  X.setChamp(null); K.set(null); C.set(null); X.restore({ custom:[] }); T.importer.setLeague(null); $('m-gate').hidden = true; $('m-minis').hidden = true; F.setFirst(false); H.link.setPending(null);
  if (H.link.card()) H.link.close(false);
  D.goHome();
};
const FL = () => P.filterState();
const flHeads = () => FL().cols.map(c => c.head).join();

// 1. No club anywhere: a new game has none, and every place a club is used says so or asks for one
{
  fresh();
  ok(H.myClub() === null && st.myClub === null && st.myClubLegacy === false, 'a new game (no save): no club, not Farnham');
  ok($('my-box').classList.contains('none') && !$('my-none').hidden && $('my-box').getAttribute('aria-label') === 'My Team', 'the home\'s box: My Team and Pick Your Club, nothing else');
  ok(H.myPool() === null && H.myIs(X.CLUBS[0]) === false && !H.myIs(null) && H.myIs(X.NATIONS.find(n => n.id === 'ENG')), 'no club side is My Team\'s (the country still England)');
  $('b-mypick').click();
  ok(shown() === 's-teams' && D.pickMode() === 'my' && FL().open && FL().top && !FL().embed && flHeads() === 'Area,Country,League,Teams' && FL().cols[0].sel === -1, `Pick Your Club: My Team's picker, its Filter at the top, no area chosen (${flHeads()})`);
  P.filterTap(3, FL().cols[3].az.findIndex(h => h.t.id === 'BTH'));
  ok(st.myClub === 'BTH' && H.myClub().id === 'BTH' && !FL().open, 'one tap on a club in the A to Z column picks it: Bath is My Team');
  fresh();
  // Quick Match: Your Team opens its Filter at the top, nothing set until picked
  $('b-match').click(); $('b-quick').click();
  ok(shown() === 's-teams' && D.pickMode() === 'quick' && FL().open && FL().top && FL().s === 0 && !P.state().sides[0].set && P.state().sides[0].top, 'Quick Match with no club and no last pick: Your Team\'s Filter at the top, nothing set');
  P.filterClose(); ok(!FL().open && !P.state().sides[0].set && !/gap mine/.test($('t-side0').innerHTML), 'closed: the card on the ladder\'s first side, unset, nothing marked My Team');
  st.pick = [{ id:'BTH', cat:'men', g:'eng' }, null]; D.openTeams('quick');
  ok(!FL().open && P.view(0).team.id === 'BTH', 'with a last pick: that side, no Filter (as ever)');
  fresh();
  // Championship: no Play as pre-pick of a club of yours
  H.champPick('sur');
  ok(shown() === 's-teams' && P.view(0).i === 0 && !P.state().sides[0].set && !/gap mine/.test($('t-side0').innerHTML) && P.view(0).team.id !== 'FAR', `Championship with no club: the competition's first side on show (${P.view(0).team.name}), nothing marked My Team, nothing picked for you`);
  D.goHome();
  // Competitions' Local tier: Pick Your County
  ok(json(H.comps(2)) === json([['county', 'Pick Your County']]), 'Local: Pick Your County in place of Surrey and Other County');
  H.champPick('county');
  ok(T.local.champCounty() && FL().open && FL().top && FL().cols[0].head === 'County' && FL().cols[0].sel === -1 && FL().cols[0].rows.length === 28 && FL().cols[1].az && FL().cols[1].head === 'Teams', `Pick Your County: the Filter at the top of the County column, no county chosen, every county club A to Z beside it (${flHeads()})`);
  { const ken = FL().cols[0].rows.findIndex(n => n.name === 'Kent'); P.filterSel(0, ken); const first = FL().cols[1].rows[0]; P.filterTap(1, 0);
    const c = X.champ(); ok(c && c.teams[c.user].id === first.id, `a Kent club picked from it plays Kent's championship (${first.name})`); X.setChamp(null); }
  fresh();
  // Career's New Player: the club picker at the top; Start Career asks for a club first
  C.set(null); C.newOpen();
  ok(shown() === 's-career-new' && C.draft().club === null && />My Team</.test($('cn-mine').innerHTML) && /--kit:#888888/.test($('cn-mine').innerHTML) && $('cn-change').textContent === 'Pick Your Club', 'New Player with no club: My Team in a plain kit, Pick Your Club');
  ok(T.sidesOf.careerNewGo() === false && !C.get() && shown() === 's-teams' && D.pickMode() === 'career' && FL().open && FL().top, 'Start Career with no club: no career yet, the club picker with its Filter at the top');
  P.filterTap(3, FL().cols[3].az.findIndex(h => h.t.id === 'BTH'));
  ok(shown() === 's-career-new' && C.draft().club.id === 'BTH' && $('cn-change').textContent === 'Change Club' && /Bath/.test($('cn-mine').innerHTML), 'a club tapped: back to New Player on Bath, Change Club');
  ok(T.sidesOf.careerNewGo() === true && C.get() && C.get().club.id === 'BTH', 'and Start Career starts it'); C.set(null);
  fresh();
  // My Profile: My Team's row reads Pick Your Club; the look stands in a plain kit
  F.profileOpen();
  ok(shown() === 's-profile' && /<b>My Team<\/b>/.test($('pf-club').innerHTML) && /--kit:#888888/.test($('pf-club').innerHTML) && $('pf-team').textContent === 'Pick Your Club' && $('pf-team').getAttribute('aria-label') === 'Pick Your Club', 'My Profile with no club: My Team in a plain kit, and Pick Your Club');
  $('pf-team').click(); ok(D.pickMode() === 'my' && FL().open && FL().top, 'which opens My Team\'s picker at the top'); P.filterClose(); $('t-back').click(); ok(shown() === 's-profile', 'and comes back');
  ok(F.lookClub() === null && H.PLAIN.kit === '#888888', 'the look\'s kit with no club: plain (MY_PLAIN)');
  fresh();
  // the Team tab with no club: My Team, Change still to My Profile
  $('b-set').click(); $('ts-tab-team').click();
  ok(H.tab() === 'team' && $('ts-name').textContent === 'My Team' && $('ts-shirt').hidden && $('b-my').getAttribute('aria-label') === 'Change My Profile', 'Team and Settings\' Team tab with no club: My Team, no shirt, Change to My Profile');
  $('my-box').click(); ok(H.step() === 'settings', 'the box with no club is not itself a button: pressing it leaves the tab as it was');
  D.goHome(); $('my-box').click(); ok(H.step() === null, 'and on the tiles does nothing (Pick Your Club inside it does)');
  // the Super Fan's purchase is a club choice
  S.setNative(true); S.setStarted(true); S.setBought(['tryline.fan.farnham']); D.goHome();
  ok(H.myClub() && H.myClub().id === 'FAR' && !$('my-box').classList.contains('none'), 'a Super Fan of Farnham with no club picked: Farnham, its box');
  fresh();
}

// 2. A save from before 1.10 keeps Farnham: no myClubLegacy in it, and no club picked
{
  fresh();
  X.restore({ settings:{ played:3, sound:false } }); D.goHome();
  ok(st.myClubLegacy === true && H.myClub() === X.CLUBS[0] && !$('my-box').classList.contains('none'), 'a save from before 1.10 with no club picked: Farnham, as it was for that player');
  X.save(); ok(saved().settings.myClubLegacy === true && saved().settings.myClub === null, 'saved with the flag, not as a club');
  st.myClubLegacy = false; X.load(); ok(st.myClubLegacy === true && H.myClub() === X.CLUBS[0], 'and read back with it');
  X.restore({ settings:{ played:3, myClub:'WIM' } }); ok(H.myClub().id === 'WIM', 'an old save\'s own club as ever');
  st.myClub = null; X.restore({ settings:{ played:3, myClub:null, myClubLegacy:false } }); ok(st.myClubLegacy === false && H.myClub() === null, 'a 1.10 save with no club: none');
  X.restore({ settings:{ myClubLegacy:'yes' } }); ok(st.myClubLegacy === true, 'a broken flag is read as a save from before it');
  fresh();
}

// 3. The Filter at the top, the setup's Club step: Area | Country | League | Clubs, nothing chosen, counts of clubs, Clubs A to Z capped
{
  fresh();
  const R0 = rndCalls();
  F.open(); F.answer('adult'); F.answer('male'); F.answer('normal');
  const run = F.run(), V = P.view(0), all = new Set(V.ladder.filter(g => g.hemi !== 'fav' && g.hemi !== 'recent').flatMap(g => g.teams.filter(t => !t.act).map(t => t.id)));
  ok(F.STEPS[run.step].id === 'club' && shown() === 's-teams' && D.pickMode() === 'setup' && FL().open && FL().top && FL().embed && FL().q === '', 'the setup\'s Club with no link: the team screen, its Filter held in the step at the top');
  ok(flHeads() === 'Area,Country,League,Clubs' && FL().cols[0].sel === -1 && FL().cols[0].rows.map(n => n.name).join() === 'Northern Hemisphere,Southern Hemisphere,My Clubs' && !FL().cols[1].rows.length && !FL().cols[2].rows.length, `Area | Country | League | Clubs: the areas, none chosen, Country and League empty (${flHeads()}; ${FL().cols[0].rows.map(n => n.name).join(', ')})`);
  const az = FL().cols[3], names = az.az.map(h => X.listName ? X.listName(h.t) : h.t.name), sorted = [...names].sort((a, b) => a.localeCompare(b, 'en-GB'));
  ok(az.all === all.size && az.rows.length === Math.min(T.local.FL_CAP, all.size) && json(names) === json(sorted) && az.cur === -1, `Clubs: every club, A to Z, from the start, the first ${az.rows.length} drawn of ${az.all}`);
  ok(new RegExp(`<p class="fl-none fl-more">${az.rows.length} of ${az.all.toLocaleString('en-GB')} Clubs</p>`).test($('fl-cols').innerHTML), `and said under them: ${az.rows.length} of ${az.all} Clubs`);
  const north = FL().cols[0].rows[0], south = FL().cols[0].rows[1];
  const count = n => +(new RegExp(`aria-label="${n}, ([\\d]+) Clubs?"`).exec($('fl-cols').innerHTML) || [])[1];
  ok(count('Northern Hemisphere') + count('Southern Hemisphere') === all.size && count('Northern Hemisphere') > 100 && /aria-label="My Clubs, 0 Clubs"><b>My Clubs<\/b><\/button>/.test($('fl-cols').innerHTML), `the Area counts are clubs (Northern ${count('Northern Hemisphere')}, Southern ${count('Southern Hemisphere')}), My Clubs with none shown no 0`);
  P.filterSel(0, 0);
  const c1 = FL().cols;
  ok(c1[0].sel === 0 && c1[1].rows.length > 3 && c1[1].sel === -1 && c1[3].az && c1[3].all === count('Northern Hemisphere') && c1[3].az.every(h => V.ladder[h.gi].hemi === north.hemi), `Northern Hemisphere chosen: its countries, none chosen, and its ${c1[3].all} clubs A to Z`);
  const eng = c1[1].rows.findIndex(n => n.name === 'England'); P.filterSel(1, eng);
  const c2 = FL().cols, engAll = c2[3].all;
  ok(c2[2].rows.length > 5 && c2[2].sel === -1 && engAll < c1[3].all && c2[3].az.every(h => V.ladder[h.gi].home === 'ENG'), `England chosen: its leagues and counties, and only its ${engAll} clubs`);
  const sur = c2[2].rows.findIndex(n => n.name === 'Surrey'); P.filterSel(2, sur);
  ok(rndCalls() === R0, `the setup to its Club and the Filter at the top, each choice in it: no random number drawn (${rndCalls() - R0})`);
  const c3 = FL().cols;
  ok(c3[3].head === 'Surrey' && !c3[3].az && c3[3].rows.some(t => t.id === 'FAR'), 'a county chosen: its own Teams column, as the Filter has always shown a group');
  P.filterSel(0, 1); ok(FL().cols[1].sel === -1 && FL().cols[3].az && FL().cols[3].all === count('Southern Hemisphere'), 'another area: back to its top, its clubs A to Z');
  // keys and pad: Right from a chosen area passes the empty columns; Up from the top row goes to the field (the keys) or the step's Back
  // and Skip (a controller, in the setup); Escape is the step's Back
  P.filterTap(3, FL().cols[3].az.findIndex(h => h.t.id === 'DUN'));
  ok(F.STEPS[F.run().step].id === 'look' && F.run().club.id === 'DUN' && !FL().open, 'one tap on a club picks it and moves on to Your Look');
  $('ck-pback').click();
  ok(F.STEPS[F.run().step].id === 'club' && !FL().open && P.view(0).team.id === 'DUN' && $('t-go').textContent === 'Pick Dunedin', 'Back to the Club: the card on the club picked (as before), no Filter');
  F.run().club = null; F.step(F.at('club'));
  ok(FL().open && FL().top, 'with none picked again: the Filter at the top');
  P.filterClose(); ok(F.STEPS[F.run().step].id === 'level' && !FL().open, 'its Close (Escape, B) is the step\'s Back: to Difficulty');
  F.answer('normal'); F.skip(); ok(F.STEPS[F.run().step].id === 'look' && F.run().club === null, 'Skip on the Club: no club, on to Your Look');
  F.end(false); ok(H.myClub() === null && shown() === 's-home', 'the setup ended with no club: none (the home\'s Pick Your Club)');
  fresh();
}

// 4. The setup's Difficulty step: third of five, the age group's level marked, Hard locked on the free tier, Leave Minis? for a Mini
{
  fresh();
  ok(json(F.STEPS.map(s => s.id)) === json(['age', 'gender', 'level', 'club', 'look']) && F.STEPS[2].title === 'Difficulty' && json(F.LEVELS.map(l => l.name)) === json(['Kids', 'Easy', 'Normal', 'Hard']) && json(F.LEVELS.map(l => l.n)) === json([1, 2, 3, 4]), 'five steps, Difficulty third: Kids | Easy | Normal | Hard, one to four balls');
  for (const [age, want] of [['mini', 'kids'], ['junior', 'easy'], ['adult', 'normal'], [null, 'normal']]) ok(F.suggest(age) === want, `${age || 'no age group'}: ${want} suggested`);
  F.open(); F.answer('junior'); F.answer('female');
  ok(F.STEPS[F.run().step].id === 'level' && F.run().level === null && $('su-title').textContent === 'Difficulty' && /aria-label="3 of 5"/.test($('su-step').innerHTML), 'a Junior: the Difficulty step, 3 of 5, nothing picked yet (Easy marked: measured in the browser part)');
  F.skip(); ok(F.STEPS[F.run().step].id === 'club' && F.run().level === null, 'Skip keeps the age group\'s level');
  F.skip(); F.end(false);
  ok(st.diff === 0 && !st.kids && st.cat === 'women', `the setup ended: a Junior's Easy (diff ${st.diff}, kids ${st.kids}), Women`);
  fresh();
  F.open(); F.answer('adult'); F.answer('male'); F.answer('easy');
  ok(F.run().level === 'easy' && F.STEPS[F.run().step].id === 'club', 'an Adult picking Easy: kept, on to the Club');
  F.back(); F.back(); F.back(); F.answer('adult');
  ok(F.run().level === 'easy', 'the same age group again: the level kept');
  F.back(); F.back(); F.answer('mini');
  ok(F.run().level === null, 'another age group: the level picked is cleared, its own suggested');
  F.answer('male'); F.answer('easy');
  ok(T.kids.minis.open() && F.STEPS[F.run().step].id === 'level', 'a Mini picking Easy: Leave Minis? at the tap, the step waiting');
  $('mn-keep').click(); ok(!T.kids.minis.open() && F.run().level === null && F.STEPS[F.run().step].id === 'level', 'Keep Minis: the step as it was, nothing picked');
  F.answer('kids'); ok(!T.kids.minis.open() && F.run().level === 'kids', 'Kids: no question');
  F.back(); F.answer('normal'); D.CONFIRM.at = 0; $('mn-go').click();
  ok(F.run().level === 'normal' && F.STEPS[F.run().step].id === 'club', 'Change: Normal picked, on to the Club');
  F.skip(); F.end(false);
  ok(st.diff === 1 && !st.kids && st.cat === 'minis' && F.get().age === 'mini', `the setup ended: a Mini on Normal, Minis kept (diff ${st.diff}, kids ${st.kids}, ${st.cat})`);
  fresh();
  // Hard: the Full Game's; on the free tier the Unlock card and the step as it was
  S.setTier('free'); D.goHome();
  F.open(); F.answer('adult'); F.answer('male'); F.answer('hard');
  ok(!$('m-store').hidden && S.ui().feature === 'hard' && F.run().level === null && F.STEPS[F.run().step].id === 'level', 'Hard on the free tier: the Unlock card, nothing picked, the step waiting');
  S.close(); S.setTier(null); F.answer('hard');
  ok(F.run().level === 'hard' && F.STEPS[F.run().step].id === 'club', 'Hard with the Full Game: picked');
  F.skip(); F.end(false); ok(st.diff === 2 && !st.kids, 'the setup ended on Hard');
  fresh();
}

// 5. Team links: #club=<code or name>
{
  fresh();
  const L = H.link;
  ok(L.find('farnham').id === 'FAR' && L.find('FAR').id === 'FAR' && L.find('far').id === 'FAR' && L.find('Farnham').id === 'FAR' && L.find(' FAR ').id === 'FAR', 'a club by its code (any case) or its name\'s slug, or a Super Fan club\'s key: Farnham');
  ok(L.find('old-wimbledonians').id === 'OWI' && L.find('old-wimbledonian').id === 'OWI' && L.find('wimbledon').id === 'WIM' && L.find('BTH').id === 'BTH', 'a county club by its slug (its full name\'s too: Old Wimbledonians), a club by its code');
  ok(L.find('nowhere') === null && L.find('') === null && L.find('x'.repeat(80)) === null && L.find(null) === null && L.find('ENG') === null, 'an unknown club, nothing, too long, or a nation: none');
  const tidy = [];
  globalThis.history = { state:null, replaceState:(s, t, u) => tidy.push(u) };
  globalThis.location = { hash:'#club=farnham', pathname:'/trylinerugby/', search:'' };
  // a first launch: the setup opens its Club on the club's card
  F.setFirst(true);
  ok(L.boot().id === 'FAR' && json(tidy) === json(['/trylinerugby/']) && L.pending().id === 'FAR' && !L.card(), 'a first launch\'s link: read once, the hash taken off the address, kept for the setup, nothing asked');
  F.open(); ok(F.run().link.id === 'FAR' && L.pending() === null, 'the setup takes it');
  F.answer('adult'); F.answer('male'); F.answer('normal');
  ok(D.pickMode() === 'setup' && !FL().open && P.view(0).team.id === 'FAR' && $('t-go').textContent === 'Pick Farnham' && F.run().club === null, 'its Club opens on Farnham\'s card, Pick Farnham, nothing picked until pressed');
  $('t-go').click(); ok(F.run().club.id === 'FAR' && F.STEPS[F.run().step].id === 'look', 'Pick Farnham: picked, on to Your Look');
  F.end(false); ok(st.myClub === 'FAR' && st.myNat === 'ENG' && H.myClub().id === 'FAR', 'the setup ended: Farnham My Team\'s, England its country');
  fresh();
  location.hash = '#club=farnham'; F.setFirst(true); L.boot(); F.open(); F.answer('adult'); F.answer('male'); F.answer('normal'); F.skip(); F.end(false);
  ok(H.myClub() === null, 'the link\'s club skipped on the Club step: no club');
  fresh();
  // after the setup: Make Farnham My Team?, Change | Keep
  st.myClub = 'WIM'; D.goHome(); location.hash = '#club=FAR'; tidy.length = 0;
  ok(L.boot().id === 'FAR' && L.card() && !$('m-link').hidden && $('ln-q').textContent === 'Make Farnham My Team?' && tidy.length === 1, 'a link to another club after the setup: Make Farnham My Team?, once');
  $('ln-keep').click(); ok(!L.card() && $('m-link').hidden && st.myClub === 'WIM', 'Keep: My Team as it was');
  const gap = D.CONFIRM.gap; D.CONFIRM.gap = 500;   // the game's own gap (the stand-in runs with none)
  location.hash = '#club=FAR'; L.boot(); $('ln-go').click();
  ok(L.card() && st.myClub === 'WIM', 'a double tap that opened it never goes on to Change');
  D.CONFIRM.gap = gap; D.CONFIRM.at = 0; $('ln-go').click(); ok(!L.card() && st.myClub === 'FAR' && saved().settings.myClub === 'FAR' && $('my-name').textContent === 'Farnham', 'Change: Farnham is My Team, saved, on the home');
  location.hash = '#club=FAR'; L.boot(); ok(!L.card(), 'a link to My Team\'s own club asks nothing');
  st.myClub = null; D.goHome(); location.hash = '#club=bath'; L.boot();
  ok(L.card() && $('ln-q').textContent === 'Make Bath My Team?', 'with no club yet: the same question'); L.close(false);
  location.hash = '#club=nowhere'; tidy.length = 0; ok(L.boot() === null && !L.card() && tidy.length === 1, 'an unknown club: ignored, the hash taken off all the same');
  location.hash = '#top'; tidy.length = 0; ok(L.boot() === null && !tidy.length, 'any other hash: left alone');
  location.hash = '#x=1&club=FAR'; ok(L.read().id === 'FAR', 'the club among other parts of a hash');
  location.hash = '?club=FAR'; ok(L.read() === null, 'a query is not a link (the service worker sends a query to the network: sw.js)');
  delete globalThis.location; delete globalThis.history;
  const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), boot = fs.readFileSync(new URL('../src/boot.js', import.meta.url), 'utf8');
  ok(/linkBoot\(\);/.test(boot) && boot.indexOf('profileBoot();') < boot.indexOf('linkBoot();'), 'boot.js reads the link once, after the setup may have opened');
  ok(!/club=|location\.hash/.test(sw) && /if \(event\.request\.mode === 'navigate'\) url\.hash = '';/.test(sw), 'the service worker knows nothing of clubs: a navigation\'s fragment is ignored, so a link\'s page comes from its cache offline (a browser gives a navigation\'s request its fragment, which the worker once sent to the network)');
  fresh();
}

// 6. Team and Settings' tabs: the tile opens Game, the box Team; every way back lands on its tab
{
  fresh(); st.myClub = 'FAR'; D.goHome();
  $('b-set').click(); ok(H.step() === 'settings' && H.tab() === 'game', 'the tile: Game');
  D.goHome(); $('my-box').click(); ok(H.step() === 'settings' && H.tab() === 'team', 'the box: Team');
  for (const [id, tab] of [['b-my', 'team'], ['b-locker', 'team'], ['b-cabinet', 'team'], ['b-import', 'team'], ['b-grown', 'game']]) { D.goHome($(id)); ok(H.step() === 'settings' && H.tab() === tab, `back to ${id}: the ${tab} tab`); }
  ok(H.tabOf($('b-my')) === 'team' && H.tabOf($('b-grown')) === 'game', 'a button\'s tab by its id, where the stand-in DOM has no closest');
  fresh();
}


await browserChecks();
console.log(`Links: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;

function chromium() {
  const require = createRequire(import.meta.url);
  for (const from of [() => require('playwright'), () => require(path.join(execFileSync('npm', ['root', '-g'], { stdio:['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright'))]) {
    try { return from().chromium; } catch (e) { /* not here */ }
  }
  return null;
}
// 7. In Chromium: the setup's Club (the Filter held in the step at the top) and Difficulty at five phone sizes, Quick Match's Filter at the
//    top, a controller and the keyboard, and a team link opened offline through the real service worker
async function browserChecks() {
  if (process.env.GAME || process.env.NO_BROWSER) { console.log('skip the browser checks (GAME or NO_BROWSER set)'); return; }
  const chrome = chromium();
  if (!chrome) { console.log('skip the browser checks: Playwright is not installed (npm i -g playwright && npx playwright install chromium)'); return; }
  let browser;
  try { browser = await chrome.launch(); } catch (e) { console.log('skip the browser checks: Chromium would not start (' + e.message.split('\n')[0] + ')'); return; }
  const dir = fileURLToPath(new URL('../', import.meta.url));
  const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.png':'image/png', '.webmanifest':'application/manifest+json', '.json':'application/json' };
  const server = http.createServer((req, res) => {
    const file = path.resolve(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type':TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const MEASURE = () => {
    const box = e => e.getBoundingClientRect(), vis = e => !!e && !e.hidden && !e.closest('[hidden]') && box(e).width > 0 && getComputedStyle(e).visibility !== 'hidden';
    const s = [...document.querySelectorAll('.screen')].find(x => !x.hidden), f = document.getElementById('m-filter'), scope = [s, ...(f.hidden ? [] : [f])];
    const btns = scope.flatMap(x => [...x.querySelectorAll('button')]).filter(vis), lists = [...f.querySelectorAll('.fl-list')];
    const inList = b => lists.some(l => l.contains(b));
    return { id:s.id, scroll:s.scrollHeight - s.clientHeight, wide:document.documentElement.scrollWidth - innerWidth,
      small:btns.filter(b => box(b).height < 43.5 || box(b).width < 43.5).map(b => b.id || b.textContent.trim().slice(0, 20)),
      off:btns.filter(b => !inList(b)).filter(b => box(b).top < -0.5 || box(b).bottom > innerHeight + 0.5 || box(b).left < -0.5 || box(b).right > innerWidth + 0.5).map(b => b.id || b.textContent.trim().slice(0, 20)),
      cut:[...document.querySelectorAll('.su-word, .fl-h, .fl-r b, .su-name h2, #t-title')].filter(vis).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim()) };
  };
  try {
    for (const [w, h] of [[844, 390], [667, 375], [844, 340], [667, 320], [568, 320]]) {
      const ctx = await browser.newContext({ viewport:{ width:w, height:h }, deviceScaleFactor:1, isMobile:true, hasTouch:true, serviceWorkers:'block' });
      const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(base + 'index.html', { waitUntil:'load' }); await page.evaluate(() => document.fonts.ready);
      const kind = `${w}x${h}`;
      // the Difficulty step: four quarters, the suggestion marked, Hard's lock on the free tier
      const lvl = await page.evaluate(MEASURE => {
        const T = window.__tryline, $ = id => document.getElementById(id), out = {};
        T.store.setTier('free'); T.profile.open(); T.profile.answer('junior'); T.profile.answer('male');
        const cards = [...$('su-opts').querySelectorAll('[data-v]')], r = cards.map(c => c.getBoundingClientRect());
        out.cards = cards.map(c => c.dataset.v).join(); out.marked = (cards.find(c => c.getAttribute('aria-pressed') === 'true') || {}).dataset?.v;
        out.even = r.every(q => Math.abs(q.width - r[0].width) < 1 && Math.abs(q.top - r[0].top) < 1) && r[0].width > 0;
        out.lock = cards[3].classList.contains('locked') && !cards.slice(0, 3).some(c => c.classList.contains('locked'));
        out.balls = cards.map(c => c.querySelectorAll('svg > g').length).join();
        out.m = (new Function('return (' + MEASURE + ')()'))();
        T.store.setTier(null);
        return out;
      }, MEASURE.toString());
      ok(lvl.cards === 'kids,easy,normal,hard' && lvl.marked === 'easy' && lvl.even && lvl.balls === '1,2,3,4', `${kind}: Difficulty: Kids | Easy | Normal | Hard in equal quarters, one to four balls, a Junior's Easy marked (${lvl.cards}; ${lvl.marked}; ${lvl.balls})`);
      ok(lvl.lock, `${kind}: Hard carries the lock on the free tier, the rest none`);
      ok(!lvl.m.scroll && !lvl.m.wide && !lvl.m.small.length && !lvl.m.off.length && !lvl.m.cut.length, `${kind}: Difficulty fits: no scroll, every target 44px, nothing off the screen or cut (${JSON.stringify(lvl.m)})`);
      // the Club step at the top, held in the step
      const club = await page.evaluate(MEASURE => {
        const T = window.__tryline, $ = id => document.getElementById(id), out = {}, box = e => e.getBoundingClientRect();
        T.profile.answer('easy');
        const f = $('m-filter'), top = box(document.querySelector('#s-teams .pk-top')), card = box($('fl-card'));
        out.open = !f.hidden && f.classList.contains('fl-embed') && f.classList.contains('fl-top');
        out.under = card.top >= top.bottom - 0.5 && card.bottom <= innerHeight + 0.5 && card.left >= -0.5 && card.right <= innerWidth + 0.5;
        out.backSkip = ['t-sback', 't-skip'].every(id => { const b = $(id), q = box(b); return !b.inert && !b.closest('[inert]') && q.width >= 44 && q.height >= 44 && q.bottom <= card.top + 0.5; });
        out.close = getComputedStyle($('fl-close')).display === 'none';
        out.heads = [...f.querySelectorAll('.fl-h')].map(e => e.textContent).join();
        out.cardHidden = getComputedStyle($('t-sides')).visibility === 'hidden';
        out.m = (new Function('return (' + MEASURE + ')()'))();
        // a controller: the first press on the Clubs column's first; Up from Area's first to Back or Skip; A on Skip moves on
        T.debug.setDev('pad'); T.debug.goHome && 0;
        const id = el => (el ? el.id || el.textContent.trim().slice(0, 20) : 'none');
        T.home.ring(null); out.first = id(T.navMove(0, 0, 0));
        T.home.ring($('fl-cols').querySelector('[data-col="0"][data-i="0"]')); out.up = id(T.navMove(0, 0, -1));
        out.along = id(T.navMove(0, 1, 0)); out.down = id(T.navMove(0, 0, 1));
        T.home.ring($('fl-cols').querySelector('[data-col="0"][data-i="0"]')); out.right = id(T.navMove(0, 1, 0));
        T.home.ring(null); T.debug.setDev('touch');
        return out;
      }, MEASURE.toString());
      ok(club.open && club.under && club.close && club.cardHidden && club.heads === 'Area,Country,League,Clubs', `${kind}: the setup's Club: the Filter at its top held in the step under Back, the dots, Pick Your Club and Skip, no Close of its own, the card unseen under it (${club.heads})`);
      ok(club.backSkip, `${kind}: Back and Skip live, 44px, above the Filter`);
      ok(!club.m.scroll && !club.m.wide && !club.m.small.length && !club.m.off.length && !club.m.cut.length, `${kind}: it fits: no scroll, every target 44px, nothing off the screen or cut (${JSON.stringify(club.m)})`);
      ok(/^Acklam|^A/.test(club.first) && ['t-sback', 't-skip'].includes(club.up) && ['t-skip', 't-sback'].includes(club.along) && club.along !== club.up && club.down !== 'none' && club.right !== 'none' && club.right !== 'Country', `${kind}: a controller: the first press on the A to Z's first club, Up from Area's top to Back or Skip, along to the other, Down into the rows; Right from Area passes the empty columns to the clubs (${club.first} | ${club.up} ${club.along} ${club.down} | ${club.right})`);
      // the keyboard: Escape is Back (to Difficulty); a tap on a club picks it
      await page.keyboard.press('Escape');
      const back = await page.evaluate(() => [window.__tryline.profile.STEPS[window.__tryline.profile.run().step].id, document.getElementById('m-filter').hidden]);
      await page.evaluate(() => window.__tryline.profile.answer('normal'));
      await page.locator('#fl-cols [data-col="3"][data-i="1"]').tap();
      const picked = await page.evaluate(() => { const R = window.__tryline.profile.run(); return [window.__tryline.profile.STEPS[R.step].id, R.club && R.club.name]; });
      ok(back[0] === 'level' && back[1] === true && picked[0] === 'look' && picked[1], `${kind}: Escape on it is the step's Back (to Difficulty); a tap on a club picks it and moves on (${back.join(' ')} | ${picked.join(' ')})`);
      // Quick Match with no club: the Filter at its top, as a card
      const quick = await page.evaluate(MEASURE => {
        const T = window.__tryline, $ = id => document.getElementById(id);
        T.debug.goHome(); $('b-match').click(); $('b-quick').click();
        const f = $('m-filter'), out = { open:!f.hidden && f.classList.contains('fl-top') && !f.classList.contains('fl-embed'), heads:[...f.querySelectorAll('.fl-h')].map(e => e.textContent).join(), close:getComputedStyle($('fl-close')).display !== 'none' };
        out.m = (new Function('return (' + MEASURE + ')()'))();
        T.picker.filterClose(); T.debug.goHome();
        return out;
      }, MEASURE.toString());
      ok(quick.open && quick.close && quick.heads === 'Area,Country,League,Teams' && !quick.m.small.length && !quick.m.off.length && !quick.m.wide, `${kind}: Quick Match with no club: the Filter's card at its top, Close in reach, every target 44px (${quick.heads}; ${JSON.stringify(quick.m)})`);
      ok(!errors.length, `${kind}: no page errors (${errors.join('; ')})`);
      await ctx.close();
    }
    // a team link through the real service worker: installed, then offline, #club=farnham still opens the game and asks
    {
      const ctx = await browser.newContext({ viewport:{ width:844, height:390 }, isMobile:true, hasTouch:true });
      const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => { try { if (!localStorage.getItem('tryline.v1')) localStorage.setItem('tryline.v1', JSON.stringify({ settings:{ played:3, myClub:'WIM', myClubLegacy:false } })); } catch (e) { /* blocked */ } });
      await page.goto(base + 'index.html', { waitUntil:'load' });
      let ready = false;
      for (let i = 0; i < 60 && !ready; i++) { ready = await page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => !!(r && r.active && r.active.state === 'activated'))).catch(() => false); if (!ready) await page.waitForTimeout(500); }
      await page.reload({ waitUntil:'load' });
      const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
      await ctx.setOffline(true);
      await page.goto('about:blank');   // a new load, never a jump within the page already open
      const res = await page.goto(base + 'index.html#club=farnham', { waitUntil:'load' }).then(r => r, () => null);
      await page.waitForFunction(() => window.__tryline && !document.getElementById('s-home').hidden, null, { timeout:10000 }).catch(() => {});
      const got = await page.evaluate(() => ({ card:!document.getElementById('m-link').hidden, q:document.getElementById('ln-q').textContent, hash:location.hash, href:location.href.endsWith('/index.html') }));
      await page.click('#ln-go', { delay:20 }).catch(() => {});
      await page.waitForTimeout(500); await page.click('#ln-go').catch(() => {});
      const mine = await page.evaluate(() => window.__tryline.debug.settings().myClub);
      ok(ready && controlled, 'the service worker installs and controls the page');
      ok(!!res && got.card && got.q === 'Make Farnham My Team?' && got.hash === '' && got.href, `offline, the link #club=farnham is served from the cache and asks Make Farnham My Team?, the hash taken off the address (${JSON.stringify(got)})`);
      ok(mine === 'FAR', `and Change makes it My Team (${mine})`);
      ok(!errors.length, `the link offline: no page errors (${errors.join('; ')})`);
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
}
