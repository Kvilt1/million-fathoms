/* "Loaded Grid": the music as pure data. No Web Audio here, so tests can import it.
   112 BPM, A natural minor, one chord per bar looping Am Am F Em. Scale degrees work like Strudel's
   n(...).scale("X:minor"): degree 0 is the scale root, 7 the octave, negatives go below. */

export const BPM = 112;
/** One 16th note in seconds. */
export const STEP = 60 / BPM / 4;
export const BEAT = STEP * 4;
export const BAR = STEP * 16;
/** The dotted-eighth echo: three 16ths, about 0.402 s. */
export const ECHO = STEP * 3;
/** Scale degrees from A, one per bar: Am, Am, F, Em. Never stops. */
export const PROG = [0, 0, -2, -3] as const;
/** A natural minor in semitones above A. */
export const A_MINOR = [0, 2, 3, 5, 7, 8, 10];

/** MIDI number of A in a given octave (A0 = 21, A3 = 57). */
export const aAt = (octave: number) => 12 * (octave + 1) + 9;
export function degToMidi(rootMidi: number, deg: number) {
  const o = Math.floor(deg / 7), i = deg - o * 7;
  return rootMidi + 12 * o + A_MINOR[i];
}
export const midiToHz = (m: number) => 440 * 2 ** ((m - 69) / 12);
export const progAt = (bar: number) => PROG[((bar % 4) + 4) % 4];
export const phraseBar = (bar: number) => ((bar % 4) + 4) % 4;

/** The chord sounding in a bar: its root degree and the triad [0, 2, 4] above that root. */
export function chordAt(bar: number) {
  const rootDeg = progAt(bar);
  return { rootDeg, tones: (octaveRootMidi: number) => [0, 2, 4].map(d => degToMidi(octaveRootMidi, rootDeg + d)) };
}
/** Highest pitch a chord-tone ladder may reach (about C7, where the old LADDER topped out). */
export const PITCH_MAX_HZ = 2100;
/** The i-th chord tone going up from the chord root in `octave` (the root sits in that octave, so
    Am from A3, F from F3, Em from E3). Clamped to the highest chord tone under PITCH_MAX_HZ. */
export function chordToneMidi(bar: number, i: number, octave = 3) {
  const root = progAt(bar), base = aAt(octave);
  const at = (k: number) => degToMidi(base, root + 2 * (k % 3) + 7 * Math.floor(k / 3));
  let k = Math.max(0, Math.floor(i));
  while (k > 0 && midiToHz(at(k)) > PITCH_MAX_HZ) k--;
  return at(k);
}

/* ---------- Patterns: 16 steps per bar. A step is null (rest) or a list of degrees ---------- */
export type Step = number[] | null;
export type Pattern = Step[][]; // a list of bars, each 16 steps
const _ = null, X = [0];
const bars = (...b: Step[][]): Pattern => b;
const from8 = (eighths: (number | [number, number] | null)[]): Step[] => {
  // An 8th-note line; a pair splits its 8th into two 16ths.
  const out: Step[] = Array(16).fill(null);
  eighths.forEach((v, i) => {
    if (v === null) return;
    if (Array.isArray(v)) { out[i * 2] = [v[0]]; out[i * 2 + 1] = [v[1]]; } else out[i * 2] = [v];
  });
  return out;
};
const leadA = [
  from8([7, _, 6, _, 4, _, _, _]),
  from8([_, _, 4, 5, [6, 7], _, 4, _]),
  from8([5, _, 4, _, 2, _, _, _]),
  from8([_, _, 2, 3, [4, 3], _, 1, _]),
];
const up = (b: Step[], d: number): Step[] => b.map(s => s && s.map(x => x + d));

/** Degrees are offsets from the bar's chord root, except the lead, which keeps its own phrase. */
export const PATTERNS = {
  pad: bars([[0, 2, 4], _, _, _, _, _, _, _, _, _, _, _, _, _, _, _]),
  arp: bars([[0], [4], [7], [4], [0], [4], [7], [4], [0], [4], [7], [4], [0], [4], [7], [4]]),
  bass: bars([_, X, X, _, _, X, X, [2], _, X, X, _, _, X, [-1], X]),
  /** Bass variant B (unlock): a straight 16th roll on bar 4 of a phrase. */
  bassRoll: bars(Array.from({ length: 16 }, () => X)),
  /** 4-bar call and response, absolute degrees from A3. */
  lead: bars(...leadA),
  /** Lead variant B (unlock): the answer on bars 3 and 4 an octave up. */
  leadB: bars(leadA[0], leadA[1], up(leadA[2], 7), up(leadA[3], 7)),
  kick: bars([X, _, _, _, X, _, _, _, X, _, _, _, X, _, _, _]),
  clank: bars([_, _, _, X, _, _, X, _, _, _, _, _, _, X, _, _]),
  hats: bars([_, _, X, _, _, _, X, _, _, _, X, _, _, _, X, _]),
  ghost: bars(Array.from({ length: 16 }, () => X)),
  clap: bars([_, _, _, _, X, _, _, _, _, _, _, _, X, _, _, _]),
} satisfies Record<string, Pattern>;
/** Root of each pitched part, as the MIDI note of A in its octave. */
export const ROOTS = { pad: aAt(2), arp: aAt(2), bass: aAt(1), lead: aAt(3), drone: aAt(0), clank: aAt(4), hadal: [aAt(3), aAt(3) + 7, aAt(4)] };
/** Strudel-style split: a lead note lasts one 8th, or one 16th when it is half of a split pair. */
export const leadLen = (bar: Step[], i: number) => (i % 2 === 1 || bar[i + 1] ? 1 : 2);

/* ---------- Layers and levels ---------- */
export type Layer = 'pad' | 'drone' | 'arp' | 'bass' | 'lead' | 'kick' | 'clank' | 'hats' | 'clap' | 'hadal';
export const LAYERS: Layer[] = ['pad', 'drone', 'arp', 'bass', 'lead', 'kick', 'clank', 'hats', 'clap', 'hadal'];
/** Per-note peak gains (Strudel's values, treated as relative levels). */
export const GAIN = {
  pad: .09, drone: .22, arp: .22, arpGhost: .08, bass: .38, lead: .11, kick: .34, clank: .16,
  hats: .16, ghostLo: .02, ghostHi: .08, hatFill: .1, clap: .2, riser: .1, hadal: .05, crash: .12, stab: .12,
};
/** Mix trims in dB over GAIN, measured on the real output so each part sits where the 3a draft has it:
    bass on top, arp and lead just under, pad and drone as a bed, and the kick kept quiet. The drums
    need a lift because their envelopes (exponential to silence) are far shorter than 909 samples. */
export const MIX_DB = { pad: -1.2, drone: -4.2, arp: 1.5, bass: -2.6, lead: .8, kick: -3.5, clank: 8, hats: 13, clap: 12, hadal: 8 };
const TRIM_OF: Record<keyof typeof GAIN, keyof typeof MIX_DB | null> = {
  pad: 'pad', drone: 'drone', arp: 'arp', arpGhost: 'arp', bass: 'bass', lead: 'lead', kick: 'kick', clank: 'clank',
  hats: 'hats', ghostLo: 'hats', ghostHi: 'hats', hatFill: 'hats', clap: 'clap', riser: null, hadal: 'hadal', crash: null, stab: null,
};
/** GAIN with the mix trims applied: the per-note peaks the voices actually use. */
export const VOICE_GAIN = Object.fromEntries(Object.entries(GAIN).map(([k, v]) => {
  const t = TRIM_OF[k as keyof typeof GAIN];
  return [k, v * (t ? 10 ** (MIX_DB[t] / 20) : 1)];
})) as typeof GAIN;
export interface Level { name: string; layers: Layer[]; arpLpf: [number, number] }
const L0: Layer[] = ['pad', 'drone', 'arp', 'clank'];
const L1: Layer[] = [...L0, 'kick', 'bass', 'hats'];
const L2: Layer[] = [...L1, 'clap', 'lead'];
export const LEVELS: Level[] = [
  { name: 'IDLE', layers: L0, arpLpf: [500, 650] },
  { name: 'GROOVE', layers: L1, arpLpf: [700, 1200] },
  { name: 'HOOK', layers: L2, arpLpf: [1200, 1600] },
  { name: 'DROP', layers: [...L2], arpLpf: [2400, 3000] },
];
/** Arp brightness across a phrase: L0 to L2 open up bar by bar; the drop starts bright, dips, comes back. */
export function arpLpfFor(level: number, bar: number) {
  const [lo, hi] = LEVELS[level].arpLpf, b = phraseBar(bar);
  const shape = level === 3 ? [1, .5, 0, 0] : [0, 1 / 3, 2 / 3, 1];
  return lo + (hi - lo) * shape[b];
}
/** The build during a reveal: arp lowpass from 500 Hz at u=0 to 3000 Hz at u=7 on a log curve. */
export const zoneLpf = (u: number) => 500 * 6 ** (Math.min(7, Math.max(0, u)) / 7);

/** Extra material the save unlocks, keyed by the deepest tier ever reached (S.best.tier). */
export type Unlock = 'leadB' | 'arpGhost' | 'bassRoll' | 'hadal';
export const UNLOCKS: { tier: number; key: Unlock; what: string }[] = [
  { tier: 3, key: 'leadB', what: 'lead answered an octave up on bars 3 and 4, every other phrase at L3' },
  { tier: 4, key: 'arpGhost', what: 'arp octave-up ghost at L3' },
  { tier: 5, key: 'bassRoll', what: 'bass 16th roll on bar 4 of each phrase at L3' },
  { tier: 6, key: 'hadal', what: 'Hadal pad (A3 E4 A4 sines) at L2 and L3' },
];
export const unlocked = (bestTier: number) => new Set(UNLOCKS.filter(u => bestTier >= u.tier).map(u => u.key));

/* ---------- Heat ---------- */
export const HEAT = {
  result: [-.05, .04, .06, .10, .16, .25, .40],
  best: .15, set: .10, fastMult: .5,
  /** Bars after a result before heat starts to cool, and how fast. */
  graceBars: 2, decay: .02,
  /** After about 30 s idle (14 bars) it cools faster. */
  longIdleBars: 14, longDecay: .05,
  /** Level thresholds (L1, L2, L3) and the hysteresis band either side. */
  levels: [.15, .35, .6], hyst: .05,
};

/* ---------- Moments, by roll tier ---------- */
export type MomentKind = 'powerdown' | 'hook' | 'drop' | 'break' | 'hadal';
export const MOMENTS: ({ kind: MomentKind; level: number; bars: number } | null)[] = [
  { kind: 'powerdown', level: 0, bars: 2 },
  null, // Common: a clank flam only
  null, // Uncommon: a hat fill only
  { kind: 'hook', level: 2, bars: 4 },
  { kind: 'drop', level: 3, bars: 8 },
  { kind: 'break', level: 3, bars: 8 }, // plus 1 bar of break before it
  { kind: 'hadal', level: 3, bars: 16 },
];
/** The Epic stab, A4 C5 E5 A5 in 8ths (degrees from A3). */
export const STAB = [7, 9, 11, 14];

/* ---------- Timing and mix (seconds, dB) ---------- */
export const MUSIC_TIMING = {
  tickMs: 25, lookahead: .12,
  bootFadeBars: 2, fadeBars: 1, hiddenFade: .3,
  powerdown: .5, tense: .3, drawer: .25, depth: .4,
  duck: { stinger: [-4, 300], ping: [-1.5, 120], fanfareSet: [-3, 400] } as Record<string, [number, number]>,
  drawerDuckDb: -6, drawerMuffle: 700, powerdownMuffle: 180, openMuffle: 20000,
};
