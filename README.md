# Try Line Rugby

Mobile rugby sevens. Top-down 2D, one stick and two buttons, with a five-round
championship between England, France, Ireland, Italy, Scotland and Wales.

**Play:** https://gordonlindsay.github.io/trylinerugby/

## Decided

- **Sevens**, not fifteens (2026-10-11). Seven a side on a full-size pitch keeps a phone screen readable.
- **2D top-down** for now (2026-10-11). 3D is a later call, once the gameplay is fun.
- **Landscape only** (2026-10-12). Upright play was glitchy. A phone held upright gets a "Turn Your Phone Sideways"
  cover and the match pauses underneath. Phone browsers can't be forced to turn: Android gets a best-effort
  fullscreen and landscape lock on Play, and iPhone ignores it.
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

Scrums and lineouts open a close-up: a side-on view slides in over the pitch and the clock stops.

- **Scrum:** the referee calls Crouch, Bind, Set. Press Push on Set for a good hit, then tap it fast with the stick
  held forward. Your pack's shove moves the scrum, and the ground it gains is real. Out-shove them on their ball to
  steal it, or dominate to win a penalty, or a pushover try within 8m of their line.
- **Lineout:** one jumper each in the middle. The hooker dummies, then throws. Press Jump so your jumper is at full
  height when the ball arrives. On their throw, beating their jumper to it is a steal.
- A steal or a dominant scrum gives the winning team a short burst of speed (`surge`, ×1.08 for 2.5s).

## Files

- `index.html` is the whole game in one page. GitHub Pages serves it from `main`.
- `tools/` runs the match engine headless in Node to check balance:
  - `node tools/bot.mjs` plays a scripted average player against the CPU on each difficulty.
    The current baseline is Easy about 90% wins, Normal about 75%, Hard about 55%.
  - `node tools/sim.mjs` runs AI v AI matches. Expect about 3 tries a match on Normal.

  - `node tools/setpieces.mjs` plays scrums at different tap speeds and lineouts at different jump timings on each
    difficulty. On Normal: 4 taps/s keeps your scrum about 90%; 8 taps/s plus a good hit wins a penalty about a third
    of the time and steals theirs about 30%; a perfectly timed jump keeps your throw about 87% and steals theirs
    about 25%.

  Run them after any change to speed, tackling, AI or set pieces.

## Preview and release

- **Preview:** run `python3 -m http.server 3061` in this folder and open http://localhost:3061/.
  The parent `games` folder also has a `trylinerugby` preview in `.claude/launch.json`.
- **Release:** push to `main`. Pages redeploys in about a minute.
- The first version was a claude.ai artifact (https://claude.ai/artifact/TYrVkqhDFLNyxYhTNPq82b). It no longer gets
  updates; this repo is the source.

## Engine notes

- World units are metres. x runs 0–120 between the dead-ball lines, with try lines at 10 and 110. y runs 0–70 between
  the touchlines. Your team always attacks +x, which is right on screen.
- `window.__tryline` exposes the engine (`simulate`, `newMatch`, `update`, `input`, `M`) for the tools and for
  console debugging.
- Chasing defenders must pursue at full speed (`pursue: true`). With arrive-style steering they slow as they close
  and can never catch a runner. That bug made a scripted player score 15+ tries a match.
