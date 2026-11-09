/* =========================================================
   Loop and boot
   ========================================================= */
let last = performance.now(), acc = 0, gapOwed = 0, demoOwed = 0, pauseKey = '', pauseDraws = 0;
const DEMO_FRAME = 1/31;                                    // the demo behind the menus draws at about 30 a second: it is dim, and a phone on a menu has no need to run flat out
const PAUSE_DRAWS = 20;                                     // a change under the pause card: enough frames for the men's pictures to tint (ART_BAKES a frame)
document.addEventListener('visibilitychange', () => { pauseKey = ''; });   // a phone may drop a hidden page's canvas: draw it again when it comes back
/* A step is always 1/60 of a simulated second, so below pace 1 a 60Hz screen gets a frame with no step about one time in eight (at 0.75, one in four) and the world would hitch.
   The picture blends the last step instead, a step behind the sim. Drawing only: every position goes back before anything else reads it, so the sim never sees this. A close-up draws from its clocks, so those blend the same way: what is judged reads them after they have gone back. */
const PACE_KEEP = { M:null, was:[], now:[], cut:null, cutWas:[], cutNow:[] }, PACE_JUMP = 1.5;   // PACE_JUMP: metres in one step that can only be a teleport (a restart, a set piece): that man is drawn where he is
const PACE_CUT = ['t', 'acc', 'exit', 'pos'], PACE_KICK = ['st', 'm', 'aim'], PACE_LEAP = 0.2;   // what a close-up's picture moves with: the scene clock and its slow-motion fraction, the slide out, the scrum's shove; a kick's run-up, meter and aim. PACE_LEAP: a change in one step that can only be a new stage: drawn as it is
function paceKeep() {                                       // the world before the step about to run
  if (matchPace() === 1) { PACE_KEEP.M = null; return; }
  const K = PACE_KEEP, w = K.was, b = M.ball, c = M.cut; let i = 0;
  for (const p of M.players) { w[i++] = p.x; w[i++] = p.y; }
  w[i++] = b.x; w[i++] = b.y; w[i] = b.z;
  K.M = M; K.cut = c;
  if (c) { i = 0; for (const k of PACE_CUT) K.cutWas[i++] = c[k]; if (c.g) for (const k of PACE_KICK) K.cutWas[i++] = c.g[k]; }
}
function renderCutPaced(dt) {
  const K = PACE_KEEP, c = M.cut, g = c.g, u = clamp(acc/STEP, 0, 1), was = K.cutWas, now = K.cutNow;
  let i = 0;
  const blend = (o, keys) => { for (const k of keys) { const a = was[i], v = o[k]; now[i++] = v; if (typeof a === 'number' && typeof v === 'number' && Math.abs(v - a) < PACE_LEAP) o[k] = a + (v - a)*u; } };
  const back = (o, keys) => { for (const k of keys) { const v = now[i++]; if (typeof v === 'number') o[k] = v; } };
  blend(c, PACE_CUT); if (g) blend(g, PACE_KICK);
  try { render(dt); }
  finally { i = 0; back(c, PACE_CUT); if (g) back(g, PACE_KICK); }
}
function renderPaced(dt) {
  const K = PACE_KEEP;
  if (K.M !== M || M.stop > 0 || M.paused || M.phase === 'break' || M.phase === 'menu') { render(dt); return; }
  if (M.cut) { if (K.cut === M.cut) renderCutPaced(dt); else render(dt); return; }   // the frame a close-up opens has nothing to blend from
  const u = clamp(acc/STEP, 0, 1), w = K.was, n = K.now, P = M.players, b = M.ball;
  let i = 0;
  for (const p of P) {
    n[i] = p.x; n[i + 1] = p.y;
    if (hyp(p.x - w[i], p.y - w[i + 1]) < PACE_JUMP) { p.x = w[i] + (p.x - w[i])*u; p.y = w[i + 1] + (p.y - w[i + 1])*u; }
    i += 2;
  }
  const bx = b.x, by = b.y, bz = b.z;
  if (hyp(bx - w[i], by - w[i + 1]) < PACE_JUMP) { b.x = w[i] + (bx - w[i])*u; b.y = w[i + 1] + (by - w[i + 1])*u; b.z = w[i + 2] + (bz - w[i + 2])*u; }
  try { render(dt); }
  finally {
    i = 0;
    for (const p of P) { p.x = n[i]; p.y = n[i + 1]; i += 2; }
    b.x = bx; b.y = by; b.z = bz;
  }
}
function frameDraw(dt, sized) {
  if (M && M.demo) {
    demoOwed += dt;
    if (demoOwed < DEMO_FRAME && !sized) return;             // a resize has just blanked the canvas, so that frame always draws
    const d = demoOwed; demoOwed = 0;
    renderPaced(d*matchPace());                              // its strides and fading tags at the pace of its play; DEMO_FRAME above stays real time
    return;
  }
  demoOwed = 0;
  if (M && M.paused && !$('m-pause').hidden) {               // behind the pause card nothing moves: the picture stands until the camera, the size or the art changes it
    const key = V.W + 'x' + V.H + 'x' + V.dpr + 'x' + settings.cam + ART.state;
    if (sized || key !== pauseKey) { pauseKey = key; pauseDraws = PAUSE_DRAWS; }
    if (pauseDraws <= 0) return;
    pauseDraws--;
  } else pauseKey = '';
  renderPaced(dt*(practice ? drillRate() : matchPace()));    // the strides, the camera and the fading tags keep the pace of the play
}
const matchBedWanted = () => !!(playing() && !M.headless && !practice && !M.paused && !M.over && !M.tut && M.phase !== 'break' && M.phase !== 'menu');   // the crowd under a match you are playing: not the demo, a drill, the pause card, a tutorial card, half time or full time
function frame(now) {
  const dt = Math.min(0.05, (now-last)/1000); last = now;
  soundFrame(matchBedWanted());
  pollPads();
  let sized = false;
  if (window.innerWidth !== V.W || window.innerHeight !== V.H || Math.min(dprMax(), window.devicePixelRatio || 1) !== V.dpr) { resize(); sized = true; if (input.stickId === null) restStick(); }
  if (M && M.demo && uprightPhone.matches) { acc = 0; updateHud(); requestAnimationFrame(frame); return; }   // under Turn Your Phone Sideways nobody can see the demo: it waits
  if (M && !M.paused && M.phase !== 'break' && M.phase !== 'menu') {
    if (M.stop > 0) { M.stop -= dt; acc = 0; }               // your Big Hit's hit-stop: the world holds for a few frames, in real time
    else {
      const pace = matchPace();
      acc += dt*pace; gapOwed += dt; let n = 0;              // the one place the pace meets the sim: STEP and update() don't change
      while (acc >= STEP && n < 5) { paceKeep(); if (pace < 1) { stepGap = gapOwed; gapOwed = 0; } update(STEP); acc -= STEP; n++; }   // stepGap: how long the thumb has really had since the last step, for the Side Step's window
      stepGap = STEP; if (pace === 1) gapOwed = 0;
      if (n >= 5) acc = 0;
    }
  }
  frameDraw(dt, sized);
  updateHud();
  requestAnimationFrame(frame);
}

/* Headless AI-vs-AI runs, used to balance the engine. */
function simulate(n, half, diff) {
  const keep = M, out = [];
  for (let i = 0; i < n; i++) {
    const a = i % 6, b = (i + 1 + (i % 5)) % 6 === a ? (a + 1) % 6 : (i + 1 + (i % 5)) % 6;
    newMatch(a, b, { halfLen:half || 240, diff:diff == null ? 1 : diff, auto:true, headless:true });
    let steps = 0;
    while (!M.over && steps < 400000) { update(STEP); steps++; }
    out.push({ teams:[NATIONS[a].id, NATIONS[b].id], score:M.score.slice(), tries:M.tries.slice(), stats:M.stats, steps });
  }
  M = keep;
  return out;
}
window.__tryline = { practice:{ start:practiceStart, choose:practiceChoose, leave:practiceLeave, state:() => practice, finish:practiceFinish }, simulate, newMatch, update, input, inputs, STEP, scrum, lineout, forceDuel, pollPads, onKey, keyRoute, navMove, navPress, navBack,
  sides:{ side:sideOf, isHuman, inputOf, ctrlOf, setCtrl, isCtrl:ringed, levelOf, seatOfTeam, anyCharging, ourBall, userActive, humanSlots },
  debug:{ pr, stage:stageDuel, startDuel, duelGate, applyDuel, settings:() => settings, endSprint, collide, view:(W, H) => { V.W = W; V.H = H; V.dpr = 1; }, drawCut, goalKick, openPenalty:(x, y, dP) => openPenalty(0, x, y, dP), openPenaltyFor:openPenalty, penalty, resume, interactive, setRM:v => { RM = !!v; },
    duelCam, duelPose, camAt, startMatch, exitMatch, pickOwner,
    render, updateHud, setMode:v => { mode = v; }, keyDown:e => onKey(e, true), keyUp:e => onKey(e, false), frameStep:dt => { if (M.stop > 0) { M.stop -= dt; return 0; } update(STEP); return 1; },
    setTwo, two:() => two, seatScheme, twoClaim, twoRelease, twoSwap, resetSeats, pads:() => PADS, padsOn:() => padsOn, padConnected, padGone, releaseAll, setDev, lastDev:() => lastDev, focus:() => focusEl, pause, paused:() => !!(M && M.paused),
    openJoin, renderJoin, seatDev, legendHtml, seatKey, swapPlayers, useKeyboard, navLog, navLayer, twoSel:() => twoSel, series:() => series, startTwo, openTeams, renderTeams, renderHub, pickTeam, pickMode:() => pickMode, showBreak, breakKind:() => breakKind, navOnly:() => navOnly, navOwner, cueOf, cutCues, DUEL_LOCK, TWO, SCRUM_LEVEL, LINE_LEVEL, SCRUM_DOM, goHome, exitMatch, setDesk, isDesk,
    DUEL_SLOW, TDUEL, cutRate, CUT_IN, hintFor, hintShown:() => hintShown, hintOpen:() => HO, hintsOn, setHints, syncHints, hintDev, chipHtml, keycapsFor, renderHintSwitches, tutCards, tutHtml, tutStart, tutAdvance, tutPlay, tut:() => (M ? M.tut : null), tutSeen, tutMark, tutReset, tutMoment, tutSeatOf, TUT_IDS, OPEN_HINTS, placeStick, platesFloor, safeInsets, stickRest, tagBox, nearestAct, releaseTouch, phoneUpright, coachTick, coachClear, coachLast:() => coachLast, COACH_IDS, COACH_LINE },
  contact:{ matchMild, CONTACT, RUCK, SPRINT, commitTackle, resolveContact, contactStep, releaseBind, joinTackle, tackle, resolveRuck, tackleChecks, userTackle, canDive, canOffload, offload, looseInContact, collide, moveAll, wrongFoot, tackleChance,
    maxSpeed, sprintLevel, sprintable, sprintPress, sprintPick, sprintOn, sprintTick, bestChaser, cpuSprintWant, cleanThrough, ahead, gapAhead, offloadTarget, switchTarget, switchUseful, switchPlayer, computeTargets, commitPoint, COVER, drawPos, tag, isHuman, ctrlOf, levelOf,
    LONG, pickReceiver, pickLong, passAim, shownPass, passOrBlock, doPass, blockSpec, RUNON, PASS_FLIGHT, SUPPORT, openShoulder, shoulderPoint, holdShoulder, runOn, leadPass, runOnTarget, passPace, passSpeed, handleUser, userStep,
    MOVES, gestureStep, sideStep, dummyPass, pressure },
  kick:{ KICK, CAM, toFrame, toWorld, frameVec, makeGoal, goalOf, windNow, makeWind, kickWind, launchOf, posAt, velAt, crossOf, judgeCross, scores, curlOf, clearPower, aimFor, bandOf, strikeGoal, cpuKickInputs, gradeOf, verdictOf, layoutOf, kickCam, kickPose, ballAt, kickView, verdictLow, pr, cutTitle, goalLabels,
    dropZone, projectHold, holdSteps, holdLead, kickLabel, rushersOf, rushAt, blockedBy, startDropCut, applyDrop, stopSpot, stageDrop, cpuDrop, cpuDropStrike, cpuDropOffer, kickBall, kickScene },
  sidesOf:{ teamSide, sidesMeet, sideVersion, MIXED_THROUGH, WOMEN_NATIONS, womenClub, womenSix, pickSideSet, importSideOf, careerStageG, careerLook, CAREER_LOOK, careerNewOpen, careerLookSet, careerNewGo, renderCareerNew, draft:() => careerDraft, renderCareerEnd, teamList:() => teamList, quickPick:() => quickPick, artPreview, deleteTeam:() => $('bd-del').click(), saveBuilder:() => $('bd-save').click() },
  ratings:{ BUNDLED:RATINGS_BUNDLED, CLUB_RATED, CLUB_CAP, CLUB_OVER_CAP, starsOfOverall, starsOf, starsWords, starsHtml, teamStars, TEAM_LEVELS, teamLevelOf, teamBudget, abilitiesFor, sumOfOverall, rateNations, nationsRanked, nationsNearest, champOthers, clean:ratingsClean, sync:ratingsSync, fetch:ratingsFetch, boot:ratingsBoot, line:ratingsLine, now:() => ratingsNow, waiting:() => ratingsWaiting, reset:() => { ratingsNow = RATINGS_BUNDLED; ratingsWaiting = null; rateNations(RATINGS_BUNDLED.men); rateWomen(RATINGS_BUNDLED.women); } },
  yourTeam:{ of:myTeamOf, poolOf:poolOfTeam, render:renderYourTeam, leagueLine:yourTeamLeague, recordLine:yourTeamRecord, openPicker:() => openTeams('my'), teamList:() => teamList, POOL_TABS, IMPORT_POOL, poolTeams, tabTeams, tabRatingsLine, poolTabCue, careerClubs, careerDraft:() => careerDraft, finishBuilder:() => $('bd-save').click(), openBuilder, delTeam:() => $('bd-del').click(), commitImport:importCommit, importUi:() => importUi },
  teams:{ overallOf, NATIONS, MORE_NATIONS, allNations, CLUBS, FRANCE, AUSTRALIA, SOUTH_AFRICA, ENGLAND, IRELAND, WALES_SCOTLAND_ITALY, ENGLAND_TWO, COUNTIES, ALL_TEAMS, POOLS, BUDGET, KIT_COLOURS, EARLY, rateOf, outmatched, awayKit, colorDist, cleanTeam, cleanSide, cleanChamp, sidesMeet, codeFor, autoCode, showCol, shuffle, restore, newChamp, standings, honours, simMatch,
    recordChampResult, chaseLine, fixtureStake, chaseTitle, champNote, renderHub, renderHome, champ:() => champ, custom:() => custom, setChamp:c => { champ = c; }, load, save },
  arcade:{ ARCADE, heat, fireOut, onFire, fireTick, startGolden, goldenOn, periodLen, endHalf, scoreTry, dropGoal, maxSpeed },
  stamina:{ STAMINA, ABILITIES, BUDGET, staminaOf, abilityOf, staminaLasts, staminaFade, staminaPace, powerOf, staminaOn, cleanSide, startScrum, autoScrum, openBuilder, renderBuilder, builderLevel, levelChoosing:() => levelChoosing, levelNote:() => levelNote, draft:() => draft },
  career:{ create:careerCreate, start:careerStart, clean:cleanCareer, get:() => career, set:c => { career = c; }, newSeason:careerNewSeason, outcome:careerOutcome, advance:careerAdvance, sign:careerSign, end:careerEnd, trainDone:careerTrainDone, train:careerTrain, drills:careerDrills, play:careerPlay, arm:careerArm, record:careerRecordResult, natOf:careerNatOf, ability:careerAbility, natFor:careerNatFor, overall:careerOverall, skills:careerSkills, teamFor:careerTeamFor, opponents:careerOpponents, deedGains:careerDeedGains, fade:careerFade, sprintDrain:careerSprintDrain, open:careerOpen, newOpen:careerNewOpen, render:renderCareer, renderEnd:renderCareerEnd, restart:careerRestart, renderTrain:renderCareerTrain, renderTable:renderCareerTable, renderHome:renderCareerHome, last:() => careerLast, drillIds:() => PRACTICE_DRILLS.map(d => d.id), scoreGoal, mark:careerMark, STAGES:CAREER_STAGES, COUNTIES:CAREER_COUNTIES, TRAIN:CAREER_TRAIN, DRILL_SKILL:CAREER_DRILL_SKILL, DEED_CAP:CAREER_DEED_CAP, POS:CAREER_POS, SHADE:CAREER_SHADE, PUSH:CAREER_PUSH, SIGN:CAREER_SIGN, signable:careerSignable, rivals:careerRivals, DIFF, diffOf, CUT:CAREER_CUT },
  importer:{ levelFrom:importLevelFrom, level:importLevel, top:importTop, levelStep:importLevelStep, url:importUrl, parse:importParse, read:importRead, fetch:importFetch, doc:importDoc, fit:importFit, focusEl:importFocusEl, ABILITIES, name:importName, personal:importPersonal, short:importShort, same:importSame, sides:importSides, save:importSave, clean:cleanImportLeague, others:importOthers, teams:importTeams, card:importCard, open:importOpen, go:importGo, run:importRun, alt:importAlt, render:importRender, state:() => importUi, league:() => importLeague, setLeague:v => { importLeague = v; }, http:importHttp, gate:importGate, setGate:f => { importGateHook = f; }, POOL:IMPORT_POOL, MAX_REQUESTS:IMPORT_MAX_REQUESTS, MAX_SIDES:IMPORT_MAX_SIDES, UA:IMPORT_UA, SOURCES:IMPORT_SOURCES, MSG:IMPORT_MSG },
  drills:{ DV, DV_VIEW, dvOn, dvTurn, dvCovered, dvCamera, PACE:DRILL_PACE, rate:drillRate, DEMO, demoStart, demoSkip, demoStop, demoLast:() => demoLast, DRILL_IDS, DRILLS:PRACTICE_DRILLS, KIT:DRILL_KIT, start:practiceStart, state:() => practice, result:practiceResult, starsOf:drillStarsOf, RUN:DRILL_RUN, EGG:DRILL_EGG, CIRCLE:DRILL_CIRCLE, CONES:DRILL_CONES, TACKLE:DRILL_TACKLE, KICKS:DRILL_KICKS, DRIVE:DRILL_DRIVE, QUICK:DRILL_QUICK, TAG:DRILL_TAG, BACK:DRILL_BACK, COACH:PRACTICE_COACH, barred:practiceBarred, nextId:practiceNextId, groups:practiceGroups, tackleVerdict, tackleWhy:TACKLE_WHY, backVerdict, tagCanPull, drillName, drillMark, drillCanPull, practiceYoung, circleStartE, circleChestBox, driveGaugeBox, circleLap, circleRadius, circleRunAt, circleSpot, eggThrow, tackleMeterBox, labels:drillLabels, hudSync:drillHudSync, icons:DRILL_ICONS },
  kids:{ KIDS, KIDS_WORDS, KIDS_GATE, KIDS_ASKS, kidsLevel, segIndex:kidsSegIndex, segSet:kidsSegSet, parentGate, gate:() => kidsGate, type:kidsGateType, del:kidsGateDelete, close:kidsGateClose, rest:() => kidsGateRest, wake:kidsGateWake, strike:kidsStrike, diffOf, catchBall, steerAim, startScrum, startLineout, kidsSwitch, kidsChase },
  behind:{ menuDemo, BV_DEMO_AT, BV_DEMO_CAM, BV_DEMO_IN, frameDraw, renderIcons, CAM_WORDS, HALF_WORDS, BV, BV_CELL, ART, ART_STEP, artReady, artInstall, artOff, artLoad, artClear, artFree, artStepped, artPose, artSprite, artSlot, artClass, artLut, artHairOf, behindOn, stickTurn, keyFwd, dprMax, toS, lookOf, cleanLook, paintMan, dirKeyHeld, ringCol, C, LOOK_SKIN, LOOK_HAIR, LOOK_STYLES, LOOK_LONG, LOOK_FEMALE, paintState:() => ({ ctx, SKIN, HAIR }) },
  sound:{ SOUND, NAMES:SOUND_NAMES, SND, ac, sfx, play:soundPlay, frame:() => soundFrame(matchBedWanted()), wanted:matchBedWanted, bedSync, bedOn:() => !!BED, live:soundLive, voices:() => VOICES, hidden:soundHidden, shown:soundShown, unlock:soundUnlock, off:soundOff, quiet:soundQuiet, ctx:() => AC },
  clarity:{ MATCH_PACE, matchPace, paceKeep, renderPaced, PACE_KEEP, BALL_STATUS, STATUS_MATCHES, statusOf, statusWanted, statusSync, careerCaption, CAREER_CAP, careerCol, careerEdgeCol, bvStack, BV_CARRY, BV_TAG, BV_LOOSE, edgeTag, edgeTagAt, say, finishMatch },
  get M() { return M; } };

function start(data) {
  load();
  if (data && ('champ' in data || data.settings || data.custom || 'champHistory' in data || 'seasonSerial' in data || 'career' in data || 'importLeague' in data)) restore(data);
  resize(); setDesk();
  setTimeout(artLoad, 0);                                   // in every case: the demo behind the menu uses them, whatever camera is saved. In the background: an empty pitch or the code-drawn men until they are in, or if they never come
  window.addEventListener('resize', () => { resize(); if (input.stickId === null) restStick(); if (!$('s-teams').hidden) { fitNames(); poolTabShow(); } if (!$('s-home').hidden) yourTeamFit(); });
  window.addEventListener('orientationchange', () => { unzoom(); setTimeout(() => { resize(); if (input.stickId === null) restStick(); }, 300); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', unzoom);
  startDemo();
  goHome();
  offlineStart();
  ratingsBoot();
  restStick();
  requestAnimationFrame(frame);
}
try { window.claude?.hot?.snapshot?.(() => ({ champ, settings, custom, champHistory, seasonSerial, career, importLeague })); } catch (e) { /* not in a viewer */ }
if (window.claude?.hot?.ready) window.claude.hot.ready(start); else start(window.claude?.hot?.data ?? {});
