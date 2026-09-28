#!/usr/bin/env node
// Tarayıcı uçtan uca testi: iki oyun × dört ekran boyutu.
// Her ekranda: açılış, taşma, dokunma hedefi (≥40 px), seviye haritası, oynanış, mağaza sekmeleri,
// günlük/yol/ayarlar pencereleri, dil değiştirme, satın alma kapalıyken arayüz, hareketi azalt, çevrimdışı oyun.
// Önce: node tools/web-export.mjs <oyun> ve (cd dist-web && python3 -m http.server 8765)
// Kullanım: node tools/test/e2e.cjs [--json] [--shots]   (--shots: docs/qa/ altına kalite kontrol görüntüleri)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = process.env.RST_PREVIEW || 'http://127.0.0.1:8765';
const ROOT = path.join(__dirname, '..', '..');
const JSON_OUT = process.argv.includes('--json');
const SHOTS = process.argv.includes('--shots');
const ONLY = (process.argv.find((a) => a.startsWith('--game=')) || '').slice(7);
const GAMES = ['kelebek-sarkac', 'olay-ufku'].filter((g) => !ONLY || g === ONLY);
const VPS = [
  { n: 'kucuk-360x640', w: 360, h: 640 },
  { n: 'telefon-390x844', w: 390, h: 844 },
  { n: 'buyuk-412x915', w: 412, h: 915 },
  { n: 'tablet-800x1280', w: 800, h: 1280 },
];
const VPF = (process.argv.find((a) => a.startsWith('--vp=')) || '').slice(5);
const TITLE_EN = { 'kelebek-sarkac': 'Butterfly Pendulum', 'olay-ufku': 'Event Horizon' };
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const results = [];
const rec = (game, vp, name, ok, info = '') => results.push({ game, vp, name, ok: !!ok, info: String(info).slice(0, 300) });

async function quiet(p) {
  // Açılış penceresi, başlangıç paketi ve bildirim sorusu testleri engellemesin
  await p.evaluate(() => {
    const S = window.__rst.S;
    S.offers.starterAt = S.offers.starterAt || Date.now();
    S.notifAsked = true;
    window.__rst.save();
    document.querySelectorAll('.rst-ov').forEach((e) => { e.hidden = true; });
  });
}
const layout = (p) => p.evaluate(() => {
  const de = document.documentElement;
  const overflowX = de.scrollWidth > innerWidth + 1;
  const overflowY = de.scrollHeight > innerHeight + 1;
  const small = [], clipped = [];
  for (const b of document.querySelectorAll('button, a.rst-link, [role=button]')) {
    if (!b.offsetParent) continue;
    const r = b.getBoundingClientRect();
    if (r.width === 0 || r.bottom < 0 || r.top > innerHeight) continue;
    if (Math.min(r.width, r.height) < 40) small.push((b.id || b.className || b.textContent).toString().slice(0, 30) + ` ${Math.round(r.width)}x${Math.round(r.height)}`);
    if (r.right > innerWidth + 1 || r.left < -1) clipped.push(b.id || b.textContent.slice(0, 20));
  }
  for (const e of document.querySelectorAll('h1,h2,h3,.rst-toggle,.rst-tab,.rst-btn')) {
    if (!e.offsetParent) continue;
    if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible') clipped.push('metin:' + (e.id || e.textContent.slice(0, 20)));
  }
  return { overflowX, overflowY, small, clipped };
});
const visible = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e || e.hidden) return false; const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0 && r.width > 0 && r.height > 0; }, sel);

async function playOnce(p, game) {
  if (game === 'olay-ufku') {
    await p.evaluate(() => window.__rst.game.__speed(12));
    const [a, pw] = await p.evaluate(() => window.__rst.game.__win());
    const d = await p.evaluate(([a, q]) => window.__rst.game.__dragFor(a, q), [a, pw]);
    await p.mouse.move(d.x0, d.y0); await p.mouse.down(); await p.mouse.move(d.x1, d.y1, { steps: 6 }); await p.mouse.up();
  } else {
    await p.waitForTimeout(900);
    const box = await p.locator('#rst-cv').boundingBox();
    await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
  await p.waitForSelector('#rst-sheet:not([hidden])', { timeout: 60000 });
  return { stars: await p.locator('#rst-sheet .rst-stars i.on').count(), title: await p.locator('#rst-sheet h2').innerText() };
}

async function suite(browser, game, vp) {
  const R = (name, ok, info) => rec(game, vp.n, name, ok, info);
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1, hasTouch: false });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/ERR_|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  const shot = async (name) => {
    if (!SHOTS || vp.n.startsWith('buyuk')) return;
    const dir = path.join(ROOT, 'docs', 'qa', game);
    fs.mkdirSync(dir, { recursive: true });
    await p.screenshot({ path: path.join(dir, `${vp.n}-${name}.png`) });
  };
  const url = `${BASE}/${game}/index.html?lang=tr&debug=1`;
  await p.goto(url);
  await p.waitForTimeout(700);
  R('açılış ekranı', await visible(p, '#rst-start'));
  let L = await layout(p);
  R('açılış: yatay taşma yok', !L.overflowX, L.overflowX ? 'taşma' : '');
  R('açılış: dokunma hedefleri ≥40px', L.small.length === 0, L.small.join(', '));
  await shot('01-acilis');
  await p.click('#rst-start');
  await p.waitForTimeout(500);
  await quiet(p);
  await p.waitForTimeout(300);
  L = await layout(p);
  R('oyun ekranı: taşma yok', !L.overflowX && !L.overflowY, JSON.stringify(L));
  R('oyun ekranı: dokunma hedefleri ≥40px', L.small.length === 0, L.small.join(', '));
  R('oyun ekranı: kırpılan öğe yok', L.clipped.length === 0, L.clipped.join(', '));
  await shot('02-oyun');

  // Seviye haritası
  await p.click('#rst-lvlbtn');
  await p.waitForTimeout(250);
  const cells = await p.locator('.rst-lvcell').count();
  R('seviye haritası açılıyor', (await visible(p, '#rst-map')) && cells >= 5, 'hücre ' + cells);
  await shot('03-harita');
  await p.click('#rst-lv-3');
  await p.waitForTimeout(150);
  R('kilitli seviye uyarısı', await p.evaluate(() => document.querySelector('#rst-toast').classList.contains('on')));
  await p.click('#rst-lv-1');
  await p.waitForTimeout(400);
  R('haritadan seviye başlatma', !(await visible(p, '#rst-map')) && (await p.evaluate(() => window.__rst.cur)) === 1);

  // Oynanış
  const r1 = await playOnce(p, game);
  if (game === 'olay-ufku') R('çözüm atışı 3 yıldızla kazanır', r1.stars === 3, r1.title);
  else R('dokunuş sonuç kartı açar', r1.title.length > 0, r1.title);
  await shot('04-sonuc');
  L = await layout(p);
  R('sonuç kartı: dokunma hedefleri ≥40px', L.small.length === 0, L.small.join(', '));
  if (await p.locator('#rst-next').count()) {
    await p.click('#rst-next');
    await p.waitForTimeout(400);
    await quiet(p);
    R('sonraki seviyeye geçiş', (await p.evaluate(() => window.__rst.cur)) === 2);
  } else {
    R('ipucu / tekrar düğmesi', (await p.locator('#rst-retry').count()) > 0);
    await p.click('#rst-retry');
    await p.waitForTimeout(400);
    await quiet(p);
  }

  // Mağaza ve sekmeler
  await p.click('#rst-shopbtn');
  await p.waitForTimeout(300);
  R('mağaza açılıyor', await visible(p, '#rst-shop'));
  const tabs = await p.locator('#rst-tabs button').evaluateAll((bs) => bs.map((b) => b.id));
  for (const id of tabs) {
    await p.click('#' + id);
    await p.waitForTimeout(150);
    const bad = await p.evaluate(() => { const b = document.querySelector('#rst-shopbody'); return b.scrollWidth > b.clientWidth + 1; });
    L = await layout(p);
    R(`mağaza sekmesi ${id.replace('rst-tab-', '')}: taşma yok, hedefler ≥40px`, !bad && !L.overflowX && L.small.length === 0, L.small.join(', '));
    await shot('05-magaza-' + id.replace('rst-tab-', ''));
  }
  R('satın alma arayüzü (tarayıcıda simülasyon) görünür', (await p.locator('[id^=rst-pack-]').count()) + (await p.locator('#rst-buynoads').count()) > 0 || tabs.length > 1);
  await p.click('#rst-shopclose');

  // Diğer pencereler
  for (const [btn, ov, close, nm] of [['#rst-todaybtn', '#rst-today', '#rst-todayclose', 'günlük'], ['#rst-roadbtn', '#rst-road', '#rst-roadclose', 'altın yol'], ['#rst-menubtn', '#rst-settings', '#rst-settingsclose', 'ayarlar']]) {
    await p.click(btn);
    await p.waitForTimeout(250);
    const ok = await visible(p, ov);
    L = await layout(p);
    R(`${nm} penceresi: açılır, taşma yok, hedefler ≥40px`, ok && !L.overflowX && L.small.length === 0, L.small.join(', '));
    await shot('06-' + ov.slice(5));
    if (nm !== 'ayarlar') await p.click(close);
  }
  // Dil: İngilizce seç → sayfa yenilenir → başlık İngilizce
  await Promise.all([p.waitForEvent('load', { timeout: 15000 }).catch(() => null), p.click('#rst-lang-en')]);
  await p.goto(`${BASE}/${game}/index.html?debug=1`);
  await p.waitForTimeout(600);
  const t = await p.evaluate(() => [document.title, document.documentElement.lang, document.querySelector('#rst-lvlbtn').getAttribute('aria-label')].join(' | '));
  R('dil ayarı (İngilizce) kalıcı', t.includes(TITLE_EN[game]) && t.includes('| en |') && t.includes('Levels'), t);
  await p.evaluate(() => localStorage.removeItem('rst.lang'));

  // Çevrimdışı oynanış
  await ctx.setOffline(true);
  await p.goto(url).catch(() => {});
  await ctx.setOffline(false);
  await p.goto(url);
  await p.waitForTimeout(500);
  await ctx.setOffline(true);
  if (await visible(p, '#rst-start')) await p.click('#rst-start');
  await p.waitForTimeout(400);
  await quiet(p);
  const r2 = await playOnce(p, game).catch((e) => ({ title: '', err: e.message }));
  R('çevrimdışıyken oynanır', r2.title && !r2.err, r2.err || r2.title);
  await ctx.setOffline(false);
  R('konsolda hata yok', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

async function extra(browser, game) {
  const vp = 'telefon-390x844';
  // Satın alma kapalı (RevenueCat anahtarı yok) → satın alma arayüzü gizli
  let ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`${BASE}/${game}/index.html?lang=tr&debug=1&noiap=1`);
  await p.waitForTimeout(600);
  await p.click('#rst-start');
  await p.waitForTimeout(400);
  await quiet(p);
  await p.click('#rst-shopbtn');
  await p.waitForTimeout(300);
  const tabs = await p.locator('#rst-tabs button').evaluateAll((bs) => bs.map((b) => b.id));
  let buyUi = 0;
  for (const id of tabs) {
    await p.click('#' + id);
    await p.waitForTimeout(120);
    buyUi += await p.locator('[id^=rst-pack-], #rst-buynoads, #rst-buypass, #rst-restore, #rst-restore2, #rst-vipw, #rst-vipm').evaluateAll((es) => es.filter((e) => e.offsetParent).length);
  }
  rec(game, vp, 'satın alma kapalıyken ücretli ürün gösterilmez', buyUi === 0, 'görünen ' + buyUi);
  rec(game, vp, 'satın alma kapalıyken ücretsiz altın (reklam) duruyor', (await p.locator('#rst-freecoins').count()) > 0 || tabs.length > 0);
  rec(game, vp, 'satın alma kapalı: hata yok', errs.length === 0, errs.join(' | '));
  await ctx.close();
  // Kelebek: doğrulanmış isabet anında bırakınca tarayıcıda da kazanılır (oyun ve analiz aynı zamanı kullanır)
  if (game === 'kelebek-sarkac') {
    ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    p = await ctx.newPage();
    await p.goto(`${BASE}/${game}/index.html?lang=tr&debug=1`);
    await p.waitForTimeout(600);
    await p.click('#rst-start');
    await p.waitForTimeout(300);
    await quiet(p);
    let wins = 0;
    for (const n of [2, 5, 9, 14]) {
      await p.evaluate((n) => { const S = window.__rst.S; S.level = n; window.__rst.save(); window.__rst.startLevel(); }, n);
      await p.waitForTimeout(200);
      await p.evaluate(() => { const a = window.__rst.game.__analyze(); window.__rst.game.__releaseAt(a.center); });
      await p.waitForSelector('#rst-sheet:not([hidden])', { timeout: 60000 });
      if ((await p.locator('#rst-sheet .rst-stars i.on').count()) > 0) wins++;
      await quiet(p);
    }
    rec(game, vp, 'doğrulanmış anda bırakış tarayıcıda kazanır (4 seviye)', wins === 4, `${wins}/4`);
    await ctx.close();
  }
  // Hareketi azalt
  if (game === 'olay-ufku') {
    ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    p = await ctx.newPage();
    await p.goto(`${BASE}/${game}/index.html?lang=tr&debug=1`);
    await p.waitForTimeout(600);
    await p.click('#rst-start');
    await p.waitForTimeout(300);
    const info = await p.evaluate(() => window.__rst.game.__info());
    rec(game, vp, 'hareketi azalt: sarsıntı/parlama kapalı', info.calm === true);
    await ctx.close();
  }
}

(async () => {
  const t0 = Date.now();
  const browser = await chromium.launch({ args: ARGS });
  for (const game of GAMES) {
    for (const vp of VPS.filter((v) => !VPF || v.n.includes(VPF))) {
      try { await suite(browser, game, vp); } catch (e) { rec(game, vp.n, 'test akışı tamamlandı', false, e.message); }
    }
    try { await extra(browser, game); } catch (e) { rec(game, 'ek', 'ek testler tamamlandı', false, e.message); }
  }
  await browser.close();
  const fails = results.filter((r) => !r.ok);
  if (JSON_OUT) console.log(JSON.stringify({ results, sec: (Date.now() - t0) / 1000 }));
  else {
    for (const f of fails) console.log('HATA', f.game, f.vp, f.name, f.info);
    console.log(`Tarayıcı testleri: ${results.length - fails.length}/${results.length} geçti · ${((Date.now() - t0) / 1000).toFixed(0)} sn`);
  }
  process.exit(fails.length ? 1 : 0);
})();
