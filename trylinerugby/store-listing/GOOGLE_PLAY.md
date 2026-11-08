# Google Play Console: Answers

What to enter in Play Console for Try Line Rugby, and why. Written on 8 November 2026. Google's help pages could not be read from the session that wrote this (support.google.com was outside its network), so every answer here is from the game's behaviour and Google's policies as generally published: read each question as it stands on the day, and check the answer still fits. **[OWNER: ...]** marks what the owner fills in or decides.

The owner's decisions this follows (2026-11-08): the target audience **includes children under 13**, so Google Play's **Families policy applies**, and the app is designed for it; a free download with one-off unlocks, no subscriptions and no ads.

## Store Settings

| Field | Answer |
|---|---|
| App or game | Game |
| Category | Sports |
| Tags | Sports, Rugby (if offered), Casual, Offline (choose from Google's list) |
| Contact email | **[OWNER: a support address; it is shown on the store page]** |
| Website | https://gordonlindsay.github.io/games/trylinerugby/ |
| Privacy policy | https://gordonlindsay.github.io/games/trylinerugby/privacy.html |
| Default language | English (United Kingdom), en-GB |
| Package name | **[OWNER: the app id in the native project; it can never change once published]** |

## Store Listing

Copy is in LISTING.md (app name, short description, full description). Graphics:

| Asset | File | Rule |
|---|---|---|
| App icon | the native project's 512x512 icon (from `icons/icon-512.png`) | 512x512 PNG, up to 1 MB. Google shapes and shadows it. |
| Feature graphic | `screenshots/play-feature-graphic.png` | 1024x500, no alpha. Required. |
| Phone screenshots | `screenshots/play-phone/` (8, 1920x1080) | 2 to 8; 16:9 at 1080p or more helps the listing be featured. |
| 7-inch tablet | `screenshots/play-tablet/` (8, 2560x1440) | Optional; the same set works for both tablet sizes. |
| 10-inch tablet | `screenshots/play-tablet/` | Optional. |

## App Content

### Target Audience and Content

| Question | Answer | Why |
|---|---|---|
| Target age groups | 6 to 8, 9 to 12, 13 to 15, 16 to 17, 18 and over | The Kids level is made for 6 to 10 year olds, and the rest of the game is for anyone. **Not** "5 and under": the game asks for reading (the hints, the cues) and the controls are not made for that age. Ticking any group under 13 puts the app under the Families policy, which is the owner's decision. |
| Could the store listing unintentionally appeal to children? | Not asked once a children's age group is ticked | The app does target children. |
| Appeals to children (where asked) | Yes | |

Because the audience includes children and adults, Google treats it as a **mixed audience** app. A mixed audience app that collects data from children needs a neutral age screen; Try Line Rugby collects nothing from anyone, so no age screen is needed. The grown-up check is not an age screen and is not offered as one.

### Families Policy: What Applies and How the App Meets It

| Requirement | How Try Line Rugby meets it |
|---|---|
| Content suitable for children | Cartoon sport. No blood, no injury, no bad language, no scary or sexual content. |
| Ads | None at all. Declare **No** under Ads. No ad SDK is in the app, so the rule that only Families self-certified ad SDKs may serve ads to children does not arise. |
| No identifiers from children or users of unknown age (advertising ID, SIM serial, build serial, BSSID, MAC, SSID, IMEI, IMSI) | The game never reads any of them. **[OWNER: check the built Android app's merged manifest has no `com.google.android.gms.permission.AD_ID` permission and no Google Play services ads, Firebase or analytics library. Play Console's App bundle explorer shows the permissions.]** |
| No precise location from children | The game asks for no location. |
| Permissions kept to what the app needs | Internet (Import's fetch, and the store) and vibration (the haptics). Nothing else: no camera, microphone, contacts, storage or location. **[OWNER: confirm against the built app's permission list.]** |
| SDKs approved for children's apps | None beyond Capacitor's own plugins and the in-app purchase plugin, which talk only to Google Play Billing on the device. No third-party service (so not RevenueCat or similar). |
| Privacy policy that covers children | privacy.html: it says plainly that nothing is collected from anyone, children included, and what stays on the device. |
| Data practices follow children's privacy law (COPPA in the US, the UK GDPR and the ICO's Children's Code, the GDPR) | Nothing is collected, so there is nothing to get consent for, keep secure or delete. The Children's Code's defaults are met by design: no profiling, no location, no nudging towards sharing, no data used for anything. |
| Links out of the app and purchases kept away from children | The grown-up check (`parentGate`) stands in front of every purchase, Restore Purchases, Get the App, the privacy and support pages and Import. |
| In-app purchases are clear and not pushed on children | Two fixed, one-off unlocks, each stated with what it includes before the grown-up check; no timers, no "limited offer", no currency, no random rewards. Purchases by a child's supervised Google account still need the parent's approval in Family Link. |
| No augmented reality, no Speech API recognition, no web view of open web | None of these is in the game. |
| Accurate target audience and listing | The listing describes the game as it is; the screenshots are the game itself. |

**Teacher Approved** is a separate, optional programme Google may pick children's apps for; nothing to apply for.

### Ads

**No, my app does not contain ads.**

### App Access

**All functionality is available without special access.** No login. The paid modes need a purchase: say in the notes that Google's reviewers can unlock with a test card, and that Import needs a club link to read (**[OWNER: a public club page link for testing]**).

### Content Rating (IARC Questionnaire)

Category: **Game**. Answers, with the reason for each:

| Topic | Answer | Reason |
|---|---|---|
| Violence | No | Tackling, rucks and scrums are sporting contact within the laws of the game: no blood, no injuries, nobody harmed, no weapons, no fighting. |
| Fear | No | Nothing frightening. |
| Sexuality | No | |
| Gambling | No | No real or simulated gambling, no betting, no loot boxes or random paid rewards. |
| Language | No | No swearing or crude language. |
| Controlled substances (drugs, alcohol, tobacco) | No | |
| Crude humour | No | |
| Users can interact or exchange content | No | No chat, no sharing, no online play. Two Player is on one computer. |
| Shares the user's current physical location | No | |
| Digital purchases | Yes | Full Game and Super Fan, one-off in-app purchases. |
| Unrestricted internet access (a browser or search) | No | Import reads one pasted page and shows none of it. |
| Randomised paid items | No | |

Expected result, to check against what IARC returns: **PEGI 3, ESRB Everyone, USK 0, ClassInd L (Livre)**, with the interactive element **In-Game Purchases**. If any comes back higher, read the question that caused it before changing an answer: answers must stay true to the game.

### Data Safety

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **No** |

Answering No ends the form; the store page then reads **No data collected** and **No data shared with third parties**. The reasons, against Google's terms:

- **Collection** means data sent off the device. Everything the game keeps (settings, teams, championship, career and its optional first name, an imported league, the list of unlocks) stays on the device. Google says data processed only on the device need not be declared.
- **Purchases** go through Google Play Billing. The game keeps only which products the account owns, on the device, and sends no purchase data anywhere: no server of ours, no third-party purchase service. Google Play's own handling of the payment is Google's, under its policy.
- **Super Fan sales** are counted from Google's per-product earnings reports. The game sends nothing to count them.
- **Import** fetches the page the player chose, from the device. Nothing about the player is sent with it and nothing reaches us; the site gets an ordinary web request, as from a browser.
- **Fonts** are built into the app, so there is no request to Google Fonts. **[OWNER: confirm in the build being submitted.]**
- **No SDKs** that collect anything: no analytics, crash reporting, ads or attribution.

Security practices (encryption in transit, deletion requests) are asked only of apps that collect data, so they do not appear. Any library added later means answering this again.

### Other Declarations

| Declaration | Answer |
|---|---|
| News app | No |
| COVID-19 contact tracing or status | No |
| Government app | No |
| Financial features | No |
| Health | No |
| Data deletion (account deletion URL) | Not asked: the app has no accounts. |
| Advertising ID | No, the app does not use an advertising ID. |

## In-App Products

Under Monetise, Products, **One-time products**. Ids must match the game's (src/store.js and `trylinerugby/store/README.md`).

| Product ID | Name | Price | Notes |
|---|---|---|---|
| `tryline.full` | Full Game | £1.99 | |
| `tryline.fan.farnham` | Super Fan: Farnham RUFC | **[OWNER: price]** | Activate only once the share is set and agreed. |
| `tryline.fan.<club>` | Super Fan: (club name) | **[OWNER: price]** | One per partner club. No generic `tryline.fan`. |

<!-- copy:google.iap.full.name -->
```text
Full Game
```

<!-- copy:google.iap.full.description -->
```text
Championship, Career, Create Team and the Hard level. A one-off unlock.
```

<!-- copy:google.iap.fan.name -->
```text
Super Fan: Farnham RUFC
```

<!-- copy:google.iap.fan.description -->
```text
Everything in Full Game, and Import for your club and its league. Supports Farnham RUFC: the game states the club's share before you buy.
```

A Google Play merchant account (Monetise setup) and a payments profile must be in place before paid products can be made.

## Testing Before Production

See LAUNCH_CHECKLIST.md. In short: an **internal test** track first (up to 100 testers by email, live in minutes). A **personal** developer account made after November 2023 must also run a **closed test with at least 12 testers opted in for 14 days in a row** before it can apply for production. An organisation account does not. **[OWNER: check the current numbers in Play Console when the account is made; Google has changed them before.]**

## Release

- Use **managed publishing**, so the release goes live when the owner says, on the same day as the App Store version and the web's `STORE_WEB_TIER` flip.
- Countries: **[OWNER: all, or the UK first]**. As on the App Store, selling in the EU needs a trader declaration with contact details shown on the store page.
