# Try Line Rugby

Mobile rugby sevens. Top-down 2D, one stick and two buttons, with a five-round
championship between England, France, Ireland, Italy, Scotland and Wales.

**Play:** https://gordonlindsay.github.io/trylinerugby/

## Decided

- **Sevens**, not fifteens (2026-10-11). Seven a side on a full-size pitch keeps a phone screen readable.
- **2D top-down** for now (2026-10-11). 3D is a later call, once the gameplay is fun.
- **One repo per game, served by GitHub Pages**, like Farnham Fighters (2026-10-11).
- Championship uses Six Nations table rules (4 a win, try bonus at 4+, losing bonus within 7, +3 Grand Slam)
  but not the name, crests or player names. Those are licensed, so a wider release needs a licence or made-up names.

## Controls

| | With the ball | Without it |
|---|---|---|
| Stick | Run. Flick sideways near a tackler to step him | Run |
| Big button | Pass to the ringed teammate. Tilt to pick a side | Dive tackle |
| Small button | Hold to power a kick, release to kick. A tap is a chip | Switch to the defender nearest the ball |

Keyboard: arrows or WASD, J, K, P to pause.

## Files

- `index.html` is the whole game in one page. GitHub Pages serves it from `main`.
- `tools/` runs the match engine headless in Node to check balance:
  - `node tools/bot.mjs` plays a scripted average player against the CPU on each difficulty.
    The current baseline is Easy about 90% wins, Normal about 75%, Hard about 55%.
  - `node tools/sim.mjs` runs AI v AI matches. Expect about 3 tries a match on Normal.

  Run both after any change to speed, tackling or AI.

## Preview and release

- **Preview:** run `python3 -m http.server 3061` in this folder and open http://localhost:3061/.
  The parent `games` folder also has a `trylinerugby` preview in `.claude/launch.json`.
- **Release:** push to `main`. Pages redeploys in about a minute.
- The first version was a claude.ai artifact (https://claude.ai/artifact/TYrVkqhDFLNyxYhTNPq82b). It no longer gets
  updates; this repo is the source.

## Engine notes

- World units are metres. x runs 0–120 between the dead-ball lines, with try lines at 10 and 110. y runs 0–70 between
  the touchlines. Your team always attacks +x: right in landscape, up in portrait.
- `window.__tryline` exposes the engine (`simulate`, `newMatch`, `update`, `input`, `M`) for the tools and for
  console debugging.
- Chasing defenders must pursue at full speed (`pursue: true`). With arrive-style steering they slow as they close
  and can never catch a runner. That bug made a scripted player score 15+ tries a match.
