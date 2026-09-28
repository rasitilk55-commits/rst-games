#!/usr/bin/env node
// Birim testleri (tarayıcı gerekmez): yardımcılar, ekonomi, ürünler, metinler (TR/EN), fizik, yerel proje ayarlayıcı.
// Kullanım: node tools/test/unit.mjs [--json]
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const results = [];
function t(group, name, fn) {
  try { const r = fn(); results.push({ group, name, ok: r !== false, info: typeof r === 'string' ? r : '' }); }
  catch (e) { results.push({ group, name, ok: false, info: e.message }); }
}
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || ''} beklenen ${JSON.stringify(b)}, gelen ${JSON.stringify(a)}`); };
const ok = (v, m) => { if (!v) throw new Error(m || 'koşul sağlanmadı'); };

const U = await import(join(root, 'packages/kit/src/util.js'));
const E = await import(join(root, 'packages/kit/src/economy.js'));
const { KIT_TEXT } = await import(join(root, 'packages/kit/src/strings.js'));
const GAMES = ['kelebek-sarkac', 'olay-ufku'];
const CFG = {};
for (const g of GAMES) CFG[g] = (await import(join(root, 'apps', g, 'src/config.js'))).config;
const PH = await import(join(root, 'apps/olay-ufku/src/physics.js'));
const OU = await import(join(root, 'apps/olay-ufku/src/levels.js'));

/* ---------- util ---------- */
t('yardımcılar', 'rng aynı tohumla aynı diziyi üretir ve [0,1) aralığında kalır', () => {
  const a = U.rng(42), b = U.rng(42);
  for (let i = 0; i < 1000; i++) { const x = a(); eq(x, b()); ok(x >= 0 && x < 1); }
});
t('yardımcılar', 'rng dağılımı dengeli (10 kutu, 100 bin örnek, ±%5)', () => {
  const r = U.rng(7), bins = Array(10).fill(0);
  for (let i = 0; i < 1e5; i++) bins[Math.floor(r() * 10)]++;
  ok(bins.every((n) => Math.abs(n - 1e4) < 500), bins.join(','));
});
t('yardımcılar', 'hash kararlı ve farklı girdilerde farklı', () => { eq(U.hash('abc'), U.hash('abc')); ok(U.hash('abc') !== U.hash('abd')); });
t('yardımcılar', 'dayKey YYYY-AA-GG biçiminde', () => { eq(U.dayKey(new Date(2026, 0, 5)), '2026-01-05'); });
t('yardımcılar', 'translate: değişken, İngilizceye düşme, anahtara düşme', () => {
  const d = { tr: { a: 'Merhaba {n}' }, en: { a: 'Hi {n}', b: 'B' } };
  ok(['Merhaba 3', 'Hi 3'].includes(U.translate(d, 'a', { n: 3 })));
  eq(U.translate(d, 'b'), 'B');
  eq(U.translate(d, 'yok'), 'yok');
});
t('yardımcılar', 'hexA doğru rgba üretir', () => eq(U.hexA('#FF8000', 0.5), 'rgba(255,128,0,0.5)'));

/* ---------- ürünler ---------- */
const P = E.PRODUCTS;
t('ürünler', 'ürün kimlikleri benzersiz ve Google Play kurallarına uygun (küçük harf, rakam, _ .)', () => {
  const ids = Object.values(P).map((p) => p.id);
  eq(new Set(ids).size, ids.length, 'tekrar eden kimlik');
  for (const id of ids) ok(/^[a-z0-9][a-z0-9_.]{0,138}$/.test(id), 'geçersiz kimlik ' + id);
});
t('ürünler', 'her ürünün türü, TR ve EN fiyatı var; abonelik ve yetkilerin entitlement alanı var', () => {
  for (const [k, p] of Object.entries(P)) {
    ok(['consumable', 'once', 'entitlement', 'sub'].includes(p.kind), k + ' tür');
    ok(p.price && p.price.tr && p.price.en, k + ' fiyat');
    if (p.kind === 'sub' || p.kind === 'entitlement') ok(p.entitlement, k + ' entitlement');
    if (p.kind === 'sub') ok(['week', 'month', 'year'].includes(p.period), k + ' dönem');
  }
});
t('ürünler', 'büyük altın paketleri birim fiyatta daha avantajlı', () => {
  const unit = (p) => parseFloat(p.price.en.replace('$', '')) / p.coins;
  ok(unit(P.coins_m) < unit(P.coins_s) && unit(P.coins_l) < unit(P.coins_m));
});
t('ürünler', 'ücretli rastgele ödül (loot box) yok: çark ücretsiz/ödüllü reklamla, oranlar tanımlı', () => {
  for (const g of GAMES) {
    const w = E.wheel(CFG[g]);
    ok(w.every((s) => s.w > 0), 'ağırlık');
    ok(!Object.values(P).some((p) => /spin|wheel|chest|box/.test(p.id)), 'çark/sandık satılmamalı');
  }
});

/* ---------- ekonomi ---------- */
for (const g of GAMES) {
  const cfg = CFG[g];
  t('ekonomi', `${g}: varsayılan kayıt ve eski kayıt taşıma (migrate)`, () => {
    const d = E.defaults(cfg);
    eq(d.level, 1); ok(d.owned.includes(cfg.skins[0].id));
    const old = { level: 7, coins: 50, noAds: true, best: null, boosters: {} };
    const m = E.migrate(old, cfg);
    eq(m.level, 7); ok(m.ent.no_ads, 'noAds taşınmalı'); ok(m.best && typeof m.best === 'object');
    for (const b of cfg.boosters) eq(m.boosters[b.id], 1);
    const again = E.migrate(JSON.parse(JSON.stringify(m)), cfg);
    eq(again, m, 'ikinci taşıma değişiklik yapmamalı');
  });
  t('ekonomi', `${g}: Altın Yol 30 kademe, sezon görünümleri ödüllerde`, () => {
    const r = E.passRewards(cfg);
    eq(r.free.length, E.PASS_TIERS); eq(r.prem.length, E.PASS_TIERS);
    for (const s of cfg.skins.filter((s) => s.pass)) ok(r.prem.some((x) => x.type === 'skin' && x.id === s.id), 'eksik ' + s.id);
  });
  t('ekonomi', `${g}: 7 günlük takvim, ödüller geçerli`, () => {
    const c = E.calendar(cfg);
    eq(c.length, 7);
    for (const x of c) ok(x.type === 'coins' ? x.n > 0 : x.type === 'booster' ? cfg.boosters.some((b) => b.id === x.id) : cfg.skins.some((s) => s.id === x.id));
  });
  t('ekonomi', `${g}: çark oranları doğru uygulanır (200 bin çevirme, ±%10)`, () => {
    const w = E.wheel(cfg), tot = w.reduce((s, x) => s + x.w, 0), cnt = w.map(() => 0), r = U.rng(99);
    for (let i = 0; i < 2e5; i++) cnt[E.pickWheel(w, r)]++;
    w.forEach((s, i) => { const exp = (s.w / tot) * 2e5; ok(Math.abs(cnt[i] - exp) < exp * 0.1 + 50, `dilim ${i}: ${cnt[i]} / ${exp}`); });
  });
  t('ekonomi', `${g}: görünümler geçerli (benzersiz kimlik, fiyat veya kaynak)`, () => {
    const ids = cfg.skins.map((s) => s.id);
    eq(new Set(ids).size, ids.length);
    for (const s of cfg.skins.slice(1)) ok(s.price > 0 || s.starter || s.vip || s.pass || s.calendar || s.pack, 'kaynaksız görünüm ' + s.id);
  });
}
t('ekonomi', 'günlük görevler: 3 farklı görev, ilerleme hedefte durur', () => {
  const S = E.defaults(CFG['olay-ufku']);
  const Q = E.ensureQuests(S);
  eq(Q.list.length, 3); eq(new Set(Q.list.map((q) => q.type)).size, 3);
  const q = Q.list[0];
  for (let i = 0; i < 50; i++) E.questEvent(S, q.type);
  eq(q.progress, q.target);
});
t('ekonomi', 'başlangıç paketi süresi 48 saat, satın alınınca 0', () => {
  const S = E.defaults(CFG['olay-ufku']);
  S.offers.starterAt = Date.now();
  const left = E.starterLeftMs(S);
  ok(left > 47.9 * 3600e3 && left <= 48 * 3600e3);
  S.offers.starterBought = true; eq(E.starterLeftMs(S), 0);
});

/* ---------- metinler ---------- */
const keysOf = (o) => Object.keys(o).sort();
const vars = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(',');
function parity(label, dict) {
  t('metinler', `${label}: TR ve EN anahtarları aynı`, () => {
    const a = keysOf(dict.tr), b = keysOf(dict.en);
    const miss = a.filter((k) => !b.includes(k)).map((k) => 'EN eksik: ' + k).concat(b.filter((k) => !a.includes(k)).map((k) => 'TR eksik: ' + k));
    ok(miss.length === 0, miss.join(', '));
  });
  t('metinler', `${label}: boş metin yok, değişkenler ({n} vb.) iki dilde aynı`, () => {
    const bad = [];
    for (const k of Object.keys(dict.tr)) {
      if (!String(dict.tr[k]).trim() || !String(dict.en[k] ?? 'x').trim()) bad.push('boş ' + k);
      if (dict.en[k] != null && vars(dict.tr[k]) !== vars(dict.en[k])) bad.push('değişken ' + k);
    }
    ok(bad.length === 0, bad.join(', '));
  });
}
parity('RST Kit', KIT_TEXT);
for (const g of GAMES) {
  parity(g, CFG[g].texts);
  t('metinler', `${g}: görünüm, güç adları ve açıklamaları iki dilde`, () => {
    for (const s of CFG[g].skins) ok(s.name.tr && s.name.en, s.id);
    for (const b of CFG[g].boosters) ok(b.name.tr && b.name.en && b.desc.tr && b.desc.en, b.id);
  });
}
t('metinler', 'Olay Ufku: her bölüm için ad ve giriş metni var', () => {
  const tx = CFG['olay-ufku'].texts;
  for (const L of ['tr', 'en']) for (let i = 0; i <= 7; i++) ok(tx[L]['ch' + i], L + ' ch' + i);
  for (const L of ['tr', 'en']) for (let i = 1; i <= 7; i++) ok(tx[L]['chIntro' + i], L + ' chIntro' + i);
});

/* ---------- fizik ---------- */
t('fizik', 'simulate belirlenimci (aynı atış → aynı sonuç)', () => {
  for (const L of OU.LEVELS.slice(0, 20)) {
    const a = PH.simulate(L, L.sol.a, L.sol.p), b = PH.simulate(L, L.sol.a, L.sol.p);
    eq([a.kind, a.steps, a.got], [b.kind, b.steps, b.got]);
  }
});
t('fizik', 'aynalanmış seviye çözümüyle aynı sonucu verir; iki kez aynalama özdeş', () => {
  for (const L of OU.LEVELS.slice(40, 70)) {
    const M = PH.mirrorLevel(L);
    eq(PH.simulate(M, M.sol.a, M.sol.p).kind, 'win');
    const MM = PH.mirrorLevel(M);
    eq(MM.portal.x, L.portal.x); eq(MM.holes.map((h) => h.x), L.holes.map((h) => h.x));
  }
});
t('fizik', 'aimFromPull: kısa çekiş yok sayılır, açı yukarı yönle sınırlı, güç ≤ 1', () => {
  eq(PH.aimFromPull(2, 2), null);
  for (let i = 0; i < 500; i++) {
    const r = PH.aimFromPull(Math.cos(i) * (10 + i), Math.sin(i * 1.7) * (10 + i));
    if (!r) continue;
    ok(r.a >= PH.A_MIN && r.a <= PH.A_MAX && r.p > 0 && r.p <= 1);
  }
});
t('fizik', 'segDist2: parça üzerindeki en yakın nokta', () => { eq(PH.segDist2(0, 0, 10, 0, 5, 3), 9); eq(PH.segDist2(0, 0, 10, 0, 13, 4), 25); });
t('fizik', '100 kampanya + 60 günlük seviye, hepsinin kayıtlı çözümü kazanır', () => {
  eq(OU.LEVELS.length, 100); eq(OU.DAILY.length, 60);
  for (const L of [...OU.LEVELS, ...OU.DAILY]) { eq(PH.simulate(L, L.sol.a, L.sol.p).kind, 'win'); eq(PH.simulate(L, L.sol3.a, L.sol3.p).got.every(Boolean), true); }
});

/* ---------- yerel proje ayarlayıcı (Capacitor 8 örnek projesi üzerinde) ---------- */
t('yerel ayar', 'configure-native: AdMob kimliği, bildirim izni, dikey ekran, density, imza, sürüm; iki kez çalıştırmak güvenli', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'rst-native-'));
  try {
    const app = join(tmp, 'apps', 'olay-ufku');
    mkdirSync(join(app, 'android/app/src/main'), { recursive: true });
    mkdirSync(join(tmp, 'tools'), { recursive: true });
    cpSync(join(root, 'tools/configure-native.mjs'), join(tmp, 'tools/configure-native.mjs'));
    cpSync(join(root, 'apps/olay-ufku/rst.native.json'), join(app, 'rst.native.json'));
    writeFileSync(join(app, 'package.json'), JSON.stringify({ version: '1.2.3' }));
    // Capacitor 8 şablonundaki biçim
    writeFileSync(join(app, 'android/app/src/main/AndroidManifest.xml'), `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application android:allowBackup="true" android:icon="@mipmap/ic_launcher" android:label="@string/app_name" android:theme="@style/AppTheme">
        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">
        </activity>
    </application>
    <uses-permission android:name="android.permission.INTERNET" />
</manifest>
`);
    writeFileSync(join(app, 'android/app/build.gradle'), `apply plugin: 'com.android.application'
android {
    namespace "com.rstgames.olayufku"
    compileSdk rootProject.ext.compileSdkVersion
    defaultConfig {
        applicationId "com.rstgames.olayufku"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
`);
    writeFileSync(join(app, 'android/variables.gradle'), 'ext {\n    minSdkVersion = 24\n    compileSdkVersion = 36\n    targetSdkVersion = 36\n}\n');
    const run = () => execFileSync('node', [join(tmp, 'tools/configure-native.mjs'), 'olay-ufku', 'android'], { encoding: 'utf8', stdio: 'pipe' });
    run(); run();
    const m = readFileSync(join(app, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
    const g = readFileSync(join(app, 'android/app/build.gradle'), 'utf8');
    ok((m.match(/gms\.ads\.APPLICATION_ID/g) || []).length === 1, 'AdMob kimliği bir kez');
    ok((m.match(/POST_NOTIFICATIONS/g) || []).length === 1, 'bildirim izni bir kez');
    ok((m.match(/screenOrientation="portrait"/g) || []).length === 1, 'dikey ekran');
    ok(/configChanges="[^"]*\|density"/.test(m) && (m.match(/density/g) || []).length === 1, 'density bir kez');
    ok((g.match(/signingConfig signingConfigs\.release/g) || []).length === 1, 'imza bir kez');
    ok(g.includes('RST_VERSION_CODE') && g.includes('versionName "1.2.3"'), 'sürüm');
    // targetSdk 35 ise hata vermeli
    writeFileSync(join(app, 'android/variables.gradle'), 'ext {\n    targetSdkVersion = 35\n}\n');
    let failed = false;
    try { run(); } catch (e) { failed = true; }
    ok(failed, 'targetSdk 35 reddedilmeli');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

/* ---------- sonuç ---------- */
const fails = results.filter((r) => !r.ok);
if (process.argv.includes('--json')) console.log(JSON.stringify({ results }));
else {
  for (const f of fails) console.log('HATA', f.group, '·', f.name, '·', f.info);
  console.log(`Birim testleri: ${results.length - fails.length}/${results.length} geçti`);
}
process.exit(fails.length ? 1 : 0);
