// Proves the JS rules equal the verified Python results, roll by roll, for every badge.
// Needs the Python reference dumps (not included): node test_rules.js <dump dir>
import fs from 'node:fs';
import path from 'node:path';
import { BADGES, context, ROLLS } from './src/game/rules.js';
const dir = process.argv[2];
const names = JSON.parse(fs.readFileSync(path.join(dir, 'order.json'), 'utf8'));
const byName = new Map(BADGES.map(b => [b.name, b]));
const missing = names.filter(n => !byName.has(n)), extra = BADGES.filter(b => !names.includes(b.name)).map(b => b.name);
console.log('badges', BADGES.length, 'unique', byName.size, 'missing', missing, 'extra', extra);
const pyFam = JSON.parse(fs.readFileSync(path.join(dir, 'fam.json'), 'utf8'));
const famBad = BADGES.filter(b => (pyFam[b.name] ?? null) !== b.family).map(b => b.name);
console.log('family differences', famBad);
const strs = new Array(ROLLS), ctx = new Array(ROLLS);
for (let i = 0; i < ROLLS; i++) { strs[i] = String(i); ctx[i] = context(strs[i]); }
let bad = 0, t = Date.now();
names.forEach((nm, idx) => {
  const b = byName.get(nm);
  const buf = fs.readFileSync(path.join(dir, idx + '.bin'));
  let diff = 0, first = -1;
  for (let n = 0; n < ROLLS; n++) {
    const got = b.rule(n, strs[n], ctx[n]) ? 1 : 0;
    if (got !== buf[n]) { diff++; if (first < 0) first = n; }
  }
  if (diff) { bad++; console.log('DIFF', nm, diff, 'first at', first); }
});
console.log(`done in ${(Date.now() - t) / 1000}s: ${names.length - bad} of ${names.length} rules identical on all ${ROLLS} rolls`);
