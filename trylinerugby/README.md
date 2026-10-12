# Try Line Rugby

Mobile rugby sevens. Top-down 2D, one stick and two buttons, with a five-round
championship between England, France, Ireland, Italy, Scotland and Wales.

**Play:** https://gordonlindsay.github.io/games/trylinerugby/

## Decided

- **Sevens**, not fifteens (2026-10-11). Seven a side on a full-size pitch keeps a phone screen readable.
- **2D top-down** for now (2026-10-11). 3D is a later call, once the gameplay is fun.
- **Landscape only** (2026-10-12). Upright play was glitchy. A phone held upright gets a "Turn Your Phone Sideways"
  cover and the match pauses underneath. Phone browsers can't be forced to turn: Android gets a best-effort
  fullscreen and landscape lock on Play, and iPhone ignores it.
- **Duels** (2026-10-12): four chase-cam close-ups. The gold ring means "now", and a win gives a small burst. There's a
  Duels On / Off setting. Next up is a Dummy for you in Key Pass, on the small button.
- **One repo for all the games** (2026-10-12): this game lives in `gordonlindsay/games`, alongside Farnham Fighters
  and The Wedding Crashers, and away from SignCheck.
- Championship uses Six Nations table rules (4 a win, try bonus at 4+, losing bonus within 7, +3 Grand Slam)
  but not the name, crests or player names. Those are licensed, so a wider release needs a licence or made-up names.

## Controls

| | With the ball | Without it |
|---|---|---|
| Stick | Run. Flick sideways near a tackler to step him | Run |
| Big button | Pass to the ringed teammate. Tilt to pick a side | Dive tackle |
| Small button | Hold to power a kick, release to kick. A tap is a chip | Switch to the defender nearest the ball |

Keyboard: arrows or WASD, J, K, P to pause.

### Close-ups

Scrums, lineouts and duels open a close-up: the pitch and the clock freeze while it runs.

- **Scrum:** the referee calls Crouch, Bind, Set. Press Push on Set for a good hit, then tap it fast with the stick
  held forward. The scrum moves with your shove, and the ball comes out where it ends up. Out-shove them on their
  ball to steal it. Dominate to win a penalty, or a pushover try within 8m of their line. Not pushing at all loses the
  ball, nothing worse.
- **Lineout:** one jumper each in the middle. The hooker dummies, then throws. Press Jump so your jumper is at full
  height when the ball arrives. On their throw, beating their jumper to it is a steal.
- **Duels** fire at last-man moments, and only when you're running at the man. Steer away and none fires. There's
  at most one every 30s, never the same kind twice, 2–4 a half, plus one Last Play bonus after the hooter.

| Duel | When | You | Win |
|---|---|---|---|
| Get Past | You carry at the last defender | Flick the stick: Step Left / Step Right, against his shoulder (he may feint) | Line Break and a burst |
| Key Pass | A two-on-one with a support runner | Pass the moment he commits | A sure pass, and the runner gets the burst |
| Tackle | You're the last defender, front-on | Tackle as he arrives (he may step) | Big Hit: a dominant ruck, then Line Speed |
| Block | Their pressure pass crosses your man | Block on the real release, not the dummy | Intercepted (inner window) or Knocked Down |

A mistimed duel falls back to the odds the open game would have given, so a duel is never a trap. A tap after the
verdict skips the replay.

## Files

- `index.html` is the whole game in one page. GitHub Pages serves it from `main`.
- `tools/` runs the engine headless in Node. `SEED=n` makes a run repeatable. Run the tools after any change to
  speed, tackling, AI, set pieces or duels.
  - **`node tools/duels.mjs`:** 100 asserts. It checks:
    - every duel fires from a staged position, and none fires when you steer away;
    - the world freezes during a close-up;
    - the Step Left / Step Right direction pin;
    - the sure-pass target, and that the Key Pass burst runs upfield;
    - outcomes, fallbacks and the gate;
    - that scrums release at the mark.
  - **`node tools/bot.mjs [n] [half] --duels live|instant|off`:** a scripted average player against the CPU on each
    difficulty, with duel counts and win rates.
  - **`node tools/sim.mjs`:** AI v AI matches, with no duels.
  - **`node tools/setpieces.mjs`:** scrums at different tap speeds and lineouts at different jump timings.

### Measured baseline

Measured 2026-10-12 with `bot.mjs`: 360 matches per row, 4-minute halves, pooled over SEED 11, 12 and 13.

| | Wins, duels off | Wins, duels live | Tries, live (us–them) | Duel win rate |
|---|---|---|---|---|
| Easy | 97% | 99% | 9.1–0.4 | about 84% |
| Normal | 82% | 88% | 5.0–0.7 | about 70% |
| Hard | 46% | 53% | 2.3–1.9 | about 54% |

- **Duels:** about 3.1 a match, freezing about 6s in total.
- **AI v AI (`sim.mjs`):** about 2 tries a match.
- **Set pieces on Normal (`setpieces.mjs`):**
  - Scrums: tapping 4 a second keeps your put-in about 93% of the time. Tapping 8 a second with a good hit wins a
    penalty about 30% of the time and steals theirs about a third of the time.
  - Lineouts: a perfectly timed jump keeps your throw about 85% of the time and steals theirs about 28%.

## Preview and release

- **Preview:** run `python3 -m http.server 3061` in this folder and open http://localhost:3061/.
- **Release:** push `gordonlindsay/games` to `main`. Pages redeploys in about a minute.
- History: this game started as a claude.ai artifact (https://claude.ai/artifact/TYrVkqhDFLNyxYhTNPq82b), then had its
  own repo, `gordonlindsay/trylinerugby`. Both are frozen; this folder is the source.

## Engine notes

- World units are metres. x runs 0–120 between the dead-ball lines, with try lines at 10 and 110. y runs 0–70 between
  the touchlines. Your team always attacks +x, which is right on screen.
- **Duel camera:** it looks along +x, so screen-right in a duel is world +y. Step Left is world −y, which is screen-up
  back on the pitch. `duels.mjs` pins this.
- **Debug hook:** `window.__tryline` exposes the engine (`simulate`, `newMatch`, `update`, `input`, `scrum`,
  `lineout`, `forceDuel`, `debug`, `M`). `__tryline.forceDuel('past')` stages and starts a duel in the console.
- **Chasers:** defenders who are chasing must pursue at full speed (`pursue: true`). With arrive-style steering they
  slow as they close and can never catch a runner. That bug once made a scripted player score 15+ tries a match.
- **Balance levers:** bursts are the lever for duel balance. Shrinking duel windows barely moves results, because a
  mistime falls back to the open game. `BURST` was halved after measurement.
