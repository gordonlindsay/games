// What each career stage plays: Juniors with no scrums, Minis as tag festivals, Club on with everything. Every other match stays on full rules.
// node tools/rules.mjs   Exits 1 on any failure.
process.env.SEED ??= '37';
const { T, reseed, bot } = await import('./harness.mjs');
const C = T.career, X = T.teams, R = T.rules, D = T.debug, $ = id => document.getElementById(id);
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const memory = {};
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; } };
{ const qsa = document.querySelectorAll, mine = ['s-career-new', 's-career', 's-career-train', 's-career-table', 's-career-end'];
  document.querySelectorAll = sel => (sel === '.screen' ? qsa(sel).concat(mine.map(id => $(id))) : qsa(sel)); }
const s = D.settings(); s.diff = 1; s.half = 0; s.played = 99; s.hints = false;
const at = (stage, club = X.CLUBS[0]) => { const cr = C.create({ name:'Sam', pos:'B', num:4, club, look:{ g:0, skin:2, hair:1, style:0, b:1 } }); cr.stage = stage; if (stage >= 3) { cr.pro = 'SAL'; cr.country = 'ENG'; } C.set(cr); C.newSeason(cr); return cr; };
const stepTo = (test, max = 3000) => { let n = 0; while (!test() && n < max && !T.M.over) { T.update(T.STEP); n++; } return test(); };
const settle = () => { T.M.phase = 'play'; T.M.set = null; T.M.cut = null; };

// 1. who plays what
ok(C.STAGES.map(st => st.rules || 'full').join() === 'tag,noscrum,full,full,full', 'Minis tag, Juniors no scrums, the rest everything');
for (const [stage, rules] of [[0, 'tag'], [1, 'noscrum'], [2, 'full'], [3, 'full'], [4, 'full']]) { at(stage); ok(C.play() && T.M.rules === rules, `stage ${stage} plays ${rules}`); ok((T.M.duels === 'off') === (rules === 'tag'), `and ${rules === 'tag' ? 'has no close-ups' : 'keeps its close-ups'}`); D.exitMatch(); }
C.set(null);
{ D.startMatch ? D.startMatch(X.CLUBS[0], X.CLUBS[1], false) : T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:1, headless:true, humans:[true, false] }); ok(T.M.rules === 'full', 'a match with no career asks for nothing, and plays everything');
  T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:1, headless:true, humans:[true, false], rules:'nonsense' }); ok(T.M.rules === 'full', 'an unknown rule is everything'); }

// 2. Juniors: a free pass where the scrum was, and the rest as ever
{ at(1); C.play(); settle(); R.scrum(1, 60, 35, 'Knock-On');
  ok(T.M.set.kind === 'tap' && T.M.set.team === 1 && (T.M.stats.scrums || 0) === 0, 'a scrum is a free pass, to the same side');
  ok(stepTo(() => T.M.phase === 'play') && !T.M.cut && T.M.ball.state === 'held' && T.M.ball.carrier.team === 1, 'and the ball is back in play, with no close-up');
  settle(); R.scrum(0, 3, 90, 'Knock-On'); ok(T.M.set.x >= 15 && T.M.set.x <= 105 && T.M.set.y >= 6 && T.M.set.y <= 64, 'on the pitch, wherever it fell');
  settle(); R.lineout(0, 60, 2, 'Into Touch'); ok(T.M.set.kind === 'lineout', 'Juniors keep the lineout'); D.exitMatch();
  at(2); C.play(); settle(); R.scrum(0, 60, 35); ok(T.M.set.kind === 'scrum', 'Club scrums'); D.exitMatch(); C.set(null); }

// 3. tag: the restarts
{ at(0); C.play();
  ok(R.matchTag() && T.M.set.kind === 'kickoff', 'tag starts from the middle');
  ok(stepTo(() => T.M.phase === 'play') && T.M.ball.state === 'held' && T.M.stats.kicks === 0, 'with the ball in hand, not kicked');
  settle(); R.lineout(0, 60, 2, 'Into Touch'); ok(T.M.set.kind === 'tap', 'no lineout: a free pass');
  settle(); R.scrum(0, 60, 35); ok(T.M.set.kind === 'tap', 'no scrum');
  settle(); R.penalty(1, 60, 35); ok(T.M.set.kind === 'tap' && T.M.set.team === 1, 'and a penalty is a free pass too');
  settle(); R.dropOut(0); ok(T.M.set.kind === 'tap', 'as is a drop-out');
  D.exitMatch(); }

// 4. tag: the tag itself and the count
{ at(0); C.play(); stepTo(() => T.M.phase === 'play');
  const carrierOf = () => T.M.ball.carrier, them = t => T.M.players.find(p => p.team !== t);
  const before = T.M.stats.tackles;
  for (let n = 1; n <= 5; n++) {
    const c = carrierOf(), q = them(c.team), team = c.team; q.tcd = q.offside = 0;
    R.tagMade(c, q);
    ok(T.M.set.kind === 'ruck' && T.M.set.team === team && T.M.tagN === n && c.down === 0 && q.down === 0 && !c.bind, `tag ${n}: the same side plays on, and nobody is on the ground`);
    stepTo(() => T.M.phase === 'play'); ok(T.M.ball.carrier.team === team, 'and they have it back');
  }
  const c = carrierOf(), team = c.team, q = them(team); q.tcd = q.offside = 0;
  R.tagMade(c, q);
  ok(T.M.set.kind === 'tap' && T.M.set.team === 1 - team && T.M.tagN === 0, 'the sixth: the ball goes over');
  stepTo(() => T.M.phase === 'play'); ok(T.M.ball.carrier.team === 1 - team, 'and they have it');
  ok(T.M.stats.tackles === before + 6, 'each tag counted on the card');
  // a change of possession starts the count again
  { const c2 = carrierOf(), q2 = them(c2.team); q2.tcd = q2.offside = 0; R.tagMade(c2, q2); stepTo(() => T.M.phase === 'play'); const n1 = T.M.tagN, other = T.M.players.find(p => p.team !== c2.team); T.M.ball.carrier = other; D.setCarrier ? D.setCarrier(other) : null; ok(n1 === 1, 'a new side starts at one'); }
  D.exitMatch(); }

// 5. tag: a press, in and out of reach
{ at(0); C.play(); stepTo(() => T.M.phase === 'play');
  const M = T.M, c = M.ball.carrier;
  const q = M.players.find(p => p.team !== c.team); q.x = c.x + 40; q.y = c.y; q.tcd = q.offside = 0;
  ok(!R.matchCanPull(q), 'out of reach: no tag');
  q.x = c.x + 1.7; q.y = c.y; ok(R.matchCanPull(q), 'at arm\'s length: a tag');
  q.tcd = 1; ok(!R.matchCanPull(q), 'but not straight after a miss');
  D.exitMatch(); C.set(null); }

// 6. whole tag matches, by bot, through the real path
{ let tries = 0, tags = 0, goes = 0, wins = 0, losses = 0, stalls = 0, downs = 0, binds = 0, n = 12;
  for (let i = 0; i < n; i++) {
    reseed(900 + i); const cr = at(0, X.CLUBS[i % X.CLUBS.length]); C.play();
    ok(T.M.halfLen === R.FESTIVAL_HALF && R.FESTIVAL_HALF < 120, 'a festival half is shorter than the shortest setting');
    let steps = 0;
    while (!T.M.over && steps < 120000) {
      if (T.M.phase === 'break' && !T.M.over) { $('br-go').click(); continue; }
      if (T.M.phase === 'menu') { ok(false, 'tag never opens the penalty card'); break; }
      bot(0); T.update(T.STEP); steps++;
      if (T.M.players.some(p => p.down > 0)) downs++;
      if (T.M.players.some(p => p.bind)) binds++;
    }
    if (!T.M.over) stalls++;
    const S = T.M.stats;
    ok((S.scrums || 0) === 0 && S.kicks === 0 && S.gk.att[0] + S.gk.att[1] === 0 && S.drops === 0 && S.duels === 0, `no scrums, kicks, goal kicks, drop goals or close-ups (${S.scrums || 0}, ${S.kicks}, ${S.gk.att}, ${S.drops}, ${S.duels})`);
    ok(T.M.score[0] % 5 === 0 && T.M.score[1] % 5 === 0, 'tries are the only score');
    tries += T.M.tries[0] + T.M.tries[1]; tags += S.tackles; goes += S.turnovers; if (T.M.score[0] > T.M.score[1]) wins++; else if (T.M.score[0] < T.M.score[1]) losses++;
    D.exitMatch(); C.set(null);
  }
  ok(!stalls, `no match stalls (${stalls})`);
  ok(!downs && !binds, `nobody is on the ground or held, in any step (${downs}, ${binds})`);
  ok(tags > n*2, `tags happen (${tags} in ${n} matches)`);
  ok(tries > n, `and so do tries (${tries} in ${n} matches)`);
  console.log(`Tag by bot: ${n} matches, won ${wins}, lost ${losses}, ${(tries/n).toFixed(1)} tries, ${(tags/n).toFixed(1)} tags, ${(goes/n).toFixed(1)} handovers a match`); }

// 7. a festival: no table, and everyone moves up
{ const cr = at(0); C.open();
  ok(/^Match 1 of 5$/.test($('cr-title').textContent) && $('cr-table').hidden, 'the hub: a match, not a round, and no Table');
  ok($('cr-eyebrow').textContent === 'Minis · Tag Festival' && /Tag Rugby/.test($('cr-line').textContent), 'and it says what they play');
  C.play(); T.M.half = 2; T.M.score = [0, 40]; T.M.tries = [0, 8]; T.arcade.endHalf();
  ok($('br-pts').hidden, 'the full-time card shows no table points'); D.exitMatch();
  const c = cr.season; while (c.round < 5) { C.play(); T.M.half = 2; T.M.score = [0, 40]; T.M.tries = [0, 8]; T.arcade.endHalf(); D.exitMatch(); }
  const out = C.outcome(cr);
  ok(out.place === 6 || out.place >= 5, `last in a table nobody sees (${out.place})`);
  ok(out.promoted, 'and still moves up');
  C.renderEnd();
  ok($('ce-title').textContent === 'Moved Up' && !/Champions|1st|Place/.test($('ce-body').innerHTML), 'the end says so, with no place');
  C.advance();
  ok(cr.stage === 1, 'to Juniors');
  C.open(); ok(!$('cr-table').hidden && $('cr-title').textContent === 'Round 1 of 5', 'where the table is back');
  ok(/Full Contact/.test($('cr-line').textContent), 'and the hub says what changes');
  // the Hall of Fame leaves the festival out
  cr.history = [{ stage:0, name:'Farnham', place:1, up:true, w:5, d:0, l:0 }]; cr.stage = 4; cr.country = 'ENG'; C.newSeason(cr);
  const e = cr.season; e.results = e.fixtures.map(rd => rd.map(([h, a]) => ({ h, a, hs:0, as:0, ht:0, at:0 }))); e.round = 5;
  C.renderEnd();
  ok(!/>Minis</.test($('ce-body').innerHTML), 'the Hall of Fame has no Minis place');
  C.set(null); }
console.log(`Rules: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
