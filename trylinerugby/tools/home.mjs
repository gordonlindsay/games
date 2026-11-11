// The home (README, Home): the wordmark, My Team's box (its shirt, name, stars and league line, the games played as it and its last five
// results, Change | Add Your Team | Locker) and the Trophy Cabinet's strip on the left; five big boxes on the right, Continue | Match | Career
// | Skill Games | Settings, and the steps they open (Match's Quick Match | Competitions, Competitions by tier with their team lists, Skill
// Games, Settings); Continue picking up what is under way, or Play; the games-and-form record; the Make This My Team offer after an import;
// the Legends behind the Full Game; a Super Fan of My Team's club with the box in its colours (its shield, or a club's crest), and the fit
// of every state at 844x390, 667x375, 844x340, 667x320 and 568x320.   node tools/home.mjs   Exits 1 on any failure.
// GAME=/path/to/index.html HOME_PRINT=1 node tools/home.mjs prints section 0's fingerprint for that build and stops: how BASE was pinned.
// CLUB_RATED=off HOME_PRINT=1 node tools/home.mjs prints it with no club rated from PR #14's tables: the proof behind the last re-pin.
process.env.SEED ??= '61';
const { T, reseed, bot } = await import('./harness.mjs');
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const X = T.teams, D = T.debug, H = T.home, S = T.store, L = T.locker, I = T.importer, C = T.career, K = T.cups, $ = id => document.getElementById(id);
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } if (process.env.VERBOSE) console.log(cond ? 'ok  ' : 'FAIL', msg); };
const json = v => JSON.stringify(v);
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };

// 0. Nothing the home does moves a match: AI v AI, a tool's match (the balance tools' kind: the bot against the computer), an arcade
//    Quick Match, a championship match and the demo, seeded, against the build before the headlines (2e4829d). Run first.
const BASE = '1fxxh0u pegg82 1efh8t2 1r7ihok gabcx7';   // re-pinned at the merge of pressure and the maul into wt/pr14int (2026-11-09), which together move AI v AI again on purpose; with PRESSURE='{"on":false}' MAUL='{"on":false}' this build gives 0b1293c's pin exactly, 1ux7bcz 1gqps57 1pw26gc lm4vs4 q2h33q; with MAUL off alone, pressure's, 1h04hlg 1phgpz9 1ke5vq7 7j2vuk 56loel; with PRESSURE off alone, the maul's, pqq94q 5nbfte pz8xha npkm5g 197j3jh. Pressure's note: re-pinned at pressure (PRESSURE, src/contact.js, 2026-11-09), which changes AI v AI and every match on purpose (the count, the spill, the egg's hops, a knock-on's beat); with PRESSURE='{"on":false}' this build gives the pin before it exactly, 1ux7bcz 1gqps57 1pw26gc lm4vs4 q2h33q. The maul's note: re-pinned at the maul (src/maul.js, 2026-11-09, as reviewed: never in the carrier's own in-goal or with a man from in front of the ball, a ringed tackler let go of a maul in the world, no Tackle into one once called): the CPU calls mauls in AI v AI, the tool's match, the arcade Quick Match, the championship match and the demo, so all five moved; with MAUL='{"on":false}' this build gives the pin before it exactly, 1ux7bcz 1gqps57 1pw26gc lm4vs4 q2h33q. Before that: re-pinned at the real order (src/ratings.js, CLUB_RATED, 2026-11-09): Farnham v Haslemere, the three Farnham matches, 61 v 46 (were 75 v 64); with CLUB_RATED=band this build gives the pin before it exactly, 1ux7bcz 6jcst0 jv4xeq 437myk q2h33q (AI v AI and the demo did not move). Before that: re-pinned at PR #14's club table (src/ratings.js, CLUB_RATED): Haslemere, the three Farnham matches' other side, is 64 (13), was 67 (14); with CLUB_RATED=off this build gives the pin before it exactly, 1ux7bcz 10kl4wv 1nh2ksp jmrs3q q2h33q. Before that: re-pinned at the PR #14 merge for its calmer passing (PASS_FLIGHT: the ball hangs longer and a catcher gets a moment): with PASS_FLIGHT='{"match":1,"kids":1,"grace":[0,0,0],"graceKids":0}' this build gives the old pin exactly, 12rapqh 14qny5b 1dars3e 5k7me2 1amrgpj. Before that: pinned from 2e4829d (GAME=<its index.html> HOME_PRINT=1); this build gives the same
function fingerprint() {
  const out = [];
  reseed(31);
  out.push(json(T.simulate(3, 60, 1).map(r => [r.teams, r.score, r.tries, r.steps])));
  const play = o => {
    T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:1, headless:true, humans:[true, false], duels:'live', ...o });
    let n = 0;
    while (!T.M.over && n < 200000) { bot(0); T.update(T.STEP); n++; }
    return json([T.M.score, T.M.tries, T.M.stats, n]);
  };
  reseed(110); out.push(play({}));
  reseed(111); out.push(play({ arcade:true }));
  reseed(112); out.push(play({ arcade:true, champ:true }));
  reseed(113);
  T.newMatch(X.NATIONS[0], X.NATIONS[1], { halfLen:60, diff:1, demo:true });
  for (let n = 0; n < 60*90; n++) T.update(T.STEP);
  out.push(json([T.M.score, T.M.tries, T.M.ball.x.toFixed(4), T.M.ball.y.toFixed(4)]));
  return out.map(fnv).join(' ');
}
{
  const now = fingerprint();
  if (process.env.HOME_PRINT) { console.log(now); process.exit(0); }
  ok(now === BASE, `AI v AI, a tool's match, an arcade Quick Match, a championship match and the demo play exactly as before the headlines (seeded fingerprint ${now}, pinned ${BASE})`);
}

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const menus = fs.readFileSync(new URL('../src/ui-menus.js', import.meta.url), 'utf8');
const home = html.slice(html.indexOf('<section class="screen" id="s-home">'), html.indexOf('<section class="screen" id="s-teams"'));
const small = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'on', 'to', 'in', 'for', 'as', 'at', 'by']);
const titled = s => s.split(/[\s·]+/).filter(Boolean).every((w, i) => (i && small.has(w)) || !/^[a-z]/.test(w));
const memory = {};
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; } };
const saved = () => JSON.parse(memory['tryline.v1']);
const MORE = ['s-cup', 's-cabinet', 's-career-new', 's-career-club', 's-career', 's-locker', 's-profile'];   // screens the stand-in DOM does not list: showScreen hides and shows them too
{ const qsa = document.querySelectorAll; document.querySelectorAll = sel => (sel === '.screen' ? qsa(sel).concat(MORE.map(id => $(id))) : qsa(sel)); for (const id of MORE) $(id).hidden = true; }
const shown = () => ['s-home', 's-teams', 's-hub', 's-help', 's-join', 's-build', ...MORE].find(id => !$(id).hidden);
for (const id of ['b-set', 'b-continue', 'b-cabinet', 'b-my', 'my-form', 'my-nat', 'b-grown']) {   // the stand-in DOM keeps no attributes: these few remember theirs, for the words read out
  const e = $(id), at = {}; e.setAttribute = (k, v) => { at[k] = String(v); }; e.getAttribute = k => (k in at ? at[k] : null);
}
const fresh = () => {                                       // a new game on the web as shipped, the home on its five boxes
  S.setNative(null); S.setTier(null); S.setBought([]); S.setStarted(false); S.FAN_CLUBS[0].agreed = false; S.FAN_CLUBS[0].crest = null;
  if (!$('m-store').hidden) S.close();
  X.setChamp(null); K.set(null); K.setHistory([]); C.set(null); I.setLeague(null); X.restore({ custom:[] }); H.form.set([]); H.setTier(null);
  const s = D.settings(); s.last = null; s.myClub = null; s.myNat = null; s.cat = 'men'; s.kids = false; s.diff = 1; s.pick = [null, null];
  L.set(L.clean(null)); $('m-import').hidden = true; X.save(); D.goHome();
};

// 1. the markup: the left column (the wordmark, My Team's box, the Trophy Cabinet's strip), the five boxes, the steps, Title Case, no arrow
{
  const side = home.slice(home.indexOf('<div class="home-side"'), home.indexOf('<nav class="home-main"'));
  const boxes = [...home.matchAll(/<button class="btn bx(?: bx-go)?" id="(b-[a-z]+)"(?: autofocus)?><svg viewBox="0 0 24 24" aria-hidden="true">[\s\S]*?<\/svg><span class="bx-text"><span class="bx-name"(?: id="cont-name")?>([^<]+)<\/span>/g)].map(m => [m[1], m[2]]);
  ok(json(boxes.slice(0, 5)) === json([['b-continue', 'Play'], ['b-match', 'Match'], ['b-career', 'Career'], ['b-drills', 'Skill Games'], ['b-set', 'Settings']]), `the five boxes in order, each a drawn picture and a big word: Continue (Play until something is under way) | Match | Career | Skill Games | Settings (${boxes.slice(0, 5).map(b => b[1]).join(' | ')})`);
  ok(/<nav class="home-main" id="home-main" aria-label="Menu">\s*<button class="btn bx bx-go" id="b-continue" autofocus>/.test(home) && /<span class="bx-sub" id="cont-note">Quick Match<\/span>/.test(home) && home.indexOf('id="home-main"') > home.indexOf('id="home-side"'), 'Continue first, the primary, focused before a line of script runs, with its one line (Quick Match for Play); the boxes after My Team\'s column');
  ok(/\.home-main\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\);grid-template-rows:minmax\(0,1\.25fr\) minmax\(0,1fr\) minmax\(0,1fr\);/.test(css) && /\.home-main \.bx-go\{grid-column:1\/-1\}/.test(css) && /\.btn\.bx-go\{border-color:var\(--flood\);background:var\(--flood\);color:var\(--flood-ink\)\}/.test(css), 'Continue across the top in the floodlight\'s yellow, then Match | Career and Skill Games | Settings in equal halves');
  ok(/<button class="btn bx" id="b-career">[\s\S]*?<span class="bx-name">Career<\/span><span class="bx-sub" id="career-note" hidden><\/span>/.test(home), 'Career, with its note while a career is under way and Continue shows something else');
  ok(/<header class="mark" id="home-mark">\s*<h1 class="word" aria-label="Try Line"><span class="try">Try<\/span><span class="line">Line<span class="posts"><\/span><\/span><\/h1>\s*<div class="app-tools" id="app-tools" hidden>\s*<span id="offline-status" role="status" hidden>Offline Ready<\/span>\s*<button class="app-action" id="b-install" hidden>Install Game<\/button>\s*<span id="offline-update" role="status" hidden>Updating<\/span>\s*<\/div>\s*<\/header>/.test(side) && /\.home \.word\{flex:none;flex-direction:row;[^}]*font-size:58px/.test(css), 'the wordmark on one line at the top of My Team\'s column, big, with Offline Ready, Install Game and Updating beside it');
  ok(/<section class="my-box" id="my-box" aria-label="My Team">\s*<div class="my-marks" id="my-marks"><span class="my-fan" id="st-fan" hidden><\/span><\/div>\s*<div class="my-head">\s*<span class="my-shirt" id="my-shirt"><\/span>\s*<div class="my-id">\s*<h2 class="my-name" id="my-name"><\/h2>\s*<div class="my-line"><span id="my-stars"><\/span><span class="my-nat" id="my-nat"><\/span><\/div>\s*<span class="my-league" id="my-league"><\/span>\s*<\/div>\s*<\/div>\s*<dl class="my-rec" id="my-rec"><\/dl>\s*<ol class="my-form" id="my-form" aria-label="Last Five Results"><\/ol>/.test(side), 'My Team\'s box: a row for a tier\'s marks (the Super Fan badge), the shirt, the name, the stars and the country, the league line, the games played and the last five results');
  ok(/<div class="my-acts" id="my-acts">\s*<button class="btn" id="b-my">Change<\/button>\s*<button class="btn im-home" id="b-import" hidden>Add Your Team<\/button>\s*<button class="btn lk-home" id="b-locker">Locker<\/button>\s*<\/div>\s*<\/section>/.test(side) && /\.my-acts\{display:grid;grid-auto-flow:column;grid-auto-columns:minmax\(0,1fr\);/.test(css), 'in the box, three small balanced buttons: Change | Add Your Team | Locker (two halves where Add Your Team is not shown)');
  ok(/<\/section>\s*<button class="btn tc-strip" id="b-cabinet" hidden><span class="tc-name">Trophy Cabinet<\/span><span class="tc-list" id="tc-list"><\/span><\/button>\s*<\/div>/.test(side) && /\.btn\.tc-strip\{flex:none;[^}]*min-height:44px;/.test(css) && /\.my-box\{[^}]*flex:1 1 auto;/.test(css), 'under the box, the Trophy Cabinet as a slim strip of its own at the 44px floor, the box taking the rest of the column');
  ok(/<div class="hs-head" id="hs-head">\s*<button class="btn hs-back" id="hs-back" data-back>Back to Menu<\/button>\s*<h2 class="hs-title" id="hs-title">Match<\/h2>\s*<\/div>/.test(home), 'a step: Back (the controller\'s B too) and its title along the top');
  const steps = [...home.matchAll(/<div class="hs-panel hp-([a-z]+)[^"]*" id="hp-\1" data-step="\1" hidden>/g)].map(m => m[1]);
  ok(json(steps) === json(['match', 'champ', 'drills', 'settings']) && json(steps) === json(Object.keys(H.STEPS)), `four steps, each hidden until opened: ${steps.join(', ')}`);
  ok(/<div class="hs-panel hp-match" id="hp-match" data-step="match" hidden>\s*<button class="btn bx" id="b-quick">[\s\S]*?<span class="bx-name">Quick Match<\/span><\/span><\/button>\s*<button class="btn bx" id="b-comps">[\s\S]*?<span class="bx-name">Competitions<\/span><\/span><\/button>\s*<\/div>/.test(home) && /\.hp-match\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(css), 'Match: two big boxes, Quick Match | Competitions, in halves');
  ok(!/id="b-two"|2 Players|Two Player/.test(home) && !/\$\('b-two'\)/.test(menus) && /^function openJoin\(\) \{/m.test(menus) && typeof D.openJoin === 'function', '2 Players has left the home on every device: no button, no listener; Two Player keeps its way in, openJoin (window.__tryline.debug.openJoin)');
  ok(/<div class="hs-panel hp-champ" id="hp-champ" data-step="champ" hidden>\s*<div class="hl-go" id="hc-go" hidden>\s*<button class="btn primary" id="b-champ">Continue Championship<\/button>\s*<p class="resume-note" id="champ-note" hidden><\/p>\s*<\/div>\s*<div class="hc-new" id="hc-new">\s*<div class="seg" id="hc-tier"><\/div>\s*<div class="hc-comps" id="hc-comps"><\/div>\s*<\/div>\s*<\/div>/.test(home), 'Competitions: Continue Championship (when one is saved) first, else the tiers and their competitions');
  const drills = [...home.matchAll(/<button class="btn drill" id="pr-([a-z]+)">/g)].map(m => m[1]);
  ok(json(drills) === json(T.drills.DRILLS.map(d => d.id)) && /<button class="btn drill" id="pr-defend">[\s\S]*?<\/button>\s*<button class="btn drill" id="b-help"><span class="dc-icon" aria-hidden="true"><svg viewBox="0 0 40 40">[\s\S]*?<\/svg><\/span><span class="dc-name">How to Play<\/span><\/button>\s*<\/div>\s*<div class="pr-low">\s*<div class="pr-contact" id="pr-contact">[\s\S]*?id="pr-back"[\s\S]*?<\/div>\s*<\/div>\s*<button class="btn drill pr-grown" id="pr-grown">/.test(home) && /\.hp-drills \.drills\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/.test(css), `Skill Games: every game in its picture (${drills.join(', ')}), How to Play, then the contact games and For Grown-Ups, in rows of four`);
  const sets = [...home.matchAll(/<div class="set(?: set-[a-z]+)?"(?: id="[a-z-]+")?><span class="lbl">([^<]+)<\/span><div class="seg" data-key="([a-z]+)"/g)].map(m => m[1] + ':' + m[2]);
  ok(json(sets) === json(['Difficulty:diff', 'Sound:sound', 'Match Help:hints', 'Half Length:half', 'Camera:cam']) && /data-key="hints"[^>]*><button>On<\/button><button>Off<\/button><\/div><\/div>\s*<button class="btn" id="b-grown" hidden>Grown-Ups<\/button>\s*<div class="set set-half">/.test(home) && /data-key="cam"><button>Top<\/button><button>Low<\/button><button>Mid<\/button><button>High<\/button><\/div><\/div>\s*<p class="ver" id="ver">Version 1\.2<\/p>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/section>/.test(home)
    && /\.hp-settings\.settings\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/.test(css) && /\.hp-settings \.set\{grid-template-columns:1fr;gap:4px;grid-column:span 3\}/.test(css) && /\.hp-settings \.set-diff\{grid-column:1\/-1\}/.test(css) && /\.hp-settings\.grown \.set-sound,\.hp-settings\.grown \.set-hints,\.hp-settings #b-grown\{grid-column:span 2\}/.test(css),
    `Settings: ${sets.join(', ')}; Difficulty across, Sound | Match Help, Half Length | Camera in halves, and Grown-Ups (where the store is live) a third of Sound's row, after Match Help; the game's version at its foot`);
  const text = s => s.replace(/<[^>]+>/g, '').trim();
  const labels = [...home.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map(m => text(m[1])).filter(Boolean).concat([...home.matchAll(/<span class="(?:lbl|bx-name|tc-name)">([^<]+)<\/span>/g)].map(m => m[1]), [...home.matchAll(/<h2 class="hs-title"[^>]*>([^<]+)<\/h2>/g)].map(m => m[1]), Object.values(H.STEPS).flatMap(st => [st.title, st.back]));
  ok(labels.length >= 40 && labels.every(titled), `every label on the home is Title Case, every step's title and Back too (${labels.filter(l => !titled(l)).join(', ') || labels.length + ' labels'})`);
  ok(!/[←-⇿▲-◅—]|<summary|<details/.test(home + menus.slice(menus.indexOf('/* home.'), menus.indexOf('/* two player'))), 'no arrow glyph, no em dash and no disclosure on the home');
  ok(!/id="t-comp"|id="s-practice"|id="b-more"|id="b-practice"|class="row2 home-row"|class="row2 learn-row"/.test(html), 'the old rows are gone: no competition row on the team screen, no Training Ground screen, no More Settings');
  ok(!/id="hl-bar"|role="tablist"|class="btn hl"|id="home-top"|id="hl-panels"|id="hp-game"|id="hp-career"|id="my-kits"|id="home-tag"/.test(home) && !/HOME_HL|homeSelect|'hl-'/.test(menus) && !/\.hl-bar\{|\.btn\.hl\{|\.home-top\{/.test(css), 'the headlines are gone: no bar along the bottom, no top row, no Quick Match or Career panel, no headline kept');
  const code = menus + fs.readFileSync(new URL('../src/import.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../src/practice.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../src/ui-store.js', import.meta.url), 'utf8');
  ok(!/>Game<|Training Drills|Training Ground|Import Data|Import Club|Back to Training|Skills Mini Games/.test(html) && !/'Import Club'|'Back to Training'|Training Drills|Import Data|Skills Mini Games/.test(code), 'the old names are gone from the markup and the screens\' code: Game, Training Drills, Training Ground, Import Data, Import Club, Back to Training, and Skills Mini Games (now Skill Games)');
  ok($('pr-eyebrow').textContent === 'Skill Games' || /id="pr-eyebrow">Skill Games</.test(html), 'a drill\'s card reads Skill Games over its name');
}

// 2. the steps: one at a time in the home's place, Back to where they came from, an old save's headline dropped, Continue's last
{
  fresh();
  ok(H.step() === null && !$('home-main').hidden && !$('home-side').hidden && $('home-step').hidden && Object.keys(H.STEPS).every(k => $('hp-' + k).hidden), 'a new game opens on the five boxes and My Team\'s column, no step');
  for (const [box, k, title, back] of [['b-match', 'match', 'Match', 'Back to Menu'], ['b-drills', 'drills', 'Skill Games', 'Back to Menu'], ['b-set', 'settings', 'Settings', 'Back to Menu']]) {
    D.goHome(); $(box).click();
    ok(H.step() === k && !$('hp-' + k).hidden && Object.keys(H.STEPS).filter(o => o !== k).every(o => $('hp-' + o).hidden) && $('home-main').hidden && $('home-side').hidden && !$('home-step').hidden && $('hs-title').textContent === title && $('hs-back').textContent === back, `${title}: its step in the home's place, the boxes and My Team's column put away, titled ${title}, ${back}`);
    $('hs-back').click();
    ok(H.step() === null && !$('home-main').hidden && $('home-step').hidden, `${back} comes back to the five boxes`);
  }
  $('b-match').click(); $('b-comps').click();
  ok(H.step() === 'champ' && $('hs-title').textContent === 'Competitions' && $('hs-back').textContent === 'Back to Match', 'Competitions is Match\'s second step, Back to Match');
  $('hs-back').click(); ok(H.step() === 'match', 'Back to Match goes to Match');
  $('hs-back').click(); ok(H.step() === null, 'and Back to Menu home');
  $('b-set').click(); $('s-home').fire('keydown', { key:'Escape' }); ok(H.step() === null, 'Escape on a step is Back');
  $('b-drills').click(); $('pr-grown').click();
  ok($('hs-back').hidden && !$('pr-grownups').hidden && H.step() === 'drills', 'For Grown-Ups: its own Back to Skill Games, the step\'s Back put away (a controller\'s B finds Back to Skill Games)');
  $('s-home').fire('keydown', { key:'Escape' }); ok(H.step() === 'drills', 'and Escape leaves the step alone while it is open');
  $('pr-grown-back').click(); ok(!$('hs-back').hidden && $('pr-grownups').hidden, 'Back to Skill Games shuts it, the step\'s Back again');
  D.goHome(); ok(H.step() === null, 'going home is the five boxes');
  D.goHome($('pr-cones')); ok(H.step() === 'drills', 'going home to a button inside a step (a drill just played) is that step');
  D.goHome($('b-quick')); ok(H.step() === 'match', 'Quick Match\'s is Match');
  D.goHome($('hc-int')); ok(H.step() === 'champ', 'a competition\'s is Competitions');
  D.goHome($('b-grown')); ok(H.step() === 'settings', 'Grown-Ups\' is Settings');
  D.goHome($('b-my')); ok(H.step() === null, 'and My Team\'s Change is the boxes');
  H.show('champ'); ok(H.step() === 'champ' && shown() === 's-home', 'the home on Competitions (New Championship, a cup put away)');
  D.goHome();
  ok(H.first() === $('b-continue') && /DEFAULT_FOCUS\['s-home'\] = homeFirst;/.test(menus), 'the focus and a controller\'s first press: Continue (measured in the browser part)');
  fresh();
  X.restore({ settings:{ hl:'settings', sound:false } });
  ok(!('hl' in D.settings()) && D.settings().sound === false && (D.goHome(), H.step() === null), 'an old save\'s headline (hl) is dropped and the rest kept: the home opens on its five boxes');
  X.save(); ok(!('hl' in saved().settings), 'and the save no longer writes one');
  for (const v of ['champ', 'career']) { X.restore({ settings:{ last:v } }); ok(D.settings().last === v, `Continue's last, ${v}, read back`); }
  X.restore({ settings:{ last:'nope' } }); ok(D.settings().last === 'career', 'an unknown one is ignored');
  X.restore({ settings:{ last:3 } }); ok(D.settings().last === 'career', 'and one of the wrong type');
  fresh();
}

// 3. every button goes where it did
{
  fresh();
  $('b-match').click(); $('b-quick').click();
  ok(shown() === 's-teams' && D.pickMode() === 'quick' && $('t-title').textContent === 'Pick Your Team' && $('t-eyebrow').textContent === 'Quick Match' && !T.picker.state().sides[0].set, 'Match, Quick Match: Pick Your Team, nothing set for you');
  $('t-back').click(); ok(shown() === 's-home' && H.step() === 'match', 'its Back to Menu comes back to Match');
  D.goHome(); $('b-continue').click();
  ok(shown() === 's-teams' && D.pickMode() === 'quick', 'Continue with nothing under way (Play): Quick Match');
  $('t-back').click(); ok(shown() === 's-home' && H.step() === null, 'its Back to Menu comes back to the boxes');
  D.goHome(); D.openJoin(); ok(shown() === 's-join', 'Two Player\'s own entry, openJoin, still opens the join screen'); $('j-back').click();
  $('b-drills').click();
  T.drills.DRILLS.forEach(d => { $('pr-' + d.id).click(); ok(T.drills.state() && T.drills.state().id === d.id, `${d.name} starts its drill`); T.practice.choose(); ok(shown() === 's-home' && H.step() === 'drills', `Back to Skill Games after ${d.name}: the home, on Skill Games`); });
  $('b-help').click(); ok(shown() === 's-help', 'How to Play opens its screen'); $('h-back').click(); ok(shown() === 's-home' && H.step() === 'drills', 'and comes back to Skill Games');
  D.goHome();
  $('b-locker').click(); ok(shown() === 's-locker', 'the Locker, in My Team\'s box, opens'); $('lk-back').click(); ok(shown() === 's-home', 'and comes back');
  $('b-my').click(); ok(shown() === 's-profile', 'Change opens My Profile (src/profile.js, tools/profile.mjs)'); $('pf-team').click(); ok(shown() === 's-teams' && D.pickMode() === 'my', 'and My Team\'s picker one press on'); $('t-back').click(); ok(shown() === 's-profile', 'its Back comes back there'); $('pf-back').click(); ok(shown() === 's-home' && H.step() === null, 'and Back to Menu to the boxes');
  $('b-career').click(); ok(shown() === 's-career-new', 'Career with none under way: New Player'); D.goHome();
  $('b-set').click();
  const seg = k => [...document.querySelectorAll('.seg[data-key]')].find(g => g.dataset.key === k);
  ok(['diff', 'sound', 'hints', 'half'].every(seg), 'Settings carries Difficulty, Sound, Match Help and Half Length');
  seg('half').children[1].click(); ok(D.settings().half === 1 && saved().settings.half === 1, 'Half Length is pressed straight from Settings');   // the stand-in segs have two buttons each
  seg('half').children[0].click(); seg('sound').children[1].click(); ok(D.settings().sound === false, 'Sound');
  seg('sound').children[0].click(); seg('hints').children[1].click(); ok(D.settings().hints === false && D.settings().coach === false, 'Match Help, the hints and the coach together');
  seg('hints').children[0].click(); seg('diff').children[0].click(); ok(D.settings().kids === true && D.settings().diff === 0, 'Difficulty: Kids');
  seg('diff').children[1].click(); { const g = T.kids.gate(); ok(g && D.settings().kids === true, 'Easy from Kids asks a grown-up first (PR #14: only a grown-up leaves the Kids level)'); if (g) for (const d of g.answer) T.kids.type(d); }
  ok(D.settings().kids === false && D.settings().diff === 0, 'Easy');
  ok(H.step() === 'settings', 'Settings stays open as each is pressed');
  D.settings().diff = 1;
  ok($('b-grown').hidden && !$('hp-settings').classList.contains('grown'), 'no Grown-Ups on the web as shipped');
  S.setNative(true); S.setStarted(true); D.goHome(); $('b-set').click();
  ok(!$('b-grown').hidden && $('hp-settings').classList.contains('grown'), 'in the app Grown-Ups shares Sound and Match Help\'s row');
  $('b-grown').click(); ok(!$('m-store').hidden && S.ui().mode === 'grown', 'and opens the Grown-Ups panel, as it did'); S.close();
  const s = D.settings(); s.kids = true; s.diff = 0; s.kidsR = 1; s.kidsTop = 9; D.goHome();
  ok(T.kids.ready() && $('b-grown').classList.contains('note') && $('b-set').classList.contains('note') && $('b-set').getAttribute('aria-label') === 'Settings, a suggestion waiting', 'Move Up to Easy waiting: its dot on Grown-Ups and on the Settings box, read out');
  s.kids = false; s.diff = 1; s.kidsR = 0; s.kidsTop = 0; D.goHome();
  ok(!$('b-set').classList.contains('note'), 'and gone with it');
  fresh();
}

// 4. the gates: every paid entry keeps its Full Game gate and lock; Quick Match, Skill Games, Settings, the Locker and My Team stay free
{
  fresh(); S.setTier('free'); D.goHome();
  ok(['b-comps', 'b-career'].every(id => $(id).classList.contains('locked')) && ['b-continue', 'b-match', 'b-drills', 'b-set', 'b-quick', 'b-my', 'b-locker', 'b-help'].every(id => !$(id).classList.contains('locked')) && !/id="b-two"/.test(html), 'free: Competitions and Career locked; Play, Match, Quick Match, Skill Games, Settings, My Team\'s Change and the Locker not (and no 2 Players to lock)');
  ok($('b-import').classList.contains('locked'), 'Add Your Team locked: it is the Super Fan\'s');
  ok(/if \(seg && seg\.children\[3\]\) storeMark\(seg\.children\[3\], 'hard'\);/.test(fs.readFileSync(new URL('../src/ui-store.js', import.meta.url), 'utf8')) && /if \(key === 'diff' && i === 3 && !storeGate\('hard'/.test(menus), 'Hard keeps its lock and its gate in Settings');
  $('b-match').click(); $('b-comps').click(); ok(H.step() === 'champ' && $('m-store').hidden, 'Competitions opens its step, each competition locked in it');
  H.champPick('eng'); ok(!$('m-store').hidden && S.ui().feature === 'champ' && shown() === 's-home', 'a competition opens the Unlock card, not the team screen'); S.close();
  $('b-career').click(); ok(!$('m-store').hidden && S.ui().feature === 'career', 'Career opens the Unlock card'); S.close();
  $('b-import').click(); ok(!$('m-store').hidden && S.ui().feature === 'import' && $('m-import').hidden && $('st-title').textContent === 'Add Your Team', 'Add Your Team opens the Unlock card, named Add Your Team'); S.close();
  $('b-quick').click(); ok($('m-store').hidden && shown() === 's-teams', 'Quick Match is free'); D.goHome();
  $('b-continue').click(); ok($('m-store').hidden && shown() === 's-teams', 'Play is free'); D.goHome();
  $('b-my').click(); $('pf-team').click(); ok($('m-store').hidden && shown() === 's-teams' && D.pickMode() === 'my', 'My Team is free (My Profile, then its picker)'); D.goHome();
  $('b-locker').click(); ok($('m-store').hidden && shown() === 's-locker', 'the Locker is free'); D.goHome();
  $('pr-cones').click(); ok($('m-store').hidden && T.drills.state(), 'a drill is free'); T.practice.choose();
  X.newChamp(X.NATIONS[0], X.NATIONS.slice(1, 6)); D.goHome();
  ok($('b-continue').classList.contains('locked') && $('cont-name').textContent === 'Continue' && /^Championship · Round 1 v /.test($('cont-note').textContent), 'a championship under way on the free tier: Continue locked, its line kept');
  $('b-continue').click(); ok(!$('m-store').hidden && S.ui().feature === 'champ' && X.champ(), 'and it opens the Unlock card, the championship kept'); S.close();
  X.setChamp(null); C.start({ name:'Sam', pos:'B', num:7, club:X.CLUBS[0] }); D.goHome();
  ok($('b-continue').classList.contains('locked') && /^Career · /.test($('cont-note').textContent), 'a career likewise'); $('b-continue').click(); ok(!$('m-store').hidden && S.ui().feature === 'career', 'its Unlock card'); S.close();
  C.set(null); S.setTier(null); D.goHome();
  ok(['b-comps', 'b-career', 'b-import', 'b-continue'].every(id => !$(id).classList.contains('locked')), 'the web as shipped (STORE_WEB_TIER full): no lock anywhere');
  fresh();
}

// 5. Competitions: Continue first, the tiers and their competitions, each with only its sides, and the Trophy Cabinet
{
  fresh(); H.setTier(0); H.open('champ');
  const comps = t => H.comps(t).map(c => c[0]).join();
  ok(comps(0) === 'int,world,tour' && H.comps(0).map(c => c[1]).join() === 'Championship,World Cup,Home Nations Tour', 'International: Championship, World Cup, Home Nations Tour');
  ok(comps(1) === 'eng,en2,fra,cel,sco,rsa,aus,nzl,jpn' && H.comps(1).map(c => c[1]).join() === X.TEAM_LISTS.filter(l => l.tier === 1).map(l => l.name).join(), 'National: each country\'s league');
  ok(comps(2) === 'sur,cty' && H.comps(2).map(c => c[1]).join() === 'Surrey,Counties', 'Local: Surrey and Counties (PR #14\'s), and no My League without an import');
  ok(['eng', 'fra', 'cel', 'rsa'].every(K.euroLeague) && !['en2', 'sco', 'aus', 'nzl', 'jpn', 'sur', 'cty', 'my', 'int'].some(K.euroLeague), 'the European Cup\'s trophy on the four leagues whose winner goes on to it');
  H.setTier(1); H.champ();
  ok(/id="hc-eng" data-comp="eng"><span class="cup-trophy" data-kind="euro" data-metal="gold" role="img" aria-label="European Cup"><\/span><span>England<\/span>/.test($('hc-comps').innerHTML) && /id="hc-sco" data-comp="sco"><span>Scotland<\/span>/.test($('hc-comps').innerHTML) && /id="hc-en2" data-comp="en2"><span>England 2<\/span>/.test($('hc-comps').innerHTML) && $('hc-comps').className === 'hc-comps n9' && /\.hc-comps\.n9\{grid-template-columns:repeat\(20,minmax\(0,1fr\)\)\}\s*\.hc-comps\.n9 > \.btn\{grid-column:span 5\}\s*\.hc-comps\.n9 > \.btn:nth-child\(n\+5\)\{grid-column:span 4\}/.test(css), 'each a big button, the European Cup\'s trophy on its four, National\'s nine in two rows (four then five, each row in equal parts)');
  ok(/id="hc-cel" data-comp="cel"><span class="cup-trophy" data-kind="euro" data-metal="gold" role="img" aria-label="European Cup"><\/span><span>United Rugby Championship<\/span>/.test($('hc-comps').innerHTML) && /class="btn hc-comp long" id="hc-cel"/.test($('hc-comps').innerHTML) && ($('hc-comps').innerHTML.match(/ long"/g) || []).length === 1, 'the United Rugby Championship by its name, with the European Cup\'s trophy, the one long name (its lock goes in the corner)');
  ok(!$('hc-new').hidden && $('hc-go').hidden && $('b-cabinet').hidden, 'nothing saved: the competitions, and no Trophy Cabinet before a season is finished');
  H.setTier(null); D.goHome(); H.open('champ');
  ok(H.tier() === 2, 'the tier on show starts on My Team\'s (Farnham: Local)');
  // each competition's team screen: only its sides, and Back comes back to it
  const P = T.picker, comp = () => P.view(0).ladder[0], cards = () => comp().teams.length, panel = () => $('t-side0').innerHTML;
  for (const l of X.TEAM_LISTS.filter(l => l.tier > 0)) {
    H.setTier(l.tier); H.open('champ'); H.champPick(l.key);
    ok(shown() === 's-teams' && D.pickMode() === 'champ' && K.comp() === 'league' && X.teamPool() === l.key && P.one() && P.view(0).ladder.map(g => g.key).join() === 'comp,mine.made' && cards() === l.teams.length && l.teams.every(t => comp().teams.includes(t)) && $('t-eyebrow').textContent === 'Championship' && comp().name === l.name && P.where(comp()) === X.TEAM_TIERS[l.tier], `${l.name}: its ${l.teams.length} sides only, one side, ${X.TEAM_TIERS[l.tier]} over ${l.name}`);
    $('t-back').click(); ok(shown() === 's-home' && H.step() === 'champ', `${l.name}: Back to Menu comes back to Competitions`);
  }
  H.setTier(null); D.goHome();
  H.champPick('int');
  ok(X.teamPool() === 'int' && cards() === 12 && X.natList('men').every(t => comp().teams.includes(t)) && $('t-eyebrow').textContent === 'Championship' && comp().name === 'International' && P.view(0).team.id === 'ENG' && $('t-go').textContent === 'Play as England', 'International Championship: the twelve, England (My Team\'s country) on show, Play as England');
  $('t-go').click();
  ok(X.champ() && X.champ().teams[X.champ().user].id === 'ENG' && X.champ().teams.every(t => X.SIX_NATIONS.includes(t.id)) && shown() === 's-hub', 'and Play as England starts the Six Nations');
  X.setChamp(null); D.goHome();
  H.champPick('int'); D.pickTeam(X.natList('men')[0]);
  ok(X.champ().teams[X.champ().user].id === 'RSA' && !X.champ().teams.some(t => X.SIX_NATIONS.includes(t.id)), 'or change it there: South Africa plays the other six');
  X.setChamp(null); D.goHome();
  H.champPick('world');
  ok(K.comp() === 'world' && $('t-title').textContent === 'Pick Your Nation' && $('t-eyebrow').textContent === 'World Cup' && cards() === 12 && $('t-go').textContent === 'Play as England' && !$('t-go').hidden && !comp().teams.some(t => t.act), 'World Cup: the twelve, England on show');
  $('t-go').click();
  ok(K.get() && K.get().id === 'world' && K.get().teams[K.get().user].id === 'ENG' && shown() === 's-cup', 'Play as England starts England\'s World Cup');
  K.set(null); D.goHome();
  H.champPick('tour');
  ok(K.comp() === 'tour' && $('t-title').textContent === 'Pick the Host' && cards() === 3 && /Tour /.test($('t-go').textContent) && !/My Team/.test(panel()), 'Home Nations Tour: the three hosts, the one in turn on the primary, nothing marked My Team');
  D.goHome();
  // a saved championship or cup: Continue Championship first
  X.newChamp(X.NATIONS[0], X.NATIONS.slice(1, 6)); D.goHome(); H.open('champ');
  ok(!$('hc-go').hidden && $('hc-new').hidden && $('b-champ').textContent === 'Continue Championship' && !$('champ-note').hidden, 'a championship under way: Competitions shows Continue Championship, with its note, and the competitions wait');
  $('b-champ').click(); ok(shown() === 's-hub', 'which goes to its hub');
  H.champPick('eng'); ok(shown() === 's-hub' && X.champ().teams[0].id === 'ENG', 'and a competition pressed now goes there too, the championship kept');
  $('hub-reset').click(); $('hub-reset').click();
  ok(X.champ() === null && shown() === 's-home', 'Start Fresh: home');
  H.open('champ'); ok(!$('hc-new').hidden && $('b-cabinet').hidden, 'the competitions are back; no Trophy Cabinet until a season is finished');
  { X.newChamp(X.NATIONS[0], X.NATIONS.slice(1, 6)); const c = X.champ(), u = c.user; for (let i = 0; i < 5; i++) { c.results.push(c.fixtures[i].map(p => ({ h:p[0], a:p[1], hs:p[0] === u ? 30 : p[1] === u ? 0 : 10, as:p[1] === u ? 30 : p[0] === u ? 0 : 10, ht:3, at:1 }))); c.round++; } X.save(); X.setChamp(null); X.save(); }
  D.goHome(); ok(K.history().length === 1 && !$('b-cabinet').hidden, 'a season won: the Trophy Cabinet\'s strip under My Team\'s box');
  ok(/data-kind="league" data-metal="silver"/.test($('tc-list').innerHTML) && /<\/span>1<span class="tc-w">&nbsp;Title<\/span>/.test($('tc-list').innerHTML) && /data-kind="triple" data-metal="silver"/.test($('tc-list').innerHTML) && $('b-cabinet').getAttribute('aria-label') === 'Trophy Cabinet: 1 Title, 1 Triple Crown', `each trophy in its shape and metal, and its count: England's Six Nations won, 1 Title and 1 Triple Crown (${$('b-cabinet').getAttribute('aria-label')})`);
  $('b-cabinet').click(); ok(shown() === 's-cabinet' && /England/.test($('home-history').innerHTML), 'the strip opens the Trophy Cabinet on its own screen');
  $('cab-back').click(); ok(shown() === 's-home' && H.step() === null, 'and Back to Menu comes home');
  K.set(K.cupNew('world', { user:X.natList('men')[4], cat:'men' })); D.goHome(); H.open('champ');
  ok(!$('hc-go').hidden && $('hc-new').hidden && /data-kind="world"[\s\S]*World Cup · <\/span>Pool [ABCD]$/.test($('champ-note').innerHTML) && $('b-champ').textContent === 'Continue Championship', 'a cup under way: Continue Championship, its note the cup');
  $('b-champ').click(); ok(shown() === 's-cup', 'which goes to the cup');
  K.set(null);
  // My League: Local, with an import
  I.setLeague({ teams:X.CLUBS.slice(1, 6).map(t => ({ ...t, key:'lg-' + t.id })) }); D.goHome(); H.setTier(2); H.open('champ');
  ok(comps(2) === 'sur,cty,my' && /id="hc-my" data-comp="my"><span>My League<\/span>/.test($('hc-comps').innerHTML), 'with an import, My League beside Surrey and Counties');
  H.champPick('my'); ok(X.teamPool() === 'my' && $('t-eyebrow').textContent === 'Championship' && comp().name === 'My League' && P.where(comp()) === 'Local', 'My League\'s team screen, Local over My League');
  // the European Cup is still reached by winning a European league
  fresh(); H.champPick('eng'); D.pickTeam(X.ENGLAND[0]);
  const c = X.champ(), order = [c.user, 1, 2, 3, 4, 5].filter((v, i, a) => a.indexOf(v) === i), rk = i => order.indexOf(i);
  c.results = c.fixtures.map(rd => rd.map(([h, a]) => (rk(h) < rk(a) ? { h, a, hs:20, as:0, ht:4, at:0 } : { h, a, hs:0, as:20, ht:0, at:4 }))); c.round = 5; D.renderHub();
  ok(/id="hub-euro"/.test($('hub-next').innerHTML), 'a European league won from the home\'s England: Play European Cup');
  $('hub-later').click(); $('hub-new').click();
  ok(X.champ() === null && shown() === 's-home' && H.step() === 'champ' && !$('hc-new').hidden, 'New Championship: back to the home\'s Competitions, where the competitions are');
  fresh();
}

// 5b. Continue: whatever is under way, the one played last where there are two, in one line; Play with nothing under way
{
  fresh();
  ok(H.under() === null && $('cont-name').textContent === 'Play' && $('cont-note').textContent === 'Quick Match' && $('b-continue').getAttribute('aria-label') === 'Play, Quick Match', 'nothing under way: Play, Quick Match');
  // Play: My Team set on the left, the Opponent its league's rival, set, the side ready to change; Kick Off one press away
  const P = T.picker;
  $('b-continue').click();
  ok(shown() === 's-teams' && D.pickMode() === 'quick' && P.state().sides[0].set && P.view(0).team === X.CLUBS[0] && P.state().on === 1 && P.view(1).team.id === 'WIM' && P.state().sides[1].set && $('t-go').textContent === 'Kick Off' && $('t-title').textContent === 'Pick Opponent', `Play: Farnham (My Team) set on the left, Wimbledon (its league's rival) on the right, that side active, Kick Off (${$('t-go').textContent}, ${P.view(1).team.name})`);
  P.step(1, 1); ok(!P.state().sides[1].set && /^Pick /.test($('t-go').textContent) && P.view(1).team.id !== 'WIM', 'the Opponent changes with a move, freed to pick again');
  const demo = T.M; $('t-back').click();
  D.settings().myClub = 'BTH'; D.settings().pick = [{ id:'FAR', cat:'men', g:'sur' }, { id:'GLO', cat:'men', g:'eng' }]; D.goHome(); $('b-continue').click();
  ok(P.view(0).team.id === 'BTH' && P.state().sides[0].set && P.view(1).team.id === 'GLO' && P.state().sides[1].set && $('t-go').textContent === 'Kick Off', 'Play: My Team\'s club (Bath), never the last Your Team, and the last Opponent (Gloucester) kept');
  D.settings().pick = [null, { id:'BTH', cat:'men', g:'eng' }]; D.goHome(); $('b-continue').click();
  ok(P.view(0).team.id === 'BTH' && P.view(1).team.id !== 'BTH' && P.state().sides[1].set, 'a last Opponent that is My Team\'s club itself: its league\'s rival instead');
  ok(T.M === demo && T.M.demo, 'nothing started until Kick Off');
  $('t-go').click(); ok(shown() !== 's-teams' && !T.M.demo && T.M.nat[0].id === 'BTH', 'Kick Off plays it'); D.exitMatch();
  fresh();
  // a championship, a cup, a career
  X.newChamp(X.CLUBS[0], X.CLUBS.slice(1, 6)); D.goHome();
  const opp = X.champ().teams[(p => (p[0] === X.champ().user ? p[1] : p[0]))(X.champ().fixtures[0].find(p => p.includes(X.champ().user)))];
  ok(H.under() === 'champ' && $('cont-name').textContent === 'Continue' && $('cont-note').textContent === 'Championship · Round 1 v ' + opp.name, `a championship: Continue, Championship · Round 1 v ${opp.name} (${$('cont-note').textContent})`);
  ok($('cont-note').innerHTML === `<span class="nw">Championship ·</span> <span class="nw">Round 1</span> <span class="nw">v ${opp.name}</span>`, `in its parts, each kept whole, so where Continue needs two lines it breaks between them and never inside one: the opponent is never what is cut off (${$('cont-note').innerHTML})`);
  ok(H.chunks('Quick Match') === '<span class="nw">Quick Match</span>' && H.chunks('Career · Transfer Window') === '<span class="nw">Career ·</span> <span class="nw">Transfer Window</span>' && H.chunks('World Cup · Pool A v <b>') === '<span class="nw">World Cup ·</span> <span class="nw">Pool A</span> <span class="nw">v &lt;b&gt;</span>' && H.chunks('v France') === '<span class="nw">v France</span>', 'the parts: a line without a fixture is one or two, a name escaped');
  $('b-continue').click(); ok(shown() === 's-hub', 'Continue opens its hub');
  { const c = X.champ(); for (let i = 0; i < 5; i++) { c.results.push(c.fixtures[i].map(p => ({ h:p[0], a:p[1], hs:20, as:10, ht:3, at:1 }))); c.round++; } }
  D.goHome(); ok($('cont-note').textContent === 'Championship · Final Table', 'finished and not put away: Championship · Final Table');
  X.setChamp(null);
  K.set(K.cupNew('euro', { user:X.ENGLAND[0], cat:'men' })); D.goHome();
  const fx = K.cupFixture(K.get());
  ok(H.under() === 'champ' && $('cont-note').textContent === 'European Cup · Semi-Final v ' + K.get().teams[fx.opp].name, `a cup: European Cup · Semi-Final v ${K.get().teams[fx.opp].name} (${$('cont-note').textContent})`);
  $('b-continue').click(); ok(shown() === 's-cup', 'Continue opens the cup');
  K.set(K.cupNew('tour', { user:K.cupTourSide('men'), n:0, host:'NZL' })); D.goHome();
  ok(/^Home Nations Tour · Test 1 v /.test($('cont-note').textContent) && !/ of \d/.test($('cont-note').textContent), `a tour: Home Nations Tour · Test 1 v its host, no "of 3" (${$('cont-note').textContent})`);
  K.set(null);
  C.start({ name:'Sam', pos:'B', num:7, club:X.CLUBS[0] }); D.goHome();
  const f = C.ahead(C.get()), copp = f.teams[f.home === f.user ? f.away : f.home];
  ok(H.under() === 'career' && $('cont-note').textContent === 'Career · Round 1 v ' + copp.name && $('career-note').hidden, `a career: Career · Round 1 v ${copp.name}, and the Career box keeps no note of its own (${$('cont-note').textContent})`);
  $('b-continue').click(); ok(shown() === 's-career', 'Continue opens the career\'s hub');
  $('b-career').click(); ok(shown() === 's-career', 'and so does the Career box');
  // both: the one played last
  X.newChamp(X.CLUBS[0], X.CLUBS.slice(1, 6)); D.settings().last = null; D.goHome();
  ok(H.under() === 'champ' && !$('career-note').hidden && $('career-note').textContent === 'Round 1 v ' + copp.name && $('career-note').innerHTML === `<span class="nw">Round 1</span> <span class="nw">v ${copp.name}</span>`, `a championship and a career, neither played: the championship first, the career's fixture in its box, no year or club (My Team's box names it), in its parts (${$('career-note').textContent})`);
  { const cr = C.get(), was = cr.phase; cr.phase = 'transfer'; D.goHome(); ok($('career-note').textContent === 'Transfer Window' && H.careerFix(cr) === 'Transfer Window', 'between seasons: Transfer Window'); cr.phase = was; D.goHome(); }
  C.play(); ok(D.settings().last === 'career' && saved().settings.last === 'career', 'a career match started: the career is the one played last, saved'); D.exitMatch(); D.goHome();
  ok(H.under() === 'career' && /^Career · /.test($('cont-note').textContent) && $('career-note').hidden, 'Continue picks it up');
  $('hub-play') && (D.renderHub(), $('hub-play').click()); ok(D.settings().last === 'champ' && T.M.champ, 'a championship match started: the championship'); D.exitMatch(); D.goHome();
  ok(H.under() === 'champ' && /^Championship · /.test($('cont-note').textContent) && !$('career-note').hidden, 'Continue picks that up, the career\'s note back in its box');
  ok(/if \(!pair && \(M\.champ \|\| M\.cup\) && settings\.last !== 'champ'\)/.test(fs.readFileSync(new URL('../src/ui-match.js', import.meta.url), 'utf8')) && /if \(settings\.last !== 'career'\) \{ settings\.last = 'career'; save\(\); \}/.test(fs.readFileSync(new URL('../src/career.js', import.meta.url), 'utf8')), 'a cup match counts as the championship\'s, a career\'s own cup match as the career\'s (careerArm, after startMatch)');
  fresh();
}

// 6. My Team: the setting, its defaults, old saves, and how each mode uses it
{
  fresh();
  ok(H.myClub() === X.CLUBS[0] && H.myNat(null).id === 'ENG' && D.settings().myClub === null && D.settings().myNat === null, 'a new game: Farnham and England');
  ok($('my-name').textContent === 'Farnham' && /--kit:#1a1a1a/.test($('my-shirt').innerHTML) && /England/.test($('my-nat').innerHTML) && /--kit:/.test($('my-nat').innerHTML) && $('b-my').getAttribute('aria-label') === 'Change My Profile: Farnham, England', 'the home\'s My Team: the club\'s shirt and name, the country\'s, Change read out with both, for where it goes (My Profile)');
  $('b-my').click(); $('pf-team').click();   // My Profile, then My Team's picker on it (src/profile.js)
  const P6 = T.picker, v6 = () => P6.view(0), to6 = (n, key) => { P6.group(n, P6.view(n).ladder.findIndex(g => g.key === key) - P6.view(n).gi); return P6.view(n); }, mineTag = n => /<span class="gap mine">My Team<\/span>/.test($('t-side' + n).innerHTML);
  ok(shown() === 's-teams' && D.pickMode() === 'my' && $('t-eyebrow').textContent === 'My Team' && $('t-title').textContent === 'Pick Your Club' && P6.one() && v6().group.key === 'sur' && v6().ladder.some(g => g.key === 'nat.eng') && v6().ladder.some(g => g.key === 'fra') && $('t-go').textContent === 'Done', 'My Team: Pick Your Club on its group, the whole ladder to look anywhere, Done while the club is it');
  ok(v6().team.id === 'FAR' && mineTag(0) && v6().ladder.find(g => g.key === 'mine.made').teams.some(t => t.act === 'create') && v6().ladder.find(g => g.key === 'mine.league').teams.some(t => t.act === 'import'), 'Farnham marked My Team, Create Team and Add Your Team in Mine');
  to6(0, 'eng'); P6.go();
  ok(D.settings().myClub === 'BTH' && saved().settings.myClub === 'BTH' && shown() === 's-teams' && $('t-title').textContent === 'Pick Your Country' && v6().team.id === 'ENG', 'a club picked: Bath, saved, the screen stays and moves on to the country');
  ok(v6().ladder.filter(g => g.key.startsWith('nat.')).length === 12 && !v6().ladder.some(g => g.teams.some(t => t.legend)), 'the countries: the category\'s twelve, no Legend');
  to6(0, 'nat.wal'); P6.go();
  ok(D.settings().myNat === 'WAL' && D.settings().myClub === 'BTH' && mineTag(0) && $('t-go').textContent === 'Done', 'a nation picked: the country, marked, the club kept');
  P6.go(); ok(shown() === 's-profile', 'Done: back to My Profile, where it was opened'); $('pf-back').click(); ok(shown() === 's-home' && H.step() === null, 'and Back to Menu: home');
  X.catPick('women'); H.myPick(X.natList('women').find(t => t.id === 'CDN')); X.catPick('men');
  ok(D.settings().myNat === 'CDN' && H.myNat('men') === null && H.myNat('women').id === 'CDN' && H.myNat(null).id === 'CDN', 'Canada, from the women\'s twelve: no side on the men\'s list, Canada still on the home');
  H.myPick(X.natList('men').find(t => t.id === 'WAL'));
  D.goHome(); ok($('my-name').textContent === 'Bath' && /Wales/.test($('my-nat').innerHTML), 'home: Bath and Wales');
  X.load(); ok(D.settings().myClub === 'BTH' && D.settings().myNat === 'WAL', 'saved and loaded');
  X.restore({ settings:{ myClub:'<b>', myNat:'XYZ' } }); ok(D.settings().myClub === 'BTH' && D.settings().myNat === 'WAL', 'a broken value in a save is ignored');
  X.restore({ settings:{ myClub:'GONE', myNat:'ENG' } }); ok(D.settings().myClub === null && H.myClub() === X.CLUBS[0] && D.settings().myNat === 'ENG', 'a club no longer there is the default again');
  X.restore({ settings:{ sound:true } }); ok(H.myClub() === X.CLUBS[0] && H.myNat(null).id === 'ENG', 'an old save (none of it): Farnham and England');
  S.setNative(true); S.setStarted(true); S.FAN_CLUBS.push({ key:'guildford', name:'Guildford RFC', product:'tryline.fan.guildford', share:50, agreed:true, team:'GUI' }); S.setBought(['tryline.fan.guildford']);
  ok(H.myClub().id === 'GUI' && H.myPool() === 'sur', 'an old save with a Super Fan: the Super Fan\'s club');
  D.settings().myClub = 'TLS'; ok(H.myClub().id === 'TLS' && H.myPool() === 'fra', 'until another is picked');
  S.FAN_CLUBS.length = 1; S.setBought([]); S.setNative(null); S.setStarted(false); D.settings().myClub = null;
  // a team you made, and an imported league's side
  T.stamina.openBuilder(null); $('bd-name').value = 'Red Lions'; T.stamina.draft().name = 'Red Lions'; $('bd-save').click();
  const mine = X.custom().find(t => t.name === 'Red Lions');
  H.myPick(mine); ok(D.settings().myClub === mine.key && H.myClub() === mine && H.myPool() === null, 'a team you made can be My Team');
  D.goHome(); ok($('my-name').textContent === 'Red Lions', 'and it is the box\'s');
  X.restore({ custom:[] }); X.restore({ settings:{} }); ok(D.settings().myClub === null && H.myClub() === X.CLUBS[0], 'deleted: the default again');
  I.setLeague({ teams:X.CLUBS.slice(1, 6).map(t => ({ ...t, key:'lg-' + t.id + 'X', id:t.id })) });
  H.myPick(I.league().teams[0]); ok(D.settings().myClub === I.league().teams[0].key && H.myPool() === 'my', 'a side of My League can be My Team');
  I.setLeague(null); ok(H.myClub() === X.CLUBS[0], 'its league removed: the default');
  fresh();
  // Quick Match (from Match): offered first in Player 1's list, marked, never picked or started
  D.settings().myClub = 'BTH'; D.settings().myNat = 'WAL';
  const demo = T.M;
  $('b-quick').click();
  ok(T.M === demo && T.M.demo && $('t-title').textContent === 'Pick Your Team' && !P6.state().sides[0].set && $('t-go').textContent === 'Pick Bath' && v6().group.key === 'eng', 'Quick Match: Pick Your Team on My Team\'s group, nothing set, Pick (never Play as), nothing started');
  ok(v6().group.teams[0].id === 'BTH' && v6().team.id === 'BTH' && mineTag(0) && !mineTag(1) && !P6.state().sides[0].set, 'Bath first, marked My Team, not picked');
  to6(0, 'nat.wal');
  ok(v6().team.id === 'WAL' && mineTag(0) && !P6.state().sides[0].set, 'International: Wales, its National group, marked My Team');
  to6(0, 'sur');
  ok(v6().group.teams.map(t => t.id).join() === X.CLUBS.map(t => t.id).join() && !mineTag(0), 'a group without it: as it was, unmarked');
  D.pickTeam(X.CLUBS[2]);
  ok($('t-title').textContent === 'Pick Opponent' && P6.state().sides[0].set && v6().team.id === 'GUI' && T.M === demo, 'another side picked: his; now the opponent');
  to6(1, 'eng');
  ok(P6.view(1).group.teams.map(t => t.id).join() === X.ENGLAND.map(t => t.id).join() && !mineTag(1), 'the opponents\' groups: in their own order, nothing marked');
  {
    const list = () => T.yourTeam.teamList(), ids = () => list().map(t => t.id), sur = X.CLUBS.map(t => t.id);
    D.settings().pick = [null, null]; D.openTeams('quick'); to6(0, 'sur'); D.pickTeam(X.CLUBS[0]);
    const opp = P6.view(1).team;
    ok($('t-title').textContent === 'Pick Opponent' && ids()[0] === 'WIM' && !ids().includes('FAR') && opp.id === 'WIM' && opp.league === X.CLUBS[0].league && X.overallOf(X.CLUBS[0]) - X.overallOf(opp) <= 3, `Farnham picked: the Opponent opens on Wimbledon, his own league's, and never shows Farnham (${ids().slice(0, 3).join(' ')}, ${X.overallOf(X.CLUBS[0])} v ${X.overallOf(opp)})`);
    ok(ids().length === sur.length - 1 && [...ids()].sort().join() === sur.filter(id => id !== 'FAR').sort().join() && ids().filter(id => id !== 'WIM').join() === sur.filter(id => id !== 'WIM' && id !== 'FAR').join(), 'only the order changes: the same sides bar his own, the rest in the list\'s own order');
    to6(1, 'cty'); const c = ids();
    ok(c.join() === X.COUNTIES.map(t => t.id).join(), `a group without a rival of his: in its own order (${c.slice(0, 3).join(' ')})`);
    D.settings().pick = [null, null]; D.openTeams('quick'); to6(0, 'sur'); D.pickTeam(X.CLUBS.find(t => t.id === 'GDN'));
    ok(ids().join() === sur.filter(id => id !== 'GDN').join(), 'a side with no rival in its group leaves the group as it is (Guildfordians on Surrey)');
  }
  // 2 Players (off the home; its own entry, openJoin): Player 1's list only
  D.settings().pick = [null, null]; D.openJoin(); D.openTeams('two');
  ok(v6().group.teams[0].id === 'BTH' && v6().team.id === 'BTH' && mineTag(0) && D.twoSel().picking === 0 && !P6.state().sides[1].set, '2 Players: Bath first in Player 1\'s group, marked');
  D.pickTeam(X.CLUBS[0]);
  ok(D.twoSel().picking === 1 && !mineTag(1), 'Player 2\'s: nothing marked');
  D.setTwo(false); D.goHome();
  // Championship: picked for you, and changed there
  H.champPick('eng');
  ok($('t-go').textContent === 'Play as Bath' && !$('t-go').hidden && mineTag(0), 'Championship · England: Play as Bath, the card marked');
  D.pickTeam(X.ENGLAND[1]);
  ok(X.champ() && X.champ().teams[X.champ().user].id === X.ENGLAND[1].id, 'or another club starts it instead');
  X.setChamp(null); D.goHome();
  H.champPick('fra'); ok($('t-go').textContent === 'Play as Toulouse' && v6().i === 0 && !mineTag(0), 'a league without My Team\'s club: its first side on show, nothing marked');
  D.goHome(); D.settings().cat = 'women'; H.champPick('int');
  ok($('t-go').textContent === 'Play as Wales Women', 'International on Women: Play as Wales Women');
  D.settings().cat = 'men'; D.goHome();
  // a new Career: his club picked for you, Change Club to change it
  C.set(null); $('b-career').click();
  ok(shown() === 's-career-new' && C.draft().club.id === 'BTH' && C.draft().league === 'eng' && /Bath/.test($('cn-mine').innerHTML), 'Career: New Player, Bath, of England\'s league');
  C.clubPick(X.CLUBS[3]); ok(C.draft().club === X.CLUBS[3], 'Change Club picks another');
  fresh();
}

// 6b. My Team's box: the club's stars and its league line (PR #14's Your Team info), only where the club has real figures
{
  fresh();
  const R5 = T.ratings, box = () => [$('my-name').textContent, $('my-stars').innerHTML, $('my-league').innerHTML.replace(/<[^>]+>/g, '')];
  const at = id => { D.settings().myClub = id; D.goHome(); return box(); };
  let r = box();
  ok(r[0] === 'Farnham' && r[1] === R5.starsHtml(3.5) && r[2] === 'Regional 1 South Central · 7th Last Season' && $('my-league').innerHTML === '<span>Regional 1 South Central</span><span class="sep"> · </span><span>7th Last Season</span>', `a new game: Farnham, 3.5 stars, 7th in Regional 1 South Central, the league over its place (${r.join(' | ')})`);
  ok(R5.starsHtml(3.5).includes('aria-label="3.5 Stars"') && R5.starsOf(X.CLUBS[0]) === 3.5, 'the stars carry their words for a screen reader');
  r = at('NTH');
  ok(r[2] === 'English Premiership · 1st Last Season' && r[0] === 'Northampton' && H.recordLine(H.myClub()) === 'Won 14 · Drew 1 · Lost 3 · 693 Scored · 536 Conceded', `Northampton: its line, and last season's record kept for the team screen and the tools (${H.recordLine(H.myClub())})`);
  ok(at('LWE')[2] === 'English Premiership · 9th Last Season' && at('COB')[2] === 'Counties 1 Surrey/Sussex · 1st Last Season' && at('MTB')[2] === 'Top 14 · 14th Last Season' && at('BED')[2] === 'English Championship · 2nd Last Season' && at('JHB')[2] === 'United Rugby Championship · 7th Last Season' && at('MBO')[2] === 'Currie Cup · 3rd Last Season', 'the ordinals read right, and every list with figures has them (England 2 and the Currie Cup too)');
  for (const id of ['QUI', 'MEL', 'WLG', 'KOB', 'AYR']) { r = at(id); ok(r[1].includes('rstars') && !r[2], `${id}: its stars, and no league line, never an invented one`); }
  D.settings().myClub = null;
  T.stamina.openBuilder(null); $('bd-name').value = 'Red Lions'; T.stamina.draft().name = 'Red Lions'; $('bd-save').click();
  const mine = X.custom().find(t => t.name === 'Red Lions'); H.myPick(mine); D.goHome();
  ok(!$('my-league').innerHTML && $('my-name').textContent === 'Red Lions', 'a team you made: none');
  X.restore({ custom:[] }); D.settings().myClub = null;
  I.setLeague(I.clean({ teams:[{ ...X.CLUBS[1], key:'lg-QQQ', id:'QQQ', name:'Quarry', league:'Fake', place:1, w:9, d:0, l:0, pf:1, pa:0 }] })); H.myPick(I.league().teams[0]); D.goHome();
  ok(D.settings().myClub === 'lg-QQQ' && !$('my-league').innerHTML && !('league' in I.league().teams[0]), 'a My League side: none, even one handed figures (a league is kept through cleanImportLeague, which keeps no line)');
  I.setLeague(null); fresh();
  ok(!/\b(he|his|him|she|her)\b/i.test(box().join(' ').replace(/<[^>]+>/g, ' ')) && titled('Regional 1 South Central · 7th Last Season'), 'no he or she, and its words in Title Case');
  ok(/\.my-league:empty\{display:none\}/.test(css) && /\.my-league > span\{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\}/.test(css) && /\.my-box\[data-fit\] \.my-league > span:last-child\{display:none\}/.test(css), 'its style: the league over its place, each on its line, the place dropped first where the box is tight; nothing where there are no figures');
  ok((home.slice(home.indexOf('id="my-box"'), home.indexOf('id="my-acts"')).match(/<button/g) || []).length === 0, 'the box\'s figures are not buttons: Change, Add Your Team and the Locker are its three');
}

// 6c. the games played as My Team: a new saved record, counts and the last five, for the club and the country
{
  fresh();
  const F = H.form, figs = () => $('my-rec').innerHTML.match(/<dd>(\d+)<\/dd>/g).map(s => +s.replace(/\D/g, ''));
  const chips = () => [...$('my-form').innerHTML.matchAll(/<li class="fm ([a-z]+)"/g)].map(m => m[1]).join(' ');
  ok(json(F.get()) === '[]' && json(figs()) === json([0, 0, 0, 0]) && chips() === 'none none none none none' && $('my-form').getAttribute('aria-label') === 'No Results Yet', 'a new game: Played 0, Won 0, Drawn 0, Lost 0, five empty places');
  ok(/<div><dt>Played<\/dt><dd>0<\/dd><\/div><div><dt>Won<\/dt><dd>0<\/dd><\/div><div><dt>Drawn<\/dt><dd>0<\/dd><\/div><div><dt>Lost<\/dt><dd>0<\/dd><\/div>/.test($('my-rec').innerHTML), 'Played · Won · Drawn · Lost, each figure over its word');
  const play = (a, b, us, them, o, isChamp) => { D.startMatch(a, b, !!isChamp, o); const M = T.M; M.half = 2; M.score = [us, them]; M.tries = [Math.floor(us/5), Math.floor(them/5)]; M.phase = 'break'; M.over = true; L.finishMatch(); const r = M.formDone; D.exitMatch(); return r; };
  play(X.CLUBS[0], X.CLUBS[1], 20, 5); D.goHome();
  ok(json(figs()) === json([1, 1, 0, 0]) && chips() === 'w none none none none' && /<li class="fm w"><span aria-hidden="true">W<\/span><span class="sr">Won<\/span><\/li>/.test($('my-form').innerHTML) && $('my-form').getAttribute('aria-label') === 'Last Result', 'a Quick Match won as Farnham: Played 1, Won 1, a W (the letter seen, Won read out)');
  ok(json(saved().form) === json([{ k:'c:FAR', w:1, d:0, l:0, last:'W' }]), 'saved: its key, the counts and the last results');
  play(X.CLUBS[0], X.CLUBS[3], 10, 10, undefined, true); play(X.CLUBS[0], X.CLUBS[2], 0, 15, { cup:'euro', cupKO:true }); D.goHome();
  ok(json(figs()) === json([3, 1, 1, 1]) && chips() === 'w d l none none', 'a Championship match drawn and a cup match lost: they count, in order, the latest last');
  C.start({ name:'Sam', pos:'B', num:7, club:X.CLUBS[0] }); C.play(); { const M = T.M; M.half = 2; M.score = [M.nat[0].id === 'FAR' ? 25 : 0, 3]; M.phase = 'break'; M.over = true; L.finishMatch(); } D.exitMatch(); C.set(null); D.goHome();
  ok(json(figs()) === json([4, 2, 1, 1]) && chips() === 'w d l w none', 'a career match at Farnham counts too');
  for (const [us, them] of [[5, 0], [0, 5], [7, 7]]) play(X.CLUBS[0], X.CLUBS[1], us, them);
  D.goHome();
  ok(json(figs()) === json([7, 3, 2, 2]) && chips() === 'l w w l d' && F.get()[0].last === 'LWWLD', 'the last five only, the latest on the right: L W W L D');
  // never counted: another side, AI v AI, the demo, a drill, a tool's match, Two Player
  const before = json(F.get());
  ok(play(X.CLUBS[1], X.CLUBS[0], 30, 0) === undefined && json(F.get()) === before, 'a match as another club (Haslemere v Farnham) counts nothing');
  T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:1, auto:true }); T.M.score = [9, 0]; T.M.over = true; ok(F.match() === null && json(F.get()) === before, 'AI v AI: nothing');
  T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:1, demo:true }); T.M.over = true; ok(F.match() === null && json(F.get()) === before, 'the demo: nothing');
  T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:1, headless:true, humans:[true, false] }); T.M.over = true; ok(F.match() === null && json(F.get()) === before, 'a tool\'s match (no arcade): nothing');
  ok(play(X.CLUBS[0], X.CLUBS[1], 20, 0, { two:true, levels:[1, 1] }) === undefined && json(F.get()) === before, 'Two Player: nothing (the record is one player\'s against the game)');
  T.practice.start('cones'); ok(F.match() === null && json(F.get()) === before, 'a drill: nothing'); T.practice.choose();
  { const p = fs.readFileSync(new URL('../src/persistence.js', import.meta.url), 'utf8'), code = p.slice(p.indexOf('const FORM_KEEP'), p.indexOf('function restore('));
    ok(code.length > 500 && !/rnd\(|Math\.random|shuffle\(/.test(code), 'the record draws nothing random (and section 0\'s fingerprint pins every match kind)'); }
  // the country: the same, for My Team's nation
  play(X.NATIONS[0], X.NATIONS[1], 22, 12, undefined, true); D.goHome();
  const eng = F.of(X.NATIONS.find(n => n.id === 'ENG'));
  ok(X.NATIONS[0].id === 'ENG' && eng.k === 'n:ENG' && eng.w === 1 && eng.last === 'W' && /<span class="sr">My Country: England, Played 1, Won 1, Drawn 0, Lost 0<\/span>/.test($('my-nat').innerHTML), `as England, My Team's country: its own record, read out with the country (${$('my-nat').innerHTML.replace(/<[^>]+>/g, ' ')})`);
  ok(json(figs()) === json([7, 3, 2, 2]), 'the club\'s untouched');
  D.settings().cat = 'women'; play(X.catTeam(X.CLUBS[0], 'women'), X.catTeam(X.CLUBS[1], 'women'), 10, 0); D.settings().cat = 'men'; D.goHome();
  ok(json(figs()) === json([8, 4, 2, 2]), 'Farnham Women is Farnham\'s');
  // a change of My Team: its own record; back again, the old one
  D.settings().myClub = 'BTH'; D.goHome(); ok(json(figs()) === json([0, 0, 0, 0]), 'My Team changed to Bath: Bath\'s record, at nought');
  play(X.ENGLAND[0], X.ENGLAND[1], 3, 0); D.settings().myClub = null; D.goHome();
  ok(json(figs()) === json([8, 4, 2, 2]) && F.get().map(r => r.k).join() === 'c:BTH,c:FAR,n:ENG', `back to Farnham: Farnham's again, every side kept, the one played as last first (${F.get().map(r => r.k).join()})`);
  // the save: read back, cleaned, old saves at nought
  { const was = json(F.get()); X.save(); F.set([]); X.load(); D.goHome(); ok(json(F.get()) === was && json(figs()) === json([8, 4, 2, 2]), 'saved and loaded'); }
  { const was = json(F.get()), keep = memory['tryline.v1'];
    X.restore({ settings:{} }); ok(json(F.get()) === was, 'a save or a snapshot without the record leaves it as it is, as every other field (a viewer\'s hot reload never wipes it)');
    F.set([]); memory['tryline.v1'] = JSON.stringify({ settings:{ played:3 }, champHistory:[] }); X.load(); D.goHome();   // a new page (the record at nought) loading a save from before it
    ok(json(F.get()) === '[]' && json(figs()) === json([0, 0, 0, 0]), 'an old save (no record), loaded: every side at nought');
    memory['tryline.v1'] = keep; X.load(); ok(json(F.get()) === was, 'and the record comes back with the save that has it');
    const boot = fs.readFileSync(new URL('../src/boot.js', import.meta.url), 'utf8');
    ok(/hot\?\.snapshot\?\.\(\(\) => \(\{.*\bform:formRec \}\)\)/.test(boot) && /'form' in data\)\) restore\(data\)/.test(boot), 'the viewer\'s hot snapshot carries the record, and a start from one restores it'); }
  ok(json(F.clean([{ k:'c:FAR', w:2, d:0, l:1, last:'WLW' }, { k:'c:FAR', w:9 }, { k:'x:FAR', w:1 }, { k:'c:<b>', w:1 }, null, 7, [], { k:'n:ENG', w:-1, d:1.5, l:'3', last:'DDDDDD' }, { k:'c:BTH', w:1, d:0, l:0, last:'LL' }])) === json([{ k:'c:FAR', w:2, d:0, l:1, last:'WLW' }, { k:'n:ENG', w:0, d:0, l:0, last:'' }, { k:'c:BTH', w:1, d:0, l:0, last:'' }]), 'cleaned as it loads: a key once, known kinds and safe characters, whole counts at nought or more, the last five only W, D and L and never more of one than its count');
  ok(json(F.clean('nope')) === '[]' && json(F.clean({ k:'c:FAR' })) === '[]', 'anything else: none');
  ok(F.clean(Array.from({ length:30 }, (_, i) => ({ k:'c:T' + i, w:1, d:0, l:0, last:'W' }))).length === F.KEEP && F.KEEP === 12, 'twelve sides at most');
  ok(F.clean([{ k:'c:FAR', w:F.MAX + 1, d:0, l:0 }])[0].w === 0 && F.MAX === 99999, 'a count past its cap is not trusted');
  { const was = json(F.get()); F.set([{ k:'c:FAR', w:F.MAX, d:0, l:0, last:'W' }]); play(X.CLUBS[0], X.CLUBS[1], 5, 0); ok(F.get()[0].w === F.MAX, 'and a count never runs past it'); F.set(JSON.parse(was)); }
  fresh();
}

// 7. Add Your Team: today's import, then Make This My Team | Not Now
{
  fresh();
  ok(!$('b-import').hidden && /id="b-import" hidden>Add Your Team</.test(html), 'on the web as shipped: Add Your Team shows in My Team\'s box (its card says it works in the app)');
  $('b-import').click();
  ok(!$('m-import').hidden && I.state().step === 'web' && I.state().from === 'home' && $('im-back').textContent === 'Back to Menu' && $('im-title').textContent === 'Works in the Try Line App' && /aria-labelledby="im-eyebrow im-title">\s*<div class="im-head">\s*<div><p class="eyebrow" id="im-eyebrow">Add Your Team<\/p><h3 id="im-title">/.test(html), 'it opens the Add Your Team card over the home (Works in the Try Line App, the card named by both), Back to Menu');
  $('im-back').click(); ok($('m-import').hidden && shown() === 's-home', 'and closes back home');
  const offer = () => {                                      // a club and its league in, as the app's import hands them over
    I.open(); const u = I.state(); u.step = 'preview';
    u.data = { club:{ name:'Godalming RFC', kit:'#1b2747', trim:'#f2b01e' }, league:[{ name:'Godalming RFC', own:true }, { name:'Cranleigh RFC' }, { name:'Haslemere RFC' }, { name:'Chobham RFC' }, { name:'Weybridge Vandals' }] };
    u.draft = { kit:'#1b2747', trim:'#f2b01e' }; I.go();
  };
  offer();
  const club = X.custom().find(t => /^Godalming/.test(t.name));
  ok(club && I.state().step === 'mine' && !$('m-import').hidden && $('im-title').textContent === club.name && !$('im-mine').hidden && $('im-row').hidden && $('im-go').hidden && /--kit:#1b2747/.test($('im-jersey').innerHTML), 'a club saved: Make This My Team | Not Now, in its shirt');
  ok(/<div class="row2" id="im-mine" hidden><button class="btn" id="im-make">Make This My Team<\/button><button class="btn" id="im-not" data-back>Not Now<\/button><\/div>/.test(html) && I.focusEl(true) === $('im-make'), 'balanced halves, Not Now the card\'s Back, the ring on Make This My Team');
  $('im-not').click();
  ok($('m-import').hidden && D.settings().myClub === null && shown() === 's-home' && $('my-name').textContent === 'Farnham', 'Not Now: My Team as it was, home');
  offer(); $('im-make').click();
  ok($('m-import').hidden && D.settings().myClub === club.key && H.myClub() === club && $('my-name').textContent === club.name && saved().settings.myClub === club.key, 'Make This My Team: it is, saved, in the box');
  offer();
  ok($('m-import').hidden && I.state().step !== 'mine', 'importing My Team\'s club again asks nothing');
  ok(I.league() && I.league().teams.length === 4 && I.league().teams.every(t => /^lg-/.test(t.key)) && H.comps(2).map(c => c[0]).join() === 'sur,cty,my', 'the league comes in as ever: My League, beside Surrey and Counties');
  fresh();
}

// 8. Legends: unlocked by Gold medals on every tier, played with the Full Game
{
  fresh();
  L.set(L.clean({ n:{ hat:10, sharp:10 } }));
  ok(L.legends('men').length === 2 && S.has('legends'), 'two Golds: two Legends of each list unlocked; the web as shipped plays them');
  // re-pinned for the side-by-side team screen (2026-11-11): a Legend sits after its nation, in the nation's National group
  const P8 = T.picker, leg = L.legends('men')[0], toLeg = () => { D.settings().pick = [null, null]; D.openTeams('quick'); P8.group(0, P8.view(0).ladder.findIndex(g => g.teams.includes(leg)) - P8.view(0).gi); while (P8.view(0).team !== leg) P8.step(0, 1); };
  toLeg();
  ok(/data-legend="1"/.test($('t-side0').innerHTML) && P8.view(0).group.key === 'nat.nzl' && !$('t-go').classList.contains('locked'), 'they join their nation (New Zealand 1987 after New Zealand), with no lock on the web as shipped');
  S.setTier('free');
  ok(!S.has('legends') && L.legends('men').length === 2, 'free: still unlocked, not playable');
  D.renderTeams();
  P8.go();
  ok(!$('m-store').hidden && S.ui().feature === 'legends' && $('st-title').textContent === 'Legends', 'picking one opens the Unlock card for Legends');
  ok(shown() === 's-teams' && $('t-title').textContent === 'Pick Your Team' && !P8.state().sides[0].set, 'and nothing is picked');
  S.close();
  ok(/function storeTeamsRender\(\)[\s\S]*?for \(const b of scr\.querySelectorAll\('\[data-legend\]'\)\) storeMark\(b, 'legends'\);[\s\S]*?t\.legend \? 'legends'/.test(fs.readFileSync(new URL('../src/ui-store.js', import.meta.url), 'utf8')) && $('t-go').classList.contains('locked'), 'its card carries the lock (storeMark), and so does the primary while it shows (Pick New Zealand 1987)');
  ok(/for \(const el of body\.querySelectorAll\('\[data-legend\]'\)\) storeMark\(el, 'legends'\);/.test(fs.readFileSync(new URL('../src/ui-locker.js', import.meta.url), 'utf8')) && /data-legend="1" role="group"/.test(fs.readFileSync(new URL('../src/ui-locker.js', import.meta.url), 'utf8')), 'and so does its tile in the Locker\'s Legends');
  S.setTier(null); S.setNative(true); S.setStarted(true);
  ok(!S.has('legends'), 'the app with nothing bought: locked');
  S.setBought(['tryline.full']);
  ok(S.has('legends'), 'with the Full Game: played');
  toLeg(); D.pickTeam(leg);
  ok($('m-store').hidden && $('t-title').textContent === 'Pick Opponent' && P8.state().sides[0].set && P8.view(0).team === leg, 'picked: played as');
  ok(json(S.offers('legends').map(o => o.id)) === json([]) && S.offers(null).every(o => o.id !== 'tryline.legends'), 'nothing extra to buy: the Full Game is the one unlock');
  S.setBought([]);
  ok(S.offers('legends').map(o => o.id).join() === 'tryline.full', 'the Unlock card offers the Full Game, nothing else');
  fresh();
}

// 9. the World Cup's Pools: a plain button, no disclosure triangle
{
  fresh();
  const c = K.cupNew('world', { user:X.natList('men')[4], cat:'men' });
  while (c.round < 3 && K.cupFixture(c)) K.cupRecord(c, { score:[30, 0], tries:[5, 0] });
  K.set(c); K.render();
  ok(/<button class="btn cup-poolbtn" id="cup-pools" aria-pressed="false">Pools<\/button>/.test($('cup-draw').innerHTML) && /cup-bracket/.test($('cup-draw').innerHTML) && !/<details|<summary/.test($('cup-draw').innerHTML), `the knockouts: the bracket and a Pools button (round ${c.round})`);
  ok(/summary\{list-style:none\}/.test(css) && /summary::-webkit-details-marker\{display:none\}/.test(css), 'and no triangle on any summary left in the game');
  K.set(null); fresh();
}

// 9b. A Super Fan of My Team's club: My Team's box in the club's colours, the Super Fan badge, its trophy's rosette, a crest only where the
//     club has agreed; a Super Fan of another club, or none, the plain box
{
  fresh();
  ok(!$('s-home').classList.contains('fan') && $('st-fan').hidden && H.fanMine() === null, 'the web: no Super Fan, the plain box');
  S.setNative(true); S.setStarted(true); S.setBought(['tryline.fan.farnham']); D.goHome();
  ok(H.fanMine() === S.FAN_CLUBS[0] && $('s-home').classList.contains('fan') && !$('st-fan').hidden && /<span>Super Fan<\/span>/.test($('st-fan').innerHTML) && /<svg class="fan-shield"[^>]*>[\s\S]*fill="#1a1a1a" stroke="#f2efe6"/.test($('st-fan').innerHTML), 'a Super Fan of Farnham, My Team\'s club: the box in its colours, the Super Fan badge with a plain shield in its kit');
  ok(/data-kind="fan" data-metal="gold" role="img" aria-label="Super Fan Trophy"/.test($('st-fan').innerHTML) && L.fanHeld && L.fanHeld().includes('farnham'), 'and the Super Fan trophy\'s rosette, the trophy held');
  ok(!$('b-cabinet').hidden && /data-kind="fan"/.test($('tc-list').innerHTML) && /Super Fan Trophy, Farnham RUFC/.test($('b-cabinet').getAttribute('aria-label')), 'the rosette in the Trophy Cabinet\'s strip too');
  const v = k => $('s-home').style.getPropertyValue('--fan-' + k);
  ok(['kit', 'trim', 'acc', 'ink', 'edge', 'ground', 'gink'].every(k => /^#[0-9a-f]{6}$/.test(v(k))) && v('ground') === '#1a1a1a' && v('gink') === '#f1eee4' && v('edge') === '#f2efe6', `its colours: Farnham's black as the ground, chalk on it, the white trim as the edge (${['ground', 'gink', 'edge'].map(v).join(' ')})`);
  ok(/#s-home\.fan \.my-box\{background:var\(--fan-ground\);border-color:var\(--fan-edge\);[^}]*color:var\(--fan-gink\)\}/.test(css) && !/#s-home\.fan \.btn\.bx-go|#s-home\.fan \.hs-panel \.btn\.primary/.test(css), 'the box\'s ground and edge in them; Continue stays the floodlight\'s yellow, the home\'s one primary (the design review, 2026-11-11)');
  { const th = S.theme({ kit:'#777777', trim:'#777777' }), cr = (a, b) => S.contrast(a, b);
    ok(Math.max(cr('#777777', '#f1eee4'), cr('#777777', '#0b130e')) < 4.5 && cr(th.ground, th.gink) >= 4.5 && th.ground !== '#777777', `a mid grey neither chalk nor ink reads on at 4.5:1 is darkened until chalk does (${th.ground} ${cr(th.ground, th.gink).toFixed(2)}:1)`);
    const kits = ['#1a1a1a', '#f2efe6', '#c8102e', '#ffcf3d', '#1b2747', '#5aa0d8', '#888888', '#2f8f4a'];
    ok(kits.every(k => cr(S.theme({ kit:k, trim:'#000000' }).ground, S.theme({ kit:k, trim:'#000000' }).gink) >= 4.5), `every word on the ground at 4.5:1 or better, whatever the kit (${kits.map(k => cr(S.theme({ kit:k }).ground, S.theme({ kit:k }).gink).toFixed(1)).join(' ')})`); }
  D.settings().myClub = 'BTH'; D.goHome();
  ok(!$('s-home').classList.contains('fan') && $('st-fan').hidden && !$('b-cabinet').hidden, 'a Super Fan of Farnham whose My Team is Bath: the plain box (the trophy still in the strip and the Locker)');
  D.settings().myClub = null; D.goHome(); ok($('s-home').classList.contains('fan'), 'Farnham again: the colours back');
  S.FAN_CLUBS[0].crest = 'crests/farnham.svg'; D.goHome();
  ok(/<svg class="fan-shield"/.test($('st-fan').innerHTML) && !/<img/.test($('st-fan').innerHTML), 'a crest the club has not agreed to (agreed false): the plain shield still');
  S.FAN_CLUBS[0].agreed = true; D.goHome();
  ok(/<img class="fan-shield fan-crest" src="crests\/farnham\.svg" alt="" draggable="false">/.test($('st-fan').innerHTML), 'agreed and supplied: its crest in the shield\'s place');
  S.FAN_CLUBS[0].agreed = false; S.FAN_CLUBS[0].crest = null;
  ok(/#my-marks|id="my-marks"/.test(html) && /\.my-marks:not\(:has\(> :not\(\[hidden\]\)\)\)\{display:none\}/.test(css) && /function storeFanMine\(\)/.test(fs.readFileSync(new URL('../src/ui-store.js', import.meta.url), 'utf8')), 'a tier\'s marks have their own row over the name, empty and away without one: another tier adds its own there with no change of layout');
  fresh();
}

await browserChecks();
console.log(`Home: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;

function chromium() {
  const require = createRequire(import.meta.url);
  for (const from of [() => require('playwright'), () => require(path.join(execFileSync('npm', ['root', '-g'], { stdio:['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright'))]) {
    try { return from().chromium; } catch (e) { /* not here */ }
  }
  return null;
}
// 10. In Chromium (where Playwright is installed): the home fits every phone size (844x390, 667x375, Safari's 844x340, 667x320 and
//     568x320) with no page scroll in every state, on the five boxes and on every step; a Super Fan's box in the club's colours at 4.5:1;
//     the keyboard and a controller reach every box and every button, Continue first, Down and Up between the rows; every target 44px.
async function browserChecks() {
  if (process.env.GAME || process.env.NO_BROWSER) { console.log('skip the browser checks (GAME or NO_BROWSER set)'); return; }
  const chrome = chromium();
  if (!chrome) { console.log('skip the browser checks: Playwright is not installed (npm i -g playwright && npx playwright install chromium)'); return; }
  let browser;
  try { browser = await chrome.launch(); } catch (e) { console.log('skip the browser checks: Chromium would not start (' + e.message.split('\n')[0] + ')'); return; }
  const dir = fileURLToPath(new URL('../', import.meta.url));
  const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.png':'image/png', '.webmanifest':'application/manifest+json' };
  const CREST = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 28"><path d="M12 1l11 4v8c0 7-5 12-11 14C6 25 1 20 1 13V5z" fill="#c8102e"/><path d="M6 9h12v3H6z" fill="#fff"/></svg>';   // a stand-in crest, served by this test only
  const server = http.createServer((req, res) => {
    if (new URL(req.url, 'http://x').pathname === '/crests/test.svg') { res.writeHead(200, { 'content-type':'image/svg+xml' }); res.end(CREST); return; }
    const file = path.resolve(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type':TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const SAVE = { settings:{ tut:['past', 'pass', 'tackle', 'block', 'scrum', 'lineout', 'goal', 'drop'], coach:false, played:5 }, form:[{ k:'c:FAR', w:9, d:1, l:4, last:'WWLWD' }] };
  const VIEWS = [[null, null], ['match', null], ['champ', 0], ['champ', 1], ['champ', 2], ['drills', null], ['settings', null]];   // the five boxes, then each step (Competitions on each tier)
  // Settings row by row, at every size: the web's halves and the thirds where Grown-Ups shows (the free web, the app), desk or not. Down from
  // every control lands on the row under it, the last row's on nothing (the step's foot), never two rows down; Left and Right never two rows away
  const settingsRows = () => {
    const T = window.__tryline, S = T.store, st = T.debug.settings(), $ = id => document.getElementById(id), panel = $('hp-settings'), out = { rows:[], moves:0, bad:[] };
    const box = el => el.getBoundingClientRect(), vis = el => !!el && !el.hidden && !el.closest('[hidden]') && box(el).width > 0;
    const name = el => !el ? 'nothing' : el.id || (el.closest('.seg') ? el.closest('.seg').dataset.key + ':' : '') + el.textContent.trim();
    for (const desk of [false, true]) for (const store of ['web', 'free', 'app']) {
      const app = store === 'app', at = store + (desk ? ' desk' : '');
      S.setNative(app); S.setStarted(app); S.setBought([]); S.setTier(store === 'free' ? 'free' : null);
      st.kids = app; st.diff = app ? 0 : 1; document.body.classList.toggle('desk', desk); T.debug.goHome(); T.home.open('settings'); T.home.ring(null);
      const btns = [...panel.querySelectorAll('button')].filter(vis), foot = el => box(el.closest('.set') || el).bottom;   // a control's row: its setting's foot (Grown-Ups stands on its row's)
      const feet = btns.map(foot).sort((a, b) => a - b).filter((f, i, a) => !i || f - a[i - 1] > 8);
      const row = el => !el ? feet.length : panel.contains(el) ? feet.findIndex(f => Math.abs(foot(el) - f) <= 8) : -2;
      out.rows.push(feet.length);
      for (const b of btns) {
        const r = row(b);
        T.home.ring(b); const down = T.navMove(0, 0, 1); out.moves++;
        if (row(down) !== r + 1) out.bad.push(`${at}: Down from ${name(b)} to ${name(down)}`);
        for (const dx of [-1, 1]) { T.home.ring(b); const to = T.navMove(0, dx, 0); out.moves++; if (to && panel.contains(to) && Math.abs(row(to) - r) > 1) out.bad.push(`${at}: ${dx < 0 ? 'Left' : 'Right'} from ${name(b)} to ${name(to)}`); }
      }
    }
    S.setNative(false); S.setStarted(false); S.setTier(null); st.kids = false; st.diff = 1; document.body.classList.remove('desk'); T.home.ring(null); T.debug.goHome();
    return out;
  };
  const rowsOk = (kind, r) => ok(r.rows.length === 6 && r.rows.every(n => n === 3) && !r.bad.length, `${kind}: Settings in three rows (the web, the free web, the app, desk or not), Down from every control on the row under it (the last row's on nothing), Left and Right never two rows away (${r.bad.slice(0, 4).join(', ') || r.moves + ' moves'}; rows ${r.rows.join(' ')})`);
  try {
    for (const [w, h] of [[844, 390], [667, 375], [844, 340], [667, 320], [568, 320]]) for (const touch of [true, false]) {
      const ctx = await browser.newContext({ viewport:{ width:w, height:h }, deviceScaleFactor:1, isMobile:touch, hasTouch:touch, serviceWorkers:'block' });
      const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(s => { try { localStorage.setItem('tryline.v1', JSON.stringify(s)); } catch (e) { /* blocked */ } }, SAVE);
      await page.goto(base + 'index.html', { waitUntil:'load' }); await page.evaluate(() => document.fonts.ready);
      const kind = `${w}x${h} ${touch ? 'touch' : 'desk'}`;
      // every state: desk or not, the app (Grown-Ups) or the web (Add Your Team), Install, Offline Ready and Updating showing or not, a Trophy
      // Cabinet or not, nothing under way, a championship, a cup or a career, the free tier's locks or not, and in the app a Super Fan of
      // My Team's club (its plain shield or a club's crest, the box in its colours, its trophy in the strip); on the five boxes and every step
      await page.evaluate(() => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = 'crests/test.svg'; }));   // the stand-in crest, loaded once
      const states = await page.evaluate(VIEWS => {
        const T = window.__tryline, X = T.teams, K = T.cups, out = [], $ = id => document.getElementById(id);
        const box = el => el.getBoundingClientRect(), vis = el => !!el && !el.hidden && !el.closest('[hidden]') && box(el).width > 0;
        const cabinet = () => { X.newChamp(X.NATIONS[0], X.NATIONS.slice(1)); const c = X.champ(); for (let i = 0; i < 5; i++) { c.results.push(c.fixtures[i].map(p => ({ h:p[0], a:p[1], hs:20, as:10, ht:3, at:1 }))); c.round++; } X.setChamp(c); X.save(); X.load(); X.setChamp(null); };
        const rgb = h => 'rgb(' + [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ') + ')';
        const lum = c => { const v = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(n => +n/255).map(x => (x <= 0.03928 ? x/12.92 : ((x + 0.055)/1.055) ** 2.4)); return 0.2126*v[0] + 0.7152*v[1] + 0.0722*v[2]; };
        const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05)/(Math.min(x, y) + 0.05); };
        const TOOLS = ['app-tools', 'b-install', 'offline-update', 'offline-status'];
        for (const desk of [false, true]) for (const app of [false, true]) for (const tools of [false, true]) for (const cab of [false, true]) for (const busy of ['none', 'champ', 'cup', 'career', 'both']) for (const buy of ['full', 'free', 'fan', 'crest']) {
          if (app && tools) continue;                         // the app has no Install or Update
          if (!app && (buy === 'fan' || buy === 'crest')) continue;   // nor the web a Super Fan
          const free = buy === 'free', fan = buy === 'fan' || buy === 'crest';
          T.locker.set(T.locker.fresh()); T.store.FAN_CLUBS[0].crest = buy === 'crest' ? 'crests/test.svg' : null; T.store.FAN_CLUBS[0].agreed = buy === 'crest';
          T.store.setNative(app); T.store.setStarted(app); T.store.setBought(!app || free ? [] : fan ? ['tryline.fan.farnham'] : ['tryline.full']); T.store.setTier(!app && free ? 'free' : null);
          K.setHistory([]); if (cab) cabinet();
          X.setChamp(null); K.set(null); T.career.set(null);
          if (busy === 'champ' || busy === 'both') X.newChamp(X.CLUBS[7] || X.CLUBS[0], X.CLUBS.slice(1, 6));
          if (busy === 'career' || busy === 'both') T.career.start({ name:'Sam', pos:'B', num:7, club:X.CLUBS[0] });
          T.debug.settings().last = null;   // with both, the championship first
          if (busy === 'cup') K.set(K.cupNew('euro', { user:X.SOUTH_AFRICA[0], cat:'women' }));
          const st = T.debug.settings(); st.kids = app; st.diff = app ? 0 : 1; st.kidsR = app ? 1 : 0; st.kidsTop = app ? 9 : 0;   // the app with Move Up to Easy waiting: the dots
          document.body.classList.toggle('desk', desk);
          for (const [step, tier] of VIEWS) {
            T.home.setTier(tier); T.debug.goHome(); if (step) T.home.open(step);
            if (tools) { for (const id of TOOLS) $(id).hidden = false; T.home.fit(); }
            const toolsAt = $('app-tools').parentNode.id;   // beside the wordmark, or at a step's top right
            const s = $('s-home'), my = $('my-box'), cont = $('b-continue'), cs = e => getComputedStyle(e);
            const btns = [...s.querySelectorAll('button')].filter(vis);
            const small = btns.filter(b => box(b).height < 43.5 || box(b).width < 43.5).map(b => b.id || b.textContent.trim());
            const clipped = [...s.querySelectorAll('.bx-name, .my-name, .tc-name, .hs-title, .hc-comp span, .dc-name, .my-league > span, .my-nat b, .bx-sub .nw')].filter(vis).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent)
              .concat([$('cont-note'), $('career-note')].filter(vis).filter(e => e.scrollHeight > e.clientHeight + 1).map(e => e.id + ' past two lines'))
              .concat([...s.querySelectorAll('.locked')].filter(vis).filter(e => { const c = cs(e, '::after'); return c.position !== 'absolute' && parseFloat(c.width) < 0.7*parseFloat(c.fontSize) - 0.5; }).map(e => e.id + "'s lock squeezed"));
            const panel = step && $('hp-' + step), pr = panel && box(panel), clip = !!panel && cs(panel).overflowY !== 'visible';
            const seen = b => { const q = box(b); return clip && panel.contains(b) ? { left:Math.max(q.left, pr.left), right:Math.min(q.right, pr.right), top:Math.max(q.top, pr.top), bottom:Math.min(q.bottom, pr.bottom) } : q; };
            const overlap = btns.some((a, i) => btns.some((b, j) => j > i && !a.contains(b) && !b.contains(a) && (() => { const p = seen(a), q = seen(b); return p.bottom > p.top && q.bottom > q.top && p.left < q.right - 1 && p.right > q.left + 1 && p.top < q.bottom - 1 && p.bottom > q.top + 1; })()));
            const off = btns.filter(b => { const q = box(b); return (!clip || !panel.contains(b)) && (q.top < -0.5 || q.bottom > innerHeight + 0.5 || q.left < -0.5 || q.right > innerWidth + 0.5); }).map(b => b.id || b.textContent.trim());
            const inner = step ? 0 : Math.max(0, my.scrollHeight - my.clientHeight);   // My Team's box holds everything it shows (homeFit)
            let themed = true, words = [], why = '', tab = true;
            if (!step) {
              const v = k => cs(s).getPropertyValue('--fan-' + k).trim(), marks = $('my-marks');
              words = [...my.querySelectorAll('.my-name, .my-league, .my-rec dt, .my-rec dd, .my-nat b')].filter(vis).map(e => ratio(cs(e).color, cs(my).backgroundColor));
              const tabWords = [...marks.querySelectorAll('.my-fan > span:not(.my-ros)')].filter(vis).map(e => ratio(cs(e).color, cs(marks).backgroundColor));
              const sh = $('st-fan').querySelector('.fan-shield'), on = my.querySelector('.rstars .on'), chips = [...my.querySelectorAll('.fm:not(.none)')];
              const marks3 = !on || ratio(cs(on).fill, cs(my).backgroundColor) >= 3;   // the stars, and each chip by its fill or its ring, 3:1 on the ground
              const chips3 = chips.every(c => ratio(cs(c).backgroundColor, cs(my).backgroundColor) >= 3 || (/^rgb\(/.test(cs(c).boxShadow) && ratio(cs(c).boxShadow, cs(my).backgroundColor) >= 3));
              why = fan ? [s.classList.contains('fan'), cs(my).backgroundColor === rgb(v('ground')), cs(my).borderTopColor === rgb(v('edge')), words.every(r => r >= 4.5), cs(cont).backgroundColor === 'rgb(255, 207, 61)', ratio(cs(cont).color, cs(cont).backgroundColor) >= 4.5, vis($('st-fan')), !!sh && (buy === 'crest' ? sh.tagName === 'IMG' && /\/crests\/test\.svg$/.test(sh.src) : sh.tagName.toLowerCase() === 'svg'), !!sh && box(sh).width <= 20 && box(sh).height <= 22,
                cs(marks).backgroundColor === rgb(v('tab')), tabWords.length > 0 && tabWords.every(r => r >= 4.5), marks3, chips3, cs($('my-shirt')).backgroundColor === 'rgb(16, 27, 20)'].map(Number).join('') : '';
              themed = fan ? !why.includes('0')
                : !s.classList.contains('fan') && !s.style.cssText && cs(cont).backgroundColor === 'rgb(255, 207, 61)' && cs(my).backgroundColor === 'rgba(16, 27, 20, 0.94)' && !vis($('st-fan')) && !vis(marks) && words.every(r => r >= 4.5) && marks3 && chips3;
              if (fan) {                                         // the tab on the box's top edge: over it, clear of the wordmark above and of the shirt and the name inside
                const t = box(marks), b = box(my), w = box(document.querySelector('#s-home .word')), head = box(my.querySelector('.my-head'));
                tab = t.top < b.top && t.bottom > b.top && t.top >= w.bottom - 0.5 && t.bottom <= head.top + 0.5 && t.right <= b.right;
              }
            }
            const line = $('cont-note').textContent, want = busy === 'none' ? /^Quick Match$/ : busy === 'champ' || busy === 'both' ? /^Championship · Round 1 v / : busy === 'cup' ? /^European Cup · Semi-Final v / : /^Career · Round 1 v /;
            out.push({ why, tab, state:[desk ? 'desk' : 'phone', app ? 'app' : 'web', tools ? 'tools' : '', cab ? 'cab' : '', busy, free ? 'free' : '', fan ? buy : '', step ? step + (tier != null ? tier : '') : 'boxes'].filter(Boolean).join('+'), step, fan:fan && vis($('st-fan')), themed, words:words.length,
              fits:s.scrollHeight <= s.clientHeight + 1 && s.scrollWidth <= s.clientWidth && document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight, inner, small, clipped, overlap, off,
              scroll:panel ? panel.scrollHeight - panel.clientHeight : 0,
              two:!$('b-two') && !btns.some(b => /\b2 Players\b|Two Player/.test(b.textContent)),
              line:step || (want.test(line) && $('cont-name').textContent === (busy === 'none' ? 'Play' : 'Continue') && vis($('career-note')) === (busy === 'both')),
              grown:vis($('b-grown')) === ((app || free) && step === 'settings'), note:$('b-set').classList.contains('note') === app,
              cabBtn:step || vis($('b-cabinet')) === (cab || fan), lock:step || (cont.classList.contains('locked') === (free && busy !== 'none')), tools:toolsAt === (step ? 'hs-head' : 'home-mark') && (!tools || vis($('b-install'))) });
            if (tools) { for (const id of TOOLS) $(id).hidden = true; }
          }
        }
        X.setChamp(null); K.set(null); K.setHistory([]); T.career.set(null); T.store.setNative(false); T.store.setStarted(false); T.store.setBought([]); T.store.setTier(null); T.store.FAN_CLUBS[0].crest = null; T.store.FAN_CLUBS[0].agreed = false; T.locker.set(T.locker.fresh());
        const st = T.debug.settings(); st.kids = false; st.diff = 1; st.kidsR = 0; st.kidsTop = 0; T.home.setTier(null);
        document.body.classList.remove('desk'); T.debug.goHome();
        return out;
      }, VIEWS);
      const bad = f => states.filter(f).map(r => r.state);
      ok(states.length === 160*VIEWS.length && states.every(r => r.fits), `${kind}: the page never scrolls in every state, on the five boxes and every step (${bad(r => !r.fits).slice(0, 6).join(', ') || states.length + ' states'})`);
      ok(states.every(r => !r.inner && !r.off.length), `${kind}: My Team's box holds all it shows, and nothing is off the screen (${states.filter(r => r.inner || r.off.length).slice(0, 4).map(r => r.state + ': ' + r.inner + 'px ' + r.off.join('/')).join('; ') || 'all'})`);
      ok(states.filter(r => r.fan).length === 40, `${kind}: 40 of the boxes' states with the Super Fan badge in My Team's box, its plain shield or a club's crest (${states.filter(r => r.fan).length})`);
      ok(states.every(r => r.themed), `${kind}: a Super Fan's box in the club's colours (its ground and edge, every word on it 4.5:1 and more; Continue still the floodlight's yellow) with its shield or crest in the Super Fan tab (the tab in the edge's colour, its words 4.5:1 and more on it), the stars and every result's chip 3:1 on the ground (by fill or ring), the shirt on the plain panel's tile; every other home in the plain dark style, no tab, every word in the box 4.5:1 and more (${states.filter(r => !r.themed).slice(0, 4).map(r => r.state + ' ' + r.why).join(', ') || 'all'})`);
      ok(states.every(r => r.tab), `${kind}: the Super Fan tab sits on the box's top edge, clear of the wordmark above it and of the shirt and the name inside (${bad(r => !r.tab).slice(0, 4).join(', ') || 'all'})`);
      ok(states.every(r => !r.small.length), `${kind}: every button at least 44px (${states.filter(r => r.small.length).slice(0, 3).map(r => r.state + ': ' + r.small.join('/')).join('; ') || 'all'})`);
      ok(states.every(r => !r.clipped.length && !r.overlap), `${kind}: no name cut off nor lock squeezed, no button over another (${states.filter(r => r.clipped.length || r.overlap).slice(0, 3).map(r => r.state + ': ' + r.clipped.join('/') + (r.overlap ? ' overlap' : '')).join('; ') || 'none'})`);
      ok(states.every(r => r.tools), `${kind}: Offline Ready, Install Game and Updating beside the wordmark, and at a step's top right, showing wherever the home is (${bad(r => !r.tools).slice(0, 4).join(', ') || 'all'})`);
      ok(states.every(r => r.two && r.line && r.grown && r.note && r.cabBtn && r.lock), `${kind}: no 2 Players on any device, Continue saying what it picks up (Play · Quick Match with nothing; with a championship and a career, the championship, the career's note in its box), locked where it is the Full Game's, Grown-Ups in Settings where the store is live, its dot on the Settings box, the Trophy Cabinet's strip with a finished season or a Super Fan trophy (${bad(r => !(r.two && r.line && r.grown && r.note && r.cabBtn && r.lock)).slice(0, 4).join(', ') || 'all'})`);
      const crest = await page.evaluate(async () => {           // the crest itself: loaded, drawn at the shield's size
        const T = window.__tryline, S = T.store; S.FAN_CLUBS[0].crest = 'crests/test.svg'; S.FAN_CLUBS[0].agreed = true; S.setNative(true); S.setStarted(true); S.setBought(['tryline.fan.farnham']); T.debug.goHome();
        const img = document.querySelector('#st-fan img.fan-shield'); if (img) await img.decode().catch(() => {});
        const r = img ? img.getBoundingClientRect() : null, out = { img:!!img, loaded:!!img && img.naturalWidth > 0, w:r && r.width, h:r && r.height };
        S.FAN_CLUBS[0].crest = null; S.FAN_CLUBS[0].agreed = false; S.setNative(false); S.setStarted(false); S.setBought([]); T.debug.goHome();
        return out;
      });
      ok(crest.img && crest.loaded && crest.w <= 20 && crest.h <= 22, `${kind}: a club's crest, agreed, loads in the Super Fan badge at the shield's size (${json(crest)})`);
      // every club as the next one in FAN_CLUBS (a change of data alone): its Super Fan box reads, every word 4.5:1 on its ground and on the
      // tab, the stars and each result's chip 3:1 (by fill or ring), the shirt on the plain panel's tile. Colours, not layout: at one size
      if (w === 844 && touch) {
        const kits = await page.evaluate(() => {
          const T = window.__tryline, X = T.teams, S = T.store, H = T.home, st = T.debug.settings(), $ = id => document.getElementById(id), out = { tried:0, bad:[] };
          const cs = e => getComputedStyle(e), lum = c => { const v = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(n => +n/255).map(x => (x <= 0.03928 ? x/12.92 : ((x + 0.055)/1.055) ** 2.4)); return 0.2126*v[0] + 0.7152*v[1] + 0.0722*v[2]; };
          const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05)/(Math.min(x, y) + 0.05); };
          const lock = T.locker.state(), form = H.form.get(), my = $('my-box'), marks = $('my-marks');
          S.setNative(true); S.setStarted(true);
          for (const t of X.TEAM_LISTS.filter(l => l.tier > 0).flatMap(l => l.teams)) {
            const c = { key:'kit' + out.tried, name:t.name, product:'tryline.fan.kit' + out.tried, share:50, agreed:false, team:t.id, crest:null };
            S.FAN_CLUBS.push(c); S.setBought([c.product]); st.myClub = t.id; H.form.set([{ k:H.form.key(t), w:2, d:1, l:2, last:'WDLWL' }]); T.debug.goHome(); out.tried++;
            const g = cs(my).backgroundColor, why = [];
            if (!$('s-home').classList.contains('fan') || !$('st-fan').querySelector('svg.fan-shield')) why.push('no theme');
            if ([...my.querySelectorAll('.my-name, .my-league, .my-rec dt, .my-rec dd, .my-nat b')].some(e => e.offsetWidth && ratio(cs(e).color, g) < 4.5)) why.push('words');
            if ([...marks.querySelectorAll('.my-fan > span:not(.my-ros)')].some(e => ratio(cs(e).color, cs(marks).backgroundColor) < 4.5)) why.push('tab');
            if (ratio(cs(my.querySelector('.rstars .on')).fill, g) < 3) why.push('stars');
            if ([...my.querySelectorAll('.fm:not(.none)')].some(e => ratio(cs(e).backgroundColor, g) < 3 && !(/^rgb\(/.test(cs(e).boxShadow) && ratio(cs(e).boxShadow, g) >= 3))) why.push('chips');
            if (cs($('my-shirt')).backgroundColor !== 'rgb(16, 27, 20)') why.push('shirt');
            if (why.length) out.bad.push(t.id + ' ' + why.join('/'));
            S.FAN_CLUBS.pop();
          }
          S.setNative(false); S.setStarted(false); S.setBought([]); st.myClub = null; H.form.set(form); T.locker.set(lock); T.debug.goHome();
          return out;
        });
        ok(kits.tried > 100 && !kits.bad.length, `${kind}: every club as a Super Fan club (${kits.tried}): its box's words 4.5:1 on its ground and on the tab, its stars and result chips 3:1, its shirt on the plain panel's tile (${kits.bad.slice(0, 6).join(', ') || 'all'})`);
      }
      const scrolls = states.filter(r => r.scroll > 0);
      ok(scrolls.every(r => h <= 340 && /champ1$|drills$/.test(r.state)), `${kind}: a step scrolls inside itself only where 320px cannot hold it (National's nine, Skill Games), never the page (${[...new Set(scrolls.map(r => r.state.split('+').pop()))].join(', ') || 'none'})`);
      // long names: the club's steps down until it fits; every built-in club with England, South Africa and New Zealand fits the box
      const names = await page.evaluate(() => {
        const T = window.__tryline, X = T.teams, S = T.store, st = T.debug.settings(), out = {}, $ = id => document.getElementById(id);
        const clubs = X.TEAM_LISTS.filter(l => l.tier > 0).flatMap(l => l.teams);
        for (const [state, bought] of [['web', null], ['app Super Fan', ['tryline.fan.farnham']]]) {
          S.setNative(!!bought); S.setStarted(!!bought); S.setBought(bought || []);
          const cut = [], px = [];
          for (const nat of ['ENG', 'RSA', 'NZL']) for (const c of clubs) {
            st.myClub = c.id; st.myNat = nat; T.debug.goHome();
            const n = $('my-name'), b = $('my-nat').querySelector('b'), box = $('my-box');
            px.push(parseFloat(getComputedStyle(n).fontSize));
            const league = [...box.querySelectorAll('.my-league > span')].filter(e => e.offsetWidth && e.scrollWidth > e.clientWidth + 1);
            if (n.scrollWidth > n.clientWidth + 1 || (b && b.offsetWidth && b.scrollWidth > b.clientWidth + 1) || league.length || box.scrollHeight > box.clientHeight + 0.5) cut.push(c.name + ' + ' + nat);
          }
          out[state] = { tried:clubs.length*3, cut:cut.length, of:cut.slice(0, 4), min:Math.min(...px) };
        }
        S.setNative(false); S.setStarted(false); S.setBought([]); st.myClub = null; st.myNat = null; T.debug.goHome();
        return out;
      });
      ok(Object.values(names).every(r => r.tried > 200 && !r.cut && r.min >= 16), `${kind}: every club with England, South Africa or New Zealand fits My Team's box, nothing in it cut (the name 16px and more: Christchurch, Bloemfontein; the league: the United Rugby Championship for Johannesburg; the country: South Africa), the Super Fan tab showing or not (${JSON.stringify(names)})`);
      // Continue's line and the Career box's note with the longest names in the game: never a part cut, never past two lines
      const longest = await page.evaluate(() => {
        const T = window.__tryline, X = T.teams, H = T.home, $ = id => document.getElementById(id), bad = [];
        T.career.start({ name:'Sam', pos:'B', num:7, club:X.CLUBS[0] }); X.newChamp(X.CLUBS[0], X.CLUBS.slice(1, 6)); T.debug.settings().last = null; T.debug.goHome();
        const c = document.createElement('canvas').getContext('2d'); c.font = getComputedStyle($('career-note')).font;
        const names = [...new Set(X.ALL_TEAMS.map(t => t.name.replace(/ (Women|Minis)$/, '')))].sort((a, b) => c.measureText(b).width - c.measureText(a).width).slice(0, 3);
        const test = (id, text) => { const el = $(id); H.line(el, text); H.fit(); const cut = [...el.querySelectorAll('.nw')].filter(e => e.scrollWidth > e.clientWidth + 0.5); if (cut.length || el.scrollHeight > el.clientHeight + 1) bad.push(id + ': ' + text); };
        for (const n of names) {
          for (const pre of ['Championship · Round 5', 'European Cup · Semi-Final', 'World Cup · Quarter-Final', 'Home Nations Tour · Test 3', 'Career · Quarter-Final']) test('cont-note', pre + ' v ' + n);
          for (const pre of ['Round 5', 'Quarter-Final', 'Semi-Final']) test('career-note', pre + ' v ' + n);
        }
        T.career.set(null); X.setChamp(null); T.debug.goHome();
        return { names, bad };
      });
      // the wordmark keeps its size beside Offline Ready (which an installed game always shows) or Updating; only Install Game takes room from it
      const word = await page.evaluate(() => {
        const T = window.__tryline, $ = id => document.getElementById(id), px = () => parseFloat(getComputedStyle(document.querySelector('#s-home .word')).fontSize), TOOLS = ['app-tools', 'b-install', 'offline-update', 'offline-status'];
        const at = on => { T.debug.goHome(); for (const id of TOOLS) $(id).hidden = !on.includes(id); T.home.fit(); const m = $('home-mark').getBoundingClientRect(), s = $('offline-status').getBoundingClientRect(); return { px:px(), h:m.height, ready:on.includes('offline-status') ? s.right <= m.right + 0.5 && s.width > 0 : true }; };
        const out = { none:at([]), ready:at(['app-tools', 'offline-status']), install:at(['app-tools', 'offline-status', 'b-install']), update:at(['app-tools', 'offline-status', 'offline-update']) };
        for (const id of TOOLS) $(id).hidden = true; T.debug.goHome();
        return out;
      });
      ok(word.ready.px === word.none.px && Math.abs(word.ready.h - word.none.h) < 1 && word.ready.ready && word.update.px === word.none.px && Math.abs(word.update.h - word.none.h) < 1 && word.install.px < word.none.px, `${kind}: the wordmark keeps its size (${word.none.px}px) with Offline Ready beside it, or Updating in its place, the row no taller; only Install Game (the web, before it is installed) makes it smaller (${word.install.px}px) (${json(word)})`);
      // Competitions with one to three on a tier: big boxes, as Match's are, not a strip with the step empty under it
      const comps = await page.evaluate(() => {
        const T = window.__tryline, $ = id => document.getElementById(id), out = [];
        for (const tier of [0, 2]) { T.home.setTier(tier); T.debug.goHome(); T.home.open('champ'); const b = [...$('hc-comps').querySelectorAll('.hc-comp')]; out.push(tier + ':' + b.length + ':' + Math.round(Math.min(...b.map(e => e.getBoundingClientRect().height)))); }
        T.home.setTier(null); T.debug.goHome();
        return out;
      });
      ok(comps.every(c => +c.split(':')[1] <= 3 && +c.split(':')[2] >= 140), `${kind}: International's three and Local's two or three as big boxes, 140px and more (${comps.join(' ')})`);
      ok(longest.names.length === 3 && !longest.bad.length, `${kind}: Continue's line and the Career box's note keep every part whole within two lines for the longest names in the game (${longest.names.join(', ')}; ${longest.bad.slice(0, 3).join('; ') || 'none cut'})`);
      // a locked Legend: the padlock clears the name on its team card and the jersey, its badge and its name on the Locker's tile
      const locks = await page.evaluate(async () => {
        const T = window.__tryline, L = T.locker, S = T.store, st = T.debug.settings(), cat0 = st.cat, out = { cards:0, tiles:0, over:[] };
        const lockOf = el => { const c = getComputedStyle(el, '::after'), r = el.getBoundingClientRect(), l = r.left + el.clientLeft + parseFloat(c.left), t = r.top + el.clientTop + parseFloat(c.top); return { left:l, top:t, right:l + parseFloat(c.width), bottom:t + parseFloat(c.height) }; };
        const hit = (a, b) => a.left < b.right + 2 && a.right > b.left - 2 && a.top < b.bottom + 2 && a.bottom > b.top - 2;   // 2px clear
        const saved = L.state(); L.set(L.clean({ n:{ hat:10, sharp:10, hit:10, clean:10, golden:10, comeback:10, drop:10, fire:10, champ:10, star:10 } })); S.setTier('free');
        for (const cat of ['men', 'women']) {
          st.cat = cat; st.pick = [null, null]; T.debug.openTeams('quick');
          const P = T.picker, legs = P.view(0).ladder.flatMap((g, gi) => g.teams.map((t, i) => [gi, i, t])).filter(x => x[2].legend);
          for (const [gi, i] of legs) {
            P.group(0, gi - P.view(0).gi); P.step(0, i - P.view(0).i);
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            const b = document.querySelector('#t-side0 .pk-pick[data-legend]');
            if (!b) { out.over.push('no card ' + gi); continue; }
            out.cards++;
            const lock = lockOf(b), range = document.createRange(); range.selectNodeContents(b.querySelector('.tname'));
            if (!b.classList.contains('locked') || [...range.getClientRects()].some(q => hit(q, lock))) out.over.push('card ' + b.querySelector('.tname').textContent);
          }
        }
        L.open(3);
        for (const b of document.querySelectorAll('#s-locker .lk-leg[data-legend]')) {
          out.tiles++;
          const lock = lockOf(b);
          if (!b.classList.contains('locked') || ['.ovr', '.jersey', '.lk-nat', '.lk-yr', '.rstars'].some(q => { const e = b.querySelector(q); return e && e.getBoundingClientRect().width > 0 && hit(e.getBoundingClientRect(), lock); })) out.over.push('tile ' + b.getAttribute('aria-label'));
        }
        S.setTier(null); L.set(saved); st.cat = cat0; T.debug.goHome();
        return out;
      });
      ok(locks.cards === 14 && locks.tiles === 14 && !locks.over.length, `${kind}: a locked Legend's padlock clears its name on the team card (${locks.cards}) and its jersey, badge, name and stars on the Locker's tile (${locks.tiles}) (${locks.over.slice(0, 4).join(', ') || 'all clear'})`);
      // a controller: the first press on Continue; Down Match, Down Skill Games, Right Settings, Up Career, Up Continue; Left into My Team's
      // column; every button reached from the first press on the boxes and on every step; Down from every button never skips a row
      const pad = await page.evaluate(VIEWS => {
        const T = window.__tryline, X = T.teams, K = T.cups, out = {}, $ = id => document.getElementById(id), f = () => T.debug.focus();
        const id = el => (el ? el.id || el.textContent.trim() : 'none'), vis = el => !!el && !el.hidden && !el.closest('[hidden]') && el.getBoundingClientRect().width > 0;
        K.setHistory([]); X.newChamp(X.NATIONS[0], X.NATIONS.slice(1)); { const c = X.champ(); for (let i = 0; i < 5; i++) { c.results.push(c.fixtures[i].map(p => ({ h:p[0], a:p[1], hs:20, as:10, ht:3, at:1 }))); c.round++; } X.save(); X.load(); X.setChamp(null); }   // the Trophy Cabinet's strip showing
        T.debug.goHome(); T.home.ring(null);
        out.first = id(T.navMove(0, 0, 0));
        out.moves = [[0, 1], [0, 1], [1, 0], [0, -1], [0, -1], [1, 0], [0, -1], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => id(T.navMove(0, dx, dy)));
        T.home.ring($('b-locker')); out.moves.push(id(T.navMove(0, -1, 0)), id(T.navMove(0, -1, 0)), id(T.navMove(0, -1, 0)));   // along My Team's three, to the end
        T.home.ring($('b-locker')); out.moves.push(id(T.navMove(0, 1, 0)));   // and out to the box level with it
        // Right from the end of a row in My Team's column (the Locker, the Trophy Cabinet): the box level with it; Left from a box of the first
        // column and Right again: back where it started
        const level = from => { const y = (q => q.top + q.height/2)(from.getBoundingClientRect()); return ['b-match', 'b-drills'].map($).sort((a, b) => Math.abs((q => q.top + q.height/2)(a.getBoundingClientRect()) - y) - Math.abs((q => q.top + q.height/2)(b.getBoundingClientRect()) - y))[0]; };
        out.right = [];
        for (const b of ['b-locker', 'b-cabinet']) { T.home.ring($(b)); const to = T.navMove(0, 1, 0); if (to !== level($(b))) out.right.push(b + '>' + id(to)); }
        T.home.ring($('b-my')); { const to = T.navMove(0, 1, 0); if (to !== $('b-import')) out.right.push('b-my>' + id(to)); }
        for (const b of ['b-match', 'b-drills']) { T.home.ring($(b)); const left = T.navMove(0, -1, 0); const back = T.navMove(0, 1, 0); if (!left || !$('home-side').contains(left) || back !== $(b)) out.right.push(b + '<' + id(left) + '>' + id(back)); }
        // the rows: Continue; Match | Career; Skill Games | Settings; and My Team's column: Change | Add Your Team | Locker, then the Trophy Cabinet
        const rows = [['b-continue'], ['b-match', 'b-career'], ['b-drills', 'b-set'], ['b-my', 'b-import', 'b-locker'], ['b-cabinet']], rowOf = el => rows.findIndex(r => r.includes(el && el.id));
        out.down = [];
        for (const r of [0, 1, 2]) for (const b of rows[r]) { T.home.ring($(b)); const to = T.navMove(0, 0, 1); if (r === 2 ? to !== null : rowOf(to) !== r + 1) out.down.push(b + '>' + id(to)); T.home.ring($(b)); const up = T.navMove(0, 0, -1); if (r === 0 ? up !== null : rowOf(up) !== r - 1) out.down.push(b + '^' + id(up)); }
        for (const b of rows[3]) { T.home.ring($(b)); const to = T.navMove(0, 0, 1); if (to !== $('b-cabinet')) out.down.push(b + '>' + id(to)); }
        T.home.ring($('b-cabinet')); { const to = T.navMove(0, 0, 1); if (to !== null) out.down.push('b-cabinet>' + id(to)); }
        // every visible button, on the boxes and on every step, reached by moving the ring from the first press; Down never skips a row
        out.unreached = []; out.skipped = []; out.up = [];
        for (const [step, tier] of VIEWS) {
          T.home.setTier(tier); T.debug.goHome(); if (step) T.home.open(step); T.home.ring(null);
          const all = [...document.querySelectorAll('#s-home .btn, #s-home .seg button')].filter(vis);
          const reach = new Set(), todo = [T.navMove(0, 0, 0)];
          while (todo.length) {
            const el = todo.shift(); if (!el || reach.has(el)) continue; reach.add(el);
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { T.home.ring(el); const got = T.navMove(0, dx, dy); if (got && !reach.has(got)) todo.push(got); }
          }
          out.unreached.push(...all.filter(b => !reach.has(b)).map(b => (step || 'boxes') + ':' + id(b)));
          if (step) {
            const mid = el => { const r = el.getBoundingClientRect(); return r.top + r.height/2; }, tops = [...new Set(all.map(b => Math.round(mid(b))))].sort((a, b) => a - b);
            const rowIx = el => tops.findIndex(t => Math.abs(t - mid(el)) <= 6);
            for (const b of all) { T.home.ring(b); const to = T.navMove(0, 0, 1); if (to && rowIx(to) - rowIx(b) > 1 && !b.closest('.seg') && !to.closest('.seg')) out.skipped.push(step + ':' + id(b) + '>' + id(to)); }
            const panel = $('hp-' + step), inside = all.filter(b => panel.contains(b)), top = Math.min(...inside.map(b => b.getBoundingClientRect().top));   // Up from the step's first row: Back
            for (const b of inside.filter(b => b.getBoundingClientRect().top - top < 4)) { T.home.ring(b); const to = T.navMove(0, 0, -1); if (to !== $('hs-back')) out.up.push(step + (tier != null ? tier : '') + ':' + id(b) + '^' + id(to)); }
            T.home.ring($('hs-back')); { const to = T.navMove(0, 0, 1); if (!to || !panel.contains(to) || to.getBoundingClientRect().top - top >= 4) out.up.push(step + ':hs-back>' + id(to)); }
          }
        }
        T.home.setTier(null); T.home.ring(null); K.setHistory([]); T.debug.goHome();
        return out;
      }, VIEWS);
      ok(pad.first === 'b-continue' && json(pad.moves.slice(0, 9)) === json(['b-match', 'b-drills', 'b-set', 'b-career', 'b-continue', 'none', 'none', 'b-my', 'b-cabinet']) && ['b-my', 'b-import', 'b-locker'].includes(pad.moves[9]) && json(pad.moves.slice(10)) === json(['b-import', 'b-my', 'none', 'b-drills']), `${kind}: a controller's first press lands on Continue; Down to Match, Down to Skill Games, Right to Settings, Up to Career and Continue, no further right (Continue is alone in its row) nor up; Left from Continue to Change, the first of My Team's column (re-pinned from the Locker at the review, 2026-11-11), Down to the Trophy Cabinet, Up back to the three, along them to Change and no further, Right from the Locker to Skill Games, level with it (${json(pad.moves)})`);
      ok(!pad.right.length, `${kind}: Right from the end of a row in My Team's column (the Locker, the Trophy Cabinet) to the box level with it, Right from Change along its row, and Left then Right from Match and from Skill Games back where it started (${pad.right.join(', ') || 'all'})`);
      ok(!pad.up.length, `${kind}: on every step (Competitions on each tier) Up from the first row goes back to Back, and Down from Back to that row (${pad.up.slice(0, 6).join(', ') || 'all'})`);
      ok(!pad.down.length, `${kind}: Down from every box lands on the row below (nothing under the last), Up on the row above, and in My Team's column Down goes to the Trophy Cabinet (${pad.down.slice(0, 6).join(', ') || 'all'})`);
      ok(!pad.unreached.length, `${kind}: every button on the boxes and on every step is reached by moving the ring (${pad.unreached.slice(0, 8).join(', ') || 'all'})`);
      ok(!pad.skipped.length, `${kind}: on every step Down from a button never skips a row (${pad.skipped.slice(0, 6).join(', ') || 'none'})`);
      rowsOk(kind, await page.evaluate(settingsRows));
      // the keyboard: the arrow keys move as the ring does, Enter presses, Escape is Back, Tab reaches every box
      await page.evaluate(() => { const T = window.__tryline, X = T.teams, K = T.cups; K.setHistory([]); X.setChamp(null); T.home.ring(null); T.debug.goHome(); });
      const keyed = [await page.evaluate(() => document.activeElement.id)];
      for (const k of ['ArrowDown', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowRight', 'ArrowRight']) { await page.keyboard.press(k); keyed.push(await page.evaluate(() => document.activeElement.id)); }
      await page.keyboard.press('ArrowUp'); await page.keyboard.press('Enter');
      const opened = await page.evaluate(() => [window.__tryline.home.step(), document.activeElement.id]);
      const stepKeys = [];
      for (const k of ['ArrowRight', 'ArrowUp', 'ArrowDown']) { await page.keyboard.press(k); stepKeys.push(await page.evaluate(() => document.activeElement.id)); }
      await page.keyboard.press('Escape'); const esc = await page.evaluate(() => [window.__tryline.home.step(), document.activeElement.id]);
      ok(json(keyed) === json(['b-continue', 'b-match', 'b-career', 'b-set', 'b-drills', 'b-match', 'b-continue', 'b-my', 'b-import', 'b-locker', 'b-drills']) && json(opened) === json(['match', 'b-quick']) && json(stepKeys) === json(['b-comps', 'hs-back', 'b-quick']) && json(esc) === json([null, 'b-match']), `${kind}: the keyboard: Continue focused, the arrows as the ring (Down Match, Right Career, Down Settings, Left Skill Games, Up Match, Up Continue, Left Change, Right along to Add Your Team and the Locker, Right again to Skill Games, level with it), Up and Enter open Match on Quick Match, Right Competitions, Up Back to Menu, Down Quick Match, Escape back on Match (${json([keyed, opened, stepKeys, esc])})`);
      await page.evaluate(() => { document.activeElement && document.activeElement.blur(); });
      const tabbed = new Set();
      for (let i = 0; i < 14; i++) { await page.keyboard.press('Tab'); tabbed.add(await page.evaluate(() => document.activeElement.id)); }
      ok(['b-my', 'b-import', 'b-locker', 'b-continue', 'b-match', 'b-career', 'b-drills', 'b-set'].every(id => tabbed.has(id)), `${kind}: Tab reaches every box and My Team's three (${[...tabbed].filter(Boolean).join(' ')})`);
      // Skill Games for each player: Men the ten, How to Play, Contact Games (U9 and Up) and For Grown-Ups; the Kids level and Minis the seven, How
      // to Play and For Grown-Ups. Each fits with nothing over anything, the ring reaches every button, For Grown-Ups opens its panel with
      // Back to Skill Games in the ring's reach (the step's Back put away), every game's card offers Watch How in the ring's reach, and Tab reaches
      // every button on the step
      for (const [who, kids, cat] of [['Men', false, 'men'], ['Kids', true, 'men'], ['Minis', false, 'minis']]) {
        const sk = await page.evaluate(([kids, cat]) => {
          const T = window.__tryline, st = T.debug.settings(), $ = id => document.getElementById(id);
          const box = el => el.getBoundingClientRect(), vis = el => !!el && !el.hidden && !el.closest('[hidden]') && box(el).width > 0;
          const meet = (p, q) => p.left < q.right - 1 && p.right > q.left + 1 && p.top < q.bottom - 1 && p.bottom > q.top + 1;
          const ringAll = () => { T.home.ring(null); const r = new Set(), q = [T.navMove(0, 0, 0)]; while (q.length) { const el = q.shift(); if (!el || r.has(el)) continue; r.add(el); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { T.home.ring(el); const got = T.navMove(0, dx, dy); if (got && !r.has(got)) q.push(got); } } return r; };
          const seen = st.drillSeen.slice(); st.drillSeen = T.drills.DRILLS.map(d => d.id);   // no Watch How playing on a card's first open
          st.kids = kids; st.diff = kids ? 0 : 1; st.cat = cat; T.debug.goHome(); T.home.open('drills'); T.debug.focus() && T.debug.focus().classList.remove('padfocus');
          const s = $('s-home'), panel = $('hp-drills'), btns = [...panel.querySelectorAll('.btn')].filter(vis);
          const games = btns.filter(b => T.drills.DRILLS.some(d => 'pr-' + d.id === b.id)).map(b => b.id.slice(3));
          const pr = box(panel), clip = getComputedStyle(panel).overflowY !== 'visible', inBox = b => { const q = box(b); return clip ? { left:q.left, right:q.right, top:Math.max(q.top, pr.top), bottom:Math.min(q.bottom, pr.bottom) } : q; };
          const over = btns.filter((a, i) => btns.some((b, j) => j > i && meet(inBox(a), inBox(b)))).map(b => b.id);
          const small = btns.filter(b => box(b).height < 43.5 || box(b).width < 43.5).map(b => b.id);
          const cut = [...panel.querySelectorAll('.dc-name, .pr-group')].filter(vis).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent);
          const reach = ringAll(), unreached = [...btns, $('hs-back')].filter(b => !reach.has(b)).map(b => b.id);
          T.home.ring(null); $('pr-grown').click();
          const gp = $('pr-grownups'), back = $('pr-grown-back'), grown = vis(gp) && !vis($('pr-games')) && !vis($('hs-back')) && ringAll().has(back) && (T.navBack(0), vis($('pr-games')) && !vis(gp) && vis($('hs-back')));
          const watch = games.filter(id => { T.practice.start(id); const w = $('pr-watch'), good = vis(w) && w.textContent === 'Watch How' && ringAll().has(w); T.practice.choose(); return !good || T.home.step() !== 'drills'; });
          T.home.ring(null); T.debug.goHome(); T.home.open('drills');
          const out = { games, contact:!$('pr-contact').hidden && !$('pr-contact').closest('[hidden]'), fits:s.scrollHeight <= s.clientHeight + 1 && document.documentElement.scrollWidth <= innerWidth, over, small, cut, unreached, grown, watch, help:vis($('b-help')), grownBtn:vis($('pr-grown')), ids:btns.map(b => b.id) };
          st.drillSeen = seen;
          return out;
        }, [kids, cat]);
        await page.evaluate(() => { document.activeElement && document.activeElement.blur(); });
        const tabbed = new Set();
        for (let i = 0; i < 40; i++) { await page.keyboard.press('Tab'); const at = await page.evaluate(() => { const a = document.activeElement; return a && document.getElementById('hp-drills').contains(a) ? a.id : null; }); if (at) tabbed.add(at); }
        const young = kids || cat === 'minis', open = ['tag', 'egg', 'circle', 'cones', 'pass', 'kick', 'defend'];
        ok(json(sk.games) === json(young ? open : open.concat(['tackle', 'scrum', 'back'])) && sk.contact === !young && sk.help && sk.grownBtn, `${kind} ${who}: Skill Games shows ${young ? 'the seven open games, no Contact Games' : 'the ten, the contact three under Contact Games (U9 and Up)'}, How to Play and For Grown-Ups (${sk.games.join(', ')})`);
        ok(sk.fits && !sk.over.length && !sk.small.length && !sk.cut.length, `${kind} ${who}: Skill Games fits with no page scroll, every button 44px and more, none over another, no name cut off (${[...sk.over, ...sk.small, ...sk.cut].join(', ') || 'all clear'})`);
        ok(!sk.unreached.length, `${kind} ${who}: the ring reaches every button on Skill Games and its Back (${sk.unreached.join(', ') || 'all'})`);
        ok(sk.grown, `${kind} ${who}: For Grown-Ups opens its panel with Back to Skill Games in the ring's reach, the step's Back put away, and B (Back to Skill Games) shuts it, the step's Back again`);
        ok(!sk.watch.length, `${kind} ${who}: every game's card offers Watch How, in the ring's reach, and Back to Skill Games comes back to the step (${sk.watch.join(', ') || 'all ' + sk.games.length})`);
        ok(sk.ids.every(id => tabbed.has(id)), `${kind} ${who}: Tab reaches every button on Skill Games (${sk.ids.filter(id => !tabbed.has(id)).join(', ') || 'all ' + sk.ids.length})`);
      }
      await page.evaluate(() => { const T = window.__tryline, st = T.debug.settings(); st.kids = false; st.diff = 1; st.cat = 'men'; T.home.ring(null); T.debug.goHome(); });
      // a step scrolling inside itself (320px tall): the ring brings its last button into view
      if (h <= 340) {
        const ringed = await page.evaluate(() => {
          const T = window.__tryline, X = T.teams, K = T.cups, $ = id => document.getElementById(id), out = [];
          for (const [step, tier] of [['champ', 1], ['drills', null]]) {
            T.home.setTier(tier); T.debug.goHome(); T.home.open(step);
            const p = $('hp-' + step), btns = [...p.querySelectorAll('.btn')].filter(b => !b.closest('[hidden]') && b.getBoundingClientRect().width > 0), last = btns[btns.length - 1];
            T.home.ring(last); const q = last.getBoundingClientRect(), pr = p.getBoundingClientRect();
            out.push(step + ':' + (p.scrollHeight <= p.clientHeight || (q.top >= pr.top - 0.5 && q.bottom <= pr.bottom + 0.5)));
            T.home.ring(null); p.scrollTop = 0;
          }
          T.home.setTier(null); T.debug.goHome();
          return out;
        });
        ok(ringed.every(r => r.endsWith('true')), `${kind}: a step that scrolls inside itself brings the ring's button into view (${ringed.join(' ')})`);
      }
      ok(!errors.length, `${kind}: no page errors (${errors.join('; ')})`);
      await ctx.close();
    }
    // 11. The team screen, side by side (the owner, 2026-11-11: "a side-by-side picker in the style of EA FC's kick-off screen"), re-pinned
    //     from Fold to One Line, behaviour by behaviour: at every phone size, Safari's bars included, every state (Pick Your Team, Pick
    //     Opponent on a club and on a nation with its traits, Women, 2 Players, My Team, each Championship with its primary, the World Cup,
    //     the tour and the career's club screen) fits with nothing cut, off the side or scrolled, both sides and the V wholly in view, the
    //     primary in view, every control 44px; the ladder sheet open over it stays on the screen. The keyboard and a controller follow it:
    //     the arrows and a controller's d-pad on the side, Enter and A setting it and moving on, Tab and the ring reaching everything.
    //     A move slides by opacity and transform only, and not at all with reduced motion. tools/picker.mjs checks every side of every group.
    for (const [w, h] of [[844, 390], [667, 375], [844, 340], [667, 320], [568, 320]]) {
      const ctx = await browser.newContext({ viewport:{ width:w, height:h }, deviceScaleFactor:1, isMobile:true, hasTouch:true, serviceWorkers:'block' });
      const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(s => { try { localStorage.setItem('tryline.v1', JSON.stringify(s)); } catch (e) { /* blocked */ } }, SAVE);
      await page.goto(base + 'index.html', { waitUntil:'load' }); await page.evaluate(() => document.fonts.ready);
      const kind = `${w}x${h}`;
      const at = (n, key) => `P.group(${n}, P.view(${n}).ladder.findIndex(g => g.key === '${key}') - P.view(${n}).gi);`;
      const STATES = {
        'Pick Your Team':[`D.openTeams('quick');`, 'Pick Farnham'],
        'Pick Opponent on Australia':[`D.openTeams('quick'); D.pickTeam(X.CLUBS[0]); ${at(1, 'aus')}`, 'Pick Sydney'],
        'Pick Opponent on the URC, Women':[`D.openTeams('quick'); D.pickTeam(X.CLUBS[7]); X.catPick('women'); ${at(1, 'cel.ire')}`, 'Pick Dublin Women'],
        'Player 2 Team on the URC':[`D.openJoin(); D.openTeams('two'); D.pickTeam(X.NATIONS[3]); ${at(1, 'cel.ita')}`, 'Pick Treviso'],
        'My Team on a country':[`D.setTwo(false); D.openTeams('my'); ${at(0, 'nat.eng')}`, 'Done'],
        'Pick Opponent on a nation, its traits':[`D.openTeams('quick'); D.pickTeam(X.CLUBS[0]); ${at(1, 'nat.fra')}`, 'Pick France'],
        'Championship, a league':[`T.home.champPick('cel');`, 'Play as Dublin'],
        'Championship, Surrey, Play as Farnham':[`T.home.champPick('sur');`, 'Play as Farnham'],
        'Championship, International, Play as England':[`T.home.champPick('int');`, 'Play as England'],
        'Championship, the United Rugby Championship, Play as Dublin Women':[`S.myClub = 'DUB'; S.cat = 'women'; T.home.champPick('cel');`, 'Play as Dublin Women'],
        'the World Cup, Play as England':[`T.home.champPick('world');`, 'Play as England'],
        'the Home Nations Tour':[`T.home.champPick('tour');`, /^Tour /],
        'the career\'s club screen':[`C.set(null); C.newOpen(); C.clubOpen(); ${at(0, 'cel.ire')}`, 'Pick Dublin'],
      };
      const MEASURE = `(() => { const s = document.getElementById('s-teams'), box = e => e.getBoundingClientRect(), vis = e => !!e && !e.closest('[hidden]') && box(e).width > 0, P = window.__tryline.picker;
        const name = e => e.id || e.className || e.textContent.trim().slice(0, 16), sheet = document.getElementById('m-ladder');
        const off = [...s.querySelectorAll('*'), ...sheet.querySelectorAll('*')].filter(vis).filter(e => box(e).right > innerWidth + 0.5 || box(e).left < -0.5).map(name);
        const cut = [...s.querySelectorAll('.pk-who, .pk-where span, .pk-group, .tname, .pk-league, .pk-st .lbl, .pk-n, .pk-step .btn, .pk-foot .btn')].filter(vis).filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).textOverflow !== 'ellipsis').map(name);
        const small = [...s.querySelectorAll('button'), ...sheet.querySelectorAll('button')].filter(vis).filter(b => box(b).height < 43.5 || box(b).width < 43.5).map(name);
        const parts = [document.getElementById('t-side0'), ...(P.one() ? [] : [document.getElementById('t-side1'), document.getElementById('t-v')])];
        const whole = parts.every(e => vis(e) && box(e).top >= -0.5 && box(e).bottom <= innerHeight + 0.5), go = document.getElementById('t-go'), gb = box(go), card = sheet.hidden ? null : box(sheet.querySelector('.card'));
        return { sheet:!sheet.hidden, off, cut, small, whole, go:go.textContent, goIn:gb.top >= -0.5 && gb.bottom <= innerHeight + 0.5 && gb.height >= 43.5, card:card ? card.top >= -0.5 && card.bottom <= innerHeight + 0.5 : true,
          side:Math.max(s.scrollWidth - s.clientWidth, document.documentElement.scrollWidth - innerWidth), scroll:s.scrollHeight - s.clientHeight, page:document.documentElement.scrollHeight - innerHeight }; })()`;
      const lines = [];
      for (const [where, [js, primary]] of Object.entries(STATES)) {
        for (const opened of [false, true]) {
          await page.evaluate(`(() => { const T = window.__tryline, D = T.debug, X = T.teams, C = T.career, P = T.picker, $ = i => document.getElementById(i), S = D.settings();
            T.cups.set(null); X.setChamp(null); D.setTwo(false); S.myClub = null; S.cat = 'men'; S.pick = [null, null]; D.goHome();   // each state from the save's own: My Team Farnham and England, Men
            ${js} ${opened ? 'P.sheet(0);' : ''} })()`);
          await page.waitForTimeout(260);
          const m = await page.evaluate(MEASURE);
          const name = `${kind}: ${where}${opened ? ', its ladder sheet open' : ''}`;
          ok(!m.off.length && m.side <= 0 && m.page <= 0 && m.scroll <= 0 && m.card, `${name}: nothing off the side, the page never scrolls, the sheet (open) on the screen (${json({ off:m.off, side:m.side, page:m.page, scroll:m.scroll, card:m.card })})`);
          ok(!m.cut.length && !m.small.length, `${name}: nothing cut, every control 44px (${json({ cut:m.cut, small:m.small })})`);
          ok(m.goIn && (primary instanceof RegExp ? primary.test(m.go) : m.go === primary), `${name}: the primary in view, 44px, saying what it does (${m.go})`);
          if (!opened) ok(m.whole, `${name}: ${where.startsWith('Pick') || where.startsWith('Player') ? 'both sides and the V' : 'its side'} wholly in view`);
          if (!opened) lines.push(`${where}: ${m.go}`);
          await page.evaluate(() => window.__tryline.picker.sheetClose(null));
        }
      }
      console.log(`${kind}: ${lines.length} states fit`);
      const titles = await page.evaluate(() => { const T = window.__tryline, f = () => getComputedStyle(document.querySelector('#s-teams .pk-top h2.title')).fontSize; T.debug.openTeams('quick'); const a = f(); T.career.set(null); T.career.newOpen(); T.career.clubOpen(); const b = f(); T.debug.goHome(); return [a, b]; });
      ok(titles[0] === titles[1] && parseFloat(titles[0]) <= 30, `${kind}: the club screen is the team screen, its title the same size, smaller than a screen's own title (${titles.join(', ')})`);
      // the keyboard: the arrows on the focused side, Page Down a country, Enter sets it and moves on, Shift+Tab back
      const keys = [];
      const focusAt = () => page.evaluate(() => { const a = document.activeElement, side = a && a.closest && a.closest('.pk-side'); return a ? (side ? side.id + ' ' + a.dataset.act : a.id || a.tagName) : null; });
      await page.evaluate(() => { const T = window.__tryline; T.debug.settings().pick = [null, null]; T.debug.openTeams('quick'); });
      await page.focus('#t-side0 .pk-pick'); await page.keyboard.press('ArrowLeft'); keys.push(await page.evaluate(() => window.__tryline.picker.view(0).team.id), await focusAt());
      await page.keyboard.press('PageDown'); keys.push(await page.evaluate(() => window.__tryline.picker.view(0).group.key));
      await page.keyboard.press('Enter'); keys.push(await focusAt());
      await page.keyboard.press('Shift+Tab'); keys.push(await focusAt());
      ok(json(keys) === json(['WIM', 't-side0 pick', 'nat.sco', 't-side1 pick', 't-side1 fav']), `${kind}: the keyboard: Left on Your Team (Wimbledon, from Farnham, round the end), Page Down a country (Scotland), Enter sets it onto the Opponent's card, and back from it is the Opponent's Favourite (${json(keys)})`);
      // a side picked, and a team made, move on as a card would; the ring the same
      const sides = await page.evaluate(() => {
        const T = window.__tryline, P = T.picker, $ = i => document.getElementById(i), out = [];
        T.debug.settings().pick = [null, null]; T.debug.openTeams('quick'); T.home.ring(null);
        T.home.ring(document.querySelector('#t-side0 .pk-pick')); T.navPress(0); const f = T.debug.focus(); out.push($('t-title').textContent, f && f.closest('.pk-side').id);
        T.navPress(0); out.push(T.debug.focus() && T.debug.focus().id);
        T.home.ring(null); T.debug.goHome(); return out;
      });
      ok(json(sides) === json(['Pick Opponent', 't-side1', 't-go']), `${kind}: A on Your Team sets it and the ring moves on to the Opponent, then to Kick Off (${json(sides)})`);
      const club = [];   // the career's club screen the same way: the arrows through its groups, Enter picks
      await page.evaluate(() => { const C = window.__tryline.career; C.set(null); C.newOpen(); C.clubOpen(); });
      await page.focus('#t-side0 .pk-pick'); await page.keyboard.press('ArrowDown'); club.push(await page.evaluate(() => window.__tryline.picker.view(0).group.key));
      await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp'); club.push(await page.evaluate(() => window.__tryline.picker.view(0).group.key));
      await page.keyboard.press('Enter'); club.push(await page.evaluate(() => [document.getElementById('s-career-new').hidden ? 'teams' : 'new player', window.__tryline.career.draft().club.id, window.__tryline.career.draft().league].join(' ')));
      await page.evaluate(() => { const T = window.__tryline; T.home.ring(null); T.career.set(null); T.debug.goHome(); });
      ok(json(club) === json(['cty', 'en2', 'new player EAL en2']), `${kind}: the career's club screen too: Down to Counties, Up to England's Championship, Enter picks Ealing, of England 2 (${json(club)})`);
      // a controller: the first press on Your Team's card; the d-pad drives it; X or Y lifts the ring onto the side's buttons, and from the
      // first press the ring reaches every button on the screen, in Quick Match, Championship (Play as among them), the career's club screen
      // and My Team (re-pinned 2026-11-11: the search starts at the first press and goes on from the cards too)
      const pad = await page.evaluate(() => {
        const T = window.__tryline, D = T.debug, P = T.picker, $ = i => document.getElementById(i), f = () => T.debug.focus();
        const id = el => !el ? 'none' : el.closest && el.closest('.pk-side') ? el.closest('.pk-side').id + ' ' + el.dataset.act : el.dataset && el.dataset.cat ? 'cat ' + el.dataset.cat : el.id || el.textContent.trim();
        const find = k => (k === 'none' ? null : k.startsWith('cat ') ? document.querySelector(`#t-cat [data-cat="${k.slice(4)}"]`) : k.startsWith('t-side') ? $(k.split(' ')[0]).querySelector(`[data-act="${k.split(' ')[1]}"]`) : $(k));
        const reach = () => {                                  // every state of the ring from the first press: the d-pad's four ways and the lift, from every button and card
          const start = id(T.navMove(0, 0, 0)), seen = new Set([start]), todo = [start];
          while (todo.length) { const k = todo.shift(); for (const a of ['l', 'r', 'u', 'd', 'y']) { T.home.ring(find(k)); if (a === 'y') P.lift(0); else T.navMove(0, a === 'r' ? 1 : a === 'l' ? -1 : 0, a === 'd' ? 1 : a === 'u' ? -1 : 0); const n = id(f()); if (!seen.has(n)) { seen.add(n); todo.push(n); } } }
          const all = [...$('s-teams').querySelectorAll('button')].filter(b => !b.closest('[hidden]') && b.getBoundingClientRect().width > 0 && !b.disabled).map(id); T.home.ring(null);
          return start + ' ' + JSON.stringify(all.filter(k => !seen.has(k)));
        };
        const out = [];
        D.settings().pick = [null, null]; D.openTeams('quick'); T.home.ring(null);
        out.push(id(T.navMove(0, 0, 0)));
        T.navMove(0, 0, 1); out.push(P.view(0).group.key, id(f()));
        P.lift(0); out.push(id(f())); P.lift(0); out.push(id(f()));
        D.openTeams('quick'); T.home.ring(null); out.push(reach());
        D.openTeams('champ', 'sur'); T.home.ring(null); out.push(reach());   // Surrey, My Team's list: its card first, Play as Farnham in reach
        T.career.set(null); T.career.newOpen(); T.career.clubOpen(); T.home.ring(null); out.push(reach());
        D.openTeams('my'); T.home.ring(null); out.push(reach());
        T.home.ring(null); D.goHome();
        return out;
      });
      ok(json(pad) === json(['t-side0 pick', 'cty', 't-side0 pick', 't-side0 sheet', 't-side0 pick', 't-side0 pick []', 't-side0 pick []', 't-side0 pick []', 't-side0 pick []']), `${kind}: a controller: the first press on Your Team's card, Down its next group with the ring kept on it, Y onto its group's button and back; from the first press the ring reaches every button in Quick Match, Championship, the career's club screen and My Team (${json(pad)})`);
      ok(!errors.length, `${kind}: no page errors (${errors.join('; ')})`);
      await ctx.close();
    }
    // the motion: transform and opacity only, quick; nothing at all with reduced motion
    for (const reduced of [false, true]) {
      const ctx = await browser.newContext({ viewport:{ width:667, height:375 }, deviceScaleFactor:1, isMobile:true, hasTouch:true, serviceWorkers:'block', reducedMotion:reduced ? 'reduce' : 'no-preference' });
      const page = await ctx.newPage();
      await page.addInitScript(s => { try { localStorage.setItem('tryline.v1', JSON.stringify(s)); } catch (e) { /* blocked */ } }, SAVE);
      await page.goto(base + 'index.html', { waitUntil:'load' });
      const m = await page.evaluate(() => {
        const T = window.__tryline, P = T.picker, mine = () => document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('#s-teams'));
        T.debug.openTeams('quick'); mine().forEach(a => a.finish());
        P.step(0, 1); const open = mine();
        const props = open.flatMap(a => a.effect.getKeyframes().flatMap(k => Object.keys(k).filter(p => !['offset', 'computedOffset', 'easing', 'composite'].includes(p))));
        const ms = open.map(a => a.effect.getTiming().duration);
        open.forEach(a => a.finish()); P.group(1, 1); const shut = mine();
        T.debug.goHome();
        return { open:open.length, shut:shut.length, props:[...new Set(props)], ms:Math.max(0, ...ms) };
      });
      ok(reduced ? m.open === 0 && m.shut === 0 : m.open === 1 && m.shut === 1 && json(m.props.sort()) === json(['opacity', 'transform']) && m.ms > 0 && m.ms <= 250, `${reduced ? 'reduced motion: a move does not slide' : 'a move slides its card in, by transform and opacity only, in a quarter of a second at most'} (${json(m)})`);
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
}
