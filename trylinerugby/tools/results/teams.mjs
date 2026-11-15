// Developer tooling, never part of the game: the game's own sides the results job gathers, read from the source without booting the game.
// Clubs: the Premiership (ENGLAND), the Championship (ENGLAND_TWO) and every club in docs/clubs-local.json (National League 1 to Counties 1,
// the game's own Local clubs among them by their existingId). Nations: natList's men's twelve (NAT_MEN) and women's twelve (NAT_WOMEN).
// tools/results.mjs checks this reading against the booted game's ALL_TEAMS and natList.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const GAME_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = p => fs.readFileSync(GAME_ROOT + p, 'utf8');

function listOf(src, name) {
  const m = src.match(new RegExp(`^const ${name} = \\[([\\s\\S]*?)^\\];`, 'm'));
  if (!m) throw new Error(`src/data.js has no ${name} list`);
  return [...m[1].matchAll(/\{ id:'([A-Z]{3})', name:'([^']+)'/g)].map(x => ({ id:x[1], name:x[2] }));
}
export function gameTeams() {
  const src = read('src/data.js');
  const premiership = listOf(src, 'ENGLAND'), championship = listOf(src, 'ENGLAND_TWO');
  const local = JSON.parse(read('docs/clubs-local.json')).counties.flatMap(c => c.clubs.map(x => ({ id:x.id, name:x.name, fullName:x.fullName, league:x.league, level:x.level, county:x.county, place:x.place, w:x.w, d:x.d, l:x.l })));
  const men = JSON.parse(src.match(/^const NAT_MEN = (\[[^\]]*\]);/m)[1].replace(/'/g, '"'));
  const women = [...src.match(/^const NAT_WOMEN = \{([\s\S]*?)^\};/m)[1].matchAll(/\b([A-Z]{3}):\[/g)].map(x => x[1]);
  const nationNames = Object.fromEntries(listOf(src, 'NATIONS').map(t => [t.id, t.name]));
  const clubs = [
    ...premiership.map(t => ({ ...t, league:'Premiership', level:1 })),
    ...championship.map(t => ({ ...t, league:'Championship', level:2 })),
    ...local,
  ];
  return { clubs, men, women, nationNames, ids:{ clubs:new Set(clubs.map(t => t.id)), men:new Set(men), women:new Set(women) } };
}
