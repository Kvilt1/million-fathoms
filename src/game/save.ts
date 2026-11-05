/* Saved progress. Same key and shape as the original, so existing saves carry over. */
export const SAVE_KEY = 'million-fathoms-v1';
export type Speed = 'show' | 'fast' | 'instant';
export interface Opts { sound: boolean; vol: number; ambient: boolean; speed: Speed; autoStop: string; effects: boolean }
export interface LogEntry { n: number; t: number; k: number; f: number }
export interface SaveState {
  rolls: number; life: number; best: { n: number; total: number; tier: number } | null; tiers: number[];
  badges: Record<string, number>; sets: Record<string, unknown>; log: LogEntry[]; bestDive: number; opts: Opts;
}
export const fresh = (): SaveState => ({
  rolls: 0, life: 0, best: null, tiers: [0, 0, 0, 0, 0, 0, 0], badges: {}, sets: {}, log: [], bestDive: 0,
  opts: { sound: true, vol: .7, ambient: true, speed: 'show', autoStop: '5', effects: true },
});
export function load(): SaveState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) { const p = JSON.parse(raw); return { ...fresh(), ...p, opts: { ...fresh().opts, ...p.opts } }; }
  } catch { /* the game still works without saved progress */ }
  return fresh();
}
let saveTimer = 0;
export function save(S: SaveState) {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch { /* storage unavailable */ } }, 250);
}
