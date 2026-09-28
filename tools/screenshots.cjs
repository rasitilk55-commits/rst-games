#!/usr/bin/env node
// Mağaza ekran görüntülerini otomatik üretir (Playwright gerekir: npm i -D playwright).
// Önce web çıktısını hazırla ve yerel sunucu başlat:
//   node tools/web-export.mjs kelebek-sarkac && node tools/web-export.mjs olay-ufku
//   cd dist-web && python3 -m http.server 8765
// Sonra: node tools/screenshots.cjs
// Çıktı: apps/<oyun>/store/screenshots/<dil>/<cihaz>-<n>.png
//   ios-6.9  : 1290x2796 (App Store'un istediği ana boyut)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = process.env.RST_PREVIEW || 'http://127.0.0.1:8765';
// Google Play görselleri için: node tools/playstore-assets.cjs (başlıklı, çerçeveli; telefon + tablet)
const DEVICES = { 'ios-6.9': { width: 430, height: 932, scale: 3 } };
const ROOT = path.join(__dirname, '..');

const SCENES = {
  'kelebek-sarkac': async (p, shot) => {
    await p.waitForTimeout(1600);
    await shot(1); // sarkaç sallanıyor
    for (let i = 0; i < 12; i++) {
      await p.mouse.click(50, 300);
      await p.waitForSelector('#rst-sheet:not([hidden])', { timeout: 15000 });
      if (await p.locator('#rst-hint').count()) break; // hayalet yolu gösteren ıska
      if (await p.locator('#rst-next').count()) await p.click('#rst-next'); else await p.click('#rst-retry');
      await p.waitForTimeout(700 + i * 211);
    }
    await p.waitForTimeout(500);
    await shot(2); // "0,2 saniye erken bıraksaydın" + hayalet yol
  },
  'olay-ufku': async (p, shot, dev) => {
    // Oyunun kendi çözümünü alıp (kazanan fırlatma) parmakla çekiyormuş gibi uygular.
    await p.waitForTimeout(900);
    const [a, pw] = await p.evaluate(() => window.__rst.game.__win());
    const SC = Math.min(dev.width, 560) / 400;
    const sx = dev.width / 2, sy = dev.height * 0.55;
    await p.mouse.move(sx, sy);
    await p.mouse.down();
    await p.mouse.move(sx - Math.cos(a) * 130 * pw * SC, sy - Math.sin(a) * 130 * pw * SC, { steps: 8 });
    await p.waitForTimeout(300);
    await shot(1); // nişan: noktalı rota
    await p.mouse.up();
    await p.waitForTimeout(900);
    await shot(2); // uçuş: kuyruklu yıldız kara deliğin yanından kıvrılıyor
    await p.waitForSelector('#rst-sheet:not([hidden])', { timeout: 30000 });
    await p.waitForTimeout(1200);
    await shot(3); // sonuç
    // İleri bir seviye: beyaz delik, asteroitler ve 3 kara delik aynı ekranda
    await p.evaluate(() => { const S = window.__rst.S; S.level = 47; S.offers.starterAt = Date.now(); S.notifAsked = true; window.__rst.save(); document.querySelectorAll('.rst-ov').forEach((e) => { e.hidden = true; }); window.__rst.startLevel(); });
    await p.waitForTimeout(900);
    const [a2, p2] = await p.evaluate(() => window.__rst.game.__win());
    const d2 = await p.evaluate(([a, q]) => window.__rst.game.__dragFor(a, q), [a2, p2]);
    await p.mouse.move(d2.x0, d2.y0);
    await p.mouse.down();
    await p.mouse.move(d2.x1, d2.y1, { steps: 8 });
    await p.waitForTimeout(400);
    await shot(4);
    await p.mouse.up();
    await p.evaluate(() => window.__rst.game.__speed(12));
    await p.waitForSelector('#rst-sheet:not([hidden])', { timeout: 60000 });
  },
};

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const only = process.argv[2]; // örn. node tools/screenshots.cjs olay-ufku
  for (const [game, scene] of Object.entries(SCENES)) {
    if (only && game !== only) continue;
    for (const lang of ['tr', 'en']) {
      for (const [devName, dev] of Object.entries(DEVICES)) {
        const ctx = await browser.newContext({ viewport: { width: dev.width, height: dev.height }, deviceScaleFactor: dev.scale, hasTouch: false });
        const p = await ctx.newPage();
        const dir = path.join(ROOT, 'apps', game, 'store', 'screenshots', lang);
        fs.mkdirSync(dir, { recursive: true });
        const shot = (n) => p.screenshot({ path: path.join(dir, `${devName}-${n}.png`) });
        await p.goto(`${BASE}/${game}/index.html?lang=${lang}&shots=1&debug=1`);
        await p.waitForTimeout(500);
        await p.click('#rst-start');
        await scene(p, shot, dev);
        await p.click('#rst-shopbtn').catch(() => {});
        await p.waitForTimeout(400);
        await shot(9); // mağaza
        await ctx.close();
        console.log('hazır:', game, lang, devName);
      }
    }
  }
  await browser.close();
})();
