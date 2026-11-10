// How to Play (2026-11-09, Gordon: "it's a block of text - better to show controls from a UI perspective and leave it there"): a picture
// of the match screen sideways, the stick and the three action buttons where they sit in play and in their own colours, each part named
// with its jobs (the stick's how in the words of the device: Tap Across and Tap Back on a computer's keys); the scoring strip; on a
// computer or with a controller, the keys and the pad's buttons; Back to Menu alone. Replay Tutorial, which only forgot the tutorial
// (a press showed nothing), is gone, and tutReset stays for the tools. In Chromium (where Playwright is installed): one screen with no
// scroll at 844x390 and 667x375, touch and desk, with an iPhone's insets too, and at 640x360, 740x360, an iPhone X's 812x375 and a
// controller on a Pro Max's 926x428; nothing over anything; the keyboard and a controller reach Back to Menu.
//   node tools/howto.mjs   Exits 1 on any failure.
process.env.SEED ??= '5';
const { T } = await import('./harness.mjs');
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readGameSource } from './source.mjs';
const D = T.debug, $ = id => document.getElementById(id), dir = fileURLToPath(new URL('../', import.meta.url));
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } if (process.env.VERBOSE) console.log(cond ? 'ok  ' : 'FAIL', msg); };
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');
const html = read('index.html'), css = read('styles.css'), game = readGameSource(), js = game.match(/<script>([\s\S]*)<\/script>/)[1];
const at = html.indexOf('<section class="screen" id="s-help"'), help = html.slice(at, html.indexOf('</section>', at));
const SHOW = { touch:['', 't', 'tp'], kb:['', 'k'], pad:['', 'tp'] };   // the how-words each device sees (styles.css): .t a touch screen's only, .tp a touch screen's or a controller's, .k a computer's keys
const text = (h, dev = 'touch') => h.replace(/<small(?: class="([a-z]+)")?>([^<]*)<\/small>\s*/g, (m, c, w) => SHOW[dev].includes(c || '') ? w + ': ' : '').replace(/<[^>]+>/g, '').trim();
const SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'on', 'to', 'in', 'for', 'as', 'at', 'by']);
const titled = s => s.split(/\s+/).filter(Boolean).every((w, i) => (i && SMALL.has(w)) || /^[A-Z0-9]/.test(w));

// 1. the picture: every control named, in Title Case, one label per job, no sentence; the stick's how in each device's words
{
  ok(at > 0 && /<h2 class="title">How to Play<\/h2>/.test(help) && /<div class="ctl" id="h-pic">/.test(help), 'How to Play is its title and the picture');
  const faces = [...help.matchAll(/<span class="ctl-b ([abc])">([^<]+)<\/span>/g)].map(m => m[1] + ':' + m[2]);
  ok(faces.join() === 'c:Sprint,b:Kick,a:Pass', `the three buttons wear their words in play, in the HUD's order (${faces.join(', ')})`);
  const hud = html.slice(html.indexOf('<div id="controls"'), html.indexOf('</div>', html.indexOf('id="btnA"')));
  ok(/<span id="lc">Sprint<\/span>/.test(hud) && /<span id="lb">Kick<\/span>/.test(hud) && /<span id="la">Pass<\/span>/.test(hud) && /<div id="stick"><div id="knob"><\/div><\/div>/.test(hud), 'and they are the HUD\'s: the stick, Sprint, Kick and Pass');
  const group = (k, dev) => [...((help.match(new RegExp(`<div class="ctl-js ${k}">([\\s\\S]*?)<\\/div>`)) || [])[1] || '').matchAll(/<b class="ctl-j [a-z]+">([\s\S]*?)<\/b>/g)].map(m => text(m[1], dev));
  const want = { x:['Drag: Run', 'Flick Across: Side Step', 'Pull Back: Dummy'], b:['Tap: Chip', 'Switch', 'Drop Goal'], a:['Scrum: Push', 'Lineout: Jump', 'Hold: Long Pass', 'Tackle', 'Offload'], p:['Pause'] };
  for (const [k, list] of Object.entries(want)) ok(JSON.stringify(group(k)) === JSON.stringify(list), `${{ x:'the stick', b:'Kick', a:'Pass', p:'the pause button' }[k]} is labelled ${list.join(', ')} (${group(k).join(', ')})`);
  // the stick's how, for the device in use: a computer's keys tap (the hint card's Tap Across and Tap Back, and Run's keys are in the row
  // under the picture); a controller's stick flicks and pulls back as a thumb does. 2026-11-09 review: it said Flick Across on a keyboard
  const words = { kb:['Run', 'Tap Across: Side Step', 'Tap Back: Dummy'], pad:['Run', 'Flick Across: Side Step', 'Pull Back: Dummy'] };
  for (const [dev, list] of Object.entries(words)) ok(JSON.stringify(group('x', dev)) === JSON.stringify(list), `on ${dev === 'kb' ? 'a computer\'s keys' : 'a controller'} the stick reads ${list.join(', ')} (${group('x', dev).join(', ')})`);
  ok(/card\('Side Step', [^\n]*kb \? 'Tap Across' : 'Flick Across'/.test(js) && /card\('Dummy', [^\n]*kb \? 'Tap Back' : 'Pull Back, Push On'/.test(js), 'the keyboard\'s words are the hint card\'s: Tap Across, Tap Back');
  ok(/\.ctl-j small\.k,body\.desk \.ctl-j small\.t,body\.desk:not\(\.dev-pad\) \.ctl-j small\.tp\{display:none\}body\.desk:not\(\.dev-pad\) \.ctl-j small\.k\{display:block\}/.test(css) && /b\.classList\.toggle\('dev-pad', d === 'pad'\)/.test(js), 'CSS shows each device its words, following setDev\'s dev-pad as it changes (a computer\'s keys unless a controller acted last)');
  ok(/<b class="ctl-j x">/.test(help) && [...help.matchAll(/<div class="ctl-js ([abpx])">([\s\S]*?)<\/div>/g)].every(m => [...m[2].matchAll(/class="ctl-j ([a-z])"/g)].every(c => c[1] === m[1])), 'each job wears its control\'s colour: the stick\'s chalk, Kick\'s dark ring, Pass\'s gold');
  const all = [...help.matchAll(/<b class="ctl-j [a-z]+">([\s\S]*?)<\/b>/g)].flatMap(m => text(m[1]).split(': ')).concat(faces.map(f => f.slice(2)));
  const jobs = ['Run', 'Side Step', 'Dummy', 'Pass', 'Long Pass', 'Tackle', 'Offload', 'Push', 'Jump', 'Kick', 'Chip', 'Switch', 'Drop Goal', 'Sprint', 'Pause'];
  ok(jobs.every(j => all.includes(j)) && jobs.every(j => all.filter(x => x === j).length === 1), `the picture names each job in open play, at a scrum and at a lineout, once: ${jobs.join(', ')} (a duel's Block, and Dummy on Kick in a Key Pass, are its own card's)`);
  const every = Object.keys(SHOW).flatMap(dev => [...help.matchAll(/<b class="ctl-j [a-z]+">([\s\S]*?)<\/b>/g)].flatMap(m => text(m[1], dev).split(': ')));
  ok(every.every(titled) && all.every(titled) && !/[.!?]\s|[.!?]<|—|–/.test(help.replace(/<[^>]+>/g, ' ')), `every label on every device is Title Case, and none is a sentence or carries a dash (${every.concat(all).filter(s => !titled(s)).join(', ') || 'all'})`);
  ok(!/[←→↑↓⇐⇒➜»›]/.test(help) && !/[←→↑↓⇐⇒➜»›]/.test(js.slice(js.indexOf('function renderHowTo'), js.indexOf('function renderHowTo') + 1600)), 'no arrow glyph on the screen or in its rows (the arrow keys are CSS triangles)');
  // the jobs are the words the HUD really writes on those buttons
  const hudJs = js.slice(js.indexOf('function updateHud'), js.indexOf("$('la').textContent"));
  ok(/'Offload' : passLong \? 'Long' : 'Pass'/.test(hudJs) && /'Pull Tag' : 'Tackle'/.test(hudJs) && /lb = proPinned\(ht\) \? null : 'Switch'/.test(hudJs) && /return dropZone\(c\)\.ok \? 'Drop Goal' : 'Kick'/.test(js), 'Pass reads Offload, Long and Tackle in play, and Kick reads Switch and Drop Goal: the jobs the picture names');
  ok(/if \(c\.kind === 'scrum'\) return \['Push', null\];/.test(js) && /if \(c\.kind === 'lineout'\) return \['Jump', null\];/.test(js) && /\[la, lb\] = cutLabels\(M\.cut\)/.test(hudJs), 'and Pass reads Push at a scrum and Jump at a lineout (cutLabels), as the picture names them');
  // where they sit: the HUD's own offsets, scaled
  const hudPx = cls => { const r = (css.match(new RegExp('\\.act\\.' + cls + '\\{([^}]*)\\}')) || [])[1] || ''; const w = +(r.match(/width:(\d+)px/) || [])[1], add = +(r.match(/inset-right,0px\)\) \+ (\d+)px/) || [0, 0])[1], bot = +(r.match(/inset-bottom,0px\) \+ (\d+)px/) || [])[1]; return [w, 20 + add, bot]; };
  const picPx = cls => { const r = (css.match(new RegExp('\\.ctl-b\\.' + cls + '\\{([^}]*)\\}')) || [])[1] || ''; return [+(r.match(/width:calc\(var\(--s\)\*(\d+)px\)/) || [])[1], +(r.match(/right:calc\(var\(--s\)\*(\d+)px\)/) || [])[1], +(r.match(/bottom:calc\(var\(--s\)\*(\d+)px\)/) || [])[1]]; };
  const pairs = ['a', 'b', 'c'].map(c => [c, hudPx(c), picPx(c)]);
  ok(pairs.every(([, h, p]) => h.join() === p.join() && h.every(n => n > 0)), `each button sits in the picture where it sits in play, at its size, scaled (${pairs.map(([c, h, p]) => c + ' ' + h.join('/') + ' = ' + p.join('/')).join('; ')})`);
  const stick = (css.match(/#stick\{([^}]*)\}/) || [])[1] || '', knob = (css.match(/#knob\{([^}]*)\}/) || [])[1] || '', ring = (css.match(/\.ctl-ring\{([^}]*)\}/) || [])[1] || '', rk = (css.match(/\.ctl-ring i\{([^}]*)\}/) || [])[1] || '';
  ok(/width:124px/.test(stick) && /width:calc\(var\(--s\)\*124px\)/.test(ring) && /width:54px/.test(knob) && /width:calc\(var\(--s\)\*54px\)/.test(rk) && /\.ctl-p\{[^}]*width:calc\(var\(--s\)\*44px\)/.test(css) && /\.pause\{[^}]*width:44px/.test(css), 'the stick, its knob and the pause button at their sizes in play, scaled');
}

// 2. the rest of the screen: the scoring strip, the two rows on a computer, Back to Menu alone; nothing else
{
  const score = [...help.matchAll(/<div><b>(\d)<\/b><span>([^<]+)<\/span><\/div>/g)].map(m => m[2] + ' ' + m[1]);
  ok(score.join() === 'Try 5,Conversion 2,Penalty 3,Drop Goal 3', `the scoring strip: ${score.join(', ')}`);
  const pts = (js.match(/const POINTS_NORMAL = \{ try:(\d), conversion:(\d), penalty:(\d), dropGoal:(\d) \};/) || []).slice(1);   // the Normal rule set's points (RULES, src/data.js): every match adds from its rule set
  ok(pts.join() === score.map(s => s.slice(-1)).join() && /M\.score\[team\] \+= M\.rules\.points\.try; M\.tries/.test(js) && /M\.score\[team\] \+= M\.rules\.points\[kind === 'conversion' \? 'conversion' : kind === 'drop' \? 'dropGoal' : 'penalty'\]/.test(js) && /M\.score\[team\] \+= M\.rules\.points\.dropGoal; say\('Drop Goal'/.test(js), 'and they are the points the game adds');
  ok(/<div class="ctl-keys desk-only" id="h-keys"><div class="ctl-krow" id="h-kb"><span class="lbl">Keyboard<\/span><\/div><div class="ctl-krow" id="h-pad"><span class="lbl">Controller<\/span><\/div><\/div>/.test(help), 'the Keyboard and Controller rows, on a computer or with a controller only (desk-only)');
  ok(help.indexOf('id="h-pic"') < help.indexOf('id="h-keys"') && help.indexOf('id="h-keys"') < help.indexOf('class="scoring"') && help.indexOf('class="scoring"') < help.indexOf('id="h-back"'), 'in order: the picture, the rows, the scoring strip, Back to Menu');
  ok((help.match(/<button/g) || []).length === 1 && /<button class="btn" id="h-back" data-back>Back to Menu<\/button>\s*<\/div>\s*$/.test(help) && !/row2/.test(help), 'Back to Menu is the only button, a row to itself');
  ok(!/<dl|<dt|<dd|<p[ >]|Replay|Tutorial|Hints|Table|First Matches|50:22|Coach|The Ball|Install|Saving|2 Players|Player 1|web-only|app-only/.test(help), 'nothing else: no prose row, no Replay Tutorial, no Two Players, no browser or app entry');
  // its CSS is one block under its marker, whatever block another change puts after it; nothing of it outside the block
  const mark = '/* ===== how to play ===== */', mi = css.indexOf(mark), mj = css.indexOf('/* =====', mi + mark.length), block = css.slice(mi, mj < 0 ? css.length : mj), rest = css.slice(0, mi) + (mj < 0 ? '' : css.slice(mj));
  ok(mi > 0 && css.split(mark).length === 2 && /\.ctl\{/.test(block) && /#s-help \.scoring\{/.test(block) && /\.ctl-krow\{/.test(block) && !/\.ctl[-{ .:]|#s-help|\.scoring|\.help\{|\.help d[td]/.test(rest), 'its CSS is one block under /* ===== how to play ===== */, nothing of it elsewhere, and the old .help rules are gone');
}

// 3. the rows: the solo map's keys and the pad's glyphs, as the hints draw them; Replay Tutorial gone, tutReset kept
{
  $('b-help').click();
  const kb = $('h-kb').innerHTML, pad = $('h-pad').innerHTML;
  const cell = (caps, label) => `${caps}</span>${label}</span>`;
  ok(!$('s-help').hidden && kb.startsWith('<span class="lbl">Keyboard</span>') && pad.startsWith('<span class="lbl">Controller</span>'), 'How to Play opens with its two rows filled');
  ok(kb.includes('<kbd class="kc">W</kbd><kbd class="kc">A</kbd><kbd class="kc">S</kbd><kbd class="kc">D</kbd></span><span class="ctl-kk alt"><kbd class="kc ar u"></kbd><kbd class="kc ar l"></kbd><kbd class="kc ar d"></kbd><kbd class="kc ar r"></kbd></span>Run</span>')
    && kb.includes(cell('<kbd class="kc">J</kbd>', 'Pass')) && kb.includes(cell('<kbd class="kc">K</kbd>', 'Kick')) && kb.includes(cell('<kbd class="kc">L</kbd>', 'Sprint')) && kb.includes(cell('<kbd class="kc">P</kbd>', 'Pause')), 'the keyboard row: W A S D or the arrows Run, J Pass, K Kick, L Sprint, P Pause (the solo map, the keys the buttons\' corners show)');
  ok(/<span id="la">Pass<\/span><i class="hint kb">J<\/i>/.test(html) && /<span id="lb">Kick<\/span><i class="hint kb">K<\/i>/.test(html) && /<span id="lc">Sprint<\/span><i class="hint kb">L<\/i>/.test(html), 'the same J, K and L the buttons wear on a keyboard');
  const dia = n => `<i class="pad dia">${[0, 1, 2, 3].map(i => i === n ? '<b class="on"></b>' : '<b></b>').join('')}</i>`;
  ok(pad.includes(cell('<i class="pad stick"></i>', 'Run')) && pad.includes(cell(dia(2), 'Pass')) && pad.includes(cell(dia(1), 'Kick')) && pad.includes(cell('<i class="pad sh"></i>', 'Sprint')) && pad.includes(cell('<i class="pad st"></i>', 'Pause')), 'the controller row: the stick Run, the bottom button Pass, the right button Kick, the shoulder Sprint, Start Pause (the hint chips\' glyphs)');
  ok(!/[A-Za-z]<\/kbd>[A-Za-z]/.test(kb) && [...(kb + pad).matchAll(/<\/span>([^<]+)<\/span>/g)].every(m => titled(m[1])), 'every row label Title Case');
  const src = fs.readdirSync(path.join(dir, 'src')).filter(f => f.endsWith('.js')).map(f => read('src/' + f)).join('\n');
  ok(!/h-replay/.test(src + html + read('game.js')) && ![...html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].some(m => /Replay Tutorial/.test(m[1])), 'no button reads Replay Tutorial, and nothing in the game reaches for #h-replay');
  const sw = js.slice(js.indexOf('function renderHintSwitches'), js.indexOf('/* the tutorial */'));
  ok(sw.length > 100 && !/h-replay|tut/.test(sw), 'renderHintSwitches touches no Replay Tutorial');
  D.settings().tut = D.TUT_IDS.slice(); D.tutReset(); ok(typeof D.tutReset === 'function' && D.settings().tut.length === 0, 'tutReset stays, unused by the game, for the tools');
  ok(/\$\('b-help'\)\.addEventListener\('click', \(\) => \{ renderHowTo\(\); showScreen\('s-help'\); \}\);/.test(js) && /\$\('h-back'\)\.addEventListener\('click', \(\) => goHome\(\$\('b-help'\)\)\);/.test(js), 'How to Play opens through renderHowTo, and Back to Menu goes home onto its button');
  $('h-back').click(); ok($('s-help').hidden && !$('s-home').hidden, 'Back to Menu goes home');
}

await browserChecks();
console.log(`How to Play: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;

function chromium() {
  const require = createRequire(import.meta.url);
  for (const from of [() => require('playwright'), () => require(path.join(execFileSync('npm', ['root', '-g'], { stdio:['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright'))]) {
    try { return from().chromium; } catch (e) { /* not here */ }
  }
  return null;
}
// 4. In Chromium: one screen with no scroll at 844x390 and 667x375 (touch, desk, an iPhone's insets), and at 640x360 and 740x360 (a
//    360-tall phone), an iPhone X's 812x375 with its insets and a Pro Max's 926x428 with them, nothing over anything and all in the
//    frame, nothing under 12px, Back to Menu full width at 48px; at 568x320 a scroll but still nothing over anything; the stick's words
//    the device's; Tab and a controller reach Back to Menu, and it goes home.
async function browserChecks() {
  if (process.env.GAME || process.env.NO_BROWSER) { console.log('skip the browser checks (GAME or NO_BROWSER set)'); return; }
  const chrome = chromium();
  if (!chrome) { console.log('skip the browser checks: Playwright is not installed (npm i -g playwright && npx playwright install chromium)'); return; }
  let browser;
  try { browser = await chrome.launch(); } catch (e) { console.log('skip the browser checks: Chromium would not start (' + e.message.split('\n')[0] + ')'); return; }
  const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.json':'application/json', '.webmanifest':'application/manifest+json' };
  const server = http.createServer((req, res) => {
    const file = path.resolve(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type':TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const measure = () => {
    const $ = id => document.getElementById(id), s = $('s-help'), pic = $('h-pic'), R = el => el.getBoundingClientRect();
    const parts = [...pic.querySelectorAll('.ctl-ring, .ctl-b, .ctl-p, .ctl-j')].filter(e => R(e).width > 0).map(e => { const r = R(e); return { n:e.innerText.replace(/\s+/g, ' ').trim() || e.className, l:r.left, t:r.top, r:r.right, b:r.bottom, round:/ctl-ring|ctl-b/.test(e.className) }; });
    const hit = (a, b) => {
      if (!(a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5)) return false;
      if (a.round && b.round) { const ra = (a.r - a.l)/2, rb = (b.r - b.l)/2; return Math.hypot((a.l + a.r)/2 - (b.l + b.r)/2, (a.t + a.b)/2 - (b.t + b.b)/2) < ra + rb - 0.5; }
      const c = a.round ? a : b.round ? b : null; if (!c) return true;
      const o = c === a ? b : a, rc = (c.r - c.l)/2, cx = (c.l + c.r)/2, cy = (c.t + c.b)/2;
      return Math.hypot(cx - Math.max(o.l, Math.min(cx, o.r)), cy - Math.max(o.t, Math.min(cy, o.b))) < rc - 0.5;   // a round button against a box: the box's nearest point inside the circle
    };
    const over = []; for (let i = 0; i < parts.length; i++) for (let k = i + 1; k < parts.length; k++) if (hit(parts[i], parts[k])) over.push(parts[i].n + ' x ' + parts[k].n);
    const P = R(pic), out = parts.filter(q => q.l < P.left + 1 || q.r > P.right - 1 || q.t < P.top + 1 || q.b > P.bottom - 1).map(q => q.n);
    const small = [...s.querySelectorAll('.ctl-j, .ctl-j small, .ctl-b, .ctl-k, .lbl, .scoring span')].filter(e => R(e).width > 0 && parseFloat(getComputedStyle(e).fontSize) < 12).map(e => e.textContent.trim());
    const back = R($('h-back')), wrap = R(s.querySelector('.wrap')), keys = $('h-keys'), rows = [...s.querySelectorAll('.ctl-krow')].map(r => Math.round(R(r).height));
    const stick = [...pic.querySelectorAll('.ctl-js.x .ctl-j')].map(e => e.innerText.replace(/\s+/g, ' ').trim()).join(', ');
    return { scroll:s.scrollHeight - s.clientHeight, wide:document.documentElement.scrollWidth - innerWidth, over, out, small, back:[Math.round(back.width), Math.round(back.height), Math.round(wrap.width)], pic:[Math.round(P.width), Math.round(P.height)], rows:keys && R(keys).height > 0 ? rows : [], backIn:back.bottom <= innerHeight + 0.5, stick };
  };
  try {
    for (const [w, h, insets] of [[844, 390, null], [667, 375, null], [844, 390, { top:0, left:47, bottom:21, right:47 }], [640, 360, null], [740, 360, null], [812, 375, { top:0, left:44, bottom:21, right:44 }], [926, 428, { top:0, left:47, bottom:21, right:47 }], [568, 320, null]]) for (const desk of [false, true]) {
      const ctx = await browser.newContext({ viewport:{ width:w, height:h }, deviceScaleFactor:2, hasTouch:!desk, isMobile:!desk });
      const page = await ctx.newPage(), errors = [];
      page.on('pageerror', e => errors.push(String(e.message || e)));
      if (insets) { const cdp = await ctx.newCDPSession(page); try { await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets }); } catch (e) { console.log('skip the insets: ' + e.message.split('\n')[0]); await ctx.close(); continue; } }
      await page.goto(base + 'index.html'); await page.waitForFunction(() => window.__tryline && window.__tryline.debug, null, { timeout:10000 });
      await page.evaluate(d => { document.body.classList.toggle('desk', d); document.getElementById('b-help').click(); }, desk);
      await page.waitForTimeout(120);
      const m = await page.evaluate(measure), kind = `${w}x${h}${insets ? ' insets' : ''} ${desk ? 'desk' : 'touch'}`;
      if (w === 568) ok(!m.over.length && !m.out.length && m.wide <= 0, `${kind}: a scroll is allowed here (${m.scroll}px), but nothing sits over anything, all in the frame, no sideways scroll (${[...m.over, ...m.out].join('; ') || 'clear'})`);
      else {
        ok(m.scroll <= 0 && m.wide <= 0 && m.backIn, `${kind}: one screen, no scroll (${m.scroll}px over), Back to Menu on it`);
        ok(!m.over.length && !m.out.length, `${kind}: nothing in the picture sits over anything, and all of it in the frame (${[...m.over, ...m.out].join('; ') || 'clear'}; the picture ${m.pic.join('x')})`);
        ok(m.back[0] === m.back[2] && m.back[1] >= 48, `${kind}: Back to Menu is the screen's full width and 48px tall (${m.back.join('/')})`);
        ok(desk ? m.rows.length === 2 && m.rows.every(r => r <= 30) : !m.rows.length, `${kind}: ${desk ? 'the two rows, each on one line' : 'no keys or pad rows on a phone'} (${m.rows.join(', ') || 'none'})`);
      }
      ok(!m.small.length, `${kind}: nothing under 12px (${m.small.join(', ') || 'none'})`);
      const said = desk ? 'Run, Tap Across Side Step, Tap Back Dummy' : 'Drag Run, Flick Across Side Step, Pull Back Dummy';
      ok(m.stick === said, `${kind}: the stick reads ${said} (${m.stick})`);
      if (w === 844 && !insets) {   // the keyboard's Tab and a controller reach Back to Menu, and it goes home; the hint switches render with no Replay Tutorial
        await page.keyboard.press('Tab');
        const tab = await page.evaluate(() => document.activeElement && document.activeElement.id);
        await page.keyboard.press('Enter');
        const home = await page.evaluate(() => !document.getElementById('s-home').hidden && document.getElementById('s-help').hidden);
        ok(tab === 'h-back' && home, `${kind}: Tab lands on Back to Menu (${tab}) and Enter goes home`);
        const pad = await page.evaluate(() => { const T = window.__tryline, D = T.debug; document.getElementById('b-help').click(); T.navMove(0, 0, 1); const f = D.focus(); const id = f && f.id; T.navPress(0); D.renderHintSwitches(); return { id, home:!document.getElementById('s-home').hidden, replay:!!document.getElementById('h-replay') }; });
        ok(pad.id === 'h-back' && pad.home && !pad.replay, `${kind}: a controller's first press rings Back to Menu (${pad.id}) and the button goes home; renderHintSwitches with no #h-replay`);
        if (desk) {   // the stick's words follow the device that acted last, while the screen is up
          const as = async d => { await page.evaluate(d => { window.__tryline.debug.setDev(d); if (document.getElementById('s-help').hidden) document.getElementById('b-help').click(); }, d); return (await page.evaluate(measure)).stick; };
          const dev = { pad:await as('pad'), kb:await as('kb') };
          ok(dev.pad === 'Run, Flick Across Side Step, Pull Back Dummy' && dev.kb === 'Run, Tap Across Side Step, Tap Back Dummy', `${kind}: a controller's last press turns the stick's words to Flick Across and Pull Back, a key back to Tap Across and Tap Back (${dev.pad}; ${dev.kb})`);
        }
      }
      ok(!errors.length, `${kind}: no page errors (${errors.join('; ')})`);
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
}
