# Million Fathoms: project context

Paste this into a fresh chat to brainstorm new features, themes and ideas. It describes what the game is today, how it plays, what is fixed, and what is open to change.

---

## 1. What it is

**Million Fathoms** is a single-player, offline arcade number game. One button rolls a random whole number from **0 to 1,000,000**. Digit patterns and number properties in the roll earn **badges**. Each badge pays **EP** (a rarity score). The total EP decides how rare the roll was and how deep a **sounding lead** sinks through **seven ocean zones**, from the surface film to the Hadal Trench (the Challenger Deep, 5,960 fathoms).

It is an **unofficial fan game** based on the scoring of the daily web game **RNGdle**. It has no connection to RNGdle. Its look and feel borrow *techniques* (not assets, names or copy) from a style guide for a pixel-art ocean game called Krillion.

In one sentence: **a slot-machine-style number lottery where the thrill is in the reveal. Reels spin, badges land one at a time, a counter climbs, and a lead sinks into the deep.**

### Technical shape
- React 19 + TypeScript + Vite. Built into **one self-contained HTML file** (`dist/million-fathoms.html`) that makes **zero network requests**. Scripts, CSS, the VT323 font and all data are inlined.
- Runs by opening the file in any browser, or on GitHub Pages: https://kvilt1.github.io/million-fathoms/
- No backend, no accounts, no leaderboards. Progress lives in the browser's localStorage.
- All sound and music is **synthesised live with Web Audio**. There are no audio files, images or sprites. Graphics are canvas and CSS, and badge icons are 8x8 pixel glyphs drawn as SVG.

---

## 2. The core loop

1. Press **Roll** (or Space/Enter). A six-digit number is drawn from the browser's secure random generator. Every number from 0 to 1,000,000 is equally likely, and nothing the player does changes the odds.
2. **Reels** spin and stop digit by digit, with tension building.
3. Badges are **revealed one at a time**. For each, the digits it matches light up on the reels, its pixel glyph and name appear, its EP is added to a climbing counter, and the lead sinks further. Rarer badges get bigger reactions.
4. The roll lands in a **tier** (Trash to Mythic) with a stamp, a screen reaction and a sound. The roll is logged and any new badges are added to the collection.
5. A **Mythic** roll (top 1%) gets a full-screen "Hadal Trench" finish card.
6. Roll again. The loop is meant to be addictive and quick. There are two speeds: **Normal** (the full show) and **Fast**.

Everything is a **practice or collection** experience. A roll is never "won" or "lost", and there is no failure state.

---

## 3. Scoring system (fixed: do not change when brainstorming unless deliberately redesigning)

- **233 badge rules.** Each is a pure function of the number, for example "Palindrome", "Contains exactly one 0", "Is a Fibonacci number", "Digits form 3 consecutive numbers", "Is a perfect 5th power".
- **EP = 100 / the badge's probability.** A 1-in-10 badge pays about 1,000 EP. A one-in-a-million badge pays about 100 million. On average every badge pays 100 EP per roll. Rare badges just pay it all at once.
- **Families.** 168 badges sit in 39 families of related patterns (for example Pairs, Hills/Dunes, Hopscotch, Of A Kind, Progression). **Within a family only the highest-EP badge pays.** The rest still go into the collection and show as "outranked". The other 65 badges are standalone and always pay.
- **Total EP** for the roll is the sum of paid badges.
- **Tier** comes from total EP thresholds, and each tier maps to an ocean zone:

| Tier | Zone | EP from | Share of rolls |
|---|---|---|---|
| Trash | Surface Film | 0 | Bottom 1% |
| Common | Sunlight Zone | 2,087 | Bottom 50% |
| Uncommon | Twilight Zone | 5,802 | Top 50 to 25% |
| Rare | Midnight Zone | 10,074 | Top 25 to 10% |
| Epic | Bathyal Slope | 22,293 | Top 10 to 5% |
| Anomaly | Abyssal Plain | 35,469 | Top 5 to 1% |
| Mythic | Hadal Trench | 162,292 | Top 1% |

- **Depth** is a log-scale interpolation of EP between zone anchors. The deepest roll in the game reaches **5,960 fathoms**.
- **Percentile rank** comes from a precomputed distribution of all 1,000,001 rolls ("this roll beat X% of all possible rolls").
- **Badges also have their own rarity tiers** (by EP): Common, Uncommon, Rare, Epic, Anomaly, Mythic, shown as the badge's colour.
- The scoring was verified against the original game on all 1,000,001 rolls and is protected by tests. Five reference scores must never change, for example 142857 = 8131 EP and 1000000 = 131,081,274 EP.

### What the 233 badges look like (examples by flavour)
- **Digit structure:** Pair, Two Pair, Three/Four/Five of a Kind, Full House, Homogeneous (all the same digit), Heterogeneous (no repeats), Quartet, Palindrome, Strobogrammatic (reads the same upside-down), Mirror Bookends, Zipper, Echo, Hopscotch (5x5), Sandwich, Framed Pair/Triple/Quad.
- **Shape and motion:** Hills, Dunes, Mountain, Valley, Mesa, Canyon, Slopes, Steps, Ascension, Decay, Cascade, Waterfall, Crescendo, Straight, Liftoff, Grounded.
- **Counting runs:** 2/3/4 Consecutive Numbers (exact, contains, nearby, scrambled), Sequence (3/4/6), Mini Scramble.
- **Zeros and round numbers:** Void (no zeros), Ghost (exactly one zero), Deep Void (3/4/5), Clean, Semi-Clean, Century, Millennium, Epoch, Eon and their "Semi-" versions.
- **Maths and number theory:** Prime, Fibonacci, Factorial, Pronic, Harshad, Spy Number, Ouroboros, Tau/Golden Ratio/Pi/E slices (digits of the constants), perfect powers 2nd to 19th, Powers of 2/3/5/7, Equation (digits split into a true sum, difference, product or quotient), Divisible by Three, Lucky Seven (Divisible).
- **Poker and dice:** Royal Flush, Straight Flush, Flush, Blackjack, Snake Eyes, Low Ball, High Roller, Jackpot (Four/Five/Six).
- **Internet and pop-culture numbers:** Nice (69), Very Nice, 6767, Six-Seven, Leet (1337), 8008, 58008, 80085, Hell (calculator words), Hello, Devil (666), Meaning of Life (42), Botanist, Emergency (911), Error 404, Orientation, Big Brother/Orwellian, Brainrot, Funny Number(s), Binary Soul.
- **Time:** Calendar, Always, Groundhog Day, Full Day.
- **Single-element chemistry:** Hydrogen (1) to Fluorine (9) for rolls with exactly one of that digit.
- **"Exact" jackpots:** about 25 one-in-a-million badges where the roll is exactly a meme number (Exact Nice, Exact Devil, Exact Leet, Exact Meaning, Exact Hell, "17776", "One Million", and so on). Each pays 100,000,100 EP, the maximum.

The lowest-paying badges (Six Digits, Pair, Neighbors, Even/Odd, Liftoff) pay 100 to 250 EP. The mid range is a few thousand EP. The top is 25M to 100M+ EP.

---

## 4. Feature inventory (everything that exists today)

### Main screen
- **Roll console.** Six animated reels, a large EP counter, a tier stamp, a meta line (rank/percentile), and a big **Roll** button (Space/Enter).
- **Speed toggle:** Normal (full show) or Fast. Keys 1 and 2 switch.
- **Header stats:** Rolls, Best EP, Lifetime EP, Badges found (x/233). A sound mute button (M).
- **Badge haul panel.** The list of badges earned on this roll, with EP, rarity colour, pixel glyph, and "outranked" badges shown separately. Before the first roll it shows a **depth chart ladder** of the tiers and their EP thresholds.
- **Canvas scene.** A dark "void" ocean world with tier-tinted grids. The camera descends through the zones as EP builds, with zone-name flashes, a sounding lead, particles, screen shake and a whiteout flash on big hits.
- **Mythic finish card.** Full-screen "Mythic roll: Hadal Trench" card with the number and its details; dismiss with "Keep diving".
- **Toasts** for unlocks and milestones, and an ARIA live region for screen readers.

### Drawer (bottom dock tabs: Log, Badges, Sets, Check, How, Settings)
- **Log.** Stats cards (rolls, lifetime EP, average EP, best roll, rarest badge found), a bar chart of how many rolls landed in each tier, and a list of recent rolls. Each roll can be replayed with **"Watch this dive"**.
- **Badges (Codex).** All 233 badges as a searchable, filterable collection grid. Found and unfound badges are shown, with each badge's description, EP, odds/count and glyph.
- **Sets.** 16 themed collections of badges with completion tracking: The Casino, Lucky Sevens, Deep Space, Sacred Geometry, Meme Culture, Calculator Words, The Void, Flatliners, Exact Numbers, Periodic Table, Digit Counts, Mathematical Constants, Basic Physics, Counting, Emergency Services, On the Clock. The dock shows "sets complete x/16".
- **Check.** Type any number from 0 to 1,000,000 (or press Random) to score it without rolling. It shows full breakdown, tier, depth and percentile, and can replay the reveal.
- **How.** Rules explainer: the roll, badges, families, rarity and depth ladder, badge rarity bands, and the fan-game disclaimer.
- **Settings.** Sound on/off, SFX volume, Music on/off, Music volume, "Screen shake and particles" toggle, and Reset progress (with a confirmation).

### Sound and music
- **Live-synthesised SFX** (sine/triangle tones, filtered noise sweeps, notes in C and G major). Downward glides mean "deeper"; upward glides mean "success". Each tier and each reveal has its own sounds.
- **"Loaded Grid", an adaptive soundtrack:** 112 BPM, A natural minor, progression Am to Am to F to Em (one chord per bar), always running.
  - A "heat" meter builds with every roll and cools when idle. It drives four energy levels: **L0 idle, L1 groove, L2 hook, L3 drop**. Level changes land on 4-bar phrase boundaries.
  - **Tier moments** cut in on the next downbeat: Trash power-down, Rare hook, Epic drop, Anomaly break-then-drop, Mythic "Hadal" 16-bar drop.
  - The player's **best tier unlocks extra musical material**.
  - **Depth adds pressure** (drone, reverb, "clank" density) rather than energy.
  - SFX are **chord-aware and quantised to the beat** when music is on, and echo through a tempo-synced delay.
  - Music stops when the tab is hidden.

### Progression and persistence
- Saved to localStorage: roll count, lifetime EP, best roll, per-tier roll counts, badges found, roll log, settings.
- No daily limit, no currency, no unlocks beyond badge/set collection and the best-tier music unlocks.

### Accessibility and performance
- Respects `prefers-reduced-motion`. Shake, particles, glow pulses, scan line and canvas drift are off, the camera jumps, and the reels snap to their digits.
- A separate "Screen shake and particles" toggle.
- Keyboard-first: Space/Enter roll, M mute, B badges, 1/2 speed, Esc closes panels. Responsive for phone and desktop. Screen-reader live announcements.

### Not present (useful to know when brainstorming)
No daily challenge, streaks, multiplayer, sharing/export, leaderboards, achievements beyond sets, currency or shop, customisation or themes, tutorial, accounts, or cloud save. There are no fish, creatures or story elements. The ocean is purely a scoring metaphor and backdrop.

---

## 5. Look, feel and tone

- **Aesthetic:** CRT pixel arcade crossed with **Tron**. VT323 is the only font. The look is neon on abyss: near-black backgrounds, glowing grid lines, hard pixel-bevel box-shadows, **no rounded corners**. Scanline and chromatic-aberration touches.
- **Tier colours:** seven colours (Trash to Mythic) are defined once in CSS and used for UI, canvas, badges and glow. A rarer tier is a hotter colour and bigger effects.
- **Scene:** a dark void with tier-tinted grids, a sounding lead sinking on a line, zone labels, and a sense of vertical descent.
- **Voice:** dry, nerdy, deadpan. Microcopy is short, with ocean and oceanography flavour ("Reach the Hadal Trench and you're in the top 1% of all rolls", "Keep diving", "Watch this dive").
- **Audio mood:** a minor-key, synth-heavy electronic loop that gets denser and more intense the longer you roll, with big drops for big rolls.

---

## 6. Design principles to preserve

1. **Scoring is frozen.** Badge rules and EP values are verified against the original. Brainstormed features should *wrap around* scoring (new views, modes, rewards, presentation), not change it. Proposing a different scoring system is a separate, deliberate redesign.
2. **Offline and self-contained.** One HTML file, no network, no external assets. New features can't depend on a server unless that principle is dropped on purpose.
3. **Juice over complexity.** The fun is the reveal: sound, light, motion and escalation. Features should make rolls feel better or give each roll more meaning.
4. **Procedural everything.** Sound, music, graphics and glyphs are generated in code, so ideas that need pre-made art or audio assets are costlier than ideas that are procedural.
5. **Accessible by default.** New motion and flashing must respect reduced-motion and the effects toggle.
6. **Pixel, neon, VT323, no rounded corners.**
7. **Pure luck.** There is no player skill in the roll itself. Any depth must come from collection, meta-goals, presentation or modes around the roll, not from influencing the number.

---

## 7. Levers available for new features and themes

These are the existing building blocks a new idea can plug into.

- **The roll number** (0 to 1,000,000) and its digit string. Anything computable from it is a possible new badge or mechanic.
- **Badge metadata:** name, description, family, EP, count, rarity tier, pixel glyph (8x8), highlight pattern (which reel digits light up).
- **Tier and zone system:** 7 tiers/zones, each with a colour, depth range, stamp, sound and music moment. Zone names, colours and flavour are easy to re-skin.
- **Collections:** the "Sets" system (named groups of badges) is easy to extend with new sets, rewards and completion effects.
- **Reveal choreography:** timing per speed and tier, reel highlights, particles, shake, whiteout, zone flash.
- **Adaptive music:** heat, levels, tier moments, best-tier unlocks, depth pressure.
- **Stats and log:** per-roll history, tier distribution, lifetime EP, best roll.
- **Check tool:** score any number on demand, which is a base for puzzle or "design a roll" modes.
- **Theming surface:** the tier palette, the scene, the zone names and the copy are all centralised, so a **full re-theme** (for example space instead of ocean, or a cyberpunk city, a desert, a dungeon, a casino or an arcade cabinet) mostly means new zone names, tier colours, flavour text, scene visuals and music mood. The scoring stays identical.

---

## 8. What I want from brainstorming

Ideas welcome in these areas (please keep the principles in section 6 in mind and say when an idea would break one):

1. **New themes and re-skins:** alternate "worlds" that reuse the same scoring (zone names, tier colours, scene, microcopy, music mood, badge-set names).
2. **Meta-progression:** reasons to keep rolling beyond a high score, such as goals, milestones, titles, unlocks, collection rewards, "dive log" journalling.
3. **Game modes around the roll:** daily seed, challenge or target modes, limited-roll runs, "reach tier X in N rolls", puzzle modes using the Check tool, a "design the perfect number" mode.
4. **New badge ideas and sets:** more number patterns, themed families, special rare "event" badges, and new set themes with rewards.
5. **Juice and presentation:** new reveal moments, zone-specific visuals and creatures, sound and music additions, share cards, replays.
6. **Social and sharing (even offline):** export or share a dive as text or image, compare via codes, seeded rolls to share with friends.
7. **Quality-of-life and onboarding.**

For each idea, please give a short pitch, why it fits the game, a rough effort level (small, medium or large), and any principle it strains.
