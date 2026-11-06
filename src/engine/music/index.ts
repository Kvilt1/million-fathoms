/* The Music API. Builds the layer chains on the buses, runs the clock, feeds cues to the director and
   turns its targets into gain ramps and scheduled notes. Sound effects use at(), pitch() and duck()
   to land on the grid and in the chord. */
import type { Opts } from '../../game/save';
import {
  BAR, BEAT, STEP, VOICE_GAIN as GAIN, MIX_DB, PATTERNS, ROOTS, STAB, LAYERS, MUSIC_TIMING as T,
  chordAt, chordToneMidi, degToMidi, midiToHz, progAt, phraseBar, leadLen, type Layer,
} from './score';
import { initial, reduce, barTick, targets, activeMoment, type MusicEvent, type Targets, type Shot } from './director';
import { createClock, type Grid } from './clock';
import { createBuses, glide, dbToGain } from './fx';
import { createVoices, createDrone, createHadal, distCurve, crushCurve } from './voices';

export type { MusicEvent } from './director';
export interface MusicDeps { ac: AudioContext; out: AudioNode; noiseBuf: AudioBuffer; opts: () => Opts; best?: () => number }
/** Overall music level before the player's Music volume. Calibrated so the music sits about 7 dB under the SFX. */
export const MUSIC_TRIM = .09;

/** How quickly the layers follow each kind of event, in seconds. */
const EVENT_RAMP: Partial<Record<MusicEvent['type'], number>> = {
  press: .3, tense: T.tense, reelsStopped: BAR, badge: .25, tierUp: .15, skip: .2, drawer: T.drawer, finish: .3, depth: T.depth, unlocks: BAR, reset: BAR,
};

export function createMusic({ ac, out, noiseBuf, opts, best }: MusicDeps) {
  const fx = createBuses(ac, out), clock = createClock(ac);
  const now = () => ac.currentTime;
  const gainNode = (v = 1) => { const g = ac.createGain(); g.gain.value = v; return g; };
  const filt = (type: BiquadFilterType, f: number, q = .7071) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const shaper = (curve: Float32Array) => { const s = ac.createWaveShaper(); s.curve = curve as Float32Array<ArrayBuffer>; s.oversample = '2x'; return s; };
  const send = (from: AudioNode, to: AudioNode, v: number) => { const g = gainNode(v); from.connect(g); g.connect(to); return g; };

  /* ---------- Layer chains: voice input -> inserts -> layer gain (L) -> bus, plus sends ---------- */
  const L = Object.fromEntries(LAYERS.map(l => { const g = gainNode(0); g.connect(fx.bus); return [l, g]; })) as Record<Layer, GainNode>;
  const padIn = gainNode(), padLp = filt('lowpass', 520), padPump = gainNode();
  padIn.connect(padLp); padLp.connect(padPump); padPump.connect(L.pad);
  const padRev = send(L.pad, fx.reverb, .85);
  const arpIn = gainNode(), arpPan = ac.createStereoPanner(), arpPump = gainNode();
  arpIn.connect(arpPan); arpPan.connect(arpPump); arpPump.connect(L.arp); send(L.arp, fx.delay, .3);
  const panLfo = ac.createOscillator(), panAmt = gainNode(.4); panLfo.frequency.value = 1 / (4 * BAR); panLfo.connect(panAmt); panAmt.connect(arpPan.pan); panLfo.start();
  const bassIn = gainNode(); bassIn.connect(shaper(distCurve(.35))).connect(L.bass);
  const leadIn = gainNode(); leadIn.connect(filt('lowpass', 1500, 3)).connect(L.lead); send(L.lead, fx.delay, .45); send(L.lead, fx.reverb, .5);
  const vibLfo = ac.createOscillator(), vib = gainNode(8); vibLfo.frequency.value = 5; vibLfo.connect(vib); vibLfo.start();
  const kickCurves = { .45: distCurve(.45), .55: distCurve(.55) } as Record<number, Float32Array>;
  const kickIn = gainNode(), kickSh = shaper(kickCurves[.45]); kickIn.connect(kickSh).connect(filt('lowpass', 750)).connect(L.kick);
  const clankIn = gainNode(); clankIn.connect(filt('highpass', 1400)).connect(L.clank); send(L.clank, fx.reverb, .45);
  const hatsIn = gainNode(); hatsIn.connect(L.hats);
  const clapIn = gainNode(); clapIn.connect(filt('bandpass', 1200, 1.1)).connect(shaper(crushCurve(7))).connect(L.clap); send(L.clap, fx.reverb, .5);
  const riserIn = gainNode(); riserIn.connect(fx.bus);
  const crashIn = gainNode(); crashIn.connect(fx.bus); send(crashIn, fx.reverb, .7);
  const stabIn = gainNode(); stabIn.connect(fx.bus); send(stabIn, fx.delay, .4);
  const fillIn = gainNode(); fillIn.connect(fx.bus);
  const drone = createDrone(ac, L.drone, ROOTS.drone);
  const hadalLvl = gainNode(GAIN.hadal); hadalLvl.connect(L.hadal); send(L.hadal, fx.reverb, .6);
  createHadal(ac, hadalLvl, ROOTS.hadal);
  const V = createVoices(ac, noiseBuf, { kick: kickIn, hats: hatsIn, clap: clapIn, clank: clankIn, arp: arpIn, bass: bassIn, lead: leadIn, pad: padIn, riser: riserIn, crash: crashIn, stab: stabIn }, vib);

  /* ---------- Director state and applied targets ---------- */
  let d = initial(best?.() ?? 0), cur: Targets = targets(d, 0), playing = false, stopTimer = 0, lastBar = 0;
  const applied = new Map<string, number>(), fadeUntil: Partial<Record<Layer, number>> = {};
  /** The arp lowpass is per note, so it follows a JS ramp (exponential between two points). */
  let lpf = { v0: cur.arpLpf, v1: cur.arpLpf, t0: 0, t1: 0 };
  const lpfAt = (t: number) => t <= lpf.t0 ? lpf.v0 : t >= lpf.t1 ? lpf.v1 : lpf.v0 * (lpf.v1 / lpf.v0) ** ((t - lpf.t0) / (lpf.t1 - lpf.t0));
  const set = (key: string, p: AudioParam, v: number, t0: number, dur: number) => {
    if (applied.get(key) === v) return; applied.set(key, v); glide(p, v, t0, dur);
  };
  function apply(t: Targets, dur: number) {
    const t0 = now();
    for (const l of LAYERS) {
      const was = applied.get('L.' + l) ?? 0, v = t.gains[l];
      if (was > 0 && v === 0) fadeUntil[l] = t0 + dur * 1.2 + .05;
      set('L.' + l, L[l].gain, v, t0, dur);
    }
    if (Math.abs(lpfAt(t0) - t.arpLpf) > 1 || lpf.v1 !== t.arpLpf) lpf = { v0: lpfAt(t0), v1: t.arpLpf, t0, t1: t0 + Math.max(dur, .05) };
    set('muffle', fx.muffle.frequency, t.muffle, t0, t.moment === 'powerdown' ? T.powerdown : dur);
    set('glass', fx.glass.gain, dbToGain(t.glassDb), t0, T.drawer);
    set('drone', drone.lvl.gain, t.droneGain * dbToGain(MIX_DB.drone), t0, T.depth);
    set('padRev', padRev.gain, t.padReverb, t0, T.depth);
    if (applied.get('lfo') !== t.droneLfo[0] * 1e4 + t.droneLfo[1]) { applied.set('lfo', t.droneLfo[0] * 1e4 + t.droneLfo[1]); drone.range(t.droneLfo[0], t.droneLfo[1], t0, T.depth / 3); }
    if (applied.get('kickDist') !== t.kickDist) { applied.set('kickDist', t.kickDist); kickSh.curve = kickCurves[t.kickDist] as Float32Array<ArrayBuffer>; }
    cur = t;
  }
  const audible = (l: Layer, time: number) => cur.gains[l] > 0 || (fadeUntil[l] ?? 0) > time;
  /** The ac time of an absolute bar's downbeat. */
  const barTime = (bar: number) => clock.nextStepTime + (bar * 16 - clock.nextStep) * STEP;
  const schedBar = () => Math.max(0, Math.floor((clock.nextStep - 1) / 16));

  /* ---------- Per bar and per step ---------- */
  let clankSteps = new Set<number>(), ghost = .05;
  clock.onBar((bar, time) => {
    lastBar = bar;
    d = barTick(d, bar);
    apply(targets(d, bar), Math.max(.03, time - now()));
    const base = PATTERNS.clank[0], free = base.map((s, i) => s ? -1 : i).filter(i => i >= 0);
    clankSteps = new Set(base.flatMap((s, i) => s ? [i] : []));
    for (let k = 0; k < cur.clankExtra; k++) clankSteps.add(free.splice(Math.floor(Math.random() * free.length), 1)[0]);
    if (cur.riser) risers.push(V.riser(time, time + BAR, { gain: GAIN.riser }));
  });
  const pump = (t: number) => {
    for (const p of [padPump.gain, arpPump.gain]) { p.setValueAtTime(1, t); p.linearRampToValueAtTime(.7, t + .005); p.linearRampToValueAtTime(1, t + .125); }
  };
  clock.onStep((abs, time) => {
    const bar = Math.floor(abs / 16), st = abs % 16, root = progAt(bar), t = cur;
    if (audible('kick', time) && PATTERNS.kick[0][st]) { V.kick(time, null, { gain: GAIN.kick }); if (t.pump) pump(time); }
    if (audible('hats', time)) {
      if (PATTERNS.hats[0][st]) V.hat(time, null, { gain: GAIN.hats, hp: 7000 });
      ghost = Math.min(GAIN.ghostHi, Math.max(GAIN.ghostLo, ghost + (Math.random() - .5) * .014));
      if (!t.hatFill) V.hat(time, null, { gain: ghost, hp: 9000, dec: .03 });
    }
    if (t.hatFill) for (const k of [0, .5]) V.hat(time + k * STEP, null, { gain: GAIN.hatFill, hp: 9000, dec: .03, to: fillIn });
    if (audible('clap', time) && PATTERNS.clap[0][st]) V.clap(time, null, { gain: GAIN.clap });
    if (audible('clank', time) && clankSteps.has(st)) V.clank(time, midiToHz(ROOTS.clank), { gain: GAIN.clank, pan: Math.random() * 2 - 1 });
    if (audible('arp', time)) {
      const m = degToMidi(ROOTS.arp, PATTERNS.arp[0][st]![0] + root), f = lpfAt(time);
      V.arp(time, midiToHz(m), { gain: GAIN.arp, lpf: f });
      if (t.arpGhost) V.arp(time, midiToHz(m + 12), { gain: GAIN.arpGhost, lpf: f * 1.5 });
    }
    if (audible('bass', time)) {
      const s = (t.bassRoll ? PATTERNS.bassRoll : PATTERNS.bass)[0][st];
      if (s) V.bass(time, midiToHz(degToMidi(ROOTS.bass, s[0] + root)), { gain: GAIN.bass, len: STEP * .92 });
    }
    if (audible('lead', time)) {
      const ph = (t.leadB ? PATTERNS.leadB : PATTERNS.lead)[phraseBar(bar)], s = ph[st];
      if (s) V.lead(time, midiToHz(degToMidi(ROOTS.lead, s[0]) + 12 * t.leadOct), { gain: GAIN.lead, len: leadLen(ph, st) * STEP });
    }
    if (st === 0 && audible('pad', time)) V.pad(time, PATTERNS.pad[0][0]!.map(x => midiToHz(degToMidi(ROOTS.pad, x + root))), { gain: GAIN.pad, len: BAR });
  });

  /* ---------- One-shots ---------- */
  let risers: { stop(t: number): void; until: number }[] = [];
  let pending: { src: AudioScheduledSourceNode; t: number }[] = [];
  function shot(s: Shot) {
    const t0 = now();
    switch (s.kind) {
      case 'riser': {
        let t1 = clock.quantize('bar'); if (t1 - t0 < BAR / 2) t1 += BAR;
        risers.push(V.riser(t0 + .01, t1, { gain: GAIN.riser }));
        break;
      }
      case 'riserHold': risers.push(V.riser(t0 + .01, t0 + 2 * BAR, { gain: GAIN.riser, hold: true })); break;
      case 'riserStop': risers.forEach(r => r.stop(t0)); risers = []; break;
      case 'crash': V.crash(barTime(s.bar), null, { gain: GAIN.crash }); break;
      case 'stab': STAB.forEach((deg, i) => V.stab(barTime(s.bar) + i * 2 * STEP, midiToHz(degToMidi(ROOTS.lead, deg)), { gain: GAIN.stab })); break;
      case 'silence': { const b = barTime(s.bar); fx.silence(b, b + BEAT); break; }
      case 'flam': { const b = clock.quantize('4n'); V.clank(b, midiToHz(ROOTS.clank), { gain: GAIN.clank, pan: -.4 }); V.clank(b + .028, midiToHz(ROOTS.clank), { gain: GAIN.clank * .7, pan: .4 }); break; }
      case 'cancel': pending.forEach(p => { if (p.t > t0) try { p.src.stop(); } catch { /* already stopped */ } }); pending = []; break;
    }
  }

  const api = {
    /** Fade in over `fadeBars` and run the clock (from bar 0 of the current phrase). */
    start(fadeBars: number = T.fadeBars) {
      clearTimeout(stopTimer);
      if (playing) return;
      playing = true;
      if (!clock.running) clock.start(now() + .05);
      glide(fx.fade.gain, 1, now(), fadeBars * BAR);
    },
    /** Fade out, then stop the clock so nothing runs in the background. */
    stop(fadeSec: number = BAR * T.fadeBars) {
      if (!playing) return;
      playing = false;
      glide(fx.fade.gain, 0, now(), fadeSec);
      clearTimeout(stopTimer);
      stopTimer = window.setTimeout(() => { if (!playing) { clock.stop(); shot({ kind: 'riserStop' }); } }, fadeSec * 1000 + 250);
    },
    /** Feed a game event to the director, then schedule whatever changed. */
    cue(e: MusicEvent) {
      const nextBar = clock.running ? clock.barAt(clock.quantize('bar')) : lastBar + 1;
      d = reduce(d, e, nextBar);
      if (!clock.running) { cur = targets(d, lastBar); return; }
      if (playing) d.shots.forEach(shot);
      apply(targets(d, schedBar()), EVENT_RAMP[e.type] ?? .3);
    },
    /** The next grid line at or after `from` (now by default). With the clock stopped, `from` itself. */
    at(grid: Grid, from?: number) { return clock.quantize(grid, from); },
    /** The chord sounding at ac.currentTime. */
    chord() { const c = chordAt(clock.running ? clock.barAt(now()) : lastBar); return { rootDeg: c.rootDeg, tones: c.tones }; },
    /** The i-th chord tone going up from the chord root in `octave`, in Hz, for the chord sounding at `time`. */
    pitch(i: number, octave = 3, time?: number) { return midiToHz(chordToneMidi(clock.running ? clock.barAt(time ?? now()) : lastBar, i, octave)); },
    /** Dip the music so a sound effect pokes through, optionally timed to land at `at`. */
    duck(db: number, ms: number, at?: number) { if (playing) fx.duckBy(db, ms, at); },
    /** Echo and room sends for sound effects that should ring in tempo. */
    sends: { delay: fx.delay as AudioNode, reverb: fx.reverb as AudioNode },
    /** Register a scheduled SFX source so Skip can cancel it before it plays. */
    hold(src: AudioScheduledSourceNode, t: number) { const t0 = now(); pending = pending.filter(p => p.t > t0); pending.push({ src, t }); },
    setVolume() { glide(fx.musicVol.gain, (opts().musicVol ?? .6) * MUSIC_TRIM, now(), .05); },
    state() {
      const bar = clock.running ? clock.barAt(now()) : lastBar, m = d.moment && (activeMoment(d, bar) || d.moment.start > bar) ? d.moment : null;
      return {
        playing, bar: clock.bar, step: clock.step, level: cur.level, heatLevel: d.level, heat: d.heat, phase: d.phase,
        moment: m ? m.kind : null, muffled: d.muffled, bestTier: d.bestTier,
      };
    },
  };
  api.setVolume();
  return api;
}
export type Music = ReturnType<typeof createMusic>;
