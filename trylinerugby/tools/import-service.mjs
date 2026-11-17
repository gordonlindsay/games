// The import service (import-service/, the web build's Add Your Team on Vercel): its generated core is current and is the
// game's own parsers, the address check, the handler driven with fake requests over a stubbed node:https and DNS that
// serve the fixtures in tools/fixtures/import (no request leaves this machine), the service worker leaving it alone, its
// Vercel set-up, and, where Playwright is installed, the web build importing through a local copy of the service by touch.
// node tools/import-service.mjs   (SHOTS=<dir> keeps the browser run's screenshots)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import { PassThrough, Readable } from 'node:stream';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { assertServiceCurrent, assembleServiceCore, servicePath, SERVICE_HELPERS, SERVICE_EXPORTS, shellAssets, assembleWorker } from './build.mjs';
process.env.SEED ??= '23';
delete process.env.TRYLINE_IMPORT_TEST_ORIGIN;              // set only by section 6's own run, and read as each handler is made
const { T } = await import('./harness.mjs');
const require = createRequire(import.meta.url);
const I = T.importer;
let passed = 0;
const ok = (test, message) => { if (!test) throw Error(message); passed++; };
const dir = fileURLToPath(new URL('../', import.meta.url)), svc = path.join(dir, 'import-service');
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');
const fx = f => fs.readFileSync(new URL('./fixtures/import/' + f + '.html', import.meta.url), 'utf8');
const ORIGIN = 'https://gordonlindsay.github.io';
const PIT = 'https://www.pitchero.com/clubs/bracknell';
const DASH = /[\u2014\u2190-\u2199\u21d0-\u21d9]/;            // an em dash or an arrow glyph

// 1. lib/import-core.cjs is current, and is src/import-core.js itself with colorDist's lines from the game's sources
{
  assertServiceCurrent();
  const text = fs.readFileSync(servicePath, 'utf8'), core = read('src/import-core.js');
  ok(text === assembleServiceCore(), 'import-service/lib/import-core.cjs is what tools/build.mjs makes now');
  ok(text.includes(core), 'it holds src/import-core.js byte for byte');
  for (const [file, name] of SERVICE_HELPERS) { const line = read('src/' + file).split('\n').find(l => l.startsWith(`function ${name}(`) || l.startsWith(`const ${name} =`)); ok(line && text.includes(line + '\n'), `${name} is src/${file}'s own line`); }
  const manifest = JSON.parse(read('src/manifest.json'));
  ok(manifest.indexOf('import-core.js') >= 0 && manifest.indexOf('import-core.js') === manifest.indexOf('import.js') - 1, 'src/manifest.json lists import-core.js just before import.js');
  const code = core.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, "''").replace(/\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, '/x/');
  ok(!/\b(?:document|window|localStorage|sessionStorage|navigator|location|Capacitor|settings|custom|importLeague|importHttp|levelById|TEAM_LEVELS|CLUBS)\b/.test(code) && !/\$\(/.test(code), 'src/import-core.js names no page, save or game global, and no importHttp: the network is handed in');
  const defined = new Set([...code.matchAll(/(?:function\s+|const\s+|let\s+|var\s+)([A-Za-z_$][\w$]*)/g)].map(m => m[1]));
  const called = [...new Set([...code.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]))].filter(n => !defined.has(n));
  const ALLOWED = new Set(['if', 'for', 'while', 'catch', 'async', 'Error', 'Promise', 'RegExp', 'Set', 'String', 'URL', 'parseInt', 'setTimeout', 'clearTimeout', 'fn', 'no', 'visit', 'colorDist']);
  ok(called.every(n => ALLOWED.has(n)), `every function it calls is its own, the language's, a parameter's or colorDist (${called.filter(n => !ALLOWED.has(n)).join(' ') || 'none other'})`);
  // run in a bare context: only the language and URL and the timers, as the service has. A game global it needed would throw here
  const box = { module:{ exports:{} }, URL, setTimeout, clearTimeout };
  vm.runInNewContext(text, box, { filename:'import-core.cjs' });
  const C = box.module.exports;
  ok(SERVICE_EXPORTS.every(k => C[k] !== undefined) && Object.keys(C).join() === SERVICE_EXPORTS.join(), `it exports ${SERVICE_EXPORTS.length} names, and only those`);
  const urls = { 'pitchero-safeguarding':PIT + '/teams/3100/league-table', 'pitchero-home':PIT, 'pitchero-league':PIT + '/teams/3100/league-table', 'pitchero-fixtures':PIT + '/teams/3100/fixtures-results',
    'pitchero-minis-empty':PIT + '/teams/3487/fixtures-results', 'pitchero-minis-friendlies':'https://www.pitchero.com/clubs/darlingtonrfc/teams/14605/fixtures-results', 'generic-tournament':'https://www.riversiderfc.example.com/spring-cup',
    'generic-jsonld':'https://www.hilltophawks.example.com/', 'generic-next':'https://aldervale.example.org/', 'generic-flight':'https://juniper.example.org/tables', 'generic-empty':'https://blank.example.org/', 'generic-people':'https://club.example.org/team/zara-fakeperson' };
  for (const [f, u] of Object.entries(urls)) ok(JSON.stringify(C.importParse(fx(f), u)) === JSON.stringify(I.parse(fx(f), u)), `${f}: the service reads it exactly as the game does`);
  for (const l of ['', 'javascript:alert(1)', 'http://127.0.0.1/', ' www.pitchero.com/clubs/bracknell?utm_source=x ', 'https://user:pw@example.com/', 'https://example.com:8443/']) ok(C.importUrl(l) === I.url(l), `a link is cleaned the same way: ${JSON.stringify(l)}`);
  const req = createRequire(path.join(svc, 'api', 'import.js'));
  ok(req('../lib/import-core.cjs').importUrl === require(servicePath).importUrl, 'api/import.js reaches lib/ by its fixed relative path');
}

// 2. the addresses never reached
const S = require(path.join(svc, 'lib/service.cjs'));
const PRIVATE = ['127.0.0.1', '127.255.255.254', '10.0.0.1', '10.255.255.255', '172.16.0.1', '172.31.255.254', '192.168.1.1', '169.254.169.254', '169.254.0.1', '100.64.0.1', '100.127.255.254',
  '0.0.0.0', '0.1.2.3', '224.0.0.1', '239.255.255.250', '240.0.0.1', '255.255.255.255', '192.0.0.8', '192.0.2.1', '198.51.100.1', '203.0.113.7', '198.18.0.1', '198.19.255.1', '192.88.99.1',
  '::', '::1', '0:0:0:0:0:0:0:1', 'fc00::1', 'fd12:3456::1', 'fe80::1', 'fe80::1%eth0', 'fec0::1', 'ff02::1', 'ff05::1:3', '::ffff:10.0.0.1', '::ffff:127.0.0.1', '::ffff:169.254.169.254', '::ffff:a00:1',
  '::ffff:192.168.0.1', '::10.0.0.1', '64:ff9b::a00:1', '2001:db8::1', '2001::1', '2001:0:4136:e378::1', '2002:a00:1::1', '3fff::1', '100::1', 'not an address', '', '1.2.3', '256.1.1.1'];
const PUBLIC = ['151.101.2.10', '8.8.8.8', '1.1.1.1', '172.15.255.1', '172.32.0.1', '100.63.255.1', '100.128.0.1', '169.253.0.1', '192.169.0.1', '2606:4700:4700::1111', '2a00:1450:4009:81f::200e', '::ffff:8.8.8.8'];
for (const a of PRIVATE) ok(S.blocked(a), `${a || '(empty)'} is never reached`);
for (const a of PUBLIC) ok(!S.blocked(a), `${a} is a public address`);

// 3. the handler, over a stubbed node:https and DNS serving the fixtures
/* sites: 'host/path' to { body, status, type, headers, delay, hang, chunk }. names: host to its DNS answer. The stub
   calls the request's own lookup, as node:https does, and serves only once that lookup has given an address. */
function stubNet({ names = {}, sites = {} } = {}) {
  const log = { requests:[], served:[], written:0, cut:false };
  /* a c-ares Resolver's resolve4 and resolve6, as the service asks: the name's answers of that family, or ENODATA */
  const family = v6 => host => new Promise((ok, no) => setImmediate(() => {
    const all = names[host] === undefined ? null : [].concat(names[host]).filter(a => a.includes(':') === v6);
    if (all && all.length) ok(all); else no(Object.assign(Error('no data'), { code:all ? 'ENODATA' : 'ENOTFOUND' }));
  }));
  const dns = { resolve4:family(false), resolve6:family(true) };
  const https = { request(options, onResponse) {
    log.requests.push(options);
    const req = new EventEmitter();
    let gone = false;
    req.destroy = () => { gone = true; };
    req.end = () => options.lookup(options.hostname, { all:true }, (err, addrs) => {
      if (err) { req.emit('error', err); return; }
      if (gone) return;
      const key = options.hostname + options.path, site = sites[key] || { status:404, body:'' };
      log.served.push({ key, address:addrs[0].address });
      if (site.hang) return;
      setTimeout(() => {
        if (gone) return;
        const res = new PassThrough();
        res.statusCode = site.status ?? 200;
        res.headers = { 'content-type':site.type ?? 'text/html; charset=utf-8', ...(site.headers || {}) };
        res.complete = false;
        onResponse(res);
        const body = site.body ?? '', size = site.chunk || 65536;
        let at = 0;
        const more = () => {
          if (res.destroyed) { log.cut = true; return; }
          if (at >= body.length) { res.complete = true; res.end(); return; }
          res.write(body.slice(at, at + size)); log.written += Math.min(size, body.length - at); at += size;
          setImmediate(more);
        };
        more();
      }, site.delay || 0);
    });
    return req;
  } };
  return { https, dns, log };
}
const fakeReq = ({ method = 'POST', url = '/api/import', origin = ORIGIN, type = 'text/plain;charset=UTF-8', body = '', ip = '203.0.113.50', headers = {}, helperBody } = {}) => {
  const r = Readable.from(body ? [Buffer.from(body)] : []);
  r.method = method; r.url = url;
  r.headers = Object.fromEntries(Object.entries({ origin, 'content-type':type, 'x-real-ip':ip, 'x-forwarded-for':ip + ', 10.0.0.9', ...headers }).filter(([, v]) => v != null).map(([k, v]) => [k.toLowerCase(), v]));
  r.socket = { remoteAddress:'10.1.1.1' };
  if (helperBody !== undefined) r.body = helperBody;
  return r;
};
const fakeRes = () => ({ statusCode:200, headers:{}, body:'', ended:false, setHeader(k, v) { this.headers[k.toLowerCase()] = String(v); }, getHeader(k) { return this.headers[k.toLowerCase()]; }, end(b) { this.body = b == null ? '' : String(b); this.ended = true; } });
const spoken = [];
let hushed = 0, kept = null;
const quiet = async fn => {                                 // every console call while fn runs is caught: the service must make none. Calls may overlap (imports at once): the console comes back when the last ends
  if (!hushed++) { kept = {}; for (const k of ['log', 'info', 'warn', 'error', 'debug', 'trace', 'dir']) { kept[k] = console[k]; console[k] = (...a) => spoken.push(a.map(String).join(' ')); } }
  try { return await fn(); } finally { if (!--hushed) Object.assign(console, kept); }
};
const call = async (handler, o) => { const res = fakeRes(); await quiet(() => handler(fakeReq(o), res)); let json = null; try { json = res.body ? JSON.parse(res.body) : null; } catch (e) { json = 'not json'; } return { res, json, status:res.statusCode, h:res.headers }; };
const { makeHandler } = require(path.join(svc, 'api/import.js'));
const NAMES = { 'www.pitchero.com':'151.101.2.10', 'www.riversiderfc.example.com':'151.101.2.11', 'aldervale.example.org':['2a00:1450:4009:81f::200e', '151.101.2.12'] };
const PEOPLE = ['testplayer', 'tinyplayer', 'plantedname', 'coachperson', 'fakename', 'byline', 'madeup', 'notreal', 'statsname', 'organiserperson', 'soloathlete', 'taylor p', 'j smith', 'joe s',
  '07700', '@', '.jpg', '.png', 'captain', 'coach', 'secretary', 'logo', 'fakeperson', 'plantedkid', 'notachild', 'inventedname', 'madeupname', 'testsurname', 'pretendperson', 'imaginaryname'];
const ROW = ['name', 'played', 'won', 'drawn', 'lost', 'points', 'kit', 'trim', 'own'];
const shaped = d => Object.keys(d).every(k => ['source', 'club', 'teams', 'league', 'label', 'level'].includes(k)) && (!d.club || Object.keys(d.club).join() === 'name,kit,trim') &&
  d.teams.every(t => Object.keys(t).join() === 'name,kit,trim') && d.league.every(r => Object.keys(r).every(k => ROW.includes(k)));
{
  // a Pitchero club page: the page, its 1st XV's league table (no table there yet) and then its fixtures, five seconds apart
  const net = stubNet({ names:NAMES, sites:{ 'www.pitchero.com/clubs/bracknell':{ body:fx('pitchero-home') }, 'www.pitchero.com/clubs/bracknell/teams/3100/league-table':{ body:fx('pitchero-minis-empty') },
    'www.pitchero.com/clubs/bracknell/teams/3100/fixtures-results':{ body:fx('pitchero-fixtures') } } });
  const slept = [], h = makeHandler({ https:net.https, dns:net.dns, sleep:ms => { slept.push(ms); } });
  const r = await call(h, { body:'Our club: ' + PIT + '?utm_source=whatsapp#top see you Sunday' });
  ok(r.status === 200 && r.json.ok && r.json.requests === 3 && net.log.requests.length === 3, `a Pitchero club page: three requests (${r.status} ${JSON.stringify(r.json).slice(0, 120)})`);
  ok(net.log.served.map(s => s.key).join() === ['www.pitchero.com/clubs/bracknell', 'www.pitchero.com/clubs/bracknell/teams/3100/league-table', 'www.pitchero.com/clubs/bracknell/teams/3100/fixtures-results'].join(), 'the pasted page cleaned, its league table, then its fixtures');
  ok(slept.join() === '5000,5000', `Pitchero's five seconds between requests (${slept})`);
  ok(r.json.data.club.name === 'Bracknell RFC' && r.json.data.club.kit === '#399913' && r.json.data.teams.map(t => t.name).join() === 'Hornets RFC,Farnham,Sevenoaks', 'the club from the first page, the opponents from the third');
  ok(shaped(r.json.data) && Object.keys(r.json).join() === 'ok,data,requests', 'only names, colours and table numbers, and nothing else in the answer');
  ok(!r.res.body.includes('pitchero.com') && !r.res.body.includes('utm_source') && !/<|script|__NEXT_DATA__/.test(r.res.body), 'never the link, nor any of the page');
  ok(net.log.requests.every(o => o.method === 'GET' && o.port === 443 && o.protocol === 'https:' && o.agent === false && typeof o.lookup === 'function' && Object.keys(o.headers).join() === 'User-Agent,Accept' && o.headers['User-Agent'] === 'TryLineRugby' && o.servername === o.hostname),
    'every request: GET, https on 443, its own connection through the address check, and only a TryLineRugby User-Agent and Accept (no cookie, no authorisation, no Referer)');
  ok(r.h['cache-control'] === 'no-store' && r.h['access-control-allow-origin'] === ORIGIN && r.h.vary === 'Origin' && /^application\/json/.test(r.h['content-type']), 'no-store, the game\'s own origin allowed by name, Vary: Origin');

  const two = stubNet({ names:NAMES, sites:{ 'www.pitchero.com/clubs/bracknell':{ body:fx('pitchero-home') }, 'www.pitchero.com/clubs/bracknell/teams/3100/league-table':{ body:fx('pitchero-league') } } });
  const r2 = await call(makeHandler({ https:two.https, dns:two.dns, sleep:() => {} }), { body:PIT });
  ok(r2.json.ok && r2.json.requests === 2 && r2.json.data.league.map(x => x.name).join() === 'Sevenoaks,Tunbridge Wells,London Scottish Lions,Wimbledon,Farnham,Bracknell' && r2.json.data.league.find(x => x.own).name === 'Bracknell', 'a club home and its table: two requests, the table in order with the club\'s own row');
  ok(r2.json.data.level === undefined || typeof r2.json.data.level === 'string', 'a level is only ever an id');

  // a tournament page on its own site
  const gen = stubNet({ names:NAMES, sites:{ 'www.riversiderfc.example.com/spring-cup':{ body:fx('generic-tournament') } } });
  const r3 = await call(makeHandler({ https:gen.https, dns:gen.dns, sleep:() => {} }), { body:'https://www.riversiderfc.example.com/spring-cup' });
  ok(r3.json.ok && r3.json.data.source === 'generic' && r3.json.data.club.name === 'Riverside RFC' && r3.json.data.league.map(x => x.name).join() === 'Hillside Hawks,Riverside U16,Kingsmead Rugby Football Club,Valley Vipers', `a tournament page: the club and its pool (${JSON.stringify(r3.json.data.league.map(x => x.name))})`);
  ok(JSON.stringify(r3.json.data) === JSON.stringify(I.parse(fx('generic-tournament'), 'https://www.riversiderfc.example.com/spring-cup')), 'what the service answers is what the game itself reads from that page');

  // people: never in the answer
  for (const [f, u] of [['pitchero-safeguarding', PIT + '/teams/3100/league-table'], ['generic-people', 'https://club.example.org/team/zara-fakeperson'], ['generic-next', 'https://aldervale.example.org/']]) {
    const host = new URL(u).hostname, n = stubNet({ names:{ ...NAMES, [host]:'151.101.2.13' }, sites:{ [host + new URL(u).pathname]:{ body:fx(f) } } });
    const rr = await call(makeHandler({ https:n.https, dns:n.dns, sleep:() => {} }), { body:u });
    const text = rr.res.body.toLowerCase();
    ok(rr.json && (rr.json.ok ? shaped(rr.json.data) : rr.json.error === 'empty'), `${f}: an answer of the allowed shape (${rr.res.body.slice(0, 80)})`);
    for (const p of PEOPLE) ok(!text.includes(p), `${f}: "${p}" never leaves the service`);
  }
  ok(spoken.length === 0, `the service wrote nothing to the console (${spoken.length})`);
}
{
  // method, body and link rules, each refused before any fetch
  const net = stubNet({ names:NAMES });
  const h = makeHandler({ https:net.https, dns:net.dns, sleep:() => {} });
  const health = await call(h, { method:'GET', url:'/api/import?health=1', origin:null, type:null });
  ok(health.status === 200 && JSON.stringify(health.json) === '{"ok":true}' && health.h['cache-control'] === 'no-store' && !health.h['access-control-allow-origin'], 'GET ?health=1 is {"ok":true}, no-store');
  for (const url of ['/api/import', '/api/import?health=1&url=x', '/api/import?url=' + encodeURIComponent(PIT), '/api/import?health=2']) { const g = await call(h, { method:'GET', url }); ok(g.status === 405 && g.json.ok === false && g.h.allow === 'GET, POST, OPTIONS', `nothing else on GET: ${url} is 405`); }
  for (const m of ['PUT', 'DELETE', 'PATCH', 'HEAD', 'TRACE', 'CONNECT']) { const x = await call(h, { method:m, body:PIT }); ok(x.status === 405 && x.h['cache-control'] === 'no-store', `${m} is 405`); }
  const pre = await call(h, { method:'OPTIONS', type:null });
  ok(pre.status === 204 && pre.res.body === '' && pre.h['access-control-allow-origin'] === ORIGIN && /POST/.test(pre.h['access-control-allow-methods']) && pre.h['access-control-allow-headers'] === 'Content-Type', 'OPTIONS from the game\'s page: 204 and the CORS headers');
  const pre2 = await call(h, { method:'OPTIONS', origin:'https://evil.example.net', type:null });
  ok(pre2.status === 403 && !pre2.h['access-control-allow-origin'], 'OPTIONS from anywhere else: 403, no CORS header');
  const big = await call(h, { body:PIT + '?x=' + 'a'.repeat(4100) });
  ok(big.status === 413 && big.json.error === 'url', 'a body over 4KB is 413');
  const bigHelper = await call(h, { helperBody:'x'.repeat(5000) });
  ok(bigHelper.status === 413, 'and so is one Vercel\'s helpers have already read');
  const helper = await call(h, { helperBody:'javascript:alert(1)' });
  ok(helper.status === 400 && helper.json.error === 'url', 'a body Vercel\'s helpers read is checked the same way');
  for (const [i, bad] of ['', 'javascript:alert(1)', 'http://127.0.0.1/', 'https://10.0.0.1/table', 'https://localhost/x', 'file:///etc/passwd', 'https://printer.local/', 'not a link', 'https://user:pw@example.com/'].entries()) {
    const x = await call(h, { body:bad, ip:'203.0.113.' + (100 + i) });
    ok(x.status === 400 && JSON.stringify(x.json) === '{"ok":false,"error":"url"}', `${JSON.stringify(bad)} is a bad link`);
  }
  const json = await call(h, { body:JSON.stringify({ url:PIT }), type:'application/json', ip:'203.0.113.51' });
  ok(json.status === 415 && json.json.error === 'url', 'only a text/plain body is read');
  for (const [origin, what] of [['https://evil.example.net', 'another site'], [null, 'no Origin'], ['null', 'a sandboxed page'], ['https://gordonlindsay.github.io.evil.example', 'a look-alike'], ['http://gordonlindsay.github.io', 'plain http'], ['http://127.0.0.1:8880', 'a local page (no test origin set)']]) {
    const x = await call(h, { origin, body:PIT, ip:'203.0.113.52' });
    ok(x.status === 403 && !x.h['access-control-allow-origin'] && x.h['cache-control'] === 'no-store', `${what}: 403, no CORS header`);
  }
  ok(net.log.requests.length === 0, `none of these fetched anything (${net.log.requests.length})`);

  // the test origin: only from TRYLINE_IMPORT_TEST_ORIGIN, only a 127.0.0.1 address, only for a handler made while it is set
  for (const [v, opens] of [['http://127.0.0.1:8880', true], ['https://evil.example.net', false], ['http://127.0.0.1.evil.example:80', false], ['http://localhost:8880', false]]) {
    process.env.TRYLINE_IMPORT_TEST_ORIGIN = v;
    const t = makeHandler({ https:net.https, dns:net.dns, sleep:() => {} });
    delete process.env.TRYLINE_IMPORT_TEST_ORIGIN;
    const x = await call(t, { method:'OPTIONS', origin:v, type:null });
    ok((x.status === 204) === opens && (x.h['access-control-allow-origin'] === v) === opens, `TRYLINE_IMPORT_TEST_ORIGIN=${v} ${opens ? 'opens the service to that local page' : 'is ignored'}`);
  }
  const later = await call(h, { method:'OPTIONS', origin:'http://127.0.0.1:8880', type:null });
  ok(later.status === 403, 'and a handler made without it never allows a local page');

  // too many: six imports a minute a caller, then busy
  const rate = stubNet({ names:NAMES, sites:{ 'www.pitchero.com/clubs/bracknell/teams/3100/league-table':{ body:fx('pitchero-league') } } });
  let clock = 1e6;
  const hr = makeHandler({ https:rate.https, dns:rate.dns, sleep:() => {}, now:() => clock });
  const runs = [];
  for (let i = 0; i < 7; i++) runs.push(await call(hr, { body:PIT + '/teams/3100/league-table', ip:'203.0.113.60' }));
  ok(runs.slice(0, 6).every(x => x.status === 200 && x.json.ok) && runs[6].status === 429 && JSON.stringify(runs[6].json) === '{"ok":false,"error":"busy"}' && runs[6].h['retry-after'] === '60' && runs[6].h['access-control-allow-origin'] === ORIGIN, 'six imports a minute, then 429 busy (with the CORS header, so the game can say so)');
  ok(rate.log.requests.length === 6, 'the seventh fetched nothing');
  ok((await call(hr, { body:PIT + '/teams/3100/league-table', ip:'203.0.113.61' })).status === 200, 'another caller is not held up');
  ok((await call(hr, { body:PIT + '/teams/3100/league-table', ip:'203.0.113.60', headers:{ 'x-forwarded-for':'198.51.100.99' } })).status === 429, 'Vercel\'s x-real-ip is the caller, whatever x-forwarded-for says');
  clock += 61000;
  ok((await call(hr, { body:PIT + '/teams/3100/league-table', ip:'203.0.113.60' })).status === 200, 'a minute later it may import again');
  // who the caller is: Vercel's own headers, never x-forwarded-for, and an IPv6 caller by its /64
  ok(S.caller({ headers:{ 'x-vercel-forwarded-for':'198.51.100.7', 'x-real-ip':'203.0.113.9', 'x-forwarded-for':'192.0.2.1' } }) === '198.51.100.7' && S.caller({ headers:{ 'x-real-ip':'203.0.113.9', 'x-forwarded-for':'192.0.2.1' } }) === '203.0.113.9'
    && S.caller({ headers:{ 'x-forwarded-for':'192.0.2.1' }, socket:{ remoteAddress:'10.1.1.1' } }) === '10.1.1.1', 'the caller: x-vercel-forwarded-for, else x-real-ip, else the socket; never x-forwarded-for');
  ok(S.caller({ headers:{ 'x-real-ip':'2a00:1450:4009:81f::200e' } }) === '2a00:1450:4009:81f::/64' && S.caller({ headers:{ 'x-real-ip':'2a00:1450:4009:081f:ffff:1:2:3' } }) === '2a00:1450:4009:81f::/64' && S.caller({ headers:{ 'x-real-ip':'::ffff:198.51.100.7' } }) === '198.51.100.7', 'an IPv6 caller is its /64; an IPv4 address inside IPv6 is that address');
  clock += 61000;
  const v6 = [];
  for (let i = 0; i < 8; i++) v6.push((await call(hr, { body:PIT + '/teams/3100/league-table', ip:`2a00:1450:4009:81f:${(i * 4099 + 1).toString(16)}:${i + 7}::${i + 1}` })).status);
  ok(v6.slice(0, 6).every(x => x === 200) && v6.slice(6).every(x => x === 429), `walking the addresses of one IPv6 /64 is one caller: six, then busy (${v6})`);
  ok((await call(hr, { body:PIT + '/teams/3100/league-table', ip:'2a00:1450:4009:820::1' })).status === 200, 'the next /64 is another caller');
  const spoof = [];
  for (let i = 0; i < 8; i++) spoof.push((await call(hr, { body:PIT + '/teams/3100/league-table', ip:null, headers:{ 'x-forwarded-for':`198.51.100.${i + 10}` } })).status);
  ok(spoof.slice(0, 6).every(x => x === 200) && spoof.slice(6).every(x => x === 429), `with no Vercel header, an x-forwarded-for the client wrote changes nothing: one socket, one caller (${spoof})`);
  const vf = [];
  for (let i = 0; i < 7; i++) vf.push((await call(hr, { body:PIT + '/teams/3100/league-table', ip:`203.0.113.${120 + i}`, headers:{ 'x-vercel-forwarded-for':'198.51.100.200' } })).status);
  ok(vf.slice(0, 6).every(x => x === 200) && vf[6] === 429, `x-vercel-forwarded-for is the caller, whatever x-real-ip says (${vf})`);
  // at once: IMPORT_RATE.busy imports, counted as each is let in, before its body is read, so callers arriving together cannot all pass
  const slow = stubNet({ names:NAMES, sites:{ 'www.pitchero.com/clubs/bracknell/teams/3100/league-table':{ hang:true } } });
  const hc = makeHandler({ https:slow.https, dns:slow.dns, sleep:() => {}, timeout:150 });
  const crowd = await Promise.all(Array.from({ length:S.IMPORT_RATE.busy + 5 }, (_, i) => call(hc, { body:PIT + '/teams/3100/league-table', ip:`203.0.${i}.1` })));
  const busy = crowd.filter(x => x.status === 429).length;
  ok(busy === 5 && crowd.filter(x => x.status === 504).length === S.IMPORT_RATE.busy && slow.log.requests.length === S.IMPORT_RATE.busy, `${S.IMPORT_RATE.busy + 5} at once, bodies still streaming: ${S.IMPORT_RATE.busy} run, 5 are busy (${busy}), and only ${S.IMPORT_RATE.busy} reach the page (${slow.log.requests.length})`);
  ok(hc.running() === 0, `and every place is given back once they end (${hc.running()})`);
  const refusedKinds = [{ body:'javascript:alert(1)' }, { body:'x'.repeat(5000) }, { body:PIT, type:'application/json' }];
  for (let i = 0; i < S.IMPORT_RATE.busy + 3; i++) await call(hc, { ...refusedKinds[i % 3], ip:`203.0.114.${i}` });
  ok(hc.running() === 0 && (await call(hc, { body:'https://www.pitchero.com/clubs/bracknell/teams/3100/league-table', ip:'203.0.115.1' })).status === 504, 'a bad link, a body too big or the wrong type gives its place back too: none is left counted');
  const svcText = read('import-service/lib/service.cjs') + read('import-service/api/import.js');
  ok(!/console\.|process\.stdout|process\.stderr/.test(svcText.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')) && spoken.length === 0, 'the service has no console call, and made none');
  ok(!/\bfetch\(|undici/.test(svcText.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')), 'node:https only: no fetch, no undici');
}
{
  // private addresses: a public-looking name that resolves to one, an answer with one among public ones, and a redirect to one
  for (const addr of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '::1', '::ffff:10.0.0.1', '192.168.0.10', '172.20.1.1', '100.100.100.200', 'fd00:ec2::254', 'fe80::1', '0.0.0.0', '::']) {
    const net = stubNet({ names:{ 'www.rebind-rfc.co.uk':addr }, sites:{ 'www.rebind-rfc.co.uk/':{ body:fx('pitchero-league') } } });
    const x = await call(makeHandler({ https:net.https, dns:net.dns, sleep:() => {} }), { body:'https://www.rebind-rfc.co.uk/', ip:'203.0.113.70' });
    ok(x.status === 502 && JSON.stringify(x.json) === '{"ok":false,"error":"net"}' && net.log.served.length === 0, `a name resolving to ${addr} is never connected to`);
  }
  const mixed = stubNet({ names:{ 'www.rebind-rfc.co.uk':['151.101.2.10', '10.0.0.1'] }, sites:{ 'www.rebind-rfc.co.uk/':{ body:fx('pitchero-league') } } });
  ok((await call(makeHandler({ https:mixed.https, dns:mixed.dns, sleep:() => {} }), { body:'https://www.rebind-rfc.co.uk/', ip:'203.0.113.71' })).json.error === 'net' && mixed.log.served.length === 0, 'an answer with a private address among public ones is refused whole');
  for (const [to, what] of [['https://metadata.rebind-rfc.co.uk/latest/', 'a name that resolves to the metadata address'], ['http://169.254.169.254/latest/meta-data/', 'the metadata address itself'], ['https://[::1]/', 'IPv6 loopback'], ['https://10.0.0.1/', 'a private address'], ['https://localhost/', 'localhost']]) {
    const net = stubNet({ names:{ 'www.redirect-rfc.co.uk':'151.101.2.20', 'metadata.rebind-rfc.co.uk':'169.254.169.254' }, sites:{ 'www.redirect-rfc.co.uk/':{ status:302, headers:{ location:to } }, 'metadata.rebind-rfc.co.uk/latest/':{ body:'<title>Secret RFC</title>' } } });
    const x = await call(makeHandler({ https:net.https, dns:net.dns, sleep:() => {} }), { body:'https://www.redirect-rfc.co.uk/', ip:'203.0.113.72' });
    ok(x.json.error === 'net' && net.log.served.map(s => s.key).join() === 'www.redirect-rfc.co.uk/', `a redirect to ${what} is never followed there (${net.log.served.map(s => s.key)})`);
  }
  // the real node:https, its DNS a stub answering 127.0.0.1 and 169.254.169.254: node asks the service's lookup, which refuses, so no
  // connection is ever opened (nothing here leaves the machine)
  for (const addr of ['127.0.0.1', '169.254.169.254', '::ffff:10.0.0.1']) {
    const asked = [];
    const real = makeHandler({ dns:{ resolve4:async h => { asked.push(h); if (addr.includes(':')) throw Object.assign(Error('no data'), { code:'ENODATA' }); return [addr]; }, resolve6:async h => { if (!addr.includes(':')) throw Object.assign(Error('no data'), { code:'ENODATA' }); return [addr]; } }, sleep:() => {} });
    const x = await call(real, { body:'https://www.rebind-rfc.co.uk/', ip:'203.0.113.73' });
    ok(x.json.error === 'net' && asked.join() === 'www.rebind-rfc.co.uk', `with node:https itself, a name resolving to ${addr} goes through the service's lookup and is refused`);
  }
  const lookup = S.safeLookup({ resolve4:async () => ['151.101.2.10'], resolve6:async () => ['2a00:1450:4009:81f::200e'] });
  const got = [], ask = (...a) => new Promise(r => lookup(a[0], ...(a.length > 2 ? [a[1]] : []), (...x) => { got.push(a[a.length - 1](...x)); r(); }));
  await ask('www.pitchero.com', { all:true }, (e, a) => JSON.stringify(a));
  await ask('www.pitchero.com', { family:6 }, (e, a, f) => a + ' ' + f);
  await ask('www.pitchero.com', (e, a, f) => a + ' ' + f);
  await ask('127.0.0.1', {}, e => e && e.code);
  ok(got.join('|') === '[{"address":"151.101.2.10","family":4},{"address":"2a00:1450:4009:81f::200e","family":6}]|2a00:1450:4009:81f::200e 6|151.101.2.10 4|EREFUSED', `the lookup answers as node:https asks, and never for an address given as the name (${got.join(' | ')})`);
  // names are resolved on c-ares (a Resolver: 3 seconds, one try), never dns.lookup's getaddrinfo on libuv's four pool threads, where a slow DNS server could stall every import
  const dnsMod = require('node:dns'), libText = read('import-service/lib/service.cjs').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  ok(S.resolver() instanceof dnsMod.promises.Resolver && S.DNS_TIMEOUT === 3000 && /new \(require\('node:dns'\)\.promises\.Resolver\)\(\{ timeout:DNS_TIMEOUT, tries:1 \}\)/.test(libText) && !/\.lookup\(|lookupService|getaddrinfo/.test(libText), 'DNS is a c-ares Resolver with a 3-second timeout and one try; dns.lookup is never called');
  const kept = dnsMod.lookup; let pooled = 0;
  dnsMod.lookup = (...a) => { pooled++; return kept(...a); };
  try {
    const only4 = await new Promise(r => S.safeLookup({ resolve4:async () => ['151.101.2.10'], resolve6:async () => { throw Object.assign(Error('t'), { code:'ETIMEOUT' }); } })('www.pitchero.com', { all:true }, (e, a) => r(e ? e.code : JSON.stringify(a))));
    ok(only4 === '[{"address":"151.101.2.10","family":4}]', `no AAAA answer (or a slow one): the A records stand (${only4})`);
    const neither = await new Promise(r => S.safeLookup({ resolve4:async () => { throw Object.assign(Error('t'), { code:'ETIMEOUT' }); }, resolve6:async () => { throw Object.assign(Error('t'), { code:'ENODATA' }); } })('www.pitchero.com', {}, e => r(e && e.code)));
    ok(neither === 'ETIMEOUT', 'neither family answering is the lookup\'s error');
    const mixed6 = await new Promise(r => S.safeLookup({ resolve4:async () => ['151.101.2.10'], resolve6:async () => ['fd00:ec2::254'] })('www.pitchero.com', { family:4 }, e => r(e && e.code)));
    ok(mixed6 === 'EREFUSED', 'a private AAAA answer refuses the name whole, even when only IPv4 is asked for');
    const hung = stubNet({ names:NAMES, sites:{ 'www.pitchero.com/clubs/bracknell/teams/3100/league-table':{ body:fx('pitchero-league') } } });
    hung.dns.resolve4 = hung.dns.resolve6 = () => new Promise(() => {});
    const hx = await call(makeHandler({ https:hung.https, dns:hung.dns, sleep:() => {}, timeout:80 }), { body:PIT + '/teams/3100/league-table', ip:'203.0.113.74' });
    ok(hx.status === 504 && hx.json.error === 'timeout' && hung.log.served.length === 0, 'a DNS server that never answers is the request\'s timeout, nothing connected');
  } finally { dnsMod.lookup = kept; }
  ok(pooled === 0, `node's dns.lookup was never called (${pooled})`);
}
{
  // what a page may be, and how long it may take
  const page = (site, o = {}) => { const net = stubNet({ names:NAMES, sites:{ 'www.pitchero.com/clubs/bracknell/teams/3100/league-table':site } }); return { net, run:() => call(makeHandler({ https:net.https, dns:net.dns, sleep:() => {}, ...o }), { body:PIT + '/teams/3100/league-table', ip:'203.0.113.80' }) }; };
  for (const type of ['image/png', 'application/octet-stream', 'application/pdf', 'video/mp4', '']) {
    const p = page({ body:fx('pitchero-league'), type });
    const x = await p.run();
    ok(x.status === 502 && x.json.error === 'net', `a page served as ${type || 'nothing'} is refused`);
  }
  const zipped = await page({ body:fx('pitchero-league'), headers:{ 'content-encoding':'gzip' } }).run();
  ok(zipped.json.error === 'net', 'and so is one with a content encoding nobody asked for');
  const json = await page({ type:'application/json', body:JSON.stringify({ standings:[{ teamName:'Ash Grove', w:2, l:0, pts:8 }, { teamName:'Birch Lane', w:0, l:2, pts:0 }] }) }).run();
  ok(json.json.ok && json.json.data.league.map(r => r.name).join() === 'Ash Grove,Birch Lane', 'a JSON answer is read, as in the app');
  const huge = page({ body:fx('pitchero-league') + ' '.repeat(5000000), chunk:1 << 20 });
  const hx = await huge.run();
  await new Promise(r => setTimeout(r, 20));               // the stub's next write finds the connection closed
  ok(hx.json.ok && hx.json.data.league.length === 6 && huge.net.log.cut && huge.net.log.written < 4000000 + (1 << 20) + 1, `a page over the limit is read to IMPORT_MAX_HTML and the connection closed (${huge.net.log.written} of ${fx('pitchero-league').length + 5000000} sent)`);
  const hang = await page({ hang:true }, { timeout:60 }).run();
  ok(hang.status === 504 && JSON.stringify(hang.json) === '{"ok":false,"error":"timeout"}', 'a page that never answers is a timeout');
  const slow = await page({ body:fx('pitchero-league'), delay:400 }, { budget:150, floor:20 }).run();
  ok(slow.status === 504 && slow.json.error === 'timeout', 'and the whole import has its budget (45 seconds, here 150ms)');
  const spent = await page({ body:fx('pitchero-league') }, { budget:1000 }).run();
  ok(spent.status === 504 && spent.json.error === 'timeout', 'with too little of it left no request starts');
  // a club home read, its table slow to come: the budget runs out on the second request and the first page stands
  const late = stubNet({ names:NAMES, sites:{ 'www.pitchero.com/clubs/bracknell':{ body:fx('pitchero-home') }, 'www.pitchero.com/clubs/bracknell/teams/3100/league-table':{ body:fx('pitchero-league'), hang:true } } });
  const lx = await call(makeHandler({ https:late.https, dns:late.dns, sleep:() => {}, budget:400, floor:20 }), { body:PIT, ip:'203.0.113.82' });
  ok(lx.status === 200 && lx.json.ok && lx.json.data.club.name === 'Bracknell RFC' && !lx.json.data.league.length, `out of time on a later page, the first page's club stands (${lx.res.body.slice(0, 80)})`);
  const gone = await page({ status:404, body:'' }).run();
  ok(gone.status === 502 && gone.json.error === 'net', 'a missing page is a failed import');
  const empty = stubNet({ names:{ 'blank.example.org':'151.101.2.30' }, sites:{ 'blank.example.org/':{ body:fx('generic-empty') } } });
  const ex = await call(makeHandler({ https:empty.https, dns:empty.dns, sleep:() => {} }), { body:'https://blank.example.org/', ip:'203.0.113.81' });
  ok(ex.status === 422 && JSON.stringify(ex.json) === '{"ok":false,"error":"empty"}', 'a page with nothing on it is empty');
  ok(spoken.length === 0, 'and still nothing on the console');
}

// 4. the service worker leaves the POST alone, and nothing of the service is precached or copied into the app
{
  ok(!shellAssets.some(a => /import-service|import-core/.test(a)) && !assembleWorker().worker.includes('import-service'), 'no file of the service is a shell asset: never precached, never copied into the app (app/scripts/copy-www.mjs copies shellAssets)');
  const scope = 'https://gordonlindsay.github.io/games/trylinerugby/', events = {};
  vm.runInNewContext(assembleWorker().worker, { self:{ registration:{ scope }, addEventListener:(n, fn) => { events[n] = fn; }, clients:{ matchAll:async () => [] } }, caches:{}, URL, Set, Request, Response, crypto:globalThis.crypto, fetch:() => { throw Error('fetched'); } });
  for (const [url, method] of [[I.SERVICE, 'POST'], [I.SERVICE, 'OPTIONS'], [I.SERVICE + '?health=1', 'GET'], [scope + 'import-service/api/import.js', 'GET'], [scope + 'import-service/lib/import-core.cjs', 'GET']]) {
    let answered = false;
    events.fetch({ request:{ url, method, mode:'cors' }, respondWith:() => { answered = true; } });
    ok(!answered, `the service worker leaves ${method} ${url.replace(scope, '')} to the network`);
  }
  ok(I.SERVICE === 'https://tryline-import.vercel.app/api/import' && I.serviceUrl() === I.SERVICE, 'the game posts to the service\'s production address');
}

// 5. its Vercel set-up and its words
{
  const vj = JSON.parse(read('import-service/vercel.json')), pkg = JSON.parse(read('import-service/package.json'));
  ok(vj.functions['api/import.js'].maxDuration === 60 && JSON.stringify(vj.regions) === '["lhr1"]' && vj.ignoreCommand === 'if [ -z "$VERCEL_GIT_PREVIOUS_SHA" ]; then exit 1; fi; git diff --quiet "$VERCEL_GIT_PREVIOUS_SHA" HEAD -- .', 'vercel.json: 60 seconds, London, and no deploy unless this folder changed since the last one');
  // the ignoreCommand, run as Vercel runs it (in the root directory; exit 0 skips the build), in a scratch repository: it compares with the last
  // deployed commit, so a change in an earlier commit of a push still deploys, the first deploy always builds, and an unknown commit builds
  {
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tryline-ignore-')), git = (...a) => execFileSync('git', ['-c', 'user.email=t@t.invalid', '-c', 'user.name=t', ...a], { cwd:scratch, stdio:['ignore', 'pipe', 'ignore'] }).toString().trim();
    try {
      git('init', '-q'); fs.mkdirSync(path.join(scratch, 'svc')); fs.writeFileSync(path.join(scratch, 'svc/a'), '1'); git('add', '.'); git('commit', '-qm', 'one');
      const deployed = git('rev-parse', 'HEAD');
      const skip = sha => { try { execFileSync('sh', ['-c', vj.ignoreCommand], { cwd:path.join(scratch, 'svc'), env:{ ...process.env, VERCEL_GIT_PREVIOUS_SHA:sha }, stdio:'ignore' }); return true; } catch (e) { return false; } };
      fs.writeFileSync(path.join(scratch, 'b'), '1'); git('add', '.'); git('commit', '-qm', 'elsewhere');
      ok(skip(deployed), 'ignoreCommand: a push that leaves the folder alone is skipped');
      ok(!skip(''), 'ignoreCommand: the first deploy (no previous commit) always builds');
      fs.writeFileSync(path.join(scratch, 'svc/a'), '2'); git('commit', '-qam', 'the service'); fs.writeFileSync(path.join(scratch, 'b'), '2'); git('commit', '-qam', 'elsewhere again');
      ok(!skip(deployed), 'ignoreCommand: a push whose change to the folder is not in its last commit still deploys');
      ok(!skip('0123456789abcdef0123456789abcdef01234567'), 'ignoreCommand: a last deploy it cannot find (a shallow clone) builds');
    } finally { fs.rmSync(scratch, { recursive:true, force:true }); }
  }
  ok(S.BUDGET === 45000 && S.BUDGET < vj.functions['api/import.js'].maxDuration * 1000 && S.MAX_BODY === 4096, 'a 45-second budget, under the function\'s 60; 4KB of body');
  ok(!pkg.dependencies && !pkg.devDependencies && pkg.engines.node === '22.x' && pkg.type === 'commonjs', 'package.json: Node 22, no dependencies');
  const api = read('import-service/api/import.js'), lib = read('import-service/lib/service.cjs');
  ok(/require\('\.\.\/lib\/service\.cjs'\)/.test(api) && /require\('\.\/import-core\.cjs'\)/.test(lib) && !/require\((?!'(?:node:[a-z]+|\.\.\/lib\/service\.cjs|\.\/import-core\.cjs)')/.test(api + lib), 'it requires only node: modules and its own lib/, by fixed relative paths Vercel bundles');
  const readme = read('import-service/README.md');
  ok(['tryline-import', 'trylinerugby/import-service', 'Add New Project', 'Root Directory', '?health=1', 'lhr1', '45', 'TRYLINE_IMPORT_TEST_ORIGIN', 'Firewall', 'Vercel Authentication', 'per import', 'does nothing against a script', 'VERCEL_GIT_PREVIOUS_SHA', 'non-commercial'].every(w => readme.includes(w)), 'its README says what it is, its limits and how the owner sets it up and checks it');
  for (const [f, t] of [['README.md', readme], ['service.cjs', lib], ['api/import.js', api], ['vercel.json', read('import-service/vercel.json')], ['src/import.js', read('src/import.js')], ['src/import-core.js', read('src/import-core.js')]]) ok(!DASH.test(t), `${f}: no em dash or arrow`);
}

// 6. In Chromium, by touch: the web build at 127.0.0.1:8880 (or the next free port) imports through a copy of the handler
//    on the next port, its network the stub above serving the fixtures, at 844x390 and 667x375: Add Your Team, the grown-up
//    check, Paste, Import, Importing, the preview, Save League, then My League on the team screen
function chromium() {
  for (const from of [() => require('playwright'), () => require(path.join(execFileSync('npm', ['root', '-g'], { stdio:['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright'))]) {
    try { return from().chromium; } catch (e) { /* not here */ }
  }
  return null;
}
const listen = (server, port) => new Promise(r => { server.once('error', () => r(false)); server.listen(port, '127.0.0.1', () => r(true)); });
async function browserChecks() {
  if (process.env.NO_BROWSER) { console.log('skip the browser checks (NO_BROWSER set)'); return; }
  const chrome = chromium();
  if (!chrome) { console.log('skip the browser checks: Playwright is not installed'); return; }
  let browser;
  try { browser = await chrome.launch(); } catch (e) { console.log('skip the browser checks: Chromium would not start (' + e.message.split('\n')[0] + ')'); return; }
  const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.webmanifest':'application/manifest+json', '.json':'application/json', '.m4a':'audio/mp4' };
  const game = http.createServer((req, res) => {
    const file = path.resolve(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type':TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  let gamePort = 0;
  for (let p = 8880; p <= 8888 && !gamePort; p += 2) if (await listen(game, p)) gamePort = p;
  if (!gamePort) { await browser.close(); throw Error('no free pair of ports in 8880-8889 for the browser run'); }
  const servicePort = gamePort + 1, origin = `http://127.0.0.1:${gamePort}`;
  const net = stubNet({ names:NAMES, sites:{ 'www.pitchero.com/clubs/bracknell':{ body:fx('pitchero-home'), delay:1500 }, 'www.pitchero.com/clubs/bracknell/teams/3100/league-table':{ body:fx('pitchero-league'), delay:500 } } });
  process.env.TRYLINE_IMPORT_TEST_ORIGIN = origin;          // this copy of the handler only: read as it is made, then gone
  const handler = makeHandler({ https:net.https, dns:net.dns, sleep:ms => new Promise(r => setTimeout(r, Math.min(ms, 300))) });
  delete process.env.TRYLINE_IMPORT_TEST_ORIGIN;
  const posts = [];
  const service = http.createServer((req, res) => {
    if (new URL(req.url, 'http://x').pathname !== '/api/import') { res.writeHead(404); res.end(); return; }
    posts.push({ method:req.method, type:req.headers['content-type'] || '', referer:req.headers.referer || '', cookie:req.headers.cookie || '', origin:req.headers.origin || '' });
    quiet(() => handler(req, res));
  });
  if (!await listen(service, servicePort)) { game.close(); await browser.close(); throw Error(`port ${servicePort} is taken`); }
  const shots = process.env.SHOTS || '';
  if (shots) fs.mkdirSync(shots, { recursive:true });
  const SAVE = { settings:{ tut:['past', 'pass', 'tackle', 'block', 'scrum', 'lineout', 'goal', 'drop', 'maul'], coach:false, played:5, myClub:'my1', myNat:'ENG' }, profile:{ age:'adult', gender:'male', look:null },
    custom:[{ key:'my1', id:'BRK', name:'Bracknell RFC', kit:'#399913', trim:'#e4c200', pace:3, power:3, handling:3, kicking:3 }] };
  const LINK = PIT;
  try {
    for (const [w, h] of [[844, 390], [667, 375]]) {
      posts.length = 0;
      const ctx = await browser.newContext({ viewport:{ width:w, height:h }, hasTouch:true, isMobile:true, serviceWorkers:'block' });
      await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
      await ctx.addInitScript(v => { try { localStorage.setItem('tryline.v1', v); } catch (e) { /* none */ } }, JSON.stringify(SAVE));
      const page = await ctx.newPage(), errors = [], outside = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', r => { const u = new URL(r.url()); if (u.hostname !== '127.0.0.1') outside.push(r.url()); });
      await page.goto(origin + '/index.html');
      await page.waitForFunction(() => window.__tryline && !document.getElementById('s-home').hidden);
      await page.evaluate(() => document.fonts && document.fonts.ready);
      await page.evaluate(u => window.__tryline.importer.setService(u), `http://127.0.0.1:${servicePort}/api/import`);
      const shot = async name => { if (shots) await page.screenshot({ path:path.join(shots, `webimport-${name}-${w}x${h}.png`) }); };
      const text = id => page.evaluate(i => document.getElementById(i).textContent, id);
      const shown = id => page.evaluate(i => { const e = document.getElementById(i); return !!e && !e.hidden && !e.closest('[hidden]') && e.getBoundingClientRect().width > 0; }, id);
      const size = id => page.evaluate(i => { const r = document.getElementById(i).getBoundingClientRect(); return [r.width, r.height, r.left, r.right]; }, id);
      await page.tap('#b-set'); await page.tap('#ts-tab-team');   // 1.10: Add Your Team is on Team and Settings' Team tab, with My Team's other rows
      ok(await shown('b-import'), `${w}x${h}: the home offers Add Your Team on the web (Team and Settings' Team tab)`);
      await page.tap('#hs-back');
      // from the team screen, so the league it brings is there when the card closes: Game, Quick Match, your side's group, My League, Add Your Team
      await page.tap('#b-match'); await page.tap('#b-quick');
      await page.waitForFunction(() => !document.getElementById('s-teams').hidden);
      await page.locator('#s-teams .pk-group').first().tap();
      await page.waitForFunction(() => !document.getElementById('m-filter').hidden);
      await page.locator('#m-filter').getByText('My League', { exact:true }).first().tap();
      await page.locator('#m-filter').getByText('Add Your Team', { exact:true }).first().tap();
      if (await page.evaluate(() => document.getElementById('m-import').hidden)) {
        await page.waitForFunction(() => document.getElementById('m-filter').hidden && window.__tryline.picker.primary() === 'Add Your Team');
        await page.tap('#t-go');
      }
      await page.waitForFunction(() => !document.getElementById('m-import').hidden);
      ok(await shown('m-import') && await text('im-title') === 'Paste Your Link' && await shown('im-field') && !await shown('im-line') && await text('im-go') === 'Import' && await text('im-back') === 'Back to Teams', `${w}x${h}: the card asks for the link, not Works in the Try Line App`);
      await page.evaluate(t => navigator.clipboard.writeText(t), LINK);
      if (await shown('im-paste')) await page.tap('#im-paste'); else { await page.tap('#im-url'); await page.keyboard.type(LINK); }
      await page.waitForFunction(l => document.getElementById('im-url').value === l, LINK);
      for (const id of ['im-go', 'im-back']) { const [bw, bh, l, r] = await size(id); ok(bh >= 44 && l >= 0 && r <= w, `${w}x${h}: ${id} is a 44px target in the frame (${Math.round(bw)}x${Math.round(bh)})`); }
      await shot('link');
      await page.tap('#im-go');
      await page.waitForFunction(() => !document.getElementById('m-gate').hidden);
      ok(await page.evaluate(() => document.getElementById('m-import').hidden) && posts.length === 0, `${w}x${h}: the grown-up check first, the card out of its way, nothing sent`);
      const answer = await page.evaluate(() => window.__tryline.kids.gate().answer);
      for (const d of answer) await page.tap('#pg-k' + d);
      await page.waitForFunction(() => document.getElementById('im-go').textContent === 'Importing');
      ok(await page.evaluate(() => document.getElementById('im-go').disabled && document.getElementById('im-url').disabled) && await text('im-title') === 'Paste Your Link', `${w}x${h}: Importing while it waits`);
      await shot('busy');
      await page.waitForFunction(() => /^Save/.test(document.getElementById('im-go').textContent), null, { timeout:20000 });
      ok(await text('im-go') === 'Save League' && await text('im-title') === 'Bracknell RFC' && (await text('im-league')).includes('My League · 5 Teams') && await text('im-kept') === 'Bracknell RFC stays as you made it. This sets its league.', `${w}x${h}: the preview: your club kept, its league of five, Save League (${await text('im-go')}, ${await text('im-league')})`);
      ok(posts.length === 1 && posts[0].method === 'POST' && /^text\/plain/.test(posts[0].type) && posts[0].origin === origin && !posts[0].referer && !posts[0].cookie, `${w}x${h}: one POST to the service, text/plain, with no Referer and no cookie (${JSON.stringify(posts)})`);
      ok(net.log.served.slice(-2).map(s => s.key).join() === 'www.pitchero.com/clubs/bracknell,www.pitchero.com/clubs/bracknell/teams/3100/league-table' && outside.length === 0, `${w}x${h}: the service fetched the page and its table; the browser itself asked nothing of any other site (${outside.join(' ')})`);
      await shot('preview');
      await page.tap('#im-go');
      await page.waitForFunction(() => document.getElementById('m-import').hidden);
      const league = await page.evaluate(() => window.__tryline.importer.league() && window.__tryline.importer.league().teams.map(t => t.name).join());
      ok(league === 'Sevenoaks,Tunbridge Wells,London Scottish,Wimbledon,Farnham', `${w}x${h}: Save League keeps the league (${league})`);
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tryline.v1')));
      ok(saved.importLeague && saved.importLeague.teams.length === 5 && !JSON.stringify(saved).includes('pitchero.com'), `${w}x${h}: in the save, without the link`);
      await page.waitForTimeout(400);                       // the screen's own settle, for the picture
      const view = await page.evaluate(() => { const v = window.__tryline.picker.view(0); return { group:v.group.name, team:v.team && v.team.name }; });
      ok(!await page.evaluate(() => document.getElementById('s-teams').hidden) && view.group === 'My League' && view.team === 'Sevenoaks' && await page.evaluate(() => [...document.querySelectorAll('#s-teams .pk-group')].some(b => b.textContent.trim() === 'My League' && b.getBoundingClientRect().width > 0)), `${w}x${h}: the card closes on My League, on the side that asked (${JSON.stringify(view)})`);
      await shot('saved');
      ok(!errors.length, `${w}x${h}: no page errors (${errors.join(' | ')})`);
      await ctx.close();
    }
    // from the home at 844x390: Escape is the card's Back; a controller's ring goes down from Paste to Import; a device offline is told
    // so before the grown-up check; and a service that is not there says Import isn't working, not that the link is wrong
    {
      const [w, h] = [844, 390];
      const ctx = await browser.newContext({ viewport:{ width:w, height:h }, hasTouch:true, isMobile:true, serviceWorkers:'block' });
      await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
      await ctx.addInitScript(v => { try { localStorage.setItem('tryline.v1', v); } catch (e) { /* none */ } }, JSON.stringify(SAVE));
      const page = await ctx.newPage(), errors = [], outside = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', r => { const u = new URL(r.url()); if (u.hostname !== '127.0.0.1') outside.push(r.url()); });
      await page.goto(origin + '/index.html');
      await page.waitForFunction(() => window.__tryline && !document.getElementById('s-home').hidden);
      await page.evaluate(() => document.fonts && document.fonts.ready);
      const text = id => page.evaluate(i => document.getElementById(i).textContent, id);
      const hidden = id => page.evaluate(i => document.getElementById(i).hidden, id);
      await page.tap('#b-set'); await page.tap('#ts-tab-team');   // Add Your Team on the Team tab (1.10)
      await page.tap('#b-import');
      await page.waitForFunction(() => !document.getElementById('m-import').hidden);
      await page.keyboard.press('Escape');
      ok(await hidden('m-import') && !await hidden('s-home') && await hidden('m-pause'), 'Escape on the card is its Back: closed, home, nothing paused');
      await page.tap('#b-import');
      await page.waitForFunction(() => !document.getElementById('m-import').hidden);
      const ring = await page.evaluate(() => { const T = window.__tryline, id = el => (el && el.id) || ''; return [T.navMove(0, 0, 0), T.navMove(0, 0, 1), T.navMove(0, 1, 0), T.navMove(0, 0, -1), T.navMove(0, 0, 1), T.navMove(0, 0, -1)].map(id).join(); });
      ok(ring === 'im-paste,im-go,im-back,im-paste,im-go,im-paste', `a controller's ring: on Paste, down to Import, right to Back, up to Paste, and Paste to Import and back (${ring})`);
      await page.evaluate(t => navigator.clipboard.writeText(t), LINK);
      await page.tap('#im-paste');
      await page.waitForFunction(l => document.getElementById('im-url').value === l, LINK);
      await ctx.setOffline(true);
      await page.tap('#im-go');
      await page.waitForTimeout(150);
      ok(!await hidden('m-import') && await hidden('m-gate') && await text('im-err') === await page.evaluate(() => window.__tryline.importer.MSG.offline), 'offline: said on the card, before the grown-up check');
      await shot('offline');
      await ctx.setOffline(false);
      await page.evaluate(u => window.__tryline.importer.setService(u), `${origin}/api/import`);   // nothing answers there: the game's own server's 404, with no CORS header
      await page.tap('#im-go');
      await page.waitForFunction(() => !document.getElementById('m-gate').hidden);
      const answer = await page.evaluate(() => window.__tryline.kids.gate().answer);
      for (const d of answer) await page.tap('#pg-k' + d);
      await page.waitForFunction(() => document.getElementById('im-go').textContent === 'Import' && !document.getElementById('im-err').hidden, null, { timeout:20000 });
      const said = await text('im-err');
      ok(said === 'Import isn\u2019t working. Try again later.' && !/link/i.test(said), `no service there: Import isn't working, never Check the link (${said})`);
      const [, eh, el, er] = await page.evaluate(() => { const r = document.getElementById('im-err').getBoundingClientRect(); return [r.width, r.height, r.left, r.right]; });
      ok(eh > 0 && el >= 0 && er <= w, `${w}x${h}: the message fits the card`);
      await shot('service');
      ok(!errors.length && outside.length === 0, `no page errors and no outside request (${errors.join(' | ')} ${outside.join(' ')})`);
      await ctx.close();
      function shot(name) { return shots ? page.screenshot({ path:path.join(shots, `webimport-${name}-${w}x${h}.png`) }) : null; }
    }
  } finally {
    await browser.close();
    await new Promise(r => game.close(r)); await new Promise(r => service.close(r));
  }
}
await browserChecks();

console.log(`Import service: ${passed} assertions passed`);
