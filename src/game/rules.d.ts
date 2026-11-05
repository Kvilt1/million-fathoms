/* Types for rules.js. The rules themselves stay plain JS, unchanged from the verified original. */
export interface Ctx {
  cnt: number[]; digits: number[]; sum: number; prod: number; diffs: number[];
  vals: number[]; uniq: number; len: number; multi: number;
}
export interface BadgeDef {
  name: string; icon: string; desc: string; family: string | null;
  rule: (n: number, s: string, x: Ctx) => boolean;
}
export const BADGES: BadgeDef[];
export function context(s: string): Ctx;
export function earnedBadges(n: number): BadgeDef[];
export const MAX_ROLL: number;
export const ROLLS: number;
