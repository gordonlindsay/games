/* =========================================================
   Sound: every effect is built here from layers of Web Audio oscillators and filtered noise, with
   no samples and nothing to download. It starts after a tap.

   A sound is a voice: a small graph with its own gain, built by a recipe in SND, and gone when its
   time is up. Every voice runs into one bus (a low cut for what a phone speaker cannot play, a top
   cut, a limiter, a trim and a hard ceiling), so nothing can clip however many play at once.
   Variation is Math.random, and only once a real context is running: the game's rnd() is never
   used, and headless runs, Sound Off and a page with no audio draw nothing at all.
   The sound test page loads this very file; soundRender draws a recipe silently so it can be measured.
   ========================================================= */
const SOUND = {
  highpass:75, lowpass:11000,                                // the bus: a phone cannot play under the first, and over the second is only hiss
  limiter:{ threshold:-12, knee:6, ratio:12, attack:0.003, release:0.16 },
  trim:0.62,                                                 // takes back the make-up gain a compressor adds by itself. Every level below sits under this
  ceiling:[0.62, 0.89],                                      // the curve after it: straight up to the first, bending so nothing passes the second
  maxNodes:120, maxVoices:14, reserve:24,                    // live nodes the voices may hold (the bus's six are not counted), and room kept for the largest recipe
  level:{ whistle:1, long:1, horn:0.55, kick:1.2, strike:1.2, post:1.25, pass:2, catch:0.9, fumble:0.45, bounce:1, tackle:0.72, hit:1.35, whiff:1.25, trip:1.5, whoosh:0.6, tick:6.5, tap:1.7, roar:0.6, cheer:0.55, groan:0.58 },   // one number a sound: what the ears ask for goes here
  wakeTries:3, wakeGap:0.4, pendAge:0.25,                    // taps a stuck context gets before it is rebuilt (iOS can leave one stuck), their spacing, and how stale a held sound may be
  bed:{ peak:1, fadeIn:1.6, fadeOut:0.35 },
  // the fewest seconds between two of the same sound: past this they only pile up. Unlisted: 0.03
  gap:{ roar:0.9, cheer:0.6, groan:0.6, long:0.5, horn:0.5, whistle:0.12, post:0.1, tick:0.05, tap:0.04, catch:0.05, bounce:0.05, pass:0.04 },
  // which sound gives way when there are too many: the lowest first, then the oldest. A voice is never cut for a lesser one
  rank:{ whistle:3, long:3, horn:3, roar:2, cheer:2, groan:2, strike:2, post:2, hit:2, kick:2, tackle:2 },
};
// the key every sfx() call uses, and the name on the sound test page, in the page's order
const SOUND_NAMES = {
  whistle:'Pea Whistle', long:'Long Whistle', horn:'Horn', kick:'Kick', strike:'Goal Strike', post:'Post Clang',
  pass:'Pass', catch:'Catch', fumble:'Fumble', bounce:'Ball Bounce', tackle:'Tackle', hit:'Big Hit', whiff:'Whiff', trip:'Trip', whoosh:'Whoosh',
  tick:'Tick', tap:'Menu Tap', roar:'Crowd Roar', cheer:'Cheer', groan:'Groan',
};
let AC = null, NOISE = null, PINK = null, BUS = null, BED = null, soundUnlocked = false, soundWakes = 0, soundWakeAt = -1;
const VOICES = [], soundPend = [], soundLast = {};

/* ---------- the parts every recipe is made of ---------- */
const sndVary = (x, pct) => x*(1 + (Math.random()*2 - 1)*pct);
function sndNoiseMake(a) {                                   // two and a half seconds of white and of pink (warmer: the crowd), made once and looped from a random point
  if (NOISE) return;
  const n = Math.floor(a.sampleRate*2.5), w = a.createBuffer(1, n, a.sampleRate), p = a.createBuffer(1, n, a.sampleRate), wd = w.getChannelData(0), pd = p.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    const x = Math.random()*2 - 1;
    wd[i] = x; b0 = 0.99765*b0 + x*0.0990460; b1 = 0.96300*b1 + x*0.2965164; b2 = 0.57000*b2 + x*1.0526913;
    pd[i] = (b0 + b1 + b2 + x*0.1848)*0.2;
  }
  NOISE = w; PINK = p;
}
function sndCeiling() {                                      // straight to the knee, then a bend to the ceiling. An odd length, so silence stays exactly silence
  const [k, c] = SOUND.ceiling, n = 2049, out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = i/(n - 1)*2 - 1, m = Math.abs(x); out[i] = Math.sign(x)*(m <= k ? m : k + (c - k)*Math.tanh((m - k)/(c - k))); }
  return out;
}
function sndBus(a) {
  const input = a.createGain(), hp = a.createBiquadFilter(), lp = a.createBiquadFilter(), lim = a.createDynamicsCompressor(), trim = a.createGain(), top = a.createWaveShaper(), L = SOUND.limiter;
  hp.type = 'highpass'; hp.frequency.value = SOUND.highpass; hp.Q.value = 0.5;
  lp.type = 'lowpass'; lp.frequency.value = SOUND.lowpass; lp.Q.value = 0.5;
  lim.threshold.value = L.threshold; lim.knee.value = L.knee; lim.ratio.value = L.ratio; lim.attack.value = L.attack; lim.release.value = L.release;
  trim.gain.value = SOUND.trim; top.curve = sndCeiling();
  input.connect(hp); hp.connect(lp); lp.connect(lim); lim.connect(trim); trim.connect(top); top.connect(a.destination);
  return { input };
}
function sndVoice(a, into, key) {
  const out = a.createGain(), t = a.currentTime + 0.002;
  out.gain.value = (SOUND.level[key] == null ? 1 : SOUND.level[key])*sndVary(1, 0.06); out.connect(into);
  return { a, t, key, out, nodes:[out], srcs:[], end:t, rank:SOUND.rank[key] || 1, born:t };
}
const sndAdd = (V, node) => { V.nodes.push(node); return node; };
function sndRun(V, src, t0, t1, offset) {                    // a source starts and stops on time, and the voice lasts as long as its last one
  if (offset == null) src.start(t0); else src.start(t0, offset);
  src.stop(t1 + 0.02); V.srcs.push(src); V.end = Math.max(V.end, t1 + 0.03);
}
function sndEnv(p, t0, peak, att, dur) {                     // up fast, then the long fall a struck thing makes: 60 dB down by the end of dur
  const top = Math.max(peak, 0.0002);
  p.setValueAtTime(top*0.001, t0); p.linearRampToValueAtTime(top, t0 + att); p.exponentialRampToValueAtTime(top*0.001, t0 + Math.max(dur, att + 0.004));
}
function sndCurve(p, t0, pts, scale) {                       // [seconds, level] by straight lines, and an exponential fall into the last: a swell
  p.setValueAtTime(Math.max(0.0001, pts[0][1]*scale), t0 + pts[0][0]);
  pts.slice(1).forEach(([s, v], i) => { const at = t0 + s, x = Math.max(0.0001, v*scale); if (i === pts.length - 2) p.exponentialRampToValueAtTime(x, at); else p.linearRampToValueAtTime(x, at); });
}
// { type, f, to, glide, at, dur, peak, att, det, dest, curve } one oscillator through its own gain
function sndTone(V, o) {
  const a = V.a, t0 = V.t + (o.at || 0), osc = sndAdd(V, a.createOscillator()), g = sndAdd(V, a.createGain());
  osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + (o.glide || o.dur));
  if (o.det) osc.detune.value = o.det;
  if (o.curve) sndCurve(g.gain, t0, o.curve, o.peak); else sndEnv(g.gain, t0, o.peak, o.att || 0.004, o.dur);
  osc.connect(g); g.connect(o.dest || V.out);
  sndRun(V, osc, t0, t0 + o.dur);
  return osc;
}
// { white, kind, f, to, q, at, dur, peak, att, dest, curve } noise through one filter and its own gain
function sndBurst(V, o) {
  const a = V.a, t0 = V.t + (o.at || 0), src = sndAdd(V, a.createBufferSource()), f = sndAdd(V, a.createBiquadFilter()), g = sndAdd(V, a.createGain());
  src.buffer = o.white ? NOISE : PINK; src.loop = true;
  f.type = o.kind || 'bandpass'; f.frequency.setValueAtTime(o.f, t0); f.Q.value = o.q || 0.7;
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + (o.glide || o.dur));
  if (o.curve) sndCurve(g.gain, t0, o.curve, o.peak); else sndEnv(g.gain, t0, o.peak, o.att || 0.002, o.dur);
  src.connect(f); f.connect(g); g.connect(o.dest || V.out);
  sndRun(V, src, t0, t0 + o.dur, Math.random()*2);
}
function sndFilter(V, kind, f, q, dest) { const n = sndAdd(V, V.a.createBiquadFilter()); n.type = kind; n.frequency.value = f; n.Q.value = q; n.connect(dest || V.out); return n; }
function sndLfo(V, type, rate, depth, into, t1) {            // a slow oscillator moving a parameter
  const l = sndAdd(V, V.a.createOscillator()), g = sndAdd(V, V.a.createGain());
  l.type = type; l.frequency.value = rate; g.gain.value = depth; l.connect(g); g.connect(into);
  sndRun(V, l, V.t, t1);
  return l;
}

/* A pea whistle: a tone near 2.8 kHz, with the pea rattling its pitch and level together about 36 times a second, and the breath behind it.
   blasts: [start, length] in seconds. The rattle speeds up as the blast goes, and differs each time. */
function sndPea(V, blasts, level) {
  const a = V.a, t = V.t, f0 = sndVary(2800, 0.03), [lastAt, lastLen] = blasts[blasts.length - 1], t1 = t + lastAt + lastLen;
  const env = sndAdd(V, a.createGain()), body = sndAdd(V, a.createGain()), tone = sndAdd(V, a.createOscillator()), over = sndAdd(V, a.createOscillator()), overG = sndAdd(V, a.createGain());
  body.gain.value = 0.68; body.connect(env); env.connect(V.out);
  tone.type = 'sine'; over.type = 'sine'; over.frequency.value = f0*2.01; overG.gain.value = 0.1;
  tone.connect(body); over.connect(overG); overG.connect(body);
  env.gain.setValueAtTime(0.0001, t);
  tone.frequency.setValueAtTime(f0, t);
  const pea = sndLfo(V, 'triangle', 36, f0*0.042, tone.frequency, t1);
  const am = sndAdd(V, a.createGain()); am.gain.value = 0.32; pea.connect(am); am.connect(body.gain);
  for (const [at, len] of blasts) {
    const s = t + at, e = s + len;
    env.gain.setValueAtTime(0.0001, s); env.gain.linearRampToValueAtTime(level, s + 0.014); env.gain.linearRampToValueAtTime(level*0.86, e - 0.045); env.gain.exponentialRampToValueAtTime(0.0001, e);
    tone.frequency.setValueAtTime(f0*0.94, s); tone.frequency.exponentialRampToValueAtTime(f0, s + 0.03);   // the note scoops up as the breath arrives
    tone.frequency.setValueAtTime(f0, e - 0.05); tone.frequency.exponentialRampToValueAtTime(f0*0.965, e);  // and sags as it goes
    pea.frequency.setValueAtTime(sndVary(33, 0.1), s); pea.frequency.linearRampToValueAtTime(sndVary(42, 0.1), e);
  }
  sndRun(V, tone, t, t1); sndRun(V, over, t, t1);
  // the breath: noise on the same note, through the same envelope
  const br = sndAdd(V, a.createBufferSource()), brF = sndAdd(V, a.createBiquadFilter()), brG = sndAdd(V, a.createGain());
  br.buffer = NOISE; br.loop = true; brF.type = 'bandpass'; brF.frequency.value = f0; brF.Q.value = 3; brG.gain.value = 0.55;
  br.connect(brF); brF.connect(brG); brG.connect(body);
  sndRun(V, br, t, t1, Math.random()*2);
}
/* A crowd: three bands of pink noise and a few low voices through one formant, all under one swell, wavering so it never sits still.
   o: { curve, peak, bands:[[f, to, q, level]], voices:[f, to], formant:[f, to, q], voice, wobble:[rate, depth] } */
function sndCrowd(V, o) {
  const a = V.a, T = o.curve[o.curve.length - 1][0], t1 = V.t + T;
  const swell = sndAdd(V, a.createGain()), waver = sndAdd(V, a.createGain());
  waver.gain.value = 1; waver.connect(swell); swell.connect(V.out);
  sndCurve(swell.gain, V.t, o.curve.map(([s, v], i) => [i && i < o.curve.length - 1 ? s*sndVary(1, 0.06) : s, v]), o.peak);
  sndLfo(V, 'sine', sndVary(o.wobble[0], 0.2), o.wobble[1], waver.gain, t1);
  for (const [f, to, q, level] of o.bands) sndBurst(V, { f:sndVary(f, 0.06), to:to && sndVary(to, 0.06), q, at:0, dur:T, peak:level, att:0.02, dest:waver,
    curve:[[0, 1], [T*0.97, 1], [T, 0.01]] });
  if (o.voices) {
    const form = sndFilter(V, 'bandpass', o.formant[0], o.formant[2], waver);
    form.frequency.setValueAtTime(o.formant[0], V.t); form.frequency.exponentialRampToValueAtTime(o.formant[1], t1);
    const f0 = sndVary(1, 0.05);
    [0.92, 1, 1.09].forEach((m, i) => sndTone(V, { type:'sawtooth', f:o.voices[0]*f0*m, to:o.voices[1]*f0*m, dur:T, peak:o.voice, det:(i - 1)*9, dest:form, curve:[[0, 1], [T*0.97, 1], [T, 0.01]] }));
  }
}
function sndPat(V, at, f, peak) {                            // leather on a hand
  sndTone(V, { f, to:f*0.56, at, dur:0.055, peak });
  sndBurst(V, { white:true, f:1300, q:1.1, at, dur:0.028, peak:peak*0.42 });
}

/* ---------- the recipes. V is the voice, amt how hard (only the bounce uses it) ---------- */
const SND = {
  whistle(V) { sndPea(V, [[0, sndVary(0.3, 0.1)]], 0.13); },
  long(V) { sndPea(V, [[0, 0.17], [0.25, 0.17], [0.5, sndVary(1.05, 0.05)]], 0.13); },
  horn(V) {                                                  // a stadium hooter: two detuned reeds and a fifth, opening up as it sounds
    const f = sndVary(185, 0.02), T = sndVary(1, 0.04), form = sndFilter(V, 'lowpass', 600, 0.9), curve = [[0, 0], [0.07, 1], [T*0.82, 0.86], [T, 0.01]];
    form.frequency.setValueAtTime(600, V.t); form.frequency.exponentialRampToValueAtTime(1500, V.t + 0.14);
    sndTone(V, { type:'sawtooth', f:f*0.97, to:f, glide:0.08, dur:T, peak:0.15, curve, dest:form });
    sndTone(V, { type:'sawtooth', f:f*0.97, to:f, glide:0.08, dur:T, peak:0.15, det:7, curve, dest:form });
    sndTone(V, { type:'sawtooth', f:f*1.455, to:f*1.5, glide:0.08, dur:T, peak:0.09, det:-5, curve, dest:form });
  },
  kick(V) {                                                  // the boot's thump, a knock a small speaker can play, the leather's slap, and air as it leaves
    sndTone(V, { f:sndVary(135, 0.08), to:52, dur:0.16, peak:0.55 });
    sndTone(V, { type:'triangle', f:sndVary(340, 0.08), to:170, dur:0.06, peak:0.5 });
    sndBurst(V, { white:true, f:sndVary(2300, 0.1), q:1.1, dur:0.035, peak:0.32, att:0.001 });
    sndBurst(V, { white:true, f:1400, to:2600, q:0.9, at:0.02, dur:0.16, att:0.02, peak:0.05 });
  },
  strike(V) {                                                // the same with more of everything, and a longer flight away
    sndTone(V, { f:sndVary(115, 0.06), to:44, dur:0.17, peak:0.58 });
    sndTone(V, { type:'triangle', f:sndVary(285, 0.06), to:140, dur:0.08, peak:0.6 });
    sndBurst(V, { white:true, f:sndVary(1900, 0.1), q:0.9, dur:0.05, peak:0.5, att:0.001 });
    sndTone(V, { f:sndVary(720, 0.05), to:640, dur:0.09, peak:0.05 });
    sndBurst(V, { white:true, f:1100, to:2800, q:0.8, at:0.02, dur:0.34, att:0.03, peak:0.07 });
  },
  post(V) {                                                  // a ball's dull thud, then a metal tube ringing: partials that do not line up, the high ones gone first
    const f = sndVary(830, 0.05);
    sndTone(V, { f:190, to:120, dur:0.07, peak:0.24 });
    sndBurst(V, { white:true, f:2800, q:1, dur:0.012, peak:0.12, att:0.001 });
    [[1, 0.2, 0.75], [1.506, 0.12, 0.55], [2.31, 0.07, 0.32], [3.43, 0.035, 0.18]].forEach(([m, peak, dur]) => sndTone(V, { f:f*m*sndVary(1, 0.004), dur:dur*sndVary(1, 0.08), peak, att:0.002 }));
  },
  pass(V) {                                                  // a swish, and the fingers leaving the ball
    sndBurst(V, { white:true, f:sndVary(900, 0.1), to:sndVary(2100, 0.1), q:1.4, dur:0.09, att:0.025, peak:0.11 });
    sndTone(V, { type:'triangle', f:sndVary(560, 0.1), to:380, dur:0.025, peak:0.07 });
  },
  catch(V) {                                                 // the ball into two hands
    sndPat(V, 0, sndVary(260, 0.1), 0.2);
    sndTone(V, { type:'triangle', f:sndVary(520, 0.1), to:330, dur:0.025, peak:0.07 });
  },
  fumble(V) {                                                // patted once, twice, three times, and on to the grass
    const f = sndVary(320, 0.08), g1 = sndVary(0.08, 0.2), g2 = g1 + sndVary(0.09, 0.2);
    sndPat(V, 0, f, 0.18); sndPat(V, g1, f*0.86, 0.15); sndPat(V, g2, f*1.08, 0.12);
    sndTone(V, { f:150, to:85, at:g2 + 0.12, dur:0.09, peak:0.2 });
    sndBurst(V, { kind:'lowpass', f:1500, at:g2 + 0.12, dur:0.03, peak:0.16 });
  },
  bounce(V, amt) {                                           // a hollow ball on grass: a low note falling, its hollow, and the turf's tick. A smaller hop is softer and a little higher
    const h = 0.45 + 0.55*amt, f = sndVary(165, 0.1)*(1 + (1 - amt)*0.25);
    sndTone(V, { f, to:f*0.58, dur:0.09, peak:0.36*h });
    sndTone(V, { type:'triangle', f:f*2.6, to:f*1.9, dur:0.04, peak:0.17*h });
    sndBurst(V, { kind:'lowpass', f:1800, dur:0.03, peak:0.3*h, att:0.001 });
  },
  tackle(V) {                                                // the body, the chest's air, cloth, and the grass scuffed after
    sndTone(V, { f:sndVary(100, 0.08), to:46, dur:0.13, peak:0.46 });
    sndBurst(V, { f:sndVary(420, 0.1), to:260, q:0.9, dur:0.09, peak:0.85 });
    sndBurst(V, { white:true, f:1700, q:0.8, dur:0.04, peak:0.08 });
    sndBurst(V, { white:true, kind:'highpass', f:2400, to:1100, q:0.5, at:0.035, dur:0.2, att:0.02, peak:0.045 });
  },
  hit(V) {                                                   // a Big Hit: more body, a punch, the grass thrown up, and the crowd's breath in
    sndTone(V, { f:sndVary(82, 0.06), to:36, dur:0.24, peak:0.55 });
    sndTone(V, { type:'triangle', f:sndVary(190, 0.08), to:85, dur:0.09, peak:0.36 });
    sndBurst(V, { kind:'lowpass', f:520, dur:0.22, peak:1 });
    sndBurst(V, { white:true, f:2600, to:1200, q:0.6, at:0.05, dur:0.3, att:0.02, peak:0.09 });
    sndBurst(V, { f:620, to:480, q:2, at:0.06, dur:0.6, att:0.12, peak:0.5 });
  },
  whiff(V) {                                                 // arms through air and nothing there
    sndBurst(V, { white:true, f:sndVary(2100, 0.12), to:650, q:1.6, dur:0.14, att:0.03, peak:0.13 });
    sndBurst(V, { kind:'lowpass', f:600, at:0.05, dur:0.1, att:0.02, peak:0.09 });
  },
  trip(V) {                                                  // a tap on the ankle, a scuff, and a foot coming down
    sndTone(V, { type:'square', f:sndVary(620, 0.08), to:380, dur:0.05, peak:0.24 });   // the part a phone speaker can play: it carries the cue
    sndTone(V, { type:'triangle', f:sndVary(440, 0.1), to:240, dur:0.035, peak:0.15 });
    sndBurst(V, { white:true, f:1500, to:800, q:0.9, at:0.015, dur:0.1, att:0.006, peak:0.1 });
    sndTone(V, { f:150, to:90, at:0.06, dur:0.05, peak:0.13 });
  },
  whoosh(V) {                                                // a body going past
    const T = sndVary(0.26, 0.12);
    sndBurst(V, { white:true, f:650, to:sndVary(1700, 0.15), q:1, dur:T, att:T*0.36, peak:0.1 });
    sndBurst(V, { kind:'lowpass', f:900, dur:T*0.8, att:T*0.3, peak:0.16 });
  },
  tick(V) {                                                  // a small bright click: a cue in play
    const f = sndVary(1480, 0.03);
    sndTone(V, { f, dur:0.04, peak:0.08, att:0.001 });      // long enough to be heard, and it is the only sound for several cues in play
    sndTone(V, { f:f*2, dur:0.016, peak:0.03, att:0.001 });
  },
  tap(V) {                                                   // a round soft press: the menus
    sndTone(V, { f:sndVary(760, 0.03), to:560, dur:0.05, peak:0.075, att:0.002 });
    sndBurst(V, { white:true, f:2400, q:1, dur:0.008, peak:0.018, att:0.001 });
  },
  roar(V) {
    sndCrowd(V, { peak:0.9, wobble:[3.4, 0.14], curve:[[0, 0], [0.18, 0.42], [0.52, 1], [1.25, 0.86], [2.1, 0.46], [3.4, 0.012]],
      bands:[[380, 440, 0.6, 0.62], [950, 1100, 0.6, 0.62], [2100, 2300, 0.9, 0.34]], voices:[238, 300], formant:[780, 980, 1.2], voice:0.05 });
  },
  cheer(V) {
    sndCrowd(V, { peak:0.7, wobble:[4.6, 0.16], curve:[[0, 0], [0.12, 0.6], [0.34, 1], [0.92, 0.68], [2.1, 0.012]],
      bands:[[520, 600, 0.6, 0.38], [1150, 1400, 0.7, 0.62], [2300, 2500, 1.2, 0.36]], voices:[300, 372], formant:[1050, 1300, 1.5], voice:0.05 });
  },
  groan(V) {                                                 // falling: the note and the vowel both drop, from "oh" to "ooh"
    sndCrowd(V, { peak:0.75, wobble:[2.6, 0.1], curve:[[0, 0], [0.18, 1], [0.6, 0.74], [1.8, 0.012]],
      bands:[[420, 250, 1, 0.72], [900, 520, 1.4, 0.32]], voices:[218, 150], formant:[520, 340, 1.8], voice:0.11 });
  },
};

/* ---------- playing them ---------- */
const soundLive = () => VOICES.reduce((n, v) => n + v.nodes.length, 0);
function sndKill(v) {
  for (const s of v.srcs) { try { s.stop(); } catch (e) { /* already stopped */ } }
  for (const n of v.nodes) { try { n.disconnect(); } catch (e) { /* already gone */ } }
  const i = VOICES.indexOf(v); if (i >= 0) VOICES.splice(i, 1);
  if (BED === v) BED = null;
}
function soundSweep() {                                      // a voice whose time is up leaves the graph
  if (!AC) return;
  const now = AC.currentTime;
  for (const v of VOICES.slice()) if (now >= v.end) sndKill(v);
}
function sndRoom(rank) {                                     // room for one more: the lowest and oldest give way. False when only as good or better is left, so the new one is dropped
  const over = () => VOICES.length >= SOUND.maxVoices || soundLive() + SOUND.reserve > SOUND.maxNodes;
  while (over()) {
    let pick = null;
    for (const v of VOICES) if (v !== BED && v.rank <= rank && (!pick || v.rank < pick.rank || (v.rank === pick.rank && v.born < pick.born))) pick = v;
    if (!pick) return false;
    sndKill(pick);
  }
  return true;
}
function sndStart(a, into, k, amt) {                         // the one way a recipe becomes a voice, heard or measured
  const V = sndVoice(a, into, k);
  try { SND[k](V, amt == null ? 1 : Math.max(0, Math.min(1, amt))); } catch (e) { sndKill(V); return null; }   // a sound that fails is a silence, never a stopped game
  return V;
}
function soundPlay(k, amt) {
  if (!SND[k]) return;
  const a = ac(); if (!a || document.hidden) return;
  if (a.state !== 'running') {                               // not awake yet (the first tap is often this): held a moment. Scheduled now, they would all go off together when it wakes
    if (soundPend.length < 4) soundPend.push({ k, amt, at:performance.now() });
    return;
  }
  soundSweep();
  const now = a.currentTime, gap = SOUND.gap[k] == null ? 0.03 : SOUND.gap[k];
  if (soundLast[k] != null && now - soundLast[k] < gap) return;
  if (!sndRoom(SOUND.rank[k] || 1)) return;
  soundLast[k] = now;
  const V = sndStart(a, BUS.input, k, amt);
  if (V) VOICES.push(V);
}
function sndWoke() {                                         // the context is running: what was held plays if it is still fresh
  if (!AC || AC.state !== 'running') return;
  soundWakes = 0;
  const fresh = soundPend.splice(0).filter(p => performance.now() - p.at <= SOUND.pendAge*1000);
  for (const p of fresh) soundPlay(p.k, p.amt);
}
function ac() {
  if (!settings.sound) return null;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;                                   // the tools run with no audio at all: nothing is built and no random number drawn
    if (!AC || AC.state === 'closed') {
      AC = new Ctx(); BUS = null; soundUnlocked = false;
      for (const k of Object.keys(soundLast)) delete soundLast[k];   // a new context's clock starts again
      AC.onstatechange = sndWoke;
    }
    if (!BUS) { sndNoiseMake(AC); BUS = sndBus(AC); }
    if (AC.state !== 'running') { const p = AC.resume(); if (p && p.then) p.then(sndWoke, () => {}); }
    return AC;
  } catch (e) { return null; }
}
function sfx(k, amt) {
  if (globalThis.__sfxSpy) globalThis.__sfxSpy(k, M && M.cut ? M.cut.t : null);   // the tools count sounds
  if (k !== 'tap' && (!M || M.demo || M.headless)) return;   // a menu tap plays over the demo; nothing else does
  soundPlay(k, amt);
}

/* ---------- the crowd under a match ---------- */
function bedBuild(a, into) {                                 // two slow bands of pink noise, each drifting, far under everything else
  const V = sndVoice(a, into, 'bed'), S = SOUND.bed;
  V.end = Infinity; V.rank = Infinity;
  V.out.gain.setValueAtTime(0.0001, V.t); V.out.gain.linearRampToValueAtTime(S.peak, V.t + S.fadeIn);
  [[620, 0.5, 0.032, 0.13, 1], [1500, 0.7, 0.014, 0.31, 0.83]].forEach(([f, q, level, rate, speed]) => {
    const src = sndAdd(V, a.createBufferSource()), g = sndAdd(V, a.createGain()), flt = sndFilter(V, 'bandpass', sndVary(f, 0.05), q, g);
    src.buffer = PINK; src.loop = true; src.playbackRate.value = speed;
    src.connect(flt); g.connect(V.out); g.gain.value = level;
    src.start(V.t, Math.random()*2); V.srcs.push(src);
    const l = sndAdd(V, a.createOscillator()), lg = sndAdd(V, a.createGain());
    l.frequency.value = sndVary(rate, 0.1); lg.gain.value = level*0.3; l.connect(lg); lg.connect(g.gain);
    l.start(V.t); V.srcs.push(l);
  });
  return V;
}
function bedStop() {                                         // fades, then the sweep takes it
  if (!BED) return;
  const v = BED, now = v.a.currentTime, S = SOUND.bed; BED = null;
  v.out.gain.cancelScheduledValues(now); v.out.gain.setTargetAtTime(0, now, S.fadeOut/4);
  for (const s of v.srcs) { try { s.stop(now + S.fadeOut + 0.05); } catch (e) { /* already stopped */ } }
  v.end = now + S.fadeOut + 0.1; v.rank = 0;
}
function bedSync(want) {                                     // called every frame. Never builds a context by itself, and waits for the tap that wakes one
  const on = !!want && !!settings.sound && !document.hidden && !!AC && AC.state === 'running' && !!BUS;
  if (!on) { if (BED) bedStop(); return; }
  if (!BED) { BED = bedBuild(AC, BUS.input); VOICES.push(BED); }
}
function soundFrame(want) { try { soundSweep(); bedSync(want); } catch (e) { /* the frame goes on */ } }

/* ---------- quiet, hidden, off, and waking up ---------- */
function soundQuiet() {                                      // leaving a match: what is sounding fades in a moment, and the crowd with it
  if (!AC) return;
  bedStop();
  const now = AC.currentTime;
  for (const v of VOICES) {
    if (v.end <= now + 0.14) continue;
    v.out.gain.cancelScheduledValues(now); v.out.gain.setTargetAtTime(0, now, 0.03);
    for (const s of v.srcs) { try { s.stop(now + 0.14); } catch (e) { /* already stopped */ } }
    v.end = now + 0.15;
  }
}
function soundCut() {                                        // everything, at once: nothing may be left waiting in a suspended context
  soundPend.length = 0;
  for (const v of VOICES.slice()) sndKill(v);
  BED = null;
}
function soundHidden() {                                     // a hidden page plays nothing and holds nothing
  soundCut();
  if (AC && AC.state === 'running') { const p = AC.suspend(); if (p && p.catch) p.catch(() => {}); }
}
function soundShown() { if (settings.sound && AC && AC.state !== 'running') { const p = AC.resume(); if (p && p.then) p.then(sndWoke, () => {}); } }   // iOS may refuse until the next tap: soundUnlock asks again
function soundOff() { soundCut(); if (AC && AC.state === 'running') { const p = AC.suspend(); if (p && p.catch) p.catch(() => {}); } }   // Sound Off: silent now, and the phone's audio let go
function soundUnlock() {                                     // every tap and key: iOS only starts or restarts audio inside one
  if (!settings.sound) return;
  const a = ac(); if (!a) return;
  if (!soundUnlocked) {                                      // the first tap plays one silent sample, the old iOS unlock
    try { const s = a.createBufferSource(); s.buffer = a.createBuffer(1, 1, a.sampleRate); s.connect(a.destination); s.start(0); soundUnlocked = true; } catch (e) { /* the next tap tries again */ }
  }
  if (a.state === 'running') { soundWakes = 0; return; }
  const now = performance.now()/1000;                        // one tap fires several events: they count once
  if (now - soundWakeAt < SOUND.wakeGap) return;
  soundWakeAt = now;
  if (++soundWakes >= SOUND.wakeTries) {                     // still asleep after a few taps (a phone call or a long time away can do this): start again with a new context
    soundWakes = 0; soundCut(); AC.onstatechange = null;
    try { const c = AC.close(); if (c && c.catch) c.catch(() => {}); } catch (e) { /* it is going anyway */ }
    AC = null; BUS = null;
    ac();
  }
}
for (const type of ['touchend', 'pointerup', 'mousedown', 'keydown', 'click']) document.addEventListener(type, soundUnlock, { capture:true, passive:true });
document.addEventListener('visibilitychange', () => { if (document.hidden) soundHidden(); else soundShown(); });
window.addEventListener('pagehide', soundHidden);
window.addEventListener('pageshow', soundShown);
// A press on anything in the menus. It listens after the button's own handler, so pressing Sound On is heard and Sound Off is not. The match's three action buttons make their own sounds
document.addEventListener('click', e => {
  const b = e.target && e.target.closest ? e.target.closest('button, summary') : null;
  if (b && !b.classList.contains('act')) sfx('tap');
});

/* ---------- measuring: the same recipes through the same bus, into an OfflineAudioContext ---------- */
function sndMeasure(d, rate) {
  let peak = 0, clipped = 0, first = -1, lastAt = -1;
  const floor = Math.pow(10, -60/20);
  for (let i = 0; i < d.length; i++) { const m = Math.abs(d[i]); if (m > peak) peak = m; if (m >= 1) clipped++; if (m > floor) { if (first < 0) first = i; lastAt = i; } }
  let sum = 0; const n = lastAt >= first && first >= 0 ? lastAt - first + 1 : 0;
  for (let i = first; i <= lastAt && n; i++) sum += d[i]*d[i];
  const rms = n ? Math.sqrt(sum/n) : 0, db = x => (x > 0 ? 20*Math.log10(x) : -Infinity);
  return { peak, peakDb:db(peak), rms, rmsDb:db(rms), length:n/rate, clipped };
}
function soundRender(keys, o = {}) {                         // keys: a key, 'bed', or a list struck together. Resolves to its peak, RMS, length and clipped samples
  const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext, rate = o.rate || 48000, secs = o.secs || 4;
  const a = new Off(1, Math.floor(rate*secs), rate);
  sndNoiseMake(a);
  const bus = sndBus(a);
  for (const k of [].concat(keys)) { if (k === 'bed') bedBuild(a, bus.input); else sndStart(a, bus.input, k, o.amt); }
  return a.startRendering().then(buf => {
    const m = sndMeasure(buf.getChannelData(0), rate);
    if (o.samples) m.samples = buf.getChannelData(0);
    return m;
  });
}
function buzz(ms, team) {                                  // the phone's vibration, and the rumble on a team's seat (every seat when no team is given)
  if (!M || M.demo || M.headless) return;
  if (team == null) { for (const s of [0, 1]) rumble(s, ms); } else rumble(seatOfTeam(team), ms);
  if (typeof nativeBuzz === 'function' && nativeBuzz(ms)) return;   // the Try Line app: the phone's haptics (native.js)
  if (!navigator.vibrate) return;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try { navigator.vibrate(ms); } catch (e) { /* unsupported */ }
}
