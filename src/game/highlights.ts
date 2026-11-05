/* Which digits earned each badge, for the score reveal. Kept apart from the rules so scoring can never
   change because of a highlight: these functions only read the number and return reel positions.

   A highlight is a style plus positions into String(n) (no leading zeros):
     digits  the digits that make the pattern (551535 with Three of a Kind lights the three 5s)
     ends    first and last digit (or the first and last two)
     tail    the trailing digits that make an ending (Even, Clean, Century, Double Nine)
     whole   a property of the whole number (Prime, powers, exact numbers, digit sum, length)
   Every function returns valid positions for any roll, earned or not. */
import { context } from './rules.js';

export type HLStyle = 'digits' | 'ends' | 'tail' | 'whole';
export interface Highlight { style: HLStyle; pos: number[] }
type X = ReturnType<typeof context>;
type Fn = (s: string, x: X) => Highlight;

const range = (a: number, b: number) => { const o: number[] = []; for (let i = a; i < b; i++) o.push(i); return o; };
const uniq = (p: number[]) => [...new Set(p)].sort((a, b) => a - b);
const H = (style: HLStyle, pos: number[]): Highlight => ({ style, pos: uniq(pos) });
const where = (s: string, f: (d: number, i: number) => boolean) => range(0, s.length).filter(i => f(+s[i], i));

/* Shapes */
const whole: Fn = (s) => H('whole', range(0, s.length));
const all: Fn = (s) => H('digits', range(0, s.length));
const ends: Fn = (s) => H('ends', s.length > 1 ? [0, s.length - 1] : [0]);
const ends2: Fn = (s) => H('ends', s.length >= 4 ? [0, 1, s.length - 2, s.length - 1] : range(0, s.length));
const tail = (k: number): Fn => (s) => H('tail', range(Math.max(0, s.length - k), s.length));
/** Every occurrence of a substring. */
const stretch = (...ts: string[]): Fn => (s) => {
  const p: number[] = [];
  for (const t of ts) for (let i = s.indexOf(t); i >= 0; i = s.indexOf(t, i + 1)) p.push(...range(i, i + t.length));
  return H('digits', p);
};
/** The first match of a pattern. */
const match = (re: RegExp): Fn => (s) => { const m = re.exec(s); return H('digits', m ? range(m.index, m.index + m[0].length) : []); };
/** All copies of digit d. */
const digit = (d: number): Fn => (s) => H('digits', where(s, v => v === d));
/** Digits ranked by how often they appear, most first (ties: earliest first). */
const byCount = (s: string, x: X) => [...new Set(s.split('').map(Number))].sort((a, b) => x.cnt[b] - x.cnt[a]);
const ofCount = (f: (c: number) => boolean): Fn => (s, x) => H('digits', where(s, d => f(x.cnt[d])));
const topDigits = (k: number): Fn => (s, x) => { const top = byCount(s, x).filter(d => x.cnt[d] >= 2).slice(0, k); return H('digits', where(s, d => top.includes(d))); };

/** The first window of L digits stepping by exactly +1 or -1. */
const seq = (L: number): Fn => (s, x) => {
  for (let i = 0; i + L <= s.length; i++) {
    const w = x.diffs.slice(i, i + L - 1);
    if (w.length === L - 1 && (w.every(v => v === 1) || w.every(v => v === -1))) return H('digits', range(i, i + L));
  }
  return H('digits', []);
};
const isRun = (q: number[]) => q.every((v, i) => i === 0 || v - q[i - 1] === 1);
const sortNum = (a: number[]) => [...a].sort((p, q) => p - q);
const miniScramble: Fn = (s, x) => {
  for (let L = 3; L <= s.length; L++) for (let i = 0; i + L <= s.length; i++) if (isRun(sortNum(x.digits.slice(i, i + L)))) return H('digits', range(i, i + L));
  return H('digits', []);
};
/** Chains of one digit at every other position: exactly `L` long, or at least `L` when `atLeast`. */
const hop = (L: number, atLeast: boolean): Fn => (s) => {
  for (let i = 0; i < s.length; i++) {
    if (i >= 2 && s[i - 2] === s[i]) continue;
    const p = [i]; let j = i;
    while (j + 2 < s.length && s[j + 2] === s[i]) { j += 2; p.push(j); }
    if (atLeast ? p.length >= L : p.length === L) return H('digits', p);
  }
  return H('digits', []);
};
const neighbors: Fn = (_s, x) => { const i = x.diffs.findIndex(d => Math.abs(d) === 1); return H('digits', i < 0 ? [] : [i, i + 1]); };
const isPal = (t: string) => { for (let a = 0, b = t.length - 1; a < b; a++, b--) if (t[a] !== t[b]) return false; return true; };
const pocketMirror: Fn = (s) => {
  let best: number[] = [];
  for (let i = 0; i < s.length; i++) for (let j = i + 4; j <= s.length; j++) if (j - i > best.length && isPal(s.slice(i, j))) best = range(i, j);
  return H('digits', best);
};
const rhyme: Fn = (s) => {
  for (let L = s.length >> 1; L >= 2; L--) for (let i = 0; i + 2 * L <= s.length; i++) {
    const j = s.indexOf(s.slice(i, i + L), i + L);
    if (j >= 0) return H('digits', [...range(i, i + L), ...range(j, j + L)]);
  }
  return H('digits', []);
};
/** Adjacent stretches that are consecutive integers (k of them), not covering the whole number. */
const consecContains = (k: number): Fn => (s) => {
  const len = s.length;
  const go = (start: number, i: number, parts: number[]): number | null => {
    if (parts.length === k) return !parts.every(v => v < 10) && !(start === 0 && i === len) ? i : null;
    for (let j = i + 1; j <= len; j++) {
      if (j - i > 1 && s[i] === '0') continue;
      const v = +s.slice(i, j);
      if (parts.length) {
        const d = v - parts[parts.length - 1];
        if (Math.abs(d) !== 1) continue;
        if (parts.length > 1 && d !== parts[parts.length - 1] - parts[parts.length - 2]) continue;
      }
      const end = go(start, j, [...parts, v]);
      if (end !== null) return end;
    }
    return null;
  };
  for (let i = 0; i < len; i++) { const end = go(i, i, []); if (end !== null) return H('digits', range(i, end)); }
  return H('digits', []);
};
/** Two separated stretches that are consecutive integers. */
const consecNearby: Fn = (s) => {
  const subs: [number, number, number][] = [];
  for (let i = 0; i < s.length; i++) for (let j = i + 1; j <= s.length; j++) if (j - i === 1 || s[i] !== '0') subs.push([i, j, +s.slice(i, j)]);
  for (const a of subs) for (const b of subs)
    if (a[1] < b[0] && Math.abs(a[2] - b[2]) === 1 && (a[1] - a[0] > 1 || b[1] - b[0] > 1)) return H('digits', [...range(a[0], a[1]), ...range(b[0], b[1])]);
  return H('digits', []);
};
const firefly: Fn = (s, x) => H('digits', x.uniq === 2 ? where(s, d => x.cnt[d] === 1) : []);
const fullHouse: Fn = (s, x) => { const [a, b] = byCount(s, x); return H('digits', where(s, d => (d === a && x.cnt[d] >= 3) || (d === b && x.cnt[d] >= 2))); };
const snakeEyes: Fn = (s) => H('digits', where(s, d => d === 1));
const framed = (a: number, b: number): Fn => (s) => H('digits', range(a, Math.min(b, s.length)));
const straightFlush = stretch('02468', '13579', '86420', '97531');

/* name → highlight. The test checks every badge is listed here. */
export const HIGHLIGHTS: Record<string, Fn> = {
  'Hills': all, 'Three of a Kind': ofCount(c => c === 3), 'Lucky Seven (Divisible)': whole, 'Heterogeneous': all,
  'Mini Scramble': miniScramble, 'Gap One': ends, 'Two Pair': topDigits(9), 'Dunes': all, 'Hopscotch': hop(2, false),
  'Ghost': digit(0), 'Quartet': all,
  'Hydrogen (1)': digit(1), 'Helium (2)': digit(2), 'Lithium (3)': digit(3), 'Beryllium (4)': digit(4), 'Boron (5)': digit(5),
  'Carbon (6)': digit(6), 'Nitrogen (7)': digit(7), 'Oxygen (8)': digit(8), 'Fluorine (9)': digit(9),
  'Grounded': ends, 'Contiguous Pair': match(/(.)\1/), 'Lucky Seven': digit(7), 'Even': tail(1), 'Odd': tail(1),
  'Liftoff': ends, 'Void': all, 'Neighbors': neighbors, 'Pair': topDigits(1), 'Six Digits': whole,

  'Four of a Kind': ofCount(c => c >= 4), 'Equation': all, 'Low Ball': all, 'Mountain': all, 'Double Hop': hop(3, true),
  'High Roller': all, 'Valley': all, 'Contiguous Two Pair': match(/(.)\1(?!\1)(.)\2/), 'Mini Echo': match(/(..)\1/),
  'Alternator': all, 'Flush': all, 'Contiguous Trips': match(/(.)\1\1/), 'Deep Void': stretch('00'), 'Feather': whole,
  'Blackjack': whole, 'Full House': fullHouse, 'Pocket Mirror': pocketMirror, 'Snake Eyes': snakeEyes, 'Nice': stretch('69'),
  'Meaning of Life': stretch('42'), 'Six-Seven': stretch('67'), 'Eighty-Six': stretch('86'), 'Balanced': all, 'Rhyme': rhyme,
  'Sequence (3)': seq(3), '2 Consecutive Numbers (Contains)': consecContains(2), '2 Consecutive Numbers (Nearby)': consecNearby,
  'Mesa': all, 'Prime Number': whole, 'Trinity': all, 'Dozen': whole, 'Canyon': all, 'Five Digits': whole, 'Eleven': whole,
  'Harshad Number': whole, 'Clean': tail(1), 'Semi-Clean': tail(1), 'Equilibrium': ends, 'Sandwich': ends,

  '2nd Power': whole, 'Even Spacing (Absolute)': all, 'Firefly': firefly, '2 Consecutive Numbers': all, 'Palindrome': all,
  'Contiguous Quads': match(/(.)\1\1\1/), 'Deep Void (3)': stretch('000'), 'Turtle': all, 'Secret Agent': stretch('007'),
  'Heavy': whole, 'Contiguous Full House': match(/(.)\1\1(?!\1)(.)\2|(.)\3(?!\3)(.)\4\4/), 'Jackpot': stretch('777'),
  'Devil': stretch('666'), 'Sequence (4)': seq(4), 'Error 404': stretch('404'), 'Orientation': stretch('101'),
  'Botanist': stretch('420'), 'Emergency': stretch('911'), 'Pi Slice (3)': stretch('314'), 'E Slice (3)': stretch('271'),
  'Calendar': stretch('365'), 'Divisible by Three': all, 'Scramble': all, 'Duality': all, 'Steps': all, 'Metronome': all,
  'Framed Double': framed(1, 5), 'Slopes': all, 'Paired Bookends': ends2, 'Four Digits': whole, 'Three Pair': topDigits(9),
  'Bookends': ends2, 'Mirror Bookends': ends2, 'Century': tail(2), 'Double Nine': tail(2), 'Quarter-Century': tail(2),
  'Semi-Century': tail(2), 'Three-Quarter Century': tail(2),

  '3rd Power': whole, 'Even Spacing': all, '3 Consecutive Numbers': all, 'Contiguous Fives': match(/(.)\1\1\1\1/),
  'Deep Void (4)': stretch('0000'), 'Strobogrammatic': all, 'Straight': seq(5), 'Jackpot Four': stretch('7777'),
  'Very Nice': stretch('6969'), 'Deeper Meaning': stretch('4242'), '6767': stretch('6767'), 'Leet': stretch('1337'),
  'Hell': stretch('7734'), '8008': stretch('8008'), 'Big Brother': stretch('1984'), 'Pi Slice (4)': stretch('3141'),
  'E Slice (4)': stretch('2718'), 'Tau Slice (4)': stretch('6283'), '3 Consecutive Numbers (Scrambled)': all, 'Zipper': all,
  'Ascension': all, 'Crescendo': all, 'Five of a Kind': ofCount(c => c >= 5), '3 Consecutive Numbers (Contains)': consecContains(3),
  'Contiguous Three Pair': match(/(.)\1(.)\2(.)\3/), 'Framed Pair': framed(1, 3), 'Framed Triple': framed(1, 4), 'Framed Quad': framed(1, 5),
  'Decay': all, 'Three Digits': whole, 'Echo': all, 'Millennium': tail(3), 'Pronic Number': whole, 'Triple Nine': tail(3),
  'Semi-Millennium': tail(3), 'Colossal': whole,

  '6th Power': whole, 'Power of Three': whole, '5th Power': whole, 'Jackpot Five': stretch('77777'), 'Power of Two': whole,
  'Royal Flush': stretch('56789'), '58008': stretch('58008'), '80085': stretch('80085'), 'Pi Slice (5)': stretch('31415'),
  'E Slice (5)': stretch('27182'), 'Tau Slice (5)': stretch('62831'), 'Cascade': all, 'Fibonacci Number': whole, '4th Power': whole,
  'Waterfall': all, '4 Consecutive Numbers (Contains)': consecContains(4), '4 Consecutive Numbers (Scrambled)': all,
  'Homogeneous': all, 'Funny Numbers': stretch('69', '420'), 'Binary Soul': all, 'Straight Flush': straightFlush, 'Two Digits': whole,
  'Spy Number': whole, 'Epoch': tail(4), 'Quad Nine': tail(4), 'Semi-Epoch': tail(4),

  'Exact Nice': whole, 'Exact Jackpot': whole, 'Jackpot Six': whole, 'Exact Botanist': whole, 'Exact Devil': whole, 'Exact Leet': whole,
  'Exact Hell': whole, 'Exact 80085': whole, 'Exact Meaning': whole, 'Exact Emergency': whole, 'Very Very Nice': whole, 'Hotbox': whole,
  'Mayday': whole, 'Universal Answer': whole, 'Orwellian': whole, 'Exact Six-Seven': whole, 'Exact Eighty-Six': whole,
  'Exact Orientation': whole, 'Exact Calendar': whole, 'Brainrot': whole, 'Groundhog Day': whole, 'One Million': whole,
  'Not Found': whole, 'Full Day': whole, '17776': whole, 'Infernal': whole,
  'Zero': whole, 'One': whole, 'Two': whole, 'Three': whole, 'Four': whole, 'Five': whole, 'Six': whole, 'Seven': whole, 'Eight': whole, 'Nine': whole,
  'Always': whole, 'Funny Number': whole, 'Exact Boob': whole, '13th Power': whole, '17th Power': whole, '19th Power': whole, 'Tau': whole,
  'Golden Ratio': whole, '10th Power': whole, '11th Power': whole, 'Pi': whole, "Euler's Number": whole, '4 Consecutive Numbers': all,
  '9th Power': whole, '8th Power': whole, 'Ouroboros': whole, '7th Power': whole, 'Power of Seven': whole, 'Factorial': whole,
  'Power of Five': whole, 'Hello': stretch('07734'), 'Sequence (6)': seq(6), 'Eon': tail(5), 'Contiguous Sixes': match(/(.)\1{5}/),
  'Deep Void (5)': stretch('00000'), 'Single Digit': whole, 'Quint Nine': tail(5), 'Semi-Eon': tail(5),
};

/** The highlight for one badge on one roll. Unknown names light the whole number. */
export function highlight(name: string, n: number): Highlight {
  const s = String(n), f = HIGHLIGHTS[name] ?? whole;
  return f(s, context(s));
}
