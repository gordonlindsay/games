# Purchases: products, store setup and partner clubs

Try Line Rugby is a free download with one-off unlocks. No subscriptions, no ads, no accounts and no server of ours. This page is
for whoever sets up the products in App Store Connect and Google Play Console, adds a partner club, or flips the web version to
its free tier at launch.

The code is `src/store.js` (who has what, the product list, the adapter) and `src/ui-store.js` (the locks, the Unlock card, the
Grown-Ups panel). `node tools/store.mjs` checks them, and runs in `node tools/check.mjs`.

## What is free and what is sold

| Tier | Product id | What it unlocks | Price |
|---|---|---|---|
| Free | none | Quick Match, Training Ground (all drills), Kids, Easy, Normal, How to Play, Two Player | free |
| Full Game | `tryline.full` | Championship, Career, Create Team (and Edit), Hard | £1.99 |
| Super Fan of a partner club | `tryline.fan.<key>`, one per club (`tryline.fan.farnham` first) | Everything in the Full Game, Import Club, and the Super Fan badge: the club's shirt and name on the home, and the club offered first in Career and Championship | set by the owner |

All of them are **non-consumable** in-app purchases. There is no generic `tryline.fan`: every Super Fan product belongs to one
club, so Apple's and Google's sales reports count each club's unlocks with nothing collected by the game.

A locked control keeps its place and label with a small lock, and opens the Unlock card. A championship or career already under
way stays saved; it is only locked until the unlock. A saved Hard plays as Normal while Hard is locked.

## The partner clubs

They live in one list, `FAN_CLUBS` in `src/store.js`:

```js
const FAN_CLUBS = [
  { key:'farnham', name:'Farnham RUFC', product:'tryline.fan.farnham', share:null, team:'FAR' },
];
```

- `key`: lower case letters and figures, 24 at most. The product id is `tryline.fan.` + key.
- `name`: how the game names the club on the badge and the offer.
- `team`: the club's side in the game (`id` in `src/data.js`), for its shirt colours and to be offered first.
- `share`: the percentage of each Super Fan unlock that goes to the club, filled in by the owner. **While it is `null` the club's
  Super Fan offer is not shown anywhere**, so it can never go on sale without its stated share (`tools/store.mjs` checks this).
  Until a club has a share, Import Club is not offered in the app at all, as only Super Fan unlocks it.

With a share set, the offer carries this sentence, and the game never describes it any other way:

> Supports Farnham RUFC: 20% of every Super Fan unlock goes to the club.

Never call it a donation or charity, in the game, the listing or the product's description (Apple 3.2.2, and the UK rules for a
commercial participator). It is a purchase of game content, and the sentence says what the club gets.

### Adding a partner club

1. Agree the share and how it is paid with the club (the partnership outline is in `trylinerugby/store-listing/`; it is not legal advice).
2. If the game does not have the club yet, append it to `CLUBS` in `src/data.js` with its shirt colours (append only, never
   reorder; ratings are made up, as for every club).
3. Append it to `FAN_CLUBS` with `share:null`, its `key`, `name`, `product` and `team`.
4. Create the product in App Store Connect and Play Console (below) with that product id, and the price the owner chooses.
5. Set `share` to the agreed percentage. Rebuild (`node tools/build.mjs`), run `node tools/check.mjs`, and ship an update: the
   offer appears from that version.

A club removed from `FAN_CLUBS` later is no longer offered, but anyone who bought it keeps it: the save keeps every product id it
was given.

### Counting a club's sales

Each club has its own product, so its sales are its own line:

- App Store Connect: Sales and Trends, filtered by product (`tryline.fan.farnham`), or Payments and Financial Reports, which list
  units and proceeds per product.
- Play Console: Download reports, Financial (earnings report), which lists each SKU.

## App Store Connect

1. In the app's record: In-App Purchases (under Monetization in the sidebar), then **+** for each product, type **Non-Consumable**.
   - Reference name: Full Game; Product ID: `tryline.full`; price: £1.99 in the UK storefront (Apple sets the others from it
     unless changed).
   - Reference name: Super Fan Farnham RUFC; Product ID: `tryline.fan.farnham`; price: the owner's choice.
2. For each, add a display name and description (the game shows its own wording, with the price the store returns), a review
   screenshot of the Unlock card, and a review note: the Unlock card opens from any locked mode or from Grown-Ups on the home,
   and a grown-up check (a multiplication in words) comes before every purchase.
3. Family Sharing: optional per product. If it is on, a family member's purchase arrives as owned on the next launch or with
   Restore Purchases.
4. Attach the products to the app version before submitting it for review: the first products must go with a version.
5. In Xcode, the app target needs the **In-App Purchase** capability (Signing and Capabilities). StoreKit 2 needs iOS 15 or later.
6. Test with a StoreKit configuration file in Xcode, then Sandbox testers (Users and Access, Sandbox) on TestFlight.

Ask to Buy: when a child on Family Sharing taps a purchase, Apple asks the parent. The card says "Waiting for a grown-up to approve
it." and the unlock arrives when it is approved, by the plugin's `transactionUpdated` event or on the next launch.

## Google Play Console

1. Play needs a build that uses billing before it lets you create products: upload the first app bundle to the internal testing
   track (the plugin brings in Play Billing and its `BILLING` permission).
2. Monetise with Play, Products, One-time products (formerly In-app products): create one for each, with the same ids
   (`tryline.full`, `tryline.fan.farnham`), a name, description and a buy purchase option with its price, then activate it.
3. A payments profile must be set up on the developer account.
4. Test with licence testers (Setup, Licence testing) on the internal testing track.
5. The target audience includes under-13s, so the Families policy applies: purchases are allowed, there are no ads or third-party
   SDKs that collect data, and every purchase and link out is behind the grown-up check.

Google's pending payments (cash at a shop, for example) work like Ask to Buy: "Waiting for a grown-up to approve it.", then the
unlock when it is paid.

## The native plugin

**`@capgo/native-purchases@8.9.6`** (MPL-2.0, peer `@capacitor/core` 8 or later). The native project adds it to its
`package.json`; it is reached from the game as `Capacitor.Plugins.NativePurchases` (the game has no bundler, and Capacitor's
bridge puts every installed plugin there).

Why this one:

- It talks straight to StoreKit 2 on iOS and Google Play Billing on Android, with no service of its own in between. Its native
  sources were read before choosing it: the iOS side uses StoreKit only, and the Android side depends on Play Billing and
  AndroidX alone; the one web address in it is Google's subscription page, which the game never opens.
- No account, sign-up or API key, and nothing about the player passes through it. The game never sends it an account token, and
  never reads or sends a receipt or purchase token.
- It is a Capacitor plugin, maintained for Capacitor 8 (8.9.6, October 2026), with the calls the game needs.
- RevenueCat, Adapty, Qonversion and the like route purchases through their own servers and collect data, so they are out.
  `cordova-plugin-purchase` was the other candidate: it also works without a service, but it is a Cordova plugin with a larger
  API built around optional receipt validation through a third-party service, which this game does not want.
- MPL-2.0 is file-level: using it unchanged in the app needs nothing more than keeping its licence; a change to its own files
  would have to be published.

The calls the game makes, and nothing else:

| When | Call |
|---|---|
| Start, in the app | `addListener('transactionUpdated')` for purchases that finish later; `getPurchases({ productType:'inapp', onlyCurrentEntitlements:true })` to read back what is owned with no sign-in prompt; `getProducts({ productIdentifiers, productType:'inapp' })` for the prices |
| A purchase | `purchaseProduct({ productIdentifier, productType:'inapp', quantity:1 })` |
| Restore Purchases | `restorePurchases()` (Apple may ask the user to sign in), then `getPurchases` as above |

Leave the plugin's `autoFinishTransactions` at its default (on): non-consumables are finished on iOS and acknowledged on Android
by the plugin, as Google requires within three days.

A transaction unlocks only if it is for one of our product ids, Google's state is Purchased (not Pending) and Apple has not
revoked it. Purchases are kept in the save's own field (`store:{ owned }` in `tryline.v1`) and only ever added to: a store that
answers with less (offline, signed out) never takes one away. With no server, a refund is not noticed on the device that bought
it; it would be gone after a reinstall and Restore Purchases.

## The web version

`STORE_WEB_TIER` in `src/store.js`:

- `'full'` (now, until the app is live): everything is unlocked and nothing of the store shows. The web plays exactly as it did,
  and its save is byte for byte the same.
- `'free'` (from launch): the free tier, the locks, and a **Get the App** button on the Unlock card and the Grown-Ups panel,
  behind the grown-up check. It opens Google Play on Android and the App Store everywhere else. Purchases are the app's; the web
  sells nothing and reads none.

### Flipping it at launch

1. Once both store pages are live, set `STORE_LINKS.ios` and `STORE_LINKS.android` in `src/store.js` to their https addresses.
2. Set `const STORE_WEB_TIER = 'free';`.
3. `node tools/build.mjs`, then `node tools/check.mjs` (`tools/store.mjs` fails the free tier without both links).
4. Commit `src/store.js`, `game.js` and `sw.js`, and open a pull request.

A web save with a championship or career under way is not touched by the flip. It stays saved and locked, and plays on in the app
or once the game is unlocked.

## Grown-Ups

The home's **Grown-Ups** button (in the app, and on the free web) opens the panel: what this device owns, the offers not yet
owned, Restore Purchases, and Privacy and Support, which open `privacy.html` and `support.html` on GitHub Pages in the system
browser. Every one of those, and every purchase on the Unlock card, asks a grown-up first (`parentGate`, `src/kids.js`).
