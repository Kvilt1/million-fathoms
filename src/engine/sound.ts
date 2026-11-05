/* Sound: everything is synthesised live, so the game ships no audio files.
   Clean synth only: sine and triangle tones (triangles low-passed so nothing is harsh), filtered noise
   sweeps, and short pulses. Notes come from C and G major so every chime agrees with the others.
   Downward glides mean going deeper, upward glides mean success. Big moments layer a sub, a sweep and
   a melody; small ones are one or two voices. */
import { clamp, lerp } from '../game/score';
import type { Opts } from '../game/save';

type ToneOpts = { type?: OscillatorType; f1?: number; dur?: number; a?: number; peak?: number; lp?: number; delay?: number };
type NoiseOpts = { dur?: number; lp?: number; sweepTo?: number; hp?: number; peak?: number; a?: number; delay?: number };

/* C major, two octaves from C5, plus G major extensions for the top tiers. */
const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880, B5 = 987.77, C6 = 1046.5, D6 = 1174.66, E6 = 1318.51, G6 = 1567.98;
const LADDER = [261.63, 293.66, 329.63, 392, 440, C5, D5, E5, G5, A5, C6, D6, E6, G6, 1760, 2093];

export function createSound(opts: () => Opts) {
  let ac: AudioContext | undefined, master: DynamicsCompressorNode, out: GainNode | undefined;
  let humGain: GainNode | undefined, humFilter: BiquadFilterNode | undefined, humOsc: OscillatorNode, noiseBuf: AudioBuffer, lastTick = 0;
  const init = () => {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return;
    ac = new C();
    master = ac.createDynamicsCompressor(); const g = ac.createGain();
    g.gain.value = 1; master.connect(g); g.connect(ac.destination); out = g;
    setVolume();
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // The ambient hum: a low sine and a whisper of filtered noise, darker the deeper the lead sits.
    humGain = ac.createGain(); humGain.gain.value = 0;
    humFilter = ac.createBiquadFilter(); humFilter.type = 'lowpass'; humFilter.frequency.value = 300;
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const ng = ac.createGain(); ng.gain.value = .35;
    humOsc = ac.createOscillator(); humOsc.type = 'sine'; humOsc.frequency.value = 55;
    src.connect(ng); ng.connect(humFilter); humOsc.connect(humFilter); humFilter.connect(humGain); humGain.connect(master);
    src.start(); humOsc.start();
    ambient();
  };
  const setVolume = () => { if (out && ac) out.gain.setTargetAtTime(opts().sound ? opts().vol * .75 : 0, ac.currentTime, .02); };
  const ambient = () => { if (humGain && ac) humGain.gain.setTargetAtTime(opts().ambient ? .1 : 0, ac.currentTime, .4); };
  const depth = (u: number) => {
    if (!humFilter || !ac) return;
    humFilter.frequency.setTargetAtTime(lerp(480, 110, clamp(u / 7, 0, 1)), ac.currentTime, .4);
    humOsc.frequency.setTargetAtTime(lerp(55, 36.7, clamp(u / 7, 0, 1)), ac.currentTime, .4);
  };
  const live = () => !!ac && opts().sound;

  /* Envelope: linear attack to `peak`, then an exponential decay over `dur`. */
  function env(g: GainNode, t: number, a: number, peak: number, dur: number) {
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(1e-4, t + a + dur);
  }
  function tone(f0: number, { type = 'sine', f1, dur = .2, a = .005, peak = .3, lp, delay = 0 }: ToneOpts = {}) {
    const c = ac!, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    let node: AudioNode = o;
    if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); node = f; }
    env(g, t, a, peak, dur); node.connect(g); g.connect(master);
    o.start(t); o.stop(t + a + dur + .05);
  }
  function noise({ dur = .3, lp = 1200, sweepTo, hp, peak = .25, a = .003, delay = 0 }: NoiseOpts = {}) {
    const c = ac!, t = c.currentTime + delay, src = c.createBufferSource(), low = c.createBiquadFilter(), g = c.createGain();
    src.buffer = noiseBuf; src.loop = true; low.type = 'lowpass'; low.frequency.setValueAtTime(lp, t);
    if (sweepTo) low.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    src.connect(low); let node: AudioNode = low;
    if (hp) { const h = c.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp; low.connect(h); node = h; }
    env(g, t, a, peak, dur); node.connect(g); g.connect(master);
    src.start(t, Math.random()); src.stop(t + a + dur + .1);
  }
  const arp = (notes: number[], { type = 'triangle' as OscillatorType, step = .12, dur = .5, peak = .14, lp = 3000, delay = 0 } = {}) =>
    notes.forEach((f, i) => tone(f, { type, dur, peak, lp, delay: delay + i * step }));
  const note = (i: number) => LADDER[clamp(i, 0, LADDER.length - 1)];

  return {
    init, setVolume, ambient, depth,
    /** Reel digits passing: a tiny high pulse, throttled. */
    tick() { if (!live()) return; const now = ac!.currentTime; if (now - lastTick < .035) return; lastTick = now; tone(2093, { dur: .018, peak: .035, lp: 5000 }); },
    /** A reel locking: a soft low thud with a short pulse that climbs per reel. */
    clunk(i: number) { if (!live()) return; tone(150, { f1: 70, dur: .12, peak: .2, lp: 600 }); tone(note(5 + i), { type: 'triangle', dur: .07, peak: .06, lp: 3000 }); noise({ dur: .05, lp: 900, peak: .05 }); },
    ui() { if (!live()) return; tone(1150, { dur: .08, a: .003, peak: .09 }); },
    /** Pressing Roll: a short downward whoosh and sub drop. */
    press() { if (!live()) return; noise({ dur: .45, lp: 2000, sweepTo: 240, peak: .12 }); tone(110, { f1: 48, dur: .5, peak: .26 }); },
    /** A badge landing. Higher badges in the reveal climb the ladder; rarer tiers add an octave and a fifth. */
    ping(i: number, tier: number) {
      if (!live()) return;
      const f = note(4 + Math.min(i, 8) + tier);
      tone(f, { type: 'triangle', dur: .22 + tier * .05, peak: .12, lp: 3200 });
      tone(f * 2, { dur: .08, peak: .03 + tier * .01 });
      if (tier >= 2) tone(f / 2, { dur: .35 + tier * .08, peak: .1, delay: .02 });
      if (tier >= 3) tone(f * 1.5, { type: 'triangle', dur: .4, peak: .07, lp: 3000, delay: .07 });
    },
    blip(t: number) { if (!live()) return; tone(note(6 + t * 2), { dur: .07, peak: .07 }); },
    /** Crossing into a new zone: a sonar ping with an echo, lower the deeper it is. */
    sonar(u: number) { if (!live()) return; const f = lerp(1175, 587, clamp(u / 7, 0, 1)); tone(f, { dur: .7, a: .01, peak: .1 }); tone(f, { dur: .5, a: .01, peak: .035, delay: .34 }); },
    /** The reels have stopped and the EP starts to count: a darkening noise rush under a falling sine. */
    plunge() { if (!live()) return; noise({ dur: .9, lp: 1400, sweepTo: 180, peak: .12 }); tone(300, { f1: 60, dur: .9, peak: .08 }); },
    /** Suspense on the last reel: a sub-bass double pulse. */
    heart() { if (!live()) return; tone(66, { f1: 40, dur: .14, peak: .38 }); tone(58, { f1: 38, dur: .16, peak: .26, delay: .17 }); },
    /** The final tier: one layered moment per tier. */
    stinger(t: number) {
      if (!live()) return;
      if (t === 0) { tone(220, { f1: 52, dur: .6, peak: .2 }); noise({ dur: .4, lp: 400, peak: .1, delay: .05 }); return; }
      if (t <= 2) { tone(140, { f1: 70, dur: .25, peak: .26, lp: 600 }); noise({ dur: .14, lp: 500, peak: .08 }); if (t === 2) tone(C5, { type: 'triangle', dur: .4, peak: .09, lp: 3000, delay: .1 }); return; }
      tone(80, { f1: 45, dur: .6, peak: .34 });
      noise({ dur: .7, lp: 900, sweepTo: 200, peak: .15, delay: .02 });
      if (t === 3) { arp([G5, C6], { step: .1, dur: .45, peak: .1, delay: .12 }); return; }
      if (t === 4) { arp([E5, G5, C6], { step: .11, dur: .55, peak: .11, delay: .12 }); return; }
      // Anomaly and Mythic: an upward filter sweep and a rising arpeggio
      noise({ dur: 1.2, lp: 300, sweepTo: 4000, hp: 600, peak: .06, delay: .1 });
      if (t === 5) { arp([D5, G5, B5, D6], { step: .12, dur: .6, peak: .12, delay: .15 }); return; }
      tone(60, { f1: 40, dur: 1.2, peak: .34 });
      arp([G5, B5, D6, G6], { step: .13, dur: .7, peak: .15, delay: .15 });
      tone(G6, { dur: 1.4, a: .02, peak: .05, delay: .7 }); tone(D6, { dur: 1.4, a: .02, peak: .05, delay: .7 });
      noise({ dur: 1.4, lp: 2500, hp: 1200, peak: .05, delay: .45 });
    },
    /** A new badge: a two-note "nice". */
    fresh() { if (!live()) return; arp([C6, G6], { type: 'sine', step: .08, dur: .2, peak: .09 }); },
    /** A finished set: an airy upward swish and two bright notes. */
    fanfareSet() { if (!live()) return; noise({ dur: .35, lp: 900, sweepTo: 4200, hp: 400, peak: .07 }); tone(B5, { type: 'triangle', dur: .32, peak: .1, lp: 3500, delay: .12 }); tone(E6, { type: 'triangle', dur: .55, peak: .1, lp: 3500, delay: .24 }); },
  };
}
export type Sound = ReturnType<typeof createSound>;
