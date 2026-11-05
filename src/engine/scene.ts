/* Dive scene: a dark void behind everything. Its depth is the score.
   A world-anchored grid in the current tier colour scrolls past as the lead sinks; each tier floor is
   a horizontal line that lights up once the lead passes it. The surface and the trench floor are
   perspective grids. Life is drawn as thin wireframe shapes: chevron schools, polygons, node clusters
   and pulsing chains. With reduced motion nothing drifts or pulses and the camera jumps. */
import { TIERS, clamp, lerp, fathoms, fmt } from '../game/score';

type Life =
  | { k: 'school'; u: number; x: number; v: number; n: number; s: number; p: number }
  | { k: 'poly'; u: number; x: number; v: number; s: number; p: number; sides: number; c: string }
  | { k: 'node'; u: number; x: number; v: number; n: number; p: number; c: string }
  | { k: 'chain'; u: number; x: number; v: number; len: number; p: number; c: string };

const FONT = '"VT323", ui-monospace, monospace';
const CELL = 44;
/** '#rrggbb' plus an alpha from 0 to 1. */
const hexA = (hex: string, a: number) => hex + Math.round(clamp(a, 0, 1) * 255).toString(16).padStart(2, '0');

export function createScene(cv: HTMLCanvasElement, opts: { reduced: boolean; onDepth: (u: number) => void }) {
  const ctx = cv.getContext('2d', { alpha: false })!;
  const { reduced } = opts;
  let W = 0, H = 0, dpr = 1, rulerX = 56, lineX = 96, narrow = false, last = 0, time = 0, raf = 0, dirty = true, drawnTier = -1;
  // The void: near-black navy at the surface down to almost black at the trench floor.
  const STOPS = [[13, 30, 56], [10, 23, 41], [9, 19, 36], [7, 15, 30], [5, 11, 22], [4, 8, 17], [3, 7, 15], [2, 5, 11]];
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
      r.addColorStop(0, color); r.addColorStop(.25, color + '88'); r.addColorStop(1, color + '00');
      g.fillStyle = r; g.fillRect(0, 0, size, size); cache.set(key, c); return c;
    };
  })();
  const CYAN = '#4de3ff', PINK = '#ff5d8f', GOLD = '#ffd166', VIOLET = '#9d7bff', ORANGE = '#ff9f43';
  const snow = Array.from({ length: 90 }, () => ({ x: rnd(), y: rnd(), z: rnd(.35, 1), s: rnd(1, 2.6) | 0 || 1, a: rnd(.12, .37) }));
  const life: Life[] = [];
  for (let i = 0; i < 12; i++) life.push({ k: 'school', u: rnd(.35, 2.9), x: rnd(), v: rnd(.008, .022) * (rnd() > .5 ? 1 : -1), n: 5 + rnd(7) | 0, s: rnd(.8, 1.3), p: rnd(9) });
  for (let i = 0; i < 14; i++) life.push({ k: 'poly', u: rnd(1.5, 5.2), x: rnd(), v: rnd(-.004, .004), s: rnd(.7, 1.6), p: rnd(9), sides: [3, 4, 6][rnd(3) | 0], c: [VIOLET, CYAN, PINK][rnd(3) | 0] });
  for (let i = 0; i < 22; i++) life.push({ k: 'node', u: rnd(2.8, 6.8), x: rnd(), v: rnd(-.01, .01), n: 2 + rnd(5) | 0, p: rnd(9), c: [CYAN, GOLD, CYAN][rnd(3) | 0] });
  for (let i = 0; i < 8; i++) life.push({ k: 'chain', u: rnd(4, 6.9), x: rnd(), v: rnd(-.003, .003), len: 10 + rnd(14) | 0, p: rnd(9), c: [PINK, ORANGE, VIOLET][rnd(3) | 0] });
  const rocks = Array.from({ length: 80 }, () => rnd());
  const beacons = Array.from({ length: 6 }, () => ({ x: rnd(.15, .95), p: rnd(9), h: rnd(.3, .7) }));

  const st = { lead: 0, target: 0, cam: 0, k: 5, ring: [] as { t: number }[], best: null as number | null };
  const scale = () => H / 1.12;
  const CAM_MIN = .292;
  const yOf = (u: number) => H * .44 + (u - Math.max(st.cam, CAM_MIN)) * scale();
  const tierColor = () => TIERS[api.tierNow ?? 0].color || CYAN;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    W = innerWidth; H = innerHeight; narrow = W <= 860;
    cv.width = W * dpr; cv.height = H * dpr;
    rulerX = narrow ? 0 : 76; lineX = narrow ? 13 : 104;
    dirty = true;
  }
  /** A thin neon stroke: a wide faint pass under a 1px bright one. */
  function neon(color: string, a: number, draw: () => void, width = 1) {
    ctx.strokeStyle = hexA(color, a * .22); ctx.lineWidth = width + 4; ctx.beginPath(); draw(); ctx.stroke();
    ctx.strokeStyle = hexA(color, a); ctx.lineWidth = width; ctx.beginPath(); draw(); ctx.stroke();
  }
  function drawGrid(c: string) {
    const top = Math.max(0, yOf(-.1)), floor = Math.min(H, yOf(7.22));
    if (floor <= top) return;
    const x0 = (W / 2) % CELL, cellU = CELL / scale(), k0 = Math.ceil(-.1 / cellU), k1 = Math.floor(7.22 / cellU);
    const draw = (major: boolean) => {
      ctx.beginPath();
      for (let i = 0, x = x0; x < W; i++, x += CELL) if ((i % 4 === 0) === major) { ctx.moveTo((x | 0) + .5, top); ctx.lineTo((x | 0) + .5, floor); }
      for (let k = k0; k <= k1; k++) {
        if ((k % 4 === 0) !== major) continue;
        const y = yOf(k * cellU); if (y < top || y > floor) continue;
        ctx.moveTo(0, (y | 0) + .5); ctx.lineTo(W, (y | 0) + .5);
      }
      ctx.stroke();
    };
    ctx.lineWidth = 1;
    ctx.strokeStyle = hexA(c, .045); draw(false);
    ctx.strokeStyle = hexA(c, .1); draw(true);
  }
  /** Perspective grid from a horizon line at y, opening towards `edge` (0 = up, H = down). */
  function perspective(y: number, edge: number, c: string, a: number, flow: number) {
    const span = edge - y, dir = Math.sign(span); if (!dir) return;
    ctx.lineWidth = 1; ctx.strokeStyle = hexA(c, a * .6); ctx.beginPath();
    for (let i = -14; i <= 14; i++) { ctx.moveTo(W / 2 + i * CELL * .6, y); ctx.lineTo(W / 2 + i * CELL * 7, edge); }
    const n = 9;
    for (let j = 0; j < n; j++) {
      const f = ((j + flow) % n) / n, yy = y + span * f * f;
      ctx.moveTo(0, (yy | 0) + .5); ctx.lineTo(W, (yy | 0) + .5);
    }
    ctx.stroke();
    neon(c, a + .3, () => { ctx.moveTo(0, (y | 0) + .5); ctx.lineTo(W, (y | 0) + .5); }, 2);
  }
  function drawSurface() {
    const sy = yOf(-.1);
    if (sy < 0) return;
    const g = ctx.createLinearGradient(0, 0, 0, sy);
    g.addColorStop(0, '#081226'); g.addColorStop(1, '#13284a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, sy);
    perspective(sy, 0, CYAN, .35, time * .25);
  }
  function drawZoneLines() {
    ctx.setLineDash([]);
    for (let i = 1; i < 7; i++) {
      const y = (yOf(i) | 0) + .5; if (y < -10 || y > H + 10) continue;
      if (st.lead >= i - .001) neon(TIERS[i].color, .7, () => { ctx.moveTo(rulerX, y); ctx.lineTo(W, y); });
      else { ctx.strokeStyle = '#7d93b85c'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(rulerX, y); ctx.lineTo(W, y); ctx.stroke(); ctx.setLineDash([]); }
    }
  }
  function school(c: Extract<Life, { k: 'school' }>) {
    const dir = c.v > 0 ? 1 : -1, w = 7 * c.s, h = 4 * c.s;
    ctx.strokeStyle = 'rgba(142,238,255,.42)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i < c.n; i++) {
      const fx = c.x * W + i * 15 * c.s * ((i % 3) - 1) + Math.sin(time * .9 + i) * 8, fy = yOf(c.u) + (i % 4) * 11 * c.s + Math.sin(time * 1.2 + i * 2) * 4;
      ctx.moveTo(fx - dir * w, fy - h); ctx.lineTo(fx, fy); ctx.lineTo(fx - dir * w, fy + h);
    }
    ctx.stroke();
  }
  function poly(c: Extract<Life, { k: 'poly' }>) {
    const x = c.x * W + Math.sin(time * .22 + c.p) * 26, y = yOf(c.u) + Math.sin(time * .4 + c.p) * 14, r = 16 * c.s, rot = time * .25 + c.p;
    const a = .45 + .25 * Math.sin(time * 1.4 + c.p);
    neon(c.c, a, () => {
      for (let i = 0; i <= c.sides; i++) { const t = rot + i * Math.PI * 2 / c.sides; i ? ctx.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r) : ctx.moveTo(x + Math.cos(t) * r, y + Math.sin(t) * r); }
      ctx.moveTo(x - 2, y); ctx.lineTo(x + 2, y);
    });
  }
  function node(c: Extract<Life, { k: 'node' }>) {
    ctx.globalCompositeOperation = 'lighter';
    const sp = sprite(c.c, 32);
    for (let i = 0; i < c.n; i++) {
      const a = .35 + .65 * Math.max(0, Math.sin(time * 1.3 + c.p + i * 1.4));
      const x = c.x * W + i * 16 + Math.sin(time * .5 + i) * 7, y = yOf(c.u) + (i % 2) * 11 + Math.cos(time * .6 + i) * 5;
      ctx.globalAlpha = a * .7; ctx.drawImage(sp, x - 8, y - 8, 16, 16);
      ctx.globalAlpha = a; ctx.fillStyle = c.c; ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  function chain(c: Extract<Life, { k: 'chain' }>) {
    ctx.fillStyle = c.c; const y0 = yOf(c.u);
    for (let i = 0; i < c.len; i++) {
      const x = c.x * W + Math.sin(time * .55 + i * .35 + c.p) * (10 + i * 1.4), y = y0 + i * 10;
      ctx.globalAlpha = .25 + .55 * Math.max(0, Math.sin(time * 2.1 - i * .45 + c.p)); ctx.fillRect(x - 2, y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
  }
  function drawTrench() {
    const start = 5.4; if (st.cam < start - 1) return;
    // stepped walls: x snaps to an 8px grid so the outline reads as hard pixel geometry
    const wall = (side: number) => {
      ctx.beginPath(); ctx.moveTo(side < 0 ? 0 : W, Math.max(0, yOf(start)));
      let px = 0;
      for (let i = 0; i < 80; i++) {
        const u = start + i * .03, y = yOf(u); if (y < -60) continue; if (y > H + 60) break;
        const close = clamp((u - start) / 1.7, 0, 1) ** 1.5, grow = clamp((u - start) / .35, 0, 1);
        const w = Math.round((.03 + close * .19) * W * (.7 + rocks[(i + (side > 0 ? 40 : 0)) % 80] * .5) * grow / 8) * 8, x = side < 0 ? w : W - w;
        ctx.lineTo(px || x, y); ctx.lineTo(x, y); px = x;
      }
      ctx.lineTo(side < 0 ? 0 : W, H + 60); ctx.closePath();
      ctx.fillStyle = '#03060d'; ctx.fill();
      ctx.strokeStyle = hexA(VIOLET, .5); ctx.lineWidth = 1; ctx.stroke();
    };
    wall(1); if (W > 500) wall(-1);
    const fy = yOf(7.22);
    if (fy < H + 40) {
      ctx.fillStyle = '#02050b'; ctx.fillRect(0, fy, W, H - fy + 50);
      perspective(fy, H + 40, GOLD, .3, -time * .25);
      for (const b of beacons) {
        const x = (b.x * W | 0) + .5, top = fy - H * b.h * .4, a = .35 + .2 * Math.sin(time * 2 + b.p);
        const g = ctx.createLinearGradient(0, top, 0, fy); g.addColorStop(0, hexA(PINK, 0)); g.addColorStop(1, hexA(PINK, a));
        ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, fy); ctx.stroke();
        ctx.fillStyle = PINK; ctx.fillRect(x - 2.5, fy - 2.5, 5, 5);
      }
    }
  }
  function drawLine(c: string) {
    const y = yOf(st.lead), top = Math.max(0, yOf(-.1)), x = lineX + .5;
    neon(CYAN, .75, () => { ctx.moveTo(x, top); ctx.lineTo(x, y - 12); });
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .6; ctx.drawImage(sprite(c, 96), lineX - 44, y - 44, 88, 88); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // the sounding lead: a hard-edged diamond in the tier colour
    const diamond = (r: number) => { ctx.moveTo(lineX, y - r); ctx.lineTo(lineX + r, y); ctx.lineTo(lineX, y + r); ctx.lineTo(lineX - r, y); ctx.closePath(); };
    ctx.fillStyle = '#050a14'; ctx.beginPath(); diamond(11); ctx.fill();
    neon(c, 1, () => diamond(11), 2);
    ctx.fillStyle = c; ctx.beginPath(); diamond(4); ctx.fill();
    for (let i = st.ring.length - 1; i >= 0; i--) {
      const r = st.ring[i]; r.t += .016; const p = r.t / 1.1;
      if (p >= 1) { st.ring.splice(i, 1); continue; }
      ctx.globalAlpha = (1 - p) * .8; neon(c, 1, () => diamond(14 + p * 300), 1.5); ctx.globalAlpha = 1;
    }
  }
  function drawRuler() {
    const x = rulerX + .5, span = 1.12 * .62;
    ctx.font = narrow ? `13px ${FONT}` : `16px ${FONT}`;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
    if (!narrow) {
      ctx.strokeStyle = 'rgba(125,147,184,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      const c0 = Math.max(st.cam, CAM_MIN), lo = Math.floor((c0 - span) * 10) / 10, hi = c0 + span;
      ctx.lineWidth = 1;
      for (let u = Math.max(0, lo); u <= Math.min(7, hi); u = Math.round((u + .1) * 10) / 10) {
        const y = (yOf(u) | 0) + .5, whole = Math.abs(u - Math.round(u)) < .01, half = Math.abs(u * 2 - Math.round(u * 2)) < .01;
        ctx.strokeStyle = 'rgba(125,147,184,.7)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - (whole ? 16 : half ? 10 : 5), y); ctx.stroke();
        if (half) { ctx.fillStyle = whole ? '#e8f1ff' : '#7d93b8'; ctx.fillText(fmt(fathoms(u)), x - (whole ? 20 : 14), y + 1); }
      }
      for (let i = 0; i < 7; i++) {
        const y = yOf(i + .5);
        if (y < 60 || y > H - 60) continue;
        ctx.save(); ctx.translate(16, y); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.font = `17px ${FONT}`;
        ctx.fillStyle = TIERS[i].color; ctx.fillText(spaced(TIERS[i].zone.toUpperCase()), 0, 0); ctx.restore();
      }
    }
    const mark = (r: number | null, color: string, label: string) => {
      if (r == null) return;
      const y = yOf(r); if (y < 0 || y > H) return;
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(lineX - 14, y); ctx.lineTo(lineX - 22, y - 5); ctx.lineTo(lineX - 22, y + 5); ctx.fill();
      if (!narrow) { ctx.font = `14px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText(spaced(label), lineX + 14, y - 12); }
    };
    if (st.best != null && Math.abs(st.best - st.lead) > .07) mark(st.best, PINK, 'BEST');
  }
  const spaced = (s: string) => s.split('').join(' ');
  function drawVignette() {
    const g = ctx.createRadialGradient(W / 2, H * .45, Math.min(W, H) * .35, W / 2, H * .45, Math.max(W, H) * .8);
    g.addColorStop(0, 'rgba(2,4,10,0)'); g.addColorStop(1, `rgba(2,4,10,${Math.min(.72, .25 + st.cam / 12)})`);
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
    drawGrid(c);
    drawZoneLines();
    for (const l of life) {
      if (!reduced) { l.x += l.v * dt; if (l.x > 1.1) l.x = -.1; if (l.x < -.1) l.x = 1.1; }
      const y = yOf(l.u); if (y < -240 || y > H + 240) continue;
      if (l.k === 'school') school(l); else if (l.k === 'poly') poly(l); else if (l.k === 'node') node(l); else chain(l);
    }
    drawTrench();
    ctx.fillStyle = 'rgb(200,220,255)';
    for (const p of snow) {
      if (!reduced) {
        p.y -= (vel / H) * p.z + dt * .012 * p.z; p.y = ((p.y % 1) + 1) % 1;
        p.x += Math.sin(time * .4 + p.s * 6) * dt * .006;
      }
      const sx = (((p.x % 1) + 1) % 1 * W) | 0, sy = (p.y * H) | 0, stretch = clamp(Math.abs(vel) * p.z * .9, 0, 40);
      ctx.globalAlpha = p.a; ctx.fillRect(sx, sy, p.s, p.s + stretch);
    }
    ctx.globalAlpha = 1;
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
