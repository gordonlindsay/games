/* ---------- kit designs and a third colour (1.8) ----------
   The owner, 14 Nov 2026: "Quad sections are ok and add a third colour too for completeness". A club's kit is { kit, trim, design?, third? }:
   design one of KIT_DESIGNS, third an optional third colour (a hex). hoops:true with no design reads as 'hoops', so every 1.7 save, every
   hooped side in the data and every older build reads it as it did; a hooped design is always written with hoops:true as well. Plain takes
   no third. KITS (src/data.js) off draws every side plain or hooped exactly as 1.7: kitDesignOf and kitThirdOf are the one door every
   drawing goes through, and with KITS off they answer as 1.7 would.
   kitPaint is the one rule for which colour a point of the shirt takes, in the wearer's own body space, shared by the match sprites
   (render-art.js, painted per pixel when a picture is baked), the code-drawn men (fig side on, figFB front or back on: kitPaintBox) and
   the tests. The shirt icons draw the same designs in CSS (kitCss). Nothing here draws a random number. */
const KIT_DESIGNS = ['plain', 'hoops', 'halves', 'quarters', 'stripes', 'sash', 'band'];
const KIT_DESIGN_NAMES = { plain:'Plain', hoops:'Hoops', halves:'Halves', quarters:'Quarters', stripes:'Stripes', sash:'Sash', band:'Chest Band' };
const KIT_ASYM = { halves:true, quarters:true, sash:true };   // differ left to right: a mirrored picture must be baked mirrored
const KIT_HEX = /^#[0-9a-f]{6}$/i;
const kitHex = v => typeof v === 'string' && KIT_HEX.test(v);   // a string only: a hand-edited save's array or object passes the test once made a string, and then throws
function kitDesignOf(t) {
  if (!t) return 'plain';
  if (KITS.on && KIT_DESIGNS.includes(t.design)) return t.design;
  return t.hoops ? 'hoops' : 'plain';
}
/* The third colour a side shows: none with KITS off, on Plain, or where it is the shirt's or the trim's own colour (it would do nothing) */
function kitThirdOf(t) {
  if (!KITS.on || !t || !kitHex(t.third) || kitDesignOf(t) === 'plain') return null;
  const c = t.third.toLowerCase();
  return c === String(t.kit).toLowerCase() || c === String(t.trim).toLowerCase() ? null : t.third;
}
/* z: metres up a 1.8m man (hem 0.93, collar 1.44); xb: metres to his left of his centre line; u: metres across the shirt as seen, for
   stripes. 0 the shirt colour, 1 the trim, 2 the third (the trim when there is none). */
function kitPaint(design, z, xb, u, third) {
  switch (design) {
    case 'hoops': { const b = Math.floor((1.47 - z)/0.0735); return third ? [0, 1, 2][((b % 3) + 3) % 3] : (b & 1); }
    case 'halves': return xb > 0 ? 1 : 0;                       // the wearer's right in the shirt colour, his left in the trim
    case 'quarters': return (xb > 0) !== (z < 1.19) ? 1 : 0;   // his right shoulder in the shirt colour, the quarters crossing at the chest
    case 'stripes': { const k = Math.floor(u/0.07 + 0.5); return (k & 1) ? (third && (k & 2) ? 2 : 1) : 0; }
    case 'sash': { const d = Math.abs(z - (1.19 + 1.05*xb)); return d < 0.065 ? 1 : third && d < 0.088 ? 2 : 0; }   // his left shoulder to his right hip
    case 'band': { const d = Math.abs(z - 1.27); return d < 0.055 ? 1 : third && d < 0.077 ? 2 : 0; }
    default: return 0;
  }
}
/* The shirt icon's background, as CSS: front on, so the wearer's right is on the left. */
function kitCss(t) {
  const d = kitDesignOf(t), th = kitThirdOf(t), k = 'var(--kit)', r = 'var(--trim)', x = th ? 'var(--third)' : r;
  switch (d) {
    case 'hoops': return th
      ? `linear-gradient(${k} 0 26%,${r} 26% 38%,${k} 38% 50%,${x} 50% 62%,${k} 62% 74%,${r} 74% 86%,${k} 86% 100%)`
      : `linear-gradient(${k} 0 30%,${r} 30% 42%,${k} 42% 56%,${r} 56% 68%,${k} 68% 82%,${r} 82% 94%,${k} 94%)`;
    case 'halves': return `linear-gradient(90deg,${k} 50%,${r} 50%)`;
    case 'quarters': return `linear-gradient(90deg,${k} 50%,${r} 50%) top/100% 52% no-repeat,linear-gradient(90deg,${r} 50%,${k} 50%) bottom/100% 48% no-repeat`;
    case 'stripes': return th
      ? `repeating-linear-gradient(90deg,${k} 0 9%,${r} 9% 18%,${k} 18% 27%,${x} 27% 36%)`
      : `repeating-linear-gradient(90deg,${k} 0 10%,${r} 10% 20%)`;
    case 'sash': return th
      ? `linear-gradient(-45deg,${k} 0 36%,${x} 36% 41%,${r} 41% 59%,${x} 59% 64%,${k} 64%)`
      : `linear-gradient(-45deg,${k} 0 39%,${r} 39% 61%,${k} 61%)`;
    case 'band': return th
      ? `linear-gradient(${k} 0 33%,${x} 33% 38%,${r} 38% 54%,${x} 54% 59%,${k} 59%)`
      : `linear-gradient(${k} 0 36%,${r} 36% 56%,${k} 56%)`;
    default: return k;
  }
}
/* Where the trim is half the shirt (halves, quarters, stripes, sash), the collar takes the third colour, and the shoulder flash goes (or
   takes the third): in the trim it reads as a blot on one sleeve. The sprites' collar, cuffs and sock tops follow the icon's collar. */
const KIT_TRIM_HALF = { halves:true, quarters:true, stripes:true, sash:true };
const kitAccent = t => (KIT_TRIM_HALF[kitDesignOf(t)] && kitThirdOf(t) ? 'var(--third)' : 'var(--trim)');
const kitFlash = t => (KIT_TRIM_HALF[kitDesignOf(t)] ? (kitThirdOf(t) ? 'var(--third)' : 'transparent') : 'var(--trim)');
/* A kit as the close-ups hold it ({ shirt, trim, design, third }): painted per point (anything past plain and two-colour hoops, which keep
   their own bars), and a sleeve's colour, its own shoulder's. */
const kitPainted = kit => !!kit && !!kit.design && kit.design !== 'plain' && !(kit.design === 'hoops' && !kit.third);
const kitSleeve = (kit, xb) => [kit.shirt, kit.trim, kit.third || kit.trim][kitPaint(kit.design, 1.36, xb, xb, kit.third)];
/* The code-drawn men (fig side on, figFB front or back on): the torso's box painted in rows of cells, each row's runs merged into one
   rectangle, clipped to the torso by the caller. map(x, y) gives { z, xb, u } for a point in the man's own drawing space. 16 rows by 14
   cells of one to four runs at a scrum's size (a scrum of sixteen is a few hundred fillRects a frame); a bigger man, a goal kicker close
   up, gets a cell about every 3 device pixels, up to 48 by 42, so a sash's diagonal does not show as steps. */
function kitPaintBox(g, kit, x0, x1, y0, y1, map) {
  const m = typeof g.getTransform === 'function' ? g.getTransform() : null, s = m && Number.isFinite(m.a) ? Math.hypot(m.a, m.b) : 1;
  const rows = Math.max(16, Math.min(48, Math.ceil(Math.abs(y1 - y0)*s/3))), cols = Math.max(14, Math.min(42, Math.ceil(Math.abs(x1 - x0)*s/3)));
  const d = kit.design, cs = [kit.shirt, kit.trim, kit.third || kit.trim], dy = (y1 - y0)/rows, dx = (x1 - x0)/cols;
  for (let r = 0; r < rows; r++) {
    const y = y0 + (r + 0.5)*dy;
    let run = -1, from = x0;
    for (let c = 0; c <= cols; c++) {
      const x = x0 + (c + 0.5)*dx, m = c < cols ? map(x, y) : null, k = m ? kitPaint(d, m.z, m.xb, m.u, kit.third) : -2;
      if (k !== run) { if (run >= 0) { g.fillStyle = cs[run]; g.fillRect(from, y0 + r*dy - 0.3, x0 + c*dx - from + 0.3, dy + 0.6); } run = k; from = x0 + c*dx; }
    }
  }
}
/* Saves (cleanTeam, cleanSide): a design only when it says more than hoops does, a hooped design as hoops:true, a third only where it shows */
function kitClean(t, team) {
  const d = KIT_DESIGNS.includes(t.design) ? t.design : t.hoops ? 'hoops' : 'plain';
  team.hoops = d === 'hoops';
  if (d !== 'plain' && d !== 'hoops') team.design = d;
  if (d !== 'plain' && kitHex(t.third)) { const c = t.third.toLowerCase(); if (c !== String(team.kit).toLowerCase() && c !== String(team.trim).toLowerCase()) team.third = t.third; }
  return team;
}
