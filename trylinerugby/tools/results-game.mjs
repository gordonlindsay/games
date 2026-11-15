// Real results in the game (src/results.js): results.json's checks, good and hostile; the UK date and the Form's window across the clocks
// changing; who has a boost (never Kids, Minis, a club's Women, a made team, My League or a Legend); the boost applied at kick-off on a copy,
// a saved championship's next match using it, star traits and Stronger Side on the side as it is; RESULTS off, and on with no file, playing
// every match and drawing every screen exactly as before; fetching at boot on the web and in the app; My Team's box, the team card and the
// hub with and without a result; and, where Playwright is installed, the fit at the five phone sizes and the screenshots. Exits 1 on any failure.
// node tools/results-game.mjs        (RESULTS_CHILD is the tool run again in a child, to print one build's fingerprint)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
process.env.SEED ??= '41';
const { T, reseed, bot, rndCalls } = await import('./harness.mjs');
const D = T.debug, X = T.teams, R = T.real, K = T.cups, C = T.career, S = D.settings();
const $ = id => document.getElementById(id);
const FIXTURE = fileURLToPath(new URL('./fixtures/results-game/results.json', import.meta.url));
const FILE = () => JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const by = id => X.ALL_TEAMS.find(t => t.id === id);
const nat = (id, cat = 'men') => X.natList(cat).find(t => t.id === id);
const json = v => JSON.stringify(v);
const KEYS = ['pace', 'power', 'handling', 'kicking', 'stamina'];
const abil = t => KEYS.map(k => T.stamina.abilityOf(t, k));
S.tut = D.TUT_IDS.slice(); if (D.COACH_IDS) S.tips = D.COACH_IDS.slice(); S.coach = false; S.played = 5; S.hints = false; S.diff = 1; S.kids = false;

/* One match through startMatch, played to full time by the harness's bot (half time's Second Half, a penalty's choice): the score, the
   tries, the steps and the draws it took. */
function played(start) {
  reseed(5); const r0 = rndCalls();
  start();
  const M = T.M; let n = 0;
  while (!M.over && n < 600000) {
    if (M.phase === 'break') { $('br-go').click(); continue; }
    if (M.phase === 'menu' && !$('m-pen').hidden) { ($('p-goal').disabled ? $('p-tap') : $('p-goal')).click(); continue; }
    bot(0); D.frameStep(T.STEP); n++;
  }
  const out = [M.score.slice(), M.tries.slice(), n, rndCalls() - r0, abil(M.nat[0]), abil(M.nat[1])];
  D.exitMatch();
  return out;
}
function aivai(a, b) {   // AI v AI and the balance tools: newMatch with no one playing, never startMatch
  reseed(9); const r0 = rndCalls();
  T.newMatch(a, b, { halfLen:30, diff:1, headless:true, auto:true });
  let n = 0; while (!T.M.over && n < 200000) { T.update(T.STEP); n++; }
  return [T.M.score.slice(), T.M.tries.slice(), n, rndCalls() - r0];
}
const FAR = () => by('FAR'), WIM = () => by('WIM');
const HUB = () => ['WIM', 'OAE', 'BRC', 'TWE', 'QUI'].map(by);   // Wimbledon the weakest of the five, so Farnham's first round is against it
/* Every print a build gives here: the matches a player plays (Quick Match, a Championship's, a cup's, 2 Players, a career's), AI v AI, and
   the screens (My Team's box, both cards, the hub's fixture), as JSON. A child prints it as its last line. */
function fingerprint() {
  const out = { rnd0:rndCalls() };
  out.quick = played(() => D.startMatch(FAR(), WIM(), false));
  out.quickFI = played(() => D.startMatch(nat('FIJ'), nat('ITA'), false));
  out.two = played(() => D.startMatch(FAR(), WIM(), false, { two:true, levels:[1, 1] }));
  X.setChamp(null); X.newChamp(FAR(), HUB());
  const ch = X.champ(), opp = () => { const p = ch.fixtures[ch.round].find(x => x.includes(ch.user)); return p[0] === ch.user ? p[1] : p[0]; };
  out.champ = played(() => D.startMatch(ch.teams[ch.user], ch.teams[opp()], true));
  out.champSaved = json({ ...X.champ(), id:null });   // its id is the clock's
  out.champTeams = json(X.champ().teams);
  out.cup = played(() => D.startMatch(nat('ENG'), nat('JPN'), false, { cup:'world', cupKO:false }));
  const cr = C.create({ pos:'B', num:10, club:FAR() }); C.set(cr);
  out.career = played(() => C.play());   // the career's own path: its next fixture, his look on the squad, careerArm
  out.careerSaved = json(C.get()).replace(/"(season|career)-[a-z0-9]+-\d+"/g, '"id"');   // its ids are the clock's
  C.set(null); X.setChamp(null);
  out.auto = aivai(FAR(), WIM());
  out.autoNat = aivai(nat('ENG'), nat('JPN'));
  S.myClub = 'FAR'; S.myNat = 'ENG'; D.goHome();
  out.home = ['my-real', 'my-sub', 'my-league', 'my-rec', 'my-form', 'my-nat'].map(id => [$(id).innerHTML, $(id).hidden, $(id).title || '']);
  out.homeClass = $('my-box').classList.contains('real');
  S.pick = [{ id:'FAR', cat:'men', g:null }, { id:'WIM', cat:'men', g:null }]; D.openTeams('quick');
  out.cards = [$('t-side0').innerHTML, $('t-side1').innerHTML];
  X.newChamp(FAR(), HUB()); X.setChamp(X.champ()); D.renderHub();
  out.hub = $('hub-next').innerHTML;
  X.setChamp(null); D.goHome();
  out.rnd = rndCalls();
  return out;
}
if (process.env.RESULTS_CHILD) {
  if (process.env.RESULTS_CHILD === 'table') R.set(FILE(), process.env.RESULTS_NOW);
  console.log(json(fingerprint()));
  process.exit(0);
}
function child(env) {
  const out = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { env:{ ...process.env, RESULTS_CHILD:'1', ...env }, encoding:'utf8', maxBuffer:64*1024*1024 });
  const last = (out.stdout || '').trim().split('\n').filter(Boolean).pop() || '';
  try { return JSON.parse(last); } catch (e) { return { error:(out.stderr || out.stdout || '').slice(-2000) }; }
}

let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };

// 1. results.json's checks: a good file whole, hostile files refused whole, a bad entry dropped alone
{
  const NOW = Date.parse('2026-11-16T09:00:00Z');
  const good = R.clean(FILE(), NOW, null);
  ok(good && Object.keys(good.clubs).length === 4 && Object.keys(good.men).length === 2 && Object.keys(good.women).length === 1, `the fixture passes whole (${good && Object.keys(good.clubs).join(',')})`);
  ok(good && json(good.clubs.FAR) === json({ date:'2026-11-14', ha:'a', res:'W', f:38, a:34, opp:'OAE', oppName:'Old Alleynians', comp:'Regional 1 South Central', league:'Regional 1 South Central', pos:5, of:12, p:7, w:4, d:0, l:3, pts:16, prePos:6, oppPos:8, boost:1, from:'2026-11-15', until:'2026-11-20', next:'2026-11-21' }), 'Farnham\'s entry kept field for field, and nothing the game does not read (why, src)');
  const f = () => FILE();
  const whole = {
    'null':null, 'a list':[], 'a string':'x', 'version 2':{ ...f(), v:2 }, 'no version':(v => { delete v.v; return v; })(f()), 'version as a string':{ ...f(), v:'1' },
    'no generated':(v => { delete v.generated; return v; })(f()), 'a generated date only':{ ...f(), generated:'2026-11-15' }, 'an impossible time':{ ...f(), generated:'2026-11-31T21:52:00Z' }, 'a time with an offset':{ ...f(), generated:'2026-11-15T21:52:00+01:00' },
    'generated far ahead of the clock':{ ...f(), generated:'2026-11-20T00:00:00Z' }, 'clubs a list':{ ...f(), clubs:[] }, 'no men':(v => { delete v.men; return v; })(f()), 'women null':{ ...f(), women:null },
    'more entries than any week':{ ...f(), clubs:Object.fromEntries([...Array(1001)].map((_, i) => ['X' + i, {}])) },
  };
  for (const [name, v] of Object.entries(whole)) ok(R.clean(v, NOW, null) === null, `refused whole: ${name}`);
  ok(R.clean({ ...f(), generated:'2026-11-17T21:00:00Z' }, NOW, null) !== null, 'generated up to two days ahead of the device is its clock, and is taken');
  const held = R.clean(f(), NOW, null);
  ok(R.clean({ ...f(), generated:'2026-11-08T21:52:00Z' }, NOW, held) === null && R.clean({ ...f(), generated:'2026-11-16T08:43:00Z' }, NOW, held) !== null, 'never back to an older week than the one held; a newer one is taken');
  // one entry wrong: that entry dropped, the rest kept
  const far = () => f().clubs.FAR, eng = () => f().men.ENG;
  const drop = {
    'an unknown club id':['clubs', 'ZZZ', far()], 'a nation among the clubs':['clubs', 'ENG', far()], 'a Legend\'s id':['clubs', 'L03', far()], 'a club among the men':['men', 'FAR', eng()], 'Canada on Men':['men', 'CDN', eng()], 'Japan on Women':['women', 'JPN', eng()],
    'an inherited key':['clubs', '__proto__', far()], 'no date':['clubs', 'FAR', { ...far(), date:undefined }], 'an impossible date':['clubs', 'FAR', { ...far(), date:'2026-02-30' }], 'a date after generated':['clubs', 'FAR', { ...far(), date:'2026-11-16', from:'2026-11-17', until:'2026-11-22', next:'2026-11-23' }],
    'a club at a neutral ground':['clubs', 'FAR', { ...far(), ha:'n' }], 'home spelled out':['clubs', 'FAR', { ...far(), ha:'home' }], 'points over 200':['clubs', 'FAR', { ...far(), f:238 }], 'points a fraction':['clubs', 'FAR', { ...far(), f:38.5 }], 'points a string':['clubs', 'FAR', { ...far(), f:'38' }], 'negative points':['clubs', 'FAR', { ...far(), a:-1 }],
    'a result that is not the score':['clubs', 'FAR', { ...far(), res:'L', boost:-1, why:'loss' }], 'a lower case result':['clubs', 'FAR', { ...far(), res:'w' }], 'an unknown opponent id':['clubs', 'FAR', { ...far(), opp:'ZZZ' }], 'a nation as a club\'s opponent':['clubs', 'FAR', { ...far(), opp:'ENG' }],
    'HTML in the opponent':['clubs', 'FAR', { ...far(), oppName:'<img src=x onerror=alert(1)>' }], 'a closing bracket':['clubs', 'FAR', { ...far(), oppName:'Old Alleynians>' }], 'a control character':['clubs', 'FAR', { ...far(), oppName:'Old\nAlleynians' }], 'a 41 character name':['clubs', 'FAR', { ...far(), oppName:'O'.repeat(41) }], 'an empty name':['clubs', 'FAR', { ...far(), oppName:'' }], 'a name with spaces round it':['clubs', 'FAR', { ...far(), oppName:' Old Alleynians' }],
    'no competition':['clubs', 'FAR', { ...far(), comp:undefined }], 'a 61 character league':['clubs', 'FAR', { ...far(), league:'L'.repeat(61) }], 'a place below the table':['clubs', 'FAR', { ...far(), pos:13 }], 'a table of 25':['clubs', 'FAR', { ...far(), of:25, pos:5 }], 'a place with no league':['clubs', 'FAR', { ...far(), league:undefined }],
    'games that do not add up':['clubs', 'FAR', { ...far(), w:5 }], 'half a table line':['clubs', 'FAR', { ...far(), pts:undefined }], 'points below -50':['clubs', 'FAR', { ...far(), pts:-51 }], 'one place before the match':['clubs', 'FAR', { ...far(), oppPos:undefined }], 'rankings on a club':['clubs', 'FAR', { ...far(), rank:5, oppRank:6 }], 'a league on a nation':['men', 'ENG', { ...eng(), league:'Six Nations', pos:1, of:6 }],
    'a boost of 3':['clubs', 'FAR', { ...far(), boost:3 }], 'a boost the reason does not give':['clubs', 'FAR', { ...far(), boost:2 }], 'a big win given the old +2':['men', 'ENG', { ...eng(), boost:2 }], 'a higher win given the old +2':['clubs', 'FAR', { ...far(), why:'higher', oppPos:4, boost:2 }], 'a big win given +1.5 as a string':['men', 'ENG', { ...eng(), boost:'1.5' }], 'an unknown reason':['clubs', 'FAR', { ...far(), why:'great' }], 'a reason off the prototype':['clubs', 'FAR', { ...far(), why:'toString' }], 'a loss boosted':['clubs', 'WIM', { ...f().clubs.WIM, boost:1, why:'win' }],
    'a big win by 4':['clubs', 'FAR', { ...far(), why:'big', boost:1.5 }], 'higher placed by 15':['men', 'ENG', { ...eng(), why:'higher' }], 'a draw boosted':['clubs', 'NTH', { ...f().clubs.NTH, boost:1, why:'win' }], 'a walkover boosted':['clubs', 'FAR', { ...far(), wo:true }], 'a walkover flag that is not true':['clubs', 'FAR', { ...far(), wo:1 }],
    'from on the match day':['clubs', 'FAR', { ...far(), from:'2026-11-14' }], 'until past seven days':['clubs', 'FAR', { ...far(), until:'2026-11-22', next:undefined }], 'until before from':['clubs', 'FAR', { ...far(), until:'2026-11-14' }], 'until on the next fixture':['clubs', 'FAR', { ...far(), until:'2026-11-21', next:'2026-11-21' }], 'next before the match':['clubs', 'FAR', { ...far(), next:'2026-11-13' }], 'no until':['clubs', 'FAR', { ...far(), until:undefined }],
    'a win by 15 given +1':['clubs', 'FAR', { ...far(), f:49 }], 'higher over a side placed lower':['clubs', 'FAR', { ...far(), why:'higher', boost:1.5 }], 'higher with no places':['clubs', 'FAR', (e => { delete e.prePos; delete e.oppPos; return { ...e, why:'higher', boost:1.5 }; })(far())],
    'a win over a side placed higher given +1':['clubs', 'FAR', { ...far(), oppPos:4 }], 'two clubs on one place before the match':['clubs', 'FAR', { ...far(), oppPos:far().prePos }], 'two nations on one ranking':['men', 'ENG', { ...eng(), oppRank:eng().rank }], 'a Test win over a higher ranking given +1':['women', 'ENG', { ...f().women.ENG, why:'win', boost:1 }],
    'a draw\'s window over the next fixture':['clubs', 'NTH', { ...f().clubs.NTH, next:'2026-11-03' }], 'a draw\'s until before from':['clubs', 'NTH', { ...f().clubs.NTH, until:'2026-10-31' }],
  };
  for (const [name, [kind, id, e]] of Object.entries(drop)) {
    const v = f(); if (id === '__proto__') Object.defineProperty(v[kind], id, { value:e, enumerable:true, configurable:true }); else v[kind][id] = e;
    const out = R.clean(v, NOW, null), kept = out && (kind === 'clubs' ? ['FAR', 'WIM', 'OAE', 'NTH'] : kind === 'men' ? ['ENG', 'JPN'] : ['ENG']).filter(k => k !== id || (k === id && !['FAR', 'WIM', 'NTH', 'ENG'].includes(id)));
    ok(out && !Object.prototype.hasOwnProperty.call(out[kind], id) && kept.every(k => out[kind][k]) && Object.keys(out.clubs).length + Object.keys(out.men).length + Object.keys(out.women).length === 7 - (['FAR', 'WIM', 'NTH'].includes(id) && kind === 'clubs' || (id === 'ENG' && kind !== 'clubs') ? 1 : 0), `dropped alone: ${name}`);
  }
  // what the job may write that the game takes
  const wo = R.clean({ ...f(), clubs:{ FAR:{ ...far(), wo:true, boost:0, why:'none' } } }, NOW, null);
  ok(wo && wo.clubs.FAR.wo === true && R.line(wo.clubs.FAR) === 'Won (Walkover) v Old Alleynians', `a walkover: no boost, shown as Won (Walkover) (${wo && R.line(wo.clubs.FAR)})`);
  const none = R.clean({ ...f(), clubs:{ FAR:{ ...far(), boost:0, why:'none', until:'2026-11-15', next:'2026-11-15' } } }, NOW, null);
  ok(none && none.clubs.FAR.boost === 0, 'a win with no room before the next fixture: why none, no boost, and the result kept');
  const deduct = R.clean({ ...f(), clubs:{ FAR:{ ...far(), pts:-5 } } }, NOW, null);
  ok(deduct && deduct.clubs.FAR.pts === -5, 'a points deduction below zero is a real table line');
  ok(R.clean({ ...f(), extra:{ any:1 }, clubs:{ FAR:{ ...far(), later:'a newer field' } } }, NOW, null).clubs.FAR.later === undefined, 'an unknown key, at the top or in an entry, is ignored and never kept');
}

// 1b. the two sides agree: the job's own validator (tools/results/lib.mjs) passes the game's fixture, and the game takes the repository's real
// results.json, written by the job, whole, entry for entry, with Farnham's real line as the job wrote it
{
  const L = await import('./results/lib.mjs'), G = (await import('./results/teams.mjs')).gameTeams();
  const probs = L.validate(FILE(), G.ids);
  ok(probs.length === 0, `the game's fixture passes the job's validator (${probs.slice(0, 3).join('; ')})`);
  const REAL = fileURLToPath(new URL('../results.json', import.meta.url));
  if (fs.existsSync(REAL)) {
    const raw = JSON.parse(fs.readFileSync(REAL, 'utf8')), gen = Date.parse(raw.generated);
    ok(L.validate(raw, G.ids).length === 0, 'the real results.json passes the job\'s validator');
    const got = R.clean(raw, gen + 864e5, null), lost = got ? ['clubs', 'men', 'women'].flatMap(k => Object.keys(raw[k]).filter(id => !got[k][id]).map(id => k + ' ' + id)) : ['the whole file'];
    ok(got && lost.length === 0, `the game takes the real results.json whole: ${got ? ['clubs', 'men', 'women'].map(k => Object.keys(got[k]).length).join(' + ') : 0} entries (${lost.slice(0, 5).join(', ')})`);
    const far = got && got.clubs.FAR, w = raw.clubs.FAR;
    ok(!w || (far && json(far) === json(Object.fromEntries(Object.entries(w).filter(([k]) => !['why', 'src'].includes(k))))), 'the real Farnham entry kept field for field, less why and src');
  } else ok(true, 'no real results.json in the repository');
}

// 2. the UK date, and the Form's window across the clocks changing (BST to GMT on 25 Oct 2026, GMT to BST on 29 Mar 2026)
{
  const L = ms => R.london(Date.parse(ms));
  ok(L('2026-03-29T00:59:59Z') === '2026-03-29' && L('2026-03-28T23:59:59Z') === '2026-03-28', 'GMT before the clocks go forward: the UK date is the UTC date');
  ok(L('2026-03-29T23:00:00Z') === '2026-03-30' && L('2026-06-20T23:30:00Z') === '2026-06-21', 'British Summer Time: 23:00 UTC is midnight in the UK, the next day');
  ok(L('2026-10-24T23:30:00Z') === '2026-10-25' && L('2026-10-25T00:59:59Z') === '2026-10-25' && L('2026-10-25T23:30:00Z') === '2026-10-25' && L('2026-10-26T00:00:00Z') === '2026-10-26', 'the clocks going back on 25 Oct: 23:30 UTC the night before is already the 25th, 23:30 UTC on the 25th is still the 25th');
  ok(L('2027-03-28T01:00:00Z') === '2027-03-28' && L('2027-03-28T23:00:00Z') === '2027-03-29' && L('2027-10-31T00:30:00Z') === '2027-10-31', 'the rule in 2027 (28 Mar, 31 Oct)');
  // a window across the October change, by the device's moment
  const oct = { ...FILE(), generated:'2026-10-25T21:52:00Z', clubs:{ FAR:{ ...FILE().clubs.FAR, date:'2026-10-24', from:'2026-10-25', until:'2026-10-30', next:'2026-10-31' } }, men:{}, women:{} };
  const at = iso => { R.set(oct, iso); return R.delta(FAR()); };
  ok(at('2026-10-24T22:59:59Z') === 0 && at('2026-10-24T23:00:00Z') === 1, 'it opens at midnight UK time on from (23:00 UTC in British Summer Time)');
  ok(at('2026-10-30T23:59:59Z') === 1 && at('2026-10-31T00:00:00Z') === 0, 'it closes at midnight UK time after until (00:00 UTC once the clocks are back)');
  const mar = { ...FILE(), generated:'2026-03-29T21:52:00Z', clubs:{ FAR:{ ...FILE().clubs.FAR, date:'2026-03-28', from:'2026-03-29', until:'2026-04-03', next:'2026-04-04' } }, men:{}, women:{} };
  R.set(mar, '2026-03-28T23:59:59Z'); const before = R.delta(FAR()); R.set(mar, '2026-03-29T00:00:00Z'); const opened = R.delta(FAR());
  R.set(mar, '2026-04-03T22:59:59Z'); const last = R.delta(FAR()); R.set(mar, '2026-04-03T23:00:00Z'); const gone = R.delta(FAR());
  ok(before === 0 && opened === 1 && last === 1 && gone === 0, 'across the March change: open at 00:00 UTC (GMT), closed at 23:00 UTC on until (BST)');
  for (const [day, want] of [['2026-11-14', 0], ['2026-11-15', 1], ['2026-11-17', 1], ['2026-11-20', 1], ['2026-11-21', 0], ['2026-11-22', 0]]) { R.set(FILE(), day); ok(R.delta(FAR()) === want, `Farnham's +1 on ${day}: ${want} (${R.delta(FAR())})`); }
  R.set(FILE(), '2026-12-14'); ok(!!R.news(FAR(), 'men'), 'the result line stays 30 days after the match (14 Dec)'); R.set(FILE(), '2026-12-15'); ok(R.news(FAR(), 'men') === null, 'and is gone on the 31st day: the box as it was');
  ok(R.day('2026-11-14') === 'Sat 14 Nov' && R.day('2026-11-20') === 'Fri 20 Nov', 'dates read Sat 14 Nov');
  R.set(null);
}

// 3. who has a boost
{
  R.set(FILE(), '2026-11-17');
  const lg = { ...FAR(), key:'lg-FAR' }, made = { ...FAR(), key:'my1', custom:true }, legend = X.natList('men').length && T.locker.LEGENDS[0];
  ok(R.delta(FAR()) === 1 && R.delta(WIM()) === -1 && R.delta(nat('ENG')) === 1.5 && R.delta(nat('JPN')) === -1, 'Farnham +1 (a win, over a side placed lower), Wimbledon -1, England +1.5 (by 15 or more), Japan -1');
  ok(R.delta(by('NTH')) === 0 && R.delta(by('BRC')) === 0, 'a draw has none, and a side with no entry none');
  ok(R.delta(X.catSide(FAR(), 'women')) === 0 && R.delta(X.catSide(FAR(), 'minis')) === 0, 'a club\'s Women and Minis sides: none (they share its id, and are not its first XV)');
  ok(R.delta(nat('ENG', 'minis')) === 0, 'a Minis nation: none (it plays the men\'s ratings)');
  R.set(FILE(), '2026-11-14'); ok(R.delta(nat('ENG', 'women')) === 1.5 && R.delta(nat('ENG')) === 0, 'a women\'s nation takes the women\'s Tests (England Women +1.5 on 14 Nov, when the men\'s had none open)'); R.set(FILE(), '2026-11-17');
  ok(R.delta(made) === 0 && R.delta(lg) === 0 && (!legend || R.delta(legend) === 0) && R.delta({ ...FAR(), legend:true }) === 0, 'a team you made, a My League side and a Legend on the same code: none');
  S.kids = true; S.diff = 0; ok(R.delta(FAR()) === 0 && R.delta(nat('ENG')) === 0, 'the Kids level: none for anyone'); S.kids = false; S.diff = 1;
  S.kids = true; S.diff = 1; ok(R.delta(FAR()) === 1, 'a Kids player moved up a level is no longer at the Kids level'); S.kids = false;
  R.set(null);
}

// 4. the boost on a copy: which ability points move, no draw, the list untouched
{
  R.set(FILE(), '2026-11-17');
  const was = json(X.ALL_TEAMS), r0 = rndCalls();
  const far = R.side(FAR()), wim = R.side(WIM()), eng = R.side(nat('ENG')), none = R.side(by('BRC'));
  ok(rndCalls() === r0, 'a boosted copy draws no random number');
  ok(json(abil(FAR())) === '[3,2,3,2,1]' && json(abil(far)) === '[4,2,3,2,1]' && X.overallOf(far) === 61 && X.overallOf(FAR()) === 58 && far.real === 1, `Farnham +1: Pace 4, overall 58 to 61 (${abil(far)})`);
  const two = (() => { const v = FILE(); v.clubs.FAR = { ...v.clubs.FAR, why:'higher', boost:1.5, oppPos:4 }; R.set(v, '2026-11-17'); const t = R.side(FAR()); R.set(FILE(), '2026-11-17'); return t; })();
  ok(json(abil(two)) === '[4,2.5,3,2,1]' && X.rateOf(two) === X.rateOf(FAR()) + 1.5 && X.overallOf(two) === 62 && two.real === 1.5, `Farnham +1.5, had it been over a side placed higher: a whole point on Pace and half a point on Power, where abilitiesFor puts its next point, 58 to 62 (${abil(two)})`);
  const halfAt = (t, d) => { const v = FILE(); v.clubs.FAR = { ...v.clubs.FAR, ...(d === 1.5 ? { why:'higher', boost:1.5, oppPos:4 } : {}) }; R.set(v, '2026-11-17'); const s = R.side({ ...FAR(), ...t }); R.set(FILE(), '2026-11-17'); return abil(s); };
  ok(json(halfAt({ pace:5, power:5, handling:5, kicking:5, stamina:3 }, 1.5)) === '[5,5,5,5,4.5]', 'one ability below 5 takes the whole point and the half point too');
  ok(json(halfAt({ pace:5, power:5, handling:5, kicking:5, stamina:4 }, 1.5)) === '[5,5,5,5,5]', 'a side one point short of 25 takes the whole point, and the half has nowhere to go');
  ok(json(halfAt({ pace:4, power:4, handling:5, kicking:5, stamina:5 }, 1.5)) === '[5,4.5,5,5,5]', 'Pace before Power on a tie, as abilitiesFor orders them: the whole point on Pace, the half on Power');
  ok(X.overallOf(wim) === 52 && X.rateOf(wim) === X.rateOf(WIM()) - 1 && wim.real === -1, `Wimbledon -1: one point off where it is weakest (${abil(WIM())} to ${abil(wim)})`);
  ok(X.overallOf(eng) === 89 && json(abil(eng).map((v, i) => v - abil(nat('ENG'))[i]).filter(Boolean)) === '[1,0.5]' && X.rateOf(eng) === X.rateOf(nat('ENG')) + 1.5, `England +1.5: 84 to 89, a point on one ability and half a point on the next (${abil(nat('ENG'))} to ${abil(eng)})`);
  ok(none === by('BRC') && R.side(FAR()) !== FAR() && json(X.ALL_TEAMS) === was, 'no boost: the side itself; a boost: a copy, and no list side is ever edited');
  ok(json(abil(R.base(far))) === json(abil(FAR())) && R.base(by('BRC')) === by('BRC'), 'realBase gives the side as it is back from the copy');
  const top = { ...FAR(), pace:5, power:5, handling:5, kicking:5, stamina:5 }, low = { ...WIM(), pace:1, power:1, handling:1, kicking:1, stamina:1 };
  ok(X.rateOf(R.side(top)) === 25 && X.rateOf(R.side(low)) === 5, 'a side at 25 gains nothing, at 5 loses nothing: every ability held to 1 to 5');
  R.set(null);
}

// 5. at kick-off: the match plays the copy; a saved championship's next match uses this week's Form; star traits and Stronger Side read the side as it is
{
  R.set(FILE(), '2026-11-17');
  D.startMatch(FAR(), WIM(), false);
  ok(T.M.nat[0].real === 1 && T.M.nat[1].real === -1 && X.overallOf(T.M.nat[0]) === 61 && X.overallOf(T.M.nat[1]) === 52 && X.overallOf(FAR()) === 58, 'Quick Match: Farnham plays at 61 and Wimbledon at 52, the list\'s sides unchanged');
  D.exitMatch();
  X.setChamp(null); X.newChamp(FAR(), HUB()); X.save();
  const ch = X.champ(), saved = json(ch), p = ch.fixtures[ch.round].find(x => x.includes(ch.user)), opp = p[0] === ch.user ? p[1] : p[0];
  D.startMatch(ch.teams[ch.user], ch.teams[opp], true);
  ok(T.M.nat[0].real === 1 && T.M.champ && json(X.champ()) === saved, `a saved championship's next match plays this week's Form (Farnham v ${ch.teams[opp].name}), and the saved sides are never edited`);
  D.exitMatch(); X.setChamp(null);
  S.kids = true; S.diff = 0; D.startMatch(FAR(), WIM(), false); ok(!T.M.nat[0].real && !T.M.nat[1].real && T.M.kids, 'the Kids level: the match plays the sides as they are'); D.exitMatch(); S.kids = false; S.diff = 1;
  S.cat = 'minis'; D.startMatch(X.catTeam(FAR(), 'minis'), X.catTeam(WIM(), 'minis'), false); ok(!T.M.nat[0].real && !T.M.nat[1].real, 'Minis: none'); D.exitMatch(); S.cat = 'men';
  D.startMatch(FAR(), WIM(), false, { two:true, levels:[1, 1] }); ok(T.M.nat[0].real === 1 && T.M.nat[1].real === -1, '2 Players: both sides as one player has them'); D.exitMatch();
  // England +1.5 lifts an ability to 5: the star trait it would bring is not handed out; the side's own stars are
  D.startMatch(nat('ENG'), nat('FRA'), false);
  const raised = KEYS.filter((k, i) => abil(T.M.nat[0])[i] === 5 && abil(nat('ENG'))[i] < 5), sorted = m => json([...m.entries()].sort((a, b) => a[0] - b[0]));
  const own = T.traits.teamStars(nat('ENG')), boosted = T.traits.teamStars(T.M.nat[0]), got = new Map(T.M.players.filter(q => q.team === 0 && q.tr).map(q => [q.n, Object.keys(q.tr)]));
  ok(raised.length > 0 && sorted(own) === sorted(got) && sorted(boosted) !== sorted(own), `England at 90 (${raised.join(', ')} raised to 5, which would bring a star) has its own star traits only (${sorted(got)})`);
  D.exitMatch();
  // Stronger Side reads the sides as they are: a side that Farnham's +1 would make Stronger Side against it is not told so
  const weaker = X.ALL_TEAMS.find(t => !X.isNation(t) && !X.outmatched(t, FAR()) && X.outmatched(t, R.side(FAR())));
  ok(!!weaker && !X.outmatched(R.base(weaker), R.base(R.side(FAR()))), `Stronger Side reads the sides as they are, never this week's Form: ${weaker && weaker.name} against Farnham at 61 would be, against Farnham at 58 is not, and is not told so`);
  ok(/outmatched\(realBase\(M\.nat\[0\]\), realBase\(M\.nat\[1\]\)\)/.test(fs.readFileSync(new URL('../src/match.js', import.meta.url), 'utf8')) && /teamStars\(realBase\(M\.nat\[t\]\)/.test(fs.readFileSync(new URL('../src/traits.js', import.meta.url), 'utf8')), 'the kick-off line and the star traits read realBase');
  R.set(null);
}

// 6. RESULTS off, and on with no file: every match and screen exactly as before. With a file: only matches with a boosted side move
{
  const off = child({ RESULTS:'{"on":false}' }), on = child({}), table = child({ RESULTS_CHILD:'table', RESULTS_NOW:'2026-11-17' }), gone = child({ RESULTS_CHILD:'table', RESULTS_NOW:'2026-11-21' });
  const err = [off, on, table, gone].map(v => v.error).filter(Boolean);
  ok(!err.length, 'the four children ran' + (err.length ? ': ' + err[0] : ''));
  if (!err.length) {
    ok(json(off) === json(on), `with no file, RESULTS on is RESULTS off draw for draw and screen for screen (${off.rnd} draws, Quick Match ${json(off.quick.slice(0, 3))}, Championship ${json(off.champ.slice(0, 3))}, cup ${json(off.cup.slice(0, 3))}, career ${json(off.career.slice(0, 3))})`);
    const matchKeys = ['quick', 'quickFI', 'two', 'champ', 'cup', 'career', 'auto', 'autoNat'];
    ok(off.rnd0 === table.rnd0 && json(table.auto) === json(off.auto) && json(table.autoNat) === json(off.autoNat), 'with a file loaded: AI v AI and the balance tools play as before, and loading it drew nothing');
    ok(json(table.quickFI) === json(off.quickFI), 'with a file: a match with no boosted side (Fiji v Italy) is exactly as before');
    ok(json(table.quick) !== json(off.quick) && json(table.quick[4]) === '[4,2,3,2,1]' && json(table.champ) !== json(off.champ) && json(table.cup) !== json(off.cup), 'with a file: Farnham v Wimbledon, the Championship\'s and England\'s cup match play the boosted sides');
    ok(table.champTeams === off.champTeams && JSON.parse(table.champSaved).results.length === 1, 'and the saved championship\'s sides are byte for byte as before: only its result moved');
    ok(json(table.quick[3]) !== undefined && table.quick[3] >= 0, 'played to full time');
    ok(matchKeys.every(k => json(gone[k]) === json(off[k])), `after until (21 Nov): every match exactly as with no file`);
    ok(json(off.home) === json(on.home) && json(off.cards) === json(on.cards) && off.hub === on.hub, 'My Team\'s box, both cards and the hub: the same markup with no file');
    ok(json(table.home) !== json(off.home) && gone.homeClass === true && table.homeClass === true && off.homeClass === false, 'with a file: the box shows the result, still on the 21st (30 days)');
  }
}

// 7. the screens: My Team's box, the cards, the hub
{
  S.myClub = 'FAR'; S.myNat = 'ENG'; S.cat = 'men';
  R.set(null); D.goHome();
  const plain = { real:$('my-real').innerHTML, league:$('my-league').innerHTML, form:$('my-form').innerHTML };
  ok($('my-real').hidden && $('my-sub').hidden && !plain.real && /7th Last Season/.test(plain.league) && /fm none/.test(plain.form) && !$('my-box').classList.contains('real'), 'no file: the box as it was (7th Last Season, the five slots), no result and no Your Games');
  R.set(FILE(), '2026-11-17'); D.goHome();
  const real = $('my-real').innerHTML;
  ok(!$('my-real').hidden && !$('my-sub').hidden && $('my-sub').innerHTML === '' && $('my-box').classList.contains('real'), 'a result: shown, with the Your Games label over the games in the game');
  ok(/<span class="rr-out w">Won<\/span> 38-34 <span class="rr-v">v<\/span> Old Alleynians<\/b>/.test(real), 'Won 38-34 v Old Alleynians: the outcome a coloured word, v lower case, the opponent by the game\'s own name');
  ok(/<span class="rr-when">Sat 14 Nov<\/span><span class="gap form up">Form \+1<\/span>/.test(real), 'Sat 14 Nov with Form +1 beside it');
  ok(/<span class="sr">Last Result: Won 38-34 v Old Alleynians, Away, Sat 14 Nov\. Form plus 1 until Fri 20 Nov<\/span>/.test(real) && /aria-hidden="true" class="rr-shown"/.test(real), 'read out: Last Result, Away, the date, Form plus 1 until Fri 20 Nov');
  ok($('my-real').title === 'Away · Regional 1 South Central · Form +1 until Fri 20 Nov', `its title: Home or Away and the Form's last day (${$('my-real').title})`);
  ok($('my-league').innerHTML === '<span>Regional 1 South Central</span><span class="sep"> · </span><span>5th<span class="pts"> · 16 Pts</span></span>', `this season's league over 5th · 16 Pts (${$('my-league').innerHTML})`);
  ok(/My Country: England\. Last Test: Won 78-15 v Japan, Form plus 1\.5</.test($('my-nat').innerHTML), `My Country's read-out carries its last Test (its title too: the browser part) (${$('my-nat').innerHTML.replace(/^.*class="sr">/, '')})`);
  S.kids = true; S.diff = 0; D.goHome(); ok(/Won<\/span> 38-34/.test($('my-real').innerHTML) && !/gap form/.test($('my-real').innerHTML) && !/Form/.test($('my-nat').innerHTML) && /Last Test: Won 78-15/.test($('my-nat').innerHTML), 'the Kids level: the results show, no Form'); S.kids = false; S.diff = 1;
  S.cat = 'minis'; D.goHome(); ok(/Won<\/span> 38-34/.test($('my-real').innerHTML) && !/gap form/.test($('my-real').innerHTML), 'a Minis player: the club\'s result shows (its news), no Form'); S.cat = 'men';
  R.set(FILE(), '2026-11-22'); D.goHome(); ok(/Won<\/span> 38-34/.test($('my-real').innerHTML) && !/gap form/.test($('my-real').innerHTML) && !/Form/.test($('my-real').title), 'after until: the result stays, the Form goes');
  const lost = FILE(); lost.clubs.FAR = { ...lost.clubs.WIM, oppName:'Tunbridge Wells & Juddians', opp:null }; R.set(lost, '2026-11-17'); D.goHome();
  ok(/<span class="rr-out l">Lost<\/span> 17-24 <span class="rr-v">v<\/span> Tunbridge Wells &amp; Juddians/.test($('my-real').innerHTML) && /gap form down">Form −1</.test($('my-real').innerHTML) && /Form minus 1/.test($('my-real').innerHTML), 'a loss: Lost in coral, a name not in the game as the file has it, escaped, and Form −1 with a real minus sign, read as minus 1');
  S.myClub = 'BRC'; R.set(FILE(), '2026-11-17'); D.goHome(); ok($('my-real').hidden && /Last Season/.test($('my-league').innerHTML), 'a club with no entry: the box as it was'); S.myClub = 'FAR';
  // the cards
  R.set(null); S.pick = [{ id:'FAR', cat:'men', g:null }, { id:'WIM', cat:'men', g:null }]; D.openTeams('quick');
  const before = [$('t-side0').innerHTML, $('t-side1').innerHTML];
  R.set(FILE(), '2026-11-17'); D.openTeams('quick');
  const [c0, c1] = [$('t-side0').innerHTML, $('t-side1').innerHTML];
  ok(/Farnham/.test(c0) && /<span class="gap mine">My Team<\/span><span class="gap form up"><span aria-hidden="true">Form \+1<\/span><span class="sr">Form plus 1<\/span><\/span>/.test(c0), 'Farnham\'s card: My Team, then Form +1, read as Form plus 1');
  ok(/<span class="lbl">Pace<em class="pk-up" aria-hidden="true">\+1<\/em><\/span><span class="pk-bar" role="img" aria-label="Pace 4 of 5, Form plus 1"><i style="--v:0\.60"><\/i><b class="pk-real up" style="--a:0\.60;--w:0\.20"><\/b>/.test(c0) && !/(Power|Handling|Kicking|Stamina)<em/.test(c0), 'its bars: Pace +1, the point in yellow on the bar, the rest as they were');
  ok(/gap form down"><span aria-hidden="true">Form −1<\/span><span class="sr">Form minus 1<\/span>/.test(c1) && /pk-real down/.test(c1) && /pk-down" aria-hidden="true">−1</.test(c1), 'Wimbledon\'s: Form −1, its point lost hatched in coral, −1 beside the name');
  { // a +1.5 side's card: the chip says +1.5, and the bars show what it plays, +1 on one ability and +0.5 on the next, never a rounded +2
    const keep = S.pick; S.pick = [{ id:'ENG', cat:'men', g:null }, { id:'JPN', cat:'men', g:null }]; D.openTeams('quick');
    const e0 = $('t-side0').innerHTML, marks = [...e0.matchAll(/<span class="lbl">(\w+)<em class="pk-up" aria-hidden="true">([^<]*)<\/em>/g)].map(m => m[1] + ' ' + m[2]);
    ok(/<span class="gap form up"><span aria-hidden="true">Form \+1\.5<\/span><span class="sr">Form plus 1\.5<\/span><\/span>/.test(e0), 'England\'s card: Form +1.5, read as Form plus 1.5');
    ok(json(marks) === '["Pace +1","Handling +0.5"]', `its bars: Pace +1 and Handling +0.5, as the match plays them (${marks.join(', ')})`);
    ok(/aria-label="Handling 3\.5 of 5, Form plus 0\.5"><i style="--v:0\.60"><\/i><b class="pk-real up" style="--a:0\.60;--w:0\.10"><\/b>/.test(e0), 'the half point is half a pip on the bar, and read as 3.5 of 5');
    S.pick = keep; D.openTeams('quick');
  }
  const head = h => h.slice(0, h.indexOf('<span class="tname">'));   // the shirt and its overall badge, before the name
  const rate = h => h.slice(h.indexOf('<span class="pk-rate">'), h.indexOf('<span class="gap mine">'));
  ok(head(c0) === head(before[0]) && rate(c0).length > 30 && rate(c0) === rate(before[0]), 'the shirt, its overall and the stars are the side as it is (58, 3 stars), as without a file');
  const unform = h => h.replace(/<span class="gap form[^]*?<\/span><\/span>/g, '').replace(/<span class="pk-lt">([^<]*)<\/span>/g, '$1').replace(/<em class="pk-(up|down)" aria-hidden="true">[^<]*<\/em>/g, '').replace(/<b class="pk-real[^>]*><\/b>/g, '').replace(/aria-label="(\w+) (\d) of 5, Form (plus|minus) 1"><i style="--v:[\d.]+">/g, (m, l, v, s) => `aria-label="${l} ${s === 'plus' ? v - 1 : +v + 1} of 5"><i style="--v:${((s === 'plus' ? v - 1 : +v + 1)/5).toFixed(2)}">`);
  ok(/<span class="pk-league"><span class="gap form up pk-lf">[^]*?<\/span><\/span><span class="pk-lt">Regional 1 South Central<\/span><\/span>/.test(c0), 'the league line holds a copy of the chip for pickFit\'s last Form step (hidden until then: the browser part sees one chip a card)');
  ok(unform(c0) === before[0] && unform(c1).replace(/--v:[\d.]+/g, '') === before[1].replace(/--v:[\d.]+/g, ''), 'take the chip and the marks away and both cards are exactly as without a file');
  S.pick = [{ id:'FAR', cat:'women', g:null }, { id:'WIM', cat:'women', g:null }]; S.cat = 'women'; D.openTeams('quick'); ok(/Farnham/.test($('t-side0').innerHTML) && !/gap form/.test($('t-side0').innerHTML + $('t-side1').innerHTML), 'Farnham Women\'s and Wimbledon Women\'s cards: no Form'); S.cat = 'men';
  S.pick = [{ id:'FAR', cat:'men', g:null }, { id:'WIM', cat:'men', g:null }];
  S.kids = true; S.diff = 0; D.openTeams('quick'); ok(!/gap form|pk-real/.test($('t-side0').innerHTML + $('t-side1').innerHTML), 'the Kids level: no Form on either card'); S.kids = false; S.diff = 1;
  S.pick = [{ id:'BRC', cat:'men', g:null }, { id:'TWE', cat:'men', g:null }]; D.openTeams('quick'); const noEntry = [$('t-side0').innerHTML, $('t-side1').innerHTML];
  R.set(null); D.openTeams('quick'); ok(json(noEntry) === json([$('t-side0').innerHTML, $('t-side1').innerHTML]), 'sides with no entry: the cards exactly as with no file');
  // the hub
  R.set(FILE(), '2026-11-17'); X.newChamp(FAR(), HUB()); D.renderHub();
  const hub = $('hub-next').innerHTML;
  ok(/<span class="fx-nm"><span>Farnham<\/span><span class="gap form up">/.test(hub) && /<span class="fx-nm"><span>Wimbledon<\/span><span class="gap form down">/.test(hub), 'the hub: Farnham with Form +1, v, Wimbledon with Form −1');
  R.set(null); D.renderHub(); ok(/<span class="fx-team">[^]*?<span>Farnham<\/span><\/span>/.test($('hub-next').innerHTML) && !/fx-nm/.test($('hub-next').innerHTML), 'with no file: the fixture as it was');
  X.setChamp(null); S.pick = [null, null]; D.goHome();
}

// 8. fetching at boot: the web's own folder, the app's own site, a file held until nothing is being picked or played
{
  const res = (body, o = {}) => ({ ok:true, status:200, json:async () => body, ...o }), asked = [];
  const stub = r => (u, o) => { asked.push([u, o]); return r(); };
  R.set(null);
  ok(await R.fetch(stub(() => { throw new Error('offline'); })) === false && R.waiting() === null && R.now() === null, 'a network failure: no file, no result, no Form');
  ok(await R.fetch(stub(() => res(null, { ok:false, status:404 }))) === false && await R.fetch(stub(() => ({ ok:true, json:async () => { throw new Error('not JSON'); } }))) === false, 'nor a missing file, or one that is not JSON');
  ok(await R.fetch(stub(() => res({ ...FILE(), v:2 }))) === false && R.now() === null, 'nor one that fails its check');
  ok(asked.every(([u, o]) => u === 'results.json' && o.credentials === 'same-origin' && o.cache === 'no-cache'), 'on the web it only ever asks for its own relative results.json');
  // arrival: the home on show redraws; anywhere else it waits for goHome or openTeams
  S.myClub = 'FAR'; D.goHome();
  ok(await R.fetch(stub(() => res(FILE()))) === true && R.now() && R.waiting() === null && !$('my-real').hidden, 'a good file while the home shows: used at once, the box redrawn');
  R.set(null); D.goHome(); D.startMatch(FAR(), WIM(), false);
  ok(await R.fetch(stub(() => res(FILE()))) === true && R.waiting() && R.now() === null && !T.M.nat[0].real, 'one that comes during a match is held: the match never changes in play');
  D.exitMatch(); ok(R.now() && !R.waiting(), 'and used from the next goHome');
  R.set(null); D.openTeams('quick'); await R.fetch(stub(() => res(FILE()))); ok(R.waiting() && R.now() === null, 'one that comes while sides are being picked waits too'); D.openTeams('quick'); ok(R.now() && !R.waiting(), 'and is used from the next openTeams');
  D.goHome(); R.set(null);
  // boot: Node has no location, so the harness never asks; given one for a moment
  ok(R.boot() === false, 'the tools never fetch results.json');
  const set = (p, on) => { globalThis.location = { protocol:p }; Object.defineProperty(globalThis.navigator, 'onLine', { value:on, configurable:true }); };
  const calls = [], realFetch = globalThis.fetch; globalThis.fetch = (...a) => { calls.push(a); return Promise.reject(new Error('stub')); };
  set('https:', false); ok(R.boot() === false && !calls.length, 'offline on the web with no service worker: no request');
  Object.defineProperty(globalThis.navigator, 'serviceWorker', { value:{ controller:{} }, configurable:true });
  ok(R.boot() === true && calls.length === 1 && calls[0][0] === 'results.json', 'offline with a controlling worker: it asks, for the last good copy');
  delete globalThis.navigator.serviceWorker; calls.length = 0;
  set('file:', true); ok(R.boot() === false && !calls.length, 'from a file: no request');
  set('https:', true); ok(R.boot() === true && calls.length === 1 && calls[0][0] === 'results.json' && calls[0][1].credentials === 'same-origin', 'online on the web: one request, for the file beside the page');
  // the app: the game's own site by its address, no cookies, the last good copy kept on the device
  calls.length = 0; const store = {}, realLS = globalThis.localStorage;
  globalThis.localStorage = { getItem:k => (k in store ? store[k] : null), setItem:(k, v) => { store[k] = String(v); }, removeItem:k => { delete store[k]; } };
  globalThis.Capacitor = { isNativePlatform:() => true, Plugins:{} };
  globalThis.fetch = async (...a) => { calls.push(a); return res(FILE()); };
  set('capacitor:', true); ok(R.boot() === true && calls.length === 1 && calls[0][0] === R.SITE + 'results.json' && calls[0][1].credentials === 'omit', `in the app: one request, to the game's own site (${calls[0] && calls[0][0]}), with no cookies`);
  await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0));
  ok(R.SITE === 'https://gordonlindsay.github.io/games/trylinerugby/' && store[R.KEPT] && JSON.parse(store[R.KEPT]).clubs.FAR, 'and the good file kept on the device (tryline.results), never in the save');
  R.set(null); calls.length = 0; set('capacitor:', false);
  ok(R.boot() === true && !calls.length && R.now() && R.now().clubs.FAR, 'the app offline: no request, the kept copy used');
  store[R.KEPT] = '{"v":1,"broken'; R.set(null); ok(R.boot() === true && R.now() === null, 'a kept copy that is not a file: ignored');
  delete globalThis.Capacitor; globalThis.localStorage = realLS; globalThis.fetch = realFetch; delete globalThis.location; delete globalThis.navigator.onLine;
  R.set(null); D.goHome();
  const read = p => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
  ok(/results\.json/.test(read('../sw.js')) && /tryline-results-/.test(read('../sw.js')), 'the service worker knows the file, in a cache of its own');
  ok(!/pitchero|wikipedia|pulselive|world\.?rugby/i.test(read('../src/results.js').replace(/\/\*[^]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')), 'the game\'s code names no source: a device only ever asks the game\'s own site');
  ok(!fs.existsSync(new URL('../results.json', import.meta.url)) || R.clean(JSON.parse(read('../results.json')), Date.now(), null) !== null, 'the results.json in this tree, if any, passes the game\'s own check');
}

// 9. the docs: README, PRIVACY.md and privacy.html say it
{
  const read = p => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
  const readme = read('../README.md'), privacy = read('../PRIVACY.md'), page = read('../privacy.html');
  ok(/\*\*Real results\.\*\*/.test(readme) && /Pitchero/.test(readme) && /written permission/i.test(readme) && /Kids/.test(readme), 'README: Real results, the boost\'s rules, the Kids level and the permission risk');
  ok(/results\.json/.test(privacy) && /results\.json/.test(page), 'PRIVACY.md and privacy.html name results.json');
  ok(!/\u2014/.test(read('../src/results.js')) && !/\u2014/.test(readme.slice(readme.indexOf('**Real results.**'), readme.indexOf('**Real results.**') + 4000)), 'no em dash in the code or the README section');
}

await browserChecks();
console.log(`Results (game): ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;

function chromium() {
  const require = createRequire(import.meta.url);
  for (const from of [() => require('playwright'), () => require(path.join(execFileSync('npm', ['root', '-g'], { stdio:['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright'))]) {
    try { return from().chromium; } catch (e) { /* not here */ }
  }
  return null;
}
// 10. In Chromium (where Playwright is installed): the home, both cards and the hub with this week's results fit at 844x390, 667x375,
//     844x340, 667x320 and 568x320 with no page scroll, no clipped result line, no target under 44px and both cards' names and bars level;
//     the home with every extra the box can have (a Trophy Cabinet, Install and Updating, a Super Fan's colours); the file read at boot from
//     the page's own folder; and the screenshots. SHOTS=<dir> puts them elsewhere.
async function browserChecks() {
  if (process.env.GAME || process.env.NO_BROWSER) { console.log('skip the browser checks (GAME or NO_BROWSER set)'); return; }
  const chrome = chromium();
  if (!chrome) { console.log('skip the browser checks: Playwright is not installed'); return; }
  let browser;
  try { browser = await chrome.launch(); } catch (e) { console.log('skip the browser checks: Chromium would not start (' + e.message.split('\n')[0] + ')'); return; }
  const dir = fileURLToPath(new URL('../', import.meta.url)), shots = process.env.SHOTS || '';
  const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.png':'image/png', '.webmanifest':'application/manifest+json', '.json':'application/json' };
  let serveFile = false, asked = 0;
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/results.json') { asked++; if (!serveFile) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type':'application/json' }); fs.createReadStream(FIXTURE).pipe(res); return; }
    const file = path.resolve(dir, p.replace(/^\/+/, '') || 'index.html');
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type':TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const SAVE = { settings:{ tut:['past', 'pass', 'tackle', 'block', 'scrum', 'lineout', 'goal', 'drop'], coach:false, played:5, myClub:'FAR', myNat:'ENG' }, form:[{ k:'c:FAR', w:3, d:0, l:1, last:'WWLW' }] };
  const file = FILE();
  try {
    for (const [w, h] of [[844, 390], [667, 375], [844, 340], [667, 320], [568, 320]]) {
      const ctx = await browser.newContext({ viewport:{ width:w, height:h }, deviceScaleFactor:1, isMobile:true, hasTouch:true, serviceWorkers:'block' });
      const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(s => { try { localStorage.setItem('tryline.v1', JSON.stringify(s)); } catch (e) { /* blocked */ } }, SAVE);
      await page.goto(base + 'index.html', { waitUntil:'load' }); await page.evaluate(() => document.fonts.ready);
      const kind = `${w}x${h}`;
      const m = await page.evaluate(file => {
        const T = window.__tryline, X = T.teams, $ = id => document.getElementById(id), out = {};
        const box = el => el.getBoundingClientRect(), vis = el => !!el && !el.hidden && !el.closest('[hidden]') && box(el).width > 0;
        const scroll = () => { const s = document.scrollingElement; return s.scrollHeight > innerHeight + 0.5 || s.scrollWidth > innerWidth + 0.5; };
        const small = root => [...root.querySelectorAll('button')].filter(vis).filter(b => box(b).height < 43.5 || box(b).width < 43.5).map(b => b.id || b.textContent.trim().slice(0, 20));
        const cut = el => !!el && vis(el) && el.scrollWidth > el.clientWidth + 0.5;
        const over = () => { const b = $('my-box'); return b.scrollHeight > b.clientHeight + 0.5; };
        T.real.set(file, '2026-11-17'); T.debug.goHome(); T.home.fit();
        const st = T.debug.settings();
        const lg = () => $('my-league'), first = () => lg().firstElementChild, last = () => lg().lastElementChild;
        const inside = () => { const b = box($('my-box')); return [...$('my-box').children].filter(vis).filter(e => !e.classList.contains('my-marks')).filter(e => { const r = box(e); return r.top < b.top - 0.5 || r.bottom > b.bottom + 0.5 || r.left < b.left - 0.5 || r.right > b.right + 0.5; }).map(e => e.id || e.className); };
        const home = () => ({ fit:$('my-box').dataset.fit || '0', scroll:scroll(), over:over(), out:inside(), cut:[...document.querySelectorAll('.rr-line, .my-league > span, .my-nat b')].filter(cut).map(e => e.textContent),
          league:vis(first()) ? first().innerText.trim() : null, ownLine:vis(first()) && vis(last()) && box(last()).top >= box(first()).bottom - 0.5, small:small($('home')), line:vis($('my-real')) ? $('my-real').querySelector('.rr-line').textContent : null,
          sub:vis($('my-sub')), subBeside:vis($('my-sub')) && Math.abs(box($('my-sub')).top - box($('my-rec')).top) <= 0.5 && box($('my-sub')).right <= box($('my-rec')).left + 0.5, chip:!!$('my-real').querySelector('.gap.form') && vis($('my-real').querySelector('.gap.form')), place:vis(last()) ? last().innerText.trim() : null });
        out.home = home();
        { const long = JSON.parse(JSON.stringify(file)); Object.assign(long.clubs.FAR, { opp:null, oppName:'United Services, Portsmouth' });   // a long opponent: the line steps down before its end goes
          T.real.set(long, '2026-11-17'); T.debug.goHome(); T.home.fit(); const rr = $('my-real').querySelector('.rr-line');
          out.long = { cut:cut(rr), px:parseFloat(getComputedStyle(rr).fontSize), was:parseFloat(getComputedStyle($('my-real').querySelector('.rr-out')).fontSize) };
          T.real.set(file, '2026-11-17'); T.debug.goHome(); T.home.fit(); }
        // the box's extras: a Trophy Cabinet, Install and Updating, a Super Fan's colours
        const cabinet = () => { X.newChamp(X.NATIONS[0], X.NATIONS.slice(1)); const c = X.champ(); for (let i = 0; i < 5; i++) { c.results.push(c.fixtures[i].map(p => ({ h:p[0], a:p[1], hs:20, as:10, ht:3, at:1 }))); c.round++; } X.setChamp(c); X.save(); X.load(); X.setChamp(null); };
        cabinet(); $('app-tools').hidden = false; $('b-install').hidden = false; $('offline-update').hidden = false; T.debug.goHome(); T.home.fit();
        out.busy = home();
        T.store.setNative(true); T.store.setStarted(true); T.store.setBought(['tryline.fan.farnham']); $('app-tools').hidden = true; T.debug.goHome(); T.home.fit();
        out.fan = home(); out.fanOn = document.getElementById('s-home').classList.contains('fan');
        const fanInk = getComputedStyle($('my-real').querySelector('.rr-out')).color, fanGround = getComputedStyle($('my-box')).backgroundColor;
        out.fanColours = [fanInk, fanGround];
        T.store.setNative(false); T.store.setStarted(false); T.store.setBought([]); T.cups.setHistory([]); T.debug.goHome();
        // the cards: Farnham v Wimbledon
        st.pick = [{ id:'FAR', cat:'men', g:null }, { id:'WIM', cat:'men', g:null }]; T.debug.openTeams('quick');
        const sides = [0, 1].map(s => $('t-side' + s)), at = (s, sel) => box(sides[s].querySelector(sel));
        out.card = { scroll:scroll(), names:at(0, '.tname').top - at(1, '.tname').top, bars:at(0, '.pk-stats').top - at(1, '.pk-stats').top, chips:sides.map(s => [...s.querySelectorAll('.gap.form')].filter(vis).length === 1), small:small($('s-teams')).filter(n => n),
          clip:[...document.querySelectorAll('#s-teams .pk-st .lbl, #s-teams .tname')].filter(cut).map(e => e.textContent) };
        // nations with star traits, Stronger Side and Form (the fixture's England +1.5 and Japan -1): pickFit's Form steps keep the screen whole
        const P = T.picker, grp = (n, key) => P.group(n, P.view(n).ladder.findIndex(g => g.key === key) - P.view(n).gi), scr = $('s-teams');
        const nations = what => ({ what, scroll:scr.scrollHeight - scr.clientHeight, step:scr.dataset.form || '0', chips:sides.map(s => [...s.querySelectorAll('.gap.form')].filter(vis).map(e => e.firstElementChild.textContent)),
          traits:sides.map(s => vis(s.querySelector('.tstars'))), clip:[...scr.querySelectorAll('.tname, .pk-league, .pk-rate, .pk-st .lbl')].filter(vis).filter(cut).map(e => e.textContent), small:small(scr).filter(n => n),
          out:['t-side0', 't-side1', 't-go', 't-back'].filter(id => { const r = box($(id)); return r.top < -0.5 || r.bottom > innerHeight + 0.5; }) });
        T.debug.openTeams('quick'); grp(0, 'nat.eng'); grp(1, 'nat.jpn'); out.nations = [nations('England v Japan')];
        T.debug.openTeams('quick'); T.debug.pickTeam(X.CLUBS[0]); grp(1, 'nat.eng'); out.nations.push(nations('Pick Opponent on England'));
        // the hub
        X.newChamp(X.ALL_TEAMS.find(t => t.id === 'FAR'), ['WIM', 'OAE', 'BRC', 'TWE', 'QUI'].map(id => X.ALL_TEAMS.find(t => t.id === id)));
        T.debug.renderHub(); T.debug.goHome(); document.querySelectorAll('.screen').forEach(s => { s.hidden = s.id !== 's-hub'; }); T.debug.renderHub();
        out.hub = { scroll:scroll(), chips:[...$('hub-next').querySelectorAll('.gap.form')].filter(vis).map(e => e.textContent), small:small($('s-hub')) };
        return out;
      }, file);
      ok(!errors.length, `${kind}: no page error (${errors[0] || ''})`);
      for (const [name, s] of [['home', m.home], ['with a Trophy Cabinet, Install and Updating', m.busy], ['a Super Fan\'s box', m.fan]]) {
        ok(!s.scroll && !s.over && !s.cut.length && !s.small.length, `${kind} ${name}: no page scroll, nothing over the box or cut short, every button 44px (fit level ${s.fit}${s.cut.length ? ', cut: ' + s.cut.join(' | ') : ''}${s.small.length ? ', small: ' + s.small.join(', ') : ''})`);
        ok(s.line === 'Won 38-34 v Old Alleynians' && s.chip, `${kind} ${name}: the result line whole with its Form chip (${s.line})`);
      }
      ok(!m.long.cut || m.long.px <= 13, `${kind}: a long opponent steps the result line down (to ${m.long.px}px) and is cut only at 13px, the floor (${m.long.cut ? 'cut' : 'whole'})`);
      ok(m.long.px >= 13, `${kind}: never below the 13px floor (${m.long.px}px)`);
      ok(m.home.fit === '0' && m.home.sub && m.home.place === '5th · 16 Pts', `${kind}: the plain home needs no fit level, Your Games and 5th · 16 Pts showing (level ${m.home.fit}, ${m.home.place})`);
      for (const [name, s] of [['home', m.home], ['with more in the box', m.busy], ['a Super Fan\'s box', m.fan]]) ok(s.sub && s.subBeside && s.place === '5th · 16 Pts' && s.league === 'Regional 1 South Central' && s.ownLine && !s.out.length, `${kind} ${name}: Your Games beside Played, Won, Drawn and Lost, and the league whole over 5th · 16 Pts, never joined, everything inside the box (the owner, 15 Nov: level ${s.fit}, ${s.league} / ${s.place}${s.out.length ? ', outside: ' + s.out.join(' ') : ''})`);
      ok(m.fanOn, `${kind}: the Super Fan's box was drawn in its colours (${m.fanColours.join(' on ')})`);
      ok(!m.card.scroll && Math.abs(m.card.names) <= 1 && Math.abs(m.card.bars) <= 1 && m.card.chips.every(Boolean) && !m.card.clip.length, `${kind} cards: no page scroll, both names and both bars level (${m.card.names.toFixed(1)}, ${m.card.bars.toFixed(1)}), Form on both, nothing cut (${m.card.clip.join(' | ')})`);
      ok(!m.card.small.length, `${kind} cards: every button 44px (${m.card.small.join(', ')})`);
      for (const n of m.nations) ok(!n.scroll && !n.out.length && !n.clip.length && !n.small.length && n.traits[1] && (n.traits[0] || /^Pick/.test(n.what)) && n.chips.every(c => c.length === 1), `${kind} ${n.what}: traits, Stronger Side and Form with no scroll, each card's one Form chip shown, nothing cut (Form step ${n.step}, ${json(n.chips)}${n.scroll ? ', scrolls ' + n.scroll : ''}${n.clip.length ? ', cut: ' + n.clip.join(' | ') : ''}${n.out.length ? ', out of view: ' + n.out.join(' ') : ''})`);
      ok(!m.hub.scroll && json(m.hub.chips.map(c => c.replace(/\s+/g, ' ').trim())) === json(['Form +1Form plus 1', 'Form −1Form minus 1']) && !m.hub.small.length, `${kind} hub: no page scroll, Farnham Form +1 and Wimbledon Form −1 (${json(m.hub.chips)})`);
      if ((kind === '844x390' || kind === '667x375')) {   // the screenshots, from a fresh page: no Trophy Cabinet or championship left by the checks above
        const out = shots || '/tmp/claude-0/-home-user/a86fd4cd-a20a-5749-8977-916237a3df3f/scratchpad/shots';
        if (fs.existsSync(out)) {
          const sctx = await browser.newContext({ viewport:{ width:w, height:h }, deviceScaleFactor:1, isMobile:true, hasTouch:true, serviceWorkers:'block' }), sp = await sctx.newPage();
          await sp.addInitScript(s => { try { localStorage.setItem('tryline.v1', JSON.stringify(s)); } catch (e) { /* blocked */ } }, SAVE);
          await sp.goto(base + 'index.html', { waitUntil:'load' }); await sp.evaluate(() => document.fonts.ready);
          const fit = await sp.evaluate(file => { const T = window.__tryline; T.real.set(file, '2026-11-17'); T.debug.goHome(); T.home.fit(); return document.getElementById('my-box').dataset.fit || '0'; }, file);
          ok(fit === '0', `${kind}: the screenshot's home needs no fit level (${fit})`);
          await sp.waitForTimeout(150); await sp.screenshot({ path:path.join(out, `results-build-home-${kind}.png`) });
          await sp.evaluate(() => { const T = window.__tryline; T.debug.settings().pick = [{ id:'FAR', cat:'men', g:null }, { id:'WIM', cat:'men', g:null }]; T.debug.openTeams('quick'); });
          await sp.waitForTimeout(150); await sp.screenshot({ path:path.join(out, `results-build-card-${kind}.png`) });
          await sp.evaluate(() => { const T = window.__tryline, X = T.teams; X.newChamp(X.ALL_TEAMS.find(t => t.id === 'FAR'), ['WIM', 'OAE', 'BRC', 'TWE', 'QUI'].map(id => X.ALL_TEAMS.find(t => t.id === id))); T.debug.goHome(); document.querySelectorAll('.screen').forEach(s => { s.hidden = s.id !== 's-hub'; }); T.debug.renderHub(); });
          await sp.waitForTimeout(150); await sp.screenshot({ path:path.join(out, `results-build-hub-${kind}.png`) });
          await sctx.close();
        }
      }
      await ctx.close();
    }
    // the census (the owner, 15 Nov 2026, "Squeeze the Games Row"): every club in the real results.json whose result shows, on the plain home
    // and on the home with a Trophy Cabinet, at the five sizes: Your Games and the place line shown, the league whole (two lines at most,
    // never cut, never joined to the place), no page scroll, nothing over the box, everything inside it
    const REAL = fileURLToPath(new URL('../results.json', import.meta.url));
    if (fs.existsSync(REAL)) {
      const real = JSON.parse(fs.readFileSync(REAL, 'utf8'));
      for (const [w, h] of [[844, 390], [667, 375], [844, 340], [667, 320], [568, 320]]) {
        const ctx = await browser.newContext({ viewport:{ width:w, height:h }, deviceScaleFactor:1, isMobile:true, hasTouch:true, serviceWorkers:'block' });
        const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
        await page.addInitScript(s => { try { localStorage.setItem('tryline.v1', JSON.stringify(s)); } catch (e) { /* blocked */ } }, SAVE);
        await page.goto(base + 'index.html', { waitUntil:'load' }); await page.evaluate(() => document.fonts.ready);
        const kind = `${w}x${h}`;
        const c = await page.evaluate(real => {
          const T = window.__tryline, X = T.teams, R = T.real, st = T.debug.settings(), $ = id => document.getElementById(id), out = {};
          const box = el => el.getBoundingClientRect(), vis = el => !!el && !el.hidden && !el.closest('[hidden]') && box(el).width > 0;
          const day = real.generated.slice(0, 10);
          R.set(real, day);
          const ids = Object.keys(real.clubs).filter(id => X.ALL_TEAMS.some(t => t.id === id && !X.isNation(t)));
          const one = id => {
            st.myClub = id; T.debug.goHome(); T.home.fit();
            const e = R.news(X.ALL_TEAMS.find(t => t.id === id), 'men');
            if (!e || !vis($('my-real'))) return null;
            const b = $('my-box'), bb = box(b), lg = $('my-league'), first = lg.firstElementChild, last = lg.lastElementChild, sc = document.scrollingElement, why = [];
            if (!vis($('my-sub'))) why.push('no Your Games');
            if (!vis(last) || !/^\d+(st|nd|rd|th)( · -?\d+ Pts)?$/.test(last.innerText.trim())) why.push('no place line');
            if (!vis(first) || first.innerText.trim() !== e.league || first.scrollWidth > first.clientWidth + 0.5) why.push('league cut');
            else if (box(first).height > 2*parseFloat(getComputedStyle(first).lineHeight) + 1) why.push('league over two lines');
            if (vis(first) && vis(last) && box(last).top < box(first).bottom - 0.5) why.push('league joined to the place');
            if (sc.scrollHeight > innerHeight + 0.5 || sc.scrollWidth > innerWidth + 0.5) why.push('page scroll');
            if (b.scrollHeight > b.clientHeight + 0.5) why.push('over the box');
            if ([...b.children].filter(vis).filter(x => !x.classList.contains('my-marks')).some(x => { const r = box(x); return r.top < bb.top - 0.5 || r.bottom > bb.bottom + 0.5 || r.left < bb.left - 0.5 || r.right > bb.right + 0.5; })) why.push('outside the box');
            return { fit:b.dataset.fit || '0', why };
          };
          const pass = name => {
            const r = { shown:0, bad:[], fits:{} };
            for (const id of ids) { const x = one(id); if (!x) continue; r.shown++; r.fits[x.fit] = (r.fits[x.fit] || 0) + 1; if (x.why.length) r.bad.push(id + ' (' + x.why.join(', ') + ', level ' + x.fit + ')'); }
            out[name] = r;
          };
          pass('plain');
          X.newChamp(X.NATIONS[0], X.NATIONS.slice(1)); const ch = X.champ(); for (let i = 0; i < 5; i++) { ch.results.push(ch.fixtures[i].map(p => ({ h:p[0], a:p[1], hs:20, as:10, ht:3, at:1 }))); ch.round++; } X.setChamp(ch); X.save(); X.load(); X.setChamp(null);
          T.debug.goHome(); out.cabinet = !$('b-cabinet').hidden;
          pass('with a Trophy Cabinet');
          out.clubs = ids.length;
          return out;
        }, real);
        ok(!errors.length, `${kind} census: no page error (${errors[0] || ''})`);
        ok(c.cabinet, `${kind} census: the Trophy Cabinet showing for its pass`);
        console.log(`${kind} census: ${c.plain.shown} clubs, fit levels plain ${json(c.plain.fits)}, with a Trophy Cabinet ${json(c['with a Trophy Cabinet'].fits)}`);
        for (const name of ['plain', 'with a Trophy Cabinet']) {
          const r = c[name];
          ok(r.shown >= 300 && !r.bad.length, `${kind} census, ${name}: all ${r.shown} clubs whose real result shows (of ${c.clubs}) keep Your Games and the place line, the league whole and never joined, no page scroll, everything inside the box (fit levels ${json(r.fits)}${r.bad.length ? '; ' + r.bad.length + ' not: ' + r.bad.slice(0, 6).join('; ') : ''})`);
        }
        await ctx.close();
      }
    } else ok(true, 'no real results.json for the census');
    // reduced motion: nothing here moves, and the page says so
    // the file read at boot from the page's own folder, offline-safe, no other host asked
    serveFile = true; asked = 0;
    const ctx = await browser.newContext({ viewport:{ width:844, height:390 }, serviceWorkers:'block' });
    const page = await ctx.newPage(), hosts = new Set(); page.on('request', r => hosts.add(new URL(r.url()).host));
    await page.goto(base + 'index.html', { waitUntil:'load' });
    await page.waitForFunction(() => !!window.__tryline.real.now(), null, { timeout:5000 }).catch(() => null);
    const got = await page.evaluate(() => { const n = window.__tryline.real.now(); return n ? Object.keys(n.clubs).join(',') : null; });
    ok(asked === 1 && got === 'FAR,WIM,OAE,NTH' && [...hosts].every(h => h === new URL(base).host), `at boot on the web: one request for results.json beside the page, checked and held (${got}), no other host (${[...hosts].join(', ')})`);
    await ctx.close();
  } finally { await browser.close(); server.close(); }
}
