# Store Listing Pack

Everything for putting Try Line Rugby in the App Store and on Google Play that is not code. Drafted 8 November 2026 for the owner to check and finish; **[OWNER: ...]** marks every place he needs to fill in or decide (`node tools/listing.mjs --launch` lists them).

| File | What it is |
|---|---|
| [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) | The owner-only steps, in order: accounts, tax and banking, agreements, products, TestFlight and Play testing, submission, and what to do about a rejection. Start here. |
| [APP_STORE.md](APP_STORE.md) | App Store Connect: category, the age rating questionnaire (4+), the privacy label (Data Not Collected), export compliance, content rights, the in-app purchases and the review notes, each with its reason. |
| [GOOGLE_PLAY.md](GOOGLE_PLAY.md) | Play Console: target audience and the Families policy, Data Safety, the IARC content rating, the in-app products. |
| [LISTING.md](LISTING.md) | Draft store copy: names, subtitle, promotional text, descriptions, keywords. |
| [SUPER_FAN.md](SUPER_FAN.md) | The club partnership outline: what a club gets, how its sales are counted, payment, and what to put in writing. Not legal advice. |
| [SCREENSHOTS.md](SCREENSHOTS.md) | The screenshot sets, their sizes and order, and how to re-shoot. |
| `screenshots/` | The current build at the stores' sizes, and Google Play's feature graphic. |
| `feature-graphic.html` | The page the feature graphic is rendered from. |

The web pages the stores link to live one folder up, served by GitHub Pages: `privacy.html` (made from `PRIVACY.md`), `support.html` and `superfan.html`, styled by `pages.css`.

Checks, from `trylinerugby/`:

```sh
node tools/listing.mjs            # the pack and the pages (also run by node tools/check.mjs)
node tools/listing.mjs --write    # after editing PRIVACY.md: remakes privacy.html
node tools/listing.mjs --launch   # before submitting: also fails while a placeholder is left
node tools/listing-shots.mjs      # re-shoot the screenshots (needs Playwright)
```

This folder is for the stores and the owner, not the game: the app's copy of the game should leave it out (it holds about 17 MB of screenshots).
