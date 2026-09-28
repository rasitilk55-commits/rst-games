import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // RST_LIVE_ADS=1 ile derlenirse gerçek reklamlar gösterilir (CI: ads=live). Aksi halde test reklamları.
  define: { __RST_LIVE_ADS__: JSON.stringify(process.env.RST_LIVE_ADS === '1') },
  build: { outDir: 'dist', target: 'es2019', assetsInlineLimit: 0 },
  server: { host: true },
});
