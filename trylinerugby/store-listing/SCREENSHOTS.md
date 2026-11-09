# Screenshots

Captured from the current build (the game as on 8 November 2026, the store-launch base) with headless Chromium through Playwright, by `node tools/listing-shots.mjs`. Every file is a real moment of the game, staged through the game's own test hooks; nothing is drawn over it. `node tools/listing.mjs` checks every file is present at its exact size, as RGB with no alpha channel (App Store Connect refuses transparency).

> **These need a re-shoot.** The owner's Mac session is reworking the look (the 2.5D camera, Blender-rendered players, the character builder) and the drill tutorials. Once that lands, run `node tools/listing-shots.mjs` again on the merged build, look at every file, and upload the new set. The staging in the tool drives the game through `window.__tryline`; if a moment fails to come up after the rework ("the scene never came up"), its stage function in the tool is the place to adjust.

## Sets

| Folder | Store | Device | Pixels | How it is made |
|---|---|---|---|---|
| `screenshots/ios-6.9/` | App Store | iPhone 6.9-inch display (required) | 2868x1320 landscape | a 956x440 phone viewport at 3x |
| `screenshots/play-phone/` | Google Play (phase 2) | Phone | 1920x1080 | 960x540 at 2x |
| `screenshots/play-tablet/` | Google Play (phase 2) | 7-inch and 10-inch tablet | 2560x1440 | 1280x720 at 2x |
| `screenshots/play-feature-graphic.png` | Google Play (phase 2) | Feature graphic (required) | 1024x500 | `feature-graphic.html`: the home screen's wordmark over the lineout close-up |

App Store Connect scales the 6.9-inch set down for smaller iPhones, so one iPhone set is enough. If a 6.7-inch set is wanted too (2796x1290), add `{ id:'ios-6.7', store:'App Store', label:'iPhone 6.7-inch display', w:932, h:430, dpr:3, px:[2796, 1290] }` to `LISTING_SIZES` in the tool.

## Moments, in Store Order

The first two or three are what most people see in search, so they are play, not menus. The free modes come first. The shots are of the app as a new player gets it, with nothing bought, so the home shows the locks on Championship, Career and Hard, and the one paid screen, Career, comes last with a caption that says it is the Full Game's (guideline 2.3.2: screenshots must make clear what needs an extra purchase).

| File | Moment | What it shows | Caption idea (if captions are added later) |
|---|---|---|---|
| `01-match.png` | Live Match | Open play: your carrier ringed, a Side Step hint, a Marked receiver, Pass, Kick and Sprint | One Stick, Three Buttons |
| `02-fire.png` | On Fire | The On Fire banner as your side lights up | Get On Fire |
| `03-lineout.png` | Set Piece | The lineout close-up, the jumpers lifted, the Jump hint | Win the Lineout |
| `04-goal.png` | Goal Kick | A conversion: wind, the aim arrow, the meter filling | Kick for the Posts |
| `05-drill.png` | Training Ground | The Tackling drill's side-on close-up: Position, Height, Timing, Power, Squeeze | Learn to Tackle |
| `06-teams.png` | Team Picker | Quick Match's Pick Your Team: International, National and Local, Men, Women and Minis, My Team first, and the Local clubs' kits and ratings | Pick Your Team |
| `07-home.png` | Home | The home screen as a new player sees it: the five headlines (Game, Championship, Career, Training Drills, Settings), Quick Match big, My Team and the Locker, and the locks on Championship and Career | Free to Play, Unlock the Full Game |
| `08-career.png` | Career (Full Game) | A player's card and his first year at his club, with the Full Game owned | Full Game: Club Seasons and Call-Ups |

Google Play takes at most 8 per type; the App Store takes up to 10. Upload them in this order.

## Things to Know Before Uploading

- **Club names show.** The team picker, the career card and the scorebug show Farnham, Haslemere, Guildford, Aldershot, Weybridge, Quins, Cobham and Guildfordians: real local clubs by name and colours (APP_STORE.md, Content Rights). If any club objects, re-shoot.
- **The app as a new player gets it.** The shots are staged as the app with nothing bought (tools/listing-shots.mjs), so the home shows its locks and its Grown-Ups button, and the team picker is Quick Match's. Only Career, the last shot, has the Full Game owned. If captions are added, Career's says Full Game. Re-shot on 2026-11-08 after the App Review audit (they were first shot with the Full Game owned, which showed paid modes with no lock). `06-teams.png` was shot again in all three sets when the team screen became International | National | Local with Men | Women | Minis (`node tools/listing-shots.mjs --only ios-6.9,play-phone,play-tablet --moments teams`). `08-career.png` was shot again in all three sets when the career became club seasons (2026-11-08: Farnham · Year 1 in place of Minis · Season 1; `node tools/listing-shots.mjs --moments career`).
- **iPad.** The first version is iPhone only (owner, 2026-11-08), so no iPad set is made. On a 13-inch iPad the game draws small with a lot of empty pitch; scaling the layout up is game work for a later version, and its set (2752x2064 from 1376x1032 at 2x) can be added back to `tools/listing-shots.mjs` then.
- **Sharpness on iPhone.** The game draws its canvas at up to twice the screen's pixels, so on the 3x iPhone set the pitch is upscaled a little while the text stays sharp. The iPad and Play sets are at 2x and fully sharp.
- **No device frames and no captions.** Both are allowed; plain shots are honest and quick to redo. If captions are added, keep them Title Case, short and true to the shot (Apple rejects screenshots that show what the app does not do), and never say who the app is for by age: guideline 2.3.8 keeps "For Kids" and "For Children" for Apple's Kids Category, and this app is in Sports. `node tools/listing.mjs` checks the caption ideas above.

## Re-shooting

From `trylinerugby/`:

```sh
npm i -g playwright && npx playwright install chromium   # once, if Playwright is not installed
node tools/listing-shots.mjs                              # every set and the feature graphic, about 90 seconds
node tools/listing-shots.mjs --only ios-6.9               # one set (ids: ios-6.9, play-phone, play-tablet, play-feature)
node tools/listing-shots.mjs --moments match,fire         # some moments, every set
node tools/listing.mjs                                    # then check them
```

The tool serves the game folder itself on a free local port, starts each shot from a returning player's save (tutorials seen, coach tips off) and a seeded random, so a re-shoot of the same build draws the same scenes.
