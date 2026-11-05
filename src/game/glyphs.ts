/* Pixel glyphs: the small picture beside each badge. Each is an 8x8 grid ('#' is a lit pixel) drawn as
   crisp SVG rects in the badge's tier colour, like the other UI icons. Kept apart from the rules so a
   picture can never change a score. Every badge needs a match in `glyphId` (npm run test:glyphs). */

/* Digits from a 5x7 pixel font, set into the 8x8 grid. */
const FONT: Record<string, string[]> = {
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['.###.', '#...#', '....#', '..##.', '....#', '#...#', '.###.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
};
const digit = (d: string) => ['........', ...FONT[d].map(r => '.' + r + '..')];

export const GLYPHS: Record<string, string[]> = {
  d0: digit('0'), d1: digit('1'), d2: digit('2'), d3: digit('3'), d4: digit('4'),
  d5: digit('5'), d6: digit('6'), d7: digit('7'), d8: digit('8'), d9: digit('9'),
  pair: ['........', '........', '........', '.##..##.', '.##..##.', '........', '........', '........'],
  trio: ['........', '...##...', '...##...', '........', '.##..##.', '.##..##.', '........', '........'],
  quad: ['........', '.##..##.', '.##..##.', '........', '.##..##.', '.##..##.', '........', '........'],
  peak: ['........', '...##...', '..####..', '..####..', '.######.', '.######.', '########', '........'],
  valley: ['........', '########', '.######.', '.######.', '..####..', '..####..', '...##...', '........'],
  steps: ['......##', '......##', '....####', '....####', '..######', '..######', '########', '########'],
  slope: ['##......', '##......', '####....', '####....', '######..', '######..', '########', '########'],
  wave: ['........', '........', '..#...#.', '.#.#.#.#', '#...#...', '........', '........', '........'],
  diag: ['##......', '##......', '..##....', '..##....', '....##..', '....##..', '......##', '......##'],
  duo: ['####....', '####....', '####....', '####....', '....####', '....####', '....####', '....####'],
  mirror: ['...##...', '...##...', '#..##..#', '##.##.##', '#..##..#', '...##...', '...##...', '........'],
  frame: ['########', '#......#', '#.####.#', '#.####.#', '#.####.#', '#.####.#', '#......#', '########'],
  brackets: ['###..###', '#......#', '#......#', '#......#', '#......#', '#......#', '#......#', '###..###'],
  block: ['########', '#......#', '#.####.#', '#.#..#.#', '#.#..#.#', '#.####.#', '#......#', '########'],
  ring: ['..####..', '.#....#.', '#......#', '#......#', '#......#', '#......#', '.#....#.', '..####..'],
  bullseye: ['..####..', '.#....#.', '#..##..#', '#.####.#', '#.####.#', '#..##..#', '.#....#.', '..####..'],
  crosshair: ['...##...', '...##...', '...##...', '###..###', '###..###', '...##...', '...##...', '...##...'],
  cells: ['........', '........', '........', '##.##.##', '##.##.##', '........', '........', '........'],
  power: ['.....###', '.....#.#', '.....###', '........', '.####...', '.#..#...', '.#..#...', '.####...'],
  diamond: ['...##...', '..####..', '.######.', '########', '.######.', '..####..', '...##...', '........'],
  slash: ['......##', '.....##.', '....##..', '...##...', '..##....', '.##.....', '##......', '........'],
  spiral: ['.######.', '#......#', '#.####.#', '#.#..#.#', '#.#.##.#', '#.#....#', '#.######', '.#......'],
  clock: ['..####..', '.#.##.#.', '#..##..#', '#..###.#', '#......#', '.#....#.', '..####..', '........'],
  calendar: ['.#....#.', '########', '#......#', '#.#.#.##', '#......#', '#.#.#.##', '#......#', '########'],
  ghost: ['..####..', '.######.', '##.##.##', '########', '########', '########', '##.##.##', '#..##..#'],
  balance: ['...##...', '...##...', '########', '#..##..#', '#..##..#', '...##...', '...##...', '..####..'],
  chain: ['........', '.####...', '.#..#...', '.#.####.', '.###..#.', '...#..#.', '...####.', '........'],
  equals: ['........', '.######.', '.######.', '........', '........', '.######.', '.######.', '........'],
  echo: ['.#...#..', '..#...#.', '...#...#', '...#...#', '..#...#.', '.#...#..', '........', '........'],
  bar: ['........', '........', '########', '########', '########', '........', '........', '........'],
  house: ['...##...', '..####..', '.######.', '########', '.#....#.', '.#.##.#.', '.#.##.#.', '.######.'],
  dice: ['########', '#......#', '#.#..#.#', '#......#', '#......#', '#.#..#.#', '#......#', '########'],
  eye: ['........', '........', '..####..', '.#....#.', '#..##..#', '.#....#.', '..####..', '........'],
  spark: ['...##...', '...##...', '..####..', '########', '########', '..####..', '...##...', '...##...'],
  cross: ['..####..', '..####..', '########', '########', '########', '########', '..####..', '..####..'],
  terminal: ['########', '#......#', '#.#....#', '#..#...#', '#.#....#', '#...##.#', '#......#', '########'],
  horns: ['#......#', '##....##', '###..###', '.######.', '.#.##.#.', '.######.', '..####..', '...##...'],
  up: ['...##...', '..####..', '.######.', '########', '...##...', '...##...', '...##...', '...##...'],
  down: ['...##...', '...##...', '...##...', '...##...', '########', '.######.', '..####..', '...##...'],
};

const NUMBER_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const ELEMENTS = /^(Hydrogen|Helium|Lithium|Beryllium|Boron|Carbon|Nitrogen|Oxygen|Fluorine) \((\d)\)$/;

/* The first matching rule wins, so the specific names sit above the general ones. Matched on badge name,
   then on family. */
const BY_NAME: [RegExp, string][] = [
  [/^Lucky Seven \(Divisible\)$/, 'slash'], [/^Lucky Seven$/, 'd7'], [/^Power of Seven$/, 'power'],
  [/^Deep Void/, 'bullseye'], [/^Void$/, 'ring'], [/^Ghost$/, 'ghost'],
  [/^Framed /, 'frame'], [/^(Sandwich|Paired Bookends|Bookends)$/, 'brackets'], [/^Mirror Bookends$/, 'mirror'],
  [/^Equilibrium$/, 'balance'], [/^(Even|Odd|Balanced|Feather|Heavy)$/, 'balance'],
  [/^(Colossal|One Million)$/, 'block'], [/^Grounded$/, 'down'], [/^Liftoff$/, 'up'],
  [/^(Three of a Kind)$/, 'trio'], [/^(Four|Five) of a Kind$/, 'quad'],
  [/^(Mountain|Mesa)$/, 'peak'], [/^(Valley|Canyon)$/, 'valley'], [/^(Hills|Dunes|Alternator)$/, 'wave'],
  [/^(Zipper|Duality)$/, 'duo'], [/^(Heterogeneous|Quartet|Trinity)$/, 'cells'],
  [/^(Cascade|Steps|Ascension)$/, 'steps'], [/^(Waterfall|Slopes|Decay)$/, 'slope'], [/^Straight$/, 'steps'],
  [/^(Royal Flush|Straight Flush|Blackjack|Snake Eyes|Flush|High Roller|Low Ball)$/, 'dice'],
  [/^Equation$/, 'equals'], [/^(Gap One|Neighbors|Turtle|Metronome|Crescendo|Scramble|Mini Scramble|Even Spacing.*|Sequence.*)$/, 'diag'],
  [/^(Palindrome|Pocket Mirror|Strobogrammatic)$/, 'mirror'], [/^(Echo|Mini Echo|Rhyme)$/, 'echo'],
  [/^(Prime Number|Pronic Number)$/, 'diamond'], [/^(Fibonacci Number|Golden Ratio|Euler's Number|Pi|Tau|(Pi|E|Tau) Slice.*)$/, 'spiral'],
  [/^(Harshad Number|Divisible by Three|Dozen|Eleven)$/, 'slash'], [/^Spy Number$/, 'eye'],
  [/Power$|^Power of |^(Factorial|Ouroboros)$/, 'power'],
  [/^(Leet|Exact Leet|Hello|Error 404|Not Found|Binary Soul)$/, 'terminal'],
  [/^(Devil|Infernal|Hell|Exact Hell|Exact Devil)$/, 'horns'],
  [/^(Big Brother|Orwellian)$/, 'eye'], [/^(Orientation|Exact Orientation)$/, 'crosshair'],
  [/^(Full House|Contiguous Full House)$/, 'house'], [/^Homogeneous$/, 'bar'], [/^(Full Day)$/, 'clock'],
  [/^(Single|Two|Three|Four|Five|Six) Digits?$/, 'cells'], [/^(Firefly|Secret Agent|Hotbox|17776)$/, 'spark'],
  [/^(Millennium|Century|Epoch|Eon|Clean|Semi-.*|Quarter-Century|Three-Quarter Century)$/, 'ring'],
];
const BY_FAMILY: Record<string, string> = {
  Pairs: 'pair', 'Of A Kind': 'trio', Hopscotch: 'diag', Progression: 'diag', Monotonic: 'steps', Consecutive: 'chain',
  Calendar: 'calendar', Boat: 'house', 'Contiguous Run': 'bar', Palindrome: 'mirror', Repeat: 'echo',
  Jackpot: 'd7', Boob: 'd8', 'Nine Ending': 'd9', Nice: 'spark', Ultimeme: 'spark', Meaning: 'spark', Botanist: 'spark',
  'Sixty Seven': 'spark', 'Eighty Six': 'spark', Emergency: 'cross', 'Void Depth': 'ring', Equilibrium: 'balance',
  Bookends: 'brackets', Peak: 'peak', Hills: 'wave', Duality: 'duo', Pi: 'spiral', E: 'spiral', Tau: 'spiral', Power: 'power',
};

/** The glyph for a badge, or undefined if no rule covers it. */
export function glyphId(name: string, family: string | null): string | undefined {
  const el = ELEMENTS.exec(name); if (el) return 'd' + el[2];
  const w = NUMBER_WORDS.indexOf(name); if (w >= 0 && family === 'Single Digit') return 'd' + w;
  for (const [re, id] of BY_NAME) if (re.test(name)) return id;
  return family ? BY_FAMILY[family] : undefined;
}
