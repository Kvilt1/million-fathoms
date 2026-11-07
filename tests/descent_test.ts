/* Descent mode checks (npm run test:descent):
   - each depth's space size, and every badge's count_d recounted by brute force (depths 1 to 5) or
     against Classic's counts (depth 6); counts sum to the badges earned across the space;
   - EP_d follows 100 / p_d, depth 6 uses Classic's table, and depth 6 scores every roll like Classic;
   - depth 6 tier floors equal Classic's;
   - level requirements rise level by level, and reels are added at exactly the right levels;
   - the save round-trips and repairs bad input. */
import { BADGES, context, earnedBadges, ROLLS } from '../src/game/rules.js';
import { scoreRoll, TIERS } from '../src/game/score';
import CLASSIC from '../src/game/data.json';
import DATA from '../src/descent/data.json';
import { sizeAt, scoreAt, FLOORS, rollsBelowAt, reelsAt, BADGES_AT, STATS, rollAt, sampleTotal, trend } from '../src/descent/score';
import { TABLE, LEVELS, gain, depthOf, bar, maxed, leadU } from '../src/descent/levels';
import { PACING } from '../src/descent/pacing';
import { parseDescent, serializeDescent, freshDescent, loadDescent, saveDescentNow, DESCENT_KEY, loadMode, saveMode } from '../src/descent/save';

const fails: string[] = [];
const ok = (cond: boolean, what: string) => { console.log(cond ? '  ok  ' : '  FAIL', what); if (!cond) fails.push(what); };
const counts = DATA.counts as Record<string, number[]>, eps = DATA.eps as Record<string, number[]>;

/* ---------- Spaces and counts ---------- */
ok(DATA.sizes.join() === '10,100,1000,10000,100000,1000001' && sizeAt(6) === ROLLS, `space sizes ${DATA.sizes.join(', ')}`);
ok([1, 2, 3, 4, 5, 6].map(reelsAt).join() === '1,2,3,4,5,7', 'reels per depth: 1 to 5, then 6 plus the carry reel for 1,000,000');
for (let d = 1; d <= 5; d++) {
  const size = sizeAt(d), got = BADGES.map(() => 0);
  let hits = 0;
  for (let n = 0; n < size; n++) { const s = String(n), x = context(s); BADGES.forEach((b, i) => { if (b.rule(n, s, x)) { got[i]++; hits++; } }); }
  const bad = BADGES.filter((b, i) => counts[b.name][d - 1] !== got[i]);
  const sum = BADGES.reduce((a, b) => a + counts[b.name][d - 1], 0);
  ok(!bad.length, `depth ${d}: all ${BADGES.length} counts match a recount of ${size.toLocaleString('en-US')} numbers${bad.length ? ' (' + bad.slice(0, 3).map(b => b.name).join(', ') + ')' : ''}`);
  ok(sum === hits && BADGES.every(b => counts[b.name][d - 1] <= size), `depth ${d}: counts sum to the ${hits.toLocaleString('en-US')} badges earned across the space`);
  ok(rollsBelowAt(Infinity, d) === size, `depth ${d}: total distribution covers exactly ${size.toLocaleString('en-US')} rolls`);
}
const cc = CLASSIC.counts as Record<string, number>, ce = CLASSIC.eps as Record<string, number>;
ok(BADGES.every(b => counts[b.name][5] === cc[b.name]), 'depth 6: counts equal Classic\'s for all 233 badges');
ok(rollsBelowAt(Infinity, 6) === ROLLS, 'depth 6: distribution covers 1,000,001 rolls');
ok(BADGES.every(b => eps[b.name].every((e, i) => i === 5 || (counts[b.name][i] ? e === Math.round(100 * sizeAt(i + 1) / counts[b.name][i]) : e === 0))), 'depths 1 to 5: EP_d = round(100 / p_d), and 0 where the badge can\'t happen');
ok(BADGES.every(b => eps[b.name][5] === ce[b.name]), 'depth 6: EP table is Classic\'s, quirks included');
ok(BADGES_AT[0].some(b => b.count === 0) && BADGES_AT[5].every(b => b.count > 0), 'some badges are locked by depth at depth 1; none at depth 6');
ok(trend('Six Digits', 6) === 'new' && trend('Seven', 3) === 'up' && trend('Even', 2) === 'same' && trend('Pair', 1) === null, 'value trend vs the depth above');

/* ---------- Depth 6 is Classic ---------- */
const PROTECTED: [number, number][] = [[61287, 4634], [142857, 8131], [420420, 100133055], [1000000, 131081274], [403602, 1759]];
for (const [n, want] of PROTECTED) { const r = scoreAt(n, 6); ok(r.total === want && r.tier === scoreRoll(n).tier, `depth 6: ${n} = ${r.total.toLocaleString('en-US')} EP, ${TIERS[r.tier].name} (Classic ${want.toLocaleString('en-US')})`); }
ok(FLOORS[5].join() === TIERS.map(t => t.floor).join(), `depth 6 tier floors equal Classic's (${FLOORS[5].join(', ')})`);
{
  // every 11th roll by default (about 6 s); FULL=1 checks all 1,000,001 (about 70 s)
  const step = process.env.FULL ? 1 : 11, what = step === 1 ? 'all 1,000,001 rolls' : `every ${step}th roll`;
  let diff = -1; const t = Date.now();
  for (let n = 0; n < ROLLS && diff < 0; n += step) { const a = scoreAt(n, 6), b = scoreRoll(n); if (a.total !== b.total || a.tier !== b.tier || a.pct !== b.pct || a.paid.length !== b.paid.length) diff = n; }
  ok(diff < 0, `depth 6 scores ${what} exactly like Classic (total, tier, rank, paid) in ${((Date.now() - t) / 1000).toFixed(1)}s${diff >= 0 ? `; first difference at ${diff}` : ''}`);
}
{
  // a shallow roll is scored on its own unpadded string: 7 at depth 3 is "7", not "007"
  const r = scoreAt(7, 3);
  ok(r.earned.some(b => b.name === 'Single Digit') && !r.earned.some(b => b.name === 'Three Digits') && r.paid.every(b => b.ep === eps[b.name][2]), 'depth 3: 7 scores as "7" with depth 3 EP');
  ok(earnedBadges(7).length === r.earned.length, 'Descent uses the same rule results as Classic');
}
{
  let inRange = true; for (let d = 1; d <= 6; d++) for (let i = 0; i < 2000; i++) { const n = rollAt(d); if (n < 0 || n >= sizeAt(d) || !Number.isInteger(n)) inRange = false; }
  ok(inRange, 'rolls stay inside each depth\'s space');
  ok(sampleTotal(6, 0) === STATS[5].min && sampleTotal(6, .999999999) === STATS[5].max && sampleTotal(1, .5) >= STATS[0].min, 'distribution sampling spans min to max');
}

/* ---------- Levels ---------- */
ok(TABLE.length === 30 && LEVELS === 30, '30 levels, 5 per depth');
ok(TABLE.every((r, i) => i === 0 || r.req > TABLE[i - 1].req), `requirements rise level by level (${TABLE[0].req.toLocaleString('en-US')} to ${TABLE[29].req.toLocaleString('en-US')})`);
ok(TABLE.every((r, i) => r.start === (i ? TABLE[i - 1].end : 0) && r.end === r.start + r.req), 'levels are back to back in lifetime XP');
ok(Math.abs(PACING.levelShare.reduce((a, b) => a + b, 0) - 1) < 1e-9 && PACING.levelShare.every((v, i) => !i || v > PACING.levelShare[i - 1]), 'level shares rise and sum to 1');
ok(TABLE.every(r => r.depth === depthOf(r.level) && r.step >= 1 && r.step <= 5), 'levels 1 to 5 are depth 1, 6 to 10 depth 2, and so on');
{
  // walk from nothing to the cap one level at a time: reels are added only on the 5th level-up of a depth
  let p = { level: 1, depth: 1, xp: 0 }, quiet = true; const seen: string[] = [];
  for (const row of TABLE) {
    const short = gain(p, row.end - 1 - p.xp); if (short.events.length) quiet = false;
    const g = gain(short.p, 1); p = g.p;
    seen.push(g.events.map(e => e.type === 'max' ? 'max' : `${e.type}:${e.level}/${e.depth}`).join('+'));
  }
  ok(quiet, '1 EP short of filling a bar never levels up');
  const want = TABLE.map(r => r.level === 30 ? 'max' : (r.level % 5 === 0 ? 'digit' : 'level') + `:${r.level + 1}/${depthOf(r.level + 1)}`);
  ok(seen.join() === want.join(), 'digit-up exactly when leaving levels 5, 10, 15, 20 and 25; the cap after level 30');
  ok(seen.filter(s => s.startsWith('digit')).map(s => s.split('/')[1]).join() === '2,3,4,5,6', 'each digit-up opens the next depth, 2 to 6');
  ok(maxed(p) && p.level === 30 && p.depth === 6 && gain(p, 1e9).events.length === 0, 'the cap holds: level 30, depth 6, no more level-ups');
  ok(bar(p).have === bar(p).need, 'the capped bar stays full');
}
{
  const g = gain({ level: 1, depth: 1, xp: 0 }, TABLE[6].start + 5);
  ok(g.p.level === 7 && g.p.depth === 2 && g.events.map(e => e.type).join() === 'level,level,level,level,digit,level', 'one huge roll chains level-ups through a digit-up in order');
  ok(bar(g.p).have === 5, 'XP carries over into the next bar');
  ok(leadU(0, 1) === 0 && leadU(TABLE[4].end, 1) < 1 && leadU(TABLE[5].start, 2) >= 1, 'the lead hangs inside the current depth\'s zone');
}

/* ---------- Save and load ---------- */
{
  const mem = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); } };
  ok(JSON.stringify(loadDescent()) === JSON.stringify(freshDescent()), 'no save: fresh Descent at depth 1, level 1');
  const s = { ...freshDescent(), level: 12, depth: 3, xp: TABLE[11].start + 77, rolls: 321, best: { '3': { n: 42, total: 9999, tier: 4 } }, badges: { Pair: 3 }, last: { n: 42, d: 3 } };
  saveDescentNow(s);
  ok(mem.has(DESCENT_KEY) && !mem.has('million-fathoms-v1'), 'Descent saves under its own key, not Classic\'s');
  ok(JSON.stringify(loadDescent()) === JSON.stringify(s), 'save and load round-trip');
  ok(serializeDescent(parseDescent(serializeDescent(s))) === serializeDescent(s), 'parse and serialize are inverse');
  const bad = parseDescent(JSON.stringify({ level: 99, depth: 1, xp: -5, rolls: 'x' }));
  ok(bad.level === 30 && bad.depth === 6 && bad.xp === 0 && bad.rolls === 0, 'bad values are repaired, depth follows level');
  const behind = parseDescent(JSON.stringify({ ...s, level: 1, depth: 1, xp: TABLE[7].start }));
  ok(behind.level === 8 && behind.depth === 2, 'a level the XP already passed is caught up on load');
  ok(parseDescent('not json').level === 1 && parseDescent(null).xp === 0, 'unreadable saves start fresh');
  ok(loadMode() === 'classic', 'mode defaults to Classic'); saveMode('descent'); ok(loadMode() === 'descent', 'mode is remembered');
}

console.log('\nDepth   Space        Median EP/roll   Mean EP/roll');
STATS.forEach((s, i) => console.log(`${i + 1}       ${s.size.toLocaleString('en-US').padEnd(12)} ${s.median.toLocaleString('en-US').padStart(10)}       ${Math.round(s.mean).toLocaleString('en-US').padStart(10)}`));
if (fails.length) { console.log(`\nFAIL ${fails.length}:\n` + fails.join('\n')); process.exit(1); }
console.log('\nPASS: Descent data, scoring, levels and save');
