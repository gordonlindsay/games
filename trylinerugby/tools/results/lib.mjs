// Developer tooling, never part of the game: the pure half of the weekly results job (tools/results/update.mjs). Parsers for the pages it
// reads, the owner's boost rules, the window, league tables built from results, and the validator that refuses a file. No network, no
// clock (every function takes its dates), no file writes, so tools/results.mjs can pin all of it against saved pages.
// The contract is docs/results-schema.md.

export const UA = 'TryLineRugby';
export const SCHEMA_V = 1;
export const MAX_BYTES = 300*1024;
export const WINDOW_MAX = 7;          // the owner: at most 7 days
export const BIG_WIN = 15;            // the owner: a win by 15 or more
export const MIN_SHARE = 0.9;         // fewer entries than 90% of the last file's: refuse
const PLAIN = /^[^<>\u0000-\u001f\u007f]+$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[A-Z]{3}$/;

/* ---------- dates: every date in the file is a UK date (Europe/London) ---------- */
const UK = new Intl.DateTimeFormat('en-CA', { timeZone:'Europe/London', year:'numeric', month:'2-digit', day:'2-digit' });
export const ukDate = when => UK.format(new Date(when));                  // a time (ms or ISO) to its UK date
export const realDay = s => typeof s === 'string' && DAY.test(s) && new Date(s + 'T12:00:00Z').toISOString().slice(0, 10) === s;
export function addDays(day, n) { const t = new Date(day + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
export const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z'))/864e5);
export const realTime = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().replace('.000', '') === s;
/* The club season a UK date falls in: July to June. */
export const seasonOf = day => { const y = +day.slice(0, 4), m = +day.slice(5, 7), s = m >= 7 ? y : y - 1; return `${s}-${String((s + 1) % 100).padStart(2, '0')}`; };

/* ---------- names ---------- */
const DROP = new Set(['rfc', 'rufc', 'rfu', 'fc', 'rugby', 'football', 'club', 'union', 'the', '1st', 'first', 'xv', 'r', 'u', 'f', 'c', 'men', 'mens', 'i']);
/* A name reduced for exact matching only: lower case, accents, "&" and "and" alike, apostrophes, punctuation, club words and a trailing
   region in brackets ("St Ives (SW)") dropped. Never fuzzy: two names match only when this gives the same string, or an alias says so. */
export function normName(s) {
  const t = String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, '').replace(/['\u2019]/g, '').replace(/&/g, ' and ').replace(/\bst\.?\s/g, 'st ').replace(/[^a-z0-9]+/g, ' ').trim();
  const words = t.split(' ').filter(w => w && !DROP.has(w));
  return words.join(' ');
}
/* A source's team name, cleaned for showing: no bonus-point marks, single spaces, at most 40 characters. */
export const cleanName = s => String(s || '').replace(/\(\s*\d+\s*BP\s*\)/gi, '').replace(/\s+/g, ' ').trim().slice(0, 40);

/* ---------- Pitchero: everything is in the page's __NEXT_DATA__ ---------- */
export function nextData(html) {
  const m = String(html).match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch (e) { return null; }
}
/* The club a page belongs to: { id, name, folder, live, gender, isYouth, teams:[{ id, name, section, nav }] }, or null for a soft 404. Only
   names and ids are read: never squads, staff, contacts or reports. */
export function pitcheroClub(nd) {
  const c = nd && nd.props && nd.props.club;
  if (!c || typeof c !== 'object') return null;
  const teams = [];
  for (const s of c.sections || []) for (const t of s.teams || []) teams.push({ id:+t.id, name:String(t.name || ''), section:String(s.name || ''), nav:(t.navigationItems || []).map(n => n && (n.type || n.key || n.name || n)).filter(x => typeof x === 'string') });
  return { id:c.id, name:String(c.name || ''), folder:String(c.folder || ''), domain:c.externalDomain ? String(c.externalDomain).replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase() : null, live:c.live !== false, gender:c.gender || null, isYouth:!!c.isYouth, sport:c.sport || null, teams };
}
/* The men's first team of a club: its 1st XV by name, in a senior section. */
export function firstXV(club) {
  if (!club) return null;
  const bad = /\b(lad(y|ies)|wom[ae]n|girls?|colts?|u\d+|under|minis?|juniors?|youth|academy|vets?|veterans?|touch|walking|2nd|3rd|4th|second|third|ii\b|iii\b|a xv|b xv)\b/i;
  const good = [/^(men'?s )?1st xv$/i, /^1st xv\b/i, /^first xv\b/i, /\b1st xv\b/i, /^(men'?s )?(1st|first)( team| men)?$/i, /^1xv$/i, /^senior xv$/i, /^men'?s 1st/i];
  for (const re of good) {
    const t = club.teams.find(x => re.test(x.name.trim()) && !bad.test(x.name) && !bad.test(x.section));
    if (t) return t;
  }
  return null;
}
const SEASON_RE = /(\d{4})\s*[-/]\s*(\d{2,4})/;
/* Every season's table on a team's league-table page: [{ teamId, id, name, season ('2026-27' or null), rows:[{ rank, name, p, w, d, l, pf,
   pa, pts, own, url, hf, af }] }], oldest first, as the page gives them. */
export function pitcheroTables(nd) {
  const lt = nd && nd.props && nd.props.initialReduxState && nd.props.initialReduxState.teams && nd.props.initialReduxState.teams.leagueTable;
  const out = [];
  if (!lt || !lt.tables) return out;
  for (const [teamId, list] of Object.entries(lt.tables)) for (const t of list || []) {
    const sm = t.season && typeof t.season.name === 'string' && t.season.name.match(SEASON_RE);
    const season = sm ? `${sm[1]}-${sm[2].slice(-2)}` : null;
    const rows = (t.rows || []).map(r => {
      const v = Object.fromEntries((r.column_values || []).map(c => [c.key, c.value]));
      const n = k => (typeof v[k] === 'number' ? v[k] : v[k] == null || v[k] === '' ? null : Number(v[k]));
      return { rank:r.rank, name:String(v.team_name || '').trim(), p:n('played'), w:n('won'), d:n('drew'), l:n('lost'), pf:n('for'), pa:n('against'),
        pts:n('points'), hf:n('home_for'), af:n('away_for'), own:!!r.is_highlighted, url:r.website_url || null };
    });
    out.push({ teamId:+teamId, id:t.id, name:String(t.name || '').trim(), season, rows });
  }
  return out;
}
/* A league's name without a sponsor's: "Counties 1 Tribute Ale Western North" is "Counties 1 Western North". */
export const leagueName = s => String(s || '').replace(/\b(Tribute Ale|adm|ADM)\s+/g, '').replace(/\s+/g, ' ').trim();
const FRIENDLY = /friendl|pre-?season|tour|festival|sevens|7s\b|charity|memorial|tens\b|10s\b/i;
const OFF = /postpon|cancel|abandon|void|called off|rearrang/i;
const WALKOVER = /walk ?over|conced|forfeit|award|w\/o/i;
/* A team's fixtures page: [{ id, teamId, date (UK), ha, opp, comp, league (bool), cup (bool), friendly, off (postponed, cancelled,
   abandoned or void), wo (walkover or conceded), f, a (null when no score), home, away }]. */
export function pitcheroFixtures(nd) {
  const fx = nd && nd.props && nd.props.initialReduxState && nd.props.initialReduxState.teams && nd.props.initialReduxState.teams.fixtures;
  const out = [];
  if (!fx || !fx.fixtures) return out;
  for (const [teamId, map] of Object.entries(fx.fixtures)) {
    const comps = new Map(Object.values((fx.competitions || {})[teamId] || {}).flat().map(c => [String(c.id), String(c.name || '')]));
    for (const g of Object.values(map || {})) {
      if (!g || typeof g.dateTime !== 'string') continue;
      const ha = g.ha === 'h' || g.ha === 'a' ? g.ha : null;
      const status = String(g.status || ''), type = String(g.type || ''), comp = comps.get(String(g.competitionId)) || String(g.division || type || '');
      const league = !!g.division || /^d-/.test(String(g.competitionId));
      const cup = !league && /\bcup|vase|plate|bowl|shield|trophy\b/i.test(type + ' ' + comp) && !FRIENDLY.test(type);
      const friendly = !league && !cup;
      const score = v => (Number.isInteger(v) ? v : typeof v === 'string' && /^\d{1,3}$/.test(v.trim()) ? +v : null);   // the page gives "34"
      const hs = g.homeSide ? score(g.homeSide.score) : null, as = g.awaySide ? score(g.awaySide.score) : null;
      const off = !!g.isCancelledOrPostponed || OFF.test(status) || ['P', 'C', 'A', 'V'].includes(g.outcome);
      const own = ha === 'h' ? hs : as, opp = ha === 'h' ? as : hs;
      out.push({ id:String(g.id), teamId:+teamId, date:g.dateTime.slice(0, 10), ha, opp:cleanName(g.opponent), comp:leagueName(comp), league, cup, friendly, off,
        wo:WALKOVER.test(status), f:off || own == null || opp == null ? null : own, a:off || own == null || opp == null ? null : opp,
        home:cleanName(g.homeSide && g.homeSide.name), away:cleanName(g.awaySide && g.awaySide.name) });
    }
  }
  return out.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
}

/* ---------- Wikipedia season pages: each match is a Rugbybox template ---------- */
const ENT = { amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' ', ndash:'\u2013', mdash:'\u2014' };
export const unescapeHtml = s => String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e.toLowerCase()] ?? m));
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
export function wikiDay(s) {
  const m = String(s).replace(/<[^>]*>/g, ' ').match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return null;
  const mo = MONTHS.indexOf(m[2].toLowerCase());
  if (mo < 0) return null;
  const d = `${m[3]}-${String(mo + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return realDay(d) ? d : null;
}
const wikiText = wt => unescapeHtml(String(wt || '')).replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/\{\{[^}]*\}\}/g, ' ').replace(/<[^>]*>/g, ' ').replace(/'''?/g, '');
const bpOf = s => { const m = String(s).match(/\((\d)\s*BP\)/i); return m ? +m[1] : 0; };
/* Every Rugbybox on a page: [{ date, home, away, hs, as, hbp, abp, off, round }]. hs and as are null for a match with no score yet. */
export function wikiMatches(html) {
  const out = [];
  const re = /class="vevent summary"[^>]*?data-mw='([^']*)'/g;
  let m, round = null;
  const heads = [...String(html).matchAll(/<h3 id="([^"]+)"/g)].map(h => [h.index, h[1]]);
  while ((m = re.exec(html))) {
    let p;
    try { p = JSON.parse(unescapeHtml(m[1])).parts[0].template.params; } catch (e) { continue; }
    const v = k => (p[k] && typeof p[k].wt === 'string' ? p[k].wt : '');
    round = (heads.filter(h => h[0] < m.index).pop() || [0, null])[1];
    const date = wikiDay(wikiText(v('date')));
    const home = wikiText(v('home')), away = wikiText(v('away')), score = wikiText(v('score'));
    const sm = score.match(/^\s*(\d{1,3})\s*[\u2013\u2014-]\s*(\d{1,3})\s*$/);
    const off = OFF.test(score) || /\bP\s*[\u2013\u2014-]\s*P\b/.test(score) || OFF.test(v('report'));
    out.push({ date, home:cleanName(home), away:cleanName(away), hs:sm && !off ? +sm[1] : null, as:sm && !off ? +sm[2] : null, hbp:bpOf(home), abp:bpOf(away), off, wo:WALKOVER.test(score + ' ' + v('report')), round });
  }
  return out;
}

/* ---------- a league table built from results (Wikipedia's tables lag a week or two) ---------- */
/* matches: [{ date, home, away, hs, as, hbp, abp }] with scores. Win 4, draw 2, loss 0, plus the bonus points the page marks. Returns
   Map name -> { name, p, w, d, l, pf, pa, pts, pos }, ranked on points, then wins, then points difference, then points for. */
export function tableFrom(matches, names, before = null) {
  const t = new Map(names.map(n => [n, { name:n, p:0, w:0, d:0, l:0, pf:0, pa:0, pts:0 }]));
  for (const g of matches) {
    if (g.hs == null || g.as == null || g.off || (before && g.date >= before)) continue;
    for (const [n, f, a, bp] of [[g.home, g.hs, g.as, g.hbp], [g.away, g.as, g.hs, g.abp]]) {
      const r = t.get(n); if (!r) continue;
      r.p++; r.pf += f; r.pa += a; r.pts += (f > a ? 4 : f === a ? 2 : 0) + (bp || 0);
      if (f > a) r.w++; else if (f === a) r.d++; else r.l++;
    }
  }
  const order = [...t.values()].sort((x, y) => y.pts - x.pts || y.w - x.w || (y.pf - y.pa) - (x.pf - x.pa) || y.pf - x.pf || (x.name < y.name ? -1 : 1));
  order.forEach((r, i) => { r.pos = i + 1; });
  return t;
}

/* ---------- the owner's rules ---------- */
/* res from this side's view: 'W' | 'D' | 'L'. */
export const resOf = (f, a) => (f > a ? 'W' : f === a ? 'D' : 'L');
/* The boost, the owner's scale (15 Nov 2026): a win +1; a win by 15 or more, or over a side placed higher before the match, +2; a loss -1; a
   draw 0. A walkover, conceded or void match gives nothing. Higher placed needs both places, and both sides past their first two games (a
   club) or both rankings (a nation). */
export function boostOf({ f, a, wo = false, prePos = null, oppPos = null, preP = null, oppPreP = null, rank = null, oppRank = null }) {
  if (wo) return { boost:0, why:'none' };
  const res = resOf(f, a);
  if (res === 'L') return { boost:-1, why:'loss' };
  if (res === 'D') return { boost:0, why:'draw' };
  if (f - a >= BIG_WIN) return { boost:2, why:'big' };
  const clubHigher = Number.isInteger(prePos) && Number.isInteger(oppPos) && oppPos < prePos && (preP == null || preP >= 2) && (oppPreP == null || oppPreP >= 2);
  const nationHigher = Number.isInteger(rank) && Number.isInteger(oppRank) && oppRank < rank;
  return clubHigher || nationHigher ? { boost:2, why:'higher' } : { boost:1, why:'win' };
}
/* The window: the day after the match until the day before the next fixture, 7 days at most. With no next fixture known, 6 days (a
   Saturday's result runs Sunday to Friday), so a boost never runs into a match day nobody listed. Empty (null) when the next fixture is the
   very next day. */
export function windowOf(date, next = null) {
  const from = addDays(date, 1);
  let until = addDays(date, next ? WINDOW_MAX : WINDOW_MAX - 1);
  if (next && next > date && addDays(next, -1) < until) until = addDays(next, -1);
  return until < from ? null : { from, until };
}
/* One side's entry, as the file holds it. m: { date, ha, f, a, opp, oppName, comp, wo, next, src } plus the table and place fields. */
export function entryOf(m) {
  const res = resOf(m.f, m.a);
  let { boost, why } = boostOf(m);
  const win = windowOf(m.date, m.next);
  if (!win) { boost = 0; why = 'none'; }
  const e = { date:m.date, ha:m.ha, res, f:m.f, a:m.a, opp:m.opp || null, oppName:cleanName(m.oppName), comp:String(m.comp).slice(0, 60) };
  if (m.wo) e.wo = true;
  if (m.league && Number.isInteger(m.pos) && Number.isInteger(m.of)) {
    e.league = String(m.league).slice(0, 60); e.pos = m.pos; e.of = m.of;
    if ([m.p, m.w, m.d, m.l, m.pts].every(Number.isInteger)) Object.assign(e, { p:m.p, w:m.w, d:m.d, l:m.l, pts:m.pts });
  }
  const settled = (m.preP == null || m.preP >= 2) && (m.oppPreP == null || m.oppPreP >= 2);   // the first two rounds: nobody is higher placed, so no places
  if (settled && Number.isInteger(m.prePos) && Number.isInteger(m.oppPos) && m.prePos !== m.oppPos) Object.assign(e, { prePos:m.prePos, oppPos:m.oppPos });
  if (Number.isInteger(m.rank) && Number.isInteger(m.oppRank)) Object.assign(e, { rank:m.rank, oppRank:m.oppRank });
  const w = win || { from:addDays(m.date, 1), until:addDays(m.date, 1) };
  Object.assign(e, { boost, why, from:w.from, until:w.until });
  if (m.next && m.next > m.date) e.next = m.next;
  e.src = m.src;
  return e;
}

/* ---------- the validator: the job refuses to write a file this finds anything wrong with ---------- */
const WHY = { win:[1, 'W'], big:[2, 'W'], higher:[2, 'W'], loss:[-1, 'L'], draw:[0, 'D'], none:[0, null] };
const KEYS = new Set(['date', 'ha', 'res', 'f', 'a', 'opp', 'oppName', 'comp', 'wo', 'league', 'pos', 'of', 'p', 'w', 'd', 'l', 'pts', 'prePos', 'oppPos', 'rank', 'oppRank', 'boost', 'why', 'from', 'until', 'next', 'src']);
const plain = (s, max) => typeof s === 'string' && s.length >= 1 && s.length <= max && PLAIN.test(s) && s.trim() === s;
const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
/* One entry. kind: 'clubs' | 'men' | 'women'. known: Set of ids the opponent may be. today: generated's UK date. Returns problems. */
export function entryProblems(e, kind, known, today) {
  const p = [];
  if (!e || typeof e !== 'object' || Array.isArray(e)) return ['not an object'];
  for (const k of Object.keys(e)) if (!KEYS.has(k)) p.push(`unknown key ${k}`);
  if (!realDay(e.date)) p.push(`date ${e.date}`);
  else if (today && e.date > today) p.push(`date ${e.date} is after ${today}`);
  if (!['h', 'a', 'n'].includes(e.ha) || (kind === 'clubs' && e.ha === 'n')) p.push(`ha ${e.ha}`);
  if (!int(e.f, 0, 200) || !int(e.a, 0, 200)) p.push(`score ${e.f}-${e.a}`);
  if (!['W', 'D', 'L'].includes(e.res)) p.push(`res ${e.res}`);
  else if (e.wo !== true && int(e.f, 0, 200) && int(e.a, 0, 200) && resOf(e.f, e.a) !== e.res) p.push(`res ${e.res} for ${e.f}-${e.a}`);
  if ('wo' in e && e.wo !== true) p.push('wo is not true');
  if (!(e.opp === null || (typeof e.opp === 'string' && ID.test(e.opp) && known.has(e.opp)))) p.push(`opp ${e.opp}`);
  if (!plain(e.oppName, 40)) p.push('oppName');
  if (!plain(e.comp, 60)) p.push('comp');
  const table = ['p', 'w', 'd', 'l', 'pts'].filter(k => k in e);
  if (kind === 'clubs') {
    if ('league' in e || 'pos' in e || 'of' in e) {
      if (!plain(e.league, 60) || !int(e.pos, 1, 24) || !int(e.of, 2, 24) || e.pos > e.of) p.push(`league ${e.league} ${e.pos}/${e.of}`);
    }
    if (table.length && (table.length < 5 || !('league' in e))) p.push('a part table line');
    if (table.length === 5) {
      if (!['p', 'w', 'd', 'l'].every(k => int(e[k], 0, 60)) || !int(e.pts, -50, 200) || e.w + e.d + e.l !== e.p) p.push(`table ${e.p} ${e.w} ${e.d} ${e.l} ${e.pts}`);
    }
    if ('prePos' in e || 'oppPos' in e) { if (!int(e.prePos, 1, 24) || !int(e.oppPos, 1, 24) || e.prePos === e.oppPos) p.push(`places ${e.prePos} ${e.oppPos}`); }
    if ('rank' in e || 'oppRank' in e) p.push('rank on a club');
  } else {
    if (table.length || 'league' in e || 'pos' in e || 'of' in e || 'prePos' in e || 'oppPos' in e) p.push('a table on a nation');
    if ('rank' in e || 'oppRank' in e) { if (!int(e.rank, 1, 120) || !int(e.oppRank, 1, 120) || e.rank === e.oppRank) p.push(`ranks ${e.rank} ${e.oppRank}`); }
  }
  const w = WHY[e.why];
  if (!w) p.push(`why ${e.why}`);
  else {
    if (e.boost !== w[0]) p.push(`boost ${e.boost} for ${e.why}`);
    if (w[1] && e.res !== w[1]) p.push(`why ${e.why} on ${e.res}`);
    if (e.wo === true && e.why !== 'none') p.push('a walkover with a boost');
    if (e.why === 'big' && !(e.f - e.a >= BIG_WIN)) p.push('big under 15');
    if ((e.why === 'win' || e.why === 'higher') && !(e.f - e.a < BIG_WIN)) p.push(`${e.why} over 15`);
    if (e.why === 'higher' && !(('oppPos' in e && e.oppPos < e.prePos) || ('oppRank' in e && e.oppRank < e.rank))) p.push('higher without a higher place');
    if (e.why === 'win' && (('oppPos' in e && e.oppPos < e.prePos) || ('oppRank' in e && e.oppRank < e.rank))) p.push('win over a higher side given +1');
  }
  if (!realDay(e.from) || !realDay(e.until)) p.push(`window ${e.from} ${e.until}`);
  else if (realDay(e.date)) {
    if (e.from !== addDays(e.date, 1)) p.push(`from ${e.from} is not the day after ${e.date}`);
    if (e.until < e.from) p.push('until before from');
    if (e.until > addDays(e.date, WINDOW_MAX)) p.push(`until ${e.until} more than ${WINDOW_MAX} days after ${e.date}`);
    if ('next' in e && (!realDay(e.next) || e.next <= e.date || (e.why !== 'none' && e.until >= e.next))) p.push(`next ${e.next}`);
  }
  if (!['pitchero', 'wikipedia', 'worldrugby'].includes(e.src)) p.push(`src ${e.src}`);
  return p;
}
/* The whole file. ids: { clubs:Set, men:Set, women:Set }. Returns problems, each naming its entry. */
export function validate(file, ids) {
  const p = [];
  if (!file || typeof file !== 'object' || Array.isArray(file)) return ['not an object'];
  for (const k of Object.keys(file)) if (!['v', 'generated', 'season', 'clubs', 'men', 'women'].includes(k)) p.push(`unknown top-level key ${k}`);
  if (file.v !== SCHEMA_V) p.push(`v ${file.v}`);
  if (!realTime(file.generated)) p.push(`generated ${file.generated}`);
  if (typeof file.season !== 'string' || !/^\d{4}-\d{2}$/.test(file.season)) p.push(`season ${file.season}`);
  const today = realTime(file.generated) ? ukDate(file.generated) : null;
  for (const kind of ['clubs', 'men', 'women']) {
    const t = file[kind];
    if (!t || typeof t !== 'object' || Array.isArray(t)) { p.push(`${kind} is not an object`); continue; }
    for (const [id, e] of Object.entries(t)) {
      if (!ids[kind].has(id)) { p.push(`${kind} ${id}: not a known id`); continue; }
      const known = kind === 'clubs' ? ids.clubs : ids[kind];
      for (const q of entryProblems(e, kind, known, today)) p.push(`${kind} ${id}: ${q}`);
      if (e && e.opp === id) p.push(`${kind} ${id}: plays itself`);
    }
  }
  const bytes = Buffer.byteLength(JSON.stringify(file, null, 1));
  if (bytes > MAX_BYTES) p.push(`${bytes} bytes is over ${MAX_BYTES}`);
  return p;
}
/* Run-level refusals: the last file (or null) against this one, and each league's table against its last snapshot.
   shrink: leagues allowed a fall in games played this week (a club withdrawn, its results expunged: tools/results/overrides.json). */
export function runProblems(next, prev, tables = [], shrink = []) {
  const p = [];
  if (prev && prev.clubs && typeof prev.clubs === 'object') {
    for (const kind of ['clubs', 'men', 'women']) {
      const was = Object.keys(prev[kind] || {}).length, now = Object.keys(next[kind] || {}).length;
      if (was >= 10 && now < Math.ceil(MIN_SHARE*was)) p.push(`${kind}: ${now} entries, under 90% of the last file's ${was}`);
    }
    if (realTime(prev.generated) && realTime(next.generated) && prev.generated > next.generated) p.push(`generated ${next.generated} is older than the last file's ${prev.generated}`);
  }
  for (const { league, now, was } of tables) {
    if (!was || shrink.includes(league)) continue;
    const back = now.filter(r => { const o = was.find(x => x.name === r.name); return o && Number.isInteger(o.p) && Number.isInteger(r.p) && r.p < o.p; });
    if (back.length > 1) p.push(`${league}: games played went backwards for ${back.map(r => r.name).join(', ')}`);
    const jump = now.filter(r => { const o = was.find(x => x.name === r.name); return o && Number.isInteger(o.p) && Number.isInteger(r.p) && r.p - o.p > 3; });
    if (jump.length > 1) p.push(`${league}: games played jumped by more than 3 for ${jump.map(r => r.name).join(', ')}`);
  }
  return p;
}

/* A Wikipedia season page's league table: [{ pos, name, p, w, d, l, pf, pa, pts }] from the "League table" section (its row headers are the
   teams, its column headers name the figures). Empty when the page has none. */
const WIKI_COLS = { pos:/^pos/i, p:/^(pld|p|played|matches played)$/i, w:/^(w|won|matches won)$/i, d:/^(d|drawn|matches drawn)$/i, l:/^(l|lost|matches lost)$/i,
  pf:/^(pf|match points for|points for|for)$/i, pa:/^(pa|match points against|points against|against)$/i, pts:/^(pts|points|total competition points|total league points)$/i };
export function wikiTable(html) {
  const s = String(html), i = s.search(/id="(League_table|Table|Standings)"/);
  if (i < 0) return [];
  const j = s.indexOf('<h2', i + 10), seg = s.slice(i, j < 0 ? undefined : j);
  const out = [];
  let cols = null;
  for (const row of seg.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const heads = [...row[1].matchAll(/<th scope="col"[^>]*>([\s\S]*?)<\/th>/g)];
    if (heads.length && !cols) {
      const labels = heads.map(h => { const t = h[1].match(/title="([^"]*)"/); const x = unescapeHtml(h[1].replace(/<[^>]*>/g, '')).trim(); return [x, t ? unescapeHtml(t[1]) : x]; });
      cols = {};
      for (const [k, re] of Object.entries(WIKI_COLS)) { const n = labels.findIndex(([x, t]) => re.test(x) || re.test(t)); if (n >= 0) cols[k] = n; }
      continue;
    }
    const th = row[1].match(/<th scope="row"[^>]*>([\s\S]*?)<\/th>/);
    if (!th || !cols) continue;
    const name = cleanName(unescapeHtml(th[1].replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<[^>]*>/g, '')).replace(/\[[^\]]*\]/g, '').replace(/\s*\([A-Z, ]+\)\s*$/, ''));
    const cells = [...row[1].matchAll(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/g)].map(c => unescapeHtml(c[2].replace(/<[^>]*>/g, '')).trim());
    const num = k => { if (!(k in cols)) return null; const v = String(cells[cols[k]] || '').replace(/[−–]/g, '-').replace(/^\+/, ''); return /^-?\d+$/.test(v) ? +v : null; };
    out.push({ pos:num('pos'), name, p:num('p'), w:num('w'), d:num('d'), l:num('l'), pf:num('pf'), pa:num('pa'), pts:num('pts') });
  }
  return out;
}
