/* =========================================================
   Local clubs by county: written by tools/clubs-local.mjs from docs/clubs-local.json, the research (version 3, 2026-11-14).
   Never edited by hand: change the research and run node tools/clubs-local.mjs (its --check is in tools/local.mjs).
   Every club in England's 2025-26 National League 1 and 2, Regional 1, Regional 2 and Counties 1, first XVs only, by its county (its RFU
   constituent body), Jersey and Guernsey Raiders under Hampshire and Douglas under Cheshire. Surrey first, then A to Z.
   - A club is written as data.js writes one: its kit and trim, how it plays (3 in each ability, one up and one down from its code: the
     game's own, not the club's), and its 2025-26 line. A place with no W-D-L is a league with no published table: its place only.
   - Its rating comes from its league and place (localRated, src/ratings.js), never from the abilities here.
   - A kit marked a free choice is a guess; every other is the club's own colours as the research found them (docs/clubs-local.json
     has the source of each). Kits within a county are told apart at a glance; sourced kits that look alike stay as sourced.
   - The game's own clubs (Farnham and the rest of Surrey's, Aldershot) are not here: data.js has them. shared: the game's clubs a county
     also lists (Aldershot, in Surrey's list since PR #14, shown under Hampshire).
   - cups: the county's own cups by level ({ name, to }, as COUNTY_CUPS), only what is sourced; null for the plain County Cup table.
   - sizes: each league's table, second XVs counted, for localRated.
   One function declaration, after data.js in src/manifest.json (data.js holds 'use strict'): hoisted, so data.js calls it.
   ========================================================= */
function localCounties() {
  return {
    sizes:{
      'Counties 1 ADM Lancashire & Cheshire':12,
      'Counties 1 Cumbria':14,
      'Counties 1 Durham & Northumberland':12,
      'Counties 1 Eastern Counties':12,
      'Counties 1 Essex':10,
      'Counties 1 Hampshire':12,
      'Counties 1 Hertfordshire':10,
      'Counties 1 Kent':12,
      'Counties 1 Middlesex':10,
      'Counties 1 Midlands East (North)':12,
      'Counties 1 Midlands East (South)':12,
      'Counties 1 Midlands West (North)':12,
      'Counties 1 Midlands West (South)':12,
      'Counties 1 Southern North':12,
      'Counties 1 Southern South':12,
      'Counties 1 Surrey/Sussex':11,
      'Counties 1 Western North':12,
      'Counties 1 Western West':12,
      'Counties 1 Yorkshire':12,
      'National League 1':14,
      'National League 2 East':14,
      'National League 2 North':14,
      'National League 2 West':14,
      'Regional 1 Midlands':12,
      'Regional 1 North East':12,
      'Regional 1 North West':12,
      'Regional 1 South Central':12,
      'Regional 1 South East':12,
      'Regional 1 South West':12,
      'Regional 2 Anglia':12,
      'Regional 2 Midlands East':12,
      'Regional 2 Midlands North':12,
      'Regional 2 Midlands West':12,
      'Regional 2 North':12,
      'Regional 2 North East':12,
      'Regional 2 North West':12,
      'Regional 2 Severn':12,
      'Regional 2 South Central':12,
      'Regional 2 South East':12,
      'Regional 2 South West':12,
      'Regional 2 Thames':12,
    },
    counties:[
      { county:'Surrey', label:'Surrey', code:'SUR', key:'sur', wraps:false, shared:[], cups:[{ name:'Surrey Cup', to:5 }, { name:'Surrey Trophy', to:8 }, { name:'Surrey Shield', to:10 }, { name:'Surrey Bowl', to:12 }], clubs:[
        { id:'RPA', name:'Rosslyn Park', kit:'#c8102e', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:3, kicking:3, stamina:2, league:'National League 1', place:4, w:17, d:0, l:9, pf:944, pa:709 },
        { id:'BAN', name:'Barnes', kit:'#064321', trim:'#f2b01e', hoops:true, pace:3, power:4, handling:2, kicking:3, stamina:3, league:'National League 2 East', place:4, w:16, d:1, l:9, pf:738, pa:598 },
        { id:'DOR', name:'Dorking', kit:'#f2efe6', trim:'#c8102e', hoops:true, pace:2, power:3, handling:4, kicking:3, stamina:3, league:'National League 2 East', place:6, w:14, d:2, l:10, pf:798, pa:598 },
        { id:'ESH', name:'Esher', kit:'#1c1c1c', trim:'#f2b01e', pace:3, power:4, handling:3, kicking:3, stamina:2, league:'National League 2 East', place:11, w:10, d:0, l:16, pf:844, pa:831 },
        { id:'OAE', name:'Old Alleynians', kit:'#1b2747', trim:'#6fb7e6', hoops:true, pace:4, power:3, handling:3, kicking:3, stamina:2, league:'Regional 1 South Central', place:4, w:14, d:0, l:8, pf:716, pa:617 },
        { id:'CAE', name:'Camberley', kit:'#1c1c1c', trim:'#f2b01e', hoops:true, pace:3, power:3, handling:4, kicking:2, stamina:3, league:'Regional 1 South Central', place:12, w:3, d:1, l:18, pf:531, pa:1060 },
        { id:'OTI', name:'Old Tiffinians', kit:'#c8102e', trim:'#1b2747', hoops:true, pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Regional 2 South Central', place:4, w:13, d:1, l:8, pf:876, pa:555 },   // colours a free choice
        { id:'SEP', name:'Sutton & Epsom', kit:'#1c1c1c', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:4, kicking:3, stamina:2, league:'Regional 2 South East', place:7, w:9, d:0, l:13, pf:652, pa:594 },
        { id:'TED', name:'Teddington', kit:'#e8731c', trim:'#1b2747', pace:3, power:3, handling:3, kicking:4, stamina:2, league:'Regional 2 Thames', place:7 },   // colours a free choice
        { id:'CHO', name:'Chobham', kit:'#1b2747', trim:'#c8102e', pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Regional 2 South Central', place:9, w:7, d:0, l:15, pf:536, pa:723 },
        { id:'LIW', name:'Wild Geese', kit:'#0f5a32', trim:'#f2efe6', hoops:true, pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Regional 2 Thames', place:10 },
        { id:'RWE', name:'Reeds Weybridge', kit:'#1b2747', trim:'#e8731c', pace:2, power:4, handling:3, kicking:3, stamina:3, league:'Regional 2 South Central', place:11, w:4, d:0, l:18, pf:384, pa:838 },   // colours a free choice
        { id:'ORI', name:'Old Reigatian', kit:'#f2efe6', trim:'#2050b0', pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Regional 2 South East', place:12, w:1, d:0, l:21, pf:369, pa:1015 },   // colours a free choice
        { id:'TRT', name:'Trinity', kit:'#c8102e', trim:'#f2b01e', pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Counties 1 Surrey/Sussex', place:3 },   // colours a free choice
        { id:'OCA', name:'Old Caterhamians', kit:'#7c1431', trim:'#109a52', pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Counties 1 Surrey/Sussex', place:9 },   // colours a free choice
        { id:'OWI', name:'Old Wimbledonian', kit:'#6fb7e6', trim:'#1b2747', hoops:true, pace:2, power:3, handling:3, kicking:3, stamina:4, league:'Counties 1 Surrey/Sussex', place:10 },   // colours a free choice
        { id:'KOL', name:'KCS Old Boys', kit:'#000099', trim:'#f2b01e', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Counties 1 Surrey/Sussex', place:11 },
      ] },
      { county:'Berkshire', label:'Berkshire', code:'BRK', key:'brk', wraps:false, shared:[], cups:null, clubs:[
        { id:'RAM', name:'Rams', kit:'#000099', trim:'#7c1431', pace:2, power:3, handling:3, kicking:3, stamina:4, league:'National League 1', place:7, w:13, d:0, l:13, pf:780, pa:798 },
        { id:'BRC', name:'Bracknell', kit:'#109a52', trim:'#f2b01e', pace:2, power:3, handling:3, kicking:3, stamina:4, league:'Regional 1 South Central', place:6, w:11, d:0, l:11, pf:562, pa:596 },
        { id:'MAI', name:'Maidenhead', kit:'#c2187a', trim:'#5b2a86', hoops:true, pace:3, power:3, handling:2, kicking:3, stamina:4, league:'Regional 1 South Central', place:10, w:5, d:1, l:16, pf:521, pa:888 },
        { id:'NBU', name:'Newbury Blues', kit:'#1b2747', trim:'#6fb7e6', pace:2, power:3, handling:4, kicking:3, stamina:3, league:'Regional 2 Severn', place:5, w:12, d:1, l:9, pf:654, pa:809 },   // colours a free choice
        { id:'WIO', name:'Windsor', kit:'#f2efe6', trim:'#1b2747', hoops:true, pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Regional 2 Thames', place:11 },   // colours a free choice
        { id:'REA', name:'Reading', kit:'#0b610b', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:3, kicking:4, stamina:2, league:'Counties 1 Southern North', place:5 },
        { id:'RAB', name:'Reading Abbey', kit:'#109a52', trim:'#2050b0', hoops:true, pace:2, power:4, handling:3, kicking:3, stamina:3, league:'Counties 1 Southern North', place:6 },
      ] },
      { county:'Buckinghamshire', label:'Bucks', code:'BKM', key:'bkm', wraps:false, shared:[], cups:null, clubs:[
        { id:'ACH', name:'Amersham', kit:'#7c1431', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:4, kicking:3, stamina:2, league:'Regional 1 South East', place:10, w:7, d:0, l:15, pf:514, pa:648 },
        { id:'BEA', name:'Beaconsfield', kit:'#109a52', trim:'#f2b01e', hoops:true, pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Regional 2 Thames', place:2 },
        { id:'AYL', name:'Aylesbury', kit:'#c8102e', trim:'#1c1c1c', hoops:true, pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Regional 2 Thames', place:5 },   // colours a free choice
        { id:'MAO', name:'Marlow', kit:'#1c1c1c', trim:'#f2efe6', hoops:true, pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Regional 2 Thames', place:6 },
        { id:'OLN', name:'Olney', kit:'#f2b01e', trim:'#1c1c1c', pace:3, power:2, handling:3, kicking:3, stamina:4, league:'Regional 2 Midlands East', place:9, w:7, d:0, l:15, pf:582, pa:753 },   // colours a free choice
        { id:'BUC', name:'Buckingham', kit:'#109a52', trim:'#f2efe6', pace:3, power:2, handling:3, kicking:3, stamina:4, league:'Counties 1 Southern North', place:2 },
        { id:'HWY', name:'High Wycombe', kit:'#1b2747', trim:'#6fb7e6', pace:2, power:4, handling:3, kicking:3, stamina:3, league:'Counties 1 Southern North', place:4 },   // colours a free choice
        { id:'BLE', name:'Bletchley', kit:'#7c1431', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Counties 1 Southern North', place:10 },
      ] },
      { county:'Cheshire', label:'Cheshire', code:'CHS', key:'chs', wraps:false, shared:[], cups:[{ name:'Cheshire Cup', to:5 }, { name:'Cheshire Vase', to:7 }, { name:'Cheshire Bowl', to:8 }, { name:'Cheshire Plate', to:9 }], clubs:[
        { id:'SAE', name:'Sale FC Cheshire', kit:'#000099', trim:'#f2efe6', hoops:true, pace:3, power:4, handling:3, kicking:3, stamina:2, league:'National League 1', place:5, w:17, d:0, l:9, pf:826, pa:590 },
        { id:'MAC', name:'Macclesfield', kit:'#1a2f8a', trim:'#f2efe6', hoops:true, pace:2, power:3, handling:3, kicking:4, stamina:3, league:'National League 2 North', place:3, w:20, d:0, l:6, pf:1037, pa:725 },
        { id:'LYM', name:'Lymm', kit:'#1c1c1c', trim:'#109a52', hoops:true, pace:3, power:4, handling:2, kicking:3, stamina:3, league:'National League 2 West', place:9, w:12, d:0, l:14, pf:726, pa:812 },
        { id:'CHE', name:'Chester', kit:'#c8102e', trim:'#1b2747', pace:3, power:4, handling:3, kicking:3, stamina:2, league:'National League 2 West', place:11, w:9, d:1, l:16, pf:761, pa:974 },
        { id:'ANS', name:'Anselmians', kit:'#1c1c1c', trim:'#f2b01e', hoops:true, pace:4, power:3, handling:2, kicking:3, stamina:3, league:'Regional 1 North West', place:2, w:19, d:1, l:2, pf:952, pa:410 },
        { id:'STO', name:'Stockport', kit:'#109a52', trim:'#c8102e', hoops:true, pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Regional 1 North West', place:3, w:15, d:0, l:7, pf:661, pa:458 },
        { id:'BOW', name:'Bowdon', kit:'#6fb7e6', trim:'#1b2747', pace:3, power:3, handling:4, kicking:3, stamina:2, league:'Regional 1 North West', place:7, w:10, d:0, l:12, pf:550, pa:598 },   // colours a free choice
        { id:'WIR', name:'Wirral', kit:'#7c1431', trim:'#f2efe6', hoops:true, pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Regional 1 North West', place:10, w:8, d:1, l:13, pf:575, pa:642 },
        { id:'SAD', name:'Sandbach', kit:'#003300', trim:'#c8102e', pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Regional 2 North West', place:3, w:16, d:0, l:6, pf:747, pa:432 },
        { id:'DOU', name:'Douglas', kit:'#7c1431', trim:'#f2b01e', pace:2, power:3, handling:4, kicking:3, stamina:3, league:'Regional 2 North West', place:5, w:11, d:0, l:11, pf:578, pa:497 },
        { id:'WPR', name:'Winnington Park', kit:'#2050b0', trim:'#6fb7e6', hoops:true, pace:3, power:4, handling:2, kicking:3, stamina:3, league:'Regional 2 North West', place:7, w:11, d:0, l:11, pf:513, pa:615 },
        { id:'BPR', name:'Birkenhead Park', kit:'#c8102e', trim:'#1b2747', hoops:true, pace:3, power:3, handling:4, kicking:2, stamina:3, league:'Regional 2 North West', place:8, w:9, d:0, l:13, pf:559, pa:605 },
        { id:'NOW', name:'Northwich', kit:'#1c1c1c', trim:'#f2b01e', pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Regional 2 North West', place:10, w:9, d:0, l:13, pf:568, pa:604 },
        { id:'AKE', name:'Altrincham', kit:'#f2efe6', trim:'#1c1c1c', pace:2, power:3, handling:3, kicking:3, stamina:4, league:'Regional 2 North West', place:12, w:2, d:0, l:20, pf:432, pa:842 },
        { id:'WIL', name:'Wilmslow', kit:'#6fb7e6', trim:'#c8102e', pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Counties 1 ADM Lancashire & Cheshire', place:1 },   // colours a free choice
        { id:'CNA', name:'Crewe & Nantwich', kit:'#2050b0', trim:'#f2b01e', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Counties 1 Midlands West (North)', place:2 },   // colours a free choice
        { id:'NBR', name:'New Brighton', kit:'#1b2747', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:4, stamina:2, league:'Counties 1 ADM Lancashire & Cheshire', place:6 },
      ] },
      { county:'Cornwall', label:'Cornwall', code:'CON', key:'con', wraps:false, shared:[], cups:[{ name:'Cornwall Cup', to:8 }, { name:'Cornwall Clubs Cup', to:10 }], clubs:[
        { id:'CAB', name:'Camborne', kit:'#f2efe6', trim:'#a4123f', hoops:true, pace:3, power:2, handling:3, kicking:4, stamina:3, league:'National League 2 West', place:1, w:22, d:0, l:4, pf:1106, pa:658 },
        { id:'RED', name:'Redruth', kit:'#c8102e', trim:'#f2efe6', pace:4, power:3, handling:3, kicking:3, stamina:2, league:'National League 2 West', place:10, w:10, d:1, l:15, pf:721, pa:760 },
        { id:'SAU', name:'St Austell', kit:'#c8102e', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:4, kicking:2, stamina:3, league:'Regional 1 South West', place:5, w:14, d:1, l:7, pf:599, pa:458 },
        { id:'LAU', name:'Launceston', kit:'#1c1c1c', trim:'#f2efe6', pace:4, power:3, handling:3, kicking:2, stamina:3, league:'Regional 1 South West', place:8, w:8, d:0, l:14, pf:520, pa:583 },
        { id:'WCA', name:'Wadebridge', kit:'#842929', trim:'#f5c400', pace:2, power:3, handling:3, kicking:4, stamina:3, league:'Regional 2 South West', place:3, w:14, d:0, l:8, pf:747, pa:524 },
        { id:'PAM', name:'Pirates Amateurs', kit:'#1c1c1c', trim:'#f2b01e', pace:3, power:3, handling:3, kicking:4, stamina:2, league:'Regional 2 South West', place:8, w:10, d:0, l:12, pf:644, pa:561 },   // colours a free choice
        { id:'TRU', name:'Truro', kit:'#000099', trim:'#f2b01e', pace:2, power:3, handling:3, kicking:3, stamina:4, league:'Counties 1 Western West', place:5, w:12, d:1, l:9, pf:541, pa:573 },
        { id:'SIV', name:'St Ives', kit:'#1b2747', trim:'#f2efe6', hoops:true, pace:2, power:3, handling:3, kicking:3, stamina:4, league:'Counties 1 Western West', place:7, w:11, d:0, l:11, pf:524, pa:548 },
        { id:'SAT', name:'Saltash', kit:'#c8102e', trim:'#1c1c1c', pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Counties 1 Western West', place:10, w:6, d:0, l:16, pf:566, pa:618 },
        { id:'PEY', name:'Penryn', kit:'#1c1c1c', trim:'#c8102e', hoops:true, pace:3, power:4, handling:2, kicking:3, stamina:3, league:'Counties 1 Western West', place:11, w:6, d:0, l:16, pf:543, pa:672 },
      ] },
      { county:'Cumbria', label:'Cumbria', code:'CUM', key:'cum', wraps:false, shared:[], cups:[{ name:'Cumbria Cup', to:7 }, { name:'Cumbria League Cup', to:8 }], clubs:[
        { id:'KED', name:'Kendal', kit:'#1c1c1c', trim:'#f2b01e', pace:4, power:3, handling:3, kicking:3, stamina:2, league:'Regional 1 North East', place:8, w:8, d:1, l:13, pf:559, pa:532 },
        { id:'PEN', name:'Penrith', kit:'#0f5a32', trim:'#f2efe6', pace:2, power:3, handling:4, kicking:3, stamina:3, league:'Regional 1 North East', place:11, w:6, d:0, l:16, pf:495, pa:950 },
        { id:'KEW', name:'Keswick', kit:'#0f5a32', trim:'#f2b01e', pace:4, power:3, handling:3, kicking:3, stamina:2, league:'Regional 2 North', place:4, w:12, d:0, l:10, pf:622, pa:511 },   // colours a free choice
        { id:'UED', name:'Upper Eden', kit:'#1c1c1c', trim:'#f2efe6', hoops:true, pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Regional 2 North', place:6, w:11, d:0, l:11, pf:615, pa:530 },
        { id:'ASP', name:'Aspatria', kit:'#c8102e', trim:'#1c1c1c', hoops:true, pace:3, power:4, handling:2, kicking:3, stamina:3, league:'Regional 2 North', place:11, w:6, d:1, l:15, pf:419, pa:683 },
        { id:'WIG', name:'Wigton', kit:'#6fb7e6', trim:'#1b2747', pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Regional 2 North', place:12, w:1, d:0, l:21, pf:335, pa:1031 },   // colours a free choice
        { id:'KLO', name:'Kirkby Lonsdale', kit:'#1c1c1c', trim:'#c8102e', pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Counties 1 Cumbria', place:1 },
        { id:'HPA', name:'Hawcoat Park', kit:'#109a52', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:2, kicking:3, stamina:3, league:'Counties 1 Cumbria', place:2 },   // colours a free choice
        { id:'CAR', name:'Carlisle', kit:'#4169e1', trim:'#c8102e', hoops:true, pace:3, power:3, handling:4, kicking:2, stamina:3, league:'Counties 1 Cumbria', place:3 },
        { id:'COE', name:'Cockermouth', kit:'#5b2a86', trim:'#f2efe6', hoops:true, pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Counties 1 Cumbria', place:4 },   // colours a free choice
        { id:'WHT', name:'Whitehaven', kit:'#f2efe6', trim:'#c8102e', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Counties 1 Cumbria', place:5 },
        { id:'SBE', name:'St Benedict\'s', kit:'#f2b01e', trim:'#109a52', pace:4, power:3, handling:3, kicking:3, stamina:2, league:'Counties 1 Cumbria', place:6 },   // colours a free choice
        { id:'EGR', name:'Egremont', kit:'#1b2747', trim:'#6fb7e6', hoops:true, pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Counties 1 Cumbria', place:7 },   // colours a free choice
        { id:'WOK', name:'Workington', kit:'#1c1c1c', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:2, kicking:3, stamina:4, league:'Counties 1 Cumbria', place:8 },
        { id:'AMB', name:'Ambleside', kit:'#6fb7e6', trim:'#f2efe6', hoops:true, pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Counties 1 Cumbria', place:9 },   // colours a free choice
        { id:'WIE', name:'Windermere', kit:'#1f8a8a', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:2, stamina:4, league:'Counties 1 Cumbria', place:10 },   // colours a free choice
        { id:'CRI', name:'Creighton', kit:'#e87722', trim:'#1b2747', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Counties 1 Cumbria', place:11 },   // colours a free choice
        { id:'MIO', name:'Millom', kit:'#c8102e', trim:'#f2efe6', hoops:true, pace:3, power:4, handling:2, kicking:3, stamina:3, league:'Counties 1 Cumbria', place:14 },   // colours a free choice
      ] },
      { county:'Devon', label:'Devon', code:'DEV', key:'dev', wraps:false, shared:[], cups:[{ name:'Devon Senior Cup', to:5 }, { name:'Devon Shield', to:6 }, { name:'Devon Intermediate Cup', to:8 }, { name:'Devon Junior Cup', to:10 }], clubs:[
        { id:'PAL', name:'Plymouth Albion', kit:'#f2efe6', trim:'#006600', pace:3, power:3, handling:2, kicking:3, stamina:4, league:'National League 1', place:3, w:20, d:0, l:6, pf:1000, pa:549 },
        { id:'BAS', name:'Barnstaple', kit:'#c8102e', trim:'#f2efe6', pace:3, power:3, handling:4, kicking:3, stamina:2, league:'National League 2 West', place:7, w:13, d:1, l:12, pf:734, pa:777 },
        { id:'EUN', name:'Exeter Uni', kit:'#0f6b3a', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:2, kicking:3, stamina:4, league:'National League 2 West', place:12, w:10, d:0, l:16, pf:857, pa:957 },
        { id:'DSE', name:'Devonport Svcs', kit:'#1b2747', trim:'#c8102e', pace:2, power:4, handling:3, kicking:3, stamina:3, league:'Regional 1 South West', place:1, w:18, d:1, l:3, pf:818, pa:504 },
        { id:'TOP', name:'Topsham', kit:'#c8102e', trim:'#f2b01e', pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Regional 1 South West', place:2, w:16, d:2, l:4, pf:713, pa:501 },   // colours a free choice
        { id:'BRX', name:'Brixham', kit:'#f2efe6', trim:'#1c1c1c', hoops:true, pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Regional 1 South West', place:3, w:15, d:0, l:7, pf:808, pa:515 },
        { id:'EXM', name:'Exmouth', kit:'#660099', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:3, kicking:3, stamina:2, league:'Regional 1 South West', place:4, w:12, d:1, l:9, pf:711, pa:466 },
        { id:'SID', name:'Sidmouth', kit:'#109a52', trim:'#1b2747', pace:4, power:3, handling:2, kicking:3, stamina:3, league:'Regional 1 South West', place:9, w:8, d:0, l:14, pf:550, pa:705 },   // colours a free choice
        { id:'TIV', name:'Tiverton', kit:'#6fb7e6', trim:'#1b2747', hoops:true, pace:3, power:3, handling:2, kicking:4, stamina:3, league:'Regional 2 South West', place:2, w:18, d:0, l:4, pf:822, pa:463 },
        { id:'OKE', name:'Okehampton', kit:'#7c1431', trim:'#f2b01e', hoops:true, pace:3, power:3, handling:2, kicking:4, stamina:3, league:'Regional 2 South West', place:4, w:14, d:0, l:8, pf:629, pa:478 },
        { id:'CRE', name:'Crediton', kit:'#f2b01e', trim:'#1c1c1c', hoops:true, pace:4, power:3, handling:3, kicking:3, stamina:2, league:'Regional 2 South West', place:5, w:12, d:0, l:10, pf:623, pa:616 },   // colours a free choice
        { id:'IVY', name:'Ivybridge', kit:'#109a52', trim:'#7c1431', pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Regional 2 South West', place:6, w:11, d:1, l:10, pf:606, pa:628 },   // colours a free choice
        { id:'TEI', name:'Teignmouth', kit:'#c8102e', trim:'#1c1c1c', hoops:true, pace:3, power:3, handling:3, kicking:4, stamina:2, league:'Regional 2 South West', place:10, w:7, d:0, l:15, pf:493, pa:785 },
        { id:'CUL', name:'Cullompton', kit:'#f2efe6', trim:'#c8102e', hoops:true, pace:3, power:2, handling:3, kicking:3, stamina:4, league:'Regional 2 South West', place:11, w:4, d:0, l:18, pf:439, pa:785 },   // colours a free choice
        { id:'PAI', name:'Paignton', kit:'#c8102e', trim:'#6fb7e6', pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Counties 1 Western West', place:2, w:16, d:0, l:6, pf:838, pa:602 },   // colours a free choice
        { id:'TAT', name:'Torquay Athletic', kit:'#1c1c1c', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:2, kicking:3, stamina:4, league:'Counties 1 Western West', place:4, w:12, d:1, l:9, pf:650, pa:533 },
        { id:'KIG', name:'Kingsbridge', kit:'#2050b0', trim:'#f2efe6', pace:3, power:3, handling:2, kicking:4, stamina:3, league:'Counties 1 Western West', place:8, w:10, d:0, l:12, pf:535, pa:599 },
        { id:'NAB', name:'Newton Abbot', kit:'#f2efe6', trim:'#109a52', pace:4, power:3, handling:3, kicking:2, stamina:3, league:'Counties 1 Western West', place:9, w:8, d:0, l:14, pf:606, pa:705 },
        { id:'PAO', name:'Plymstock Oaks', kit:'#109a52', trim:'#f2b01e', pace:4, power:3, handling:3, kicking:3, stamina:2, league:'Counties 1 Western West', place:12, w:8, d:0, l:14, pf:505, pa:753 },
      ] },
      { county:'Dorset & Wilts', label:'Dorset & Wilts', code:'DWT', key:'dwt', wraps:false, shared:[], cups:null, clubs:[
        { id:'RWB', name:'Wootton Bassett', kit:'#2050b0', trim:'#f2efe6', pace:4, power:3, handling:2, kicking:3, stamina:3, league:'Regional 1 South West', place:6, w:11, d:2, l:9, pf:689, pa:641 },   // colours a free choice
        { id:'MAL', name:'Marlborough', kit:'#f2b01e', trim:'#1b2747', pace:3, power:3, handling:2, kicking:3, stamina:4, league:'Regional 1 South West', place:11, w:3, d:1, l:18, pf:420, pa:894 },   // colours a free choice
        { id:'BON', name:'Bournemouth', kit:'#1c1c1c', trim:'#f2b01e', pace:4, power:3, handling:3, kicking:2, stamina:3, league:'Regional 2 South Central', place:1, w:21, d:1, l:0, pf:888, pa:367 },
        { id:'TRO', name:'Trowbridge', kit:'#5b2a86', trim:'#f2efe6', pace:2, power:3, handling:3, kicking:3, stamina:4, league:'Regional 2 Severn', place:1, w:20, d:0, l:2, pf:980, pa:347 },   // colours a free choice
        { id:'CHP', name:'Chippenham', kit:'#f2efe6', trim:'#1c1c1c', hoops:true, pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Regional 2 Severn', place:2, w:18, d:1, l:3, pf:1004, pa:454 },
        { id:'WIB', name:'Wimborne', kit:'#7c1431', trim:'#f2b01e', pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Regional 2 South Central', place:3, w:16, d:0, l:6, pf:788, pa:465 },   // colours a free choice
        { id:'NDO', name:'North Dorset', kit:'#109a52', trim:'#1b2747', pace:3, power:4, handling:2, kicking:3, stamina:3, league:'Regional 2 Severn', place:10, w:5, d:1, l:16, pf:424, pa:709 },
        { id:'SHR', name:'Sherborne', kit:'#1c1c1c', trim:'#f2efe6', pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Counties 1 Southern South', place:1 },
        { id:'DEI', name:'Devizes', kit:'#1c1c1c', trim:'#f2efe6', hoops:true, pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Counties 1 Southern South', place:3 },
        { id:'SAS', name:'Salisbury', kit:'#109a52', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:3, kicking:2, stamina:4, league:'Counties 1 Southern South', place:5 },
        { id:'SWR', name:'Swanage Wareham', kit:'#7c1431', trim:'#f2efe6', pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Counties 1 Southern South', place:6 },   // colours a free choice
        { id:'MEK', name:'Melksham', kit:'#1b2747', trim:'#c8102e', pace:3, power:4, handling:2, kicking:3, stamina:3, league:'Counties 1 Southern South', place:7 },   // colours a free choice
        { id:'COH', name:'Corsham', kit:'#c8102e', trim:'#f2efe6', hoops:true, pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Counties 1 Southern South', place:8 },
        { id:'SWI', name:'Swindon', kit:'#6fb7e6', trim:'#1b2747', pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Counties 1 Southern South', place:11 },   // colours a free choice
      ] },
      { county:'Durham', label:'Durham', code:'DHM', key:'dhm', wraps:false, shared:[], cups:[{ name:'Durham Senior Cup', to:5 }], clubs:[
        { id:'DMP', name:'Mowden Park', kit:'#1d3a8f', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:2, kicking:4, stamina:3, league:'National League 2 North', place:5, w:15, d:1, l:10, pf:878, pa:877 },
        { id:'BIL', name:'Billingham', kit:'#f2efe6', trim:'#109a52', hoops:true, pace:3, power:2, handling:4, kicking:3, stamina:3, league:'National League 2 North', place:10, w:10, d:0, l:16, pf:604, pa:905 },
        { id:'BLY', name:'Blaydon', kit:'#c8102e', trim:'#1c1c1c', pace:2, power:3, handling:4, kicking:3, stamina:3, league:'Regional 1 North East', place:5, w:10, d:1, l:11, pf:605, pa:558 },
        { id:'COS', name:'Consett', kit:'#7c1431', trim:'#f2b01e', pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Regional 2 North', place:2, w:14, d:0, l:8, pf:781, pa:629 },   // colours a free choice
        { id:'SUN', name:'Sunderland', kit:'#c8102e', trim:'#f2b01e', pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Regional 2 North', place:5, w:12, d:0, l:10, pf:542, pa:473 },   // colours a free choice
        { id:'WHR', name:'West Hartlepool', kit:'#109a52', trim:'#c8102e', hoops:true, pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Regional 2 North', place:7, w:10, d:1, l:11, pf:676, pa:660 },
        { id:'DCI', name:'Durham City', kit:'#1b2747', trim:'#f2b01e', hoops:true, pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Regional 2 North', place:9, w:9, d:0, l:13, pf:595, pa:557 },
        { id:'RYT', name:'Ryton', kit:'#e8761e', trim:'#1c1c1c', pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Counties 1 Durham & Northumberland', place:2 },   // colours a free choice
        { id:'STC', name:'Stockton', kit:'#c8102e', trim:'#f2efe6', hoops:true, pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Counties 1 Durham & Northumberland', place:3 },
        { id:'PHO', name:'Peterlee Horden', kit:'#7c1431', trim:'#6fb7e6', hoops:true, pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Counties 1 Durham & Northumberland', place:5 },
        { id:'DUI', name:'Durham Uni', kit:'#663366', trim:'#f2efe6', pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Counties 1 Durham & Northumberland', place:6 },
        { id:'GAT', name:'Gateshead', kit:'#f2b01e', trim:'#c8102e', hoops:true, pace:2, power:3, handling:3, kicking:3, stamina:4, league:'Counties 1 Durham & Northumberland', place:7 },   // colours a free choice
        { id:'DAL', name:'Darlington', kit:'#1c1c1c', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:4, kicking:3, stamina:2, league:'Counties 1 Durham & Northumberland', place:8 },
        { id:'BAU', name:'Bishop Auckland', kit:'#1b2747', trim:'#6fb7e6', pace:3, power:3, handling:2, kicking:4, stamina:3, league:'Counties 1 Durham & Northumberland', place:10 },
        { id:'HAE', name:'Hartlepool', kit:'#1c1c1c', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:4, stamina:2, league:'Counties 1 Durham & Northumberland', place:11 },
      ] },
      { county:'East Midlands', label:'East Midlands', code:'EMD', key:'emd', wraps:false, shared:[], cups:[{ name:'East Midlands Cup', to:7 }], clubs:[
        { id:'OUN', name:'Oundle', kit:'#1c1c1c', trim:'#c8102e', pace:3, power:2, handling:3, kicking:3, stamina:4, league:'National League 2 East', place:2, w:20, d:2, l:4, pf:940, pa:713 },
        { id:'ONO', name:'ONs', kit:'#c8102e', trim:'#1b2747', hoops:true, pace:3, power:3, handling:4, kicking:3, stamina:2, league:'Regional 1 South East', place:8, w:7, d:0, l:15, pf:640, pa:648 },
        { id:'NOS', name:'Old Scouts', kit:'#109a52', trim:'#f2b01e', pace:4, power:3, handling:2, kicking:3, stamina:3, league:'Regional 2 Midlands East', place:1, w:19, d:0, l:3, pf:880, pa:446 },   // colours a free choice
        { id:'BAL', name:'Bedford Athletic', kit:'#f2efe6', trim:'#c8102e', hoops:true, pace:3, power:3, handling:3, kicking:4, stamina:2, league:'Regional 2 Midlands East', place:4, w:16, d:0, l:6, pf:789, pa:550 },
        { id:'PET', name:'Peterborough', kit:'#6fb7e6', trim:'#1b2747', pace:3, power:3, handling:2, kicking:4, stamina:3, league:'Regional 2 Midlands East', place:5, w:12, d:2, l:8, pf:805, pa:571 },   // colours a free choice
        { id:'KET', name:'Kettering', kit:'#2050b0', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Regional 2 Midlands East', place:7, w:10, d:0, l:12, pf:575, pa:537 },   // colours a free choice
        { id:'DAV', name:'Daventry', kit:'#5a2d82', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:4, stamina:2, league:'Regional 2 Midlands East', place:11, w:4, d:1, l:17, pf:414, pa:819 },   // colours a free choice
        { id:'WEL', name:'Wellingborough', kit:'#c8102e', trim:'#f2efe6', pace:2, power:4, handling:3, kicking:3, stamina:3, league:'Regional 2 Midlands East', place:12, w:2, d:0, l:20, pf:350, pa:1032 },   // colours a free choice
        { id:'TOW', name:'Towcestrians', kit:'#7c1431', trim:'#f2b01e', pace:2, power:3, handling:3, kicking:4, stamina:3, league:'Counties 1 Midlands East (South)', place:3 },
        { id:'BUG', name:'Bugbrooke', kit:'#f2b01e', trim:'#0f5a32', pace:4, power:3, handling:3, kicking:2, stamina:3, league:'Counties 1 Midlands East (South)', place:6 },
        { id:'LBU', name:'Long Buckby', kit:'#109a52', trim:'#1b2747', pace:4, power:3, handling:3, kicking:3, stamina:2, league:'Counties 1 Midlands East (South)', place:8 },
        { id:'SLL', name:'S&L Corby', kit:'#f2efe6', trim:'#1c1c1c', pace:4, power:3, handling:3, kicking:2, stamina:3, league:'Counties 1 Midlands East (South)', place:10 },   // colours a free choice
        { id:'BIG', name:'Biggleswade', kit:'#1b2747', trim:'#c8102e', pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Counties 1 Midlands East (South)', place:11 },
        { id:'DUS', name:'Dunstablians', kit:'#c8102e', trim:'#1c1c1c', pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Counties 1 Midlands East (South)', place:12 },
      ] },
      { county:'Eastern Counties', label:'Eastern Counties', code:'ECO', key:'eco', wraps:true, shared:[], cups:null, clubs:[
        { id:'BSE', name:'Bury St Edmunds', kit:'#006600', trim:'#f2b01e', pace:3, power:3, handling:3, kicking:4, stamina:2, league:'National League 2 East', place:1, w:20, d:1, l:5, pf:1128, pa:659 },
        { id:'COC', name:'Colchester', kit:'#1c1c1c', trim:'#c8102e', pace:2, power:3, handling:3, kicking:4, stamina:3, league:'Regional 1 South East', place:1, w:21, d:0, l:1, pf:909, pa:461 },
        { id:'SUD', name:'Sudbury', kit:'#1b2747', trim:'#f2efe6', pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Regional 1 South East', place:5, w:10, d:0, l:12, pf:691, pa:677 },   // colours a free choice
        { id:'NWA', name:'North Walsham', kit:'#1c1c1c', trim:'#006600', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Regional 1 South East', place:6, w:11, d:1, l:10, pf:563, pa:619 },
        { id:'SHL', name:'Shelford', kit:'#a42957', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:2, kicking:3, stamina:4, league:'Regional 1 South East', place:12, w:6, d:1, l:15, pf:508, pa:803 },
        { id:'WYM', name:'Wymondham', kit:'#f2b01e', trim:'#1c1c1c', hoops:true, pace:3, power:3, handling:2, kicking:3, stamina:4, league:'Regional 2 Anglia', place:4, w:14, d:0, l:8, pf:743, pa:542 },   // colours a free choice
        { id:'NOI', name:'Norwich', kit:'#7c1431', trim:'#f2b01e', pace:4, power:3, handling:2, kicking:3, stamina:3, league:'Regional 2 Anglia', place:11, w:6, d:0, l:16, pf:513, pa:934 },   // colours a free choice
        { id:'HOL', name:'Holt', kit:'#1c1c1c', trim:'#f2b01e', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Regional 2 Anglia', place:12, w:0, d:0, l:22, pf:322, pa:1066 },   // colours a free choice
        { id:'STW', name:'Stowmarket', kit:'#2050b0', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:2, kicking:3, stamina:3, league:'Counties 1 Eastern Counties', place:2 },   // colours a free choice
        { id:'SWL', name:'Saffron Walden', kit:'#f2efe6', trim:'#1b2747', pace:2, power:4, handling:3, kicking:3, stamina:3, league:'Counties 1 Eastern Counties', place:3 },   // colours a free choice
        { id:'SOU', name:'Southwold', kit:'#6fb7e6', trim:'#1b2747', hoops:true, pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Counties 1 Eastern Counties', place:4 },   // colours a free choice
        { id:'WNO', name:'West Norfolk', kit:'#5b2a86', trim:'#f2efe6', pace:3, power:3, handling:4, kicking:2, stamina:3, league:'Counties 1 Eastern Counties', place:5 },   // colours a free choice
        { id:'IPS', name:'Ipswich', kit:'#1b2747', trim:'#6fb7e6', pace:2, power:4, handling:3, kicking:3, stamina:3, league:'Counties 1 Eastern Counties', place:7 },   // colours a free choice
        { id:'NEM', name:'Newmarket', kit:'#c8102e', trim:'#f2efe6', pace:2, power:3, handling:3, kicking:3, stamina:4, league:'Counties 1 Eastern Counties', place:8 },   // colours a free choice
        { id:'ELY', name:'Ely', kit:'#f2b01e', trim:'#c8102e', hoops:true, pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Counties 1 Eastern Counties', place:10 },   // colours a free choice
        { id:'IYM', name:'Ipswich YM', kit:'#7c1431', trim:'#6fb7e6', pace:3, power:3, handling:2, kicking:4, stamina:3, league:'Counties 1 Eastern Counties', place:11 },   // colours a free choice
      ] },
      { county:'Essex', label:'Essex', code:'ESS', key:'ess', wraps:false, shared:[], cups:null, clubs:[
        { id:'SSA', name:'Southend Saxons', kit:'#663300', trim:'#f2efe6', hoops:true, pace:3, power:4, handling:2, kicking:3, stamina:3, league:'Regional 1 South East', place:4, w:12, d:0, l:10, pf:666, pa:762 },
        { id:'WES', name:'Westcliff', kit:'#7c1431', trim:'#f2b01e', pace:4, power:3, handling:2, kicking:3, stamina:3, league:'Regional 1 South East', place:9, w:9, d:0, l:13, pf:611, pa:617 },
        { id:'EMA', name:'Eton Manor', kit:'#1b2747', trim:'#6fb7e6', pace:3, power:3, handling:4, kicking:2, stamina:3, league:'Regional 2 Anglia', place:1, w:20, d:0, l:2, pf:1006, pa:453 },
        { id:'BRE', name:'Brentwood', kit:'#c8102e', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:3, kicking:2, stamina:3, league:'Regional 2 Anglia', place:3, w:16, d:1, l:5, pf:891, pa:454 },
        { id:'WAT', name:'Wanstead', kit:'#f2efe6', trim:'#c8102e', pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Regional 2 Anglia', place:5, w:11, d:0, l:11, pf:614, pa:673 },   // colours a free choice
        { id:'HAL', name:'Harlow', kit:'#109a52', trim:'#f2efe6', hoops:true, pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Regional 2 Anglia', place:6, w:10, d:0, l:12, pf:595, pa:678 },
        { id:'RHU', name:'Rochford Hundred', kit:'#2050b0', trim:'#f2b01e', pace:2, power:3, handling:4, kicking:3, stamina:3, league:'Regional 2 Anglia', place:7, w:9, d:2, l:11, pf:582, pa:653 },   // colours a free choice
        { id:'WOO', name:'Woodford', kit:'#5b2a86', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:3, kicking:3, stamina:2, league:'Regional 2 Anglia', place:8, w:9, d:1, l:12, pf:629, pa:711 },   // colours a free choice
        { id:'CHL', name:'Chelmsford', kit:'#f2efe6', trim:'#1b2747', hoops:true, pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Regional 2 Anglia', place:9, w:8, d:0, l:14, pf:555, pa:689 },
        { id:'BRR', name:'Braintree', kit:'#1c1c1c', trim:'#c8102e', hoops:true, pace:2, power:3, handling:3, kicking:3, stamina:4, league:'Regional 2 Anglia', place:10, w:7, d:0, l:15, pf:603, pa:702 },   // colours a free choice
        { id:'THU', name:'Thurrock', kit:'#7c1431', trim:'#6fb7e6', pace:4, power:3, handling:2, kicking:3, stamina:3, league:'Counties 1 Essex', place:1 },   // colours a free choice
        { id:'EUC', name:'Upper Clapton', kit:'#c8102e', trim:'#f2b01e', hoops:true, pace:3, power:3, handling:3, kicking:4, stamina:2, league:'Counties 1 Essex', place:2 },   // colours a free choice
        { id:'RGP', name:'Romford', kit:'#5b2a86', trim:'#f2b01e', hoops:true, pace:3, power:3, handling:2, kicking:3, stamina:4, league:'Counties 1 Essex', place:3 },   // colours a free choice
        { id:'MLD', name:'Maldon', kit:'#004c99', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:2, kicking:3, stamina:3, league:'Counties 1 Essex', place:4 },
        { id:'CAP', name:'Campion', kit:'#109a52', trim:'#f2b01e', pace:3, power:3, handling:3, kicking:2, stamina:4, league:'Counties 1 Essex', place:5 },   // colours a free choice
        { id:'ELO', name:'East London', kit:'#1b2747', trim:'#f2efe6', pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Counties 1 Essex', place:6 },   // colours a free choice
        { id:'BIE', name:'Billericay', kit:'#1c1c1c', trim:'#f2b01e', pace:3, power:3, handling:2, kicking:3, stamina:4, league:'Counties 1 Essex', place:7 },
        { id:'CHG', name:'Chingford', kit:'#e8701a', trim:'#1c1c1c', pace:2, power:3, handling:3, kicking:4, stamina:3, league:'Counties 1 Essex', place:8 },   // colours a free choice
        { id:'SHO', name:'Stanford-le-Hope', kit:'#f2efe6', trim:'#109a52', pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Counties 1 Essex', place:9 },   // colours a free choice
        { id:'UPM', name:'Upminster', kit:'#6fb7e6', trim:'#1b2747', hoops:true, pace:2, power:3, handling:4, kicking:3, stamina:3, league:'Counties 1 Essex', place:10 },   // colours a free choice
      ] },
      { county:'Gloucestershire', label:'Glos', code:'GLS', key:'gls', wraps:false, shared:[], cups:null, clubs:[
        { id:'DCR', name:'Dings Crusaders', kit:'#2050b0', trim:'#1c1c1c', hoops:true, pace:4, power:2, handling:3, kicking:3, stamina:3, league:'National League 1', place:10, w:9, d:0, l:17, pf:719, pa:942 },
        { id:'CLI', name:'Clifton', kit:'#b288dc', trim:'#1c1c1c', hoops:true, pace:3, power:2, handling:3, kicking:3, stamina:4, league:'National League 1', place:12, w:9, d:0, l:17, pf:621, pa:909 },
        { id:'CIN', name:'Cinderford', kit:'#c8102e', trim:'#f2b01e', hoops:true, pace:2, power:4, handling:3, kicking:3, stamina:3, league:'National League 2 West', place:5, w:13, d:0, l:13, pf:779, pa:765 },
        { id:'NEE', name:'Newent', kit:'#109a52', trim:'#f2efe6', pace:2, power:4, handling:3, kicking:3, stamina:3, league:'Regional 1 Midlands', place:4, w:15, d:0, l:7, pf:799, pa:549 },
        { id:'LYD', name:'Lydney', kit:'#f2efe6', trim:'#1c1c1c', hoops:true, pace:4, power:3, handling:3, kicking:2, stamina:3, league:'Regional 1 South West', place:7, w:11, d:2, l:9, pf:523, pa:473 },
        { id:'DRY', name:'Drybrook', kit:'#109a52', trim:'#1c1c1c', hoops:true, pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Regional 1 Midlands', place:10, w:4, d:1, l:17, pf:419, pa:734 },   // colours a free choice
        { id:'MAT', name:'Matson', kit:'#732b43', trim:'#b01e73', pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Regional 1 South West', place:12, w:4, d:0, l:18, pf:341, pa:685 },
        { id:'SWO', name:'Stow-on-the-Wold', kit:'#2050b0', trim:'#f2efe6', pace:2, power:3, handling:3, kicking:3, stamina:4, league:'Regional 2 Midlands West', place:2, w:16, d:0, l:6, pf:574, pa:462 },   // colours a free choice
        { id:'CLV', name:'Cleve', kit:'#7c1431', trim:'#f2efe6', pace:3, power:4, handling:2, kicking:3, stamina:3, league:'Regional 2 Severn', place:3, w:18, d:0, l:4, pf:1109, pa:418 },
        { id:'OCE', name:'Old Centralians', kit:'#e8731c', trim:'#1c1c1c', pace:3, power:3, handling:4, kicking:2, stamina:3, league:'Regional 2 Severn', place:6, w:11, d:1, l:10, pf:665, pa:712 },   // colours a free choice
        { id:'THO', name:'Thornbury', kit:'#1c1c1c', trim:'#f2efe6', pace:3, power:3, handling:2, kicking:4, stamina:3, league:'Regional 2 Severn', place:7, w:11, d:0, l:11, pf:774, pa:673 },   // colours a free choice
        { id:'LOG', name:'Longlevens', kit:'#c8102e', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Regional 2 Severn', place:8, w:10, d:0, l:12, pf:698, pa:723 },   // colours a free choice
        { id:'CHT', name:'Cheltenham', kit:'#6fb7e6', trim:'#1c1c1c', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Regional 2 Severn', place:12, w:0, d:1, l:21, pf:276, pa:1166 },   // colours a free choice
        { id:'OBI', name:'Old Bristolians', kit:'#7c1431', trim:'#f2b01e', pace:3, power:3, handling:4, kicking:2, stamina:3, league:'Counties 1 Western North', place:5 },
        { id:'GLE', name:'Gordon League', kit:'#f2efe6', trim:'#c8102e', pace:3, power:3, handling:3, kicking:4, stamina:2, league:'Counties 1 Western North', place:9 },
        { id:'CHF', name:'Chosen Hill FP', kit:'#0f5a32', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:2, stamina:4, league:'Counties 1 Western North', place:12 },
      ] },
      { county:'Hampshire', label:'Hampshire', code:'HAM', key:'ham', wraps:false, shared:['ALD'], cups:[{ name:'Hampshire Cup', to:7 }, { name:'Hampshire Bowl', to:9 }, { name:'Hampshire Plate', to:11 }], clubs:[
        { id:'HAV', name:'Havant', kit:'#1b2747', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:3, kicking:3, stamina:2, league:'National League 2 East', place:8, w:11, d:1, l:14, pf:840, pa:960 },
        { id:'GRA', name:'Guernsey Raiders', kit:'#006600', trim:'#f2efe6', hoops:true, pace:2, power:3, handling:3, kicking:3, stamina:4, league:'National League 2 East', place:10, w:11, d:1, l:14, pf:690, pa:875 },
        { id:'JES', name:'Jersey', kit:'#c8102e', trim:'#f2b01e', pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Regional 1 South Central', place:1, w:21, d:0, l:1, pf:961, pa:408 },   // colours a free choice
        { id:'WIN', name:'Winchester', kit:'#109a52', trim:'#1c1c1c', pace:3, power:3, handling:3, kicking:2, stamina:4, league:'Regional 2 South Central', place:2, w:19, d:0, l:3, pf:823, pa:361 },   // colours a free choice
        { id:'PEE', name:'Petersfield', kit:'#c8102e', trim:'#f2efe6', pace:3, power:4, handling:2, kicking:3, stamina:3, league:'Regional 2 South Central', place:5, w:12, d:1, l:9, pf:566, pa:526 },
        { id:'TOT', name:'Tottonians', kit:'#f2efe6', trim:'#109a52', hoops:true, pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Regional 2 South Central', place:6, w:11, d:1, l:10, pf:653, pa:497 },   // colours a free choice
        { id:'ERI', name:'Ellingham', kit:'#6fb7e6', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:4, kicking:3, stamina:2, league:'Regional 2 South Central', place:12, w:1, d:0, l:21, pf:276, pa:970 },   // colours a free choice
        { id:'POT', name:'Portsmouth', kit:'#1c1c1c', trim:'#f2b01e', pace:3, power:3, handling:3, kicking:2, stamina:4, league:'Counties 1 Hampshire', place:2 },   // colours a free choice
        { id:'BAI', name:'Basingstoke', kit:'#2554af', trim:'#f2b01e', pace:3, power:3, handling:2, kicking:4, stamina:3, league:'Counties 1 Hampshire', place:3 },
        { id:'ANO', name:'Andover', kit:'#c8102e', trim:'#6fb7e6', pace:3, power:3, handling:4, kicking:3, stamina:2, league:'Counties 1 Hampshire', place:4 },   // colours a free choice
        { id:'SSH', name:'Sandown Shanklin', kit:'#f2b01e', trim:'#1b2747', pace:2, power:3, handling:4, kicking:3, stamina:3, league:'Counties 1 Hampshire', place:5 },   // colours a free choice
        { id:'MIL', name:'Millbrook', kit:'#6fb7e6', trim:'#1b2747', pace:3, power:3, handling:2, kicking:4, stamina:3, league:'Counties 1 Hampshire', place:9 },   // colours a free choice
        { id:'GFA', name:'Gosport Fareham', kit:'#1b2747', trim:'#c8102e', pace:2, power:3, handling:4, kicking:3, stamina:3, league:'Counties 1 Hampshire', place:10 },   // colours a free choice
        { id:'EAT', name:'Eastleigh', kit:'#7c1431', trim:'#f2b01e', pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Counties 1 Hampshire', place:12 },   // colours a free choice
      ] },
      { county:'Hertfordshire', label:'Hertfordshire', code:'HRT', key:'hrt', wraps:false, shared:[], cups:[{ name:'Hertfordshire Presidents\' Cup', to:6 }, { name:'Hertfordshire Presidents\' Tankard', to:8 }, { name:'Hertfordshire Presidents\' Trophy', to:10 }], clubs:[
        { id:'BST', name:'Stortford', kit:'#2050b0', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:4, stamina:2, league:'National League 1', place:6, w:13, d:0, l:13, pf:781, pa:836 },
        { id:'OAL', name:'Old Albanian', kit:'#1b2747', trim:'#f2b01e', hoops:true, pace:2, power:3, handling:4, kicking:3, stamina:3, league:'National League 2 East', place:3, w:18, d:0, l:8, pf:1009, pa:813 },
        { id:'LGC', name:'Letchworth', kit:'#1c1c1c', trim:'#f2b01e', hoops:true, pace:3, power:3, handling:3, kicking:4, stamina:2, league:'Regional 1 South East', place:2, w:17, d:1, l:4, pf:874, pa:554 },
        { id:'TRN', name:'Tring', kit:'#1c1c1c', trim:'#f2efe6', pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Regional 1 South East', place:3, w:14, d:2, l:6, pf:743, pa:629 },
        { id:'HFD', name:'Hertford', kit:'#2050b0', trim:'#1c1c1c', pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Regional 1 South East', place:7, w:8, d:1, l:13, pf:651, pa:775 },
        { id:'HAP', name:'Harpenden', kit:'#6fb7e6', trim:'#1b2747', hoops:true, pace:2, power:3, handling:4, kicking:3, stamina:3, league:'Regional 2 Thames', place:8 },   // colours a free choice
        { id:'CHH', name:'Cheshunt', kit:'#109a52', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Counties 1 Hertfordshire', place:1 },   // colours a free choice
        { id:'HIT', name:'Hitchin', kit:'#7c1431', trim:'#f2efe6', pace:4, power:3, handling:2, kicking:3, stamina:3, league:'Counties 1 Hertfordshire', place:3 },
        { id:'HHE', name:'Hemel Hempstead', kit:'#6fb7e6', trim:'#c8102e', pace:4, power:3, handling:3, kicking:3, stamina:2, league:'Counties 1 Hertfordshire', place:6 },   // colours a free choice
        { id:'FUL', name:'Fullerians', kit:'#1c1c1c', trim:'#109a52', pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Counties 1 Hertfordshire', place:8 },
        { id:'WEW', name:'Welwyn', kit:'#c8102e', trim:'#f2efe6', hoops:true, pace:2, power:4, handling:3, kicking:3, stamina:3, league:'Counties 1 Hertfordshire', place:10 },
      ] },
      { county:'Kent', label:'Kent', code:'KEN', key:'ken', wraps:false, shared:[], cups:[{ name:'Kent Cup', to:6 }, { name:'Kent Shield', to:8 }, { name:'Kent Vase', to:10 }], clubs:[
        { id:'BLA', name:'Blackheath', kit:'#c8102e', trim:'#1c1c1c', hoops:true, pace:4, power:3, handling:3, kicking:3, stamina:2, league:'National League 1', place:2, w:21, d:0, l:5, pf:911, pa:530 },
        { id:'TJU', name:'Tonbridge', kit:'#2050b0', trim:'#c8102e', pace:4, power:3, handling:3, kicking:3, stamina:2, league:'National League 1', place:8, w:11, d:1, l:14, pf:805, pa:733 },
        { id:'CAT', name:'Canterbury', kit:'#f2b01e', trim:'#1c1c1c', hoops:true, pace:4, power:2, handling:3, kicking:3, stamina:3, league:'National League 2 East', place:5, w:16, d:0, l:10, pf:851, pa:644 },
        { id:'WPA', name:'Westcombe Park', kit:'#1b2747', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:4, kicking:3, stamina:2, league:'National League 2 East', place:7, w:12, d:0, l:14, pf:851, pa:751 },
        { id:'SEO', name:'Sevenoaks', kit:'#1b2747', trim:'#f2b01e', hoops:true, pace:3, power:3, handling:2, kicking:4, stamina:3, league:'National League 2 East', place:13, w:8, d:0, l:18, pf:743, pa:900 },
        { id:'TWE', name:'Tunbridge Wells', kit:'#2050b0', trim:'#f2efe6', pace:2, power:4, handling:3, kicking:3, stamina:3, league:'Regional 1 South Central', place:3, w:14, d:1, l:7, pf:749, pa:512 },   // colours a free choice
        { id:'MED', name:'Medway', kit:'#c8102e', trim:'#f2b01e', pace:4, power:3, handling:3, kicking:3, stamina:2, league:'Regional 1 South East', place:11, w:7, d:0, l:15, pf:525, pa:702 },   // colours a free choice
        { id:'SIC', name:'Sidcup', kit:'#6fb7e6', trim:'#1b2747', hoops:true, pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Regional 2 South East', place:1, w:19, d:0, l:3, pf:767, pa:377 },   // colours a free choice
        { id:'GRV', name:'Gravesend', kit:'#c8102e', trim:'#6fb7e6', pace:3, power:3, handling:2, kicking:4, stamina:3, league:'Regional 2 South East', place:3, w:14, d:1, l:7, pf:689, pa:505 },   // colours a free choice
        { id:'OCO', name:'Old Colfeians', kit:'#1b2747', trim:'#c8102e', pace:2, power:4, handling:3, kicking:3, stamina:3, league:'Regional 2 South East', place:5, w:12, d:1, l:9, pf:709, pa:615 },   // colours a free choice
        { id:'BEC', name:'Beckenham', kit:'#0000cd', trim:'#f2b01e', hoops:true, pace:3, power:3, handling:3, kicking:2, stamina:4, league:'Regional 2 South East', place:8, w:10, d:0, l:12, pf:666, pa:545 },
        { id:'BRM', name:'Bromley', kit:'#5b2a86', trim:'#f2efe6', pace:3, power:3, handling:4, kicking:3, stamina:2, league:'Regional 2 South East', place:9, w:8, d:0, l:14, pf:628, pa:756 },   // colours a free choice
        { id:'DAR', name:'Dartfordians', kit:'#7c1431', trim:'#f2b01e', pace:3, power:2, handling:3, kicking:3, stamina:4, league:'Regional 2 South East', place:11, w:6, d:0, l:16, pf:594, pa:846 },   // colours a free choice
        { id:'OEL', name:'Old Elthamians', kit:'#2050b0', trim:'#f2b01e', hoops:true, pace:2, power:3, handling:4, kicking:3, stamina:3, league:'Counties 1 Kent', place:1 },   // colours a free choice
        { id:'DBE', name:'Deal & Bettes', kit:'#f2b01e', trim:'#c8102e', pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Counties 1 Kent', place:2 },   // colours a free choice
        { id:'ASH', name:'Ashford', kit:'#0b5a3c', trim:'#6fb7e6', pace:4, power:3, handling:3, kicking:3, stamina:2, league:'Counties 1 Kent', place:5 },   // colours a free choice
        { id:'DOV', name:'Dover', kit:'#f2efe6', trim:'#1b2747', pace:3, power:4, handling:2, kicking:3, stamina:3, league:'Counties 1 Kent', place:6 },   // colours a free choice
        { id:'BEE', name:'Beccehamian', kit:'#7c1431', trim:'#1c1c1c', hoops:true, pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Counties 1 Kent', place:8 },   // colours a free choice
        { id:'GAN', name:'Anchorians', kit:'#1b2747', trim:'#109a52', pace:4, power:3, handling:3, kicking:2, stamina:3, league:'Counties 1 Kent', place:9 },   // colours a free choice
        { id:'PHU', name:'Park House', kit:'#c8102e', trim:'#e8731c', pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Counties 1 Kent', place:10 },   // colours a free choice
        { id:'CRA', name:'Cranbrook', kit:'#6fb7e6', trim:'#f2efe6', pace:3, power:3, handling:2, kicking:3, stamina:4, league:'Counties 1 Kent', place:11 },   // colours a free choice
        { id:'CPA', name:'Charlton Park', kit:'#c8102e', trim:'#f2efe6', hoops:true, pace:2, power:3, handling:3, kicking:3, stamina:4, league:'Counties 1 Kent', place:12 },
      ] },
      { county:'Lancashire', label:'Lancashire', code:'LAN', key:'lan', wraps:false, shared:[], cups:null, clubs:[
        { id:'SPA', name:'Sedgley Park', kit:'#f2b01e', trim:'#7c1431', hoops:true, pace:3, power:4, handling:3, kicking:3, stamina:2, league:'National League 1', place:13, w:8, d:0, l:18, pf:547, pa:923 },
        { id:'FYL', name:'Fylde', kit:'#7c1431', trim:'#f2b01e', pace:3, power:4, handling:2, kicking:3, stamina:3, league:'National League 2 North', place:6, w:13, d:3, l:10, pf:796, pa:664 },
        { id:'PGR', name:'Preston', kit:'#f2efe6', trim:'#1b2747', hoops:true, pace:3, power:3, handling:2, kicking:4, stamina:3, league:'National League 2 North', place:9, w:10, d:1, l:15, pf:776, pa:817 },
        { id:'ROS', name:'Rossendale', kit:'#1c1c1c', trim:'#cf195f', pace:2, power:3, handling:3, kicking:3, stamina:4, league:'National League 2 North', place:12, w:7, d:0, l:19, pf:633, pa:965 },
        { id:'BLC', name:'Blackburn', kit:'#2050b0', trim:'#c8102e', pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Regional 1 North West', place:6, w:12, d:0, l:10, pf:598, pa:690 },
        { id:'ROC', name:'Rochdale', kit:'#1c1c1c', trim:'#6fb7e6', hoops:true, pace:4, power:3, handling:3, kicking:2, stamina:3, league:'Regional 1 North West', place:8, w:8, d:1, l:13, pf:583, pa:796 },   // colours a free choice
        { id:'MCR', name:'Manchester', kit:'#c8102e', trim:'#f2efe6', hoops:true, pace:3, power:2, handling:3, kicking:3, stamina:4, league:'Regional 1 North West', place:9, w:8, d:1, l:13, pf:616, pa:754 },
        { id:'VLU', name:'Vale of Lune', kit:'#f2efe6', trim:'#c8102e', hoops:true, pace:3, power:3, handling:2, kicking:4, stamina:3, league:'Regional 2 North West', place:2, w:16, d:0, l:6, pf:668, pa:432 },
        { id:'WID', name:'Widnes', kit:'#1b2747', trim:'#109a52', pace:2, power:3, handling:3, kicking:4, stamina:3, league:'Regional 2 North West', place:4, w:13, d:0, l:9, pf:581, pa:603 },   // colours a free choice
        { id:'BUA', name:'Burnage', kit:'#1c1c1c', trim:'#f2b01e', pace:3, power:4, handling:2, kicking:3, stamina:3, league:'Regional 2 North West', place:6, w:11, d:0, l:11, pf:595, pa:606 },
        { id:'WAE', name:'Waterloo', kit:'#0f5a32', trim:'#c8102e', hoops:true, pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Regional 2 North West', place:9, w:8, d:0, l:14, pf:535, pa:651 },
        { id:'WPS', name:'West Park', kit:'#006600', trim:'#f2b01e', hoops:true, pace:4, power:3, handling:3, kicking:2, stamina:3, league:'Regional 2 North West', place:11, w:8, d:0, l:14, pf:457, pa:757 },
        { id:'WAI', name:'Warrington', kit:'#f2b01e', trim:'#2050b0', pace:3, power:3, handling:2, kicking:3, stamina:4, league:'Counties 1 ADM Lancashire & Cheshire', place:2 },   // colours a free choice
        { id:'ALW', name:'Aldwinians', kit:'#c8102e', trim:'#f2efe6', pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Counties 1 ADM Lancashire & Cheshire', place:3 },
        { id:'ECC', name:'Eccles', kit:'#1b2747', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:2, kicking:3, stamina:3, league:'Counties 1 ADM Lancashire & Cheshire', place:4 },
        { id:'DTH', name:'Didsbury Toc H', kit:'#1c1c1c', trim:'#f2b01e', hoops:true, pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Counties 1 ADM Lancashire & Cheshire', place:5 },
        { id:'BPK', name:'Broughton Park', kit:'#1c1c1c', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:4, kicking:3, stamina:2, league:'Counties 1 ADM Lancashire & Cheshire', place:7 },
        { id:'TAL', name:'Tarleton', kit:'#7c1431', trim:'#f2efe6', pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Counties 1 ADM Lancashire & Cheshire', place:8 },   // colours a free choice
        { id:'WIA', name:'Wigan', kit:'#1c1c1c', trim:'#2050b0', pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Counties 1 ADM Lancashire & Cheshire', place:9 },   // colours a free choice
        { id:'LSH', name:'Liverpool St H', kit:'#1b2747', trim:'#c8102e', pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Counties 1 ADM Lancashire & Cheshire', place:10 },
        { id:'ASU', name:'Aspull', kit:'#2050b0', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Counties 1 ADM Lancashire & Cheshire', place:11 },   // colours a free choice
        { id:'TMV', name:'Trafford MV', kit:'#1c1c1c', trim:'#f2efe6', hoops:true, pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Counties 1 ADM Lancashire & Cheshire', place:12 },
      ] },
      { county:'Leicestershire', label:'Leicestershire', code:'LCS', key:'lcs', wraps:false, shared:[], cups:[{ name:'Leicestershire County Cup', to:7 }, { name:'Leicestershire Bowl', to:12 }], clubs:[
        { id:'LLI', name:'Leicester Lions', kit:'#7044a3', trim:'#f2efe6', hoops:true, pace:4, power:2, handling:3, kicking:3, stamina:3, league:'National League 1', place:14, w:2, d:0, l:24, pf:599, pa:1239 },
        { id:'HIN', name:'Hinckley', kit:'#f2b01e', trim:'#1c1c1c', hoops:true, pace:3, power:3, handling:3, kicking:2, stamina:4, league:'National League 2 West', place:3, w:19, d:0, l:7, pf:1002, pa:722 },
        { id:'LST', name:'Lboro Students', kit:'#782482', trim:'#f2efe6', pace:2, power:3, handling:4, kicking:3, stamina:3, league:'National League 2 West', place:13, w:8, d:1, l:17, pf:837, pa:1036 },
        { id:'SYS', name:'Syston', kit:'#1b2747', trim:'#6fb7e6', pace:3, power:2, handling:3, kicking:4, stamina:3, league:'National League 2 West', place:14, w:4, d:0, l:22, pf:608, pa:1067 },   // colours a free choice
        { id:'LUT', name:'Lutterworth', kit:'#c8102e', trim:'#f2efe6', pace:4, power:3, handling:2, kicking:3, stamina:3, league:'Regional 1 Midlands', place:9, w:10, d:0, l:12, pf:651, pa:704 },
        { id:'MHA', name:'Harborough', kit:'#1c1c1c', trim:'#1b2747', pace:3, power:4, handling:2, kicking:3, stamina:3, league:'Regional 2 Midlands East', place:2, w:18, d:1, l:3, pf:951, pa:285 },
        { id:'OWY', name:'Oadby Wyggs', kit:'#7c1431', trim:'#f2b01e', pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Regional 2 Midlands East', place:8, w:7, d:1, l:14, pf:527, pa:712 },   // colours a free choice
        { id:'BEG', name:'Belgrave', kit:'#c8102e', trim:'#1c1c1c', hoops:true, pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Regional 2 Midlands North', place:12, w:4, d:0, l:18, pf:415, pa:904 },   // colours a free choice
        { id:'LFO', name:'Leicester Forest', kit:'#0f5a32', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:4, kicking:3, stamina:2, league:'Counties 1 Midlands East (South)', place:5 },   // colours a free choice
        { id:'VIP', name:'Vipers', kit:'#6fb7e6', trim:'#1b2747', pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Counties 1 Midlands East (South)', place:7 },   // colours a free choice
        { id:'MBS', name:'Market Bosworth', kit:'#0033cc', trim:'#f5c400', pace:3, power:3, handling:4, kicking:2, stamina:3, league:'Counties 1 Midlands East (South)', place:9 },
        { id:'ASB', name:'Ashby', kit:'#f2b01e', trim:'#c8102e', hoops:true, pace:4, power:3, handling:3, kicking:3, stamina:2, league:'Counties 1 Midlands East (North)', place:12 },   // colours a free choice
      ] },
      { county:'Middlesex', label:'Middlesex', code:'MDX', key:'mdx', wraps:false, shared:[], cups:[{ name:'Middlesex Senior Cup', to:7 }, { name:'Middlesex Bowl', to:9 }, { name:'Middlesex Vase', to:10 }], clubs:[
        { id:'LWL', name:'London Welsh', kit:'#c8102e', trim:'#f2efe6', pace:3, power:3, handling:4, kicking:3, stamina:2, league:'National League 2 East', place:9, w:10, d:0, l:16, pf:705, pa:866 },
        { id:'LSL', name:'Scottish Lions', kit:'#1b2747', trim:'#c8102e', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Regional 1 South Central', place:2, w:18, d:0, l:4, pf:775, pa:502 },
        { id:'CST', name:'CS Stags 1863', kit:'#1b2747', trim:'#f2efe6', hoops:true, pace:2, power:3, handling:3, kicking:3, stamina:4, league:'Regional 1 South Central', place:5, w:12, d:1, l:9, pf:721, pa:495 },
        { id:'HFU', name:'Hammersmith', kit:'#c8102e', trim:'#f2efe6', hoops:true, pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Regional 1 South Central', place:11, w:3, d:0, l:19, pf:497, pa:822 },
        { id:'BUN', name:'Brunel', kit:'#2050b0', trim:'#f2b01e', pace:3, power:3, handling:2, kicking:4, stamina:3, league:'Regional 2 Thames', place:1 },
        { id:'HAC', name:'HAC', kit:'#1b2747', trim:'#6fb7e6', pace:3, power:3, handling:2, kicking:3, stamina:4, league:'Regional 2 Anglia', place:2, w:20, d:0, l:2, pf:902, pa:400 },   // colours a free choice
        { id:'OPR', name:'Old Priorians', kit:'#7c1431', trim:'#109a52', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Regional 2 Thames', place:3 },   // colours a free choice
        { id:'BPA', name:'Belsize Park', kit:'#800080', trim:'#1c1c1c', hoops:true, pace:3, power:3, handling:4, kicking:3, stamina:2, league:'Regional 2 Thames', place:4 },
        { id:'TWI', name:'Twickenham', kit:'#1c1c1c', trim:'#109a52', hoops:true, pace:4, power:3, handling:2, kicking:3, stamina:3, league:'Regional 2 South Central', place:8, w:10, d:0, l:12, pf:679, pa:665 },   // colours a free choice
        { id:'GRS', name:'Grasshoppers', kit:'#109a52', trim:'#1c1c1c', hoops:true, pace:3, power:3, handling:2, kicking:4, stamina:3, league:'Regional 2 Thames', place:9 },   // colours a free choice
        { id:'ETR', name:'Ealing 1871', kit:'#006666', trim:'#f2efe6', pace:2, power:3, handling:3, kicking:4, stamina:3, league:'Counties 1 Middlesex', place:1 },
        { id:'FIC', name:'Finchley', kit:'#f2efe6', trim:'#c8102e', hoops:true, pace:2, power:3, handling:3, kicking:4, stamina:3, league:'Counties 1 Middlesex', place:2 },
        { id:'OHB', name:'Old Haberdashers', kit:'#1b2747', trim:'#c2185b', hoops:true, pace:3, power:4, handling:2, kicking:3, stamina:3, league:'Counties 1 Middlesex', place:3 },
        { id:'HAT', name:'Hampstead', kit:'#7c1431', trim:'#f2b01e', pace:3, power:3, handling:3, kicking:4, stamina:2, league:'Counties 1 Middlesex', place:4 },
        { id:'CHW', name:'Chiswick', kit:'#7c1431', trim:'#6fb7e6', pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Counties 1 Middlesex', place:5 },
        { id:'LCO', name:'London Cornish', kit:'#1c1c1c', trim:'#2050b0', hoops:true, pace:4, power:3, handling:3, kicking:2, stamina:3, league:'Counties 1 Surrey/Sussex', place:6 },   // colours a free choice
        { id:'OST', name:'Old Streetonians', kit:'#c8102e', trim:'#1b2747', hoops:true, pace:3, power:3, handling:3, kicking:2, stamina:4, league:'Counties 1 Middlesex', place:6 },
        { id:'RUI', name:'Ruislip', kit:'#7c1431', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:4, kicking:3, stamina:2, league:'Counties 1 Middlesex', place:7 },
        { id:'WAP', name:'Wasps', kit:'#1c1c1c', trim:'#f2b01e', pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Counties 1 Middlesex', place:8 },
        { id:'UOB', name:'UCS Old Boys', kit:'#f2efe6', trim:'#c8102e', pace:3, power:3, handling:3, kicking:2, stamina:4, league:'Counties 1 Middlesex', place:9 },
        { id:'SAA', name:'Saracens Amateur', kit:'#1c1c1c', trim:'#c8102e', pace:4, power:3, handling:2, kicking:3, stamina:3, league:'Counties 1 Middlesex', place:10 },
      ] },
      { county:'North Midlands', label:'North Midlands', code:'NMD', key:'nmd', wraps:false, shared:[], cups:[{ name:'North Midlands Cup', to:6 }, { name:'North Midlands Shield', to:8 }, { name:'North Midlands Vase', to:10 }], clubs:[
        { id:'BMO', name:'Moseley', kit:'#1c1c1c', trim:'#c8102e', hoops:true, pace:3, power:2, handling:3, kicking:4, stamina:3, league:'National League 1', place:11, w:8, d:1, l:17, pf:660, pa:757 },
        { id:'LUC', name:'Luctonians', kit:'#f2efe6', trim:'#1c1c1c', hoops:true, pace:3, power:3, handling:3, kicking:2, stamina:4, league:'National League 2 West', place:2, w:20, d:0, l:6, pf:842, pa:544 },
        { id:'BOU', name:'Bournville', kit:'#7c1431', trim:'#00009a', pace:4, power:3, handling:3, kicking:2, stamina:3, league:'Regional 1 Midlands', place:1, w:18, d:0, l:4, pf:866, pa:409 },
        { id:'NSA', name:'Newport (Salop)', kit:'#7c1431', trim:'#f2efe6', hoops:true, pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Regional 1 Midlands', place:2, w:16, d:0, l:6, pf:858, pa:474 },
        { id:'STU', name:'Stourbridge', kit:'#000080', trim:'#f2efe6', hoops:true, pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Regional 1 Midlands', place:3, w:15, d:1, l:6, pf:725, pa:495 },
        { id:'BRO', name:'Bromsgrove', kit:'#f2efe6', trim:'#c8102e', pace:3, power:2, handling:3, kicking:3, stamina:4, league:'Regional 1 Midlands', place:5, w:13, d:0, l:9, pf:874, pa:595 },
        { id:'BRD', name:'Bridgnorth', kit:'#1c1c1c', trim:'#f2efe6', pace:2, power:3, handling:3, kicking:3, stamina:4, league:'Regional 1 Midlands', place:7, w:12, d:1, l:9, pf:669, pa:517 },   // colours a free choice
        { id:'DKI', name:'Dudley K', kit:'#6fb7e6', trim:'#1b2747', hoops:true, pace:3, power:3, handling:2, kicking:3, stamina:4, league:'Regional 1 Midlands', place:11, w:2, d:1, l:19, pf:378, pa:892 },
        { id:'MOA', name:'Moseley Oak', kit:'#1c1c1c', trim:'#6fb7e6', pace:2, power:4, handling:3, kicking:3, stamina:3, league:'Regional 2 Midlands West', place:1, w:20, d:0, l:2, pf:826, pa:298 },   // colours a free choice
        { id:'HEE', name:'Hereford', kit:'#c8102e', trim:'#1c1c1c', pace:3, power:2, handling:3, kicking:3, stamina:4, league:'Regional 2 Midlands West', place:4, w:11, d:0, l:11, pf:496, pa:481 },
        { id:'EDW', name:'Edwardians', kit:'#1b2747', trim:'#109a52', pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Regional 2 Midlands West', place:6, w:9, d:1, l:12, pf:528, pa:567 },   // colours a free choice
        { id:'LUD', name:'Ludlow', kit:'#c8102e', trim:'#f2b01e', hoops:true, pace:3, power:3, handling:3, kicking:2, stamina:4, league:'Regional 2 Midlands West', place:7, w:11, d:0, l:11, pf:442, pa:492 },   // colours a free choice
        { id:'MAV', name:'Malvern', kit:'#1c1c1c', trim:'#2050b0', pace:3, power:3, handling:2, kicking:3, stamina:4, league:'Regional 2 Midlands West', place:9, w:10, d:0, l:12, pf:515, pa:576 },   // colours a free choice
        { id:'OSA', name:'Old Saltleians', kit:'#f2b01e', trim:'#1c1c1c', hoops:true, pace:2, power:3, handling:3, kicking:3, stamina:4, league:'Regional 2 Midlands North', place:10, w:8, d:0, l:14, pf:466, pa:719 },   // colours a free choice
        { id:'OHA', name:'Old Halesonians', kit:'#109a52', trim:'#f2b01e', pace:3, power:3, handling:2, kicking:4, stamina:3, league:'Regional 2 Midlands West', place:12, w:3, d:0, l:19, pf:436, pa:763 },   // colours a free choice
        { id:'WHI', name:'Whitchurch', kit:'#c8102e', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Counties 1 Midlands West (North)', place:1 },
        { id:'WWA', name:'Worcester Wdrs', kit:'#1b2747', trim:'#f2b01e', hoops:true, pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Counties 1 Midlands West (South)', place:1 },
        { id:'CAH', name:'Camp Hill', kit:'#7c1431', trim:'#6fb7e6', pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Counties 1 Midlands West (South)', place:3 },
        { id:'SHW', name:'Shrewsbury', kit:'#f2b01e', trim:'#c8102e', pace:2, power:3, handling:3, kicking:4, stamina:3, league:'Counties 1 Midlands West (North)', place:3 },   // colours a free choice
        { id:'LED', name:'Ledbury', kit:'#e8731c', trim:'#1c1c1c', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Counties 1 Midlands West (South)', place:4 },   // colours a free choice
        { id:'EVE', name:'Evesham', kit:'#6fb7e6', trim:'#c8102e', pace:3, power:3, handling:4, kicking:2, stamina:3, league:'Counties 1 Midlands West (South)', place:5 },   // colours a free choice
        { id:'VES', name:'Veseyans', kit:'#e8731c', trim:'#f2efe6', pace:4, power:3, handling:3, kicking:2, stamina:3, league:'Counties 1 Midlands West (North)', place:5 },   // colours a free choice
        { id:'BRY', name:'Bromyard', kit:'#0f5a32', trim:'#f2efe6', pace:2, power:3, handling:3, kicking:3, stamina:4, league:'Counties 1 Midlands West (South)', place:6 },   // colours a free choice
        { id:'AOE', name:'Aston OE', kit:'#f2efe6', trim:'#109a52', pace:3, power:3, handling:2, kicking:3, stamina:4, league:'Counties 1 Midlands West (North)', place:9 },   // colours a free choice
        { id:'KCA', name:'Kidderminster', kit:'#1c1c1c', trim:'#5b2a86', pace:2, power:4, handling:3, kicking:3, stamina:3, league:'Counties 1 Midlands West (South)', place:11 },   // colours a free choice
        { id:'THR', name:'Telford Hornets', kit:'#1c1c1c', trim:'#e8731c', hoops:true, pace:2, power:4, handling:3, kicking:3, stamina:3, league:'Counties 1 Midlands West (North)', place:11 },   // colours a free choice
        { id:'DRT', name:'Droitwich', kit:'#2050b0', trim:'#f2efe6', pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Counties 1 Midlands West (South)', place:12 },   // colours a free choice
      ] },
      { county:'Northumberland', label:'Northumber\u00adland', code:'NBL', key:'nbl', wraps:true, shared:[], cups:[{ name:'Northumberland Senior Cup', to:6 }, { name:'Northumberland Senior Plate', to:9 }], clubs:[
        { id:'TYN', name:'Tynedale', kit:'#2050b0', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:3, kicking:4, stamina:2, league:'National League 2 North', place:2, w:21, d:0, l:5, pf:941, pa:509 },
        { id:'ALN', name:'Alnwick', kit:'#2050b0', trim:'#f2b01e', pace:3, power:3, handling:4, kicking:3, stamina:2, league:'Regional 1 North East', place:2, w:19, d:0, l:3, pf:741, pa:349 },
        { id:'NOH', name:'Northern', kit:'#f2efe6', trim:'#c8102e', hoops:true, pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Regional 2 North', place:1, w:21, d:0, l:1, pf:814, pa:310 },
        { id:'PPA', name:'Percy Park', kit:'#1c1c1c', trim:'#f2efe6', hoops:true, pace:2, power:3, handling:3, kicking:3, stamina:4, league:'Regional 2 North', place:3, w:12, d:1, l:9, pf:673, pa:622 },
        { id:'MOP', name:'Morpeth', kit:'#1b2747', trim:'#c8102e', pace:2, power:4, handling:3, kicking:3, stamina:3, league:'Regional 2 North', place:8, w:11, d:1, l:10, pf:592, pa:566 },
        { id:'NOV', name:'Novocastrians', kit:'#f2efe6', trim:'#1c1c1c', pace:3, power:3, handling:4, kicking:2, stamina:3, league:'Counties 1 Durham & Northumberland', place:1 },
        { id:'MEI', name:'Medicals', kit:'#7c1431', trim:'#f2efe6', pace:3, power:2, handling:3, kicking:3, stamina:4, league:'Counties 1 Durham & Northumberland', place:4 },
        { id:'POE', name:'Ponteland', kit:'#7c1431', trim:'#1c1c1c', pace:3, power:3, handling:3, kicking:2, stamina:4, league:'Counties 1 Durham & Northumberland', place:9 },
      ] },
      { county:'Notts Lincs & Derbyshire', label:'Notts Lincs & Derbyshire', code:'NLD', key:'nld', wraps:true, shared:[], cups:null, clubs:[
        { id:'SCU', name:'Scunthorpe', kit:'#006666', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:3, kicking:2, stamina:3, league:'National League 2 North', place:13, w:5, d:0, l:21, pf:622, pa:1097 },
        { id:'LEA', name:'Long Eaton', kit:'#2f6fd6', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:2, kicking:3, stamina:4, league:'Regional 1 North West', place:11, w:4, d:0, l:18, pf:521, pa:815 },
        { id:'DER', name:'Derby', kit:'#f2b01e', trim:'#1c1c1c', hoops:true, pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Regional 1 North West', place:12, w:1, d:1, l:20, pf:429, pa:867 },
        { id:'DRO', name:'Dronfield', kit:'#1b2747', trim:'#c8102e', hoops:true, pace:3, power:3, handling:2, kicking:3, stamina:4, league:'Regional 2 Midlands North', place:1, w:20, d:0, l:2, pf:807, pa:302 },   // colours a free choice
        { id:'WBR', name:'West Bridgford', kit:'#1c1c1c', trim:'#f2b01e', pace:2, power:3, handling:3, kicking:4, stamina:3, league:'Regional 2 Midlands North', place:2, w:18, d:0, l:4, pf:926, pa:479 },   // colours a free choice
        { id:'MEB', name:'Melbourne Derbys', kit:'#109a52', trim:'#f2b01e', pace:3, power:3, handling:2, kicking:4, stamina:3, league:'Regional 2 Midlands North', place:4, w:14, d:0, l:8, pf:683, pa:511 },
        { id:'STA', name:'Stamford', kit:'#1c1c1c', trim:'#6fb7e6', hoops:true, pace:3, power:3, handling:3, kicking:2, stamina:4, league:'Regional 2 Midlands East', place:6, w:11, d:2, l:9, pf:565, pa:606 },   // colours a free choice
        { id:'ILE', name:'Ilkeston', kit:'#2050b0', trim:'#f2b01e', pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Regional 2 Midlands North', place:7, w:9, d:0, l:13, pf:546, pa:693 },   // colours a free choice
        { id:'MAK', name:'Matlock', kit:'#7c1431', trim:'#f2b01e', pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Regional 2 Midlands North', place:8, w:9, d:0, l:13, pf:517, pa:593 },   // colours a free choice
        { id:'PAV', name:'Paviors', kit:'#4b2a7a', trim:'#f2efe6', pace:2, power:3, handling:4, kicking:3, stamina:3, league:'Regional 2 Midlands North', place:9, w:8, d:0, l:14, pf:590, pa:677 },   // colours a free choice
        { id:'NEA', name:'Newark', kit:'#f2efe6', trim:'#1b2747', pace:3, power:3, handling:4, kicking:2, stamina:3, league:'Regional 2 Midlands North', place:11, w:7, d:0, l:15, pf:460, pa:613 },   // colours a free choice
        { id:'NUI', name:'Nottingham Uni', kit:'#065434', trim:'#deb408', pace:4, power:3, handling:3, kicking:3, stamina:2, league:'Counties 1 Midlands East (North)', place:1 },
        { id:'MRL', name:'Market Rasen', kit:'#109a52', trim:'#c8102e', hoops:true, pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Counties 1 Midlands East (North)', place:2 },
        { id:'BOE', name:'Bourne', kit:'#1b2747', trim:'#109a52', hoops:true, pace:3, power:3, handling:3, kicking:4, stamina:2, league:'Counties 1 Midlands East (North)', place:4 },   // colours a free choice
        { id:'SPL', name:'Spalding', kit:'#7c1431', trim:'#f2efe6', pace:2, power:3, handling:3, kicking:4, stamina:3, league:'Counties 1 Midlands East (North)', place:5 },   // colours a free choice
        { id:'SOT', name:'Southwell', kit:'#c8102e', trim:'#1b2747', pace:3, power:3, handling:3, kicking:2, stamina:4, league:'Counties 1 Midlands East (North)', place:6 },
        { id:'LIN', name:'Lincoln', kit:'#c8102e', trim:'#109a52', pace:3, power:3, handling:3, kicking:2, stamina:4, league:'Counties 1 Midlands East (North)', place:7 },
        { id:'MES', name:'Mellish', kit:'#6fb7e6', trim:'#1b2747', pace:3, power:3, handling:2, kicking:4, stamina:3, league:'Counties 1 Midlands East (North)', place:8 },   // colours a free choice
        { id:'KEO', name:'Keyworth', kit:'#2050b0', trim:'#6fb7e6', hoops:true, pace:2, power:3, handling:4, kicking:3, stamina:3, league:'Counties 1 Midlands East (North)', place:9 },   // colours a free choice
        { id:'KEE', name:'Kesteven', kit:'#1c1c1c', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Counties 1 Midlands East (North)', place:10 },
        { id:'NMO', name:'Notts Moderns', kit:'#c8102e', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:4, kicking:2, stamina:3, league:'Counties 1 Midlands East (North)', place:11 },
      ] },
      { county:'Oxfordshire', label:'Oxfordshire', code:'OXF', key:'oxf', wraps:false, shared:[], cups:[{ name:'Oxfordshire County Cup', to:7 }], clubs:[
        { id:'HHA', name:'Henley Hawks', kit:'#f2b01e', trim:'#1b2747', pace:3, power:4, handling:2, kicking:3, stamina:3, league:'National League 2 East', place:12, w:9, d:2, l:15, pf:693, pa:665 },
        { id:'OQU', name:'Oxford Quins', kit:'#c8102e', trim:'#6fb7e6', pace:3, power:3, handling:2, kicking:4, stamina:3, league:'National League 2 East', place:14, w:2, d:0, l:24, pf:505, pa:1462 },
        { id:'BAB', name:'Banbury', kit:'#1b2747', trim:'#f2efe6', hoops:true, pace:3, power:2, handling:3, kicking:3, stamina:4, league:'Regional 1 Midlands', place:8, w:12, d:0, l:10, pf:726, pa:501 },
        { id:'WIT', name:'Witney', kit:'#0f5a32', trim:'#f2b01e', pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Regional 2 Severn', place:9, w:6, d:0, l:16, pf:611, pa:879 },   // colours a free choice
        { id:'BIC', name:'Bicester', kit:'#f2efe6', trim:'#1c1c1c', pace:3, power:3, handling:3, kicking:4, stamina:2, league:'Counties 1 Southern North', place:8 },
        { id:'OXO', name:'Oxford', kit:'#109a52', trim:'#1c1c1c', hoops:true, pace:2, power:3, handling:3, kicking:3, stamina:4, league:'Counties 1 Southern North', place:9 },
        { id:'WAG', name:'Wallingford', kit:'#c8102e', trim:'#f2efe6', pace:3, power:3, handling:2, kicking:3, stamina:4, league:'Counties 1 Southern North', place:11 },   // colours a free choice
        { id:'GAB', name:'Gosford', kit:'#1c1c1c', trim:'#f2b01e', pace:2, power:3, handling:3, kicking:3, stamina:4, league:'Counties 1 Southern North', place:12 },   // colours a free choice
      ] },
      { county:'Somerset', label:'Somerset', code:'SOM', key:'som', wraps:false, shared:[], cups:[{ name:'Somerset Senior Cup', to:7 }], clubs:[
        { id:'TTI', name:'Taunton Titans', kit:'#1c1c1c', trim:'#9e1b32', hoops:true, pace:3, power:2, handling:3, kicking:4, stamina:3, league:'National League 2 West', place:4, w:14, d:0, l:12, pf:894, pa:795 },
        { id:'HOR', name:'Hornets', kit:'#1c1c1c', trim:'#ffcc00', hoops:true, pace:3, power:2, handling:3, kicking:3, stamina:4, league:'National League 2 West', place:6, w:14, d:0, l:12, pf:759, pa:756 },
        { id:'ORE', name:'Old Redcliffians', kit:'#c8102e', trim:'#1c1c1c', pace:4, power:3, handling:3, kicking:2, stamina:3, league:'National League 2 West', place:8, w:12, d:0, l:14, pf:775, pa:778 },
        { id:'CVA', name:'Chew Valley', kit:'#6fb7e6', trim:'#1b2747', pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Regional 1 South West', place:10, w:7, d:0, l:15, pf:474, pa:741 },   // colours a free choice
        { id:'WSM', name:'Weston-s-Mare', kit:'#2050b0', trim:'#f2efe6', pace:3, power:3, handling:2, kicking:3, stamina:4, league:'Regional 2 South West', place:1, w:22, d:0, l:0, pf:1030, pa:358 },   // colours a free choice
        { id:'KEH', name:'Keynsham', kit:'#f2b01e', trim:'#1c1c1c', hoops:true, pace:3, power:2, handling:3, kicking:3, stamina:4, league:'Regional 2 Severn', place:4, w:13, d:0, l:9, pf:677, pa:521 },   // colours a free choice
        { id:'WIS', name:'Winscombe', kit:'#1c1c1c', trim:'#f2efe6', pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Regional 2 South West', place:7, w:11, d:1, l:10, pf:615, pa:569 },
        { id:'NPE', name:'North Petherton', kit:'#1b2747', trim:'#6fb7e6', pace:3, power:4, handling:2, kicking:3, stamina:3, league:'Regional 2 South West', place:9, w:8, d:0, l:14, pf:540, pa:638 },   // colours a free choice
        { id:'WEI', name:'Wellington Som', kit:'#4b2a7b', trim:'#f2efe6', hoops:true, pace:3, power:4, handling:2, kicking:3, stamina:3, league:'Regional 2 South West', place:12, w:0, d:0, l:22, pf:219, pa:1002 },   // colours a free choice
        { id:'NBA', name:'Nailsea', kit:'#1c1c1c', trim:'#2050b0', pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Counties 1 Western North', place:1 },
        { id:'WIV', name:'Wiveliscombe', kit:'#1b2747', trim:'#c8102e', pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Counties 1 Western West', place:1, w:18, d:0, l:4, pf:735, pa:450 },
        { id:'WAC', name:'Walcot', kit:'#2050b0', trim:'#1c1c1c', hoops:true, pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Counties 1 Southern South', place:2 },
        { id:'MNR', name:'Midsomer Norton', kit:'#c8102e', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:2, kicking:3, stamina:4, league:'Counties 1 Western North', place:3 },
        { id:'FRO', name:'Frome', kit:'#c8102e', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:2, stamina:4, league:'Counties 1 Southern South', place:4 },
        { id:'CHA', name:'Chard', kit:'#1c1c1c', trim:'#f2b01e', hoops:true, pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Counties 1 Western North', place:6 },
        { id:'GOR', name:'Gordano', kit:'#c8102e', trim:'#1c1c1c', hoops:true, pace:3, power:3, handling:3, kicking:2, stamina:4, league:'Counties 1 Western North', place:8 },
        { id:'BAO', name:'Bridgwater', kit:'#c8102e', trim:'#f2b01e', hoops:true, pace:4, power:3, handling:3, kicking:3, stamina:2, league:'Counties 1 Western North', place:10 },
      ] },
      { county:'Staffordshire', label:'Staffordshire', code:'STS', key:'sts', wraps:false, shared:[], cups:[{ name:'Staffordshire Senior Cup', to:7 }, { name:'Staffordshire Intermediate Cup', to:8 }], clubs:[
        { id:'BUR', name:'Burton', kit:'#f2efe6', trim:'#1c1c1c', pace:3, power:4, handling:2, kicking:3, stamina:3, league:'Regional 1 North West', place:4, w:12, d:1, l:9, pf:617, pa:655 },
        { id:'LEE', name:'Leek', kit:'#2050b0', trim:'#f2efe6', pace:4, power:3, handling:3, kicking:3, stamina:2, league:'Regional 1 North West', place:5, w:11, d:0, l:11, pf:641, pa:646 },
        { id:'LIC', name:'Lichfield', kit:'#005500', trim:'#1b2747', pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Regional 1 Midlands', place:6, w:12, d:1, l:9, pf:654, pa:572 },
        { id:'WAS', name:'Walsall', kit:'#c8102e', trim:'#f2efe6', pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Regional 2 Midlands North', place:3, w:16, d:0, l:6, pf:739, pa:507 },
        { id:'STR', name:'Stoke-on-Trent', kit:'#6fb7e6', trim:'#1b2747', hoops:true, pace:4, power:3, handling:3, kicking:2, stamina:3, league:'Regional 2 Midlands North', place:5, w:10, d:0, l:12, pf:557, pa:649 },
        { id:'BUT', name:'Burntwood', kit:'#c8102e', trim:'#109a52', hoops:true, pace:3, power:2, handling:3, kicking:3, stamina:4, league:'Counties 1 Midlands West (North)', place:7 },
        { id:'NST', name:'Newcastle Staffs', kit:'#7c1431', trim:'#f2efe6', pace:3, power:3, handling:2, kicking:3, stamina:4, league:'Counties 1 Midlands West (North)', place:8 },
        { id:'TAM', name:'Tamworth', kit:'#1c1c1c', trim:'#7c1431', pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Counties 1 Midlands West (North)', place:12 },
      ] },
      { county:'Sussex', label:'Sussex', code:'SSX', key:'ssx', wraps:false, shared:[], cups:null, clubs:[
        { id:'WRA', name:'Worthing Raiders', kit:'#2050b0', trim:'#f2b01e', hoops:true, pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Regional 1 South Central', place:8, w:10, d:0, l:12, pf:596, pa:644 },
        { id:'BRG', name:'Brighton', kit:'#2050b0', trim:'#f2efe6', pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Regional 2 South East', place:2, w:18, d:0, l:4, pf:817, pa:567 },
        { id:'HOS', name:'Horsham', kit:'#109a52', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:3, kicking:4, stamina:2, league:'Regional 2 South East', place:4, w:13, d:2, l:7, pf:770, pa:620 },   // colours a free choice
        { id:'BOG', name:'Bognor', kit:'#5a2d82', trim:'#109a52', pace:4, power:3, handling:3, kicking:3, stamina:2, league:'Counties 1 Hampshire', place:1 },
        { id:'HWA', name:'Heathfield', kit:'#109a52', trim:'#1c1c1c', hoops:true, pace:4, power:3, handling:3, kicking:2, stamina:3, league:'Counties 1 Kent', place:3 },   // colours a free choice
        { id:'HOV', name:'Hove', kit:'#109a52', trim:'#7c1431', pace:4, power:3, handling:3, kicking:3, stamina:2, league:'Counties 1 Surrey/Sussex', place:4 },   // colours a free choice
        { id:'EAS', name:'Eastbourne', kit:'#2050b0', trim:'#6fb7e6', pace:3, power:3, handling:4, kicking:2, stamina:3, league:'Counties 1 Surrey/Sussex', place:5 },   // colours a free choice
        { id:'CHR', name:'Chichester', kit:'#2050b0', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:2, kicking:3, stamina:4, league:'Counties 1 Hampshire', place:6 },
        { id:'CRW', name:'Crowborough', kit:'#1c1c1c', trim:'#f2efe6', hoops:true, pace:2, power:3, handling:4, kicking:3, stamina:3, league:'Counties 1 Kent', place:7 },   // colours a free choice
        { id:'HHT', name:'Haywards Heath', kit:'#1c1c1c', trim:'#c8102e', hoops:true, pace:3, power:3, handling:2, kicking:4, stamina:3, league:'Counties 1 Surrey/Sussex', place:8 },
      ] },
      { county:'Warwickshire', label:'Warwickshire', code:'WAR', key:'war', wraps:false, shared:[], cups:null, clubs:[
        { id:'NUN', name:'Nuneaton', kit:'#1c1c1c', trim:'#c8102e', hoops:true, pace:3, power:3, handling:3, kicking:4, stamina:2, league:'Regional 1 Midlands', place:12, w:0, d:1, l:21, pf:234, pa:1411 },
        { id:'BRT', name:'Broadstreet', kit:'#003300', trim:'#c8102e', pace:4, power:3, handling:3, kicking:2, stamina:3, league:'Regional 2 Midlands East', place:3, w:17, d:1, l:4, pf:830, pa:422 },
        { id:'SIL', name:'Silhillians', kit:'#7c1431', trim:'#f2efe6', pace:3, power:3, handling:4, kicking:2, stamina:3, league:'Regional 2 Midlands West', place:5, w:12, d:0, l:10, pf:549, pa:491 },   // colours a free choice
        { id:'SCL', name:'Sutton Coldfield', kit:'#109a52', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:2, kicking:3, stamina:3, league:'Regional 2 Midlands North', place:6, w:9, d:0, l:13, pf:593, pa:652 },   // colours a free choice
        { id:'KEI', name:'Kenilworth', kit:'#f2b01e', trim:'#1b2747', pace:4, power:3, handling:3, kicking:3, stamina:2, league:'Regional 2 Midlands West', place:8, w:9, d:1, l:12, pf:533, pa:579 },   // colours a free choice
        { id:'OCV', name:'Old Coventrians', kit:'#1b2747', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:4, kicking:2, stamina:3, league:'Regional 2 Midlands East', place:10, w:5, d:0, l:17, pf:430, pa:965 },   // colours a free choice
        { id:'SST', name:'Shipston', kit:'#1c1c1c', trim:'#ffe303', pace:4, power:3, handling:3, kicking:2, stamina:3, league:'Regional 2 Midlands West', place:10, w:8, d:1, l:13, pf:505, pa:586 },
        { id:'SAV', name:'Stratford', kit:'#6fb7e6', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:2, stamina:4, league:'Regional 2 Midlands West', place:11, w:7, d:1, l:14, pf:375, pa:574 },   // colours a free choice
        { id:'ALC', name:'Alcester', kit:'#c8102e', trim:'#f2efe6', pace:3, power:3, handling:2, kicking:4, stamina:3, league:'Counties 1 Midlands West (South)', place:2 },   // colours a free choice
        { id:'NAV', name:'Newbold-on-Avon', kit:'#c8102e', trim:'#1c1c1c', hoops:true, pace:2, power:3, handling:4, kicking:3, stamina:3, league:'Counties 1 Midlands East (South)', place:2 },
        { id:'NOE', name:'Nuneaton Old Eds', kit:'#5b2a86', trim:'#f2efe6', pace:2, power:3, handling:3, kicking:4, stamina:3, league:'Counties 1 Midlands East (South)', place:4 },   // colours a free choice
        { id:'SPR', name:'Spartans', kit:'#109a52', trim:'#1c1c1c', pace:4, power:3, handling:2, kicking:3, stamina:3, league:'Counties 1 Midlands West (North)', place:4 },   // colours a free choice
        { id:'EAR', name:'Earlsdon', kit:'#f2efe6', trim:'#c8102e', pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Counties 1 Midlands West (South)', place:7 },   // colours a free choice
        { id:'LEM', name:'Leamington', kit:'#1c1c1c', trim:'#6fb7e6', hoops:true, pace:3, power:3, handling:3, kicking:4, stamina:2, league:'Counties 1 Midlands West (South)', place:8 },   // colours a free choice
        { id:'MPA', name:'Manor Park', kit:'#c8102e', trim:'#1c1c1c', pace:2, power:4, handling:3, kicking:3, stamina:3, league:'Counties 1 Midlands West (South)', place:9 },
        { id:'OLE', name:'Leamingtonians', kit:'#f2b01e', trim:'#2050b0', hoops:true, pace:3, power:2, handling:3, kicking:3, stamina:4, league:'Counties 1 Midlands West (South)', place:10 },
      ] },
      { county:'Yorkshire', label:'Yorkshire', code:'YKS', key:'yks', wraps:false, shared:[], cups:[{ name:'Yorkshire Cup', to:6 }], clubs:[
        { id:'RTI', name:'Rotherham Titans', kit:'#af003d', trim:'#6fb7e6', hoops:true, pace:3, power:4, handling:3, kicking:2, stamina:3, league:'National League 1', place:1, w:22, d:0, l:4, pf:1052, pa:515 },
        { id:'LTY', name:'Leeds Tykes', kit:'#000088', trim:'#f2b01e', pace:3, power:3, handling:2, kicking:4, stamina:3, league:'National League 1', place:9, w:11, d:0, l:15, pf:658, pa:873 },
        { id:'SHF', name:'Sheffield', kit:'#2a5fb8', trim:'#f2efe6', hoops:true, pace:2, power:3, handling:3, kicking:4, stamina:3, league:'National League 2 North', place:1, w:24, d:0, l:2, pf:1041, pa:467 },
        { id:'HIO', name:'Hull Ionians', kit:'#f2efe6', trim:'#c8102e', pace:2, power:3, handling:3, kicking:4, stamina:3, league:'National League 2 North', place:4, w:17, d:1, l:8, pf:801, pa:592 },
        { id:'WHA', name:'Wharfedale', kit:'#109a52', trim:'#f2efe6', pace:3, power:3, handling:3, kicking:4, stamina:2, league:'National League 2 North', place:7, w:13, d:0, l:13, pf:725, pa:780 },
        { id:'STI', name:'Sheffield Tigers', kit:'#1c1c1c', trim:'#7c1431', hoops:true, pace:4, power:3, handling:3, kicking:2, stamina:3, league:'National League 2 North', place:8, w:12, d:0, l:14, pf:686, pa:611 },
        { id:'OTL', name:'Otley', kit:'#1c1c1c', trim:'#9a9a9a', hoops:true, pace:3, power:2, handling:3, kicking:4, stamina:3, league:'National League 2 North', place:11, w:7, d:0, l:19, pf:673, pa:831 },
        { id:'HUL', name:'Hull', kit:'#1c1c1c', trim:'#c8102e', pace:3, power:2, handling:4, kicking:3, stamina:3, league:'National League 2 North', place:14, w:5, d:0, l:21, pf:570, pa:943 },
        { id:'HEA', name:'Heath', kit:'#1c1c1c', trim:'#7c1431', pace:4, power:3, handling:3, kicking:2, stamina:3, league:'Regional 1 North East', place:1, w:21, d:0, l:1, pf:983, pa:363 },
        { id:'HUD', name:'Huddersfield', kit:'#f2efe6', trim:'#7c1431', pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Regional 1 North West', place:1, w:21, d:0, l:1, pf:1021, pa:570 },
        { id:'HAO', name:'Harrogate', kit:'#f2b01e', trim:'#c8102e', hoops:true, pace:2, power:3, handling:4, kicking:3, stamina:3, league:'Regional 1 North East', place:3, w:16, d:0, l:6, pf:794, pa:445 },
        { id:'ILK', name:'Ilkley', kit:'#c8102e', trim:'#1c1c1c', pace:4, power:3, handling:2, kicking:3, stamina:3, league:'Regional 1 North East', place:4, w:13, d:0, l:9, pf:811, pa:616 },
        { id:'DRI', name:'Driffield', kit:'#1d3a8f', trim:'#1c1c1c', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Regional 1 North East', place:6, w:10, d:1, l:11, pf:582, pa:682 },
        { id:'SAN', name:'Sandal', kit:'#f2b01e', trim:'#7c1431', pace:3, power:4, handling:3, kicking:3, stamina:2, league:'Regional 1 North East', place:7, w:9, d:1, l:12, pf:638, pa:722 },
        { id:'MID', name:'Middlesbrough', kit:'#7c1431', trim:'#f2b01e', pace:3, power:4, handling:2, kicking:3, stamina:3, league:'Regional 1 North East', place:9, w:8, d:0, l:14, pf:583, pa:754 },
        { id:'YOR', name:'York', kit:'#109a52', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:4, kicking:3, stamina:2, league:'Regional 1 North East', place:10, w:8, d:0, l:14, pf:455, pa:616 },
        { id:'CLC', name:'Cleckheaton', kit:'#f2efe6', trim:'#c8102e', hoops:true, pace:3, power:3, handling:2, kicking:4, stamina:3, league:'Regional 1 North East', place:12, w:2, d:0, l:20, pf:348, pa:1007 },
        { id:'NRI', name:'N. Ribblesdale', kit:'#6fb7e6', trim:'#1b2747', pace:2, power:3, handling:4, kicking:3, stamina:3, league:'Regional 2 North West', place:1, w:18, d:0, l:4, pf:779, pa:368 },   // colours a free choice
        { id:'SCA', name:'Scarborough', kit:'#7c1431', trim:'#1b2747', pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Regional 2 North East', place:1 },
        { id:'POC', name:'Pocklington', kit:'#1c1c1c', trim:'#6fb7e6', hoops:true, pace:2, power:4, handling:3, kicking:3, stamina:3, league:'Regional 2 North East', place:2 },   // colours a free choice
        { id:'OBR', name:'Old Brodleians', kit:'#1c1c1c', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:3, kicking:2, stamina:3, league:'Regional 2 North East', place:3 },
        { id:'MOR', name:'Morley', kit:'#7c1431', trim:'#1c1c1c', pace:2, power:3, handling:3, kicking:3, stamina:4, league:'Regional 2 North East', place:4 },
        { id:'SEB', name:'Selby', kit:'#c8102e', trim:'#109a52', hoops:true, pace:3, power:4, handling:2, kicking:3, stamina:3, league:'Regional 2 North East', place:5 },
        { id:'MOO', name:'Moortown', kit:'#4b2a7b', trim:'#f2efe6', hoops:true, pace:4, power:3, handling:2, kicking:3, stamina:3, league:'Regional 2 North East', place:6 },   // colours a free choice
        { id:'MNO', name:'Malton & Norton', kit:'#1c1c1c', trim:'#c8102e', pace:2, power:3, handling:4, kicking:3, stamina:3, league:'Regional 2 North East', place:7 },
        { id:'BSA', name:'Bradford Salem', kit:'#f2efe6', trim:'#109a52', pace:3, power:2, handling:4, kicking:3, stamina:3, league:'Regional 2 North East', place:8 },   // colours a free choice
        { id:'PON', name:'Pontefract', kit:'#2050b0', trim:'#f2b01e', pace:4, power:3, handling:2, kicking:3, stamina:3, league:'Regional 2 North East', place:9 },   // colours a free choice
        { id:'GUS', name:'Guisborough', kit:'#1c1c1c', trim:'#f2b01e', pace:3, power:4, handling:3, kicking:2, stamina:3, league:'Regional 2 North', place:10, w:10, d:2, l:10, pf:487, pa:579 },
        { id:'WET', name:'Wetherby', kit:'#c8102e', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:4, kicking:2, stamina:3, league:'Regional 2 North East', place:10 },
        { id:'OCR', name:'Old Crossleyans', kit:'#e8762c', trim:'#1c1c1c', pace:2, power:3, handling:3, kicking:4, stamina:3, league:'Regional 2 North East', place:11 },   // colours a free choice
        { id:'DPH', name:'Donc. Phoenix', kit:'#1b2747', trim:'#f2efe6', pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Regional 2 North East', place:12 },
        { id:'WDE', name:'Wath-upon-Dearne', kit:'#1b2747', trim:'#7c1431', pace:2, power:3, handling:3, kicking:4, stamina:3, league:'Counties 1 Yorkshire', place:1 },
        { id:'DIN', name:'Dinnington', kit:'#2050b0', trim:'#6fb7e6', pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Counties 1 Yorkshire', place:2 },   // colours a free choice
        { id:'GOO', name:'Goole', kit:'#c8102e', trim:'#f2b01e', pace:4, power:3, handling:2, kicking:3, stamina:3, league:'Counties 1 Yorkshire', place:3 },   // colours a free choice
        { id:'YAR', name:'Yarnbury', kit:'#f2efe6', trim:'#1b2747', pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Counties 1 Yorkshire', place:4 },
        { id:'WLE', name:'West Leeds', kit:'#7c1431', trim:'#109a52', hoops:true, pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Counties 1 Yorkshire', place:5 },   // colours a free choice
        { id:'KEG', name:'Keighley', kit:'#6fb7e6', trim:'#7c1431', pace:3, power:2, handling:3, kicking:3, stamina:4, league:'Counties 1 Yorkshire', place:6 },   // colours a free choice
        { id:'WEN', name:'Wensleydale', kit:'#f2efe6', trim:'#2050b0', pace:2, power:3, handling:3, kicking:3, stamina:4, league:'Counties 1 Yorkshire', place:7 },   // colours a free choice
        { id:'ORS', name:'Old Rishworthian', kit:'#7c1431', trim:'#f2efe6', pace:3, power:2, handling:3, kicking:4, stamina:3, league:'Counties 1 Yorkshire', place:8 },
        { id:'HPT', name:'Pythons', kit:'#1c1c1c', trim:'#c8102e', hoops:true, pace:3, power:3, handling:4, kicking:2, stamina:3, league:'Counties 1 Yorkshire', place:9 },
        { id:'HUE', name:'Hullensians', kit:'#e8762c', trim:'#f2efe6', hoops:true, pace:3, power:3, handling:3, kicking:2, stamina:4, league:'Counties 1 Yorkshire', place:10 },   // colours a free choice
        { id:'BEV', name:'Beverley', kit:'#006600', trim:'#f2efe6', hoops:true, pace:4, power:2, handling:3, kicking:3, stamina:3, league:'Counties 1 Yorkshire', place:11 },
        { id:'ACK', name:'Acklam', kit:'#109a52', trim:'#f2b01e', pace:3, power:4, handling:2, kicking:3, stamina:3, league:'Counties 1 Durham & Northumberland', place:12 },   // colours a free choice
        { id:'LEO', name:'Leodiensian', kit:'#1b2747', trim:'#f2b01e', pace:4, power:3, handling:3, kicking:3, stamina:2, league:'Counties 1 Yorkshire', place:12 },
      ] },
    ],
    kits:{ MER:{ kit:'#1c1c1c', trim:'#f2b01e', hoops:false } },   // the game's own kits a decision changes (Merton: plain, its hoops never sourced)
  };
}
