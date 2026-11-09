/* =========================================================
   Competitions: where a club sits in the English game, and the knockout its county runs for it.

   The real structure and every source are in docs/grassroots-competitions.md. Nothing here reads or writes a save, and
   nothing but a career calls it.
   - A club's level is read from its league line, 1 (the top flight) to 11 (Counties 5). A side with no league (a team you
     made or imported, whose league line a save never keeps) takes the level its rating would have (compLevelOf).
   - A club's county is written down only for clubs that have one here. Counties sort their clubs differently, so a cup is
     read from that county's own table. A side with no county plays the plain county table.
   - A cup is eight sides over three ties. The four who lose the first tie drop into its Plate, as Kent's and the women's
     national cups do, so a small club always gets a second match. Scores are the championship's, by simMatch.
   ========================================================= */
const COMP_LEAGUES = [[/^English Premiership/, 1], [/^English Championship/, 2], [/^National League 1/, 3], [/^National League 2/, 4], [/^Regional 1/, 5], [/^Regional 2/, 6], [/^Counties 1/, 7], [/^Counties 2/, 8], [/^Counties 3/, 9], [/^Counties 4/, 10], [/^Counties 5/, 11]];
const COMP_RATED = [[55, 5], [49, 6], [46, 7], [43, 9], [0, 11]];   // overall to level, the Local bands in src/ratings.js
const CLUB_COUNTY = { FAR:'SUR', WIM:'SUR', GUI:'SUR', IRO:'SUR', COB:'SUR', WEY:'SUR', ORU:'SUR', HAS:'SUR', KIN:'SUR', EFF:'SUR', GDN:'SUR', WAN:'SUR', EGH:'SUR', MER:'SUR', MIT:'SUR', FEL:'SUR', ALD:'HAM' };   // from each club's league and place; see the brief. Twickenham has none: it is a top-flight side
/* to: the lowest level (highest number) a cup takes. A side above a county's top cup enters that cup. A Plate is named here because Hampshire already has a cup called the Plate. */
const COUNTY_CUPS = {
  SUR:[{ name:'Surrey Cup', plate:'Surrey Cup Plate', to:5 }, { name:'Surrey Trophy', plate:'Surrey Trophy Plate', to:8 }, { name:'Surrey Shield', plate:'Surrey Shield Plate', to:10 }, { name:'Surrey Bowl', plate:'Surrey Bowl Plate', to:12 }],
  HAM:[{ name:'Hampshire Cup', plate:'Hampshire Cup Plate', to:7 }, { name:'Hampshire Bowl', plate:'Hampshire Bowl Plate', to:9 }, { name:'Hampshire Plate', plate:'Hampshire Salver', to:12 }],
  ANY:[{ name:'County Cup', plate:'County Cup Plate', to:5 }, { name:'County Trophy', plate:'County Trophy Plate', to:8 }, { name:'County Shield', plate:'County Shield Plate', to:10 }, { name:'County Bowl', plate:'County Bowl Plate', to:12 }],
};
function compLevelOf(t) {
  const league = t && !t.custom && !t.key ? t.league || (ALL_TEAMS.find(o => o.id === t.id) || {}).league : null, hit = league && COMP_LEAGUES.find(([re]) => re.test(league));
  return hit ? hit[1] : COMP_RATED.find(([ov]) => overallOf(t) >= ov)[1];
}
const compCountyOf = t => (t && !t.custom && !t.key && CLUB_COUNTY[t.id]) || null;
function compCupFor(t) {
  const list = COUNTY_CUPS[compCountyOf(t) || 'ANY'], level = compLevelOf(t);
  return list.find(c => level <= c.to) || list[list.length - 1];
}
/* The clubs a cup can draw: every grassroots side but your own and the top flight's, nearest your level first, in a random order within a level. */
function compCupRivals(t, n = 7) {
  const level = compLevelOf(t), pool = [...new Set([...CLUBS, ...COUNTIES])].filter(o => compLevelOf(o) > 2 && o.id !== t.id && o.name !== t.name);
  return shuffle(pool).sort((a, b) => Math.abs(compLevelOf(a) - level) - Math.abs(compLevelOf(b) - level)).slice(0, n);
}

/* ---------- a knockout ---------- */
const CUP_TIES = ['Quarter-Final', 'Semi-Final', 'Final'];
function cupNew(entry, teams) {           // teams[0] is yours
  return { name:entry.name, plate:entry.plate, user:0, teams, tie:0, draw:shuffle(teams.map((t, i) => i)), main:[], low:[] };
}
/* The winner of a result. Level after extra time, the side with more tries; level on those, the away side, as Dorset & Wilts' 2025-26 rules end. */
const cupWinner = r => (r.hs !== r.as ? (r.hs > r.as ? r.h : r.a) : r.ht !== r.at ? (r.ht > r.at ? r.h : r.a) : r.a);
const cupLoser = r => (cupWinner(r) === r.h ? r.a : r.h);
const cupTwos = list => { const out = []; for (let i = 0; i + 1 < list.length; i += 2) out.push([list[i], list[i + 1]]); return out; };
function cupMainPairs(cup, k) { return cupTwos(k === 0 ? cup.draw : cup.main[k - 1].map(cupWinner)); }
function cupLowPairs(cup, k) { return k === 0 ? [] : cupTwos(k === 1 ? cup.main[0].map(cupLoser) : cup.low[k - 2].map(cupWinner)); }
/* Your tie now, or null when you are out of both. plate: it is in the Plate. */
function cupUserTie(cup) {
  if (!cup || cup.tie >= CUP_TIES.length) return null;
  const main = cupMainPairs(cup, cup.tie).find(p => p.includes(cup.user));
  if (main) return { pair:main, plate:false, label:CUP_TIES[cup.tie] };
  const low = cupLowPairs(cup, cup.tie).find(p => p.includes(cup.user));
  return low ? { pair:low, plate:true, label:CUP_TIES[cup.tie] } : null;
}
/* One tie of both draws. mine: your result, for the pair it names; every other game is simulated. */
function cupPlayTie(cup, mine) {
  const k = cup.tie, play = ([h, a]) => (mine && mine.h === h && mine.a === a ? mine : simMatch(cup, h, a));
  cup.main.push(cupMainPairs(cup, k).map(play));
  if (k > 0) cup.low.push(cupLowPairs(cup, k).map(play));
  cup.tie++;
}
/* How far you went: what the season's end shows. */
function cupResult(cup) {
  const u = cup.user, inLow = cup.low.some(rd => rd.some(x => x.h === u || x.a === u)), rounds = inLow ? cup.low : cup.main;
  let k = rounds.length - 1;
  while (k > 0 && !rounds[k].some(x => x.h === u || x.a === u)) k--;
  const r = rounds[k].find(x => x.h === u || x.a === u), final = k === rounds.length - 1;
  return (inLow ? 'Plate ' : '') + (final && cupWinner(r) === u ? 'Winners' : CUP_TIES[k + (inLow ? 1 : 0)]);
}
/* The line after your tie, and whether it won a trophy (its name). */
function cupTieLine(cup, r, plate) {
  const k = cup.tie - 1, won = cupWinner(r) === cup.user, level = r.hs === r.as, name = plate ? cup.plate : cup.name;
  const how = !level ? '' : (r.ht !== r.at ? 'Level, Decided on Tries · ' : 'Level, Away Side Through · ');
  if (won && k === 2) return { line:how + name + ' Winners', trophy:name };
  if (won) return { line:how + 'Through to the ' + (plate ? 'Plate ' : '') + CUP_TIES[k + 1] };
  if (k === 2) return { line:how + name + ' Runners-Up' };
  return { line:how + (!plate && k === 0 ? 'Into the ' + cup.plate : 'Out of the ' + name) };
}
/* A cup as it comes back from a save: null if anything is off, and the career plays on without it. The pairs must be the ones the draw gives, so a result can't be saved against a tie that never happened. */
function cleanCup(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c) || c.user !== 0 || !Array.isArray(c.teams) || c.teams.length !== 8) return null;
  const words = v => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 32) : null), name = words(c.name), plate = words(c.plate);
  if (!name || !plate || !Number.isInteger(c.tie) || c.tie < 0 || c.tie > 3) return null;
  const teams = c.teams.map(cleanSide), draw = c.draw;
  if (teams.some(t => !t) || !Array.isArray(draw) || draw.length !== 8 || new Set(draw).size !== 8 || draw.some(i => !Number.isInteger(i) || i < 0 || i > 7)) return null;
  if (!Array.isArray(c.main) || !Array.isArray(c.low) || c.main.length !== c.tie || c.low.length !== Math.max(0, c.tie - 1)) return null;
  const out = { name, plate, user:0, teams, tie:0, draw:draw.slice(), main:[], low:[] };
  const score = v => Number.isInteger(v) && v >= 0 && v <= 999;
  const round = (raw, pairs) => {
    if (!Array.isArray(raw) || raw.length !== pairs.length) return null;
    const rd = raw.map((r, i) => (r && r.h === pairs[i][0] && r.a === pairs[i][1] && score(r.hs) && score(r.as) && score(r.ht) && score(r.at) ? { h:r.h, a:r.a, hs:r.hs, as:r.as, ht:r.ht, at:r.at } : null));
    return rd.every(Boolean) ? rd : null;
  };
  for (let k = 0; k < c.tie; k++) {
    const m = round(c.main[k], cupMainPairs(out, k)); if (!m) return null;
    if (k > 0) { const l = round(c.low[k - 1], cupLowPairs(out, k)); if (!l) return null; out.low.push(l); }
    out.main.push(m); out.tie = k + 1;
  }
  return out;
}
