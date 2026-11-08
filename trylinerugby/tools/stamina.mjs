// Stamina, the fifth ability: the data, the budget and old custom teams, old saves, the overall rating, the cards and the builder,
// each engine effect on in a match you play and off everywhere else, and AI v AI, the demo, practice and simulate() unchanged
// whatever the sides' Stamina (seeded runs compared step for step). Exits 1 on any failure.
// node tools/stamina.mjs            (SEED=21 unless set; VERBOSE=1 lists every check)
process.env.SEED ??= '21';
import fs from 'node:fs';
const { T, reseed } = await import('./harness.mjs');
const S = T.stamina, X = T.teams, C = T.contact, A = T.arcade, D = T.debug, STEP = T.STEP, $ = id => document.getElementById(id);
let failed = 0, passed = 0;
const ok = (cond, msg) => { if (cond) passed++; else failed++; if (!cond || process.env.VERBOSE) console.log(cond ? 'ok  ' : 'FAIL', msg); };   // VERBOSE=1 prints the passes too
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const KEYS = ['pace', 'power', 'handling', 'kicking', 'stamina'];
const sum = t => KEYS.reduce((a, k) => a + t[k], 0);
const side = (id, stamina, o) => ({ id, name:id, kit:id === 'AAA' ? '#f2efe6' : '#1d3a8f', trim:'#c8102e', pace:3, power:3, handling:3, kicking:3, stamina, ...o });
const play = (s0, s1, o) => T.newMatch(side('AAA', s0), side('BBB', s1), { halfLen:120, diff:1, headless:true, duels:'off', humans:[true, false], arcade:true, ...o });

// 1. the data
{
  ok(S.ABILITIES.length === 5 && S.ABILITIES[4][0] === 'stamina' && S.ABILITIES[4][1] === 'Stamina' && S.ABILITIES[3][0] === 'kicking', `Stamina is the fifth ability, after Kicking (${S.ABILITIES.map(a => a[1]).join(' ')})`);
  ok(X.ALL_TEAMS.every(t => Number.isInteger(t.stamina) && t.stamina >= 1 && t.stamina <= 5), 'every built-in team has a Stamina of 1 to 5');
  ok(new Set(X.ALL_TEAMS.map(t => t.stamina)).size >= 4, `the sides differ in Stamina (${[...new Set(X.ALL_TEAMS.map(t => t.stamina))].sort().join(' ')})`);
  const clubs = [...X.CLUBS, ...X.FRANCE, ...X.AUSTRALIA, ...X.SOUTH_AFRICA], top = Math.max(...clubs.map(sum));
  ok(top <= 5 + S.BUDGET, `no club tops a team you can make (${top} v ${5 + S.BUDGET})`);
  ok(S.BUDGET === 12, `a made team has 12 points: the old builder's 10 and 2 for Stamina 3 (${S.BUDGET})`);
  ok(X.NATIONS.map(t => t.stamina).join() === '4,5,5,3,4,4', `the nations' Stamina (${X.NATIONS.map(t => t.id + ' ' + t.stamina).join(', ')})`);
}

// 2. reading Stamina, and a team without it
{
  ok(S.staminaOf({}) === 3 && S.staminaOf(null) === 3 && S.staminaOf({ stamina:'5' }) === 3 && S.staminaOf({ stamina:NaN }) === 3, 'a missing or broken Stamina reads as 3');
  ok(S.staminaOf({ stamina:9 }) === 5 && S.staminaOf({ stamina:0 }) === 1 && S.staminaOf({ stamina:4.5 }) === 4.5, 'a number is held to 1 to 5, not rounded');
  ok(S.abilityOf({ pace:4 }, 'pace') === 4 && S.abilityOf({}, 'stamina') === 3 && S.abilityOf({}, 'kicking') === 0, 'abilityOf reads the four as before and Stamina with its 3');
  ok(X.rateOf({ pace:3, power:3, handling:3, kicking:3 }) === 15 && X.rateOf({ pace:3, power:3, handling:3, kicking:3, stamina:5 }) === 17, 'the rating counts a missing Stamina as 3');
}

// 3. the budget, and teams made before Stamina
{
  const old = X.cleanTeam({ name:'Old Max', pace:5, power:5, handling:2, kicking:2 }, 0);   // the most the four-ability builder allowed
  ok(old.stamina === 3 && old.pace === 5 && old.power === 5 && old.handling === 2 && old.kicking === 2 && sum(old) === 5 + S.BUDGET, `a full old team keeps every point and gets Stamina 3 (${KEYS.map(k => old[k]).join(' ')})`);
  const under = X.cleanTeam({ name:'Old Even', pace:3, power:3, handling:3, kicking:3 }, 0);
  ok(under.stamina === 3 && sum(under) === 15, 'an old team with points left gets Stamina 3 too, not the leftovers');
  const over = X.cleanTeam({ name:'Greedy', pace:5, power:5, handling:5, kicking:5, stamina:5 }, 0);
  ok(sum(over) === 5 + S.BUDGET && over.stamina === 1 && over.kicking === 1 && over.handling === 5, `overspent: the budget holds, last in line loses first (${KEYS.map(k => over[k]).join(' ')})`);
  const made = X.cleanTeam({ name:'Runners', pace:3, power:3, handling:3, kicking:3, stamina:5 }, 0);
  ok(made.stamina === 5 && sum(made) === 17, 'Stamina 5 can be bought');
  ok(X.cleanTeam({ name:'Bad', stamina:'lots' }, 0).stamina === 3 && X.cleanTeam({ name:'Lo', stamina:-4 }, 0).stamina === 1, 'a broken Stamina is put right');
  const imp4 = X.cleanTeam({ name:'Import', pace:4, power:4, handling:4, kicking:4 }, 0), imp5 = X.cleanTeam({ name:'Import', pace:5, power:5, handling:5, kicking:5 }, 0);
  ok(imp4.stamina === 3 && sum(imp4) === 5 + S.BUDGET && KEYS.map(k => imp4[k]).join() === '4,4,4,2,3', `overspent with no Stamina: it keeps its 3 and the cut falls on the other four (${KEYS.map(k => imp4[k]).join(' ')})`);
  ok(imp5.stamina === 3 && KEYS.map(k => imp5[k]).join() === '5,5,3,1,3', `and the most overspent too (${KEYS.map(k => imp5[k]).join(' ')})`);
  ok(Object.keys(imp4).slice(-5).join() === KEYS.join(), 'the abilities are still stored in ABILITIES order');

  X.restore({ custom:[{ key:'myold', name:'Old Max', kit:'#c8102e', trim:'#f2efe6', pace:5, power:5, handling:2, kicking:2 }, { key:'mynew', name:'Fit', pace:2, power:2, handling:2, kicking:2, stamina:5 }] });
  const [a, b] = X.custom();
  ok(a && a.stamina === 3 && a.pace === 5 && a.kicking === 2 && b && b.stamina === 5, `a save from before Stamina loads with 3, and a new one keeps its own (${a && a.stamina}, ${b && b.stamina})`);

  const mem = {}, kept = globalThis.localStorage;
  globalThis.localStorage = { getItem:k => (k in mem ? mem[k] : null), setItem:(k, v) => { mem[k] = String(v); } };
  X.save(); X.restore(JSON.parse(mem['tryline.v1']));
  ok(X.custom()[0].stamina === 3 && X.custom()[1].stamina === 5 && JSON.parse(mem['tryline.v1']).custom[1].stamina === 5, 'Stamina is saved and comes back');
  globalThis.localStorage = kept;
}

// 4. championship sides saved before Stamina
{
  const five = ['HAR', 'HAS', 'GUI', 'ALD', 'WEY'].map(id => X.CLUBS.find(t => t.id === id));
  X.newChamp(X.CLUBS[0], five);
  const raw = JSON.parse(JSON.stringify(X.champ()));
  for (const t of raw.teams) delete t.stamina;
  X.setChamp(null); X.restore({ champ:raw });
  const c = X.champ();
  ok(c && c.teams.length === 6 && c.teams.every(t => t.stamina === 3) && c.teams[0].pace === 4, 'a championship saved before Stamina loads, every side at 3');
  ok(X.standings(c).length === 6, 'and its table still builds');
  const legacy = { user:0, round:0, fixtures:raw.fixtures, results:[] };   // saved before clubs: no teams, the nations by index
  X.setChamp(null); X.restore({ champ:legacy });
  ok(X.champ() && X.champ().teams.map(t => t.stamina).join() === X.NATIONS.map(t => t.stamina).join(), 'a championship from before clubs takes the nations with their Stamina');
  ok(S.cleanSide({ id:'ABC', name:'Side', stamina:7 }).stamina === 5 && S.cleanSide({ id:'ABC', name:'Side' }).stamina === 3, 'cleanSide holds Stamina to 1 to 5, 3 when missing');
  ok(S.cleanSide({ id:'ABC', name:'Side', stamina:3.6 }).stamina === 4 && X.cleanTeam({ name:'Side', stamina:3.6 }, 0).stamina === 4, 'the saves keep whole pips: a fraction comes back rounded (data.js, staminaOf)');
  const sim = X.simMatch;   // the other fixtures ignore Stamina: same draws, same result
  const pair = st => ({ teams:[side('AAA', st), side('BBB', 6 - st)] });
  reseed(5); const r1 = JSON.stringify(sim(pair(1), 0, 1)); reseed(5); const r5 = JSON.stringify(sim(pair(5), 0, 1));
  ok(r1 === r5, 'simulated fixtures ignore Stamina');
  X.setChamp(null);
}

// 5. the overall rating
{
  const O = X.overallOf;
  ok(O({ pace:1, power:1, handling:1, kicking:1, stamina:1 }) === 40 && O({ pace:5, power:5, handling:5, kicking:5, stamina:5 }) === 99, 'the overall rating still runs 40 to 99');
  ok(O(X.NATIONS[1]) === 93 && O(X.NATIONS[2]) === 93 && O(X.NATIONS[0]) === 84, `France and Ireland 93, England 84 (${X.NATIONS.map(t => t.id + ' ' + O(t)).join(', ')})`);
  ok(O({ pace:5, power:5, handling:3, kicking:2, stamina:2 }) === 75 && O({ pace:4, power:4, handling:3, kicking:3, stamina:3 }) === 75, 'a team you make tops out at 75');
  ok([...X.CLUBS, ...X.FRANCE, ...X.AUSTRALIA, ...X.SOUTH_AFRICA].every(t => O(t) <= 75), 'no club is rated above a team you can make');
  ok(X.ALL_TEAMS.every(t => Number.isInteger(O(t)) && O(t) >= 40 && O(t) <= 99), 'every built-in team has a whole-number overall');
  ok(O({ pace:4, power:4, handling:4, kicking:4 }) === O({ pace:4, power:4, handling:4, kicking:4, stamina:3 }), 'a team without Stamina is rated as Stamina 3');
  const st1 = side('AAA', 1), st5 = side('BBB', 5), up3 = side('CCC', 1, { pace:4, power:4, kicking:4 });
  ok(!X.outmatched(st1, st5) && X.outmatched(st5, up3) && X.outmatched(st1, up3), 'Stronger Side leaves Stamina out: 4 points of it mark nothing, 3 points of the rest are marked whatever the Stamina');
  const four = t => t.pace + t.power + t.handling + t.kicking;
  ok(X.ALL_TEAMS.every(u => X.ALL_TEAMS.every(t => X.outmatched(u, t) === (four(t) >= four(u) + 3))), 'every built-in pair is marked as it was before Stamina');
}

// 6. the cards and the builder
{
  D.openTeams('champ');
  const html = $('t-grid').innerHTML, cards = (html.match(/<button class="team[^"]*" data-i=/g) || []).length + 1;   // the team cards (data-i), plus one for the Create Team card the old count included; Import Club is not a team card
  ok((html.match(/<span>Stamina<\/span>/g) || []).length === cards - 1 && (html.match(/class="pips"/g) || []).length === 5*(cards - 1), `every team card shows five ability rows (${cards - 1} cards)`);
  ok(/<span>Kicking<\/span><span class="pips"[^>]*>.*?<\/span><span>Stamina<\/span><span class="pips" aria-label="3 of 5">/.test(html), 'Stamina is the last row, Farnham at 3');
  S.openBuilder(null);
  ok(S.draft().stamina === 1 && KEYS.every(k => S.draft()[k] === 1), 'a new team starts at 1 in all five');
  ok($('bd-left').textContent === 'Points Left 12' && /aria-label="1 of 5"/.test($('bd-p-stamina').innerHTML), `the builder has a Stamina row and 12 points (${$('bd-left').textContent})`);
  S.openBuilder(X.custom()[0]);
  ok(S.draft().stamina === 3 && $('bd-left').textContent === 'Points Left 0', 'an old team opens with Stamina 3 and nothing left to spend');
  const src = fs.readFileSync(new URL('../src/ui-menus.js', import.meta.url), 'utf8');
  ok(/ABILITIES\.map\(\(\[k, l\]\) => `\s*<div class="ab">/.test(src), 'the builder rows come from ABILITIES');
}

// 7. who feels it: a match you play, and nothing else
{
  T.newMatch(side('AAA', 5), side('BBB', 1), { halfLen:60, diff:1, auto:true, headless:true, arcade:true });
  T.M.clock = 60;
  ok(!S.staminaOn() && S.staminaLasts(0) === 1 && S.staminaFade(1) === 0 && S.powerOf(1) === 3, 'AI v AI: no Stamina, even when asked');
  T.newMatch(side('AAA', 5), side('BBB', 1), { halfLen:1e9, diff:1, auto:true, demo:true, arcade:true });
  ok(!S.staminaOn() && S.staminaLasts(1) === 1, 'the demo: none');
  T.practice.start('defend');
  T.M.clock = 120;
  ok(!S.staminaOn() && S.staminaFade(0) === 0 && S.staminaLasts(0) === 1, 'practice: none');
  T.practice.leave();
  play(1, 5, { arcade:false });
  T.M.clock = 120;
  ok(!S.staminaOn() && S.staminaFade(0) === 0, 'a tool\'s one-player match: none');
  play(1, 5);
  ok(S.staminaOn(), 'a match you play: yes');
}

// 8. Sprint lasts longer with more Stamina
{
  const secsOf = (st, arcade) => {   // a held sprint, no ball: seconds from a full meter to dry
    play(st, 3, { arcade });
    const M = T.M, p = M.players[3];
    M.phase = 'play'; M.set = null; T.sides.setCtrl(0, p);
    T.input.cDown = true;
    let t = 0; while (!M.spr[0].spent && t < 10) { C.sprintTick(STEP); t += STEP; }
    T.input.cDown = false;
    return t;
  };
  const s1 = secsOf(1, true), s3 = secsOf(3, true), s5 = secsOf(5, true), off5 = secsOf(5, false);
  ok(near(s3, C.SPRINT.secs, 0.02), `Stamina 3: today's Sprint (${s3.toFixed(2)}s)`);
  ok(near(s5/s3, 1.2, 0.02) && near(s1/s3, 0.8, 0.02), `Stamina 5 about 20% longer, 1 about 20% shorter (${s1.toFixed(2)}s, ${s5.toFixed(2)}s)`);
  ok(near(off5, s3, 0.001), `outside arcade Stamina 5 sprints as 3 (${off5.toFixed(2)}s)`);
  play(3, 5);
  ok(near(S.staminaLasts(1), 1.2) && near(S.staminaLasts(0), 1), 'each side by its own Stamina, the CPU\'s too');
}

// 9. On Fire burns longer with more Stamina
{
  const fire = (st, arcade) => { play(st, 3, { arcade }); for (let i = 0; i < 3; i++) A.heat(0, 'hit'); return T.M.fire[0].t; };
  ok(fire(3, true) === A.ARCADE.fire.secs, `Stamina 3: On Fire for ${A.ARCADE.fire.secs}s as before`);
  ok(near(fire(5, true), A.ARCADE.fire.secs*1.2) && near(fire(1, true), A.ARCADE.fire.secs*0.8), `Stamina 5 ${fire(5, true).toFixed(1)}s, Stamina 1 ${fire(1, true).toFixed(1)}s`);
  ok(fire(5, false) === 0, 'no fire outside arcade');
  play(3, 1); for (let i = 0; i < 3; i++) A.heat(1, 'hit');
  ok(near(T.M.fire[1].t, A.ARCADE.fire.secs*0.8), 'the CPU side burns by its own Stamina');
}

// 10. Power fades over each half
{
  play(1, 5);
  const M = T.M, at = (clock, t) => { M.clock = clock; return S.staminaFade(t); };
  const F = st => S.STAMINA.fade[0] + (st - 1)*(S.STAMINA.fade[1] - S.STAMINA.fade[0])/4;   // Power lost by the hooter at Stamina st
  ok(S.STAMINA.fade[0] === 2 && S.STAMINA.fade[1] === 0.2, 'Stamina 1 loses two points of Power by the hooter, Stamina 5 a fifth of one (the owner chose a stronger fade)');
  ok(at(0, 0) === 0 && at(0, 1) === 0, 'nothing faded at the kick-off');
  ok(near(at(120, 0), F(1)) && near(at(120, 1), F(5)), `by the hooter Stamina 1 and 5 have lost their fade (${at(120, 0)}, ${at(120, 1)})`);
  ok(near(at(60, 0), F(1)/2) && near(at(400, 0), F(1)), 'a straight line over the half, and no further while play runs on');
  play(3, 2); T.M.clock = 120;
  ok(near(S.staminaFade(0), 1.1) && near(S.staminaFade(1), 1.55), 'Stamina 3 loses 1.1, 2 loses 1.55');
  play(1, 5); T.M.clock = 120;
  ok(near(S.powerOf(0), 3 - F(1)) && near(S.powerOf(1), 3 - F(5)), 'powerOf is the Power left');
  A.endHalf();
  ok(T.M.half === 2 && T.M.clock === 0 && S.staminaFade(0) === 0 && S.powerOf(0) === 3, 'back to full at half time');
  T.M.clock = 120; T.M.score = [5, 5]; A.endHalf();
  ok(T.M.golden && S.staminaFade(0) === 0, 'extra time starts fresh');
  T.M.clock = 30;
  ok(near(S.staminaFade(0), F(1)/4), 'and fades as fast through it');
  play(1, 5, { arcade:false }); T.M.clock = 120;
  ok(S.powerOf(0) === 3 && S.powerOf(1) === 3, 'outside arcade Power never fades');
  ok(S.staminaPace(0) === 1 && S.staminaPace(1) === 1, 'and top speed never fades');
  play(1, 5); const p0 = T.M.players[3], p1 = T.M.players[10];
  T.M.clock = 0; const v0 = C.maxSpeed(p0), w0 = C.maxSpeed(p1);
  T.M.clock = 120;
  ok(near(S.staminaPace(0), 1 - S.STAMINA.pace[0]) && near(S.staminaPace(1), 1 - S.STAMINA.pace[1]), `top speed fades too: Stamina 1 loses ${S.STAMINA.pace[0]*100}% by the hooter, Stamina 5 none`);
  ok(near(C.maxSpeed(p0)/v0, 1 - S.STAMINA.pace[0]) && near(C.maxSpeed(p1), w0), 'and maxSpeed reads it');
  T.M.clock = 60; ok(near(S.staminaPace(0), 1 - S.STAMINA.pace[0]/2), 'in a straight line over the half');
}

// 11. the fade reaches every engine read of Power: a source check for direct reads, then each site measured (the duel windows read
// Power by name, which the source check cannot see), so reverting any one site fails a check here
{
  const src = ['contact.js', 'duels.js', 'set-pieces.js', 'passing.js', 'goal-kicks.js', 'match.js', 'movement.js', 'ball.js', 'arcade.js']
    .map(f => fs.readFileSync(new URL('../src/' + f, import.meta.url), 'utf8')).join('\n');
  ok(!/\.power\b/.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')), 'no engine file reads .power except through powerOf');
  ok((src.match(/powerOf\(/g) || []).length >= 9, `powerOf is read at the tackle, the Big Hit, the ruck, both scrums and the duel windows (${(src.match(/powerOf\(/g) || []).length})`);

  const tackle = (st0, st1, clock, arcade) => {
    play(st0, st1, { arcade }); T.M.clock = clock;
    const q = T.M.players[0], c = T.M.players[7];
    q.x = c.x = 40; q.y = c.y = 35; q.side = c.side = -1;
    return C.tackleChance(q, c, 'ai', false);
  };
  const fresh = tackle(1, 5, 0, true), tired = tackle(1, 5, 120, true);
  const F = st => S.STAMINA.fade[0] + (st - 1)*(S.STAMINA.fade[1] - S.STAMINA.fade[0])/4;
  ok(near(fresh - tired, (F(1) - F(5))*0.05), `a tired Stamina 1 side tackles a Stamina 5 carrier less surely by the hooter (${fresh.toFixed(3)} to ${tired.toFixed(3)})`);
  ok(tackle(1, 5, 120, false) === fresh, 'outside arcade the tackle is as at the kick-off');
  ok(near(tackle(3, 3, 120, true), fresh), 'two sides of the same Stamina fade together: nothing changes between them');

  const scrumBase = (clock, arcade) => { play(1, 3, { arcade }); T.M.clock = clock; S.startScrum({ team:0, x:60, y:35 }); return T.M.cut.base[0]; };
  ok(near(scrumBase(0, true) - scrumBase(120, true), 0.06*F(1)), `your pack's push fades with Power (${scrumBase(0, true).toFixed(3)} to ${scrumBase(120, true).toFixed(3)})`);
  ok(scrumBase(120, false) === scrumBase(0, false), 'and not outside arcade');

  // the duel windows read Power by name (DUEL[kind].mod), which the source check above cannot see: open each and measure it
  const wid = (kind, s0, s1, clock, arcade) => {
    T.newMatch(side('AAA', s0), side('BBB', s1), { halfLen:120, diff:1, headless:true, duels:'live', humans:[true, false], arcade });
    const { U, O, R } = D.stage(kind); T.M.clock = clock;
    return D.startDuel({ kind, U, O, R, how:'force' }).wid;
  };
  ok(near(wid('past', 5, 1, 120, true) - wid('past', 5, 1, 0, true), 0.012*F(1)) && near(wid('past', 1, 5, 120, true) - wid('past', 1, 5, 0, true), 0.012*F(5)),
    `Get Past: the window widens as the defender's Power fades, by his own Stamina (${(wid('past', 5, 1, 120, true) - wid('past', 5, 1, 0, true)).toFixed(4)})`);
  ok(near(wid('tackle', 1, 5, 0, true) - wid('tackle', 1, 5, 120, true), 0.012*F(1)) && near(wid('tackle', 5, 1, 0, true) - wid('tackle', 5, 1, 120, true), 0.012*F(5)),
    `Tackle: the window narrows as your own Power fades (${(wid('tackle', 1, 5, 0, true) - wid('tackle', 1, 5, 120, true)).toFixed(4)})`);
  ok(wid('past', 5, 1, 120, false) === wid('past', 5, 1, 0, false) && wid('tackle', 1, 5, 120, false) === wid('tackle', 1, 5, 0, false), 'outside arcade the duel windows do not move');

  // the Fend needs a point of Power edge, to the nearest point: a broken tackle by a clear margin (a seed whose first draw is high)
  let hi = 1; for (; hi < 5000; hi++) { reseed(hi); if (Math.random() > 0.99) break; }
  const fends = (car, tac, clock, arcade) => {
    T.newMatch(car, tac, { halfLen:120, diff:1, headless:true, duels:'off', humans:[true, false], arcade });
    T.M.clock = clock;
    const c = T.M.players[3], q = T.M.players[10], n = T.M.stats.fends || 0;
    c.x = 40; c.y = q.y = 35; q.x = 41; c.vx = c.vy = q.vx = q.vy = 0; c.sprinting = q.sprinting = false;
    reseed(hi); C.commitTackle(q, c, 'contact');
    return (T.M.stats.fends || 0) > n;
  };
  const eng = X.NATIONS[0], ire = X.NATIONS[2];   // England carrying: Power 5 and Stamina 4, against Ireland's 4 and 5
  ok(fends(eng, ire, 0, true) && fends(eng, ire, 60, true) && fends(eng, ire, 120, true), 'England keeps the Fend against Ireland all half: a point of Power, faded 0.225 by the hooter');
  ok(fends(side('AAA', 1, { power:4 }), side('BBB', 5), 0, true) && !fends(side('AAA', 1, { power:4 }), side('BBB', 5), 120, true), 'a point up at Stamina 1 against 5: the Fend at kick-off, gone by the hooter');
  ok(!fends(side('AAA', 5), side('BBB', 1), 0, true) && fends(side('AAA', 5), side('BBB', 1), 120, true), 'level Power at Stamina 5 against 1: no Fend at kick-off, one by the hooter');
  ok(fends(side('AAA', 3, { power:4 }), side('BBB', 3), 120, true) && !fends(side('AAA', 3), side('BBB', 3), 120, true), 'the same Stamina: the Fend is as it was at kick-off');
  ok(fends(side('AAA', 1, { power:4 }), side('BBB', 5), 120, false) && !fends(side('AAA', 5), side('BBB', 1), 120, false), 'outside arcade the Fend reads Power as it is');

  // the ruck turnover and the scrum played for you: the same draws (one seed each) at kick-off and at the hooter
  const seeds = Array.from({ length:400 }, (_, i) => (i + 1)*7919);
  const turnovers = (clock, arcade) => {
    play(1, 5, { arcade }); T.M.clock = clock;
    let n = 0;
    for (const sd of seeds) { T.M.phase = 'play'; T.M.set = null; const before = T.M.stats.turnovers; reseed(sd); C.resolveRuck({ team:0, x:60, y:35, dom:false }); if (T.M.stats.turnovers > before) n++; }
    return n;
  };
  const tk = turnovers(0, true), th = turnovers(120, true);
  ok(th > tk && turnovers(120, false) === turnovers(0, false), `a tired Stamina 1 side loses more rucks to a Stamina 5 side by the hooter (${tk} to ${th} of ${seeds.length})`);
  const feedKept = (clock, arcade) => {
    play(1, 5, { arcade }); T.M.clock = clock;
    let n = 0;
    for (const sd of seeds) { T.M.phase = 'play'; T.M.set = null; reseed(sd); S.autoScrum({ team:0, x:60, y:35 }); if (T.M.poss === 0) n++; }
    return n;
  };
  const fk = feedKept(0, true), fh = feedKept(120, true);
  ok(fh < fk && feedKept(120, false) === feedKept(0, false), `the scrum played for you: a tired Stamina 1 pack keeps its own feed less often by the hooter (${fk} to ${fh} of ${seeds.length})`);
}

// 12. AI v AI, the demo, practice and simulate() play exactly as they did, whatever Stamina says (seeded, compared step for step)
{
  const fp = M => JSON.stringify({ score:M.score, tries:M.tries, stats:M.stats, ball:[M.ball.x, M.ball.y, M.ball.state], men:M.players.map(p => [p.x.toFixed(6), p.y.toFixed(6)]), spr:M.spr.map(s => s.m) });
  const full = (s0, s1, o) => {   // a whole match, played to full time
    reseed(901);
    T.newMatch({ ...X.NATIONS[0], stamina:s0 }, { ...X.NATIONS[1], stamina:s1 }, { halfLen:90, diff:1, headless:true, ...o });
    if (!T.M.auto) { T.M.side[0].human = false; T.M.side[0].ctrl = null; }   // nobody at the controls headless: the CPU plays both sides, arcade or not
    let n = 0; while (!T.M.over && n < 400000) { T.update(STEP); n++; }
    return fp(T.M) + n;
  };
  const ai = full(3, 3, { auto:true });
  ok(full(1, 5, { auto:true }) === ai && full(5, 1, { auto:true, arcade:true }) === ai, 'AI v AI: Stamina 1 v 5 and 5 v 1 play the same match as 3 v 3');
  const tool = full(3, 3, { humans:[true, false] });
  ok(full(5, 1, { humans:[true, false] }) === tool, 'a one-player match without arcade (the tools, practice) plays the same whatever Stamina says');
  ok(full(5, 1, { humans:[true, false], arcade:true }) !== full(3, 3, { humans:[true, false], arcade:true }), 'and the comparison can tell: with arcade on, Stamina changes the match');

  const demo = st => { reseed(77); T.newMatch({ ...X.NATIONS[2], stamina:st }, { ...X.NATIONS[3], stamina:6 - st }, { halfLen:1e9, diff:1, auto:true, demo:true }); for (let i = 0; i < 3000; i++) T.update(STEP); return fp(T.M); };
  ok(demo(1) === demo(5) && demo(3) === demo(5), 'the menu demo runs the same');

  const drill = (id, st) => {
    const far = X.CLUBS[0], has = X.CLUBS[1], keep = [far.stamina, has.stamina];
    far.stamina = st; has.stamina = 6 - st;
    reseed(33); T.practice.start(id); T.M.paused = false;   // as Start Drill leaves it
    for (let i = 0; i < 900 && !T.practice.state().done; i++) T.update(STEP);
    const out = fp(T.M); T.practice.leave(); [far.stamina, has.stamina] = keep; return out;
  };
  ok(drill('defend', 1) === drill('defend', 5) && drill('pass', 1) === drill('pass', 5), 'practice drills run the same');

  const simAll = st => { const keep = X.NATIONS.map(t => t.stamina); X.NATIONS.forEach((t, i) => { t.stamina = st == null ? keep[i] : st; }); reseed(4242); const out = JSON.stringify(T.simulate(3, 60)); X.NATIONS.forEach((t, i) => { t.stamina = keep[i]; }); return out; };
  const base = simAll(null);
  ok(simAll(1) === base && simAll(5) === base, 'simulate(), the balance tools\' runner, gives the same results at any Stamina');
}

console.log(`Stamina: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
