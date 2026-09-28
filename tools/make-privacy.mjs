#!/usr/bin/env node
// Her oyun için Türkçe + İngilizce gizlilik politikası sayfası üretir: docs/gizlilik/<oyun>.html
// Bilgiler yayin-ayarlari.json > gelistirici alanından gelir. GitHub Pages (Settings > Pages > /docs) ile yayınlanabilir.
// Bu metin genel bir şablondur, hukuki danışmanlık değildir.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = JSON.parse(readFileSync(join(root, 'yayin-ayarlari.json'), 'utf8'));
const dev = R.gelistirici || {};
const name = dev.ad || 'RST Games';
const mail = dev.eposta || '[E-POSTA ADRESİ]';
const date = new Date().toISOString().slice(0, 10);
const out = join(root, 'docs', 'gizlilik');
mkdirSync(out, { recursive: true });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const page = (tr, en) => `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(tr)} · Gizlilik Politikası / Privacy Policy</title>
<style>
  body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; max-width: 720px; margin: 0 auto; padding: 32px 16px 64px; line-height: 1.6; color: #22212b; background: #fbfaf7; }
  h1 { font-size: 28px; margin-bottom: 4px; } h2 { font-size: 20px; margin-top: 32px; }
  .muted { color: #6a6878; font-size: 14px; } hr { border: 0; border-top: 1px solid #ddd; margin: 48px 0; }
  table { border-collapse: collapse; width: 100%; font-size: 15px; } td, th { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }
</style>
</head>
<body>
<h1>${esc(tr)} · Gizlilik Politikası</h1>
<p class="muted">Son güncelleme: ${date} · Geliştirici: ${esc(name)} · İletişim: <a href="mailto:${esc(mail)}">${esc(mail)}</a></p>
<p>Bu politika, ${esc(name)} tarafından Google Play ve App Store'da yayınlanan <strong>${esc(tr)}</strong> (${esc(en)}) mobil oyunu için geçerlidir. Oyunda hesap açılmaz; ad, e-posta, telefon, fotoğraf, konum izni veya kişi listesi istenmez.</p>
<h2>Hangi veriler işlenir?</h2>
<table>
<tr><th>Veri</th><th>Neden</th><th>Nerede</th></tr>
<tr><td>Oyun ilerlemesi (seviyeler, altın, görünümler, ayarlar)</td><td>Oyunun çalışması</td><td>Yalnızca cihazınızda. Sunucumuza gönderilmez.</td></tr>
<tr><td>Reklam kimliği, IP adresi, yaklaşık konum, cihaz ve uygulama bilgileri, reklam etkileşimleri</td><td>Reklam göstermek, ölçmek, dolandırıcılığı önlemek</td><td>Google AdMob (Google LLC). <a href="https://policies.google.com/technologies/partner-sites">Google'ın politikası</a></td></tr>
<tr><td>Satın alma geçmişi ve anonim kullanıcı kimliği</td><td>Satın almaları doğrulamak ve geri yüklemek</td><td>RevenueCat Inc. ve Google Play / App Store. Kart bilgilerinizi biz görmeyiz.</td></tr>
<tr><td>Bildirim tercihi</td><td>Günlük ödül hatırlatması (cihazda planlanan yerel bildirim)</td><td>Yalnızca cihazınızda</td></tr>
</table>
<p>Veriler aktarım sırasında şifrelenir (HTTPS). Verileri satmayız.</p>
<h2>Seçimleriniz</h2>
<ul>
<li>Avrupa Ekonomik Alanı, Birleşik Krallık ve İsviçre'de ilk açılışta reklam onay formu gösterilir; onayınızı dilediğiniz zaman değiştirebilirsiniz.</li>
<li>iOS'ta reklam takibi için izin istenir; reddederseniz kişiselleştirilmemiş reklamlar gösterilir.</li>
<li>Android'de reklam kimliğinizi Ayarlar &gt; Google &gt; Reklamlar bölümünden sıfırlayabilir veya silebilirsiniz.</li>
<li>Bildirimleri cihaz ayarlarından kapatabilirsiniz.</li>
<li>Reklamsız paket veya VIP ile reklamları kapatabilirsiniz.</li>
</ul>
<h2>Verilerin silinmesi</h2>
<p>Oyun içindeki Ayarlar &gt; İlerlemeyi sıfırla ile ya da uygulamayı silerek cihazdaki tüm oyun verilerini silebilirsiniz. Reklam ve satın alma sağlayıcılarının tuttuğu verilerle ilgili talepleriniz (KVKK / GDPR: erişim, düzeltme, silme) için <a href="mailto:${esc(mail)}">${esc(mail)}</a> adresine yazın; 30 gün içinde yanıtlarız.</p>
<h2>Çocuklar</h2>
<p>Oyun 13 yaş altındaki çocuklara yönelik değildir ve bilerek 13 yaş altından kişisel veri toplamayız.</p>
<h2>Değişiklikler</h2>
<p>Bu politikayı güncellersek bu sayfadaki tarihi değiştiririz.</p>
<hr>
<div lang="en">
<h1>${esc(en)} · Privacy Policy</h1>
<p class="muted">Last updated: ${date} · Developer: ${esc(name)} · Contact: <a href="mailto:${esc(mail)}">${esc(mail)}</a></p>
<p>This policy applies to the <strong>${esc(en)}</strong> (${esc(tr)}) mobile game published by ${esc(name)} on Google Play and the App Store. The game has no accounts and does not ask for your name, email, phone number, photos, location permission or contacts.</p>
<h2>What data is processed?</h2>
<table>
<tr><th>Data</th><th>Why</th><th>Where</th></tr>
<tr><td>Game progress (levels, coins, looks, settings)</td><td>To run the game</td><td>Only on your device. Never sent to our servers.</td></tr>
<tr><td>Advertising ID, IP address, approximate location, device and app info, ad interactions</td><td>To show and measure ads and prevent fraud</td><td>Google AdMob (Google LLC). <a href="https://policies.google.com/technologies/partner-sites">Google's policy</a></td></tr>
<tr><td>Purchase history and an anonymous user ID</td><td>To validate and restore purchases</td><td>RevenueCat Inc. and Google Play / App Store. We never see your card details.</td></tr>
<tr><td>Notification preference</td><td>Daily reward reminder (local notification scheduled on the device)</td><td>Only on your device</td></tr>
</table>
<p>Data is encrypted in transit (HTTPS). We do not sell data.</p>
<h2>Your choices</h2>
<ul>
<li>In the EEA, UK and Switzerland an ad consent form is shown on first launch; you can change your choice at any time.</li>
<li>On iOS you are asked for permission to track; if you decline, non-personalized ads are shown.</li>
<li>On Android you can reset or delete your advertising ID in Settings &gt; Google &gt; Ads.</li>
<li>You can turn off notifications in the device settings.</li>
<li>The No-Ads Pack or VIP removes ads.</li>
</ul>
<h2>Deleting your data</h2>
<p>Use Settings &gt; Reset progress in the game or uninstall the app to delete all game data on your device. For requests about data held by our ad and purchase providers (access, correction, deletion under GDPR), email <a href="mailto:${esc(mail)}">${esc(mail)}</a>; we reply within 30 days.</p>
<h2>Children</h2>
<p>The game is not directed at children under 13, and we do not knowingly collect personal data from children under 13.</p>
<h2>Changes</h2>
<p>If we update this policy, we will change the date on this page.</p>
</div>
</body>
</html>
`;

const links = [];
for (const game of Object.keys(R.oyunlar)) {
  const { config } = await import(join(root, 'apps', game, 'src', 'config.js'));
  const tr = config.texts.tr.title, en = config.texts.en.title;
  writeFileSync(join(out, `${game}.html`), page(tr, en));
  links.push(`<li><a href="${game}.html">${esc(tr)} / ${esc(en)}</a></li>`);
  console.log('docs/gizlilik/' + game + '.html');
}
writeFileSync(join(out, 'index.html'), `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(name)} · Gizlilik</title></head><body style="font-family:system-ui;max-width:720px;margin:auto;padding:32px 16px"><h1>${esc(name)}</h1><ul>${links.join('')}</ul></body></html>\n`);
writeFileSync(join(root, 'docs', '.nojekyll'), '');
if (!dev.eposta) console.log('UYARI: yayin-ayarlari.json > gelistirici.eposta boş. Play gizlilik politikasında iletişim adresi ister.');
