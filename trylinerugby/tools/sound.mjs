// Sound: the keys, Sound Off, the crowd bed stopping, the cap on live nodes, the phone's waking up, no use of the match's random numbers, the
// recordings (the table, the files, their licences, the precache, loading after the first tap, a take played, the recipe when one cannot be had) and the
// sound test page. Node has no audio, so a stand-in AudioContext records what the code asks for. What it sounds like, and the levels, need a browser
// and ears: tools/browser.mjs measures the recordings against the recipes through the real bus in Chrome. Exits 1 on any failure.
// node tools/sound.mjs
process.env.SEED ??= '41';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
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
  ok((egg.split('function eggHop(')[1] || '').split('\nfunction ')[0].includes('hopBounce(b, E, K, u, fit)') && /function hopBounce[\s\S]*?sfx\('bounce', Math\.min\(1, vz\/K\.pop\[1\]\)\)/.test(ball), 'Bouncy Egg sounds a bounce on each hop, by how big the hop is (the hop is hopBounce, src/ball.js, shared with a match\'s spilled ball since 2026-11-09)');
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
  const cards = els.sounds.children, names = Object.values(S.NAMES), keys = Object.keys(S.NAMES), pairs = cards.map(c => c.children[1].children);
  ok(cards.length === keys.length && cards.every((c, i) => c.children[0].textContent === names[i]), `one card for each of the ${keys.length} sounds, with its name`);
  ok(keys.every((k, i) => S.FILES[k] ? pairs[i].map(b => b.textContent).join() === 'Recording,Synth' : pairs[i].map(b => b.textContent).join() === 'Synth')
    && pairs.flat().every(b => b.dataset.key === keys[pairs.findIndex(p => p.includes(b))]), 'a recorded sound has Recording and Synth side by side, a synthesised one Synth alone');
  const buttons = pairs.flat();
  ok(buttons.every(b => b.className === 'act') && (page.match(/<button class="act[ "]/g) || []).length === (page.match(/<button/g) || []).length, 'no menu tap plays over a button on the page: each is marked as having its own sound');
  vm.runInContext('this.api = { VOICES, SOUND, SAMPLE, SOUND_FILES, CREDITS, bedOn:() => !!BED, bedSample:() => !!(BED && BED.sample) }', sandbox);
  const A = sandbox.api, lic = read('../assets/sounds/LICENCES.md');
  ok(keys.every((k, i) => { const lines = cards[i].children.slice(2).map(c => c.textContent); return S.FILES[k] ? lines.length === S.FILES[k].length && S.FILES[k].every(([f], j) => lines[j] === 'Take ' + (j + 1) + ': ' + A.CREDITS[f]) : lines.join() === 'Synth Only'; }), 'under each, every take\'s sources and licence, or Synth Only');
  ok(Object.values(S.FILES).flat().every(([f]) => /^[^']+ by [^']+ \((?:OpenGameArt|kenney\.nl)\)(?:; [^']+ by [^']+ \((?:OpenGameArt|kenney\.nl)\))* · CC0$/.test(A.CREDITS[f] || '')
    && A.CREDITS[f].split(' · ')[0].split('; ').every(c => { const m = c.match(/^(.+?) by (.+) \((?:OpenGameArt|kenney\.nl)\)$/); return !!m && lic.includes('/' + m[1] + ' (' + m[2] + ')'); })), 'each credit names its pages and authors as LICENCES.md does, and CC0');
  const post = pairs[keys.indexOf('post')];
  post[0].click();
  ok(A.VOICES.some(v => v.key === 'post') || made.made[0].state !== 'running', 'Recording plays its sound (its recipe until the recording is in)');
  const ctx = made.made[0];
  for (const [f, d] of A.SOUND_FILES.post) A.SAMPLE.bufs[f] = { buf:{ duration:d, sampleRate:48000, getChannelData:() => new Float32Array(8) }, lead:0 };   // as if decoded
  for (const v of A.VOICES.slice()) v.end = 0;
  ctx.currentTime += 5; post[0].click();
  const rec = A.VOICES.find(v => v.key === 'post');
  ok(!!rec && rec.srcs.length === 1 && A.SOUND_FILES.post.some(([f]) => A.SAMPLE.bufs[f].buf === rec.srcs[0].buffer), 'with the recording in, Recording plays a take of it');
  ctx.currentTime += 5; post[1].click();
  const syn = A.VOICES.filter(v => v.key === 'post').pop();
  ok(syn !== rec && syn.srcs.length > 1, 'and Synth beside it plays the recipe');
  els.bed.click(); ok(A.bedOn(), 'Crowd Bed turns the crowd on'); els.bed.click(); ok(!A.bedOn(), 'and off');
  els.bedsynth.click(); ok(A.bedOn() && !A.bedSample(), 'Crowd Bed Synth plays the synthesised crowd'); els.bedsynth.click(); ok(!A.bedOn(), 'and off');
}

// 11. the recordings: a recording or a named recipe for every key, the files and their budget, their licences, the precache and the app, loading
// once after the first tap and only then, a take played through the same voice, the crowd loop and its swell, and the recipe whenever a recording is not in
{
  const FILES = S.FILES, keys = Object.keys(S.NAMES), dir = new URL('../assets/sounds/', import.meta.url);
  for (const k of keys) ok(!!FILES[k] !== S.SYNTH.includes(k), `${k}: ${FILES[k] ? FILES[k].length + ' recorded take' + (FILES[k].length > 1 ? 's' : '') : 'synth only, and named so'}`);
  ok(Object.keys(FILES).every(k => k === 'bed' || keys.includes(k)), 'the table names only the game\'s sounds and the crowd bed');
  for (const k of ['kick', 'catch', 'pass', 'tackle']) ok(FILES[k].length >= 2 && FILES[k].length <= 4, `${k}: two to four takes`);
  ok(FILES.bed.length === 1 && FILES.bed[0][1] >= 10 && FILES.bed[0][1] <= 20 && FILES.bed[0][2] > 0, 'the crowd bed: one loop of 10 to 20 seconds, with a margin either side');
  ok(Object.entries(FILES).every(([k, t]) => t.every(e => k === 'bed' ? e.length === 3 : e.length === 2)), 'only the loop has margins');
  const table = Object.fromEntries(Object.values(FILES).flat().map(([f, d, m]) => [f, d + 2*(m || 0)]));   // each file's whole length
  const listed = Object.values(FILES).flat().map(f => f[0]), onDisk = fs.readdirSync(dir).filter(f => !f.startsWith('.'));
  ok(onDisk.filter(f => f.endsWith('.m4a')).sort().join() === [...listed].sort().join() && onDisk.every(f => f.endsWith('.m4a') || f === 'LICENCES.md'), 'every file in the folder is in the table and every one in the table is there, with LICENCES.md and nothing else');
  ok(listed.every(f => /^[a-z]+-\d+\.[0-9a-f]{10}\.m4a$/.test(f) && createHash('sha256').update(fs.readFileSync(new URL(f, dir))).digest('hex').startsWith(f.split('.')[1])), 'each named by its content\'s hash, as the player art is');
  const sizes = listed.map(f => fs.statSync(new URL(f, dir)).size), total = sizes.reduce((a, b) => a + b, 0);
  ok(total <= 0.8*1024*1024, `within the budget: ${(total/1024).toFixed(0)} KB in all, never over 819 (the largest ${(Math.max(...sizes)/1024).toFixed(0)} KB)`);
  if (spawnSync('ffprobe', ['-version']).error) console.log('ffprobe is not installed here: the files\' codec, channels and length are not checked');
  else for (const [f, d, m] of Object.values(FILES).flat()) {
    const path = fileURLToPath(new URL(f, dir)), r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,channels,sample_rate:format=duration', '-of', 'json', path], { encoding:'utf8' });
    const j = r.status === 0 ? JSON.parse(r.stdout) : { streams:[{}], format:{} }, st = j.streams[0] || {}, dec = spawnSync('ffmpeg', ['-v', 'error', '-i', path, '-f', 'null', '-'], { encoding:'utf8' });
    ok(st.codec_name === 'aac' && st.channels === 1 && +st.sample_rate === 48000 && Math.abs(+j.format.duration - table[f]) < 0.03 && dec.status === 0 && !dec.stderr.trim(), `${f}: AAC, mono, 48 kHz, ${m ? d + ' s and its margins' : d + ' s'} as the table says, and decodes cleanly (${st.codec_name}, ${st.channels}, ${(+j.format.duration).toFixed(3)})`);
  }
  // the licences
  const lic = read('../assets/sounds/LICENCES.md'), rows = lic.split('\n');
  for (const f of listed) {
    const row = rows.find(l => l.startsWith('| `' + f + '` |')) || '', cells = row.split(' | ');
    ok(cells[2] === 'CC0' && /https:\/\/(?:opengameart\.org\/content|kenney\.nl\/assets)\/[a-z0-9-]+ \([^)]+\)/.test(cells[1]) && /^20\d\d-\d\d-\d\d$/.test(cells[3]) && /mono, 48 kHz, AAC/.test(cells[4] || ''), `${f}: in LICENCES.md, CC0, its source pages and authors, the day fetched and what was done`);
  }
  const srcRows = rows.filter(l => /^\| `[a-z0-9]+` \| https:/.test(l));
  ok(srcRows.length >= 10 && srcRows.every(l => l.split(' | ')[3] === 'CC0'), `every source is CC0 (${srcRows.length} sources)`);
  ok(!/CC-BY|CC BY|GPL|OGA-BY|personal use|non-?commercial/i.test(lic), 'and no other licence is named');
  ok(/assets\/sounds\/LICENCES\.md/.test(read('../README.md')), 'README links the list');
  // the precache, and the app
  const sw = read('../sw.js'), { wwwFiles } = await import('../../app/scripts/copy-www.mjs'), www = wwwFiles();
  ok(listed.every(f => shellAssets.includes('assets/sounds/' + f) && sw.includes('"assets/sounds/' + f + '"')) && !sw.includes('LICENCES.md'), 'every recording is in the service worker\'s precache, so a match offline has them');
  ok(listed.every(f => www.includes('assets/sounds/' + f)), 'and the app carries them (app/scripts/copy-www.mjs copies the precache list)');
  // a stand-in network and decoder: what is fetched, when, and what comes back
  const net = { mode:'ok', urls:[], decodes:0, log:'' }, realFetch = globalThis.fetch;
  globalThis.fetch = url => { net.urls.push(url); net.log += 'f'; return net.mode === 'fail' ? Promise.reject(new Error('offline')) : Promise.resolve(net.mode === '404' ? { ok:false, status:404 } : { ok:true, arrayBuffer:() => Promise.resolve({ url }) }); };
  const pcm = new Float32Array(64).fill(0.25);
  const decoder = c => { c.decodeAudioData = (ab, yes, no) => { net.decodes++; net.log += 'd'; if (net.mode === 'bad') { no(new Error('bad data')); return; } const d = table[ab.url.split('/').pop()] + (net.prime ? 1024/48000 : 0); yes({ url:ab.url, sampleRate:48000, duration:d, length:Math.round(d*48000), getChannelData:() => pcm }); }; return c; };
  const forget = () => { for (const f in S.SAMPLE.bufs) delete S.SAMPLE.bufs[f]; Object.assign(S.SAMPLE, { state:'idle', tries:0, at:-1e9 }); };
  const settle = async () => { for (let i = 0; i < 400 && S.SAMPLE.state === 'loading'; i++) await new Promise(r => setTimeout(r, 0)); };
  // nothing is fetched with Sound Off, with no audio, or in a headless match, and a page that never taps fetches nothing
  forget(); set.sound = false; { const f = makeFake(); globalThis.AudioContext = f.Ctx; } S.unlock(); S.sfx('kick');
  ok(net.urls.length === 0 && S.SAMPLE.state === 'idle', 'Sound Off: a tap fetches nothing');
  set.sound = true; { const old = S.ctx(); if (old) { S.off(); old.close(); } } delete globalThis.AudioContext; S.unlock();
  ok(net.urls.length === 0, 'no audio: a tap fetches nothing');
  { const f = makeFake(); globalThis.AudioContext = f.Ctx; reseed(77); T.newMatch(0, 3, { halfLen:60, diff:0, auto:true, headless:true }); for (let i = 0; i < 3000 && !T.M.over; i++) T.update(STEP);
    ok(net.urls.length === 0, 'a headless match with a context there: nothing fetched'); }
  // the first tap: everything fetched and decoded once, one at a time, in the background
  let { c } = freshAudio(); decoder(c); forget();
  T.newMatch(0, 1, { halfLen:60, diff:0, humans:[true, false] });
  S.unlock();
  ok(S.SAMPLE.state === 'loading' && net.urls.length === 0, 'the first tap starts the fetching, in the background (nothing inside the tap itself)');
  advance(c, 1); S.sfx('kick'); const early = S.voices().find(v => v.key === 'kick');
  ok(!!early && early.srcs.length >= 2, 'until a recording is in, its recipe plays');
  await settle();
  ok(S.SAMPLE.state === 'done' && net.urls.length === listed.length && net.decodes === listed.length && Object.keys(S.SAMPLE.bufs).length === listed.length, `then all ${listed.length} are in: each fetched and decoded once`);
  ok(net.log === 'fd'.repeat(listed.length), 'one at a time: each decoded before the next is fetched');
  ok(net.urls.every(u => /^assets\/sounds\/[a-z]+-\d+\.[0-9a-f]{10}\.m4a$/.test(u)) && net.urls.slice(0, 4).every(u => /\/(tackle|pass|catch|kick)-/.test(u)), 'from assets/sounds, the most frequent first');
  S.unlock(); S.unlock(); await settle();
  ok(net.urls.length === listed.length, 'later taps fetch nothing more');
  // a take played: one source through the voice, a random take, speed and level, its end on time
  S.off(); c.state = 'running'; advance(c, 5);
  const seenBufs = new Set(), rates = new Set(), gains = [];
  for (let i = 0; i < 60; i++) {
    advance(c, 0.5); const m = c.nodes.length; S.sfx('kick');
    const v = S.voices().find(x => x.key === 'kick' && x.born >= c.currentTime), src = v && v.srcs[0];
    if (!v) continue;
    seenBufs.add(src.buffer); rates.add(src.playbackRate.value); gains.push(v.out.gain.value);
    if (i === 0) {
      ok(v.srcs.length === 1 && v.nodes.length === 2 && c.nodes.length - m === 2, 'a kick: one recording through its own gain, two nodes');
      ok(FILES.kick.some(([f]) => S.SAMPLE.bufs[f].buf === src.buffer) && src.offset === 0 && src.started && src.stops.length === 1, 'one of the kick\'s takes, started where its sound starts');
      ok(Math.abs(src.stops[0] - (v.t + src.buffer.duration/src.playbackRate.value + 0.02)) < 1e-9 && Math.abs(v.end - (v.t + src.buffer.duration/src.playbackRate.value + 0.03)) < 1e-9, 'and stopped, and the voice ended, when its sound is over at that speed');
      ok(v.out.on === S.ctx().nodes.find(n => n.bus && n.kind === 'gain' && !n.on) || v.out.on && v.out.on.bus, 'into the bus, as every voice');
    }
  }
  ok(seenBufs.size === FILES.kick.length, `a random take each time: all ${FILES.kick.length} heard in 60 kicks`);
  ok(rates.size > 50 && [...rates].every(r => r >= 0.96 && r <= 1.04), 'a little faster or slower each time, within 4%');
  ok(Math.max(...gains)/Math.min(...gains) > 1.1 && gains.every(g => g > S.SOUND.level.kick*0.85 && g < S.SOUND.level.kick*1.16), 'and a little louder or softer, about its level');
  S.off(); c.state = 'running'; advance(c, 5);
  const hop = amt => { let g = 0, r = 0; for (let i = 0; i < 40; i++) { advance(c, 0.3); S.sfx('bounce', amt); const v = S.voices().filter(x => x.key === 'bounce').pop(); g += v.out.gain.value/40; r += v.srcs[0].playbackRate.value/40; } S.off(); c.state = 'running'; return [g, r]; };
  const [gBig, rBig] = hop(1), [gSmall, rSmall] = hop(0.2);
  ok(gSmall < gBig*0.7 && rSmall > rBig*1.05, `a small hop's bounce is softer and a little higher (${(gSmall/gBig).toFixed(2)} of the level, ${(rSmall/rBig).toFixed(2)} the speed)`);
  advance(c, 2); S.sfx('kick', null, true); ok(S.voices().filter(v => v.key === 'kick').pop().srcs.length >= 2, 'asked for the recipe (the test page\'s Synth), the recipe plays');
  const synthOnly = S.SYNTH.map(k => { advance(c, 2); S.sfx(k); return S.voices().filter(v => v.key === k).pop(); });
  ok(synthOnly.every(v => v && v.srcs.length >= 2), 'the synth-only sounds still play their recipes');
  // the cap holds with the recordings in, and every node leaves
  S.off(); c.state = 'running'; advance(c, 10); const mark = c.nodes.length; let maxN = 0, maxV = 0;
  for (let i = 0; i < 3000; i++) { S.sfx(keys[i % keys.length]); maxN = Math.max(maxN, S.live()); maxV = Math.max(maxV, S.voices().length); if (i % 3 === 0) advance(c, 0.012); }
  advance(c, 10); S.frame();
  ok(maxN <= S.SOUND.maxNodes && maxV <= S.SOUND.maxVoices && S.live() === 0 && c.nodes.slice(mark).every(n => n.off), `3000 sounds with the recordings in: at most ${maxN} live nodes, ${maxV} voices, and every node gone after`);
  ok(net.urls.length === listed.length && net.decodes === listed.length, 'decoded once and reused: 3000 sounds fetched and decoded nothing more');
  // the crowd: the loop, from a random place, and its swell under a roar or a cheer
  S.off(); c.state = 'running';
  D.startMatch(X.CLUBS[0], X.CLUBS[1], false); S.frame();
  const bed = S.voices().find(v => v.rank === Infinity), loop = bed && bed.srcs[0], [bedFile, bedLen, bedM] = FILES.bed[0];
  ok(!!bed && bed.srcs.length === 1 && loop.buffer === S.SAMPLE.bufs[bedFile].buf && loop.loop && loop.loopStart === bedM && Math.abs(loop.loopEnd - (bedM + bedLen)) < 1e-9 && loop.offset >= bedM && loop.offset < bedM + bedLen, 'the crowd bed: the recording, looped whole between its margins, from a random place');
  const sw0 = bed.swell.gain.log.length; S.sfx('roar');
  const sl = bed.swell.gain.log.slice(sw0);
  ok(sl.some(l => l[0] === 'lin' && l[1] === S.SOUND.swell.roar[0]) && sl.some(l => l[0] === 'tgt' && l[1] === 1), 'a roar: the crowd under it swells and settles');
  advance(c, 1); S.sfx('cheer'); ok(bed.swell.gain.log.slice(sw0).some(l => l[0] === 'lin' && l[1] === S.SOUND.swell.cheer[0]), 'and a cheer, less');
  advance(c, 1); const sw1 = bed.swell.gain.log.length; S.sfx('tackle'); S.sfx('groan'); ok(bed.swell.gain.log.length === sw1, 'nothing else moves it');
  D.exitMatch(); advance(c, 1); S.frame();
  // the synthesised crowd until the loop is in, and the loop taking over when it arrives
  forget(); S.off(); c.state = 'running';
  D.startMatch(X.CLUBS[0], X.CLUBS[1], false); S.frame();
  const synthBed = S.voices().find(v => v.rank === Infinity);
  ok(!!synthBed && !synthBed.sample && synthBed.srcs.length === 4, 'no recording yet: the synthesised crowd');
  for (const [f] of FILES.bed) S.SAMPLE.bufs[f] = { buf:{ duration:table[f], sampleRate:48000, getChannelData:() => pcm }, lead:0 };
  advance(c, 0.02); S.frame();
  const nowBed = S.voices().find(v => v.rank === Infinity);
  ok(!!nowBed && nowBed.sample && synthBed.rank === 0 && synthBed.out.gain.log.some(l => l[0] === 'tgt' && l[1] === 0), 'the recording in: the synthesised crowd fades as the recording fades in');
  D.exitMatch(); advance(c, 1); S.frame(); T.newMatch(0, 1, { halfLen:60, diff:0, humans:[true, false] });
  // a decoder that keeps the encoder's 1024 samples of priming (one that ignores the MP4's edit list): every take starts after them, and the loop runs from them
  ok(Object.values(table).every(d => Math.abs(d*48000/1024 - Math.round(d*48000/1024)) < 1e-3), 'every file is a whole number of AAC frames, so the length alone tells the two kinds of decoder apart');
  forget(); S.off(); c.state = 'running'; net.prime = true; S.unlock(); await settle(); net.prime = false;
  ok(Object.values(S.SAMPLE.bufs).length === listed.length && Object.values(S.SAMPLE.bufs).every(b => b.lead === 1024/48000), 'the priming kept: each take is known to start 1024 samples in');
  T.newMatch(0, 1, { halfLen:60, diff:0, humans:[true, false] }); advance(c, 1); S.sfx('kick');
  const primed = S.voices().filter(v => v.key === 'kick').pop().srcs[0];
  ok(primed.offset === 1024/48000 && Math.abs(primed.stops[0] - (primed.at + (primed.buffer.duration - 1024/48000)/primed.playbackRate.value + 0.02)) < 1e-9, 'and plays from there, to its end');
  D.startMatch(X.CLUBS[0], X.CLUBS[1], false); S.frame();
  const pl = S.voices().find(v => v.rank === Infinity).srcs[0];
  ok(Math.abs(pl.loopStart - (1024/48000 + bedM)) < 1e-9 && Math.abs(pl.loopEnd - (1024/48000 + bedM + bedLen)) < 1e-9, 'and the crowd loops from there, its whole length and no more');
  D.exitMatch(); advance(c, 1); S.frame(); T.newMatch(0, 1, { halfLen:60, diff:0, humans:[true, false] });
  // a failed fetch, a bad file: the recipes, and a later tap asks again, a few times, a while apart
  forget(); S.off(); c.state = 'running'; net.mode = 'fail'; net.urls.length = 0;
  S.unlock(); await settle();
  ok(S.SAMPLE.state === 'idle' && Object.keys(S.SAMPLE.bufs).length === 0 && net.urls.length === listed.length, 'offline: every fetch fails, nothing is kept');
  advance(c, 1); S.sfx('tackle'); ok(S.voices().filter(v => v.key === 'tackle').pop().srcs.length >= 2, 'and the recipe plays: never a silence');
  S.unlock(); await settle(); ok(net.urls.length === listed.length, 'a tap straight after does not ask again');
  const realNow = performance.now; let clock = realNow.call(performance) + (S.SOUND.loadGap + 1)*1000; performance.now = () => clock;
  net.mode = '404'; S.unlock(); await settle();
  ok(net.urls.length === 2*listed.length && S.SAMPLE.state === 'idle', `${S.SOUND.loadGap} seconds on, a tap asks again (a 404 this time, kept as nothing)`);
  net.mode = 'bad'; clock += (S.SOUND.loadGap + 1)*1000; S.unlock(); await settle();
  ok(net.urls.length === 3*listed.length && Object.keys(S.SAMPLE.bufs).length === 0, 'a file that will not decode is kept as nothing too');
  advance(c, 1); S.sfx('kick'); ok(S.voices().filter(v => v.key === 'kick').pop().srcs.length >= 2, 'and its recipe plays');
  net.mode = 'ok'; clock += (S.SOUND.loadGap + 1)*1000; S.unlock(); await settle();
  ok(net.urls.length === 3*listed.length, `after ${S.SOUND.loadTries} tries it asks no more until the page is opened again`);
  performance.now = realNow;
  globalThis.fetch = realFetch; S.off();
  // the sim never hears any of it: AI v AI and the demo, seeded, play the same with the recordings in as with no audio at all, draw for draw
  const sim = audio => {
    if (audio) { const f = makeFake(); globalThis.AudioContext = f.Ctx; S.ac(); for (const [file] of Object.values(FILES).flat()) S.SAMPLE.bufs[file] = { buf:{ duration:table[file], sampleRate:48000, getChannelData:() => pcm }, lead:0 }; }
    else { const old = S.ctx(); if (old) { S.off(); old.close(); } delete globalThis.AudioContext; forget(); }
    reseed(4242); T.newMatch(0, 3, { halfLen:60, diff:0, auto:true, headless:true }); let n = 0; const r0 = rndCalls();
    while (!T.M.over && n < 60000) { T.update(STEP); n++; }
    const ai = [T.M.score, T.M.tries, T.M.stats, rndCalls() - r0];
    reseed(4243); T.newMatch(0, 1, { halfLen:1e9, diff:0, auto:true, demo:true }); const r1 = rndCalls();
    for (let i = 0; i < 3000; i++) { T.update(STEP); S.frame(); }
    return JSON.stringify([ai, T.M.score, T.M.ball.x, T.M.ball.y, rndCalls() - r1]);
  };
  const heard = sim(true), silent = sim(false);
  ok(heard === silent, 'AI v AI and the demo, seeded: the same with every recording in as with no audio, draw for draw');
  S.off(); forget();
  const code = read('../src/sound.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  ok((code.match(/\bfetch\(/g) || []).length === 1 && /function soundUnlock\(\) \{[\s\S]*?if \(soundUnlocked\) sndLoad\(\);/.test(code) && (code.match(/(?<!function )\bsndLoad\(\)/g) || []).length === 1, 'one fetch in the file, reached only from a tap');
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
