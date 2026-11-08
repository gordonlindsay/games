# Tryline Rugby Sevens: the iPhone app

This folder wraps the game in `../trylinerugby` as a native app with [Capacitor](https://capacitorjs.com) 8. The game
itself is unchanged: the app carries the same files the website serves, and the few things it does differently inside
the app live in `trylinerugby/src/native.js`.

The App Store comes first. Android and Google Play are **phase 2**, after the iPhone launch: the Android steps below are
kept for then, and the iPhone path never needs them.

| File | What it is |
|---|---|
| `package.json`, `package-lock.json` | Capacitor and its plugins, every version pinned |
| `capacitor.config.json` | App id (`ai.signcheck.tryline`), name, and the web view's settings |
| `scripts/copy-www.mjs` | Copies the game's shipping files into `www/` (never `sw.js`, `src/`, `tools/` or the docs) |
| `scripts/native-config.mjs` | Sets landscape, no status bar, export compliance and the privacy manifest in the native projects |
| `scripts/make-assets.mjs` | Draws `assets/` from `trylinerugby/icons/icon.svg` (run again only if the icon changes) |
| `assets/` | Icon and launch screen sources for `npm run assets` |
| `native/PrivacyInfo.xcprivacy` | Apple's privacy manifest: no tracking, no data collected |

`www/`, `node_modules/` and signing keys are never committed. The `ios/` folder does not exist until step 3, and `android/`
not until phase 2.

## Before the first build

**Settled**

- **Seller: SignCheck Ltd.** The app is published by SignCheck Ltd, which already has an Apple Developer account:
  sign with that existing team (step 4), and App Store Connect shows SignCheck Ltd as the seller.
- **App id: `ai.signcheck.tryline`** (signcheck.ai reversed), in `capacitor.config.json`. It is the Bundle ID in Xcode
  and App Store Connect (and the Play Console's package name in phase 2), and it cannot change once the app is published.
- **Store name: Tryline Rugby Sevens.** The listing's own field in App Store Connect; the name under the icon is below.

**Decisions for the owner**

- **iPhone only** for the first version (the owner's choice, 2026-11-08): `scripts/native-config.mjs` sets the App target to iPhone, so App Store Connect asks for no iPad screenshots. iPad comes later, once the layout scales up.
  To ship iPhone only, set Xcode's Supported Destinations to iPhone (step 4).
- **Name under the icon.** `Tryline Rugby`, the app's name in `capacitor.config.json`, may be cut short under the
  icon on some iPhones (`Tryline Rug...`). `Tryline` alone always fits. To use it, change Display Name in Xcode
  (step 4), and in phase 2 `app_name` in `android/app/src/main/res/values/strings.xml`. The store listing keeps
  Tryline Rugby Sevens.
- **In-app purchase plugin.** `@capgo/native-purchases` 8.9.6 is in `package.json` and the lockfile (StoreKit 2 and Play
  Billing only, no third-party service; the reasons are in `trylinerugby/store/README.md`). Turn on the **In-App Purchase**
  capability in Xcode (section 4).

**Accounts (owner only):** SignCheck Ltd's existing Apple Developer Program membership. A Google Play Console
developer account is needed only for phase 2.

## 1. Install the tools on the Mac (once)

1. **Node.js 22 or later.** From https://nodejs.org (the LTS installer). Check in Terminal: `node -v`.
2. **Xcode.** From the Mac App Store. Open it once and let it install its components. Keep it up to date: Apple only
   accepts uploads built with a recent Xcode.
3. **Android Studio (phase 2).** From https://developer.android.com/studio. Open it once and accept the SDK setup. It brings
   the Android SDK and the Java version Capacitor needs.

## 2. Get the project

```sh
git clone https://github.com/gordonlindsay/games.git
cd games/app
npm ci
```

`npm ci` installs exactly the versions in `package-lock.json`. The first Capacitor command may ask whether to send
anonymous usage data about the build tools to Capacitor's makers. It is about your Mac, never the players; answer
No, or run `npx cap telemetry off`.

## 3. Create the native projects (once)

```sh
npm run www
npx cap add ios
npm run native-config
npm run assets
npx cap sync
```

- `npm run www` copies the game into `www/`. It refuses if `game.js` is stale: run `node tools/build.mjs` in
  `trylinerugby/` first.
- `npx cap add ios` uses Swift Package Manager, so CocoaPods is not needed.
- `npm run native-config` makes the project landscape only, either way up, and hides the status bar from launch,
  answers Apple's export compliance question (the only encryption is the system's HTTPS), and adds the privacy
  manifest to the iOS app. In phase 2 it also sets Android's landscape, turns off Android's cloud backup (so the save
  stays on the phone, as the privacy note says) and removes the advertising ID permission should a library ever add
  it. It prints what it set, skips a platform not added yet, and running it again changes nothing. If it says the Xcode project did not match, drag `ios/App/App/PrivacyInfo.xcprivacy` into the
  App group in Xcode with the App target ticked.
- `npm run assets` makes every iPhone and iPad icon and launch screen size from `assets/`.

Commit the new `ios/` folder. Its own `.gitignore` keeps the copied game out.

## 4. iPhone: run, then TestFlight

```sh
npx cap open ios
```

In Xcode, select the **App** project, then the **App** target:

1. **Signing & Capabilities:** tick Automatically manage signing and choose SignCheck Ltd's team (the existing Apple
   Developer account). Check the Bundle Identifier reads `ai.signcheck.tryline`. Press **+ Capability** and add
   **In-App Purchase**.
2. **General:** set Display Name if you chose a shorter one, and Supported Destinations if you chose iPhone only.
   Version `1.0`, Build `1`.
3. Plug in an iPhone, pick it as the run destination, and press Run. The first time, the phone asks for Developer
   Mode: turn it on in Settings, Privacy & Security, Developer Mode, and let it restart.
4. Check on the phone: it opens sideways, with no status bar; a tackle buzzes; Install Game and Update Game never show;
   a championship survives closing the app from the app switcher; airplane mode still plays.

To upload a build:

1. In App Store Connect, signed in to SignCheck Ltd's account, create the app (My Apps, +, New App): name Tryline
   Rugby Sevens, Bundle ID `ai.signcheck.tryline` (Xcode registers it the first time it signs the app for a phone).
   The answers for the listing, age rating and privacy are in `trylinerugby/store-listing/`.
2. In Xcode, set the run destination to **Any iOS Device (arm64)**, then Product, Archive.
3. When the Organizer opens: Distribute App, App Store Connect, Upload. Keep the defaults.
4. After processing (often 10 to 30 minutes), the build appears in App Store Connect under TestFlight. Add yourself
   and testers under Internal Testing; they install it with Apple's TestFlight app.

Each later upload needs a higher Build number.

## 5. Android (phase 2): run, then internal testing

Not part of the iPhone launch. When phase 2 starts, create the Android project once, then open it:

```sh
npx cap add android
npm run native-config
npm run assets-android
npx cap sync
npx cap open android
```

Commit the new `android/` folder. Then:

1. Let Android Studio finish its Gradle sync (the first one downloads a lot).
2. Plug in an Android phone with USB debugging on (Settings, About phone, tap Build number seven times, then
   Developer options, USB debugging), pick it, and press Run. Check the same things as on the iPhone, and that Back
   pauses a match and closes cards.
3. For Google Play: Build, Generate Signed App Bundle or APK, Android App Bundle. Create an upload key when asked and
   keep the `.jks` file and its passwords somewhere safe outside this repository (`.gitignore` keeps keys out).
4. In the Play Console, create the app, then Testing, Internal testing, Create new release, and upload the `.aab` from
   `android/app/release/`. Let Google manage the app signing key (Play App Signing).

Each later upload needs a higher `versionCode` in `android/app/build.gradle` (and usually a new `versionName`). The Play
Console answers (target audience, Families policy, Data safety) are in `trylinerugby/store-listing/`.

## Every update after that

```sh
cd games && git pull
cd app && npm ci && npm run sync
```

`npm run sync` copies the current game into `www/` and into the native projects. Then raise the build number and
upload as in step 4 (and step 5 once Android is out).

## What the app does differently

All in `trylinerugby/src/native.js` (the landscape and the backup setting in `scripts/native-config.mjs`), and none of
it runs in a browser:

- No service worker, and no Install Game, Update Game or Offline Ready: the app carries its files. How to Play leaves
  out the website's install entry, and its Saving entry speaks of the app rather than a browser.
- Landscape only, either way up, and no status bar (Android's navigation bar hides too, and comes back with a swipe).
  The native projects set the landscape, so the game turns with the phone; nothing locks one side at run time. Matches
  skip the website's fullscreen request.
- Haptics through the phone's own engine, as WKWebView has no vibration: light, medium or heavy by the moment.
- The save (`tryline.v1`) is copied into the app's own storage (Preferences) after every save and put back at start if
  the web view's storage was cleared, which iOS can do when the phone runs short of space. On Android (phase 2) it is
  kept out of Google's cloud backup.
- Android's Back pauses and resumes a match, works each card's and screen's Back, and on the home menu puts the app
  in the background.
- The typefaces come with the game (`trylinerugby/fonts/`, Open Font License), so nothing is fetched from Google, on
  the web or in the app.
- Safe areas: the game's CSS keeps clear of the notch and the home indicator, and Capacitor's SystemBars (in
  `capacitor.config.json`) passes Android's insets through.

`node tools/native.mjs` in `trylinerugby/` checks all of this with a stand-in for Capacitor, and that the web build is
unchanged; `node tools/check.mjs` runs it with the rest.

## If something goes wrong

- `npx cap doctor` reports version mismatches.
- Xcode cannot find packages: File, Packages, Reset Package Caches.
- A change to the game does not show: run `npm run sync` again.
- After changing Capacitor's version in `package.json`, run `npx cap sync`, then `npm run native-config`, and replace
  the fixtures in `trylinerugby/tools/fixtures/native/` (their README says how).
