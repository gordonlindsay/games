// Store screenshots: the current build at the App Store and Google Play sizes, in headless Chromium through Playwright.
// node tools/listing-shots.mjs                      every moment at every size, into store-listing/screenshots/
// node tools/listing-shots.mjs --only ios-6.9       one or more sizes (comma separated); --moments match,fire for some moments
// Not part of tools/check.mjs: it needs Playwright and a Chromium (npm i -g playwright && npx playwright install chromium).
// tools/listing.mjs checks the files it writes: every size and moment present, exact pixel sizes, no alpha channel.
// Re-run it whenever the game's look changes (the 2.5D camera and the new player art will need a re-shoot).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const GAME_DIR = fileURLToPath(new URL('../', import.meta.url));
export const SHOTS_DIR = path.join(GAME_DIR, 'store-listing', 'screenshots');

// Each size is a CSS viewport and a device pixel ratio whose product is the store's exact pixel size. The iPhone and phone
// viewports are a landscape phone's, so the game lays out as it does on one (its phone rules start below 560px tall).
export const LISTING_SIZES = [
  { id:'ios-6.9', store:'App Store', label:'iPhone 6.9-inch display', w:956, h:440, dpr:3, px:[2868, 1320] },
  { id:'ipad-13', store:'App Store', label:'iPad 13-inch display', w:1376, h:1032, dpr:2, px:[2752, 2064] },
  { id:'play-phone', store:'Google Play', label:'Phone', w:960, h:540, dpr:2, px:[1920, 1080] },
  { id:'play-tablet', store:'Google Play', label:'7-inch and 10-inch tablet', w:1280, h:720, dpr:2, px:[2560, 1440] },
];
export const LISTING_FEATURE = { id:'play-feature', file:'play-feature-graphic.png', w:1024, h:500, dpr:1, px:[1024, 500] };

// The moments, in the order suggested for the store (the first two or three are what most people see).
// Each stage() runs in the page, against window.__tryline, and leaves the game still (M.paused) for the shot.
export const LISTING_MOMENTS = [
  { id:'match', name:'Live Match', stage:() => {
    const T = window.__tryline, X = T.teams;
    T.debug.startMatch(X.CLUBS[0], X.CLUBS[1], false);
    const M = T.M;
    M.side[0].human = false;                                  // the computer plays your side to set the scene; yours again for the shot
    const n = window.__listingPlay(T, M, 8, b => b.x > 40 && b.x < 96 && b.y > 16 && b.y < 54);
    M.side[0].human = true; if (M.ball.carrier) T.sides.setCtrl(0, M.ball.carrier); M.paused = true;   // the ring on your carrier
    return { n, carrier:M.ball.carrier ? M.ball.carrier.team : null };
  }, wait:1200 },
  { id:'fire', name:'On Fire', stage:() => {
    const T = window.__tryline, X = T.teams;
    T.debug.startMatch(X.CLUBS[0], X.CLUBS[1], false);
    const M = T.M;
    M.side[0].human = false;
    const n = window.__listingPlay(T, M, 8, b => b.x > 46 && b.x < 96 && b.y > 18 && b.y < 52);
    T.arcade.heat(0, 'try'); T.arcade.heat(0, 'hit');         // three points unanswered: the side catches fire, as a try and a Big Hit would light it
    for (let i = 0; i < 24; i++) T.update(T.STEP);            // a few strides, for the glow's trail
    M.side[0].human = true; if (M.ball.carrier && M.ball.carrier.team === 0) T.sides.setCtrl(0, M.ball.carrier); M.paused = true;
    return { n, carrier:M.ball.carrier ? M.ball.carrier.team : null, fire:M.fire[0].t > 0 };
  }, wait:450 },
  { id:'lineout', name:'Set Piece', stage:() => {
    const T = window.__tryline, X = T.teams;
    T.debug.startMatch(X.CLUBS[0], X.CLUBS[1], false);
    const M = T.M;
    for (let i = 0; i < 60*2; i++) T.update(T.STEP);
    T.lineout(1, 62, 0, 'Into Touch');
    for (let n = 0; n < 60*8; n++) { T.update(T.STEP); if (M.cut && M.cut.kind === 'lineout' && M.cut.t > 1.45) break; }
    M.paused = true;
  }, wait:700 },
  { id:'goal', name:'Goal Kick', stage:() => {
    const T = window.__tryline, X = T.teams;
    T.debug.startMatch(X.CLUBS[0], X.CLUBS[1], false);
    const M = T.M;
    for (let i = 0; i < 60*2; i++) T.update(T.STEP);
    T.debug.goalKick(0, 98, 24, 'conversion');
    const inp = T.input;
    for (let n = 0; n < 60*4; n++) { T.update(T.STEP); if (M.cut && M.cut.kind === 'goal' && M.cut.t > 0.9) break; }
    inp.bDown = true;                                         // Kick held: the meter filling
    for (let i = 0; i < 26; i++) T.update(T.STEP);
    M.paused = true;
  }, wait:700 },
  { id:'drill', name:'Training Ground: Tackling', stage:() => {
    const T = window.__tryline;
    T.practice.start('tackle'); document.getElementById('pr-retry').click();
    const P = T.practice.state(), M = T.M, inp = T.input;
    for (let n = 0; n < 60*20; n++) {
      const K = P.tackle;
      if (K.stage === 'approach') { K.me.y = K.lane; K.me.vx = K.me.vy = 0; }   // into his path and stand still: Position
      T.update(T.STEP);
      if (K.stage === 'side') break;
    }
    inp.aDown = true;                                         // Tackle held: Power loading
    for (let i = 0; i < 24; i++) T.update(T.STEP);
    M.paused = true;
  }, wait:700 },
  { id:'career', name:'Career', stage:() => {
    const T = window.__tryline, X = T.teams;
    T.career.start({ name:'Sam', pos:'B', num:7, club:X.CLUBS[0] });
    T.career.open();
  }, wait:700 },
  { id:'teams', name:'Team Picker', stage:() => { document.getElementById('b-champ').click(); }, wait:700 },
  { id:'home', name:'Home', stage:() => {}, wait:900 },
];

// A returning player's save: tutorials seen, coach tips off, past the gentler first matches. Nothing else.
const SAVE = { settings:{ tut:['past', 'pass', 'tackle', 'block', 'scrum', 'lineout', 'goal', 'drop'], coach:false, played:5 } };
const SEED = 20261108;

const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.webmanifest':'application/manifest+json',
  '.png':'image/png', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf', '.otf':'font/otf', '.jpg':'image/jpeg' };
// The two typefaces where the game has no copies of its own yet (fonts/fonts.css comes with the native work): from Google Fonts.
const FONTS_FALLBACK = "@import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Big+Shoulders+Display:wght@700;800;900&display=swap');";
export function serve() {
  // the game's folder, served at /trylinerugby/ as GitHub Pages does, on a free local port
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let rel = decodeURIComponent(url.pathname).replace(/^\/trylinerugby\/?/, '');
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    const file = path.resolve(GAME_DIR, rel);
    if (/(?:^|\/)fonts\/fonts\.css$/.test(rel) && !fs.existsSync(file)) { res.writeHead(200, { 'content-type':'text/css' }); res.end(FONTS_FALLBACK); return; }
    if (!file.startsWith(GAME_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type':TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

export function playwright() {
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch (e) { /* not installed here: try the global install */ }
  try { return require(path.join(execFileSync('npm', ['root', '-g']).toString().trim(), 'playwright')); } catch (e) { /* none */ }
  console.error('Playwright is not installed. Run: npm i -g playwright && npx playwright install chromium');
  process.exit(2);
}

// Behind an HTTPS proxy (a cloud sandbox) Chromium cannot verify the proxy's certificate; curl can, so the two web fonts come
// through it. Elsewhere the page loads them itself. Only the fonts: the game makes no other outside request.
export async function routeFonts(page) {
  if (!process.env.HTTPS_PROXY && !process.env.https_proxy) return;
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, async route => {
    const url = route.request().url();
    try {
      const body = execFileSync('curl', ['-sS', '--fail', '--max-time', '30', '-A', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', url]);
      await route.fulfill({ status:200, body, headers:{ 'content-type':url.includes('/css') ? 'text/css' : 'font/woff2', 'access-control-allow-origin':'*' } });
    } catch (e) { await route.abort(); }
  });
}

async function shoot(browser, base, size, moment, out, bare = false) {   // bare: the pitch alone, no scorebug, hints or buttons
  const ctx = await browser.newContext({ viewport:{ width:size.w, height:size.h }, deviceScaleFactor:size.dpr, isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await routeFonts(page);
  await page.addInitScript(([save, seed]) => {
    try { localStorage.setItem('tryline.v1', JSON.stringify(save)); } catch (e) { /* storage blocked */ }
    // play on (the caller has handed your side to the computer) until your side carries the ball in open play where want() says,
    // at least `after` match seconds in; returns the steps played, or -1 when two minutes went by without it
    window.__listingPlay = (T, M, after, want) => {
      for (let n = 0; n < 60*150; n++) {
        T.update(T.STEP);
        const b = M.ball;
        if (n > 60*after && M.phase === 'play' && !M.cut && !M.contact && b.state === 'held' && b.carrier && b.carrier.team === 0 && want(b)) return n;
      }
      return -1;
    };
    let s = seed >>> 0;                                       // a seeded Math.random, so a re-shoot draws the same scenes
    Math.random = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }, [SAVE, SEED]);
  await page.goto(base + 'index.html', { waitUntil:'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  const info = await page.evaluate(`(${moment.stage.toString()})()`);
  if (info && info.n === -1) throw new Error(`${moment.id} at ${size.id}: the scene never came up; try another SEED`);
  if (bare) await page.addStyleTag({ content:'#hud,#controls,#b-pause,.hc,#banner{display:none!important}' });
  await page.waitForTimeout(moment.wait);
  const png = await page.screenshot({ path:out || undefined, type:'png' });
  await ctx.close();
  if (errors.length) throw new Error(`${moment.id} at ${size.id}: ${errors.join('; ')}`);
  return png;
}

// Google Play's feature graphic: the lineout close-up with nothing over it, under store-listing/feature-graphic.html's wordmark.
async function feature(browser, base, out) {
  const f = LISTING_FEATURE, scene = LISTING_MOMENTS.find(m => m.id === 'lineout');
  const bg = await shoot(browser, base, { id:f.id, w:f.w, h:f.h, dpr:2 }, scene, null, true);
  const ctx = await browser.newContext({ viewport:{ width:f.w, height:f.h }, deviceScaleFactor:f.dpr });
  const page = await ctx.newPage();
  await routeFonts(page);
  await page.goto(base + 'store-listing/feature-graphic.html', { waitUntil:'load' });
  await page.evaluate(src => { document.querySelector('.bg').style.backgroundImage = `url(${src})`; }, 'data:image/png;base64,' + bg.toString('base64'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path:out, type:'png' });
  await ctx.close();
}

export const shotFile = (size, moment, i) => path.join(SHOTS_DIR, size.id, `${String(i + 1).padStart(2, '0')}-${moment.id}.png`);

async function main() {
  const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1].split(',') : null; };
  const only = arg('--only'), some = arg('--moments');
  const sizes = LISTING_SIZES.filter(s => !only || only.includes(s.id));
  const moments = LISTING_MOMENTS.map((m, i) => [m, i]).filter(([m]) => !some || some.includes(m.id));
  const pw = playwright();
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/trylinerugby/`;
  const browser = await pw.chromium.launch();
  try {
    for (const size of sizes) {
      fs.mkdirSync(path.join(SHOTS_DIR, size.id), { recursive:true });
      for (const [moment, i] of moments) {
        const out = shotFile(size, moment, i);
        await shoot(browser, base, size, moment, out);
        console.log(`${size.id} ${path.basename(out)}`);
      }
    }
    if (!only || only.includes(LISTING_FEATURE.id)) {
      await feature(browser, base, path.join(SHOTS_DIR, LISTING_FEATURE.file));
      console.log(LISTING_FEATURE.file);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
