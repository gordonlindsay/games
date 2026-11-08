# Try Line Rugby

Mobile rugby sevens. Top-down 2D, one stick and three buttons, and a five-round championship. Play as one of the six
nations, a local Surrey club, a Top 14, Australian or South African side, or a team you make yourself. Professional
sides go by their city, not the club's name.

**Play:** https://gordonlindsay.github.io/games/trylinerugby/

## Arcade: On Fire, Big Hit, Golden Try

Matches you play are arcade; AI v AI, the demo, practice and the balance tools are not, so their numbers are unchanged.

- **On Fire.** A Big Hit or a turnover won is worth a point, a try two; three unanswered lights the side for 12 seconds: 6% quicker and half the handling errors, an orange glow and trail, and a banner. Any good moment by the other side, a broken tackle included, resets the run, and conceding a try puts the fire out. The meter beside each team code on the scorebug fills towards it. Both sides can catch fire; about two a match at the middle length.
- **Big Hit.** Your dominant tackle now takes the full banner, a 180ms freeze and a harder shake, and spills the ball 12% more often. Taking one shakes the screen too.
- **Golden Try.** Quick Match and Two Player level at full time go to sudden-death extra time, half a half long. Any score wins it; a try needs no conversion. Still level at its hooter, the draw stands. A championship keeps its draws.

Tuning lives in `ARCADE` in `src/arcade.js`; `node tools/arcade.mjs` checks it.

## Stamina

Stamina is the fifth ability, after Kicking: a fifth pip row on every team card and a fifth row in Create Team. Like the arcade, it only acts in matches you play. AI v AI, the demo, practice and the balance tools are unchanged: `node tools/stamina.mjs` plays seeded runs at different Stamina and compares them step for step, and the same kind of runs matched the build before Stamina exactly when it went in.

- **Sprint.** The meter lasts 10% longer for each point of Stamina above 3 and 10% shorter for each below. A full meter held without the ball: 1.6s at Stamina 1, 2.0s at 3 (as before), 2.4s at 5. The CPU side's meter follows its own Stamina.
- **On Fire.** Burns by the same measure: 9.6s at Stamina 1, 12s at 3, 14.4s at 5.
- **Fade.** Each side's Power falls in a straight line through each half and is back at half time; Golden Try extra time starts fresh. Lost by the hooter: 2.0 at Stamina 1, 1.55 at 2, 1.1 at 3, 0.65 at 4, 0.2 at 5. Top speed fades the same way, a little: 5% by the hooter at Stamina 1, 2.5% at 3, none at 5 (`staminaPace`, read by `maxSpeed`). Every engine read of Power goes through `powerOf`: the tackle, the Big Hit and the Fend, the ruck turnover, your scrum push, the CPU's push and the scrum played for you, and the Get Past and Tackle duel windows. Where Power meets Power (the tackle, the ruck, the scrums) two sides of the same Stamina fade together, so only a difference between them counts. The Fend needs a point of Power edge to the nearest point, so the fade moves it only once the two sides are half a point apart. The Get Past and Tackle windows set Power against Pace, so by the hooter a tired defender is a little easier to get past and a tired tackler a little less sure, whatever the other side's Stamina.
- **Ratings.** Nations: England 4, France 5, Ireland 5, Italy 3, Scotland 4, Wales 4; clubs 2 to 4. Create Team now has 12 points on top of 1 in each of the five (17 in all, still the strongest club's total). A team made before Stamina keeps every point and comes back with Stamina 3; a championship side saved without it, or any team without it, reads as 3, and a team without it that spends over the budget keeps its 3 and loses points from the other four. The overall badge is the five abilities (5 to 25) on 40 to 99: France and Ireland 93, England 84, a team you make 75 at most. Stronger Side still compares the other four abilities, 3 points apart, so it marks the same sides it did before Stamina. The championship's running order, weakest first, counts all five as the badge does, so a side with more Stamina can come later than it did: Toulouse drawn with Bordeaux, La Rochelle, Toulon, Nanterre and Paris now meets La Rochelle last, not first.
- **Worth its point.** The first cut (one point of Power lost at Stamina 1, no pace fade) left Stamina a poor buy: a made team that dumped it to 1 for the other four beat a balanced one by 6.8 points a match in CPU v CPU arcade runs. The owner chose a stronger fade over a separate Stamina budget. Measured now (80 seeded matches each, 2-minute halves): Stamina 5 against 1 on otherwise identical teams is worth +4.0 a match (was +1.4); 5,5,5,1,1 against 5,5,3,1,3 is level (-0.7, se 0.65); 4,4,3,3,3 beats 4,4,4,4,1 by +2.4; 5,5,5,1,1 against 4,3,3,2,5 is +3.2 (was +6.8), the rest being Pace and Power.
- The championship's simulated fixtures (`simMatch`) ignore Stamina, as they ignore the rest of the open game.

Tuning lives in `STAMINA` in `src/stamina.js`.

## Career

One player, from the minis to the national team. **Career** on the home screen makes him: a first name (optional, 12 letters at most, kept on this device only), Forward or Back, a shirt number (forwards 1 to 3, backs 4 to 7 in sevens) and a club from the Local list or your own teams, where an imported club appears too.

- **Five stages**, each a season of the championship's shape (six sides, five rounds, the same points): Minis and Juniors at your club against five other Local clubs at lowered ratings, County as Surrey against five invented county sides, Pro Club at a city side you sign for from the France, Australia or South Africa lists, and International for the country you pick when you are called up. A finished International season ends the career with the Hall of Fame and Start New Career.
- **Going up.** Finish in the top two, or reach the stage's bar with your overall (64, 70, 77, 85). Otherwise you play the stage again against a new draw.
- **Your player** has Pace, Power, Handling, Kicking and Stamina from 1 to 99, and an overall on the team cards' 40 to 99 scale. A session of training between matches (one a round) adds points to the drill's skill by its stars (1, 3, 5 or 8): Bouncy Egg and Create a Two-on-One train Handling, Pass Around the Circle Stamina as the Runner and Handling as the Passer, Tackling and Driving Power (no Driving in the Minis), Cones and Defend a Breakaway Pace, and the Kicking drill Kicking. His tries, tackles and goals in a match add a little more, six points at most.
- **In a career match only**, he wears a star and a ring in the kit's trim, the ring starts on him at every kick-off, he takes your side's goal kicks, and his ratings pull his own speed, catching, tackling, kicking, sprint and late-half pace from the team's halfway towards his own. A career season is a league, so it keeps its draws. Every other match plays exactly as before.
- **Pro Mode.** New Player's **Play as** row is Whole Team | My Player. Whole Team is first and picked: Pro Mode is the harder way. With My Player (`career.proMode`, chosen with the career and kept for it; a career saved before it is Whole Team) every career match is played as him alone. The ring stays on him all match and the stick moves only him. With the ball, Pass, Kick and Sprint are as ever; while a teammate has it, the big button is **Call for Ball**; defending, Tackle and Sprint are as ever and Switch is gone. His teammates, the carrier too, are run by the computer as the CPU side's men are: they run, pass, kick, drop for goal, offload and tackle by themselves, on your side's usual terms. He takes the goal kicks and plays only his own duels. A forward plays the scrums and lineouts; a back's are played for the team, with no close-up. On Kids a My Player match plays at Easy (`careerPlay` asks `startMatch` for `easy`): with Kids' gentler side his teammates won by themselves, 11 of 12 at the Kids start with him standing still (6 to 35 points). At Easy the same idle player won 4, drew 5 and lost 3, never by more than 6, so what he does decides it. A My Player match never moves the hidden Kids rating that Quick Match and Championship share (`kidsAdapt`).
- **Team Spirit decides how often they look for him** (the life bars' Team Spirit, 0 to 1; the middle until it is there). A teammate passes to him only when he is a sensible option: level with or behind the ball, 3 to 20m away, no defender within 4m of him (2.5m when he called for it) and none within 1.5m of the line to him. Never into trouble. An offload out of a tackle goes to him only within the engine's 9m offload range, as every offload does. At a pass the carrier was making anyway, he gives it to him instead 10% of the time at Team Spirit 0, up to 80% at 1. A carrier who has had it 0.4s, with no open grass of his own (a defender within 8m ahead), passes to him unprompted 0.05 times a second at 0, up to 0.7 at 1. A call is answered 25% of the time at 0, up to 95% at 1, 0.2s later; otherwise a No sign (a crossed-out circle) shows over the carrier. One call each 0.8s, and a call lasts one possession: if the ball goes to anyone before the answer, him included, the call is gone. Measured over 40 matches a value (Normal, 2-minute halves, a back, a scripted player who runs a support line 3.5m behind and 6.5m wide of the carrier and calls when a pass is on): passes to him a match, 7.6 at Team Spirit 0.2, 11.8 at 0.5 and 14.7 at 0.9; 6.8, 9.9 and 14.0 when he never calls. His side scores about 6 a match and concedes about 2 there; the same scripted player controlling the whole team scores 15 and concedes 5.
- **Dilemmas.** Before three of a season's five rounds (always the first, and never two rounds running without one, a season's end included) the hub asks a short question in place of the fixture and Play Match: two big buttons, each a name and chips for what it does, such as Extra Training (Handling +2, Energy −15) or Team Pizza Night (Team Spirit +12, Morale +6). Play Match comes back once one is picked. Twelve dilemmas, seven from the Minis, two more from the Juniors (Rest or Gym, Help Coach the Minis) and three from County (Physio or Bike Ride, Autographs or Sprints, Swim or Long Run). Training gives a skill (2 points) for Energy, resting gives Energy, going out with the team gives Team Spirit and Morale; the only cost is ever Energy, and every dilemma has an option that costs none. Which rounds, and which dilemmas, follow from the season (a hash of its id, never the game's random numbers), so a reload shows the same card and no match changes. Nothing grown-up: no drink, no money.
- **Energy, Morale and Team Spirit**, 0 to 100, are three thin bars under the skills on the player card, with what last moved them beside each. A new career starts at 80, 60 and 50, and so does one saved before them. At each full time: Energy comes back by a fifth of what is missing (at least 5); Morale goes a fifth of the way back to 50, then +8 for a win, +2 a draw, −6 a loss, and +1 for each of his tries, tackles and goals (3 at most); Team Spirit fades 4, and 1 more for every 10 it stands above 50 (9 at 100), then +1 for every six passes he throws or is thrown and +2 for each try he scores (6 at most): the more he is in the game the less it fades, but the higher it is the faster it goes, so only going out with the team keeps it high. A training session costs 8 Energy. Measured over twelve scripted careers of five seasons, through promotion, with real matches (the tools' bot, two-minute halves) and a drill every round: a player who always takes the training option goes into matches at Energy 65 on average in the Minis, where two dilemmas have no training option and he rests, then 47 from the Juniors on (most matches between 30 and 70, the lowest 13) and about 40 at Pro Club and International, and lets Team Spirit slide from 50 to about 35 by International (25 to 45); started at Team Spirit 100, the same player is down to about 78 in the Juniors and 57 at International. One who never answers lets it slide to about 30 by International. One who always rests stays near Energy 88. One who always goes out with the team takes Team Spirit to 80 in the Juniors and the high 80s from County on, often 95 to 100. Morale follows the results: the bot wins most of its matches and keeps it at 90 to 100 from the Juniors on.
- **What they do in a match**, read once at kick-off so nothing moves mid-match. Energy under 60 takes up to 2.5 points off his Stamina ability for the match (all of it at 0, down to 0), through the career's own sprint and late-half terms: for a new player, Energy 30 drains his sprint 10% faster and leaves him 2.5% slower by the hooter than at 60, Energy 0 18% and 4%. Morale plays his skills up to 5% higher at 100 and 5% lower at 0. Team Spirit, when you play as the whole team: while a teammate has the ball, his support line sits up to 70% closer to the ball at 100 (70% further out at 0, never tighter than 3.5m across and 1.2m behind), and a pass to him or from him is knocked on up to 30% less often (30% more at 0). Measured with the tools' scripted player, 100 seeded matches each with one-minute halves: passes to him 3.5 a match at Team Spirit 20, 4.6 at 50, 6.1 at 90; the ball in his hands 6.1, 7.9 and 11.4 times; 22.6m, 14.3m and 8.1m from the carrier on average; his side's score unchanged (11.6, 11.1 and 10.6 points). At Energy 60 or more, Morale 50 and Team Spirit 50 a career match plays exactly as it did before the bars, and no other match ever reads them. In Pro Mode, Team Spirit works through your teammates instead (Pro Mode's own rules).
- **Traits.** At 80 in a skill he earns its star trait (Hand-Off at Power 90), on him only; the hub shows all six as chips, a locked one dimmed with what it needs. See Star Traits.
- **Saving.** The career is its own field (`career`) in the browser save, with its own seasons. It never touches the championship or the Trophy Cabinet, and the championship never touches it. A broken season is dropped and redrawn for the same stage; the player is kept.

The rules and every number are in `src/career.js`, the screens in `src/ui-career.js`; `node tools/career.mjs` checks them. Pro Mode's are in `src/career-pro.js` (`PRO`), and `node tools/career-pro.mjs` checks them, Whole Team and every other match playing exactly as before it included. The bars and dilemmas are in `src/career-life.js` (`CAREER_LIFE`, `CAREER_DILEMMAS`); `node tools/career-life.mjs` checks them, and pins AI v AI, a Quick Match, a championship match, the demo, a drill and a career match at rest against the build before them.

## Star Traits

A few men with something special, as FIFA's players have traits. A team's 5s bring them and your career player earns them. Like Stamina and the arcade, they only act in matches you play: AI v AI, the demo, practice and the balance tools are unchanged. `node tools/traits.mjs` pins seeded AI v AI, demo and tool matches between star sides to the build before traits (30e13e2), and the same comparison over AI v AI, `simulate()`, the demo, two drills, a tool's match and an arcade match between sides with no star matched that build exactly when traits went in.

- **Burst** (Pace, the wing, No. 7). Sprinting, 8% more top speed at full burst and 40% more acceleration.
- **Crunch** (Power, a forward). His made tackles: 15 points more chance of a Big Hit and 5 more of jolting the ball loose.
- **Hand-Off** (Power, the centre, No. 6). A tackle on him holds 80% as often (an ankle tap from behind as ever), and every one he breaks is a Fend: he keeps his speed.
- **Safe Hands** (Handling, the scrum-half, No. 4). A knock-on at the catch a tenth as likely, and his offloads go astray 40% as often.
- **Long Boot** (Kicking, the fly-half, No. 5). His tactical kick lands where the cross says, then runs on twice as far; his side's penalty kick to touch goes 10m further; he takes his side's conversions and penalty goals, with a band 35% wider.
- **Engine** (Stamina, a forward). He feels 15% of the Power and pace his side loses over a half, and his sprint drains the meter half as fast.

Who has them:

- **Teams.** Each ability at 5 brings its trait, each on its own man; Power brings two. Which forward carries Crunch or Engine follows the team's name, so a side keeps its stars from match to match. England and Pretoria: Crunch and Hand-Off. France: Burst, Crunch, Hand-Off and Engine. Ireland: Safe Hands, Long Boot and Engine. Scotland: Burst. A team you make or import has them as soon as it has a 5 (12 points buy three 5s: four stars at most). Nothing is saved: they come from the abilities, so every old save has them.
- **Your career player.** Each at 80 in its skill, Hand-Off at Power 90, on him only. In a career match his shirt is his own: a team star that would wear it moves to the next shirt that fits. His traits come from his skills, so nothing new is saved either.

Showing them: a small gold star on each star's shoulder in the top view (not on your career player, who has his own star); one line on the team card under the ability rows naming them (three or four take a second line at 844 and 667 wide); and when a trait decides a moment, its name over the man. A moment it decides is one that would have gone the other way without him, read off the same draw: a Big Hit or a jolt only Crunch made; a tackle Hand-Off broke, or one that broke anyway and was a stumble without him and is a Fend with him; a catch or an offload that would have gone astray without Safe Hands. A Long Boot's kick, a Burst sprint and an Engine sprint late in a half always are. At most one every 4 seconds of play for each man: about 9 a match France v Ireland.

**What they are worth.** Measured as Stamina was: seeded CPU v CPU arcade matches, 2-minute halves, Normal, the same side at both ends with its stars kept on one and taken off the other, played both ways round on the same seeds, 2,000 matches a row over two seed sets (`node tools/traits.mjs --balance`, then again with `BAL_SEED=77000 BAL_STEP=104729`). Sides score about 4 points a match here.

- France's four stars: +0.55 a match (se 0.16; +0.70 and +0.40 on the two sets), won 46%, lost 39%. Ireland's three: +1.04 (se 0.17; +1.18 and +0.89), won 47%, lost 38%. Pretoria's two: +0.25 (se 0.13). All six on one side: +1.73 (se 0.18), won 53%, lost 35%. Never decisive: a side with every star still loses a third of its matches to the same side without them. The brief's aim of a few points a match for three or four stars is not met with the computer at both ends; France's Burst and Engine wait on sprints the computer seldom makes.
- One star on a side of 3s (first seed set, then the second where it ran): Long Boot +0.8, Hand-Off +0.4 and +0.3, Engine +0.3, Safe Hands +0.1 and 0.0, Crunch +0.1 and -0.1, Burst 0.0 and +0.1 (se 0.16 to 0.18): only Long Boot clearly counts on its own. Burst and Engine act mostly on a sprint, and the computer seldom sprints, so they are the player's: with the harness's player at the controls (Normal, duels live, 200 matches a row), France's stars add about 2 points a match to his margin (+17.8 to +20.0, se 0.8) and the computer's France about 0.7 to its own; Ireland's about 1 and 0.6.
- A stronger set (Hand-Off 0.72, Crunch 0.2 and 0.06, Long Boot 1.4 and 2.5, the rest a step up) moved France, Ireland and all six by nothing measurable (+0.8, +1.1 and +1.6 over 600 matches), so the gentler set stayed.

Tuning lives in `TRAIT` in `src/traits.js`; `node tools/traits.mjs` checks it.

## Training Ground

The home screen's **Training Ground** (it was Practice Ground) opens a grid of eight drills, each a drawn picture and a name. Every drill is short, has a ready card with one line on what to do, shows 0 to 3 stars on its result, and offers Try Again, Next Drill and Back to Training. Drills never write the settings, the tutorial memory or a championship. The one save a drill causes is the Locker's: a drill's first three stars count toward Star Pupil and are saved as the drill hands back the player's own settings (see Locker).

- **Bouncy Egg.** A thrower faces you and, after the same wind-up every time, spins the ball into the ground so it pops up at an odd angle, passes it flat, or throws it high. Run to it and catch it between knee and head height, from behind a line of marker cones six metres out (in his face, every throw would be caught as it left his hands). Twelve throws, quicker and wilder as they go; a ball that lands costs one of three hearts. Stars at 4, 7 and 10 catches.
- **Pass Around the Circle.** A ring of six. The runner passes, runs round the outside and must be home before the ball has gone all the way round; the ring grows a metre each round, five rounds. Pick a role on the ready card. **Runner**: hold the stick to run, and Sprint from a three-second meter (pace it: the last rounds need it). **Passer**: tap Pass as the white ring closes on the gold one; Perfect is quickest, an early tap is fumbled. Stars at 1, 3 and 5 rounds.
- **Cones.** Through a zig-zag of five gates, round the flag and back through three: a missed gate adds two seconds, a clipped cone one. Sprint on the straight back. Three stars inside 11.5 seconds, two inside 16.
- **Tackling.** One runner a rep, five reps. On the pitch, get into his path and stand still (Position). Then a side-on close-up, where his body is banded red, green and amber: aim at his thighs with the stick (Height: too high is always a fail, too low and he steps out), hold Tackle to load the meter (Power) and let go as he steps on the gold (Timing), then tap or hold to Squeeze. Each rep shows the five elements in green or red. Stars at 1, 2 and 4 good reps.
- **Kicking.** Five goal kicks, each further out and wider, the wind rising from calm to 18 mph. Stars at 2, 3 and 5 made.
- **Driving.** Three of the match's own scrums, the other pack stronger each time; a drive is won when your pack gains half a metre. Stars by drives won.
- **Defend a Breakaway** and **Create a Two-on-One** are as before, with three stars for a quick finish.

Bouncy Egg, the circle, Cones and Tackling run in a training space: the pitch, kits and controls of a match with none of its flow (`practice.space` makes `update()` skip `matchUpdate`, and the drill moves the men and the ball). Kicking and Driving use the match's goal-kick and scrum close-ups. Every engine hook checks `practice` first, so matches, AI v AI, the demo and the balance tools run exactly as before (checked: the same seeded AI v AI results and random draws as before the drills).

A caller can run a drill with `practiceStart(id, { onDone, leaveLabel })`: any way out of it (Back to Career, or the caller's `leaveLabel`, on the card; Back or Escape on the card; Pause then the pause card's Back to Career) restores the settings, shows the home screen and calls `onDone({ id, stars, success, skill })` once, with `role` for the circle. It reports the best finished run of the visit, so Try Again never loses a result already won; a visit with no finished run reports `quit: true` (0 stars). Each drill names the ability it trains: the circle's runner stamina and passer handling, Cones and Defend pace, Tackling and Driving power, Kicking kicking, Bouncy Egg and the two-on-one handling.

The drills are in `src/training.js` and the picker and card rules in `src/practice.js`; their styles are in `practice.css`. `node tools/drills.mjs` checks every drill's setup, a scripted success and failure, the star thresholds, `onDone`, and isolation.

## Locker

The home screen's **Locker** holds what a player has won: medals for feats, the balls and boots they unlock, and the Legends. Nothing in it is sold: no price, no store link and no ad anywhere in it.

**What the Full Game gates (an open question for the owner, 2026-11-08).** Two medals come from paid modes: Champions needs a Championship and Call-Up a career, and both are in the Full Game on the app's free tier (and on the web once `STORE_WEB_TIER` is `'free'`; `storeHas`, src/store.js). So a player who has not bought it can win 9 Golds at most (the eight match feats and Star Pupil), and Silver Boots, the Gold Ball, the Rainbow Ball and Boots and the 10th Legends side of each list (South Africa 2023, England 2025 Women) stay locked. A locked item shows the medal that unlocks it (Champions), which a child can read as a reason to ask for the Full Game. Either this stays and is accepted, or every ball, boots and Legend gets a way in without a purchase (say, a Legends side for any 10 Golds with a free feat standing in for each paid one). Silverware and Call-Up cannot be won by anyone on this build yet (below).

**Medals.** Twelve feats, each with Bronze, Silver and Gold for doing it 1, 3 and 10 times. A feat counts once in a match at most, at full time, in any match you play: Quick Match, Championship, Career and Two Player, at any level, Kids included. AI v AI, the demo, a drill's match and a tool's headless match never count, and nor does a match left before full time. In Two Player the medals are Player 1's (side 0): one device, one Locker, and that is the simplest rule a child can follow. The full-time card shows them under Player 1's seat tag, so Player 2 never takes them for their own.

| Feat | What it asks | Bronze unlocks | Silver unlocks |
|---|---|---|---|
| Hat-Trick | Score 3 tries in a match. | White Ball | Red Boots |
| Sharpshooter | Kick 3 goals in a match (conversions, penalty goals and drop goals). | White Boots | Sky Blue Ball |
| Big Hitter | Make 3 Big Hits in a match (in open play or a Tackle duel). | Red Ball | Blue Boots |
| Clean Sheet | Win and let in no tries. | Sky Blue Boots | Blue Ball |
| Golden Try | Win in Golden Try. | Orange Ball | Yellow Boots |
| Comeback | Win after losing at half time. | Orange Boots | Purple Ball |
| Drop Goal | Score a drop goal (a drop kick or any kick through the posts in play). | Pink Ball | Pink Boots |
| On Fire Twice | Go On Fire twice in a match. | Neon Green Boots | Neon Ball |
| Champions | Win a Championship. | Silver Boots | Gold Ball |
| Star Pupil | Get 3 stars in a drill. | Purple Boots | Stripes Ball |
| Silverware | Win a cup or a crown. | Silver Ball | Gold Boots |
| Call-Up | Get called up. | Rainbow Boots | Rainbow Ball |

Every Gold unlocks the next Legends side of each list. Star Pupil counts drills, each once, so its Gold is every drill (eight today; never more than ten). Champions counts a Championship won (first in the final table); Silverware and Call-Up count what the silverware and career work report (below), so on this build they cannot be won yet.

**Balls and boots.** Thirteen balls (Classic, the ball as it always was, and twelve more: White, Pink, Neon, Sky Blue, Orange, Red, Blue, Purple, Silver, Stripes, Rainbow, Gold) and thirteen pairs of boots (Black, the default, and White, Red, Blue, Neon Green, Pink, Orange, Sky Blue, Purple, Yellow, Silver, Rainbow, Gold). The chosen ball is the ball in matches you play, in the top view and the close-ups; the chosen boots are your side's, their toes showing under each man as he runs in the top view and on the close-ups' figures (in a career match, his boots only; Rainbow gives each man his own colour). Classic and Black draw exactly as before, and AI v AI, the demo and the drills always do.

**Legends.** The sides that won a World Cup, named by nation and year only: never a player's name, likeness or nickname. The nth Gold unlocks the nth side of each list, in date order. They join the team screen's International list once unlocked, after the nations, for Quick Match, Two Player, or as your own Championship side; they never enter a draw the player did not pick (no championship opponent, no demo, no career). Ratings are made up, at the top of the scale: every ability 5 (overall 99) or one 4 (96); the style is the side's strength. Kits are the nation's colours. The years were checked on 2026-11-08 (the 2021 women's World Cup was played in 2022).

| Gold | Men | Code | Style | Overall | Women | Code | Style | Overall |
|---|---|---|---|---|---|---|---|---|
| 1 | New Zealand 1987 | L87 | Pace | 96 | USA 1991 Women | W91 | Pace | 96 |
| 2 | Australia 1991 | L91 | Handling | 96 | England 1994 Women | W94 | Power | 96 |
| 3 | South Africa 1995 | L95 | Power | 96 | New Zealand 1998 Women | W98 | Handling | 96 |
| 4 | Australia 1999 | L99 | Stamina | 96 | New Zealand 2002 Women | W02 | Power | 96 |
| 5 | England 2003 | L03 | Kicking | 96 | New Zealand 2006 Women | W06 | Stamina | 96 |
| 6 | South Africa 2007 | L07 | Power | 96 | New Zealand 2010 Women | W10 | Handling | 99 |
| 7 | New Zealand 2011 | L11 | Handling | 96 | England 2014 Women | W14 | Kicking | 96 |
| 8 | New Zealand 2015 | L15 | Pace | 99 | New Zealand 2017 Women | W17 | Pace | 96 |
| 9 | South Africa 2019 | L19 | Power | 96 | New Zealand 2021 Women | W21 | Pace | 96 |
| 10 | South Africa 2023 | L23 | Stamina | 99 | England 2025 Women | W25 | Power | 99 |

A women's side is already named Women and carries `cat:'women'`, so the team screen's Men | Women | Minis (`catSide`) leaves its name alone. `lockerLegends(cat)` returns the unlocked sides of one list: `'men'` or `'women'`, with Minis playing the men's. On this build `renderTeams` adds them to International in one guarded line; under the new hierarchy that line moves into `natList(cat)`.

**The screens.** On the home screen the Locker button sits with the logo, so no row of buttons changes in any state: on a phone held sideways at the right of the tagline, level with the settings' right edge, and on a taller screen at the right end of the logo's line (adding no height). With a Trophy Cabinet, where the home already scrolled at 844x390 and 667x375 before the Locker, it adds nothing to that scroll. The brief asked for a balanced row; the logo's place keeps every row as it was, and waits on the owner's sign-off. A dot on it means a medal is waiting unseen. The Locker itself is four tabs, Medals, Ball, Boots and Legends, with Back to Menu; on a phone held sideways the title, the tabs and Back to Menu stand on the left and each tab fits the right without a scroll at 844x390 and 667x375. Medals: a tile a feat, its picture, name and one line, three pips in bronze, silver and gold, and the count to the next (2/3). Ball and Boots: each drawn in its colours; a locked one is dimmed with the pip and name of the medal that unlocks it. Legends: each unlocked side's shirt, overall, nation and year; a locked one is a padlock and the Gold count it needs. The full-time card shows a row for each medal that match won (the medal in its colour, the feat, and what it unlocked), and a New Legends line for a Gold. Only that match's: the Locker's tiers are noted as the match begins counting (`lockerFrom`, kept on `M.lkFrom`), so a medal won between matches (Star Pupil in a drill, an event from a menu) is never shown as the next match's, won or lost, and keeps the dot on the home's Locker button and its ring in the Locker instead. On a phone held sideways the card widens and they stand beside the score and the stats, spanning just the rows the mode shows; the left column keeps the card's own width, so the medals never make the card taller, in Quick Match, Two Player (with its series and Change Teams | Back to Menu), a Championship or a career.

**For other work.** `lockerEvent(id)` counts a moment from elsewhere in the game, and returns true when it counted. Callers outside `src/locker.js` use `typeof lockerEvent === 'function' && lockerEvent(id)`.

- `'champ'`: Champions. The Championship's own league win already calls it (`lockerMatch`, at full time).
- `'euro'`, `'world'`, `'tour'`, `'triple'`: Silverware (European Cup, World Cup, Home Nations Tour, Triple Crown).
- `'callup'`: Call-Up.
- `'transfer'`: no medal yet; it counts nothing and returns false.

Inside a match you play, one medal counts once a match however many of its ids come; between matches each call counts and saves. Nothing counts from inside a drill.

**For the new player art.** The renderer's only links to the Locker are two reads, so a new renderer carries them over by calling the same two:

- `lockerBall()`: the ball's look in a match you play, `{ id, name, fill, line, band?, rainbow?, shine? }`, or `null` for the classic ball (`#f6f3ea`, outlined `#3b2f22`). `band` is a stripe colour (two stripes a third of the way in from each end), `rainbow` the colours along its length (`LOCKER_RAINBOW`), `shine` a white sheen across it. `lockerBallFill(look, rx)` turns a look into a canvas fill along the ball's own length; the current renderer uses it in `drawBall` (top view) and `cutBall` (close-ups).
- `lockerBoots(team, p)`: the colour of man `p`'s boots, or `null` for none (the top view) or black (a close-up). `p` may be `null` for a close-up figure that is no one in particular: the side's colour, or `null` in a career match, where only his are coloured. The current renderer draws the toes with `lockerFeet(colour, r, p)` in `drawPlayer`, and `kitOf(team, p)` carries `boots` to the close-ups' figures. A close-up that knows the man it draws passes him as `p` (the goal kick its kicker, a duel its two or three men), so in a career match his own boots show on him there too; a figure that is no one in particular (a scrum, a lineout) passes nothing. A new renderer's close-up of a known man passes him the same way.

**The save.** One field, `locker`: `{ n:{ feat:count }, drills:[ids], ball, boots, seen:{ feat:tier } }`, written only once something is in it, so a save with nothing earned is exactly as it was and an old save loads with nothing earned. `cleanLocker` puts anything broken right (unknown feats and drills dropped, counts whole and capped at 9999, a ball or boots not unlocked by those counts back to the default, `seen` no higher than won). No names and no personal data. A drill's three stars are held until the drill hands back the player's settings, then saved once.

**Engine hooks.** Three plain counters, made only in a match you play and never drawing a random number: `lockerTally('drops', team)` in `dropGoal`, `lockerTally('hits', team)` on a Tackle duel's Big Hit, and `lockerHalf()` at the second half's kick-off (the half-time score, for Comeback). Big Hits in open play, On Fire, tries and goals are read from what the match already counts.

The rules are in `src/locker.js` and the screens in `src/ui-locker.js`; the styles are the `locker` block at the end of `styles.css`. `node tools/locker.mjs` checks the tables and the Legends; every feat counted from real played matches (seeded Quick Matches, a Kids match, a career match, Two Player and a Championship's last round, played to full time); tiers, events, unlocks and Star Pupil's save; nothing counted in AI v AI, the demo, a drill or a tool's match; the save; the full-time card, the home dot, the screens and the team screen's hook; the render hooks; and a fingerprint pinning AI v AI, the demo, a balance tool's match, a tool's match, a played Quick Match and a drill (with their random draws) to d6192ad, the build before the Locker. Where Playwright is installed it also checks, in Chromium, the home in all eight states (phone or computer, web or app, with or without a championship and a career under way) at 844x390 and 667x375, and the same eight with a Trophy Cabinet (the Locker adds no height), every Locker tab at both sizes, its keyboard and controller reach, Continue on a full-time card with medals, and full time in Quick Match, Two Player (series shown), a Championship and a career with and without medals (never taller with them).

## Kids

A level below Easy for 6 to 10 year olds, and a grown-up check in front of anything that leaves the game. The home Difficulty row reads **Kids | Easy | Normal | Hard**; a new game starts on Normal as before, and an old save loads on the level it had.

**How it is stored.** `settings.kids`, a flag layered on Easy: Kids saves `diff:0, kids:true`. Every lever table in the engine (`DIFF`, `KICK.fill` and `band`, `SPRINT`, `CONTACT.contact`, the duel windows, `COVER`, `MOVES.dummy.bite`) is an array by level 0..2, and the save keeps `diff` as 0..2, so a fourth level would mean a fourth entry everywhere or a shift in what a saved value means. As a flag, a saved `diff` means what it always did, a save without the flag loads unchanged, and anything that reads `settings.diff` or `levelOf` sees Easy, the nearest level. The flag counts only with `diff` 0.

**Who gets it.** `newMatch(..., { kids:true })` sets `M.kids` only for one player on Easy: never AI v AI, the demo or two player, whatever is asked. `startMatch` passes `kids:kidsLevel()` and the rating, so Quick Match, Championship and Career play it. In the Training Ground only the Kicking and Driving drills ask for it (`kids:true` in `PRACTICE_DRILLS`), so at Kids the kicks have the aim set and the wider, slower band, and your pack has the extra shove; the training spaces never read `M.kids`, and Defend a Breakaway and Create a Two-on-One stay on Easy (Kids' automatic switch would play Defend for you). Every lever reads `M.kids`, so the sims, the demo and the balance tools draw exactly what they drew before: AI v AI at all three levels, the bot's matches at all three levels and the demo hash identically to the build before Kids (SEED 5).

**The rating.** Kids is a scale, not one setting, and it starts easy and gets harder as the child wins. One hidden number, `settings.kidsR`, runs from 0, where every child starts (Kids exactly as it was before the scale), to 1, the ceiling, where every lever on the scale is 80% of the way from there to Easy, so still a little easier than Easy. As a Kids match starts, `kidsTune(r)` puts each lever in `KIDS_SCALE` on the straight line between its start and its ceiling. Four aids hold all the way up the scale: the aim set at a goal kick (the path shows it, the stick does nothing, the hints and tutorial say so) and a release in the gold struck true, any button acting in a close-up (a button in a Get Past goes the open way), the ring moving to your best defender once it has sat 0.5s on a man, and your man chasing the ball at 80% of his pace when you let go of the stick. Quick Match, Championship and Career all play the child's one rating (`startMatch` passes it). The Kicking and Driving drills keep the help they always had, the start of the scale, whatever the rating.

**Reset Kids Level.** One device keeps one rating, so siblings share it. Grown-Ups (in the app, and on the web once it is on the free tier) shows **Reset Kids Level** under Privacy and Support once the rating has moved; behind the grown-up check it puts `settings.kidsR` back to 0 and says so. `tools/together.mjs` section 12 pins it.

**Move Up to Easy.** A child who has outgrown Kids gets a quiet nudge to a grown-up, never to the child: after five Kids wins in a row by 5 or more tries at the top of the scale (`KIDS_EASY` in src/kids.js), the home's Grown-Ups button carries a dot and Grown-Ups offers **Move Up to Easy**, behind the grown-up check. The threshold comes from replaying the calibration's settle runs: it never came up for the 7 to 8 year old (0 of 32 runs), the 6 year old or the stick masher, and came up for every sharp 10 year old (median match 39). The Kids rating is kept for a sibling. `tools/together.mjs` section 13 pins it.

| Lever (`KIDS_SCALE`, `src/kids.js`) | Easy | Kids start (r 0) | Kids ceiling (r 1) |
|---|---|---|---|
| The other side's pace (`diff.cpuSpeed`) | 0.97 | 0.92 | 0.96 |
| Their tackle on your carrier (`diff.cpuTackle`) | 0.56 | 0.45 | 0.54 |
| Their interceptions, ruck turnover edge (`cpuIntercept`, `turnover`) | 0.10, -0.03 | 0.05, -0.05 | 0.09, -0.035 |
| Their scrum, lineout contest and jump spread (`scrumCpu`, `lineContest`, `lineSigma`) | 0.60, 0.55, 0.19 | 0.45, 0.35, 0.28 | 0.57, 0.51, 0.21 |
| Your ringed man's contact tackle and dive (`tackle`) | as set | +0.10 | +0.02 |
| Your side's knock-ons on a catch (`hands`) | as set | a tenth | 0.82 of them |
| The ball jolted from your tackled carrier (`jolt`) | as set | 0.15 of it | 0.83 |
| Your offloads that get away (`offload`) | 70-85% | 95% | 85% |
| How far your passes stray (`passErr`) | as set | 0.4 of it | 0.88 |
| The gold ring in a close-up (`duelWin`) | as set | 0.2s longer | 0.04s longer |
| A close-up you get wrong, early, late or the wrong way (`save`) | lost | always comes off | comes off 20% of the time |
| Goal kicks: the gold band, its cap, the meter, drop-goal chargers (`kick`) | as set, 0.24, as set, full pace | twice as wide, 0.34, 1.6x slower, 65% | 1.2x, 0.26, 1.12x slower, 93% |
| Your scrum shove and lineout reach (`scrum`, `reach`) | | +0.25, +0.12m | +0.05, +0.03m |

After each completed one-player Kids match (`kidsAdapt`, called from `finishMatch`: full time only, so never a match quit early, and never practice, AI v AI, the demo, two player or a career's My Player match, which his teammates play) the rating takes one fixed step, by the result in the child's side's points and tries (`KIDS_ADAPT`):

- a win by more than 3 tries: up 0.05;
- any other win (a win on a kick included): up 0.01;
- a draw: down 0.01;
- a loss: down 0.05, or 0.10 by two tries or more.

A step is the same size anywhere on the scale; 0 and 1 only stop it. So a loss near the start lowers the rating as surely as one near the top, and a child who loses more often than he wins goes back to the start. (The first version moved it a share of the way to the ceiling or the start, so near the start a loss barely moved it, and at 0 not at all, while a win still lifted it: a child who lost most of his matches was held above the start, where he lost more. It also shrank each step up by what was left to the ceiling, which held the 7 to 8 year old at about 0.85, short of the top, winning by 3.2 tries.) No match moves it more than a tenth of the scale, and twenty big wins in a row take it from the start to the ceiling. It settles where a child's wins and losses balance: below that point his wins outweigh his losses and it climbs, above it the other way, and the nearer it gets the more nearly they cancel, so it drifts in more and more slowly rather than swinging from end to end. It is saved with the settings, a number from 0 to 1 kept to three places; anything else is ignored, and a save from before the rating starts at 0. Nothing on screen shows it, and nothing says the game got harder.

**Calibration.** `node tools/kidbots.mjs` plays scripted children against the CPU through the real input path, 2-minute halves, Quick Match's rules (On Fire, the Golden Try), each match on its own seed (SEED 7):

- **6 year old**: defends a quarter of the time, and for 40% of the rest still pushes the stick at the try line (otherwise he lets go of it, and the chase takes over); reacts about 0.9s late to a change of possession; a weaving run, a pass or a chip now and then at random, no side step, no Sprint; presses in 60% of close-ups at a random moment; a goal kick released anywhere within 0.25s of the gold's centre; slow scrum taps.
- **7 to 8 year old** (the one the level is aimed at): defends 60% of the time, and for a quarter of the rest pushes the stick at the try line; reacts about 0.5s late; passes when a tackler is on him now and then, steps away from the man in front on 40% of his carries, sprints into space on 30%, offloads on a fifth of the cues; presses in 90% of close-ups about the gold (0.2s spread), the right way three times in four; a kick released within about 0.12s of the centre.
- **sharp 10 year old**: the harness's average player (`bot`), the aim left to Kids.
- **stick masher** (`masher`, run only when named): the 6 year old, except that he never defends, keeps the stick pushed at the try line 70% of the time instead of letting go, and presses in every close-up at a random moment. He is there to check that a child who struggles is taken back down.

| Child | Easy | Kids start (r 0) | Where r settles | Settled | Kids ceiling (r 1) |
|---|---|---|---|---|---|
| 6 year old | 15-11, tries 2.3-1.4, won 57% | 42-7, tries 6.0-0.9, won 94% | 0.73 ± 0.01 | 26-13, tries 3.9-1.8, won 72% | 21-15, tries 3.2-2.2, won 60% |
| 7 to 8 year old | 17-7, tries 2.5-0.9, won 74% | 47-2, tries 6.7-0.2, won 100% | 0.96 ± 0.004 | 24-7, tries 3.6-0.9, won 81% | 24-7, tries 3.6-0.9, won 80% |
| sharp 10 year old | 36-2, tries 5.2-0.25, won 96% | 65-1, tries 9.2-0.05, won 100% | 1.00 (0.999) | 40-2, tries 5.8-0.13, won 99% | 40-2, tries 5.9-0.14, won 99% |
| stick masher | 15-14, tries 2.4-2.0, won 55% | 39-20, tries 5.5-3.0, won 76% | 0.12 ± 0.01 | 36-22, tries 5.1-3.3, won 69% | 20-32, tries 3.0-4.8, won 35% |

Each fixed column is 200 matches (`node tools/kidbots.mjs at easy`, `at 0,1`); the try margin's standard error there is about 0.2 tries (0.3 for the masher). Where r settles is 16 runs of 150 matches from r 0 (`node tools/kidbots.mjs settle`): the mean rating over matches 61 to 150 of each run, ± the standard error across the 16 runs, and Settled is those 1,440 matches (the margin's standard error 0.07 to 0.11 tries counting each match on its own; across the runs, where the rating's feedback holds each run's results together, 0.03 to 0.06). The runs' mean rating is within 0.05 of where it settles by match 36 for the 7 to 8 year old, 52 for the 6 year old, 22 for the 10 year old and 6 for the masher, and stays there to match 150, so the runs have stopped climbing well before the matches counted. The same runs on another seed (SEED 13) agree: the 6 year old settles at 0.72 ± 0.02, winning 73% by 2.14 ± 0.09 tries, and the 7 to 8 year old at 0.96 ± 0.004, winning 81% by 2.74 ± 0.07.

Settled, the 7 to 8 year old sits at the top of the scale (0.96) and wins 81% of his matches by 2.70 ± 0.07 tries (median 3): 38% by 4 tries or more, 27% by 2 or 3, 17% by 1 or less or on a kick, and he draws or loses the rest. He concedes no try in 46% of them, one in 31% and two or more in 23%. That is the aim (most matches won, by about 2 to 3 tries, a try conceded now and then), but at the top of its range rather than in the middle: 2.7 tries is the least margin the scale gives him (2.72 ± 0.20 at r 1), and his margin spreads about ±2.8 tries from match to match, so a win by 4 or more is still his single commonest result. Bringing him nearer 2.5 would take a firmer ceiling, and the ceiling is already only 0.1 tries of margin easier than Easy for the 6 year old. The 6 year old still wins most (72%, by 2 tries at the median) at 0.73. The 10 year old reaches the ceiling within about 25 matches, still wins 99% there by 6, and belongs on Easy. The masher is held near the start (0.12), winning 69%; under the first rule he would have been held at about 0.48, winning 55% (that figure is the rule replayed over the fixed-rating matches, every 0.1 of the scale, not a run of its own).

Easy against the ceiling, the ceiling is a little easier for each of the first three children: 0.1 tries more margin for the 6 year old, 1.1 for the 7 to 8 year old, 0.7 for the 10 year old. The always-on aids are most of that; with the scaled levers at 90% of the way to Easy instead of 80%, the 6 year old did no better than on Easy. Not for the masher: he wins 55% on Easy and 35% at the ceiling, because the automatic switch hands his stick to the man best placed to tackle and he runs that man towards the wrong try line. The rule keeps him near the start, where Kids still helps him.

Before the scale (Easy against Kids for the same player, scratch bots, SEED 7 and 11): the harness's average player went from 30-2 to 60-1, a rough child who defends half the time from 13-6 to 37-1, and one who never defends from 9-13 to 35-2. The hands-off chase is what saves a child who never defends: without it that child conceded 3.1 tries a match even on Kids; with it, 0.2. Its pace hardly matters (0.15 to 0.2 tries against from 60% to 80%; 0.03 at full pace), so it runs at 80%, a little behind his teammates.

AI v AI at all three levels (asked to play Kids or not), the demo, the harness's player at Easy, Normal and Hard (with and without Quick Match's arcade) and two player at three pairs of levels all hash identically to 0397251, the build before the rating (SEED 5 and SEED 41, with the fixed-step rule), with the same number of random draws: nothing outside Kids changes.

**Two Player** keeps Easy | Normal | Hard per player. Kids there would need its own per-player store, per-side levers and a rule for a close-up the other player chooses; Two Player is for computers, so it is left as it is.

**The grown-up check.** `parentGate(onPass, onCancel)` opens `#m-gate`: "Ask a Grown-Up", a multiplication written in words (a teen times six to nine with a three-figure answer: 22 questions, 102 to 171), and ten figure keys with Delete | Cancel (two rows of five on a screen under 560px). Only the right answer calls `onPass`; a wrong one asks a new question, and a second wrong one in a row rests the keys ("Wait", the keys dimmed and a bar running down) for 10s, then 20s, 40s and 60s at most until a right answer. The rest outlives the card, so shutting it and opening it again does not skip it; in the app it outlives the game too (the rest's end and the count of rests are kept under `tryline.gate` and read back at start), so closing the app does not skip it either. Tapping 9 and 0 in turn, which passed the first cut in about 100 taps, now never passes, and a thousand random guesses take about eight hours of rests. Touch, the keyboard (figures, Backspace, Escape, Tab inside the card: the rest of the page is inert) and a controller (the card is the nav layer; Back is Cancel) all reach it. Opened by touch or the keyboard, the DOM focus starts on 1; opened from a controller, the chalk ring does and there is no DOM focus, so only one key is outlined. The card sits over every other card and under Turn Your Phone Sideways (`#rotate`, raised to z-index 40 so it covers the practice card as well). Where the game reaches outside itself:

- **Install Game** (the browser's install prompt): behind the check.
- **Import** (App Store build): the import code calls the check before it fetches.
- **Update Game**: not gated. It applies the game's own files, which the browser has already downloaded from the game's own site.
- **The service worker** and **Google Fonts**: automatic loads of the game's own files and its two typefaces, not something a child opens. There are no ads or share buttons; every purchase, Restore Purchases and the Privacy and Support links are behind the check too ([store/README.md](store/README.md)).

[PRIVACY.md](PRIVACY.md) says what the game stores and that it collects nothing.

**App Store Kids category checklist.**

- Done: no ads, no analytics, no tracking, no accounts or chat, and every purchase behind the grown-up check (`tools/kids.mjs` checks the bundle for the usual ad and analytics names and the page for links); nothing about the player leaves the device; the grown-up check before installing and before import; a privacy note; a level a 6 year old can play.
- Remains for the native build: bundle the two fonts so no request goes to Google; host PRIVACY.md and give its address, with a contact address, in App Store Connect; choose the age band (6-8 suits Kids) and declare Data Not Collected; add no SDK that collects anything (analytics, crash reporting, ads) to the Capacitor project; put `parentGate` in front of every native-only way out (import's fetch, any support, rating or privacy link); hide Install Game and Update Game, which mean nothing in the app; check the card on an iPhone and an iPad, VoiceOver included.

**The home on a small phone.** At 420px tall and below, Difficulty's four buttons take the settings panel's top row and Sound, Match Help and More Settings share the second in three columns (opened, More Settings keeps its cell and Half Length takes a row under it). The left column is at least 288px wide so each On | Off stays 44px, and the home buttons give up some side padding so the right column's labels stay on one line. The closed home fits 844x390 and 667x375 without a scroll.

**The ring in a tackle.** On Kids the ring never leaves your man while he is bound in his own tackle, so a dominant one is still his Big Hit (and Tripped and Ankle Tap are still his).

`node tools/kids.mjs` checks the setting, the save (a round trip, old saves on each level, partial and bad ones), each lever on in Kids and off on Easy and in AI v AI, the ring staying on a bound tackler, the rating (the scale's start and ceiling lever by lever, the straight line between them, bounds, the update rule and its step sizes, each step the same size anywhere on the scale, a child who loses every other match going back to the start and one who wins big climbing to the top, its save, old saves, and who moves it: Quick Match, Championship and Career at full time, never a match quit early, Easy, two player, AI v AI, the demo or a drill), the check's pass and cancel paths, its three-figure answers, its rests (two keys in turn and random taps), the controller's focus, and its place over the other cards. `node tools/kidbots.mjs` is the calibration above: tens of minutes long, so not part of `check.mjs`.

## Practice + Polish (review branch)

The home screen pairs **How to Play** and **Practice Ground** in matching buttons. **Match Help** switches control hints and first-match coach tips together, retaining existing browser saves. Practice Ground offers: defend a breakaway, create a two-on-one, and kick a conversion. Each drill uses the match engine and controls, with feedback, retry, next drill and return to selection. Practice does not advance a championship or write match settings, played count or tutorial progress.

The deployed page remains buildless. `index.html` holds the screens, `styles.css` the existing styling, `practice.css` the practice layout and committed `game.js` the generated browser script. Serve this folder over HTTP; playing needs no package installation or build step. Development sources live in `src/`, with the build and checks below.

Pass and Kick now dim while your pass is airborne, then reactivate on the catch. Opponent possession still offers defensive controls. A pressured selected receiver now also reads **Marked**, and useful defensive cover reads **Switch**. Resuming from pause cancels a tactical kick charge, preventing an unintended kick when the button was released while paused. Match balance is unchanged. Touch actions now track their owning finger: lifting another finger does not release a held action, and cancelled Switch/Sprint presses do not switch defenders. Cancelling touch preserves other input sources; losing browser focus clears touch ownership so the next press works.

Run the new checks with `node tools/practice.mjs` and `node tools/polish.mjs`. Existing checks use `tools/source.mjs` to read external sources; `GAME=/absolute/path/to/index.html` still supports old inline snapshots for comparisons.

## Championship progression

Played championship fixtures now retain your team's full-time counters, with expandable match details and season totals. Older results keep their scores and tries; the summary states how many matches have detailed stats. Opponents' simulated fixtures have scores and tries only.

The Trophy Cabinet keeps the last ten completed seasons on this device, including your team, finishing place, win/draw/loss record, points, tries and honours. Start Fresh resets the current campaign while preserving completed seasons. It takes a second tap, as every confirm in the game does (Quit, Delete Team, Career's Start Fresh and Start New Career, Remove League), and the second tap counts only half a second or more after the first (`CONFIRM` in src/ui-menus.js), so a quick double tap only asks. Older completed campaigns can be imported without duplicate awards; identical legacy season records without an ID count as one saved season. Practice, demos and ordinary simulations do not add records.

The hub and the home screen provide cabinet access. Expandable stats and cabinet panels work with touch, keyboard and controller navigation. Nothing changes scoring, match balance or the championship table rules.

## Import

**Import Club**, beside Create Team on the team screen, takes a Pitchero or tournament link and builds your club and its league. Your club joins your teams like one you made, with its name and shirt colours, the whole budget spent evenly over every ability (the odd points to pace and handling), and an Edit button. The league's other sides, at most 16, are saved too, and a **My League** button then appears with International, Local and the rest. A championship picked from My League is your club and five drawn from the league; a league of fewer than five is topped up with Local clubs. Ratings are made up, as the built-in clubs' are, over every ability: a table's leader totals what a team you make can (14 with four abilities), its foot one point an ability less, and fixture opponents fall between. Sides whose names would shorten to the same keep their labels (Sevenoaks A, Sevenoaks B), or the later one is left out. With four teams made, Import Club stays while a league is saved, to refresh or remove it, and brings in a league without its club.

Fetching happens only in the Try Line app (Capacitor's native HTTP), after a grown-up check (`parentGate`, from the kids work). The web build never fetches, and the card says **Import Works in the Try Line App**. Browsers could not read these pages from another site anyway: Pitchero sends no CORS header. One import makes at most three requests, all to the pasted page's site: the page, then its league table and its fixtures while no league has turned up. Redirects are followed by the game, not the platform: each Location is checked as a pasted link is and counts as one of the three. Back while it imports stops the requests. Each request has a 12-second timeout, and Pitchero gets five seconds between them, as its robots.txt asks. The only header that names the game is a plain `TryLineRugby` User-Agent. Links must be http or https (sent as https). IP addresses, local names, logins, odd ports and other schemes are refused, and tracking parameters are stripped.

The Pitchero adapter follows real pages (see `tools/fixtures/import/README.md`). Everything is in `__NEXT_DATA__`: the club at `props.club`, the season's table and the fixtures under `props.initialReduxState.teams`, with the club's own row marked `is_highlighted`. Minis pages usually have no table, as age-grade rugby publishes none, so their fixture opponents become the league. Any other page is read by its standings table (a Team column with P, W, D, L and Pts), JSON-LD, og:site_name, theme-color and any embedded JSON.

Safeguarding: only club and team names, shirt colours and table numbers leave a parser. Subtrees that can hold people (squads, players, staff, contacts, authors, reports, photos, leaderboards, rankings) are never read, JSON rows are read as a table only under a key that names one (standings, table, rows), and a page title gives a club name only where it says it is a club (RFC, Rugby, Club, FC). Every name is checked, and anything shaped like a person ("J Smith", "Joe S", a first name and a surname), an email, a phone number, a link or a role is dropped. Nothing about a person, the link or the page is kept. `node tools/importer.mjs` checks every parser path on the fixtures, links, the filter, the native fetch with a stubbed Capacitor, the web message, the save field (`importLeague`, validated by `cleanImportLeague`), old saves and My League.

## Purchases

A free download with one-off unlocks, no subscriptions and no ads. Free: Quick Match, the Training Ground, Kids, Easy, Normal, How to Play and Two Player. **Full Game** (`tryline.full`, £1.99): Championship, Career, Create Team and Hard. **Super Fan** of a partner club (`tryline.fan.<key>`, £3.99, one product a club, Farnham RUFC first): the Full Game, Import Club, the club's shirt and name on the home, and the club offered first in Career and Championship. The club gets a stated share of what we receive for each one (Farnham's 50%), and its offer shows only once the club has agreed that share in writing (`agreed:true` in `FAN_CLUBS`). A locked control keeps its label with a small lock and opens the Unlock card; a championship or career under way stays saved, only locked. **Grown-Ups** on the home has the purchases, Restore Purchases, Privacy and Support. Every purchase and every link out asks a grown-up first.

Purchases are the app's, through `@capgo/native-purchases` (StoreKit 2 and Google Play Billing, nothing in between), kept on the device in the save's `store` field. The web stays fully unlocked while `STORE_WEB_TIER` is `'full'`, and plays exactly as before; from launch it is `'free'`, with Get the App (an Android browser stays on `'full'` until the Google Play page is set). The product ids, the store setup, adding a partner club and the launch flip are in [store/README.md](store/README.md); the code is in `src/store.js` and `src/ui-store.js`, and `node tools/store.mjs` checks it.

## Install and offline play

The game includes a web app manifest, app icons and a scoped service worker. On a supported HTTPS browser, visit online and wait for **Offline Ready** before relying on cached play. The home menu offers **Install Game** when the browser provides an install prompt; How to Play includes manual home-screen guidance. Installation does not move your browser save between browsers or devices.

The worker caches only this game's local shell and checks downloaded file hashes against the generated version. The shell includes the game's own typefaces (`fonts/`, under the Open Font License), so offline play keeps the look and no page calls Google Fonts. It does not cache other games, arbitrary requests or browser saves. Cache storage must remain available; verified files can refill missing entries when online. A mismatched or incomplete new deployment leaves the working version in place.

Updates wait by default. **Update Game** appears on the home menu and reloads only after an explicit choice; entering a match meanwhile defers the reload until home returns. Other tabs never reload automatically, and their older caches are retained while windows remain open. Install/update buttons support touch, keyboard and controller navigation.

Use HTTPS to test real service-worker installation. The HTTP development preview remains playable but cannot demonstrate a secure-browser install. The focused offline suites exercise worker and browser events in controlled runtimes; physical-device installation and airplane-mode play still need a device check.

## Store listing

`store-listing/` holds what the App Store (at launch, as Tryline Rugby Sevens, sold by SignCheck Ltd) and Google Play (phase 2) need that is not code: the owner's launch checklist, the App Store Connect and Play Console answers (Sports category, 4+, Data Not Collected, the Families policy, Data Safety, IARC), draft listing copy, the Super Fan club partnership outline, and the screenshots at the stores' sizes. Start with [store-listing/README.md](store-listing/README.md). The owner chose the Sports category, not Apple's Kids category (2026-11-08); the kids-safe behaviour above stays.

The stores link three pages beside the game, served by GitHub Pages and styled by `pages.css`: `privacy.html` (made from [PRIVACY.md](PRIVACY.md) by `node tools/listing.mjs --write`), `support.html` (Restore Purchases, the unlocks, answers for parents) and `superfan.html` (Super Fan, and each partner club with its share once the club has agreed in writing). They load nothing from another site and carry no script.

`node tools/listing.mjs` checks the pack: every file there, the pages linking each other, no em dashes, the copy inside each store's limits and free of the banned words, Apple's copy naming no audience by age (guideline 2.3.8), every share stated as a share of what we receive, privacy.html matching PRIVACY.md, PRIVACY.md's fonts line matching index.html, superfan.html naming only the `FAN_CLUBS` marked `agreed:true`, with their shares, `storeShareLine` in the game using superfan.html's words, and every screenshot at its exact size. `node tools/listing-shots.mjs` re-shoots the screenshots with Playwright; they need doing again once the new graphics land.

## The App

`app/` at the repository root wraps the game for the App Store (Google Play in phase 2) with Capacitor; `app/README.md`
has the steps on a Mac. The app carries the same files the site serves, and its native projects are landscape either
way up. What it does differently is in `src/native.js`, and none of it runs in a browser (`nativeOn()` is false there):
no service worker or Install and Update buttons, How to Play's app entries, no status bar, haptics through the phone's
own engine, the save copied into the app's own storage and put back if the web view loses it, and Android's Back as the
game's own. `node tools/native.mjs` checks it under a stand-in Capacitor, the web build unchanged, the typefaces and the
app's scripts.

## Development source and checks

Edit `src/*.js`, then run these commands from `trylinerugby/`:

```sh
node tools/build.mjs
node tools/build.mjs --check
node tools/check.mjs
```

The build has no dependencies. It follows `src/manifest.json` and writes `game.js` and versioned `sw.js`; commit the edited sources, shell assets and both generated scripts. `--check` rejects syntax errors or stale generated game/service-worker scripts without rewriting them. Direct gameplay checks also reject a stale current bundle. `GAME=/absolute/path/to/index.html` still reads a separate old snapshot for comparisons.

The source files are **shared-closure sections, not independent ES modules**. Each is valid JavaScript with complete declarations and functions; the build places them in their existing order inside one private function. Cross-file names, initialisation order and execution remain shared. Moving declarations or adding top-level side effects requires care. This stage creates clear editing boundaries while retaining the existing engine and test interfaces.

| Source | Responsibility |
|---|---|
| `src/data.js`, `src/persistence.js` | Teams, tuning, settings and browser saves |
| `src/match.js`, `src/ball.js` | Match state, restarts, possession and ball flight |
| `src/passing.js`, `src/contact.js`, `src/movement.js` | Passing, tackling, sprint, team movement and match update |
| `src/goal-kicks.js`, `src/set-pieces.js`, `src/duels.js` | Goal logic, scrums, lineouts and duel rules |
| `src/championship.js` | Fixtures, results, standings and title race |
| `src/render-*.js` | Pitch, players, close-up scenes and match drawing |
| `src/sound.js` | Synthesised audio and rumble |
| `src/input-touch.js`, `src/input-devices.js` | Input slots, touch, keyboard, controllers and navigation |
| `src/ui-match.js`, `src/ui-help.js`, `src/ui-menus.js` | HUD, hints, tutorial, pause, teams and menus |
| `src/practice.js` | Isolated drills and practice feedback |
| `src/native.js` | The Try Line app (Capacitor): `nativeOn()`, haptics, the save's copy, bars, How to Play's app entries and Back |
| `src/offline-client.js` | Optional browser installation, offline status and safe update controls |
| `src/service-worker.js` | Separate worker template; cached shell and integrity checks (outside the game bundle) |
| `src/boot.js` | Frame loop, diagnostic API and startup |

The browser still loads only `game.js`; `src/` and the Node tools are development inputs. See [tools/CHECKS.md](tools/CHECKS.md) for the quick gate, full gameplay checks and separate two-player suite.

## Decided

- **Sevens**, not fifteens (2026-10-11). Seven a side on a full-size pitch keeps a phone screen readable.
- **2D top-down** for now (2026-10-11). 3D is a later call, once the gameplay is fun.
- **Landscape only** (2026-10-12). Upright play was glitchy. A phone held upright gets a "Turn Your Phone Sideways"
  cover and the match pauses underneath. Phone browsers can't be forced to turn: Android gets a best-effort
  fullscreen and landscape lock on Play, and iPhone ignores it.
- **Duels** (2026-10-12): four chase-cam close-ups. The gold ring means "now", and a win gives a small burst. Always on
  (2026-10-14): the On / Off switch is gone, and a save from when it existed still plays with them on. AI v AI, the
  menu demo and the headless tools can still run without them.
- **Dummy** (2026-10-12): in a Key Pass, the small button fakes the pass. It's right when the defender drifts onto
  your runner, and wrong when he comes at you. On Normal and Hard he sometimes fakes the drift.
- **One repo for all the games** (2026-10-12): this game lives in `gordonlindsay/games`, alongside Farnham Fighters
  and The Wedding Crashers, and away from SignCheck.
- **Teams** (2026-10-12): the team screen has an **International | Local** switch.
  - International is the six nations. Local is Farnham, then Haslemere, Guildford, Aldershot, Weybridge, Quins
    and Cobham (Gordon's list), then the clubs at two minis festivals on 11 October 2026: Guildfordians, Ironsides
    (Battersea), Kingston, Old Ruts and Wimbledon. The festivals' "Irish" and "OCs" squads are left out, by
    Gordon's choice (2026-10-12).
  - Kit colours are the clubs' own, with hoops where the club plays in them. **Club ratings are made up**: locals
    total 11–14 across the four abilities, and the nations total 13–18.
  - **Create Team:** a name, a three-letter short name for the scoreboard, Plain or Hoops, a shirt and a trim colour,
    and **10 points to spend** on top of 1 in each ability, 5 at most in any one. The total, 14, matches the
    strongest club. You can keep up to four teams. They're saved in the browser and show in both lists.
  - **A championship is your team and five others from the list on screen.** Pick a nation and you get the Six
    Nations. Pick a club, or your own team, and you get five random others from that list. The Triple Crown only
    counts when all four home nations are in it. A championship keeps its own copy of its six teams, so editing or
    deleting a team doesn't change one that's under way.
  - **Farnham is the default** (2026-10-12). The team screen always opens on Local. Quick Match starts with Farnham
    as your team (Change Team to swap), then any opponent from either list; a team you make there becomes yours
    while Farnham is still the untouched default. Championship has a Play as Farnham button, or pick any card.
  - **Quick Match is the first button** (2026-10-14). It is the gold one, and it takes the keyboard focus.
    Championship sits under it, beside How to Play. With one under way the button reads Continue Championship, and
    the line under it is your team, your place and the round. A finished season reads Final Table, with the prize.
- **A gentler start** (2026-10-30). A player who has not learned to turn and chase — the stick stays forward — was
  losing the games a player who chases wins easily. Measured with that stick-forward player as Farnham, 4-minute
  halves, duels live, the same 10 seeds: Haslemere 48–39 (W7 D1 L2, 5.8 tries against) and Quins 46–56 (W4 L6,
  7.9 against), while the scripted player who chases won both 10 from 10 (52–6 and 34–14). France, four rating
  points stronger, was 19–69, none won. The first two one-player matches on Normal (the default; Easy and Hard are
  left as set) move two CPU levers and nothing else: `cpuSpeed` −0.03, so the other side runs at Easy's pace, and
  `myTackle` +0.14, so your teammates tackle a little more surely than on Easy, because one defender is still being
  pulled out of the tackle. The same seeds then read Haslemere 52–30 (W8 L2, 4.3 against) and Quins 51–36
  (W8 D1 L1, 5.0 against). France stayed 22–61, none won. A chaser's France result moved from 16–28 (W1) to 23–21
  (W5) for those two matches, then Normal again. Duels, scrums, your own tackle and sprint, and every later match
  are untouched. Headless runs, AI v AI and the demo are not eased unless a tool asks. A save that already has a
  tutorial moment or a championship counts as past the two games. A championship's five opponents are still a
  random draw; you play the weakest of them first and the strongest last. A side three or more rating points above
  yours is marked **Stronger Side** on the Quick Match card, on the fixture, and at the kick-off.
- **Saving** (2026-10-14): half length, difficulty, sound, Hints (and each player's Hints in two player, by keyboard
  half like each player's Difficulty), the tutorial moments this device has seen, Coach Tips and the coach lines already
  heard, up to four teams you make, and the championship are kept in this browser (`localStorage`, key `tryline.v1`).
  The championship stores its six teams, the five rounds of fixtures, every result and the round you are on. Continue Championship resumes the next match. Start Fresh on the
  table, confirmed with a second tap, wipes that championship and leaves your settings and teams. A missing or broken
  save is ignored. A match in progress is not stored mid-play: quitting or reloading leaves that fixture to play
  again, and the table updates when the match finishes.
- **The chase** (2026-10-30): the table, the next match and the end of the season say where the championship stands.
  The points are unchanged (4 a win, try bonus at 4, losing bonus within 7, +3 for a Grand Slam). The table is numbered.
  One line gives the place and the gap (clear of second, behind the leader, or level on points), then still in it, or out of the title when even
  a win and a try bonus from every game left, plus the Grand Slam if you are still unbeaten, cannot reach the leader's points
  now. The next match says so when this game decides something: For the Grand Slam, A draw is enough, A win takes the title,
  A try-bonus win takes the title, or Must win to stay in it. A win takes the title only when every win does, counting the
  losing bonus the other side can still take and the best return of the sides you are not playing. The other two games this
  round are listed, and so are the opponents still to come. Before a ball is kicked the line is "Five rounds. Top the table."
  With the title already safe it reads Champions, with the rounds left. When the season is over the button reads Final Table,
  the title is the prize (Grand Slam, Champions, Triple Crown, Wooden Spoon, or the place) and the line says how it was won
  or lost, including a tie decided on points difference or tries. Full time stays the score, the result and the table points.
  Headless runs, the menu demo and AI v AI never open the hub.
- **Goal kicks** (2026-10-12): pitch-level close-up, sevens drop kicks, Normal = CPU parity. Conversions and
  penalty goals cut to a still shot from behind the kicker: steer the arrow, hold Kick, let go in the gold. The CPU's
  kicks play the same shot with a Skip button.
- **Drop goals** (2026-10-13; the label geometry alone since 2026-10-17): in range the small button reads **Drop Goal**;
  a tap is still a chip, a 0.20s hold freezes play and cuts to the same shot with the thumb still down, the meter
  filling while you hold and the nearest defenders charging at the lens. The label is offered whenever the kick is
  viable: in range (a calm pure strike reaches the bar) and at a bearing that can go between the posts, judged on the
  hold as it will really play (the kicker's own run on his stick), whatever the chargers are doing (Gordon, 2026-10-17:
  "drop kick should snap to the 3d version if kick is between the posts and therefore viable"). Until then it was only
  offered when a pure strike would also get away from them, by the charging rule that decides the outcome. They still
  charge in the close-up, from where they stood, and still smother or charge it down: the pressure is yours to read.
  What the button says when you press it is what you get: a Drop Goal press opens the close-up at 0.20s whatever moves
  in the meantime (nobody can tackle a kicker in that 0.20s hold, `dropHolding`: a man close enough is judged as a
  charger in the close-up instead, so he smothers it there rather than ending it before it opens), a Kick press stays a kick. The CPU still drops only when the charging rule says its strike would get
  away (`cpuDropOffer`), in the top-down view, on the clock its strike keeps, so a man of yours closing on him can
  charge it down.
- **Contact** (2026-10-13): a tackle is a commit and a 0.25s bind, not a coin flip at 1.5m. A made tackle is a Big Hit,
  a Wrap or a Soft tackle, the carrier runs down (or is driven back) while the tackler hangs off his hip, a second
  defender can join, and the ruck that follows has the tackler rolling away and retiring. A missed tackler slides off
  the hip, never into the carrier's path, so nobody runs over a man on the ground. Men on the ground are stepped round.
  Offloads, the ball jolted loose, Ankle Taps, Tripped and Fends are in. **Not** in, by Gordon's choice: breakdown
  steals (no jackal, no Steal prompt), new penalties (no Not Releasing, Off Your Feet, Not Rolling Away or High Tackle)
  and sin bins. The ruck stays automatic: a flat turnover roll (base raised to 0.11 so turnovers per match hold as
  rucks fall), the losing side wrong-footed, and today's flat ruck penalty.
- **Ruck control** (2026-10-31): while a ruck is down, the ring leaves the tackled man and sits on the teammate who
  will pick the ball up. The stick places him; with the stick let go he still runs to the ball. Pass, Kick and Tackle
  stay dead until the ball is out. No jackal, no steal, and no new penalty — the ruck's length and the penalty and
  turnover rolls are the ones drawn when the tackle ends.
- **Sprint** (2026-10-13): a third button, in a fan with B round A. It is a **meter that refills**, used by **holding**:
  it drains while held (2s from full) and refills while not (10s from empty, 7s on Easy). A sprint needs a fifth of
  the meter to start, and letting go stops it at once with a 0.3s ease-out. **Taps buy nothing:** the ease-out is
  charged to the meter at its level, nothing refills while one runs, and a press inside it climbs back from where it
  is instead of snapping to full speed, so every burst-second costs the same whatever the thumb does (the first build
  gave the ease-out away, and a 5Hz tapper won 88% on Normal against 85% holding). Anyone you control sprints: your
  chaser at x1.25 (x1.20 on Hard), your carrier at a lower x1.06 (x1.05 on Hard) that drains 1.5x as fast, so it is a
  burst, not a runaway. The button is dim exactly when a press would do nothing, and a press on a dim button does
  nothing, not even a switch. The CPU runs the same meter and the same burst on every level, choosing its moments by
  level: only for a runner who is clean through.
- **Switch** (2026-10-31). Without the ball the small button takes a defender, and a dashed ring in your colour shows who before you press. It is the defender nearest the ball. If that is already you, it is the next nearest: that used to happen with nothing drawn. When your man is already behind the ball (the attack is past him by the same 0.3m an Ankle Tap calls behind, judged on the carrier, or on the ball itself during their pass or kick), the ring moves to the nearest teammate still in front — level with that spot, or goal-side of it — even when a beaten teammate is closer. If nobody is still in front, it stays the next nearest. The button pulses, as Offload does, when your man is behind and the man in the ring can still meet the ball. A switch onto someone already beaten does not pulse, and the press still takes the man the ring shows. A loose ball keeps the nearest rule, since there is no line to be behind. In two player the chip under your man reads Switch (G or .) in the same case it would pulse, and Tackle when a dive is on and Switch would not.
- **Line break** (2026-10-14): when you are through the defensive line, the last defender comes up onto your inside
  shoulder and tries the tackle, turning the run toward the near touch, instead of holding his depth. Easy brings
  only that last man, and slower, so a step still beats him. Normal and Hard bring the last two. A line that is
  still set keeps its fullback deep, and the men you have already beaten keep chasing.
  Checked with `bot.mjs`, 12 matches a difficulty at SEED 1, 4-minute halves, duels live, against the same run
  before the change. Tries (you–CPU) went 9.3–0.3 → 5.6–0.3 on Easy (still 12 wins from 12), 5.8–1.3 → 3.3–0.6
  on Normal (10 wins → 9) and 1.8–2.3 → 2.1–2.3 on Hard (4 wins → 6). Get Past fires more often, because the
  last man now arrives in that window.
- **Two player, head to head on one computer** (2026-10-16). Gordon's decisions: one computer, Player 2 in pink (`#ff5fd2`),
  Two Player shown only on computers (a fine pointer or a connected controller) and never on phones, each player picking their
  own Difficulty on the join screen, duels always on in two player too, and controllers in one player as well. What is built:
  - **The home.** On a computer the buttons are Quick Match (gold, the focus), then Championship | Two Player, then How to Play
    on a row of its own. A phone keeps Quick Match, then Championship | How to Play: the Two Player button is `desk-only`, so a
    phone never sees it.
  - **The join screen** (Two Player · Players). Player 1 (gold) and Player 2 (pink) side by side, each card badged with its seat
    tag and laid out in four fixed rows so the two always line up: the seat, the device (Keyboard or Controller, with Use Keyboard
    in that row when he is on a pad), a legend, and a Difficulty of his own (remembered in the save as `twoDiff`). The legend is
    the seat's keys: W A S D Run, F Pass, G Kick, H Sprint for the left half; four arrow keycaps (CSS triangles, no glyph), / . ,
    for the right; W A S D, J K L for the lone keyboard seat; the stick, the diamond with its bottom or right dot lit, and a
    shoulder tab for a controller. A keycap or glyph lights while its key or button is held, so a laptop keyboard that can't hold
    both players' keys shows it here. Both start on the keyboard halves, so a keyboard pair has nothing to set up. "Controller ·
    Press Any Button": a pad takes a seat with one press, and the lone keyboard seat then shows the solo map. Swap Players swaps
    the device, the half and the Difficulty with the player. Pick Teams opens the team screen for Player 1 (Player 1 Team, in
    gold), then Player 2 (Player 2 Team, in pink) with Player 1's team in the bar above and Change Team, which Player 1's own
    big action presses from his seat; the International | Local switch and Create Team are there as ever; a mirror match is
    allowed (FAR v FA2); Player 2's pick starts the match. Only the picking player's seat acts on the team screen (`navOnly`);
    the mouse always can. A fresh visit from the home starts from the defaults (halves in order, every pad back to Press Any
    Button).
  - **The match.** The stick and the three buttons are off (they are seat 0's touch controls). The scorebug carries a seat tag at
    each end. Each player's man carries a numbered tag in his colour where the pointer sits in one player, the Sprint meter is
    an arc round his ring (dim exactly when a press would do nothing), and under him a chip reads his key and the word the
    button would (F · Offload, G · Drop Goal, G · Switch, / · Tackle; Long on its own, being a state) only while it matters. Either player
    pauses (P or Escape, or Start on either pad). The penalty card names its player ("Penalty · Player 2") and takes only his
    seat, from his keys as well as his pad (his run keys move the ring, Pass presses, Kick goes back); the Half Time and Full
    Time cards take either seat's keys; the pause card is anyone's, even over the penalty card. A pad unplugged mid-match pauses
    with "Player N · Press Any Button", and the next press of any unclaimed pad takes that seat back (not the first free seat):
    a pad lost on the half-time card, or two lost at once on a shared dongle, come back the same way, in the order they went.
    A pad pressed on the team screen claims nothing. When a release leaves both seats on the keyboard the halves go by seat,
    Player 1 on the left (the other way round after Swap Players).
  - **Close-ups head to head.** Scrums are a pack a side (the shove bar in each player's colour, Early and Good Hit as a tag in
    his colour over his own pack, an Easy pack's shove +0.10), lineouts a jumper a side (the throwing side's reach +0.10 instead
    of one player's +0.06, an Easy jumper's +0.06), goal kicks and drop goals by whoever kicks, from his own slot, each player's
    first kick of the match getting the path aid. A seat tag sits over each pack, each jumper, the two men in a duel and the
    kicker. Each close-up's bottom bar names each player's cue in his colour with his own key: "Player 1 · F · Push", "Player 2 ·
    / · Jump", "Player 2 · Hold / · Kick" (the goal kick is the Pass key), "Player 1 · G · Drop Goal", and in a duel both roles
    (below). Every other player's slot is latched through a close-up he doesn't own and reads live the moment it hands back.
  - **Duels head to head.** The owner is the timer, acting on the ring as ever; the other player is the chooser, who makes the
    choice the CPU draws in one player. The CPU's plan is drawn exactly as in one player and runs unless the chooser moves
    first: his first fresh input before the lock takes over and cancels what is left of the plan, so a chooser who does nothing
    defends exactly as the CPU does (no free win against an idle child). In Get Past he guards a shoulder with his run keys or
    stick (Guard Left · Guard Right, shown with the feint's own animation; at most a feint and back); in Key Pass he holds toward
    the runner to drift onto him, in plain view, or away to rush, and a drift let go before the lock is a fake; in a Tackle he is
    the carrier and makes one step (Step Left · Step Right, which moves the contact and the ring 0.10s later with the approach
    easing to the new pace, as the AI's step does); in a Block he is the passer and presses Kick for a Dummy before the pump,
    which plays the release sound once, at the real release. The lock is `DUEL_LOCK` at the timer's level before the plain
    window (0.40 Easy, 0.32 Normal, 0.24 Hard; the pump at 0.75s for a Block), so a child timer gets longer to read a late
    switch; a plan event due after the lock shows at the lock. A key or stick held into the cut-in is never a choice; a push in
    the first 0.30s counts. Each owner has his own quota (2 a half at 4-minute halves), his own "never the same kind twice
    running", his own first-duel and two-fails aids; the 30s gap and the Last Play bonus are shared. The chooser's ring moves
    to the man in the close-up and stays on him. The ring is in the owner's colour.
  - **Full Time.** "Player 1 Wins · Tries 3 – 2" (the player, not the team: a mirror match has two Farnhams), the seat tags on
    the score row, Rematch (the same teams and levels), then Change Teams (back to Player 1's pick) | Back to Menu, with a
    Series line ("Series 2 – 1 · 1 Draw", Player 1's wins first) kept across rematches and team changes and ended by Back to
    Menu or Quit Match.
  - **The input layer.** One input slot a seat (`inputs[0]`, `inputs[1]`; `input` is still slot 0). Touch feeds slot 0. The
    keyboard is routed by `e.code`: one player keeps the solo map (WASD or arrows, J K L, Space and Shift, P or Escape); two
    seats on one keyboard take a half each, Player 1 on W A S D with F (Pass) G (Kick) H (Sprint), Player 2 on the arrows
    with / (Pass) . (Kick) , (Sprint), or Numpad 1 2 3. A controller claims a seat with any press on the menus; the lone
    keyboard seat then keeps the solo map. Buttons are a bitmask of the sources holding them, so an idle pad never lets go of
    a key you are holding. Controllers: mapped by position (bottom button Pass, right button Kick, any shoulder or trigger
    Sprint with hysteresis, Start pauses, d-pad as keys with a radial 0.20 dead zone on the stick), polled once a frame,
    nothing running until the first `gamepadconnected`. A pad drives the menus and cards with a chalk ring on the current
    button; the real DOM focus never moves. The last device used puts a keycap or a pad glyph in each button's corner on a
    computer; phones see nothing new. Unplugging a pad that was used this match pauses it. A button let go on a card (the
    pause, penalty or half-time card) is released on the slot, so Sprint or a d-pad run can't carry on by itself after it.
    `body.desk` follows the pointer or the pads connected right now, so a phone that had a pad goes back to its own layout
    when it is unplugged.
  - **Sides.** `M.side[t]` holds whether a human plays team t, its seat, the man under its ring, its level, its kick charge and
    its Pass press. `isHuman`, `inputOf`, `ctrlOf`, `setCtrl`, `levelOf` read it; `ringed(p)` is the man under a human's
    ring. `newMatch(u, c, { humans:[a, b], levels:[l0, l1] })` seats any mix: `[true, false]` is one player, `[false, true]`
    one player as the away side (the lone human sits in seat 0), `[true, true]` two player. Every user action is per side:
    the pass in hand and the long pass, the kick charge, Sprint on each side's own meter, Switch, Tackle, goal kicks and drop
    goals from the kicker's own slot. Duels run in their owner's frame through `toFrame`/`toWorld` (the kick frame): a team 1
    duel is a team 0 duel mirrored, Step Right is always the owner's right, and the outcomes land at the mirror. The surge
    after a Big Hit goes to the side that made it. A Block can take over a human's pressure pass too.
  - **Roles.** Balance terms are keyed by role, not team number: `cpuSide(t)` plays the CPU terms (cpuSpeed, cpuTackle, the
    intercept and turnover edges, the scrum pack's formula, the CPU jumper, the CPU kicker's spread) at its own level, which
    for a CPU side is the human's it plays against; a human side plays the human terms at the level it picked. Two player has
    no CPU terms at all. The scrum is a pack a side (each human's taps on its own slot; the stick plays no part) and the
    lineout a jumper a side. In two player an AI tackler reads `TWO.tackle` at the carrier's level (0.72 /
    0.80 / 0.88: the scoring lever) and an AI interceptor `cpuIntercept` at the passer's level, as the CPU does against a human.
    **AI v AI and the menu demo are now fair:** team 0 used to keep the human terms there because `team === 1` was the test for
    the CPU. `sim.mjs` is re-baselined below.
  - Checked by `tools/twoplayer.mjs` (708 asserts on seeds 1, 2 and 11, a paired mirrored-bot symmetry run with the set pieces
    contested and the chooser's hand driven through the real key and stick paths, a lock sweep under `--lock`, and the full gate
    under `--sym 400`); every one-player tool's output is byte-identical to `main` (3f11088) on the spec's golden set, `sim.mjs`
    alone moving, by the fairness change.
- **Full time stats** (2026-10-30). The full-time card keeps the score, who won and the tries, and adds both sides under that.
  Conversions, tackles and duels are made of attempted (2/3). Penalty Goals and Drop Goals show only when somebody
  attempted one. Duels belong to the side that played them, so a computer's column is a dash. Metres Made is ground
  gained with the ball, toward that side's try line, and it can be negative. Half time stays the score and the tries.
  Continue, Rematch and Second Half are still one press. A headless run, the menu demo and AI v AI do not open the card.
  New played championship results now also retain these user-side counters; older results keep their score and tries. Checked by `tools/postmatch.mjs`.
- Championship uses Six Nations table rules (4 a win, try bonus at 4+, losing bonus within 7, +3 Grand Slam)
  but not the name, crests or player names. Those are licensed, so a wider release needs a licence or made-up names.
  The chase between fixtures reads that table. It does not change the points.

- **Playtest fixes** (2026-10-17). Gordon played on his phone: scrums were lost on Normal, passing was flat with no
  gain, there was no way to step or dummy in open play, duels came too fast to react to, and nothing on screen said
  what to do. Six changes, each measured (Measured baseline, below):
  - **Scrums: Push alone drives the shove.** `scrumPush` used to scale the taps by the stick's direction (1 forward,
    0.55 at rest, 0.2 held back) and nothing on screen said so, so a thumb off the stick got 55% of its shove and a
    thumb still pulled back from chasing 20%; and a steal on Normal needed about 8 taps a second, while a phone thumb
    manages 5-7. Now the taps alone are the shove (`rate/1.25`: full shove at 5 a second, the most at about 6.5), the
    stick is not read, and the one penalty line is `SCRUM_DOM` 2.4m (from 2.0; the bar fills exactly there and the
    steal line sits half way), which keeps penalties on your own ball near where they were while steals rise. The
    levels are untouched. On Normal, 7 taps a second with a Good Hit and the thumb off the stick: your put-in kept
    100%, theirs stolen about a third (31-35%), no penalties against; a penalty on your own ball 7-13%. The rows
    with the stick at rest, forward and back are identical, on both sides and in both seats.
  - **Passing leads the receiver.** A pass used to be thrown at where the receiver stood, and while it was in the air he
    braked for it (the Chasers bug, on the attack), so a completed pass was caught about 5m behind the passer at 3.4
    m/s with 38% of catches standing; a thumb left on the stick dropped about 21 passes a match. Now the ball goes
    where he will be running on (`leadPass`: pick-up at 18 m/s² to top speed, half his sideways drift kept, capped
    0.4m behind the passer and never forward after the handling error), he runs onto it whatever the stick says
    (`runOnTarget`, with pursue; the stick takes over at the catch; a won Key Pass's sure pass is as it was), and the
    support slots lead upfield while the ball is in the air so the line keeps running. The CPU's receivers run on
    at 0.65 of top speed (`RUNON.cpu`, the balance lever); the Key Pass runner box is 7.5m (from 6). Your passes are
    now caught about 2.6m behind the passer at 5.7 m/s, 4% standing, 0–0.17 dropped a match; the CPU's at about
    5 m/s. More tries are scored at every level with the win rates held on Easy and Normal; two player rises to
    about 9.4 tries a match (the investigation's estimate was 8.5; accepted; `TWO.tackle` is the lever to pull it back); the Tackle duel got rare (about 0.15 a
    match from 0.6) until its trigger was retuned later the same day, below; AI v AI scores more too (sim.mjs re-baselined below).
  - **Side Step and Dummy, on the stick.** The old open-play step was a turn-rate test (`p.turn`) that a single flick on
    the floating stick could never reach, and most of its 53 fires a match came on the first step after a catch. It is
    gone. **Side Step** is one sharp flick across the run near a tackler (within 4m): x0.65 tackle odds for 0.35s and a
    5 m/s dart along the stick, with a 1.25s cooldown, tagged Side Step. **Dummy** is a quick pull back and push on
    along the run with the ring on a teammate: the nearest AI defender ahead (1.5-9m) buys it 90 / 75 / 60% of the time
    by your level and drifts onto the man in the ring for 0.6s, wrong-footed and unable to tackle for 0.4s (tagged
    Dummy, or Not Fooled); you keep the pace you had before the pull; 2.5s cooldown, kept on the carrier at the match
    clock (a lifted thumb clears the gesture's shape, never the cooldown). No new button; both are
    world-relative (`gestureStep`, per human slot), so keys, pads and either seat read the same: a fresh across key is
    a flick, and on keys the pull must be the back key itself (forward let go and pressed again is not a Dummy). The
    CPU dummies on Hard only, about 4 a match, never selling your ringed man, and draws nothing in AI v AI. Every
    lever is in `MOVES`, beside `CONTACT`. The Key Pass duel keeps its small-button Dummy.
  - **Duels start in slow motion** (Gordon: they came too fast to react to; his choice "slow mo with longer slow for easy
    v hard"). After the slide-in the run-in plays at 0.4x for 1.2 / 0.9 / 0.6s of real time by the timer's level, then
    ramps to full speed (`DUEL_SLOW`: a 0.10s scene ramp, done 0.03s before the ring opens), so the gold window, the
    tells and the verdict are untouched in scene time: the scene clock steps whole frames, held back by an
    accumulator, and the drawing adds the fraction back so the motion is smooth. A bot acting on the scene clock sees
    exactly the duel it always saw (`bot.mjs` 60 a level at SEED 1 is byte-identical with and without it, `frozen`
    aside); a person gets real time to read which duel it is. The ring now opens about 1.6 / 1.5 / 1.35s after the cut
    (Easy / Normal / Hard) instead of 0.84 / 0.89 / 0.93; Easy's early ring clips its slow phase to about 1.1s on a Get
    Past. Resume before the ring opens starts the slow phase again from there. Instant mode has no close-up. Measured
    with a modelled human under Measured baseline: a player who needs 0.6s to get his bearings goes from 27% to 70% of
    Normal duels, a child needing 0.8s from 8% to 71%, and the bots don't move.
  - **The Tackle duel comes up often again** (Gordon: "The tackle duel should be as before - it's the time not the frequency
    that was the challenge. Otherwise gameplay becomes too one dimensional", then "Tackling happens often in a real game so
    should here too"). The led pass had the CPU's receivers reaching your line at pace with team-mates level, and the duel
    fell from 0.6 to 0.15 a match: its trigger wanted the carrier 0.5s on the ball and nobody else of yours within 10m
    unless a metre behind him. Now (`TDUEL`) the carrier needs 0.3s on the ball and the last-defender test is "no other
    standing man of yours goal-side of him within 7m" (a man level with him or behind him is not between him and the
    line); front-on (your man goal-side of him by 0.5m, 2.9-6m off, your stick toward him) and the rest are as they were.
    It fires 1.7 / 1.8 / 1.8 a match (Easy / Normal / Hard), about as often as Get Past (1.7 / 1.8 / 1.4), from 0.09 /
    0.14 / 0.19, with wins moving -0.6 / +0.2 / -0.4. Total duels go from 3.1 / 3.8 / 3.6 a match back to the 4.7 / 5.2 /
    5.0 the game had before the led pass, and the frozen time with them, 8.3 / 9.5 / 8.3s to 12.3 / 13.0 / 11.5s, each
    duel now carrying its slow run-in; `DUEL_GAP` (30s) and the per-half cap are the levers if that is too much. The
    measurements and the sweep are under Measured baseline.
  - **Drop Goal is offered whenever the kick is viable** (Gordon: "Same for drop kick should snap to the 3d version if kick
    is between the posts and therefore viable"). The label no longer asks whether a late strike would get away from the
    chargers: it is in range and in front, judged where the 0.20s hold will leave him, or it is Kick. The chargers in the
    close-up (`rushersOf`, `blockedBy`) are untouched, so a drop taken with a man on you is smothered. On Normal the label
    is now on for all of the time the bot carries in range (8.6 spells a match, from 2.3); a bot that holds B the instant
    it appears takes 9.2 drops a match with 15% made and 63% smothered, one that waits for 5m of space 2.2 a match with
    45% made and 28% charged down, against 2.3 a match at 59% made and nothing blocked under the old label. The CPU's own
    drops are unchanged.
  - **Hints** (Gordon's "Close-Ups and Key Moves"). A card in the top corner (Player 1's top-left, Player 2's top-right
    in his colour) names each close-up and its one control for the device in use: every duel from the cut to the
    verdict (the chooser's card to his lock in two player), the scrum to its result ("Your Ball" or "Steal Their
    Ball": Push, Hit on Set; Push, Then Tap Fast), the lineout to the catch (Jump, Ball Halfway), a goal kick or drop
    goal from the cut-in to the strike (under the wind chip, no tick, as it sits in the stick zone), and once a match
    each in open play for three seconds, four seconds apart: Long Pass, Sprint, Side Step, Dummy, Offload, Drop Goal,
    when the chance is there. The chip is the on-screen button's own look with a keycap or pad glyph badge for the
    device, so a keyboard player reads J or A D and a controller the diamond's lit dot. A 44px tick on the card turns
    that seat's Hints off; the home has a fourth row, Hints On | Off, under Sound; the pause card a row each (two in
    two player); the join cards a tick each; the penalty card a tick and, while Hints are on, a subline under each
    choice (3 Points or Out of Range, Lineout Upfield, Play On Now). Every word is Title Case; every duel card is one
    row, measured not to cover a figure or the ring at 667x375 up to 932x430 (`hints.mjs` pins it over bot matches).
    Nothing random is drawn and `dropZone` is never run again: the open-play triggers read the labels the HUD computed.
  - **A first-time tutorial** (Gordon's "Pause and Step Through"). The first time each duel kind, the scrum, the lineout,
    a goal kick and a drop goal comes up on this device, with Hints on, the close-up holds its first frame under a
    card: "Get Past: Beat the Last Man", then the control and its timing for the device ("Flick the Stick Away From
    Him When the Ring Turns Gold"; "Tap A or D" on a keyboard with A and D drawn as keycaps, as the hint chips do (every
    key a card names is a keycap, so Player 2's / and . never read as a full stop and a typo), "the Bottom Button" on a
    pad, Player 2's own keys in two player). Skip | Next, then Play, balanced 44px buttons; a tap anywhere, or the pass key or button, advances;
    either player can skip; the world and the clock are frozen and nothing is judged. The chosen rule: it shows while
    that seat's Hints are On (Hints Off is one switch for both), and the moment is remembered either way, per device,
    in `settings.tut`, so the old `duelSeen` and `kickSeen` flags are gone: the first-duel window aid (+0.08s) now
    comes once per duel kind and the first-kick path aid once for a goal kick and once for a drop, keyed off the same
    memory. Replay Tutorial on How to Play forgets them all (dim when there is nothing to replay). A drop goal's thumb
    still down carries over Play as at the press; one lifted under the card needs a fresh press.
- **Phone landscape** (2026-10-30). The fan, Sprint-as-hold and the resting stick at 96, H−118 with no inset stay as
  they are. Four things that were fiddly on a phone, each checked rather than redesigned:
  - **Safe area.** The stick zone starts after the left inset and stops at the home indicator, and its right edge stays
    at 52% so it never reaches the buttons. The resting stick moves in only when the notch would cover the ring (left
    inset 59: centre at 129, the ring 8px clear) and lifts only when the home indicator would (a 21px one does not; it
    already cleared it). On-pitch tags keep today's clamp when the insets are 0, and step in with the buttons when the
    right inset is 59 (200px clear becomes 239).
  - **Near misses.** A tap that misses a button and lands on the pitch, within 12px of a button's circle, goes to the
    nearest one. The gap between Kick and Sprint is 17px between the circles, so a thumb that lands in it now hits one
    of them. A direct hit is unchanged, and Sprint takes none of these while it is hidden in a close-up. The pause
    glyph stays 44px; its hit target grows inward, off the corner.
  - **A coalesced flick.** Chrome can deliver a fast Side Step as one move whose last sample is back in the dead zone.
    The peak across the run is what the Side Step reads; the run itself still follows where the thumb is now. A move
    with no intermediate samples is unchanged, and so is every step the tools drive by setting the stick directly.
  - **Short landscape and turning upright.** Under 420px tall (a phone in Safari, sideways) the home settings sit in
    two columns, labels above the controls, so Half, Difficulty, Sound and Hints fit on a 320px-tall screen with a
    21px home indicator and every control stays 44px. The scorebug tightens from about 65px to about 45px. Turning the
    phone upright still pauses, and now also lets go of the stick and the buttons, so a cancel that arrives late cannot
    leave the ring on.
- **A first-match coach** (2026-10-30). Coach Tips starts On. The first time Pass, Tackle, an offload (Pass pulsing in a
  Soft or a Wrap), Sprint or a side-step window comes up, one short line shows on the banner and play carries on. Each
  line once per device, one at a time, kept in `settings.tips` inside `tryline.v1`. Headless, auto and demo matches stay
  quiet. The first duel and the first goal kick keep the tutorial card, the hints card and the first-kick path. With
  Hints off and no card up, the first duel also gets "Wait for gold, then go". The home row turns Coach Tips off.
- **Support on the open shoulder** (2026-10-31). One runner is held on the open shoulder, still behind the ball. The
  open shoulder is the side the nearest defender up on the carrier is not standing on; with him head-on, it is the side
  with more room to the touchline. He starts 5m wide and 2.6m behind (`SUPPORT`), and slides wider along that shoulder,
  then a little deeper, while a defender is within 5m of the spot. He stays behind the ball and inside the Key Pass box
  (4–12m wide, at most 6.4m behind). The rest of the line stays on the flat shelf. A set piece keeps that shelf. The pass
  ring is white when the man it is on is free and tints (`#ff8466`) when a defender is within 5m of him, so a pass is a
  read. A long pass stays gold, with that tint drawn inside the gold when the further man is marked. The stick still
  chooses the man. The CPU's refusal of a pass into pressure is unchanged.
  Checked with `bot.mjs`, 24 matches a difficulty at SEED 1, 4-minute halves, duels live, against the same run before
  the change. Key Passes a match went 0.50 → 0.54 on Easy, 0.46 → 0.42 on Normal and 0.25 → 0.58 on Hard. The runner
  is placed inside the 7.5m box. Easy and Normal stayed in the same band; Hard rose by about a third of a duel a
  match. Tries (you–CPU) went 9.0–0.5 → 8.5–0.2 on Easy (24 wins from 24), 6.6–1.1 → 5.5–1.1 on Normal (20 wins from
  24) and 3.0–2.9 → 2.5–1.8 on Hard (13 wins → 16).

## Controls

| | With the ball | Without it |
|---|---|---|
| Stick | Run. Flick sideways near a tackler to Side Step. Pull back and push on for a Dummy: the nearest defender drifts to the man in the pass ring | Run. In a ruck, place the teammate who will pick the ball up. Pass, Kick and Tackle stay dead until it is out |
| Big button | Pass to the ringed teammate. A tap is a normal pass; the ring is white when he is free and tints when a defender is on him. Hold past 0.18s and the ring turns gold for a long pass to the next man out (it throws itself at 0.6s), with the tint inside the gold when that man is marked. Tilt to pick a side. Held in a tackle it reads Offload on the press, when a man is within 9m, and pulses. At a goal kick, hold to power and let go in the gold | Tackle: a dive at a carrier within 2.8m, an Ankle Tap from behind, a join on a carrier already held. It is dim when a press would do nothing |
| Small button | Hold to power a kick, release to kick. A tap is a chip. In range it reads Drop Goal: hold it 0.2s for the close-up | Switch to the man in the dashed ring: the defender nearest the ball, or the next one if that is already you. If your man is behind the ball, the nearest teammate still in front. It pulses when he can still meet the ball |
| Sprint | Hold for a burst of speed (x1.05 with the ball). The ring is the meter: it drains while you hold (and through the ease-out after you let go) and refills when you let go | Hold to run a man down (x1.20). A press moves the ring to the man best placed to chase if yours is down or over 4m further off. It is dim when a press would do nothing, and then it does nothing |

Keyboard: arrows or WASD, J, K, L (Sprint), P to pause. Tap across near a tackler to Side Step; tap back (the key toward your own line, with forward held or let go) for a Dummy. J tapped is a pass; J held is a long pass. At a goal kick the arrows steer and J is Kick; K held is Drop Goal.

Controller (any computer browser with the Gamepad API): stick or d-pad to run (flick across near a tackler to Side Step, pull back and push on for a Dummy), bottom button Pass, right button Kick, a shoulder or trigger Sprint, Start pauses. Press any button to connect it; it also drives the menus.

Two player on one keyboard: Player 1 W A S D with F G H (Pass, Kick, Sprint), Player 2 the arrows with / . , (or Numpad 1 2 3). A controller takes a seat with one press on the join screen, and the other seat keeps the solo map. The Pass key (F or /) is also Tackle, Push at a scrum, Jump at a lineout and the goal kick (hold it, let go in the gold); it holds for a long pass. The Kick key (G or .) is also Switch, Drop Goal (hold it in range) and Dummy. Sprint (H or ,) is a hold on that side's own meter. P, Escape or Start pauses from either seat. In a duel the other player guards, drifts or steps with his run keys or stick before the ring opens, or presses Kick for a Dummy as the passer. On the menus and cards in two player W A S D and the arrows move the ring, F and / press, G, . and Escape go back; a pad's stick, bottom and right buttons do the same. The join screen's legend lights each key while it is held: a laptop keyboard that can't hold both players' keys at once shows it there, and a second USB keyboard fixes the rollover (the browser can't tell keyboards apart, so nothing needs setting).

Controllers need HTTPS or localhost (the Gamepad API is off on an insecure page), and a pad shows up only after a press. A pad press can't start the sound; any key or click does. Steam's desktop layout can turn a pad into arrow keys and Escape, which would drive Player 2's half and pause the match: turn Steam Input off for the browser.

**Long pass.** Hold Pass. For the first 0.18s it is still the normal pass, to the ring — white when that man is free, tinted when a defender is on him — and letting go throws that. Past 0.18s the ring turns gold on the next man out — the stick's side, or the side with more support if the stick is level — skipping the nearest teammate, within 32m and not forward. A faint ring marks the man it skips. The Pass button fills while it charges, and reads Long once a second man is there; at 0.6s it throws itself. With no second man it stays a normal pass. The ball loops higher as the pass gets longer, so it can sail over the skipped man's defender. It is a little less accurate and a little more likely to be knocked on, and it can be intercepted near the passer or the receiver, not under the top of the arc. The CPU sends one when its nearest receiver is crowded and the next man is in space. A press in the first 0.12s after a catch is kept and thrown as soon as that gate opens, to the man the ring was on. An offload is still the press itself: it does not wait out the long-pass hold, and a charge already under way is cancelled by the tackle.

Checked with `bot.mjs`, 36 matches a difficulty at SEED 1 and again at SEED 2 (72 matches, 4-minute halves, duels live). Wins were 100% / 84.7% / 55.6% (Easy / Normal / Hard), against 99.0 / 87.8 / 52.0 in the measured table below. The scripted player still taps, so every long pass in that run was the CPU's: about 2.6 / 3.4 / 3.5 a match.

### Close-ups

Scrums, lineouts, duels and goal kicks open a close-up: the pitch and the clock freeze while it runs.

- **Scrum:** the referee calls Crouch, Bind, Set. Press Push on Set for a good hit, then tap it fast. The taps alone
  are the shove, on every device and in both seats (see Decided, 2026-10-17). The scrum moves with your shove, and the
  ball comes out where it ends up. Out-shove them on their ball to steal it. Dominate to win a penalty (the bar fills
  exactly at the penalty line, `SCRUM_DOM` 2.4m; the steal line is half way), or a pushover try within 8m of their line.
  Not pushing at all loses the ball, nothing worse.
- **Lineout:** one jumper each in the middle. The hooker dummies, then throws. Press Jump so your jumper is at full
  height when the ball arrives. On their throw, beating their jumper to it is a steal.
- **Duels** fire at last-man moments, and only when you're running at the man. Steer away and none fires. There's
  at most one every 30s, never the same kind twice, 2–4 a half, plus one Last Play bonus after the hooter. Each one's
  run-in plays in slow motion after the slide-in (0.4x for 1.2 / 0.9 / 0.6s real by your level, `DUEL_SLOW`), ramping
  to full speed before the ring opens; the window itself is the length it always was. The Tackle duel wants the CPU
  carrier 0.3s on the ball, your ringed man goal-side of him by 0.5m and 2.9-6m off with your stick toward him, and no
  other standing man of yours goal-side of him within 7m (`TDUEL`; until 2026-10-17 the hold was 0.5s and the last-man
  test "nobody within 10m unless a metre behind him", which the led pass had made rare).

| Duel | When | You | Win |
|---|---|---|---|
| Get Past | You carry at the last defender | Flick the stick: Step Left / Step Right, against his shoulder (he may feint) | Line Break and a burst |
| Key Pass | A two-on-one with a support runner | Pass if he comes at you; Dummy if he drifts to your runner | Draw and Pass: a sure pass, and the runner gets the burst. Dummy: you go through the gap with the burst |
| Tackle | You're the last defender, front-on | Tackle as he arrives (he may step) | Big Hit: a dominant ruck, then Line Speed |
| Block | Their pressure pass crosses your man | Block on the real release, not the dummy | Intercepted (inner window) or Knocked Down |

A mistimed duel falls back to the odds the open game would have given, so a duel is never a trap. A tap after the
verdict skips the replay.

Head to head, the other player is the man opposite, the chooser: he guards a shoulder in Get Past (at most a feint and back),
drifts or rushes in a Key Pass (a drift let go before the lock is a fake), makes one step as the carrier in a Tackle, and
dummies as the passer in a Block. The CPU's plan is drawn as in one player and runs until his first fresh input, so a still
hand defends as the CPU does. His hand shows live until the lock, `DUEL_LOCK` before the ring opens by the timer's level (0.40
Easy, 0.32 Normal, 0.24 Hard; the pump at 0.75s in a Block), and is fixed from there. The owner's timing is judged exactly as
against the CPU. The sweep that pins the leads is under Measured baseline.

### Hints and the tutorial

The hints card (`#hc0` top-left, `#hc1` top-right for Player 2) names the close-up and its control: the duel's name and
"Flick on Gold" / "Pass or Dummy On Gold" / "Tackle On Gold" / "Block On Gold" (the chooser's "Guard a Shoulder", "Drift
or Rush", "Step Left or Right", "Dummy: Tap It" in two player), the scrum's two rows, the lineout's one, the kick cards
("Let Go in the Gold": Steer the Arrow, Hold It; "Before They Reach You": Steer, Let Go in the Gold), and the open-play
cards (Long Pass: Skips a Man, Hold It; Sprint: Hold It; Side Step: Near a Tackler, Flick Across; Dummy: Fakes the Pass,
Pull Back, Push On; Offload: As You're Tackled, Tap It; Drop Goal: In Range, Hold It), with Tap Across / Tap Back and
Step on Gold on a keyboard. The tick on the card, the Hints row on the home and the pause card, the join cards' ticks and
the penalty card's tick all set the same thing (`settings.hints`, or `settings.twoHints` by half in two player) and save
it as they are pressed. The card's limit is `min(340px, 50% - 116px)` from 12px in; in two player (`.hc.two`) the
scorebug's seat tags reach 116px either side of centre, so Player 1's limit is `50% - 140px` and Player 2's, 62px in by
the pause button, `50% - 190px`: 12px short of the tags from either side (it used to reach FRA at 683 wide), and a card
its limit binds wraps its rule and its row rather than spilling. On a keyboard or a controller the card is `badged`: its
rows start 7px lower so the keycap badges clear the rule line, and a chip with a two-keycap badge (A D, the arrows) or the
shoulder glyph pads out (`wide`, `mid`) so the badge never sits on its own label. The Step Left | Step Right plates flip
below the stick whenever their top would reach the card's bottom (`platesFloor`), not only the clock line, so a thumb a
little high on a phone no longer slides them under Flick on Gold. The pause card's two Hints rows share one grid, so both
On | Off controls start on the same line. The tutorial card (`#m-tut`) holds the first close-up of each kind on this
device: Skip | Next, then Play; while it holds, two player re-centres only the owner's stick (as the grace does), so the
chooser's push during the card counts on a pad as it does on keys. Replay Tutorial is on How to Play. The words are
pinned by `hints.mjs` and `tutorial.mjs`.

### Contact

Every number here is in six one-line constants in `index.html`, `CONTACT`, `RUCK`, `SPRINT`, `RUNON` (passing),
`MOVES` (the Side Step and the Dummy) and `TDUEL` (the Tackle duel's trigger), and the harness overrides them from the environment:
`CONTACT='{"bind":0.3}' SPRINT='{"mul":[1.25,1.25,1.2]}' RUNON='{"cpu":0.6}' MOVES='{"step":{"push":4}}' TDUEL='{"hold":0.5}' node tools/bot.mjs`.
Arrays are by level (Easy, Normal, Hard). New engine code reads the two-player shims (`isHuman`, `inputOf`, `ctrlOf`,
`levelOf`, `setCtrl`), never `team === 0` or `M.ctrl`, so a second human seat slots in without a rewrite.

- **Commit.** An AI defender commits within 1.5m of the carrier; your ringed man commits automatically within 1.35m
  (0.58 / 0.42 / 0.42 by level) and dives on Tackle within 2.8m (0.66 within 1.7m, 0.50 beyond). The roll is drawn at
  the commit: `tackleChance` as before, x1.10 side-on, x0.75 from behind, x0.65 (`MOVES.step.odds`) against a stepping
  carrier (0.35s after a Side Step, his or the AI's). The first
  man to commit takes the carrier; nobody else rolls while he is bound. A dive from more than 0.3m behind is an
  **Ankle Tap**, a flat 0.55 and always Soft.
- **The tier,** if it sticks: **Big Hit** 0.14, +0.04 a power point, +0.03 front-on with closing speed over 6 m/s,
  +0.08 for a dive within 1.7m, +0.10 for a sprinting tackler, +0.03 for the CPU on Hard (-0.03 on Easy); **Soft**
  0.22, +0.25 from behind, +0.08 against a carrier over 7 m/s, -0.04 a power point; **Wrap** is the rest.
- **The bind** lasts 0.25s. The carrier runs down to nothing (Wrap), falls forward about 1.1m (Soft) or is stopped by
  40% and driven back (Big Hit); the tackler is pulled to 0.7m off his hip on the side he came from, at 12/s of the
  gap, capped at 8 m/s so a dive reads as a lunge. A bound carrier who crosses the line scores. A standing defender
  within 1.3m joins as the **Second Man**: a Wrap becomes a Big Hit 35% of the time, a Soft a Wrap 35%. Your Tackle
  press on a held carrier joins too.
- **Broken tackle:** no bind. The tackler lands 0.5m behind and 0.95m beside the carrier's line (his run, or his
  facing when he is standing still, or the line from the tackler: never on top of him), down 0.5s (0.75s after a
  dive) with a 1.0s cooldown; the carrier stumbles at x0.9 for 0.15s. Every broken tackle shows a 0.2s fend
  (an arm line in the carrier's trim colour). A **Fend** proper, with no stumble and a tag when it is yours, is a tackle
  beaten by a clear margin (roll 0.35 over the odds) with a power edge, or beaten at a sprint. 40% of missed Ankle
  Taps trip the runner (**Tripped**): x0.5 for 0.5s, so a second chaser can finish him.
- **Offload.** Held in a Soft or Wrap, with a receiver level or behind within 9m, A reads Offload and pulses: 0.85
  (Soft) or 0.70 (Wrap), x(1 + 0.05 a handling point over 3). The label, the press and the dashed ring all use one
  receiver (`offloadTarget`): the stick's side within 9m, else the nearest within 9m, so a lit Offload always goes
  somewhere. The pass can't be intercepted by the men in the tackle.
  Half the failures are held (an ordinary ruck); the rest are 55% Knock-On, 45% Loose Ball. The CPU tries one in
  0.10 x (0.6 + 0.2 x (handling - 3)) of its Soft and Wrap binds, never from a Big Hit (about 2 a match; it was 0.30
  and 5.7 a match, and that rate cost a player who never sprints about a point on Normal and four on Hard).
- **The ball jolted loose:** 9% of Big Hits, 2% of Wraps, 1% of Softs, x(1 + 0.15 a handling point under 3). 55%
  Knock-On (a scrum to the tacklers), 45% **Loose Ball**: it pops 2–5 m/s back towards the carrier's own line, for
  anyone.
- **The ruck.** The ball goes 0.4m behind the tackled man, who is down until the ruck ends + 0.15s. The tackler
  rolls to 1.0m beyond and 1.1m aside, down until the ruck ends + 0.25s, then retiring 0.6s more: he can't tackle
  and is never picked as a chaser. A Second Man retires for the same time, and Tackle stays dim for a retiring man
  (a press does nothing). Length: **0.7s** when the attack's first support beats the defence's first man
  (other than the tackler) to the ball by 0.3s, **1.0s** otherwise, **1.5s** after a Big Hit. Then the flat rolls:
  a 4.5% penalty, and a turnover at 0.11 + 0.02 a power point (+ the level's `turnover`), clamped 0.03–0.18. After a
  turnover the losing side within 3m is **wrong-footed**: no tackle for 0.7s and x0.5 speed. Duels and the drop-goal
  smother call `tackle()` with no tier and keep the old body: the 1.05s ruck (1.6s for the duel Big Hit), no
  roll-away, and no new random draw. While it is down, a human attacker's ring is on the teammate who will pick the
  ball up (the nearest teammate still on his feet to the mark, 1.6m behind the ball). The stick places that man; with the
  stick let go he runs to the mark as before, and he takes the ball when the attack keeps it. Pass, Kick and Tackle do
  nothing until the ball is out. A CPU side is unchanged, and a turnover still goes to the other side's nearest man.
- **Collisions** (`collide()`): standing men push apart at 1.25m as before, and team-mates lose the closing part of
  their relative velocity so pairs stop jostling; opponents are not damped (a shadowing defender must not become a
  wall). A standing man is pushed to 0.95m from a man on the ground, or from a man bound in a tackle; the man on the
  ground or in the bind does not move, and the two (or three) men in one bind are left to `bindMove`. A push is at
  most 0.2m a step, so a man who gets up inside a crowd is eased out rather than shoved, and two men on the same
  spot are parted along the touchline axis.
- **Sprint.** One meter a side (`M.spr[t]`): drain 2s full to empty (x1.5 with the ball), refill 7 / 10 / 10s, a
  0.2 floor to start, a hold that runs it dry must be let go before the next (letting go in a ruck counts), a 0.3s
  ease-out on release. The ease-out is charged to the meter at its level and nothing refills while one runs; a press
  inside it climbs back at the same rate rather than snapping to 1, and a meter run dry ends any ease-out at once, so
  taps buy exactly what a hold buys. Your chaser runs at x1.25 (x1.20 on Hard), your carrier at x1.06 (x1.05 on
  Hard); a duel's burst and the surge never stack with it (the bigger one applies). A tackler sprinting at the commit
  (the hold itself, not an ease-out) gets +0.10 Big Hit and his sprint ends when he commits; a duel zeroes every
  sprint and keeps the meters; the meters freeze in every close-up and keep filling through rucks. The button is dim
  exactly when a press would do nothing, judged on the man the press would go to (yours, or the best chaser when
  yours is down or over 4m further off), and a dim press moves nobody. The
  CPU side's policy: chase a runner who is clean through (no CPU man standing ahead of him within 15m of his line)
  from 2.5–12m, level or behind, deciding every 0.25s at 0.10 / 0.12 / 0.20; carry into a clean break at 0 / 0.05 /
  0.30 when the nearest defender ahead is over 6m off, letting go inside 2.5m. About 2 / 2 / 3 CPU sprints a match.
- **What you see.** The tackler bound across the carrier's hips; the carrier leaning into a Soft, upright in a Wrap,
  recoiling from a Big Hit; a white impact ring on a Big Hit, with a 70ms hit-stop and a 3px shake when it is yours
  (no shake under reduced motion); the slide-off and the roll-away smoothed over at most 9 m/s, with a quarter turn;
  a wobble while tripped; the gold trail and two speed streaks on a sprint; and on-pitch tags (Big Hit, Ankle Tap,
  Tripped, Fend, Offload, Loose Ball), at most two at a time, about 27 a match on Normal. Sounds: 'tackle' at the
  bind, 'hit', 'whiff', 'trip', 'whoosh' when a sprint starts, 'tick' when the meter fills.

**Measured** (`bot.mjs`, 4-minute halves, duels live, 12 seeds x 120 matches a cell; `census.mjs`-style census of 60
Normal matches at SEED 9032, the previous game measured on the same seeds with the same bot). "Tackled within" means a
made tackle.

| Per match, Normal | Previous game | Now |
|---|---|---|
| Tackle attempts / made | 250 / 128 (51%) | 184 / 81 (52%) |
| Broken tackles | 123 | 89 |
| Rucks (quick / normal / slow) | 127 | 81 (43 / 22 / 15) |
| Run-overs (the carrier within 0.9m of a man on the ground) | 87.6 | 0.6 |
| Ruck ball tackled within 0.5s of the pick-up | 44.3% | 5.4% |
| Turnover ball tackled within 1s | 66.3% | 15.7% |
| Turnovers / penalties / knock-ons | 9.3 / 6.0 / 6.4 | 9.8 / 4.4 / 9.5 |
| Big Hits (yours / the CPU's) | none | 7.6 / 9.3 |
| Offloads made (yours / the CPU's) of tried | none | 8.6 / 1.9 of 13.5 (1.5 held) |
| Fends (yours / the CPU's), ball jolted loose (Knock-On / Loose Ball) | none | 7.0 / 8.7, 1.3 / 1.1 |
| Ankle Taps made of tried, Tripped | none | 5.5 of 10.0, 1.8 |
| Sprints (yours, seconds; the CPU's) | none | 50 (35s); 2.2 |
| Tags | none | 30 (Offload 8.6, Fend 7.0, Big Hit 5.4, Ankle Tap 5.1, Tripped 1.8, Loose Ball 1.8) |

CPU sprints a match by level: 2.4 / 2.2 / 2.9 (2.1s of sprint on Hard). Big Hits on Hard: 8.4 yours, 11.2 theirs.
Your offloads rose from 6.2 to 8.6 a match once the label and the press picked the same receiver (a fifth of the
bot's presses on a lit Offload had been doing nothing). Win rates with and without Sprint are in Measured baseline
below.

### Passing

Every lever is in `RUNON` (`RUNON='{"cpu":0.6}' node tools/bot.mjs` tries a value without an edit).

- **The lead** (`leadPass`, shared with `blockSpec` so the Block close-up's lane is the line the ball takes): the ball is
  aimed where the receiver will be if he runs on upfield from his upfield speed now, picking up at 18 m/s² to top speed
  × pace (1 for a human's receiver, `RUNON.cpu` 0.65 for the CPU's), keeping half his sideways drift, iterated four times
  on the flight time. The landing spot is capped 0.4m behind the passer at release; the handling error is added after
  that, and the spot is capped again at the passer's line, so no pass lands forward (it used to, 0.1% of the time by up
  to 0.27m, because the error came after the clamp). A won Key Pass's sure pass is aimed and sought exactly as before.
- **The receiver runs onto it** (`runOnTarget`): while a pass to him is in the air he heads for the landing spot at
  min(top speed × pace, distance left / time left), pursuing, so he arrives with the ball at pace instead of braking for
  it. Your receiver does this whatever the stick says, as a won Key Pass already did; the stick takes over at the catch.
  A thumb pressed toward touch no longer drops the ball.
- **The line keeps running**: while a pass is in the air the support slots round the landing spot carry an upfield
  lead of 0.95 × the receiver's top speed × `RUNON.line` 0.45s. Without it the line pulls up round the spot: your
  supports fall to a third of their speed during the flight and the CPU's to about 0.5 m/s.
- **The Key Pass runner box** is `RUNON.kpBack` 7.5m behind the carrier (from 6): with the ball moving faster the line
  sits deeper, and at 6m Key Passes fell from 0.7 to 0.2 a match.
- **The open shoulder** (2026-10-31): `holdShoulder` keeps one support runner on the open shoulder, `SUPPORT.lat` 5m
  wide and `SUPPORT.back` 2.6m behind the ball, sliding out to `latMax` 11.2 and `backMax` 6.4 while a defender is
  inside `clear` 5m. The pass ring tints (`SUPPORT.tint`) when a defender is inside `mark` 5m of the man it is on.
  `passing.mjs` pins the spot, the slide, the mirror and the ring. The Key Pass count is under Decided.
- Checked by `tools/passing.mjs` (46 asserts): the lead and its exact mirror for team 1, a CPU passer leading less (under
  0.9 of the human's lead, measured 0.83; the human's is taken before the CPU's pass is staged, which parks team 0 40m away),
  5,000 random staged passes never landing forward, the receiver catching within 0.6m of the spot at pace with the
  stick upfield, toward touch, let go and pulled back, an AI receiver at his side's pace, the sure pass's target and
  seek unchanged to the bit, the line in the air (your supports keep at least 0.8 of their speed, the CPU's stay
  moving), the Block lane, a census guard over 12 bot matches a level with the thumb holding its direction, and the
  open shoulder (the spot, the slide, the mirror, and the white, tinted and gold rings).

### Side Step and Dummy

Every lever is in `MOVES` (`MOVES='{"step":{"push":4}}' node tools/bot.mjs`). `gestureStep` runs once a step for each human
slot after `userStep`, only while his ringed man carries in open play with neither Pass nor Kick held (both aim with the
stick). It reads `inputOf(t).world()` only: L = j.y across the pitch, F = j.x × dirOf(t) along the run, so either team,
either seat, touch, pad and keys are one rule. The history is cleared at a new carrier, at any step he is not carrying in
open play (a cut, a set piece, the ball in the air: `M.stepN` counts every update, close-ups included, and a gap resets it),
on a lifted thumb, on the stick's restore after a duel, at `newMatch`, on a seat change and on resume.

- **Side Step.** The last 4 steps of L are kept. It fires toward sign(L) when |L| ≥ 0.45, |j| ≥ 0.6 and L has risen 0.45
  inside the window; it is armed from each carry, any flick disarms it (acting or not: outside a tackler's reach a flick
  is steering), and it re-arms once |L| < 0.3. It acts with a standing opponent within 4m, 1.25s since the last step
  (side back to -0.9) and 0.10s on the ball: `side = 0.35` (x0.65 tackle odds while it lasts, no Get Past or Key Pass
  cut-in), a 5 m/s dart along the stick (the AI's own step stays 4), the Side Step tag, the whoosh and a 15ms buzz on
  his seat. A Pass inside 0.15s drops the tag (that flick was an aim). A fresh up or down key is a flick on its own.
- **Dummy.** The run held at F ≥ 0.7 for 0.20s, F pulled to ≤ 0.3 within 0.15s, then back to ≥ 0.6 within 0.30s,
  with the ring on a teammate (`shownPass(c).to`) and a standing AI defender ahead within 1.5-9m who is not a human's
  ringed man; 2.5s cooldown, on the carrier (`c.dumAt` against `M.dclock`, as the CPU's is), so a lifted thumb, a pause
  or a duel's restore clears the gesture's shape but never the cooldown (inside `inp.gest` it was one Dummy every 0.3-0.5s
  with a lift between). He bites with chance `bite[level]` 0.9 / 0.75 / 0.6 at the carrier's level: for 0.6s his
  `computeTargets` target is the man in the ring (`p.bite`, `p.biteTo`), wrong-footed (x0.5 pace for 0.5s), shoved
  3 m/s that way and unable to tackle for 0.4s; the carrier keeps the pace he had before the pull. Tagged Dummy
  (with the whoosh and buzz) or Not Fooled. On keys the pull has to be a fresh press of the back key (A or Left
  attacking right, D or Right attacking left), with forward held or let go.
- **The CPU** dummies from `aiCarrier`'s think when its nearest man ahead is 2.5-7m off, `bestReceiver` exists and 2.5s
  have passed, with chance `cpu[level]` 0 / 0 / 0.04 a think (Hard only, about 4 a match), only when a human
  defends, so AI v AI draws nothing (`sim.mjs` is byte-identical to the build before it); it never sells your ringed man.
- **Measured** (`.claude/specs/scratch/feedback/build/del.mjs`, 500 child-like thumb paths each through the game's own
  floating stick into a staged carry): a single flick fires the Side Step 91% of the time (median 67ms from the
  gesture's start), flick-and-return 90%, a double tap 95% (on its first leg), back-and-on fires the Dummy 99%
  (217ms) and the Side Step never, a waggle fires a step on its first leg, a slow swerve 6%, a lift and replace nothing.
  On keys a single tap across fires 100% at once and back tapped with forward held is a Dummy 100% (100ms); forward
  let go and pressed again is nothing. False fires from ordinary steering (`ff.mjs`, 40 Normal matches a device model)
  are under Measured baseline.
- Checked by `tools/moves.mjs` (95 asserts) and additions to `contact.mjs` and `duels.mjs`.

### Goal kicks

A conversion or a penalty goal cuts to a still, floodlit shot from behind the kicker, at pitch level, with the posts
centre-screen. Every kick at goal is a drop kick, as sevens law requires. The camera never moves; only the arrow does.

- **Aim.** The stick steers a gold arrow on the grass (18°/s at full tilt, clamped to ±30° of the posts' centre). On
  Normal and Hard a dotted chalk line runs on from the arrow to the goal line and ends in a tick, so you can see which
  upright you are pointing at; the arrow starts on the posts' centre and allowing for the wind is the skill. On Easy,
  and on your first kick ever, the arrow starts on the wind-corrected line and the aid is the real flight path, 16
  dots ending in a gold dot where the ball would cross, or a chalk cross where it would land short. While you hold,
  the path follows the live meter: you watch it fall short, clear the bar, then hook left.
- **Power.** Hold **Kick**. The meter beside the ball fills in about a second, chalk below the band, gold inside it,
  coral above. Let go in the gold. Under the band the ball is slower, flies lower and fades right; over it hooks
  left. The band is derived from the flight for this spot, kicker and wind, so it moves up, narrows and fills faster
  with distance. A release under 12% is ignored, a cancelled touch is never a kick, and a finger already down when
  the cut-in ends must lift and press again.
- **Strike.** Two strides, the ball meets the ground on the mark as the boot arrives, a 70ms hit-stop, a thump.
- **Wind.** Drawn once per match (30% at 0–3 mph, 45% at 4–11, 25% at 11–18), turned round at half time, and gusted a
  little for each kick. The coral pennants on the posts stream downwind, and the chip at top-left gives the number;
  under 2 mph it reads Calm and there is no hidden breeze. The wind is a constant push on the ball. It only acts on
  kicks at goal; punts, chips and restarts are unchanged.
- **Verdict.** A grade over the result: Pure Strike, Overcooked, Under-Hit, Wind (it would have scored in still air),
  Off the Post, Off the Bar. The ball is judged against the real uprights and the 3m bar, with the ball's radius: a
  post hit below the bar can't score. The points go on at the crossing. A tap from 0.25s after the verdict skips the
  rest.
- **CPU kicks** play the same shot from behind their kicker, in any interactive match, with a chalk arrow that swings
  to show their aim-off and no meter. The big button reads **Skip**: the result was fixed when the kick was set up, so
  skipping can't change it. Headless runs, AI v AI and the menu demo fly the kick instantly on the top-down pitch.
- **Penalty card:** "34m to the Posts · Wind 9 MPH", or "· Calm". Kick at Goal is disabled when this kicker can't
  reach the bar in this wind, and a kick at goal is taken from at least 10m out.
- **Drop goals.** Carrying the ball 6–40m from their line, within 42m of the posts and 40° of square, with the stick
  not pointed at touch or back, the small button reads **Drop Goal** whenever the kick is viable: in range (a calm pure
  strike reaches the bar) and at a bearing that can go between the posts, whatever the defenders are doing (until
  2026-10-17 it also had to be sure a pure strike released 0.1s late would get away from them). A tap is still a chip. Hold it 0.20s and play freezes and cuts in with your thumb
  still down: the meter fills while you hold (faster than a placed kick: 0.80s at 12m on Normal, with a band 1.3x
  wider), the stick steers the arrow as you hold, and the nearest three defenders charge from where they stood,
  accelerating to their top speed. Let go and he drops it, striking the half-volley 0.25s later. A charger within
  1.0m before you release is **Smothered** (a tackle and a ruck); within 1.0m before the strike, or a ball that
  passes within 0.9m of him under 2.4m, is **Charged Down** (a loose ball). Otherwise it flies as a placed kick: a
  goal is 3 points and a kickoff, wide or dead is their 22 drop-out, off the woodwork is a loose ball in front of
  the posts, and a drop that falls short cuts out 0.6s after the strike with the ball still live, so both sides
  chase it. One rule (`blockedBy`) decides the outcome, and one posts rule (`judgeCross`) judges every
  ball that crosses a goal line, ordinary kicks included. The label runs the game's own step on the whole world
  through the 0.20s hold (the kicker on his stick, the AI's chasers and line as the AI drives them, collisions
  included, everyone put back afterwards, nothing random drawn), judges range and bearing where that leaves him, and
  notes the chargers as the hold will leave them: every opponent ahead of him or level within 15m, and behind him only one
  inside the shoulder radius (`shoulder`, 4m): a man on his shoulder is a charger, a chaser 5m behind at full tilt is
  not, at the label and in the close-up alike. The hold is counted in steps: the press opens the close-up on the 12th
  (the ceiling of `hold`/STEP) and the label projects exactly the 11 that run before it. In the close-up the kicker, the ball and the chargers are
  drawn in one list by depth, so a charger closing from behind or beside him goes over him, not under; he is not drawn
  until 2m in front of the lens, fades in over the next 2m, never stands taller than 0.6 of the screen, and one who
  stops the kick lands on the side he came from. The label is
  decided at the press. A Drop Goal press opens the close-up on the 0.20s step whatever moves in the meantime, and
  reads Drop Goal throughout; a Kick press stays a kick. Your first strike at goal, placed or dropped, ends the
  first-kick aids. No kick's hand-back is a turnover: a charged-down drop regathered by either side, a rebound off
  the post or a short drop gathered by the defence are kicked balls, as a punt is. The CPU drops only when the
  charging rule says its strike would get away (`cpuDropOffer`, the test the label used to share), judged on the clock its strike keeps (the world projected through his 0.25s wind-up, then a
  strike with your players given 0.30s to react), winds up for 0.25s in the open (a tackle then is a normal
  tackle), is checked against every one of your players where they really stand, and flies in the top-down view
  with no close-up. A man of yours closing on him charges it down: 4% of offered CPU drops when your man sprints at
  him from 2–11m away, with 13 more tackled in the wind-up per 2,760. A tactical kick's charge-down (the 30% roll)
  is unchanged: the defender stays where he stood.

Balance: Normal equals the CPU's own kicking rate (the only rate the old game had measured), Easy is 10 points above
it and Hard 10 below, and sitters under the posts never miss. Measured with `goalkicks.mjs --rates 4000` at each of
SEED 11, 42 and 3 and averaged (12,000 kicks a cell, good to about half a point), kicking 3, the match wind
distribution; you are the headless bot driving the real input path, the CPU is `cpuKickInputs`. Each cell is Easy /
Normal / Hard.

| Spot | You | CPU |
|---|---|---|
| Conversion, in front | 100 / 100 / 100 | 100 / 100 / 100 |
| Conversion, on the 15m line | 80 / 62 / 53 | 56 / 63 / 66 |
| Conversion, touchline | 55 / 41 / 34 | 37 / 44 / 45 |
| Penalty 22m, in front | 89 / 83 / 75 | 76 / 81 / 84 |
| Penalty 30m, 15m off centre | 79 / 64 / 54 | 57 / 65 / 68 |
| Penalty on the 15m line, 30m out | 67 / 54 / 46 | 48 / 56 / 57 |
| Penalty touchline, 22m out | 57 / 44 / 37 | 39 / 46 / 49 |
| Penalty 40m, in front | 76 / 61 / 47 | 54 / 61 / 65 |
| Penalty 45m, 10m off centre | 64 / 50 / 43 | 45 / 51 / 55 |

You are 2.1 points rms from the build spec's bot column and the CPU 1.1 from its. Easy runs about 5 points above the
spec on wide kicks: its band is derived at the preset aim, so the arrow it hands you really does score with a
band-centre release. The levers are all in `KICK` in `index.html`, and
`GKTUNE='{"band":[0.15,0.13,0.10]}' node tools/goalkicks.mjs --rates 2000` tries values without an edit: `band` is
the main dial (±0.01 is about ±3 points at 30m), `bandMin` floors the width on long and wide kicks, `fill` is the
meter speed, `hook` and `push` the curl, `kw` the wind's pull, `cpuSig` and `cpuAim` the CPU.

**Drop goals**, the headless bot through the real path (press, the 0.20s hold, the close-up), kicking 3, pace 3, the
match wind distribution, 2,000 drops a cell at each of SEED 11, 42 and 3 and averaged. Each cell is Easy / Normal /
Hard; the spec's table is in brackets.

| Drop | Made, no charger | Full tilt charger 12m away as the meter starts: made / charged down |
|---|---|---|
| 20m, in front | 87 / 81 / 72 (86 / 79 / 71) | 88/1 · 82/1 · 73/2 |
| 30m, 10m off centre | 70 / 56 / 44 (71 / 56 / 42) | 71/0 · 56/1 · 45/1 |
| 35m, in front | 70 / 54 / 41 (68 / 56 / 39) | 70/0 · 54/3 · 39/8, offered 6% of the time on Hard |

Every no-charger cell is within 2 points of the spec. A charger standing 6m off is never offered. One jogging in
from 10m is offered only on Easy at 30m (80% of the time, and the average bot is charged down on 14% of those), and a
full-tilt charger 12m away at the press only on Easy, plus one time in five on Normal at 30m (a sixth of those
charged): those cells sit on the offer's boundary, where a release 0.1s late is the promise and the bot's late tail
and 4% fumbles land on the wrong side of it. An offered drop released on time got away every time measured: 0 of 23
charged or smothered over 108 bot matches, and 0 of 48 at the standing-charger boundary. The drop levers are
`dropBand`, `dropFill`, `elev.drop`, `rushMul`, `rushAcc`, `block`, `lat`, `reach`, `offerLate` (how late a release
the label still covers), `hold` (the B hold that opens the cut), `shoulder` (how far behind the kick spot a chaser
still counts) and `cpuReact` (the CPU's reaction margin).

**Offers.** The shoulder radius sets how often the label comes on. Measured with the verifier's `press` probe: 36
matches of 120s halves (12 a difficulty, SEED 21), the carrier pressing B on 8% of the steps the label reads Drop
Goal, once with the stick held at the posts and once with the average bot's own stick, every offered drop released on
the band's centre.

| `shoulder` | At the posts: label on / presses a match | Bot's own stick: label on / presses a match | On-time drops stopped |
|---|---|---|---|
| 3m | 4.3 / 3.3 | 1.75 / 1.4 | 2 of 185 (98.9% away) |
| **4m** (shipped) | 3.2 / 2.3 | 0.9 / 0.7 | 0 of 102 (100% away) |
| 6m | 1.4 / 0.7 | 0.14 / 0.1 | 0 of 34 (100% away) |

Counting every chaser within 15m (the build before the radius) the bot saw the label once in seven matches; 4m puts
a carrier running at the posts at two or three a match and the bot at about one, with the man on the shoulder still
a charger.

## Files

- `index.html` is the whole game in one page. GitHub Pages serves it from `main`.
- `tools/` runs the engine headless in Node. `SEED=n` makes a run repeatable. Run the tools after any change to
  speed, tackling, AI, set pieces or duels.
  - **`node tools/duels.mjs`:** 200 asserts (SEED 1 unless set). It checks:
    - every duel fires from a staged position, and none fires when you steer away;
    - the Tackle duel's trigger (2026-10-17): it fires with the carrier 0.35s on the ball and not at 0.25, with a man of
      yours level with the carrier or half a metre behind him, or goal-side 7.6m off, and not with one goal-side 5.8 or
      6.5m off; front-on (0.4m goal-side is refused) and the 6m band as they were; `TDUEL` pinned as decided (reverted
      with `TDUEL='{"hold":0.5,"lastBack":1,"lastR":10}'`, five asserts fail);
    - the world freezes during a close-up;
    - the Step Left / Step Right direction pin;
    - the sure-pass target, and that the Key Pass burst runs upfield;
    - the three Dummy outcomes;
    - outcomes, fallbacks and the gate;
    - that scrums release at the mark;
    - the scrum (2026-10-17): the stick at rest, forward and back giving the same shove at every step and the same result
      (home side and one player as the away side), the Normal rates at 6 and 7 taps a second with and without a Good Hit
      (your put-in kept, theirs stolen 20-45%, no penalties against), the steal order Easy > Normal > Hard, the penalty
      line at `SCRUM_DOM` and the steal line at 1.2m, the Pushover from 10m out, the same line in `updateScrum` (both packs
      stilled, a shove staged 0.2m short runs on, at the line it ends on the next step) and in `drawScrum`'s bar (a quarter
      full at 1.2m, half at the line), 8 taps a second winning a penalty or pushover on your own put-in over 10% of the time
      (0% with the scrum ending at the old 2.0), and that neither the Help page nor the README tells the player to hold the
      stick;
    - the Key Pass runner box (7m fires, 8m is a Get Past), and the gesture history cleared by the stick's restore after a duel;
    - slow motion (2026-10-17): for every kind at every level, the windows, tells, plan, verdict, judged time and random draws
      are the same with and without it on one seed, the scene clock is always on a whole frame and the slide-in is not slowed,
      the ring opens about 0.6 x secs later in real time (full speed by then), the slow phase is longest on Easy then Normal
      then Hard, the rate schedule (0.4 through the slow phase, 1 from 0.03s before the ring, a rising ramp between with
      frames part way up it, not a jump), Resume before the ring starting the slow phase again, instant mode untouched, two
      player's lock on the same frame, the drawing mid slow phase using the held-back fraction (the same frame drawn with 0
      and 0.9 of a frame held back gives different canvas calls, and drawn twice the same) with nothing non-finite, a bot
      match the same match with more frames frozen,
      and that the Help page and this README say it. On a build without it, 12 of these fail.
  - **`node tools/bot.mjs [n] [half] --duels live|instant|off`:** a scripted average player against the CPU on each
    difficulty, with duel counts and win rates, goal-kick rates for both sides (`kicks us 70% (378) them 69% (109)`),
    and three contact lines: tackles, broken, rucks by length, Big Hits by side; turnovers by kind, offloads, fends,
    jolts, Ankle Taps, Tripped; sprints by side with seconds, penalties, knock-ons by kind, and the tags a match. The
    bot holds Sprint to run down a carrier who is clean through and to carry into space, offloads on 40% of cues and
    never presses Pass in a tackle, and a line of Side Steps and Dummies by side; `HABITS=0` is the old bot exactly (it mashes Pass in a tackle), `NOSPRINT=1`,
    `NOSPRINTBALL=1` and `NODIVE=1` turn single habits off. `GAME=path` runs any tool against another copy of the game.
  - **`node tools/contact.mjs`:** 336 asserts over the contact engine and Sprint, green on seeds 1, 2, 3, 5, 7, 14, 33
    and 99 (every staged bind that must end in a ruck runs with the jolt switched off, so no seed's draw can turn it into
    a scrum). It checks:
    - a sprint that ends in a fall or a bind charges nothing more to the meter, and the push parts standing men 0.4m a
      step (0.2m round a man on the ground or bound), so nobody sinks into anybody;
    - a staged front-on stick: the bind's length, the tackler on the hip, Wrap / Soft / Big Hit speeds, one commit,
      a ruck of its tier, `contactGuard` releasing a bind whose carrier lost the ball, a third man neither rolling
      nor binding, a bound carrier scoring, a pending pass dying;
    - a forced broken tackle: no bind, the carrier's speed, the slide off the hip and the down times, the fend arm
      set at the commit, and a standing carrier (the slide takes his facing, then the line from the tackler, so the
      two never end on one spot);
    - the tier and stick rates against the closed form, 20,000 commits a case: front-on, side-on, from behind, a
      dive, a sprinting tackler, the Ankle Tap, the CPU's Hard edge;
    - the Second Man's reach and his two tier changes against their own levers; `moveAll` collisions: a man on the
      ground, a bound pair (stepped round, not moved, not parted), the 0.2m-a-step cap, an exact overlap parted;
      the roll-away, retiring (the tackler and the Second Man alike), the ruck race (quick / normal / slow), and that
      duel tackles keep the old body with no random draw;
    - the ring in a ruck: it leaves the tackled man for the teammate who will pick the ball up, the stick places him
      and draws nothing random, a let-go still runs him to the mark and he takes the ball, Pass Kick and Tackle stay
      dead until it is out (and Pass and Kick light again once he has it), a turnover still goes to the defence, a CPU
      side is not moved, and in two player only the attacking ring moves;
    - Switch: the dashed ring, the press and the pulse name one man (nearest the ball, the next if that is you,
      the nearest teammate still in front when yours is behind);
    - wrong-footing after a forced turnover; every timer running out in its stated time give or take a step
      (retiring, with the man a chaser and a sprinter again after it and a ringed Second Man's Tackle dim until
      then; wrong-footed; a stumble; a trip; the Sprint ease-out); your automatic tackle base by level; the Tackle
      press rule, A's dim state, and no second join;
    - the Sprint meter: hold, drain, floor, latch (cleared by a release in any phase), the ease-out charged to the
      meter with no refill while it runs, a re-press climbing back instead of snapping, taps in four patterns buying
      exactly the hold's rate, the multipliers, no stacking with a burst, the ring and the ready / dim states judged
      on the man a press would go to (lit while your man is down if a chaser can be picked, a dim press moving
      nobody), KeyL; the carrier's sprint and drain, control moving the sprint, a duel zeroing it, the meter frozen
      in a scrum and a goal close-up, the hold let go at a close-up's open, its close and `resume()`; the ring moving
      to the best chaser;
    - the CPU's meter on every level (floor, drain, refill, no refill while an ease-out is still running — a tackle that cancels one may refill that step — range, the same burst),
      sparing on Easy, the policy's shape (rates rising by level, clean breaks only) and its gates staged with the
      odds forced to 1 (a man ahead in the lane, 4m of space, letting go inside 2.5m), and the staged 14m / 8m chase;
      staged breakaways (4m back is caught with Sprint, 8m is gone);
    - offloads (one receiver for the label, the press and the ring, whatever the stick says), the ball jolted loose,
      Tripped, fends; a census of 60 bot matches (run-overs, ruck ball hit at once, turnover ball hit at once, the
      last tackler, no steals, no new penalty words, the tag list and count);
    - the words, the three-button layout at 667x375, 932x430 and 932x430 with insets (the fan unchanged), the stick
      zone and the resting stick under a notch and a home indicator, a near miss within 12px of a circle, the short
      landscape home fitting at 44px, and the stick and Sprint letting go when the phone turns upright; and a render
      smoke test (nothing non-finite, no drawn man jumping over 0.3m a frame, drawing draws no random number);
    - a staged line break: the fullback commits to the tackle within 2.8 / 2.2 / 2.2s (Easy / Normal / Hard), coming
      from the inside shoulder; Easy with two men still in front chases with the near one and keeps a sweeper;
      Normal commits both of the last two while a man behind chases; a retiring last man does not come up; a set
      line of seven keeps exactly one sweeper.
  - **`node tools/goalkicks.mjs [--rates N]`:** about 640 asserts (642 at SEED 11; one line counts its retries). It checks:
    - the closed-form flight against a 1ms integration, the judge's fixtures, and the mirror for the CPU's end;
    - that band-centre strikes score, the band is honest at its edges, over hooks left and under fades right;
    - the wind's drift, headwind and tailwind, and that the Easy aid's preset aim scores in any wind;
    - the live close-up end to end in a headless user match, the input guards (a finger already down, a release under
      12%, a cancelled touch, pause and resume), and that no random number is drawn between the release and the verdict;
    - the CPU's watch cut, that Skip gives the same result as watching, the instant path under the menu demo's flags for
      both teams, and that the same inputs through the live cut and the instant path give the same result, score and
      restart (a missed penalty's drop-out included);
    - the rate table above, at N kicks per cell (default 1,200): each cell within the sampling noise of the measured
      table (never under 6 points), each table within 3.5 points rms of the build spec's, and the ordering between
      spots, difficulties and kicking ratings;
    - the wind's range, the half-time turn, the labels and the penalty card;
    - a render smoke test: every spot, every difficulty's aid, both teams and every stage at four phone sizes, and once
      under reduced motion, with no non-finite number reaching the canvas (arguments, dash arrays and property sets)
      and the posts, ball, meter and chip where the spec puts them;
    - the drawn woodwork: 0.5s after a contact the ball is between the uprights and beyond the line on screen exactly
      when the kick scores, and a miss is back in play; the held ball sits at the kicker's hip and does not jump at
      the drop; the flight zoom moves under 0.08 a frame on an in-front conversion; and the verdict banner is clear of
      the ball and the A button at 844x390 and 667x375;
    - drop goals (groups 23–30): the zone (on with a standing charger brought from 14m to 2m in front and with one 6m off
      at full tilt, the man standing 3m in front then smothering the kick in the cut), the B tap v the 0.20s hold through the real input path,
      a release during the cut-in, pause and resume; the charging geometry (12m standing gets away, 6m full tilt is
      Charged Down, no release is Smothered, and with a standing charger at eleven distances the label on at every one
      while the late strike turns from blocked to clear once); every
      hand-back (3 points and a kickoff, the 22 drop-out, the live `g3d` ball with chasers on it, the loose ball off the
      woodwork, the charger 1.2m in front); the CPU's drop (blocked by your man 2m in front, scoring only through
      `judgeCross`, a wide one their 22, the real AI trigger); the one posts rule on ordinary kicks; the drop-rate table
      above; and a render smoke test of every drop stage with two chargers at three sizes;
    - the press decides (groups 31–35): a Drop Goal press opens the cut on the 0.20s step though the stick went to
      touch or a charger landed 3m off, the label holds through the hold, a Kick press stays a kick, a flick to touch
      costs nothing, and the zone is judged where the hold ends; the label's projection is the real step (the kicker's
      run with the stick forward or let go, the chaser turning in, every player put back, nothing random), the label on
      at 31 of 31 distances with a standing charger 7-10m off while the late pure strike is blocked at the near 13 and
      clear beyond, a man on the shoulder in the label's set and the charger in the cut (he stops it with the stick
      forward; with the stick let go he dives at the braking kicker during the hold and misses), and a chaser 5m behind
      out of the set and the cut alike (the `shoulder` lever); the CPU's offer on its strike's clock (your man standing 5m off is offered and charges
      it down by sprinting; 3m, or 8m sprinting, is not), with nothing random drawn; no hand-back is a turnover and a
      tactical kick's charge-down leaves the defender where he stood; and the first drop on a device gets the path aid, its
      cut-in marking the tutorial's drop moment seen;
    - one step count and the lens (groups 36–38): the press opens the cut on `holdSteps()` and the label projects
      exactly the steps before it, bit for bit, at holds of 0.20, 0.205, 0.22 and 0.25s; a charger 10m behind (staged
      with the radius widened) and one beside the kicker are drawn in depth order over him, none until 2m in front of
      the lens, none taller than 0.6H, no NaN on the canvas, and one who smothers or charges down from behind lands
      behind the kicker; and `kickLabel(t)` reads its own seat, with the HUD passing its team;
    - the thumb (group 39): a Drop Goal label still gives a drop if the stick is let go on the press frame or during
      the hold, a chaser who closes into the shoulder radius as the kicker brakes stays out of the cut (the cut judges
      the chargers behind him that the label saw), and a drop charged down from behind bounces away from the man
      who blocked it.
  - **`node tools/sim.mjs`:** AI v AI matches, with no duels, both sides' goal-kick rates and the CPU's drop goals.
  - **`node tools/twoplayer.mjs [--sym N] [--lock]`:** 708 asserts over the input layer, the sides, the roles, the join screen
    and the match head to head, green on seeds 1, 2 and 11 in about 37s. `--sym N` plays N pairs at 4-minute halves (400 by
    default) and adds the away-side, AI v AI and handicap runs (about 12 minutes); `--lock` runs the lock sweep (about 40s). The
    default symmetry sample is 100 pairs at 2-minute halves. It checks:
    - the keyboard routing (the solo map, the two halves, the lone keyboard seat, preventDefault, repeats, releases, blur,
      the native menu keys in one player, a step from a fresh key in a duel);
    - controllers (edges, the dead zone, trigger hysteresis, an idle pad leaving held keys held, the d-pad as keys and as
      the aim, Start, a mapping-less pad, the stick latched through a cut-in, disconnects in one and two player);
    - the seats (claiming, Use Keyboard, Swap Players, a third pad ignored, a pad on a menu never reaching the slots);
    - the mirror: a team 1 duel (one player as the away side) equals the team 0 duel in the owner's frame to 1e-9 — the
      triggers, the frame data, the camera, the drawing with the kits swapped, and every outcome landing at the mirror;
      the kick-aim cross, the penalty card and the drop zone mirror too;
    - two player: a whole match played by two bots, the pass in hand, the kick charge, a drop goal and a conversion from
      seat 1's slot, Sprint on each side's own meter, a pass and a dive on one step, Switch per seat;
    - the roles: no cpuSpeed or cpuTackle in two player, each side at its own level, the away side's CPU terms on team 0,
      AI v AI fair at every level, a pack a side at the scrum and a jumper a side at the lineout;
    - one player as the away side, played to the end by the bot;
    - the home and the join screen: the desk-only Two Player button in its place and `body.desk` following the pads connected
      now, Title Case labels and no arrow glyph in the markup, both seats on the halves on a fresh visit, each card's legend
      (the keycaps by scheme, arrows as CSS triangles, the pad glyphs, lit from onKey and pollPads) and its fixed rows, a pad
      claiming a seat and the screen following, Swap Players (the Difficulty going with the player), Use Keyboard giving the
      halves by seat, a Difficulty each (saved, and cleaned on load), and the team flow (Player 1 picks first, then Player 2
      with Change Team pressed from Player 1's own seat, a mirror match allowed, the pick starting the match at both levels with
      the touch controls off and the scorebug tags on; Quick Match's screen and a one-player match unchanged);
    - the match head to head: the tags 1 and 2 and the Sprint arcs drawn in each player's colour (and not in one player), the
      arc as the meter, the cue chips reading the key and what the button would (. · Drop Goal, / · Tackle, F · Offload, Long),
      Start on either pad, the pause card naming a lost pad's player, the penalty card naming its player and taking only his
      seat from his keys and his pad (and nothing left on a slot), the pause card over it anyone's, the half-time card taking
      either seat's keys, the close-up cues naming each player's key for scrums, lineouts, a conversion and a drop, and a pad
      seat's cues naming its buttons by position;
    - the duel locks, for both owners: a Get Past push in the grace guarding the side it points at with the feint's animation,
      a feint and back allowed and a third change ignored, the guard fixed at the lock (a step to the open side breaks, into the
      guard is Wrong Way), an idle chooser playing the drawn feint, a Hard timer's later lock, the chooser's run key held into
      the cut making no choice and a fresh key making one; Key Pass's live drift, fake and drift again before the lock (Dummy
      sells a drifter, Pass draws a rusher, a still hand on a plain plan is a rush), a drawn drift and a drawn fake kept for an
      idle chooser, an Easy timer's drift pulled back to its lock; the Tackle's one step moving the contact, the window and the
      end by 0.10s with the approach eased and the camera reframed, a second push ignored, a drawn step at the lock, a held key
      no step; the Block's Dummy pressed in the grace and kept until the pump, the release sounding once at 1.05 (and once at
      0.75 for a plain release), a press after the pump ignored, a drawn dummy kept; the chooser's ring handed to O; the owner's
      stick re-centred through the grace; the cues naming both players' keys; and that one player's duels have no lock;
    - Full Time head to head: Player 1 Wins / Player 2 Wins / Draw with the seat tags (a mirror match named by player), Rematch
      with the same teams and levels, the Series line (wins, draws, counted once a match), Change Teams going back to Player 1's
      pick with the series kept, Back to Menu ending both, and one player's cards unchanged;
    - cards and pads: Sprint and the d-pad let go on the penalty card, A on the half-time and pause cards, released on the slot
      with a fresh edge after (one player and two), a pad lost mid-match claimed back into its own seat by the next press, the
      halves by seat after a release (and as a swap left them), both pads lost at once reseated in order, a pad lost on the
      half-time card back with one press, a pad pressed on the team screen claiming nothing, and a stick held through a duel,
      a drop goal or a CPU conversion reading live the moment the cut hands back;
    - the tutorial hold: Player 2's first Key Pass held under his card, Player 1 pushing away from the runner during it and
      holding through Play, read as a rush on keys and on a pad alike (and as without the card): only the owner's stick is
      re-centred by the hold, so the chooser's pad is never latched;
    - the handicap: an Easy player against a Hard one gets his own windows, lock lead, path aid, refill, shove and reach, the
      AI tacklers at his own rate and interceptors at the passer's level, per-owner quotas (two each a half, never the same kind
      twice running, the bonus shared), the first-duel and two-fails aids per owner (one player's are the tutorial's
      per-device memory), and `M.di` forced to 2 changing nothing a player faces;
    - render smoke at 1024x600, 1280x720, 1440x900 and 1920x1080: open play, a scrum (the cues, the tags over both packs, an
      Early tag in pink, the bar gold to the right and pink to the left inside W·0.38), a lineout, every duel with each side as
      timer (both cues in their colours, the tags over U and O, the live ring in the owner's colour), both conversions and a drop
      goal, with no non-finite number on the canvas; and a phone-sized one-player scrum drawing none of it;
    - isolation: Player 1's conversion ignoring Player 2's slot until the verdict, the timer's and the chooser's other buttons
      doing nothing in a Get Past, each pack pushed from its own keys, Player 2's arrows moving only his man;
    - the paired symmetry run: N pairs of two-bot matches (the set pieces contested, the chooser's hand by keys on one seat and
      the stick on the other, the owner with a 0.25s reaction model, the penalty and half-time cards pressed as a player would),
      each seed played both ways round: Player 1's share of the decided matches and his paired margin, tries, goal-kick
      percentage, duels owned and won, scrum and lineout retention by side, and the frozen duel time against one player's at
      the same half length (per duel within 15%, the match within 1.8 x: since the slow run-in, 2026-10-17, the old 1.6 x a
      match only measured that two player has about 1.75 x the duels), plus the mirror match; under `--sym` the away-side comparison (win rate within 5 points, tries
      within 0.3), AI v AI's share over 500 matches (0.45–0.55) and the handicap (Easy beats Hard over 60%, swapped within 8);
    - under `--lock`: the sweep (below), and the shipped `DUEL_LOCK` within 8 points of one player in every cell.
  - **`node tools/teams.mjs`:** 112 asserts. It checks:
    - every pairing of built-in teams has shirts far enough apart, and hooped sides keep their hoops;
    - the nations keep their order, and Farnham leads Local;
    - a team you make is cleaned up and held to the budget;
    - its automatic short name skips codes in use, and two sides never share one on the scoreboard;
    - a black away shirt still shows on the dark scoreboard and plates;
    - opponents are drawn fairly (the old random-comparator sort was badly skewed in Safari);
    - Local and mixed championships, including when the Triple Crown is awarded;
    - the chase between fixtures: the place and the gap, still in it or out of the title, a clinched title, the next
      match's stake (the slam, a draw, a win, a try-bonus win, a must-win), the other games and the run-in, and the
      final prize. Full time stays the score, the result and the table points;
    - the gentler start: the first two Normal matches, a stronger side, and the weakest opponent first;
    - that a championship saved before clubs existed still loads;
    - that Quick Match is the gold button, the Duels switch is gone, and a save round-trips the championship, the
      settings and a team you made, with duels forced on. A broken championship, bad settings and unreadable storage
      are dropped without taking the rest with them, and a full storage still starts the championship.
  - **`node tools/postmatch.mjs`:** the full-time card and the counts behind it. Conversions are kept apart from penalty
    goals, a tackle is charged to the tackler, metres are the ground made while carrying, a duel belongs to its owner,
    the card is hidden at half time, and a headless finish and the menu demo do not open it. Continue and Rematch are
    still one press.
  - **`node tools/setpieces.mjs`:** scrums at 4-8 taps a second (jittered 18%, the thumb off the stick, with a Good Hit or
    a late first tap; SEED 1 unless set) and lineouts at different jump timings. ENG v FRA, equal packs.
  - **`node tools/passing.mjs`:** 46 asserts over the led pass and the open shoulder (above, under Passing).
  - **`node tools/moves.mjs`:** 99 asserts over the Side Step and the Dummy (SEED 5 unless set): each fires from each team each
    way, tags, the x0.65 odds and the dart; does not fire with no tackler inside 4m, inside the cooldown, for a slow swerve,
    for a man handed the ball with the stick already across, for a receiver whose stick swung through the flight, on the
    restore after a duel, inside a drop goal's projection, with Kick or a long Pass held, or split by a missed step; the
    rules that geometry used to pass for, each with the defender held in place every step and a positive control beside
    it: the first 0.10s with the ball (a flick at once with a tackler 2.5m off, the same flick 0.15s on), the armed and
    re-arm rule (a steering flick at 6m spends the flick; a rise from 0.5 to 0.98 that never passes under 0.3 does nothing,
    after a step too; a jump from 0.7 straight to -0.7 does nothing, the same move through the centre fires); a Pass inside
    0.15s drops the tag; keys (a fresh across key, up then down, Player 2's arrows, A with D held is a Dummy, forward let go
    and re-pressed is not); the Dummy sold and Not Fooled by the bite draw, the defender's drift target and its end, his
    tackle held off 0.4s from tcd 0 (untouched when Not Fooled), the carrier's pace kept, the bite by level; not for a long
    pull (over 0.30s back; 0.13s is one), a thumb eased back over 0.4s (0.1s is one), a swerve, a waggle, no defender inside
    9m, no ring receiver, a second back-and-on 0.35s on (2.5s on is a second), a lift and re-touch through the zone's own
    pointer listeners, nor a lift between two back-and-ons inside 2.5s (the cooldown is the carrier's), or a run under 0.20s;
    two player never selling the chooser's ringed man; a Side Step flick Chrome coalesced into one move (the peak across
    the run counts, the same endpoint with no intermediate samples does not); the CPU dummying on Hard only, never selling
    the ringed man, and drawing no random number in AI v AI (the same stretch from one seed at cpu 0 and 0.5: the same count of draws and every
    man on the same spot); the d-pad and an analog stick on a pad; and every tag Title Case with the Help naming both.
    `MOVE_BOT=dummy|step|both` gives the harness bot the moves (half the time, `MOVE_P`), for `bot.mjs` and `twoplayer.mjs --sym`.
  - **`node tools/hints.mjs`:** 145 asserts over the hints card (SEED 3 unless set): the settings (defaults, cleaning, the save
    round-trip, one player's switch, each player's by half and following Swap Players, the card ticks, every switch saving the
    moment it is pressed: the card tick, the pause rows, a join tick and the home row, which stores a boolean); the words for
    every duel on touch, keyboard and controller, the chooser's cards, the badges (F, A D, W S and the back key for Player 1;
    /, the arrows for Player 2; J K L in one player; the pad glyphs; a keyboard or pad card badged so its rows start 7px
    lower, clear of the rule line, and a two-keycap or shoulder chip wide or mid so its badge never sits on its own label),
    the scrum both ways, the lineout both ways, a goal kick and a
    drop from the real B hold (no card before the cut-in, none after the strike, the tick hidden), no card for the CPU's kick,
    every open-play card, Title Case, no arrow glyph, the width budget (title 9, rule 21, row 18 characters: the 217px limit
    at 667x375) and one row per duel card; when it shows (the first frame of the cut to the verdict, the chooser's to his
    lock, Hints Off, the canvas tag yielding to a titled card and staying under a kick card, nothing in the demo); clearance
    over bot-match duels at 667x375, 740x360, 844x390 and 932x430 (no figure's head and no ring under the card); the open-play
    triggers staged one by one (a defender 4.5m ahead, the ring on a team-mate, a man to skip to after 0.8s held, space with
    the meter full, the Offload and Drop Goal labels), 3s up, 4s apart, once a match, never in a cut or a set piece, each seat
    its own in two player, no random number drawn; the penalty card's sublines and tick, the pause rows (one grid, so the two
    On | Off controls share a left edge), the home's four rows, the two-player card limits (12px short of the scorebug's seat
    tags from either side, a bound card wrapping rather than spilling), the join ticks through the screen's own flow (Two
    Player opening on the saved halves, Swap Players swapping them), the markup and the Help entry; and the Step Left |
    Step Right plates never meeting the card for a thumb anywhere from y 70 to 200 at 667x375 and 844x390 (the card's
    measured box, the floor its bottom while it is up). On a build without the card it exits at once with one failure.
  - **`node tools/tutorial.mjs`:** 76 asserts over the first-time tutorial (SEED 2 unless set): the first Get Past's card at the
    cut, the hold (10s of frames: nothing moves, no clock, no random draw, a flick not judged, the stick re-centred), a press
    for Next and one for Play, then the slow run-in; every other moment once (Next, Skip and Play by button and by a tap
    anywhere, the scrum held before Crouch then played out, the goal kick's card and path aid then the kick from Aim, the
    drop's thumb still down carrying over Play and one lifted needing a fresh press); the words on every device and for each
    seat, Title Case, no arrows, every key a `{code}` token drawn as a keycap by `tutHtml` (Player 2's / and . as `<kbd>` in
    the sentence; with the keycaps read as a word, no card on any device or seat names a key as bare punctuation or a lone
    letter), the Help entry and the card's markup; Hints Off giving no card but the memory and the +0.08
    aid once per kind; headless never pausing; the save round-trip and cleaning; Replay Tutorial; pause under the card; two
    player naming the owner with either seat advancing and the memory the device's; a CPU scrum's card yours; no card for the
    CPU's kick; Quit Match taking the card down. On a build without it, it exits at once with one failure.

### Measured baseline

Measured 2026-10-13 with `bot.mjs`, after the contact review's fixes (the ease-out charged to the meter, one offload
receiver, the Second Man retiring, bound pairs stepped round) and the retune: 1,440 matches per row (SEED 1–12 x
120), 4-minute halves, duels with the Dummy and `BURST` at x1.09 (x1.14 Perfect). The standard error is about 0.3 /
1.0 / 1.3 points (Easy / Normal / Hard), so a difference between two rows is good to about ±1.4 / ±1.8. The first
row is the bot with its habits (Sprint held with the ball into space and to run down a clean break, offloads on 40%
of cues, no Pass in a tackle), the second the same bot never touching Sprint, the third the old bot exactly
(`HABITS=0`), and the last the previous game (206958f) on the same seeds, so the deltas are like for like.

| | Wins, duels off | Wins, duels live | Tries, live (us–them) | Duel win rate | Goal kicks, live (us / them) |
|---|---|---|---|---|---|
| Easy, with Sprint | 98.6% | 99.0% | 9.3–0.5 | 82% | 83% / 66% |
| Normal, with Sprint | 82.4% | 87.8% | 5.6–1.0 | 67% | 70% / 77% |
| Hard, with Sprint | 47.4% | 52.0% | 2.6–2.0 | 50% | 59% / 78% |
| Easy, no Sprint | 97.2% | 98.4% | 8.6–0.5 | 82% | 83% / 67% |
| Normal, no Sprint | 80.2% | 83.1% | 5.0–1.1 | 67% | 70% / 76% |
| Hard, no Sprint | 40.5% | 45.9% | 2.4–2.3 | 51% | 61% / 78% |
| Easy, old bot | 97.3% | 99.1% | 8.8–0.5 | 81% | 83% / 66% |
| Normal, old bot | 77.9% | 82.7% | 5.1–1.2 | 67% | 70% / 75% |
| Hard, old bot | 40.4% | 46.3% | 2.5–2.4 | 50% | 59% / 79% |
| Easy, previous game | 97.8% | 99.0% | 9.3–0.4 | 83% | 83% / 65% |
| Normal, previous game | 80.6% | 86.3% | 5.1–0.9 | 66% | 70% / 75% |
| Hard, previous game | 44.9% | 47.6% | 2.4–2.0 | 49% | 60% / 78% |

- **With Sprint** (duels live) is 0.0 / +1.5 / +4.4 on the previous game on the same seeds; **no Sprint** is -0.6 /
  -3.2 / -1.7, and the **old bot** +0.1 / -3.6 / -1.3. A second block of seeds (13–24, live) read 87.7 / 54.4 with
  Sprint, 83.1 / 44.2 without and 85.6 / 50.6 for the previous game on Normal / Hard. An independent check on 20
  more seeds (101–120) read the sprint user +1.0 / +1.5 and the non-user -2.0 / -3.0. **Pooled over 5,280 matches a
  cell, the sprint user is +1.4 / +2.9 on the previous game and the non-user -2.4 / -3.6** (Normal / Hard; each about
  ±0.6). The non-user's loss is about the 3-point limit Gordon set; the sprint user's gain on Normal is small, about a
  point and a half, because the contact engine alone costs 2–3 points. Sprint itself is worth about +3.9 on Normal and
  +6.5 on Hard (with against without); it was worth more before the ease-out was charged.
  The table this replaces (the first build, with the free ease-out and the CPU at chase 0.40 and offload 0.30) read
  83.3 / 87.8 (Normal) and 46.9 / 51.0 (Hard) with Sprint and 77.7 / 82.2 and 40.6 / 45.9 without, and the one
  before contact 98.2 / 99.2 (Easy), 81.0 / 84.9 (Normal) and 44.4 / 50.2 (Hard), on other seeds.
  **Stronger Sprint (2026-10-17, Gordon: "make the sprint a bit stronger").** The chaser went from x1.20 (x1.15 Hard)
  to x1.25 (x1.20 Hard) and the carrier from x1.05 (x1.04) to x1.06 (x1.05). Measured against the old values on the
  same 6 seeds x 120 matches (duels live; each cell about ±1.5): a Sprint user +1.8 on Normal and +1.5 on Hard; a player
  who never sprints +1.1 on Normal (noise) and -4.2 on Hard, because the CPU's chases are stronger too. Sprint is now
  worth about +3.4 on Normal and +6.7 on Hard against not using it. A longer burst (2.5s) or x1.30 only made the CPU's
  sprints hurt a non-user more (-2 Normal, -5.5 Hard) without helping the user.
- **Levers.** `SPRINT.mulBall` is the with-ball lever: x1.08 gave the sprint user +7 / +10 on Normal / Hard (a
  runaway), x1.04–1.06 about +4 / +5. `SPRINT.cpu.chase` and `cpu.carry` set how often the CPU sprints: a CPU that
  chased every runner past all but its last man (14 sprints a match on Hard) took 9 points off a player who never
  sprints. With the ease-out charged, the three CPU-side edges were each switched off in turn against the no-Sprint
  bot (1,440 matches a cell, the same seeds; noise about ±1.4 on a difference): on Hard the CPU's chase sprint at
  0.40 (4.2 a match) cost that player 4.2 points and the CPU's offloads at 0.30 (5.7 a match) 4.2 more, while on
  Normal nothing moved it beyond the noise (offloads +0.9, Big Hits +0.7, jolts and the turnover base nothing).
  The chase sprint is a tax on the player who does not sprint: halving it to 0.20 gave him +4 on Hard and the sprint
  user +0.8. So three CPU-side levers were trimmed, none of Sprint's own: `SPRINT.cpu.chase[2]` 0.40 → 0.20 (about
  2.8 CPU sprints a match on Hard), `CONTACT.off.cpu` 0.30 → 0.10 (about 2 CPU offloads a match) and
  `CONTACT.dom.front` 0.06 → 0.03 (the front-on bonus mostly fell to the CPU, because the bot runs straight at the
  line; CPU Big Hits on Normal 10.2 → 9.3 a match). The dials left if Gordon wants the non-user closer still:
  `CONTACT.off.cpu` 0 is worth about another point on Normal, `SPRINT.cpu.chase[2]` 0.10 about one on Hard.
- **Playtest fixes (2026-10-17): the baseline moved, by the led pass and the Side Step.** Measured with `bot.mjs`,
  1,920 matches a row (SEED 1-16 x 120), 4-minute halves, duels live, the previous game (2463dfa) on the same seeds. The
  standard error on a row is about 0.3 / 0.8 / 1.1 points (Easy / Normal / Hard), so a difference is good to about ±0.4 /
  ±1.1 / ±1.6. The first two rows are the plain bot (its habits as above, no deliberate gesture: its swerves still fire
  about 47 Side Steps a match, a thumb's steering fires 0.3-11, see below); the next two give it the moves half the time
  it could use them (`MOVE_BOT=dummy`, `MOVE_BOT=both`; 960 matches a row, seeds 1-8).

  | | Wins | Tries (us-them) | Duels a match (Tackle) | Intercepts | Knock-ons |
  |---|---|---|---|---|---|
  | Easy, previous game | 97.4% | 5.47-0.29 | 4.59 (0.48) | 6.8 | 9.4 |
  | Easy, this build | 99.1% | 9.22-0.58 | 3.13 (0.09) | 8.7 | 11.1 |
  | Normal, previous game | 84.4% | 3.67-0.74 | 4.99 (0.60) | 9.1 | 10.2 |
  | Normal, this build | 86.5% | 6.13-1.41 | 3.77 (0.13) | 11.8 | 12.2 |
  | Hard, previous game | 47.0% | 1.59-1.58 | 4.71 (0.68) | 10.5 | 10.6 |
  | Hard, this build | 44.5% | 2.77-3.00 | 3.53 (0.17) | 14.3 | 12.9 |
  | Easy, with the Dummy habit | 98.8% | 9.31-0.61 | 2.97 | 8.7 | 11.2 |
  | Normal, with the Dummy habit | 82.4% | 5.96-1.49 | 3.52 | 11.5 | 12.1 |
  | Hard, with the Dummy habit | 42.0% | 2.64-3.10 | 3.42 | 14.1 | 12.8 |
  | Easy, both moves | 98.2% | 9.01-0.60 | 2.90 | 8.9 | 10.9 |
  | Normal, both moves | 83.4% | 6.06-1.46 | 3.57 | 11.7 | 12.1 |
  | Hard, both moves | 41.6% | 2.65-3.08 | 3.35 | 14.4 | 12.7 |

  - **Wins** move +1.7 / +2.1 / -2.5 (Easy / Normal / Hard), inside the 3-point limit on every level, with the levers left
    at the investigation's values (`RUNON.cpu` 0.65, `MOVES.step.push` 5, `MOVES.step.range` 4). The two changes pull
    opposite ways: the led pass alone (measured before the moves, same seeds) was +1.5 / +1.0 / -3.6, the Side Step
    then +0.2 / +1.1 / +1.1 on top. `RUNON.cpu` 0.6 on seeds 1-8 gave +2.6 on Hard and +0.4 on Normal against 0.65, if
    Hard is ever to come back up.
  - **Tries** roughly double at every level (the ball lands in front of the receiver and he takes it at pace), the CPU's
    too; intercepts and knock-ons rise because catches happen nearer defenders. **Duels** fall by about a match: a step
    blocks the Get Past and Key Pass cut-ins, and the **Tackle duel** (the CPU carrier at your last man) falls from 0.6
    to 0.15 a match, because he now reaches your line at pace with team-mates round him. Gordon accepted both for now;
    the Tackle trigger was retuned the same day (**The Tackle duel's trigger and the Drop Goal label**, below).
  - **The CPU's Dummy** on Hard: 4.3 a match, about 2.4 of them sold (the `cpu dummies` column of `bot.mjs`).
  - **With the Dummy habit** the bot does worse, not better (-4.1 on Normal and -2.5 on Hard against the plain bot on the
    same eight seeds), unlike the investigation's +0.9. Pulled apart on seeds 1-4 x 120 (the plain bot there 99.8 / 86.9 /
    45.4): the same habit with the bite forced to 0, so no dummy is ever sold, reads 99.0 / 85.0 / 40.4, and with it forced
    to 1 reads 99.6 / 86.0 / 42.3. So the move itself is worth about +1.0 / +1.9 (Normal / Hard) when it sells, and what
    costs the bot is its own check: it pulls back to -0.3 for five frames, halves its swerve while it does, and runs on
    straight at a man 3.5-7m off whether or not anyone bit. The move is for a thumb that picks its moment; the harness
    bot is kept honest about it rather than tuned to like it.
  - **Two player** (twop.mjs, the symmetry drivers, 240 matches): 6.72 → 9.40 tries a match (the investigation's
    estimate was 8.5; the Side Step adds the rest), Player 1's share 50.2% (se 3.2). The band was provisional and the
    bots score more than people will; `TWO.tackle` +0.08 is worth about -0.45 tries if it needs pulling back.
  - **False fires** (`.claude/specs/scratch/feedback/build/ff.mjs`: the bot's wanted direction through a device model, 40
    Normal matches each, nobody making a deliberate gesture): Side Steps a match on touch with a closed-loop thumb 0.3,
    a displacement thumb 10.8, a thumb that runs onto the pass 9.5, a nervy thumb (1.5 jabs a second) 52.9; a pad 7.2;
    keys 23.2, keys with corrective taps 30.7; the raw bot 45.8. Dummies: 0 on every device (the back-key rule removed
    the 2 a match the keys model gave in the investigation). Every one of these is a sharp reversal near a tackler, which
    is what the move is.
  - **Scrums** (duels.mjs, 300 a cell, Farnham v Haslemere, jittered taps, thumb off the stick; `scrum.mjs` at 400): on
    Normal at 7 taps a second with a Good Hit your put-in is kept 100%, theirs stolen 31-33% (Against the Head), with no
    penalty against and a penalty on your own ball 7-8%; at 6 a second 100% / 7-8% / 0 / 0; at 5 a second 100% / 0; at
    8 a second 100% / 47-48% / 0 / 21-22%; with a late first tap (no hit) 7 a second keeps 100% and steals 0. Easy
    steals 7 / 40 / 65 / 87% at 5 / 6 / 7 / 8 a second, Hard 0 / 1 / 14 / 29%. The rows with the stick at rest, forward
    and back are identical; the away side (SEED 3) reads 0 / 9 / 29 / 49% on Normal; against Guildford (power 4) Normal
    steals 1 / 17 / 34% at 6 / 7 / 8. Before: 7 a second with the thumb off the stick kept 85-87% of your own and stole
    0% of theirs, with a penalty against on 10-14% of theirs; 6 a second kept 67-73% and conceded 27%.
  - **Passing census** (`passing.mjs` at its default SEED 1, 12 bot matches a level, the thumb holding its direction through
    the flight): your completed passes (93 / 87 / 72 a match on Easy / Normal / Hard) are caught 2.6-2.7m behind the passer
    at 5.7-5.8 m/s upfield, 4% standing, 0.08 / 0.00 / 0.17 dropped a match, and the ball is past the release line 1.5s on
    (+0.58 / +0.31 / +0.25m); the CPU's receivers catch at 4.97 / 5.15 / 5.33 m/s. Before (the same census on 2463dfa):
    -2.9m at 5.3-5.4 m/s but 17-28 passes a match dropped with the thumb held, the ball -2.5 to -2.7m 1.5s on, and the
    CPU's receivers catching at 0.7-0.9 m/s.
- **The Tackle duel's trigger and the Drop Goal label (2026-10-17).** Measured with `bot.mjs`, 1,440 matches a row (SEED 1-12
  x 120), 4-minute halves, duels live: the game before the led pass, the build as shipped that afternoon (ff17545) and this
  one, on the same seeds (`.claude/specs/scratch/tackleduel/rates.mjs`). The standard error on wins is about 0.3 / 1.0 / 0.8
  points (Easy / Normal / Hard).

  | | Wins | Get Past a match | Tackle a match | Duels a match | Frozen |
  |---|---|---|---|---|---|
  | Easy, before the led pass | 98.2% | 2.39 | 0.49 | 4.57 | 8.6s |
  | Easy, ff17545 | 99.5% | 1.58 | 0.09 | 3.13 | 8.3s |
  | Easy, this build | 98.9% | 1.70 | 1.70 | 4.68 | 12.3s |
  | Normal, before the led pass | 85.7% | 2.56 | 0.60 | 5.00 | 9.4s |
  | Normal, ff17545 | 86.7% | 1.77 | 0.14 | 3.79 | 9.5s |
  | Normal, this build | 86.9% | 1.82 | 1.76 | 5.21 | 13.0s |
  | Hard, before the led pass | 48.9% | 2.17 | 0.68 | 4.73 | 8.9s |
  | Hard, ff17545 | 44.8% | 1.49 | 0.19 | 3.58 | 8.3s |
  | Hard, this build | 44.4% | 1.42 | 1.80 | 4.98 | 11.5s |

  - **What blocked it** (`.claude/specs/scratch/tackleduel/probe2.mjs`: every condition of `findTackleDuel` judged on its own
    over 30 Normal matches): with everything else right, your man was behind the carrier on 165 steps a match (3-6m behind
    him: the chaser), another man of yours within 10m on 28, and the hold under 0.5s on 7 (nearly all under 0.1s: the
    catch). Relaxing the last-man test alone (goal-side within 7m) gave 8 eligible steps a match, the hold alone (0.2s) 1,
    both 22. The sweep (4 seeds x 60): `lastR` 8 with `hold` 0.3 gave 1.5 / 1.5 / 1.5 Tackles a match, `lastR` 7 with
    `hold` 0.2 1.8 / 1.9 / 2.0, `lastR` 6 with `far` 7 2.4 / 2.5 / 2.6, `ctrlT` 0.3 2.5 / 2.7 / 2.8; the chosen `hold`
    0.3 and `lastR` 7 sit at Get Past's rate. The duel win rate is 81 / 66 / 50% (83 / 67 / 52 before). The frozen time is
    the one cost: each duel carries its slow run-in, so the total is 3-4s a match more than the game Gordon played that
    morning, at the duel count the game had before the led pass.
  - **The Drop Goal label** (`.claude/specs/scratch/tackleduel/dropprobe.mjs`, 30 Normal matches at SEED 3, the bot carrying):
    the label is on for 100% of the steps the carrier is in range and in front with the stick forward (506 a match, in 8.6
    spells), from 19% (94 steps, 2.3 spells) under the charger rule. A bot that holds B the instant the label appears takes
    9.2 drops a match: 15% made, 11% wide, 10% charged down, 63% smothered (Easy 10.8 a match, 19% made, 63% smothered; Hard
    5.4, 9% made, 61% smothered). One that waits until nobody is within 5m takes 2.2 a match: 45% made, 26% wide, 28%
    charged down, none smothered. Under the old label the same bot took 2.3 a match, 59% made, 32% wide, nothing blocked.
- **Why the goal-kick note moved:** before goal kicks the headless bot converted 100% of its kicks, because the old
  modal's timing only ran in `frame()`. It kicks through the live close-up at 83% on Easy, 70% on Normal and 60% on
  Hard, and the CPU kicks at its own rate on every level. The table before goal kicks read 98.9 / 99.4 (Easy),
  83.5 / 88.3 (Normal) and 48.9 / 53.3 (Hard).
- The bot lets go of Kick on the step nearest its planned release. `update` adds a step before it sees the release,
  so a bot that waits for `pt + STEP/2` strikes a full step (17ms) late on average; the first measurement of this table
  was taken that way. Ours are up to 2 points higher than it (Easy unchanged), and the CPU's are slightly lower.
- **Duels:** about 4.7 / 4.8 / 5.1 a match (Easy / Normal / Hard, `bot.mjs` 60 a level at SEED 1; Tackle 1.7 / 1.7 / 1.9 of
  them), freezing 12.3 / 12.0 / 11.8s in total with the slow run-in (8.9 / 9.1 / 9.6s without it: `DUEL_SLOW='{"rate":1}'`).
  Before the Tackle trigger's retune the same run read 3.0 / 3.7 / 3.7 a match and 7.9 / 9.2 / 8.5s (5.7 / 7.0 / 7.0s
  without the slow run-in), the runs with and without it byte-identical, and identical to the build before slow motion
  (`feedback/build/s4.html`) on the same seed.
- **The slow run-in, with a modelled human (2026-10-17):** `.claude/specs/scratch/feedback/build2/orient2.mjs`, 400 duels a
  kind a cell at SEED 1, the four kinds pooled, one player. He can read nothing until an orientation time after the slide-in;
  then he registers what is shown with a lag of 0.25 ± 0.05s, aims at the window centre with the bot's 0.095s spread, needs
  0.15s more to choose in a Get Past or Key Pass, and 5% never press. Wall time is one update a frame. Win %:

  | Level | Needs to orient | Before (no slow motion) | Shipped (1.2 / 0.9 / 0.6s at 0.4x) |
  |---|---|---|---|
  | Easy | 0.2s | 84.1 | 82.9 |
  | Easy | 0.6s | 35.9 | 82.9 |
  | Easy | 0.8s | 0.3 | 83.0 |
  | Easy | mixed N(0.5, 0.15) | 52.7 | 83.2 |
  | Easy | child N(0.8, 0.15) | 9.2 | 83.4 |
  | Easy | none (the bot) | 82.9 | 82.9 |
  | Normal | 0.2s | 71.8 | 69.7 |
  | Normal | 0.6s | 26.7 | 69.7 |
  | Normal | 0.8s | 2.1 | 72.1 |
  | Normal | mixed N(0.5, 0.15) | 42.9 | 72.5 |
  | Normal | child N(0.8, 0.15) | 7.7 | 71.1 |
  | Normal | none (the bot) | 69.4 | 69.7 |
  | Hard | 0.2s | 57.2 | 55.3 |
  | Hard | 0.6s | 22.1 | 57.0 |
  | Hard | 0.8s | 3.6 | 50.2 |
  | Hard | 1.0s | 0.8 | 24.9 |
  | Hard | mixed N(0.5, 0.15) | 36.7 | 60.5 |
  | Hard | child N(0.8, 0.15) | 7.8 | 48.7 |
  | Hard | none (the bot) | 55.3 | 55.3 |

  The ring opens 0.84 / 0.89 / 0.93s real after the cut before and 1.59 / 1.49 / 1.35s shipped (Easy / Normal / Hard). The
  window is unchanged, so the bot's rate barely moves (the Normal and Hard bot rows differ by 0.3 and 0.1 because the 0.25s
  lag covers less of the scene in slow motion, so a feint registers a hair sooner); a player who orients instantly gains
  nothing and loses nothing. The first defaults (a 0.15s ramp, 0.05s lead) clipped Easy's slow phase to 0.95s because its
  ring opens earliest (0.80s scene) and left its run-in no longer than Normal's; the shipped 0.10 / 0.03 keep Easy's at
  about 1.1s on a Get Past and the full 1.2s on a Block. A player who needs a full second still loses on Hard (25%): the
  ring is 1.35s away and he needs 1.6s with his lag and his choice. Every number here is a model, not a person.
- **Burst size:**
  - x1.12 (x1.18 Perfect) put Normal at +6.8 win points, over the +6 target.
  - x1.06 (x1.10) was inside every target but barely felt.
  - The middle value sits at +4.9.
  - To try other values without editing the game: `BURST='{ ok:[1.1,2], perfect:[1.15,2.5], knock:[1.06,1.2] }' node tools/bot.mjs`.
- **AI v AI (`sim.mjs`):** re-baselined 2026-10-17 after the led pass (`SEED=1 node tools/sim.mjs`, 24 matches of 4-minute
  halves at Normal): about 1.8 tries and 14.9 points a match, 112 tackles, 170 passes, 13 intercepts, 11.5 knock-ons, 13.5
  turnovers, 4.9 offloads, 3.1 balls jolted loose, 2.8 CPU sprints. The scrum, the step levers and the CPU's Dummy draw
  nothing here (the output is byte-identical with and without them); the led pass is what moved it, since both AI sides
  lead and run onto their passes. The 2026-10-16 fairness re-baseline on the same seed read about 1 try and 9.3 points a
  match, 102 tackles, 5.3 offloads (3.1 / 2.2, both sides at the CPU's 0.10 rate), 2.8 balls jolted loose, 11.4 turnovers,
  1 CPU sprint a match between the two sides (nobody is a human to run down). The same seeds on the build before it read 1 try, 8.7 points, 92 tackles, 4.1 offloads, 2.3 jolts: team 0
  used to play the human terms (no cpuSpeed, myTackle, no intercept or turnover edge, a Normal kicker) against a team 1 on
  the CPU terms, so the demo was not a fair match. Now both sides play the CPU terms at the match's level.
- **Two player is fair (`twoplayer.mjs --sym 400`, re-run 2026-10-17 after the slow run-in):** 400 pairs of two-bot matches
  at 4-minute halves, Normal v Normal, five team pairings each played both ways round (which team is Player 1 swaps within a
  pair), the set pieces contested (`scrumBot` at 6 taps a second, `lineBot` with a 0.10s spread), every duel head to head with
  the owner on `ownerBot`'s 0.25s reaction model and the chooser's hand through the real key path on one seat and the stick on
  the other, the penalty and half-time cards pressed as a player would: Player 1 394 wins, Player 2 398, 8 draws, a 49.8% share
  with a standard error of 1.8 points, and a paired margin of +0.29 points a pair (0.2 standard errors); 33.3 v 33.2 points
  and 4.69 v 4.69 tries a match (9.38 in all); goal kicks 70% v 70%; duels owned 3.22 v 3.19 and won 73% v 76% by the owner; the
  feeding pack keeps 100% v 100% of scrums (equal packs, equal taps: the put-in's 0.08 edge holds, and the stick no longer
  counts) and the throwing side 86% v 85% of lineouts; 16.1s a match frozen in duels over 6.41 of them, 2.51s a duel against
  one player's 2.49s (9.8s over 3.9 duels; the gate is per duel within 15% and 1.8 x a match since the slow run-in, which adds
  the same real time to every duel; the old 1.6 x a match had only measured two player's 1.75 x the duels). The mirror match
  (France v France, 200 matches) gives Player 1 49.3% (se 3.5). One player as the away side wins 83.5% against the home side's
  79.8% over the same 200 seeds (4.53 v 4.21 tries), AI v AI gives team 0 49.2% of 500 matches, and an Easy player beats a
  Hard one 87.8% of the time as Player 1 and 88.0% as Player 2 (200 each); 711 of 711 asserts. The run before the slow run-in
  (the same seeds, earlier on 2026-10-17) read 391 / 402 / 7, 49.3% (se 1.8), −0.43 a pair, 33.1 v 33.4, 4.66 v 4.71, the
  mirror 52.3%, Easy over Hard 86.8% / 88.0%, 12.3s frozen: the head-to-head bots move a little because the scripted chooser's
  hand moves between frames and slow motion gives it one more frame to land in, the one-player bot not at all. With
  both gestures on both seats (`MOVE_BOT=both`, `--sym 100`): share 54.3% (se 3.5), paired margin +0.87 a pair (0.3 se), 4.84
  v 4.80 tries, 707 of 707 asserts; an Easy player beats a Hard one 90.5% as Player 1 and 89.5% as Player 2. The 2026-10-16
  run read 51.0% (se 1.8), −0.8 a pair, 3.37 v 3.48 tries (6.85), 13.4s frozen against one player's 10.0s, the mirror 52.5%,
  the away side 78.3% v 77.8%, AI v AI 48.6%, Easy over Hard 74.0% / 80.8%. The whole gate is 711 asserts in
  about 10 minutes. The suite's own run is 100 pairs at 2-minute halves
  (53.3% on seed 11, a paired margin of 0.9 standard errors) plus a 50-match mirror; it has the power to catch a seat bias of a
  few points, not a tenth off one side's tackle rate, which the direct `tackleChance` asserts catch instead.
- **The duel lock (`twoplayer.mjs --lock`, 2026-10-16):** the timer's win rate against a chooser who feints or fakes 30% of the time
  (switching up to 0.1s before the lock, a Tackle step 30%, a Block dummy 15%), the timer with a 0.25 ± 0.05s reaction, 600 duels
  a cell, beside the same timer against the CPU in one player. The shipped leads, `DUEL_LOCK = [0.40, 0.32, 0.24]`, are the
  ones that reproduce one player's rate at each level (every cell within 8 points, pinned by the sweep's asserts):

  | Timer | Duel | One player | Lead 0.15 | 0.24 | 0.32 | 0.40 |
  |---|---|---|---|---|---|---|
  | Easy | Get Past | 84.0% | 77.0 | 81.5 | 83.7 | **84.0** |
  | Easy | Key Pass | 77.0% | 72.7 | 76.0 | 77.3 | **77.3** |
  | Easy | Tackle | 85.3% | 85.3 | 85.3 | 85.3 | **85.3** |
  | Easy | Block | 78.2% | 75.2 | 75.2 | 75.2 | **75.2** |
  | Normal | Get Past | 73.7% | 67.3 | 71.2 | **74.5** | 75.0 |
  | Normal | Key Pass | 66.2% | 60.7 | 65.5 | **66.8** | 66.8 |
  | Normal | Tackle | 73.8% | 73.8 | 73.8 | **73.8** | 73.8 |
  | Normal | Block | 69.5% | 67.5 | 67.5 | **67.5** | 67.5 |
  | Hard | Get Past | 58.5% | 55.2 | **59.0** | 63.2 | 64.2 |
  | Hard | Key Pass | 56.3% | 51.5 | **55.3** | 57.5 | 57.5 |
  | Hard | Tackle | 61.0% | 61.0 | **61.0** | 61.0 | 61.0 |
  | Hard | Block | 58.2% | 55.8 | **55.8** | 55.8 | 55.8 |

  The Tackle rows barely move with the lead (under a point): the chooser's trick step now comes just before the lock, and
  a step at that point changes the timer's odds very little. The Block rows don't move at all, because a Block's lock is
  the 0.75s pump by design. So the Get Past and Key Pass leads carry the level. (Today's `duelBot`, which bites on half the tricks, is
  printed alongside with `LOCK_DUELBOT=1`.)
- **`TWO.tackle` (2026-10-16):** the two-player scoring lever, how hard a side's AI men tackle the other player's carrier, read
  at the carrier's level. Measured with the symmetry bots at 4-minute halves, Normal v Normal, 120 matches a value (the
  default symmetry run's drivers, set pieces contested): a Normal rate of 0.64 (one player's `cpuTackle`) gives 8.2 tries a
  match, 0.72 gives 7.7, 0.80 gives 7.1 and 0.88 gives 6.9, about 0.45 tries per +0.08. Shipped at the spec's provisional
  `[0.72, 0.80, 0.88]` (7.1 tries at Normal, the top of the 5–7 target): the bots score more than people will, since the timer
  bot wins about 80% of head-to-head duels against a chooser who feints 30% of the time, and pushing the AI tackle past
  one player's Hard (0.72) to reach the band would make carrying harsher for a child than one player is. Retune in Phase D
  with real people.
- **Set pieces on Normal (`setpieces.mjs`, 2026-10-17: ENG v FRA, equal packs, 300 a cell at SEED 1, taps jittered 18%,
  the thumb off the stick):**
  - Scrums: tapping 7 a second with a good hit keeps your put-in every time and steals theirs about a third of the time
    (35%); 8 a second steals about half (49%) and wins a penalty or pushover on your own ball about a quarter of the time
    (24%); 6 a second with a good hit keeps every one and steals 12%; 5 a second with a late first tap keeps 99%, 4 a
    second 82%. The CPU never wins a penalty against a pack tapping 5 a second or more. The stick plays no part.
  - Lineouts: a perfectly timed jump keeps your throw about 91% of the time and steals theirs about 27%.

## Preview and release

- **Preview:** run `python3 -m http.server 3061` in this folder and open http://localhost:3061/.
- **Release:** push `gordonlindsay/games` to `main`. Pages redeploys in about a minute.
- History: this game started as a claude.ai artifact (https://claude.ai/artifact/TYrVkqhDFLNyxYhTNPq82b), then had its
  own repo, `gordonlindsay/trylinerugby`. Both are frozen; this folder is the source.

## Engine notes

- World units are metres. x runs 0–120 between the dead-ball lines, with try lines at 10 and 110. y runs 0–70 between
  the touchlines. Your team always attacks +x, which is right on screen.
- **Duel camera:** it looks along +x of the owner's frame, so screen-right in a duel is frame +y: world +y for a team 0
  owner (Step Left is world −y, screen-up back on the pitch; `duels.mjs` pins this) and world −y for a team 1 owner
  (`twoplayer.mjs` pins the mirror).
- **Debug hook:** `window.__tryline` exposes the engine (`simulate`, `newMatch`, `update`, `input`, `inputs`, `scrum`,
  `lineout`, `forceDuel`, `pollPads`, `onKey`, `keyRoute`, `sides`, `debug`, `teams`, `contact`, `M`). `debug` also holds
  `DUEL_SLOW` and `cutRate` (the slow run-in), `hintFor`, `hintShown`, `hintOpen`, `hintsOn`, `setHints`, `syncHints`,
  `chipHtml`, `keycapsFor`, `renderHintSwitches`, `placeStick`, `platesFloor` (the hints card and the plates under it),
  `tutCards`, `tutHtml`, `tutStart`, `tutAdvance`, `tutPlay`, `tut`, `tutSeen`, `tutMark`, `tutReset`, `TUT_IDS` (the
  tutorial); the harness marks every tutorial moment seen on load, so no tool pauses, and takes `DUEL_SLOW='{"rate":1}'`
  like the other levers. Its element stubs keep `innerHTML`, answer `getBoundingClientRect` from an `el.rect` a test sets,
  and give the home's `.seg[data-key]` rows and the pause card's Hints rows their two buttons, so a test can press them.
  `__tryline.forceDuel('past')` stages and starts a duel in the console (`forceDuel('past', 1)` the mirrored one, in a
  match made with `humans:[false, true]`); `__tryline.contact` holds `CONTACT`, `RUCK`, `SPRINT` and the contact and
  Sprint functions the tests drive (`commitTackle`, `resolveContact`, `tackle`, `collide`, `sprintTick`, `cpuSprintWant`,
  `canOffload`, `switchTarget`, `switchUseful`, …); `__tryline.sides` the sides helpers; `__tryline.debug.setTwo`, `two`, `twoClaim`, `twoRelease`,
  `twoSwap`, `pads` the seats model; `__tryline.debug.startMatch(u, c, false, { two:true, levels:[0, 2] })` a
  two-player match from the console, `debug.openJoin()` the join screen, `debug.twoSel()` the join selection (`teams`,
  `levels`, `picking`), `debug.series()` the series, `debug.cueOf(t)` a side's chip word, `debug.cutCues(c)` a close-up's cues,
  `debug.navOnly()` the one seat allowed on the top layer.
- **Sides and roles:** `M.side[t]` is the side's table (`human`, `seat`, `ctrl`, `ctrlPrev`, `ctrlT`, `level`, `charging`,
  `charge`, `holdN`, `pass`, `duel`); `M.ctrl`, `M.charging` and the rest are accessors onto side 0 for the tools and the
  console. `M.role[t]` is `'human'` or `'cpu'`; `cpuSide(t)` and `diffOf(t)` (`DIFF[levelOf(t)]`) key every balance term.
  `M.di` and `M.diff` are the match's one level, kept for the tools; new engine code reads `levelOf(t)`. The seats model
  (`two.on`, `two.seats`) lives in the input layer: `openJoin` resets the seats (`resetSeats`) and switches it on so pads can
  claim, `startMatch` keeps it on for a two-player match, and `exitMatch` switches it off. `twoSel` holds the join selection,
  `series` the wins and draws, `navOnly` the one seat allowed to act on the top layer (`navSide` the one button a restricted
  seat may still press: Player 1's Change Team), `two.lost` the seats waiting to claim a pad back, `two.swapped` whether
  Player 1 is on the right half. A duel in a two-player match is set up by `duelHeadToHead` (the CPU's plan drawn as in one
  player and kept, the lock `DUEL_LOCK[levelOf(owner)]` before the plain window, plan events clamped to it) and read by
  `duelOther` every step from the cut-in through `inp.sideX()` (fresh keys, an unlatched stick); `c.lock`, `c.locked`,
  `c.taken`, `c.changes`, `c.stepped`, `c.tkAt`, `c.lean`, `c.dummyPress` and `c.reachT` exist only there, so one player's
  duels are the objects they always were. The other two-player-only constants are `TWO.tackle`, `SCRUM_LEVEL` and
  `LINE_LEVEL`; `M.side[t].duel` carries each owner's quota, last kind, failures and first-duel flag, `M.side[t].kickFirst`
  his first kick; one player's first-time aids key off `settings.tut`, the tutorial's per-device memory. `globalThis.__sfxSpy` and `debug.navLog` are hooks for the tools, like `__ctxSpy`. The byte-identity
  proof (the spec's golden set run against the 3f11088 archive, `golden.sh` / `check.sh`) lives in the repo's `.claude/specs/
  scratch/golden/`, not in `tools/`, because its outputs are 2 MB of fixed runs.
- **Hints and the tutorial** live in the UI block after `updateHud`: `hintFor(seat)` is pure (the match in, the words out
  or null), `syncHints` runs from `updateHud` and `renderHint` writes the DOM only when the content key changes; the open-play
  state is `HO[seat]` (what has shown this match, the card up, its end, the last start on `M.dclock`); `hintShown[seat]` is
  what the card shows now, read by `drawCut` to skip the canvas tag under a titled card and by the tools. The tutorial is
  `M.tut` (`{ id, seat, step, cut }`), set in `startCut` by `tutStart`; `updateCut` holds the close-up's first frame while
  it is up (the slide-in's last step taken, presses advancing the card, the stick re-centred) and `tutPlay` lets it run
  (a drop's `g.started` reset so the thumb's state is read afresh). The slow run-in is `cutRate(c)` in `updateCut`: whole
  frames only, `c.acc` the fraction held back for the drawing, `c.slowFrom` where Resume restarted it.
- **Contact and Sprint** live in the tackling block and the Sprint block of `index.html`, with the drawing in
  `drawPlayer` and `drawTags`. A player carries `bind` (the contact he is in), `offside` (retiring), `sprint` and
  `sprinting`, `stumble`, `wf` (wrong-footed), and render-only `drawFrom` (a teleport being smoothed) and `fend`.
  `M.contact` is the bind under way, `M.spr[t]` the Sprint meter a side, `M.tags` and `M.fx` the tags and impact
  rings. `moveAll`'s hold keys (`HOLD_KEYS`, for the drop-goal offer's projection) include the new timers.
- **Teams:** `newMatch` takes a team object, or an index into `NATIONS` (the tools use indexes).
  - **`NATIONS` must keep its order.** Championships saved before clubs existed hold indexes into it, and `restore()`
    turns them into a team list in that order. `restore()` also forces duels on, keeps only settings it understands,
    and drops a championship whose teams, fixtures, results or round don't hold together. `load()` swallows a missing
    key and bad JSON. The key is `tryline.v1`.
  - `CLUBS` is append-only.
  - A clash of shirts is settled by `awayKit()`. It tries, in order: the change kit, the colours swapped, then white,
    then black.
- **Goal kicks** run in the kick frame: every kick is computed as if the kicker attacks +x at posts on x = 110, with
  the uprights at y = 32.2 and 37.8; team 1 is mirrored in (`toFrame`), so the CPU shares the code path and left and
  right in a verdict are always the kicker's. The flight is closed form (`posAt`), so it has no integrator and no
  frame-rate dependence, and the result is fixed at the release: a live kick, a skipped CPU kick and the instant
  headless path all give the same crossing. `M.wind` is drawn in `newMatch` and turned at half time; each kick's wind
  is drawn once in `makeGoal`. The close-up's rig is `kickCam`: a still camera `8 + 0.2·D` metres behind the mark at
  2.2m, with the lens solved so the mark sits at 0.80H and the upright tops just under the scoreboard. The drawn ball
  comes from `ballAt` (the trail samples it too): the closed form, then for 0.5s a cosmetic rebound in the kick's own
  axes, so the woodwork reads on screen the way the verdict does. A scoring contact carries on behind the posts (a
  post nudges it in, the bar pops it over); a miss comes back into play, and a post miss away from its upright. The
  flight camera is `kickView`: the zoom starts at the ball's screen apex but at least 0.4s before the crossing, and
  is held continuously to the largest Z that keeps the ball in frame. The verdict banner (`say(…, low)`) sits under
  the crossbar while the ball is up at the posts (`verdictLow`) and up top when it has dropped short.
- **Receivers:** the same rule on the attack (2026-10-17): a receiver who seeks the landing spot arrive-style catches
  standing still. `runOnTarget` pursues at min(top speed × pace, distance / time left) and the pass is led to where he
  will be (`leadPass`), so he takes it at pace.
- **Chasers:** defenders who are chasing must pursue at full speed (`pursue: true`). With arrive-style steering they
  slow as they close and can never catch a runner. That bug once made a scripted player score 15+ tries a match.
- **Line break:** `COVER` (by level: how many last men, their speed and acceleration, the inside shade, a small
  goal-side bias) and `commitPoint`. A break is at most `COVER.last` defenders still goal-side of the carrier
  (1 on Easy, 2 on Normal and Hard). Those men pursue an intercept on his inside shoulder and, once they are close
  or level, the man himself, so the path crosses the 1.5m tackle. A man who has drawn level, within 4m behind,
  stays on that commit: flipping him onto the chase lead runs him past the tackle. `assignMarks` posts no 18m
  sweeper during a break. Men behind still chase with `pursue`. A formed line keeps one sweeper 18m deeper at
  0.85 speed, not pursuing. Easy's single last man and lower speed leave the break beatable. Chase-sprint counts
  per match move with how often a break stays clean; the sprint rates themselves are unchanged.
- **Balance levers:** bursts are the lever for duel balance. Shrinking duel windows barely moves results, because a
  mistime falls back to the open game. If windows are ever narrowed, update `INSTANT` to match.
