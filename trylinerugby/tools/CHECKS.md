# Gameplay checks

Run from `trylinerugby/` with Node. No dependencies need installing.

```sh
node tools/check.mjs
```

The default gate first verifies the generated game bundle matches its source and parses. It then runs the offline shell and installation/update checks, practice, HUD availability, target feedback, input transitions, tutorials, hints, post-match statistics, championship persistence and season review regression checks. Each suite keeps its own fixed default seed. A failed suite produces its full output and the command exits unsuccessfully.

The championship checks cover optional match statistics, legacy and malformed saves, bounded completed-season history, archive deduplication, and the hub, result review and season cabinet. Run these focused checks directly with `node tools/season-data.mjs`, `node tools/season-ui.mjs` and `node tools/season-flow.mjs`. The flow suite uses the current browser bundle and save boundary to check five home/away results, duplicate completion, reload, rendered totals, Start Fresh, partial restores and practice isolation.

The star traits checks run directly with `node tools/traits.mjs`: the table, who has them (built-in, custom, imported and career sides), each effect on in a match you play and exactly nothing outside one, the call-out (only for a moment the trait decided, seed by seed against the same draw without it) and its throttle, the marker's one hook in `src/render-match.js`, the team cards' line, the career hub's chips, and a fingerprint pinning AI v AI, the demo and a tool's match between star sides to the build before traits (30e13e2). `node tools/traits.mjs --balance` measures what stars are worth in seeded CPU v CPU arcade matches for the README; it runs for minutes and is never part of `check.mjs`.

The offline checks run directly with `node tools/offline-core.mjs` and `node tools/offline-ui.mjs`. They exercise the generated service worker and client lifecycle with controlled browser API stubs, including failed installs, cache isolation, request bypasses, readiness, and updates deferred until the home menu. These checks do not prove browser installation prompts, platform-specific standalone behaviour, or actual device offline support; those need browser/device checks.

The career's club seasons run directly with `node tools/career.mjs`: a rookie at any club (a national league's, a Local one, a team you made on the list it was picked from, an imported club on My League), each list's league at full strength, his country's six on the Men and Women twelves (never a Legends side), the year's phases in order (the league, the international window, the transfer window) with every cup phase skipped when the build has no cups engine, then the European Cup, the World Cup and the Home Nations Tour against a stand-in that keeps to the cups engine's contract (`cupNew`'s options, a result handed over in the fixture's order, `cup` and `cupKO` handed to `startMatch` and the career setting nothing of the cup's on the match, the full-time card told the result is in), then, once the build has the real cups engine, a career cup match end to end (the Golden Try in a level knockout, the cup's line on the full-time card and never table points, a pool match's draw, a cup's medal told once by the engine), the call-up and its country, the Triple Crown and its medal, transfers (the overall's map onto the clubs' band, two or three offers near it, never his own club, from different leagues where the band has them, Stay), trophies, the calibration (a scripted player first called up in year 3 or 4), training, match deeds, the engine's career gate, championship isolation, the save with careers from before club seasons (Minis, Juniors, County, Pro Club and International, a finished Minis, Juniors or County season banked) and the screens (New Player, Pick Your Club, the hub's eyebrow and trophy row, between phases, the transfer window). Career matches at Farnham are now Local's sides at full strength, so `tools/career-life.mjs` and `tools/career-pro.mjs` pin them anew and also keep their earlier pins, played with the Minis' sides put back.

The career's Pro Mode checks run directly with `node tools/career-pro.mjs`: the choice and its save, the ring held on your player, his teammates run by the computer (their carries, offloads and drop goals), the buttons, Call for Ball and its answers (a call lasting one possession), Team Spirit's pull on who gets the ball (an offload only within its 9m range), the Kids rating left alone by a My Player match, set pieces for a back and a forward, two Pro Mode matches to full time with a scripted player, and seeded fingerprints showing non-career matches and Whole Team career matches unchanged.

The career's bars and dilemmas run directly with `node tools/career-life.mjs`: the save, the readers, the dilemma schedule and table, each rule between matches, each effect in a match, a seeded measure of passes to the player at three levels of Team Spirit, two seasons of real matches from Team Spirit 100 (always training, it must fall clearly; always going out with the team, it stays up), the hub with each option name held to one line at 667x375, and fingerprints of everything that must not move (AI v AI, a Quick Match, a championship match, the demo, a drill, and a career match with the bars at rest) pinned from the build before the bars.

The app checks run directly with `node tools/native.mjs`. They load the game under a stand-in for Capacitor and check what the iOS and Android app does differently (`src/native.js`): no service worker or install buttons, How to Play's app entries in place of the browser's, no orientation lock (the native projects allow landscape either way up), hidden bars, haptics, the save's copy in Preferences and its return, and Android's Back; that none of it runs in a browser; that the typefaces are the game's own files with Google Fonts gone; and that `app/scripts` copies the right files and sets the native projects, Android's backup off included (on Capacitor's own template files in `tools/fixtures/native/`), with SignCheck Ltd's app id `ai.signcheck.tryline`. They do not prove a real device; `app/README.md` lists what to check on one.

For the existing wider gameplay and balance checks:

```sh
node tools/check.mjs --full
```

This also runs contact, duels, goal kicks, movement, passing, teams (the lists, Scotland's clubs among them, the ratings' XV order, each category's International twelve on World Rugby's official men's and women's tables, International | National | Local, a nation's championship being its own six on each list, the home screen's demo a men's match, Men | Women | Minis and old saves' lists) and set pieces. Some of these contain small shared-control regression cases; the dedicated two-player suite is separate.

The Kids rating's calibration, `node tools/kidbots.mjs at` and `settle` (scripted 6, 7 to 8 and 10 year olds; see the Kids section of README.md), runs for minutes and is never part of `check.mjs`. `node tools/kids.mjs`, in the default gate, checks the rating's scale, update rule, save and gating directly.

The two-player suite has six pre-existing failures in Key Pass mirror fixtures, deferred from this single-player work: mirrored duel frame data, identical drawn scene with kits swapped, mirrored drawn-outcome players, mirrored drawn-outcome ball, mirrored sold-outcome players, and mirrored covered-outcome players. It is deliberately opt-in and its failures still cause a failing exit status:

```sh
node tools/check.mjs --two-player
```

Use `--full --two-player` to run both groups. This command does not waive, suppress or repair those known failures.

After changing source, regenerate the bundle with `node tools/build.mjs` before running checks. The generated bundle must be committed with its source for the buildless hosted game.
