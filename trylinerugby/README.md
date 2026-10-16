# Try Line Rugby

Mobile rugby sevens. Top-down 2D, one stick and three buttons, and a five-round championship. Play as one of the six
nations, a local Surrey club, or a team you make yourself.

**Play:** https://gordonlindsay.github.io/games/trylinerugby/

## Decided

- **Sevens**, not fifteens (2026-10-11). Seven a side on a full-size pitch keeps a phone screen readable.
- **2D top-down** for now (2026-10-11). 3D is a later call, once the gameplay is fun.
- **Landscape only** (2026-10-12). Upright play was glitchy. A phone held upright gets a "Turn Your Phone Sideways"
  cover and the match pauses underneath. Phone browsers can't be forced to turn: Android gets a best-effort
  fullscreen and landscape lock on Play, and iPhone ignores it.
- **Duels** (2026-10-12): four chase-cam close-ups. The gold ring means "now", and a win gives a small burst. Always on
  (2026-10-14): the On / Off switch is gone, and a save from when it existed still plays with them on. AI v AI, the
  menu demo and the headless tools can still run without them.
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
  - **Quick Match is the first button** (2026-10-14). It is the gold one, and it takes the keyboard focus.
    Championship sits under it, beside How to Play. With one under way the button reads Continue Championship, and
    the line under it is your team and the round.
- **Saving** (2026-10-14): half length, difficulty, sound, up to four teams you make, and the championship are kept
  in this browser (`localStorage`, key `tryline.v1`). The championship stores its six teams, the five rounds of
  fixtures, every result and the round you are on. Continue Championship resumes the next match. Start Fresh on the
  table, confirmed with a second tap, wipes that championship and leaves your settings and teams. A missing or broken
  save is ignored. A match in progress is not stored mid-play: quitting or reloading leaves that fixture to play
  again, and the table updates when the match finishes.
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
- **Contact** (2026-10-13): a tackle is a commit and a 0.25s bind, not a coin flip at 1.5m. A made tackle is a Big Hit,
  a Wrap or a Soft tackle, the carrier runs down (or is driven back) while the tackler hangs off his hip, a second
  defender can join, and the ruck that follows has the tackler rolling away and retiring. A missed tackler slides off
  the hip, never into the carrier's path, so nobody runs over a man on the ground. Men on the ground are stepped round.
  Offloads, the ball jolted loose, Ankle Taps, Tripped and Fends are in. **Not** in, by Gordon's choice: breakdown
  steals (no jackal, no Steal prompt), new penalties (no Not Releasing, Off Your Feet, Not Rolling Away or High Tackle)
  and sin bins. The ruck stays automatic: a flat turnover roll (base raised to 0.11 so turnovers per match hold as
  rucks fall), the losing side wrong-footed, and today's flat ruck penalty.
- **Sprint** (2026-10-13): a third button, in a fan with B round A. It is a **meter that refills**, used by **holding**:
  it drains while held (2s from full) and refills while not (10s from empty, 7s on Easy). A sprint needs a fifth of
  the meter to start, and letting go stops it at once with a 0.3s ease-out. **Taps buy nothing:** the ease-out is
  charged to the meter at its level, nothing refills while one runs, and a press inside it climbs back from where it
  is instead of snapping to full speed, so every burst-second costs the same whatever the thumb does (the first build
  gave the ease-out away, and a 5Hz tapper won 88% on Normal against 85% holding). Anyone you control sprints: your
  chaser at x1.20 (x1.15 on Hard), your carrier at a lower x1.05 (x1.04 on Hard) that drains 1.5x as fast, so it is a
  burst, not a runaway. The button is dim exactly when a press would do nothing, and a press on a dim button does
  nothing, not even a switch. The CPU runs the same meter and the same burst on every level, choosing its moments by
  level: only for a runner who is clean through.
- **Line break** (2026-10-14): when you are through the defensive line, the last defender comes up onto your inside
  shoulder and tries the tackle, turning the run toward the near touch, instead of holding his depth. Easy brings
  only that last man, and slower, so a step still beats him. Normal and Hard bring the last two. A line that is
  still set keeps its fullback deep, and the men you have already beaten keep chasing.
  Checked with `bot.mjs`, 12 matches a difficulty at SEED 1, 4-minute halves, duels live, against the same run
  before the change. Tries (you–CPU) went 9.3–0.3 → 5.6–0.3 on Easy (still 12 wins from 12), 5.8–1.3 → 3.3–0.6
  on Normal (10 wins → 9) and 1.8–2.3 → 2.1–2.3 on Hard (4 wins → 6). Get Past fires more often, because the
  last man now arrives in that window.
- **Two player, head to head on one computer** (2026-10-16). Gordon's decisions: one computer, Player 2 in pink (`#ff5fd2`),
  Two Player shown only on computers (a fine pointer or a connected controller) and never on phones, each player picking their
  own Difficulty on the join screen, duels always on in two player too, and controllers in one player as well. What is built:
  - **The home.** On a computer the buttons are Quick Match (gold, the focus), then Championship | Two Player, then How to Play
    on a row of its own. A phone keeps Quick Match, then Championship | How to Play: the Two Player button is `desk-only`, so a
    phone never sees it.
  - **The join screen** (Two Player · Players). Player 1 (gold) and Player 2 (pink) side by side, each card badged with its seat
    tag and laid out in four fixed rows so the two always line up: the seat, the device (Keyboard or Controller, with Use Keyboard
    in that row when he is on a pad), a legend, and a Difficulty of his own (remembered in the save as `twoDiff`). The legend is
    the seat's keys: W A S D Run, F Pass, G Kick, H Sprint for the left half; four arrow keycaps (CSS triangles, no glyph), / . ,
    for the right; W A S D, J K L for the lone keyboard seat; the stick, the diamond with its bottom or right dot lit, and a
    shoulder tab for a controller. A keycap or glyph lights while its key or button is held, so a laptop keyboard that can't hold
    both players' keys shows it here. Both start on the keyboard halves, so a keyboard pair has nothing to set up. "Controller ·
    Press Any Button": a pad takes a seat with one press, and the lone keyboard seat then shows the solo map. Swap Players swaps
    the device, the half and the Difficulty with the player. Pick Teams opens the team screen for Player 1 (Player 1 Team, in
    gold), then Player 2 (Player 2 Team, in pink) with Player 1's team in the bar above and Change Team, which Player 1's own
    big action presses from his seat; the International | Local switch and Create Team are there as ever; a mirror match is
    allowed (FAR v FA2); Player 2's pick starts the match. Only the picking player's seat acts on the team screen (`navOnly`);
    the mouse always can. A fresh visit from the home starts from the defaults (halves in order, every pad back to Press Any
    Button).
  - **The match.** The stick and the three buttons are off (they are seat 0's touch controls). The scorebug carries a seat tag at
    each end. Each player's man carries a numbered tag in his colour where the pointer sits in one player, the Sprint meter is
    an arc round his ring (dim exactly when a press would do nothing), and under him a chip reads his key and the word the
    button would (F · Offload, G · Drop Goal, / · Tackle; Long on its own, being a state) only while it matters. Either player
    pauses (P or Escape, or Start on either pad). The penalty card names its player ("Penalty · Player 2") and takes only his
    seat, from his keys as well as his pad (his run keys move the ring, Pass presses, Kick goes back); the Half Time and Full
    Time cards take either seat's keys; the pause card is anyone's, even over the penalty card. A pad unplugged mid-match pauses
    with "Player N · Press Any Button", and the next press of any unclaimed pad takes that seat back (not the first free seat):
    a pad lost on the half-time card, or two lost at once on a shared dongle, come back the same way, in the order they went.
    A pad pressed on the team screen claims nothing. When a release leaves both seats on the keyboard the halves go by seat,
    Player 1 on the left (the other way round after Swap Players).
  - **Close-ups head to head.** Scrums are a pack a side (the shove bar in each player's colour, Early and Good Hit as a tag in
    his colour over his own pack, an Easy pack's shove +0.10), lineouts a jumper a side (the throwing side's reach +0.10 instead
    of one player's +0.06, an Easy jumper's +0.06), goal kicks and drop goals by whoever kicks, from his own slot, each player's
    first kick of the match getting the path aid. A seat tag sits over each pack, each jumper, the two men in a duel and the
    kicker. Each close-up's bottom bar names each player's cue in his colour with his own key: "Player 1 · F · Push", "Player 2 ·
    / · Jump", "Player 2 · Hold / · Kick" (the goal kick is the Pass key), "Player 1 · G · Drop Goal", and in a duel both roles
    (below). Every other player's slot is latched through a close-up he doesn't own and reads live the moment it hands back.
  - **Duels head to head.** The owner is the timer, acting on the ring as ever; the other player is the chooser, who makes the
    choice the CPU draws in one player. The CPU's plan is drawn exactly as in one player and runs unless the chooser moves
    first: his first fresh input before the lock takes over and cancels what is left of the plan, so a chooser who does nothing
    defends exactly as the CPU does (no free win against an idle child). In Get Past he guards a shoulder with his run keys or
    stick (Guard Left · Guard Right, shown with the feint's own animation; at most a feint and back); in Key Pass he holds toward
    the runner to drift onto him, in plain view, or away to rush, and a drift let go before the lock is a fake; in a Tackle he is
    the carrier and makes one step (Step Left · Step Right, which moves the contact and the ring 0.10s later with the approach
    easing to the new pace, as the AI's step does); in a Block he is the passer and presses Kick for a Dummy before the pump,
    which plays the release sound once, at the real release. The lock is `DUEL_LOCK` at the timer's level before the plain
    window (0.40 Easy, 0.32 Normal, 0.24 Hard; the pump at 0.75s for a Block), so a child timer gets longer to read a late
    switch; a plan event due after the lock shows at the lock. A key or stick held into the cut-in is never a choice; a push in
    the first 0.30s counts. Each owner has his own quota (2 a half at 4-minute halves), his own "never the same kind twice
    running", his own first-duel and two-fails aids; the 30s gap and the Last Play bonus are shared. The chooser's ring moves
    to the man in the close-up and stays on him. The ring is in the owner's colour.
  - **Full Time.** "Player 1 Wins · Tries 3 – 2" (the player, not the team: a mirror match has two Farnhams), the seat tags on
    the score row, Rematch (the same teams and levels), then Change Teams (back to Player 1's pick) | Back to Menu, with a
    Series line ("Series 2 – 1 · 1 Draw", Player 1's wins first) kept across rematches and team changes and ended by Back to
    Menu or Quit Match.
  - **The input layer.** One input slot a seat (`inputs[0]`, `inputs[1]`; `input` is still slot 0). Touch feeds slot 0. The
    keyboard is routed by `e.code`: one player keeps the solo map (WASD or arrows, J K L, Space and Shift, P or Escape); two
    seats on one keyboard take a half each, Player 1 on W A S D with F (Pass) G (Kick) H (Sprint), Player 2 on the arrows
    with / (Pass) . (Kick) , (Sprint), or Numpad 1 2 3. A controller claims a seat with any press on the menus; the lone
    keyboard seat then keeps the solo map. Buttons are a bitmask of the sources holding them, so an idle pad never lets go of
    a key you are holding. Controllers: mapped by position (bottom button Pass, right button Kick, any shoulder or trigger
    Sprint with hysteresis, Start pauses, d-pad as keys with a radial 0.20 dead zone on the stick), polled once a frame,
    nothing running until the first `gamepadconnected`. A pad drives the menus and cards with a chalk ring on the current
    button; the real DOM focus never moves. The last device used puts a keycap or a pad glyph in each button's corner on a
    computer; phones see nothing new. Unplugging a pad that was used this match pauses it. A button let go on a card (the
    pause, penalty or half-time card) is released on the slot, so Sprint or a d-pad run can't carry on by itself after it.
    `body.desk` follows the pointer or the pads connected right now, so a phone that had a pad goes back to its own layout
    when it is unplugged.
  - **Sides.** `M.side[t]` holds whether a human plays team t, its seat, the man under its ring, its level, its kick charge and
    its Pass press. `isHuman`, `inputOf`, `ctrlOf`, `setCtrl`, `levelOf` read it; `ringed(p)` is the man under a human's
    ring. `newMatch(u, c, { humans:[a, b], levels:[l0, l1] })` seats any mix: `[true, false]` is one player, `[false, true]`
    one player as the away side (the lone human sits in seat 0), `[true, true]` two player. Every user action is per side:
    the pass in hand and the long pass, the kick charge, Sprint on each side's own meter, Switch, Tackle, goal kicks and drop
    goals from the kicker's own slot. Duels run in their owner's frame through `toFrame`/`toWorld` (the kick frame): a team 1
    duel is a team 0 duel mirrored, Step Right is always the owner's right, and the outcomes land at the mirror. The surge
    after a Big Hit goes to the side that made it. A Block can take over a human's pressure pass too.
  - **Roles.** Balance terms are keyed by role, not team number: `cpuSide(t)` plays the CPU terms (cpuSpeed, cpuTackle, the
    intercept and turnover edges, the scrum pack's formula, the CPU jumper, the CPU kicker's spread) at its own level, which
    for a CPU side is the human's it plays against; a human side plays the human terms at the level it picked. Two player has
    no CPU terms at all. The scrum is a pack a side (each human's taps on its own slot, its stick held forward in its own
    direction) and the lineout a jumper a side. In two player an AI tackler reads `TWO.tackle` at the carrier's level (0.72 /
    0.80 / 0.88: the scoring lever) and an AI interceptor `cpuIntercept` at the passer's level, as the CPU does against a human.
    **AI v AI and the menu demo are now fair:** team 0 used to keep the human terms there because `team === 1` was the test for
    the CPU. `sim.mjs` is re-baselined below.
  - Checked by `tools/twoplayer.mjs` (699 asserts on seeds 1, 2 and 11, a paired mirrored-bot symmetry run with the set pieces
    contested and the chooser's hand driven through the real key and stick paths, a lock sweep under `--lock`, and the full gate
    under `--sym 400`); every one-player tool's output is byte-identical to `main` (3f11088) on the spec's golden set, `sim.mjs`
    alone moving, by the fairness change.
- Championship uses Six Nations table rules (4 a win, try bonus at 4+, losing bonus within 7, +3 Grand Slam)
  but not the name, crests or player names. Those are licensed, so a wider release needs a licence or made-up names.

## Controls

| | With the ball | Without it |
|---|---|---|
| Stick | Run. Flick sideways near a tackler to step him | Run |
| Big button | Pass to the ringed teammate. A tap is a normal pass; hold past 0.18s and the ring turns gold for a long pass to the next man out (it throws itself at 0.6s). Tilt to pick a side. Held in a tackle it reads Offload on the press, when a man is within 9m, and pulses. At a goal kick, hold to power and let go in the gold | Tackle: a dive at a carrier within 2.8m, an Ankle Tap from behind, a join on a carrier already held. It is dim when a press would do nothing |
| Small button | Hold to power a kick, release to kick. A tap is a chip. In range it reads Drop Goal: hold it 0.2s for the close-up | Switch to the defender nearest the ball |
| Sprint | Hold for a burst of speed (x1.05 with the ball). The ring is the meter: it drains while you hold (and through the ease-out after you let go) and refills when you let go | Hold to run a man down (x1.20). A press moves the ring to the man best placed to chase if yours is down or over 4m further off. It is dim when a press would do nothing, and then it does nothing |

Keyboard: arrows or WASD, J, K, L (Sprint), P to pause. J tapped is a pass; J held is a long pass. At a goal kick the arrows steer and J is Kick; K held is Drop Goal.

Controller (any computer browser with the Gamepad API): stick or d-pad to run, bottom button Pass, right button Kick, a shoulder or trigger Sprint, Start pauses. Press any button to connect it; it also drives the menus.

Two player on one keyboard: Player 1 W A S D with F G H (Pass, Kick, Sprint), Player 2 the arrows with / . , (or Numpad 1 2 3). A controller takes a seat with one press on the join screen, and the other seat keeps the solo map. The Pass key (F or /) is also Tackle, Push at a scrum, Jump at a lineout and the goal kick (hold it, let go in the gold); it holds for a long pass. The Kick key (G or .) is also Switch, Drop Goal (hold it in range) and Dummy. Sprint (H or ,) is a hold on that side's own meter. P, Escape or Start pauses from either seat. In a duel the other player guards, drifts or steps with his run keys or stick before the ring opens, or presses Kick for a Dummy as the passer. On the menus and cards in two player W A S D and the arrows move the ring, F and / press, G, . and Escape go back; a pad's stick, bottom and right buttons do the same. The join screen's legend lights each key while it is held: a laptop keyboard that can't hold both players' keys at once shows it there, and a second USB keyboard fixes the rollover (the browser can't tell keyboards apart, so nothing needs setting).

Controllers need HTTPS or localhost (the Gamepad API is off on an insecure page), and a pad shows up only after a press. A pad press can't start the sound; any key or click does. Steam's desktop layout can turn a pad into arrow keys and Escape, which would drive Player 2's half and pause the match: turn Steam Input off for the browser.

**Long pass.** Hold Pass. For the first 0.18s it is still the normal pass, to the white ring, and letting go throws that. Past 0.18s the ring turns gold on the next man out — the stick's side, or the side with more support if the stick is level — skipping the nearest teammate, within 32m and not forward. A faint ring marks the man it skips. The Pass button fills while it charges, and reads Long once a second man is there; at 0.6s it throws itself. With no second man it stays a normal pass. The ball loops higher as the pass gets longer, so it can sail over the skipped man's defender. It is a little less accurate and a little more likely to be knocked on, and it can be intercepted near the passer or the receiver, not under the top of the arc. The CPU sends one when its nearest receiver is crowded and the next man is in space. A press in the first 0.12s after a catch is kept and thrown as soon as that gate opens, to the man the ring was on. An offload is still the press itself: it does not wait out the long-pass hold, and a charge already under way is cancelled by the tackle.

Checked with `bot.mjs`, 36 matches a difficulty at SEED 1 and again at SEED 2 (72 matches, 4-minute halves, duels live). Wins were 100% / 84.7% / 55.6% (Easy / Normal / Hard), against 99.0 / 87.8 / 52.0 in the measured table below. The scripted player still taps, so every long pass in that run was the CPU's: about 2.6 / 3.4 / 3.5 a match.

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

Head to head, the other player is the man opposite, the chooser: he guards a shoulder in Get Past (at most a feint and back),
drifts or rushes in a Key Pass (a drift let go before the lock is a fake), makes one step as the carrier in a Tackle, and
dummies as the passer in a Block. The CPU's plan is drawn as in one player and runs until his first fresh input, so a still
hand defends as the CPU does. His hand shows live until the lock, `DUEL_LOCK` before the ring opens by the timer's level (0.40
Easy, 0.32 Normal, 0.24 Hard; the pump at 0.75s in a Block), and is fixed from there. The owner's timing is judged exactly as
against the CPU. The sweep that pins the leads is under Measured baseline.

### Contact

Every number here is in three one-line constants in `index.html`, `CONTACT`, `RUCK` and `SPRINT`, and the harness
overrides them from the environment: `CONTACT='{"bind":0.3}' SPRINT='{"mul":[1.25,1.25,1.2]}' node tools/bot.mjs`.
Arrays are by level (Easy, Normal, Hard). New engine code reads the two-player shims (`isHuman`, `inputOf`, `ctrlOf`,
`levelOf`, `setCtrl`), never `team === 0` or `M.ctrl`, so a second human seat slots in without a rewrite.

- **Commit.** An AI defender commits within 1.5m of the carrier; your ringed man commits automatically within 1.35m
  (0.58 / 0.42 / 0.42 by level) and dives on Tackle within 2.8m (0.66 within 1.7m, 0.50 beyond). The roll is drawn at
  the commit: `tackleChance` as before, x1.10 side-on, x0.75 from behind, x0.65 against a stepping carrier. The first
  man to commit takes the carrier; nobody else rolls while he is bound. A dive from more than 0.3m behind is an
  **Ankle Tap**, a flat 0.55 and always Soft.
- **The tier,** if it sticks: **Big Hit** 0.14, +0.04 a power point, +0.03 front-on with closing speed over 6 m/s,
  +0.08 for a dive within 1.7m, +0.10 for a sprinting tackler, +0.03 for the CPU on Hard (-0.03 on Easy); **Soft**
  0.22, +0.25 from behind, +0.08 against a carrier over 7 m/s, -0.04 a power point; **Wrap** is the rest.
- **The bind** lasts 0.25s. The carrier runs down to nothing (Wrap), falls forward about 1.1m (Soft) or is stopped by
  40% and driven back (Big Hit); the tackler is pulled to 0.7m off his hip on the side he came from, at 12/s of the
  gap, capped at 8 m/s so a dive reads as a lunge. A bound carrier who crosses the line scores. A standing defender
  within 1.3m joins as the **Second Man**: a Wrap becomes a Big Hit 35% of the time, a Soft a Wrap 35%. Your Tackle
  press on a held carrier joins too.
- **Broken tackle:** no bind. The tackler lands 0.5m behind and 0.95m beside the carrier's line (his run, or his
  facing when he is standing still, or the line from the tackler: never on top of him), down 0.5s (0.75s after a
  dive) with a 1.0s cooldown; the carrier stumbles at x0.9 for 0.15s. Every broken tackle shows a 0.2s fend
  (an arm line in the carrier's trim colour). A **Fend** proper, with no stumble and a tag when it is yours, is a tackle
  beaten by a clear margin (roll 0.35 over the odds) with a power edge, or beaten at a sprint. 40% of missed Ankle
  Taps trip the runner (**Tripped**): x0.5 for 0.5s, so a second chaser can finish him.
- **Offload.** Held in a Soft or Wrap, with a receiver level or behind within 9m, A reads Offload and pulses: 0.85
  (Soft) or 0.70 (Wrap), x(1 + 0.05 a handling point over 3). The label, the press and the dashed ring all use one
  receiver (`offloadTarget`): the stick's side within 9m, else the nearest within 9m, so a lit Offload always goes
  somewhere. The pass can't be intercepted by the men in the tackle.
  Half the failures are held (an ordinary ruck); the rest are 55% Knock-On, 45% Loose Ball. The CPU tries one in
  0.10 x (0.6 + 0.2 x (handling - 3)) of its Soft and Wrap binds, never from a Big Hit (about 2 a match; it was 0.30
  and 5.7 a match, and that rate cost a player who never sprints about a point on Normal and four on Hard).
- **The ball jolted loose:** 9% of Big Hits, 2% of Wraps, 1% of Softs, x(1 + 0.15 a handling point under 3). 55%
  Knock-On (a scrum to the tacklers), 45% **Loose Ball**: it pops 2–5 m/s back towards the carrier's own line, for
  anyone.
- **The ruck.** The ball goes 0.4m behind the tackled man, who is down until the ruck ends + 0.15s. The tackler
  rolls to 1.0m beyond and 1.1m aside, down until the ruck ends + 0.25s, then retiring 0.6s more: he can't tackle
  and is never picked as a chaser. A Second Man retires for the same time, and Tackle stays dim for a retiring man
  (a press does nothing). Length: **0.7s** when the attack's first support beats the defence's first man
  (other than the tackler) to the ball by 0.3s, **1.0s** otherwise, **1.5s** after a Big Hit. Then the flat rolls:
  a 4.5% penalty, and a turnover at 0.11 + 0.02 a power point (+ the level's `turnover`), clamped 0.03–0.18. After a
  turnover the losing side within 3m is **wrong-footed**: no tackle for 0.7s and x0.5 speed. Duels and the drop-goal
  smother call `tackle()` with no tier and keep the old body: the 1.05s ruck (1.6s for the duel Big Hit), no
  roll-away, and no new random draw.
- **Collisions** (`collide()`): standing men push apart at 1.25m as before, and team-mates lose the closing part of
  their relative velocity so pairs stop jostling; opponents are not damped (a shadowing defender must not become a
  wall). A standing man is pushed to 0.95m from a man on the ground, or from a man bound in a tackle; the man on the
  ground or in the bind does not move, and the two (or three) men in one bind are left to `bindMove`. A push is at
  most 0.2m a step, so a man who gets up inside a crowd is eased out rather than shoved, and two men on the same
  spot are parted along the touchline axis.
- **Sprint.** One meter a side (`M.spr[t]`): drain 2s full to empty (x1.5 with the ball), refill 7 / 10 / 10s, a
  0.2 floor to start, a hold that runs it dry must be let go before the next (letting go in a ruck counts), a 0.3s
  ease-out on release. The ease-out is charged to the meter at its level and nothing refills while one runs; a press
  inside it climbs back at the same rate rather than snapping to 1, and a meter run dry ends any ease-out at once, so
  taps buy exactly what a hold buys. Your chaser runs at x1.20 (x1.15 on Hard), your carrier at x1.05 (x1.04 on
  Hard); a duel's burst and the surge never stack with it (the bigger one applies). A tackler sprinting at the commit
  (the hold itself, not an ease-out) gets +0.10 Big Hit and his sprint ends when he commits; a duel zeroes every
  sprint and keeps the meters; the meters freeze in every close-up and keep filling through rucks. The button is dim
  exactly when a press would do nothing, judged on the man the press would go to (yours, or the best chaser when
  yours is down or over 4m further off), and a dim press moves nobody. The
  CPU side's policy: chase a runner who is clean through (no CPU man standing ahead of him within 15m of his line)
  from 2.5–12m, level or behind, deciding every 0.25s at 0.10 / 0.12 / 0.20; carry into a clean break at 0 / 0.05 /
  0.30 when the nearest defender ahead is over 6m off, letting go inside 2.5m. About 2 / 2 / 3 CPU sprints a match.
- **What you see.** The tackler bound across the carrier's hips; the carrier leaning into a Soft, upright in a Wrap,
  recoiling from a Big Hit; a white impact ring on a Big Hit, with a 70ms hit-stop and a 3px shake when it is yours
  (no shake under reduced motion); the slide-off and the roll-away smoothed over at most 9 m/s, with a quarter turn;
  a wobble while tripped; the gold trail and two speed streaks on a sprint; and on-pitch tags (Big Hit, Ankle Tap,
  Tripped, Fend, Offload, Loose Ball), at most two at a time, about 27 a match on Normal. Sounds: 'tackle' at the
  bind, 'hit', 'whiff', 'trip', 'whoosh' when a sprint starts, 'tick' when the meter fills.

**Measured** (`bot.mjs`, 4-minute halves, duels live, 12 seeds x 120 matches a cell; `census.mjs`-style census of 60
Normal matches at SEED 9032, the previous game measured on the same seeds with the same bot). "Tackled within" means a
made tackle.

| Per match, Normal | Previous game | Now |
|---|---|---|
| Tackle attempts / made | 250 / 128 (51%) | 184 / 81 (52%) |
| Broken tackles | 123 | 89 |
| Rucks (quick / normal / slow) | 127 | 81 (43 / 22 / 15) |
| Run-overs (the carrier within 0.9m of a man on the ground) | 87.6 | 0.6 |
| Ruck ball tackled within 0.5s of the pick-up | 44.3% | 5.4% |
| Turnover ball tackled within 1s | 66.3% | 15.7% |
| Turnovers / penalties / knock-ons | 9.3 / 6.0 / 6.4 | 9.8 / 4.4 / 9.5 |
| Big Hits (yours / the CPU's) | none | 7.6 / 9.3 |
| Offloads made (yours / the CPU's) of tried | none | 8.6 / 1.9 of 13.5 (1.5 held) |
| Fends (yours / the CPU's), ball jolted loose (Knock-On / Loose Ball) | none | 7.0 / 8.7, 1.3 / 1.1 |
| Ankle Taps made of tried, Tripped | none | 5.5 of 10.0, 1.8 |
| Sprints (yours, seconds; the CPU's) | none | 50 (35s); 2.2 |
| Tags | none | 30 (Offload 8.6, Fend 7.0, Big Hit 5.4, Ankle Tap 5.1, Tripped 1.8, Loose Ball 1.8) |

CPU sprints a match by level: 2.4 / 2.2 / 2.9 (2.1s of sprint on Hard). Big Hits on Hard: 8.4 yours, 11.2 theirs.
Your offloads rose from 6.2 to 8.6 a match once the label and the press picked the same receiver (a fifth of the
bot's presses on a lit Offload had been doing nothing). Win rates with and without Sprint are in Measured baseline
below.

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
    difficulty, with duel counts and win rates, goal-kick rates for both sides (`kicks us 70% (378) them 69% (109)`),
    and three contact lines: tackles, broken, rucks by length, Big Hits by side; turnovers by kind, offloads, fends,
    jolts, Ankle Taps, Tripped; sprints by side with seconds, penalties, knock-ons by kind, and the tags a match. The
    bot holds Sprint to run down a carrier who is clean through and to carry into space, offloads on 40% of cues and
    never presses Pass in a tackle; `HABITS=0` is the old bot exactly (it mashes Pass in a tackle), `NOSPRINT=1`,
    `NOSPRINTBALL=1` and `NODIVE=1` turn single habits off. `GAME=path` runs any tool against another copy of the game.
  - **`node tools/contact.mjs`:** 270 asserts over the contact engine and Sprint, green on seeds 1, 2, 3, 5, 7, 14, 33
    and 99 (every staged bind that must end in a ruck runs with the jolt switched off, so no seed's draw can turn it into
    a scrum). It checks:
    - a sprint that ends in a fall or a bind charges nothing more to the meter, and the push parts standing men 0.4m a
      step (0.2m round a man on the ground or bound), so nobody sinks into anybody;
    - a staged front-on stick: the bind's length, the tackler on the hip, Wrap / Soft / Big Hit speeds, one commit,
      a ruck of its tier, `contactGuard` releasing a bind whose carrier lost the ball, a third man neither rolling
      nor binding, a bound carrier scoring, a pending pass dying;
    - a forced broken tackle: no bind, the carrier's speed, the slide off the hip and the down times, the fend arm
      set at the commit, and a standing carrier (the slide takes his facing, then the line from the tackler, so the
      two never end on one spot);
    - the tier and stick rates against the closed form, 20,000 commits a case: front-on, side-on, from behind, a
      dive, a sprinting tackler, the Ankle Tap, the CPU's Hard edge;
    - the Second Man's reach and his two tier changes against their own levers; `moveAll` collisions: a man on the
      ground, a bound pair (stepped round, not moved, not parted), the 0.2m-a-step cap, an exact overlap parted;
      the roll-away, retiring (the tackler and the Second Man alike), the ruck race (quick / normal / slow), and that
      duel tackles keep the old body with no random draw;
    - wrong-footing after a forced turnover; every timer running out in its stated time give or take a step
      (retiring, with the man a chaser and a sprinter again after it and a ringed Second Man's Tackle dim until
      then; wrong-footed; a stumble; a trip; the Sprint ease-out); your automatic tackle base by level; the Tackle
      press rule, A's dim state, and no second join;
    - the Sprint meter: hold, drain, floor, latch (cleared by a release in any phase), the ease-out charged to the
      meter with no refill while it runs, a re-press climbing back instead of snapping, taps in four patterns buying
      exactly the hold's rate, the multipliers, no stacking with a burst, the ring and the ready / dim states judged
      on the man a press would go to (lit while your man is down if a chaser can be picked, a dim press moving
      nobody), KeyL; the carrier's sprint and drain, control moving the sprint, a duel zeroing it, the meter frozen
      in a scrum and a goal close-up, the hold let go at a close-up's open, its close and `resume()`; the ring moving
      to the best chaser;
    - the CPU's meter on every level (floor, drain, refill, no refill while an ease-out is still running — a tackle that cancels one may refill that step — range, the same burst),
      sparing on Easy, the policy's shape (rates rising by level, clean breaks only) and its gates staged with the
      odds forced to 1 (a man ahead in the lane, 4m of space, letting go inside 2.5m), and the staged 14m / 8m chase;
      staged breakaways (4m back is caught with Sprint, 8m is gone);
    - offloads (one receiver for the label, the press and the ring, whatever the stick says), the ball jolted loose,
      Tripped, fends; a census of 60 bot matches (run-overs, ruck ball hit at once, turnover ball hit at once, the
      last tackler, no steals, no new penalty words, the tag list and count);
    - the words, the three-button layout at 667x375, 932x430 and 932x430 with insets, and a render smoke test
      (nothing non-finite, no drawn man jumping over 0.3m a frame, drawing draws no random number);
    - a staged line break: the fullback commits to the tackle within 2.8 / 2.2 / 2.2s (Easy / Normal / Hard), coming
      from the inside shoulder; Easy with two men still in front chases with the near one and keeps a sweeper;
      Normal commits both of the last two while a man behind chases; a retiring last man does not come up; a set
      line of seven keeps exactly one sweeper.
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
  - **`node tools/twoplayer.mjs [--sym N] [--lock]`:** 699 asserts over the input layer, the sides, the roles, the join screen
    and the match head to head, green on seeds 1, 2 and 11 in about 35s. `--sym N` plays N pairs at 4-minute halves (400 by
    default) and adds the away-side, AI v AI and handicap runs (about 12 minutes); `--lock` runs the lock sweep (about 40s). The
    default symmetry sample is 100 pairs at 2-minute halves. It checks:
    - the keyboard routing (the solo map, the two halves, the lone keyboard seat, preventDefault, repeats, releases, blur,
      the native menu keys in one player, a step from a fresh key in a duel);
    - controllers (edges, the dead zone, trigger hysteresis, an idle pad leaving held keys held, the d-pad as keys and as
      the aim, Start, a mapping-less pad, the stick latched through a cut-in, disconnects in one and two player);
    - the seats (claiming, Use Keyboard, Swap Players, a third pad ignored, a pad on a menu never reaching the slots);
    - the mirror: a team 1 duel (one player as the away side) equals the team 0 duel in the owner's frame to 1e-9 — the
      triggers, the frame data, the camera, the drawing with the kits swapped, and every outcome landing at the mirror;
      the kick-aim cross, the penalty card and the drop zone mirror too;
    - two player: a whole match played by two bots, the pass in hand, the kick charge, a drop goal and a conversion from
      seat 1's slot, Sprint on each side's own meter, a pass and a dive on one step, Switch per seat;
    - the roles: no cpuSpeed or cpuTackle in two player, each side at its own level, the away side's CPU terms on team 0,
      AI v AI fair at every level, a pack a side at the scrum and a jumper a side at the lineout;
    - one player as the away side, played to the end by the bot;
    - the home and the join screen: the desk-only Two Player button in its place and `body.desk` following the pads connected
      now, Title Case labels and no arrow glyph in the markup, both seats on the halves on a fresh visit, each card's legend
      (the keycaps by scheme, arrows as CSS triangles, the pad glyphs, lit from onKey and pollPads) and its fixed rows, a pad
      claiming a seat and the screen following, Swap Players (the Difficulty going with the player), Use Keyboard giving the
      halves by seat, a Difficulty each (saved, and cleaned on load), and the team flow (Player 1 picks first, then Player 2
      with Change Team pressed from Player 1's own seat, a mirror match allowed, the pick starting the match at both levels with
      the touch controls off and the scorebug tags on; Quick Match's screen and a one-player match unchanged);
    - the match head to head: the tags 1 and 2 and the Sprint arcs drawn in each player's colour (and not in one player), the
      arc as the meter, the cue chips reading the key and what the button would (. · Drop Goal, / · Tackle, F · Offload, Long),
      Start on either pad, the pause card naming a lost pad's player, the penalty card naming its player and taking only his
      seat from his keys and his pad (and nothing left on a slot), the pause card over it anyone's, the half-time card taking
      either seat's keys, the close-up cues naming each player's key for scrums, lineouts, a conversion and a drop, and a pad
      seat's cues naming its buttons by position;
    - the duel locks, for both owners: a Get Past push in the grace guarding the side it points at with the feint's animation,
      a feint and back allowed and a third change ignored, the guard fixed at the lock (a step to the open side breaks, into the
      guard is Wrong Way), an idle chooser playing the drawn feint, a Hard timer's later lock, the chooser's run key held into
      the cut making no choice and a fresh key making one; Key Pass's live drift, fake and drift again before the lock (Dummy
      sells a drifter, Pass draws a rusher, a still hand on a plain plan is a rush), a drawn drift and a drawn fake kept for an
      idle chooser, an Easy timer's drift pulled back to its lock; the Tackle's one step moving the contact, the window and the
      end by 0.10s with the approach eased and the camera reframed, a second push ignored, a drawn step at the lock, a held key
      no step; the Block's Dummy pressed in the grace and kept until the pump, the release sounding once at 1.05 (and once at
      0.75 for a plain release), a press after the pump ignored, a drawn dummy kept; the chooser's ring handed to O; the owner's
      stick re-centred through the grace; the cues naming both players' keys; and that one player's duels have no lock;
    - Full Time head to head: Player 1 Wins / Player 2 Wins / Draw with the seat tags (a mirror match named by player), Rematch
      with the same teams and levels, the Series line (wins, draws, counted once a match), Change Teams going back to Player 1's
      pick with the series kept, Back to Menu ending both, and one player's cards unchanged;
    - cards and pads: Sprint and the d-pad let go on the penalty card, A on the half-time and pause cards, released on the slot
      with a fresh edge after (one player and two), a pad lost mid-match claimed back into its own seat by the next press, the
      halves by seat after a release (and as a swap left them), both pads lost at once reseated in order, a pad lost on the
      half-time card back with one press, a pad pressed on the team screen claiming nothing, and a stick held through a duel,
      a drop goal or a CPU conversion reading live the moment the cut hands back;
    - the handicap: an Easy player against a Hard one gets his own windows, lock lead, path aid, refill, shove and reach, the
      AI tacklers at his own rate and interceptors at the passer's level, per-owner quotas (two each a half, never the same kind
      twice running, the bonus shared), the first-duel and two-fails aids per owner with `settings.duelSeen` and `kickSeen`
      untouched, and `M.di` forced to 2 changing nothing a player faces;
    - render smoke at 1024x600, 1280x720, 1440x900 and 1920x1080: open play, a scrum (the cues, the tags over both packs, an
      Early tag in pink, the bar gold to the right and pink to the left inside W·0.38), a lineout, every duel with each side as
      timer (both cues in their colours, the tags over U and O, the live ring in the owner's colour), both conversions and a drop
      goal, with no non-finite number on the canvas; and a phone-sized one-player scrum drawing none of it;
    - isolation: Player 1's conversion ignoring Player 2's slot until the verdict, the timer's and the chooser's other buttons
      doing nothing in a Get Past, each pack pushed from its own keys, Player 2's arrows moving only his man;
    - the paired symmetry run: N pairs of two-bot matches (the set pieces contested, the chooser's hand by keys on one seat and
      the stick on the other, the owner with a 0.25s reaction model, the penalty and half-time cards pressed as a player would),
      each seed played both ways round: Player 1's share of the decided matches and his paired margin, tries, goal-kick
      percentage, duels owned and won, scrum and lineout retention by side, and the frozen duel time against one player's at
      the same half length, plus the mirror match; under `--sym` the away-side comparison (win rate within 5 points, tries
      within 0.3), AI v AI's share over 500 matches (0.45–0.55) and the handicap (Easy beats Hard over 60%, swapped within 8);
    - under `--lock`: the sweep (below), and the shipped `DUEL_LOCK` within 8 points of one player in every cell.
  - **`node tools/teams.mjs`:** 56 asserts. It checks:
    - every pairing of built-in teams has shirts far enough apart, and hooped sides keep their hoops;
    - the nations keep their order, and Farnham leads Local;
    - a team you make is cleaned up and held to the budget;
    - its automatic short name skips codes in use, and two sides never share one on the scoreboard;
    - a black away shirt still shows on the dark scoreboard and plates;
    - opponents are drawn fairly (the old random-comparator sort was badly skewed in Safari);
    - Local and mixed championships, including when the Triple Crown is awarded;
    - that a championship saved before clubs existed still loads;
    - that Quick Match is the gold button, the Duels switch is gone, and a save round-trips the championship, the
      settings and a team you made, with duels forced on. A broken championship, bad settings and unreadable storage
      are dropped without taking the rest with them, and a full storage still starts the championship.
  - **`node tools/setpieces.mjs`:** scrums at different tap speeds and lineouts at different jump timings.

### Measured baseline

Measured 2026-10-13 with `bot.mjs`, after the contact review's fixes (the ease-out charged to the meter, one offload
receiver, the Second Man retiring, bound pairs stepped round) and the retune: 1,440 matches per row (SEED 1–12 x
120), 4-minute halves, duels with the Dummy and `BURST` at x1.09 (x1.14 Perfect). The standard error is about 0.3 /
1.0 / 1.3 points (Easy / Normal / Hard), so a difference between two rows is good to about ±1.4 / ±1.8. The first
row is the bot with its habits (Sprint held with the ball into space and to run down a clean break, offloads on 40%
of cues, no Pass in a tackle), the second the same bot never touching Sprint, the third the old bot exactly
(`HABITS=0`), and the last the previous game (206958f) on the same seeds, so the deltas are like for like.

| | Wins, duels off | Wins, duels live | Tries, live (us–them) | Duel win rate | Goal kicks, live (us / them) |
|---|---|---|---|---|---|
| Easy, with Sprint | 98.6% | 99.0% | 9.3–0.5 | 82% | 83% / 66% |
| Normal, with Sprint | 82.4% | 87.8% | 5.6–1.0 | 67% | 70% / 77% |
| Hard, with Sprint | 47.4% | 52.0% | 2.6–2.0 | 50% | 59% / 78% |
| Easy, no Sprint | 97.2% | 98.4% | 8.6–0.5 | 82% | 83% / 67% |
| Normal, no Sprint | 80.2% | 83.1% | 5.0–1.1 | 67% | 70% / 76% |
| Hard, no Sprint | 40.5% | 45.9% | 2.4–2.3 | 51% | 61% / 78% |
| Easy, old bot | 97.3% | 99.1% | 8.8–0.5 | 81% | 83% / 66% |
| Normal, old bot | 77.9% | 82.7% | 5.1–1.2 | 67% | 70% / 75% |
| Hard, old bot | 40.4% | 46.3% | 2.5–2.4 | 50% | 59% / 79% |
| Easy, previous game | 97.8% | 99.0% | 9.3–0.4 | 83% | 83% / 65% |
| Normal, previous game | 80.6% | 86.3% | 5.1–0.9 | 66% | 70% / 75% |
| Hard, previous game | 44.9% | 47.6% | 2.4–2.0 | 49% | 60% / 78% |

- **With Sprint** (duels live) is 0.0 / +1.5 / +4.4 on the previous game on the same seeds; **no Sprint** is -0.6 /
  -3.2 / -1.7, and the **old bot** +0.1 / -3.6 / -1.3. A second block of seeds (13–24, live) read 87.7 / 54.4 with
  Sprint, 83.1 / 44.2 without and 85.6 / 50.6 for the previous game on Normal / Hard. An independent check on 20
  more seeds (101–120) read the sprint user +1.0 / +1.5 and the non-user -2.0 / -3.0. **Pooled over 5,280 matches a
  cell, the sprint user is +1.4 / +2.9 on the previous game and the non-user -2.4 / -3.6** (Normal / Hard; each about
  ±0.6). The non-user's loss is about the 3-point limit Gordon set; the sprint user's gain on Normal is small, about a
  point and a half, because the contact engine alone costs 2–3 points. Sprint itself is worth about +3.9 on Normal and
  +6.5 on Hard (with against without); it was worth more before the ease-out was charged.
  The table this replaces (the first build, with the free ease-out and the CPU at chase 0.40 and offload 0.30) read
  83.3 / 87.8 (Normal) and 46.9 / 51.0 (Hard) with Sprint and 77.7 / 82.2 and 40.6 / 45.9 without, and the one
  before contact 98.2 / 99.2 (Easy), 81.0 / 84.9 (Normal) and 44.4 / 50.2 (Hard), on other seeds.
- **Levers.** `SPRINT.mulBall` is the with-ball lever: x1.08 gave the sprint user +7 / +10 on Normal / Hard (a
  runaway), x1.04–1.06 about +4 / +5. `SPRINT.cpu.chase` and `cpu.carry` set how often the CPU sprints: a CPU that
  chased every runner past all but its last man (14 sprints a match on Hard) took 9 points off a player who never
  sprints. With the ease-out charged, the three CPU-side edges were each switched off in turn against the no-Sprint
  bot (1,440 matches a cell, the same seeds; noise about ±1.4 on a difference): on Hard the CPU's chase sprint at
  0.40 (4.2 a match) cost that player 4.2 points and the CPU's offloads at 0.30 (5.7 a match) 4.2 more, while on
  Normal nothing moved it beyond the noise (offloads +0.9, Big Hits +0.7, jolts and the turnover base nothing).
  The chase sprint is a tax on the player who does not sprint: halving it to 0.20 gave him +4 on Hard and the sprint
  user +0.8. So three CPU-side levers were trimmed, none of Sprint's own: `SPRINT.cpu.chase[2]` 0.40 → 0.20 (about
  2.8 CPU sprints a match on Hard), `CONTACT.off.cpu` 0.30 → 0.10 (about 2 CPU offloads a match) and
  `CONTACT.dom.front` 0.06 → 0.03 (the front-on bonus mostly fell to the CPU, because the bot runs straight at the
  line; CPU Big Hits on Normal 10.2 → 9.3 a match). The dials left if Gordon wants the non-user closer still:
  `CONTACT.off.cpu` 0 is worth about another point on Normal, `SPRINT.cpu.chase[2]` 0.10 about one on Hard.
- **Why the goal-kick note moved:** before goal kicks the headless bot converted 100% of its kicks, because the old
  modal's timing only ran in `frame()`. It kicks through the live close-up at 83% on Easy, 70% on Normal and 60% on
  Hard, and the CPU kicks at its own rate on every level. The table before goal kicks read 98.9 / 99.4 (Easy),
  83.5 / 88.3 (Normal) and 48.9 / 53.3 (Hard).
- The bot lets go of Kick on the step nearest its planned release. `update` adds a step before it sees the release,
  so a bot that waits for `pt + STEP/2` strikes a full step (17ms) late on average; the first measurement of this table
  was taken that way. Ours are up to 2 points higher than it (Easy unchanged), and the CPU's are slightly lower.
- **Duels:** about 3.1 a match, freezing about 6s in total.
- **Burst size:**
  - x1.12 (x1.18 Perfect) put Normal at +6.8 win points, over the +6 target.
  - x1.06 (x1.10) was inside every target but barely felt.
  - The middle value sits at +4.9.
  - To try other values without editing the game: `BURST='{ ok:[1.1,2], perfect:[1.15,2.5], knock:[1.06,1.2] }' node tools/bot.mjs`.
- **AI v AI (`sim.mjs`):** re-baselined 2026-10-16 after the fairness change (`SEED=1 node tools/sim.mjs`, 24 matches of
  4-minute halves at Normal): about 1 try and 9.3 points a match, 102 tackles, 5.3 offloads (3.1 / 2.2, both sides at the
  CPU's 0.10 rate), 2.8 balls jolted loose, 11.4 turnovers, 1 CPU sprint a match between the two sides (nobody is a human
  to run down). The same seeds on the build before it read 1 try, 8.7 points, 92 tackles, 4.1 offloads, 2.3 jolts: team 0
  used to play the human terms (no cpuSpeed, myTackle, no intercept or turnover edge, a Normal kicker) against a team 1 on
  the CPU terms, so the demo was not a fair match. Now both sides play the CPU terms at the match's level.
- **Two player is fair (`twoplayer.mjs --sym 400`, 2026-10-16):** 400 pairs of two-bot matches at 4-minute halves, Normal v
  Normal, five team pairings each played both ways round (which team is Player 1 swaps within a pair), the set pieces contested
  (`scrumBot` at 6 taps a second, `lineBot` with a 0.10s spread), every duel head to head with the owner on `ownerBot`'s 0.25s
  reaction model and the chooser's hand through the real key path on one seat and the stick on the other, the penalty and
  half-time cards pressed as a player would: Player 1 394 wins, Player 2 378, 28 draws, a 51.0% share with a standard error of
  1.8 points, and a paired margin of −0.8 points a pair (−0.8 standard errors); 24.3 v 24.7 points and 3.37 v 3.48 tries a match
  (6.85 in all); goal kicks 70% v 68%; duels owned 3.49 v 3.54 and won 75% v 76% by the owner; the feeding pack keeps 100% v
  100% of scrums (equal packs: the put-in's 0.08 edge holds) and the throwing side 86% v 86% of lineouts; 13.4s a match frozen in
  duels, against one player's 10.0s at the same half length (the gate is 1.6×). The mirror match (France v France, 200 matches)
  gives Player 1 52.5% (se 3.5). One player as the away side wins 78.3% against the home side's 77.8% over the same 200 seeds
  (2.44 v 2.40 tries), AI v AI gives team 0 48.6% of 500 matches, and an Easy player beats a Hard one 74.0% of the time as
  Player 1 and 80.8% as Player 2 (200 each: the per-player level has teeth from either seat). The whole gate is 702 asserts in
  about 10 minutes. The suite's own run is 100 pairs at 2-minute halves
  (53.3% on seed 11, a paired margin of 0.9 standard errors) plus a 50-match mirror; it has the power to catch a seat bias of a
  few points, not a tenth off one side's tackle rate, which the direct `tackleChance` asserts catch instead.
- **The duel lock (`twoplayer.mjs --lock`, 2026-10-16):** the timer's win rate against a chooser who feints or fakes 30% of the time
  (switching up to 0.1s before the lock, a Tackle step 30%, a Block dummy 15%), the timer with a 0.25 ± 0.05s reaction, 600 duels
  a cell, beside the same timer against the CPU in one player. The shipped leads, `DUEL_LOCK = [0.40, 0.32, 0.24]`, are the
  ones that reproduce one player's rate at each level (every cell within 8 points, pinned by the sweep's asserts):

  | Timer | Duel | One player | Lead 0.15 | 0.24 | 0.32 | 0.40 |
  |---|---|---|---|---|---|---|
  | Easy | Get Past | 84.0% | 77.0 | 81.5 | 83.7 | **84.0** |
  | Easy | Key Pass | 77.0% | 72.7 | 76.0 | 77.3 | **77.3** |
  | Easy | Tackle | 85.3% | 85.3 | 85.3 | 85.3 | **85.3** |
  | Easy | Block | 78.2% | 75.2 | 75.2 | 75.2 | **75.2** |
  | Normal | Get Past | 73.7% | 67.3 | 71.2 | **74.5** | 75.0 |
  | Normal | Key Pass | 66.2% | 60.7 | 65.5 | **66.8** | 66.8 |
  | Normal | Tackle | 73.8% | 73.8 | 73.8 | **73.8** | 73.8 |
  | Normal | Block | 69.5% | 67.5 | 67.5 | **67.5** | 67.5 |
  | Hard | Get Past | 58.5% | 55.2 | **59.0** | 63.2 | 64.2 |
  | Hard | Key Pass | 56.3% | 51.5 | **55.3** | 57.5 | 57.5 |
  | Hard | Tackle | 61.0% | 61.0 | **61.0** | 61.0 | 61.0 |
  | Hard | Block | 58.2% | 55.8 | **55.8** | 55.8 | 55.8 |

  The Tackle rows barely move with the lead (under a point): the chooser's trick step now comes just before the lock, and
  a step at that point changes the timer's odds very little. The Block rows don't move at all, because a Block's lock is
  the 0.75s pump by design. So the Get Past and Key Pass leads carry the level. (Today's `duelBot`, which bites on half the tricks, is
  printed alongside with `LOCK_DUELBOT=1`.)
- **`TWO.tackle` (2026-10-16):** the two-player scoring lever, how hard a side's AI men tackle the other player's carrier, read
  at the carrier's level. Measured with the symmetry bots at 4-minute halves, Normal v Normal, 120 matches a value (the
  default symmetry run's drivers, set pieces contested): a Normal rate of 0.64 (one player's `cpuTackle`) gives 8.2 tries a
  match, 0.72 gives 7.7, 0.80 gives 7.1 and 0.88 gives 6.9, about 0.45 tries per +0.08. Shipped at the spec's provisional
  `[0.72, 0.80, 0.88]` (7.1 tries at Normal, the top of the 5–7 target): the bots score more than people will, since the timer
  bot wins about 80% of head-to-head duels against a chooser who feints 30% of the time, and pushing the AI tackle past
  one player's Hard (0.72) to reach the band would make carrying harsher for a child than one player is. Retune in Phase D
  with real people.
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
- **Duel camera:** it looks along +x of the owner's frame, so screen-right in a duel is frame +y: world +y for a team 0
  owner (Step Left is world −y, screen-up back on the pitch; `duels.mjs` pins this) and world −y for a team 1 owner
  (`twoplayer.mjs` pins the mirror).
- **Debug hook:** `window.__tryline` exposes the engine (`simulate`, `newMatch`, `update`, `input`, `inputs`, `scrum`,
  `lineout`, `forceDuel`, `pollPads`, `onKey`, `keyRoute`, `sides`, `debug`, `teams`, `contact`, `M`).
  `__tryline.forceDuel('past')` stages and starts a duel in the console (`forceDuel('past', 1)` the mirrored one, in a
  match made with `humans:[false, true]`); `__tryline.contact` holds `CONTACT`, `RUCK`, `SPRINT` and the contact and
  Sprint functions the tests drive (`commitTackle`, `resolveContact`, `tackle`, `collide`, `sprintTick`, `cpuSprintWant`,
  `canOffload`, …); `__tryline.sides` the sides helpers; `__tryline.debug.setTwo`, `two`, `twoClaim`, `twoRelease`,
  `twoSwap`, `pads` the seats model; `__tryline.debug.startMatch(u, c, false, { two:true, levels:[0, 2] })` a
  two-player match from the console, `debug.openJoin()` the join screen, `debug.twoSel()` the join selection (`teams`,
  `levels`, `picking`), `debug.series()` the series, `debug.cueOf(t)` a side's chip word, `debug.cutCues(c)` a close-up's cues,
  `debug.navOnly()` the one seat allowed on the top layer.
- **Sides and roles:** `M.side[t]` is the side's table (`human`, `seat`, `ctrl`, `ctrlPrev`, `ctrlT`, `level`, `charging`,
  `charge`, `holdN`, `pass`, `duel`); `M.ctrl`, `M.charging` and the rest are accessors onto side 0 for the tools and the
  console. `M.role[t]` is `'human'` or `'cpu'`; `cpuSide(t)` and `diffOf(t)` (`DIFF[levelOf(t)]`) key every balance term.
  `M.di` and `M.diff` are the match's one level, kept for the tools; new engine code reads `levelOf(t)`. The seats model
  (`two.on`, `two.seats`) lives in the input layer: `openJoin` resets the seats (`resetSeats`) and switches it on so pads can
  claim, `startMatch` keeps it on for a two-player match, and `exitMatch` switches it off. `twoSel` holds the join selection,
  `series` the wins and draws, `navOnly` the one seat allowed to act on the top layer (`navSide` the one button a restricted
  seat may still press: Player 1's Change Team), `two.lost` the seats waiting to claim a pad back, `two.swapped` whether
  Player 1 is on the right half. A duel in a two-player match is set up by `duelHeadToHead` (the CPU's plan drawn as in one
  player and kept, the lock `DUEL_LOCK[levelOf(owner)]` before the plain window, plan events clamped to it) and read by
  `duelOther` every step from the cut-in through `inp.sideX()` (fresh keys, an unlatched stick); `c.lock`, `c.locked`,
  `c.taken`, `c.changes`, `c.stepped`, `c.tkAt`, `c.lean`, `c.dummyPress` and `c.reachT` exist only there, so one player's
  duels are the objects they always were. The other two-player-only constants are `TWO.tackle`, `SCRUM_LEVEL` and
  `LINE_LEVEL`; `M.side[t].duel` carries each owner's quota, last kind, failures and first-duel flag, `M.side[t].kickFirst`
  his first kick. `globalThis.__sfxSpy` and `debug.navLog` are hooks for the tools, like `__ctxSpy`. The byte-identity
  proof (the spec's golden set run against the 3f11088 archive, `golden.sh` / `check.sh`) lives in the repo's `.claude/specs/
  scratch/golden/`, not in `tools/`, because its outputs are 2 MB of fixed runs.
- **Contact and Sprint** live in the tackling block and the Sprint block of `index.html`, with the drawing in
  `drawPlayer` and `drawTags`. A player carries `bind` (the contact he is in), `offside` (retiring), `sprint` and
  `sprinting`, `stumble`, `wf` (wrong-footed), and render-only `drawFrom` (a teleport being smoothed) and `fend`.
  `M.contact` is the bind under way, `M.spr[t]` the Sprint meter a side, `M.tags` and `M.fx` the tags and impact
  rings. `moveAll`'s hold keys (`HOLD_KEYS`, for the drop-goal offer's projection) include the new timers.
- **Teams:** `newMatch` takes a team object, or an index into `NATIONS` (the tools use indexes).
  - **`NATIONS` must keep its order.** Championships saved before clubs existed hold indexes into it, and `restore()`
    turns them into a team list in that order. `restore()` also forces duels on, keeps only settings it understands,
    and drops a championship whose teams, fixtures, results or round don't hold together. `load()` swallows a missing
    key and bad JSON. The key is `tryline.v1`.
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
- **Line break:** `COVER` (by level: how many last men, their speed and acceleration, the inside shade, a small
  goal-side bias) and `commitPoint`. A break is at most `COVER.last` defenders still goal-side of the carrier
  (1 on Easy, 2 on Normal and Hard). Those men pursue an intercept on his inside shoulder and, once they are close
  or level, the man himself, so the path crosses the 1.5m tackle. A man who has drawn level, within 4m behind,
  stays on that commit: flipping him onto the chase lead runs him past the tackle. `assignMarks` posts no 18m
  sweeper during a break. Men behind still chase with `pursue`. A formed line keeps one sweeper 18m deeper at
  0.85 speed, not pursuing. Easy's single last man and lower speed leave the break beatable. Chase-sprint counts
  per match move with how often a break stays clean; the sprint rates themselves are unchanged.
- **Balance levers:** bursts are the lever for duel balance. Shrinking duel windows barely moves results, because a
  mistime falls back to the open game. If windows are ever narrowed, update `INSTANT` to match.
