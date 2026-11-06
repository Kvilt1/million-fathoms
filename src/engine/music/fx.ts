/* Shared music buses. Every layer feeds `bus`; the chain to the speakers is
     bus -> muffle (lowpass) -> glass (drawer level) -> gate (silences) -> duck (SFX dips) -> fade -> musicVol -> out
   with a generated-IR reverb and a tempo delay as send returns into `bus`. */
import { ECHO, MUSIC_TIMING } from './score';

/** Set a param smoothly from now: hold where it is, then glide to `v` with ~95% reached after `dur`. */
export function glide(p: AudioParam, v: number, t0: number, dur: number) {
  const ap = p as AudioParam & { cancelAndHoldAtTime?: (t: number) => void };
  if (ap.cancelAndHoldAtTime) ap.cancelAndHoldAtTime(t0); else { p.cancelScheduledValues(t0); p.setValueAtTime(p.value, t0); }
  p.setTargetAtTime(v, t0, Math.max(.005, dur / 3));
}
export const dbToGain = (db: number) => 10 ** (db / 20);

function makeIR(ac: BaseAudioContext, seconds: number) {
  const n = Math.floor(ac.sampleRate * seconds), ir = ac.createBuffer(2, n, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      // Exponentially decaying noise (-60 dB at the end), lightly smoothed so the tail is darker.
      const t = i / n, w = Math.random() * 2 - 1;
      lp += (w - lp) * (.55 - .35 * t);
      d[i] = lp * Math.exp(-6.9 * t) * (i < 64 ? i / 64 : 1);
    }
  }
  return ir;
}

export function createBuses(ac: BaseAudioContext, out: AudioNode) {
  const now = () => ac.currentTime;
  const bus = ac.createGain();
  const muffle = ac.createBiquadFilter(); muffle.type = 'lowpass'; muffle.frequency.value = MUSIC_TIMING.openMuffle; muffle.Q.value = .5;
  const glass = ac.createGain(), gate = ac.createGain(), duck = ac.createGain(), fade = ac.createGain(), musicVol = ac.createGain();
  fade.gain.value = 0;
  bus.connect(muffle); muffle.connect(glass); glass.connect(gate); gate.connect(duck); duck.connect(fade); fade.connect(musicVol); musicVol.connect(out);

  // Reverb: about 4 s, high end rolled off before the convolver.
  const reverb = ac.createGain(), revLp = ac.createBiquadFilter(), conv = ac.createConvolver();
  revLp.type = 'lowpass'; revLp.frequency.value = 5000;
  conv.buffer = makeIR(ac, 4);
  const revRet = ac.createGain(); revRet.gain.value = .55;
  reverb.connect(revLp); revLp.connect(conv); conv.connect(revRet); revRet.connect(bus);

  // Delay: dotted eighth, with a lowpass inside the feedback loop so repeats darken.
  const delay = ac.createGain(), dl = ac.createDelay(2), fb = ac.createGain(), fbLp = ac.createBiquadFilter(), dRet = ac.createGain();
  dl.delayTime.value = ECHO; fb.gain.value = .4; fbLp.type = 'lowpass'; fbLp.frequency.value = 3000; dRet.gain.value = .8;
  delay.connect(dl); dl.connect(fbLp); fbLp.connect(fb); fb.connect(dl); fbLp.connect(dRet); dRet.connect(bus);

  /** A short dip so a sound effect pokes through, then back over `ms`. */
  const duckBy = (db: number, ms: number, at = now()) => {
    const t = Math.max(now(), at - .01), p = duck.gain;
    glide(p, Math.min(p.value, dbToGain(db)), t, .015);
    p.setTargetAtTime(1, t + .03, ms / 1000 / 3);
  };
  /** Silence the whole music bus for [t0, t1). */
  const silence = (t0: number, t1: number) => {
    const p = gate.gain;
    p.setValueAtTime(1, Math.max(now(), t0 - .02)); p.linearRampToValueAtTime(0, t0);
    p.setValueAtTime(0, t1 - .01); p.linearRampToValueAtTime(1, t1 + .01);
  };
  return { bus, muffle, glass, gate, duck, fade, musicVol, reverb, delay, duckBy, silence };
}
export type Buses = ReturnType<typeof createBuses>;
