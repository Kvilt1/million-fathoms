import type { SaveState } from './save';

export interface BadgeSet { name: string; desc: string; members: string[] }
export const SETS: BadgeSet[] = [
  ['The Casino', 'Poker hands and dice values.', 'Royal Flush|Straight Flush|Straight|Five of a Kind|Contiguous Three Pair|Contiguous Full House|Three Pair|Four of a Kind|Low Ball|High Roller|Contiguous Two Pair|Flush|Contiguous Trips|Blackjack|Full House|Snake Eyes|Three of a Kind|Two Pair|Contiguous Pair|Pair'],
  ['Lucky Sevens', 'Anything built around 7.', 'Exact Jackpot|Jackpot Six|Power of Seven|Jackpot Five|Jackpot Four|Jackpot|Lucky Seven (Divisible)|Lucky Seven'],
  ['Deep Space', 'Perfect powers and named number classes.', '10th Power|9th Power|8th Power|Ouroboros|7th Power|Power of Seven|Power of Five|Factorial|6th Power|Power of Three|5th Power|Power of Two|Fibonacci Number|4th Power|Spy Number|3rd Power|Pronic Number|2nd Power|Harshad Number'],
  ['Sacred Geometry', 'How the digits are arranged.', 'Cascade|Waterfall|Strobogrammatic|Zipper|Ascension|Framed Quad|Decay|Echo|Firefly|Palindrome|Turtle|Steps|Slopes|Paired Bookends|Bookends|Mirror Bookends|Mountain|Valley|Mini Echo|Alternator|Pocket Mirror|Balanced|Rhyme|Mesa|Canyon|Sandwich|Hills|Mini Scramble|Dunes'],
  ['Meme Culture', 'Internet numbers and their exact versions.', 'Exact Nice|Very Very Nice|Exact Botanist|Hotbox|Exact Devil|Exact Leet|Exact Meaning|Universal Answer|Exact Six-Seven|Brainrot|Orwellian|Not Found|Infernal|17776|Funny Number|Funny Numbers|Very Nice|Deeper Meaning|6767|Leet|Big Brother|Secret Agent|Devil|Botanist|Nice|Meaning of Life|Six-Seven'],
  ['Calculator Words', 'Digits that spell something sideways.', 'Exact Hell|Exact Boob|Hello|Hell'],
  ['The Void', 'Zeroes and the round numbers they make.', 'Deep Void (5)|Eon|Epoch|Deep Void (4)|Millennium|Deep Void (3)|Century|Deep Void|Clean|Ghost|Void'],
  ['Flatliners', 'Long straight runs of one digit.', 'Contiguous Sixes|Homogeneous|Contiguous Fives|Contiguous Quads|Contiguous Trips'],
  ['Exact Numbers', 'Rolls where the number itself is the joke.', 'Exact Nice|Exact Botanist|Exact Devil|Exact Emergency|Exact Leet|Exact Meaning|Exact Jackpot|Exact Hell|Exact Six-Seven|Exact Eighty-Six|Exact Orientation|Exact Calendar|Very Very Nice|Hotbox|Mayday|Universal Answer|Brainrot|Groundhog Day|Orwellian|Not Found|Infernal|17776|Full Day|Exact Boob|Always|Funny Number|Tau|Golden Ratio'],
  ['Periodic Table', 'One digit each, named by atomic number.', 'Hydrogen (1)|Helium (2)|Lithium (3)|Beryllium (4)|Boron (5)|Carbon (6)|Nitrogen (7)|Oxygen (8)|Fluorine (9)'],
  ['Digit Counts', 'Purely about length.', 'Single Digit|Two Digits|Three Digits|Four Digits|Five Digits|Six Digits'],
  ['Mathematical Constants', 'Pi, e, tau and the golden ratio.', "Tau|Golden Ratio|Pi|Euler's Number|Tau Slice (5)|Fibonacci Number|Tau Slice (4)|Prime Number"],
  ['Basic Physics', 'Even or odd, light or heavy, ends compared.', 'Colossal|Heavy|Feather|Equilibrium|Grounded|Even|Odd|Liftoff'],
  ['Counting', 'Neighbouring numbers written inside the roll.', '4 Consecutive Numbers|4 Consecutive Numbers (Contains)|4 Consecutive Numbers (Scrambled)|3 Consecutive Numbers|3 Consecutive Numbers (Scrambled)|Crescendo|3 Consecutive Numbers (Contains)|2 Consecutive Numbers|Metronome|Equation|2 Consecutive Numbers (Contains)|2 Consecutive Numbers (Nearby)'],
  ['Emergency Services', 'The numbers you dial when something is wrong.', 'Exact Emergency|Mayday|Not Found|Error 404|Emergency'],
  ['On the Clock', 'Dates and times hiding in digits.', 'Exact Calendar|Groundhog Day|Full Day|Always|Calendar'],
].map(([name, desc, list]) => ({ name, desc, members: list.split('|') }));
export const setDone = (S: SaveState, s: BadgeSet) => s.members.filter(m => S.badges[m]).length;
export const setsComplete = (S: SaveState) => SETS.filter(s => setDone(S, s) === s.members.length).length;
