# Super Fan: Club Partnership Outline

> **Not legal, tax or financial advice.** This is an outline to plan from and to take to a solicitor and an accountant before anything is signed. It describes how the game and the stores work; what the law requires of the owner, and of each club, depends on facts this document does not know (the owner's business set-up, each club's legal status, where it is registered).

## What Super Fan Is

A one-off unlock in the app, one product per partner club (`tryline.fan.<club>`, for example `tryline.fan.farnham`). It includes everything in Full Game (Career, Championship and International modes, Create Team, Hard, the Legends sides) and Add Your Team (the import of a club and its league), and marks the player as a Super Fan of that club: the home screen in the club's kit colours, with a plain shield in those colours and the club's name on the Super Fan badge (the club's crest only where the club has given it, below), a gold Super Fan trophy for the club in the Locker and the Trophy Cabinet, and the club offered first in Career and Championship. A grown-up who has it can also ask to be named on the club's Supporters' Wall (below). SignCheck Ltd, the seller, shares part of each sale with the club.

The owner's decisions (8 November 2026): Super Fan costs **£3.99** (Full Game stays £1.99); each club's share is **50% of what Apple pays us** for its unlocks, after Apple's commission and VAT; the first partner is **Farnham RUFC** (`tryline.fan.farnham`), whose 50% is **to be confirmed in writing with the club before launch**.

The partner clubs live in one list in the game, `FAN_CLUBS = [{ key, name, product, share }]` (src/store.js, the store work). `share` is the percentage the owner fills in. **While a club's share is null the game does not offer that club's Super Fan at all**, so it can never go on sale without its stated share. A club also carries `agreed:true` once it has confirmed in writing; superfan.html is public as soon as the work is merged, so it lists only the clubs marked agreed, each with the same share as `FAN_CLUBS`. `node tools/listing.mjs` fails if the two disagree, or if superfan.html names a club that is not marked agreed.

## How It Is Worded

- **Never a donation or charity**, in the game, the store listing or on the club's own channels. It is a purchase of an unlock; the club receives a share of the sales under an agreement with the owner.
  - Apple's guideline 3.2.2 lets only approved non-profits raise money inside an app, and only outside in-app purchase. An unlock sold as a fundraiser would be rejected, or worse, approved and then pulled.
  - Telling buyers that money "goes to" a cause is regulated when the cause is a charity (see "If the Club Is a Charity").
- **Say what the club gets, and what it is a share of**, in the same words everywhere: "Supports Farnham RUFC: 50% of what we receive for every Super Fan unlock goes to the club." The game shows that line on the unlock card before the grown-up check; superfan.html shows it for each agreed club.
- **Why "of what we receive".** The owner chose a share of what the store pays (8 November 2026). "50% of every Super Fan unlock" would read to most people as half the price, about £2.00 of £3.99, when the club's 50% of what Apple pays is about £1.41 (see the worked example). The store keeps its commission and the VAT first, so the words have to say so. It also matches the reports exactly, and SignCheck Ltd can never pay out more than came in.
- **The game's words are the store work's** (`storeShareLine` in src/store.js). When this was written it still said "% of every Super Fan unlock goes to the club"; it has to say "% of what we receive for every Super Fan unlock goes to the club", and `node tools/listing.mjs` fails until the game and superfan.html use the same words.

## What the Club Gets

- The stated share of every Super Fan unlock for that club, net of refunds, paid on an agreed timetable with a statement each time.
- Its name and kit colours on the Super Fan badge and across its supporters' home screen, a Super Fan trophy in its colours, and first place in the team lists for its supporters.
- A listing on superfan.html, once it has confirmed in writing, with its Supporters' Wall there (below).
- Something to tell members about: a link to the store pages (and, once the app is live, the web version's Get the App button). Any promotion is the club's choice.
- What the club does **not** get: anything about who bought. The stores' reports count sales by product and country; they do not name buyers, and the game collects nothing. Say so in the agreement, so nobody expects a list of buyers. The Supporters' Wall is not one: it is the names grown-ups chose to send us to be shown publicly, and the club sees it on superfan.html as anyone does. No email address or anything else from a request is passed on.

## What the Club Gives

- Permission, in writing, to use its name and kit colours in the game and on the store and web pages (no crest unless agreed separately).
- Optionally, its crest, supplied by the club with its **written permission** to show it in the game. Without that, the Super Fan's shield is plain, in the kit colours. With it, the crest file goes in `crests/` and its path in the club's `crest` in `FAN_CLUBS` (it is `crest:null` until then); the build then carries it offline and into the app. Keep the permission with the agreement.
- Approval of the exact words used about the partnership.
- Bank details for payments, and a named contact.
- Optionally, promotion to its members, in words both sides have agreed.

## The Supporters' Wall

A Super Fan's grown-up can ask to be named on the club's wall on superfan.html (the owner's idea, 9 November 2026: "depending on age, approve name, their choice"). It is opt-in, adults only, and the game itself collects nothing:

- In the app (the Super Fan tile in the Locker, or the Grown-Ups panel), Join the Supporters' Wall comes after the grown-up check, then asks Are you 18 or over? and How Your Name Appears (a first name and a town, or a first name and an initial). Continue opens the grown-up's own email app with the request written out to support@signcheck.ai: the name as typed, the club, and that they are 18 or over, agree to be listed and can ask to be removed at any time. The game sends nothing and keeps no name.
- SignCheck Ltd checks each request by hand (LAUNCH_CHECKLIST.md has the steps) and adds the name under the club on superfan.html. It keeps only the name and the club, to publish them, deletes the email once done, and takes a name off whenever asked. privacy.html says so.
- It is part of what a supporter gets, never a donation or charity, and it is shown only for a club that has agreed in writing.

## How Each Club's Sales Are Counted

Each club has its own product id, so the stores' own reports separate the clubs with no data from the game. The column names below are as Apple and Google publish them in late 2026: check them against the first real report.

**Apple (App Store Connect).**

- **Payments and Financial Reports**: one report per region per Apple fiscal month, and a payment summary showing what was paid to the bank in pounds. In the region reports, each row is a product: find the club's product id in the **Vendor Identifier** column, and add up **Quantity** (sales, with refunds as negative quantities) and **Extended Partner Share** (what Apple pays for those rows, in the **Partner Share Currency**). Convert each currency at the rate the payment summary used.
- **Sales and Trends** shows the same products day by day and is good for watching how a club is doing, but it is an estimate; pay the club from the financial reports, which are what Apple actually paid.
- Apple's fiscal months are four or five weeks, not calendar months. Pay by Apple's months and say so in the agreement.

**Google (Play Console).**

- **Download reports, Financial, Earnings**: a monthly file with one row per transaction. Filter **Sku Id** to the club's product id, and add up **Amount (Merchant Currency)** over every row for it: the charge, Google's fee, tax and any refund each appear as their own row, so the sum is what Google paid for that product. Count the units from the charge rows less the refund rows.

**Things that move the numbers.**

- **Refunds and chargebacks** come off in a later month. Net them against that month's share.
- **Family Sharing** (Apple), where turned on for the product, lets one purchase unlock other family members' devices. Only the one sale is reported, and only it is shared. Google Play's family sharing works differently and may not cover in-app products: check in Play Console.
- **Promo or offer codes** for an unlock bring in nothing. Exclude them (they show with no proceeds).
- **Exchange rates**: overseas sales are paid in pounds at the store's rate. The club's share follows what was actually received.

## Worked Example (Illustrative Only)

The sales numbers are made up to show the arithmetic; the real proceeds for each price are shown in App Store Connect (and in Play Console, in phase 2).

Super Fan at £3.99 in the UK, with the owner's 50%. The price includes VAT at 20%, so the price before VAT is £3.325. With Apple's 15% commission for small developers (the App Store Small Business Program, which SignCheck Ltd must be in), SignCheck Ltd receives about £2.83 for each unlock; at the standard 30%, about £2.33.

| | Share of the price paid (not chosen) | **Share of what we receive (the owner's choice)** |
|---|---|---|
| Stated share | 50% | 50% |
| Club gets per unlock, at 15% commission | about £2.00 | about £1.41 |
| SignCheck Ltd keeps per unlock, at 15% | about £0.83 | about £1.41 |
| Club gets per unlock, at 30% commission | about £2.00 | about £1.16 |
| 40 unlocks in a quarter, 2 refunded (net 38), at 15% | £75.81 | about £53.70 |

The left column is why the words matter: a buyer who reads "50% of every unlock" expects the club to get about £2.00.

## Payment Cadence

The stores pay the owner first: Apple roughly a month after the end of each of its fiscal months, once the amount owed is over its minimum; Google monthly, around the middle of the following month, once over its minimum. Pay the club only out of money already received.

| Option | For | Against |
|---|---|---|
| Monthly | Quick for the club | Twelve statements a year; small sums |
| **Quarterly** (chosen by the owner, 2026-11-08) | Four statements a year; sums worth a bank transfer; refunds mostly settled | The club waits up to four months |
| Twice a year or yearly, with a minimum (for example £25, carried forward below it) | Least work | Long waits; fits a club with few sales |

Each payment comes with a one-page statement: the period, units sold and refunded on each store, what each store paid for them, the share, and the amount. Keep the reports and statements with the business records (HMRC generally expects a company's records to be kept for six years: check with SignCheck Ltd's accountant).

## What to Put in Writing

A short agreement with each club, signed before its share is set in the game and before superfan.html lists it. It should cover:

1. **Who**: SignCheck Ltd and the club, with the club's legal name, its status (unincorporated members' club, company, community amateur sports club, registered charity) and who can sign for it.
2. **What**: Super Fan for that club, the product id, what it unlocks, and that it is sold through the App Store and Google Play at prices SignCheck Ltd sets (£3.99 at launch).
3. **The share**: 50% of what the store pays SignCheck Ltd for that club's unlocks, after the store's commission and VAT (see "How It Is Worded"), net of refunds and chargebacks, counted from the stores' financial reports. For Farnham RUFC this is the line to have confirmed in writing before launch.
4. **Payment**: how often, any minimum, the statement, the currency, the bank account, and how long after the store pays.
5. **Permission to use the club's name and kit colours**, where (the game, the store pages, superfan.html), and that the club can ask for changes. If the club wants its crest in the game, it supplies the file with its written permission to show it there; it can withdraw it, and the next update shows the plain shield again.
6. **The wording** both sides use about the partnership, word for word, and that it is never called a donation or a charity.
7. **No personal data**: the owner has none to share and will not collect any; the club gets sales counts only. The Supporters' Wall's names are published by SignCheck Ltd on superfan.html, with each person's agreement, and nothing more from a request (no email address) goes to the club.
8. **Changing the share**: only by agreement, with notice, taking effect from a date. The share is shown in the app, so a change needs an app update; until a player updates, an older copy shows the old figure. Sales are paid at the share the buyer was shown. Raising a share is simple; lowering one needs care.
9. **Ending it**: notice on either side; the offer comes off sale in the next update; anyone who bought keeps their unlock and their badge; a final statement and payment for sales up to the end, and refunds after it netted off.
10. **Tax**: each side handles its own. Whether the club's receipts are trading income, and whether VAT applies to anything the club does in return (promotion, say), is for the club's own adviser.
11. **No exclusivity** unless agreed: other clubs can be partners too.
12. **Law**: England and Wales (or as advised).

## If the Club Is a Charity

Some rugby clubs are registered charities; many are community amateur sports clubs (CASCs), which are not charities; others are neither. **[OWNER: ask each club which it is.]**

If a partner club is a charity (a "charitable institution" in the Charities Act 1992), a business that tells buyers part of a sale goes to it is a **commercial participator**. In England and Wales that brings rules of its own: a written agreement with particular terms, and a statement to buyers of how much, or what proportion, goes to the charity. The rules in Scotland and Northern Ireland differ. Take advice before agreeing with a charity. The statement has to give the proportion accurately: "50% of what we receive for every Super Fan unlock" states a proportion of the proceeds, not of the price, which is why the words say "of what we receive"; whether that meets the rule as worded, or the amount per unlock has to be stated too, is for the adviser.

## Adding a Club

1. The club agrees, in writing (above).
2. Create its product, `tryline.fan.<key>`, at £3.99 in App Store Connect (APP_STORE.md), and in Play Console once the Android version is out (GOOGLE_PLAY.md).
3. Add it to `FAN_CLUBS` with its share and `agreed:true` (the store work's README, `trylinerugby/store/README.md`, has the steps in the game).
4. In the same change, add its row to superfan.html with the same share and the game's share line under the table; `node tools/listing.mjs` checks they match.
5. Ship the app update. The club's Super Fan goes on sale with it.
