# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Million Fathoms is an offline arcade number game and an unofficial fan game based on RNGdle's scoring. You roll a number from 0 to 1,000,000, the roll earns badges for its digit patterns, and the score sets how deep a sounding lead sinks through seven ocean zones. It's built with React 19, TypeScript and Vite. `vite-plugin-singlefile` bundles it into one self-contained HTML file that makes no network requests: scripts, CSS, the VT323 font and data are all inlined.

## Commands

```bash
npm install
npx playwright install chromium   # once, for the UI test
npm run dev                       # Vite dev server (entry: million-fathoms.html)
npm run build                     # tsc --noEmit, then vite build -> dist/million-fathoms.html
npm run test:rules                # every rule and every roll's score vs tests/baseline.json
npm run test:highlights           # digit highlights on samples and on all 1,000,001 rolls
npm run test:glyphs               # every badge maps to a valid 8x8 pixel glyph
SHOTS=shots npm run test:ui       # Playwright playthrough of the BUILT file (build first)
```

- There's no linter and no unit-test runner. Each test is a standalone script that prints `ok` or `FAIL` lines and exits non-zero on failure.
- To run part of the UI test, edit `test_ui.js`. It opens `file://dist/million-fathoms.html` with all non-file requests blocked, so it tests whatever was last built.
- `test_rules.js` and `export_data.py` compare against the Python reference scorer, which isn't in this repo. They won't run here.
- `dist/million-fathoms.html` is committed (`.gitignore` ignores everything else in `dist/`). Rebuild it whenever you change source.
- Every push to `main` deploys the build to GitHub Pages through `.github/workflows/pages.yml`.

## Architecture

**Scoring is frozen.** `src/game/rules.js` (the 233 badge rules, in plain JS with types in `rules.d.ts`) and the scoring in `src/game/score.ts` were checked against the original game on every roll. `tests/rules_snapshot.ts` compares FNV hashes of every rule's hits and every roll's total, tier, rank, depth and paid count against `tests/baseline.json`. Five protected scores must never change: 61287=4634, 142857=8131, 420420=100133055, 1000000=131081274, 403602=1759. Don't change rule logic, EP values (`data.json`), tier floors, or the depth anchors in `score.ts` unless the user explicitly asks to change scoring.

- Scoring: within a badge `family`, only the highest-EP badge pays and the others are "outranked". The total EP sets the tier (Trash to Mythic, by `TIERS[].floor`). It also sets the zone `u`, which runs from 0 to 7 on a log scale between EP anchors, and the depth in fathoms. `data.json` holds the EP and count for each badge, plus a base64 varint-encoded distribution of every roll's total, which `rollsBelow()` uses for percentile rank. `export_data.py` generates it.
- `src/game/glyphs.ts` holds the 8x8 pixel glyphs shown beside each badge (rendered as crisp SVG in the badge's tier colour) and `glyphId()`, which maps every badge to one by name, then by family. Badges have no emoji or icon field, and any new badge needs a match there (`test:glyphs` enforces it).
- `src/game/highlights.ts` decides which reel digits light up for each badge during the reveal. It's separate from the rules on purpose, so highlights can't affect scoring. Every badge needs an entry in `HIGHLIGHTS`, and `test:highlights` enforces that.

**State and rendering.** `src/game/controller.ts` is the game loop and holds all mutable state. React doesn't own the game state:
- `S` is the saved state (`save.ts`, localStorage key `million-fathoms-v1`, kept compatible with the original save shape). `V` is the view model React renders. `G` holds runtime flags (busy, skip, preview).
- To change the UI, mutate `V`/`S`, then call `emit()`. Components subscribe through `useGame()` (`useSyncExternalStore` on a version counter).
- The 60 fps parts skip React. The controller drives them imperatively: the canvas scene (`engine/scene.ts`), the particle canvas (`engine/fx.ts`), the reels (`engine/reels.ts`, which builds its own DOM inside a box React provides), and the EP counter (written straight to `#ep`). The controller also sets the CSS variable `--tier` and adds classes such as `shake` directly.
- `start()` (called once from `App`) creates the engines. `play(n)` runs a roll: spin the reels, reveal badges one at a time (Show/Fast speeds), then record, celebrate and notify. The menu offers only Normal (`show`) and Fast; there is no Auto or Instant. `RunSpeed` adds an internal `instant` that a hidden tab uses.
- `window.MF` exposes `play`, `scoreRoll`, `Sound`, `highlight`, `badgeMs`, `state` and `game`. `test_ui.js` depends on it, so keep it working.

**Timing.** Every roll and reveal duration lives in `src/game/timing.ts`, keyed by speed (`show` / `fast`, plus the internal `instant`) and tier. Tune timing there, and don't hard-code durations elsewhere. `test_ui.js` checks some reveal timing.

**Sound.** `engine/sound.ts` synthesises everything live with Web Audio and ships no audio files. It uses sine and triangle tones, filtered noise sweeps, and notes from C and G major. Downward glides mean deeper, upward glides mean success. The AudioContext starts lazily on a user gesture (`Sound.init()`).

**Style.** The look follows `docs/krillion-style-guide.md` crossed with Tron: VT323 as the only font, neon on abyss, pixel-bevel box-shadows with no border-radius, and a dark void scene with tier-tinted grids. Tier colours are defined once as `--t0` to `--t6` in `src/styles.css`. `readTierColors()` copies them into `TIERS[].color` at startup for canvas and JS use, so change a tier colour in CSS only. Use the guide for techniques only, never Krillion's assets, names or copy.

**Accessibility modes.** `prefers-reduced-motion` (`reduced` in the controller) turns off shake, particles, glow pulses, the scan line and canvas drift, and the camera jumps instead of gliding. The reels snap to their digits instead of scrolling but keep their rhythm and sounds. The "Screen shake and particles" setting (`opts.effects`) turns off only shake and particles. New motion has to respect both.
