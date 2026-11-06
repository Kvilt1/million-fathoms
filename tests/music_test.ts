/* Checks the soundtrack's data and director (npm run test:music). No Web Audio needed:
   - every pattern bar has 16 steps;
   - every pitch a layer or pitch() can produce is in A natural minor;
   - PROG is Am Am F Em and chordAt() cycles;
   - the director gives fixed results for scripted event sequences;
   - the unlock table is monotonic. */
import {
  PATTERNS, PROG, ROOTS, STAB, LAYERS, LEVELS, UNLOCKS, HEAT, BAR, STEP, ECHO,
  chordAt, chordToneMidi, degToMidi, aAt, unlocked, zoneLpf,
} from '../src/engine/music/score';
import { initial, reduce, barTick, targets, momentEnd, type DirState, type MusicEvent } from '../src/engine/music/director';

const fails: string[] = [];
const expect = (ok: boolean, what: string) => { console.log(ok ? '  ok  ' : '  FAIL', what); if (!ok) fails.push(what); };
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const pc = (m: number) => NAMES[((m % 12) + 12) % 12];
const IN_KEY = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G']);

/* ---------- Patterns ---------- */
const badLen = Object.entries(PATTERNS).flatMap(([k, bars]) => bars.flatMap((b, i) => b.length === 16 ? [] : [`${k}[${i}] has ${b.length}`]));
expect(!badLen.length, `every pattern bar has 16 steps (${Object.keys(PATTERNS).length} patterns) ${badLen.join(' ')}`);
expect(PATTERNS.lead.length === 4 && PATTERNS.leadB.length === 4, 'the lead and its variant are 4-bar phrases');
expect(Math.abs(STEP - .13393) < 1e-4 && Math.abs(BAR - 2.1429) < 1e-3 && Math.abs(ECHO - .402) < 1e-3, `tempo: 16th ${STEP.toFixed(5)} s, bar ${BAR.toFixed(4)} s, echo ${ECHO.toFixed(4)} s`);

/* ---------- Pitches ---------- */
const out: string[] = [];
const check = (m: number, what: string) => { if (!IN_KEY.has(pc(m))) out.push(`${what}=${pc(m)}`); };
for (let bar = 0; bar < 8; bar++) {
  const root = chordAt(bar).rootDeg;
  for (const k of ['arp', 'bass', 'bassRoll', 'pad'] as const) {
    const base = k === 'pad' ? ROOTS.pad : k === 'arp' ? ROOTS.arp : ROOTS.bass;
    PATTERNS[k][0].forEach((s, i) => s?.forEach(d => { check(degToMidi(base, d + root), `${k} bar ${bar} step ${i}`); check(degToMidi(base, d + root) + 12, `${k} ghost`); }));
  }
  for (let i = 0; i < 24; i++) for (let o = 0; o <= 6; o++) check(chordToneMidi(bar, i, o), `pitch(${i},${o}) bar ${bar}`);
  chordAt(bar).tones(aAt(3)).forEach(m => check(m, `chord tones bar ${bar}`));
}
for (const k of ['lead', 'leadB'] as const) PATTERNS[k].forEach((b, bi) => b.forEach(s => s?.forEach(d => { check(degToMidi(ROOTS.lead, d), `${k} bar ${bi}`); check(degToMidi(ROOTS.lead, d) + 12, `${k} octave up`); })));
STAB.forEach(d => check(degToMidi(ROOTS.lead, d), 'stab'));
[ROOTS.drone, ROOTS.clank, ...ROOTS.hadal].forEach(m => check(m, 'drone/clank/hadal'));
[7, 6, 4].forEach(d => check(degToMidi(aAt(4), d), 'fanfare hook'));
expect(!out.length, `every pitch is in A natural minor ${out.slice(0, 6).join(' ')}`);
expect(STAB.map(d => pc(degToMidi(ROOTS.lead, d))).join() === 'A,C,E,A', 'the Epic stab is A4 C5 E5 A5');
const names = (bar: number, i: number, o: number) => pc(chordToneMidi(bar, i, o));
expect([0, 2, 3].map(b => names(b, 2, 5)).join() === 'E,C,B', 'tick: the chord 5th near octave 6 (E6 / C6 / B5)');
expect([0, 2, 3].map(b => names(b, 0, 2)).join() === 'A,F,E', 'clunk: the thud is the chord root (A2 / F2 / E2)');
expect([0, 1, 2, 3, 4, 5, 6].map(i => names(2, i, 3)).join(' ') === 'F A C F A C F', 'pitch(i, 3) climbs the chord (7 reel locks over F)');
expect(chordToneMidi(0, 99, 3) === chordToneMidi(0, 10, 3) && chordToneMidi(0, 10, 3) === 96, 'pitch() tops out at C7, like the old ladder');

/* ---------- Progression ---------- */
expect(JSON.stringify(PROG) === '[0,0,-2,-3]', 'PROG is [0, 0, -2, -3]');
const roots = Array.from({ length: 9 }, (_, b) => chordAt(b).rootDeg).join();
expect(roots === '0,0,-2,-3,0,0,-2,-3,0', `chordAt cycles every 4 bars (${roots})`);
expect([0, 2, 3].map(b => chordAt(b).tones(aAt(2)).map(pc).join('')).join(' ') === 'ACE FAC EGB', 'chords are Am, F and Em');

/* ---------- Director ---------- */
type Ev = MusicEvent | 'bar';
/** Runs a script; 'bar' advances one bar. Returns the final state and every bar's state and targets. */
function run(script: Ev[], s0: DirState = initial(0)) {
  let s = s0, bar = 0;
  const log: { bar: number; s: DirState; level: number; t: ReturnType<typeof targets> }[] = [];
  for (const e of script) {
    if (e === 'bar') { bar++; s = barTick(s, bar); log.push({ bar, s, level: s.level, t: targets(s, bar) }); }
    else s = reduce(s, e, bar + 1);
  }
  return { s, log, bar };
}
const bars = (n: number): Ev[] => Array(n).fill('bar');
const result = (tier: number, o: Partial<Extract<MusicEvent, { type: 'result' }>> = {}): MusicEvent =>
  ({ type: 'result', tier, u: tier, best: false, fresh: 0, sets: 0, firstTier: false, speed: 'show', preview: false, ...o });
/** A Show roll: press, a bar of spin, reels stop, four bars of reveal, the result, a bar before the next press. */
const showRoll = (tier: number): Ev[] => [{ type: 'press', speed: 'show' }, 'bar', { type: 'reelsStopped' }, ...bars(4), result(tier), 'bar'];

const ten = run([...Array.from({ length: 10 }, () => showRoll(1)).flat(), ...bars(4)]);
expect(ten.s.level === 1, `10 Common Show rolls end at L1 (heat ${ten.s.heat})`);
const changes = (log: ReturnType<typeof run>['log']) => log.filter((x, i) => i > 0 && x.level !== log[i - 1].level).map(x => x.bar);
expect(changes(ten.log).every(b => b % 4 === 0), `levels change only on phrase boundaries (${changes(ten.log)})`);

const epic = run([...bars(1), result(4), ...bars(12)]);
const m = reduce(initial(0), result(4), 2).moment;
expect(m?.kind === 'drop' && m.bars === 8 && m.start === 2 && m.level === 3, 'an Epic result sets an 8-bar DROP moment from the next downbeat');
const lv = epic.log.map(x => x.t.level).join('');
expect(lv === '0' + '33333333' + '0000', `the DROP holds L3 for 8 bars, then back to the heat level (${lv})`);
expect(reduce(initial(0), result(4), 2).shots.map(x => x.kind).join() === 'riserStop,crash,stab', 'Epic: a crash and the stab on the downbeat');

const trash = reduce({ ...initial(0), heat: .5, level: 2 }, result(0), 5);
const tt = targets(trash, 4);
expect(trash.moment?.kind === 'powerdown' && tt.moment === 'powerdown' && tt.muffle === 180, 'a Trash result powers down at once: muffle to 180 Hz');
expect(tt.gains.drone === 1 && tt.gains.pad === 1 && tt.gains.arp === 0 && tt.gains.kick === 0 && tt.gains.bass === 0, 'power-down leaves only the drone and pad');
expect(momentEnd(trash.moment!) === 7 && targets(trash, 6).moment === 'powerdown' && targets(trash, 7).moment === null && targets(trash, 7).level === 2, 'power-down holds 2 bars, then the music comes back at the heat level');

// Level changes only on bar % 4 === 0, across a long random session.
let rs = initial(0), bad: number[] = [], seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
for (let bar = 1; bar < 600; bar++) {
  const before = rs.level;
  rs = barTick(rs, bar);
  if (rs.level !== before && bar % 4 !== 0) bad.push(bar);
  if (rnd() < .4) rs = reduce(rs, result(Math.floor(rnd() * 7), { speed: rnd() < .5 ? 'fast' : 'show', best: rnd() < .05, sets: rnd() < .05 ? 1 : 0 }), bar + 1);
  if (rnd() < .2) rs = reduce(rs, { type: 'press', speed: 'show' }, bar + 1);
  if (rs.heat < 0 || rs.heat > 1) bad.push(-bar);
}
expect(!bad.length, `random session: level changes only on phrase boundaries, heat stays in [0, 1] ${bad.slice(0, 5)}`);
const hot = run(Array.from({ length: 20 }, () => [result(6), 'bar'] as Ev[]).flat());
const cold = run(Array.from({ length: 30 }, () => [result(0), 'bar'] as Ev[]).flat(), { ...initial(0), heat: .3 });
expect(hot.s.heat === 1 && cold.s.heat === 0, `heat clamps at 1 and 0 (${hot.s.heat}, ${cold.s.heat})`);

const decay = run(bars(80), { ...initial(0), heat: 1, level: 3 });
const firstL0 = decay.log.find(x => x.level === 0)?.bar;
expect(decay.s.level === 0 && decay.s.heat === 0 && firstL0 !== undefined && firstL0 % 4 === 0, `idle decay brings L3 back down to L0 (by bar ${firstL0})`);
const d14 = run(bars(14), { ...initial(0), heat: 1, level: 3 }).s.heat, d16 = run(bars(16), { ...initial(0), heat: 1, level: 3 }).s.heat;
expect(d14 === .76 && Math.abs(d16 - .66) < 1e-9, `cooling: 2 bars grace, then 0.02 a bar, then 0.05 a bar after 30 s (${d14}, ${d16})`);

const gain = (o: Partial<Extract<MusicEvent, { type: 'result' }>>) => reduce(initial(0), result(4, o), 1).heat;
expect(gain({}) === .16 && gain({ speed: 'fast' }) === .08, `Fast halves the heat a roll adds (${gain({})} vs ${gain({ speed: 'fast' })})`);
expect(gain({ best: true }) === .31 && gain({ sets: 2 }) === .36, 'a new best adds 0.15 and each finished set 0.10');
expect(reduce(initial(0), result(4, { speed: 'fast' }), 1).moment?.bars === 4, "Fast halves moments (Epic's DROP lasts 4 bars)");
const pre0 = { ...initial(3), heat: .4, level: 2 };
const pre = run([result(5, { preview: true, best: true }), ...bars(1)], pre0).s;
expect(pre.heat === .4 && pre.level === 2 && pre.bestTier === 3, 'a Watch (preview) roll changes no heat, level or unlocks');

// Phases at Show speed
const sp = reduce({ ...initial(0), level: 1 }, { type: 'press', speed: 'show' }, 1);
expect(sp.phase === 'spin' && sp.shots.some(x => x.kind === 'riser') && targets(sp, 0).arpLpf === 380, 'press: spin phase, a riser, the arp closes to 380 Hz');
const te = targets(reduce(sp, { type: 'tense' }, 1), 0);
expect(te.gains.pad === .35 && te.gains.arp === .35 && te.gains.clank === .35 && te.gains.kick === 0 && te.gains.hats === 0 && te.gains.drone === 1, 'tense: pad, arp and clank at 35%, kick and hats out, drone stays');
let rv = reduce(reduce(sp, { type: 'reelsStopped' }, 1), { type: 'badge', i: 0, tier: 0, zoneU: 0 }, 1);
const lpfLow = targets(rv, 0).arpLpf;
rv = reduce(rv, { type: 'badge', i: 1, tier: 2, zoneU: 7 }, 1);
expect(lpfLow === 500 && targets(rv, 0).arpLpf === 3000 && Math.round(zoneLpf(3.5)) === 1225, 'badges open the arp from 500 Hz (u=0) to 3 kHz (u=7) on a log curve');
const tu = reduce(reduce(rv, { type: 'tierUp', tier: 3 }, 1), { type: 'tierUp', tier: 4 }, 1);
expect(targets(tu, 0).gains.kick === 1 && targets(tu, 0).gains.bass === 1, 'tierUp adds the kick, then bass and hats, during the reveal');
expect(reduce(rv, { type: 'tierUp', tier: 4 }, 1).shots.some(x => x.kind === 'riserHold'), 'tierUp to Epic starts a riser through the rest of the reveal');
const fp = reduce(reduce({ ...initial(0), level: 1 }, { type: 'press', speed: 'fast' }, 1), { type: 'tense' }, 1);
expect(fp.shots.length === 0 && targets(fp, 0).gains.kick === 1 && targets(fp, 0).arpLpf === targets(initial(0), 0).arpLpf + 200, 'Fast: no riser, tense or ducking; the groove keeps going');
expect(reduce(rv, { type: 'skip' }, 1).shots.map(x => x.kind).join() === 'cancel,riserStop', 'skip cancels pending pings and the riser');

// Other moments
const mm = (tier: number, s = initial(0)) => reduce(s, result(tier), 4);
expect(mm(3).moment?.kind === 'hook' && targets(mm(3), 4).level === 2 && targets(mm(3), 7).level === 2 && targets(mm(3), 8).level === 0, 'Rare: at least L2 (HOOK) for 4 bars');
expect(mm(1).moment === null && mm(1).shots.some(x => x.kind === 'flam'), 'Common: no moment, a clank flam');
expect(mm(2).moment === null && targets(mm(2), 4).hatFill && !targets(mm(2), 5).hatFill, 'Uncommon: a 1-bar hat fill on the next bar');
const an = mm(5), at4 = targets(an, 4), at5 = targets(an, 5);
expect(an.moment?.kind === 'break' && at4.gains.kick === 0 && at4.gains.bass === 0 && at4.riser && at5.level === 3 && at5.arpGhost, 'Anomaly: a bar of break (riser), then L3 with the arp ghost forced');
const my = mm(6), my5 = targets(my, 5);
expect(my.moment?.kind === 'hadal' && my.shots.some(x => x.kind === 'silence') && my5.level === 3 && my5.leadOct === 1 && my5.gains.hadal === 1 && my5.kickDist === .55, 'Mythic: a beat of silence, then L3 with the lead an octave up, the Hadal pad and hotter kick');
expect(targets(my, 19).level === 3 && targets(my, 20).level === 0, 'Mythic holds L3 for 16 bars');
const held = reduce(my, { type: 'finish', open: true }, 5);
expect(targets(held, 200).level === 3, 'while the Mythic card is open, L3 holds indefinitely');
const closed = reduce(held, { type: 'finish', open: false }, 30);
expect(targets(closed, 31).level === 0 || targets(closed, 31).moment === null, 'closing the card goes back to the heat level');
expect(reduce(mm(4), result(3), 5).moment?.kind === 'drop' && reduce(mm(4), result(6), 5).moment?.kind === 'hadal', 'a moment is replaced only by the same tier or higher');
expect(mm(1, { ...initial(0), muffled: true }).muffled && targets(reduce(initial(0), { type: 'drawer', open: true }, 1), 0).muffle === 700, 'drawer: muffle to 700 Hz behind glass');
const deep = targets(reduce(initial(0), { type: 'depth', u: 7 }, 1), 0);
expect(deep.droneGain === .3 && deep.padReverb === 1 && deep.clankExtra === 2 && deep.droneLfo.join() === '60,140' && deep.level === 0, 'depth sets pressure (drone, reverb, clank density), not energy');
expect(reduce({ ...initial(6), heat: .9, level: 3 }, { type: 'reset' }, 1).heat === 0 && reduce(initial(6), { type: 'reset' }, 1).bestTier === 0, 'reset clears heat and unlocks');

/* ---------- Unlocks ---------- */
const tiers = UNLOCKS.map(u => u.tier);
expect(tiers.every((t, i) => i === 0 || t >= tiers[i - 1]), `unlock tiers rise monotonically (${tiers})`);
expect([0, 1, 2, 3, 4, 5, 6].every(t => [...unlocked(t)].every(k => unlocked(t + 1).has(k))) && unlocked(6).size === 4 && unlocked(2).size === 0, 'a deeper best never loses an unlock');
const u6 = (bar: number) => targets({ ...initial(6), level: 3 }, bar);
expect(u6(4).leadB && !u6(0).leadB && u6(3).bassRoll && !u6(2).bassRoll && u6(0).arpGhost && u6(0).gains.hadal === 1, 'unlocked material plays at L3 (lead B every other phrase, the roll on bar 4)');
expect(!targets({ ...initial(6), level: 1 }, 4).leadB && targets({ ...initial(6), level: 2 }, 0).gains.hadal === 1 && targets({ ...initial(5), level: 2 }, 0).gains.hadal === 0, 'the Hadal pad needs best tier 6 and L2 or more');
expect(LEVELS.every((l, i) => i === 0 || LEVELS[i - 1].layers.every(x => l.layers.includes(x))) && LAYERS.length === 10, 'each level adds to the one below it');
void HEAT;

if (fails.length) { console.log(`FAIL: ${fails.length} problems`); process.exit(1); }
console.log('ok');
