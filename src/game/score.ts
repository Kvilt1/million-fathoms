/* Scoring, tiers and depth. Moved unchanged from the original app.js. */
import { BADGES, earnedBadges, ROLLS, MAX_ROLL, type BadgeDef } from './rules.js';
import DATA from './data.json';

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const compact = (v: number) => v >= 1e9 ? (v / 1e9).toFixed(2) + 'B' : v >= 1e7 ? (v / 1e6).toFixed(1) + 'M' : fmt(v);

export interface Tier { name: string; zone: string; floor: number; note: string; color: string }
export const TIERS: Tier[] = [
  { name: 'Trash', zone: 'Surface Film', floor: 0, note: 'Bottom 1%', color: '' },
  { name: 'Common', zone: 'Sunlight Zone', floor: 2087, note: 'Bottom 50%', color: '' },
  { name: 'Uncommon', zone: 'Twilight Zone', floor: 5802, note: 'Top 50 to 25%', color: '' },
  { name: 'Rare', zone: 'Midnight Zone', floor: 10074, note: 'Top 25 to 10%', color: '' },
  { name: 'Epic', zone: 'Bathyal Slope', floor: 22293, note: 'Top 10 to 5%', color: '' },
  { name: 'Anomaly', zone: 'Abyssal Plain', floor: 35469, note: 'Top 5 to 1%', color: '' },
  { name: 'Mythic', zone: 'Hadal Trench', floor: 162292, note: 'Top 1%', color: '' },
];
/* Tier colours live in the stylesheet as --t0 to --t6; read them once the CSS is in place. */
export function readTierColors() {
  const cs = getComputedStyle(document.documentElement);
  TIERS.forEach((t, i) => { t.color = cs.getPropertyValue(`--t${i}`).trim(); });
}
export const BADGE_TIERS = ['Common', 'Uncommon', 'Rare', 'Epic', 'Anomaly', 'Mythic'];
export const badgeTier = (ep: number) => ep < 1000 ? 0 : ep < 10000 ? 1 : ep < 100000 ? 2 : ep < 1000000 ? 3 : ep < 10000000 ? 4 : 5;
export const badgeColor = (ep: number) => TIERS[badgeTier(ep) + 1].color;

export type Badge = BadgeDef & { ep: number; count: number; tier: number };
const eps = DATA.eps as Record<string, number>, counts = DATA.counts as Record<string, number>;
BADGES.forEach(b => { const x = b as Badge; x.ep = eps[b.name]; x.count = counts[b.name]; x.tier = badgeTier(x.ep); });
export const ALL_BADGES = BADGES as Badge[];
export const BY_NAME = new Map(ALL_BADGES.map(b => [b.name, b]));
export { ROLLS, MAX_ROLL };

/* Every roll's total, as sorted distinct values with how many rolls share each one. */
const DIST = (() => {
  const raw = atob(DATA.dist), vals: number[] = [], cum: number[] = [];
  let i = 0, prev = 0, sum = 0;
  const vint = () => { let v = 0, m = 1, c; do { c = raw.charCodeAt(i++); v += (c & 127) * m; m *= 128; } while (c & 128); return v; };
  while (i < raw.length) { prev += vint(); sum += vint(); vals.push(prev); cum.push(sum); }
  return { vals, cum };
})();
export function rollsBelow(total: number) {
  let lo = 0, hi = DIST.vals.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (DIST.vals[m] < total) lo = m + 1; else hi = m; }
  return lo ? DIST.cum[lo - 1] : 0;
}
export const tierOf = (total: number) => { for (let i = 6; i >= 0; i--) if (total >= TIERS[i].floor) return i; return 0; };

/* Depth: one zone per tier, sinking on a log scale of EP, ending at Challenger Deep (5,960 fathoms). */
const TOP_EP = DIST.vals[DIST.vals.length - 1];
const EP_ANCHORS = [[1759, .2], [2087, 1], [5802, 2], [10074, 3], [22293, 4], [35469, 5], [162292, 6], [TOP_EP, 7]];
const FM_ANCHORS = [0, 12, 109, 547, 1100, 2187, 3281, 5960];
export function zoneOf(ep: number) {
  if (ep <= 0) return 0;
  if (ep < 1759) return .2 * ep / 1759;
  for (let i = 1; i < EP_ANCHORS.length; i++) {
    const [e1, u1] = EP_ANCHORS[i];
    if (ep <= e1) {
      const [e0, u0] = EP_ANCHORS[i - 1];
      return lerp(u0, u1, Math.log(ep / e0) / Math.log(e1 / e0));
    }
  }
  return 7;
}
export function fathoms(u: number) {
  const i = clamp(Math.floor(u), 0, 6);
  return lerp(FM_ANCHORS[i], FM_ANCHORS[i + 1], clamp(u - i, 0, 1));
}

export interface Result { n: number; earned: Badge[]; paid: Badge[]; outranked: Badge[]; total: number; tier: number; u: number; fm: number; pct: number }
export function scoreRoll(n: number): Result {
  const earned = earnedBadges(n) as Badge[], best = new Map<string, Badge>();
  for (const b of earned) if (b.family && (!best.has(b.family) || b.ep > best.get(b.family)!.ep)) best.set(b.family, b);
  const paid = earned.filter(b => !b.family || best.get(b.family) === b);
  const outranked = earned.filter(b => b.family && best.get(b.family) !== b);
  const total = paid.reduce((a, b) => a + b.ep, 0);
  const tier = tierOf(total), u = zoneOf(total);
  return { n, earned, paid, outranked, total, tier, u, fm: Math.round(fathoms(u)), pct: 100 * rollsBelow(total) / ROLLS };
}
export const pctText = (p: number) => p >= 99.99 ? p.toFixed(4) : p >= 99 ? p.toFixed(3) : p.toFixed(2);

export function randomRoll() {
  const limit = Math.floor(2 ** 32 / ROLLS) * ROLLS, a = new Uint32Array(1);
  do { crypto.getRandomValues(a); } while (a[0] >= limit);
  return a[0] % ROLLS;
}
