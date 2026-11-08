# Launch Checklist: Owner-Only Steps

Everything here needs the owner himself: his identity, his money, his signature or his decision. Nothing in it can be done from the code. Roughly in order; the first three take days to weeks, so start them first.

> Not legal, tax or financial advice. Fees and rules below are as generally published in late 2026; check each on the day.

## 1. Accounts (Start Now: These Take Time)

- [ ] **Decide: individual or organisation**, for both stores. An individual account shows the owner's own legal name as the seller. An organisation account shows the company's name, but needs a company and a D-U-N-S number (free from Dun & Bradstreet, can take a couple of weeks).
- [ ] **Apple Developer Program**: enrol at developer.apple.com with the owner's Apple Account, with two-factor authentication on. Yearly fee (US$99, charged in pounds in the UK). Identity check, then approval.
- [ ] **Google Play developer account**: sign up in Play Console. One-off fee (US$25). Identity verification with ID, and for organisations the D-U-N-S number. A **personal** account made after November 2023 must run a closed test with at least 12 testers for 14 days in a row before production (step 6), so plan the testers now.
- [ ] **Store name**: check "Try Line Rugby" is free on both stores (App Store Connect will say when the app record is made). LISTING.md has a fallback.

## 2. Money, Tax and the Paid Apps Agreement

- [ ] **Apple, Agreements, Tax and Banking** (App Store Connect, Business): accept the **Paid Apps agreement**. In-app purchases do not work, even in testing, until it is active.
- [ ] Apple: add the **bank account** (pounds, a UK account), and the **tax forms** (for a UK individual, the US W-8BEN, which claims the treaty rate on US sales).
- [ ] Apple: apply for the **App Store Small Business Program** (15% commission instead of 30% on up to US$1 million a year). It is not automatic.
- [ ] Google: set up the **payments profile** and **merchant account** in Play Console (Monetise setup), with the bank account and the tax information.
- [ ] **EU trader status** (the Digital Services Act), on both stores: anyone selling to the EU as a business is a trader, and a trader's **address, phone and email are shown on the EU store pages**. Either declare, with contact details the owner is happy to publish (a business address, not home), or leave the EU out of the countries at first.
- [ ] **HMRC**: income from app sales is taxable. Talk to an accountant about registering for Self Assessment (or the company's tax) and about the Super Fan payments to clubs. Apple and Google handle the VAT on sales to buyers in the UK and EU.

## 3. Web Addresses and Contact

- [ ] Fill every **[OWNER: ...]** placeholder: the contact email and the name on PRIVACY.md, support.html and superfan.html, and the answers in APP_STORE.md and GOOGLE_PLAY.md. Then `node tools/listing.mjs --write` (privacy.html is made from PRIVACY.md) and `node tools/listing.mjs --launch`, which fails while any placeholder is left.
- [ ] The support email must be one the owner reads. Both stores publish it.
- [ ] Merge the launch work so privacy.html, support.html and superfan.html are live on GitHub Pages, and open each on a phone. These addresses go into both stores:
  - https://gordonlindsay.github.io/games/trylinerugby/privacy.html
  - https://gordonlindsay.github.io/games/trylinerugby/support.html
  - https://gordonlindsay.github.io/games/trylinerugby/superfan.html
- [ ] Decide whether `trylinerugby/store-listing/` should be public. GitHub Pages serves everything in the repository, so these documents, the Super Fan outline included, can be read by anyone with the address while the repository is public.

## 4. App Records and Products

- [ ] **App Store Connect app record**: New App, iOS, name, English (U.K.), the bundle id (it must match the native project's app id exactly, and cannot change once a build is uploaded), SKU `TRYLINE1`. Then fill App Information, Age Rating, App Privacy and Pricing from APP_STORE.md.
- [ ] **Play Console app**: Create app, Game, Free, the declarations. Then App Content from GOOGLE_PLAY.md (Target Audience, Ads, Data Safety, Content Rating) and the store listing.
- [ ] **In-app purchases on both stores**: `tryline.full` at £1.99, and `tryline.fan.<club>` for each partner club whose agreement is signed (SUPER_FAN.md). Exact ids, non-consumable / one-time. Super Fan prices are the owner's call.
- [ ] **Super Fan**: sign each club's agreement first; then set its share in `FAN_CLUBS` and on superfan.html in the same change. Until then the game does not offer that club.
- [ ] **Family Sharing** for each Apple in-app purchase: decide (it cannot be turned off once on).
- [ ] **iPad**: decide whether the first version runs on iPad as an iPad app or as the iPhone app (SCREENSHOTS.md). Tell the native work.
- [ ] **Screenshots**: after the merge, and again after the Mac session's new graphics, re-shoot (SCREENSHOTS.md) and upload: iPhone 6.9-inch, iPad 13-inch if it is an iPad app, Play phone, Play tablets, the feature graphic, and the 512x512 icon.

## 5. Build and Test on Apple (TestFlight)

- [ ] On the Mac: build the app in Xcode from the native project (its README has the steps), set the signing team, and check `ITSAppUsesNonExemptEncryption` is `NO` in Info.plist.
- [ ] Archive and upload to App Store Connect. Wait for processing.
- [ ] **Internal testing** in TestFlight (up to 100 people on the team, no review). Test on a real iPhone and, if it is an iPad app, an iPad:
  - [ ] Every mode, offline (aeroplane mode).
  - [ ] Buy Full Game and a Super Fan with a **Sandbox** tester account (App Store Connect, Users and Access, Sandbox). The grown-up check comes first every time.
  - [ ] Delete the app, reinstall, **Restore Purchases**: both unlocks come back.
  - [ ] Import a real club page (behind the grown-up check, Super Fan only).
  - [ ] The privacy and support links open, behind the grown-up check.
  - [ ] Nothing loads from Google Fonts or anywhere else at launch (a proxy such as Charles, or the Mac's network log, shows no request but Import's).
  - [ ] VoiceOver on the grown-up check and the unlock card.
  - [ ] A game controller, if the listing is going to mention them.
- [ ] **External testing** (friends, a club's parents) needs a short Beta App Review first; optional.

## 6. Build and Test on Google (Internal, Then Closed)

- [ ] Build the Android App Bundle (`.aab`) from the native project in Android Studio, signed with **Play App Signing** (Google keeps the release key; keep the upload key safe and backed up).
- [ ] **Internal testing** track: upload, add testers by email, install from the Play Store link. The same tests as TestFlight, with **licence testers** (Play Console, Settings, License testing) for purchases.
- [ ] Check the **permissions** in the App bundle explorer: Internet and vibration only, and no `AD_ID` (GOOGLE_PLAY.md, Families policy).
- [ ] **Closed testing** with at least 12 testers opted in for 14 days in a row, if the account is personal. Keep them installed; Google checks.
- [ ] Apply for **production access** when Play Console offers it (it asks about the test).

## 7. Submit

- [ ] Both stores: release set to **manual** (Apple) and **managed publishing** (Google), so the owner picks the day.
- [ ] Apple: attach the in-app purchases to the version, add the review notes from APP_STORE.md (with a club link for Import), submit for review. A first review often takes a day or two.
- [ ] Google: send the production release for review. A new account's first review can take a week or more.
- [ ] Launch day, in this order:
  1. Release both apps.
  2. Put the two store addresses into `STORE_LINKS` (`ios`, `android`) in src/store.js.
  3. Flip `STORE_WEB_TIER` to `'free'` (src/store.js), build, check, merge: the web keeps the free modes and shows Get the App for the rest.
  4. Open the web version on a phone: Get the App goes, behind the grown-up check, to the right store.

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
- **3.2.2 (charitable donations).** If the reviewer reads Super Fan as fundraising: it is the purchase of an unlock (Full Game plus Import and a club badge), sold through in-app purchase; the developer pays a stated share of sales to the club under a commercial agreement. The app never asks for a donation. Offer to show the agreement.
- **5.1.1 (privacy).** The privacy policy is linked in App Store Connect and inside the app (Grown-Ups panel). The label is Data Not Collected; APP_STORE.md has the reasoning for each kind of data.
- **5.2 (intellectual property).** If a club or a union complains about a name: professional sides go by city, with no crests; local clubs by name and colours. Be ready to rename one in an update. A club's written permission (SUPER_FAN.md) answers it for partners.
- **2.1 (app completeness) or 2.3 (accurate metadata).** Usually an in-app purchase that would not load in review (is the Paid Apps agreement active? are the products attached to the version?) or a description that claims something the reviewer cannot find. Fix and resubmit.

## 9. If Google Rejects It

- **Families policy**: almost always an SDK or permission (AD_ID, an analytics library pulled in by a plugin). Check the bundle's manifest and remove it. The Data Safety form must say what the app really does.
- **Metadata**: no "best", rankings, prices or emoji in the title or short description; LISTING.md already avoids them.
- **Impersonation or intellectual property**: as for Apple's 5.2.
- **Spam and minimum functionality** ("webview app"): as for Apple's 4.2.
- Appeals go through the Policy status page in Play Console.
