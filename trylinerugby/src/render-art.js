/* =========================================================
   The player art for the behind views: sprites rendered in Blender (tools/blender/build_players.py) and tinted here into any kit, skin and hair. One packed atlas
   holds every body part's light: R the shade, G the part id x 16, B the coverage. A man's picture is tinted into a slot on a fixed set of sheets on first use, a few
   a frame, and the oldest slot is reused when a sheet is full, so the memory is bounded. Until the atlas is in, or if it never comes, paintMan draws him as before.
   Top, Two Player and a match's close-ups never come here; the Training Ground does (render-drill.js), its close-ups included. Nothing here touches a man's object or draws a random number.
   ========================================================= */
const ART_TIERS = [40, 64];                                 // pixels per metre on the sheets: 40 is the main depth on a phone, drawn a little down, so it stays crisp
const ART_SHEET = 1024, ART_CAPS = { stand:[3, 2], low:[1, 1] };   // sheets per shape and tier, 4MB each: 28MB at the very most
const ART_HAIR_SKIN = 45, ART_HAIR_SHIRT = 55;              // how far apart, in colour, a long style keeps from the skin and the shirt
const ART_BAKES = 6;                                        // pictures tinted in one frame
const ART_CLIPS = ['idle', 'carryidle', 'run', 'sprint', 'carry', 'pass', 'sidestep', 'tackle', 'fall', 'lying', 'getup', 'crouch', 'catch', 'reach', 'bind', 'land', 'place', 'kick'];   // the last seven are the Training Ground's
const ART_STEP_T = 0.36;                                    // the Side Step's six pictures play over this long. The move itself is unchanged: its push has already landed
const ART_STEP = new WeakMap();                             // who stepped, when and which way across the pitch: render-only, off the player object
const artStepped = (p, side) => { ART_STEP.set(p, { at:M.rt, s:side }); };
const ART = { state:'idle', gen:0, man:null, pages:[], classes:{}, map:new Map(), sheets:0, tick:0, next:1, epoch:0, baked:0, bakeMs:0, scratch:null, sg:null, img:null, luts:new Map(), frames:new WeakMap(), dmaps:new Map(), emaps:new Map(), last:null, promise:null };
const artReady = () => ART.state === 'ready';
function artInstall(man, pages) {                           // a parsed players.json and its decoded pages: [{ w, h, data }]
  ART.gen++; ART.man = man; ART.pages = pages; ART.ids = ART_CLIPS.reduce((o, c, i) => { o[c] = i; return o; }, {});
  ART.parts = man.parts; ART.state = 'ready'; artClear();
  if (typeof profileArtIn === 'function') profileArtIn();   // your player's picture, waiting for the art on the home and My Profile (src/profile.js)
}
function artOff() { ART.state = 'off'; ART.man = null; ART.pages = []; artClear(); }
function artBadPage(data) {                                 // a browser that alters pixels it hands back would tint garbage: the ids must come back whole
  let seen = 0, bad = 0;
  for (let i = 0; i < data.length && seen < 4000; i += 4*37) { if (data[i + 2]) { seen++; if (data[i + 1] & 15) bad++; } }
  return !seen || bad > 0;
}
function artDecode(base, name) {
  return new Promise((ok, no) => {
    const im = new Image();
    im.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
        const g = c.getContext('2d', { willReadFrequently:true }); g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height), page = { w:c.width, h:c.height, data:d.data };
        c.width = 0;
        if (artBadPage(page.data)) no(new Error('atlas pixels altered')); else ok(page);
      } catch (e) { no(e); }
    };
    im.onerror = () => no(new Error('atlas failed'));
    im.src = base + name;
  });
}
function artLoad(base = 'assets/players/') {                // once: over the network or from the service worker's precache. Any failure leaves the code-drawn men in place
  if (ART.state !== 'idle') return ART.promise;
  if (typeof Image === 'undefined' || typeof fetch !== 'function') { ART.state = 'off'; return null; }
  ART.state = 'loading';
  const gen = ++ART.gen, stale = () => gen !== ART.gen;     // artFree during a load: the pages already decoded go, and nothing is installed
  const started = typeof performance !== 'undefined' ? performance.now() : 0;
  return ART.promise = (async () => {
    try {
      const r = await fetch(base + 'players.json');
      if (!r.ok) throw new Error('no manifest');
      const man = await r.json(), pages = [];
      for (const name of man.pages) { if (stale()) return; pages.push(await artDecode(base, name)); await new Promise(res => setTimeout(res, 0)); }   // a breath between pages
      if (stale()) return;
      artInstall(man, pages);
      ART.loadMs = (typeof performance !== 'undefined' ? performance.now() : 0) - started;
    } catch (e) { if (!stale()) artOff(); }
  })();
}
function artClear() {                                       // every picture is forgotten; the sheets are kept for the next match
  ART.map.clear(); ART.tick = 0; ART.next = 1; ART.epoch++; ART.luts.clear(); ART.dmaps.clear(); ART.emaps.clear(); ART.last = null;
  for (const k in ART.classes) { const c = ART.classes[k]; c.free = 0; for (const slot of c.slots) slot.key = -1; }
}
function artTrim() {                                        // back on the menus: the demo needs one sheet a shape at the smaller tier, so the rest of a match's go. They are remade if the next match wants them
  for (const k in ART.classes) {
    const c = ART.classes[k], keep = c.tier === 0 ? c.canvases[0] : null;
    for (const cv of c.canvases) if (cv !== keep) cv.width = 0;
    c.canvases = keep ? [keep] : []; c.slots = c.slots.filter(s => s.cv === keep); c.free = 0;
  }
  ART.sheets = Object.values(ART.classes).reduce((n, c) => n + c.canvases.length, 0);
}
function artFree() {                                        // a match on Top or Two Player: the sheets (28MB at most) and the decoded pages (51MB) go, and the next behind view loads them again
  artClear();                                               // first, while it can still reach the slots: a man holding a picture must not draw from a sheet about to go
  for (const k in ART.classes) for (const c of ART.classes[k].canvases) c.width = 0;
  ART.classes = {}; ART.sheets = 0;
  ART.gen++; ART.man = null; ART.pages = []; ART.promise = null;
  if (ART.state !== 'off') ART.state = 'idle';
}

/* ---------- tinting ---------- */
function artLut(hex, gain = 1) {                            // 256 shades of one colour. Mid light is the colour itself, bright light lifts a little toward white, so even a black shirt shows its folds
  const id = hex + gain;
  let L = ART.luts.get(id);
  if (L) return L;
  const [r, g, b] = hexRgb(hex);
  L = new Uint8Array(768);
  for (let s = 0; s < 256; s++) {
    const v = s/255, k = Math.min(v/0.70, 1.06)*gain, lift = Math.max(0, v - 0.46)*62;
    L[s*3] = Math.min(255, r*k + lift); L[s*3 + 1] = Math.min(255, g*k + lift); L[s*3 + 2] = Math.min(255, b*k + lift);
  }
  ART.luts.set(id, L);
  return L;
}
function artMix(a, b, t) { const x = hexRgb(a), y = hexRgb(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v)*t).toString(16).padStart(2, '0')).join(''); }
function artPalette(p) { return artPaletteOf(kitOf(p.team, p), lookOf(p)); }   // part id to colour table, for this man in this match. The kit knows the man: the Locker's boots on your side, his alone in a career, Rainbow's by shirt (lockerBoots)
function artHairOf(look, kit, skin) {                       // a long style lies across the shirt and frames the face, so it must not melt into either: black hair on a black shirt comes up a little, brown hair on brown skin goes darker, by the smallest step that clears both. The eight older styles keep the colour as it was
  const base = LOOK_HAIR[look.hair];
  if (!(look.style >= LOOK_LONG)) return base;
  const clear = c => Math.min(colorDist(c, skin)/ART_HAIR_SKIN, colorDist(c, kit.shirt)/ART_HAIR_SHIRT);
  let best = base, at = clear(base);
  for (const t of [0.15, 0.3, 0.45, 0.6]) for (const to of ['#17120e', '#c8a878']) {
    if (at >= 1) return best;
    const c = artMix(base, to, t), v = clear(c);
    if (v > at) { best = c; at = v; }
  }
  return best;
}
function artPaletteOf(kit, look) {
  const skin = LOOK_SKIN[look.skin], hair = artHairOf(look, kit, skin);
  const grassy = c => colorDist(c, C.grassA) < 60 || colorDist(c, C.grassB) < 60, cap = grassy(kit.trim) ? '#f1eee4' : kit.trim;
  // the collar and cuffs sit between shirt and skin: if the trim is as dark as the skin, they lift, so the arm never melts into the shirt
  let trim = colorDist(kit.trim, skin) < 70 && colorDist(kit.shirt, skin) < 90 ? '#f1eee4' : kit.trim;
  // a lock is a plait, a bunch or a tail: hair on hair, a step darker, or lighter when the hair is too dark to go darker, so it shows against the head it falls over
  const lock = luma(hair) < 0.16 ? artMix(hair, '#8a6548', 0.24) : artMix(hair, '#17120e', 0.3);
  const design = kit.design || (kit.hoops ? 'hoops' : 'plain');
  if (kit.third && KIT_TRIM_HALF[design]) trim = colorDist(kit.third, skin) < 70 && colorDist(kit.shirt, skin) < 90 ? '#f1eee4' : kit.third;   // the trim is half the shirt: collar, cuffs and sock tops take the third, as the icon's collar does
  const table = { shirt:kit.shirt, hoop:design === 'hoops' ? kit.trim : kit.shirt, trim, shorts:kit.shorts, socks:kit.shirt, skin, hair, boots:kit.boots || '#22252b', shaved:artMix(skin, hair, 0.45), eye:'#120e0c', cap, line:'#0a120d', lock };
  const out = [null];
  for (const name of ART.parts) out.push(artLut(table[name]));
  // a design past plain and two-colour hoops (src/kit-design.js) is painted per pixel at bake (artDesignFrame): its three colours' tables ride on the palette
  out.design = design === 'plain' || (design === 'hoops' && !kit.third) ? null : design;
  out.dl = [artLut(kit.shirt), artLut(kit.trim), artLut(kit.third || (design === 'plain' && kit.edge) || kit.trim)];
  out.third = kit.third || null;
  out.edge = design === 'plain' && kit.edge ? kit.edge : null;   // a Plain shirt's third (kitEdgeOf): an edge at the collar and cuffs, its own frame (artEdgeFrame)
  return out;
}
function artBlit(g, r, luts, T, dx, dy, W, F) {              // one crop of the atlas, tinted, drawn at dx, dy in metres. F: a design's frame (artDesignFrame), for the body only, or a Plain edge's (artEdgeFrame), its marked pixels in the third
  const page = ART.pages[r[0]], d = page.data, w = r[3], h = r[4], out = ART.img.data, pw = page.w*4;
  for (let y = 0; y < h; y++) {
    let i = (r[2] + y)*pw + r[1]*4, j = y*W*4;
    for (let x = 0; x < w; x++, i += 4, j += 4) {
      const cov = d[i + 2];
      if (cov) {
        const id = d[i + 1] >> 4, L = F && (F.edge ? F.map[y*w + x] : id <= 2) ? luts.dl[F.edge ? 2 : F.map[y*w + x]] : luts[id], s = d[i]*3;
        out[j] = L[s]; out[j + 1] = L[s + 1]; out[j + 2] = L[s + 2]; out[j + 3] = cov;
      }
      else out[j + 3] = 0;
    }
  }
  for (let y = 0; y <= h; y++) out[(y*W + w)*4 + 3] = 0;     // a clear edge past the crop: scaling down samples it, and it may hold the last picture
  for (let x = 0; x < w; x++) out[(h*W + x)*4 + 3] = 0;
  ART.sg.putImageData(ART.img, 0, 0, 0, 0, w + 1, h + 1);
  const q = T/ART.man.px;
  g.drawImage(ART.scratch, 0, 0, w, h, dx*T, dy*T, w*q, h*q);
}
/* ---------- kit designs (1.8, src/kit-design.js) ----------
   The atlas has one shirt part and three baked hoops; nothing in it says where a man's left half or his chest is. So each picture
   finds his torso from what it does carry: the three hoops are rings at known heights (z 1.065, 1.195, 1.325), so their spread
   up the picture gives the scale and the height of every shirt pixel, and leaning or lying they lean and lie with him; the number's
   point is the middle of his back, and the head's point, less the offset an idle man shows at that facing, gives which way is up.
   Done once an atlas row and mirror (ART.frames). Which of the three colours each pixel takes is then a map of the picture, one a row,
   mirror, design and whether there is a third (ART.dmaps, kept for the match: every man of a side shares it, whatever his look), so a
   bake reads a byte a pixel, and a steady frame pays nothing, as every baked picture is cached. */
const ART_HOOP_Z = [1.325, 1.195, 1.065];
const ART_FAR = 0.21;                                       // halves and quarters side on: the far half's share of the shirt's pixels at his back, and again at his chest; about a third of what shows, by hue, standing (the owner, 15 Nov 2026: "Widen the Strip")
function artAxisOf(body, deg) {                             // how far the head's point sits right of the number's on an idle man at this facing, px
  const idle = body.idle, i = deg > 180 ? 360 - deg : deg, d = [0, 45, 90, 135, 180].indexOf(i), r = idle[(d < 0 ? 0 : d)*2];
  return (r[8] - r[10])*(deg > 180 ? -1 : 1);
}
function artDesignFrame(r, deg, mirror, body, design, third) {
  let got = ART.frames.get(r);
  if (!got) ART.frames.set(r, got = []);
  const G = got[mirror ? 1 : 0] || (got[mirror ? 1 : 0] = artDesignGeom(r, deg, mirror, body));
  const key = (mirror ? 1 : 0) + design + (third ? 3 : 2);
  let maps = ART.dmaps.get(r);
  if (!maps) ART.dmaps.set(r, maps = {});
  if (!maps[key]) {
    const F = { ...G, design, third, lo:-Infinity, hi:Infinity }, w = r[3], h = r[4], m = maps[key] = new Uint8Array(w*h), page = ART.pages[r[0]], d = page.data, pw = page.w*4;
    if (G.side && KIT_ASYM[design] && design !== 'sash') {   // halves and quarters side on: the far half at his back and his chest, ART_FAR of the shirt's pixels each, or it reads as one colour
      const at = [];
      for (let y = 0; y < h; y++) for (let x = 0, i = (r[2] + y)*pw + r[1]*4; x < w; x++, i += 4) if (d[i + 2] && (d[i + 1] >> 4) <= 2) at.push(((x + 0.5 - G.sx)*-G.uy + (y + 0.5 - G.sy)*G.ux)/G.px);
      if (at.length > 12) { at.sort((a, b) => a - b); F.lo = at[Math.floor(at.length*ART_FAR)]; F.hi = at[Math.ceil(at.length*(1 - ART_FAR)) - 1]; }
    }
    for (let y = 0; y < h; y++) for (let x = 0, i = (r[2] + y)*pw + r[1]*4; x < w; x++, i += 4) if (d[i + 2] && (d[i + 1] >> 4) <= 2) m[y*w + x] = artDesignAt(F, x, y);   // the shirt's pixels alone
  }
  return { map:maps[key] };
}
/* A Plain shirt's third (kitEdgeOf, src/kit-design.js): the trim's pixels at its open edge, next to his skin, at the collar and the cuffs.
   A run of trim that touches the shirt and not the socks is the collar or a cuff (a sock top touches the sock); its pixels with skin
   beside them take the third. Once an atlas row (ART.emaps): mirrored, the same pixels. */
function artEdgeFrame(r) {
  let m = ART.emaps.get(r);
  if (!m) {
    const w = r[3], h = r[4], page = ART.pages[r[0]], d = page.data, pw = page.w*4, P = ART.parts, TRIM = P.indexOf('trim') + 1, SHIRT = P.indexOf('shirt') + 1, HOOP = P.indexOf('hoop') + 1, SOCKS = P.indexOf('socks') + 1, BARE = P.indexOf('skin') + 1;
    const id = new Uint8Array(w*h), run = new Int32Array(w*h).fill(-1), ok = [];
    for (let y = 0; y < h; y++) for (let x = 0, i = (r[2] + y)*pw + r[1]*4; x < w; x++, i += 4) if (d[i + 2]) id[y*w + x] = d[i + 1] >> 4;
    const near = (x, y, f) => { for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) { const X = x + u, Y = y + v; if ((u || v) && X >= 0 && Y >= 0 && X < w && Y < h && f(id[Y*w + X])) return true; } return false; };
    for (let k = 0; k < w*h; k++) {                           // each run of trim, its pixels joined at an edge or a corner
      if (id[k] !== TRIM || run[k] >= 0) continue;
      const n = ok.length, todo = [k]; let shirt = false, socks = false;
      run[k] = n;
      while (todo.length) {
        const j = todo.pop(), x = j % w, y = (j - x)/w;
        for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) {
          const X = x + u, Y = y + v; if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
          const q = Y*w + X, t = id[q];
          if (t === SHIRT || t === HOOP) shirt = true; else if (t === SOCKS) socks = true;
          else if (t === TRIM && run[q] < 0) { run[q] = n; todo.push(q); }
        }
      }
      ok.push(shirt && !socks);
    }
    m = new Uint8Array(w*h);
    for (let k = 0; k < w*h; k++) if (run[k] >= 0 && ok[run[k]]) { const x = k % w; if (near(x, (k - x)/w, t => t === BARE)) m[k] = 1; }
    ART.emaps.set(r, m);
  }
  return { map:m, edge:true };
}
function artDesignGeom(r, deg, mirror, body) {
  const page = ART.pages[r[0]], d = page.data, w = r[3], h = r[4], pw = page.w*4, px = ART.man.px;
  const fx = r[5], fy = r[6], A = artAxisOf(body, deg);
  const back = deg < 90 || deg > 270, side = deg === 90 || deg === 270;
  let ux = r[8] - r[10] - A, uy = r[9] - r[11]; const um = Math.hypot(ux, uy) || 1; ux /= um; uy /= um;
  if (uy > 0.2 && Math.abs(ux) < 0.5) { ux = 0; uy = -1; }   // a head below the number (a man on the floor, end on): trust the picture's own up
  const sx = fx + r[10] + (back || side ? 0 : 1.8*A), sy = fy + r[11];
  // the hoops' heights along his up, three clusters, the middle one the chest
  const al = [];
  for (let y = 0; y < h; y++) for (let x = 0, i = (r[2] + y)*pw + r[1]*4; x < w; x++, i += 4) if (d[i + 2] > 140 && (d[i + 1] >> 4) === 2) al.push((x + 0.5 - sx)*ux + (y + 0.5 - sy)*uy);
  let sc = 0.9*px, zc = 1.21, fit = false;
  if (al.length > 12) {
    al.sort((a, b) => a - b);
    let c = [al[Math.floor(al.length*0.9)], al[Math.floor(al.length*0.5)], al[Math.floor(al.length*0.1)]];
    for (let it = 0; it < 8; it++) {
      const s3 = [0, 0, 0], n3 = [0, 0, 0];
      for (const a of al) { let k = 0, b = Math.abs(a - c[0]); for (let j = 1; j < 3; j++) { const e = Math.abs(a - c[j]); if (e < b) { b = e; k = j; } } s3[k] += a; n3[k]++; }
      c = c.map((v, j) => (n3[j] ? s3[j]/n3[j] : v));
    }
    const s2 = (c[0] - c[2])/(ART_HOOP_Z[0] - ART_HOOP_Z[2]);
    if (s2 > 0.3*px && s2 < 1.25*px) { sc = s2; zc = ART_HOOP_Z[1] - c[1]/sc; fit = true; }
  }
  // which side of the picture is his left: behind him it is the picture's left, in front of him its right; a mirrored bake swaps them
  const flip = mirror ? -1 : 1, lside = (back ? -1 : 1)*flip, near = deg === 90 ? -1 : 1;   // side on: the art faces right, so it shows his right side
  return { sx, sy, ux, uy, sc, zc, px, lside, side, near:near*flip, fit, A };
}
function artDesignAt(F, x, y) {                            // which of the shirt, trim and third this pixel of the picture takes
  const dx = x + 0.5 - F.sx, dy = y + 0.5 - F.sy, along = dx*F.ux + dy*F.uy, lat = (dx*-F.uy + dy*F.ux)/F.px;
  const z = F.zc + along/F.sc;
  let xb = F.side ? F.near*0.2 : Math.max(-0.26, Math.min(0.26, F.lside*lat));
  if (lat < F.lo || lat > F.hi) xb = -xb;                     // side on, halves and quarters: the far half's strips (artDesignFrame)
  return kitPaint(F.design, z, xb, lat, F.third);
}
function artClass(shape, tier) {                            // the slots for one shape at one tier
  const id = shape + tier;
  let c = ART.classes[id];
  if (!c) {
    const S = ART.man.shapes[shape], T = ART_TIERS[tier];
    c = ART.classes[id] = { id, w:Math.ceil(S.w*T), h:Math.ceil(S.h*T), S, T, shape, tier, slots:[], canvases:[], cap:ART_CAPS[shape][tier], free:0 };
  }
  return c;
}
function artSlot(c) {                                       // an unused slot, a new sheet, or the slot unseen for longest
  for (; c.free < c.slots.length; c.free++) if (c.slots[c.free].key < 0) return c.slots[c.free++];
  if (c.canvases.length < (M.demo ? 1 : c.cap)) {            // the demo behind the menus keeps to one sheet a shape, 8MB, and a match may use them all
    const cv = document.createElement('canvas'); cv.width = cv.height = ART_SHEET;
    const g = cv.getContext('2d'); c.canvases.push(cv); ART.sheets++;
    if (g.imageSmoothingQuality !== undefined) g.imageSmoothingQuality = 'high';
    for (let y = 0; y + c.h <= ART_SHEET; y += c.h + 2) for (let x = 0; x + c.w <= ART_SHEET; x += c.w + 2) c.slots.push({ cv, g, x, y, key:-1, t:0, c });
    return artSlot(c);
  }
  let old = c.slots[0];
  for (const s of c.slots) if (s.t < old.t) old = s;
  ART.map.delete(old.key);
  old.key = -1;
  return old;
}
function artScratch() {
  if (ART.img) return;
  ART.scratch = document.createElement('canvas'); ART.scratch.width = ART.scratch.height = 256;
  ART.sg = ART.scratch.getContext('2d', { willReadFrequently:true });
  ART.img = ART.sg.createImageData(256, 256);
}
/* The New Player screen's small picture: the real sprite, standing three-quarters on in the club's kit with the look picked. Off a match, so it reads no
   M. False when the atlas is not in: the shirt beside it is all there is then. */
function artPreview(cv, t, look) {
  if (!artReady() || !t) return false;
  artScratch();
  const man = ART.man, pose = artSprite('idle', 0, 3, false, look), r = pose.row, q = 1/man.px, T = man.px, g = cv.getContext('2d');
  const kit = { shirt:t.kit, trim:t.trim, hoops:kitDesignOf(t) === 'hoops', design:kitDesignOf(t), third:kitThirdOf(t), edge:kitEdgeOf(t), shorts:luma(t.kit) > 0.6 ? '#1b2233' : '#ece9df' }, luts = artPaletteOf(kit, look);
  const F = luts.design ? artDesignFrame(r, pose.deg, false, artBody(look), luts.design, luts.third) : luts.edge ? artEdgeFrame(r) : null;   // the club's design, or a Plain shirt's edge (src/kit-design.js)
  const style = man.styles[look.style] || man.styles[0], hk = man.hair[style] && man.hair[style][r[7]];
  g.clearRect(0, 0, cv.width, cv.height);
  g.save(); g.translate(cv.width/2, cv.height - 6); g.scale(look.b/man.builds[pose.build], 1);
  artBlit(g, r, luts, T, -r[5]*q, -r[6]*q, 256, F);
  if (hk) artBlit(g, hk, luts, T, (r[8] - hk[5])*q, (r[9] - hk[6])*q, 256);
  g.restore();
  return true;
}
function artBake(p, s, key, r, clip, deg, tier, mirror, dir = 0) {   // one picture for one man
  const started = performance.now();
  bvArmFonts();
  const man = ART.man, c = artClass(man.clips[clip].shape, tier), slot = artSlot(c), g = slot.g, T = c.T, S = c.S, q = 1/man.px;
  artScratch();
  g.clearRect(slot.x, slot.y, c.w, c.h);
  g.save(); g.beginPath(); g.rect(slot.x, slot.y, c.w, c.h); g.clip();
  g.translate(slot.x + S.ox*T, slot.y + S.oy*T);
  // a soft shadow on the grass, a little up the screen because the sun is behind the lens. As wide as the man is, and deeper if he is lying down
  const low = c.shape === 'low', wide = clamp(r[3]*q*0.5, 0.26, 1.1), deep = low ? clamp(r[4]*q*0.42, 0.12, 0.5) : 0.13, up = low ? (r[6]*q - r[4]*q*0.5)*-1 : 0.05;
  g.save(); g.translate(0, low ? -up*0.1*T : -up*T); g.scale(1, deep/wide);
  const sh = g.createRadialGradient(0, 0, 0, 0, 0, wide*T);
  sh.addColorStop(0, 'rgba(6,14,8,.5)'); sh.addColorStop(0.55, 'rgba(6,14,8,.3)'); sh.addColorStop(1, 'rgba(6,14,8,0)');
  g.fillStyle = sh; g.beginPath(); g.arc(0, 0, wide*T, 0, 7); g.fill(); g.restore();
  if (mirror) g.scale(-1, 1);
  const luts = artPalette(p), look = lookOf(p);
  const F = luts.design ? artDesignFrame(r, man.clips[clip].dirs[dir], mirror, artBody(look), luts.design, luts.third) : luts.edge ? artEdgeFrame(r) : null;   // a design's frame, his body as this picture holds it, or a Plain shirt's edge
  artBlit(g, r, luts, T, -r[5]*q, -r[6]*q, 256, F);
  const style = man.styles[look.style] || man.styles[0], hk = man.hair[style] && man.hair[style][r[7]];
  if (hk) artBlit(g, hk, luts, T, (r[8] - hk[5])*q, (r[9] - hk[6])*q, 256);
  if (mirror) g.scale(-1, 1);
  if (artNumbered(c.shape, deg)) {                           // the number, drawn in type so a mirrored man keeps it readable
    const kit = kitOf(p.team), squeeze = deg ? 0.8 : 1, nx = (mirror ? -r[10] : r[10])*q*T, ny = r[11]*q*T;
    g.save(); g.translate(nx, ny); g.scale(squeeze, 1);
    g.fillStyle = luma(kit.shirt) > 0.6 ? '#1b2233' : '#f1eee4';
    g.font = `900 ${Math.round(0.31*T)}px 'Big Shoulders Display', Impact, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (kit.hoops || kitPainted(kit)) { g.strokeStyle = kit.shirt; g.lineWidth = 0.08*T; g.lineJoin = 'round'; g.strokeText(String(p.n), 0, 0); }
    g.fillText(String(p.n), 0, 0);
    g.restore();
  }
  g.restore();
  slot.key = key; slot.t = ART.tick; ART.map.set(key, slot);
  ART.baked++; ART.bakeMs += performance.now() - started;
  return slot;
}

/* ---------- which picture ---------- */
const artNumbered = (shape, deg) => shape === 'stand' && (deg === 0 || deg === 45) && !practice;   // training tops have no numbers
const artBuild = b => (b < 0.96 ? 'slim' : b < 1.06 ? 'medium' : 'stocky');
function artFacing(s, fu, fr) {                             // eight facings, with hysteresis so a man near a diagonal doesn't flicker. 0 is straight up the screen, clockwise
  const a = (Math.atan2(fr, fu)/D2R + 360) % 360, cur = (s.d8 == null ? -1 : s.d8);
  if (cur >= 0) { let off = Math.abs(a - cur*45); if (off > 180) off = 360 - off; if (off < 29) return cur; }
  return s.d8 = Math.round(a/45) % 8;
}
function artTrack(s, sp, p, L) {                            // the stride follows ground covered at the art's own stride length, so a planted foot stays planted
  const moved = s.dist - (s.dl == null ? s.dist : s.dl);
  s.dl = s.dist;
  const m = hyp(p.fx, p.fy) || 1, back = sp > 0.5 && (p.vx*p.fx + p.vy*p.fy)/(m*sp) < -0.3;
  s.ph = ((s.ph || 0) + (back ? -moved : moved)/L + 1000) % 1;
  return Math.floor(s.ph*8) & 7;
}
function artPose(cam, p, s, k, tackler, carrier, sp, spr) { // the clip and frame this man should show this frame
  if (practice) { const own = dvPose(cam, p, s); if (own) return own; }   // a Training Ground game's own pictures
  const man = ART.man, sc = lookOf(p).h/1.8, step = carrier && !k ? ART_STEP.get(p) : null, stepU = step ? M.rt - step.at : -1;
  let fx = p.fx, fy = p.fy, clip, frame = 0, side = 0;
  if (p.down > 0) {
    if (!s.dn) { s.dn = true; s.dnAt = M.rt; s.dnT = p.down; }
    const up = Math.min(0.26, s.dnT*0.35), fall = Math.min(0.24, s.dnT*0.35), u = M.rt - s.dnAt;
    if (RM || (u >= fall && p.down >= up)) clip = 'lying';
    else if (u < fall) { clip = 'fall'; frame = Math.min(2, Math.floor(u/fall*3)); }
    else { clip = 'getup'; frame = Math.min(2, Math.floor((1 - p.down/up)*3)); }
    artTrack(s, 0, p, man.stride.run);
  } else {
    s.dn = false;
    if (tackler) {
      clip = 'tackle'; fx = k.c.x - s.wx; fy = k.c.y - s.wy;
      const u = k.T ? clamp(k.t/k.T, 0, 1) : 1, dive = k.mode === 'dive' || k.mode === 'ankle';
      frame = dive ? (u < 0.2 ? 1 : 2) : (u < 0.3 ? 0 : 1);
      artTrack(s, 0, p, man.stride.run);
    } else if (s.passAt != null && M.rt - s.passAt < 0.3 && !carrier) {
      const u = M.rt - s.passAt; clip = 'pass'; side = s.passSide; frame = u < 0.05 ? 0 : u < 0.14 ? 1 : 2;
      artTrack(s, sp, p, man.stride.run);
    } else if (stepU >= 0 && stepU < ART_STEP_T) {            // the feint, the plant and the step: its own clock, because a stride can't tell the story in 0.36s
      clip = 'sidestep'; side = step.s; frame = Math.floor(stepU/ART_STEP_T*6);
      artTrack(s, sp, p, man.stride.run);
    } else if (carrier) {
      if (k || sp >= 0.6) { clip = 'carry'; frame = artTrack(s, sp, p, man.stride.run*sc); }
      else { clip = 'carryidle'; artTrack(s, sp, p, man.stride.run); }
    } else if (sp < 0.6) {
      clip = 'idle'; frame = Math.floor(M.rt*1.2 + p.n*0.37) & 1;
      artTrack(s, sp, p, man.stride.run);
    } else if (spr > 0 || sp > 7) { clip = 'sprint'; frame = artTrack(s, sp, p, man.stride.sprint*sc); }
    else { clip = 'run'; frame = artTrack(s, sp, p, man.stride.run*sc); }
  }
  const m = hyp(fx, fy) || 1, fu = (fx*cam.u.x + fy*cam.u.y)/m, fr = (fx*cam.r.x + fy*cam.r.y)/m, d8 = artFacing(s, fu, fr);
  // the art throws to the body's left and steps to its right: the other way round is the same picture, mirrored
  const flip = clip === 'pass' ? side > 0 : clip === 'sidestep' ? step.s*(cam.r.y*fu - cam.u.y*fr) < 0 : false;
  return artSprite(clip, frame, d8, flip, lookOf(p));
}
const ART_OUT = { clip:'', frame:0, deg:0, dir:0, mirror:false, row:null, build:null };
const artBody = look => { const b = artBuild(look.b); return ART.man.sprites[b + (look.g ? '.f' : '.m')] || ART.man.sprites[b + '.m']; };   // his build's rows, a woman's where the art has them
const artAsym = p => !!(M.kit[p.team] && KIT_ASYM[M.kit[p.team].design]);   // his side's design differs left to right: read off the match's kit, no object made a frame
function artSprite(clip, frame, d8, flip, look) {           // the atlas row for a facing, mirrored where the art allows
  const man = ART.man, c = man.clips[clip], b = artBuild(look.b), body = artBody(look), rows = body[clip], out = ART_OUT;
  let d = d8, mirror = false;
  if (c.dirs.length === 8) { if (flip) { d = (8 - d8) % 8; mirror = true; } }
  else if (d > 4) { d = 8 - d; mirror = true; }
  out.clip = clip; out.frame = frame % c.n; out.dir = d; out.mirror = mirror; out.build = b;
  out.deg = c.dirs[d]; if (out.deg > 180) out.deg = 360 - out.deg;
  out.row = rows[d*c.n + out.frame];
  return out;
}
function artPrepare(cam) {                                  // once a frame: note who has just thrown a pass, and to which side of his body
  ART.tick++;
  const b = M.ball;
  if (b.state === 'held') { ART.last = b.carrier; return; }
  const from = ART.last;
  if (b.state === 'air' && b.f && b.f.kind === 'pass' && from) {
    const s = bvMan(from), m = hyp(from.fx, from.fy) || 1, fu = (from.fx*cam.u.x + from.fy*cam.u.y)/m, fr = (from.fx*cam.r.x + from.fy*cam.r.y)/m;
    const tx = b.f.x1 - from.x, ty = b.f.y1 - from.y, tu = tx*cam.u.x + ty*cam.u.y, tr = tx*cam.r.x + ty*cam.r.y;
    s.passAt = M.rt; s.passSide = tu*(-fr) + tr*fu > 0 ? 1 : -1;
  }
  ART.last = null;
}
function artCell(p, s, pose, tier, mine) {                  // his picture at this tier, or null when this frame's tints are spent. The man you run always gets his
  // the back views carry a number in type, so a mirrored one is baked mirrored; the rest are flipped when drawn
  const numbered = pose.mirror && (artNumbered(ART.man.clips[pose.clip].shape, pose.deg) || artAsym(p));   // and a design that differs left to right (halves, quarters, sash) is baked mirrored too
  if (s.aid == null || s.aEpoch !== ART.epoch) { s.aid = ART.next++; s.aEpoch = ART.epoch; }
  const base = s.aid*16384 + ((ART.ids[pose.clip]*64 + pose.dir*8 + pose.frame)*2 + (numbered ? 1 : 0))*2, key = base + tier;
  let slot = ART.map.get(key);
  if (!slot) {
    if (BV.bakes >= ART_BAKES && !mine) { slot = ART.map.get(base + 1 - tier); if (slot) slot.t = ART.tick; return slot || null; }   // the same picture at the other size is better than an old one
    BV.bakes++;
    slot = artBake(p, s, key, pose.row, pose.clip, pose.deg, tier, numbered, pose.dir);
  }
  slot.t = ART.tick;
  return slot;
}
function artDraw(at, p, s, kk, sc, ang, pose, mine) {       // draws him where at says, and gives back the slot drawn, or null if nothing can be yet
  const want = kk*V.dpr > 46 && !M.demo ? 1 : 0, numbered = pose.mirror && (artNumbered(ART.man.clips[pose.clip].shape, pose.deg) || artAsym(p));   // the dim demo keeps to the smaller sheets
  const owed = (M.demo || !!practice) && !(s.artSlot && s.artSlot.key === s.artKey);   // the demo and the Skill Games never show a hole or a code-drawn man: anyone with no picture to hold gets his now, past the budget
  let slot = artCell(p, s, pose, want, mine || owed), flip = pose.mirror && !numbered;
  if (!slot && s.artSlot && s.artSlot.key === s.artKey) { slot = s.artSlot; flip = s.artFlip; }   // tints spent: hold his last picture a frame
  if (!slot) return null;
  s.artSlot = slot; s.artKey = slot.key; s.artFlip = flip;
  const c = slot.c, look = lookOf(p), xs = look.b/ART.man.builds[pose.build];
  ctx.save(); ctx.translate(at.sx, at.sy); ctx.scale(xs*sc, sc); if (ang) ctx.rotate(ang);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(slot.cv, slot.x, slot.y, c.w, c.h, -c.S.ox*kk, -c.S.oy*kk, c.w/c.T*kk, c.h/c.T*kk);
  ctx.restore();
  return slot;
}
