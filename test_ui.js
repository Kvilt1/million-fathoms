// Plays the built offline file in a real browser with the network blocked.
const { chromium, devices } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve('dist/million-fathoms.html');
const OUT = process.env.SHOTS;
(async () => {
  const b = await chromium.launch();
  const errors = [], external = [];
  async function page(opts) {
    const ctx = await b.newContext(opts); const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(String(e)));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await ctx.route('**/*', r => { const u = r.request().url(); if (u.startsWith('file:') || u.startsWith('data:')) return r.continue(); external.push(u); return r.abort(); });
    await p.goto(FILE); await p.waitForTimeout(700); return p;
  }
  const p = await page({ viewport: { width: 1360, height: 820 } });
  await p.screenshot({ path: `${OUT}/1-idle.png` });
  // scoring inside the page matches published values
  const check = await p.evaluate(() => [61287, 142857, 1000000, 420420, 403602, 1, 0].map(n => { const r = MF.scoreRoll(n); return [n, r.total, r.tier, r.earned.length, r.paid.length, r.fm, +r.pct.toFixed(4)]; }));
  console.log(JSON.stringify(check));
  // full speed roll with Space
  await p.keyboard.press('Space'); await p.waitForTimeout(1250);
  await p.screenshot({ path: `${OUT}/2-spin.png` });
  await p.waitForFunction(() => !MF.game.busy, null, { timeout: 15000 });
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/3-result.png` });
  console.log('after one roll', await p.evaluate(() => ({ rolls: MF.state.rolls, life: MF.state.life })));
  // deep rolls through the show path
  await p.evaluate(() => MF.play(777777, { preview: true }));
  await p.waitForTimeout(600);
  await p.waitForFunction(() => !MF.game.busy, null, { timeout: 20000 });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/4-mythic.png` });
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
  await p.click('[data-speed=fast]');
  for (let i = 0; i < 12; i++) { await p.keyboard.press('Space'); await p.waitForTimeout(60); await p.waitForFunction(() => !MF.game.busy, null, { timeout: 8000 }); }
  console.log('fast rolls', await p.evaluate(() => MF.state.rolls)); const base = await p.evaluate(() => MF.state.rolls);
  // instant auto
  await p.click('[data-speed=instant]'); await p.selectOption('#autoStop', '9');
  const t0 = Date.now(); await p.click('#btnAuto'); await p.waitForTimeout(4000); await p.click('#btnAuto');
  await p.waitForFunction(() => !MF.game.busy); await p.waitForTimeout(150);
  const s = await p.evaluate(() => ({ rolls: MF.state.rolls, badges: Object.keys(MF.state.badges).length, tiers: MF.state.tiers, logLen: MF.state.log.length }));
  console.log('auto', s, 'rolls/sec', ((s.rolls - base) / ((Date.now() - t0) / 1000)).toFixed(1));
  // drawers
  for (const t of ['log', 'codex', 'sets', 'check', 'how', 'settings']) {
    await p.click(`[data-open=${t}]`); await p.waitForTimeout(350);
    if (t === 'codex') await p.screenshot({ path: `${OUT}/5-codex.png` });
    if (t === 'log') await p.screenshot({ path: `${OUT}/6-log.png` });
    if (t === 'check') {
      await p.fill('#cInput', '61,287'); await p.keyboard.press('Enter'); await p.waitForTimeout(120);
      await p.screenshot({ path: `${OUT}/7-check.png` });
      console.log('check', (await p.textContent('.result-head')));
      await p.fill('#cInput', '2000000'); await p.keyboard.press('Enter'); await p.waitForTimeout(80);
      console.log('bad input', await p.textContent('#cBody'));
    }
    await p.keyboard.press('Escape'); await p.waitForTimeout(80);
  }
  // 10-roll dive
  await p.click('#modeDive'); await p.click('[data-speed=fast]');
  for (let i = 0; i < 10; i++) { await p.keyboard.press('Space'); await p.waitForTimeout(40); await p.waitForFunction(() => !MF.game.busy, null, { timeout: 8000 }); if (await p.evaluate(() => !document.getElementById('finish').hidden && MF.game.dive.length < 10)) await p.click('#fClose'); }
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/8-dive.png` });
  console.log('dive finish visible', await p.isVisible('#fAgain'));
  // saved progress survives reload
  await p.waitForTimeout(400);
  const saved = await p.evaluate(() => MF.state.rolls); await p.reload(); await p.waitForTimeout(600);
  console.log('reload', saved, await p.evaluate(() => MF.state.rolls));
  await p.screenshot({ path: `${OUT}/9-reload.png` });
  // phone
  const m = await page({ ...devices['iPhone 13'] });
  await m.screenshot({ path: `${OUT}/10-phone-idle.png` });
  await m.tap('#btnRoll'); await m.waitForTimeout(600); await m.waitForFunction(() => !MF.game.busy, null, { timeout: 15000 }); await m.waitForTimeout(600);
  await m.screenshot({ path: `${OUT}/11-phone-result.png` });
  const over = await m.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, machine: document.querySelector('.machine').getBoundingClientRect().right, dock: document.querySelector('.dock').getBoundingClientRect().bottom, h: innerHeight }));
  console.log('phone', over);
  await m.tap('[data-open=codex]'); await m.waitForTimeout(350); await m.screenshot({ path: `${OUT}/12-phone-codex.png` });
  console.log('errors', errors.slice(0, 6), 'external requests', external);
  await b.close();
})();
