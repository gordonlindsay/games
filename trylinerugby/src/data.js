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
/* Local clubs: kit colours are the clubs' own, ratings are made up. Append only, never reorder. */
const CLUBS = [
  { id:'FAR', name:'Farnham',       kit:'#1a1a1a', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:4, kicking:3, stamina:3 },
  { id:'HAS', name:'Haslemere',     kit:'#2244aa', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:3, kicking:2, stamina:3 },
  { id:'GUI', name:'Guildford',     kit:'#1a1e4f', trim:'#ffc014', pace:3, power:4, handling:3, kicking:3, stamina:3 },
  { id:'ALD', name:'Aldershot',     kit:'#d8333a', trim:'#1b2747', pace:3, power:4, handling:2, kicking:3, stamina:4 },
  { id:'WEY', name:'Weybridge',     kit:'#1a1a1a', trim:'#0f8040', pace:3, power:3, handling:4, kicking:3, stamina:3 },
  { id:'HAR', name:'Harlequins',    kit:'#c8306f', trim:'#7eb0dc', pace:4, power:3, handling:4, kicking:3, stamina:3 },
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
const AUSTRALIA = [   // the Super Rugby cities, with Melbourne and Adelaide to make six
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
const POOLS = [NATIONS, CLUBS, FRANCE, AUSTRALIA, SOUTH_AFRICA];   // the team screen's International | Local | France | Australia | South Africa; saved settings index into it
const ALL_TEAMS = POOLS.flat();
const DEFAULT_TEAM = CLUBS[0];           // Farnham: the team screen opens on Local with it picked
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

