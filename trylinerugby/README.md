# Try Line Rugby

Mobile rugby sevens. Top-down 2D, one stick and two buttons, and a five-round championship. Play as one of the six
nations, a local Surrey club, or a team you make yourself.

**Play:** https://gordonlindsay.github.io/games/trylinerugby/

## Decided

- **Sevens**, not fifteens (2026-10-11). Seven a side on a full-size pitch keeps a phone screen readable.
- **2D top-down** for now (2026-10-11). 3D is a later call, once the gameplay is fun.
- **Landscape only** (2026-10-12). Upright play was glitchy. A phone held upright gets a "Turn Your Phone Sideways"
  cover and the match pauses underneath. Phone browsers can't be forced to turn: Android gets a best-effort
  fullscreen and landscape lock on Play, and iPhone ignores it.
- **Duels** (2026-10-12): four chase-cam close-ups. The gold ring means "now", and a win gives a small burst. There's a
  Duels On / Off setting.
- **Dummy** (2026-10-12): in a Key Pass, the small button fakes the pass. It's right when the defender drifts onto
  your runner, and wrong when he comes at you. On Normal and Hard he sometimes fakes the drift.
- **One repo for all the games** (2026-10-12): this game lives in `gordonlindsay/games`, alongside Farnham Fighters
  and The Wedding Crashers, and away from SignCheck.
- **Teams** (2026-10-12): the team screen has an **International | Local** switch.
  - International is the six nations. Local is Farnham, then Haslemere, Guildford, Aldershot, Weybridge, Harlequins
    and Cobham (Gordon's list), then the clubs at two minis festivals on 11 October 2026: Guildfordians, Ironsides
    (Battersea), Kingston, Old Ruts and Wimbledon. The festivals' "Irish" and "OCs" squads are left out, by
    Gordon's choice (2026-10-12).
  - Kit colours are the clubs' own, with hoops where the club plays in them. **Club ratings are made up**: locals
    total 11–14 across the four abilities, and the nations total 13–18.
  - **Create Team:** a name, a three-letter short name for the scoreboard, Plain or Hoops, a shirt and a trim colour,
    and **10 points to spend** on top of 1 in each ability, 5 at most in any one. The total, 14, matches the
    strongest club. You can keep up to four teams. They're saved in the browser and show in both lists.
  - **A championship is your team and five others from the list on screen.** Pick a nation and you get the Six
    Nations. Pick a club, or your own team, and you get five random others from that list. The Triple Crown only
    counts when all four home nations are in it. A championship keeps its own copy of its six teams, so editing or
    deleting a team doesn't change one that's under way.
  - Quick Match: pick yours, then any opponent from either list.
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
| Key Pass | A two-on-one with a support runner | Pass if he comes at you; Dummy if he drifts to your runner | Draw and Pass: a sure pass, and the runner gets the burst. Dummy: you go through the gap with the burst |
| Tackle | You're the last defender, front-on | Tackle as he arrives (he may step) | Big Hit: a dominant ruck, then Line Speed |
| Block | Their pressure pass crosses your man | Block on the real release, not the dummy | Intercepted (inner window) or Knocked Down |

A mistimed duel falls back to the odds the open game would have given, so a duel is never a trap. A tap after the
verdict skips the replay.

## Files

- `index.html` is the whole game in one page. GitHub Pages serves it from `main`.
- `tools/` runs the engine headless in Node. `SEED=n` makes a run repeatable. Run the tools after any change to
  speed, tackling, AI, set pieces or duels.
  - **`node tools/duels.mjs`:** 104 asserts. It checks:
    - every duel fires from a staged position, and none fires when you steer away;
    - the world freezes during a close-up;
    - the Step Left / Step Right direction pin;
    - the sure-pass target, and that the Key Pass burst runs upfield;
    - the three Dummy outcomes;
    - outcomes, fallbacks and the gate;
    - that scrums release at the mark.
  - **`node tools/bot.mjs [n] [half] --duels live|instant|off`:** a scripted average player against the CPU on each
    difficulty, with duel counts and win rates.
  - **`node tools/sim.mjs`:** AI v AI matches, with no duels.
  - **`node tools/teams.mjs`:** 40 asserts. It checks:
    - every pairing of built-in teams has shirts far enough apart, and hooped sides keep their hoops;
    - the nations keep their order, and Farnham leads Local;
    - a team you make is cleaned up and held to the budget;
    - its automatic short name skips codes in use, and two sides never share one on the scoreboard;
    - a black away shirt still shows on the dark scoreboard and plates;
    - opponents are drawn fairly (the old random-comparator sort was badly skewed in Safari);
    - Local and mixed championships, including when the Triple Crown is awarded;
    - that a championship saved before clubs existed still loads.
  - **`node tools/setpieces.mjs`:** scrums at different tap speeds and lineouts at different jump timings.

### Measured baseline

Measured 2026-10-12 with `bot.mjs`: 1,440 matches per row (12 seeds x 120), 4-minute halves, duels with the Dummy and
`BURST` at x1.09 (x1.14 Perfect).

| | Wins, duels off | Wins, duels live | Tries, live (us–them) | Duel win rate |
|---|---|---|---|---|
| Easy | 98.9% | 99.4% | 9.3–0.4 | 82% |
| Normal | 83.5% | 88.3% | 5.2–0.9 | 67% |
| Hard | 48.9% | 53.3% | 2.3–1.9 | 51% |

- **Duels:** about 3.1 a match, freezing about 6s in total.
- **Burst size:**
  - x1.12 (x1.18 Perfect) put Normal at +6.8 win points, over the +6 target.
  - x1.06 (x1.10) was inside every target but barely felt.
  - The middle value sits at +4.9.
  - To try other values without editing the game: `BURST='{ ok:[1.1,2], perfect:[1.15,2.5], knock:[1.06,1.2] }' node tools/bot.mjs`.
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
  `lineout`, `forceDuel`, `debug`, `teams`, `M`). `__tryline.forceDuel('past')` stages and starts a duel in the console.
- **Teams:** `newMatch` takes a team object, or an index into `NATIONS` (the tools use indexes).
  - **`NATIONS` must keep its order.** Championships saved before clubs existed hold indexes into it, and `restore()`
    turns them into a team list in that order.
  - `CLUBS` is append-only.
  - A clash of shirts is settled by `awayKit()`. It tries, in order: the change kit, the colours swapped, then white,
    then black.
- **Chasers:** defenders who are chasing must pursue at full speed (`pursue: true`). With arrive-style steering they
  slow as they close and can never catch a runner. That bug once made a scripted player score 15+ tries a match.
- **Balance levers:** bursts are the lever for duel balance. Shrinking duel windows barely moves results, because a
  mistime falls back to the open game. If windows are ever narrowed, update `INSTANT` to match.
