// Kit designs and a third colour (1.8; the owner, 14 Nov 2026: "Quad sections are ok and add a third colour too for completeness", then
// Build on the mock-ups and Include for Create Team's Design row). src/kit-design.js, the wiring in src/data.js, the sprites' bake
// (src/render-art.js), the close-ups (src/render-setpieces.js fig, src/render-goals.js figFB), the clash rule (src/match.js awayKit),
// the saves (src/persistence.js) and Create Team's Design and Third Colour rows (src/ui-menus.js). The owner's two answers of 15 Nov 2026
// too: a Plain shirt's third as an edge at the collar and cuffs (kitEdgeOf; the icon's .jersey.edge, the sprites' artEdgeFrame, the
// close-ups' line and cuffs), and Halves and Quarters side on with the far half about a third of the shirt (ART_FAR in the sprites, the
// outer sixth of the torso each side in fig). Its browser part (each design's icon as drawn, the sprite bake sampled pixel by pixel, the
// Plain edge's pixels and the far half's share by hue, the Top camera, the close-ups, Create Team's rows by touch, keyboard and pad at
// five sizes) runs where Playwright is installed.
// node tools/kits.mjs   Exits 1 on any failure.
process.env.SEED ??= '41';
const { T, bot, reseed, rndCalls, LOCAL_CHILD } = await import('./harness.mjs');
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawnSync, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resultsServe } from './results-serve.mjs';
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
    && K.designOf(wib) === 'plain' && wib.third === '#109a52' && K.thirdOf(wib) === null && K.edgeOf(wib) === wib.third && K.designOf(team('FAR')) === 'hoops' && K.thirdOf(team('FAR')) === null && K.edgeOf(team('FAR')) === null && K.designOf(team('ARG')) === 'hoops' && K.designOf(team('ENG')) === 'plain' && K.edgeOf(team('ENG')) === null,
    'HAC halves, Bromyard and Old Halesonians chest bands (the latter edged in red), High Wycombe hoops with white; Wimborne plain, its third kept and drawn as its collar and cuffs\' edge (kitEdgeOf), never as a design\'s third (kitThirdOf null, so the clash rule is as it was); Farnham and Argentina hooped as ever');
  // the owner, 15 Nov 2026 ("Show It as a Collar Trim"): the 12 plain clubs with a third in the research, each drawn with its edge
  const PLAIN3 = ['WIB', 'WNO', 'WOO', 'SHO', 'TOT', 'OCO', 'OWY', 'VIP', 'GRS', 'MAV', 'STA', 'OCV'], edged = X.ALL_TEAMS.filter(t => K.edgeOf(t));
  ok(json(edged.map(t => t.id).sort()) === json([...PLAIN3].sort()) && PLAIN3.map(team).every(t => t && K.designOf(t) === 'plain' && K.thirdOf(t) === null && K.edgeOf(t) === t.third && t.third !== t.kit && t.third !== t.trim)
    && json(PLAIN3.map(id => team(id).name)) === json(['Wimborne', 'West Norfolk', 'Woodford', 'Stanford-le-Hope', 'Tottonians', 'Old Colfeians', 'Oadby Wyggs', 'Vipers', 'Grasshoppers', 'Malvern', 'Stamford', 'Old Coventrians']),
    `the 12 plain clubs with a third, and no other side, have an edge (${edged.map(t => t.id).join(' ')})`);
  ok(offDo(() => X.ALL_TEAMS.every(t => K.edgeOf(t) === null)) && offDo(() => K.edgeOf({ kit:'#111111', trim:'#222222', third:'#333333' }) === null), 'KITS off: no side has an edge');
  const mal = team('MAV'), side = X.cleanSide(JSON.parse(json(mal))), moved = X.cleanSide({ ...JSON.parse(json(mal)), kit:'#2050b0' });
  ok(K.edgeOf({ kit:'#111111', trim:'#222222', third:'#333333' }) === '#333333' && K.edgeOf({ kit:'#111111', trim:'#222222', design:'plain', hoops:true, third:'#333333' }) === '#333333'
    && K.edgeOf({ kit:'#111111', trim:'#222222', design:'band', third:'#333333' }) === null && K.edgeOf({ kit:'#111111', trim:'#222222', hoops:true, third:'#333333' }) === null
    && K.edgeOf({ kit:'#111111', trim:'#222222', third:'#222222' }) === null && K.edgeOf({ kit:'#111111', trim:'#222222', third:'#111111' }) === null && K.edgeOf({ kit:'#111111', trim:'#222222', third:'red' }) === null && K.edgeOf({ kit:'#111111', trim:'#222222', third:['#333333'] }) === null
    && !('third' in side) && K.edgeOf(side) === mal.third && !('third' in moved) && K.edgeOf(moved) === null && K.edgeOf({ ...side, custom:true }) === null,
    'an edge only on Plain, as a hex, never the shirt\'s or the trim\'s colour; a club\'s side saved in a championship (cleanSide, no third kept) takes its club\'s edge in the club\'s own shirt and trim, and not in another shirt or as a made side');
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
  ok(one('plain') === '<span class="jw "><span class="jersey" style="--kit:#1b2747;--trim:#f2b01e"></span></span>' && one('hoops') === '<span class="jw "><span class="jersey hoops" style="--kit:#1b2747;--trim:#f2b01e"></span></span>'
    && one('plain', '#1b2747') === one('plain') && one('plain', '#F2B01E') === one('plain'),
    'Plain with no third (or one in the shirt\'s or the trim\'s colour) and two-colour Hoops: the icon exactly as 1.7 drew it');
  ok(one('plain', th) === '<span class="jw "><span class="jersey edge" style="--kit:#1b2747;--trim:#f2b01e;--third:#c8102e"></span></span>' && J(team('OCO')) === '<span class="jw "><span class="jersey edge" style="--kit:#1b2747;--trim:#f2b01e;--third:#7c1431"></span></span>'
    && offDo(() => one('plain', th)) === one('plain'),
    'Plain with a third: 1.7\'s shirt with the third at the collar and the sleeves (.jersey.edge), as Old Colfeians shows; KITS off 1.7\'s markup');
  // a dark third (luma under 0.2) sits outside the collar's trim, against the shirt: inside, it melts into the neck hole beside it
  ok(J(team('WOO')) === '<span class="jw "><span class="jersey edge out" style="--kit:#a99bd6;--trim:#f2efe6;--third:#1c1c1c"></span></span>' && one('plain', '#1c1c1c') === '<span class="jw "><span class="jersey edge out" style="--kit:#1b2747;--trim:#f2b01e;--third:#1c1c1c"></span></span>'
    && json(['WIB', 'WNO', 'WOO', 'SHO', 'TOT', 'OCO', 'OWY', 'VIP', 'GRS', 'MAV', 'STA', 'OCV'].filter(id => J(team(id)).includes('edge out'))) === json(['WOO', 'VIP', 'GRS']) && offDo(() => J(team('WOO'))) === offDo(() => J({ ...team('WOO'), third:null })),
    'Plain with a dark third: the third outside the collar\'s trim (.jersey.edge.out), Woodford, Vipers and Grasshoppers in black; KITS off 1.7\'s markup');
  {
    const css = fs.readFileSync(fileURLToPath(new URL('../styles.css', import.meta.url)), 'utf8');
    ok(/\.jersey\.edge::before\{[^}]*var\(--third\)[^}]*var\(--trim\)\}/.test(css) && /\.jersey\.edge::after\{background:linear-gradient\(var\(--trim\) 0 55%,var\(--third\) 55%\)\}/.test(css)
      && /\.jersey\.edge\.out::before\{background:[^}]*var\(--trim\)[^}]*var\(--trim\)[^}]*,var\(--third\)\}/.test(css) && !/\.jersey\.edge\.out::before\{[^}]*(left|right|height|top):/.test(css),
      'the edge\'s icon in styles.css: the collar\'s V in the trim with the third inside it, the sleeve band in the trim edged in the third; a dark third\'s V the same shape, in the third with the trim inside it');
  }
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
  const l17 = (l, l0, c) => {   // l0 (1.7's log) is l in order, and every call left over is the edge's: a fill or a stroke in c, a path, a width or a cap
    let i = 0; const left = [];
    for (const r of l) { if (i < l0.length && json(r) === json(l0[i])) i++; else left.push(r); }
    return i === l0.length && left.length > 0 && left.every(r => (r[0] === 'fillRect' && r[1] === c) || (r[0] === 'stroke' && r[1] === c) || ['beginPath', 'moveTo', 'lineTo', 'stroke', 'lineWidth', 'lineCap'].includes(r[0]));
  };
  const old = { shirt:'#1b2747', trim:'#f2b01e', hoops:false, shorts:'#ece9df' }, oldH = { ...old, hoops:true };
  ok(json(log(() => K.fig(0, 0, 100, kit('plain'), { face:1 }))) === json(log(() => K.fig(0, 0, 100, old, { face:1 }))) && json(log(() => K.figFB(0, 0, 100, 0, { kit:kit('hoops'), back:true, num:9 }))) === json(log(() => K.figFB(0, 0, 100, 0, { kit:oldH, back:true, num:9 })))
    && json(log(() => K.fig(0, 0, 100, kit('hoops'), { face:-1 }))) === json(log(() => K.fig(0, 0, 100, oldH, { face:-1 }))) && json(log(() => K.figFB(0, 0, 100, 0, { kit:kit('plain', '#c8102e'), num:4 }))) === json(log(() => K.figFB(0, 0, 100, 0, { kit:old, num:4 }))),
    'Plain and two-colour Hoops: fig and figFB make 1.7\'s calls, call for call');
  // a Plain shirt's edge (kitEdgeOf): 1.7's calls, every one in order, and the edge's own beside them: the collar's top edge (figFB) or the
  // trim's (fig) in the third, and each cuff at its sleeve's end; nothing else in the third
  {
    const ek = { ...kit('plain'), edge:'#7c1431' };
    const fb0 = log(() => K.figFB(0, 0, 100, 0, { kit:old, back:true, num:4 })), fb1 = log(() => K.figFB(0, 0, 100, 0, { kit:ek, back:true, num:4 })), ff1 = log(() => K.figFB(0, 0, 100, 0, { kit:ek }));
    const f0 = log(() => K.fig(0, 0, 100, old, { face:1 })), f1 = log(() => K.fig(0, 0, 100, ek, { face:1 })), fl1 = log(() => K.fig(0, 0, 100, ek, { face:-1, arms:'up' }));
    const fills = l => rects(l, '#7c1431'), cuffs = l => l.filter(r => r[0] === 'stroke' && r[1] === '#7c1431').length;
    const top = (l, y) => fills(l).length === 1 && Math.abs(fills(l)[0][3] - y) < 0.01 && fills(l)[0][5] <= 2.5;
    ok(fb1.length > fb0.length && top(fb1, -150 + 2) && top(ff1, -150 + 2) && cuffs(fb1) === 2 && cuffs(ff1) === 2 && top(f1, -50) && cuffs(f1) === 1 && top(fl1, -50) && cuffs(fl1) === 1
      && l17(f1, f0, '#7c1431') && l17(fb1, fb0, '#7c1431'),
      `a Plain shirt with an edge: fig and figFB make 1.7's calls in order, with the edge beside them: a thin line at the collar's top (figFB) or the trim's (fig) and a cuff at each sleeve's end (figFB ${fills(fb1).length} and ${cuffs(fb1)}, fig ${fills(f1).length} and ${cuffs(f1)})`);
  }
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
  // the owner, 15 Nov 2026 ("Widen the Strip"): the far half the outer sixth of the torso at his back and at his chest, a third in all, so
  // both colours read at a glance (1.8's strips came to 0.23 of the painted area here)
  {
    // each painted cell is far when its colour is not the one his near half gives at its height (the cell's middle, as kitPaintBox
    // takes it: z 0.95 - y/sc*0.78), so a quarter's near colour, which flips at the chest, is measured as Halves' is
    const share = (f, d) => { const l = log(() => K.fig(0, 0, 200, kit(d), { face:f })), near = f > 0 ? -0.2 : 0.2; let n = 0, fa = 0;
      for (const r of [...rects(l, '#1b2747'), ...rects(l, '#f2b01e')]) { const a = r[4]*r[5], z = 0.95 - (r[3] + r[5]/2)/200*0.78; if ((r[1] === '#f2b01e' ? 1 : 0) === K.paint(d, z, near, 0, null)) n += a; else fa += a; }
      return fa/(n + fa); };
    const got = [share(1, 'halves'), share(-1, 'halves'), share(1, 'quarters'), share(-1, 'quarters')];
    const qn = [1, -1].every(f => { const l = log(() => K.fig(0, 0, 200, kit('quarters'), { face:f })); return rects(l, '#1b2747').length > 0 && rects(l, '#f2b01e').length > 0; });
    ok(got.every(v => v > 0.33 && v < 0.42) && qn, `fig side on, a big man: Halves' and Quarters' far half a third of the painted torso or a little more, facing either way (Halves ${got.slice(0, 2).map(v => v.toFixed(3)).join(' ')}, Quarters ${got.slice(2).map(v => v.toFixed(3)).join(' ')})`);
  }
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
  // and a real Wimborne v Old Colfeians on Mid, the duels live, a lineout, a scrum and a goal kick: each side's edge drawn (its fills and
  // cuffs through kitOf, fig and figFB), none with KITS off
  const edges = () => {
    const n = { '#109a52':0, '#7c1431':0 }; let fill = null;
    S.cam = 2; reseed(82);
    globalThis.__ctxSpy = (k, a) => { if (k === 'fillStyle') fill = a[0]; else if (k === 'fillRect' && fill in n) n[fill]++; else if (k === 'strokeStyle' && a[0] in n) n[a[0]]++; };
    try {
      T.newMatch(team('WIB'), team('OCO'), { halfLen:240, diff:1, duels:'live' }); D.setMode('match'); D.setTwo(false);
      for (let i = 0; i < 900; i++) { bot(0); T.update(STEP); D.render(STEP); }
      for (const scene of [() => T.lineout(1, 62, 0, 'Into Touch'), () => T.scrum(0, 62, 35, 'Knock-On'), () => D.goalKick(0, 98, 24, 'conversion')]) { scene(); for (let i = 0; i < 240; i++) { T.update(STEP); D.render(STEP); } }
    } finally { globalThis.__ctxSpy = null; }
    D.exitMatch(); D.setMode('menu');
    return n;
  };
  const el = edges(), ed = offDo(edges);
  ok(el['#109a52'] >= 20 && el['#7c1431'] >= 20 && ed['#109a52'] + ed['#7c1431'] === 0, `a real match's close-ups draw Wimborne's green edge and Old Colfeians' maroon (${json(el)}); KITS off none (${json(ed)})`);
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
  const pal = X.KIT_COLOURS.map(c => c[1]), sweep = { n:0, turned:0, flat:0, near:0, missed:0, same:0 };
  for (const hk of pal) for (const ht of pal) for (const hd of ['plain', 'halves', 'quarters']) for (const ak of pal) for (const at of pal) for (const ad of ['halves', 'quarters']) {
    if (hk === ht || ak === at) continue;
    const H = mk(hk, ht, hd), A = { ...mk(ak, at, ad), id:'TSA' }, k = K.awayKit(H, A); sweep.n++;
    if (k.design === ad && k.fill === at && k.trim === ak) sweep.turned++;
    if (X.colorDist(k.fill, k.trim) < 60 && !(k.fill === ak && k.trim === at)) sweep.flat++;   // a side's own two colours are its own choice
    const shows = (f, t, d) => (['halves', 'quarters'].includes(d) ? [f, t] : [f]), gap = (f, t, d) => Math.min(...shows(hk, ht, hd).flatMap(x => shows(f, t, d).map(y => X.colorDist(x, y))));
    if (gap(k.fill, k.trim, k.design) < 140) { sweep.near++; if (gap(ak, at, ad) >= 140 || gap('#f2efe6', ak, 'plain') >= 140 || gap('#1c1c1c', ak, 'plain') >= 140) sweep.missed++; }
    const hs = new Set(shows(hk, ht, hd)), as = new Set(shows(k.fill, k.trim, k.design));
    if (hs.size === as.size && [...as].every(c => hs.has(c))) sweep.same++;   // the away side in exactly the home side's colours (1.8: a tie went to its own kit, white and black halves v the same)
  }
  ok(sweep.n > 60000 && sweep.turned === 0 && sweep.flat === 0, `${sweep.n} pairings of Create Team's colours with a split shirt away: none turned round, no white or black kit trimmed in its own colour (${json(sweep)})`);
  ok(sweep.missed === 0, `and readable wherever its own kit, white or black would be: no colour either side shows within 140 of the other's (${sweep.near} left close, each with every option clashing; ${sweep.missed} missed)`);
  ok(sweep.same === 0, `and never in exactly the home side's colours, Halves and Quarters at home too: a tie goes past the away side's own kit (1.8.1; ${sweep.same} the same)`);
  const wb = mk('#f2efe6', '#1c1c1c', 'halves'), kWB = K.awayKit(wb, { ...wb, id:'TSW' }), kBW = K.awayKit(wb, { ...mk('#1c1c1c', '#f2efe6', 'halves'), id:'TSW' }), kQB = K.awayKit(mk('#f2efe6', '#1c1c1c', 'quarters'), { ...mk('#1c1c1c', '#f2efe6', 'quarters'), id:'TSW' });
  ok([kWB, kBW, kQB].every(k => k.fill === '#1c1c1c' && k.trim === '#f2efe6' && k.design === 'plain'), `white and black Halves v the same, v black and white Halves, and Quarters v Quarters reversed: every option shares a colour, and the tie goes to plain black, as e0821ce gave, never the same shirt or its mirror (${json([kWB, kBW, kQB].map(k => k.fill + '/' + k.trim + ' ' + k.design))})`);
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
  // a Plain shirt's edge rides on the away side's own kit, or that kit turned round, and decides nothing: every pairing's kit is as with
  // the edge taken away (the sweep above holds the clash rule to KITS off), and only a side with an edge carries the key
  {
    let n2 = 0, bad = [];
    for (const a of sides) for (const b of sides) {
      if (a === b) continue;
      const k = K.awayKit(a, b), e = K.edgeOf(b); n2++;
      const want = e && ((k.fill === b.kit && k.trim === b.trim) || (k.fill === b.trim && k.trim === b.kit)) && k.design === 'plain' ? e : undefined;
      if (k.edge !== want || ('edge' in k) !== !!want) bad.push(a.id + 'v' + b.id);
    }
    const ink = { id:'TSE', name:'edge', kit:'#1b2747', trim:'#22283a', third:'#c8102e' }, kW = K.awayKit(mk('#1b2747', '#f2b01e', 'plain'), ink), kO = K.awayKit(mk('#c8102e', '#f2b01e', 'plain'), ink), kT = K.awayKit(mk('#1b2747', '#f2b01e', 'plain'), { ...ink, trim:'#f2b01e' });
    ok(n2 > 300000 && !bad.length && kO.edge === '#c8102e' && kO.fill === ink.kit && !('edge' in kW) && kW.design === 'plain' && kT.fill === '#f2b01e' && kT.edge === '#c8102e',
      `${n2} pairings: the away side's edge only on its own kit or that kit turned round (${bad.slice(0, 6).join(' ') || 'none astray'}); a change to white or black drops it (${json(kW)}), turned round keeps it (${json(kT)})`);
    const m1 = (() => { T.newMatch(team('WIB'), team('OCO'), { halfLen:240, diff:1, headless:true }); const k = T.M.kit.map(k => ({ ...k })); D.exitMatch(); return k; })();
    const m2 = offDo(() => { T.newMatch(team('WIB'), team('OCO'), { halfLen:240, diff:1, headless:true }); const k = T.M.kit.map(k => ({ ...k })); D.exitMatch(); return k; });
    ok(m1[0].edge === '#109a52' && m1[0].third === null && m1[1].edge === '#7c1431' && m1[1].fill === '#f2b01e' && m1[1].trim === '#1b2747' && !('edge' in m2[0]) && !('edge' in m2[1]) && json(m2.map(k => [k.fill, k.trim])) === json(m1.map(k => [k.fill, k.trim])) && !('edge' in m0[0]) && !('edge' in m0[1]),
      `Wimborne v Old Colfeians: each side's kit carries its edge, Old Colfeians' turned round to gold against black, the shirts as with KITS off, which carries none; HAC v Wilmslow none (${json(m1)})`);
  }
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
//    Hoops bake byte for byte as a 1.7-shaped kit does; a Plain shirt's edge (kitEdgeOf, artEdgeFrame) a band of the third alongside the
//    collar and cuffs; Halves and Quarters side on with the far half's share by hue about a third, standing and in every moving frame. Then Create Team's Design and Third Colour rows by touch, keyboard and pad at 844x390,
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
    if (resultsServe(req.url, res)) return;   // the week's results.json: 404 unless RESULTS_FILE (tools/results-serve.mjs)
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
          const bake = (kit, d8, frame = 0, grey = false, info = null, clip = 'idle') => {   // grey: the trim's and socks' parts in the shorts' white, so only the shirt's own pixels show a hue
            const pose = K.sprite(clip, frame, d8, false, look), row = pose.row, mirror = pose.mirror, deg = A.man.clips[clip].dirs[pose.dir], q = 1/A.man.px;
            const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; const g = cv.getContext('2d', { willReadFrequently:true });
            K.scratch(); const luts = K.palette({ shorts:'#ece9df', ...kit }, look);
            if (grey) { const P = A.man.parts, w = luts[P.indexOf('shorts') + 1]; luts[P.indexOf('trim') + 1] = w; luts[P.indexOf('socks') + 1] = w; }
            const F = luts.design ? K.frame(row, deg, mirror, K.body(look), luts.design, luts.third) : luts.edge ? K.edgeFrame(row) : null;   // as artBake takes them
            g.translate(128, 250); if (mirror) g.scale(-1, 1); K.blit(g, row, luts, A.man.px, -row[5]*q, -row[6]*q, 256, F);
            if (info) Object.assign(info, { row, mirror, deg });
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
          // a Plain shirt's third (the owner, 15 Nov 2026: "Show It as a Collar Trim"): at each facing, its third only on pixels Plain
          // without one has in the shirt, each beside a pixel of its trim (a band alongside the collar and cuffs, on the side away from his
          // skin), the trim's every pixel still in the trim, the rest of the shirt as it was, and the sock tops (the trim under the shirt's
          // hem) still in the trim; from behind and in front, at the collar and at both cuffs
          const key = ([x, y]) => x + ',' + y;
          out.edge = [0, 4, 2, 6].map(d8 => {
            const a = cls(bake(kit('plain', false), d8)), b = cls(bake({ ...kit('plain', false), edge:C.third }, d8)), trimA = new Set(a[1].map(key)), shirtA = new Set(a[0].map(key));
            const top = Math.min(...a[0].map(p => p[1])), low = Math.max(...a[0].map(p => p[1])), hem = Math.max(...a[0].filter(p => p[1] < (top + low)/2).map(p => p[1])), cx = mean(a[0], 0), socks = p => p[1] > hem;   // the socks are in the shirt colour: the hem is the shirt's lowest pixel in the top half
            const within = (set, [x, y], k) => { for (let v = -k; v <= k; v++) for (let u = -k; u <= k; u++) if (set.has((x + u) + ',' + (y + v))) return true; return false; };   // k pixels: the bake's drawing samples a fraction of a pixel off, so an edge blends a pixel either side, and the trim's own antialiased rim (up a sleeve's outer edge, in front) reads as no hue
            const th = b[2], trimB = new Set(b[1].map(key)), shirtB = new Set(b[0].map(key));
            const onShirt = th.every(p => !trimA.has(key(p)) && within(shirtA, p, 1)), alongside = th.every(p => within(trimA, p, 3)), trimKept = a[1].every(p => trimB.has(key(p))), thB = new Set(th.map(key)), rest = a[0].filter(p => !shirtB.has(key(p)) && !within(thB, p, 1) && !within(trimA, p, 3)).length;   // a shirt pixel changed away from the band and the trim
            const socksKept = a[1].filter(socks).length === b[1].filter(socks).length && a[1].filter(socks).length > 0;
            const collar = th.filter(p => p[1] < top + 6 && Math.abs(p[0] - cx) < 10).length, cuffL = th.filter(p => p[1] > top + 6 && p[0] < cx - 8).length, cuffR = th.filter(p => p[1] > top + 6 && p[0] > cx + 8).length;
            return { d8, n:th.length, onShirt, alongside, trimKept, trim:b[1].length, rest, socksKept, collar, cuffL, cuffR };
          });
          // Halves and Quarters side on (the owner, 15 Nov 2026: "Widen the Strip"): the far half's share of the shirt by hue, each shirt pixel
          // against the colour his near half gives at its height, standing (both idle frames), facing right (90) and left (270, mirrored);
          // and moving, every frame of the run, the sprint and the carry, each way
          const farOf = (design, d8, frame, clip = 'idle') => {
            const info = {}, px = bake(kit(design, false), d8, frame, true, info, clip), { row, mirror, deg } = info, G = K.geom(row, deg, mirror, K.body(look)), pg = A.pages[row[0]], d = pg.data, pw = pg.w*4;
            let near = 0, far = 0;
            for (let y = 0; y < row[4]; y++) for (let x = 0, i = (row[2] + y)*pw + row[1]*4; x < row[3]; x++, i += 4) {
              if (!d[i + 2] || (d[i + 1] >> 4) > 2) continue;
              const cx = Math.floor(mirror ? 128 + row[5] - x - 0.5 : 128 - row[5] + x + 0.5), cy = Math.floor(250 - row[6] + y + 0.5), j = (cy*256 + cx)*4;
              if (px[j + 3] < 200) continue;
              const h = hue(px[j], px[j + 1], px[j + 2]); if (h < 0) continue;
              const k = [0, 1].find(q => Math.min(Math.abs(h - HUES[q]), 360 - Math.abs(h - HUES[q])) < 22); if (k == null) continue;
              const z = G.zc + ((x + 0.5 - G.sx)*G.ux + (y + 0.5 - G.sy)*G.uy)/G.sc;
              if (k === K.paint(design, z, G.near*0.2, 0, null)) near++; else far++;
            }
            return far/Math.max(1, near + far);
          };
          out.far = ['halves', 'quarters'].flatMap(design => [2, 6].flatMap(d8 => [0, 1].map(fr => farOf(design, d8, fr))));
          out.farMove = ['run', 'sprint', 'carry'].map(clip => [clip, ['halves', 'quarters'].flatMap(design => [2, 6].flatMap(d8 => Array.from({ length:A.man.clips[clip].n }, (_, fr) => farOf(design, d8, fr, clip))))]);
          out.same = [same({ shirt:C.shirt, trim:C.trim, design:'plain', third:null, hoops:false }, { shirt:C.shirt, trim:C.trim, hoops:false }), same({ shirt:C.shirt, trim:C.trim, design:'hoops', third:null, hoops:true }, { shirt:C.shirt, trim:C.trim, hoops:true })];
          // the bake's cost, per picture, over every idle facing
          const t0 = performance.now(); for (let i = 0; i < 40; i++) for (let d = 0; d < 8; d++) bake(kit('plain', false), d); const tp = performance.now() - t0;
          const t1 = performance.now(); for (let i = 0; i < 40; i++) for (let d = 0; d < 8; d++) bake(kit('quarters', true), d); const tq = performance.now() - t1;
          out.ms = [tp/320, tq/320];
          return out;
        });
        const f = v => Array.isArray(v) ? v.map(f).join(' ') : typeof v === 'number' ? v.toFixed(2) : String(v);
        ok(r.plain[0] < 0.12 && r.plain[1] === 0, `Plain with no third: the shirt colour, the trim at the collar and cuffs only, no third (${f(r.plain)})`);
        const eg = r.edge.map(e => `${e.d8}: ${e.n} beside ${e.trim} ${e.collar}/${e.cuffL}/${e.cuffR}${e.onShirt ? '' : ' off the shirt'}${e.alongside ? '' : ' away from the trim'}${e.trimKept ? '' : ' trim lost'}${e.rest ? ' shirt ' + e.rest : ''}${e.socksKept ? '' : ' socks moved'}`).join(', ');
        ok(r.edge.every(e => e.n >= 18 && e.onShirt && e.alongside && e.trimKept && e.rest === 0 && e.socksKept) && r.edge.filter(e => e.d8 === 0 || e.d8 === 4).every(e => e.collar >= 5 && e.cuffL >= 6 && e.cuffR >= 6),
          `Plain with a third: a band of the third alongside the collar and cuffs only, on the shirt's own pixels beside the trim, the trim's every pixel kept, the rest of the shirt as it was and the sock tops in the trim; from behind and in front at the collar and both cuffs (${eg})`);
        ok(r.far.every(v => v > 0.28 && v < 0.42), `Halves and Quarters side on: the far half about a third of the shirt by hue, standing, facing either way (1.8: 0.21) (${f(r.far)})`);
        const mv = r.farMove.map(([clip, v]) => `${clip} ${v.length} frames ${Math.min(...v).toFixed(2)} to ${Math.max(...v).toFixed(2)}`).join(', ');
        ok(r.farMove.every(([, v]) => v.length >= 8 && v.every(x => x > 0.28 && x < 0.42)), `Halves and Quarters side on, moving: the far half about a third of the shirt by hue in every frame of the run, the sprint and the carry, facing either way (${mv})`);
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
      { // a real match on Mid, Wimborne (plain black, white trim, a green third) at home: the game's own bakes (artCell) carry its green edge
        // at the collar and cuffs, from behind and in front, and Old Colfeians' maroon on gold, turned round, away
        const w = await page.evaluate(() => {
          const T = window.__tryline, K = T.kits, D = T.debug, S = D.settings(), team = id => T.teams.ALL_TEAMS.find(t => t.id === id);
          S.cam = 2; T.newMatch(team('WIB'), team('OCO'), { halfLen:240, diff:1 }); D.setMode('match'); D.setTwo(false);
          for (let i = 0; i < 300; i++) { T.update(T.STEP); D.render(T.STEP); }
          const near = (r, g, b, c) => Math.abs(r - c[0]) + Math.abs(g - c[1]) + Math.abs(b - c[2]) < 60;
          const at = (p, d8, c) => { const look = K.lookOf(p), pose = { ...K.sprite('idle', 0, d8, false, look) }, slot = K.cell(p, {}, pose, 1, true), cc = slot.c, px = slot.g.getImageData(slot.x, slot.y, cc.w, cc.h).data;
            let n = 0; for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 200 && near(px[i], px[i + 1], px[i + 2], c)) n++; return n; };
          const home = T.M.players.find(q => q.team === 0), away = T.M.players.find(q => q.team === 1);
          const out = { kit:T.M.kit.map(k => k.edge || null), wb:at(home, 0, [16, 154, 82]), wf:at(home, 4, [16, 154, 82]), ob:at(away, 0, [124, 20, 49]), of:at(away, 4, [124, 20, 49]) };
          D.exitMatch(); D.setMode('menu');
          return out;
        });
        ok(json(w.kit) === json(['#109a52', '#7c1431']) && w.wb >= 20 && w.wf >= 20 && w.ob >= 20 && w.of >= 20, `a real match's own bakes (artCell): Wimborne's green edge and Old Colfeians' maroon at the collar and cuffs, from behind and in front, a band of its own beside the trim (inside the trim, as first built, 16 to 28) (${json(w)})`);
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
