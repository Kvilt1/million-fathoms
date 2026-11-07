/* Descent progress, under its own key so it never touches Classic's save. The chosen mode has a key of
   its own too, so switching modes doesn't change Classic's save either. */
import { LEVELS, depthOf, gain } from './levels';

export const DESCENT_KEY = 'million-fathoms-descent-v1';
export const MODE_KEY = 'million-fathoms-mode';
export type Mode = 'classic' | 'descent';
export interface DBest { n: number; total: number; tier: number }
export interface DescentSave {
  v: 1;
  depth: number; level: number; /** lifetime Descent EP */ xp: number; rolls: number;
  /** best roll at each depth, keyed '1' to '6' */ best: Record<string, DBest>;
  /** badges found in Descent and how often, for the codex */ badges: Record<string, number>;
  /** the last roll, to show again on load */ last: { n: number; d: number } | null;
}
export const freshDescent = (): DescentSave => ({ v: 1, depth: 1, level: 1, xp: 0, rolls: 0, best: {}, badges: {}, last: null });

const num = (v: unknown, lo: number, hi: number, dflt: number) => typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.floor(v))) : dflt;
/** Read a stored save, repairing anything out of range. A level the XP has already passed is caught up
    silently; a stored level is never lowered, even if the pacing was retuned since. */
export function parseDescent(raw: string | null): DescentSave {
  const f = freshDescent();
  if (!raw) return f;
  try {
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object') return f;
    const level = num(p.level, 1, LEVELS, 1), xp = num(p.xp, 0, Number.MAX_SAFE_INTEGER, 0);
    const d: DescentSave = {
      v: 1, depth: depthOf(level), level, xp, rolls: num(p.rolls, 0, Number.MAX_SAFE_INTEGER, 0),
      best: p.best && typeof p.best === 'object' ? p.best : {},
      badges: p.badges && typeof p.badges === 'object' ? p.badges : {},
      last: p.last && typeof p.last.n === 'number' && typeof p.last.d === 'number' ? { n: p.last.n, d: p.last.d } : null,
    };
    const caught = gain(d, 0).p;
    d.level = caught.level; d.depth = caught.depth;
    return d;
  } catch { return f; }
}
export const serializeDescent = (d: DescentSave) => JSON.stringify(d);

const store = (): Storage | null => { try { return globalThis.localStorage ?? null; } catch { return null; } };
export function loadDescent(): DescentSave { try { return parseDescent(store()?.getItem(DESCENT_KEY) ?? null); } catch { return freshDescent(); } }
export function saveDescentNow(d: DescentSave) { try { store()?.setItem(DESCENT_KEY, serializeDescent(d)); } catch { /* storage unavailable */ } }
let timer: ReturnType<typeof setTimeout> | undefined;
export function saveDescent(d: DescentSave) { clearTimeout(timer); timer = setTimeout(() => saveDescentNow(d), 250); }
export function loadMode(): Mode { try { return store()?.getItem(MODE_KEY) === 'descent' ? 'descent' : 'classic'; } catch { return 'classic'; } }
export function saveMode(m: Mode) { try { store()?.setItem(MODE_KEY, m); } catch { /* storage unavailable */ } }
