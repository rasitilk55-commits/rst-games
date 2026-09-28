#!/usr/bin/env node
// Yeni oyun oluşturur: şablonu apps/<klasör> altına kopyalar ve adları yerleştirir.
// Kullanım: node tools/new-game.mjs <klasör-adı> "<Türkçe Ad>" "<English Name>" [#arkaplanRengi]
// Örnek:    node tools/new-game.mjs kum-cigi "Kum Çığı" "Sand Avalanche" "#2B2140"
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [slug, tr, en, color = '#1F2233'] = process.argv.slice(2);
if (!slug || !tr || !en || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('Kullanım: node tools/new-game.mjs <klasör-adı> "<Türkçe Ad>" "<English Name>" [#renk]');
  console.error('Klasör adı yalnızca küçük harf, rakam ve tire içermeli (örn. kum-cigi).');
  process.exit(1);
}
const dest = join(root, 'apps', slug);
if (existsSync(dest)) { console.error('Bu klasör zaten var: apps/' + slug); process.exit(1); }
const vars = { __SLUG__: slug, __TITLE_TR__: tr, __TITLE_EN__: en, __APPID__: 'com.rstgames.' + slug.replace(/-/g, ''), __COLOR__: color };

function copy(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const f of readdirSync(src)) {
    const s = join(src, f), d = join(dst, f);
    if (statSync(s).isDirectory()) { copy(s, d); continue; }
    let txt = readFileSync(s, 'utf8');
    for (const [k, v] of Object.entries(vars)) txt = txt.split(k).join(v);
    writeFileSync(d, txt);
  }
}
copy(join(root, 'tools/template'), dest);
// Yayın ayarlarına yeni oyunu ekle (boş kimliklerle → test reklamları)
const relPath = join(root, 'yayin-ayarlari.json');
const rel = JSON.parse(readFileSync(relPath, 'utf8'));
rel.oyunlar[slug] = rel.oyunlar[slug] || { surum: '1.0.0', admob: { androidUygulamaKimligi: '', androidOdulluReklam: '', androidGecisReklami: '', iosUygulamaKimligi: '', iosOdulluReklam: '', iosGecisReklami: '' }, revenuecat: { android: '', ios: '' } };
writeFileSync(relPath, JSON.stringify(rel, null, 2) + '\n');
console.log(`Oluşturuldu: apps/${slug} (${vars.__APPID__})`);
console.log('Sonraki adımlar:');
console.log(`  1) apps/${slug}/src/game.js dosyasında oyun mekaniğini yaz`);
console.log(`  2) npm install && npm run dev -w apps/${slug}`);
console.log(`  3) apps/${slug}/assets içine icon-only.png (1024x1024) ve splash.png (2732x2732) koy`);
