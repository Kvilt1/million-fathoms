/* The director: a pure state machine, no Web Audio. Game events come in as MusicEvent cues;
   reduce() folds them into the state, barTick() advances it one bar (heat decay, level changes on
   phrase boundaries, moments expiring) and targets() says what every layer should do in a bar.
   Heat sets the energy (which layers play); depth sets the pressure (drone, reverb, clank density). */
import {
  HEAT, MOMENTS, LEVELS, LAYERS, MUSIC_TIMING, unlocked, arpLpfFor, zoneLpf, phraseBar,
  type Layer, type MomentKind,
} from './score';

export type Speed = 'show' | 'fast';
export type MusicEvent =
  | { type: 'press'; speed: Speed }
  | { type: 'tense' }                                  // last reel suspense began
  | { type: 'reelsStopped' }
  | { type: 'badge'; i: number; tier: number; zoneU: number }
  | { type: 'tierUp'; tier: number }                   // the running total crossed into a new tier mid-reveal
  | { type: 'result'; tier: number; u: number; best: boolean; fresh: number; sets: number; firstTier: boolean; speed: Speed; preview: boolean }
  | { type: 'skip' }
  | { type: 'drawer'; open: boolean }
  | { type: 'finish'; open: boolean }                  // Mythic card
  | { type: 'depth'; u: number }
  | { type: 'unlocks'; bestTier: number }
  | { type: 'reset' };                                 // progress wiped: heat back to zero
export type Phase = 'idle' | 'spin' | 'tense' | 'reveal';
export interface Moment { kind: MomentKind; tier: number; start: number; bars: number; level: number; hold: boolean }
/** One-off sounds the director asks for; index.ts schedules them. */
export type Shot =
  | { kind: 'riser' }               // Roll pressed: a riser into the next downbeat
  | { kind: 'riserHold' }           // Epic or better reached mid-reveal: climb until the result
  | { kind: 'riserStop' }
  | { kind: 'crash'; bar: number }
  | { kind: 'stab'; bar: number }   // the Epic arpeggio
  | { kind: 'silence'; bar: number } // Mythic: one beat of nothing
  | { kind: 'flam' }                // Common: an extra clank flam on the next beat
  | { kind: 'cancel' };             // Skip: drop pings not yet played
export interface DirState {
  heat: number; level: number; moment: Moment | null; phase: Phase;
  revealTier: number; revealU: number; depthU: number; bestTier: number; muffled: boolean;
  idleBars: number; speed: Speed; fillBar: number | null; finishOpen: boolean;
  shots: Shot[];
}
export interface Targets {
  level: number; moment: MomentKind | null;
  /** Layer level multipliers, 0 to 1, over each layer's base gain. */
  gains: Record<Layer, number>;
  arpLpf: number; muffle: number; glassDb: number;
  leadB: boolean; leadOct: number; arpGhost: boolean; bassRoll: boolean; kickDist: number; pump: boolean;
  riser: boolean; hatFill: boolean; clankExtra: number;
  droneGain: number; droneLfo: [number, number]; padReverb: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const round = (v: number) => Math.round(v * 1e4) / 1e4;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function initial(bestTier = 0): DirState {
  return {
    heat: 0, level: 0, moment: null, phase: 'idle', revealTier: 0, revealU: 0, depthU: 0, bestTier, muffled: false,
    idleBars: 0, speed: 'show', fillBar: null, finishOpen: false, shots: [],
  };
}
/** Level from heat, with hysteresis: climb only past threshold + band, fall only below threshold - band. */
export function levelFor(level: number, heat: number) {
  const th = HEAT.levels, h = HEAT.hyst;
  let l = level;
  while (l < 3 && heat > round(th[l] + h)) l++;
  while (l > 0 && heat < round(th[l - 1] - h)) l--;
  return l;
}
/** The bar a moment stops at. Like the reference's drop, a moment may end mid-phrase. */
export const momentEnd = (m: Moment) => m.start + m.bars;
export function activeMoment(s: DirState, bar: number) {
  const m = s.moment;
  return m && bar >= m.start && (m.hold || bar < momentEnd(m)) ? m : null;
}
/** The heat a result adds: the tier's step (halved at Fast), plus a new best and finished sets. Watch rolls add none. */
export function heatFor(e: Extract<MusicEvent, { type: 'result' }>) {
  if (e.preview) return 0;
  return HEAT.result[e.tier] * (e.speed === 'fast' ? HEAT.fastMult : 1) + (e.best ? HEAT.best : 0) + e.sets * HEAT.set;
}

/** Fold one event into the state. `nextBar` is the bar of the next downbeat, where moments start. */
export function reduce(s: DirState, e: MusicEvent, nextBar: number): DirState {
  const n: DirState = { ...s, shots: [] };
  switch (e.type) {
    case 'press':
      n.phase = 'spin'; n.speed = e.speed; n.revealTier = 0; n.revealU = 0;
      if (e.speed === 'show') n.shots.push({ kind: 'riser' });
      break;
    case 'tense': if (n.speed === 'show') n.phase = 'tense'; break;
    case 'reelsStopped': n.phase = 'reveal'; break;
    case 'badge': n.phase = 'reveal'; n.revealU = Math.max(n.revealU, e.zoneU); break;
    case 'tierUp':
      if (n.phase === 'idle') break;
      if (e.tier >= 4 && n.revealTier < 4 && n.speed === 'show') n.shots.push({ kind: 'riserHold' });
      n.revealTier = Math.max(n.revealTier, e.tier);
      break;
    case 'skip': n.phase = 'idle'; n.shots.push({ kind: 'cancel' }, { kind: 'riserStop' }); break;
    case 'result': {
      n.phase = 'idle'; n.idleBars = 0; n.revealTier = 0; n.revealU = 0; n.speed = e.speed;
      n.shots.push({ kind: 'riserStop' });
      n.heat = round(clamp01(n.heat + heatFor(e)));
      if (e.tier === 1) n.shots.push({ kind: 'flam' });
      if (e.tier === 2) n.fillBar = nextBar;
      const def = MOMENTS[e.tier];
      if (!def) break;
      const cur = s.moment && (s.moment.hold || nextBar < momentEnd(s.moment)) ? s.moment : null;
      if (cur && e.tier < cur.tier) break;
      const bars = e.speed === 'fast' ? Math.ceil(def.bars / 2) : def.bars;
      // The power-down starts at once (it is how the Trash stinger lands); the rest wait for the downbeat.
      if (def.kind === 'powerdown') n.moment = { kind: 'powerdown', tier: 0, start: nextBar - 1, bars: 1 + bars, level: 0, hold: false };
      else n.moment = { kind: def.kind, tier: e.tier, start: nextBar, bars: def.kind === 'break' ? 1 + bars : bars, level: def.level, hold: def.kind === 'hadal' && n.finishOpen };
      if (def.kind === 'hook' || def.kind === 'drop') n.shots.push({ kind: 'crash', bar: nextBar });
      if (def.kind === 'drop') n.shots.push({ kind: 'stab', bar: nextBar });
      if (def.kind === 'hadal') n.shots.push({ kind: 'silence', bar: nextBar });
      break;
    }
    case 'drawer': n.muffled = e.open; break;
    case 'finish':
      n.finishOpen = e.open;
      if (n.moment?.kind === 'hadal') n.moment = { ...n.moment, hold: e.open };
      break;
    case 'depth': n.depthU = e.u; break;
    case 'unlocks': n.bestTier = e.bestTier; break;
    case 'reset': return { ...initial(0), depthU: s.depthU, muffled: s.muffled, finishOpen: s.finishOpen };
  }
  return n;
}

/** Advance into `bar` (called once per bar, as it is scheduled). */
export function barTick(s: DirState, bar: number): DirState {
  const n: DirState = { ...s, shots: [], idleBars: s.idleBars + 1 };
  if (n.phase === 'idle' && n.idleBars > HEAT.graceBars) n.heat = round(clamp01(n.heat - (n.idleBars > HEAT.longIdleBars ? HEAT.longDecay : HEAT.decay)));
  if (n.moment && !n.moment.hold && bar >= momentEnd(n.moment)) n.moment = null;
  if (n.fillBar !== null && bar > n.fillBar) n.fillBar = null;
  if (bar % 4 === 0) n.level = levelFor(n.level, n.heat);
  return n;
}

/** What every layer does in `bar`. */
export function targets(s: DirState, bar: number): Targets {
  const m = activeMoment(s, bar), kind = m?.kind ?? null;
  let level = s.level;
  if (m && kind !== 'powerdown' && bar >= m.start + (kind === 'break' ? 1 : 0)) level = Math.max(level, m.level);
  if (s.finishOpen) level = 3;
  const un = unlocked(s.bestTier), on = new Set(LEVELS[level].layers);
  const gains = Object.fromEntries(LAYERS.map(l => [l, on.has(l) ? 1 : 0])) as Record<Layer, number>;
  const drop = level === 3, isBreak = kind === 'break' && bar === m!.start;
  gains.hadal = (level >= 2 && un.has('hadal')) || kind === 'hadal' ? 1 : 0;
  let arpLpf = arpLpfFor(level, bar);
  if (isBreak) { gains.kick = 0; gains.bass = 0; }
  if (s.speed === 'show') {
    if (s.phase === 'spin') { arpLpf = 380; gains.arp = .9; }
    else if (s.phase === 'tense') {
      gains.pad = .35; gains.arp = .35; gains.clank = .35; arpLpf = 260;
      gains.kick = gains.hats = gains.bass = gains.clap = gains.lead = 0;
    } else if (s.phase === 'reveal') {
      if (s.revealTier >= 2) gains.kick = 1;
      if (s.revealTier >= 3) { gains.bass = 1; gains.hats = 1; }
      arpLpf = zoneLpf(s.revealU);
    }
  }
  const T = MUSIC_TIMING;
  let muffle = s.muffled ? T.drawerMuffle : T.openMuffle;
  if (kind === 'powerdown') {
    for (const l of LAYERS) if (l !== 'drone' && l !== 'pad' && l !== 'hadal') gains[l] = 0;
    muffle = Math.min(muffle, T.powerdownMuffle);
  }
  const f = clamp01(s.depthU / 7);
  return {
    level, moment: kind, gains, arpLpf, muffle, glassDb: s.muffled ? T.drawerDuckDb : 0,
    leadB: drop && un.has('leadB') && Math.floor(bar / 4) % 2 === 1,
    leadOct: kind === 'hadal' ? 1 : 0,
    arpGhost: drop && (un.has('arpGhost') || kind === 'break'),
    bassRoll: drop && un.has('bassRoll') && phraseBar(bar) === 3,
    kickDist: kind === 'hadal' ? .55 : .45,
    pump: drop,
    riser: isBreak,
    hatFill: s.fillBar === bar,
    clankExtra: Math.round(2 * f),
    droneGain: lerp(.22, .3, f), droneLfo: [lerp(70, 60, f), lerp(180, 140, f)], padReverb: lerp(.85, 1, f),
  };
}
