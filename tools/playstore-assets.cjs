#!/usr/bin/env node
// Google Play mağaza görselleri: gerçek oyun ekranlarını yakalar ve başlıklı, çerçeveli mağaza görsellerine dönüştürür.
// Çıktı (play-store/<oyun>/graphics/):
//   icon-512.png                        uygulama simgesi (512x512, 32 bit PNG)
//   feature-graphic-<dil>.png           öne çıkan görsel (1024x500, alfa kanalsız)
//   phone/<dil>/0N.png                  telefon ekran görüntüleri (1080x1920)
//   tablet-7/<dil>/0N.png               7 inç tablet (1200x1920)
//   tablet-10/<dil>/0N.png              10 inç tablet (1600x2560)
// Önce: node tools/web-export.mjs <oyun> ve (cd dist-web && python3 -m http.server 8765)
// Kullanım: node tools/playstore-assets.cjs [oyun] [--phone-only]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = process.env.RST_PREVIEW || 'http://127.0.0.1:8765';
const ROOT = path.join(__dirname, '..');
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const only = process.argv.slice(2).find((a) => !a.startsWith('--'));
const PHONE_ONLY = process.argv.includes('--phone-only');
const DEVICES = [
  { dir: 'phone', w: 360, h: 640, scale: 3 },
  { dir: 'tablet-7', w: 600, h: 960, scale: 2 },
  { dir: 'tablet-10', w: 800, h: 1280, scale: 2 },
].filter((d) => !PHONE_ONLY || d.dir === 'phone');
const LANGS = { 'tr-TR': 'tr', 'en-US': 'en' };
const STYLE = {
  'olay-ufku': { bg: 'radial-gradient(120% 80% at 50% 0%, #2A1C6B 0%, #0B0820 55%, #05060F 100%)', ink: '#F4F1FF', accent: '#8FB4FF', frame: '#1B1640' },
  'kelebek-sarkac': { bg: 'linear-gradient(170deg, #FFE3D3 0%, #F7C9E0 45%, #D9D2F5 100%)', ink: '#2B2340', accent: '#FF6B5A', frame: '#FFFFFF' },
};

async function prep(p, patch) {
  await p.evaluate((patch) => {
    const S = window.__rst.S;
    S.offers.starterAt = S.offers.starterAt || Date.now();
    S.notifAsked = true;
    Object.assign(S, patch || {});
    window.__rst.save();
    document.querySelectorAll('.rst-ov').forEach((e) => { e.hidden = true; });
    const t = document.querySelector('#rst-toast'); if (t) t.classList.remove('on');
  }, patch);
}
const starsUpTo = (n) => { const b = {}; for (let i = 1; i < n; i++) b[i] = i % 4 === 0 ? 2 : 3; return b; };
async function goLevel(p, n, extra) {
  await prep(p, { level: n, ...(extra || {}) });
  await p.evaluate(() => window.__rst.startLevel());
  await p.waitForTimeout(700);
  await prep(p);
}

// Her sahne bir ham ekran görüntüsü döndürür (Buffer).
const SCENES = {
  'olay-ufku': [
    async (p) => { // 1: nişan
      await goLevel(p, 7);
      const [a, pw] = await p.evaluate(() => window.__rst.game.__win());
      const d = await p.evaluate(([a, q]) => window.__rst.game.__dragFor(a, q), [a, pw]);
      await p.mouse.move(d.x0, d.y0); await p.mouse.down(); await p.mouse.move(d.x1, d.y1, { steps: 8 });
      await p.waitForTimeout(300);
      const shot = await p.screenshot();
      p.__pending = true;
      return shot;
    },
    async (p) => { // 2: uçuş
      await p.mouse.up();
      await p.waitForTimeout(1900);
      return p.screenshot();
    },
    async (p) => { // 3: sonuç
      await p.evaluate(() => window.__rst.game.__speed(8));
      await p.waitForSelector('#rst-sheet:not([hidden])', { timeout: 60000 });
      await p.waitForTimeout(1300);
      return p.screenshot();
    },
    async (p) => { // 4: ileri seviye
      await p.evaluate(() => window.__rst.game.__speed(1));
      await goLevel(p, 47, { best: starsUpTo(47), coins: 1840 });
      const [a, pw] = await p.evaluate(() => window.__rst.game.__win());
      const d = await p.evaluate(([a, q]) => window.__rst.game.__dragFor(a, q), [a, pw]);
      await p.mouse.move(d.x0, d.y0); await p.mouse.down(); await p.mouse.move(d.x1, d.y1, { steps: 8 });
      await p.waitForTimeout(400);
      const s = await p.screenshot();
      await p.mouse.move(d.x0, d.y0, { steps: 2 }); await p.mouse.up(); // iptal (güç çok düşük)
      return s;
    },
    async (p) => { // 5: seviye haritası
      await p.evaluate(() => window.__rst.openMap());
      await p.waitForTimeout(500);
      return p.screenshot();
    },
    async (p) => { // 6: bugün
      await prep(p);
      await p.click('#rst-todaybtn');
      await p.waitForTimeout(500);
      return p.screenshot();
    },
  ],
  'kelebek-sarkac': [
    async (p) => { // 1: sallanan sarkaç
      await goLevel(p, 6);
      await p.waitForTimeout(1500);
      return p.screenshot();
    },
    async (p) => { // 2: ıska + hayalet yol
      for (let off = 0; off < 8; off++) {
        await prep(p, { level: 6 });
        // Seviyeyi başlat ve bırakma anını aynı anda ayarla (yavaş ekranlarda an kaçmasın)
        await p.evaluate((off) => { window.__rst.startLevel(); const a = window.__rst.game.__analyze(); window.__rst.game.__releaseAt(Math.max(200, a.span[1] + 70 + off * 45), 8); }, off);
        await p.waitForSelector('#rst-sheet:not([hidden])', { timeout: 180000 });
        if (await p.locator('#rst-hint').count()) { await p.waitForTimeout(700); return p.screenshot(); }
      }
      return p.screenshot();
    },
    async (p) => { // 3: kusursuz bırakış, uçuş anı
      await prep(p, { level: 9 });
      await p.evaluate(() => { window.__rst.startLevel(); const a = window.__rst.game.__analyze(); window.__rst.game.__releaseAt(a.center, 8); });
      // bırakılana kadar bekle, sonra uçuşun ortasında yakala
      await p.waitForFunction(() => !document.querySelector('#rst-tip') || !document.querySelector('#rst-tip').textContent, null, { timeout: 60000 }).catch(() => {});
      await p.waitForTimeout(450);
      return p.screenshot();
    },
    async (p) => { // 4: rüzgâr, sallanan çiçek, diken
      await goLevel(p, 14, { best: starsUpTo(14), coins: 960 });
      await p.waitForTimeout(1800);
      return p.screenshot();
    },
    async (p) => { // 5: seviye haritası
      await prep(p, { level: 38, best: starsUpTo(38) });
      await p.evaluate(() => window.__rst.openMap());
      await p.waitForTimeout(500);
      return p.screenshot();
    },
    async (p) => { // 6: görünümler
      await prep(p, { coins: 1250 });
      await p.click('#rst-shopbtn');
      await p.waitForTimeout(300);
      await p.click('#rst-tab-looks');
      await p.waitForTimeout(500);
      return p.screenshot();
    },
  ],
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function frameHtml(st, W, H, caption, img) {
  const pad = Math.round(W * 0.075);
  const capH = Math.round(H * 0.17);
  // Çerçeve, ekran görüntüsünün en-boy oranını korur (hiçbir yer kırpılmaz)
  const fh = H - capH - pad;
  const fw = Math.min(W - pad * 2, Math.round(fh * W / H));
  const fx = Math.round((W - fw) / 2);
  const r = Math.round(W * 0.05);
  const fs = Math.round(W * 0.072);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden}
    body{background:${st.bg};font-family:'Nunito','Baloo 2','Noto Sans','DejaVu Sans',sans-serif;}
    .cap{position:absolute;left:${pad}px;right:${pad}px;top:0;height:${capH}px;display:flex;align-items:center;justify-content:center;text-align:center;
      color:${st.ink};font-weight:900;font-size:${fs}px;line-height:1.08;letter-spacing:-0.01em;text-wrap:balance}
    .fr{position:absolute;left:${fx}px;top:${capH}px;width:${fw}px;height:${fh}px;border-radius:${r}px;overflow:hidden;
      box-shadow:0 ${Math.round(W * 0.02)}px ${Math.round(W * 0.06)}px rgba(0,0,0,.35), 0 0 0 ${Math.round(W * 0.012)}px ${st.frame};background:#000}
    .fr img{width:100%;height:100%;object-fit:cover;object-position:top center;display:block}
  </style></head><body><div class="cap">${esc(caption)}</div><div class="fr"><img src="data:image/png;base64,${img.toString('base64')}"></div></body></html>`;
}
function featureHtml(st, title, tag, icon, img) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;width:1024px;height:500px;overflow:hidden}
    body{background:${st.bg};font-family:'Nunito','Baloo 2','Noto Sans','DejaVu Sans',sans-serif;color:${st.ink}}
    .shot{position:absolute;right:0;top:0;width:600px;height:500px;background:url(data:image/png;base64,${img.toString('base64')}) center 38%/cover;
      -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 34%);mask-image:linear-gradient(90deg,transparent 0,#000 34%)}
    .txt{position:absolute;left:56px;top:0;bottom:0;width:470px;display:flex;flex-direction:column;justify-content:center;gap:18px}
    .ic{width:112px;height:112px;border-radius:26px;box-shadow:0 10px 30px rgba(0,0,0,.3)}
    h1{margin:0;font-size:60px;line-height:1;font-weight:900;letter-spacing:-0.02em}
    p{margin:0;font-size:28px;font-weight:800;color:${st.accent};text-wrap:balance}
  </style></head><body><div class="shot"></div><div class="txt">
    <img class="ic" src="data:image/png;base64,${icon.toString('base64')}"><h1>${esc(title)}</h1><p>${esc(tag)}</p></div></body></html>`;
}

(async () => {
  const browser = await chromium.launch({ args: ARGS });
  for (const game of Object.keys(SCENES)) {
    if (only && game !== only) continue;
    const L = JSON.parse(fs.readFileSync(path.join(ROOT, 'play-store', game, 'listing.json'), 'utf8'));
    const out = path.join(ROOT, 'play-store', game, 'graphics');
    fs.mkdirSync(out, { recursive: true });
    const st = STYLE[game];
    const icon = fs.readFileSync(path.join(ROOT, 'apps', game, 'assets', 'icon-only.png'));
    for (const [loc, lang] of Object.entries(LANGS)) {
      let featureSrc = null;
      for (const dev of DEVICES) {
        const ctx = await browser.newContext({ viewport: { width: dev.w, height: dev.h }, deviceScaleFactor: dev.scale });
        const p = await ctx.newPage();
        await p.goto(`${BASE}/${game}/index.html?lang=${lang}&debug=1&shots=1`);
        await p.waitForTimeout(700);
        if (await p.locator('#rst-start').isVisible()) await p.click('#rst-start');
        await p.waitForTimeout(300);
        await prep(p);
        const raws = [];
        for (const scene of SCENES[game]) raws.push(await scene(p));
        await ctx.close();
        if (dev.dir === 'phone') featureSrc = raws[game === 'olay-ufku' ? 1 : 0];
        const W = dev.w * dev.scale, H = dev.h * dev.scale;
        const dir = path.join(out, dev.dir, loc);
        fs.mkdirSync(dir, { recursive: true });
        const fctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
        const fp = await fctx.newPage();
        for (let i = 0; i < raws.length; i++) {
          await fp.setContent(frameHtml(st, W, H, L.screenshotCaptions[loc][i], raws[i]));
          await fp.waitForTimeout(80);
          await fp.screenshot({ path: path.join(dir, `0${i + 1}.png`) });
        }
        await fctx.close();
        console.log('hazır:', game, loc, dev.dir, `${W}x${H}`, raws.length);
      }
      // Öne çıkan görsel (1024x500, alfa yok → JPEG değil, opak PNG)
      const fctx = await browser.newContext({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
      const fp = await fctx.newPage();
      await fp.setContent(featureHtml(st, L.listings[loc].title.split(':')[0], L.featureGraphic[loc], icon, featureSrc));
      await fp.waitForTimeout(100);
      await fp.screenshot({ path: path.join(out, `feature-graphic-${loc}.png`), omitBackground: false });
      await fctx.close();
    }
    // 512 simge
    const ictx = await browser.newContext({ viewport: { width: 512, height: 512 } });
    const ip = await ictx.newPage();
    await ip.setContent(`<html><body style="margin:0"><img style="width:512px;height:512px;display:block" src="data:image/png;base64,${icon.toString('base64')}"></body></html>`);
    await ip.screenshot({ path: path.join(out, 'icon-512.png'), omitBackground: true }); // 32 bit (RGBA) PNG
    // Play simgeyi 32 bit (alfa kanallı) PNG olarak ister; tarayıcı opak görüntüyü 24 bit kaydeder → Pillow ile RGBA'ya çevir
    const cv = require('child_process').spawnSync('python3', ['-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).convert("RGBA").save(sys.argv[1])', path.join(out, 'icon-512.png')]);
    if (cv.status !== 0) console.log('UYARI: icon-512.png RGBA yapılamadı (python3 + Pillow gerekir)');
    await ictx.close();
  }
  await browser.close();
})();
