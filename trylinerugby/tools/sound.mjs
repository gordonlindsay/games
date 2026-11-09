// Sound: the keys, Sound Off, the crowd bed stopping, the cap on live nodes, the phone's waking up, no use of the match's random numbers, and the
// sound test page. Node has no audio, so a stand-in AudioContext records what the code asks for. What it sounds like, and the levels, need a browser
// and ears (the levels table in the README is from OfflineAudioContext in a browser). Exits 1 on any failure.
// node tools/sound.mjs
process.env.SEED ??= '41';
import fs from 'node:fs';
import vm from 'node:vm';
const { T, rndCalls, reseed } = await import('./harness.mjs');
const { shellAssets } = await import('./build.mjs');
const S = T.sound, D = T.debug, X = T.teams, set = D.settings(), STEP = T.STEP;
const memory = {};
globalThis.localStorage = { getItem:k => memory[k] ?? null, setItem(k, v) { memory[k] = v; } };
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('FAIL', msg); } if (process.env.VERBOSE) console.log(cond ? 'ok  ' : 'FAIL', msg); };
const read = p => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const manifest = JSON.parse(read('../src/manifest.json'));

const bad = [];
// a stand-in context: every node it hands out is kept, with what was done to it
function makeFake(start = 'running') {
  const made = [];
  // what a real AudioParam refuses is written down, because the game catches it: a bad number in a recipe would otherwise be a silence no test sees
  const sane = (v, t) => { if (!Number.isFinite(v) || !Number.isFinite(t) || t < 0) bad.push([v, t]); };
  class Param { constructor(v) { this.value = v; this.log = []; } setValueAtTime(v, t) { sane(v, t); this.log.push(['set', v, t]); } linearRampToValueAtTime(v, t) { sane(v, t); this.log.push(['lin', v, t]); } exponentialRampToValueAtTime(v, t) { sane(v, t); if (!(v > 0)) bad.push(['exp', v, t]); this.log.push(['exp', v, t]); } setTargetAtTime(v, t, c) { sane(v, t); this.log.push(['tgt', v, t, c]); } cancelScheduledValues(t) { this.log.push(['cancel', t]); } }
  class Ctx {
    constructor() { this.state = start; this.currentTime = 0; this.sampleRate = 8000; this.destination = { dest:true }; this.nodes = []; this.resumes = 0; this.suspends = 0; this.resumeTo = 'running'; made.push(this); }
    node(kind, o) { const n = { kind, on:null, off:false, started:false, stops:[], connect(d) { this.on = d; return d; }, disconnect() { this.off = true; }, start(t, offset) { if (this.started) throw new Error('started twice'); this.started = true; this.at = t; this.offset = offset; }, stop(t) { this.stops.push(t); }, ...o }; this.nodes.push(n); return n; }
    createGain() { return this.node('gain', { gain:new Param(1) }); }
    createOscillator() { return this.node('osc', { type:'sine', frequency:new Param(440), detune:new Param(0) }); }
    createBufferSource() { return this.node('buffer', { buffer:null, loop:false, playbackRate:new Param(1) }); }
    createBiquadFilter() { return this.node('filter', { type:'lowpass', frequency:new Param(350), Q:new Param(1) }); }
    createDynamicsCompressor() { return this.node('comp', { threshold:new Param(-24), knee:new Param(30), ratio:new Param(12), attack:new Param(0.003), release:new Param(0.25) }); }
    createWaveShaper() { return this.node('shape', { curve:null }); }
    createBuffer(ch, n, rate) { const d = new Float32Array(n); return { sampleRate:rate, length:n, duration:n/rate, getChannelData:() => d }; }
    resume() { this.resumes++; if (this.resumeTo) { this.state = this.resumeTo; if (this.onstatechange) this.onstatechange(); } return Promise.resolve(); }
    suspend() { this.suspends++; this.state = 'suspended'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
  }
  return { Ctx, made };
}
const voiceNodes = c => c.nodes.filter(n => !n.bus);
function freshAudio(state = 'running') {                     // a new stand-in, with whatever the last one left behind gone
  const old = S.ctx(); if (old) { S.off(); if (old.close) old.close(); }
  const f = makeFake(state); globalThis.AudioContext = f.Ctx; S.ac(); const c = S.ctx();
  if (c) for (const n of c.nodes) n.bus = true;              // the bus and anything built with the context
  return { f, c };
}
const advance = (c, s) => { c.currentTime += s; };

// 1. the keys: every sfx() in the game has a recipe and a name; the old keys and the new ones are all there
{
  const used = new Set();
  for (const f of manifest) for (const m of read('../src/' + f).matchAll(/\bsfx\(\s*(?:[^'",)]*\?\s*)?'([a-z]+)'(?:\s*:\s*'([a-z]+)')?/g)) { used.add(m[1]); if (m[2]) used.add(m[2]); }
  ok(used.size >= 19, `the source's sfx() keys read (${[...used].join(', ')})`);
  for (const k of used) { ok(!!S.SND[k] && !!S.NAMES[k], `sfx('${k}') has a recipe and a name`); }
  const OLD = ['whistle', 'long', 'horn', 'kick', 'pass', 'tackle', 'roar', 'cheer', 'whoosh', 'tick', 'strike', 'post', 'groan', 'hit', 'whiff', 'trip'], NEW = ['bounce', 'catch', 'fumble', 'tap'];
  for (const k of [...OLD, ...NEW]) ok(typeof S.SND[k] === 'function' && used.has(k), `${k} is a recipe the game plays`);
  ok(Object.keys(S.SND).join() === Object.keys(S.NAMES).join(), 'the recipes and the names match, in order');
  ok(Object.keys(S.SND).every(k => S.SOUND.level[k] > 0), 'every sound has a level');
  const seen = []; globalThis.__sfxSpy = (k, t) => seen.push([k, t]);
  T.newMatch(0, 1, { halfLen:60, diff:0, humans:[true, false] });
  S.sfx('kick'); S.sfx('bounce', 0.4); S.sfx('tap'); S.sfx('nothing-by-this-name');
  ok(seen.map(s => s[0]).join() === 'kick,bounce,tap,nothing-by-this-name' && seen[0][1] === null, '__sfxSpy still hears every sfx(key), with the close-up time');
  globalThis.__sfxSpy = null;
  const titled = Object.values(S.NAMES).every(n => n.split(' ').every(w => /^[A-Z]/.test(w)));
  ok(titled, 'the names are Title Case');
  // where the new sounds are wired in
  const egg = read('../src/training.js'), ball = read('../src/ball.js'), match = read('../src/match.js');
  ok(/function eggHop[\s\S]*?sfx\('bounce', Math\.min\(1, vz\/K\.pop\[1\]\)\)/.test(egg), 'Bouncy Egg sounds a bounce on each hop, by how big the hop is');
  ok(/function updateLoose[\s\S]*?sfx\('bounce', /.test(ball), 'a loose ball bounces');
  ok(/function catchBall[\s\S]*?setCarrier\(p\); sfx\('catch'\)/.test(match), 'a clean catch is heard');
  ok(/function knockOn[\s\S]*?sfx\('fumble'\)/.test(match), 'a knock-on fumbles');
}

// 2. the real flows make the new sounds, and in the order the game plays them
{
  const seen = []; globalThis.__sfxSpy = k => seen.push(k);
  T.newMatch(0, 1, { halfLen:60, diff:0, humans:[true, false] }); const M = T.M, p = M.players;
  M.phase = 'play'; M.ball.f = { kind:'kick', team:1 }; M.ball.state = 'air';
  const rand = Math.random; let n = 0; Math.random = () => { n++; return 0.99; };   // no knock-on here (the wrapped draw comes first for rnd(), which was captured)
  const before = seen.length; const k0 = M.stats.knocks; T.kids.catchBall(p[2], 'kick');
  Math.random = rand;
  ok(M.stats.knocks > k0 ? seen.slice(before).join() === 'fumble,whistle' : seen.slice(before).join() === 'catch', `a catch or a knock-on sounds right (${seen.slice(before).join()})`);
  // a loose ball's hops: harder ones first, at most a few, and none once it has settled
  T.newMatch(0, 1, { halfLen:60, diff:0, humans:[true, false] }); const b = T.M.ball;
  for (const q of T.M.players) { q.x = q.team ? 110 : 12; q.y = 5; }
  T.M.phase = 'play'; b.state = 'loose'; b.carrier = null; b.f = null; b.x = 60; b.y = 35; b.z = 2; b.vx = 1; b.vy = 0; b.vz = 0; b.last = 0;
  const hops = []; globalThis.__sfxSpy = (k) => { if (k === 'bounce') hops.push(k); };
  for (let i = 0; i < 400 && b.state === 'loose'; i++) T.update(STEP);
  ok(hops.length >= 1 && hops.length <= 6, `a loose ball bounces a few times and stops (${hops.length})`);
  // Bouncy Egg: one bounce per hop
  reseed(211); T.practice.start('egg'); document.getElementById('pr-retry').click();
  const E = T.practice.state().egg, eb = T.M.ball; let hopN = 0; globalThis.__sfxSpy = k => { if (k === 'bounce') hopN++; };
  for (let i = 0; i < 2000 && E.stage !== 'fly'; i++) T.update(STEP);
  hopN = 0;
  for (let i = 0; i < 2000 && E.stage === 'fly'; i++) { E.me.x = eb.x < 62 ? 72.9 : 51.1; E.me.y = eb.y < 35 ? 45.9 : 24.1; T.update(STEP); }
  ok(E.hops.length >= 2 && hopN === E.hops.length, `Bouncy Egg: one bounce a hop (${hopN} on ${E.hops.length} hops)`);
  globalThis.__sfxSpy = null; T.practice.leave(); D.setTwo(false); D.exitMatch();
}

// 3. no audio at all (the tools) and a headless match: not one random number drawn, whichever sound. Seeded runs cannot move
{
  delete globalThis.AudioContext;
  T.newMatch(0, 1, { halfLen:60, diff:0, humans:[true, false] });
  let before = rndCalls();
  for (const k of Object.keys(S.NAMES)) S.sfx(k);
  S.sfx('bounce', 0.2);
  for (let i = 0; i < 20; i++) S.frame();
  ok(rndCalls() === before, `no audio: every sound draws no random number (${rndCalls() - before})`);
  const src = read('../src/sound.js');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  ok(!/\brnd\b/.test(code), 'src/sound.js never touches rnd');
  ok(/Math\.random/.test(code), 'its variation is Math.random');
  const auto = (withAudio) => {
    if (withAudio) { const f = makeFake(); globalThis.AudioContext = f.Ctx; } else delete globalThis.AudioContext;
    reseed(901); T.newMatch(0, 3, { halfLen:60, diff:0, auto:true, headless:true }); let n = 0; const r0 = rndCalls();
    while (!T.M.over && n < 60000) { T.update(STEP); n++; }
    return JSON.stringify([T.M.score, T.M.tries, T.M.stats, rndCalls() - r0]);
  };
  const a = auto(false), b = auto(true);
  ok(a === b, 'a seeded headless match plays the same with a context there as with none, draw for draw');
  delete globalThis.AudioContext;
}

// 4. Sound Off: no context is ever made, nothing is built, no number drawn, and pressing Off silences what is playing
{
  const old = S.ctx(); if (old) { S.off(); old.close(); }
  set.sound = false;
  const f = makeFake(); globalThis.AudioContext = f.Ctx;
  const already = f.made.length;
  D.startMatch(X.CLUBS[0], X.CLUBS[1], false);
  const r0 = rndCalls();
  for (const k of Object.keys(S.NAMES)) S.sfx(k);
  S.unlock(); S.frame(); S.frame();
  ok(rndCalls() === r0, 'Sound Off: no random number drawn');
  ok(!S.bedOn() && S.live() === 0, 'Sound Off: nothing built, no crowd');
  ok(f.made.length === already || (S.ctx() && S.ctx().state === 'closed') , 'Sound Off: a new match, sounds and a tap make no context');
  D.exitMatch();
  set.sound = true;
  const { c } = freshAudio();
  D.startMatch(X.CLUBS[0], X.CLUBS[1], false);
  S.sfx('roar'); S.frame();
  ok(S.bedOn() && S.live() > 0, 'Sound On: the crowd and a roar are playing');
  D.exitMatch();
  const seg = document.querySelectorAll('.seg[data-key]').find(g => g.dataset.key === 'sound');
  S.sfx('tap');
  seg.children[1].click();
  ok(set.sound === false && S.live() === 0 && c.state === 'suspended', 'pressing Off stops every voice at once and lets the audio go');
  D.startMatch(X.CLUBS[0], X.CLUBS[1], false); S.frame(); S.sfx('kick');
  ok(!S.bedOn() && S.live() === 0, 'and nothing plays in a match after it');
  D.exitMatch();
  seg.children[0].click();
  ok(set.sound === true && c.state === 'running', 'pressing On wakes it');
  ok(!!JSON.parse(memory['tryline.v1']).settings && JSON.parse(memory['tryline.v1']).settings.sound === true, 'and it saves');
}

// 5. the crowd bed: under a match you play and nowhere else, and it stops at pause, on leaving, and when the page is hidden
{
  const { c } = freshAudio();
  const run = (s) => { advance(c, s); S.frame(); };
  run(0.02); ok(!S.bedOn(), 'none on the menus, over the demo');
  ok(S.live() === 0, 'nothing live on the menus');
  D.startMatch(X.CLUBS[0], X.CLUBS[1], false); run(0.02);
  ok(S.wanted() && S.bedOn(), 'a match starts it');
  const bedNodes = S.live(); run(0.02); run(0.02);
  ok(S.live() === bedNodes, 'once: a frame does not build another');
  D.pause(); ok(T.M.paused, 'the pause card is up'); run(0.02);
  ok(!S.bedOn(), 'the pause card stops it');
  const v = S.voices()[0];
  ok(!!v && v.out.gain.log.some(l => l[0] === 'tgt' && l[1] === 0), 'it fades rather than cuts');
  run(1); ok(S.live() === 0, 'and leaves the graph');
  D.resume(); run(0.02); ok(S.bedOn(), 'playing on brings it back');
  document.hidden = true; S.hidden();
  ok(!S.bedOn() && S.live() === 0 && c.state === 'suspended', 'a hidden page: gone at once, and the context suspended');
  c.state = 'running'; S.bedSync(true); run(0.02); ok(!S.bedOn(), 'and it cannot start while hidden, even if asked');
  c.state = 'suspended'; S.sfx('kick'); ok(S.live() === 0, 'nor can a sound');
  document.hidden = false; D.pause(); S.shown(); run(0.02);
  ok(c.state === 'running' && !S.bedOn(), 'back again: the context wakes, and the match is paused, so the crowd waits');
  D.resume(); run(0.02); ok(S.bedOn(), 'until play resumes');
  D.exitMatch(); run(0.02); ok(!S.bedOn() && !S.wanted(), 'quitting stops it');
  run(1); ok(S.live() === 0, 'nothing left');
  D.startMatch(X.CLUBS[0], X.CLUBS[1], false); run(0.02); ok(S.bedOn(), 'on again');
  T.M.tut = { id:'pass', seat:0, step:0 }; run(0.02); ok(!S.bedOn(), 'a tutorial card stops it'); T.M.tut = null; run(0.02); ok(S.bedOn(), 'and back');
  T.M.phase = 'break'; run(0.02); ok(!S.bedOn(), 'half time stops it'); T.M.phase = 'play'; run(0.02);
  T.M.over = true; run(0.02); ok(!S.bedOn(), 'full time stops it'); T.M.over = false;
  D.exitMatch(); run(1);
  T.practice.start('defend'); document.getElementById('pr-retry').click(); run(0.02); ok(!T.M.paused && !T.practice.state().ready && !S.bedOn(), 'no crowd in the Training Ground, in play'); T.practice.leave(); D.setTwo(false); run(1);
  T.practice.start('egg'); document.getElementById('pr-retry').click(); run(0.02); ok(!S.bedOn(), 'nor in a game of its own space'); T.practice.leave(); D.setTwo(false); run(1);
  T.newMatch(0, 1, { halfLen:1e9, diff:0, auto:true, demo:true }); run(0.02); ok(!S.bedOn(), 'none under the demo');
  T.newMatch(0, 1, { halfLen:60, diff:0, auto:true, headless:true }); D.setMode('match'); run(0.02); ok(!S.bedOn(), 'none headless'); D.setMode('menu');
  ok(/const on = !!want && !!settings\.sound && !document\.hidden/.test(read('../src/sound.js')), 'the bed reads Sound and the page itself, whatever it is asked');
  ok(/function frame\(now\) \{[^}]*soundFrame\(matchBedWanted\(\)\)/.test(read('../src/boot.js')), 'the real frame loop drives it');
  const wait = freshAudio('suspended').c;
  D.startMatch(X.CLUBS[0], X.CLUBS[1], false); wait.state = 'suspended'; S.frame();
  ok(!S.bedOn(), 'a context asleep: no bed until it wakes'); wait.state = 'running'; S.frame(); ok(S.bedOn(), 'then there is');
  D.exitMatch();
}

// 6. the cap: however busy, live nodes and voices stay under it, the whistle survives a flurry, and everything leaves
{
  const { c } = freshAudio(); const K = S.SOUND;
  T.newMatch(0, 1, { halfLen:60, diff:0, humans:[true, false] });
  for (const k of Object.keys(S.NAMES)) {
    advance(c, 3); const before = S.live(); S.play(k); const cost = S.live() - before;
    ok(cost > 3 && cost <= K.reserve, `${k}: built from layers within the reserve (${cost} nodes, ${K.reserve} kept)`);
    const v = S.voices()[S.voices().length - 1], srcs = v.srcs.length;
    ok(srcs >= 2, `${k}: more than one layer (${srcs} sources)`);
    ok(v.srcs.every(n => n.started && n.stops.length === 1) && v.end > c.currentTime && v.end < c.currentTime + 4, `${k}: every layer starts and stops, and the voice ends (${(v.end - c.currentTime).toFixed(2)} s)`);
    S.off(); c.state = 'running';
  }
  // a busy match: every sound, again and again, the clock crawling
  let maxN = 0, maxV = 0, plays = 0;
  for (let i = 0; i < 3000; i++) {
    const keys = Object.keys(S.NAMES), k = keys[i % keys.length];
    S.sfx(k); plays++; maxN = Math.max(maxN, S.live()); maxV = Math.max(maxV, S.voices().length);
    if (i % 3 === 0) advance(c, 0.012);
  }
  ok(maxN <= K.maxNodes && maxV <= K.maxVoices, `3000 sounds at speed: at most ${maxN} live nodes (cap ${K.maxNodes}), ${maxV} voices (cap ${K.maxVoices})`);
  ok(maxN > K.maxNodes*0.6, `and the cap was really reached for (${maxN})`);
  // all of them in the same instant
  S.off(); c.state = 'running'; advance(c, 10);
  for (let r = 0; r < 200; r++) for (const k of Object.keys(S.NAMES)) S.sfx(k);
  ok(S.live() <= K.maxNodes && S.voices().length <= K.maxVoices, `all at once, 200 times: ${S.live()} live nodes`);
  // the crowd is never what gives way
  S.off(); c.state = 'running'; advance(c, 10);
  D.startMatch(X.CLUBS[0], X.CLUBS[1], false); S.frame(); const bed = S.bedOn();
  S.sfx('long');
  const whistle = S.voices().find(v => v.key === 'long');
  for (let i = 0; i < 600; i++) { S.sfx(['tick', 'catch', 'pass', 'trip', 'whoosh', 'bounce', 'whiff'][i % 7]); if (i % 7 === 0) advance(c, 0.001); }
  ok(bed && S.bedOn() && S.voices().includes(whistle), 'a flurry of small sounds cuts neither the crowd bed nor the whistle');
  ok(S.live() <= K.maxNodes, `(${S.live()} live)`);
  // and when only the big sounds are left, a small one is what is dropped
  S.off(); c.state = 'running'; advance(c, 10); S.frame();
  for (const k of ['whistle', 'long', 'horn', 'roar', 'cheer', 'groan', 'strike', 'post']) S.sfx(k);
  const big = S.voices().filter(v => v.rank >= 2);
  for (let i = 0; i < 40; i++) { advance(c, 0.002); S.sfx('tick'); S.sfx('trip'); }
  ok(big.length >= 5 && big.every(v => S.voices().includes(v)) && S.live() <= K.maxNodes, `small sounds never cut a bigger one (${big.length} kept, ${S.voices().length - big.length} small)`);
  D.exitMatch();
  // and everything leaves: every node of a played sound is disconnected once its time is up, every source stopped
  S.off(); c.state = 'running'; advance(c, 10);
  T.newMatch(0, 1, { halfLen:60, diff:0, humans:[true, false] });
  const mark = c.nodes.length;
  for (const k of Object.keys(S.NAMES)) { advance(c, 0.2); S.sfx(k); }
  advance(c, 10); S.frame();
  const played = c.nodes.slice(mark);
  ok(S.live() === 0 && S.voices().length === 0, 'after the time is up nothing is live');
  ok(played.length > 100 && played.every(n => n.off), `every one of ${played.length} nodes was disconnected`);
  ok(played.filter(n => n.kind === 'osc' || n.kind === 'buffer').every(n => n.started && n.stops.length), 'every source was started and stopped');
  // repeats differ, and repeats too close together are one
  S.off(); c.state = 'running'; advance(c, 10);
  const pitches = k => { const m = c.nodes.length; S.sfx(k); return JSON.stringify(c.nodes.slice(m).filter(n => n.frequency).map(n => n.frequency.log.map(l => l[1]))); };   // values, not the times they fall on
  const levels = k => { const m = c.nodes.length; S.sfx(k); return String(c.nodes[m] && c.nodes[m].gain.value); };
  for (const k of Object.keys(S.NAMES)) {
    const a = new Set(), b = new Set();
    for (let i = 0; i < 6; i++) { advance(c, 4); a.add(pitches(k)); advance(c, 4); b.add(levels(k)); }
    ok(a.size >= 3 || b.size >= 4, `${k}: six repeats differ (${a.size} in pitch, ${b.size} in level)`);
    S.off(); c.state = 'running';
  }
  ok((() => { const a = new Set(); for (let i = 0; i < 6; i++) { advance(c, 4); a.add(pitches('kick')); } return a.size >= 5; })(), 'six kicks are six different kicks');
  const m0 = c.nodes.length; advance(c, 2); S.sfx('tick'); const one = c.nodes.length - m0; S.sfx('tick'); ok(c.nodes.length - m0 === one, 'two ticks in the same instant are one');
  // the bus: one of each part, in order, ending at the speakers. Every voice runs into it
  const fresh = freshAudio().c, bus = fresh.nodes.filter(n => n.bus);
  const kinds = bus.filter(n => n.kind !== 'gain' || n.on).map(n => n.kind).join();
  ok(kinds === 'gain,filter,filter,comp,gain,shape', `the bus: ${kinds}`);
  const end = bus.find(n => n.kind === 'shape');
  ok(end.on === fresh.destination && end.curve.length % 2 === 1 && Math.max(...end.curve) <= K.ceiling[1] && Math.abs(end.curve[(end.curve.length - 1)/2]) < 1e-9, 'it ends in a ceiling under full scale that leaves silence silent');
  ok(bus.find(n => n.kind === 'comp').ratio.value >= 8, 'with a limiter');
  S.play('kick'); const direct = fresh.nodes.filter(n => !n.bus && n.on === fresh.destination);
  ok(direct.length === 0, 'and nothing reaches the speakers except through it');
  S.off();
}

// 7. a sleeping context and iOS: nothing piles up, a held sound plays if fresh, a stuck context is rebuilt
{
  let { f, c } = freshAudio('suspended');
  c.resumeTo = null; c.state = 'suspended';
  T.newMatch(0, 1, { halfLen:60, diff:0, humans:[true, false] });
  const n0 = c.nodes.length;
  for (let i = 0; i < 50; i++) S.sfx('kick');
  ok(c.nodes.length === n0, 'asleep: fifty kicks build nothing, so they cannot all go off when it wakes');
  ok(c.resumes > 0, 'and it was asked to wake');
  c.state = 'running'; c.onstatechange();
  const after = S.voices().filter(v => v.key === 'kick').length;
  ok(after === 1, `woken: what was held plays once, not fifty times (${after})`);
  S.off(); c.state = 'suspended'; S.sfx('kick');
  const real = performance.now; performance.now = () => real.call(performance) + 5000;
  advance(c, 5); c.state = 'running'; c.onstatechange(); performance.now = real;
  ok(S.voices().filter(v => v.key === 'kick').length === 0, 'a stale held sound is dropped');
  S.off();
  // the first tap
  const old = S.ctx(); if (old) old.close();
  const g = makeFake('suspended'); globalThis.AudioContext = g.Ctx;
  S.unlock();
  const ctx = S.ctx();
  ok(g.made.length === 1 && ctx === g.made[0], 'the first tap makes the context');
  ok(ctx.resumes >= 1 && ctx.state === 'running', 'and resumes it, inside the tap');
  ok(ctx.nodes.some(n => n.kind === 'buffer' && n.started && n.on === ctx.destination && n.buffer.length === 1), 'and plays the one silent sample iOS wants');
  const mark = ctx.nodes.length; S.unlock(); ok(ctx.nodes.length === mark && g.made.length === 1, 'the next tap does neither again');
  // a phone call: interrupted, asleep behind the page
  ctx.state = 'interrupted'; const r0 = ctx.resumes; S.unlock(); ok(ctx.resumes === r0 + 1 && ctx.state === 'running', 'an interrupted context is resumed by the next tap');
  // stuck: resume never takes. One tap fires several events, and they count once; three real taps get a new context
  ctx.resumeTo = null; ctx.state = 'suspended';
  const K = S.SOUND; let clock = 1000; performance.now = () => clock;
  S.unlock(); S.unlock(); S.unlock(); S.unlock();
  ok(S.ctx() === ctx && ctx.state !== 'closed', 'one tap\'s several events do not count as several');
  clock += 1000; S.unlock(); clock += 1000; S.unlock();
  ok(ctx.state === 'closed' && S.ctx() !== ctx && g.made.length === 2, 'three taps asleep: the stuck context is closed and a new one made');
  performance.now = real;
  // old iOS: only the prefixed name
  S.off(); S.ctx().close(); delete globalThis.AudioContext; const w = makeFake(); globalThis.webkitAudioContext = w.Ctx;
  S.unlock(); ok(S.ctx() === w.made[0], 'the webkit prefix works'); S.off(); S.ctx().close(); delete globalThis.webkitAudioContext;
  S.unlock(); ok(S.live() === 0, 'and no audio at all is fine');
  const code = read('../src/sound.js');
  for (const type of ['touchend', 'pointerup', 'mousedown', 'keydown', 'click']) ok(code.includes(`'${type}'`), `the unlock listens for ${type}`);
  ok(/visibilitychange/.test(code) && /pagehide/.test(code) && /pageshow/.test(code), 'and the page going and coming back');
}

// 8. src/sound.js alone, as sounds.html loads it: the listeners, the tap on any button but the three action buttons, and the gate
function loadAlone(html) {
  const L = {}, W = {}, made = makeFake();
  const sandbox = { console, Math, Float32Array, performance, Promise, setInterval:() => 0, navigator:{},
    document:{ hidden:false, addEventListener:(t, fn) => (L[t] ||= []).push(fn), getElementById:null, createElement:null },
    addEventListener:(t, fn) => (W[t] ||= []).push(fn), AudioContext:made.Ctx };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  return { sandbox, L, W, made };
}
{
  const { sandbox, L, W, made } = loadAlone();
  const code = read('../src/sound.js');
  vm.createContext(sandbox);
  vm.runInContext('var settings = { sound:true }, M = null;\n' + code + '\nthis.api = { sfx, SND, ac, VOICES };', sandbox);
  const A = sandbox.api;
  ok(typeof A.sfx === 'function' && !!W.pagehide && !!W.pageshow && !!L.visibilitychange, 'the file runs alone, with no game round it');
  for (const fn of L.click) fn({ target:{ closest:() => ({ classList:{ contains:c => c === 'act' } }) } });
  A.ac();
  const ctx = made.made[0];
  ok(!!ctx, 'a gesture makes a context');
  const clicks = L.click.slice();
  const press = el => { for (const fn of clicks) fn({ target:{ closest:() => el } }); };
  const n0 = ctx.nodes.length;
  press({ classList:{ contains:c => c === 'act' } });
  ok(ctx.nodes.length === n0, 'the three action buttons make no menu tap');
  press(null); ok(ctx.nodes.length === n0, 'nor does a press on nothing');
  press({ classList:{ contains:() => false } });
  ok(ctx.nodes.length > n0 && A.VOICES.length === 1 && A.VOICES[0].key === 'tap', 'any other button taps, over no match at all');
  ctx.currentTime += 5;
  A.sfx('kick');
  ok(A.VOICES.every(v => v.key !== 'kick'), 'with no match, sfx plays nothing else');
  vm.runInContext('M = { demo:true }', sandbox);
  A.sfx('kick'); ok(A.VOICES.every(v => v.key !== 'kick'), 'nor over the demo');
  ctx.currentTime += 5; A.sfx('tap'); ok(A.VOICES.some(v => v.key === 'tap'), 'but the menu tap does');
  vm.runInContext('M = { }', sandbox);
  A.sfx('kick'); ok(A.VOICES.some(v => v.key === 'kick'), 'and a match plays it');
}

// 9. the sound test page: the same code, a button for each sound, not linked and not precached, and it says only what the game may say
{
  const page = read('../sounds.html'), root = new URL('../', import.meta.url);
  ok(/<script src="src\/sound\.js"><\/script>/.test(page), 'sounds.html loads src/sound.js itself');
  ok(!/\b(?:function|const) (?:sfx|soundPlay|sndBus)\b/.test(page), 'it has no sound code of its own');
  const game = read('../game.js'), index = read('../index.html'), sw = read('../sw.js');
  ok(!game.includes('sounds.html') && !index.includes('sounds.html'), 'the game never names it');
  ok(!shellAssets.includes('sounds.html') && !sw.includes('sounds.html') && !shellAssets.some(a => a.startsWith('src/')) && !sw.includes('src/sound.js'), 'it and its script are not in the service worker\'s list');
  ok(!/<a[\s>]/i.test(page) && !/href=/i.test(page) && !/https?:/i.test(page), 'no links, no other site');
  ok(!/\.\.\//.test(page) && /name="robots" content="noindex"/.test(page), 'it stays where it is, and asks not to be listed');
  const text = page.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  const WORD = /\b(?:he|his|him|himself|she|her|hers|herself|man|men|guy|guys|lad|lads|chap)\b|\bhe['’]s\b|\bshe['’]s\b/i;
  ok(!WORD.test(text), `its words say no he or she (${(text.match(WORD) || [])[0]})`);
  ok(!/\b(RFU|World Rugby|England Rugby|englandrugby|passport\.world|HEADCASE|Red Rose|Twickenham|Six Nations)\b/i.test(text + Object.values(S.NAMES).join(' ')), 'no governing body or club named');
  ok(!/sendBeacon|fetch\(|XMLHttp|localStorage|serviceWorker/.test(page), 'it sends nothing, saves nothing, and registers nothing');
  // run the page's own scripts on a stand-in: one button per sound, each playing its key
  const els = {};
  const mk = id => ({ id, children:[], dataset:{}, hidden:false, L:{}, classList:{ toggle() {} }, appendChild(c) { this.children.push(c); }, addEventListener(t, fn) { (this.L[t] ||= []).push(fn); }, click() { for (const fn of this.L.click || []) fn({}); }, textContent:'', set innerHTML(v) { this._h = v; } });
  const { sandbox, made } = loadAlone();
  sandbox.document.getElementById = id => (els[id] ||= mk(id));
  sandbox.document.createElement = () => mk('');
  vm.createContext(sandbox);
  const scripts = [...page.matchAll(/<script(?: src="([^"]+)")?>([\s\S]*?)<\/script>/g)].map(m => (m[1] ? fs.readFileSync(new URL(m[1], root), 'utf8') : m[2]));
  ok(scripts.length === 3, 'the page is its settings, the sound file and its buttons');
  vm.runInContext(scripts.join('\n'), sandbox);
  const buttons = els.sounds.children, names = Object.values(S.NAMES), keys = Object.keys(S.NAMES);
  ok(buttons.length === keys.length && buttons.every((b, i) => b.textContent === names[i] && b.dataset.key === keys[i]), `one button for each of the ${keys.length} sounds, with its name`);
  ok(buttons.every(b => b.className === 'act') && (page.match(/<button class="act[ "]/g) || []).length === (page.match(/<button/g) || []).length, 'no menu tap plays over a button on the page: each is marked as having its own sound');
  vm.runInContext('this.api = { VOICES, SOUND, bedOn:() => !!BED }', sandbox);
  buttons.find(b => b.dataset.key === 'post').click();
  ok(sandbox.api.VOICES.some(v => v.key === 'post') || made.made[0].state !== 'running', 'a button plays its sound');
  els.bed.click(); ok(sandbox.api.bedOn(), 'Crowd Bed turns the crowd on'); els.bed.click(); ok(!sandbox.api.bedOn(), 'and off');
}

// 10. the notes
{
  ok(/tools\/sound\.mjs/.test(read('./CHECKS.md')) && /\bsound\b/.test(read('./check.mjs')), 'CHECKS.md names this suite and the gate runs it');
  const readme = read('../README.md');
  ok(/sounds\.html/.test(readme) && /## Sound/.test(readme), 'README describes the sound and the page');
}

ok(bad.length === 0, `no recipe asked an AudioParam for a value a browser refuses (${JSON.stringify(bad.slice(0, 3))})`);
console.log(`Sound: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
