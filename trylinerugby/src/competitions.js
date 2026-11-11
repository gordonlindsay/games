/* =========================================================
   Competitions: where a Local club sits in the English game, and the county cup it plays (docs/grassroots-competitions.md has
   the real structure and every source). The cup itself is the cups engine's ('county', src/cups.js); this is only its data.
   - A club's level is read from its league (src/data.js, 2025-26): 5 (Regional 1) down to 11 (Counties 5). Quins carry no league,
     so theirs is written here (CLUB_LEVEL). A side with neither (a team you made or imported) takes the level of the Local club
     nearest its overall.
   - A club's county is inferred from its league and ground (Farnham is a joint Surrey and Hampshire member, and plays Surrey's).
     A side with none plays the plain county table.
   - A county runs its cups by level: the club enters the first whose `to` its level is within. Plain names, never a sponsor's.
   ========================================================= */
const COMP_LEAGUES = [[/^Regional 1/, 5], [/^Regional 2/, 6], [/^Counties 1/, 7], [/^Counties 2/, 8], [/^Counties 3/, 9], [/^Counties 4/, 10], [/^Counties 5/, 11]];
const CLUB_LEVEL = { QUI:11 };   // Quins, the amateur club: Counties 5 Surrey by the club's own 2025-26 fixtures (Wikipedia says Counties 4)
const CLUB_COUNTY = { FAR:'SUR', WIM:'SUR', GUI:'SUR', IRO:'SUR', COB:'SUR', WEY:'SUR', ORU:'SUR', HAS:'SUR', KIN:'SUR', GDN:'SUR', QUI:'SUR',
  EFF:'SUR', WAN:'SUR', EGH:'SUR', MER:'SUR', MIT:'SUR', FEL:'SUR', ALD:'HAM' };
const COUNTY_CUPS = {
  SUR:[{ name:'Surrey Cup', to:5 }, { name:'Surrey Trophy', to:8 }, { name:'Surrey Shield', to:10 }, { name:'Surrey Bowl', to:12 }],
  HAM:[{ name:'Hampshire Cup', to:7 }, { name:'Hampshire Bowl', to:9 }, { name:'Hampshire Plate', to:12 }],
  ANY:[{ name:'County Cup', to:5 }, { name:'County Trophy', to:8 }, { name:'County Shield', to:10 }, { name:'County Bowl', to:12 }],
};
const COUNTY_CUP_NAMES = Object.values(COUNTY_CUPS).flat().map(c => c.name);   // every name a saved cup may carry
const compLocal = () => [...new Set([...CLUBS, ...COUNTIES])];   // the grassroots sides: Local's Surrey and Counties lists
/* A built-in club's own level: its league's, else CLUB_LEVEL's; null for anything else. */
function compOwnLevel(t) {
  if (!t || t.custom) return null;
  const own = compLocal().find(o => o.id === t.id), league = own && own.league, hit = league && COMP_LEAGUES.find(([re]) => re.test(league));
  return hit ? hit[1] : CLUB_LEVEL[t.id] || null;
}
function compLevelOf(t) {
  if (!t) return null;
  const own = compOwnLevel(t); if (own) return own;
  const ov = overallOf(t);                           // a made side: the level of the Local club nearest its overall, the higher on a tie
  const near = compLocal().slice().sort((a, b) => Math.abs(overallOf(a) - ov) - Math.abs(overallOf(b) - ov) || compOwnLevel(a) - compOwnLevel(b))[0];
  return compOwnLevel(near);
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
  return shuffle(compLocal().filter(o => !same(o))).sort((a, b) => Math.abs(compOwnLevel(a) - level) - Math.abs(compOwnLevel(b) - level)).slice(0, n);
}
