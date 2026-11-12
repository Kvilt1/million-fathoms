/* Dive scene: the sea behind everything, typed in ASCII. Its depth is the score.
   The water is a world-anchored field of characters in the current tier colour that scrolls past as the
   lead sinks. Each tier floor is a ruled line that lights up once the lead passes it. A boat sits on a
   wave line at the surface, the trench walls are stacks of '#', and the life is small ASCII creatures:
   fish, jellyfish, twinkling plankton, swaying tendrils and anglers. The depth ruler down the left is
   the line-number gutter. With reduced motion nothing drifts or blinks and the camera jumps. */
import { TIERS, clamp, lerp, fathoms, fmt } from '../game/score';

type Life =
  | { k: 'school'; u: number; x: number; v: number; n: number; p: number; big: boolean }
  | { k: 'jelly'; u: number; x: number; v: number; p: number; c: number }
  | { k: 'glow'; u: number; x: number; v: number; n: number; p: number; c: number }
  | { k: 'tendril'; u: number; x: number; v: number; len: number; p: number; c: number }
  | { k: 'angler'; u: number; x: number; v: number; p: number };

const FONT = '"VT323", ui-monospace, monospace';
const AMBER = '#ffa828', AMBER_HI = '#ffd277', DIM = '#a8742a';
/** '#rrggbb' plus an alpha from 0 to 1. */
const hexA = (hex: string, a: number) => hex + Math.round(clamp(a, 0, 1) * 255).toString(16).padStart(2, '0');
/** A repeatable 0..1 value for a grid cell. */
const hash = (a: number, b: number) => {
  let x = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35);
  x ^= x >>> 15; x = Math.imul(x, 0x2c1b3c6d); x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
};
const BOAT = ['  |\\', ' _|_\\_', ' \\___/'];
const JELLY = [[' ,-. ', '(   )', ' )|( '], [' ,-. ', '(   )', ' (|) ']];
const ANGLER_R = ['   *', '  /', ',--._', '  o  )><', '`--\''], ANGLER_L = ['    *', '     \\', '   _.--,', '><(  o', '    `--\''];
const WAVE = '~^~~-~~^~~_~~-~^~~~_~';

export function createScene(cv: HTMLCanvasElement, opts: { reduced: boolean; onDepth: (u: number) => void }) {
  const ctx = cv.getContext('2d', { alpha: false })!;
  const { reduced } = opts;
  let W = 0, H = 0, dpr = 1, rulerX = 56, lineX = 96, narrow = false, last = 0, time = 0, raf = 0, dirty = true, drawnTier = -1;
  let FS = 20, CW = 8, CH = 18, cols = 100;
  // The void: warm black at the surface down to almost nothing at the trench floor.
  const STOPS = [[22, 14, 6], [16, 10, 5], [13, 8, 4], [10, 7, 4], [8, 5, 3], [6, 4, 2], [4, 3, 2], [2, 2, 1]];
  const voidAt = (u: number) => {
    const t = clamp(u, 0, 7), i = Math.min(6, Math.floor(t)), f = t - i, a = STOPS[i], b = STOPS[i + 1];
    return `rgb(${lerp(a[0], b[0], f) | 0},${lerp(a[1], b[1], f) | 0},${lerp(a[2], b[2], f) | 0})`;
  };
  let seed = 7;
  const rnd = (a = 1, b?: number) => { seed = (seed * 16807) % 2147483647; const r = (seed - 1) / 2147483646; return b === undefined ? r * a : a + r * (b - a); };
  const sprite = (() => {
    const cache = new Map<string, HTMLCanvasElement>();
    return (color: string, size = 64) => {
      const key = color + size;
      if (cache.has(key)) return cache.get(key)!;
      const c = document.createElement('canvas'); c.width = c.height = size;
      const g = c.getContext('2d')!, r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      r.addColorStop(0, color + '66'); r.addColorStop(.3, color + '33'); r.addColorStop(1, color + '00');
      g.fillStyle = r; g.fillRect(0, 0, size, size); cache.set(key, c); return c;
    };
  })();
  const snow = Array.from({ length: 80 }, () => ({ x: rnd(), y: rnd(), z: rnd(.35, 1), a: rnd(.14, .4) }));
  const life: Life[] = [];
  for (let i = 0; i < 12; i++) life.push({ k: 'school', u: rnd(.3, 2.9), x: rnd(), v: rnd(.008, .022) * (rnd() > .5 ? 1 : -1), n: 3 + rnd(5) | 0, p: rnd(9), big: rnd() > .7 });
  for (let i = 0; i < 12; i++) life.push({ k: 'jelly', u: rnd(1.4, 5.2), x: rnd(), v: rnd(-.004, .004), p: rnd(9), c: [4, 2, 5][rnd(3) | 0] });
  for (let i = 0; i < 20; i++) life.push({ k: 'glow', u: rnd(2.8, 6.8), x: rnd(), v: rnd(-.01, .01), n: 2 + rnd(5) | 0, p: rnd(9), c: [2, 6, 2][rnd(3) | 0] });
  for (let i = 0; i < 8; i++) life.push({ k: 'tendril', u: rnd(4, 6.8), x: rnd(), v: rnd(-.003, .003), len: 6 + rnd(9) | 0, p: rnd(9), c: [5, 3, 4][rnd(3) | 0] });
  for (let i = 0; i < 3; i++) life.push({ k: 'angler', u: rnd(5, 6.7), x: rnd(), v: rnd(.004, .009) * (i % 2 ? 1 : -1), p: rnd(9) });
  const rocks = Array.from({ length: 80 }, () => rnd());
  const beacons = Array.from({ length: 6 }, () => ({ x: rnd(.15, .95), p: rnd(9), h: 2 + rnd(5) | 0 }));

  const st = { lead: 0, target: 0, cam: 0, k: 5, ring: [] as { t: number }[], best: null as number | null };
  const scale = () => H / 1.12;
  const CAM_MIN = .292;
  const yOf = (u: number) => H * .44 + (u - Math.max(st.cam, CAM_MIN)) * scale();
  const tierColor = () => TIERS[api.tierNow ?? 0].color || AMBER;
  const col = (i: number) => TIERS[i].color || AMBER;

  /* Rows of water, cached by world row. Sparse near the surface and sparser below. */
  let rowCache = new Map<number, string>();
  const rowU = () => CH / scale();
  function waterRow(k: number) {
    let s = rowCache.get(k);
    if (s !== undefined) return s;
    const u = k * rowU(), set = u < 1 ? ".'`~-." : u < 3 ? '.:,.' : u < 5 ? '.,.' : '. ', dens = lerp(.05, .014, clamp(u / 6, 0, 1));
    s = '';
    for (let c = 0; c < cols; c++) s += hash(k, c) < dens ? set[Math.floor(hash(c, k + 7919) * set.length)] : ' ';
    if (rowCache.size > 900) rowCache = new Map();
    rowCache.set(k, s);
    return s;
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    W = innerWidth; H = innerHeight; narrow = W <= 860;
    cv.width = W * dpr; cv.height = H * dpr;
    rulerX = narrow ? 0 : 76; lineX = narrow ? 7 : 104;
    FS = narrow ? 16 : 20; CH = Math.round(FS * .9);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.font = `${FS}px ${FONT}`;
    CW = ctx.measureText('MMMMMMMMMM').width / 10 || FS * .4;
    cols = Math.ceil(W / CW) + 1;
    rowCache = new Map();
    dirty = true;
  }
  const text = (s: string, x: number, y: number) => ctx.fillText(s, Math.round(x), Math.round(y));
  /** Lines of ASCII with their top-left at x, y. */
  function art(lines: string[], x: number, y: number) { for (let i = 0; i < lines.length; i++) text(lines[i], x, y + i * CH); }

  function drawWater(c: string) {
    const top = Math.max(-CH, yOf(-.1) + CH), floor = Math.min(H, yOf(7.22)), ru = rowU();
    if (floor <= top) return;
    const cam = Math.max(st.cam, CAM_MIN), k0 = Math.ceil((cam + (top - H * .44) / scale()) / ru), k1 = Math.floor((cam + (floor - H * .44) / scale()) / ru);
    ctx.fillStyle = hexA(c, .2);
    for (let k = k0; k <= k1; k++) text(waterRow(k), 0, yOf(k * ru));
  }
  function drawSurface() {
    const sy = yOf(-.1);
    if (sy < -CH) return;
    ctx.fillStyle = '#0d0905'; ctx.fillRect(0, 0, W, sy);
    // stars, anchored to the surface
    ctx.fillStyle = hexA(AMBER_HI, .34);
    for (let j = 2; sy - j * CH > -CH; j++) {
      let s = '';
      for (let c = 0; c < cols; c++) { const r = hash(-j, c); s += r < .006 ? '*' : r < .014 ? '+' : r < .03 ? '.' : ' '; }
      text(s, 0, sy - j * CH);
    }
    // the wave line rolls sideways
    const shift = Math.floor(time * 3) % WAVE.length;
    let w = ''; while (w.length < cols + WAVE.length) w += WAVE;
    ctx.fillStyle = hexA(col(2), .75); text(w.slice(shift, shift + cols), 0, sy - CH * .5);
    if (!narrow) { ctx.fillStyle = AMBER_HI; art(BOAT, lineX - CW * 2.5, sy - CH * 3.4 + Math.round(Math.sin(time * 1.3)) * 1); }
  }
  function drawZoneLines() {
    for (let i = 1; i < 7; i++) {
      const y = yOf(i) - CH / 2; if (y < -CH || y > H + CH) continue;
      const on = st.lead >= i - .001, label = `[ ${TIERS[i].zone.toUpperCase()} ${fmt(fathoms(i))} fm ]`, n = Math.max(0, cols - label.length - 4);
      if (on) { ctx.fillStyle = hexA(col(i), .9); text('===' + label + '='.repeat(n), rulerX + CW, y); }
      else { ctx.fillStyle = hexA(DIM, .5); text('- -' + label.toLowerCase() + ' -'.repeat(n >> 1), rulerX + CW, y); }
    }
  }
  function school(c: Extract<Life, { k: 'school' }>) {
    const right = c.v > 0, f = c.big ? (right ? '><(((*>' : '<*)))><') : (right ? '><>' : '<><');
    ctx.fillStyle = hexA(col(2), .62);
    for (let i = 0; i < c.n; i++) {
      const x = c.x * W + ((i * 37) % 5 - 2) * CW * (c.big ? 7 : 4) + Math.sin(time * .9 + i) * 6, y = yOf(c.u) + ((i * 3) % 4) * CH + Math.sin(time * 1.2 + i * 2) * 3;
      text(f, x, y);
    }
  }
  function jelly(c: Extract<Life, { k: 'jelly' }>) {
    const x = c.x * W + Math.sin(time * .22 + c.p) * 22, y = yOf(c.u) + Math.sin(time * .5 + c.p) * 12;
    ctx.fillStyle = hexA(col(c.c), .5 + .25 * Math.sin(time * 1.4 + c.p));
    art(JELLY[Math.floor(time * 1.4 + c.p) & 1], x, y);
  }
  function glow(c: Extract<Life, { k: 'glow' }>) {
    for (let i = 0; i < c.n; i++) {
      const a = Math.max(0, Math.sin(time * 1.3 + c.p + i * 1.4));
      const x = c.x * W + i * CW * 2 + Math.sin(time * .5 + i) * 5, y = yOf(c.u) + (i % 2) * CH + Math.cos(time * .6 + i) * 4;
      ctx.fillStyle = hexA(col(c.c), .25 + .7 * a); text(a > .8 ? '*' : a > .4 ? '+' : '.', x, y);
    }
  }
  function tendril(c: Extract<Life, { k: 'tendril' }>) {
    const y0 = yOf(c.u); let prev = 0;
    for (let i = 0; i < c.len; i++) {
      const off = Math.round(Math.sin(time * .55 + i * .35 + c.p) * (1 + i * .22));
      ctx.fillStyle = hexA(col(c.c), .3 + .5 * Math.max(0, Math.sin(time * 2.1 - i * .45 + c.p)));
      text(off > prev ? '\\' : off < prev ? '/' : i % 2 ? ')' : '(', c.x * W + off * CW, y0 + i * CH);
      prev = off;
    }
  }
  function angler(c: Extract<Life, { k: 'angler' }>) {
    const right = c.v > 0, x = c.x * W, y = yOf(c.u) + Math.sin(time * .4 + c.p) * 8, lines = right ? ANGLER_R : ANGLER_L;
    ctx.fillStyle = hexA(col(3), .6); art(lines.slice(1), x, y + CH);
    const lure = .45 + .55 * Math.max(0, Math.sin(time * 2.4 + c.p)), lx = x + (right ? 3 : 4) * CW;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = lure; ctx.drawImage(sprite(col(6), 48), lx - 20, y - 14, 48, 48); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = hexA(col(6), lure); text('*', lx, y);
  }
  function drawTrench() {
    const start = 5.4; if (st.cam < start - 1) return;
    const ru = rowU(), cam = Math.max(st.cam, CAM_MIN), fy = yOf(7.22);
    const k0 = Math.max(Math.ceil(start / ru), Math.ceil((cam + (-CH - H * .44) / scale()) / ru)), k1 = Math.min(Math.floor(7.22 / ru), Math.floor((cam + (H - H * .44) / scale()) / ru));
    const width = (k: number, side: number) => {
      const u = k * ru, close = clamp((u - start) / 1.7, 0, 1) ** 1.5, grow = clamp((u - start) / .35, 0, 1), i = Math.floor((u - start) / .03);
      return Math.round((.03 + close * .19) * W * (.7 + rocks[((i + (side > 0 ? 40 : 0)) % 80 + 80) % 80] * .5) * grow / CW);
    };
    const bg = '#030201', wallC = hexA(col(4), .55);
    for (let k = k0; k <= k1; k++) {
      const y = yOf(k * ru);
      for (const side of narrow ? [1] : [-1, 1]) {
        const w = width(k, side), prev = width(k - 1, side); if (w < 1) continue;
        const edge = w > prev ? (side < 0 ? '\\' : '/') : w < prev ? (side < 0 ? '/' : '\\') : '|';
        ctx.fillStyle = bg; ctx.fillRect(side < 0 ? 0 : W - w * CW, Math.round(y), w * CW, CH + 1);
        ctx.fillStyle = wallC;
        if (side < 0) text('#'.repeat(w - 1) + edge, 0, y); else text(edge + '#'.repeat(w - 1), W - w * CW, y);
      }
    }
    if (fy < H + CH) {
      ctx.fillStyle = bg; ctx.fillRect(0, fy, W, H - fy + 50);
      let ridge = '', bed = '';
      for (let c = 0; c < cols; c++) { const r = hash(77, c); ridge += r < .08 ? '^' : r < .14 ? '/' : r < .2 ? '\\' : '_'; bed += hash(78, c) < .3 ? '.' : '#'; }
      ctx.fillStyle = hexA(col(6), .8); text(ridge, 0, fy - CH * .6);
      ctx.fillStyle = hexA(col(6), .22); for (let j = 0; j < 6 && fy + j * CH < H; j++) text(bed, 0, fy + j * CH + CH * .3);
      for (const b of beacons) {
        const x = Math.round(b.x * W / CW) * CW, a = .4 + .5 * Math.max(0, Math.sin(time * 2 + b.p));
        ctx.fillStyle = hexA(col(5), .45); for (let j = 1; j <= b.h; j++) text('|', x, fy - CH * .6 - j * CH);
        ctx.fillStyle = hexA(col(5), a); text('*', x, fy - CH * .6 - (b.h + 1) * CH);
      }
    }
  }
  function drawLine(c: string) {
    const y = yOf(st.lead), top = Math.max(-CH, yOf(-.1) - CH * .5), x = lineX - CW / 2;
    // the sounding line: a column of pipes from the surface down to the lead
    ctx.fillStyle = hexA(AMBER, .8);
    for (let yy = y - CH * 2; yy > top; yy -= CH) text('|', x, yy);
    ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(sprite(c, 96), lineX - 48, y - 48, 96, 96); ctx.globalCompositeOperation = 'source-over';
    // the lead itself, in the tier colour
    ctx.fillStyle = c;
    text('|', x, y - CH * 1.5); text('[#]', x - CW, y - CH * .5); text('V', x, y + CH * .5);
    for (let i = st.ring.length - 1; i >= 0; i--) {
      const r = st.ring[i]; r.t += .016; const p = r.t / 1.1;
      if (p >= 1) { st.ring.splice(i, 1); continue; }
      // a sonar ping: a circle drawn with - | / \ on the character grid
      const rad = 16 + p * 300, n = Math.max(12, Math.floor(rad * 6.28 / (CW * 2.4)));
      ctx.fillStyle = hexA(c, (1 - p) * .85);
      for (let j = 0; j < n; j++) {
        const a = j / n * 6.283, cs = Math.cos(a), sn = Math.sin(a);
        const px = Math.round((lineX + cs * rad) / CW) * CW - CW / 2, py = y + Math.round(sn * rad / CH) * CH - CH * .5;
        if (px < -CW || px > W || py < -CH || py > H) continue;
        text(Math.abs(sn) > .92 ? '-' : Math.abs(cs) > .92 ? '|' : cs * sn > 0 ? '\\' : '/', px, py);
      }
    }
  }
  function drawRuler() {
    const span = 1.12 * .62;
    if (!narrow) {
      // the gutter: a rule of pipes with fathom marks, like line numbers
      ctx.fillStyle = hexA(DIM, .7);
      for (let y = 0; y < H; y += CH) text('|', rulerX - CW / 2, y);
      const c0 = Math.max(st.cam, CAM_MIN), lo = Math.floor((c0 - span) * 10) / 10, hi = c0 + span;
      ctx.textAlign = 'right';
      for (let u = Math.max(0, lo); u <= Math.min(7, hi); u = Math.round((u + .1) * 10) / 10) {
        const y = yOf(u) - CH / 2, whole = Math.abs(u - Math.round(u)) < .01, half = Math.abs(u * 2 - Math.round(u * 2)) < .01;
        ctx.fillStyle = whole ? AMBER_HI : hexA(DIM, .9);
        text(half ? `${fmt(fathoms(u))} ${whole ? '=' : '-'}` : '-', rulerX - CW * .7, y);
      }
      // zone names run down the gutter one letter to a row
      ctx.textAlign = 'center';
      for (let i = 0; i < 7; i++) {
        const name = TIERS[i].zone.toUpperCase(), y0 = yOf(i + .5) - name.length * CH / 2;
        if (y0 > H || y0 + name.length * CH < 0) continue;
        ctx.fillStyle = hexA(col(i), .8);
        for (let j = 0; j < name.length; j++) text(name[j], 10, y0 + j * CH);
      }
      ctx.textAlign = 'left';
    }
    if (st.best != null && Math.abs(st.best - st.lead) > .07) {
      const y = yOf(st.best) - CH / 2; if (y < 0 || y > H) return;
      ctx.fillStyle = col(5); text(narrow ? '<' : '<-- best', lineX + CW, y);
    }
  }
  function drawVignette() {
    const g = ctx.createRadialGradient(W / 2, H * .45, Math.min(W, H) * .35, W / 2, H * .45, Math.max(W, H) * .8);
    g.addColorStop(0, 'rgba(3,2,1,0)'); g.addColorStop(1, `rgba(3,2,1,${Math.min(.72, .25 + st.cam / 12)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
    if (reduced) {
      // still mode: jump straight to the target and redraw only when something changed
      if (st.lead !== st.target || st.cam !== st.target) { st.lead = st.cam = st.target; dirty = true; }
      if (drawnTier !== api.tierNow) dirty = true;
      if (!dirty) return;
    } else time += dt;
    dirty = false; drawnTier = api.tierNow;
    const prev = st.cam;
    if (!reduced) {
      st.lead += (st.target - st.lead) * (1 - Math.exp(-dt * st.k));
      st.cam += (st.lead - st.cam) * (1 - Math.exp(-dt * Math.max(4, st.k * .8)));
    }
    const vel = (st.cam - prev) * scale(), c = tierColor();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, voidAt(st.cam - .5)); g.addColorStop(.5, voidAt(st.cam)); g.addColorStop(1, voidAt(st.cam + .55));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.font = `${FS}px ${FONT}`; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    drawWater(c);
    drawZoneLines();
    for (const l of life) {
      if (!reduced) { l.x += l.v * dt; if (l.x > 1.1) l.x = -.1; if (l.x < -.1) l.x = 1.1; }
      const y = yOf(l.u); if (y < -240 || y > H + 240) continue;
      if (l.k === 'school') school(l); else if (l.k === 'jelly') jelly(l); else if (l.k === 'glow') glow(l); else if (l.k === 'tendril') tendril(l); else angler(l);
    }
    drawTrench();
    // marine snow: specks that streak into bars when the lead drops fast
    const fast = Math.abs(vel);
    for (const p of snow) {
      if (!reduced) {
        p.y -= (vel / H) * p.z + dt * .012 * p.z; p.y = ((p.y % 1) + 1) % 1;
        p.x += Math.sin(time * .4 + p.z * 9) * dt * .006;
      }
      ctx.fillStyle = hexA(AMBER_HI, p.a);
      text(fast * p.z > 9 ? '|' : fast * p.z > 3 ? ':' : '.', ((p.x % 1) + 1) % 1 * W, p.y * H);
    }
    drawSurface();
    drawVignette();
    drawRuler();
    drawLine(c);
  }
  const api = {
    tierNow: 0,
    start() { resize(); addEventListener('resize', resize); raf = requestAnimationFrame(t => { last = t; frame(t); }); },
    stop() { cancelAnimationFrame(raf); removeEventListener('resize', resize); },
    sink(u: number, k?: number) { st.target = u; if (k) st.k = k; opts.onDepth(u); },
    ping() { if (!reduced) st.ring.push({ t: 0 }); },
    setBest(u: number | null) { st.best = u; dirty = true; },
  };
  return api;
}
export type Scene = ReturnType<typeof createScene>;
