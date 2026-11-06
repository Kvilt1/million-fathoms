# Million Fathoms

An offline arcade number game. Roll a number from 0 to 1,000,000, earn badges for its patterns, and watch the sounding lead sink through seven ocean zones.

Unofficial fan game based on RNGdle's scoring. It has no connection to RNGdle.

**Play online:** https://kvilt1.github.io/million-fathoms/

**Play offline:** open `dist/million-fathoms.html` in any browser. It's one self-contained file with no network requests.

Every push to `main` rebuilds the game and publishes it to GitHub Pages (`.github/workflows/pages.yml`).

## Layout

Built with React, TypeScript and Vite, bundled into a single HTML file by `vite-plugin-singlefile`.

- `src/game/rules.js`: the 233 badge rules (plain JS, unchanged from the verified original)
- `src/game/score.ts`: scoring, tiers, depth and the score distribution
- `src/game/controller.ts`: the roll loop, the badge-by-badge reveal, and saving
- `src/game/timing.ts`: every roll and reveal timing, in one place to tune
- `src/game/highlights.ts`: which digits light up for each badge during the reveal (separate from the rules, so scoring can't change)
- `src/game/glyphs.ts`: the 8x8 pixel glyph beside each badge, and which glyph each badge gets
- `src/game/data.json`: EP values, badge counts and the score distribution
- `src/engine/`: the canvas scene, reels, particles and Web Audio sound
- `src/ui/`: React components
- `src/styles.css`, `src/fonts.css`: styling and the embedded VT323 font
- `docs/krillion-style-guide.md`: the visual reference for the look, colours, type and sound
- `test_ui.js`: Playwright playthrough on desktop and phone
- `tests/rules_snapshot.ts`: checks every rule and every roll's score against `tests/baseline.json`, recorded from the original game
- `tests/highlights_test.ts`: runs every highlight function on sample numbers and on every earned badge of all 1,000,001 rolls
- `test_rules.js`, `export_data.py`: checks against the Python reference scorer (not included)

## Build and test

```bash
npm install
npx playwright install chromium
npm run build
npm run test:rules
npm run test:highlights
npm run test:glyphs
SHOTS=shots npm run test:ui
```
