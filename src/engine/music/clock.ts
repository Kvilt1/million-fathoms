/* The transport: a lookahead scheduler on AudioContext time (the "two clocks" pattern).
   A 25 ms setInterval wakes up and schedules every 16th falling in the next 0.12 s of ac.currentTime.
   Timer jitter never reaches the audio: notes are always placed at exact ac times. */
import { STEP, MUSIC_TIMING } from './score';

export type Grid = '16n' | '4n' | 'bar' | 'phrase';
const GRID_STEPS: Record<Grid, number> = { '16n': 1, '4n': 4, bar: 16, phrase: 64 };

export interface Clock {
  start(at: number): void;
  stop(): void;
  readonly running: boolean;
  /** Absolute step index (bar * 16 + step) of the next step still to be scheduled. */
  readonly nextStep: number;
  readonly nextStepTime: number;
  readonly bar: number;
  readonly step: number;
  /** The ac time of the next grid line at or after `from` (default now). */
  quantize(grid: Grid, from?: number): number;
  /** The absolute step sounding at an ac time. */
  stepAt(t: number): number;
  barAt(t: number): number;
  onStep(cb: (abs: number, time: number) => void): void;
  /** Runs when a bar's first step is scheduled, about 0.12 s before its downbeat. */
  onBar(cb: (bar: number, time: number) => void): void;
}

export function createClock(ac: BaseAudioContext): Clock {
  let timer = 0, running = false, abs = 0, nextTime = 0;
  const stepCbs: ((abs: number, time: number) => void)[] = [], barCbs: ((bar: number, time: number) => void)[] = [];
  const tick = () => {
    const until = ac.currentTime + MUSIC_TIMING.lookahead;
    // After a stall (a busy main thread, a resumed context) skip the missed steps instead of firing them all at once.
    const late = ac.currentTime - nextTime;
    if (late > .05) { const k = Math.ceil(late / STEP); abs += k; nextTime += k * STEP; }
    while (nextTime < until) {
      if (abs % 16 === 0) barCbs.forEach(f => f(abs / 16, nextTime));
      stepCbs.forEach(f => f(abs, nextTime));
      abs++; nextTime += STEP;
    }
  };
  const stepAt = (t: number) => abs + Math.floor((t - nextTime) / STEP + 1e-6);
  return {
    start(at: number) {
      if (running) return;
      // Begin at bar 0 of the current phrase, so the 4-bar progression and the lead stay in place.
      abs = Math.floor(abs / 64) * 64; nextTime = Math.max(at, ac.currentTime);
      running = true; tick();
      timer = window.setInterval(tick, MUSIC_TIMING.tickMs);
    },
    stop() { running = false; clearInterval(timer); },
    get running() { return running; },
    get nextStep() { return abs; },
    get nextStepTime() { return nextTime; },
    get bar() { return Math.floor(abs / 16); },
    get step() { return abs % 16; },
    quantize(grid: Grid, from = ac.currentTime) {
      if (!running) return from;
      const g = GRID_STEPS[grid];
      let k = abs + Math.ceil((from - nextTime) / STEP - 1e-6);
      k = Math.ceil(k / g) * g;
      return nextTime + (k - abs) * STEP;
    },
    stepAt,
    barAt: (t: number) => Math.floor(stepAt(t) / 16),
    onStep(cb) { stepCbs.push(cb); },
    onBar(cb) { barCbs.push(cb); },
  };
}
