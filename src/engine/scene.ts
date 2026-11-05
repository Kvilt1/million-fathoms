/* Dive scene: the water column behind everything. Its depth is the score. */
import { TIERS, clamp, lerp, fathoms, fmt } from '../game/score';

type Life =
  | { k: 'fish'; u: number; x: number; v: number; n: number; s: number; p: number }
  | { k: 'jelly'; u: number; x: number; v: number; s: number; p: number; c: string }
  | { k: 'lamp'; u: number; x: number; v: number; n: number; p: number; c: string }
  | { k: 'chain'; u: number; x: number; v: number; len: number; p: number; c: string };

export function createScene(cv: HTMLCanvasElement, opts: { reduced: boolean; onDepth: (u: number) => void }) {
  const ctx = cv.getContext('2d', { alpha: false })!;
  const { reduced } = opts;
  let W = 0, H = 0, dpr = 1, rulerX = 56, lineX = 96, narrow = false, last = 0, time = 0, raf = 0;
  const STOPS = [[22, 132, 160], [13, 104, 142], [11, 78, 130], [14, 50, 108], [24, 30, 92], [29, 18, 74], [23, 11, 52], [13, 5, 34]];
  const water = (u: number) => {
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
  const snow = Array.from({ length: 110 }, () => ({ x: rnd(), y: rnd(), z: rnd(.3, 1), s: rnd(.6, 2) }));
  const life: Life[] = [];
  for (let i = 0; i < 16; i++) life.push({ k: 'fish', u: rnd(.35, 2.9), x: rnd(), v: rnd(.008, .022) * (rnd() > .5 ? 1 : -1), n: 5 + rnd(9) | 0, s: rnd(.7, 1.3), p: rnd(9) });
  for (let i = 0; i < 18; i++) life.push({ k: 'jelly', u: rnd(1.5, 5.2), x: rnd(), v: rnd(-.004, .004), s: rnd(.7, 1.7), p: rnd(9), c: ['#b68cff', '#5ef2e4', '#ff5fa2', '#4cc3ff'][rnd(4) | 0] });
  for (let i = 0; i < 26; i++) life.push({ k: 'lamp', u: rnd(2.8, 6.8), x: rnd(), v: rnd(-.01, .01), n: 2 + rnd(5) | 0, p: rnd(9), c: ['#5ef2e4', '#ffd23f', '#4cc3ff'][rnd(3) | 0] });
  for (let i = 0; i < 9; i++) life.push({ k: 'chain', u: rnd(4, 6.9), x: rnd(), v: rnd(-.003, .003), len: 12 + rnd(16) | 0, p: rnd(9), c: ['#ff5fa2', '#ffb347', '#b68cff'][rnd(3) | 0] });
  const rocks = Array.from({ length: 80 }, () => rnd());
  const vents = Array.from({ length: 5 }, () => ({ x: rnd(.2, .95), p: rnd(9) }));

  const st = { lead: 0, target: 0, cam: 0, k: 5, ring: [] as { t: number }[], best: null as number | null };
  const scale = () => H / 1.12;
  const CAM_MIN = .292;
  const yOf = (u: number) => H * .44 + (u - Math.max(st.cam, CAM_MIN)) * scale();

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
  function fish(c: Extract<Life, { k: 'fish' }>) {
    ctx.fillStyle = 'rgba(190,240,255,.5)';
    const dir = c.v > 0 ? 1 : -1;
    for (let i = 0; i < c.n; i++) {
      const fx = (c.x * W + i * 15 * c.s * ((i % 3) - 1) + Math.sin(time * .9 + i) * 8), fy = yOf(c.u) + (i % 4) * 11 * c.s + Math.sin(time * 1.2 + i * 2) * 4;
      const w = Math.sin(time * 9 + i) * 2.4;
      ctx.beginPath(); ctx.ellipse(fx, fy, 7 * c.s, 2.6 * c.s, 0, 0, 7); ctx.moveTo(fx - dir * 6 * c.s, fy);
      ctx.lineTo(fx - dir * 12 * c.s, fy - 3.4 - w); ctx.lineTo(fx - dir * 12 * c.s, fy + 3.4 - w); ctx.closePath(); ctx.fill();
    }
  }
  function jelly(c: Extract<Life, { k: 'jelly' }>) {
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
  function lamp(c: Extract<Life, { k: 'lamp' }>) {
    ctx.globalCompositeOperation = 'lighter';
    const sp = sprite(c.c, 32);
    for (let i = 0; i < c.n; i++) {
      const a = .35 + .65 * Math.max(0, Math.sin(time * 1.3 + c.p + i * 1.4));
      const x = c.x * W + i * 16 + Math.sin(time * .5 + i) * 7, y = yOf(c.u) + (i % 2) * 11 + Math.cos(time * .6 + i) * 5;
      ctx.globalAlpha = a; ctx.drawImage(sp, x - 8, y - 8, 16, 16);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  function chain(c: Extract<Life, { k: 'chain' }>) {
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
    const wall = (side: number) => {
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
    const c = TIERS[api.tierNow ?? 0].color;
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
    const mark = (r: number | null, color: string, label: string) => {
      if (r == null) return;
      const y = yOf(r); if (y < 0 || y > H) return;
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(lineX - 14, y); ctx.lineTo(lineX - 22, y - 5); ctx.lineTo(lineX - 22, y + 5); ctx.fill();
      if (!narrow) { ctx.font = '700 11px "Baloo 2", sans-serif'; ctx.textAlign = 'left'; ctx.fillText(label, lineX + 14, y - 12); }
    };
    if (st.best != null && Math.abs(st.best - st.lead) > .07) mark(st.best, '#ffd23f', 'Best');
  }
  function frame(now: number) {
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
    raf = requestAnimationFrame(frame);
  }
  const api = {
    tierNow: 0,
    start() { resize(); addEventListener('resize', resize); raf = requestAnimationFrame(t => { last = t; frame(t); }); },
    stop() { cancelAnimationFrame(raf); removeEventListener('resize', resize); },
    sink(u: number, k?: number) { st.target = u; if (k) st.k = k; opts.onDepth(u); },
    ping() { st.ring.push({ t: 0 }); },
    setBest(u: number | null) { st.best = u; },
  };
  return api;
}
export type Scene = ReturnType<typeof createScene>;
