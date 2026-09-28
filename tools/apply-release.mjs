#!/usr/bin/env node
// yayin-ayarlari.json → her oyunun src/release.js, rst.native.json (AdMob uygulama kimliği) ve package.json sürümü.
// Kullanım: node tools/apply-release.mjs [oyun]
// Gizlilik adresinde {oyun} yazarsa oyun klasör adıyla değiştirilir (örn. .../{oyun}/gizlilik.html).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = JSON.parse(readFileSync(join(root, 'yayin-ayarlari.json'), 'utf8'));
const only = process.argv[2];
const TEST_APP = { android: 'ca-app-pub-3940256099942544~3347511713', ios: 'ca-app-pub-3940256099942544~1458002511' };
const APP_RE = /^ca-app-pub-\d{16}~\d{10}$/, UNIT_RE = /^ca-app-pub-\d{16}\/\d{10}$/;
const warn = [];

for (const [game, g] of Object.entries(R.oyunlar)) {
  if (only && game !== only) continue;
  const dir = join(root, 'apps', game);
  if (!existsSync(dir)) { warn.push(`${game}: klasör yok`); continue; }
  const a = g.admob || {};
  const units = {};
  for (const [plat, rw, it] of [['android', a.androidOdulluReklam, a.androidGecisReklami], ['ios', a.iosOdulluReklam, a.iosGecisReklami]]) {
    if (rw && it) {
      if (!UNIT_RE.test(rw) || !UNIT_RE.test(it)) warn.push(`${game}: ${plat} reklam birimi kimliği biçimi hatalı (ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY)`);
      units[plat] = { rewarded: rw, interstitial: it };
    }
  }
  const privacy = (R.gizlilikAdresi || '').replaceAll('{oyun}', game) || `https://example.com/rst/${game}/gizlilik`;
  const rel = {
    version: g.surum || '1.0.0',
    privacyUrl: privacy,
    termsUrl: (R.kosullarAdresi || '').replaceAll('{oyun}', game) || null,
    adUnits: Object.keys(units).length ? units : null,
    revenuecat: { android: (g.revenuecat && g.revenuecat.android) || '', ios: (g.revenuecat && g.revenuecat.ios) || '' },
    developer: R.gelistirici || {},
  };
  writeFileSync(join(dir, 'src/release.js'),
    '// OTOMATİK ÜRETİLDİ: tools/apply-release.mjs (kaynak: yayin-ayarlari.json). Elle düzenleme; o dosyayı değiştir.\n' +
    `export const release = ${JSON.stringify(rel, null, 2)};\n`);
  const nPath = join(dir, 'rst.native.json');
  const nat = JSON.parse(readFileSync(nPath, 'utf8'));
  nat.admobAppId = { android: a.androidUygulamaKimligi || TEST_APP.android, ios: a.iosUygulamaKimligi || TEST_APP.ios };
  for (const p of ['android', 'ios']) if (nat.admobAppId[p] !== TEST_APP[p] && !APP_RE.test(nat.admobAppId[p])) warn.push(`${game}: ${p} AdMob uygulama kimliği biçimi hatalı (ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY)`);
  writeFileSync(nPath, JSON.stringify(nat, null, 2) + '\n');
  const pPath = join(dir, 'package.json');
  const pkg = JSON.parse(readFileSync(pPath, 'utf8'));
  if (!/^\d+\.\d+\.\d+$/.test(rel.version)) warn.push(`${game}: sürüm 1.2.3 biçiminde olmalı`);
  pkg.version = rel.version;
  writeFileSync(pPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✓ ${game}: sürüm ${rel.version} · reklam ${rel.adUnits ? 'GERÇEK birimler' : 'test birimleri'} · satın alma ${rel.revenuecat.android ? 'açık' : 'kapalı'} · gizlilik ${privacy}`);
}
for (const w of warn) console.log('UYARI:', w);
process.exit(warn.length ? 1 : 0);
