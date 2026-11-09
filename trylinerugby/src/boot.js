/* =========================================================
   Loop and boot
   ========================================================= */
let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(0.05, (now-last)/1000); last = now;
  pollPads();
  if (window.innerWidth !== V.W || window.innerHeight !== V.H || Math.min(2, window.devicePixelRatio || 1) !== V.dpr) { resize(); if (input.stickId === null) restStick(); }
  if (M && !M.paused && M.phase !== 'break' && M.phase !== 'menu') {
    if (M.stop > 0) { M.stop -= dt; acc = 0; }               // your Big Hit's hit-stop: the world holds for a few frames
    else {
      acc += dt; let n = 0;
      while (acc >= STEP && n < 5) { update(STEP); acc -= STEP; n++; }
      if (n >= 5) acc = 0;
    }
  }
  render(dt);
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
  debug:{ stage:stageDuel, startDuel, duelGate, applyDuel, settings:() => settings, endSprint, collide, view:(W, H) => { V.W = W; V.H = H; V.dpr = 1; }, drawCut, goalKick, openPenalty:(x, y, dP) => openPenalty(0, x, y, dP), openPenaltyFor:openPenalty, penalty, resume, interactive, setRM:v => { RM = !!v; },
    duelCam, duelPose, camAt, startMatch, exitMatch, pickOwner,
    render, updateHud, setMode:v => { mode = v; }, keyDown:e => onKey(e, true), keyUp:e => onKey(e, false), frameStep:dt => { if (M.stop > 0) { M.stop -= dt; return 0; } update(STEP); return 1; },
    setTwo, two:() => two, seatScheme, twoClaim, twoRelease, twoSwap, resetSeats, pads:() => PADS, padsOn:() => padsOn, padConnected, padGone, releaseAll, setDev, lastDev:() => lastDev, focus:() => focusEl, pause, paused:() => !!(M && M.paused),
    openJoin, renderJoin, seatDev, legendHtml, seatKey, swapPlayers, useKeyboard, navLog, navLayer, twoSel:() => twoSel, series:() => series, startTwo, openTeams, renderTeams, renderHub, pickTeam, pickMode:() => pickMode, showBreak, breakKind:() => breakKind, navOnly:() => navOnly, navOwner, cueOf, cutCues, DUEL_LOCK, TWO, SCRUM_LEVEL, LINE_LEVEL, SCRUM_DOM, goHome, exitMatch, setDesk, isDesk, CONFIRM,
    DUEL_SLOW, TDUEL, cutRate, CUT_IN, hintFor, hintShown:() => hintShown, hintOpen:() => HO, hintsOn, setHints, syncHints, hintDev, chipHtml, keycapsFor, renderHintSwitches, tutCards, tutHtml, tutStart, tutAdvance, tutPlay, tut:() => (M ? M.tut : null), tutSeen, tutMark, tutReset, tutMoment, tutSeatOf, TUT_IDS, OPEN_HINTS, placeStick, platesFloor, safeInsets, stickRest, tagBox, nearestAct, releaseTouch, phoneUpright, coachTick, coachClear, coachLast:() => coachLast, COACH_IDS, COACH_LINE },
  contact:{ CONTACT, RUCK, SPRINT, commitTackle, resolveContact, contactStep, releaseBind, joinTackle, tackle, resolveRuck, tackleChecks, userTackle, canDive, canOffload, offload, looseInContact, collide, moveAll, wrongFoot, tackleChance,
    maxSpeed, sprintLevel, sprintable, sprintPress, sprintPick, sprintOn, sprintTick, bestChaser, cpuSprintWant, cleanThrough, ahead, gapAhead, offloadTarget, switchTarget, switchUseful, switchPlayer, computeTargets, commitPoint, COVER, drawPos, tag, isHuman, ctrlOf, levelOf,
    LONG, pickReceiver, pickLong, passAim, shownPass, passOrBlock, doPass, blockSpec, RUNON, SUPPORT, openShoulder, shoulderPoint, holdShoulder, runOn, leadPass, runOnTarget, passPace, passSpeed, handleUser, userStep,
    MOVES, gestureStep, sideStep, dummyPass, pressure },
  kick:{ KICK, CAM, toFrame, toWorld, frameVec, makeGoal, goalOf, windNow, makeWind, kickWind, launchOf, posAt, velAt, crossOf, judgeCross, scores, curlOf, clearPower, aimFor, bandOf, strikeGoal, cpuKickInputs, gradeOf, verdictOf, layoutOf, kickCam, kickPose, ballAt, kickView, verdictLow, pr, cutTitle, goalLabels,
    dropZone, projectHold, holdSteps, holdLead, kickLabel, rushersOf, rushAt, blockedBy, startDropCut, applyDrop, stopSpot, stageDrop, cpuDrop, cpuDropStrike, cpuDropOffer, kickBall, kickScene },
  teams:{ overallOf, NATIONS, NAT_MEN, NAT_WOMEN, SIX_NATIONS, natList, natGroup, catTeam, isNation, listName, CLUBS, FRANCE, AUSTRALIA, SOUTH_AFRICA, ENGLAND, CELTIC, SCOTLAND, NEW_ZEALAND, JAPAN, NATIONAL, TEAM_TIERS, TEAM_LISTS, TEAM_CATS, POOL_OLD, poolKey, catOf, catSide, teamPool, poolTier, poolTeams, poolPick, tierPick, catPick, natLast:() => natLast, ALL_TEAMS, POOLS, BUDGET, KIT_COLOURS, EARLY, rateOf, outmatched, awayKit, colorDist, cleanTeam, codeFor, autoCode, showCol, shuffle, restore, newChamp, standings, honours, simMatch,
    recordChampResult, chaseLine, fixtureStake, chaseTitle, champNote, renderHub, renderHome, champ:() => champ, custom:() => custom, setChamp:c => { champ = c; }, load, save },
  cups:{ CUPS, CUP_TRIPLE, CUP_POOL, TROPHY_METAL, trophyMetal, TROPHY_SHAPE, trophyShape, trophyMask, trophyShapeCss, shapesOn:trophyShapesOn, cupNew, cupFixture, cupRecord, cupDone, cupWinner, cupUserOut, cupLabel, cupFinish, cleanCup, cleanCupEntry, cupTriple, cupTripleAfter, cupTourSide, cupTourHost, cupListOf, cupTwelve, cupSeries, cupPoolRows, cupNext, cupKO, cupStage, cupRecordOf, get:() => cup, set:c => { cup = c; }, turn:() => cupTurn, setTurn:n => { cupTurn = n; }, history:() => champHistory, setHistory:h => { champHistory = h; }, cabinetKind, cabinetTrim, cabinetClean, savedHonours, renderCabinet, comp:() => champComp, compSet:cupCompSet, euroLeague:cupEuroLeague, poolsOn:() => cupPoolsOn, teamsView:cupTeamsView, begin:cupBegin, euroOn:cupEuroOn, euroStart:cupEuroStart, euroSkip:() => cupEuroSkip, recordMatch:cupRecordMatch, play:cupPlay, retain:cupRetain, render:renderCup, fixtureHtml:cupFixtureHtml, winHtml:cupWinHtml, note:cupNote, verdict:cupVerdict, breakLine:cupBreakLine, line:cupLine },
  arcade:{ ARCADE, heat, fireOut, onFire, fireTick, startGolden, goldenOn, periodLen, endHalf, scoreTry, dropGoal, maxSpeed },
  stamina:{ STAMINA, ABILITIES, BUDGET, staminaOf, abilityOf, staminaLasts, staminaFade, staminaPace, powerOf, staminaOn, cleanSide, startScrum, autoScrum, openBuilder, renderBuilder, draft:() => draft },
  career:{ create:careerCreate, start:careerStart, clean:cleanCareer, get:() => career, set:c => { career = c; }, newSeason:careerNewSeason, ahead:careerAhead, outcome:careerOutcome, next:careerNext, advance:careerAdvance, sign:careerSign, offers:careerOffers, target:careerTarget, repair:careerRepair, league:careerLeague, leagueKey:careerLeagueKey, nations:careerNations, end:careerEnd, trainDone:careerTrainDone, train:careerTrain, drills:careerDrills, play:careerPlay, matchOpts:careerMatchOpts, arm:careerArm, record:careerRecordResult, natOf:careerNatOf, ability:careerAbility, natFor:careerNatFor, overall:careerOverall, skills:careerSkills, teamFor:careerTeamFor, opponents:careerOpponents, deedGains:careerDeedGains, fade:careerFade, sprintDrain:careerSprintDrain, open:careerOpen, newOpen:careerNewOpen, clubOpen:careerClubOpen, clubPick:careerClubPick, poolPick:careerPoolPick, tierPick:careerTierPick, clubList:careerClubList, render:renderCareer, renderEnd:renderCareerEnd, renderClubs:renderCareerClubs, restart:careerRestart, catPick:careerCatPick, draft:() => careerDraft, cat:careerCat, eyebrow:careerEyebrow, note:careerNote, renderTrain:renderCareerTrain, renderTable:renderCareerTable, renderHome:renderCareerHome, last:() => careerLast, drillIds:() => PRACTICE_DRILLS.map(d => d.id), scoreGoal, mark:careerMark, cups:careerCups, setCups:v => { careerCupsHook = v; }, PHASES:CAREER_PHASES, CALL:CAREER_CALL, MOVE:CAREER_MOVE, EURO:CAREER_EURO, HOME:CAREER_HOME, KINDS:CAREER_KINDS, CUP_NAME:CAREER_CUP_NAME, START:CAREER_START, TRAIN:CAREER_TRAIN, DRILL_SKILL:CAREER_DRILL_SKILL, DEED_CAP:CAREER_DEED_CAP, POS:CAREER_POS, SHADE:CAREER_SHADE },
  careerPro:{ PRO, pinned:proPinned, run:proRun, spirit:proSpirit, open:proOpen, pass:proPass, carrier:proCarrier, canCall:proCanCall, call:proCall, calling:proCalling, skip:proSkip, mark:proMark, modePick:careerModePick, draft:() => careerDraft },
  careerLife:{ LIFE:CAREER_LIFE, KEYS:CAREER_LIFE_KEYS, COL:CAREER_LIFE_COL, DILEMMAS:CAREER_DILEMMAS, PLANS:CAREER_DILEMMA_PLANS, fresh:careerLifeNew, clean:careerLifeClean, spirit:careerSpirit, morale:careerMorale, energy:careerEnergy, tired:careerLifeTired, plan:careerDilemmaPlan, dilemma:careerDilemma, key:careerDilemmaKey, choose:careerLifeChoose, pick:careerLifePick, train:careerLifeTrain, round:careerLifeRound, arm:careerLifeArm, hands:careerLifeHands, pass:careerLifePass, support:careerLifeSupport, chip:careerLifeChip, barsHtml:careerLifeBarsHtml, dilemmaHtml:careerDilemmaHtml, render:careerLifeRender, hash:careerLifeHash },
  traits:{ TRAITS, TRAIT, teamStars, teamTraitNames, careerTraitIds, arm:traitsArm, on:traitOn, call:traitCall, marks:traitMarks, kicker:traitKicker, band:traitBand, hash:traitHash, chips:careerTraitChips, doKick, penChoice, catchBall, updateBallAir, goalKick, steer },
  importer:{ url:importUrl, parse:importParse, read:importRead, fetch:importFetch, doc:importDoc, fit:importFit, focusEl:importFocusEl, ABILITIES, name:importName, personal:importPersonal, short:importShort, same:importSame, sides:importSides, save:importSave, clean:cleanImportLeague, others:importOthers, teams:importTeams, card:importCard, open:importOpen, go:importGo, run:importRun, alt:importAlt, render:importRender, state:() => importUi, league:() => importLeague, setLeague:v => { importLeague = v; }, http:importHttp, gate:importGate, setGate:f => { importGateHook = f; }, POOL:IMPORT_POOL, MAX_REQUESTS:IMPORT_MAX_REQUESTS, MAX_SIDES:IMPORT_MAX_SIDES, UA:IMPORT_UA, SOURCES:IMPORT_SOURCES, MSG:IMPORT_MSG },
  drills:{ DRILLS:PRACTICE_DRILLS, KIT:DRILL_KIT, start:practiceStart, state:() => practice, result:practiceResult, starsOf:drillStarsOf, RUN:DRILL_RUN, EGG:DRILL_EGG, CIRCLE:DRILL_CIRCLE, CONES:DRILL_CONES, TACKLE:DRILL_TACKLE, KICKS:DRILL_KICKS, DRIVE:DRILL_DRIVE, QUICK:DRILL_QUICK, circleLap, circleRunAt, circleSpot, eggThrow, tackleMeterBox, tackleRunScale, labels:drillLabels, hudSync:drillHudSync, icons:DRILL_ICONS },
  kids:{ KIDS, KIDS_SCALE, KIDS_ADAPT, KIDS_EASY, ready:kidsReady, tune:kidsTune, step:kidsStep, next:kidsNext, adapt:kidsAdapt, KIDS_WORDS, KIDS_GATE, KIDS_ASKS, kidsLevel, segIndex:kidsSegIndex, segSet:kidsSegSet, parentGate, gate:() => kidsGate, type:kidsGateType, del:kidsGateDelete, close:kidsGateClose, rest:() => kidsGateRest, wake:kidsGateWake, GATE_KEY:KIDS_GATE_KEY, relaunch:() => { kidsGateMiss = 0; kidsGateRests = 0; kidsGateRest = null; kidsGateLoad(); }, strike:kidsStrike, diffOf, catchBall, steerAim, startScrum, startLineout, kidsSwitch, kidsChase },
  native:{ on:nativeOn, plugin:nativePlugin, call:nativeCall, boot:nativeBoot, start:nativeStart, webOnly:nativeWebOnly, bars:nativeBars, saved:nativeSaved, mirror:nativeMirror, late:nativeLate, putBack:nativePutBack, isSave:nativeIsSave, buzz:nativeBuzz, back:nativeBack, state:() => nativeApp },
  store:{ has:storeHas, fan:storeFan, fanClub:storeFanClub, gate:storeGate, live:storeLive, native:storeNative, tier:storeTier, setNative:v => { storeNativeHook = v; }, setTier:v => { storeTierHook = v; }, setBackend:b => { storeUse = b; }, backend:storeBackend, stub:storeStub, api:storeApi, plugin:storePlugin, valid:storeValid, offers:storeOffers, offered:storeOffered, grant:storeGrant, clean:cleanStore, bought:() => storeBought, setBought:v => { storeBought = v; }, prices:() => storePrices, setPrices:v => { storePrices = v; }, setAsked:v => { storeAsked = !!v; }, unpriced:storeUnpriced, revoke:storeRevoke, keep:storeKeep, why:storeWhy, start:storeStart, started:() => storeStarted, setStarted:v => { storeStarted = v; }, first:storeFirst, homeTeam:storeHomeTeam, homePool:storeHomePool, teamOf:storeTeamOf, shareLine:storeShareLine, ids:storeIds, render:storeRender, teamsRender:storeTeamsRender, mark:storeMark, refresh:storeRefresh, open:storeOpen, close:storeClose, ui:() => storeUi, cardRender:storeCardRender, buyAsk:storeBuyAsk, buy:storeBuy, restoreAsk:storeRestoreAsk, restore:storeRestore, leave:storeLeave, openUrl:storeOpenUrl, appLink:storeAppLink, fanOwned:storeFanOwned, crest:storeCrest, shield:storeShield, theme:storeTheme, contrast:storeContrast, wallName:storeWallName, wallMail:storeWallMail, wallAsk:storeWallAsk, wallStep:storeWallStep, wallGo:storeWallGo, wallClose:storeWallClose, wall:() => storeWallUi, MAIL:STORE_MAIL, FAN_CLUBS, FULL:STORE_FULL, FULL_HAS:STORE_FULL_HAS, FAN_HAS:STORE_FAN_HAS, LINKS:STORE_LINKS, WEB_TIER:STORE_WEB_TIER, MSG:STORE_MSG, NAMES:STORE_NAMES, LINE:STORE_LINE },
  locker:{ heard:lockerHeard, FEATS:LOCKER_FEATS, TIERS:LOCKER_TIERS, MEDALS:LOCKER_MEDALS, EVENTS:LOCKER_EVENTS, BALLS:LOCKER_BALLS, BOOTS:LOCKER_BOOTS, RAINBOW:LOCKER_RAINBOW, LEGENDS, state:() => locker, set:v => { locker = v; }, fresh:lockerFresh, clean:cleanLocker, saved:lockerSaved, tier:lockerTier, tiers:lockerTiers, count:lockerCount, next:lockerNext, golds:lockerGolds, has:lockerHas, source:lockerSource, legends:lockerLegends, event:lockerEvent, match:lockerMatch, drill:lockerDrill, flush:lockerFlush, dirty:() => lockerDirty, tally:lockerTally, half:lockerHalf, counts:lockerCounts, side:lockerSide, news:lockerNews, isNew:lockerNew, seen:lockerSeen, markSeen:lockerMarkSeen, pick:lockerPick, ball:lockerBall, boots:lockerBoots, ballFill:lockerBallFill, feet:lockerFeet, open:lockerOpen, render:renderLocker, setTab:lockerSetTab, tab:() => lockerTab, home:lockerHome, card:lockerCard, swatch:lockerSwatch, kit:kitOf, finishMatch, showBreak, fanAward:lockerFanAward, fanDrop:lockerFanDrop, fanHeld:lockerFanHeld, fanClubs:lockerFanClubs, fanHtml:lockerFanHtml, fanCabinet:lockerFanCabinet, cup:lockerCup },
  home:{ HL:HOME_HL, select:homeSelect, show:homeShow, first:homeFirst, render:renderHome, champ:champHome, champPick, comps:champComps, tier:() => homeTier, setTier:v => { homeTier = v; }, myClub:myClubTeam, myNat:myNatTeam, myFind:myClubFind, myPool, myIs, myPick, teamDefault, ownPick:teamOwnPick, importHome, importOffer, importShown, importCommit, ring:setFocus },
  get M() { return M; } };

function start(data) {
  load();
  if (data && ('champ' in data || data.settings || data.custom || 'champHistory' in data || 'seasonSerial' in data || 'career' in data || 'importLeague' in data || 'store' in data || 'cup' in data || 'locker' in data)) restore(data);
  resize(); setDesk();
  window.addEventListener('resize', () => { resize(); if (input.stickId === null) restStick(); if (!$('s-teams').hidden) fitNames(); if (!$('s-cup').hidden) cupFit($('s-cup')); homeFit(); });
  window.addEventListener('orientationchange', () => { unzoom(); setTimeout(() => { resize(); if (input.stickId === null) restStick(); }, 300); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', unzoom);
  startDemo();
  goHome();
  try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => homeFit()); } catch (e) { /* no font loading API */ }   // My Team's names fitted again in the game's own typeface
  offlineStart();
  restStick();
  requestAnimationFrame(frame);
}
try { window.claude?.hot?.snapshot?.(() => ({ champ, settings, custom, champHistory, seasonSerial, career, importLeague, cup, cupTurn, store:{ owned:storeBought }, locker:lockerSaved() })); } catch (e) { /* not in a viewer */ }
nativeBoot(() => { if (window.claude?.hot?.ready) window.claude.hot.ready(start); else start(window.claude?.hot?.data ?? {}); });   // a browser starts at once; the app first puts back a save the web view lost (native.js)
