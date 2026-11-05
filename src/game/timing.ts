/* Every roll timing in one place. Times are in milliseconds. Tune here; nothing else hard-codes them. */
import type { Speed } from './save';

/** Reels: how long they spin, the gap between reels stopping, and the pause before auto-roll's next roll. */
export const REELS: Record<Speed, { spin: number; stagger: number; hold: number }> = {
  show: { spin: 620, stagger: 150, hold: 500 },
  fast: { spin: 170, stagger: 34, hold: 170 },
  instant: { spin: 0, stagger: 0, hold: 50 },
};
/** Suspense on the last reel at Show speed, by the roll's final tier (Trash to Mythic). */
export const TENSE = [0, 0, 0, 0, 500, 1300, 2200];

/** The score reveal, one badge at a time after the reels stop. Instant has no reveal.
    badge:     how long each badge stays up
    extra:     added for rarer badges, by badge rarity (Common, Uncommon, Rare, Epic, Anomaly, Mythic)
    count:     how long the EP total takes to count up to include each badge
    outranked: the closing line listing outranked badges (no EP)
    lead:      pause after the reels stop, before the first badge */
export const REVEAL: Record<'show' | 'fast', { badge: number; extra: number[]; count: number; outranked: number; lead: number }> = {
  show: { badge: 1000, extra: [0, 0, 300, 500, 800, 1200], count: 420, outranked: 1300, lead: 250 },
  fast: { badge: 50, extra: [0, 0, 10, 20, 30, 40], count: 40, outranked: 100, lead: 0 },
};
export const badgeMs = (speed: 'show' | 'fast', tier: number) => REVEAL[speed].badge + REVEAL[speed].extra[tier];
