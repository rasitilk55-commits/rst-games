#!/usr/bin/env node
// Olay Ufku ikonunu ve açılış ekranını oyunun gerçek WebGL shaderıyla üretir.
// Önce: node tools/web-export.mjs olay-ufku && (cd dist-web && python3 -m http.server 8765)
// Sonra: node tools/shader-icon.cjs  (Playwright gerekir)
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.RST_PREVIEW || 'http://127.0.0.1:8765';
const OUT = path.join(__dirname, '..', 'apps', 'olay-ufku', 'assets');

async function render(page, size, scene) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:#000"><canvas id="c" width="${size}" height="${size}"></canvas>
<script type="module">
import { createSky } from '${BASE}/olay-ufku/game/sky.js';
const sky = createSky();
const c = document.getElementById('c').getContext('2d');
const S = ${size}, s = ${JSON.stringify(scene)};
sky.render({ w: S, h: S, time: s.time, px: S / 400, holes: s.holes.map(h => ({ x: h.x * S, y: h.y * S, rh: h.rh * S, k: Math.pow(h.rh * S * 3, 2), tilt: h.tilt })),
  portal: { x: s.portal[0] * S, y: s.portal[1] * S, r: s.portal[2] * S, glow: s.portal[3] }, flash: 0 });
c.drawImage(sky.canvas, 0, 0);
window.done = true;
</script></body></html>`);
  await page.waitForFunction(() => window.done === true, null, { timeout: 60000 });
}

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  await p.goto(BASE + '/'); // aynı kaynaktan modül yükleyebilmek için
  const hero = { time: 7.3, holes: [{ x: 0.5, y: 0.52, rh: 0.14, tilt: -0.28 }], portal: [0.8, 0.18, 0.05, 0.9] };
  await render(p, 1024, hero);
  await p.locator('#c').screenshot({ path: path.join(OUT, 'icon-only.png') });
  await p.locator('#c').screenshot({ path: path.join(OUT, 'icon-background.png') });
  await render(p, 1024, { time: 3, holes: [], portal: [-1, -1, 0.001, 0] });
  const splashScene = { time: 7.3, holes: [{ x: 0.5, y: 0.5, rh: 0.06, tilt: -0.28 }], portal: [0.68, 0.36, 0.022, 0.9] };
  await render(p, 1400, splashScene);
  await p.locator('#c').screenshot({ path: path.join(OUT, 'splash-raw.png') });
  await b.close();
  console.log('Olay Ufku ikonu hazır. Açılış ekranını tamamlamak için: python3 tools/make-icons.py');
})();
