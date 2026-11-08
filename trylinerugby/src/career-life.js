/* =========================================================
   Career life: Energy, Morale and Team Spirit, and the dilemmas between matches.

   The rules, all of them here (the numbers are in CAREER_LIFE):
   - The career keeps `life: { energy, morale, spirit, done }`: three bars, each a whole number from 0 to 100, and the key of
     the last dilemma answered. A new career, or one saved before the bars, starts at Energy 80, Morale 60, Team Spirit 50.
   - A dilemma comes before three of a season's five rounds, always including the first, never two rounds running without
     one (CAREER_DILEMMA_PLANS). Which rounds, and which dilemmas, follow from the season's id (a hash, never rnd()), so a
     reload shows the same card. Every option gives something: training a skill for Energy, resting Energy, going out with
     the team Team Spirit and Morale. The hub shows the card in place of the fixture and Play Match until one is picked;
     the rules themselves never stop a match (a match played without an answer just skips that round's dilemma).
   - Each round, at full time: Energy comes back by a fifth of what is missing (at least 5); Morale goes a fifth of the way
     back to 50, then a win adds 8, a draw 2, a loss takes 6, and each of his tries, tackles and goals adds 1 (3 at most);
     Team Spirit fades 4, and 1 more for every 10 it stands above 50 (9 at 100), then adds 1 for every six passes he throws
     or is thrown and 2 for each try he scores (6 at most): the more he is in the game the less it fades, but the higher it
     is the faster it goes, so only going out with the team keeps it high.
     A training session costs 8 Energy.
   - In a career match the bars are read once, at careerArm (M.careerLife), so nothing changes mid-match:
     Energy under 60 takes up to 2.5 points off his Stamina ability for the match (all of it at 0, down to 0), so his
     sprint runs out sooner and he fades more late in a half (careerSprintDrain and careerFade, as ever).
     Morale plays his skills up to 5% higher at 100 or 5% lower at 0 (none at 50), through the career shade.
     Team Spirit, in a career match you play as the whole team (not Pro Mode, M.careerPro): his support running sits up
     to 70% closer to the ball at 100 (70% further out at 0), and the knock-on chance on a pass to or from him is up to
     30% lower (30% higher at 0). At Team Spirit 50 neither moves anything.
   - Energy 60 or more, Morale 50 and Team Spirit 50 change nothing at all: such a career match plays exactly as before
     the bars (tools/career-life.mjs pins it). No other match ever reads them.
   ========================================================= */
const CAREER_LIFE = {
  start:{ energy:80, morale:60, spirit:50 },
  energy:{ tired:60, most:2.5, back:0.2, backMin:5, train:-8 },   // tired: below this he loses Stamina; most: points lost at 0; back: share of the gap regained a round
  morale:{ shade:0.05, drift:0.2, win:8, draw:2, loss:-6, deed:1, deedCap:3 },
  spirit:{ fade:-4, high:10, passes:6, tryPts:2, cap:6, support:0.7, lat:3.5, back:1.2, hands:0.3 },   // high: 1 more off for every this many above 50; passes: passes involving him for each point; support: how much closer (or further) he runs; lat / back: never tighter than this to the ball
};
const CAREER_LIFE_KEYS = [['energy', 'Energy'], ['morale', 'Morale'], ['spirit', 'Team Spirit']];
const CAREER_LIFE_COL = { energy:'#c4e65a', morale:'#ff7eb6', spirit:'#3ad6c0' };   // a colour per bar, on its chips too, never one a skill uses
/* The dilemmas. from: the first stage it can come up (0 Minis, 1 Juniors, 2 County). Every option's fx is skill points (Pace to
   Stamina) and bar points; each option has something good in it. The question is the card's heading, the names its buttons.
   Two options of two chips each, and a name that fits one line of its button at 667x375 (tools/career-life.mjs measures them):
   a third of either, or a name on two lines, and the hub scrolls there. A name a device renders wider steps down (careerFit). */
const CAREER_DILEMMAS = [
  { id:'pizza', from:0, q:'Training or Pizza Night?', opts:[{ name:'Extra Training', fx:{ handling:2, energy:-15 } }, { name:'Team Pizza Night', fx:{ spirit:12, morale:6 } }] },
  { id:'captain', from:0, q:'Kick With the Captain?', opts:[{ name:'Kicking Practice', fx:{ kicking:2, energy:-10 } }, { name:'Rest', fx:{ energy:20 } }] },
  { id:'videos', from:0, q:'Videos or Video Games?', opts:[{ name:'Match Videos', fx:{ handling:2, energy:-5 } }, { name:'Video Games', fx:{ morale:8, energy:10 } }] },
  { id:'film', from:0, q:'Early Night or Film Night?', opts:[{ name:'Early Night', fx:{ energy:20 } }, { name:'Team Film Night', fx:{ spirit:12, morale:6 } }] },
  { id:'beach', from:0, q:'Beach Day or Tackling?', opts:[{ name:'Team Beach Day', fx:{ spirit:10, morale:6 } }, { name:'Tackle Drills', fx:{ power:2, energy:-15 } }] },
  { id:'park', from:0, q:'Lie In or Touch Rugby?', opts:[{ name:'Lie In', fx:{ energy:20 } }, { name:'Touch Rugby', fx:{ spirit:10, pace:1 } }] },
  { id:'party', from:0, q:'Party or Practice?', opts:[{ name:'Birthday Party', fx:{ spirit:12, morale:6 } }, { name:'Goal Kicking', fx:{ kicking:2, energy:-10 } }] },
  { id:'gym', from:1, q:'Rest or Gym?', opts:[{ name:'Rest Day', fx:{ energy:20 } }, { name:'Gym Session', fx:{ power:2, energy:-15 } }] },
  { id:'minis', from:1, q:'Help Coach the Minis?', opts:[{ name:'Help Coach', fx:{ spirit:8, morale:8 } }, { name:'Rest', fx:{ energy:20 } }] },
  { id:'physio', from:2, q:'Physio or Bike Ride?', opts:[{ name:'Physio Session', fx:{ energy:20 } }, { name:'Bike Ride', fx:{ stamina:2, energy:-10 } }] },
  { id:'school', from:2, q:'Autographs or Sprints?', opts:[{ name:'Sign Autographs', fx:{ morale:10, spirit:4 } }, { name:'Extra Sprints', fx:{ pace:2, energy:-15 } }] },
  { id:'swim', from:2, q:'Swim or Long Run?', opts:[{ name:'Team Swim', fx:{ spirit:8, energy:10 } }, { name:'Long Run', fx:{ stamina:2, energy:-15 } }] },
];
/* Which of a season's rounds have a dilemma: three of five, the first always, so no two rounds running go without one,
   across a season's end too. */
const CAREER_DILEMMA_PLANS = [[1, 0, 1, 0, 1], [1, 0, 1, 1, 0], [1, 1, 0, 1, 0]];

/* ---------- the bars ---------- */
const careerLifeNew = () => ({ ...CAREER_LIFE.start, done:'' });
function careerLifeClean(l) {                         // the save's life, put right: an old career, or a broken one, gets the start
  const o = l && typeof l === 'object' && !Array.isArray(l) ? l : {}, out = {};
  for (const [k] of CAREER_LIFE_KEYS) out[k] = typeof o[k] === 'number' && Number.isFinite(o[k]) ? clamp(Math.round(o[k]), 0, 100) : CAREER_LIFE.start[k];
  out.done = typeof o.done === 'string' && /^[a-zA-Z0-9-]{1,80}:[0-4]$/.test(o.done) ? o.done : '';
  return out;
}
/* The readers (0 to 1): in a career match the bars as they were at kick-off, otherwise the career's own; 0.5 with no career. */
function careerLifeNow(k) {
  const l = M && M.career && M.careerLife ? M.careerLife : career && career.life;
  return l && Number.isFinite(l[k]) ? clamp(l[k], 0, 100)/100 : 0.5;
}
function careerSpirit() { return careerLifeNow('spirit'); }   // declarations, not consts: a typeof guard elsewhere works wherever its file sits
function careerMorale() { return careerLifeNow('morale'); }
function careerEnergy() { return careerLifeNow('energy'); }
const careerLifeTired = e => { const E = CAREER_LIFE.energy; return e < E.tired ? (E.tired - clamp(e, 0, 100))/E.tired*E.most : 0; };   // Stamina points off for Energy e
function careerLifeAdd(cr, fx) {                     // fx into his skills and bars, clamped: what actually moved, { gains, life }
  if (!cr.life) cr.life = careerLifeNew();            // a career object made without its bars (cleanCareer always gives them)
  const gains = {}, life = {}, keys = careerSkillKeys();
  for (const [k, v] of Object.entries(fx || {})) {
    if (!Number.isFinite(v)) continue;
    if (keys.includes(k)) { const b = cr.skills[k]; cr.skills[k] = clamp(b + v, 1, 99); if (cr.skills[k] !== b) gains[k] = cr.skills[k] - b; }
    else if (CAREER_LIFE_KEYS.some(([q]) => q === k)) { const b = cr.life[k]; cr.life[k] = clamp(Math.round(b + v), 0, 100); if (cr.life[k] !== b) life[k] = cr.life[k] - b; }
  }
  return { gains, life };
}

/* ---------- the dilemmas ---------- */
function careerLifeHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
function careerDilemmaPlan(cr) {                     // the season's five rounds: a dilemma or null each, from the season's id alone
  const c = cr && cr.season; if (!c) return [null, null, null, null, null];
  const plan = CAREER_DILEMMA_PLANS[careerLifeHash(c.id + '|plan') % CAREER_DILEMMA_PLANS.length];
  const pool = CAREER_DILEMMAS.filter(d => (cr.stage || 0) >= d.from);
  let x = careerLifeHash(c.id + '|pick') || 1;
  for (let i = pool.length - 1; i > 0; i--) {         // a shuffle by xorshift on the hash: no rnd(), so the season's draw and the matches are untouched
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    const j = x % (i + 1); [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  let n = 0;
  return plan.map(on => (on ? pool[n++] : null));
}
const careerDilemmaKey = cr => cr.season.id + ':' + cr.season.round;
function careerDilemma(cr) {                         // this round's dilemma, while it waits for an answer
  const c = cr && cr.season;
  if (!c || c.round >= 5 || !cr.life || cr.life.done === careerDilemmaKey(cr)) return null;
  return careerDilemmaPlan(cr)[c.round];
}
function careerLifeChoose(i) {                       // an option picked on the hub: its effects, once a round
  const cr = career, d = careerDilemma(cr), o = d && d.opts[i];
  if (practice || !o) return false;
  const moved = careerLifeAdd(cr, o.fx);
  cr.life.done = careerDilemmaKey(cr);
  careerLast = { kind:'dilemma', gains:moved.gains, life:moved.life };
  save();
  return true;
}

/* ---------- between matches ---------- */
function careerLifeTrain(cr) {                       // a training session finished: it costs a little Energy (careerTrainDone)
  const moved = careerLifeAdd(cr, { energy:CAREER_LIFE.energy.train });
  if (careerLast) careerLast.life = moved.life;
}
function careerLifeRound(cr, deeds) {                // full time in a career match, once the result is in (careerRecordResult)
  if (!cr.life) cr.life = careerLifeNew();
  const l = cr.life, E = CAREER_LIFE.energy, R = CAREER_LIFE.morale, S = CAREER_LIFE.spirit, diff = M.score[0] - M.score[1];
  const dd = deeds || {}, did = ['tries', 'tackles', 'goals'].reduce((a, k) => a + Math.max(0, Math.floor(+dd[k] || 0)), 0);
  const st = M.careerLifeStats || {}, inv = Math.floor((st.passes || 0)/S.passes) + Math.max(0, Math.floor(+dd.tries || 0))*S.tryPts;
  const moved = careerLifeAdd(cr, {
    energy:Math.max(E.backMin, Math.round((100 - l.energy)*E.back)),
    morale:-Math.round((l.morale - 50)*R.drift) + (diff > 0 ? R.win : diff < 0 ? R.loss : R.draw) + Math.min(R.deedCap, did*R.deed),
    spirit:S.fade - Math.floor(Math.max(0, l.spirit - 50)/S.high) + Math.min(S.cap, inv),   // the higher it is, the faster it fades: his part in a match never holds it up alone
  });
  if (careerLast) careerLast.life = moved.life;
  return moved.life;
}

/* ---------- a career match ---------- */
function careerLifeArm() {                           // careerArm, once M.careerNat is set: the bars as they are now, for the whole match
  const l = career && career.life;
  M.careerLife = l ? { energy:l.energy, morale:l.morale, spirit:l.spirit } : null;
  M.careerLifeStats = { passes:0 };
  if (!M.careerLife || !M.careerNat) return;
  const m = (M.careerLife.morale - 50)/50;           // Morale: his skills up to 5% up or down, through the same shade as his rating
  if (m) for (const k of careerSkillKeys()) {
    const v = +career.skills[k] || CAREER_BASE;
    M.careerNat[k] = clamp(M.careerNat[k] + CAREER_SHADE*(careerAbil(v*(1 + CAREER_LIFE.morale.shade*m)) - careerAbil(v)), 1, 5);
  }
  const tired = careerLifeTired(M.careerLife.energy);   // Energy: tired legs, through his Stamina (careerFade and careerSprintDrain read it)
  if (tired) M.careerNat.stamina = Math.max(0, M.careerNat.stamina - tired);   // down to 0, below the scale: a tired man is less than a weak one
}
const careerLifeTeam = () => !!(M.career && M.careerLife && !M.careerPro);   // the Team Spirit effects here are the whole-team game's; Pro Mode has its own
function careerLifePass(from, to) {                  // doPass, in a career match: a pass he throws or is thrown counts, and the flight remembers who threw it
  const me = M.careerP; if (!me) return;
  if (M.ball.f) M.ball.f.lifeFrom = from === me;
  if (M.careerLifeStats && (from === me || to === me)) M.careerLifeStats.passes++;
}
function careerLifeHands(p, kind, f) {               // catchBall's knock-on chance, times this: surer on a pass to or from him with the team behind him
  if (kind !== 'pass' || !careerLifeTeam() || !(p === M.careerP || (f && f.lifeFrom))) return 1;
  return 1 - CAREER_LIFE.spirit.hands*(M.careerLife.spirit - 50)/50;
}
/* computeTargets, in a career match: while a teammate has the ball (or his pass is in the air to someone else) and the computer
   runs him, his support line is pulled towards the ball with Team Spirit, or pushed out without it. Still behind the ball,
   never tighter than CAREER_LIFE.spirit.lat across or .back behind, and nothing at all at Team Spirit 50. */
function careerLifeSupport(T) {
  const me = M.careerP; if (!me || !careerLifeTeam() || M.phase !== 'play') return;
  const s = (M.careerLife.spirit - 50)/50, t = T.get(me); if (!s || !t) return;
  const b = M.ball, S = CAREER_LIFE.spirit;
  let fx, fy;
  if (b.state === 'held' && b.carrier && b.carrier.team === me.team && b.carrier !== me) { fx = b.carrier.x; fy = b.carrier.y; }
  else if (b.state === 'air' && b.f && b.f.kind === 'pass' && b.f.team === me.team && b.f.target !== me) { fx = b.f.x1; fy = b.f.y1; }
  else return;
  const d = dirOf(me.team), back = (fx - t.x)*d, lat = t.y - fy, f = 1 - S.support*s;
  if (back < 0.5) return;                            // a man level with the ball or ahead of it is not in the support line
  const near = (v, min) => (v*f >= min || f >= 1 ? v*f : Math.min(v, min));   // closer, but never tighter than min (and never pushed out by it)
  const nb = near(back, S.back), nl = Math.sign(lat)*near(Math.abs(lat), S.lat);
  T.set(me, { ...t, x:clamp(fx - d*nb, 1, 119), y:clamp(fy + nl, 3, 67) });
}

/* ---------- the hub ---------- */
function careerLifeChip(k, v) {                      // "Energy −15", "Pace +2": a coloured chip, the sign always shown
  const name = (CAREER_LIFE_KEYS.find(([q]) => q === k) || careerSkills().find(([q]) => q === k) || [k, k])[1];
  const col = CAREER_LIFE_COL[k] || CAREER_COL[k] || 'var(--chalk)';
  return `<span class="cr-chip" style="--k:${col}">${name} ${v > 0 ? '+' : '−'}${Math.abs(v)}</span>`;
}
function careerLifeBarsHtml(cr) {                    // under the skill bars: Energy, Morale and Team Spirit, each a thin bar, its label and what last moved it
  const l = cr.life || careerLifeNew(), g = (careerLast && careerLast.life) || {};
  return `<div class="cr-life">${CAREER_LIFE_KEYS.map(([k, label]) => {
    const v = l[k], dv = g[k];
    return `<div class="cr-lf" style="--k:${CAREER_LIFE_COL[k]}"><span class="lbl" data-fit>${label}</span><span class="bar" aria-hidden="true"><i style="width:${v}%"></i></span><b>${v}</b><em${dv < 0 ? ' class="dn"' : ''}>${dv ? (dv > 0 ? '+' : '−') + Math.abs(dv) : ''}</em></div>`;
  }).join('')}</div>`;
}
function careerDilemmaHtml(d) {
  return `<h3 class="cr-q" data-fit>${esc(d.q)}</h3><div class="cr-opts" style="--n:${d.opts.length}">${d.opts.map((o, i) =>
    `<button class="btn cr-opt" data-o="${i}"><span class="nm" data-fit>${esc(o.name)}</span><span class="cr-chips">${Object.entries(o.fx).map(([k, v]) => careerLifeChip(k, v)).join('')}</span></button>`).join('')}</div>`;
}
/* renderCareer's last step: the bars on the card, and this round's dilemma in place of the fixture and Play Match until it is answered. */
function careerLifeRender(cr) {
  $('cr-card').innerHTML += careerLifeBarsHtml(cr);
  const d = careerDilemma(cr), box = $('cr-dilemma');
  box.hidden = !d; $('cr-next').hidden = $('cr-play').hidden = !!d;
  if (d) $('cr-line').hidden = true;                // what it takes to go up comes back with Play Match: the card needs the room at 667x375
  box.innerHTML = d ? careerDilemmaHtml(d) : '';
  for (const b of box.querySelectorAll('[data-o]')) b.addEventListener('click', () => careerLifePick(+b.dataset.o));
}
function careerLifePick(i) {                         // a tap on an option: its effects, then the hub with the fixture and Play Match back
  if (!careerLifeChoose(i)) return false;
  const had = !!focusEl;
  renderCareer(); careerFit($('s-career'));
  if (had) setFocus($('cr-play'));                  // a controller's ring was on the option, which is gone: it goes to Play Match
  return true;
}
{ const base = DEFAULT_FOCUS['s-career']; DEFAULT_FOCUS['s-career'] = () => (careerDilemma(career) && $('cr-dilemma').querySelectorAll('.btn')[0]) || base(); }   // a dilemma waiting: the first press lands on its first option
