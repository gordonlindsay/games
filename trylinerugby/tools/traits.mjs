// Star traits: the table, who has them (built-in, custom, imported and career), each effect on in a match you play and off
// everywhere else, the call-out and its throttle, the marker, the team cards' line and the career hub's chips, the saves, and AI v AI,
// the demo, practice and a tool's match played exactly as before. Exits 1 on any failure.
// node tools/traits.mjs             (SEED=31 unless set; VERBOSE=1 lists every check)
// node tools/traits.mjs --balance   the README's Star Traits numbers: seeded CPU v CPU arcade margins (minutes; never in check.mjs; BAL_N, BAL_ROWS)
process.env.SEED ??= '31';
import fs from 'node:fs';
const { T, reseed, bot } = await import('./harness.mjs');
const R = T.traits, X = T.teams, C = T.contact, S = T.stamina, D = T.debug, STEP = T.STEP, $ = id => document.getElementById(id);
let failed = 0, passed = 0;
const ok = (cond, msg) => { if (cond) passed++; else failed++; if (!cond || process.env.VERBOSE) console.log(cond ? 'ok  ' : 'FAIL', msg); };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
const json = v => JSON.stringify(v);
// The mechanism checks below use the nations as rated when they were written (d6192ad): the XV rankings (src/data.js) re-rated them since,
// which moves who has which star but not how a star works. `live` is a side as the game ships it.
const WRITTEN = { ENG:[4, 5, 3, 4, 4], FRA:[5, 5, 4, 4, 5], IRE:[4, 4, 5, 5, 5], ITA:[4, 3, 3, 3, 3], SCO:[5, 3, 4, 3, 4], WAL:[3, 4, 3, 3, 4] };
const live = id => X.ALL_TEAMS.find(t => t.id === id);
const team = id => { const t = live(id), w = WRITTEN[id]; return w ? { ...t, pace:w[0], power:w[1], handling:w[2], kicking:w[3], stamina:w[4] } : t; };
const even = (o) => ({ id:'EVN', name:'Evens', kit:'#1d3a8f', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:3, stamina:3, ...o });
const play = (a, b, o) => T.newMatch(a, b, { halfLen:120, diff:1, headless:true, duels:'off', humans:[true, false], arcade:true, ...o });
const give = (p, ...ids) => { p.tr = ids.length ? Object.fromEntries(ids.map(id => [id, true])) : null; };   // a star made by hand, for one check
const starMap = t => [...R.teamStars(t).entries()].map(([n, ids]) => n + ':' + ids.join('+')).sort().join(' ');

if (process.argv.includes('--balance')) { await balance(); process.exit(0); }

// 0. AI v AI, the demo and a tool's match with star sides play exactly as at 30e13e2, the commit before traits (run first, so nothing
//    below can move them). The same seeded runs on that build's bundle gave BASE. If another change moves AI v AI on purpose,
//    re-pin from that change's bundle without src/traits.js (tools/career.mjs pins the same kind of thing for sides with no star).
const BASE = '4318of 1hlbjrh 8b7zl6 6cc5jm';   // re-pinned at the PR #14 merge for its calmer passing (PASS_FLIGHT: the ball hangs longer and a catcher gets a moment): with PASS_FLIGHT='{"match":1,"kids":1,"grace":[0,0,0],"graceKids":0}' this build gives the old pin exactly, 6igeb3 tagplu lxxgtn 14mjifb
function pin() {
  const out = [];
  for (const [a, b, i] of [['FRA', 'IRE', 0], ['PRE', 'SCO', 1]]) {
    reseed(40 + i); T.newMatch(team(a), team(b), { halfLen:60, diff:1, auto:true, headless:true, arcade:true });
    let n = 0; while (!T.M.over && n < 200000) { T.update(STEP); n++; }
    out.push(json([T.M.score, T.M.tries, T.M.stats, n]));
  }
  reseed(42); T.newMatch(team('IRE'), team('FRA'), { halfLen:1e9, diff:1, auto:true, demo:true });
  for (let i = 0; i < 2400; i++) T.update(STEP);
  out.push(json([T.M.score, T.M.stats, T.M.players.map(p => [p.x.toFixed(5), p.y.toFixed(5)])]));
  reseed(43); T.newMatch(team('FRA'), team('IRE'), { halfLen:60, diff:1, headless:true, humans:[true, false], duels:'off' });
  { let n = 0; while (!T.M.over && n < 200000) { bot(0); T.update(STEP); n++; } out.push(json([T.M.score, T.M.tries, T.M.stats, n])); }
  return out.map(fnv).join(' ');
}
{ const now = pin(); ok(now === BASE, `AI v AI, the demo and a tool's match with star sides play as at 30e13e2 (seeded fingerprint ${now}, pinned ${BASE})`); }

// 1. the table
{
  const ids = R.TRAITS.map(t => t.id), names = R.TRAITS.map(t => t.name);
  ok(names.join() === 'Burst,Crunch,Hand-Off,Safe Hands,Long Boot,Engine', `six traits, in ABILITIES order (${names.join(', ')})`);
  ok(new Set(ids).size === 6 && new Set(names).size === 6, 'every id and name is its own');
  ok(names.every(n => n.split(/[ -]/).every(w => /^[A-Z][a-z]+$/.test(w))), 'every name is Title Case');
  const keys = S.ABILITIES.map(([k]) => k);
  ok(R.TRAITS.every(t => keys.includes(t.skill)) && keys.every(k => R.TRAITS.some(t => t.skill === k)), 'each trait comes from one ability, and every ability brings at least one');
  ok(R.TRAITS.map(t => t.skill).join() === 'pace,power,power,handling,kicking,stamina', 'Power brings two: Crunch and Hand-Off');
  ok(R.TRAITS.every(t => t.unlock === (t.id === 'handoff' ? 90 : 80)), 'a career player unlocks each at 80 in its skill, Hand-Off at 90');
  const shirt = id => R.TRAITS.find(t => t.id === id).shirts.join();
  ok(shirt('crunch') === '1,2,3' && shirt('engine') === '1,2,3' && shirt('handoff') === '6' && shirt('burst') === '7' && shirt('boot') === '5' && shirt('safe') === '4',
    'shirts: Crunch and Engine a forward (1 to 3), Hand-Off the centre (6), Burst the wing (7), Long Boot the fly-half (5), Safe Hands the scrum-half (4)');
  const K = R.TRAIT;
  ok(K.star === 5 && K.gap >= 3 && K.gap <= 6, `a team needs a 5 for a star; one man's call-outs at most every ${K.gap}s`);
  ok(K.burst.top > 0 && K.burst.top <= 0.1 && K.burst.acc > 1 && K.burst.acc <= 1.5, `Burst is a little: +${K.burst.top*100}% top speed sprinting, x${K.burst.acc} acceleration`);
  ok(K.crunch.dom > 0 && K.crunch.dom <= 0.2 && K.crunch.jolt > 0 && K.crunch.jolt <= 0.08, `Crunch: +${K.crunch.dom} Big Hit chance, +${K.crunch.jolt} jolt`);
  ok(K.handoff.hold >= 0.7 && K.handoff.hold < 1, `Hand-Off: a tackle on him holds x${K.handoff.hold}`);
  ok(K.safe.hands <= 0.15 && K.safe.offload < 1, `Safe Hands: knock-ons x${K.safe.hands}, failed offloads x${K.safe.offload}`);
  ok(K.boot.roll > 1 && K.boot.touch > 0 && K.boot.band > 1 && K.boot.band <= 1.5, `Long Boot: roll x${K.boot.roll}, touch +${K.boot.touch}m, band x${K.boot.band}`);
  ok(K.engine.fade < 0.5 && K.engine.drain < 1, `Engine: fade x${K.engine.fade}, sprint drain x${K.engine.drain}`);
  const src = fs.readFileSync(new URL('../src/traits.js', import.meta.url), 'utf8');
  ok(!/\u2014|\u2190|\u2192/.test(src), 'no em dash or arrow in src/traits.js');
}

// 2. who has them: the built-in sides
{
  for (const t of X.ALL_TEAMS) {
    const stars = R.teamStars(t), got = [...stars.values()].flat().sort().join();
    const want = R.TRAITS.filter(tr => S.abilityOf(t, tr.skill) >= 5).map(tr => tr.id).sort().join();
    if (got !== want) ok(false, `${t.name}: stars ${got} for its 5s ${want}`);
    for (const [n, list] of stars) for (const id of list) if (!R.TRAITS.find(tr => tr.id === id).shirts.includes(n)) ok(false, `${t.name}: ${id} on ${n}, not a shirt it fits`);
  }
  ok(true, 'every built-in side has exactly the stars its 5s bring, each on a shirt it fits');
  ok(X.ALL_TEAMS.filter(t => R.teamStars(t).size).map(t => t.id).join() === 'ENG,FRA,IRE,SCO,NZL,RSA,AUS,ARG,FIJ,JPN,CDN,USA,MPL,PRE',   // every nation on the XV rankings has a 5 somewhere; Montpellier and Pretoria are the clubs with one
     `the sides with stars: ${X.ALL_TEAMS.filter(t => R.teamStars(t).size).map(t => t.id + ' ' + R.teamTraitNames(t).join('/')).join(', ')}`);
  const fra = R.teamStars(team('FRA')), ire = R.teamStars(team('IRE'));
  ok(fra.size === 4 && fra.get(7).join() === 'burst' && fra.get(6).join() === 'handoff' && [...fra].filter(([n]) => n <= 3).length === 2, `France: four stars, Burst on 7, Hand-Off on 6, Crunch and Engine on two forwards (${starMap(team('FRA'))})`);
  ok(ire.size === 3 && ire.get(4).join() === 'safe' && ire.get(5).join() === 'boot' && [...ire].some(([n, l]) => n <= 3 && l.join() === 'engine'), `Ireland: Safe Hands on 4, Long Boot on 5, Engine on a forward (${starMap(team('IRE'))})`);
  ok(starMap(team('FRA')) === starMap({ ...team('FRA') }) && starMap(team('FRA')) === starMap(team('FRA')), 'the same side gets the same stars every time');
  const fwd = new Set(X.ALL_TEAMS.concat(Array.from({ length:40 }, (_, i) => even({ name:'Side ' + i, power:5 })))
    .map(t => [...R.teamStars(t)].find(([, l]) => l.includes('crunch'))).filter(Boolean).map(([n]) => n));
  ok(fwd.size === 3, `which forward is the team's own: Crunch lands on all three across sides (${[...fwd].sort().join(' ')})`);
  ok(R.teamTraitNames(team('FRA')).join(' · ') === 'Burst · Crunch · Hand-Off · Engine' && R.teamTraitNames(team('WAL')).length === 0, 'the card names them in table order');
}

// 3. custom and imported sides: the same rule, nothing saved
{
  const made = X.cleanTeam({ name:'Big Units', pace:2, power:5, handling:3, kicking:2, stamina:5 }, 0);
  ok(starMap(made).includes('6:handoff') && R.teamTraitNames(made).join() === 'Crunch,Hand-Off,Engine', `a team you make with Power and Stamina at 5: Crunch, Hand-Off and Engine (${starMap(made)})`);
  const maxed = X.cleanTeam({ name:'Three Fives', pace:5, power:5, handling:5, kicking:1, stamina:1 }, 0);
  ok(R.teamStars(maxed).size === 4, `a made team spends its 12 points on three 5s: four stars (${starMap(maxed)})`);
  ok(R.teamStars(X.cleanTeam({ name:'Fours', pace:4, power:4, handling:3, kicking:3, stamina:3 }, 0)).size === 0, 'no 5, no star');
  const league = T.importer.sides({ league:[{ name:'Top Town RFC' }, { name:'Mid Town RFC' }, { name:'Low Town RFC' }] });
  ok(league.length === 3 && league.every(t => R.teamStars(t).size === 0), `an imported league's sides spread their points: no 5, no star (${league.map(t => S.ABILITIES.map(([k]) => t[k]).join('')).join(' ')})`);
  const edited = X.cleanTeam({ ...league[0], power:5, stamina:2 }, 0);
  ok(R.teamTraitNames(edited).join() === 'Crunch,Hand-Off', 'an imported club edited to Power 5 has Crunch and Hand-Off');
  const mem = {}, kept = globalThis.localStorage;
  globalThis.localStorage = { getItem:k => (k in mem ? mem[k] : null), setItem:(k, v) => { mem[k] = String(v); } };
  X.restore({ custom:[made] }); X.save();
  const raw = mem['tryline.v1'] || '';
  ok(raw.length > 0 && !/"tr"|trait|crunch|handoff/i.test(raw), 'nothing about traits is saved for a team');
  X.restore(JSON.parse(raw));
  ok(R.teamTraitNames(X.custom()[0]).join() === 'Crunch,Hand-Off,Engine', 'and a saved team comes back with the same stars');
  globalThis.localStorage = kept;
  X.restore({ custom:[] });
}

// 4. your career player
{
  const C2 = T.career;
  const cr = C2.create({ name:'Sam', pos:'B', num:5, club:X.CLUBS[0] });
  const set = o => { Object.assign(cr.skills, o); return R.careerTraitIds(cr).join(); };
  ok(set({ pace:79, power:79, handling:79, kicking:79, stamina:79 }) === '', 'nothing below 80');
  ok(set({ power:80 }) === 'crunch' && set({ power:89 }) === 'crunch' && set({ power:90 }) === 'crunch,handoff', 'Power: Crunch at 80, Hand-Off at 90');
  ok(set({ pace:80, handling:80, kicking:80, stamina:80 }) === 'burst,crunch,handoff,safe,boot,engine', 'and each of the others at 80 in its skill');
  const cleaned = C2.clean(JSON.parse(JSON.stringify(cr)));
  ok(cleaned && !('traits' in cleaned) && R.careerTraitIds(cleaned).join() === R.careerTraitIds(cr).join(), 'a saved career keeps no traits of its own: they come back from his skills');
  const old = C2.clean({ name:'Old', pos:'F', num:2, club:X.CLUBS[0], stage:0, skills:{ pace:40, power:85 } });
  ok(old && R.careerTraitIds(old).join() === 'crunch', 'a career saved before traits loads and has the trait its skills earn');

  // a career match: his traits on him only, his shirt his own
  set({ pace:50, power:50, handling:50, kicking:85, stamina:50 });
  C2.set(cr); cr.season.teams[0] = { ...team('IRE'), name:'Ireland' };   // Ireland's Long Boot would wear his 5
  T.newMatch(cr.season.teams[0], cr.season.teams[1], { halfLen:120, diff:1, headless:true, duels:'off', arcade:true }); C2.arm();
  const M = T.M, me = M.careerP;
  ok(me.n === 5 && R.on(me, 'boot') && Object.keys(me.tr).join() === 'boot', 'in a career match he has his own traits (Long Boot at Kicking 85)');
  const mates = M.players.filter(p => p.team === 0 && p !== me && p.tr);
  ok(mates.length === 3 && mates.some(p => p.tr.boot) && mates.every(p => p.n !== 5), `Ireland's three stars still play, the Long Boot moved off his shirt (${mates.map(p => p.n + ':' + Object.keys(p.tr)).join(' ')})`);
  set({ kicking:50 }); R.arm();
  ok(!M.careerP.tr && M.players.filter(p => p.team === 0 && p.tr).length === 3, 'his traits are his alone: below 80 he has none, and nobody else gets them');
  C2.set(null);
}

// 5. a match you play, and nothing else
{
  const fra = team('FRA'), ire = team('IRE');
  const starred = () => T.M.players.filter(p => p.tr).length;
  T.newMatch(fra, ire, { halfLen:60, diff:1, auto:true, headless:true, arcade:true });
  ok(!T.M.arcade && starred() === 0 && !R.on(T.M.players[6], 'burst'), 'AI v AI: no stars, even when asked');
  T.newMatch(fra, ire, { halfLen:1e9, diff:1, auto:true, demo:true, arcade:true });
  ok(starred() === 0, 'the demo: none');
  T.practice.start('defend');
  ok(starred() === 0, 'practice: none'); T.practice.leave();
  play(fra, ire, { arcade:false });
  ok(starred() === 0, 'a tool\'s one-player match: none');
  give(T.M.players[6], 'burst');
  ok(!R.on(T.M.players[6], 'burst'), 'and a star handed in by hand does nothing there: traitOn reads the match');
  play(fra, ire);
  ok(starred() === 7 && R.on(T.M.players[6], 'burst') && R.on(T.M.players[10], 'safe'), `a match you play: France's four and Ireland's three (${starred()})`);
  D.startMatch(fra, ire, false);
  ok(T.M.arcade && starred() === 7, 'Quick Match through startMatch: the same'); D.exitMatch();
  T.newMatch(fra, ire, { halfLen:120, diff:1, headless:true, duels:'off', humans:[true, true], arcade:true });
  ok(starred() === 7, 'two player: both sides\' stars');
}

// 6. each effect: on in a match you play, exactly nothing outside one
{
  // Burst: the sprint's top speed and its acceleration
  const sprintSpeed = (arcade, has) => {
    play(even(), even(), { arcade }); const p = T.M.players[6]; give(p, ...(has ? ['burst'] : []));
    T.M.phase = 'play'; p.sprint = C.SPRINT.fade; const v = C.maxSpeed(p); p.sprint = 0; return [v, C.maxSpeed(p)];
  };
  const [b1, w1] = sprintSpeed(true, true), [b0, w0] = sprintSpeed(true, false), [bx] = sprintSpeed(false, true);
  ok(near(b1/b0, 1 + R.TRAIT.burst.top) && near(w1, w0), `Burst: ${R.TRAIT.burst.top*100}% more at full sprint, nothing walking (${b0.toFixed(2)} to ${b1.toFixed(2)} m/s)`);
  ok(bx === b0, 'Burst outside arcade: none');
  const accel = (has, arcade, sprinting) => {   // one step of the stick's steer from standing, toward 9 m/s
    play(even(), even(), { arcade }); const p = T.M.players[6]; give(p, ...(has ? ['burst'] : []));
    p.vx = p.vy = 0; p.sprint = sprinting ? C.SPRINT.fade : 0; R.steer(p, 9, 0, 20, STEP); return p.vx;
  };
  ok(near(accel(true, true, true)/accel(false, true, true), R.TRAIT.burst.acc) && accel(true, true, false) === accel(false, true, false), `Burst gets going ${R.TRAIT.burst.acc}x quicker while he sprints, and only then`);
  ok(accel(true, false, true) === accel(false, false, true), 'and not outside arcade');

  // Crunch: Big Hits and jolts, counted over the same draws with and without him. Each tackle is a fresh match, so no throttle:
  // every call-out counted (trait_<id>) is one shown (tag_<name>)
  const tackleEach = (has, arcade, mode = 'ai', sprint = false) => {
    const out = [];
    for (let i = 0; i < 1500; i++) {
      play(even(), even(), { arcade }); const M = T.M, tap = mode === 'ankle', q = M.players[tap ? 1 : 8], c = M.players[tap ? 10 : 3];
      give(q, ...(has === 'crunch' ? ['crunch'] : [])); give(c, ...(has === 'handoff' ? ['handoff'] : []));
      M.phase = 'play'; M.set = null; T.sides.setCtrl(0, tap ? q : M.players[0]); M.ball.state = 'held'; M.ball.carrier = c;
      if (tap) { c.x = 40; c.y = 35; q.x = 41; q.y = 35.3; c.vx = -6; c.vy = 0; q.vx = -6; q.vy = 0; }   // your ringed man taps their carrier from behind
      else { c.x = 40; c.y = 35; q.x = 41.2; q.y = 35; c.vx = 6; c.vy = 0; q.vx = -4; q.vy = 0; }
      c.sprinting = sprint; q.sprinting = false;
      reseed(9000 + i);
      const k = C.commitTackle(q, c, mode), tier = k.tier;
      if (tier !== 'broken') { k.t = k.T; C.resolveContact(k); }
      const S2 = M.stats;
      out.push({ tier, jolt:!!S2.jolts, fend:!!S2.fends, stumble:c.stumble > 0, trip:!!S2.trip, tags:M.tags.map(t => t.text).join(),
        call:(S2.trait_crunch || 0) + (S2.trait_handoff || 0), shown:(S2.tag_Crunch || 0) + (S2['tag_Hand-Off'] || 0) });
    }
    return out;
  };
  const sum = e => ({ dom:e.filter(o => o.tier === 'dom').length, made:e.filter(o => o.tier !== 'broken').length, jolts:e.filter(o => o.jolt).length,
    broken:e.filter(o => o.tier === 'broken').length, fends:e.filter(o => o.fend).length, stumbles:e.filter(o => o.stumble).length, trips:e.filter(o => o.trip).length });
  const tackles = (has, arcade, mode) => sum(tackleEach(has, arcade, mode));
  const baseE = tackleEach(null, true), crunchE = tackleEach('crunch', true);
  const base = sum(baseE), crunch = sum(crunchE), crunchOff = tackles('crunch', false), baseOff = tackles(null, false);
  ok(crunch.dom/crunch.made - base.dom/base.made > R.TRAIT.crunch.dom*0.7, `Crunch: more Big Hits (${(100*base.dom/base.made).toFixed(1)}% to ${(100*crunch.dom/crunch.made).toFixed(1)}% of his made tackles)`);
  ok(crunch.jolts > base.jolts*1.2, `Crunch: more balls jolted loose (${base.jolts} to ${crunch.jolts} in 1500)`);
  ok(crunch.made === base.made, 'Crunch leaves whether the tackle holds alone');
  ok(json(crunchOff) === json(baseOff), 'Crunch outside arcade: the same tackles exactly');
  // Crunch's call-out: only a Big Hit or a jolt the trait made, seed by seed. Each half of the trait on its own, so the other cannot
  // move the tier or the jolt's odds under it
  {
    const keep = { ...R.TRAIT.crunch };
    try {
      R.TRAIT.crunch.jolt = 0;                                     // the Big Hit alone
      const hitE = tackleEach('crunch', true), bad = hitE.filter((o, i) => (o.call > 0) !== (o.tier === 'dom' && baseE[i].tier !== 'dom')).length;
      const hits = hitE.filter(o => o.tier === 'dom').length, called = hitE.filter(o => o.call > 0).length;
      ok(bad === 0 && called > 0 && called < hits, `Crunch calls a Big Hit only when he made it: ${called} of his ${hits} Big Hits, the ones the same tackle without him was not (${bad} wrong)`);
      R.TRAIT.crunch.dom = 0; R.TRAIT.crunch.jolt = keep.jolt;      // the jolt alone
      const joltE = tackleEach('crunch', true), badJ = joltE.filter((o, i) => (o.call > 0) !== (o.jolt && !baseE[i].jolt)).length;
      const jolts = joltE.filter(o => o.jolt).length, calledJ = joltE.filter(o => o.call > 0).length;
      ok(badJ === 0 && calledJ > 0 && calledJ < jolts && joltE.every((o, i) => o.tier === baseE[i].tier), `and a jolt only when he made it: ${calledJ} of ${jolts} (${badJ} wrong)`);
    } finally { Object.assign(R.TRAIT.crunch, keep); }
    const calls = crunchE.filter(o => o.call > 0).length;
    ok(calls < crunch.dom + crunch.jolts - base.dom*0.5 && crunchE.every(o => o.shown === Math.min(o.call, 1)), `the whole trait: ${calls} call-outs over ${crunch.dom} Big Hits and ${crunch.jolts} jolts, one at most a tackle`);
  }
  const handE = tackleEach('handoff', true), hand = sum(handE), handOff = tackles('handoff', false);
  ok(hand.broken > base.broken*1.15 && near(hand.made/1500, base.made/1500*R.TRAIT.handoff.hold, 0.04), `Hand-Off: more tackles broken (${base.broken} to ${hand.broken} of 1500)`);
  ok(hand.fends === hand.broken && base.fends < base.broken, `and every one of them a Fend (${hand.fends} of ${hand.broken}; without him ${base.fends} of ${base.broken})`);
  {
    const decided = (e, e0) => {   // he broke it, or made a stumble a Fend: seed by seed against the same tackle without him
      const want = (o, i) => o.tier === 'broken' && (e0[i].tier !== 'broken' || !e0[i].fend);
      return { bad:e.filter((o, i) => (o.call > 0) !== want(o, i)).length, called:e.filter(o => o.call > 0).length, broke:e.filter((o, i) => o.call > 0 && e0[i].tier !== 'broken').length,
        broken:e.filter(o => o.tier === 'broken').length, shown:e.every(o => o.shown === o.call) };
    };
    const a = decided(handE, baseE);
    ok(a.bad === 0 && a.shown && a.broke > 0, `Hand-Off calls a break he decided, at a jog: ${a.called} of his ${a.broken} (${a.broke} he broke; the other ${a.called - a.broke} broke anyway but would have been a stumble, not a Fend; ${a.bad} wrong)`);
    const b = decided(tackleEach('handoff', true, 'ai', true), tackleEach(null, true, 'ai', true));
    ok(b.bad === 0 && b.shown && b.called === b.broke && b.called < b.broken*0.5, `and at a sprint, when every break is a Fend anyway, only the ones he broke: ${b.called} of his ${b.broken} (${b.bad} wrong)`);
  }
  ok(json(handOff) === json(baseOff), 'Hand-Off outside arcade: the same tackles exactly');
  const ankleE = tackleEach('handoff', true, 'ankle'), ankle0E = tackleEach(null, true, 'ankle'), ankle = sum(ankleE), ankle0 = sum(ankle0E);
  ok(ankle.made === ankle0.made, 'an ankle tap from behind is not handed off');
  ok(json(ankleE) === json(ankle0E) && ankleE.every(o => !o.call && !/Hand-Off/.test(o.tags)), `a broken ankle tap on a Hand-Off carrier: no Hand-Off, no Fend, and he stumbles or is tripped as ever (${ankle.broken} broken: ${ankle.trips} tripped, ${ankle.stumbles - ankle.trips} stumbled, ${ankle.fends} Fends; the same ${ankle0.broken}, ${ankle0.trips}, ${ankle0.stumbles - ankle0.trips} and ${ankle0.fends} without him)`);
  ok(ankle.trips > 0 && ankle.stumbles > ankle.trips && ankleE.some(o => /Tripped/.test(o.tags)), 'and the ringed tackler still sees Tripped');

  // Safe Hands: the catch and the offload. Each a fresh match, so every call-out counted is shown
  const catchEach = (has, arcade, kind = 'kick') => {
    const out = [];
    for (let i = 0; i < 1500; i++) {
      play(even({ handling:1 }), even(), { arcade }); const M = T.M, p = M.players[3];
      give(p, ...(has ? ['safe'] : []));
      M.phase = 'play'; M.ball.state = 'air'; M.ball.f = { kind, team:1 };
      M.players[9].x = p.x + 1; M.players[9].y = p.y;   // under pressure
      const k0 = M.stats.knocks; reseed(7000 + i); R.catchBall(p, kind);
      out.push({ knock:M.stats.knocks > k0, call:M.stats.trait_safe || 0, shown:M.stats['tag_Safe Hands'] || 0 });
    }
    return out;
  };
  const catches = (has, arcade) => catchEach(has, arcade).filter(o => o.knock).length;
  const c0E = catchEach(false, true), c1E = catchEach(true, true), k0 = c0E.filter(o => o.knock).length, k1 = c1E.filter(o => o.knock).length;
  ok(k0 > 150 && k1 <= Math.ceil(k0*R.TRAIT.safe.hands*1.5), `Safe Hands: knock-ons at a hard catch near zero (${k0} to ${k1} of 1500)`);
  {
    const bad = c1E.filter((o, i) => (o.call > 0) !== (c0E[i].knock && !o.knock)).length, called = c1E.filter(o => o.call > 0).length;
    ok(bad === 0 && called === k0 - k1 && c1E.every(o => o.shown === o.call), `Safe Hands calls only a catch he saved: ${called} of his ${1500 - k1} catches, the ones the same draw knocked on without him (${bad} wrong)`);
    const easy = catchEach(true, true, 'pass');
    ok(easy.filter(o => o.call > 0).length < easy.filter(o => !o.knock).length*0.2, `an easier catch (a pass under pressure) is seldom one he saved: ${easy.filter(o => o.call > 0).length} of ${easy.filter(o => !o.knock).length}`);
  }
  ok(catches(true, false) === catches(false, false), 'Safe Hands outside arcade: the same catches');
  const offloadEach = (has, arcade) => {
    const out = [];
    for (let i = 0; i < 1500; i++) {
      play(even(), even(), { arcade }); const M = T.M, c = M.players[3], q = M.players[8], r = M.players[2];
      give(c, ...(has ? ['safe'] : []));
      M.phase = 'play'; M.ball.state = 'held'; M.ball.carrier = c;
      c.x = 40; c.y = 35; q.x = 41; q.y = 35; r.x = 37; r.y = 40; for (const o of M.players) if (o !== c && o !== q && o !== r) { o.x = 90; o.y = 10; }
      const k = { c, q, q2:null, tier:'wrap', offloaded:false };
      c.bind = q.bind = k; M.contact = k;
      reseed(5000 + i); C.offload(k, false);
      out.push({ ok:!!M.stats.offloads, call:M.stats.trait_safe || 0, shown:M.stats['tag_Safe Hands'] || 0 });
    }
    return out;
  };
  const offloads = (has, arcade) => offloadEach(has, arcade).filter(o => o.ok).length;
  const o0E = offloadEach(false, true), o1E = offloadEach(true, true), o0 = o0E.filter(o => o.ok).length, o1 = o1E.filter(o => o.ok).length, pOk = C.CONTACT.off.wrap;
  ok(o1 > o0 && near(o1/1500, 1 - (1 - pOk)*R.TRAIT.safe.offload, 0.04), `Safe Hands: offloads go to hand more (${o0} to ${o1} of 1500)`);
  {
    const bad = o1E.filter((o, i) => (o.call > 0) !== (o.ok && !o0E[i].ok)).length, called = o1E.filter(o => o.call > 0).length;
    ok(bad === 0 && called === o1 - o0 && o1E.every(o => o.shown === o.call), `and calls only an offload he saved: ${called} of his ${o1} (${bad} wrong)`);
  }
  ok(offloads(true, false) === offloads(false, false), 'Safe Hands outside arcade: the same offloads');

  // Long Boot: the tactical kick runs on, the kick to touch goes further, he takes the place kicks with a wider band
  const roll = (has, arcade) => {
    play(even(), even(), { arcade }); const M = T.M, c = M.players[4]; give(c, ...(has ? ['boot'] : []));
    for (const o of M.players) if (o !== c) { o.x = o.team ? 100 : 5; o.y = 5; }
    M.phase = 'play'; M.ball.state = 'held'; M.ball.carrier = c; c.x = 30; c.y = 35;
    reseed(77); R.doKick(c, 0.8, 0);
    const f = M.ball.f; let n = 0; while (M.ball.state === 'air' && n < 600) { R.updateBallAir(STEP); n++; }
    return { boot:!!f.boot, v:Math.hypot(M.ball.vx, M.ball.vy) };
  };
  const r0 = roll(false, true), r1 = roll(true, true), rx = roll(true, false);
  ok(r1.boot && !r0.boot && near(r1.v/r0.v, R.TRAIT.boot.roll, 1e-6), `Long Boot: his kick lands where it was aimed and runs on ${R.TRAIT.boot.roll}x as fast (${r0.v.toFixed(1)} to ${r1.v.toFixed(1)} m/s)`);
  ok(!rx.boot && rx.v === r0.v, 'Long Boot outside arcade: none');
  const touch = (has, arcade) => { play(even(), even(), { arcade }); if (has) give(T.M.players[4], 'boot'); R.penChoice(0, 40, 30, 'touch'); return T.M.set.x; };
  ok(touch(true, true) - touch(false, true) === R.TRAIT.boot.touch && touch(true, false) === touch(false, false), `Long Boot: a penalty kicked to touch goes ${R.TRAIT.boot.touch}m further, only in arcade`);
  const place = (has, arcade) => {
    play(even(), even(), { arcade }); const M = T.M, star = M.players[4]; if (has) give(star, 'boot');
    reseed(5); R.goalKick(0, 95, 25, 'conversion'); return { kicker:M.goal.kicker, w:M.goal.w };
  };
  const g0 = place(false, true), g1 = place(true, true), gx = place(true, false);
  ok(g1.kicker.n === 5 && near(g1.w/g0.w, R.TRAIT.boot.band), `Long Boot: he takes the conversion, and its band is ${R.TRAIT.boot.band}x as wide (${g0.w.toFixed(3)} to ${g1.w.toFixed(3)})`);
  ok(gx.w === g0.w && gx.kicker.n === g0.kicker.n, 'Long Boot outside arcade: the same kicker and band');
  { play(even(), even()); const M = T.M; give(M.players[11], 'boot'); const g = T.kick.makeGoal(1, 30, 30, 'penalty', null); ok(near(g.w, T.kick.goalOf(1, 30, 30, 'penalty', M.players[11], g.W).w), 'a CPU penalty at goal is banded for the Long Boot who will kick it'); }

  // Engine: his fade and his sprint
  const late = (has, arcade) => { play(even({ stamina:1 }), even(), { arcade }); const p = T.M.players[1]; give(p, ...(has ? ['engine'] : [])); T.M.clock = 0; const v0 = C.maxSpeed(p); T.M.clock = 120; return C.maxSpeed(p)/v0; };
  ok(near(1 - late(true, true), (1 - late(false, true))*R.TRAIT.engine.fade), `Engine: he feels ${R.TRAIT.engine.fade*100}% of his side's late pace fade (${((1 - late(false, true))*100).toFixed(1)}% to ${((1 - late(true, true))*100).toFixed(2)}%)`);
  ok(late(true, false) === 1, 'Engine outside arcade: no fade to save');
  const edge = (has, arcade) => { play(even({ stamina:1 }), even({ stamina:1 }), { arcade }); const M = T.M, q = M.players[1], c = M.players[10]; give(q, ...(has ? ['engine'] : [])); q.x = c.x = 40; q.y = c.y = 35; q.side = c.side = -1; M.clock = 120; return C.tackleChance(q, c, 'ai', false); };
  ok(near(edge(true, true) - edge(false, true), S.STAMINA.fade[0]*(1 - R.TRAIT.engine.fade)*0.05), `Engine: by the hooter he tackles with most of his Power left (${edge(false, true).toFixed(3)} to ${edge(true, true).toFixed(3)})`);
  ok(edge(true, false) === edge(false, false), 'and not outside arcade');
  const secs = (has, arcade) => {
    play(even(), even(), { arcade }); const M = T.M, p = M.players[3];
    give(p, ...(has ? ['engine'] : [])); M.phase = 'play'; M.set = null; T.sides.setCtrl(0, p);
    T.input.cDown = true; let t = 0; while (!M.spr[0].spent && t < 10) { C.sprintTick(STEP); t += STEP; } T.input.cDown = false;
    return t;
  };
  ok(near(secs(true, true)/secs(false, true), 1/R.TRAIT.engine.drain, 0.03), `Engine: his sprint lasts ${(1/R.TRAIT.engine.drain).toFixed(1)}x as long (${secs(false, true).toFixed(2)}s to ${secs(true, true).toFixed(2)}s)`);
  ok(secs(true, false) === secs(false, false), 'Engine outside arcade: none');
}

// 7. the call-out: when a trait decides something, at most once every TRAIT.gap seconds of play for each man
{
  play(team('FRA'), team('IRE'));
  const M = T.M, wing = M.players.find(p => p.team === 0 && p.n === 7), fly = M.players.find(p => p.team === 1 && p.n === 5);
  const tags = () => M.tags.map(t => t.text).join();
  M.tags = []; M.dclock = 50;
  ok(R.call(wing, 'burst') && tags() === 'Burst', 'the first Burst shows over him');
  M.dclock = 50 + R.TRAIT.gap - 0.1;
  ok(!R.call(wing, 'burst') && tags() === 'Burst' && M.stats.trait_burst === 2, 'inside the gap: counted, not shown');
  ok(R.call(fly, 'boot') && tags() === 'Burst,Long Boot', 'another man\'s call-out is his own');
  M.dclock = 50 + R.TRAIT.gap + 0.01;
  ok(R.call(wing, 'burst') && M.stats.tag_Burst === 2, 'after the gap it shows again');
  ok(!R.call(wing, 'crunch') && !M.stats.trait_crunch, 'a trait he hasn\'t is never called');
  M.stats.tackles = 0;
  play(team('FRA'), team('IRE'), { arcade:false });
  give(T.M.players[6], 'burst');
  ok(!R.call(T.M.players[6], 'burst') && !T.M.tags.length && !T.M.stats.trait_burst, 'outside arcade: no call-out and nothing counted');
  // over whole matches: never more than one a man in any TRAIT.gap seconds, and only for moments a trait decided
  let shown = 0, fired = 0, close = 0, tagged = 0;
  for (let i = 0; i < 6; i++) {
    reseed(300 + i); play(team('FRA'), team('IRE'));
    const M2 = T.M, last = new Map(), objs = new Set(), names = new Set(R.TRAITS.map(t => t.name));
    let n = 0;
    while (!M2.over && n < 200000) {
      bot(0); T.update(STEP); n++;
      for (const p of M2.players) if (p.trAt != null && p.trAt !== last.get(p)) {   // a call-out shown over him this step
        if (last.has(p) && p.trAt - last.get(p) < R.TRAIT.gap - 1e-9) close++;
        last.set(p, p.trAt); shown++;
      }
      for (const t of M2.tags) if (names.has(t.text)) objs.add(t);
    }
    tagged += objs.size;
    fired += Object.entries(M2.stats).filter(([k]) => k.startsWith('trait_')).reduce((a, [, v]) => a + v, 0);
  }
  ok(close === 0 && shown > 6 && tagged === shown, `whole matches France v Ireland with the harness's player: ${(shown/6).toFixed(1)} call-outs a match, none closer than ${R.TRAIT.gap}s for a man`);
  ok(fired >= shown, `the moments a trait decided (${(fired/6).toFixed(1)} a match) include every one shown`);
}

// 8. the marker: a gold star on each star's shoulder in the top view, through one line of render-match.js
{
  const src = fs.readFileSync(new URL('../src/render-match.js', import.meta.url), 'utf8');
  ok((src.match(/trait/gi) || []).length === 2 && /if \(M\.arcade\) traitMarks\(r\);/.test(src), 'render-match.js has one hook line for the marker');
  const fills = () => { let n = 0; globalThis.__ctxSpy = k => { if (k === 'fill') n++; }; R.marks(10); globalThis.__ctxSpy = null; return n; };
  D.view(844, 390); play(team('FRA'), team('IRE'));
  for (const p of T.M.players) { p.x = T.M.cam.x + (p.n - 4)*2; p.y = T.M.cam.y + p.team*3; }
  ok(fills() === 7, `in a match you play every star gets his star (${fills()} of 7)`);
  T.career.set(null);
  play(team('FRA'), team('IRE'), { arcade:false });
  ok(fills() === 0, 'none outside arcade');
}

// 9. the screens: the team cards' line, and the career hub's chips
{
  D.openTeams('quick'); D.settings().pool = 0; D.renderTeams();
  const html = $('t-grid').innerHTML;
  ok(/<span class="tstars" aria-label="Star Traits: Burst, Crunch, Hand-Off"><b>Burst<\/b> · <b>Crunch<\/b> · <b>Hand-Off<\/b><\/span>/.test(html), 'France\'s card names its three stars under the ability rows (Pace 5, Power 5 on the XV rankings)');
  { const cards = html.split('<button class="team"').slice(1), bare = cards.filter(c => !c.includes('class="tstars"')).map(c => (c.match(/class="tname">([^<]*)</) || [])[1]).sort();
    ok(cards.length === 12 && bare.join() === 'Italy,Wales', `every nation with a 5 has a line; Italy and Wales, with none, have none (${cards.length} cards; no line: ${bare.join(', ')})`); }
  ok(/aria-label="Overall 93">93<\/span>/.test(html), 'the overall badge is as it was');
  const cr = T.career.create({ name:'Sam', pos:'F', num:2, club:X.CLUBS[0] });
  Object.assign(cr.skills, { pace:81, power:84, handling:62, kicking:45, stamina:91 });
  T.career.set(cr); T.career.render();
  const card = $('cr-card').innerHTML, chips = card.match(/<span class="cr-trait[^"]*"/g) || [];
  ok(chips.length === 6, 'the hub shows all six traits as chips');
  ok(/<span class="cr-trait" style="--k:#5fb8ff"><b data-fit>Burst<\/b><\/span>/.test(card) && /class="cr-trait" style="--k:#c58cff"><b data-fit>Engine<\/b>/.test(card), 'one he has: its name, in its skill\'s colour');
  ok(/class="cr-trait off"[^>]*aria-label="Hand-Off, Power 90"><b data-fit>Hand-Off<\/b><span>90<\/span>/.test(card), 'a locked one dimmed, with the skill and the number it needs (Hand-Off, Power 90)');
  ok(/aria-label="Safe Hands, Handling 80"><b data-fit>Safe Hands<\/b><span>80<\/span>/.test(card) && /aria-label="Long Boot, Kicking 80"><b data-fit>Long Boot<\/b><span>80<\/span>/.test(card), 'Safe Hands needs Handling 80, Long Boot Kicking 80 (the number on the chip, in its skill\'s colour; both in the label)');
  ok(!/[a-z] [a-z]/.test((card.match(/<b data-fit>[^<]*<\/b>|<span data-fit>[^<]*<\/span>/g) || []).join(' ').replace(/<[^>]+>/g, ' ').replace(/ {2,}/g, '|')), 'Title Case, and no sentence');
  T.career.set(null);
}

console.log(`Traits: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;

/* ---------- --balance: what a starred side gains, in seeded CPU v CPU arcade matches ----------
   As README's Stamina section measured: a match you play (arcade) with the computer at both sets of controls, 2-minute halves,
   Normal. Each pairing is the same side twice, stars kept on one and taken off the other, played both ways round with the same
   seeds (the side at the human's end plays the human side's terms), so only the stars differ. N=BAL_N pairs (500). Pair i is
   seeded BAL_SEED + i*BAL_STEP (1000 and 7919); the README pools that set with 77000 and 104729. */
async function balance() {
  const N = +(process.env.BAL_N || 500), S0 = +(process.env.BAL_SEED || 1000), DS = +(process.env.BAL_STEP || 7919);
  const allFives = even({ id:'ALL', name:'All Stars', pace:5, power:5, handling:5, kicking:5, stamina:5 });
  const one = id => [even(), { [R.TRAITS.find(t => t.id === id).shirts[0]]:[id] }];
  const rows = [['France (4 stars)', team('FRA'), null], ['Ireland (3)', team('IRE'), null], ['Pretoria (2)', team('PRE'), null], ['All six', allFives, null],
    ...R.TRAITS.map(t => ['One ' + t.name, ...one(t.id)])];
  const only = process.env.BAL_ROWS ? process.env.BAL_ROWS.split(',').map(Number) : null;   // BAL_ROWS=0,3 runs only those rows (to split a run across processes)
  for (const [label, side, force] of rows.filter((_, i) => !only || only.includes(i))) {
    let sum = 0, sum2 = 0, n = 0, w = 0, l = 0, pts = 0;
    for (let i = 0; i < N; i++) for (const star of [0, 1]) {
      reseed(S0 + i*DS);
      T.newMatch(side, side, { halfLen:120, diff:1, headless:true, humans:[true, false], duels:'off', arcade:true });
      const M = T.M; M.side[0].human = false; M.side[0].ctrl = null;
      for (const p of M.players) { if (p.team !== star) p.tr = null; else if (force) give(p, ...(force[p.n] || [])); }
      let s = 0; while (!M.over && s < 400000) { T.update(STEP); s++; }
      const m = M.score[star] - M.score[1 - star]; sum += m; sum2 += m*m; n++; pts += M.score[0] + M.score[1]; if (m > 0) w++; else if (m < 0) l++;
    }
    const mean = sum/n, se = Math.sqrt(Math.max(0, sum2/n - mean*mean)/n);
    console.log(`${label.padEnd(18)} ${mean >= 0 ? '+' : ''}${mean.toFixed(2)} a match (se ${se.toFixed(2)}), won ${(100*w/n).toFixed(0)}% lost ${(100*l/n).toFixed(0)}%, ${(pts/n/2).toFixed(1)} points a side` +
      (process.env.BAL_RAW ? ` [raw n=${n} sum=${sum} sum2=${sum2} w=${w} l=${l} pts=${pts}]` : ''));   // BAL_RAW: the sums, to pool runs
  }
}
