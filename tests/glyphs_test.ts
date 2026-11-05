/* Checks the badge pictures (npm run test:glyphs):
   - every glyph is an 8x8 grid of '#' and '.', with at least one lit pixel;
   - every badge resolves to a glyph that exists;
   - no glyph is left unused. */
import { BADGES } from '../src/game/rules.js';
import { GLYPHS, glyphId } from '../src/game/glyphs';

const fails: string[] = [];
const fail = (msg: string) => { console.log('  FAIL', msg); fails.push(msg); };

for (const [id, rows] of Object.entries(GLYPHS)) {
  if (rows.length !== 8 || rows.some(r => !/^[#.]{8}$/.test(r))) fail(`glyph ${id} is not an 8x8 grid of # and .`);
  else if (!rows.some(r => r.includes('#'))) fail(`glyph ${id} is empty`);
}
const used = new Map<string, number>();
for (const b of BADGES) {
  const id = glyphId(b.name, b.family);
  if (!id) fail(`no glyph for ${b.name} (${b.family})`);
  else if (!GLYPHS[id]) fail(`${b.name} maps to unknown glyph ${id}`);
  else used.set(id, (used.get(id) || 0) + 1);
}
for (const id of Object.keys(GLYPHS)) if (!used.has(id)) fail(`glyph ${id} is not used by any badge`);
console.log(`${BADGES.length} badges, ${Object.keys(GLYPHS).length} glyphs`);
console.log([...used].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' '));
if (fails.length) { console.log(`FAIL: ${fails.length} problems`); process.exit(1); }
console.log('ok');
