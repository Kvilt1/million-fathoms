/* Particles drawn over everything on their own canvas: bursts of ASCII characters that fly out and fade. */
import { clamp } from '../game/score';

type Part = { x: number; y: number; vx: number; vy: number; g: number; s: number; ch: string; color: string; life: number; max: number };
const CHARS = '*+.:#%/\\=-^';

export function createFX(cv: HTMLCanvasElement, enabled: () => boolean) {
  const c = cv.getContext('2d')!; let parts: Part[] = [], running = false, W = 0, H = 0;
  const size = () => { W = innerWidth; H = innerHeight; cv.width = W; cv.height = H; };
  addEventListener('resize', size); size();
  function loop() {
    c.clearRect(0, 0, W, H); c.textAlign = 'center'; c.textBaseline = 'middle';
    parts = parts.filter(p => p.life > 0);
    for (const p of parts) {
      p.life -= .016; p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= .99;
      c.globalAlpha = clamp(p.life / p.max, 0, 1); c.fillStyle = p.color;
      c.font = `${p.s}px "VT323", monospace`;
      // snap to a coarse grid so the burst steps like terminal output
      c.fillText(p.ch, Math.round(p.x / 4) * 4, Math.round(p.y / 4) * 4);
    }
    c.globalAlpha = 1;
    if (parts.length) requestAnimationFrame(loop); else { running = false; c.clearRect(0, 0, W, H); }
  }
  return {
    burst(x: number, y: number, color: string, n = 40, power = 7) {
      if (!enabled()) return;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.28, v = Math.random() * power;
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, g: -.035, s: 16 + (Math.random() * 3 | 0) * 8, ch: CHARS[Math.random() * CHARS.length | 0], color, life: .7 + Math.random(), max: 1.7 });
      }
      if (!running) { running = true; requestAnimationFrame(loop); }
    },
  };
}
export type FX = ReturnType<typeof createFX>;
