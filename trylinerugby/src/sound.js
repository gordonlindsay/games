/* =========================================================
   Sound (synthesised, starts after a tap)
   ========================================================= */
let AC = null, NOISE = null;
function ac() {
  if (!settings.sound) return null;
  try {
    if (!AC) {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      const n = AC.sampleRate*3, buf = AC.createBuffer(1, n, AC.sampleRate), ch = buf.getChannelData(0);
      for (let i = 0; i < n; i++) ch[i] = Math.random()*2-1;
      NOISE = buf;
    }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  } catch (e) { return null; }
}
function noise(a, o) {
  const t = a.currentTime, src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = NOISE; f.type = o.type || 'lowpass'; f.frequency.value = o.freq || 800; f.Q.value = o.q || 0.7;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.gain || 0.3, t + (o.attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  src.connect(f).connect(g).connect(a.destination); src.start(t, Math.random()*0.5); src.stop(t + o.dur + 0.05);
}
function tone(a, o) {
  const t = a.currentTime, osc = a.createOscillator(), g = a.createGain(), gain = o.gain || 0.2;
  osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.freq, t);
  if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.freq*o.slide, t + o.dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.setValueAtTime(gain, t + o.dur*0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  if (o.trem) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = o.trem; lg.gain.value = gain*0.6; l.connect(lg).connect(g.gain); l.start(t); l.stop(t + o.dur); }
  osc.connect(g).connect(a.destination); osc.start(t); osc.stop(t + o.dur + 0.02);
}
function sfx(k) {
  if (globalThis.__sfxSpy) globalThis.__sfxSpy(k, M && M.cut ? M.cut.t : null);   // the tools count sounds
  if (!M || M.demo || M.headless) return;
  const a = ac(); if (!a) return;
  if (k === 'whistle') tone(a, { freq:2950, dur:0.32, gain:0.1, trem:38 });
  else if (k === 'long') tone(a, { freq:2950, dur:0.95, gain:0.1, trem:38 });
  else if (k === 'horn') tone(a, { freq:196, dur:0.9, type:'sawtooth', gain:0.07 });
  else if (k === 'kick') { tone(a, { freq:150, dur:0.12, gain:0.32, slide:0.4 }); noise(a, { dur:0.06, freq:1800, gain:0.12 }); }
  else if (k === 'pass') noise(a, { dur:0.07, type:'bandpass', freq:1400, q:1.2, gain:0.05 });
  else if (k === 'tackle') { noise(a, { dur:0.18, freq:500, gain:0.32 }); tone(a, { freq:90, dur:0.14, gain:0.22, slide:0.6 }); }
  else if (k === 'roar') noise(a, { dur:2.2, type:'bandpass', freq:900, q:0.4, gain:0.26, attack:0.25 });
  else if (k === 'cheer') noise(a, { dur:1.2, type:'bandpass', freq:1000, q:0.5, gain:0.14, attack:0.12 });
  else if (k === 'whoosh') noise(a, { dur:0.25, type:'bandpass', freq:900, q:0.8, gain:0.12, attack:0.08 });
  else if (k === 'tick') tone(a, { freq:1200, dur:0.04, gain:0.08 });
  else if (k === 'strike') { tone(a, { freq:120, dur:0.10, gain:0.36, slide:0.5 }); noise(a, { dur:0.05, freq:1600, gain:0.12 }); }
  else if (k === 'post') tone(a, { freq:900, dur:0.30, type:'triangle', gain:0.12, slide:0.97 });
  else if (k === 'groan') noise(a, { dur:0.9, type:'bandpass', freq:380, q:0.6, gain:0.14, attack:0.15 });
  else if (k === 'hit') { tone(a, { freq:70, dur:0.2, gain:0.3, slide:0.5 }); noise(a, { dur:0.22, freq:380, gain:0.4 }); }   // a Big Hit
  else if (k === 'whiff') noise(a, { dur:0.12, type:'bandpass', freq:1300, q:1.0, gain:0.08 });                            // a broken tackle
  else if (k === 'trip') tone(a, { freq:620, dur:0.06, type:'square', gain:0.1 });                                        // an ankle tap or a trip
}
function buzz(ms, team) {                                  // the phone's vibration, and the rumble on a team's seat (every seat when no team is given)
  if (!M || M.demo || M.headless) return;
  if (team == null) { for (const s of [0, 1]) rumble(s, ms); } else rumble(seatOfTeam(team), ms);
  if (typeof nativeBuzz === 'function' && nativeBuzz(ms)) return;   // the Try Line app: the phone's haptics (native.js)
  if (!navigator.vibrate) return;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try { navigator.vibrate(ms); } catch (e) { /* unsupported */ }
}

