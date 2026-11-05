// Plays the built offline file in a real browser with the network blocked.
// Run: npm run build && SHOTS=shots node test_ui.js
import { chromium, devices } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
const FILE = 'file://' + path.resolve('dist/million-fathoms.html');
const OUT = process.env.SHOTS || 'shots';
fs.mkdirSync(OUT, { recursive: true });
const fails = [];
const expect = (ok, what) => { console.log(ok ? '  ok  ' : '  FAIL', what); if (!ok) fails.push(what); };

(async () => {
  const b = await chromium.launch();
  const errors = [], external = [];
  async function page(opts, seed) {
    const ctx = await b.newContext(opts); const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(String(e)));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await ctx.route('**/*', r => { const u = r.request().url(); if (u.startsWith('file:') || u.startsWith('data:')) return r.continue(); external.push(u); return r.abort(); });
    if (seed) await ctx.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('million-fathoms-v1', s); sessionStorage.setItem('seeded', '1'); } }, seed);
    await p.goto(FILE); await p.waitForTimeout(700); return p;
  }
  // A roll that ends on a card (Mythic or end of dive) is closed before carrying on.
  const settle = async p => { await p.waitForFunction(() => !MF.game.busy, null, { timeout: 30000 }); await p.waitForTimeout(150); if (await p.isVisible('#fClose')) await p.click('#fClose'); };

  const p = await page({ viewport: { width: 1360, height: 820 } });
  await p.screenshot({ path: `${OUT}/1-idle.png` });
  // scoring inside the page matches published values
  const check = await p.evaluate(() => [61287, 142857, 1000000, 420420, 403602, 1, 0].map(n => { const r = MF.scoreRoll(n); return [n, r.total, r.tier, r.earned.length, r.paid.length, r.fm, +r.pct.toFixed(4)]; }));
  console.log(JSON.stringify(check));
  const want = { 61287: 4634, 142857: 8131, 420420: 100133055, 1000000: 131081274, 403602: 1759 };
  for (const [n, total] of check) if (want[n] !== undefined) expect(total === want[n], `${n} scores ${total.toLocaleString('en-US')} EP`);
  expect(JSON.stringify(check) === '[[61287,4634,1,13,13,88,34.1851],[142857,8131,2,17,16,377,68.4496],[1000000,131081274,6,39,22,5877,99.9997],[420420,100133055,6,21,17,5772,99.997],[403602,1759,0,8,8,2,0],[1,162575449,6,31,17,5960,99.9999],[0,139927162,6,29,16,5902,99.9998]]', 'tier, badge counts, depth and rank match the original build');
  // full speed roll with Space
  await p.keyboard.press('Space'); await p.waitForTimeout(1250);
  await p.screenshot({ path: `${OUT}/2-spin.png` });
  expect(await p.evaluate(() => MF.game.busy), 'Space starts a Show roll');
  await p.waitForFunction(() => !MF.game.busy, null, { timeout: 30000 });
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/3-result.png` });
  if (await p.isVisible('#fClose')) await p.click('#fClose');
  const one = await p.evaluate(() => ({ rolls: MF.state.rolls, life: MF.state.life, rows: document.querySelectorAll('#haul .row').length }));
  console.log('after one roll', one);
  expect(one.rolls === 1 && one.rows > 0, 'one roll recorded and its badges listed');
  // Skip jumps to the end of a Show roll
  await p.keyboard.press('Space'); await p.waitForTimeout(300); await p.keyboard.press('Space');
  const t0s = Date.now(); await settle(p);
  expect(Date.now() - t0s < 2500, `Skip ends a Show roll quickly (${Date.now() - t0s} ms)`);
  // deep rolls through the show path
  await p.evaluate(() => MF.play(777777, { preview: true }));
  await p.waitForTimeout(600);
  await p.waitForFunction(() => !MF.game.busy, null, { timeout: 30000 });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/4-mythic.png` });
  expect((await p.textContent('#stamp')) === 'Mythic', 'Mythic stamp shows for 777777');
  // a real Mythic roll shows its card
  await p.evaluate(() => { MF.play(777777); });
  await p.waitForSelector('#fClose', { timeout: 30000, state: 'visible' });
  await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/4b-card.png` });
  await p.click('#fClose');
  // every sound fires without error
  await p.evaluate(() => { const s = MF.Sound; s.init(); s.tick(); s.clunk(2); s.ui(); s.press(); s.ping(3, 2); s.blip(1); s.sonar(4); s.plunge(); s.heart(); [0, 1, 2, 3, 4, 5, 6].forEach(t => s.stinger(t)); s.fresh(); s.fanfareSet(); s.depth(5); });
  // an early roll, seen near the surface
  await p.click('[data-speed=fast]');
  await p.evaluate(() => MF.play(403602, { preview: true })); await p.waitForFunction(() => !MF.game.busy); await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/4c-shallow.png` });
  await p.click('[data-speed=show]');
  await p.click('[data-speed=fast]');
  for (let i = 0; i < 12; i++) { await p.keyboard.press('Space'); await p.waitForTimeout(60); await settle(p); }
  console.log('fast rolls', await p.evaluate(() => MF.state.rolls)); const base = await p.evaluate(() => MF.state.rolls);
  // instant auto
  await p.click('[data-speed=instant]'); await p.selectOption('#autoStop', '9');
  const t0 = Date.now(); await p.click('#btnAuto'); await p.waitForTimeout(4000); await p.click('#btnAuto');
  await p.waitForFunction(() => !MF.game.busy); await p.waitForTimeout(150);
  const s = await p.evaluate(() => ({ rolls: MF.state.rolls, badges: Object.keys(MF.state.badges).length, tiers: MF.state.tiers, logLen: MF.state.log.length }));
  const rate = (s.rolls - base) / ((Date.now() - t0) / 1000);
  console.log('auto', s, 'rolls/sec', rate.toFixed(1));
  expect(rate > 10, `Instant auto-roll runs (${rate.toFixed(1)} rolls/sec)`);
  // auto stops on its condition
  await p.selectOption('#autoStop', '3'); await p.click('#btnAuto');
  await p.waitForFunction(() => !MF.game.auto, null, { timeout: 30000 }); await p.waitForFunction(() => !MF.game.busy);
  const stopped = await p.evaluate(() => MF.game.lastResult.tier);
  expect(stopped >= 3, `auto stops at Rare or better (stopped on tier ${stopped})`);
  // drawers
  for (const t of ['log', 'codex', 'sets', 'check', 'how', 'settings']) {
    await p.click(`[data-open=${t}]`); await p.waitForTimeout(350);
    expect(await p.isVisible('#drawer') && (await p.getAttribute(`[data-tab=${t}]`, 'aria-selected')) === 'true', `${t} panel opens`);
    if (t === 'codex') { await p.screenshot({ path: `${OUT}/5-codex.png` }); expect((await p.$$('.card')).length === 233, 'all 233 badges listed'); await p.fill('#cSearch', 'jackpot'); expect((await p.$$('.card')).length === 5, 'badge search finds the 5 Jackpot badges'); await p.fill('#cSearch', ''); }
    if (t === 'sets') expect((await p.$$('.set')).length === 16, 'all 16 sets listed');
    if (t === 'log') await p.screenshot({ path: `${OUT}/6-log.png` });
    if (t === 'check') {
      await p.fill('#cInput', '61,287'); await p.keyboard.press('Enter'); await p.waitForTimeout(120);
      await p.screenshot({ path: `${OUT}/7-check.png` });
      const head = await p.textContent('.result-head'); console.log('check', head);
      expect(head === '61,287: 4,634 EP, Common', 'number checker scores 61,287');
      await p.fill('#cInput', '2000000'); await p.keyboard.press('Enter'); await p.waitForTimeout(80);
      expect((await p.textContent('#cBody')).startsWith('That is not a roll'), 'number checker rejects 2,000,000');
    }
    if (t === 'settings') {
      await p.click('#oSound'); expect(await p.evaluate(() => MF.state.opts.sound === false), 'sound setting toggles');
      await p.click('#oSound');
    }
    await p.keyboard.press('Escape'); await p.waitForTimeout(80);
    expect(!(await p.isVisible('#drawer')), `Escape closes the ${t} panel`);
  }
  // keyboard shortcuts
  await p.keyboard.press('2'); expect(await p.evaluate(() => MF.state.opts.speed === 'fast'), 'key 2 sets Fast');
  await p.keyboard.press('b'); await p.waitForTimeout(200); expect(await p.isVisible('.card'), 'key B opens badges'); await p.keyboard.press('Escape');
  await p.keyboard.press('m'); expect(await p.evaluate(() => MF.state.opts.sound === false), 'key M mutes'); await p.keyboard.press('m');
  // 10-roll dive
  await p.click('#modeDive'); await p.click('[data-speed=fast]');
  for (let i = 0; i < 10; i++) { await p.keyboard.press('Space'); await p.waitForTimeout(40); await p.waitForFunction(() => !MF.game.busy, null, { timeout: 30000 }); await p.waitForTimeout(100); if (await p.evaluate(() => !document.getElementById('finish').hidden && MF.game.dive.length < 10)) await p.click('#fClose'); }
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/8-dive.png` });
  expect(await p.isVisible('#fAgain'), 'dive finish card shows after 10 rolls');
  // saved progress survives reload
  await p.waitForTimeout(400);
  const saved = await p.evaluate(() => MF.state.rolls); await p.reload(); await p.waitForTimeout(600);
  const after = await p.evaluate(() => MF.state.rolls);
  console.log('reload', saved, after);
  expect(saved === after, 'progress survives a reload');
  await p.screenshot({ path: `${OUT}/9-reload.png` });
  // a save written by the original plain-JS build loads with its progress
  const old = JSON.stringify({ rolls: 42, life: 300000, best: { n: 61287, total: 4634, tier: 1 }, tiers: [1, 20, 12, 6, 2, 1, 0], badges: { Pair: 30, Even: 20, Jackpot: 1 }, sets: {}, log: [{ n: 61287, t: 4634, k: 1, f: 2 }], bestDive: 50000, opts: { sound: true, vol: .5, ambient: false, speed: 'fast', autoStop: '4', effects: true } });
  const q = await page({ viewport: { width: 1100, height: 760 } }, old);
  const carried = await q.evaluate(() => ({ rolls: MF.state.rolls, badges: document.querySelector('#sBadges b').textContent, speed: MF.state.opts.speed, title: document.getElementById('haulTitle').textContent, ep: document.getElementById('ep').textContent }));
  console.log('old save', carried);
  expect(carried.rolls === 42 && carried.badges === '3/233' && carried.speed === 'fast' && carried.title === 'Last roll' && carried.ep.startsWith('4,634'), 'a save from the original build carries over');
  // reduced motion: no shake or particles
  const r = await page({ viewport: { width: 1100, height: 760 }, reducedMotion: 'reduce' });
  await r.evaluate(() => MF.play(777777, { preview: true })); await r.waitForTimeout(400);
  await r.waitForFunction(() => !MF.game.busy, null, { timeout: 30000 });
  const calm = await r.evaluate(() => ({ shake: document.getElementById('app').classList.contains('shake'), dur: getComputedStyle(document.getElementById('stamp')).animationDuration }));
  expect(!calm.shake && parseFloat(calm.dur) < .001, `reduced motion: no shake, animations off (${calm.dur})`);
  // phone
  const m = await page({ ...devices['iPhone 13'] });
  await m.screenshot({ path: `${OUT}/10-phone-idle.png` });
  await m.tap('#btnRoll'); await m.waitForTimeout(600); await m.waitForFunction(() => !MF.game.busy, null, { timeout: 30000 }); await m.waitForTimeout(600);
  await m.screenshot({ path: `${OUT}/11-phone-result.png` });
  if (await m.isVisible('#fClose')) await m.tap('#fClose');
  const over = await m.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, machine: document.querySelector('.machine').getBoundingClientRect().right, dock: document.querySelector('.dock').getBoundingClientRect().bottom, h: innerHeight }));
  console.log('phone', over);
  expect(over.sw <= over.cw && over.machine <= over.cw && over.dock <= over.h, 'phone layout fits the screen');
  await m.tap('[data-open=codex]'); await m.waitForTimeout(350); await m.screenshot({ path: `${OUT}/12-phone-codex.png` });
  expect(await m.isVisible('.card'), 'phone: badges panel opens');
  console.log('errors', errors.slice(0, 6), 'external requests', external);
  expect(!errors.length, 'no page errors');
  expect(!external.length, 'no network requests');
  await b.close();
  console.log(fails.length ? `\nFAILED ${fails.length}: ${fails.join('; ')}` : '\nPASS: all UI checks');
  process.exit(fails.length ? 1 : 0);
})();
