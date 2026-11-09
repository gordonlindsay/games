/* =========================================================
   Player looks, for the behind views only: height, build, skin, hair and a head style. Worked out from the team and shirt number with
   a local generator, so the same man looks the same every run, the match's random stream is never touched and nothing is added to
   M.players or a save. Skin is never tied to a team or a country. A squad entry with a look (the future career player) overrides it.
   ========================================================= */
const LOOK_SKIN = ['#f1d0b4', '#e2b593', '#c69c7c', '#a8764f', '#7f5337', '#553522'];
const LOOK_HAIR = ['#17120e', '#2a1d16', '#4c2f1b', '#7d4f25', '#c29a55', '#a33f1f'];
const LOOK_RANGE = { h:[1.62, 2.02], b:[0.88, 1.16] };
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
  for (const k of ['skin', 'hair', 'style']) if (Number.isInteger(l[k])) out[k] = clamp(l[k], 0, 5);
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
  };
  const entry = Array.isArray(nat.squad) ? nat.squad.find(e => e && e.n === p.n) : null;
  look = { ...seeded, ...cleanLook(entry && entry.look) };
  LOOKS.set(p, look);
  return look;
}
