/* Sound: everything is synthesised live, so the game ships no audio files.
   Clean synth only: sine and triangle tones (triangles low-passed so nothing is harsh), filtered noise
   sweeps, and short pulses. Downward glides mean going deeper, upward glides mean success. Big moments
   layer a sub, a sweep and a melody; small ones are one or two voices.
   With Music on, the effects become part of the soundtrack ("Loaded Grid", in A minor, which shares every
   note with the C and G major chimes): each one is pitched to the chord sounding at that moment, and the
   melodic ones land on the 16th-note grid and echo in tempo. With Music off they sound exactly as before. */
import { clamp, lerp } from '../game/score';
import type { Opts } from '../game/save';
import { createMusic, type Music } from './music';
import { STEP, ECHO, MUSIC_TIMING, aAt, degToMidi, midiToHz } from './music/score';

type ToneOpts = { type?: OscillatorType; f1?: number; dur?: number; a?: number; peak?: number; lp?: number; delay?: number; at?: number; echo?: number };
type NoiseOpts = { dur?: number; lp?: number; sweepTo?: number; hp?: number; peak?: number; a?: number; delay?: number; at?: number };

/* C major, two octaves from C5, plus G major extensions for the top tiers. */
const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880, B5 = 987.77, C6 = 1046.5, D6 = 1174.66, E6 = 1318.51, G6 = 1567.98;
const LADDER = [261.63, 293.66, 329.63, 392, 440, C5, D5, E5, G5, A5, C6, D6, E6, G6, 1760, 2093];

export function createSound(opts: () => Opts, best?: () => number) {
  let ac: AudioContext | undefined, master: DynamicsCompressorNode, out: GainNode | undefined;
  let noiseBuf: AudioBuffer, lastTick = 0, music: Music | undefined, tensed = false, lastHeart = 0;
  const init = () => {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return;
    ac = new C();
    master = ac.createDynamicsCompressor(); const g = ac.createGain();
    g.gain.value = 1; master.connect(g); g.connect(ac.destination); out = g;
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    music = createMusic({ ac, out: master, noiseBuf, opts, best });
    setVolume(MUSIC_TIMING.bootFadeBars);
  };
  const wanted = () => opts().sound && opts().ambient && !document.hidden;
  /** Start or stop the music to match the Sound and Music switches and page visibility. */
  const syncMusic = (fadeBars?: number) => { if (!music) return; if (wanted()) music.start(fadeBars); else music.stop(document.hidden ? MUSIC_TIMING.hiddenFade : undefined); };
  const setVolume = (fadeBars?: number) => {
    if (out && ac) out.gain.setTargetAtTime(opts().sound ? opts().vol * .75 : 0, ac.currentTime, .02);
    music?.setVolume(); syncMusic(fadeBars);
  };
  /** The Music switch (the old ambient hum is gone; the music's drone carries depth now). */
  const ambient = () => syncMusic();
  const depth = (u: number) => music?.cue({ type: 'depth', u });
  const live = () => !!ac && opts().sound;
  /** The music, when it is actually playing; null means "sound as before". */
  const mus = () => (music && music.state().playing ? music : null);

  /* Envelope: linear attack to `peak`, then an exponential decay over `dur`. */
  function env(g: GainNode, t: number, a: number, peak: number, dur: number) {
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(1e-4, t + a + dur);
  }
  function tone(f0: number, { type = 'sine', f1, dur = .2, a = .005, peak = .3, lp, delay = 0, at, echo }: ToneOpts = {}) {
    const c = ac!, t = at ?? c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    let node: AudioNode = o;
    if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); node = f; }
    env(g, t, a, peak, dur); node.connect(g); g.connect(master);
    if (echo && music) { const s = c.createGain(); s.gain.value = echo; g.connect(s); s.connect(music.sends.delay); }
    o.start(t); o.stop(t + a + dur + .05);
    return o;
  }
  function noise({ dur = .3, lp = 1200, sweepTo, hp, peak = .25, a = .003, delay = 0, at }: NoiseOpts = {}) {
    const c = ac!, t = at ?? c.currentTime + delay, src = c.createBufferSource(), low = c.createBiquadFilter(), g = c.createGain();
    src.buffer = noiseBuf; src.loop = true; low.type = 'lowpass'; low.frequency.setValueAtTime(lp, t);
    if (sweepTo) low.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    src.connect(low); let node: AudioNode = low;
    if (hp) { const h = c.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp; low.connect(h); node = h; }
    env(g, t, a, peak, dur); node.connect(g); g.connect(master);
    src.start(t, Math.random()); src.stop(t + a + dur + .1);
  }
  const arp = (notes: number[], { type = 'triangle' as OscillatorType, step = .12, dur = .5, peak = .14, lp = 3000, delay = 0, at, echo }: { type?: OscillatorType; step?: number; dur?: number; peak?: number; lp?: number; delay?: number; at?: number; echo?: number } = {}) =>
    notes.forEach((f, i) => tone(f, { type, dur, peak, lp, echo, ...(at === undefined ? { delay: delay + i * step } : { at: at + i * step }) }));
  const note = (i: number) => LADDER[clamp(i, 0, LADDER.length - 1)];
  /** Chord tones i.. for the chord sounding at `at`. */
  const tones = (m: Music, idx: number[], at: number, octave = 3) => idx.map(i => m.pitch(i, octave, at));

  return {
    init, setVolume, ambient, depth,
    /** The page was hidden or shown: never let the scheduler run in a background tab. */
    visibility() { syncMusic(); },
    /** The soundtrack, once init() has run. */
    get music() { return music; },
    /** Reel digits passing: a tiny high pulse, throttled. With music, the chord's 5th, as a ghost hat. */
    tick() {
      if (!live()) return; const now = ac!.currentTime; if (now - lastTick < .035) return; lastTick = now;
      const m = mus();
      if (m) tone(m.pitch(2, 5), { dur: .018, peak: .025, lp: 5000 }); else tone(2093, { dur: .018, peak: .035, lp: 5000 });
    },
    /** A reel locking: a soft low thud with a short pulse that climbs per reel (up the chord, with music). */
    clunk(i: number) {
      if (!live()) return; const m = mus();
      if (m) { const r = m.pitch(0, 2); tone(r, { f1: r / 2, dur: .12, peak: .2, lp: 600 }); tone(m.pitch(i, 3), { type: 'triangle', dur: .07, peak: .06, lp: 3000 }); }
      else { tone(150, { f1: 70, dur: .12, peak: .2, lp: 600 }); tone(note(5 + i), { type: 'triangle', dur: .07, peak: .06, lp: 3000 }); }
      noise({ dur: .05, lp: 900, peak: .05 });
    },
    ui() {
      if (!live()) return; const m = mus();
      if (!m) { tone(1150, { dur: .08, a: .003, peak: .09 }); return; }
      // The chord tone nearest 1150 Hz, a little quieter.
      const fs = Array.from({ length: 12 }, (_, i) => m.pitch(i, 3));
      tone(fs.reduce((b, f) => (Math.abs(f - 1150) < Math.abs(b - 1150) ? f : b)), { dur: .08, a: .003, peak: .07 });
    },
    /** Pressing Roll: a short downward whoosh and sub drop (the sub on the chord root, with music). */
    press() {
      if (!live()) return; tensed = false;
      noise({ dur: .45, lp: 2000, sweepTo: 240, peak: .12 });
      const m = mus();
      if (m) { const r = m.pitch(0, 1); tone(r, { f1: r / 2, dur: .5, peak: .3 }); } else tone(110, { f1: 48, dur: .5, peak: .26 });
    },
    /** A badge landing. Higher badges in the reveal climb the ladder; rarer tiers add an octave and a fifth.
        With music it climbs the chord's tones, lands on the next 16th and echoes in tempo. */
    ping(i: number, tier: number, zoneU?: number) {
      if (!live()) return;
      const m = mus();
      if (!m) {
        const f = note(4 + Math.min(i, 8) + tier);
        tone(f, { type: 'triangle', dur: .22 + tier * .05, peak: .12, lp: 3200 });
        tone(f * 2, { dur: .08, peak: .03 + tier * .01 });
        if (tier >= 2) tone(f / 2, { dur: .35 + tier * .08, peak: .1, delay: .02 });
        if (tier >= 3) tone(f * 1.5, { type: 'triangle', dur: .4, peak: .07, lp: 3000, delay: .07 });
        return;
      }
      const at = m.at('16n'), idx = 4 + Math.min(i, 8) + tier, f = m.pitch(idx, 3, at);
      const os = [tone(f, { type: 'triangle', dur: .22 + tier * .05, peak: .12, lp: 3200, at, echo: .35 }), tone(f * 2, { dur: .08, peak: .03 + tier * .01, at })];
      if (tier >= 2) os.push(tone(f / 2, { dur: .35 + tier * .08, peak: .1, at: at + .02 }));
      if (tier >= 3) os.push(tone(m.pitch(idx + 1, 3, at), { type: 'triangle', dur: .4, peak: .07, lp: 3000, at: at + STEP / 2, echo: .25 }));
      os.forEach(o => m.hold(o, at));
      m.duck(...MUSIC_TIMING.duck.ping, at);
      if (zoneU !== undefined) m.cue({ type: 'badge', i, tier, zoneU });
    },
    /** The Fast reveal and the number checker. With music, a chord tone on the grid plus a hat accent. */
    blip(t: number) {
      if (!live()) return; const m = mus();
      if (!m) { tone(note(6 + t * 2), { dur: .07, peak: .07 }); return; }
      const at = m.at('16n');
      tone(m.pitch(4 + t, 3, at), { dur: .07, peak: .06, at });
      noise({ dur: .03, lp: 14000, hp: 7000, peak: .05, at });
    },
    /** Crossing into a new zone: a sonar ping with an echo, lower the deeper it is. With music, the chord root
        (octave 6 near the surface, 5 deep down) and an echo on the dotted eighth. Mid-reveal calls pass the tier. */
    sonar(u: number, tier?: number) {
      if (!live()) return; const m = mus();
      if (!m) { const f = lerp(1175, 587, clamp(u / 7, 0, 1)); tone(f, { dur: .7, a: .01, peak: .1 }); tone(f, { dur: .5, a: .01, peak: .035, delay: .34 }); return; }
      const f = m.pitch(0, Math.round(lerp(6, 5, clamp(u / 7, 0, 1))));
      tone(f, { dur: .7, a: .01, peak: .1 }); tone(f, { dur: .5, a: .01, peak: .035, delay: ECHO });
      if (tier !== undefined) m.cue({ type: 'tierUp', tier });
    },
    /** The reels have stopped and the EP starts to count: a darkening noise rush under a falling sine. */
    plunge() {
      if (!live()) return; tensed = false;
      noise({ dur: .9, lp: 1400, sweepTo: 180, peak: .12 });
      const m = mus();
      if (m) { const f = m.pitch(2, 3); tone(f, { f1: f / 5, dur: .9, peak: .08 }); m.cue({ type: 'reelsStopped' }); }
      else tone(300, { f1: 60, dur: .9, peak: .08 });
    },
    /** Suspense on the last reel: a sub-bass double pulse. With music, on the beat and on the chord root. */
    heart() {
      if (!live()) return; const m = mus();
      if (!m) { tone(66, { f1: 40, dur: .14, peak: .38 }); tone(58, { f1: 38, dur: .16, peak: .26, delay: .17 }); return; }
      if (!tensed) { tensed = true; m.cue({ type: 'tense' }); }
      const at = m.at('4n'); if (Math.abs(at - lastHeart) < .05) return; lastHeart = at;
      const r = m.pitch(0, 1, at);
      tone(r, { f1: r * .66, dur: .14, peak: .38, at }); tone(r, { f1: r * .62, dur: .16, peak: .26, at: at + 2 * STEP });
    },
    /** The final tier: one layered moment per tier. With music the melodic parts are chord tones on the grid;
        the hits fire at once so they stay with the shake, burst and whiteout. */
    stinger(t: number) {
      if (!live()) return;
      const m = mus();
      if (m) m.duck(...MUSIC_TIMING.duck.stinger);
      // With music, a melodic part starting `d` seconds in lands on the next 16th after that.
      const q = (d: number) => m!.at('16n', ac!.currentTime + d);
      if (t === 0) { tone(220, { f1: 52, dur: .6, peak: .2 }); noise({ dur: .4, lp: 400, peak: .1, delay: .05 }); return; }
      if (t <= 2) {
        tone(140, { f1: 70, dur: .25, peak: .26, lp: 600 }); noise({ dur: .14, lp: 500, peak: .08 });
        if (t === 2) { if (m) { const at = q(.1); tone(m.pitch(4, 3, at), { type: 'triangle', dur: .4, peak: .09, lp: 3000, at, echo: .3 }); } else tone(C5, { type: 'triangle', dur: .4, peak: .09, lp: 3000, delay: .1 }); }
        return;
      }
      tone(80, { f1: 45, dur: .6, peak: .34 });
      noise({ dur: .7, lp: 900, sweepTo: 200, peak: .15, delay: .02 });
      const mel = (idx: number[], d: number, o: { dur: number; peak: number }, fallback: number[], step: number) => {
        if (m) { const at = q(d); arp(tones(m, idx, at), { ...o, step: STEP, at, echo: .3 }); } else arp(fallback, { ...o, step, delay: d });
      };
      if (t === 3) { mel([6, 7], .12, { dur: .45, peak: .1 }, [G5, C6], .1); return; }
      if (t === 4) { mel([5, 6, 7], .12, { dur: .55, peak: .11 }, [E5, G5, C6], .11); return; }
      // Anomaly and Mythic: an upward filter sweep and a rising arpeggio
      noise({ dur: 1.2, lp: 300, sweepTo: 4000, hp: 600, peak: .06, delay: .1 });
      if (t === 5) { mel([4, 5, 6, 7], .15, { dur: .6, peak: .12 }, [D5, G5, B5, D6], .12); return; }
      tone(60, { f1: 40, dur: 1.2, peak: .34 });
      mel([6, 7, 8, 9], .15, { dur: .7, peak: .15 }, [G5, B5, D6, G6], .13);
      if (m) { const at = q(.7); const [hi, lo] = tones(m, [9, 8], at); tone(hi, { dur: 1.4, a: .02, peak: .05, at }); tone(lo, { dur: 1.4, a: .02, peak: .05, at }); }
      else { tone(G6, { dur: 1.4, a: .02, peak: .05, delay: .7 }); tone(D6, { dur: 1.4, a: .02, peak: .05, delay: .7 }); }
      noise({ dur: 1.4, lp: 2500, hp: 1200, peak: .05, delay: .45 });
    },
    /** A new badge: a two-note "nice". With music, the chord's 5th then its octave in the lead's square voice. */
    fresh() {
      if (!live()) return; const m = mus();
      if (!m) { arp([C6, G6], { type: 'sine', step: .08, dur: .2, peak: .09 }); return; }
      const at = m.at('16n');
      arp(tones(m, [2, 3], at, 4), { type: 'square', step: STEP, dur: .22, peak: .04, lp: 1800, at, echo: .4 });
    },
    /** A finished set: an airy upward swish and two bright notes. With music, the first bar of the lead hook
        (A G E) an octave up, on the next beat: completing a set plays the theme. */
    fanfareSet() {
      if (!live()) return;
      noise({ dur: .35, lp: 900, sweepTo: 4200, hp: 400, peak: .07 });
      const m = mus();
      if (!m) { tone(B5, { type: 'triangle', dur: .32, peak: .1, lp: 3500, delay: .12 }); tone(E6, { type: 'triangle', dur: .55, peak: .1, lp: 3500, delay: .24 }); return; }
      const at = m.at('4n');
      [7, 6, 4].forEach((deg, i) => {
        const f = midiToHz(degToMidi(aAt(4), deg)), t0 = at + i * 2 * STEP;
        tone(f, { type: 'triangle', dur: i === 2 ? .55 : .32, peak: .09, lp: 3500, at: t0, echo: .35 });
        tone(f, { type: 'square', dur: i === 2 ? .45 : .25, peak: .03, lp: 2200, at: t0 });
      });
      m.duck(...MUSIC_TIMING.duck.fanfareSet, at);
    },
  };
}
export type Sound = ReturnType<typeof createSound>;
