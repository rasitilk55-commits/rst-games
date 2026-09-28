#!/usr/bin/env node
// Olay Ufku tarayıcı testi: bölümleri gerçek parmak hareketiyle (fare sürükleme) oynar ve 3 yıldızla geçildiğini doğrular.
// Önce: node tools/web-export.mjs olay-ufku && (cd dist-web && python3 -m http.server 8765)
// Kullanım: node tools/olay-ufku/play-test.cjs 1 2 3 ... (seviye numaraları)
//   ONEVP=1  yalnızca 390x844 ekranda çalıştır (varsayılan: 390x844 ve 360x640)
//   DAILY=1  günün bölümünü de oyna
// Playwright gerekir: npm i -D playwright
const { chromium } = require('playwright');
const LEVELS = process.argv.slice(2).map(Number);
(async()=>{
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const res=[];const errs=[];
 for (const vp of (process.env.ONEVP?[{width:390,height:844}]:[{width:390,height:844},{width:360,height:640}])) {
  const p=await b.newPage({viewport:vp,deviceScaleFactor:1});
  p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/ERR_|Failed to load/.test(m.text()))errs.push(m.text())});
  await p.goto((process.env.RST_PREVIEW || 'http://127.0.0.1:8765') + '/olay-ufku/index.html?lang=tr&debug=1');await p.waitForTimeout(800);await p.click('#rst-start');await p.evaluate(()=>window.__rst.game.__speed(12));
  for (const n of (vp.width===360? LEVELS.slice(0,6): LEVELS)) {
    await p.evaluate(n=>{const S=window.__rst.S;S.level=n;S.offers.starterAt=S.offers.starterAt||Date.now();S.notifAsked=true;window.__rst.save();document.querySelectorAll('.rst-ov').forEach(e=>e.hidden=true);window.__rst.startLevel();},n);
    await p.waitForTimeout(350);
    const info=await p.evaluate(()=>window.__rst.game.__info());
    const [a,pw]=await p.evaluate(()=>window.__rst.game.__win());
    const d=await p.evaluate(([a,pw])=>window.__rst.game.__dragFor(a,pw),[a,pw]);
    await p.mouse.move(d.x0,d.y0);await p.mouse.down();await p.mouse.move(d.x1,d.y1,{steps:6});await p.mouse.up();
    await p.waitForSelector('#rst-sheet:not([hidden])',{timeout:60000});
    const stars=await p.locator('#rst-sheet .rst-stars i.on').count();
    const title=await p.locator('#rst-sheet h2').innerText();
    res.push(`${vp.width}x${vp.height} L${n} (ch${info.ch}${info.mirrored?' ayna':''}): ${title} ${'★'.repeat(stars)}`);
    if (n===LEVELS[0] && vp.width===390){ // bilerek kötü atış: aşağı yakın, çok zayıf
      await p.click('#rst-sheet button');await p.waitForTimeout(350);
      await p.mouse.move(200,300);await p.mouse.down();await p.mouse.move(200,305,{steps:2});await p.mouse.up(); // p çok küçük → atış olmamalı
      await p.waitForTimeout(400);const st=await p.evaluate(()=>window.__rst.game.__info().state);res.push('zayıf çekiş atış yapmadı: '+(st==='aim'));
      await p.mouse.move(200,300);await p.mouse.down();await p.mouse.move(330,300,{steps:4});await p.mouse.up();
      await p.waitForSelector('#rst-sheet:not([hidden])',{timeout:60000});res.push('bilinçli yanlış atış: '+await p.locator('#rst-sheet h2').innerText());
    }
  }
  if (process.env.DAILY) {
    await p.evaluate(()=>{document.querySelectorAll('.rst-ov').forEach(e=>e.hidden=true);});
    await p.click('#rst-todaybtn');await p.click('#rst-dailyplay');await p.waitForTimeout(400);
    const info=await p.evaluate(()=>window.__rst.game.__info());
    const [a,pw]=await p.evaluate(()=>window.__rst.game.__win());
    const d=await p.evaluate(([a,pw])=>window.__rst.game.__dragFor(a,pw),[a,pw]);
    await p.mouse.move(d.x0,d.y0);await p.mouse.down();await p.mouse.move(d.x1,d.y1,{steps:6});await p.mouse.up();
    await p.waitForSelector('#rst-sheet:not([hidden])',{timeout:60000});
    res.push(`GÜNLÜK ${info.id}: ${await p.locator('#rst-sheet h2').innerText()} ${'★'.repeat(await p.locator('#rst-sheet .rst-stars i.on').count())}`);
  }
  await p.close();
 }
 const ok=res.filter(r=>r.includes('★★★')).length;console.log(res.filter(r=>!r.includes('★★★')).join('\n'));console.log('3 yıldız ile geçilen:',ok,'/',res.filter(r=>/L\d|GÜNLÜK/.test(r)).length);console.log('ERR',errs);await b.close();
})();
