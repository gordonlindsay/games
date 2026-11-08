// The merged features working together, which no single feature's suite could prove on its own branch:
// the career's Train runs a real Training Ground drill and its stars come back as skill points; a quit keeps the session;
// the circle's roles train stamina or handling; a drill opened from the career leaves the championship alone.
// node tools/together.mjs   Exits 1 on any failure.
process.env.SEED ??= '31';
const H = await import('./harness.mjs');
const { T } = H;
const P = T.practice, X = T.teams, C = T.career, D = T.debug, $ = id => document.getElementById(id);
let passed = 0, failed = 0;
const ok = (test, message) => { if (test) passed++; else { failed++; console.log('FAIL ' + message); } };
const play = (bot, max = 9000) => { let n = 0; while (P.state() && !P.state().done && n < max) { bot(P.state()); T.update(T.STEP); n++; } return P.state(); };
const catcher = st => { const E = st.egg, b = T.M.ball; if (E && E.stage === 'fly' && b.z > 0.5 && b.z < 2) { E.me.x = b.x; E.me.y = b.y; } };
localStorage.setItem = () => {};

const fresh = () => { const cr = C.create({ pos:'B', num:5, club:X.CLUBS[0] }); C.set(cr); return cr; };
const champBefore = JSON.stringify(X.champ());

// 1. Train opens a real drill, its stars come back as points on the drill's skill, once
{
  const cr = fresh(), before = cr.skills.handling;
  C.train('egg');
  ok(P.state() && P.state().id === 'egg' && P.state().opts && P.state().opts.onDone === C.trainDone, 'the career\'s Train opens the real Bouncy Egg drill, with the career as its caller');
  ok($('pr-select').textContent === 'Back to Career', 'the drill\'s leave button reads Back to Career');
  $('pr-retry').click();
  const s = play(catcher);
  ok(s && s.done && s.stars >= 1, `the drill is played to its result (${s && s.stars} stars)`);
  const stars = s.stars;
  $('pr-select').click(); $('pr-select').click();
  const now = C.get();
  ok(!P.state() && now.trained === true, 'leaving the result hands back to the career and uses the round\'s session');
  ok(now.skills.handling > before, `the stars raise Handling (${before} to ${now.skills.handling}, ${stars} stars)`);
  ok(!$('s-career').hidden, 'and the career hub is on screen');
  const again = now.skills.handling;
  C.trainDone({ id:'egg', stars:3, success:true, skill:'handling' });
  ok(C.get().skills.handling === again, 'one session a round: a second hand-back gives nothing');
}

// 2. Backing out of a drill keeps the session
{
  const cr = fresh(), before = JSON.stringify(cr.skills);
  C.train('cones');
  ok(P.state() && P.state().id === 'cones', 'Train opens Cones');
  $('pr-select').click(); $('pr-select').click();
  ok(!P.state() && C.get().trained === false && JSON.stringify(C.get().skills) === before, 'backing out from the ready card gives nothing and keeps the session');
}

// 3. Pass Around the Circle trains Stamina as Runner, Handling as Passer
{
  const run = role => {
    const cr = fresh(), before = { ...cr.skills };
    C.train('circle');
    $(role === 'runner' ? 'pr-runner' : 'pr-passer').click();
    const st = play(st => { const ci = st.circle; if (ci && ci.role === 'passer' && ci.cue && ci.cue.ready) T.input.aPressed = true; }, 12000);
    if (st && !st.done && typeof T.drills.finish === 'function') T.drills.finish(true);
    if (P.state()) { $('pr-select').click(); $('pr-select').click(); }
    const after = C.get().skills;
    return { trained:C.get().trained, gain:Object.keys(after).filter(k => after[k] !== before[k]) };
  };
  const r = run('runner'), p = run('passer');
  ok(r.trained && r.gain.join() === 'stamina', `the Runner trains Stamina (${r.gain.join() || 'nothing'})`);
  ok(p.trained && p.gain.join() === 'handling', `the Passer trains Handling (${p.gain.join() || 'nothing'})`);
}

// 4. The career's drills never touch the championship, and every drill is offered from a career's first year (club seasons have no Minis)
{
  ok(JSON.stringify(X.champ()) === champBefore, 'the championship save is untouched by career training');
  const cr = fresh();
  ok(cr.year === 1 && C.drills(cr).some(d => d.id === 'scrum') && C.drills(cr).length === T.drills.DRILLS.length, 'every drill is offered in the first year, Driving included');
  C.set(null);
}

// 5. every stylesheet's braces balance: merging the features once dropped two closing braces at the ends of their blocks,
// which silently nested every later rule (the Kids home layout among them) inside a media query
{
  const fs = await import('node:fs');
  for (const f of ['styles.css', 'practice.css']) {
    const css = fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    let depth = 0, low = 0; for (const ch of css) { if (ch === '{') depth++; else if (ch === '}') { depth--; low = Math.min(low, depth); } }
    ok(depth === 0 && low === 0, `${f}: every brace is closed (${depth} open)`);
  }
}

// 6. pausing a drill: its name, not a match score, and a way back to where it came from, not Quit Match
{
  P.start('cones'); $('pr-retry').click(); T.update(T.STEP); D.pause();
  ok($('pz-score').textContent === 'Cones' && $('pz-quit').textContent === 'Back to Training', `a paused drill reads its name and Back to Training (${$('pz-score').textContent}, ${$('pz-quit').textContent})`);
  $('pz-quit').click();
  ok(/^(Tap|Press) Again to Leave$/.test($('pz-quit').textContent), `the second press is asked for as Leave (${$('pz-quit').textContent})`);
  $('pz-quit').click();
  ok(!P.state() && $('m-pause').hidden && !$('s-home').hidden, 'and it goes back to the Training Ground (the home\'s Training Drills)');
  const cr = fresh(); C.train('cones'); $('pr-retry').click(); T.update(T.STEP); D.pause();
  ok($('pz-quit').textContent === 'Back to Career', 'a drill from the career leaves Back to Career');
  $('pz-quit').click(); $('pz-quit').click();
  ok(!P.state() && !$('s-career').hidden && C.get().trained === false, 'which hands back to the hub with the session kept');
  C.set(null); D.goHome();
}

// 7. no hint card behind a drill's ready or result card, and no open-play card over a drill's own cue
{
  const s = D.settings(), keep = s.hints; s.hints = true;
  P.start('scrum'); D.syncHints('', '');
  ok(T.M.cut && T.M.cut.kind === 'scrum' && !D.hintShown()[0], 'Driving stages its scrum under the ready card with no Scrum card showing');
  $('pr-retry').click(); D.syncHints('Push', null);
  ok(D.hintShown()[0] && D.hintShown()[0].title === 'Scrum', 'once the drill starts, the Scrum card');
  P.finish(true, 'Done', 3); D.syncHints('', '');
  ok(!D.hintShown()[0], 'and none behind the result card');
  P.leave();
  P.start('pass'); D.hintOpen()[0].cur = 'sprint'; D.syncHints('Pass', 'Kick');
  ok(!D.hintShown()[0], 'none behind the Two-on-One\'s ready card');
  $('pr-retry').click();
  const H0 = D.hintOpen()[0]; H0.cur = 'sprint'; H0.until = T.M.dclock + 3; D.syncHints('Pass', 'Kick');
  ok(!D.hintShown()[0], 'a Sprint card due in the Two-on-One is not shown over its cue');
  let seen = 0;
  for (let i = 0; i < 400 && P.state() && !P.state().done; i++) { T.update(T.STEP); D.syncHints('Pass', 'Kick'); if (D.hintShown()[0]) seen++; }
  ok(seen === 0 && D.hintOpen()[0].shown.size === 0, `no open-play card over the drill's cue (${seen} frames)`);
  P.leave(); s.hints = keep; D.goHome();
}

// 8. at Kids, the Kicking and Driving drills take a Kids match's help; the rest play as on Easy
{
  const s = D.settings(), keep = [s.kids, s.diff];
  T.kids.segSet(0);
  P.start('kick');
  ok(T.M.kids === true && !/Steer/.test($('pr-cue').textContent) && /^Five kicks, each further out and windier\. Hold /.test($('pr-cue').textContent), `Kids: Kicking is a Kids match, its aim set, and says so (${$('pr-cue').textContent})`);
  P.leave(); P.start('scrum'); ok(T.M.kids === true, 'Kids: so is Driving'); P.leave();
  const easy = ['egg', 'circle', 'cones', 'tackle', 'defend', 'pass'].filter(id => { P.start(id); const k = T.M.kids; P.leave(); return k !== false; });
  ok(easy.length === 0, `Kids: every other drill plays on Easy (${easy.join(', ') || 'all'})`);
  ok(s.kids === true && s.diff === 0, 'and leaving puts Kids back');
  T.kids.segSet(1); P.start('kick');
  ok(T.M.kids === false && /Steer the arrow/.test($('pr-cue').textContent), 'Easy: Kicking is as it was, the arrow yours to steer');
  P.leave(); s.kids = keep[0]; s.diff = keep[1]; D.goHome();
}

// 9. a career on an imported club never draws that club's built-in twin (Farnham RFC is Farnham)
{
  const club = { id:'FAN', name:'Farnham RFC', kit:'#111111', trim:'#eeeeee', custom:true, pace:3, power:3, handling:3, kicking:3, stamina:3 };
  let twin = 0; for (let i = 0; i < 60; i++) { const cr = C.create({ pos:'B', num:9, club }); for (const s of [cr.season.teams, C.opponents(cr)]) if (s.some(t => t.name === 'Farnham')) twin++; }
  ok(twin === 0, `Farnham RFC's league seasons on Local never meet Farnham (${twin} of 120 draws)`);
  const mine = C.create({ pos:'B', num:9, club:X.CLUBS[2] }), o = C.opponents(mine);
  ok(o.length === 5 && !o.some(t => t.name === X.CLUBS[2].name), 'a built-in club still draws five others');
  C.set(null);
}

// 10. the tackle close-up starts the runner clear of the Tackle button (88px, 20px in from the right edge)
{
  const K = T.drills.TACKLE;
  for (const [W, Ht] of [[667, 375], [844, 390], [932, 430], [1280, 720]]) {
    const kd = T.drills.tackleRunScale(W, Ht), k = Ht*0.40/1.8, right = W*0.32 + K.side*kd + Ht*0.18;
    ok(kd <= k + 1e-9 && right <= W - 128 + 1e-6 && kd >= k*0.4 - 1e-9, `${W}x${Ht}: his bands start at ${right.toFixed(0)}px, the button at ${W - 108} (${(kd/k*100).toFixed(0)}% of the men's scale)`);
  }
}

// 11. the layout fixes: home notes one line on a phone held sideways, the player card's eyebrow one line
{
  const fs = await import('node:fs');
  const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const sideways = [...css.matchAll(/@media \(orientation:landscape\) and \(max-height:560px\)\{([\s\S]*?)\n\}/g)].map(m => m[1]).join('\n');
  ok(/\.home \.resume-note\{white-space:nowrap;overflow:hidden;text-overflow:ellipsis/.test(sideways) && !/\.rn-name\{display:none\}/.test(css), 'sideways, a home note is one line; under a button the panel\'s full width now, it keeps the team\'s name');
  ok(/\.cr-who \.eyebrow\{white-space:nowrap\}/.test(css), 'the player card\'s Forward · No. 1 stays one line');
  const cr = fresh(); C.open();
  ok(/<p class="eyebrow" data-fit>Back · No\. 5<\/p>/.test($('cr-card').innerHTML), 'and careerFit fits it');
  C.set(null); D.goHome();
}

// 12. Reset Kids Level in the Grown-Ups panel (the owner's ask, 2026-11-08): only once the hidden Kids rating has moved, behind the
// grown-up check, and back to the start of the Kids scale when a grown-up answers it; a cancel leaves it where it was
{
  const S = T.store, K = T.kids, s = D.settings();
  const pass = () => { const g = K.gate(); if (!g) return false; for (const d of g.answer) K.type(d); return true; };
  const keep = s.kidsR;
  S.setNative(true); S.setStarted(true);
  s.kidsR = 0; S.open({ mode:'grown' });
  ok($('st-reset').hidden && !$('st-links').classList.contains('three'), 'Reset Kids Level waits until the Kids rating has moved');
  S.close();
  s.kidsR = 0.42; S.open({ mode:'grown' });
  const page = (await import('node:fs')).readFileSync(new URL('../index.html', import.meta.url), 'utf8');   // the harness's stand-in elements carry no text: read the label from the page
  ok(!$('st-reset').hidden && /<button class="btn" id="st-reset" hidden>Reset Kids Level<\/button>/.test(page) && $('st-links').classList.contains('three'), 'once it has, Grown-Ups shows Reset Kids Level under Privacy and Support');
  $('st-reset').click();
  ok(!!K.gate() && $('m-store').hidden, 'the reset asks a grown-up first, the panel hidden behind the check');
  $('pg-cancel').click();
  ok(s.kidsR === 0.42 && !$('m-store').hidden, 'a cancelled check leaves the rating as it was and brings the panel back');
  $('st-reset').click(); pass();
  ok(s.kidsR === 0 && !$('m-store').hidden && $('st-msg').textContent === 'Kids level is back to the start.' && $('st-reset').hidden, 'a grown-up\'s answer puts the rating back to the start, says so, and the button goes');
  S.close();
  S.open({ mode:'unlock', feature:'champ' }); s.kidsR = 0.3; S.close(); S.open({ mode:'unlock', feature:'champ' });
  ok($('st-reset').hidden || $('st-links').hidden, 'an Unlock card never offers it');
  S.close();
  s.kidsR = keep; S.setNative(null); S.setStarted(false);
}

// 13. Move Up to Easy (the owner, 2026-11-08): offered in Grown-Ups, with a dot on the home's Grown-Ups button, only after five big wins
// in a row (by more than KIDS_EASY.margin tries) at the top of the Kids scale, behind the grown-up check; a sibling's rating is kept
{
  const S = T.store, K = T.kids, s = D.settings(), E = K.KIDS_EASY;
  const pass = () => { const g = K.gate(); if (!g) return false; for (const d of g.answer) K.type(d); return true; };
  const keep = { kids:s.kids, diff:s.diff, kidsR:s.kidsR, kidsTop:s.kidsTop };
  ok(E.top === 0.95 && E.margin === 4 && E.run === 5, 'five wins in a row by 5 or more tries, at 0.95 or above');
  // the run, through the real kidsAdapt at full time of a Kids match
  const kidsFull = (tries, r) => { T.newMatch(X.CLUBS[0], X.CLUBS[1], { halfLen:60, diff:0, headless:true, humans:[true, false], kids:true, kidsR:r }); T.M.tries = tries; T.M.score = [tries[0]*7, tries[1]*7]; T.M.over = true; return K.adapt(); };
  s.kids = true; s.diff = 0; s.kidsTop = 0;
  for (let i = 0; i < 4; i++) kidsFull([7, 1], 1);
  ok(s.kidsTop === 4 && !K.ready(), 'four big wins at the top are not yet enough');
  kidsFull([5, 1], 1);
  ok(s.kidsTop === 0, 'a win by four tries breaks the run');
  for (let i = 0; i < 5; i++) kidsFull([8, 2], 0.6);
  ok(s.kidsTop === 0, 'big wins below the top of the scale do not count');
  s.kidsR = 1; for (let i = 0; i < 5; i++) kidsFull([8, 2], 1);
  ok(s.kidsTop >= 5 && K.ready(), 'five in a row at the top: ready');
  S.setNative(true); S.setStarted(true); D.goHome();
  ok($('b-grown').classList.contains('note'), 'the home\'s Grown-Ups button carries a dot');
  S.open({ mode:'grown' });
  ok(!$('st-easy').hidden && !$('st-reset').hidden && $('st-links').classList.contains('four'), 'Grown-Ups offers Move Up to Easy beside Reset Kids Level, in halves');
  $('st-easy').click();
  ok(!!K.gate(), 'it asks a grown-up first');
  $('pg-cancel').click();
  ok(s.kids === true && K.ready(), 'a cancelled check changes nothing');
  $('st-easy').click(); pass();
  ok(s.kids === false && s.diff === 0 && s.kidsTop === 0 && s.kidsR === 1 && $('st-msg').textContent === 'Difficulty is now Easy.' && $('st-easy').hidden, 'a grown-up\'s answer moves Difficulty to Easy, keeps the Kids rating, and says so');
  S.close(); D.goHome();
  ok(!$('b-grown').classList.contains('note'), 'and the dot goes');
  s.kids = true; s.kidsTop = 6; S.open({ mode:'grown' }); $('st-reset').click(); pass();
  ok(s.kidsR === 0 && s.kidsTop === 0, 'Reset Kids Level clears the run too');
  S.close();
  Object.assign(s, keep); S.setNative(null); S.setStarted(false); D.goHome();
}

console.log(`Together: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
