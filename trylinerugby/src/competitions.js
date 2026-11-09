/* =========================================================
   Competitions: where a Local club sits in the English game, and the county cup it plays (docs/grassroots-competitions.md has
   the real structure and every source). The cup itself is the cups engine's ('county', src/cups.js); this is only its data.
   - A club's level is the league it played in 2025-26: 5 (Regional 1) down to 11 (Counties 5). A side with none here (a team you
     made or imported) takes the level of the Local club nearest its overall.
   - A club's county is inferred from its league and ground (Farnham is a joint Surrey and Hampshire member, and plays Surrey's).
     A side with none plays the plain county table.
   - A county runs its cups by level: the club enters the first whose `to` its level is within. Plain names, never a sponsor's.
   ========================================================= */
const CLUB_LEVEL = { FAR:5, WIM:5, GUI:6, IRO:6, COB:7, WEY:7, ORU:7, HAS:9, KIN:9, ALD:9, GDN:11, QUI:11 };   // QUI: Counties 5 Surrey by the club's own 2025-26 fixtures
const CLUB_COUNTY = { FAR:'SUR', WIM:'SUR', GUI:'SUR', IRO:'SUR', COB:'SUR', WEY:'SUR', ORU:'SUR', HAS:'SUR', KIN:'SUR', GDN:'SUR', QUI:'SUR', ALD:'HAM' };
const COUNTY_CUPS = {
  SUR:[{ name:'Surrey Cup', to:5 }, { name:'Surrey Trophy', to:8 }, { name:'Surrey Shield', to:10 }, { name:'Surrey Bowl', to:12 }],
  HAM:[{ name:'Hampshire Cup', to:7 }, { name:'Hampshire Bowl', to:9 }, { name:'Hampshire Plate', to:12 }],
  ANY:[{ name:'County Cup', to:5 }, { name:'County Trophy', to:8 }, { name:'County Shield', to:10 }, { name:'County Bowl', to:12 }],
};
const COUNTY_CUP_NAMES = Object.values(COUNTY_CUPS).flat().map(c => c.name);   // every name a saved cup may carry
function compLevelOf(t) {
  if (!t) return null;
  if (!t.custom && CLUB_LEVEL[t.id]) return CLUB_LEVEL[t.id];
  const ov = overallOf(t);                           // a made side: the level of the Local club nearest its overall, the higher on a tie
  const near = CLUBS.slice().sort((a, b) => Math.abs(overallOf(a) - ov) - Math.abs(overallOf(b) - ov) || CLUB_LEVEL[a.id] - CLUB_LEVEL[b.id])[0];
  return CLUB_LEVEL[near.id];
}
const compCountyOf = t => (t && !t.custom && CLUB_COUNTY[t.id]) || null;
function compCupFor(t) {
  const list = COUNTY_CUPS[compCountyOf(t) || 'ANY'], level = compLevelOf(t);
  return list.find(c => level <= c.to) || list[list.length - 1];
}
/* The seven a county cup draws: the Local clubs but your own, nearest your level first, in a random order within a level. Only the
   cups engine's cupNew calls it, so the draw is never in a render or a save. */
function compCupRivals(t, n = 7) {
  const level = compLevelOf(t), same = o => o.id === t.id || o.name === t.name || (typeof importSame === 'function' && importSame(o.name, t.name));
  return shuffle(CLUBS.filter(o => !same(o))).sort((a, b) => Math.abs(CLUB_LEVEL[a.id] - level) - Math.abs(CLUB_LEVEL[b.id] - level)).slice(0, n);
}
