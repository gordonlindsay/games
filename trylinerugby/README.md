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
  - **Farnham is the default** (2026-10-12). The team screen always opens on Local. Quick Match starts with Farnham
    as your team (Change Team to swap), then any opponent from either list; a team you make there becomes yours
    while Farnham is still the untouched default. Championship has a Play as Farnham button, or pick any card.
- **Goal kicks** (2026-10-12): pitch-level close-up, sevens drop kicks, Normal = CPU parity. Conversions and
  penalty goals cut to a still shot from behind the kicker: steer the arrow, hold Kick, let go in the gold. The CPU's
  kicks play the same shot with a Skip button.
- **Drop goals** (2026-10-13): in range the small button reads **Drop Goal**; a tap is still a chip, a 0.20s hold
  freezes play and cuts to the same shot with the thumb still down, the meter filling while you hold and the nearest
  defenders charging at the lens. The label is only offered when a pure strike would get away, by the same charging
  rule that decides the outcome, run on the hold as it will really play: the kicker's own run on his stick, every
  opponent ahead of him who can reach him, and behind him only a man on his shoulder (within 4m). What the button says
  when you press it is what you get:
  a Drop Goal press opens the close-up at 0.20s whatever moves in the meantime, a Kick press stays a kick. The CPU
  drops through that rule from its own side, in the top-down view, offered on the clock its strike keeps, so a man of
  yours closing on him can charge it down.
- Championship uses Six Nations table rules (4 a win, try bonus at 4+, losing bonus within 7, +3 Grand Slam)
  but not the name, crests or player names. Those are licensed, so a wider release needs a licence or made-up names.

## Controls

| | With the ball | Without it |
|---|---|---|
| Stick | Run. Flick sideways near a tackler to step him | Run |
| Big button | Pass to the ringed teammate. Tilt to pick a side. At a goal kick, hold to power and let go in the gold | Dive tackle |
| Small button | Hold to power a kick, release to kick. A tap is a chip. In range it reads Drop Goal: hold it 0.2s for the close-up | Switch to the defender nearest the ball |

Keyboard: arrows or WASD, J, K, P to pause. At a goal kick the arrows steer and J is Kick; K held is Drop Goal.

### Close-ups

Scrums, lineouts, duels and goal kicks open a close-up: the pitch and the clock freeze while it runs.

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

### Goal kicks

A conversion or a penalty goal cuts to a still, floodlit shot from behind the kicker, at pitch level, with the posts
centre-screen. Every kick at goal is a drop kick, as sevens law requires. The camera never moves; only the arrow does.

- **Aim.** The stick steers a gold arrow on the grass (18°/s at full tilt, clamped to ±30° of the posts' centre). On
  Normal and Hard a dotted chalk line runs on from the arrow to the goal line and ends in a tick, so you can see which
  upright you are pointing at; the arrow starts on the posts' centre and allowing for the wind is the skill. On Easy,
  and on your first kick ever, the arrow starts on the wind-corrected line and the aid is the real flight path, 16
  dots ending in a gold dot where the ball would cross, or a chalk cross where it would land short. While you hold,
  the path follows the live meter: you watch it fall short, clear the bar, then hook left.
- **Power.** Hold **Kick**. The meter beside the ball fills in about a second, chalk below the band, gold inside it,
  coral above. Let go in the gold. Under the band the ball is slower, flies lower and fades right; over it hooks
  left. The band is derived from the flight for this spot, kicker and wind, so it moves up, narrows and fills faster
  with distance. A release under 12% is ignored, a cancelled touch is never a kick, and a finger already down when
  the cut-in ends must lift and press again.
- **Strike.** Two strides, the ball meets the ground on the mark as the boot arrives, a 70ms hit-stop, a thump.
- **Wind.** Drawn once per match (30% at 0–3 mph, 45% at 4–11, 25% at 11–18), turned round at half time, and gusted a
  little for each kick. The coral pennants on the posts stream downwind, and the chip at top-left gives the number;
  under 2 mph it reads Calm and there is no hidden breeze. The wind is a constant push on the ball. It only acts on
  kicks at goal; punts, chips and restarts are unchanged.
- **Verdict.** A grade over the result: Pure Strike, Overcooked, Under-Hit, Wind (it would have scored in still air),
  Off the Post, Off the Bar. The ball is judged against the real uprights and the 3m bar, with the ball's radius: a
  post hit below the bar can't score. The points go on at the crossing. A tap from 0.25s after the verdict skips the
  rest.
- **CPU kicks** play the same shot from behind their kicker, in any interactive match, with a chalk arrow that swings
  to show their aim-off and no meter. The big button reads **Skip**: the result was fixed when the kick was set up, so
  skipping can't change it. Headless runs, AI v AI and the menu demo fly the kick instantly on the top-down pitch.
- **Penalty card:** "34m to the Posts · Wind 9 MPH", or "· Calm". Kick at Goal is disabled when this kicker can't
  reach the bar in this wind, and a kick at goal is taken from at least 10m out.
- **Drop goals.** Carrying the ball 6–40m from their line, within 42m of the posts and 40° of square, with the stick
  not pointed at touch or back, the small button reads **Drop Goal** once the game is sure a pure strike released
  0.1s late would still get away. A tap is still a chip. Hold it 0.20s and play freezes and cuts in with your thumb
  still down: the meter fills while you hold (faster than a placed kick: 0.80s at 12m on Normal, with a band 1.3x
  wider), the stick steers the arrow as you hold, and the nearest three defenders charge from where they stood,
  accelerating to their top speed. Let go and he drops it, striking the half-volley 0.25s later. A charger within
  1.0m before you release is **Smothered** (a tackle and a ruck); within 1.0m before the strike, or a ball that
  passes within 0.9m of him under 2.4m, is **Charged Down** (a loose ball). Otherwise it flies as a placed kick: a
  goal is 3 points and a kickoff, wide or dead is their 22 drop-out, off the woodwork is a loose ball in front of
  the posts, and a drop that falls short cuts out 0.6s after the strike with the ball still live, so both sides
  chase it. One rule (`blockedBy`) decides the offer and the outcome, and one posts rule (`judgeCross`) judges every
  ball that crosses a goal line, ordinary kicks included. The offer runs the game's own step on the whole world
  through the 0.20s hold (the kicker on his stick, the AI's chasers and line as the AI drives them, collisions
  included, everyone put back afterwards, nothing random drawn), judges range and bearing where that leaves him, and
  counts every opponent ahead of him or level who can reach him, and behind him only one inside the shoulder radius
  (`shoulder`, 4m): a man on his shoulder is a charger, a chaser 5m behind at full tilt is not, in the offer and in the
  close-up alike. The hold is counted in steps: the press opens the close-up on the 12th (the ceiling of `hold`/STEP)
  and the offer projects exactly the 11 that run before it. In the close-up the kicker, the ball and the chargers are
  drawn in one list by depth, so a charger closing from behind or beside him goes over him, not under; he is not drawn
  until 2m in front of the lens, fades in over the next 2m, never stands taller than 0.6 of the screen, and one who
  stops the kick lands on the side he came from. The label is
  decided at the press. A Drop Goal press opens the close-up on the 0.20s step whatever moves in the meantime, and
  reads Drop Goal throughout; a Kick press stays a kick. Your first strike at goal, placed or dropped, ends the
  first-kick aids. No kick's hand-back is a turnover: a charged-down drop regathered by either side, a rebound off
  the post or a short drop gathered by the defence are kicked balls, as a punt is. The CPU drops through the same
  offer from its side, judged on the clock its strike keeps (the world projected through his 0.25s wind-up, then a
  strike with your players given 0.30s to react), winds up for 0.25s in the open (a tackle then is a normal
  tackle), is checked against every one of your players where they really stand, and flies in the top-down view
  with no close-up. A man of yours closing on him charges it down: 4% of offered CPU drops when your man sprints at
  him from 2–11m away, with 13 more tackled in the wind-up per 2,760. A tactical kick's charge-down (the 30% roll)
  is unchanged: the defender stays where he stood.

Balance: Normal equals the CPU's own kicking rate (the only rate the old game had measured), Easy is 10 points above
it and Hard 10 below, and sitters under the posts never miss. Measured with `goalkicks.mjs --rates 4000` at each of
SEED 11, 42 and 3 and averaged (12,000 kicks a cell, good to about half a point), kicking 3, the match wind
distribution; you are the headless bot driving the real input path, the CPU is `cpuKickInputs`. Each cell is Easy /
Normal / Hard.

| Spot | You | CPU |
|---|---|---|
| Conversion, in front | 100 / 100 / 100 | 100 / 100 / 100 |
| Conversion, on the 15m line | 80 / 62 / 53 | 56 / 63 / 66 |
| Conversion, touchline | 55 / 41 / 34 | 37 / 44 / 45 |
| Penalty 22m, in front | 89 / 83 / 75 | 76 / 81 / 84 |
| Penalty 30m, 15m off centre | 79 / 64 / 54 | 57 / 65 / 68 |
| Penalty on the 15m line, 30m out | 67 / 54 / 46 | 48 / 56 / 57 |
| Penalty touchline, 22m out | 57 / 44 / 37 | 39 / 46 / 49 |
| Penalty 40m, in front | 76 / 61 / 47 | 54 / 61 / 65 |
| Penalty 45m, 10m off centre | 64 / 50 / 43 | 45 / 51 / 55 |

You are 2.1 points rms from the build spec's bot column and the CPU 1.1 from its. Easy runs about 5 points above the
spec on wide kicks: its band is derived at the preset aim, so the arrow it hands you really does score with a
band-centre release. The levers are all in `KICK` in `index.html`, and
`GKTUNE='{"band":[0.15,0.13,0.10]}' node tools/goalkicks.mjs --rates 2000` tries values without an edit: `band` is
the main dial (±0.01 is about ±3 points at 30m), `bandMin` floors the width on long and wide kicks, `fill` is the
meter speed, `hook` and `push` the curl, `kw` the wind's pull, `cpuSig` and `cpuAim` the CPU.

**Drop goals**, the headless bot through the real path (press, the 0.20s hold, the close-up), kicking 3, pace 3, the
match wind distribution, 2,000 drops a cell at each of SEED 11, 42 and 3 and averaged. Each cell is Easy / Normal /
Hard; the spec's table is in brackets.

| Drop | Made, no charger | Full tilt charger 12m away as the meter starts: made / charged down |
|---|---|---|
| 20m, in front | 87 / 81 / 72 (86 / 79 / 71) | 88/1 · 82/1 · 73/2 |
| 30m, 10m off centre | 70 / 56 / 44 (71 / 56 / 42) | 71/0 · 56/1 · 45/1 |
| 35m, in front | 70 / 54 / 41 (68 / 56 / 39) | 70/0 · 54/3 · 39/8, offered 6% of the time on Hard |

Every no-charger cell is within 2 points of the spec. A charger standing 6m off is never offered. One jogging in
from 10m is offered only on Easy at 30m (80% of the time, and the average bot is charged down on 14% of those), and a
full-tilt charger 12m away at the press only on Easy, plus one time in five on Normal at 30m (a sixth of those
charged): those cells sit on the offer's boundary, where a release 0.1s late is the promise and the bot's late tail
and 4% fumbles land on the wrong side of it. An offered drop released on time got away every time measured: 0 of 23
charged or smothered over 108 bot matches, and 0 of 48 at the standing-charger boundary. The drop levers are
`dropBand`, `dropFill`, `elev.drop`, `rushMul`, `rushAcc`, `block`, `lat`, `reach`, `offerLate` (how late a release
the label still covers), `hold` (the B hold that opens the cut), `shoulder` (how far behind the kick spot a chaser
still counts) and `cpuReact` (the CPU's reaction margin).

**Offers.** The shoulder radius sets how often the label comes on. Measured with the verifier's `press` probe: 36
matches of 120s halves (12 a difficulty, SEED 21), the carrier pressing B on 8% of the steps the label reads Drop
Goal, once with the stick held at the posts and once with the average bot's own stick, every offered drop released on
the band's centre.

| `shoulder` | At the posts: label on / presses a match | Bot's own stick: label on / presses a match | On-time drops stopped |
|---|---|---|---|
| 3m | 4.3 / 3.3 | 1.75 / 1.4 | 2 of 185 (98.9% away) |
| **4m** (shipped) | 3.2 / 2.3 | 0.9 / 0.7 | 0 of 102 (100% away) |
| 6m | 1.4 / 0.7 | 0.14 / 0.1 | 0 of 34 (100% away) |

Counting every chaser within 15m (the build before the radius) the bot saw the label once in seven matches; 4m puts
a carrier running at the posts at two or three a match and the bot at about one, with the man on the shoulder still
a charger.

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
    difficulty, with duel counts and win rates, and goal-kick rates for both sides (`kicks us 70% (378) them 69% (109)`).
  - **`node tools/goalkicks.mjs [--rates N]`:** about 640 asserts (642 at SEED 11; one line counts its retries). It checks:
    - the closed-form flight against a 1ms integration, the judge's fixtures, and the mirror for the CPU's end;
    - that band-centre strikes score, the band is honest at its edges, over hooks left and under fades right;
    - the wind's drift, headwind and tailwind, and that the Easy aid's preset aim scores in any wind;
    - the live close-up end to end in a headless user match, the input guards (a finger already down, a release under
      12%, a cancelled touch, pause and resume), and that no random number is drawn between the release and the verdict;
    - the CPU's watch cut, that Skip gives the same result as watching, the instant path under the menu demo's flags for
      both teams, and that the same inputs through the live cut and the instant path give the same result, score and
      restart (a missed penalty's drop-out included);
    - the rate table above, at N kicks per cell (default 1,200): each cell within the sampling noise of the measured
      table (never under 6 points), each table within 3.5 points rms of the build spec's, and the ordering between
      spots, difficulties and kicking ratings;
    - the wind's range, the half-time turn, the labels and the penalty card;
    - a render smoke test: every spot, every difficulty's aid, both teams and every stage at four phone sizes, and once
      under reduced motion, with no non-finite number reaching the canvas (arguments, dash arrays and property sets)
      and the posts, ball, meter and chip where the spec puts them;
    - the drawn woodwork: 0.5s after a contact the ball is between the uprights and beyond the line on screen exactly
      when the kick scores, and a miss is back in play; the held ball sits at the kicker's hip and does not jump at
      the drop; the flight zoom moves under 0.08 a frame on an in-front conversion; and the verdict banner is clear of
      the ball and the A button at 844x390 and 667x375;
    - drop goals (groups 23–30): the zone and its hysteresis, the B tap v the 0.20s hold through the real input path,
      a release during the cut-in, pause and resume; the charging geometry (12m standing gets away, 6m full tilt is
      Charged Down, no release is Smothered, and the offer agrees with the live outcome at eleven distances); every
      hand-back (3 points and a kickoff, the 22 drop-out, the live `g3d` ball with chasers on it, the loose ball off the
      woodwork, the charger 1.2m in front); the CPU's drop (blocked by your man 2m in front, scoring only through
      `judgeCross`, a wide one their 22, the real AI trigger); the one posts rule on ordinary kicks; the drop-rate table
      above; and a render smoke test of every drop stage with two chargers at three sizes;
    - the press decides (groups 31–35): a Drop Goal press opens the cut on the 0.20s step though the stick went to
      touch or a charger landed 3m off, the label holds through the hold, a Kick press stays a kick, a flick to touch
      costs nothing, and the zone is judged where the hold ends; the offer is the real step (the kicker's run with the
      stick forward or let go, the chaser turning in, every player put back, nothing random), agrees with a late pure
      strike at 18 of 18 offered distances, counts a man on the shoulder and leaves a chaser 5m behind out of the offer
      and the cut alike (the `shoulder` lever); the CPU's offer on its strike's clock (your man standing 5m off is offered and charges
      it down by sprinting; 3m, or 8m sprinting, is not), with nothing random drawn; no hand-back is a turnover and a
      tactical kick's charge-down leaves the defender where he stood; and a drop's strike sets `kickSeen`;
    - one step count and the lens (groups 36–38): the press opens the cut on `holdSteps()` and the offer projects
      exactly the steps before it, bit for bit, at holds of 0.20, 0.205, 0.22 and 0.25s; a charger 10m behind (staged
      with the radius widened) and one beside the kicker are drawn in depth order over him, none until 2m in front of
      the lens, none taller than 0.6H, no NaN on the canvas, and one who smothers or charges down from behind lands
      behind the kicker; and `kickLabel(t)` reads its own seat, with the HUD passing its team;
    - the thumb (group 39): a Drop Goal label still gives a drop if the stick is let go on the press frame or during
      the hold, a chaser who closes into the shoulder radius as the kicker brakes stays out of the cut (the cut judges
      the chargers behind him that the offer judged), and a drop charged down from behind bounces away from the man
      who blocked it.
  - **`node tools/sim.mjs`:** AI v AI matches, with no duels, both sides' goal-kick rates and the CPU's drop goals.
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

Measured 2026-10-12 with `bot.mjs`, after goal kicks: 1,440 matches per row (12 seeds x 120), 4-minute halves, duels
with the Dummy and `BURST` at x1.09 (x1.14 Perfect).

| | Wins, duels off | Wins, duels live | Tries, live (us–them) | Duel win rate | Goal kicks, live (us / them) |
|---|---|---|---|---|---|
| Easy | 98.2% | 99.2% | 9.3–0.3 | 82% | 83% / 65% |
| Normal | 81.0% | 84.9% | 5.3–0.8 | 67% | 69% / 73% |
| Hard | 44.4% | 50.2% | 2.3–1.8 | 52% | 61% / 77% |

- **Why it moved:** before goal kicks the headless bot converted 100% of its kicks, because the old modal's timing only
  ran in `frame()`. It now kicks through the live close-up at 83% on Easy, 69% on Normal and 61% on Hard, and the
  CPU kicks at its own rate on every level, so wins dip by up to five points. It is a correction, not a regression. The
  previous table read 98.9 / 99.4 (Easy), 83.5 / 88.3 (Normal) and 48.9 / 53.3 (Hard) for wins with duels off / live.
- The bot lets go of Kick on the step nearest its planned release. `update` adds a step before it sees the release,
  so a bot that waits for `pt + STEP/2` strikes a full step (17ms) late on average; the first measurement of this table
  was taken that way. Ours are up to 2 points higher than it (Easy unchanged), and the CPU's are slightly lower.
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
- **Goal kicks** run in the kick frame: every kick is computed as if the kicker attacks +x at posts on x = 110, with
  the uprights at y = 32.2 and 37.8; team 1 is mirrored in (`toFrame`), so the CPU shares the code path and left and
  right in a verdict are always the kicker's. The flight is closed form (`posAt`), so it has no integrator and no
  frame-rate dependence, and the result is fixed at the release: a live kick, a skipped CPU kick and the instant
  headless path all give the same crossing. `M.wind` is drawn in `newMatch` and turned at half time; each kick's wind
  is drawn once in `makeGoal`. The close-up's rig is `kickCam`: a still camera `8 + 0.2·D` metres behind the mark at
  2.2m, with the lens solved so the mark sits at 0.80H and the upright tops just under the scoreboard. The drawn ball
  comes from `ballAt` (the trail samples it too): the closed form, then for 0.5s a cosmetic rebound in the kick's own
  axes, so the woodwork reads on screen the way the verdict does. A scoring contact carries on behind the posts (a
  post nudges it in, the bar pops it over); a miss comes back into play, and a post miss away from its upright. The
  flight camera is `kickView`: the zoom starts at the ball's screen apex but at least 0.4s before the crossing, and
  is held continuously to the largest Z that keeps the ball in frame. The verdict banner (`say(…, low)`) sits under
  the crossbar while the ball is up at the posts (`verdictLow`) and up top when it has dropped short.
- **Chasers:** defenders who are chasing must pursue at full speed (`pursue: true`). With arrive-style steering they
  slow as they close and can never catch a runner. That bug once made a scripted player score 15+ tries a match.
- **Balance levers:** bursts are the lever for duel balance. Shrinking duel windows barely moves results, because a
  mistime falls back to the open game. If windows are ever narrowed, update `INSTANT` to match.
