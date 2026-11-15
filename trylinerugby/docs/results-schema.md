# results.json, version 1

The contract between the weekly job (`tools/results/update.mjs`, which writes it) and the game (which reads it). The file sits at the game root, beside `ratings.json`, and is served from the game's own site. Players' devices never contact Pitchero, Wikipedia or World Rugby.

This settles the points DESIGN.md left open. Where the two differ, this file wins. The example is Farnham's and England's real week (14 Nov 2026): Farnham, 6th, won 38-34 away at Old Alleynians, 8th, so +1 (not by 15, not over a higher side), and are 5th after it.

## Shape

```json
{
  "v": 1,
  "generated": "2026-11-15T22:31:07Z",
  "season": "2026-27",
  "clubs": {
    "FAR": {
      "date": "2026-11-14", "ha": "a", "res": "W", "f": 38, "a": 34,
      "opp": "OAE", "oppName": "Old Alleynians",
      "comp": "Regional 1 South Central",
      "league": "Regional 1 South Central", "pos": 5, "of": 12,
      "p": 7, "w": 4, "d": 0, "l": 3, "pts": 16,
      "prePos": 6, "oppPos": 8,
      "boost": 1, "why": "win",
      "from": "2026-11-15", "until": "2026-11-20", "next": "2026-11-21",
      "src": "pitchero"
    }
  },
  "men":   { "ENG": { "date": "2026-11-14", "ha": "h", "res": "W", "f": 78, "a": 15, "opp": "JPN", "oppName": "Japan", "comp": "Test", "rank": 5, "oppRank": 12, "boost": 2, "why": "big", "from": "2026-11-15", "until": "2026-11-20", "src": "worldrugby" } },
  "women": { }
}
```

## Top level

| Key | Type | Rule |
|---|---|---|
| `v` | number | Always `1`. Anything else: reject the whole file. |
| `generated` | string | UTC time the job ran, `YYYY-MM-DDTHH:MM:SSZ`, a real time. |
| `season` | string | The club season, `YYYY-YY` (`2026-27`). Informational. |
| `clubs` | object | Club sides, keyed by the game's team id. |
| `men` | object | Men's nations, keyed by the game's nation id (`natList('men')`). |
| `women` | object | Women's nations, keyed by the game's nation id (`natList('women')`). |

No other top-level key is written. A reader ignores unknown keys.

## Keys

- `clubs`: a built-in club id from `src/data.js` (`ALL_TEAMS` less the nations): the Premiership (`ENGLAND`), the Championship (`ENGLAND_TWO`), `CLUBS` and every club in `docs/clubs-local.json`. The game's own Counties 3 and 5 sides (HAS, ALD, KIN, GDN, EFF, WAN, EGH, MER, MIT, FEL) are not gathered. Never a nation, a made team, a My League side or a Legend.
- `men`, `women`: a nation id as `natList` uses it. Canada's women are `CDN` (the feed's CAN), never `CAN`, which is Canberra.

## One entry

Every entry has all of the **always** fields. The others are present only when known, and then in full.

| Key | Always | Type | Meaning and rule |
|---|---|---|---|
| `date` | yes | string | The match's date in the UK (Europe/London), `YYYY-MM-DD`, a real date, not after `generated`'s UK date. |
| `ha` | yes | string | `h` home, `a` away, `n` neutral (Tests only). |
| `res` | yes | string | `W`, `D` or `L`, from this side's view. Must agree with `f` and `a` (W: f > a, D: f = a, L: f < a), except when `wo` is true. |
| `f`, `a` | yes | integer | Points for and against, 0 to 200. |
| `opp` | yes | string or null | The opponent's game id when the game holds that side (same rules as the keys), else `null`. The game shows its own name for an opponent it holds ("v London West"). |
| `oppName` | yes | string | The opponent as the source names it, plain text: 1 to 40 characters, no `<`, `>` or control characters. Shown only when `opp` is null. |
| `comp` | yes | string | The competition: the league's name for a league match, the cup's for a cup match, `Test` for a nation. 1 to 60 characters, plain text. |
| `wo` | no | `true` | A walkover, conceded or void match with an awarded score. Its `boost` is 0 and `why` is `none`. Show "Won (Walkover)" or "Lost (Walkover)". |
| `league` | no | string | Clubs: this season's league, 1 to 60 characters, plain text. Comes with `pos` and `of`. Read it from here, not from the card's 2025-26 line: clubs have moved. |
| `pos`, `of` | no | integer | Clubs: place in that league **after** the match, and how many sides are in it. `1 <= pos <= of <= 24`. Present together, and only with `league`. |
| `p`, `w`, `d`, `l`, `pts` | no | integer | Clubs: the league table line after the match. All five or none; `w + d + l = p`; each 0 to 60, `pts` -50 to 200 (deductions exist). Only with `league`. |
| `prePos`, `oppPos` | no | integer | Clubs: this side's and the opponent's places **before** the match, within the same league. Only when both were known; absent in the first two rounds of a season. |
| `rank`, `oppRank` | no | integer | Nations: World Rugby ranking positions in force **before** the match, 1 to 120. Present together. |
| `boost` | yes | integer | `-1`, `0`, `1` or `2`. See the rules below. |
| `why` | yes | string | `win`, `big`, `higher`, `loss`, `draw` or `none`. For the tools and the README; never shown. |
| `from`, `until` | yes | string | The boost's window, inclusive UK dates. `from` is the day after `date`. `until` is at least `from`, at most `date` + 7 days, and before `next` when `next` is known. With no `next`, the job writes `date` + 6 (a Saturday's result runs Sunday to Friday). |
| `next` | no | string | The side's next fixture date (UK date), when the source lists one that is not postponed or cancelled. After `date`. |
| `src` | yes | string | `pitchero`, `wikipedia` or `worldrugby`. Never shown. |

Everything shown goes through `esc()`.

## Boost rules (the owner's, 15 Nov 2026)

- A win is `+1` (`why: "win"`).
- A win by 15 or more points is `+2` (`why: "big"`). A win over a side placed higher before the match is `+2` (`why: "higher"`). Both together are still `+2` (`big`).
- A loss is `-1` (`loss`). A draw is `0` (`draw`).
- `0` with `why: "none"` is no boost whatever the score: a walkover, a conceded or void match, or a window that would be empty (the next fixture the very next day).
- "Higher placed": clubs, `oppPos < prePos` in the same league; nobody counts as higher placed when either side had played fewer than two league matches before it, or when either place is unknown. Nations, `oppRank < rank` (World Rugby rankings before the match).
- The counting match is the side's latest first XV league or cup match with a result (a Test for a nation). Friendlies never count. A postponed or cancelled fixture is neither a result nor a `next`.
- Nothing stacks: one entry per side, the latest match.

So the checks are: `why` is one of the six; `win` and `big` and `higher` need `res: "W"`; `loss` needs `L`; `draw` needs `D`; `boost` is 1 for `win`, 2 for `big` and `higher`, -1 for `loss`, 0 for `draw` and `none`; `big` needs `f - a >= 15`; `win` and `higher` need `f - a < 15`; `higher` needs both places (or both ranks) and the opponent's the higher, and a `win` is never over a side placed higher; `until` is at least `from`, and before `next` unless `why` is `none`. The job's `validate()` and the game's `resultsEntry` (`src/results.js`) both hold every one of these, and `tools/results-game.mjs` checks that the game's fixture passes the job's validator and that the game takes the real file whole.

## When the game applies it (for the game's builder)

- The boost applies on a day `d` when `from <= d <= until`, where `d` is the UK date (Europe/London, worked out by the BST rule) at the device's clock, so every device and the tools agree; for a player in the UK it is the local date. After `until` it is gone, even offline: the job never extends a window, and the game must not either.
- Not at the Kids level and not to Minis or Women club sides (the result line still shows on the home). Women's nations take the `women` table.
- The job writes the side's latest result whatever its age. How long the result line stays on the home is the game's choice (DESIGN.md recommends 30 days after `date`).

## How strict the job is

The job (`tools/results/update.mjs`) runs `validate()` in `tools/results/lib.mjs` over the whole file and writes nothing if any entry fails, the file is over 300 KB, fewer clubs have an entry than 90% of the last file's count, or a league table's games played went backwards for more than one club. The game's per-entry dropping only guards against a file damaged in transit or an old client meeting a newer field. `node tools/results.mjs` pins the validator's rules.
