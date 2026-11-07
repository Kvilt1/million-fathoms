/* The Descent level table and level-up logic. Pure: no DOM, no storage.
   Level L (1 to 30) sits at depth ceil(L / 5). Filling a level's bar is a level-up; filling the last
   level's bar at a depth adds the next reel; filling level 30's bar reaches the cap. XP is lifetime
   Descent EP and only goes up; each level's bar fills with the XP earned since the level began. */
import { PACING } from './pacing';
import { STATS } from './score';

const P = PACING;
export const LEVELS = P.levelsPerDepth * P.maxDepth;
export const depthOf = (level: number) => Math.ceil(level / P.levelsPerDepth);
const sig = (v: number, k: number) => { if (v <= 0) return 0; const m = 10 ** (Math.floor(Math.log10(v)) - k + 1); return Math.max(m, Math.round(v / m) * m); };

export interface LevelRow {
  level: number; depth: number; /** 1st to 5th level at its depth */ step: number;
  /** EP to fill this level's bar */ req: number; /** lifetime XP when this level begins and ends */ start: number; end: number;
  /** typical rolls this level is meant to take */ targetRolls: number;
}
export const TABLE: LevelRow[] = (() => {
  const rows: LevelRow[] = [];
  let at = 0;
  for (let level = 1; level <= LEVELS; level++) {
    const depth = depthOf(level), step = level - (depth - 1) * P.levelsPerDepth;
    const targetRolls = P.targetRolls[depth - 1] * P.levelShare[step - 1];
    const req = sig(targetRolls * STATS[depth - 1][P.basis], P.sigFigs);
    rows.push({ level, depth, step, req, start: at, end: at + req, targetRolls });
    at += req;
  }
  return rows;
})();
/** Last level at each depth: filling its bar adds a reel. */
export const isDigitLevel = (level: number) => level % P.levelsPerDepth === 0 && level < LEVELS;

export interface Progress { level: number; depth: number; xp: number }
export type LevelEvent =
  | { type: 'level'; level: number; depth: number }   // reached `level`, same depth
  | { type: 'digit'; level: number; depth: number }   // reached `level`, which opens `depth` and adds a reel
  | { type: 'max' };                                  // filled the last level's bar
export const maxed = (p: Progress) => p.level === LEVELS && p.xp >= TABLE[LEVELS - 1].end;
/** The bar for the current level: EP earned into it and EP it needs. */
export function bar(p: Progress) {
  const row = TABLE[p.level - 1];
  return { have: Math.min(row.req, Math.max(0, p.xp - row.start)), need: row.req };
}
/** Add EP. Returns the new progress and every level-up it caused, in order. A big roll can chain several. */
export function gain(p: Progress, ep: number): { p: Progress; events: LevelEvent[] } {
  const wasMax = maxed(p), q = { ...p, xp: p.xp + ep }, events: LevelEvent[] = [];
  while (q.level < LEVELS && q.xp >= TABLE[q.level - 1].end) {
    const digit = isDigitLevel(q.level);
    q.level++; q.depth = depthOf(q.level);
    events.push({ type: digit ? 'digit' : 'level', level: q.level, depth: q.depth });
  }
  if (!wasMax && maxed(q)) events.push({ type: 'max' });
  return { p: q, events };
}
/** Where the lead hangs for some XP while at `depth`: inside zone `depth`, sunk by progress through its levels. */
export function leadU(xp: number, depth: number) {
  const first = TABLE[(depth - 1) * P.levelsPerDepth], last = TABLE[depth * P.levelsPerDepth - 1];
  const f = Math.min(1, Math.max(0, (xp - first.start) / (last.end - first.start)));
  return depth - 1 + f * .98;
}
/** Median rolls a level takes, simulated from the depth's exact roll distribution. Seeded, so repeatable. */
export function simulateRolls(row: LevelRow, sample: (d: number, r: number) => number, trials = 201) {
  let seed = 12345 + row.level;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const runs: number[] = [];
  for (let t = 0; t < trials; t++) { let ep = 0, k = 0; while (ep < row.req) { ep += sample(row.depth, rnd()); k++; } runs.push(k); }
  runs.sort((a, b) => a - b);
  return runs[trials >> 1];
}
