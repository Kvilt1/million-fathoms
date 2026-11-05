/* Checks every rule and the full scorer against tests/baseline.json, which was recorded from the
   original plain-JS game on all 1,000,001 rolls, plus the protected scores. Run: npm run test:rules */
import { readFileSync } from 'node:fs';
import { BADGES, context, ROLLS } from '../src/game/rules.js';
import { scoreRoll, rollsBelow, BY_NAME } from '../src/game/score';

const base = JSON.parse(readFileSync(new URL('./baseline.json', import.meta.url), 'utf8'));
const fails: string[] = [];
const fnv = () => ({ h: 2166136261, add(v: number) { for (let k = 0; k < 4; k++) { this.h ^= (v >>> (8 * k)) & 255; this.h = Math.imul(this.h, 16777619) >>> 0; } } });

const PROTECTED: [number, number][] = [[61287, 4634], [142857, 8131], [420420, 100133055], [1000000, 131081274], [403602, 1759]];
for (const [n, want] of PROTECTED) { const got = scoreRoll(n).total; if (got !== want) fails.push(`${n} scores ${got}, expected ${want}`); }
console.log('protected scores', PROTECTED.map(([n]) => `${n}=${scoreRoll(n).total.toLocaleString('en-US')}`).join(', '));
for (const nm of ['Power of Seven', 'Power of Five']) console.log(nm, 'EP', BY_NAME.get(nm)!.ep);

if (BADGES.length !== base.badges.length) fails.push(`badge count ${BADGES.length}, baseline ${base.badges.length}`);
const t0 = Date.now();
const rules = BADGES.map(() => ({ count: 0, f: fnv() })), score = fnv();
for (let n = 0; n < ROLLS; n++) {
  const s = String(n), x = context(s);
  for (let i = 0; i < BADGES.length; i++) if (BADGES[i].rule(n, s, x)) { rules[i].count++; rules[i].f.add(n); }
  const r = scoreRoll(n);
  score.add(r.total); score.add(r.tier); score.add(rollsBelow(r.total)); score.add(r.fm); score.add(r.paid.length);
}
BADGES.forEach((b, i) => {
  const want = base.badges[i];
  if (want.name !== b.name || want.family !== b.family) fails.push(`badge ${i} is ${b.name} (${b.family}), baseline ${want.name} (${want.family})`);
  else if (want.count !== rules[i].count || want.hash !== rules[i].f.h) fails.push(`${b.name}: ${rules[i].count} rolls, baseline ${want.count}`);
});
if (score.h !== base.scoreHash) fails.push('scores differ from baseline on at least one roll');
console.log(`${BADGES.length} rules and every roll's score checked on all ${ROLLS.toLocaleString('en-US')} rolls in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
if (fails.length) { console.log('FAIL\n' + fails.join('\n')); process.exit(1); }
console.log('PASS: rules and scores identical to the baseline');
