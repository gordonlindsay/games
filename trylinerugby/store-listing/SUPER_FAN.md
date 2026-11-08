# Super Fan: Club Partnership Outline

> **Not legal, tax or financial advice.** This is an outline to plan from and to take to a solicitor and an accountant before anything is signed. It describes how the game and the stores work; what the law requires of the owner, and of each club, depends on facts this document does not know (the owner's business set-up, each club's legal status, where it is registered).

## What Super Fan Is

A one-off unlock in the app, one product per partner club (`tryline.fan.<club>`, for example `tryline.fan.farnham`). It includes everything in Full Game (Championship, Career, Create Team, Hard) and Import, and marks the player as a Super Fan of that club: the club's kit and name on the Super Fan badge, and the club offered first in Career and Championship. The owner shares part of each sale with the club.

The partner clubs live in one list in the game, `FAN_CLUBS = [{ key, name, product, share }]` (src/store.js, the store work). `share` is the percentage the owner fills in. **While a club's share is null the game does not offer that club's Super Fan at all**, so it can never go on sale without its stated share. superfan.html lists the same clubs and shares, and `node tools/listing.mjs` fails if the two disagree.

## How It Is Worded

- **Never a donation or charity**, in the game, the store listing or on the club's own channels. It is a purchase of an unlock; the club receives a share of the sales under an agreement with the owner.
  - Apple's guideline 3.2.2 lets only approved non-profits raise money inside an app, and only outside in-app purchase. An unlock sold as a fundraiser would be rejected, or worse, approved and then pulled.
  - Telling buyers that money "goes to" a cause is regulated when the cause is a charity (see "If the Club Is a Charity").
- **Say what the club gets**, the same words everywhere: "Supports Farnham RUFC: {share}% of every Super Fan unlock goes to the club." The game shows that line on the unlock card before the grown-up check; superfan.html shows it for each club.
- **Say what the share is a share of.** "Of every Super Fan unlock" reads to most people as "of the price I paid". The owner never receives the price: the store keeps its fee and the VAT first (see the worked example). Two honest options:
  1. **A share of what the stores pay us** (recommended). The line becomes "Supports Farnham RUFC: {share}% of what we receive for every Super Fan unlock goes to the club." It matches the reports exactly, and the owner can never pay out more than came in. The game's wording is the store work's (`storeShareLine` in src/store.js): changing it there and on superfan.html keeps them the same.
  2. **A share of the price paid.** Simple to read, but the share then has to be paid out of a smaller sum, it moves with VAT and exchange rates, and refunds still have to be netted off.
  **[OWNER: choose, then fill in the placeholder on superfan.html.]**

## What the Club Gets

- The stated share of every Super Fan unlock for that club, net of refunds, paid on an agreed timetable with a statement each time.
- Its name and kit colours on the Super Fan badge, and first place in the team lists for its supporters.
- A listing on superfan.html.
- Something to tell members about: a link to the store pages (and, once the app is live, the web version's Get the App button). Any promotion is the club's choice.
- What the club does **not** get: anything about who bought. The stores' reports count sales by product and country; they do not name buyers, and the game collects nothing. Say so in the agreement, so nobody expects a supporters' list.

## What the Club Gives

- Permission, in writing, to use its name and kit colours in the game and on the store and web pages (no crest unless agreed separately).
- Approval of the exact words used about the partnership.
- Bank details for payments, and a named contact.
- Optionally, promotion to its members, in words both sides have agreed.

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

The numbers are made up to show the arithmetic; the real proceeds for each price are shown in App Store Connect and Play Console.

A Super Fan priced at £3.99 in the UK. The price includes VAT at 20%, so the price before VAT is £3.325. With the stores' 15% fee for small developers (Apple's App Store Small Business Program, which the owner must apply for; Google's 15% on a developer's first US$1 million a year), the owner receives about £2.83 for each unlock.

| | Share of the price paid | Share of what we receive |
|---|---|---|
| Stated share | 25% | 25% |
| Club gets per unlock | £1.00 | about £0.71 |
| Owner keeps per unlock | about £1.83 | about £2.12 |
| 40 unlocks in a quarter, 2 refunded (net 38) | £37.91 | about £26.85 |

## Payment Cadence

The stores pay the owner first: Apple roughly a month after the end of each of its fiscal months, once the amount owed is over its minimum; Google monthly, around the middle of the following month, once over its minimum. Pay the club only out of money already received.

| Option | For | Against |
|---|---|---|
| Monthly | Quick for the club | Twelve statements a year; small sums |
| **Quarterly** (suggested) | Four statements a year; sums worth a bank transfer; refunds mostly settled | The club waits up to four months |
| Twice a year or yearly, with a minimum (for example £25, carried forward below it) | Least work | Long waits; fits a club with few sales |

Each payment comes with a one-page statement: the period, units sold and refunded on each store, what each store paid for them, the share, and the amount. Keep the reports and statements with the business records (HMRC expects a sole trader's records to be kept for at least five years after the 31 January deadline for that tax year, and a company's for six years: check with the accountant).

## What to Put in Writing

A short agreement with each club, signed before its share is set in the game. It should cover:

1. **Who**: the owner (or his company) and the club, with the club's legal name, its status (unincorporated members' club, company, community amateur sports club, registered charity) and who can sign for it.
2. **What**: Super Fan for that club, the product id, what it unlocks, and that it is sold through the App Store and Google Play at prices the owner sets.
3. **The share**: the percentage, **what it is a percentage of** (see "How It Is Worded"), net of refunds and chargebacks, and that it is counted from the stores' financial reports.
4. **Payment**: how often, any minimum, the statement, the currency, the bank account, and how long after the store pays.
5. **Permission to use the club's name and kit colours**, where (the game, the store pages, superfan.html), and that the club can ask for changes.
6. **The wording** both sides use about the partnership, word for word, and that it is never called a donation or a charity.
7. **No personal data**: the owner has none to share and will not collect any; the club gets sales counts only.
8. **Changing the share**: only by agreement, with notice, taking effect from a date. The share is shown in the app, so a change needs an app update; until a player updates, an older copy shows the old figure. Sales are paid at the share the buyer was shown. Raising a share is simple; lowering one needs care.
9. **Ending it**: notice on either side; the offer comes off sale in the next update; anyone who bought keeps their unlock and their badge; a final statement and payment for sales up to the end, and refunds after it netted off.
10. **Tax**: each side handles its own. Whether the club's receipts are trading income, and whether VAT applies to anything the club does in return (promotion, say), is for the club's own adviser.
11. **No exclusivity** unless agreed: other clubs can be partners too.
12. **Law**: England and Wales (or as advised).

## If the Club Is a Charity

Some rugby clubs are registered charities; many are community amateur sports clubs (CASCs), which are not charities; others are neither. **[OWNER: ask each club which it is.]**

If a partner club is a charity (a "charitable institution" in the Charities Act 1992), a business that tells buyers part of a sale goes to it is a **commercial participator**. In England and Wales that brings rules of its own: a written agreement with particular terms, and a statement to buyers of how much, or what proportion, goes to the charity. The rules in Scotland and Northern Ireland differ. Take advice before agreeing with a charity; the share line in the game may need to change to meet the statement rule.

## Adding a Club

1. The club agrees, in writing (above).
2. Create its product, `tryline.fan.<key>`, in App Store Connect and in Play Console (APP_STORE.md, GOOGLE_PLAY.md).
3. Add it to `FAN_CLUBS` with its share (the store work's README, `trylinerugby/store/README.md`, has the steps in the game).
4. Add its row to superfan.html, with the same share; `node tools/listing.mjs` checks they match.
5. Ship the app update. The club's Super Fan goes on sale with it.
