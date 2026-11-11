/* =========================================================
   Player looks, for the behind views only: height, build, skin, hair, a head style and a body (g: 0 male, 1 female, on the same rig in the same kit). Worked out from the team and shirt number with
   a local generator, so the same player looks the same every run, the match's random stream is never touched and nothing is added to
   M.players or a save. Skin is never tied to a team or a country. The team's side picks the bodies (teamSide): a men's squad is all male, a women's squad all
   female, a mixed squad about half and half. A squad entry with a look (the career player) overrides it, and so does your profile's look
   on the one man of your side who wears it (M.you, set by startMatch from profileYou: src/profile.js), its body already the side's.
   ========================================================= */
const LOOK_SKIN = ['#f1d0b4', '#e2b593', '#c69c7c', '#a8764f', '#7f5337', '#553522'];
const LOOK_HAIR = ['#17120e', '#2a1d16', '#4c2f1b', '#7d4f25', '#c29a55', '#a33f1f'];
const LOOK_RANGE = { h:[1.62, 2.02], b:[0.88, 1.16] };
const LOOK_STYLES = 12;                                     // short, shaved, big hair, scrum cap, headband, bun, ponytail, plait, long plait, bunches, high ponytail, long bob: append only, a saved look holds the index. The code-drawn man shows everything from the bun on as a bun
const LOOK_LONG = 8;                                        // the four long styles start here (render-art.js keeps them apart from the shirt and the face)
const LOOK_FEMALE = [8, 9, 10, 11, 5, 2, 3, 0];             // what a women's squad wears: the styles that read from the front as well as the back. The ponytail and the plait hang out of sight from the front and the headband is a coloured ring round the head, so they are left to the picker. Eight, so stepping by five gives seven different in a squad
const LOOKS = new WeakMap();
function lookHash(text) {                                   // FNV-1a
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function cleanLook(l) {                                     // keeps only the fields that make sense, clamped; anything else is dropped
  const out = {};
  if (!l || typeof l !== 'object') return out;
  for (const k of ['h', 'b']) if (Number.isFinite(l[k])) out[k] = clamp(l[k], LOOK_RANGE[k][0], LOOK_RANGE[k][1]);
  for (const k of ['skin', 'hair']) if (Number.isInteger(l[k])) out[k] = clamp(l[k], 0, 5);
  if (Number.isInteger(l.style)) out.style = clamp(l.style, 0, LOOK_STYLES - 1);
  if (l.g === 0 || l.g === 1) out.g = l.g;
  return out;
}
function lookRng(seed) {                                    // mulberry, with its own state
  let s = seed;
  return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; };
}
function lookOf(p) {
  let look = LOOKS.get(p);
  if (look) return look;
  // a custom team's key or a team's name, not its id: newMatch rewrites a clashing id for one match, and the same team should look the same.
  // A mirror match is twins in different kits.
  const nat = M.nat[p.team], name = String(nat.key || nat.name || nat.id || p.team), teamHash = lookHash(name);
  const next = lookRng(lookHash(name + ':' + p.n));
  const deal = tag => {                                     // this man's place in a shuffled squad of seven, so a squad's spread never rests on chance
    const deck = [0, 1, 2, 3, 4, 5, 6], r = lookRng(lookHash(name + ':' + tag));
    for (let i = 6; i > 0; i--) { const j = Math.floor(r()*(i + 1)), t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
    return deck[(p.n - 1) % 7];
  };
  const big = p.n <= 3 ? 1 : 0;                             // the front row leans a little bigger
  const seeded = {
    h:clamp(1.62 + 0.40*(deal('h') + next())/7 + big*0.04, 1.62, 2.02),
    b:clamp(0.88 + 0.28*(deal('b') + next())/7 + big*0.07, 0.88, 1.16),
    skin:(Math.floor(deal('skin')*6/7) + teamHash) % 6,      // every squad holds all six, one of them twice, so no tone belongs to a team
    hair:(Math.floor(deal('hair')*6/7) + teamHash) % 6,
    style:(teamHash + p.n*5) % 6,                           // walks the six styles shirt by shirt
    g:0,
  };
  const side = teamSide(nat);
  if (side) {                                               // a men's squad never comes here, so it stays exactly as it was
    seeded.g = side === 1 ? 1 : (deal('g') + teamHash) % 2;  // mixed: a shuffled deal of its own, so three or four of the seven and nothing to do with skin or shirt
    if (seeded.g) seeded.style = LOOK_FEMALE[(teamHash + p.n*5) % LOOK_FEMALE.length];
  }
  const entry = Array.isArray(nat.squad) ? nat.squad.find(e => e && e.n === p.n) : null;
  const own = cleanLook(entry && entry.look);
  if (own.g && own.style == null) seeded.style = (teamHash + p.n*5) % 8;   // a saved female look with no style of its own: the same eight it always walked, so it keeps its hair
  const you = M.you && M.you.team === p.team && M.you.n === p.n && !M.career ? M.you.look : null;   // your player: your face, skin, hair and build, the side's body
  look = { ...seeded, ...own, ...(you || {}) };
  LOOKS.set(p, look);
  return look;
}
