#!/usr/bin/env node
// Olay Ufku bölüm üreticisi. Her bölüm aday düzenler arasından hesaplanarak seçilir:
//  1) Çözülebilir: ızgarada kazanan atış var.
//  2) İnsan için oynanabilir: kazanan atışlar, parmak hassasiyetini tolere eden bir "kutu" oluşturuyor.
//  3) 3 yıldız her zaman mümkün ve yine bir tolerans kutusuna sahip.
//  4) Kütleçekimi gerçekten kullanılıyor (yol yeterince bükülüyor), bölümün yeni mekaniği yolda yer alıyor.
//  5) Zorluk, hedef eğriye en yakın aday seçilerek kademeli artıyor.
// Kullanım: node tools/olay-ufku/gen.mjs   → apps/olay-ufku/src/levels.js + docs/olay-ufku-bolumler.md
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { simulate, LAUNCH, W0, MOTE_R, segDist2 as segD2 } from '../../apps/olay-ufku/src/physics.js';
import { scan, findBox, angleAt, powerAt, bendDeg, NA, NP } from './solver.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const r1 = (v) => Math.round(v * 10) / 10;
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Bölümler (tasarım tablosu) ---------- */
// holes/whites/worms/rocks: [min, max] adet; R: portal yarıçapı (başlangıç → son); box/box3: tolerans kutusu (açı hücresi x güç hücresi)
// rate: hedef kazanma oranı (başlangıç → son). bend: en az yol bükülmesi (derece).
export const CHAPTERS = [
  { id: 1, from: 1, to: 5, holes: [1, 1], whites: [0, 0], worms: [0, 0], rocks: [0, 0], R: [34, 30], box: [9, 3], box3: [4, 2], rate: [0.09, 0.06], bend: 10, jit: 0.9, jit3: 0.6 },
  { id: 2, from: 6, to: 12, holes: [2, 2], whites: [0, 0], worms: [0, 0], rocks: [0, 0], R: [30, 27], box: [7, 3], box3: [3, 2], rate: [0.06, 0.035], bend: 25, jit: 0.9, jit3: 0.55 },
  { id: 3, from: 13, to: 20, holes: [2, 3], whites: [0, 0], worms: [0, 0], rocks: [2, 4], R: [28, 25], box: [5, 3], box3: [3, 2], rate: [0.045, 0.025], bend: 25, jit: 0.85, jit3: 0.5 },
  { id: 4, from: 21, to: 30, holes: [1, 2], whites: [1, 1], worms: [0, 0], rocks: [0, 2], R: [27, 24], box: [5, 2], box3: [3, 2], rate: [0.04, 0.02], bend: 25, needWhite: true, jit: 0.8, jit3: 0.5 },
  { id: 5, from: 31, to: 40, holes: [1, 1], whites: [0, 0], worms: [1, 1], rocks: [0, 2], R: [26, 23], box: [4, 2], box3: [3, 2], rate: [0.035, 0.018], bend: 0, needWorm: true, jit: 0.8, jit3: 0.5 },
  { id: 6, from: 41, to: 100, holes: [2, 4], whites: [0, 1], worms: [0, 1], rocks: [1, 4], R: [25, 19], box: [3, 2], box3: [2, 2], rate: [0.03, 0.01], bend: 25, jit: 0.7, jit3: 0.4 },
];
const DAILY_SPEC = { id: 0, holes: [2, 3], whites: [0, 1], worms: [0, 1], rocks: [1, 3], R: [24, 24], box: [4, 2], box3: [3, 2], rate: [0.028, 0.028], bend: 25, jit: 0.75, jit3: 0.45 };
const chapterOf = (lv) => CHAPTERS.find((c) => lv >= c.from && lv <= c.to);

function targetRate(ch, lv) {
  const t = ch.to > ch.from ? (lv - ch.from) / (ch.to - ch.from) : 0;
  let rate = ch.rate[0] * Math.pow(ch.rate[1] / ch.rate[0], t);
  if (lv === ch.from && lv > 1) rate *= 1.7; // yeni mekanik tanıtılırken nefes aldır
  else if (lv % 5 === 0) rate *= 1.3; // her 5 bölümde bir dinlendirme bölümü
  return rate;
}
const lerp = (a, b, t) => a + (b - a) * t;
const pick = (r, [lo, hi]) => lo + Math.floor(r() * (hi - lo + 1));

/* ---------- Aday düzen ---------- */
function layout(ch, lv, r) {
  const t = ch.to > ch.from ? (lv - ch.from) / (ch.to - ch.from) : 0;
  const L = { holes: [], whites: [], worms: [], rocks: [], motes: [] };
  const far = (x, y, d, list, key = (o) => [o.x, o.y]) => list.every((o) => { const [ox, oy] = key(o); return Math.hypot(ox - x, oy - y) >= d; });
  let g = 0;
  const nH = pick(r, ch.holes), nW = pick(r, ch.whites), nWm = pick(r, ch.worms), nR = pick(r, ch.rocks);
  while (L.holes.length < nH && g++ < 500) {
    const rh = r1(13 + r() * 7 + Math.min(4, lv * 0.06));
    const x = r1(60 + r() * 280), y = r1(215 + r() * 265);
    if (!far(x, y, 115, L.holes)) continue;
    if (Math.hypot(x - LAUNCH.x, y - LAUNCH.y) < 185) continue;
    L.holes.push({ x, y, rh, tilt: r1((r() - 0.5) * 9) / 10 });
  }
  g = 0;
  while (L.whites.length < nW && g++ < 500) {
    const rr = r1(9 + r() * 4);
    const x = r1(60 + r() * 280), y = r1(210 + r() * 260);
    if (!far(x, y, 95, L.holes) || !far(x, y, 90, L.whites)) continue;
    if (Math.hypot(x - LAUNCH.x, y - LAUNCH.y) < 150) continue;
    L.whites.push({ x, y, r: rr });
  }
  g = 0;
  while (L.worms.length < nWm && g++ < 800) {
    const w = { ax: r1(55 + r() * 290), ay: r1(360 + r() * 140), bx: r1(55 + r() * 290), by: r1(170 + r() * 130), r: 15 };
    if (Math.hypot(w.ax - w.bx, w.ay - w.by) < 170) continue;
    if (!far(w.ax, w.ay, 75, L.holes) || !far(w.bx, w.by, 75, L.holes)) continue;
    if (!far(w.ax, w.ay, 60, L.whites) || !far(w.bx, w.by, 60, L.whites)) continue;
    if (Math.hypot(w.ax - LAUNCH.x, w.ay - LAUNCH.y) < 90) continue;
    L.worms.push(w);
  }
  g = 0;
  while (L.rocks.length < nR && g++ < 800) {
    const rr = r1(9 + r() * 7);
    const x = r1(45 + r() * 310), y = r1(175 + r() * 340);
    if (!L.holes.every((h) => Math.hypot(h.x - x, h.y - y) >= h.rh * 3 + rr + 8)) continue;
    if (!far(x, y, 60 + rr, L.whites) || !far(x, y, rr + 35, L.rocks, (o) => [o.x, o.y])) continue;
    if (!L.worms.every((w) => Math.hypot(w.ax - x, w.ay - y) >= w.r + rr + 25 && Math.hypot(w.bx - x, w.by - y) >= w.r + rr + 25)) continue;
    if (Math.hypot(x - LAUNCH.x, y - LAUNCH.y) < 105) continue;
    L.rocks.push({ x, y, r: rr, rot: r1(r() * 62.8) / 10, spin: r1((r() - 0.5) * 8) / 10, v: Array.from({ length: 9 }, () => Math.round((0.75 + r() * 0.35) * 100) / 100) });
  }
  const R = r1(lerp(ch.R[0], ch.R[1], t));
  g = 0;
  while (g++ < 600) {
    const x = r1(55 + r() * 290), y = r1(140 + r() * 150);
    if (!L.holes.every((h) => Math.hypot(h.x - x, h.y - y) >= h.rh * 3.2 + R)) continue;
    if (!far(x, y, 75 + R, L.whites)) continue;
    if (!L.rocks.every((k) => Math.hypot(k.x - x, k.y - y) >= k.r + R + 16)) continue;
    if (!L.worms.every((w) => Math.hypot(w.ax - x, w.ay - y) >= w.r + R + 20 && Math.hypot(w.bx - x, w.by - y) >= w.r + R + 20)) continue;
    // Görüş hattı engeli: fırlatıcıdan portala düz atış bir kara deliğin yanından geçmeli (kütleçekimi şart olsun).
    // Solucan deliği bölümlerinde düz yolu bir engel (kara delik/kaya/beyaz delik) kapatmalı.
    const block = (ox, oy, rad) => Math.sqrt(segD2(LAUNCH.x, LAUNCH.y, x, y, ox, oy)) <= rad;
    const blocked = L.holes.some((h) => block(h.x, h.y, h.rh * (ch.id === 1 ? 4 : 2.6) + 8))
      || L.rocks.some((k) => block(k.x, k.y, k.r + 8)) || L.whites.some((w) => block(w.x, w.y, w.r * 3));
    if (!blocked) continue;
    if (ch.needWorm && !L.worms.some((w) => { const d = Math.hypot(w.bx - x, w.by - y); return d >= 55 && d <= 170; })) continue;
    L.portal = { x, y, R };
    break;
  }
  if (!L.portal) return null;
  if (L.holes.length < ch.holes[0] || L.whites.length < ch.whites[0] || L.worms.length < ch.worms[0] || L.rocks.length < ch.rocks[0]) return null;
  return L;
}

/* ---------- Yıldız tozu yerleşimi (3 yıldız yolunun üstüne) ---------- */
function moteOk(L, [x, y], others) {
  if (x < 22 || x > W0 - 22 || y < 135 || y > 560) return false;
  if (Math.hypot(x - LAUNCH.x, y - LAUNCH.y) < 60) return false;
  if (!L.holes.every((h) => Math.hypot(h.x - x, h.y - y) >= h.rh * 1.9 + MOTE_R)) return false;
  if (!L.whites.every((w) => Math.hypot(w.x - x, w.y - y) >= w.r * 2.6 + MOTE_R)) return false;
  if (!L.rocks.every((k) => Math.hypot(k.x - x, k.y - y) >= k.r + MOTE_R + 5)) return false;
  if (!L.worms.every((w) => Math.hypot(w.ax - x, w.ay - y) >= w.r + MOTE_R + 5 && Math.hypot(w.bx - x, w.by - y) >= w.r + MOTE_R + 5)) return false;
  if (Math.hypot(L.portal.x - x, L.portal.y - y) < L.portal.R + MOTE_R + 6) return false;
  return others.every(([ox, oy]) => Math.hypot(ox - x, oy - y) >= 42);
}
const FRACTIONS = [[0.3, 0.55, 0.78], [0.25, 0.5, 0.75], [0.35, 0.6, 0.82], [0.2, 0.45, 0.7], [0.4, 0.62, 0.84]];

/* ---------- İnsan hatası testi ----------
   Parmak hassasiyeti modeli: açı ±0,5°, güç ±%1,5 içinde rastgele sapma. Çözümün etrafındaki atışların ne kadarı kazanıyor? */
export function jitter(L, sol, need3, n = 160, seed = 99) {
  const r = rng(seed);
  let ok = 0;
  for (let i = 0; i < n; i++) {
    const a = sol.a + ((r() * 2 - 1) * 0.5 * Math.PI) / 180;
    const p = Math.min(1, Math.max(0.08, sol.p + (r() * 2 - 1) * 0.015));
    const s = simulate(L, a, p);
    if (s.kind === 'win' && (!need3 || s.got.every(Boolean)) && (!L.needJump || s.jumps.length > 0)) ok++;
  }
  return ok / n;
}
const centerOf = (b, bw, bh) => ({ a: +angleAt(b.i + (bw - 1) / 2).toFixed(6), p: +powerAt(b.j + (bh - 1) / 2).toFixed(6) });

/* ---------- Tam değerlendirme ---------- */
function evaluate(L, ch, lv) {
  const base = { ...L, motes: [] };
  const s1 = scan(base, 1, 1, 0, 0, !!ch.needWorm);
  if (!s1.wins) return { ok: false, why: 'çözümsüz' };
  const [bw, bh] = ch.box;
  const box = findBox(s1.cells, bw, bh, 1);
  if (!box) return { ok: false, why: 'tolerans kutusu yok' };
  const a = angleAt(box.ci), p = powerAt(box.cj);
  const rep = simulate(base, a, p, { record: true });
  if (rep.kind !== 'win') return { ok: false, why: 'temsil atışı kaybetti' };
  const bend = bendDeg(a, rep);
  if (bend < ch.bend) return { ok: false, why: `yol yeterince bükülmüyor (${bend.toFixed(0)}°)` };
  if (ch.needWorm && rep.jumps.length === 0) return { ok: false, why: 'solucan deliği kullanılmıyor' };
  if (ch.needWhite) {
    const w = L.whites[0];
    const near = rep.path.some(([x, y]) => Math.hypot(x - w.x, y - w.y) < 85);
    if (!near) return { ok: false, why: 'beyaz delik yolda değil' };
  }
  // 3 yıldız: tozları temsil yolunun üstüne koy, sonra 3 yıldız ızgarasını tara
  let best = null;
  for (const fr of FRACTIONS) {
    const n = rep.path.length;
    const motes = [];
    for (const f of fr) {
      const q = rep.path[Math.floor(n * f)];
      const m = [r1(q[0]), r1(q[1])];
      if (!moteOk(L, m, motes)) break;
      motes.push(m);
    }
    if (motes.length !== 3) continue;
    const withM = { ...L, motes };
    const s3 = scan(withM, 1, 1, 0, 0, !!ch.needWorm);
    const b3 = findBox(s3.cells, ch.box3[0], ch.box3[1], 2);
    if (!b3) continue;
    const box1 = findBox(s3.cells, bw, bh, 1);
    if (!box1) continue;
    if (!best || b3.count > best.b3.count) best = { motes, s3, b3, box1 };
  }
  if (!best) return { ok: false, why: '3 yıldız yolu toleranslı değil' };
  const withM = { ...L, motes: best.motes };
  const [cw, chh] = ch.box3;
  // Çözüm, tolerans kutusunun tam ortası (en rahat nokta); ortası kaybederse kutunun merkez hücresi
  let sol = centerOf(best.box1, bw, bh);
  if (simulate(withM, sol.a, sol.p).kind !== 'win') sol = { a: +angleAt(best.box1.ci).toFixed(6), p: +powerAt(best.box1.cj).toFixed(6) };
  let sol3 = centerOf(best.b3, cw, chh);
  const t3 = simulate(withM, sol3.a, sol3.p);
  if (t3.kind !== 'win' || !t3.got.every(Boolean)) sol3 = { a: +angleAt(best.b3.ci).toFixed(6), p: +powerAt(best.b3.cj).toFixed(6) };
  const c1 = simulate(withM, sol.a, sol.p), c3 = simulate(withM, sol3.a, sol3.p);
  if (c1.kind !== 'win' || c3.kind !== 'win' || !c3.got.every(Boolean)) return { ok: false, why: 'kayıtlı çözüm doğrulanamadı' };
  if (ch.needWorm && (c3.jumps.length === 0 || c1.jumps.length === 0)) return { ok: false, why: 'çözüm solucan deliğini kullanmıyor' };
  const jt = { ...withM, needJump: !!ch.needWorm };
  const j1 = jitter(jt, sol, false), j3 = jitter(jt, sol3, true);
  if (j1 < ch.jit) return { ok: false, why: `insan hatasına dayanıksız (%${Math.round(j1 * 100)})` };
  if (j3 < ch.jit3) return { ok: false, why: `3 yıldız çok hassas (%${Math.round(j3 * 100)})` };
  return {
    ok: true,
    level: { ...L, motes: best.motes, sol, sol3, ...(ch.needWorm ? { needJump: true } : {}) },
    stats: { rate: best.s3.rate, rate3: best.s3.rate3, box: best.box1.count, box3: best.b3.count, bend: Math.round(bend), j1: +j1.toFixed(2), j3: +j3.toFixed(2) },
  };
}

/* ---------- Bir bölüm üret ---------- */
function makeLevel(ch, lv, seedBase) {
  const target = ch.id ? targetRate(ch, lv) : ch.rate[0];
  const tried = [];
  for (let round = 0; round < 8; round++) {
    const cands = [];
    for (let c = 0; c < 70; c++) {
      const r = rng(seedBase * 7919 + round * 1000 + c * 13 + 1);
      const L = layout(ch, lv, r);
      if (!L) continue;
      const coarse = scan({ ...L, motes: [] }, 4, 3, 0, 0, !!ch.needWorm);
      if (!coarse.wins) continue;
      cands.push({ L, coarse: coarse.rate, d: Math.abs(Math.log(coarse.rate / target)) });
    }
    cands.sort((x, y) => x.d - y.d);
    for (const c of cands.slice(0, 8)) {
      const ev = evaluate(c.L, ch, lv);
      tried.push(ev.why || 'ok');
      if (!ev.ok) continue;
      const d = Math.abs(Math.log(ev.stats.rate / target));
      if (d < 0.7 || round >= 5) return { ...ev.level, ch: ch.id, id: lv, stats: { ...ev.stats, target: +target.toFixed(4) } };
    }
  }
  throw new Error(`Bölüm ${lv} üretilemedi: ${[...new Set(tried)].join(', ')}`);
}

/* ---------- Çalıştır ---------- */
const t0 = Date.now();
const LEVELS = [];
for (const ch of CHAPTERS) {
  for (let lv = ch.from; lv <= ch.to; lv++) {
    const L = makeLevel(ch, lv, lv);
    LEVELS.push(L);
    process.stdout.write(`\rbölüm ${lv}/100  (${((Date.now() - t0) / 1000).toFixed(0)} sn)   `);
  }
}
const DAILY = [];
for (let i = 0; i < 60; i++) {
  const L = makeLevel(DAILY_SPEC, 60, 5000 + i);
  L.id = 'd' + (i + 1);
  L.ch = 0;
  DAILY.push(L);
  process.stdout.write(`\rgünlük ${i + 1}/60  (${((Date.now() - t0) / 1000).toFixed(0)} sn)   `);
}
console.log('');

const header = `// OTOMATİK ÜRETİLDİ — elle düzenleme. Üretici: tools/olay-ufku/gen.mjs, doğrulayıcı: tools/olay-ufku/verify.mjs
// ${LEVELS.length} kampanya bölümü + ${DAILY.length} günlük bölüm. Her bölüm çözülebilir, insan hassasiyetine toleranslı ve 3 yıldızı mümkün olacak şekilde hesaplanmıştır.
`;
const chapters = CHAPTERS.map(({ id, from, to }) => ({ id, from, to }));
writeFileSync(join(ROOT, 'apps/olay-ufku/src/levels.js'),
  header + `export const CHAPTERS = ${JSON.stringify(chapters)};\nexport const LEVELS = ${JSON.stringify(LEVELS)};\nexport const DAILY = ${JSON.stringify(DAILY)};\n`);
console.log(`Tamam: ${LEVELS.length} + ${DAILY.length} bölüm, ${((Date.now() - t0) / 1000).toFixed(0)} sn`);
