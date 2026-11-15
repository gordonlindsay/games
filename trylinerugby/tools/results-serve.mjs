// The browser suites serve the game's folder, and that folder now holds the week's real results.json: it changes every Monday and its Form
// windows follow the real clock. A suite pinned on the game as it plays must not move with the week, so it is answered 404 for results.json:
// the game with no file, exactly as before (tools/results-game.mjs shows that is the same as RESULTS off, draw for draw and screen for screen).
// RESULTS_FILE=<path> serves that file instead, to run a suite against a week's data: RESULTS_FILE=results.json node tools/home.mjs.
// tools/results-game.mjs serves its own fixture and checks the feature at every size.
import fs from 'node:fs';
import path from 'node:path';
export const RESULTS_FILE = process.env.RESULTS_FILE ? path.resolve(process.env.RESULTS_FILE) : '';
/* True when the request was for results.json and has been answered. */
export function resultsServe(url, res) {
  if (!/\/results\.json$/.test(decodeURIComponent(new URL(url, 'http://x').pathname))) return false;
  if (!RESULTS_FILE || !fs.existsSync(RESULTS_FILE)) { res.writeHead(404); res.end(); return true; }
  res.writeHead(200, { 'content-type':'application/json' }); fs.createReadStream(RESULTS_FILE).pipe(res);
  return true;
}
