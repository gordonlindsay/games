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

// 4. The career's drills never touch the championship, and Driving waits for the Juniors
{
  ok(JSON.stringify(X.champ()) === champBefore, 'the championship save is untouched by career training');
  const cr = fresh();
  ok(!C.drills(cr).some(d => d.id === 'scrum'), 'Driving is hidden in the Minis');
  cr.stage = 1;
  ok(C.drills(cr).some(d => d.id === 'scrum') && C.drills(cr).length === T.drills.DRILLS.length, 'and every drill is offered from the Juniors');
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

console.log(`Together: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
