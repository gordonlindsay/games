'use strict';
let practice = null;

/* =========================================================
   Data
   ========================================================= */
const NATIONS = [   // order fixed: championships saved before clubs existed index into it
  { id:'ENG', name:'England',  kit:'#f2efe6', trim:'#c8102e', alt:'#1b2747', altTrim:'#c8102e', pace:4, power:5, handling:3, kicking:4, stamina:4, home:true },
  { id:'FRA', name:'France',   kit:'#1d3a8f', trim:'#f2efe6', alt:'#f2efe6', altTrim:'#1d3a8f', pace:5, power:5, handling:4, kicking:4, stamina:5 },
  { id:'IRE', name:'Ireland',  kit:'#109a52', trim:'#f2efe6', alt:'#f2efe6', altTrim:'#109a52', pace:4, power:4, handling:5, kicking:5, stamina:5, home:true },
  { id:'ITA', name:'Italy',    kit:'#2f7ed8', trim:'#f2efe6', alt:'#f2efe6', altTrim:'#2f7ed8', pace:4, power:3, handling:3, kicking:3, stamina:3 },
  { id:'SCO', name:'Scotland', kit:'#1a2a5e', trim:'#f2efe6', alt:'#f2efe6', altTrim:'#1a2a5e', pace:5, power:3, handling:4, kicking:3, stamina:4, home:true },
  { id:'WAL', name:'Wales',    kit:'#c8102e', trim:'#f2efe6', alt:'#1c1c1c', altTrim:'#c8102e', pace:3, power:4, handling:3, kicking:3, stamina:4, home:true },
];
/* Local clubs: kit colours are the clubs' own, ratings follow last season's results (src/ratings.js), and league, place, w, d, l, pf, pa are
   that season's line, real figures read from the list and never saved. Append only, never reorder. */
const CLUBS = [
  { id:'FAR', name:'Farnham',       kit:'#1a1a1a', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:4, kicking:3, stamina:3, league:'Regional 1 South Central', place:7, w:10, d:0, l:12, pf:640, pa:646 },
  { id:'HAS', name:'Haslemere',     kit:'#2244aa', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:3, kicking:2, stamina:3, league:'Counties 3 Surrey', place:9, w:4, d:0, l:16, pf:344, pa:598 },
  { id:'GUI', name:'Guildford',     kit:'#1a1e4f', trim:'#ffc014', pace:3, power:4, handling:3, kicking:3, stamina:3, league:'Regional 2 South Central', place:10, w:6, d:0, l:16, pf:442, pa:897 },
  { id:'ALD', name:'Aldershot',     kit:'#d8333a', trim:'#1b2747', pace:3, power:4, handling:2, kicking:3, stamina:4, league:'Counties 3 Hampshire', place:8, w:5, d:0, l:11, pf:335, pa:480 },
  { id:'WEY', name:'Weybridge',     kit:'#1a1a1a', trim:'#0f8040', pace:3, power:3, handling:4, kicking:3, stamina:3, league:'Counties 1 Surrey/Sussex', place:2, w:18, d:0, l:2, pf:770, pa:336 },
  { id:'HAR', name:'Twickenham',    kit:'#c8306f', trim:'#7eb0dc', pace:4, power:3, handling:4, kicking:3, stamina:3, league:'English Premiership', place:9, w:6, d:0, l:12, pf:448, pa:589 },
  { id:'COB', name:'Cobham',        kit:'#26316f', trim:'#7a2338', hoops:true, pace:3, power:3, handling:3, kicking:3, stamina:3, league:'Counties 1 Surrey/Sussex', place:1, w:20, d:0, l:0, pf:920, pa:412 },
  { id:'GDN', name:'Guildfordians', kit:'#12482a', trim:'#6b1a3a', hoops:true, pace:3, power:3, handling:3, kicking:2, stamina:2, league:'Counties 5 Surrey', place:4, w:7, d:0, l:7, pf:422, pa:313 },
  { id:'IRO', name:'Ironsides',     kit:'#1f9a55', trim:'#c8191e', pace:3, power:4, handling:2, kicking:2, stamina:4, league:'Regional 2 South East', place:6, w:12, d:0, l:10, pf:660, pa:708 },
  { id:'KIN', name:'Kingston',      kit:'#7c1431', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Counties 3 Surrey', place:7, w:9, d:0, l:11, pf:565, pa:638 },
  { id:'ORU', name:'Old Ruts',      kit:'#2a3290', trim:'#f5c400', hoops:true, pace:4, power:3, handling:3, kicking:2, stamina:2, league:'Counties 1 Surrey/Sussex', place:7, w:9, d:1, l:10, pf:474, pa:585 },
  { id:'WIM', name:'Wimbledon',     kit:'#7c1956', trim:'#6cadde', hoops:true, pace:4, power:3, handling:3, kicking:3, stamina:4, league:'Regional 1 South Central', place:9, w:9, d:0, l:13, pf:661, pa:740 },
];
/* Professional sides go by their city, not the club's own name or nickname: the city is a place, the club name is a
   trademark. That goes for the Local list's one professional side too: Twickenham, code HAR so saves still find it (cleanSide). Kit colours follow the clubs' own; ratings follow last season's results (CLUB_RATED, src/ratings.js).
   Codes are unique across every list, nations included. Append only, never reorder. */
const FRANCE = [   // the Top 14
  { id:'TLS', name:'Toulouse',    kit:'#d01f2e', trim:'#1c1c1c', pace:4, power:4, handling:3, kicking:3, stamina:3, league:'Top 14', place:1, w:18, d:0, l:8, pf:981, pa:617 },
  { id:'BOR', name:'Bordeaux',    kit:'#5c1a33', trim:'#f2efe6', pace:4, power:3, handling:4, kicking:3, stamina:3, league:'Top 14', place:8, w:14, d:0, l:12, pf:822, pa:719 },
  { id:'LRO', name:'La Rochelle', kit:'#f5c400', trim:'#1c1c1c', pace:3, power:4, handling:3, kicking:3, stamina:4, league:'Top 14', place:6, w:15, d:0, l:11, pf:824, pa:634 },
  { id:'TLN', name:'Toulon',      kit:'#1c1c1c', trim:'#d01f2e', pace:3, power:4, handling:3, kicking:3, stamina:3, league:'Top 14', place:9, w:12, d:1, l:13, pf:714, pa:820 },
  { id:'NAN', name:'Nanterre',    kit:'#7eb6e0', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:3, kicking:3, stamina:3, league:'Top 14', place:5, w:16, d:1, l:9, pf:828, pa:723 },
  { id:'PAR', name:'Paris',       kit:'#e2457f', trim:'#1b2747', pace:3, power:3, handling:4, kicking:3, stamina:3, league:'Top 14', place:3, w:15, d:1, l:10, pf:869, pa:664 },
  { id:'CLE', name:'Clermont',    kit:'#f5c400', trim:'#1b2747', pace:3, power:3, handling:3, kicking:3, stamina:4, league:'Top 14', place:7, w:15, d:0, l:11, pf:812, pa:708 },
  { id:'CAS', name:'Castres',     kit:'#2050b0', trim:'#f2efe6', pace:3, power:4, handling:2, kicking:3, stamina:3, league:'Top 14', place:10, w:11, d:0, l:15, pf:660, pa:751 },
  { id:'MPL', name:'Montpellier', kit:'#1b2747', trim:'#6fb7e6', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Top 14', place:2, w:17, d:1, l:8, pf:824, pa:587 },
  { id:'PAU', name:'Pau',         kit:'#0f7a3c', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:3, stamina:3, league:'Top 14', place:4, w:17, d:0, l:9, pf:817, pa:665 },
  { id:'BAY', name:'Bayonne',     kit:'#6fb7e6', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:3, stamina:3, league:'Top 14', place:12, w:11, d:0, l:15, pf:747, pa:869 },
  { id:'LYO', name:'Lyon',        kit:'#c8102e', trim:'#1c1c1c', hoops:true, pace:3, power:3, handling:3, kicking:3, stamina:3, league:'Top 14', place:11, w:11, d:1, l:14, pf:734, pa:774 },
  { id:'PGN', name:'Perpignan',   kit:'#f2b01e', trim:'#c8102e', pace:3, power:3, handling:2, kicking:3, stamina:3, league:'Top 14', place:13, w:6, d:0, l:20, pf:550, pa:797 },
  { id:'MTB', name:'Montauban',   kit:'#f2efe6', trim:'#2050b0', pace:3, power:3, handling:2, kicking:2, stamina:2, league:'Top 14', place:14, w:1, d:1, l:24, pf:495, pa:1349 },
];
const AUSTRALIA = [   // the Super Rugby cities, with Melbourne and Adelaide to make six
  { id:'SYD', name:'Sydney',    kit:'#6fb7e6', trim:'#1b2747', pace:4, power:3, handling:4, kicking:3, stamina:3, league:'Super Rugby Pacific', place:8, w:5, d:0, l:9, pf:353, pa:402 },
  { id:'BRI', name:'Brisbane',  kit:'#a3162f', trim:'#f2efe6', pace:4, power:4, handling:3, kicking:3, stamina:3, league:'Super Rugby Pacific', place:5, w:8, d:0, l:6, pf:364, pa:386 },
  { id:'CAN', name:'Canberra',  kit:'#1b2747', trim:'#f2b01e', pace:3, power:4, handling:4, kicking:3, stamina:3, league:'Super Rugby Pacific', place:6, w:7, d:0, l:7, pf:402, pa:373 },
  { id:'PTH', name:'Perth',     kit:'#2050b0', trim:'#f2b01e', pace:3, power:3, handling:3, kicking:3, stamina:4, league:'Super Rugby Pacific', place:7, w:7, d:0, l:7, pf:358, pa:383 },
  { id:'MEL', name:'Melbourne', kit:'#14235a', trim:'#c8102e', hoops:true, pace:3, power:3, handling:3, kicking:3, stamina:3 },
  { id:'ADL', name:'Adelaide',  kit:'#c8102e', trim:'#1b2747', pace:3, power:3, handling:3, kicking:2, stamina:3 },
];
const SOUTH_AFRICA = [   // the URC four and the Currie Cup's next three
  { id:'PRE', name:'Pretoria',     kit:'#2a5fb8', trim:'#f2efe6', pace:3, power:5, handling:3, kicking:3, stamina:3, league:'United Rugby Championship', place:4, w:12, d:0, l:6, pf:566, pa:406 },
  { id:'CPT', name:'Cape Town',    kit:'#1c1c1c', trim:'#2a5fb8', hoops:true, pace:4, power:4, handling:3, kicking:3, stamina:3, league:'United Rugby Championship', place:3, w:12, d:1, l:5, pf:504, pa:344 },
  { id:'DUR', name:'Durban',       kit:'#1c1c1c', trim:'#f2efe6', pace:4, power:4, handling:3, kicking:2, stamina:4, league:'United Rugby Championship', place:10, w:8, d:1, l:9, pf:467, pa:428 },
  { id:'JHB', name:'Johannesburg', kit:'#c8102e', trim:'#f2efe6', pace:4, power:3, handling:3, kicking:3, stamina:4, league:'United Rugby Championship', place:7, w:10, d:1, l:7, pf:532, pa:473 },
  { id:'BLM', name:'Bloemfontein', kit:'#e8731c', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:2, stamina:4, league:'Currie Cup', place:2, w:5, d:0, l:2, pf:245, pa:226 },
  { id:'KIM', name:'Kimberley',    kit:'#f2efe6', trim:'#b0b4ba', pace:3, power:3, handling:3, kicking:2, stamina:3, league:'Currie Cup', place:1, w:6, d:0, l:1, pf:271, pa:143 },
  { id:'MBO', name:'Mbombela',     kit:'#d8a823', trim:'#1c1c1c', pace:3, power:4, handling:2, kicking:2, stamina:3, league:'Currie Cup', place:3, w:4, d:0, l:3, pf:201, pa:195 },
];
const ENGLAND = [   // the top flight, in last season's table order. Twickenham is the Local list's own object, so it stays one team with one code
  { id:'NTH', name:'Northampton', kit:'#0f5a32', trim:'#f2b01e', pace:4, power:3, handling:4, kicking:3, stamina:3, league:'English Premiership', place:1, w:14, d:1, l:3, pf:693, pa:536 },
  { id:'BAT', name:'Bath',        kit:'#14307a', trim:'#f2efe6', pace:3, power:4, handling:4, kicking:3, stamina:3, league:'English Premiership', place:2, w:13, d:0, l:5, pf:646, pa:424 },
  { id:'EXE', name:'Exeter',      kit:'#1c1c1c', trim:'#f2efe6', pace:3, power:5, handling:3, kicking:3, stamina:3, league:'English Premiership', place:3, w:11, d:1, l:6, pf:521, pa:367 },
  { id:'LEI', name:'Leicester',   kit:'#0f7a3c', trim:'#c8102e', hoops:true, pace:3, power:5, handling:3, kicking:4, stamina:2, league:'English Premiership', place:4, w:12, d:0, l:6, pf:583, pa:405 },
  { id:'LON', name:'London',      kit:'#1c1c1c', trim:'#c8102e', pace:3, power:4, handling:3, kicking:4, stamina:3, league:'English Premiership', place:5, w:10, d:0, l:8, pf:628, pa:449 },
  { id:'BRS', name:'Bristol',     kit:'#14235a', trim:'#6fb7e6', pace:5, power:3, handling:4, kicking:2, stamina:3, league:'English Premiership', place:6, w:11, d:0, l:7, pf:525, pa:509 },
  { id:'SAL', name:'Sale',        kit:'#1f4fa0', trim:'#f2efe6', pace:3, power:5, handling:2, kicking:3, stamina:3, league:'English Premiership', place:7, w:5, d:0, l:13, pf:524, pa:602 },
  { id:'GLO', name:'Gloucester',  kit:'#9c1b2e', trim:'#f2efe6', hoops:true, pace:3, power:4, handling:3, kicking:3, stamina:4, league:'English Premiership', place:8, w:5, d:0, l:13, pf:424, pa:576 },
  CLUBS[5],
  { id:'NEW', name:'Newcastle',   kit:'#1b2747', trim:'#d8333a', pace:3, power:3, handling:3, kicking:2, stamina:4, league:'English Premiership', place:10, w:2, d:0, l:16, pf:325, pa:860 },
];
const IRELAND = [   // the four provinces' cities, with Cork and Ballymena from the All-Ireland League to make six
  { id:'DUB', name:'Dublin',    kit:'#1565c0', trim:'#f2efe6', pace:4, power:4, handling:5, kicking:3, stamina:3, league:'United Rugby Championship', place:2, w:12, d:0, l:6, pf:515, pa:370 },
  { id:'LIM', name:'Limerick',  kit:'#c8102e', trim:'#1b2747', pace:3, power:4, handling:3, kicking:4, stamina:4, league:'United Rugby Championship', place:5, w:11, d:0, l:7, pf:396, pa:376 },
  { id:'GAL', name:'Galway',    kit:'#109a52', trim:'#1c1c1c', pace:4, power:3, handling:4, kicking:3, stamina:3, league:'United Rugby Championship', place:8, w:10, d:0, l:8, pf:442, pa:395 },
  { id:'BEL', name:'Belfast',   kit:'#f2efe6', trim:'#c8102e', pace:3, power:4, handling:4, kicking:3, stamina:3, league:'United Rugby Championship', place:9, w:9, d:1, l:8, pf:494, pa:420 },
  { id:'COR', name:'Cork',      kit:'#f2efe6', trim:'#1b2747', hoops:true, pace:3, power:3, handling:4, kicking:3, stamina:4, league:'All-Ireland League 1A', place:5, w:10, d:0, l:8, pf:430, pa:391 },
  { id:'BMA', name:'Ballymena', kit:'#1c1c1c', trim:'#f2efe6', pace:3, power:4, handling:2, kicking:3, stamina:3, league:'All-Ireland League 2A', place:7, w:9, d:0, l:9, pf:355, pa:404 },
];
/* Wales, Scotland and Italy are one list: alone they have 4, 2 and 2 sides, and a list needs 6. The eight in last season's table order, each under its place. */
const WALES_SCOTLAND_ITALY = [
  { id:'GLA', name:'Glasgow',  kit:'#1c1c1c', trim:'#6fb7e6', pace:4, power:3, handling:4, kicking:3, stamina:3, league:'United Rugby Championship', place:1, w:13, d:0, l:5, pf:479, pa:338 },
  { id:'CDF', name:'Cardiff',  kit:'#6fb7e6', trim:'#1c1c1c', pace:4, power:3, handling:3, kicking:3, stamina:3, league:'United Rugby Championship', place:6, w:11, d:0, l:7, pf:353, pa:372 },
  { id:'SWA', name:'Swansea',  kit:'#1c1c1c', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:3, stamina:3, league:'United Rugby Championship', place:11, w:7, d:2, l:9, pf:376, pa:454 },
  { id:'EDI', name:'Edinburgh', kit:'#14235a', trim:'#c8102e', pace:3, power:4, handling:3, kicking:3, stamina:4, league:'United Rugby Championship', place:12, w:7, d:0, l:11, pf:362, pa:439 },
  { id:'TRE', name:'Treviso',  kit:'#0f7a3c', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'United Rugby Championship', place:13, w:6, d:2, l:10, pf:327, pa:493 },
  { id:'LLA', name:'Llanelli', kit:'#b5121b', trim:'#f2efe6', pace:4, power:3, handling:4, kicking:2, stamina:3, league:'United Rugby Championship', place:14, w:4, d:2, l:12, pf:361, pa:460 },
  { id:'NPT', name:'Newport',  kit:'#1c1c1c', trim:'#f2b01e', pace:3, power:4, handling:2, kicking:3, stamina:4, league:'United Rugby Championship', place:15, w:3, d:4, l:11, pf:350, pa:481 },
  { id:'PMA', name:'Parma',    kit:'#f2efe6', trim:'#1c1c1c', hoops:true, pace:3, power:3, handling:3, kicking:2, stamina:3, league:'United Rugby Championship', place:16, w:2, d:0, l:16, pf:312, pa:587 },
];
/* England's second tier, in last season's table order (regular season, before the play-offs). Thirteen of its fourteen: the side from London is left out, because London is taken by the top flight's side and it was relegated.
   No two sides here share a shirt and a trim at a glance, on a card or in a table's chip: where a club's own colours are close to another's, one wears hoops or the darker shade, and the sides whose colours could not be sourced took what was free (tools/ratings.mjs pins it). */
const ENGLAND_TWO = [
  { id:'EAL', name:'Ealing',     kit:'#0f5a32', trim:'#f2efe6', pace:4, power:4, handling:4, kicking:3, stamina:3, league:'English Championship', place:1, w:26, d:0, l:0, pf:1125, pa:435 },
  { id:'BED', name:'Bedford',    kit:'#14235a', trim:'#6fb7e6', hoops:true, pace:3, power:4, handling:3, kicking:3, stamina:3, league:'English Championship', place:2, w:18, d:1, l:7, pf:802, pa:643 },
  { id:'COV', name:'Coventry',   kit:'#14307a', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:4, kicking:3, stamina:3, league:'English Championship', place:3, w:16, d:0, l:10, pf:1053, pa:723 },
  { id:'WOR', name:'Worcester',  kit:'#14235a', trim:'#f2b01e', pace:3, power:4, handling:4, kicking:3, stamina:3, league:'English Championship', place:4, w:15, d:0, l:11, pf:899, pa:652 },
  { id:'CHN', name:'Chinnor',    kit:'#f2efe6', trim:'#1c1c1c', pace:3, power:3, handling:3, kicking:3, stamina:4, league:'English Championship', place:5, w:16, d:0, l:10, pf:697, pa:635 },
  { id:'HPY', name:'Hartpury',   kit:'#c8102e', trim:'#1c1c1c', hoops:true, pace:4, power:3, handling:3, kicking:3, stamina:4, league:'English Championship', place:6, w:15, d:2, l:9, pf:772, pa:632 },
  { id:'CWL', name:'Cornwall',   kit:'#1c1c1c', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:2, stamina:4, league:'English Championship', place:7, w:13, d:1, l:12, pf:770, pa:671 },
  { id:'DON', name:'Doncaster',  kit:'#2050b0', trim:'#c8102e', pace:3, power:4, handling:3, kicking:3, stamina:3, league:'English Championship', place:8, w:12, d:3, l:11, pf:729, pa:655 },
  { id:'NOT', name:'Nottingham', kit:'#109a52', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:4, kicking:3, stamina:3, league:'English Championship', place:9, w:12, d:1, l:13, pf:639, pa:647 },
  { id:'AMP', name:'Ampthill',   kit:'#5e0f24', trim:'#f2b01e', hoops:true, pace:3, power:4, handling:3, kicking:3, stamina:3, league:'English Championship', place:10, w:12, d:0, l:14, pf:828, pa:890 },
  { id:'CAL', name:'Caldy',      kit:'#1c1c1c', trim:'#f5c400', hoops:true, pace:3, power:3, handling:3, kicking:3, stamina:3, league:'English Championship', place:11, w:9, d:0, l:17, pf:574, pa:814 },
  { id:'RIC', name:'Richmond',   kit:'#f2b01e', trim:'#1c1c1c', hoops:true, pace:4, power:3, handling:3, kicking:2, stamina:3, league:'English Championship', place:12, w:7, d:1, l:18, pf:525, pa:823 },
  { id:'CAM', name:'Cambridge',  kit:'#a3162f', trim:'#f2b01e', pace:3, power:3, handling:3, kicking:2, stamina:3, league:'English Championship', place:14, w:0, d:1, l:25, pf:447, pa:1190 },
];
/* The foot of the game: Counties 5 Surrey, the league Guildfordians play in, in last season's table order, with one side from Counties 3 Surrey above them. One star and two: every other list starts higher, and a side down here needs peers to meet.
   Each goes by its place. Guildfordians is the Local list's own object, as Twickenham is in England. */
const COUNTIES = [
  { id:'EFF', name:'Effingham',  kit:'#f2b01e', trim:'#0f5a32', pace:3, power:3, handling:3, kicking:3, stamina:3, league:'Counties 3 Surrey', place:2, w:16, d:0, l:4, pf:773, pa:291 },
  { id:'WAN', name:'Wandsworth', kit:'#7a1f2b', trim:'#f2b01e', pace:3, power:3, handling:3, kicking:3, stamina:3, league:'Counties 5 Surrey', place:3, w:10, d:1, l:3, pf:420, pa:335 },
  CLUBS[7],
  { id:'EGH', name:'Egham',      kit:'#109a52', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:2, stamina:3, league:'Counties 5 Surrey', place:5, w:7, d:0, l:7, pf:366, pa:406 },
  { id:'MER', name:'Merton',     kit:'#1c1c1c', trim:'#f2b01e', hoops:true, pace:3, power:3, handling:2, kicking:3, stamina:3, league:'Counties 5 Surrey', place:6, w:1, d:0, l:13, pf:114, pa:678 },
  { id:'MIT', name:'Mitcham',    kit:'#2050b0', trim:'#f2efe6', pace:3, power:2, handling:3, kicking:3, stamina:3, league:'Counties 5 Surrey', place:7, w:4, d:0, l:10, pf:180, pa:281 },
  { id:'FEL', name:'Feltham',    kit:'#1b2747', trim:'#6fb7e6', pace:3, power:3, handling:3, kicking:2, stamina:2, league:'Counties 5 Surrey', place:10, w:1, d:0, l:13, pf:230, pa:409 },
];
/* The nations beyond the Six Nations, in the order they came in. Append only: a saved career's country is a code, and this
   list never reindexes NATIONS. Canberra holds CAN, so Canada is CDA. Each side's abilities below are its flavour, how it
   plays; abilitiesFor (src/ratings.js) sets them to its rating, keeping that character. */
const MORE_NATIONS = [
  { id:'NZL', name:'New Zealand',  kit:'#161616', trim:'#f2efe6', alt:'#f2efe6', altTrim:'#161616', pace:5, power:4, handling:5, kicking:4, stamina:4 },
  { id:'RSA', name:'South Africa', kit:'#0f6b3c', trim:'#f2b01e', alt:'#f2efe6', altTrim:'#0f6b3c', pace:3, power:5, handling:3, kicking:4, stamina:4 },
  { id:'AUS', name:'Australia',    kit:'#f2b01e', trim:'#0f6b3c', alt:'#0f6b3c', altTrim:'#f2b01e', pace:4, power:3, handling:5, kicking:4, stamina:3 },
  { id:'ARG', name:'Argentina',    kit:'#7eb6e0', trim:'#f2efe6', alt:'#14235a', altTrim:'#7eb6e0', hoops:true, pace:3, power:5, handling:3, kicking:4, stamina:3 },
  { id:'FIJ', name:'Fiji',         kit:'#f2efe6', trim:'#161616', alt:'#161616', altTrim:'#f2efe6', pace:5, power:3, handling:4, kicking:1, stamina:2 },
  { id:'JPN', name:'Japan',        kit:'#d01f2e', trim:'#f2efe6', alt:'#1b2747', altTrim:'#f2efe6', hoops:true, pace:4, power:2, handling:3, kicking:2, stamina:4 },
  { id:'GEO', name:'Georgia',      kit:'#8a1226', trim:'#f2efe6', alt:'#f2efe6', altTrim:'#8a1226', pace:2, power:5, handling:2, kicking:2, stamina:3 },
  { id:'POR', name:'Portugal',     kit:'#c8102e', trim:'#0f7a3c', alt:'#f2efe6', altTrim:'#c8102e', pace:3, power:2, handling:3, kicking:2, stamina:2 },
  { id:'USA', name:'USA',          kit:'#1b2f6b', trim:'#c8102e', alt:'#f2efe6', altTrim:'#1b2f6b', pace:3, power:3, handling:2, kicking:1, stamina:2 },
  { id:'ESP', name:'Spain',        kit:'#c8102e', trim:'#f2b01e', alt:'#1b2747', altTrim:'#f2b01e', pace:3, power:2, handling:2, kicking:1, stamina:2 },
  { id:'CHI', name:'Chile',        kit:'#d01f2e', trim:'#1d3a8f', alt:'#f2efe6', altTrim:'#d01f2e', pace:2, power:2, handling:3, kicking:1, stamina:2 },
  { id:'TGA', name:'Tonga',        kit:'#b5121b', trim:'#f2efe6', alt:'#f2efe6', altTrim:'#b5121b', pace:3, power:4, handling:1, kicking:1, stamina:1 },
  { id:'URU', name:'Uruguay',      kit:'#6fb7e6', trim:'#161616', alt:'#f2efe6', altTrim:'#2f7ed8', pace:2, power:3, handling:2, kicking:2, stamina:1 },
  { id:'SAM', name:'Samoa',        kit:'#1565c0', trim:'#f2efe6', alt:'#f2efe6', altTrim:'#1565c0', pace:2, power:3, handling:2, kicking:1, stamina:1 },
  { id:'CDA', name:'Canada',       kit:'#d01f2e', trim:'#161616', alt:'#f2efe6', altTrim:'#d01f2e', pace:2, power:2, handling:2, kicking:1, stamina:1 },
  { id:'ROU', name:'Romania',      kit:'#f5c400', trim:'#1d3a8f', alt:'#1d3a8f', altTrim:'#f5c400', pace:1, power:3, handling:1, kicking:1, stamina:1 },
];
const POOLS = [NATIONS, CLUBS, FRANCE, AUSTRALIA, SOUTH_AFRICA, ENGLAND, IRELAND, WALES_SCOTLAND_ITALY, ENGLAND_TWO, COUNTIES];   // saved settings index into it: append only, and the team screen's tabs put them in their own order (POOL_TABS)
const IMPORT_POOL = POOLS.length;                 // My League: not a list here, the imported league (src/import.js). It has moved twice, from 5 and from 7: cleanSettings reads saves from then
const POOL_TABS = [0, 1, 9, 5, 8, 6, 7, 2, 3, 4, IMPORT_POOL];   // International | Local | Counties | England | England 2 | Ireland | Wales Scotland Italy | France | Australia | South Africa | My League
const ALL_TEAMS = [...new Set([...POOLS.flat(), ...MORE_NATIONS])];   // Twickenham is in two lists and is one team
const allNations = () => [...NATIONS, ...MORE_NATIONS];
/* Who plays on a team. g: 0 men's or boys', 1 women's or girls', 'mixed'. A team with no g is men's and nothing ever writes a 0, so a side
   from an old save reads and saves exactly as it did. Mixed meets either: it has both in it. Men's never meets women's (sidesMeet). */
const teamSide = t => (t && (t.g === 1 || t.g === 'mixed') ? t.g : 0);
const sidesMeet = (a, b) => { const x = teamSide(a), y = teamSide(b); return x === y || x === 'mixed' || y === 'mixed'; };
/* The one lever: the oldest age group that plays mixed. The game follows England, mixed through U11 and girls-only from U12. Ireland and
   Australia run through U12, New Zealand through U13, and World Rugby's law is the end of the season a player turns 12. Wales and Scotland
   were not confirmed. The career's stages (CAREER_STAGES[].age) and an imported team's label (importSideOf) both read this. */
const MIXED_THROUGH = 11;
const DEFAULT_TEAM = CLUBS[0];           // Farnham: the team screen opens on Local with it picked
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
/* The overall rating on a team card: the five abilities (5 to 25) on a 40 to 99 scale. South Africa is 96. */
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
/* How fast a match you see runs against real time: the one lever. The frame loop (boot.js) feeds the sim and the drawing dt times this, so a step is still 1/60 of a simulated second and update() never knows: seeded results per simulated second, the bots and the headless tools are as they were. Every window a person has to hit widens by 1/pace in real time, and a half takes that much longer. Two Player and the menu demo run at match; only M.kids reads kids; the Training Ground has its own (DRILL_PACE). */
const MATCH_PACE = { match:0.88, kids:0.75 };

const $ = id => document.getElementById(id);
const clamp = (v,a,b) => v < a ? a : v > b ? b : v;
const rnd = Math.random;
const hyp = Math.hypot;
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
const dist = (a,b) => hyp(a.x-b.x, a.y-b.y);
const shuffle = a => { for (let i = a.length-1; i > 0; i--) { const j = Math.floor(rnd()*(i+1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };   // a sort with a random comparator is far from fair in Safari

