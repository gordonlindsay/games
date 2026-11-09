// Kids: the level below Easy (a flag on Easy, settings.kids), its levers, its hidden rating (settings.kidsR), and the grown-up check (parentGate).
// Every lever is on in a Kids match, off on Easy, and off in AI v AI, the demo, two player and practice (but Kicking and Driving) even when asked.
// The rating's scale, its update rule, its bounds, its save and its gating are section 13; tools/kidbots.mjs calibrates it with scripted children.
// node tools/kids.mjs   Exits 1 on any failure.
process.env.SEED ??= '29';
const { T, reseed, fire, kickBot, dropBot } = await import('./harness.mjs');
import fs from 'node:fs';
const K = T.kids, D = T.debug, X = T.teams, C = T.contact, KK = T.kick, STEP = T.STEP, inp = T.input;
const KIDS = K.KIDS, SCALE = K.KIDS_SCALE, ADAPT = K.KIDS_ADAPT, KIDS_GATE = K.KIDS_GATE, S = () => D.settings(), M = () => T.M, $ = id => document.getElementById(id);
let failed = 0, passed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } if (process.env.VERBOSE) console.log(cond ? 'ok  ' : 'FAIL', msg); };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const memory = {};
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; }, removeItem(k) { delete memory[k]; } };
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const play = (kids, o = {}) => T.newMatch(X.NATIONS[0], X.NATIONS[3], { halfLen:120, diff:0, headless:true, duels:'live', humans:[true, false], kids, ...o });
const quiet = () => { for (const i of T.inputs) { i.keys.clear(); i.jx = i.jy = 0; i.aPressed = i.bPressed = i.cPressed = false; i.aDown = i.bDown = i.cDown = false; i.flick = 0; } };
const run = (until, max, each) => { for (let n = 0; n < max; n++) { if (until()) return true; if (each) each(); T.update(STEP); } return until(); };

// 1. the setting: Kids | Easy | Normal | Hard on the home row, stored as a flag on Easy
{
  const s = S();
  ok(s.kids === false && !K.kidsLevel(), 'a new game is not on Kids');
  const row = html.match(/<div class="seg" data-key="diff">(.*?)<\/div>/)[1].match(/<button>([^<]+)<\/button>/g).map(b => b.replace(/<\/?button>/g, ''));
  ok(row.join() === 'Kids,Easy,Normal,Hard', `the Difficulty row reads ${row.join(' | ')}`);
  const want = [[true, 0], [false, 0], [false, 1], [false, 2]];
  for (let i = 0; i < 4; i++) {
    K.segSet(i);
    ok(s.kids === want[i][0] && s.diff === want[i][1] && K.segIndex() === i, `button ${i} (${row[i]}) stores kids ${want[i][0]}, diff ${want[i][1]}, and shows itself pressed`);
  }
  s.kids = true; s.diff = 2;
  ok(!K.kidsLevel() && K.segIndex() === 3, 'a hand-edited kids flag on Hard is just Hard');
  K.segSet(1);
  const seg = document.querySelectorAll('.seg[data-key]').find(g => g.dataset.key === 'diff');
  seg.children[0].click();
  ok(s.kids && s.diff === 0 && JSON.parse(memory['tryline.v1']).settings.kids === true, 'pressing Kids on the home row sets it and saves');
  seg.children[1].click();
  ok(K.gate() && s.kids && !$('m-gate').hidden, 'pressing Easy asks the grown-up check first, and the level has not moved');
  K.close(false);
  ok(!K.gate() && s.kids && s.diff === 0 && JSON.parse(memory['tryline.v1']).settings.kids === true, 'a cancelled check leaves it on Kids, in the save too');
  seg.children[1].click(); { const g = K.gate(); for (const d of g.answer) K.type(d); }
  ok(!K.gate() && !s.kids && s.diff === 0 && JSON.parse(memory['tryline.v1']).settings.kids === false, 'a right answer takes it off and saves');
  seg.children[0].click(); ok(!K.gate() && s.kids, 'going on to Kids needs no check'); K.segSet(1);
  ok(/if \(key === 'diff' && kidsLevel\(\) && i !== 0\) \{ parentGate\(/.test(fs.readFileSync(new URL('../src/ui-menus.js', import.meta.url), 'utf8')), 'every button but Kids goes through the check, and only while on Kids');
}

// 2. the save: a round trip, an old save, a partial and a bad one
{
  const s = S();
  K.segSet(0); X.save();
  const raw = JSON.parse(memory['tryline.v1']);
  ok(raw.settings.kids === true && raw.settings.diff === 0, 'Kids is saved as kids:true with diff 0');
  s.kids = false; s.diff = 2; X.load();
  ok(s.kids === true && s.diff === 0 && K.kidsLevel(), 'and loads back as Kids');
  X.restore({});
  ok(s.kids === true && s.diff === 0, 'a save with no settings leaves the level as it is');
  X.restore({ settings:{ kids:'yes', diff:0 } });
  ok(s.kids === true, 'a kids flag that is not true or false is ignored');
  X.restore({ settings:{ kids:false } });
  ok(s.kids === false && s.diff === 0, 'a partial save sets the flag alone');
  // an old save, written before Kids, on each level: it loads exactly as it did, and none of it is Kids
  for (const diff of [0, 1, 2]) {
    s.kids = false;
    const old = { settings:{ half:1, diff, sound:true, duels:true, hints:true, twoHints:[true, false], tut:['past'], coach:false, tips:['pass'], pool:2, twoDiff:[2, 0], played:5 }, champ:null, custom:[], champHistory:[], seasonSerial:3 };
    X.restore(JSON.parse(JSON.stringify(old)));
    const keep = Object.keys(old.settings).every(k => JSON.stringify(s[k]) === JSON.stringify(k === 'pool' ? 'fra' : old.settings[k]));   // its old list index 2 is France, now National · France (data.js, POOL_OLD)
    ok(keep && s.kids === false && !K.kidsLevel() && K.segIndex() === diff + 1, `an old save on ${['Easy', 'Normal', 'Hard'][diff]} loads unchanged, not as Kids`);
  }
  // the rating: a round trip, an old save, and anything that is not a number from 0 to 1 ignored
  ok(s.kidsR === 0, 'a new game\'s Kids rating is 0, the start');
  s.kidsR = 0.437; X.save(); s.kidsR = 0; X.load();
  ok(s.kidsR === 0.437 && JSON.parse(memory['tryline.v1']).settings.kidsR === 0.437, 'the rating is saved and loads back');
  for (const bad of ['0.5', -0.1, 1.5, null, true, [0.5], {}, 1e999]) { s.kidsR = 0.25; X.restore({ settings:{ kidsR:bad } }); ok(s.kidsR === 0.25, `a rating of ${typeof bad === "number" ? String(bad) : JSON.stringify(bad)} is ignored`); }
  X.restore({ settings:{ kidsR:0.12345 } }); ok(s.kidsR === 0.123, 'a rating is kept to three places');
  X.restore({ settings:{ kidsR:1 } }); ok(s.kidsR === 1, 'the ceiling, 1, is a rating');
  X.restore({ settings:{ kidsR:0 } }); ok(s.kidsR === 0, 'and so is the start, 0');
  for (const diff of [0, 1, 2]) {                          // a save from before the rating, onto a fresh game: it starts at 0
    s.kidsR = 0;
    X.restore({ settings:{ half:1, diff, sound:true, kids:diff === 0, played:5 }, champ:null, custom:[] });
    ok(s.kidsR === 0, `a save from before the rating, on ${diff ? ['Easy', 'Normal', 'Hard'][diff] : 'Kids'}, starts at 0`);
  }
  memory['tryline.v1'] = JSON.stringify({ settings:{ half:0, diff:1, sound:false, played:4 }, champ:null, custom:[] });
  s.kids = true; X.load();
  ok(s.kids === true && s.diff === 1 && !K.kidsLevel(), 'loading an old save over a Kids game keeps what it does not mention, and its Normal is Normal');
  s.kids = false; s.diff = 0;
}

// 3. who plays Kids: asked for, on Easy, one player; never AI v AI, the demo or two player (in practice only Kicking and Driving: together.mjs)
{
  play(true); ok(M().kids === true, 'a one-player Easy match asked to play Kids is Kids');
  play(false); ok(M().kids === false, 'a match not asked is not');
  play(true, { diff:1 }); ok(M().kids === false, 'Kids needs Easy underneath');
  T.newMatch(0, 1, { halfLen:60, diff:0, auto:true, headless:true, kids:true }); ok(M().kids === false, 'AI v AI is never Kids, even when asked');
  T.newMatch(0, 1, { halfLen:1e9, diff:0, auto:true, demo:true, kids:true }); ok(M().kids === false, 'the demo is never Kids');
  play(true, { humans:[true, true] }); ok(M().kids === false, 'two player is never Kids');
  play(true, { humans:[false, true] }); ok(M().kids === true, 'one player as the away side is Kids');
  const s = S();
  K.segSet(0); D.startMatch(X.CLUBS[0], X.CLUBS[1], false); ok(M().kids === true, 'startMatch plays the saved Kids level');
  D.startMatch(X.CLUBS[0], X.CLUBS[1], false, { two:true, levels:[0, 0] }); ok(M().kids === false, 'startMatch in two player does not');
  K.segSet(1); D.startMatch(X.CLUBS[0], X.CLUBS[1], false); ok(M().kids === false, 'startMatch on Easy does not');
  K.segSet(0); T.practice.start('defend'); ok(M().kids === false && s.kids === true, 'practice plays its own Easy, and keeps the Kids setting for after');
  T.practice.leave(); ok(s.kids === true && s.diff === 0, 'leaving practice puts Kids back');
  D.setTwo(false); D.exitMatch(); K.segSet(1);
}

// 4. AI v AI, the demo and practice draw exactly what they drew before: asking for Kids changes nothing there
{
  const runAuto = (kids, i) => { reseed(500 + i); T.newMatch(i % 6, (i + 2) % 6, { halfLen:45, diff:0, auto:true, headless:true, kids }); let n = 0; while (!M().over && n < 100000) { T.update(STEP); n++; } return JSON.stringify([M().score, M().tries, M().stats]); };
  let same = 0; for (let i = 0; i < 3; i++) if (runAuto(false, i) === runAuto(true, i)) same++;
  ok(same === 3, `AI v AI asked to play Kids plays the very same matches (${same}/3)`);
  const demo = kids => { reseed(77); T.newMatch(2, 4, { halfLen:1e9, diff:0, auto:true, demo:true, kids }); for (let n = 0; n < 3000; n++) T.update(STEP); return JSON.stringify(M().players.map(p => [p.x.toFixed(6), p.y.toFixed(6)])); };
  ok(demo(false) === demo(true), 'the demo too');
}

// 5. the other side's terms: slower, weaker in the tackle, less often intercepting or turning it over, soft at set pieces
{
  play(false); const easy = K.diffOf(1), cpuE = T.contact.maxSpeed(M().players[10]);
  play(true); const kids = K.diffOf(1), cpuK = T.contact.maxSpeed(M().players[10]), mine = T.contact.maxSpeed(M().players[3]);
  ok(kids === KIDS.diff && easy !== KIDS.diff, 'a Kids match reads KIDS.diff, an Easy one DIFF[0]');
  ok(kids.cpuSpeed < easy.cpuSpeed - 0.04 && kids.cpuTackle < easy.cpuTackle - 0.1 && kids.cpuIntercept < easy.cpuIntercept && kids.turnover < easy.turnover && kids.scrumCpu < easy.scrumCpu && kids.lineContest < easy.lineContest && kids.lineSigma > easy.lineSigma,
    `Kids: CPU pace ${kids.cpuSpeed} (Easy ${easy.cpuSpeed}), tackle ${kids.cpuTackle} (${easy.cpuTackle}), intercept ${kids.cpuIntercept} (${easy.cpuIntercept}), turnover edge ${kids.turnover} (${easy.turnover}), scrum ${kids.scrumCpu} (${easy.scrumCpu}), lineout contest ${kids.lineContest} (${easy.lineContest})`);
  ok(kids.myTackle === easy.myTackle, 'your own AI teammates tackle as on Easy');
  ok(near(cpuK/cpuE, KIDS.diff.cpuSpeed/easy.cpuSpeed, 1e-9), `the CPU runs at ${(100*cpuK/cpuE).toFixed(1)}% of its Easy pace`);
  play(false); ok(near(T.contact.maxSpeed(M().players[3]), mine), 'your own men run as on Easy');
  T.newMatch(0, 3, { halfLen:60, diff:0, auto:true, headless:true, kids:true });
  ok(K.diffOf(0) !== KIDS.diff && K.diffOf(1) !== KIDS.diff, 'AI v AI reads the plain levels');
  // the tackle odds: the CPU's tackle on your carrier, your ringed man's contact tackle and dive, your AI teammates
  const P = () => M().players, odds = (q, c, mode) => C.tackleChance(q, c, mode, false);
  const at = () => { const p = P(); p[3].x = 60; p[3].y = 35; p[10].x = 61; p[10].y = 35; p[2].x = 60; p[2].y = 30; p[11].x = 61; p[11].y = 30; };
  play(false); at(); T.sides.setCtrl(0, P()[3]);
  const eCpu = odds(P()[10], P()[3], 'ai'), eMine = odds(P()[3], P()[10], 'contact'), eDive = odds(P()[3], P()[10], 'dive'), eMate = odds(P()[2], P()[11], 'ai');
  play(true); at(); T.sides.setCtrl(0, P()[3]);
  const kCpu = odds(P()[10], P()[3], 'ai'), kMine = odds(P()[3], P()[10], 'contact'), kDive = odds(P()[3], P()[10], 'dive'), kMate = odds(P()[2], P()[11], 'ai');
  ok(near(eCpu - kCpu, easy.cpuTackle - KIDS.diff.cpuTackle, 1e-9), `the CPU's tackle on your carrier: ${eCpu.toFixed(2)} on Easy, ${kCpu.toFixed(2)} on Kids`);
  ok(near(kMine - eMine, KIDS.tackle, 1e-9) && near(kDive - eDive, KIDS.tackle, 1e-9), `your ringed man's contact tackle ${eMine.toFixed(2)} to ${kMine.toFixed(2)}, his dive ${eDive.toFixed(2)} to ${kDive.toFixed(2)}`);
  ok(near(kMate, eMate), 'your AI teammates\' tackle is Easy\'s');
}

// 6. your side's hands: catches, the ball in the tackle, offloads and passes
{
  const knocks = (kids, team, n) => {
    play(kids); const p = M().players[team ? 9 : 2]; let k = 0;
    for (let i = 0; i < n; i++) { M().phase = 'play'; M().hooter = false; const before = M().stats.knocks; M().ball.f = { kind:'kick', team:1 - team }; K.catchBall(p, 'kick'); if (M().stats.knocks > before) k++; }
    return k/n;
  };
  const N = 4000, eY = knocks(false, 0, N), kY = knocks(true, 0, N), eC = knocks(false, 1, N), kC = knocks(true, 1, N);
  ok(kY < eY*0.25 && eY > 0.05, `your side knocks on catching a kick ${(100*kY).toFixed(1)}% on Kids, ${(100*eY).toFixed(1)}% on Easy`);
  ok(Math.abs(kC - eC) < 0.03, `the CPU's catching is untouched (${(100*kC).toFixed(1)}% v ${(100*eC).toFixed(1)}%)`);
  T.newMatch(0, 3, { halfLen:60, diff:0, auto:true, headless:true, kids:true });
  { const p = M().players[2]; let k = 0; for (let i = 0; i < N; i++) { M().phase = 'play'; M().hooter = false; const b = M().stats.knocks; K.catchBall(p, 'kick'); if (M().stats.knocks > b) k++; } ok(Math.abs(k/N - eY) < 0.03, `AI v AI catches as Easy does (${(100*k/N).toFixed(1)}%)`); }
  // the ball jolted loose when your carrier is tackled, and your offloads
  const contact = (kids, n, after) => {
    play(kids); let jolts = 0, made = 0, offs = 0, tries = 0;
    for (let i = 0; i < n; i++) {
      const p = M().players, c = p[3], q = p[10], r = p[2];
      M().phase = 'play'; M().set = null; M().hooter = false; M().contact = null;
      for (const x of p) { x.down = 0; x.tcd = 0; x.bind = null; x.offside = 0; x.vx = x.vy = 0; x.x = x.team ? 100 : 20; x.y = 10 + (p.indexOf(x) % 7)*8; }
      c.x = 60; c.y = 35; c.vx = 6; q.x = 61; q.y = 35; r.x = 55; r.y = 40;
      T.sides.setCtrl(0, c); M().ball.state = 'held'; M().ball.carrier = c; c.hold = 1;
      const j0 = M().stats.jolts || 0, o0 = M().stats.offloads || 0;
      const k = C.commitTackle(q, c, 'ai');
      if (k.tier === 'broken') continue;
      made++;
      if (after === 'offload') { if (k.tier === 'dom' || !C.canOffload(k)) continue; tries++; C.offload(k, true); if ((M().stats.offloads || 0) > o0) offs++; continue; }
      C.resolveContact(k); if ((M().stats.jolts || 0) > j0) jolts++;
    }
    return { jolt:jolts/Math.max(1, made), off:offs/Math.max(1, tries), tries };
  };
  const eJ = contact(false, 6000).jolt, kJ = contact(true, 6000).jolt;
  ok(kJ < eJ*0.4 && eJ > 0.01, `the ball is jolted loose from your tackled carrier ${(100*kJ).toFixed(2)}% on Kids, ${(100*eJ).toFixed(2)}% on Easy`);
  const eO = contact(false, 1500, 'offload'), kO = contact(true, 1500, 'offload');
  ok(kO.off > 0.9 && eO.off < 0.85 && kO.tries > 100 && eO.tries > 100, `your offloads get away ${(100*kO.off).toFixed(0)}% on Kids, ${(100*eO.off).toFixed(0)}% on Easy (${kO.tries} and ${eO.tries} tried)`);
  // pass error: the spread of where a pass is aimed
  const spread = (kids, team) => {
    play(kids); const p = M().players, from = team ? p[10] : p[3], to = team ? p[11] : p[2]; let s2 = 0; const n = 3000;
    for (let i = 0; i < n; i++) {
      from.x = 60; from.y = 35; from.vx = team ? -6 : 6; from.vy = 0; to.x = team ? 64 : 56; to.y = 42; to.vx = team ? -6 : 6; to.vy = 0;
      M().ball.state = 'held'; M().ball.carrier = from; M().ball.x = 60; M().ball.y = 35;
      C.doPass(from, to); const f = M().ball.f, aim = C.leadPass(from, to, {});
      s2 += (f.y1 - aim.y)**2;
    }
    return Math.sqrt(s2/n);
  };
  const eS = spread(false, 0), kS = spread(true, 0), eSc = spread(false, 1), kSc = spread(true, 1);
  ok(Math.abs(kS/eS - KIDS.passErr) < 0.08, `your passes stray ${kS.toFixed(2)}m on Kids, ${eS.toFixed(2)}m on Easy`);
  ok(Math.abs(kSc/eSc - 1) < 0.08, `the CPU's passes are untouched (${kSc.toFixed(2)}m v ${eSc.toFixed(2)}m)`);
}

// 7. close-ups: the window is longer, any press acts, and a duel is never lost
{
  const duel = (kids, kind, press) => {
    play(kids); quiet(); D.setMode('match'); const c = T.forceDuel(kind);
    let pressed = false;
    run(() => c.res != null, 600, () => { quiet(); if (press && !pressed && c.t >= press.at(c)) { pressed = true; press.go(c); } });
    run(() => M().phase !== 'cut', 600);
    return c;
  };
  play(false); quiet(); const wE = T.forceDuel('past').wid; play(true); quiet(); const wK = T.forceDuel('past').wid;
  ok(near(wK - wE, KIDS.duelWin, 1e-9), `the gold ring is open ${wE.toFixed(2)}s on Easy, ${wK.toFixed(2)}s on Kids`);
  for (const kind of ['past', 'pass', 'tackle', 'block']) {
    const none = duel(true, kind, null), easy = duel(false, kind, null);
    const good = ['break', 'drawn', 'sold', 'bighit', 'intercept', 'knock'];
    ok(none.res === 'ok' && good.includes(none.out), `${kind}: no press at all on Kids still comes off (${none.res}, ${none.out})`);
    ok(easy.res === 'late' && !good.includes(easy.out), `${kind}: no press on Easy is late, and not won (${easy.out})`);
    const early = duel(true, kind, { at:() => 0.32, go:() => { inp.aPressed = true; } });
    ok(early.res === 'ok' && good.includes(early.out), `${kind}: an early press on Kids still comes off (${early.out})`);
    const gold = duel(true, kind, { at:c => c.centre - 0.5*STEP, go:c => { if (c.kind === 'past') inp.flick = c.open; else if (c.kind === 'pass') { if (c.drift) inp.bPressed = true; else inp.aPressed = true; } else inp.aPressed = true; } });
    ok(gold.res === 'perfect' && good.includes(gold.out), `${kind}: a press in the gold on Kids is a Perfect (${gold.res}, ${gold.out})`);
  }
  const wrong = duel(true, 'past', { at:c => c.centre, go:c => { inp.flick = -c.open; } });
  ok(wrong.out === 'break', 'Get Past the wrong way on Kids still breaks the line');
  const btn = duel(true, 'past', { at:c => c.centre - 0.5*STEP, go:() => { inp.bPressed = true; } });
  ok(btn.res === 'perfect' && btn.out === 'break', 'a button in a Get Past acts on Kids (a flick is not needed)');
  const btnE = duel(false, 'past', { at:c => c.centre - 0.5*STEP, go:() => { inp.bPressed = true; } });
  ok(btnE.res === 'late', 'and does nothing on Easy');
  D.setMode('menu');
}

// 8. goal kicks: a wider band and a slower meter about the same centre, the aim set, a release in the gold struck true
{
  const SPOTS = [[96, 35], [96, 12], [85, 58], [80, 35], [72, 20], [100, 5]];
  let wide = 0, slow = 0, scored = 0, total = 0, cpu = 0, path = 0;
  for (const [x, y] of SPOTS) for (const mph of [0, 8, 16]) {
    play(false); M().wind = { ...M().wind, mph }; const W = M().wind; reseed(900 + x + y + mph); const gE = KK.makeGoal(0, x, y, 'conversion'); reseed(900 + x + y + mph); const cE = KK.makeGoal(1, 120 - x, y, 'conversion');
    play(true); M().wind = { ...W }; reseed(900 + x + y + mph); const gK = KK.makeGoal(0, x, y, 'conversion'); reseed(900 + x + y + mph); const cK = KK.makeGoal(1, 120 - x, y, 'conversion');
    if (near(gK.w, Math.min(gE.w*KIDS.kick.band, KIDS.kick.bandMax)) && near(gK.ctr, gE.ctr) && gK.lo < gE.lo && gK.hi >= Math.min(1, gE.hi)) wide++;
    if (near(gK.fill, gE.fill*KIDS.kick.fill)) slow++;
    if (gK.aid === 'path') path++;
    if (cK.w === cE.w && cK.fill === cE.fill && cK.cpu.m === cE.cpu.m && cK.cpu.aim === cE.cpu.aim) cpu++;
    for (const m of [gK.lo + 1e-4, gK.ctr, gK.hi - 1e-4]) { total++; const g = { ...gK }; KK.strikeGoal(g, K.strike(g, m), g.aim); if (g.ok && g.grade === 'Pure Strike') scored++; }
  }
  const n = SPOTS.length*3;
  ok(wide === n, `the gold band is ${KIDS.kick.band}x as wide (at most ${KIDS.kick.bandMax}) about the same centre (${wide}/${n})`);
  ok(slow === n, `the meter fills ${KIDS.kick.fill}x slower (${slow}/${n})`);
  ok(path === n, 'Kids always has the path');
  ok(scored === total, `a release anywhere in the gold scores, a Pure Strike, in any wind (${scored}/${total})`);
  ok(cpu === n, 'the CPU\'s kicks are its own: band, meter and strike untouched');
  play(false); const gE = KK.makeGoal(0, 90, 20, 'conversion'); ok(K.strike(gE, gE.lo + 0.001) === gE.lo + 0.001, 'Easy strikes at the meter, wherever it is');
  play(true); const g = KK.makeGoal(0, 90, 20, 'conversion'), a0 = g.aim; inp.jx = 1; K.steerAim(g, 0.5, inp); inp.jx = 0;
  ok(g.aim === a0, 'the stick does not move the Kids aim');
  play(false); const g2 = KK.makeGoal(0, 90, 20, 'conversion'), b0 = g2.aim; inp.jx = 1; K.steerAim(g2, 0.5, inp); inp.jx = 0;
  ok(g2.aim > b0, 'it does on Easy');
  // the hint card and the tutorial say nothing about steering on Kids, and read as before on Easy
  const words = kids => {
    play(kids); quiet(); D.setMode('match'); D.goalKick(0, 90, 25, 'conversion'); run(() => M().cut.t > 0.5, 100);
    const h = D.hintFor(0); M().cut = null; M().phase = 'play';
    return { card:h && h.rows.map(r => r.text).join(' / '), goal:D.tutCards('goal', 0)[1][1], drop:D.tutCards('drop', 0)[1][1] };
  };
  const wK = words(true), wE = words(false);
  ok(wK.card === 'Hold It' && !/Steer/.test(wK.goal + wK.drop) && /Let Go in the Gold/.test(wK.goal), `Kids: the kick card reads "${wK.card}", the tutorial "${wK.goal}"`);
  ok(wE.card === 'Steer the Arrow / Hold It' && /^Steer With /.test(wE.goal) && /, Steer With .*, Let Go/.test(wE.drop), `Easy: "${wE.card}", "${wE.goal}"`);
  // the live close-up, through the real input path: a release just inside the edge of the gold goes over
  let live = 0;
  for (const [x, y] of SPOTS) {
    play(true); quiet(); D.setMode('match');
    D.goalKick(0, x, y, 'conversion'); const c = M().cut, gg = c.g;
    run(() => gg.res != null, 3000, () => kickBot(c, { m:gg.lo + 0.01, aim:gg.aim }));
    run(() => gg.judged, 3000);
    if (gg.ok) live++;
  }
  ok(live === SPOTS.length, `live Kids conversions released at the gold's low edge all score (${live}/${SPOTS.length})`);
  // drop goals: the chargers run at KIDS.kick.rush of their Easy pace
  const rush = kids => { play(kids); quiet(); const c = KK.stageDrop({ x:85, y:35 }, [{ x:92, y:35, vx:-6 }]), r = KK.rushersOf(c, KK.goalOf(0, c.x, c.y, 'drop', c, KK.windNow(0)))[0]; return r.vmax/T.contact.maxSpeed(r.q); };
  ok(near(rush(true)/rush(false), KIDS.kick.rush, 1e-9), `drop-goal chargers run at ${100*KIDS.kick.rush}% of the pace they would charge at on Easy`);
  let drops = 0;
  for (let i = 0; i < 6; i++) {
    play(true); quiet(); D.setMode('match'); KK.stageDrop({ x:84 - i, y:30 + i }, [{ x:96, y:33, vx:-7 }, { x:95, y:40, vx:-7 }]);
    inp.bPressed = true; inp.bDown = true;
    if (!run(() => M().phase === 'cut', 30)) continue;
    const cut = M().cut, gg = cut.g;
    run(() => gg.out || gg.stage === 'flight', 3000, () => dropBot(cut, { m:gg.ctr, aim:gg.aim }));
    inp.bDown = false;
    run(() => gg.judged || gg.out, 3000);
    if (gg.ok) drops++;
  }
  ok(drops >= 5, `Kids drop goals from 25m with two men charging go over (${drops}/6)`);
  D.setMode('menu');
}

// 9. set pieces: your pack's shove and your jumper's reach
{
  play(false); K.startScrum({ team:0, x:60, y:35 }); const sE = M().cut.base[0];
  play(true); K.startScrum({ team:0, x:60, y:35 }); const sK = M().cut.base[0];
  ok(near(sK - sE, KIDS.scrum, 1e-9), `your pack's own shove: ${sE.toFixed(2)} on Easy, ${sK.toFixed(2)} on Kids`);
  play(false); reseed(41); K.startLineout({ team:0, x:60, y:8 }); const lE = M().cut.reach.slice();
  play(true); reseed(41); K.startLineout({ team:0, x:60, y:8 }); const lK = M().cut.reach.slice();
  ok(near(lK[0] - lE[0], KIDS.reach, 1e-9) && near(lK[1], lE[1], 1e-12), `your jumper reaches ${KIDS.reach}m higher, theirs no different`);
  M().cut = null; M().phase = 'play';
}

// 10. defending: the ring finds your best defender, and a man you let go of chases on his own
{
  const stage = kids => {
    play(kids); quiet(); D.setMode('match');
    const p = M().players; M().phase = 'play'; M().set = null; M().clock = 30;
    for (const x of p) { x.vx = x.vy = 0; x.down = 0; x.tcd = 0; x.offside = 0; x.x = x.team ? 100 : 15; x.y = 6 + (p.indexOf(x) % 7)*9; }
    const c = p[10]; c.x = 60; c.y = 35; c.vx = -5;
    p[3].x = 75; p[3].y = 35;                                // your ringed man, beaten: 15m behind the carrier
    p[2].x = 45; p[2].y = 38;                                // a teammate in front of him, 15m off
    T.sides.setCtrl(0, p[3]); M().ball.state = 'held'; M().ball.carrier = c; M().ball.f = null; M().ball.x = c.x; M().ball.y = c.y; M().poss = 1; c.hold = 0;
    for (const s of M().side) { s.ctrlPrev = s.ctrl; s.ctrlT = 1; }
    return p;
  };
  let p = stage(true); T.update(STEP);
  ok(T.sides.ctrlOf(0) === p[2] && M().stats.kidsSwitch === 1, 'Kids: the ring leaves your beaten man for the one in front of the carrier');
  for (let i = 0; i < 30; i++) T.update(STEP);
  ok(T.sides.ctrlOf(0) === p[2] && M().stats.kidsSwitch === 1, 'and stays on him, with no flicking back and forth');
  p = stage(false); for (let i = 0; i < 20; i++) T.update(STEP);
  ok(T.sides.ctrlOf(0) === p[3], 'Easy leaves the ring where it is');
  p = stage(true); M().side[0].ctrlT = 0; T.update(STEP);
  ok(T.sides.ctrlOf(0) === p[3], `the ring stays put for its first ${KIDS.switchHold}s on a man`);
  {                                                        // your ringed man commits a tackle with a teammate as near the carrier: the ring stays on him until it ends, so a dominant one is his Big Hit
    let made = 0, left = 0, doms = 0, big = 0, praised = 0;
    for (let i = 0; i < 200 && doms < 3; i++) {
      const p = stage(true), c = p[10], q = p[3];
      q.x = 59; q.y = 35; p[2].x = 64; p[2].y = 38;
      for (const s of M().side) s.ctrlT = 1;
      const k = C.commitTackle(q, c, 'contact'); if (!k || k.tier === 'broken') continue;
      made++; const b0 = M().stats['tag_Big Hit'] || 0;
      for (let n = 0; n < 120 && M().contact; n++) { T.update(STEP); if (M().contact && T.sides.ctrlOf(0) !== q) { left++; break; } }
      if (k.tier === 'dom') { doms++; if ((M().stats['tag_Stopped'] || 0) > b0) big++; if ((M().stats['tag_Big Hit'] || 0) || M().stop > 0) praised++; }
    }
    ok(made > 0 && left === 0, `Kids: the ring stays on your man while he is bound in his tackle (it left him in ${left} of ${made})`);
    ok(doms > 0 && big === doms && !praised, `so your dominant tackle reads Stopped, with no Big Hit and no hit-stop (${big} of ${doms}, ${praised} praised)`);
  }
  // the stick let go: your ringed man closes on the carrier
  const chase = (kids, jx, jy) => {                        // how far the man in the ring runs in a third of a second, and how much of it is toward the carrier
    const p = stage(kids); T.sides.setCtrl(0, p[2]); for (const s of M().side) { s.ctrlPrev = s.ctrl; s.ctrlT = 0; }
    const x0 = p[2].x, y0 = p[2].y, ux = p[10].x - x0, uy = p[10].y - y0, u = Math.hypot(ux, uy);
    for (let i = 0; i < 20; i++) { inp.jx = jx; inp.jy = jy; T.update(STEP); }
    quiet();
    const dx = p[2].x - x0, dy = p[2].y - y0;
    return { moved:Math.hypot(dx, dy), toward:(dx*ux + dy*uy)/u };
  };
  const cK = chase(true, 0, 0), cE = chase(false, 0, 0), cS = chase(true, 0, 1);
  ok(cK.moved > 0.5 && cK.toward > 0.95*cK.moved, `Kids: let go of the stick and your man chases the carrier (${cK.moved.toFixed(2)}m)`);
  ok(cE.moved < 0.05, `Easy: he stands (${cE.moved.toFixed(2)}m)`);
  ok(cS.moved > 0.5 && cS.toward < 0.5*cS.moved, `Kids with the stick held: the stick drives him (${cS.moved.toFixed(2)}m, ${cS.toward.toFixed(2)}m of it toward the carrier)`);
  T.newMatch(0, 3, { halfLen:60, diff:0, auto:true, headless:true, kids:true });
  ok(!K.kidsChase(M().players[3], inp, STEP), 'AI v AI has no chase');
  { // the promised chase holds through a CPU pass: the ringed man with the stick let go runs on to where it will land, and does not stop dead for the flight
    play(true); const m = T.M; m.phase = 'play'; m.set = null; m.cut = null; quiet();
    const cpu = m.players.filter(p => p.team === 1), me = m.players.find(p => p.team === 0);
    const from = cpu[0], to = cpu[1]; Object.assign(from, { x:60, y:35, vx:0, vy:0, hold:2 }); Object.assign(to, { x:66, y:26, vx:0, vy:0, down:0, bind:null }); Object.assign(me, { x:40, y:30, vx:6, vy:0, down:0, bind:null, offside:0 });
    T.sides.setCtrl(0, me); T.sides.setCarrier ? T.sides.setCarrier(from) : (m.ball.state = 'held', m.ball.carrier = from); m.ball.state = 'held'; m.ball.carrier = from;
    C.doPass(from, to, {}); const T0 = m.ball.f.T; let least = 9, n = 0;
    while (m.ball.state === 'air' && n++ < 400) { quiet(); T.update(STEP); least = Math.min(least, Math.hypot(me.vx, me.vy)); }
    ok(n > 10 && T0 > 0.3 && least > 3, 'Kids: the ringed man chases through a CPU pass with the stick let go (slowest ' + least.toFixed(2) + ' m/s over a ' + T0.toFixed(2) + 's flight)');
    play(true); const m2 = T.M; m2.phase = 'play'; m2.set = null; m2.cut = null; quiet();
    const own = m2.players.filter(p => p.team === 0), a = own[0], c = own[1], w = own[2]; Object.assign(a, { x:60, y:35, hold:2 }); Object.assign(c, { x:55, y:40 }); Object.assign(w, { x:40, y:10, vx:0, vy:0 });
    m2.ball.state = 'held'; m2.ball.carrier = a; C.doPass(a, c, {}); T.sides.setCtrl(0, w);
    ok(!K.kidsChase(w, inp, STEP), 'and your own side\'s pass is not something to chase');
  }
  D.setMode('menu');
}

// 11. the grown-up check
{
  const s = S(); let passes = 0, cancels = 0;
  const pass = () => passes++, cancel = () => cancels++;
  const words = n => K.KIDS_WORDS[n];
  K.parentGate(pass, cancel);
  let g = K.gate();
  ok(g && !$('m-gate').hidden && D.navLayer() === $('m-gate'), 'it opens over everything and is the controller\'s layer');
  ok(g.a >= 13 && g.a <= 19 && g.b >= 6 && g.b <= 9 && g.answer === String(g.a*g.b) && g.answer.length === 3, `a teen times six to nine with a three-figure answer (${g.a} x ${g.b})`);
  ok(K.KIDS_ASKS.length === 22 && K.KIDS_ASKS.every(([a, b]) => a >= 13 && a <= 19 && b >= 6 && b <= 9 && a*b >= 100 && a*b <= 999), `every question's answer has three figures (${K.KIDS_ASKS.length} questions, ${Math.min(...K.KIDS_ASKS.map(([a, b]) => a*b))} to ${Math.max(...K.KIDS_ASKS.map(([a, b]) => a*b))})`);
  ok($('pg-q').textContent === `What is ${words(g.a)} times ${words(g.b)}?` && !/[0-9]/.test($('pg-q').textContent), `written out in words: "${$('pg-q').textContent}"`);
  const wrong = g.answer.slice(0, -1) + ((+g.answer.slice(-1) + 1) % 10);
  for (const d of wrong) $('pg-k' + d).click();
  g = K.gate();
  ok(g && passes === 0 && !$('m-gate').hidden && g.typed === '' && $('pg-ans').textContent === 'Try Again', 'a wrong answer keeps it shut and asks again');
  $('pg-k' + g.answer[0]).click(); $('pg-del').click();
  ok(K.gate().typed === '', 'Delete takes a figure back');
  for (const d of g.answer) $('pg-k' + d).click();
  ok(passes === 1 && cancels === 0 && !K.gate() && $('m-gate').hidden && D.navLayer() !== $('m-gate'), 'the right answer on the number keys passes, once, and closes it');
  K.parentGate(pass, cancel); $('pg-cancel').click();
  ok(passes === 1 && cancels === 1 && $('m-gate').hidden, 'Cancel cancels');
  K.parentGate(pass, cancel); fire('keydown', { key:'Escape' });
  ok(cancels === 2 && !K.gate(), 'Escape cancels');
  K.parentGate(pass, cancel); g = K.gate();
  for (const d of g.answer) fire('keydown', { key:d });
  ok(passes === 2 && !K.gate(), 'the keyboard\'s figures answer it');
  K.parentGate(pass, cancel); g = K.gate(); fire('keydown', { key:g.answer[0] }); fire('keydown', { key:'Backspace' });
  ok(K.gate().typed === '', 'Backspace takes a figure back');
  K.parentGate(pass); ok(cancels === 3 && K.gate(), 'a second check cancels the first');
  K.close(false); ok(cancels === 3, 'a check with no onCancel just closes');
  let asks = new Set(); for (let i = 0; i < 200; i++) { K.parentGate(); asks.add(K.gate().a + 'x' + K.gate().b); K.close(false); }
  ok(asks.size > 18, `the questions vary (${asks.size} of the ${K.KIDS_ASKS.length} in 200)`);
  // Install Game asks first; Update Game (the game's own files, already downloaded) does not
  let installs = 0;
  fire('beforeinstallprompt', { preventDefault() {}, prompt() { installs++; return Promise.resolve(); }, userChoice:Promise.resolve({ outcome:'dismissed' }) });
  $('b-install').click();
  ok(installs === 0 && K.gate(), 'Install Game opens the grown-up check, not the browser\'s prompt');
  $('pg-cancel').click(); await Promise.resolve();
  ok(installs === 0, 'cancelled, nothing is installed');
  $('b-install').click(); g = K.gate(); for (const d of g.answer) $('pg-k' + d).click(); await Promise.resolve();
  ok(installs === 1, 'answered, the browser\'s install prompt opens');
  // two wrong answers in a row rest the keys; the rest outlives the card and doubles each time, to a minute, until a right answer
  const realTimeout = globalThis.setTimeout, timers = [];
  globalThis.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };   // the rests' timers, run by hand
  const typeAll = t => { for (const d of t) K.type(d); };
  const miss = () => typeAll(String(+K.gate().answer + 1));
  passes = cancels = 0;
  K.parentGate(pass, cancel); miss();
  ok(!K.rest() && timers.length === 0 && $('pg-ans').textContent === 'Try Again', 'one wrong answer: Try Again and a new question');
  miss();
  ok(K.rest() && timers.length === 1 && timers[0].ms === KIDS_GATE.rest && $('pg-ans').textContent === 'Wait' && $('m-gate').classList.contains('rest'), `a second wrong answer in a row rests the keys for ${KIDS_GATE.rest/1000}s`);
  g = K.gate(); typeAll(g.answer); $('pg-del').click();
  for (const d of g.answer) fire('keydown', { key:d });
  ok(passes === 0 && K.gate() && K.gate().typed === '', 'resting, the keys and the keyboard\'s figures do nothing, the right answer included');
  $('pg-cancel').click(); K.parentGate(pass, cancel); typeAll(K.gate().answer);
  ok(cancels === 1 && passes === 0 && K.rest() && $('pg-ans').textContent === 'Wait', 'Cancel still works, and opening the check again does not skip the rest');
  timers.shift().fn();
  ok(!K.rest() && $('pg-ans').textContent === '' && !$('m-gate').classList.contains('rest'), 'the rest over, the keys wake');
  const lens = [];
  for (let i = 0; i < 4; i++) { miss(); miss(); lens.push(timers[0] && timers[0].ms); timers.shift().fn(); }
  ok(lens.join() === '20000,40000,60000,60000', `each rest is twice the last, to a minute at most (${lens.join(', ')}ms)`);
  typeAll(K.gate().answer);
  ok(passes === 1 && !K.gate(), 'awake, the right answer passes');
  K.parentGate(pass, cancel); miss(); miss();
  ok(timers.length === 1 && timers[0].ms === KIDS_GATE.rest, 'and the rests start again from the first');
  timers.shift().fn(); K.close(false);
  ok(memory[K.GATE_KEY] === undefined, 'on the web the rest is kept in memory alone, as before');
  // in the app the rest also outlives the game: closing the app and opening it again comes back to the same wait
  {
    const realNow = Date.now; let now = 2e12; Date.now = () => now;
    globalThis.Capacitor = { isNativePlatform:() => true, Plugins:{} };
    const kept = () => JSON.parse(memory[K.GATE_KEY] || 'null');
    K.parentGate(pass, cancel); miss(); miss();
    const until = now + 2*KIDS_GATE.rest;
    ok(K.rest() && kept() && kept().until === until && kept().rests === 2, `in the app the rest is kept on the device as it starts (${memory[K.GATE_KEY]})`);
    K.close(false); now += 3000; K.relaunch();
    ok(K.rest() && K.rest().until === until && timers[timers.length - 1].ms === 2*KIDS_GATE.rest - 3000, 'a relaunch 3s later comes back to the same wait, ending when it would have');
    const p0 = passes;
    K.parentGate(pass, cancel); typeAll(K.gate().answer);
    ok(passes === p0 && K.gate() && $('pg-ans').textContent === 'Wait', 'and the keys still rest, the right answer included');
    timers.pop().fn();
    ok(!K.rest() && kept() && kept().until === 0 && kept().rests === 2, 'the rest over: the keys wake, and the count is still kept');
    K.close(false); K.relaunch(); K.parentGate(pass, cancel); miss(); miss();
    ok(timers[timers.length - 1].ms === 4*KIDS_GATE.rest, 'after another relaunch the next rest still doubles');
    now += 9e6; K.close(false); K.relaunch();
    ok(!K.rest(), 'a rest long over by the next start is not waited again');
    now -= 9e7; memory[K.GATE_KEY] = JSON.stringify({ until:now + 9e9, rests:3 }); K.relaunch();
    ok(K.rest() && K.rest().ms === KIDS_GATE.restMax, 'a clock put back never makes a rest longer than a minute');
    timers.pop().fn(); K.parentGate(pass, cancel); typeAll(K.gate().answer);
    ok(passes === p0 + 1 && memory[K.GATE_KEY] === undefined, 'a right answer clears what was kept');
    memory[K.GATE_KEY] = '{"until":'; K.relaunch();
    ok(!K.rest(), 'what was kept, cut short, is ignored');
    delete memory[K.GATE_KEY]; delete globalThis.Capacitor; Date.now = realNow; timers.length = 0; K.relaunch();
  }
  const tapping = (keyOf, taps) => {                       // a child tapping a tap a fifth of a second, opening the check again whenever it shuts, and waiting out every rest
    let passed = 0, t = 0;
    for (let i = 0; i < taps; i++) {
      if (!K.gate()) K.parentGate(() => passed++);
      K.type(keyOf(i)); t += 0.2;
      while (timers.length) { const r = timers.shift(); t += r.ms/1000; r.fn(); }
    }
    K.close(false); return { passed, t };
  };
  const nine0 = tapping(i => (i % 2 ? '0' : '9'), 3000);
  ok(nine0.passed === 0, `9 and 0 in turn for 3000 taps never passes (it did in about 100 when two-figure answers were in)`);
  const rnd10 = tapping(() => String(Math.floor(Math.random()*10)), 3000);
  ok(rnd10.t > 6*3600, `a thousand random guesses take ${(rnd10.t/3600).toFixed(1)} hours of rests (${rnd10.passed} passed)`);
  globalThis.setTimeout = realTimeout;
  // the first key's DOM focus is for the keyboard and touch; a controller gets the chalk ring alone, so only one key is outlined
  let focused = 0; $('pg-k1').focus = () => focused++;
  D.setDev('pad'); K.parentGate(pass, cancel);
  ok(focused === 0 && D.focus() === $('pg-k1'), 'opened from a controller: the ring on 1, and no DOM focus');
  K.close(false); D.setDev('touch'); K.parentGate(pass, cancel);
  ok(focused === 1 && D.focus() === null, 'opened by touch or the keyboard: the DOM focus on 1, for Tab and the screen reader');
  K.close(false); delete $('pg-k1').focus;
  const page = [{ id:'rotate', inert:false }, { id:'controls', inert:false }, $('m-gate')];   // the body's children, as parentGate walks them
  document.body = { children:page };
  K.parentGate(pass, cancel);
  ok(!page[0].inert && page[1].inert && !$('m-gate').inert, 'open, the page under it is inert, all but Turn Your Phone Sideways, which covers it on an upright phone');
  K.close(false);
  ok(!page[1].inert, 'shut, the page is live again');
  delete document.body;
}

// 12. kids-safe: no links out, no ads or analytics, and the privacy note
{
  const body = html.slice(html.indexOf('<body>'));
  ok(!/<a[\s>]/i.test(body) && !/href=/i.test(body), 'the page has no links to leave by');
  const ext = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map(m => new URL(m[1]).host);
  ok(ext.length === 0, `the page names no other site, Google Fonts included: its typefaces come with it (${[...new Set(ext)].join(', ') || 'none'})`);
  const game = fs.readFileSync(new URL('../game.js', import.meta.url), 'utf8');
  ok(!/sendBeacon|google-analytics|googletagmanager|gtag\(|doubleclick|adsbygoogle|facebook\.com|connect\.facebook\.net|fbq\(|mixpanel|segment\.io|amplitude/i.test(game), 'no analytics, ads or tracking in the game');
  const priv = fs.readFileSync(new URL('../PRIVACY.md', import.meta.url), 'utf8');
  ok(/no ads/i.test(priv) && /no analytics/i.test(priv) && /tracking/i.test(priv) && /tryline\.v1/.test(priv) && /photo/i.test(priv) && /contact details/i.test(priv) && /Google Fonts/.test(priv), 'PRIVACY.md says what is stored, that nothing is collected, and what import keeps');
  const gate = html.slice(html.indexOf('id="m-gate"'), html.indexOf('<section', html.indexOf('id="m-gate"')));   // the card, up to the next screen
  ok(!/—/.test(priv + gate) && !/[←-↙]/.test(gate), 'no em dashes or arrows in the new copy');
  ok(/>Ask a Grown-Up</.test(gate) && />Delete</.test(gate) && />Cancel</.test(gate) && /data-back/.test(gate), 'the card\'s labels are Title Case, and Cancel is its Back');
  ok((gate.match(/class="btn" id="pg-k[0-9]"/g) || []).length === 10, 'ten figure keys, each a button the controller reaches');
  const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8') + fs.readFileSync(new URL('../practice.css', import.meta.url), 'utf8');
  const z = sel => { let v = null; for (const m of css.matchAll(new RegExp('(?:^|[},\\s])' + sel.replace(/[.#]/g, '\\$&') + '\\{[^}]*z-index:(\\d+)', 'g'))) v = +m[1]; return v; };
  ok(z('.modal') < z('#m-practice') && z('#m-practice') < z('#m-gate') && z('#m-gate') < z('#rotate'), `the check is over every card and under Turn Your Phone Sideways (z ${z('.modal')}, ${z('#m-practice')}, ${z('#m-gate')}, ${z('#rotate')})`);
  ok(/@media \(max-width:560px\)\{\.pg-keys\{grid-template-columns:repeat\(5,/.test(css), 'on a narrow screen the figure keys are two rows of five');
}

// 13. the Kids rating: one hidden number r, 0 the start and 1 the ceiling, sets every lever on the scale; a completed match moves it
{
  const s = S();
  const flat = o => Object.entries(o).flatMap(([k, v]) => (Array.isArray(v) ? [[k, v]] : Object.entries(v).map(([j, w]) => [k + '.' + j, w])));
  const at = (k) => { const [a, b] = k.split('.'); return b ? KIDS[a][b] : KIDS[a]; };
  const levers = flat(SCALE);
  // the start is the Kids level as it was before the scale, lever for lever
  const was = { 'diff.cpuSpeed':0.92, 'diff.cpuTackle':0.45, 'diff.cpuIntercept':0.05, 'diff.turnover':-0.05, 'diff.scrumCpu':0.45, 'diff.lineSigma':0.28, 'diff.lineContest':0.35,
    tackle:0.10, hands:0.1, jolt:0.15, offload:0.95, passErr:0.4, duelWin:0.20, save:1, 'kick.band':2, 'kick.bandMax':0.34, 'kick.fill':1.6, 'kick.rush':0.65, scrum:0.25, reach:0.12 };
  ok(levers.length === Object.keys(was).length && levers.every(([k, v]) => v[0] === was[k]), `the scale starts where Kids was (${levers.length} levers)`);
  K.tune(0); ok(levers.every(([k, v]) => at(k) === v[0]), 'at r = 0 every lever is at its start');
  K.tune(1); ok(levers.every(([k, v]) => at(k) === v[1]), 'at r = 1 every lever is at its ceiling');
  K.tune(0.5); ok(levers.every(([k, v]) => near(at(k), (v[0] + v[1])/2, 1e-12)), 'and at 0.5, half way: a straight line');
  let mono = true;
  for (let i = 0; i < 10; i++) { K.tune(i/10); const lo = levers.map(([k]) => at(k)); K.tune((i + 1)/10); levers.forEach(([k, v], j) => { if (Math.sign(at(k) - lo[j]) !== Math.sign(v[1] - v[0])) mono = false; }); }
  ok(mono, 'every lever moves one way only, from its start to its ceiling, as r rises');
  K.tune(-1); const lo = levers.every(([k, v]) => at(k) === v[0]); K.tune(2); const hi = levers.every(([k, v]) => at(k) === v[1]); K.tune(NaN);
  ok(lo && hi && levers.every(([k, v]) => at(k) === v[0]), 'r below 0 is the start, above 1 the ceiling, and not a number the start');
  // the ceiling is still easier than Easy, lever for lever: about 80% of the way from the start
  const easy = { 'diff.cpuSpeed':0.97, 'diff.cpuTackle':0.56, 'diff.cpuIntercept':0.10, 'diff.turnover':-0.03, 'diff.scrumCpu':0.60, 'diff.lineSigma':0.19, 'diff.lineContest':0.55,
    tackle:0, hands:1, jolt:1, passErr:1, duelWin:0, save:0, 'kick.band':1, 'kick.bandMax':KK.KICK.bandMax, 'kick.fill':1, 'kick.rush':1, scrum:0, reach:0 };
  play(false); const dE = K.diffOf(1);
  ok(Object.keys(easy).filter(k => k.startsWith('diff.')).every(k => dE[k.slice(5)] === easy[k]), 'Easy\'s own levers are as this table has them');
  const way = Object.entries(easy).map(([k, e]) => { const v = SCALE[k.split('.')[0]], [a, b] = Array.isArray(v) ? v : v[k.split('.')[1]]; return [k, (b - a)/(e - a)]; });
  ok(way.every(([, f]) => f > 0.7 && f < 0.9), `each ceiling is 70 to 90% of the way from the start to Easy, never at Easy (${way.map(([k, f]) => k + ' ' + f.toFixed(2)).join(', ')})`);
  ok(SCALE.offload[1] >= 0.85 && SCALE.offload[1] < SCALE.offload[0], `an offload you press gets away ${100*SCALE.offload[1]}% at the ceiling, the top of Easy's 70 to 85%`);
  // the levers a match plays: the rating it was started at, or the start when nothing says
  play(true); ok(M().kidsR === 0 && KIDS.r === 0 && KIDS.diff.cpuSpeed === SCALE.diff.cpuSpeed[0], 'a Kids match not given a rating plays the start');
  play(true, { kidsR:0.6 }); ok(M().kidsR === 0.6 && near(KIDS.diff.cpuTackle, 0.4*SCALE.diff.cpuTackle[0] + 0.6*SCALE.diff.cpuTackle[1], 1e-12) && K.diffOf(1) === KIDS.diff, 'one given r = 0.6 plays the levers at 0.6');
  play(true, { kidsR:1 }); const cpuK = T.contact.maxSpeed(M().players[10]); play(false); const cpuE = T.contact.maxSpeed(M().players[10]);
  ok(cpuK < cpuE && near(cpuK/cpuE, SCALE.diff.cpuSpeed[1]/0.97, 1e-9), `at the ceiling the CPU still runs a little slower than on Easy (${(100*cpuK/cpuE).toFixed(1)}%)`);
  play(false, { kidsR:0.6 }); ok(M().kidsR == null && K.diffOf(1) !== KIDS.diff && K.diffOf(1).cpuSpeed === 0.97, 'an Easy match given a rating ignores it');
  T.newMatch(0, 3, { halfLen:60, diff:0, auto:true, headless:true, kids:true, kidsR:1 }); ok(!M().kids && M().kidsR == null, 'AI v AI given a rating ignores it');
  s.kidsR = 0.7; K.segSet(0);
  D.startMatch(X.CLUBS[0], X.CLUBS[1], false); ok(M().kids && M().kidsR === 0.7, 'Quick Match plays the child\'s own rating');
  X.setChamp(null); X.newChamp(X.NATIONS[0], X.NATIONS.slice(1));
  { const c = X.champ(), opp = c.fixtures[0].find(p => p.includes(c.user)).find(i => i !== c.user); D.startMatch(c.teams[c.user], c.teams[opp], true); }
  ok(M().kids && M().champ && M().kidsR === 0.7, 'so does a Championship match');
  const cr = T.career.create({ pos:'B', num:5, club:X.CLUBS[0] }); T.career.set(cr); T.career.play();
  ok(M().kids && M().career && M().kidsR === 0.7, 'and a Career match: one rating for all three');
  D.exitMatch(); T.career.set(null); X.setChamp(null);
  T.practice.start('kick'); ok(M().kids && M().kidsR === 0 && KIDS.kick.band === SCALE.kick.band[0] && KIDS.scrum === SCALE.scrum[0], 'the Kicking drill keeps the help it always had (r = 0 whatever the child\'s rating)'); T.practice.leave();
  T.practice.start('scrum'); ok(!T.practice.state(), 'Driving is a contact game, which the Kids level never reaches (PR #14\'s rule; it kept its Kids help here before)'); T.practice.leave();
  ok(s.kidsR === 0.7, 'and a drill leaves the rating alone');
  // the close-ups: a mistake comes off KIDS.save of the time (always at the start), and a press in the gold is still a Perfect
  const lost = (r, n) => { let off = 0; for (let i = 0; i < n; i++) { play(true, { kidsR:r }); quiet(); D.setMode('match'); const c = T.forceDuel('past'); run(() => c.res != null, 600, quiet); if (c.res === 'ok' || c.res === 'perfect') off++; run(() => M().phase !== 'cut', 600); } D.setMode('menu'); return off/n; };
  const off0 = lost(0, 20), off1 = lost(1, 120);
  ok(off0 === 1, 'at the start a Get Past with no press at all always comes off');
  ok(Math.abs(off1 - SCALE.save[1]) < 0.1, `at the ceiling ${(100*off1).toFixed(0)}% of them do (save ${SCALE.save[1]})`);
  play(true, { kidsR:1 }); quiet(); D.setMode('match');
  { const c = T.forceDuel('tackle'); let pressed = false; run(() => c.res != null, 600, () => { quiet(); if (!pressed && c.t >= c.centre - 0.5*STEP) { pressed = true; inp.aPressed = true; } }); ok(c.res === 'perfect' && c.out === 'bighit', `at the ceiling a press in the gold is a Perfect (${c.res}, ${c.out})`); run(() => M().phase !== 'cut', 600); }
  D.setMode('menu');
  // the update rule: a fixed step up or down by the result in the child's side's points and tries, the same size anywhere on the scale
  const st = (us, them, tu, tt, h = 0) => K.step(h ? [them, us] : [us, them], h ? [tt, tu] : [tu, tt], h);
  ok(st(35, 0, 5, 0) === ADAPT.raise && st(28, 7, 4, 0) === ADAPT.raise && ADAPT.raise > 0, `a win by more than ${ADAPT.big} tries raises it (+${ADAPT.raise})`);
  ok(st(21, 0, 3, 0) === ADAPT.nudge && st(7, 0, 1, 0) === ADAPT.nudge && st(8, 5, 1, 1) === ADAPT.nudge && ADAPT.nudge > 0 && ADAPT.nudge < ADAPT.raise, `a narrower win nudges it up (+${ADAPT.nudge}), a win on a kick included`);
  ok(st(7, 7, 1, 1) === ADAPT.draw && ADAPT.draw <= 0 && ADAPT.draw > ADAPT.lose, `a draw holds or eases it (${ADAPT.draw})`);
  ok(st(5, 7, 1, 1) === ADAPT.lose && st(0, 7, 0, 1) === ADAPT.lose && st(0, 14, 0, 2) === ADAPT.heavy && ADAPT.lose < 0 && ADAPT.heavy < ADAPT.lose, `a loss lowers it (${ADAPT.lose}; ${ADAPT.heavy} by two tries or more)`);
  ok(st(35, 0, 5, 0, 1) === ADAPT.raise && st(0, 14, 0, 2, 1) === ADAPT.heavy, 'the child playing the away side is read from his own side');
  const nx = (r, us, them, tu, tt) => K.next(r, [us, them], [tu, tt]);
  const results = [[50, 0, 7, 0], [7, 0, 1, 0], [7, 7, 1, 1], [0, 7, 0, 1], [0, 50, 0, 7]], steps = results.map(([a, b, c, d]) => st(a, b, c, d));
  let same = true, worst = 0;
  for (let i = 0; i <= 1000; i++) results.forEach(([a, b, c, d], j) => { const r = i/1000, v = nx(r, a, b, c, d); worst = Math.max(worst, Math.abs(v - r)); if (!near(v, Math.min(1, Math.max(0, r + steps[j])), 1e-9)) same = false; });
  ok(same, 'every result moves it by its own step wherever it is on the scale, the start and the ceiling only stopping it');
  ok(nx(0.1, 0, 7, 0, 1) < 0.1 && near(0.1 - nx(0.1, 0, 7, 0, 1), 0.9 - nx(0.9, 0, 7, 0, 1), 1e-9) && near(nx(0.1, 0, 50, 0, 7), 0.1 + ADAPT.heavy, 1e-9), `near the start a loss takes it down as far as near the top (0.1 to ${nx(0.1, 0, 7, 0, 1)}; the old rule, a share of the way, barely moved it there and not at all at 0)`);
  ok(nx(0, 0, 50, 0, 7) === 0 && nx(0, 7, 0, 1, 0) === ADAPT.nudge, 'at the start a loss leaves it there and a win lifts it');
  ok(worst <= 0.1 + 1e-9, `no one match moves it more than a tenth of the scale (${worst.toFixed(3)})`);
  let r = 0; const climb = []; for (let i = 0; i < 30; i++) { climb.push(r); r = nx(r, 50, 0, 7, 0); }
  const top = Math.ceil(1/ADAPT.raise - 1e-9);
  ok(climb[top] === 1 && climb[top - 1] < 1 && climb.slice(1, top).every((v, i) => near(v - climb[i], ADAPT.raise, 1e-9)), `big wins in a row from the start: ${climb[5].toFixed(2)} after 5, the ceiling after ${top}, in equal steps`);
  const walk = (r0, seq, n) => { let v = r0; for (let i = 0; i < n; i++) v = nx(v, ...seq[i % seq.length]); return v; };
  ok(walk(0.8, [[7, 0, 1, 0], [0, 7, 0, 1]], 60) === 0, 'a child who loses every other match by a try, winning the rest narrowly, goes back to the start');
  ok(walk(0.6, [[28, 0, 4, 0], [21, 7, 3, 1], [7, 7, 1, 1], [0, 14, 0, 2]], 80) === 0, 'and so does one who loses one in four heavily and draws one, even winning one of the others big');
  ok(walk(0, [[35, 0, 5, 0], [35, 0, 5, 0], [14, 7, 2, 1], [0, 7, 0, 1]], 120) > 0.9, 'one who wins two in four by more than 3 tries and a third narrowly climbs to the top even losing the fourth');
  ok(nx(1, 50, 0, 7, 0) === 1 && nx(0, 0, 50, 0, 7) === 0 && near(nx(2, 7, 7, 1, 1), 1 + ADAPT.draw, 1e-9) && nx(-1, 7, 0, 1, 0) === ADAPT.nudge, 'it stays between 0 and 1');
  ok(nx(0.1234567, 0, 7, 0, 1) === Math.round((0.1234567 + ADAPT.lose)*1000)/1000 && nx(NaN, 7, 0, 1, 0) === ADAPT.nudge, 'it is kept to three places, and a rating that is not a number starts again from 0');
  // who moves it: full time in a one-player Kids match, once; never a match left early, practice, Easy, AI v AI, the demo or two player
  const full = (us, them, tu, tt) => { const m = M(); m.half = 2; m.score = [us, them]; m.tries = [tu, tt]; T.arcade.endHalf(); return m; };
  s.kidsR = 0.4; K.segSet(0); D.startMatch(X.CLUBS[0], X.CLUBS[1], false); let m = full(35, 0, 5, 0);
  ok(m.over && near(s.kidsR, 0.4 + ADAPT.raise, 1e-9) && JSON.parse(memory['tryline.v1']).settings.kidsR === s.kidsR, `full time in a Kids Quick Match moves it (0.4 to ${s.kidsR}) and saves it`);
  ok(K.adapt() === null && near(s.kidsR, 0.4 + ADAPT.raise, 1e-9), 'and only once a match');
  ok(/^Farnham.* Win · Tries 5 – 0$/.test($('br-tries').textContent) && !/[0-9]\.[0-9]|Harder|Level|Rating/.test($('br-tries').textContent + $('br-pts').textContent + $('br-eyebrow').textContent + ($('banner').innerHTML || '')), `nothing on the full-time card shows it ("${$('br-tries').textContent}")`);
  D.exitMatch();
  const r0 = s.kidsR;
  D.startMatch(X.CLUBS[0], X.CLUBS[1], false); M().score = [0, 40]; M().tries = [0, 6]; D.exitMatch();
  ok(s.kidsR === r0, 'a match left before full time does not move it');
  X.newChamp(X.NATIONS[0], X.NATIONS.slice(1));
  { const c = X.champ(), opp = c.fixtures[0].find(p => p.includes(c.user)).find(i => i !== c.user); D.startMatch(c.teams[c.user], c.teams[opp], true); }
  full(0, 14, 0, 2); ok(s.kidsR === K.next(r0, [0, 14], [0, 2]) && s.kidsR < r0 && X.champ().round === 1, 'a Championship match moves it too, and is recorded as ever');
  D.exitMatch(); X.setChamp(null);
  { const cr = T.career.create({ pos:'F', num:2, club:X.CLUBS[0] }); T.career.set(cr); const r1 = s.kidsR; T.career.play(); full(12, 7, 2, 1); ok(s.kidsR === K.next(r1, [12, 7], [2, 1]) && s.kidsR > r1 && cr.season.round === 1, 'and a Career match'); D.exitMatch(); T.career.set(null); }
  const r2 = s.kidsR;
  K.segSet(1); D.startMatch(X.CLUBS[0], X.CLUBS[1], false); full(50, 0, 7, 0); D.exitMatch();
  ok(s.kidsR === r2, 'an Easy match leaves it alone');
  K.segSet(0); D.startMatch(X.CLUBS[0], X.CLUBS[1], false, { two:true, levels:[0, 0] }); full(50, 0, 7, 0); D.setTwo(false); D.exitMatch();
  ok(s.kidsR === r2, 'so does two player');
  T.newMatch(0, 3, { halfLen:60, diff:0, auto:true, headless:true, kids:true, kidsR:r2 }); M().over = true; ok(K.adapt() === null && s.kidsR === r2, 'and AI v AI');
  T.newMatch(0, 3, { halfLen:1e9, diff:0, auto:true, demo:true, kids:true }); M().over = true; ok(K.adapt() === null && s.kidsR === r2, 'and the demo');
  T.practice.start('kick'); M().over = true; ok(K.adapt() === null && s.kidsR === r2, 'and a drill, even one that takes the Kids help'); T.practice.leave();
  play(true, { kidsR:r2 }); ok(K.adapt() === null && s.kidsR === r2, 'and a Kids match not yet over');
  s.kidsR = 0; K.segSet(1); X.save();
}

console.log(`${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
