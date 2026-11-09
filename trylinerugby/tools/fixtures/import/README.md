# Import fixtures

Pages for `tools/importer.mjs`. No file here is a raw download, and none holds data about a real person.

## Built from real Pitchero pages

These wrap JSON from *Pitchero club data: real-page findings v1.0 (2026-11-08)*. A helper session with network access read
public pages of Bracknell RFC and Darlington RFC. The JSON structure and key names are exactly as served, but the
excerpts were trimmed: some rows, teams and older seasons are left out. Each one sits in a minimal HTML shell,
`<script id="__NEXT_DATA__" type="application/json">`, which is where Pitchero serves it. The `<title>` and the shell
itself are made up.

| File | Page | Changes from the excerpt |
|---|---|---|
| `pitchero-home.html` | `/clubs/bracknell` (club home) | none |
| `pitchero-fixtures.html` | `/clubs/bracknell/teams/3100/fixtures-results` | `props.club` copied in from the club home. The excerpt left it out, but real pages carry it on every page. |
| `pitchero-league.html` | `/clubs/bracknell/teams/3100/league-table` | `props.club` copied in, as above |
| `pitchero-minis-empty.html` | `/clubs/bracknell/teams/3487/fixtures-results` (U10, no fixtures) | `props.club` copied in, as above |
| `pitchero-minis-friendlies.html` | `/clubs/darlingtonrfc/teams/14605/fixtures-results` (U10s) | A minimal `props.club` was reconstructed from the colours the club's own side wears in the excerpt. `pageProps.teamId` and `query` were added. |

## Synthetic

These are made up to cover the other parser paths and the safeguarding filter. Every club, team and person name in
them is invented. The planted people (Jamie Testplayer, Avery Tinyplayer, Alexandra Plantedname, Robin Coachperson,
Morgan Fakename, Casey Byline, Riley Madeup, Sam Notreal, Jordan Statsname, Quinn Organiserperson, Harper Soloathlete,
Taylor P, J Smith, Joe S, plus the example.com and example.org emails and the 07700 900xxx numbers, which are Ofcom's
drama range) must never reach a result. Those first names are all in the importer's first-name list, so
`generic-people.html` plants people whose first names are not (Zara Fakeperson, Arlo Plantedkid, Priya Notachild, Teddy
Inventedname, Willow Madeupname, Ezra Testsurname, Nia Pretendperson, Kofi Imaginaryname): every one of them passes
`importName`, so only the page's structure can keep them out.

| File | What it covers |
|---|---|
| `pitchero-safeguarding.html` | The league page's shape with people planted everywhere a club site could carry them: club contacts and a welfare officer, a squad with photos, player statistics, a news article and its author, man of the match, a match report, scorers, person-shaped table rows and opponents, a coach's win/loss record under an innocent key, an og:title naming a player, a JSON-LD Person, a mailto link, an img alt and a player table. It also has an older season's table, to test choosing by `seasonId`. |
| `generic-tournament.html` | A club's tournament page: two pool standings tables (one has a crest cell spanned by `colspan`), a top-scorers table and a squad table that must be ignored, a fixtures table with Home and Away and placeholders, JSON-LD SportsEvent competitors including a Person, og:site_name and theme-color. |
| `generic-jsonld.html` | A club site with a JSON-LD SportsTeam (athletes, coach and contact point planted), the league it belongs to, theme-color, and no tables. |
| `generic-next.html` | A Next.js site that is not Pitchero: standings with nested `team.name` and `stats`, a club with `colors`, and `homeTeam`/`awayTeam` fixtures, for the generic JSON walker. |
| `generic-flight.html` | A Next.js app-router page whose data arrives as flight lines in `self.__next_f.push`, with an `rgb()` colour. |
| `generic-empty.html` | Nothing to import. |
| `generic-people.html` | A person's page on a club site: the title and og:title name the person, and people with win and loss records sit under `leaderboard`, `rankings`, `results` and `individuals`. Only the `standings` under `competition` is a table. No club name. |

When real pages for another source arrive, add them here and give that source its own entry in `IMPORT_SOURCES` in
`src/import.js`.
