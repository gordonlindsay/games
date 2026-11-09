# App Store Connect: Answers

What to enter in App Store Connect for Tryline Rugby Sevens, and why each answer is right for this game. Written on 8 November 2026 against the game at the store-launch branches; Apple changes its forms, so read each question as it stands on the day and check the answer still fits. Where the owner has to decide or fill something in, it says **[OWNER: ...]**.

The owner's decisions this follows (2026-11-08): the Sports category, **not** Apple's Kids category; an age rating of 4+; a free download with one-off unlocks, no subscriptions and no ads; the kids-safe behaviour kept anyway (no ads, no tracking, no third-party analytics, the grown-up check in front of purchases and anything that leaves the app).

And his further answers the same day: the store name **Tryline Rugby Sevens** with the subtitle **Play as and support your club** (his wording of 9 November 2026, "play as and support your club"; it was Play and support your club); **SignCheck Ltd** as the seller, through its existing Apple Developer account; the bundle id **`ai.signcheck.tryline`**; the **App Store only at launch** (iPhone first; Google Play is phase 2); Super Fan at **£3.99**, with **50% of what Apple pays us** for each unlock going to the club; support at **support@signcheck.ai**.

## App Information

| Field | Answer | Why |
|---|---|---|
| Name | Tryline Rugby Sevens | The owner's choice (20 of 30). LISTING.md has a fallback if the name is taken. |
| Subtitle | Play as and support your club | The owner's wording (29 of 30), 9 November 2026. |
| Primary language | English (U.K.) | The copy is UK English. |
| Bundle ID | `ai.signcheck.tryline` | The owner's choice: SignCheck Ltd's domain, signcheck.ai, reversed. It cannot be changed after the first upload, and the build must carry exactly this id: the native project's `appId` in `app/capacitor.config.json` and the bundle identifier in Xcode. The native scaffold was first made with the placeholder `com.gordonlindsay.tryline`; check it says `ai.signcheck.tryline` before the first upload. |
| SKU | TRYLINE1 | Internal only, never shown. Any unique text works. |
| Primary category | Games, with subcategories Sports and Family | See "Category" below. |
| Secondary category | Sports | |
| Content rights | Contains third-party content: Yes | See "Content Rights" below. |
| Age rating | 4+ | See "Age Rating" below. |
| Age Categories and Override | Not Applicable | Not in the Kids category, by the owner's choice. |
| Age Suitability URL | https://gordonlindsay.github.io/games/trylinerugby/support.html#parents | Optional. The For Parents answers. |
| Privacy Policy URL | https://gordonlindsay.github.io/games/trylinerugby/privacy.html | Required. Made from PRIVACY.md. |
| Support URL | https://gordonlindsay.github.io/games/trylinerugby/support.html | Required. |
| Marketing URL | https://gordonlindsay.github.io/games/trylinerugby/ | Optional: the web version. |
| Copyright | 2026 SignCheck Ltd | Shown on the store page. |

**Seller.** The App Store shows the seller and developer from the account the app is made in, not from a field here: SignCheck Ltd's Apple Developer account (an organisation membership), so the store page reads **SignCheck Ltd**. The name under the icon on the home screen is the native project's (`appName`, Xcode's display name), and only about 12 characters show there, so "Tryline" or "Tryline Rugby" fits where the full store name would be cut.

**Guideline 2.3.8.** Apple: 'Use of terms like "For Kids" and "For Children" in app metadata is reserved in the App Store for the Kids Category.' This app is in Games, Sports, not the Kids Category. So the name, subtitle, promotional text, description, keywords, screenshot captions and in-app purchase names may name the **Kids level** as a level, but never say who the app is for by age ("for kids", "for 6 to 10 year olds"). `node tools/listing.mjs` fails Apple copy that does. The one open question is the keyword `kids` (LISTING.md). The same guideline asks that the app name and icon be similar: the game's own title still reads Try Line Rugby (index.html and the Try Line wordmark), close to the store name, though the owner may want the two to match.

### Category

The owner chose Sports. In App Store Connect a game's primary category is **Games**, and Sports is a subcategory of Games: that is how the App Store lists rugby, football and cricket games, and it puts the app in the Sports games charts and searches. Choosing the non-game **Sports** category as the primary one is meant for scores, news and fitness apps, and App Review can move a game out of it. So: primary **Games**, subcategories **Sports** and **Family**, and **Sports** again as the secondary category. Family is optional; it suits a game with a Kids level, without being Apple's Kids category (that is set under Age Categories, not here).

## Age Rating: 4+

Apple works the rating out from the answers. Every answer below is "None" or "No". That gives **4+**, unless the owner answers Cartoon or Fantasy Violence "Infrequent", which makes it **9+**. Guideline 2.3.6 asks for honest answers ("If your app is mis-rated, customers might be surprised by what they get, or it could trigger an inquiry from government regulators"), so Apple's definitions are quoted in full where an answer is close. The reasons are given so the owner can check each against the game.

**In-App Controls**

| Question | Answer | Reason |
|---|---|---|
| Parental Controls | Yes | Apple's definition includes "restrictions on using certain features, such as making purchases". The grown-up check (`parentGate`) stands in front of every purchase, Restore Purchases, Get the App, the privacy and support links and Import. It does not raise the rating: parental controls are allowed at 4+. If Apple's wording on the day reads as settings a parent configures, answer No instead; the rating is the same. |
| Age Assurance | No | The game never checks anyone's age. The grown-up check is a gate, not age assurance (no declared age range, no estimation, no ID). |

**Capabilities**

| Question | Answer | Reason |
|---|---|---|
| Unrestricted Web Access | No | There is no browser or web view anyone can navigate. Import fetches the one club or tournament page pasted in (and at most two pages it links to on the same site), reads team names and a table out of it, and shows none of the page. The privacy and support pages open in the system browser, outside the app, behind the grown-up check. Answering Yes would make the app 16+. |
| User-Generated Content | No | Team names and a player's first name are typed by the player but stay on the device; nothing is shared with, or shown to, anyone else. Apple's definition is "broad distribution of content created by users". The Supporters' Wall (Super Fan only) is not distribution by the app: a grown-up of 18 or over emails us a name from their own email app, and we check it by hand before it goes on our own web page. Nothing anyone types is shown in the app to anyone else. |
| Social Media | No | No feed, likes, comments or sharing. |
| Messaging and Chat | No | No way to contact anyone. The Supporters' Wall opens the grown-up's own email app with a message to us written out; the app itself sends nothing and has no messaging. |
| Advertising | No | No ads of any kind. |

**Mature Themes, Medical or Wellness, Sexuality or Nudity**

| Question | Answer | Reason |
|---|---|---|
| Profanity or Crude Humour | None | |
| Horror/Fear Themes | None | |
| Alcohol, Tobacco or Drug Use or References | None | |
| Medical or Treatment Information | None | |
| Health or Wellness Topics | None | Stamina and training are game abilities, not health advice. |
| Mature or Suggestive Themes | None | |
| Sexual Content or Nudity | None | |
| Graphic Sexual Content and Nudity | None | |

**Violence**

| Question | Answer | Reason |
|---|---|---|
| Cartoon or Fantasy Violence | **None** (owner, 2026-11-08) | Apple's definition in full: "Physical conflict or harm of an exaggerated or fantastical nature that can easily be distinguished from real life. May include: animated magic used to harm animals or animated human wrestling." For None: the tackling is sporting contact within the laws of rugby (a tackle, a ruck, a scrum); there is no blood, no injury shown, no fighting or harm meant, and tackled players get up and play on. For Infrequent: a tackle is physical conflict, and the game exaggerates the hardest ones on purpose. A Big Hit in a match you play gets a banner, a 180ms freeze and a harder screen shake (`ARCADE.hit` in src/arcade.js, src/contact.js), and Apple's own example, animated human wrestling, is a contact sport. None gives 4+; Infrequent makes the app **9+**. The owner's call. |
| Realistic Violence | None | Flat cartoon players; no harm. |
| Prolonged Graphic or Sadistic Realistic Violence | None | |
| Guns or Other Weapons | None | |

**Chance-Based Activities**

| Question | Answer | Reason |
|---|---|---|
| Gambling | No | No real-money betting. |
| Simulated Gambling | None | No betting or wagering of any kind. |
| Contests | None | Apple's definition in full: "Events that allow users to compete with one another for rankings, rewards, or the achievement of personal goals. May include: skill-based competitions, trivia quizzes, or sport or fitness contests". The one place users competed with one another was Two Player, two people head to head on one device with a series score, and it has had no way in since 2026-11-09: the owner took 2 Players off the home, and nothing in the game opens the mode now (its code is kept). What is left is one player against the computer: Quick Match, the championship and the career, with the drills' stars and the Locker's medals as a player's own goals, and no online rankings or leaderboards. If Two Player comes back to the home, answer **Infrequent** again: still **4+** ("Frequent" would make it 13+), but in Brazil, where Apple applies Brazil's own table, Infrequent contests rates **A6** instead of the **AL** that None gives. |
| Loot Boxes | No | The two unlocks are fixed and known before you buy. Nothing is random and nothing is bought with in-game currency. |

Questions added after this was written (two new content descriptors were reported for 16 November 2026, one of them about sharing a person's real-world location): the game shares no location and has no social features, so the answer to anything of that kind is No or None.

## App Privacy: Data Not Collected

In App Store Connect, under App Privacy, answer **"No, we do not collect data from this app"**. The label then reads **Data Not Collected**. Tracking: **No** (there is no App Tracking Transparency prompt, and none is needed).

Apple's rule: data is "collected" when it is sent off the device so that the developer or a third-party partner can get at it for longer than it takes to answer the request. Data handled only on the device is not collected. Why nothing in Tryline Rugby Sevens counts:

- **Saves.** Settings, teams, championship, career (with the optional first name and the player's look), an imported league and the list of unlocks stay in the app's own storage on the device. The native layer copies the save into Capacitor Preferences, which is also on the device. Nothing is uploaded. Like any app's storage, it is part of the phone's own iCloud or computer backup when the user has one: that is the user's backup with Apple, not data sent to us, and privacy.html says so.
- **Purchases.** StoreKit takes the payment. Apple's guidance: "You are not responsible for disclosing data collected by Apple", and payment information entered outside the app, which the developer never sees, "is not collected". The game reads back only which product ids the account owns and keeps that on the device. No receipt is sent to any server of ours or anyone else's; the store adapter talks to StoreKit and nothing else (no RevenueCat or similar service, which would collect purchase history).
- **Super Fan.** Each partner club is its own product (`tryline.fan.<club>`), so Apple's own sales report shows each club's sales. The game sends nothing to count them.
- **Import.** A player pastes a club or tournament link; the app fetches that public page from the device and reads team names out of it. The club's site sees an ordinary web request (the device's IP address and a plain `TryLineRugby` user agent), as it would from any browser. Nothing about the player goes with it, and nothing comes to us. Apple's guidance on IP addresses sent with a request and not kept points the same way; and the site is the one the user chose to read, not a partner of ours.
- **Fonts.** The app has its two typefaces built in (the native work bundles them), so it makes no request to Google Fonts. Check this is still so in the build being submitted: a Google Fonts request from the app would send the device's IP address to a third party on every launch.
- **The Supporters' Wall (Super Fan only).** A grown-up who has Super Fan can ask for a name to go on the club's wall on superfan.html. Behind the grown-up check, they confirm they are 18 or over and type the name as they want it shown; Continue opens their own email app with a message to support@signcheck.ai written out (the name, the club, and their agreement to be listed). The app sends nothing, keeps no name, and the field is emptied when the card closes. The email is sent by the person, from their own email account, outside the app, as any email to support would be; nothing passes from the app to us. Apple's own guidance also makes optional to disclose data collected only in infrequent cases outside the app's main use, that the user chooses to provide in the app's interface with their name shown in the form alongside it, affirmatively, each time: the wall would meet that too. So the label stays **Data Not Collected**. Check the wording of Apple's App Privacy Details page on the day; if it reads otherwise, the answer to change is Contact Info, Name, not linked to tracking, App Functionality. privacy.html sets out what SignCheck Ltd keeps (the name and the club, to publish them) and how to be taken off.
- **No SDKs.** No analytics, crash reporting, ads or attribution SDK. Capacitor's own plugins (Preferences, Haptics, the HTTP used by Import) and the in-app purchase plugin collect nothing. Any SDK added later means answering this again.

## Export Compliance

The app uses encryption only through the operating system: HTTPS for Import's fetch and Apple's own StoreKit. That is exempt. Set `ITSAppUsesNonExemptEncryption` to `false` (NO) in the app's Info.plist, and App Store Connect stops asking for each build. If it asks anyway, the answer is that the app uses only encryption built into Apple's operating system ("None of the algorithms mentioned above" in the current wording), so no documentation is needed.

The Info.plist key belongs to the native project: **[OWNER: confirm it is in ios/App/App/Info.plist before the first upload]**.

## Content Rights

App Store Connect asks whether the app contains, shows or accesses third-party content. Answer **Yes**: it shows real clubs' and nations' names and kit colours, and Import reads third-party web pages. Then it asks whether you have the rights to use it. That is the owner's call to make, not something this document can settle; here is what the game does, so the answer can be an honest one.

- **Professional clubs go by their city** (Toulouse, Sydney, Cape Town and so on), never the club's name or nickname, and with no crest or logo. A city is a place; a club's name is a trademark. The kit colours follow the clubs' own, and all ratings are made up.
- **Nations** appear by country name with a colour, no crest, no union's logo, and no tournament name. "Six Nations" is never used in the game or the listing.
- **Local clubs** (Farnham, Haslemere, Guildford and the rest of the Local list) appear by name with their own kit colours and hoops, no crests. These are real amateur clubs. **[OWNER: decide whether to ask each local club for its permission. A short email and a yes in writing is cheap protection, and a partner club's agreement should include it (see SUPER_FAN.md).]**
- **Quins** (formerly Harlequins) is in the Local list with magenta and light blue. The owner renamed it from the professional club's registered name to the nickname on 2026-11-08; the colours stay. If the professional club objects, rename it by place, as the professional sides are.
- **Grand Slam, Triple Crown and Wooden Spoon** are used as the championship's honours. They are generic sporting terms; they are left out of the store copy anyway.
- **Import** reads public club and tournament pages that the player chooses, keeps only team names, colours and table numbers, and never keeps a person's name or photo.
- **Import and Pitchero's terms (Super Fan only).** Import is part of the paid Super Fan, and its main adapter reads Pitchero club pages (src/import.js). Guideline 5.2.2: an app that uses or monetises a third-party service's content must be permitted to under that service's terms, and Apple may ask for proof. Pitchero's terms of use have not been checked yet (its site could not be reached from where this was written). Before Super Fan goes on sale: read them; if they bar automated access or commercial use, get Pitchero's written permission and keep it ready to upload in App Review, or keep Import to pages the club itself controls. Write the answer here. Without Super Fan at launch Import is not in the app and this can wait.
- **Typefaces**: Big Shoulders Display and Atkinson Hyperlegible, both under the SIL Open Font License, with the licence files shipped next to the fonts.

## In-App Purchases

All are **Non-Consumable**. Create them under Monetisation, In-App Purchases, before the build is submitted. Attach `tryline.full` to the version (Apple reviews it with the version). Attach a club's `tryline.fan.<club>` only when that club has `agreed:true` in the build being submitted: with `agreed:false` the game never offers it, and a reviewer who cannot find an attached purchase rejects the version (guideline 2.1). Each needs a display name, a description, a price, a review screenshot of the unlock card in the game, and review notes.

| Product ID | Reference name | Price | Notes |
|---|---|---|---|
| `tryline.full` | Full Game | £1.99 | Career, Championship and International modes, Create Team, Hard and the Legends sides. |
| `tryline.fan.farnham` | Super Fan Farnham RUFC | £3.99 | Full Game, Add Your Team, the club's colours on the home with the Super Fan badge, and a Super Fan trophy. Farnham RUFC's share is 50%, to be confirmed in writing by the club before launch (LAUNCH_CHECKLIST.md). On sale in the game only once its share is set and `agreed:true` is on its FAN_CLUBS entry, in the build submitted. |
| `tryline.fan.<club>` | Super Fan (club name) | £3.99 | One per partner club, same shape. There is no generic `tryline.fan`. |

The ids are the store builder's (src/store.js, `FAN_CLUBS`, and `trylinerugby/store/README.md`); they must match exactly.

Display names and descriptions (Apple's limits are 30 and 45 characters):

<!-- copy:apple.iap.full.name -->
```text
Full Game
```

<!-- copy:apple.iap.full.description -->
```text
Career, Championship and International modes
```

The owner's wording (44 of 45), 9 November 2026: "play as and support your club" and "career, championship, international modes". Create Team, Hard and the Legends sides are in the Full Game too; they are named on the Unlock card in the game, where there is room (Career · Championship · International · Create Team · Hard · Legends).

<!-- copy:apple.iap.fan.name -->
```text
Super Fan: Farnham RUFC
```

<!-- copy:apple.iap.fan.description -->
```text
Full Game, Add Your Team, for Farnham RUFC.
```

**Family Sharing.** Non-consumables can be shared with a Family Sharing group. Turning it on is kind to families (one unlock for every child's device). It cannot be turned off again for a product once on. For Super Fan it means one sale can unlock several devices, and only the one sale is reported and shared with the club. **On for both products (owner, 2026-11-08).** Set it when each product is created; it cannot be switched off later. The support page tells parents a family member gets the unlocks on their own Apple Account.

**Price of Super Fan.** £3.99, the owner's choice (Full Game stays £1.99). The club's share is 50% of what Apple pays us for each unlock, after its commission and VAT: about £1.41 of £3.99 in the UK under the Small Business Program's 15% commission, about £1.16 at 30% (SUPER_FAN.md has the arithmetic). The game and superfan.html say "of what we receive", so nobody reads it as half the price.

## App Review Information

- Sign-in required: **No**.
- Contact: **[OWNER: the name and phone number App Review should use]**, email support@signcheck.ai.
- Notes, ready to paste. Two versions, as for the description (LISTING.md): **without Super Fan** while no club has `agreed:true` in the build, and **with Super Fan** once one has. `node tools/listing.mjs` says which applies.

Without Super Fan (attach `tryline.full` only):

<!-- copy:apple.review -->
```text
Tryline Rugby Sevens is a rugby sevens game. The whole game runs from files inside the app and plays offline; it downloads no code.

Unlock: Full Game (tryline.full) is a non-consumable in-app purchase. Career, Championship and International modes, Create Team, Hard and the Legends sides (won with medals, played with the Full Game) show a lock, and open an Unlock card. Restore Purchases is in the Grown-Ups panel: Settings, at the bottom of the home screen, then Grown-Ups.

Grown-up check: purchases, Restore Purchases and the privacy and support links first ask a multiplication written out in words, always with a three-figure answer (for example "What is seventeen times six?", 102). Tap the three figures; the answer is checked as the third goes in. Two wrong answers in a row make it wait before the next try.

No ads, no analytics, no accounts, no data collected.
```

With Super Fan (attach `tryline.full` and the agreed club's `tryline.fan.<club>`):

<!-- copy:apple.review.fan -->
```text
Tryline Rugby Sevens is a rugby sevens game. The whole game runs from files inside the app and plays offline; it downloads no code.

Unlocks: Full Game (tryline.full) and Super Fan for a partner club (tryline.fan.<club>) are non-consumable in-app purchases. Locked modes show an Unlock card. Restore Purchases is in the Grown-Ups panel: Settings, at the bottom of the home screen, then Grown-Ups.

Grown-up check: purchases, Restore Purchases, the privacy and support links and Add Your Team first ask a multiplication written out in words, always with a three-figure answer (for example "What is seventeen times six?", 102). Tap the three figures; the answer is checked as the third goes in. Two wrong answers in a row make it wait before the next try.

Add Your Team (part of Super Fan: at the top of the home screen, and on the team screen beside Create Team) reads a club or tournament page you paste in. A public link to try: [OWNER: the partner club's own page, used with the club's consent]. The app fetches only that page and up to two pages it links to on the same site, keeps team names and a table, and keeps nothing about any person.

Supporters' Wall (Super Fan only: the Super Fan tile in the Locker, and the Grown-Ups panel): after the grown-up check, a grown-up who confirms they are 18 or over can type a first name and a town or initial, and Continue opens their own email app with a request to us written out. The app sends nothing and keeps no name. We check each request by hand before the name goes on our Super Fan web page, and take a name off whenever asked.

Super Fan is an ordinary purchase of an unlock. Before purchase the game states the share of what we receive for each Super Fan unlock that goes to the partner club (50% of Apple's proceeds); SignCheck Ltd pays that share to the club under a written agreement.

No ads, no analytics, no accounts, no data collected.
```

Check the notes against the build being submitted, Restore Purchases' place above all: the Grown-Ups panel is the store work's, and its labels may change before launch. `node tools/listing.mjs --launch` asks for the club link only once a club is agreed.

## Version Release

Choose **Manually release this version**, so nothing goes live before the web's `STORE_WEB_TIER` flip, the Get the App links and the support page are ready on the same day.

## Pricing and Availability

- Price: **Free** (Tier 0), with the in-app purchases above.
- Availability: **all countries** (owner, 2026-11-08). Selling in the EU needs the Digital Services Act trader declaration (see LAUNCH_CHECKLIST.md): SignCheck Ltd's address, phone and email are then shown on the EU store pages.

## Screenshots

See SCREENSHOTS.md. The first version is iPhone only (the owner's decision, 2026-11-08), so the one required set is the iPhone 6.9-inch display (`screenshots/ios-6.9/`, 2868x1320). No iPad set is uploaded; the app's device family is iPhone, so App Store Connect does not ask for one.
