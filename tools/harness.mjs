// Loads the game's <script> from ../index.html into Node with a stub DOM,
// so the match engine can run headless. Exports the engine handle and a
// scripted "average player" used to check difficulty balance.
import fs from 'fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js = html.match(/<script>([\s\S]*)<\/script>/)[1];

const noop = () => {};
const ctx2d = new Proxy({}, { get: (t, k) => (k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : noop), set: () => true });
const el = () => ({
  style: { setProperty: noop }, classList: { add: noop, remove: noop, toggle: noop }, addEventListener: noop,
  getContext: () => ctx2d, children: [], dataset: {}, querySelectorAll: () => [], appendChild: noop, setPointerCapture: noop,
  set innerHTML(v) {}, get innerHTML() { return ''; }, textContent: '', hidden: false, disabled: false,
});
const els = {};
globalThis.document = { getElementById: id => (els[id] ||= el()), querySelectorAll: () => [], addEventListener: noop, createElement: el, hidden: false };
globalThis.window = globalThis;
globalThis.innerWidth = 844; globalThis.innerHeight = 390; globalThis.devicePixelRatio = 2;
globalThis.addEventListener = noop; globalThis.requestAnimationFrame = noop;
globalThis.localStorage = { getItem: () => null, setItem: noop };
new Function(js)();

export const T = window.__tryline;
const inp = T.input;

// A deliberately ordinary human: runs at the line, swerves from the nearest
// tackler, passes late under pressure, chases the carrier and dives close in.
export function bot() {
  const M = T.M, b = M.ball, c = M.ctrl;
  inp.jx = 0; inp.jy = 0;
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
