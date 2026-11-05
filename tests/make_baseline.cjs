// One-off: records what the original plain-JS rules and scoring produce on every roll,
// so the port can be checked against it. Run from the repo root at commit bc04b05.
const fs = require('fs');
const { BADGES, context, ROLLS } = require('../src/rules.js');
const DATA = JSON.parse(fs.readFileSync('src/data.json', 'utf8'));
// copied verbatim from the original src/app.js
const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const FLOORS = [0, 2087, 5802, 10074, 22293, 35469, 162292];
BADGES.forEach(b => { b.ep = DATA.eps[b.name]; });
const DIST = (() => {
  const raw = Buffer.from(DATA.dist, 'base64').toString('latin1'), vals = [], cum = [];
  let i = 0, prev = 0, sum = 0;
  const vint = () => { let v = 0, m = 1, c; do { c = raw.charCodeAt(i++); v += (c & 127) * m; m *= 128; } while (c & 128); return v; };
  while (i < raw.length) { prev += vint(); sum += vint(); vals.push(prev); cum.push(sum); }
  return { vals, cum };
})();
function rollsBelow(total) { let lo = 0, hi = DIST.vals.length; while (lo < hi) { const m = (lo + hi) >> 1; if (DIST.vals[m] < total) lo = m + 1; else hi = m; } return lo ? DIST.cum[lo - 1] : 0; }
const tierOf = total => { for (let i = 6; i >= 0; i--) if (total >= FLOORS[i]) return i; return 0; };
const TOP_EP = DIST.vals[DIST.vals.length - 1];
const EP_ANCHORS = [[1759, .2], [2087, 1], [5802, 2], [10074, 3], [22293, 4], [35469, 5], [162292, 6], [TOP_EP, 7]];
const FM_ANCHORS = [0, 12, 109, 547, 1100, 2187, 3281, 5960];
function zoneOf(ep) { if (ep <= 0) return 0; if (ep < 1759) return .2 * ep / 1759; for (let i = 1; i < EP_ANCHORS.length; i++) { const [e1, u1] = EP_ANCHORS[i]; if (ep <= e1) { const [e0, u0] = EP_ANCHORS[i - 1]; return lerp(u0, u1, Math.log(ep / e0) / Math.log(e1 / e0)); } } return 7; }
function fathoms(u) { const i = clamp(Math.floor(u), 0, 6); return lerp(FM_ANCHORS[i], FM_ANCHORS[i + 1], clamp(u - i, 0, 1)); }

const fnv = () => ({ h: 2166136261, add(v) { for (let k = 0; k < 4; k++) { this.h ^= (v >>> (8 * k)) & 255; this.h = Math.imul(this.h, 16777619) >>> 0; } } });
const rules = BADGES.map(() => ({ count: 0, f: fnv() }));
const score = fnv(), hits = new Uint8Array(BADGES.length);
let t = Date.now();
for (let n = 0; n < ROLLS; n++) {
  const s = String(n), x = context(s), best = new Map();
  for (let i = 0; i < BADGES.length; i++) {
    const on = BADGES[i].rule(n, s, x) ? 1 : 0; hits[i] = on;
    if (on) { rules[i].count++; rules[i].f.add(n); const b = BADGES[i]; if (b.family && (!best.has(b.family) || b.ep > best.get(b.family).ep)) best.set(b.family, b); }
  }
  let total = 0, paid = 0;
  for (let i = 0; i < BADGES.length; i++) if (hits[i]) { const b = BADGES[i]; if (!b.family || best.get(b.family) === b) { total += b.ep; paid++; } }
  const u = zoneOf(total);
  score.add(total); score.add(tierOf(total)); score.add(rollsBelow(total)); score.add(Math.round(fathoms(u))); score.add(paid);
}
const out = { rolls: ROLLS, badges: BADGES.map((b, i) => ({ name: b.name, family: b.family, count: rules[i].count, hash: rules[i].f.h })), scoreHash: score.h };
fs.writeFileSync('tests/baseline.json', JSON.stringify(out, null, 1));
console.log('baseline written in', (Date.now() - t) / 1000, 's; score hash', score.h);
