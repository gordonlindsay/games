# Tryline Import Service

A small function on Vercel that lets the web build of Tryline Rugby Sevens use **Add Your Team**. It reads a pasted Pitchero or tournament link, applies the same checks and safeguarding as the app, and sends back only club and team names, shirt colours and table numbers. Never the page, never the link, never a header.

Why it exists: a browser cannot read a Pitchero page from the game's site, because Pitchero sends no CORS header. The Try Line app fetches the page itself (Capacitor's native HTTP) and still does. On the web the game posts the link here instead, once, and this makes the same requests under the same rules.

- Production: `https://tryline-import.vercel.app/api/import` (the game's `IMPORT_SERVICE`, in `src/import.js`).
- Vercel project: **tryline-import**, Root Directory **trylinerugby/import-service**, region **lhr1** (London).
- No npm dependencies. Node 22.

## What is in this folder

| File | What it is |
| --- | --- |
| `api/import.js` | The function. It is `lib/service.cjs`'s handler over `node:https` and `node:dns`. |
| `lib/service.cjs` | The handler: the request rules, the address check, the network, the rate limit. |
| `lib/import-core.cjs` | **Generated, do not edit.** `tools/build.mjs` makes it from the game's own `src/import-core.js` (the parsers, the safeguarding filter and the fetch-and-follow), with `colorDist` and the two lines it needs from `src/data.js` and `src/match.js`. `node tools/build.mjs --check` fails while it is out of date, as it does for `game.js`. |
| `vercel.json` | 60 seconds a call, London, and an `ignoreCommand` that skips a deploy when nothing in this folder has changed since the last one (`VERCEL_GIT_PREVIOUS_SHA`; the first deploy always builds). |
| `package.json` | Node 22, CommonJS, no dependencies. |

## The request

`POST /api/import` with `Content-Type: text/plain` and the link as the body, at most 4KB. A text/plain POST is a CORS simple request, so the browser sends no preflight. The link travels in the body, so it never lands in a URL log.

The answer is JSON with `Cache-Control: no-store`:

- `{ "ok": true, "data": {...}, "requests": 1 to 3 }`, where `data` is exactly what the game's `importSafe` lets out: `source`, `club` (name, kit, trim), `teams` (name, kit, trim), `league` (name, played, won, drawn, lost, points, kit, trim, own) and, where the page said, a `label` (U10s, Ladies) and a `level` id.
- `{ "ok": false, "error": "url" | "net" | "timeout" | "empty" | "busy" }`, with 400, 502, 504, 422 or 429.

Anything else: `GET /api/import?health=1` answers `{"ok":true}` (the health check). `OPTIONS` from the game's page answers 204 with the CORS headers. Every other method, and every other GET, is 405.

## Limits and safeguards

- **Other websites are refused.** `Access-Control-Allow-Origin` is `https://gordonlindsay.github.io`, for that Origin only (`Vary: Origin`). Any other Origin, or none, is refused with 403 and no CORS header, before anything is fetched. That stops another site using the service from a browser. It does nothing against a script, which can send any Origin it likes, so anyone can ask it to read a public page: the rate limits below are what bound them.
- **The same rules as the app.** At most three requests in an import, all to the pasted page's site: the page, then its league table and its fixtures while no league has turned up. 12 seconds a request, and within an import five seconds between requests to Pitchero (its robots.txt asks for that). The gap is per import, as it is per phone in the app: two imports at once each keep their own. Links must be http or https (sent as https); IP addresses, local names, logins, odd ports and other schemes are refused and tracking parameters are stripped.
- **Redirects** are never followed by the platform. The game's own code follows each one, checks its Location as it checks a pasted link, and counts it as one of the three requests.
- **Never an internal address.** Every request goes out over `node:https` to port 443, with its own connection, through a DNS lookup (c-ares, 3 seconds and one try, never `dns.lookup`, so a slow DNS server cannot tie up Node's thread pool) that refuses the whole answer if any address in it is private, loopback, link-local (the cloud metadata address among them), shared (CGNAT), multicast, reserved, unspecified or for documentation, in IPv4 or IPv6, or an IPv4 address inside an IPv6 one. The connection uses the address that lookup approved, so a name cannot pass the check with one address and connect to another (DNS rebinding).
- **Headers.** Each request sends `User-Agent: TryLineRugby` and `Accept`, and nothing else of ours: no cookies, no authorisation, no Referer.
- **Pages.** Text only (HTML, JSON or XML, with no content encoding). A page is read up to 4,000,000 characters and the connection then closed.
- **Time.** A whole import has 45 seconds, under the function's 60 (`maxDuration` in `vercel.json`). Once fewer than 1.5 seconds are left no new request starts, and the pages already read stand.
- **Rate.** Six imports a minute from one caller, and 20 at once: 429 with `busy`, and the game says "Too many imports. Try again in a minute." The caller is the address Vercel's edge saw (`x-vercel-forwarded-for`, else `x-real-ip`, both set by Vercel over anything a client sends; never `x-forwarded-for`), and an IPv6 caller is its whole /64, so walking the addresses of one connection gains nothing. Callers are remembered by a salted hash of their address, never the address, and only for that minute. These counts are in memory on each instance, and a cold start forgets them, so the Vercel Firewall rule in the set-up below is the limit across all of them.
- **Nothing kept, nothing logged.** No console call anywhere in the service, no storage. Vercel's own request logs, which this code does not control, may record the caller's address and the path (never the body, so never the link) for a short time. What a person's name looks like, an email, a phone number, a link or a role, never leaves the parsers (the safeguarding in `src/import-core.js`), and the game puts the answer through the same checks again (`importClean`) before it shows or saves anything.

## Setting it up (the owner, once)

Before you start: Vercel's free Hobby plan is for non-commercial use only, and the game sells Super Fan, so check that the plan you deploy on suits that (Pro is the commercial one).

1. On vercel.com: **Add New Project**, then **Import** the GitHub repository `gordonlindsay/games`.
2. **Root Directory**: `trylinerugby/import-service`. Framework Preset: Other. Leave the build and output settings empty.
3. **Project Name**: `tryline-import` (that gives `https://tryline-import.vercel.app`, the address the game posts to). If Vercel gives the project any other `*.vercel.app` address (the name is taken), stop: `IMPORT_SERVICE` in `src/import.js`, and the checks in `tools/importer.mjs` and `tools/import-service.mjs` that pin it, must change to that address before the game's change is merged.
4. **Deploy.** From then on a push to `main` deploys it when this folder has changed since the last deploy, and is skipped otherwise (`ignoreCommand`).
5. **Firewall.** In the project's Firewall, add a rate-limit rule on the path `/api/import`: 30 requests a minute per IP, then deny. The service's own limit is per instance; this one holds across them all.
6. **Previews.** Under Settings, Deployment Protection, keep **Vercel Authentication** on for Preview deployments (the default), so a branch's copy of the service is never open to the public. Or, under Git, deploy `main` only.

The game's web build posts here as soon as its change reaches `main` and GitHub Pages, so the order is: create the project, check the health address below answers `{"ok":true}` at exactly `https://tryline-import.vercel.app`, try one real import against it from the game's Pages site (below), and only then merge the game's change. Until the service answers, the web card says "Import isn't working. Try again later."

No environment variables are needed. `TRYLINE_IMPORT_TEST_ORIGIN` is for the tests only: never set it on Vercel.

## Checking it

- `https://tryline-import.vercel.app/api/import?health=1` in a browser shows `{"ok":true}`.
- Before the game's change is merged, one real import from the game's own site: open `https://gordonlindsay.github.io/games/trylinerugby/`, then in the browser's console run `fetch('https://tryline-import.vercel.app/api/import', { method:'POST', headers:{ 'Content-Type':'text/plain' }, body:'https://www.pitchero.com/clubs/<a club>' }).then(r => r.json()).then(console.log)`. It should print `ok: true` and the club's name and colours.
- Once it is merged, on the web game: Add Your Team, the grown-up check, paste a club's Pitchero link, Import.
- On a computer, `node tools/import-service.mjs` (from `trylinerugby/`) runs the service's checks against local fixture pages through a stubbed network, and where Playwright is installed plays the web build against a local copy of the service at 844x390 and 667x375. `node tools/build.mjs` regenerates `lib/import-core.cjs`.

GitHub Pages also publishes this folder as plain files (it sits inside the game's folder). That is harmless: it is source, never run there, and the game's service worker never caches any of it.
