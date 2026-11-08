/* =========================================================
   Championship
   ========================================================= */
function roundRobin(teams) {
  const ids = teams.slice(), n = ids.length, rounds = [];
  for (let r = 0; r < n-1; r++) {
    const pairs = [];
    for (let i = 0; i < n/2; i++) { const a = ids[i], b = ids[n-1-i]; pairs.push(r % 2 ? [b,a] : [a,b]); }
    rounds.push(pairs);
    ids.splice(1, 0, ids.pop());
  }
  return rounds;
}
function poisson(l) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= rnd(); } while (p > L); return k-1; }
function simMatch(c, h, a) {                              // pace, power, handling and kicking only: Stamina is left out on purpose, so simulated fixtures read as they always have
  const H = c.teams[h], A = c.teams[a];
  const atk = n => (n.pace + n.handling)/2, def = n => (n.power + n.handling)/2;
  const ht = poisson(clamp(2.5 + (atk(H)-def(A))*0.6 + 0.25, 0.5, 5));
  const at = poisson(clamp(2.5 + (atk(A)-def(H))*0.6, 0.5, 5));
  const pts = (n, t) => { let s = t*5; for (let i = 0; i < t; i++) if (rnd() < 0.5 + n.kicking*0.06) s += 2; return s + poisson(1.2 + n.kicking*0.2)*3; };
  return { h, a, hs:pts(H, ht), as:pts(A, at), ht, at };
}
/* Six teams: yours and five others. The championship keeps its own copy, so editing a team later can't change one under way.
   The five are whoever was passed in (a random draw, at the team screen). You play the weakest of them first and the
   strongest last: circle position 0 stays put and meets position 5, then the new position 5, each round. */
function newChamp(user, others) {
  if (practice) return;
  retainCompletedSeason(champ);
  const five = others.slice(0, 5);
  const ranked = five.map((t, i) => ({ i:i + 1, r:rateOf(t) })).sort((a, b) => a.r - b.r || a.i - b.i);
  const order = [0, ranked[4].i, ranked[3].i, ranked[2].i, ranked[1].i, ranked[0].i];
  champ = { id:'season-' + Date.now().toString(36) + '-' + (++seasonSerial).toString(36), user:0, teams:[user, ...five].map(t => ({ ...t })), round:0, fixtures:roundRobin(order), results:[] };
  save();
}
function userFixture(c) {
  const pair = c.fixtures[c.round].find(p => p[0] === c.user || p[1] === c.user);
  return { pair, opp: pair[0] === c.user ? pair[1] : pair[0] };
}
function standings(c) {
  const rows = c.teams.map((n,i) => ({ i, P:0, W:0, D:0, L:0, PF:0, PA:0, TF:0, BP:0, Pts:0, gs:false }));
  for (const rd of c.results) for (const r of rd) {
    const H = rows[r.h], A = rows[r.a];
    H.P++; A.P++; H.PF += r.hs; H.PA += r.as; A.PF += r.as; A.PA += r.hs; H.TF += r.ht; A.TF += r.at;
    if (r.hs > r.as) { H.W++; A.L++; H.Pts += 4; if (r.hs-r.as <= 7) A.BP++; }
    else if (r.hs < r.as) { A.W++; H.L++; A.Pts += 4; if (r.as-r.hs <= 7) H.BP++; }
    else { H.D++; A.D++; H.Pts += 2; A.Pts += 2; }
    if (r.ht >= 4) H.BP++;
    if (r.at >= 4) A.BP++;
  }
  for (const r of rows) { r.Pts += r.BP; if (r.P === 5 && r.W === 5) { r.Pts += 3; r.gs = true; } r.PD = r.PF - r.PA; }
  rows.sort((a,b) => b.Pts-a.Pts || b.PD-a.PD || b.TF-a.TF);
  return rows;
}
function honours(c, rows) {
  const out = [['Champions', rows[0].i, true]];
  const gs = rows.find(r => r.gs); if (gs) out.push(['Grand Slam', gs.i, true]);
  const all = c.results.flat();
  const beat = (x, y) => all.some(r => (r.h === x && r.a === y && r.hs > r.as) || (r.a === x && r.h === y && r.as > r.hs));
  const home = c.teams.map((t, i) => t.home ? i : -1).filter(i => i >= 0);   // the Triple Crown needs all four home nations
  if (home.length === 4) for (const h of home) if (home.every(o => o === h || beat(h, o))) out.push(['Triple Crown', h, false]);
  out.push(['Wooden Spoon', rows[rows.length-1].i, false]);
  return out;
}
function matchPoints(us, them, ourTries) {
  let p = 0; const why = [];
  if (us > them) { p += 4; why.push('Win'); } else if (us === them) { p += 2; why.push('Draw'); } else if (them-us <= 7) { p += 1; why.push('Losing Bonus'); }
  if (ourTries >= 4) { p += 1; why.push('Try Bonus'); }
  return { p, why };
}
/* The chase is the table talking. The points are the ones standings() already awards: 4 a win, 2 a draw,
   a try bonus at 4, a losing bonus within 7, and 3 for a grand slam once all five are won. A side's best
   return from here is a win and a try bonus from every game left (5), plus the slam if it is still unbeaten.
   Nothing here is a new rule, and a match in progress is still not stored. */
const CHASE_WIN = 5, CHASE_DRAW = 3, CHASE_GS = 3;
function ordinal(n) { return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'); }
function ptsWord(n) { return n === 1 ? 'point' : 'points'; }
function maxPoints(row, left) {
  if (left <= 0) return row.Pts;
  return row.Pts + left * CHASE_WIN + (row.W === row.P ? CHASE_GS : 0);
}
/* What another side can still reach once the user's next result is decided. share is the points that
   result gives the side the user plays (a close win still leaves them the losing bonus), or null for
   everyone else, who can still take their best. A win for the user is not a win for them, so the slam
   dies on it. Claiming the title only when this still leaves you clear never pretends two other sides
   can both win the game they play against each other. */
function otherCeiling(row, left, share) {
  if (left <= 0) return row.Pts;
  if (share == null) return maxPoints(row, left);
  return row.Pts + share + (left - 1) * CHASE_WIN + (share >= 4 && row.W === row.P ? CHASE_GS : 0);
}
function userOpponent(c) {
  if (!c || c.round >= 5) return -1;
  return userFixture(c).opp;
}
function clearsAll(c, rows, gain, oppShare) {
  const left = 5 - c.round, me = rows.find(r => r.i === c.user), opp = userOpponent(c);
  const gs = gain >= 4 && left === 1 && me.W === me.P ? CHASE_GS : 0;
  const mine = me.Pts + gain + gs;
  return rows.every(r => r.i === c.user || mine > otherCeiling(r, left, r.i === opp ? oppShare : null));
}
function chaseFacts(c, rows) {
  const left = 5 - c.round;
  const place = rows.findIndex(r => r.i === c.user);
  const me = rows[place];
  const others = rows.filter(r => r.i !== c.user);
  const neighbour = place === 0 ? rows[1] : rows[0];   // the gap is to second when you lead, and to the leader when you don't
  const gap = neighbour ? (place === 0 ? me.Pts - neighbour.Pts : neighbour.Pts - me.Pts) : 0;
  const clinched = left > 0 && me.Pts > Math.max(...others.map(r => maxPoints(r, left)));
  const alive = maxPoints(me, left) >= Math.max(...others.map(r => r.Pts));
  return { left, place, me, neighbour, gap, clinched, alive, bar: Math.max(...others.map(r => r.Pts)) };
}
function positionPhrase(c, f) {
  const ord = ordinal(f.place + 1);
  if (!f.neighbour) return ord;
  if (f.gap === 0) return ord + ', level on points with ' + c.teams[f.neighbour.i].name;
  return f.place === 0
    ? ord + ', ' + f.gap + ' ' + ptsWord(f.gap) + ' clear'
    : ord + ', ' + f.gap + ' ' + ptsWord(f.gap) + ' behind';
}
function splitBy(ahead, behind) {
  if (ahead.Pts !== behind.Pts) return null;
  if (ahead.PD !== behind.PD) return 'points difference';
  if (ahead.TF !== behind.TF) return 'tries';
  return null;
}
function chaseTitle(c, rows) {
  if (c.round < 5) return 'Round ' + (c.round + 1) + ' of 5';
  const mine = new Set(honours(c, rows).filter(h => h[1] === c.user).map(h => h[0]));
  if (mine.has('Grand Slam')) return 'Grand Slam';
  if (mine.has('Champions')) return 'Champions';
  if (mine.has('Triple Crown')) return 'Triple Crown';
  if (mine.has('Wooden Spoon')) return 'Wooden Spoon';
  return ['Runners-Up', '3rd', '4th', '5th'][rows.findIndex(r => r.i === c.user) - 1] || 'Final Table';
}
function finishLine(c, rows) {
  const name = c.teams[c.user].name;
  const mine = new Set(honours(c, rows).filter(h => h[1] === c.user).map(h => h[0]));
  const place = rows.findIndex(r => r.i === c.user);
  const me = rows[place];
  if (mine.has('Grand Slam')) return name + ' win the Grand Slam' + (mine.has('Triple Crown') ? ' and the Triple Crown' : '');
  if (mine.has('Champions')) {
    let line = name + ' win the championship' + (mine.has('Triple Crown') ? ' and the Triple Crown' : '');
    const next = rows[1];
    if (next && next.Pts === me.Pts) { const how = splitBy(me, next); if (how) line += ', ahead on ' + how; }
    return line;
  }
  if (mine.has('Triple Crown')) return name + ' take the Triple Crown, and finish ' + ordinal(place + 1);
  if (mine.has('Wooden Spoon')) return name + ' take the Wooden Spoon';
  const champRow = rows[0], gap = champRow.Pts - me.Pts;
  if (gap === 0) {
    const how = splitBy(champRow, me);
    return name + ' finish ' + ordinal(place + 1) + ', level with ' + c.teams[champRow.i].name + (how ? ', behind on ' + how : '');
  }
  return name + ' finish ' + ordinal(place + 1) + ', ' + gap + ' ' + ptsWord(gap) + ' short of ' + c.teams[champRow.i].name;
}
function fixtureStake(c, rows) {
  if (!c || c.round >= 5) return '';
  const f = chaseFacts(c, rows);
  if (f.left === 1 && f.me.W === 4 && f.me.W === f.me.P) return 'For the Grand Slam';
  if (f.clinched) return '';
  if (clearsAll(c, rows, 2, 3)) return 'A draw is enough';
  if (clearsAll(c, rows, 4, 1)) return 'A win takes the title';
  if (clearsAll(c, rows, 5, 1)) return 'A try-bonus win takes the title';
  const withWin = f.me.Pts + CHASE_WIN + (f.left - 1) * CHASE_WIN + (f.me.W === f.me.P ? CHASE_GS : 0);
  if (f.me.Pts + CHASE_DRAW + (f.left - 1) * CHASE_WIN < f.bar && withWin >= f.bar) return 'Must win to stay in it';
  return '';
}
function chaseLine(c, rows) {
  if (c.round >= 5) return finishLine(c, rows);
  if (c.round === 0) return 'Five rounds. Top the table.';
  const f = chaseFacts(c, rows);
  if (f.clinched) return 'Champions, with ' + (f.left === 1 ? 'a round' : f.left + ' rounds') + ' to play';
  const pos = positionPhrase(c, f);
  if (!f.alive) return pos + ', and out of the title';
  if (f.place === 0 || fixtureStake(c, rows)) return pos;
  return pos + '. Still in it';
}
function champNote(c) {
  const name = c.teams[c.user].name;
  if (c.round >= 5) return name + ' · ' + chaseTitle(c, standings(c));
  if (c.round === 0) return name + ' · Round 1 of 5';
  const rows = standings(c), f = chaseFacts(c, rows);
  return name + ' · ' + (f.clinched ? 'Champions' : ordinal(f.place + 1)) + ' · Round ' + (c.round + 1) + ' of 5';
}
function recordChampResult() {
  if (!champ || champ.round >= 5 || !M || !M.champ || M.demo || M.two || practice || M.champResultDone) return;
  const c = champ, { pair } = userFixture(c);
  const userHome = pair[0] === c.user;
  const mine = userHome
    ? { h:pair[0], a:pair[1], hs:M.score[0], as:M.score[1], ht:M.tries[0], at:M.tries[1] }
    : { h:pair[0], a:pair[1], hs:M.score[1], as:M.score[0], ht:M.tries[1], at:M.tries[0] };
  const S = M.stats, detail = {};
  if (S && !M.headless) {
    for (const key of ['conv', 'pen', 'dg', 'tk', 'duelN']) {
      const made = key === 'duelN' ? 'won' : 'made';
      detail[key] = { att:S[key]?.att?.[0], [made]:S[key]?.[made]?.[0] };
    }
    detail.gain = S.gain?.[0];
    const valid = cleanSeasonStats(detail);
    if (valid) mine.stats = valid;
  }
  const rd = [mine];
  for (const p of c.fixtures[c.round]) if (p !== pair) rd.push(simMatch(c, p[0], p[1]));
  M.champResultDone = true;
  c.results.push(rd);
  c.round++;
  save();
}


/* Scores cover every round; detailed totals cover only matches with a saved full-time card. */
function seasonSummary(c = champ) {
  const out = { played:0, won:0, drawn:0, lost:0, pointsFor:0, pointsAgainst:0, triesFor:0, triesAgainst:0, detailedMatches:0, legacyMatches:0,
    stats:{ conv:{att:0,made:0}, pen:{att:0,made:0}, dg:{att:0,made:0}, tk:{att:0,made:0}, duelN:{att:0,won:0}, gain:0 } };
  if (!c) return out;
  for (const rd of c.results) for (const r of rd) {
    if (r.h !== c.user && r.a !== c.user) continue;
    const home = r.h === c.user, us = home ? r.hs : r.as, them = home ? r.as : r.hs;
    out.played++; out[us > them ? 'won' : us < them ? 'lost' : 'drawn']++;
    out.pointsFor += us; out.pointsAgainst += them;
    out.triesFor += home ? r.ht : r.at; out.triesAgainst += home ? r.at : r.ht;
    const detail = cleanSeasonStats(r.stats);
    if (!detail) { out.legacyMatches++; continue; }
    out.detailedMatches++;
    for (const key of ['conv', 'pen', 'dg', 'tk', 'duelN']) for (const field in out.stats[key]) out.stats[key][field] += detail[key][field];
    out.stats.gain += detail.gain;
  }
  return out;
}
function retainCompletedSeason(c) {
  if (practice || !c || c.round !== 5) return false;
  const valid = cleanChamp(c);
  if (!valid || champHistory.some(old => old.id === valid.id)) return false;
  c.id = valid.id;
  champHistory.push(valid);
  champHistory = champHistory.slice(-SEASON_LIMIT);
  return true;
}
function archiveChampionship(c = champ) {
  const added = retainCompletedSeason(c);
  if (added) save();
  return added;
}
/* Counts describe only the retained completed seasons, rather than an all-time record. */
function savedHonours() {
  const out = { seasons:champHistory.length, champions:0, grandSlams:0, tripleCrowns:0, woodenSpoons:0 };
  const keys = { Champions:'champions', 'Grand Slam':'grandSlams', 'Triple Crown':'tripleCrowns', 'Wooden Spoon':'woodenSpoons' };
  for (const c of champHistory) for (const h of honours(c, standings(c))) if (h[1] === c.user) out[keys[h[0]]]++;
  return out;
}
