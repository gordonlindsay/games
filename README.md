# Games

Gordon's games, one folder each, served by GitHub Pages from `main`.

| Game | Folder | Play |
|---|---|---|
| Farnham Fighters | `farnhamfighters/` | https://gordonlindsay.github.io/games/farnhamfighters/ |
| The Wedding Crashers | `weddingcrashers/` | https://gordonlindsay.github.io/games/weddingcrashers/ |
| Try Line Rugby | `trylinerugby/` | https://gordonlindsay.github.io/games/trylinerugby/ |

The front page, https://gordonlindsay.github.io/games/, lists them all.

Each game came from its own repo (`gordonlindsay/farnhamfighters`, `weddingcrashers`, `trylinerugby`), brought in
with `git subtree` so its history is kept. Those repos stay up until they're retired; this one is the source now.

## Preview

Run `python3 -m http.server 3060` here and open http://localhost:3060/. Each game is at `/<folder>/`.

## Release

Push to `main`. Pages redeploys in about a minute.

## New game

Add a folder named like the others (lowercase, no hyphens), with the game in a complete `index.html`, add it to the
table above and to `index.html`, then push.
