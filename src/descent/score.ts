/* Descent scoring. The same 233 rules and the same family rule as Classic, but each badge's EP comes
   from how often it hits in the current depth's roll space (EP_d = 100 / p_d), and the tier comes from
   the roll's percentile within that depth. Depth 6 is Classic's space with Classic's EP table, so it
   scores exactly like Classic. Nothing here changes Classic: it only reads its rules and badge list. */
import { earnedBadges } from '../game/rules.js';
import { ALL_BADGES, badgeTier, fathoms, type Badge, type Result } from '../game/score';
import CLASSIC from '../game/data.json';
import DATA from './data.json';

export const DEPTHS = 6;
export type Depth = 1 | 2 | 3 | 4 | 5 | 6;
export interface DepthStats { size: number; median: number; mean: number; min: number; max: number }
export const STATS: DepthStats[] = DATA.stats;
/** How many numbers depth d rolls from: 10^d for depths 1 to 5, 1,000,001 for depth 6. */
export const sizeAt = (d: number) => DATA.sizes[d - 1];
/** Reels shown at depth d. Depth 6 needs a seventh, dimmed carry reel for 1,000,000. */
export const reelsAt = (d: number) => d < 6 ? d : 7;

const counts = DATA.counts as Record<string, number[]>, eps = DATA.eps as Record<string, number[]>;
/** Each badge as it stands at depth d: EP, count and rarity tier for that depth. Index 0 is depth 1. */
export const BADGES_AT: Badge[][] = Array.from({ length: DEPTHS }, (_, i) => ALL_BADGES.map(b => {
  const ep = eps[b.name][i];
  return { ...b, ep, count: counts[b.name][i], tier: badgeTier(ep) };
}));
const BY_NAME_AT = BADGES_AT.map(list => new Map(list.map(b => [b.name, b])));
export const badgeAt = (name: string, d: number) => BY_NAME_AT[d - 1].get(name)!;
/** The shallowest depth where a badge can happen. */
export const firstDepth = (name: string) => counts[name].findIndex(c => c > 0) + 1;
/** How a badge's value moved from the depth above: 'new' if it couldn't happen there. */
export function trend(name: string, d: number): 'new' | 'up' | 'down' | 'same' | null {
  if (d <= 1 || !counts[name][d - 1]) return null;
  if (!counts[name][d - 2]) return 'new';
  const a = eps[name][d - 2], b = eps[name][d - 1];
  return b > a ? 'up' : b < a ? 'down' : 'same';
}

/* Each depth's totals as sorted distinct values with running counts (Classic's encoding). */
function decode(b64: string) {
  const raw = atob(b64), vals: number[] = [], cum: number[] = [];
  let i = 0, prev = 0, sum = 0;
  const vint = () => { let v = 0, m = 1, c; do { c = raw.charCodeAt(i++); v += (c & 127) * m; m *= 128; } while (c & 128); return v; };
  while (i < raw.length) { prev += vint(); sum += vint(); vals.push(prev); cum.push(sum); }
  return { vals, cum };
}
const DIST = DATA.dist.map((b, i) => decode(b ?? (i === 5 ? CLASSIC.dist : '')));
/** How many numbers at depth d total less than `total`. */
export function rollsBelowAt(total: number, d: number) {
  const { vals, cum } = DIST[d - 1];
  let lo = 0, hi = vals.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (vals[m] < total) lo = m + 1; else hi = m; }
  return lo ? cum[lo - 1] : 0;
}
/** Classic's share bands: Trash is the bottom 1%, Common to 50%, Uncommon to 75%, Rare to 90%,
    Epic to 95%, Anomaly to 99%, Mythic the top 1%. */
export const BANDS = [0, .01, .5, .75, .9, .95, .99];
/** Tier floors at depth d, cut the way Classic's are: each is the lowest total that some roll reaches
    with at least that share of the depth's rolls below it. Infinity when a tier can't happen there. */
export const FLOORS: number[][] = Array.from({ length: DEPTHS }, (_, i) => {
  const size = sizeAt(i + 1), { vals, cum } = DIST[i];
  return BANDS.map((band, k) => {
    if (k === 0) return 0;
    for (let j = 0; j < vals.length; j++) if ((j ? cum[j - 1] : 0) >= band * size) return vals[j];
    return Infinity;
  });
});
export const tierAt = (total: number, d: number) => { const f = FLOORS[d - 1]; for (let i = 6; i >= 0; i--) if (total >= f[i]) return i; return 0; };

export interface DResult extends Result { d: number }
/** Score n at depth d. The rules see String(n) with no leading zeros, exactly as in Classic. */
export function scoreAt(n: number, d: number): DResult {
  const earned = earnedBadges(n).map(b => badgeAt(b.name, d)), best = new Map<string, Badge>();
  for (const b of earned) if (b.family && (!best.has(b.family) || b.ep > best.get(b.family)!.ep)) best.set(b.family, b);
  const paid = earned.filter(b => !b.family || best.get(b.family) === b);
  const outranked = earned.filter(b => b.family && best.get(b.family) !== b);
  const total = paid.reduce((a, b) => a + b.ep, 0);
  // u and fm are where the lead sits: the top of this depth's zone until the controller places it by progress.
  const u = d - 1;
  return { n, d, earned, paid, outranked, total, tier: tierAt(total, d), u, fm: Math.round(fathoms(u)), pct: 100 * rollsBelowAt(total, d) / sizeAt(d) };
}

/** A uniform roll from depth d's space, with the same secure generator and rejection sampling as Classic. */
export function rollAt(d: number) {
  const size = sizeAt(d), limit = Math.floor(2 ** 32 / size) * size, a = new Uint32Array(1);
  do { crypto.getRandomValues(a); } while (a[0] >= limit);
  return a[0] % size;
}
/** One roll's total drawn from depth d's exact distribution, for pacing simulations. `r` is in [0, 1). */
export function sampleTotal(d: number, r: number) {
  const { vals, cum } = DIST[d - 1], k = Math.floor(r * sizeAt(d));
  let lo = 0, hi = cum.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] > k) hi = m; else lo = m + 1; }
  return vals[lo];
}
