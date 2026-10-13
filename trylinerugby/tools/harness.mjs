// Loads the game's <script> from ../index.html into Node with a stub DOM,
// so the match engine can run headless. Exports the engine handle, a scripted
// "average player", and its duel and goal-kick behaviour. SEED=n makes runs repeatable.
import fs from 'fs';

// GAME=path loads another copy of the game (a pinned snapshot, or a scratch copy with one line reverted)
const html = fs.readFileSync(process.env.GAME ? process.env.GAME : new URL('../index.html', import.meta.url), 'utf8');
let js = html.match(/<script>([\s\S]*)<\/script>/)[1];
// BURST='{ ok:[1.12,2.0], perfect:[1.18,2.5], knock:[1.08,1.2] }' tries other duel bursts without editing the game
if (process.env.BURST) js = js.replace(/const BURST = \{[^}]*\};/, `const BURST = ${process.env.BURST};`);
// GKTUNE='{"band":[0.15,0.13,0.10]}' tries other goal-kick levers the same way
if (process.env.GKTUNE) js = js.replace('// GKTUNE', 'Object.assign(KICK, ' + process.env.GKTUNE + ');');
// CONTACT='{"bind":0.3}' RUCK='{"flatBase":0.09}' SPRINT='{"mul":[1.25,1.25,1.2]}' deep-merge into the contact, ruck and Sprint levers
{
  const tune = ['CONTACT', 'RUCK', 'SPRINT'].filter(k => process.env[k]).map(k => `deep(${k}, ${process.env[k]});`).join(' ');
  if (tune) js = js.replace('// CONTACT_TUNE', `{ const deep = (a, b) => { for (const [k, v] of Object.entries(b)) a[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? deep(Object.assign({}, a[k]), v) : v; return a; }; ${tune} }`);
}

let seedState = null;
const mulberry = () => { seedState = seedState + 0x6D2B79F5 | 0; let t = Math.imul(seedState ^ seedState >>> 15, 1 | seedState); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
if (process.env.SEED) { seedState = +process.env.SEED >>> 0; Math.random = mulberry; }   // swapped in before the game captures Math.random
export function reseed(s) { if (seedState == null) throw new Error('reseed needs SEED'); seedState = s >>> 0; }
let rndN = 0;                                     // every Math.random the game draws is counted, so a test can prove a stretch draws none
{ const base = Math.random; Math.random = () => { rndN++; return base(); }; }
export const rndCalls = () => rndN;
const noop = () => {};
// every ctx method call and property set reaches globalThis.__ctxSpy(name, args) when a test installs one
const spy = k => (...args) => { if (globalThis.__ctxSpy) globalThis.__ctxSpy(k, args); };
const ctx2d = new Proxy({}, { get: (t, k) => (k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop: noop }) : k === 'globalAlpha' ? 1 : spy(k)),
  set: (t, k, v) => { if (globalThis.__ctxSpy) globalThis.__ctxSpy(k, [v]); return true; } });
// an element stub that remembers its classes and custom properties, so a test can read what updateHud set
const el = () => {
  const cls = new Set(), props = {};
  return {
    style: { setProperty: (k, v) => { props[k] = String(v); }, getPropertyValue: k => props[k] || '' },
    classList: { add: (...a) => a.forEach(c => cls.add(c)), remove: (...a) => a.forEach(c => cls.delete(c)), toggle: (c, on) => { if (on == null) on = !cls.has(c); if (on) cls.add(c); else cls.delete(c); return on; }, contains: c => cls.has(c) },
    addEventListener: noop, getContext: () => ctx2d, children: [], dataset: {}, querySelectorAll: () => [], appendChild: noop, setPointerCapture: noop, insertAdjacentHTML: noop, setAttribute: noop,
    set innerHTML(v) {}, get innerHTML() { return ''; }, textContent: '', hidden: false, disabled: false,
  };
};
const els = {};
globalThis.document = { getElementById: id => (els[id] ||= el()), querySelectorAll: () => [], addEventListener: noop, createElement: el, createTextNode: () => ({}), hidden: false };
globalThis.window = globalThis;
globalThis.innerWidth = 844; globalThis.innerHeight = 390; globalThis.devicePixelRatio = 2;
globalThis.addEventListener = noop; globalThis.requestAnimationFrame = noop;
globalThis.localStorage = { getItem: () => null, setItem: noop };
globalThis.getComputedStyle = () => ({ fontSize: "24px" });
globalThis.matchMedia = () => ({ matches: false, addEventListener: noop, addListener: noop });
new Function(js)();

export const T = window.__tryline;
const inp = T.input;
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const D2R = Math.PI/180;

// An average human in a duel: aims at the middle of the window with some
// spread, misses 5% outright, and bites on a feint, step or dummy half the time.
export function duelBot(d, sigma = +process.env.DUEL_SIGMA || 0.095) {
  if (!d.bot) {
    const centre = (d.win[0] + d.win[1]) / 2;
    const tricked = d.open0 !== d.open || d.stepDir || d.dummy || d.fakeAt != null;
    d.bot = { at: centre + gauss() * sigma, none: Math.random() < 0.05, fooled: !!tricked && Math.random() < 0.5,
      misread: d.kind === 'pass' && Math.random() < 0.10, done: false };
    if (d.bot.fooled && d.kind !== 'past' && d.kind !== 'pass') d.bot.at = centre - 0.30;
  }
  if (d.bot.done || d.bot.none || d.res || d.t < 0.3 || d.t < d.bot.at) return;
  d.bot.done = true;
  if (d.kind === 'past') inp.flick = d.bot.fooled ? d.open0 : d.open;
  else if (d.kind === 'pass') {
    // Pass when he comes at you, Dummy when he drifts to the runner; a fake or a misread flips it
    let dummy = !!d.drift;
    if (d.bot.fooled || d.bot.misread) dummy = !dummy;
    if (dummy) inp.bPressed = true; else inp.aPressed = true;
  } else inp.aPressed = true;
}

// An average human at a goal kick, driving the real input path. He reads the
// wind as well as his aid lets him, steers the arrow to his target, then holds
// Kick and lets go near the band's centre with a 60ms spread; 4% of releases
// are fumbles at a random moment. CPU kicks are watched, never skipped.
// o.m / o.aim force the release level or the aim target (tests).
export function kickBot(c, o = {}) {
  const g = c.g;
  if (g.watch || c.after || c.t <= 0.22) return;
  let b = g.bot;
  if (!b) {
    const ideal = T.kick.aimFor(g, g.ctr), line = g.aid !== 'path';
    const comp = !line ? 1 : g.di >= 2 ? 0.55 + 0.35*gauss() : 0.75 + 0.25*gauss();
    const sA = !line ? 0.35 : g.di >= 2 ? 0.9 : 0.7;
    const aim = o.aim != null ? o.aim : Math.max(-30*D2R, Math.min(30*D2R, ideal*comp + sA*D2R*gauss()));
    b = g.bot = { aim, tRel: 0 };
  }
  if (g.stage === 'aim') {
    const err = b.aim - g.aim;
    if (Math.abs(err) >= 0.003) { inp.jx = Math.sign(err) * Math.max(0.15, Math.min(1, Math.abs(err) / 0.05)); return; }
    inp.jx = 0;
    if (!inp.aDown) { b.tRel = planRelease(g, o, 0.060); inp.aPressed = inp.aDown = true; }   // an ignored release re-plans
  } else if (g.stage === 'power') {
    if (g.pt + 1.5*T.STEP >= b.tRel) inp.aDown = false;   // update adds a step before it sees the release, so this strikes on the step nearest tRel
  }
}
function planRelease(g, o, sig) {
  if (o.m != null) return o.m * g.fill + 1e-6;
  let t = g.ctr * g.fill + 0.012 + sig * gauss();
  if (Math.random() < 0.04) t = Math.random() * g.fill * 1.15;
  return t;
}
// The same man at a drop goal (Phase 2): the small button, timed from the meter's start, a wider aim spread.
export function dropBot(c, o = {}) {
  const g = c.g;
  if (c.after || c.t <= 0.22) return;
  let b = g.bot;
  if (!b) {
    const ideal = T.kick.aimFor(g, g.ctr);
    b = g.bot = { aim: o.aim != null ? o.aim : Math.max(-30*D2R, Math.min(30*D2R, ideal + 1.0*D2R*gauss())), tRel: 0 };
  }
  const err = b.aim - g.aim;
  inp.jx = Math.abs(err) >= 0.003 ? Math.sign(err) * Math.max(0.15, Math.min(1, Math.abs(err) / 0.05)) : 0;
  if (g.stage === 'wait' && !inp.bDown) { b.tRel = planRelease(g, o, 0.065); inp.bPressed = inp.bDown = true; }
  else if (g.stage === 'hold') { if (!b.tRel) b.tRel = planRelease(g, o, 0.065); if (g.pt + 1.5*T.STEP >= b.tRel) inp.bDown = false; }   // as kickBot: the step nearest tRel
}

// A deliberately ordinary human: runs at the line, swerves from the nearest
// tackler, passes late under pressure, chases the carrier and dives close in.
// Contact habits (HABITS=0 gives the old bot exactly, which mashes Pass in a tackle):
//   held in a tackle he never presses Pass, and offloads on 40% of Offload cues 0.08–0.20s in;
//   he holds Sprint to run down a CPU carrier who is clean through, 2.5–12m away from level or behind,
//   and with the ball when the nearest defender ahead is over 6m off, letting go inside 2.5m.
// NOSPRINT=1 never touches Sprint, NOSPRINTBALL=1 never sprints with the ball, NODIVE=1 never presses Tackle.
export const HABITS = process.env.HABITS !== '0' && !!T.contact;
const NOSPRINT = !!process.env.NOSPRINT, NOSPRINTBALL = !!process.env.NOSPRINTBALL, NODIVE = !!process.env.NODIVE;
const OFFLOAD_P = process.env.BOT_OFF != null ? +process.env.BOT_OFF : 0.4;
export function bot() {
  const M = T.M, b = M.ball, c = M.ctrl;
  inp.jx = 0; inp.jy = 0;
  if (M.phase === 'cut' && M.cut && M.cut.duel) { duelBot(M.cut); return; }
  if (M.phase === 'cut' && M.cut && M.cut.kind === 'goal') { (M.cut.g.type === 'drop' ? dropBot : kickBot)(M.cut); return; }
  if (!c || M.phase !== 'play') { if (HABITS) inp.cDown = false; return; }
  const S = HABITS ? M.spr[0] : null, k = HABITS ? M.contact : null, held = !!(k && k.c === c);
  let hold = false;
  if (b.state === 'held' && b.carrier === c) {
    let near = 99, ny = 0;
    for (const q of M.players) {
      if (q.team !== 1 || q.down > 0) continue;
      const dx = q.x - c.x, dy = q.y - c.y, d = Math.hypot(dx, dy);
      if (dx > -1 && d < near) { near = d; ny = dy; }
    }
    const jx = 1, jy = near < 8 ? (ny > 0 ? -0.7 : 0.7) : (c.y < 10 ? 0.5 : c.y > 60 ? -0.5 : 0);
    const m = Math.hypot(jx, jy); inp.jx = jx / m; inp.jy = jy / m;
    if (held) {                                                 // in a tackle: the offload, on its cue, or nothing
      if (k.botAt == null) k.botAt = T.contact.canOffload(k) && Math.random() < OFFLOAD_P ? 0.08 + Math.random() * 0.12 : -1;
      if (k.botAt > 0 && k.t >= k.botAt) { inp.aPressed = true; k.botAt = -1; }
    } else if (near < 2.6 && c.hold > 0.4 && Math.random() < 0.12) inp.aPressed = true;
    if (HABITS && !NOSPRINT && !NOSPRINTBALL && !held) hold = S.p === c ? near > 2.5 : (near > 6 && S.m > 0.5);
  } else if (b.state === 'held' && b.carrier.team === 1) {
    const t = b.carrier, dx = t.x - c.x, dy = t.y - c.y, d = Math.hypot(dx, dy) || 1;
    inp.jx = dx / d; inp.jy = dy / d;
    if (!NODIVE && d < 2.4 && Math.random() < 0.2) inp.aPressed = true;
    if (d > 12 && Math.random() < 0.03) inp.bPressed = true;
    if (HABITS && !NOSPRINT) hold = S.p === c ? (d > 1.5 && d < 14) : (dx >= -1 && d > 2.5 && d < 12 && T.contact.ahead(t, 0) <= 1);
  } else {
    const tx = b.state === 'air' ? b.f.x1 : b.x, ty = b.state === 'air' ? b.f.y1 : b.y;
    const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
    if (d > 0.5) { inp.jx = dx / d; inp.jy = dy / d; }
  }
  if (HABITS) { if (hold && !inp.cDown) inp.cPressed = true; inp.cDown = hold; }
}
