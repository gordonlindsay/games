/* =========================================================
   Import: paste a Pitchero or tournament link and the game builds your club and its league.

   Three parts, kept apart:
   - importUrl and importParse: text in, plain data out. No DOM, no network. Each source is one adapter in
     IMPORT_SOURCES, reading the page through importDoc (its JSON scripts, meta tags, tables and links).
   - importFetch: the Try Line app only, through Capacitor's native HTTP. The pasted page, then at most two pages it
     links to on the same site (a league table, then fixtures): three requests in all, a plain "TryLineRugby"
     User-Agent and nothing else about the device. The web build never fetches. Pitchero sends no CORS header, so a
     browser on another site could not read its pages anyway.
   - The Import Club card and its card (#m-import) on the team screen, and the My League list.

   Safeguarding. Only club and team names, shirt colours and table numbers ever leave a parser. The Pitchero adapter
   reads named fields only (the club's name and colours, the table's team cells and numbers, each fixture's
   opponent). Anything that walks a page skips every subtree under a key that can hold people (IMPORT_SKIP), and every
   name passes importName, which drops anything that looks like a person, an email, a phone number or a link.
   Nothing about a person, the link itself or the page is kept.
   ========================================================= */
const IMPORT_POOL = POOLS.length;                 // My League: the team screen's button after South Africa
const IMPORT_MAX_SIDES = 16;                      // league opponents saved
const IMPORT_MAX_ROWS = 24;                       // rows or names a parser returns
const IMPORT_MAX_REQUESTS = 3;                    // the pasted page, a league table, fixtures
const IMPORT_TIMEOUT = 12000;                     // ms one request may take
const IMPORT_UA = 'TryLineRugby';
const IMPORT_MAX_HTML = 4000000;                  // characters of a page read: Next.js puts its data at the very end
const IMPORT_MSG = {
  url:'Paste a link that starts with https.',
  net:'Couldn’t open that page. Check the link.',
  timeout:'That page took too long. Try again.',
  empty:'No club or table on that page.',
};

/* ---------- what the parsers look for: data, so a new page shape is a table edit ---------- */
/* Keys whose whole subtree can hold people or their pictures: never walked. */
const IMPORT_SKIP = /^(?:players?|squads?|members?|membership|staff|officials?|coach(?:es)?|managers?|captains?|contacts?|contactpoint|authors?|users?|profiles?|people|persons?|athletes?|employees?|founders?|scorers?|try_?scorers?|lineups?|team_?sheets?|motm|man_?of_?the_?match|player_?of_?the_?match|comments?|reports?|match_?reports?|news|articles?|posts?|blogs?|galler(?:y|ies)|photos?|images?|image_?url|avatars?|logos?|crests?|emails?|phones?|telephone|mobile|address(?:es)?|welfare|committee|officers?|volunteers?|parents?|guardians?|statistics|leaders|awards?|sponsors?|videos?|media|socials?|social_?links)$/i;
const IMPORT_KEYS = {
  name:['team_name', 'teamName', 'team', 'club', 'clubName', 'club_name', 'name', 'title', 'displayName', 'display_name', 'shortName', 'short_name'],
  played:['played', 'p', 'pl', 'pld', 'gp', 'mp', 'gamesPlayed', 'games_played', 'matchesPlayed', 'matches_played'],
  won:['won', 'w', 'wins'],
  drawn:['drawn', 'drew', 'd', 'draws', 'drawn_games'],
  lost:['lost', 'l', 'losses'],
  points:['points', 'pts', 'pt', 'totalPoints', 'total_points', 'league_points'],
  kit:['primary_colour', 'primaryColour', 'primary_color', 'primaryColor', 'colour1', 'color1', 'kitColour', 'kit_colour', 'shirtColour', 'shirt_colour'],
  trim:['secondary_colour', 'secondaryColour', 'secondary_color', 'secondaryColor', 'colour2', 'color2', 'trimColour', 'trim_colour'],
  own:['is_highlighted', 'isHighlighted', 'isCurrentTeam', 'is_current_team', 'isOwnTeam'],
  opponent:['opponent', 'opponentName', 'opponent_name', 'opposition', 'oppositionName', 'opposition_name'],
  sides:['homeSide', 'awaySide', 'homeTeam', 'awayTeam', 'home_team', 'away_team'],
  club:/^(?:club|clubinfo|club_info|organisation|organization)$/i,
};
/* A standings table's header cells, and a fixtures table's. A player table (Player, Apps, Tries, Pts) has no team
   column and no W or L, so it never passes. */
const IMPORT_COLS = {
  name:['team', 'teams', 'club', 'clubs', 'side', 'team name', 'club name'],
  played:['p', 'pl', 'pld', 'played', 'gp', 'mp'],
  won:['w', 'won', 'wins'],
  drawn:['d', 'drawn', 'drew', 'draws'],
  lost:['l', 'lost', 'losses'],
  points:['pts', 'points', 'pt', 'tp'],
  home:['home', 'home team', 'team 1', 'team a'],
  away:['away', 'away team', 'team 2', 'team b'],
};
const IMPORT_STATS = ['played', 'won', 'drawn', 'lost', 'points'];
const IMPORT_NONE = ['#cccccc', '#999999'];       // Pitchero's grey pair for a club it has no colours for
const IMPORT_SUFFIX = /\s+(?:r\.?u\.?f\.?c\.?|r\.?f\.?c\.?|rugby union football club|rugby football club|rugby union club|rugby club|rugby union|rugby|f\.?c\.?)$/i;
/* A side's own label, not a club: U10s, 1st XV, U9 & U10 Girls, Academy U18 1XV. Every word must be one of these. */
const IMPORT_LABEL = /^(?:u\d{1,2}s?|under|\d{1,2}s?|minis?|juniors?|colts|youth|ladies|women|womens|girls|boys|mixed|vets|veterans|academy|development|dev|seniors?|first|second|third|fourth|\d{1,2}(?:st|nd|rd|th)|xv|xvs|\d?xv|sevens|7s|team|squad|[a-d]|&|and|\+)$/i;
const IMPORT_NOT_TEAM = /\b(?:festival|tournament|training|session|tbc|tba|tbd|bye|cancelled|postponed|to be confirmed|friendly|friendlies|winners?|losers?|runners?[- ]up|(?:pool|group) [a-h1-8]|(?:semi|quarter)[- ]?finals?|finals?|play[- ]?offs?)\b/i;
const IMPORT_PLATFORMS = /^(?:pitchero|tournify|leaguerepublic|league republic|spond|teamapp|team app|teamer|sportlomo|england rugby|rfu|google|facebook|instagram|twitter|youtube|wordpress|wix|squarespace|home|homepage|welcome|fixtures?|results?|fixtures (?:and|&) results|league tables?|tables?|standings|news|teams?|clubs?)$/i;

/* ---------- names and colours ---------- */
/* Common first names. A two or three word name that starts with one and has no club word in it reads as a person
   (Jamie Smith), so it is dropped: losing a rare team called that costs less than showing a child's name. */
const IMPORT_FIRST = new Set(('jack harry oliver charlie george noah leo arthur oscar alfie freddie archie theo thomas james william henry jacob joshua ' +
  'max finley ethan samuel sam isaac lucas joseph joe daniel dan alexander alex ben benjamin adam luke liam ryan owen jamie callum lewis kieran ' +
  'matthew matt michael mike david tom tommy rory reuben toby louis elliot harvey jake jayden dylan tyler logan mason riley morgan casey jordan ' +
  'taylor robin quinn harper avery cameron charlie sophie olivia amelia isla ava emily mia grace lily ella evie poppy freya ruby chloe jessica ' +
  'lucy holly ellie hannah sarah emma katie megan amy laura rebecca rachel charlotte alice florence isabella isabelle millie daisy phoebe ' +
  'scarlett matilda rosie erin niamh caitlin ciara aoife sean conor cian oisin ewan fraser euan angus hamish alexandra').split(' '));
const IMPORT_CLUB_WORD = /\b(?:r\.?u?\.?f\.?c|rugby|club|united|city|town|athletic|rovers|wanderers|saints|old|st|park|school|college|academy|sharks|tigers|lions|bears|eagles|hawks|wolves|falcons|chiefs|pirates|knights|blues|reds|xv|minis|juniors|colts|u\d+)\b/i;
/* Pitchero's advice for juniors is "Joe S" or "J Smith". A name shaped like that, or like Firstname Surname, or holding
   an email, a link, a phone number or a role, is never kept. Bath A to Bath D stay: those are second teams. */
function importPersonal(s) {
  s = String(s || '').trim();
  if (/@|https?:|www\.|mailto|tel:|\.(?:com|co\.uk|org|net)\b/i.test(s)) return true;
  if ((s.match(/\d/g) || []).length >= 7) return true;
  if (/^[A-Z]\.?\s+[A-Z][a-z'’-]+$/.test(s)) return true;
  if (/^[A-Z][a-z'’-]+\s+(?:[E-Z]|[A-Z]\.)$/.test(s)) return true;
  if (/\b(?:captain|coach|manager|chair(?:man|person|woman)?|secretary|treasurer|welfare|president|referee|physio|player of|man of the match|motm|mr|mrs|ms|miss|dr)\b/i.test(s)) return true;
  const w = s.split(/\s+/);
  if (w.length >= 2 && w.length <= 3 && IMPORT_FIRST.has(w[0].toLowerCase()) && w.every(x => /^\p{Lu}/u.test(x)) && !IMPORT_CLUB_WORD.test(s)) return true;
  return false;
}
const IMPORT_ENT = { amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' ', ndash:'-', mdash:'-', rsquo:'’', lsquo:'‘', ldquo:'"', rdquo:'"', hellip:'...', copy:'', reg:'', trade:'' };
const importChar = n => n > 31 && n < 0x110000 && !(n >= 0xd800 && n < 0xe000) ? String.fromCodePoint(n) : '';
function importText(h) {
  return String(h).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi, (m, e) => e[0] === '#' ? importChar(/x/i.test(e[1]) ? parseInt(e.slice(2), 16) : +e.slice(1)) : (IMPORT_ENT[e.toLowerCase()] ?? m))
    .replace(/\s+/g, ' ').trim();
}
const importLabel = s => { const w = String(s).toLowerCase().split(/[\s/]+/).filter(Boolean); return w.length > 0 && w.every(x => IMPORT_LABEL.test(x)); };
/* A club or team name as it may be shown, or '' for anything that is not one. */
function importName(v) {
  if (typeof v !== 'string' && typeof v !== 'number') return '';
  if (importPersonal(importText(String(v)))) return '';
  const s = importText(String(v))
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]|\p{Extended_Pictographic}/gu, '')
    .replace(/\s*[([][^)\]]*[)\]]\s*$/, '')        // a trailing (H), (A) or [Hosts]
    .replace(/\s+/g, ' ').trim();
  if (s.length < 2 || s.length > 60 || !/\p{L}/u.test(s)) return '';
  if (importPersonal(s) || importLabel(s) || IMPORT_NOT_TEAM.test(s) || IMPORT_PLATFORMS.test(s)) return '';
  return s.slice(0, 40).trim();
}
const importKey = s => String(s || '').toLowerCase().replace(IMPORT_SUFFIX, '').replace(/[^\p{L}\p{N}]/gu, '');
/* The club a side belongs to: Bracknell for Bracknell RFC, Bracknell U16 or Bracknell A. */
function importBase(s) {
  const w = String(s || '').replace(IMPORT_SUFFIX, '').split(/\s+/).filter(Boolean);
  while (w.length > 1 && IMPORT_LABEL.test(w[w.length - 1])) w.pop();
  return importKey(w.join(' '));
}
const importSame = (a, b) => { const x = importBase(a); return !!x && x === importBase(b); };
/* Shortened to fit a team card: the rugby suffix goes first, then whole words from the end. */
function importShort(name, max = 16) {
  let s = String(name || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const bare = s.replace(IMPORT_SUFFIX, '').trim();
  if (bare.length <= max && bare.length >= 3) return bare;
  if (bare.length >= 3) s = bare;
  const cut = s.slice(0, max + 1), sp = cut.lastIndexOf(' ');
  const out = (sp >= 3 ? cut.slice(0, sp) : s.slice(0, max)).trim();
  return out.replace(/(?:\s+(?:&|and|of|the|on|in|at|-))+$/i, '').trim() || out;   // never ends on a joining word
}
function importHex(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  let m = s.match(/^#?([0-9a-f]{6})$/); if (m) return '#' + m[1];
  m = s.match(/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/); if (m) return '#' + m[1] + m[1] + m[2] + m[2] + m[3] + m[3];
  m = s.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*[,)]/);
  if (m && m.slice(1, 4).every(x => +x <= 255)) return '#' + m.slice(1, 4).map(x => (+x).toString(16).padStart(2, '0')).join('');
  return null;
}
/* A shirt and trim, or nulls: Pitchero's grey placeholder is no colour, and a trim too close to its shirt is dropped. */
function importPair(kit, trim) {
  let k = importHex(kit), t = importHex(trim);
  if (k === IMPORT_NONE[0] && (t === IMPORT_NONE[1] || !t)) k = t = null;
  if (!k) return [null, null];
  if (t && colorDist(k, t) < 60) t = null;
  return [k, t];
}
const importContrast = kit => colorDist(kit, '#f2efe6') >= 150 ? '#f2efe6' : '#1c1c1c';
function importNum(v) {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\s*[-+]?\d{1,4}\s*$/.test(v) ? +v : NaN;
  return Number.isFinite(n) && Math.abs(n) <= 9999 ? Math.round(n) : null;
}
function importHash(s) { let h = 2166136261; for (const c of String(s).toLowerCase()) h = Math.imul(h ^ c.codePointAt(0), 16777619); return h >>> 0; }

/* ---------- reading a page ---------- */
function importAttrs(s) {
  const a = {};
  for (const m of String(s).matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    const k = m[1].toLowerCase();
    if (!(k in a)) a[k] = importText(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return a;
}
function importJson(s) { try { const v = JSON.parse(s); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } }
/* The JSON value opening at s[i] ({ or [), as text, or ''. */
function importBalanced(s, i) {
  if (s[i] !== '{' && s[i] !== '[') return '';
  let depth = 0, str = false;
  for (let j = i; j < s.length && j < i + IMPORT_MAX_HTML; j++) {
    const c = s[j];
    if (str) { if (c === '\\') j++; else if (c === '"') str = false; continue; }
    if (c === '"') str = true;
    else if (c === '{' || c === '[') depth++;
    else if ((c === '}' || c === ']') && --depth === 0) return s.slice(i, j + 1);
  }
  return '';
}
/* Each <tag ...>...</tag> in s as [attributes, inner], in one pass: an unclosed tag ends the search rather than
   rescanning the page from every later start, so no page, however broken, can stall the import. */
function importBlocks(s, low, tag, max) {
  const out = [], open = new RegExp('<' + tag + '\\b([^>]*)>', 'gi'), close = '</' + tag;
  let m;
  while (out.length < max && (m = open.exec(s))) {
    const start = m.index + m[0].length, end = low.indexOf(close, start);
    if (end < 0) break;
    out.push([m[1], s.slice(start, end)]);
    open.lastIndex = end + close.length;
  }
  return out;
}
const importLow = s => s.replace(/[A-Z]+/g, x => x.toLowerCase());   // ASCII only, so every index still matches the page
/* The page without comments, scripts, styles and inline pictures, in one pass. */
function importStrip(s, low) {
  const re = /<!--|<(script|style|noscript|template|svg)\b/gi;
  let out = '', i = 0, m;
  while ((m = re.exec(s))) {
    out += s.slice(i, m.index) + ' ';
    const close = m[1] ? '</' + m[1].toLowerCase() : '-->', end = low.indexOf(close, re.lastIndex);
    if (end < 0) return out;
    const gt = m[1] ? s.indexOf('>', end) : end + 2;
    if (gt < 0) return out;
    i = re.lastIndex = gt + 1;
  }
  return out + s.slice(i);
}
/* A page as the parsers see it: JSON blobs (Next.js __NEXT_DATA__, other JSON scripts, app-router flight data, a
   window.__STATE__ handed to the page), JSON-LD, meta tags, the title, tables as rows of cell text, and links. */
function importDoc(html) {
  const src = typeof html === 'string' ? html.slice(0, IMPORT_MAX_HTML) : '', low = importLow(src);
  const doc = { blobs:[], ld:[], meta:{}, title:'', tables:[], links:[] };
  const blob = (id, json) => { if (json && doc.blobs.length < 200) doc.blobs.push({ id, json }); };
  for (const [attrs, inner] of importBlocks(src, low, 'script', 600)) {
    const a = importAttrs(attrs), type = (a.type || '').toLowerCase(), body = inner.trim();
    if (type === 'application/ld+json') { const j = importJson(body); if (j && doc.ld.length < 20) doc.ld.push(j); continue; }
    if (a.id === '__NEXT_DATA__' || type === 'application/json') { blob(a.id || 'json', importJson(body)); continue; }
    let flight = '';
    for (const f of body.matchAll(/self\.__next_f\.push\(/g)) {
      const text = importBalanced(body, f.index + f[0].length); if (!text) break;   // a broken push: stop, never rescan
      const arr = importJson(text);
      if (Array.isArray(arr) && typeof arr[1] === 'string') flight += arr[1];
    }
    for (const line of flight.split('\n')) { const p = line.indexOf(':'); if (p > 0 && /^[[{]/.test(line.slice(p + 1))) blob('flight', importJson(line.slice(p + 1))); }
    for (const w of body.matchAll(/(?:window|self)\.__[A-Za-z_]+__\s*=\s*(?=[{[])/g)) { const text = importBalanced(body, w.index + w[0].length); if (!text) break; blob('state', importJson(text)); }
  }
  const page = importStrip(src, low), plow = importLow(page);
  for (const m of page.matchAll(/<meta\b([^>]*)>/gi)) {
    const a = importAttrs(m[1]), k = (a.property || a.name || '').toLowerCase();
    if (k && a.content && !(k in doc.meta)) doc.meta[k] = a.content;
  }
  const t = importBlocks(page, plow, 'title', 1)[0]; if (t) doc.title = importText(t[1]);
  for (const [, inner] of importBlocks(page, plow, 'table', 40)) {
    const rows = [];
    for (const r of inner.split(/<tr\b[^>]*>/i).slice(1, 202)) {
      const cells = [];
      for (const part of r.split(/<\/tr\s*>/i)[0].split(/(?=<t[hd]\b)/i).slice(0, 60)) {
        const c = part.match(/^<(t[hd])\b([^>]*)>([\s\S]*)$/i); if (!c) continue;
        const th = c[1].toLowerCase() === 'th', span = Math.min(8, Math.max(1, parseInt(importAttrs(c[2]).colspan, 10) || 1));
        cells.push({ th, text:importText(c[3]) });
        for (let i = 1; i < span; i++) cells.push({ th, text:'', span:true });
      }
      if (cells.length) rows.push(cells);
    }
    if (rows.length) doc.tables.push(rows);
  }
  for (const [attrs, inner] of importBlocks(page, plow, 'a', 400)) { const a = importAttrs(attrs); if (a.href) doc.links.push({ href:a.href, text:importText(inner) }); }
  return doc;
}
/* Every object and array under a JSON value, depth first, skipping any subtree under a person key. */
function importWalk(root, visit) {
  const stack = [[root, '', 0]];
  let n = 0;
  while (stack.length && n++ < 100000) {
    const [v, key, depth] = stack.pop();
    if (!v || typeof v !== 'object' || depth > 40 || IMPORT_SKIP.test(key)) continue;
    visit(v, key);
    const entries = Array.isArray(v) ? v.map((c, i) => [String(i), c]) : Object.entries(v);
    for (let i = entries.length - 1; i >= 0; i--) if (entries[i][1] && typeof entries[i][1] === 'object') stack.push([entries[i][1], entries[i][0], depth + 1]);
  }
}
const importPick = (o, keys) => { if (o && typeof o === 'object') for (const k of keys) if (o[k] != null && o[k] !== '') return o[k]; return null; };
/* One standings row from an object: a team name, W or L, and at least three of P W D L Pts. Pitchero keeps the values
   in column_values by column key; others nest them under stats or record. A player (name, played, points) never passes. */
function importRowOf(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  const cv = Array.isArray(o.column_values) ? Object.fromEntries(o.column_values.filter(c => c && typeof c.key === 'string').map(c => [c.key, c.value])) : null;
  const src = [o, cv, o.stats, o.record, o.totals, o.standing].filter(x => x && typeof x === 'object' && !Array.isArray(x));
  const get = keys => { for (const s of src) for (const k of keys) if (s[k] != null && s[k] !== '') return s[k]; return null; };
  let name = get(IMPORT_KEYS.name);
  if (name && typeof name === 'object') name = importPick(name, IMPORT_KEYS.name);
  if (typeof name !== 'string' && typeof name !== 'number') return null;
  const row = { name:String(name) };
  for (const k of IMPORT_STATS) row[k] = importNum(get(IMPORT_KEYS[k]));
  if ((row.won == null && row.lost == null) || IMPORT_STATS.filter(k => row[k] != null).length < 3) return null;
  row.kit = get(IMPORT_KEYS.kit); row.trim = get(IMPORT_KEYS.trim);
  if (get(IMPORT_KEYS.own) === true) row.own = true;
  return row;
}
/* What a JSON tree offers: standings tables, fixture opponents and club objects with colours. */
function importScan(json, out) {
  importWalk(json, (v, key) => {
    if (Array.isArray(v)) {
      if (v.length >= 2 && v.length <= 200) {
        const rows = v.map(importRowOf).filter(Boolean);
        if (rows.length >= 2 && rows.length * 2 >= v.length) out.tables.push(rows);
      }
      return;
    }
    const side = o => typeof o === 'string' ? { name:o } : o && typeof o === 'object' ? { name:importPick(o, IMPORT_KEYS.name), kit:importPick(o, IMPORT_KEYS.kit), trim:importPick(o, IMPORT_KEYS.trim) } : null;
    const opp = importPick(v, IMPORT_KEYS.opponent);
    if (opp) out.opponents.push(side(opp));
    for (const k of IMPORT_KEYS.sides) if (v[k]) out.opponents.push(side(v[k]));
    if (IMPORT_KEYS.club.test(key) && typeof v.name === 'string') {
      const c = v.colours || v.colors || v.theme || v;
      out.clubs.push({ name:v.name, kit:importPick(c, ['primary', ...IMPORT_KEYS.kit]), trim:importPick(c, ['secondary', ...IMPORT_KEYS.trim]) });
    }
  });
}
const importNorm = s => String(s).toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
function importCols(cells) {
  const col = {};
  cells.forEach((c, i) => { const h = importNorm(c.text); for (const [k, names] of Object.entries(IMPORT_COLS)) if (col[k] == null && names.includes(h)) col[k] = i; });
  return col;
}
/* Standings tables (a team column, W or L, three of P W D L Pts) and the names in fixtures tables (Home and Away). */
function importTables(doc) {
  const standings = [], names = [];
  for (const rows of doc.tables) {
    const h = rows.slice(0, 3).findIndex(r => { const c = importCols(r); return c.name != null || (c.home != null && c.away != null); });
    if (h < 0) continue;
    const col = importCols(rows[h]);
    const cell = (r, i) => { for (let j = i; j < r.length && j < i + 3; j++) { if (j > i && !r[j].span && rows[h][j] && rows[h][j].text) break; if (r[j].text) return r[j].text; } return ''; };   // a team cell spans its crest
    if (col.name != null && (col.won != null || col.lost != null) && IMPORT_STATS.filter(k => col[k] != null).length >= 3) {
      const out = [];
      for (const r of rows.slice(h + 1)) {
        const name = cell(r, col.name); if (!name || /^\d+$/.test(name)) continue;
        const row = { name };
        for (const k of IMPORT_STATS) row[k] = col[k] == null || !r[col[k]] ? null : importNum(r[col[k]].text);
        out.push(row);
      }
      if (out.length) standings.push(out);
    } else if (col.home != null && col.away != null) {
      for (const r of rows.slice(h + 1)) for (const i of [col.home, col.away]) { const name = r[i] && cell(r, i); if (name) names.push({ name }); }
    }
  }
  return { standings, names };
}
const importHas = (rows, club) => !!club && rows.some(r => importSame(r.name, club));
/* The club a page names: a club object in its JSON, a JSON-LD sports team, og:site_name, then the title. Not on a
   person's page, where the title is a name. */
function importClubName(doc, href, extra) {
  let path = ''; try { path = new URL(href).pathname; } catch (e) { /* no link */ }
  const personal = /\/(?:players?|profiles?|people|persons?|staff|members?|contacts?|officials?|coach(?:es)?|users?|squads?)(?:\/|$)/i.test(path);
  const seg = t => { const parts = String(t || '').split(/\s+[|\-\u2013\u2014\u00b7:]+\s+/).map(s => s.trim()).filter(Boolean); return parts.find(p => /\b(?:r\.?u?\.?f\.?c\.?|rugby|club)\b/i.test(p)) || parts[parts.length - 1] || ''; };
  const cands = [...extra, doc.meta['og:site_name'], doc.meta['application-name']];
  if (!personal) cands.push(seg(doc.meta['og:title']), seg(doc.title));
  for (const c of cands) { const n = importName(c); if (n) return n; }
  return '';
}

/* ---------- the adapters, one a source ---------- */
/* Any page: standings tables in its HTML, then in its JSON; fixtures tables, JSON-LD events and JSON opponents for the
   other sides; the club from its JSON, JSON-LD or meta tags, its colour from a club object or theme-color. */
function importGeneric(doc, href) {
  const scan = { tables:[], opponents:[], clubs:[] }, ldClubs = [], ldTeams = [];
  for (const b of doc.blobs) importScan(b.json, scan);
  const ldType = v => [].concat(v['@type'] || []).join(' '), ldEvents = [];
  for (const root of doc.ld.flatMap(r => [].concat(r, r && r['@graph'] || []))) {   // the page's own entities: a team in an event or a league is not the club
    if (root && typeof root === 'object' && /\bSports(?:Team|Organization|Club)\b/.test(ldType(root)) && typeof root.name === 'string') ldClubs.push(root.name);
  }
  importWalk(doc.ld, v => { if (!Array.isArray(v) && /\bSportsEvent\b/.test(ldType(v))) ldEvents.push(v); });
  for (const node of ldEvents) {
    for (const k of ['homeTeam', 'awayTeam', 'competitor']) for (const t of [].concat(node[k] || [])) {
      if (typeof t === 'string') ldTeams.push({ name:t });
      else if (t && typeof t.name === 'string' && !/\bPerson\b/.test([].concat(t['@type'] || []).join(' '))) ldTeams.push({ name:t.name });
    }
  }
  const clubObj = scan.clubs.find(c => importName(c.name));
  const name = importClubName(doc, href, [clubObj && clubObj.name, ...ldClubs]);
  const theme = doc.meta['theme-color'] || doc.meta['msapplication-tilecolor'];
  const club = name ? { name, kit:clubObj && importSame(clubObj.name, name) && importHex(clubObj.kit) ? clubObj.kit : theme, trim:clubObj && importSame(clubObj.name, name) ? clubObj.trim : null } : null;
  const html = importTables(doc);
  const tables = [...html.standings, ...scan.tables];
  const league = tables.find(t => importHas(t, name)) || tables.slice().sort((a, b) => b.length - a.length)[0] || [];
  return { club, league, teams:[...html.names, ...ldTeams, ...scan.opponents] };
}
/* Pitchero club sites are server-rendered Next.js with every fact in __NEXT_DATA__ (pitchero-findings v1.0):
   the club at props.club (name, colours.primary and .secondary); each season's table for the team at
   props.initialReduxState.teams.leagueTable.tables[teamId], picked by props.pageProps.seasonId, rows by rank, values
   by column key, is_highlighted on the club's own row; fixtures keyed by id at ...teams.fixtures.fixtures[teamId],
   each with its opponent and the colours of the side it played as. A page without these falls back to importGeneric. */
function importPitchero(doc, href) {
  const nd = (doc.blobs.find(b => b.id === '__NEXT_DATA__') || {}).json || {};
  const props = nd.props && typeof nd.props === 'object' ? nd.props : {}, pp = props.pageProps && typeof props.pageProps === 'object' ? props.pageProps : {};
  const club = [props.club, pp.club].find(c => c && typeof c === 'object' && typeof c.name === 'string');
  const ref = importPitcheroRef(href);
  const teamId = String(pp.teamId ?? (nd.query && nd.query.teamId) ?? (ref && ref.team) ?? '');
  const st = props.initialReduxState && props.initialReduxState.teams || {};
  const out = { club:null, league:[], teams:[] };
  if (club) { const c = club.colours && typeof club.colours === 'object' ? club.colours : {}; out.club = { name:club.name, kit:c.primary, trim:c.secondary }; }
  const byTeam = st.leagueTable && st.leagueTable.tables;
  if (byTeam && typeof byTeam === 'object') {
    const list = [].concat(teamId && byTeam[teamId] ? byTeam[teamId] : teamId ? [] : Object.values(byTeam).flat()).filter(t => t && typeof t === 'object' && Array.isArray(t.rows));
    const table = list.find(t => t.season_id != null && String(t.season_id) === String(pp.seasonId)) || list[list.length - 1];
    if (table) out.league = table.rows.slice(0, 200).sort((a, b) => (importNum(a && a.rank) ?? 999) - (importNum(b && b.rank) ?? 999)).map(importRowOf).filter(Boolean);
  }
  const fx = st.fixtures && st.fixtures.fixtures;
  if (fx && typeof fx === 'object') {
    const own = teamId ? fx[teamId] : Object.assign({}, ...Object.values(fx).filter(v => v && typeof v === 'object'));
    const games = Object.values(own && typeof own === 'object' ? own : {}).filter(g => g && typeof g === 'object').slice(0, 200);
    games.sort((a, b) => String(a.dateTime || '').localeCompare(String(b.dateTime || '')));
    for (const g of games) {
      const side = g.ha === 'h' ? g.awaySide : g.ha === 'a' ? g.homeSide : null;
      out.teams.push({ name:typeof g.opponent === 'string' ? g.opponent : side && side.name, kit:side && side.primaryColour, trim:side && side.secondaryColour });
    }
  }
  if (!out.league.length && !out.teams.length && !out.club) return importGeneric(doc, href);
  if (!out.club && ref && ref.folder) out.club = { name:importGeneric(doc, href).club?.name || ref.folder.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) };
  return out;
}
/* A Pitchero link: /clubs/{folder}[/teams/{teamId}[/{tab}]], or /teams/{teamId} on a club's own domain. A locale
   prefix (/en_GB/clubs/...) is dropped. */
function importPitcheroRef(href) {
  let u; try { u = new URL(href); } catch (e) { return null; }
  const path = u.pathname.replace(/^\/[a-z]{2}_[a-z]{2}(?=\/)/i, '');
  let m = path.match(/^\/clubs\/([a-z0-9_-]+)(?:\/teams\/(\d+)(?:\/([a-z-]+))?)?/i);
  if (m) return { base:u.origin + '/clubs/' + m[1], folder:m[1].toLowerCase(), team:m[2] || null, tab:m[3] || null };
  m = path.match(/^\/teams\/(\d+)(?:\/([a-z-]+))?/i);
  return { base:u.origin, folder:null, team:m ? m[1] : null, tab:m ? m[2] || null : null };
}
const importPitcheroShape = doc => doc.blobs.some(b => b.id === '__NEXT_DATA__' && b.json.props && b.json.props.club && typeof b.json.props.club === 'object' && 'folder' in b.json.props.club && 'colours' in b.json.props.club);
/* The pages worth one more request when the first had no league: the team's league table, then its fixtures. From a
   club's home page, the first team with a league table tab (its 1st XV, as a rule), else the first with fixtures. */
function importPitcheroNext(html, href) {
  const ref = importPitcheroRef(href); if (!ref) return [];
  const nd = (importDoc(html).blobs.find(b => b.id === '__NEXT_DATA__') || {}).json || {};
  const club = nd.props && nd.props.club || {};
  const teams = (Array.isArray(club.sections) ? club.sections : []).flatMap(s => s && Array.isArray(s.teams) ? s.teams : []).filter(t => t && t.id != null);
  const tabs = t => Array.isArray(t.navigationItems) ? t.navigationItems : [];
  let team = ref.team;
  if (!team) { const t = teams.find(x => tabs(x).includes('league_table')) || teams.find(x => tabs(x).includes('fixtures')); if (t) team = String(t.id); }
  if (!team || !/^\d{1,12}$/.test(team)) return [];
  const here = importUrl(href);
  return [['league', '/league-table'], ['fixtures', '/fixtures-results']].map(([kind, tab]) => ({ kind, href:ref.base + '/teams/' + team + tab })).filter(s => importUrl(s.href) !== here);
}
function importGenericNext(html, href) {
  const doc = importDoc(html), out = [];
  for (const [kind, re] of [['league', /standings|league[\s_-]*tables?|\btables?\b|ladder/i], ['fixtures', /fixtures|schedule|matches|results/i]]) {
    for (const l of doc.links) {
      let abs; try { abs = new URL(l.href, href).href; } catch (e) { continue; }
      if (re.test(l.text + ' ' + l.href) && importUrl(abs) && importUrl(abs) !== importUrl(href)) { out.push({ kind, href:importUrl(abs) }); break; }
    }
  }
  return out;
}
/* One entry a source: how to spot its pages, its parser, the pause between requests to it (Pitchero's robots.txt asks
   for 5 seconds) and the pages it may read next. Checked in order; generic takes anything. */
const IMPORT_SOURCES = [
  { id:'pitchero', test:(href, doc) => /(^|\.)pitchero\.com$/.test(importHost(href)) || importPitcheroShape(doc), parse:importPitchero, gap:5000, next:importPitcheroNext },
  { id:'generic', test:() => true, parse:importGeneric, gap:1000, next:importGenericNext },
];
function importHost(href) { try { return new URL(href).hostname; } catch (e) { return ''; } }

/* ---------- the parse result ---------- */
/* What leaves a parser, and nothing else: { source, club:{ name, kit, trim } | null, teams:[{ name, kit, trim }],
   league:[{ name, played, won, drawn, lost, points, kit, trim, own? }] }. club is the page's own club. league is its
   standings table in order, with own:true on the club's row. teams are the other sides it names (fixture opponents,
   tournament entrants), not the club's own sides. A colour is #rrggbb or null, a number an integer or null. */
function importSafe(source, raw, href) {
  let club = null;
  const name = raw.club ? importName(raw.club.name) : '';
  if (name) { const [kit, trim] = importPair(raw.club.kit, raw.club.trim); club = { name, kit, trim }; }
  const own = n => !!club && importSame(n, club.name);
  const league = [], seen = new Set();
  for (const r of raw.league || []) {
    const n = importName(r && r.name), k = importKey(n);
    if (!n || seen.has(k)) continue;
    seen.add(k);
    const [kit, trim] = importPair(r.kit, r.trim), row = { name:n };
    for (const s of IMPORT_STATS) row[s] = importNum(r[s]);
    Object.assign(row, { kit, trim });
    if (r.own === true || own(n)) row.own = true;
    league.push(row);
    if (league.length >= IMPORT_MAX_ROWS) break;
  }
  const teams = [], tseen = new Set();
  for (const t of raw.teams || []) {
    const n = importName(t && t.name), k = importKey(n);
    if (!n || own(n) || tseen.has(k) || league.some(r => r.own && importSame(r.name, n))) continue;
    tseen.add(k);
    const [kit, trim] = importPair(t.kit, t.trim);
    teams.push({ name:n, kit, trim });
    if (teams.length >= IMPORT_MAX_ROWS) break;
  }
  return { source, club, teams, league };
}
/* A link someone pasted, made safe to request: http or https only (sent as https), a real host name (no IP address,
   localhost or local network name, no login, no odd port), no fragment and no tracking parameters. A link inside a
   shared message is found. Anything else is null. */
function importUrl(text) {
  if (typeof text !== 'string') return null;
  let s = text.trim();
  if (!s || s.length > 2048) return null;
  const found = s.match(/(?:^|[\s(<"'])(https?:\/\/[^\s<>"')]+)/i);   // a link inside a shared message, never one inside another scheme (blob:https://...)
  if (found) s = found[1];
  else if (/\s/.test(s)) return null;
  else if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^[a-z0-9.-]+:\d+(?:[/?#]|$)/i.test(s)) return null;   // another scheme: javascript:, data:, file:, mailto:
  else s = 'https://' + s.replace(/^\/+/, '');
  let u; try { u = new URL(s); } catch (e) { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (u.username || u.password || (u.port && u.port !== '80' && u.port !== '443')) return null;
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/.test(host) || /(?:^|\.)(?:localhost|local|internal|lan|home|test|invalid|example)$/.test(host)) return null;
  u.protocol = 'https:'; u.port = ''; u.hash = ''; u.hostname = host;
  for (const k of [...u.searchParams.keys()]) if (/^(?:utm_|fbclid$|gclid$|dclid$|msclkid$|mc_cid$|mc_eid$|igshid$|_ga$|_gl$)/i.test(k)) u.searchParams.delete(k);
  return u.href;
}
/* A page's club, league and other sides. Pure: html and the link in, the result above out. */
function importParse(html, url) {
  const href = importUrl(String(url || '')) || '', doc = importDoc(html);
  const src = IMPORT_SOURCES.find(s => s.test(href, doc));
  return importSafe(src.id, src.parse(doc, href), href);
}
function importMerge(a, b) {
  const teams = [...a.teams];
  for (const t of b.teams) if (teams.length < IMPORT_MAX_ROWS && !teams.some(x => importKey(x.name) === importKey(t.name)) && !(a.club && importSame(t.name, a.club.name))) teams.push(t);
  const league = a.league.some(r => !r.own) || !b.league.length ? a.league : b.league;
  return { source:a.source, club:a.club || b.club, teams, league };
}

/* ---------- fetching, in the app only ---------- */
/* Capacitor's native HTTP when the game runs inside the Try Line app, else null: the web build never fetches. */
function importHttp() {
  const C = typeof window !== 'undefined' ? window.Capacitor : null;
  try { if (!C || typeof C.isNativePlatform !== 'function' || !C.isNativePlatform()) return null; } catch (e) { return null; }
  const H = C.Plugins && C.Plugins.CapacitorHttp;
  return H && typeof H.get === 'function' ? H : null;
}
/* The pasted page, then, while it has no league, its league table and then its fixtures: at most three requests,
   all to the pasted page's site, a pause between them, each with a timeout. Only the User-Agent header names the
   game; nothing about the player or the device is sent. opts.sleep, opts.gap and opts.timeout are for the tests. */
async function importFetch(url, opts = {}) {
  const href = importUrl(url);
  if (!href) return { ok:false, error:'url', requests:0 };
  const http = importHttp();
  if (!http) return { ok:false, error:'web', requests:0 };
  const sleep = opts.sleep || (ms => new Promise(r => setTimeout(r, ms)));
  const timeout = opts.timeout ?? IMPORT_TIMEOUT;
  let requests = 0;
  const get = async (u, gap) => {
    if (requests >= IMPORT_MAX_REQUESTS) throw Error('budget');
    if (requests && gap) await sleep(gap);
    requests++;
    let timer = 0;
    try {
      const res = await Promise.race([
        http.get({ url:u, headers:{ 'User-Agent':IMPORT_UA, Accept:'text/html,application/json' }, responseType:'text', connectTimeout:timeout, readTimeout:timeout }),
        new Promise((_, no) => { timer = setTimeout(() => no(Error('timeout')), timeout); }),
      ]);
      if (!res || !(res.status >= 200 && res.status < 300)) throw Error('net');
      let body = res.data;
      if (body && typeof body === 'object') body = '<script type="application/json">' + JSON.stringify(body).replace(/</g, '\\u003c') + '</script>';
      return { html:String(body || '').slice(0, IMPORT_MAX_HTML), href:importUrl(typeof res.url === 'string' ? res.url : '') || u };
    } finally { clearTimeout(timer); }
  };
  try {
    const first = await get(href, 0);
    let data = importParse(first.html, first.href);
    const src = IMPORT_SOURCES.find(s => s.id === data.source), host = importHost(first.href);
    for (const step of src.next(first.html, first.href)) {
      if (requests >= IMPORT_MAX_REQUESTS || data.league.some(r => !r.own)) break;
      if (step.kind === 'fixtures' && data.teams.length) continue;
      if (importHost(step.href) !== host) continue;
      try { const page = await get(step.href, opts.gap ?? src.gap); data = importMerge(data, importParse(page.html, page.href)); } catch (e) { /* a missing tab: the first page stands */ }
    }
    return { ok:true, data, requests };
  } catch (e) { return { ok:false, error:e && e.message === 'timeout' ? 'timeout' : 'net', requests }; }
}

/* ---------- saving ---------- */
/* The league as saved: the table's other sides (the club's own row left out), else the fixture opponents, at most 16.
   Ratings are made up, as the built-in clubs' are: a table's leader totals 14 (a team you make, spent in full) and its
   foot 10; fixture opponents, with no table to go on, 11 to 13 by name. Colours are the page's where it gave them,
   else a shirt and trim picked from KIT_COLOURS by the name, so a side keeps its colours from one import to the next.
   Codes skip every built-in side's and your teams'. */
function importSides(data) {
  if (!data) return [];
  const table = data.league || [], rows = table.filter(r => !r.own), fromTable = rows.length > 0;
  const used = new Set([...ALL_TEAMS, ...custom].map(t => t.id));
  return (fromTable ? rows : data.teams || []).slice(0, IMPORT_MAX_SIDES).map(t => {
    const name = importShort(t.name), h = importHash(name), id = importCode(name, used);
    used.add(id);
    const total = fromTable ? Math.round(14 - 4*table.indexOf(t)/Math.max(1, table.length - 1)) : 11 + h % 3;
    const side = { key:'lg-' + id, id, name, ...importColours(t, h) };
    importSpread(side, total, h);
    return cleanSide(side);
  }).filter(Boolean);
}
function importColours(t, h) {
  if (t.kit) return { kit:t.kit, trim:t.trim || importContrast(t.kit), hoops:false };
  const n = KIT_COLOURS.length, kit = KIT_COLOURS[h % n][1];
  for (let j = 0; j < n; j++) { const trim = KIT_COLOURS[((h >>> 8) + j) % n][1]; if (colorDist(kit, trim) >= 150) return { kit, trim, hoops:(h >>> 16) % 4 === 0 }; }
  return { kit, trim:importContrast(kit), hoops:false };
}
function importSpread(t, total, h) {
  const base = Math.floor(total/4), extra = total % 4, start = h % 4;
  ABILITIES.forEach(([k], i) => { t[k] = clamp(base + ((i - start + 4) % 4 < extra ? 1 : 0), 1, 5); });
}
function importCode(name, used) {
  const L = String(name).toUpperCase().replace(/[^A-Z]/g, '') || 'LGE', AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let j = 1; j < L.length; j++) for (let k = j + 1; k < L.length; k++) { const c = L[0] + L[j] + L[k]; if (!used.has(c)) return c; }
  for (const a of AZ) for (const b of AZ) { const c = L[0] + a + b; if (!used.has(c)) return c; }
  return 'XXX';
}
/* A saved league, read back: each side through cleanSide, a name that fits a card and passes importName, a code no
   built-in side uses and no other side in it, at most 16. Anything broken is dropped; an empty league is null. */
function cleanImportLeague(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v) || !Array.isArray(v.teams)) return null;
  const teams = [], ids = new Set(ALL_TEAMS.map(t => t.id));
  for (const raw of v.teams.slice(0, 64)) {
    const t = cleanSide(raw), name = t && importName(t.name);
    if (!name) continue;
    t.name = importShort(name);
    delete t.home; delete t.custom;
    if (ids.has(t.id)) t.id = importCode(t.name, ids);
    ids.add(t.id);
    t.key = 'lg-' + t.id;
    teams.push(t);
    if (teams.length >= IMPORT_MAX_SIDES) break;
  }
  return teams.length ? { teams } : null;
}
/* Save: the club joins your teams through cleanTeam, unless one of yours already has its name (re-importing keeps your
   edits), with pace and handling at 4 and power and kicking at 3, the whole budget spent evenly, and the colours
   picked. Its league replaces any saved before; an import with no league leaves the old one. */
function importSave(data, draft) {
  let club = null, added = false;
  if (data.club) {
    const name = importShort(data.club.name);
    club = custom.find(t => importKey(t.name) === importKey(name)) || null;
    if (!club && custom.length < MAX_CUSTOM) {
      club = cleanTeam({ key:'imp' + Date.now().toString(36), id:autoCode(name), name, kit:draft.kit, trim:draft.trim, hoops:false, pace:4, power:3, handling:4, kicking:3 }, custom.length);
      custom.push(club); added = true;
    }
  }
  const sides = importSides(data);
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
function importCard() { return `<button class="team create" id="t-import"><span class="plus link" aria-hidden="true"></span><span class="tname">Import Club</span></button>`; }
function importBind() {
  $('t-league').hidden = !importLeague;
  const b = $('t-import'); if (b) b.addEventListener('click', importOpen);
}

/* ---------- the Import Club card ----------
   web: the app is needed. link: paste, then Import (a grown-up check first). busy: fetching. preview: the club, its
   colours and the league's size, then Save. The card hides while the grown-up check is up, so the two never stack. */
let importUi = { step:'link', data:null, draft:null, pick:false, err:'', armed:false, token:0 };
const importCanPaste = () => typeof navigator !== 'undefined' && !!navigator.clipboard && typeof navigator.clipboard.readText === 'function';
function importOpen() {
  importUi = { step:importHttp() ? 'link' : 'web', data:null, draft:null, pick:false, err:'', armed:false, token:importUi.token + 1 };
  $('im-url').value = '';
  importRender();
  $('m-import').hidden = false;
}
function importClose() { importUi.token++; $('m-import').hidden = true; renderTeams(); }
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
  const href = importUrl($('im-url').value);
  if (!href) { u.err = IMPORT_MSG.url; importRender(); return; }
  if (!importHttp()) { u.step = 'web'; importRender(); return; }
  const token = ++u.token;
  $('m-import').hidden = true;
  importGate(() => { if (token === importUi.token) importRun(href, token); }, () => { if (token === importUi.token) $('m-import').hidden = false; });
}
async function importRun(href, token, opts) {
  const u = importUi;
  u.step = 'busy'; u.err = ''; importRender(); $('m-import').hidden = false;
  const r = await importFetch(href, opts);
  if (token !== importUi.token) return;                   // closed, or another link, while it fetched
  const empty = r.ok && !r.data.club && !importSides(r.data).length;
  if (!r.ok || empty) { u.step = 'link'; u.err = IMPORT_MSG[empty ? 'empty' : r.error] || IMPORT_MSG.net; importRender(); return; }
  const c = r.data.club;
  u.data = r.data; u.pick = !!c && !c.kit;
  u.draft = c ? { kit:c.kit || '#2050b0', trim:c.trim || importContrast(c.kit || '#2050b0'), hoops:false } : null;
  u.step = 'preview'; importRender();
}
function importCommit() {
  const u = importUi; if (u.step !== 'preview' || !u.data) return;
  const res = importSave(u.data, u.draft || {});
  if (res.added) {                                         // as Save Team: a club made from Quick Match or Player 1's pick is the one played as
    if (pickMode === 'quick' && quickAuto) { quickPick = res.club; quickAuto = false; }
    else if (pickMode === 'two' && twoSel.picking === 0) { twoSel.teams[0] = res.club; twoSel.picking = 1; }
  }
  importClose();
  if (res.sides) { settings.pool = IMPORT_POOL; renderTeams(); $('s-teams').scrollTop = 0; }   // straight to the new league, from the top
}
function importRender() {
  const u = importUi, s = u.step, web = s === 'web', busy = s === 'busy', pre = s === 'preview';
  const c = pre && u.data.club, sides = pre ? importSides(u.data) : [], n = sides.length;
  $('im-title').textContent = web ? 'Import Works in the Try Line App' : pre ? (c ? importShort(c.name) : 'My League') : 'Paste Your Link';
  $('im-line').hidden = !web;
  $('im-field').hidden = web || pre;
  $('im-url').disabled = busy;
  $('im-paste').hidden = !importCanPaste(); $('im-paste').disabled = busy;
  $('im-err').hidden = !u.err || pre; $('im-err').textContent = u.err;
  $('im-jersey').hidden = !c; $('im-jersey').innerHTML = c ? jersey(u.draft) : '';
  $('im-league').hidden = !n;
  $('im-league').innerHTML = n ? sides.slice(0, 12).map(t => jersey(t, 'mini')).join('') + `<span class="lbl">My League · ${n} Teams</span>` : '';
  $('im-cols').hidden = !(c && u.pick);
  for (const [id, key] of [['im-kit', 'kit'], ['im-trim', 'trim']]) for (const b of $(id).querySelectorAll('.sw')) b.setAttribute('aria-pressed', String(!!u.draft && b.dataset.c === u.draft[key]));
  $('im-go').hidden = web; $('im-go').disabled = busy;
  $('im-go').textContent = busy ? 'Importing' : pre ? (c ? 'Save Club' : 'Save League') : 'Import';
  const alt = pre ? 'Change Link' : importLeague && !busy ? (u.armed ? 'Confirm Remove' : 'Remove League') : '';
  $('im-alt').hidden = !alt; $('im-alt').textContent = alt; $('im-alt').classList.toggle('warn', !pre);
  $('im-row').classList.toggle('one', !alt);
}
function importAlt() {
  const u = importUi;
  if (u.step === 'preview') { u.step = 'link'; u.data = null; u.err = ''; u.token++; importRender(); return; }
  if (!importLeague) return;
  if (!u.armed) { u.armed = true; importRender(); return; }
  importLeague = null; u.armed = false;
  if (settings.pool === IMPORT_POOL) settings.pool = 1;
  save(); importRender();
}
for (const [id, key] of [['im-kit', 'kit'], ['im-trim', 'trim']]) {
  $(id).innerHTML = KIT_COLOURS.map(([n, h]) => `<button class="sw" style="--k:${h}" data-c="${h}" aria-label="${n}"></button>`).join('');
  for (const b of $(id).querySelectorAll('.sw')) b.addEventListener('click', () => { if (importUi.draft) { importUi.draft[key] = b.dataset.c; importRender(); } });
}
$('im-go').addEventListener('click', importGo);
$('im-alt').addEventListener('click', importAlt);
$('im-back').addEventListener('click', importClose);
$('im-url').addEventListener('input', () => { if (importUi.err) { importUi.err = ''; importRender(); } });
$('im-url').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); importGo(); } });
$('im-paste').addEventListener('click', async () => {
  try { const t = await navigator.clipboard.readText(); if (t) { $('im-url').value = t.trim().slice(0, 2048); importUi.err = ''; importRender(); } } catch (e) { /* refused or empty */ }
});
