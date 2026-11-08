# Listing Copy: Drafts

**Status: drafts for the owner to edit.** Nothing here is final until the owner has read it and changed what he wants. Each piece of copy sits in its own block, ready to paste; `node tools/listing.mjs` checks every block against the store's length limit, the banned words and UK spelling, so run it after editing.

How it is written, and why:

- UK English, plain and parent-friendly. It says what the game has, not how good it is: no "best", "ultimate", "amazing" or "#1" (both stores reject superlatives and rankings in metadata, and parents read past them).
- No em dashes.
- No trademarks. Never "Six Nations"; also left out: "Grand Slam", "Triple Crown" (generic words, but closely tied to that tournament), "Pitchero", any professional club's name, and any local club's name except a Super Fan partner whose share is set and agreed.
- No price. The stores show the price in each country next to the listing, and a price in the text goes out of date or wrong abroad.
- Each store's copy names only that store's things (no "Android" on the App Store, no "iPhone" on Google Play).
- Super Fan is never a donation or charity. It says what the club gets: a stated share of each unlock.

## App Store

### Name (30 characters)

<!-- copy:apple.name -->
```text
Try Line Rugby
```

Check the name is free in App Store Connect when the app record is made. If it is taken, "Try Line: Rugby Sevens" (22) keeps the brand.

### Subtitle (30 characters)

<!-- copy:apple.subtitle -->
```text
Rugby Sevens, Easy to Learn
```

Other options: "Rugby Sevens in Your Pocket" (27), "Pick Up and Play Rugby Sevens" (29).

### Promotional Text (170 characters, can change without a new version)

<!-- copy:apple.promo -->
```text
Free to play: Quick Match, every Training Ground drill and a Kids level for 6 to 10 year olds. One unlock adds Championship, Career, Create Team and Hard.
```

### Keywords (100 bytes, commas, no spaces)

Apple already indexes the name and subtitle, so the keywords spend their 100 bytes on other words. No trademarks, club names or other games' names (guideline 2.3.7).

<!-- copy:apple.keywords -->
```text
sevens,7s,tackle,scrum,lineout,kids,club,career,training,league,sport,ball,offline,team,kicking
```

### Description (4,000 characters)

<!-- copy:apple.description -->
```text
Try Line Rugby is rugby sevens for your phone and tablet. Seven a side on a full pitch, seen from above, with one stick and three buttons: Pass, Kick and Sprint. Tackles, rucks, scrums, lineouts and goal kicks are all in. The big moments cut to a close-up with a clear cue, so a new player knows what to press and when.

Free to Play
- Quick Match against the computer, on Kids, Easy or Normal
- The Training Ground: eight short drills, from Bouncy Egg and Cones to Tackling and Kicking, each scored out of three stars
- How to Play, with control hints you can switch off

Full Game (a one-off unlock, no subscription)
- Championship: your team and five others over five rounds, with a league table and bonus points
- Career: one player, from the minis to the international side, training between matches
- Create Team: up to four teams of your own, with your kit, short name and abilities
- Hard level

Super Fan
For supporters of a partner club. Everything in Full Game, and Import, which brings your club and its league into the game from your club's web page or a tournament link. Your club's kit and name go on your Super Fan badge, and your club comes first in Career and Championship. A stated share of every Super Fan unlock goes to the club, and the game shows that share before you buy.

The Teams
National sides, local clubs, and city sides from France, Australia and South Africa. Professional sides go by their city, and every rating is made up.

Arcade Moments
On Fire: string three good moments together and your side lights up for a few seconds. A dominant tackle lands as a Big Hit. A drawn Quick Match goes to a Golden Try, sudden-death extra time.

For Parents
- No ads, no tracking, no accounts and no chat
- Nothing about you or your child is collected
- A grown-up check before any purchase or link out of the game
- A Kids level made for 6 to 10 year olds
- Plays offline; only Import and buying an unlock need a connection
```

### What's New (first version)

<!-- copy:apple.whatsnew -->
```text
The first version of Try Line Rugby.
```

## Google Play

### App Name (30 characters)

<!-- copy:google.title -->
```text
Try Line Rugby
```

### Short Description (80 characters)

<!-- copy:google.short -->
```text
Rugby sevens with one stick and three buttons. No ads, no tracking, no chat.
```

### Full Description (4,000 characters)

<!-- copy:google.full -->
```text
Try Line Rugby is rugby sevens for your phone and tablet. Seven a side on a full pitch, seen from above, with one stick and three buttons: Pass, Kick and Sprint. Tackles, rucks, scrums, lineouts and goal kicks are all in. The big moments cut to a close-up with a clear cue, so a new player knows what to press and when.

Free to Play
- Quick Match against the computer, on Kids, Easy or Normal
- The Training Ground: eight short drills, from Bouncy Egg and Cones to Tackling and Kicking, each scored out of three stars
- How to Play, with control hints you can switch off

Full Game (a one-off unlock, no subscription)
- Championship: your team and five others over five rounds, with a league table and bonus points
- Career: one player, from the minis to the international side, training between matches
- Create Team: up to four teams of your own, with your kit, short name and abilities
- Hard level

Super Fan
For supporters of a partner club. Everything in Full Game, and Import, which brings your club and its league into the game from your club's web page or a tournament link. Your club's kit and name go on your Super Fan badge, and your club comes first in Career and Championship. A stated share of every Super Fan unlock goes to the club, and the game shows that share before you buy.

The Teams
National sides, local clubs, and city sides from France, Australia and South Africa. Professional sides go by their city, and every rating is made up.

Arcade Moments
On Fire: string three good moments together and your side lights up for a few seconds. A dominant tackle lands as a Big Hit. A drawn Quick Match goes to a Golden Try, sudden-death extra time.

For Parents
- No ads, no tracking, no accounts and no chat
- Nothing about you or your child is collected
- A grown-up check before any purchase or link out of the game
- A Kids level made for 6 to 10 year olds
- Plays offline; only Import and buying an unlock need a connection
```

## Before Publishing

- Add a partner club's name to the descriptions only once its share is set in the game and the agreement is signed (see SUPER_FAN.md). Until then "a partner club" is accurate.
- Controllers: the game supports them on the web. If they work in the app on a real iPhone, iPad and Android phone, "Works with game controllers" can be added, and Apple's game controller badge set in App Store Connect. Not claimed until tested.
- Re-read the whole description against the build being submitted: anything the reviewer cannot find in the app is a guideline 2.3.1 rejection.
