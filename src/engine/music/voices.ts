/* Web Audio voice factories. Each one-shot voice is (time, freq | null, params) => void: it builds its
   nodes, starts and stops them at exact ac times and disconnects everything in onended, so nothing
   leaks. The drone and the Hadal pad are persistent: built once, the director only fades them. */
import { BAR, midiToHz } from './score';

/** tanh soft clip with makeup so a full-scale input still peaks at 1. Strudel's distort(k). */
export function distCurve(k: number, n = 2048) {
  const a = 1 + 10 * k, c = new Float32Array(n), m = Math.tanh(a);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * a) / m; }
  return c;
}
/** A staircase with 2^(bits-1) levels. Strudel's crush(bits). */
export function crushCurve(bits: number, n = 8192) {
  const steps = 2 ** (bits - 1), c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.round(x * steps / 2) / (steps / 2); }
  return c;
}

type Dest = AudioNode;
export interface VoiceOuts { kick: Dest; hats: Dest; clap: Dest; clank: Dest; arp: Dest; bass: Dest; lead: Dest; pad: Dest; riser: Dest; crash: Dest; stab: Dest }

export function createVoices(ac: BaseAudioContext, noiseBuf: AudioBuffer, out: VoiceOuts, vib: AudioNode) {
  const end = (src: AudioScheduledSourceNode, nodes: AudioNode[]) => { src.onended = () => { src.disconnect(); nodes.forEach(n => n.disconnect()); }; };
  /** Linear attack to `peak`, exponential fall to silence over `dec`. Returns the end time. */
  const perc = (p: AudioParam, t: number, peak: number, dec: number, att = .003) => {
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + att); p.exponentialRampToValueAtTime(1e-4, t + att + dec); return t + att + dec;
  };
  const noise = (_t?: number) => { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; };
  const osc = (type: OscillatorType, f: number) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; return o; };
  const filt = (type: BiquadFilterType, f: number, q = .7071) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const gain = (v = 0) => { const g = ac.createGain(); g.gain.value = v; return g; };

  return {
    /** Synth 909 kick: sine 160 -> 48 Hz in 0.12 s, 0.35 s body, 3 ms noise click. Distortion and lowpass sit on the layer. */
    kick(t: number, _f: null, { gain: v = 1 } = {}) {
      const o = osc('sine', 160), g = gain();
      o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(48, t + .12);
      const e = perc(g.gain, t, v, .35, .002);
      o.connect(g); g.connect(out.kick); o.start(t); o.stop(e + .02); end(o, [g]);
      const n = noise(t), ng = gain(), hp = filt('highpass', 1800);
      ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(v * .5, t + .0005); ng.gain.linearRampToValueAtTime(0, t + .003);
      n.connect(hp); hp.connect(ng); ng.connect(out.kick); n.start(t, Math.random()); n.stop(t + .01); end(n, [hp, ng]);
    },
    /** Noise hat through a highpass, decay about 40 ms. */
    hat(t: number, _f: null, { gain: v, hp = 7000, dec = .04, to = out.hats }: { gain: number; hp?: number; dec?: number; to?: AudioNode }) {
      const n = noise(t), h = filt('highpass', hp), g = gain();
      const e = perc(g.gain, t, v, dec, .001);
      n.connect(h); h.connect(g); g.connect(to); n.start(t, Math.random() * 1.5); n.stop(e + .01); end(n, [h, g]);
    },
    /** Three noise bursts 10 ms apart plus a 0.15 s tail. Bandpass and bitcrush sit on the layer. */
    clap(t: number, _f: null, { gain: v = 1 } = {}) {
      const n = noise(t), g = gain(), p = g.gain;
      p.setValueAtTime(0, t);
      for (let k = 0; k < 3; k++) { const tk = t + k * .01; p.linearRampToValueAtTime(v, tk + .001); p.exponentialRampToValueAtTime(v * .08, tk + .0095); }
      p.linearRampToValueAtTime(v * .75, t + .031); p.exponentialRampToValueAtTime(1e-4, t + .031 + .15);
      n.connect(g); g.connect(out.clap); n.start(t, Math.random() * 1.5); n.stop(t + .2); end(n, [g]);
    },
    /** FM clank: sine carrier, modulator at 1.414x, index about 7 following the amp envelope. */
    clank(t: number, f: number, { gain: v = 1, pan = 0 }: { gain?: number; pan?: number } = {}) {
      const c = osc('sine', f), m = osc('sine', f * 1.414), mg = gain(), g = gain(), p = ac.createStereoPanner();
      p.pan.value = pan;
      perc(mg.gain, t, 7 * f, .07, .001); const e = perc(g.gain, t, v, .07, .001);
      m.connect(mg); mg.connect(c.frequency); c.connect(g); g.connect(p); p.connect(out.clank);
      c.start(t); m.start(t); c.stop(e + .02); m.stop(e + .02); end(c, [m, mg, g, p]);
    },
    /** Saw through a resonant lowpass, 0.11 s decay, no sustain. */
    arp(t: number, f: number, { gain: v = 1, lpf = 600, q = 10 }: { gain?: number; lpf?: number; q?: number } = {}) {
      const o = osc('sawtooth', f), lp = filt('lowpass', lpf, q), g = gain();
      const e = perc(g.gain, t, v, .11);
      o.connect(lp); lp.connect(g); g.connect(out.arp); o.start(t); o.stop(e + .02); end(o, [lp, g]);
    },
    /** Rolling bass: saw, lowpass envelope 1.4 kHz -> 240 Hz in 90 ms (Q 4), decay 0.14 s to 0.2 sustain. */
    bass(t: number, f: number, { gain: v = 1, len }: { gain?: number; len: number }) {
      const o = osc('sawtooth', f), lp = filt('lowpass', 240, 4), g = gain();
      lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(240, t + .09);
      const p = g.gain; p.setValueAtTime(0, t); p.linearRampToValueAtTime(v, t + .003); p.setTargetAtTime(v * .2, t + .003, .14 / 3);
      const off = t + Math.max(len, .02); p.setTargetAtTime(0, off, .012);
      o.connect(lp); lp.connect(g); g.connect(out.bass); o.start(t); o.stop(off + .08); end(o, [lp, g]);
    },
    /** Lead: square, decay 0.22 s to 0.25 sustain, release 0.25 s, 5 Hz vibrato into detune. */
    lead(t: number, f: number, { gain: v = 1, len }: { gain?: number; len: number }) {
      const o = osc('square', f), g = gain(), p = g.gain;
      vib.connect(o.detune);
      p.setValueAtTime(0, t); p.linearRampToValueAtTime(v, t + .005); p.setTargetAtTime(v * .25, t + .005, .22 / 3);
      const off = t + len; p.setTargetAtTime(0, off, .25 / 3);
      o.connect(g); g.connect(out.lead); o.start(t); o.stop(off + .32);
      o.onended = () => { vib.disconnect(o.detune); o.disconnect(); g.disconnect(); };
    },
    /** Pad chord: two saws per note at +-7 cents, 1.5 s attack, held for `len`, 3 s release. */
    pad(t: number, fs: number[], { gain: v = 1, len }: { gain?: number; len: number }) {
      const off = t + len;
      for (const f of fs) {
        const g = gain(), p = g.gain;
        p.setValueAtTime(0, t); p.linearRampToValueAtTime(v, t + 1.5); p.setValueAtTime(v, Math.max(off, t + 1.5)); p.setTargetAtTime(0, Math.max(off, t + 1.5), 1);
        g.connect(out.pad);
        const oscs = [-7, 7].map(c => { const o = osc('sawtooth', f); o.detune.value = c; o.connect(g); o.start(t); o.stop(Math.max(off, t + 1.5) + 4); return o; });
        oscs[0].onended = () => { oscs.forEach(o => o.disconnect()); g.disconnect(); };
      }
    },
    /** Noise riser: highpass 400 Hz -> 9 kHz while gain climbs to `peak`. Returns a stop(t) handle. */
    riser(t0: number, t1: number, { gain: peak = .1, hold = false }: { gain?: number; hold?: boolean } = {}) {
      const n = noise(t0), h = filt('highpass', 400), g = gain();
      h.frequency.setValueAtTime(400, t0); h.frequency.exponentialRampToValueAtTime(9000, t1);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t1);
      n.connect(h); h.connect(g); g.connect(out.riser); n.start(t0, Math.random());
      // A held riser climbs to the top and stays until stop(); otherwise it ends on t1. stop() can cut either early.
      let endAt = hold ? Infinity : t1 + .05;
      if (!hold) { g.gain.setValueAtTime(peak, t1); g.gain.linearRampToValueAtTime(0, t1 + .03); n.stop(t1 + .05); }
      const stop = (t: number) => {
        const at = Math.max(t, ac.currentTime);
        if (at >= endAt - .04) return;
        endAt = at + .06;
        g.gain.cancelScheduledValues(at); g.gain.setValueAtTime(at >= t1 ? peak : Math.max(0, g.gain.value), at); g.gain.linearRampToValueAtTime(0, at + .04);
        n.stop(at + .06);
      };
      end(n, [h, g]);
      return { stop, until: t1 };
    },
    /** Crash: highpassed noise, 1.6 s decay. */
    crash(t: number, _f: null, { gain: v = 1 } = {}) {
      const n = noise(t), h = filt('highpass', 2500), g = gain();
      const e = perc(g.gain, t, v, 1.6, .002);
      n.connect(h); h.connect(g); g.connect(out.crash); n.start(t, Math.random()); n.stop(e + .02); end(n, [h, g]);
    },
    /** A stab note: lowpassed triangle, 0.5 s decay. */
    stab(t: number, f: number, { gain: v = 1 } = {}) {
      const o = osc('triangle', f), lp = filt('lowpass', 3000), g = gain();
      const e = perc(g.gain, t, v, .5, .004);
      o.connect(lp); lp.connect(g); g.connect(out.stab); o.start(t); o.stop(e + .02); end(o, [lp, g]);
    },
    /** A sub hit: sine gliding f -> f1. */
    sub(t: number, f: number, { gain: v = 1, f1 = f / 2, dur = .5 }: { gain?: number; f1?: number; dur?: number } = {}) {
      const o = osc('sine', f), g = gain();
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
      const e = perc(g.gain, t, v, dur, .004);
      o.connect(g); g.connect(out.stab); o.start(t); o.stop(e + .02); end(o, [g]);
    },
  };
}
export type Voices = ReturnType<typeof createVoices>;

/** The drone: A0 saw, lowpass swept by a 16-bar sine LFO, soft distortion. Never retriggered. */
export function createDrone(ac: BaseAudioContext, dest: AudioNode, rootMidi: number) {
  const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midiToHz(rootMidi);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 125; lp.Q.value = 1.2;
  const lfo = ac.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 1 / (16 * BAR);
  const depth = ac.createGain(); depth.gain.value = 55;
  const sh = ac.createWaveShaper(); sh.curve = distCurve(.3); sh.oversample = '2x';
  const lvl = ac.createGain(); lvl.gain.value = 1;
  lfo.connect(depth); depth.connect(lp.frequency); o.connect(lp); lp.connect(sh); sh.connect(lvl); lvl.connect(dest);
  o.start(); lfo.start();
  return {
    lvl,
    /** Move the LFO range (Hz) smoothly. */
    range(lo: number, hi: number, t: number, tc: number) { lp.frequency.setTargetAtTime((lo + hi) / 2, t, tc); depth.gain.setTargetAtTime((hi - lo) / 2, t, tc); },
  };
}
/** The Hadal pad: three slightly detuned sines. */
export function createHadal(ac: BaseAudioContext, dest: AudioNode, midis: number[]) {
  const sum = ac.createGain(); sum.gain.value = 1 / midis.length; sum.connect(dest);
  midis.forEach((m, i) => { const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = midiToHz(m); o.detune.value = [-5, 4, 7][i % 3]; o.connect(sum); o.start(); });
}
