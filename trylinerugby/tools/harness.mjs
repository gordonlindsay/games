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
// CONTACT='{"bind":0.3}' RUCK='{"flatBase":0.09}' SPRINT='{"mul":[1.25,1.25,1.2]}' RUNON='{"cpu":0.6}' MOVES='{"step":{"push":4}}' DUEL_SLOW='{"rate":1}' deep-merge into the contact, ruck, Sprint, passing, open-play move and duel slow-motion levers
{
  const tune = ['CONTACT', 'RUCK', 'SPRINT', 'RUNON', 'MOVES', 'DUEL_SLOW'].filter(k => process.env[k]).map(k => `deep(${k}, ${process.env[k]});`).join(' ');
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
// an element stub that remembers its classes, custom properties and click listeners, so a test can read what updateHud set and
// press a card's buttons (el.click() runs the game's own handlers); document.querySelectorAll knows the modals and the screens by id
const el = id => {
  const cls = new Set(), props = {}, L = {}; let html = '';
  return {
    id, style: { setProperty: (k, v) => { props[k] = String(v); }, getPropertyValue: k => props[k] || '' },
    classList: { add: (...a) => a.forEach(c => cls.add(c)), remove: (...a) => a.forEach(c => cls.delete(c)), toggle: (c, on) => { if (on == null) on = !cls.has(c); if (on) cls.add(c); else cls.delete(c); return on; }, contains: c => cls.has(c) },
    addEventListener: (type, fn) => { (L[type] ||= []).push(fn); }, click() { for (const fn of L.click || []) fn({ preventDefault: noop }); },
    fire(type, ev) { for (const fn of L[type] || []) fn(Object.assign({ preventDefault: noop }, ev)); },   // any listener the game added (the stick zone's pointer events, say), with the event a test shapes
    getContext: () => ctx2d, children: [], dataset: {}, querySelectorAll: () => [], appendChild: noop, setPointerCapture: noop, insertAdjacentHTML: noop, setAttribute: noop,
    set innerHTML(v) { html = String(v); }, get innerHTML() { return html; },   // kept, so a test can read the markup the game wrote (the tutorial's keycaps)
    rect: null, getBoundingClientRect() { return this.rect || { left:0, top:0, right:0, bottom:0, width:0, height:0 }; },   // no layout here: a test sets el.rect to a measured box where the game reads one (the hints card under the plates)
    textContent: '', hidden: false, disabled: false,
  };
};
const els = {};
const MODALS = ['m-pen', 'm-break', 'm-pause', 'm-tut'], SCREENS = ['s-home', 's-teams', 's-build', 's-hub', 's-help', 's-join'];
// the home and team screens' On | Off rows (.seg[data-key]): one stub a row, with its data-key and two child buttons, so the game wires its handlers and a test can press Hints On and Off
const SEGS = [...html.matchAll(/<div class="seg" data-key="([a-z]+)">/g)].map(m => { const seg = el('seg-' + m[1]); seg.dataset.key = m[1]; seg.children = [el('seg-' + m[1] + '-0'), el('seg-' + m[1] + '-1')]; return seg; });
for (const s of [0, 1]) { const seg = els['pz-h' + s] = el('pz-h' + s); seg.children = [el('pz-h' + s + '-0'), el('pz-h' + s + '-1')]; }   // the pause card's Hints rows have their On and Off buttons, so the game wires them and a test can press one
globalThis.document = { getElementById: id => (els[id] ||= el(id)), querySelectorAll: sel => (sel === '.modal' ? MODALS : sel === '.screen' ? SCREENS : []).map(id => (els[id] ||= el(id))).concat(sel === '.seg[data-key]' ? SEGS : []), addEventListener: noop, createElement: () => el(''), createTextNode: () => ({}), hidden: false };
globalThis.window = globalThis;
globalThis.innerWidth = 844; globalThis.innerHeight = 390; globalThis.devicePixelRatio = 2;
// window listeners are kept and never fired on their own: fire('gamepadconnected', { gamepad }) or fire('blur') drives them from a test
const listeners = {};
globalThis.addEventListener = (type, fn) => { (listeners[type] ||= []).push(fn); };
export const fire = (type, ev) => { for (const fn of listeners[type] || []) fn(ev || {}); };
// padStub([gp, ...]) is what navigator.getGamepads() returns from then on: plain objects shaped like a Gamepad ({ index, mapping, buttons:[{ pressed, value }], axes, connected })
export function padStub(pads) { navigator.getGamepads = () => pads; }
globalThis.requestAnimationFrame = noop;
globalThis.localStorage = { getItem: () => null, setItem: noop };
globalThis.getComputedStyle = () => ({ fontSize: "24px" });
globalThis.matchMedia = () => ({ matches: false, addEventListener: noop, addListener: noop });
new Function(js)();

export const T = window.__tryline;
if (T.debug.TUT_IDS) T.debug.settings().tut = T.debug.TUT_IDS.slice(); else T.debug.settings().duelSeen = T.debug.settings().kickSeen = true;   // the tools play as a player who has had the tutorial: no moment pauses, no first-time aid (tutorial.mjs empties it where it tests them); a GAME= snapshot from before the tutorial gets its old flags set the same way
export const inputs = T.inputs;                   // one slot a seat; T.input is slot 0
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
  const slot = T.sides.inputOf(d.own);               // the timer acts from the owner's slot
  if (d.kind === 'past') slot.flick = d.bot.fooled ? d.open0 : d.open;
  else if (d.kind === 'pass') {
    // Pass when he comes at you, Dummy when he drifts to the runner; a fake or a misread flips it
    let dummy = !!d.drift;
    if (d.bot.fooled || d.bot.misread) dummy = !dummy;
    if (dummy) slot.bPressed = true; else slot.aPressed = true;
  } else slot.aPressed = true;
}

// An average human at a goal kick, driving the real input path. He reads the
// wind as well as his aid lets him, steers the arrow to his target, then holds
// Kick and lets go near the band's centre with a 60ms spread; 4% of releases
// are fumbles at a random moment. CPU kicks are watched, never skipped.
// o.m / o.aim force the release level or the aim target (tests).
export function kickBot(c, o = {}) {
  const g = c.g, inp = c.inp || T.input;              // the kicker's slot
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
  const g = c.g, inp = c.inp || T.input;              // the kicker's slot
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

// Two player's close-up bots (twoplayer.mjs drives them explicitly; bot() below is one player's and is left exactly as it was).
// ownerBot: duelBot's timing on the timer's slot, with a reaction model: what the screen shows registers with him after a lag of
// N(react, sd) seconds, and he acts on the stance he had registered by his press, re-timing his press when a step or a dummy he
// has registered moves the window. 5% never press; 10% misread a Key Pass.
const shownOpen = c => (c.feintAt != null && c.t < c.feintAt + 0.06 ? c.open0 : c.open);   // the guarded side as drawn (the feint's animation is 0.12s; he reads it half way)
const shownDrift = c => (c.driftAt != null && c.t >= c.driftAt) || (c.fakeAt != null && c.t >= c.fakeAt && c.t < c.fakeAt + 0.26);   // a drift, or a fake while it still looks like one
export function ownerBot(c, o = {}) {
  const react = o.react == null ? 0.25 : o.react, sd = o.sd == null ? 0.05 : o.sd;
  if (!c.obot) c.obot = { noise: gauss()*(o.sigma || 0.095), none: Math.random() < 0.05, lag: Math.max(0.06, react + gauss()*sd), done:false, hist:[], centre:null, at:0, misread: c.kind === 'pass' && Math.random() < 0.10 };
  const b = c.obot;
  b.hist.push({ t:c.t, open:shownOpen(c), drift:shownDrift(c), centre:c.centre });   // what the screen shows, step by step
  let known = b.hist[0]; for (const h of b.hist) { if (h.t <= c.t - b.lag) known = h; else break; }   // the latest frame old enough to have registered
  if (known.centre !== b.centre) { b.centre = known.centre; b.at = known.centre + b.noise; }
  if (b.done || b.none || c.res || c.t < 0.3 || c.t < b.at) return;
  b.done = true;
  const slot = T.sides.inputOf(c.own);
  if (c.kind === 'past') slot.flick = known.open;
  else if (c.kind === 'pass') { let dummy = known.drift; if (b.misread) dummy = !dummy; if (dummy) slot.bPressed = true; else slot.aPressed = true; }
  else slot.aPressed = true;
}
// chooserBot: the other player's hand through the real input path (dev 'stick' writes his slot's stick, 'keys' presses his seat's own
// sideways keys through onKey). A stance from early in the cut; `trick` of the time a feint (Get Past) or a fake (Key Pass) that
// switches up to `late` seconds before the lock; a Tackle step 30%, a Block dummy 15%. { idle:true } never touches the slot.
export function chooserBot(c, o = {}) {
  if (o.idle || c.locked) return;
  const seat = T.sides.seatOfTeam(1 - c.own), inp = T.sides.inputOf(1 - c.own);
  if (!c.cbot) {
    const trick = o.trick == null ? 0.3 : o.trick, late = o.late == null ? 0.1 : o.late;
    c.cbot = { side: Math.random() < 0.5 ? -1 : 1, drift: Math.random() < 0.5, trick: Math.random() < trick, at: c.lock - Math.random()*late, step: Math.random() < 0.3, dummy: Math.random() < 0.15,
      dir: Math.random() < 0.5 ? -1 : 1, start: 0.04 + Math.random()*0.12, dev: o.dev || 'stick', key:null, pressed:false };
  }
  const b = c.cbot, t = c.t;
  const hand = x => {                                      // -1, 0, 1 through the chosen device
    if (b.dev === 'keys') {
      const sch = T.debug.seatScheme(seat), codes = sch === 'right' ? ['ArrowLeft', 'ArrowRight'] : ['KeyA', 'KeyD'], want = x < 0 ? codes[0] : x > 0 ? codes[1] : null;
      if (want === b.key) return;
      if (b.key) T.onKey({ code:b.key }, false);
      if (want) T.onKey({ code:want }, true);
      b.key = want;
    } else inp.jx = x;
  };
  if (c.kind === 'block') { if (b.dummy && !b.pressed && t >= b.start) { inp.bPressed = true; b.pressed = true; } return; }
  if (c.kind === 'tackle') { if (b.step && t >= (b.trick ? b.at : b.start)) hand(b.dir); return; }   // a trick step comes just before the lock, so the lock sweep can see it
  if (t < b.start) { hand(0); return; }
  const sw = b.trick && t >= b.at;
  if (c.kind === 'past') hand(sw ? -b.side : b.side);
  else { const drift = sw ? b.drift : (b.trick ? !b.drift : b.drift); hand(drift ? c.side : -c.side); }
}
export function chooserRelease(c) { const b = c && c.cbot; if (b && b.key) { T.onKey({ code:b.key }, false); b.key = null; } }   // a key the bot still holds at the end of a duel
// scrumBot(side, rate, hitP): a hit on Set with probability hitP (0.05 ± 0.08s after it), then taps at `rate` a second. He still holds the stick forward, as a player might; since 2026-10-17 it plays no part
export function scrumBot(side, rate = 6, hitP = 0.7) {
  const c = T.M.cut, inp = T.sides.inputOf(side);
  if (!c || c.kind !== 'scrum' || c.result || !inp) return;
  const s = (c.sbot ||= [null, null]);
  if (!s[side]) s[side] = { hit: Math.random() < hitP, hitAt: 1.45 + gauss()*0.08, hitDone:false, next: 1.5 + Math.random()/rate };
  const b = s[side]; inp.jx = side === 0 ? 1 : -1; inp.jy = 0;
  if (b.hit && !b.hitDone && c.t >= b.hitAt) { inp.aPressed = true; b.hitDone = true; b.next = c.t + 1/rate; return; }
  if (rate > 0 && c.t >= 1.4 && c.t >= b.next) { inp.aPressed = true; b.next = c.t + 1/rate; }
}
// lineBot(side, sigma): one Jump, at the perfect moment with a spread of sigma seconds
export function lineBot(side, sigma = 0.10) {
  const c = T.M.cut, inp = T.sides.inputOf(side);
  if (!c || c.kind !== 'lineout' || c.winner != null || !inp) return;
  const s = (c.lbot ||= [null, null]);
  if (!s[side]) s[side] = { at: c.arrive - 0.57 + gauss()*sigma, done:false };
  const b = s[side]; if (!b.done && c.jump[side] == null && c.t >= b.at) { inp.aPressed = true; b.done = true; }
}

// A deliberately ordinary human: runs at the line, swerves from the nearest
// tackler, passes late under pressure, chases the carrier and dives close in.
// Contact habits (HABITS=0 gives the old bot exactly, which mashes Pass in a tackle):
//   held in a tackle he never presses Pass, and offloads on 40% of Offload cues 0.08–0.20s in;
//   he holds Sprint to run down a CPU carrier who is clean through, 2.5–12m away from level or behind,
//   and with the ball when the nearest defender ahead is over 6m off, letting go inside 2.5m.
// NOSPRINT=1 never touches Sprint, NOSPRINTBALL=1 never sprints with the ball, NODIVE=1 never presses Tackle.
// The open-play moves (off unless asked, so the baseline bot is the bot it always was): MOVE_BOT=dummy pulls the stick back and on once
// a carry, half the time, when the nearest man ahead is 3.5-7m off and the ring is on a teammate; MOVE_BOT=step flicks across away from
// a tackler 1.6-3.4m off, once per approach, half the time; MOVE_BOT=both does both. MOVE_P=0.5 is the chance of each.
export const HABITS = process.env.HABITS !== '0' && !!T.contact;
const NOSPRINT = !!process.env.NOSPRINT, NOSPRINTBALL = !!process.env.NOSPRINTBALL, NODIVE = !!process.env.NODIVE;
const OFFLOAD_P = process.env.BOT_OFF != null ? +process.env.BOT_OFF : 0.4;
const MOVE_BOT = process.env.MOVE_BOT || '', MOVE_P = process.env.MOVE_P != null ? +process.env.MOVE_P : 0.5;
const MOVE_STEP = MOVE_BOT === 'step' || MOVE_BOT === 'both', MOVE_DUMMY = MOVE_BOT === 'dummy' || MOVE_BOT === 'both';
const moveState = [null, null];                           // per seat: the carrier it is tracking, the men it has already stepped for, whether it has dummied this carry, and the gesture under way
function moveHabit(side, c, inp, dir) {                   // after bot() has set the stick for a carrier: a scripted flick or pull-back, on the stick the bot writes
  const M = T.M, G = (moveState[side] ||= { carrier:null, seen:new Set(), dummied:false, g:null });
  if (G.carrier !== c) { G.carrier = c; G.seen = new Set(); G.dummied = false; G.g = null; }
  if (!G.g) {
    let nearQ = null, nd = 99, ahead = 99;
    for (const q of M.players) { if (q.team === side || q.down > 0) continue; const dd = Math.hypot(q.x - c.x, q.y - c.y); if ((q.x - c.x)*dir > -0.5 && dd < nd) { nd = dd; nearQ = q; } if ((q.x - c.x)*dir > 0.5) ahead = Math.min(ahead, dd); }
    if (MOVE_STEP && nearQ && nd >= 1.6 && nd <= 3.4 && c.side <= -0.9 && !G.seen.has(nearQ)) { G.seen.add(nearQ); if (Math.random() < MOVE_P) G.g = { kind:'step', k:0, s:nearQ.y > c.y ? -1 : 1, L0:inp.jy }; }
    else if (MOVE_DUMMY && !G.dummied && ahead >= 3.5 && ahead <= 7 && T.contact.pickReceiver(c, inp.jy)) { G.dummied = true; if (Math.random() < MOVE_P) G.g = { kind:'dummy', k:0, L0:inp.jy }; }
  }
  const g = G.g; if (!g) return;
  const k = g.k++;
  if (g.kind === 'step') {                                 // three steps to 0.85 across, held 0.2s, then the bot's own steering again
    if (k >= 15) { G.g = null; return; }
    const L = k < 3 ? g.L0 + (g.s*0.85 - g.L0)*(k + 1)/3 : g.s*0.85;
    inp.jy = L; inp.jx = dir*Math.sqrt(Math.max(0, 1 - L*L));
  } else {                                                 // F 1 to -0.3 over three steps, held two, back over four
    if (k >= 9) { G.g = null; return; }
    const F = k < 3 ? 1 - 1.3*(k + 1)/3 : k < 5 ? -0.3 : -0.3 + 1.3*(k - 4)/4;
    inp.jx = dir*F; inp.jy = g.L0*0.5;
  }
}
// bot(side) plays side 0 or side 1 (a match made with humans:[false, true]): the same man, mirrored through dirOf(side)
export function bot(side = 0) {
  const M = T.M, b = M.ball, c = T.sides.ctrlOf(side), inp = T.sides.inputOf(side), dir = side === 0 ? 1 : -1, opp = 1 - side;
  inp.jx = 0; inp.jy = 0;
  if (M.phase === 'cut' && M.cut && M.cut.duel) { duelBot(M.cut); return; }
  if (M.phase === 'cut' && M.cut && M.cut.kind === 'goal') { (M.cut.g.type === 'drop' ? dropBot : kickBot)(M.cut); return; }
  if (!c || M.phase !== 'play') { if (HABITS) inp.cDown = false; if (moveState[side]) moveState[side].g = null; return; }
  const S = HABITS ? M.spr[side] : null, k = HABITS ? M.contact : null, held = !!(k && k.c === c);
  let hold = false;
  if (b.state === 'held' && b.carrier === c) {
    let near = 99, ny = 0;
    for (const q of M.players) {
      if (q.team !== opp || q.down > 0) continue;
      const dx = (q.x - c.x) * dir, dy = q.y - c.y, d = Math.hypot(dx, dy);
      if (dx > -1 && d < near) { near = d; ny = dy; }
    }
    const jx = 1, jy = near < 8 ? (ny > 0 ? -0.7 : 0.7) : (c.y < 10 ? 0.5 : c.y > 60 ? -0.5 : 0);
    const m = Math.hypot(jx, jy); inp.jx = dir * jx / m; inp.jy = jy / m;
    if (held) {                                                 // in a tackle: the offload, on its cue, or nothing
      if (k.botAt == null) k.botAt = T.contact.canOffload(k) && Math.random() < OFFLOAD_P ? 0.08 + Math.random() * 0.12 : -1;
      if (k.botAt > 0 && k.t >= k.botAt) { inp.aPressed = true; k.botAt = -1; }
    } else if (near < 2.6 && c.hold > 0.4 && Math.random() < 0.12) inp.aPressed = true;   // a tap: aPressed without aDown. Holding aDown past 0.18s would charge a long pass
    if (HABITS && !NOSPRINT && !NOSPRINTBALL && !held) hold = S.p === c ? near > 2.5 : (near > 6 && S.m > 0.5);
    if ((MOVE_STEP || MOVE_DUMMY) && !held && !c.bind) moveHabit(side, c, inp, dir);
  } else if (b.state === 'held' && b.carrier.team === opp) {
    const t = b.carrier, dx = t.x - c.x, dy = t.y - c.y, d = Math.hypot(dx, dy) || 1;
    inp.jx = dx / d; inp.jy = dy / d;
    if (!NODIVE && d < 2.4 && Math.random() < 0.2) inp.aPressed = true;
    if (d > 12 && Math.random() < 0.03) inp.bPressed = true;
    if (HABITS && !NOSPRINT) hold = S.p === c ? (d > 1.5 && d < 14) : (dx * dir >= -1 && d > 2.5 && d < 12 && T.contact.ahead(t, side) <= 1);
  } else {
    const tx = b.state === 'air' ? b.f.x1 : b.x, ty = b.state === 'air' ? b.f.y1 : b.y;
    const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
    if (d > 0.5) { inp.jx = dx / d; inp.jy = dy / d; }
  }
  if (HABITS) { if (hold && !inp.cDown) inp.cPressed = true; inp.cDown = hold; }
}
