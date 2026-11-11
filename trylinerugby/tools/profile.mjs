// The profile (README, Profile): the first launch's setup (Age Group, Gender, Club, Your Look, each with Skip and Back, none on the first,
// Done at the end) only with no save at all; what each answer sets (the level, the category, My Team's club and country, Career's New
// Player); nothing locked after; My Team's Change opening My Profile, the old picker one press on; the save's profile field (bad values,
// old saves); your player in My Team's box, in New Career and on one man of your side (the fly-half) in Quick Match, Championship and a
// cup, never in a career's, AI v AI, the demo, Two Player or a tool's match; the body rule; and no random draw and no fingerprint moved by
// any of it. Its last part needs Playwright and Chromium (as tools/home.mjs's does) and is skipped, saying so, where they are missing: the
// setup and My Profile at 844x390, 667x375, 844x340, 667x320 and 568x320 with no scroll, every target 44px, Title Case, no arrow glyph,
// the first launch for a person and never with a save, the keyboard and a controller, and the box on the home with your player in it.
// node tools/profile.mjs   Exits 1 on any failure.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
process.env.SEED ??= '71';
const { T, reseed, bot, rndCalls } = await import('./harness.mjs');
const { readGameSource } = await import('./source.mjs');
const F = T.profile, D = T.debug, X = T.teams, H = T.home, C = T.career, K = T.cups, P = T.picker, $ = id => document.getElementById(id);
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } if (process.env.VERBOSE) console.log(cond ? 'ok  ' : 'FAIL', msg); };
const json = JSON.stringify;
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
const memory = {};
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = String(v); } };
const saved = () => JSON.parse(memory['tryline.v1']);
const MORE = ['s-setup', 's-profile', 's-career-new', 's-career-look', 's-career', 's-cup', 's-locker', 's-cabinet'];   // screens the stand-in DOM does not list: showScreen hides and shows them too
{ const qsa = document.querySelectorAll; document.querySelectorAll = sel => (sel === '.screen' ? qsa(sel).concat(MORE.map(id => $(id))) : qsa(sel)); for (const id of MORE) $(id).hidden = true; }
const shown = () => ['s-home', 's-teams', 's-hub', 's-help', 's-join', 's-build', ...MORE].find(id => !$(id).hidden);
for (const id of ['pf-team', 'b-my']) { const e = $(id), at = {}; e.setAttribute = (k, v) => { at[k] = String(v); }; e.getAttribute = k => (k in at ? at[k] : null); }
const st = D.settings();
const NONE = { age:null, gender:null, look:null };
const LOOK = { g:1, skin:5, hair:5, style:11, b:1.12 };   // a look nobody's squad deals: red hair in a Long Bob, the darkest skin, Big
const fresh = () => {                                   // a new game on its defaults: Normal, Men, Farnham and England, no profile
  F.set({ ...NONE }); st.cat = 'men'; st.kids = false; st.diff = 1; st.kidsR = 0; st.myClub = null; st.myNat = null; st.played = 5; st.half = 0; st.pick = [null, null];
  X.setChamp(null); K.set(null); C.set(null); X.custom().length = 0; T.importer.setLeague(null); $('m-gate').hidden = true; D.goHome();
};
const club = id => X.ALL_TEAMS.find(t => t.id === id);

// 0. Nothing moves a match: AI v AI, a tool's match, the demo and a championship match made by newMatch, seeded, the same with a profile
//    as without; then the same seeded Quick Match through startMatch with your player in it and without, the same result, statistics,
//    steps and random draws, every man's look asked for on the way (lookOf draws nothing).
{
  const finger = () => {
    const out = [];
    reseed(31); out.push(json(T.simulate(2, 60, 1).map(r => [r.teams, r.score, r.tries, r.steps])));
    const play = o => { T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:1, headless:true, humans:[true, false], duels:'live', ...o }); let n = 0; while (!T.M.over && n < 200000) { bot(0); T.update(T.STEP); n++; } return json([T.M.score, T.M.tries, T.M.stats, n, T.M.you === undefined]); };
    reseed(110); out.push(play({})); reseed(112); out.push(play({ arcade:true, champ:true }));
    reseed(113); T.newMatch(X.NATIONS[0], X.NATIONS[1], { halfLen:1e9, diff:1, demo:true, auto:true }); for (let n = 0; n < 60*60; n++) T.update(T.STEP);
    out.push(json([T.M.score, T.M.tries, T.M.ball.x.toFixed(4), T.M.ball.y.toFixed(4), T.M.you === undefined]));
    return out.map(fnv).join(' ');
  };
  fresh(); const without = finger();
  F.set({ age:'adult', gender:'female', look:{ ...LOOK } }); const withIt = finger();
  ok(without === withIt, `AI v AI, a tool's match, a championship match made by newMatch and the demo play the same with a profile as without, and none has your player (${withIt})`);
  const a = (() => { fresh(); reseed(500); const n0 = rndCalls(); D.startMatch(X.CLUBS[0], X.CLUBS[1], false); const you = T.M.you; let n = 0, drew = 0; const L = []; while (!T.M.over && n < 200000) { bot(0); T.update(T.STEP); n++; if (n % 900 === 1) { const r = rndCalls(); for (const p of T.M.players) L.push(json(T.behind.lookOf(p))); drew += rndCalls() - r; } } const out = { you, stats:json([T.M.score, T.M.tries, T.M.stats, n]), draws:rndCalls() - n0, drew, looks:T.M.players.map(p => T.behind.lookOf(p)) }; D.exitMatch(); return out; })();
  const b = (() => { fresh(); F.set({ age:'adult', gender:'male', look:{ ...LOOK, g:0 } }); reseed(500); const n0 = rndCalls(); D.startMatch(X.CLUBS[0], X.CLUBS[1], false); const you = T.M.you; let n = 0, drew = 0; while (!T.M.over && n < 200000) { bot(0); T.update(T.STEP); n++; if (n % 900 === 1) { const r = rndCalls(); for (const p of T.M.players) T.behind.lookOf(p); drew += rndCalls() - r; } } const out = { you, stats:json([T.M.score, T.M.tries, T.M.stats, n]), draws:rndCalls() - n0, drew, looks:T.M.players.map(p => T.behind.lookOf(p)) }; D.exitMatch(); return out; })();
  ok(a.you === null && b.you && b.you.n === F.NUM && b.you.team === 0, `a Quick Match: no player of yours with no look, the fly-half (No. ${F.NUM}) of your side with one`);
  ok(a.stats === b.stats && a.draws === b.draws && a.draws > 0, `the same seeded Quick Match with your player in it and without: the same score, tries, statistics and steps, and the same ${a.draws} random draws`);
  ok(a.drew === 0 && b.drew === 0, 'asking every man\'s look all match long draws no random number, with your player or without');
  const diff = b.looks.map((l, i) => json(l) !== json(a.looks[i]));
  ok(diff.filter(Boolean).length === 1 && diff[F.NUM - 1] && b.looks[F.NUM - 1].skin === 5 && b.looks[F.NUM - 1].hair === 5 && b.looks[F.NUM - 1].style === 11 && b.looks[F.NUM - 1].b === 1.12 && b.looks[F.NUM - 1].h === a.looks[F.NUM - 1].h, 'only the fly-half looks different: your skin, hair colour and style and build, his height his shirt\'s as every man\'s is');
  F.set({ ...NONE });
}

// 1. The save's profile field: each answer one the game knows, the look checked, anything else dropped; saved only once something is set;
//    a save from before it loads with none, and every other field as it was.
{
  fresh();
  ok(json(F.clean({ age:'junior', gender:'female', look:{ g:0, skin:3, hair:4, style:9, b:1 } })) === json({ age:'junior', gender:'female', look:{ g:1, skin:3, hair:4, style:9, b:1 } }), 'a good profile reads back as it was, the body the gender\'s (Female: 1)');
  ok(json(F.clean({ age:'teen', gender:'boy', look:'x' })) === json(NONE) && json(F.clean(null)) === json(NONE) && json(F.clean([1, 2])) === json(NONE) && json(F.clean('mini')) === json(NONE) && json(F.clean({ look:[1] })) === json(NONE), 'unknown answers, a broken look, null, an array and a string read as no profile');
  ok(json(F.clean({ age:'mini', gender:'na', look:{ g:1, skin:99, hair:-3, style:40, b:7 } }).look) === json({ g:1, skin:5, hair:0, style:11, b:1.12 }), 'a look out of range is clamped (skin, hair, style) and its build the nearest of the three; Not Say keeps its own body');
  ok(F.clean({ gender:'male', look:{ g:1 } }).look.g === 0 && F.clean({ gender:null, look:{ g:1 } }).look.g === 1 && F.clean({ look:{ g:7 } }).look.g === 0, 'the body: Male\'s 0 whatever was saved, its own with no gender, 0 for a bad one');
  ok(json(F.clean({ age:'adult', gender:'male', name:'Sam', email:'x@y', look:{ skin:1, hair:1, style:1, b:1, g:0, name:'Sam' } })) === json({ age:'adult', gender:'male', look:{ g:0, skin:1, hair:1, style:1, b:1 } }), 'nothing else is kept: no name, no email, nothing but the three fields');
  X.save(); ok(!('profile' in saved()), 'a game with no profile saves none, so its save is as before');
  F.set({ age:'adult', gender:null, look:null }); X.save(); ok(json(saved().profile) === json({ age:'adult', gender:null, look:null }), 'saved once something is set');
  const raw = saved(); F.set({ ...NONE }); X.restore(raw); ok(json(F.get()) === json({ age:'adult', gender:null, look:null }), 'and read back');
  const old = { settings:{ diff:0, kids:true, cat:'women', myClub:'BTH', myNat:'WAL' } }; F.set({ ...NONE }); X.restore(old);
  ok(json(F.get()) === json(NONE) && st.kids && st.diff === 0 && st.cat === 'women' && st.myClub === 'BTH' && st.myNat === 'WAL', 'a save from before the profile loads with none, everything else as saved');
  X.restore({ profile:{ age:'old', gender:42, look:{ skin:'a' } } }); ok(json(F.get()) === json({ age:null, gender:null, look:{ g:0, skin:2, hair:1, style:0, b:1 } }), 'a broken profile in a save: what is bad dropped, a broken look the default one');
  X.restore({ profile:null }); ok(json(F.get()) === json(NONE), 'a profile of null is none');
  fresh();
}

// 2. Who gets the setup: only a launch with no save at all, only a person (a real page no automation drives), never a save that exists.
{
  for (const k in memory) delete memory[k];
  X.load(); ok(F.first() === true, 'no save in storage: a first launch');
  memory['tryline.v1'] = json({ settings:{} }); X.load(); ok(F.first() === false, 'any save at all: not one');
  memory['tryline.v1'] = '{broken'; X.load(); ok(F.first() === false, 'a save that cannot be read is not one either (it is a game that was played)');
  const keep = globalThis.localStorage; globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() {} }; X.load(); globalThis.localStorage = keep;
  ok(F.first() === false, 'storage that refuses is not a first launch: nothing could be kept, so it would come back every time');
  F.setFirst(true); ok(F.auto() === false, 'the tools\' stand-in page (no body) never runs it: the tools open on the home as ever');
  fresh(); F.setFirst(true); F.boot(); ok(F.run() === null && shown() === 's-home', 'so boot leaves the home in place');
  F.setFirst(false);
  const boot = readGameSource().match(/function start\(data\) \{[\s\S]*?\n\}/)[0];
  ok(/goHome\(\);\n  if \(!\(data && Object\.keys\(data\)\.length\)\) profileBoot\(\);/.test(boot), 'boot asks once the home is up, and never with the hot reload\'s data (a save)');
  const src = readGameSource();
  ok(/profileFirst = !raw;/.test(src) && /function profileBoot\(\) \{ if \(profileFirst && profileAuto\(\)\) profileSetupOpen\(\); \}/.test(src) && /navigator\.webdriver/.test(src), 'load marks a first launch only when storage has no save; profileBoot asks for a person (no navigator.webdriver)');
  ok(/nativeSaved\(\)\.then[\s\S]*?finish\(saved\)/.test(src) && /function finish|const finish = saved => \{[\s\S]*?localStorage\.setItem\(STORE, saved\)[\s\S]*?go\(\);/.test(src), 'the app puts its copy of a save into storage before the game starts, so a save restored that way is never a first launch');
  // a copy that comes back late (Preferences slower than the start): goHome, which puts it in, ends a setup under way with nothing set
  fresh(); F.open(); F.answer('mini'); D.goHome(); ok(F.run() === null && shown() === 's-home' && !st.kids && st.cat === 'men', 'goHome during the setup (the app\'s late copy put back) ends it with nothing set');
}

// 3. The steps: Age Group, Gender, Club (the team screen in its one-side mode), Your Look; each with Skip and Back, Not Now on the first.
{
  fresh(); F.open();
  ok(shown() === 's-setup' && F.run().step === 0 && $('su-title').textContent === 'Age Group' && /aria-label="1 of 4"/.test($('su-step').innerHTML) && ($('su-step').innerHTML.match(/<i /g) || []).length === 4 && $('su-back').disabled === true, 'it opens on Age Group, its place a bar a step (1 of 4, read out), with no Back: nothing is before it (its slot kept empty, no Not Now beside Skip)');
  $('su-back').click(); F.back(); ok(F.run() && F.run().step === 0 && shown() === 's-setup', 'and Back there does nothing: the setup stays on Age Group');
  ok(/data-v="mini"[\s\S]*Mini[\s\S]*Up to 11[\s\S]*data-v="junior"[\s\S]*Junior[\s\S]*12 to 17[\s\S]*data-v="adult"[\s\S]*Adult[\s\S]*18 and Over/.test($('su-opts').innerHTML), 'Mini (Up to 11) | Junior (12 to 17) | Adult (18 and Over), in that order');
  ok(F.AGES[0].line === 'Up to ' + T.sidesOf.MIXED_THROUGH && F.AGES[1].line.startsWith(T.sidesOf.MIXED_THROUGH + 1 + ' '), 'the Mini band ends where the mixed game does (MIXED_THROUGH), and Junior starts after it');
  ok((($('su-opts').innerHTML.match(/<svg /g)) || []).length === 3 && (($('su-opts').innerHTML.match(/style="--k:#[0-9a-f]{6}"/g)) || []).length === 3 && new Set(F.AGES.map(a => a.k)).size === 3, 'each card a picture on its own colour');
  $('su-skip').click(); ok(F.run().step === 1 && F.run().age === null && $('su-title').textContent === 'Gender' && $('su-back').disabled === false, 'Skip: on to Gender, no age group, Back there');
  ok(/data-v="male"[\s\S]*Male[\s\S]*data-v="female"[\s\S]*Female[\s\S]*data-v="na"[\s\S]*Not Say/.test($('su-opts').innerHTML) && !/su-line/.test($('su-opts').innerHTML), 'Gender: Male | Female | Not Say');
  $('su-back').click(); ok(F.run().step === 0 && $('su-title').textContent === 'Age Group', 'Back: Age Group again');
  F.answer('junior'); ok(F.run().step === 1 && F.run().age === 'junior' && st.diff === 1 && !st.kids, 'an age group picked moves on, and sets nothing yet');
  $('su-back').click(); ok(/data-v="junior" aria-pressed="true"/.test($('su-opts').innerHTML), 'and is shown picked coming back');
  F.answer('adult'); F.answer('female');
  ok(shown() === 's-teams' && D.pickMode() === 'setup' && F.run().step === 2 && /aria-label="3 of 4"/.test($('t-eyebrow').innerHTML) && $('t-title').textContent === 'Pick Your Club', 'Club: the team screen, 3 of 4, Pick Your Club');
  ok($('t-cat').hidden && !$('t-sback').hidden && !$('t-skip').hidden && $('t-back').hidden && P.one() && $('t-go').textContent === 'Pick Farnham', 'its Back and Skip along the top in place of Men | Women | Minis, one side, Pick Farnham');
  const lad = P.view(0).ladder;
  ok(lad.some(g => g.key === 'sur') && lad.some(g => g.key === 'fra') && lad.some(g => g.key === 'mine.made') && !lad.some(g => g.teams.some(t => !t.act && (X.isNation(t) || t.legend))), 'the whole ladder of clubs, Mine (Made Teams, My League) and no nation or Legend: the country comes with the club');
  ok(P.view(0).team.name === 'Farnham Women' || X.listName(P.view(0).team) === 'Farnham', 'named for the category the answers give (Women)');
  $('t-sback').click(); ok(shown() === 's-setup' && F.run().step === 1 && /data-v="female" aria-pressed="true"/.test($('su-opts').innerHTML), 'Back: Gender, Female kept');
  F.answer('female'); $('t-skip').click();
  ok(shown() === 's-career-look' && F.run().step === 3 && F.run().club === null && F.lookFor() === 'setup' && !$('ck-pback').hidden && !$('ck-skip').hidden && !$('ck-done').hidden && $('ck-back').hidden, 'Skip: Your Look, with Back and Skip along the top and Done, no club');
  ok(json(F.lookDraft()) === json({ g:1, skin:2, hair:1, style:11, b:1 }) && $('ck-body-f').hidden, 'it starts on the default look on her body (a Long Bob, which reads from the front), no Body row: the gender says it');
  $('ck-pback').click(); ok(shown() === 's-teams' && D.pickMode() === 'setup', 'Back: the Club again');
  P.group(0, P.view(0).ladder.findIndex(g => g.key === 'eng') - P.view(0).gi); const bath = P.view(0).team; P.go();
  ok(X.listName(bath) === 'Bath' && F.run().club === bath && F.run().nat === 'ENG' && shown() === 's-career-look', 'Pick Bath: the club and its country, England, then Your Look');
  T.sidesOf.careerLookSet('skin', 4); T.sidesOf.careerLookSet('style', 10);
  $('ck-pback').click(); $('t-go').click(); ok(F.lookDraft().skin === 4 && F.lookDraft().style === 10, 'the picks kept through Back and on again');
  ok(st.cat === 'men' && st.diff === 1 && st.myClub === null && json(F.get()) === json(NONE), 'nothing is set before the end');
  $('ck-done').click();
  ok(shown() === 's-home' && F.run() === null && st.cat === 'women' && st.diff === 1 && !st.kids && st.myClub === 'BTH' && st.myNat === 'ENG' && json(F.get()) === json({ age:'adult', gender:'female', look:{ g:1, skin:4, hair:1, style:10, b:1 } }) && json(saved().profile) === json(F.get()), 'Done: Adult (Normal), Female (Women), Bath and England, the look, saved; the home');
  // Skip on Your Look: everything else set, no look; but only until a pick is made, after which Skip goes and a look begun is kept
  fresh(); F.open(); F.answer('junior'); F.answer('male'); $('t-skip').click();
  ok(!$('ck-skip').hidden && !$('ck-done').hidden, 'Your Look, nothing picked yet: Skip and Done');
  $('ck-skip').click();
  ok(shown() === 's-home' && json(F.get()) === json({ age:'junior', gender:'male', look:null }) && st.diff === 0 && !st.kids && st.cat === 'men' && st.myClub === null, 'Skip on Your Look: Junior and Male set, no look, My Team as it was');
  fresh(); F.open(); F.answer('mini'); F.answer('female'); $('t-skip').click(); T.sidesOf.careerLookSet('hair', 4);
  ok($('ck-skip').hidden && !$('ck-done').hidden && !$('ck-pback').hidden, 'a pick made on Your Look: Skip goes, Back and Done stay');
  $('ck-pback').click(); $('t-skip').click(); ok($('ck-skip').hidden, 'and stays gone coming back to it');
  F.skip(); ok(shown() === 's-home' && F.get().look && F.get().look.hair === 4, 'a look begun is kept even by a skip that comes another way (the look a child built is never thrown away)');
  fresh(); for (const k in memory) delete memory[k]; F.open(); for (let i = 0; i < 2; i++) $('su-skip').click(); $('t-skip').click(); $('ck-skip').click();
  ok(shown() === 's-home' && F.run() === null && json(F.get()) === json(NONE) && st.diff === 1 && st.cat === 'men' && !st.kids && st.myClub === null && st.myNat === null && !!memory['tryline.v1'] && !('profile' in saved()), 'Skip on every step keeps the game\'s own defaults (Normal, Men, Farnham, England) and saves, so the setup does not come back');
  // Not Say: the Body row on Your Look, the body its own
  fresh(); F.open(); F.answer('adult'); F.answer('na'); $('t-skip').click();
  ok(!$('ck-body-f').hidden && F.lookDraft().g === 0, 'Not Say: a Body row on Your Look, Male to start');
  T.sidesOf.careerLookSet('g', 1); $('ck-done').click(); ok(F.get().look.g === 1 && F.get().gender === 'na' && st.cat === 'men', 'Female picked there: its body kept with Not Say, which plays Men as an adult');
  // a made team as the club: My Team's country left as it was
  fresh(); st.myNat = 'WAL'; X.restore({ custom:[{ key:'my0', name:'My Town', id:'MYT', kit:'#123456', trim:'#abcdef', pace:3, power:3, handling:3, kicking:3, stamina:3 }] });
  F.open(); F.answer('adult'); F.answer('male'); P.group(0, P.view(0).ladder.findIndex(g => g.key === 'mine.made') - P.view(0).gi); P.go(); $('ck-skip').click();
  ok(st.myClub === 'my0' && st.myNat === 'WAL', 'a team you made as the club: My Team\'s country as it was');
  X.restore({ custom:[] });
}

// 4. What each answer sets: the level and the category for every age group and gender; a club's country from the ladder.
{
  const want = { mini:{ male:'minis', female:'minis', na:'minis', null:'minis' }, junior:{ male:'men', female:'women', na:'men', null:'men' }, adult:{ male:'men', female:'women', na:'men', null:'men' }, null:{ male:'men', female:'women', na:'men', null:'men' } };
  const lv = { mini:[0, true], junior:[0, false], adult:[1, false], null:[1, false] };
  const bad = [];
  for (const age of ['mini', 'junior', 'adult', null]) for (const g of ['male', 'female', 'na', null]) {
    fresh(); F.open(); if (age) F.answer(age); else $('su-skip').click(); if (g) F.answer(g); else $('su-skip').click(); $('t-skip').click(); $('ck-skip').click();
    const cat = st.cat, got = [st.diff, st.kids];
    if (cat !== want[age][g] || json(got) !== json(lv[age])) bad.push(`${age}/${g}: ${cat} ${json(got)}`);
  }
  ok(!bad.length, `Mini: the Kids level and Minis whoever plays; Junior: Easy; Adult: Normal; Men for Male and Not Say, Women for Female; with no age group the gender alone, Normal kept (${bad.join('; ') || '16 pairs'})`);
  ok(F.level('adult') === 2 && F.level('junior') === 1 && F.level('mini') === 0 && F.level(null) === null && F.cat(null, null, 'women') === null, 'the Difficulty row\'s buttons: Kids, Easy, Normal; nothing for nothing');
  // an answer left blank keeps the side as it is: a gender alone never moves a side off Minis, an age group alone never between Men and Women
  const keep = [['adult', null, 'women', 'women'], ['junior', null, 'women', 'women'], ['adult', null, 'men', 'men'], ['adult', null, 'minis', 'men'], ['junior', null, 'minis', 'men'],
    [null, 'na', 'minis', 'minis'], [null, 'male', 'minis', 'minis'], [null, 'female', 'minis', 'minis'], [null, 'male', 'women', 'men'], [null, 'female', 'men', 'women'], [null, 'na', 'men', 'men'],
    ['adult', 'female', 'minis', 'women'], ['junior', 'na', 'women', 'men'], ['mini', null, 'women', 'minis']];
  const wrong = keep.filter(([a, g, cur, want]) => F.cat(a, g, cur) !== want).map(([a, g, cur, want]) => `${a}/${g} on ${cur}: ${F.cat(a, g, cur)}, not ${want}`);
  ok(!wrong.length, `a blank answer keeps the side: Junior or Adult alone keep Men or Women (Minis to Men), a gender alone keeps Minis, both given the table (${wrong.join('; ') || keep.length + ' cases'})`);
  const nat = id => { const t = club(id); return F.natOf(t, null); };
  ok(nat('BTH') === 'ENG' && nat('TLS') === 'FRA' && nat('DUB') === 'IRE' && nat('EDI') === 'SCO' && nat('CDF') === 'WAL' && nat('TRE') === 'ITA' && nat('AYR') === 'SCO' && nat('FAR') === 'ENG' && nat('EAL') === 'ENG' && nat('CPT') === 'RSA' && nat('AKL') === 'NZL', 'a club\'s country from the ladder: Bath England, Toulouse France, the URC\'s by their own (Dublin Ireland, Edinburgh Scotland, Cardiff Wales, Treviso Italy), Ayr Scotland, Farnham and Ealing England, Cape Town South Africa, Auckland New Zealand');
  ok(F.natOf({ key:'my0', custom:true, name:'X' }, null) === null && F.natOf(X.NATIONS[0], null) === null, 'none for a team you made or a nation');
}

// 5. Nothing locks: the category, the level and My Team change as ever afterwards, and never rewrite the age group or the gender.
{
  fresh(); F.open(); F.answer('mini'); F.answer('female'); $('t-skip').click(); $('ck-skip').click();
  ok(st.kids && st.diff === 0 && st.cat === 'minis', 'Mini, Female: the Kids level and Minis');
  ok(T.drills.barred('tackle') && T.drills.barred('scrum') && T.drills.barred('back') && !T.drills.barred('tag'), 'so Mini hides Contact Games (Tackling, Driving, Ball Back), as the App Store note and README now say');
  X.catPick('women'); ok(st.cat === 'women' && F.get().age === 'mini' && F.get().gender === 'female', 'Women picked on the team screen afterwards: the category moves, the profile does not');
  T.kids.segSet(2); X.save(); ok(st.diff === 1 && !st.kids && F.get().age === 'mini' && saved().profile.age === 'mini', 'the Difficulty row moved to Normal: the level moves, the age group stays');
  H.myPick(club('BTH')); ok(st.myClub === 'BTH' && F.get().age === 'mini', 'My Team changed: the profile as it was');
}

// 6. My Profile: Change in My Team's box opens it for every player; the age group and gender changed there (the Kids level left only past
//    the grown-up check); My Team's Change one press on, coming back here.
{
  fresh(); X.restore({ settings:{ myClub:'BTH', myNat:'WAL' } });
  H.render(); ok($('b-my').getAttribute('aria-label') === 'Change My Profile: Bath, Wales', `the home's Change is read out for where it goes, My Profile (${$('b-my').getAttribute('aria-label')})`);
  $('b-my').click();
  ok(shown() === 's-profile' && /Bath/.test($('pf-club').innerHTML) && /Wales/.test($('pf-club').innerHTML) && $('pf-team').getAttribute('aria-label') === 'Change My Team: Bath, Wales', 'Change in My Team\'s box: My Profile, with My Team on it, for a player who never saw the setup');
  ok($('pf-look').textContent === 'Make Your Look' && !$('pf-shirt').hidden, 'no look yet: the club\'s shirt, and Make Your Look');
  $('pf-team').click(); ok(shown() === 's-teams' && D.pickMode() === 'my' && $('t-title').textContent === 'Pick Your Club', 'My Team\'s Change: its picker, one press on (its old job)');
  ok($('t-back').textContent === 'Back to Profile', `its Back names where it goes: Back to Profile (${$('t-back').textContent})`);
  ok($('t-go').textContent === 'Done', 'on My Team\'s club its primary is Done');
  P.step(0, 1); const next = X.listName(P.view(0).team); P.go(); ok(shown() === 's-teams' && $('t-title').textContent === 'Pick Your Country' && st.myClub !== 'BTH', `Pick ${next}: the country next, as ever`);
  P.go(); ok(shown() === 's-profile', 'Done: back to My Profile');
  $('pf-team').click(); $('t-back').click(); ok(shown() === 's-profile', 'and Back to it too');
  D.openTeams('my'); ok($('t-back').textContent === 'Back to Menu', 'opened any other way, My Team\'s picker says Back to Menu'); $('t-back').click(); ok(shown() === 's-home', 'and goes home as before');
  $('b-my').click(); F.age('adult'); ok(F.get().age === 'adult' && st.diff === 1 && !st.kids && st.cat === 'men' && saved().profile.age === 'adult', 'Adult on My Profile: Normal and Men, saved');
  F.gender('female'); ok(F.get().gender === 'female' && st.cat === 'women' && st.diff === 1, 'Female: Women, the level left alone');
  F.age('mini'); ok(st.kids && st.diff === 0 && st.cat === 'minis', 'Mini: the Kids level and Minis');
  F.age('junior'); ok(!$('m-gate').hidden && st.kids && F.get().age === 'mini', 'Junior from the Kids level: the grown-up check first, nothing changed yet');
  T.kids.close(false); ok($('m-gate').hidden && st.kids && F.get().age === 'mini' && st.cat === 'minis', 'cancelled: still the Kids level, still Mini');
  F.age('junior'); const q = T.kids.gate(); if (q) for (const d of q.answer) T.kids.type(d);
  ok($('m-gate').hidden && !st.kids && st.diff === 0 && F.get().age === 'junior' && st.cat === 'women', 'answered: Junior, Easy with the Kids level off, Women');
  $('pf-look').click(); ok(shown() === 's-career-look' && F.lookFor() === 'profile' && $('ck-back').textContent === 'Back to Profile' && $('ck-pback').hidden && $('ck-done').hidden && $('ck-body-f').hidden, 'Make Your Look: Your Look, with Back to Profile');
  T.sidesOf.careerLookSet('hair', 5); ok(F.get().look && F.get().look.hair === 5 && F.get().look.g === 1 && saved().profile.look.hair === 5, 'a pick there is kept at once, on her body');
  $('ck-back').click(); ok(shown() === 's-profile' && $('pf-look').textContent === 'Change Look', 'Back to Profile; Change Look now');
  F.gender('male'); ok(F.get().look.g === 0 && st.cat === 'men', 'Male: the look\'s body follows, and Men');
  F.gender('na'); $('pf-look').click(); ok(!$('ck-body-f').hidden && F.lookDraft().g === 0, 'Not Say: the Body row, the body as it was');
  T.sidesOf.careerLookSet('g', 1); ok(F.get().look.g === 1, 'and its own body picked there');
  $('ck-back').click(); $('pf-back').click(); ok(shown() === 's-home', 'Back to Menu');
  // a player who has picked a side, filling in one question with the other blank: the side is kept (the review's cases, 2026-11-11)
  const once = (set, tap) => { fresh(); Object.assign(st, set); X.save(); $('b-my').click(); tap(); return { cat:st.cat, diff:st.diff, kids:st.kids, gate:!$('m-gate').hidden, barred:T.drills.barred('tackle') }; };
  const w = once({ cat:'women', diff:1 }, () => F.age('adult'));
  ok(w.cat === 'women' && w.diff === 1 && !w.gate, `Women, then Adult with no gender: still Women, Normal (${json(w)})`);
  const wj = once({ cat:'women', diff:2 }, () => F.age('junior'));
  ok(wj.cat === 'women' && wj.diff === 0, `Women on Hard, then Junior with no gender: still Women, Easy (${json(wj)})`);
  const mn = once({ cat:'minis', kids:false, diff:1 }, () => F.gender('na')), mm = once({ cat:'minis', kids:false, diff:1 }, () => F.gender('male')), mf = once({ cat:'minis', kids:false, diff:1 }, () => F.gender('female'));
  ok(mn.cat === 'minis' && mm.cat === 'minis' && mf.cat === 'minis' && mn.barred && mm.barred && mf.barred, `Minis, then a gender with no age group: still Minis (Not Say mixed by default, Male and Female too), Contact Games still hidden (${json([mn, mm, mf])})`);
  const ma = once({ cat:'minis', kids:false, diff:1 }, () => F.age('adult'));
  ok(ma.cat === 'men' && !ma.barred, `Minis, then Adult: Men, the age group says so (${json(ma)})`);
  const mw = once({ cat:'men', diff:1 }, () => F.gender('female'));
  ok(mw.cat === 'women' && mw.diff === 1, 'Men, then Female with no age group: Women, the level left alone');
  // the row already chosen, pressed again: nothing set again
  fresh(); $('b-my').click(); F.age('adult'); F.gender('male'); T.kids.segSet(3); X.catPick('women'); F.age('adult'); F.gender('male');
  ok(st.diff === 2 && st.cat === 'women' && F.get().age === 'adult' && F.get().gender === 'male', `Adult and Male pressed again after Hard and Women were picked: Hard and Women kept (${st.diff}, ${st.cat})`);
  F.age('junior'); ok(st.diff === 0 && st.cat === 'men', 'a different age group is set as ever: Junior, Easy, and Men for Male');
  $('pf-back').click();
}

// 6b. Settings' Age Group | Gender, under Difficulty (the owner, 2026-11-11: "once gender / age section chosen, have them in settings to
//     change"): the profile's answers, none pressed with none; a tap does what My Profile's does (profileAge, profileGender: the same
//     functions, wired to both rows by profileSeg): the level and the category, the grown-up check on leaving the Kids level and a cancelled
//     one changing nothing, the Difficulty row moved at once, Difficulty moved later never rewriting the profile. Pressed in the browser part.
{
  fresh(); H.open('settings');
  ok(H.step() === 'settings' && /^<button data-v="mini">Mini<\/button><button data-v="junior">Junior<\/button><button data-v="adult">Adult<\/button>$/.test($('set-age').innerHTML) && /^<button data-v="male">Male<\/button><button data-v="female">Female<\/button><button data-v="na">Not Say<\/button>$/.test($('set-gender').innerHTML), 'Settings: Age Group (Mini | Junior | Adult) and Gender (Male | Female | Not Say), the names alone, as its other rows');
  const src = fs.readFileSync(new URL('../src/profile.js', import.meta.url), 'utf8'), menus = fs.readFileSync(new URL('../src/ui-menus.js', import.meta.url), 'utf8');
  ok(/function profileSettings\(\) \{\s*profileSeg\('set-age', PROFILE_AGES, profile\.age, false\);\s*profileSeg\('set-gender', PROFILE_GENDERS, profile\.gender, false\);\s*\}/.test(src) && /profileSeg\('pf-age', PROFILE_AGES, profile\.age, true\);\s*profileSeg\('pf-gender', PROFILE_GENDERS, profile\.gender, false\);/.test(src)
    && /b\.addEventListener\('click', \(\) => \(list === PROFILE_AGES \? profileAge\(b\.dataset\.v\) : profileGender\(b\.dataset\.v\)\)\)/.test(src) && /if \(typeof profileSettings === 'function'\) profileSettings\(\);/.test(menus),
    'one builder for both screens\' rows (profileSeg): a press is profileAge or profileGender on My Profile and in Settings alike, and the home draws Settings\' each time it renders');
  // each tap, from a new game (Normal, Men): the age group's level, the category by the gender
  const want = { mini:[0, true], junior:[0, false], adult:[1, false] }, bad = [];
  for (const g of ['male', 'female', 'na']) for (const a of ['mini', 'junior', 'adult']) {
    fresh(); H.open('settings'); F.gender(g); F.age(a);
    const cat = a === 'mini' ? 'minis' : g === 'female' ? 'women' : 'men';
    if (st.cat !== cat || st.diff !== want[a][0] || st.kids !== want[a][1] || F.get().age !== a || F.get().gender !== g || H.step() !== 'settings' || shown() !== 's-home' || saved().profile.age !== a) bad.push(`${g}/${a}: ${st.cat} ${st.diff} ${st.kids}`);
  }
  ok(!bad.length, `Gender then Age Group in Settings: Mini the Kids level and Minis, Junior Easy, Adult Normal; Men for Male and Not Say, Women for Female; saved, Settings still open (${bad.join('; ') || '9 pairs'})`);
  fresh(); H.open('settings'); F.age('adult'); F.gender('female'); T.kids.segSet(3); F.gender('male');
  ok(st.diff === 2 && st.cat === 'men' && F.get().gender === 'male', 'a gender tapped moves the category only, never the level (Hard kept)');
  T.kids.segSet(0); H.render(); ok(F.get().age === 'adult' && st.kids, 'Difficulty moved afterwards (Kids) never rewrites the profile: still Adult');
  // the grown-up check on leaving the Kids level, from Settings as from the Difficulty row and My Profile
  fresh(); H.open('settings'); F.age('mini'); ok(st.kids && st.diff === 0 && st.cat === 'minis' && $('m-gate').hidden, 'Mini from Normal: the Kids level and Minis, no check (going on to Kids needs none)');
  F.age('adult'); ok(!$('m-gate').hidden && st.kids && st.cat === 'minis' && F.get().age === 'mini', 'Adult from the Kids level: the grown-up check first, nothing changed yet');
  T.kids.close(false); ok($('m-gate').hidden && st.kids && st.diff === 0 && st.cat === 'minis' && F.get().age === 'mini' && H.step() === 'settings' && saved().profile.age === 'mini', 'cancelled: still Mini, still the Kids level and Minis, in the save too, Settings open');
  F.gender('female'); ok($('m-gate').hidden && st.kids && st.cat === 'minis' && F.get().gender === 'female', 'a gender tapped on the Kids level asks nothing and keeps Minis (mixed)');
  F.age('junior'); { const q = T.kids.gate(); if (q) for (const d of q.answer) T.kids.type(d); }
  ok($('m-gate').hidden && !st.kids && st.diff === 0 && st.cat === 'women' && F.get().age === 'junior' && H.step() === 'settings', 'answered: Junior, Easy with the Kids level off, Women (Female)');
  F.age('junior'); ok(!T.kids.gate() && F.get().age === 'junior', 'the age group already chosen, pressed again: nothing set again');
  // My Profile and Settings: one profile, so each shows what the other set (drawn and pressed: the browser part)
  $('b-my').click(); F.gender('na'); H.open('settings'); ok(F.get().gender === 'na' && st.cat === 'men' && H.step() === 'settings', 'Not Say on My Profile, then Settings: the same profile (Junior, Not Say), Men');
}

// 6c. The team screen (the owner: "don't include on the team selection page the filter for age"): once the profile decides the category (a
//     Mini, or a Junior or an Adult with a gender) Men | Women | Minis is hidden and the teams follow the profile as the screen opens; with
//     an answer missing the switch stays, the category as it was. 2 Players keeps the switch (two people share the device); Career and the
//     setup hide it as ever. A side remembered in a category the profile no longer plays falls back as a category changed does.
{
  const cases = [[null, null, null], ['adult', null, null], ['junior', null, null], [null, 'female', null], [null, 'na', null], ['mini', null, 'minis'], ['mini', 'female', 'minis'], ['junior', 'male', 'men'], ['junior', 'female', 'women'], ['adult', 'female', 'women'], ['adult', 'na', 'men']];
  const bad = [];
  for (const [age, gender, cat] of cases) for (const mode of ['quick', 'champ', 'my']) {
    fresh(); F.set({ age, gender, look:null }); st.cat = 'women'; st.pick = [null, null];
    if (mode === 'champ') D.openTeams('champ', 'int'); else D.openTeams(mode);
    const want = cat || 'women';
    if (F.decides() !== cat || $('t-cat').hidden !== !!cat || st.cat !== want) bad.push(`${age}/${gender} ${mode}: hidden ${$('t-cat').hidden}, ${st.cat}`);
  }
  ok(!bad.length, `Quick Match, Championship and My Team: Men | Women | Minis hidden once the profile decides (a Mini; a Junior or an Adult with a gender), the category the profile's as the screen opens; shown, the category kept, with an answer missing (${bad.join('; ') || cases.length*3 + ' cases'})`);
  fresh(); F.set({ age:'adult', gender:'female', look:null }); st.cat = 'men'; D.openTeams('champ', 'int');
  ok($('t-cat').hidden && /Women$/.test($('t-go').textContent) && P.view(0).team === X.natList('women').find(t => t.id === P.view(0).team.id), `Championship as an Adult and Female: no switch, the women's twelve (${$('t-go').textContent})`);
  fresh(); F.set({ age:'adult', gender:'male', look:null }); st.cat = 'women'; D.openTeams('quick'); P.set(0);
  ok($('t-cat').hidden && /^Pick (?!.*Women)/.test($('t-go').textContent) && st.cat === 'men', `Quick Match as an Adult and Male: Men, named so (${$('t-go').textContent})`);
  fresh(); F.set({ age:'adult', gender:'male', look:null }); st.cat = 'women'; D.openJoin(); D.openTeams('two');
  ok(!$('t-cat').hidden && st.cat === 'women' && F.catFixed() === null, '2 Players keeps Men | Women | Minis and its own category (two people share the device): the profile decides nothing there');
  X.catPick('minis'); ok(st.cat === 'minis' && F.get().age === 'adult', 'and its switch still works, never rewriting the profile'); D.setTwo(false); D.goHome();
  fresh(); F.set({ age:'adult', gender:'female', look:null }); C.newOpen(); C.clubOpen();
  ok(D.pickMode() === 'career' && $('t-cat').hidden && C.draft().cat === 'women', 'Career\'s Change Club: no switch, as ever (New Player has its own Men | Women)');
  C.catPick('men'); C.clubOpen(); ok(C.draft().cat === 'men' && D.pickMode() === 'career' && $('t-cat').hidden, 'its own category, Men, kept against the profile\'s Women'); D.goHome();
  // a side remembered in another category: Bath (in every category) set again as Bath on Men; Canada (Women only) gone, no longer set
  fresh(); F.set({ age:'adult', gender:'male', look:null }); st.pick = [{ id:'CDN', cat:'women', g:'nat.cdn' }, { id:'BTH', cat:'women', g:'eng' }];
  D.openTeams('quick');
  ok(st.cat === 'men' && $('t-cat').hidden && X.listName(P.view(0).team) === 'Farnham' && !P.state().sides[0].set && X.listName(P.view(1).team) === 'Bath' && P.state().sides[1].set, `picks remembered on Women, the profile Men: Canada gone (Your Team back on My Team's club, not set), Bath set as Bath on Men (${X.listName(P.view(0).team)}, ${X.listName(P.view(1).team)})`);
  fresh(); F.set({ age:'adult', gender:'female', look:null }); st.pick = [{ id:'CDN', cat:'women', g:'nat.cdn' }, { id:'BTH', cat:'women', g:'eng' }];
  D.openTeams('quick'); ok(st.cat === 'women' && P.view(0).team.id === 'CDN' && P.state().sides[0].set && P.state().sides[1].set, 'the same picks with the profile Women: both set again, as before');
  fresh(); D.openTeams('quick'); ok(!$('t-cat').hidden && st.cat === 'men', 'no profile (a save from before it, or the setup skipped): the switch as ever');
  D.goHome();
}

// 7. Your player: in My Team's box (the art, where it is in: the browser part below), in Career's New Player, and on one man of your side in
//    each mode you play: Quick Match, Championship, a cup. Never a career's (its own player), AI v AI, the demo, Two Player or a tool's match.
{
  fresh(); F.set({ age:'adult', gender:'female', look:{ ...LOOK } });
  C.newOpen(); ok(C.draft().cat === 'women' && json(C.draft().look) === json(LOOK), 'New Career: Women for Female, on your look');
  F.set({ age:'adult', gender:'male', look:{ ...LOOK, g:0 } }); C.newOpen(); ok(C.draft().cat === 'men' && json(C.draft().look) === json({ ...LOOK, g:0 }), 'Men for Male');
  F.set({ age:'adult', gender:'na', look:{ ...LOOK } }); st.cat = 'women'; C.newOpen(); ok(C.draft().cat === 'women' && C.draft().look.g === 1, 'Not Say follows the category: Women');
  st.cat = 'minis'; C.newOpen(); ok(C.draft().cat === 'men' && C.draft().look.g === 0 && C.draft().look.style === 11, 'Minis (Career has none): Men, your look on a male body');
  F.set({ ...NONE }); C.newOpen(); ok(C.draft().cat === 'men' && json(C.draft().look) === json(C.LOOK), 'no profile: Men and the default look, as ever');
  const you = () => T.M.you, mine = () => T.behind.lookOf(T.M.players[F.NUM - 1]);
  F.set({ age:'adult', gender:'female', look:{ ...LOOK } }); st.cat = 'men';
  D.openTeams('quick'); P.set(0); P.set(1); P.kickOff(); ok(you() && you().n === F.NUM && mine().skin === 5 && mine().style === 11, 'Quick Match (Kick Off): your player is the fly-half');
  D.exitMatch();
  X.newChamp(X.CLUBS[0], X.CLUBS.slice(1, 6)); const c = X.champ(), f = c.fixtures[0].find(p => p.includes(c.user)), opp = f[0] === c.user ? f[1] : f[0];
  D.startMatch(c.teams[c.user], c.teams[opp], true); ok(T.M.champ && you() && you().n === F.NUM, 'a championship match: your player'); D.exitMatch(); X.setChamp(null);
  K.set(K.cupNew('euro', { user:club('BTH'), cat:'men' })); const fx = K.cupFixture(K.get()); D.startMatch(K.get().teams[K.get().user], K.get().teams[fx.opp], false, { cup:K.get().id, cupKO:fx.ko });
  ok(T.M.cup === 'euro' && you() && you().n === F.NUM, 'a cup match: your player'); D.exitMatch(); K.set(null);
  C.start({ name:'', pos:'B', num:7, club:X.CLUBS[0] }); C.play();
  ok(T.M.career && you() === null && mine().skin !== 5 && T.behind.lookOf(T.M.players[6]).skin === C.get().look.skin, 'a career match: no profile player, the career\'s own on his shirt (No. 7) as before'); D.exitMatch(); C.set(null);
  T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:1, auto:true, headless:true }); ok(T.M.you === undefined && mine().skin !== 5, 'AI v AI: none');
  T.newMatch(X.NATIONS[0], X.NATIONS[1], { halfLen:1e9, diff:1, demo:true, auto:true }); ok(T.M.you === undefined, 'the demo: none');
  T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:1, humans:[true, false], headless:true }); ok(T.M.you === undefined, 'a tool\'s match: none');
  D.startMatch(X.CLUBS[0], X.CLUBS[1], false, { two:true, levels:[1, 1] }); ok(T.M.two && you() === null, 'Two Player: none'); D.exitMatch();
  F.set({ ...NONE }); D.startMatch(X.CLUBS[0], X.CLUBS[1], false); ok(you() === null, 'and nobody\'s, with no look'); D.exitMatch();
}

// 8. The body rule: your face, skin and hair always; the body the side's. A men's side never draws a female body, a women's side never a
//    male one; the mixed Minis yours.
{
  const body = (look, cat) => { fresh(); F.set({ age:'adult', gender:'na', look }); D.startMatch(X.catTeam(X.CLUBS[0], cat), X.catTeam(X.CLUBS[1], cat), false); const l = T.behind.lookOf(T.M.players[F.NUM - 1]); D.exitMatch(); return l; };
  const fem = { ...LOOK, g:1 }, man = { ...LOOK, g:0 };
  const r = [body(fem, 'men'), body(man, 'women'), body(fem, 'minis'), body(man, 'minis'), body(man, 'men'), body(fem, 'women')];
  ok(r.map(l => l.g).join('') === '011001', `a female look on a men's side draws male, a male look on a women's side female, the Minis your own, each side its own otherwise (${r.map(l => l.g).join('')})`);
  ok(r.every(l => l.skin === 5 && l.hair === 5 && l.style === 11 && l.b === 1.12), 'and your skin, hair colour, hair style and build in every one');
  F.set({ ...NONE });
}

// 9. The markup and the words: Title Case labels, no arrow glyph, no em dash, nothing asked but the four, the age line under each age group.
{
  const html = readGameSource(), setup = html.slice(html.indexOf('<section class="screen" id="s-setup"'), html.indexOf('<section class="screen" id="s-career-new"'));
  const src = fs.readFileSync(new URL('../src/profile.js', import.meta.url), 'utf8');
  const small = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'on', 'to', 'in', 'for', 'as', 'at', 'by']);
  const titled = s => s.split(/[\s·]+/).filter(Boolean).every((w, i) => (i && small.has(w)) || !/^[a-z]/.test(w));
  const labels = [...setup.matchAll(/<button[^>]*>([^<]+)<\/button>/g), ...setup.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g), ...setup.matchAll(/<span class="lbl"[^>]*>([^<]+)<\/span>/g)].map(m => m[1].trim()).concat(F.AGES.map(a => a.name), F.GENDERS.map(g => g.name), F.BODIES, F.STEPS.map(s => s.title), ['Make Your Look', 'Change Look', 'Back to Profile']);
  ok(labels.length >= 20 && labels.every(titled), `every label Title Case (${labels.filter(l => !titled(l)).join(', ') || labels.length + ' labels'})`);
  ok(!/[←-⇿⟵-⟿]/.test(setup + src) && !/—/.test(setup + src), 'no arrow glyph and no em dash on the setup or My Profile, or in the code');
  ok(!/step \d of \d/i.test(setup) && !/'Step ' \+/.test(src), 'no "Step 1 of 4" in words: the game\'s rule for what a child reads (a game, not a lesson: tools/training.mjs), so a bar a step');
  ok(!/<input/.test(setup) && !/name|email|birth/i.test(setup.replace(/class="[^"]*"|id="[^"]*"/g, '')), 'nothing to type: no name, no birthday, nothing personal');
  ok(/The game asks an age group \(Mini, Junior or Adult\) and a gender, each one skippable, to set its level and side, and keeps them on this device\. Mini turns on the Kids level and Minis\./.test(html) && !/asks only an age group/.test(html) && !/never asks for an age/.test(html), 'For Grown-Ups says what it asks (an age group and a gender), that each can be skipped, what Mini turns on, and that it stays on the device');
  const md = fs.readFileSync(new URL('../PRIVACY.md', import.meta.url), 'utf8'), store = fs.readFileSync(new URL('../store-listing/APP_STORE.md', import.meta.url), 'utf8'), readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  ok(/age group/i.test(md) && /gender/i.test(md) && /look/i.test(md) && /age group/i.test(store) && /gender/i.test(store) && /## Profile/.test(readme) && /node tools\/profile\.mjs/.test(readme), 'PRIVACY.md and the App Store notes say an age group, a gender and a look are kept on the device; README has its section');
  const says = t => /Mini turns on the Kids level and Minis, which hide Contact Games, and only the grown-up check leaves the Kids level/.test(t) && !/nothing is shut off/i.test(t) && !/Not Now are on every step/.test(t) && /Skip on every step/.test(t);
  ok(says(store) && says(readme), 'the App Review note and README say what Mini shuts off (Contact Games, left only past the grown-up check), and Skip, not Not Now, on every step (section 5 pins the behaviour: T.drills.barred)');
  const checks = fs.readFileSync(new URL('./check.mjs', import.meta.url), 'utf8'), howto = fs.readFileSync(new URL('./CHECKS.md', import.meta.url), 'utf8');
  ok(/'profile'/.test(checks) && /tools\/profile\.mjs/.test(howto), 'in the default gate and in CHECKS.md');
}

const chrome = (() => { const require = createRequire(import.meta.url); for (const from of [() => require('playwright'), () => require(path.join(execFileSync('npm', ['root', '-g'], { stdio:['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright'))]) { try { return from().chromium; } catch (e) { /* not here */ } } return null; })();
await browserChecks();
console.log(`Profile: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;

// 10. In Chromium (where Playwright is installed): a person's first launch (navigator.webdriver false, no save) opens the setup over the home;
//     a save, or automation, never does. Every step and My Profile at 844x390, 667x375, 844x340, 667x320 and 568x320, a finger and a computer:
//     no scroll, nothing off the screen or cut short, every target 44px. The keyboard (the arrows, Enter, Escape) and a controller's ring
//     reach every button. My Team's box with your player in it holds everything at every size.
async function browserChecks() {
  if (process.env.GAME || process.env.NO_BROWSER) { console.log('skip the browser checks (GAME or NO_BROWSER set)'); return; }
  if (!chrome) { console.log('skip the browser checks: Playwright is not installed (npm i -g playwright && npx playwright install chromium)'); return; }
  let browser;
  try { browser = await chrome.launch(); } catch (e) { console.log('skip the browser checks: Chromium would not start (' + e.message.split('\n')[0] + ')'); return; }
  const dir = fileURLToPath(new URL('../', import.meta.url));
  const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webp':'image/webp', '.webmanifest':'application/manifest+json' };
  const server = http.createServer((req, res) => {
    const file = path.resolve(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type':TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const PERSON = () => { Object.defineProperty(Navigator.prototype, 'webdriver', { get:() => false }); };
  // what a screen shows, measured: the page never scrolls, nothing off the screen, no button under 44px, no name cut short, the title on one line
  const MEASURE = `window.__measure = () => {
    const s = [...document.querySelectorAll('.screen')].find(x => !x.hidden), vis = el => !!el && !el.hidden && !el.closest('[hidden]') && el.getBoundingClientRect().width > 0;
    const btns = [...s.querySelectorAll('button')].filter(vis), r = el => el.getBoundingClientRect();
    return { id:s.id, scroll:s.scrollHeight - s.clientHeight, wide:document.documentElement.scrollWidth - innerWidth, n:btns.length,
      small:btns.filter(b => r(b).height < 43.5 || r(b).width < 43.5).map(b => b.id || b.textContent.trim()),
      off:btns.filter(b => r(b).top < -0.5 || r(b).bottom > innerHeight + 0.5 || r(b).left < -0.5 || r(b).right > innerWidth + 0.5).map(b => b.id || b.textContent.trim()),
      cut:[...s.querySelectorAll('.su-word, .su-line, h2.title, .pf-names b, .btn')].filter(vis).filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible').map(e => e.textContent.trim()) };
  };`;
  try {
    const SIZES = [[844, 390], [667, 375], [844, 340], [667, 320], [568, 320]];
    for (const [w, h] of SIZES) for (const touch of [true, false]) {
      const kind = `${w}x${h} ${touch ? 'touch' : 'desk'}`;
      const ctx = await browser.newContext({ viewport:{ width:w, height:h }, deviceScaleFactor:1, isMobile:touch, hasTouch:touch, serviceWorkers:'block' });
      const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(PERSON); await page.addInitScript(MEASURE);
      await page.goto(base + 'index.html', { waitUntil:'load' }); await page.evaluate(() => document.fonts.ready);
      // the first launch, step by step, measured at each; then Done, and the home with your player in My Team's box
      const flow = await page.evaluate(async () => {
        const T = window.__tryline, $ = id => document.getElementById(id), out = [];
        const backIs = () => [$('su-back').textContent.trim(), getComputedStyle($('su-back')).visibility];
        out.push(['boot', window.__measure(), T.profile.run() && T.profile.run().step, backIs()]);
        $('su-skip').click(); out.push(['gender', window.__measure(), backIs()]);
        $('su-back').click(); document.querySelector('#su-opts [data-v="adult"]').click();
        document.querySelector('#su-opts [data-v="na"]').click(); out.push(['club', window.__measure(), T.debug.pickMode()]);
        $('t-go').click(); await (T.behind.ART.promise || Promise.resolve()); T.profile.lookOpen('setup'); out.push(['look', window.__measure(), !$('ck-body-f').hidden]);
        $('ck-body').children[1].click(); $('ck-style').children[11].click(); $('ck-hair').children[5].click();
        $('ck-done').click(); await new Promise(r => setTimeout(r, 50));
        const sh = $('my-shirt'), cv = sh.querySelector('canvas'), box = $('my-box');
        out.push(['home', window.__measure(), { me:sh.classList.contains('me'), drawn:!!cv && (() => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; for (let i = 3; i < d.length; i += 4) if (d[i] > 10) return true; return false; })(), inner:box.scrollHeight - box.clientHeight, fit:box.dataset.fit || '0', profile:T.profile.get() }]);
        $('b-my').click(); out.push(['profile', window.__measure(), !$('pf-cv').hidden]);
        $('pf-look').click(); out.push(['profile look', window.__measure()]);
        return out;
      });
      const bad = flow.filter(([, m]) => m.scroll > 0 || m.wide > 0 || m.small.length || m.off.length || m.cut.length);
      ok(flow[0][1].id === 's-setup' && flow[0][2] === 0, `${kind}: a person's first launch opens the setup on Age Group`);
      ok(flow[0][3][1] === 'hidden' && json(flow[1][2]) === json(['Back', 'visible']), `${kind}: no Back on the first step (its slot kept), Back on the second (${json([flow[0][3], flow[1][2]])})`);
      ok(!bad.length && flow.length === 7, `${kind}: Age Group, Gender, Club, Your Look, the home after and My Profile each fit with no scroll, nothing off the screen or cut short, every target 44px (${bad.map(([k, m]) => k + ' ' + json(m)).join('; ') || flow.length + ' screens'})`);
      ok(flow[2][2] === 'setup' && flow[3][2] === true, `${kind}: Club is the team screen's setup mode, and Not Say gives Your Look its Body row`);
      const home = flow[4][2];
      ok(home.me && home.drawn && home.inner <= 0 && json(home.profile) === json({ age:'adult', gender:'na', look:{ g:1, skin:2, hair:5, style:11, b:1 } }), `${kind}: Done: your player drawn in My Team's box in the shirt's place, the box holding everything (step ${home.fit}), the profile kept (${json(home)})`);
      ok(flow[5][2] === true, `${kind}: My Profile draws your player too`);
      // a save, and automation: never the setup
      const p2 = await ctx.newPage(); await p2.addInitScript(PERSON); await p2.addInitScript(() => localStorage.setItem('tryline.v1', '{"settings":{"played":3}}'));
      await p2.goto(base + 'index.html', { waitUntil:'load' }); const withSave = await p2.evaluate(() => [...document.querySelectorAll('.screen')].find(x => !x.hidden).id); await p2.close();
      const ctx2 = await browser.newContext({ viewport:{ width:w, height:h }, serviceWorkers:'block' }); const p3 = await ctx2.newPage();
      await p3.goto(base + 'index.html', { waitUntil:'load' }); const bot = await p3.evaluate(() => [[...document.querySelectorAll('.screen')].find(x => !x.hidden).id, navigator.webdriver]); await ctx2.close();
      ok(withSave === 's-home' && bot[0] === 's-home' && bot[1] === true, `${kind}: with a save, or under automation (the tools), the home as ever (${withSave}, ${json(bot)})`);
      ok(!errors.length, `${kind}: no page errors (${errors.slice(0, 2).join(' | ')})`);
      // Settings' Age Group | Gender pressed for real (sections 6b and 6c): the profile's answers drawn, none pressed with none; each tap's
      // level on the Difficulty row at once; the grown-up check and its cancel; My Profile in step both ways; the step whole at this size on
      // the web and in the app (Grown-Ups), reduced motion or not; the team screen without Men | Women | Minis once the profile decides it
      {
        const ctx5 = await browser.newContext({ viewport:{ width:w, height:h }, deviceScaleFactor:1, isMobile:touch, hasTouch:touch, serviceWorkers:'block' });
        const p5 = await ctx5.newPage(); const err5 = []; p5.on('pageerror', e => err5.push(e.message));
        await p5.addInitScript(() => localStorage.setItem('tryline.v1', '{"settings":{"played":3}}'));
        await p5.goto(base + 'index.html', { waitUntil:'load' }); await p5.evaluate(() => document.fonts.ready);
        const SET = `window.__set = () => {
          const T = window.__tryline, $ = id => document.getElementById(id), r = el => el.getBoundingClientRect(), vis = el => !!el && !el.hidden && !el.closest('[hidden]') && r(el).width > 0;
          const on = sel => [...document.querySelectorAll(sel + ' button')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.v || b.textContent.trim()).join() || 'none';
          const p = $('hp-settings'), home = $('s-home'), btns = [...p.querySelectorAll('button')].filter(vis);
          return { age:on('#set-age'), gender:on('#set-gender'), diff:on('#hp-settings [data-key="diff"]'), cat:T.debug.settings().cat, gate:!$('m-gate').hidden, step:T.home.step(),
            page:home.scrollHeight - home.clientHeight, wide:document.documentElement.scrollWidth - innerWidth, inner:p.scrollHeight - p.clientHeight, n:btns.length,
            rows:[...p.querySelectorAll('.set')].filter(vis).filter(x => r(x).top < r(p).top - 0.5 || r(x).bottom > r(p).bottom + 0.5 || r(x).bottom > innerHeight + 0.5).map(x => x.className),
            small:btns.filter(b => r(b).height < 43.5 || r(b).width < 43.5).map(b => b.textContent.trim()),
            cut:[...p.querySelectorAll('.lbl, .ver, button')].filter(vis).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim()), grown:vis($('b-grown')) };
        };`;
        await p5.evaluate(SET);
        const fitBad = m => m.page > 0 || m.wide > 0 || m.inner > 0 || m.rows.length || m.small.length || m.cut.length;
        const run = await p5.evaluate(() => {
          const T = window.__tryline, S = T.store, $ = id => document.getElementById(id), out = {}, tap = (id, v) => $(id).querySelector(`[data-v="${v}"]`).click();
          T.profile.set({ age:null, gender:null, look:null }); T.debug.goHome(); T.home.open('settings'); out.none = window.__set();
          for (const app of [false, true]) { S.setNative(app); S.setStarted(app); S.setBought([]); T.debug.goHome(); T.home.open('settings'); out[app ? 'app' : 'web'] = window.__set(); }
          S.setNative(false); S.setStarted(false); T.debug.goHome(); T.home.open('settings');
          tap('set-age', 'mini'); out.mini = window.__set();
          tap('set-age', 'junior'); out.ask = window.__set(); $('pg-cancel').click(); out.cancel = window.__set();
          tap('set-age', 'junior'); for (const d of T.kids.gate().answer) $('pg-k' + d).click(); out.junior = window.__set();
          tap('set-gender', 'female'); out.female = window.__set();
          tap('set-age', 'adult'); out.adult = window.__set();
          tap('set-gender', 'na'); out.na = window.__set();
          $('hs-back').click(); $('b-my').click();
          const mine = sel => [...document.querySelectorAll(sel + ' button')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.v).join() || 'none';
          out.profile = [mine('#pf-age'), mine('#pf-gender')];
          $('pf-gender').querySelector('[data-v="female"]').click(); $('pf-back').click(); T.home.open('settings'); out.back = window.__set();
          // the team screen: no switch once the profile decides (Adult, Female now), the switch while it does not, 2 Players keeping it
          const top = () => { const bar = document.querySelector('.pk-top').getBoundingClientRect(), f = $('t-find').getBoundingClientRect(), n = document.querySelector('.pk-name').getBoundingClientRect(), sc = $('s-teams');
            return { cat:$('t-cat').hidden ? 'none' : [...$('t-cat').children].find(b => b.getAttribute('aria-pressed') === 'true').dataset.cat, played:T.debug.settings().cat, right:Math.round(bar.right - f.right), clear:n.right <= f.left, scroll:sc.scrollHeight - sc.clientHeight, wide:document.documentElement.scrollWidth - innerWidth }; };
          T.debug.settings().pick = [null, null]; T.debug.openTeams('quick'); out.quick = top();
          T.debug.openTeams('champ', 'int'); out.champ = top();
          T.debug.openJoin(); T.debug.openTeams('two'); out.two = top(); T.debug.setTwo(false);
          T.profile.set({ age:'adult', gender:null, look:null }); T.debug.settings().cat = 'minis'; T.debug.openTeams('quick'); out.open = top();
          T.profile.set({ age:null, gender:null, look:null }); T.debug.goHome();
          return out;
        });
        const st5 = k => [run[k].age, run[k].gender, run[k].diff, run[k].cat].join(' ');
        ok(st5('none') === 'none none Normal men' && run.none.n === 21 && !run.none.grown, `${kind}: Settings with no profile: no age group or gender pressed, 21 buttons (${st5('none')})`);
        const fits = ['none', 'web', 'app', 'mini', 'ask', 'cancel', 'junior', 'adult', 'na', 'back'].filter(k => fitBad(run[k]));
        ok(!fits.length && run.app.grown && run.app.n === 22, `${kind}: Settings whole with its four rows, the web and the app (Grown-Ups a third of Sound's row): no page scroll, nothing scrolled inside the step, every row inside its panel and the screen, every target 44px, nothing cut (${fits.map(k => k + ' ' + json(run[k])).join('; ') || 'every state'})`);
        ok(st5('mini') === 'mini none Kids minis' && !run.mini.gate && run.mini.step === 'settings', `${kind}: Mini: the Difficulty row on Kids at once, Minis (${st5('mini')})`);
        ok(run.ask.gate && st5('ask') === 'mini none Kids minis' && !run.cancel.gate && st5('cancel') === 'mini none Kids minis' && run.cancel.step === 'settings', `${kind}: Junior from the Kids level: the grown-up check, nothing moved; Cancel: still Mini and Kids, Settings open (${st5('ask')}, ${st5('cancel')})`);
        ok(st5('junior') === 'junior none Easy men' && st5('female') === 'junior female Easy women' && st5('adult') === 'adult female Normal women' && st5('na') === 'adult na Normal men', `${kind}: answered, Junior and Easy; Female, Women, the level kept; Adult, Normal; Not Say, Men (${['junior', 'female', 'adult', 'na'].map(st5).join('; ')})`);
        ok(json(run.profile) === json(['adult', 'na']) && run.back.gender === 'female' && run.back.cat === 'women', `${kind}: My Profile shows what Settings set (Adult, Not Say), and Settings what My Profile set (Female, Women) (${json(run.profile)}, ${run.back.gender})`);
        ok(run.quick.cat === 'none' && run.quick.played === 'women' && run.champ.cat === 'none' && run.quick.right === 0 && run.quick.clear && run.champ.right === 0 && !run.quick.scroll && !run.quick.wide && !run.champ.scroll, `${kind}: the team screen as an Adult and Female: no Men | Women | Minis in Quick Match or Championship, Women played, the search icon at the top bar's right end, clear of the title, no scroll (${json([run.quick, run.champ])})`);
        ok(run.two.cat === 'women' && run.open.cat === 'minis' && run.open.played === 'minis', `${kind}: 2 Players keeps the switch; with no gender the switch is back and the side as it was (Minis) (${json([run.two, run.open])})`);
        await p5.emulateMedia({ reducedMotion:'reduce' });
        const calm = await p5.evaluate(() => { const T = window.__tryline; T.profile.set({ age:'junior', gender:'male', look:null }); T.debug.goHome(); T.home.open('settings'); return window.__set(); });
        ok(!fitBad(calm) && calm.age === 'junior' && calm.gender === 'male', `${kind}: reduced motion: Settings as ever, whole, its answers pressed (${json([calm.age, calm.gender, calm.inner])})`);
        if (!touch) {
          // the keyboard: Tab in order (Difficulty, Age Group, Gender, then the rest); the arrows a row at a time, Up from the first row to Back
          await p5.evaluate(() => { const T = window.__tryline; T.debug.goHome(); T.home.open('settings'); document.querySelector('#hp-settings [data-key="diff"] button').focus(); });
          const name = () => p5.evaluate(() => { const a = document.activeElement, s = a && a.closest('.seg'); return !a ? 'none' : s ? (s.dataset.key || s.id) + ':' + (a.dataset.v || a.textContent.trim()) : a.id; });
          const tabs = [await name()]; for (let i = 0; i < 10; i++) { await p5.keyboard.press('Tab'); tabs.push(await name()); }
          const arrows = []; await p5.evaluate(() => document.querySelector('#hp-settings [data-key="diff"] button').focus());
          for (const k of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowUp']) { await p5.keyboard.press(k); arrows.push(await name()); }
          await p5.evaluate(() => document.querySelector('#set-gender [data-v="na"]').focus()); await p5.keyboard.press('ArrowDown'); arrows.push(await name()); await p5.keyboard.press('ArrowUp'); arrows.push(await name());
          ok(json(tabs) === json(['diff:Kids', 'diff:Easy', 'diff:Normal', 'diff:Hard', 'set-age:mini', 'set-age:junior', 'set-age:adult', 'set-gender:male', 'set-gender:female', 'set-gender:na', 'sound:On']), `${kind}: Tab goes Difficulty, then Age Group, then Gender, then the rest (${tabs.join(' ')})`);
          ok(json(arrows) === json(['set-age:mini', 'sound:On', 'half:2 Min', 'sound:On', 'set-age:mini', 'diff:Kids', 'hs-back', 'hints:Off', 'set-gender:na']), `${kind}: Down from Kids to Mini, to Sound's On, to Half Length's 2 Min, and Up back the same way to Back; Down from Not Say to Match Help's Off and Up again (${arrows.join(' ')})`);
          // a controller: the ring from its first press reaches every button of Settings, and Down from Kids goes a row at a time
          const pad = await p5.evaluate(() => {
            const T = window.__tryline, $ = id => document.getElementById(id), p = $('hp-settings'); T.debug.goHome(); T.home.open('settings'); T.home.ring(null);
            const all = [...p.querySelectorAll('button')].filter(b => !b.hidden && !b.closest('[hidden]') && b.getBoundingClientRect().width > 0), seen = new Set(), todo = [T.navMove(0, 0, 0)];
            while (todo.length) { const el = todo.pop(); if (!el || seen.has(el)) continue; seen.add(el); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { T.home.ring(el); todo.push(T.navMove(0, dx, dy)); } }
            const nm = el => !el ? 'none' : el.closest('.seg') ? (el.closest('.seg').dataset.key || el.closest('.seg').id) + ':' + (el.dataset.v || el.textContent.trim()) : el.id;
            T.home.ring(p.querySelector('[data-key="diff"] button')); const path = []; for (let i = 0; i < 4; i++) path.push(nm(T.navMove(0, 0, 1)));
            T.home.ring(null);
            return { missing:all.filter(b => !seen.has(b)).map(nm), path };
          });
          ok(!pad.missing.length && json(pad.path) === json(['set-age:mini', 'sound:On', 'half:2 Min', 'none']), `${kind}: a controller's ring reaches every button of Settings, Age Group and Gender among them, and Down goes a row at a time (${json(pad)})`);
        }
        ok(!err5.length, `${kind}: no page errors in Settings or on the team screen (${err5.slice(0, 2).join(' | ')})`);
        await ctx5.close();
      }
      // the keyboard and a controller (once a size, on the computer)
      if (!touch) {
        const ctx4 = await browser.newContext({ viewport:{ width:w, height:h }, deviceScaleFactor:1, serviceWorkers:'block' });   // its own storage: a first launch again
        const p4 = await ctx4.newPage(); await p4.addInitScript(PERSON);
        await p4.goto(base + 'index.html', { waitUntil:'load' });
        await p4.keyboard.press('ArrowRight'); const k1 = await p4.evaluate(() => document.activeElement && document.activeElement.dataset.v);
        await p4.keyboard.press('ArrowRight'); const k2 = await p4.evaluate(() => document.activeElement && document.activeElement.dataset.v);
        await p4.keyboard.press('Enter'); const k3 = await p4.evaluate(() => [window.__tryline.profile.run().age, window.__tryline.profile.run().step]);
        await p4.keyboard.press('Escape'); const k4 = await p4.evaluate(() => window.__tryline.profile.run().step);
        await p4.keyboard.press('ArrowUp'); const k5 = await p4.evaluate(() => document.activeElement && document.activeElement.id);
        ok(k1 === 'mini' && k2 === 'junior' && json(k3) === json(['junior', 1]) && k4 === 0 && k5 === 'su-skip', `${kind}: the arrow keys from the start (Mini, then Junior), Enter picks it and moves on, Escape is Back, Up reaches Skip (no Back on the first step) (${json([k1, k2, k3, k4, k5])})`);
        // the Club from the keyboard: the focus on the card, the arrows step the clubs, Enter picks; Escape is Back there too (the team screen has none of its own)
        const at = () => p4.evaluate(() => { const T = window.__tryline, a = document.activeElement, r = T.profile.run(); return { screen:[...document.querySelectorAll('.screen')].find(x => !x.hidden).id, step:r && r.step, act:a && a.dataset ? a.dataset.act || a.dataset.v || a.id : null, club:T.picker.view(0) && T.picker.view(0).team && T.picker.view(0).team.name }; });
        await p4.keyboard.press('ArrowDown'); await p4.keyboard.press('Enter'); await p4.keyboard.press('Enter'); const c1 = await at();
        await p4.keyboard.press('ArrowRight'); const c2 = await at();
        await p4.keyboard.press('Escape'); const c3 = await at();
        await p4.keyboard.press('Enter'); const c4 = await at(); await p4.keyboard.press('Enter'); const c5 = await at();
        await p4.keyboard.press('Escape'); const c6 = await at();
        ok(c1.screen === 's-teams' && c1.step === 2 && c1.act === 'pick' && c2.act === 'pick' && c2.club !== c1.club && c3.screen === 's-setup' && c3.step === 1 && c4.step === 2 && c4.act === 'pick' && c5.screen === 's-career-look' && c5.step === 3 && c6.screen === 's-teams' && c6.step === 2,
          `${kind}: the Club from the keyboard: the card focused, Right the next club, Escape back to Gender, Enter on to the Club and Enter picks; Escape on Your Look back to the Club (${json([c1, c2, c3, c4, c5, c6])})`);
        const reach = await p4.evaluate(() => {
          const T = window.__tryline, $ = id => document.getElementById(id), res = {};
          const walk = () => { const s = [...document.querySelectorAll('.screen')].find(x => !x.hidden), all = [...s.querySelectorAll('button')].filter(b => !b.disabled && !b.closest('[hidden]') && b.getBoundingClientRect().width > 0), seen = new Set(), todo = [T.navMove(0, 0, 0)];
            while (todo.length) { const el = todo.pop(); if (!el || seen.has(el)) continue; seen.add(el); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { T.home.ring(el); todo.push(T.navMove(0, dx, dy)); } }
            T.home.ring(null); return all.filter(b => !seen.has(b)).map(b => b.id || b.textContent.trim()); };
          T.profile.step(0); res.age = walk(); T.profile.step(1); res.gender = walk();
          T.profile.answer('adult'); T.profile.answer('male'); T.profile.step(3); res.look = walk();
          T.profile.step(2); T.home.ring(null); T.navMove(0, 0, 0); T.picker.lift(0); const top = []; for (const d of [[0, -1], [-1, 0], [1, 0], [0, -1]]) { const el = T.navMove(0, d[0], d[1]); top.push(el && el.id); } res.club = top; T.home.ring(null);
          T.profile.end(false); $('b-my').click(); res.profile = walk(); T.navBack(0); res.back = [...document.querySelectorAll('.screen')].find(x => !x.hidden).id;
          return res;
        });
        ok(!reach.age.length && !reach.gender.length && !reach.look.length && !reach.profile.length && reach.back === 's-home', `${kind}: a controller's ring reaches every button on Age Group, Gender, Your Look and My Profile, and B is Back (${json(reach)})`);
        ok(reach.club.includes('t-skip') || reach.club.includes('t-sback'), `${kind}: on the Club, the lifted ring reaches Back and Skip along the top (${json(reach.club)})`);
        await ctx4.close();
      }
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
}
