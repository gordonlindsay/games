'use strict';
let practice = null;
/* The game's own version, small at the foot of Settings and on window.__tryline (the owner, 2026-11-11: "bump GAME_VERSION to 1.2", on
   top of main's 1.1 from PR #17, which showed it after the home's tagline; the tidied home has no tagline, so Settings is its one place).
   The app's store version (app/package.json, 1.0.0) is the app's, and apart from this. */
const GAME_VERSION = '1.2';

/* =========================================================
   Data
   ========================================================= */
/* Nations are rated on the XV game's hierarchy: World Rugby's official tables, the men's effective 3 November 2026 and the women's
   2 November 2026 (README, Teams). Each category's International list is its own top twelve in its table's order (natList). A
   five-ability sum goes by the points, so overallOf sits near them (23 is 93, 22 is 90, 21 is 87, 20 is 84, 19 is 81, 18 is 78), and
   every nation is above every club (17 is 75). Each keeps its style: Fiji's pace, South Africa's power, Ireland's handling and
   kicking. NATIONS holds the kits and the men's ratings, NAT_WOMEN the women's. */
const NATIONS = [   // append only: championships saved before clubs existed index into the first six
  { id:'ENG', name:'England',  kit:'#f2efe6', trim:'#c8102e', alt:'#1b2747', altTrim:'#c8102e', pace:4, power:5, handling:3, kicking:5, stamina:3, home:true },
  { id:'FRA', name:'France',   kit:'#1d3a8f', trim:'#f2efe6', alt:'#f2efe6', altTrim:'#1d3a8f', pace:5, power:5, handling:4, kicking:3, stamina:4 },
  { id:'IRE', name:'Ireland',  kit:'#109a52', trim:'#f2efe6', alt:'#f2efe6', altTrim:'#109a52', pace:4, power:4, handling:5, kicking:5, stamina:3, home:true },
  { id:'ITA', name:'Italy',    kit:'#2f7ed8', trim:'#f2efe6', alt:'#f2efe6', altTrim:'#2f7ed8', pace:4, power:4, handling:4, kicking:3, stamina:3 },
  { id:'SCO', name:'Scotland', kit:'#1a2a5e', trim:'#f2efe6', alt:'#f2efe6', altTrim:'#1a2a5e', pace:5, power:4, handling:5, kicking:3, stamina:3, home:true },
  { id:'WAL', name:'Wales',    kit:'#c8102e', trim:'#f2efe6', alt:'#1c1c1c', altTrim:'#c8102e', pace:4, power:4, handling:3, kicking:4, stamina:3, home:true },
  { id:'NZL', name:'New Zealand',  kit:'#1c1c1c', trim:'#f2efe6', alt:'#f2efe6', altTrim:'#1c1c1c', pace:5, power:4, handling:5, kicking:4, stamina:5 },
  { id:'RSA', name:'South Africa', kit:'#0b5a3c', trim:'#f2b01e', alt:'#f2efe6', altTrim:'#0b5a3c', pace:4, power:5, handling:4, kicking:5, stamina:5 },
  { id:'AUS', name:'Australia',    kit:'#f2b01e', trim:'#0f5a32', alt:'#0f5a32', altTrim:'#f2b01e', pace:5, power:4, handling:4, kicking:4, stamina:3 },
  { id:'ARG', name:'Argentina',    kit:'#6fb7e6', trim:'#f2efe6', hoops:true, alt:'#1b2747', altTrim:'#6fb7e6', pace:4, power:5, handling:4, kicking:3, stamina:3 },
  { id:'FIJ', name:'Fiji',         kit:'#f2efe6', trim:'#1c1c1c', alt:'#1c1c1c', altTrim:'#f2efe6', pace:5, power:3, handling:5, kicking:2, stamina:3 },
  { id:'JPN', name:'Japan',        kit:'#c8102e', trim:'#f2efe6', hoops:true, alt:'#1b2747', altTrim:'#c8102e', pace:5, power:3, handling:4, kicking:3, stamina:3 },
  { id:'CDN', name:'Canada',       kit:'#d52b1e', trim:'#f2efe6', alt:'#f2efe6', altTrim:'#d52b1e', pace:4, power:5, handling:4, kicking:4, stamina:5 },   // women's twelve only: CAN is Canberra's
  { id:'USA', name:'USA',          kit:'#1b2747', trim:'#c8102e', alt:'#f2efe6', altTrim:'#1b2747', pace:5, power:5, handling:3, kicking:3, stamina:4 },   // women's twelve only
];   // the six first, then the rest of the world, then the women's two; a nation's code never matches a club's (RSA, not a South African city's)
/* Local clubs: kit colours are the clubs' own. Each club's league line (league, place, w, d, l, pf, pa) is its last season's, real figures from
   PR #14's lists, read from the list and never saved (cleanSide and cleanTeam keep none of it). Its rating comes from that season (CLUB_RATED, src/ratings.js);
   the abilities written here are only how it plays. Quins has no line here: it is rated level with Farnham, as written here. Append only, never reorder. */
const CLUBS = [
  { id:'FAR', name:'Farnham',       kit:'#1a1a1a', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:4, kicking:3, stamina:3, league:'Regional 1 South Central', place:7, w:10, d:0, l:12, pf:640, pa:646 },
  { id:'HAS', name:'Haslemere',     kit:'#2244aa', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:3, kicking:2, stamina:3, league:'Counties 3 Surrey', place:9, w:4, d:0, l:16, pf:344, pa:598 },
  { id:'GUI', name:'Guildford',     kit:'#1a1e4f', trim:'#ffc014', pace:3, power:4, handling:3, kicking:3, stamina:3, league:'Regional 2 South Central', place:10, w:6, d:0, l:16, pf:442, pa:897 },
  { id:'ALD', name:'Aldershot',     kit:'#d8333a', trim:'#1b2747', pace:3, power:4, handling:2, kicking:3, stamina:4, league:'Counties 3 Hampshire', place:8, w:5, d:0, l:11, pf:335, pa:480 },
  { id:'WEY', name:'Weybridge',     kit:'#1a1a1a', trim:'#0f8040', pace:3, power:3, handling:4, kicking:3, stamina:3, league:'Counties 1 Surrey/Sussex', place:2, w:18, d:0, l:2, pf:770, pa:336 },
  { id:'QUI', name:'Quins',         kit:'#c8306f', trim:'#7eb0dc', pace:4, power:3, handling:4, kicking:3, stamina:3 },
  { id:'COB', name:'Cobham',        kit:'#26316f', trim:'#7a2338', hoops:true, pace:3, power:3, handling:3, kicking:3, stamina:3, league:'Counties 1 Surrey/Sussex', place:1, w:20, d:0, l:0, pf:920, pa:412 },
  { id:'GDN', name:'Guildfordians', kit:'#12482a', trim:'#6b1a3a', hoops:true, pace:3, power:3, handling:3, kicking:2, stamina:2, league:'Counties 5 Surrey', place:4, w:7, d:0, l:7, pf:422, pa:313 },
  { id:'IRO', name:'Ironsides',     kit:'#1f9a55', trim:'#c8191e', pace:3, power:4, handling:2, kicking:2, stamina:4, league:'Regional 2 South East', place:6, w:12, d:0, l:10, pf:660, pa:708 },
  { id:'KIN', name:'Kingston',      kit:'#7c1431', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Counties 3 Surrey', place:7, w:9, d:0, l:11, pf:565, pa:638 },
  { id:'ORU', name:'Old Ruts',      kit:'#2a3290', trim:'#f5c400', hoops:true, pace:4, power:3, handling:3, kicking:2, stamina:2, league:'Counties 1 Surrey/Sussex', place:7, w:9, d:1, l:10, pf:474, pa:585 },
  { id:'WIM', name:'Wimbledon',     kit:'#7c1956', trim:'#6cadde', hoops:true, pace:4, power:3, handling:3, kicking:3, stamina:4, league:'Regional 1 South Central', place:9, w:9, d:0, l:13, pf:661, pa:740 },
];
/* Professional sides go by their city, not the club's own name or nickname: the city is a place, the club name is a
   trademark. Kit colours follow the clubs' own, and no club tops a team you can make (5 + BUDGET). A side with a league line (PR #14's
   last-season figures) is rated from it in the real order of the tiers (CLUB_RATED, src/ratings.js): a top flight 67 to 72, and 75 only
   for a national champion; England 2 61 or 64; Scotland's amateur clubs 58 and 61, a step under the ratings written here. New Zealand
   and Japan have no figures and keep the ratings written here. The abilities written in a list are how a side plays (its flavour, TEAM_FLAVOUR).
   Codes are unique across every list, nations included. Append only, never reorder. */
const FRANCE = [   // the Top 14, rated by its 2025-26 table
  { id:'TLS', name:'Toulouse',    kit:'#d01f2e', trim:'#1c1c1c', pace:4, power:4, handling:3, kicking:3, stamina:3, league:'Top 14', place:1, w:18, d:0, l:8, pf:981, pa:617 },
  { id:'BOR', name:'Bordeaux',    kit:'#5c1a33', trim:'#f2efe6', pace:4, power:2, handling:4, kicking:2, stamina:3, league:'Top 14', place:8, w:14, d:0, l:12, pf:822, pa:719 },
  { id:'LRO', name:'La Rochelle', kit:'#f5c400', trim:'#1c1c1c', pace:3, power:4, handling:3, kicking:3, stamina:3, league:'Top 14', place:6, w:15, d:0, l:11, pf:824, pa:634 },
  { id:'TLN', name:'Toulon',      kit:'#1c1c1c', trim:'#d01f2e', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Top 14', place:9, w:12, d:1, l:13, pf:714, pa:820 },
  { id:'NAN', name:'Nanterre',    kit:'#7eb6e0', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:3, kicking:3, stamina:3, league:'Top 14', place:5, w:16, d:1, l:9, pf:828, pa:723 },
  { id:'PAR', name:'Paris',       kit:'#e2457f', trim:'#1b2747', pace:3, power:3, handling:4, kicking:3, stamina:3, league:'Top 14', place:3, w:15, d:1, l:10, pf:869, pa:664 },
  { id:'CLE', name:'Clermont',    kit:'#f5c400', trim:'#1b2747', pace:3, power:3, handling:3, kicking:3, stamina:3, league:'Top 14', place:7, w:15, d:0, l:11, pf:812, pa:708 },
  { id:'CAS', name:'Castres',     kit:'#2050b0', trim:'#f2efe6', pace:3, power:4, handling:2, kicking:3, stamina:3, league:'Top 14', place:10, w:11, d:0, l:15, pf:660, pa:751 },
  { id:'MPL', name:'Montpellier', kit:'#1b2747', trim:'#6fb7e6', pace:3, power:5, handling:3, kicking:3, stamina:3, league:'Top 14', place:2, w:17, d:1, l:8, pf:824, pa:587 },
  { id:'PAU', name:'Pau',         kit:'#0f7a3c', trim:'#f2efe6', pace:4, power:3, handling:3, kicking:3, stamina:3, league:'Top 14', place:4, w:17, d:0, l:9, pf:817, pa:665 },
  { id:'BAY', name:'Bayonne',     kit:'#6fb7e6', trim:'#f2efe6', pace:3, power:3, handling:2, kicking:3, stamina:3, league:'Top 14', place:12, w:11, d:0, l:15, pf:747, pa:869 },
  { id:'LYO', name:'Lyon',        kit:'#c8102e', trim:'#1c1c1c', hoops:true, pace:3, power:3, handling:3, kicking:2, stamina:3, league:'Top 14', place:11, w:11, d:1, l:14, pf:734, pa:774 },
  { id:'PGN', name:'Perpignan',   kit:'#f2b01e', trim:'#c8102e', pace:3, power:3, handling:2, kicking:3, stamina:3, league:'Top 14', place:13, w:6, d:0, l:20, pf:550, pa:797 },
  { id:'MTB', name:'Montauban',   kit:'#f2efe6', trim:'#2050b0', pace:3, power:3, handling:3, kicking:2, stamina:3, league:'Top 14', place:14, w:1, d:1, l:24, pf:495, pa:1349 },
];
const AUSTRALIA = [   // the four Super Rugby cities (rated by the 2026 table), Melbourne (in Super Rugby until 2024) and Adelaide, invented: no sixth professional side exists
  { id:'SYD', name:'Sydney',    kit:'#6fb7e6', trim:'#1b2747', pace:4, power:3, handling:3, kicking:2, stamina:3, league:'Super Rugby Pacific', place:8, w:5, d:0, l:9, pf:353, pa:402 },
  { id:'BRI', name:'Brisbane',  kit:'#a3162f', trim:'#f2efe6', pace:4, power:4, handling:3, kicking:2, stamina:3, league:'Super Rugby Pacific', place:5, w:8, d:0, l:6, pf:364, pa:386 },
  { id:'CAN', name:'Canberra',  kit:'#1b2747', trim:'#f2b01e', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Super Rugby Pacific', place:6, w:7, d:0, l:7, pf:402, pa:373 },
  { id:'PTH', name:'Perth',     kit:'#2050b0', trim:'#f2b01e', pace:3, power:3, handling:3, kicking:3, stamina:3, league:'Super Rugby Pacific', place:7, w:7, d:0, l:7, pf:358, pa:383 },
  { id:'MEL', name:'Melbourne', kit:'#14235a', trim:'#c8102e', hoops:true, pace:3, power:3, handling:3, kicking:2, stamina:3 },
  { id:'ADL', name:'Adelaide',  kit:'#c8102e', trim:'#1b2747', pace:3, power:3, handling:3, kicking:2, stamina:3 },
];
const SOUTH_AFRICA = [   // the URC four and the Currie Cup's next three, rated by the 2025-26 URC and the 2026 Currie Cup
  { id:'PRE', name:'Pretoria',     kit:'#2a5fb8', trim:'#f2efe6', pace:3, power:5, handling:3, kicking:3, stamina:3, league:'United Rugby Championship', place:4, w:12, d:0, l:6, pf:566, pa:406 },
  { id:'CPT', name:'Cape Town',    kit:'#1c1c1c', trim:'#2a5fb8', hoops:true, pace:4, power:4, handling:3, kicking:3, stamina:3, league:'United Rugby Championship', place:3, w:12, d:1, l:5, pf:504, pa:344 },
  { id:'DUR', name:'Durban',       kit:'#1c1c1c', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'United Rugby Championship', place:10, w:8, d:1, l:9, pf:467, pa:428 },
  { id:'JHB', name:'Johannesburg', kit:'#c8102e', trim:'#f2efe6', pace:4, power:3, handling:3, kicking:3, stamina:3, league:'United Rugby Championship', place:7, w:10, d:1, l:7, pf:532, pa:473 },
  { id:'BLM', name:'Bloemfontein', kit:'#e8731c', trim:'#f2efe6', pace:4, power:3, handling:2, kicking:2, stamina:3, league:'Currie Cup', place:2, w:5, d:0, l:2, pf:245, pa:226 },
  { id:'KIM', name:'Kimberley',    kit:'#f2efe6', trim:'#b0b4ba', pace:3, power:3, handling:3, kicking:2, stamina:3, league:'Currie Cup', place:1, w:6, d:0, l:1, pf:271, pa:143 },
  { id:'MBO', name:'Mbombela',     kit:'#d8a823', trim:'#1c1c1c', pace:3, power:4, handling:2, kicking:2, stamina:3, league:'Currie Cup', place:3, w:4, d:0, l:3, pf:201, pa:195 },
];
const ENGLAND = [   // the Premiership, rated by its 2025-26 table. London North and London West are the two London clubs; Quins in Local is the amateur club
  { id:'BTH', name:'Bath',         kit:'#1d4fa0', trim:'#1c1c1c', pace:4, power:4, handling:3, kicking:3, stamina:3, league:'English Premiership', place:2, w:13, d:0, l:5, pf:646, pa:424 },
  { id:'BRS', name:'Bristol',      kit:'#14235a', trim:'#f2efe6', pace:3, power:3, handling:4, kicking:2, stamina:3, league:'English Premiership', place:6, w:11, d:0, l:7, pf:525, pa:509 },
  { id:'EXE', name:'Exeter',       kit:'#1c1c1c', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:3, stamina:3, league:'English Premiership', place:3, w:11, d:1, l:6, pf:521, pa:367 },
  { id:'GLO', name:'Gloucester',   kit:'#a4123f', trim:'#f2efe6', hoops:true, pace:3, power:4, handling:2, kicking:2, stamina:3, league:'English Premiership', place:8, w:5, d:0, l:13, pf:424, pa:576 },
  { id:'LEI', name:'Leicester',    kit:'#0f5a32', trim:'#c8102e', pace:3, power:4, handling:3, kicking:3, stamina:3, league:'English Premiership', place:4, w:12, d:0, l:6, pf:583, pa:405 },
  { id:'NCL', name:'Newcastle',    kit:'#1c1c1c', trim:'#c8102e', pace:3, power:3, handling:3, kicking:2, stamina:3, league:'English Premiership', place:10, w:2, d:0, l:16, pf:325, pa:860 },
  { id:'NTH', name:'Northampton',  kit:'#0f6b3a', trim:'#1c1c1c', hoops:true, pace:4, power:3, handling:4, kicking:3, stamina:3, league:'English Premiership', place:1, w:14, d:1, l:3, pf:693, pa:536 },
  { id:'SAL', name:'Sale',         kit:'#1b2747', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'English Premiership', place:7, w:5, d:0, l:13, pf:524, pa:602 },
  { id:'LNO', name:'London North', kit:'#1c1c1c', trim:'#c8102e', pace:3, power:4, handling:2, kicking:3, stamina:3, league:'English Premiership', place:5, w:10, d:0, l:8, pf:628, pa:449 },
  { id:'LWE', name:'London West',  kit:'#7eb0dc', trim:'#c8306f', pace:4, power:2, handling:3, kicking:2, stamina:3, league:'English Premiership', place:9, w:6, d:0, l:12, pf:448, pa:589 },
];
const CELTIC = [   // Ireland, Scotland, Wales and Italy's professional sides, in one league, rated by its 2025-26 table
  { id:'DUB', name:'Dublin',    kit:'#1f4fa8', trim:'#f2b01e', pace:4, power:4, handling:3, kicking:3, stamina:3, league:'United Rugby Championship', place:2, w:12, d:0, l:6, pf:515, pa:370 },
  { id:'LIM', name:'Limerick',  kit:'#c8102e', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:3, stamina:3, league:'United Rugby Championship', place:5, w:11, d:0, l:7, pf:396, pa:376 },
  { id:'BEL', name:'Belfast',   kit:'#f2efe6', trim:'#c8102e', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'United Rugby Championship', place:9, w:9, d:1, l:8, pf:494, pa:420 },
  { id:'GAL', name:'Galway',    kit:'#0f5a32', trim:'#f2b01e', pace:3, power:3, handling:4, kicking:3, stamina:3, league:'United Rugby Championship', place:8, w:10, d:0, l:8, pf:442, pa:395 },
  { id:'EDI', name:'Edinburgh', kit:'#14235a', trim:'#e8731c', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'United Rugby Championship', place:12, w:7, d:0, l:11, pf:362, pa:439 },
  { id:'GLA', name:'Glasgow',   kit:'#1c1c1c', trim:'#6fb7e6', pace:4, power:3, handling:4, kicking:3, stamina:3, league:'United Rugby Championship', place:1, w:13, d:0, l:5, pf:479, pa:338 },
  { id:'CDF', name:'Cardiff',   kit:'#6fb7e6', trim:'#1c1c1c', pace:4, power:3, handling:3, kicking:3, stamina:3, league:'United Rugby Championship', place:6, w:11, d:0, l:7, pf:353, pa:372 },
  { id:'SWA', name:'Swansea',   kit:'#1c1c1c', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:3, stamina:3, league:'United Rugby Championship', place:11, w:7, d:2, l:9, pf:376, pa:454 },
  { id:'LLA', name:'Llanelli',  kit:'#c8102e', trim:'#f2efe6', pace:4, power:2, handling:3, kicking:2, stamina:3, league:'United Rugby Championship', place:14, w:4, d:2, l:12, pf:361, pa:460 },
  { id:'NPT', name:'Newport',   kit:'#1c1c1c', trim:'#e8731c', pace:3, power:4, handling:2, kicking:2, stamina:3, league:'United Rugby Championship', place:15, w:3, d:4, l:11, pf:350, pa:481 },
  { id:'TRE', name:'Treviso',   kit:'#0f7a3c', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:2, stamina:2, league:'United Rugby Championship', place:13, w:6, d:2, l:10, pf:327, pa:493 },
  { id:'PRM', name:'Parma',     kit:'#1b2747', trim:'#f2b01e', pace:4, power:3, handling:3, kicking:2, stamina:2, league:'United Rugby Championship', place:16, w:2, d:0, l:16, pf:312, pa:587 },
];
const NEW_ZEALAND = [   // the five Super Rugby cities (rated by the 2026 table) and Taranaki, a provincial side
  { id:'AKL', name:'Auckland',     kit:'#1b3a8c', trim:'#f2efe6', pace:4, power:4, handling:3, kicking:2, stamina:3 },
  { id:'HMN', name:'Hamilton',     kit:'#1c1c1c', trim:'#c8102e', pace:4, power:4, handling:3, kicking:3, stamina:3 },
  { id:'WLG', name:'Wellington',   kit:'#f5c400', trim:'#1c1c1c', pace:4, power:3, handling:4, kicking:3, stamina:3 },
  { id:'CHC', name:'Christchurch', kit:'#c8102e', trim:'#1c1c1c', pace:3, power:4, handling:3, kicking:3, stamina:3 },
  { id:'DUN', name:'Dunedin',      kit:'#1b2747', trim:'#f2b01e', pace:3, power:3, handling:3, kicking:3, stamina:3 },
  { id:'TAR', name:'Taranaki',     kit:'#f2a900', trim:'#1c1c1c', hoops:true, pace:3, power:3, handling:3, kicking:2, stamina:3 },
];
const JAPAN = [   // League One, by city or prefecture, rated by its 2025-26 table
  { id:'TOK', name:'Tokyo',     kit:'#f5c400', trim:'#1c1c1c', pace:4, power:3, handling:4, kicking:2, stamina:3 },
  { id:'SAI', name:'Saitama',   kit:'#1d3a8f', trim:'#f2efe6', pace:4, power:4, handling:3, kicking:3, stamina:3 },
  { id:'FNB', name:'Funabashi', kit:'#e8731c', trim:'#1b2747', pace:3, power:3, handling:4, kicking:3, stamina:3 },
  { id:'AIC', name:'Aichi',     kit:'#c8102e', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:2, stamina:3 },
  { id:'KOB', name:'Kobe',      kit:'#a4141f', trim:'#1c1c1c', pace:4, power:3, handling:4, kicking:3, stamina:3 },
  { id:'SHZ', name:'Shizuoka',  kit:'#2050b0', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:2, stamina:3 },
  { id:'YOK', name:'Yokohama',  kit:'#1c1c1c', trim:'#c8102e', pace:3, power:3, handling:3, kicking:2, stamina:3 },
];
const SCOTLAND = [   // the Scottish Premiership, 2025-26, in its table's order: amateur club sides by town, or by district or ground in a city with several (Edinburgh and Glasgow are the pro sides, in CELTIC)
  { id:'AYR', name:'Ayr',        kit:'#c2185b', trim:'#1c1c1c', hoops:true, pace:3, power:3, handling:3, kicking:2, stamina:2 },
  { id:'CUR', name:'Currie',     kit:'#f2a900', trim:'#1c1c1c', pace:3, power:3, handling:2, kicking:2, stamina:3 },
  { id:'GOL', name:'Goldenacre', kit:'#2050b0', trim:'#f2efe6', hoops:true, pace:3, power:2, handling:3, kicking:2, stamina:3 },
  { id:'MYR', name:'Myreside',   kit:'#7a1f2b', trim:'#f2efe6', hoops:true, pace:2, power:3, handling:3, kicking:2, stamina:3 },
  { id:'KEL', name:'Kelso',      kit:'#1c1c1c', trim:'#f2efe6', hoops:true, pace:2, power:3, handling:3, kicking:3, stamina:2 },
  { id:'GIF', name:'Giffnock',   kit:'#c8102e', trim:'#0f6b3a', hoops:true, pace:3, power:2, handling:2, kicking:3, stamina:2 },
  { id:'HAW', name:'Hawick',     kit:'#1f7a3a', trim:'#f2efe6', pace:3, power:3, handling:2, kicking:2, stamina:2 },
  { id:'MLR', name:'Melrose',    kit:'#f5c400', trim:'#1c1c1c', hoops:true, pace:2, power:3, handling:3, kicking:2, stamina:2 },
  { id:'ANN', name:'Anniesland', kit:'#b3121f', trim:'#f5c400', pace:3, power:2, handling:3, kicking:2, stamina:2 },
  { id:'SEL', name:'Selkirk',    kit:'#1b2747', trim:'#f2efe6', pace:2, power:3, handling:2, kicking:2, stamina:3 },
];
/* England's second tier, the English Championship, in last season's table order (regular season, before the play-offs), from PR #14. Thirteen
   of its fourteen: the side from London is left out, because London is taken by the top flight's sides and it was relegated. Rated 64 with
   a winning record, else 61, PR #14's own figures: under every top-flight side, and above every Local and Counties side (CLUB_RATED).
   No two sides here share a shirt and a trim at a glance: where a club's own colours are close to another's, one wears hoops or the darker
   shade. Weak sources, as PR #14 flagged them: Chinnor, Hartpury's hoops, Cornwall's trim, Doncaster, Nottingham's hoops, Ampthill's shade
   and hoops and Caldy's hoops could not be sourced and are a free choice. Append only, never reorder. */
const ENGLAND_TWO = [
  { id:'EAL', name:'Ealing',     kit:'#0f5a32', trim:'#f2efe6', pace:4, power:4, handling:4, kicking:3, stamina:3, league:'English Championship', place:1, w:26, d:0, l:0, pf:1125, pa:435 },
  { id:'BED', name:'Bedford',    kit:'#14235a', trim:'#6fb7e6', hoops:true, pace:3, power:4, handling:3, kicking:3, stamina:3, league:'English Championship', place:2, w:18, d:1, l:7, pf:802, pa:643 },
  { id:'COV', name:'Coventry',   kit:'#14307a', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:4, kicking:3, stamina:3, league:'English Championship', place:3, w:16, d:0, l:10, pf:1053, pa:723 },
  { id:'WOR', name:'Worcester',  kit:'#14235a', trim:'#f2b01e', pace:3, power:4, handling:4, kicking:3, stamina:3, league:'English Championship', place:4, w:15, d:0, l:11, pf:899, pa:652 },
  { id:'CHN', name:'Chinnor',    kit:'#f2efe6', trim:'#1c1c1c', pace:3, power:3, handling:3, kicking:3, stamina:4, league:'English Championship', place:5, w:16, d:0, l:10, pf:697, pa:635 },   // colours a free choice
  { id:'HPY', name:'Hartpury',   kit:'#c8102e', trim:'#1c1c1c', hoops:true, pace:4, power:3, handling:3, kicking:3, stamina:4, league:'English Championship', place:6, w:15, d:2, l:9, pf:772, pa:632 },   // hoops a free choice
  { id:'CWL', name:'Cornwall',   kit:'#1c1c1c', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:2, stamina:4, league:'English Championship', place:7, w:13, d:1, l:12, pf:770, pa:671 },   // trim a free choice
  { id:'DON', name:'Doncaster',  kit:'#2050b0', trim:'#c8102e', pace:3, power:4, handling:3, kicking:3, stamina:3, league:'English Championship', place:8, w:12, d:3, l:11, pf:729, pa:655 },   // colours a free choice
  { id:'NOT', name:'Nottingham', kit:'#109a52', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:4, kicking:3, stamina:3, league:'English Championship', place:9, w:12, d:1, l:13, pf:639, pa:647 },   // hoops a free choice
  { id:'AMP', name:'Ampthill',   kit:'#5e0f24', trim:'#f2b01e', hoops:true, pace:3, power:4, handling:3, kicking:3, stamina:3, league:'English Championship', place:10, w:12, d:0, l:14, pf:828, pa:890 },   // shade and hoops a free choice
  { id:'CAL', name:'Caldy',      kit:'#1c1c1c', trim:'#f5c400', hoops:true, pace:3, power:3, handling:3, kicking:3, stamina:3, league:'English Championship', place:11, w:9, d:0, l:17, pf:574, pa:814 },   // hoops a free choice
  { id:'RIC', name:'Richmond',   kit:'#f2b01e', trim:'#1c1c1c', hoops:true, pace:4, power:3, handling:3, kicking:2, stamina:3, league:'English Championship', place:12, w:7, d:1, l:18, pf:525, pa:823 },
  { id:'CAM', name:'Cambridge',  kit:'#a3162f', trim:'#f2b01e', pace:3, power:3, handling:3, kicking:2, stamina:3, league:'English Championship', place:14, w:0, d:1, l:25, pf:447, pa:1190 },
];
/* The foot of the game, from PR #14: Counties 5 Surrey, the league Guildfordians play in, in last season's table order, with one side from
   Counties 3 Surrey above them. Guildfordians is the Local list's own object, so it stays one team with one code (ALL_TEAMS keeps it once).
   Rated 43 for Counties 5 and 46 for Counties 3, the foot of the ladder, as Local's own Counties sides are (CLUB_RATED). Weak sources, as
   PR #14 flagged them: Egham's and Mitcham's colours could not be sourced and are a free choice. Append only, never reorder. */
const COUNTIES = [
  { id:'EFF', name:'Effingham',  kit:'#f2b01e', trim:'#0f5a32', pace:3, power:3, handling:3, kicking:3, stamina:3, league:'Counties 3 Surrey', place:2, w:16, d:0, l:4, pf:773, pa:291 },
  { id:'WAN', name:'Wandsworth', kit:'#7a1f2b', trim:'#f2b01e', pace:3, power:3, handling:3, kicking:3, stamina:3, league:'Counties 5 Surrey', place:3, w:10, d:1, l:3, pf:420, pa:335 },
  CLUBS[7],
  { id:'EGH', name:'Egham',      kit:'#109a52', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:2, stamina:3, league:'Counties 5 Surrey', place:5, w:7, d:0, l:7, pf:366, pa:406 },   // colours a free choice
  { id:'MER', name:'Merton',     kit:'#1c1c1c', trim:'#f2b01e', hoops:true, pace:3, power:3, handling:2, kicking:3, stamina:3, league:'Counties 5 Surrey', place:6, w:1, d:0, l:13, pf:114, pa:678 },
  { id:'MIT', name:'Mitcham',    kit:'#2050b0', trim:'#f2efe6', pace:3, power:2, handling:3, kicking:3, stamina:3, league:'Counties 5 Surrey', place:7, w:4, d:0, l:10, pf:180, pa:281 },   // colours a free choice
  { id:'FEL', name:'Feltham',    kit:'#1b2747', trim:'#6fb7e6', pace:3, power:3, handling:3, kicking:2, stamina:2, league:'Counties 5 Surrey', place:10, w:1, d:0, l:13, pf:230, pa:409 },
];
/* The team screen: International | National | Local, then a list. Every list offers at least six sides, since a championship is
   your side and five from the list on screen. settings.pool holds a list's key; 'my' is My League (src/import.js), under Local while
   a league is saved. Keys never change: the save keeps them. */
const TEAM_TIERS = ['International', 'National', 'Local'];
const TEAM_LISTS = [
  { key:'int', tier:0, name:'International',    teams:NATIONS },   // every nation, for the codes and the saves; the screen shows the category's twelve (natList)
  { key:'eng', tier:1, name:'England',          teams:ENGLAND },
  { key:'en2', tier:1, name:'England 2',        teams:ENGLAND_TWO },   // PR #14's second tier
  { key:'fra', tier:1, name:'France',           teams:FRANCE },
  { key:'cel', tier:1, name:'United Rugby Championship', teams:CELTIC },   // the real name (the owner, 9 Nov: generic enough); its key stays 'cel', as saves, the European Cup and settings.pool hold it
  { key:'sco', tier:1, name:'Scotland',         teams:SCOTLAND },
  { key:'rsa', tier:1, name:'South Africa',     teams:SOUTH_AFRICA },
  { key:'aus', tier:1, name:'Australia',        teams:AUSTRALIA },
  { key:'nzl', tier:1, name:'New Zealand',      teams:NEW_ZEALAND },
  { key:'jpn', tier:1, name:'Japan',            teams:JAPAN },
  { key:'sur', tier:2, name:'Surrey',           teams:CLUBS },
  { key:'cty', tier:2, name:'Counties',         teams:COUNTIES },      // PR #14's foot of the game; Guildfordians is Surrey's own object
];
const POOLS = TEAM_LISTS.map(l => l.teams);   // every built-in list
const NATIONAL = TEAM_LISTS.filter(l => l.tier === 1).map(l => l.teams);   // the national leagues: Career's transfer offers come from these
/* Saves from before the hierarchy hold an index into the old five lists and My League (International, Local, France, Australia,
   South Africa, My League). Each goes to the list it was; anything else to International, as a bad choice always has. */
const POOL_OLD = ['int', 'sur', 'fra', 'aus', 'rsa', 'my'];
function poolKey(v) {
  if (Number.isInteger(v) && v >= 0 && v < POOL_OLD.length) return POOL_OLD[v];
  return v === 'my' || TEAM_LISTS.some(l => l.key === v) ? v : 'int';
}
const ALL_TEAMS = [...new Set(POOLS.flat())];   // every side once: Guildfordians is in Surrey and in Counties, one team
/* Where the team screen's ladder puts each list (pickLadder, src/ui-menus.js): North or South by country, then the country's lists. A list
   is one country's, bar the United Rugby Championship, whose sides go by URC_HOME; Surrey and Counties are England's Local. Japan plays
   in the North (the owner, 2026-11-11: "Looks Right"); Canada and the USA are the women's. A list's group takes its sides' competition
   (LEAGUE_SHORT) where they all share one, else LIST_GROUP's name, else Clubs. Views only: the lists, their keys and every save are as
   they were, and a side picked from a group still plays its whole list (Dublin in the URC). */
const NATION_HEMI = { IRE:'north', FRA:'north', ENG:'north', SCO:'north', WAL:'north', ITA:'north', JPN:'north', CDN:'north', USA:'north', RSA:'south', NZL:'south', AUS:'south', ARG:'south', FIJ:'south' };
const LIST_HOME = { eng:'ENG', en2:'ENG', fra:'FRA', sco:'SCO', rsa:'RSA', aus:'AUS', nzl:'NZL', jpn:'JPN', sur:'ENG', cty:'ENG' };
const URC_HOME = { DUB:'IRE', LIM:'IRE', BEL:'IRE', GAL:'IRE', EDI:'SCO', GLA:'SCO', CDF:'WAL', SWA:'WAL', LLA:'WAL', NPT:'WAL', TRE:'ITA', PRM:'ITA' };
const LIST_LOCAL = ['sur', 'cty'];
const LEAGUE_SHORT = { 'English Premiership':'Premiership', 'English Championship':'Championship', 'Top 14':'Top 14', 'United Rugby Championship':'URC', 'Currie Cup':'Currie Cup', 'Super Rugby Pacific':'Super Rugby' };
const LIST_GROUP = { sco:'Premiership', nzl:'Provinces' };   // sides with no league line: Scotland's are the Scottish Premiership, New Zealand's the provinces
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
/* International is each category's own twelve, in its World Rugby table's order: the men's from NATIONS, the women's with their own
   ratings and Canada and the USA in place of Argentina and Japan, Minis the men's. Each is named for its category by catSide
   ('England Women'); on Men the list is the NATIONS objects themselves, so a men's match gets the very teams it always did. */
const NAT_MEN = ['RSA', 'NZL', 'IRE', 'FRA', 'ENG', 'SCO', 'AUS', 'ARG', 'FIJ', 'WAL', 'ITA', 'JPN'];   // men's table, 3 November 2026: ratings in NATIONS
const NAT_WOMEN = {   // women's table, 2 November 2026: Pace, Power, Handling, Kicking, Stamina
  ENG:[4, 5, 4, 5, 5], NZL:[5, 4, 5, 4, 5], CDN:[4, 5, 4, 4, 5], FRA:[5, 5, 4, 3, 4], IRE:[4, 3, 5, 5, 3], USA:[5, 5, 3, 3, 4],
  AUS:[5, 4, 4, 4, 3], ITA:[4, 4, 4, 3, 4], SCO:[5, 4, 4, 3, 3], RSA:[4, 5, 3, 3, 3], WAL:[4, 4, 3, 4, 3], FIJ:[5, 3, 5, 2, 3],
};
const SIX_NATIONS = ['ENG', 'FRA', 'IRE', 'ITA', 'SCO', 'WAL'];
const NAT_LISTS = {};
function natList(cat) {                  // 'men', 'women' or 'minis' (men's ratings); anything else is men's. Built once, then the same objects
  const c = cat === 'women' || cat === 'minis' ? cat : 'men', by = id => NATIONS.find(t => t.id === id);
  if (!NAT_LISTS[c]) NAT_LISTS[c] = c === 'women'
    ? Object.entries(NAT_WOMEN).map(([id, r]) => { const t = catSide(by(id), 'women'); ABILITIES.forEach(([k], i) => { t[k] = r[i]; }); return t; })
    : NAT_MEN.map(id => catSide(by(id), c));
  return NAT_LISTS[c];
}
const isNation = t => !!t && !t.custom && NATIONS.some(n => n.id === t.id);
/* A side for the category: a nation is the category's own (null for one its list does not have: Canada or the USA on Men or Minis),
   anything else catSide's. */
function catTeam(t, cat) { return isNation(t) ? natList(cat).find(n => n.id === t.id) || null : catSide(t, cat); }
/* A nation's championship, and Career's International stage: the Six Nations, or the other six of its category's twelve, by who is
   in it, never by position, so the Triple Crown is there to win on every list. */
function natGroup(id, cat) { const six = SIX_NATIONS.includes(id); return natList(cat).filter(t => SIX_NATIONS.includes(t.id) === six); }
/* The name a list shows: the side's own, without its category's word, as the club cards show it (England Women is England). */
const listName = t => { const c = TEAM_CATS.find(x => x.id === t.cat), n = String(t.name); return c && c.tag && n.endsWith(c.tag) ? n.slice(0, -c.tag.length) : n; };
/* Who plays on a side, for the drawing (looks.js, and the Blender players in render-art.js): 0 men's, 1 women's, 'mixed'. Men | Women |
   Minis is the one control: a Women side is women's and a Minis side mixed; anything else is men's. Every match is one category (catTeam),
   so sidesMeet only guards a damaged call. MIXED_THROUGH is the one lever, the oldest age group that plays mixed. The game follows England:
   mixed through U11, girls-only from U12. Ireland and Australia run through U12, New Zealand through U13, and World Rugby's law is the end
   of the season a player turns 12. Wales and Scotland were not confirmed. */
const MIXED_THROUGH = 11;
const teamSide = t => (t && (t.g === 1 || t.g === 'mixed') ? t.g : catOf(t) === 'women' ? 1 : catOf(t) === 'minis' ? 'mixed' : 0);   // a g of its own wins (PR #14's field: no team in the merged game carries one yet, a squad entry's look may)
const sidesMeet = (a, b) => { const x = teamSide(a), y = teamSide(b); return x === y || x === 'mixed' || y === 'mixed'; };
const allNations = () => NATIONS;
const ABILITIES = [['pace', 'Pace'], ['power', 'Power'], ['handling', 'Handling'], ['kicking', 'Kicking'], ['stamina', 'Stamina']];
const BUDGET = 12;                        // a team with no level, saved before levels: it starts at 1 in each ability with this many points to spend, any team the four-ability builder allowed (10 points) plus Stamina 3. A team with a level spends its level's budget (TEAM_LEVELS, src/ratings.js)
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
/* The overall rating on a team card: the five abilities (5 to 25) on a 40 to 99 scale. A team you make tops out at 75; South Africa and New Zealand are 93, Ireland and France 87. */
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

/* ---------- rule sets ----------
   A match plays one rule set (M.rules, chosen in newMatch). The same three are meant to hold wherever the game is played:
   a match, a career stage and a drill. In this build every match plays Normal, exactly as before. Junior and Minis are
   written down here from the RFU's Age Grade Rules of Play (Regulation 15: Under 9s, Transitional Contact; Under 8s, Tag
   Rugby; the 2025-26 copies), kept simple. They are marked pending: the engine does not play them yet, and nothing reads them.
   Close-ups for call-outs and events stay under every rule set, wherever the event still exists.
   restarts: why play stopped -> how it restarts. The place that stops play says why, which side gets the ball and where;
   this table alone says what follows. playOn: taken even after the hooter. */
const RESTARTS_NORMAL = {
  halfStart:      { kind:'kickoff', playOn:true },
  afterScore:     { kind:'kickoff' },
  knockOn:        { kind:'scrum',   label:'Knock-On' },
  heldInGoal:     { kind:'scrum',   label:'Held in Goal' },
  maulHeldUp:     { kind:'scrum',   label:'Held Up' },
  deadBallCarried:{ kind:'scrum',   label:'Dead Ball' },
  touchCarried:   { kind:'lineout', label:'Into Touch' },
  touchKick:      { kind:'lineout', label:'Into Touch' },
  outOnFull:      { kind:'lineout', label:'Out on the Full' },
  touchLoose:     { kind:'lineout', label:'Into Touch' },
  fiftyTwentyTwo: { kind:'lineout', label:'50:22' },
  penaltyTouch:   { kind:'lineout', label:'Kick to Touch', playOn:true },
  groundedInGoal: { kind:'dropOut' },
  deadBallLoose:  { kind:'dropOut' },
  goalMissed:     { kind:'dropOut' },
  ruckPenalty:    { kind:'penalty', playOn:true },
  scrumPenalty:   { kind:'penalty', playOn:true },
};
const POINTS_NORMAL = { try:5, conversion:2, penalty:3, dropGoal:3 };
/* Junior and Minis: every stoppage is a free pass to the side that gets the ball, the other side 7m back. at: where it is taken.
   centre: halfway. mark: where it happened. in5: 5m in from touch. touch: on the touchline. Any mark within 7m of a goal line
   is moved out to 7m. The kicking rows of Normal (a kick to touch, out on the full, 50:22, a missed goal) cannot happen. */
const fp = at => ({ kind:'freePass', at });
const RESTARTS_JUNIOR = { halfStart:{ ...fp('centre'), playOn:true }, afterScore:fp('centre'), knockOn:fp('mark'), infringement:fp('mark'), tackleLimit:fp('mark'),
  touchCarried:fp('in5'), touchLoose:fp('in5'), heldInGoal:fp('mark'), deadBallCarried:fp('mark'), groundedInGoal:fp('mark'), deadBallLoose:fp('mark') };
const RESTARTS_MINIS = { ...RESTARTS_JUNIOR, touchCarried:fp('touch'), touchLoose:fp('touch') };
const POINTS_TRIES = { try:5 };                             // tries only: no kicking, so no conversions, penalty goals or drop goals. The RFU text gives a try no value; 5 keeps the tables working
const RULES = {
  normal: { id:'normal', name:'Normal', contact:'tackle', rucks:true, scrums:true, lineouts:true, kicking:true, fend:true,
    points:POINTS_NORMAL, restarts:RESTARTS_NORMAL },
  // Under 9s. A tackle is not contested: the carrier passes within 3 seconds and the tackler lets him. The tackle is below the base of the sternum.
  // tackles: the RFU's optional variation, agreed by the coaches: six tackles, and the seventh hands the ball over. Set to 0 to play without it.
  junior: { id:'junior', name:'Junior', contact:'tackle', rucks:false, scrums:false, lineouts:false, kicking:false, fend:false,
    afterContact:{ passWithin:3, contest:false, limit:6 }, freePassBack:7,
    real:{ perSide:7, pitch:[60, 30], inGoal:5, halfMinutes:15 },
    points:POINTS_TRIES, restarts:RESTARTS_JUNIOR, pending:true },
  // Under 8s. A tag, not a tackle: the carrier stops inside about three strides and passes within 3 seconds. The seventh tag hands the ball over (in the rules, not optional).
  minis: { id:'minis', name:'Minis', contact:'tag', rucks:false, scrums:false, lineouts:false, kicking:false, fend:false,
    afterContact:{ passWithin:3, contest:false, limit:6 }, freePassBack:7,
    real:{ perSide:6, pitch:[45, 22], inGoal:5, halfMinutes:10 },
    points:POINTS_TRIES, restarts:RESTARTS_MINIS, pending:true },
};
/* Which rule set a match plays, from the player's age group (the Under-N he plays in: a 12-year-old plays Under 13s).
   Three bands: Under 7s and 8s play Minis, Under 9s to 12s play Junior, Under 13s and up play Normal. A national or
   professional side always plays Normal, whatever the player's age. Not called yet: every match still plays Normal. */
const RULE_BANDS = [{ upTo:8, rules:'minis' }, { upTo:12, rules:'junior' }, { upTo:Infinity, rules:'normal' }];
const rulesForAge = under => RULE_BANDS.find(b => under <= b.upTo).rules;
const rulesFor = (under, national) => national || under == null ? 'normal' : rulesForAge(under);
const STEP = 1/60;
/* How fast a match you see runs against real time: the one lever. The frame loop (boot.js) feeds the sim and the drawing dt times this, so a step is still 1/60 of a simulated second and update() never knows: seeded results per simulated second, the bots and the headless tools are as they were. Every window a person has to hit widens by 1/pace in real time, and a half takes that much longer. Two Player and the menu demo run at match; only M.kids reads kids; the Training Ground has its own (DRILL_PACE). */
const MATCH_PACE = { match:0.88, kids:0.75 };

const $ = id => document.getElementById(id);
const clamp = (v,a,b) => v < a ? a : v > b ? b : v;
const rnd = Math.random;
const hyp = Math.hypot;
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
const dist = (a,b) => hyp(a.x-b.x, a.y-b.y);
const shuffle = a => { for (let i = a.length-1; i > 0; i--) { const j = Math.floor(rnd()*(i+1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };   // a sort with a random comparator is far from fair in Safari

