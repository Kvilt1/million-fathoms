/* Sound: everything is synthesised live, so the game ships no audio files. */
import { clamp, lerp } from '../game/score';
import type { Opts } from '../game/save';

type ToneOpts = { type?: OscillatorType; vol?: number; slide?: number; attack?: number };
type HissOpts = { vol?: number; from?: number; to?: number; q?: number };

export function createSound(opts: () => Opts) {
  let ac: AudioContext | undefined, master: DynamicsCompressorNode, out: GainNode | undefined;
  let droneGain: GainNode | undefined, droneFilter: BiquadFilterNode | undefined, droneOsc: OscillatorNode, noiseBuf: AudioBuffer, lastTick = 0;
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
    droneGain = ac.createGain(); droneGain.gain.value = 0;
    droneFilter = ac.createBiquadFilter(); droneFilter.type = 'lowpass'; droneFilter.frequency.value = 300;
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    droneOsc = ac.createOscillator(); droneOsc.type = 'sine'; droneOsc.frequency.value = 55;
    const og = ac.createGain(); og.gain.value = .28;
    src.connect(droneFilter); droneOsc.connect(og); og.connect(droneFilter); droneFilter.connect(droneGain); droneGain.connect(master);
    src.start(); droneOsc.start();
    ambient();
  };
  const setVolume = () => { if (out && ac) out.gain.setTargetAtTime(opts().sound ? opts().vol : 0, ac.currentTime, .02); };
  const ambient = () => { if (droneGain && ac) droneGain.gain.setTargetAtTime(opts().ambient ? .09 : 0, ac.currentTime, .4); };
  const depth = (u: number) => {
    if (!droneFilter || !ac) return;
    droneFilter.frequency.setTargetAtTime(lerp(620, 130, clamp(u / 7, 0, 1)), ac.currentTime, .4);
    droneOsc.frequency.setTargetAtTime(lerp(62, 36, clamp(u / 7, 0, 1)), ac.currentTime, .4);
  };
  const live = () => !!ac && opts().sound;
  function tone(f: number, t0: number, dur: number, { type = 'sine', vol = .2, slide = 0, attack = .005 }: ToneOpts = {}) {
    const c = ac!, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .03);
  }
  function hiss(t0: number, dur: number, { vol = .1, from = 800, to = 200, q = 1 }: HissOpts = {}) {
    const c = ac!, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + t0;
    s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * .15);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + .03);
  }
  const SCALE = [0, 2, 4, 7, 9];
  const note = (i: number) => 220 * 2 ** ((SCALE[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5)) / 12);
  return {
    init, setVolume, ambient, depth,
    tick() { if (!live()) return; const now = ac!.currentTime; if (now - lastTick < .03) return; lastTick = now; tone(1500 + Math.random() * 400, 0, .025, { type: 'square', vol: .035 }); },
    clunk(i: number) { if (!live()) return; tone(180 - i * 8, 0, .1, { type: 'triangle', vol: .32, slide: .5 }); hiss(0, .05, { vol: .1, from: 2600, to: 900 }); },
    ui() { if (!live()) return; tone(660, 0, .05, { type: 'triangle', vol: .13 }); },
    press() { if (!live()) return; tone(140, 0, .14, { type: 'square', vol: .13, slide: .55 }); hiss(0, .1, { vol: .08, from: 1400, to: 400 }); },
    ping(i: number, tier: number) {
      if (!live()) return;
      const f = note(i + 8 + tier * 2);
      tone(f, 0, .22 + tier * .05, { type: 'sine', vol: .2 }); tone(f * 2, 0, .1, { type: 'triangle', vol: .06 + tier * .02 });
      if (tier >= 2) tone(f * 1.5, .06, .3, { type: 'sine', vol: .12 });
    },
    blip(t: number) { if (!live()) return; tone(note(6 + t * 3), 0, .1, { type: 'triangle', vol: .13 }); },
    sonar(u: number) { if (!live()) return; const f = lerp(1250, 620, clamp(u / 7, 0, 1)); tone(f, 0, 1, { type: 'sine', vol: .2, slide: .97 }); tone(f, .34, .7, { type: 'sine', vol: .05, slide: .97 }); },
    plunge() { if (!live()) return; hiss(0, .6, { vol: .15, from: 1800, to: 180, q: .6 }); for (let i = 0; i < 6; i++) tone(240 + Math.random() * 500, .05 + i * .06, .09, { vol: .05, slide: 1.9 }); },
    heart() { if (!live()) return; tone(66, 0, .14, { type: 'sine', vol: .5, slide: .6 }); tone(58, .17, .16, { type: 'sine', vol: .36, slide: .6 }); },
    stinger(t: number) {
      if (!live()) return;
      if (t === 0) { tone(150, 0, .4, { type: 'sawtooth', vol: .11, slide: .4 }); tone(112, .12, .42, { type: 'sawtooth', vol: .09, slide: .4 }); return; }
      const chord = [[0, 4, 7], [0, 4, 7, 12], [0, 3, 7, 10, 14], [0, 4, 7, 11, 14, 19], [0, 5, 7, 12, 17, 19, 24], [0, 7, 12, 16, 19, 24, 28, 31]][t - 1];
      const root = 196 * 2 ** ((t * 2) / 12), gap = t >= 5 ? .07 : .055;
      chord.forEach((c, i) => {
        const f = root * 2 ** (c / 12);
        tone(f, i * gap, .5 + t * .16, { type: 'triangle', vol: .17 }); if (t >= 3) tone(f / 2, i * gap, .5 + t * .16, { type: 'sawtooth', vol: .035 });
      });
      if (t >= 4) { tone(55, 0, 1.3, { type: 'sine', vol: .5, slide: .55 }); hiss(0, 1, { vol: .16, from: 6000, to: 300, q: .4 }); }
      if (t === 6) [0, 1, 2, 3, 4, 5, 6, 7].forEach(i => tone(1046 * 2 ** (SCALE[i % 5] / 12) * (i > 4 ? 2 : 1), .55 + i * .07, .35, { vol: .08 }));
    },
    fresh() { if (!live()) return; tone(1320, 0, .09, { vol: .12 }); tone(1760, .07, .16, { vol: .12 }); },
    fanfareSet() { if (!live()) return;[523, 659, 784, 1046].forEach((f, i) => tone(f, i * .09, .3, { type: 'square', vol: .07 })); },
  };
}
export type Sound = ReturnType<typeof createSound>;
