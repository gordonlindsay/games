/* =========================================================
   Import: paste a Pitchero or tournament link and the game builds your club and its league.

   Three parts, kept apart:
   - The parsers and the fetch-and-follow (importUrl, importParse, importFetch): src/import-core.js, which has no screen
     and is shared with the import service. Its header has the safeguarding: only club and team names, shirt colours
     and table numbers ever leave a parser.
   - Fetching. In the Try Line app, through Capacitor's native HTTP: the pasted page, then at most two pages it links
     to on the same site (a league table, then fixtures), three requests in all, a plain "TryLineRugby" User-Agent and
     nothing else about the device. On the web a browser cannot read those pages (Pitchero sends no CORS header), so the
     link goes once, in a POST's body, to the game's own import service (IMPORT_SERVICE: import-service/, on Vercel),
     which makes the same requests under the same rules and answers only what importSafe lets out. That answer is not
     trusted: importClean puts it through the same rules again before anything is shown or saved.
   - Add Your Team: the team screen's entry (My Clubs' My League) and the home's button, their card (#m-import), and the My League group.
   ========================================================= */
const IMPORT_POOL = 'my';                        // My League: settings.pool's key for it, the team screen's Local list after Surrey
const IMPORT_MAX_SIDES = 16;                      // league opponents saved
const IMPORT_MSG = {
  url:'Paste a link that starts with https.',
  net:'Couldn’t open that page. Check the link.',
  timeout:'That page took too long. Try again.',
  empty:'No club or table on that page.',
  full:'Delete a team to make room for this club.',
  offline:'You’re offline. Connect and try again.',
  busy:'Too many imports. Try again in a minute.',
  service:'Import isn’t working. Try again later.',
};

/* ---------- fetching: the app's own, or the web's through the import service ---------- */
/* The game's import service (import-service/README.md): a POST of the link, text/plain so the browser sends it without
   asking first, and { ok, data, requests } or { ok:false, error } back. importServiceUrl is the tests' to point
   elsewhere (tools/import-service.mjs's browser run, at a copy on 127.0.0.1); the game never changes it. */
const IMPORT_SERVICE = 'https://tryline-import.vercel.app/api/import';
const IMPORT_SERVICE_TIMEOUT = 50000;                     // ms: the service gives a whole import 45 seconds
const IMPORT_SERVICE_MAX = 200000;                        // bytes of an answer read, at most: one import's names and numbers are a few thousand
/* The service's errors, each one of IMPORT_MSG's, by the statuses it sends them with (import-service/lib/service.cjs).
   Anything else (no answer at all, one that is not JSON, a 403, a 405 or a 500, an error it never sends) is the
   service itself not working, 'service', so a link that is fine is not blamed for it. 'net' is only the service's
   word that the page itself could not be read. */
const IMPORT_ERRORS = { url:[400, 413, 415], net:[502], timeout:[504], empty:[422], busy:[429] };
let importServiceUrl = IMPORT_SERVICE;
const IMPORT_WEB = Object.freeze({ service:true });       // importHttp's answer on the web: the service, not a fetch of the page
/* How this copy of the game fetches. Capacitor's native HTTP when it runs inside the Try Line app (the app still fetches
   the page itself), else on the web the import service (IMPORT_WEB) where the browser can make a request from a page it
   loaded over http or https, else null: nothing to fetch with, and the card says Works in the Try Line App. */
function importHttp() {
  const C = typeof window !== 'undefined' ? window.Capacitor : null;
  let app = false;
  try { app = !!C && typeof C.isNativePlatform === 'function' && !!C.isNativePlatform(); } catch (e) { return null; }
  if (app) { const H = C.Plugins && C.Plugins.CapacitorHttp; return H && typeof H.get === 'function' ? H : null; }
  return typeof fetch === 'function' && typeof location !== 'undefined' && /^https?:$/.test(location.protocol) ? IMPORT_WEB : null;
}
/* A link pasted, fetched the way this copy of the game fetches: importFetch with Capacitor's HTTP in the app, the
   service on the web. Either way { ok:true, data, requests } or { ok:false, error } with error a key of IMPORT_MSG
   (or 'web', 'cancelled'). opts.cancelled() true (Back while it imports) stops it: the app before its next request,
   the web at once, its request aborted. */
async function importRequest(url, opts = {}) {
  const href = importUrl(url);
  if (!href) return { ok:false, error:'url', requests:0 };
  const http = importHttp();
  if (!http) return { ok:false, error:'web', requests:0 };
  return http === IMPORT_WEB ? importService(href, opts) : importFetch(href, { ...opts, http });
}
/* The web's one request: the link in the body of a POST to the service, never in its address, with no cookies and no
   Referer. 50 seconds at most (opts.timeout for the tests), Back aborts it. What comes back goes through importClean. */
async function importService(href, opts = {}) {
  const stopped = () => typeof opts.cancelled === 'function' && !!opts.cancelled();
  if (stopped()) return { ok:false, error:'cancelled', requests:0 };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok:false, error:'offline', requests:0 };
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  let timer = 0, poll = 0, done = false;
  const ask = async () => {
    let res;
    try {
      res = await fetch(importServiceUrl, { method:'POST', headers:{ 'Content-Type':'text/plain' }, body:href, signal:ctl ? ctl.signal : undefined,
        credentials:'omit', cache:'no-store', referrerPolicy:'no-referrer', redirect:'error', mode:'cors' });
    } catch (e) { throw Error('service'); }                  // refused (no service there, CORS) or the network gone
    const text = await importBody(res);
    done = true;                                           // the answer is in: nothing left to abort
    if (text === null) throw Error('service');
    let j = null; try { j = JSON.parse(text); } catch (e) { throw Error('service'); }
    if (!j || typeof j !== 'object' || Array.isArray(j)) throw Error('service');
    if (j.ok !== true) {
      const known = Object.prototype.hasOwnProperty.call(IMPORT_ERRORS, j.error) && IMPORT_ERRORS[j.error].includes(res.status);
      return { ok:false, error:known ? j.error : 'service', requests:1 };
    }
    const data = importClean(j.data);
    return data ? { ok:true, data, requests:1 } : { ok:false, error:'service', requests:1 };
  };
  try {
    return await Promise.race([
      ask(),
      new Promise((_, no) => {
        timer = setTimeout(() => no(Error('timeout')), opts.timeout ?? IMPORT_SERVICE_TIMEOUT);
        poll = setInterval(() => { if (stopped()) no(Error('cancelled')); }, 100);
      }),
    ]);
  } catch (e) {
    return { ok:false, error:e && (e.message === 'timeout' || e.message === 'cancelled') ? e.message : 'service', requests:1 };
  } finally {
    clearTimeout(timer); clearInterval(poll);
    if (ctl && !done) try { ctl.abort(); } catch (e) { /* gone already */ }   // a request still open (Back, the timeout) goes
  }
}
/* The service's answer as text, or null when it is over IMPORT_SERVICE_MAX: refused by its Content-Length before a byte
   is read, else read a chunk at a time and dropped (the rest cancelled) once it passes the limit, so a service gone
   wrong cannot make the page hold a body of any size. */
async function importBody(res) {
  const h = res && res.headers, size = Number(h && typeof h.get === 'function' ? h.get('content-length') : NaN);
  if (size > IMPORT_SERVICE_MAX) return null;
  const reader = res.body && typeof res.body.getReader === 'function' ? res.body.getReader() : null;
  if (!reader) { const t = await res.text(); return typeof t === 'string' && t.length <= IMPORT_SERVICE_MAX ? t : null; }
  const dec = new TextDecoder();
  let text = '', bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return text + dec.decode();
    bytes += value ? value.byteLength : 0;
    if (bytes > IMPORT_SERVICE_MAX) { try { reader.cancel().catch(() => {}); } catch (e) { /* gone already */ } return null; }
    text += dec.decode(value, { stream:true });
  }
}
/* The service's answer, put through importSafe's rules again: a name passes importName, a colour importHex (through
   importPair), a number importNum, at most IMPORT_MAX_ROWS rows of each list, a label only when importLabel reads it as
   one and a level only by an id levelById knows. A name with a tag in it is dropped whole, before importSafe and again
   after it, since importName decodes entities (&lt;script&gt; is <script> once read). Every other key is dropped.
   Null for anything that is not an object. */
function importClean(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const obj = v => v && typeof v === 'object' && !Array.isArray(v);
  const fair = v => typeof v === 'number' || (typeof v === 'string' && !/[<>]/.test(v));   // the service's names have been through importName: one still holding a tag was never its
  const list = v => Array.isArray(v) ? v.slice(0, 200).filter(x => obj(x) && fair(x.name)) : [];
  const source = IMPORT_SOURCES.some(s => s.id === d.source) ? d.source : 'generic';
  const club = obj(d.club) && fair(d.club.name) ? { name:d.club.name, kit:d.club.kit, trim:d.club.trim } : null;
  const out = importSafe(source, { club, league:list(d.league), teams:list(d.teams) }, '');
  const tagged = v => typeof v !== 'string' || /[<>]/.test(v);
  if (out.club && tagged(out.club.name)) out.club = null;
  out.teams = out.teams.filter(t => !tagged(t.name)); out.league = out.league.filter(r => !tagged(r.name));
  if (typeof d.label === 'string' && d.label.length <= 40 && !/[<>]/.test(d.label) && importLabel(d.label)) out.label = d.label.replace(/\s+/g, ' ').trim();
  const level = typeof d.level === 'string' && levelById(d.level);
  if (level) out.level = level.id;
  return out;
}

/* ---------- saving ---------- */
/* The league as saved: the table's other sides (the club's own row left out), else the fixture opponents, at most 16,
   each with a name no other side in it has (importFit). Ratings are made up and count every ability in ABILITIES, at the level
   chosen for the club: a table's leader totals the level's rating and its foot one point an ability less, not under the floor; fixture opponents, with no table to go on,
   fall between the two by name. With nothing chosen and nothing known the level is the best Local club's (importTop), so a league you add sits with the Local list, under the professional lists.
   Colours are the page's where it gave them, else a shirt and trim picked from KIT_COLOURS
   by the name, so a side keeps its colours from one import to the next. Codes skip every built-in side's and yours. */
const importTop = () => Math.max(...CLUBS.filter(t => t.league !== 'English Premiership').map(rateOf));   // Twickenham is a Premiership side: the Local list's own top is Farnham (and Quins), at 61: Regional 1 (58 with LOCAL, still Regional 1)
const importLevelDefault = () => TEAM_LEVELS.find(l => sumOfOverall(l.overall) === importTop()) || TEAM_LEVELS[4];
/* The level an import is set at: the one chosen, else what its page says, else the Local list's best. */
const importLevel = (data, id) => levelById(id) || (data && levelById(data.level)) || importLevelDefault();
function importSides(data, levelId) {
  if (!data) return [];
  const table = data.league || [], rows = table.filter(r => !r.own), fromTable = rows.length > 0;
  const n = ABILITIES.length, top = sumOfOverall(importLevel(data, levelId).overall), foot = Math.max(n, top - n);
  const used = new Set([...ALL_TEAMS, ...custom].map(t => t.id)), names = new Set(), out = [], list = fromTable ? rows : data.teams || [];
  const shared = new Map();                                // how many sides each short name stands for
  for (const t of list) { const k = importKey(importShort(t.name)); shared.set(k, (shared.get(k) || 0) + 1); }
  for (const t of list) {
    if (out.length >= IMPORT_MAX_SIDES) break;
    const name = importFit(t.name, names, shared.get(importKey(importShort(t.name))) > 1); if (!name) continue;
    const h = importHash(name), id = importCode(name, used);
    const total = fromTable ? Math.round(top - (top - foot)*table.indexOf(t)/Math.max(1, table.length - 1)) : Math.min(top, foot + 1 + h % Math.max(1, top - foot - 1));
    const side = cleanSide(importSpread({ key:'lg-' + id, id, name, ...importColours(t, h) }, total, ABILITIES.map((_, i) => ABILITIES[(i + h) % n][0])));
    if (!side) continue;
    names.add(importKey(name)); used.add(id); out.push(side);
  }
  return out;
}
function importColours(t, h) {
  if (t.kit) return { kit:t.kit, trim:t.trim || importContrast(t.kit), hoops:false };
  const n = KIT_COLOURS.length, kit = KIT_COLOURS[h % n][1];
  for (let j = 0; j < n; j++) { const trim = KIT_COLOURS[((h >>> 8) + j) % n][1]; if (colorDist(kit, trim) >= 150) return { kit, trim, hoops:(h >>> 16) % 4 === 0 }; }
  return { kit, trim:importContrast(kit), hoops:false };
}
/* total ability points over every ability in ABILITIES, as evenly as they go: the odd points to the first of order
   (ability keys), then the rest in ABILITIES order. */
function importSpread(t, total, order) {
  const keys = ABILITIES.map(([k]) => k), n = keys.length, base = Math.floor(total/n), extra = total % n;
  const rank = [...order.filter(k => keys.includes(k)), ...keys.filter(k => !order.includes(k))];
  for (const k of keys) t[k] = clamp(base + (rank.indexOf(k) < extra ? 1 : 0), 1, 5);
  return t;
}
function importCode(name, used) {
  const L = String(name).toUpperCase().replace(/[^A-Z]/g, '') || 'LGE', AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let j = 1; j < L.length; j++) for (let k = j + 1; k < L.length; k++) { const c = L[0] + L[j] + L[k]; if (!used.has(c)) return c; }
  for (const a of AZ) for (const b of AZ) { const c = L[0] + a + b; if (!used.has(c)) return c; }
  return 'XXX';
}
/* A saved league, read back: each side through cleanSide, a name that fits a card, passes importName and no other side
   in it has, a code no built-in side uses and no other side in it, at most 16. Anything broken is dropped; an empty
   league is null. */
function cleanImportLeague(v, moved) {
  if (!v || typeof v !== 'object' || Array.isArray(v) || !Array.isArray(v.teams)) return null;
  const teams = [], ids = new Set(ALL_TEAMS.map(t => t.id)), names = new Set();
  for (const raw of v.teams.slice(0, 64)) {
    const t = cleanSide(raw), name = t && importName(t.name), fit = name && importFit(name, names);
    if (!fit) continue;
    t.name = fit; names.add(importKey(fit));
    delete t.home; delete t.custom;
    if (ids.has(t.id)) {                                   // a code a built-in list has taken since (England 2's and Counties' came with PR #14): a new one, noted in moved by the old key for importRecode
      const was = t.key; t.id = importCode(t.name, ids);
      if (was && moved) moved.set(was, t.id);
    }
    ids.add(t.id);
    t.key = 'lg-' + t.id;
    teams.push(t);
    if (teams.length >= IMPORT_MAX_SIDES) break;
  }
  return teams.length ? { teams } : null;
}
/* A save's league sides recoded by cleanImportLeague (moved: old key to new code), followed everywhere the save holds them, in one pass
   once the whole save is read back (restore calls it last): My Team, the career's club and season, the championship, a cup, the Favourites,
   the Recent, each side's last pick and the games played as the side. By the key the save has, so a side's new key that was another's old
   one moves nothing twice. Left as they were, the career's club would keep a code a built-in club has now and be taken for that club, off
   My League (Merton into Counties, Bedford Athletic into England 2), and the rest would point at nothing: with the county clubs (LOCAL,
   1.7) most of the codes a league was given are a county club's now (Rams, Clifton), so a favourite, a pick and a record would all go. */
function importRecode(moved) {
  if (!moved || !moved.size) return;
  const fix = t => { const id = t && t.key && moved.get(t.key); if (id) { t.id = id; t.key = 'lg-' + id; } };
  const key = k => (moved.has(k) ? 'lg-' + moved.get(k) : k);
  if (moved.has(settings.myClub)) settings.myClub = key(settings.myClub);
  if (career) { fix(career.club); if (career.season) career.season.teams.forEach(fix); }
  if (champ) champ.teams.forEach(fix);
  if (cup) cup.teams.forEach(fix);
  settings.fav = [...new Set(settings.fav.map(key))];
  settings.recent = settings.recent.map(r => [...new Set(r.map(key))]);
  settings.pick = settings.pick.map(p => (p && moved.has(p.id) ? { ...p, id:key(p.id) } : p));
  /* the games played as a side (formKey: c:lg-CODE): each record by its old key; one the save had for the new key already (a side since
     gone) gives way to the side that has it now */
  const was = formRec.map(r => r.k), now = was.map(k => (k.startsWith('c:') ? 'c:' + key(k.slice(2)) : k));
  formRec = formRec.map((r, i) => ({ ...r, k:now[i] })).filter((r, i) => now[i] === was[i] ? !now.some((k, j) => j !== i && k === r.k && now[j] !== was[j]) : true);
}
/* One of your teams with the club's name, or null. */
const importMine = data => { if (!data || !data.club) return null; const k = importKey(importShort(data.club.name)); return custom.find(t => importKey(t.name) === k) || null; };
/* Is there a place for the club among your teams: one of yours has its name, or there is room for another. */
const importRoom = data => !!importMine(data) || custom.length < MAX_CUSTOM;
/* Save: the club joins your teams through cleanTeam, unless one of yours already has its name (re-importing keeps your
   edits), set at the level chosen with all of that level's points spent evenly over every ability (the odd points to pace and handling),
   so it starts with the top of its league and can move them about, and the colours picked. Its league replaces any saved before; an import with no league leaves the old one. */
function importSave(data, draft) {
  let club = importMine(data), added = false;
  const level = importLevel(data, draft && draft.level);
  if (data.club && !club && custom.length < MAX_CUSTOM) {
    const name = importShort(data.club.name);
    club = cleanTeam(importSpread({ key:'imp' + Date.now().toString(36), id:autoCode(name), name, kit:draft.kit, trim:draft.trim, hoops:false, level:level.id }, sumOfOverall(level.overall), ['pace', 'handling']), custom.length);
    custom.push(club); added = true;
  }
  const sides = importSides(data, level.id);
  if (sides.length) importLeague = { teams:sides };
  save();
  return { club, added, sides:sides.length };
}

/* ---------- My League on the team screen ---------- */
const importTeams = () => importLeague ? importLeague.teams : CLUBS;
/* A championship is six sides, yours and five others (newChamp). From My League the five are drawn at random from the
   league, leaving out the team you picked and any side of the same name. A league of fewer than five is topped up
   with Local clubs, drawn the same way, so a three-team league plays your club, its three and two Local clubs. */
function importOthers(t) {
  const same = o => keyOf(o) === keyOf(t) || importKey(o.name) === importKey(t.name);
  const five = shuffle(importTeams().filter(o => !same(o))).slice(0, 5);
  if (five.length < 5) five.push(...shuffle(CLUBS.filter(o => !same(o) && !five.some(f => importKey(f.name) === importKey(o.name)))).slice(0, 5 - five.length));
  return five;
}
/* Add Your Team on the team screen (an entry of My Clubs' My League, pickLadder in src/ui-menus.js) and on the home: while there is room for a
   team, and kept with four made while a league is saved, as the way to refresh it or remove it. In the app it waits until a Super Fan club is
   on sale (storeOffered). */
const importShown = () => (custom.length < MAX_CUSTOM || !!importLeague) && storeOffered('import');
/* The home's Add Your Team, at the top beside My Team: shown where the team screen's entry is (room for a team, or a league to
   refresh or remove, and in the app only once a Super Fan club is on sale), with its lock while Import is locked. */
function importHome() {
  const b = $('b-import'), on = importShown();
  if (b.hidden === on) b.hidden = !on;
  storeMark(b, 'import');
}
$('b-import').addEventListener('click', () => { ac(); importOpen(); });

/* ---------- the Add Your Team card ----------
   web: the app is needed. link: paste, then Import (a grown-up check first). busy: fetching. preview: the club, its
   colours and the league's size, then Save. mine: a club saved, Make This My Team | Not Now. The card hides while the grown-up
   check is up, so the two never stack. from: 'home' (the home's button) or 'teams' (the team screen's card), where it closes to. */
let importUi = { step:'link', data:null, draft:null, pick:false, err:'', armed:false, token:0, from:'teams', club:null, sides:0 };
const importCanPaste = () => typeof navigator !== 'undefined' && !!navigator.clipboard && typeof navigator.clipboard.readText === 'function';
const importTouch = () => !fieldMayFocus();                 // a phone or a tablet, or a finger last on a computer's touch screen, unless a key was the last press (src/input-devices.js)
/* The control a step starts on: the link field (where importTouch, Import, so no keyboard springs up over the card),
   the primary in the preview, Back while it imports and on the web. button: a button only, for a controller's ring. */
function importFocusEl(button) {
  const s = importUi.step;
  if (s === 'link') return !button && !importTouch() ? $('im-url') : button && !$('im-paste').hidden ? $('im-paste') : $('im-go');
  return s === 'preview' ? $('im-go') : s === 'mine' ? $('im-make') : $('im-back');
}
function importFocus() {
  const el = importFocusEl(false);
  if (!$('m-import').hidden && el && typeof el.focus === 'function') el.focus();
}
DEFAULT_FOCUS['m-import'] = () => importFocusEl(true);
function importOpen() {
  if (!storeGate('import', importOpen)) return;            // Import comes with Super Fan (src/store.js); a league already saved stays
  importUi = { step:importHttp() ? 'link' : 'web', data:null, draft:null, pick:false, err:'', armed:false, token:importUi.token + 1, from:$('s-home').hidden ? 'teams' : 'home', club:null, sides:0 };
  $('im-url').value = '';
  importRender();
  $('m-import').hidden = false;
  importFocus();
}
function importClose() {
  importUi.token++; $('m-import').hidden = true;
  if (importUi.from !== 'home') { renderTeams(); return; }
  renderHome();                                            // My Team and Add Your Team as they now are, the focus back on Add Your Team
  const b = $('b-import'); if (b && !b.hidden && typeof b.focus === 'function') b.focus();
}
let importGateHook = null;                               // the tests' stand-in for the grown-up check
function importGate(go, cancel) {
  if (importGateHook) importGateHook(go, cancel);
  else if (typeof parentGate === 'function') parentGate(go, cancel);   // src/kids.js: a check a young child can't pass
  else go();
}
function importGo() {
  const u = importUi;
  if (u.step === 'preview') { importCommit(); return; }
  if (u.step !== 'link') return;
  u.armed = false;
  const href = importUrl($('im-url').value);
  if (!href) { u.err = IMPORT_MSG.url; importRender(); return; }
  const http = importHttp();
  if (!http) { u.step = 'web'; importRender(); return; }
  if (http === IMPORT_WEB && typeof navigator !== 'undefined' && navigator.onLine === false) { u.err = IMPORT_MSG.offline; importRender(); return; }   // no sum for nothing
  const token = ++u.token;
  $('m-import').hidden = true;
  importGate(() => { if (token === importUi.token) importRun(href, token); }, () => { if (token === importUi.token) { $('m-import').hidden = false; importFocus(); } });
}
async function importRun(href, token, opts) {
  const u = importUi;
  u.step = 'busy'; u.err = ''; u.armed = false; importRender(); $('m-import').hidden = false; importFocus();
  const r = await importRequest(href, { ...opts, cancelled:() => token !== importUi.token });   // Back, or another link: no more requests
  if (token !== importUi.token) return;                   // closed, or another link, while it fetched
  const full = r.ok && !!r.data.club && !importRoom(r.data), data = full ? { ...r.data, club:null } : r.data;   // four teams made: the league can come in, the club can't
  const empty = r.ok && !data.club && !importSides(data).length;
  if (!r.ok || empty) { u.step = 'link'; u.err = IMPORT_MSG[!r.ok ? r.error : full ? 'full' : 'empty'] || IMPORT_MSG.net; importRender(); importFocus(); return; }
  const c = data.club, mine = importMine(data);
  u.data = data; u.pick = !!c && !c.kit && !mine;
  u.level = importLevel(data, mine && mine.level).id;   // preset: your own team's level on a re-import, else what the page says, else the Local list's best
  u.draft = mine ? { kit:mine.kit, trim:mine.trim, hoops:mine.hoops, design:mine.design, third:mine.third } : c ? { kit:c.kit || '#2050b0', trim:c.trim || importContrast(c.kit || '#2050b0'), hoops:false } : null;
  u.step = 'preview'; importRender(); importFocus();
}
function importCommit() {
  const u = importUi; if (u.step !== 'preview' || !u.data) return;
  const res = importSave(u.data, { ...(u.draft || {}), level:u.level });
  if (res.added && u.from !== 'home') pickMade(res.club);   // as Save Team: on the side that asked, the one played as when it was Your Team's (ui-menus.js)
  if (res.club && !myIs(res.club)) {                       // a club in: Make This My Team | Not Now
    u.step = 'mine'; u.club = res.club; u.sides = res.sides; u.data = null; u.token++;
    importRender(); importFocus(); return;
  }
  importDone(res.sides);
}
function importDone(sides) {
  importClose();
  if (sides && importUi.from !== 'home') { pickLeague(); renderTeams(); $('s-teams').scrollTop = 0; }   // straight to the new league: My League on the side that asked (Championship's competition becomes it)
}
function importOffer(make) {                                 // the offer answered: the club is My Team's, or not
  const u = importUi; if (u.step !== 'mine') return;
  if (make && u.club) { settings.myClub = keyOf(u.club); save(); }
  importDone(u.sides);
}
function importRender() {
  const u = importUi, s = u.step, web = s === 'web', busy = s === 'busy', pre = s === 'preview', mine = s === 'mine';
  const c = pre && u.data.club, sides = pre ? importSides(u.data, u.level) : [], n = sides.length;
  $('im-title').textContent = mine ? u.club.name : web ? 'Works in the Try Line App' : pre ? (c ? importShort(c.name) : 'My League') : 'Paste Your Link';
  $('im-mine').hidden = !mine; $('im-row').hidden = mine;
  $('im-back').textContent = u.from === 'home' ? 'Back to Menu' : 'Back to Teams';
  $('im-line').hidden = !web;
  $('im-field').hidden = web || pre || mine;
  $('im-url').disabled = busy;
  $('im-paste').hidden = !importCanPaste(); $('im-paste').disabled = busy;
  $('im-err').hidden = !u.err || pre || mine; $('im-err').textContent = u.err;
  $('im-jersey').hidden = !c && !mine; $('im-jersey').innerHTML = c ? jersey(u.draft) : mine ? jersey(u.club) : '';
  $('im-league').hidden = !n;
  $('im-league').innerHTML = n ? sides.slice(0, 12).map(t => jersey(t, 'mini')).join('') + `<span class="lbl">My League · ${n} Team${n === 1 ? '' : 's'}</span>` : '';
  $('im-cols').hidden = !(c && u.pick);
  const own = c ? importMine(u.data) : null;                // re-importing keeps your team as you made it (importSave): the level is only its league's, and the screen says so
  const lv = pre && (n || !own) ? importLevel(u.data, u.level) : null, li = lv ? TEAM_LEVELS.indexOf(lv) : 0;
  $('im-level').hidden = !lv;
  $('im-level-lbl').textContent = own || !c ? 'League' : 'Level';
  $('im-kept').hidden = !own;
  $('im-kept').textContent = own ? `${own.name} stays as you made it.${n ? ' This sets its league.' : ''}` : '';
  $('im-lv-name').textContent = lv ? `${lv.name} · ${starsWords(lv.stars)}` : '';
  $('im-lv-stars').innerHTML = lv ? starsHtml(lv.stars, true) : '';
  $('im-lv-down').disabled = li <= 0; $('im-lv-up').disabled = li >= TEAM_LEVELS.length - 1;
  for (const [id, key] of [['im-kit', 'kit'], ['im-trim', 'trim']]) for (const b of $(id).querySelectorAll('.sw')) b.setAttribute('aria-pressed', String(!!u.draft && b.dataset.c === u.draft[key]));
  $('im-go').hidden = web || mine; $('im-go').disabled = busy;
  $('im-go').textContent = busy ? 'Importing' : pre ? (c && !own ? 'Save Club' : 'Save League') : 'Import';   // re-importing your own club saves its league only (PR #14)
  const alt = pre ? 'Change Link' : importLeague && !busy ? (u.armed ? 'Confirm Remove' : 'Remove League') : '';
  $('im-alt').hidden = !alt; $('im-alt').textContent = alt; $('im-alt').classList.toggle('warn', !pre);
  $('im-row').classList.toggle('one', !alt);
}
function importAlt() {
  const u = importUi;
  if (u.step === 'preview') { u.step = 'link'; u.data = null; u.err = ''; u.armed = false; u.token++; importRender(); importFocus(); return; }
  if (!importLeague) return;
  if (!u.armed) { u.armed = true; confirmArm(); importRender(); return; }
  if (confirmSoon()) return;                               // a quick double tap only asks (CONFIRM, ui-menus.js)
  importLeague = null; u.armed = false;
  if (settings.pool === IMPORT_POOL) settings.pool = 'sur';
  save(); importRender(); importFocus();                   // Remove League has gone: focus to the step's own control
}
function importLevelStep(d) {
  const u = importUi; if (u.step !== 'preview') return;
  const l = TEAM_LEVELS[TEAM_LEVELS.indexOf(importLevel(u.data, u.level)) + d];
  if (l) { u.level = l.id; importRender(); }
}
$('im-lv-down').addEventListener('click', () => importLevelStep(-1));
$('im-lv-up').addEventListener('click', () => importLevelStep(1));
for (const [id, key] of [['im-kit', 'kit'], ['im-trim', 'trim']]) {
  $(id).innerHTML = KIT_COLOURS.map(([n, h]) => `<button class="sw" style="--k:${h}" data-c="${h}" aria-label="${n}"></button>`).join('');
  for (const b of $(id).querySelectorAll('.sw')) b.addEventListener('click', () => { if (importUi.draft) { importUi.draft[key] = b.dataset.c; importRender(); } });
}
$('im-go').addEventListener('click', importGo);
$('im-alt').addEventListener('click', importAlt);
$('im-back').addEventListener('click', importClose);
$('im-make').addEventListener('click', () => importOffer(true));
$('im-not').addEventListener('click', () => importOffer(false));
$('im-url').addEventListener('input', () => { if (importUi.err) { importUi.err = ''; importRender(); } });
$('im-url').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); importGo(); } });
/* A controller's ring on the link step (navMove, src/input-devices.js): the link row is the field and Paste, the field
   no stop for the ring, so down from Paste is Import, and up from the row under it is Paste. Undefined elsewhere: the
   nearest that way, as everywhere. */
function importNav(from, dx, dy) {
  if (importUi.step !== 'link' || dx || !dy) return undefined;
  const paste = $('im-paste'), go = $('im-go'), on = el => !!el && !el.hidden && !el.disabled;
  if (dy > 0 && from === paste && on(go)) return go;
  if (dy < 0 && on(paste) && [go, $('im-back'), $('im-alt')].includes(from)) return paste;
  return undefined;
}
/* Escape on the card is its Back (Back to Teams or Back to Menu, or Not Now), as on the grown-up check and the Minis
   card, and never the pause behind it. */
window.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || $('m-import').hidden || !$('m-gate').hidden) return;
  const back = [...$('m-import').querySelectorAll('[data-back]')].find(el => !el.hidden && !(el.closest && el.closest('[hidden]')));
  if (!back) return;
  if (e.stopPropagation) e.stopPropagation();
  if (e.preventDefault) e.preventDefault();
  if (!e.repeat) back.click();
}, true);
$('im-paste').addEventListener('click', async () => {
  try { const t = await navigator.clipboard.readText(); if (t) { $('im-url').value = t.trim().slice(0, 2048); importUi.err = ''; importRender(); } } catch (e) { /* refused or empty */ }
});
