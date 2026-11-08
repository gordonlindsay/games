# Gameplay checks

Run from `trylinerugby/` with Node. No dependencies need installing.

```sh
node tools/check.mjs
```

The default gate first verifies the generated game bundle matches its source and parses. It then runs the offline shell and installation/update checks, practice, HUD availability, target feedback, input transitions, tutorials, hints, post-match statistics, championship persistence and season review regression checks. Each suite keeps its own fixed default seed. A failed suite produces its full output and the command exits unsuccessfully.

The championship checks cover optional match statistics, legacy and malformed saves, bounded completed-season history, archive deduplication, and the hub, result review and season cabinet. Run these focused checks directly with `node tools/season-data.mjs`, `node tools/season-ui.mjs` and `node tools/season-flow.mjs`. The flow suite uses the current browser bundle and save boundary to check five home/away results, duplicate completion, reload, rendered totals, Start Fresh, partial restores and practice isolation.

The offline checks run directly with `node tools/offline-core.mjs` and `node tools/offline-ui.mjs`. They exercise the generated service worker and client lifecycle with controlled browser API stubs, including failed installs, cache isolation, request bypasses, readiness, and updates deferred until the home menu. These checks do not prove browser installation prompts, platform-specific standalone behaviour, or actual device offline support; those need browser/device checks.

The app checks run directly with `node tools/native.mjs`. They load the game under a stand-in for Capacitor and check what the iOS and Android app does differently (`src/native.js`): no service worker or install buttons, How to Play's app entries in place of the browser's, no orientation lock (the native projects allow landscape either way up), hidden bars, haptics, the save's copy in Preferences and its return, and Android's Back; that none of it runs in a browser; that the typefaces are the game's own files with Google Fonts gone; and that `app/scripts` copies the right files and sets the native projects, Android's backup off included (on Capacitor's own template files in `tools/fixtures/native/`), with SignCheck Ltd's app id `ai.signcheck.tryline`. They do not prove a real device; `app/README.md` lists what to check on one.

For the existing wider gameplay and balance checks:

```sh
node tools/check.mjs --full
```

This also runs contact, duels, goal kicks, movement, passing, teams (the lists, International | National | Local, Men | Women | Minis and old saves' lists) and set pieces. Some of these contain small shared-control regression cases; the dedicated two-player suite is separate.

The Kids rating's calibration, `node tools/kidbots.mjs at` and `settle` (scripted 6, 7 to 8 and 10 year olds; see the Kids section of README.md), runs for minutes and is never part of `check.mjs`. `node tools/kids.mjs`, in the default gate, checks the rating's scale, update rule, save and gating directly.

The two-player suite has six pre-existing failures in Key Pass mirror fixtures, deferred from this single-player work: mirrored duel frame data, identical drawn scene with kits swapped, mirrored drawn-outcome players, mirrored drawn-outcome ball, mirrored sold-outcome players, and mirrored covered-outcome players. It is deliberately opt-in and its failures still cause a failing exit status:

```sh
node tools/check.mjs --two-player
```

Use `--full --two-player` to run both groups. This command does not waive, suppress or repair those known failures.

After changing source, regenerate the bundle with `node tools/build.mjs` before running checks. The generated bundle must be committed with its source for the buildless hosted game.
