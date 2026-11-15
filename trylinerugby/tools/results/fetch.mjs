// Developer tooling, never part of the game: the one way the results job touches the network. Polite by construction:
// - User-Agent "TryLineRugby" and nothing else that names anyone; no cookies, no logins.
// - robots.txt read once a run for each host and honoured (the User-agent * group, longest match, Allow wins a tie), and its Crawl-delay.
// - One request at a time, and at least GAP_MS (or the host's Crawl-delay, the larger) from the end of one request to a host to the start
//   of the next. At most 2 retries a page, never faster than that.
// - Every page cached: a page fetched within maxAge is read from the cache and never fetched again. seeds are read-only caches of the same
//   layout (an earlier research run's), used only where the caller allows a stale page (discovery). Offline, the cache is read at any age.
// - A host that fails 3 times in a row (no answer, or a 5xx) is given up for the run, and nothing is fetched after the run's deadline: the
//   caller refuses the week with its summary written, rather than running into the workflow's timeout. At most 3 redirects a page.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { UA } from './lib.mjs';

export const GAP_MS = 5500;
export const GIVE_UP = 3;            // failures in a row before a host is given up for the run
export const MAX_HOPS = 3;           // redirects followed for one page
const HOSTS = new Set(['www.pitchero.com', 'pitchero.com', 'en.wikipedia.org', 'api.wr-rims-prod.pulselive.com']);
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* The cache key: host and path with every other character turned into "_"; a query adds "__" and 12 hex digits of its hash. The layout of
   the research run's cache, so its pages can seed this one. */
export function cacheKey(url) {
  const u = new URL(url);
  let k = (u.host + u.pathname).replace(/[^A-Za-z0-9.-]/g, '_');
  if (u.search || u.pathname.endsWith('/')) k += '__' + crypto.createHash('sha1').update(u.search + '|' + u.pathname).digest('hex').slice(0, 12);
  return k;
}
/* robots.txt rules for User-agent *: [{ allow, path }] and the crawl delay. */
export function robotsRules(text) {
  const groups = [];
  let cur = null, lastWasAgent = false;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase(), val = m[2].trim();
    if (key === 'user-agent') { if (!lastWasAgent) { cur = { agents:[], rules:[], delay:0 }; groups.push(cur); } cur.agents.push(val.toLowerCase()); lastWasAgent = true; continue; }
    lastWasAgent = false;
    if (!cur) continue;
    if (key === 'disallow' && val) cur.rules.push({ allow:false, path:val });
    else if (key === 'allow' && val) cur.rules.push({ allow:true, path:val });
    else if (key === 'crawl-delay' && Number.isFinite(+val)) cur.delay = +val;
  }
  const mine = groups.find(g => g.agents.includes(UA.toLowerCase())) || groups.find(g => g.agents.includes('*')) || { rules:[], delay:0 };
  return { rules:mine.rules, delay:mine.delay };
}
const patRe = p => new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + (p.endsWith('$') ? '' : ''));
export function robotsAllows(rules, pathAndQuery) {
  let best = null;
  for (const r of rules.rules) {
    const p = r.path.endsWith('$') ? r.path.slice(0, -1) : r.path;
    const re = r.path.endsWith('$') ? new RegExp(patRe(p).source + '$') : patRe(p);
    if (!re.test(pathAndQuery)) continue;
    if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
  }
  return !best || best.allow;
}

export class Fetcher {
  /* dir: this run's cache. maxAge: ms a cached page stays good. seeds: read-only caches, used when allowSeed. log: a function for lines. */
  /* deadline: a time (ms) after which nothing more is fetched (the page answers status 0, and late is set). */
  constructor({ dir, maxAge = 6*3600e3, seeds = [], allowSeed = false, log = () => {}, offline = false, deadline = Infinity }) {
    Object.assign(this, { dir, maxAge, seeds, allowSeed, log, offline, deadline });
    fs.mkdirSync(dir, { recursive:true });
    this.last = new Map(); this.robots = new Map(); this.requests = 0; this.cached = 0;
    this.fails = new Map(); this.dead = new Set(); this.late = false;
  }
  readCache(key, base, anyAge) {
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(base, key + '.meta'), 'utf8'));
      if (!anyAge && !(Date.now() - Date.parse(meta.fetched) < this.maxAge)) return null;
      if (meta.status !== 200) return { status:meta.status, body:null, fetched:meta.fetched, from:base };
      const body = fs.readFileSync(path.join(base, key + '.html'), 'utf8');
      return { status:200, body, fetched:meta.fetched, from:base };
    } catch (e) { return null; }
  }
  write(key, url, status, body) {
    const fetched = new Date().toISOString();
    if (status === 200) fs.writeFileSync(path.join(this.dir, key + '.html'), body);
    fs.writeFileSync(path.join(this.dir, key + '.meta'), JSON.stringify({ url, status, fetched }) + '\n');
    return fetched;
  }
  async pace(host) {
    const r = this.robots.get(host);
    const gap = Math.max(GAP_MS, ((r && r.delay) || 0)*1000);
    const wait = (this.last.get(host) || 0) + gap - Date.now();
    if (wait > 0) await sleep(wait);
  }
  async raw(url) {
    const host = new URL(url).host;
    await this.pace(host);
    this.requests++;
    try {
      const res = await fetch(url, { headers:{ 'User-Agent':UA, Accept:url.includes('pulselive') ? 'application/json' : 'text/html,application/json' }, redirect:'manual', signal:AbortSignal.timeout(60000) });
      const body = res.status === 200 ? await res.text() : '';
      return { status:res.status, body, location:res.headers.get('location') };
    } catch (e) {
      return { status:0, body:'', error:(e.cause && e.cause.code) || e.message };
    } finally { this.last.set(host, Date.now()); }
  }
  /* counts a host's failures in a row; GIVE_UP of them and the host is given up for the run */
  tally(host, r) {
    if (r.status === 0 || r.status >= 500) {
      const n = (this.fails.get(host) || 0) + 1;
      this.fails.set(host, n);
      if (n >= GIVE_UP && !this.dead.has(host)) { this.dead.add(host); this.log(`  giving up ${host}: ${n} failures in a row`); }
    } else this.fails.set(host, 0);
  }
  async robotsFor(host) {
    if (this.robots.has(host)) return this.robots.get(host);
    const url = `https://${host}/robots.txt`, key = cacheKey(url);
    let c = this.readCache(key, this.dir, false);
    if (!c && !this.offline) {
      const r = await this.raw(url);
      this.write(key, url, r.status, r.body);
      c = { status:r.status, body:r.body };
    }
    const rules = c && c.status === 200 ? robotsRules(c.body) : { rules:[], delay:0 };   // 404: no rules (the feed has none)
    if (c && c.status !== 200 && c.status !== 404) throw new Error(`robots.txt for ${host} answered ${c ? c.status : 'nothing'}: not fetching from it`);
    this.robots.set(host, rules);
    return rules;
  }
  /* Returns { status, body, fetched, cached }. Throws on a refused URL. */
  async get(url, { anyAge = false, hops = 0 } = {}) {
    const u = new URL(url);
    if (u.protocol !== 'https:' || !HOSTS.has(u.host)) throw new Error(`not a host this job reads: ${u.host}`);
    const key = cacheKey(url);
    const old = anyAge || this.offline;
    const hit = this.readCache(key, this.dir, old) || (this.allowSeed || old ? this.seeds.map(s => this.readCache(key, s, true)).find(Boolean) : null);
    if (hit) { this.cached++; return { ...hit, cached:true }; }
    if (this.offline) return { status:0, body:null, cached:false, error:'offline' };
    if (this.dead.has(u.host)) return { status:0, body:null, cached:false, error:'given up' };
    if (Date.now() > this.deadline) { this.late = true; return { status:0, body:null, cached:false, error:'deadline' }; }
    const rules = await this.robotsFor(u.host);
    if (!robotsAllows(rules, u.pathname + u.search)) throw new Error(`robots.txt disallows ${url}`);
    let r;
    for (let attempt = 0; attempt < 3; attempt++) {
      r = await this.raw(url);
      this.tally(u.host, r);
      if (r.status === 200 || (r.status >= 300 && r.status < 500 && r.status !== 408 && r.status !== 429)) break;
      this.log(`  retry ${url}: ${r.status || r.error}`);
      if (this.dead.has(u.host) || attempt === 2 || Date.now() + (attempt ? 45000 : 15000) > this.deadline) break;
      await sleep(attempt ? 45000 : 15000);
    }
    if (r.status >= 300 && r.status < 400 && r.location && hops < MAX_HOPS) {
      const to = new URL(r.location, url);
      if (to.host === u.host || (HOSTS.has(to.host) && to.host.endsWith('pitchero.com') && u.host.endsWith('pitchero.com'))) {
        to.protocol = 'https:'; to.port = '';
        if (to.href !== url) return this.get(to.href, { hops:hops + 1 });
      }
    }
    const fetched = this.write(key, url, r.status, r.body);
    this.log(`  ${r.status || r.error} ${url}`);
    return { status:r.status, body:r.status === 200 ? r.body : null, fetched, cached:false };
  }
}
