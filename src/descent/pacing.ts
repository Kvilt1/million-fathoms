/* Every Descent pacing number lives here. Tune freely: levels.ts builds the level table from this,
   test:descent checks the result still rises level by level, and the dev Level table (#dev) shows the
   effect, including how many rolls each level really takes. */
export const PACING = {
  /** Levels per depth. The last level-up at a depth adds the next reel. */
  levelsPerDepth: 5,
  /** Deepest depth for now. Its last level is the cap; the Hadal Trench comes in a later step. */
  maxDepth: 6,
  /** Typical rolls to clear each depth (all 5 of its levels), depths 1 to 6. */
  targetRolls: [25, 120, 700, 3000, 15000, 50000],
  /** Share of a depth's target rolls that each of its levels takes, first to last. Rising; sums to 1. */
  levelShare: [0.14, 0.17, 0.2, 0.23, 0.26],
  /** What one "typical roll" is worth when turning rolls into EP. 'median' keeps rare jackpots from
      skewing the pacing; 'mean' is what EP actually averages out to over many rolls. */
  basis: 'median' as 'median' | 'mean',
  /** Requirements are rounded to this many significant figures so the bar reads cleanly. */
  sigFigs: 2,
};
