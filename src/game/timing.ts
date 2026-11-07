/* Every roll timing in one place. Times are in milliseconds. Tune here; nothing else hard-codes them. */
import type { Speed } from './save';

/** Instant is never chosen from the menu; a hidden tab uses it so rolls don't wait on animations. */
export type RunSpeed = Speed | 'instant';

/** Reels: how long they spin and the gap between reels stopping. */
export const REELS: Record<RunSpeed, { spin: number; stagger: number }> = {
  show: { spin: 620, stagger: 150 },
  fast: { spin: 170, stagger: 34 },
  instant: { spin: 0, stagger: 0 },
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

/** Descent, after the reveal: the roll's EP climbs into the level bar, then each level-up plays in turn.
    climb:  the "+EP" label rising from the counter into the bar
    fill:   the bar filling (CSS transition)
    level:  a level-up moment
    digit:  a digit-up moment: the new reel slides in and the zone name flashes
    enter:  how long the new reel takes to slide in (CSS animation) */
export const DESCENT: Record<'show' | 'fast', { climb: number; fill: number; level: number; digit: number; enter: number }> = {
  show: { climb: 600, fill: 650, level: 900, digit: 1900, enter: 800 },
  fast: { climb: 160, fill: 180, level: 380, digit: 1000, enter: 450 },
};
