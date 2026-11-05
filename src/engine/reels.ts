/* The seven-reel counter. Builds its own DOM inside the box React gives it, for 60 fps spinning. */
import { clamp, lerp } from '../game/score';
import type { Sound } from './sound';

type Reel = { el: HTMLDivElement; strip: HTMLDivElement; pos: number };

export function createReels(box: HTMLElement, sound: Sound) {
  const reels: Reel[] = [];
  box.replaceChildren();
  for (let i = 0; i < 7; i++) {
    const el = document.createElement('div'); el.className = 'reel off';
    const strip = document.createElement('div'); strip.className = 'strip';
    strip.innerHTML = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => `<span>${d}</span>`).join('');
    el.append(strip); box.append(el);
    reels.push({ el, strip, pos: 0 });
    if (i === 0 || i === 3) { const c = document.createElement('div'); c.className = 'comma'; c.textContent = ','; box.append(c); }
  }
  let cell = 80, raf = 0;
  const place = (r: Reel) => { r.strip.style.transform = `translate3d(0,${-((r.pos % 10 + 10) % 10) * cell}px,0)`; };
  const measure = () => { cell = reels[0].el.offsetHeight || 80; reels.forEach(place); };
  addEventListener('resize', measure);
  const digitsOf = (n: number) => String(n).padStart(7, '0').split('').map(Number);
  const lead = (n: number) => 7 - String(n).length;
  const light = (n: number) => reels.forEach((r, i) => r.el.classList.toggle('off', i < lead(n)));
  function setNow(n: number) { cancelAnimationFrame(raf); const d = digitsOf(n); reels.forEach((r, i) => { r.pos = d[i]; place(r); }); light(n); }
  function spin(n: number, { spinMs, stagger, tense = 0, skip }: { spinMs: number; stagger: number; tense?: number; skip?: () => boolean }) {
    return new Promise<void>(resolve => {
      cancelAnimationFrame(raf);
      type Plan = { r: Reel; target: number; stopAt: number; v: number; from: number; to: number; tween: { t0: number; d: number } | null; done: boolean };
      const d = digitsOf(n), t0 = performance.now(), plan: Plan[] = reels.map((r, i) => ({
        r, target: d[i], stopAt: spinMs + i * stagger + (i === 6 ? tense : 0), v: 26 + i * 3, from: 0, to: 0, tween: null, done: false,
      }));
      reels.forEach(r => r.el.classList.remove('off', 'tense', 'land'));
      let prev = t0, lastBeat = 0, cancelled = false;
      const step = (now: number) => {
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
              const idx = plan.indexOf(p); sound.clunk(idx);
              if (idx < lead(n)) p.r.el.classList.add('off');
              if (idx === 5 && tense) plan[6].r.el.classList.add('tense');
            }
          } else {
            const before = Math.floor(p.r.pos); p.r.pos += p.v * dt; place(p.r);
            if (Math.floor(p.r.pos) !== before) sound.tick();
          }
        }
        if (tense && !forced && t > plan[5].stopAt + 300 && t - lastBeat > 640 && !plan[6].done) { lastBeat = t; sound.heart(); }
        if (live) raf = requestAnimationFrame(step); else { light(n); resolve(); }
      };
      raf = requestAnimationFrame(step);
    });
  }
  const tint = (color: string) => document.documentElement.style.setProperty('--digit', color);
  const allOff = () => reels.forEach(r => r.el.classList.add('off'));
  return { measure, setNow, spin, tint, allOff };
}
export type Reels = ReturnType<typeof createReels>;
