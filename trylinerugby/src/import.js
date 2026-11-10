/* =========================================================
   Import: paste a Pitchero or tournament link and the game builds your club and its league.

   Three parts, kept apart:
   - importUrl and importParse: text in, plain data out. No DOM, no network. Each source is one adapter in
     IMPORT_SOURCES, reading the page through importDoc (its JSON scripts, meta tags, tables and links).
   - importFetch: the Try Line app only, through Capacitor's native HTTP. The pasted page, then at most two pages it
     links to on the same site (a league table, then fixtures): three requests in all, a plain "TryLineRugby"
     User-Agent and nothing else about the device. The web build never fetches. Pitchero sends no CORS header, so a
     browser on another site could not read its pages anyway.
   - Add Your Team: the team screen's card and the home's button, their card (#m-import), and the My League list.

   Safeguarding. Only club and team names, shirt colours and table numbers ever leave a parser. The Pitchero adapter
   reads named fields only (the club's name and colours, the table's team cells and numbers, each fixture's
   opponent). Anything that walks a page skips every subtree under a key that can hold people (IMPORT_SKIP), reads a
   table of rows only under a key that names a standings table (IMPORT_TABLE_KEY), and takes a club's name from a page
   title only when it says it is a club. Every name passes importName, which drops anything that looks like a person,
   an email, a phone number or a link. The structure does the work: the first-name list in importPersonal is a last
   net, not the defence. Nothing about a person, the link itself or the page is kept.
   ========================================================= */
const IMPORT_POOL = 'my';                        // My League: settings.pool's key for it, the team screen's Local list after Surrey
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
  full:'Delete a team to make room for this club.',
};

/* ---------- what the parsers look for: data, so a new page shape is a table edit ---------- */
/* Keys whose whole subtree can hold people or their pictures: never walked. */
const IMPORT_SKIP = /^(?:players?|squads?|members?|membership|staff|officials?|coach(?:es)?|managers?|captains?|contacts?|contactpoint|authors?|users?|profiles?|people|persons?|athletes?|employees?|founders?|scorers?|try_?scorers?|lineups?|team_?sheets?|motm|man_?of_?the_?match|player_?of_?the_?match|comments?|reports?|match_?reports?|news|articles?|posts?|blogs?|galler(?:y|ies)|photos?|images?|image_?url|avatars?|logos?|crests?|emails?|phones?|telephone|mobile|address(?:es)?|welfare|committee|officers?|volunteers?|parents?|guardians?|statistics|leaders|leaderboards?|rankings?|individuals?|awards?|sponsors?|videos?|media|socials?|social_?links)$/i;
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
/* The only keys a JSON table of rows is read under, letters only and lower case (leagueTable, league_table): a
   standings table names itself. A leaderboard, a ranking or a list of records is a list of people, and is never read. */
const IMPORT_TABLE_KEY = /^(?:(?:league|pool|group|division|competition|conference)?(?:standings?|tables?|ladders?|positions)|(?:league|pool|group|division|competition|conference|standings?|table)?rows|leagues?|teams|clubs)$/;
/* A page title or og:title names the club only in a part that says it is one: Arlo Smith's page is never a club. */
const IMPORT_TITLE_CLUB = /\b(?:r\.?u?\.?f\.?c|rugby|club|f\.?c)\b/i;
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
/* Each <...> as a space, in one pass: from a '<' with no '>' after it nothing more is a tag, so the rest is kept as it
   stands (as /<[^>]*>/g would, without rescanning to the end from every later '<'). */
function importUntag(s) {
  let out = '', i = 0;
  for (;;) {
    const lt = s.indexOf('<', i); if (lt < 0) break;
    const gt = s.indexOf('>', lt + 1); if (gt < 0) break;
    out += s.slice(i, lt) + ' '; i = gt + 1;
  }
  return out + s.slice(i);
}
function importText(h) {
  return importUntag(String(h).replace(/<br\s*\/?>/gi, ' '))
    .replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi, (m, e) => e[0] === '#' ? importChar(/x/i.test(e[1]) ? parseInt(e.slice(2), 16) : +e.slice(1)) : (IMPORT_ENT[e.toLowerCase()] ?? m))
    .replace(/\s+/g, ' ').trim();
}
const importLabel = s => { const w = String(s).toLowerCase().split(/[\s/]+/).filter(Boolean); return w.length > 0 && w.every(x => IMPORT_LABEL.test(x)); };
/* A club or team name as it may be shown, or '' for anything that is not one. */
function importName(v) {
  if ((typeof v !== 'string' && typeof v !== 'number') || String(v).length > 500) return '';   // no name is that long, and the checks below stay cheap
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
/* Shortened to fit a team card: the rugby suffix goes first, then whole words from the end. A word that only leads into the name (Old, St, Bishop's) is
   no name by itself and doesn't end one, so where whole words would leave that the name keeps its letters up to the limit: Old Wimbledonian, not Old. */
const IMPORT_LEADING = /^(?:old|st|st\.|saint|the|new|royal|north|south|east|west|upper|lower|great|little|port|mount|\p{L}+['\u2019]s)$/iu;
function importShort(name, max = 16) {
  let s = String(name || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const bare = s.replace(IMPORT_SUFFIX, '').trim();
  if (bare.length <= max && bare.length >= 3) return bare;
  if (bare.length >= 3) s = bare;
  const cut = s.slice(0, max + 1), sp = cut.lastIndexOf(' ');
  const out = (sp >= 3 ? cut.slice(0, sp) : s.slice(0, max)).trim();
  const words = out.replace(/(?:\s+(?:&|and|of|the|on|in|at|-))+$/i, '').trim().split(' ');   // never ends on a joining word
  while (words.length > 1 && IMPORT_LEADING.test(words[words.length - 1])) words.pop();
  return words.length === 1 && IMPORT_LEADING.test(words[0]) ? s.slice(0, max).trim() : words.join(' ');
}
/* A name for a card that no side already in the league has (taken holds their importKeys), or '' to leave the side
   out. Where shortening makes two sides the same (Sevenoaks Minis A and B, Tunbridge Wells and Tunbridge Wells II), a
   side whose name ends in a label keeps it, the words in front shortened instead (Sevenoaks A, Sevenoaks B, Tunbridge
   II): first when label says its short name is shared, else when the short name is taken. Never with no real word in
   front (Old II). */
function importFit(name, taken, label) {
  const s = importShort(name), w = String(name || '').replace(/\s+/g, ' ').trim().split(' '), tail = w.length > 1 ? w[w.length - 1] : '';
  let kept = '';
  if (tail && tail.length <= 6 && (IMPORT_LABEL.test(tail) || /^[ivx]{1,4}$/i.test(tail))) {
    const head = importShort(w.slice(0, -1).join(' '), 16 - tail.length - 1);
    if (/\p{L}{4}/u.test(head) && (w.slice(0, -1).join(' ') + ' ').startsWith(head + ' ')) kept = head + ' ' + tail;   // whole words in front, or not at all
  }
  for (const c of label ? [kept, s] : [s, kept]) if (c && !taken.has(importKey(c))) return c;
  return '';
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
/* The JSON value opening at s[i] ({ or [), as text, or ''. room.left is what one page may scan in all, shared by
   every call for it, so blobs inside blobs cost no more than the page itself. */
function importBalanced(s, i, room) {
  if (s[i] !== '{' && s[i] !== '[') return '';
  let depth = 0, str = false;
  for (let j = i; j < s.length; j++) {
    if (room.left-- <= 0) return '';
    const c = s[j];
    if (str) { if (c === '\\') j++; else if (c === '"') str = false; continue; }
    if (c === '"') str = true;
    else if (c === '{' || c === '[') depth++;
    else if ((c === '}' || c === ']') && --depth === 0) return s.slice(i, j + 1);
  }
  return '';
}
/* Each <tag ...> in s as its attributes, in one pass: a tag with no '>' after it ends the search (no later one can
   close either), rather than rescanning the page from every later start. */
function importTags(s, tag, max) {
  const out = [], open = new RegExp('<' + tag + '\\b', 'gi');
  while (out.length < max && open.exec(s)) {
    const gt = s.indexOf('>', open.lastIndex); if (gt < 0) break;
    out.push(s.slice(open.lastIndex, gt));
    open.lastIndex = gt + 1;
  }
  return out;
}
/* Each <tag ...>...</tag> in s as [attributes, inner], in one pass in the same way: a tag left open or a missing close
   ends the search, so no page, however broken, can stall the import. */
function importBlocks(s, low, tag, max) {
  const out = [], open = new RegExp('<' + tag + '\\b', 'gi'), close = '</' + tag;
  while (out.length < max && open.exec(s)) {
    const gt = s.indexOf('>', open.lastIndex); if (gt < 0) break;
    const end = low.indexOf(close, gt + 1); if (end < 0) break;
    out.push([s.slice(open.lastIndex, gt), s.slice(gt + 1, end)]);
    open.lastIndex = end + close.length;
  }
  return out;
}
/* A table's rows, each as the text after its <tr ...> up to the next row or </tr>, in one pass. */
function importRows(inner, max) {
  const out = [], open = /<tr\b/gi;
  let m = open.exec(inner);
  while (m && out.length < max) {
    const gt = inner.indexOf('>', open.lastIndex); if (gt < 0) break;
    open.lastIndex = gt + 1;
    const next = open.exec(inner), body = inner.slice(gt + 1, next ? next.index : inner.length), e = body.search(/<\/tr\b/i);
    out.push(e < 0 ? body : body.slice(0, e));
    m = next;
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
  const doc = { blobs:[], ld:[], meta:{}, title:'', tables:[], links:[] }, room = { left:IMPORT_MAX_HTML };
  const blob = (id, json) => { if (json && doc.blobs.length < 200) doc.blobs.push({ id, json }); };
  /* Each JSON value after a match of re in body, the search going on after the value, so a blob that holds more of the
     same is read once, never again from each match inside it. A broken one ends the search. */
  const values = (body, re, fn) => {
    let m;
    while ((m = re.exec(body))) {
      const at = m.index + m[0].length, text = importBalanced(body, at, room); if (!text) break;
      fn(text); re.lastIndex = at + text.length;
    }
  };
  for (const [attrs, inner] of importBlocks(src, low, 'script', 600)) {
    const a = importAttrs(attrs), type = (a.type || '').toLowerCase(), body = inner.trim();
    if (type === 'application/ld+json') { const j = importJson(body); if (j && doc.ld.length < 20) doc.ld.push(j); continue; }
    if (a.id === '__NEXT_DATA__' || type === 'application/json') { blob(a.id || 'json', importJson(body)); continue; }
    let flight = '';
    values(body, /self\.__next_f\.push\(/g, text => { const arr = importJson(text); if (Array.isArray(arr) && typeof arr[1] === 'string') flight += arr[1]; });
    for (const line of flight.split('\n')) { const p = line.indexOf(':'); if (p > 0 && /^[[{]/.test(line.slice(p + 1))) blob('flight', importJson(line.slice(p + 1))); }
    values(body, /(?:window|self)\.__[A-Za-z_]+__\s*=\s*(?=[{[])/g, text => blob('state', importJson(text)));
  }
  const page = importStrip(src, low), plow = importLow(page);
  for (const attrs of importTags(page, 'meta', 400)) {
    const a = importAttrs(attrs), k = (a.property || a.name || '').toLowerCase();
    if (k && a.content && !(k in doc.meta)) doc.meta[k] = a.content;
  }
  const t = importBlocks(page, plow, 'title', 1)[0]; if (t) doc.title = importText(t[1].slice(0, 1000));   // a title is a line, not a page
  for (const [, inner] of importBlocks(page, plow, 'table', 40)) {
    const rows = [];
    for (const r of importRows(inner, 201)) {
      const cells = [];
      for (const part of r.split(/(?=<t[hd]\b)/i).slice(0, 60)) {
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
/* Every object and array under a JSON value, depth first, skipping any subtree under a person key. visit gets the
   value, its key, and its nearest key that is not a number (tables:{ 3100:[...] } is under tables). */
function importWalk(root, visit) {
  const stack = [[root, '', 0, '']];
  let n = 0;
  while (stack.length && n++ < 100000) {
    const [v, key, depth, named] = stack.pop();
    if (!v || typeof v !== 'object' || depth > 40 || IMPORT_SKIP.test(key)) continue;
    visit(v, key, named);
    const entries = Array.isArray(v) ? v.map((c, i) => [String(i), c]) : Object.entries(v);
    for (let i = entries.length - 1; i >= 0; i--) {
      const [k, c] = entries[i];
      if (c && typeof c === 'object') stack.push([c, k, depth + 1, /^\d+$/.test(k) ? named : k]);
    }
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
/* What a JSON tree offers: standings tables (only under a key that names one), fixture opponents and club objects
   with colours. */
function importScan(json, out) {
  importWalk(json, (v, key, named) => {
    if (Array.isArray(v)) {
      if (v.length >= 2 && v.length <= 200 && IMPORT_TABLE_KEY.test(named.toLowerCase().replace(/[^a-z]/g, ''))) {
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
/* The club a page names: a club object in its JSON, a JSON-LD sports team, og:site_name, then the part of og:title or
   the title that says it is a club (Riverside RFC in "U16 Spring Cup | Riverside RFC"). A title with no club word is
   no club: on a person's page it is that person's name. Nor is any title read on a page whose path is about people. */
function importClubName(doc, href, extra) {
  let path = ''; try { path = new URL(href).pathname; } catch (e) { /* no link */ }
  const personal = /\/[\w-]*(?:players?|profiles?|people|persons?|staff|members?|contacts?|officials?|coach(?:es)?|users?|squads?|athletes?)[\w-]*(?:\/|$)/i.test(path);
  const seg = t => String(t || '').slice(0, 300).split(/\s+[|\-\u2013\u2014\u00b7:]+\s+/).map(s => s.trim()).find(p => IMPORT_TITLE_CLUB.test(p)) || '';
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
   club's home page, the first team with a league table tab (its 1st XV, as a rule), else the first with fixtures.
   Each source's next reads the page as importDoc already read it, so no page is read twice. */
function importPitcheroNext(doc, href) {
  const ref = importPitcheroRef(href); if (!ref) return [];
  const nd = (doc.blobs.find(b => b.id === '__NEXT_DATA__') || {}).json || {};
  const club = nd.props && nd.props.club || {};
  const teams = (Array.isArray(club.sections) ? club.sections : []).flatMap(s => s && Array.isArray(s.teams) ? s.teams : []).filter(t => t && t.id != null);
  const tabs = t => Array.isArray(t.navigationItems) ? t.navigationItems : [];
  let team = ref.team;
  if (!team) { const t = teams.find(x => tabs(x).includes('league_table')) || teams.find(x => tabs(x).includes('fixtures')); if (t) team = String(t.id); }
  if (!team || !/^\d{1,12}$/.test(team)) return [];
  const here = importUrl(href);
  return [['league', '/league-table'], ['fixtures', '/fixtures-results']].map(([kind, tab]) => ({ kind, href:ref.base + '/teams/' + team + tab })).filter(s => importUrl(s.href) !== here);
}
function importGenericNext(doc, href) {
  const out = [];
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
function importParse(html, url) { return importRead(importDoc(html), url); }
function importRead(doc, url) {
  const href = importUrl(String(url || '')) || '';
  const src = IMPORT_SOURCES.find(s => s.test(href, doc)), out = importSafe(src.id, src.parse(doc, href), href);
  const label = [doc.meta && doc.meta['og:title'], doc.title].flatMap(t => String(t || '').slice(0, 300).split(/\s+[|\-\u2013\u2014\u00b7:]+\s+/)).map(s => s.trim()).find(s => s && importLabel(s));
  if (label) out.label = label;                            // only ever a label's own words: U10s, Ladies
  const level = importLevelFrom([doc.meta && doc.meta['og:title'], doc.title, ...importDivisions(doc)]);
  if (level) out.level = level;                            // only ever a level's id, not the page's words
  return out;
}
/* The league's name on a Pitchero page, for the level: the fixtures' division, the competitions, a table's own name. */
function importDivisions(doc) {
  const out = [];
  for (const b of doc.blobs || []) {
    const st = b.id === '__NEXT_DATA__' && b.json.props && b.json.props.initialReduxState && b.json.props.initialReduxState.teams; if (!st) continue;
    importWalk([st.fixtures, st.leagueTable], v => { for (const k of ['division', 'name', 'competition', 'league', 'title']) if (!Array.isArray(v) && typeof v[k] === 'string' && out.length < 400) out.push(v[k]); });
  }
  return out;
}
function importMerge(a, b) {
  const teams = [...a.teams];
  for (const t of b.teams) if (teams.length < IMPORT_MAX_ROWS && !teams.some(x => importKey(x.name) === importKey(t.name)) && !(a.club && importSame(t.name, a.club.name))) teams.push(t);
  const league = a.league.some(r => !r.own) || !b.league.length ? a.league : b.league;
  const out = { source:a.source, club:a.club || b.club, teams, league }, label = a.label || b.label, level = a.level || b.level;
  if (label) out.label = label;
  if (level) out.level = level;
  return out;
}

/* ---------- fetching, in the app only ---------- */
/* Capacitor's native HTTP when the game runs inside the Try Line app, else null: the web build never fetches. */
function importHttp() {
  const C = typeof window !== 'undefined' ? window.Capacitor : null;
  try { if (!C || typeof C.isNativePlatform !== 'function' || !C.isNativePlatform()) return null; } catch (e) { return null; }
  const H = C.Plugins && C.Plugins.CapacitorHttp;
  return H && typeof H.get === 'function' ? H : null;
}
/* A response header, whatever case the platform gives its name in. */
function importHeader(headers, name) {
  if (!headers || typeof headers !== 'object') return '';
  for (const [k, v] of Object.entries(headers)) if (k.toLowerCase() === name) return typeof v === 'string' ? v : Array.isArray(v) && typeof v[0] === 'string' ? v[0] : '';
  return '';
}
/* The pasted page, then, while it has no league, its league table and then its fixtures: at most three requests,
   all to the pasted page's site, a pause between them, each with a timeout. Only the User-Agent header names the
   game; nothing about the player or the device is sent.
   Redirects are never followed by the platform (disableRedirects): each one is followed here, its Location checked by
   importUrl as a pasted link is (so never an IP address or a local name), and counted as one of the three requests.
   A platform that follows one anyway is held to the same rule: a page whose final address importUrl refuses is a
   failed import, never read as if it came from the link asked for. opts.cancelled() true stops the run before its next
   pause or request (Back while it imports). opts.sleep, opts.gap and opts.timeout are for the tests. */
async function importFetch(url, opts = {}) {
  const href = importUrl(url);
  if (!href) return { ok:false, error:'url', requests:0 };
  const http = importHttp();
  if (!http) return { ok:false, error:'web', requests:0 };
  const sleep = opts.sleep || (ms => new Promise(r => setTimeout(r, ms)));
  const timeout = opts.timeout ?? IMPORT_TIMEOUT;
  const stopped = () => typeof opts.cancelled === 'function' && !!opts.cancelled();
  let requests = 0;
  const one = async u => {
    if (stopped()) throw Error('cancelled');
    if (requests >= IMPORT_MAX_REQUESTS) throw Error('budget');
    requests++;
    let timer = 0;
    try {
      return await Promise.race([
        http.get({ url:u, headers:{ 'User-Agent':IMPORT_UA, Accept:'text/html,application/json' }, responseType:'text', connectTimeout:timeout, readTimeout:timeout, disableRedirects:true }),
        new Promise((_, no) => { timer = setTimeout(() => no(Error('timeout')), timeout); }),
      ]);
    } finally { clearTimeout(timer); }
  };
  const get = async (u, gap) => {
    if (stopped()) throw Error('cancelled');
    if (requests && gap) await sleep(gap);
    for (;;) {
      const res = await one(u);
      if (stopped()) throw Error('cancelled');
      if (!res || typeof res !== 'object') throw Error('net');
      if (res.status >= 300 && res.status < 400) {
        let next = null;
        try { const loc = importHeader(res.headers, 'location'); next = loc ? importUrl(new URL(loc, u).href) : null; } catch (e) { next = null; }
        if (!next) throw Error('net');
        u = next; continue;
      }
      if (!(res.status >= 200 && res.status < 300)) throw Error('net');
      const final = typeof res.url === 'string' && res.url ? importUrl(res.url) : u;
      if (!final) throw Error('net');
      let body = res.data;
      if (body && typeof body === 'object') body = '<script type="application/json">' + JSON.stringify(body).replace(/</g, '\\u003c') + '</script>';
      return { html:String(body || '').slice(0, IMPORT_MAX_HTML), href:final };
    }
  };
  try {
    const first = await get(href, 0), doc = importDoc(first.html);
    let data = importRead(doc, first.href);
    const src = IMPORT_SOURCES.find(s => s.id === data.source), host = importHost(first.href);
    for (const step of src.next(doc, first.href)) {
      if (requests >= IMPORT_MAX_REQUESTS || data.league.some(r => !r.own)) break;
      if (step.kind === 'fixtures' && data.teams.length) continue;
      if (importHost(step.href) !== host) continue;
      try { const page = await get(step.href, opts.gap ?? src.gap); data = importMerge(data, importParse(page.html, page.href)); }
      catch (e) { if (stopped()) throw e; /* a missing tab: the first page stands */ }
    }
    return { ok:true, data, requests };
  } catch (e) { return { ok:false, error:e && (e.message === 'timeout' || e.message === 'cancelled') ? e.message : 'net', requests }; }
}

/* ---------- saving ---------- */
/* The league as saved: the table's other sides (the club's own row left out), else the fixture opponents, at most 16,
   each with a name no other side in it has (importFit). Ratings are made up and count every ability in ABILITIES, at the level
   chosen for the club: a table's leader totals the level's rating and its foot one point an ability less, not under the floor; fixture opponents, with no table to go on,
   fall between the two by name. With nothing chosen and nothing known the level is the best Local club's (importTop), so a league you add sits with the Local list, under the professional lists.
   Colours are the page's where it gave them, else a shirt and trim picked from KIT_COLOURS
   by the name, so a side keeps its colours from one import to the next. Codes skip every built-in side's and yours. */
const importTop = () => Math.max(...CLUBS.filter(t => t.league !== 'English Premiership').map(rateOf));   // Twickenham is a Premiership side: the Local list's own top is Farnham (and Quins), at 61: Regional 1
/* A page's own words for its league, read to a level. The levels between (Counties 4, Counties 2) take the level under them, and so does National
   League (England's third and fourth tiers, between Regional 1 and the Championship): Regional 1, 61, level with England 2's foot and under
   its winners, so no import listed under Local is above an England 2 side. Null when the words say nothing. */
const IMPORT_LEVEL_WORDS = [[/\bcounties\s*[45]\b/, 'c5'], [/\bcounties\s*[23]\b/, 'c3'], [/\bcounties\s*1\b/, 'c1'], [/\bregional\s*2\b/, 'r2'], [/\bregional\s*1\b|\bnational league\b/, 'r1'], [/\bchamp rugby\b|\b(?:rfu|english) championship\b/, 'nat'], [/\b(?:english premiership|premiership rugby|prem rugby|top 14|united rugby championship|super rugby)\b/, 'top']];
function importLevelFrom(texts) {
  for (const t of texts) { const s = String(t || '').toLowerCase().slice(0, 300), hit = IMPORT_LEVEL_WORDS.find(([re]) => re.test(s)); if (hit) return hit[1]; }
  return null;
}
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
   once the career, the championship and the league are all read back: My Team, the career's club and season, and the championship. By
   the key the save has, so a side's new key that was another's old one moves nothing twice. Left as they were, the career's club would
   keep a code a built-in club has now and be taken for that club, off My League (Merton into Counties, Bedford Athletic into England 2). */
function importRecode(moved) {
  if (!moved || !moved.size) return;
  const fix = t => { const id = t && t.key && moved.get(t.key); if (id) { t.id = id; t.key = 'lg-' + id; } };
  if (moved.has(settings.myClub)) settings.myClub = 'lg-' + moved.get(settings.myClub);
  if (career) { fix(career.club); if (career.season) career.season.teams.forEach(fix); }
  if (champ) champ.teams.forEach(fix);
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
/* The team screen's Add Your Team card: beside Create Team while there is room for a team, and kept with four made while a league is
   saved, as the way to refresh it or remove it. In the app it waits until a Super Fan club is on sale (storeOffered). */
const importShown = () => (custom.length < MAX_CUSTOM || !!importLeague) && storeOffered('import');
function importCard() { return importShown() ? `<button class="team create" id="t-import"><span class="plus link" aria-hidden="true"></span><span class="tname">Add Your Team</span></button>` : ''; }
/* The home's Add Your Team, at the top beside My Team: the same card, shown where the team screen's would be (room for a team, or a league to
   refresh or remove, and in the app only once a Super Fan club is on sale), with its lock while Import is locked. */
function importHome() {
  const b = $('b-import'), on = importShown();
  if (b.hidden === on) b.hidden = !on;
  storeMark(b, 'import');
}
$('b-import').addEventListener('click', () => { ac(); importOpen(); });
function importBind() {
  const b = $('t-import'); if (b) b.addEventListener('click', importOpen);
}

/* ---------- the Add Your Team card ----------
   web: the app is needed. link: paste, then Import (a grown-up check first). busy: fetching. preview: the club, its
   colours and the league's size, then Save. mine: a club saved, Make This My Team | Not Now. The card hides while the grown-up
   check is up, so the two never stack. from: 'home' (the home's button) or 'teams' (the team screen's card), where it closes to. */
let importUi = { step:'link', data:null, draft:null, pick:false, err:'', armed:false, token:0, from:'teams', club:null, sides:0 };
const importCanPaste = () => typeof navigator !== 'undefined' && !!navigator.clipboard && typeof navigator.clipboard.readText === 'function';
const importTouch = () => typeof matchMedia === 'function' && !!matchMedia('(pointer: coarse)').matches;
/* The control a step starts on: the link field (on a touch screen Import, so no keyboard springs up over the card),
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
  if (!importHttp()) { u.step = 'web'; importRender(); return; }
  const token = ++u.token;
  $('m-import').hidden = true;
  importGate(() => { if (token === importUi.token) importRun(href, token); }, () => { if (token === importUi.token) { $('m-import').hidden = false; importFocus(); } });
}
async function importRun(href, token, opts) {
  const u = importUi;
  u.step = 'busy'; u.err = ''; u.armed = false; importRender(); $('m-import').hidden = false; importFocus();
  const r = await importFetch(href, { ...opts, cancelled:() => token !== importUi.token });   // Back, or another link: no more requests
  if (token !== importUi.token) return;                   // closed, or another link, while it fetched
  const full = r.ok && !!r.data.club && !importRoom(r.data), data = full ? { ...r.data, club:null } : r.data;   // four teams made: the league can come in, the club can't
  const empty = r.ok && !data.club && !importSides(data).length;
  if (!r.ok || empty) { u.step = 'link'; u.err = IMPORT_MSG[!r.ok ? r.error : full ? 'full' : 'empty'] || IMPORT_MSG.net; importRender(); importFocus(); return; }
  const c = data.club, mine = importMine(data);
  u.data = data; u.pick = !!c && !c.kit && !mine;
  u.level = importLevel(data, mine && mine.level).id;   // preset: your own team's level on a re-import, else what the page says, else the Local list's best
  u.draft = mine ? { kit:mine.kit, trim:mine.trim, hoops:mine.hoops } : c ? { kit:c.kit || '#2050b0', trim:c.trim || importContrast(c.kit || '#2050b0'), hoops:false } : null;
  u.step = 'preview'; importRender(); importFocus();
}
function importCommit() {
  const u = importUi; if (u.step !== 'preview' || !u.data) return;
  const res = importSave(u.data, { ...(u.draft || {}), level:u.level });
  if (res.added && u.from !== 'home') {                    // as Save Team: a club made while Player 1 picks his side is the one played as
    if (pickMode === 'quick' && !quickPick) { quickPick = res.club; teamsOpen = false; }   // on to Pick Opponent, folded, as after a card
    else if (pickMode === 'two' && twoSel.picking === 0) { twoSel.teams[0] = res.club; twoSel.picking = 1; teamsOpen = false; }
  }
  if (res.club && !myIs(res.club)) {                       // a club in: Make This My Team | Not Now
    u.step = 'mine'; u.club = res.club; u.sides = res.sides; u.data = null; u.token++;
    importRender(); importFocus(); return;
  }
  importDone(res.sides);
}
function importDone(sides) {
  importClose();
  if (sides && importUi.from !== 'home') { settings.pool = IMPORT_POOL; teamsOpen = false; renderTeams(); $('s-teams').scrollTop = 0; }   // straight to the new league, from the top, folded as a list picked
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
$('im-paste').addEventListener('click', async () => {
  try { const t = await navigator.clipboard.readText(); if (t) { $('im-url').value = t.trim().slice(0, 2048); importUi.err = ''; importRender(); } } catch (e) { /* refused or empty */ }
});
