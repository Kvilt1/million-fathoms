/* ---------- Data ---------- */
const DATA = window.MF_DATA;
const fmt = n => Math.round(n).toLocaleString('en-US');
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const TIERS = [
  { name: 'Trash', zone: 'Surface Film', floor: 0, note: 'Bottom 1%' },
  { name: 'Common', zone: 'Sunlight Zone', floor: 2087, note: 'Bottom 50%' },
  { name: 'Uncommon', zone: 'Twilight Zone', floor: 5802, note: 'Top 50 to 25%' },
  { name: 'Rare', zone: 'Midnight Zone', floor: 10074, note: 'Top 25 to 10%' },
  { name: 'Epic', zone: 'Bathyal Slope', floor: 22293, note: 'Top 10 to 5%' },
  { name: 'Anomaly', zone: 'Abyssal Plain', floor: 35469, note: 'Top 5 to 1%' },
  { name: 'Mythic', zone: 'Hadal Trench', floor: 162292, note: 'Top 1%' },
];
TIERS.forEach((t, i) => { t.color = getComputedStyle(document.documentElement).getPropertyValue(`--t${i}`).trim(); });
const BADGE_TIERS = ['Common', 'Uncommon', 'Rare', 'Epic', 'Anomaly', 'Mythic'];
const badgeTier = ep => ep < 1000 ? 0 : ep < 10000 ? 1 : ep < 100000 ? 2 : ep < 1000000 ? 3 : ep < 10000000 ? 4 : 5;
const badgeColor = ep => TIERS[badgeTier(ep) + 1].color;

BADGES.forEach(b => { b.ep = DATA.eps[b.name]; b.count = DATA.counts[b.name]; b.tier = badgeTier(b.ep); });
const BY_NAME = new Map(BADGES.map(b => [b.name, b]));

/* Every roll's total, as sorted distinct values with how many rolls share each one. */
const DIST = (() => {
  const raw = atob(DATA.dist), vals = [], cum = [];
  let i = 0, prev = 0, sum = 0;
  const vint = () => { let v = 0, m = 1, c; do { c = raw.charCodeAt(i++); v += (c & 127) * m; m *= 128; } while (c & 128); return v; };
  while (i < raw.length) { prev += vint(); sum += vint(); vals.push(prev); cum.push(sum); }
  return { vals, cum };
})();
function rollsBelow(total) {
  let lo = 0, hi = DIST.vals.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (DIST.vals[m] < total) lo = m + 1; else hi = m; }
  return lo ? DIST.cum[lo - 1] : 0;
}
const tierOf = total => { for (let i = 6; i >= 0; i--) if (total >= TIERS[i].floor) return i; return 0; };

/* Depth: one zone per tier, sinking on a log scale of EP, ending at Challenger Deep (5,960 fathoms). */
const TOP_EP = DIST.vals[DIST.vals.length - 1];
const EP_ANCHORS = [[1759, .2], [2087, 1], [5802, 2], [10074, 3], [22293, 4], [35469, 5], [162292, 6], [TOP_EP, 7]];
const FM_ANCHORS = [0, 12, 109, 547, 1100, 2187, 3281, 5960];
function zoneOf(ep) {
  if (ep <= 0) return 0;
  if (ep < 1759) return .2 * ep / 1759;
  for (let i = 1; i < EP_ANCHORS.length; i++) {
    const [e1, u1] = EP_ANCHORS[i];
    if (ep <= e1) {
      const [e0, u0] = EP_ANCHORS[i - 1];
      return lerp(u0, u1, Math.log(ep / e0) / Math.log(e1 / e0));
    }
  }
  return 7;
}
function fathoms(u) {
  const i = clamp(Math.floor(u), 0, 6);
  return lerp(FM_ANCHORS[i], FM_ANCHORS[i + 1], clamp(u - i, 0, 1));
}

function scoreRoll(n) {
  const earned = earnedBadges(n), best = new Map();
  for (const b of earned) if (b.family && (!best.has(b.family) || b.ep > best.get(b.family).ep)) best.set(b.family, b);
  const paid = earned.filter(b => !b.family || best.get(b.family) === b);
  const outranked = earned.filter(b => b.family && best.get(b.family) !== b);
  const total = paid.reduce((a, b) => a + b.ep, 0);
  const tier = tierOf(total), u = zoneOf(total);
  return { n, earned, paid, outranked, total, tier, u, fm: Math.round(fathoms(u)), pct: 100 * rollsBelow(total) / ROLLS };
}
const pctText = p => p >= 99.99 ? p.toFixed(4) : p >= 99 ? p.toFixed(3) : p.toFixed(2);

function randomRoll() {
  const limit = Math.floor(2 ** 32 / ROLLS) * ROLLS, a = new Uint32Array(1);
  do { crypto.getRandomValues(a); } while (a[0] >= limit);
  return a[0] % ROLLS;
}

/* ---------- Save ---------- */
const SAVE_KEY = 'million-fathoms-v1';
const fresh = () => ({
  rolls: 0, life: 0, best: null, tiers: [0, 0, 0, 0, 0, 0, 0], badges: {}, sets: {}, log: [], bestDive: 0,
  opts: { sound: true, vol: .7, ambient: true, speed: 'show', autoStop: '5', effects: true },
});
let S = fresh();
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) { const p = JSON.parse(raw); S = { ...fresh(), ...p, opts: { ...fresh().opts, ...p.opts } }; }
} catch (e) { /* the game still works without saved progress */ }
let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }, 250);
}

/* ---------- Sets ---------- */
const SETS = [
  ['The Casino', 'Poker hands and dice values.', 'Royal Flush|Straight Flush|Straight|Five of a Kind|Contiguous Three Pair|Contiguous Full House|Three Pair|Four of a Kind|Low Ball|High Roller|Contiguous Two Pair|Flush|Contiguous Trips|Blackjack|Full House|Snake Eyes|Three of a Kind|Two Pair|Contiguous Pair|Pair'],
  ['Lucky Sevens', 'Anything built around 7.', 'Exact Jackpot|Jackpot Six|Power of Seven|Jackpot Five|Jackpot Four|Jackpot|Lucky Seven (Divisible)|Lucky Seven'],
  ['Deep Space', 'Perfect powers and named number classes.', '10th Power|9th Power|8th Power|Ouroboros|7th Power|Power of Seven|Power of Five|Factorial|6th Power|Power of Three|5th Power|Power of Two|Fibonacci Number|4th Power|Spy Number|3rd Power|Pronic Number|2nd Power|Harshad Number'],
  ['Sacred Geometry', 'How the digits are arranged.', 'Cascade|Waterfall|Strobogrammatic|Zipper|Ascension|Framed Quad|Decay|Echo|Firefly|Palindrome|Turtle|Steps|Slopes|Paired Bookends|Bookends|Mirror Bookends|Mountain|Valley|Mini Echo|Alternator|Pocket Mirror|Balanced|Rhyme|Mesa|Canyon|Sandwich|Hills|Mini Scramble|Dunes'],
  ['Meme Culture', 'Internet numbers and their exact versions.', 'Exact Nice|Very Very Nice|Exact Botanist|Hotbox|Exact Devil|Exact Leet|Exact Meaning|Universal Answer|Exact Six-Seven|Brainrot|Orwellian|Not Found|Infernal|17776|Funny Number|Funny Numbers|Very Nice|Deeper Meaning|6767|Leet|Big Brother|Secret Agent|Devil|Botanist|Nice|Meaning of Life|Six-Seven'],
  ['Calculator Words', 'Digits that spell something sideways.', 'Exact Hell|Exact Boob|Hello|Hell'],
  ['The Void', 'Zeroes and the round numbers they make.', 'Deep Void (5)|Eon|Epoch|Deep Void (4)|Millennium|Deep Void (3)|Century|Deep Void|Clean|Ghost|Void'],
  ['Flatliners', 'Long straight runs of one digit.', 'Contiguous Sixes|Homogeneous|Contiguous Fives|Contiguous Quads|Contiguous Trips'],
  ['Exact Numbers', 'Rolls where the number itself is the joke.', 'Exact Nice|Exact Botanist|Exact Devil|Exact Emergency|Exact Leet|Exact Meaning|Exact Jackpot|Exact Hell|Exact Six-Seven|Exact Eighty-Six|Exact Orientation|Exact Calendar|Very Very Nice|Hotbox|Mayday|Universal Answer|Brainrot|Groundhog Day|Orwellian|Not Found|Infernal|17776|Full Day|Exact Boob|Always|Funny Number|Tau|Golden Ratio'],
  ['Periodic Table', 'One digit each, named by atomic number.', 'Hydrogen (1)|Helium (2)|Lithium (3)|Beryllium (4)|Boron (5)|Carbon (6)|Nitrogen (7)|Oxygen (8)|Fluorine (9)'],
  ['Digit Counts', 'Purely about length.', 'Single Digit|Two Digits|Three Digits|Four Digits|Five Digits|Six Digits'],
  ['Mathematical Constants', 'Pi, e, tau and the golden ratio.', "Tau|Golden Ratio|Pi|Euler's Number|Tau Slice (5)|Fibonacci Number|Tau Slice (4)|Prime Number"],
  ['Basic Physics', 'Even or odd, light or heavy, ends compared.', 'Colossal|Heavy|Feather|Equilibrium|Grounded|Even|Odd|Liftoff'],
  ['Counting', 'Neighbouring numbers written inside the roll.', '4 Consecutive Numbers|4 Consecutive Numbers (Contains)|4 Consecutive Numbers (Scrambled)|3 Consecutive Numbers|3 Consecutive Numbers (Scrambled)|Crescendo|3 Consecutive Numbers (Contains)|2 Consecutive Numbers|Metronome|Equation|2 Consecutive Numbers (Contains)|2 Consecutive Numbers (Nearby)'],
  ['Emergency Services', 'The numbers you dial when something is wrong.', 'Exact Emergency|Mayday|Not Found|Error 404|Emergency'],
  ['On the Clock', 'Dates and times hiding in digits.', 'Exact Calendar|Groundhog Day|Full Day|Always|Calendar'],
].map(([name, desc, list]) => ({ name, desc, members: list.split('|') }));
const setDone = s => s.members.filter(m => S.badges[m]).length;
const setsComplete = () => SETS.filter(s => setDone(s) === s.members.length).length;

/* ---------- Sound: everything is synthesised live, so the game ships no audio files ---------- */
const Sound = (() => {
  let ac, master, droneGain, droneFilter, droneOsc, noiseBuf, lastTick = 0;
  const init = () => {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    ac = new C();
    master = ac.createDynamicsCompressor(); const g = ac.createGain();
    g.gain.value = 1; master.connect(g); g.connect(ac.destination); Sound.out = g;
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
  const setVolume = () => { if (Sound.out) Sound.out.gain.setTargetAtTime(S.opts.sound ? S.opts.vol : 0, ac.currentTime, .02); };
  const ambient = () => { if (droneGain) droneGain.gain.setTargetAtTime(S.opts.ambient ? .09 : 0, ac.currentTime, .4); };
  const depth = u => {
    if (!droneFilter) return;
    droneFilter.frequency.setTargetAtTime(lerp(620, 130, clamp(u / 7, 0, 1)), ac.currentTime, .4);
    droneOsc.frequency.setTargetAtTime(lerp(62, 36, clamp(u / 7, 0, 1)), ac.currentTime, .4);
  };
  const live = () => ac && S.opts.sound;
  function tone(f, t0, dur, { type = 'sine', vol = .2, slide = 0, attack = .005 } = {}) {
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .03);
  }
  function hiss(t0, dur, { vol = .1, from = 800, to = 200, q = 1 } = {}) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime + t0;
    s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * .15);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + .03);
  }
  const SCALE = [0, 2, 4, 7, 9];
  const note = i => 220 * 2 ** ((SCALE[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5)) / 12);
  return {
    init, setVolume, ambient, depth, out: null,
    tick() { if (!live()) return; const now = ac.currentTime; if (now - lastTick < .03) return; lastTick = now; tone(1500 + Math.random() * 400, 0, .025, { type: 'square', vol: .035 }); },
    clunk(i) { if (!live()) return; tone(180 - i * 8, 0, .1, { type: 'triangle', vol: .32, slide: .5 }); hiss(0, .05, { vol: .1, from: 2600, to: 900 }); },
    ui() { if (!live()) return; tone(660, 0, .05, { type: 'triangle', vol: .13 }); },
    press() { if (!live()) return; tone(140, 0, .14, { type: 'square', vol: .13, slide: .55 }); hiss(0, .1, { vol: .08, from: 1400, to: 400 }); },
    ping(i, tier) {
      if (!live()) return;
      const f = note(i + 8 + tier * 2);
      tone(f, 0, .22 + tier * .05, { type: 'sine', vol: .2 }); tone(f * 2, 0, .1, { type: 'triangle', vol: .06 + tier * .02 });
      if (tier >= 2) tone(f * 1.5, .06, .3, { type: 'sine', vol: .12 });
    },
    blip(t) { if (!live()) return; tone(note(6 + t * 3), 0, .1, { type: 'triangle', vol: .13 }); },
    sonar(u) { if (!live()) return; const f = lerp(1250, 620, clamp(u / 7, 0, 1)); tone(f, 0, 1, { type: 'sine', vol: .2, slide: .97 }); tone(f, .34, .7, { type: 'sine', vol: .05, slide: .97 }); },
    plunge() { if (!live()) return; hiss(0, .6, { vol: .15, from: 1800, to: 180, q: .6 }); for (let i = 0; i < 6; i++) tone(240 + Math.random() * 500, .05 + i * .06, .09, { vol: .05, slide: 1.9 }); },
    heart() { if (!live()) return; tone(66, 0, .14, { type: 'sine', vol: .5, slide: .6 }); tone(58, .17, .16, { type: 'sine', vol: .36, slide: .6 }); },
    stinger(t) {
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
})();

/* ---------- Dive scene ---------- */
const Scene = (() => {
  const cv = $('scene'), ctx = cv.getContext('2d', { alpha: false });
  let W = 0, H = 0, dpr = 1, rulerX = 56, lineX = 96, narrow = false, last = 0, time = 0;
  const STOPS = [[22, 132, 160], [13, 104, 142], [11, 78, 130], [14, 50, 108], [24, 30, 92], [29, 18, 74], [23, 11, 52], [13, 5, 34]];
  const water = u => {
    const t = clamp(u, 0, 7), i = Math.min(6, Math.floor(t)), f = t - i, a = STOPS[i], b = STOPS[i + 1];
    return `rgb(${lerp(a[0], b[0], f) | 0},${lerp(a[1], b[1], f) | 0},${lerp(a[2], b[2], f) | 0})`;
  };
  let seed = 7;
  const rnd = (a = 1, b) => { seed = (seed * 16807) % 2147483647; const r = (seed - 1) / 2147483646; return b === undefined ? r * a : a + r * (b - a); };
  const sprite = (() => {
    const cache = new Map();
    return (color, size = 64) => {
      const key = color + size;
      if (cache.has(key)) return cache.get(key);
      const c = document.createElement('canvas'); c.width = c.height = size;
      const g = c.getContext('2d'), r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      r.addColorStop(0, color); r.addColorStop(.25, color + '88'); r.addColorStop(1, color + '00');
      g.fillStyle = r; g.fillRect(0, 0, size, size); cache.set(key, c); return c;
    };
  })();
  const snow = Array.from({ length: 110 }, () => ({ x: rnd(), y: rnd(), z: rnd(.3, 1), s: rnd(.6, 2) }));
  const life = [];
  for (let i = 0; i < 16; i++) life.push({ k: 'fish', u: rnd(.35, 2.9), x: rnd(), v: rnd(.008, .022) * (rnd() > .5 ? 1 : -1), n: 5 + rnd(9) | 0, s: rnd(.7, 1.3), p: rnd(9) });
  for (let i = 0; i < 18; i++) life.push({ k: 'jelly', u: rnd(1.5, 5.2), x: rnd(), v: rnd(-.004, .004), s: rnd(.7, 1.7), p: rnd(9), c: ['#b68cff', '#5ef2e4', '#ff5fa2', '#4cc3ff'][rnd(4) | 0] });
  for (let i = 0; i < 26; i++) life.push({ k: 'lamp', u: rnd(2.8, 6.8), x: rnd(), v: rnd(-.01, .01), n: 2 + rnd(5) | 0, p: rnd(9), c: ['#5ef2e4', '#ffd23f', '#4cc3ff'][rnd(3) | 0] });
  for (let i = 0; i < 9; i++) life.push({ k: 'chain', u: rnd(4, 6.9), x: rnd(), v: rnd(-.003, .003), len: 12 + rnd(16) | 0, p: rnd(9), c: ['#ff5fa2', '#ffb347', '#b68cff'][rnd(3) | 0] });
  const rocks = Array.from({ length: 80 }, () => rnd());
  const vents = Array.from({ length: 5 }, () => ({ x: rnd(.2, .95), p: rnd(9) }));

  const st = { lead: 0, target: 0, cam: 0, k: 5, ring: [], lastDrawn: null, best: null };
  const scale = () => H / 1.12;
  const CAM_MIN = .292;
  const yOf = u => H * .44 + (u - Math.max(st.cam, CAM_MIN)) * scale();

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    W = innerWidth; H = innerHeight; narrow = W <= 860;
    cv.width = W * dpr; cv.height = H * dpr;
    rulerX = narrow ? 0 : 76; lineX = narrow ? 13 : 104;
  }
  function drawSurface() {
    const sy = yOf(-.1);
    if (sy < 0) return;
    const g = ctx.createLinearGradient(0, 0, 0, sy);
    g.addColorStop(0, '#9ff2ea'); g.addColorStop(1, '#ddfff6');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0);
    for (let x = W; x >= -20; x -= 20) ctx.lineTo(x, sy + Math.sin(x * .012 + time * 1.2) * 6 + Math.sin(x * .031 - time * .9) * 3);
    ctx.closePath(); ctx.fill();
  }
  function drawRays() {
    const a = clamp(1 - st.cam / 1.6, 0, 1) * .09;
    if (a <= 0) return;
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(190,255,245,${a})`;
    for (let i = 0; i < 6; i++) {
      const x = W * (i / 5) + Math.sin(time * .2 + i * 1.7) * 90, w = 60 + i * 14, top = Math.max(0, yOf(-.1));
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + w, top); ctx.lineTo(x + w * .3 + 200, H); ctx.lineTo(x - 180, H); ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  function fish(c) {
    ctx.fillStyle = 'rgba(190,240,255,.5)';
    const dir = c.v > 0 ? 1 : -1;
    for (let i = 0; i < c.n; i++) {
      const fx = (c.x * W + i * 15 * c.s * ((i % 3) - 1) + Math.sin(time * .9 + i) * 8), fy = yOf(c.u) + (i % 4) * 11 * c.s + Math.sin(time * 1.2 + i * 2) * 4;
      const w = Math.sin(time * 9 + i) * 2.4;
      ctx.beginPath(); ctx.ellipse(fx, fy, 7 * c.s, 2.6 * c.s, 0, 0, 7); ctx.moveTo(fx - dir * 6 * c.s, fy);
      ctx.lineTo(fx - dir * 12 * c.s, fy - 3.4 - w); ctx.lineTo(fx - dir * 12 * c.s, fy + 3.4 - w); ctx.closePath(); ctx.fill();
    }
  }
  function jelly(c) {
    const x = c.x * W + Math.sin(time * .22 + c.p) * 26, pulse = .5 + .5 * Math.sin(time * 1.4 + c.p), y = yOf(c.u) + Math.sin(time * .4 + c.p) * 14, r = 20 * c.s * (1 - pulse * .12), h = 16 * c.s * (1 + pulse * .22);
    ctx.globalCompositeOperation = 'lighter';
    const sp = sprite(c.c); ctx.globalAlpha = .34; ctx.drawImage(sp, x - r * 3, y - r * 3, r * 6, r * 6); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = c.c + 'bb'; ctx.lineWidth = 1.3;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(x + i * r * .36, y + 1);
      for (let t = 1; t <= 6; t++) ctx.lineTo(x + i * r * .36 + Math.sin(time * 1.6 + t * .7 + i + c.p) * t * 1.5, y + t * 9 * c.s);
      ctx.stroke();
    }
    ctx.fillStyle = c.c + '66'; ctx.beginPath(); ctx.moveTo(x - r, y);
    ctx.bezierCurveTo(x - r, y - h * 1.4, x + r, y - h * 1.4, x + r, y); ctx.quadraticCurveTo(x, y + 6 * c.s * (1 - pulse), x - r, y); ctx.fill();
  }
  function lamp(c) {
    ctx.globalCompositeOperation = 'lighter';
    const sp = sprite(c.c, 32);
    for (let i = 0; i < c.n; i++) {
      const a = .35 + .65 * Math.max(0, Math.sin(time * 1.3 + c.p + i * 1.4));
      const x = c.x * W + i * 16 + Math.sin(time * .5 + i) * 7, y = yOf(c.u) + (i % 2) * 11 + Math.cos(time * .6 + i) * 5;
      ctx.globalAlpha = a; ctx.drawImage(sp, x - 8, y - 8, 16, 16);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  function chain(c) {
    ctx.globalCompositeOperation = 'lighter';
    const sp = sprite(c.c, 32), y0 = yOf(c.u);
    for (let i = 0; i < c.len; i++) {
      const x = c.x * W + Math.sin(time * .55 + i * .35 + c.p) * (10 + i * 1.4), y = y0 + i * 10;
      ctx.globalAlpha = .4 + .6 * Math.max(0, Math.sin(time * 2.1 - i * .45 + c.p)); ctx.drawImage(sp, x - 7, y - 7, 14, 14);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  function drawTrench() {
    const start = 5.4; if (st.cam < start - 1) return;
    ctx.fillStyle = '#0a0320';
    const wall = (side) => {
      ctx.beginPath(); ctx.moveTo(side < 0 ? 0 : W, Math.max(0, yOf(start)));
      for (let i = 0; i < 80; i++) {
        const u = start + i * .03, y = yOf(u); if (y < -60) continue; if (y > H + 60) break;
        const close = clamp((u - start) / 1.7, 0, 1) ** 1.5, grow = clamp((u - start) / .35, 0, 1), w = (.03 + close * .19) * W * (.7 + rocks[(i + (side > 0 ? 40 : 0)) % 80] * .5) * grow;
        ctx.lineTo(side < 0 ? w : W - w, y);
      }
      ctx.lineTo(side < 0 ? 0 : W, H + 60); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(182,140,255,.22)'; ctx.lineWidth = 1.5; ctx.stroke();
    };
    wall(1); if (W > 500) wall(-1);
    const fy = yOf(7.22);
    if (fy < H + 40) {
      ctx.fillStyle = '#070219'; ctx.fillRect(0, fy, W, H - fy + 50);
      ctx.globalCompositeOperation = 'lighter';
      for (const v of vents) {
        const sp = sprite('#ff5fa2'); ctx.globalAlpha = .4 + .2 * Math.sin(time * 2 + v.p);
        ctx.drawImage(sp, v.x * W - 44, fy - 42, 88, 62);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }
  function drawLine() {
    const y = yOf(st.lead), top = Math.max(0, yOf(-.1));
    ctx.strokeStyle = 'rgba(255,235,170,.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(lineX, top); ctx.lineTo(lineX, y - 12); ctx.stroke(); ctx.setLineDash([]);
    const c = TIERS[Scene.tierNow ?? 0].color;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .75; const sp = sprite('#ffd23f', 96); ctx.drawImage(sp, lineX - 44, y - 44, 88, 88); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // the sounding lead: a weighted teardrop on the line
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(lineX, y - 14);
    ctx.bezierCurveTo(lineX + 11, y - 2, lineX + 9, y + 11, lineX, y + 11); ctx.bezierCurveTo(lineX - 9, y + 11, lineX - 11, y - 2, lineX, y - 14); ctx.fill();
    ctx.fillStyle = '#8a5d00'; ctx.beginPath(); ctx.arc(lineX, y - 1, 3, 0, 7); ctx.fill();
    for (let i = st.ring.length - 1; i >= 0; i--) {
      const r = st.ring[i]; r.t += .016; const p = r.t / 1.1;
      if (p >= 1) { st.ring.splice(i, 1); continue; }
      ctx.strokeStyle = c; ctx.globalAlpha = (1 - p) * .7; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(lineX, y, 14 + p * 300, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  function drawRuler() {
    const x = rulerX, span = 1.12 * .62;
    ctx.font = narrow ? '400 11px "Tilt Neon", sans-serif' : '400 13px "Tilt Neon", sans-serif';
    ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
    if (!narrow) {
      ctx.strokeStyle = 'rgba(234,252,255,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      const c0 = Math.max(st.cam, CAM_MIN), lo = Math.floor((c0 - span) * 10) / 10, hi = c0 + span;
      for (let u = Math.max(0, lo); u <= Math.min(7, hi); u = Math.round((u + .1) * 10) / 10) {
        const y = yOf(u), whole = Math.abs(u - Math.round(u)) < .01, half = Math.abs(u * 2 - Math.round(u * 2)) < .01;
        ctx.strokeStyle = 'rgba(234,252,255,.5)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - (whole ? 16 : half ? 10 : 5), y); ctx.stroke();
        if (half) { ctx.fillStyle = whole ? '#eafcff' : 'rgba(234,252,255,.72)'; ctx.fillText(fmt(fathoms(u)), x - (whole ? 20 : 14), y); }
      }
      ctx.textAlign = 'left';
      for (let i = 0; i < 7; i++) {
        const y = yOf(i + .5);
        if (y < 40 || y > H - 40) continue;
        ctx.save(); ctx.translate(14, y); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.font = '700 13px "Baloo 2", sans-serif'; ctx.fillStyle = TIERS[i].color; ctx.fillText(TIERS[i].zone, 0, 0); ctx.restore();
      }
    }
    const mark = (r, color, label) => {
      if (r == null) return;
      const y = yOf(r); if (y < 0 || y > H) return;
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(lineX - 14, y); ctx.lineTo(lineX - 22, y - 5); ctx.lineTo(lineX - 22, y + 5); ctx.fill();
      if (!narrow) { ctx.font = '700 11px "Baloo 2", sans-serif'; ctx.textAlign = 'left'; ctx.fillText(label, lineX + 14, y - 12); }
    };
    if (st.best != null && Math.abs(st.best - st.lead) > .07) mark(st.best, '#ffd23f', 'Best');
  }
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000 || 0); last = now; time += dt;
    const k = reduced ? 60 : st.k;
    const prev = st.cam;
    st.lead += (st.target - st.lead) * (1 - Math.exp(-dt * k));
    st.cam += (st.lead - st.cam) * (1 - Math.exp(-dt * Math.max(4, k * .8)));
    const vel = (st.cam - prev) * scale();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, water(st.cam - .5)); g.addColorStop(.5, water(st.cam)); g.addColorStop(1, water(st.cam + .55));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    drawRays();
    for (const c of life) {
      c.x += c.v * dt; if (c.x > 1.1) c.x = -.1; if (c.x < -.1) c.x = 1.1;
      const y = yOf(c.u); if (y < -240 || y > H + 240) continue;
      if (c.k === 'fish') fish(c); else if (c.k === 'jelly') jelly(c); else if (c.k === 'lamp') lamp(c); else chain(c);
    }
    drawTrench();
    ctx.fillStyle = 'rgba(220,250,255,.45)';
    for (const p of snow) {
      p.y -= (vel / H) * p.z + dt * .012 * p.z; p.y = ((p.y % 1) + 1) % 1;
      p.x += Math.sin(time * .4 + p.s * 6) * dt * .006;
      const sx = ((p.x % 1) + 1) % 1 * W, sy = p.y * H, stretch = clamp(Math.abs(vel) * p.z * .9, 0, 40);
      ctx.fillRect(sx, sy, p.s * .8, p.s + stretch);
    }
    drawSurface();
    drawRuler();
    drawLine();
    requestAnimationFrame(frame);
  }
  addEventListener('resize', resize);
  return {
    tierNow: 0,
    start() { resize(); requestAnimationFrame(t => { last = t; frame(t); }); },
    sink(u, k) { st.target = u; if (k) st.k = k; Sound.depth(u); },
    ping() { st.ring.push({ t: 0 }); },
    setBest(u) { st.best = u; },
  };
})();

/* ---------- Particles ---------- */
const FX = (() => {
  const cv = $('fx'), c = cv.getContext('2d'); let parts = [], running = false, W, H;
  const size = () => { W = innerWidth; H = innerHeight; cv.width = W; cv.height = H; };
  addEventListener('resize', size); size();
  function loop() {
    c.clearRect(0, 0, W, H);
    parts = parts.filter(p => p.life > 0);
    for (const p of parts) {
      p.life -= .016; p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= .99;
      c.globalAlpha = clamp(p.life / p.max, 0, 1); c.fillStyle = p.color; c.beginPath();
      if (p.ring) { c.strokeStyle = p.color; c.lineWidth = 1.5; c.arc(p.x, p.y, p.r, 0, 7); c.stroke(); } else { c.arc(p.x, p.y, p.r, 0, 7); c.fill(); }
    }
    c.globalAlpha = 1;
    if (parts.length) requestAnimationFrame(loop); else { running = false; c.clearRect(0, 0, W, H); }
  }
  return {
    burst(x, y, color, n = 40, power = 7) {
      if (reduced || !S.opts.effects) return;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.28, v = Math.random() * power;
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, g: -.035, r: 1.5 + Math.random() * 4, color, life: .7 + Math.random(), max: 1.7, ring: Math.random() > .55 });
      }
      if (!running) { running = true; requestAnimationFrame(loop); }
    },
  };
})();

/* ---------- Reels ---------- */
const Reels = (() => {
  const box = $('reels'), reels = [];
  for (let i = 0; i < 7; i++) {
    const el = document.createElement('div'); el.className = 'reel off';
    const strip = document.createElement('div'); strip.className = 'strip';
    strip.innerHTML = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => `<span>${d}</span>`).join('');
    el.append(strip); box.append(el);
    reels.push({ el, strip, pos: 0 });
    if (i === 0 || i === 3) { const c = document.createElement('div'); c.className = 'comma'; c.textContent = ','; box.append(c); }
  }
  let cell = 80, raf = 0;
  const measure = () => { cell = reels[0].el.offsetHeight || 80; reels.forEach(place); };
  const place = r => { r.strip.style.transform = `translate3d(0,${-((r.pos % 10 + 10) % 10) * cell}px,0)`; };
  addEventListener('resize', measure);
  const digitsOf = n => String(n).padStart(7, '0').split('').map(Number);
  const lead = n => 7 - String(n).length;
  const light = n => reels.forEach((r, i) => r.el.classList.toggle('off', i < lead(n)));
  function setNow(n) { cancelAnimationFrame(raf); const d = digitsOf(n); reels.forEach((r, i) => { r.pos = d[i]; place(r); }); light(n); }
  function spin(n, { spinMs, stagger, tense = 0, skip }) {
    return new Promise(resolve => {
      cancelAnimationFrame(raf);
      const d = digitsOf(n), t0 = performance.now(), plan = reels.map((r, i) => ({
        r, target: d[i], stopAt: spinMs + (6 - Math.abs(0)) * 0 + i * stagger + (i === 6 ? tense : 0), v: 26 + i * 3, from: 0, to: 0, tween: null, done: false,
      }));
      reels.forEach(r => r.el.classList.remove('off', 'tense', 'land'));
      let prev = t0, lastBeat = 0, cancelled = false;
      const step = now => {
        const dt = Math.min(50, now - prev) / 1000; prev = now;
        const t = now - t0, forced = skip && skip();
        if (forced && !cancelled) { cancelled = true; plan.forEach((p, i) => { if (!p.tween && !p.done) { p.stopAt = t + i * 12; } }); }
        let live = 0;
        for (const p of plan) {
          if (p.done) continue;
          live++;
          if (!p.tween && t >= p.stopAt) {
            const cur = p.r.pos, base = Math.ceil(cur), extra = (((p.target - base) % 10) + 10) % 10;
            p.from = cur; p.to = base + extra + 10; p.tween = { t0: t, d: forced ? 150 : 300 };
          }
          if (p.tween) {
            const q = clamp((t - p.tween.t0) / p.tween.d, 0, 1), e = 1 + 2.1 * (q - 1) ** 3 + 1.1 * (q - 1) ** 2;
            p.r.pos = lerp(p.from, p.to, e); place(p.r);
            if (q >= 1) {
              p.done = true; p.r.pos = p.target; place(p.r); p.r.el.classList.add('land'); p.r.el.classList.remove('tense');
              const idx = plan.indexOf(p); Sound.clunk(idx);
              if (idx < lead(n)) p.r.el.classList.add('off');
              if (idx === 5 && tense) plan[6].r.el.classList.add('tense');
            }
          } else {
            const before = Math.floor(p.r.pos); p.r.pos += p.v * dt; place(p.r);
            if (Math.floor(p.r.pos) !== before) Sound.tick();
          }
        }
        if (tense && !forced && t > plan[5].stopAt + 300 && t - lastBeat > 640 && !plan[6].done) { lastBeat = t; Sound.heart(); }
        if (live) raf = requestAnimationFrame(step); else { light(n); resolve(); }
      };
      raf = requestAnimationFrame(step);
    });
  }
  const tint = color => document.documentElement.style.setProperty('--digit', color);
  return { measure, setNow, spin, tint };
})();

/* ---------- Game state and result display ---------- */
const G = { busy: false, skip: false, auto: false, mode: 'free', dive: [], preview: false, wake: null, lastResult: null };
const SPEED = {
  show: { spin: 620, stagger: 150, step: 1, hold: 500 },
  fast: { spin: 170, stagger: 34, step: .14, hold: 170 },
  instant: { spin: 0, stagger: 0, step: 0, hold: 50 },
};
function setTier(color) { document.documentElement.style.setProperty('--tier', color); }
function shake(amp, ms = 420) {
  if (reduced || !S.opts.effects) return;
  const a = $('app'); a.style.setProperty('--amp', amp + 'px'); a.style.setProperty('--shake-ms', ms + 'ms');
  a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake');
}
function retrigger(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
function setEP(v) { $('ep').innerHTML = `${fmt(v)} <small>EP</small>`; }
let epAnim = 0, epShown = 0;
function tweenEP(to, ms) {
  cancelAnimationFrame(epAnim);
  if (!ms) { epShown = to; setEP(to); return; }
  const from = epShown, t0 = performance.now();
  const f = now => { const q = clamp((now - t0) / ms, 0, 1), e = 1 - (1 - q) ** 3; epShown = from + (to - from) * e; setEP(epShown); if (q < 1) epAnim = requestAnimationFrame(f); };
  epAnim = requestAnimationFrame(f);
}
const wait = ms => new Promise(r => { const t = setTimeout(r, ms); G.wake = () => { clearTimeout(t); r(); }; });
const bump = id => retrigger($(id), 'bump');

function ladderHTML() {
  return `<div class="ladder">${TIERS.map((t, i) => `<div style="--c:${t.color}"><b>${t.name}</b><span>${t.zone}</span><i>${i ? fmt(t.floor) + '+' : 'under 2,087'}</i></div>`).reverse().join('')}</div>`;
}
function idleHaul() {
  $('haulTitle').textContent = 'Depth chart'; $('haulCount').textContent = 'EP needed';
  $('haul').innerHTML = `<li>${ladderHTML()}<p class="hint">Each badge your number earns adds EP, and EP drags the lead deeper. Reach the Hadal Trench and you're in the top 1% of all rolls.</p></li>`;
}
const SEG = window.Intl && Intl.Segmenter ? new Intl.Segmenter('en', { granularity: 'grapheme' }) : null;
function iconHTML(b, base) {
  const n = SEG ? [...SEG.segment(b.icon)].length : 1;
  return `<span class="ic" aria-hidden="true" style="font-size:${Math.round(base * [1, 1, .72, .5, .4][Math.min(n, 4)])}px">${b.icon}</span>`;
}
function rowHTML(b, isNew, animate) {
  const big = b.ep >= 10000;
  return `<li class="row ${big ? 'big' : ''} ${animate ? 'in' : ''}" style="--c:${badgeColor(b.ep)}">${iconHTML(b, 20)}<span class="nm">${b.name}${isNew ? '<span class="new">New</span>' : ''}<span class="ds">${b.desc}</span></span><span class="pts">+${fmt(b.ep)}</span></li>`;
}
function outrankedHTML(r) {
  return r.outranked.length ? `<li class="outranked">Outranked in family, no EP: ${r.outranked.map(b => `<s>${b.name}</s>`).join(', ')}</li>` : '';
}
function showMeta(r) {
  $('meta').innerHTML = `<b>${TIERS[r.tier].zone}</b>, ${fmt(r.fm)} fathoms. Beats <b>${pctText(r.pct)}%</b> of rolls.`;
}
function showFinal(r) {
  const t = TIERS[r.tier];
  setTier(t.color); Reels.tint(t.color); Scene.tierNow = r.tier;
  const st = $('stamp'); st.textContent = t.name; st.className = 'stamp' + (r.tier === 6 ? ' t6' : ''); retrigger(st, 'hit');
  showMeta(r);
  $('haulCount').textContent = `${r.earned.length} earned, ${r.paid.length} paid`;
  $('live').textContent = `${fmt(r.n)}: ${fmt(r.total)} EP, ${t.name}. ${r.paid.length} badges paid.`;
}

/* Commit a roll to the save, returning what was new. */
function record(r) {
  S.rolls++; S.life += r.total; S.tiers[r.tier]++;
  const firstTier = S.tiers[r.tier] === 1, fresh = new Set(), before = new Set(SETS.filter(s => setDone(s) === s.members.length).map(s => s.name));
  for (const b of r.earned) { if (!S.badges[b.name]) fresh.add(b.name); S.badges[b.name] = (S.badges[b.name] || 0) + 1; }
  const best = !S.best || r.total > S.best.total;
  if (best) S.best = { n: r.n, total: r.total, tier: r.tier };
  S.log.unshift({ n: r.n, t: r.total, k: r.tier, f: fresh.size });
  if (S.log.length > 300) S.log.length = 300;
  const doneSets = SETS.filter(s => setDone(s) === s.members.length && !before.has(s.name));
  save();
  return { fresh, best, firstTier, doneSets };
}
function refreshStats() {
  const found = Object.keys(S.badges).length;
  $('sRolls').firstChild.textContent = fmt(S.rolls);
  $('sLife').firstChild.textContent = compact(S.life);
  $('sBest').firstChild.textContent = compact(S.best ? S.best.total : 0);
  $('sBadges').firstChild.textContent = `${found}/233`;
  $('dockBadges').textContent = `${found}/233`;
  $('dockSets').textContent = `${setsComplete()}/16`;
  if (S.best) Scene.setBest(zoneOf(S.best.total));
}
const compact = v => v >= 1e9 ? (v / 1e9).toFixed(2) + 'B' : v >= 1e7 ? (v / 1e6).toFixed(1) + 'M' : fmt(v);
function toast(text) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = text;
  const box = $('toasts'); while (box.children.length > 2) box.firstChild.remove();
  box.append(t); setTimeout(() => t.remove(), 3000);
}
function celebrate(r, info, speed) {
  if (speed === 'instant' && r.tier < 4) return;
  const reel = $('reels').getBoundingClientRect(), x = reel.left + reel.width / 2, y = reel.top + reel.height / 2, color = TIERS[r.tier].color;
  if (r.tier >= 3) { FX.burst(x, y, color, 30 + r.tier * 26, 4 + r.tier * 1.5); shake(1.5 + (r.tier - 2) * 2.2, 300 + r.tier * 60); }
  if (r.tier >= 5) { const w = $('whiteout'); w.style.setProperty('--c', color); retrigger(w, 'go'); }
  Sound.stinger(r.tier);
  if (r.tier >= 2) Sound.sonar(r.u);
  Scene.ping();
}
function notify(r, info) {
  if (G.preview) return;
  const rares = [...info.fresh].map(n => BY_NAME.get(n)).filter(b => b.tier >= 2).sort((a, b) => b.ep - a.ep);
  if (rares.length) { toast(`New ${BADGE_TIERS[rares[0].tier]} badge: ${rares[0].name}`); Sound.fresh(); }
  else if (info.fresh.size >= 1) { toast(info.fresh.size === 1 ? `New badge: ${[...info.fresh][0]}` : `${info.fresh.size} new badges`); Sound.fresh(); }
  if (info.best && S.rolls > 1) { toast(`New best: ${fmt(r.total)} EP`); bump('sBest'); }
  if (info.firstTier && r.tier >= 3) toast(`First ${TIERS[r.tier].name} roll`);
  info.doneSets.forEach(s => { toast(`Set complete: ${s.name}`); Sound.fanfareSet(); });
}
function mythicCard(r) {
  return new Promise(res => {
    const top = r.paid.slice().sort((a, b) => b.ep - a.ep)[0], f = $('finish');
    f.innerHTML = `<div style="--c:${TIERS[6].color}"><h2>Hadal Trench</h2><div class="big">${fmt(r.n)}</div><p>${fmt(r.total)} EP at ${fmt(r.fm)} fathoms. Biggest badge: ${top.icon} ${top.name}.</p><p>Only ${fmt(ROLLS - rollsBelow(r.total))} of 1,000,001 rolls reach this score or better.</p><div class="row-btns"><button class="btn" id="fClose">Keep diving</button></div></div>`;
    f.hidden = false;
    const close = () => { f.hidden = true; res(); };
    $('fClose').onclick = close; $('fClose').focus();
  });
}

/* ---------- The roll ---------- */
async function play(n, { preview = false } = {}) {
  if (G.busy) return;
  G.busy = true; G.skip = false; G.preview = preview; Sound.init();
  const speed = (document.hidden ? 'instant' : S.opts.speed), cfg = SPEED[speed], r = scoreRoll(n);
  $('rollLabel').textContent = speed === 'instant' ? 'Roll' : 'Skip';
  setTier('#eafcff'); Reels.tint('#5ef2e4'); Scene.tierNow = 0;
  const haul = $('haul');
  $('haulTitle').textContent = preview ? 'Replay' : `Roll ${fmt(S.rolls + 1)}`; $('haulCount').textContent = '';
  $('stamp').textContent = ''; $('stamp').className = 'stamp';

  if (speed === 'instant') {
    Reels.setNow(n); haul.innerHTML = '';
    Scene.sink(r.u, 30);
    tweenEP(r.total, 0);
  } else {
    haul.innerHTML = ''; tweenEP(0, 0); $('meta').textContent = 'Sounding...';
    Scene.sink(0, speed === 'show' ? 7 : 16);
    if (speed === 'show') Sound.press();
    const tense = speed === 'show' ? [0, 0, 0, 0, 500, 1300, 2200][r.tier] : 0;
    await Reels.spin(n, { spinMs: cfg.spin, stagger: cfg.stagger, tense, skip: () => G.skip });
    Scene.sink(.05, 6); if (speed === 'show' && !G.skip) Sound.plunge();

    const order = r.paid.slice().sort((a, b) => a.ep - b.ep);
    let running = 0, tierNow = 0, i = 0;
    const base = clamp(1500 / order.length, 45, 165);
    for (const b of order) {
      running += b.ep;
      const skipping = G.skip;
      if (!skipping) {
        haul.insertAdjacentHTML('afterbegin', rowHTML(b, !preview && !S.badges[b.name], true));
        if (speed === 'show') Sound.ping(i, b.tier); else if (i % 2 === 0) Sound.blip(b.tier);
        Scene.sink(zoneOf(running), speed === 'show' ? 4 + b.tier : 12);
        tweenEP(running, speed === 'show' ? Math.min(150, base) : 40);
        const t = tierOf(running);
        if (t > tierNow) {
          tierNow = t; setTier(TIERS[t].color); Reels.tint(TIERS[t].color); Scene.tierNow = t;
          if (t >= 2 && speed === 'show') { Scene.ping(); Sound.sonar(zoneOf(running)); flashZone(t); }
        }
        i++;
        const hold = b.tier >= 2 && speed === 'show' ? 200 + b.tier * 150 : 0;
        if (speed === 'show' && b.tier >= 2) { const q = $('reels').getBoundingClientRect(); FX.burst(q.right, q.top + q.height / 2, badgeColor(b.ep), 8 + b.tier * 6, 2 + b.tier); shake(b.tier * 1.1, 200); }
        await wait(base * (speed === 'show' ? 1 : cfg.step * 3) + hold);
      }
    }
    if (G.skip) tweenEP(r.total, 0);
  }

  const info = preview ? { fresh: new Set(), doneSets: [] } : record(r);
  haul.innerHTML = r.paid.slice().sort((a, b) => b.ep - a.ep).map(b => rowHTML(b, info.fresh.has(b.name), false)).join('') + outrankedHTML(r);
  Scene.sink(r.u, speed === 'instant' ? 30 : 5);
  tweenEP(r.total, speed === 'instant' || G.skip ? 0 : 120);
  showFinal(r); celebrate(r, info, speed);
  G.lastResult = r;
  refreshStats(); if (!preview) { if (info.fresh.size) bump('sBadges'); notify(r, info); }
  if (G.mode === 'dive' && !preview) diveStep(r);
  $('rollLabel').textContent = G.mode === 'dive' && G.dive.length >= 10 ? 'Dive again' : 'Roll';
  G.busy = false;

  if (r.tier === 6 && speed !== 'instant' && !G.auto && !preview) await mythicCard(r);
  if (G.mode === 'dive' && G.dive.length >= 10 && !preview) { setAuto(false); return diveFinish(); }
  if (G.auto) {
    if (shouldStop(r, info)) { setAuto(false); toast('Auto stopped'); return; }
    await new Promise(res => setTimeout(res, document.hidden ? 40 : cfg.hold));
    if (G.auto) rollNext();
  }
}
function shouldStop(r, info) {
  const v = S.opts.autoStop;
  if (v === 'new') return info.fresh.size > 0;
  return r.tier >= +v;
}
function flashZone(t) {
  const z = $('zoneFlash'); z.textContent = TIERS[t].zone; z.style.setProperty('--c', TIERS[t].color); retrigger(z, 'go');
}
function rollNext() {
  if (G.busy) { G.skip = true; if (G.wake) G.wake(); return; }
  if (!$('finish').hidden || !$('drawer').hidden) return;
  if (G.mode === 'dive' && G.dive.length >= 10) { resetDive(); }
  play(randomRoll());
}
function setAuto(on) {
  G.auto = on; $('btnAuto').setAttribute('aria-pressed', on);
  if (on && !G.busy) rollNext();
}

/* ---------- 10-roll dive ---------- */
function resetDive() { G.dive = []; drawDive(); }
function drawDive() {
  $('pips').innerHTML = Array.from({ length: 10 }, (_, i) => { const r = G.dive[i]; return `<span class="pip ${r ? 'on' : ''}" style="color:${r ? TIERS[r.tier].color : 'inherit'}"></span>`; }).join('');
  $('runTotal').textContent = fmt(G.dive.reduce((a, r) => a + r.total, 0));
}
function diveStep(r) { G.dive.push(r); drawDive(); }
const SQUARES = ['⬛', '⬜', '🟩', '🟦', '🟪', '🟧', '🟥'];
function diveFinish() {
  const total = G.dive.reduce((a, r) => a + r.total, 0), best = total > S.bestDive, top = G.dive.reduce((a, r) => r.total > a.total ? r : a);
  if (best) { S.bestDive = total; save(); }
  const u = zoneOf(total / 10), t = tierOf(total / 10), f = $('finish');
  const share = `Million Fathoms 10-roll dive\n${G.dive.map(r => SQUARES[r.tier]).join('')}\n${fmt(total)} EP, best roll ${fmt(top.n)}`;
  f.innerHTML = `<div style="--c:${TIERS[t].color}"><h2>Dive complete</h2><div class="big">${fmt(total)} EP</div><p>${best ? 'Your best dive so far.' : `Your best dive is ${fmt(S.bestDive)} EP.`} Average depth ${fmt(fathoms(u))} fathoms, in the ${TIERS[t].zone}.</p><p>Deepest roll: ${fmt(top.n)}, ${TIERS[top.tier].name}, ${fmt(top.total)} EP.</p><p style="font-size:22px">${G.dive.map(r => SQUARES[r.tier]).join('')}</p><div class="row-btns"><button class="btn" id="fAgain">Dive again</button><button class="btn ghost" id="fCopy">Copy result</button><button class="btn ghost" id="fClose">Close</button></div></div>`;
  f.hidden = false; Sound.stinger(Math.max(2, t));
  $('fAgain').onclick = () => { f.hidden = true; resetDive(); rollNext(); };
  $('fClose').onclick = () => { f.hidden = true; };
  $('fCopy').onclick = () => copyText(share, $('fCopy'));
  $('fAgain').focus();
}
function copyText(text, btn) {
  const done = ok => { btn.textContent = ok ? 'Copied' : 'Copy failed'; };
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => done(true), () => done(false)); else done(false);
}
function setMode(m) {
  G.mode = m; setAuto(false);
  $('modeFree').setAttribute('aria-pressed', m === 'free'); $('modeDive').setAttribute('aria-pressed', m === 'dive');
  $('run').hidden = m !== 'dive'; resetDive();
  $('rollLabel').textContent = 'Roll';
}

/* ---------- Drawer ---------- */
const TABS = [['log', 'Log'], ['codex', 'Badges'], ['sets', 'Sets'], ['check', 'Check a number'], ['how', 'How it scores'], ['settings', 'Settings']];
const D = { tab: 'log', tierF: 'all', own: 'all', q: '', checkN: null, confirm: false };
function openDrawer(tab) {
  D.tab = tab; $('drawer').hidden = false; Sound.ui(); renderDrawer(); $('pane').focus({ preventScroll: true });
}
function closeDrawer() { $('drawer').hidden = true; Sound.ui(); }
function renderDrawer() {
  $('tabs').innerHTML = TABS.map(([k, l]) => `<button role="tab" aria-selected="${k === D.tab}" data-tab="${k}">${l}</button>`).join('') + '<button class="close" id="drawerClose" aria-label="Close">×</button>';
  $('pane').innerHTML = ({ log: paneLog, codex: paneCodex, sets: paneSets, check: paneCheck, how: paneHow, settings: paneSettings })[D.tab]();
  $('pane').scrollTop = 0;
  if (D.tab === 'codex') bindCodex();
  if (D.tab === 'check') bindCheck();
  if (D.tab === 'settings') bindSettings();
}
function paneLog() {
  if (!S.rolls) return '<p class="empty">No rolls yet. Close this and press Roll, and every number you land will be listed here.</p>';
  const max = Math.max(...S.tiers, 1), top = S.best;
  const rarest = Object.keys(S.badges).map(n => BY_NAME.get(n)).sort((a, b) => b.ep - a.ep)[0];
  return `<div class="cards3">
    <div class="mini"><b>${fmt(S.rolls)}</b><span>Rolls</span></div>
    <div class="mini"><b>${fmt(S.life)}</b><span>Lifetime EP</span></div>
    <div class="mini"><b>${fmt(S.life / S.rolls)}</b><span>Average EP</span></div>
    <div class="mini"><b>${fmt(top.n)}</b><span>Best roll, ${fmt(top.total)} EP</span></div>
    <div class="mini"><b>${rarest ? rarest.icon + ' ' + rarest.name : 'None'}</b><span>Rarest badge found</span></div>
    <div class="mini"><b>${fmt(S.bestDive)}</b><span>Best 10-roll dive</span></div>
  </div>
  <div class="tiersbars">${TIERS.map((t, i) => `<div class="tb" style="--c:${t.color}"><b>${t.name}</b><div class="bar"><i style="width:${100 * S.tiers[i] / max}%"></i></div><span>${fmt(S.tiers[i])}</span></div>`).reverse().join('')}</div>
  <h3>Latest rolls</h3>
  <table><thead><tr><th>Number</th><th class="r">EP</th><th>Tier</th><th class="r">New</th></tr></thead><tbody>${S.log.map(l => `<tr class="go" data-n="${l.n}"><td>${fmt(l.n)}</td><td class="r">${fmt(l.t)}</td><td style="color:${TIERS[l.k].color};font-weight:700">${TIERS[l.k].name}</td><td class="r">${l.f || ''}</td></tr>`).join('')}</tbody></table>`;
}
function codexCards() {
  const q = D.q.trim().toLowerCase();
  const list = BADGES.filter(b => (D.tierF === 'all' || b.tier === +D.tierF) && (D.own === 'all' || (D.own === 'found') === !!S.badges[b.name]) && (!q || (b.name + ' ' + b.desc).toLowerCase().includes(q))).sort((a, b) => a.ep - b.ep);
  if (!list.length) return '<p class="empty">No badges match. Clear the search or pick another filter.</p>';
  return `<div class="grid">${list.map(b => {
    const hits = S.badges[b.name] || 0, odds = ROLLS / b.count;
    return `<div class="card ${hits ? '' : 'locked'}" style="--c:${badgeColor(b.ep)}">${iconHTML(b, 22)}<span class="nm">${b.name}</span><span class="ds">${b.desc}</span><span class="ft"><span><b>${fmt(b.ep)}</b> EP</span><span>1 in ${odds < 10 ? odds.toFixed(1) : fmt(odds)}</span><span>${hits ? fmt(hits) + '×' : 'Not found'}</span></span></div>`;
  }).join('')}</div>`;
}
function paneCodex() {
  const found = Object.keys(S.badges).length;
  return `<div class="filters"><input class="search" id="cSearch" placeholder="Search ${233} badges" aria-label="Search badges" value="${D.q.replace(/"/g, '')}"><button class="chip" data-own="all" aria-pressed="${D.own === 'all'}">All</button><button class="chip" data-own="found" aria-pressed="${D.own === 'found'}">Found ${found}</button><button class="chip" data-own="missing" aria-pressed="${D.own === 'missing'}">Missing ${233 - found}</button></div>
  <div class="filters"><button class="chip" data-tierf="all" aria-pressed="${D.tierF === 'all'}">Any rarity</button>${BADGE_TIERS.map((t, i) => `<button class="chip" style="--c:${TIERS[i + 1].color}" data-tierf="${i}" aria-pressed="${D.tierF === String(i)}">${t}</button>`).join('')}</div>
  <div id="cGrid">${codexCards()}</div>`;
}
function bindCodex() {
  $('cSearch').oninput = e => { D.q = e.target.value; $('cGrid').innerHTML = codexCards(); };
}
function paneSets() {
  return `<p>Sets group badges into collections. They don't change your score. Finish all 16 for bragging rights.</p><div class="sets">${SETS.map(s => {
    const n = setDone(s), full = n === s.members.length;
    return `<div class="set"><h4>${s.name}<span>${n}/${s.members.length}</span></h4><div class="bar"><i style="width:${100 * n / s.members.length}%;${full ? 'background:var(--hull)' : ''}"></i></div><p>${s.desc} ${s.members.map(m => S.badges[m] ? `<b>${m}</b>` : m).join(', ')}</p></div>`;
  }).join('')}</div>`;
}
function checkBody() {
  if (D.checkN == null) return '<p class="empty">Enter any whole number from 0 to 1,000,000 to see what it would score. Checking a number never adds to your stats.</p>';
  const r = scoreRoll(D.checkN), t = TIERS[r.tier];
  return `<div class="result-head" style="--tier:${t.color}">${fmt(r.n)}: ${fmt(r.total)} EP, ${t.name}</div><p><b>${t.zone}</b>, ${fmt(r.fm)} fathoms. Beats <b>${pctText(r.pct)}%</b> of rolls. ${r.earned.length} badges earned, ${r.paid.length} paid.</p>
  <button class="btn" id="cWatch">Watch this dive</button><ul class="haul-list" style="padding:8px 0 0">${r.paid.slice().sort((a, b) => b.ep - a.ep).map(b => rowHTML(b, false, false)).join('')}${outrankedHTML(r)}</ul>`;
}
function paneCheck() {
  return `<form class="check-form" id="cForm"><label for="cInput" class="sr">Number to check</label><input id="cInput" inputmode="numeric" autocomplete="off" placeholder="61287" value="${D.checkN ?? ''}"><button class="btn" type="submit">Check</button><button class="btn ghost" type="button" id="cRand">Random</button></form><div id="cBody">${checkBody()}</div>`;
}
function bindCheck() {
  const run = v => {
    const clean = String(v).replace(/[,\s]/g, ''), n = Number(clean);
    if (!/^\d+$/.test(clean) || n > MAX_ROLL) { D.checkN = null; $('cBody').innerHTML = '<p class="empty">That is not a roll. Enter a whole number from 0 to 1,000,000.</p>'; return; }
    D.checkN = n; $('cBody').innerHTML = checkBody(); bindWatch(); Sound.blip(1);
  };
  const bindWatch = () => { const w = $('cWatch'); if (w) w.onclick = () => { const n = D.checkN; closeDrawer(); setTimeout(() => play(n, { preview: true }), 120); }; };
  $('cForm').onsubmit = e => { e.preventDefault(); run($('cInput').value); };
  $('cRand').onclick = () => { const n = randomRoll(); $('cInput').value = n; run(n); };
  bindWatch();
}
function paneHow() {
  return `<h3>The roll</h3><p>Each press draws a whole number from 0 to 1,000,000 with your browser's secure random generator. All <b>1,000,001</b> outcomes are equally likely, and nothing you do changes the odds.</p>
  <h3>Badges</h3><p>Your number is tested against <b>233</b> rules. A badge is worth 100 divided by its chance of appearing, so a 1-in-10 badge pays 1,000 EP and a one-in-a-million badge pays about 100 million. On average every badge pays the same 100 EP per roll. Rare ones just pay it all at once.</p>
  <h3>Families</h3><p>168 badges sit in 39 families of related patterns. In each family only the highest-value badge pays. The others still go in your collection and show as outranked.</p>
  <h3>Rarity and depth</h3><p>Your total EP is ranked against every possible roll. That rank sets your tier, and your tier sets how deep the lead sinks. The deepest roll in the game reaches 5,960 fathoms, the depth of the Challenger Deep.</p>
  <div style="overflow-x:auto"><table class="lad2"><thead><tr><th>Tier</th><th>Zone</th><th class="r">EP from</th><th>Share of rolls</th></tr></thead><tbody>${TIERS.map((t, i) => `<tr><td style="color:${t.color};font-weight:700">${t.name}</td><td>${t.zone}</td><td class="r">${i ? fmt(t.floor) : '1,759'}</td><td>${t.note}</td></tr>`).reverse().join('')}</tbody></table></div>
  <h3>Badge rarity</h3><p>Common appears on over 10% of rolls, Uncommon on 1 to 10%, Rare on 0.1 to 1%, Epic on 0.01 to 0.1%, Anomaly on 0.001 to 0.01%, and Mythic on less than 0.001%.</p>
  <h3>About this game</h3><p>Million Fathoms is an unofficial offline fan practice game based on the scoring of the daily game RNGdle. It has no connection to RNGdle, and rolls here don't count towards any account there. Badge rules were rebuilt from publicly shared data, so a score could occasionally differ from the real game.</p>`;
}
function paneSettings() {
  const o = S.opts;
  return `<div class="settings">
    <label>Sound <input type="checkbox" id="oSound" ${o.sound ? 'checked' : ''}></label>
    <label>Volume <input type="range" id="oVol" min="0" max="1" step=".05" value="${o.vol}"></label>
    <label>Ocean ambience <input type="checkbox" id="oAmb" ${o.ambient ? 'checked' : ''}></label>
    <label>Screen shake and particles <input type="checkbox" id="oFx" ${o.effects ? 'checked' : ''}></label>
    <p style="margin:6px 0 0">Keys: Space or Enter rolls and skips, A toggles auto, 1, 2 and 3 set speed, M mutes, B opens badges, Esc closes this panel.</p>
    <p style="margin:0">Your progress is saved in this browser only. ${S.rolls ? `It holds ${fmt(S.rolls)} rolls.` : ''}</p>
    <div id="resetBox">${D.confirm ? '<p style="color:var(--ink)">Erase all rolls, badges and sets? This can\'t be undone.</p><div style="display:flex;gap:8px"><button class="btn danger" id="oWipe">Erase everything</button><button class="btn ghost" id="oKeep">Keep my progress</button></div>' : '<button class="btn ghost" id="oReset">Reset progress</button>'}</div>
  </div>`;
}
function bindSettings() {
  const o = S.opts;
  $('oSound').onchange = e => { o.sound = e.target.checked; Sound.init(); Sound.setVolume(); syncSound(); save(); };
  $('oVol').oninput = e => { o.vol = +e.target.value; Sound.init(); Sound.setVolume(); save(); };
  $('oVol').onchange = () => Sound.ping(4, 1);
  $('oAmb').onchange = e => { o.ambient = e.target.checked; Sound.init(); Sound.ambient(); save(); };
  $('oFx').onchange = e => { o.effects = e.target.checked; save(); };
  const rb = () => { renderDrawer(); };
  const r = $('oReset'); if (r) r.onclick = () => { D.confirm = true; rb(); };
  const k = $('oKeep'); if (k) k.onclick = () => { D.confirm = false; rb(); };
  const w = $('oWipe'); if (w) w.onclick = () => {
    const opts = S.opts; S = fresh(); S.opts = opts; D.confirm = false; G.dive = []; drawDive(); save(); refreshStats(); Scene.setBest(null); Scene.sink(0, 5);
    Reels.setNow(0); tweenEP(0, 0); $('stamp').textContent = ''; $('meta').textContent = 'Progress erased. Ready to dive.'; idleHaul(); rb();
  };
}
function syncSound() {
  $('btnSound').setAttribute('aria-pressed', S.opts.sound);
  $('soundWaves').style.display = S.opts.sound ? '' : 'none';
}

/* ---------- Wiring ---------- */
function setSpeed(v) {
  S.opts.speed = v; save();
  document.querySelectorAll('[data-speed]').forEach(b => b.setAttribute('aria-pressed', b.dataset.speed === v));
}
$('btnRoll').onclick = () => { Sound.init(); rollNext(); };
$('btnAuto').onclick = () => { Sound.init(); Sound.ui(); setAuto(!G.auto); };
$('autoStop').value = S.opts.autoStop;
$('autoStop').onchange = e => { S.opts.autoStop = e.target.value; save(); };
document.querySelectorAll('[data-speed]').forEach(b => { b.onclick = () => { Sound.init(); Sound.ui(); setSpeed(b.dataset.speed); }; });
document.querySelectorAll('[data-open]').forEach(b => { b.onclick = () => { Sound.init(); setAuto(false); openDrawer(b.dataset.open); }; });
$('btnSound').onclick = () => { Sound.init(); S.opts.sound = !S.opts.sound; Sound.setVolume(); syncSound(); save(); };
$('modeFree').onclick = () => { Sound.init(); Sound.ui(); setMode('free'); };
$('modeDive').onclick = () => { Sound.init(); Sound.ui(); setMode('dive'); };
$('tabs').addEventListener('click', e => {
  const t = e.target.closest('[data-tab]');
  if (t) { D.tab = t.dataset.tab; D.confirm = false; Sound.ui(); renderDrawer(); return; }
  if (e.target.id === 'drawerClose') closeDrawer();
});
$('drawer').addEventListener('click', e => { if (e.target === $('drawer')) closeDrawer(); });
$('pane').addEventListener('click', e => {
  const row = e.target.closest('tr[data-n]');
  if (row) { D.checkN = +row.dataset.n; D.tab = 'check'; renderDrawer(); return; }
  const own = e.target.closest('[data-own]');
  if (own) { D.own = own.dataset.own; renderDrawer(); return; }
  const tf = e.target.closest('[data-tierf]');
  if (tf) { D.tierF = tf.dataset.tierf; renderDrawer(); }
});
addEventListener('keydown', e => {
  if (e.target.matches('input, select, textarea')) { if (e.key === 'Escape') { e.target.blur(); if (!$('drawer').hidden) closeDrawer(); } return; }
  const open = !$('drawer').hidden, fin = !$('finish').hidden;
  if (e.key === 'Escape') { if (open) closeDrawer(); else if (fin && $('fClose')) $('fClose').click(); return; }
  if (open || fin) return;
  if (e.key === ' ' || e.key === 'Enter') {
    if (e.target.tagName === 'BUTTON' && e.target.id !== 'btnRoll' && e.key === 'Enter') return;
    e.preventDefault(); $('btnRoll').classList.add('down'); Sound.init(); rollNext();
  } else if (e.key === 'a' || e.key === 'A') { Sound.init(); setAuto(!G.auto); }
  else if (e.key === 'm' || e.key === 'M') { $('btnSound').click(); }
  else if (e.key === 'b' || e.key === 'B') { openDrawer('codex'); }
  else if (e.key >= '1' && e.key <= '3') { setSpeed(['show', 'fast', 'instant'][+e.key - 1]); }
});
addEventListener('keyup', e => {
  if (e.key === ' ' || e.key === 'Enter') { $('btnRoll').classList.remove('down'); if (e.target.tagName === 'BUTTON' && e.key === ' ' && $('drawer').hidden && $('finish').hidden) e.preventDefault(); }
});

function boot() {
  Reels.measure();
  setSpeed(S.opts.speed); syncSound(); drawDive(); refreshStats(); Scene.start();
  const last = S.log[0];
  if (last) {
    const r = scoreRoll(last.n);
    Reels.setNow(r.n); setEP(r.total); epShown = r.total; Scene.sink(r.u, 8); showFinal(r);
    $('haulTitle').textContent = 'Last roll';
    $('haul').innerHTML = r.paid.slice().sort((a, b) => b.ep - a.ep).map(b => rowHTML(b, false, false)).join('') + outrankedHTML(r);
  } else { Reels.setNow(0); document.querySelectorAll('.reel').forEach(el => el.classList.add('off')); idleHaul(); }
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot); else boot();
window.MF = { play, scoreRoll, Sound, get state() { return S; }, get game() { return G; } };
