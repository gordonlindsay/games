// Career seasons end to end, with the real cups engine: scripted careers played through the game's own paths, year after year.
// Each career is a script for one player (a back or a forward, Whole Team or My Player, Men or Women, Normal or Kids). Every round he
// answers the hub's dilemma, trains through Train, the drill's ready card and its result card (the drill's stars are the script's), and
// plays his match from the hub's Play Match to the full-time card's Continue. Each career's plan says which matches are played to full
// time by the harness's bot (seeded; My Player by the Pro Mode bot of tools/career-pro.mjs): every cup match of B, C and D, and A's
// first league season, first European Cup, first international window, World Cup and tour; the rest are scripted at the last hooter.
// Where the script needs a result to reach a phase (a league won, a level knockout, a Test lost) the score is set as the second half's
// hooter goes, and the engine's own full time follows (endHalf, finishMatch, the card).
// Between phases it presses Continue, picks a country at the first call-up and Stays or signs in the transfer window, as the buttons
// do. The save is written and read back at every turn. Then careers saved by every earlier build (stages 0 to 4, mid-season and
// finished: tools/fixtures/career-saves.json) are loaded and played on, and, where Playwright is installed, every phase's screens are
// measured at 844x390 and 667x375 (SHOTS=<dir> also writes them as PNGs).
// node tools/career-season.mjs   Exits 1 on any failure. NO_BROWSER=1 skips the screens.
process.env.SEED ??= '41';
const { T, reseed, bot, duelBot, kickBot, dropBot, scrumBot, lineBot } = await import('./harness.mjs');
const { readGameSource } = await import('./source.mjs');
const fs = await import('node:fs'), path = await import('node:path'), http = await import('node:http');
const { createRequire } = await import('node:module'), { execFileSync } = await import('node:child_process'), { fileURLToPath } = await import('node:url');
const C = T.career, X = T.teams, D = T.debug, L = T.careerLife, K = T.cups, LK = T.locker, P = T.careerPro, $ = id => document.getElementById(id);
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } };
const json = v => JSON.stringify(v);
const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(q => [q, x[q]])) : x));   // the same data, whatever order its keys were written in
{ let now = Date.UTC(2026, 10, 8); Date.now = () => (now += 997); }   // a season's id (and so its dilemmas) and a cup's uid read the clock: the same every run
const memory = {};
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; } };
const SCREENS = ['s-career-new', 's-career-club', 's-career-look', 's-career', 's-career-train', 's-career-table', 's-career-draw', 's-career-end', 's-cup'];
{ const qsa = document.querySelectorAll; document.querySelectorAll = sel => (sel === '.screen' ? qsa(sel).concat(SCREENS.map(id => $(id))) : qsa(sel)); }
const shown = () => ['s-home', ...SCREENS].find(id => !$(id).hidden) || null;
const settings = D.settings();
const level = kids => { settings.played = 99; settings.half = 0; settings.diff = kids ? 0 : 1; settings.kids = !!kids; };   // 2-minute halves, no gentler start: Kids or Normal
const keys = C.skills().map(([k]) => k);
const DRILL = { pace:'cones', power:'tackle', handling:'egg', kicking:'kick', stamina:'circle' };   // the drill for each skill, as career.mjs's calibration
const club = id => X.NATIONAL.flat().find(t => t.id === id);
const ord = n => n + (['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] || 'th');
const diffOf = d => { T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:d, headless:true }); return json(T.M.diff); };   // a level's own numbers, as newMatch gives them
const EASY = diffOf(0), NORMAL = diffOf(1);
ok(EASY !== NORMAL, 'Easy and Normal are different levels');

// The Locker with every Gold: every Legends side unlocked, so every draw below has them there to draw if anything would
LK.set(LK.clean({ n:Object.fromEntries(LK.FEATS.filter(f => f.id !== 'star').map(f => [f.id, 40])), drills:C.drillIds() }));
const LEG = { men:LK.legends('men'), women:LK.legends('women') };   // ten men's and five women's (re-pinned 2026-11-09 from ten women's: the women's Legends are five, src/locker.js)
ok(LEG.men.length === 10 && LEG.women.length === 5, `every Legends side unlocked for the careers to meet if anything drew them (${LEG.men.length} men's, ${LEG.women.length} women's)`);
const LEGEND = new Set(LK.LEGENDS.flatMap(t => [t.id, t.name]));
const legendary = t => !!t && (t.legend || LEGEND.has(t.id) || LEGEND.has(t.name) || LEGEND.has(String(t.name).replace(/ Women$/, '')));

// The scripted Pro Mode player (tools/career-pro.mjs's proBot): the harness's bot with the ball and in defence, its close-up bots, and
// a support line off the carrier with a call for the ball while a pass is on. Kids sets the aim at a goal kick (kidsBot, as career-pro.mjs).
function proBot() {
  const M = T.M, b = M.ball, me = M.careerP, inp = T.input;
  if (M.phase === 'cut' && M.cut) {
    inp.jx = 0; inp.jy = 0; const c = M.cut;
    if (c.duel) duelBot(c); else if (c.kind === 'goal') (c.g.type === 'drop' ? dropBot : kickBot)(c, M.kids ? { aim:c.g.aim } : {});
    else if (c.kind === 'scrum') scrumBot(0); else if (c.kind === 'lineout') lineBot(0);
    return;
  }
  const mate = M.phase !== 'play' ? null : b.state === 'held' && b.carrier.team === 0 && b.carrier !== me ? b.carrier
    : b.state === 'air' && b.f.kind === 'pass' && b.f.team === 0 && b.f.target !== me ? b.f.target : null;
  if (!mate) { bot(0); return; }
  inp.jx = 0; inp.jy = 0; inp.cDown = false;
  const s = Math.abs(me.y - mate.y) < 1 ? (mate.y < 35 ? 1 : -1) : Math.sign(me.y - mate.y);
  const tx = mate.x - 3.5 + mate.vx*0.35, ty = Math.max(4, Math.min(66, mate.y + s*6.5)), dx = tx - me.x, dy = ty - me.y, dd = Math.hypot(dx, dy);
  if (dd > 0.4) { const m = Math.min(1, dd/2); inp.jx = dx/dd*m; inp.jy = dy/dd*m; }
  if (b.state === 'held' && P.canCall() && P.open(mate, P.PRO.callOpen) && Math.random() < 0.6*T.STEP) inp.aPressed = true;
}
function kidsBot() { const M = T.M, c = M.cut; if (M.phase === 'cut' && c && !c.duel && c.kind === 'goal') { T.input.jx = T.input.jy = 0; (c.g.type === 'drop' ? dropBot : kickBot)(c, { aim:c.g.aim }); } else bot(0); }

// The save, written and read back: the career that comes back is the one that went (a side's keys may come back in the validator's order)
function reload(run) {
  X.save();
  const was = canon(C.get());
  C.set(null); X.restore(JSON.parse(memory['tryline.v1']));
  if (canon(C.get()) !== was) run.bad.push(`year ${run.cr.year} ${run.cr.phase}: the save read back is not the career`);
  run.cr = C.get(); run.reloads++;
  return run.cr;
}

// One match from the hub: Play Match, the match, the full-time card, Continue. plan: { real, want:'win'|'loss'|'level'|null, golden:'win' }
let seed = 5000;
function match(run, f, plan) {
  const cr = run.cr, sp = run.spec, cupNow = !cr.season, before = { done:cupNow ? cr.cup.results.length : cr.season.round, n:cr.totals.matches, gp:LK.count('golden') };
  const where = `year ${cr.year} ${cr.phase} ${f.label}`;
  reseed(++seed);
  $('cr-play').click();
  const M = T.M, bad = m => run.bad.push(where + ': ' + m);
  if (!M || !M.career || M.over) { bad('Play Match did not start a career match'); return null; }
  if (M.careerP !== M.players.find(p => p.team === 0 && p.n === cr.num)) bad('his player is not the man in his shirt');
  if (cupNow ? M.cup !== cr.cup.id || M.cupKO !== !!f.ko : M.cup) bad(`the match is the cup's (${M.cup}, ${M.cupKO}) where it should be ${cupNow ? cr.cup.id + ' ' + f.ko : 'none'}`);
  if (M.careerPro !== (cr.proMode === true)) bad('Pro Mode is not as the career has it');
  const want = sp.kids ? (cr.proMode ? ['Easy', false, EASY] : ['Kids', true, null]) : ['Normal', false, NORMAL];
  if (M.kids !== want[1] || (want[2] && json(M.diff) !== want[2])) bad(`plays at ${M.kids ? 'Kids' : json(M.diff) === EASY ? 'Easy' : 'Normal'}, not ${want[0]}`);
  for (const t of M.nat) { run.sides.push(t); if (legendary(t)) bad('a Legends side in his match: ' + t.name); }
  let golden = false, ring = true, steps = 0, scripted = 0;
  const lead = () => M.score[0] - M.score[1];
  const steer = w => {                                // the script's hand as the hooter goes: the result it needs, then the engine's full time
    if (w === 'win' && lead() <= 0) { M.score[0] = M.score[1] + 7; M.tries[0] = Math.max(M.tries[0], M.tries[1] + 1); scripted++; }
    else if (w === 'loss' && lead() >= 0) { M.score[1] = M.score[0] + 7; M.tries[1] = Math.max(M.tries[1], M.tries[0] + 1); scripted++; }
    else if (w === 'level' && lead() !== 0) { const s = Math.max(...M.score); M.score = [s, s]; M.tries = [Math.max(...M.tries), Math.max(...M.tries)]; scripted++; }
    T.arcade.endHalf();
  };
  if (plan.real) {
    const step = cr.proMode ? proBot : sp.kids ? kidsBot : () => bot(0);
    const done = { 2:false, 3:false };
    while (!M.over && steps < 600000) {
      if (M.phase === 'break') { $('br-go').click(); continue; }          // half time: Second Half
      if (M.phase === 'menu' && !$('m-pen').hidden) { ($('p-goal').disabled ? $('p-tap') : $('p-goal')).click(); continue; }   // a penalty: the card's choice
      if (M.golden) golden = true;
      if (M.phase === 'play' && M.hooter && M.half === 2 && !done[2] && plan.want) { done[2] = true; steer(plan.want); continue; }
      // the hooter went in the step a try was scored, so play never resumes before full time (the try, its conversion, then the kick-off
      // ends the half): the script's hand there, only when the result is not already the one it needs (2026-11-13: the interception rules
      // moved the seeded matches, and B's first Test met it)
      if (M.phase === 'set' && M.hooter && M.half === 2 && !done[2] && plan.want && !(plan.want === 'win' ? lead() > 0 : plan.want === 'loss' ? lead() < 0 : lead() === 0)) { done[2] = true; steer(plan.want); continue; }
      if (M.half === 3 && M.hooter && !done[3]) {    // the Golden Try's end: a score (the next dead ball ends it) or its hooter. The script's result, a try clear
        done[3] = true;
        const w = plan.golden || 'win', me = w === 'win' ? 0 : 1;
        if ((w === 'win' && lead() <= 0) || (w === 'loss' && lead() >= 0)) { M.score[me] = M.score[1 - me] + 10; M.tries[me] = M.tries[1 - me] + 2; scripted++; }
        if (M.phase === 'play') { T.arcade.endHalf(); continue; }
      }
      step(); T.update(T.STEP); steps++;
      if (cr.proMode && M.phase === 'play' && T.sides.ctrlOf(0) !== M.careerP) ring = false;
    }
  } else {
    const sc = { win:[[24, 7], [4, 1]], loss:[[7, 24], [1, 4]], level:[[10, 10], [2, 2]] }[plan.want || 'win'];
    M.half = 2; M.score = sc[0].slice(); M.tries = sc[1].slice(); M.careerDeeds = { tries:0, tackles:3, goals:2 };   // the bot's average, as the calibration in career.mjs
    T.arcade.endHalf();
    if (!M.over && M.golden) { golden = true; M.score[0] += 5; M.tries[0]++; T.arcade.endHalf(); }
  }
  if (golden && M.golden) run.goldens.push(where);
  if (plan.want === 'level' && f.ko && !golden) bad('a level knockout did not go to the Golden Try');
  if (plan.want === 'level' && !f.ko && (golden || M.score[0] !== M.score[1])) bad('a level pool match did not stay a draw');
  if (!M.over || $('m-break').hidden) { bad(`no full time (${steps} steps)`); return null; }
  if (!ring) bad('the ring left him in a Pro Mode match');
  const line = $('br-pts').hidden ? '' : $('br-pts').textContent, score = M.score.slice(), won = score[0] > score[1];
  if (cupNow ? (f.ko ? !line || /Table Point/.test(line) : !line) : !/^\+\d Table Points?/.test(line)) bad(`the full-time card's line is wrong: "${line}"`);
  if (golden && won && LK.count('golden') !== before.gp + 1) bad('a knockout won in the Golden Try is not a Golden Try medal');
  $('br-go').click();                                 // Continue: back to the career
  const now = cupNow ? (run.cr.cup ? run.cr.cup.results.length : before.done + 1) : run.cr.season ? run.cr.season.round : before.done + 1;
  if (!['s-career', 's-career-end'].includes(shown())) bad(`Continue led to ${shown()}`);
  if (run.cr.totals.matches !== before.n + 1 || now <= before.done) bad('the result is not in the career');
  run.matches.push({ where, real:!!plan.real, steps, scripted, golden, line, score, cup:M.cup, ko:M.cupKO, pro:M.careerPro, kids:M.kids, life:{ ...run.cr.life },
    kick:{ ...M.careerLife }, passes:(M.careerLifeStats || {}).passes || 0, tries:(M.careerDeeds || {}).tries || 0 });   // the bars at kick-off and his part, for Team Spirit's rule
  return { score, won, golden, line };
}

// One training session from the hub: Train, the drill's button, Start Drill, the drill's own finish with the script's stars, Back to Career
function train(run, stars) {
  const cr = run.cr, bad = m => run.bad.push(`year ${cr.year} ${cr.phase}: ${m}`);
  if (cr.trained || $('cr-train').disabled) return false;
  const can = keys.filter(k => C.drills(cr).some(d => d.id === DRILL[k]));   // a game the player can see: at Kids no contact game, so no Power (PR #14's rule)
  const low = can.reduce((a, k) => (cr.skills[k] < cr.skills[a] ? k : a), can[0]), id = DRILL[low], b0 = cr.skills[low], e0 = cr.life.energy;
  $('cr-train').click();
  if (shown() !== 's-career-train' || !$('ct-list').innerHTML.includes(`data-drill="${id}"`)) { bad('Train did not open the drills'); return false; }
  if (!C.train(id) || !T.practice.state()) { bad('the drill did not start'); return false; }   // the drill's button (ct-list): careerTrain
  if (T.practice.state().roles) $('pr-runner').click(); else $('pr-retry').click();   // the ready card: Start Drill (Pass Around the Circle: Runner)
  for (let i = 0; i < 30; i++) T.update(T.STEP);
  T.practice.finish(true, 'Well Played', stars);      // the drill's own result card, with the script's stars
  $('pr-select').click();                             // Back to Career
  const cr2 = run.cr;
  if (shown() !== 's-career' || !cr2.trained || cr2.skills[low] !== Math.min(99, b0 + C.TRAIN[stars]) || cr2.life.energy !== Math.max(0, e0 - 8)) bad(`a session did not give +${C.TRAIN[stars]} ${low} for 8 Energy (${b0} to ${cr2.skills[low]}, Energy ${e0} to ${cr2.life.energy}, ${shown()})`);
  run.sessions++;
  return true;
}

// One turn of a career: the hub (its checks, the dilemma, a session and a match) or the screen between phases (Continue, the call-up's
// country, the transfer window). False when the career is stuck on a screen it cannot go on from.
function turn(run) {
  const spec = run.spec;
  const cr = run.cr, scr = shown();
  if (scr === 's-career') {
    const f = C.ahead(cr), bad = m => run.bad.push(`year ${cr.year} ${cr.phase}: ${m}`);
    const eb = $('cr-eyebrow').textContent;
    if (run.phases.at(-1) !== eb) run.phases.push(eb);
    if (cr.phase === 'intl' && cr.season && cr.season.round === 0) run.sixes.push(cr.season.teams.map(t => t.id).sort().join());   // his country's six
    // the hub: the eyebrow, title and Table for the phase
    const cup = !cr.season, team = f.teams[f.user];
    const wantEb = cr.phase === 'league' ? team.name + ' · Year ' + cr.year : cr.season ? team.name + ' · International' : C.CUP_NAME[cr.phase === 'cup' ? 'euro' : cr.phase === 'tour' ? 'tour' : 'world'] + ' · ' + f.label;
    if (eb !== wantEb) bad(`the hub's eyebrow reads "${eb}", not "${wantEb}"`);
    if ($('cr-title').textContent !== (cup ? 'Year ' + cr.year : f.label)) bad(`the hub's title reads "${$('cr-title').textContent}"`);
    const drawName = cup ? (cr.cup.id === 'tour' ? 'Series' : cr.cup.id === 'world' && cr.cup.round < 3 ? 'Pools' : 'Knockouts') : 'Table';
    if ($('cr-table').hidden || $('cr-table').textContent !== drawName) bad(`the hub's second button reads "${$('cr-table').textContent}"${$('cr-table').hidden ? ', hidden' : ''}, not ${drawName}`);
    if (cup && $('cr-line').textContent !== K.line(cr.cup)) bad(`a cup's line under the title is not the cup's own ("${$('cr-line').textContent}")`);
    for (const t of f.teams) { run.sides.push(t); if (legendary(t)) bad('a Legends side drawn: ' + t.name); }
    // the trophy row: a cup a kind he has won, and the count
    const have = C.KINDS.filter(k => cr.trophies.some(t => t.kind === k)), cab = [...$('cr-card').innerHTML.matchAll(/class="cr-cup"[^>]*aria-label="([^"]+), (\d+)"/g)].map(m => m[1] + ' ' + m[2]).join(', ');   // each cup's own label
    const NAMES = { league:'League', euro:'European Cup', world:'World Cup', tour:'Home Nations Tour', triple:'Triple Crown' };
    if (cab !== have.map(k => NAMES[k] + ' ' + cr.trophies.filter(t => t.kind === k).length).join(', ')) bad(`the trophy row reads "${cab}" for ${json(cr.trophies.map(t => t.kind))}`);
    if (cab && run.trophyRows.at(-1) !== cab) run.trophyRows.push(cab);
    // the draw, or the table, and back
    if (cr.season ? cr.season.round === 2 : cr.cup.results.length === 1) {
      $('cr-table').click();
      if (cup ? shown() !== 's-career-draw' || $('cd-title').textContent !== drawName || !/class="(cp-pool|cb-tie|cup-series|cup-bracket)/.test($('cd-draw').innerHTML) : shown() !== 's-career-table' || ($('cl-table').innerHTML.match(/<tr/g) || []).length !== 6) bad(`${drawName} did not show the ${cup ? 'draw' : 'table'} (${shown()})`);
      $(cup ? 'cd-back' : 'cl-back').click();
      if (shown() !== 's-career') bad('Back to Career did not come back');
    }
    // this round's dilemma, on the hub until it is answered (never in a cup)
    const d = L.dilemma(cr);
    if (d) {
      run.dilemmas.asked++;
      if (cup) run.dilemmas.cup++;
      if ($('cr-dilemma').hidden || !$('cr-play').hidden || !d.opts.every((o, i) => $('cr-dilemma').innerHTML.includes(`data-o="${i}"`))) bad('a dilemma is not on the hub in place of Play Match');
      const best = by => d.opts.reduce((j, o, i) => (by(o) > by(d.opts[j]) ? i : j), 0);   // the option with the most of something, the first on a tie
      const pick = spec.dilemma === 'skill' ? best(o => keys.reduce((a, k) => a + Math.max(0, o.fx[k] || 0), 0)) : best(o => (o.fx.spirit || 0)*10 + (o.fx.morale || 0) - keys.reduce((a, k) => a + Math.max(0, o.fx[k] || 0), 0));   // training, or going out with the team
      const before = { ...cr.skills, ...cr.life };
      L.pick(pick);                                 // the option's button
      const o = d.opts[pick], moved = Object.entries(o.fx).every(([k, v]) => { const was = before[k], now = k in cr.skills ? cr.skills[k] : cr.life[k]; return now === Math.max(k in cr.skills ? 1 : 0, Math.min(k in cr.skills ? 99 : 100, was + v)); });
      if (!moved || L.dilemma(cr) || $('cr-play').hidden) bad(`answering "${d.q}" with ${o.name} did not do what it says`);
    } else if (!cup && !$('cr-dilemma').hidden) bad('a dilemma card with no dilemma');
    // a visit to the menu and back now and then: Back to Menu, then Continue Career
    if (cr.totals.matches % 7 === 3) { $('cr-back').click(); if (shown() !== 's-home' || $('cont-name').textContent !== 'Continue' || !/^Career · /.test($('cont-note').textContent)) bad('Back to Menu'); $('b-career').click(); if (shown() !== 's-career') bad('the Career box from the menu'); }
    train(run, spec.stars);
    const plan = spec.plan(run.cr, f);
    match(run, f, plan);
    for (const [k] of L.KEYS) { const v = run.cr.life[k]; if (!Number.isInteger(v) || v < 0 || v > 100) run.bad.push(`${k} is ${v}`); run.bars[k].lo = Math.min(run.bars[k].lo, v); run.bars[k].hi = Math.max(run.bars[k].hi, v); }
    reload(run); C.open();
  } else if (scr === 's-career-end') {
    const bad = m => run.bad.push(`year ${cr.year} ${cr.phase}: ${m}`);
    if (cr.phase === 'transfer') {                  // the transfer window: the offers and Stay
      const body = $('ce-body').innerHTML, ovr = C.overall(cr.skills), target = C.target(ovr), offers = cr.offers.map(club);
      run.offers.push({ year:cr.year, ovr, target, offers:offers.map(t => [t.id, X.overallOf(t)]), own:cr.club.id });
      if ($('ce-title').textContent !== 'Transfer Window' || $('ce-eyebrow').textContent !== C.teamFor(cr, 'league').name + ' · Year ' + cr.year) bad('the transfer window\'s heading');
      if (offers.length < 2 || offers.length > 3 || offers.some(t => !t || (!cr.club.custom && t.id === cr.club.id) || Math.abs(X.overallOf(t) - target) > 3 || legendary(t))) bad(`the offers ${json(offers.map(t => t && t.id))} are not two or three clubs near ${target.toFixed(1)}, never his own`);
      if (!offers.every(t => body.includes(`data-sign="${t.id}"`)) || !/class="team cr-offer stay" data-sign="">/.test(body) || offers.some((t, i) => i && X.overallOf(t) > X.overallOf(offers[i - 1]))) bad('the cards are not each offer, best first, and Stay');
      const to = spec.sign ? spec.sign(cr, cr.offers) : null, was = cr.club.id, n0 = LK.count('silver') + LK.count('callup');
      C.sign(to); C.open();                         // a card's button: careerSign, then the hub
      const now = run.cr;
      if (now.year !== cr.year || now.phase !== 'league' || now.club.id !== (to || was) || now.season.round !== 0 || now.season.teams[0].id !== (to || was)) bad(`${to ? 'signing for ' + to : 'Stay'} did not start the next year at ${to || was}`);
      if (to) { run.transfers++; const list = X.TEAM_LISTS.find(l => l.teams.some(t => t.id === to)); if (now.league !== list.key || !now.season.teams.slice(1).every(t => list.teams.some(o => o.id === t.id))) bad('his new club\'s league is not its own list'); }
      if (LK.count('silver') + LK.count('callup') !== n0) bad('a transfer counted a medal');
      reload(run); C.open();
      return true;
    }
    const out = C.outcome(cr);
    if (!out) { bad('a screen between phases with nothing finished'); return false; }
    const first = out.next.phase === 'intl' && out.next.first;
    const title = $('ce-title').textContent;
    const wantTitle = first ? 'Called Up' : cr.season ? X.chaseTitle(cr.season, X.standings(cr.season))
      : out.kind === 'tour' ? (out.won ? 'Series Won' : 'Series Lost') : out.won ? 'Winners' : K.cupFinish(cr.cup);
    if (title !== wantTitle) bad(`between phases the title reads "${title}", not "${wantTitle}"`);
    const wantLine = out.place ? (cr.season.teams[0].name + ' finish ' + ord(out.place)) : K.line(cr.cup);
    if ($('ce-line').textContent !== wantLine) bad(`between phases the line reads "${$('ce-line').textContent}", not "${wantLine}"`);
    const t0 = cr.trophies.length, h0 = cr.history.length, m0 = { silver:LK.count('silver'), callup:LK.count('callup') }, wasSeason = !!cr.season;
    if (first) {                                    // the first call-up: the country picker
      const picks = ($('ce-body').innerHTML.match(/data-n="([A-Z]{3})"/g) || []).map(m => m.slice(8, 11));
      if (json(picks) !== json(X.natList(cr.cat === 'women' ? 'women' : 'men').map(t => t.id)) || picks.some(id => LEGEND.has(id))) bad(`the country picker shows ${picks}`);
      run.firstCall = cr.year;
      C.advance(spec.country); C.open();            // a country's button: careerAdvance(country), then the hub
      if (run.cr.country !== spec.country || LK.count('callup') !== m0.callup + 1) bad(`picking ${spec.country}: his country ${run.cr.country}, the Call-Up medal ${m0.callup} to ${LK.count('callup')}`);
    } else {
      $('ce-go').click();                           // Continue
    }
    const nt = run.cr.trophies.length - t0, wantN = (out.won ? 1 : 0) + (out.triple ? 1 : 0);
    if (nt !== wantN) bad(`${nt} trophies banked for ${json(out)}`);
    if (out.triple && !run.cr.trophies.some(t => t.kind === 'triple' && t.year === cr.year)) bad('the Triple Crown is not in his cabinet');
    if (wasSeason ? run.cr.history.length !== Math.min(40, h0 + 1) : run.cr.history.length !== h0) bad('the history did not take the season, or took a cup');
    const silver = LK.count('silver') - m0.silver, wantS = out.triple ? 1 : 0;   // a cup won told the Locker at its last match (cupRecord), never again as it is banked
    if (silver !== wantS) bad(`banking ${out.kind} counted ${silver} Silverware medals, not ${wantS}`);
    if (run.cr.phase !== out.next.phase) bad(`Continue led to ${run.cr.phase}, not ${out.next.phase}`);
    reload(run); C.open();
  } else { run.bad.push(`year ${cr.year} ${cr.phase}: stuck on ${scr}`); return false; }
  return true;
}
function newRun(spec, cr) {
  const run = { spec, cr, bad:[], matches:[], phases:[], sixes:[], goldens:[], sides:[], offers:[], firstCall:null, sessions:0, reloads:0, dilemmas:{ asked:0, cup:0 }, bars:{}, medals:{ silver:LK.count('silver'), callup:LK.count('callup'), champ:LK.count('champ') }, transfers:0, trophyRows:[] };
  for (const [k] of L.KEYS) run.bars[k] = { lo:cr.life[k], hi:cr.life[k] };
  return run;
}
// A career, played by its script until the year `until` begins
function career(spec) {
  level(spec.kids);
  C.set(null); C.start({ name:spec.name, pos:spec.pos, num:spec.num, club:club(spec.club), cat:spec.cat, proMode:spec.pro });   // Start Career
  const run = newRun(spec, C.get());
  ok(!!run.cr && run.cr.year === 1 && run.cr.phase === 'league', `${spec.label}: Start Career makes a rookie in year 1 at ${spec.club}'s league`);
  C.open();
  let guard = 0;
  while (run.cr.year < spec.until && guard++ < 600) if (!turn(run)) break;
  if (guard >= 600) run.bad.push('the script ran out of turns');
  return run;
}

// The four careers. plan(cr, f) says how each match goes: real (played to full time by the bot) or scripted, and the result it needs.
const vs = (cr, f) => f.teams[f.home === f.user ? f.away : f.home];
const RUNS = [];
// A: a back, Whole Team, Men, Normal, at Bath. His first season is played; Bath win it, then the European Cup, its Semi-Final level at
// full time for the Golden Try. He Stays every year, is called up for England, takes the Triple Crown (France beat him), wins the World
// Cup through a level Quarter-Final, and on the Home Nations Tour in year 6 wins Tests 1 and 3 and loses the second. His European Cups
// after year 1 are scripted: the bot's deeds in his year 2 pair (6 points each, at the cap, where a scripted match gives 5) take him
// from 79 to exactly 80 at the end of year 2, a call-up a year early on a single point, in a script that already trains every round
// at two stars and plays two more rounds a year than tools/career.mjs's calibration player.
RUNS.push(career({ label:'A (a back, Whole Team, Men, Normal)', name:'Sam', pos:'B', num:7, club:'BTH', cat:'men', pro:false, kids:false, country:'ENG', dilemma:'skill', stars:2, until:7,
  plan(cr, f) {
    const opp = vs(cr, f);
    if (cr.phase === 'league') return { real:cr.year === 1, want:'win' };
    if (cr.phase === 'cup') return cr.year === 1 ? { real:true, want:f.label === 'Semi-Final' ? 'level' : 'win', golden:'win' } : { want:cr.year === 2 && f.label === 'Final' ? 'loss' : cr.year === 4 && f.label === 'Semi-Final' ? 'loss' : 'win' };
    if (cr.phase === 'intl' && cr.season) return { real:cr.history.filter(h => h.kind === 'intl').length === 0, want:opp.id === 'FRA' && cr.history.filter(h => h.kind === 'intl').length === 0 ? 'loss' : 'win' };
    if (cr.phase === 'intl') return { real:true, want:f.label === 'Quarter-Final' ? 'level' : 'win', golden:'win' };   // the World Cup
    if (cr.phase === 'tour') return { real:true, want:f.label === 'Test 2 of 3' ? 'loss' : 'win' };
    return { want:'win' };
  } }));
// B: a forward, My Player, Women, Normal, at Dublin. Every dilemma's team option (no skill from them). Dublin win the league and reach
// the European Cup Final, lost; called up for Ireland, the Triple Crown; the women's World Cup in year 4 played to its Final, lost; the
// Home Nations Tour in year 6, a Test won between two lost: the series lost. Her cup matches are all played, by the Pro Mode bot.
RUNS.push(career({ label:'B (a forward, My Player, Women, Normal)', name:'Isla', pos:'F', num:2, club:'DUB', cat:'women', pro:true, kids:false, country:'IRE', dilemma:'team', stars:2, until:7,
  plan(cr, f) {
    const opp = vs(cr, f);
    if (cr.phase === 'league') return { want:cr.year === 2 && f.label === 'Round 5 of 5' ? 'loss' : 'win' };
    if (cr.phase === 'cup') return { real:true, want:f.label === 'Final' ? 'loss' : 'win' };
    if (cr.phase === 'intl' && cr.season) return { want:opp.id === 'ENG' && cr.history.filter(h => h.kind === 'intl').length === 0 ? 'win' : 'win' };
    if (cr.phase === 'intl') return { real:true, want:f.label === 'Final' ? 'loss' : f.label === 'Semi-Final' ? 'level' : 'win', golden:'win' };
    if (cr.phase === 'tour') return { real:true, want:f.label === 'Test 2 of 3' ? 'win' : 'loss' };
    return { want:'win' };
  } }));
// C: a back, My Player, Men, Kids, at Toulouse: My Player on Kids plays at Easy, cup matches too. Toulouse win the Top 14 and the European
// Cup (both its matches played); in the window he signs for the offer from another league, and his second year is at its league.
RUNS.push(career({ label:'C (a back, My Player, Men, Kids)', name:'Alfie', pos:'B', num:4, club:'TLS', cat:'men', pro:true, kids:true, country:'FRA', dilemma:'skill', stars:3, until:2,
  plan(cr, f) { return cr.phase === 'cup' ? { real:true, want:'win' } : { want:'win' }; },
  sign:(cr, offers) => offers.find(id => X.TEAM_LISTS.find(l => l.teams.some(t => t.id === id)).key !== 'fra') || offers[0] }));
// D: a forward, Whole Team, Men, Kids, at Pretoria: a Kids match, cup matches too. Pretoria win South Africa's league; the European Cup
// Semi-Final is played and lost; he Stays.
RUNS.push(career({ label:'D (a forward, Whole Team, Men, Kids)', name:'Mia', pos:'F', num:1, club:'PRE', cat:'men', pro:false, kids:true, country:'RSA', dilemma:'team', stars:1, until:2,
  plan(cr, f) { return cr.phase === 'cup' ? { real:true, want:'loss' } : { want:'win' }; } }));
level(false);

for (const r of RUNS) {
  const sp = r.spec, M = r.matches, real = M.filter(m => m.real), cups = M.filter(m => m.cup);
  ok(!r.bad.length, `${sp.label}: every hub, match, card and screen between phases as it should be (${r.bad.length ? r.bad.slice(0, 6).join('; ') : M.length + ' matches, ' + real.length + ' played to full time, ' + r.sessions + ' sessions, ' + r.reloads + ' reloads'})`);
  ok(r.cr.year === sp.until && r.cr.phase === 'league' && C.ahead(r.cr) && C.ahead(r.cr).label === 'Round 1 of 5', `${sp.label}: the career reaches year ${sp.until}'s league, the year flow never stuck (${r.cr.year}, ${r.cr.phase})`);
  ok(cups.every(m => m.pro === sp.pro) && (!sp.pro || cups.some(m => m.real)), `${sp.label}: ${sp.pro ? 'My Player in every cup match, the ring on him in the ones played' : 'Whole Team in every cup match'}`);
  ok(M.every(m => m.kids === (sp.kids && !sp.pro)), `${sp.label}: ${sp.kids ? (sp.pro ? 'on Kids, My Player plays every match at Easy, cup matches included' : 'on Kids, Whole Team plays every match at Kids, cup matches included') : 'every match at Normal'}`);
  ok(!r.sides.some(legendary) && r.offers.every(o => o.offers.every(([id]) => !LEGEND.has(id))), `${sp.label}: no Legends side drawn anywhere, with every one unlocked (${r.sides.length} sides met)`);
  ok(r.dilemmas.asked >= 3 && r.dilemmas.cup === 0, `${sp.label}: dilemmas on the hub in league and international rounds, never in a cup (${r.dilemmas.asked} answered)`);
}
const [A, B, Cc, Dd] = RUNS;
// A: every phase reached, in order
{
  const ph = A.phases.join(' | ');
  ok(/^Bath · Year 1 \| European Cup · Semi-Final \| European Cup · Final \| Bath · Year 2/.test(ph), `A: Bath win the league in year 1 and go into the European Cup, its Semi-Final then its Final (${ph.slice(0, 120)})`);
  const g = A.matches.find(m => m.where === 'year 1 cup Semi-Final');
  ok(g && g.real && g.golden && g.ko && /^Through to the Final/.test(g.line), `A: the Semi-Final, played, level at full time, goes to the Golden Try and through (${g && g.score.join('-')}, "${g && g.line}")`);
  ok(A.firstCall >= 3 && A.firstCall <= 4 && B.firstCall >= 3 && B.firstCall <= 4, `the scripted players are first called up in year 3 or 4 (A in year ${A.firstCall}, B in year ${B.firstCall}): CAREER_CALL.bar ${C.CALL.bar} holds`);
  ok(/England · International/.test(ph) && A.sixes.length >= 2 && A.sixes.every(x => x === 'ENG,FRA,IRE,ITA,SCO,WAL') && A.cr.trophies.some(t => t.kind === 'triple' && t.name === 'England' && t.year === A.firstCall), `A: called up for England, the Six Nations every window (${A.sixes[0]}), the Triple Crown in his first, France beating him (${json(A.cr.trophies.filter(t => t.kind === 'triple'))})`);
  ok(/World Cup · Pool [ABCD] \| World Cup · Quarter-Final \| World Cup · Semi-Final \| World Cup · Final/.test(ph) && A.matches.some(m => /World Cup|intl Quarter-Final/.test(m.where) && m.golden) && A.cr.trophies.some(t => t.kind === 'world' && t.year === 4), 'A: the World Cup in year 4, its pools and knockouts, a level Quarter-Final to the Golden Try, won');
  const pool = A.matches.filter(m => m.cup === 'world' && !m.ko);
  ok(pool.length === 2 && pool.every(m => m.real && /Table Point|Pool [ABCD] Winners|Through|Out/.test(m.line)), `A: two pool matches, each with the pool's line (${pool.map(m => m.line).join('; ')})`);
  const tour = A.matches.filter(m => m.cup === 'tour');
  ok(tour.length === 3 && tour.every(m => m.real && m.ko) && /Series Won 2 – 1/.test(tour[2].line) && A.cr.trophies.some(t => t.kind === 'tour' && t.year === 6 && t.name === 'Home Nations'), `A: the Home Nations Tour in year 6 at overall ${C.overall(A.cr.skills)}: three Tests played, the series 2 – 1 (${tour.map(m => m.line).join('; ')})`);
  ok(A.offers.length === 6 && A.offers.every(o => o.own === 'BTH' && o.offers.every(([id]) => id !== 'BTH')) && A.cr.club.id === 'BTH', 'A: six transfer windows, Bath never offered, Stay every time');
  const by = k => A.cr.trophies.filter(t => t.kind === k).length;
  ok(A.trophyRows.at(-1) === `League ${by('league')}, European Cup ${by('euro')}, World Cup 1, Home Nations Tour 1, Triple Crown ${by('triple')}` || A.trophyRows.at(-1) === `League ${by('league')}, European Cup ${by('euro')}, World Cup 1, Triple Crown ${by('triple')}`, `A: the trophy row counts his cabinet by kind (${A.trophyRows.at(-1)})`);
}
// the medals: each once
{
  const kinds = r => r.cr.trophies.filter(t => ['euro', 'world', 'tour', 'triple'].includes(t.kind)).length;
  const silver = RUNS.reduce((a, r) => a + kinds(r), 0), called = RUNS.filter(r => r.firstCall).length;
  ok(LK.count('silver') - RUNS[0].medals.silver === silver, `a Silverware medal for each European Cup, World Cup, tour and Triple Crown won, once each (${LK.count('silver') - RUNS[0].medals.silver} for ${silver})`);
  ok(LK.count('callup') - RUNS[0].medals.callup === called, `a Call-Up medal for each first call-up, and none for a later one (${LK.count('callup') - RUNS[0].medals.callup} for ${called})`);
  ok(LK.count('champ') === RUNS[0].medals.champ, 'a career\'s league title is never the Championship\'s Champions medal');
  ok(!('transfer' in LK.EVENTS) && Cc.transfers === 1, 'the Locker has no Transfer medal, and signing for a club counted none (C signed once)');
}
// B, C, D
{
  const ph = B.phases.join(' | ');
  ok(/^Dublin Women · Year 1 \| European Cup · Semi-Final \| European Cup · Final/.test(ph) && B.cr.trophies.filter(t => t.kind === 'euro').length === 0, `B: Dublin Women win the league and lose the European Cup Final (${ph.slice(0, 90)})`);
  ok(/Ireland Women · International/.test(ph) && B.cr.country === 'IRE' && B.sixes.every(x => x === 'ENG,FRA,IRE,ITA,SCO,WAL') && B.cr.trophies.some(t => t.kind === 'triple' && t.name === 'Ireland Women'), 'B: called up for Ireland Women, the women\'s Six Nations, the Triple Crown in her first window');
  const wc = B.matches.filter(m => m.cup === 'world');
  ok(wc.length === 5 && wc.every(m => m.real && m.pro) && wc.some(m => m.golden) && /World Cup · Final/.test(ph) && !B.cr.trophies.some(t => t.kind === 'world'), `B: the women's World Cup played to its Final in Pro Mode (a level Semi-Final to the Golden Try), the Final lost (${wc.map(m => m.score.join('-')).join(', ')})`);
  const tour = B.matches.filter(m => m.cup === 'tour');
  ok(tour.length === 3 && tour.every(m => m.real && m.pro) && /Series Lost 1 – 2/.test(tour[2].line) && !B.cr.trophies.some(t => t.kind === 'tour'), `B: the Home Nations Tour in Pro Mode, a Test won between two lost: Series Lost (${tour.map(m => m.line).join('; ')})`);
  const cm = Cc.matches.filter(m => m.cup === 'euro');
  ok(cm.length === 2 && cm.every(m => m.real && m.pro && !m.kids) && Cc.cr.trophies.some(t => t.kind === 'euro'), 'C: on Kids, My Player plays the European Cup at Easy, both matches, and wins it');
  ok(Cc.cr.club.id !== 'TLS' && Cc.cr.league !== 'fra' && Cc.cr.year === 2, `C: signs for ${Cc.cr.club.name} of ${Cc.cr.league} and starts year 2 in its league`);
  const dm = Dd.matches.filter(m => m.cup === 'euro');
  ok(dm.length === 1 && dm[0].real && dm[0].kids && !dm[0].pro && Dd.cr.trophies.length === 1, `D: on Kids, Whole Team plays the European Cup Semi-Final at Kids, and loses it: Semi-Finalists (${dm[0] && dm[0].score.join('-')})`);
}
// The bars through the years: a session costs Energy and a round gives it back, Morale rises with wins and falls with defeats, and Team
// Spirit falls for a player who always trains (A) and holds for one who goes out with the team (B); a cup holds it where the league left it
ok(RUNS.every(r => r.bars.energy.lo < 80 && r.bars.morale.hi > 60), `the bars move through the year (Energy ${RUNS.map(r => r.bars.energy.lo + '-' + r.bars.energy.hi).join(', ')}; Morale ${RUNS.map(r => r.bars.morale.lo + '-' + r.bars.morale.hi).join(', ')})`);
// Team Spirit in a cup: every cup match, played or scripted, leaves it exactly as it stood at kick-off (as the league or the six left it:
// a cup has no dilemma), while Energy and Morale still move; every league and international round fades and gains by the rule, the first
// after a cup run going on from the cup's value
{
  const S = L.LIFE.spirit, bad = [];
  let cups = 0, moved = 0, after = 0;
  for (const r of RUNS) r.matches.forEach((m, i) => {
    const s0 = m.kick.spirit, want = m.cup ? s0 : Math.max(0, Math.min(100, s0 + S.fade - Math.floor(Math.max(0, s0 - 50)/S.high) + Math.min(S.cap, Math.floor(m.passes/S.passes) + m.tries*S.tryPts)));
    if (m.life.spirit !== want) bad.push(`${r.spec.label.slice(0, 1)} ${m.where}: ${s0} to ${m.life.spirit}, not ${want}`);
    if (m.cup) { cups++; if (m.life.energy !== m.kick.energy || m.life.morale !== m.kick.morale) moved++; }
    else if (i && r.matches[i - 1].cup) after++;
  });
  ok(!bad.length && cups >= 40 && moved === cups && after >= 8, `Team Spirit held through all ${cups} cup matches (Energy or Morale moved at each: ${moved}), and every league and international round faded and gained by the rule, ${after} of them straight after a cup (${bad.slice(0, 4).join('; ') || 'all'})`);
}
ok(A.bars.spirit.lo <= 10 && B.bars.spirit.hi > 50 && B.bars.spirit.lo >= 10, `Team Spirit: A, always training, falls to ${A.bars.spirit.lo}; B, always out with the team, ${B.bars.spirit.lo} to ${B.bars.spirit.hi} over six years of cups and windows`);

// A cup match left before full time (Pause, Quit Match twice): nothing recorded, the same fixture on the hub, Play Match again
{
  level(false);
  const cr = C.create({ name:'Ben', pos:'B', num:6, club:club('NTH') }); C.set(cr);
  const c = cr.season; c.results = c.fixtures.map(rd => rd.map(([h, a]) => ({ h, a, hs:h === 0 ? 30 : a === 0 ? 0 : 10, as:a === 0 ? 30 : h === 0 ? 0 : 10, ht:h === 0 ? 5 : 1, at:a === 0 ? 5 : 1 }))); c.round = 5;
  C.advance(); C.open();
  const f = C.ahead(cr), was = json(cr.cup), n = cr.totals.matches;
  $('cr-play').click(); for (let i = 0; i < 600; i++) { bot(0); T.update(T.STEP); }
  $('b-pause').click(); $('pz-quit').click(); $('pz-quit').click();
  ok(shown() === 's-career' && json(cr.cup) === was && cr.totals.matches === n && C.ahead(cr).label === f.label && $('cr-eyebrow').textContent === 'European Cup · ' + f.label, `a European Cup ${f.label} quit before full time: nothing recorded, the hub shows it again`);
  $('cr-play').click(); T.M.half = 2; T.M.score = [20, 3]; T.M.tries = [3, 0]; T.arcade.endHalf(); $('br-go').click();
  ok(cr.cup.results.length > 0 && cr.totals.matches === n + 1, 'and Play Match plays it');
  C.set(null);
}

// A saved cup is only kept in its own phase: a European Cup saved in the international window would read as the World Cup and bank as
// one, so it is dropped and the window's six drawn as the hub opens; one saved in the transfer window, or a World Cup in the tour, likewise
{
  level(false);
  const cr = C.create({ name:'Ben', pos:'B', num:6, club:club('BTH') }); C.set(cr); cr.season.round = 5;
  cr.season.results = cr.season.fixtures.map(rd => rd.map(([h, a]) => ({ h, a, hs:h === 0 ? 30 : 10, as:a === 0 ? 30 : 10, ht:h === 0 ? 5 : 1, at:a === 0 ? 5 : 1 })));
  C.advance();
  const euro = JSON.parse(JSON.stringify(cr));
  ok(C.clean(euro).cup && C.clean(euro).cup.id === 'euro', 'a European Cup saved in its own phase is kept');
  const intl = C.clean({ ...euro, phase:'intl', country:'ENG' }), tour = C.clean({ ...euro, phase:'tour', country:'ENG' });
  ok(intl.phase === 'intl' && intl.cup === null && tour.phase === 'transfer' && tour.cup === null, `in another's (the window, the tour) it is not his: the window with no cup, the tour on to the transfer window (${intl.phase} ${intl.cup}, ${tour.phase} ${tour.cup})`);
  C.set(intl); C.open();
  ok(shown() === 's-career' && intl.season && $('cr-eyebrow').textContent === 'England · International', `the window draws its six as the hub opens (${$('cr-eyebrow').textContent})`);
  C.set(null);
}

// A Championship cup under way at the same time as a career's: each keeps its own
{
  level(false);
  K.set(null); ok(K.begin('world', { user:X.natList('men').find(t => t.id === 'FRA'), cat:'men' }), 'a Championship World Cup begun as France');
  const champCup = json(K.get());
  const cr = C.create({ name:'Joe', pos:'F', num:3, club:club('BTH') }); C.set(cr); cr.year = 4; cr.country = 'ENG';
  for (const k of keys) cr.skills[k] = 90;
  cr.season.results = cr.season.fixtures.map(rd => rd.map(([h, a]) => ({ h, a, hs:h === 0 ? 30 : 10, as:a === 0 ? 30 : 10, ht:h === 0 ? 5 : 1, at:a === 0 ? 5 : 1 }))); cr.season.round = 5;
  C.advance(); C.advance(); C.open();               // the European Cup, its first round scripted away, then on
  if (cr.phase === 'cup') { while (C.ahead(cr)) { $('cr-play').click(); T.M.half = 2; T.M.score = [20, 3]; T.M.tries = [3, 0]; T.arcade.endHalf(); $('br-go').click(); } C.advance(); C.open(); }
  ok(cr.phase === 'intl' && cr.cup && cr.cup.id === 'world' && json(K.get()) === champCup, `the career's World Cup as England, the Championship's as France, untouched (${cr.phase})`);
  const mine = json(cr.cup);
  K.play(); T.M.half = 2; T.M.score = [17, 10]; T.M.tries = [3, 2]; T.arcade.endHalf();
  const line = $('br-pts').textContent; $('br-go').click();
  ok(K.get().results.length > 0 && json(cr.cup) === mine && shown() === 's-cup' && /Table Point/.test(line), `a Championship cup match goes into its own cup, not the career's, and back to its own hub (${line})`);
  $('cr-play').click(); T.M.half = 2; T.M.score = [24, 0]; T.M.tries = [4, 0]; T.arcade.endHalf();
  const line2 = $('br-pts').textContent, champ2 = json(K.get()); $('br-go').click();
  ok(json(K.get()) === champ2 && cr.cup.results.length > 0 && shown() === 's-career' && /Table Point/.test(line2), `and a career cup match into the career's, back to the career (${line2})`);
  X.save(); C.set(null); K.set(null); X.restore(JSON.parse(memory['tryline.v1']));
  ok(C.get() && C.get().cup && C.get().cup.id === 'world' && K.get() && K.get().id === 'world' && C.get().cup.teams[C.get().cup.user].id === 'ENG' && K.get().teams[K.get().user].id === 'FRA', 'both saved, both read back, each its own');
  X.renderHome();
  ok(/^Career · Pool [ABCD] v /.test($('cont-note').textContent) && $('career-note').hidden && $('b-champ').textContent === 'Continue Championship' && /World Cup.*Pool [ABCD]/.test($('champ-note').innerHTML) && /France/.test($('champ-note').innerHTML), `the menu: Continue on the career (played last) with its line, and Competitions' Continue Championship with its own note (${$('cont-note').textContent} / ${$('champ-note').innerHTML.replace(/<[^>]+>/g, '')})`);
  T.debug.settings().last = 'champ'; X.renderHome();
  ok(/^World Cup · Pool [ABCD] v /.test($('cont-note').textContent) && !$('career-note').hidden && /^Pool [ABCD] v \S/.test($('career-note').textContent), `the World Cup played last: Continue on it, and the Career box's own note, the career's fixture in its Pool (re-pinned 2026-11-11: no year or side, My Team's box names it) (${$('cont-note').textContent} / ${$('career-note').innerHTML.replace(/<[^>]+>/g, '')})`);
  K.set(null); C.set(null); X.save();
}

// Careers saved by every earlier build (tools/fixtures/career-saves.json, made by each build's own code): each loads with what it had,
// and plays on, a match at least, through the same turns as the careers above
{
  const FIX = JSON.parse(fs.readFileSync(new URL('./fixtures/career-saves.json', import.meta.url), 'utf8'));
  const builds = Object.keys(FIX.builds);
  ok(builds.length >= 5 && builds.every(b => Object.keys(FIX.builds[b].careers).length === 10), `careers from ${builds.length} earlier builds, ten shapes each (stages 0 to 4, mid-season and finished)`);
  const bad = [];
  let played = 0;
  for (const rev of builds) for (const [key, old] of Object.entries(FIX.builds[rev].careers)) {
    const tag = rev + ' ' + key, stage = old.stage, done = key.endsWith('done');
    level(false);
    C.set(null); X.restore({ career:JSON.parse(JSON.stringify(old)) });
    const cr = C.get();
    if (!cr) { bad.push(tag + ': not loaded'); continue; }
    const wantClub = stage >= 3 && old.pro ? old.pro : old.club.id;
    if (cr.club.id !== wantClub) bad.push(`${tag}: his club is ${cr.club.id}, not ${wantClub}`);
    if (cr.name !== old.name || cr.pos !== old.pos || cr.num !== old.num || keys.some(k => cr.skills[k] !== Math.round(old.skills[k]))) bad.push(tag + ': his name, position, number or skills changed');
    if ((old.cat === 'women') !== (cr.cat === 'women') || (old.proMode === true) !== (cr.proMode === true)) bad.push(tag + ': Men | Women or My Player changed');
    if (old.life && L.KEYS.some(([k]) => cr.life[k] !== old.life[k])) bad.push(tag + ': the bars changed');
    if (json(cr.totals) !== json(old.totals)) bad.push(tag + ': his totals changed');
    const banked = done && stage < 3 ? 1 : 0;      // a finished Minis, Juniors or County season is banked as it loads
    if (cr.history.length !== old.history.length + banked || old.history.some((h, i) => cr.history[i].name !== h.name || cr.history[i].place !== h.place)) bad.push(`${tag}: the history (${old.history.length} + ${banked}) came back as ${cr.history.length}`);
    if (stage === 4 ? cr.phase !== 'intl' || cr.country !== 'WAL' || !cr.season || cr.season.round !== (done ? 5 : 2) : cr.phase !== 'league') bad.push(`${tag}: ${cr.phase}, ${cr.country}, its season ${cr.season && cr.season.round}`);
    if (stage === 3 && (!cr.season || cr.season.round !== (done ? 5 : 2) || cr.season.teams[0].id !== old.pro)) bad.push(`${tag}: the Pro Club season is not kept`);
    if (stage < 3 && cr.season) bad.push(`${tag}: a Minis, Juniors or County season kept`);
    // and plays on: the hub (a new season drawn for a stage 0 to 2 career), or the end of its season first
    const run = newRun({ label:tag, kids:false, dilemma:'skill', stars:1, country:'WAL', plan:() => ({ want:'win' }) }, cr);
    C.open();
    const n0 = cr.totals.matches;
    for (let t = 0; t < 12 && run.cr.totals.matches < n0 + 2; t++) if (!turn(run)) break;
    if (run.cr.totals.matches < n0 + 2) bad.push(`${tag}: did not play on (${run.cr.totals.matches - n0} matches, ${run.cr.phase}, ${shown()})`);
    else played++;
    for (const b of run.bad) bad.push(tag + ' ' + b);
  }
  ok(!bad.length, `every one loads with its club (his Pro Club side from stage 3), name, skills, bars, totals, history and country, and plays on in a club season (${bad.length ? bad.slice(0, 5).join('; ') : played + ' careers, two matches each'})`);
  C.set(null);
}

// The new screen's labels and its way back
{
  const src = readGameSource(), html = src.slice(src.indexOf('id="s-career-draw"'), src.indexOf('id="s-career-end"'));
  ok(/data-back>Back to Career</.test(html) && /'s-career-draw':\(\) => \$\('cd-back'\)/.test(src), 'the draw screen has Back to Career, where a controller\'s first press lands');
  const small = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'on', 'to', 'in', 'for', 'as', 'at', 'by']);
  const titled = w => w.split(/\s+/).every((x, i) => (i && small.has(x)) || /^[A-Z]/.test(x));
  ok(['Pools', 'Knockouts', 'Series', 'Table', 'Runners-Up', 'Semi-Finalists', 'Quarter-Finalists', 'Pool Stage', 'Series Lost'].every(titled), 'its labels and the cups\' finishes are Title Case');
  ok(!/[←-↙⇐-⇙]/.test(html), 'no arrow glyph on it');
}

// A first call-up in a World Cup year: the country picked, then the World Cup as that country
{
  level(false);
  const cr = C.create({ name:'Rory', pos:'B', num:5, club:club('AYR') }); C.set(cr); cr.year = 4;
  for (const k of keys) cr.skills[k] = 85;
  const c = cr.season; c.results = c.fixtures.map(rd => rd.map(([h, a]) => ({ h, a, hs:h === 0 ? 3 : 20, as:a === 0 ? 3 : 20, ht:0, at:3 }))); c.round = 5;
  C.open();
  ok(shown() === 's-career-end' && $('ce-title').textContent === 'Called Up' && /data-n="SCO"/.test($('ce-body').innerHTML), 'Ayr, year 4, rated: Called Up, the twelve to pick from');
  C.advance('SCO'); C.open();
  ok(cr.country === 'SCO' && cr.phase === 'intl' && cr.cup && cr.cup.id === 'world' && cr.cup.teams[cr.cup.user].id === 'SCO' && $('cr-eyebrow').textContent === 'World Cup · ' + C.ahead(cr).label, `Scotland picked: the World Cup as Scotland (${$('cr-eyebrow').textContent})`);
  C.set(null);
}

await browserChecks();

if (process.env.DEBUG) for (const r of RUNS) {
  console.log('==', r.spec.label, 'first call', r.firstCall, 'matches', r.matches.length, 'real', r.matches.filter(m => m.real).length, 'goldens', r.goldens.join('; '), 'dil', json(r.dilemmas), json(r.bars), 'ovr', C.overall(r.cr.skills));
  console.log(r.phases.join(' | '));
  console.log(json(r.cr.trophies.map(t => t.year + t.kind)), r.trophyRows.at(-1), json(r.offers.map(o => [o.year, o.ovr, o.target.toFixed(1), o.offers])));
  if (process.env.DEBUG === '2') console.log(r.matches.map(m => m.where.replace(/^year /, 'y') + ' E' + m.life.energy + ' M' + m.life.morale + ' S' + m.life.spirit).join('\n'));
  console.log(r.matches.filter(m => m.real).map(m => m.where + ' ' + m.score.join('-') + (m.scripted ? '*' : '') + (m.golden ? 'G' : '') + ' ' + m.line).join('\n'));
}

console.log(`Career seasons: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;

function chromium() {
  const require = createRequire(import.meta.url);
  for (const from of [() => require('playwright'), () => require(path.join(execFileSync('npm', ['root', '-g'], { stdio:['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright'))]) {
    try { return from().chromium; } catch (e) { /* not here */ }
  }
  return null;
}
// Every phase's screens in a browser, at 844x390 and 667x375: the hub of each phase (with a dilemma, and with every kind of trophy in
// two figures), the cup's draw, the screen between phases (a season won, a cup won and lost, the call-up on Men and Women, the Triple
// Crown, a tour), the transfer window (and one with the longest leagues), the full-time card of a cup match, and the hub with the
// longest names (South Africa Women, London North Women: three lines at 667x375 at the hub's size). Each fits without a scroll (the
// league table's own screen excepted), nothing runs off the side, every button is 44px, no name is cut, no word anywhere on it is
// broken across two lines (a bracket's names included), and a fixture's jersey keeps its size and its gap from the name.
// SHOTS=<dir> writes each as int-<state>-<w>x<h>.png.
async function browserChecks() {
  if (process.env.GAME || process.env.NO_BROWSER) { console.log('skip the browser checks (GAME or NO_BROWSER set)'); return; }
  const chrome = chromium();
  if (!chrome) { console.log('skip the browser checks: Playwright is not installed (npm i -g playwright && npx playwright install chromium)'); return; }
  let browser;
  try { browser = await chrome.launch(); } catch (e) { console.log('skip the browser checks: Chromium would not start (' + e.message.split('\n')[0] + ')'); return; }
  const dir = fileURLToPath(new URL('../', import.meta.url));
  const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.png':'image/png', '.webmanifest':'application/manifest+json' };
  const server = http.createServer((req, res) => {
    const file = path.resolve(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type':TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const SAVE = { settings:{ tut:['past', 'pass', 'tackle', 'block', 'scrum', 'lineout', 'goal', 'drop'], coach:false, played:5 } };
  const PRELUDE = `var T = window.__tryline, C = T.career, X = T.teams, K = T.cups, $ = id => document.getElementById(id); C.set(null); T.cups.set(null);
    var club = id => X.NATIONAL.flat().find(t => t.id === id);
    var finishOrder = (cr, order) => { const c = cr.season, rk = i => order.indexOf(i); c.results = c.fixtures.map(rd => rd.map(([h, a]) => (rk(h) < rk(a) ? { h, a, hs:20, as:0, ht:4, at:0 } : { h, a, hs:0, as:20, ht:0, at:4 }))); c.round = 5; };
    var finish = (cr, place) => { const order = [1, 2, 3, 4, 5]; order.splice(place - 1, 0, cr.season.user); finishOrder(cr, order); };
    var rounds = (cr, n) => { const c = cr.season; for (let k = 0; k < n; k++) { c.results.push(c.fixtures[k].map(([h, a]) => ({ h, a, hs:h === 0 ? 24 : 10, as:a === 0 ? 24 : 7, ht:h === 0 ? 4 : 1, at:a === 0 ? 4 : 1 }))); c.round++; } };
    var skillsTo = (cr, v) => { for (const [k] of C.skills()) cr.skills[k] = v; };
    var mk = o => { const cr = C.create({ name:'Alfie', pos:'B', num:7, club:club('BTH'), ...o }); C.set(cr); return cr; };
    var opp = (cr, name) => { const f = C.ahead(cr); f.teams[f.user === f.home ? f.away : f.home].name = name; };   // the next opponent by the longest names, for the fit
    var cupPlay = (cr, us, them) => { const f = C.ahead(cr), home = f.home === f.user; K.cupRecord(cr.cup, home ? { score:[us, them], tries:[Math.floor(us/5), Math.floor(them/5)] } : { score:[them, us], tries:[Math.floor(them/5), Math.floor(us/5)] }); };
    var full = (us, them) => { $('cr-play').click(); const M = T.M; M.half = 2; M.score = [us, them]; M.tries = [Math.floor(us/5), Math.floor(them/5)]; T.arcade.endHalf(); };
    var euro = o => { const cr = mk(o); cr.year = 2; finish(cr, 1); C.advance(); return cr; };
    var world = o => { const cr = mk(o); cr.year = 4; cr.country = 'ENG'; skillsTo(cr, 85); finish(cr, 2); C.advance(); return cr; };
    var tour = o => { const cr = mk({ pos:'F', num:2, club:club('DUB'), ...o }); cr.year = 6; cr.country = 'IRE'; skillsTo(cr, 95); finish(cr, 4); C.advance(); finish(cr, 3); C.advance(); return cr; };`;
  const STATES = {
    'new':`C.newOpen();`,
    'new-women':`var cr = null; C.newOpen(); C.clubPick(X.NATIONAL.flat().find(t => t.name === 'Bloemfontein')); C.catPick(1);`,   // a long club name and a long league on Women
    'look':`C.newOpen(); window.__wait = T.behind.ART.state === 'ready' ? null : T.behind.ART.promise || T.behind.artLoad(); $('cn-look-go').click();`,
    'look-women':`C.newOpen(); C.catPick(1); window.__wait = T.behind.ART.state === 'ready' ? null : T.behind.ART.promise || T.behind.artLoad(); $('cn-look-go').click(); C.lookSet('style', 10); C.lookSet('b', 1.12);`,
    'hub-dilemma':`var cr = mk({}); cr.year = 2; C.open();`,
    'hub-league':`var cr = mk({}); cr.year = 9; rounds(cr, 2); cr.life.done = cr.season.id + ':2'; cr.trophies = [].concat(...['league', 'euro', 'world', 'tour', 'triple'].map(k => Array.from({ length:12 }, (_, i) => ({ kind:k, year:i + 1, name:'Bath' })))); C.open();`,
    'end-league':`var cr = mk({}); cr.year = 2; finish(cr, 1); C.open();`,
    'hub-euro':`var cr = euro({}); C.open();`,
    'draw-euro':`var cr = euro({}); cupPlay(cr, 20, 10); C.open(); $('cr-table').click();`,
    'ft-euro':`var cr = euro({}); C.open(); full(17, 10);`,
    'end-euro':`var cr = euro({}); cupPlay(cr, 20, 10); cupPlay(cr, 20, 10); C.open();`,
    'end-euro-lost':`var cr = euro({ cat:'women' }); cupPlay(cr, 20, 10); cupPlay(cr, 10, 20); C.open();`,
    'callup':`var cr = mk({}); cr.year = 3; skillsTo(cr, 82); finish(cr, 2); C.open();`,
    'callup-women':`var cr = mk({ cat:'women' }); cr.year = 3; skillsTo(cr, 82); finish(cr, 2); C.open();`,
    'hub-intl':`var cr = mk({}); cr.year = 3; skillsTo(cr, 82); finish(cr, 2); C.advance('ENG'); rounds(cr, 1); cr.life.done = cr.season.id + ':1'; C.open();`,
    'end-triple':`var cr = mk({}); cr.year = 3; skillsTo(cr, 82); finish(cr, 2); C.advance('WAL'); var T6 = cr.season.teams, at = id => T6.findIndex(t => t.id === id); finishOrder(cr, [at('FRA'), 0, at('IRE'), at('ENG'), at('SCO'), at('ITA')]); C.open();`,
    'hub-world':`var cr = world({}); C.open();`,
    'draw-world':`var cr = world({}); cupPlay(cr, 30, 0); C.open(); $('cr-table').click();`,
    'ft-world':`var cr = world({}); C.open(); full(10, 10);`,
    'hub-world-ko':`var cr = world({ cat:'women' }); cupPlay(cr, 30, 0); cupPlay(cr, 30, 0); C.open();`,
    'hub-long-cup':`var cr = world({ cat:'women' }); cupPlay(cr, 30, 0); cupPlay(cr, 30, 0); opp(cr, 'South Africa Women'); C.open();`,
    'hub-long-league':`var cr = mk({ cat:'women' }); cr.year = 9; rounds(cr, 1); cr.life.done = cr.season.id + ':1'; opp(cr, 'London North Women'); C.open();`,
    'draw-world-ko':`var cr = world({}); cupPlay(cr, 30, 0); cupPlay(cr, 30, 0); cupPlay(cr, 24, 10); C.open(); $('cr-table').click();`,
    'end-world':`var cr = world({}); for (let i = 0; i < 5 && C.ahead(cr); i++) cupPlay(cr, 30, 0); C.open();`,
    'hub-tour':`var cr = tour({}); cupPlay(cr, 20, 10); C.open();`,
    'draw-tour':`var cr = tour({}); cupPlay(cr, 20, 10); cupPlay(cr, 10, 20); C.open(); $('cr-table').click();`,
    'ft-tour':`var cr = tour({}); C.open(); full(20, 13);`,
    'end-tour':`var cr = tour({ cat:'women' }); cupPlay(cr, 20, 10); cupPlay(cr, 10, 20); cupPlay(cr, 10, 20); C.open();`,
    'transfer':`var cr = mk({}); cr.year = 2; skillsTo(cr, 55); finish(cr, 3); C.advance(); for (let i = 0; i < 40 && cr.offers.length < 3; i++) cr.offers = T.career.offers(cr); C.open();`,
    'transfer-long':`var cr = mk({ cat:'women' }); cr.year = 2; skillsTo(cr, 55); finish(cr, 3); C.advance(); cr.offers = ['Galway', 'Bloemfontein', 'Johannesburg'].map(n => X.NATIONAL.flat().find(t => t.name === n).id); C.open();`,   // the longest leagues, three offers and Stay: the United Rugby Championship, South Africa
  };
  const shots = process.env.SHOTS ? path.resolve(process.env.SHOTS) : null;
  if (shots) fs.mkdirSync(shots, { recursive:true });
  try {
    for (const [w, h] of [[844, 390], [667, 375]]) {
      const ctx = await browser.newContext({ viewport:{ width:w, height:h }, deviceScaleFactor:shots ? 2 : 1, isMobile:true, hasTouch:true, serviceWorkers:'block' });
      const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(s => {
        try { localStorage.setItem('tryline.v1', JSON.stringify(s)); } catch (e) { /* blocked */ }
        let q = 20261108; Math.random = () => { q = q + 0x6D2B79F5 | 0; let t = Math.imul(q ^ q >>> 15, 1 | q); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; };   // the same draws every run
      }, SAVE);
      await page.goto(base + 'index.html', { waitUntil:'load' }); await page.evaluate(() => document.fonts.ready);
      const results = [];
      for (const [name, code] of Object.entries(STATES)) {
        const info = await page.evaluate(async src => {
          (0, eval)(src);
          if (window.__wait) { await window.__wait; window.__wait = null; }   // Your Look's picture: the art, once it is in
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const s = [...document.querySelectorAll('.modal')].find(x => !x.hidden) || [...document.querySelectorAll('.screen')].find(x => !x.hidden);
          if (!s) return { name:null };
          const box = el => el.getBoundingClientRect(), shownEl = el => box(el).width > 0 && getComputedStyle(el).visibility !== 'hidden';
          const over = [...s.querySelectorAll('*')].filter(el => shownEl(el) && (box(el).right > innerWidth + 0.5 || box(el).left < -0.5)).map(el => el.id || el.className);
          const small = [...s.querySelectorAll('button')].filter(shownEl).filter(b => box(b).height < 43.5 || box(b).width < 43.5).map(b => b.id || b.textContent.trim().slice(0, 16));
          const cut = [...s.querySelectorAll('[data-fit]')].filter(shownEl).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim().slice(0, 16));
          // a word broken across two lines, anywhere on the screen (overflow-wrap:anywhere breaks a name rather than let it run over): each
          // word's own boxes, split at spaces and hyphens, must sit on one line
          const walk = document.createTreeWalker(s, NodeFilter.SHOW_TEXT), range = document.createRange();
          for (let n = walk.nextNode(); n; n = walk.nextNode()) {
            if (!n.parentElement || !shownEl(n.parentElement)) continue;
            for (const m of n.data.matchAll(/[^\s\-–]+/g)) {
              range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length);
              if (new Set([...range.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top))).size > 1) cut.push(m[0] + ' broken');
            }
          }
          // a fixture's jersey: its full size, and clear of the name by the design's gap (10px; a squashed wrapper let it run into the name)
          for (const t of [...s.querySelectorAll('.fx-team')].filter(shownEl)) {
            const j = t.querySelector('.jersey'), nm = t.querySelector('[data-fit]');
            if (!j || !nm || !shownEl(j)) continue;
            const jb = box(j), nb = box(nm), gap = t.classList.contains('r') ? jb.left - nb.right : nb.left - jb.right;
            if (jb.width < 33.5 || gap < 8) cut.push(`${nm.textContent.trim().slice(0, 16)} jersey ${Math.round(jb.width)}px, gap ${Math.round(gap)}px`);
          }
          const act = s.querySelector('#cr-play:not([hidden]), #ce-go, #br-go, #cd-back, #cn-go, #ck-back');
          const a = act && box(act);
          const pic = s.id === 's-career-look' ? { art:!document.getElementById('ck-pic').hidden, shirt:!document.getElementById('ck-shirt').hidden } : null;   // Your Look: the art's picture, or his shirt
          return { name:s.id, scroll:s.scrollHeight - s.clientHeight, over:over.slice(0, 4), small:small.slice(0, 4), cut:cut.slice(0, 4), act:a ? a.bottom <= innerHeight + 0.5 && a.top >= 0 : true, pic };
        }, PRELUDE + '\n' + code);
        if (shots) await page.screenshot({ path:path.join(shots, `int-${name}-${w}x${h}.png`) });
        results.push({ state:name, ...info });
        await page.evaluate(() => { const T = window.__tryline; if (T.M && !T.M.demo) T.debug.exitMatch(); document.getElementById('m-break').hidden = true; T.career.set(null); T.cups.set(null); T.debug.goHome(); });
      }
      const want = { new:'s-career-new', look:'s-career-look', hub:'s-career', draw:'s-career-draw', end:'s-career-end', callup:'s-career-end', transfer:'s-career-end', ft:'m-break' };
      const wrong = results.filter(r => r.name !== want[r.state.split('-')[0]]);
      ok(!wrong.length, `${w}x${h}: each state opens its screen (${wrong.map(r => r.state + ' on ' + r.name).join(', ') || results.length + ' states'})`);
      const fits = results.filter(r => r.scroll > 1 || r.over.length || !r.act);
      ok(!fits.length, `${w}x${h}: New Player (Start Career in view), Your Look (Back to New Player in view), every hub, draw, screen between phases, transfer window and cup full-time card fits with no scroll, nothing off the side, its main button in view (${fits.map(r => r.state + ' ' + json([r.scroll, r.over, r.act])).join('; ') || 'all ' + results.length})`);
      const looks = results.filter(r => r.state.startsWith('look'));
      ok(looks.length === 2 && looks.every(r => r.pic && r.pic.art && !r.pic.shirt), `${w}x${h}: Your Look draws his picture from the art (${json(looks.map(r => r.pic))})`);
      const tight = results.filter(r => r.small.length || r.cut.length);
      ok(!tight.length, `${w}x${h}: every button at least 44px, no name cut, no word broken across two lines and every fixture's jersey clear of its name, the trophy row with five kinds in two figures, a tour's Tests and the longest names included (${tight.map(r => r.state + ' ' + json([r.small, r.cut])).join('; ') || 'all'})`);
      // a controller and the keyboard on the draw: the first press lands on Back to Career, B goes back to the hub
      const pad = await page.evaluate(src => {
        (0, eval)(src);
        const T = window.__tryline, out = [];
        T.navMove(0, 0, 0); out.push(T.debug.focus() && T.debug.focus().id);
        T.navBack(0); out.push([...document.querySelectorAll('.screen')].find(x => !x.hidden).id);
        return out;
      }, PRELUDE + '\n' + STATES['draw-world']);
      ok(json(pad) === json(['cd-back', 's-career']), `${w}x${h}: a controller on the draw lands on Back to Career, and Back goes to the hub (${json(pad)})`);
      // New Player and Your Look with a controller or the keyboard: every button reached by moving the ring, Change Look into Your Look,
      // and Back (B, Escape) from Your Look to New Player with the picks kept
      for (const st of ['new', 'look']) {
        const reach = await page.evaluate(async src => {
          (0, eval)(src);
          if (window.__wait) { await window.__wait; window.__wait = null; }
          const T = window.__tryline, s = [...document.querySelectorAll('.screen')].find(x => !x.hidden);
          const all = [...s.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 0), seen = new Set(), todo = [T.navMove(0, 0, 0)];
          while (todo.length) { const el = todo.pop(); if (!el || seen.has(el)) continue; seen.add(el); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { T.home.ring(el); todo.push(T.navMove(0, dx, dy)); } }
          return { screen:s.id, n:all.length, missed:all.filter(b => !seen.has(b)).map(b => b.id || b.textContent.trim() || b.getAttribute('aria-label')) };
        }, PRELUDE + '\n' + STATES[st]);
        ok(reach.n >= (st === 'new' ? 14 : 28) && !reach.missed.length, `${w}x${h}: ${reach.screen}: the ring reaches all ${reach.n} of its buttons (${json(reach.missed)})`);
      }
      const back = await page.evaluate(src => {
        (0, eval)(src);
        const T = window.__tryline, C = T.career, out = [];
        C.lookSet('hair', 5); T.navBack(0); out.push([...document.querySelectorAll('.screen')].find(x => !x.hidden).id, C.draft().look.hair);
        T.home.ring(document.getElementById('cn-look-go')); document.getElementById('cn-look-go').click(); out.push([...document.querySelectorAll('.screen')].find(x => !x.hidden).id);
        return out;
      }, PRELUDE + '\n' + STATES.look);
      ok(json(back) === json(['s-career-new', 5, 's-career-look']), `${w}x${h}: Back from Your Look is New Player with the pick kept, and Change Look goes back in (${json(back)})`);
      // a World Cup's knockouts on the career's draw: the Pools button (its own id, not the Championship hub's) swaps the pools in, Bracket swaps back
      const swap = await page.evaluate(src => {
        (0, eval)(src);
        const b = () => document.getElementById('cd-pools'), out = [b() && b().textContent, !!document.querySelector('#cd-draw .cup-bracket')];
        b().click(); out.push(b() && b().textContent, !!document.querySelector('#cd-draw .cup-pools'));
        b().click(); out.push(b() && b().textContent, !!document.querySelector('#cd-draw .cup-bracket'), document.querySelectorAll('#cup-pools').length);
        return out;
      }, PRELUDE + '\n' + STATES['draw-world-ko']);
      ok(json(swap) === json(['Pools', true, 'Bracket', true, 'Pools', true, 0]), `${w}x${h}: a career's World Cup draw swaps Pools and Bracket with its own button (${json(swap)})`);
      ok(!errors.length, `${w}x${h}: no page errors (${errors.join('; ')})`);
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
}
