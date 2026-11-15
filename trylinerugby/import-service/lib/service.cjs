'use strict';
/* =========================================================
   The import service: the web build's Add Your Team (README.md beside this folder's api/).

   A browser cannot read a Pitchero page from the game's site (Pitchero sends no CORS header), so the web build posts the
   pasted link here, once, and this makes the requests the Try Line app makes itself: the game's own importFetch
   (lib/import-core.cjs, generated from src/import-core.js by tools/build.mjs), at most three pages on the pasted page's
   site, its redirects followed by that code with each Location checked as a pasted link is, Pitchero's five seconds
   between them. It answers only what importSafe lets out: club and team names, shirt colours and table numbers. Never
   the page, the link or a header, and nothing is stored or logged: there is no console call in this file.

   The network is node:https, one connection a request, to port 443 only, with a User-Agent of TryLineRugby and an
   Accept and no other header of ours (no cookies, no authorisation, no Referer). The address it connects to is the one
   safeLookup approved, so a name that resolves to a private, loopback, link-local, shared, multicast, reserved,
   unspecified or documentation address (in IPv4 or IPv6, or an IPv4 address inside an IPv6 one) is never reached, and
   a name that resolves to a public address for the check and a private one for the connection cannot happen: there is
   one lookup, and the connection uses its answer.

   Only the game's own page may ask (ALLOWED_ORIGIN): any other Origin, or none, is refused before anything is fetched,
   and gets no CORS header. Each caller may start IMPORT_RATE.max imports a minute, counted in memory by a salted hash
   of its address, never the address itself.
   ========================================================= */
const crypto = require('node:crypto');
const net = require('node:net');
const core = require('./import-core.cjs');

const ALLOWED_ORIGIN = 'https://gordonlindsay.github.io';
/* TRYLINE_IMPORT_TEST_ORIGIN: the tests' own copy of the game, served on 127.0.0.1 (tools/import-service.mjs). Read only
   when it is set and names a 127.0.0.1 address, so nothing set by mistake can open the service to another site. */
const TEST_ORIGIN = /^http:\/\/127\.0\.0\.1:\d{2,5}$/;
const MAX_BODY = 4096;                                  // bytes of a request's body: a link, not a page
const BUDGET = 45000;                                   // ms one import may take in all, under the function's 60 (vercel.json)
const IMPORT_RATE = { max:6, per:60000, keep:5000, busy:20 };   // imports a caller a minute, callers remembered, imports at once
const TEXT = /^(?:text\/[a-z0-9.+-]+|application\/(?:[a-z0-9.-]+\+)?(?:json|xml))$/;
const ERRORS = { url:400, net:502, timeout:504, empty:422 };

/* ---------- addresses ---------- */
function ipv4(a) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(String(a));
  if (!m) return null;
  const b = m.slice(1).map(Number);
  return b.every(x => x <= 255) ? b : null;
}
/* Never reached: this network (0/8), private (10/8, 172.16/12, 192.168/16), shared (100.64/10), loopback (127/8),
   link-local (169.254/16, the cloud metadata address among them), IETF and documentation (192.0.0/24, 192.0.2/24,
   198.51.100/24, 203.0.113/24), 6to4 relay (192.88.99/24), benchmarking (198.18/15), multicast (224/4) and reserved
   (240/4, with the broadcast address). */
const V4_BLOCKED = [[0, 0, 0, 0, 8], [10, 0, 0, 0, 8], [100, 64, 0, 0, 10], [127, 0, 0, 0, 8], [169, 254, 0, 0, 16], [172, 16, 0, 0, 12],
  [192, 0, 0, 0, 24], [192, 0, 2, 0, 24], [192, 88, 99, 0, 24], [192, 168, 0, 0, 16], [198, 18, 0, 0, 15], [198, 51, 100, 0, 24],
  [203, 0, 113, 0, 24], [224, 0, 0, 0, 4], [240, 0, 0, 0, 4]];
const v4num = b => ((b[0] << 24) >>> 0) + (b[1] << 16) + (b[2] << 8) + b[3];
function v4Blocked(b) {
  const n = v4num(b);
  return V4_BLOCKED.some(([w, x, y, z, len]) => { const mask = (0xffffffff << (32 - len)) >>> 0; return ((n & mask) >>> 0) === v4num([w, x, y, z]); });
}
/* An IPv6 address as its eight groups, or null. A zone (%eth0) is dropped, an IPv4 tail (::ffff:10.0.0.1) read. */
function ipv6(a) {
  let s = String(a).toLowerCase();
  const zone = s.indexOf('%'); if (zone >= 0) s = s.slice(0, zone);
  if (s.includes('.')) {
    const at = s.lastIndexOf(':'), b = ipv4(s.slice(at + 1));
    if (at < 0 || !b) return null;
    s = s.slice(0, at + 1) + ((b[0] << 8) | b[1]).toString(16) + ':' + ((b[2] << 8) | b[3]).toString(16);
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const part = h => (h ? h.split(':') : []);
  const head = part(halves[0]), tail = halves.length === 2 ? part(halves[1]) : [], fill = 8 - head.length - tail.length;
  if (halves.length === 1 ? head.length !== 8 : fill < 1) return null;
  const groups = [...head, ...Array(halves.length === 2 ? fill : 0).fill('0'), ...tail];
  return groups.length === 8 && groups.every(g => /^[0-9a-f]{1,4}$/.test(g)) ? groups.map(g => parseInt(g, 16)) : null;
}
/* IPv6: only global unicast (2000::/3), and not its documentation (2001:db8::/32, 3fff::/20), IETF (2001::/23, Teredo
   among them) or 6to4 (2002::/16) blocks. An IPv4 address mapped into IPv6 (::ffff:0:0/96) is judged as that IPv4
   address. Everything else, the unspecified ::, loopback ::1, unique local fc00::/7, link-local fe80::/10, multicast
   ff00::/8 and NAT64 64:ff9b::/96 among it, is never reached. */
function v6Blocked(g) {
  if (g.slice(0, 5).every(x => x === 0) && g[5] === 0xffff) return v4Blocked([g[6] >> 8, g[6] & 255, g[7] >> 8, g[7] & 255]);
  if ((g[0] & 0xe000) !== 0x2000) return true;
  if (g[0] === 0x2001 && (g[1] === 0x0db8 || g[1] < 0x0200)) return true;
  if (g[0] === 0x2002 || (g[0] & 0xfff0) === 0x3ff0) return true;
  return false;
}
/* True for any address the service must never connect to, and for anything that is not an address. */
function blocked(address) {
  const kind = net.isIP(String(address));
  if (kind === 4) { const b = ipv4(address); return !b || v4Blocked(b); }
  if (kind === 6) { const g = ipv6(address); return !g || v6Blocked(g); }
  return true;
}
const refused = () => Object.assign(new Error('refused'), { code:'EREFUSED' });
/* The lookup every request connects through: the name resolved once, refused whole if any answer is an address above,
   and the answer it gives is what the connection uses. A name that is itself an address is refused too. */
function safeLookup(dns) {
  return (hostname, options, cb) => {
    if (typeof options === 'function') { cb = options; options = {}; }
    options = options && typeof options === 'object' ? options : {};
    if (net.isIP(String(hostname).replace(/^\[|\]$/g, ''))) { cb(refused()); return; }
    dns.lookup(hostname, { all:true, verbatim:true }, (err, list) => {
      if (err) { cb(err); return; }
      const all = (Array.isArray(list) ? list : []).filter(a => a && typeof a.address === 'string');
      if (!all.length || all.some(a => blocked(a.address))) { cb(refused()); return; }
      const family = options.family === 4 || options.family === 6 ? options.family : 0;
      const pick = all.map(a => ({ address:a.address, family:net.isIP(a.address) })).filter(a => !family || a.family === family);
      if (!pick.length) { cb(refused()); return; }
      if (options.all) cb(null, pick); else cb(null, pick[0].address, pick[0].family);
    });
  };
}

/* ---------- the network handed to importFetch ---------- */
/* Capacitor's get, as importFetch calls it, over node:https: { status, headers, data, url }, or a rejection with 'net'
   or 'timeout'. A redirect is answered as it is (with its Location only) for importFetch to check and follow. A page
   must be text (HTML, JSON or XML, as the server labels it, with no content encoding) and is read up to
   IMPORT_MAX_HTML characters, then the connection is closed. With less than 1.5 seconds of the import's budget left no
   new request starts ('timeout'): the pages already read stand. */
function network({ https, dns, now, deadline, timeout, floor = 1500 }) {
  const lookup = safeLookup(dns);
  return { get(o) {
    return new Promise((resolve, reject) => {
      let u; try { u = new URL(String(o && o.url)); } catch (e) { reject(Error('net')); return; }
      if (u.protocol !== 'https:' || u.port || u.username || u.password || net.isIP(u.hostname.replace(/^\[|\]$/g, '')) || core.importUrl(u.href) !== u.href) { reject(Error('net')); return; }
      const left = deadline - now();
      if (left < floor) { reject(Error('timeout')); return; }
      const ms = Math.max(1, Math.min(timeout, left));
      let done = false, req = null, timer = 0;
      const finish = (fn, v) => { if (done) return; done = true; clearTimeout(timer); fn(v); };
      const fail = (why, res) => { if (res) res.destroy(); if (req) req.destroy(); finish(reject, Error(why)); };
      timer = setTimeout(() => fail('timeout'), ms);
      try {
        req = https.request({ protocol:'https:', hostname:u.hostname, servername:u.hostname, port:443, method:'GET', path:u.pathname + u.search,
          headers:{ 'User-Agent':core.IMPORT_UA, Accept:'text/html,application/json' }, agent:false, lookup, timeout:ms }, res => {
          const status = res.statusCode | 0, h = res.headers || {};
          if (status >= 300 && status < 400) { const location = typeof h.location === 'string' ? h.location : ''; res.destroy(); finish(resolve, { status, headers:{ location }, data:'' }); return; }
          if (status < 200 || status >= 300) { res.destroy(); finish(resolve, { status, headers:{}, data:'' }); return; }
          const type = String(h['content-type'] || '').split(';')[0].trim().toLowerCase(), coding = String(h['content-encoding'] || 'identity').trim().toLowerCase();
          if (!TEXT.test(type) || coding !== 'identity') { fail('net', res); return; }
          let body = '';
          const page = () => {
            let data = body;
            if (/json$/.test(type)) try { data = JSON.parse(body); } catch (e) { data = body; }   // as Capacitor hands JSON over: importFetch wraps it for importDoc
            return { status, headers:{}, data, url:u.href };
          };
          res.setEncoding('utf8');
          res.on('data', chunk => {
            if (done) return;
            body += chunk;
            if (body.length >= core.IMPORT_MAX_HTML) { body = body.slice(0, core.IMPORT_MAX_HTML); res.destroy(); finish(resolve, page()); }
          });
          res.on('end', () => finish(resolve, page()));
          res.on('error', () => fail('net'));
          res.on('aborted', () => fail('net'));
          res.on('close', () => { if (!done && !res.complete) fail('net'); });
        });
      } catch (e) { fail('net'); return; }
      req.on('error', () => fail('net'));
      req.on('timeout', () => fail('timeout'));
      req.end();
    });
  } };
}

/* ---------- the function ---------- */
const header = (req, name) => { const v = req.headers && req.headers[name]; return typeof v === 'string' ? v : Array.isArray(v) && typeof v[0] === 'string' ? v[0] : ''; };
/* The body as text, or null when it is over MAX_BODY bytes. Vercel's helpers may have read it already (req.body). */
function readBody(req) {
  let b;
  try { b = req.body; } catch (e) { return Promise.resolve(''); }
  if (typeof b === 'string') return Promise.resolve(Buffer.byteLength(b) > MAX_BODY ? null : b);
  if (Buffer.isBuffer(b)) return Promise.resolve(b.length > MAX_BODY ? null : b.toString('utf8'));
  if (b != null || typeof req.on !== 'function') return Promise.resolve('');
  if (Number(header(req, 'content-length')) > MAX_BODY) return Promise.resolve(null);
  return new Promise(resolve => {
    const parts = []; let size = 0, done = false;
    const end = v => { if (!done) { done = true; resolve(v); } };
    req.on('data', c => { if (done) return; const buf = Buffer.isBuffer(c) ? c : Buffer.from(String(c)); size += buf.length; if (size > MAX_BODY) end(null); else parts.push(buf); });
    req.on('end', () => end(Buffer.concat(parts).toString('utf8')));
    req.on('error', () => end(''));
  });
}
/* What leaves the service: importSafe's result and nothing else (source, club, teams, league, and a label and a level
   where the page gave them). */
function only(d) {
  const out = { source:d.source, club:d.club, teams:d.teams, league:d.league };
  if (typeof d.label === 'string') out.label = d.label;
  if (typeof d.level === 'string') out.level = d.level;
  return out;
}
/* The handler. deps are the tests' (tools/import-service.mjs): their own https and dns (a stub serving fixture pages),
   sleep, clock, budget, floor, timeout and gap. Vercel calls it with none. */
function makeHandler(deps = {}) {
  const https = deps.https || require('node:https'), dns = deps.dns || require('node:dns');
  const now = deps.now || Date.now, wait = deps.sleep || (ms => new Promise(r => setTimeout(r, ms)));
  const budget = deps.budget ?? BUDGET, timeout = deps.timeout ?? core.IMPORT_TIMEOUT, gap = deps.gap, floor = deps.floor ?? 1500;
  const origins = new Set([ALLOWED_ORIGIN]);
  const test = process.env.TRYLINE_IMPORT_TEST_ORIGIN;
  if (typeof test === 'string' && TEST_ORIGIN.test(test)) origins.add(test);
  const salt = crypto.randomBytes(16), seen = new Map();
  let running = 0;
  /* One more import for this caller, or false when it has had IMPORT_RATE.max this minute or too many run at once. */
  const take = req => {
    if (running >= IMPORT_RATE.busy) return false;
    const ip = header(req, 'x-real-ip') || header(req, 'x-forwarded-for').split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || '';
    const key = crypto.createHmac('sha256', salt).update(ip).digest('base64'), t = now();
    const list = (seen.get(key) || []).filter(x => t - x < IMPORT_RATE.per);
    seen.delete(key);
    if (list.length >= IMPORT_RATE.max) { seen.set(key, list); return false; }
    list.push(t); seen.set(key, list);
    while (seen.size > IMPORT_RATE.keep) seen.delete(seen.keys().next().value);   // the longest quiet first
    return true;
  };
  const run = async href => {
    const deadline = now() + budget;
    let timer = 0;
    try {
      return await Promise.race([
        core.importFetch(href, { http:network({ https, dns, now, deadline, timeout, floor }), timeout, gap, sleep:ms => wait(Math.max(0, Math.min(ms, deadline - now()))) }),
        new Promise(ok => { timer = setTimeout(() => ok({ ok:false, error:'timeout' }), budget + 2000); }),   // a backstop: each request already ends by the deadline
      ]);
    } finally { clearTimeout(timer); }
  };
  return async function importService(req, res) {
    const origin = header(req, 'origin'), allowed = origins.has(origin) ? origin : '';
    const send = (status, body, extra) => {
      res.statusCode = status;
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Vary', 'Origin');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'no-referrer');
      if (allowed) res.setHeader('Access-Control-Allow-Origin', allowed);
      for (const [k, v] of Object.entries(extra || {})) res.setHeader(k, v);
      if (body == null) { res.end(); return; }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(body));
    };
    try {
      const method = String(req.method || '').toUpperCase();
      let query; try { query = new URL(String(req.url || '/'), 'https://service.invalid').searchParams; } catch (e) { query = new URLSearchParams(); }
      if (method === 'OPTIONS') {
        if (!allowed) { send(403, null); return; }
        send(204, null, { 'Access-Control-Allow-Methods':'POST, GET, OPTIONS', 'Access-Control-Allow-Headers':'Content-Type', 'Access-Control-Max-Age':'600' });
        return;
      }
      if (method === 'GET' && query.get('health') === '1' && [...query.keys()].length === 1) { send(200, { ok:true }); return; }
      if (method !== 'POST') { send(405, { ok:false, error:'net' }, { Allow:'GET, POST, OPTIONS' }); return; }
      if (!allowed) { send(403, { ok:false, error:'net' }); return; }
      if (!take(req)) { send(429, { ok:false, error:'busy' }, { 'Retry-After':'60' }); return; }
      if (header(req, 'content-type').split(';')[0].trim().toLowerCase() !== 'text/plain') { send(415, { ok:false, error:'url' }); return; }
      const body = await readBody(req);
      if (body === null) { send(413, { ok:false, error:'url' }); return; }
      const href = core.importUrl(body);
      if (!href) { send(400, { ok:false, error:'url' }); return; }
      running++;
      let r;
      try { r = await run(href); } finally { running--; }
      if (!r.ok) { const error = r.error === 'url' ? 'url' : r.error === 'timeout' || r.error === 'cancelled' ? 'timeout' : 'net'; send(ERRORS[error], { ok:false, error }); return; }
      const d = r.data;
      if (!d.club && !d.league.length && !d.teams.length) { send(ERRORS.empty, { ok:false, error:'empty' }); return; }
      send(200, { ok:true, data:only(d), requests:r.requests });
    } catch (e) {
      if (!res.headersSent && !res.writableEnded) send(500, { ok:false, error:'net' });
    }
  };
}

module.exports = { makeHandler, blocked, safeLookup, network, ALLOWED_ORIGIN, MAX_BODY, BUDGET, IMPORT_RATE };
