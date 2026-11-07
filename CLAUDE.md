# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Million Fathoms is an offline arcade number game and an unofficial fan game based on RNGdle's scoring. You roll a number from 0 to 1,000,000, the roll earns badges for its digit patterns, and the score sets how deep a sounding lead sinks through seven ocean zones. That's **Classic** mode. **Descent** mode starts with one reel, turns badge EP into XP, and adds a reel every fifth level (see below). It's built with React 19, TypeScript and Vite. `vite-plugin-singlefile` bundles it into one self-contained HTML file that makes no network requests: scripts, CSS, the VT323 font and data are all inlined.

## Commands

```bash
npm install
npx playwright install chromium   # once, for the UI test
npm run dev                       # Vite dev server (entry: million-fathoms.html)
npm run build                     # tsc --noEmit, then vite build -> dist/million-fathoms.html
npm run test:rules                # every rule and every roll's score vs tests/baseline.json
npm run test:highlights           # digit highlights on samples and on all 1,000,001 rolls
npm run test:glyphs               # every badge maps to a valid 8x8 pixel glyph
npm run test:music                # soundtrack patterns, key, progression and director scripts
npm run test:descent              # Descent counts, depth 6 = Classic, levels, save (FULL=1: all rolls at depth 6)
npm run data:descent              # rebuild src/descent/data.json from the rules (~40 s)
SHOTS=shots npm run test:ui       # Playwright playthrough of the BUILT file (build first)
```

- There's no linter and no unit-test runner. Each test is a standalone script that prints `ok` or `FAIL` lines and exits non-zero on failure.
- To run part of the UI test, edit `test_ui.js`. `CHROMIUM=/path/to/chrome` makes it launch that browser binary (e.g. `/opt/pw-browsers/chromium` when Playwright's own download doesn't match). It opens `file://dist/million-fathoms.html` with all non-file requests blocked, so it tests whatever was last built.
- `test_rules.js` and `export_data.py` compare against the Python reference scorer, which isn't in this repo. They won't run here.
- `dist/million-fathoms.html` is committed (`.gitignore` ignores everything else in `dist/`). Rebuild it whenever you change source.
- Every push to `main` deploys the build to GitHub Pages through `.github/workflows/pages.yml`.

## Architecture

**Scoring is frozen.** `src/game/rules.js` (the 233 badge rules, in plain JS with types in `rules.d.ts`) and the scoring in `src/game/score.ts` were checked against the original game on every roll. `tests/rules_snapshot.ts` compares FNV hashes of every rule's hits and every roll's total, tier, rank, depth and paid count against `tests/baseline.json`. Five protected scores must never change: 61287=4634, 142857=8131, 420420=100133055, 1000000=131081274, 403602=1759. Don't change rule logic, EP values (`data.json`), tier floors, or the depth anchors in `score.ts` unless the user explicitly asks to change scoring.

- Scoring: within a badge `family`, only the highest-EP badge pays and the others are "outranked". The total EP sets the tier (Trash to Mythic, by `TIERS[].floor`). It also sets the zone `u`, which runs from 0 to 7 on a log scale between EP anchors, and the depth in fathoms. `data.json` holds the EP and count for each badge, plus a base64 varint-encoded distribution of every roll's total, which `rollsBelow()` uses for percentile rank. `export_data.py` generates it.
- `src/game/glyphs.ts` holds the 8x8 pixel glyphs shown beside each badge (rendered as crisp SVG in the badge's tier colour) and `glyphId()`, which maps every badge to one by name, then by family. Badges have no emoji or icon field, and any new badge needs a match there (`test:glyphs` enforces it).
- `src/game/highlights.ts` decides which reel digits light up for each badge during the reveal. It's separate from the rules on purpose, so highlights can't affect scoring. Every badge needs an entry in `HIGHLIGHTS`, and `test:highlights` enforces that.

**Descent mode** (`src/descent/`) reuses the rules and the family rule unchanged and never edits Classic's files or save.
- Depth d (1 to 6) is the number of reels. Depths 1 to 5 roll 0 to 10^d − 1; depth 6 rolls Classic's 0 to 1,000,000 and shows a seventh, dimmed carry reel. The rules score `String(n)` with no padding, exactly as in Classic, so 7 at depth 3 is "7" (Single Digit), and the reels dim the leading zeros so highlights stay aligned.
- `data.json` (built by `scripts/descent-data.ts`) holds count_d and EP_d = round(100 × size / count_d) for every badge at every depth, plus each depth's total distribution and median/mean. Depth 6 copies Classic's EP table, which pays Power of Seven and Power of Five slightly off the formula, so depth 6 scores every roll exactly like Classic; the script and `test:descent` check that. Rerun `data:descent` if the rules or Classic EP ever change.
- `score.ts`: `scoreAt(n, d)` returns Classic's `Result` shape plus `d`. Tiers come from the roll's percentile within the depth, cut like Classic's floors (depth 6 reproduces them). Badges with count_d = 0 are "deeper".
- `pacing.ts` is the only place for pacing numbers. `levels.ts` builds 30 levels from it (5 per depth, requirement = target rolls × median EP per roll); `gain()` returns chained level events, a `digit` event on leaving levels 5, 10, 15, 20 and 25, and `max` after level 30. Over many rolls EP averages toward the mean, so levels clear faster than their target; the dev Level table (`#dev` in the URL, or the dev server) shows targets, rolls at the mean and a simulated median.
- `save.ts`: key `million-fathoms-descent-v1` (depth, level, XP, rolls, best per depth, badges found, last roll); the chosen mode is under `million-fathoms-mode`. Settings (`S.opts`) are shared with Classic.
- The controller branches on `V.mode`: `play()` scores with `scoreAt`, the reveal takes per-mode `RevealRules`, and `finishDescent()`/`climb()` animate the EP into the bar and play each level-up and digit-up (timings in `DESCENT` in `timing.ts`). `rest()` draws the resting console for either mode. `window.MF.descent` exposes `scoreAt`, `setMode`, `jump(level, into)`, `levels` and `state` for tests.

**State and rendering.** `src/game/controller.ts` is the game loop and holds all mutable state. React doesn't own the game state:
- `S` is the saved state (`save.ts`, localStorage key `million-fathoms-v1`, kept compatible with the original save shape). `V` is the view model React renders. `G` holds runtime flags (busy, skip, preview).
- To change the UI, mutate `V`/`S`, then call `emit()`. Components subscribe through `useGame()` (`useSyncExternalStore` on a version counter).
- The 60 fps parts skip React. The controller drives them imperatively: the canvas scene (`engine/scene.ts`), the particle canvas (`engine/fx.ts`), the reels (`engine/reels.ts`, which builds its own DOM inside a box React provides), and the EP counter (written straight to `#ep`). The controller also sets the CSS variable `--tier` and adds classes such as `shake` directly.
- `start()` (called once from `App`) creates the engines. `play(n)` runs a roll: spin the reels, reveal badges one at a time (Show/Fast speeds), then record, celebrate and notify. The menu offers only Normal (`show`) and Fast; there is no Auto or Instant. `RunSpeed` adds an internal `instant` that a hidden tab uses.
- `window.MF` exposes `play`, `scoreRoll`, `Sound`, `highlight`, `badgeMs`, `state`, `game` and `descent`. `test_ui.js` depends on it, so keep it working.

**Timing.** Every roll and reveal duration lives in `src/game/timing.ts` (music timings live in `engine/music/score.ts`), keyed by speed (`show` / `fast`, plus the internal `instant`) and tier. Tune timing there, and don't hard-code durations elsewhere. `test_ui.js` checks some reveal timing.

**Sound.** `engine/sound.ts` synthesises everything live with Web Audio and ships no audio files. It owns the AudioContext, the master compressor and the noise buffer, and starts lazily on a user gesture (`Sound.init()`). The effects use sine and triangle tones, filtered noise sweeps, and notes from C and G major. Downward glides mean deeper, upward glides mean success.

**Music.** `engine/music/` is "Loaded Grid", an adaptive soundtrack at 112 BPM in A natural minor with the progression Am Am F Em, one chord per bar, always running. `Sound.init()` creates it from the same context, and it's exposed as `Sound.music`.
- `score.ts` holds the pure data: tempo, progression, scale helpers, the 16-step patterns, `GAIN` (the approved draft's Strudel levels) with the measured `MIX_DB` trims, the `LEVELS`, `UNLOCKS`, `HEAT` and `MOMENTS` tables, and the music timings.
- `director.ts` is the pure state machine. `reduce(state, MusicEvent, nextBar)` handles cues, `barTick()` advances a bar, and `targets(state, bar)` gives each layer's level. Heat (0 to 1) builds with every roll and cools when idle, and it sets the level: L0 idle, L1 groove, L2 hook, L3 drop. The level changes only on 4-bar phrase boundaries. Tier moments (Trash power-down up to the Mythic Hadal drop) cut in on the next downbeat. `S.best.tier` unlocks extra material. Depth sets pressure (drone, reverb, clank density), not energy.
- `clock.ts` is a lookahead scheduler on `ac.currentTime`: a 25 ms interval schedules the next 0.12 s. `voices.ts` builds one-shot nodes that disconnect themselves when they end. `fx.ts` holds the buses (muffle, glass, gate, duck, fade, music volume), the generated-IR reverb and the dotted-eighth delay. `index.ts` is `createMusic()` with `start/stop/cue/at/pitch/chord/duck/state`.
- The controller sends `Sound.music?.cue(...)` for press, skip, result, unlocks, drawer, finish and reset. `sound.ts` sends tense, reelsStopped, badge, tierUp and depth. Hidden-tab `instant` rolls send nothing, and the music stops while the page is hidden.
- **SFX are chord-aware and quantized when music is on.** Each effect takes its pitch from `music.pitch()` (the chord sounding at that moment), and the melodic ones land on `music.at('16n' | '4n')` and echo through the tempo delay. When music is off, every effect sounds exactly as it did before. Tune the music in `score.ts` or `director.ts`, and keep `test:music` passing.

**Settings.** `S.opts` holds `sound`, `vol`, `ambient`, `musicVol`, `speed` and `effects`. `ambient` is the "Music" switch (`#oAmb`) and keeps its old name for save compatibility, and `musicVol` (`#oMusVol`, default 0.6) is the music volume. The M key and the Sound toggle mute everything. Reduced motion and the effects option don't touch the music.

**Style.** The look follows `docs/krillion-style-guide.md` crossed with Tron: VT323 as the only font, neon on abyss, pixel-bevel box-shadows with no border-radius, and a dark void scene with tier-tinted grids. Tier colours are defined once as `--t0` to `--t6` in `src/styles.css`. `readTierColors()` copies them into `TIERS[].color` at startup for canvas and JS use, so change a tier colour in CSS only. Use the guide for techniques only, never Krillion's assets, names or copy.

**Accessibility modes.** `prefers-reduced-motion` (`reduced` in the controller) turns off shake, particles, glow pulses, the scan line and canvas drift, and the camera jumps instead of gliding. The reels snap to their digits instead of scrolling but keep their rhythm and sounds. The "Screen shake and particles" setting (`opts.effects`) turns off only shake and particles. New motion has to respect both.
