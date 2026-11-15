// Kit designs and a third colour (1.8; the owner, 14 Nov 2026: "Quad sections are ok and add a third colour too for completeness", then
// Build on the mock-ups and Include for Create Team's Design row). src/kit-design.js, the wiring in src/data.js, the sprites' bake
// (src/render-art.js), the close-ups (src/render-setpieces.js fig, src/render-goals.js figFB), the clash rule (src/match.js awayKit),
// the saves (src/persistence.js) and Create Team's Design and Third Colour rows (src/ui-menus.js). Its browser part (each design's icon as
// drawn, the sprite bake sampled pixel by pixel, the Top camera, the close-ups, Create Team's rows by touch, keyboard and pad at five
// sizes) runs where Playwright is installed.
// node tools/kits.mjs   Exits 1 on any failure.
process.env.SEED ??= '41';
const { T, bot, reseed, rndCalls, LOCAL_CHILD } = await import('./harness.mjs');
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawnSync, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const D = T.debug, X = T.teams, S = D.settings(), STEP = T.STEP, $ = id => document.getElementById(id);
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } if (process.env.VERBOSE) console.log(cond ? 'ok  ' : 'FAIL', msg); };
const json = v => JSON.stringify(v);
const fnv = (h, s) => { for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const hash = s => fnv(2166136261, s).toString(36);
const memory = {};
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; }, removeItem(k) { delete memory[k]; } };
const team = id => X.ALL_TEAMS.find(t => t.id === id);
// The sides the proofs play: the county clubs' designs (HAC halves, Bromyard and Old Halesonians chest bands, High Wycombe and Wilmslow hoops
// with a third), the game's own hooped Farnham, Argentina's hoops, and two made sides with a design and a third (Quarters, Sash)
const MADE = [
  { key:'kq', id:'KQU', name:'Quarter Made', kit:'#1b2747', trim:'#f2b01e', third:'#c8102e', design:'quarters', pace:3, power:3, handling:3, kicking:3, stamina:3 },
  { key:'ks', id:'KSA', name:'Sash Made', kit:'#f2efe6', trim:'#c8102e', third:'#1b2747', design:'sash', pace:3, power:3, handling:3, kicking:3, stamina:3 },
  { key:'kt', id:'KST', name:'Stripe Made', kit:'#109a52', trim:'#f2efe6', design:'stripes', pace:3, power:3, handling:3, kicking:3, stamina:3 },
];

/* 0. KITS off draws exactly as 1.7 (02b9700): every shirt icon of every designed club and a made side's, the canvas drawing call by call
      (every name and argument) of matches between designed sides on the Top and Mid cameras with the close-ups live, a lineout, a scrum
      and a goal kick, the change kit each pairing gets, and the demo's draw. Checked first, in a child (KITS='{"on":false}'); the pin is
      02b9700's own output: GAME=<02b9700's index.html> KITS_CHILD=1 node tools/kits.mjs. Only 1.7's own handles are used, so the same
      print runs on both. */
function offPrint() {
  const out = [], made = MADE.map((t, i) => X.cleanTeam(t, i));
  X.custom().splice(0, X.custom().length, ...made);
  const designed = ['HAC', 'BRY', 'OHA', 'DRY', 'WIT', 'HWY', 'WIL', 'OTI', 'WIB', 'FAR', 'ARG', 'MER', 'NZL'].map(team);
  // the shirt icons: the home's My Team box draws jersey(), as 1.7 does
  const icons = [];
  for (const t of [...designed, ...made, ...[...T.local.LOCAL_NEW].filter(t => t.hoops)].filter(t => !X.isNation(t))) { S.myClub = t.key || t.id; T.home.render(); icons.push($('my-shirt').innerHTML); }
  out.push(json(icons));
  out.push(json([[0, 1], [5, 6], [7, 1], [11, 12], [2, 3]].map(([a, b]) => { const A = [...designed, ...made][a], B = [...designed, ...made][b], k = X.awayKit(A, B); return [k.fill, k.trim, !!k.hoops]; })));
  const arg = v => (typeof v === 'number' ? (Object.is(v, -0) ? '-0' : String(v)) : typeof v === 'string' ? v : v && typeof v === 'object' ? (v.width != null ? 'canvas' + v.width + 'x' + v.height : 'obj') : String(v));
  const run = (cam, a, b, seed, scene) => {
    let h = 2166136261, calls = 0;
    S.cam = cam; reseed(seed);
    globalThis.__ctxSpy = (k, args) => { calls++; h = fnv(h, k + '(' + args.map(arg).join(',') + ')'); };
    try {
      T.newMatch(a, b, { halfLen:240, diff:1, duels:'live' }); D.setMode('match'); D.setTwo(false);
      for (let i = 0; i < 900; i++) { bot(0); T.update(STEP); D.render(STEP); }
      scene(); for (let i = 0; i < 240; i++) { T.update(STEP); D.render(STEP); }
    } finally { globalThis.__ctxSpy = null; }
    D.exitMatch(); D.setMode('menu');
    return h.toString(36) + ':' + calls;
  };
  Object.assign(S, { played:99, diff:1, kids:false, half:0, coach:false });
  D.view(844, 390);
  const lineout = () => T.lineout(1, 62, 0, 'Into Touch'), scrum = () => T.scrum(0, 62, 35, 'Knock-On'), goal = () => D.goalKick(0, 98, 24, 'conversion');
  for (const cam of [0, 2]) {
    out.push(run(cam, team('HAC'), team('WIL'), 51, lineout));
    out.push(run(cam, made[0], team('OHA'), 52, scrum));
    out.push(run(cam, made[1], team('HWY'), 53, goal));
    out.push(run(cam, team('BRY'), made[2], 54, lineout));
  }
  S.cam = 2; reseed(77); D.exitMatch(); for (let n = 0; n < 2000; n++) T.update(STEP);
  out.push(json([T.M.demo, T.M.nat.map(t => t.id), T.M.score, T.M.ball.x.toFixed(5)]));
  X.custom().splice(0, X.custom().length);
  return out.map(hash).join(' ');
}
const BEFORE_KITS = 'jaitaa gewn4c 13w088h max11t e1vtwv 1dkitqy 1s8u1wp 18qzf06 1wky9rq 1ngdrhm 1i3gebc';   // 02b9700 (1.7), from its own index.html
if (process.env.KITS_CHILD) { console.log(offPrint()); process.exit(0); }
{
  const out = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { env:{ ...process.env, KITS:'{"on":false}', KITS_CHILD:'1' }, encoding:'utf8', maxBuffer:64*1024*1024 });
  const last = (out.stdout || '').trim().split('\n').pop() || '', fails = ((out.stdout || '') + (out.stderr || '')).split('\n').filter(l => /^FAIL|Error/.test(l));
  ok(!fails.length && last === BEFORE_KITS, `with KITS off the build draws as 1.7 (02b9700): every designed club's icon and a made side's, the canvas call by call on Top and Mid with the close-ups, a lineout, a scrum and a goal kick, the change kits and the demo (${last}${fails.length ? ' ' + fails.join(' ') : ''}, pinned ${BEFORE_KITS})`);
}

const K = T.kits, KITS = K.KITS, NEW = [...T.local.LOCAL_NEW];
const H = Object.values(T).find(v => v && typeof v.custom === 'function' && typeof v.load === 'function' && typeof v.save === 'function');
const offDo = fn => { KITS.on = false; try { return fn(); } finally { KITS.on = true; } };   // the switch is read as each kit is drawn, so a proof can turn it in place (the data's wiring is the child's, above)

// 1. The data: the 78 county clubs carry exactly the owner's research (tools/local.mjs holds it club by club); nothing else has a design
{
  const D8 = T.local.LOCAL_DATA.designs, got = NEW.filter(t => 'design' in t || 'third' in t);
  ok(got.length === 78 && got.every(t => D8[t.id] && t.design === D8[t.id].design && (t.third ?? null) === (D8[t.id].third ?? null)) && X.ALL_TEAMS.filter(t => !T.local.LOCAL_NEW.has(t) && ('design' in t || 'third' in t)).length === 0,
    'the 78 county clubs carry their design and third as the research has them, and no game club or nation carries one');
  const hac = team('HAC'), hwy = team('HWY'), oha = team('OHA'), wib = team('WIB');
  ok(K.designOf(hac) === 'halves' && K.designOf(team('BRY')) === 'band' && K.designOf(oha) === 'band' && K.thirdOf(oha) === '#c8102e' && K.designOf(hwy) === 'hoops' && hwy.hoops === true && K.thirdOf(hwy) === '#f2efe6'
    && K.designOf(wib) === 'plain' && wib.third && K.thirdOf(wib) === null && K.designOf(team('FAR')) === 'hoops' && K.thirdOf(team('FAR')) === null && K.designOf(team('ARG')) === 'hoops' && K.designOf(team('ENG')) === 'plain',
    'HAC halves, Bromyard and Old Halesonians chest bands (the latter edged in red), High Wycombe hoops with white; Wimborne plain, its third in the data and not drawn; Farnham and Argentina hooped as ever');
  ok(offDo(() => K.designOf(hac) === 'plain' && K.designOf(hwy) === 'hoops' && K.thirdOf(hwy) === null && K.designOf({ kit:'#000000', trim:'#ffffff', design:'quarters' }) === 'plain'), 'KITS off: every side reads plain or hooped, with no third');
  ok(K.designOf({ hoops:true }) === 'hoops' && K.designOf({ hoops:false }) === 'plain' && K.designOf({ design:'tartan', hoops:true }) === 'hoops' && K.designOf({ design:'plain', hoops:true }) === 'plain'
    && K.thirdOf({ kit:'#111111', trim:'#222222', design:'hoops', third:'#333333' }) === '#333333' && K.thirdOf({ kit:'#111111', trim:'#222222', design:'plain', third:'#333333' }) === null
    && K.thirdOf({ kit:'#111111', trim:'#222222', design:'sash', third:'#222222' }) === null && K.thirdOf({ kit:'#111111', trim:'#222222', design:'sash', third:'red' }) === null,
    'hoops:true reads as Hoops and a design as itself; a third shows only on a design past Plain, as a hex, and never as the shirt or trim colour');
}

// 2. kitPaint, the one rule for which colour a point of the shirt takes (z up a 1.8m man, xb to his left, u across as seen)
{
  const P = K.paint, Z = [0.98, 1.1, 1.19, 1.27, 1.4];
  ok(Z.every(z => P('plain', z, 0.1, 0.1, null) === 0 && P('plain', z, -0.1, -0.1, '#000000') === 0), 'Plain: the shirt colour everywhere');
  ok(P('halves', 1.2, -0.1, 0, null) === 0 && P('halves', 1.2, 0.1, 0, null) === 1 && P('halves', 1.4, 0.2, 0, '#000000') === 1, 'Halves: his right in the shirt colour, his left in the trim, whatever the third');
  ok(P('quarters', 1.35, -0.1, 0, null) === 0 && P('quarters', 1.35, 0.1, 0, null) === 1 && P('quarters', 1.0, -0.1, 0, null) === 1 && P('quarters', 1.0, 0.1, 0, null) === 0, 'Quarters: his right shoulder in the shirt colour, his left in the trim, crossing at the chest');
  const hoop2 = [], hoop3 = [];
  for (let z = 0.95; z < 1.44; z += 0.0735) { hoop2.push(P('hoops', z, 0, 0, null)); hoop3.push(P('hoops', z, 0, 0, '#000000')); }
  ok(hoop2.join('') === '1010101' && hoop3.join('') === '1021021' && new Set(hoop3).size === 3, `Hoops: shirt and trim in turn, or shirt, trim and third (${hoop2.join('')}, ${hoop3.join('')})`);
  const st2 = [], st3 = []; for (let u = -0.21; u <= 0.211; u += 0.07) { st2.push(P('stripes', 1.2, 0, u, null)); st3.push(P('stripes', 1.2, 0, u, '#000000')); }
  ok(st2.join('') === '1010101' && st3.join('').includes('2') && st3.join('').includes('1') && st3[3] === 0, `Stripes: 7cm stripes across, every other trim in the third when there is one (${st2.join('')}, ${st3.join('')})`);
  ok(P('sash', 1.19 + 1.05*0.15, 0.15, 0, null) === 1 && P('sash', 1.19 - 1.05*0.15, -0.15, 0, null) === 1 && P('sash', 1.4, -0.15, 0, null) === 0 && P('sash', 1.19 + 0.075, 0, 0, '#000000') === 2 && P('sash', 1.19 + 0.075, 0, 0, null) === 0,
    'Sash: from his left shoulder to his right hip, edged in the third');
  ok(P('band', 1.27, 0, 0, null) === 1 && P('band', 1.27 + 0.065, 0.1, 0, '#000000') === 2 && P('band', 1.27 + 0.065, 0.1, 0, null) === 0 && P('band', 1.05, 0, 0, '#000000') === 0, 'Chest Band: across the chest, edged in the third');
}

// 3. The shirt icons (jersey(), kitCss): each design's background, the collar and the shoulder flash; Plain and two-colour Hoops are 1.7's markup
{
  const base = { kit:'#1b2747', trim:'#f2b01e' }, th = '#c8102e', J = K.jersey;
  const one = (design, third) => J({ ...base, design, third, hoops:design === 'hoops' });
  ok(one('plain', th) === '<span class="jw "><span class="jersey" style="--kit:#1b2747;--trim:#f2b01e"></span></span>' && one('hoops') === '<span class="jw "><span class="jersey hoops" style="--kit:#1b2747;--trim:#f2b01e"></span></span>',
    'Plain (a third left out) and two-colour Hoops: the icon exactly as 1.7 drew it');
  const want = {
    hoops:[th, /linear-gradient\(var\(--kit\) 0 26%,var\(--trim\) 26% 38%,var\(--kit\) 38% 50%,var\(--third\) 50% 62%/, 'var(--trim)', 'var(--trim)'],
    halves:[null, /^linear-gradient\(90deg,var\(--kit\) 50%,var\(--trim\) 50%\)$/, 'var(--trim)', 'transparent'],
    quarters:[null, /^linear-gradient\(90deg,var\(--kit\) 50%,var\(--trim\) 50%\) top\/100% 52% no-repeat,linear-gradient\(90deg,var\(--trim\) 50%,var\(--kit\) 50%\) bottom\/100% 48% no-repeat$/, 'var(--trim)', 'transparent'],
    stripes:[null, /^repeating-linear-gradient\(90deg,var\(--kit\) 0 10%,var\(--trim\) 10% 20%\)$/, 'var(--trim)', 'transparent'],
    sash:[th, /^linear-gradient\(-45deg,var\(--kit\) 0 36%,var\(--third\) 36% 41%,var\(--trim\) 41% 59%,var\(--third\) 59% 64%,var\(--kit\) 64%\)$/, 'var(--third)', 'var(--third)'],
    band:[th, /^linear-gradient\(var\(--kit\) 0 33%,var\(--third\) 33% 38%,var\(--trim\) 38% 54%,var\(--third\) 54% 59%,var\(--kit\) 59%\)$/, 'var(--trim)', 'var(--trim)'],
  };
  for (const [d, [third, bg, acc, flash]] of Object.entries(want)) {
    const html = one(d, third), m = html.match(/style="([^"]*)"/)[1], v = Object.fromEntries(m.split(/;(?=--|background)/).map(p => { const i = p.indexOf(':'); return [p.slice(0, i), p.slice(i + 1)]; }));
    ok(html.includes(`class="jersey d-${d}"`) && bg.test(v.background) && v['--acc'] === acc && v['--flash'] === flash && (third ? v['--third'] === third : !('--third' in v)),
      `${K.KIT_DESIGN_NAMES[d]}${third ? ' with a third' : ''}: its background, collar ${acc} and shoulder flash ${flash} (${m.slice(0, 90)})`);
  }
  ok(['halves', 'quarters', 'stripes', 'sash'].every(d => K.flash({ ...base, design:d, third:th }) === 'var(--third)' && K.accent({ ...base, design:d, third:th }) === 'var(--third)') && K.flash({ ...base, design:'band', third:th }) === 'var(--trim)',
    'where the trim is half the shirt the collar and the shoulder flash take the third, and go when there is none: in the trim the flash reads as a blot on one sleeve');
  ok(offDo(() => one('quarters', th) === '<span class="jw "><span class="jersey" style="--kit:#1b2747;--trim:#f2b01e"></span></span>' && J({ ...base, hoops:true, design:'hoops', third:th }) === one('hoops')), 'KITS off: a designed side\'s icon is 1.7\'s plain or hooped shirt');
}

// 4. The close-ups: fig (side on: set pieces, the maul, a behind view's side-on man) and figFB (front or back on: goal kicks, the duels, the
//    behind views' fallback). Each design painted on the torso in its own colours; a plain kit's calls are 1.7's, call for call
{
  const log = fn => { const out = []; let fill = null; globalThis.__ctxSpy = (k, a) => { if (k === 'fillStyle') fill = a[0]; else if (k === 'strokeStyle') out.push(['stroke', a[0]]); else out.push([k, fill, ...a.map(v => (typeof v === 'number' ? +v.toFixed(3) : v))]); }; try { fn(); } finally { globalThis.__ctxSpy = null; } return out; };
  const kit = (design, third) => ({ shirt:'#1b2747', trim:'#f2b01e', third:third || null, design, hoops:design === 'hoops', shorts:'#ece9df' });
  const rects = (l, c) => l.filter(r => r[0] === 'fillRect' && r[1] === c);
  const old = { shirt:'#1b2747', trim:'#f2b01e', hoops:false, shorts:'#ece9df' }, oldH = { ...old, hoops:true };
  ok(json(log(() => K.fig(0, 0, 100, kit('plain'), { face:1 }))) === json(log(() => K.fig(0, 0, 100, old, { face:1 }))) && json(log(() => K.figFB(0, 0, 100, 0, { kit:kit('hoops'), back:true, num:9 }))) === json(log(() => K.figFB(0, 0, 100, 0, { kit:oldH, back:true, num:9 })))
    && json(log(() => K.fig(0, 0, 100, kit('hoops'), { face:-1 }))) === json(log(() => K.fig(0, 0, 100, oldH, { face:-1 }))) && json(log(() => K.figFB(0, 0, 100, 0, { kit:kit('plain', '#c8102e'), num:4 }))) === json(log(() => K.figFB(0, 0, 100, 0, { kit:old, num:4 }))),
    'Plain and two-colour Hoops: fig and figFB make 1.7\'s calls, call for call');
  const back = log(() => K.figFB(0, 0, 100, 0, { kit:kit('halves'), back:true, num:9 })), front = log(() => K.figFB(0, 0, 100, 0, { kit:kit('halves'), back:false }));
  const mid = l => { const r = rects(l, '#f2b01e').filter(r => r[5] > 3); return r.reduce((a, r) => a + (r[2] + r[4]/2)*r[4], 0)/Math.max(1, r.reduce((a, r) => a + r[4], 0)); };
  ok(mid(back) < -5 && mid(front) > 5, `figFB Halves: his left half in the trim, the picture's left from behind and its right from in front (${mid(back).toFixed(1)}, ${mid(front).toFixed(1)})`);
  const sl = l => l.filter(r => r[0] === 'stroke').map(r => r[1]);
  ok(sl(back).includes('#1b2747') && sl(back).includes('#f2b01e'), 'figFB Halves: each sleeve its own shoulder\'s colour');
  for (const d of ['quarters', 'stripes', 'sash', 'band', 'hoops']) {
    const l = log(() => K.figFB(0, 0, 100, 0, { kit:kit(d, '#c8102e'), back:true, num:9 })), f = log(() => K.fig(0, 0, 100, kit(d, '#c8102e'), { face:1 }));
    const onBody = d !== 'quarters';   // Quarters shows its third on the collar alone (figFB's; fig side on draws none)
    ok(rects(l, '#f2b01e').length >= 2 && rects(l, '#c8102e').length >= 1 && rects(f, '#f2b01e').length >= 1 && (rects(f, '#c8102e').length >= 1) === onBody && l.some(r => r[0] === 'strokeText'),
      `${K.KIT_DESIGN_NAMES[d]} with a third: painted in its trim and third on figFB${onBody ? ' and fig' : ' (the collar) and in its trim on fig'}, the number stroked to read across it`);
  }
  const side = (f, d) => { const l = log(() => K.fig(0, 0, 100, kit(d), { face:f })); return [rects(l, '#1b2747').reduce((a, r) => a + r[4]*r[5], 0), rects(l, '#f2b01e').reduce((a, r) => a + r[4]*r[5], 0)]; };
  const [rs, rt] = side(1, 'halves'), [ls, lt] = side(-1, 'halves');
  ok(rs > rt && lt > ls && rt > 0 && ls > 0, `fig Halves side on: his right side (facing right) in the shirt colour, his left in the trim, each with a strip of the far half at chest and back (${[rs, rt, ls, lt].map(Math.round).join(', ')})`);
  // the cells follow the man's size on screen: a scrum's man keeps 16 rows, a goal kicker close up gets one about every 3 device pixels (to 48)
  const rowsAt = (scale, h) => { const ys = new Set(); const g = { getTransform:() => ({ a:scale, b:0 }), set fillStyle(v) { /* colour */ }, fillRect:(x, y) => ys.add(y.toFixed(4)) };
    K.paintBox(g, kit('sash'), -h/4, h/4, -h, 0, (x, y) => ({ z:0.95 - y/h*0.49, xb:x/h, u:x/h })); return ys.size; };
  ok(rowsAt(2, 20) === 16 && rowsAt(2, 45) === 30 && rowsAt(3, 100) === 48 && rowsAt(1, 30) === 16, `kitPaintBox: 16 rows at a scrum's size, a row about every 3 device pixels on a bigger man, at most 48 (${[rowsAt(2, 20), rowsAt(2, 45), rowsAt(3, 100), rowsAt(1, 30)].join(' ')})`);
  // in a match: the close-ups a real HAC v Old Halesonians draws on Mid (the duels live, a lineout, a scrum, a goal kick) paint each side's
  // design through kitOf, fig and figFB. A painted torso is a clip whose fills take two or more of the side's own colours; KITS off paints none
  const painted = () => {
    const per = [0, 0], third = [0, 0]; let kits = null, clip = 0, seen = null, fill = null;
    S.cam = 2; reseed(81);
    globalThis.__ctxSpy = (k, a) => {
      if (k === 'fillStyle') fill = a[0];
      else if (k === 'clip') { clip++; seen = new Set(); }
      else if (k === 'fillRect' && clip && seen) seen.add(fill);
      else if (k === 'restore' && clip && seen) {
        clip--; kits.forEach((c, t) => { const n = [c.fill, c.trim, c.third].filter(x => x && seen.has(x)).length; if (n >= 2 && seen.has(c.fill) && seen.has(c.trim)) { per[t]++; if (c.third && seen.has(c.third)) third[t]++; } }); seen = clip ? new Set() : null;
      }
    };
    try {
      T.newMatch(team('HAC'), team('OHA'), { halfLen:240, diff:1, duels:'live' }); kits = T.M.kit.map(k => ({ ...k })); D.setMode('match'); D.setTwo(false);
      for (let i = 0; i < 900; i++) { bot(0); T.update(STEP); D.render(STEP); }
      for (const scene of [() => T.lineout(1, 62, 0, 'Into Touch'), () => T.scrum(0, 62, 35, 'Knock-On'), () => D.goalKick(0, 98, 24, 'conversion')]) { scene(); for (let i = 0; i < 240; i++) { T.update(STEP); D.render(STEP); } }
    } finally { globalThis.__ctxSpy = null; }
    D.exitMatch(); D.setMode('menu');
    return { per, third, kits:kits.map(k => k.design + (k.third ? '+' + k.third : '')) };
  };
  const live = painted(), dark = offDo(painted);
  ok(json(live.kits) === json(['halves', 'band+#c8102e']) && live.per[0] >= 20 && live.per[1] >= 20 && live.third[1] >= 10 && live.third[0] === 0 && dark.per[0] + dark.per[1] === 0,
    `a real match's close-ups paint HAC's halves and Old Halesonians' band edged in red (torsos painted ${live.per.join(' and ')}, with the third ${live.third.join(' and ')}); KITS off paints none (${dark.per.join(' ')})`);
}

// 5. The clash rule (awayKit). The shirts decide, as 1.7 (tools/teams.mjs pins Farnham v Weybridge and the rest): every pairing of the game's
//    sides with no split shirt changes exactly as with KITS off. A split shirt (Halves, Quarters) shows one half at a time side on, so it
//    also clashes where either of its colours is near a colour the other side shows, and is never turned round (its colours swapped are the
//    same shirt mirrored); the kit kept carries its design and third, and a change kit, white or black is plain, never trimmed in its own colour
{
  const sides = X.ALL_TEAMS, split = t => ['halves', 'quarters'].includes(K.designOf(t)), moved = [];
  let n = 0;
  for (const a of sides) for (const b of sides) {
    if (a === b || split(a) || split(b)) continue;
    n++; const on = K.awayKit(a, b), off = offDo(() => K.awayKit(a, b));
    if (on.fill !== off.fill || on.trim !== off.trim || on.hoops !== off.hoops) moved.push(a.id + 'v' + b.id);
  }
  ok(n > 300000 && !moved.length, `${n} pairings with no split shirt: every change kit as with KITS off (${moved.slice(0, 6).join(' ') || 'none moved'})`);
  const mk = (kit, trim, design, third) => ({ id:'TS' + design.slice(0, 1).toUpperCase(), name:design, kit, trim, design, third, hoops:design === 'hoops' });
  const h0 = mk('#1b2747', '#f2b01e', 'halves'), h1 = { ...mk('#f2b01e', '#1b2747', 'halves'), id:'TSI' }, q = mk('#f2efe6', '#1c1c1c', 'quarters'), hac = team('HAC');
  const k1 = K.awayKit(h0, h1), k1off = offDo(() => K.awayKit(h0, h1));
  ok(k1off.fill === h1.kit && k1.fill === '#f2efe6' && k1.design === 'plain', `Halves v Halves in each other's colours (navy and gold, gold and navy): far apart by shirt, so 1.7 kept both; the split shirts clash, and the away side changes (${k1.fill} ${k1.trim} ${k1.design})`);
  const k2 = K.awayKit(mk('#c8102e', '#f2b01e', 'plain'), q);
  ok(k2.fill === q.kit && k2.design === 'quarters', 'Quarters in white and black v a plain red side: no clash, its quarters kept');
  const s3 = mk('#2050b0', '#f2b01e', 'sash', '#c8102e'), k3 = K.awayKit(mk('#2a5fb8', '#f2efe6', 'plain'), s3);
  ok(k3.fill === s3.trim && k3.trim === s3.kit && k3.design === 'sash' && k3.third === '#c8102e', `a clash turned round keeps its design and third (${json(k3)})`);
  const s4 = { ...s3, alt:'#f2efe6', altTrim:'#2050b0' }, k4 = K.awayKit(mk('#2a5fb8', '#f2efe6', 'plain'), s4);
  ok(k4.fill === '#f2efe6' && k4.design === 'plain' && k4.third === null && k4.hoops === false, 'a change kit is plain');
  // one split side against a plain one, both ways round: half of the split shirt in the other side's colour is a clash
  const nw = mk('#1b2747', '#f2efe6', 'halves'), k5 = K.awayKit(nw, mk('#f2efe6', '#1b2747', 'plain')), k5off = offDo(() => K.awayKit(nw, mk('#f2efe6', '#1b2747', 'plain')));
  ok(k5off.fill === '#f2efe6' && k5.fill !== '#f2efe6' && k5.design === 'plain' && k5.trim !== k5.fill, `navy and white Halves at home v a plain white side: its white half is the away shirt, so the away side changes, to the best it has (${k5.fill} ${k5.trim} ${k5.design}; KITS off ${k5off.fill})`);
  const k6 = K.awayKit(mk('#1b2747', '#f2b01e', 'plain'), nw), k7 = K.awayKit(mk('#f2efe6', '#c8102e', 'plain'), nw);
  ok(k6.design === 'plain' && X.colorDist(k6.fill, '#1b2747') >= 140 && k7.design === 'plain' && X.colorDist(k7.fill, '#f2efe6') >= 140,
    `navy and white Halves away v a plain navy side, and v a plain white one: changed to a plain kit clear of the home shirt, never the same halves turned round (${k6.fill} ${k6.design}; ${k7.fill} ${k7.design})`);
  // every Create Team colour pair, Halves or Quarters v Plain or a split shirt: never turned round, never a white or black kit trimmed in its own colour
  const pal = X.KIT_COLOURS.map(c => c[1]), sweep = { n:0, turned:0, flat:0, near:0, missed:0 };
  for (const hk of pal) for (const ht of pal) for (const hd of ['plain', 'halves']) for (const ak of pal) for (const at of pal) for (const ad of ['halves', 'quarters']) {
    if (hk === ht || ak === at) continue;
    const H = mk(hk, ht, hd), A = { ...mk(ak, at, ad), id:'TSA' }, k = K.awayKit(H, A); sweep.n++;
    if (k.design === ad && k.fill === at && k.trim === ak) sweep.turned++;
    if (X.colorDist(k.fill, k.trim) < 60 && !(k.fill === ak && k.trim === at)) sweep.flat++;   // a side's own two colours are its own choice
    const shows = (f, t, d) => (['halves', 'quarters'].includes(d) ? [f, t] : [f]), gap = (f, t, d) => Math.min(...shows(hk, ht, hd).flatMap(x => shows(f, t, d).map(y => X.colorDist(x, y))));
    if (gap(k.fill, k.trim, k.design) < 140) { sweep.near++; if (gap(ak, at, ad) >= 140 || gap('#f2efe6', ak, 'plain') >= 140 || gap('#1c1c1c', ak, 'plain') >= 140) sweep.missed++; }
  }
  ok(sweep.n > 60000 && sweep.turned === 0 && sweep.flat === 0, `${sweep.n} pairings of Create Team's colours with a split shirt away: none turned round, no white or black kit trimmed in its own colour (${json(sweep)})`);
  ok(sweep.missed === 0, `and readable wherever its own kit, white or black would be: no colour either side shows within 140 of the other's (${sweep.near} left close, each with every option clashing; ${sweep.missed} missed)`);
  // HAC, the one Halves club, against every side in the game, home and away: readable wherever any option is
  let hacNear = 0; const hacOut = [];
  for (const o of sides) for (const [h, a] of [[hac, o], [o, hac]]) {
    if (o === hac) continue;
    const k = K.awayKit(h, a), shows = (f, t, d) => (['halves', 'quarters'].includes(d) ? [f, t] : [f]), hs = shows(h.kit, h.trim, K.designOf(h));
    const near = Math.min(...hs.flatMap(x => shows(k.fill, k.trim, k.design).map(y => X.colorDist(x, y))));
    if (near < 140) { hacNear++; if (hacOut.length < 4) hacOut.push(h.id + 'v' + a.id + ':' + k.fill); }
  }
  ok(hacNear === 0, `HAC home and away against all ${sides.length - 1} sides: every pairing readable, no colour either side shows within 140 of the other's (${hacNear} close${hacOut.length ? ': ' + hacOut.join(' ') : ''})`);
  const m0 = (() => { T.newMatch(hac, team('WIL'), { halfLen:240, diff:1, headless:true }); const k = T.M.kit.map(k => ({ ...k })); D.exitMatch(); return k; })();
  ok(m0[0].design === 'halves' && m0[0].hoops === false && m0[1].design === 'hoops' && m0[1].third === '#f2efe6' && m0[1].hoops === true, `a match holds each side's design and third (${json(m0)})`);
}

// 6. Saves: a made side keeps its design and third; a 1.7 save reads as Plain or Hoops, byte for byte as 1.7 wrote it; bad values go
{
  const old = { key:'my1', id:'OLD', name:'Old Side', kit:'#c8102e', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:2, kicking:2, stamina:2 };
  ok(json(X.cleanTeam(old, 0)) === '{"key":"my1","id":"OLD","name":"Old Side","custom":true,"kit":"#c8102e","trim":"#f2efe6","hoops":true,"pace":3,"power":3,"handling":2,"kicking":2,"stamina":2}'
    && json(X.cleanTeam({ ...old, hoops:false }, 0)).includes('"hoops":false,"pace"'), 'a 1.7 save: exactly as 1.7 wrote it, Hoops or Plain');
  const q = X.cleanTeam({ ...old, design:'quarters', third:'#1b2747', hoops:false }, 0);
  ok(q.design === 'quarters' && q.third === '#1b2747' && q.hoops === false && K.designOf(q) === 'quarters', 'Quarters with a third: both kept');
  const hp = X.cleanTeam({ ...old, design:'hoops', hoops:false, third:'#1b2747' }, 0);
  ok(hp.hoops === true && !('design' in hp) && hp.third === '#1b2747', 'a hooped design is saved as hoops:true, so an older build shows its hoops');
  const bad = [X.cleanTeam({ ...old, design:'tartan' }, 0), X.cleanTeam({ ...old, design:'sash', third:'navy' }, 0), X.cleanTeam({ ...old, design:'plain', hoops:true, third:'#1b2747' }, 0), X.cleanTeam({ ...old, design:'band', third:'#F2EFE6' }, 0)];
  ok(!('design' in bad[0]) && bad[0].hoops === true && bad[1].design === 'sash' && !('third' in bad[1]) && !('design' in bad[2]) && bad[2].hoops === false && !('third' in bad[2]) && bad[3].design === 'band' && !('third' in bad[3]),
    'an unknown design reads as hoops:true says; a third that is not a hex, on Plain, or the trim\'s own colour is dropped');
  // a hand-edited third that is not a string: dropped, never thrown (a throw in restore() would leave the rest of the save unread)
  const odd = [['#1b2747'], { toString:() => '#1b2747' }, 1193287, null];
  let threw = null; const odds = [];
  try { for (const third of odd) { odds.push(X.cleanTeam({ ...old, design:'halves', third }, 0), X.cleanSide({ ...old, design:'halves', third })); odds.push(X.cleanTeam({ ...old, kit:['#c8102e'], design:'halves', third:'#1b2747' }, 0)); }
    for (const third of odd) if (K.thirdOf({ kit:'#111111', trim:'#222222', design:'halves', third }) !== null) threw = 'thirdOf ' + json(third); } catch (e) { threw = e.message; }
  ok(!threw && odds.every((t, i) => t.design === 'halves' && (i % 3 === 2 ? t.third === '#1b2747' : !('third' in t))), `a third that is an array, an object, a number or null is dropped, and an array shirt with a hex third keeps the third, none thrown (${threw || 'none thrown'})`);
  const raw0 = json({ settings:{}, custom:[{ ...old, design:'halves', third:['#1b2747'] }] });
  memory['tryline.v1'] = raw0; X.newChamp(team('HAC'), [team('OHA'), team('HWY'), team('BRY'), team('WIL'), team('FAR')]); H.save();
  const st = JSON.parse(memory['tryline.v1']); st.custom = [{ ...old, design:'halves', third:['#1b2747'] }]; memory['tryline.v1'] = json(st); H.setChamp(null); H.custom().splice(0);
  let loadErr = null; try { H.load(); } catch (e) { loadErr = e.message; }
  ok(!loadErr && H.champ() && H.champ().teams.length === 6 && H.custom().length === 1 && H.custom()[0].design === 'halves' && !('third' in H.custom()[0]), `a save with a made side's third an array: the side loads without it, and the championship after it loads too (${loadErr || 'loaded'})`);
  H.setChamp(null); H.custom().splice(0); delete memory['tryline.v1'];
  // a championship, cup or career saved by 1.7: its county clubs carry no design, and take their club's where the shirt and trim are the club's
  X.newChamp(team('HAC'), [team('OHA'), team('HWY'), team('BRY'), team('WIL'), team('FAR')]);
  const was17 = JSON.parse(json(H.champ())); H.setChamp(null);
  for (const t of was17.teams) { delete t.design; delete t.third; }
  was17.teams[3] = { ...was17.teams[3], kit:'#2050b0' };   // Bromyard in another shirt: not the club's kit, so not the club's design
  const c17 = X.cleanChamp(was17), by = id => c17.teams.find(t => t.id === id);
  ok(c17 && K.designOf(by('HAC')) === 'halves' && K.thirdOf(by('OHA')) === '#c8102e' && K.designOf(by('OHA')) === 'band' && K.thirdOf(by('HWY')) === '#f2efe6' && K.designOf(by('BRY')) === 'plain' && !('design' in by('FAR')) && by('FAR').hoops === true,
    `a 1.7 championship: HAC, Old Halesonians and High Wycombe take their clubs' designs and thirds; a side in another shirt, and Farnham, stay as saved (${c17 && c17.teams.map(t => t.id + ':' + K.designOf(t)).join(' ')})`);
  const made17 = X.cleanSide({ id:'HAC', name:'HAC', kit:'#1b2747', trim:'#7c1431', custom:true, pace:3, power:3, handling:3, kicking:3, stamina:3 });
  ok(K.designOf(made17) === 'plain', 'a made side with a club\'s code and colours keeps what it was saved with');
  const side = X.cleanSide({ id:'HAC', name:'HAC', kit:'#1b2747', trim:'#7c1431', design:'halves', pace:3, power:3, handling:3, kicking:3, stamina:3 }), oldSide = X.cleanSide({ id:'FAR', name:'Farnham', kit:'#1a1a1a', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:4, kicking:3, stamina:3 });
  ok(side.design === 'halves' && !('third' in side) && !('design' in oldSide) && oldSide.hoops === true, 'a championship\'s, a cup\'s or a career\'s side (cleanSide) keeps its design; an old one is as it was');
  X.newChamp(team('HAC'), [team('OHA'), team('HWY'), team('BRY'), team('WIL'), team('FAR')]);
  const back = X.cleanChamp(JSON.parse(json(H.champ()))); H.setChamp(null);
  ok(back && back.teams.find(t => t.id === 'HAC').design === 'halves' && back.teams.find(t => t.id === 'OHA').third === '#c8102e' && back.teams.find(t => t.id === 'HWY').hoops === true, 'a saved championship comes back with its sides\' designs and thirds');
  H.custom().splice(0, H.custom().length, X.cleanTeam(MADE[0], 0), X.cleanTeam(old, 1)); H.save(); H.custom().splice(0);
  H.load();
  const got = H.custom();
  ok(got.length === 2 && got[0].design === 'quarters' && got[0].third === '#c8102e' && got[1].hoops === true && !('design' in got[1]), 'saved and loaded: a made side keeps its Quarters and third, a 1.7 side its Hoops');
  H.custom().splice(0);
}

// 7. Nothing drawn at random: matches between designed sides draw the same numbers with KITS on and off, the same results, and drawing a
//    frame draws none; AI v AI and the demo play exactly as with KITS off
{
  const play = (a, b, seed, o) => { reseed(seed); const r0 = rndCalls(); T.newMatch(a, b, { halfLen:240, diff:1, ...o }); D.setMode('match'); D.setTwo(false);
    for (let i = 0; i < 2400 && !T.M.over; i++) { if (!o.auto) bot(0); T.update(STEP); if (o.draw) D.render(STEP); }
    const out = [T.M.score.join('-'), T.M.ball.x.toFixed(6), rndCalls() - r0]; D.exitMatch(); D.setMode('menu'); return out; };
  for (const [a, b, o, what] of [['HAC', 'OHA', { auto:true }, 'AI v AI, HAC v Old Halesonians'], ['BRY', 'HWY', { duels:'live', draw:true }, 'Bromyard v High Wycombe played, drawn on Mid with the close-ups']]) {
    S.cam = 2; const on = play(team(a), team(b), 61, o), off = offDo(() => play(team(a), team(b), 61, o));
    ok(json(on) === json(off), `${what}: the same play, the same draws, KITS on and off (${json(on)})`);
  }
  T.newMatch(team('HAC'), team('WIL'), { halfLen:240, diff:1, duels:'live' }); D.setMode('match'); for (let i = 0; i < 300; i++) T.update(STEP);
  let drawn = 0; for (const cam of [0, 1, 2, 3]) { S.cam = cam; const r0 = rndCalls(); for (let i = 0; i < 60; i++) D.render(STEP); drawn += rndCalls() - r0; }
  T.lineout(1, 62, 0, 'Into Touch'); for (let i = 0; i < 120; i++) { T.update(STEP); const r0 = rndCalls(); D.render(STEP); drawn += rndCalls() - r0; }
  D.exitMatch(); D.setMode('menu');
  ok(drawn === 0, `drawing designed sides draws no random number, on every camera and in a close-up (${drawn})`);
}

// 8. The Top camera stays plain: designed sides draw there exactly as with KITS off (a pairing whose change kit KITS leaves alone)
{
  const arg = v => (typeof v === 'number' ? String(v) : typeof v === 'string' ? v : 'obj');
  const top = () => { let h = 2166136261; S.cam = 0; reseed(71); globalThis.__ctxSpy = (k, a) => { h = fnv(h, k + '(' + a.map(arg).join(',') + ')'); };
    try { T.newMatch(team('HAC'), team('WIL'), { halfLen:240, diff:1, duels:'off', headless:true }); D.setMode('match'); for (let i = 0; i < 600; i++) { bot(0); T.update(STEP); D.render(STEP); } } finally { globalThis.__ctxSpy = null; }
    D.exitMatch(); D.setMode('menu'); return h; };
  const on = top(), off = offDo(top);
  ok(on === off, `the Top camera: HAC v Wilmslow drawn call for call as with KITS off (${on.toString(36)})`);
}

// 9. In Chromium. The sprites: each design baked onto the real atlas pictures, sampled pixel by pixel (green shirt, blue trim, purple third:
//    no skin, hair or shorts reads as any of them), at the back (0), front (180) and both sides (90, and 270 mirrored); Plain and two-colour
//    Hoops bake byte for byte as a 1.7-shaped kit does. Then Create Team's Design and Third Colour rows by touch, keyboard and pad at 844x390,
//    667x375, 844x340, 667x320 and 568x320: the seven shirts in one strip (41px wide at 667x375, as approved; 44 tall), the chosen name,
//    Third Colour hidden on Plain, None first, the shirt's and trim's colours left out, a third cleared when the shirt or trim takes it, the
//    save and its reopening, and no sideways scroll
function chromium() {
  const require = createRequire(import.meta.url);
  for (const from of [() => require('playwright'), () => require(path.join(execFileSync('npm', ['root', '-g'], { stdio:['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright'))]) {
    try { return from().chromium; } catch (e) { /* not here */ }
  }
  return null;
}
async function browserChecks() {
  if (process.env.GAME || process.env.NO_BROWSER) { console.log('skip the browser checks (GAME or NO_BROWSER set)'); return; }
  const chrome = chromium();
  if (!chrome) { console.log('skip the browser checks: Playwright is not installed'); return; }
  let browser;
  try { browser = await chrome.launch(); } catch (e) { console.log('skip the browser checks: Chromium would not start (' + e.message.split('\n')[0] + ')'); return; }
  const dir = fileURLToPath(new URL('../', import.meta.url));
  const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.webmanifest':'application/manifest+json', '.json':'application/json' };
  const server = http.createServer((req, res) => {
    const file = path.resolve(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type':TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  const SAVE = { settings:{ tut:['past', 'pass', 'tackle', 'block', 'scrum', 'lineout', 'goal', 'drop', 'maul'], coach:false, played:5, myClub:'FAR', myNat:'ENG' }, profile:{ age:'adult', gender:'male', look:null }, store:{ owned:['tryline.full'] } };
  const open = async (w, h) => {
    const ctx = await browser.newContext({ viewport:{ width:w, height:h }, hasTouch:true, serviceWorkers:'block' });
    await ctx.addInitScript(v => { try { localStorage.setItem('tryline.v1', v); } catch (e) { /* none */ } }, JSON.stringify(SAVE));
    const page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    await page.waitForFunction(() => window.__tryline && !document.getElementById('s-home').hidden);
    await page.evaluate(() => document.fonts && document.fonts.ready);
    return { ctx, page, errors };
  };
  try {
    { // the sprites
      const { ctx, page, errors } = await open(844, 390);
      await page.evaluate(() => window.__tryline.behind.artLoad());
      const ready = await page.waitForFunction(() => window.__tryline.behind.artReady(), null, { timeout:60000 }).then(() => true, () => false);
      if (!ready) ok(false, 'the player art loads for the sprite checks');
      else {
        const r = await page.evaluate(() => {
          const T = window.__tryline, K = T.kits, A = K.ART(), look = T.behind.cleanLook({ h:1.8, b:1, skin:2, hair:1, style:0, g:0 });
          const C = { shirt:'#109a52', trim:'#2050b0', third:'#7a2fb0' };
          const bake = (kit, d8) => {
            const pose = K.sprite('idle', 0, d8, false, look), row = pose.row, mirror = pose.mirror, deg = A.man.clips.idle.dirs[pose.dir], q = 1/A.man.px;
            const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; const g = cv.getContext('2d', { willReadFrequently:true });
            K.scratch(); const luts = K.palette({ shorts:'#ece9df', ...kit }, look);
            const F = luts.design ? K.frame(row, deg, mirror, K.body(look), luts.design, luts.third) : null;
            g.translate(128, 250); if (mirror) g.scale(-1, 1); K.blit(g, row, luts, A.man.px, -row[5]*q, -row[6]*q, 256, F);
            return g.getImageData(0, 0, 256, 256).data;
          };
          const hue = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (mx < 40 || d/mx < 0.35) return -1; let h = mx === r ? ((g - b)/d) % 6 : mx === g ? (b - r)/d + 2 : (r - g)/d + 4; return (h*60 + 360) % 360; };
          const HUES = [148, 220, 278];   // the shirt, the trim and the third, as tinted
          const cls = px => { const pts = [[], [], []]; for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const i = (y*256 + x)*4; if (px[i + 3] < 200) continue; const h = hue(px[i], px[i + 1], px[i + 2]); if (h < 0) continue; let k = -1, best = 22; HUES.forEach((v, j) => { const e = Math.min(Math.abs(h - v), 360 - Math.abs(h - v)); if (e < best) { best = e; k = j; } }); if (k >= 0) pts[k].push([x, y]); } return pts; };
          const mean = (a, j) => a.reduce((s, p) => s + p[j], 0)/Math.max(1, a.length);
          const sd = (a, j) => { const m = mean(a, j); return Math.sqrt(a.reduce((s, p) => s + (p[j] - m)**2, 0)/Math.max(1, a.length)); };
          const corr = a => { const mx = mean(a, 0), my = mean(a, 1); let sxy = 0, sxx = 0, syy = 0; for (const [x, y] of a) { sxy += (x - mx)*(y - my); sxx += (x - mx)**2; syy += (y - my)**2; } return sxy/Math.sqrt(sxx*syy || 1); };
          const out = {}, kit = (design, third) => ({ shirt:C.shirt, trim:C.trim, third:third ? C.third : null, design, hoops:design === 'hoops' });
          const stat = (design, third, d8) => { const p = cls(bake(kit(design, third), d8)), n = p[0].length + p[1].length + p[2].length;
            return { n, s:p[0].length/n, t:p[1].length/n, th:p[2].length/n, sx:mean(p[0], 0), tx:mean(p[1], 0), ty:mean(p[1], 1), sy:mean(p[0], 1), tsd:sd(p[1], 1), asd:sd([...p[0], ...p[1]], 1), corr:corr(p[1]), pts:p }; };
          const plain = stat('plain', false, 0); out.plain = [plain.t, plain.th];
          const hb = stat('hoops', false, 0), h3 = stat('hoops', true, 0); out.hoops = [hb.t, h3.t, h3.th];
          const hvB = stat('halves', false, 0), hvF = stat('halves', false, 4), hvR = stat('halves', false, 2), hvL = stat('halves', false, 6), hv3 = stat('halves', true, 0);
          out.halves = [hvB.tx - hvB.sx, hvF.tx - hvF.sx, hvR.s, hvR.t, hvL.s, hvL.t, hv3.th];
          const qB = stat('quarters', false, 0), midY = mean([...qB.pts[0], ...qB.pts[1]], 1);
          const up = qB.pts[1].filter(p => p[1] < midY), dn = qB.pts[1].filter(p => p[1] >= midY), upS = qB.pts[0].filter(p => p[1] < midY), dnS = qB.pts[0].filter(p => p[1] >= midY);
          out.quarters = [mean(up, 0) - mean(upS, 0), mean(dn, 0) - mean(dnS, 0), qB.t];
          const sB = stat('sash', false, 0), sF = stat('sash', false, 4), s3 = stat('sash', true, 0); out.sash = [sB.corr, sF.corr, s3.th];
          const bB = stat('band', false, 0), b3 = stat('band', true, 0), was = new Set(plain.pts[1].map(([x, y]) => x + ',' + y)), added = bB.pts[1].filter(([x, y]) => !was.has(x + ',' + y));
          out.band = [sd(added, 1)/bB.asd, bB.t, b3.th];   // the trim it adds to Plain's collar and cuffs: one narrow band
          const stB = stat('stripes', false, 0); let flips = 0, last = -1; { const ys = stB.pts[0].concat(stB.pts[1]), y0 = Math.round(mean(ys, 1)); const row = new Map(); stB.pts.forEach((a, k) => a.forEach(([x, y]) => { if (y === y0) row.set(x, k); })); for (const x of [...row.keys()].sort((a, b) => a - b)) { const k = row.get(x); if (k !== last && last >= 0) flips++; last = k; } }
          out.stripes = [flips, stB.t];
          const same = (a, b) => { const x = bake(a, 0), y = bake(b, 0); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false; return true; };
          out.same = [same({ shirt:C.shirt, trim:C.trim, design:'plain', third:null, hoops:false }, { shirt:C.shirt, trim:C.trim, hoops:false }), same({ shirt:C.shirt, trim:C.trim, design:'hoops', third:null, hoops:true }, { shirt:C.shirt, trim:C.trim, hoops:true })];
          // the bake's cost, per picture, over every idle facing
          const t0 = performance.now(); for (let i = 0; i < 40; i++) for (let d = 0; d < 8; d++) bake(kit('plain', false), d); const tp = performance.now() - t0;
          const t1 = performance.now(); for (let i = 0; i < 40; i++) for (let d = 0; d < 8; d++) bake(kit('quarters', true), d); const tq = performance.now() - t1;
          out.ms = [tp/320, tq/320];
          return out;
        });
        const f = v => Array.isArray(v) ? v.map(f).join(' ') : typeof v === 'number' ? v.toFixed(2) : String(v);
        ok(r.plain[0] < 0.12 && r.plain[1] === 0, `Plain: the shirt colour, the trim at the collar and cuffs only, no third (${f(r.plain)})`);
        ok(r.hoops[0] > 0.25 && r.hoops[1] > 0.12 && r.hoops[2] > 0.12, `Hoops: the trim's hoops, and with a third the hoops in turn (${f(r.hoops)})`);
        ok(r.halves[0] < -4 && r.halves[1] > 4 && r.halves[2] > r.halves[3] && r.halves[5] > r.halves[4] && r.halves[6] > 0, `Halves: his left in the trim, the picture's left from behind and its right from in front; side on his right shows the shirt colour and his left (a mirrored bake) the trim; the third on the collar (${f(r.halves)})`);
        ok(r.quarters[0] < -4 && r.quarters[1] > 4 && r.quarters[2] > 0.3, `Quarters from behind: the trim his left shoulder (the picture's top left) and his right hip (${f(r.quarters)})`);
        ok(r.sash[0] > 0.3 && r.sash[1] < -0.3 && r.sash[2] > 0.02, `Sash: his left shoulder to his right hip, front and back, edged in the third (${f(r.sash)})`);
        ok(r.band[0] < 0.3 && r.band[1] > 0.1 && r.band[2] > 0.02, `Chest Band: one band across the chest, edged in the third (${f(r.band)})`);
        ok(r.stripes[0] >= 4 && r.stripes[1] > 0.2, `Stripes: stripes across the back (${f(r.stripes)})`);
        ok(r.same.every(Boolean), 'Plain and two-colour Hoops bake byte for byte as a 1.7-shaped kit does');
        console.log(`  bake per picture, idle at 64px: plain ${r.ms[0].toFixed(3)} ms, Quarters with a third ${r.ms[1].toFixed(3)} ms (a row's frame and map cached after its first)`);
        // a real match on Mid, one player: the pictures the game itself bakes (artCell, artBake) carry the design. A made Halves side in green and
        // blue at home to Wilmslow: its colour maps are made, mirrored ones too, and its pictures, baked through artCell at each facing,
        // put his left in the blue: the picture's left from behind, its right from in front, and side on his left (a picture baked
        // mirrored, never his right flipped) mostly blue, his right far less so
        const m = await page.evaluate(() => {
          const T = window.__tryline, K = T.kits, D = T.debug, S = D.settings(), A = K.ART();
          const made = T.teams.cleanTeam({ key:'kh', id:'KHV', name:'Halves Made', kit:'#109a52', trim:'#2050b0', design:'halves', pace:3, power:3, handling:3, kicking:3, stamina:3 }, 0);
          S.cam = 2; T.newMatch(made, T.teams.ALL_TEAMS.find(t => t.id === 'WIL'), { halfLen:240, diff:1 }); D.setMode('match'); D.setTwo(false);
          for (let i = 0; i < 600; i++) { T.update(T.STEP); D.render(T.STEP); }
          const keys = new Set(); for (const mp of A.dmaps.values()) for (const k in mp) keys.add(k);
          const p = T.M.players.find(q => q.team === 0), w = T.M.players.find(q => q.team === 1), look = K.lookOf(p);
          const hue = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (mx < 40 || d/mx < 0.35) return -1; let h = mx === r ? ((g - b)/d) % 6 : mx === g ? (b - r)/d + 2 : (r - g)/d + 4; return (h*60 + 360) % 360; };
          const at = d8 => {
            const pose = { ...K.sprite('idle', 0, d8, false, look) }, slot = K.cell(p, {}, pose, 1, true), c = slot.c, px = slot.g.getImageData(slot.x, slot.y, c.w, c.h).data, pts = [[], []];
            // above the shorts only: his socks are in the shirt colour
            for (let y = 0; y < c.h*0.6; y++) for (let x = 0; x < c.w; x++) { const i = (y*c.w + x)*4; if (px[i + 3] < 200) continue; const h = hue(px[i], px[i + 1], px[i + 2]); if (h < 0) continue; [148, 220].forEach((v, j) => { if (Math.min(Math.abs(h - v), 360 - Math.abs(h - v)) < 22) pts[j].push(x); }); }
            const mean = a => a.reduce((s, v) => s + v, 0)/Math.max(1, a.length), n = pts[0].length + pts[1].length;
            return { s:pts[0].length/n, t:pts[1].length/n, dx:mean(pts[1]) - mean(pts[0]), mirror:pose.mirror };
          };
          const out = { keys:[...keys].sort(), asym:[K.asym(p), K.asym(w)], back:at(0), right:at(2), front:at(4), left:at(6) };
          D.exitMatch(); D.setMode('menu');
          return out;
        });
        const g = v => `${v.s.toFixed(2)}/${v.t.toFixed(2)} ${v.dx.toFixed(1)}`;
        ok(m.keys.includes('0halves2') && m.keys.includes('1halves2') && m.asym[0] === true && m.asym[1] === false, `a real match on Mid: the Halves side's colour maps made, mirrored ones too, and it alone baked mirrored (${m.keys.join(' ')})`);
        ok(m.back.dx < -4 && m.front.dx > 4 && m.left.mirror && m.left.t - m.right.t > 0.1 && m.left.t > m.left.s,
          `the match's own bakes (artCell): his left in the trim from behind (${g(m.back)}) and in front (${g(m.front)}); side on, his left, baked mirrored, mostly the trim (${g(m.left)}) and far more of it than his right shows (${g(m.right)})`);
      }
      ok(!errors.length, `no page errors in the sprite checks (${errors.join('; ') || 'none'})`);
      await ctx.close();
    }
    for (const [w, h] of [[844, 390], [667, 375], [844, 340], [667, 320], [568, 320]]) {
      const at = `${w}x${h}`, { ctx, page, errors } = await open(w, h);
      const st = () => page.evaluate(() => {
        const $ = id => document.getElementById(id), d = window.__tryline.stamina.draft(), vis = el => !!el && el.offsetParent !== null && el.getBoundingClientRect().height > 0;
        const bs = [...$('bd-design').children], third = [...$('bd-third').children];
        return { design:d.design || null, hoops:!!d.hoops, third:d.third || null, kit:d.kit, trim:d.trim, name:$('bd-dname').textContent, thirdShown:vis($('bd-third-f')), labels:bs.map(b => b.getAttribute('aria-label')), pressed:bs.findIndex(b => b.getAttribute('aria-pressed') === 'true'),
          sizes:bs.map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.width*10)/10, Math.round(r.height*10)/10]; }), strip:(() => { const r = $('bd-design').getBoundingClientRect(), f = $('bd-kit').getBoundingClientRect(); return [r.left, r.right, f.left, f.right]; })(),
          first:third[0] && third[0].textContent, firstPressed:third[0] && third[0].getAttribute('aria-pressed'), two:third[0] && third[0].classList.contains('two'), hiddenCols:third.filter(b => b.hidden).map(b => b.dataset.c), shownCols:third.filter(b => !b.hidden && b.dataset.c).length,
          wide:$('s-build').scrollWidth - $('s-build').clientWidth, preview:$('bd-jersey').innerHTML, active:document.activeElement && (document.activeElement.dataset.design || document.activeElement.id) };
      });
      await page.evaluate(() => { const T = window.__tryline; T.debug.openTeams('quick'); T.stamina.openBuilder(null); document.querySelectorAll('#bd-level-grid [data-level]')[5].click(); });
      let s = await st();
      ok(json(s.labels) === json(['Plain', 'Hoops', 'Halves', 'Quarters', 'Stripes', 'Sash', 'Chest Band']) && s.pressed === 0 && s.name === 'Plain' && !s.thirdShown, `${at}: Design is seven shirts, Plain to Chest Band, Plain chosen and named, no Third Colour on Plain`);
      const minW = Math.min(...s.sizes.map(z => z[0])), hs = s.sizes.map(z => z[1]);
      ok(hs.every(v => v >= 44) && minW >= 40.5 && (w !== 667 || minW < 44) && s.strip[0] >= s.strip[2] - 0.5 && s.strip[1] <= s.strip[3] + 0.5 && s.wide <= 0,
        `${at}: each Design button ${s.sizes[0][0]}x${s.sizes[0][1]} (44 tall; 41 wide at 667, as the owner approved), the strip inside the panel's padding, no sideways scroll`);
      await page.tap('#bd-design [data-design="quarters"]');
      s = await st();
      ok(s.design === 'quarters' && !s.hoops && s.name === 'Quarters' && s.thirdShown && s.first === 'None' && s.firstPressed === 'true' && s.two && json(s.hiddenCols.sort()) === json([s.kit, s.trim].sort()) && s.shownCols === 10,
        `${at}: a tap on Quarters names it and shows Third Colour, None first and chosen, the shirt's and the trim's colours left out (None over two places)`);
      const none = await page.getByRole('button', { name:'None', exact:true }).count(), grp = await page.getByRole('group', { name:'Third Colour', exact:true }).count();
      ok(none === 1 && grp === 1, `${at}: None is named None, as it reads, in a group named Third Colour (${none}, ${grp})`);
      await page.tap('#bd-third [aria-label="Red"]');
      s = await st();
      ok(s.third === '#c8102e' && s.firstPressed === 'false' && /d-quarters/.test(s.preview) && /--third:#c8102e/.test(s.preview), `${at}: Red as the third, shown on the preview shirt`);
      await page.tap('#bd-kit [aria-label="Red"]');
      s = await st();
      ok(s.third === null && s.firstPressed === 'true' && s.kit === '#c8102e' && s.hiddenCols.includes('#c8102e'), `${at}: the shirt turned Red clears a Red third`);
      await page.tap('#bd-design [data-design="plain"]');
      s = await st();
      ok(s.design === 'plain' && !s.thirdShown, `${at}: back to Plain, Third Colour hidden again`);
      // the keyboard: Tab from Short Name goes through the seven, Enter or Space picks
      await page.focus('#bd-code'); await page.keyboard.press('Tab'); const k1 = (await st()).active; await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
      const k2 = await st(); await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Space'); const k3 = await st();
      ok(k1 === 'plain' && k2.design === 'halves' && k3.design === 'stripes', `${at}: the keyboard: Tab from Short Name to Plain, then on through them; Enter and Space pick (${k1}, ${k2.design}, ${k3.design})`);
      // a controller: Down from Change Level reaches the strip, Right walks it, A picks, Down to Shirt, Trim and Third Colour, Up back
      const pad = await page.evaluate(() => {
        const T = window.__tryline, $ = id => document.getElementById(id), f = () => document.querySelector('.padfocus'), where = el => !el ? 'none' : el.dataset.design ? 'd:' + el.dataset.design : el.closest('#bd-kit') ? 'kit' : el.closest('#bd-trim') ? 'trim' : el.closest('#bd-third') ? 'third' : el.id || el.className;
        const chosen = 'd:' + T.kits.designOf(T.stamina.draft());
        T.navMove(0, 0, 0); for (let i = 0; i < 12 && f() !== $('bd-level-change'); i++) T.navMove(0, 0, -1);
        const path = [where(f())];
        for (let i = 0; i < 6 && !(f() && f().dataset.design); i++) { T.navMove(0, 0, 1); path.push(where(f())); }
        for (let i = 0; i < 6 && where(f()) !== 'd:plain'; i++) T.navMove(0, -1, 0);   // Left to the strip's start, then Right along it
        const walk = [where(f())]; for (let i = 0; i < 6; i++) { T.navMove(0, 1, 0); walk.push(where(f())); }
        T.navPress(0); const picked = T.stamina.draft().design;
        const down = []; for (let i = 0; i < 6; i++) { T.navMove(0, 0, 1); down.push(where(f())); }
        const ups = []; for (let i = 0; i < 12 && !(f() && f().dataset.design); i++) { T.navMove(0, 0, -1); ups.push(where(f())); }
        return { chosen, path, walk, picked, down, ups, ring:(() => { const el = f(), r = el && el.getBoundingClientRect(), s = $('bd-design').getBoundingClientRect(); return el ? [r.left >= s.left - 0.5, r.right <= s.right + 0.5] : []; })() };
      });
      ok(pad.path[0] === 'bd-level-change' && pad.path[pad.path.length - 1] === pad.chosen && pad.chosen !== 'd:plain' && json(pad.walk) === json(['plain', 'hoops', 'halves', 'quarters', 'stripes', 'sash', 'band'].map(d => 'd:' + d)) && pad.picked === 'band'
        && pad.down.includes('kit') && pad.down.includes('trim') && pad.down.includes('third') && pad.ups[pad.ups.length - 1] === 'd:band' && pad.ring.every(Boolean),
        `${at}: a controller: Down from Change Level onto the design chosen (${pad.chosen}), Left and Right along it, Plain to Chest Band, A picks, Down through Shirt, Trim and Third Colour, Up back onto Chest Band, the ring inside the strip (${pad.path.join('>')} | ${pad.walk.join(' ')} | ${pad.down.join(' ')} | ${pad.ups.join(' ')})`);
      // the save, and the side reopened as it was
      const saved = await page.evaluate(() => {
        const T = window.__tryline, $ = id => document.getElementById(id);
        $('bd-design').querySelector('[data-design="quarters"]').click(); $('bd-third').querySelector('[aria-label="Gold"]').click(); $('bd-name').value = 'Kit Test'; $('bd-name').dispatchEvent(new Event('input')); $('bd-save').click();
        const H = Object.values(T).find(v => v && typeof v.custom === 'function' && typeof v.load === 'function'), t = H.custom().find(c => c.name === 'Kit Test');
        const raw = JSON.parse(localStorage.getItem('tryline.v1')).custom.find(c => c.name === 'Kit Test');
        T.stamina.openBuilder(t);
        return { t:{ design:t.design, third:t.third, hoops:t.hoops }, raw:{ design:raw.design, third:raw.third, hoops:raw.hoops }, pressed:[...$('bd-design').children].find(b => b.getAttribute('aria-pressed') === 'true').dataset.design, thirdPressed:[...$('bd-third').children].find(b => b.getAttribute('aria-pressed') === 'true').getAttribute('aria-label'), name:$('bd-dname').textContent };
      });
      ok(saved.t.design === 'quarters' && /^#/.test(saved.t.third) && saved.t.hoops === false && json(saved.raw) === json(saved.t) && saved.pressed === 'quarters' && saved.thirdPressed === 'Gold' && saved.name === 'Quarters',
        `${at}: saved with Quarters and a Gold third, and reopened with both chosen (${json(saved)})`);
      if (at === '667x375' || at === '844x390') {   // KITS off: Plain and Hoops in two equal halves of the strip, as 1.7's Pattern, and no Third Colour
        const off = await page.evaluate(() => {
          const T = window.__tryline, $ = id => document.getElementById(id); T.kits.KITS.on = false;
          try {
            T.debug.openTeams('quick'); T.stamina.openBuilder(null); document.querySelectorAll('#bd-level-grid [data-level]')[5].click(); $('bd-design').querySelector('[data-design="hoops"]').click();
            const shown = [...$('bd-design').children].filter(b => !b.hidden).map(b => { const r = b.getBoundingClientRect(); return [b.dataset.design, Math.round(r.width*10)/10, Math.round(r.height*10)/10]; }), s = $('bd-design').getBoundingClientRect();
            return { shown, strip:Math.round(s.width*10)/10, third:!$('bd-third-f').hidden, design:T.stamina.draft().design, hoops:T.stamina.draft().hoops };
          } finally { T.kits.KITS.on = true; }
        });
        const [a, b] = off.shown;
        ok(off.shown.length === 2 && a[0] === 'plain' && b[0] === 'hoops' && Math.abs(a[1] - b[1]) < 1 && a[1] + b[1] >= off.strip - 2 && a[2] >= 44 && !off.third && off.hoops === true,
          `${at}, KITS off: Plain and Hoops alone, in two equal halves of the strip (${a && a[1]} and ${b && b[1]} of ${off.strip}), Hoops picks, no Third Colour`);
      }
      ok(!errors.length, `${at}: no page errors (${errors.join('; ') || 'none'})`);
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
}
await browserChecks();

console.log(`Kits: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
