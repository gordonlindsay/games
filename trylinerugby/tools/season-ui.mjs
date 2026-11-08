// Menu rendering contracts: legacy coverage, user-only counters, safe saved names and an empty cabinet.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = fs.readFileSync(new URL('../src/ui-menus.js', import.meta.url), 'utf8');
const helpers = source.slice(source.indexOf('function seasonRecord('), source.indexOf('function renderHub('));
const nodes = new Map();
const $ = id => { if (!nodes.has(id)) nodes.set(id, {}); return nodes.get(id); };
const stats = {conv:{made:2,att:3},pen:{made:0,att:0},dg:{made:1,att:2},tk:{made:7,att:11},duelN:{won:3,att:5},gain:112.6};
let summary = {played:0,won:0,drawn:0,lost:0,pointsFor:0,pointsAgainst:0,triesFor:0,triesAgainst:0,detailedMatches:0,legacyMatches:0,stats};
const context = vm.createContext({ $, Math, champHistory:[], savedHonours:() => ({champions:0,grandSlams:0,tripleCrowns:0}), standings:() => [{i:0}], honours:() => [], seasonSummary:() => summary, ordinal:n=>n+'st', esc:v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;') });
vm.runInContext(helpers,context);
context.renderSeasonSummary({});
assert.match($('hub-summary').innerHTML,/No matches played/);
assert.doesNotMatch($('hub-summary').innerHTML,/Recorded Season Stats/);
context.renderSeasonSummary({round:5});
assert.match($('hub-summary').innerHTML,/This season has scores and tries only/);
assert.doesNotMatch($('hub-summary').innerHTML,/next played match/);
summary = {...summary,played:2,won:1,lost:1,pointsFor:29,pointsAgainst:33,triesFor:5,triesAgainst:6,detailedMatches:1,legacyMatches:1};
context.renderSeasonSummary({});
assert.match($('hub-summary').innerHTML,/Totals cover 1 recorded match; older matches have scores and tries only/);
assert.match($('hub-summary').innerHTML,/Points 29 for \/ 33 against/);
const detail = context.recordedStatsHtml(stats);
assert.match(detail,/<th scope="row">Tackles<\/th><td>7\/11/);
assert.match(detail,/<th scope="row">Duels<\/th><td>3\/5/);
assert.match(detail,/<th scope="row">Metres Made<\/th><td>113/);
assert.doesNotMatch(detail,/<button|opponent/i);
context.renderCabinet('history');
assert.match($('history').innerHTML,/Complete a championship/);
context.champHistory.push({user:0,teams:[{name:'<img src=x>'}]});
context.renderCabinet('history');
assert.match($('history').innerHTML,/Last 10 completed seasons/);
assert.match($('history').innerHTML,/&lt;img src=x&gt;/);
assert.doesNotMatch($('history').innerHTML,/<img/);
assert.match($('history').innerHTML,/No honours/);
const html = fs.readFileSync(new URL('../index.html', import.meta.url),'utf8');
assert.match(html,/<section class="screen" id="s-cabinet" hidden>[\s\S]*?<div class="cabinet home-cabinet" id="home-history"><\/div>[\s\S]*?id="cab-back" data-back>Back to Menu</);   // the home's Trophy Cabinet: its own screen, from Championship
assert.match(html,/<button class="btn" id="b-cabinet" hidden>Trophy Cabinet<\/button>/);
assert.match(html,/<details[^>]+id="hub-cabinet"/);
assert.match(source,/b-cabinet'\)\.hidden = !champHistory.length/);
assert.match(source,/renderCabinet\('home-history'\); showScreen\('s-cabinet'\)/);
assert.match(source,/archiveChampionship\(champ\); champ = null; save\(\); goHome\(\)/);
assert.match(source,/mine && r.stats \?/);
// Exercise the production controller functions, including their real candidate selector.
const inputSource = fs.readFileSync(new URL('../src/input-devices.js', import.meta.url), 'utf8');
const navSource = inputSource.slice(inputSource.indexOf('let focusEl = null;'), inputSource.indexOf('function navBack('));
const details = {open:false};
const candidate = (tag, y, options = {}) => ({
  disabled:false, hidden:false, tag, ...options,
  classList:{add(){},remove(){}}, getAttribute:() => null,
  closest(){ return this.hiddenAncestor ? {} : null; },
  getBoundingClientRect(){ return {left:0,top:y,width:160,height:this.noBox ? 0 : 30}; },
  click(){ if (this.tag === 'summary') details.open = !details.open; },
});
const play = candidate('.btn',0), cabinet = candidate('summary',50);
const hidden = candidate('summary',100,{hiddenAncestor:true}), closedChild = candidate('summary',150,{noBox:true});
const layer = {id:'s-hub',querySelectorAll(selector){
  const selectors = selector.split(',').map(s=>s.trim());
  return [play,cabinet,hidden,closedChild].filter(el=>selectors.includes(el.tag));
}};
const nav = vm.createContext({Math,M:null,$:()=>null,document:{querySelectorAll:selector=>selector === '.screen' ? [layer] : []}});
vm.runInContext(navSource,nav);
assert.deepEqual(Array.from(nav.navCands(layer)),[play,cabinet], 'summary is a controller candidate; hidden summaries are excluded');
assert.equal(nav.navMove(0,0,0),play,'initial controller focus reaches Play');
assert.equal(nav.navMove(0,0,1),cabinet,'down moves from Play to the cabinet summary');
assert.equal(nav.navPress(0),true);
assert.equal(details.open,true,'controller confirm activates the native summary click');
nav.navPress(0);
assert.equal(details.open,false,'controller confirm closes the same details');
console.log('Season UI: rendering, history and controller navigation contracts passed');
