// The career ladder, by bot: win rate and top-two rate a stage, male and female. Opt-in, not in the gate: it takes minutes.
// Whole seasons through the real path (Play Match, the scripted bot on your side, the hub's table), the player's skills held at the stage's rating
// so only the sides change. IDLE leaves the bot's hands off for that share of two-second spells, a player well short of a good one, because the full bot wins nearly everything low down.
// node tools/ladder.mjs [stage 0-4] [g 0|1] [seasons]   SEED=n IDLE=0.45 FIX='{"club":"FAR","pro":"BOR","country":"ENG","skill":61}' GAME=path/to/a/snapshot/index.html
process.env.SEED ??= '5';
const { T, reseed, bot } = await import('./harness.mjs');
const C = T.career, X = T.teams, D = T.debug;
const [stage = 0, g = 0, seasons = 20] = process.argv.slice(2).map(Number);
const FIX = JSON.parse(process.env.FIX || '{}'), IDLE = +process.env.IDLE || 0;
const SKILL = FIX.skill ?? [61, 64, 70, 77, 85][stage];             // the rating a player arrives at each stage with: a new player, then each bar
const V = 1 + (SKILL - 40)*98/59;
const s = D.settings(); s.diff = 1; s.half = 0; s.played = 99; s.hints = false;
const inp = T.input;
reseed(+process.env.SEED + stage*100 + g*1000);
let stalls = 0, W = 0, Dr = 0, L = 0, top = 0, pf = 0, pa = 0, sumUs = 0, sumThem = 0, n = 0;
const clubs = X.CLUBS;
for (let i = 0; i < seasons; i++) {
  const club = FIX.club ? X.ALL_TEAMS.find(t => t.id === FIX.club) : clubs[i % clubs.length];
  const cr = C.create({ pos:'B', num:4, club, look:{ g, skin:2, hair:1, style:0, b:1 } });
  cr.stage = stage;
  for (const k of Object.keys(cr.skills)) cr.skills[k] = V;
  if (stage >= 3) { if (FIX.pro) cr.pro = FIX.pro; else C.sign(cr); }
  if (stage === 4) cr.country = FIX.country || (g ? ['ENG', 'FRA', 'IRE', 'ITA', 'SCO', 'WAL'] : ['ENG', 'FRA', 'IRE', 'ITA', 'SCO', 'WAL'])[i % 6];
  C.set(cr);
  C.newSeason(cr);
  while (cr.season.round < 5) {                                    // a cup tie is played but not counted, so a stage reads as its league
    for (const k of Object.keys(cr.skills)) cr.skills[k] = V;
    if (!C.play()) throw new Error('no match');
    const cupTie = !!T.M.careerCup;
    const us = X.overallOf(T.M.nat[0]), them = X.overallOf(T.M.nat[1]);
    let steps = 0, off = false;
    while (!T.M.over && steps < 200000) {
      if (steps % 120 === 0) off = Math.random() < IDLE;
      if (T.M.phase === 'break' && !T.M.over) { document.getElementById('br-go').click(); continue; }   // half time
      if (T.M.phase === 'menu') { document.getElementById(document.getElementById('p-goal').disabled ? 'p-touch' : 'p-goal').click(); continue; }   // the penalty card: at goal when in range
      if (off && !T.M.cut && !T.M.goal) { inp.jx = inp.jy = 0; inp.aPressed = inp.bPressed = inp.cPressed = false; inp.aDown = inp.bDown = inp.cDown = false; }
      else bot(0);
      T.update(T.STEP); steps++;
    }
    const a = T.M.score[0], b = T.M.score[1];
    if (a > b) W++; else if (a < b) L++; else Dr++;
    if (!cupTie) { pf += a; pa += b; sumUs += us; sumThem += them; n++; } else if (a > b) W--; else if (a < b) L--; else Dr--;
    if (!T.M.over) { stalls++; console.error('stalled', T.M.phase, T.M.half, T.M.clock.toFixed(1), JSON.stringify(Object.fromEntries(Object.entries(T.M.cut || {}).filter(([k, v]) => typeof v !== 'object'))), T.M.goal && T.M.goal.stage); T.M.over = true; T.M.half = 2; if (!cupTie) { W -= a > b ? 1 : 0; L -= a < b ? 1 : 0; Dr -= a === b ? 1 : 0; pf -= a; pa -= b; n--; } D.exitMatch(); break; }   // a bot stuck in a close-up: the season is dropped
    D.exitMatch();
  }
  const out = C.outcome(cr);
  if (out && out.top) top++;
}
const pc = v => (100*v/n).toFixed(0).padStart(3);
console.log(`stage ${stage} g${g} idle ${IDLE} skill ${SKILL}${FIX.pro ? ' pro ' + FIX.pro : ''}: ${n} matches  win ${pc(W)}%  draw ${pc(Dr)}%  loss ${pc(L)}%  margin ${((pf - pa)/n).toFixed(1).padStart(6)}  top two ${(100*top/seasons).toFixed(0).padStart(3)}%  overall us ${(sumUs/n).toFixed(1)} them ${(sumThem/n).toFixed(1)}${stalls ? '  stalls ' + stalls : ''}`);
