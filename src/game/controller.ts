/* The game loop: rolls, reveal, saving, auto-roll and dives. React renders from `V` and `S` and
   re-renders whenever `emit()` runs; the 60 fps parts (reels, scene, particles, EP counter) are
   driven directly here. Moved from the original app.js with the same timings. */
import { useSyncExternalStore } from 'react';
import {
  TIERS, BADGE_TIERS, BY_NAME, ROLLS, MAX_ROLL, fmt, clamp, zoneOf, fathoms, tierOf, rollsBelow, scoreRoll, randomRoll, badgeColor,
  type Badge, type Result,
} from './score';
import { load, save as persist, fresh, type SaveState, type Speed } from './save';
import { SETS, setDone } from './sets';
import { createSound } from '../engine/sound';
import { createScene, type Scene } from '../engine/scene';
import { createFX, type FX } from '../engine/fx';
import { createReels, type Reels } from '../engine/reels';

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export let S: SaveState = load();
const save = () => persist(S);

/* ---------- View state for React ---------- */
export type Tab = 'log' | 'codex' | 'sets' | 'check' | 'how' | 'settings';
export type MetaView = { text: string } | { zone: string; fm: number; pct: number };
export interface HaulRow { b: Badge; isNew: boolean; animate: boolean; key: string }
export type FinishView =
  | { kind: 'mythic'; r: Result }
  | { kind: 'dive'; total: number; best: boolean; tier: number; avgFm: number; top: Result; squares: string; share: string };
export interface View {
  haulTitle: string; haulCount: string;
  haul: null | { rows: HaulRow[]; outranked: Badge[] };
  stamp: { text: string; mythic: boolean; hit: number };
  meta: MetaView; rollLabel: string; mode: 'free' | 'dive'; auto: boolean;
  drawer: { open: boolean; tab: Tab; checkN: number | null };
  finish: FinishView | null;
  toasts: { id: number; text: string }[];
  live: string; dive: Result[];
}
export const V: View = {
  haulTitle: 'Depth chart', haulCount: 'EP needed', haul: null, stamp: { text: '', mythic: false, hit: 0 },
  meta: { text: '0 to 1,000,000. Every roll counts.' }, rollLabel: 'Roll', mode: 'free', auto: false,
  drawer: { open: false, tab: 'log', checkN: null }, finish: null, toasts: [], live: '', dive: [],
};
let version = 0;
const subs = new Set<() => void>();
export function emit() { version++; subs.forEach(f => f()); }
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
/** Re-renders the calling component whenever game state changes. */
export function useGame() { useSyncExternalStore(subscribe, () => version); return { V, S }; }

/* ---------- Engines ---------- */
export const Sound = createSound(() => S.opts);
let Scene: Scene, FXs: FX, Reel: Reels;

/* ---------- Game state ---------- */
export const G = { busy: false, skip: false, auto: false, mode: 'free' as 'free' | 'dive', dive: [] as Result[], preview: false, wake: null as null | (() => void), lastResult: null as Result | null };
const SPEED: Record<Speed, { spin: number; stagger: number; step: number; hold: number }> = {
  show: { spin: 620, stagger: 150, step: 1, hold: 500 },
  fast: { spin: 170, stagger: 34, step: .14, hold: 170 },
  instant: { spin: 0, stagger: 0, step: 0, hold: 50 },
};
const $ = (id: string) => document.getElementById(id)!;
function setTier(color: string) { document.documentElement.style.setProperty('--tier', color); }
function shake(amp: number, ms = 420) {
  if (reduced || !S.opts.effects) return;
  const a = $('app'); a.style.setProperty('--amp', amp + 'px'); a.style.setProperty('--shake-ms', ms + 'ms');
  a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake');
}
function retrigger(el: HTMLElement, cls: string) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
function setEP(v: number) { $('ep').innerHTML = `${fmt(v)} <small>EP</small>`; }
let epAnim = 0, epShown = 0;
function tweenEP(to: number, ms: number) {
  cancelAnimationFrame(epAnim);
  if (!ms) { epShown = to; setEP(to); return; }
  const from = epShown, t0 = performance.now();
  const f = (now: number) => { const q = clamp((now - t0) / ms, 0, 1), e = 1 - (1 - q) ** 3; epShown = from + (to - from) * e; setEP(epShown); if (q < 1) epAnim = requestAnimationFrame(f); };
  epAnim = requestAnimationFrame(f);
}
const wait = (ms: number) => new Promise<void>(r => { const t = setTimeout(r, ms); G.wake = () => { clearTimeout(t); r(); }; });
const bump = (id: string) => retrigger($(id), 'bump');
let rowKey = 0;
const rows = (list: Badge[], isNew: (b: Badge) => boolean, animate: boolean): HaulRow[] => list.map(b => ({ b, isNew: isNew(b), animate, key: `${b.name}#${rowKey++}` }));
const byEpDesc = (r: Result) => r.paid.slice().sort((a, b) => b.ep - a.ep);

function idleHaul() { V.haulTitle = 'Depth chart'; V.haulCount = 'EP needed'; V.haul = null; }
function showMeta(r: Result) { V.meta = { zone: TIERS[r.tier].zone, fm: r.fm, pct: r.pct }; }
function showFinal(r: Result) {
  const t = TIERS[r.tier];
  setTier(t.color); Reel.tint(t.color); Scene.tierNow = r.tier;
  V.stamp = { text: t.name, mythic: r.tier === 6, hit: V.stamp.hit + 1 };
  showMeta(r);
  V.haulCount = `${r.earned.length} earned, ${r.paid.length} paid`;
  V.live = `${fmt(r.n)}: ${fmt(r.total)} EP, ${t.name}. ${r.paid.length} badges paid.`;
}

/* Commit a roll to the save, returning what was new. */
function record(r: Result) {
  S.rolls++; S.life += r.total; S.tiers[r.tier]++;
  const firstTier = S.tiers[r.tier] === 1, fresh = new Set<string>(), before = new Set(SETS.filter(s => setDone(S, s) === s.members.length).map(s => s.name));
  for (const b of r.earned) { if (!S.badges[b.name]) fresh.add(b.name); S.badges[b.name] = (S.badges[b.name] || 0) + 1; }
  const best = !S.best || r.total > S.best.total;
  if (best) S.best = { n: r.n, total: r.total, tier: r.tier };
  S.log.unshift({ n: r.n, t: r.total, k: r.tier, f: fresh.size });
  if (S.log.length > 300) S.log.length = 300;
  const doneSets = SETS.filter(s => setDone(S, s) === s.members.length && !before.has(s.name));
  save();
  return { fresh, best, firstTier, doneSets };
}
type Info = ReturnType<typeof record>;
function refreshStats() { if (S.best) Scene.setBest(zoneOf(S.best.total)); }
let toastId = 0;
export function toast(text: string) {
  const id = ++toastId;
  V.toasts = [...V.toasts.slice(-2), { id, text }];
  setTimeout(() => { V.toasts = V.toasts.filter(t => t.id !== id); emit(); }, 3000);
}
function celebrate(r: Result, speed: Speed) {
  if (speed === 'instant' && r.tier < 4) return;
  const reel = $('reels').getBoundingClientRect(), x = reel.left + reel.width / 2, y = reel.top + reel.height / 2, color = TIERS[r.tier].color;
  if (r.tier >= 3) { FXs.burst(x, y, color, 30 + r.tier * 26, 4 + r.tier * 1.5); shake(1.5 + (r.tier - 2) * 2.2, 300 + r.tier * 60); }
  if (r.tier >= 5) { const w = $('whiteout'); w.style.setProperty('--c', color); retrigger(w, 'go'); }
  Sound.stinger(r.tier);
  if (r.tier >= 2) Sound.sonar(r.u);
  Scene.ping();
}
function notify(r: Result, info: Info) {
  if (G.preview) return;
  const rares = [...info.fresh].map(n => BY_NAME.get(n)!).filter(b => b.tier >= 2).sort((a, b) => b.ep - a.ep);
  if (rares.length) { toast(`New ${BADGE_TIERS[rares[0].tier]} badge: ${rares[0].name}`); Sound.fresh(); }
  else if (info.fresh.size >= 1) { toast(info.fresh.size === 1 ? `New badge: ${[...info.fresh][0]}` : `${info.fresh.size} new badges`); Sound.fresh(); }
  if (info.best && S.rolls > 1) { toast(`New best: ${fmt(r.total)} EP`); bump('sBest'); }
  if (info.firstTier && r.tier >= 3) toast(`First ${TIERS[r.tier].name} roll`);
  info.doneSets.forEach(s => { toast(`Set complete: ${s.name}`); Sound.fanfareSet(); });
}
let finishDone: null | (() => void) = null;
function mythicCard(r: Result) {
  return new Promise<void>(res => { finishDone = res; V.finish = { kind: 'mythic', r }; emit(); });
}
export function closeFinish() { V.finish = null; emit(); const f = finishDone; finishDone = null; f?.(); }

/* ---------- The roll ---------- */
export async function play(n: number, { preview = false } = {}) {
  if (G.busy) return;
  G.busy = true; G.skip = false; G.preview = preview; Sound.init();
  const speed: Speed = document.hidden ? 'instant' : S.opts.speed, cfg = SPEED[speed], r = scoreRoll(n);
  V.rollLabel = speed === 'instant' ? 'Roll' : 'Skip';
  setTier('#eafcff'); Reel.tint('#5ef2e4'); Scene.tierNow = 0;
  V.haulTitle = preview ? 'Replay' : `Roll ${fmt(S.rolls + 1)}`; V.haulCount = '';
  V.stamp = { text: '', mythic: false, hit: 0 };

  if (speed === 'instant') {
    Reel.setNow(n); V.haul = { rows: [], outranked: [] };
    Scene.sink(r.u, 30);
    tweenEP(r.total, 0);
    emit();
  } else {
    V.haul = { rows: [], outranked: [] }; tweenEP(0, 0); V.meta = { text: 'Sounding...' }; emit();
    Scene.sink(0, speed === 'show' ? 7 : 16);
    if (speed === 'show') Sound.press();
    const tense = speed === 'show' ? [0, 0, 0, 0, 500, 1300, 2200][r.tier] : 0;
    await Reel.spin(n, { spinMs: cfg.spin, stagger: cfg.stagger, tense, skip: () => G.skip });
    Scene.sink(.05, 6); if (speed === 'show' && !G.skip) Sound.plunge();

    const order = r.paid.slice().sort((a, b) => a.ep - b.ep);
    let running = 0, tierNow = 0, i = 0;
    const base = clamp(1500 / order.length, 45, 165);
    for (const b of order) {
      running += b.ep;
      if (!G.skip) {
        V.haul = { rows: [...rows([b], () => !preview && !S.badges[b.name], true), ...V.haul!.rows], outranked: [] }; emit();
        if (speed === 'show') Sound.ping(i, b.tier); else if (i % 2 === 0) Sound.blip(b.tier);
        Scene.sink(zoneOf(running), speed === 'show' ? 4 + b.tier : 12);
        tweenEP(running, speed === 'show' ? Math.min(150, base) : 40);
        const t = tierOf(running);
        if (t > tierNow) {
          tierNow = t; setTier(TIERS[t].color); Reel.tint(TIERS[t].color); Scene.tierNow = t;
          if (t >= 2 && speed === 'show') { Scene.ping(); Sound.sonar(zoneOf(running)); flashZone(t); }
        }
        i++;
        const hold = b.tier >= 2 && speed === 'show' ? 200 + b.tier * 150 : 0;
        if (speed === 'show' && b.tier >= 2) { const q = $('reels').getBoundingClientRect(); FXs.burst(q.right, q.top + q.height / 2, badgeColor(b.ep), 8 + b.tier * 6, 2 + b.tier); shake(b.tier * 1.1, 200); }
        await wait(base * (speed === 'show' ? 1 : cfg.step * 3) + hold);
      }
    }
    if (G.skip) tweenEP(r.total, 0);
  }

  const info: Info = preview ? { fresh: new Set(), doneSets: [], best: false, firstTier: false } : record(r);
  V.haul = { rows: rows(byEpDesc(r), b => info.fresh.has(b.name), false), outranked: r.outranked };
  Scene.sink(r.u, speed === 'instant' ? 30 : 5);
  tweenEP(r.total, speed === 'instant' || G.skip ? 0 : 120);
  showFinal(r); celebrate(r, speed);
  G.lastResult = r;
  refreshStats(); if (!preview) { if (info.fresh.size) bump('sBadges'); notify(r, info); }
  if (G.mode === 'dive' && !preview) diveStep(r);
  V.rollLabel = G.mode === 'dive' && G.dive.length >= 10 ? 'Dive again' : 'Roll';
  G.busy = false;
  emit();

  if (r.tier === 6 && speed !== 'instant' && !G.auto && !preview) await mythicCard(r);
  if (G.mode === 'dive' && G.dive.length >= 10 && !preview) { setAuto(false); return diveFinish(); }
  if (G.auto) {
    if (shouldStop(r, info)) { setAuto(false); toast('Auto stopped'); emit(); return; }
    await new Promise(res => setTimeout(res, document.hidden ? 40 : cfg.hold));
    if (G.auto) rollNext();
  }
}
function shouldStop(r: Result, info: Info) {
  const v = S.opts.autoStop;
  if (v === 'new') return info.fresh.size > 0;
  return r.tier >= +v;
}
function flashZone(t: number) {
  const z = $('zoneFlash'); z.textContent = TIERS[t].zone; z.style.setProperty('--c', TIERS[t].color); retrigger(z, 'go');
}
export function rollNext() {
  if (G.busy) { G.skip = true; if (G.wake) G.wake(); return; }
  if (V.finish || V.drawer.open) return;
  if (G.mode === 'dive' && G.dive.length >= 10) { resetDive(); }
  play(randomRoll());
}
export function setAuto(on: boolean) {
  G.auto = on; V.auto = on; emit();
  if (on && !G.busy) rollNext();
}

/* ---------- 10-roll dive ---------- */
function resetDive() { G.dive = []; V.dive = []; }
function diveStep(r: Result) { G.dive.push(r); V.dive = [...G.dive]; }
const SQUARES = ['⬛', '⬜', '🟩', '🟦', '🟪', '🟧', '🟥'];
function diveFinish() {
  const total = G.dive.reduce((a, r) => a + r.total, 0), best = total > S.bestDive, top = G.dive.reduce((a, r) => r.total > a.total ? r : a);
  if (best) { S.bestDive = total; save(); }
  const u = zoneOf(total / 10), t = tierOf(total / 10), squares = G.dive.map(r => SQUARES[r.tier]).join('');
  const share = `Million Fathoms 10-roll dive\n${squares}\n${fmt(total)} EP, best roll ${fmt(top.n)}`;
  V.finish = { kind: 'dive', total, best, tier: t, avgFm: fathoms(u), top, squares, share };
  emit(); Sound.stinger(Math.max(2, t));
}
export function diveAgain() { V.finish = null; resetDive(); emit(); rollNext(); }
export function setMode(m: 'free' | 'dive') {
  G.mode = m; V.mode = m; setAuto(false);
  resetDive(); V.rollLabel = 'Roll'; emit();
}

/* ---------- Drawer and settings ---------- */
export function openDrawer(tab: Tab) { V.drawer = { ...V.drawer, open: true, tab }; Sound.ui(); emit(); }
export function closeDrawer() { V.drawer = { ...V.drawer, open: false }; Sound.ui(); emit(); }
export function setTab(tab: Tab, checkN?: number) { V.drawer = { ...V.drawer, tab, checkN: checkN ?? V.drawer.checkN }; emit(); }
export function setCheck(n: number | null) { V.drawer = { ...V.drawer, checkN: n }; emit(); }
export function watch(n: number) { closeDrawer(); setTimeout(() => play(n, { preview: true }), 120); }
export function setSpeed(v: Speed) { S.opts.speed = v; save(); emit(); }
export function setAutoStop(v: string) { S.opts.autoStop = v; save(); emit(); }
export function toggleSound() { Sound.init(); S.opts.sound = !S.opts.sound; Sound.setVolume(); save(); emit(); }
export function setOpt<K extends 'sound' | 'vol' | 'ambient' | 'effects'>(k: K, v: SaveState['opts'][K]) {
  S.opts[k] = v; Sound.init();
  if (k === 'sound' || k === 'vol') Sound.setVolume();
  if (k === 'ambient') Sound.ambient();
  save(); emit();
}
export function wipe() {
  const opts = S.opts; S = fresh(); S.opts = opts; G.dive = []; V.dive = []; save(); Scene.setBest(null); Scene.sink(0, 5);
  Reel.setNow(0); tweenEP(0, 0); V.stamp = { text: '', mythic: false, hit: 0 }; V.meta = { text: 'Progress erased. Ready to dive.' }; idleHaul(); emit();
}

/* ---------- Keyboard ---------- */
function onKeyDown(e: KeyboardEvent) {
  const target = e.target as HTMLElement;
  if (target.matches('input, select, textarea')) { if (e.key === 'Escape') { target.blur(); if (V.drawer.open) closeDrawer(); } return; }
  const open = V.drawer.open, fin = !!V.finish;
  if (e.key === 'Escape') { if (open) closeDrawer(); else if (fin) document.getElementById('fClose')?.click(); return; }
  if (open || fin) return;
  if (e.key === ' ' || e.key === 'Enter') {
    if (target.tagName === 'BUTTON' && target.id !== 'btnRoll' && e.key === 'Enter') return;
    e.preventDefault(); $('btnRoll').classList.add('down'); Sound.init(); rollNext();
  } else if (e.key === 'a' || e.key === 'A') { Sound.init(); setAuto(!G.auto); }
  else if (e.key === 'm' || e.key === 'M') { $('btnSound').click(); }
  else if (e.key === 'b' || e.key === 'B') { openDrawer('codex'); }
  else if (e.key >= '1' && e.key <= '3') { setSpeed((['show', 'fast', 'instant'] as const)[+e.key - 1]); }
}
function onKeyUp(e: KeyboardEvent) {
  const target = e.target as HTMLElement;
  if (e.key === ' ' || e.key === 'Enter') { $('btnRoll').classList.remove('down'); if (target.tagName === 'BUTTON' && e.key === ' ' && !V.drawer.open && !V.finish) e.preventDefault(); }
}

/* ---------- Boot ---------- */
let started = false;
export function start(els: { scene: HTMLCanvasElement; fx: HTMLCanvasElement; reels: HTMLElement }) {
  if (started) return; started = true;
  Scene = createScene(els.scene, { reduced, onDepth: u => Sound.depth(u) });
  FXs = createFX(els.fx, () => !reduced && S.opts.effects);
  Reel = createReels(els.reels, Sound);
  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', onKeyUp);
  const boot = () => {
    Reel.measure(); refreshStats(); Scene.start();
    const last = S.log[0];
    if (last) {
      const r = scoreRoll(last.n);
      Reel.setNow(r.n); setEP(r.total); epShown = r.total; Scene.sink(r.u, 8); showFinal(r);
      V.haulTitle = 'Last roll';
      V.haul = { rows: rows(byEpDesc(r), () => false, false), outranked: r.outranked };
    } else { Reel.setNow(0); Reel.allOff(); setEP(0); idleHaul(); }
    emit();
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot); else boot();
  Object.assign(window, { MF: { play, scoreRoll, Sound, get state() { return S; }, get game() { return G; } } });
}
export { ROLLS, MAX_ROLL, rollsBelow };
