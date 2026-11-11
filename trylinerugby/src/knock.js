/* ---------- knock-ons (2026-11-11) ----------
   The owner: "Reduce the knock ons a bit. Happening too randomly." He chose Cut the Unexplained: about a third fewer, the drops
   with no visible cause cut, the earned ones kept. Measured before (bot v CPU as played, Normal, 2-minute halves), 7.2 a match.
   Everywhere, AI v AI and the demo included, so the game reads the same to watch as to play:
   - base: the flat term every catch carries, 0.015 + (5 - handling)*0.01 (catchBall), times this. Alone it is the clean catch
     dropped with nobody within 1.8m, the drop with no cause anyone can see. The terms that are earned sit on top of it unchanged:
     a marked catch's 0.04, a long pass's LONG.knock, a kick's 0.05. The halved base is under those catches too, so they drop
     about a fifth less often (README.md: the earned terms kept, their counts down about a quarter).
   - intercept: the interception's term, 0.2 before. Your man under the ring, or an AI teammate, takes a CPU pass he runs into
     with no button pressed (pI, src/ball.js), and then dropped it about a quarter of the time.
   - hit: ARCADE.hit.jolt (a Big Hit spilling the ball 12 points more often) only when the tackler's side is a person's, as
     README.md and its comment always said; it had been added to the CPU's Big Hit on you too. Two Player keeps it for both; AI
     v AI has no arcade.
   - tag: Knock-On over the man who dropped it, as Loose Ball is (tag, src/contact.js). Drawing only.
   Every lever reads knockLv and none draws a random number: catchBall still draws one whatever its chance, the jolt one whatever
   its size. KNOCK.on false gives 20cbcaf's values, so the game plays exactly as 20cbcaf, draw for draw (KNOCK='{"on":false}' in
   the harness, the proof behind every re-pin since). Measured: README.md, Catching. */
const KNOCK = { on:true, base:0.5, intercept:0.07, hit:true, tag:true };
// KNOCK_TUNE
const KNOCK_OFF = { base:1, intercept:0.2, hit:false, tag:false };   // 20cbcaf's
const knockLv = k => (KNOCK.on ? KNOCK : KNOCK_OFF)[k];
