# Launch Checklist: Owner-Only Steps

Everything here needs the owner himself: his company's accounts, its money, his signature or his decision. Nothing in it can be done from the code. Roughly in order; start the first three sections first.

The owner's answers this follows (8 November 2026): **SignCheck Ltd** is the seller, through its existing Apple Developer account; the bundle id is **`ai.signcheck.tryline`**; **iPhone first**, so the App Store only at launch and Google Play in phase 2; the store name **Tryline Rugby Sevens**; Full Game £1.99 and Super Fan £3.99; **50% of what Apple pays us** for each Super Fan unlock goes to the club; support at **support@signcheck.ai**.

> Not legal, tax or financial advice. Fees and rules below are as generally published in late 2026; check each on the day.

## 1. Accounts

- [ ] **Apple Developer Program**: use SignCheck Ltd's existing organisation membership. Check it is current (it renews yearly) and that whoever uploads has the Account Holder, Admin or App Manager role. The App Store then shows SignCheck Ltd as the seller.
- [ ] **Bundle id** `ai.signcheck.tryline`: register it under Certificates, Identifiers and Profiles with the In-App Purchase capability. Check the native project says the same (`appId` in `app/capacitor.config.json`, and the bundle identifier in Xcode) before the first upload: it can never change after, and the native scaffold was first made with the placeholder `com.gordonlindsay.tryline`.
- [ ] **Store name**: check "Tryline Rugby Sevens" is free (App Store Connect says when the app record is made). LISTING.md has a fallback.
- [ ] **Google Play developer account (phase 2)**: an organisation account for SignCheck Ltd in Play Console. One-off fee (US$25), identity verification, and the company's D-U-N-S number (the same kind Apple's organisation enrolment asks for). An organisation account does not have the personal account's 12-tester closed test.

## 2. Money, Tax and the Paid Apps Agreement

- [ ] **Apple, Agreements, Tax and Banking** (App Store Connect, Business): check SignCheck Ltd's **Paid Apps agreement** is active, or have the Account Holder accept it. In-app purchases do not work, even in testing, until it is.
- [ ] Apple: SignCheck Ltd's **bank account** (pounds, a UK account) and **tax forms**: a company files the US **W-8BEN-E** (not the W-8BEN, which is for individuals), which claims the treaty rate on US sales. Fill any other form App Store Connect asks for.
- [ ] Apple: apply for the **App Store Small Business Program** (15% commission instead of 30% on up to US$1 million a year), if SignCheck Ltd is not in it already. It is not automatic, and the club's 50% is worked out from what Apple pays, so it moves with the commission.
- [ ] **EU trader status** (the Digital Services Act): SignCheck Ltd selling to the EU is a trader, and a trader's **address, phone and email are shown on the EU store pages**. Either declare, with the company's business contact details, or leave the EU out of the countries at first.
- [ ] **Tax**: talk to SignCheck Ltd's accountant about the app income and about the Super Fan payments to clubs. Apple handles the VAT on sales to buyers in the UK and EU.
- [ ] Google (phase 2): the **payments profile** and **merchant account** in Play Console (Monetise setup), with the company's bank account and tax information.

## 3. Web Addresses and Contact

- [ ] Check **support@signcheck.ai** is a mailbox someone reads. The App Store, the support page, the Super Fan page and the privacy policy all publish it.
- [ ] Fill every remaining **[OWNER: ...]** placeholder (the App Review contact, the Cartoon or Fantasy Violence answer, how often the club is paid, and the rest). Then `node tools/listing.mjs --write` (privacy.html is made from PRIVACY.md) and `node tools/listing.mjs --launch`, which fails while any placeholder is left.
- [ ] Merge the launch work so privacy.html, support.html and superfan.html are live on GitHub Pages, and open each on a phone. These addresses go into App Store Connect:
  - https://gordonlindsay.github.io/games/trylinerugby/privacy.html
  - https://gordonlindsay.github.io/games/trylinerugby/support.html
  - https://gordonlindsay.github.io/games/trylinerugby/superfan.html
- [ ] Decide whether `trylinerugby/store-listing/` should be public. GitHub Pages serves everything in the repository, so these documents, the Super Fan outline included, can be read by anyone with the address while the repository is public.

## 4. Partner Clubs, App Record and Products

- [ ] **Farnham RUFC confirms 50% of proceeds in writing before launch**: 50% of what Apple pays us for each Super Fan unlock, after its commission and VAT (SUPER_FAN.md has the agreement's outline). No written confirmation, no Farnham Super Fan at launch: leave `tryline.fan.farnham` off the version and its share unset in the game.
- [ ] **A club confirms in writing before superfan.html lists it.** The page goes live as soon as the work is merged, long before the app, so it names no partner club until then. Once a club has signed, in one change: `agreed:true` and its share on its `FAN_CLUBS` entry (src/store.js) and its row on superfan.html. `node tools/listing.mjs` checks the two agree, and fails on a row, or the club's name, on superfan.html for a club not marked agreed.
- [ ] **App Store Connect app record**: New App, iOS, Tryline Rugby Sevens, English (U.K.), bundle id `ai.signcheck.tryline`, SKU `TRYLINE1`. Then fill App Information, Age Rating, App Privacy and Pricing from APP_STORE.md.
- [ ] **In-app purchases** (App Store): `tryline.full` at £1.99, and `tryline.fan.farnham` at £3.99 once Farnham RUFC has confirmed. Exact ids, non-consumable.
- [ ] **Family Sharing** for each in-app purchase: decide (it cannot be turned off once on).
- [x] **iPad**: iPhone only for the first version (owner, 2026-11-08). The native project's device family is iPhone; iPad comes later, once the layout scales up.
- [ ] **Screenshots**: after the merge, and again after the Mac session's new graphics, re-shoot (SCREENSHOTS.md) and upload the iPhone 6.9-inch set (iPhone only for now).

## 5. Build and Test on Apple (TestFlight)

- [ ] On the Mac: build the app in Xcode from the native project (its README has the steps), set the signing team to SignCheck Ltd, and check the bundle identifier is `ai.signcheck.tryline` and `ITSAppUsesNonExemptEncryption` is `NO` in Info.plist.
- [ ] Archive and upload to App Store Connect. Wait for processing.
- [ ] **Internal testing** in TestFlight (up to 100 people on the team, no review). Test on a real iPhone:
  - [ ] Every mode, offline (aeroplane mode).
  - [ ] Buy Full Game and a Super Fan with a **Sandbox** tester account (App Store Connect, Users and Access, Sandbox). The grown-up check comes first every time.
  - [ ] Delete the app, reinstall, **Restore Purchases**: both unlocks come back.
  - [ ] Import a real club page (behind the grown-up check, Super Fan only).
  - [ ] The privacy and support links open, behind the grown-up check.
  - [ ] The unlock card's share line reads "Supports Farnham RUFC: 50% of what we receive for every Super Fan unlock goes to the club.", the same words as superfan.html.
  - [ ] Nothing loads from Google Fonts or anywhere else at launch (a proxy such as Charles, or the Mac's network log, shows no request but Import's).
  - [ ] VoiceOver on the grown-up check and the unlock card.
  - [ ] A game controller, if the listing is going to mention them.
- [ ] **External testing** (friends, a club's parents) needs a short Beta App Review first; optional.

## 6. Submit to the App Store

- [ ] Release set to **Manually release this version**, so the owner picks the day.
- [ ] Attach the in-app purchases to the version, add the review notes from APP_STORE.md (with a club link for Import), submit for review. A first review often takes a day or two.
- [ ] **At the App Store launch (owner, 2026-11-08): flip `STORE_WEB_TIER` to `'free'` once `STORE_LINKS.ios` is set.** An Android browser stays fully unlocked until `STORE_LINKS.android` is set (src/store.js), so Android visitors never meet a lock with no app to buy it in.
- [ ] Launch day, in this order:
  1. Release the App Store version.
  2. Put the App Store address into `STORE_LINKS.ios` in src/store.js.
  3. If the web flips now: set `STORE_WEB_TIER` to `'free'` (src/store.js), build, check, merge. The web keeps the free modes and shows Get the App for the rest.
  4. Open the web version on an iPhone: Get the App goes, behind the grown-up check, to the App Store page.

## 7. Google Play (Phase 2, After the App Store Launch)

- [ ] Build the Android App Bundle (`.aab`) from the native project in Android Studio, package name `ai.signcheck.tryline`, signed with **Play App Signing** (Google keeps the release key; keep the upload key safe and backed up).
- [ ] **Play Console app**: Create app, Game, Free, the declarations. Then App Content from GOOGLE_PLAY.md (Target Audience, Ads, Data Safety, Content Rating) and the store listing from LISTING.md.
- [ ] **In-app products**: `tryline.full` at £1.99 and each agreed club's `tryline.fan.<club>` at £3.99, one-time products.
- [ ] **Internal testing** track: upload, add testers by email, install from the Play Store link. The same tests as TestFlight, with **licence testers** (Play Console, Settings, License testing) for purchases.
- [ ] Check the **permissions** in the App bundle explorer: Internet, vibration and `com.android.vending.BILLING` (Play Billing, from the purchase plugin) are expected; nothing else, and no `AD_ID` (GOOGLE_PLAY.md, Families policy).
- [ ] Release with **managed publishing**, then add the Play address to `STORE_LINKS.android`. A new account's first review can take a week or more.

## 8. If Apple Rejects It

Answer in App Store Connect's Resolution Center: calmly, specifically, with what the reviewer can check. Most rejections of a first version are fixed by a reply or a small change, not a rewrite.

- **4.2 Minimum Functionality ("a repackaged website" or "not enough native functionality").** The arguments, all true of this app:
  - It is a **game**, not a website: it runs entirely from files inside the app and plays fully offline in aeroplane mode. Nothing is loaded from a website; the web version exists, but the app does not depend on it.
  - It uses the device natively: **StoreKit** in-app purchases with Restore Purchases, **haptics** through the Taptic Engine, **native storage** that survives the web view's storage being cleared, **native HTTP** for Import, the landscape lock and the safe areas (and game controllers, once tested in the app).
  - It is a complete game with depth: open play with tackling, rucks, scrums, lineouts and goal kicks; a five-round championship; a career from the minis to the international side; eight training drills; a Kids level with its own easing; a team builder.
  - Offer the reviewer a 30-second screen recording of a match, a drill and a purchase if asked.
  - What not to do: argue that other web-view apps were approved.
- **2.5.2 (downloads or runs code it did not ship with).** The app must not use the service worker or update itself from the web (the native work turns both off in the app). If cited, confirm that every file is in the app bundle.
- **3.1.1 (in-app purchase).** Every unlock in the app is bought through Apple's in-app purchase, and Restore Purchases is in the Grown-Ups panel. The web version's Get the App button is on the web only, never in the app.
- **3.2.2 (charitable donations).** If the reviewer reads Super Fan as fundraising: it is the purchase of an unlock (Full Game plus Import and the Super Fan badge), sold through in-app purchase; SignCheck Ltd pays the club a stated share of what Apple pays for those sales (50%) under a commercial agreement. The app never asks for a donation. Offer to show the agreement.
- **2.3.8 ("For Kids" and "For Children" are reserved for the Kids Category).** The app is in Games, Sports, by choice, not the Kids Category. The copy names the Kids level as a difficulty level, never who the app is for by age; `node tools/listing.mjs` fails Apple copy that does. If the reviewer cites the `kids` keyword (LISTING.md), drop it and resubmit; keywords change only with a new version.
- **2.3.6 (age rating).** If the reviewer thinks the rating is too low, the likely answer is Cartoon or Fantasy Violence (the Big Hit): APP_STORE.md quotes Apple's definition and the reasons each way. Change the answer if the reviewer's reading is fair; the rating then moves to 9+.
- **5.1.1 (privacy).** The privacy policy is linked in App Store Connect and inside the app (Grown-Ups panel). The label is Data Not Collected; APP_STORE.md has the reasoning for each kind of data.
- **5.2 (intellectual property).** If a club or a union complains about a name: professional sides go by city, with no crests; local clubs by name and colours. Be ready to rename one in an update. A club's written permission (SUPER_FAN.md) answers it for partners.
- **2.1 (app completeness) or 2.3 (accurate metadata).** Usually an in-app purchase that would not load in review (is the Paid Apps agreement active? are the products attached to the version?) or a description that claims something the reviewer cannot find. Fix and resubmit.

## 9. If Google Rejects It (Phase 2)

- **Families policy**: almost always an SDK or permission (AD_ID, an analytics library pulled in by a plugin). Check the bundle's manifest and remove it. The Data Safety form must say what the app really does.
- **Metadata**: no "best", rankings, prices or emoji in the title or short description; LISTING.md already avoids them.
- **Impersonation or intellectual property**: as for Apple's 5.2.
- **Spam and minimum functionality** ("webview app"): as for Apple's 4.2.
- Appeals go through the Policy status page in Play Console.
