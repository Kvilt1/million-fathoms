/* Checks the reveal's digit highlights (npm run test:highlights):
   - every badge has its own highlight function;
   - on sample numbers, including the five protected ones, every function runs for every badge without
     throwing and returns sorted, distinct positions that are real digits of the roll;
   - on all 1,000,001 rolls, every earned badge lights at least one digit;
   - a few hand-checked examples light exactly the right digits. */
import { BADGES, earnedBadges, ROLLS } from '../src/game/rules.js';
import { HIGHLIGHTS, highlight, type Highlight } from '../src/game/highlights';

const fails: string[] = [];
const fail = (msg: string) => { if (fails.length < 40) console.log('  FAIL', msg); fails.push(msg); };

const names = BADGES.map(b => b.name);
for (const nm of names) if (!HIGHLIGHTS[nm]) fail(`no highlight function for ${nm}`);
for (const nm of Object.keys(HIGHLIGHTS)) if (!names.includes(nm)) fail(`highlight for unknown badge ${nm}`);
console.log(`${names.length} badges, ${Object.keys(HIGHLIGHTS).length} highlight functions`);

function valid(h: Highlight, n: number) {
  const len = String(n).length;
  if (!['digits', 'ends', 'tail', 'whole'].includes(h.style)) return `bad style ${h.style}`;
  for (let i = 0; i < h.pos.length; i++) {
    const p = h.pos[i];
    if (!Number.isInteger(p) || p < 0 || p >= len) return `position ${p} is not a digit of ${n}`;
    if (i && p <= h.pos[i - 1]) return `positions not sorted and distinct: ${h.pos}`;
  }
  return null;
}

/* Every function on sample numbers, earned or not. */
const PROTECTED = [61287, 142857, 420420, 1000000, 403602];
const EDGE = [0, 1, 7, 9, 10, 11, 42, 69, 99, 100, 101, 404, 420, 777, 911, 1000, 1337, 1984, 6283, 7734, 8008, 17776, 42069, 58008, 69420, 80085, 86400,
  99999, 100000, 101101, 123456, 13579, 97531, 56789, 654321, 111111, 424242, 676767, 271828, 314159, 365365, 247365, 696969, 777777, 911911, 999999, 999000, 999001];
let seed = 12345;
const rand = () => { seed = (seed * 16807) % 2147483647; return seed % ROLLS; };
const samples = [...PROTECTED, ...EDGE, ...Array.from({ length: 20000 }, rand)];
let calls = 0;
for (const n of samples) for (const nm of names) {
  let h: Highlight;
  try { h = highlight(nm, n); } catch (e) { fail(`${nm} threw on ${n}: ${(e as Error).message}`); continue; }
  calls++;
  const bad = valid(h, n); if (bad) fail(`${nm} on ${n}: ${bad}`);
}
console.log(`${calls.toLocaleString()} calls on ${samples.length.toLocaleString()} sample numbers`);
for (const n of PROTECTED) {
  const lit = earnedBadges(n).map(b => { const h = highlight(b.name, n); return `${b.name} ${h.style}[${h.pos}]`; });
  console.log(`  ${n}: ${lit.join(', ')}`);
}

/* Every earned badge on every roll lights something. */
const t0 = Date.now(), seen = new Set<string>();
let earnedCalls = 0;
for (let n = 0; n < ROLLS; n++) for (const b of earnedBadges(n)) {
  earnedCalls++; seen.add(b.name);
  const h = highlight(b.name, n), bad = valid(h, n);
  if (bad) fail(`${b.name} on ${n}: ${bad}`);
  else if (!h.pos.length) fail(`${b.name} earned on ${n} but lights nothing`);
}
console.log(`${earnedCalls.toLocaleString()} earned badges on all ${ROLLS.toLocaleString()} rolls in ${((Date.now() - t0) / 1000).toFixed(1)} s; ${seen.size} different badges seen`);

/* Hand-checked examples. */
const EXAMPLES: [string, number, string, number[]][] = [
  ['Three of a Kind', 515357, 'digits', [0, 2, 4]],
  ['Four of a Kind', 551535, 'digits', [0, 1, 3, 5]],
  ['Meaning of Life', 104271, 'digits', [2, 3]],
  ['Botanist', 420420, 'digits', [0, 1, 2, 3, 4, 5]],
  ['Gap One', 61287, 'ends', [0, 4]],
  ['Grounded', 61287, 'ends', [0, 4]],
  ['Bookends', 123412, 'ends', [0, 1, 4, 5]],
  ['Even', 61288, 'tail', [4]],
  ['Century', 61200, 'tail', [3, 4]],
  ['Double Nine', 403699, 'tail', [4, 5]],
  ['Prime Number', 61291, 'whole', [0, 1, 2, 3, 4]],
  ['Lithium (3)', 403602, 'digits', [2]],
  ['Contiguous Pair', 155234, 'digits', [1, 2]],
  ['Snake Eyes', 151234, 'digits', [0, 2]],
  ['Firefly', 777377, 'digits', [3]],
  ['Hopscotch', 121345, 'digits', [0, 2]],
  ['Sequence (3)', 912340, 'digits', [1, 2, 3]],
  ['Straight Flush', 213579, 'digits', [1, 2, 3, 4, 5]],
];
for (const [nm, n, style, pos] of EXAMPLES) {
  const h = highlight(nm, n);
  if (h.style !== style || h.pos.join() !== pos.join()) fail(`${nm} on ${n}: expected ${style}[${pos}], got ${h.style}[${h.pos}]`);
}
console.log(`${EXAMPLES.length} hand-checked examples`);

console.log(fails.length ? `\nFAILED ${fails.length}` : '\nPASS: every highlight is valid');
process.exit(fails.length ? 1 : 0);
