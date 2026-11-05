# Million Fathoms

An offline arcade number game. Roll a number from 0 to 1,000,000, earn badges for its patterns, and watch the sounding lead sink through seven ocean zones.

Unofficial fan game based on RNGdle's scoring. It has no connection to RNGdle.

**Play:** open `dist/million-fathoms.html` in any browser. It's one self-contained file with no network requests.

## Layout

Built with React, TypeScript and Vite, bundled into a single HTML file by `vite-plugin-singlefile`.

- `src/game/rules.js`: the 233 badge rules (plain JS, unchanged from the verified original)
- `src/game/score.ts`: scoring, tiers, depth and the score distribution
- `src/game/controller.ts`: the roll loop, saving, auto-roll and dives
- `src/game/data.json`: EP values, badge counts and the score distribution
- `src/engine/`: the canvas scene, reels, particles and Web Audio sound
- `src/ui/`: React components
- `src/styles.css`, `src/fonts.css`: styling and embedded fonts
- `test_ui.js`: Playwright playthrough on desktop and phone
- `tests/rules_snapshot.ts`: checks every rule and every roll's score against `tests/baseline.json`, recorded from the original game
- `test_rules.js`, `export_data.py`: checks against the Python reference scorer (not included)

## Build and test

```bash
npm install
npx playwright install chromium
npm run build
npm run test:rules
SHOTS=shots npm run test:ui
```
