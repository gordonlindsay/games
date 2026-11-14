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
const COMP_LEAGUES = [...(LOCAL.on ? [[/^National League 1\b/, 3], [/^National League 2\b/, 4]] : []), [/^Regional 1/, 5], [/^Regional 2/, 6], [/^Counties 1/, 7], [/^Counties 2/, 8], [/^Counties 3/, 9], [/^Counties 4/, 10], [/^Counties 5/, 11]];
const CLUB_LEVEL = { QUI:11 };   // Quins, the amateur club: Counties 5 Surrey by the club's own 2025-26 fixtures (Wikipedia says Counties 4)
const CLUB_COUNTY = { FAR:'SUR', WIM:'SUR', GUI:'SUR', IRO:'SUR', COB:'SUR', WEY:'SUR', ORU:'SUR', HAS:'SUR', KIN:'SUR', GDN:'SUR', QUI:'SUR',
  EFF:'SUR', WAN:'SUR', EGH:'SUR', MER:'SUR', MIT:'SUR', FEL:'SUR', ALD:'HAM' };
const COUNTY_CUPS = {
  SUR:[{ name:'Surrey Cup', to:5 }, { name:'Surrey Trophy', to:8 }, { name:'Surrey Shield', to:10 }, { name:'Surrey Bowl', to:12 }],
  HAM:[{ name:'Hampshire Cup', to:7 }, { name:'Hampshire Bowl', to:9 }, { name:'Hampshire Plate', to:12 }],
  ANY:[{ name:'County Cup', to:5 }, { name:'County Trophy', to:8 }, { name:'County Shield', to:10 }, { name:'County Bowl', to:12 }],
};
/* LOCAL (src/data.js): every club of the new county lists has its county, and a county with sourced cups by level has its own table (src/clubs-local.js:
   only what the research sourced; Surrey's and Hampshire's here stay as they are). A county with none plays the plain table, never an invented name. */
for (const c of LOCAL_DATA.counties) {
  for (const t of c.clubs) CLUB_COUNTY[t.id] = c.code;
  if (c.cups && !COUNTY_CUPS[c.code]) COUNTY_CUPS[c.code] = c.cups;
}
const COUNTY_CUP_NAMES = Object.values(COUNTY_CUPS).flat().map(c => c.name);   // every name a saved cup may carry
/* The grassroots sides: every Local list's (Surrey and Counties; with LOCAL, every county), each once, in list order. Built once, as the levels
   are: a cup's draw sorts them by level, and nearly five hundred clubs are too many to gather again inside a sort. */
let compAll = null, compLevels = null;
const compLocal = () => compAll || (compAll = [...new Set(TEAM_LISTS.filter(l => l.tier === 2).flatMap(l => l.teams))]);
/* A built-in club's own level: its league's, else CLUB_LEVEL's; null for anything else. */
function compOwnLevel(t) {
  if (!t || t.custom) return null;
  if (!compLevels) {
    compLevels = new Map();
    for (const o of compLocal()) if (!compLevels.has(o.id)) { const hit = o.league && COMP_LEAGUES.find(([re]) => re.test(o.league)); compLevels.set(o.id, hit ? hit[1] : CLUB_LEVEL[o.id] || null); }
  }
  return compLevels.has(t.id) ? compLevels.get(t.id) : CLUB_LEVEL[t.id] || null;
}
function compLevelOf(t) {
  if (!t) return null;
  const own = compOwnLevel(t); if (own) return own;
  const ov = overallOf(t);                           // a made side: the level of the Local club nearest its overall, the higher on a tie
  /* Regional 1 down, as 1.6 matched it: National League's clubs (LOCAL, levels 3 and 4) are at 61 too, Regional 1's top, and a made side at
     61 or above is a Regional 1 side for its county cup, never one drawn against National League clubs from across England. */
  const near = compLocal().filter(o => compOwnLevel(o) >= 5).sort((a, b) => Math.abs(overallOf(a) - ov) - Math.abs(overallOf(b) - ov) || compOwnLevel(a) - compOwnLevel(b))[0];
  return compOwnLevel(near);
}
const compCountyOf = t => (t && !t.custom && CLUB_COUNTY[t.id]) || null;
function compCupFor(t) {
  const list = COUNTY_CUPS[compCountyOf(t)] || COUNTY_CUPS.ANY, level = compLevelOf(t);
  if (LOCAL.on && level > list[list.length - 1].to) return COUNTY_CUPS.ANY.find(c => level <= c.to) || COUNTY_CUPS.ANY[COUNTY_CUPS.ANY.length - 1];   // a level under the county's sourced cups: the plain table's (Durham's Counties 1 clubs: the County Trophy)
  return list.find(c => level <= c.to) || list[list.length - 1];
}
/* The seven a county cup draws: the Local clubs but your own, nearest your level first, in a random order within a level. With LOCAL, your own
   county's clubs first (Farnham's are Surrey's), topped up from the other counties the same way where your county has too few; a made side has
   no county and draws from them all. Only the cups engine's cupNew calls it, so the draw is never in a render or a save. */
function compCupRivals(t, n = 7) {
  const level = compLevelOf(t), same = o => o.id === t.id || o.name === t.name || (typeof importSame === 'function' && importSame(o.name, t.name));
  const near = l => shuffle(l).sort((a, b) => Math.abs(compOwnLevel(a) - level) - Math.abs(compOwnLevel(b) - level));
  const all = compLocal().filter(o => !same(o)), cty = LOCAL.on ? compCountyOf(t) : null;
  if (!cty) return near(all).slice(0, n);
  const own = near(all.filter(o => CLUB_COUNTY[o.id] === cty)).slice(0, n);
  return own.length >= n ? own : [...own, ...near(all.filter(o => CLUB_COUNTY[o.id] !== cty)).slice(0, n - own.length)];
}
