#!/usr/bin/env node
// Bir oyunu derleme aracı gerektirmeden tarayıcıda çalışan klasöre çıkarır.
// Kullanım: node tools/web-export.mjs kelebek-sarkac
// Çıktı: dist-web/<oyun>/ (index.html + kit/ + game/). Web oyun portalları (itch.io, CrazyGames, Poki)
// ve hızlı önizleme için kullanılır. `page.html` başlık etiketsiz sürümdür (Claude Artifact yayını için).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const game = process.argv[2];
if (!game || !existsSync(join(root, 'apps', game))) {
  console.error('Kullanım: node tools/web-export.mjs <oyun-klasörü>');
  process.exit(1);
}
const out = join(root, 'dist-web', game);
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'kit'), { recursive: true });
mkdirSync(join(out, 'game'), { recursive: true });

const kitSrc = join(root, 'packages/kit/src');
for (const f of readdirSync(kitSrc)) copyFileSync(join(kitSrc, f), join(out, 'kit', f));
const gameSrc = join(root, 'apps', game, 'src');
for (const f of readdirSync(gameSrc)) if (f !== 'main.js') copyFileSync(join(gameSrc, f), join(out, 'game', f));

writeFileSync(join(out, 'boot.js'),
  "import { createApp } from './kit/index.js';\nimport { config } from './game/config.js';\ncreateApp(config);\n");

const title = (readFileSync(join(root, 'apps', game, 'index.html'), 'utf8').match(/<title>(.*?)<\/title>/) || [, game])[1];
const head = `<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&family=Nunito:wght@500;700;800&display=swap">
<link rel="stylesheet" href="kit/kit.css">`;
const page = `${head}\n<script type="module" src="boot.js"></script>\n`;
writeFileSync(join(out, 'page.html'), page);
writeFileSync(join(out, 'index.html'), `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
${head}
</head>
<body>
<script type="module" src="boot.js"></script>
</body>
</html>
`);
console.log('Hazır: dist-web/' + game);
