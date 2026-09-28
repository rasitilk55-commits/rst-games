#!/usr/bin/env node
// Kelebek Sarkaç seviye testi (tarayıcı gerekmez).
// Her seviye, farklı ekran boyutlarında kurulur ve şunlar doğrulanır:
//  1) En az bir isabetli bırakma anı var (imkânsız seviye yok).
//  2) En geniş isabet penceresi, insan için belirlenen en dar sınırdan (125/83/58 ms) geniş.
//  3) Oyun döngüsü gerçekten oynatılır: pencerenin ortasında dokunulunca seviye kazanılır,
//     ±%30 pencere kaymasıyla (insan hatası) da kazanılır.
//  4) Zorluk eğrisi: ilk 5 seviyenin isabet oranı son seviyelerden yüksek.
// Kullanım: node tools/test/kelebek-levels.mjs [maxLevel=40] [--json]
import { createGame } from '../../apps/kelebek-sarkac/src/game.js';
import { rng } from '../../packages/kit/src/util.js';

const MAX = +process.argv.find((a) => /^\d+$/.test(a)) || 40;
const JSON_OUT = process.argv.includes('--json');
const SCREENS = [[390, 844], [360, 640], [412, 915], [768, 1024]];
let clock = 0;
Object.defineProperty(globalThis, 'performance', { value: { now: () => clock }, configurable: true });
const noop = new Proxy(function () {}, { get: (t, k) => (k === "canvas" ? { width: 400, height: 800 } : noop), apply: () => noop, set: () => true });
const skin = { a: '#FF6B8B', b: '#FFD36B' };

function make() {
  const out = { res: null };
  const api = {
    rng, t: (k) => k, fmtSec: (s) => s.toFixed(2), hud() {}, tip() {}, flash() {}, sfx() {}, haptic() {}, skin: () => skin,
    win: (r) => { out.res = { win: true, ...r }; }, fail: (r) => { out.res = { win: false, ...r }; },
  };
  return { g: createGame(api), out };
}
// Oyunu kare kare oynatır, `at` adımında dokunur.
function play(w, h, spec, at) {
  const { g, out } = make();
  clock = 0;
  g.resize(w, h, 1);
  g.start(spec);
  // Hedef adıma kadar büyük karelerle, son 8 adımı tek tek ilerlet; dokunduktan sonra yine büyük karelerle.
  const step = 1 / 240;
  let k = 0;
  const adv = (n) => { clock += n * step * 1000; g.frame(noop, n * step + 1e-9, clock / 1000); k += n; };
  adv(40);
  g.__analyze(); // oyun sürerken analiz çağrılması zamanı kaydırmamalı (gerileme testi)
  while (k < at - 8) adv(Math.min(32, at - 8 - k));
  while (k < at) adv(1);
  g.pointer('down', 0, 0);
  for (let f = 0; f < 400 && !out.res; f++) adv(16);
  return out.res;
}

const rows = [];
let fails = 0;
const t0 = Date.now();
const specs = [];
for (let n = 1; n <= MAX; n++) specs.push({ mode: 'levels', level: n });
for (let d = 0; d < 8; d++) specs.push({ mode: 'daily', level: 8, seed: 20260900 + d * 37 });
for (const [w, h] of SCREENS) {
  for (const spec of specs) {
    const { g } = make();
    clock = 0;
    g.resize(w, h, 1);
    g.start(spec);
    const a = g.__analyze();
    const ok1 = a.window > 0;
    const ok2 = a.window >= a.need;
    const shift = Math.max(1, Math.floor(a.window * 0.3));
    const r0 = ok1 ? play(w, h, spec, a.center) : null;
    const rA = ok1 ? play(w, h, spec, a.center - shift) : null;
    const rB = ok1 ? play(w, h, spec, a.center + shift) : null;
    const ok3 = !!(r0 && r0.win && rA && rA.win && rB && rB.win);
    const ok = ok1 && ok2 && ok3;
    if (!ok) fails++;
    rows.push({ screen: `${w}x${h}`, id: spec.mode === 'daily' ? `G${spec.seed}` : spec.level, rate: a.rate, windowMs: Math.round(a.window / 0.24), needMs: Math.round(a.need / 0.24), stars: r0 && r0.win ? r0.stars : 0, ok });
  }
}
// Zorluk eğrisi (390x844 ekranda)
const main = rows.filter((r) => r.screen === '390x844' && typeof r.id === 'number');
const avg = (a) => a.reduce((s, r) => s + r.rate, 0) / Math.max(1, a.length);
const early = avg(main.filter((r) => r.id <= 5)), late = avg(main.filter((r) => r.id > MAX - 10));
const curveOk = early > late * 1.5;
if (!curveOk) fails++;
const summary = { total: rows.length, fails, early, late, curveOk, sec: (Date.now() - t0) / 1000, minWindowMs: Math.min(...rows.map((r) => r.windowMs)) };
if (JSON_OUT) console.log(JSON.stringify({ summary, rows }));
else {
  for (const r of rows.filter((r) => !r.ok)) console.log('HATA', r);
  console.log(`Kelebek seviyeleri: ${rows.length - rows.filter((r) => !r.ok).length}/${rows.length} geçti · isabet oranı ilk5 %${(early * 100).toFixed(1)} → son10 %${(late * 100).toFixed(1)} · en dar pencere ${summary.minWindowMs} ms · ${summary.sec.toFixed(1)} sn`);
}
process.exit(fails ? 1 : 0);
