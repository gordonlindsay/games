# Listing Copy: Drafts

**Status: drafts for the owner to edit.** Nothing here is final until the owner has read it and changed what he wants. Each piece of copy sits in its own block, ready to paste; `node tools/listing.mjs` checks every block against the store's length limit, the banned words and UK spelling, so run it after editing.

How it is written, and why:

- UK English, plain and parent-friendly. It says what the game has, not how good it is: no "best", "ultimate", "amazing" or "#1" (both stores reject superlatives and rankings in metadata, and parents read past them).
- No em dashes.
- No trademarks. Never "Six Nations"; also left out: "Grand Slam", "Triple Crown" (generic words, but closely tied to that tournament), "Pitchero", any professional club's name, and any local club's name except a Super Fan partner whose share is set and agreed.
- No price. The stores show the price in each country next to the listing, and a price in the text goes out of date or wrong abroad.
- Each store's copy names only that store's things (no "Android" on the App Store, no "iPhone" on Google Play).
- Super Fan is never a donation or charity. It says what the club gets, and what the share is of: a stated share of what we receive for each unlock (50% for Farnham RUFC, the owner's decision of 8 November 2026), never "of every unlock", which reads as a share of the price.
- Apple's copy names the **Kids level** as a level and never says who the app is for by age: guideline 2.3.8 reserves "For Kids" and "For Children" in metadata for Apple's Kids Category, and this app is in Sports. `node tools/listing.mjs` fails Apple copy with "for kids", "for children" or an age range.

## App Store

### Name (30 characters)

<!-- copy:apple.name -->
```text
Tryline Rugby Sevens
```

The owner's choice (20 characters). Check the name is free in App Store Connect when the app record is made. If it is taken, "Tryline: Rugby Sevens" (21) keeps the brand.

### Subtitle (30 characters)

<!-- copy:apple.subtitle -->
```text
Play and support your club
```

The owner's choice (26 characters), from "play as your club, with your career, for your game". His earlier option: "Your club. Your career." (23).

### Promotional Text (170 characters, can change without a new version)

<!-- copy:apple.promo -->
```text
Play as your club. Support your club. For the love of the game. Free: Quick Match, every Skills Mini Game and the Kids level. Unlock Championship and Career.
```

Opens with the owner's line. 157 characters.

### Keywords (100 bytes, commas, no spaces)

Apple already indexes the name and subtitle, so the keywords spend their 100 bytes on other words. No trademarks, club names or other games' names (guideline 2.3.7).

<!-- copy:apple.keywords -->
```text
tackle,try,career,arcade,sport,minis,junior,7s,scrum,lineout,training,league,offline,kicking,ruck
```

97 of 100 bytes. The first seven are the owner's list (rugby, sevens, kids, tackle, try, club, career, arcade, sport, minis, junior) less `rugby` and `sevens`, which are in the name, `club`, which is in the subtitle, and `kids` (dropped, below): a repeat earns nothing. The rest are generic words that fill the space; cut any of them freely.

**`kids` dropped (2026-11-08).** Keywords are not shown on the store page, but App Review reads them, and guideline 2.3.8 reserves "For Kids" and "For Children" in metadata for the Kids Category. In a Sports listing a bare `kids` is the one keyword a reviewer could read as aiming the app at children outside the Kids Category, so it is left out; the description still says honestly that there is a Kids level.

### Description (4,000 characters)

Two versions, for the two ways the first version can go out (LAUNCH_CHECKLIST.md, section 4). Paste the one that matches the build being submitted; `node tools/listing.mjs` says which, from `FAN_CLUBS` in src/store.js. While no partner club has `agreed:true` in the build, the app offers the Full Game alone and has no Add Your Team, so a description that sells Super Fan or Add Your Team sends the reviewer looking for things the app does not have (guidelines 2.1 and 2.3.1).

**Without Super Fan**: no club has `agreed:true` in the build. The copy names neither Super Fan nor Add Your Team (`node tools/listing.mjs` checks).

<!-- copy:apple.description -->
```text
Tryline Rugby Sevens is rugby sevens for your phone. Seven a side on a full pitch, seen from above, with one stick and three buttons: Pass, Kick and Sprint. Tackles, rucks, scrums, lineouts and goal kicks are all in. The big moments cut to a close-up with a clear cue, so a new player knows what to press and when.

Free to Play
- Quick Match against the computer, on Kids, Easy or Normal
- Skills Mini Games: eight short drills, from Bouncy Egg and Cones to Tackling and Kicking, each scored out of three stars
- How to Play, with control hints you can switch off

Full Game (a one-off unlock, no subscription)
- Championship: your team and five others over five rounds, with a league table and bonus points
- Career: one player at any club, season by season, with transfers, call-ups and training between matches
- Create Team: up to four teams of your own, with your kit, short name and abilities
- Hard level

The Teams
Twelve national sides, city sides from the leagues of England, France, Ireland, Scotland, Wales and Italy, South Africa, Australia, New Zealand and Japan, Scotland's club sides, and local clubs, as men, women or minis. Professional sides go by their city, club sides by their town, and every rating is made up.

Arcade Moments
On Fire: string three good moments together and your side lights up for a few seconds. A dominant tackle lands as a Big Hit. A drawn Quick Match goes to a Golden Try, sudden-death extra time.

For Parents
- No ads, no tracking, no accounts and no chat
- Nothing about you or your child is collected
- A grown-up check before any purchase or link out of the game
- The Kids level, a step below Easy
- Plays offline; only buying an unlock needs a connection
```

**With Super Fan**: a club has confirmed its share in writing, and `agreed:true` is in the build.

<!-- copy:apple.description.fan -->
```text
Tryline Rugby Sevens is rugby sevens for your phone. Seven a side on a full pitch, seen from above, with one stick and three buttons: Pass, Kick and Sprint. Tackles, rucks, scrums, lineouts and goal kicks are all in. The big moments cut to a close-up with a clear cue, so a new player knows what to press and when.

Free to Play
- Quick Match against the computer, on Kids, Easy or Normal
- Skills Mini Games: eight short drills, from Bouncy Egg and Cones to Tackling and Kicking, each scored out of three stars
- How to Play, with control hints you can switch off

Full Game (a one-off unlock, no subscription)
- Championship: your team and five others over five rounds, with a league table and bonus points
- Career: one player at any club, season by season, with transfers, call-ups and training between matches
- Create Team: up to four teams of your own, with your kit, short name and abilities
- Hard level

Super Fan
For supporters of a partner club. Everything in Full Game, and Add Your Team, which brings your club and its league into the game from your club's web page or a tournament link. Your club's kit and name go on your Super Fan badge, and your club comes first in Career and Championship. A stated share of what we receive for every Super Fan unlock goes to the club, and the game shows that share before you buy.

The Teams
Twelve national sides, city sides from the leagues of England, France, Ireland, Scotland, Wales and Italy, South Africa, Australia, New Zealand and Japan, Scotland's club sides, and local clubs, as men, women or minis. Professional sides go by their city, club sides by their town, and every rating is made up.

Arcade Moments
On Fire: string three good moments together and your side lights up for a few seconds. A dominant tackle lands as a Big Hit. A drawn Quick Match goes to a Golden Try, sudden-death extra time.

For Parents
- No ads, no tracking, no accounts and no chat
- Nothing about you or your child is collected
- A grown-up check before any purchase or link out of the game
- The Kids level, a step below Easy
- Plays offline; only Add Your Team and buying an unlock need a connection
```

### What's New (first version)

<!-- copy:apple.whatsnew -->
```text
The first version of Tryline Rugby Sevens.
```

## Google Play (Phase 2)

Google Play comes after the App Store launch (the owner, 8 November 2026: iPhone first). The copy is kept ready. Play's target audience includes under-13s (GOOGLE_PLAY.md), so stating the Kids level's ages is accurate there, and Apple's 2.3.8 does not apply to it.

### App Name (30 characters)

<!-- copy:google.title -->
```text
Tryline Rugby Sevens
```

### Short Description (80 characters)

<!-- copy:google.short -->
```text
Rugby sevens with one stick and three buttons. No ads, no tracking, no chat.
```

### Full Description (4,000 characters)

<!-- copy:google.full -->
```text
Tryline Rugby Sevens is rugby sevens for your phone and tablet. Seven a side on a full pitch, seen from above, with one stick and three buttons: Pass, Kick and Sprint. Tackles, rucks, scrums, lineouts and goal kicks are all in. The big moments cut to a close-up with a clear cue, so a new player knows what to press and when.

Free to Play
- Quick Match against the computer, on Kids, Easy or Normal
- Skills Mini Games: eight short drills, from Bouncy Egg and Cones to Tackling and Kicking, each scored out of three stars
- How to Play, with control hints you can switch off

Full Game (a one-off unlock, no subscription)
- Championship: your team and five others over five rounds, with a league table and bonus points
- Career: one player at any club, season by season, with transfers, call-ups and training between matches
- Create Team: up to four teams of your own, with your kit, short name and abilities
- Hard level

Super Fan
For supporters of a partner club. Everything in Full Game, and Add Your Team, which brings your club and its league into the game from your club's web page or a tournament link. Your club's kit and name go on your Super Fan badge, and your club comes first in Career and Championship. A stated share of what we receive for every Super Fan unlock goes to the club, and the game shows that share before you buy.

The Teams
Twelve national sides, city sides from the leagues of England, France, Ireland, Scotland, Wales and Italy, South Africa, Australia, New Zealand and Japan, Scotland's club sides, and local clubs, as men, women or minis. Professional sides go by their city, club sides by their town, and every rating is made up.

Arcade Moments
On Fire: string three good moments together and your side lights up for a few seconds. A dominant tackle lands as a Big Hit. A drawn Quick Match goes to a Golden Try, sudden-death extra time.

For Parents
- No ads, no tracking, no accounts and no chat
- Nothing about you or your child is collected
- A grown-up check before any purchase or link out of the game
- A Kids level made for 6 to 10 year olds
- Plays offline; only Add Your Team and buying an unlock need a connection
```

## Before Publishing

- Add a partner club's name to the descriptions only once its share is set in the game and the agreement is signed (see SUPER_FAN.md). Until then "a partner club" is accurate.
- The subtitle (Play and support your club) and the promotional text's opening line (Support your club) are the owner's, and stay with either description. Without Super Fan they read as playing as your club; if the owner would rather they waited for Super Fan, "Your club. Your career." (23) is his earlier subtitle.
- Google Play's full description (phase 2) still has its Super Fan paragraph: when the Play listing is made, the same rule applies, so drop it there too unless a club is agreed in that build.
- Controllers: the game supports them on the web. If they work in the app on a real iPhone, iPad and Android phone, "Works with game controllers" can be added, and Apple's game controller badge set in App Store Connect. Not claimed until tested.
- Re-read the whole description against the build being submitted: anything the reviewer cannot find in the app is a guideline 2.3.1 rejection.
