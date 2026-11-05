/* Particles drawn over everything on their own canvas: square pixel sparks and hollow squares. */
import { clamp } from '../game/score';

type Part = { x: number; y: number; vx: number; vy: number; g: number; r: number; color: string; life: number; max: number; ring: boolean };

export function createFX(cv: HTMLCanvasElement, enabled: () => boolean) {
  const c = cv.getContext('2d')!; let parts: Part[] = [], running = false, W = 0, H = 0;
  const size = () => { W = innerWidth; H = innerHeight; cv.width = W; cv.height = H; };
  addEventListener('resize', size); size();
  function loop() {
    c.clearRect(0, 0, W, H); c.globalCompositeOperation = 'lighter';
    parts = parts.filter(p => p.life > 0);
    for (const p of parts) {
      p.life -= .016; p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= .99;
      c.globalAlpha = clamp(p.life / p.max, 0, 1); c.fillStyle = p.color;
      if (p.ring) { c.strokeStyle = p.color; c.lineWidth = 1; c.strokeRect((p.x | 0) - p.r + .5, (p.y | 0) - p.r + .5, p.r * 2, p.r * 2); } else c.fillRect((p.x | 0) - p.r / 2, (p.y | 0) - p.r / 2, p.r, p.r);
    }
    c.globalAlpha = 1;
    if (parts.length) requestAnimationFrame(loop); else { running = false; c.clearRect(0, 0, W, H); }
  }
  return {
    burst(x: number, y: number, color: string, n = 40, power = 7) {
      if (!enabled()) return;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.28, v = Math.random() * power;
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, g: -.035, r: 1.5 + Math.random() * 4, color, life: .7 + Math.random(), max: 1.7, ring: Math.random() > .55 });
      }
      if (!running) { running = true; requestAnimationFrame(loop); }
    },
  };
}
export type FX = ReturnType<typeof createFX>;
