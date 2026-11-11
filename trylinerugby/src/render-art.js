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
const ART = { state:'idle', gen:0, man:null, pages:[], classes:{}, map:new Map(), sheets:0, tick:0, next:1, epoch:0, baked:0, bakeMs:0, scratch:null, sg:null, img:null, luts:new Map(), last:null, promise:null };
const artReady = () => ART.state === 'ready';
function artInstall(man, pages) {                           // a parsed players.json and its decoded pages: [{ w, h, data }]
  ART.gen++; ART.man = man; ART.pages = pages; ART.ids = ART_CLIPS.reduce((o, c, i) => { o[c] = i; return o; }, {});
  ART.parts = man.parts; ART.state = 'ready'; artClear();
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
  ART.map.clear(); ART.tick = 0; ART.next = 1; ART.epoch++; ART.luts.clear(); ART.last = null;
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
  const trim = colorDist(kit.trim, skin) < 70 && colorDist(kit.shirt, skin) < 90 ? '#f1eee4' : kit.trim;
  // a lock is a plait, a bunch or a tail: hair on hair, a step darker, or lighter when the hair is too dark to go darker, so it shows against the head it falls over
  const lock = luma(hair) < 0.16 ? artMix(hair, '#8a6548', 0.24) : artMix(hair, '#17120e', 0.3);
  const table = { shirt:kit.shirt, hoop:kit.hoops ? kit.trim : kit.shirt, trim, shorts:kit.shorts, socks:kit.shirt, skin, hair, boots:kit.boots || '#22252b', shaved:artMix(skin, hair, 0.45), eye:'#120e0c', cap, line:'#0a120d', lock };
  const out = [null];
  for (const name of ART.parts) out.push(artLut(table[name]));
  return out;
}
function artBlit(g, r, luts, T, dx, dy, W) {                 // one crop of the atlas, tinted, drawn at dx, dy in metres
  const page = ART.pages[r[0]], d = page.data, w = r[3], h = r[4], out = ART.img.data, pw = page.w*4;
  for (let y = 0; y < h; y++) {
    let i = (r[2] + y)*pw + r[1]*4, j = y*W*4;
    for (let x = 0; x < w; x++, i += 4, j += 4) {
      const cov = d[i + 2];
      if (cov) { const L = luts[d[i + 1] >> 4], s = d[i]*3; out[j] = L[s]; out[j + 1] = L[s + 1]; out[j + 2] = L[s + 2]; out[j + 3] = cov; }
      else out[j + 3] = 0;
    }
  }
  for (let y = 0; y <= h; y++) out[(y*W + w)*4 + 3] = 0;     // a clear edge past the crop: scaling down samples it, and it may hold the last picture
  for (let x = 0; x < w; x++) out[(h*W + x)*4 + 3] = 0;
  ART.sg.putImageData(ART.img, 0, 0, 0, 0, w + 1, h + 1);
  const q = T/ART.man.px;
  g.drawImage(ART.scratch, 0, 0, w, h, dx*T, dy*T, w*q, h*q);
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
  const kit = { shirt:t.kit, trim:t.trim, hoops:!!t.hoops, shorts:luma(t.kit) > 0.6 ? '#1b2233' : '#ece9df' }, luts = artPaletteOf(kit, look);
  const style = man.styles[look.style] || man.styles[0], hk = man.hair[style] && man.hair[style][r[7]];
  g.clearRect(0, 0, cv.width, cv.height);
  g.save(); g.translate(cv.width/2, cv.height - 6); g.scale(look.b/man.builds[pose.build], 1);
  artBlit(g, r, luts, T, -r[5]*q, -r[6]*q, 256);
  if (hk) artBlit(g, hk, luts, T, (r[8] - hk[5])*q, (r[9] - hk[6])*q, 256);
  g.restore();
  return true;
}
function artBake(p, s, key, r, clip, deg, tier, mirror) {   // one picture for one man
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
  const luts = artPalette(p);
  artBlit(g, r, luts, T, -r[5]*q, -r[6]*q, 256);
  const look = lookOf(p), style = man.styles[look.style] || man.styles[0], hk = man.hair[style] && man.hair[style][r[7]];
  if (hk) artBlit(g, hk, luts, T, (r[8] - hk[5])*q, (r[9] - hk[6])*q, 256);
  if (mirror) g.scale(-1, 1);
  if (artNumbered(c.shape, deg)) {                           // the number, drawn in type so a mirrored man keeps it readable
    const kit = kitOf(p.team), squeeze = deg ? 0.8 : 1, nx = (mirror ? -r[10] : r[10])*q*T, ny = r[11]*q*T;
    g.save(); g.translate(nx, ny); g.scale(squeeze, 1);
    g.fillStyle = luma(kit.shirt) > 0.6 ? '#1b2233' : '#f1eee4';
    g.font = `900 ${Math.round(0.31*T)}px 'Big Shoulders Display', Impact, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (kit.hoops) { g.strokeStyle = kit.shirt; g.lineWidth = 0.08*T; g.lineJoin = 'round'; g.strokeText(String(p.n), 0, 0); }
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
function artSprite(clip, frame, d8, flip, look) {           // the atlas row for a facing, mirrored where the art allows
  const man = ART.man, c = man.clips[clip], b = artBuild(look.b), body = man.sprites[b + (look.g ? '.f' : '.m')] || man.sprites[b + '.m'], rows = body[clip], out = ART_OUT;
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
  const numbered = pose.mirror && artNumbered(ART.man.clips[pose.clip].shape, pose.deg);
  if (s.aid == null || s.aEpoch !== ART.epoch) { s.aid = ART.next++; s.aEpoch = ART.epoch; }
  const base = s.aid*16384 + ((ART.ids[pose.clip]*64 + pose.dir*8 + pose.frame)*2 + (numbered ? 1 : 0))*2, key = base + tier;
  let slot = ART.map.get(key);
  if (!slot) {
    if (BV.bakes >= ART_BAKES && !mine) { slot = ART.map.get(base + 1 - tier); if (slot) slot.t = ART.tick; return slot || null; }   // the same picture at the other size is better than an old one
    BV.bakes++;
    slot = artBake(p, s, key, pose.row, pose.clip, pose.deg, tier, numbered);
  }
  slot.t = ART.tick;
  return slot;
}
function artDraw(at, p, s, kk, sc, ang, pose, mine) {       // draws him where at says, and gives back the slot drawn, or null if nothing can be yet
  const want = kk*V.dpr > 46 && !M.demo ? 1 : 0, numbered = pose.mirror && artNumbered(ART.man.clips[pose.clip].shape, pose.deg);   // the dim demo keeps to the smaller sheets
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
