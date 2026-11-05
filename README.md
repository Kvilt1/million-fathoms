# Million Fathoms

An offline arcade number game. Roll a number from 0 to 1,000,000, earn badges for its patterns, and watch the sounding lead sink through seven ocean zones.

Unofficial fan game based on RNGdle's scoring. It has no connection to RNGdle.

**Play:** open `dist/million-fathoms.html` in any browser. It's one self-contained file with no network requests.

## Layout

- `src/rules.js`: the 233 badge rules
- `src/app.js`: game logic, scene, sound and panels
- `src/style.css`, `src/body.html`: styling and markup
- `src/data.json`: EP values, badge counts and the score distribution
- `build.py`: bundles everything into `dist/million-fathoms.html`
- `test_ui.js`: Playwright playthrough on desktop and phone
- `test_rules.js`, `export_data.py`: checks against the Python reference scorer (not included)

## Build and test

```bash
npm install @fontsource/tilt-neon @fontsource/baloo-2 @fontsource/bowlby-one
python3 build.py
mkdir -p shots && SHOTS=shots node test_ui.js
```
