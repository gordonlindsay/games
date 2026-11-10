#!/usr/bin/env python3
"""The game's recordings: CC0 sources in, assets/sounds/*.m4a out, with the table in src/sound.js and assets/sounds/LICENCES.md.

    python3 tools/sound-make.py RAW_DIR [--write]

RAW_DIR holds the downloads under their own names, archives unpacked into x-<archive name>/ (each source page is in SRC and in LICENCES.md).
Nothing here is shipped or run by the game: it is how the files were made, so they can be made again.
Needs numpy, scipy and ffmpeg. Without --write it prints what it would make and the loudness of each.

Every file is mono, 48 kHz, AAC-LC in .m4a (decodeAudioData in Safari, Chrome, Firefox and the iOS web view; the MP4 edit
list says where the sound starts, so the encoder's 1024 samples of priming are not heard, and a decoder that ignores it is
caught by the length: every file is a whole number of 1024-sample frames). Loudness: each file is set so
that, played at its SOUND.level through the bus, it is as loud as the synthesised recipe it replaces (TARGET: the loudest
50 ms through the real bus, from soundRender in Chrome; the crowd sounds by their loudest 400 ms, the bed by its RMS).
CAL holds the small corrections measured afterwards in Chrome, where the bus's limiter takes a loud sound down.
"""
import hashlib, json, os, re, subprocess, sys
import numpy as np
from scipy import signal

SR = 48000
FRAME = 1024      # AAC's frame. Every file is a whole number of them, so a decoder that keeps the encoder's 1024 samples of priming is told apart from one that drops it by the length alone (src/sound.js, sndLead)
GAME = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(GAME, 'assets', 'sounds')

# id: (page, author as the page shows it, licence, file under RAW_DIR, what it is)
SRC = {
  'crowd':   ('https://opengameart.org/content/crowd-shoutingspeaking-ambience', 'StarNinjas', 'CC0', 'crowd_shouting_0.ogg', 'voices shouting, mixed as a crowd'),
  'applause':('https://opengameart.org/content/applause-in-a-large-hall-or-church', 'eXpl0it3r', 'CC0', 'applause-clapping-church-crowd-immersive.wav', 'a crowd applauding in a large hall'),
  'claps':   ('https://opengameart.org/content/well-done', 'qubodup', 'CC0', 'Well Done CCBY3.flac', 'people clapping'),
  'ooh':     ('https://opengameart.org/content/oooooooooooooo', 'Nocturnal_Vanguard', 'CC0', 'oooooooooo.ogg', 'one voice, "ooo", no words'),
  'punch1':  ('https://opengameart.org/content/punch', 'qubodup', 'CC0', 'x-qubodupPunch/qubodupPunch/qubodupPunch01.flac', 'a punch'),
  'punch2':  ('https://opengameart.org/content/punch', 'qubodup', 'CC0', 'x-qubodupPunch/qubodupPunch/qubodupPunch02.flac', 'a punch'),
  'punch3':  ('https://opengameart.org/content/punch', 'qubodup', 'CC0', 'x-qubodupPunch/qubodupPunch/qubodupPunch03.flac', 'a punch'),
  'punch4':  ('https://opengameart.org/content/punch', 'qubodup', 'CC0', 'x-qubodupPunch/qubodupPunch/qubodupPunch04.flac', 'a punch'),
  'punch5':  ('https://opengameart.org/content/punch', 'qubodup', 'CC0', 'x-qubodupPunch/qubodupPunch/qubodupPunch05.flac', 'a punch'),
  'thwack2': ('https://opengameart.org/content/thwack-sounds', 'AntumDeluge', 'CC0', 'x-thwack-1.0/PCM/thwack-02.wav', 'a hit on something soft'),
  'thwack6': ('https://opengameart.org/content/thwack-sounds', 'AntumDeluge', 'CC0', 'x-thwack-1.0/PCM/thwack-06.wav', 'a hit on something solid'),
  'thwack7': ('https://opengameart.org/content/thwack-sounds', 'AntumDeluge', 'CC0', 'x-thwack-1.0/PCM/thwack-07.wav', 'a hit on something solid'),
  'towel6':  ('https://opengameart.org/content/40-wet-towel-clubpoundhitattack-sounds', 'qubodup', 'CC0', 'x-wet_towel_on_body/wet_towel_on_body/wet_towel_on_body-06.flac', 'a slap on a back'),
  'towel12': ('https://opengameart.org/content/40-wet-towel-clubpoundhitattack-sounds', 'qubodup', 'CC0', 'x-wet_towel_on_body/wet_towel_on_body/wet_towel_on_body-12.flac', 'a slap on a back'),
  'clang1':  ('https://opengameart.org/content/metal-clang-sounds', 'bart', 'CC0', 'x-clangs/clang - Marker #1.wav', 'struck metal, 834 Hz'),
  'clang5':  ('https://opengameart.org/content/metal-clang-sounds', 'bart', 'CC0', 'x-clangs/clang - Marker #5.wav', 'struck metal, 810 Hz'),
  'swish4':  ('https://opengameart.org/content/swishes-sound-pack', 'artisticdude', 'CC0', 'x-swishes/swishes/swish-4.wav', 'a swish'),
  'swish5':  ('https://opengameart.org/content/swishes-sound-pack', 'artisticdude', 'CC0', 'x-swishes/swishes/swish-5.wav', 'a swish'),
  'swish6':  ('https://opengameart.org/content/swishes-sound-pack', 'artisticdude', 'CC0', 'x-swishes/swishes/swish-6.wav', 'a swish'),
  'swish7':  ('https://opengameart.org/content/swishes-sound-pack', 'artisticdude', 'CC0', 'x-swishes/swishes/swish-7.wav', 'a swish'),
  'swish9':  ('https://opengameart.org/content/swishes-sound-pack', 'artisticdude', 'CC0', 'x-swishes/swishes/swish-9.wav', 'a swish'),
  'swish10': ('https://opengameart.org/content/swishes-sound-pack', 'artisticdude', 'CC0', 'x-swishes/swishes/swish-10.wav', 'a light swish'),
  'swish11': ('https://opengameart.org/content/swishes-sound-pack', 'artisticdude', 'CC0', 'x-swishes/swishes/swish-11.wav', 'a light swish'),
  'swish13': ('https://opengameart.org/content/swishes-sound-pack', 'artisticdude', 'CC0', 'x-swishes/swishes/swish-13.wav', 'a light swish'),
  'sand1':   ('https://opengameart.org/content/fantozzis-footsteps-grasssand-stone', 'Fantozzi', 'CC0', 'x-Fantozzi-footsteps/Fantozzi-footsteps/flac/Fantozzi-SandL1.flac', 'a step on sand or grass'),
  'sand2':   ('https://opengameart.org/content/fantozzis-footsteps-grasssand-stone', 'Fantozzi', 'CC0', 'x-Fantozzi-footsteps/Fantozzi-footsteps/flac/Fantozzi-SandL2.flac', 'a step on sand or grass'),
  'kpm0':    ('https://kenney.nl/assets/impact-sounds', 'Kenney', 'CC0', 'kenney_impact-sounds/Audio/impactPunch_medium_000.ogg', 'a body blow'),
  'kpm1':    ('https://kenney.nl/assets/impact-sounds', 'Kenney', 'CC0', 'kenney_impact-sounds/Audio/impactPunch_medium_001.ogg', 'a body blow'),
  'kpm2':    ('https://kenney.nl/assets/impact-sounds', 'Kenney', 'CC0', 'kenney_impact-sounds/Audio/impactPunch_medium_002.ogg', 'a body blow'),
  'kpm3':    ('https://kenney.nl/assets/impact-sounds', 'Kenney', 'CC0', 'kenney_impact-sounds/Audio/impactPunch_medium_003.ogg', 'a body blow'),
  'kph1':    ('https://kenney.nl/assets/impact-sounds', 'Kenney', 'CC0', 'kenney_impact-sounds/Audio/impactPunch_heavy_001.ogg', 'a heavy body blow'),
  'kph3':    ('https://kenney.nl/assets/impact-sounds', 'Kenney', 'CC0', 'kenney_impact-sounds/Audio/impactPunch_heavy_003.ogg', 'a heavy body blow'),
  'ksm0':    ('https://kenney.nl/assets/impact-sounds', 'Kenney', 'CC0', 'kenney_impact-sounds/Audio/impactSoft_medium_000.ogg', 'a soft thud'),
  'ksm2':    ('https://kenney.nl/assets/impact-sounds', 'Kenney', 'CC0', 'kenney_impact-sounds/Audio/impactSoft_medium_002.ogg', 'a soft thud'),
  'ksm4':    ('https://kenney.nl/assets/impact-sounds', 'Kenney', 'CC0', 'kenney_impact-sounds/Audio/impactSoft_medium_004.ogg', 'a soft thud'),
  'grass1':  ('https://kenney.nl/assets/impact-sounds', 'Kenney', 'CC0', 'kenney_impact-sounds/Audio/footstep_grass_001.ogg', 'a step on grass'),
  'grass2':  ('https://kenney.nl/assets/impact-sounds', 'Kenney', 'CC0', 'kenney_impact-sounds/Audio/footstep_grass_002.ogg', 'a step on grass'),
  'grass4':  ('https://kenney.nl/assets/impact-sounds', 'Kenney', 'CC0', 'kenney_impact-sounds/Audio/footstep_grass_004.ogg', 'a step on grass'),
  'cloth1':  ('https://kenney.nl/assets/rpg-audio', 'Kenney', 'CC0', 'kenney_rpg-audio/Audio/cloth1.ogg', 'cloth moving'),
  'cloth2':  ('https://kenney.nl/assets/rpg-audio', 'Kenney', 'CC0', 'kenney_rpg-audio/Audio/cloth2.ogg', 'cloth moving'),
  'cloth3':  ('https://kenney.nl/assets/rpg-audio', 'Kenney', 'CC0', 'kenney_rpg-audio/Audio/cloth3.ogg', 'cloth moving'),
  'cloth4':  ('https://kenney.nl/assets/rpg-audio', 'Kenney', 'CC0', 'kenney_rpg-audio/Audio/cloth4.ogg', 'cloth moving'),
}
FETCHED = '2026-11-09'
NOTES = {   # what a source's own page says that its download does not
  'claps': 'Its page: changed to CC0 on 2024-10-05, and the "CCBY3" left in the file\'s name is to be ignored.',
  'towel6': 'Its page: "Available under cc0. Ignore the txt info file in the 7z that says otherwise."',
  'towel12': 'Its page: "Available under cc0. Ignore the txt info file in the 7z that says otherwise."',
  'sand1': 'Submitted to OpenGameArt by qubodup. Its page: the steps were taken from Fantozzi\'s Freesound pack 10338 under CC0.',
  'sand2': 'Submitted to OpenGameArt by qubodup. Its page: the steps were taken from Fantozzi\'s Freesound pack 10338 under CC0.',
}

# A layer: (source, {start, dur, rate, at, db, hp, lp, fade}). rate > 1 is higher and shorter; rate may be [from, to], a glide
def L(src, **o): return (src, o)
# the loudest-window target through the bus (dB), from soundRender in Chrome, 2026-11-09: what the recipes measure
TARGET = { 'kick':-20.2, 'strike':-19.4, 'post':-20.5, 'pass':-41.0, 'catch':-37.8, 'fumble':-29.8, 'bounce':-28.1, 'tackle':-26.0,
  'hit':-17.8, 'whiff':-38.3, 'whoosh':-35.3, 'roar':-21.0, 'cheer':-26.3, 'groan':-26.2, 'bed':-44.2 }
LEVEL = { 'kick':1.2, 'strike':1.2, 'post':1.25, 'pass':2, 'catch':0.9, 'fumble':0.45, 'bounce':1, 'tackle':0.72, 'hit':1.35, 'whiff':1.25,
  'whoosh':0.6, 'roar':0.6, 'cheer':0.55, 'groan':0.58, 'bed':1 }   # SOUND.level, and the bed's peak
WINDOW = { 'roar':0.4, 'cheer':0.4, 'groan':0.4 }                     # seconds; the rest 0.05, and the bed its RMS
CAL = {'tackle': 0.9, 'pass': 2.4, 'catch': 3.4, 'kick': 2.4, 'bounce': 1.7, 'whoosh': -0.1, 'whiff': -0.5, 'hit': -0.5, 'bed': -4.9, 'roar': -5.4, 'cheer': -5.4, 'groan': -5.9, 'strike': -0.7, 'post': 0.8, 'fumble': -5.3}                                                              # dB, measured in Chrome afterwards (the limiter)
TRIM = 0.62                                                           # SOUND.trim: below the limiter, what the bus does to a level

ROAR_CURVE = [(0, 0), (0.18, 0.42), (0.52, 1), (1.25, 0.86), (2.1, 0.46), (3.4, 0)]      # the recipe's own swells
CHEER_CURVE = [(0, 0), (0.12, 0.6), (0.34, 1), (0.92, 0.68), (2.1, 0)]
GROAN_CURVE = [(0, 0), (0.18, 1), (0.6, 0.74), (1.8, 0)]

def crowd_layers(seed, pitch, lp):
  """three takes of the crowd recording at once, from different places and a little apart in pitch: one babble, no voice on its own"""
  return [L('crowd', start=seed, dur=4, rate=pitch, lp=lp, hp=180), L('crowd', start=seed + 7.3, dur=4, rate=pitch*0.94, lp=lp, hp=180, db=-2),
          L('crowd', start=seed + 12.9, dur=4, rate=pitch*1.07, lp=lp, hp=180, db=-3)]
def ooh_chorus(rates, db=0, lp=3000, glide=1.0):
  """the one "ooo" many times over, each at its own pitch and a few ms apart: a crowd's ooh"""
  return [L('ooh', start=0.05, dur=1.85, rate=[r, r*glide], at=0.011*i, db=db - 1.5*(i % 3), lp=lp, hp=150) for i, r in enumerate(rates)]

OUTS = {   # in the order the game fetches them: the most frequent first
  'tackle':[dict(dur=0.32, layers=[L('kpm0', start=0.01), L('cloth2', start=0.08, db=-5), L('sand1', at=0.04, db=-16, dur=0.12)]),
            dict(dur=0.32, layers=[L('kpm1', start=0.015), L('cloth4', start=0.06, db=-6), L('sand2', at=0.04, db=-16, dur=0.12)]),
            dict(dur=0.32, layers=[L('kpm2', start=0.02), L('cloth1', start=0.17, db=-5), L('sand1', at=0.05, db=-17, dur=0.12)]),
            dict(dur=0.32, layers=[L('kpm3', start=0.015), L('cloth3', start=0.13, db=-5), L('sand2', at=0.05, db=-17, dur=0.12)])],
  'pass':  [dict(dur=0.14, layers=[L('swish10', start=0.005), L('thwack2', db=-14, rate=1.3)]),
            dict(dur=0.12, layers=[L('swish11', start=0.01), L('thwack2', db=-14, rate=1.4)]),
            dict(dur=0.1, layers=[L('swish13', start=0.005), L('thwack2', db=-14, rate=1.2)])],
  'catch': [dict(dur=0.12, layers=[L('thwack2', start=0.005)]),
            dict(dur=0.14, layers=[L('towel6', start=0.02, lp=4500)]),
            dict(dur=0.14, layers=[L('towel12', lp=4500)])],
  'kick':  [dict(dur=0.24, layers=[L('punch1')]), dict(dur=0.24, layers=[L('punch4')]), dict(dur=0.24, layers=[L('thwack6')])],
  'bounce':[dict(dur=0.2, layers=[L('grass1'), L('ksm0', db=-6)]), dict(dur=0.2, layers=[L('grass2'), L('ksm2', db=-6)]),
            dict(dur=0.2, layers=[L('grass4', rate=1.1), L('ksm4', db=-6), L('sand2', db=-16, dur=0.06)])],
  'whoosh':[dict(dur=0.2, layers=[L('swish5', start=0.01, rate=1.25)]), dict(dur=0.2, layers=[L('swish6', start=0.01, rate=1.2)]),
            dict(dur=0.22, layers=[L('swish7', start=0.01, rate=1.15)])],
  'whiff': [dict(dur=0.15, layers=[L('swish4', start=0.02, rate=1.4)]), dict(dur=0.15, layers=[L('swish9', start=0.02, rate=1.35)])],
  'hit':   [dict(dur=0.6, layers=[L('kph1', start=0.01), L('punch2', db=-5), L('cloth4', start=0.06, db=-4), L('grass1', at=0.09, db=-6)]),
            dict(dur=0.6, layers=[L('kph3', start=0.01), L('punch3', db=-5), L('cloth2', start=0.08, db=-4), L('grass2', at=0.1, db=-6)])],
  'bed':   [dict(loop=14.0, xfade=1.6, hp=140, lp=1300, lp2=True, reverb=0.25, layers=[
              L('crowd', start=0.4, dur=15.8), L('crowd', start=10.9, dur=17, rate=0.93, db=-2), L('crowd', start=5.2, dur=16, rate=1.06, db=-3)])],
  'roar':  [dict(curve=ROAR_CURVE, reverb=0.2, layers=crowd_layers(2.0, 1.08, 2400) + [L('applause', start=5, dur=3.6, db=-1, hp=200)] + ooh_chorus([1.5, 1.62, 1.75, 1.88], db=-9)),
            dict(curve=ROAR_CURVE, reverb=0.2, layers=crowd_layers(9.5, 1.12, 2400) + [L('applause', start=17, dur=3.6, db=-1, hp=200)] + ooh_chorus([1.42, 1.56, 1.68, 1.8], db=-9))],
  'cheer': [dict(curve=CHEER_CURVE, reverb=0.15, layers=[L('applause', start=3, dur=2.3), L('claps', start=0.9, dur=2.3, db=-4, hp=200),
              L('crowd', start=3.1, dur=2.3, rate=1.1, lp=2000, hp=180, db=-8)]),
            dict(curve=CHEER_CURVE, reverb=0.15, layers=[L('applause', start=24, dur=2.3), L('claps', start=0.2, dur=2.3, db=-4, hp=200),
              L('crowd', start=19.4, dur=2.3, rate=1.14, lp=2000, hp=180, db=-8)])],
  'groan': [dict(curve=GROAN_CURVE, reverb=0.15, layers=ooh_chorus([0.86, 0.92, 0.98, 1.04, 1.1, 1.17], glide=0.82) + [L('crowd', start=12.2, dur=1.9, rate=0.9, lp=900, hp=150, db=-12)]),
            dict(curve=GROAN_CURVE, reverb=0.15, layers=ooh_chorus([0.8, 0.88, 0.95, 1.0, 1.07, 1.13], glide=0.8) + [L('crowd', start=20.6, dur=1.9, rate=0.88, lp=900, hp=150, db=-12)])],
  'strike':[dict(dur=0.42, layers=[L('punch5'), L('swish9', at=0.02, db=-9, rate=1.2)]),
            dict(dur=0.42, layers=[L('thwack7', start=0.015), L('swish4', at=0.02, db=-9, rate=1.2)])],
  'post':  [dict(dur=1.0, layers=[L('clang1', start=0.005, fade=0.5), L('ksm0', db=-2), L('thwack2', db=-10)]),
            dict(dur=1.0, layers=[L('clang5', start=0.08, fade=0.5), L('ksm2', db=-2), L('thwack2', db=-10)])],
  'fumble':[dict(dur=0.5, layers=[L('thwack2', start=0.005, dur=0.08), L('towel6', start=0.02, dur=0.09, at=0.085, lp=4500, db=-3, rate=1.1),
              L('thwack2', start=0.005, dur=0.08, at=0.18, db=-5, rate=1.15), L('grass1', at=0.31, db=-2), L('ksm0', at=0.31, db=-8)]),
            dict(dur=0.5, layers=[L('towel12', dur=0.09, lp=4500), L('thwack2', start=0.005, dur=0.08, at=0.075, db=-2, rate=0.92),
              L('towel6', start=0.02, dur=0.09, at=0.17, lp=4500, db=-6), L('grass2', at=0.29, db=-2), L('ksm2', at=0.29, db=-8)])],
}

def load(raw, sid):
  f = os.path.join(raw, SRC[sid][3])
  r = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
  return np.frombuffer(r.stdout, dtype=np.float32).astype(np.float64)

def resample(x, rate):
  """read the take faster or slower: higher and shorter for rate > 1. A [from, to] rate glides between them"""
  r0, r1 = (rate, rate) if not isinstance(rate, list) else rate
  if r0 == 1 and r1 == 1: return x
  n = int(len(x)/((r0 + r1)/2))
  pos = np.cumsum(np.linspace(r0, r1, n)) - r0
  pos = pos[pos < len(x) - 1]
  return np.interp(pos, np.arange(len(x)), x)

def filt(x, kind, fc, order=2):
  sos = signal.butter(order, fc, btype=kind, fs=SR, output='sos')
  return signal.sosfilt(sos, x)

def fades(x, fin, fout):
  n, a, b = len(x), int(fin*SR), int(fout*SR)
  if a: x[:a] *= np.linspace(0, 1, a)**2
  if b: x[n - b:] *= np.cos(np.linspace(0, np.pi/2, b))**2
  return x

def reverb(x, wet, seed=7):
  """a short open-air tail: decaying noise, the same every run"""
  if not wet: return x
  rng = np.random.default_rng(seed); n = int(0.9*SR); t = np.arange(n)/SR
  ir = rng.standard_normal(n)*np.exp(-t*6.9/0.8)*np.minimum(1, t/0.012); ir = filt(ir, 'lowpass', 3500); ir /= np.sqrt(np.sum(ir**2))
  y = signal.fftconvolve(x, ir)[:len(x)]
  return x*(1 - wet*0.5) + y*wet

def curve(n, pts):
  t = np.arange(n)/SR; xs = [p[0] for p in pts]; vs = [p[1] for p in pts]
  return np.interp(t, xs, vs)

def render(raw, spec, cache):
  layers = []
  for sid, o in spec['layers']:
    if sid not in cache: cache[sid] = load(raw, sid)
    x = cache[sid][int(o.get('start', 0)*SR):]
    if 'dur' in o: x = x[:int(o['dur']*SR)]
    x = resample(x.copy(), o.get('rate', 1))
    if o.get('hp'): x = filt(x, 'highpass', o['hp'])
    if o.get('lp'): x = filt(x, 'lowpass', o['lp'])
    x = fades(x, 0.002, o.get('fade', 0.01))*10**(o.get('db', 0)/20)
    layers.append((int(o.get('at', 0)*SR), x))
  n = max(a + len(x) for a, x in layers)
  y = np.zeros(n)
  for a, x in layers: y[a:a + len(x)] += x
  if spec.get('hp'): y = filt(y, 'highpass', spec['hp'])
  if spec.get('lp'):
    y = filt(y, 'lowpass', spec['lp'])
    if spec.get('lp2'): y = filt(y, 'lowpass', spec['lp'])
  y = reverb(y, spec.get('reverb', 0))
  if 'loop' in spec:                                          # the end crossfades into the start: an equal-power seam, so the loop has none
    L, w = round(spec['loop']*SR/FRAME)*FRAME, int(0.02*SR)
    db = lambda v: 10*np.log10(np.mean(v**2) + 1e-20)
    # the seam is the recording's own join at X (the loop's end is the take just before X): put it where the crowd is no louder one side than the other
    X = min(range(int((spec['xfade'] - 0.2)*SR), int((spec['xfade'] + 0.2)*SR), int(0.005*SR)), key=lambda i: abs(db(y[i - w:i]) - db(y[i:i + w])))
    body = y[X:X + L].copy(); head = y[:X]
    w = np.linspace(0, np.pi/2, X)
    body[L - X:] = body[L - X:]*np.cos(w) + head*np.sin(w)
    return body                                               # the margins are added after the gain: see main
  if 'curve' in spec:
    y = y[:int(spec['curve'][-1][0]*SR)]; y = y*curve(len(y), spec['curve'])
  else:
    y = fades(y[:int(spec['dur']*SR)], 0.001, min(0.06, spec['dur']*0.4))
  return y

def loudest(x, secs):
  n = int(secs*SR); c = np.concatenate([[0], np.cumsum(x*x)])
  if len(x) <= n: return 10*np.log10(max(1e-24, c[-1]/n))
  return 10*np.log10(max(1e-24, np.max(c[n:] - c[:-n])/n))
def active_rms(x):
  pk = np.max(np.abs(x)); i = np.where(np.abs(x) > pk*1e-3)[0]
  return 10*np.log10(np.mean(x[i[0]:i[-1] + 1]**2))
def bus_hp(x): return filt(x, 'highpass', 75, 2)

def level(key, y):
  """the gain that makes this file, at its level through the bus (a 75 Hz cut and the trim, below the limiter), as loud as the recipe"""
  pre = bus_hp(y)
  have = active_rms(pre) if key == 'bed' else loudest(pre, WINDOW.get(key, 0.05))
  want = TARGET[key] - 20*np.log10(TRIM*LEVEL[key]) + CAL.get(key, 0)
  return 10**((want - have)/20)

def limit(y, ceiling=-3.0):
  """a gentle peak limiter for the file itself (a clap in the applause, say): 5 ms ahead, released over 60 ms. Most files never reach it"""
  c = 10**(ceiling/20); a = np.abs(y)
  if a.max() <= c: return y
  n = int(0.005*SR); env = np.array([a[max(0, i - n):i + n].max() for i in range(0, len(a))]) if len(a) < 4000 else np.maximum.reduce([np.roll(a, k) for k in range(-n, n + 1)])
  g = np.minimum(1, c/np.maximum(env, 1e-9))
  r = np.exp(-1/(0.06*SR)); out = np.empty_like(g); v = 1.0
  for i, x in enumerate(g): v = x if x < v else r*v + (1 - r)*x; out[i] = v
  return y*out

def encode(y, path, kbps):
  y = np.clip(y, -1, 1).astype('<f4')
  subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'aac', '-b:a', f'{kbps}k',
                  '-ar', str(SR), '-ac', '1', '-movflags', '+faststart', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', path],
                 input=y.tobytes(), check=True)

def main():
  raw, write = sys.argv[1], '--write' in sys.argv
  cache, made = {}, {}
  tmp = os.path.join(OUT, '.tmp.m4a')
  if write:
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
      if f.endswith('.m4a'): os.remove(os.path.join(OUT, f))
  for key, specs in OUTS.items():
    for i, spec in enumerate(specs):
      y = render(raw, spec, cache)
      for _ in range(3): y = limit(y*level(key, y))         # set, held under -3 dBFS, and set again
      y = np.pad(y, (0, (-len(y)) % FRAME))                   # a whole number of frames: silence at the end
      margin = 0
      if 'loop' in spec:                                      # the loop with two frames of itself either side: the codec's edges, which it gets least right, fall outside it
        margin = 2*FRAME; y = np.concatenate([y[-margin:], y, y[:margin]])
      peak = 20*np.log10(np.max(np.abs(y)))
      if peak > -1: raise SystemExit(f'{key}-{i}: peak {peak:.1f} dBFS, over -1: raise its SOUND.level and make the file quieter')
      kbps = 64 if key in ('bed', 'roar', 'cheer', 'groan') else 80
      name = f'{key}-{i}'
      if write:
        encode(y, tmp, kbps)
        h = hashlib.sha256(open(tmp, 'rb').read()).hexdigest()[:10]
        fn = f'{name}.{h}.m4a'; os.replace(tmp, os.path.join(OUT, fn))
      else: fn = name + '.m4a'
      made.setdefault(key, []).append((fn, round((len(y) - 2*margin)/SR, 6), round(margin/SR, 6), spec))
      print(f'{fn:28s} {len(y)/SR:6.3f} s  peak {peak:6.1f} dBFS')
  if write:
    table(made); licences(made); credits(made)

def table(made):
  """the SOUND_FILES table in src/sound.js, between its two marker lines"""
  srcs = sorted({sid for specs in made.values() for _, _, _, s in specs for sid, _ in s['layers']})
  lines = ['const SOUND_FILES = {']
  for key, files in made.items():
    lines.append(f"  {key}:[{', '.join(f'[{json.dumps(fn)}, {d}' + (f', {m}' if m else '') + ']' for fn, d, m, _ in files)}],")
  lines.append('};')
  path = os.path.join(GAME, 'src', 'sound.js'); text = open(path).read()
  a, b = '// sound-make: files from here', '// sound-make: files to here'
  if a not in text or b not in text: raise SystemExit('src/sound.js has no sound-make markers')
  text = text[:text.index(a) + len(a)] + '\n' + '\n'.join(lines).replace('"', "'") + '\n' + text[text.index(b):]
  open(path, 'w').write(text)

def credits(made):
  """each file's sources and licence on the sound test page (sounds.html), between its two marker lines: plain words, no links"""
  lines = ['var CREDITS = {']
  for key, files in made.items():
    for fn, d, m, spec in files:
      by = []
      for sid, _ in spec['layers']:
        page, author = SRC[sid][0], SRC[sid][1]
        t = f"{page.rstrip('/').split('/')[-1]} by {author} ({'OpenGameArt' if 'opengameart.org' in page else 'kenney.nl'})"
        if t not in by: by.append(t)
      lic = ' and '.join(sorted({SRC[sid][2] for sid, _ in spec['layers']}))
      lines.append(f"  '{fn}':'{'; '.join(by)} · {lic}',")
  lines.append('};')
  path = os.path.join(GAME, 'sounds.html'); text = open(path).read()
  a, b = '/* sound-make: credits from here */', '/* sound-make: credits to here */'
  if a not in text or b not in text: raise SystemExit('sounds.html has no sound-make markers')
  text = text[:text.index(a) + len(a)] + '\n' + '\n'.join(lines) + '\n' + text[text.index(b):]
  open(path, 'w').write(text)

def did(spec):
  parts = []
  for sid, o in spec['layers']:
    p = sid
    if o.get('start'): p += f" from {o['start']} s"
    if o.get('dur'): p += f", {o['dur']} s"
    if o.get('rate', 1) != 1: p += ', rate ' + ('to '.join(f'{r:g} ' for r in o['rate']).strip() if isinstance(o['rate'], list) else f"{o['rate']:g}")
    if o.get('at'): p += f", at {o['at']:g} s"
    if o.get('db'): p += f", {o['db']:g} dB"
    if o.get('hp') or o.get('lp'): p += ', ' + ' '.join(x for x in [f"high-pass {o['hp']} Hz" if o.get('hp') else '', f"low-pass {o['lp']} Hz" if o.get('lp') else ''] if x)
    parts.append(p)
  s = 'layers: ' + '; '.join(parts)
  if spec.get('hp') or spec.get('lp'): s += f". Filtered {spec.get('hp', 0)} Hz to {spec.get('lp', '')} Hz"
  if spec.get('reverb'): s += f". A short open-air tail ({int(spec['reverb']*100)}% wet)"
  if 'loop' in spec: s += f". Looped: {spec['loop']:g} s with a {spec['xfade']:g} s equal-power crossfade of its end into its start, and 2048 samples of itself either side of the loop"
  elif 'curve' in spec: s += '. Shaped by the recipe\'s own swell'
  else: s += f". Trimmed to {spec['dur']:g} s, faded"
  return s + '. Gain set to match the recipe through the bus; mono, 48 kHz, AAC in .m4a'

def licences(made):
  used = {}
  for key, files in made.items():
    for fn, d, m, spec in files:
      for sid, _ in spec['layers']: used.setdefault(sid, []).append(fn)
  out = ['# Sound Licences', '',
    'Every recording in this folder is CC0 (public domain): no attribution is needed and nothing can be withdrawn. Each file below',
    f'is made from the sources listed for it, checked on its own page on {FETCHED}, the day they were fetched. Kenney\'s packs are CC0',
    'as a whole (their License.txt says so too). The downloads themselves are not in the repository. `tools/sound-make.py` makes these',
    'files again from them.', '',
    'Synthesised in `src/sound.js`, with no recording: Pea Whistle and Long Whistle (no CC0 referee\'s whistle on OpenGameArt or Kenney,',
    'and Freesound refused the requests), Horn (no CC0 stadium hooter), Trip, Tick and Menu Tap (short cues made to be heard on a phone',
    'speaker). Every recorded sound keeps its recipe too, which plays until the recording is in or if it cannot be had.', '',
    '## Sources', '', '| Source | Page | Author | Licence | Its file | What it is |', '|---|---|---|---|---|---|']
  for sid in sorted(used):
    page, by, lic, path, what = SRC[sid]
    out.append(f'| `{sid}` | {page} | {by} | {lic} | {os.path.basename(path)} | {what}{". " + NOTES[sid] if sid in NOTES else ""} |')
  out += ['', '## Files', '', '| File | Sources | Licence | Fetched | What we did |', '|---|---|---|---|---|']
  for key, files in made.items():
    for fn, d, m, spec in files:
      sids = []
      for sid, _ in spec['layers']:
        if sid not in sids: sids.append(sid)
      lic = ' and '.join(sorted({SRC[s][2] for s in sids}))
      srcs = '; '.join(dict.fromkeys(f'{SRC[s][0]} ({SRC[s][1]})' for s in sids))   # a page once, however many of its files
      out.append(f'| `{fn}` | {srcs} | {lic} | {FETCHED} | {did(spec)} |')
  open(os.path.join(OUT, 'LICENCES.md'), 'w').write('\n'.join(out) + '\n')

if __name__ == '__main__':
  main()
