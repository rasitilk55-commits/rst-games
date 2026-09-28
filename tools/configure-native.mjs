#!/usr/bin/env node
// `npx cap add android|ios` sonrasında yerel projeleri mağazaya hazır hale getirir:
//  Android: AdMob uygulama kimliği, dikey ekran, imzalama (ortam değişkenlerinden), sürüm kodu.
//  iOS: AdMob kimliği, izleme izni metni, SKAdNetwork, dikey ekran, şifreleme beyanı.
// Kullanım: node tools/configure-native.mjs <oyun> [android|ios|all]
// Ayarlar: apps/<oyun>/rst.native.json
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [game, which = 'all'] = process.argv.slice(2);
if (!game) { console.error('Kullanım: node tools/configure-native.mjs <oyun> [android|ios|all]'); process.exit(1); }
const appDir = join(root, 'apps', game);
const cfg = JSON.parse(readFileSync(join(appDir, 'rst.native.json'), 'utf8'));

function patchAndroid() {
  const manifest = join(appDir, 'android/app/src/main/AndroidManifest.xml');
  if (!existsSync(manifest)) { console.log('Android projesi yok, atlandı (önce: npx cap add android)'); return; }
  let m = readFileSync(manifest, 'utf8');
  if (!m.includes('com.google.android.gms.ads.APPLICATION_ID')) {
    m = m.replace('</application>',
      `    <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${cfg.admobAppId.android}"/>\n    </application>`);
  }
  if (!m.includes('android.permission.POST_NOTIFICATIONS')) {
    m = m.replace(/(<manifest[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />');
  }
  if (cfg.portrait && !m.includes('android:screenOrientation')) {
    m = m.replace(/(<activity[^>]*android:name="\.MainActivity")/, '$1\n            android:screenOrientation="portrait"');
  }
  // Capacitor 8: ekran yoğunluğu değişince (ekran yakınlaştırma, katlanabilir cihaz) etkinlik yeniden başlamasın.
  m = m.replace(/android:configChanges="([^"]*)"/, (all, v) => (v.split('|').includes('density') ? all : `android:configChanges="${v}|density"`));
  writeFileSync(manifest, m);

  // Google Play: yeni uygulamalar ve güncellemeler en az API 36'yı hedeflemeli (31 Ağustos 2026'dan beri).
  const vars = join(appDir, 'android/variables.gradle');
  if (existsSync(vars)) {
    const v = readFileSync(vars, 'utf8');
    const t = +(v.match(/targetSdkVersion\s*=\s*(\d+)/) || [])[1];
    if (t && t < 36) { console.error(`HATA: targetSdkVersion ${t} < 36. Capacitor 8 kullanın.`); process.exit(2); }
    console.log('targetSdkVersion:', t || '?');
  }

  const gradle = join(appDir, 'android/app/build.gradle');
  let g = readFileSync(gradle, 'utf8');
  if (!g.includes('RST_KEYSTORE')) {
    g = g.replace(/android\s*\{/, `android {
    signingConfigs {
        release {
            if (System.getenv("RST_KEYSTORE")) {
                storeFile file(System.getenv("RST_KEYSTORE"))
                storePassword System.getenv("RST_KEYSTORE_PASSWORD")
                keyAlias System.getenv("RST_KEY_ALIAS")
                keyPassword System.getenv("RST_KEY_PASSWORD")
            }
        }
    }`);
    g = g.replace(/buildTypes\s*\{\s*release\s*\{/, (s) => s + '\n            signingConfig signingConfigs.release');
  }
  if (!g.includes('RST_VERSION_CODE')) {
    g = g.replace(/versionCode\s+\d+/, 'versionCode ((System.getenv("RST_VERSION_CODE") ?: "1") as Integer)');
    const version = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf8')).version;
    g = g.replace(/versionName\s+"[^"]*"/, `versionName "${version}"`);
  }
  writeFileSync(gradle, g);
  console.log('Android yapılandırıldı:', game);
}

function plistKey(p, key, xml) {
  if (p.includes(`<key>${key}</key>`)) return p;
  const i = p.lastIndexOf('</dict>');
  return p.slice(0, i) + `\t<key>${key}</key>\n\t${xml}\n` + p.slice(i);
}
function patchIos() {
  const plist = join(appDir, 'ios/App/App/Info.plist');
  if (!existsSync(plist)) { console.log('iOS projesi yok, atlandı (önce: npx cap add ios)'); return; }
  let p = readFileSync(plist, 'utf8');
  p = plistKey(p, 'GADApplicationIdentifier', `<string>${cfg.admobAppId.ios}</string>`);
  p = plistKey(p, 'NSUserTrackingUsageDescription', `<string>${cfg.trackingText.en}</string>`);
  p = plistKey(p, 'ITSAppUsesNonExemptEncryption', '<false/>');
  p = plistKey(p, 'SKAdNetworkItems',
    '<array>\n\t\t<dict>\n\t\t\t<key>SKAdNetworkIdentifier</key>\n\t\t\t<string>cstr6suwn9.skadnetwork</string>\n\t\t</dict>\n\t</array>');
  if (cfg.portrait) {
    p = p.replace(/(<key>UISupportedInterfaceOrientations<\/key>\s*<array>)[\s\S]*?(<\/array>)/,
      '$1\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t$2');
    p = plistKey(p, 'UIRequiresFullScreen', '<true/>');
  }
  writeFileSync(plist, p);
  console.log('iOS yapılandırıldı:', game);
}

if (which === 'android' || which === 'all') patchAndroid();
if (which === 'ios' || which === 'all') patchIos();
