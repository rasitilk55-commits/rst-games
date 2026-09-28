#!/usr/bin/env node
// Google Play yükleme öncesi kontrol: mağaza metinleri, görseller, sürüm, paket adı, yayın ayarları.
// Kullanım: node tools/playstore-check.mjs [oyun] [--release] [--json]
//   --release  gerçek yayın kontrolü: gizlilik adresi, gerçek AdMob kimlikleri, iletişim e-postası zorunlu
// Ayrıca play-store/<oyun>/MAGAZA-METINLERI.md dosyasını (kopyala-yapıştır için) yeniden üretir.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const RELEASE = args.includes('--release');
const JSON_OUT = args.includes('--json');
const only = args.find((a) => !a.startsWith('--'));
const REL = JSON.parse(readFileSync(join(root, 'yayin-ayarlari.json'), 'utf8'));
const games = Object.keys(REL.oyunlar).filter((g) => (!only || g === only) && existsSync(join(root, 'play-store', g)));
const results = [];
const rec = (game, name, level, ok, info = '') => results.push({ game, name, level, ok: !!ok, info: String(info) });

// PNG başlığından boyut ve renk türü (6 = alfa kanallı)
function png(file) {
  const b = readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25], size: b.length };
}
const FORBIDDEN = /\b(free|best|top|#1|no\.?\s?1|new|sale|discount|download now|install now|ücretsiz|bedava|en iyi|bir numara|indirim|yeni|hemen indir)\b/i;
const EMOJI = /\p{Extended_Pictographic}/u;
const TEST_APP = /3940256099942544/;

for (const game of games) {
  const dir = join(root, 'play-store', game);
  const L = JSON.parse(readFileSync(join(dir, 'listing.json'), 'utf8'));
  const cap = JSON.parse(readFileSync(join(root, 'apps', game, 'capacitor.config.json'), 'utf8'));
  const pkg = JSON.parse(readFileSync(join(root, 'apps', game, 'package.json'), 'utf8'));
  const { release } = await import(join(root, 'apps', game, 'src', 'release.js'));
  const nat = JSON.parse(readFileSync(join(root, 'apps', game, 'rst.native.json'), 'utf8'));
  const R = REL.oyunlar[game];

  // Kimlik ve sürüm
  rec(game, 'paket adı listing.json ile capacitor.config.json aynı', 'hata', L.packageName === cap.appId, `${L.packageName} / ${cap.appId}`);
  rec(game, 'paket adı biçimi (com.şirket.oyun, küçük harf)', 'hata', /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(cap.appId), cap.appId);
  rec(game, 'sürüm 1.2.3 biçiminde ve her yerde aynı', 'hata', /^\d+\.\d+\.\d+$/.test(pkg.version) && pkg.version === release.version && pkg.version === R.surum, `${pkg.version} / ${release.version} / ${R.surum}`);
  const capV = String(pkg.dependencies['@capacitor/android'] || '');
  rec(game, 'Capacitor 8 (Android API 36 hedefi için)', 'hata', /\^?8\./.test(capV), capV);

  // Metinler
  for (const loc of ['tr-TR', 'en-US']) {
    const x = L.listings[loc];
    if (!x) { rec(game, `${loc} mağaza metni var`, 'hata', false); continue; }
    rec(game, `${loc} uygulama adı ≤ 30 karakter`, 'hata', x.title.length <= 30 && x.title.length >= 2, `${x.title.length}: ${x.title}`);
    rec(game, `${loc} kısa açıklama ≤ 80 karakter`, 'hata', x.shortDescription.length <= 80 && x.shortDescription.length > 10, `${x.shortDescription.length}`);
    rec(game, `${loc} tam açıklama ≤ 4000 karakter`, 'hata', x.fullDescription.length <= 4000 && x.fullDescription.length > 200, `${x.fullDescription.length}`);
    rec(game, `${loc} ad ve kısa açıklamada yasaklı ifade/emoji yok (ücretsiz, en iyi, #1, indirim…)`, 'hata',
      !FORBIDDEN.test(x.title) && !FORBIDDEN.test(x.shortDescription) && !EMOJI.test(x.title) && !EMOJI.test(x.shortDescription), x.title + ' | ' + x.shortDescription);
    rec(game, `${loc} adda tamamı büyük harf kelime yok`, 'hata', !/\b[A-ZÇĞİÖŞÜ]{5,}\b/.test(x.title), x.title);
    rec(game, `${loc} açıklama abonelik ve reklam bilgisini içeriyor`, 'uyarı', /abonelik|subscription/i.test(x.fullDescription) && /reklam|ads/i.test(x.fullDescription));
    const wn = join(dir, 'whatsnew', 'whatsnew-' + loc);
    rec(game, `${loc} sürüm notu ≤ 500 karakter`, 'hata', existsSync(wn) && readFileSync(wn, 'utf8').trim().length <= 500 && readFileSync(wn, 'utf8').trim().length > 0);
  }

  // Görseller
  const G = join(dir, 'graphics');
  const icon = existsSync(join(G, 'icon-512.png')) && png(join(G, 'icon-512.png'));
  rec(game, 'simge 512x512, 32 bit PNG (alfa kanallı), ≤ 1 MB', 'hata', icon && icon.w === 512 && icon.h === 512 && icon.colorType === 6 && icon.size <= 1024 * 1024, icon ? `${icon.w}x${icon.h} ${Math.round(icon.size / 1024)} KB` : 'yok');
  for (const loc of ['tr-TR', 'en-US']) {
    const f = join(G, `feature-graphic-${loc}.png`);
    const fg = existsSync(f) && png(f);
    rec(game, `${loc} öne çıkan görsel 1024x500, alfa kanalı yok, ≤ 15 MB`, 'hata', fg && fg.w === 1024 && fg.h === 500 && fg.colorType !== 6 && fg.colorType !== 4 && fg.size <= 15e6, fg ? `${fg.w}x${fg.h} tür ${fg.colorType}` : 'yok');
    for (const [kind, need] of [['phone', true], ['tablet-7', false], ['tablet-10', false]]) {
      const d = join(G, kind, loc);
      const files = existsSync(d) ? readdirSync(d).filter((x) => x.endsWith('.png')).sort() : [];
      if (!need && !files.length) { rec(game, `${loc} ${kind} ekran görüntüsü (isteğe bağlı)`, 'uyarı', false, 'yok'); continue; }
      const bad = [];
      for (const x of files) {
        const im = png(join(d, x));
        const lo = Math.min(im.w, im.h), hi = Math.max(im.w, im.h);
        if (lo < 320 || hi > 3840 || hi > lo * 2 || im.size > 8e6) bad.push(`${x} ${im.w}x${im.h}`);
        if (kind === 'phone' && lo < 1080) bad.push(`${x}: öne çıkma için kısa kenar ≥ 1080 önerilir`);
      }
      rec(game, `${loc} ${kind}: 2–8 ekran görüntüsü, 320–3840 px, en-boy ≤ 2:1`, need ? 'hata' : 'uyarı', files.length >= (need ? 4 : 2) && files.length <= 8 && !bad.length, `${files.length} dosya ${bad.join(', ')}`);
    }
  }

  // Yayın ayarları
  const lvl = RELEASE ? 'hata' : 'uyarı';
  const priv = release.privacyUrl || '';
  rec(game, 'gizlilik politikası adresi gerçek bir https adresi', lvl, /^https:\/\//.test(priv) && !/example\.com|GITHUB-KULLANICI-ADIN/.test(priv), priv);
  rec(game, 'gizlilik politikası sayfası üretildi (docs/gizlilik)', 'uyarı', existsSync(join(root, 'docs', 'gizlilik', game + '.html')));
  rec(game, 'iletişim e-postası girildi (yayin-ayarlari.json > gelistirici.eposta)', lvl, /.+@.+\..+/.test((REL.gelistirici || {}).eposta || ''));
  rec(game, 'AdMob Android uygulama kimliği gerçek (test değil)', lvl, !TEST_APP.test(nat.admobAppId.android), nat.admobAppId.android);
  rec(game, 'AdMob Android reklam birimleri gerçek (test değil)', lvl, !!(release.adUnits && release.adUnits.android && !TEST_APP.test(release.adUnits.android.rewarded)), release.adUnits ? 'girildi' : 'boş → test reklamları');
  rec(game, 'RevenueCat Android anahtarı (yoksa satın alma arayüzü gizlenir, yalnızca reklam geliri)', 'uyarı', /^goog_/.test(release.revenuecat.android || ''), release.revenuecat.android ? 'girildi' : 'boş');

  // Kopyala-yapıştır dosyası
  const md = [`# ${L.listings['tr-TR'].title} · Google Play mağaza metinleri`, '', `Bu dosya \`play-store/${game}/listing.json\` dosyasından üretildi (node tools/playstore-check.mjs). Metni değiştirmek için JSON'u düzenle.`, '',
    `- **Paket adı:** \`${L.packageName}\``, `- **Kategori:** ${L.category}`, `- **Etiketler (en fazla 5):** ${L.tags.join(', ')}`, `- **Gizlilik politikası:** ${priv}`, ''];
  for (const loc of ['tr-TR', 'en-US']) {
    const x = L.listings[loc];
    md.push(`## ${loc === 'tr-TR' ? 'Türkçe (tr-TR, varsayılan dil)' : 'İngilizce (en-US)'}`, '', `**Uygulama adı** (${x.title.length}/30)`, '```', x.title, '```', `**Kısa açıklama** (${x.shortDescription.length}/80)`, '```', x.shortDescription, '```', `**Tam açıklama** (${x.fullDescription.length}/4000)`, '```', x.fullDescription, '```',
      `**Sürüm notu**`, '```', readFileSync(join(dir, 'whatsnew', 'whatsnew-' + loc), 'utf8').trim(), '```', '');
  }
  md.push('## Görseller', '', '| Alan | Dosya |', '|---|---|', '| Uygulama simgesi | `graphics/icon-512.png` |', '| Öne çıkan görsel | `graphics/feature-graphic-tr-TR.png`, `graphics/feature-graphic-en-US.png` |',
    '| Telefon ekran görüntüleri | `graphics/phone/<dil>/01–06.png` (1080x1920) |', '| 7 inç tablet | `graphics/tablet-7/<dil>/01–06.png` (1200x1920) |', '| 10 inç tablet | `graphics/tablet-10/<dil>/01–06.png` (1600x2560) |', '');
  writeFileSync(join(dir, 'MAGAZA-METINLERI.md'), md.join('\n'));
}

const errors = results.filter((r) => !r.ok && r.level === 'hata');
const warns = results.filter((r) => !r.ok && r.level === 'uyarı');
if (JSON_OUT) console.log(JSON.stringify({ results, release: RELEASE }));
else {
  for (const r of errors) console.log('HATA  ', r.game, '·', r.name, r.info ? '· ' + r.info : '');
  for (const r of warns) console.log('UYARI ', r.game, '·', r.name, r.info ? '· ' + r.info : '');
  console.log(`Play kontrolü${RELEASE ? ' (yayın)' : ''}: ${results.length - errors.length - warns.length}/${results.length} tamam · ${errors.length} hata · ${warns.length} uyarı`);
}
process.exit(errors.length ? 1 : 0);
