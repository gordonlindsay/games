'use strict';
let practice = null;

/* =========================================================
   Data
   ========================================================= */
const NATIONS = [   // append only: championships saved before clubs existed index into the first six
  { id:'ENG', name:'England',  kit:'#f2efe6', trim:'#c8102e', alt:'#1b2747', altTrim:'#c8102e', pace:4, power:5, handling:3, kicking:4, stamina:4, home:true },
  { id:'FRA', name:'France',   kit:'#1d3a8f', trim:'#f2efe6', alt:'#f2efe6', altTrim:'#1d3a8f', pace:5, power:5, handling:4, kicking:4, stamina:5 },
  { id:'IRE', name:'Ireland',  kit:'#109a52', trim:'#f2efe6', alt:'#f2efe6', altTrim:'#109a52', pace:4, power:4, handling:5, kicking:5, stamina:5, home:true },
  { id:'ITA', name:'Italy',    kit:'#2f7ed8', trim:'#f2efe6', alt:'#f2efe6', altTrim:'#2f7ed8', pace:4, power:3, handling:3, kicking:3, stamina:3 },
  { id:'SCO', name:'Scotland', kit:'#1a2a5e', trim:'#f2efe6', alt:'#f2efe6', altTrim:'#1a2a5e', pace:5, power:3, handling:4, kicking:3, stamina:4, home:true },
  { id:'WAL', name:'Wales',    kit:'#c8102e', trim:'#f2efe6', alt:'#1c1c1c', altTrim:'#c8102e', pace:3, power:4, handling:3, kicking:3, stamina:4, home:true },
  { id:'NZL', name:'New Zealand',  kit:'#1c1c1c', trim:'#f2efe6', alt:'#f2efe6', altTrim:'#1c1c1c', pace:5, power:4, handling:5, kicking:4, stamina:5 },
  { id:'RSA', name:'South Africa', kit:'#0b5a3c', trim:'#f2b01e', alt:'#f2efe6', altTrim:'#0b5a3c', pace:4, power:5, handling:4, kicking:5, stamina:5 },
  { id:'AUS', name:'Australia',    kit:'#f2b01e', trim:'#0f5a32', alt:'#0f5a32', altTrim:'#f2b01e', pace:4, power:4, handling:4, kicking:4, stamina:4 },
  { id:'ARG', name:'Argentina',    kit:'#6fb7e6', trim:'#f2efe6', hoops:true, alt:'#1b2747', altTrim:'#6fb7e6', pace:4, power:5, handling:4, kicking:4, stamina:4 },
  { id:'FIJ', name:'Fiji',         kit:'#f2efe6', trim:'#1c1c1c', alt:'#1c1c1c', altTrim:'#f2efe6', pace:5, power:4, handling:5, kicking:3, stamina:4 },
  { id:'JPN', name:'Japan',        kit:'#c8102e', trim:'#f2efe6', hoops:true, alt:'#1b2747', altTrim:'#c8102e', pace:5, power:3, handling:4, kicking:3, stamina:4 },
];   // the six first, then the rest of the world; a nation's code never matches a club's (RSA, not a South African city's)
/* Local clubs: kit colours are the clubs' own, ratings are made up. Append only, never reorder. */
const CLUBS = [
  { id:'FAR', name:'Farnham',       kit:'#1a1a1a', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:4, kicking:3, stamina:3 },
  { id:'HAS', name:'Haslemere',     kit:'#2244aa', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:3, kicking:2, stamina:3 },
  { id:'GUI', name:'Guildford',     kit:'#1a1e4f', trim:'#ffc014', pace:3, power:4, handling:3, kicking:3, stamina:3 },
  { id:'ALD', name:'Aldershot',     kit:'#d8333a', trim:'#1b2747', pace:3, power:4, handling:2, kicking:3, stamina:4 },
  { id:'WEY', name:'Weybridge',     kit:'#1a1a1a', trim:'#0f8040', pace:3, power:3, handling:4, kicking:3, stamina:3 },
  { id:'QUI', name:'Quins',         kit:'#c8306f', trim:'#7eb0dc', pace:4, power:3, handling:4, kicking:3, stamina:3 },
  { id:'COB', name:'Cobham',        kit:'#26316f', trim:'#7a2338', hoops:true, pace:3, power:3, handling:3, kicking:3, stamina:3 },
  { id:'GDN', name:'Guildfordians', kit:'#12482a', trim:'#6b1a3a', hoops:true, pace:3, power:3, handling:3, kicking:2, stamina:2 },
  { id:'IRO', name:'Ironsides',     kit:'#1f9a55', trim:'#c8191e', pace:3, power:4, handling:2, kicking:2, stamina:4 },
  { id:'KIN', name:'Kingston',      kit:'#7c1431', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:2, stamina:3 },
  { id:'ORU', name:'Old Ruts',      kit:'#2a3290', trim:'#f5c400', hoops:true, pace:4, power:3, handling:3, kicking:2, stamina:2 },
  { id:'WIM', name:'Wimbledon',     kit:'#7c1956', trim:'#6cadde', hoops:true, pace:4, power:3, handling:3, kicking:3, stamina:4 },
];
/* Professional sides go by their city, not the club's own name or nickname: the city is a place, the club name is a
   trademark. Kit colours follow the clubs' own; ratings are made up, and no club tops a team you can make (5 + BUDGET).
   Codes are unique across every list, nations included. Append only, never reorder. */
const FRANCE = [   // the Top 14
  { id:'TLS', name:'Toulouse',    kit:'#d01f2e', trim:'#1c1c1c', pace:4, power:4, handling:3, kicking:3, stamina:3 },
  { id:'BOR', name:'Bordeaux',    kit:'#5c1a33', trim:'#f2efe6', pace:4, power:3, handling:4, kicking:3, stamina:3 },
  { id:'LRO', name:'La Rochelle', kit:'#f5c400', trim:'#1c1c1c', pace:3, power:4, handling:3, kicking:3, stamina:4 },
  { id:'TLN', name:'Toulon',      kit:'#1c1c1c', trim:'#d01f2e', pace:3, power:4, handling:3, kicking:3, stamina:3 },
  { id:'NAN', name:'Nanterre',    kit:'#7eb6e0', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:3, kicking:3, stamina:3 },
  { id:'PAR', name:'Paris',       kit:'#e2457f', trim:'#1b2747', pace:3, power:3, handling:4, kicking:3, stamina:3 },
  { id:'CLE', name:'Clermont',    kit:'#f5c400', trim:'#1b2747', pace:3, power:3, handling:3, kicking:3, stamina:4 },
  { id:'CAS', name:'Castres',     kit:'#2050b0', trim:'#f2efe6', pace:3, power:4, handling:2, kicking:3, stamina:3 },
  { id:'MPL', name:'Montpellier', kit:'#1b2747', trim:'#6fb7e6', pace:3, power:4, handling:3, kicking:2, stamina:3 },
  { id:'PAU', name:'Pau',         kit:'#0f7a3c', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:3, stamina:3 },
  { id:'BAY', name:'Bayonne',     kit:'#6fb7e6', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:3, stamina:3 },
  { id:'LYO', name:'Lyon',        kit:'#c8102e', trim:'#1c1c1c', hoops:true, pace:3, power:3, handling:3, kicking:3, stamina:3 },
  { id:'PGN', name:'Perpignan',   kit:'#f2b01e', trim:'#c8102e', pace:3, power:3, handling:2, kicking:3, stamina:3 },
  { id:'MTB', name:'Montauban',   kit:'#f2efe6', trim:'#2050b0', pace:3, power:3, handling:2, kicking:2, stamina:2 },
];
const AUSTRALIA = [   // the four Super Rugby cities, Melbourne (in Super Rugby until 2024) and Adelaide, invented: no sixth professional side exists
  { id:'SYD', name:'Sydney',    kit:'#6fb7e6', trim:'#1b2747', pace:4, power:3, handling:4, kicking:3, stamina:3 },
  { id:'BRI', name:'Brisbane',  kit:'#a3162f', trim:'#f2efe6', pace:4, power:4, handling:3, kicking:3, stamina:3 },
  { id:'CAN', name:'Canberra',  kit:'#1b2747', trim:'#f2b01e', pace:3, power:4, handling:4, kicking:3, stamina:3 },
  { id:'PTH', name:'Perth',     kit:'#2050b0', trim:'#f2b01e', pace:3, power:3, handling:3, kicking:3, stamina:4 },
  { id:'MEL', name:'Melbourne', kit:'#14235a', trim:'#c8102e', hoops:true, pace:3, power:3, handling:3, kicking:3, stamina:3 },
  { id:'ADL', name:'Adelaide',  kit:'#c8102e', trim:'#1b2747', pace:3, power:3, handling:3, kicking:2, stamina:3 },
];
const SOUTH_AFRICA = [   // the URC four and the Currie Cup's next three
  { id:'PRE', name:'Pretoria',     kit:'#2a5fb8', trim:'#f2efe6', pace:3, power:5, handling:3, kicking:3, stamina:3 },
  { id:'CPT', name:'Cape Town',    kit:'#1c1c1c', trim:'#2a5fb8', hoops:true, pace:4, power:4, handling:3, kicking:3, stamina:3 },
  { id:'DUR', name:'Durban',       kit:'#1c1c1c', trim:'#f2efe6', pace:4, power:4, handling:3, kicking:2, stamina:4 },
  { id:'JHB', name:'Johannesburg', kit:'#c8102e', trim:'#f2efe6', pace:4, power:3, handling:3, kicking:3, stamina:4 },
  { id:'BLM', name:'Bloemfontein', kit:'#e8731c', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:2, stamina:4 },
  { id:'KIM', name:'Kimberley',    kit:'#f2efe6', trim:'#b0b4ba', pace:3, power:3, handling:3, kicking:2, stamina:3 },
  { id:'MBO', name:'Mbombela',     kit:'#d8a823', trim:'#1c1c1c', pace:3, power:4, handling:2, kicking:2, stamina:3 },
];
const ENGLAND = [   // the Premiership. London North and London West are the two London clubs; Quins in Local is the amateur club
  { id:'BTH', name:'Bath',         kit:'#1d4fa0', trim:'#1c1c1c', pace:4, power:4, handling:3, kicking:3, stamina:3 },
  { id:'BRS', name:'Bristol',      kit:'#14235a', trim:'#f2efe6', pace:4, power:3, handling:4, kicking:3, stamina:3 },
  { id:'EXE', name:'Exeter',       kit:'#1c1c1c', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:3, stamina:3 },
  { id:'GLO', name:'Gloucester',   kit:'#a4123f', trim:'#f2efe6', hoops:true, pace:3, power:4, handling:3, kicking:3, stamina:3 },
  { id:'LEI', name:'Leicester',    kit:'#0f5a32', trim:'#c8102e', pace:3, power:4, handling:3, kicking:3, stamina:4 },
  { id:'NCL', name:'Newcastle',    kit:'#1c1c1c', trim:'#c8102e', pace:3, power:3, handling:3, kicking:2, stamina:3 },
  { id:'NTH', name:'Northampton',  kit:'#0f6b3a', trim:'#1c1c1c', hoops:true, pace:4, power:3, handling:4, kicking:3, stamina:3 },
  { id:'SAL', name:'Sale',         kit:'#1b2747', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:3, stamina:3 },
  { id:'LNO', name:'London North', kit:'#1c1c1c', trim:'#c8102e', pace:3, power:4, handling:3, kicking:3, stamina:4 },
  { id:'LWE', name:'London West',  kit:'#7eb0dc', trim:'#c8306f', pace:4, power:3, handling:3, kicking:3, stamina:3 },
];
const CELTIC = [   // Ireland, Scotland, Wales and Italy's professional sides, in one league
  { id:'DUB', name:'Dublin',    kit:'#1f4fa8', trim:'#f2b01e', pace:4, power:4, handling:3, kicking:3, stamina:3 },
  { id:'LIM', name:'Limerick',  kit:'#c8102e', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:3, stamina:3 },
  { id:'BEL', name:'Belfast',   kit:'#f2efe6', trim:'#c8102e', pace:3, power:4, handling:3, kicking:3, stamina:3 },
  { id:'GAL', name:'Galway',    kit:'#0f5a32', trim:'#f2b01e', pace:3, power:3, handling:3, kicking:3, stamina:3 },
  { id:'EDI', name:'Edinburgh', kit:'#14235a', trim:'#e8731c', pace:3, power:4, handling:3, kicking:2, stamina:3 },
  { id:'GLA', name:'Glasgow',   kit:'#1c1c1c', trim:'#6fb7e6', pace:4, power:3, handling:4, kicking:3, stamina:3 },
  { id:'CDF', name:'Cardiff',   kit:'#6fb7e6', trim:'#1c1c1c', pace:3, power:3, handling:3, kicking:3, stamina:3 },
  { id:'SWA', name:'Swansea',   kit:'#1c1c1c', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:3, stamina:3 },
  { id:'LLA', name:'Llanelli',  kit:'#c8102e', trim:'#f2efe6', pace:4, power:3, handling:3, kicking:2, stamina:3 },
  { id:'NPT', name:'Newport',   kit:'#1c1c1c', trim:'#e8731c', pace:3, power:3, handling:2, kicking:2, stamina:3 },
  { id:'TRE', name:'Treviso',   kit:'#0f7a3c', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:3, stamina:3 },
  { id:'PRM', name:'Parma',     kit:'#1b2747', trim:'#f2b01e', pace:3, power:3, handling:3, kicking:2, stamina:2 },
];
const NEW_ZEALAND = [   // the five Super Rugby cities and Taranaki, a provincial side
  { id:'AKL', name:'Auckland',     kit:'#1b3a8c', trim:'#f2efe6', pace:4, power:4, handling:3, kicking:3, stamina:3 },
  { id:'HMN', name:'Hamilton',     kit:'#1c1c1c', trim:'#c8102e', pace:4, power:3, handling:4, kicking:3, stamina:3 },
  { id:'WLG', name:'Wellington',   kit:'#f5c400', trim:'#1c1c1c', pace:4, power:3, handling:4, kicking:3, stamina:3 },
  { id:'CHC', name:'Christchurch', kit:'#c8102e', trim:'#1c1c1c', pace:4, power:4, handling:3, kicking:3, stamina:3 },
  { id:'DUN', name:'Dunedin',      kit:'#1b2747', trim:'#f2b01e', pace:3, power:3, handling:3, kicking:3, stamina:3 },
  { id:'TAR', name:'Taranaki',     kit:'#f2a900', trim:'#1c1c1c', hoops:true, pace:3, power:3, handling:3, kicking:2, stamina:3 },
];
const JAPAN = [   // League One, by city or prefecture
  { id:'TOK', name:'Tokyo',     kit:'#f5c400', trim:'#1c1c1c', pace:4, power:3, handling:4, kicking:3, stamina:3 },
  { id:'SAI', name:'Saitama',   kit:'#1d3a8f', trim:'#f2efe6', pace:4, power:4, handling:3, kicking:3, stamina:3 },
  { id:'FNB', name:'Funabashi', kit:'#e8731c', trim:'#1b2747', pace:3, power:3, handling:4, kicking:3, stamina:3 },
  { id:'AIC', name:'Aichi',     kit:'#c8102e', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:3, stamina:3 },
  { id:'KOB', name:'Kobe',      kit:'#a4141f', trim:'#1c1c1c', pace:4, power:3, handling:3, kicking:3, stamina:3 },
  { id:'SHZ', name:'Shizuoka',  kit:'#2050b0', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:3, stamina:3 },
  { id:'YOK', name:'Yokohama',  kit:'#1c1c1c', trim:'#c8102e', pace:3, power:3, handling:3, kicking:2, stamina:3 },
];
/* The team screen: International | National | Local, then a list. Every list offers at least six sides, since a championship is
   your side and five from the list on screen. settings.pool holds a list's key; 'my' is My League (src/import.js), under Local while
   a league is saved. Keys never change: the save keeps them. */
const TEAM_TIERS = ['International', 'National', 'Local'];
const TEAM_LISTS = [
  { key:'int', tier:0, name:'International',    teams:NATIONS },
  { key:'eng', tier:1, name:'England',          teams:ENGLAND },
  { key:'fra', tier:1, name:'France',           teams:FRANCE },
  { key:'cel', tier:1, name:'Celtic and Italy', teams:CELTIC },
  { key:'rsa', tier:1, name:'South Africa',     teams:SOUTH_AFRICA },
  { key:'aus', tier:1, name:'Australia',        teams:AUSTRALIA },
  { key:'nzl', tier:1, name:'New Zealand',      teams:NEW_ZEALAND },
  { key:'jpn', tier:1, name:'Japan',            teams:JAPAN },
  { key:'sur', tier:2, name:'Surrey',           teams:CLUBS },
];
const POOLS = TEAM_LISTS.map(l => l.teams);   // every built-in list
const NATIONAL = TEAM_LISTS.filter(l => l.tier === 1).map(l => l.teams);   // the national leagues: Career's Pro Club signs from these
/* Saves from before the hierarchy hold an index into the old five lists and My League (International, Local, France, Australia,
   South Africa, My League). Each goes to the list it was; anything else to International, as a bad choice always has. */
const POOL_OLD = ['int', 'sur', 'fra', 'aus', 'rsa', 'my'];
function poolKey(v) {
  if (Number.isInteger(v) && v >= 0 && v < POOL_OLD.length) return POOL_OLD[v];
  return v === 'my' || TEAM_LISTS.some(l => l.key === v) ? v : 'int';
}
const ALL_TEAMS = POOLS.flat();
const DEFAULT_TEAM = CLUBS[0];           // Farnham: the team screen opens on Local · Surrey with it picked
/* Men | Women | Minis on the team screen, for the match or championship being set up; Men | Women in Career. Only the name and the
   team's cat change ('England Women', 'Farnham Minis'): ratings, kit, code and the engine are the same. A women's or minis side
   carries cat ('women' | 'minis') into newMatch and the saves, for the drawing; a team without one is men's (catOf). */
const TEAM_CATS = [{ id:'men', name:'Men', tag:'' }, { id:'women', name:'Women', tag:' Women' }, { id:'minis', name:'Minis', tag:' Minis' }];
const catOf = t => (t && TEAM_CATS.some(c => c.id === t.cat) ? t.cat : 'men');
function catSide(t, cat) {               // Men: the team itself, as before. Otherwise a copy named for it; a name already ending in its word keeps it (Farnham Minis)
  const c = TEAM_CATS.find(x => x.id === cat);
  if (!t || !c || !c.tag) return t;
  return { ...t, name:String(t.name).toLowerCase().endsWith(c.tag.toLowerCase()) ? t.name : t.name + c.tag, cat:c.id };
}
const ABILITIES = [['pace', 'Pace'], ['power', 'Power'], ['handling', 'Handling'], ['kicking', 'Kicking'], ['stamina', 'Stamina']];
const BUDGET = 12;                        // a team you make starts at 1 in each ability, with this many points to spend: any team the four-ability builder allowed (10 points), plus Stamina 3
/* Stamina came after the other four. A team without it (a save from before it, an import, a test's side) reads as 3, the middle:
   its Sprint and On Fire last as long as they always have. Not rounded here, so a side handed in with a fractional Stamina plays as
   given; the saves keep whole pips (cleanTeam, cleanSide), so a fraction must be kept, and put back, by whatever made it. */
const staminaOf = t => { const v = t ? t.stamina : null; return typeof v === 'number' && Number.isFinite(v) ? clamp(v, 1, 5) : 3; };
const abilityOf = (t, k) => (k === 'stamina' ? staminaOf(t) : +t[k] || 0);   // a team's ability as the cards, the ratings and the saves read it
const MAX_CUSTOM = 4;
const KIT_COLOURS = [
  ['White', '#f2efe6'], ['Black', '#1c1c1c'], ['Navy', '#1b2747'], ['Royal Blue', '#2050b0'], ['Sky Blue', '#6fb7e6'], ['Red', '#c8102e'],
  ['Maroon', '#7a1f2b'], ['Green', '#109a52'], ['Bottle Green', '#0f5a32'], ['Gold', '#f2b01e'], ['Orange', '#e8731c'], ['Purple', '#5b2d8e'],
];
const DIFF = [
  { scrumCpu:0.60, lineSigma:0.19, lineContest:0.55, cpuSpeed:0.97, cpuTackle:0.56, myTackle:0.58, cpuIntercept:0.10, turnover:-0.03 },
  { scrumCpu:0.72, lineSigma:0.12, lineContest:0.65, cpuSpeed:1.00, cpuTackle:0.64, myTackle:0.48, cpuIntercept:0.17, turnover:0.00 },
  { scrumCpu:0.80, lineSigma:0.07, lineContest:0.75, cpuSpeed:1.04, cpuTackle:0.72, myTackle:0.42, cpuIntercept:0.25, turnover:0.03 },
];
/* The first EARLY.games one-player matches on Normal only. A player who has not learned to turn and chase leaves one
   defender running the wrong way, so two levers move and nothing else: the other side runs at Easy's pace, and your
   teammates tackle a little more surely than on Easy (one of them is still being pulled out of the tackle). Easy and
   Hard are left as set. Duels, scrums, your own tackle and sprint, and every later match stay on the chosen level. */
const EARLY = { games:2, gap:3, nudge:{ cpuSpeed:-0.03, myTackle:0.14 } };   // gap: the rating points, Stamina left out, that make a Stronger Side
const rateOf = t => ABILITIES.reduce((a, [k]) => a + abilityOf(t, k), 0);
/* The overall rating on a team card: the five abilities (5 to 25) on a 40 to 99 scale. A team you make tops out at 75, France and Ireland are 93. */
const overallOf = t => { const n = ABILITIES.length; return Math.round(40 + (clamp(rateOf(t), n, 5*n) - n)*59/(4*n)); };
/* Stronger Side compares the four abilities other than Stamina, EARLY.gap apart, so it marks the pairs it marked before Stamina
   and no others (tools/teams.mjs pins pairs within a pool). The badge and the championship's running order count all five. */
const outmatched = (us, them) => !!us && !!them && rateOf(them) - staminaOf(them) >= rateOf(us) - staminaOf(us) + EARLY.gap;
/* Goal kicks. Every lever is here: GKTUNE='{"band":[0.15,0.13,0.10]}' node tools/goalkicks.mjs --rates tries values without an edit. */
const KICK = {
  g:9.81, kd:0.10, kw:0.32, v0:26.5, vK:1.0, vLo:0.35,
  elev:{ set:34, drop:38 }, h0:0.20,
  fill:[1.25,1.05,0.92], dropFill:[0.95,0.80,0.70], fillD:0.006,
  band:[0.155,0.13,0.10], bandD:0.002, bandA:0.07, bandK:0.02, bandMin:0.055, minK:0.006, bandMax:0.24, dropBand:1.3,
  lift:0.03, liftW:0.15, floor:0.40, ceil:0.97, clear:0.3, range:0.95,
  hook:4.0, push:2.0, curlK:0.12,
  R:0.18, bar:3.0, upL:32.2, upR:37.8, upH:11,
  tap:0.12, runup:0.42, dropT:0.25, hold:0.20, hitStop:0.07, aimRate:18, keyRate:12, aimMax:30, penMin:10,
  reach:2.4, block:1.0, lat:0.9, rushAcc:6, rushMul:[0.84,1.0,1.10], rushR:15, shoulder:4, cpuReact:0.30,
  cpuSig:[0.072,0.060,0.056], cpuAim:[0.9,0.15], cpuAimSd:0.6,
  wind:{ mix:[[0.30,0,3],[0.45,4,11],[0.25,11,18]], gust:0.18, swing:10, max:22, calm:2 },
};
const CAM = { b0:8, bK:0.2, h:2.2, ballY:0.80, topY:0.15, topPx:58, Fmin:0.8, Fmax:2.4, near:0.3, fadeZ:2, fadeW:2, figH:0.6 };   // a charger fades in from fadeZ to fadeZ + fadeW metres in front of the lens, and no charger stands taller than figH of the screen
// GKTUNE
const D2R = Math.PI/180, MPH = 0.44704;
const HALF_SECONDS = [120, 240, 360];
const STEP = 1/60;

const $ = id => document.getElementById(id);
const clamp = (v,a,b) => v < a ? a : v > b ? b : v;
const rnd = Math.random;
const hyp = Math.hypot;
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
const dist = (a,b) => hyp(a.x-b.x, a.y-b.y);
const shuffle = a => { for (let i = a.length-1; i > 0; i--) { const j = Math.floor(rnd()*(i+1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };   // a sort with a random comparator is far from fair in Safari

