/* Builds src/descent/data.json for Descent mode (npm run data:descent).
   Runs the unchanged badge rules over every depth's roll space (0 to 10^d - 1 for depths 1 to 5,
   0 to 1,000,000 for depth 6: about 1.1M numbers), then records:
     counts  how many numbers in each depth's space earn each badge
     eps     each badge's EP at each depth: round(100 * size / count), 0 when it can't happen.
             Depth 6 copies Classic's EP table verbatim, so depth 6 scores exactly like Classic
             (Classic pays Power of Seven and Power of Five slightly off that formula).
     dist    each depth's distribution of roll totals, encoded like Classic's (depth 6 reuses Classic's)
     stats   median, mean, min and max total EP per roll at each depth
   Depth 6 is checked against Classic's counts and distribution before anything is written. */
import { writeFileSync } from 'node:fs';
import { BADGES, context, ROLLS } from '../src/game/rules.js';
import CLASSIC from '../src/game/data.json';

const DEPTHS = 6, t0 = Date.now();
const sizeOf = (d: number) => d < 6 ? 10 ** d : ROLLS;
const B = BADGES.length;
const families = BADGES.map(b => b.family);

function varint(x: number, out: number[]) { do { let b = x % 128; x = Math.floor(x / 128); if (x) b |= 128; out.push(b); } while (x); }
function encode(totals: number[]) {
  const m = new Map<number, number>(); for (const t of totals) m.set(t, (m.get(t) || 0) + 1);
  const vals = [...m.keys()].sort((a, b) => a - b), bytes: number[] = [];
  let prev = 0; for (const v of vals) { varint(v - prev, bytes); varint(m.get(v)!, bytes); prev = v; }
  return Buffer.from(bytes).toString('base64');
}

const counts = BADGES.map(() => new Array<number>(DEPTHS).fill(0));
const eps = BADGES.map(() => new Array<number>(DEPTHS).fill(0));
const dist: (string | null)[] = [], stats: { size: number; median: number; mean: number; min: number; max: number }[] = [];
const fails: string[] = [];

for (let d = 1; d <= DEPTHS; d++) {
  const size = sizeOf(d);
  // pass 1: which badges each number earns, kept as a flat list so pass 2 needn't rerun the rules
  const offs = new Int32Array(size + 1), hits: number[] = [];
  for (let n = 0; n < size; n++) {
    const s = String(n), x = context(s);
    for (let i = 0; i < B; i++) if (BADGES[i].rule(n, s, x)) { hits.push(i); counts[i][d - 1]++; }
    offs[n + 1] = hits.length;
  }
  for (let i = 0; i < B; i++) {
    const c = counts[i][d - 1];
    eps[i][d - 1] = d === 6 ? (CLASSIC.eps as Record<string, number>)[BADGES[i].name] : c ? Math.round(100 * size / c) : 0;
  }
  // pass 2: each number's total under the family rule (only the highest-EP badge in a family pays)
  const totals = new Array<number>(size);
  for (let n = 0; n < size; n++) {
    const best = new Map<string, number>();
    for (let k = offs[n]; k < offs[n + 1]; k++) { const i = hits[k], f = families[i]; if (f && (!best.has(f) || eps[i][d - 1] > eps[best.get(f)!][d - 1])) best.set(f, i); }
    let t = 0;
    for (let k = offs[n]; k < offs[n + 1]; k++) { const i = hits[k], f = families[i]; if (!f || best.get(f) === i) t += eps[i][d - 1]; }
    totals[n] = t;
  }
  const sorted = totals.slice().sort((a, b) => a - b);
  const median = size % 2 ? sorted[(size - 1) / 2] : (sorted[size / 2 - 1] + sorted[size / 2]) / 2;
  const mean = totals.reduce((a, b) => a + b, 0) / size;
  stats.push({ size, median, mean: Math.round(mean * 100) / 100, min: sorted[0], max: sorted[size - 1] });
  const enc = encode(totals);
  if (d === 6) {
    if (enc !== CLASSIC.dist) fails.push('depth 6 distribution differs from Classic');
    BADGES.forEach((b, i) => { if (counts[i][5] !== (CLASSIC.counts as Record<string, number>)[b.name]) fails.push(`depth 6 count for ${b.name} differs from Classic`); });
    dist.push(null);
  } else dist.push(enc);
  console.log(`depth ${d}: ${size.toLocaleString('en-US')} numbers, ${BADGES.filter((_, i) => counts[i][d - 1]).length} badges possible, median ${median}, mean ${mean.toFixed(1)}`);
}
if (fails.length) { console.log('FAIL\n' + fails.join('\n')); process.exit(1); }

const out = {
  sizes: stats.map(s => s.size),
  counts: Object.fromEntries(BADGES.map((b, i) => [b.name, counts[i]])),
  eps: Object.fromEntries(BADGES.map((b, i) => [b.name, eps[i]])),
  dist, stats,
};
writeFileSync(new URL('../src/descent/data.json', import.meta.url), JSON.stringify(out));
console.log(`wrote src/descent/data.json in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
