// The home: five headlines along the bottom (Quick Match, Championship, Career, Skills Mini Games, Settings) and the chosen one's buttons,
// My Team, the Locker and Add Your Team at the top, the competitions by tier with their team lists, the Make This My Team offer after an import, the
// Legends behind the Full Game, a Super Fan's home in the club's colours (with its shield or a club's crest), and the fit of every state at
// 844x390 and 667x375 (README, Home).   node tools/home.mjs   Exits 1 on any failure.
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
const BASE = '1h04hlg 1phgpz9 1ke5vq7 7j2vuk 56loel';   // re-pinned at pressure (PRESSURE, src/contact.js, 2026-11-09), which changes AI v AI and every match on purpose (the count, the spill, the egg's hops, a knock-on's beat); with PRESSURE='{"on":false}' this build gives the pin before it exactly, 1ux7bcz 1gqps57 1pw26gc lm4vs4 q2h33q. Before that: re-pinned at the real order (src/ratings.js, CLUB_RATED, 2026-11-09): Farnham v Haslemere, the three Farnham matches, 61 v 46 (were 75 v 64); with CLUB_RATED=band this build gives the pin before it exactly, 1ux7bcz 6jcst0 jv4xeq 437myk q2h33q (AI v AI and the demo did not move). Before that: re-pinned at PR #14's club table (src/ratings.js, CLUB_RATED): Haslemere, the three Farnham matches' other side, is 64 (13), was 67 (14); with CLUB_RATED=off this build gives the pin before it exactly, 1ux7bcz 10kl4wv 1nh2ksp jmrs3q q2h33q. Before that: re-pinned at the PR #14 merge for its calmer passing (PASS_FLIGHT: the ball hangs longer and a catcher gets a moment): with PASS_FLIGHT='{"match":1,"kids":1,"grace":[0,0,0],"graceKids":0}' this build gives the old pin exactly, 12rapqh 14qny5b 1dars3e 5k7me2 1amrgpj. Before that: pinned from 2e4829d (GAME=<its index.html> HOME_PRINT=1); this build gives the same
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
const MORE = ['s-cup', 's-cabinet', 's-career-new', 's-career-club', 's-career', 's-locker'];   // screens the stand-in DOM does not list: showScreen hides and shows them too
{ const qsa = document.querySelectorAll; document.querySelectorAll = sel => (sel === '.screen' ? qsa(sel).concat(MORE.map(id => $(id))) : qsa(sel)); for (const id of MORE) $(id).hidden = true; }
const shown = () => ['s-home', 's-teams', 's-hub', 's-help', 's-join', 's-build', ...MORE].find(id => !$(id).hidden);
const fresh = () => {                                       // a new game on the web as shipped, the home on Quick Match
  S.setNative(null); S.setTier(null); S.setBought([]); S.setStarted(false);
  if (!$('m-store').hidden) S.close();
  X.setChamp(null); K.set(null); K.setHistory([]); C.set(null); I.setLeague(null); X.restore({ custom:[] });
  const s = D.settings(); s.hl = 'game'; s.myClub = null; s.myNat = null; s.cat = 'men'; s.kids = false; s.diff = 1;
  L.set(L.clean(null)); $('m-import').hidden = true; X.save(); D.goHome();
};

// 1. the markup: the bar, each headline's buttons, the top row, Title Case, no arrow
{
  const bar = [...home.matchAll(/<button class="btn hl" id="hl-([a-z]+)" data-hl="\1" role="tab" aria-controls="hp-\1" aria-selected="(?:true|false)"><svg viewBox="0 0 24 24" aria-hidden="true">[\s\S]*?<\/svg><span class="hl-name">([^<]+)<\/span><\/button>/g)];
  ok(json(bar.map(m => [m[1], m[2]])) === json([['game', 'Quick Match'], ['champ', 'Championship'], ['career', 'Career'], ['drills', 'Skills Mini Games'], ['settings', 'Settings']]) && json(H.HL) === json(bar.map(m => m[1])), `the bar: Quick Match | Championship | Career | Skills Mini Games | Settings, each a drawn picture and its name, in that order, the saves' keys kept (game, drills) (${bar.map(m => m[2]).join(' | ')})`);
  ok(/<nav class="hl-bar" id="hl-bar" role="tablist" aria-label="Menu">/.test(home) && home.indexOf('id="hl-bar"') > home.indexOf('id="hl-panels"'), 'the bar is a tablist, under the panels');
  ok(/\.hl-bar\{grid-area:bar;display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\);/.test(css) && /\.btn\.hl\{position:relative;display:flex;flex-direction:column;[^}]*min-height:54px/.test(css), 'five equal parts, each 44px and more');
  const panel = id => (home.match(new RegExp(`<div class="hl-panel hp-${id}[^"]*" id="hp-${id}" role="tabpanel" aria-labelledby="hl-${id}"( hidden)?>`)) || [])[0];
  ok(H.HL.every(panel) && !/ hidden/.test(panel('game')) && ['champ', 'career', 'drills', 'settings'].every(id => / hidden/.test(panel(id))), 'a panel a headline, Quick Match\'s showing before a line of script runs');
  ok(/<div class="hl-panel hp-game" id="hp-game"[^>]*>\s*<button class="btn primary" id="b-quick" autofocus>Play<\/button>\s*<div class="my-rec" id="my-rec" hidden><span class="my-rec-side" id="my-rec-side"><\/span><span class="my-rec-lines"><span id="my-rec-league"><\/span><span id="my-rec-record"><\/span><\/span><\/div>\s*<\/div>/.test(home) && /\.hl-panel\.hp-game \.btn\.primary\{min-height:128px;font-size:56px/.test(css), 'Quick Match: one big Play button, the primary, bigger than any other panel\'s (no 2 Players under it, on any device)');
  ok(!/id="b-two"|2 Players|Two Player/.test(home) && !/\$\('b-two'\)/.test(menus) && /^function openJoin\(\) \{/m.test(menus) && typeof D.openJoin === 'function', '2 Players has left the home on every device: no button, no listener; Two Player keeps its way in, openJoin (window.__tryline.debug.openJoin)');
  ok(/<div class="hl-go" id="hc-go" hidden>\s*<button class="btn primary" id="b-champ">Continue Championship<\/button>\s*<p class="resume-note" id="champ-note" hidden><\/p>\s*<\/div>\s*<div class="hc-new" id="hc-new">\s*<div class="seg" id="hc-tier"><\/div>\s*<div class="hc-comps" id="hc-comps"><\/div>\s*<\/div>\s*<button class="btn" id="b-cabinet" hidden>Trophy Cabinet<\/button>/.test(home), 'Championship: Continue (when one is saved) first, else the tiers and their competitions; the Trophy Cabinet under them');
  ok(/<div class="hl-panel hp-career" id="hp-career"[^>]*>\s*<button class="btn primary" id="b-career">New Career<\/button>\s*<p class="resume-note" id="career-note" hidden><\/p>/.test(home), 'Career: New Career or Continue Career, with its note');
  const drills = [...home.matchAll(/<button class="btn drill" id="pr-([a-z]+)">/g)].map(m => m[1]);
  ok(json(drills) === json(T.drills.DRILLS.map(d => d.id)) && /<button class="btn drill" id="pr-defend">[\s\S]*?<\/button>\s*<button class="btn drill" id="b-help"><span class="dc-icon" aria-hidden="true"><svg viewBox="0 0 40 40">[\s\S]*?<\/svg><\/span><span class="dc-name">How to Play<\/span><\/button>\s*<\/div>\s*<div class="pr-low">\s*<div class="pr-contact" id="pr-contact">[\s\S]*?id="pr-back"[\s\S]*?<\/div>\s*<\/div>\s*<button class="btn drill pr-grown" id="pr-grown">/.test(home) && /\.hp-drills \.drills\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/.test(css), `Skills Mini Games: every game as a big button with its picture (${drills.length}), seven and How to Play in rows of four, then Contact Games and For Grown-Ups (re-pinned for PR #14's ten games: it was eight drills and How to Play, three rows of three)`);
  const sets = [...home.matchAll(/<div class="set(?: set-[a-z]+)?"(?: id="[a-z-]+")?><span class="lbl">([^<]+)<\/span><div class="seg" data-key="([a-z]+)"/g)].map(m => m[1] + ':' + m[2]);
  ok(json(sets) === json(['Difficulty:diff', 'Sound:sound', 'Match Help:hints', 'Half Length:half', 'Camera:cam']) && /data-key="hints"[^>]*><button>On<\/button><button>Off<\/button><\/div><\/div>\s*<button class="btn" id="b-grown" hidden>Grown-Ups<\/button>\s*<div class="set set-half">/.test(home) && /data-key="cam"><button>Top<\/button><button>Low<\/button><button>Mid<\/button><button>High<\/button><\/div><\/div>\s*<\/div>\s*<\/div>\s*<nav/.test(home)
    && /\.hp-settings\.settings\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/.test(css) && /\.hp-settings \.set\{grid-template-columns:1fr;gap:4px;grid-column:span 3\}/.test(css) && /\.hp-settings \.set-diff\{grid-column:1\/-1\}/.test(css) && /\.hp-settings\.grown \.set-sound,\.hp-settings\.grown \.set-hints,\.hp-settings #b-grown\{grid-column:span 2\}/.test(css),
    `Settings: ${sets.join(', ')}; Difficulty across, Sound | Match Help, Half Length | Camera in halves, and Grown-Ups (where the store is live) a third of Sound's row, after Match Help (re-pinned for the Camera row: Grown-Ups was last, beside Half Length)`);
  ok(/<div class="home-top" id="home-top">\s*<button class="btn my-home" id="b-my" aria-label="My Team"><span class="lbl">My Team<\/span><span class="my-kits" id="my-kits"><\/span><\/button>\s*<button class="btn lk-home" id="b-locker">[\s\S]*?Locker<\/button>\s*<button class="btn im-home" id="b-import" hidden>Add Your Team<\/button>\s*<\/div>/.test(home), 'the top row: My Team (its kits and names), Locker, Add Your Team');
  ok(/<header class="mark">\s*<h1 class="word"[\s\S]*?<\/h1>\s*<p class="eyebrow" id="home-tag">Mobile Rugby&nbsp;· Sevens<\/p>[\s\S]*?<div class="app-tools" id="app-tools" hidden>[\s\S]*?id="b-install" hidden>Install Game<\/button>\s*<button class="app-action" id="b-update" hidden>Update Game<\/button>\s*<\/div>\s*<\/header>/.test(home), 'the logo stays, with Install Game and Update Game as small app actions under it');
  const text = s => s.replace(/<[^>]+>/g, '').trim();
  const labels = [...home.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map(m => text(m[1])).filter(Boolean).concat([...home.matchAll(/<span class="lbl">([^<]+)<\/span>/g)].map(m => m[1]));
  ok(labels.length >= 30 && labels.every(titled), `every label on the home is Title Case (${labels.filter(l => !titled(l)).join(', ') || labels.length + ' labels'})`);
  ok(!/[←-⇿▲-◅—]|<summary|<details/.test(home + menus.slice(menus.indexOf('/* home.'), menus.indexOf('/* two player'))), 'no arrow glyph, no em dash and no disclosure on the home');
  ok(!/id="t-comp"|id="s-practice"|id="b-more"|id="b-practice"|class="row2 home-row"|class="row2 learn-row"/.test(html), 'the old rows are gone: no competition row on the team screen, no Training Ground screen, no More Settings');
  ok(!/>Game<|Training Drills|Training Ground|Import Data|Import Club|Back to Training/.test(html) && !/'Import Club'|'Back to Training'|Training Drills|Import Data/.test(menus + fs.readFileSync(new URL('../src/import.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../src/practice.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../src/ui-store.js', import.meta.url), 'utf8')), 'the old names are gone from the markup and the screens\' code: Game, Training Drills, Training Ground, Import Data, Import Club, Back to Training');
}

// 2. the headlines: shown one at a time, remembered, validated, moved along with the arrow keys
{
  fresh();
  ok(D.settings().hl === 'game' && !$('hp-game').hidden && ['champ', 'career', 'drills', 'settings'].every(k => $('hp-' + k).hidden), 'a new game opens on Quick Match');
  for (const k of H.HL) {
    $('hl-' + k).click();
    ok(D.settings().hl === k && !$('hp-' + k).hidden && H.HL.filter(o => o !== k).every(o => $('hp-' + o).hidden) && saved().settings.hl === k, `pressing ${k} shows its buttons only, and is saved`);
  }
  X.load(); D.goHome();
  ok(D.settings().hl === 'settings' && !$('hp-settings').hidden, 'reloaded, the home opens on the headline last chosen');
  X.restore({ settings:{ hl:'nope' } }); ok(D.settings().hl === 'settings', 'an unknown headline in a save is ignored');
  X.restore({ settings:{ hl:7 } }); ok(D.settings().hl === 'settings', 'so is one of the wrong type');
  const keys = (key) => $('hl-bar').fire('keydown', { key });
  H.select('game');
  keys('ArrowRight'); ok(D.settings().hl === 'champ', 'Right moves along the bar to Championship, and shows it');
  keys('ArrowRight'); keys('ArrowRight'); keys('ArrowRight'); keys('ArrowRight');
  ok(D.settings().hl === 'settings', 'and stops at Settings, the end');
  keys('ArrowLeft'); ok(D.settings().hl === 'drills', 'Left moves back');
  keys('Home'); ok(D.settings().hl === 'game', 'Home goes to the first');
  keys('End'); ok(D.settings().hl === 'settings', 'End to the last');
  keys('Enter'); ok(D.settings().hl === 'settings', 'any other key leaves it');
  ok(/DEFAULT_FOCUS\['s-home'\] = homeFirst;/.test(menus) && /const b = focus && !focus\.hidden && !\(focus\.closest && focus\.closest\('\[hidden\]'\)\) \? focus : homeFirst\(\);/.test(menus), 'a controller\'s first press and the focus on going home: the chosen headline\'s first button (measured in the browser part)');
  fresh();
}

// 3. each headline's buttons go where they did
{
  fresh();
  $('b-quick').click(); ok(shown() === 's-teams' && D.pickMode() === 'quick' && $('t-title').textContent === 'Pick Your Team' && $('t-eyebrow').textContent === 'Quick Match', 'Play opens Quick Match\'s Pick Your Team');
  D.goHome(); D.openJoin(); ok(shown() === 's-join', 'Two Player\'s own entry, openJoin, still opens the join screen'); $('j-back').click();
  H.select('drills');
  T.drills.DRILLS.forEach(d => { $('pr-' + d.id).click(); ok(T.drills.state() && T.drills.state().id === d.id, `${d.name} starts its drill`); T.practice.choose(); });
  ok(shown() === 's-home' && D.settings().hl === 'drills', 'Back to Skills: the home, on Skills Mini Games');
  $('b-help').click(); ok(shown() === 's-help', 'How to Play opens its screen'); $('h-back').click(); ok(shown() === 's-home', 'and comes back');
  $('b-locker').click(); ok(shown() === 's-locker', 'the Locker opens'); $('lk-back').click();
  H.select('career'); $('b-career').click(); ok(shown() === 's-career-new', 'New Career opens New Player'); D.goHome();
  H.select('settings');
  const seg = k => [...document.querySelectorAll('.seg[data-key]')].find(g => g.dataset.key === k);
  ok(['diff', 'sound', 'hints', 'half'].every(seg), 'Settings carries Difficulty, Sound, Match Help and Half Length');
  seg('half').children[1].click(); ok(D.settings().half === 1 && saved().settings.half === 1, 'Half Length is pressed straight from Settings');   // the stand-in segs have two buttons each
  seg('half').children[0].click(); seg('sound').children[1].click(); ok(D.settings().sound === false, 'Sound');
  seg('sound').children[0].click(); seg('hints').children[1].click(); ok(D.settings().hints === false && D.settings().coach === false, 'Match Help, the hints and the coach together');
  seg('hints').children[0].click(); seg('diff').children[0].click(); ok(D.settings().kids === true && D.settings().diff === 0, 'Difficulty: Kids');
  seg('diff').children[1].click(); { const g = T.kids.gate(); ok(g && D.settings().kids === true, 'Easy from Kids asks a grown-up first (PR #14: only a grown-up leaves the Kids level)'); if (g) for (const d of g.answer) T.kids.type(d); }
  ok(D.settings().kids === false && D.settings().diff === 0, 'Easy');
  D.settings().diff = 1;
  ok($('b-grown').hidden && !$('hp-settings').classList.contains('grown'), 'no Grown-Ups on the web as shipped');
  S.setNative(true); S.setStarted(true); D.goHome();
  ok(!$('b-grown').hidden && $('hp-settings').classList.contains('grown'), 'in the app Grown-Ups shares Sound and Match Help\'s row');
  $('b-grown').click(); ok(!$('m-store').hidden && S.ui().mode === 'grown', 'and opens the Grown-Ups panel, as it did'); S.close();
  const s = D.settings(); s.kids = true; s.diff = 0; s.kidsR = 1; s.kidsTop = 9; D.goHome();
  ok(T.kids.ready() && $('b-grown').classList.contains('note') && $('hl-settings').classList.contains('note'), 'Move Up to Easy waiting: its dot on Grown-Ups and on the Settings headline');
  s.kids = false; s.diff = 1; s.kidsR = 0; s.kidsTop = 0; D.goHome();
  ok(!$('hl-settings').classList.contains('note'), 'and gone with it');
  fresh();
}

// 4. the gates: every paid entry keeps its Full Game gate and lock; Quick Match, Skills Mini Games, Settings, the Locker and My Team stay free
{
  fresh(); S.setTier('free'); D.goHome();
  ok(['hl-champ', 'hl-career', 'b-career'].every(id => $(id).classList.contains('locked')) && ['hl-game', 'hl-drills', 'hl-settings', 'b-quick', 'b-my', 'b-locker', 'b-help'].every(id => !$(id).classList.contains('locked')) && !/id="b-two"/.test(html), 'free: the Championship and Career headlines and New Career locked; Quick Match and its Play, Skills Mini Games, Settings, My Team and the Locker not (and no 2 Players to lock)');
  ok($('b-import').classList.contains('locked'), 'Add Your Team locked: it is the Super Fan\'s');
  ok(/if \(seg && seg\.children\[3\]\) storeMark\(seg\.children\[3\], 'hard'\);/.test(fs.readFileSync(new URL('../src/ui-store.js', import.meta.url), 'utf8')) && /if \(key === 'diff' && i === 3 && !storeGate\('hard'/.test(menus), 'Hard keeps its lock and its gate in Settings');
  H.champPick('eng'); ok(!$('m-store').hidden && S.ui().feature === 'champ' && shown() === 's-home', 'a competition opens the Unlock card, not the team screen'); S.close();
  $('b-career').click(); ok(!$('m-store').hidden && S.ui().feature === 'career', 'New Career opens the Unlock card'); S.close();
  $('b-import').click(); ok(!$('m-store').hidden && S.ui().feature === 'import' && $('m-import').hidden && $('st-title').textContent === 'Add Your Team', 'Add Your Team opens the Unlock card, named Add Your Team'); S.close();
  $('b-quick').click(); ok($('m-store').hidden && shown() === 's-teams', 'Quick Match\'s Play is free'); D.goHome();
  $('b-my').click(); ok($('m-store').hidden && shown() === 's-teams' && D.pickMode() === 'my', 'My Team is free'); D.goHome();
  $('b-locker').click(); ok($('m-store').hidden && shown() === 's-locker', 'the Locker is free'); D.goHome();
  $('pr-cones').click(); ok($('m-store').hidden && T.drills.state(), 'a drill is free'); T.practice.choose();
  S.setTier(null); D.goHome();
  ok(['hl-champ', 'hl-career', 'b-career', 'b-import'].every(id => !$(id).classList.contains('locked')), 'the web as shipped (STORE_WEB_TIER full): no lock anywhere');
  fresh();
}

// 5. Championship: Continue first, the tiers and their competitions, each with only its sides, and the Trophy Cabinet
{
  fresh(); H.setTier(0); H.select('champ');
  const comps = t => H.comps(t).map(c => c[0]).join();
  ok(comps(0) === 'int,world,tour' && H.comps(0).map(c => c[1]).join() === 'Championship,World Cup,Home Nations Tour', 'International: Championship, World Cup, Home Nations Tour');
  ok(comps(1) === 'eng,en2,fra,cel,sco,rsa,aus,nzl,jpn' && H.comps(1).map(c => c[1]).join() === X.TEAM_LISTS.filter(l => l.tier === 1).map(l => l.name).join(), 'National: each country\'s league');
  ok(comps(2) === 'sur,cty' && H.comps(2).map(c => c[1]).join() === 'Surrey,Counties', 'Local: Surrey and Counties (PR #14\'s), and no My League without an import');
  ok(['eng', 'fra', 'cel', 'rsa'].every(K.euroLeague) && !['en2', 'sco', 'aus', 'nzl', 'jpn', 'sur', 'cty', 'my', 'int'].some(K.euroLeague), 'the European Cup\'s trophy on the four leagues whose winner goes on to it');
  H.setTier(1); H.champ();
  ok(/id="hc-eng" data-comp="eng"><span class="cup-trophy" data-kind="euro" data-metal="gold" role="img" aria-label="European Cup"><\/span><span>England<\/span>/.test($('hc-comps').innerHTML) && /id="hc-sco" data-comp="sco"><span>Scotland<\/span>/.test($('hc-comps').innerHTML) && /id="hc-en2" data-comp="en2"><span>England 2<\/span>/.test($('hc-comps').innerHTML) && $('hc-comps').className === 'hc-comps n9' && /\.hc-comps\.n9\{grid-template-columns:repeat\(20,minmax\(0,1fr\)\)\}\s*\/\*[^*]*\*\/\s*\.hc-comps\.n9 > \.btn\{grid-column:span 4\}\s*\.hc-comps\.n9 > \.btn:nth-child\(n\+6\)\{grid-column:span 5\}/.test(css), 'the trophy, in the European Cup\'s gold, no prose; nine leagues (England 2 is PR #14\'s) in two rows, five then four, each in equal parts');
  ok(!$('hc-new').hidden && $('hc-go').hidden && $('b-cabinet').hidden, 'nothing saved: the competitions, and no Trophy Cabinet before a season is finished');
  // each competition's team screen: only its sides
  const grid = () => $('t-grid').innerHTML, cards = () => (grid().match(/class="team[ "]/g) || []).length - (grid().match(/class="team create/g) || []).length;
  for (const l of X.TEAM_LISTS.filter(l => l.tier > 0)) {
    H.champPick(l.key);
    ok(shown() === 's-teams' && D.pickMode() === 'champ' && K.comp() === 'league' && X.teamPool() === l.key && $('t-tier').hidden && $('t-nat').hidden && $('t-loc').hidden && cards() === l.teams.length && l.teams.every(t => grid().includes('>' + X.listName(t) + '<')) && $('t-eyebrow').textContent === 'Championship · ' + l.name, `${l.name}: its ${l.teams.length} sides only, no lists to wander off to`);
    D.goHome();
  }
  H.champPick('int');
  ok(X.teamPool() === 'int' && cards() === 12 && X.natList('men').every(t => grid().includes('>' + X.listName(t) + '<')) && $('t-eyebrow').textContent === 'Championship · International' && $('t-default').textContent === 'Play as England', 'International Championship: the twelve, England (My Team\'s country) picked for you on Play as England');
  $('t-default').click();
  ok(X.champ() && X.champ().teams[X.champ().user].id === 'ENG' && X.champ().teams.every(t => X.SIX_NATIONS.includes(t.id)) && shown() === 's-hub', 'and Play as England starts the Six Nations');
  X.setChamp(null); D.goHome();
  H.champPick('int'); D.pickTeam(X.natList('men')[0]);
  ok(X.champ().teams[X.champ().user].id === 'RSA' && !X.champ().teams.some(t => X.SIX_NATIONS.includes(t.id)), 'or change it there: South Africa plays the other six');
  X.setChamp(null); D.goHome();
  H.champPick('world');
  ok(K.comp() === 'world' && $('t-title').textContent === 'Pick Your Nation' && $('t-eyebrow').textContent === 'World Cup' && cards() === 12 && $('t-default').textContent === 'Play as England' && !$('t-default').hidden && !/Create Team|Add Your Team/.test(grid()), 'World Cup: the twelve, England picked for you');
  $('t-default').click();
  ok(K.get() && K.get().id === 'world' && K.get().teams[K.get().user].id === 'ENG' && shown() === 's-cup', 'Play as England starts England\'s World Cup');
  K.set(null); D.goHome();
  H.champPick('tour');
  ok(K.comp() === 'tour' && $('t-title').textContent === 'Pick the Host' && cards() === 3 && /Tour /.test($('t-default').textContent) && !/My Team/.test(grid()), 'Home Nations Tour: the three hosts, the one in turn on the primary, nothing marked My Team');
  D.goHome();
  // a saved championship or cup: Continue first
  X.newChamp(X.NATIONS[0], X.NATIONS.slice(1, 6)); D.goHome();
  ok(!$('hc-go').hidden && $('hc-new').hidden && $('b-champ').textContent === 'Continue Championship' && !$('champ-note').hidden, 'a championship under way: Continue Championship, with its note, and the competitions wait');
  $('b-champ').click(); ok(shown() === 's-hub', 'which goes to its hub');
  H.champPick('eng'); ok(shown() === 's-hub' && X.champ().teams[0].id === 'ENG', 'and a competition pressed now goes there too, the championship kept');
  $('hub-reset').click(); $('hub-reset').click();
  ok(X.champ() === null && shown() === 's-home', 'Start Fresh: home');
  D.goHome(); ok(D.settings().hl === 'champ' && !$('hc-new').hidden && $('b-cabinet').hidden, 'the competitions are back; no Trophy Cabinet until a season is finished');
  { X.newChamp(X.NATIONS[0], X.NATIONS.slice(1, 6)); const c = X.champ(); for (let i = 0; i < 5; i++) { c.results.push(c.fixtures[i].map(p => ({ h:p[0], a:p[1], hs:20, as:10, ht:3, at:1 }))); c.round++; } X.save(); X.setChamp(null); X.save(); }
  D.goHome(); ok(K.history().length === 1 && !$('b-cabinet').hidden, 'a season finished: the Trophy Cabinet, under the competitions');
  $('b-cabinet').click(); ok(shown() === 's-cabinet' && /England/.test($('home-history').innerHTML), 'the Trophy Cabinet opens on its own screen');
  $('cab-back').click(); ok(shown() === 's-home', 'and Back to Menu comes home');
  K.set(K.cupNew('world', { user:X.natList('men')[4], cat:'men' })); D.goHome();
  ok(!$('hc-go').hidden && $('hc-new').hidden && /data-kind="world"[\s\S]*World Cup · <\/span>Pool [ABCD]$/.test($('champ-note').innerHTML) && $('b-champ').textContent === 'Continue Championship', 'a cup under way: Continue Championship, its note the cup');
  $('b-champ').click(); ok(shown() === 's-cup', 'which goes to the cup');
  K.set(null);
  // My League: Local, with an import
  I.setLeague({ teams:X.CLUBS.slice(1, 6).map(t => ({ ...t, key:'lg-' + t.id })) }); D.goHome(); H.setTier(2); H.champ();
  ok(comps(2) === 'sur,cty,my' && /id="hc-my" data-comp="my"><span>My League<\/span>/.test($('hc-comps').innerHTML), 'with an import, My League beside Surrey and Counties');
  H.champPick('my'); ok(X.teamPool() === 'my' && $('t-eyebrow').textContent === 'Championship · My League', 'My League\'s team screen');
  // the European Cup is still reached by winning a European league
  fresh(); H.champPick('eng'); D.pickTeam(X.ENGLAND[0]);
  const c = X.champ(), order = [c.user, 1, 2, 3, 4, 5].filter((v, i, a) => a.indexOf(v) === i), rk = i => order.indexOf(i);
  c.results = c.fixtures.map(rd => rd.map(([h, a]) => (rk(h) < rk(a) ? { h, a, hs:20, as:0, ht:4, at:0 } : { h, a, hs:0, as:20, ht:0, at:4 }))); c.round = 5; D.renderHub();
  ok(/id="hub-euro"/.test($('hub-next').innerHTML), 'a European league won from the home\'s England: Play European Cup');
  $('hub-later').click(); $('hub-new').click();
  ok(X.champ() === null && shown() === 's-home' && D.settings().hl === 'champ' && !$('hc-new').hidden, 'New Championship: back to the home\'s Championship, where the competitions are');
  fresh();
}

// 6. My Team: the setting, its defaults, old saves, and how each mode uses it
{
  fresh();
  ok(H.myClub() === X.CLUBS[0] && H.myNat(null).id === 'ENG' && D.settings().myClub === null && D.settings().myNat === null, 'a new game: Farnham and England');
  ok(/Farnham/.test($('my-kits').innerHTML) && /England/.test($('my-kits').innerHTML) && /--kit:/.test($('my-kits').innerHTML), 'the home\'s My Team: both kits and names, on one button');
  $('b-my').click();
  ok(shown() === 's-teams' && D.pickMode() === 'my' && $('t-eyebrow').textContent === 'My Team' && $('t-title').textContent === 'Pick Your Club' && X.teamPool() === 'sur' && !$('t-tier').hidden && !$('t-yours').hidden && $('t-change').hidden && $('t-default').hidden, 'My Team: Pick Your Club on its list, the tiers to look anywhere, the bar showing both');
  ok(/data-i="0" aria-pressed="true">/.test($('t-grid').innerHTML) && /class="team picked"/.test($('t-grid').innerHTML) && /Create Team/.test($('t-grid').innerHTML) && /<span class="tname">Add Your Team<\/span>/.test($('t-grid').innerHTML), 'Farnham marked, the cards to pick from, Create Team and Add Your Team among them');
  X.tierPick(1); X.poolPick('eng'); H.myPick(X.ENGLAND[0]);
  ok(D.settings().myClub === 'BTH' && saved().settings.myClub === 'BTH' && shown() === 's-teams' && /Bath/.test($('t-mine').innerHTML), 'a club picked: Bath, saved, the screen stays');
  X.tierPick(0);
  ok($('t-title').textContent === 'Pick Your Country' && (($('t-grid').innerHTML.match(/class="team[ "]/g) || []).length === 12) && !/Create Team|Add Your Team/.test($('t-grid').innerHTML), 'International: Pick Your Country, the category\'s twelve and nothing else');
  H.myPick(X.natList('men').find(t => t.id === 'WAL'));
  ok(D.settings().myNat === 'WAL' && D.settings().myClub === 'BTH' && /Wales/.test($('t-mine').innerHTML), 'a nation picked: the country, the club kept');
  X.catPick('women'); H.myPick(X.natList('women').find(t => t.id === 'CDN')); X.catPick('men');
  ok(D.settings().myNat === 'CDN' && H.myNat('men') === null && H.myNat('women').id === 'CDN' && H.myNat(null).id === 'CDN', 'Canada, from the women\'s twelve: no side on the men\'s list, Canada still on the home');
  H.myPick(X.natList('men').find(t => t.id === 'WAL'));
  D.goHome(); ok(/Bath/.test($('my-kits').innerHTML) && /Wales/.test($('my-kits').innerHTML), 'home: Bath and Wales');
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
  X.restore({ custom:[] }); X.restore({ settings:{} }); ok(D.settings().myClub === null && H.myClub() === X.CLUBS[0], 'deleted: the default again');
  I.setLeague({ teams:X.CLUBS.slice(1, 6).map(t => ({ ...t, key:'lg-' + t.id + 'X', id:t.id })) });
  H.myPick(I.league().teams[0]); ok(D.settings().myClub === I.league().teams[0].key && H.myPool() === 'my', 'a side of My League can be My Team');
  I.setLeague(null); ok(H.myClub() === X.CLUBS[0], 'its league removed: the default');
  fresh();
  // Quick Match (its Play): offered first in Player 1's list, marked, never picked or started
  D.settings().myClub = 'BTH'; D.settings().myNat = 'WAL';
  const demo = T.M;
  $('b-quick').click();
  const first = () => $('t-grid').innerHTML.split('data-i="1"')[0];
  ok(T.M === demo && T.M.demo && $('t-title').textContent === 'Pick Your Team' && $('t-yours').hidden && $('t-default').hidden && X.teamPool() === 'eng', 'Quick Match: Pick Your Team on My Team\'s list, nothing in the bar, no Play as, nothing started');
  ok(/>Bath</.test(first()) && /<span class="gap mine">My Team<\/span>/.test(first()) && ($('t-grid').innerHTML.match(/gap mine/g) || []).length === 1 && !/picked/.test(first()), 'Bath first, marked My Team, not picked');
  X.tierPick(0);
  ok(/>Wales</.test(first()) && /My Team/.test(first()) && !/picked/.test(first()), 'International: Wales first, marked My Team');
  X.tierPick(2);
  ok(/>Farnham</.test(first()) && !/My Team/.test($('t-grid').innerHTML), 'a list without it: as it was, unmarked');
  D.pickTeam(X.CLUBS[2]);
  ok(D.quickPick && false || $('t-title').textContent === 'Pick Opponent' && /Guildford/.test($('t-mine').innerHTML) && T.M === demo, 'another side picked: his; now the opponent');
  X.tierPick(1); X.poolPick('eng');
  ok(/>Bath</.test(first()) === true && !/My Team/.test($('t-grid').innerHTML), 'the opponents\' list: in its own order, nothing marked');
  // Pick Opponent puts the picked side's own league rivals first (the real order, 2026-11-09): Farnham's first opponent is Wimbledon, a fair derby
  {
    const list = () => T.yourTeam.teamList(), ids = () => list().map(t => t.id), sur = X.CLUBS.map(t => t.id);
    $('t-change').click(); X.tierPick(2); X.poolPick('sur'); D.pickTeam(X.CLUBS[0]);
    const opp = list().find(t => t.id !== 'FAR');
    ok($('t-title').textContent === 'Pick Opponent' && ids()[0] === 'FAR' && opp.id === 'WIM' && opp.league === X.CLUBS[0].league && X.overallOf(X.CLUBS[0]) - X.overallOf(opp) <= 3, `Farnham picked: the first opponent is Wimbledon, his own league's (${ids().slice(0, 3).join(' ')}, ${X.overallOf(X.CLUBS[0])} v ${X.overallOf(opp)})`);
    ok(ids().length === sur.length && [...ids()].sort().join() === [...sur].sort().join() && ids().filter(id => id !== 'WIM').join() === sur.filter(id => id !== 'WIM').join(), 'only the order changes: the same sides, the rest in the list\'s own order');
    X.poolPick('cty'); const c = ids();
    ok(c.join() === X.COUNTIES.map(t => t.id).join(), `a list without a rival of his: in its own order (${c.slice(0, 3).join(' ')})`);
    $('t-change').click(); X.poolPick('sur'); D.pickTeam(X.CLUBS.find(t => t.id === 'GDN'));
    ok(ids().join() === sur.join(), 'a side with no rival on its list leaves the list as it is (Guildfordians on Surrey)');
  }
  // 2 Players (off the home; its own entry, openJoin): Player 1's list only
  D.openJoin(); D.openTeams('two');
  ok(/>Bath</.test(first()) && /My Team/.test(first()) && D.twoSel().picking === 0 && !D.twoSel().teams[1], '2 Players: Bath first in Player 1\'s list, marked');
  D.pickTeam(X.CLUBS[0]);
  ok(D.twoSel().picking === 1 && !/My Team/.test($('t-grid').innerHTML), 'Player 2\'s: nothing marked');
  D.setTwo(false); D.goHome();
  // Championship: picked for you, and changed there
  H.champPick('eng');
  ok($('t-default').textContent === 'Play as Bath' && !$('t-default').hidden && /My Team/.test($('t-grid').innerHTML), 'Championship · England: Play as Bath, the card marked');
  D.pickTeam(X.ENGLAND[1]);
  ok(X.champ() && X.champ().teams[X.champ().user].id === X.ENGLAND[1].id, 'or another club starts it instead');
  X.setChamp(null); D.goHome();
  H.champPick('fra'); ok($('t-default').hidden, 'a league without My Team\'s club: nothing picked for you');
  D.goHome(); D.settings().cat = 'women'; H.champPick('int');
  ok($('t-default').textContent === 'Play as Wales Women', 'International on Women: Play as Wales Women');
  D.settings().cat = 'men'; D.goHome();
  // a new Career: his club picked for you, Change Club to change it
  C.set(null); H.select('career'); $('b-career').click();
  ok(shown() === 's-career-new' && C.draft().club.id === 'BTH' && C.draft().league === 'eng' && /Bath/.test($('cn-mine').innerHTML), 'New Career: Bath, of England\'s league');
  C.clubPick(X.CLUBS[3]); ok(C.draft().club === X.CLUBS[3], 'Change Club picks another');
  fresh();
}

// 6b. My Team's club on the home: its stars and last season (PR #14's Your Team info, the owner's "main's bottom bar + PR #14's Your Team info"),
//     under Play, only where the club has real figures
{
  fresh();
  const R5 = T.ratings, rec = () => [$('my-rec').hidden, $('my-rec-side').innerHTML, $('my-rec-league').textContent, $('my-rec-record').textContent];
  const at = id => { D.settings().myClub = id; D.goHome(); return rec(); };
  let r = rec();
  ok(!r[0] && r[1] === '<b>Farnham</b>' + R5.starsHtml(3.5) && r[2] === 'Regional 1 South Central · 7th Last Season' && r[3] === 'Won 10 · Lost 12 · 640 Scored · 646 Conceded', `a new game: Farnham, 3.5 stars, 7th in Regional 1 South Central, won 10, lost 12, 640 scored, 646 conceded (${r.slice(1).join(' | ')})`);   // re-pinned at the real order (2026-11-09): Farnham is 61, 3.5 stars (was 75, 4.5)
  ok(R5.starsHtml(3.5).includes('aria-label="3.5 Stars"') && R5.starsOf(X.CLUBS[0]) === 3.5, 'the stars carry their words for a screen reader');
  r = at('NTH');
  ok(r[2] === 'English Premiership · 1st Last Season' && r[3] === 'Won 14 · Drew 1 · Lost 3 · 693 Scored · 536 Conceded' && r[1].includes('<b>Northampton</b>'), `a draw shows when there was one (${r[3]})`);
  ok(at('LWE')[2] === 'English Premiership · 9th Last Season' && at('COB')[2] === 'Counties 1 Surrey/Sussex · 1st Last Season' && at('MTB')[2] === 'Top 14 · 14th Last Season' && at('BED')[2] === 'English Championship · 2nd Last Season' && at('JHB')[2] === 'United Rugby Championship · 7th Last Season' && at('MBO')[2] === 'Currie Cup · 3rd Last Season', 'the ordinals read right, and every list with figures has them (England 2 and the Currie Cup too)');
  for (const id of ['QUI', 'MEL', 'WLG', 'KOB', 'AYR']) { r = at(id); ok(r[0] && !r[1] && !r[2] && !r[3], `${id}: no figures, so nothing under Play, never an invented line`); }
  D.settings().myClub = null;
  T.stamina.openBuilder(null); $('bd-name').value = 'Red Lions'; T.stamina.draft().name = 'Red Lions'; $('bd-save').click();
  const mine = X.custom().find(t => t.name === 'Red Lions'); H.myPick(mine); D.goHome();
  ok($('my-rec').hidden && !$('my-rec-league').textContent, 'a team you made: none');
  X.restore({ custom:[] }); D.settings().myClub = null;
  I.setLeague(I.clean({ teams:[{ ...X.CLUBS[1], key:'lg-QQQ', id:'QQQ', name:'Quarry', league:'Fake', place:1, w:9, d:0, l:0, pf:1, pa:0 }] })); H.myPick(I.league().teams[0]); D.goHome();
  ok(D.settings().myClub === 'lg-QQQ' && $('my-rec').hidden && !('league' in I.league().teams[0]), 'a My League side: none, even one handed figures (a league is kept through cleanImportLeague, which keeps no line)');
  I.setLeague(null); fresh();
  const panel = home.slice(home.indexOf('id="hp-game"'), home.indexOf('id="hp-champ"'));
  ok((panel.match(/<button/g) || []).length === 1 && /<div class="my-rec" id="my-rec" hidden>/.test(panel), 'Play is still the panel\'s one button: the club\'s line under it is not a button (My Team at the top is the way in)');
  ok(!/\b(he|his|him|she|her)\b/i.test(rec().slice(1).join(' ').replace(/<[^>]+>/g, ' ')) && titled('Won 10 · Lost 12 · 640 Scored · 646 Conceded') && titled('Regional 1 South Central · 7th Last Season'), 'no he or she, and its words in Title Case');
  ok(/\.my-rec\{display:flex;[^}]*\}/.test(css) && /\.my-rec\[hidden\]\{display:none\}/.test(css), 'its style: one row, hidden when there are no figures');
}

// 7. Add Your Team: today's import, then Make This My Team | Not Now
{
  fresh();
  ok(!$('b-import').hidden && /id="b-import" hidden>Add Your Team</.test(html), 'on the web as shipped: Add Your Team shows (its card says it works in the app)');
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
  ok($('m-import').hidden && D.settings().myClub === null && shown() === 's-home' && /Farnham/.test($('my-kits').innerHTML), 'Not Now: My Team as it was, home');
  offer(); $('im-make').click();
  ok($('m-import').hidden && D.settings().myClub === club.key && H.myClub() === club && /Godalming/.test($('my-kits').innerHTML) && saved().settings.myClub === club.key, 'Make This My Team: it is, saved, on the home');
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
  D.openTeams('quick'); X.tierPick(0);
  const leg = L.legends('men')[0];
  ok(/data-legend="1"/.test($('t-grid').innerHTML) && !$('t-grid').innerHTML.includes('locked'), 'they join International, with no lock on the web as shipped');
  S.setTier('free');
  ok(!S.has('legends') && L.legends('men').length === 2, 'free: still unlocked, not playable');
  D.renderTeams();
  D.pickTeam(leg);
  ok(!$('m-store').hidden && S.ui().feature === 'legends' && $('st-title').textContent === 'Legends' && D.quickPick === undefined || (!$('m-store').hidden && S.ui().feature === 'legends'), 'picking one opens the Unlock card for Legends');
  ok(shown() === 's-teams' && $('t-title').textContent === 'Pick Your Team', 'and nothing is picked');
  S.close();
  ok(/function storeTeamsRender\(\)[\s\S]*?for \(const b of \$\('t-grid'\)\.querySelectorAll\('\[data-legend\]'\)\) storeMark\(b, 'legends'\);/.test(fs.readFileSync(new URL('../src/ui-store.js', import.meta.url), 'utf8')), 'its card carries the lock (storeMark)');
  ok(/for \(const el of body\.querySelectorAll\('\[data-legend\]'\)\) storeMark\(el, 'legends'\);/.test(fs.readFileSync(new URL('../src/ui-locker.js', import.meta.url), 'utf8')) && /data-legend="1" role="group"/.test(fs.readFileSync(new URL('../src/ui-locker.js', import.meta.url), 'utf8')), 'and so does its tile in the Locker\'s Legends');
  S.setTier(null); S.setNative(true); S.setStarted(true);
  ok(!S.has('legends'), 'the app with nothing bought: locked');
  S.setBought(['tryline.full']);
  ok(S.has('legends'), 'with the Full Game: played');
  D.openTeams('quick'); X.tierPick(0); D.pickTeam(leg);
  ok($('m-store').hidden && $('t-title').textContent === 'Pick Opponent' && /New Zealand 1987/.test($('t-mine').innerHTML), 'picked: played as');
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
// 10. In Chromium (where Playwright is installed): the home fits 844x390 and 667x375 with no scroll in every state, on every headline;
//     the keyboard and a controller reach the bar and every button; the panel's buttons never squeeze under 44px.
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
  const SAVE = { settings:{ tut:['past', 'pass', 'tackle', 'block', 'scrum', 'lineout', 'goal', 'drop'], coach:false, played:5 } };
  // Settings row by row, at every size (the Settings fit: Difficulty's label beside its control at 320px tall once moved its segment right,
  // and the ring skipped a row): the web's halves and the thirds where Grown-Ups shows (the free web, the app), desk or not. Down from every
  // control lands on the row under it, the last row's on the Settings headline, never two rows down; Left and Right never two rows away either
  const settingsRows = () => {
    const T = window.__tryline, S = T.store, st = T.debug.settings(), $ = id => document.getElementById(id), panel = $('hp-settings'), out = { rows:[], moves:0, bad:[] };
    const box = el => el.getBoundingClientRect(), vis = el => !!el && !el.hidden && !el.closest('[hidden]') && box(el).width > 0;
    const name = el => !el ? 'nothing' : el.id || (el.closest('.seg') ? el.closest('.seg').dataset.key + ':' : '') + el.textContent.trim();
    for (const desk of [false, true]) for (const store of ['web', 'free', 'app']) {
      const app = store === 'app', at = store + (desk ? ' desk' : '');
      S.setNative(app); S.setStarted(app); S.setBought([]); S.setTier(store === 'free' ? 'free' : null);
      st.kids = app; st.diff = app ? 0 : 1; st.hl = 'settings'; document.body.classList.toggle('desk', desk); T.debug.goHome(); T.home.ring(null);
      const btns = [...panel.querySelectorAll('button')].filter(vis), foot = el => box(el.closest('.set') || el).bottom;   // a control's row: its setting's foot (Grown-Ups stands on its row's)
      const feet = btns.map(foot).sort((a, b) => a - b).filter((f, i, a) => !i || f - a[i - 1] > 8);
      const row = el => !el ? -1 : panel.contains(el) ? feet.findIndex(f => Math.abs(foot(el) - f) <= 8) : el === $('hl-settings') ? feet.length : -2;
      out.rows.push(feet.length);
      for (const b of btns) {
        const r = row(b);
        T.home.ring(b); const down = T.navMove(0, 0, 1); out.moves++;
        if (row(down) !== r + 1) out.bad.push(`${at}: Down from ${name(b)} to ${name(down)}`);
        for (const dx of [-1, 1]) { T.home.ring(b); const to = T.navMove(0, dx, 0); out.moves++; if (to && panel.contains(to) && Math.abs(row(to) - r) > 1) out.bad.push(`${at}: ${dx < 0 ? 'Left' : 'Right'} from ${name(b)} to ${name(to)}`); }
      }
    }
    S.setNative(false); S.setStarted(false); S.setTier(null); st.kids = false; st.diff = 1; st.hl = 'game'; document.body.classList.remove('desk'); T.home.ring(null); T.debug.goHome();
    return out;
  };
  const rowsOk = (kind, r) => ok(r.rows.length === 6 && r.rows.every(n => n === 3) && !r.bad.length, `${kind}: Settings in three rows (the web, the free web, the app, desk or not), Down from every control on the row under it (the last row's on the Settings headline), Left and Right never two rows away (${r.bad.slice(0, 4).join(', ') || r.moves + ' moves'}; rows ${r.rows.join(' ')})`);
  try {
    for (const [w, h] of [[844, 390], [667, 375]]) for (const touch of [true, false]) {
      const ctx = await browser.newContext({ viewport:{ width:w, height:h }, deviceScaleFactor:1, isMobile:touch, hasTouch:touch, serviceWorkers:'block' });
      const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(s => { try { localStorage.setItem('tryline.v1', JSON.stringify(s)); } catch (e) { /* blocked */ } }, SAVE);
      await page.goto(base + 'index.html', { waitUntil:'load' }); await page.evaluate(() => document.fonts.ready);
      const kind = `${w}x${h} ${touch ? 'touch' : 'desk'}`;
      // every state: desk or not (2 Players showed on a desk; now it shows on neither), the app (Grown-Ups) or the web (Add Your Team), Install and Update showing or not, a Trophy
      // Cabinet or not, nothing saved, a championship and a career, or a cup, the free tier's locks or not, and in the app a Super Fan
      // (the badge under the logo, two lines: it must not widen the logo's column and squeeze My Team), with the plain shield or a club's
      // crest, the home in the club's colours and its trophy putting the Trophy Cabinet on the home; on every headline
      await page.evaluate(() => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = 'crests/test.svg'; }));   // the stand-in crest, loaded once
      const states = await page.evaluate(() => {
        const T = window.__tryline, X = T.teams, K = T.cups, out = [];
        const box = el => el.getBoundingClientRect(), vis = el => !!el && !el.hidden && !el.closest('[hidden]') && box(el).width > 0;
        const cabinet = () => { X.newChamp(X.NATIONS[0], X.NATIONS.slice(1)); const c = X.champ(); for (let i = 0; i < 5; i++) { c.results.push(c.fixtures[i].map(p => ({ h:p[0], a:p[1], hs:20, as:10, ht:3, at:1 }))); c.round++; } X.setChamp(c); X.save(); X.load(); X.setChamp(null); };
        const rgb = h => 'rgb(' + [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ') + ')';
        const lum = c => { const v = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(n => +n/255).map(x => (x <= 0.03928 ? x/12.92 : ((x + 0.055)/1.055) ** 2.4)); return 0.2126*v[0] + 0.7152*v[1] + 0.0722*v[2]; };
        const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05)/(Math.min(x, y) + 0.05); };
        for (const desk of [false, true]) for (const app of [false, true]) for (const tools of [false, true]) for (const cab of [false, true]) for (const busy of ['none', 'champ', 'cup']) for (const buy of ['full', 'free', 'fan', 'crest']) {
          if (app && tools) continue;                         // the app has no Install or Update
          if (!app && (buy === 'fan' || buy === 'crest')) continue;   // nor the web a Super Fan
          const free = buy === 'free', fan = buy === 'fan' || buy === 'crest';
          T.locker.set(T.locker.fresh()); T.store.FAN_CLUBS[0].crest = buy === 'crest' ? 'crests/test.svg' : null;   // each state its own device: no trophy carried from the last
          T.store.setNative(app); T.store.setStarted(app); T.store.setBought(!app || free ? [] : fan ? ['tryline.fan.farnham'] : ['tryline.full']); T.store.setTier(!app && free ? 'free' : null);
          K.setHistory([]); if (cab) cabinet();
          X.setChamp(null); K.set(null); T.career.set(null);
          if (busy === 'champ') { X.newChamp(X.CLUBS[7] || X.CLUBS[0], X.CLUBS.slice(1, 6)); T.career.start({ name:'Sam', pos:'B', num:7, club:X.CLUBS[0] }); }
          if (busy === 'cup') K.set(K.cupNew('euro', { user:X.SOUTH_AFRICA[0], cat:'women' }));
          T.debug.settings().kids = app; T.debug.settings().diff = app ? 0 : 1; T.debug.settings().kidsR = app ? 1 : 0; T.debug.settings().kidsTop = app ? 9 : 0;   // the app with Move Up to Easy waiting: the dots
          document.body.classList.toggle('desk', desk);
          for (const hl of T.home.HL) {
            T.debug.settings().hl = hl; T.debug.goHome();
            if (tools) { for (const id of ['app-tools', 'b-install', 'b-update', 'offline-status']) document.getElementById(id).hidden = false; }
            const s = document.getElementById('s-home');
            const btns = [...s.querySelectorAll('button')].filter(vis);
            const small = btns.filter(b => { const r = box(b); return r.height < 44 || r.width < 44; }).filter(b => !b.classList.contains('app-action')).map(b => b.id || b.textContent.trim());
            const clipped = [...s.querySelectorAll('.hl-name, .my-side b, .hc-comp span, .dc-name')].filter(vis).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent)
              .concat([...s.querySelectorAll('.locked')].filter(vis).filter(e => { const c = getComputedStyle(e, '::after'); return c.position !== 'absolute' && parseFloat(c.width) < 0.7*parseFloat(c.fontSize) - 0.5; }).map(e => e.id + "'s lock squeezed"));   // a lock beside a name keeps its size
            const overlap = btns.some((a, i) => btns.some((b, j) => j > i && !a.contains(b) && !b.contains(a) && (() => { const p = box(a), q = box(b); return p.left < q.right - 1 && p.right > q.left + 1 && p.top < q.bottom - 1 && p.bottom > q.top + 1; })()));
            // the club's colours: the chosen headline, the panel's primary and My Team's edge, readable on the dark; without, the home as it was
            const tab = document.getElementById('hl-' + hl), prim = [...document.querySelectorAll('#hp-' + hl + ' .btn.primary')].find(vis), my = document.getElementById('b-my'), cs = e => getComputedStyle(e);
            const v = k => cs(s).getPropertyValue('--fan-' + k).trim(), shield = document.querySelector('#st-fan .fan-shield');
            const themed = fan ? s.classList.contains('fan') && cs(tab).color === rgb(v('acc')) && ratio(cs(tab).color, cs(tab).backgroundColor) >= 4.5 && cs(my).borderTopColor === rgb(v('acc'))
                && (!prim || (cs(prim).backgroundColor === rgb(v('kit')) && cs(prim).color === rgb(v('ink')) && ratio(cs(prim).color, cs(prim).backgroundColor) >= 4.5))
                && !!shield && (buy === 'crest' ? shield.tagName === 'IMG' && shield.complete && shield.naturalWidth > 0 : shield.tagName.toLowerCase() === 'svg') && box(shield).width <= 24 && box(shield).height <= 26
              : !s.classList.contains('fan') && !s.style.cssText && cs(tab).color === 'rgb(255, 207, 61)' && (!prim || cs(prim).backgroundColor === 'rgb(255, 207, 61)') && cs(my).borderTopColor === 'rgb(58, 82, 66)';
            out.push({ state:[desk ? 'desk' : 'phone', app ? 'app' : 'web', tools ? 'tools' : '', cab ? 'cab' : '', busy, free ? 'free' : '', fan ? buy : '', hl].filter(Boolean).join('+'), fan:fan && !document.getElementById('st-fan').hidden, themed, fits:s.scrollHeight <= s.clientHeight + 1 && s.scrollWidth <= s.clientWidth && document.documentElement.scrollWidth <= innerWidth, small, clipped, overlap,
              two:!document.getElementById('b-two') && !btns.some(b => /\b2 Players\b|Two Player/.test(b.textContent)), play:hl !== 'game' || (vis(document.getElementById('b-quick')) && box(document.getElementById('b-quick')).height >= 88 && btns.filter(b => document.getElementById('hp-game').contains(b)).length === 1), grown:vis(document.getElementById('b-grown')) === ((app || free) && hl === 'settings'), note:document.getElementById('hl-settings').classList.contains('note') === app, cabBtn:vis(document.getElementById('b-cabinet')) === ((cab || fan) && hl === 'champ') });
            if (tools) { for (const id of ['app-tools', 'b-install', 'b-update', 'offline-status']) document.getElementById(id).hidden = true; }
          }
        }
        X.setChamp(null); K.set(null); K.setHistory([]); T.career.set(null); T.store.setNative(false); T.store.setStarted(false); T.store.setBought([]); T.store.setTier(null); T.store.FAN_CLUBS[0].crest = null; T.locker.set(T.locker.fresh());
        const st = T.debug.settings(); st.kids = false; st.diff = 1; st.kidsR = 0; st.kidsTop = 0; st.hl = 'game';
        document.body.classList.remove('desk'); T.debug.goHome();
        return out;
      });
      const bad = f => states.filter(f).map(r => r.state);
      ok(states.length === 480 && states.every(r => r.fits), `${kind}: the home fits without a scroll in every state, on every headline (${bad(r => !r.fits).slice(0, 6).join(', ') || states.length + ' states'})`);
      ok(states.filter(r => r.fan).length === 120, `${kind}: 120 of them with the Super Fan badge under the logo, its plain shield or a club's crest (${states.filter(r => r.fan).length})`);
      ok(states.every(r => r.themed), `${kind}: a Super Fan's home in the club's colours (the chosen headline 4.5:1 on its ground, the primary's word 4.5:1 on the kit, My Team's edge) with its shield or crest, and every other home exactly as it was (${bad(r => !r.themed).slice(0, 4).join(', ') || 'all'})`);
      ok(states.every(r => !r.small.length), `${kind}: every button at least 44px (${states.filter(r => r.small.length).slice(0, 3).map(r => r.state + ': ' + r.small.join('/')).join('; ') || 'all'})`);
      ok(states.every(r => !r.clipped.length && !r.overlap), `${kind}: no name cut off nor lock squeezed, no button over another (${states.filter(r => r.clipped.length || r.overlap).slice(0, 3).map(r => r.state + ': ' + r.clipped.join('/') + (r.overlap ? ' overlap' : '')).join('; ') || 'none'})`);
      ok(states.every(r => r.two && r.play && r.grown && r.note && r.cabBtn), `${kind}: no 2 Players on any device, Quick Match one big Play (88px and more, alone in its panel), Grown-Ups in Settings where the store is live (the app, the free web), its dot on Settings, the Trophy Cabinet with a finished season (${bad(r => !(r.two && r.play && r.grown && r.note && r.cabBtn)).slice(0, 4).join(', ') || 'all'})`);
      // long names on My Team step down to fit
      const fit = await page.evaluate(() => {
        const T = window.__tryline, st = T.debug.settings(); st.myClub = 'CHC'; st.myNat = 'RSA'; T.debug.goHome();
        const names = [...document.querySelectorAll('.my-side b')], out = names.map(b => [b.textContent, b.scrollWidth <= b.clientWidth + 1, parseFloat(getComputedStyle(b).fontSize)]);
        st.myClub = null; st.myNat = null; T.debug.goHome();
        return out;
      });
      ok(fit.length === 2 && fit.every(f => f[1] && f[2] >= 12) && fit[0][2] === fit[1][2], `${kind}: Christchurch and South Africa fit My Team, stepped down together (${JSON.stringify(fit)})`);
      // every built-in club with England, South Africa and New Zealand fits My Team, on the web, in the app with the Full Game, with a
      // club on sale and nothing bought, and with the Super Fan badge under the logo (its two lines must not take My Team's width)
      const names = await page.evaluate(() => {
        const T = window.__tryline, X = T.teams, S = T.store, st = T.debug.settings(), out = {};
        const clubs = X.TEAM_LISTS.filter(l => l.tier > 0).flatMap(l => l.teams);
        for (const [state, bought, onSale] of [['web', null, false], ['app full', ['tryline.full'], false], ['app on sale', [], true], ['app Super Fan', ['tryline.fan.farnham'], true]]) {
          S.FAN_CLUBS[0].agreed = onSale; S.setNative(!!bought); S.setStarted(!!bought); S.setBought(bought || []);
          st.hl = 'game'; const cut = [];
          for (const nat of ['ENG', 'RSA', 'NZL']) for (const c of clubs) {
            st.myClub = c.id; st.myNat = nat; T.debug.goHome();
            const b = [...document.querySelectorAll('.my-side b')];
            if (b.length !== 2 || b.some(e => e.scrollWidth > e.clientWidth + 1)) cut.push(c.name + ' + ' + nat);
          }
          out[state] = { tried:clubs.length * 3, cut:cut.length, of:cut.slice(0, 4), badge:!document.getElementById('st-fan').hidden, width:Math.round(document.getElementById('b-my').getBoundingClientRect().width) };
        }
        S.FAN_CLUBS[0].agreed = false; S.setNative(false); S.setStarted(false); S.setBought([]); st.myClub = null; st.myNat = null; T.debug.goHome();
        return out;
      });
      ok(Object.values(names).every(r => r.tried > 200 && !r.cut) && names['app Super Fan'].badge && !names['app full'].badge, `${kind}: every club with England, South Africa or New Zealand fits My Team, the Super Fan badge showing or not (${JSON.stringify(names)})`);
      // a locked Legend: the padlock clears the name on its team card and the jersey, its badge and its name on the Locker's tile
      const locks = await page.evaluate(async () => {
        const T = window.__tryline, X = T.teams, L = T.locker, S = T.store, st = T.debug.settings(), cat0 = st.cat, out = { cards:0, tiles:0, over:[] };
        const lockOf = el => { const c = getComputedStyle(el, '::after'), r = el.getBoundingClientRect(), l = r.left + el.clientLeft + parseFloat(c.left), t = r.top + el.clientTop + parseFloat(c.top); return { left:l, top:t, right:l + parseFloat(c.width), bottom:t + parseFloat(c.height) }; };
        const hit = (a, b) => a.left < b.right + 2 && a.right > b.left - 2 && a.top < b.bottom + 2 && a.bottom > b.top - 2;   // 2px clear
        const saved = L.state(); L.set(L.clean({ n:{ hat:10, sharp:10, hit:10, clean:10, golden:10, comeback:10, drop:10, fire:10, champ:10, star:10 } })); S.setTier('free');
        for (const cat of ['men', 'women']) {
          st.cat = cat; T.debug.openTeams('quick'); X.tierPick(0);
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          for (const b of document.querySelectorAll('#t-grid .team[data-legend]')) {
            out.cards++;
            const lock = lockOf(b), range = document.createRange(); range.selectNodeContents(b.querySelector('.tname'));
            if (!b.classList.contains('locked') || [...range.getClientRects()].some(q => hit(q, lock))) out.over.push('card ' + b.querySelector('.tname').textContent);
          }
        }
        L.open(3);
        for (const b of document.querySelectorAll('#s-locker .lk-leg[data-legend]')) {
          out.tiles++;
          const lock = lockOf(b);
          if (!b.classList.contains('locked') || ['.ovr', '.jersey', '.lk-nat', '.lk-yr', '.rstars'].some(q => hit(b.querySelector(q).getBoundingClientRect(), lock))) out.over.push('tile ' + b.getAttribute('aria-label'));
        }
        S.setTier(null); L.set(saved); st.cat = cat0; T.debug.goHome();
        return out;
      });
      // nine Golds (star:10 is no Gold: Star Pupil counts drills): nine men's sides and all five women's, 14 (18 with ten women's, before 2026-11-09)
      ok(locks.cards === 14 && locks.tiles === 14 && !locks.over.length, `${kind}: a locked Legend's padlock clears its name on the team card (${locks.cards}) and its jersey, badge, name and stars on the Locker's tile (${locks.tiles}) (${locks.over.slice(0, 4).join(', ') || 'all clear'})`);
      // a controller: the first press on Play, down to the bar, along it, press, up into the panel; every button reachable
      const pad = await page.evaluate(() => {
        const T = window.__tryline, out = {};
        T.debug.settings().hl = 'game'; T.debug.goHome(); T.debug.focus() && T.debug.focus().classList.remove('padfocus');
        const f = () => T.debug.focus(), id = () => f() && (f().id || f().textContent.trim());
        const HL = T.home.HL, at = () => HL.indexOf((f() && f().dataset && f().dataset.hl) || ''), $ = id => document.getElementById(id);
        T.navMove(0, 0, 0); out.first = id();
        T.navMove(0, 0, 1); out.down = at();
        T.home.ring($('hl-game')); T.navMove(0, 1, 0); T.navMove(0, 1, 0); out.along = id(); T.navPress(0); out.hl = T.debug.settings().hl;
        T.navMove(0, 0, -1); out.up = f() && !!f().closest('#hp-career');
        T.home.ring($('hl-settings')); out.end = T.navMove(0, 1, 0); T.home.ring($('hl-game')); out.start = T.navMove(0, -1, 0);
        // Down from any button of any headline's panel, pressed until the ring is on the bar, lands on that headline: never the nearest one
        out.landed = [];
        for (const hl of HL) for (const tier of hl === 'champ' ? [0, 1, 2] : [null]) {
          T.debug.settings().hl = hl; if (tier != null) T.home.setTier(tier); T.debug.goHome(); T.home.ring(null);
          for (const b of [...document.querySelectorAll('#hp-' + hl + ' .btn, #hp-' + hl + ' .seg button')].filter(b => !b.hidden && !b.closest('[hidden]') && b.getBoundingClientRect().width > 0)) {
            T.home.ring(b); let el = b, n = 0;
            while (el && !el.closest('#hl-bar') && n++ < 8) el = T.navMove(0, 0, 1);
            if (!el || el.dataset.hl !== hl) out.landed.push(hl + (tier != null ? tier : '') + ':' + (b.id || b.textContent.trim()) + '>' + (el ? el.id || el.textContent.trim() : 'nothing'));
          }
        }
        T.home.setTier(null); T.debug.settings().hl = 'game'; T.debug.goHome(); T.home.ring(null);
        // every visible button on every headline, reached by moving the ring from the first press
        out.unreached = [];
        for (const hl of T.home.HL) {
          T.debug.settings().hl = hl; T.debug.goHome(); T.home.ring(null);
          const all = [...document.querySelectorAll('#s-home .btn, #s-home .seg button')].filter(b => !b.hidden && !b.closest('[hidden]') && b.getBoundingClientRect().width > 0);
          const reach = new Set(), todo = [T.navMove(0, 0, 0)];
          while (todo.length) {
            const el = todo.shift(); if (!el || reach.has(el)) continue; reach.add(el);
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { T.home.ring(el); const got = T.navMove(0, dx, dy); if (got && !reach.has(got)) todo.push(got); }
          }
          out.unreached.push(...all.filter(b => !reach.has(b)).map(b => hl + ':' + (b.id || b.textContent.trim())));
        }
        T.home.ring(null);
        T.debug.settings().hl = 'game'; T.debug.goHome();
        return out;
      });
      ok(pad.first === 'b-quick' && pad.down === 0 && pad.along === 'hl-career' && pad.hl === 'career' && pad.up === true && pad.end === null && pad.start === null, `${kind}: a controller's first press lands on Play, Down reaches the bar on Quick Match (the chosen headline), Right moves along it (to its ends and no further), pressing shows Career and Up goes into it (${JSON.stringify({ ...pad, landed:undefined, unreached:undefined })})`);
      ok(!pad.landed.length, `${kind}: Down from every button of every headline (each Championship tier too) reaches the bar on that headline (${pad.landed.slice(0, 4).join(', ') || 'all'})`);
      ok(!pad.unreached.length, `${kind}: every button on every headline is reached by moving the ring (${pad.unreached.join(', ') || 'all'})`);
      rowsOk(kind, await page.evaluate(settingsRows));
      // Skills Mini Games for each player (the skills builder, at the PR #14 merge): Men the ten, How to Play, Contact Games (U9 and Up) and
      // For Grown-Ups; the Kids level and Minis the seven, How to Play and For Grown-Ups. Each fits with nothing over anything, the ring reaches
      // every button and Down from each lands on Skills Mini Games, For Grown-Ups opens its panel with Back to Skills in the ring's reach,
      // every game's card offers Watch How in the ring's reach, and Tab reaches every button on the headline
      for (const [who, kids, cat] of [['Men', false, 'men'], ['Kids', true, 'men'], ['Minis', false, 'minis']]) {
        const sk = await page.evaluate(([kids, cat]) => {
          const T = window.__tryline, st = T.debug.settings(), $ = id => document.getElementById(id);
          const box = el => el.getBoundingClientRect(), vis = el => !!el && !el.hidden && !el.closest('[hidden]') && box(el).width > 0;
          const meet = (p, q) => p.left < q.right - 1 && p.right > q.left + 1 && p.top < q.bottom - 1 && p.bottom > q.top + 1;
          const ringAll = () => { T.home.ring(null); const r = new Set(), q = [T.navMove(0, 0, 0)]; while (q.length) { const el = q.shift(); if (!el || r.has(el)) continue; r.add(el); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { T.home.ring(el); const got = T.navMove(0, dx, dy); if (got && !r.has(got)) q.push(got); } } return r; };
          const seen = st.drillSeen.slice(); st.drillSeen = T.drills.DRILLS.map(d => d.id);   // no Watch How playing on a card's first open
          st.kids = kids; st.diff = kids ? 0 : 1; st.cat = cat; st.hl = 'drills'; T.debug.goHome(); T.debug.focus() && T.debug.focus().classList.remove('padfocus');
          const s = $('s-home'), panel = $('hp-drills'), btns = [...panel.querySelectorAll('.btn')].filter(vis);
          const games = btns.filter(b => T.drills.DRILLS.some(d => 'pr-' + d.id === b.id)).map(b => b.id.slice(3));
          const over = btns.filter((a, i) => btns.some((b, j) => j > i && meet(box(a), box(b)))).map(b => b.id);
          const small = btns.filter(b => box(b).height < 44 || box(b).width < 44).map(b => b.id);
          const cut = [...panel.querySelectorAll('.dc-name, .pr-group')].filter(vis).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent);
          const reach = ringAll(), unreached = btns.filter(b => !reach.has(b)).map(b => b.id);
          const landed = btns.filter(b => { T.home.ring(b); let el = b, n = 0; while (el && !el.closest('#hl-bar') && n++ < 8) el = T.navMove(0, 0, 1); return !el || el.dataset.hl !== 'drills'; }).map(b => b.id);
          T.home.ring(null); $('pr-grown').click();
          const gp = $('pr-grownups'), back = $('pr-grown-back'), grown = vis(gp) && !vis($('pr-games')) && ringAll().has(back);
          back.click(); const shut = vis($('pr-games')) && !vis(gp);
          const watch = games.filter(id => { T.practice.start(id); const w = $('pr-watch'), good = vis(w) && w.textContent === 'Watch How' && ringAll().has(w); T.practice.choose(); return !good; });
          T.home.ring(null); st.hl = 'drills'; T.debug.goHome();
          const out = { games, contact:!$('pr-contact').hidden && !$('pr-contact').closest('[hidden]'), fits:s.scrollHeight <= s.clientHeight + 1 && document.documentElement.scrollWidth <= innerWidth, over, small, cut, unreached, landed, grown, shut, watch, help:vis($('b-help')), grownBtn:vis($('pr-grown')), ids:btns.map(b => b.id) };
          st.drillSeen = seen;
          return out;
        }, [kids, cat]);
        await page.evaluate(() => { document.activeElement && document.activeElement.blur(); });
        const tabbed = new Set();
        for (let i = 0; i < 40; i++) { await page.keyboard.press('Tab'); const at = await page.evaluate(() => { const a = document.activeElement; return a && document.getElementById('hp-drills').contains(a) ? a.id : null; }); if (at) tabbed.add(at); }
        const young = kids || cat === 'minis', open = ['tag', 'egg', 'circle', 'cones', 'pass', 'kick', 'defend'];
        ok(json(sk.games) === json(young ? open : open.concat(['tackle', 'scrum', 'back'])) && sk.contact === !young && sk.help && sk.grownBtn, `${kind} ${who}: Skills Mini Games shows ${young ? 'the seven open games, no Contact Games' : 'the ten, the contact three under Contact Games (U9 and Up)'}, How to Play and For Grown-Ups (${sk.games.join(', ')})`);
        ok(sk.fits && !sk.over.length && !sk.small.length && !sk.cut.length, `${kind} ${who}: Skills Mini Games fits with no scroll, every button 44px and more, none over another, no name cut off (${[...sk.over, ...sk.small, ...sk.cut].join(', ') || 'all clear'})`);
        ok(!sk.unreached.length && !sk.landed.length, `${kind} ${who}: the ring reaches every button on Skills Mini Games, and Down from each lands on its headline (${[...sk.unreached, ...sk.landed].join(', ') || 'all'})`);
        ok(sk.grown && sk.shut, `${kind} ${who}: For Grown-Ups opens its panel with Back to Skills in the ring's reach, and Back to Skills shuts it`);
        ok(!sk.watch.length, `${kind} ${who}: every game's card offers Watch How, in the ring's reach (${sk.watch.join(', ') || 'all ' + sk.games.length})`);
        ok(sk.ids.every(id => tabbed.has(id)), `${kind} ${who}: Tab reaches every button on Skills Mini Games (${sk.ids.filter(id => !tabbed.has(id)).join(', ') || 'all ' + sk.ids.length})`);
      }
      await page.evaluate(() => { const T = window.__tryline, st = T.debug.settings(); st.kids = false; st.diff = 1; st.cat = 'men'; st.hl = 'game'; T.home.ring(null); T.debug.goHome(); });
      // the keyboard: Tab reaches the bar (one stop), the arrows move along it and show each, Enter presses what Tab reaches
      await page.evaluate(() => { const T = window.__tryline; T.debug.settings().hl = 'game'; T.debug.goHome(); document.activeElement && document.activeElement.blur(); });
      let tabs = 0, onBar = false;
      for (; tabs < 12 && !onBar; tabs++) { await page.keyboard.press('Tab'); onBar = await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('hl')); }
      const atBar = await page.evaluate(() => document.activeElement.id);
      await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
      const kb = await page.evaluate(() => [document.activeElement.id, window.__tryline.debug.settings().hl, !document.getElementById('hp-career').hidden]);
      await page.keyboard.press('Shift+Tab');
      const back = await page.evaluate(() => document.activeElement.id);
      await page.keyboard.press('Enter');
      const pressed = await page.evaluate(() => [document.getElementById('s-career-new').hidden === false || document.getElementById('m-store').hidden === false]);
      ok(onBar && atBar === 'hl-game' && kb[0] === 'hl-career' && kb[1] === 'career' && kb[2] && back === 'b-career' && pressed[0], `${kind}: Tab reaches the bar on its chosen headline (${tabs} presses), Right moves along it showing each, Shift+Tab goes up to the panel and Enter presses (${JSON.stringify([atBar, kb, back])})`);
      await page.evaluate(() => { const T = window.__tryline; T.debug.settings().hl = 'game'; T.career.set(null); T.debug.goHome(); });
      ok(!errors.length, `${kind}: no page errors (${errors.join('; ')})`);
      await ctx.close();
    }
    // 320px tall (Safari sideways: 667x320, 568x320), not one of the sizes that must never scroll: the page still never scrolls, and the
    // logo, the top row and the bar are all on screen and never under anything; the panel holds what it can between them and scrolls
    // inside its own row for the rest (only National's nine leagues with the Trophy Cabinet need it: England 2 made eight nine), the ring scrolling it into view
    for (const [w, h] of [[667, 320], [568, 320]]) {
      const ctx = await browser.newContext({ viewport:{ width:w, height:h }, deviceScaleFactor:1, isMobile:true, hasTouch:true, serviceWorkers:'block' });
      const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(s => { try { localStorage.setItem('tryline.v1', JSON.stringify(s)); } catch (e) { /* blocked */ } }, SAVE);
      await page.goto(base + 'index.html', { waitUntil:'load' }); await page.evaluate(() => document.fonts.ready);
      const kind = `${w}x${h}`;
      const r = await page.evaluate(() => {
        const T = window.__tryline, X = T.teams, K = T.cups, S = T.store, out = [];
        const box = el => el.getBoundingClientRect(), vis = el => !!el && !el.hidden && !el.closest('[hidden]') && box(el).width > 0;
        const meet = (p, q) => p.left < q.right - 1 && p.right > q.left + 1 && p.top < q.bottom - 1 && p.bottom > q.top + 1;
        const cabinet = () => { X.newChamp(X.NATIONS[0], X.NATIONS.slice(1)); const c = X.champ(); for (let i = 0; i < 5; i++) { c.results.push(c.fixtures[i].map(p => ({ h:p[0], a:p[1], hs:20, as:10, ht:3, at:1 }))); c.round++; } X.setChamp(c); X.save(); X.load(); X.setChamp(null); };
        const TOOLS = ['app-tools', 'b-install', 'b-update', 'offline-status'];
        for (const st of ['web', 'web tools', 'web free cab', 'app free', 'app fan cab', 'app full busy']) {   // a Super Fan has the Trophy Cabinet: its trophy is in it
          const app = st.startsWith('app');
          T.locker.set(T.locker.fresh());
          S.setNative(app); S.setStarted(app); S.setBought(st === 'app fan cab' ? ['tryline.fan.farnham'] : st === 'app full busy' ? ['tryline.full'] : []); S.setTier(st === 'web free cab' ? 'free' : null);
          K.setHistory([]); if (st === 'web free cab') cabinet();
          X.setChamp(null); K.set(null); T.career.set(null);
          if (st === 'app full busy') { X.newChamp(X.CLUBS[7], X.CLUBS.slice(1, 6)); T.career.start({ name:'Sam', pos:'B', num:7, club:X.CLUBS[0] }); }
          for (const [tier, hl] of [[2, 'game'], [0, 'champ'], [1, 'champ'], [2, 'champ'], [2, 'career'], [2, 'drills'], [2, 'settings']]) {
            T.debug.settings().hl = hl; T.home.setTier(tier); T.debug.goHome();
            if (st === 'web tools') for (const id of TOOLS) document.getElementById(id).hidden = false;
            const s = document.getElementById('s-home'), p = document.getElementById('hl-panels'), pr = box(p);
            const btns = [...s.querySelectorAll('button')].filter(vis), inner = btns.filter(b => p.contains(b)), outer = btns.filter(b => !p.contains(b));
            const off = outer.filter(b => { const q = box(b); return q.top < -0.5 || q.bottom > innerHeight + 0.5 || q.left < -0.5 || q.right > innerWidth + 0.5; });
            const clip = getComputedStyle(p).overflowY !== 'visible';   // what the panel shows of a button: all of it, or (scrolling) the part inside its box
            const seen = b => { const q = box(b); return clip ? { left:Math.max(q.left, pr.left), right:Math.min(q.right, pr.right), top:Math.max(q.top, pr.top), bottom:Math.min(q.bottom, pr.bottom) } : q; };
            const over = outer.filter((a, i) => outer.some((b, j) => j > i && meet(box(a), box(b))) || inner.some(b => meet(box(a), seen(b))) || (clip && meet(box(a), pr)))
              .concat(inner.filter((a, i) => inner.some((b, j) => j > i && !a.contains(b) && !b.contains(a) && meet(box(a), box(b)))));
            const small = btns.filter(b => !b.classList.contains('app-action') && (box(b).height < 44 || box(b).width < 44));
            const cut = [...s.querySelectorAll('.hl-name, .my-side b, .hc-comp span, .dc-name')].filter(vis).filter(e => e.scrollWidth > e.clientWidth + 1)
              .concat([...s.querySelectorAll('.locked')].filter(vis).filter(e => { const c = getComputedStyle(e, '::after'); return c.position !== 'absolute' && parseFloat(c.width) < 0.7*parseFloat(c.fontSize) - 0.5; }));
            const scroll = p.scrollHeight - p.clientHeight;
            let ringed = true;
            if (scroll > 0) { const last = inner[inner.length - 1]; T.home.ring(last); const q = box(last); ringed = q.top >= pr.top - 0.5 && q.bottom <= pr.bottom + 0.5; T.home.ring(null); p.scrollTop = 0; }
            const name = el => el.id || el.textContent.trim().slice(0, 16);
            out.push({ state:st + ' ' + hl + (hl === 'champ' ? tier : ''), page:s.scrollHeight - s.clientHeight, scroll, ringed, off:off.map(name), over:over.map(name), small:small.map(name), cut:cut.map(e => e.textContent) });
            if (st === 'web tools') for (const id of TOOLS) document.getElementById(id).hidden = true;
          }
        }
        S.setNative(false); S.setStarted(false); S.setBought([]); S.setTier(null); X.setChamp(null); K.set(null); K.setHistory([]); T.career.set(null); T.home.setTier(null); T.locker.set(T.locker.fresh());
        T.debug.settings().hl = 'game'; T.debug.goHome();
        return out;
      });
      const list = f => r.filter(f).slice(0, 4).map(x => x.state + ': ' + [...x.off, ...x.over, ...x.small, ...x.cut].join('/')).join('; ');
      ok(r.length === 42 && r.every(x => x.page <= 0 && !x.off.length && !x.over.length), `${kind}: the page never scrolls, the logo, top row and bar are on screen and nothing sits over anything (${list(x => x.page > 0 || x.off.length || x.over.length) || r.length + ' states'})`);
      ok(r.every(x => !x.small.length && !x.cut.length), `${kind}: every target 44px, no name cut off nor lock squeezed (${list(x => x.small.length || x.cut.length) || 'all'})`);
      const scrolls = r.filter(x => x.scroll > 0);
      ok(scrolls.every(x => /cab champ1$/.test(x.state) && x.ringed), `${kind}: only National's nine leagues with the Trophy Cabinet scroll inside the panel, and the ring brings the last button into view (${scrolls.map(x => x.state + ' ' + x.scroll + 'px' + (x.ringed ? '' : ' not ringed')).join(', ') || 'none'})`);
      rowsOk(kind, await page.evaluate(settingsRows));
      ok(!errors.length, `${kind}: no page errors (${errors.join('; ')})`);
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
}
