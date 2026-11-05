/* Million Fathoms: all 233 badge rules. Checked against the Python scorer on all 1,000,001 rolls. */
const MAX_ROLL = 1000000, ROLLS = MAX_ROLL + 1;

const SIEVE = (() => {
  const t = new Uint8Array(ROLLS).fill(1); t[0] = t[1] = 0;
  for (let i = 2; i <= 1000; i++) if (t[i]) for (let j = i * i; j < ROLLS; j += i) t[j] = 0;
  return t;
})();
const kthPowers = k => { const o = new Set(); for (let i = 0; i ** k <= MAX_ROLL; i++) o.add(i ** k); return o; };
const powersOf = b => { const o = new Set([1]); for (let v = b; v <= MAX_ROLL; v *= b) o.add(v); return o; };
const POW = Object.fromEntries([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 17, 19].map(k => [k, kthPowers(k)]));
const P2 = powersOf(2), P3 = powersOf(3), P5 = powersOf(5), P7 = powersOf(7);
const FIB = (() => { const o = new Set([0, 1]); let a = 1, b = 2; while (b <= MAX_ROLL) { o.add(b); [a, b] = [b, a + b]; } return o; })();
const FACT = new Set([1, 2, 6, 24, 120, 720, 5040, 40320, 362880]);
const OURO = new Set([1, 4, 27, 256, 3125, 46656, 823543]);
const PRONIC = (() => { const o = new Set(); for (let i = 0; i < 1000; i++) o.add(i * (i + 1)); return o; })();

function context(s) {
  const cnt = new Array(10).fill(0), digits = [];
  let sum = 0, prod = 1;
  for (let i = 0; i < s.length; i++) { const d = s.charCodeAt(i) - 48; digits.push(d); cnt[d]++; sum += d; prod *= d; }
  const diffs = []; for (let i = 1; i < digits.length; i++) diffs.push(digits[i] - digits[i - 1]);
  const vals = cnt.filter(Boolean).sort((a, b) => b - a);
  return { cnt, digits, sum, prod, diffs, vals, uniq: vals.length, len: s.length, multi: vals.filter(v => v >= 2).length };
}

const every = (a, f) => { for (let i = 0; i < a.length; i++) if (!f(a[i], i)) return false; return true; };
const some = (a, f) => { for (let i = 0; i < a.length; i++) if (f(a[i], i)) return true; return false; };
const alternates = a => { for (let i = 1; i < a.length; i++) if (a[i - 1] * a[i] >= 0) return false; return true; };
const shape = x => x.diffs.filter(Boolean).map(Math.sign);

function hill(x, flat, first) {
  if (!flat && x.diffs.includes(0)) return false;
  const sh = shape(x);
  if (!sh.length || sh[0] !== first || sh[sh.length - 1] !== -first) return false;
  let turns = 0; for (let i = 1; i < sh.length; i++) if (sh[i] !== sh[i - 1]) turns++;
  return turns === 1;
}
const isRun = q => every(q, (v, i) => i === 0 || v - q[i - 1] === 1);
const sorted = a => [...a].sort((p, q) => p - q);
function runWhenSorted(x) {
  const n = x.len;
  for (let L = 3; L <= n; L++) for (let i = 0; i + L <= n; i++) if (isRun(sorted(x.digits.slice(i, i + L)))) return true;
  return false;
}
function seqLen(x, L) {
  const d = x.diffs;
  for (let i = 0; i + L - 1 <= d.length; i++) {
    const w = d.slice(i, i + L - 1);
    if (w.length === L - 1 && (every(w, v => v === 1) || every(w, v => v === -1))) return true;
  }
  return false;
}
function splits(s, k, visit) {
  const n = s.length, cur = [];
  const go = i => {
    if (i === n) { return (k === undefined || cur.length === k) ? visit(cur) : false; }
    for (let j = i + 1; j <= n; j++) {
      if (j - i > 1 && s[i] === '0') continue;
      cur.push(+s.slice(i, j));
      const r = go(j); cur.pop();
      if (r) return true;
    }
    return false;
  };
  return go(0);
}
const consecSplit = (s, k, ordered) => splits(s, k, p => {
  if (every(p, v => v < 10)) return false;
  if (ordered) return every(p, (v, i) => i === 0 || v - p[i - 1] === 1) || every(p, (v, i) => i === 0 || p[i - 1] - v === 1);
  return isRun(sorted(p));
});
function consecContains(s, k) {
  const n = s.length;
  const go = (start, i, parts) => {
    if (parts.length === k) return !every(parts, v => v < 10) && !(start === 0 && i === n);
    for (let j = i + 1; j <= n; j++) {
      if (j - i > 1 && s[i] === '0') continue;
      const v = +s.slice(i, j);
      if (parts.length) {
        const d = v - parts[parts.length - 1];
        if (Math.abs(d) !== 1) continue;
        if (parts.length > 1 && d !== parts[parts.length - 1] - parts[parts.length - 2]) continue;
      }
      if (go(start, j, [...parts, v])) return true;
    }
    return false;
  };
  for (let i = 0; i < n; i++) if (go(i, i, [])) return true;
  return false;
}
function consecNearby(s) {
  const n = s.length, subs = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j <= n; j++) if (j - i === 1 || s[i] !== '0') subs.push([i, j, +s.slice(i, j)]);
  for (const a of subs) for (const b of subs)
    if (a[1] < b[0] && Math.abs(a[2] - b[2]) === 1 && (a[1] - a[0] > 1 || b[1] - b[0] > 1)) return true;
  return false;
}
function hopChains(s) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    if (i >= 2 && s[i - 2] === s[i]) continue;
    let L = 1, j = i;
    while (j + 2 < s.length && s[j + 2] === s[i]) { L++; j += 2; }
    if (L >= 2) out.push(L);
  }
  return out;
}
const arithSplit = s => splits(s, undefined, p => {
  if (p.length < 3) return false;
  const d = p[1] - p[0];
  return Math.abs(d) >= 2 && every(p, (v, i) => i === 0 || v - p[i - 1] === d);
});
const geoSplit = s => splits(s, undefined, p => {
  if (p.length < 3 || !p[0] || !p[1] || p[0] === p[1]) return false;
  for (let i = 1; i < p.length - 1; i++) if (p[i] * p[i] !== p[i - 1] * p[i + 1]) return false;
  return true;
});
function rhyme(s) {
  const n = s.length;
  for (let L = 2; L <= n >> 1; L++) for (let i = 0; i + 2 * L <= n; i++) if (s.slice(i + L).includes(s.slice(i, i + L))) return true;
  return false;
}
const isPal = t => { for (let a = 0, b = t.length - 1; a < b; a++, b--) if (t[a] !== t[b]) return false; return true; };
function pocketMirror(s) {
  for (let i = 0; i < s.length; i++) for (let j = i + 4; j <= s.length; j++) if (isPal(s.slice(i, j))) return true;
  return false;
}
const STROBO = { 0: '0', 1: '1', 6: '9', 8: '8', 9: '6' };
const strobo = s => { let t = ''; for (let i = s.length - 1; i >= 0; i--) { const c = STROBO[s[i]]; if (!c) return false; t += c; } return t === s; };
const equation = s => splits(s, 3, ([a, b, c]) => !!(a && b && c) && (a + b === c || a - b === c || a * b === c || a === b * c));
const contains = t => (n, s) => s.includes(t);
const exact = (...v) => { const o = new Set(v); return n => o.has(n); };
const one = d => (n, s, x) => x.cnt[d] === 1;
const kind = k => (n, s, x) => x.vals[0] >= k;
const allIn = set => (n, s) => { for (const c of s) if (!set.includes(c)) return false; return true; };
const halves = s => [s.slice(0, s.length >> 1), s.slice(s.length >> 1)];
const sumOf = t => { let v = 0; for (const c of t) v += +c; return v; };

const BADGES = [];
const b = (name, icon, desc, family, rule) => BADGES.push({ name, icon, desc, family, rule });

/* name, icon, what earns it, family, rule */
b('Hills', '🏞️', 'Digits strictly alternate up and down (4+ digits).', 'Hills', (n, s, x) => x.len >= 4 && !x.diffs.includes(0) && alternates(x.diffs));
b('Three of a Kind', '🎰', 'Exactly three of one digit.', 'Of A Kind', (n, s, x) => x.vals.includes(3));
b('Lucky Seven (Divisible)', '🎰', 'Divisible by 7.', null, n => n > 0 && n % 7 === 0);
b('Heterogeneous', '🥗', 'No repeated digits.', null, (n, s, x) => x.uniq === x.len);
b('Mini Scramble', '🧩', '3+ adjacent digits form a run when sorted.', 'Progression', (n, s, x) => runWhenSorted(x));
b('Gap One', '↕️', 'First and last digits differ by exactly 1.', null, (n, s, x) => x.len >= 2 && Math.abs(x.digits[0] - x.digits[x.len - 1]) === 1);
b('Two Pair', '👯‍♀️', 'Two digits each appearing twice or more.', 'Pairs', (n, s, x) => x.multi >= 2);
b('Dunes', '🐫', 'Slopes keep alternating; flat stretches allowed.', 'Hills', (n, s, x) => { const h = shape(x); return x.len >= 4 && h.length >= 3 && alternates(h); });
b('Hopscotch', '🦘', 'A digit appears at every other position, twice.', 'Hopscotch', (n, s, x) => x.uniq > 1 && hopChains(s).includes(2));
b('Ghost', '👻', 'Contains exactly one 0.', null, one(0));
b('Quartet', '🎻', 'Exactly four different digits.', null, (n, s, x) => x.uniq === 4);
[['Hydrogen (1)', '💧', 1], ['Helium (2)', '🎈', 2], ['Lithium (3)', '🔋', 3], ['Beryllium (4)', '💎', 4], ['Boron (5)', '🧼', 5], ['Carbon (6)', '✏️', 6], ['Nitrogen (7)', '❄️', 7], ['Oxygen (8)', '💨', 8], ['Fluorine (9)', '🦷', 9]]
  .forEach(([nm, ic, d]) => b(nm, ic, `Contains exactly one ${d}.`, null, one(d)));
b('Grounded', '⚓', 'First digit smaller than the last.', null, (n, s) => s[0] < s[s.length - 1]);
b('Contiguous Pair', '🫂', 'Two identical neighbouring digits.', 'Pairs', (n, s) => /(.)\1/.test(s));
b('Lucky Seven', '7️⃣', 'Contains the digit 7.', null, contains('7'));
b('Even', '⚖️', 'An even number.', null, n => n % 2 === 0);
b('Odd', '🦄', 'An odd number.', null, n => n % 2 === 1);
b('Liftoff', '🚀', 'First digit larger than the last.', null, (n, s) => s[0] > s[s.length - 1]);
b('Void', '🕳️', 'Contains no 0 at all.', null, (n, s) => !s.includes('0'));
b('Neighbors', '🏘️', 'Two adjacent digits differ by exactly 1.', null, (n, s, x) => some(x.diffs, d => Math.abs(d) === 1));
b('Pair', '👯', 'Any digit appearing at least twice.', 'Pairs', (n, s, x) => x.vals[0] >= 2);
b('Six Digits', '🐝', 'A full six-digit roll.', null, (n, s) => s.length === 6);

b('Four of a Kind', '🍀', 'Four identical digits anywhere.', 'Of A Kind', kind(4));
b('Equation', '🟰', 'Splits into a true sum, like 2 + 3 = 5 written as 235.', null, (n, s) => equation(s));
b('Low Ball', '📉', 'Every digit is 0 to 4.', null, allIn('01234'));
b('Mountain', '🏔️', 'Digits climb to a peak, then descend.', 'Peak', (n, s, x) => hill(x, false, 1));
b('Double Hop', '🦘🦘', 'A digit appears at every other position, 3 times.', 'Hopscotch', (n, s, x) => x.uniq > 1 && some(hopChains(s), v => v >= 3));
b('High Roller', '🤑', 'Every digit is 5 to 9.', null, allIn('56789'));
b('Valley', '🏜️', 'Digits fall to a floor, then climb.', 'Peak', (n, s, x) => hill(x, false, -1));
b('Contiguous Two Pair', '👨‍👩‍👧‍👦', 'Two adjacent contiguous pairs (aabb).', 'Pairs', (n, s) => /(.)\1(?!\1)(.)\2/.test(s));
b('Mini Echo', '🔂', 'An adjacent two-digit repeat (abab).', 'Repeat', (n, s) => /(..)\1/.test(s));
b('Alternator', '⚡', 'Digits strictly alternate even and odd.', null, (n, s, x) => x.len >= 2 && every(x.diffs, d => d % 2 !== 0));
b('Flush', '🎨', 'All digits even, or all odd.', null, (n, s, x) => every(x.digits, d => d % 2 === x.digits[0] % 2));
b('Contiguous Trips', '➖', 'Three identical digits in a row.', 'Contiguous Run', (n, s) => /(.)\1\1/.test(s));
b('Deep Void', '🕳️', 'Contains 00.', 'Void Depth', contains('00'));
b('Feather', '🪶', 'Digit sum under 15.', null, (n, s, x) => x.sum < 15);
b('Blackjack', '♠️', 'Digits sum to exactly 21.', null, (n, s, x) => x.sum === 21);
b('Full House', '🏠', 'A set of three and a set of two.', 'Boat', (n, s, x) => x.vals.length >= 2 && x.vals[0] >= 3 && x.vals[1] >= 2);
b('Pocket Mirror', '🪞', 'Contains a palindrome of 4+ digits.', 'Palindrome', (n, s) => pocketMirror(s));
b('Snake Eyes', '🎲', 'Exactly one pair, and it is a pair of ones.', null, (n, s, x) => x.cnt[1] === 2 && x.multi === 1);
b('Nice', '😏', 'Contains 69.', 'Nice', contains('69'));
b('Meaning of Life', '🌌', 'Contains 42.', 'Botanist', contains('42'));
b('Six-Seven', '🫠', 'Contains 67.', 'Sixty Seven', contains('67'));
b('Eighty-Six', '🍽️', 'Contains 86.', 'Eighty Six', contains('86'));
b('Balanced', '⚖️', 'First half of the digits sums to the same as the second.', null, (n, s, x) => { if (x.len % 2) return false; const [p, q] = halves(s); return sumOf(p) === sumOf(q); });
b('Rhyme', '🎶', 'The same 2+ digit stretch appears twice.', 'Repeat', (n, s) => rhyme(s));
b('Sequence (3)', '🔢', 'Three consecutive digits in a row.', 'Progression', (n, s, x) => seqLen(x, 3));
b('2 Consecutive Numbers (Contains)', '🔗', 'Two adjacent stretches are consecutive integers.', 'Consecutive', (n, s) => consecContains(s, 2));
b('2 Consecutive Numbers (Nearby)', '🔗', 'Two separated stretches are consecutive integers.', 'Consecutive', (n, s) => consecNearby(s));
b('Mesa', '🗻', 'Rise to a peak then fall; flat stretches allowed.', 'Peak', (n, s, x) => hill(x, true, 1));
b('Prime Number', '💎', 'A prime number.', null, n => SIEVE[n] === 1);
b('Trinity', '⚜️', 'Exactly three different digits.', null, (n, s, x) => x.uniq === 3);
b('Dozen', '🍩', 'Divisible by 12.', null, n => n > 0 && n % 12 === 0);
b('Canyon', '🌄', 'Fall to a floor then rise; flat stretches allowed.', 'Peak', (n, s, x) => hill(x, true, -1));
b('Five Digits', '🖐️', 'A five-digit roll.', null, (n, s) => s.length === 5);
b('Eleven', '🕚', 'Divisible by 11.', null, n => n > 0 && n % 11 === 0);
b('Harshad Number', '🤝', 'Divisible by its own digit sum.', null, (n, s, x) => n > 0 && n % x.sum === 0);
b('Clean', '🧼', 'Ends in 0.', 'Void Depth', n => n % 10 === 0);
b('Semi-Clean', '🧹', 'Ends in 5.', null, n => n % 10 === 5);
b('Equilibrium', '🧘', 'First and last digits match.', 'Equilibrium', (n, s, x) => x.len >= 2 && s[0] === s[x.len - 1]);
b('Sandwich', '🥪', 'Matching ends with something different inside.', 'Equilibrium', (n, s, x) => x.len >= 3 && s[0] === s[x.len - 1] && x.uniq > 1);

b('2nd Power', '🟦', 'A perfect square.', 'Power', n => POW[2].has(n));
b('Even Spacing (Absolute)', '📐', 'Digits have equal absolute spacing.', 'Progression', (n, s, x) => x.len >= 3 && every(x.diffs, d => Math.abs(d) === Math.abs(x.diffs[0])));
b('Firefly', '🪲', 'One unique digit among identical others (4+ digits).', 'Duality', (n, s, x) => x.len >= 4 && x.uniq === 2 && x.vals[1] === 1);
b('2 Consecutive Numbers', '🔗', 'Splits into 2 consecutive integers.', 'Consecutive', (n, s) => consecSplit(s, 2, true));
b('Palindrome', '🪞', 'Reads the same forwards and backwards.', 'Palindrome', (n, s) => isPal(s));
b('Contiguous Quads', '➖➖', 'Four identical digits in a row.', 'Contiguous Run', (n, s) => /(.)\1\1\1/.test(s));
b('Deep Void (3)', '🌑', 'Contains 000.', 'Void Depth', contains('000'));
b('Turtle', '🐢', 'Neighbouring digits differ by at most 1.', 'Progression', (n, s, x) => x.len >= 2 && every(x.diffs, d => Math.abs(d) <= 1));
b('Secret Agent', '🕶️', 'Contains 007.', null, contains('007'));
b('Heavy', '🧱', 'Digit sum above 45.', null, (n, s, x) => x.sum > 45);
b('Contiguous Full House', '🏰', 'A run of three next to a run of two.', 'Boat', (n, s) => /(.)\1\1(?!\1)(.)\2|(.)\3(?!\3)(.)\4\4/.test(s));
b('Jackpot', '💰', 'Contains 777.', 'Jackpot', contains('777'));
b('Devil', '😈', 'Contains 666.', 'Devil', contains('666'));
b('Sequence (4)', '🔢', 'Four consecutive digits in a row.', 'Progression', (n, s, x) => seqLen(x, 4));
b('Error 404', '🚫', 'Contains 404.', 'Error', contains('404'));
b('Orientation', '🧭', 'Contains 101.', 'Orientation', contains('101'));
b('Botanist', '🌿', 'Contains 420.', 'Botanist', contains('420'));
b('Emergency', '🚑', 'Contains 911.', 'Emergency', contains('911'));
b('Pi Slice (3)', '🥧', 'Contains 314.', 'Pi', contains('314'));
b('E Slice (3)', '📈', 'Contains 271.', 'E', contains('271'));
b('Calendar', '📅', 'Contains 365.', 'Calendar', contains('365'));
b('Divisible by Three', '🔺', 'Every digit is 0, 3, 6 or 9.', null, allIn('0369'));
b('Scramble', '🔀', 'All digits form a consecutive run when sorted.', 'Progression', (n, s, x) => x.len >= 2 && isRun(sorted(x.digits)));
b('Duality', '☯️', 'Exactly two different digits.', 'Duality', (n, s, x) => x.uniq === 2);
b('Steps', '🪜', 'Digits never decrease.', 'Monotonic', (n, s, x) => x.uniq > 1 && every(x.diffs, d => d >= 0));
b('Metronome', '🎼', 'Splits into 3+ parts with a constant difference.', 'Progression', (n, s) => arithSplit(s));
b('Framed Double', '🖼️🖼️🖼️', 'Two middle pairs, bookended by different digits.', 'Pairs', (n, s) => s.length === 6 && s[1] === s[2] && s[2] !== s[3] && s[3] === s[4] && s[0] !== s[1] && s[5] !== s[4]);
b('Slopes', '🛝', 'Digits never increase.', 'Monotonic', (n, s, x) => x.uniq > 1 && every(x.diffs, d => d <= 0));
b('Paired Bookends', '👐', 'Starts with a pair and ends with a different pair.', 'Bookends', (n, s, x) => x.len >= 4 && s[0] === s[1] && s[x.len - 1] === s[x.len - 2] && s[0] !== s[x.len - 1]);
b('Four Digits', '🍀', 'A four-digit roll.', null, (n, s) => s.length === 4);
b('Three Pair', '👯‍♀️👯', 'Three distinct pairs of digits.', 'Pairs', (n, s, x) => x.multi >= 3);
b('Bookends', '📚', 'First two digits equal the last two.', 'Bookends', (n, s, x) => x.len >= 4 && s.slice(0, 2) === s.slice(-2));
b('Mirror Bookends', '📖', 'First two digits reversed are the last two.', 'Bookends', (n, s, x) => x.len >= 4 && s[0] === s[x.len - 1] && s[1] === s[x.len - 2]);
b('Century', '💯', 'Ends in 00.', 'Void Depth', n => n >= 100 && n % 100 === 0);
b('Double Nine', '🎈', 'Ends in 99.', 'Nine Ending', n => n % 100 === 99);
b('Quarter-Century', '🪙', 'Ends in 25.', null, n => n % 100 === 25);
b('Semi-Century', '🗓️', 'Ends in 50.', 'Void Depth', n => n % 100 === 50);
b('Three-Quarter Century', '🕰️', 'Ends in 75.', null, n => n % 100 === 75);

b('3rd Power', '🧊', 'A perfect cube.', 'Power', n => POW[3].has(n));
b('Even Spacing', '📏', 'Digits form an arithmetic sequence.', 'Progression', (n, s, x) => x.len >= 3 && every(x.diffs, d => d === x.diffs[0]));
b('3 Consecutive Numbers', '⛓️', 'Splits into 3 consecutive integers, in order.', 'Consecutive', (n, s) => consecSplit(s, 3, true));
b('Contiguous Fives', '➖➖➖', 'Five identical digits in a row.', 'Contiguous Run', (n, s) => /(.)\1\1\1\1/.test(s));
b('Deep Void (4)', '🌌', 'Contains 0000.', 'Void Depth', contains('0000'));
b('Strobogrammatic', '🙃', 'Looks the same rotated 180°.', null, (n, s) => strobo(s));
b('Straight', '📏', 'Five consecutive digits, up or down.', 'Straight', (n, s, x) => seqLen(x, 5));
b('Jackpot Four', '💰💰', 'Four sevens in a row.', 'Jackpot', contains('7777'));
b('Very Nice', '🥵', 'Contains 6969.', 'Nice', contains('6969'));
b('Deeper Meaning', '🌌', 'Contains 4242.', 'Meaning', contains('4242'));
b('6767', '🫠', 'Contains 6767.', 'Sixty Seven', contains('6767'));
b('Leet', '💻', 'Contains 1337.', 'Leet', contains('1337'));
b('Hell', '🔥', 'Contains 7734, HELL upside-down.', 'Hell', contains('7734'));
b('8008', '🔢', 'Contains 8008.', 'Boob', contains('8008'));
b('Big Brother', '👁️', 'Contains 1984.', 'Big Brother', contains('1984'));
b('Pi Slice (4)', '🥧', 'Contains 3141.', 'Pi', contains('3141'));
b('E Slice (4)', '📈', 'Contains 2718.', 'E', contains('2718'));
b('Tau Slice (4)', '🌀', 'Contains 6283.', 'Tau', contains('6283'));
b('3 Consecutive Numbers (Scrambled)', '🔀', 'Splits into 3 consecutive integers, out of order.', 'Consecutive', (n, s) => consecSplit(s, 3, false) && !consecSplit(s, 3, true));
b('Zipper', '🤐', 'Two digits alternating perfectly.', null, (n, s, x) => x.len >= 2 && x.uniq === 2 && s[0] !== s[1] && every(x.digits, (d, i) => i < 2 || d === x.digits[i - 2]));
b('Ascension', '📈', 'Every digit strictly larger than the previous.', 'Monotonic', (n, s, x) => x.len >= 2 && every(x.diffs, d => d > 0));
b('Crescendo', '🔊', 'Splits into 3+ parts with a constant ratio.', 'Progression', (n, s) => geoSplit(s));
b('Five of a Kind', '🃏', 'Five identical digits anywhere.', 'Of A Kind', kind(5));
b('3 Consecutive Numbers (Contains)', '🔗', 'Contains 3 adjacent consecutive integers.', 'Consecutive', (n, s) => consecContains(s, 3));
b('Contiguous Three Pair', '👨‍👩‍👧‍👦👯', 'Three adjacent contiguous pairs (ddeeff).', 'Pairs', (n, s, x) => x.uniq === 3 && /(.)\1(.)\2(.)\3/.test(s));
b('Framed Pair', '🖼️', '4 digits: middle two match, both ends differ.', 'Pairs', (n, s) => s.length === 4 && s[1] === s[2] && s[0] !== s[1] && s[3] !== s[1]);
b('Framed Triple', '🖼️🖼️', '5 digits: middle three match, ends differ.', 'Of A Kind', (n, s) => s.length === 5 && s[1] === s[2] && s[2] === s[3] && s[0] !== s[1] && s[4] !== s[1]);
b('Framed Quad', '🪟', '6 digits: middle four match, ends differ.', 'Of A Kind', (n, s) => s.length === 6 && s[1] === s[2] && s[2] === s[3] && s[3] === s[4] && s[0] !== s[1] && s[5] !== s[1]);
b('Decay', '📉', 'Every digit strictly smaller than the previous.', 'Monotonic', (n, s, x) => x.len >= 2 && every(x.diffs, d => d < 0));
b('Three Digits', '🤟', 'A three-digit roll.', null, (n, s) => s.length === 3);
b('Echo', '📣', 'The first half repeats as the second half.', null, (n, s, x) => { if (x.len % 2) return false; const [p, q] = halves(s); return p === q; });
b('Millennium', '🗓️', 'Ends in 000.', 'Void Depth', n => n >= 1000 && n % 1000 === 0);
b('Pronic Number', '🧮', 'The product of two consecutive integers.', null, n => PRONIC.has(n));
b('Triple Nine', '🎉', 'Ends in 999.', 'Nine Ending', n => n % 1000 === 999);
b('Semi-Millennium', '📜', 'Ends in 500.', 'Void Depth', n => n % 1000 === 500);
b('Colossal', '🪨', 'Above 999,000.', null, n => n > 999000);

b('6th Power', '🎲', 'A perfect 6th power.', 'Power', n => POW[6].has(n));
b('Power of Three', '🔺', 'A power of 3.', null, n => P3.has(n));
b('5th Power', '🖐️', 'A perfect 5th power.', 'Power', n => POW[5].has(n));
b('Jackpot Five', '💰💰💰', 'Five sevens in a row.', 'Jackpot', contains('77777'));
b('Power of Two', '💾', 'A power of 2.', null, n => P2.has(n));
b('Royal Flush', '👑', 'Contains 56789, the top straight.', 'Straight', contains('56789'));
b('58008', '🔠', 'Contains 58008.', 'Boob', contains('58008'));
b('80085', '🅱️', 'Contains 80085.', 'Boob', contains('80085'));
b('Pi Slice (5)', '🥧', 'Contains 31415.', 'Pi', contains('31415'));
b('E Slice (5)', '📈', 'Contains 27182.', 'E', contains('27182'));
b('Tau Slice (5)', '🌀', 'Contains 62831.', 'Tau', contains('62831'));
b('Cascade', '🌊', 'Every digit is exactly one more than the previous.', 'Progression', (n, s, x) => x.len >= 2 && every(x.diffs, d => d === 1));
b('Fibonacci Number', '🐚', 'A Fibonacci number.', null, n => FIB.has(n));
b('4th Power', '📦', 'A perfect 4th power.', 'Power', n => POW[4].has(n));
b('Waterfall', '🚿', 'Every digit is exactly one less than the previous.', 'Progression', (n, s, x) => x.len >= 2 && every(x.diffs, d => d === -1));
b('4 Consecutive Numbers (Contains)', '🔗', 'Contains 4 adjacent consecutive integers.', 'Consecutive', (n, s) => consecContains(s, 4));
b('4 Consecutive Numbers (Scrambled)', '🔀', 'Splits into 4 consecutive integers, out of order.', 'Consecutive', (n, s) => consecSplit(s, 4, false) && !consecSplit(s, 4, true));
b('Homogeneous', '🥛', 'Every digit is the same.', null, (n, s, x) => x.len >= 2 && x.uniq === 1);
b('Funny Numbers', '😂', 'Contains both 69 and 420.', 'Ultimeme', (n, s) => s.includes('69') && s.includes('420'));
b('Binary Soul', '🤖', 'Only 0s and 1s.', null, allIn('01'));
b('Straight Flush', '🃏', 'Contains 02468, 13579, 86420 or 97531.', 'Straight', (n, s) => ['02468', '13579', '86420', '97531'].some(t => s.includes(t)));
b('Two Digits', '✌️', 'A two-digit roll.', null, (n, s) => s.length === 2);
b('Spy Number', '🕵️', 'Digit sum equals digit product (excludes 1 and 2).', null, (n, s, x) => n !== 1 && n !== 2 && x.sum === x.prod);
b('Epoch', '🏛️', 'Ends in 0000.', 'Void Depth', n => n >= 10000 && n % 10000 === 0);
b('Quad Nine', '🎊', 'Ends in 9999.', 'Nine Ending', n => n % 10000 === 9999);
b('Semi-Epoch', '⌛', 'Ends in 5000.', 'Void Depth', n => n % 10000 === 5000);

[['Exact Nice', '😏', 'Nice', 69], ['Exact Jackpot', '💰', 'Jackpot', 777], ['Jackpot Six', '🏦', 'Jackpot', 777777], ['Exact Botanist', '🌿', 'Botanist', 420], ['Exact Devil', '😈', 'Devil', 666], ['Exact Leet', '💻', 'Leet', 1337], ['Exact Hell', '👹', 'Hell', 7734], ['Exact 80085', '💎', 'Boob', 80085], ['Exact Meaning', '🌌', 'Botanist', 42], ['Exact Emergency', '🚑', 'Emergency', 911], ['Very Very Nice', '😏', 'Nice', 696969], ['Hotbox', '🌿', 'Botanist', 420420], ['Mayday', '🚑', 'Emergency', 911911], ['Universal Answer', '🌌', 'Meaning', 424242], ['Orwellian', '👁️', 'Big Brother', 1984], ['Exact Six-Seven', '🫠', 'Sixty Seven', 67], ['Exact Eighty-Six', '🍽️', 'Eighty Six', 86], ['Exact Orientation', '🧭', 'Orientation', 101], ['Exact Calendar', '📅', 'Calendar', 365], ['Brainrot', '🫠', 'Sixty Seven', 676767], ['Groundhog Day', '📅', 'Calendar', 365365], ['One Million', '🐐', null, 1000000], ['Not Found', '🚫', 'Error', 404], ['Full Day', '⏳', null, 86400], ['17776', '🏈', null, 17776], ['Infernal', '🔱', 'Devil', 666666]]
  .forEach(([nm, ic, f, v]) => b(nm, ic, `The roll is exactly ${v}.`, f, exact(v)));
[['Zero', '0️⃣'], ['One', '1️⃣'], ['Two', '2️⃣'], ['Three', '3️⃣'], ['Four', '4️⃣'], ['Five', '5️⃣'], ['Six', '6️⃣'], ['Seven', '7️⃣'], ['Eight', '8️⃣'], ['Nine', '9️⃣']]
  .forEach(([nm, ic], i) => b(nm, ic, `The roll is ${i}.`, 'Single Digit', exact(i)));
b('Always', '♾️', 'Exactly 247365 or 365247.', 'Calendar', exact(247365, 365247));
b('Funny Number', '😂', 'Exactly 69420 or 42069.', 'Ultimeme', exact(69420, 42069));
b('Exact Boob', '🍈', 'Exactly 8008 or 58008.', 'Boob', exact(8008, 58008));
b('13th Power', '💀', 'A perfect 13th power.', 'Power', n => POW[13].has(n));
b('17th Power', '🧙', 'A perfect 17th power.', 'Power', n => POW[17].has(n));
b('19th Power', '🌑', 'A perfect 19th power.', 'Power', n => POW[19].has(n));
b('Tau', '🌀', 'Exactly 6283, 62831 or 628318.', 'Tau', exact(6283, 62831, 628318));
b('Golden Ratio', '🐚', 'Exactly 1618, 16180 or 161803.', null, exact(1618, 16180, 161803));
b('10th Power', '🔟', 'A perfect 10th power.', 'Power', n => POW[10].has(n));
b('11th Power', '🕚', 'A perfect 11th power.', 'Power', n => POW[11].has(n));
b('Pi', '🥧', 'Exactly 314, 3141, 31415 or 314159.', 'Pi', exact(314, 3141, 31415, 314159));
b("Euler's Number", '📈', 'Exactly 271, 2718, 27182 or 271828.', 'E', exact(271, 2718, 27182, 271828));
b('4 Consecutive Numbers', '⛓️', 'Splits into 4 consecutive integers, in order.', 'Consecutive', (n, s) => consecSplit(s, 4, true));
b('9th Power', '☁️', 'A perfect 9th power.', 'Power', n => POW[9].has(n));
b('8th Power', '🎱', 'A perfect 8th power.', 'Power', n => POW[8].has(n));
b('Ouroboros', '🐍', 'n to the power of n, from 1 up to 7.', 'Power', n => OURO.has(n));
b('7th Power', '🌈', 'A perfect 7th power.', 'Power', n => POW[7].has(n));
b('Power of Seven', '7️⃣', 'A power of 7, above 1.', null, n => n > 1 && P7.has(n));
b('Factorial', '❗', 'A factorial.', null, n => FACT.has(n));
b('Power of Five', '5️⃣', 'A power of 5, above 1.', null, n => n > 1 && P5.has(n));
b('Hello', '👋', 'Contains 07734, HELLO upside-down.', null, contains('07734'));
b('Sequence (6)', '🔢', 'Six consecutive digits in a row.', 'Progression', (n, s, x) => seqLen(x, 6));
b('Eon', '🗿', 'Ends in 00000.', 'Void Depth', n => n > 0 && n % 100000 === 0);
b('Contiguous Sixes', '➖➖➖➖', 'Six identical digits in a row.', 'Contiguous Run', (n, s) => /(.)\1{5}/.test(s));
b('Deep Void (5)', '⚫', 'Contains 00000.', 'Void Depth', contains('00000'));
b('Single Digit', '☝️', 'A one-digit roll.', 'Single Digit', (n, s) => s.length === 1);
b('Quint Nine', '🥳', 'Ends in 99999.', 'Nine Ending', n => n % 100000 === 99999);
b('Semi-Eon', '🦴', 'Ends in 50000.', 'Void Depth', n => n % 100000 === 50000);

function earnedBadges(n) {
  const s = String(n), x = context(s), out = [];
  for (let i = 0; i < BADGES.length; i++) if (BADGES[i].rule(n, s, x)) out.push(BADGES[i]);
  return out;
}

if (typeof module !== 'undefined') module.exports = { BADGES, context, earnedBadges, MAX_ROLL, ROLLS };
