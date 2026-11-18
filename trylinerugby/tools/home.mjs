// The home (README, Home): the wordmark, My Team's box (its shirt, name, stars and league line, the games played as it and its last five
// results, Change | Add Your Team | Locker) and the Trophy Cabinet's strip on the left; five big boxes on the right, Continue | Match | Career
// | Skill Games | Settings, and the steps they open (Match's Quick Match | Competitions, Competitions by tier with their team lists, Skill
// Games, Settings); Continue picking up what is under way, or Play; the games-and-form record; the Make This My Team offer after an import;
// the Legends behind the Full Game; a Super Fan of My Team's club with the box in its colours (its shield, or a club's crest), and the fit
// of every state at 844x390, 667x375, 844x340, 667x320 and 568x320.   node tools/home.mjs   Exits 1 on any failure.
// GAME=/path/to/index.html HOME_PRINT=1 node tools/home.mjs prints section 0's fingerprint for that build and stops: how BASE was pinned.
// CLUB_RATED=off HOME_PRINT=1 node tools/home.mjs prints it with no club rated from PR #14's tables: the proof behind the last re-pin.
process.env.SEED ??= '61';
const { T, reseed, bot, LOCAL_ON, RERATE, LOCAL_CHILD, rerateProofs, ruckpickProof } = await import('./harness.mjs');
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resultsServe } from './results-serve.mjs';
const X = T.teams, D = T.debug, H = T.home, S = T.store, L = T.locker, I = T.importer, C = T.career, K = T.cups, $ = id => document.getElementById(id);
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } if (process.env.VERBOSE) console.log(cond ? 'ok  ' : 'FAIL', msg); };
const json = v => JSON.stringify(v);
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };

// 0. Nothing the home does moves a match: AI v AI, a tool's match (the balance tools' kind: the bot against the computer), an arcade
//    Quick Match, a championship match and the demo, seeded, against the build before the headlines (2e4829d). Run first.
const BASE = '1us0pm8 7yj4mb 42zhl6 bs1ooc 1tf14do';   // 1.6 (2026-11-14): the possession calls and the interception rules (src/calls.js) and the kick chase (src/chase.js) together, as the game ships, both acting everywhere on purpose; with CALLS='{"on":false}' CHASE='{"on":false}' this build gives BEFORE_CALLS_CHASE, b4a25d5's pin, exactly; with the chase off alone, WITH_CALLS; with the calls off alone, WITH_CHASE (each checked first, below)
/* BASE re-pinned for the owner's rerating (LOCAL, 14 Nov 2026: "rerate the lower clubs - farnham shouldnt be as high as they are"):
   Farnham and Haslemere, a step down, play three of these matches, so it moves to R_BASE. With LOCAL off (1.6) and with the rerating off
   (8089294) this build gives BASE exactly, LOCAL off the chain below too (each in a child: rerateProofs). */
const R_BASE = '1us0pm8 14nzmes 1ta0na2 a0w526 1tf14do';   // re-pinned at the ruck picker (1.10.1, RUCKPICK, src/duels.js): the tool's match, the arcade Quick Match and the championship match, where the bot plays your side's rucks, moved; AI v AI and the demo did not. With RUCKPICK='{"on":false}' this build gives BEFORE_RUCKPICK, 8fb3bc0's pin, exactly (checked first, in a child: ruckpickProof)
const BEFORE_RUCKPICK = '1us0pm8 1utlxki 18tlkfu 1skpr8k 1tf14do';   // 8fb3bc0 (1.10)
const WITH_CALLS = 'j0wk2h 7yj4mb 42zhl6 bs1ooc 1tf14do';   // the calls on and the chase off, wt/calls' pin (a032b3a): re-pinned for the possession calls and the interception rules (src/calls.js, 2026-11-13), which act everywhere on purpose (nobody intercepts out of the passer's hands, nobody down, retiring or offside plays the ball, and the calls count their tags)
const WITH_CHASE = '183xhzi 1jp0mme p4313q 1nkecxo yvtiy8';   // the chase on and the calls off, wt/chase's pin (fc90ec0): re-pinned for the kick chase (src/chase.js, 2026-11-13), which acts on every open-play kick on purpose, and again the same day for its react 0 (pace alone, the owner's choice: CHASE='{"react":0.2}' gives 98e11c8's 183xhzi 1jp0mme p4313q x92eko yvtiy8)
const BEFORE_CALLS_CHASE = '183xhzi 1jp0mme p4313q 319h47 yvtiy8';   // b4a25d5's pin, the calls and the chase both off: re-pinned for the knock-ons (src/knock.js, 2026-11-11), which act everywhere on purpose; with KNOCK='{"on":false}' (and the calls and the chase off) this build gives BEFORE_KNOCK, 20cbcaf's pin, exactly (checked first, below)
const BEFORE_KNOCK = '1fxxh0u pegg82 1efh8t2 1r7ihok gabcx7';   // re-pinned at the merge of pressure and the maul into wt/pr14int (2026-11-09), which together move AI v AI again on purpose; with PRESSURE='{"on":false}' MAUL='{"on":false}' this build gives 0b1293c's pin exactly, 1ux7bcz 1gqps57 1pw26gc lm4vs4 q2h33q; with MAUL off alone, pressure's, 1h04hlg 1phgpz9 1ke5vq7 7j2vuk 56loel; with PRESSURE off alone, the maul's, pqq94q 5nbfte pz8xha npkm5g 197j3jh. Pressure's note: re-pinned at pressure (PRESSURE, src/contact.js, 2026-11-09), which changes AI v AI and every match on purpose (the count, the spill, the egg's hops, a knock-on's beat); with PRESSURE='{"on":false}' this build gives the pin before it exactly, 1ux7bcz 1gqps57 1pw26gc lm4vs4 q2h33q. The maul's note: re-pinned at the maul (src/maul.js, 2026-11-09, as reviewed: never in the carrier's own in-goal or with a man from in front of the ball, a ringed tackler let go of a maul in the world, no Tackle into one once called): the CPU calls mauls in AI v AI, the tool's match, the arcade Quick Match, the championship match and the demo, so all five moved; with MAUL='{"on":false}' this build gives the pin before it exactly, 1ux7bcz 1gqps57 1pw26gc lm4vs4 q2h33q. Before that: re-pinned at the real order (src/ratings.js, CLUB_RATED, 2026-11-09): Farnham v Haslemere, the three Farnham matches, 61 v 46 (were 75 v 64); with CLUB_RATED=band this build gives the pin before it exactly, 1ux7bcz 6jcst0 jv4xeq 437myk q2h33q (AI v AI and the demo did not move). Before that: re-pinned at PR #14's club table (src/ratings.js, CLUB_RATED): Haslemere, the three Farnham matches' other side, is 64 (13), was 67 (14); with CLUB_RATED=off this build gives the pin before it exactly, 1ux7bcz 10kl4wv 1nh2ksp jmrs3q q2h33q. Before that: re-pinned at the PR #14 merge for its calmer passing (PASS_FLIGHT: the ball hangs longer and a catcher gets a moment): with PASS_FLIGHT='{"match":1,"kids":1,"grace":[0,0,0],"graceKids":0}' this build gives the old pin exactly, 12rapqh 14qny5b 1dars3e 5k7me2 1amrgpj. Before that: pinned from 2e4829d (GAME=<its index.html> HOME_PRINT=1); this build gives the same
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
  const CL = T.calls && T.calls.CALLS, CS = T.chase && T.chase.CHASE, CL0 = !!(CL && CL.on), CS0 = !!(CS && CS.on);   // the possession calls (src/calls.js) and the kick chase (src/chase.js): both off with the knock-ons (20cbcaf predates all three), both off, each alone, then as they were (CALLS= and CHASE= in the harness)
  const feats = (cl, cs) => { if (CL) CL.on = cl; if (CS) CS.on = cs; };
  if (T.knock && !LOCAL_ON && !process.env.HOME_PRINT) { T.knock.KNOCK.on = false; feats(false, false); const off = fingerprint(); T.knock.KNOCK.on = true; feats(CL0, CS0); ok(off === BEFORE_KNOCK, `with the knock-ons, the possession calls and the kick chase off (KNOCK, src/knock.js; CALLS, src/calls.js; CHASE, src/chase.js), as 20cbcaf (${off}, pinned ${BEFORE_KNOCK})`); }
  if ((CL || CS) && !LOCAL_ON && !process.env.HOME_PRINT) { feats(false, false); const off = fingerprint(); feats(CL0, CS0); ok(off === BEFORE_CALLS_CHASE, `with the possession calls and the kick chase off (CALLS, src/calls.js; CHASE, src/chase.js), as b4a25d5 (${off}, pinned ${BEFORE_CALLS_CHASE})`); }
  if (CL && CS && !LOCAL_ON && !process.env.HOME_PRINT) { feats(true, false); const calls = fingerprint(); feats(false, true); const chase = fingerprint(); feats(CL0, CS0);
    ok(calls === WITH_CALLS, `with the possession calls on and the kick chase off, as wt/calls (a032b3a) (${calls}, pinned ${WITH_CALLS})`);
    ok(chase === WITH_CHASE, `with the kick chase on and the possession calls off, as wt/chase (fc90ec0) (${chase}, pinned ${WITH_CHASE})`); }
  const now = fingerprint();
  if (process.env.HOME_PRINT || LOCAL_CHILD) { console.log(now); process.exit(failed ? 1 : 0); }   // the LOCAL children (rerateProofs) print theirs
  if (LOCAL_ON) await rerateProofs(new URL(import.meta.url), BASE, ok);
  if (RERATE) await ruckpickProof(new URL(import.meta.url), BEFORE_RUCKPICK, ok);
  const pin = RERATE ? R_BASE : BASE;
  ok(now === pin, `AI v AI, a tool's match, an arcade Quick Match, a championship match and the demo play exactly as before the headlines (seeded fingerprint ${now}, pinned ${pin})`);
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
for (const id of ['b-set', 'b-match', 'b-career', 'my-box', 'b-cabinet', 'b-my', 'my-form', 'my-nat', 'b-grown', 'ts-tab-team', 'ts-tab-game']) {   // the stand-in DOM keeps no attributes: these few remember theirs, for the words read out
  const e = $(id), at = {}; e.setAttribute = (k, v) => { at[k] = String(v); }; e.getAttribute = k => (k in at ? at[k] : null);
}
/* A new game on the web as shipped, the home on its four tiles. My Team's club is Farnham, set explicitly: since 1.10 a new game has no club
   (no default club, tools/links.mjs), so the pins below that mean "the club" set it as a fixture, and those about no club say so. */
const fresh = (club = 'FAR') => {
  S.setNative(null); S.setTier(null); S.setBought([]); S.setStarted(false); S.FAN_CLUBS[0].agreed = false; S.FAN_CLUBS[0].crest = null;
  if (!$('m-store').hidden) S.close();
  X.setChamp(null); K.set(null); K.setHistory([]); C.set(null); I.setLeague(null); X.restore({ custom:[] }); H.form.set([]); H.setTier(null);
  const s = D.settings(); s.last = null; s.myClub = club; s.myClubLegacy = false; s.myNat = null; s.cat = 'men'; s.kids = false; s.diff = 1; s.pick = [null, null];
  L.set(L.clean(null)); $('m-import').hidden = true; X.save(); D.goHome();
};

// 1. the markup: the left column (the wordmark, My Team's box, the Trophy Cabinet's strip), the five boxes, the steps, Title Case, no arrow
{
  const side = home.slice(home.indexOf('<div class="home-side"'), home.indexOf('<nav class="home-main"'));
  const boxes = [...home.slice(home.indexOf('id="home-main"'), home.indexOf('id="home-step"')).matchAll(/<button class="btn bx(?: bx-go)?" id="(b-[a-z]+)"(?: autofocus)?><svg viewBox="0 0 24 24" aria-hidden="true">[\s\S]*?<\/svg><span class="bx-text"><span class="bx-name"(?: id="cont-name")?>([^<]+)<\/span>/g)].map(m => [m[1], m[2]]);
  // 1.10 (the owner, 2026-11-16: "remove the main play quick game yellow button and just have the 4 ... Match ... change to Game", and Settings
  // as "game settings and team management"): the five boxes' pin, Continue | Match | Career | Skill Games | Settings, is now four tiles
  ok(json(boxes) === json([['b-match', 'Game'], ['b-career', 'Career'], ['b-drills', 'Skill Games'], ['b-set', 'Team and Settings']]), `the four tiles in order, each a drawn picture and a big word: Game | Career | Skill Games | Team and Settings (${boxes.map(b => b[1]).join(' | ')})`);
  ok(/<nav class="home-main" id="home-main" aria-label="Menu">\s*<button class="btn bx" id="b-match" autofocus>/.test(home) && /<span class="bx-name">Game<\/span><span class="bx-sub" id="game-note">Quick Match<\/span>/.test(home) && home.indexOf('id="home-main"') > home.indexOf('id="home-side"') && !/id="b-continue"|id="cont-note"|id="cont-name"|bx-go/.test(html + css + menus), 'Game first, focused before a line of script runs, with its one line (Quick Match); no yellow primary, Continue gone from the markup, the styles and the code; the tiles after My Team\'s column');
  ok(/\.home-main\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\);grid-template-rows:minmax\(0,1fr\) minmax\(0,1fr\);/.test(css) && /\.home-main \.btn\.bx\{display:flex;flex-direction:column;align-items:stretch;justify-content:space-between;gap:8px\}/.test(css) && /\.home-main \.btn\.bx \.bx-text:not\(:has\(\.bx-sub:not\(\[hidden\]\)\)\)::after\{content:"\\a0"/.test(css), 'two even rows of equal halves, Game | Career and Skill Games | Team and Settings, each tile\'s picture at its top and its word and note\'s line at its foot (the line kept with no note), so they stand level across a row');
  ok(/<button class="btn bx" id="b-career">[\s\S]*?<span class="bx-name">Career<\/span><span class="bx-sub" id="career-note" hidden><\/span>/.test(home) && /\.bx-sub:is\(#game-note,#career-note\)\{display:block;white-space:nowrap;overflow:hidden;text-overflow:clip\}/.test(css), 'Career, with its note while a career is saved; Game\'s and Career\'s notes one line each, never an ellipsis (homeNotesFit fits them)');
  ok(/<header class="mark" id="home-mark">\s*<h1 class="word" aria-label="Try Line"><span class="try">Try<\/span><span class="line">Line<span class="posts"><\/span><\/span><\/h1>\s*<div class="app-tools" id="app-tools" hidden>\s*<span id="offline-status" role="status" hidden>Offline Ready<\/span>\s*<button class="app-action" id="b-install" hidden>Install Game<\/button>\s*<span id="offline-update" role="status" hidden>Updating<\/span>\s*<\/div>\s*<\/header>/.test(side) && /\.home \.word\{flex:none;flex-direction:row;[^}]*font-size:58px/.test(css), 'the wordmark on one line at the top of My Team\'s column, big, with Offline Ready, Install Game and Updating beside it');
  ok(/<section class="my-box" id="my-box" aria-label="My Team" role="button" tabindex="0">\s*<div class="my-none" id="my-none" hidden><h2 class="my-none-t">My Team<\/h2><button class="btn primary my-pick" id="b-mypick">Pick Your Club<\/button><\/div>\s*<div class="my-marks" id="my-marks"><span class="my-fan" id="st-fan" hidden><\/span><\/div>\s*<div class="my-head">\s*<span class="my-shirt" id="my-shirt"><\/span>\s*<div class="my-id">\s*<h2 class="my-name" id="my-name"><\/h2>\s*<div class="my-line"><span id="my-stars"><\/span><span class="my-nat" id="my-nat"><\/span><\/div>\s*<span class="my-league" id="my-league"><\/span>\s*<\/div>\s*<\/div>\s*<div class="my-real" id="my-real" hidden><\/div>\s*<p class="my-sub" id="my-sub" hidden>Your Games<\/p>\s*<dl class="my-rec" id="my-rec"><\/dl>\s*<ol class="my-form" id="my-form" aria-label="Last Five Results"><\/ol>\s*<\/section>/.test(side), 'My Team\'s box, one button (role and tab stop: 1.10): with no club My Team and Pick Your Club alone; else a row for a tier\'s marks (the Super Fan badge), the shirt, the name, the stars and the country, the league line, the club\'s real result and Your Games (hidden with no results file: src/results.js, tools/results-game.mjs), the games played and the last five results, and nothing else');
  // 1.10: My Team's three buttons (#my-acts) and the Trophy Cabinet's strip left the home for Team and Settings' Team tab: one card of rows
  ok(!/my-acts/.test(html + css) && /<div class="hs-panel ts-team" id="ts-team" data-step="settings" role="tabpanel" aria-labelledby="ts-tab-team" hidden>\s*<div class="ts-list">\s*<div class="ts-row ts-my"><span class="ts-shirt" id="ts-shirt"><\/span><span class="ts-id"><b id="ts-name"><\/b><span id="ts-league"><\/span><\/span><button class="btn" id="b-my">Change<\/button><\/div>\s*<button class="btn ts-row im-home" id="b-import" hidden>Add Your Team<\/button>\s*<button class="btn ts-row lk-home" id="b-locker">Locker<\/button>\s*<button class="btn ts-row tc-strip" id="b-cabinet" hidden><span class="tc-name">Trophy Cabinet<\/span><span class="tc-list" id="tc-list"><\/span><\/button>\s*<\/div>\s*<\/div>/.test(home) && /\.ts-list\{display:flex;flex-direction:column;/.test(css) && /\.btn\.ts-row,\.ts-row\{[^}]*min-height:48px;[^}]*border-bottom:1px solid var\(--rule\)/.test(css), 'the Team tab: one card of divider rows, My Team (shirt, name, league, Change), Add Your Team, Locker and the Trophy Cabinet, each 48px');
  ok(!/<\/section>\s*<button class="btn tc-strip"/.test(side) && !side.includes('b-cabinet') && /\.my-box\{[^}]*flex:1 1 auto;/.test(css), 'the Trophy Cabinet is not on the home: My Team\'s box takes the whole column under the wordmark');
  ok(/<div class="hs-head" id="hs-head">\s*<button class="btn hs-back" id="hs-back" data-back>Back to Menu<\/button>\s*<h2 class="hs-title" id="hs-title">Game<\/h2>\s*<div class="seg ts-tabs" id="ts-tabs" role="tablist" aria-label="Team and Settings" hidden><button role="tab" id="ts-tab-team" data-tab="team" aria-selected="false" aria-controls="ts-team">Team<\/button><button role="tab" id="ts-tab-game" data-tab="game" aria-selected="true" aria-controls="hp-settings">Game<\/button><\/div>\s*<\/div>/.test(home), 'a step: Back (the controller\'s B too) and its title along the top; Team and Settings\' tabs, Team | Game, there in the title\'s place');
  const steps = [...home.matchAll(/<div class="hs-panel hp-([a-z]+)[^"]*" id="hp-\1" data-step="\1"(?: role="tabpanel" aria-labelledby="ts-tab-game")? hidden>/g)].map(m => m[1]);
  ok(json(steps) === json(['match', 'champ', 'drills', 'settings']) && json(steps) === json(Object.keys(H.STEPS)) && /id="hp-settings" data-step="settings" role="tabpanel" aria-labelledby="ts-tab-game" hidden>/.test(home), `four steps, each hidden until opened: ${steps.join(', ')} (Team and Settings' Game tab is the settings step's own panel)`);
  ok(/<div class="hs-panel hp-match" id="hp-match" data-step="match" hidden>\s*<button class="btn primary hm-go" id="b-gcont" hidden>Continue Championship<\/button>\s*<button class="btn bx" id="b-quick">[\s\S]*?<span class="bx-name">Quick Match<\/span><\/span><\/button>\s*<button class="btn bx" id="b-comps">[\s\S]*?<span class="bx-name">Competitions<\/span><\/span><\/button>\s*<\/div>/.test(home) && /\.hp-match\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(css), 'Game: two big boxes, Quick Match | Competitions, in halves, Continue Championship over them (hidden until one is saved)');
  ok(!/id="b-two"|2 Players|Two Player/.test(home) && !/\$\('b-two'\)/.test(menus) && /^function openJoin\(\) \{/m.test(menus) && typeof D.openJoin === 'function', '2 Players has left the home on every device: no button, no listener; Two Player keeps its way in, openJoin (window.__tryline.debug.openJoin)');
  ok(/<div class="hs-panel hp-champ" id="hp-champ" data-step="champ" hidden>\s*<div class="hl-go" id="hc-go" hidden>\s*<button class="btn primary" id="b-champ">Continue Championship<\/button>\s*<p class="resume-note" id="champ-note" hidden><\/p>\s*<button class="btn" id="hc-fresh">New Championship<\/button>\s*<\/div>\s*<div class="hc-new" id="hc-new">\s*<div class="seg" id="hc-tier"><\/div>\s*<div class="hc-comps" id="hc-comps"><\/div>\s*<\/div>\s*<\/div>/.test(home), 'Competitions: Continue Championship (when one is saved) first, New Championship under it, else the tiers and their competitions');
  const drills = [...home.matchAll(/<button class="btn drill" id="pr-([a-z]+)">/g)].map(m => m[1]);
  ok(json(drills) === json(T.drills.DRILLS.map(d => d.id)) && /<button class="btn drill" id="pr-defend">[\s\S]*?<\/button>\s*<button class="btn drill" id="b-help"><span class="dc-icon" aria-hidden="true"><svg viewBox="0 0 40 40">[\s\S]*?<\/svg><\/span><span class="dc-name">How to Play<\/span><\/button>\s*<\/div>\s*<div class="pr-low">\s*<div class="pr-contact" id="pr-contact">[\s\S]*?id="pr-back"[\s\S]*?<\/div>\s*<\/div>\s*<button class="btn drill pr-grown" id="pr-grown">/.test(home) && /\.hp-drills \.drills\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/.test(css), `Skill Games: every game in its picture (${drills.join(', ')}), How to Play, then the contact games and For Grown-Ups, in rows of four`);
  const sets = [...home.matchAll(/<div class="set(?: set-[a-z]+)?"(?: id="[a-z-]+")?><span class="lbl">([^<]+)<\/span><div class="seg" data-key="([a-z]+)"/g)].map(m => m[1] + ':' + m[2]);
  ok(json(sets) === json(['Difficulty:diff', 'Sound:sound', 'Match Help:hints', 'Half Length:half', 'Camera:cam']) && /data-key="diff">[\s\S]*?<\/div><\/div>\s*<div class="set set-age"><span class="lbl" id="set-age-l">Age Group<\/span><div class="seg" id="set-age" role="group" aria-labelledby="set-age-l"><\/div><\/div>\s*<div class="set set-gender"><span class="lbl" id="set-gender-l">Gender<\/span><div class="seg" id="set-gender" role="group" aria-labelledby="set-gender-l"><\/div><\/div>\s*<div class="set set-sound">/.test(home) && /data-key="hints"[^>]*><button>On<\/button><button>Off<\/button><\/div><\/div>\s*<button class="btn" id="b-grown" hidden>Grown-Ups<\/button>\s*<div class="set set-half">/.test(home) && /data-key="cam"><button>Top<\/button><button>Low<\/button><button>Mid<\/button><button>High<\/button><\/div><\/div>\s*<p class="ver" id="ver">Version 1\.10\.1<\/p>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/section>/.test(home)
    && /\.hp-settings\.settings\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/.test(css) && /\.hp-settings \.set\{grid-template-columns:1fr;gap:4px;grid-column:span 3\}/.test(css) && /\.hp-settings \.set-diff\{grid-column:1\/-1\}/.test(css) && /\.hp-settings\.grown \.set-sound,\.hp-settings\.grown \.set-hints,\.hp-settings #b-grown\{grid-column:span 2\}/.test(css)
    && /\.hp-settings\.settings \.set-cam,\.hp-settings\.settings \.ver\{grid-row:4;grid-column:4\/-1\}/.test(css),
    `Settings: ${sets.join(', ')}; Difficulty across, Age Group | Gender (the profile's, src/profile.js), Sound | Match Help, Half Length | Camera in halves, and Grown-Ups (where the store is live) a third of Sound's row, after Match Help; the game's version at its foot, on the fourth row's label line`);
  const text = s => s.replace(/<[^>]+>/g, '').trim();
  const labels = [...home.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map(m => text(m[1])).filter(Boolean).concat([...home.matchAll(/<span class="(?:lbl|bx-name|tc-name)">([^<]+)<\/span>/g)].map(m => m[1]), [...home.matchAll(/<h2 class="hs-title"[^>]*>([^<]+)<\/h2>/g)].map(m => m[1]), Object.values(H.STEPS).flatMap(st => [st.title, st.back]));
  ok(labels.length >= 40 && labels.every(titled), `every label on the home is Title Case, every step's title and Back too (${labels.filter(l => !titled(l)).join(', ') || labels.length + ' labels'})`);
  ok(!/[←-⇿▲-◅—]|<summary|<details/.test(home + menus.slice(menus.indexOf('/* home.'), menus.indexOf('/* two player'))), 'no arrow glyph, no em dash and no disclosure on the home');
  ok(!/id="t-comp"|id="s-practice"|id="b-more"|id="b-practice"|class="row2 home-row"|class="row2 learn-row"/.test(html), 'the old rows are gone: no competition row on the team screen, no Training Ground screen, no More Settings');
  ok((home.match(/role="tablist"/g) || []).length === 1 && /id="ts-tabs" role="tablist"/.test(home) && !/id="hl-bar"|class="btn hl"|id="home-top"|id="hl-panels"|id="hp-game"|id="hp-career"|id="my-kits"|id="home-tag"/.test(home) && !/HOME_HL|homeSelect|'hl-'/.test(menus) && !/\.hl-bar\{|\.btn\.hl\{|\.home-top\{/.test(css), 'the headlines are gone: no bar along the bottom, no top row, no Quick Match or Career panel, no headline kept (the one tablist is Team and Settings\' Team | Game, 1.10)');
  const code = menus + fs.readFileSync(new URL('../src/import.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../src/practice.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../src/ui-store.js', import.meta.url), 'utf8');
  ok(!/Training Drills|Training Ground|Import Data|Import Club|Back to Training|Skills Mini Games/.test(html) && !/'Import Club'|'Back to Training'|Training Drills|Import Data|Skills Mini Games/.test(code), 'the old names are gone from the markup and the screens\' code: Training Drills, Training Ground, Import Data, Import Club, Back to Training, and Skills Mini Games (now Skill Games); Game is back, the owner\'s name for Match since 1.10 ("Match ... change to Game")');
  ok($('pr-eyebrow').textContent === 'Skill Games' || /id="pr-eyebrow">Skill Games</.test(html), 'a drill\'s card reads Skill Games over its name');
}

// 2. the steps: one at a time in the home's place, Back to where they came from, an old save's headline dropped, Continue's last
{
  fresh();
  ok(H.step() === null && !$('home-main').hidden && !$('home-side').hidden && $('home-step').hidden && Object.keys(H.STEPS).every(k => $('hp-' + k).hidden), 'a new game opens on the five boxes and My Team\'s column, no step');
  for (const [box, k, title, back] of [['b-match', 'match', 'Game', 'Back to Menu'], ['b-drills', 'drills', 'Skill Games', 'Back to Menu'], ['b-set', 'settings', 'Team and Settings', 'Back to Menu']]) {
    D.goHome(); $(box).click();
    ok(H.step() === k && !$('hp-' + k).hidden && Object.keys(H.STEPS).filter(o => o !== k).every(o => $('hp-' + o).hidden) && $('home-main').hidden && $('home-side').hidden && !$('home-step').hidden && $('hs-title').textContent === title && $('hs-back').textContent === back, `${title}: its step in the home's place, the boxes and My Team's column put away, titled ${title}, ${back}`);
    $('hs-back').click();
    ok(H.step() === null && !$('home-main').hidden && $('home-step').hidden, `${back} comes back to the four tiles`);
  }
  // Team and Settings (1.10, the owner's "game settings and team management"): two tabs, Team | Game, in the step's top bar
  $('b-set').click();
  ok(H.step() === 'settings' && H.tab() === 'game' && !$('ts-tabs').hidden && $('hs-title').hidden && !$('hp-settings').hidden && $('ts-team').hidden && $('ts-tab-game').getAttribute('aria-selected') === 'true' && $('ts-tab-team').getAttribute('aria-selected') === 'false', 'the tile opens Team and Settings on its Game tab: Team | Game in the title\'s place, the settings as they were');
  $('ts-tab-team').click();
  ok(H.tab() === 'team' && !$('ts-team').hidden && $('hp-settings').hidden && $('ts-tab-team').getAttribute('aria-selected') === 'true' && $('ts-tab-game').getAttribute('aria-selected') === 'false' && H.step() === 'settings', 'Team: its own panel (My Team, Add Your Team, Locker, the Trophy Cabinet), the Game tab\'s put away');
  $('ts-tab-game').click(); ok(H.tab() === 'game' && !$('hp-settings').hidden && $('ts-team').hidden, 'and Game again');
  $('hs-back').click(); ok(H.step() === null && $('home-step').hidden && $('ts-tabs').hidden, 'Back to Menu: the tiles, the tabs put away with the step');
  $('b-match').click(); ok($('ts-tabs').hidden && !$('hs-title').hidden, 'no other step has the tabs: its title as ever'); D.goHome();
  $('my-box').click(); ok(H.step() === 'settings' && H.tab() === 'team' && !$('ts-team').hidden, 'My Team\'s box opens Team and Settings on its Team tab');
  $('s-home').fire('keydown', { key:'Escape' }); ok(H.step() === null, 'Escape is its Back');
  $('my-box').fire('keydown', { key:'Enter', target:$('my-box') }); ok(H.step() === 'settings' && H.tab() === 'team', 'Enter on the box, as on a button'); D.goHome();
  $('b-match').click(); $('b-comps').click();
  ok(H.step() === 'champ' && $('hs-title').textContent === 'Competitions' && $('hs-back').textContent === 'Back to Game', 'Competitions is Game\'s second step, Back to Game');
  $('hs-back').click(); ok(H.step() === 'match', 'Back to Game goes to Game');
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
  D.goHome($('b-grown')); ok(H.step() === 'settings' && H.tab() === 'game', 'Grown-Ups\' is Team and Settings, on its Game tab');
  D.goHome($('b-my')); ok(H.step() === 'settings' && H.tab() === 'team' && !$('ts-team').hidden && $('hp-settings').hidden, 'and My Team\'s Change is Team and Settings, on its Team tab (1.10: My Profile\'s and My Team\'s pickers come back there)');
  for (const id of ['b-locker', 'b-cabinet', 'b-import']) { D.goHome($(id)); ok(H.step() === 'settings' && H.tab() === 'team', `${id}'s is the Team tab too`); }
  H.show('champ'); ok(H.step() === 'champ' && shown() === 's-home', 'the home on Competitions (New Championship, a cup put away)');
  D.goHome();
  ok(H.first() === $('b-match') && /DEFAULT_FOCUS\['s-home'\] = homeFirst;/.test(menus), 'the focus and a controller\'s first press: Game, the first tile (measured in the browser part)');
  fresh();
  X.restore({ settings:{ hl:'settings', sound:false } });
  ok(!('hl' in D.settings()) && D.settings().sound === false && (D.goHome(), H.step() === null), 'an old save\'s headline (hl) is dropped and the rest kept: the home opens on its four tiles');
  X.save(); ok(!('hl' in saved().settings), 'and the save no longer writes one');
  for (const v of ['champ', 'career']) { X.restore({ settings:{ last:v } }); ok(D.settings().last === v, `the one played last, ${v}, read back (kept in the save since Continue left the home, 1.10)`); }
  X.restore({ settings:{ last:'nope' } }); ok(D.settings().last === 'career', 'an unknown one is ignored');
  X.restore({ settings:{ last:3 } }); ok(D.settings().last === 'career', 'and one of the wrong type');
  fresh();
}

// 3. every button goes where it did
{
  fresh();
  $('b-match').click(); $('b-quick').click();
  ok(shown() === 's-teams' && D.pickMode() === 'quick' && $('t-title').textContent === 'Pick Your Team' && $('t-eyebrow').textContent === 'Quick Match' && !T.picker.state().sides[0].set, 'Game, Quick Match: Pick Your Team, nothing set for you');
  $('t-back').click(); ok(shown() === 's-home' && H.step() === 'match', 'its Back to Menu comes back to Game');
  D.goHome(); $('b-match').click();
  ok(shown() === 's-home' && H.step() === 'match', 'Game with nothing saved (1.10, Play\'s place): its step, Quick Match first (its focus measured in the browser part)');
  $('hs-back').click(); ok(shown() === 's-home' && H.step() === null, 'its Back to Menu comes back to the tiles');
  D.goHome(); D.openJoin(); ok(shown() === 's-join', 'Two Player\'s own entry, openJoin, still opens the join screen'); $('j-back').click();
  $('b-drills').click();
  T.drills.DRILLS.forEach(d => { $('pr-' + d.id).click(); ok(T.drills.state() && T.drills.state().id === d.id, `${d.name} starts its drill`); T.practice.choose(); ok(shown() === 's-home' && H.step() === 'drills', `Back to Skill Games after ${d.name}: the home, on Skill Games`); });
  $('b-help').click(); ok(shown() === 's-help', 'How to Play opens its screen'); $('h-back').click(); ok(shown() === 's-home' && H.step() === 'drills', 'and comes back to Skill Games');
  D.goHome();
  $('b-locker').click(); ok(shown() === 's-locker', 'the Locker, on Team and Settings\' Team tab, opens'); $('lk-back').click(); ok(shown() === 's-home' && H.step() === 'settings' && H.tab() === 'team', 'and comes back to the Team tab');
  $('b-my').click(); ok(shown() === 's-profile', 'Change opens My Profile (src/profile.js, tools/profile.mjs)'); $('pf-team').click(); ok(shown() === 's-teams' && D.pickMode() === 'my', 'and My Team\'s picker one press on'); $('t-back').click(); ok(shown() === 's-profile', 'its Back comes back there'); $('pf-back').click(); ok(shown() === 's-home' && H.step() === 'settings' && H.tab() === 'team', 'and Back to Menu to Team and Settings\' Team tab, where Change is');
  $('b-career').click(); ok(shown() === 's-career-new', 'Career with none under way: New Player'); D.goHome();
  $('b-set').click();
  const seg = k => [...document.querySelectorAll('.seg[data-key]')].find(g => g.dataset.key === k);
  ok(['diff', 'sound', 'hints', 'half'].every(seg), 'Settings carries Difficulty, Sound, Match Help and Half Length');
  seg('half').children[1].click(); ok(D.settings().half === 1 && saved().settings.half === 1, 'Half Length is pressed straight from Settings');   // the stand-in segs have two buttons each
  seg('half').children[0].click(); seg('sound').children[1].click(); ok(D.settings().sound === false, 'Sound');
  seg('sound').children[0].click(); seg('hints').children[1].click(); ok(D.settings().hints === false && D.settings().coach === false, 'Match Help, the hints and the coach together');
  seg('hints').children[0].click(); seg('diff').children[0].click(); ok(D.settings().kids === true && D.settings().diff === 0, 'Difficulty: Kids');
  { const was = T.profile.get().age; T.profile.get().age = 'mini';
    seg('diff').children[1].click(); ok(!T.kids.gate() && !!T.kids.minis.open() && D.settings().kids === true, 'Easy from Kids for a Mini: Leave Minis? first, never the grown-up check (the owner, 2026-11-14)');
    $('mn-keep').click(); ok(!T.kids.minis.open() && D.settings().kids === true, 'Keep Minis: still Kids');
    T.profile.get().age = was === 'mini' ? null : was; }
  seg('diff').children[1].click(); ok(!T.kids.gate() && !T.kids.minis.open(), 'Easy from Kids for anyone else: at once, nothing asked (the owner, 2026-11-14: "remove the calculation for anybody")');
  ok(D.settings().kids === false && D.settings().diff === 0, 'Easy');
  ok(H.step() === 'settings', 'Settings stays open as each is pressed');
  D.settings().diff = 1;
  ok($('b-grown').hidden && !$('hp-settings').classList.contains('grown'), 'no Grown-Ups on the web as shipped');
  S.setNative(true); S.setStarted(true); D.goHome(); $('b-set').click();
  ok(!$('b-grown').hidden && $('hp-settings').classList.contains('grown'), 'in the app Grown-Ups shares Sound and Match Help\'s row');
  $('b-grown').click(); ok(!$('m-store').hidden && S.ui().mode === 'grown', 'and opens the Grown-Ups panel, as it did'); S.close();
  const s = D.settings(); s.kids = true; s.diff = 0; s.kidsR = 1; s.kidsTop = 9; D.goHome();
  ok(T.kids.ready() && $('b-grown').classList.contains('note') && $('b-set').classList.contains('note') && $('b-set').getAttribute('aria-label') === 'Team and Settings, a suggestion waiting', 'Move Up to Easy waiting: its dot on Grown-Ups and on the Team and Settings tile, read out');
  s.kids = false; s.diff = 1; s.kidsR = 0; s.kidsTop = 0; D.goHome();
  ok(!$('b-set').classList.contains('note'), 'and gone with it');
  L.set(L.clean({ n:{ hat:10, sharp:10 } })); D.goHome();
  ok(L.isNew() && $('b-locker').classList.contains('note') && $('b-set').classList.contains('note') && $('b-set').getAttribute('aria-label') === 'Team and Settings, a new medal', 'a new medal in the Locker (1.10): its dot on Locker and on the Team and Settings tile, read out');
  L.set(L.clean(null)); D.goHome(); ok(!$('b-set').classList.contains('note') && $('b-set').getAttribute('aria-label') === 'Team and Settings', 'and gone with it');
  fresh();
}

// 4. the gates: every paid entry keeps its Full Game gate and lock; Quick Match, Skill Games, Settings, the Locker and My Team stay free
{
  fresh(); S.setTier('free'); D.goHome();
  ok(['b-comps', 'b-career', 'b-gcont'].every(id => $(id).classList.contains('locked')) && ['b-match', 'b-drills', 'b-set', 'b-quick', 'b-my', 'b-locker', 'b-help'].every(id => !$(id).classList.contains('locked')) && !/id="b-two"/.test(html), 'free: Competitions and Career locked; Game, Quick Match, Skill Games, Team and Settings, My Team\'s Change and the Locker not (and no 2 Players to lock)');
  ok($('b-import').classList.contains('locked'), 'Add Your Team locked: it is the Super Fan\'s');
  ok(/if \(seg && seg\.children\[3\]\) storeMark\(seg\.children\[3\], 'hard'\);/.test(fs.readFileSync(new URL('../src/ui-store.js', import.meta.url), 'utf8')) && /if \(key === 'diff' && i === 3 && !storeGate\('hard'/.test(menus), 'Hard keeps its lock and its gate in Settings');
  $('b-match').click(); $('b-comps').click(); ok(H.step() === 'champ' && $('m-store').hidden, 'Competitions opens its step, each competition locked in it');
  H.champPick('eng'); ok(!$('m-store').hidden && S.ui().feature === 'champ' && shown() === 's-home', 'a competition opens the Unlock card, not the team screen'); S.close();
  $('b-career').click(); ok(!$('m-store').hidden && S.ui().feature === 'career', 'Career opens the Unlock card'); S.close();
  $('b-import').click(); ok(!$('m-store').hidden && S.ui().feature === 'import' && $('m-import').hidden && $('st-title').textContent === 'Add Your Team', 'Add Your Team opens the Unlock card, named Add Your Team'); S.close();
  $('b-quick').click(); ok($('m-store').hidden && shown() === 's-teams', 'Quick Match is free'); D.goHome();
  $('b-match').click(); ok($('m-store').hidden && shown() === 's-home' && H.step() === 'match', 'Game is free (Play\'s place, 1.10)'); D.goHome();
  $('b-my').click(); $('pf-team').click(); ok($('m-store').hidden && shown() === 's-teams' && D.pickMode() === 'my', 'My Team is free (My Profile, then its picker)'); D.goHome();
  $('b-locker').click(); ok($('m-store').hidden && shown() === 's-locker', 'the Locker is free'); D.goHome();
  $('pr-cones').click(); ok($('m-store').hidden && T.drills.state(), 'a drill is free'); T.practice.choose();
  X.newChamp(X.NATIONS[0], X.NATIONS.slice(1, 6)); D.goHome();
  ok(!$('b-match').classList.contains('locked') && /^Continue · Round 1 v /.test($('game-note').textContent), 'a championship under way on the free tier: Game\'s note keeps its line, Game itself free (Quick Match is)');
  $('b-match').click(); ok(H.step() === 'match' && !$('b-gcont').hidden && $('b-gcont').classList.contains('locked') && $('b-champ').classList.contains('locked') && H.first() === $('b-gcont') && $('m-store').hidden, 'Game opens its step with Continue Championship on top, locked, the focus on it');
  $('b-gcont').click(); ok(!$('m-store').hidden && S.ui().feature === 'champ' && X.champ(), 'and it opens the Unlock card, the championship kept'); S.close(); D.goHome();
  X.setChamp(null); C.start({ name:'Sam', pos:'B', num:7, club:X.CLUBS[0] }); D.goHome();
  ok($('b-career').classList.contains('locked') && /^Continue · /.test($('career-note').textContent), 'a career likewise: Career locked, its note kept'); $('b-career').click(); ok(!$('m-store').hidden && S.ui().feature === 'career', 'its Unlock card'); S.close();
  C.set(null); S.setTier(null); D.goHome();
  ok(['b-comps', 'b-career', 'b-import', 'b-champ'].every(id => !$(id).classList.contains('locked')), 'the web as shipped (STORE_WEB_TIER full): no lock anywhere');
  fresh();
}

// 5. Competitions: Continue first, the tiers and their competitions, each with only its sides, and the Trophy Cabinet
{
  fresh(); H.setTier(0); H.open('champ');
  const comps = t => H.comps(t).map(c => c[0]).join();
  ok(comps(0) === 'int,world,tour' && H.comps(0).map(c => c[1]).join() === 'Championship,World Cup,Home Nations Tour', 'International: Championship, World Cup, Home Nations Tour');
  ok(comps(1) === 'eng,en2,fra,cel,sco,rsa,aus,nzl,jpn' && H.comps(1).map(c => c[1]).join() === X.TEAM_LISTS.filter(l => l.tier === 1).map(l => l.name).join(), 'National: each country\'s league');
  // re-pinned for the county clubs (LOCAL, the owner's layout, 14 Nov: Build): your county | Other County | My League (tools/local.mjs has the rest)
  ok(comps(2) === 'sur,county' && H.comps(2).map(c => c[1]).join() === 'Surrey,Other County', 'Local: My Team\'s county (Farnham: Surrey) and Other County, and no My League without an import');
  ok(['eng', 'fra', 'cel', 'rsa'].every(K.euroLeague) && !['en2', 'sco', 'aus', 'nzl', 'jpn', 'sur', 'cty', 'my', 'int'].some(K.euroLeague), 'the European Cup\'s trophy on the four leagues whose winner goes on to it');
  H.setTier(1); H.champ();
  ok(/id="hc-eng" data-comp="eng"><span class="cup-trophy" data-kind="euro" data-metal="gold" role="img" aria-label="European Cup"><\/span><span>England<\/span>/.test($('hc-comps').innerHTML) && /id="hc-sco" data-comp="sco"><span>Scotland<\/span>/.test($('hc-comps').innerHTML) && /id="hc-en2" data-comp="en2"><span>England 2<\/span>/.test($('hc-comps').innerHTML) && $('hc-comps').className === 'hc-comps n9' && /\.hc-comps\.n9\{grid-template-columns:repeat\(20,minmax\(0,1fr\)\)\}\s*\.hc-comps\.n9 > \.btn\{grid-column:span 5\}\s*\.hc-comps\.n9 > \.btn:nth-child\(n\+5\)\{grid-column:span 4\}/.test(css), 'each a big button, the European Cup\'s trophy on its four, National\'s nine in two rows (four then five, each row in equal parts)');
  ok(/id="hc-cel" data-comp="cel"><span class="cup-trophy" data-kind="euro" data-metal="gold" role="img" aria-label="European Cup"><\/span><span>United Rugby Championship<\/span>/.test($('hc-comps').innerHTML) && /class="btn hc-comp long" id="hc-cel"/.test($('hc-comps').innerHTML) && ($('hc-comps').innerHTML.match(/ long"/g) || []).length === 1, 'the United Rugby Championship by its name, with the European Cup\'s trophy, the one long name (its lock goes in the corner)');
  ok(!$('hc-new').hidden && $('hc-go').hidden && $('b-cabinet').hidden, 'nothing saved: the competitions, and no Trophy Cabinet before a season is finished');
  H.setTier(null); D.goHome(); H.open('champ');
  ok(H.tier() === 2, 'the tier on show starts on My Team\'s (Farnham: Local)');
  // each competition's team screen: only its sides, and Back comes back to it
  const P = T.picker, comp = () => P.view(0).ladder[0], cards = () => comp().teams.length, panel = () => $('t-side0').innerHTML;
  const plays = l => (T.local ? T.local.listPlays(l) : l.teams);   // a list's own sides (LOCAL: Surrey's without Aldershot, shown under Hampshire)
  for (const l of X.TEAM_LISTS.filter(l => l.tier > 0 && l.key !== 'cty')) {   // Counties (a saved key) is Surrey's now: below
    H.setTier(l.tier); H.open('champ'); H.champPick(l.key);
    ok(shown() === 's-teams' && D.pickMode() === 'champ' && K.comp() === 'league' && X.teamPool() === l.key && P.one() && P.view(0).ladder.map(g => g.key).join() === 'comp,mine.made' && cards() === plays(l).length && plays(l).every(t => comp().teams.includes(t)) && $('t-eyebrow').textContent === 'Championship' && comp().name === l.name && P.where(comp()) === X.TEAM_TIERS[l.tier], `${l.name}: its ${plays(l).length} sides only, one side, ${X.TEAM_TIERS[l.tier]} over ${l.name}`);
    $('t-back').click(); ok(shown() === 's-home' && H.step() === 'champ', `${l.name}: Back to Menu comes back to Competitions`);
  }
  H.setTier(2); H.open('champ'); H.champPick('cty');
  ok(X.teamPool() === 'sur' && comp().name === 'Surrey' && X.COUNTIES.every(t => comp().teams.includes(t)), 'a Counties championship (a saved key) opens Surrey\'s, which has its sides'); D.goHome();
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
  // New Championship under Continue (the owner, 15 Nov 2026): one with matches left asks again, then the competitions; nothing kept
  X.newChamp(X.NATIONS[0], X.NATIONS.slice(1, 6)); D.goHome(); H.open('champ');
  ok(!$('hc-go').hidden && $('hc-fresh').textContent === 'New Championship', 'a championship under way: New Championship under Continue');
  $('hc-fresh').click();
  ok(X.champ() !== null && /^(Tap|Press) Again to Start New$/.test($('hc-fresh').textContent) && H.step() === 'champ' && $('hc-new').hidden, `its first tap asks again and keeps the championship (${$('hc-fresh').textContent})`);
  D.goHome(); H.open('champ'); ok($('hc-fresh').textContent === 'New Championship', 'leaving the step disarms it');
  $('hc-fresh').click(); $('hc-fresh').click();
  ok(X.champ() === null && shown() === 's-home' && H.step() === 'champ' && !$('hc-new').hidden && $('hc-go').hidden && $('b-cabinet').hidden, 'the second: the championship gone, the competitions shown, nothing in the Trophy Cabinet');
  K.set(K.cupNew('world', { user:X.natList('men')[4], cat:'men' })); D.goHome(); H.open('champ');
  $('hc-fresh').click(); ok(K.get() !== null && /Again to Start New$/.test($('hc-fresh').textContent), 'a cup under way asks again too');
  $('hc-fresh').click(); ok(K.get() === null && !$('hc-new').hidden && H.step() === 'champ', 'and goes on the second');
  { X.newChamp(X.NATIONS[0], X.NATIONS.slice(1, 6)); const c = X.champ(), u = c.user; for (let i = 0; i < 5; i++) { c.results.push(c.fixtures[i].map(p => ({ h:p[0], a:p[1], hs:p[0] === u ? 30 : p[1] === u ? 0 : 10, as:p[1] === u ? 30 : p[0] === u ? 0 : 10, ht:3, at:1 }))); c.round++; } X.save(); X.setChamp(null); X.save(); }
  D.goHome(); ok(K.history().length === 1 && !$('b-cabinet').hidden, 'a season won: the Trophy Cabinet\'s row on Team and Settings\' Team tab (1.10)');
  ok(/data-kind="league" data-metal="silver"/.test($('tc-list').innerHTML) && /<\/span>1<span class="tc-w">&nbsp;Title<\/span>/.test($('tc-list').innerHTML) && /data-kind="triple" data-metal="silver"/.test($('tc-list').innerHTML) && $('b-cabinet').getAttribute('aria-label') === 'Trophy Cabinet: 1 Title, 1 Triple Crown', `each trophy in its shape and metal, and its count: England's Six Nations won, 1 Title and 1 Triple Crown (${$('b-cabinet').getAttribute('aria-label')})`);
  $('b-cabinet').click(); ok(shown() === 's-cabinet' && /England/.test($('home-history').innerHTML), 'the row opens the Trophy Cabinet on its own screen');
  $('cab-back').click(); ok(shown() === 's-home' && H.step() === 'settings' && H.tab() === 'team', 'and Back to Team comes back to the Team tab, where its row is');
  K.set(K.cupNew('world', { user:X.natList('men')[4], cat:'men' })); D.goHome(); H.open('champ');
  ok(!$('hc-go').hidden && $('hc-new').hidden && /data-kind="world"[\s\S]*World Cup · <\/span>Pool [ABCD]$/.test($('champ-note').innerHTML) && $('b-champ').textContent === 'Continue Championship', 'a cup under way: Continue Championship, its note the cup');
  $('b-champ').click(); ok(shown() === 's-cup', 'which goes to the cup');
  K.set(null);
  // My League: Local, with an import
  I.setLeague({ teams:X.CLUBS.slice(1, 6).map(t => ({ ...t, key:'lg-' + t.id })) }); D.goHome(); H.setTier(2); H.open('champ');
  ok(comps(2) === 'sur,county,my' && /id="hc-my" data-comp="my"><span>My League<\/span>/.test($('hc-comps').innerHTML), 'with an import, My League beside Surrey and Other County');
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

// 5b. Game's and Career's notes (1.10: Continue left the home, the owner's "remove the main play quick game yellow button"): Game's note is
//     Quick Match, or Continue and what a press there picks up while a championship or a cup is saved; Career's, while a career is saved
{
  fresh();
  ok(H.under() === null && $('game-note').textContent === 'Quick Match' && !$('game-note').hidden && $('career-note').hidden && $('b-match').getAttribute('aria-label') === 'Game, Quick Match' && $('b-career').getAttribute('aria-label') === 'Career', 'nothing saved: Game\'s note Quick Match, read with its name; no note on Career');
  // Play's pre-fill went with the primary: Quick Match keeps each side's last pick, so Kick Off is a press away as Play made it
  const P = T.picker;
  ok(typeof H.playOpen === 'undefined' && !/pickPlay|play:true|b-continue/.test(menus), 'Play (the yellow primary) and its pre-fill are gone from the code');
  D.settings().pick = [{ id:'FAR', cat:'men', g:'sur' }, { id:'GLO', cat:'men', g:'eng' }]; D.goHome(); $('b-match').click(); $('b-quick').click();
  ok(shown() === 's-teams' && D.pickMode() === 'quick' && P.view(0).team.id === 'FAR' && P.state().sides[0].set && P.view(1).team.id === 'GLO' && P.state().sides[1].set && $('t-go').textContent === 'Kick Off', 'Quick Match: the last picks set again, Farnham and Gloucester, Kick Off one press away');
  const demo = T.M;
  ok(T.M === demo && T.M.demo, 'nothing started until Kick Off');
  $('t-go').click(); ok(shown() !== 's-teams' && !T.M.demo && T.M.nat[0].id === 'FAR', 'Kick Off plays it'); D.exitMatch();
  fresh();
  // a championship, a cup, a career
  X.newChamp(X.CLUBS[0], X.CLUBS.slice(1, 6)); D.goHome();
  const opp = X.champ().teams[(p => (p[0] === X.champ().user ? p[1] : p[0]))(X.champ().fixtures[0].find(p => p.includes(X.champ().user)))];
  ok(H.under() === 'champ' && $('game-note').textContent === 'Continue · Round 1 v ' + opp.name && $('game-note').dataset.fix === 'Round 1 v ' + opp.name && $('b-match').getAttribute('aria-label') === 'Game, Continue · Round 1 v ' + opp.name, `a championship: Game's note Continue · Round 1 v ${opp.name}, read with its name (${$('game-note').textContent})`);
  ok(H.contLine('champ') === 'Championship · Round 1 v ' + opp.name, 'what is under way, in full (the tools\' line): Championship · Round 1 v ' + opp.name);
  ok(H.chunks('Quick Match') === '<span class="nw">Quick Match</span>' && H.chunks('Career · Transfer Window') === '<span class="nw">Career ·</span> <span class="nw">Transfer Window</span>' && H.chunks('World Cup · Pool A v <b>') === '<span class="nw">World Cup ·</span> <span class="nw">Pool A</span> <span class="nw">v &lt;b&gt;</span>' && H.chunks('v France') === '<span class="nw">v France</span>', 'the parts: a line without a fixture is one or two, a name escaped');
  $('b-match').click(); ok(shown() === 's-home' && H.step() === 'match' && !$('b-gcont').hidden && $('b-gcont').textContent === 'Continue Championship' && H.first() === $('b-gcont') && !$('b-quick').hidden && !$('b-comps').hidden && $('hp-match').classList.contains('go') && $('hs-back').textContent === 'Back to Menu', 'Game opens its step with Continue Championship on top, as Competitions has it (one press from the step), the focus on it, Quick Match | Competitions under it');
  $('b-gcont').click(); ok(shown() === 's-hub', 'Continue Championship opens its hub');
  D.goHome(); $('b-match').click(); $('b-comps').click(); ok(H.step() === 'champ' && !$('hc-go').hidden && $('b-champ').textContent === 'Continue Championship' && $('hs-back').textContent === 'Back to Game', 'Competitions still has its own Continue Championship first, its Back to Game');
  $('hs-back').click(); ok(H.step() === 'match' && !$('b-gcont').hidden, 'and Back to Game is Game\'s step again, Continue on top');
  { const c = X.champ(); for (let i = 0; i < 5; i++) { c.results.push(c.fixtures[i].map(p => ({ h:p[0], a:p[1], hs:20, as:10, ht:3, at:1 }))); c.round++; } }
  D.goHome(); ok($('game-note').textContent === 'Continue · Final Table', 'finished and not put away: Continue · Final Table');
  $('b-match').click(); ok(!$('b-gcont').hidden && $('b-gcont').textContent === 'Final Table', 'and Game\'s step: Final Table on top, as Competitions words it'); D.goHome();
  X.setChamp(null);
  K.set(K.cupNew('euro', { user:X.ENGLAND[0], cat:'men' })); D.goHome();
  const fx = K.cupFixture(K.get());
  ok(H.under() === 'champ' && $('game-note').textContent === 'Continue · Semi-Final v ' + K.get().teams[fx.opp].name, `a cup: Continue · Semi-Final v ${K.get().teams[fx.opp].name} (${$('game-note').textContent})`);
  $('b-match').click(); $('b-gcont').click(); ok(shown() === 's-cup', 'Game, then Continue Championship on its step, opens the cup');
  K.set(K.cupNew('tour', { user:K.cupTourSide('men'), n:0, host:'NZL' })); D.goHome();
  ok(/^Continue · Test 1 v /.test($('game-note').textContent) && !/ of \d/.test($('game-note').textContent), `a tour: Continue · Test 1 v its host, no "of 3" (${$('game-note').textContent})`);
  K.set(null);
  C.start({ name:'Sam', pos:'B', num:7, club:X.CLUBS[0] }); D.goHome();
  const f = C.ahead(C.get()), copp = f.teams[f.home === f.user ? f.away : f.home];
  ok(H.under() === 'career' && $('career-note').textContent === 'Continue · Round 1 v ' + copp.name && !$('career-note').hidden && $('b-career').getAttribute('aria-label') === 'Career, Continue · Round 1 v ' + copp.name && $('game-note').textContent === 'Quick Match', `a career: Career's note Continue · Round 1 v ${copp.name}, Game's still Quick Match (${$('career-note').textContent})`);
  $('b-career').click(); ok(shown() === 's-career', 'the Career tile opens the career\'s hub');
  // both: each on its own tile, whichever was played last
  X.newChamp(X.CLUBS[0], X.CLUBS.slice(1, 6)); D.settings().last = null; D.goHome();
  ok(/^Continue · Round 1 v /.test($('game-note').textContent) && $('career-note').textContent === 'Continue · Round 1 v ' + copp.name, `a championship and a career: each on its own tile, Game's and Career's (${$('game-note').textContent} | ${$('career-note').textContent})`);
  { const cr = C.get(), was = cr.phase; cr.phase = 'transfer'; D.goHome(); ok($('career-note').textContent === 'Continue · Transfer Window' && H.careerFix(cr) === 'Transfer Window', 'between seasons: Continue · Transfer Window'); cr.phase = was; D.goHome(); }
  C.play(); ok(D.settings().last === 'career' && saved().settings.last === 'career', 'a career match started: the career is the one played last, saved'); D.exitMatch(); D.goHome();
  ok(H.under() === 'career' && /^Continue · /.test($('career-note').textContent) && /^Continue · /.test($('game-note').textContent), 'both notes still shown');
  $('hub-play') && (D.renderHub(), $('hub-play').click()); ok(D.settings().last === 'champ' && T.M.champ, 'a championship match started: the championship'); D.exitMatch(); D.goHome();
  ok(H.under() === 'champ' && /^Continue · /.test($('game-note').textContent) && /^Continue · /.test($('career-note').textContent), 'and both still: the one played last is the save\'s, never the home\'s choice');
  ok(/if \(!pair && \(M\.champ \|\| M\.cup\) && settings\.last !== 'champ'\)/.test(fs.readFileSync(new URL('../src/ui-match.js', import.meta.url), 'utf8')) && /if \(settings\.last !== 'career'\) \{ settings\.last = 'career'; save\(\); \}/.test(fs.readFileSync(new URL('../src/career.js', import.meta.url), 'utf8')), 'a cup match counts as the championship\'s, a career\'s own cup match as the career\'s (careerArm, after startMatch)');
  ok(/function homeNotesFit\(\) \{[\s\S]*?n > 13[\s\S]*?note\.textContent = fix;[\s\S]*?note\.textContent = vs\[1\];[\s\S]*?note\.classList\.add\('two'\)/.test(menus), 'the one-line rule: the full line, then down to 13px, then Continue · dropped, then the round, the opponent never cut (two lines at the last; measured in the browser part)');
  fresh();
}

// 6. My Team: the setting, its defaults, old saves, and how each mode uses it
{
  // 1.10 (the owner, 2026-11-16: "Don't start with Farnham unless directed to it via a specific team sign-up link"): a new game has no club
  fresh(null);
  ok(H.myClub() === null && H.myNat(null).id === 'ENG' && D.settings().myClub === null && D.settings().myNat === null && D.settings().myClubLegacy === false, 'a new game: no club (Farnham was the default before 1.10), and England');
  ok($('my-box').classList.contains('none') && !$('my-none').hidden && $('my-box').getAttribute('aria-label') === 'My Team' && $('ts-name').textContent === 'My Team' && $('ts-shirt').hidden && $('b-my').getAttribute('aria-label') === 'Change My Profile', 'the home\'s My Team with no club: My Team and Pick Your Club, nothing else; the Team tab\'s row My Team, Change still to My Profile');
  $('b-mypick').click(); ok(shown() === 's-teams' && D.pickMode() === 'my' && T.picker.filterState().open && T.picker.filterState().top, 'Pick Your Club: My Team\'s picker, its Filter open at the top (tools/links.mjs has the rest)');
  T.picker.filterShut(); $('t-back').click(); ok(shown() === 's-home' && H.step() === null, 'its Back: the tiles, where the box is');
  fresh();
  ok(H.myClub() === X.CLUBS[0] && D.settings().myClub === 'FAR', 'Farnham picked (the fixture from here on): the club');
  ok($('my-name').textContent === 'Farnham' && /--kit:#1a1a1a/.test($('my-shirt').innerHTML) && /England/.test($('my-nat').innerHTML) && /--kit:/.test($('my-nat').innerHTML) && $('b-my').getAttribute('aria-label') === 'Change My Profile: Farnham, England', 'the home\'s My Team: the club\'s shirt and name, the country\'s, Change read out with both, for where it goes (My Profile)');
  $('b-my').click(); $('pf-team').click();   // My Profile, then My Team's picker on it (src/profile.js)
  const P6 = T.picker, v6 = () => P6.view(0), to6 = (n, key) => { P6.group(n, P6.view(n).ladder.findIndex(g => g.key === key) - P6.view(n).gi); return P6.view(n); }, mineTag = n => /<span class="gap mine">My Team<\/span>/.test($('t-side' + n).innerHTML);
  ok(shown() === 's-teams' && D.pickMode() === 'my' && $('t-eyebrow').textContent === 'My Team' && $('t-title').textContent === 'Pick Your Club' && P6.one() && v6().group.key === 'sur' && v6().ladder.some(g => g.key === 'nat.eng') && v6().ladder.some(g => g.key === 'fra') && $('t-go').textContent === 'Done', 'My Team: Pick Your Club on its group, the whole ladder to look anywhere, Done while the club is it');
  ok(v6().team.id === 'FAR' && mineTag(0) && v6().ladder.find(g => g.key === 'mine.made').teams.some(t => t.act === 'create') && v6().ladder.find(g => g.key === 'mine.league').teams.some(t => t.act === 'import'), 'Farnham marked My Team, Create Team and Add Your Team in My Clubs');
  to6(0, 'eng'); P6.go();
  ok(D.settings().myClub === 'BTH' && saved().settings.myClub === 'BTH' && shown() === 's-teams' && $('t-title').textContent === 'Pick Your Country' && v6().team.id === 'ENG', 'a club picked: Bath, saved, the screen stays and moves on to the country');
  ok(v6().ladder.filter(g => g.key.startsWith('nat.')).length === 12 && !v6().ladder.some(g => g.teams.some(t => t.legend)), 'the countries: the category\'s twelve, no Legend');
  to6(0, 'nat.wal'); P6.go();
  ok(D.settings().myNat === 'WAL' && D.settings().myClub === 'BTH' && mineTag(0) && $('t-go').textContent === 'Done', 'a nation picked: the country, marked, the club kept');
  P6.go(); ok(shown() === 's-profile', 'Done: back to My Profile, where it was opened'); $('pf-back').click(); ok(shown() === 's-home' && H.step() === 'settings' && H.tab() === 'team', 'and Back to Team: Team and Settings\' Team tab');
  X.catPick('women'); H.myPick(X.natList('women').find(t => t.id === 'CDN')); X.catPick('men');
  ok(D.settings().myNat === 'CDN' && H.myNat('men') === null && H.myNat('women').id === 'CDN' && H.myNat(null).id === 'CDN', 'Canada, from the women\'s twelve: no side on the men\'s list, Canada still on the home');
  H.myPick(X.natList('men').find(t => t.id === 'WAL'));
  D.goHome(); ok($('my-name').textContent === 'Bath' && /Wales/.test($('my-nat').innerHTML), 'home: Bath and Wales');
  X.load(); ok(D.settings().myClub === 'BTH' && D.settings().myNat === 'WAL', 'saved and loaded');
  X.restore({ settings:{ myClub:'<b>', myNat:'XYZ' } }); ok(D.settings().myClub === 'BTH' && D.settings().myNat === 'WAL', 'a broken value in a save is ignored');
  X.restore({ settings:{ myClub:'GONE', myNat:'ENG', myClubLegacy:false } }); ok(D.settings().myClub === null && H.myClub() === null && D.settings().myNat === 'ENG', 'a club no longer there (a 1.10 save): no club again');
  X.restore({ settings:{ myClub:'GONE', myNat:'ENG' } }); ok(D.settings().myClub === null && D.settings().myClubLegacy === true && H.myClub() === X.CLUBS[0], 'in a save from before 1.10 (no myClubLegacy): Farnham, as it always was for that player');
  X.restore({ settings:{ sound:true } }); ok(H.myClub() === X.CLUBS[0] && H.myNat(null).id === 'ENG', 'an old save (none of it): Farnham and England');
  X.restore({ settings:{ myClubLegacy:false } });
  S.setNative(true); S.setStarted(true); S.FAN_CLUBS.push({ key:'guildford', name:'Guildford RFC', product:'tryline.fan.guildford', share:50, agreed:true, team:'GUI' }); S.setBought(['tryline.fan.guildford']);
  ok(H.myClub().id === 'GUI' && H.myPool() === 'sur', 'an old save with a Super Fan: the Super Fan\'s club');
  D.settings().myClub = 'TLS'; ok(H.myClub().id === 'TLS' && H.myPool() === 'fra', 'until another is picked');
  D.settings().myClub = null; D.settings().myClubLegacy = false; ok(H.myClub().id === 'GUI', 'a 1.10 game with no club and a Super Fan: the Super Fan\'s club (a purchase is a club choice)');
  S.FAN_CLUBS.length = 1; S.setBought([]); S.setNative(null); S.setStarted(false); ok(H.myClub() === null, 'and without one, no club'); D.settings().myClub = 'FAR';
  // a team you made, and an imported league's side
  T.stamina.openBuilder(null); $('bd-name').value = 'Red Lions'; T.stamina.draft().name = 'Red Lions'; $('bd-save').click();
  const mine = X.custom().find(t => t.name === 'Red Lions');
  H.myPick(mine); ok(D.settings().myClub === mine.key && H.myClub() === mine && H.myPool() === null, 'a team you made can be My Team');
  D.goHome(); ok($('my-name').textContent === 'Red Lions', 'and it is the box\'s');
  X.restore({ custom:[] }); X.restore({ settings:{ myClubLegacy:false } }); ok(D.settings().myClub === null && H.myClub() === null, 'deleted: no club again (1.10; Farnham before)');
  I.setLeague({ teams:X.CLUBS.slice(1, 6).map(t => ({ ...t, key:'lg-' + t.id + 'X', id:t.id })) });
  H.myPick(I.league().teams[0]); ok(D.settings().myClub === I.league().teams[0].key && H.myPool() === 'my', 'a side of My League can be My Team');
  I.setLeague(null); ok(H.myClub() === null, 'its league removed: no club (1.10)'); D.settings().myClubLegacy = true; ok(H.myClub() === X.CLUBS[0], 'or Farnham, in a game from before 1.10'); D.settings().myClubLegacy = false;
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
  const SURG = T.local.pickLocalOrder(X.TEAM_LISTS.find(l => l.key === 'sur').teams.filter(t => t.id !== 'ALD')).map(t => t.id);   // Surrey's group as it shows (LOCAL): every Surrey club, its pyramid's order
  ok(v6().group.teams.map(t => t.id).join() === SURG.join() && !mineTag(0), 'a group without it: as it was, unmarked');
  D.pickTeam(X.CLUBS[2]);
  ok($('t-title').textContent === 'Pick Opponent' && P6.state().sides[0].set && v6().team.id === 'GUI' && T.M === demo, 'another side picked: his; now the opponent');
  to6(1, 'eng');
  ok(P6.view(1).group.teams.map(t => t.id).join() === X.ENGLAND.map(t => t.id).join() && !mineTag(1), 'the opponents\' groups: in their own order, nothing marked');
  {
    const list = () => T.yourTeam.teamList(), ids = () => list().map(t => t.id), sur = SURG;
    D.settings().pick = [null, null]; D.openTeams('quick'); to6(0, 'sur'); D.pickTeam(X.CLUBS[0]);
    const opp = P6.view(1).team;
    const rivals = ['OAE', 'WIM', 'CAE'];   // Regional 1 South Central's other Surrey clubs, in Surrey's order (LOCAL): Old Alleynians 4th, Wimbledon 9th, Camberley 12th
    ok($('t-title').textContent === 'Pick Opponent' && ids().slice(0, 3).join() === rivals.join() && !ids().includes('FAR') && opp.id === 'OAE' && opp.league === X.CLUBS[0].league && X.overallOf(X.CLUBS[0]) - X.overallOf(opp) <= 3, `Farnham picked: the Opponent opens on his own league's (Old Alleynians), and never shows Farnham (${ids().slice(0, 3).join(' ')}, ${X.overallOf(X.CLUBS[0])} v ${X.overallOf(opp)})`);
    ok(ids().length === sur.length - 1 && [...ids()].sort().join() === sur.filter(id => id !== 'FAR').sort().join() && ids().filter(id => !rivals.includes(id)).join() === sur.filter(id => !rivals.includes(id) && id !== 'FAR').join(), 'only the order changes: the same sides bar his own, the rest in the list\'s own order');
    to6(1, 'cum'); const c = ids();
    ok(c.join() === T.local.pickLocalOrder(X.TEAM_LISTS.find(l => l.key === 'cum').teams).map(t => t.id).join(), `a group without a rival of his: in its own order (Cumbria: ${c.slice(0, 3).join(' ')})`);
    D.settings().pick = [null, null]; D.openTeams('quick'); to6(0, 'sur'); D.pickTeam(X.ALL_TEAMS.find(t => t.id === 'RPA'));   // LOCAL: Guildfordians has Counties 5 Surrey's sides beside it now; Rosslyn Park is Surrey's one National League 1 club
    ok(ids().join() === sur.filter(id => id !== 'RPA').join(), 'a side with no rival in its group leaves the group as it is (Rosslyn Park on Surrey)');
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
  const FS = RERATE ? 3 : 3.5;   // Farnham's stars: 58 with the owner's rerating, 61 without
  ok(r[0] === 'Farnham' && r[1] === R5.starsHtml(FS) && r[2] === 'Regional 1 South Central · 7th Last Season' && $('my-league').innerHTML === '<span>Regional 1 South Central</span><span class="sep"> · </span><span>7th Last Season</span>', `a new game: Farnham, ${FS} stars, 7th in Regional 1 South Central, the league over its place (${r.join(' | ')})`);
  ok(R5.starsHtml(FS).includes(`aria-label="${FS} Stars"`) && R5.starsOf(X.CLUBS[0]) === FS, 'the stars carry their words for a screen reader');
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
  ok((home.slice(home.indexOf('id="my-box"'), home.indexOf('</section>', home.indexOf('id="my-box"'))).match(/<button[^>]*>/g) || []).join() === '<button class="btn primary my-pick" id="b-mypick">', 'the box\'s figures are not buttons: the box is one itself (1.10), and Pick Your Club, with no club, its only button inside');
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
  play(X.ENGLAND[0], X.ENGLAND[1], 3, 0); D.settings().myClub = 'FAR'; D.goHome();
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
  ok($('m-import').hidden && D.settings().myClub === 'FAR' && shown() === 's-home' && $('my-name').textContent === 'Farnham', 'Not Now: My Team as it was, home');
  offer(); $('im-make').click();
  ok($('m-import').hidden && D.settings().myClub === club.key && H.myClub() === club && $('my-name').textContent === club.name && saved().settings.myClub === club.key, 'Make This My Team: it is, saved, in the box');
  offer();
  ok($('m-import').hidden && I.state().step !== 'mine', 'importing My Team\'s club again asks nothing');
  ok(I.league() && I.league().teams.length === 4 && I.league().teams.every(t => /^lg-/.test(t.key)) && H.comps(2).map(c => c[0]).join() === 'sur,county,my', 'the league comes in as ever: My League, beside Surrey and Other County');
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
    if (resultsServe(req.url, res)) return;   // the week's results.json: 404 unless RESULTS_FILE (tools/results-serve.mjs)
    if (new URL(req.url, 'http://x').pathname === '/crests/test.svg') { res.writeHead(200, { 'content-type':'image/svg+xml' }); res.end(CREST); return; }
    const file = path.resolve(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type':TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const SAVE = { settings:{ tut:['past', 'pass', 'tackle', 'block', 'scrum', 'lineout', 'goal', 'drop'], coach:false, played:5 }, form:[{ k:'c:FAR', w:9, d:1, l:4, last:'WWLWD' }] };
  const VIEWS = [[null, null], ['match', null], ['champ', 0], ['champ', 1], ['champ', 2], ['drills', null], ['settings', null, 'game'], ['settings', null, 'team']];   // the four tiles, then each step (Competitions on each tier, Team and Settings on each tab)
  // Settings row by row, at every size: the web's halves and the thirds where Grown-Ups shows (the free web, the app), desk or not. Down from
  // every control lands on the row under it, the last row's on nothing (the step's foot), never two rows down (Age Group's thirds over Sound's
  // halves sent Junior to Half Length before the row rule, homeNavPick); Up on the row over it, the first row's on Back; Left and Right never two rows away
  const settingsRows = () => {
    const T = window.__tryline, S = T.store, st = T.debug.settings(), $ = id => document.getElementById(id), panel = $('hp-settings'), out = { rows:[], moves:0, bad:[] };
    const box = el => el.getBoundingClientRect(), vis = el => !!el && !el.hidden && !el.closest('[hidden]') && box(el).width > 0;
    const name = el => !el ? 'nothing' : el.id || (el.closest('.seg') ? (el.closest('.seg').dataset.key || el.closest('.seg').id) + ':' : '') + el.textContent.trim();
    for (const desk of [false, true]) for (const store of ['web', 'free', 'app']) {
      const app = store === 'app', at = store + (desk ? ' desk' : '');
      S.setNative(app); S.setStarted(app); S.setBought([]); S.setTier(store === 'free' ? 'free' : null);
      st.kids = app; st.diff = app ? 0 : 1; document.body.classList.toggle('desk', desk); T.debug.goHome(); T.home.open('settings', null, 'game'); T.home.ring(null);
      const btns = [...panel.querySelectorAll('button')].filter(vis), foot = el => box(el.closest('.set') || el).bottom;   // a control's row: its setting's foot (Grown-Ups stands on its row's)
      const feet = btns.map(foot).sort((a, b) => a - b).filter((f, i, a) => !i || f - a[i - 1] > 8);
      const row = el => !el ? feet.length : panel.contains(el) ? feet.findIndex(f => Math.abs(foot(el) - f) <= 8) : -2;
      out.rows.push(feet.length);
      for (const b of btns) {
        const r = row(b);
        T.home.ring(b); const down = T.navMove(0, 0, 1); out.moves++;
        if (row(down) !== r + 1) out.bad.push(`${at}: Down from ${name(b)} to ${name(down)}`);
        T.home.ring(b); const up = T.navMove(0, 0, -1); out.moves++;
        if (r ? row(up) !== r - 1 : up !== $('ts-tab-game')) out.bad.push(`${at}: Up from ${name(b)} to ${name(up)}`);   // the first row's: the Game tab over it (1.10), where Back was
        for (const dx of [-1, 1]) { T.home.ring(b); const to = T.navMove(0, dx, 0); out.moves++; if (to && panel.contains(to) && Math.abs(row(to) - r) > 1) out.bad.push(`${at}: ${dx < 0 ? 'Left' : 'Right'} from ${name(b)} to ${name(to)}`); }
      }
    }
    S.setNative(false); S.setStarted(false); S.setTier(null); st.kids = false; st.diff = 1; document.body.classList.remove('desk'); T.home.ring(null); T.debug.goHome();
    return out;
  };
  const rowsOk = (kind, r) => ok(r.rows.length === 6 && r.rows.every(n => n === 4) && !r.bad.length, `${kind}: Settings in four rows (the web, the free web, the app, desk or not), Down from every control on the row under it (the last row's on nothing) and Up on the row over it (the first row's on Back), Age Group's thirds over Sound's halves included, Left and Right never two rows away (${r.bad.slice(0, 4).join(', ') || r.moves + ' moves'}; rows ${r.rows.join(' ')})`);
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
          for (const [step, tier, pane] of VIEWS) {
            T.home.setTier(tier); T.debug.goHome(); if (step) T.home.open(step, null, pane);
            if (tools) { for (const id of TOOLS) $(id).hidden = false; T.home.fit(); }
            const toolsAt = $('app-tools').parentNode.id;   // beside the wordmark, or at a step's top right
            const s = $('s-home'), my = $('my-box'), game = $('b-match'), cs = e => getComputedStyle(e);
            const btns = [...s.querySelectorAll('button')].filter(vis);
            const small = btns.filter(b => box(b).height < 43.5 || box(b).width < 43.5).map(b => b.id || b.textContent.trim());
            const clipped = [...s.querySelectorAll('.bx-name, .my-name, .tc-name, .hs-title, .hc-comp span, .dc-name, .my-league > span, .my-nat b, .ts-id b, .ts-id span, .ts-tabs button')].filter(vis).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent)
              .concat([$('game-note'), $('career-note')].filter(vis).filter(e => (e.classList.contains('two') ? e.scrollHeight > 2.6*parseFloat(cs(e).fontSize) : e.scrollWidth > e.clientWidth + 0.5) || parseFloat(cs(e).fontSize) < 13).map(e => e.id + ' cut or under 13px'))
              .concat([...s.querySelectorAll('.locked')].filter(vis).filter(e => { const c = cs(e, '::after'); return c.position !== 'absolute' && parseFloat(c.width) < 0.7*parseFloat(c.fontSize) - 0.5; }).map(e => e.id + "'s lock squeezed"));
            const panel = step && T.home.panel(step), pr = panel && box(panel), clip = !!panel && cs(panel).overflowY !== 'visible';
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
              why = fan ? [s.classList.contains('fan'), cs(my).backgroundColor === rgb(v('ground')), cs(my).borderTopColor === rgb(v('edge')), words.every(r => r >= 4.5), cs(game).backgroundColor === 'rgba(23, 39, 29, 0.94)', ratio(cs(game).color, 'rgb(23, 39, 29)') >= 4.5, vis($('st-fan')), !!sh && (buy === 'crest' ? sh.tagName === 'IMG' && /\/crests\/test\.svg$/.test(sh.src) : sh.tagName.toLowerCase() === 'svg'), !!sh && box(sh).width <= 20 && box(sh).height <= 22,
                cs(marks).backgroundColor === rgb(v('tab')), tabWords.length > 0 && tabWords.every(r => r >= 4.5), marks3, chips3, cs($('my-shirt')).backgroundColor === 'rgb(16, 27, 20)'].map(Number).join('') : '';
              themed = fan ? !why.includes('0')
                : !s.classList.contains('fan') && !s.style.cssText && cs(game).backgroundColor === 'rgba(23, 39, 29, 0.94)' && cs(my).backgroundColor === 'rgba(23, 39, 29, 0.94)' && !vis($('st-fan')) && !vis(marks) && words.every(r => r >= 4.5) && marks3 && chips3;
              if (fan) {                                         // the tab on the box's top edge: over it, clear of the wordmark above and of the shirt and the name inside
                const t = box(marks), b = box(my), w = box(document.querySelector('#s-home .word')), head = box(my.querySelector('.my-head'));
                tab = t.top < b.top && t.bottom > b.top && t.top >= w.bottom - 0.5 && t.bottom <= head.top + 0.5 && t.right <= b.right;
              }
            }
            const gn = $('game-note'), cn = $('career-note'), fixed = n => { const f = n.dataset.fix || '', vs = (f.match(/(?:^| )(v .+)$/) || [])[1]; return ['Continue · ' + f, f, vs].includes(n.textContent); };   // a note fitted to its line: whole, without Continue ·, or the opponent alone
            const want = busy === 'none' ? gn.textContent === 'Quick Match' && !gn.dataset.fix : busy === 'career' ? gn.textContent === 'Quick Match' : busy === 'cup' ? /^Semi-Final v /.test(gn.dataset.fix) && fixed(gn) : /^Round 1 v /.test(gn.dataset.fix) && fixed(gn);
            const cwant = busy === 'career' || busy === 'both' ? vis(cn) && /^Round 1 v /.test(cn.dataset.fix) && fixed(cn) : !vis(cn);
            out.push({ why, tab, state:[desk ? 'desk' : 'phone', app ? 'app' : 'web', tools ? 'tools' : '', cab ? 'cab' : '', busy, free ? 'free' : '', fan ? buy : '', step ? step + (tier != null ? tier : '') + (pane === 'team' ? 'team' : '') : 'boxes'].filter(Boolean).join('+'), step, fan:fan && vis($('st-fan')), themed, words:words.length,
              fits:s.scrollHeight <= s.clientHeight + 1 && s.scrollWidth <= s.clientWidth && document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight, inner, small, clipped, overlap, off,
              scroll:panel ? panel.scrollHeight - panel.clientHeight : 0,
              two:!$('b-two') && !btns.some(b => /\b2 Players\b|Two Player/.test(b.textContent)),
              line:step || (want && cwant),
              grown:vis($('b-grown')) === ((app || free) && step === 'settings' && pane !== 'team'), note:$('b-set').classList.contains('note') === app,
              cabBtn:pane !== 'team' || vis($('b-cabinet')) === (cab || fan), lock:step || (!game.classList.contains('locked') && !vis($('b-continue'))), tools:toolsAt === (step ? 'hs-head' : 'home-mark') && (!tools || vis($('b-install'))) });
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
      ok(states.every(r => r.themed), `${kind}: a Super Fan's box in the club's colours (its ground and edge, every word on it 4.5:1 and more; the tiles still their own ground, 1.10's Continue gone) with its shield or crest in the Super Fan tab (the tab in the edge's colour, its words 4.5:1 and more on it), the stars and every result's chip 3:1 on the ground (by fill or ring), the shirt on the plain panel's tile; every other home in the plain dark style, no tab, every word in the box 4.5:1 and more (${states.filter(r => !r.themed).slice(0, 4).map(r => r.state + ' ' + r.why).join(', ') || 'all'})`);
      ok(states.every(r => r.tab), `${kind}: the Super Fan tab sits on the box's top edge, clear of the wordmark above it and of the shirt and the name inside (${bad(r => !r.tab).slice(0, 4).join(', ') || 'all'})`);
      ok(states.every(r => !r.small.length), `${kind}: every button at least 44px (${states.filter(r => r.small.length).slice(0, 3).map(r => r.state + ': ' + r.small.join('/')).join('; ') || 'all'})`);
      ok(states.every(r => !r.clipped.length && !r.overlap), `${kind}: no name cut off nor lock squeezed, no button over another (${states.filter(r => r.clipped.length || r.overlap).slice(0, 3).map(r => r.state + ': ' + r.clipped.join('/') + (r.overlap ? ' overlap' : '')).join('; ') || 'none'})`);
      ok(states.every(r => r.tools), `${kind}: Offline Ready, Install Game and Updating beside the wordmark, and at a step's top right, showing wherever the home is (${bad(r => !r.tools).slice(0, 4).join(', ') || 'all'})`);
      ok(states.every(r => r.two && r.line && r.grown && r.note && r.cabBtn && r.lock), `${kind}: no 2 Players on any device, Game's note saying what a press there picks up (Quick Match with nothing or a career alone; Continue · Round 1 v ... with a championship or a cup, fitted to one line, the opponent never cut) and Career's while a career is saved, Game never locked and no Continue anywhere (1.10), Grown-Ups in Settings where the store is live, its dot on the Team and Settings tile, the Trophy Cabinet's row on the Team tab with a finished season or a Super Fan trophy (${bad(r => !(r.two && r.line && r.grown && r.note && r.cabBtn && r.lock)).slice(0, 4).join(', ') || 'all'})`);
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
      // Game's and Career's notes (1.10) with the longest names in the game: one line, the full line first, then 13px, then Continue · dropped,
      // then the round, the opponent never cut (two lines at 13px as the last step); never under 13px
      const longest = await page.evaluate(() => {
        const T = window.__tryline, X = T.teams, H = T.home, $ = id => document.getElementById(id), bad = [], seen = new Set();
        T.career.start({ name:'Sam', pos:'B', num:7, club:X.CLUBS[0] }); X.newChamp(X.CLUBS[0], X.CLUBS.slice(1, 6)); T.debug.settings().last = null; T.debug.goHome();
        const c = document.createElement('canvas').getContext('2d'); c.font = getComputedStyle($('career-note')).font;
        const names = [...new Set(X.ALL_TEAMS.map(t => t.name.replace(/ (Women|Minis)$/, '')))].sort((a, b) => c.measureText(b).width - c.measureText(a).width).slice(0, 3);
        const test = (id, fix) => {
          const el = $(id); H.noteSet(el, fix, ''); H.fit();
          const t = el.textContent, vs = fix.match(/(?:^| )(v .+)$/)[1], px = parseFloat(getComputedStyle(el).fontSize), two = el.classList.contains('two');
          seen.add(t === 'Continue · ' + fix ? 'full' : t === fix ? 'no Continue' : t === vs ? 'opponent' : 'other');
          if (!['Continue · ' + fix, fix, vs].includes(t) || px < 13 || (two ? el.scrollHeight > 2.6*px : el.scrollWidth > el.clientWidth + 0.5)) bad.push(id + ': ' + fix + ' (' + t + ', ' + px + 'px)');
        };
        for (const n of names) for (const id of ['game-note', 'career-note']) for (const pre of ['Round 5', 'Semi-Final', 'Quarter-Final', 'Test 3', 'Pool A']) test(id, pre + ' v ' + n);
        for (const id of ['game-note', 'career-note']) test(id, 'Round 2 v Bath');
        T.career.set(null); X.setChamp(null); T.debug.goHome();
        return { names, bad, seen:[...seen].sort() };
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
      ok(longest.names.length === 3 && !longest.bad.length && (w < 844 || longest.seen.includes('full')) && !longest.seen.includes('other'), `${kind}: Game's and Career's notes keep the opponent whole for the longest names in the game, 13px and more, one line (two only where the opponent alone needs it) (${longest.names.join(', ')}; ${longest.seen.join(', ')}; ${longest.bad.slice(0, 3).join('; ') || 'none cut'})`);
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
      // a controller (1.10's four tiles): the first press on Game; Down Skill Games, Right Team and Settings, Up Career, nothing past the
      // edges; Left from the first column into My Team's box and Right back where it started; every button reached from the first press on
      // the tiles, on every step and on each of Team and Settings' tabs; Down from every button never skips a row; Up from a step's first row
      // to its Back, or on Team and Settings to the tab on show; along the top bar Back, Team, Game
      const pad = await page.evaluate(VIEWS => {
        const T = window.__tryline, X = T.teams, K = T.cups, out = {}, $ = id => document.getElementById(id), f = () => T.debug.focus();
        const id = el => (el ? el.id || el.textContent.trim() : 'none'), vis = el => !!el && !el.hidden && !el.closest('[hidden]') && el.getBoundingClientRect().width > 0;
        K.setHistory([]); X.newChamp(X.NATIONS[0], X.NATIONS.slice(1)); { const c = X.champ(); for (let i = 0; i < 5; i++) { c.results.push(c.fixtures[i].map(p => ({ h:p[0], a:p[1], hs:20, as:10, ht:3, at:1 }))); c.round++; } X.save(); X.load(); X.setChamp(null); }   // the Trophy Cabinet's row showing
        T.debug.goHome(); T.home.ring(null);
        out.first = id(T.navMove(0, 0, 0));
        out.moves = [[0, 1], [0, 1], [1, 0], [0, -1], [0, -1], [1, 0], [-1, 0], [-1, 0], [1, 0], [0, 1]].map(([dx, dy]) => id(T.navMove(0, dx, dy)));
        T.home.ring($('my-box')); out.moves.push(id(T.navMove(0, 0, 1)), id(T.navMove(0, 0, -1)), id(T.navMove(0, -1, 0)));   // My Team's column: one button, nothing up, down or left
        out.right = [];
        for (const b of ['b-match', 'b-drills']) { T.home.ring($(b)); const left = T.navMove(0, -1, 0); const back = T.navMove(0, 1, 0); if (left !== $('my-box') || back !== $(b)) out.right.push(b + '<' + id(left) + '>' + id(back)); }
        const rows = [['b-match', 'b-career'], ['b-drills', 'b-set']], rowOf = el => rows.findIndex(r => r.includes(el && el.id));
        out.down = [];
        for (const r of [0, 1]) for (const b of rows[r]) { T.home.ring($(b)); const to = T.navMove(0, 0, 1); if (r === 1 ? to !== null : rowOf(to) !== r + 1) out.down.push(b + '>' + id(to)); T.home.ring($(b)); const up = T.navMove(0, 0, -1); if (r === 0 ? up !== null : rowOf(up) !== r - 1) out.down.push(b + '^' + id(up)); }
        // the Team tab: Change, Add Your Team, Locker, the Trophy Cabinet, a row at a time; Up from Change to Team; along the top Back, Team, Game
        T.debug.goHome(); T.home.open('settings', null, 'team'); T.home.ring(null);
        out.team = [id(T.navMove(0, 0, 0)), ...[[0, 1], [0, 1], [0, 1], [0, 1], [0, -1], [0, -1], [0, -1], [0, -1], [-1, 0], [1, 0], [1, 0], [1, 0], [0, 1]].map(([dx, dy]) => id(T.navMove(0, dx, dy)))];
        T.home.ring($('ts-tab-team')); out.tabUp = id(T.navMove(0, 0, -1));
        T.home.ring($('ts-tab-game')); $('ts-tab-game').click(); out.tabbed = [T.home.tab(), id(f()), id(T.navMove(0, 0, 1))];
        out.unreached = []; out.skipped = []; out.up = [];
        for (const [step, tier, tab] of VIEWS) {
          T.home.setTier(tier); T.debug.goHome(); if (step) T.home.open(step, null, tab); T.home.ring(null);
          const all = [...document.querySelectorAll('#s-home .btn, #s-home .seg button, #s-home .my-box[role="button"]')].filter(vis);
          const reach = new Set(), todo = [T.navMove(0, 0, 0)];
          while (todo.length) {
            const el = todo.shift(); if (!el || reach.has(el)) continue; reach.add(el);
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { T.home.ring(el); const got = T.navMove(0, dx, dy); if (got && !reach.has(got)) todo.push(got); }
          }
          out.unreached.push(...all.filter(b => !reach.has(b)).map(b => (step ? step + (tab || '') : 'boxes') + ':' + id(b)));
          if (step) {
            const mid = el => { const r = el.getBoundingClientRect(); return r.top + r.height/2; }, tops = [...new Set(all.map(b => Math.round(mid(b))))].sort((a, b) => a - b);
            const rowIx = el => tops.findIndex(t => Math.abs(t - mid(el)) <= 6);
            for (const b of all) { T.home.ring(b); const to = T.navMove(0, 0, 1); if (to && rowIx(to) - rowIx(b) > 1 && !b.closest('.seg') && !to.closest('.seg')) out.skipped.push(step + ':' + id(b) + '>' + id(to)); }
            const panel = T.home.panel(step), inside = all.filter(b => panel.contains(b)), top = Math.min(...inside.map(b => b.getBoundingClientRect().top));   // Up from the step's first row: Back (Team and Settings: the tab on show)
            const head = step === 'settings' ? $(tab === 'team' ? 'ts-tab-team' : 'ts-tab-game') : $('hs-back');
            for (const b of inside.filter(b => b.getBoundingClientRect().top - top < 4)) { T.home.ring(b); const to = T.navMove(0, 0, -1); if (to !== head) out.up.push(step + (tier != null ? tier : '') + (tab || '') + ':' + id(b) + '^' + id(to)); }
            for (const from of step === 'settings' ? [$('hs-back'), $('ts-tab-team'), $('ts-tab-game')] : [$('hs-back')]) { T.home.ring(from); const to = T.navMove(0, 0, 1); if (!to || !panel.contains(to) || to.getBoundingClientRect().top - top >= 4) out.up.push(step + (tab || '') + ':' + id(from) + '>' + id(to)); }
          }
        }
        T.home.setTier(null); T.home.ring(null); K.setHistory([]); T.debug.goHome();
        return out;
      }, VIEWS);
      ok(pad.first === 'b-match' && json(pad.moves) === json(['b-drills', 'none', 'b-set', 'b-career', 'none', 'none', 'b-match', 'my-box', 'b-match', 'b-drills', 'none', 'none', 'none']), `${kind}: a controller: the first press on Game; Down Skill Games (then nothing), Right Team and Settings, Up Career (then nothing, nothing to its right), Left Game, Left My Team's box, Right back to Game, Down Skill Games; My Team's box alone in its column (${pad.first} ${pad.moves.join(' ')})`);
      ok(!pad.right.length, `${kind}: Left from Game and from Skill Games into My Team's box, and Right again back where it started (${pad.right.join(', ') || 'all'})`);
      ok(json(pad.team) === json(['b-my', 'b-import', 'b-locker', 'b-cabinet', 'none', 'b-locker', 'b-import', 'b-my', 'ts-tab-team', 'hs-back', 'ts-tab-team', 'ts-tab-game', 'none', 'b-my']) && pad.tabUp === 'none', `${kind}: the Team tab: the first press on Change, Down Add Your Team, Locker, Trophy Cabinet, nothing; Up again to Change and on to the Team tab, nothing over it; Left Back to Menu, Right Team then Game, nothing past it, Down from either tab into the tab on show (${pad.team.join(' ')}; Up from the tab: ${pad.tabUp})`);
      ok(pad.tabbed[0] === 'game' && pad.tabbed[1] === 'ts-tab-game' && pad.tabbed[2] !== 'none', `${kind}: A on Game shows its tab, the ring staying on it, and Down goes into its rows (${pad.tabbed.join(' ')})`);
      ok(!pad.up.length, `${kind}: on every step (Competitions on each tier, Team and Settings on each tab) Up from the first row goes back up (Back, or the tab on show), and Down from Back or a tab to that row (${pad.up.slice(0, 6).join(', ') || 'all'})`);
      ok(!pad.down.length, `${kind}: Down from every tile lands on the row below (nothing under the last), Up on the row above (nothing over the first) (${pad.down.slice(0, 6).join(', ') || 'all'})`);
      ok(!pad.unreached.length, `${kind}: every button on the tiles, on every step and on each tab is reached by moving the ring, My Team's box included (${pad.unreached.slice(0, 8).join(', ') || 'all'})`);
      ok(!pad.skipped.length, `${kind}: on every step Down from a button never skips a row (${pad.skipped.slice(0, 6).join(', ') || 'none'})`);
      rowsOk(kind, await page.evaluate(settingsRows));
      // the keyboard: the arrow keys move as the ring does, Enter presses, Escape is Back, Tab reaches every box
      await page.evaluate(() => { const T = window.__tryline, X = T.teams, K = T.cups; K.setHistory([]); X.setChamp(null); T.home.ring(null); T.debug.goHome(); });
      const keyed = [await page.evaluate(() => document.activeElement.id)];
      for (const k of ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowLeft', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowLeft']) { await page.keyboard.press(k); keyed.push(await page.evaluate(() => document.activeElement.id)); }
      await page.keyboard.press('ArrowUp'); await page.keyboard.press('Enter');
      const opened = await page.evaluate(() => [window.__tryline.home.step(), document.activeElement.id]);
      const stepKeys = [];
      for (const k of ['ArrowRight', 'ArrowUp', 'ArrowDown']) { await page.keyboard.press(k); stepKeys.push(await page.evaluate(() => document.activeElement.id)); }
      await page.keyboard.press('Escape'); const esc = await page.evaluate(() => [window.__tryline.home.step(), document.activeElement.id]);
      ok(json(keyed) === json(['b-match', 'b-drills', 'b-set', 'b-career', 'b-match', 'my-box', 'b-match', 'b-career', 'b-set', 'b-set', 'b-drills']) && json(opened) === json(['match', 'b-quick']) && json(stepKeys) === json(['b-comps', 'hs-back', 'b-quick']) && json(esc) === json([null, 'b-match']), `${kind}: the keyboard: the focus starts on Game, the arrows move between the tiles and into My Team's box and back, Enter opens Game on Quick Match, the arrows move on the step (Up to Back, Down to its row), Escape is Back, back on Game (${keyed.join(' ')} | ${opened.join(' ')} | ${stepKeys.join(' ')} | ${esc.join(' ')})`);
      await page.evaluate(() => { document.getElementById('my-box').focus(); });
      await page.keyboard.press('Enter'); const boxed = await page.evaluate(() => [window.__tryline.home.step(), window.__tryline.home.tab(), document.activeElement.id]);
      await page.keyboard.press('Escape'); const unboxed = await page.evaluate(() => [window.__tryline.home.step(), document.activeElement.id]);
      ok(json(boxed) === json(['settings', 'team', 'b-my']) && json(unboxed) === json([null, 'my-box']), `${kind}: Enter on My Team's box opens Team and Settings on its Team tab, on Change; Escape comes back to the box (${boxed.join(' ')} | ${unboxed.join(' ')})`);
      await page.evaluate(() => { document.activeElement && document.activeElement.blur(); });
      const tabbed = new Set();
      for (let i = 0; i < 14; i++) { await page.keyboard.press('Tab'); tabbed.add(await page.evaluate(() => document.activeElement.id)); }
      ok(['my-box', 'b-match', 'b-career', 'b-drills', 'b-set'].every(id => tabbed.has(id)) && !['b-my', 'b-import', 'b-locker'].some(id => tabbed.has(id)), `${kind}: Tab reaches My Team's box and every tile, and nothing of the Team tab's while it is shut (${[...tabbed].filter(Boolean).join(' ')})`);
      await page.evaluate(() => { const T = window.__tryline; T.debug.goHome(); T.home.open('settings', null, 'team'); document.activeElement && document.activeElement.blur(); });
      const tabbedTeam = new Set();
      for (let i = 0; i < 10; i++) { await page.keyboard.press('Tab'); tabbedTeam.add(await page.evaluate(() => document.activeElement.id)); }
      ok(['hs-back', 'ts-tab-team', 'b-my', 'b-import', 'b-locker'].every(id => tabbedTeam.has(id)) && !tabbedTeam.has('ts-tab-game'), `${kind}: on the Team tab Tab reaches Back, the tab on show (the other by the arrows, one stop for the two), Change, Add Your Team and the Locker (${[...tabbedTeam].filter(Boolean).join(' ')})`);
      await page.evaluate(() => window.__tryline.debug.goHome());
      // Skill Games for each player: Men the ten, How to Play, Contact Games (U9 and Up) and For Grown-Ups; the Kids level, Minis and a Mini (the
      // profile's age group, on Normal and Men) the seven, How to Play and For Grown-Ups; a Junior the nine, Tackling and Ball Back in equal halves
      // of the contact three's places, For Grown-Ups still under How to Play (the owner, 2026-11-14: "Same for scrums until adult"). The seven, How
      // to Play and For Grown-Ups. Each fits with nothing over anything, the ring reaches every button, For Grown-Ups opens its panel with
      // Back to Skill Games in the ring's reach (the step's Back put away), every game's card offers Watch How in the ring's reach, and Tab reaches
      // every button on the step
      for (const [who, kids, cat, age] of [['Men', false, 'men', null], ['Kids', true, 'men', null], ['Minis', false, 'minis', null], ['Junior', false, 'men', 'junior'], ['Mini', false, 'men', 'mini']]) {
        const sk = await page.evaluate(([kids, cat, age]) => {
          const T = window.__tryline, st = T.debug.settings(), $ = id => document.getElementById(id);
          const box = el => el.getBoundingClientRect(), vis = el => !!el && !el.hidden && !el.closest('[hidden]') && box(el).width > 0;
          const meet = (p, q) => p.left < q.right - 1 && p.right > q.left + 1 && p.top < q.bottom - 1 && p.bottom > q.top + 1;
          const ringAll = () => { T.home.ring(null); const r = new Set(), q = [T.navMove(0, 0, 0)]; while (q.length) { const el = q.shift(); if (!el || r.has(el)) continue; r.add(el); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { T.home.ring(el); const got = T.navMove(0, dx, dy); if (got && !r.has(got)) q.push(got); } } return r; };
          const seen = st.drillSeen.slice(); st.drillSeen = T.drills.DRILLS.map(d => d.id);   // no Watch How playing on a card's first open
          const was = T.profile.get(); T.profile.set({ age, gender:null, look:null });
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
          const e = id => { const q = box($(id)); return { l:q.left, r:q.right, t:q.top, w:q.width }; }, near = (a, b) => Math.abs(a - b) < 1;
          const lined = !vis($('pr-tackle')) || (({ tackle:a, back:b, scrum:c, pass:p, kick:k, defend:d, 'b-help':h, 'pr-grown':g }) => vis($('pr-scrum'))
            ? near(a.l, p.l) && near(a.r, p.r) && near(c.l, k.l) && near(c.r, k.r) && near(b.l, d.l) && near(b.r, d.r) && near(g.l, h.l) && near(g.r, h.r)
            : near(a.t, b.t) && near(a.w, b.w) && near(a.l, p.l) && near(b.r, d.r) && near(g.l, h.l) && near(g.r, h.r) && near(g.t, a.t))(Object.fromEntries(['tackle', 'back', 'scrum', 'pass', 'kick', 'defend'].map(id => [id, vis($('pr-' + id)) ? e('pr-' + id) : null]).concat([['b-help', e('b-help')], ['pr-grown', e('pr-grown')]])));
          const out = { games, contact:!$('pr-contact').hidden && !$('pr-contact').closest('[hidden]'), fits:s.scrollHeight <= s.clientHeight + 1 && document.documentElement.scrollWidth <= innerWidth, over, small, cut, unreached, grown, watch, help:vis($('b-help')), grownBtn:vis($('pr-grown')), ids:btns.map(b => b.id), lined };
          st.drillSeen = seen; T.profile.set(was);
          return out;
        }, [kids, cat, age]);
        await page.evaluate(() => { document.activeElement && document.activeElement.blur(); });
        const tabbed = new Set();
        for (let i = 0; i < 40; i++) { await page.keyboard.press('Tab'); const at = await page.evaluate(() => { const a = document.activeElement; return a && document.getElementById('hp-drills').contains(a) ? a.id : null; }); if (at) tabbed.add(at); }
        const young = kids || cat === 'minis' || age === 'mini', open = ['tag', 'egg', 'circle', 'cones', 'pass', 'kick', 'defend'], junior = !young && age === 'junior';
        ok(json(sk.games) === json(young ? open : open.concat(junior ? ['tackle', 'back'] : ['tackle', 'scrum', 'back'])) && sk.contact === !young && sk.help && sk.grownBtn, `${kind} ${who}: Skill Games shows ${young ? 'the seven open games, no Contact Games' : junior ? 'the nine, Tackling and Ball Back under Contact Games (U9 and Up), no Driving' : 'the ten, the contact three under Contact Games (U9 and Up)'}, How to Play and For Grown-Ups (${sk.games.join(', ')})`);
        ok(sk.lined, `${kind} ${who}: the contact row keeps the lines of the rows above: ${junior ? 'Tackling and Ball Back in equal halves from Create a Gap\'s left edge to Defend a Breakaway\'s right, For Grown-Ups beside them under How to Play, no gap where Driving was' : 'the three under Create a Gap, Kicking and Defend a Breakaway, For Grown-Ups under How to Play'}`);
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
    //     primary in view, every control 44px; the Filter open over it (its ladder as columns, 2026-11-11) stays on the screen, its every
    //     control 44px. The keyboard and a controller follow it:
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
        const name = e => e.id || e.className || e.textContent.trim().slice(0, 16), sheet = document.getElementById('m-filter');
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
            ${js} ${opened ? "P.filter(0, '', { dev:'touch' });" : ''} })()`);
          await page.waitForTimeout(260);
          const m = await page.evaluate(MEASURE);
          const name = `${kind}: ${where}${opened ? ', its Filter open' : ''}`;
          ok(!m.off.length && m.side <= 0 && m.page <= 0 && m.scroll <= 0 && m.card, `${name}: nothing off the side, the page never scrolls, the Filter (open) on the screen (${json({ off:m.off, side:m.side, page:m.page, scroll:m.scroll, card:m.card })})`);
          ok(!m.cut.length && !m.small.length, `${name}: nothing cut, every control 44px (${json({ cut:m.cut, small:m.small })})`);
          ok(m.goIn && (primary instanceof RegExp ? primary.test(m.go) : m.go === primary), `${name}: the primary in view, 44px, saying what it does (${m.go})`);
          if (!opened) ok(m.whole, `${name}: ${where.startsWith('Pick') || where.startsWith('Player') ? 'both sides and the V' : 'its side'} wholly in view`);
          if (!opened) lines.push(`${where}: ${m.go}`);
          await page.evaluate(() => window.__tryline.picker.filterShut());
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
      ok(json(keys) === json(['FEL', 't-side0 pick', 'nat.sco', 't-side1 pick', 't-side1 fav']), `${kind}: the keyboard: Left on Your Team (Feltham, Surrey's last in its pyramid's order with LOCAL, from Farnham, round the end), Page Down a country (Scotland), Enter sets it onto the Opponent's card, and back from it is the Opponent's Favourite (${json(keys)})`);
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
      ok(json(club) === json(['brk', 'en2', 'new player EAL en2']), `${kind}: the career's club screen too: Down to Berkshire (the county after Surrey, LOCAL), Up to England's Championship, Enter picks Ealing, of England 2 (${json(club)})`);
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
      ok(json(pad) === json(['t-side0 pick', 'brk', 't-side0 pick', 't-side0 sheet', 't-side0 pick', 't-side0 pick []', 't-side0 pick []', 't-side0 pick []', 't-side0 pick []']), `${kind}: a controller: the first press on Your Team's card, Down its next group with the ring kept on it, Y onto its group's button and back; from the first press the ring reaches every button in Quick Match, Championship, the career's club screen and My Team (${json(pad)})`);
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
