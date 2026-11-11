// In a real browser: the home does not scroll at the phone sizes with every note showing, Tab follows the screen, and Tick and Trip, cues in play, are not lost under everything else.
// Needs Chrome, and says so and passes where there is none (a layout can't be measured in Node). Sizes are emulated; this is not a phone.
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const chrome = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => p && fs.existsSync(p));
if (!chrome || typeof WebSocket === 'undefined') { console.log('Home fit: skipped, no Chrome here. 0 checks passed'); process.exit(0); }
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.webp':'image/webp', '.png':'image/png', '.webmanifest':'application/json' };
const server = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html')); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type':TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control':'no-store' }); r.end(fs.readFileSync(f)); });
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const site = 'http://127.0.0.1:' + server.address().port, dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tryline-fit-')), port = 9500 + Math.floor(Math.random()*400);
const browser = spawn(chrome, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + dir, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio:'ignore' });
const wait = ms => new Promise(ok => setTimeout(ok, ms));
for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break; } catch {} await wait(200); }
let passed = 0, failed = 0;
const PENDING = [];   // what waits for the builders since the PR #14 merge, named on the last line
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL ' + msg); } };
async function open(w, h, touch) {
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method:'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id:i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.setCacheDisabled', { cacheDisabled:true });
  await send('Emulation.setDeviceMetricsOverride', { width:w, height:h, deviceScaleFactor:2, mobile:touch });
  if (touch) await send('Emulation.setTouchEmulationEnabled', { enabled:true });
  await send('Page.navigate', { url:site + '/index.html' }); await wait(1500);
  // a fixture or a measure that throws fails the run here: a check after it would otherwise measure a page it never set up
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression:expr, returnByValue:true }); const x = r.result && r.result.exceptionDetails;
    if (r.error || x) throw Error('in the page: ' + (r.error ? r.error.message : (x.exception && x.exception.description) || x.text) + '\n  evaluating: ' + expr.slice(0, 160)); return r.result.result.value; };
  return { send, ev, close:async () => { ws.close(); await fetch(`http://127.0.0.1:${port}/json/close/${t.id}`).catch(() => {}); } };
}
// a season under way on each headline that carries one, its note in the game's own mid-season format (Championship: Continue
// Championship and the Trophy Cabinet), with the whole tools row: Offline Ready, Install Game and Updating. Shown, not saved, so the
// next page opens on the save as it was. It returns what shows, so a fixture that stops matching the page fails rather than measures the plain home
const SEASON = hl => `(() => { const $ = i => document.getElementById(i), on = e => !e.hidden && !e.closest('[hidden]') && e.getBoundingClientRect().height > 0;
  for (const p of document.querySelectorAll('#hl-panels > .hl-panel')) p.hidden = p.id !== 'hp-${hl}';
  const n1 = $('champ-note'), n2 = $('career-note'); n1.textContent = 'Guildfordians · 2nd · Round 3 of 5'; n1.hidden = false; n2.textContent = 'Minis · Guildfordians · Round 3 of 5'; n2.hidden = false;
  $('hc-go').hidden = false; $('hc-new').hidden = true; $('b-champ').textContent = 'Continue Championship'; $('b-cabinet').hidden = false; $('b-career').textContent = 'Continue Career';
  for (const id of ['app-tools', 'offline-update', 'offline-status', 'b-install']) $(id).hidden = false;
  return ['offline-status', 'b-install', 'offline-update', ...('${hl}' === 'champ' ? ['b-champ', 'champ-note', 'b-cabinet'] : ['b-career', 'career-note'])].filter(id => !on($(id))).join(); })()`;
const FIT = `(() => { const s = document.getElementById('s-home'); return JSON.stringify([s.scrollHeight, s.clientHeight]); })()`;
try {
  for (const [w, h, touch] of [[844, 390, false], [844, 390, true], [667, 375, false], [667, 375, true]]) {
    const pg = await open(w, h, touch), name = `${w}x${h} ${touch ? 'touch' : 'desk'}`;
    const [a0, a1] = JSON.parse(await pg.ev(FIT));
    ok(a0 <= a1, `${name}: a fresh home does not scroll (${a0} of ${a1})`);
    const mid = [];
    for (const hl of ['champ', 'career']) {
      const missing = await pg.ev(SEASON(hl));
      ok(missing === '', `${name}: ${hl}: the fixture shows its note${hl === 'champ' ? ', the Trophy Cabinet' : ''}, Offline Ready, Install Game and Updating (missing: ${missing || 'none'})`);
      const [b0, b1] = JSON.parse(await pg.ev(FIT));
      ok(b0 <= b1, `${name}: a ${hl === 'champ' ? 'championship' : 'career'} under way, its note${hl === 'champ' ? ', the Trophy Cabinet' : ''}, Offline Ready, Install Game and Updating: the home does not scroll (${b0} of ${b1})`);
      mid.push(`${hl} ${b0} of ${b1}`);
    }
    console.log(`${name}: ${a0} of ${a1}, mid-season ${mid.join(', ')}`);
    await pg.close();
  }
  // the sign under the clock and the career caption, in a real layout, with and without an iPhone's notch and home bar
  for (const [w, h] of [[844, 390], [667, 375]]) for (const insets of [{ top:0, left:0, bottom:0, right:0 }, { top:0, left:47, bottom:21, right:47 }, { top:0, left:59, bottom:21, right:59 }]) {
    const pg = await open(w, h, true), name = `${w}x${h} inset ${insets.left}`;
    await pg.send('Emulation.setSafeAreaInsetsOverride', { insets });
    const box = JSON.parse(await pg.ev(`(() => { const T = window.__tryline, D = T.debug, S = D.settings(), N = T.teams.NATIONS; S.tut = D.TUT_IDS.slice(); S.tips = D.COACH_IDS.slice(); S.cam = 2; D.startMatch(N[0], N[1], false);
      const M = T.M, b = M.ball; M.phase = 'play'; M.set = null; b.state = 'loose'; b.carrier = null; b.f = null; M.career = true; M.capUntil = M.rt + 99; D.updateHud();
      const R = e => { const r = e.getBoundingClientRect(); return { l:r.left, t:r.top, r:r.right, b:r.bottom, on:!e.hidden && r.width > 0 }; }, $ = i => document.getElementById(i);
      const on = { word:$('h-stat-w').textContent, stat:R($('h-stat')), cap:R($('h-cap')), bug:R(document.querySelector('.bug')), sub:R($('h-sub')), pause:R($('b-pause')), stick:R($('stick')), A:R($('btnA')), B:R($('btnB')), C:R($('btnC')), W:innerWidth, H:innerHeight };
      M.phase = 'set'; M.set = { kind:'kickoff', team:0, x:60, y:35, t:1 }; D.updateHud(); on.noSign = !$('h-stat').hidden; on.capAlone = R($('h-cap'));
      return JSON.stringify(on); })()`));
    const hit = (a, c) => a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b, inside = a => a.l >= insets.left && a.r <= box.W - insets.right && a.t >= 0;
    ok(box.word === 'Get the Ball' && box.stat.on && box.cap.on, `${name}: the sign and the caption show (${box.word})`);
    for (const k of ['stat', 'cap']) {
      ok(!hit(box[k], box.bug) && !hit(box[k], box.sub) && !hit(box[k], box.pause), `${name}: ${k} is clear of the score, the clock and pause`);
      ok(inside(box[k]), `${name}: ${k} is on the screen, out of the notch`);
    }
    ok(!hit(box.stat, box.cap), `${name}: the sign and the caption don't touch`);
    ok(!box.noSign && box.capAlone.on && box.capAlone.t === box.cap.t && box.capAlone.l === box.cap.l, `${name}: the caption does not move when the sign comes and goes (${box.capAlone.t}, ${box.cap.t})`);
    for (const k of ['stick', 'A', 'B', 'C']) ok(box[k].on && !hit(box.cap, box[k]), `${name}: the caption is clear of ${k} at rest`);
    ok(box.cap.b <= box.H - insets.bottom, `${name}: and of the home bar`);
    if (!insets.left) console.log(`${name}: sign ${Math.round(box.stat.l)}-${Math.round(box.stat.r)} x ${Math.round(box.stat.t)}-${Math.round(box.stat.b)}, caption ${Math.round(box.cap.l)}-${Math.round(box.cap.r)} x ${Math.round(box.cap.t)}-${Math.round(box.cap.b)}`);
    await pg.close();
  }
  // the stars, in a real layout (the teams builder: PR #14's star display beside main's overall badge): every screen where a side is picked
  // or listed, at both phone sizes. Never under 12px a star, nothing outside its card or sideways off the screen, and the overall's badge
  // clear of the stars and the name.
  for (const [w, h] of [[844, 390], [667, 375]]) {
    const pg = await open(w, h, true), name = `${w}x${h}`;
    const PRE = `const T = window.__tryline, D = T.debug, X = T.teams, C = T.career, H = T.home, S = D.settings(), $ = i => document.getElementById(i), by = id => X.ALL_TEAMS.find(t => t.id === id);`;
    const MEASURE = `(() => { const s = [...document.querySelectorAll('.screen')].find(e => !e.hidden), hit = (a, b) => a.left < b.right - .5 && b.left < a.right - .5 && a.top < b.bottom - .5 && b.top < a.bottom - .5;
      const stars = [...s.querySelectorAll('.rstars')].filter(e => e.getBoundingClientRect().width > 0), o = { n:stars.length, min:99, out:[], hit:[], side:Math.max(s.scrollWidth - s.clientWidth, document.documentElement.scrollWidth - innerWidth) };
      for (const e of stars) { const r = e.getBoundingClientRect(), box = (e.closest('.team,.yours,.my-rec,.lk-leg') || s).getBoundingClientRect(), card = e.closest('.team,.lk-leg'), tile = card && card.classList.contains('lk-leg'); o.min = Math.min(o.min, r.height, r.width/5);
        if (r.left < box.left - .5 || r.right > box.right + .5 || r.right > innerWidth || (tile && (r.top < box.top - .5 || r.bottom > box.bottom + .5))) o.out.push(e.getAttribute('aria-label'));
        if (card) { const v = card.querySelector('.ovr,.cr-rate'), t = card.querySelector('.tname,.lk-nat'), y = card.querySelector('.lk-yr'); if (v && hit(v.getBoundingClientRect(), r)) o.hit.push('overall on stars: ' + t.textContent); if (hit(t.getBoundingClientRect(), r)) o.hit.push('name on stars: ' + t.textContent); if (y && hit(y.getBoundingClientRect(), r)) o.hit.push('year on stars: ' + t.textContent); } }
      return JSON.stringify(o); })()`;
    const SCREENS = [
      ['the home (My Team\'s club under Play)', `S.myClub = 'NTH'; S.hl = 'game'; D.goHome();`, 1],
      // re-pinned for the side-by-side team screen (2026-11-11): one team a side, so a state draws two sets of stars (one in the one-side modes)
      ['Quick Match, both sides', `S.myClub = null; S.pick = [null, null]; D.openTeams('quick');`, 2],
      ['a nation on each side', `const P = T.picker, at = (n, k) => P.group(n, P.view(n).ladder.findIndex(g => g.key === k) - P.view(n).gi); at(0, 'nat.rsa'); at(1, 'nat.nzl');`, 2],
      ['Surrey on both sides', `const P = T.picker, at = (n, k) => P.group(n, P.view(n).ladder.findIndex(g => g.key === k) - P.view(n).gi); at(0, 'sur'); at(1, 'sur'); P.step(1, 3);`, 2],
      ['Counties on both sides', `const P = T.picker, at = (n, k) => P.group(n, P.view(n).ladder.findIndex(g => g.key === k) - P.view(n).gi); at(0, 'cty'); at(1, 'cty'); P.step(1, 2);`, 2],
      ['England 2 on both sides', `const P = T.picker, at = (n, k) => P.group(n, P.view(n).ladder.findIndex(g => g.key === k) - P.view(n).gi); at(0, 'en2'); at(1, 'en2'); P.step(1, 5);`, 2],
      ['a side picked, the Opponent on England', `const P = T.picker; S.pick = [null, null]; D.openTeams('quick'); D.pickTeam(X.CLUBS[7]); P.group(1, P.view(1).ladder.findIndex(g => g.key === 'eng') - P.view(1).gi);`, 2],
      ['My Team\'s screen', `D.openTeams('my');`, 1],
      ['the career club list', `C.set(null); C.newOpen(); C.clubOpen();`, 1],
      ['the career club list, England 2', `const P = T.picker; P.group(0, P.view(0).ladder.findIndex(g => g.key === 'en2') - P.view(0).gi);`, 1],
      ['the transfer window', `const cr = C.create({ name:'Sam', pos:'B', num:7, club:X.CLUBS[0], cat:'women' }); C.set(cr); cr.phase = 'transfer'; cr.offers = ['GAL', 'BLM', 'JHB']; C.open();`, 4],
      ['the Locker\'s Legends', `C.set(null); const L = T.locker; window.__lkWas = L.state(); L.set(L.clean({ n:{ hat:10, sharp:10, hit:10, clean:10, golden:10, comeback:10, drop:10, fire:10, champ:10, star:10 } })); L.open(3);`, w > 731 ? 14 : 0],   // every Legend won: its stars beside its year, inside its tile; none on a 667 phone, where a tile is too narrow for them (styles.css). Nine Golds (star:10 is no Gold): nine men's and the five women's, 14 (18 with ten women's, before 2026-11-09)
    ];
    const line = [];
    for (const [where, js, want] of SCREENS) {
      await pg.ev(`(() => { ${PRE} ${js} })()`); await wait(120);
      const m = JSON.parse(await pg.ev(MEASURE));
      ok(m.n === want, `${name}: ${where} draws ${want} sets of stars (${m.n})`);
      ok(m.min >= 12 - 0.005, `${name}: ${where}: no star under 12px (${m.min})`);   // 0.005px allows the layout's float noise only: a run on 2026-11-10 measured 11.99997 for a 12px star, then 12 on two reruns
      ok(!m.out.length, `${name}: ${where}: every star stays in its card (${m.out})`);
      ok(!m.hit.length, `${name}: ${where}: stars clear of the overall and the name (${m.hit})`);
      ok(m.side <= 0, `${name}: ${where}: nothing goes sideways (${m.side})`);
      line.push(where + ' ' + m.min);
    }
    console.log(`${name} stars, smallest px: ${line.join(', ')}`);
    await pg.ev(`(() => { const T = window.__tryline; if (window.__lkWas) { T.locker.set(window.__lkWas); T.teams.save(); } })()`);   // the Legends won for the Locker's screen stay on this page: the save the next size opens on has none
    await pg.close();
  }
  // the level list and Import's preview fit a phone sideways with their buttons in the first view, and the overall's badge is clear of Stronger Side
  for (const [w, h] of [[844, 390], [667, 375]]) {
    const pg = await open(w, h, true), name = `${w}x${h}`;
    const PRE = `const T = window.__tryline, D = T.debug, X = T.teams, Y = T.yourTeam, I = T.importer, S = D.settings(), $ = i => document.getElementById(i);`;
    const SEE = `(() => { const m = document.getElementById('m-import'), s = m && !m.hidden ? m : [...document.querySelectorAll('.screen')].find(e => !e.hidden), last = Math.max(...[...s.querySelectorAll('.btn')].map(b => b.getBoundingClientRect()).filter(r => r.height).map(r => r.bottom)); return JSON.stringify({ over:s.scrollHeight - s.clientHeight, last, H:innerHeight }); })()`;
    const PAGE = `{ source:'pitchero', club:{ name:'Testers RFC' }, league:[{ name:'Testers RFC', own:true }, { name:'Ash Vale' }, { name:'Bourne' }, { name:'Chobham' }], teams:[] }`;
    for (const [where, js] of [
      ['the first level list', `S.myTeam = 'FAR'; D.openTeams('quick'); Y.openBuilder(null);`],
      ['Change Level', `$('bd-level-grid').querySelector('[data-level=top]').click(); $('bd-level-change').click();`],
      ['the Import preview with its colours', `$('bd-back').click(); I.open(); Object.assign(I.state(), { step:'preview', data:${PAGE}, pick:true, level:'r1', draft:{ kit:'#2050b0', trim:'#f2efe6', hoops:false } }); I.render();`],
    ]) {
      await pg.ev(`(() => { ${PRE} ${js} })()`); await wait(120);
      const m = JSON.parse(await pg.ev(SEE));
      ok(m.over <= 0 && m.last <= m.H, `${name}: ${where} is all in the first view (${m.over} over, last button ends ${Math.round(m.last)} of ${m.H})`);
    }
    await pg.ev(`(() => { ${PRE} $('im-back').click(); S.myTeam = 'FAR'; D.openTeams('quick'); })()`);
    for (const [g, pool] of [['men', 'int'], ['women', 'int'], ['minis', 'int']]) {   // main's Men | Women | Minis, against Farnham (main's 75: only nations are Stronger Sides): PR #14 had Men's | Women's and its tab numbers here
      const bad = await pg.ev(`(() => { ${PRE} const P = T.picker; S.cat = '${g}'; S.pick = [null, null]; D.openTeams('quick'); D.pickTeam(X.CLUBS[0]); let n = 0, all = 0;   // Farnham set, the Opponent on each nation in turn (the side-by-side screen, 2026-11-11)
        for (const gr of P.view(1).ladder.filter(x => x.key.startsWith('nat.'))) { P.group(1, P.view(1).ladder.indexOf(gr) - P.view(1).gi); const c = document.querySelector('#t-side1 .pk-pick'), a = c && c.querySelector('.gap'), v = c && c.querySelector('.ovr'); if (!a || !v) continue; all++; const r = a.getBoundingClientRect(), o = v.getBoundingClientRect(); if (r.top < o.bottom - .01 && r.left < o.right && o.left < r.right) n++; } return JSON.stringify([n, all]); })()`);
      const [n, all] = JSON.parse(bad);
      ok(!n && all > 0, `${name}: side ${g} tab ${pool}: the overall's badge is clear of Stronger Side (${n} of ${all})`);
    }
    await pg.close();
  }
  const pg = await open(844, 390, false);
  const order = [await pg.ev(`document.activeElement.id`)];
  for (let i = 0; i < 2; i++) { await pg.send('Input.dispatchKeyEvent', { type:'keyDown', key:'Tab', code:'Tab', windowsVirtualKeyCode:9, modifiers:8 }); await pg.send('Input.dispatchKeyEvent', { type:'keyUp', key:'Tab', code:'Tab', windowsVirtualKeyCode:9, modifiers:8 }); order.push(await pg.ev(`document.activeElement.id`)); }
  console.log('Shift+Tab from the start: ' + order.join(', '));
  ok(order.join() === 'b-quick,b-import,b-locker', 'Tab order follows the screen: back from Play goes along the top row, Add Your Team then Locker (main\'s home; PR #14 had Camera and Half Length there) (' + order.join(', ') + ')');
  await pg.close();
  // the two cues, rendered through the real bus: the loudest 50 ms, whole and above 300 Hz (roughly what a phone speaker plays). The numbers, not the ear
  const snd = await open(844, 390, false); await snd.send('Page.navigate', { url:site + '/sounds.html' }); await wait(1200);
  await snd.send('Runtime.evaluate', { expression:`window.__lv = (async () => { const rate = 48000;
    const hp = (d, fc) => { const w = 2*Math.PI*fc/rate, c = Math.cos(w), s = Math.sin(w), a = s/(2*0.7071), b0 = (1 + c)/2, b1 = -(1 + c), b2 = (1 + c)/2, a0 = 1 + a, a1 = -2*c, a2 = 1 - a; let x1 = 0, x2 = 0, y1 = 0, y2 = 0; const o = new Float32Array(d.length); for (let i = 0; i < d.length; i++) { const x = d[i], y = (b0*x + b1*x1 + b2*x2 - a1*y1 - a2*y2)/a0; x2 = x1; x1 = x; y2 = y1; y1 = y; o[i] = y; } return o; };
    const win = d => { const n = Math.floor(rate*0.05); let sum = 0, b = 0; for (let i = 0; i < d.length; i++) { sum += d[i]*d[i]; if (i >= n) sum -= d[i - n]*d[i - n]; if (sum > b) b = sum; } return 10*Math.log10(Math.max(1e-12, b/n)); };
    const out = {}; for (const k of ['tick', 'trip', 'whistle']) { let w = 0, h = 0; for (let i = 0; i < 6; i++) { const m = await soundRender(k, { secs:2, samples:true, rate }); w += win(m.samples)/6; h += win(hp(m.samples, 300))/6; } out[k] = [w, h]; } return JSON.stringify(out); })();0` });
  const lv = JSON.parse((await snd.send('Runtime.evaluate', { expression:'window.__lv', awaitPromise:true, returnByValue:true })).result.result.value);
  console.log('Loudest 50 ms, dB (whole, above 300 Hz): ' + Object.entries(lv).map(([k, v]) => k + ' ' + v.map(x => x.toFixed(1)).join(', ')).join('; '));
  ok(lv.tick[1] >= -33, 'Tick can be heard on a small speaker (' + lv.tick[1].toFixed(1) + ' dB above 300 Hz)');
  ok(lv.trip[1] >= -33, 'Trip can be heard on a small speaker (' + lv.trip[1].toFixed(1) + ' dB above 300 Hz)');
  ok(lv.tick[1] < lv.whistle[1] && lv.trip[1] < lv.whistle[1], 'and neither is louder than the whistle');
  // the recordings: each decoded by the browser itself, and each played through the real bus as loud as the recipe it replaces (so SOUND.level
  // still means what it did): the loudest 50 ms, the crowd's swells by their loudest 400 ms, the bed by its RMS. Eight renders of each, and none clips
  await snd.send('Runtime.evaluate', { expression:`window.__rec = (async () => { const rate = 48000;
    ac(); sndLoad(); for (let i = 0; i < 300 && SAMPLE.state !== 'done'; i++) await new Promise(r => setTimeout(r, 100));
    const win = (d, s) => { const n = Math.floor(rate*s); let sum = 0, b = 0; for (let i = 0; i < d.length; i++) { sum += d[i]*d[i]; if (i >= n) sum -= d[i - n]*d[i - n]; if (sum > b) b = sum; } return 10*Math.log10(Math.max(1e-12, b/n)); };
    const how = k => k === 'bed' ? (m => m.rmsDb) : (m => win(m.samples, ['roar', 'cheer', 'groan'].includes(k) ? 0.4 : 0.05));
    const out = { state:SAMPLE.state, files:Object.values(SOUND_FILES).flat().map(([f, d, m]) => { const b = SAMPLE.bufs[f]; return b ? [f, b.lead, b.buf.duration - d - 2*(m || 0)] : [f]; }), keys:{} };
    for (const k of Object.keys(SOUND_FILES)) { const r = [0, 0], clip = [0, 0]; for (const [j, synth] of [[0, false], [1, true]]) for (let i = 0; i < 8; i++) { const m = await soundRender(k, { secs:k === 'bed' ? 8 : 4, samples:true, rate, synth }); r[j] += how(k)(m)/8; clip[j] += m.clipped; } out.keys[k] = [r[0], r[1], clip[0] + clip[1]]; }
    const all = await soundRender(Object.keys(SOUND_NAMES), { secs:4, rate }); out.all = [all.peakDb, all.clipped];
    return JSON.stringify(out); })();0` });
  const rec = JSON.parse((await snd.send('Runtime.evaluate', { expression:'window.__rec', awaitPromise:true, returnByValue:true })).result.result.value);
  ok(rec.state === 'done' && rec.files.every(f => f.length === 3), `every recording fetched and decoded by the browser (${rec.files.filter(f => f.length === 3).length} of ${rec.files.length})`);
  ok(rec.files.every(f => f[1] < 0.002 && Math.abs(f[2]) < 0.002), 'each starting at once and as long as the table says: the encoder\'s priming is not heard');
  console.log('Recording v recipe through the bus, dB: ' + Object.entries(rec.keys).map(([k, v]) => k + ' ' + v[0].toFixed(1) + ' v ' + v[1].toFixed(1)).join('; '));
  for (const [k, [r, s]] of Object.entries(rec.keys)) ok(Math.abs(r - s) <= 2, `${k}: the recording as loud as its recipe, within 2 dB (${(r - s).toFixed(1)})`);
  ok(Object.values(rec.keys).every(v => v[2] === 0) && rec.all[1] === 0, `nothing clips, recordings or recipes, one at a time or all at once (all at once: ${rec.all[0].toFixed(1)} dB peak)`);
  await snd.close();
} finally { browser.kill('SIGKILL'); server.close(); }
console.log((failed ? `Home fit: ${passed} passed, ${failed} failed` : `Home fit: ${passed} checks passed`) + (PENDING.length ? ` · ${PENDING.length} pending for the builders: ${PENDING.join('; ')}` : ''));
process.exit(failed ? 1 : 0);
