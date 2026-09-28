#!/usr/bin/env node
// Bütün testleri sırayla çalıştırır ve docs/TEST-RAPORU.md dosyasını yazar.
// Kullanım:
//   node tools/test/run-all.mjs              tam paket (tarayıcı testleri dahil, ~15 dk)
//   node tools/test/run-all.mjs --quick      tarayıcısız hızlı paket (CI; ~1 dk)
//   seçenekler: --game <oyun>  yalnızca o oyunun mağaza kontrolü · --release  yayın kontrolü (gerçek kimlikler zorunlu)
// Tarayıcı testleri Playwright ister (npm i -D playwright && npx playwright install chromium).
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const QUICK = argv.includes('--quick');
const RELEASE = argv.includes('--release');
const gi = argv.indexOf('--game');
const GAME = gi >= 0 ? argv[gi + 1] : null;
const steps = [];

// Alt süreçler eşzamansız çalışır: aynı süreçteki test sunucusu bu sırada isteklere yanıt verebilsin.
function exec(cmd, args, env, timeout) {
  return new Promise((resolve) => {
    const ch = spawn(cmd, args, { cwd: root, env: { ...process.env, ...env } });
    let out = '';
    ch.stdout.on('data', (d) => { out += d; });
    ch.stderr.on('data', (d) => { out += d; });
    const timer = setTimeout(() => { out += '\n[zaman aşımı]'; ch.kill('SIGKILL'); }, timeout);
    ch.on('close', (status) => { clearTimeout(timer); resolve({ out, status }); });
  });
}
async function run(name, cmd, args, opts = {}) {
  const t0 = Date.now();
  const { out, status } = await exec(cmd, args, opts.env || {}, opts.timeout || 30 * 60e3);
  const ok = opts.check ? opts.check(out, status) : status === 0;
  const sec = (Date.now() - t0) / 1000;
  const summary = opts.summary ? opts.summary(out) : out.trim().split('\n').pop();
  steps.push({ name, ok, sec, summary, out, detail: opts.detail ? opts.detail(out) : '' });
  console.log(`${ok ? '✓' : '✗'} ${name} · ${summary} · ${sec.toFixed(0)} sn`);
  return { ok, out };
}
const lastJson = (out) => { const l = out.trim().split('\n').reverse().find((x) => x.startsWith('{')); return l ? JSON.parse(l) : null; };

// Basit statik sunucu (dist-web) — tarayıcı testleri için
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
function serve(dir) {
  return new Promise((res) => {
    const srv = createServer((req, rsp) => {
      const p = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
      let f = join(dir, p);
      if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
      if (!f.startsWith(dir) || !existsSync(f)) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' });
      rsp.end(readFileSync(f));
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

const t0 = Date.now();
// 1) Birim testleri
await run('Birim testleri (yardımcılar, ekonomi, ürünler, metinler, fizik, yerel ayar)', 'node', ['tools/test/unit.mjs', '--json'], {
  summary: (o) => { const j = lastJson(o); if (!j) return 'çıktı yok'; const f = j.results.filter((r) => !r.ok); return `${j.results.length - f.length}/${j.results.length} geçti`; },
  detail: (o) => { const j = lastJson(o); return j ? j.results.map((r) => `| ${r.ok ? '✅' : '❌'} | ${r.group} | ${r.name}${r.info ? ' · ' + r.info : ''} |`).join('\n') : ''; },
});
// 2) Kelebek Sarkaç seviye çözülebilirliği
await run('Kelebek Sarkaç: seviye çözülebilirliği (4 ekran × 40 seviye + 8 günlük)', 'node', ['tools/test/kelebek-levels.mjs', QUICK ? '25' : '40', '--json'], {
  summary: (o) => { const j = lastJson(o); if (!j) return 'çıktı yok'; const s = j.summary; return `${s.total - j.rows.filter((r) => !r.ok).length}/${s.total} geçti · isabet oranı %${(s.early * 100).toFixed(0)} → %${(s.late * 100).toFixed(0)} · en dar pencere ${s.minWindowMs} ms`; },
  detail: (o) => {
    const j = lastJson(o); if (!j) return '';
    const rows = j.rows.filter((r) => r.screen === '390x844');
    return '| Seviye | İsabet oranı | En geniş pencere | Gereken | 3 dokunuş (orta, ±%30) |\n|---|---|---|---|---|\n' +
      rows.map((r) => `| ${r.id} | %${(r.rate * 100).toFixed(1)} | ${r.windowMs} ms | ≥ ${r.needMs} ms | ${r.ok ? '✅ kazanır' : '❌'} |`).join('\n');
  },
});
// 3) Olay Ufku bağımsız doğrulayıcı
await run('Olay Ufku: 160 seviyenin bağımsız doğrulaması (+ sonsuz mod 101–400)', 'node', ['tools/olay-ufku/verify.mjs'], {
  summary: (o) => o.trim().split('\n').slice(-2).join(' · '),
});
// 4) Play Store kontrolü
await run(`Google Play mağaza kontrolü${RELEASE ? ' (yayın modu)' : ''}`, 'node', ['tools/playstore-check.mjs', ...(GAME ? [GAME] : []), ...(RELEASE ? ['--release'] : []), '--json'], {
  summary: (o) => { const j = lastJson(o); if (!j) return 'çıktı yok'; const e = j.results.filter((r) => !r.ok && r.level === 'hata').length, w = j.results.filter((r) => !r.ok && r.level === 'uyarı').length; return `${j.results.length} kontrol · ${e} hata · ${w} uyarı`; },
  detail: (o) => { const j = lastJson(o); return j ? j.results.map((r) => `| ${r.ok ? '✅' : r.level === 'hata' ? '❌' : '⚠️'} | ${r.game} | ${r.name}${r.info && !r.ok ? ' · ' + r.info : ''} |`).join('\n') : ''; },
});

// 5) Tarayıcı testleri
if (!QUICK) {
  for (const g of ['kelebek-sarkac', 'olay-ufku']) await run(`Web çıktısı: ${g}`, 'node', ['tools/web-export.mjs', g]);
  const srv = await serve(join(root, 'dist-web'));
  const env = { RST_PREVIEW: `http://127.0.0.1:${srv.address().port}` };
  await run('Tarayıcı uçtan uca: 2 oyun × 4 ekran (+ satın alma kapalı, hareketi azalt, çevrimdışı)', 'node', ['tools/test/e2e.cjs', '--json', '--shots'], {
    env,
    summary: (o) => { const j = lastJson(o); if (!j) return 'çıktı yok'; const f = j.results.filter((r) => !r.ok); return `${j.results.length - f.length}/${j.results.length} geçti`; },
    detail: (o) => {
      const j = lastJson(o); if (!j) return '';
      const names = [...new Set(j.results.map((r) => r.name))];
      const cols = [...new Set(j.results.map((r) => r.game + ' ' + r.vp))];
      const cell = (n, c) => { const r = j.results.find((x) => x.name === n && x.game + ' ' + x.vp === c); return r ? (r.ok ? '✅' : '❌ ' + r.info) : '·'; };
      return `| Kontrol | ${cols.join(' | ')} |\n|---|${cols.map(() => '---').join('|')}|\n` + names.map((n) => `| ${n} | ${cols.map((c) => cell(n, c)).join(' | ')} |`).join('\n');
    },
  });
  const lv = Array.from({ length: 100 }, (_, i) => String(i + 1)).concat(['101', '130', '161', '220', '400']);
  await run('Olay Ufku: 100 seviye + sonsuz mod gerçek sürükleme ile 3 yıldız', 'node', ['tools/olay-ufku/play-test.cjs', ...lv], {
    env: { ...env, ONEVP: '1', DAILY: '1' },
    check: (o) => { const m = o.match(/3 yıldız ile geçilen: (\d+) \/ (\d+)/); return !!m && m[1] === m[2] && /ERR \[\]/.test(o); },
    summary: (o) => (o.match(/3 yıldız ile geçilen: \d+ \/ \d+/) || ['çıktı yok'])[0],
  });
  srv.close();
}

// Rapor
const all = steps.every((s) => s.ok);
const date = new Date().toISOString().replace('T', ' ').slice(0, 16);
const md = [
  '# RST Games · Yayın Öncesi Test Raporu', '',
  `Tarih: ${date} UTC · Mod: ${QUICK ? 'hızlı (tarayıcısız)' : 'tam'}${RELEASE ? ' · yayın kontrolü' : ''} · Süre: ${((Date.now() - t0) / 60000).toFixed(1)} dk`, '',
  `**Sonuç: ${all ? '✅ Bütün testler geçti' : '❌ Başarısız test var'}**`, '',
  '| Test | Sonuç | Özet | Süre |', '|---|---|---|---|',
  ...steps.map((s) => `| ${s.name} | ${s.ok ? '✅' : '❌'} | ${s.summary} | ${s.sec.toFixed(0)} sn |`), '',
  '## Neler test ediliyor?', '',
  '- **Birim:** rastgele sayı üreticisi, ürün kimlikleri (Play kuralları), fiyat tutarlılığı, ücretli ganimet kutusu olmadığı, kayıt taşıma, Altın Yol, takvim, çark oranları (200 bin çevirme), TR/EN metin eşliği ve değişkenler, fizik belirlenimciliği, aynalama, Capacitor 8 Android projesinin mağaza ayarları (targetSdk 36 zorunluluğu dahil).',
  '- **Kelebek Sarkaç:** Her seviye 4 farklı ekran boyutunda kurulur; en geniş isabet penceresi ölçülür ve insanın yakalayabileceği sınırdan (ilk seviyeler 125 ms, orta 83 ms, ileri 58 ms) dar olan seviye kabul edilmez. Oyun döngüsü kare kare oynatılır: pencerenin ortasında ve %30 kaydırılmış iki anda dokunuş gerçekten kazanır.',
  '- **Olay Ufku:** 160 seviye üreticiden bağımsız fizikle yeniden çözülür: kayıtlı çözüm kazanır, 3 yıldızlık çözüm tüm tozları toplar, insan hatası toleransı, doğrudan atışla geçilemezlik, bölüm mekaniği kullanımı; sonsuz mod 101–400 ve 60 günlük seviye.',
  '- **Tarayıcı:** 360x640, 390x844, 412x915, 800x1280 ekranlarda yatay taşma, 40 px altı dokunma hedefi, kırpılan metin, seviye haritası, kilitli seviye, oynanış, mağaza sekmeleri, pencereler, dil kalıcılığı, çevrimdışı oynanış, konsol hataları; satın alma anahtarı yokken ücretli ürünlerin gizlenmesi; "hareketi azalt" ayarı.',
  '- **Google Play:** ad ≤ 30, kısa açıklama ≤ 80, tam açıklama ≤ 4000 karakter, yasaklı ifadeler, simge 512x512, öne çıkan görsel 1024x500 alfasız, ekran görüntüsü boyut ve oranları, sürüm tutarlılığı, paket adı, yayın kimlikleri.', '',
];
for (const s of steps.filter((s) => s.detail)) md.push(`## ${s.name}`, '', s.detail.startsWith('|') && !s.detail.startsWith('| Kontrol') && !s.detail.startsWith('| Seviye') ? '| Durum | Grup | Kontrol |\n|---|---|---|\n' + s.detail : s.detail, '');
const fails = steps.filter((s) => !s.ok);
if (fails.length) { md.push('## Hata çıktıları', ''); for (const s of fails) md.push(`### ${s.name}`, '```', s.out.slice(-4000), '```', ''); }
md.push('Olay Ufku seviye ayrıntıları: [olay-ufku-test-raporu.md](olay-ufku-test-raporu.md) · Ekran görüntüleri: `docs/qa/`', '');
writeFileSync(join(root, 'docs', 'TEST-RAPORU.md'), md.join('\n'));
console.log(`\n${all ? 'BÜTÜN TESTLER GEÇTİ' : 'BAŞARISIZ TEST VAR'} → docs/TEST-RAPORU.md`);
process.exit(all ? 0 : 1);
