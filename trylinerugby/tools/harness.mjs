// Loads the game's <script> from ../index.html into Node with a stub DOM,
// so the match engine can run headless. Exports the engine handle, a scripted
// "average player", and its duel behaviour. SEED=n makes runs repeatable.
import fs from 'fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
let js = html.match(/<script>([\s\S]*)<\/script>/)[1];
// BURST='{ ok:[1.12,2.0], perfect:[1.18,2.5], knock:[1.08,1.2] }' tries other duel bursts without editing the game
if (process.env.BURST) js = js.replace(/const BURST = \{[^}]*\};/, `const BURST = ${process.env.BURST};`);

if (process.env.SEED) {                           // mulberry32, swapped in before the game captures Math.random
  let a = +process.env.SEED >>> 0;
  Math.random = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const noop = () => {};
const ctx2d = new Proxy({}, { get: (t, k) => (k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop: noop }) : noop), set: () => true });
const el = () => ({
  style: { setProperty: noop }, classList: { add: noop, remove: noop, toggle: noop }, addEventListener: noop,
  getContext: () => ctx2d, children: [], dataset: {}, querySelectorAll: () => [], appendChild: noop, setPointerCapture: noop, insertAdjacentHTML: noop, setAttribute: noop,
  set innerHTML(v) {}, get innerHTML() { return ''; }, textContent: '', hidden: false, disabled: false,
});
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

// A deliberately ordinary human: runs at the line, swerves from the nearest
// tackler, passes late under pressure, chases the carrier and dives close in.
export function bot() {
  const M = T.M, b = M.ball, c = M.ctrl;
  inp.jx = 0; inp.jy = 0;
  if (M.phase === 'cut' && M.cut && M.cut.duel) { duelBot(M.cut); return; }
  if (M.phase === 'goal' && M.goal.stage === 'aim') { inp.aPressed = true; return; }
  if (!c || M.phase !== 'play') return;
  if (b.state === 'held' && b.carrier === c) {
    let near = 99, ny = 0;
    for (const q of M.players) {
      if (q.team !== 1 || q.down > 0) continue;
      const dx = q.x - c.x, dy = q.y - c.y, d = Math.hypot(dx, dy);
      if (dx > -1 && d < near) { near = d; ny = dy; }
    }
    const jx = 1, jy = near < 8 ? (ny > 0 ? -0.7 : 0.7) : (c.y < 10 ? 0.5 : c.y > 60 ? -0.5 : 0);
    const m = Math.hypot(jx, jy); inp.jx = jx / m; inp.jy = jy / m;
    if (near < 2.6 && c.hold > 0.4 && Math.random() < 0.12) inp.aPressed = true;
  } else if (b.state === 'held' && b.carrier.team === 1) {
    const t = b.carrier, dx = t.x - c.x, dy = t.y - c.y, d = Math.hypot(dx, dy) || 1;
    inp.jx = dx / d; inp.jy = dy / d;
    if (d < 2.4 && Math.random() < 0.2) inp.aPressed = true;
    if (d > 12 && Math.random() < 0.03) inp.bPressed = true;
  } else {
    const tx = b.state === 'air' ? b.f.x1 : b.x, ty = b.state === 'air' ? b.f.y1 : b.y;
    const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
    if (d > 0.5) { inp.jx = dx / d; inp.jy = dy / d; }
  }
}
