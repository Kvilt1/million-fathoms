/* The reel counter: seven reels in Classic, one to seven in Descent. Builds its own DOM inside the box
   React gives it, for 60 fps spinning. Commas group the reels in threes from the right.
   With reduced motion the reels don't scroll: each one dims while "spinning" and snaps to its digit
   at the same moment it would have landed, so the rhythm and sounds stay. */
import { clamp, lerp } from '../game/score';
import type { Sound } from './sound';
import type { Highlight } from '../game/highlights';

type Reel = { el: HTMLDivElement; strip: HTMLDivElement; pos: number };

export function createReels(box: HTMLElement, sound: Sound, reduced = false) {
  let reels: Reel[] = [], K = 7;
  /** Rebuild with k reels. The `enter` new reels on the left slide in; the rest keep their digits. */
  function build(k: number, enter = 0) {
    const keep = reels.map(r => r.pos);
    box.replaceChildren(); reels = [];
    for (let i = 0; i < k; i++) {
      const el = document.createElement('div'); el.className = 'reel off' + (i < enter ? ' enter' : '');
      const strip = document.createElement('div'); strip.className = 'strip';
      strip.innerHTML = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => `<span>${d}</span>`).join('');
      el.append(strip); box.append(el);
      const old = keep[keep.length - (k - i)];
      reels.push({ el, strip, pos: old ?? 0 });
      if (i < k - 1 && (k - 1 - i) % 3 === 0) { const c = document.createElement('div'); c.className = 'comma'; c.textContent = ','; box.append(c); }
    }
    K = k;
  }
  build(7);
  let cell = 80, raf = 0;
  const place = (r: Reel) => { r.strip.style.transform = `translate3d(0,${-((r.pos % 10 + 10) % 10) * cell}px,0)`; };
  const measure = () => { cell = reels[0].el.offsetHeight || 80; reels.forEach(place); };
  addEventListener('resize', measure);
  const digitsOf = (n: number) => String(n).padStart(K, '0').slice(-K).split('').map(Number);
  const lead = (n: number) => Math.max(0, K - String(n).length);
  const light = (n: number) => reels.forEach((r, i) => r.el.classList.toggle('off', i < lead(n)));
  function setNow(n: number) { cancelAnimationFrame(raf); const d = digitsOf(n); reels.forEach((r, i) => { r.pos = d[i]; place(r); r.el.classList.remove('blank', 'tense'); }); light(n); }
  function spin(n: number, { spinMs, stagger, tense = 0, skip }: { spinMs: number; stagger: number; tense?: number; skip?: () => boolean }) {
    return new Promise<void>(resolve => {
      cancelAnimationFrame(raf);
      type Plan = { r: Reel; target: number; stopAt: number; v: number; from: number; to: number; tween: { t0: number; d: number } | null; done: boolean };
      const d = digitsOf(n), t0 = performance.now(), plan: Plan[] = reels.map((r, i) => ({
        r, target: d[i], stopAt: spinMs + i * stagger + (i === K - 1 ? tense : 0), v: 26 + i * 3, from: 0, to: 0, tween: null, done: false,
      }));
      reels.forEach(r => { r.el.classList.remove('off', 'tense', 'land'); r.el.classList.toggle('blank', reduced); });
      if (tense && K === 1) reels[0].el.classList.add('tense');
      const last = plan[K - 1], before = plan[K - 2];
      let prev = t0, lastBeat = 0, cancelled = false;
      const step = (now: number) => {
        const dt = Math.min(50, now - prev) / 1000; prev = now;
        const t = now - t0, forced = skip && skip();
        if (forced && !cancelled) { cancelled = true; plan.forEach((p, i) => { if (!p.tween && !p.done) { p.stopAt = t + i * 12; } }); }
        let live = 0;
        for (const p of plan) {
          if (p.done) continue;
          live++;
          if (reduced) {
            if (t < p.stopAt) continue;
            p.done = true; p.r.pos = p.target; place(p.r); p.r.el.classList.remove('blank', 'tense');
            const idx = plan.indexOf(p); sound.clunk(idx);
            if (idx < lead(n)) p.r.el.classList.add('off');
            if (idx === K - 2 && tense) last.r.el.classList.add('tense');
            continue;
          }
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
              if (idx === K - 2 && tense) last.r.el.classList.add('tense');
            }
          } else {
            const before = Math.floor(p.r.pos); p.r.pos += p.v * dt; place(p.r);
            if (Math.floor(p.r.pos) !== before) sound.tick();
          }
        }
        if (tense && !forced && t > (before ? before.stopAt : 0) + 300 && t - lastBeat > 640 && !last.done) { lastBeat = t; sound.heart(); }
        if (live) raf = requestAnimationFrame(step); else { light(n); resolve(); }
      };
      raf = requestAnimationFrame(step);
    });
  }
  const tint = (color: string) => document.documentElement.style.setProperty('--digit', color);
  const allOff = () => reels.forEach(r => r.el.classList.add('off'));
  /** Light the digits a badge is about, or clear with null. Returns the centre of the lit area, for particles. */
  const machine = box.parentElement!;
  /** Change the number of reels (Descent). New reels appear on the left; `enter` slides them in. */
  function setCount(k: number, enter = false) {
    if (k === K) return;
    cancelAnimationFrame(raf); clear();
    build(k, enter ? Math.max(0, k - K) : 0);
    measure();
  }
  function highlight(n: number, hl: Highlight | null, color = '') {
    const L = lead(n), whole = hl?.style === 'whole', first = hl ? hl.pos[0] : 0, last = hl ? hl.pos[hl.pos.length - 1] : 0;
    machine.style.setProperty('--hc', color);
    machine.classList.toggle('hl-on', !!hl);
    machine.classList.toggle('hl-whole', whole);
    let x0 = Infinity, x1 = -Infinity, y = 0;
    reels.forEach((r, i) => {
      const p = i - L, lit = !!hl && !whole && hl.pos.includes(p);
      r.el.classList.toggle('lit', lit);
      r.el.classList.toggle('span', !!hl && hl.style === 'ends' && !lit && p > first && p < last);
      if (lit || (whole && p >= 0)) { const q = r.el.getBoundingClientRect(); x0 = Math.min(x0, q.left); x1 = Math.max(x1, q.right); y = q.top + q.height / 2; }
    });
    if (x0 === Infinity) { const q = box.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }
    return { x: (x0 + x1) / 2, y };
  }
  const clear = () => highlight(0, null);
  return { measure, setCount, count: () => K, setNow: (n: number) => { clear(); setNow(n); }, spin: (n: number, o: Parameters<typeof spin>[1]) => { clear(); return spin(n, o); }, tint, allOff, highlight };
}
export type Reels = ReturnType<typeof createReels>;
